// Reference drawing of the disk behind the label. Never exported, never interactive.
import { Path, Rect } from '../vendor/fabric-7.4.0/index.min.mjs';
import { allCorners, rectPath } from './shapes.js';

const COLORS = {
  body: '#3a3d42',
  recess: '#33363a',
  shutter: '#c4c8cc',
  shutterEdge: '#8e9296',
  shutterWindow: '#2a2c2f',
};

const REFERENCE_PROPS = {
  originX: 'left',
  originY: 'top',
  selectable: false,
  evented: false,
  excludeFromExport: true,
  objectCaching: false,
};

// Fabric places the stroked bounding box at left/top, so shift by half the
// stroke to keep the geometry itself at (x, y).
function at(x, y, strokeWidth = 0) {
  return { left: x - strokeWidth / 2, top: y - strokeWidth / 2 };
}

export function createFloppyObjects(format) {
  const { body, labelRecess, shutter } = format;

  const bodyCorners = allCorners('round', body.cornerRadius);
  bodyCorners[body.chamfer.corner] = { type: 'chamfer', size: body.chamfer.size };
  const bodyShape = new Path(rectPath(body.width, body.height, bodyCorners), {
    ...REFERENCE_PROPS,
    ...at(0, 0),
    fill: COLORS.body,
  });

  const recess = new Rect({
    ...REFERENCE_PROPS,
    ...at((body.width - labelRecess.width) / 2, 0),
    width: labelRecess.width,
    height: labelRecess.height,
    fill: COLORS.recess,
  });

  const shutterX = (body.width - shutter.width) / 2;
  const shutterY = body.height - shutter.height;
  const shutterStroke = 0.2;
  const shutterPlate = new Path(rectPath(shutter.width, shutter.height, {
    'top-left': { type: 'round', size: shutter.cornerRadius },
    'top-right': { type: 'round', size: shutter.cornerRadius },
  }), {
    ...REFERENCE_PROPS,
    ...at(shutterX, shutterY, shutterStroke),
    fill: COLORS.shutter,
    stroke: COLORS.shutterEdge,
    strokeWidth: shutterStroke,
  });

  const shutterWindow = new Rect({
    ...REFERENCE_PROPS,
    ...at(
      (body.width - shutter.window.width) / 2,
      body.height - shutter.window.bottom - shutter.window.height,
    ),
    width: shutter.window.width,
    height: shutter.window.height,
    fill: COLORS.shutterWindow,
  });

  return [bodyShape, recess, shutterPlate, shutterWindow];
}

export function floppyBounds(format) {
  return { x: 0, y: 0, width: format.body.width, height: format.body.height };
}
