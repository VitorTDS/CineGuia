const http = require('http');
const fs = require('fs');
const path = require('path');

try {
  process.loadEnvFile(path.join(__dirname, '.env'));
} catch {
  // Without .env the key can still come from the real environment.
}

const PORT = Number(process.env.PORT) || 3000;
const TMDB_API_KEY = (process.env.TMDB_API_KEY || '').trim();
const TMDB_API_BASE = process.env.TMDB_API_BASE || 'https://api.themoviedb.org/3';
const LANGUAGE = 'pt-BR';
const REGION = 'BR';
const MAX_PAGE = 500;
const CACHE_TTL_MS = 10 * 60 * 1000;
const CACHE_MAX_ENTRIES = 500;
const PUBLIC_DIR = path.join(__dirname, 'public');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

const SECURITY_HEADERS = {
  'Content-Security-Policy':
    "default-src 'self'; img-src 'self' https://image.tmdb.org data:; frame-src https://www.youtube-nocookie.com; object-src 'none'; base-uri 'none'; form-action 'self'",
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin'
};

const CATEGORY_TYPES = { movies: 'movie', series: 'tv' };
const RELEASE_DATE_FIELDS = { movie: 'primary_release_date', tv: 'first_air_date' };
const CREDITS_KEYS = { movie: 'credits', tv: 'aggregate_credits' };
const MIN_VOTES_FOR_RATING_FILTER = 100;
const CAST_LIMIT = 15;
const RECOMMENDATIONS_LIMIT = 12;

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const cache = new Map();

async function tmdbGet(endpoint, params = {}) {
  if (!TMDB_API_KEY) {
    throw new HttpError(500, 'Chave do TMDB não configurada. Crie o arquivo .env com TMDB_API_KEY=sua_chave.');
  }

  const url = new URL(TMDB_API_BASE + endpoint);
  for (const [key, value] of Object.entries({ language: LANGUAGE, ...params })) {
    url.searchParams.set(key, value);
  }

  const cacheKey = url.toString();
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.data;

  const headers = { accept: 'application/json' };
  // TMDB accepts either a v4 read access token (a JWT, starts with "eyJ") or a v3 api_key.
  if (TMDB_API_KEY.startsWith('eyJ')) {
    headers.authorization = `Bearer ${TMDB_API_KEY}`;
  } else {
    url.searchParams.set('api_key', TMDB_API_KEY);
  }

  let response;
  try {
    response = await fetch(url, { headers, signal: AbortSignal.timeout(10000) });
  } catch {
    throw new HttpError(502, 'Não foi possível conectar ao TMDB. Verifique sua internet.');
  }

  if (response.status === 401) throw new HttpError(500, 'Chave do TMDB inválida. Confira o TMDB_API_KEY no arquivo .env.');
  if (response.status === 404) throw new HttpError(404, 'Título não encontrado.');
  if (response.status === 429) throw new HttpError(503, 'Muitas requisições ao TMDB. Tente novamente em alguns segundos.');
  if (!response.ok) throw new HttpError(502, `O TMDB respondeu com erro ${response.status}.`);

  const data = await response.json();
  if (cache.size >= CACHE_MAX_ENTRIES) cache.delete(cache.keys().next().value);
  cache.set(cacheKey, { data, expiresAt: Date.now() + CACHE_TTL_MS });
  return data;
}

function parsePage(value) {
  const page = Number.parseInt(value, 10);
  return Number.isInteger(page) && page >= 1 ? Math.min(page, MAX_PAGE) : 1;
}

function toSummary(item, type) {
  return {
    id: item.id,
    type,
    title: item.title || item.name || 'Sem título',
    year: (item.release_date || item.first_air_date || '').slice(0, 4),
    poster: item.poster_path || null,
    rating: typeof item.vote_average === 'number' ? item.vote_average : null
  };
}

function toPageResult(data, items) {
  return {
    page: data.page,
    totalPages: Math.min(data.total_pages || 1, MAX_PAGE),
    results: items
  };
}

function parseYear(value) {
  const year = Number.parseInt(value, 10);
  return Number.isInteger(year) && year >= 1870 && year <= 2100 ? year : null;
}

