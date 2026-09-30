import { el, els, setStatus } from './dom.js';
import { itemKey } from './utils.js';
import { view, CATEGORY_TITLES, CATEGORY_TYPES } from './state.js';
import { fetchJson } from './api.js';
import { createCard } from './cards.js';
import { renderMyList } from './mylist.js';
import { renderPlatforms } from './platforms.js';
import { renderSagaList } from './sagas.js';
import { createPublicCard } from './public-domain.js';

const SEARCH_DEBOUNCE_MS = 400;
const INFINITE_SCROLL_MARGIN_PX = 600;
const CINEMA_TITLES = { now_playing: 'Em cartaz nos cinemas', upcoming: 'Em breve nos cinemas' };
// Tabs that render their own content instead of the paginated grid.
const SPECIAL_MODES = ['favorites', 'platforms', 'sagas'];

const genreCache = {};
let shownIds = new Set();
let listRequestId = 0;
let searchTimer = null;

export function showCategory(category) {
  if (!CATEGORY_TITLES[category]) return;
  window.clearTimeout(searchTimer);
  els.searchInput.value = '';
  view.mode = SPECIAL_MODES.includes(category) ? category : 'category';
  view.category = category;
  view.filters = { genre: '', decade: '', rating: '' };
  view.publicQuery = '';
  els.publicSearchInput.value = '';
  els.filters.reset();
  updateChrome();
  loadPage(true);
}

export function scheduleSearch() {
  window.clearTimeout(searchTimer);
  searchTimer = window.setTimeout(runSearch, SEARCH_DEBOUNCE_MS);
}

export function runSearch() {
  window.clearTimeout(searchTimer);
  const query = els.searchInput.value.trim();
  if (!query) {
    if (view.mode === 'search') showCategory(view.category);
    return;
  }
  if (view.mode === 'search' && view.query === query) return;
  view.mode = 'search';
  view.query = query;
  updateChrome();
  loadPage(true);
}

export function applyFilters() {
  view.filters = {
    genre: els.filterGenre.value,
    decade: els.filterDecade.value,
    rating: els.filterRating.value
  };
  updateChrome();
  loadPage(true);
}

function hasFilters() {
  return Boolean(view.filters.genre || view.filters.decade || view.filters.rating);
}

export function updateChrome() {
  for (const tab of els.tabs.querySelectorAll('[data-category]')) {
    const active = view.mode !== 'search' && tab.dataset.category === view.category;
    tab.classList.toggle('active', active);
    tab.setAttribute('aria-pressed', String(active));
  }

  const type = view.mode === 'category' ? CATEGORY_TYPES[view.category] : null;
  const inCinema = view.mode === 'category' && view.category === 'cinema';
  const inPublic = view.mode === 'category' && view.category === 'public';
  els.filters.classList.toggle('hidden', !type);
  els.publicView.classList.toggle('hidden', !inPublic);
  els.platformsView.classList.toggle('hidden', view.mode !== 'platforms');
  els.sagasView.classList.toggle('hidden', view.mode !== 'sagas');
  els.remindersView.classList.toggle('hidden', view.mode !== 'favorites');
  els.watchedView.classList.toggle('hidden', view.mode !== 'favorites');
  els.cinemaSwitch.classList.toggle('hidden', !inCinema);
  for (const segment of els.cinemaSwitch.querySelectorAll('[data-section]')) {
    segment.setAttribute('aria-pressed', String(segment.dataset.section === view.cinemaSection));
  }
  if (type) loadGenres(type);

  if (view.mode === 'search') {
    els.sectionTitle.textContent = `Resultados para "${view.query}"`;
  } else if (inCinema) {
    els.sectionTitle.textContent = CINEMA_TITLES[view.cinemaSection];
  } else if (inPublic && view.publicQuery) {
    els.sectionTitle.textContent = `Clássicos em domínio público: "${view.publicQuery}"`;
  } else if (type && hasFilters()) {
    els.sectionTitle.textContent = type === 'movie' ? 'Filmes filtrados' : 'Séries filtradas';
  } else {
    els.sectionTitle.textContent = CATEGORY_TITLES[view.category];
  }
}

