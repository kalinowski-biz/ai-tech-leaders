import { banner, definitionList, historyTimeline, messageThread, quoteTicket } from '../components';
import { Html, html, onClick, onSubmit, runPending, showToast, textOf, when } from '../dom';
import { commissionStatusLabels, daysBetween, formatDate, formatMoney, formatRate, monthShortNames, pluralizeDays } from '../format';
import { activeQuote, isTerminal, latestQuote, postMessage, state } from '../store';
import type { Inquiry, InquiryStatus, Role } from '../types';
import { requestRender } from '../ui';

const moveByStatus: Partial<Record<InquiryStatus, { agent: string; office: string; side: Role | 'client' }>> = {
  NEW: { agent: 'Czeka na biuro: przejęcie zapytania', office: 'Twój ruch: przejmij zapytanie', side: 'office' },
  QUOTING: { agent: 'Czeka na biuro: przygotowanie wyceny', office: 'Twój ruch: wystaw wycenę', side: 'office' },
  QUOTE_READY: { agent: 'Czeka na Ciebie: wyślij wycenę klientowi', office: 'Czeka na agenta: wysłanie wyceny', side: 'agent' },
  SENT_TO_CLIENT: { agent: 'Czeka na klienta: decyzja w linku', office: 'Czeka na decyzję klienta', side: 'client' },
  ACCEPTED: { agent: 'Czeka na biuro: potwierdzenie rezerwacji', office: 'Twój ruch: potwierdź rezerwację', side: 'office' },
  BOOKING_CONFIRMED: { agent: 'Rezerwacja potwierdzona – wyjazd w planie', office: 'Po powrocie: oznacz realizację', side: 'office' },
};

export function whoseMove(inquiry: Inquiry, viewer: Role): Html | null {
  if (inquiry.status === 'QUOTE_READY' && inquiry.quoteExpired) {
    return html`<p class="whose-move whose-move--alert">${viewer === 'agent' ? 'Czeka na Ciebie: poproś o odświeżenie wyceny' : 'Twój ruch: wystaw nową wersję albo zamknij'}</p>`;
  }
  const move = moveByStatus[inquiry.status];
  if (!move) return null;
  const mine = move.side === viewer;
  return html`<p class="whose-move ${mine ? 'whose-move--mine' : ''}">${viewer === 'agent' ? move.agent : move.office}</p>`;
}

export function closingBanner(inquiry: Inquiry): Html | null {
  const reason = inquiry.closeReason ?? '';
  switch (inquiry.status) {
    case 'REJECTED_BY_OFFICE':
      return banner('alert', 'Biuro odrzuciło zapytanie', reason);
    case 'REJECTED_BY_CLIENT':
      return banner('info', 'Klient odrzucił wycenę', reason || 'Klient nie podał powodu.');
    case 'WITHDRAWN_BY_AGENT':
      return banner('info', 'Zapytanie wycofane przez agenta', reason);
    case 'CANCELLED':
      return banner('alert', 'Rezerwacja anulowana', reason);
    default:
      return null;
  }
}

export function quoteExpiryBanner(inquiry: Inquiry, viewer: Role): Html | null {
  const quote = activeQuote(inquiry);
  if (inquiry.status === 'QUOTE_READY' && inquiry.quoteExpired) {
    const expired = latestQuote(inquiry);
    const when = expired ? `Wycena v${expired.version} wygasła ${formatDate(expired.validUntil)}.` : 'Wycena wygasła.';
    return banner('alert', when, viewer === 'agent' ? 'Link przestał działać. Poproś biuro o odświeżenie albo poczekaj na nową wersję.' : 'Wystaw nową wersję albo zamknij zapytanie.');
  }
  if (quote && (inquiry.status === 'QUOTE_READY' || inquiry.status === 'SENT_TO_CLIENT')) {
    const daysLeft = daysBetween(state.today, quote.validUntil);
    if (daysLeft <= 3) return banner('warning', daysLeft <= 0 ? 'Wycena wygasa dziś' : `Wycena wygasa za ${daysLeft} ${daysLeft === 1 ? 'dzień' : 'dni'}`, `Ważna do ${formatDate(quote.validUntil)}. Potem link przestanie działać.`);
  }
  return null;
}

export function groupFacts(inquiry: Inquiry): Html {
  const snapshot = inquiry.offerSnapshot;
  const belowMinimum = snapshot.minParticipants !== null && inquiry.students < snapshot.minParticipants;
  const outOfSeason = [inquiry.dateFrom, inquiry.dateTo].some((date) => !snapshot.seasonMonths.includes(Number(date.slice(5, 7))));
  return html`${definitionList([
      ['Termin preferowany', `${formatDate(inquiry.dateFrom)} – ${formatDate(inquiry.dateTo)}`],
      ['Uczniowie', inquiry.students],
      ['Opiekunowie', inquiry.guardians],
      ['Wiek lub klasa', inquiry.ageOrClass || '—'],
      ['Wyjazd z', inquiry.departureCity],
    ])}
    ${when(belowMinimum || outOfSeason, () => html`<p class="flag-row">${when(belowMinimum, () => html`<span class="chip chip--marker">poniżej minimum (${snapshot.minParticipants ?? 0})</span>`)}${when(outOfSeason, () => html`<span class="chip chip--marker">poza sezonem (${snapshot.seasonMonths.map((month) => monthShortNames[month - 1]).join(', ')})</span>`)}</p>`)}
    ${when(inquiry.notes, () => html`<p class="note-card">${inquiry.notes}</p>`)}`;
}

