import { el, els, appendChildren } from './dom.js';
import { TYPE_LABELS, itemKey, imageUrl, posterImage, formatCount, formatDate, localIsoDate } from './utils.js';
import { fetchJson } from './api.js';
import { isWatched, watchedButton } from './watched.js';
import { openTitle } from './router.js';

let sagaList = null;
let requestCounter = 0;

export async function renderSagaList() {
  const requestId = ++requestCounter;
  els.sagaSearchInput.value = '';

  if (!sagaList) {
    els.sagaStatus.textContent = 'Carregando sagas...';
    try {
      sagaList = await fetchJson('/api/sagas');
    } catch (error) {
      if (requestId === requestCounter) els.sagaStatus.textContent = error.message;
      return;
    }
    if (requestId !== requestCounter) return;
  }

  els.sagaStatus.textContent = '';
  els.sagaCuratedSection.classList.toggle('hidden', !sagaList.curated.length);
  els.sagaCurated.replaceChildren(...sagaList.curated.map((saga) => createSagaCard({
    id: saga.id,
    name: saga.name,
    poster: saga.poster,
    meta: [
      saga.movies ? formatCount(saga.movies, 'filme', 'filmes') : null,
      saga.series ? formatCount(saga.series, 'série', 'séries') : null,
      saga.years
    ].filter(Boolean).join(' · '),
    badge: saga.movies && saga.series ? 'Filmes + séries' : saga.movies ? 'Filmes' : 'Séries'
  })));
  els.sagaCollectionsTitle.textContent = 'Coleções de filmes por categoria';
  els.sagaCollections.replaceChildren(...sagaList.featured.map((group) =>
    el('section', { className: 'saga-category' }, [
      el('h3', { className: 'saga-category-title', text: `${group.category} (${group.collections.length})` }),
      el('div', { className: 'grid saga-grid' }, group.collections.map((collection) =>
        createSagaCard({ id: collection.id, name: collection.name, poster: collection.poster, meta: 'Coleção de filmes' })
      ))
    ])
  ));
}

export async function searchSagas(query) {
  const requestId = ++requestCounter;
  if (!query) {
    renderSagaList();
    return;
  }

  els.sagaCuratedSection.classList.add('hidden');
  els.sagaCollectionsTitle.textContent = `Sagas encontradas para "${query}"`;
  els.sagaCollections.replaceChildren();
  els.sagaStatus.textContent = 'Buscando...';

  try {
    const data = await fetchJson(`/api/sagas/search?q=${encodeURIComponent(query)}`);
    if (requestId !== requestCounter) return;
    els.sagaStatus.textContent = data.results.length ? '' : `Nenhuma saga encontrada para "${query}".`;
    els.sagaCollections.replaceChildren(el('div', { className: 'grid saga-grid' }, data.results.map((collection) =>
      createSagaCard({ id: collection.id, name: collection.name, poster: collection.poster, meta: 'Coleção de filmes' })
    )));
  } catch (error) {
    if (requestId === requestCounter) els.sagaStatus.textContent = error.message;
  }
}

function createSagaCard(saga) {
  return el('article', { className: 'card saga-card' }, [
    el('button', { type: 'button', className: 'card-open', onclick: () => openTitle({ type: 'saga', id: saga.id, title: saga.name }) }, [
      posterImage(saga.poster, '', 'card-poster', '(max-width: 600px) 34vw, 200px') ||
        el('div', { className: 'card-poster placeholder', text: saga.name }),
      saga.badge ? el('span', { className: 'saga-badge', text: saga.badge }) : null,
      el('span', { className: 'card-title', text: saga.name }),
      el('span', { className: 'card-meta', text: saga.meta })
    ])
  ]);
}

