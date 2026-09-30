import { el, els, setStatus } from './dom.js';
import { createCard } from './cards.js';
import { favorites } from './favorites.js';
import { reminders, reminderStatus } from './reminders.js';
import { renderWatchedSection } from './watched.js';

// The "Minha lista" tab: reminders, favorites and watched titles.
export function renderMyList() {
  els.loadMore.classList.add('hidden');
  setStatus('');
  els.remindersEmpty.classList.toggle('hidden', reminders.length > 0);
  els.remindersGrid.replaceChildren(...reminders.map((item) =>
    createCard(item, '', { reminder: true, status: reminderStatus(item) })
  ));
  if (favorites.length) {
    els.grid.replaceChildren(...favorites.map((item) => createCard(item)));
  } else {
    els.grid.replaceChildren(el('p', {
      className: 'muted grid-empty',
      text: 'Nenhum favorito ainda. Toque no ♡ de um filme ou série para salvar aqui.'
    }));
  }
  renderWatchedSection();
}
