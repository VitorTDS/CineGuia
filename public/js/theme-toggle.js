import { els } from './dom.js';

const THEME_KEY = 'cineguia-theme';

function currentTheme() {
  return document.documentElement.dataset.theme ||
    (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
}

export function toggleTheme() {
  const next = currentTheme() === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = next;
  try {
    localStorage.setItem(THEME_KEY, next);
  } catch {
    // Storage blocked: the theme still applies for this visit.
  }
  renderThemeToggle();
}

export function renderThemeToggle() {
  const dark = currentTheme() === 'dark';
  els.themeToggle.textContent = dark ? '☀' : '☾';
  els.themeToggle.setAttribute('aria-label', dark ? 'Mudar para tema claro' : 'Mudar para tema escuro');
  els.themeToggle.title = els.themeToggle.getAttribute('aria-label');
}
