import { Canvas } from '../vendor/fabric-7.4.0/index.min.mjs';
import { applyStrings, t } from './strings.js';
import { initMenuBar } from './menu.js';
import { DEFAULT_FORMAT } from './formats.js';
import { createFloppyObjects, floppyBounds } from './floppy.js';
import {
  backViewZone, defaultDimensions, defaultLabelSettings, fillArea, labelBounds, labelGeometry,
} from './label.js';
import { createLabelView } from './labelView.js';
import { initFloppyPanel } from './floppyPanel.js';
import { initImagesPanel } from './imagesPanel.js';
import { createLayerStore } from './layers.js';
import { initLayerList } from './layerList.js';
import { coverArea, createBackgroundLayer } from './background.js';
import { createLogoLayer } from './logo.js';
import { applyLogoEffects, cloneEffects } from './logoEffects.js';
import { createHistory } from './history.js';
import { enableCenterSnapping } from './snapping.js';
import { acceptImageDrops, loadImage, readFileAsDataUrl } from './images.js';
import { formatMm, SCREEN_PX_PER_MM } from './units.js';
import { createViewport } from './viewport.js';
import { renderLabel } from './exportRender.js';
import { buildSheetPdf, sheetLayout } from './exportPdf.js';
import { canvasToPngBlob, downloadBlob } from './exportPng.js';
import { initExportDialog } from './exportDialog.js';

applyStrings();
document.title = t('appTitle');

const format = DEFAULT_FORMAT;
let settings = defaultLabelSettings(format);
let geometry = labelGeometry(settings, format);

const canvas = new Canvas('label-canvas', {
  backgroundColor: getComputedStyle(document.documentElement).getPropertyValue('--canvas-area-bg').trim(),
  selection: false,
  preserveObjectStacking: true,
});

const floppyObjects = createFloppyObjects(format);
canvas.add(...floppyObjects);
const labelView = createLabelView(canvas);

// 'front' = the editor; 'back' = read-only view of the disk's back (wrap-around).
let side = 'front';
let backObjects = [];

const layers = createLayerStore(canvas, {
  below: () => [...floppyObjects, ...backObjects, labelView.base],
  above: () => labelView.guides,
  onChange: () => {
    syncPanels();
    viewport.layout();
  },
});

// ---- Viewport ----

const zoomReadout = document.getElementById('zoom-readout');
const zoomStatus = document.getElementById('status-zoom');

const viewport = createViewport(
  canvas,
  document.querySelector('.canvas-scroll'),
  () => (side === 'back'
    ? floppyBounds(format, backViewZone(geometry).y)
    : editorBounds()),
  ({ mode, zoom }) => {
    const percent = Math.round(zoom * 100);
    zoomReadout.textContent = `${percent}%`;
    zoomStatus.textContent = t(mode === 'fit' ? 'zoom.statusFit' : 'zoom.status', { percent });
    labelView.setScale(zoom * SCREEN_PX_PER_MM);
  },
);

// ---- Label settings ----

const floppyPanel = initFloppyPanel(document.getElementById('floppy-panel'), {
  onSettings: (patch) => {
    updateSettings(patch);
    history.commit();
  },
  onGuides: (patch) => {
    labelView.setGuideVisibility(patch);
    syncPanels();
  },
  onResetDimensions: () => {
    updateSettings(defaultDimensions(format));
    history.commit();
  },
});

function updateSettings(patch) {
  settings = { ...settings, ...patch };
  geometry = labelGeometry(settings, format);
  labelView.setGeometry(geometry);
  applySide();
  syncPanels();
  updateLabelStatus();
}

// ---- Front / back view ----

/**
 * Back view: the disk turned over, its top edge lined up with the back zone's
 * top, everything clipped to the back zone as it sits on the disk. Same
 * objects as the editor, so it always matches; nothing can be edited there.
 */
function applySide() {
  if (settings.mode !== 'wrap') side = 'front';
  const back = side === 'back';
  const zone = back ? backViewZone(geometry) : null;
  const clip = back ? zone : geometry.content;

  canvas.remove(...backObjects);
  backObjects = back ? createFloppyObjects(format, 'back', zone.y) : [];
  canvas.add(...backObjects);
  for (const object of floppyObjects) object.visible = !back;

  labelView.setClipRect(clip);
  labelView.setGuidesHidden(back);
  layers.setClipResolver((layer) => editorClip(layer, back));
  layers.setInteractive(!back);
  layers.restack();
  viewport.layout();
  syncSideControls();
}

