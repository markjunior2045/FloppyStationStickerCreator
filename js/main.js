import { Canvas } from '../vendor/fabric-7.4.0/index.min.mjs';
import { applyStrings, t } from './strings.js';
import { initMenuBar } from './menu.js';
import { DEFAULT_FORMAT } from './formats.js';
import { createFloppyObjects, floppyBounds } from './floppy.js';
import { defaultDimensions, defaultLabelSettings, labelBounds, labelGeometry } from './label.js';
import { createLabelView } from './labelView.js';
import { initFloppyPanel } from './floppyPanel.js';
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
});

canvas.add(...createFloppyObjects(format));
const labelView = createLabelView(canvas);

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

const floppyPanel = initFloppyPanel(document.getElementById('floppy-panel'), {
  onSettings: (patch) => updateSettings(patch),
  onGuides: (patch) => {
    labelView.setGuideVisibility(patch);
    floppyPanel.sync(settings, labelView.guideVisibility);
  },
  onResetDimensions: () => updateSettings(defaultDimensions(format)),
});

function updateSettings(patch) {
  settings = { ...settings, ...patch };
  geometry = labelGeometry(settings, format);
  labelView.setGeometry(geometry);
  viewport.layout();
  floppyPanel.sync(settings, labelView.guideVisibility);
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
