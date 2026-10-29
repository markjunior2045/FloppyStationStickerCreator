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
  zoom: {
    fit: 'Fit',
    actual: '100%',
    in: '+',
    out: '−',
    status: 'Zoom: {percent}%',
    statusFit: 'Zoom: {percent}% (fit)',
  },
  status: {
    labelFront: '{format} floppy · front only {width} × {height} mm',
    labelWrap: '{format} floppy · wrap-around {width} × {height} mm (back {back} + spine {spine} + front {front})',
  },
  units: {
    mm: 'mm',
  },
  floppy: {
    labelType: 'Label',
    modeFront: 'Front only',
    modeWrap: 'Wrap-around (fold)',
    corners: 'Corners:',
    cornersSquare: 'Square',
    cornersTwo: '2 rounded (bottom)',
    cornersFour: '4 rounded',
    guides: 'Guides',
    guideSafety: 'Safety margin',
    guideBleed: 'Bleed',
    guideFold: 'Fold lines',
    advancedShow: 'Advanced ▸',
    advancedHide: 'Advanced ◂',
    advanced: 'Advanced',
    dimsWrap: 'Label size (varies by disk brand)',
    dimWidth: 'Width',
    dimFront: 'Front (fold)',
    dimSpine: 'Spine',
    dimBack: 'Back',
    dimFrontOnly: 'Front only height',
    dimRadius: 'Corner radius',
    resetDefaults: 'Reset to defaults',
  },
  images: {
    background: 'Background',
    logo: 'Logo',
    open: 'Open…',
    remove: 'Remove',
    zoom: 'Zoom',
    resetFraming: 'Reset framing',
    dropHint: 'Tip: drop an image on the canvas for the background, or on Logo for the logo.',
    loadError: 'Could not open that image.',
  },
  layers: {
    background: 'Background',
    logo: 'Logo',
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

// t('zoom.status', { percent: 100 }) fills {placeholders} from params.
export function t(key, params = {}) {
  const value = key.split('.').reduce((node, part) => node?.[part], STRINGS);
  if (typeof value !== 'string') {
    console.warn(`Missing UI string: ${key}`);
    return key;
  }
  return value.replace(/\{(\w+)\}/g, (match, name) => (name in params ? String(params[name]) : match));
}

export function applyStrings(root = document) {
  for (const el of root.querySelectorAll('[data-i18n]')) {
    el.textContent = t(el.dataset.i18n);
  }
  for (const el of root.querySelectorAll('[data-i18n-title]')) {
    el.title = t(el.dataset.i18nTitle);
  }
}
