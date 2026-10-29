// A4 sheet PDF: copies of the label raster placed at exact size in mm, with
// crop marks, fold marks and a calibration ruler. All units mm.
import { t } from './strings.js';
import { formatMm } from './units.js';

export const PAGE = { width: 210, height: 297 };
// Inside most printers' unprintable border, tight enough for 3 rows of wrap-around labels.
const MARGIN = 8;
const MARK = { gap: 1.5, length: 4, width: 0.15 };
const MARK_SPACE = MARK.gap + MARK.length + 0.5;
const RULER = { length: 50, height: 14 };
// Cut line drawn on the label itself: a black dash over a white line, so it
// shows on any background.
const CUT_LINE = { under: 0.35, over: 0.18, dash: [1.2, 0.8] };
// Bezier handle length for a quarter circle.
const ARC_K = 0.5523;

/** Where labels go on the sheet: bleed top-left of each copy. */
export function sheetLayout(geometry, copies = Infinity) {
  const { bleed } = geometry;
  const cellW = bleed.width + MARK_SPACE * 2;
  const cellH = bleed.height + MARK_SPACE * 2;
  const availW = PAGE.width - MARGIN * 2;
  const availH = PAGE.height - MARGIN * 2 - RULER.height;
  const cols = Math.max(0, Math.floor(availW / cellW));
  const rows = Math.max(0, Math.floor(availH / cellH));
  const max = cols * rows;
  const count = Math.max(0, Math.min(max, copies));
  const left = MARGIN + (availW - cols * cellW) / 2 + MARK_SPACE;
  const top = MARGIN + MARK_SPACE;
  const cells = Array.from({ length: count }, (_, i) => ({
    x: left + (i % cols) * cellW,
    y: top + Math.floor(i / cols) * cellH,
  }));
  return { cols, rows, max, cells };
}

/**
 * image: label raster covering geometry.bleed (from renderLabel).
 * cutLine: draw the exact cut path (rounded corners included) over each label.
 * Returns a PDF Blob.
 */
export function buildSheetPdf({ image, geometry, copies, dpi, title, cutLine = true, compress = true }) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait', compress });
  doc.setProperties({ title, creator: t('appTitle') });

  const { bleed, outline, folds } = geometry;
  const data = image.toDataURL('image/png');
  const layout = sheetLayout(geometry, copies);

  doc.setLineWidth(MARK.width);
  doc.setDrawColor(0);
  for (const cell of layout.cells) {
    // One embedded image, reused by alias for every copy.
    doc.addImage(data, 'PNG', cell.x, cell.y, bleed.width, bleed.height, 'label', 'FAST');

    const box = { x: cell.x, y: cell.y, width: bleed.width, height: bleed.height };
    const cut = {
      left: cell.x + (outline.x - bleed.x),
      top: cell.y + (outline.y - bleed.y),
    };
    cut.right = cut.left + outline.width;
    cut.bottom = cut.top + outline.height;
    drawCropMarks(doc, box, cut);
    drawFoldMarks(doc, box, folds.map((y) => cell.y + (y - bleed.y)));
    if (cutLine) drawCutLine(doc, { ...outline, x: cut.left, y: cut.top });
  }

  drawRuler(doc, {
    x: (PAGE.width - RULER.length) / 2,
    y: PAGE.height - MARGIN - 4,
    info: t('export.sheetInfo', {
      width: formatMm(outline.width),
      height: formatMm(outline.height),
      dpi,
    }),
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
  const ops = cutPathOps(rect);
  doc.setLineJoin('round');
  doc.setDrawColor(255);
  doc.setLineWidth(CUT_LINE.under);
  doc.path(ops);
  doc.stroke();
  doc.setDrawColor(0);
  doc.setLineWidth(CUT_LINE.over);
  doc.setLineDashPattern(CUT_LINE.dash, 0);
  doc.path(ops);
  doc.stroke();
  doc.setLineDashPattern([], 0);
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
