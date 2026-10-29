// SVG path builders for shapes in mm.

const CORNER_ORDER = ['top-left', 'top-right', 'bottom-right', 'bottom-left'];

/**
 * Rectangle path with a per-corner treatment.
 * corners: { 'top-left': { type: 'round' | 'chamfer' | 'square', size }, ... }
 * Missing corners are square. Round corners are true circular arcs.
 */
export function rectPath(width, height, corners = {}) {
  const c = Object.fromEntries(CORNER_ORDER.map((name) => {
    const corner = corners[name];
    const size = corner && corner.type !== 'square' ? corner.size : 0;
    return [name, { type: size > 0 ? corner.type : 'square', size }];
  }));

  const turn = ({ type, size }, x, y) =>
    type === 'round' ? `A ${size} ${size} 0 0 1 ${x} ${y}` : `L ${x} ${y}`;

  const tl = c['top-left'];
  const tr = c['top-right'];
  const br = c['bottom-right'];
  const bl = c['bottom-left'];

  return [
    `M ${tl.size} 0`,
    `L ${width - tr.size} 0`, turn(tr, width, tr.size),
    `L ${width} ${height - br.size}`, turn(br, width - br.size, height),
    `L ${bl.size} ${height}`, turn(bl, 0, height - bl.size),
    `L 0 ${tl.size}`, turn(tl, tl.size, 0),
    'Z',
  ].join(' ');
}

export function allCorners(type, size) {
  return Object.fromEntries(CORNER_ORDER.map((name) => [name, { type, size }]));
}
