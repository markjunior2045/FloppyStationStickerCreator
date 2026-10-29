// Floppy group box: label mode, corners, guides and the Advanced dimensions.
import { t } from './strings.js';
import { clampDimension } from './label.js';
import { formatMm } from './units.js';

/**
 * handlers: {
 *   onSettings(patch)          label settings changed
 *   onGuides({ name: bool })   guide visibility changed
 *   onResetDimensions()        "Reset to defaults" clicked
 * }
 */
export function initFloppyPanel(root, handlers) {
  const modeRadios = [...root.querySelectorAll('input[name="label-mode"]')];
  const cornerSelect = root.querySelector('#corner-style');
  const guideBoxes = [...root.querySelectorAll('input[data-guide]')];
  const dimInputs = [...root.querySelectorAll('input[data-dim]')];
  const advancedToggle = root.querySelector('#advanced-toggle');
  const advancedPanel = root.querySelector('#advanced-panel');
  let current = null;

  for (const radio of modeRadios) {
    radio.addEventListener('change', () => handlers.onSettings({ mode: radio.value }));
  }
  cornerSelect.addEventListener('change', () => handlers.onSettings({ corners: cornerSelect.value }));
  for (const box of guideBoxes) {
    box.addEventListener('change', () => handlers.onGuides({ [box.dataset.guide]: box.checked }));
  }

  // Commit on Enter or blur; invalid input reverts to the current value.
  for (const input of dimInputs) {
    input.addEventListener('change', () => {
      const key = input.dataset.dim;
      const value = Number.parseFloat(input.value.replace(',', '.'));
      if (Number.isFinite(value)) handlers.onSettings({ [key]: clampDimension(key, value) });
      input.value = formatMm(current[key]);
    });
  }
  root.querySelector('#reset-dimensions').addEventListener('click', handlers.onResetDimensions);

  function setAdvancedOpen(open) {
    advancedPanel.hidden = !open;
    advancedToggle.setAttribute('aria-expanded', String(open));
    advancedToggle.textContent = t(open ? 'floppy.advancedHide' : 'floppy.advancedShow');
  }
  advancedToggle.addEventListener('click', () => setAdvancedOpen(advancedPanel.hidden));
  setAdvancedOpen(false);

  return {
    sync(settings, guides) {
      current = settings;
      for (const radio of modeRadios) radio.checked = radio.value === settings.mode;
      cornerSelect.value = settings.corners;
      for (const box of guideBoxes) box.checked = guides[box.dataset.guide];
      root.querySelector('#guide-fold').disabled = settings.mode !== 'wrap';
      for (const input of dimInputs) {
        if (document.activeElement !== input) input.value = formatMm(settings[input.dataset.dim]);
      }
    },
  };
}
