import { el, els, setStatus } from './dom.js';
import { imageUrl } from './utils.js';
import { fetchJson } from './api.js';
import { createCard } from './cards.js';

const PLATFORM_KEY = 'cineguia-plataforma';

const topCache = {};
let platforms = null;
let selectedPlatformId = readStoredPlatform();
let requestCounter = 0;

function readStoredPlatform() {
  try {
    return Number(localStorage.getItem(PLATFORM_KEY)) || null;
  } catch {
    return null;
  }
}

export async function renderPlatforms() {
  const requestId = ++requestCounter;

  if (!platforms) {
    setStatus('Carregando plataformas...');
    try {
      platforms = (await fetchJson('/api/platforms')).platforms;
    } catch (error) {
      if (requestId === requestCounter) setStatus(error.message, true);
      return;
    }
    if (requestId !== requestCounter) return;
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
  const requestId = ++requestCounter;
  const platform = platforms.find((item) => item.id === id);

  if (!topCache[id]) {
    els.platformTop.replaceChildren(el('p', { className: 'muted', text: `Carregando o Top 10 de ${platform.name}...` }));
    try {
      topCache[id] = await fetchJson(`/api/platform-top?provider=${id}`);
    } catch (error) {
      if (requestId === requestCounter) {
        els.platformTop.replaceChildren(el('p', { className: 'muted error', text: error.message }));
      }
      return;
    }
    if (requestId !== requestCounter) return;
  }

  const top = topCache[id];
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
