import { els } from './dom.js';
import { view } from './state.js';
import {
  showCategory, scheduleSearch, runSearch, applyFilters, updateChrome, loadPage, checkSentinel
} from './list.js';
import { searchSagas } from './sagas.js';
import { renderAlerts, clearAlerts, checkReminders, reminderCheckIsStale } from './reminders.js';
import {
  openTitleFromInitialUrl, syncDetailsWithUrl, closeDetails, resetDetails, leaveTitleUrl
} from './router.js';
import { toggleTheme, renderThemeToggle } from './theme-toggle.js';

function wireEvents() {
  els.tabs.addEventListener('click', (event) => {
    const tab = event.target.closest('[data-category]');
    if (tab) showCategory(tab.dataset.category);
  });

  els.cinemaSwitch.addEventListener('click', (event) => {
    const segment = event.target.closest('[data-section]');
    if (!segment || segment.dataset.section === view.cinemaSection) return;
    view.cinemaSection = segment.dataset.section;
    updateChrome();
    loadPage(true);
  });

  els.sagaSearchForm.addEventListener('submit', (event) => {
    event.preventDefault();
    searchSagas(els.sagaSearchInput.value.trim());
  });

  els.publicSearchForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const query = els.publicSearchInput.value.trim();
    if (query === view.publicQuery) return;
    view.publicQuery = query;
    updateChrome();
    loadPage(true);
  });

  els.alertsClear.addEventListener('click', clearAlerts);

  // Someone who leaves the tab open still gets fresh reminder checks when coming back to it.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && reminderCheckIsStale()) checkReminders();
  });

  els.searchInput.addEventListener('input', scheduleSearch);
  els.searchForm.addEventListener('submit', (event) => {
    event.preventDefault();
    runSearch();
  });

  for (const select of [els.filterGenre, els.filterDecade, els.filterRating]) {
    select.addEventListener('change', applyFilters);
  }

  els.filtersClear.addEventListener('click', (event) => {
    event.preventDefault();
    els.filterGenre.value = '';
    els.filterDecade.value = '';
    els.filterRating.value = '';
    applyFilters();
  });

  els.loadMore.addEventListener('click', () => {
    view.failed = false;
    loadPage(false);
  });

  let scrollCheckQueued = false;
  const queueSentinelCheck = () => {
    if (scrollCheckQueued) return;
    scrollCheckQueued = true;
    window.requestAnimationFrame(() => {
      scrollCheckQueued = false;
      checkSentinel();
    });
  };
  window.addEventListener('scroll', queueSentinelCheck, { passive: true });
  window.addEventListener('resize', queueSentinelCheck);

  els.themeToggle.addEventListener('click', toggleTheme);
  els.closeDetails.addEventListener('click', closeDetails);

  els.details.addEventListener('click', (event) => {
    if (event.target === els.details) closeDetails();
  });

  // Covers Esc. The close event is async and can arrive after the dialog was reopened, so it is ignored then.
  els.details.addEventListener('close', () => {
    if (els.details.open) return;
    resetDetails();
    leaveTitleUrl();
  });

  window.addEventListener('popstate', syncDetailsWithUrl);
}

renderThemeToggle();
wireEvents();
updateChrome();
loadPage(true);
openTitleFromInitialUrl();
renderAlerts();
checkReminders();
