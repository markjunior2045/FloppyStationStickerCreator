// Style group box: print effect sliders and presets.
import { EFFECT_LIMITS, PRESETS } from './printEffects.js';
import { t } from './strings.js';

/**
 * handlers: {
 *   onEffects(patch, commit)   e.g. ({ grain: 30 }, false) while dragging
 * }
 */
export function initStylePanel(root, handlers) {
  const preset = root.querySelector('#effect-preset');
  const sliders = [...root.querySelectorAll('input[data-effect-key]')];

  for (const key of [...Object.keys(PRESETS), 'custom']) {
    const option = document.createElement('option');
    option.value = key;
    option.textContent = t(`style.presets.${key}`);
    if (key === 'custom') option.disabled = true;
    preset.append(option);
  }
  preset.addEventListener('change', () => {
    if (PRESETS[preset.value]) handlers.onEffects({ ...PRESETS[preset.value] }, true);
  });

  for (const slider of sliders) {
    const key = slider.dataset.effectKey;
    const { min, max, step } = EFFECT_LIMITS[key];
    Object.assign(slider, { min, max, step });
    slider.addEventListener('input', () => handlers.onEffects({ [key]: Number(slider.value) }, false));
    slider.addEventListener('change', () => handlers.onEffects({ [key]: Number(slider.value) }, true));
  }

  return {
    sync(effects) {
      for (const slider of sliders) {
        const key = slider.dataset.effectKey;
        if (document.activeElement !== slider) slider.value = String(effects[key]);
        root.querySelector(`[data-effect-value="${key}"]`).textContent = key === 'border'
          ? t('style.mm', { value: effects[key].toFixed(1) })
          : `${Math.round(effects[key])}%`;
      }
      const match = Object.entries(PRESETS).find(([, values]) =>
        Object.keys(values).every((key) => Math.abs(values[key] - effects[key]) < 1e-6));
      preset.value = match ? match[0] : 'custom';
    },
  };
}
