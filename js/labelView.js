// Fabric objects for the label: the label base (clipped to the cut shape) and
// the guides (never exported, drawn 1 screen px wide at any zoom).
import { Path, Rect } from '../vendor/fabric-7.4.0/index.min.mjs';
import { rectPath } from './shapes.js';
import { safetyAreas } from './label.js';

const GUIDE_COLORS = {
  safety: '#0090ff',
  bleed: '#e0218a',
  fold: '#00a050',
};

const STATIC_PROPS = {
  originX: 'left',
  originY: 'top',
  selectable: false,
  evented: false,
  objectCaching: false,
};

export function shapePath(rect, props = {}) {
  return new Path(rectPath(rect.width, rect.height, rect.corners), {
    ...STATIC_PROPS,
    left: rect.x,
    top: rect.y,
    ...props,
  });
}

/** Clip path for anything that belongs to the label: the cut line, or a zone. */
export function createClipPath(rect) {
  return shapePath(rect, { absolutePositioned: true });
}

export function createLabelView(canvas) {
  let base = null;
  let guides = [];
  let geometry = null;
  let visible = { safety: true, bleed: true, fold: true };
  let guidesHidden = false;
  let scale = 1;

  function setGeometry(next) {
    geometry = next;
    if (base) canvas.remove(base);
    // The base covers the bleed area so content keeps going past the cut line;
    // the clip path shows exactly what remains after cutting.
    const { x, y, width, height } = geometry.bleed;
    base = new Rect({
      ...STATIC_PROPS,
      left: x,
      top: y,
      width,
      height,
      fill: '#ffffff',
      clipPath: createClipPath(geometry.outline),
    });
    canvas.add(base);
    rebuildGuides();
  }

  function setClipRect(rect) {
    base.clipPath = createClipPath(rect);
    base.dirty = true;
    canvas.requestRenderAll();
  }

  function setGuidesHidden(hidden) {
    guidesHidden = hidden;
    rebuildGuides();
  }

  function setGuideVisibility(next) {
    visible = { ...visible, ...next };
    rebuildGuides();
  }

  // Guide strokes are in mm, so they're rebuilt when the zoom changes.
  function setScale(pxPerMm) {
    scale = pxPerMm;
    rebuildGuides();
  }

  function guide(rect, color, dashed) {
    const sw = 1 / scale;
    return shapePath(rect, {
      left: rect.x - sw / 2,
      top: rect.y - sw / 2,
      fill: '',
      stroke: color,
      strokeWidth: sw,
      strokeDashArray: dashed ? [4 * sw, 3 * sw] : null,
      excludeFromExport: true,
    });
  }

  function foldLine(y) {
    const sw = 1 / scale;
    const { x, width } = geometry.bleed;
    return new Path(`M 0 0 L ${width} 0`, {
      ...STATIC_PROPS,
      left: x,
      top: y - sw / 2,
      stroke: GUIDE_COLORS.fold,
      strokeWidth: sw,
      strokeDashArray: [6 * sw, 3 * sw, 1 * sw, 3 * sw],
      excludeFromExport: true,
    });
  }

  function rebuildGuides() {
    if (!geometry) return;
    canvas.remove(...guides);
    guides = [];
    if (guidesHidden) {
      canvas.requestRenderAll();
      return;
    }
    if (visible.bleed) guides.push(guide(geometry.bleed, GUIDE_COLORS.bleed, true));
    if (visible.safety) {
      for (const area of safetyAreas(geometry)) guides.push(guide(area, GUIDE_COLORS.safety, true));
    }
    if (visible.fold) guides.push(...geometry.folds.map(foldLine));
    canvas.add(...guides);
    canvas.requestRenderAll();
  }

  return {
    setGeometry,
    setClipRect,
    setGuidesHidden,
    setGuideVisibility,
    setScale,
    get guideVisibility() { return { ...visible }; },
    get base() { return base; },
    get guides() { return [...guides]; },
  };
}
