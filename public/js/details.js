import { el, appendChildren, showToast } from './dom.js';
import {
  TYPE_LABELS, imageUrl, posterImage, isSafeHttpsUrl, formatRating, formatRuntime, formatCount, formatDate, initials
} from './utils.js';
import { fetchJson } from './api.js';
import { createCard } from './cards.js';
import { favoriteButton } from './favorites.js';
import { reminderButton } from './reminders.js';
import { watchedButton } from './watched.js';
import { calendarActions } from './calendar.js';
import { renderSagaLinks } from './sagas.js';
import { titleLink } from './router.js';

const CLIPBOARD_TIMEOUT_MS = 2000;
const PROVIDER_GROUPS = [
  ['streaming', 'Streaming (assinatura)'],
  ['free', 'Grátis'],
  ['rent', 'Alugar'],
  ['buy', 'Comprar']
];

let seasonRequestId = 0;

// Called when the details dialog changes title, so a slow season response cannot land in the wrong one.
export function invalidateSeasonLoads() {
  seasonRequestId += 1;
}

export function renderDetails(data) {
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
        watchedButton(data, null, 'full'),
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
    renderSagaLinks(data.sagas),
    renderProviders(data.providers, data.title, data.availability),
    renderTrailer(data.trailer, data.title),
    renderCast(data.cast),
    renderSeasons(data),
    renderRecommendations(data.recommendations)
  ]);
}

export async function copyLink(item) {
  const link = titleLink(item);
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