export function offerSnapshotFacts(inquiry: Inquiry): Html {
  const snapshot = inquiry.offerSnapshot;
  return definitionList([
    ['Oferta', snapshot.title],
    ['Region', snapshot.region],
    ['Długość', pluralizeDays(snapshot.days)],
    ['Cena „od” przy złożeniu', snapshot.priceFrom ? formatMoney(snapshot.priceFrom) : '—'],
  ]);
}

export function quoteVersionHistory(inquiry: Inquiry, excludeQuoteId: string | null): Html | null {
  const older = inquiry.quotes.filter((quote) => quote.id !== excludeQuoteId).sort((left, right) => right.version - left.version);
  if (older.length === 0) return null;
  return html`<details class="versions">
    <summary>Poprzednie wersje wyceny (${older.length})</summary>
    <div class="versions__list">${older.map((quote) => quoteTicket(quote, inquiry, { compact: true }))}</div>
  </details>`;
}

export function bookingFacts(inquiry: Inquiry, viewer: Role): Html | null {
  if (!inquiry.contractNumber && !inquiry.commission) return null;
  const commission = inquiry.commission;
  const commissionLabel = viewer === 'agent' ? 'Twoja prowizja' : 'Prowizja agenta';
  const rows: Array<[string, Html | string]> = [];
  if (inquiry.contractNumber) rows.push(['Numer umowy', html`<span class="mono">${inquiry.contractNumber}</span>`]);
  if (inquiry.completion) {
    rows.push(['Wartość końcowa', formatMoney(inquiry.completion.finalValue)]);
    rows.push(['Uczestnicy faktycznie', String(inquiry.completion.actualParticipants)]);
  }
  if (commission) {
    rows.push([commissionLabel, html`<strong>${formatMoney(commission.amount)}</strong> · ${formatRate(commission.rate)} od ${formatMoney(commission.baseValue)}`]);
    rows.push(['Status prowizji', commission.status === 'PAID' && commission.paidOn ? `Wypłacona ${formatDate(commission.paidOn)}` : commissionStatusLabels[commission.status]]);
  }
  return html`<section class="panel panel--ledger" aria-label="Rezerwacja i prowizja">${definitionList(rows)}</section>`;
}

const sampleAttachments = ['lista-uczestnikow-6b.xlsx', 'zgoda-rodzicow.pdf', 'menu-bezglutenowe.pdf'];
const composerAttachments = new Map<string, string[]>();
const activeTabByInquiry = new Map<string, 'thread' | 'history'>();

export function conversationPanel(inquiry: Inquiry, viewer: Role): Html {
  const tab = activeTabByInquiry.get(inquiry.id) ?? 'thread';
  const canWrite = !isTerminal(inquiry);
  const attachments = composerAttachments.get(inquiry.id) ?? [];
  const setTab = (next: 'thread' | 'history') =>
    onClick(() => {
      activeTabByInquiry.set(inquiry.id, next);
      requestRender();
    });
  return html`<section class="panel conversation" aria-label="Wątek i historia">
    <div class="tabs" role="tablist">
      <button role="tab" aria-selected="${tab === 'thread'}" class="${tab === 'thread' ? 'is-on' : ''}" ${setTab('thread')}>Wiadomości (${inquiry.messages.length})</button>
      <button role="tab" aria-selected="${tab === 'history'}" class="${tab === 'history' ? 'is-on' : ''}" ${setTab('history')}>Historia (${inquiry.history.length})</button>
    </div>
    ${tab === 'history'
      ? historyTimeline(inquiry.history)
      : html`${messageThread(inquiry.messages, viewer)}
        ${canWrite
          ? html`<form class="composer" data-preserve="composer-${inquiry.id}" ${onSubmit(
              (data) => (textOf(data, 'message') || attachments.length > 0 ? {} : { message: 'Wpisz treść albo dodaj plik.' }),
              (data, form, submitter) =>
                runPending(submitter, 'Wysyłanie…', () => {
                  form.reset();
                  composerAttachments.delete(inquiry.id);
                  postMessage(inquiry, viewer, textOf(data, 'message'), attachments);
                  showToast('Wysłano wiadomość');
                }),
            )}>
              <label class="visually-hidden" for="composer-${inquiry.id}">Wiadomość</label>
              <textarea id="composer-${inquiry.id}" name="message" rows="2" placeholder="${viewer === 'agent' ? 'Napisz do biura…' : 'Napisz do agenta…'}"></textarea>
              <p class="field-error" data-error-for="message"></p>
              ${when(attachments.length > 0, () => html`<ul class="file-chips">${attachments.map((name) => html`<li>📎 ${name}</li>`)}</ul>`)}
              <div class="composer__actions">
                <button type="button" class="button button--ghost button--small" ${onClick(() => {
                  const next = sampleAttachments[attachments.length % sampleAttachments.length] ?? 'plik.pdf';
                  composerAttachments.set(inquiry.id, [...attachments, next]);
                  requestRender();
                })}>Dołącz plik</button>
                <button type="submit" class="button button--primary button--small">Wyślij</button>
              </div>
            </form>`
          : html`<p class="muted small">Zapytanie jest zamknięte – wątek jest tylko do odczytu.</p>`}`}
  </section>`;
}
