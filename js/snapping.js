// Center snapping: while an object is dragged, its center snaps to the label's
// vertical center line and to each zone's horizontal center line. The active
// lines are drawn on screen only (never exported).
import { Point } from '../vendor/fabric-7.4.0/index.min.mjs';

const SNAP_DISTANCE_PX = 6;
const LINE_COLOR = '#ff00ff';

/**
 * options: {
 *   targets()      { x: number[], y: number[], extent: {x, y, width, height} } in mm
 *   scale()        current screen px per mm
 *   applies(obj)   whether an object snaps
 * }
 */
export function enableCenterSnapping(canvas, options) {
  let active = { x: null, y: null };

  canvas.on('object:moving', ({ target }) => {
    if (!options.applies(target)) return;
    const { x: xs, y: ys } = options.targets();
    const threshold = SNAP_DISTANCE_PX / options.scale();
    const center = target.getCenterPoint();
    active = { x: nearest(center.x, xs, threshold), y: nearest(center.y, ys, threshold) };
    if (active.x !== null || active.y !== null) {
      target.setPositionByOrigin(new Point(active.x ?? center.x, active.y ?? center.y), 'center', 'center');
      target.setCoords();
    }
  });

  const clear = () => {
    if (active.x === null && active.y === null) return;
    active = { x: null, y: null };
    canvas.requestRenderAll();
  };
  canvas.on('mouse:up', clear);
  canvas.on('selection:cleared', clear);

  canvas.on('after:render', ({ ctx }) => {
    // Only on the on-screen canvas, not on export renders.
    if (ctx !== canvas.getContext() || (active.x === null && active.y === null)) return;
    const { extent } = options.targets();
    const scale = options.scale();
    ctx.save();
    ctx.transform(...canvas.viewportTransform);
    ctx.lineWidth = 1 / scale;
    ctx.setLineDash([4 / scale, 3 / scale]);
    ctx.strokeStyle = LINE_COLOR;
    ctx.beginPath();
    if (active.x !== null) {
      ctx.moveTo(active.x, extent.y);
      ctx.lineTo(active.x, extent.y + extent.height);
    }
    if (active.y !== null) {
      ctx.moveTo(extent.x, active.y);
      ctx.lineTo(extent.x + extent.width, active.y);
    }
    ctx.stroke();
    ctx.restore();
  });
}

function nearest(value, candidates, threshold) {
  let best = null;
  for (const candidate of candidates) {
    const distance = Math.abs(candidate - value);
    if (distance <= threshold && (best === null || distance < Math.abs(best - value))) best = candidate;
  }
  return best;
}