// Far off the label: clips a layer away entirely.
const HIDDEN_CLIP = { x: -1000, y: -1000, width: 0.01, height: 0.01, corners: {} };

/** Editor clip of a layer: its zone's shape, or the whole label's. */
function editorClip(layer, back) {
  const zone = layer.zone ? geometry.content.find((z) => z.id === layer.zone) : null;
  if (layer.zone && !zone) return HIDDEN_CLIP; // e.g. a back image in front-only mode
  if (back) return layer.zone === 'front' ? HIDDEN_CLIP : backViewZone(geometry);
  return zone ?? geometry.content;
}

/**
 * Export clip of a layer: none for the whole label (it runs into the bleed),
 * its zone's fill area for a zone layer, or undefined to leave it out.
 */
function exportClip(layer) {
  if (!layer.zone) return null;
  if (!geometry.content.some((z) => z.id === layer.zone)) return undefined;
  return fillArea(geometry, layer.zone);
}

function setSide(next) {
  if (next === side || (next === 'back' && settings.mode !== 'wrap')) return;
  side = next;
  applySide();
  syncPanels();
}

function syncSideControls() {
  const wrap = settings.mode === 'wrap';
  for (const el of document.querySelectorAll('[data-action="side-front"], [data-action="side-back"]')) {
    const isBack = el.dataset.action === 'side-back';
    if (el.classList.contains('side-button')) el.setAttribute('aria-pressed', String(isBack === (side === 'back')));
    if (isBack) el.disabled = !wrap;
  }
  document.getElementById('side-note').hidden = side !== 'back';
}

function updateLabelStatus() {
  const { outline } = geometry;
  const wrap = settings.mode === 'wrap';
  document.getElementById('status-label').textContent = t(wrap ? 'status.labelWrap' : 'status.labelFront', {
    format: format.name,
    width: formatMm(outline.width),
    height: formatMm(outline.height),
    front: formatMm(settings.front),
    spine: formatMm(settings.spine),
    back: formatMm(settings.back),
  });
}

// ---- Images ----

/** The layer the Images buttons act on: the selected one of that type, else the top one. */
function targetLayer(type) {
  const selected = layers.byId(listSelection);
  if (selected?.type === type) return selected;
  return layers.byType(type).at(-1) ?? null;
}

/** "Background 1", "Background 2"… numbered after the highest in use. */
function nextLayerName(type) {
  const base = t(`layers.${type}`);
  const used = layers.byType(type).map((layer) => Number(layer.name.match(/(\d+)$/)?.[1] ?? 0));
  return `${base} ${Math.max(0, ...used) + 1}`;
}

const imagesPanel = initImagesPanel(document.getElementById('images-panel'), {
  onAdd: (type, file) => addImage(type, file),
  onRemove: (type) => {
    const target = targetLayer(type);
    if (!target) return;
    layers.remove(target.id);
    history.commit();
  },
  onFill: (which) => {
    const target = targetLayer('background');
    if (!target) return;
    // Filling a zone also restricts the image to it, so the front and the back
    // can carry different images.
    target.zone = which === 'label' ? null : which;
    layers.refreshClip(target);
    coverArea(target.object, fillArea(geometry, which));
    canvas.setActiveObject(target.object);
    canvas.requestRenderAll();
    syncPanels();
    viewport.layout();
    history.commit();
  },
  onLogoEffect: (path, value, commit) => {
    const logo = targetLayer('logo');
    if (!logo) return;
    const [group, key] = path.split('.');
    logo.effects[group][key] = value;
    applyLogoEffects(logo);
    canvas.requestRenderAll();
    syncPanels();
    if (commit) history.commit();
  },
});

async function addImage(type, file) {
  setSide('front');
  let src;
  let image;
  try {
    src = await readFileAsDataUrl(file);
    image = await loadImage(src);
  } catch (error) {
    console.error(error);
    alert(t('images.loadError'));
    return;
  }
  const name = nextLayerName(type);
  let layer;
  if (type === 'background') {
    // New backgrounds go right above the existing ones, under any logos.
    layer = createBackgroundLayer({ image, src, name, area: geometry.bleed });
    const lastBackground = layers.byType('background').at(-1);
    layers.add(layer, lastBackground ? layers.all.indexOf(lastBackground) + 1 : 0);
  } else {
    layer = createLogoLayer({ image, src, name, geometry });
    layers.add(layer);
  }
  canvas.setActiveObject(layer.object);
  syncPanels();
  history.commit();
}

