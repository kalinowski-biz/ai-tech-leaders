import { Html, html, onClick, when } from './dom';
import {
  commissionStatusLabels,
  formatDate,
  formatDateRange,
  formatDateTime,
  formatMoney,
  formatRate,
  inquiryStatusLabels,
  monthShortNames,
  quoteStatusLabels,
} from './format';
import { navigate } from './navigation';
import { quoteValue, state } from './store';
import type { CommissionStatus, HistoryEntry, Inquiry, InquiryStatus, Quote, ThreadMessage } from './types';

const statusTone: Record<InquiryStatus, string> = {
  DRAFT: 'draft',
  NEW: 'ink-outline',
  QUOTING: 'ink',
  QUOTE_READY: 'marker',
  SENT_TO_CLIENT: 'sky',
  ACCEPTED: 'pine-outline',
  BOOKING_CONFIRMED: 'pine',
  COMPLETED: 'pine-solid',
  CANCELLED: 'closed',
  REJECTED_BY_OFFICE: 'closed',
  REJECTED_BY_CLIENT: 'closed',
  WITHDRAWN_BY_AGENT: 'closed',
};

export function statusChip(inquiry: Pick<Inquiry, 'status' | 'quoteExpired'>): Html {
  return html`<span class="chip chip--${statusTone[inquiry.status]}">${inquiryStatusLabels[inquiry.status]}</span>${when(
    inquiry.quoteExpired && inquiry.status === 'QUOTE_READY',
    () => html` <span class="chip chip--alert">wycena wygasła</span>`,
  )}`;
}

export function commissionChip(status: CommissionStatus): Html {
  const tone: Record<CommissionStatus, string> = { FORECAST: 'ink-outline', DUE: 'marker', PAID: 'pine-solid', CANCELLED: 'closed' };
  return html`<span class="chip chip--${tone[status]}">${commissionStatusLabels[status]}</span>`;
}

export function plainChip(label: string, tone: string): Html {
  return html`<span class="chip chip--${tone}">${label}</span>`;
}

export function unreadDot(visible: boolean, label = 'Nieprzeczytane'): Html | null {
  return visible ? html`<span class="unread-dot" title="${label}"><span class="visually-hidden">${label}</span></span>` : null;
}

export function pageHeader(options: { eyebrow?: string; title: string; lead?: Html | string; actions?: Html; back?: { href: string; label: string } }): Html {
  return html`<header class="page-header">
    ${when(options.back, () => html`<a class="back-link" href="${options.back?.href ?? '#'}">← ${options.back?.label ?? ''}</a>`)}
    <div class="page-header__row">
      <div>
        ${when(options.eyebrow, () => html`<p class="eyebrow">${options.eyebrow ?? ''}</p>`)}
        <h1 class="page-title">${options.title}</h1>
        ${when(options.lead, () => html`<p class="page-lead">${options.lead ?? ''}</p>`)}
      </div>
      ${when(options.actions, () => html`<div class="page-actions">${options.actions ?? ''}</div>`)}
    </div>
  </header>`;
}

export function emptyState(options: { title: string; text: string; action?: Html }): Html {
  return html`<div class="empty-state">
    <svg class="empty-state__mark" viewBox="0 0 64 40" aria-hidden="true"><path d="M2 38 L20 10 L30 24 L40 6 L62 38 Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>
    <p class="empty-state__title">${options.title}</p>
    <p class="empty-state__text">${options.text}</p>
    ${options.action ?? ''}
  </div>`;
}

export function errorBanner(options: { title: string; text: string; code?: string; retry?: () => void }): Html {
  return html`<div class="banner banner--error" role="alert">
    <div>
      <p class="banner__title">${options.title}</p>
      <p>${options.text}${when(options.code, () => html` <span class="mono muted">Kod: ${options.code ?? ''}</span>`)}</p>
    </div>
    ${when(options.retry, () => html`<button class="button button--secondary" ${onClick(() => options.retry?.())}>Spróbuj ponownie</button>`)}
  </div>`;
}

export function banner(tone: 'info' | 'warning' | 'alert' | 'success', title: string, text: Html | string = '', actions: Html | null = null): Html {
  return html`<div class="banner banner--${tone}" role="${tone === 'alert' ? 'alert' : 'status'}">
    <div><p class="banner__title">${title}</p>${when(text, () => html`<p>${text}</p>`)}</div>
    ${actions ?? ''}
  </div>`;
}

export type SkeletonKind = 'list' | 'detail' | 'form' | 'dashboard' | 'cards' | 'ticket';

