// Optional logo outline and drop shadow, sized in mm so they print the same
// at any zoom. The outline follows the image's transparency (not its box):
// it's baked into a padded copy of the image, rebuilt when the logo is resized.
import { Shadow } from '../vendor/fabric-7.4.0/index.min.mjs';

export const DEFAULT_LOGO_EFFECTS = {
  outline: { enabled: false, color: '#000000', width: 0.4 },
  shadow: { enabled: false, color: '#000000', offset: 0.6, blur: 0.6 },
};

export const LOGO_EFFECT_LIMITS = {
  outlineWidth: { min: 0.1, max: 3 },
  shadowOffset: { min: 0, max: 5 },
  shadowBlur: { min: 0, max: 5 },
};

const SHADOW_OPACITY = 0.7;
const MAX_OUTLINE_PX = 200;

export function cloneEffects(effects) {
  return { outline: { ...effects.outline }, shadow: { ...effects.shadow } };
}

/** Applies layer.effects to layer.object. Cheap when nothing changed. */
export function applyLogoEffects(layer) {
  const { object, image, effects } = layer;
  const { outline, shadow } = effects;

  let element = image;
  let key = 'none';
  if (outline.enabled) {
    // object.scaleX is mm per image pixel.
    const radius = Math.min(MAX_OUTLINE_PX, outline.width / object.scaleX);
    key = `${outline.color}:${radius.toFixed(2)}`;
    if (layer.bakedKey !== key) element = bakeOutline(image, radius, outline.color);
  }
  if (layer.bakedKey !== key) {
    object.setElement(element);
    object.setCoords();
    layer.bakedKey = key;
  }

  object.shadow = shadow.enabled
    ? new Shadow({
      color: withAlpha(shadow.color, SHADOW_OPACITY),
      offsetX: shadow.offset,
      offsetY: shadow.offset,
      blur: shadow.blur,
      nonScaling: true,
    })
    : null;
  object.dirty = true;
}

/** Image padded by `radius` px with a solid silhouette of it grown by `radius` behind. */
export function bakeOutline(image, radius, color) {
  const pad = Math.ceil(radius) + 1;
  const canvas = document.createElement('canvas');
  canvas.width = image.width + pad * 2;
  canvas.height = image.height + pad * 2;
  const ctx = canvas.getContext('2d');

  // Dilate the alpha by stamping the image around circles of decreasing radius.
  const steps = Math.min(96, Math.max(16, Math.ceil(Math.PI * radius)));
  for (const ring of [1, 2 / 3, 1 / 3]) {
    const r = radius * ring;
    for (let i = 0; i < steps; i++) {
      const angle = (i / steps) * Math.PI * 2;
      ctx.drawImage(image, pad + r * Math.cos(angle), pad + r * Math.sin(angle));
    }
  }
  ctx.globalCompositeOperation = 'source-in';
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.globalCompositeOperation = 'source-over';
  ctx.drawImage(image, pad, pad);
  return canvas;
}

export function withAlpha(hex, alpha) {
  const n = Number.parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}
