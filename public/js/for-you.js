import { els } from './dom.js';
import { itemKey } from './utils.js';
import { fetchJson } from './api.js';
import { createCard } from './cards.js';
import { favorites } from './favorites.js';
import { watched, watchedData } from './watched.js';

const SEEDS_LIMIT = 8;

let cached = { signature: null, results: [] };
let requestCounter = 0;

const apiKey = (item) => `${item.type}:${item.id}`;

// Most recent watched titles first, then saved favorites: the titles recommendations are based on.
function seedTitles() {
  const recentWatched = Object.values(watchedData)
    .filter((entry) => entry && watched.has(itemKey(entry)))
    .sort((a, b) => (b.watchedAt || 0) - (a.watchedAt || 0));
  const seen = new Set();
  const seeds = [];
  for (const item of [...recentWatched, ...favorites]) {
    const key = apiKey(item);
    if (seen.has(key)) continue;
    seen.add(key);
    seeds.push(item);
    if (seeds.length === SEEDS_LIMIT) break;
  }
  return seeds;
}

function reasonFor(seedKey, seeds) {
  const seed = seeds.find((item) => apiKey(item) === seedKey);
  if (!seed) return 'Recomendado para você';
  return watched.has(itemKey(seed)) ? `Porque você viu ${seed.title}` : `Porque você salvou ${seed.title}`;
}

// Shown only on the "Em alta" tab, for people who have watched or saved something.
export async function updateForYou(visible) {
  const seeds = visible ? seedTitles() : [];
  if (!seeds.length) {
    requestCounter += 1;
    els.forYou.classList.add('hidden');
    return;
  }

  const exclude = [...new Set([...[...watched].map((key) => key.replace('-', ':')), ...favorites.map(apiKey)])];
  const signature = `${seeds.map(apiKey).join(',')}|${exclude.join(',')}`;
  els.forYou.classList.remove('hidden');

  if (cached.signature === signature) {
    render(cached.results, seeds);
    return;
  }

  const requestId = ++requestCounter;
  els.forYouRow.replaceChildren();
  els.forYouStatus.textContent = 'Buscando recomendações...';
  try {
    const params = new URLSearchParams({ items: seeds.map(apiKey).join(','), exclude: exclude.join(',') });
    const data = await fetchJson(`/api/for-you?${params}`);
    if (requestId !== requestCounter) return;
    cached = { signature, results: data.results };
    render(data.results, seeds);
  } catch {
    if (requestId === requestCounter) els.forYou.classList.add('hidden');
  }
}

function render(results, seeds) {
  els.forYouStatus.textContent = '';
  if (!results.length) {
    els.forYou.classList.add('hidden');
    return;
  }
  els.forYouRow.replaceChildren(...results.map((item) =>
    createCard(item, 'compact', { status: reasonFor(item.because, seeds) })
  ));
}
