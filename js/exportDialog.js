// "Save As"-style export window: file name, type, resolution, copies, a
// print-at-100% reminder and a progress bar while exporting.
import { t } from './strings.js';

/**
 * handlers: {
 *   maxCopies()                              copies that fit on an A4 sheet
 *   hasFolds()                               the label has fold lines (wrap-around)
 *   run({ type, dpi, copies, cutLine, foldLines, filename }, onProgress)   async; onProgress(0..1, label)
 * }
 */
export function initExportDialog(root, handlers) {
  const form = root.querySelector('form');
  const filename = root.querySelector('#export-filename');
  const type = root.querySelector('#export-type');
  const dpi = root.querySelector('#export-dpi');
  const copies = root.querySelector('#export-copies');
  const copiesMax = root.querySelector('#export-copies-max');
  const copiesRow = root.querySelector('#export-copies-row');
  const cutLine = root.querySelector('#export-cutline');
  const foldLines = root.querySelector('#export-foldlines');
  const progress = root.querySelector('.progress');
  const progressBar = root.querySelector('.progress-bar');
  const status = root.querySelector('#export-status');
  let busy = false;

  function syncType() {
    const pdf = type.value === 'pdf';
    copiesRow.hidden = !pdf;
    root.querySelector('#export-copies-label').hidden = !pdf;
    root.querySelector('#export-cutline-row').hidden = !pdf;
    root.querySelector('#export-foldlines-row').hidden = !pdf || !handlers.hasFolds();
    const max = handlers.maxCopies();
    copiesMax.textContent = t('exportDialog.copiesMax', { max });
    const value = Number.parseInt(copies.value, 10);
    copies.value = String(Math.min(max, Math.max(1, Number.isFinite(value) ? value : max)));
  }

  function setProgress(fraction, label) {
    progressBar.style.width = `${Math.round(fraction * 100)}%`;
    status.textContent = label;
  }

  function close() {
    if (busy) return;
    root.hidden = true;
  }

  type.addEventListener('change', syncType);
  copies.addEventListener('change', syncType);
  root.querySelector('[aria-label="Close"]').addEventListener('click', close);
  root.querySelector('#export-cancel').addEventListener('click', close);
  root.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') close();
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (busy) return;
    busy = true;
    for (const el of form.elements) el.disabled = true;
    progress.hidden = false;
    setProgress(0, t('exportDialog.working'));
    try {
      const name = (filename.value.trim() || 'floppy-label').replace(/[\\/:*?"<>|]+/g, '-');
      await handlers.run({
        type: type.value,
        dpi: Number(dpi.value),
        copies: Number.parseInt(copies.value, 10),
        cutLine: cutLine.checked,
        foldLines: foldLines.checked,
        filename: name,
      }, setProgress);
      setProgress(1, t('exportDialog.done'));
      busy = false;
      setTimeout(close, 600);
    } catch (error) {
      console.error(error);
      status.textContent = t('exportDialog.failed');
      busy = false;
    } finally {
      for (const el of form.elements) el.disabled = false;
    }
  });

  return {
    open() {
      root.hidden = false;
      progress.hidden = true;
      status.textContent = '';
      syncType();
      filename.focus();
      filename.select();
    },
  };
}
