// Reading user image files. Everything stays in the browser: files become
// data URLs (so projects can embed them later) and decoded <img> elements.

const decoded = new Map();

export function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

/** Decoded image for a data URL; the same URL is decoded only once. */
export function loadImage(src) {
  if (!decoded.has(src)) {
    decoded.set(src, new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => {
        decoded.delete(src);
        reject(new Error('Could not decode image'));
      };
      img.src = src;
    }));
  }
  return decoded.get(src);
}

export function isImageFile(file) {
  return file && file.type.startsWith('image/');
}

/** Opens the file picker and resolves with the chosen image file (or null). */
export function pickImageFile(accept = 'image/*') {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.addEventListener('change', () => resolve(input.files[0] ?? null), { once: true });
    input.addEventListener('cancel', () => resolve(null), { once: true });
    input.click();
  });
}

/** Makes an element accept dropped image files. */
export function acceptImageDrops(element, onFile) {
  element.addEventListener('dragover', (event) => {
    if (![...event.dataTransfer.items].some((item) => item.kind === 'file')) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
    element.classList.add('drop-target');
  });
  element.addEventListener('dragleave', (event) => {
    if (!element.contains(event.relatedTarget)) element.classList.remove('drop-target');
  });
  element.addEventListener('drop', (event) => {
    event.preventDefault();
    element.classList.remove('drop-target');
    const file = [...event.dataTransfer.files].find(isImageFile);
    if (file) onFile(file);
  });
}
