import { el, showToast } from './dom.js';
import { itemKey } from './utils.js';

const REVIEWS_KEY = 'cineguia-avaliacoes';
const NOTE_MAX_LENGTH = 500;
const NOTE_SAVE_DELAY_MS = 500;
const TITLE_KEY_PATTERN = /^(movie|tv)-\d+$/;

// Personal rating (1 to 5 stars) and note per title: { 'movie-7': { stars, note, updatedAt } }.
// Kept apart from "Já assisti", so unmarking a title by mistake does not erase what was written.
export const reviews = loadReviews();

export function sanitizeReview(review) {
  if (!review || typeof review !== 'object') return null;
  const stars = Number.isInteger(review.stars) && review.stars >= 1 && review.stars <= 5 ? review.stars : 0;
  const note = typeof review.note === 'string' ? review.note.slice(0, NOTE_MAX_LENGTH) : '';
  return stars || note.trim() ? { stars, note, updatedAt: Number(review.updatedAt) || 0 } : null;
}

function loadReviews() {
  try {
    const parsed = JSON.parse(localStorage.getItem(REVIEWS_KEY));
    const result = {};
    for (const [key, review] of Object.entries(parsed && typeof parsed === 'object' ? parsed : {})) {
      const clean = TITLE_KEY_PATTERN.test(key) ? sanitizeReview(review) : null;
      if (clean) result[key] = clean;
    }
    return result;
  } catch {
    return {};
  }
}

export function saveReviews() {
  try {
    localStorage.setItem(REVIEWS_KEY, JSON.stringify(reviews));
  } catch {
    showToast('Não foi possível salvar neste navegador.');
  }
}

function updateReview(key, changes) {
  const next = sanitizeReview({ ...(reviews[key] || {}), ...changes, updatedAt: Date.now() });
  if (next) reviews[key] = next;
  else delete reviews[key];
  saveReviews();
}

export function starsText(stars) {
  return stars ? '★'.repeat(stars) + '☆'.repeat(5 - stars) : '';
}

// The "Sua avaliação" block in the details. It only shows once the title is marked as watched
// (watched.js toggles every [data-requires-watched] element).
export function reviewSection(item, isWatched, onChange) {
  const key = itemKey(item);
  const review = reviews[key] || { stars: 0, note: '' };
  const noteId = `review-note-${key}`;
  const saved = el('span', { className: 'review-saved muted', 'aria-live': 'polite' });

  const starButtons = [1, 2, 3, 4, 5].map((stars) => el('button', {
    type: 'button',
    className: 'star-button',
    'aria-label': formatStarsLabel(stars),
    onclick: () => {
      // Tapping the current rating again clears it.
      const value = (reviews[key] || {}).stars === stars ? 0 : stars;
      updateReview(key, { stars: value });
      renderStars(value);
      if (onChange) onChange();
    }
  }, '★'));

  function renderStars(value) {
    starButtons.forEach((button, index) => {
      button.classList.toggle('on', index < value);
      button.setAttribute('aria-pressed', String(index + 1 === value));
    });
  }
  renderStars(review.stars);

  let saveTimer = null;
  const note = el('textarea', {
    id: noteId,
    className: 'review-note',
    rows: '3',
    maxlength: String(NOTE_MAX_LENGTH),
    placeholder: 'O que você achou? Só você vê este comentário.'
  });
  note.value = review.note;
  const saveNote = () => {
    window.clearTimeout(saveTimer);
    saveTimer = null;
    updateReview(key, { note: note.value });
    saved.textContent = 'Salvo';
    if (onChange) onChange();
  };
  note.addEventListener('input', () => {
    saved.textContent = '';
    window.clearTimeout(saveTimer);
    saveTimer = window.setTimeout(saveNote, NOTE_SAVE_DELAY_MS);
  });
  // Closing the details right after typing must not lose the last words.
  note.addEventListener('blur', () => {
    if (saveTimer) saveNote();
  });

  return el('section', {
    className: `details-section review${isWatched ? '' : ' hidden'}`,
    'data-requires-watched': key
  }, [
    el('h3', { text: 'Sua avaliação' }),
    el('div', { className: 'stars', role: 'group', 'aria-label': 'Sua nota' }, starButtons),
    el('label', { className: 'visually-hidden', for: noteId, text: 'Seu comentário' }),
    note,
    saved
  ]);
}

function formatStarsLabel(stars) {
  return stars === 1 ? 'Dar 1 estrela' : `Dar ${stars} estrelas`;
}
