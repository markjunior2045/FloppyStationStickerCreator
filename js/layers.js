// Layer store: the user's content (background, logo; text later), bottom to top.
// Each layer owns one Fabric object, clipped to the label's cut line.
import { createClipPath } from './labelView.js';

// Selection look shared by every layer, theme-neutral.
export const LAYER_OBJECT_PROPS = {
  originX: 'center',
  originY: 'center',
  borderColor: '#000080',
  cornerColor: '#ffffff',
  cornerStrokeColor: '#000080',
  cornerStyle: 'rect',
  cornerSize: 8,
  transparentCorners: false,
  borderScaleFactor: 1,
  lockScalingFlip: true,
};

let nextId = 1;
export const newLayerId = () => `layer-${nextId++}`;

/**
 * hooks: {
 *   below()  objects that stay under the layers (floppy, label base)
 *   above()  objects that stay over the layers (guides)
 *   onChange()  the list, order or visibility changed
 * }
 */
export function createLayerStore(canvas, hooks) {
  let layers = [];
  let clipRect = null;
  let interactive = true;

  function restack() {
    const order = [...hooks.below(), ...layers.map((layer) => layer.object), ...hooks.above()];
    order.forEach((object, index) => canvas.moveObjectTo(object, index));
    canvas.requestRenderAll();
  }

  function applyInteractivity(layer) {
    const on = interactive && layer.object.visible;
    layer.object.selectable = on;
    layer.object.evented = on;
  }

  function changed() {
    restack();
    hooks.onChange();
  }

  return {
    get all() { return [...layers]; },
    byId: (id) => layers.find((layer) => layer.id === id),
    byObject: (object) => layers.find((layer) => layer.object === object),
    byType: (type) => layers.filter((layer) => layer.type === type),

    add(layer, index = layers.length) {
      layer.object.clipPath = clipRect ? createClipPath(clipRect) : null;
      layers.splice(index, 0, layer);
      canvas.add(layer.object);
      applyInteractivity(layer);
      changed();
    },

    remove(id) {
      const layer = layers.find((l) => l.id === id);
      if (!layer) return;
      if (canvas.getActiveObject() === layer.object) canvas.discardActiveObject();
      layers = layers.filter((l) => l !== layer);
      canvas.remove(layer.object);
      changed();
    },

    clear() {
      canvas.discardActiveObject();
      canvas.remove(...layers.map((layer) => layer.object));
      layers = [];
      changed();
    },

    /** Moves a layer up (+1) or down (-1) in the stack. */
    move(id, delta) {
      const from = layers.findIndex((layer) => layer.id === id);
      const to = from + delta;
      if (from < 0 || to < 0 || to >= layers.length) return;
      const [layer] = layers.splice(from, 1);
      layers.splice(to, 0, layer);
      changed();
    },

    setVisible(id, visible) {
      const layer = layers.find((l) => l.id === id);
      if (!layer) return;
      layer.object.visible = visible;
      if (!visible && canvas.getActiveObject() === layer.object) canvas.discardActiveObject();
      applyInteractivity(layer);
      changed();
    },

    /** Clip every layer to a shape (the cut line, or one zone in the back view). */
    setClip(rect) {
      clipRect = rect;
      for (const layer of layers) layer.object.clipPath = createClipPath(rect);
      canvas.requestRenderAll();
    },

    setInteractive(on) {
      interactive = on;
      if (!on) canvas.discardActiveObject();
      layers.forEach(applyInteractivity);
    },

    restack,
  };
}
