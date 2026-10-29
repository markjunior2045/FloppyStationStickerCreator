// Phase 0 hello world: proves Fabric.js loads as an ES module and draws
// a 71 x 71 mm label with 2.5 mm corners at real scale.
import { Canvas, Rect, version } from '../vendor/fabric-7.4.0/index.min.mjs';

const CSS_PX_PER_MM = 96 / 25.4;
const ZOOM = 2;
const mmToPx = (mm) => mm * CSS_PX_PER_MM * ZOOM;

const LABEL = { width: 71.0, height: 71.0, cornerRadius: 2.5 };
const PADDING_MM = 5;

const canvas = new Canvas('label-canvas', {
  width: mmToPx(LABEL.width + PADDING_MM * 2),
  height: mmToPx(LABEL.height + PADDING_MM * 2),
  backgroundColor: '#808080',
});

canvas.add(new Rect({
  originX: 'left',
  originY: 'top',
  left: mmToPx(PADDING_MM),
  top: mmToPx(PADDING_MM),
  width: mmToPx(LABEL.width),
  height: mmToPx(LABEL.height),
  rx: mmToPx(LABEL.cornerRadius),
  ry: mmToPx(LABEL.cornerRadius),
  fill: '#ffffff',
  stroke: '#000000',
  strokeWidth: 1,
  strokeUniform: true,
}));

document.getElementById('status-label').textContent =
  `Label: ${LABEL.width} × ${LABEL.height} mm, r ${LABEL.cornerRadius} mm, zoom ${ZOOM * 100}%`;
document.getElementById('status-lib').textContent = `Fabric.js ${version}`;
