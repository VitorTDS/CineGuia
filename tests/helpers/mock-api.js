// Fake TMDB and Internet Archive used by the test suite, so tests need neither internet nor an API key.
const http = require('http');

const TEST_KEY = 'chave-teste';

function createMockApi() {
  const log = [];
  let phase = 0;
  const day = (offset) => new Date(Date.now() + offset * 864e5).toISOString().slice(0, 10);
  const futureBrDate = () => (phase === 0 ? day(20) : day(-1));

  function list(type, page, prefix, extra = '') {
    return Array.from({ length: 20 }, (_, i) => {
      const id = page * 100 + i;
      const base = { id, poster_path: null, vote_average: 6 + (i % 4) * 0.7 };
      const t = type || (i % 2 ? 'tv' : 'movie');
      const item = t === 'movie'
        ? { ...base, title: `${prefix} Filme ${id}${extra}`, release_date: '2024-05-01' }
        : { ...base, name: `${prefix} Série ${id}${extra}`, first_air_date: '2023-02-10' };
      if (!type) item.media_type = t;
      return item;
    });
  }

  const cast = [
    { name: 'Leonardo DiCaprio', character: 'Cobb', profile_path: null },
    { name: 'Elliot Page', character: 'Ariadne', profile_path: '/elliot.jpg' }
  ];
  const recs = [
    { id: 555, media_type: 'movie', title: 'Tenet', release_date: '2020-08-26', poster_path: null, vote_average: 7.2 },
    { id: 556, media_type: 'movie', title: 'Amnésia', release_date: '2000-09-05', poster_path: null, vote_average: 8.1 }
  ];

  function tmdb(p, q, page, send) {
    if (p === '/movie/now_playing') return send(200, { page, total_pages: 2, results: list('movie', page, 'Cartaz') });
    if (p === '/discover/movie' && q.get('with_release_type')) {
      const ok = q.get('region') === 'BR' && q.get('with_release_type') === '2|3' && q.get('release_date.gte') === day(0);
      return send(200, { page: 1, total_pages: 1, results: [
        { id: 900, title: ok ? 'Filme Futuro' : 'FILTRO-ERRADO', release_date: day(-30), poster_path: null, vote_average: 0 },
        { id: 901, title: 'Outro Futuro', release_date: day(60), poster_path: null, vote_average: 0 },
        { id: 902, title: 'Ja Lancado', release_date: day(-5), poster_path: null, vote_average: 0 }
      ] });
    }
    if (p === '/movie/900/release_dates') {
      return send(200, { results: [{ iso_3166_1: 'BR', release_dates: [{ type: 3, release_date: `${futureBrDate()}T00:00:00.000Z` }] }] });
    }
    if (p === '/movie/901/release_dates' || p === '/movie/902/release_dates') return send(200, { results: [] });
    if (p === '/movie/900') {
      return send(200, {
        id: 900, title: 'Filme Futuro', original_title: 'Future Film', release_date: day(-30), overview: 'Sinopse futura.', genres: [], runtime: 100, vote_average: 0,
        videos: { results: [] }, credits: { cast: [] }, recommendations: { results: [] },
        release_dates: { results: [{ iso_3166_1: 'BR', release_dates: [{ type: 3, release_date: `${futureBrDate()}T00:00:00.000Z` }] }] },
        'watch/providers': { results: phase === 0 ? {} : { BR: { link: 'https://www.themoviedb.org/movie/900/watch?locale=BR', flatrate: [{ provider_id: 8, provider_name: 'Netflix', logo_path: null, display_priority: 1 }] } } }
      });
    }
    if (p === '/trending/all/week') return send(200, { page, total_pages: 3, results: list(null, page, 'Alta') });
    if (p === '/watch/providers/movie' || p === '/watch/providers/tv') {
      const names = ['Netflix', 'Amazon Prime Video', 'Disney Plus', 'Max', 'Globoplay', 'Apple TV+', 'Paramount Plus', 'Crunchyroll', 'Apple TV Store'];
      return send(200, { results: names.map((name, i) => ({ provider_id: 1000 + i, provider_name: name, logo_path: null, display_priority: i })) });
    }
    if ((p === '/discover/movie' || p === '/discover/tv') && q.get('with_watch_providers')) {
      const type = p.endsWith('movie') ? 'movie' : 'tv';
      const provider = q.get('with_watch_providers');
      const ok = q.get('watch_region') === 'BR' && q.get('with_watch_monetization_types') === 'flatrate';
      return send(200, { page: 1, total_pages: 9, results: Array.from({ length: 20 }, (_, i) => ({
        id: Number(provider) * 100 + i, poster_path: null, vote_average: 7,
        ...(type === 'movie'
          ? { title: `Top ${provider} Filme ${i + 1}${ok ? '' : ' SEM-FILTRO'}`, release_date: '2025-01-01' }
          : { name: `Top ${provider} Série ${i + 1}`, first_air_date: '2024-01-01' })
      })) });
    }
    if (p === '/discover/movie' || p === '/discover/tv') {
      const type = p.endsWith('movie') ? 'movie' : 'tv';
      return send(200, { page, total_pages: 5, results: list(type, page, 'Disc', ` [g=${q.get('with_genres') || ''}]`) });
    }
    if (p === '/genre/movie/list') return send(200, { genres: [{ id: 28, name: 'Ação' }, { id: 27, name: 'Terror' }] });
    if (p === '/genre/tv/list') return send(200, { genres: [{ id: 18, name: 'Drama' }] });
    if (p === '/search/multi') {
      const query = q.get('query');
      if (query === 'nada') return send(200, { page: 1, total_pages: 1, results: [] });
      return send(200, { page: 1, total_pages: 1, results: [
        { id: 7, media_type: 'movie', title: `Resultado <b>${query}</b>`, release_date: '2010-07-16', poster_path: '/poster7.jpg', vote_average: 8.4 },
        { id: 9, media_type: 'person', name: 'Ator Qualquer' },
        { id: 42, media_type: 'tv', name: 'Série Com Temporadas', first_air_date: '2019-01-01', poster_path: null, vote_average: 8 }
      ] });
    }
    if (p === '/search/collection') {
      return send(200, { results: [{ id: 1241, name: 'Harry Potter: Coleção', original_name: 'Harry Potter Collection', poster_path: null, backdrop_path: null }] });
    }
    if (p === '/collection/1241') {
      return send(200, {
        id: 1241, name: 'Harry Potter: Coleção', overview: 'Os filmes do bruxo.', poster_path: '/hp.jpg', backdrop_path: '/hpb.jpg',
        parts: [
          { id: 672, title: 'Harry Potter e a Câmara Secreta', release_date: '2002-11-13', poster_path: null, overview: '' },
          { id: 671, title: 'Harry Potter e a Pedra Filosofal', release_date: '2001-11-16', poster_path: null, overview: '' }
        ]
      });
    }
    const recommendations = p.match(/^\/(movie|tv)\/(\d+)\/recommendations$/);
    if (recommendations) {
      const seed = Number(recommendations[2]);
      return send(200, { page: 1, total_pages: 1, results: [
        { id: 3000 + seed, media_type: 'movie', title: `Parecido com ${seed}`, release_date: '2021-01-01', poster_path: null, vote_average: 7 },
        { id: 3999, media_type: 'movie', title: 'Recomendado por todos', release_date: '2022-01-01', poster_path: null, vote_average: 8 },
        { id: 7, media_type: 'movie', title: 'A Origem', release_date: '2010-07-16', poster_path: null, vote_average: 8.4 }
      ] });
    }
    if (p === '/movie/666') {
      return send(200, { id: 666, title: '"><script>alert(1)</script>', overview: '<img src=x onerror=alert(1)>', release_date: '2020-01-01', poster_path: null, backdrop_path: null });
    }
    if (p === '/movie/7' || p === '/movie/555' || p === '/movie/556') {
      const id = Number(p.split('/')[2]);
      if (q.get('language') === 'en-US') return send(200, { overview: 'English overview fallback.' });
      const titles = { 7: 'A Origem', 555: 'Tenet', 556: 'Amnésia' };
      return send(200, {
        id, title: titles[id], original_title: id === 7 ? 'Inception' : titles[id], release_date: '2010-07-16', overview: id === 7 ? '' : 'Sinopse PT.',
        genres: [{ name: 'Ação' }, { name: 'Ficção científica' }], runtime: 148, vote_average: 8.4,
        poster_path: '/poster7.jpg', backdrop_path: '/backdrop7.jpg',
        videos: { results: [
          { site: 'YouTube', type: 'Teaser', key: 'teaserKEY01', iso_639_1: 'en', official: true },
          { site: 'YouTube', type: 'Trailer', key: 'enTrailer01', iso_639_1: 'en', official: true },
          { site: 'YouTube', type: 'Trailer', key: 'ptTrailer01', iso_639_1: 'pt', official: true }
        ] },
        credits: { cast },
        recommendations: { results: recs },
        release_dates: { results: [{ iso_3166_1: 'BR', release_dates: [{ type: 3, release_date: new Date(Date.now() - 10 * 864e5).toISOString() }] }] },
        'watch/providers': id === 556
          ? { results: {
            US: { flatrate: [{ provider_id: 8, provider_name: 'Netflix', logo_path: null }] },
            PT: { flatrate: [{ provider_id: 8, provider_name: 'Netflix', logo_path: null }] },
            GB: { flatrate: [{ provider_id: 8, provider_name: 'Netflix', logo_path: null }] },
            FR: { flatrate: [{ provider_id: 8, provider_name: 'Netflix', logo_path: null }], ads: [{ provider_id: 50, provider_name: 'Pluto TV', logo_path: null }] },
            DE: { rent: [{ provider_id: 2, provider_name: 'Apple TV', logo_path: null }] }
          } }
          : { results: { BR: {
            link: 'https://www.themoviedb.org/movie/27205/watch?locale=BR',
            flatrate: [
              { provider_id: 8, provider_name: 'Netflix', logo_path: null, display_priority: 1 },
              { provider_id: 8, provider_name: 'Netflix', logo_path: null, display_priority: 1 }
            ],
            rent: [
              { provider_id: 2, provider_name: 'Apple TV', logo_path: null, display_priority: 2 },
              { provider_id: 99, provider_name: 'Plataforma Desconhecida', logo_path: null, display_priority: 5 }
            ],
            buy: [{ provider_id: 3, provider_name: 'Google Play Filmes', logo_path: null, display_priority: 3 }]
          } } }
      });
    }
    const season = p.match(/^\/tv\/(\d+)\/season\/(\d+)$/);
    if (season) {
      const n = Number(season[2]);
      const count = n === 1 ? 3 : n === 2 ? 2 : 1;
      return send(200, { season_number: n, name: `Temporada ${n}`, episodes: Array.from({ length: count }, (_, i) => ({
        episode_number: i + 1, name: `Ep T${n}E${i + 1}`, overview: i === 0 ? 'Resumo do episódio.' : '', air_date: `2019-03-0${i + 1}`, runtime: 50, still_path: null
      })) });
    }
    if (/^\/(movie|tv)\/\d+$/.test(p)) {
      const withSeasons = p === '/tv/42';
      return send(200, {
        id: Number(p.split('/')[2]), name: withSeasons ? 'Série Com Temporadas' : 'Série Sem Streaming', first_air_date: '2020-01-01', overview: 'Uma sinopse.',
        genres: [], number_of_seasons: 2, vote_average: 0, videos: { results: [] }, 'watch/providers': { results: {} },
        aggregate_credits: { cast: [{ name: 'Atriz Série', roles: [{ character: 'Protagonista' }], profile_path: null }] },
        recommendations: { results: [] },
        seasons: withSeasons ? [
          { season_number: 0, name: 'Especiais', episode_count: 1, air_date: '2018-01-01' },
          { season_number: 1, name: 'Temporada 1', episode_count: 3, air_date: '2019-01-01' },
          { season_number: 2, name: 'Temporada 2', episode_count: 2, air_date: '2020-01-01' }
        ] : []
      });
    }
    return send(404, { status_message: 'not found' });
  }

  function archive(p, q, send) {
    if (p === '/archive/advancedsearch.php') {
      const query = q.get('q') || '';
      const rows = Number(q.get('rows'));
      const page = Number(q.get('page') || 1);
      const filtered = query.includes('licenseurl:(*publicdomain*)') && query.includes('-subject:(sex');
      if (query.includes('title:(nosferatu')) {
        return send(200, { response: { numFound: 1, docs: [{ identifier: 'nosferatu_teste', title: 'Nosferatu', year: '1922' }] } });
      }
      return send(200, { response: { numFound: 60, docs: Array.from({ length: rows }, (_, i) => ({
        identifier: `classico_${page}_${i}`,
        title: `${filtered ? 'Clássico' : 'SEM-FILTRO'} ${page}-${i}`,
        year: String(1920 + i)
      })) } });
    }
    const metadata = p.match(/^\/archive\/metadata\/(.+)$/);
    if (metadata) {
      const id = decodeURIComponent(metadata[1]);
      if (id === 'bloqueado') {
        return send(200, { metadata: { title: 'Bloqueado', licenseurl: 'http://creativecommons.org/licenses/publicdomain/', subject: ['nudity'] }, files: [] });
      }
      if (id === 'sem_licenca') return send(200, { metadata: { title: 'Sem licença' }, files: [] });
      const parts = id === 'nosferatu_teste' ? 3 : 1;
      return send(200, {
        metadata: { title: id === 'nosferatu_teste' ? 'Nosferatu' : `Clássico ${id}`, year: '1922', runtime: '1:34:00', director: 'F. W. Murnau',
          description: '<p>Um <b>clássico</b> do terror.</p>', licenseurl: 'http://creativecommons.org/licenses/publicdomain/' },
        files: Array.from({ length: parts }, (_, i) => ({ name: parts > 1 ? `parte-${i + 1}of${parts}.mp4` : `${id}.mp4`, format: 'h.264' }))
      });
    }
    return send(404, {});
  }

  const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://mock');
    const send = (status, body) => {
      res.writeHead(status, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(body));
    };
    log.push(url.pathname + url.search.replace(/[?&]api_key=[^&]*/, ''));
    if (url.pathname.startsWith('/archive/')) return archive(url.pathname, url.searchParams, send);
    if (url.searchParams.get('api_key') !== TEST_KEY) return send(401, { status_message: 'Invalid API key' });
    return tmdb(url.pathname, url.searchParams, Number(url.searchParams.get('page') || 1), send);
  });

  return {
    key: TEST_KEY,
    log,
    setPhase: (value) => { phase = value; },
    listen: () => new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server.address().port))),
    close: () => new Promise((resolve) => server.close(resolve))
  };
}

module.exports = { createMockApi };