acceptImageDrops(document.querySelector('.canvas-scroll'), (file) => addImage('background', file));

canvas.on('object:modified', ({ target }) => {
  // Keep the outline the same thickness in mm after a resize.
  const layer = layers.byObject(target);
  if (layer?.type === 'logo') {
    applyLogoEffects(layer);
    canvas.requestRenderAll();
  }
  syncPanels();
  viewport.layout();
  history.commit();
});

enableCenterSnapping(canvas, {
  targets: () => ({
    x: [geometry.outline.x + geometry.outline.width / 2],
    y: geometry.zones.map((zone) => zone.y + zone.height / 2),
    extent: geometry.bleed,
  }),
  scale: () => viewport.zoom * SCREEN_PX_PER_MM,
  applies: (object) => layers.byObject(object) !== undefined,
});

// The list can select hidden layers too (to show, move or delete them),
// so its selection is tracked here and mirrors the canvas when possible.
let listSelection = null;

const layerList = initLayerList(document.getElementById('layers-panel'), {
  onSelect: (id) => {
    const layer = layers.byId(id);
    if (!layer) return;
    setSide('front');
    if (layer.object.visible && layer.object.selectable) {
      canvas.setActiveObject(layer.object);
    } else {
      canvas.discardActiveObject();
    }
    listSelection = id;
    canvas.requestRenderAll();
    syncPanels();
  },
  onVisible: (id, visible) => {
    layers.setVisible(id, visible);
    history.commit();
  },
  onMove: (id, delta) => {
    layers.move(id, delta);
    history.commit();
  },
  onDelete: (id) => {
    layers.remove(id);
    history.commit();
  },
});

function onCanvasSelection() {
  listSelection = layers.byObject(canvas.getActiveObject())?.id ?? null;
  syncPanels();
}
canvas.on('selection:created', onCanvasSelection);
canvas.on('selection:updated', onCanvasSelection);
canvas.on('selection:cleared', onCanvasSelection);

function syncPanels() {
  if (listSelection && !layers.byId(listSelection)) listSelection = null;
  layerList.render(layers.all, listSelection);
  floppyPanel.sync(settings, labelView.guideVisibility);
  const background = targetLayer('background');
  const logo = targetLayer('logo');
  imagesPanel.sync({
    background: background ? { name: background.name } : null,
    logo: logo ? { name: logo.name, effects: logo.effects } : null,
    wrap: settings.mode === 'wrap',
  });
}

// ---- Document snapshots, undo/redo, reset ----

function captureDocument() {
  return {
    settings: { ...settings },
    layers: layers.all.map((layer) => {
      const o = layer.object;
      return {
        id: layer.id,
        type: layer.type,
        name: layer.name,
        src: layer.src,
        visible: o.visible,
        zone: layer.zone ?? null,
        transform: {
          left: o.left, top: o.top, scaleX: o.scaleX, scaleY: o.scaleY, angle: o.angle, flipX: o.flipX, flipY: o.flipY,
        },
        ...(layer.effects ? { effects: cloneEffects(layer.effects) } : {}),
      };
    }),
  };
}

async function restoreDocument(state) {
  const images = await Promise.all(state.layers.map((entry) => loadImage(entry.src)));
  const selectedId = listSelection;
  settings = { ...state.settings };
  layers.clear();
  updateSettings({});
  state.layers.forEach((entry, i) => {
    const common = { id: entry.id, image: images[i], src: entry.src, name: entry.name };
    const layer = entry.type === 'background'
      ? createBackgroundLayer({ ...common, area: geometry.bleed })
      : createLogoLayer({ ...common, geometry, effects: entry.effects });
    layer.zone = entry.zone ?? null;
    layer.object.set({ ...entry.transform, visible: entry.visible });
    if (layer.effects) applyLogoEffects(layer);
    layer.object.setCoords();
    layers.add(layer);
  });
  const selected = layers.byId(selectedId);
  if (selected?.object.visible) canvas.setActiveObject(selected.object);
  listSelection = selected ? selectedId : null;
  canvas.requestRenderAll();
  syncPanels();
}