export function renderSaga(data) {
  const movies = data.items.filter((item) => item.type === 'movie').length;
  const series = data.items.filter((item) => item.type === 'tv').length;
  const years = data.items.map((item) => (item.releaseDate || '').slice(0, 4)).filter(Boolean);
  const meta = [
    movies ? formatCount(movies, 'filme', 'filmes') : null,
    series ? formatCount(series, 'série', 'séries') : null,
    years.length ? `${years[0]}–${years[years.length - 1]}` : null
  ].filter(Boolean).join(' · ');

  const hero = el('div', { className: 'details-hero saga-hero' });
  const backdrop = imageUrl('w1280', data.backdrop);
  if (backdrop) hero.style.setProperty('--backdrop', `url("${backdrop}")`);
  appendChildren(hero, [
    posterImage(data.poster || (data.items.find((item) => item.poster) || {}).poster, `Pôster de ${data.name}`, 'details-poster', '(max-width: 600px) 110px, 150px'),
    el('div', { className: 'details-heading' }, [
      el('h2', { id: 'detailsTitle', text: data.name }),
      el('p', { className: 'details-meta', text: meta })
    ])
  ]);

  const timeline = el('ol', { className: 'timeline' });
  const progressText = el('span', { className: 'saga-progress-text' });
  const progressFill = el('span', { className: 'saga-progress-fill' });
  const progress = el('div', { className: 'saga-progress' }, [
    progressText,
    el('span', { className: 'saga-progress-bar', 'aria-hidden': 'true' }, [progressFill])
  ]);
  let order = 'release';
  let subSaga = null;

  // Sub-sagas are the TMDB collections inside a hand-built saga (e.g. Thor inside Marvel).
  const subSagas = [...data.items.reduce((map, item) => {
    if (!item.collection) return map;
    const entry = map.get(item.collection.id) || { id: item.collection.id, name: item.collection.name, count: 0 };
    entry.count += 1;
    return map.set(item.collection.id, entry);
  }, new Map()).values()]
    .filter((entry) => entry.count >= 2)
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

  const visibleItems = () => (subSaga ? data.items.filter((item) => item.collection && item.collection.id === subSaga) : data.items);
  const updateProgress = () => {
    const items = visibleItems();
    const seen = items.filter((item) => isWatched(item)).length;
    const percent = items.length ? Math.round((seen / items.length) * 100) : 0;
    progressText.textContent = `${seen} de ${items.length} assistidos (${percent}%)`;
    progressFill.style.width = `${percent}%`;
  };
  const draw = () => {
    timeline.replaceChildren(...timelineEntries(visibleItems(), order, {
      onWatchedChange: updateProgress,
      onSubSaga: data.hasStoryOrder ? (id) => selectSubSaga(id) : null,
      subSagaIds: new Set(subSagas.map((entry) => entry.id)),
      activeSubSaga: subSaga
    }));
    updateProgress();
  };

  const subSagaFilter = data.hasStoryOrder && subSagas.length
    ? el('div', { className: 'subsaga-filter', role: 'group', 'aria-label': 'Filtrar por sub-saga' }, [
      { id: null, name: 'Todas', count: data.items.length },
      ...subSagas
    ].map((entry) => el('button', {
      type: 'button',
      className: 'subsaga-chip',
      'data-subsaga': entry.id === null ? 'all' : String(entry.id),
      'aria-pressed': String(entry.id === subSaga),
      text: `${entry.id === null ? entry.name : shortCollectionName(entry.name)} (${entry.count})`,
      onclick: () => selectSubSaga(entry.id)
    })))
    : null;

  function selectSubSaga(id) {
    subSaga = id;
    if (subSagaFilter) {
      for (const chip of subSagaFilter.children) {
        chip.setAttribute('aria-pressed', String(chip.dataset.subsaga === (id === null ? 'all' : String(id))));
      }
    }
    draw();
  }

  draw();

  const orderSwitch = data.hasStoryOrder
    ? el('div', { className: 'segmented saga-order', role: 'group', 'aria-label': 'Ordem da linha do tempo' }, [
      ['release', 'Ordem de lançamento'],
      ['story', 'Ordem da história']
    ].map(([value, label]) => el('button', {
      type: 'button',
      className: 'segment',
      'aria-pressed': String(value === order),
      text: label,
      onclick: (event) => {
        if (order === value) return;
        order = value;
        for (const button of event.currentTarget.parentElement.children) button.setAttribute('aria-pressed', 'false');
        event.currentTarget.setAttribute('aria-pressed', 'true');
        draw();
      }
    })))
    : null;

  return el('div', { className: 'details-content' }, [
    hero,
    data.description
      ? el('section', { className: 'details-section' }, [el('p', { className: 'overview', text: data.description })])
      : null,
    el('section', { className: 'details-section' }, [
      el('div', { className: 'section-header' }, [el('h3', { text: 'Linha do tempo' }), orderSwitch]),
      subSagaFilter,
      progress,
      timeline
    ])
  ]);
}

