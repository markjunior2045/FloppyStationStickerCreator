import { Canvas } from '../vendor/fabric-7.4.0/index.min.mjs';
import { applyStrings, t } from './strings.js';
import { initMenuBar } from './menu.js';
import { DEFAULT_FORMAT } from './formats.js';
import { createFloppyObjects, floppyBounds } from './floppy.js';
import { defaultDimensions, defaultLabelSettings, labelBounds, labelGeometry } from './label.js';
import { createLabelView } from './labelView.js';
import { initFloppyPanel } from './floppyPanel.js';
import { initImagesPanel } from './imagesPanel.js';
import { createLayerStore } from './layers.js';
import { initLayerList } from './layerList.js';
import {
  backgroundZoom, constrainBackground, createBackgroundLayer, resetBackgroundFraming, setBackgroundZoom,
} from './background.js';
import { createLogoLayer } from './logo.js';
import { applyLogoEffects } from './logoEffects.js';
import { enableCenterSnapping } from './snapping.js';
import { acceptImageDrops, loadImage, readFileAsDataUrl } from './images.js';
import { formatMm, SCREEN_PX_PER_MM } from './units.js';
import { createViewport } from './viewport.js';

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

const layers = createLayerStore(canvas, {
  below: () => [...floppyObjects, labelView.base],
  above: () => labelView.guides,
  onChange: () => syncPanels(),
});

// ---- Viewport ----

const zoomReadout = document.getElementById('zoom-readout');
const zoomStatus = document.getElementById('status-zoom');

const viewport = createViewport(
  canvas,
  document.querySelector('.canvas-scroll'),
  () => unionBounds(floppyBounds(format), labelBounds(geometry)),
  ({ mode, zoom }) => {
    const percent = Math.round(zoom * 100);
    zoomReadout.textContent = `${percent}%`;
    zoomStatus.textContent = t(mode === 'fit' ? 'zoom.statusFit' : 'zoom.status', { percent });
    labelView.setScale(zoom * SCREEN_PX_PER_MM);
  },
);

// ---- Label settings ----

const floppyPanel = initFloppyPanel(document.getElementById('floppy-panel'), {
  onSettings: (patch) => updateSettings(patch),
  onGuides: (patch) => {
    labelView.setGuideVisibility(patch);
    syncPanels();
  },
  onResetDimensions: () => updateSettings(defaultDimensions(format)),
});

function updateSettings(patch) {
  settings = { ...settings, ...patch };
  geometry = labelGeometry(settings, format);
  labelView.setGeometry(geometry);
  layers.setClip(geometry);
  const background = currentBackground();
  if (background) constrainBackground(background.object, geometry.bleed);
  layers.restack();
  viewport.layout();
  syncPanels();
  updateLabelStatus();
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

const currentBackground = () => layers.byType('background')[0] ?? null;

const imagesPanel = initImagesPanel(document.getElementById('images-panel'), {
  onOpen: (type, file) => openImage(type, file),
  onRemove: (type) => {
    for (const layer of layers.byType(type)) layers.remove(layer.id);
  },
  onBackgroundZoom: (zoom) => {
    const background = currentBackground();
    if (!background) return;
    setBackgroundZoom(background.object, geometry.bleed, zoom);
    canvas.requestRenderAll();
  },
  onLogoEffect: (path, value) => {
    const logo = layers.byType('logo')[0];
    if (!logo) return;
    const [group, key] = path.split('.');
    logo.effects[group][key] = value;
    applyLogoEffects(logo);
    canvas.requestRenderAll();
    syncPanels();
  },
  onBackgroundReset: () => {
    const background = currentBackground();
    if (!background) return;
    resetBackgroundFraming(background.object, geometry.bleed);
    canvas.requestRenderAll();
    syncPanels();
  },
});

async function openImage(type, file) {
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
  if (type === 'background') {
    const previous = currentBackground();
    const layer = createBackgroundLayer({ image, src, name: t('layers.background'), area: geometry.bleed });
    if (previous) layers.remove(previous.id);
    layers.add(layer, 0);
    canvas.setActiveObject(layer.object);
  } else if (type === 'logo') {
    const previous = layers.byType('logo')[0];
    const layer = createLogoLayer({ image, src, name: t('layers.logo'), geometry });
    const index = previous ? layers.all.indexOf(previous) : layers.all.length;
    if (previous) layers.remove(previous.id);
    layers.add(layer, index);
    canvas.setActiveObject(layer.object);
  }
  syncPanels();
}

acceptImageDrops(document.querySelector('.canvas-scroll'), (file) => openImage('background', file));

canvas.on('object:moving', ({ target }) => constrainIfBackground(target));
canvas.on('object:scaling', ({ target }) => constrainIfBackground(target));
canvas.on('object:modified', ({ target }) => {
  // Keep the outline the same thickness in mm after a resize.
  const layer = layers.byObject(target);
  if (layer?.type === 'logo') {
    applyLogoEffects(layer);
    canvas.requestRenderAll();
  }
  syncPanels();
});

enableCenterSnapping(canvas, {
  targets: () => ({
    x: [geometry.outline.x + geometry.outline.width / 2],
    y: geometry.zones.map((zone) => zone.y + zone.height / 2),
    extent: geometry.bleed,
  }),
  scale: () => viewport.zoom * SCREEN_PX_PER_MM,
  applies: (object) => {
    const type = layers.byObject(object)?.type;
    return type !== undefined && type !== 'background';
  },
});

function constrainIfBackground(object) {
  if (layers.byObject(object)?.type === 'background') {
    constrainBackground(object, geometry.bleed);
    syncPanels();
  }
}

// The list can select hidden layers too (to show, move or delete them),
// so its selection is tracked here and mirrors the canvas when possible.
let listSelection = null;

const layerList = initLayerList(document.getElementById('layers-panel'), {
  onSelect: (id) => {
    const layer = layers.byId(id);
    if (!layer) return;
    if (layer.object.visible && layer.object.selectable) {
      canvas.setActiveObject(layer.object);
    } else {
      canvas.discardActiveObject();
    }
    listSelection = id;
    canvas.requestRenderAll();
    syncPanels();
  },
  onVisible: (id, visible) => layers.setVisible(id, visible),
  onMove: (id, delta) => layers.move(id, delta),
  onDelete: (id) => layers.remove(id),
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
  const background = currentBackground();
  imagesPanel.sync({
    background: background ? { zoom: backgroundZoom(background.object, geometry.bleed) } : null,
    logo: layers.byType('logo')[0] ? { effects: layers.byType('logo')[0].effects } : null,
  });
}

// ---- Commands ----

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
};

function runAction(action) {
  if (actions[action]) actions[action]();
  else console.info(`Action not implemented yet: ${action}`);
}

initMenuBar(document.querySelector('.menu-bar'), runAction);
document.querySelector('.zoom-toolbar').addEventListener('click', (event) => {
  const button = event.target.closest('button[data-action]');
  if (button) runAction(button.dataset.action);
});

updateSettings({});

// ?debug exposes internals for manual testing in the console.
if (new URLSearchParams(location.search).has('debug')) {
  window.app = { canvas, layers, viewport, get settings() { return settings; }, get geometry() { return geometry; } };
}
