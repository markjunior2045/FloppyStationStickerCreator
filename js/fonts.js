// Fonts offered for text layers: the vendored retro fonts (css/fonts.css)
// plus two system fonts for small, plain text.
import { cache } from '../vendor/fabric-7.4.0/index.min.mjs';

export const FONTS = [
  { family: 'Press Start 2P', group: 'pixel' },
  { family: 'VT323', group: 'pixel' },
  { family: 'Silkscreen', group: 'pixel' },
  { family: 'Orbitron', group: 'title' },
  { family: 'Audiowide', group: 'title' },
  { family: 'Bungee', group: 'title' },
  { family: 'Russo One', group: 'title' },
  { family: 'Black Ops One', group: 'display' },
  { family: 'Righteous', group: 'display' },
  { family: 'Bebas Neue', group: 'display' },
  { family: 'Monoton', group: 'display' },
  { family: 'Arial', group: 'system' },
  { family: 'Courier New', group: 'system' },
];

/** CSS font-family value with a generic fallback. */
export function fontStack(family) {
  return `"${family}", ${family === 'Courier New' ? 'monospace' : 'sans-serif'}`;
}

/**
 * Loads a font before Fabric measures text with it. Fabric caches glyph
 * widths per family, so a family measured before its file arrived is cleared.
 */
export async function loadFont(family) {
  await document.fonts.load(`32px "${family}"`);
  cache.clearFontCache(family);
}

export function loadFonts(families) {
  return Promise.all([...new Set(families)].map(loadFont));
}
