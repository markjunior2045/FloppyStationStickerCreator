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
    reset: 'Reset…',
    view: 'View',
    zoomIn: 'Zoom in',
    zoomOut: 'Zoom out',
    actualSize: 'Actual size (100%)',
    fit: 'Fit to window',
    sideFront: 'Disk front (edit)',
    sideBack: 'Disk back (preview)',
    help: 'Help',
    about: 'About',
  },
  export: {
    sheetInfo: '3.5" floppy label {width} x {height} mm - {dpi} dpi - FloppyStation Sticker Creator',
    rulerNote: 'Calibration: this line must measure exactly {length} mm. Print at 100% / Actual size, not "Fit to page".',
  },
  exportDialog: {
    title: 'Save As',
    filename: 'File name:',
    type: 'Save as type:',
    typePdf: 'PDF - A4 sheet, actual size (*.pdf)',
    typePng: 'PNG image, label only (*.png)',
    resolution: 'Resolution:',
    dpi300: '300 dpi',
    dpi600: '600 dpi (small text)',
    copies: 'Copies:',
    copiesMax: 'of {max} per sheet',
    cutLine: 'Draw the cut line on the labels (follows the corners)',
    foldLines: 'Draw the fold lines on the labels',
    printNote: 'Print at 100% / "Actual size". Don\'t use "Fit to page". After printing, the ruler at the bottom of the sheet must measure 50 mm.',
    save: 'Save',
    cancel: 'Cancel',
    working: 'Preparing…',
    rendering: 'Rendering label at {dpi} dpi…',
    encoding: 'Writing file…',
    done: 'Done.',
    failed: 'Export failed. See the browser console for details.',
    groupHint: 'PDF on an A4 sheet at actual size, or a PNG of the label.',
  },
  edit: {
    resetConfirm: 'Start over? This removes all layers and restores the default label. You can undo it.',
  },
  side: {
    front: 'Front',
    back: 'Back',
    backHint: 'See the disk\'s back with the folded label (wrap-around only)',
    readOnly: 'Back view: read-only',
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
    add: 'Add…',
    remove: 'Remove',
    editing: 'Selected: {name}',
    fill: 'Fill:',
    fillLabel: 'Label',
    fillFront: 'Front',
    fillBack: 'Back',
    fillHint: 'Resize the selected background to cover this area (including the bleed). Front and Back also keep it inside that area.',
    outline: 'Outline',
    outlineWidth: 'Outline width (mm)',
    shadow: 'Shadow',
    shadowOffset: 'Shadow offset (mm)',
    shadowBlur: 'Blur',
    color: 'Color',
    dropHint: 'Tip: drop an image on the canvas to add a background, or on Logo to add a logo. Remove, Fill and the effects act on the selected one.',
    loadError: 'Could not open that image.',
  },
  layers: {
    background: 'Background',
    logo: 'Logo',
    text: 'Text',
  },
  textPanel: {
    add: 'Add:',
    front: 'Front',
    spine: 'Spine',
    back: 'Back',
    contentHint: 'Text content (you can also double-click the text on the canvas)',
    font: 'Font:',
    size: 'Size:',
    pt: 'pt',
    color: 'Color:',
    left: 'Left',
    center: 'Center',
    right: 'Right',
    hint: 'Spine text: keep it short and centered, about 8 pt. Back text is edited upright and printed turned for the fold.',
  },
  style: {
    preset: 'Preset:',
    border: 'White border',
    fade: 'Fade',
    darken: 'Darken',
    grain: 'Grain',
    mm: '{value} mm',
    hint: 'Effects cover the whole label and print exactly as shown.',
    presets: {
      none: 'None',
      clean: 'Clean print',
      shareware90s: '90s Shareware',
      fadedBox: 'Faded box art',
      thriftStore: 'Thrift store find',
      custom: 'Custom',
    },
  },
  layerList: {
    empty: 'No layers yet.',
    zone: { front: 'front', spine: 'spine', back: 'back' },
    visible: 'Show / hide',
    up: 'Up',
    down: 'Down',
    delete: 'Delete',
  },
  groups: {
    floppy: 'Floppy',
    images: 'Images',
    layers: 'Layers',
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