async function handleList(searchParams) {
  const page = parsePage(searchParams.get('page'));
  const type = CATEGORY_TYPES[searchParams.get('category')];

  if (!type) {
    const data = await tmdbGet('/trending/all/week', { page });
    const items = data.results
      .filter((item) => item.media_type === 'movie' || item.media_type === 'tv')
      .map((item) => toSummary(item, item.media_type));
    return toPageResult(data, items);
  }

  const params = { page, sort_by: 'popularity.desc', include_adult: 'false' };
  const dateField = RELEASE_DATE_FIELDS[type];

  const genre = searchParams.get('genre') || '';
  if (/^\d{1,7}$/.test(genre)) params.with_genres = genre;

  const from = parseYear(searchParams.get('from'));
  const to = parseYear(searchParams.get('to'));
  if (from) params[`${dateField}.gte`] = `${from}-01-01`;
  if (to) params[`${dateField}.lte`] = `${to}-12-31`;

  const rating = Number(searchParams.get('rating'));
  if (Number.isFinite(rating) && rating > 0 && rating < 10) {
    params['vote_average.gte'] = String(rating);
    // Without a vote floor, titles with a single 10/10 vote dominate the results.
    params['vote_count.gte'] = String(MIN_VOTES_FOR_RATING_FILTER);
  }

  if (type === 'tv') params.include_null_first_air_dates = 'false';

  const data = await tmdbGet(`/discover/${type}`, params);
  return toPageResult(data, data.results.map((item) => toSummary(item, type)));
}

async function handleGenres(type) {
  const data = await tmdbGet(`/genre/${type}/list`);
  return { genres: (data.genres || []).map((genre) => ({ id: genre.id, name: genre.name })) };
}

async function handleSearch(searchParams) {
  const query = (searchParams.get('q') || '').trim().slice(0, 100);
  if (!query) throw new HttpError(400, 'Digite algo para buscar.');

  const data = await tmdbGet('/search/multi', {
    query,
    include_adult: 'false',
    page: parsePage(searchParams.get('page'))
  });
  const items = data.results
    .filter((item) => item.media_type === 'movie' || item.media_type === 'tv')
    .map((item) => toSummary(item, item.media_type));
  return toPageResult(data, items);
}

function pickTrailer(videos) {
  const youtube = (videos && videos.results ? videos.results : []).filter((video) => video.site === 'YouTube');
  const byPreference = (list) =>
    list.find((video) => video.iso_639_1 === 'pt' && video.official) ||
    list.find((video) => video.iso_639_1 === 'pt') ||
    list.find((video) => video.official) ||
    list[0];

  const trailer =
    byPreference(youtube.filter((video) => video.type === 'Trailer')) ||
    byPreference(youtube.filter((video) => video.type === 'Teaser'));
  return trailer ? { key: trailer.key, name: trailer.name } : null;
}

// TMDB has no per-title deep links, so known platforms open their own search for the title.
const PROVIDER_SEARCH_URLS = [
  { match: /netflix/i, url: (q) => `https://www.netflix.com/search?q=${q}` },
  { match: /prime video|amazon video/i, url: (q) => `https://www.primevideo.com/search?phrase=${q}` },
  { match: /^apple tv/i, url: (q) => `https://tv.apple.com/br/search?term=${q}` },
  { match: /google play/i, url: (q) => `https://play.google.com/store/search?q=${q}&c=movies` },
  { match: /youtube/i, url: (q) => `https://www.youtube.com/results?search_query=${q}` },
  { match: /crunchyroll/i, url: (q) => `https://www.crunchyroll.com/pt-br/search?q=${q}` }
];

function providerUrl(name, title, fallbackLink) {
  const known = PROVIDER_SEARCH_URLS.find((entry) => entry.match.test(name));
  return known ? known.url(encodeURIComponent(title)) : fallbackLink;
}

function mapProviders(list, title, fallbackLink) {
  const seen = new Set();
  return (list || [])
    .sort((a, b) => a.display_priority - b.display_priority)
    .filter((provider) => !seen.has(provider.provider_id) && seen.add(provider.provider_id))
    .map((provider) => ({
      name: provider.provider_name,
      logo: provider.logo_path || null,
      url: providerUrl(provider.provider_name, title, fallbackLink)
    }));
}

function mapCast(credits, type) {
  return ((credits && credits.cast) || []).slice(0, CAST_LIMIT).map((person) => ({
    name: person.name,
    character: type === 'tv' ? (person.roles && person.roles[0] && person.roles[0].character) || '' : person.character || '',
    photo: person.profile_path || null
  }));
}

function mapSeasons(seasons) {
  // Season 0 holds specials; it goes last so the default pick is season 1.
  return (seasons || [])
    .map((season) => ({
      number: season.season_number,
      name: season.name,
      episodeCount: season.episode_count || 0,
      year: (season.air_date || '').slice(0, 4)
    }))
    .sort((a, b) => (a.number === 0) - (b.number === 0) || a.number - b.number);
}

