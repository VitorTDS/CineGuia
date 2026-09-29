(function () {
  const IMAGE_BASE = 'https://image.tmdb.org/t/p/';
  const POSTER_WIDTHS = [185, 342, 500, 780];
  const SEARCH_DEBOUNCE_MS = 400;
  const TOAST_MS = 2500;
  const CLIPBOARD_TIMEOUT_MS = 2000;
  const INFINITE_SCROLL_MARGIN_PX = 600;
  const FAVORITES_KEY = 'cineguia-favoritos';
  const THEME_KEY = 'cineguia-theme';
  const PLATFORM_KEY = 'cineguia-plataforma';
  const REMINDERS_KEY = 'cineguia-lembretes';
  const ALERTS_KEY = 'cineguia-avisos';
  const REMINDER_RECHECK_MS = 30 * 60 * 1000;
  const CINEMA_TITLES = { now_playing: 'Em cartaz nos cinemas', upcoming: 'Em breve nos cinemas' };
  const APP_TITLE = document.title;

  const CATEGORY_TITLES = {
    trending: 'Em alta nesta semana',
    movies: 'Filmes populares',
    series: 'Séries populares',
    cinema: 'Cinema',
    platforms: 'Top 10 por plataforma',
    public: 'Assistir grátis: clássicos em domínio público',
    favorites: 'Minha lista'
  };
  const CATEGORY_TYPES = { movies: 'movie', series: 'tv' };
  const TYPE_LABELS = { movie: 'Filme', tv: 'Série' };
  const TYPE_TO_HASH = { movie: 'filme', tv: 'serie', public: 'dominio' };
  const HASH_TO_TYPE = { filme: 'movie', serie: 'tv', dominio: 'public' };
  const PROVIDER_GROUPS = [
    ['streaming', 'Streaming (assinatura)'],
    ['free', 'Grátis'],
    ['rent', 'Alugar'],
    ['buy', 'Comprar']
  ];

  const els = {
    searchForm: document.getElementById('searchForm'),
    searchInput: document.getElementById('searchInput'),
    themeToggle: document.getElementById('themeToggle'),
    tabs: document.getElementById('tabs'),
    filters: document.getElementById('filters'),
    filterGenre: document.getElementById('filterGenre'),
    filterDecade: document.getElementById('filterDecade'),
    filterRating: document.getElementById('filterRating'),
    filtersClear: document.getElementById('filtersClear'),
    sectionTitle: document.getElementById('sectionTitle'),
    status: document.getElementById('status'),
    grid: document.getElementById('grid'),
    sentinel: document.getElementById('sentinel'),
    loadMore: document.getElementById('loadMore'),
    platformsView: document.getElementById('platformsView'),
    cinemaSwitch: document.getElementById('cinemaSwitch'),
    publicView: document.getElementById('publicView'),
    publicSearchForm: document.getElementById('publicSearchForm'),
    publicSearchInput: document.getElementById('publicSearchInput'),
    remindersView: document.getElementById('remindersView'),
    remindersGrid: document.getElementById('remindersGrid'),
    remindersEmpty: document.getElementById('remindersEmpty'),
    alerts: document.getElementById('alerts'),
    alertsList: document.getElementById('alertsList'),
    alertsClear: document.getElementById('alertsClear'),
    alertsBadge: document.getElementById('alertsBadge'),
    platformPicker: document.getElementById('platformPicker'),
    platformTop: document.getElementById('platformTop'),
    details: document.getElementById('details'),
    detailsBody: document.getElementById('detailsBody'),
    closeDetails: document.getElementById('closeDetails'),
    toast: document.getElementById('toast')
  };

  const view = {
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

  const genreCache = {};
  const platformTopCache = {};
  let platforms = null;
  let selectedPlatformId = readStoredPlatform();
  let platformRequestId = 0;
  let favorites = loadFavorites();
  let reminders = loadStoredList(REMINDERS_KEY);
  let alerts = loadStoredList(ALERTS_KEY);
  let lastReminderCheck = 0;
  let checkingReminders = false;
  let recheckQueued = false;
  let shownIds = new Set();
  let listRequestId = 0;
  let detailsRequestId = 0;
  let seasonRequestId = 0;
  let searchTimer = null;
  let toastTimer = null;

  renderThemeToggle();
  wireEvents();
  updateChrome();
  loadPage(true);
  openTitleFromInitialUrl();
  renderAlerts();
  checkReminders();

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

    els.publicSearchForm.addEventListener('submit', (event) => {
      event.preventDefault();
      const query = els.publicSearchInput.value.trim();
      if (query === view.publicQuery) return;
      view.publicQuery = query;
      updateChrome();
      loadPage(true);
    });

    els.alertsClear.addEventListener('click', () => {
      alerts = [];
      saveStoredList(ALERTS_KEY, alerts);
      renderAlerts();
    });

    // Someone who leaves the tab open still gets fresh reminder checks when coming back to it.
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && Date.now() - lastReminderCheck > REMINDER_RECHECK_MS) {
        checkReminders();
      }
    });

    els.searchInput.addEventListener('input', () => {
      window.clearTimeout(searchTimer);
      searchTimer = window.setTimeout(runSearch, SEARCH_DEBOUNCE_MS);
    });

    els.searchForm.addEventListener('submit', (event) => {
      event.preventDefault();
      window.clearTimeout(searchTimer);
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

    window.addEventListener('popstate', syncDetailsWithHash);
  }

  // ---------- Lista ----------

  function showCategory(category) {
    if (!CATEGORY_TITLES[category]) return;
    window.clearTimeout(searchTimer);
    els.searchInput.value = '';
    view.mode = category === 'favorites' || category === 'platforms' ? category : 'category';
    view.category = category;
    view.filters = { genre: '', decade: '', rating: '' };
    view.publicQuery = '';
    els.publicSearchInput.value = '';
    els.filters.reset();
    updateChrome();
    loadPage(true);
  }

  function runSearch() {
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

  function applyFilters() {
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

  function updateChrome() {
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
    els.remindersView.classList.toggle('hidden', view.mode !== 'favorites');
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

  async function loadPage(reset) {
    const requestId = ++listRequestId;

    if (reset) {
      view.page = 0;
      view.totalPages = 1;
      view.failed = false;
      shownIds = new Set();
      els.grid.replaceChildren();
    }

    if (view.mode === 'favorites') {
      view.loading = false;
      renderFavorites();
      return;
    }

    if (view.mode === 'platforms') {
      view.loading = false;
      els.loadMore.classList.add('hidden');
      renderPlatforms();
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
    if (view.mode === 'favorites' || view.mode === 'platforms' || view.loading || view.failed || view.page >= view.totalPages) return;
    loadPage(false);
  }

  function checkSentinel() {
    if (els.sentinel.getBoundingClientRect().top < window.innerHeight + INFINITE_SCROLL_MARGIN_PX) {
      maybeLoadMore();
    }
  }

  function renderFavorites() {
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
  }

  // ---------- Top 10 por plataforma ----------

  function readStoredPlatform() {
    try {
      return Number(localStorage.getItem(PLATFORM_KEY)) || null;
    } catch {
      return null;
    }
  }

  async function renderPlatforms() {
    const requestId = ++platformRequestId;

    if (!platforms) {
      setStatus('Carregando plataformas...');
      try {
        platforms = (await fetchJson('/api/platforms')).platforms;
      } catch (error) {
        if (requestId === platformRequestId) setStatus(error.message, true);
        return;
      }
      if (requestId !== platformRequestId) return;
      setStatus(platforms.length ? '' : 'Nenhuma plataforma encontrada.');
    }

    if (!platforms.some((platform) => platform.id === selectedPlatformId)) {
      selectedPlatformId = platforms.length ? platforms[0].id : null;
    }

    els.platformPicker.replaceChildren(...platforms.map((platform) => {
      const logo = imageUrl('w92', platform.logo);
      return el('button', {
        type: 'button',
        className: 'platform-chip',
        'aria-pressed': String(platform.id === selectedPlatformId),
        onclick: () => selectPlatform(platform.id)
      }, [
        logo ? el('img', { src: logo, alt: '', width: '28', height: '28' }) : null,
        el('span', { text: platform.name })
      ]);
    }));

    if (selectedPlatformId) loadPlatformTop(selectedPlatformId);
  }

  function selectPlatform(id) {
    selectedPlatformId = id;
    try {
      localStorage.setItem(PLATFORM_KEY, String(id));
    } catch {
      // Storage blocked: the choice lasts only for this visit.
    }
    for (const chip of els.platformPicker.children) chip.setAttribute('aria-pressed', 'false');
    const index = platforms.findIndex((platform) => platform.id === id);
    if (index >= 0) els.platformPicker.children[index].setAttribute('aria-pressed', 'true');
    loadPlatformTop(id);
  }

  async function loadPlatformTop(id) {
    const requestId = ++platformRequestId;
    const platform = platforms.find((item) => item.id === id);

    if (!platformTopCache[id]) {
      els.platformTop.replaceChildren(el('p', { className: 'muted', text: `Carregando o Top 10 de ${platform.name}...` }));
      try {
        platformTopCache[id] = await fetchJson(`/api/platform-top?provider=${id}`);
      } catch (error) {
        if (requestId === platformRequestId) {
          els.platformTop.replaceChildren(el('p', { className: 'muted error', text: error.message }));
        }
        return;
      }
      if (requestId !== platformRequestId) return;
    }

    const top = platformTopCache[id];
    els.platformTop.replaceChildren(
      renderRanking(`Top 10 filmes em alta na ${platform.name}`, top.movies),
      renderRanking(`Top 10 séries em alta na ${platform.name}`, top.series)
    );
  }

  function renderRanking(title, items) {
    return el('section', { className: 'ranking' }, [
      el('h2', { className: 'ranking-title', text: title }),
      items.length
        ? el('ol', { className: 'ranking-list' }, items.map((item, index) =>
          el('li', { className: 'ranking-item' }, [
            el('span', { className: 'rank', 'aria-hidden': 'true', text: String(index + 1) }),
            el('span', { className: 'visually-hidden', text: `${index + 1}º lugar: ` }),
            createCard(item, 'compact')
          ])
        ))
        : el('p', { className: 'muted', text: 'Nenhum título encontrado nesta plataforma.' })
    ]);
  }

  function createCard(item, extraClass = '', options = {}) {
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

  // ---------- Domínio público (Internet Archive) ----------

  function archiveThumb(id) {
    return `https://archive.org/services/img/${encodeURIComponent(id)}`;
  }

  function createPublicCard(item) {
    return el('article', { className: 'card public-card' }, [
      el('button', { type: 'button', className: 'card-open', onclick: () => openTitle(item) }, [
        el('span', { className: 'public-thumb' }, [
          el('img', { className: 'card-poster', src: archiveThumb(item.id), alt: '', loading: 'lazy', width: '180', height: '270' }),
          el('span', { className: 'public-play', 'aria-hidden': 'true', text: '▶' })
        ]),
        el('span', { className: 'card-title', text: item.title }),
        el('span', { className: 'card-meta', text: ['Domínio público', item.year].filter(Boolean).join(' · ') })
      ])
    ]);
  }

  function renderPublicDetails(data) {
    const item = { ...data, type: 'public' };
    const meta = [data.year, data.runtime, data.director].filter(Boolean).join(' · ');

    const sources = (data.sources || []).filter((source) => isSafeHttpsUrl(source.url));

    return el('div', { className: 'details-content public-details' }, [
      renderPublicPlayer(data, sources),
      el('section', { className: 'details-section' }, [
        el('h2', { id: 'detailsTitle', className: 'public-title', text: data.title }),
        meta ? el('p', { className: 'details-meta', text: meta }) : null,
        sources.length > 1 ? renderPartPicker(sources) : null,
        el('div', { className: 'details-actions' }, [
          el('button', { type: 'button', className: 'action-button', text: 'Copiar link', onclick: () => copyLink(item) }),
          el('a', {
            className: 'action-button',
            href: `https://archive.org/details/${encodeURIComponent(data.id)}`,
            target: '_blank',
            rel: 'noopener noreferrer',
            text: 'Ver no Internet Archive ↗'
          })
        ])
      ]),
      data.description
        ? el('section', { className: 'details-section' }, [
          el('h3', { text: 'Descrição' }),
          el('p', { className: 'overview public-description', text: data.description })
        ])
        : null,
      el('section', { className: 'details-section' }, [
        el('p', { className: 'muted public-legal' }, [
          document.createTextNode('Filme em domínio público, disponibilizado pelo Internet Archive. '),
          isSafeHttpsUrl(data.license) || /^http:\/\/creativecommons\.org\//.test(data.license)
            ? el('a', { href: data.license, target: '_blank', rel: 'noopener noreferrer', text: 'Ver licença' })
            : null
        ])
      ])
    ]);
  }

  function renderPublicPlayer(data, sources) {
    // Native video when the item has an MP4; the Archive's own player covers the rest.
    if (!sources.length) {
      return el('div', { className: 'public-player' }, [
        el('iframe', {
          src: `https://archive.org/embed/${encodeURIComponent(data.id)}`,
          title: `Assistir ${data.title}`,
          allow: 'fullscreen; picture-in-picture',
          allowfullscreen: '',
          referrerpolicy: 'strict-origin-when-cross-origin'
        })
      ]);
    }

    return el('div', { className: 'public-player' }, [
      el('video', {
        id: 'publicVideo',
        src: sources[0].url,
        poster: archiveThumb(data.id),
        controls: '',
        preload: 'metadata',
        playsinline: '',
        'aria-label': `Assistir ${data.title}`
      })
    ]);
  }

  function renderPartPicker(sources) {
    return el('div', { className: 'part-picker', role: 'group', 'aria-label': 'Partes do filme' }, sources.map((source, index) =>
      el('button', {
        type: 'button',
        className: 'segment',
        'aria-pressed': String(index === 0),
        text: source.label,
        onclick: (event) => {
          const video = document.getElementById('publicVideo');
          if (!video || video.getAttribute('src') === source.url) return;
          const wasPlaying = !video.paused;
          video.src = source.url;
          if (wasPlaying) video.play().catch(() => {});
          for (const button of event.currentTarget.parentElement.children) button.setAttribute('aria-pressed', 'false');
          event.currentTarget.setAttribute('aria-pressed', 'true');
        }
      })
    ));
  }

  // ---------- Minha lista ----------

  function loadFavorites() {
    try {
      const parsed = JSON.parse(localStorage.getItem(FAVORITES_KEY));
      if (!Array.isArray(parsed)) return [];
      return parsed.filter(
        (item) =>
          item && (item.type === 'movie' || item.type === 'tv') &&
          Number.isInteger(item.id) && typeof item.title === 'string'
      );
    } catch {
      return [];
    }
  }

  function saveFavorites() {
    try {
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
    } catch {
      showToast('Não foi possível salvar sua lista neste navegador.');
    }
  }

  function itemKey(item) {
    return `${item.type}-${item.id}`;
  }

  function isFavorite(item) {
    return favorites.some((favorite) => itemKey(favorite) === itemKey(item));
  }

  function summarize(item) {
    return {
      id: item.id,
      type: item.type,
      title: item.title,
      year: item.year || '',
      poster: item.poster || null,
      rating: typeof item.rating === 'number' ? item.rating : null
    };
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
    if (view.mode === 'favorites') renderFavorites();
  }

  function favoriteButton(item, variant) {
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

  // ---------- Lembretes ----------

  function loadStoredList(key) {
    try {
      const parsed = JSON.parse(localStorage.getItem(key));
      if (!Array.isArray(parsed)) return [];
      return parsed.filter(
        (item) =>
          item && (item.type === 'movie' || item.type === 'tv') &&
          Number.isInteger(item.id) && typeof item.title === 'string'
      );
    } catch {
      return [];
    }
  }

  function saveStoredList(key, list) {
    try {
      localStorage.setItem(key, JSON.stringify(list));
    } catch {
      showToast('Não foi possível salvar neste navegador.');
    }
  }

  function isReminded(item) {
    return reminders.some((reminder) => itemKey(reminder) === itemKey(item));
  }

  function toggleReminder(item) {
    const summary = summarize(item);
    const adding = !isReminded(summary);

    if (adding) {
      const releaseDate = item.releaseDate || (item.availability && item.availability.release && item.availability.release.date) || null;
      // known stays null until the first check, which records the current state as the baseline.
      reminders = [{ ...summary, releaseDate, known: null }, ...reminders];
      showToast(`Pronto! Vamos avisar aqui quando ${summary.title} estrear ou chegar a uma plataforma.`);
    } else {
      reminders = reminders.filter((reminder) => itemKey(reminder) !== itemKey(summary));
      showToast(`Lembrete de ${summary.title} removido.`);
    }

    saveStoredList(REMINDERS_KEY, reminders);
    for (const button of document.querySelectorAll(`[data-reminder-key="${itemKey(summary)}"]`)) {
      renderReminderButton(button, summary);
    }
    if (view.mode === 'favorites') renderFavorites();
    if (adding) checkReminders();
  }

  function reminderButton(item, variant) {
    const button = el('button', {
      type: 'button',
      className: variant === 'icon' ? 'reminder-button icon' : 'reminder-button full',
      'data-reminder-key': itemKey(item),
      onclick: (event) => {
        event.stopPropagation();
        toggleReminder(item);
      }
    });
    renderReminderButton(button, item);
    return button;
  }

  function renderReminderButton(button, item) {
    const active = isReminded(item);
    button.setAttribute('aria-pressed', String(active));
    button.setAttribute('aria-label', active ? `Remover lembrete de ${item.title}` : `Lembrar de ${item.title}`);
    button.replaceChildren(bellIcon(active));
    if (button.classList.contains('full')) {
      button.append(el('span', { text: active ? 'Lembrete ativado' : 'Lembrar' }));
    }
  }

  function bellIcon(filled) {
    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('width', '18');
    svg.setAttribute('height', '18');
    svg.setAttribute('aria-hidden', 'true');
    const path = document.createElementNS(ns, 'path');
    path.setAttribute('d', 'M12 2a6 6 0 0 0-6 6v3.5L4 15v1h16v-1l-2-3.5V8a6 6 0 0 0-6-6zm0 20a2.5 2.5 0 0 0 2.45-2h-4.9A2.5 2.5 0 0 0 12 22z');
    path.setAttribute('fill', filled ? 'currentColor' : 'none');
    path.setAttribute('stroke', 'currentColor');
    path.setAttribute('stroke-width', '1.8');
    path.setAttribute('stroke-linejoin', 'round');
    svg.append(path);
    return svg;
  }

  function reminderStatus(reminder) {
    const known = reminder.known;
    if (!known) return 'Verificando...';
    if (known.streaming && known.streaming.length) {
      const extra = known.streaming.length - 1;
      return `Disponível em ${known.streaming[0]}${extra > 0 ? ` e mais ${extra}` : ''}`;
    }
    if (!known.released && known.releaseDate) return `Estreia ${formatDate(known.releaseDate)}`;
    if (known.released && known.theatrical && known.releaseDate >= localIsoDate(-90)) return 'Nos cinemas agora';
    if (known.store && known.store.length) return 'Disponível para alugar ou comprar';
    return known.released ? 'Aguardando chegar ao streaming' : 'Aguardando data de estreia';
  }

  async function checkReminders() {
    if (!reminders.length) return;
    if (checkingReminders) {
      recheckQueued = true;
      return;
    }
    checkingReminders = true;
    lastReminderCheck = Date.now();

    try {
      const keys = reminders.map((reminder) => `${reminder.type}:${reminder.id}`).join(',');
      const data = await fetchJson(`/api/reminders/check?items=${encodeURIComponent(keys)}`);
      const newAlerts = [];

      for (const result of data.results) {
        if (result.error) continue;
        const reminder = reminders.find((item) => `${item.type}:${item.id}` === result.key);
        if (!reminder) continue;
        if (reminder.known) newAlerts.push(...reminderChanges(reminder, reminder.known, result));
        reminder.known = {
          released: result.released,
          theatrical: result.theatrical,
          releaseDate: result.releaseDate,
          streaming: result.streaming,
          store: result.store
        };
        reminder.releaseDate = result.releaseDate;
      }

      saveStoredList(REMINDERS_KEY, reminders);
      if (newAlerts.length) {
        alerts = [...newAlerts, ...alerts].slice(0, 30);
        saveStoredList(ALERTS_KEY, alerts);
        renderAlerts();
        showToast(newAlerts.length === 1
          ? `${newAlerts[0].title} ${newAlerts[0].message}`
          : `${newAlerts.length} novidades nos seus lembretes!`);
      }
      if (view.mode === 'favorites') renderFavorites();
    } catch {
      // Offline or server asleep: the next visit checks again.
    } finally {
      checkingReminders = false;
      if (recheckQueued) {
        recheckQueued = false;
        checkReminders();
      }
    }
  }

  function reminderChanges(reminder, known, result) {
    const base = { id: reminder.id, type: reminder.type, title: reminder.title, poster: reminder.poster, at: Date.now() };
    const changes = [];

    if (result.released && !known.released) {
      changes.push({ ...base, message: reminder.type === 'movie' && result.theatrical ? 'estreou nos cinemas!' : 'estreou!' });
    } else if (!result.released && result.releaseDate && known.releaseDate && result.releaseDate !== known.releaseDate) {
      changes.push({ ...base, message: `teve a estreia remarcada para ${formatDate(result.releaseDate)}.` });
    }

    const newStreaming = result.streaming.filter((name) => !(known.streaming || []).includes(name));
    if (newStreaming.length) {
      changes.push({ ...base, message: `chegou em ${joinNames(newStreaming)}!` });
    } else {
      const newStore = result.store.filter((name) => !(known.store || []).includes(name));
      if (newStore.length) changes.push({ ...base, message: `já pode ser alugado ou comprado em ${joinNames(newStore)}.` });
    }
    return changes;
  }

  function renderAlerts() {
    els.alerts.classList.toggle('hidden', !alerts.length);
    els.alertsBadge.classList.toggle('hidden', !alerts.length);
    els.alertsBadge.textContent = alerts.length ? String(alerts.length) : '';
    els.alertsBadge.setAttribute('aria-label', `${formatCount(alerts.length, 'novidade', 'novidades')}`);

    els.alertsList.replaceChildren(...alerts.map((alert, index) => {
      const poster = imageUrl('w92', alert.poster);
      return el('li', { className: 'alert' }, [
        el('button', { type: 'button', className: 'alert-open', onclick: () => openTitle(alert) }, [
          poster
            ? el('img', { className: 'alert-poster', src: poster, alt: '', width: '40', height: '60' })
            : el('span', { className: 'alert-poster placeholder', 'aria-hidden': 'true' }),
          el('span', { className: 'alert-text' }, [el('strong', { text: alert.title }), document.createTextNode(` ${alert.message}`)])
        ]),
        el('button', {
          type: 'button',
          className: 'alert-dismiss',
          'aria-label': `Dispensar aviso de ${alert.title}`,
          text: '×',
          onclick: () => {
            alerts.splice(index, 1);
            saveStoredList(ALERTS_KEY, alerts);
            renderAlerts();
          }
        })
      ]);
    }));
  }

  // ---------- Agenda ----------

  function calendarActions(data) {
    const release = data.availability && data.availability.release;
    if (!release || !release.date || release.date <= localIsoDate()) return [];
    const where = release.kind === 'upcoming_theaters' ? ' nos cinemas' : '';

    return [
      el('a', {
        className: 'action-button',
        href: googleCalendarUrl(data, release.date, where),
        target: '_blank',
        rel: 'noopener noreferrer',
        text: 'Adicionar ao Google Agenda'
      }),
      el('button', {
        type: 'button',
        className: 'action-button',
        text: 'Baixar para a agenda (.ics)',
        onclick: () => downloadCalendarFile(data, release.date, where)
      })
    ];
  }

  function allDayRange(isoDate) {
    const next = new Date(`${isoDate}T00:00:00Z`);
    next.setUTCDate(next.getUTCDate() + 1);
    return [isoDate.replaceAll('-', ''), next.toISOString().slice(0, 10).replaceAll('-', '')];
  }

  function titleLink(item) {
    return `${window.location.origin}${window.location.pathname}${titleHash(item)}`;
  }

  function googleCalendarUrl(item, isoDate, where) {
    const [start, end] = allDayRange(isoDate);
    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: `Estreia${where}: ${item.title}`,
      dates: `${start}/${end}`,
      details: `${item.title} estreia${where} hoje. Veja onde assistir no CineGuia: ${titleLink(item)}`
    });
    return `https://calendar.google.com/calendar/render?${params}`;
  }

  function escapeIcs(text) {
    return text.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
  }

  function downloadCalendarFile(item, isoDate, where) {
    const [start, end] = allDayRange(isoDate);
    const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    const summary = escapeIcs(`Estreia${where}: ${item.title}`);
    const lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//CineGuia//PT-BR',
      'CALSCALE:GREGORIAN',
      'BEGIN:VEVENT',
      `UID:${item.type}-${item.id}-${start}@cineguia`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${start}`,
      `DTEND;VALUE=DATE:${end}`,
      `SUMMARY:${summary}`,
      `DESCRIPTION:${escapeIcs(`Veja onde assistir no CineGuia: ${titleLink(item)}`)}`,
      'BEGIN:VALARM',
      'TRIGGER:PT9H',
      'ACTION:DISPLAY',
      `DESCRIPTION:${summary}`,
      'END:VALARM',
      'END:VEVENT',
      'END:VCALENDAR'
    ];
    const url = URL.createObjectURL(new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' }));
    const link = el('a', { href: url, download: `estreia-${item.type}-${item.id}.ics` });
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    showToast('Evento baixado. Abra o arquivo para adicionar à sua agenda.');
  }

  // ---------- Detalhes e link direto ----------

  function titleHash(item) {
    return `#${TYPE_TO_HASH[item.type]}/${item.id}`;
  }

  function parseTitleHash() {
    const title = window.location.hash.match(/^#(filme|serie)\/(\d{1,10})$/);
    if (title) return { type: HASH_TO_TYPE[title[1]], id: Number(title[2]) };
    const publicDomain = window.location.hash.match(/^#dominio\/([A-Za-z0-9._-]{1,100})$/);
    return publicDomain ? { type: 'public', id: publicDomain[1] } : null;
  }

  function openTitle(item) {
    const hash = titleHash(item);
    if (window.location.hash !== hash) {
      // depth counts titles opened in a row, so closing can step back past all of them at once.
      const depth = els.details.open && history.state && history.state.depth ? history.state.depth + 1 : 1;
      history.pushState({ depth }, '', hash);
    }
    showDetails(item);
  }

  // A shared link lands directly on a title. Putting a plain entry behind it means closing stays on the site.
  function openTitleFromInitialUrl() {
    const target = parseTitleHash();
    if (!target) return;
    const hash = window.location.hash;
    history.replaceState(null, '', window.location.pathname + window.location.search);
    history.pushState({ depth: 1 }, '', hash);
    showDetails(target);
  }

  function syncDetailsWithHash() {
    const target = parseTitleHash();
    if (target) {
      // A hash typed into the address bar has no depth yet; it sits one step above the page behind it.
      if (!(history.state && history.state.depth)) history.replaceState({ depth: 1 }, '', window.location.hash);
      showDetails(target);
    } else if (els.details.open) {
      els.details.close();
      resetDetails();
    }
  }

  function closeDetails() {
    const depth = history.state && history.state.depth;
    if (depth) {
      history.go(-depth);
      return;
    }
    if (els.details.open) els.details.close();
    resetDetails();
    leaveTitleUrl();
  }

  function leaveTitleUrl() {
    if (!parseTitleHash()) return;
    const depth = history.state && history.state.depth;
    if (depth) {
      history.go(-depth);
    } else {
      history.replaceState(null, '', window.location.pathname + window.location.search);
    }
  }

  // Emptying the dialog removes the trailer iframe, which stops the video.
  function resetDetails() {
    detailsRequestId += 1;
    seasonRequestId += 1;
    els.detailsBody.replaceChildren();
    document.title = APP_TITLE;
  }

  async function showDetails(target) {
    const requestId = ++detailsRequestId;
    seasonRequestId += 1;
    els.detailsBody.replaceChildren(
      el('p', { className: 'details-loading', text: target.title ? `Carregando ${target.title}...` : 'Carregando...' })
    );
    if (!els.details.open) els.details.showModal();
    els.details.scrollTop = 0;

    try {
      const isPublic = target.type === 'public';
      const data = await fetchJson(isPublic
        ? `/api/public-domain/${encodeURIComponent(target.id)}`
        : `/api/title/${target.type}/${target.id}`);
      if (requestId !== detailsRequestId) return;
      els.detailsBody.replaceChildren(isPublic ? renderPublicDetails(data) : renderDetails(data));
      els.details.scrollTop = 0;
      document.title = `${data.title} · CineGuia`;
    } catch (error) {
      if (requestId !== detailsRequestId) return;
      els.detailsBody.replaceChildren(el('p', { className: 'details-loading error', text: error.message }));
    }
  }

  function renderDetails(data) {
    const hero = el('div', { className: 'details-hero' });
    const backdropSize = window.innerWidth * (window.devicePixelRatio || 1) > 1280 ? 'original' : 'w1280';
    const backdrop = imageUrl(backdropSize, data.backdrop);
    if (backdrop) hero.style.setProperty('--backdrop', `url("${backdrop}")`);

    const meta = [
      TYPE_LABELS[data.type],
      data.year,
      data.runtime ? formatRuntime(data.runtime) : null,
      data.seasons.length ? formatCount(data.seasons.filter((season) => season.number > 0).length, 'temporada', 'temporadas') : null,
      formatRating(data.rating)
    ].filter(Boolean).join(' · ');

    appendChildren(hero, [
      posterImage(data.poster, `Pôster de ${data.title}`, 'details-poster', '(max-width: 600px) 110px, 150px'),
      el('div', { className: 'details-heading' }, [
        el('h2', { id: 'detailsTitle', text: data.title }),
        data.originalTitle && data.originalTitle !== data.title
          ? el('p', { className: 'original-title', text: data.originalTitle })
          : null,
        el('p', { className: 'details-meta', text: meta }),
        el('div', { className: 'genres' }, data.genres.map((genre) => el('span', { className: 'genre', text: genre }))),
        el('div', { className: 'details-actions' }, [
          favoriteButton(data, 'full'),
          reminderButton(data, 'full'),
          el('button', { type: 'button', className: 'action-button', text: 'Copiar link', onclick: () => copyLink(data) }),
          ...calendarActions(data)
        ])
      ])
    ]);

    return el('div', { className: 'details-content' }, [
      hero,
      el('section', { className: 'details-section' }, [
        el('h3', { text: 'Sinopse' }),
        el('p', { className: 'overview', text: data.overview || 'Sinopse não disponível.' })
      ]),
      renderProviders(data.providers, data.title, data.availability),
      renderTrailer(data.trailer, data.title),
      renderCast(data.cast),
      renderSeasons(data),
      renderRecommendations(data.recommendations)
    ]);
  }

  async function copyLink(item) {
    const link = `${window.location.origin}${window.location.pathname}${titleHash(item)}`;
    try {
      // Some browsers leave writeText pending (e.g. without window focus) instead of rejecting.
      await Promise.race([
        navigator.clipboard.writeText(link),
        new Promise((resolve, reject) => window.setTimeout(() => reject(new Error('timeout')), CLIPBOARD_TIMEOUT_MS))
      ]);
      showToast('Link copiado!');
    } catch {
      showToast(`Copie o link: ${link}`);
    }
  }

  function renderProviders(providers, title, availability) {
    const section = el('section', { className: 'details-section' }, [el('h3', { text: 'Onde assistir no Brasil' })]);
    const groups = PROVIDER_GROUPS.filter(([key]) => providers[key].length);

    if (!groups.length) {
      appendChildren(section, renderUnavailable(availability));
      return section;
    }

    for (const [key, label] of groups) {
      section.append(
        el('div', { className: 'provider-group' }, [
          el('h4', { text: label }),
          el('ul', { className: 'providers' }, providers[key].map((provider) => renderProvider(provider, title)))
        ])
      );
    }

    section.append(el('p', { className: 'providers-hint', text: 'Toque em um serviço para abrir o título na plataforma. Alguns pedem login antes.' }));

    if (isSafeHttpsUrl(providers.link)) {
      section.append(
        el('a', {
          className: 'providers-link',
          href: providers.link,
          target: '_blank',
          rel: 'noopener noreferrer',
          text: 'Ver links diretos para cada serviço ↗'
        })
      );
    }
    return section;
  }

  function describeRelease(release) {
    if (!release) return null;
    const date = formatDate(release.date);
    switch (release.kind) {
      case 'upcoming_theaters': return `Estreia nos cinemas em ${date}.`;
      case 'in_theaters': return `Em cartaz nos cinemas (estreou em ${date}).`;
      case 'upcoming': return `Lançamento previsto para ${date}.`;
      case 'in_production': return 'Em produção, ainda sem data de estreia.';
      default: return null;
    }
  }

  function renderUnavailable(availability) {
    const release = describeRelease(availability && availability.release);
    const abroad = (availability && availability.abroad) || [];

    return [
      release ? el('p', { className: 'release-status', text: release }) : null,
      el('p', {
        className: 'muted',
        text: release
          ? 'Quando chegar a alguma plataforma no Brasil, ela aparece aqui.'
          : 'Ainda não está disponível em nenhuma plataforma no Brasil.'
      }),
      abroad.length
        ? el('div', { className: 'provider-group' }, [
          el('h4', { text: 'Disponível em outros países' }),
          el('ul', { className: 'providers' }, abroad.map((provider) => {
            const logo = imageUrl('w92', provider.logo);
            return el('li', {}, [
              el('span', { className: 'provider abroad' }, [
                logo ? el('img', { src: logo, alt: '', width: '40', height: '40', loading: 'lazy' }) : null,
                el('span', { className: 'abroad-text' }, [
                  el('span', { text: provider.name }),
                  el('span', { className: 'abroad-countries', text: formatCountries(provider.countries) })
                ])
              ])
            ]);
          }))
        ])
        : null
    ];
  }

  function formatCountries(codes) {
    let names;
    try {
      const display = new Intl.DisplayNames(['pt-BR'], { type: 'region' });
      names = codes.map((code) => display.of(code) || code);
    } catch {
      names = codes;
    }
    const shown = names.slice(0, 3).join(', ');
    const rest = names.length - 3;
    return rest > 0 ? `${shown} e mais ${formatCount(rest, 'país', 'países')}` : shown;
  }

  function renderProvider(provider, title) {
    const logo = imageUrl('w92', provider.logo);
    const content = [
      logo ? el('img', { src: logo, alt: '', width: '40', height: '40', loading: 'lazy' }) : null,
      el('span', { text: provider.name })
    ];

    if (!isSafeHttpsUrl(provider.url)) {
      return el('li', {}, [el('span', { className: 'provider' }, content)]);
    }

    return el('li', {}, [
      el('a', {
        className: 'provider provider-link',
        href: provider.url,
        target: '_blank',
        rel: 'noopener noreferrer',
        'aria-label': `Ver ${title} em ${provider.name} (abre em nova aba)`
      }, [...content, el('span', { className: 'provider-arrow', 'aria-hidden': 'true', text: '↗' })])
    ]);
  }

  function renderTrailer(trailer, title) {
    if (!trailer || !/^[\w-]{6,20}$/.test(trailer.key)) return null;

    return el('section', { className: 'details-section' }, [
      el('h3', { text: 'Trailer' }),
      el('div', { className: 'trailer' }, [
        el('iframe', {
          src: `https://www.youtube-nocookie.com/embed/${trailer.key}`,
          title: `Trailer de ${title}`,
          loading: 'lazy',
          allow: 'encrypted-media; picture-in-picture; fullscreen',
          allowfullscreen: '',
          referrerpolicy: 'strict-origin-when-cross-origin'
        })
      ])
    ]);
  }

  function renderCast(cast) {
    if (!cast.length) return null;

    return el('section', { className: 'details-section' }, [
      el('h3', { text: 'Elenco' }),
      el('ul', { className: 'cast' }, cast.map((person) => {
        const photo = imageUrl('w185', person.photo);
        return el('li', { className: 'person' }, [
          photo
            ? el('img', { className: 'person-photo', src: photo, alt: '', loading: 'lazy', width: '185', height: '278' })
            : el('div', { className: 'person-photo placeholder', text: initials(person.name), 'aria-hidden': 'true' }),
          el('span', { className: 'person-name', text: person.name }),
          person.character ? el('span', { className: 'person-role', text: person.character }) : null
        ]);
      }))
    ]);
  }

  function renderSeasons(data) {
    if (data.type !== 'tv' || !data.seasons.length) return null;

    const selectId = `season-select-${data.id}`;
    const select = el('select', { id: selectId, className: 'season-select' }, data.seasons.map((season) =>
      el('option', {
        value: String(season.number),
        text: `${season.name}${season.episodeCount ? ` (${formatCount(season.episodeCount, 'episódio', 'episódios')})` : ''}`
      })
    ));
    const episodes = el('ol', { className: 'episodes' });
    select.addEventListener('change', () => loadSeason(data.id, select.value, episodes));
    loadSeason(data.id, select.value, episodes);

    return el('section', { className: 'details-section' }, [
      el('div', { className: 'section-header' }, [
        el('h3', { text: 'Temporadas e episódios' }),
        el('label', { className: 'visually-hidden', for: selectId, text: 'Escolher temporada' }),
        select
      ]),
      episodes
    ]);
  }

  async function loadSeason(tvId, seasonNumber, container) {
    const requestId = ++seasonRequestId;
    container.replaceChildren(el('li', { className: 'muted', text: 'Carregando episódios...' }));

    try {
      const season = await fetchJson(`/api/title/tv/${tvId}/season/${seasonNumber}`);
      if (requestId !== seasonRequestId) return;
      if (!season.episodes.length) {
        container.replaceChildren(el('li', { className: 'muted', text: 'Nenhum episódio cadastrado nesta temporada.' }));
        return;
      }
      container.replaceChildren(...season.episodes.map(renderEpisode));
    } catch (error) {
      if (requestId !== seasonRequestId) return;
      container.replaceChildren(el('li', { className: 'muted error', text: error.message }));
    }
  }

  function renderEpisode(episode) {
    const still = imageUrl('w300', episode.still);
    const meta = [formatDate(episode.airDate), episode.runtime ? formatRuntime(episode.runtime) : null].filter(Boolean).join(' · ');

    return el('li', { className: 'episode' }, [
      still
        ? el('img', { className: 'episode-still', src: still, alt: '', loading: 'lazy', width: '300', height: '169' })
        : el('div', { className: 'episode-still placeholder', 'aria-hidden': 'true', text: `E${episode.number}` }),
      el('div', { className: 'episode-info' }, [
        el('h4', { text: `${episode.number}. ${episode.name}` }),
        meta ? el('p', { className: 'episode-meta', text: meta }) : null,
        episode.overview ? el('p', { className: 'episode-overview', text: episode.overview }) : null
      ])
    ]);
  }

  function renderRecommendations(items) {
    if (!items.length) return null;

    return el('section', { className: 'details-section' }, [
      el('h3', { text: 'Quem viu isso também gostou de' }),
      el('div', { className: 'recommendations' }, items.map((item) => createCard(item, 'compact')))
    ]);
  }

  // ---------- Tema ----------

  function currentTheme() {
    return document.documentElement.dataset.theme ||
      (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
  }

  function toggleTheme() {
    const next = currentTheme() === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {
      // Storage blocked: the theme still applies for this visit.
    }
    renderThemeToggle();
  }

  function renderThemeToggle() {
    const dark = currentTheme() === 'dark';
    els.themeToggle.textContent = dark ? '☀' : '☾';
    els.themeToggle.setAttribute('aria-label', dark ? 'Mudar para tema claro' : 'Mudar para tema escuro');
    els.themeToggle.title = els.themeToggle.getAttribute('aria-label');
  }

  // ---------- Utilidades ----------

  async function fetchJson(url) {
    let response;
    try {
      response = await fetch(url);
    } catch {
      throw new Error('Não foi possível conectar ao servidor.');
    }
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.error || `Erro ${response.status}`);
    return body;
  }

  function setStatus(message, isError = false) {
    els.status.textContent = message;
    els.status.classList.toggle('error', isError);
  }

  function showToast(message) {
    els.toast.textContent = message;
    els.toast.classList.remove('hidden');
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => els.toast.classList.add('hidden'), TOAST_MS);
  }

  function isValidImagePath(filePath) {
    return typeof filePath === 'string' && /^\/[\w.-]+$/.test(filePath);
  }

  function imageUrl(size, filePath) {
    return isValidImagePath(filePath) ? `${IMAGE_BASE}${size}${filePath}` : null;
  }

  function posterImage(filePath, alt, className, sizes) {
    if (!isValidImagePath(filePath)) return null;
    return el('img', {
      className,
      src: imageUrl('w342', filePath),
      srcset: POSTER_WIDTHS.map((width) => `${imageUrl(`w${width}`, filePath)} ${width}w`).join(', '),
      sizes,
      alt,
      loading: 'lazy',
      width: '342',
      height: '513'
    });
  }

  function isSafeHttpsUrl(value) {
    try {
      return new URL(value).protocol === 'https:';
    } catch {
      return false;
    }
  }

  function formatRating(rating) {
    return typeof rating === 'number' && rating > 0 ? `★ ${rating.toFixed(1)}` : null;
  }

  function formatRuntime(minutes) {
    const hours = Math.floor(minutes / 60);
    const rest = minutes % 60;
    return hours ? `${hours}h${rest ? ` ${rest}min` : ''}` : `${rest}min`;
  }

  function formatCount(count, singular, plural) {
    return `${count} ${count === 1 ? singular : plural}`;
  }

  function localIsoDate(offsetDays = 0) {
    const date = new Date();
    date.setDate(date.getDate() + offsetDays);
    const pad = (value) => String(value).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  }

  function joinNames(names) {
    return names.length <= 1 ? names.join('') : `${names.slice(0, -1).join(', ')} e ${names[names.length - 1]}`;
  }

  function formatDate(isoDate) {
    if (!isoDate) return null;
    const date = new Date(`${isoDate}T00:00:00`);
    return Number.isNaN(date.getTime()) ? null : date.toLocaleDateString('pt-BR');
  }

  function initials(name) {
    return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0].toUpperCase()).join('');
  }

  function el(tag, props = {}, children = []) {
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

  function appendChildren(node, children) {
    for (const child of [].concat(children)) {
      if (child) node.append(child);
    }
  }
}());
