// SVG path builders for shapes in mm.

const CORNER_ORDER = ['top-left', 'top-right', 'bottom-right', 'bottom-left'];

/**
 * Rectangle path with a per-corner treatment, its top-left at (x, y).
 * corners: { 'top-left': { type: 'round' | 'chamfer' | 'square', size }, ... }
 * Missing corners are square. Round corners are true circular arcs.
 */
export function rectPath(width, height, corners = {}, x = 0, y = 0) {
  const c = Object.fromEntries(CORNER_ORDER.map((name) => {
    const corner = corners[name];
    const size = corner && corner.type !== 'square' ? corner.size : 0;
    return [name, { type: size > 0 ? corner.type : 'square', size }];
  }));

  const p = (px, py) => `${px + x} ${py + y}`;
  const turn = ({ type, size }, px, py) =>
    type === 'round' ? `A ${size} ${size} 0 0 1 ${p(px, py)}` : `L ${p(px, py)}`;

  const tl = c['top-left'];
  const tr = c['top-right'];
  const br = c['bottom-right'];
  const bl = c['bottom-left'];

  return [
    `M ${p(tl.size, 0)}`,
    `L ${p(width - tr.size, 0)}`, turn(tr, width, tr.size),
    `L ${p(width, height - br.size)}`, turn(br, width - br.size, height),
    `L ${p(bl.size, height)}`, turn(bl, 0, height - bl.size),
    `L ${p(0, tl.size)}`, turn(tl, tl.size, 0),
    'Z',
  ].join(' ');
}

export function allCorners(type, size) {
  return Object.fromEntries(CORNER_ORDER.map((name) => [name, { type, size }]));
}
