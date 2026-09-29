// Builds data/sagas.json from scripts/sagas-source.js by looking up every title on TMDB.
// Usage: npm run sagas   (needs TMDB_API_KEY in .env)
const fs = require('fs');
const path = require('path');
const { curated, featuredCollections } = require('./sagas-source');

try {
  process.loadEnvFile(path.join(__dirname, '..', '.env'));
} catch {
  // The key may come from the environment instead.
}

const KEY = (process.env.TMDB_API_KEY || '').trim();
const BASE = process.env.TMDB_API_BASE || 'https://api.themoviedb.org/3';
const OUTPUT = path.join(__dirname, '..', 'data', 'sagas.json');

if (!KEY) {
  console.error('TMDB_API_KEY não definida. Crie o arquivo .env (veja .env.example).');
  process.exit(1);
}

async function tmdb(endpoint, params) {
  const url = new URL(BASE + endpoint);
  for (const [key, value] of Object.entries({ language: 'pt-BR', ...params })) url.searchParams.set(key, value);
  const headers = { accept: 'application/json' };
  if (KEY.startsWith('eyJ')) headers.authorization = `Bearer ${KEY}`;
  else url.searchParams.set('api_key', KEY);
  const response = await fetch(url, { headers });
  if (!response.ok) throw new Error(`TMDB ${response.status} em ${endpoint}`);
  return response.json();
}

const normalize = (text) => String(text || '').toLowerCase().normalize('NFD').replace(/[^a-z0-9]/g, '');

async function resolveItem(item) {
  const isMovie = item.type === 'movie';
  const data = await tmdb(isMovie ? '/search/movie' : '/search/tv', {
    query: item.title,
    [isMovie ? 'primary_release_year' : 'first_air_date_year']: String(item.year)
  });
  const results = data.results || [];
  const wanted = normalize(item.title);
  const exact = results.find((result) => normalize(isMovie ? result.original_title : result.original_name) === wanted);
  const match = exact || results[0];
  if (!match) return { problem: 'não encontrado' };

  // Movies record their TMDB collection, used to filter a saga by sub-saga (e.g. only Thor).
  let collection = null;
  if (isMovie) {
    const details = await tmdb(`/movie/${match.id}`, {});
    if (details.belongs_to_collection) {
      collection = { id: details.belongs_to_collection.id, name: details.belongs_to_collection.name };
    }
  }

  return {
    problem: exact ? null : `sem correspondência exata, usando "${isMovie ? match.original_title : match.original_name}"`,
    entry: {
      type: item.type,
      id: match.id,
      title: isMovie ? match.title : match.name,
      originalTitle: isMovie ? match.original_title : match.original_name,
      releaseDate: (isMovie ? match.release_date : match.first_air_date) || null,
      poster: match.poster_path || null,
      overview: match.overview || '',
      collection
    }
  };
}

async function resolveCollection(name) {
  const base = name.replace(/\s+Collection$/i, '');
  const wanted = [normalize(name), normalize(base)];
  const seen = [];

  for (const query of [name, base]) {
    const results = (await tmdb('/search/collection', { query })).results || [];
    seen.push(...results.map((result) => result.original_name || result.name));
    const exact = results.find((result) => wanted.includes(normalize(result.original_name || result.name)));
    if (exact) return { match: exact };
    // Brazilian collections are often named in Portuguese ("... - Coleção"); accept them for review.
    const close = results.find((result) => normalize(result.original_name || result.name).startsWith(normalize(base)));
    if (close) return { match: close, approximate: true };
  }
  return { seen: [...new Set(seen)].slice(0, 5) };
}

async function main() {
  const problems = [];
  const sagas = [];

  for (const saga of curated) {
    const items = [];
    for (const [index, item] of saga.items.entries()) {
      const { problem, entry } = await resolveItem(item);
      const label = `${saga.slug}: ${item.title} (${item.year})`;
      if (problem) problems.push(`${label} -> ${problem}`);
      if (entry) {
        items.push({ ...entry, storyOrder: index + 1 });
        console.log(`${problem ? '??' : 'ok'} ${label} -> ${entry.type}/${entry.id} "${entry.title}" ${entry.releaseDate || 'sem data'}`);
      }
    }
    sagas.push({ slug: saga.slug, name: saga.name, description: saga.description, items });
  }

  const featured = [];
  const usedIds = new Set();
  for (const group of featuredCollections) {
    const collections = [];
    for (const name of group.names) {
      // The first search result is often a spin-off ("The Making of..."), so only exact names are taken as-is.
      const { match, approximate, seen } = await resolveCollection(name);
      if (!match) {
        problems.push(`coleção "${name}" não encontrada (resultados: ${seen.join(' | ') || 'nenhum'})`);
        continue;
      }
      if (usedIds.has(match.id)) continue;
      usedIds.add(match.id);
      if (approximate) problems.push(`coleção "${name}" aproximada -> "${match.original_name || match.name}" (${match.id})`);
      collections.push({ id: match.id, name: match.name, poster: match.poster_path || null, backdrop: match.backdrop_path || null });
      console.log(`${approximate ? '??' : 'ok'} coleção "${name}" -> ${match.id} "${match.name}"`);
    }
    featured.push({ category: group.category, collections });
  }

  fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
  fs.writeFileSync(OUTPUT, `${JSON.stringify({ generatedAt: new Date().toISOString().slice(0, 10), curated: sagas, featured }, null, 2)}\n`);

  console.log(`\nArquivo gerado: ${path.relative(process.cwd(), OUTPUT)}`);
  if (problems.length) {
    console.log(`\nConfira ${problems.length} item(ns):`);
    for (const problem of problems) console.log(`  - ${problem}`);
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
