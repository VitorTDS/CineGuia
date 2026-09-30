import { el, showToast } from './dom.js';
import { localIsoDate } from './utils.js';
import { titleLink } from './router.js';

export function calendarActions(data) {
  const release = data.availability && data.availability.release;
  if (!release || !release.date || release.date <= localIsoDate()) return [];
  const where = release.kind === 'upcoming_theaters' ? ' nos cinemas' : '';

  return [
    el('a', {
      className: 'action-button',
      href: googleCalendarUrl(data, release.date, where),
      target: '_blank',
      rel: 'noopener noreferrer',
      text: 'Adicionar ao Google Agenda'
    }),
    el('button', {
      type: 'button',
      className: 'action-button',
      text: 'Baixar para a agenda (.ics)',
      onclick: () => downloadCalendarFile(data, release.date, where)
    })
  ];
}

function allDayRange(isoDate) {
  const next = new Date(`${isoDate}T00:00:00Z`);
  next.setUTCDate(next.getUTCDate() + 1);
  return [isoDate.replaceAll('-', ''), next.toISOString().slice(0, 10).replaceAll('-', '')];
}

function googleCalendarUrl(item, isoDate, where) {
  const [start, end] = allDayRange(isoDate);
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: `Estreia${where}: ${item.title}`,
    dates: `${start}/${end}`,
    details: `${item.title} estreia${where} hoje. Veja onde assistir no CineGuia: ${titleLink(item)}`
  });
  return `https://calendar.google.com/calendar/render?${params}`;
}

function escapeIcs(text) {
  return text.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
}

function downloadCalendarFile(item, isoDate, where) {
  const [start, end] = allDayRange(isoDate);
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const summary = escapeIcs(`Estreia${where}: ${item.title}`);
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//CineGuia//PT-BR',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${item.type}-${item.id}-${start}@cineguia`,
    `DTSTAMP:${stamp}`,
    `DTSTART;VALUE=DATE:${start}`,
    `DTEND;VALUE=DATE:${end}`,
    `SUMMARY:${summary}`,
    `DESCRIPTION:${escapeIcs(`Veja onde assistir no CineGuia: ${titleLink(item)}`)}`,
    'BEGIN:VALARM',
    'TRIGGER:PT9H',
    'ACTION:DISPLAY',
    `DESCRIPTION:${summary}`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR'
  ];
  const url = URL.createObjectURL(new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' }));
  const link = el('a', { href: url, download: `estreia-${item.type}-${item.id}.ics` });
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  showToast('Evento baixado. Abra o arquivo para adicionar à sua agenda.');
}
