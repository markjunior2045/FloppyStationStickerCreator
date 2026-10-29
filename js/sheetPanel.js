// Sheet queue (in the Export group): designs waiting to be printed together
// on one A4 sheet. Each entry keeps a document snapshot, rendered at export.
import { t } from './strings.js';

/**
 * handlers: {
 *   onAddCurrent()
 *   onAddProject()
 *   onRemove(id)
 *   onOpen(id)        load the entry into the editor
 * }
 */
export function initSheetPanel(root, handlers) {
  const list = root.querySelector('.sheet-list');
  const remove = root.querySelector('[data-sheet-action="remove"]');
  const open = root.querySelector('[data-sheet-action="open"]');
  const count = root.querySelector('#sheet-count');
  let selected = null;
  let entries = [];

  root.querySelector('[data-sheet-action="add"]').addEventListener('click', handlers.onAddCurrent);
  root.querySelector('[data-sheet-action="add-project"]').addEventListener('click', handlers.onAddProject);
  remove.addEventListener('click', () => selected && handlers.onRemove(selected));
  open.addEventListener('click', () => selected && handlers.onOpen(selected));
  list.addEventListener('click', (event) => {
    const row = event.target.closest('[data-entry-id]');
    if (!row) return;
    selected = row.dataset.entryId;
    render(entries);
  });

  function render(next) {
    entries = next;
    if (!entries.some((entry) => entry.id === selected)) selected = null;
    list.replaceChildren(...entries.map((entry, i) => {
      const row = document.createElement('li');
      row.role = 'option';
      row.dataset.entryId = entry.id;
      row.setAttribute('aria-selected', String(entry.id === selected));
      row.textContent = `${i + 1}. ${entry.name}`;
      return row;
    }));
    if (entries.length === 0) {
      const empty = document.createElement('li');
      empty.className = 'layer-empty';
      empty.textContent = t('sheet.empty');
      list.append(empty);
    }
    count.textContent = t('sheet.count', { count: entries.length });
    remove.disabled = !selected;
    open.disabled = !selected;
  }

  return { render };
}
