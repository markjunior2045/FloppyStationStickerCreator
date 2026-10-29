// Images group box: background and logo slots.
import { acceptImageDrops, pickImageFile } from './images.js';

/**
 * handlers: {
 *   onOpen(type, file)         a file was picked or dropped for 'background' | 'logo'
 *   onRemove(type)
 *   onBackgroundZoom(zoom, commit)   zoom >= 1; commit = slider released
 *   onBackgroundReset()
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

  return {
    /** state: { background: { zoom } | null, logo: {} | null } */
    sync(state) {
      slots.logo.querySelector('[data-image-action="remove"]').disabled = !state.logo;
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
