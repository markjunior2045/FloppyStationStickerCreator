// Images group box: background and logo slots.
import { acceptImageDrops, pickImageFile } from './images.js';
import { LOGO_EFFECT_LIMITS } from './logoEffects.js';
import { formatMm } from './units.js';

const NUMBER_LIMITS = {
  'outline.width': LOGO_EFFECT_LIMITS.outlineWidth,
  'shadow.offset': LOGO_EFFECT_LIMITS.shadowOffset,
  'shadow.blur': LOGO_EFFECT_LIMITS.shadowBlur,
};

/**
 * handlers: {
 *   onOpen(type, file)         a file was picked or dropped for 'background' | 'logo'
 *   onRemove(type)
 *   onBackgroundZoom(zoom, commit)   zoom >= 1; commit = slider released
 *   onBackgroundReset()
 *   onLogoEffect(path, value, commit)   e.g. ('outline.width', 0.5, true)
 * }
 */
export function initImagesPanel(root, handlers) {
  const slots = {
    background: root.querySelector('#background-slot'),
    logo: root.querySelector('#logo-slot'),
  };

  for (const [type, slot] of Object.entries(slots)) {
    slot.querySelector('[data-image-action="open"]').addEventListener('click', async () => {
      const file = await pickImageFile(type === 'logo' ? 'image/png,image/webp,image/gif,image/*' : 'image/*');
      if (file) handlers.onOpen(type, file);
    });
    slot.querySelector('[data-image-action="remove"]').addEventListener('click', () => handlers.onRemove(type));
    acceptImageDrops(slot, (file) => handlers.onOpen(type, file));
  }

  const zoom = root.querySelector('#bg-zoom');
  const zoomValue = root.querySelector('#bg-zoom-value');
  zoom.addEventListener('input', () => {
    zoomValue.textContent = `${zoom.value}%`;
    handlers.onBackgroundZoom(zoom.value / 100, false);
  });
  zoom.addEventListener('change', () => handlers.onBackgroundZoom(zoom.value / 100, true));
  root.querySelector('#bg-reset').addEventListener('click', handlers.onBackgroundReset);

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

  return {
    /** state: { background: { zoom } | null, logo: { effects } | null } */
    sync(state) {
      slots.logo.querySelector('[data-image-action="remove"]').disabled = !state.logo;
      effects = state.logo?.effects ?? null;
      for (const input of effectInputs) {
        input.disabled = !effects;
        if (!effects || document.activeElement === input) continue;
        const value = readPath(effects, input.dataset.effect);
        if (input.type === 'checkbox') input.checked = value;
        else if (input.type === 'color') input.value = value;
        else input.value = formatMm(value);
      }
      const bg = state.background;
      slots.background.querySelector('[data-image-action="remove"]').disabled = !bg;
      zoom.disabled = !bg;
      root.querySelector('#bg-reset').disabled = !bg;
      const percent = bg ? Math.round(bg.zoom * 100) : 100;
      if (document.activeElement !== zoom) zoom.value = String(percent);
      zoomValue.textContent = `${percent}%`;
    },
  };
}

function readPath(object, path) {
  return path.split('.').reduce((node, key) => node[key], object);
}
