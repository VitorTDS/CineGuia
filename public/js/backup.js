import { el, showToast } from './dom.js';
import { itemKey, formatCount } from './utils.js';
import { sanitizeList } from './state.js';
import { favorites, replaceFavorites } from './favorites.js';
import { reminders, replaceReminders, checkReminders } from './reminders.js';
import { watched, watchedData, saveWatched } from './watched.js';
import { progress, saveProgress, sanitizeProgressEntry } from './progress.js';
import { reviews, saveReviews, sanitizeReview } from './reviews.js';
import { renderMyList } from './mylist.js';

const BACKUP_APP = 'cineguia';
const BACKUP_VERSION = 1;
const WATCHED_KEY_PATTERN = /^(movie|tv)-\d+$/;
const SHOW_KEY_PATTERN = /^tv-\d+$/;

export function exportBackup() {
  const backup = {
    app: BACKUP_APP,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    favorites,
    reminders,
    watched: [...watched],
    watchedData,
    episodes: progress,
    reviews
  };
  const url = URL.createObjectURL(new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' }));
  const link = el('a', { href: url, download: `cineguia-backup-${new Date().toISOString().slice(0, 10)}.json` });
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  showToast('Backup exportado. Guarde o arquivo para importar em outro aparelho.');
}

// Importing merges with what is already here: nothing saved on this device is lost or overwritten.
export async function importBackup(file) {
  let backup;
  try {
    backup = JSON.parse(await file.text());
  } catch {
    showToast('Não foi possível ler o arquivo. Escolha um backup exportado pelo CineGuia.');
    return;
  }
  if (!backup || backup.app !== BACKUP_APP || backup.version !== BACKUP_VERSION) {
    showToast('Este arquivo não é um backup do CineGuia.');
    return;
  }

  const addNew = (current, incoming) => {
    const keys = new Set(current.map(itemKey));
    return sanitizeList(incoming).filter((item) => !keys.has(itemKey(item)));
  };

  const newFavorites = addNew(favorites, backup.favorites);
  const newReminders = addNew(reminders, backup.reminders);
  replaceFavorites([...favorites, ...newFavorites]);
  replaceReminders([...reminders, ...newReminders]);

  let newWatched = 0;
  const incomingData = backup.watchedData && typeof backup.watchedData === 'object' ? backup.watchedData : {};
  for (const key of Array.isArray(backup.watched) ? backup.watched : []) {
    if (typeof key !== 'string' || !WATCHED_KEY_PATTERN.test(key) || watched.has(key)) continue;
    watched.add(key);
    newWatched += 1;
    const entry = incomingData[key];
    if (entry && typeof entry.title === 'string') watchedData[key] = entry;
  }
  saveWatched();

  // Episodes: the marks from both sides are kept. Reviews: the one already on this device wins.
  let newShows = 0;
  for (const [key, entry] of Object.entries(isObject(backup.episodes) ? backup.episodes : {})) {
    const incoming = SHOW_KEY_PATTERN.test(key) ? sanitizeProgressEntry(entry) : null;
    if (!incoming || !Object.keys(incoming.seen).length) continue;
    const current = progress[key];
    if (!current) {
      progress[key] = incoming;
      newShows += 1;
      continue;
    }
    for (const [season, episodes] of Object.entries(incoming.seen)) {
      current.seen[season] = [...new Set([...(current.seen[season] || []), ...episodes])].sort((a, b) => a - b);
    }
    if (!current.seasons.length) current.seasons = incoming.seasons;
  }
  saveProgress();

  let newReviews = 0;
  for (const [key, review] of Object.entries(isObject(backup.reviews) ? backup.reviews : {})) {
    const incoming = WATCHED_KEY_PATTERN.test(key) && !reviews[key] ? sanitizeReview(review) : null;
    if (!incoming) continue;
    reviews[key] = incoming;
    newReviews += 1;
  }
  saveReviews();

  renderMyList();
  if (newReminders.length) checkReminders();
  const extras = [
    newShows ? formatCount(newShows, 'série em andamento', 'séries em andamento') : null,
    newReviews ? formatCount(newReviews, 'avaliação', 'avaliações') : null
  ].filter(Boolean);
  showToast(`Backup importado: ${[
    formatCount(newFavorites.length, 'favorito', 'favoritos'),
    formatCount(newReminders.length, 'lembrete', 'lembretes'),
    formatCount(newWatched, 'assistido', 'assistidos')
  ].join(', ')} novos.${extras.length ? ` Também: ${extras.join(', ')}.` : ''}`);
}

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}
