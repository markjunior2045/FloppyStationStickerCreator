// Offscreen render of the label at print resolution: the bleed area as one
// raster, laid out as the physical strip (back zone turned 180°).
import { StaticCanvas } from '../vendor/fabric-7.4.0/index.min.mjs';
import { pxPerMm } from './units.js';
import { createClipPath } from './labelView.js';

/**
 * items: [{ object, clip }] bottom to top: the label base and the layers.
 * clip: null = no clip (runs into the bleed), or rect(s) in world mm.
 * Returns a <canvas> covering geometry.bleed at `dpi`.
 */
export async function renderLabel({ items, geometry, dpi, onProgress = () => {} }) {
  // Text layers (Phase 5) need their fonts before rasterizing.
  await document.fonts.ready;

  const scale = pxPerMm(dpi);
  const area = geometry.bleed;
  const width = Math.round(area.width * scale);
  const height = Math.round(area.height * scale);

  const staticCanvas = new StaticCanvas(undefined, {
    width,
    height,
    enableRetinaScaling: false,
    renderOnAddRemove: false,
    backgroundColor: '#ffffff',
  });
  staticCanvas.setViewportTransform([scale, 0, 0, scale, -area.x * scale, -area.y * scale]);

  // Clones, so the editor is untouched. No caching: Fabric caps cache size,
  // which would blur large renders.
  const visible = items.filter(({ object }) => object.visible);
  for (const [i, { object, clip }] of visible.entries()) {
    const clone = await object.clone();
    clone.set({ clipPath: clip ? createClipPath(clip) : null, objectCaching: false });
    staticCanvas.add(clone);
    onProgress((i + 1) / visible.length);
  }
  staticCanvas.renderAll();

  const flat = copyCanvas(staticCanvas.getElement());
  staticCanvas.dispose();

  const back = geometry.content.find((zone) => zone.id === 'back');
  return back ? turnBackZone(flat, back, area, scale) : flat;
}

/**
 * The back is edited in reading orientation; on the strip it must be upside
 * down so it reads correctly after folding over the top edge. Turn the region
 * from the bleed's top edge down to the back/spine fold 180° about the back
 * zone's center (its far-end bleed comes from just past the fold, which is
 * cut off anyway).
 */
function turnBackZone(source, zone, area, scale) {
  const out = copyCanvas(source);
  const ctx = out.getContext('2d');
  const foldY = (zone.y + zone.height - area.y) * scale;
  const cx = (zone.x + zone.width / 2 - area.x) * scale;
  const cy = (zone.y + zone.height / 2 - area.y) * scale;

  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, out.width, foldY);
  ctx.clip();
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, out.width, foldY);
  ctx.translate(cx, cy);
  ctx.rotate(Math.PI);
  ctx.translate(-cx, -cy);
  ctx.drawImage(source, 0, 0);
  ctx.restore();
  return out;
}

function copyCanvas(source) {
  const canvas = document.createElement('canvas');
  canvas.width = source.width;
  canvas.height = source.height;
  canvas.getContext('2d').drawImage(source, 0, 0);
  return canvas;
}
