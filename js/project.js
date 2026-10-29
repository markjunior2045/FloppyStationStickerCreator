// Project files: the editor's document snapshot (label settings, effects and
// layers, with images embedded as data URLs) wrapped in a small header.

export const PROJECT_EXTENSION = 'json';
const APP_ID = 'floppystation-sticker-creator';
const FORMAT_VERSION = 1;

export function projectToBlob(document) {
  const file = {
    app: APP_ID,
    version: FORMAT_VERSION,
    savedAt: new Date().toISOString(),
    document,
  };
  return new Blob([JSON.stringify(file)], { type: 'application/json' });
}

/** Parses a project file; throws with a short reason when it isn't one. */
export async function readProjectFile(file) {
  let data;
  try {
    data = JSON.parse(await file.text());
  } catch {
    throw new Error('not JSON');
  }
  if (data?.app !== APP_ID || !data.document) throw new Error('not a project file');
  if (data.version > FORMAT_VERSION) throw new Error('made by a newer version');
  const { document } = data;
  if (!document.settings || !Array.isArray(document.layers)) throw new Error('incomplete project');
  return document;
}

export function pickProjectFile() {
  return new Promise((resolve) => {
    const input = window.document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.addEventListener('change', () => resolve(input.files[0] ?? null), { once: true });
    input.addEventListener('cancel', () => resolve(null), { once: true });
    input.click();
  });
}
