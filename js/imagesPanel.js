// Images group box: add backgrounds and logos (any number of each). The other
// buttons act on the "target" of each kind: the selected layer if it's of that
// kind, otherwise the top one.
import { acceptImageDrops, pickImageFile } from './images.js';
import { LOGO_EFFECT_LIMITS } from './logoEffects.js';
import { formatMm } from './units.js';
import { t } from './strings.js';

const NUMBER_LIMITS = {
  'outline.width': LOGO_EFFECT_LIMITS.outlineWidth,
  'shadow.offset': LOGO_EFFECT_LIMITS.shadowOffset,
  'shadow.blur': LOGO_EFFECT_LIMITS.shadowBlur,
};

/**
 * handlers: {
 *   onAdd(type, file)          a file was picked or dropped for 'background' | 'logo'
 *   onRemove(type)             remove the target of that type
 *   onFill(area)               cover 'label' | 'front' | 'back' with the target background
 *   onLogoEffect(path, value, commit)   e.g. ('outline.width', 0.5, true)
 * }
 */
export function initImagesPanel(root, handlers) {
  const slots = {
    background: root.querySelector('#background-slot'),
    logo: root.querySelector('#logo-slot'),
  };

  for (const [type, slot] of Object.entries(slots)) {
    slot.querySelector('[data-image-action="add"]').addEventListener('click', async () => {
      const file = await pickImageFile(type === 'logo' ? 'image/png,image/webp,image/gif,image/*' : 'image/*');
      if (file) handlers.onAdd(type, file);
    });
    slot.querySelector('[data-image-action="remove"]').addEventListener('click', () => handlers.onRemove(type));
    acceptImageDrops(slot, (file) => handlers.onAdd(type, file));
  }

  const fillButtons = [...root.querySelectorAll('[data-fill]')];
  for (const button of fillButtons) {
    button.addEventListener('click', () => handlers.onFill(button.dataset.fill));
  }

  const effectInputs = [...root.querySelectorAll('[data-effect]')];
  let effects = null;
  for (const input of effectInputs) {
    const path = input.dataset.effect;
    if (input.type === 'checkbox') {
      input.addEventListener('change', () => handlers.onLogoEffect(path, input.checked, true));
    } else if (input.type === 'color') {
      input.addEventListener('input', () => handlers.onLogoEffect(path, input.value, false));
      input.addEventListener('change', () => handlers.onLogoEffect(path, input.value, true));
    } else {
      // Commit on Enter or blur; invalid input reverts to the current value.
      input.addEventListener('change', () => {
        const value = Number.parseFloat(input.value.replace(',', '.'));
        const { min, max } = NUMBER_LIMITS[path];
        if (Number.isFinite(value)) handlers.onLogoEffect(path, Math.min(max, Math.max(min, value)), true);
        if (effects) input.value = formatMm(readPath(effects, path));
      });
    }
  }

  function syncTarget(type, target) {
    const slot = slots[type];
    slot.querySelector('[data-image-action="remove"]').disabled = !target;
    slot.querySelector('.slot-target').textContent = target ? t('images.editing', { name: target.name }) : '';
  }

  return {
    /** state: { background: { name } | null, logo: { name, effects } | null, wrap: bool } */
    sync(state) {
      syncTarget('background', state.background);
      syncTarget('logo', state.logo);

      for (const button of fillButtons) {
        button.disabled = !state.background || (button.dataset.fill !== 'label' && !state.wrap);
      }

      effects = state.logo?.effects ?? null;
      for (const input of effectInputs) {
        input.disabled = !effects;
        if (!effects || document.activeElement === input) continue;
        const value = readPath(effects, input.dataset.effect);
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
