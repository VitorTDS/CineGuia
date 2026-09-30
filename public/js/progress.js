import { els, showToast } from './dom.js';
import { itemKey, summarize, formatCount } from './utils.js';
import { view } from './state.js';
import { createCard } from './cards.js';

const PROGRESS_KEY = 'cineguia-episodios';
const SHOW_KEY_PATTERN = /^tv-\d+$/;

// Episodes seen per series: { 'tv-42': { show, seasons: [{ number, episodeCount }], seen: { '1': [1, 2] }, updatedAt } }.
// The show summary and season sizes are kept so "Continuar assistindo" works without extra requests.
export const progress = loadProgress();

function cleanEpisodes(list) {
  return Array.isArray(list) ? [...new Set(list.filter((number) => Number.isInteger(number) && number > 0))].sort((a, b) => a - b) : [];
}

// Saved data (and imported backups) only keep well-formed entries, so a corrupted one cannot break the page.
export function sanitizeProgressEntry(entry) {
  if (!entry || typeof entry !== 'object' || !entry.show || typeof entry.show.title !== 'string') return null;
  const seen = {};
  for (const [season, episodes] of Object.entries(entry.seen || {})) {
    const clean = cleanEpisodes(episodes);
    if (/^\d{1,3}$/.test(season) && clean.length) seen[season] = clean;
  }
  const seasons = (Array.isArray(entry.seasons) ? entry.seasons : [])
    .filter((season) => season && Number.isInteger(season.number) && Number.isInteger(season.episodeCount))
    .map(({ number, episodeCount }) => ({ number, episodeCount }));
  return { show: entry.show, seasons, seen, updatedAt: Number(entry.updatedAt) || 0 };
}

function loadProgress() {
  try {
    const parsed = JSON.parse(localStorage.getItem(PROGRESS_KEY));
    const result = {};
    for (const [key, entry] of Object.entries(parsed && typeof parsed === 'object' ? parsed : {})) {
      const clean = SHOW_KEY_PATTERN.test(key) ? sanitizeProgressEntry(entry) : null;
      if (clean && Object.keys(clean.seen).length) result[key] = clean;
    }
    return result;
  } catch {
    return {};
  }
}

export function saveProgress() {
  try {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
  } catch {
    showToast('Não foi possível salvar neste navegador.');
  }
}

export function isEpisodeSeen(show, season, episode) {
  const entry = progress[itemKey(show)];
  return Boolean(entry && (entry.seen[season] || []).includes(episode));
}

// Marks (seen = true) or unmarks a group of episodes of one season. `show` is the full details data.
export function setEpisodes(show, season, episodes, seen) {
  const key = itemKey(show);
  const entry = progress[key] || { seen: {} };
  const current = new Set(entry.seen[season] || []);
  for (const episode of episodes) {
    if (seen) current.add(episode);
    else current.delete(episode);
  }
  entry.seen[season] = cleanEpisodes([...current]);
  if (!entry.seen[season].length) delete entry.seen[season];

  if (Object.keys(entry.seen).length) {
    entry.show = summarize(show);
    entry.seasons = seasonSizes(show.seasons);
    entry.updatedAt = Date.now();
    progress[key] = entry;
  } else {
    delete progress[key];
  }
  saveProgress();
  if (view.mode === 'favorites') renderProgressSection();
}

// Season sizes change while a series is airing; opening its details refreshes them.
export function refreshSeasonSizes(show) {
  const entry = progress[itemKey(show)];
  if (!entry || !show.seasons.length) return;
  entry.seasons = seasonSizes(show.seasons);
  saveProgress();
}

function seasonSizes(seasons) {
  return (seasons || []).map(({ number, episodeCount }) => ({ number, episodeCount }));
}

// Next episode after the latest one marked, skipping specials (season 0). null when there is nothing after it.
export function nextEpisode(entry) {
  const regular = entry.seasons.filter((season) => season.number > 0 && season.episodeCount > 0).sort((a, b) => a.number - b.number);
  const watchedSeasons = Object.keys(entry.seen).map(Number).filter((number) => number > 0);
  if (!watchedSeasons.length) return regular.length ? { season: regular[0].number, episode: 1 } : null;

  const lastSeason = Math.max(...watchedSeasons);
  const lastEpisode = Math.max(...entry.seen[lastSeason]);
  const size = regular.find((season) => season.number === lastSeason);
  if (size && lastEpisode < size.episodeCount) return { season: lastSeason, episode: lastEpisode + 1 };
  const following = regular.find((season) => season.number > lastSeason);
  return following ? { season: following.number, episode: 1 } : null;
}

export function episodeCode({ season, episode }) {
  return `T${season}E${episode}`;
}

export function progressSummary(show) {
  const entry = progress[itemKey(show)];
  if (!entry) return 'Marque os episódios que você já viu para saber onde parou.';
  const regular = entry.seasons.filter((season) => season.number > 0);
  const total = regular.reduce((sum, season) => sum + season.episodeCount, 0);
  const seen = Object.entries(entry.seen)
    .filter(([season]) => Number(season) > 0)
    .reduce((sum, [, episodes]) => sum + episodes.length, 0);
  const next = nextEpisode(entry);
  const count = total ? `Você viu ${seen} de ${formatCount(total, 'episódio', 'episódios')}` : `Você viu ${formatCount(seen, 'episódio', 'episódios')}`;
  return `${count} · ${next ? `Próximo: ${episodeCode(next)}` : 'Em dia!'}`;
}

// "Continuar assistindo" in Minha lista: series with a next episode, most recently updated first.
export function renderProgressSection() {
  const items = Object.values(progress)
    .map((entry) => ({ entry, next: nextEpisode(entry) }))
    .filter(({ next }) => next)
    .sort((a, b) => b.entry.updatedAt - a.entry.updatedAt);

  els.progressView.classList.toggle('hidden', view.mode !== 'favorites' || !items.length);
  els.progressGrid.replaceChildren(...items.map(({ entry, next }) =>
    createCard(entry.show, '', { status: `Próximo: ${episodeCode(next)}` })
  ));
}
