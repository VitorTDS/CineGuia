import { el } from './dom.js';
import { isSafeHttpsUrl } from './utils.js';
import { openTitle } from './router.js';
import { copyLink } from './details.js';

function archiveThumb(id) {
  return `https://archive.org/services/img/${encodeURIComponent(id)}`;
}

export function createPublicCard(item) {
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

export function renderPublicDetails(data) {
  const item = { ...data, type: 'public' };
  const meta = [data.year, data.runtime, data.director].filter(Boolean).join(' · ');
  const sources = (data.sources || []).filter((source) => isSafeHttpsUrl(source.url));

  return el('div', { className: 'details-content public-details' }, [
    renderPlayer(data, sources),
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

function renderPlayer(data, sources) {
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
