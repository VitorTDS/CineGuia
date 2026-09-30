import { el } from './dom.js';

const IMAGE_BASE = 'https://image.tmdb.org/t/p/';
const POSTER_WIDTHS = [185, 342, 500, 780];

export const TYPE_LABELS = { movie: 'Filme', tv: 'Série' };

export function itemKey(item) {
  return `${item.type}-${item.id}`;
}

// The small, storable version of a title used by the lists (favorites, reminders, watched).
export function summarize(item) {
  return {
    id: item.id,
    type: item.type,
    title: item.title,
    year: item.year || (item.releaseDate || '').slice(0, 4),
    poster: item.poster || null,
    rating: typeof item.rating === 'number' ? item.rating : null
  };
}

function isValidImagePath(filePath) {
  return typeof filePath === 'string' && /^\/[\w.-]+$/.test(filePath);
}

export function imageUrl(size, filePath) {
  return isValidImagePath(filePath) ? `${IMAGE_BASE}${size}${filePath}` : null;
}

export function posterImage(filePath, alt, className, sizes) {
  if (!isValidImagePath(filePath)) return null;
  return el('img', {
    className,
    src: imageUrl('w342', filePath),
    srcset: POSTER_WIDTHS.map((width) => `${imageUrl(`w${width}`, filePath)} ${width}w`).join(', '),
    sizes,
    alt,
    loading: 'lazy',
    width: '342',
    height: '513'
  });
}

export function isSafeHttpsUrl(value) {
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
}

export function formatRating(rating) {
  return typeof rating === 'number' && rating > 0 ? `★ ${rating.toFixed(1)}` : null;
}

export function formatRuntime(minutes) {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return hours ? `${hours}h${rest ? ` ${rest}min` : ''}` : `${rest}min`;
}

export function formatCount(count, singular, plural) {
  return `${count} ${count === 1 ? singular : plural}`;
}

export function formatDate(isoDate) {
  if (!isoDate) return null;
  const date = new Date(`${isoDate}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date.toLocaleDateString('pt-BR');
}

export function localIsoDate(offsetDays = 0) {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  const pad = (value) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function joinNames(names) {
  return names.length <= 1 ? names.join('') : `${names.slice(0, -1).join(', ')} e ${names[names.length - 1]}`;
}

export function initials(name) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0].toUpperCase()).join('');
}
