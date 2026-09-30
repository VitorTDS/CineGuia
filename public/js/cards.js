import { el } from './dom.js';
import { TYPE_LABELS, posterImage, formatDate, formatRating } from './utils.js';
import { favoriteButton } from './favorites.js';
import { reminderButton } from './reminders.js';
import { openTitle } from './router.js';

// options.status replaces the meta line; options.showRelease shows the release date; options.reminder adds the bell.
export function createCard(item, extraClass = '', options = {}) {
  let meta;
  if (options.status) {
    meta = options.status;
  } else if (options.showRelease && item.releaseDate) {
    meta = `Estreia ${formatDate(item.releaseDate)}`;
  } else {
    meta = [TYPE_LABELS[item.type], item.year, formatRating(item.rating)].filter(Boolean).join(' · ');
  }

  return el('article', { className: `card ${extraClass}`.trim() }, [
    el('button', { type: 'button', className: 'card-open', onclick: () => openTitle(item) }, [
      posterImage(item.poster, '', 'card-poster', '(max-width: 600px) 34vw, 200px') ||
        el('div', { className: 'card-poster placeholder', text: item.title }),
      el('span', { className: 'card-title', text: item.title }),
      el('span', { className: `card-meta${options.status || options.showRelease ? ' highlight' : ''}`, text: meta })
    ]),
    favoriteButton(item, 'icon'),
    options.reminder ? reminderButton(item, 'icon') : null
  ]);
}
