// Maps the mm world onto the screen: zoom 1 = 100% = real size at 96 CSS px/inch.
// The canvas fills the scroll area and grows past it when zoomed in.
import { SCREEN_PX_PER_MM } from './units.js';

export const ZOOM_STEPS = [0.25, 0.33, 0.5, 0.67, 0.75, 1, 1.25, 1.5, 2, 3, 4, 6, 8];
const MIN_ZOOM = ZOOM_STEPS[0];
const MAX_ZOOM = ZOOM_STEPS[ZOOM_STEPS.length - 1];
const VIEW_MARGIN_MM = 5;

export function createViewport(canvas, scrollEl, getBounds, onChange = () => {}) {
  let mode = 'fit';
  let zoom = 1;
  let scale = SCREEN_PX_PER_MM;
  let offset = { x: 0, y: 0 };

  function available() {
    const style = getComputedStyle(scrollEl);
    return {
      width: scrollEl.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight),
      height: scrollEl.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom),
    };
  }

  function paddedBounds() {
    const b = getBounds();
    return {
      x: b.x - VIEW_MARGIN_MM,
      y: b.y - VIEW_MARGIN_MM,
      width: b.width + VIEW_MARGIN_MM * 2,
      height: b.height + VIEW_MARGIN_MM * 2,
    };
  }

  function fitZoom(avail, bounds) {
    const z = Math.min(
      avail.width / (bounds.width * SCREEN_PX_PER_MM),
      avail.height / (bounds.height * SCREEN_PX_PER_MM),
    );
    return clamp(z);
  }

  function layout(keepCenter = null) {
    const avail = available();
    if (avail.width <= 0 || avail.height <= 0) return;
    const bounds = paddedBounds();
    if (mode === 'fit') zoom = fitZoom(avail, bounds);

    scale = zoom * SCREEN_PX_PER_MM;
    const contentWidth = bounds.width * scale;
    const contentHeight = bounds.height * scale;
    const width = Math.max(Math.floor(avail.width), Math.ceil(contentWidth));
    const height = Math.max(Math.floor(avail.height), Math.ceil(contentHeight));
    offset = {
      x: (width - contentWidth) / 2 - bounds.x * scale,
      y: (height - contentHeight) / 2 - bounds.y * scale,
    };

    canvas.setDimensions({ width, height });
    canvas.setViewportTransform([scale, 0, 0, scale, offset.x, offset.y]);

    if (keepCenter) {
      scrollEl.scrollLeft = keepCenter.x * scale + offset.x - avail.width / 2;
      scrollEl.scrollTop = keepCenter.y * scale + offset.y - avail.height / 2;
    }
    onChange({ mode, zoom });
  }

  // World point (mm) at the center of the visible area.
  function viewCenter() {
    const avail = available();
    return {
      x: (scrollEl.scrollLeft + avail.width / 2 - offset.x) / scale,
      y: (scrollEl.scrollTop + avail.height / 2 - offset.y) / scale,
    };
  }

  function setZoom(value) {
    const center = viewCenter();
    mode = 'manual';
    zoom = clamp(value);
    layout(center);
  }

  new ResizeObserver(() => layout()).observe(scrollEl);

  return {
    layout,
    fit() { mode = 'fit'; layout(); },
    setZoom,
    zoomIn() { setZoom(ZOOM_STEPS.find((step) => step > zoom * 1.001) ?? MAX_ZOOM); },
    zoomOut() { setZoom(ZOOM_STEPS.findLast((step) => step < zoom * 0.999) ?? MIN_ZOOM); },
    get zoom() { return zoom; },
    get mode() { return mode; },
  };
}

function clamp(z) {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z));
}
