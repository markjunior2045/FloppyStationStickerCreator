// UI theme: 98.css (default) or XP.css, swapped at runtime and remembered.
// index.html applies the saved theme early (inline script) to avoid a flash;
// this module switches it afterwards.

export const THEMES = {
  98: 'vendor/98.css-0.1.21/98.css',
  xp: 'vendor/xp.css-0.2.6/XP.css',
};

const STORAGE_KEY = 'fssc.theme';

export function savedTheme() {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value in THEMES ? value : '98';
  } catch {
    return '98';
  }
}

export function applyTheme(id) {
  const theme = id in THEMES ? id : '98';
  document.getElementById('theme-css').href = THEMES[theme];
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // Private mode or blocked storage: the theme just isn't remembered.
  }
  return theme;
}

export function currentTheme() {
  return document.documentElement.dataset.theme ?? '98';
}
