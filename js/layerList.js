// Explorer-style layer list: top layer first. Click selects, the checkbox
// shows/hides, the buttons reorder or delete the selected layer.
import { t } from './strings.js';

/**
 * handlers: {
 *   onSelect(id)
 *   onVisible(id, visible)
 *   onMove(id, delta)    +1 = up (toward the top)
 *   onDelete(id)
 * }
 */
export function initLayerList(root, handlers) {
  const list = root.querySelector('.layer-list');
  const up = root.querySelector('[data-layer-action="up"]');
  const down = root.querySelector('[data-layer-action="down"]');
  const remove = root.querySelector('[data-layer-action="delete"]');
  let selectedId = null;

  list.addEventListener('click', (event) => {
    if (event.target.closest('input, label')) return;
    const row = event.target.closest('[data-layer-id]');
    if (row) handlers.onSelect(row.dataset.layerId);
  });
  list.addEventListener('change', (event) => {
    const box = event.target.closest('input[type="checkbox"]');
    if (box) handlers.onVisible(box.closest('[data-layer-id]').dataset.layerId, box.checked);
  });
  up.addEventListener('click', () => selectedId && handlers.onMove(selectedId, +1));
  down.addEventListener('click', () => selectedId && handlers.onMove(selectedId, -1));
  remove.addEventListener('click', () => selectedId && handlers.onDelete(selectedId));

  return {
    /** layers: bottom to top, as in the store. */
    render(layers, selected) {
      selectedId = selected;
      list.replaceChildren();
      if (layers.length === 0) {
        const empty = document.createElement('li');
        empty.className = 'layer-empty';
        empty.textContent = t('layerList.empty');
        list.append(empty);
      }
      [...layers].reverse().forEach((layer) => {
        const row = document.createElement('li');
        row.role = 'option';
        row.dataset.layerId = layer.id;
        row.setAttribute('aria-selected', String(layer.id === selected));

        const box = document.createElement('input');
        box.type = 'checkbox';
        box.id = `visible-${layer.id}`;
        box.checked = layer.object.visible;
        box.title = t('layerList.visible');
        const boxLabel = document.createElement('label');
        boxLabel.htmlFor = box.id;
        boxLabel.title = t('layerList.visible');

        const name = document.createElement('span');
        name.className = 'layer-name';
        name.textContent = layer.name;

        row.append(box, boxLabel, name);
        list.append(row);
      });

      const index = layers.findIndex((layer) => layer.id === selected);
      up.disabled = index < 0 || index === layers.length - 1;
      down.disabled = index <= 0;
      remove.disabled = index < 0;
    },
  };
}
