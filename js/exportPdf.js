// A4 sheet PDF: label rasters (copies of one, or several designs) placed at
// exact size in mm, with crop marks, fold marks and a calibration ruler.
// All units mm.
import { t } from './strings.js';
import { formatMm } from './units.js';

export const PAGE = { width: 210, height: 297 };
// Inside most printers' unprintable border, tight enough for 3 rows of wrap-around labels.
const MARGIN = 8;
const MARK = { gap: 1.5, length: 4, width: 0.15 };
const MARK_SPACE = MARK.gap + MARK.length + 0.5;
const RULER = { length: 50, height: 14 };
// Cut and fold lines drawn on the label itself: a thin black line over a
// white one, so they show on any background. Solid, which looks cleaner than
// dashes once the label is cut and folded (user test).
const CUT_LINE = { under: 0.35, over: 0.15 };
const FOLD_LINE = { under: 0.3, over: 0.12 };
// Bezier handle length for a quarter circle.
const ARC_K = 0.5523;

/** How many copies of one label fit on a sheet (for the export dialog). */
export function sheetLayout(geometry) {
  const { cols, rows } = gridFor(cellSize(geometry));
  return { cols, rows, max: cols * rows };
}

function cellSize({ bleed }) {
  return { width: bleed.width + MARK_SPACE * 2, height: bleed.height + MARK_SPACE * 2 };
}

const AVAIL = {
  width: PAGE.width - MARGIN * 2,
  height: PAGE.height - MARGIN * 2 - RULER.height,
};

function gridFor(cell) {
  return {
    cols: Math.max(0, Math.floor(AVAIL.width / cell.width)),
    rows: Math.max(0, Math.floor(AVAIL.height / cell.height)),
  };
}

/**
 * Shelf packing for labels of any size: left to right in rows, rows top to
 * bottom, a new page when the next row doesn't fit; each row is centered.
 * Returns pages of [{ index, x, y }] (bleed top-left in page mm).
 */
export function packLabels(geometries) {
  const pages = [];
  let page = [];
  let row = [];
  let rowWidth = 0;
  let rowHeight = 0;
  let y = 0;

  const closeRow = () => {
    const left = MARGIN + (AVAIL.width - rowWidth) / 2;
    let x = left;
    for (const item of row) {
      page.push({ index: item.index, x: x + MARK_SPACE, y: MARGIN + y + MARK_SPACE });
      x += item.width;
    }
    y += rowHeight;
    row = [];
    rowWidth = 0;
    rowHeight = 0;
  };

  geometries.forEach((geometry, index) => {
    const cell = cellSize(geometry);
    if (rowWidth + cell.width > AVAIL.width && row.length) closeRow();
    if (y + Math.max(rowHeight, cell.height) > AVAIL.height && (row.length || page.length)) {
      if (row.length) closeRow();
      pages.push(page);
      page = [];
      y = 0;
    }
    row.push({ index, width: cell.width });
    rowWidth += cell.width;
    rowHeight = Math.max(rowHeight, cell.height);
  });
  if (row.length) closeRow();
  if (page.length) pages.push(page);
  return pages;
}

/**
 * labels: [{ image, geometry }] placed once each, in order (repeat an entry
 * for copies). image: raster covering geometry.bleed (from renderLabel).
 * cutLine: draw the exact cut path (rounded corners included) over each label.
 * foldLines: draw the fold lines across each label (wrap-around).
 * Returns a PDF Blob; more pages are added when the labels don't fit on one.
 */
export function buildSheetPdf({
  labels, dpi, title, cutLine = true, foldLines = true, compress = true,
}) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait', compress });
  doc.setProperties({ title, creator: t('appTitle') });

  // Each distinct raster is embedded once and reused by alias.
  const aliases = new Map();
  const imageData = (image) => {
    if (!aliases.has(image)) aliases.set(image, { alias: `label-${aliases.size}`, data: image.toDataURL('image/png') });
    return aliases.get(image);
  };

  const pages = packLabels(labels.map((label) => label.geometry));
  const single = new Set(labels.map((label) => label.image)).size === 1;
  const { outline: firstOutline } = labels[0].geometry;
  const info = single
    ? t('export.sheetInfo', { width: formatMm(firstOutline.width), height: formatMm(firstOutline.height), dpi })
    : t('export.sheetInfoMixed', { count: labels.length, dpi });

  pages.forEach((placements, pageIndex) => {
    if (pageIndex > 0) doc.addPage('a4', 'portrait');
    doc.setLineWidth(MARK.width);
    doc.setDrawColor(0);
    for (const { index, x, y } of placements) {
      const { image, geometry } = labels[index];
      const { bleed, outline, folds } = geometry;
      const { alias, data } = imageData(image);
      doc.addImage(data, 'PNG', x, y, bleed.width, bleed.height, alias, 'FAST');

      const box = { x, y, width: bleed.width, height: bleed.height };
      const cut = { left: x + (outline.x - bleed.x), top: y + (outline.y - bleed.y) };
      cut.right = cut.left + outline.width;
      cut.bottom = cut.top + outline.height;
      drawCropMarks(doc, box, cut);
      drawFoldMarks(doc, box, folds.map((fy) => y + (fy - bleed.y)));
      if (foldLines) {
        for (const fy of folds) drawFoldLine(doc, cut.left, cut.right, y + (fy - bleed.y));
      }
      if (cutLine) drawCutLine(doc, { ...outline, x: cut.left, y: cut.top });
    }
    drawRuler(doc, { x: (PAGE.width - RULER.length) / 2, y: PAGE.height - MARGIN - 4, info });
  });

  return doc.output('blob');
}

