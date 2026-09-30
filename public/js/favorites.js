import { el, showToast } from './dom.js';
import { itemKey, summarize } from './utils.js';
import { view, loadStoredList } from './state.js';
import { renderMyList } from './mylist.js';

const FAVORITES_KEY = 'cineguia-favoritos';

export let favorites = loadStoredList(FAVORITES_KEY);

export function replaceFavorites(list) {
  favorites = list;
  saveFavorites();
}

function saveFavorites() {
  try {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
  } catch {
    showToast('Não foi possível salvar sua lista neste navegador.');
  }
}

export function isFavorite(item) {
  return favorites.some((favorite) => itemKey(favorite) === itemKey(item));
}

function toggleFavorite(item) {
  const summary = summarize(item);

  if (isFavorite(summary)) {
    favorites = favorites.filter((favorite) => itemKey(favorite) !== itemKey(summary));
    showToast(`${summary.title} saiu da sua lista.`);
  } else {
    favorites = [summary, ...favorites];
    showToast(`${summary.title} foi adicionado à sua lista.`);
  }

  saveFavorites();
  for (const button of document.querySelectorAll(`[data-fav-key="${itemKey(summary)}"]`)) {
    renderFavoriteButton(button, summary);
  }
  if (view.mode === 'favorites') renderMyList();
}

export function favoriteButton(item, variant) {
  const button = el('button', {
    type: 'button',
    className: variant === 'icon' ? 'fav-button icon' : 'fav-button full',
    'data-fav-key': itemKey(item),
    onclick: (event) => {
      event.stopPropagation();
      toggleFavorite(item);
    }
  });
  renderFavoriteButton(button, item);
  return button;
}

function renderFavoriteButton(button, item) {
  const saved = isFavorite(item);
  button.setAttribute('aria-pressed', String(saved));
  button.setAttribute('aria-label', saved ? `Remover ${item.title} da minha lista` : `Adicionar ${item.title} à minha lista`);
  if (button.classList.contains('icon')) {
    button.textContent = saved ? '♥' : '♡';
  } else {
    button.textContent = saved ? '♥ Na minha lista' : '♡ Adicionar à lista';
  }
}
