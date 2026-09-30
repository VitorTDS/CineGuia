const TOAST_MS = 2500;

const byId = (id) => document.getElementById(id);

export const els = {
  searchForm: byId('searchForm'),
  searchInput: byId('searchInput'),
  themeToggle: byId('themeToggle'),
  tabs: byId('tabs'),
  filters: byId('filters'),
  filterGenre: byId('filterGenre'),
  filterDecade: byId('filterDecade'),
  filterRating: byId('filterRating'),
  filtersClear: byId('filtersClear'),
  sectionTitle: byId('sectionTitle'),
  status: byId('status'),
  grid: byId('grid'),
  sentinel: byId('sentinel'),
  loadMore: byId('loadMore'),
  platformsView: byId('platformsView'),
  platformPicker: byId('platformPicker'),
  platformTop: byId('platformTop'),
  cinemaSwitch: byId('cinemaSwitch'),
  sagasView: byId('sagasView'),
  sagaSearchForm: byId('sagaSearchForm'),
  sagaSearchInput: byId('sagaSearchInput'),
  sagaCuratedSection: byId('sagaCuratedSection'),
  sagaCurated: byId('sagaCurated'),
  sagaCollections: byId('sagaCollections'),
  sagaCollectionsTitle: byId('sagaCollectionsTitle'),
  sagaStatus: byId('sagaStatus'),
  publicView: byId('publicView'),
  publicSearchForm: byId('publicSearchForm'),
  publicSearchInput: byId('publicSearchInput'),
  remindersView: byId('remindersView'),
  remindersGrid: byId('remindersGrid'),
  remindersEmpty: byId('remindersEmpty'),
  alerts: byId('alerts'),
  alertsList: byId('alertsList'),
  alertsClear: byId('alertsClear'),
  alertsBadge: byId('alertsBadge'),
  progressView: byId('progressView'),
  progressGrid: byId('progressGrid'),
  watchedView: byId('watchedView'),
  watchedSummary: byId('watchedSummary'),
  watchedEmpty: byId('watchedEmpty'),
  watchedGrid: byId('watchedGrid'),
  installButton: byId('installButton'),
  installHelp: byId('installHelp'),
  installHelpIntro: byId('installHelpIntro'),
  installHelpSteps: byId('installHelpSteps'),
  forYou: byId('forYou'),
  forYouRow: byId('forYouRow'),
  forYouStatus: byId('forYouStatus'),
  backupView: byId('backupView'),
  backupExport: byId('backupExport'),
  backupImport: byId('backupImport'),
  backupFile: byId('backupFile'),
  details: byId('details'),
  detailsBody: byId('detailsBody'),
  closeDetails: byId('closeDetails'),
  toast: byId('toast'),
  wakeNotice: byId('wakeNotice')
};

export function el(tag, props = {}, children = []) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (key === 'className') node.className = value;
    else if (key === 'text') node.textContent = value;
    else if (key.startsWith('on')) node.addEventListener(key.slice(2), value);
    else node.setAttribute(key, value);
  }
  appendChildren(node, children);
  return node;
}

export function appendChildren(node, children) {
  for (const child of [].concat(children)) {
    if (child) node.append(child);
  }
}

export function setStatus(message, isError = false) {
  els.status.textContent = message;
  els.status.classList.toggle('error', isError);
}

let toastTimer = null;

export function showToast(message) {
  els.toast.textContent = message;
  els.toast.classList.remove('hidden');
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => els.toast.classList.add('hidden'), TOAST_MS);
}