async function loadGenres(type) {
  if (!genreCache[type]) {
    try {
      genreCache[type] = (await fetchJson(`/api/genres/${type}`)).genres;
    } catch {
      return;
    }
  }
  if (CATEGORY_TYPES[view.category] !== type) return;

  const selected = view.filters.genre;
  els.filterGenre.replaceChildren(
    el('option', { value: '', text: 'Todos' }),
    ...genreCache[type].map((genre) => el('option', { value: String(genre.id), text: genre.name }))
  );
  els.filterGenre.value = selected;
}

function buildListUrl(page) {
  if (view.mode === 'search') {
    return `/api/search?q=${encodeURIComponent(view.query)}&page=${page}`;
  }
  if (view.category === 'cinema') {
    return `/api/cinema?section=${view.cinemaSection}&page=${page}`;
  }
  if (view.category === 'public') {
    return `/api/public-domain?page=${page}&q=${encodeURIComponent(view.publicQuery)}`;
  }
  const params = new URLSearchParams({ category: view.category, page: String(page) });
  if (CATEGORY_TYPES[view.category]) {
    if (view.filters.genre) params.set('genre', view.filters.genre);
    if (view.filters.decade) {
      const [from, to] = view.filters.decade.split('-');
      params.set('from', from);
      params.set('to', to);
    }
    if (view.filters.rating) params.set('rating', view.filters.rating);
  }
  return `/api/list?${params}`;
}

export async function loadPage(reset) {
  const requestId = ++listRequestId;

  if (reset) {
    view.page = 0;
    view.totalPages = 1;
    view.failed = false;
    shownIds = new Set();
    els.grid.replaceChildren();
  }

  if (SPECIAL_MODES.includes(view.mode)) {
    view.loading = false;
    els.loadMore.classList.add('hidden');
    if (view.mode === 'favorites') renderMyList();
    if (view.mode === 'platforms') renderPlatforms();
    if (view.mode === 'sagas') {
      setStatus('');
      renderSagaList();
    }
    return;
  }

  view.loading = true;
  setStatus(els.grid.children.length ? '' : 'Carregando...');
  els.loadMore.classList.add('hidden');

  try {
    const data = await fetchJson(buildListUrl(view.page + 1));
    if (requestId !== listRequestId) return;

    view.page = data.page;
    view.totalPages = data.totalPages;

    // Popularity lists shift between pages, so the same title can come back twice.
    const fresh = data.results.filter((item) => {
      const key = itemKey(item);
      if (shownIds.has(key)) return false;
      shownIds.add(key);
      return true;
    });
    const inCinema = view.mode === 'category' && view.category === 'cinema';
    const cardOptions = { reminder: inCinema, showRelease: inCinema && view.cinemaSection === 'upcoming' };
    els.grid.append(...fresh.map((item) => (item.type === 'public' ? createPublicCard(item) : createCard(item, '', cardOptions))));

    if (els.grid.children.length) {
      setStatus('');
    } else if (view.mode === 'search') {
      setStatus(`Nenhum resultado para "${view.query}".`);
    } else {
      setStatus(view.category === 'public'
        ? `Nenhum clássico em domínio público encontrado${view.publicQuery ? ` para "${view.publicQuery}"` : ''}.`
        : hasFilters() ? 'Nenhum título com esses filtros.' : 'Nada encontrado.');
    }
  } catch (error) {
    if (requestId !== listRequestId) return;
    view.failed = true;
    setStatus(error.message, true);
    els.loadMore.classList.remove('hidden');
  } finally {
    if (requestId === listRequestId) {
      view.loading = false;
      window.requestAnimationFrame(checkSentinel);
    }
  }
}

function maybeLoadMore() {
  if (SPECIAL_MODES.includes(view.mode) || view.loading || view.failed || view.page >= view.totalPages) return;
  loadPage(false);
}

export function checkSentinel() {
  if (els.sentinel.getBoundingClientRect().top < window.innerHeight + INFINITE_SCROLL_MARGIN_PX) {
    maybeLoadMore();
  }
}
