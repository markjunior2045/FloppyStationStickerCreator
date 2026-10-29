// Background layer: an image framed "cover" style over the label's bleed area.
// It can be dragged and zoomed, but never leaves part of the bleed uncovered.
import { FabricImage, Point } from '../vendor/fabric-7.4.0/index.min.mjs';
import { LAYER_OBJECT_PROPS, newLayerId } from './layers.js';

export const BACKGROUND_MAX_ZOOM = 4;

export function coverScale(image, area) {
  return Math.max(area.width / image.width, area.height / image.height);
}

export function createBackgroundLayer({ image, src, name, area, id = newLayerId() }) {
  const scale = coverScale(image, area);
  const object = new FabricImage(image, {
    ...LAYER_OBJECT_PROPS,
    left: area.x + area.width / 2,
    top: area.y + area.height / 2,
    scaleX: scale,
    scaleY: scale,
    lockRotation: true,
    hasRotatingPoint: false,
  });
  object.setControlsVisibility({ mt: false, mb: false, ml: false, mr: false, mtr: false });
  return { id, type: 'background', name, src, image, object };
}

/** Keep the background covering the area: minimum scale and position limits. */
export function constrainBackground(object, area) {
  const min = coverScale(object, area);
  const max = min * BACKGROUND_MAX_ZOOM;
  const scale = Math.min(max, Math.max(min, object.scaleX));
  object.set({ scaleX: scale, scaleY: scale });

  const halfW = (object.width * scale) / 2;
  const halfH = (object.height * scale) / 2;
  const center = object.getCenterPoint();
  const x = clamp(center.x, area.x + area.width - halfW, area.x + halfW);
  const y = clamp(center.y, area.y + area.height - halfH, area.y + halfH);
  object.setPositionByOrigin(new Point(x, y), 'center', 'center');
  object.setCoords();
}

/** Zoom relative to the cover scale (1 = just covers the area), about the image center. */
export function backgroundZoom(object, area) {
  return object.scaleX / coverScale(object, area);
}

export function setBackgroundZoom(object, area, zoom) {
  const scale = coverScale(object, area) * zoom;
  object.set({ scaleX: scale, scaleY: scale });
  constrainBackground(object, area);
}

export function resetBackgroundFraming(object, area) {
  const scale = coverScale(object, area);
  object.set({ scaleX: scale, scaleY: scale });
  object.setPositionByOrigin(new Point(area.x + area.width / 2, area.y + area.height / 2), 'center', 'center');
  object.setCoords();
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