export function skeleton(kind: SkeletonKind): Html {
  const line = (width: string) => html`<span class="skeleton-line" style="width:${width}"></span>`;
  const header = html`<div class="skeleton-header">${line('120px')}${line('42%')}</div>`;
  const body: Record<SkeletonKind, Html> = {
    list: html`<div class="skeleton-card">${line('60%')}${[1, 2, 3, 4, 5, 6].map(() => html`<div class="skeleton-row">${line('14%')}${line('22%')}${line('30%')}${line('12%')}</div>`)}</div>`,
    detail: html`<div class="skeleton-split"><div class="skeleton-card">${line('50%')}${line('90%')}${line('80%')}${line('70%')}<div class="skeleton-block"></div></div><div class="skeleton-card">${line('40%')}${line('100%')}${line('85%')}${line('92%')}</div></div>`,
    form: html`<div class="skeleton-card">${[1, 2, 3, 4, 5].map(() => html`<div class="skeleton-field">${line('25%')}<span class="skeleton-input"></span></div>`)}</div>`,
    dashboard: html`<div class="skeleton-grid">${[1, 2, 3, 4].map(() => html`<div class="skeleton-card">${line('40%')}${line('70%')}${line('55%')}</div>`)}</div>`,
    cards: html`<div class="offer-grid">${[1, 2, 3, 4, 5, 6].map(() => html`<div class="skeleton-card"><div class="skeleton-block"></div>${line('70%')}${line('40%')}</div>`)}</div>`,
    ticket: html`<div class="skeleton-card skeleton-card--ticket"><div class="skeleton-block"></div>${line('60%')}${line('80%')}</div>`,
  };
  return html`<div class="skeleton" aria-busy="true" aria-label="Wczytywanie">${header}${body[kind]}</div>`;
}

export function offerPhoto(hues: number[], label: string, size: 'card' | 'hero' = 'card'): Html {
  const [first = 210, second = 230] = hues;
  return html`<div class="offer-photo offer-photo--${size}" style="--hue-a:${first};--hue-b:${second}" role="img" aria-label="Zdjęcie: ${label}">
    <svg viewBox="0 0 320 120" preserveAspectRatio="none" aria-hidden="true"><path d="M0 120 L0 78 L46 40 L82 66 L128 22 L176 70 L214 46 L262 84 L320 52 L320 120 Z"/></svg>
  </div>`;
}

export function seasonStrip(months: number[]): Html {
  return html`<ol class="season-strip" aria-label="Sezon dostępności">
    ${monthShortNames.map((name, index) => html`<li class="${months.includes(index + 1) ? 'is-on' : ''}"><span>${name}</span></li>`)}
  </ol>`;
}

export function quoteTicket(quote: Quote, inquiry: Inquiry, options: { showCommission?: number | null; commissionLabel?: string; compact?: boolean; stamp?: boolean; audience?: 'internal' | 'client' } = {}): Html {
  const value = quoteValue(quote);
  const stampLabel: Partial<Record<Quote['status'], string>> = {
    ACCEPTED: 'Zaakceptowano',
    REJECTED: 'Odrzucono',
    SUPERSEDED: 'Zastąpiona',
    INVALIDATED: 'Unieważniona',
    EXPIRED: 'Wygasła',
  };
  const stamp = stampLabel[quote.status];
  const muted = quote.status !== 'ACTIVE' && quote.status !== 'ACCEPTED';
  return html`<article class="ticket ${muted ? 'ticket--muted' : ''} ${options.compact ? 'ticket--compact' : ''}" aria-label="Wycena wersja ${quote.version}">
    <div class="ticket__main">
      <p class="ticket__route">${inquiry.offerSnapshot.title}</p>
      <p class="ticket__dates">${formatDateRange(quote.dateFrom, quote.dateTo)} · wyjazd z: ${inquiry.departureCity}</p>
      <dl class="ticket__facts">
        <div><dt>Cena za uczestnika</dt><dd class="ticket__price">${formatMoney(quote.pricePerParticipant)}</dd></div>
        <div><dt>Uczestnicy płatni</dt><dd>${quote.paidParticipants}</dd></div>
        <div><dt>Opiekunowie gratis</dt><dd>${quote.freeGuardians}</dd></div>
        <div><dt>Wartość</dt><dd class="ticket__value">${formatMoney(value)}</dd></div>
      </dl>
      ${when(!options.compact && quote.included.length > 0, () => html`<p class="ticket__included"><span class="ticket__label">W cenie:</span> ${quote.included.join(' · ')}</p>`)}
      ${when(!options.compact && quote.optional.length > 0, () => html`<p class="ticket__included"><span class="ticket__label">Opcjonalnie:</span> ${quote.optional.map((service) => `${service.name} +${formatMoney(service.price)}/os.`).join(' · ')}</p>`)}
      ${when(!options.compact && quote.clientNote, () => html`<p class="ticket__note">${quote.clientNote}</p>`)}
      ${when(typeof options.showCommission === 'number', () => html`<p class="ticket__commission">${options.commissionLabel ?? 'Twoja prowizja (prognoza)'}: <strong>${formatMoney(Math.round(value * (options.showCommission ?? 0)) / 100)}</strong> · ${formatRate(options.showCommission ?? 0)}</p>`)}
    </div>
    ${options.audience === 'client'
      ? html`<div class="ticket__stub">
          <span class="ticket__stub-label">Razem</span>
          <span class="ticket__total">${formatMoney(value)}</span>
          <span class="ticket__stub-label">ważna do</span>
          <span class="ticket__valid mono">${formatDate(quote.validUntil)}</span>
        </div>`
      : html`<div class="ticket__stub">
          <span class="ticket__version">v${quote.version}</span>
          <span class="ticket__stub-label">${quoteStatusLabels[quote.status]}</span>
          <span class="ticket__stub-label">ważna do</span>
          <span class="ticket__valid mono">${formatDate(quote.validUntil)}</span>
          <span class="ticket__serial mono">${inquiry.number}</span>
        </div>`}
    ${when(stamp && options.stamp !== false, () => html`<span class="stamp stamp--${quote.status.toLowerCase()}" aria-hidden="true">${stamp ?? ''}${when(quote.decision, () => html`<small>${formatDate(quote.decision?.at ?? '')}</small>`)}</span>`)}
  </article>`;
}

