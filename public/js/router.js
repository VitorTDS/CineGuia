import { el, els } from './dom.js';
import { APP_TITLE } from './state.js';
import { fetchJson } from './api.js';
import { renderDetails, invalidateSeasonLoads } from './details.js';
import { renderPublicDetails } from './public-domain.js';
import { renderSaga } from './sagas.js';

// Titles open at real paths (/filme/123) so shared links get a preview; the server serves the page for them.
const TYPE_TO_SEGMENT = { movie: 'filme', tv: 'serie', public: 'dominio', saga: 'saga' };
const SEGMENT_TO_TYPE = { filme: 'movie', serie: 'tv', dominio: 'public', saga: 'saga' };
const HOME_PATH = '/';

let detailsRequestId = 0;

function titlePath(item) {
  return `/${TYPE_TO_SEGMENT[item.type]}/${encodeURIComponent(item.id)}`;
}

export function titleLink(item) {
  return `${window.location.origin}${titlePath(item)}`;
}

function parseRoute(segment, rawId) {
  const type = SEGMENT_TO_TYPE[segment];
  if (!type) return null;
  if (type === 'movie' || type === 'tv') return /^\d{1,10}$/.test(rawId) ? { type, id: Number(rawId) } : null;
  if (type === 'public') return /^[A-Za-z0-9._-]{1,100}$/.test(rawId) ? { type, id: rawId } : null;
  // Numeric saga ids are TMDB collections; slugs are the hand-built sagas.
  if (/^\d{1,10}$/.test(rawId)) return { type, id: Number(rawId) };
  return /^[a-z0-9-]{1,40}$/.test(rawId) ? { type, id: rawId } : null;
}

function parseCurrentTitle() {
  const match = window.location.pathname.match(/^\/(filme|serie|dominio|saga)\/([^/]+)\/?$/);
  return match ? parseRoute(match[1], decodeURIComponent(match[2])) : null;
}

// Links shared before the switch to paths look like /#filme/123.
function parseLegacyHash() {
  const match = window.location.hash.match(/^#(filme|serie|dominio|saga)\/([^/]+)$/);
  return match ? parseRoute(match[1], match[2]) : null;
}

function homeUrl() {
  return `${HOME_PATH}${window.location.search}`;
}

export function openTitle(item) {
  const path = titlePath(item);
  if (window.location.pathname !== path) {
    // depth counts titles opened in a row, so closing can step back past all of them at once.
    const depth = els.details.open && history.state && history.state.depth ? history.state.depth + 1 : 1;
    history.pushState({ depth }, '', `${path}${window.location.search}`);
  }
  showDetails(item);
}

// A shared link lands directly on a title. Putting the home page behind it means closing stays on the site.
export function openTitleFromInitialUrl() {
  const target = parseCurrentTitle() || parseLegacyHash();
  if (!target) return;
  history.replaceState(null, '', homeUrl());
  history.pushState({ depth: 1 }, '', `${titlePath(target)}${window.location.search}`);
  showDetails(target);
}

export function syncDetailsWithUrl() {
  const target = parseCurrentTitle();
  if (target) {
    // A title path typed into the address bar has no depth yet; it sits one step above the home page.
    if (!(history.state && history.state.depth)) history.replaceState({ depth: 1 }, '', window.location.href);
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
  if (!parseCurrentTitle()) return;
  const depth = history.state && history.state.depth;
  if (depth) {
    history.go(-depth);
  } else {
    history.replaceState(null, '', homeUrl());
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
