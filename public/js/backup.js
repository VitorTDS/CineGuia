import { el, showToast } from './dom.js';
import { itemKey, formatCount } from './utils.js';
import { sanitizeList } from './state.js';
import { favorites, replaceFavorites } from './favorites.js';
import { reminders, replaceReminders, checkReminders } from './reminders.js';
import { watched, watchedData, saveWatched } from './watched.js';
import { renderMyList } from './mylist.js';

const BACKUP_APP = 'cineguia';
const BACKUP_VERSION = 1;
const WATCHED_KEY_PATTERN = /^(movie|tv)-\d+$/;

export function exportBackup() {
  const backup = {
    app: BACKUP_APP,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    favorites,
    reminders,
    watched: [...watched],
    watchedData
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

  renderMyList();
  if (newReminders.length) checkReminders();
  showToast(`Backup importado: ${[
    formatCount(newFavorites.length, 'favorito', 'favoritos'),
    formatCount(newReminders.length, 'lembrete', 'lembretes'),
    formatCount(newWatched, 'assistido', 'assistidos')
  ].join(', ')} novos.`);
}