export function messageThread(messages: ThreadMessage[], viewer: 'agent' | 'office'): Html {
  if (messages.length === 0) {
    return html`<p class="thread-empty">Wątek jest pusty. Napisz, jeśli potrzebujesz doprecyzować warunki.</p>`;
  }
  return html`<ol class="thread">
    ${messages.map(
      (message) => html`<li class="message ${message.author === viewer ? 'message--own' : ''} ${message.kind === 'change-request' ? 'message--change' : ''}">
        <p class="message__meta"><strong>${message.authorName}</strong> · ${message.author === 'office' ? 'biuro' : 'agent'} · <time>${formatDateTime(message.at)}</time></p>
        ${when(message.kind === 'change-request', () => html`<p class="message__kind">Prośba o zmianę wyceny</p>`)}
        <p class="message__text">${message.text}</p>
        ${when(message.attachments.length > 0, () => html`<ul class="message__files">${message.attachments.map((name) => html`<li><a href="#" ${onClick(() => undefined)}>📎 ${name}</a></li>`)}</ul>`)}
      </li>`,
    )}
  </ol>`;
}

const channelLabels: Record<HistoryEntry['channel'], string> = { portal: 'portal', link: 'link klienta', agent: 'zgłoszone przez agenta', system: 'system' };

export function historyTimeline(entries: HistoryEntry[]): Html {
  return html`<ol class="history">
    ${[...entries].reverse().map(
      (entry) => html`<li>
        <time class="mono">${formatDateTime(entry.at)}</time>
        <p><strong>${entry.label}</strong></p>
        <p class="muted">${entry.actor} · ${channelLabels[entry.channel]}</p>
        ${when(entry.comment, () => html`<p class="history__comment">${entry.comment}</p>`)}
      </li>`,
    )}
  </ol>`;
}

const routeStops: Array<{ status: InquiryStatus; label: string }> = [
  { status: 'NEW', label: 'Nowe' },
  { status: 'QUOTING', label: 'Wycena' },
  { status: 'QUOTE_READY', label: 'Gotowa' },
  { status: 'SENT_TO_CLIENT', label: 'U klienta' },
  { status: 'ACCEPTED', label: 'Akceptacja' },
  { status: 'BOOKING_CONFIRMED', label: 'Rezerwacja' },
  { status: 'COMPLETED', label: 'Realizacja' },
];

export function statusRoute(inquiry: Inquiry): Html {
  const reachedIndex = routeStops.findIndex((stop) => stop.status === inquiry.status);
  const closed = reachedIndex === -1 && inquiry.status !== 'DRAFT';
  return html`<ol class="route ${closed ? 'route--closed' : ''}" aria-label="Etap zapytania">
    ${routeStops.map((stop, index) => html`<li class="${index < reachedIndex ? 'is-past' : ''} ${index === reachedIndex ? 'is-current' : ''}" ${index === reachedIndex ? html`aria-current="step"` : ''}><span>${stop.label}</span></li>`)}
  </ol>`;
}

export function definitionList(rows: Array<[string, Html | string | number]>): Html {
  return html`<dl class="facts">${rows.map(([term, value]) => html`<div><dt>${term}</dt><dd>${value}</dd></div>`)}</dl>`;
}