// Short lines on the cut lines' extensions, kept outside the bleed.
function drawCropMarks(doc, box, cut) {
  const leftOut = box.x - MARK.gap;
  const rightOut = box.x + box.width + MARK.gap;
  const topOut = box.y - MARK.gap;
  const bottomOut = box.y + box.height + MARK.gap;
  for (const y of [cut.top, cut.bottom]) {
    doc.line(leftOut - MARK.length, y, leftOut, y);
    doc.line(rightOut, y, rightOut + MARK.length, y);
  }
  for (const x of [cut.left, cut.right]) {
    doc.line(x, topOut - MARK.length, x, topOut);
    doc.line(x, bottomOut, x, bottomOut + MARK.length);
  }
}

function drawCutLine(doc, rect) {
  drawTwoTone(doc, cutPathOps(rect), CUT_LINE);
}

function drawFoldLine(doc, left, right, y) {
  drawTwoTone(doc, [{ op: 'm', c: [left, y] }, { op: 'l', c: [right, y] }], FOLD_LINE);
}

// White line with a black one on top: visible on any background.
function drawTwoTone(doc, ops, style) {
  doc.setLineJoin('round');
  doc.setDrawColor(255);
  doc.setLineWidth(style.under);
  doc.path(ops);
  doc.stroke();
  doc.setDrawColor(0);
  doc.setLineWidth(style.over);
  doc.path(ops);
  doc.stroke();
  doc.setLineWidth(MARK.width);
  doc.setLineJoin('miter');
}

// Outline path in page mm, clockwise from the top-left corner's end.
// Round corners become cubic Bezier quarter circles.
function cutPathOps({ x, y, width: w, height: h, corners }) {
  const r = (name) => (corners[name]?.type === 'round' ? corners[name].size : 0);
  const tl = r('top-left');
  const tr = r('top-right');
  const br = r('bottom-right');
  const bl = r('bottom-left');
  const k = ARC_K;
  const ops = [{ op: 'm', c: [x + tl, y] }, { op: 'l', c: [x + w - tr, y] }];
  if (tr) ops.push({ op: 'c', c: [x + w - tr + k * tr, y, x + w, y + tr - k * tr, x + w, y + tr] });
  ops.push({ op: 'l', c: [x + w, y + h - br] });
  if (br) ops.push({ op: 'c', c: [x + w, y + h - br + k * br, x + w - br + k * br, y + h, x + w - br, y + h] });
  ops.push({ op: 'l', c: [x + bl, y + h] });
  if (bl) ops.push({ op: 'c', c: [x + bl - k * bl, y + h, x, y + h - bl + k * bl, x, y + h - bl] });
  ops.push({ op: 'l', c: [x, y + tl] });
  if (tl) ops.push({ op: 'c', c: [x, y + tl - k * tl, x + tl - k * tl, y, x + tl, y] });
  ops.push({ op: 'h', c: [] });
  return ops;
}

// Dashed marks beside the label at each fold line.
function drawFoldMarks(doc, box, ys) {
  if (ys.length === 0) return;
  doc.setLineDashPattern([0.8, 0.6], 0);
  const leftOut = box.x - MARK.gap;
  const rightOut = box.x + box.width + MARK.gap;
  for (const y of ys) {
    doc.line(leftOut - MARK.length, y, leftOut, y);
    doc.line(rightOut, y, rightOut + MARK.length, y);
  }
  doc.setLineDashPattern([], 0);
}

function drawRuler(doc, { x, y, info }) {
  doc.setLineWidth(0.2);
  doc.line(x, y, x + RULER.length, y);
  for (let mm = 0; mm <= RULER.length; mm += 5) {
    const tick = mm % 10 === 0 ? 2.5 : 1.5;
    doc.line(x + mm, y, x + mm, y - tick);
  }
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text(t('export.rulerNote', { length: RULER.length }), PAGE.width / 2, y - 4, { align: 'center' });
  doc.text(info, PAGE.width / 2, y - 7.5, { align: 'center' });
  doc.setLineWidth(MARK.width);
}
