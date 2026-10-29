// Print effects over the whole label: white border, fade, darken, grain.
// They are ordinary Fabric objects above the layers, so the editor shows
// exactly what the export renders (same objects, same blend modes).
import { Path, Pattern, Rect } from '../vendor/fabric-7.4.0/index.min.mjs';
import { rectPath } from './shapes.js';

export const DEFAULT_EFFECTS = { border: 0, darken: 0, fade: 0, grain: 0 };

// border in mm; the others in percent.
export const EFFECT_LIMITS = {
  border: { min: 0, max: 4, step: 0.1 },
  darken: { min: 0, max: 60, step: 1 },
  fade: { min: 0, max: 80, step: 1 },
  grain: { min: 0, max: 100, step: 1 },
};

export const PRESETS = {
  none: { ...DEFAULT_EFFECTS },
  clean: { border: 1.5, darken: 0, fade: 0, grain: 0 },
  shareware90s: { border: 1.5, darken: 6, fade: 12, grain: 22 },
  fadedBox: { border: 0, darken: 0, fade: 40, grain: 15 },
  thriftStore: { border: 1, darken: 25, fade: 20, grain: 45 },
};

const GRAIN_TILE_PX = 128;
const GRAIN_MM_PER_PX = 0.08; // about one export pixel at 300 dpi
const FADE_WASH = 0.35; // share of the fade that lightens (the rest desaturates)

const STATIC_PROPS = {
  originX: 'left',
  originY: 'top',
  selectable: false,
  evented: false,
  objectCaching: false,
};

/**
 * White frame inside each zone's cut edges (folds get none), extended out
 * through the bleed so an imperfect cut still shows white. The back's far
 * end (its bottom here) isn't extended: past it lies the spine, and export
 * builds that bleed from the back's own edge row anyway.
 * Returns [{ zone, path, x, y }] in world mm.
 */
export function borderShapes(geometry, width) {
  if (width <= 0) return [];
  const bleed = geometry.outline.x - geometry.bleed.x;
  const single = geometry.content.length === 1;
  return geometry.content.map((zone) => {
    const cut = { left: true, right: true, top: single, bottom: zone.id !== 'spine' };
    const grows = { ...cut, bottom: zone.id === 'front' };
    const grow = (side) => (grows[side] ? bleed : 0);
    const inset = (side) => (cut[side] ? width : 0);
    const outer = {
      x: zone.x - grow('left'),
      y: zone.y - grow('top'),
      width: zone.width + grow('left') + grow('right'),
      height: zone.height + grow('top') + grow('bottom'),
    };
    const inner = {
      x: zone.x + inset('left'),
      y: zone.y + inset('top'),
      width: zone.width - inset('left') - inset('right'),
      height: zone.height - inset('top') - inset('bottom'),
      corners: Object.fromEntries(Object.entries(zone.corners).map(([name, c]) => {
        const size = c.type === 'round' ? c.size - width : 0;
        return [name, size > 0 ? { type: 'round', size } : { type: 'square', size: 0 }];
      })),
    };
    let path = rectPath(outer.width, outer.height, {}, outer.x, outer.y);
    if (inner.width > 0 && inner.height > 0) {
      path += ` ${rectPath(inner.width, inner.height, inner.corners, inner.x, inner.y)}`;
    }
    return { zone: zone.id, path, x: outer.x, y: outer.y };
  });
}

let grainTile = null;

// Same noise every time (seeded), so the export matches the screen.
function getGrainTile() {
  if (grainTile) return grainTile;
  let seed = 0x5eed1990;
  const random = () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  grainTile = document.createElement('canvas');
  grainTile.width = GRAIN_TILE_PX;
  grainTile.height = GRAIN_TILE_PX;
  const ctx = grainTile.getContext('2d');
  const data = ctx.createImageData(GRAIN_TILE_PX, GRAIN_TILE_PX);
  for (let i = 0; i < data.data.length; i += 4) {
    const v = Math.round(random() * 255);
    data.data[i] = v;
    data.data[i + 1] = v;
    data.data[i + 2] = v;
    data.data[i + 3] = 255;
  }
  ctx.putImageData(data, 0, 0);
  return grainTile;
}

/** Fabric objects for the effects: [{ object, zone }] bottom to top. */
export function createEffectObjects(geometry, effects) {
  const items = [];
  for (const shape of borderShapes(geometry, effects.border)) {
    items.push({
      zone: shape.zone,
      object: new Path(shape.path, {
        ...STATIC_PROPS, left: shape.x, top: shape.y, fill: '#ffffff', fillRule: 'evenodd',
      }),
    });
  }

  const { x, y, width, height } = geometry.bleed;
  const area = { ...STATIC_PROPS, left: x, top: y, width, height };
  if (effects.fade > 0) {
    const amount = effects.fade / 100;
    items.push({ zone: null, object: new Rect({ ...area, fill: '#808080', opacity: amount, globalCompositeOperation: 'saturation' }) });
    items.push({ zone: null, object: new Rect({ ...area, fill: '#fffaf0', opacity: amount * FADE_WASH }) });
  }
  if (effects.darken > 0) {
    items.push({ zone: null, object: new Rect({ ...area, fill: '#000000', opacity: effects.darken / 100 }) });
  }
  if (effects.grain > 0) {
    const pattern = new Pattern({
      source: getGrainTile(),
      repeat: 'repeat',
      patternTransform: [GRAIN_MM_PER_PX, 0, 0, GRAIN_MM_PER_PX, 0, 0],
    });
    items.push({
      zone: null,
      object: new Rect({ ...area, fill: pattern, opacity: (effects.grain / 100) * 0.6, globalCompositeOperation: 'overlay' }),
    });
  }
  return items;
}
