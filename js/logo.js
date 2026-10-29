// Logo layer: an image (usually a PNG with transparency) that can be dragged,
// resized and rotated freely.
import { FabricImage } from '../vendor/fabric-7.4.0/index.min.mjs';
import { LAYER_OBJECT_PROPS, newLayerId } from './layers.js';
import { safetyAreas } from './label.js';
import { applyLogoEffects, cloneEffects, DEFAULT_LOGO_EFFECTS } from './logoEffects.js';

// Initial size: fits this share of the front zone's safe area.
const INITIAL_MAX_WIDTH = 0.8;
const INITIAL_MAX_HEIGHT = 0.5;

export function createLogoLayer({ image, src, name, geometry, effects = DEFAULT_LOGO_EFFECTS, id = newLayerId() }) {
  const front = geometry.zones.find((zone) => zone.id === 'front');
  const safe = safetyAreas(geometry).find((area) => area.y >= front.y - 1e-6) ?? front;
  const scale = Math.min(
    (safe.width * INITIAL_MAX_WIDTH) / image.width,
    (safe.height * INITIAL_MAX_HEIGHT) / image.height,
  );
  const object = new FabricImage(image, {
    ...LAYER_OBJECT_PROPS,
    left: safe.x + safe.width / 2,
    top: safe.y + safe.height / 2,
    scaleX: scale,
    scaleY: scale,
  });
  const layer = { id, type: 'logo', name, src, image, object, effects: cloneEffects(effects) };
  applyLogoEffects(layer);
  return layer;
}
