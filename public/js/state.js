import { showToast } from './dom.js';

export const APP_TITLE = document.title;

export const CATEGORY_TITLES = {
  trending: 'Em alta nesta semana',
  movies: 'Filmes populares',
  series: 'Séries populares',
  cinema: 'Cinema',
  sagas: 'Sagas e franquias',
  platforms: 'Top 10 por plataforma',
  public: 'Assistir grátis: clássicos em domínio público',
  favorites: 'Minha lista'
};

export const CATEGORY_TYPES = { movies: 'movie', series: 'tv' };

// What the main page is showing. `mode` is 'category', 'search' or one of the special tabs.
export const view = {
  mode: 'category',
  category: 'trending',
  query: '',
  page: 0,
  totalPages: 1,
  loading: false,
  failed: false,
  cinemaSection: 'now_playing',
  publicQuery: '',
  filters: { genre: '', decade: '', rating: '' }
};

// Saved lists (and imported backups) only keep well-formed titles, so a corrupted entry cannot break the page.
export function sanitizeList(list) {
  if (!Array.isArray(list)) return [];
  return list.filter(
    (item) =>
      item && (item.type === 'movie' || item.type === 'tv') &&
      Number.isInteger(item.id) && typeof item.title === 'string'
  );
}

export function loadStoredList(key) {
  try {
    return sanitizeList(JSON.parse(localStorage.getItem(key)));
  } catch {
    return [];
  }
}

export function saveStoredList(key, list) {
  try {
    localStorage.setItem(key, JSON.stringify(list));
  } catch {
    showToast('Não foi possível salvar neste navegador.');
  }
}
