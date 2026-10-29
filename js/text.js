// Text layers: Fabric Textbox in mm. Size is shown to the user in points;
// outline and shadow are in mm like the logo's.
import { Shadow, Textbox } from '../vendor/fabric-7.4.0/index.min.mjs';
import { LAYER_OBJECT_PROPS, newLayerId } from './layers.js';
import { safetyAreas } from './label.js';
import { withAlpha } from './logoEffects.js';

export const MM_PER_PT = 25.4 / 72;
export const FONT_SIZE_LIMITS_PT = { min: 3, max: 96 };

export const TEXT_EFFECT_LIMITS = {
  outlineWidth: { min: 0.05, max: 2 },
  shadowOffset: { min: 0, max: 3 },
  shadowBlur: { min: 0, max: 3 },
};

const SHADOW_OPACITY = 0.7;

// Starting style per zone. The spine is ~3 mm high: Silkscreen at 8 pt gives
// capitals about 2 mm tall.
const ZONE_PRESETS = {
  front: { text: 'GAME TITLE', fontFamily: 'Press Start 2P', sizePt: 12 },
  spine: { text: 'GAME TITLE', fontFamily: 'Silkscreen', sizePt: 8 },
  back: { text: 'Disk 1 of 1', fontFamily: 'VT323', sizePt: 12 },
};

export const DEFAULT_TEXT_EFFECTS = {
  outline: { enabled: true, color: '#000000', width: 0.3 },
  shadow: { enabled: false, color: '#000000', offset: 0.4, blur: 0.3 },
};

/** Starting content and box for new text in a zone (front, spine or back). */
export function textPreset(geometry, zoneId) {
  const zone = geometry.content.find((z) => z.id === zoneId) ?? geometry.content.at(-1);
  const preset = ZONE_PRESETS[zone.id] ?? ZONE_PRESETS.front;
  // Spine has no safety area; keep 2 mm from the sides like the others.
  const safe = safetyAreas(geometry).find((area) => area.y >= zone.y - 1e-6 && area.y < zone.y + zone.height)
    ?? { x: zone.x + 2, y: zone.y, width: zone.width - 4, height: zone.height };
  return {
    text: preset.text,
    fontFamily: preset.fontFamily,
    fontSize: preset.sizePt * MM_PER_PT,
    fill: '#ffffff',
    textAlign: 'center',
    width: safe.width,
    left: zone.x + zone.width / 2,
    top: zone.y + zone.height / 2,
  };
}

/** props: text, fontFamily, fontSize (mm), fill, textAlign, width, left, top, angle. */
export function createTextLayer({ props, name, effects = DEFAULT_TEXT_EFFECTS, id = newLayerId() }) {
  const object = new Textbox(props.text, {
    ...LAYER_OBJECT_PROPS,
    fontFamily: props.fontFamily,
    fontSize: props.fontSize,
    fill: props.fill,
    textAlign: props.textAlign,
    width: props.width,
    left: props.left,
    top: props.top,
    angle: props.angle ?? 0,
    lineHeight: 1.1,
    paintFirst: 'stroke',
    strokeLineJoin: 'round',
    strokeUniform: false,
    editingBorderColor: '#000080',
    cursorColor: '#000000',
  });
  const layer = {
    id, type: 'text', name, object, effects: cloneTextEffects(effects),
  };
  applyTextEffects(layer);
  return layer;
}

export function cloneTextEffects(effects) {
  return { outline: { ...effects.outline }, shadow: { ...effects.shadow } };
}

/** Outline = stroke painted under the fill, so only its outer half shows. */
export function applyTextEffects(layer) {
  const { object, effects } = layer;
  object.set({
    stroke: effects.outline.enabled ? effects.outline.color : null,
    strokeWidth: effects.outline.enabled ? effects.outline.width * 2 : 0,
    shadow: effects.shadow.enabled
      ? new Shadow({
        color: withAlpha(effects.shadow.color, SHADOW_OPACITY),
        offsetX: effects.shadow.offset,
        offsetY: effects.shadow.offset,
        blur: effects.shadow.blur,
        nonScaling: true,
      })
      : null,
  });
  object.initDimensions();
  object.setCoords();
  object.dirty = true;
}

/**
 * After a corner resize, turn the scale into font size and box width, so the
 * size shown in points stays true and the outline keeps its mm width.
 */
export function bakeTextScale(object) {
  const sx = object.scaleX;
  const sy = object.scaleY;
  if (Math.abs(sx - 1) < 1e-6 && Math.abs(sy - 1) < 1e-6) return;
  object.set({
    fontSize: object.fontSize * sy,
    width: object.width * sx,
    scaleX: 1,
    scaleY: 1,
  });
  object.initDimensions();
  object.setCoords();
}

/** Plain props for snapshots (and later, project files). */
export function textProps(object) {
  return {
    text: object.text,
    fontFamily: object.fontFamily,
    fontSize: object.fontSize,
    fill: object.fill,
    textAlign: object.textAlign,
    width: object.width,
    left: object.left,
    top: object.top,
    angle: object.angle,
  };
}

/** Layer list name: the first line of the text. */
export function textLayerName(object, fallback) {
  const first = object.text.split('\n')[0].trim();
  if (!first) return fallback;
  return first.length > 24 ? `${first.slice(0, 24)}…` : first;
}
