// Keyboard shortcuts. Ignored while typing in a field (including Fabric's
// hidden textarea when a text is being edited on the canvas) or while a
// dialog is open.

const NUDGE_MM = 0.5;
const NUDGE_FAST_MM = 2;

const CTRL_KEYS = {
  z: 'undo',
  y: 'redo',
  s: 'save',
  o: 'open',
  e: 'export',
  0: 'zoom-fit',
  1: 'zoom-100',
  '=': 'zoom-in',
  '+': 'zoom-in',
  '-': 'zoom-out',
};

const ARROWS = {
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
};

/**
 * handlers: {
 *   runAction(name)
 *   deleteSelection()
 *   nudge(dx, dy)          in mm
 *   nudgeDone()            arrow released: commit once
 *   deselect()
 *   blocked()              true while a dialog is open
 * }
 */
export function initShortcuts(handlers) {
  let nudging = false;

  document.addEventListener('keydown', (event) => {
    if (handlers.blocked() || isTyping(event.target)) return;
    const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;

    if (event.ctrlKey || event.metaKey) {
      let action = CTRL_KEYS[key];
      if (key === 'z' && event.shiftKey) action = 'redo';
      if (!action) return;
      event.preventDefault();
      handlers.runAction(action);
      return;
    }

    if (key === 'Delete' || key === 'Backspace') {
      event.preventDefault();
      handlers.deleteSelection();
    } else if (ARROWS[key]) {
      event.preventDefault();
      const step = event.shiftKey ? NUDGE_FAST_MM : NUDGE_MM;
      const [dx, dy] = ARROWS[key];
      nudging = handlers.nudge(dx * step, dy * step) || nudging;
    } else if (key === 'Escape') {
      handlers.deselect();
    }
  });

  document.addEventListener('keyup', (event) => {
    if (nudging && ARROWS[event.key]) {
      nudging = false;
      handlers.nudgeDone();
    }
  });
}

function isTyping(target) {
  return target instanceof HTMLElement
    && (target.matches('input, textarea, select') || target.isContentEditable);
}
