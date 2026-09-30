import { el, els, showToast } from './dom.js';
import { itemKey, summarize, imageUrl, formatCount, formatDate, joinNames, localIsoDate } from './utils.js';
import { view, loadStoredList, saveStoredList } from './state.js';
import { fetchJson } from './api.js';
import { renderMyList } from './mylist.js';
import { openTitle } from './router.js';

const REMINDERS_KEY = 'cineguia-lembretes';
const ALERTS_KEY = 'cineguia-avisos';
const REMINDER_RECHECK_MS = 30 * 60 * 1000;
const ALERTS_LIMIT = 30;

export let reminders = loadStoredList(REMINDERS_KEY);
let alerts = loadStoredList(ALERTS_KEY);
let lastCheck = 0;
let checking = false;
let recheckQueued = false;

export function replaceReminders(list) {
  reminders = list;
  saveStoredList(REMINDERS_KEY, reminders);
}

export function isReminded(item) {
  return reminders.some((reminder) => itemKey(reminder) === itemKey(item));
}

function toggleReminder(item) {
  const summary = summarize(item);
  const adding = !isReminded(summary);

  if (adding) {
    const releaseDate = item.releaseDate || (item.availability && item.availability.release && item.availability.release.date) || null;
    // known stays null until the first check, which records the current state as the baseline.
    reminders = [{ ...summary, releaseDate, known: null }, ...reminders];
    showToast(`Pronto! Vamos avisar aqui quando ${summary.title} estrear ou chegar a uma plataforma.`);
  } else {
    reminders = reminders.filter((reminder) => itemKey(reminder) !== itemKey(summary));
    showToast(`Lembrete de ${summary.title} removido.`);
  }

  saveStoredList(REMINDERS_KEY, reminders);
  for (const button of document.querySelectorAll(`[data-reminder-key="${itemKey(summary)}"]`)) {
    renderReminderButton(button, summary);
  }
  if (view.mode === 'favorites') renderMyList();
  if (adding) checkReminders();
}

export function reminderButton(item, variant) {
  const button = el('button', {
    type: 'button',
    className: variant === 'icon' ? 'reminder-button icon' : 'reminder-button full',
    'data-reminder-key': itemKey(item),
    onclick: (event) => {
      event.stopPropagation();
      toggleReminder(item);
    }
  });
  renderReminderButton(button, item);
  return button;
}

function renderReminderButton(button, item) {
  const active = isReminded(item);
  button.setAttribute('aria-pressed', String(active));
  button.setAttribute('aria-label', active ? `Remover lembrete de ${item.title}` : `Lembrar de ${item.title}`);
  button.replaceChildren(bellIcon(active));
  if (button.classList.contains('full')) {
    button.append(el('span', { text: active ? 'Lembrete ativado' : 'Lembrar' }));
  }
}

function bellIcon(filled) {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', '18');
  svg.setAttribute('height', '18');
  svg.setAttribute('aria-hidden', 'true');
  const path = document.createElementNS(ns, 'path');
  path.setAttribute('d', 'M12 2a6 6 0 0 0-6 6v3.5L4 15v1h16v-1l-2-3.5V8a6 6 0 0 0-6-6zm0 20a2.5 2.5 0 0 0 2.45-2h-4.9A2.5 2.5 0 0 0 12 22z');
  path.setAttribute('fill', filled ? 'currentColor' : 'none');
  path.setAttribute('stroke', 'currentColor');
  path.setAttribute('stroke-width', '1.8');
  path.setAttribute('stroke-linejoin', 'round');
  svg.append(path);
  return svg;
}

export function reminderStatus(reminder) {
  const known = reminder.known;
  if (!known) return 'Verificando...';
  if (known.streaming && known.streaming.length) {
    const extra = known.streaming.length - 1;
    return `Disponível em ${known.streaming[0]}${extra > 0 ? ` e mais ${extra}` : ''}`;
  }
  if (!known.released && known.releaseDate) return `Estreia ${formatDate(known.releaseDate)}`;
  if (known.released && known.theatrical && known.releaseDate >= localIsoDate(-90)) return 'Nos cinemas agora';
  if (known.store && known.store.length) return 'Disponível para alugar ou comprar';
  return known.released ? 'Aguardando chegar ao streaming' : 'Aguardando data de estreia';
}

