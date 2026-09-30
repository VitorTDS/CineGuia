import { el, els, showToast } from './dom.js';
import { itemKey, summarize, formatCount } from './utils.js';
import { view } from './state.js';
import { fetchJson } from './api.js';
import { createCard } from './cards.js';
import { reviews, starsText } from './reviews.js';

const WATCHED_KEY = 'cineguia-assistidos';
const WATCHED_DATA_KEY = 'cineguia-assistidos-dados';

export const watched = loadWatched();
// Title, poster and date for each watched key, so the "Já assisti" list can be shown without extra requests.
export const watchedData = loadWatchedData();
let fetchRunning = false;
const fetchAttempted = new Set();

function loadWatched() {
  try {
    const parsed = JSON.parse(localStorage.getItem(WATCHED_KEY));
    return new Set(Array.isArray(parsed) ? parsed.filter((key) => /^(movie|tv)-\d+$/.test(key)) : []);
  } catch {
    return new Set();
  }
}

function loadWatchedData() {
  try {
    const parsed = JSON.parse(localStorage.getItem(WATCHED_DATA_KEY));
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

export function saveWatched() {
  try {
    localStorage.setItem(WATCHED_KEY, JSON.stringify([...watched]));
    localStorage.setItem(WATCHED_DATA_KEY, JSON.stringify(watchedData));
  } catch {
    showToast('Não foi possível salvar neste navegador.');
  }
}

export function isWatched(item) {
  return watched.has(itemKey(item));
}

function toggleWatched(item) {
  const key = itemKey(item);
  if (watched.has(key)) {
    watched.delete(key);
    delete watchedData[key];
  } else {
    watched.add(key);
    // Strictly increasing, so titles marked in quick succession keep their order in the list.
    const latest = Math.max(0, ...Object.values(watchedData).map((entry) => entry.watchedAt || 0));
    watchedData[key] = { ...summarize(item), watchedAt: Math.max(Date.now(), latest + 1) };
  }
  saveWatched();

  // The same title can appear in several sagas and in its details; keep every copy in sync.
  for (const button of document.querySelectorAll(`[data-watched-key="${key}"]`)) renderWatchedButton(button, item);
  for (const marker of document.querySelectorAll(`[data-watched-marker="${key}"]`)) marker.classList.toggle('watched', watched.has(key));
  for (const node of document.querySelectorAll(`[data-requires-watched="${key}"]`)) node.classList.toggle('hidden', !watched.has(key));
  if (view.mode === 'favorites') renderWatchedSection();
}

export function renderWatchedSection() {
  const items = [...watched]
    .map((key) => watchedData[key])
    .filter((item) => item && typeof item.title === 'string')
    .sort((a, b) => (b.watchedAt || 0) - (a.watchedAt || 0));
  const movies = items.filter((item) => item.type === 'movie').length;
  const series = items.filter((item) => item.type === 'tv').length;

  els.watchedEmpty.classList.toggle('hidden', watched.size > 0);
  els.watchedSummary.textContent = watched.size
    ? [formatCount(movies, 'filme', 'filmes'), formatCount(series, 'série', 'séries')].join(' · ')
    : '';
  els.watchedGrid.replaceChildren(...items.map((item) => {
    const date = item.watchedAt ? `Assistido em ${new Date(item.watchedAt).toLocaleDateString('pt-BR')}` : 'Assistido';
    const stars = starsText((reviews[itemKey(item)] || {}).stars);
    return createCard(item, '', { status: stars ? `${date} · ${stars}` : date });
  }));

  // Keys marked before titles were stored have no data yet; fetch it once per visit and redraw.
  if ([...watched].some((key) => !watchedData[key] && !fetchAttempted.has(key))) fillMissingWatchedData();
}

async function fillMissingWatchedData() {
  if (fetchRunning) return;
  fetchRunning = true;
  els.watchedSummary.textContent = 'Carregando títulos marcados...';

  try {
    const missing = [...watched].filter((key) => !watchedData[key] && !fetchAttempted.has(key));
    for (const key of missing) {
      fetchAttempted.add(key);
      const [, type, id] = key.match(/^(movie|tv)-(\d+)$/) || [];
      if (!type) continue;
      try {
        const data = await fetchJson(`/api/title/${type}/${id}`);
        if (watched.has(key)) watchedData[key] = summarize(data);
      } catch {
        // Leave it missing; the next visit tries again.
      }
    }
    saveWatched();
  } finally {
    fetchRunning = false;
  }
  if (view.mode === 'favorites') renderWatchedSection();
}

export function watchedButton(item, onChange, variant = 'compact') {
  const button = el('button', {
    type: 'button',
    className: `watched-button ${variant}`,
    'data-watched-key': itemKey(item),
    onclick: (event) => {
      event.stopPropagation();
      toggleWatched(item);
      if (onChange) onChange();
    }
  });
  renderWatchedButton(button, item);
  return button;
}

function renderWatchedButton(button, item) {
  const seen = isWatched(item);
  button.setAttribute('aria-pressed', String(seen));
  button.setAttribute('aria-label', seen ? `Desmarcar ${item.title} como assistido` : `Marcar ${item.title} como assistido`);
  button.textContent = seen ? '✓ Assisti' : 'Marcar como assistido';
}
