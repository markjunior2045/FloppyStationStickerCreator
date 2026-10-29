import { Canvas, Path } from '../vendor/fabric-7.4.0/index.min.mjs';
import { applyStrings, t } from './strings.js';
import { initMenuBar } from './menu.js';
import { DEFAULT_FORMAT } from './formats.js';
import { createFloppyObjects, floppyBounds } from './floppy.js';
import { allCorners, rectPath } from './shapes.js';
import { formatMm } from './units.js';
import { createViewport } from './viewport.js';

applyStrings();
document.title = t('appTitle');

const format = DEFAULT_FORMAT;

const canvas = new Canvas('label-canvas', {
  backgroundColor: getComputedStyle(document.documentElement).getPropertyValue('--canvas-area-bg').trim(),
  selection: false,
});

canvas.add(...createFloppyObjects(format));

// Placeholder label (front only, 4 rounded corners) until the label model lands.
const label = format.label;
const labelX = (format.body.width - label.width) / 2;
canvas.add(new Path(rectPath(label.width, label.frontOnlyHeight, allCorners('round', label.cornerRadius)), {
  originX: 'left',
  originY: 'top',
  left: labelX,
  top: 0,
  fill: '#ffffff',
  selectable: false,
  evented: false,
  objectCaching: false,
}));

const zoomReadout = document.getElementById('zoom-readout');
const zoomStatus = document.getElementById('status-zoom');

const viewport = createViewport(
  canvas,
  document.querySelector('.canvas-scroll'),
  () => floppyBounds(format),
  ({ mode, zoom }) => {
    const percent = Math.round(zoom * 100);
    zoomReadout.textContent = `${percent}%`;
    zoomStatus.textContent = t(mode === 'fit' ? 'zoom.statusFit' : 'zoom.status', { percent });
  },
);

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

viewport.layout();

document.getElementById('status-label').textContent = t('status.label', {
  format: format.name,
  width: formatMm(label.width),
  height: formatMm(label.frontOnlyHeight),
});