async function handleSeason(id, seasonNumber) {
  const data = await tmdbGet(`/tv/${id}/season/${seasonNumber}`);
  return {
    number: data.season_number,
    name: data.name,
    episodes: (data.episodes || []).map((episode) => ({
      number: episode.episode_number,
      name: episode.name,
      overview: episode.overview || '',
      airDate: episode.air_date || null,
      runtime: episode.runtime || null,
      still: episode.still_path || null
    }))
  };
}

async function handleTitle(type, id) {
  const creditsKey = CREDITS_KEYS[type];
  const data = await tmdbGet(`/${type}/${id}`, {
    append_to_response: `videos,watch/providers,${creditsKey},recommendations`,
    include_video_language: 'pt,en,null'
  });

  let overview = data.overview;
  if (!overview) {
    const english = await tmdbGet(`/${type}/${id}`, { language: 'en-US' });
    overview = english.overview;
  }

  const brazil = (data['watch/providers'] && data['watch/providers'].results && data['watch/providers'].results[REGION]) || {};
  const title = data.title || data.name;
  const watchLink = brazil.link || null;

  return {
    id: data.id,
    type,
    title,
    originalTitle: data.original_title || data.original_name,
    year: (data.release_date || data.first_air_date || '').slice(0, 4),
    overview: overview || '',
    genres: (data.genres || []).map((genre) => genre.name),
    runtime: type === 'movie' ? data.runtime || null : null,
    rating: typeof data.vote_average === 'number' ? data.vote_average : null,
    poster: data.poster_path || null,
    backdrop: data.backdrop_path || null,
    trailer: pickTrailer(data.videos),
    cast: mapCast(data[creditsKey], type),
    seasons: type === 'tv' ? mapSeasons(data.seasons) : [],
    recommendations: ((data.recommendations && data.recommendations.results) || [])
      .filter((item) => !item.media_type || item.media_type === 'movie' || item.media_type === 'tv')
      .slice(0, RECOMMENDATIONS_LIMIT)
      .map((item) => toSummary(item, item.media_type || type)),
    providers: {
      link: watchLink,
      streaming: mapProviders(brazil.flatrate, title, watchLink),
      free: mapProviders([...(brazil.free || []), ...(brazil.ads || [])], title, watchLink),
      rent: mapProviders(brazil.rent, title, watchLink),
      buy: mapProviders(brazil.buy, title, watchLink)
    }
  };
}

async function handleApi(url) {
  if (url.pathname === '/api/list') return handleList(url.searchParams);
  if (url.pathname === '/api/search') return handleSearch(url.searchParams);

  const genres = url.pathname.match(/^\/api\/genres\/(movie|tv)$/);
  if (genres) return handleGenres(genres[1]);

  const season = url.pathname.match(/^\/api\/title\/tv\/(\d{1,10})\/season\/(\d{1,3})$/);
  if (season) return handleSeason(season[1], season[2]);

  const title = url.pathname.match(/^\/api\/title\/(movie|tv)\/(\d{1,10})$/);
  if (title) return handleTitle(title[1], title[2]);

  throw new HttpError(404, 'Rota não encontrada.');
}

function sendJson(res, status, body) {
  res.writeHead(status, { ...SECURITY_HEADERS, 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(body));
}

function serveStatic(url, res) {
  const relative = url.pathname === '/' ? 'index.html' : decodeURIComponent(url.pathname).replace(/^\/+/, '');
  const filePath = path.resolve(PUBLIC_DIR, relative);

  if (!filePath.startsWith(PUBLIC_DIR + path.sep)) {
    res.writeHead(403, SECURITY_HEADERS);
    res.end();
    return;
  }

  fs.readFile(filePath, (error, content) => {
    if (error) {
      res.writeHead(404, { ...SECURITY_HEADERS, 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Não encontrado');
      return;
    }
    const type = MIME_TYPES[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
    res.writeHead(200, { ...SECURITY_HEADERS, 'Content-Type': type });
    res.end(content);
  });
}

const server = http.createServer(async (req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { ...SECURITY_HEADERS, Allow: 'GET, HEAD' });
    res.end();
    return;
  }

  let url;
  try {
    url = new URL(req.url, 'http://localhost');
  } catch {
    res.writeHead(400, SECURITY_HEADERS);
    res.end();
    return;
  }

  if (!url.pathname.startsWith('/api/')) {
    serveStatic(url, res);
    return;
  }

  try {
    sendJson(res, 200, await handleApi(url));
  } catch (error) {
    if (error instanceof HttpError) {
      sendJson(res, error.status, { error: error.message });
    } else {
      console.error(error);
      sendJson(res, 500, { error: 'Erro interno no servidor.' });
    }
  }
});

server.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
  if (!TMDB_API_KEY) console.warn('Aviso: TMDB_API_KEY não definida. Crie o arquivo .env (veja .env.example).');
});
