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
initMenuBar(document.querySelector('.menu-bar'), (action) => {
  console.info(`Menu action not implemented yet: ${action}`);
});

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

const viewport = createViewport(
  canvas,
  document.querySelector('.canvas-scroll'),
  () => floppyBounds(format),
);
viewport.layout();

document.getElementById('status-label').textContent =
  `${format.name} · label ${formatMm(label.width)} × ${formatMm(label.frontOnlyHeight)} mm`;