function shortCollectionName(name) {
  return name.replace(/\s*[:-]?\s*Coleção\s*$/i, '').replace(/^Coleção\s+/i, '').trim() || name;
}

function timelineEntries(items, order, { onWatchedChange, onSubSaga, subSagaIds = new Set(), activeSubSaga = null } = {}) {
  const today = localIsoDate();
  const sorted = order === 'story' ? [...items].sort((a, b) => a.storyOrder - b.storyOrder) : items;
  const entries = [];
  let lastYear = null;

  sorted.forEach((item, index) => {
    const year = item.releaseDate ? item.releaseDate.slice(0, 4) : 'Sem data';
    if (order === 'release' && year !== lastYear) {
      entries.push(el('li', { className: 'timeline-year', 'aria-hidden': 'true', text: year }));
      lastYear = year;
    }

    const upcoming = !item.releaseDate || item.releaseDate > today;
    const dateText = item.releaseDate ? formatDate(item.releaseDate) : 'Data a definir';
    const poster = imageUrl('w154', item.poster);

    const marker = el('span', { className: 'timeline-marker', 'data-watched-marker': itemKey(item), text: String(index + 1) });
    marker.classList.toggle('watched', isWatched(item));

    entries.push(el('li', { className: 'timeline-item' }, [
      marker,
      el('div', { className: 'timeline-card' }, [
        el('button', {
          type: 'button',
          className: 'timeline-open',
          onclick: () => openTitle({ type: item.type, id: item.id, title: item.title, poster: item.poster })
        }, [
          poster
            ? el('img', { className: 'timeline-poster', src: poster, alt: '', loading: 'lazy', width: '154', height: '231' })
            : el('span', { className: 'timeline-poster placeholder', 'aria-hidden': 'true' }),
          el('span', { className: 'timeline-info' }, [
            el('span', { className: 'timeline-title', text: item.title }),
            el('span', { className: 'timeline-meta' }, [
              el('span', { className: `type-badge ${item.type}`, text: TYPE_LABELS[item.type] }),
              document.createTextNode(` ${dateText}`),
              upcoming ? el('span', { className: 'upcoming-badge', text: 'Em breve' }) : null
            ]),
            item.overview ? el('span', { className: 'timeline-overview', text: item.overview }) : null
          ])
        ]),
        el('div', { className: 'timeline-actions' }, [
          watchedButton(item, onWatchedChange),
          onSubSaga && item.collection && subSagaIds.has(item.collection.id) && item.collection.id !== activeSubSaga
            ? el('button', {
              type: 'button',
              className: 'link-button subsaga-link',
              text: `Ver só ${shortCollectionName(item.collection.name)}`,
              onclick: () => onSubSaga(item.collection.id)
            })
            : null
        ])
      ])
    ]));
  });

  return entries;
}

export function renderSagaLinks(sagas) {
  if (!sagas || !sagas.length) return null;
  return el('section', { className: 'details-section' }, [
    el('h3', { text: 'Faz parte de' }),
    el('ul', { className: 'saga-links' }, sagas.map((saga) => el('li', {}, [
      el('button', {
        type: 'button',
        className: 'saga-link',
        onclick: () => openTitle({ type: 'saga', id: saga.id, title: saga.name })
      }, [
        el('span', { className: 'saga-link-name', text: saga.name }),
        el('span', {
          className: 'saga-link-meta',
          text: saga.position ? `${saga.position}º de ${saga.total} na ordem da história · Ver linha do tempo →` : 'Ver linha do tempo →'
        })
      ])
    ])))
  ]);
}