const history = createHistory({
  capture: captureDocument,
  restore: restoreDocument,
  onChange: () => syncEditMenu(),
});

function syncEditMenu() {
  document.querySelector('[role="menuitem"][data-action="undo"]').disabled = !history.canUndo;
  document.querySelector('[role="menuitem"][data-action="redo"]').disabled = !history.canRedo;
}

function resetDocument() {
  if (!confirm(t('edit.resetConfirm'))) return;
  layers.clear();
  settings = defaultLabelSettings(format);
  updateSettings({});
  history.commit();
}

// ---- Export ----

const nextFrame = () => new Promise((resolve) => requestAnimationFrame(() => resolve()));

const exportDialog = initExportDialog(document.getElementById('export-dialog'), {
  maxCopies: () => sheetLayout(geometry).max,
  hasFolds: () => geometry.folds.length > 0,
  async run({ type, dpi, copies, cutLine, foldLines, filename }, onProgress) {
    const items = [
      { object: labelView.base, clip: null },
      ...layers.all
        .map((layer) => ({ object: layer.object, clip: exportClip(layer) }))
        .filter((item) => item.clip !== undefined),
    ];
    const rendering = t('exportDialog.rendering', { dpi });
    onProgress(0.05, rendering);
    await nextFrame();
    const image = await renderLabel({
      items,
      geometry,
      dpi,
      onProgress: (fraction) => onProgress(0.05 + fraction * 0.6, rendering),
    });
    onProgress(0.7, t('exportDialog.encoding'));
    await nextFrame();
    const blob = type === 'pdf'
      ? buildSheetPdf({ image, geometry, copies, dpi, cutLine, foldLines, title: filename })
      : await canvasToPngBlob(image, dpi);
    downloadBlob(blob, `${filename}.${type}`);
  },
});

// ---- Commands ----

// The editor shows the disk and the label, plus any image sticking out of
// them (up to a limit), so every resize handle can be reached.
const MAX_OVERHANG_MM = 30;

function editorBounds() {
  const base = unionBounds(floppyBounds(format), labelBounds(geometry));
  const limit = {
    x: base.x - MAX_OVERHANG_MM,
    y: base.y - MAX_OVERHANG_MM,
    width: base.width + MAX_OVERHANG_MM * 2,
    height: base.height + MAX_OVERHANG_MM * 2,
  };
  let bounds = base;
  for (const layer of layers.all) {
    if (!layer.object.visible) continue;
    const points = layer.object.getCoords();
    const xs = points.map((p) => p.x);
    const ys = points.map((p) => p.y);
    const x = Math.max(limit.x, Math.min(...xs));
    const y = Math.max(limit.y, Math.min(...ys));
    const right = Math.min(limit.x + limit.width, Math.max(...xs));
    const bottom = Math.min(limit.y + limit.height, Math.max(...ys));
    bounds = unionBounds(bounds, { x, y, width: right - x, height: bottom - y });
  }
  return bounds;
}

function unionBounds(a, b) {
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  return {
    x,
    y,
    width: Math.max(a.x + a.width, b.x + b.width) - x,
    height: Math.max(a.y + a.height, b.y + b.height) - y,
  };
}

const actions = {
  'zoom-in': () => viewport.zoomIn(),
  'zoom-out': () => viewport.zoomOut(),
  'zoom-100': () => viewport.setZoom(1),
  'zoom-fit': () => viewport.fit(),
  'side-front': () => setSide('front'),
  'side-back': () => setSide('back'),
  export: () => exportDialog.open(),
  undo: () => history.undo(),
  redo: () => history.redo(),
  reset: () => resetDocument(),
};

function runAction(action) {
  if (actions[action]) actions[action]();
  else console.info(`Action not implemented yet: ${action}`);
}

initMenuBar(document.querySelector('.menu-bar'), runAction);
for (const el of document.querySelectorAll('.zoom-toolbar, .sidebar')) {
  el.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-action]');
    if (button) runAction(button.dataset.action);
  });
}

updateSettings({});
history.commit();

// ?debug exposes internals for manual testing in the console.
if (new URLSearchParams(location.search).has('debug')) {
  window.app = { canvas, layers, viewport, history, labelView, renderLabel, buildSheetPdf, sheetLayout, canvasToPngBlob, get settings() { return settings; }, get geometry() { return geometry; } };
}
