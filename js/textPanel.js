// Text group box: add text to a zone, then edit the selected text (or the
// top one): content, font, size in points, color, alignment, outline, shadow.
import { FONTS, fontStack } from './fonts.js';
import { FONT_SIZE_LIMITS_PT, TEXT_EFFECT_LIMITS } from './text.js';
import { formatMm } from './units.js';
import { t } from './strings.js';

const EFFECT_LIMITS = {
  'outline.width': TEXT_EFFECT_LIMITS.outlineWidth,
  'shadow.offset': TEXT_EFFECT_LIMITS.shadowOffset,
  'shadow.blur': TEXT_EFFECT_LIMITS.shadowBlur,
};

/**
 * handlers: {
 *   onAdd(zoneId)                     'front' | 'spine' | 'back'
 *   onRemove()
 *   onChange(patch, commit)           { text } | { fontFamily } | { sizePt } | { fill } | { textAlign }
 *   onEffect(path, value, commit)     e.g. ('outline.width', 0.3, true)
 * }
 */
export function initTextPanel(root, handlers) {
  const content = root.querySelector('#text-content');
  const font = root.querySelector('#text-font');
  const size = root.querySelector('#text-size');
  const color = root.querySelector('#text-color');
  const alignButtons = [...root.querySelectorAll('[data-align]')];
  const addButtons = [...root.querySelectorAll('[data-add-text]')];
  const remove = root.querySelector('#text-remove');
  const target = root.querySelector('#text-target');
  const effectInputs = [...root.querySelectorAll('[data-text-effect]')];
  const editors = [content, font, size, color, remove, ...alignButtons, ...effectInputs];
  let state = null;

  for (const { family } of FONTS) {
    const option = document.createElement('option');
    option.value = family;
    option.textContent = family;
    option.style.fontFamily = fontStack(family);
    font.append(option);
  }

  for (const button of addButtons) {
    button.addEventListener('click', () => handlers.onAdd(button.dataset.addText));
  }
  remove.addEventListener('click', handlers.onRemove);

  content.addEventListener('input', () => handlers.onChange({ text: content.value }, false));
  content.addEventListener('change', () => handlers.onChange({ text: content.value }, true));
  font.addEventListener('change', () => handlers.onChange({ fontFamily: font.value }, true));
  size.addEventListener('change', () => {
    const value = Number.parseFloat(size.value.replace(',', '.'));
    const { min, max } = FONT_SIZE_LIMITS_PT;
    if (Number.isFinite(value)) handlers.onChange({ sizePt: Math.min(max, Math.max(min, value)) }, true);
    if (state) size.value = formatMm(state.sizePt);
  });
  color.addEventListener('input', () => handlers.onChange({ fill: color.value }, false));
  color.addEventListener('change', () => handlers.onChange({ fill: color.value }, true));
  for (const button of alignButtons) {
    button.addEventListener('click', () => handlers.onChange({ textAlign: button.dataset.align }, true));
  }

  for (const input of effectInputs) {
    const path = input.dataset.textEffect;
    if (input.type === 'checkbox') {
      input.addEventListener('change', () => handlers.onEffect(path, input.checked, true));
    } else if (input.type === 'color') {
      input.addEventListener('input', () => handlers.onEffect(path, input.value, false));
      input.addEventListener('change', () => handlers.onEffect(path, input.value, true));
    } else {
      input.addEventListener('change', () => {
        const value = Number.parseFloat(input.value.replace(',', '.'));
        const { min, max } = EFFECT_LIMITS[path];
        if (Number.isFinite(value)) handlers.onEffect(path, Math.min(max, Math.max(min, value)), true);
        if (state) input.value = formatMm(readPath(state.effects, path));
      });
    }
  }

  return {
    /**
     * next: { name, text, fontFamily, sizePt, fill, textAlign, effects } | null
     * wrap: spine/back zones exist
     */
    sync(next, wrap) {
      state = next;
      for (const button of addButtons) button.disabled = button.dataset.addText !== 'front' && !wrap;
      for (const el of editors) el.disabled = !state;
      target.textContent = state ? t('images.editing', { name: state.name }) : '';
      if (!state) return;

      const focused = document.activeElement;
      if (focused !== content) content.value = state.text;
      if (focused !== size) size.value = formatMm(state.sizePt);
      if (focused !== color) color.value = state.fill;
      font.value = state.fontFamily;
      for (const button of alignButtons) {
        button.setAttribute('aria-pressed', String(button.dataset.align === state.textAlign));
      }
      for (const input of effectInputs) {
        if (focused === input) continue;
        const value = readPath(state.effects, input.dataset.textEffect);
        if (input.type === 'checkbox') input.checked = value;
        else if (input.type === 'color') input.value = value;
        else input.value = formatMm(value);
      }
    },
  };
}

function readPath(object, path) {
  return path.split('.').reduce((node, key) => node[key], object);
}
