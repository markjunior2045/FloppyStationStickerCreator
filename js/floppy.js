// Reference drawing of the disk behind the label. Never exported, never interactive.
import { Circle, Path, Rect } from '../vendor/fabric-7.4.0/index.min.mjs';
import { allCorners, rectPath } from './shapes.js';

const COLORS = {
  body: '#3a3d42',
  recess: '#33363a',
  shutter: '#c4c8cc',
  shutterEdge: '#8e9296',
  shutterWindow: '#2a2c2f',
  hub: '#b8bcc0',
  hubEdge: '#8e9296',
  hole: '#1e2023',
};

const REFERENCE_PROPS = {
  originX: 'left',
  originY: 'top',
  selectable: false,
  evented: false,
  excludeFromExport: true,
  objectCaching: false,
};

const MIRRORED_CORNER = {
  'top-left': 'top-right',
  'top-right': 'top-left',
  'bottom-left': 'bottom-right',
  'bottom-right': 'bottom-left',
};

// Fabric places the stroked bounding box at left/top, so shift by half the
// stroke to keep the geometry itself at (x, y).
function at(x, y, strokeWidth = 0) {
  return { left: x - strokeWidth / 2, top: y - strokeWidth / 2 };
}

/**
 * side: 'front' (as in the editor) or 'back' (turned over left-to-right).
 * offsetY moves the whole drawing down (the back view lines it up with the label).
 */
export function createFloppyObjects(format, side = 'front', offsetY = 0) {
  const { body, shutter } = format;
  const back = side === 'back';
  const y0 = offsetY;

  const bodyCorners = allCorners('round', body.cornerRadius);
  const chamferCorner = back ? MIRRORED_CORNER[body.chamfer.corner] : body.chamfer.corner;
  bodyCorners[chamferCorner] = { type: 'chamfer', size: body.chamfer.size };
  const objects = [new Path(rectPath(body.width, body.height, bodyCorners), {
    ...REFERENCE_PROPS,
    ...at(0, y0),
    fill: COLORS.body,
  })];

  const recess = back ? format.back.labelRecess : format.labelRecess;
  objects.push(new Rect({
    ...REFERENCE_PROPS,
    ...at((body.width - recess.width) / 2, y0),
    width: recess.width,
    height: recess.height,
    fill: COLORS.recess,
  }));

  // The shutter wraps around the bottom edge, so it shows on both sides.
  const shutterStroke = 0.2;
  objects.push(new Path(rectPath(shutter.width, shutter.height, {
    'top-left': { type: 'round', size: shutter.cornerRadius },
    'top-right': { type: 'round', size: shutter.cornerRadius },
  }), {
    ...REFERENCE_PROPS,
    ...at((body.width - shutter.width) / 2, y0 + body.height - shutter.height, shutterStroke),
    fill: COLORS.shutter,
    stroke: COLORS.shutterEdge,
    strokeWidth: shutterStroke,
  }));
  objects.push(new Rect({
    ...REFERENCE_PROPS,
    ...at(
      (body.width - shutter.window.width) / 2,
      y0 + body.height - shutter.window.bottom - shutter.window.height,
    ),
    width: shutter.window.width,
    height: shutter.window.height,
    fill: COLORS.shutterWindow,
  }));

  if (back) objects.push(...backDetails(format, y0));
  return objects;
}

function backDetails(format, y0) {
  const { body } = format;
  const { hub, holes } = format.back;
  const cx = body.width / 2;
  const cy = y0 + hub.centerY;
  const hubStroke = 0.3;
  const objects = [
    new Circle({
      ...REFERENCE_PROPS,
      ...at(cx - hub.diameter / 2, cy - hub.diameter / 2, hubStroke),
      radius: hub.diameter / 2,
      fill: COLORS.hub,
      stroke: COLORS.hubEdge,
      strokeWidth: hubStroke,
    }),
    new Rect({
      ...REFERENCE_PROPS,
      ...at(cx - hub.spindleHole / 2, cy - hub.spindleHole / 2),
      width: hub.spindleHole,
      height: hub.spindleHole,
      fill: COLORS.hole,
    }),
    new Rect({
      ...REFERENCE_PROPS,
      ...at(cx + hub.pinHole.dx - hub.pinHole.width / 2, cy + hub.pinHole.dy - hub.pinHole.height / 2),
      width: hub.pinHole.width,
      height: hub.pinHole.height,
      fill: COLORS.hole,
    }),
  ];
  for (const x of [holes.inset, body.width - holes.inset - holes.size]) {
    objects.push(new Rect({
      ...REFERENCE_PROPS,
      ...at(x, y0 + body.height - holes.bottom - holes.size),
      width: holes.size,
      height: holes.size,
      fill: COLORS.hole,
    }));
  }
  return objects;
}

export function floppyBounds(format, offsetY = 0) {
  return { x: 0, y: offsetY, width: format.body.width, height: format.body.height };
}
