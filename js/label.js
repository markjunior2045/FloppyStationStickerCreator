// Label model and geometry, all in mm. Pure functions: no Fabric, no DOM.
//
// World coordinates follow the editor's front view (see formats.js): origin at
// the disk body's top-left, y down. In wrap-around mode the label is shown
// unfolded: front from y = 0 down, spine and back above the disk's top edge.
import { pxPerMm } from './units.js';

export const LABEL_MODES = ['front', 'wrap'];
export const CORNER_STYLES = ['square', 'two', 'four'];

// Editable dimensions and their allowed ranges (mm).
export const DIMENSION_LIMITS = {
  width: { min: 40, max: 90 },
  front: { min: 20, max: 70 },
  spine: { min: 1, max: 6 },
  back: { min: 0, max: 30 },
  frontOnlyHeight: { min: 20, max: 70 },
  cornerRadius: { min: 0, max: 6 },
};

export function defaultLabelSettings(format) {
  const d = format.label;
  return {
    mode: 'front',
    corners: 'four',
    width: d.width,
    front: d.wrapAround.front,
    spine: d.wrapAround.spine,
    back: d.wrapAround.back,
    frontOnlyHeight: d.frontOnlyHeight,
    cornerRadius: d.cornerRadius,
    safetyMargin: d.safetyMargin,
    bleed: d.bleed,
  };
}

export function defaultDimensions(format) {
  const s = defaultLabelSettings(format);
  return Object.fromEntries(Object.keys(DIMENSION_LIMITS).map((key) => [key, s[key]]));
}

export function clampDimension(key, value) {
  const { min, max } = DIMENSION_LIMITS[key];
  return Math.min(max, Math.max(min, value));
}

// Which outline corners are rounded. "two" = the two bottom corners of the
// front (inside the recess, near the shutter).
function cornerSet(settings) {
  const r = settings.cornerRadius;
  const round = { type: 'round', size: r };
  const square = { type: 'square', size: 0 };
  switch (settings.corners) {
    case 'four':
      return { 'top-left': round, 'top-right': round, 'bottom-right': round, 'bottom-left': round };
    case 'two':
      return { 'top-left': square, 'top-right': square, 'bottom-right': round, 'bottom-left': round };
    default:
      return { 'top-left': square, 'top-right': square, 'bottom-right': square, 'bottom-left': square };
  }
}

/**
 * Resolved geometry of the label in world mm:
 * - outline: cut line { x, y, width, height, corners }
 * - bleed: outline grown by the bleed on every side
 * - zones: [{ id, x, y, width, height, corners }] from top to bottom, with
 *   the physical strip's corners
 * - content: the zones as the editor shows them. The back zone is edited in
 *   reading orientation and turned 180° on export, so its shape is turned too:
 *   the strip's far-end corners clip the bottom of the back content.
 * - bleedGuide: where content keeps printing past the cut line, in the
 *   editor's orientation (in wrap-around the back's top edge is the fold, so
 *   there's no bleed above it)
 * - folds: y of each fold line (wrap-around only)
 */