export function reminderCheckIsStale() {
  return Date.now() - lastCheck > REMINDER_RECHECK_MS;
}

export async function checkReminders() {
  if (!reminders.length) return;
  if (checking) {
    recheckQueued = true;
    return;
  }
  checking = true;
  lastCheck = Date.now();

  try {
    const keys = reminders.map((reminder) => `${reminder.type}:${reminder.id}`).join(',');
    const data = await fetchJson(`/api/reminders/check?items=${encodeURIComponent(keys)}`);
    const newAlerts = [];

    for (const result of data.results) {
      if (result.error) continue;
      const reminder = reminders.find((item) => `${item.type}:${item.id}` === result.key);
      if (!reminder) continue;
      if (reminder.known) newAlerts.push(...reminderChanges(reminder, reminder.known, result));
      reminder.known = {
        released: result.released,
        theatrical: result.theatrical,
        releaseDate: result.releaseDate,
        streaming: result.streaming,
        store: result.store
      };
      reminder.releaseDate = result.releaseDate;
    }

    saveStoredList(REMINDERS_KEY, reminders);
    if (newAlerts.length) {
      alerts = [...newAlerts, ...alerts].slice(0, ALERTS_LIMIT);
      saveStoredList(ALERTS_KEY, alerts);
      renderAlerts();
      showToast(newAlerts.length === 1
        ? `${newAlerts[0].title} ${newAlerts[0].message}`
        : `${newAlerts.length} novidades nos seus lembretes!`);
    }
    if (view.mode === 'favorites') renderMyList();
  } catch {
    // Offline or server asleep: the next visit checks again.
  } finally {
    checking = false;
    if (recheckQueued) {
      recheckQueued = false;
      checkReminders();
    }
  }
}

function reminderChanges(reminder, known, result) {
  const base = { id: reminder.id, type: reminder.type, title: reminder.title, poster: reminder.poster, at: Date.now() };
  const changes = [];

  if (result.released && !known.released) {
    changes.push({ ...base, message: reminder.type === 'movie' && result.theatrical ? 'estreou nos cinemas!' : 'estreou!' });
  } else if (!result.released && result.releaseDate && known.releaseDate && result.releaseDate !== known.releaseDate) {
    changes.push({ ...base, message: `teve a estreia remarcada para ${formatDate(result.releaseDate)}.` });
  }

  const newStreaming = result.streaming.filter((name) => !(known.streaming || []).includes(name));
  if (newStreaming.length) {
    changes.push({ ...base, message: `chegou em ${joinNames(newStreaming)}!` });
  } else {
    const newStore = result.store.filter((name) => !(known.store || []).includes(name));
    if (newStore.length) changes.push({ ...base, message: `já pode ser alugado ou comprado em ${joinNames(newStore)}.` });
  }
  return changes;
}

export function clearAlerts() {
  alerts = [];
  saveStoredList(ALERTS_KEY, alerts);
  renderAlerts();
}

export function renderAlerts() {
  els.alerts.classList.toggle('hidden', !alerts.length);
  els.alertsBadge.classList.toggle('hidden', !alerts.length);
  els.alertsBadge.textContent = alerts.length ? String(alerts.length) : '';
  els.alertsBadge.setAttribute('aria-label', `${formatCount(alerts.length, 'novidade', 'novidades')}`);

  els.alertsList.replaceChildren(...alerts.map((alert, index) => {
    const poster = imageUrl('w92', alert.poster);
    return el('li', { className: 'alert' }, [
      el('button', { type: 'button', className: 'alert-open', onclick: () => openTitle(alert) }, [
        poster
          ? el('img', { className: 'alert-poster', src: poster, alt: '', width: '40', height: '60' })
          : el('span', { className: 'alert-poster placeholder', 'aria-hidden': 'true' }),
        el('span', { className: 'alert-text' }, [el('strong', { text: alert.title }), document.createTextNode(` ${alert.message}`)])
      ]),
      el('button', {
        type: 'button',
        className: 'alert-dismiss',
        'aria-label': `Dispensar aviso de ${alert.title}`,
        text: '×',
        onclick: () => {
          alerts.splice(index, 1);
          saveStoredList(ALERTS_KEY, alerts);
          renderAlerts();
        }
      })
    ]);
  }));
}
