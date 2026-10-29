// Undo/redo over document snapshots. A snapshot is a plain object; image data
// URLs are shared by reference, so keeping many snapshots stays cheap.

const LIMIT = 100;

/**
 * capture()        returns the current snapshot
 * restore(state)   applies a snapshot (may be async)
 * onChange()       canUndo/canRedo may have changed
 */
export function createHistory({ capture, restore, onChange = () => {} }) {
  let states = [];
  let index = -1;
  let queue = Promise.resolve();
  let restoring = false;

  function commit() {
    if (restoring) return;
    const state = capture();
    if (index >= 0 && fingerprint(state) === fingerprint(states[index])) return;
    states = states.slice(0, index + 1);
    states.push(state);
    if (states.length > LIMIT) states.shift();
    index = states.length - 1;
    onChange();
  }

  // Undo/redo run one at a time, so fast repeated clicks can't interleave restores.
  function go(delta) {
    queue = queue.then(async () => {
      const target = index + delta;
      if (target < 0 || target >= states.length) return;
      index = target;
      restoring = true;
      try {
        await restore(states[index]);
      } finally {
        restoring = false;
        onChange();
      }
    });
    return queue;
  }

  return {
    commit,
    undo: () => go(-1),
    redo: () => go(+1),
    get canUndo() { return index > 0; },
    get canRedo() { return index < states.length - 1; },
    get restoring() { return restoring; },
  };
}

// Compares snapshots without serializing whole images.
function fingerprint(state) {
  return JSON.stringify(state, (key, value) =>
    key === 'src' && typeof value === 'string' ? `${value.length}:${value.slice(-48)}` : value);
}