export function labelGeometry(settings, format) {
  const width = settings.width;
  const x = (format.body.width - width) / 2;
  const corners = cornerSet(settings);

  let zones;
  let folds = [];
  if (settings.mode === 'wrap') {
    const { front, spine, back } = settings;
    zones = [
      { id: 'back', y: -(spine + back), height: back },
      { id: 'spine', y: -spine, height: spine },
      { id: 'front', y: 0, height: front },
    ];
    folds = [-spine, 0];
  } else {
    zones = [{ id: 'front', y: 0, height: settings.frontOnlyHeight }];
  }
  zones = zones.filter((zone) => zone.height > 0);

  const top = zones[0].y;
  const bottom = zones[zones.length - 1].y + zones[zones.length - 1].height;
  const outline = { x, y: top, width, height: bottom - top, corners };

  // Each zone inherits the outline corners on its outer edges.
  const isFirst = (i) => i === 0;
  const isLast = (i) => i === zones.length - 1;
  const square = { type: 'square', size: 0 };
  zones = zones.map((zone, i) => ({
    ...zone,
    x,
    width,
    corners: {
      'top-left': isFirst(i) ? corners['top-left'] : square,
      'top-right': isFirst(i) ? corners['top-right'] : square,
      'bottom-right': isLast(i) ? corners['bottom-right'] : square,
      'bottom-left': isLast(i) ? corners['bottom-left'] : square,
    },
  }));

  const content = zones.map((zone) => (zone.id === 'back' ? rotateCorners180(zone) : zone));
  const bleed = offsetRect(outline, settings.bleed);
  let bleedGuide = bleed;
  if (settings.mode === 'wrap') {
    bleedGuide = {
      ...bleed,
      y: outline.y,
      height: bleed.height - settings.bleed,
      corners: { ...bleed.corners, 'top-left': square, 'top-right': square },
    };
  }

  return {
    outline,
    bleed,
    bleedGuide,
    zones,
    content,
    folds,
    safetyMargin: settings.safetyMargin,
  };
}

/** Grow (positive) or shrink (negative) a rect, keeping corners concentric. */
export function offsetRect(rect, delta) {
  const corners = Object.fromEntries(Object.entries(rect.corners).map(([name, c]) => {
    if (c.type !== 'round') return [name, c];
    const size = c.size + delta;
    return [name, size > 0 ? { type: 'round', size } : { type: 'square', size: 0 }];
  }));
  return {
    x: rect.x - delta,
    y: rect.y - delta,
    width: rect.width + delta * 2,
    height: rect.height + delta * 2,
    corners,
  };
}

/** Safety areas: each zone shrunk by the margin. The spine is too thin and has none. */
export function safetyAreas(geometry) {
  return geometry.content
    .filter((zone) => zone.id !== 'spine')
    .map((zone) => offsetRect(zone, -geometry.safetyMargin))
    .filter((rect) => rect.width > 0 && rect.height > 0);
}

/** Pixel size of the exported raster at a DPI, with or without bleed. */
export function exportPixelSize(geometry, dpi, { withBleed = true } = {}) {
  const rect = withBleed ? geometry.bleed : geometry.outline;
  const scale = pxPerMm(dpi);
  return { width: Math.round(rect.width * scale), height: Math.round(rect.height * scale) };
}

/** Same rect turned 180° in place: each corner moves to the opposite one. */
export function rotateCorners180(rect) {
  const c = rect.corners;
  return {
    ...rect,
    corners: {
      'top-left': c['bottom-right'],
      'top-right': c['bottom-left'],
      'bottom-right': c['top-left'],
      'bottom-left': c['top-right'],
    },
  };
}

/**
 * The back zone as it ends up on the disk's back, in the editor's reading
 * orientation: content upright, the fold edge on top and the label's far end
 * (with its corners) at the bottom. Null in front-only mode.
 */
export function backViewZone(geometry) {
  return geometry.content.find((zone) => zone.id === 'back') ?? null;
}

/**
 * Area a background should cover to fill part of the label, including the
 * bleed where that edge is a cut edge:
 * - 'label': the whole bleed area
 * - 'front': the front zone; in wrap-around its top is the spine fold
 * - 'back': the back zone (wrap-around); its top is the fold and its bottom
 *   sits against the spine, so only the sides get bleed
 */
export function fillArea(geometry, which) {
  const { bleed, outline } = geometry;
  const zone = geometry.content.find((z) => z.id === which);
  if (which === 'label' || !zone) return bleed;
  const b = outline.x - bleed.x;
  const wrap = geometry.folds.length > 0;
  if (which === 'front') {
    const top = wrap ? zone.y : zone.y - b;
    return { x: bleed.x, y: top, width: bleed.width, height: zone.y + zone.height + b - top };
  }
  return { x: bleed.x, y: zone.y, width: bleed.width, height: zone.height };
}

export function labelBounds(geometry) {
  const { x, y, width, height } = geometry.bleed;
  return { x, y, width, height };
}
