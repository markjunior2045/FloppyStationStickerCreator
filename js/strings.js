// All UI strings live here so the app can be translated later.
// Elements with data-i18n="path.to.key" get their text from this table.

export const STRINGS = {
  appTitle: 'FloppyStation Sticker Creator',
  menu: {
    file: 'File',
    new: 'New',
    open: 'Open…',
    save: 'Save…',
    export: 'Export…',
    edit: 'Edit',
    undo: 'Undo',
    redo: 'Redo',
    view: 'View',
    zoomIn: 'Zoom in',
    zoomOut: 'Zoom out',
    actualSize: 'Actual size (100%)',
    fit: 'Fit to window',
    help: 'Help',
    about: 'About',
  },
  groups: {
    floppy: 'Floppy',
    images: 'Images',
    text: 'Text',
    style: 'Style',
    export: 'Export',
    notYet: 'Not available yet.',
  },
};

export function t(key) {
  const value = key.split('.').reduce((node, part) => node?.[part], STRINGS);
  if (typeof value !== 'string') {
    console.warn(`Missing UI string: ${key}`);
    return key;
  }
  return value;
}

export function applyStrings(root = document) {
  for (const el of root.querySelectorAll('[data-i18n]')) {
    el.textContent = t(el.dataset.i18n);
  }
  for (const el of root.querySelectorAll('[data-i18n-title]')) {
    el.title = t(el.dataset.i18nTitle);
  }
}
