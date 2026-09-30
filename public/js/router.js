import { el, els } from './dom.js';
import { APP_TITLE } from './state.js';
import { fetchJson } from './api.js';
import { renderDetails, invalidateSeasonLoads } from './details.js';
import { renderPublicDetails } from './public-domain.js';
import { renderSaga } from './sagas.js';

const TYPE_TO_HASH = { movie: 'filme', tv: 'serie', public: 'dominio', saga: 'saga' };
const HASH_TO_TYPE = { filme: 'movie', serie: 'tv', dominio: 'public', saga: 'saga' };

let detailsRequestId = 0;

function titleHash(item) {
  return `#${TYPE_TO_HASH[item.type]}/${item.id}`;
}

export function titleLink(item) {
  return `${window.location.origin}${window.location.pathname}${titleHash(item)}`;
}

function parseTitleHash() {
  const title = window.location.hash.match(/^#(filme|serie)\/(\d{1,10})$/);
  if (title) return { type: HASH_TO_TYPE[title[1]], id: Number(title[2]) };
  const publicDomain = window.location.hash.match(/^#dominio\/([A-Za-z0-9._-]{1,100})$/);
  if (publicDomain) return { type: 'public', id: publicDomain[1] };
  // Numeric ids are TMDB collections; slugs are the hand-built sagas.
  const saga = window.location.hash.match(/^#saga\/([a-z0-9-]{1,40})$/);
  return saga ? { type: 'saga', id: /^\d+$/.test(saga[1]) ? Number(saga[1]) : saga[1] } : null;
}

export function openTitle(item) {
  const hash = titleHash(item);
  if (window.location.hash !== hash) {
    // depth counts titles opened in a row, so closing can step back past all of them at once.
    const depth = els.details.open && history.state && history.state.depth ? history.state.depth + 1 : 1;
    history.pushState({ depth }, '', hash);
  }
  showDetails(item);
}

// A shared link lands directly on a title. Putting a plain entry behind it means closing stays on the site.
export function openTitleFromInitialUrl() {
  const target = parseTitleHash();
  if (!target) return;
  const hash = window.location.hash;
  history.replaceState(null, '', window.location.pathname + window.location.search);
  history.pushState({ depth: 1 }, '', hash);
  showDetails(target);
}

export function syncDetailsWithUrl() {
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

export function closeDetails() {
  const depth = history.state && history.state.depth;
  if (depth) {
    history.go(-depth);
    return;
  }
  if (els.details.open) els.details.close();
  resetDetails();
  leaveTitleUrl();
}

export function leaveTitleUrl() {
  if (!parseTitleHash()) return;
  const depth = history.state && history.state.depth;
  if (depth) {
    history.go(-depth);
  } else {
    history.replaceState(null, '', window.location.pathname + window.location.search);
  }
}

// Emptying the dialog removes the trailer iframe, which stops the video.
export function resetDetails() {
  detailsRequestId += 1;
  invalidateSeasonLoads();
  els.detailsBody.replaceChildren();
  document.title = APP_TITLE;
}

async function showDetails(target) {
  const requestId = ++detailsRequestId;
  invalidateSeasonLoads();
  els.detailsBody.replaceChildren(
    el('p', { className: 'details-loading', text: target.title ? `Carregando ${target.title}...` : 'Carregando...' })
  );
  if (!els.details.open) els.details.showModal();
  els.details.scrollTop = 0;

  try {
    let url = `/api/title/${target.type}/${target.id}`;
    let render = renderDetails;
    if (target.type === 'public') {
      url = `/api/public-domain/${encodeURIComponent(target.id)}`;
      render = renderPublicDetails;
    } else if (target.type === 'saga') {
      url = typeof target.id === 'number' ? `/api/saga/collection/${target.id}` : `/api/saga/curated/${target.id}`;
      render = renderSaga;
    }

    const data = await fetchJson(url);
    if (requestId !== detailsRequestId) return;
    els.detailsBody.replaceChildren(render(data));
    els.details.scrollTop = 0;
    document.title = `${data.title || data.name} · CineGuia`;
  } catch (error) {
    if (requestId !== detailsRequestId) return;
    els.detailsBody.replaceChildren(el('p', { className: 'details-loading error', text: error.message }));
  }
}
