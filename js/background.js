// Background layer: an image that starts covering an area of the label
// (the whole label, the front or the back) and is then moved, resized and
// rotated freely, like a logo.
import { FabricImage, Point } from '../vendor/fabric-7.4.0/index.min.mjs';
import { LAYER_OBJECT_PROPS, newLayerId } from './layers.js';

export function coverScale(image, area) {
  return Math.max(area.width / image.width, area.height / image.height);
}

export function createBackgroundLayer({ image, src, name, area, id = newLayerId() }) {
  const object = new FabricImage(image, { ...LAYER_OBJECT_PROPS });
  coverArea(object, area);
  return { id, type: 'background', name, src, image, object };
}

/** Scale (keeping proportions, no rotation) and center the image so it covers the area. */
export function coverArea(object, area) {
  const scale = coverScale(object, area);
  object.set({ scaleX: scale, scaleY: scale, angle: 0, flipX: false, flipY: false });
  object.setPositionByOrigin(new Point(area.x + area.width / 2, area.y + area.height / 2), 'center', 'center');
  object.setCoords();
}