export interface FieldOptions {
  name: string;
  label: string;
  type?: string;
  value?: string | number;
  required?: boolean;
  hint?: string;
  placeholder?: string;
  attrs?: Html;
  inputMode?: string;
  min?: string | number;
  max?: string | number;
  step?: string | number;
  autocomplete?: string;
  className?: string;
}

export function field(options: FieldOptions): Html {
  const id = `field-${options.name}`;
  return html`<div class="field ${options.className ?? ''}">
    <label for="${id}">${options.label}${when(options.required, () => html`<span class="required" aria-hidden="true"> *</span>`)}</label>
    <input id="${id}" name="${options.name}" type="${options.type ?? 'text'}" value="${options.value ?? ''}"
      ${options.placeholder ? html`placeholder="${options.placeholder}"` : ''}
      ${options.inputMode ? html`inputmode="${options.inputMode}"` : ''}
      ${options.min !== undefined ? html`min="${options.min}"` : ''}
      ${options.max !== undefined ? html`max="${options.max}"` : ''}
      ${options.step !== undefined ? html`step="${options.step}"` : ''}
      ${options.autocomplete ? html`autocomplete="${options.autocomplete}"` : ''}
      ${options.required ? html`aria-required="true"` : ''}
      aria-describedby="${id}-error ${options.hint ? `${id}-hint` : ''}"
      ${options.attrs ?? ''}>
    ${when(options.hint, () => html`<p class="field-hint" id="${id}-hint">${options.hint ?? ''}</p>`)}
    <p class="field-error" id="${id}-error" data-error-for="${options.name}" aria-live="polite"></p>
  </div>`;
}

export function textareaField(options: Omit<FieldOptions, 'type'> & { rows?: number }): Html {
  const id = `field-${options.name}`;
  return html`<div class="field ${options.className ?? ''}">
    <label for="${id}">${options.label}${when(options.required, () => html`<span class="required" aria-hidden="true"> *</span>`)}</label>
    <textarea id="${id}" name="${options.name}" rows="${options.rows ?? 3}" ${options.placeholder ? html`placeholder="${options.placeholder}"` : ''} aria-describedby="${id}-error ${options.hint ? `${id}-hint` : ''}" ${options.attrs ?? ''}>${options.value ?? ''}</textarea>
    ${when(options.hint, () => html`<p class="field-hint" id="${id}-hint">${options.hint ?? ''}</p>`)}
    <p class="field-error" id="${id}-error" data-error-for="${options.name}" aria-live="polite"></p>
  </div>`;
}

export function selectField(options: Omit<FieldOptions, 'type'> & { choices: Array<{ value: string; label: string }>; emptyLabel?: string }): Html {
  const id = `field-${options.name}`;
  return html`<div class="field ${options.className ?? ''}">
    <label for="${id}">${options.label}${when(options.required, () => html`<span class="required" aria-hidden="true"> *</span>`)}</label>
    <select id="${id}" name="${options.name}" aria-describedby="${id}-error" ${options.attrs ?? ''}>
      ${when(options.emptyLabel !== undefined, () => html`<option value="">${options.emptyLabel ?? ''}</option>`)}
      ${options.choices.map((choice) => html`<option value="${choice.value}" ${String(options.value ?? '') === choice.value ? 'selected' : ''}>${choice.label}</option>`)}
    </select>
    ${when(options.hint, () => html`<p class="field-hint">${options.hint ?? ''}</p>`)}
    <p class="field-error" id="${id}-error" data-error-for="${options.name}" aria-live="polite"></p>
  </div>`;
}

export function checkboxGroup(options: { name: string; legend: string; choices: Array<{ value: string; label: string }>; selected: string[]; required?: boolean; variant?: 'chips' | 'months' }): Html {
  return html`<fieldset class="field checkbox-group checkbox-group--${options.variant ?? 'chips'}">
    <legend>${options.legend}${when(options.required, () => html`<span class="required" aria-hidden="true"> *</span>`)}</legend>
    <div class="checkbox-group__items">
      ${options.choices.map((choice) => html`<label class="check-chip"><input type="checkbox" name="${options.name}" value="${choice.value}" ${options.selected.includes(choice.value) ? 'checked' : ''}><span>${choice.label}</span></label>`)}
    </div>
    <p class="field-error" data-error-for="${options.name}" aria-live="polite"></p>
  </fieldset>`;
}

export function linkButton(label: string, href: string, variant = 'secondary'): Html {
  return html`<a class="button button--${variant}" href="${href}">${label}</a>`;
}

export function rowLink(href: string): Html {
  return onClick(() => navigate(href));
}

export function todayLabel(): string {
  return formatDate(state.today);
}
