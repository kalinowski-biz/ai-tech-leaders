import { banner, emptyState, linkButton, pageHeader, quoteTicket, rowLink, selectField, statusChip, statusRoute, textareaField, unreadDot } from '../components';
import { copyToClipboard, Html, html, onChange, onClick, onSubmit, runPending, showToast, textOf, when } from '../dom';
import { formatDate, formatDateRange, formatMoney, formatRate, inquiryStatusLabels } from '../format';
import { currentLocation, navigate, withQuery } from '../navigation';
import {
  acceptedQuote,
  activeQuote,
  agentFullName,
  clientFullName,
  commissionAmount,
  effectiveCommissionRate,
  findAgent,
  findClient,
  findInquiry,
  findOffer,
  funnelStatuses,
  inquiriesOfAgent,
  inquiryValue,
  isTerminal,
  markReadBy,
  quoteValue,
  recordClientDecision,
  requestChange,
  sendQuoteToClient,
  state,
  terminalStatuses,
  withdrawByAgent,
} from '../store';
import { withdrawReasons } from '../seed';
import type { Inquiry, InquiryStatus } from '../types';
import { closeModal, openModal, type ScreenDefinition } from '../ui';
import { bookingFacts, closingBanner, conversationPanel, groupFacts, offerSnapshotFacts, quoteExpiryBanner, quoteVersionHistory, whoseMove } from './inquiry-shared';

const statusPresets: Record<string, { label: string; statuses: InquiryStatus[] }> = {
  aktywne: { label: 'Aktywne', statuses: funnelStatuses },
  zamkniete: { label: 'Zamknięte', statuses: terminalStatuses },
  szkice: { label: 'Szkice', statuses: ['DRAFT'] },
};

function matchesStatusFilter(inquiry: Inquiry, statusFilter: string): boolean {
  if (!statusFilter) return true;
  const preset = statusPresets[statusFilter];
  return preset ? preset.statuses.includes(inquiry.status) : inquiry.status === statusFilter;
}

export function agentInquiryListScreen(): ScreenDefinition {
  const query = currentLocation().query;
  const filters = { status: query.get('status') ?? '', clientId: query.get('klient') ?? '', offerId: query.get('oferta') ?? '', from: query.get('od') ?? '', to: query.get('do') ?? '' };
  const apply = (patch: Partial<typeof filters>) => {
    const next = { ...filters, ...patch };
    navigate(withQuery('/agent/zapytania', { status: next.status, klient: next.clientId, oferta: next.offerId, od: next.from, do: next.to }));
  };
  const own = inquiriesOfAgent(state.currentAgentId).sort((left, right) => right.statusChangedAt.localeCompare(left.statusChangedAt));
  const rows = own.filter(
    (inquiry) =>
      matchesStatusFilter(inquiry, filters.status) &&
      (!filters.clientId || inquiry.clientId === filters.clientId) &&
      (!filters.offerId || inquiry.offerId === filters.offerId) &&
      (!filters.from || inquiry.dateFrom >= filters.from) &&
      (!filters.to || inquiry.dateFrom <= filters.to),
  );
  const hasFilters = Object.values(filters).some(Boolean);
  const ownClients = state.clients.filter((client) => client.agentId === state.currentAgentId);
  const offersInUse = [...new Map(own.map((inquiry) => [inquiry.offerId, inquiry.offerSnapshot.title])).entries()];
  const dateRangeInvalid = Boolean(filters.from && filters.to && filters.from > filters.to);
  const firstInquiryEmpty = emptyState({ title: 'Nie masz jeszcze zapytań', text: 'Znajdź ofertę dla swojego klienta i złóż pierwsze zapytanie.', action: linkButton('Przeglądaj oferty', '#/agent/oferty', 'primary') });

  const filterBar = html`<form class="filter-bar" onsubmit="return false" aria-label="Filtry zapytań">
    <label class="filter"><span>Status</span>
      <select ${onChange((element) => apply({ status: element.value }))}>
        <option value="">Wszystkie</option>
        ${Object.entries(statusPresets).map(([value, preset]) => html`<option value="${value}" ${filters.status === value ? 'selected' : ''}>${preset.label}</option>`)}
        <optgroup label="Status">${[...funnelStatuses, ...terminalStatuses].map((status) => html`<option value="${status}" ${filters.status === status ? 'selected' : ''}>${inquiryStatusLabels[status]}</option>`)}</optgroup>
      </select>
    </label>
    <label class="filter"><span>Klient</span>
      <select ${onChange((element) => apply({ clientId: element.value }))}><option value="">Wszyscy</option>${ownClients.map((client) => html`<option value="${client.id}" ${filters.clientId === client.id ? 'selected' : ''}>${clientFullName(client)}</option>`)}</select>
    </label>
    <label class="filter"><span>Oferta</span>
      <select ${onChange((element) => apply({ offerId: element.value }))}><option value="">Wszystkie</option>${offersInUse.map(([offerId, title]) => html`<option value="${offerId}" ${filters.offerId === offerId ? 'selected' : ''}>${title}</option>`)}</select>
    </label>
    <fieldset class="filter filter--range"><legend>Wyjazd</legend>
      <input type="date" aria-label="od" value="${filters.from}" ${onChange((element) => apply({ from: element.value }))}>
      <span aria-hidden="true">–</span>
      <input type="date" aria-label="do" value="${filters.to}" ${dateRangeInvalid ? html`aria-invalid="true"` : ''} ${onChange((element) => apply({ to: element.value }))}>
    </fieldset>
  </form>
  ${when(dateRangeInvalid, () => html`<p class="field-error">Data początkowa musi być wcześniejsza niż końcowa.</p>`)}`;

  return {
    screenId: 'A-05',
    title: 'Zapytania',
    skeleton: 'list',
    errorCopy: { title: 'Nie udało się wczytać zapytań', text: 'Spróbuj ponownie za chwilę.', code: 'GET /inquiries · 503' },
    render: () => html`${pageHeader({ eyebrow: 'Sprzedaż', title: 'Moje zapytania', actions: linkButton('Nowe zapytanie', '#/agent/oferty', 'primary') })}
      ${filterBar}
      ${own.length === 0
        ? firstInquiryEmpty
        : rows.length === 0
          ? emptyState({ title: 'Brak zapytań dla tych filtrów', text: 'Zmień status albo klienta, żeby zobaczyć więcej.', action: hasFilters ? linkButton('Wyczyść filtry', '#/agent/zapytania') : undefined })
          : html`<div class="table-wrap"><table class="table">
              <thead><tr><th>Numer</th><th>Klient</th><th>Oferta</th><th>Termin</th><th class="numeric">Uczestnicy</th><th>Status</th><th class="numeric">Wartość</th></tr></thead>
              <tbody>${rows.map((inquiry) => {
                const client = findClient(inquiry.clientId);
                const href = inquiry.status === 'DRAFT' ? `/agent/zapytania/${inquiry.id}/edycja` : `/agent/zapytania/${inquiry.id}`;
                const value = inquiryValue(inquiry);
                return html`<tr class="is-clickable ${inquiry.unreadForAgent ? 'is-unread' : ''}" ${rowLink(href)}>
                  <td data-label="Numer" class="mono">${unreadDot(inquiry.unreadForAgent)}<a href="#${href}">${inquiry.number}</a></td>
                  <td data-label="Klient">${clientFullName(client)}<br><span class="muted small">${client?.school ?? ''}</span></td>
                  <td data-label="Oferta">${inquiry.offerSnapshot.title}</td>
                  <td data-label="Termin">${formatDateRange(inquiry.dateFrom, inquiry.dateTo)}</td>
                  <td data-label="Uczestnicy" class="numeric">${inquiry.students} + ${inquiry.guardians}</td>
                  <td data-label="Status">${statusChip(inquiry)}</td>
                  <td data-label="Wartość" class="numeric mono">${value.estimated ? '—' : formatMoney(value.value)}</td>
                </tr>`;
              })}</tbody>
            </table></div>`}`,
    renderEmpty: () => html`${pageHeader({ eyebrow: 'Sprzedaż', title: 'Moje zapytania' })}${firstInquiryEmpty}`,
  };
}

function quoteLink(token: string): string {
  return `${window.location.origin}${window.location.pathname}#/w/${token}`;
}

function openSendQuoteModal(inquiry: Inquiry): void {
  const agentName = agentFullName(findAgent(inquiry.agentId));
  openModal({
    title: inquiry.status === 'QUOTE_READY' ? 'Wyślij wycenę klientowi' : 'Link do wyceny',
    variant: 'dialog',
    render: () => {
      const quote = activeQuote(inquiry);
      if (!quote) return banner('alert', 'Ta wycena nie jest już aktywna', 'Odśwież kartę zapytania.');
      if (inquiry.status === 'QUOTE_READY') {
        return html`<p>Wygenerujemy link do wyceny <strong>v${quote.version}</strong> na <strong>${formatMoney(quoteValue(quote))}</strong>, ważnej do ${formatDate(quote.validUntil)}. Link wyślesz klientowi SMS-em, e-mailem albo komunikatorem.</p>
          <p class="muted small">Status zmieni się na „Wysłana do klienta”.</p>
          <div class="form-actions">
            <button class="button button--ghost" ${onClick(() => closeModal())}>Anuluj</button>
            <button class="button button--primary" ${onClick((element) => runPending(element, 'Wysyłanie…', () => {
              sendQuoteToClient(inquiry);
              showToast('Wysłano wycenę klientowi');
            }))}>Wyślij klientowi</button>
          </div>`;
      }
      const link = quoteLink(quote.token ?? '');
      const client = findClient(inquiry.clientId);
      const smsText = `Dzień dobry, przesyłam wycenę wycieczki ${inquiry.offerSnapshot.title}: ${link} . Wycena ważna do ${formatDate(quote.validUntil)}. ${agentName}`;
      const copyButton = (label: string, text: string, done: string) =>
        html`<button class="button button--secondary" ${onClick(async (element) => {
          const copied = await copyToClipboard(text);
          if (!copied) {
            showToast('Skopiuj ręcznie (Ctrl+C)', 'info');
            return;
          }
          element.textContent = done;
          window.setTimeout(() => {
            element.textContent = label;
          }, 2000);
          showToast(done);
        })}>${label}</button>`;
      return html`<p>Wyślij ten link ${client ? html`<strong>${clientFullName(client)}</strong>` : 'klientowi'}. Działa do ${formatDate(quote.validUntil)} albo do decyzji klienta.</p>
        <label class="field"><span>Link do wyceny</span><input class="mono" readonly value="${link}" ${onClick((element) => {
          if (element instanceof HTMLInputElement) element.select();
        })}></label>
        <label class="field"><span>Treść SMS</span><textarea readonly rows="3">${smsText}</textarea></label>
        <div class="form-actions form-actions--wrap">
          ${copyButton('Kopiuj link', link, 'Skopiowano link')}
          ${copyButton('Kopiuj treść SMS', smsText, 'Skopiowano treść')}
          <a class="button button--ghost" href="#/w/${quote.token ?? ''}" target="_blank" rel="noopener">Podgląd strony klienta ↗</a>
        </div>`;
    },
  });
}

const changeSuggestions = ['Inny termin: ', 'Inna liczba uczestników: ', 'Tańszy wariant: ', 'Odśwież wygasłą wycenę bez zmian w programie.'];

function openChangeRequestModal(inquiry: Inquiry): void {
  const quote = activeQuote(inquiry);
  openModal({
    title: inquiry.quoteExpired ? 'Poproś o odświeżenie wyceny' : 'Poproś o zmianę wyceny',
    variant: 'dialog',
    render: () => html`<form class="form" ${onSubmit(
        (data) => (textOf(data, 'description').length >= 10 && textOf(data, 'description').length <= 2000 ? {} : { description: 'Opisz, co ma się zmienić w wycenie (min. 10 znaków).' }),
        (data, _form, submitter) =>
          runPending(submitter, 'Wysyłanie…', () => {
            closeModal();
            requestChange(inquiry, textOf(data, 'description'));
            showToast('Wysłano prośbę o zmianę');
          }),
      )}>
      <div class="suggestions" aria-label="Podpowiedzi">${changeSuggestions.map((suggestion) => html`<button type="button" class="check-chip" ${onClick((element) => {
        const textarea = element.closest('form')?.querySelector('textarea');
        if (textarea) {
          textarea.value = suggestion + textarea.value;
          textarea.focus();
        }
      })}><span>${suggestion.replace(/: $/, '')}</span></button>`)}</div>
      ${textareaField({ name: 'description', label: 'Czego oczekuje klient?', required: true, rows: 4, placeholder: 'np. wariant bez Wieliczki, 30 uczniów zamiast 25' })}
      ${when(quote, () => banner('warning', `Aktywna wycena v${quote?.version ?? ''} zostanie unieważniona`, 'Link wysłany klientowi przestanie działać. Biuro wystawi nową wersję.'))}
      <div class="form-actions">
        <button type="button" class="button button--ghost" ${onClick(() => closeModal())}>Anuluj</button>
        <button type="submit" class="button button--primary">Wyślij prośbę</button>
      </div>
    </form>`,
  });
}

const clientRejectReasons = ['Cena', 'Termin', 'Wybrano inną ofertę', 'Rezygnacja z wyjazdu', 'Inny'];

function openClientDecisionModal(inquiry: Inquiry, accepted: boolean): void {
  const quote = activeQuote(inquiry);
  if (!quote) return;
  const rate = effectiveCommissionRate(inquiry);
  const value = quoteValue(quote);
  openModal({
    title: accepted ? 'Klient zaakceptował wycenę' : 'Klient odrzucił wycenę',
    variant: 'dialog',
    render: () => html`<form class="form" ${onSubmit(
        (data) => {
          const errors: Record<string, string> = {};
          const note = textOf(data, 'note');
          if (note.length < 3 || note.length > 500) errors.note = 'Napisz, jak klient przekazał decyzję, np. telefonicznie 12.11.';
          if (!accepted && !textOf(data, 'reason')) errors.reason = 'Wybierz powód odrzucenia.';
          return errors;
        },
        (data, _form, submitter) =>
          runPending(submitter, 'Zapisywanie…', () => {
            closeModal();
            const note = accepted ? textOf(data, 'note') : `${textOf(data, 'reason')}: ${textOf(data, 'note')}`;
            recordClientDecision(inquiry, accepted, 'agent', note);
            showToast(accepted ? 'Odnotowano akceptację klienta' : 'Odnotowano odrzucenie przez klienta');
          }),
      )}>
      <p>Wycena v${quote.version}: ${formatMoney(quote.pricePerParticipant)} × ${quote.paidParticipants} = <strong>${formatMoney(value)}</strong></p>
      ${accepted
        ? banner('info', `Prognozowana prowizja: ${formatMoney(commissionAmount(value, rate))} (${formatRate(rate)})`, 'Stawka zostanie zamrożona w chwili odnotowania akceptacji.')
        : selectField({ name: 'reason', label: 'Powód', required: true, emptyLabel: 'Wybierz…', choices: clientRejectReasons.map((reason) => ({ value: reason, label: reason })) })}
      ${textareaField({ name: 'note', label: 'Adnotacja', required: true, rows: 2, placeholder: 'np. telefonicznie 12.11, po zebraniu z rodzicami', hint: 'Trafi do historii zapytania z kanałem „agent”.' })}
      <div class="form-actions">
        <button type="button" class="button button--ghost" ${onClick(() => closeModal())}>Anuluj</button>
        <button type="submit" class="button ${accepted ? 'button--primary' : 'button--danger'}">${accepted ? 'Odnotuj akceptację' : 'Odnotuj odrzucenie'}</button>
      </div>
    </form>`,
  });
}

function openWithdrawModal(inquiry: Inquiry): void {
  openModal({
    title: 'Wycofaj zapytanie',
    variant: 'dialog',
    render: () => html`<form class="form" ${onSubmit(
        (data) => {
          const errors: Record<string, string> = {};
          const reason = textOf(data, 'reason');
          if (!reason) errors.reason = 'Wybierz powód.';
          if (reason === 'Inny powód' && !textOf(data, 'details')) errors.details = 'Opisz powód wycofania.';
          if (textOf(data, 'details').length > 1000) errors.details = 'Opis może mieć najwyżej 1000 znaków.';
          return errors;
        },
        (data, _form, submitter) =>
          runPending(submitter, 'Wycofywanie…', () => {
            closeModal();
            withdrawByAgent(inquiry, [textOf(data, 'reason'), textOf(data, 'details')].filter(Boolean).join(': '));
            showToast('Wycofano zapytanie');
          }),
      )}>
      ${selectField({ name: 'reason', label: 'Powód', required: true, emptyLabel: 'Wybierz…', choices: withdrawReasons.map((reason) => ({ value: reason, label: reason })) })}
      ${textareaField({ name: 'details', label: 'Opis', rows: 2, hint: 'Wymagany przy „Inny powód”. Biuro zobaczy go w historii.' })}
      ${banner('warning', 'Skutki wycofania', html`${activeQuote(inquiry) ? 'Aktywna wycena i link do niej przestaną działać. ' : ''}${inquiry.status === 'ACCEPTED' ? 'Prognozowana prowizja zostanie anulowana. ' : ''}Zapytania nie da się przywrócić.`)}
      <div class="form-actions">
        <button type="button" class="button button--ghost" ${onClick(() => closeModal())}>Anuluj</button>
        <button type="submit" class="button button--danger">Wycofaj zapytanie</button>
      </div>
    </form>`,
  });
}

function agentActions(inquiry: Inquiry): Html {
  const quote = activeQuote(inquiry);
  const buttons: Html[] = [];
  const withdrawable = ['NEW', 'QUOTING', 'QUOTE_READY', 'SENT_TO_CLIENT', 'ACCEPTED'].includes(inquiry.status);
  if (inquiry.status === 'QUOTE_READY' && quote) {
    buttons.push(html`<button class="button button--primary" ${onClick(() => openSendQuoteModal(inquiry))}>Wyślij klientowi</button>`);
    buttons.push(html`<button class="button button--secondary" ${onClick(() => openChangeRequestModal(inquiry))}>Poproś o zmianę</button>`);
  }
  if (inquiry.status === 'QUOTE_READY' && inquiry.quoteExpired) {
    buttons.push(html`<button class="button button--primary" ${onClick(() => openChangeRequestModal(inquiry))}>Poproś o odświeżenie wyceny</button>`);
  }
  if (inquiry.status === 'SENT_TO_CLIENT' && quote) {
    buttons.push(html`<button class="button button--primary" ${onClick(() => openClientDecisionModal(inquiry, true))}>Klient zaakceptował</button>`);
    buttons.push(html`<button class="button button--secondary" ${onClick(() => openClientDecisionModal(inquiry, false))}>Klient odrzucił</button>`);
    buttons.push(html`<button class="button button--secondary" ${onClick(() => openSendQuoteModal(inquiry))}>Kopiuj link</button>`);
    buttons.push(html`<button class="button button--ghost" ${onClick(() => openChangeRequestModal(inquiry))}>Poproś o zmianę</button>`);
  }
  if (withdrawable) buttons.push(html`<button class="button button--danger-ghost" ${onClick(() => openWithdrawModal(inquiry))}>Wycofaj</button>`);
  if (inquiry.status === 'BOOKING_CONFIRMED') buttons.push(html`<p class="muted small">Aby anulować rezerwację, napisz do biura w wątku.</p>`);
  return buttons.length ? html`<div class="action-bar">${buttons}</div>` : html``;
}

function quoteArea(inquiry: Inquiry, rate: number): Html {
  const quote = activeQuote(inquiry) ?? acceptedQuote(inquiry);
  if (quote) return quoteTicket(quote, inquiry, { showCommission: quote.status === 'ACTIVE' ? rate : null });
  if (inquiry.status === 'NEW' || inquiry.status === 'QUOTING') {
    return html`<div class="ticket-placeholder"><p><strong>Biuro przygotowuje wycenę.</strong></p><p class="muted">Możesz dopisać szczegóły w wiadomości – biuro je zobaczy przed wyceną.</p></div>`;
  }
  return html``;
}

export function agentInquiryDetailScreen(inquiryId: string): ScreenDefinition {
  const inquiry = findInquiry(inquiryId);
  if (!inquiry || inquiry.agentId !== state.currentAgentId) {
    return {
      screenId: 'A-06',
      title: 'Nie znaleziono zapytania',
      skeleton: 'detail',
      render: () => html`${pageHeader({ title: 'Nie znaleziono zapytania', back: { href: '#/agent/zapytania', label: 'Zapytania' } })}${emptyState({ title: 'To zapytanie nie istnieje albo nie masz do niego dostępu', text: 'Wróć do listy swoich zapytań.', action: linkButton('Moje zapytania', '#/agent/zapytania') })}`,
    };
  }
  const hadUnread = inquiry.unreadForAgent;
  markReadBy(inquiry, 'agent');
  const client = findClient(inquiry.clientId);
  const offer = findOffer(inquiry.offerId);
  const rate = effectiveCommissionRate(inquiry);
  const displayedQuote = activeQuote(inquiry) ?? acceptedQuote(inquiry);
  return {
    screenId: 'A-06',
    title: inquiry.number,
    skeleton: 'detail',
    errorCopy: { title: 'Nie udało się wczytać zapytania', text: 'Spróbuj ponownie. Jeśli problem wraca, sprawdź połączenie.', code: `GET /inquiries/${inquiry.id} · 500` },
    render: () => html`${pageHeader({
        back: { href: '#/agent/zapytania', label: 'Moje zapytania' },
        eyebrow: `${inquiry.number}${hadUnread ? ' · nowe zdarzenia' : ''}`,
        title: inquiry.offerSnapshot.title,
        lead: html`dla <a href="#/agent/klienci/${inquiry.clientId}">${clientFullName(client)}</a>${client?.school ? `, ${client.school}` : ''} · ${statusChip(inquiry)}`,
      })}
      ${statusRoute(inquiry)}
      ${whoseMove(inquiry, 'agent')}
      ${closingBanner(inquiry)}
      ${quoteExpiryBanner(inquiry, 'agent')}
      <div class="detail-layout">
        <div class="detail-layout__main">
          <section aria-labelledby="quote-heading">
            <h2 id="quote-heading" class="section-title">${displayedQuote ? `Wycena v${displayedQuote.version}` : 'Wycena'}</h2>
            ${quoteArea(inquiry, rate)}
            ${agentActions(inquiry)}
            ${quoteVersionHistory(inquiry, displayedQuote?.id ?? null)}
          </section>
          ${bookingFacts(inquiry, 'agent')}
          ${conversationPanel(inquiry, 'agent')}
        </div>
        <aside class="detail-layout__side">
          <section class="panel"><h2 class="panel__title">Grupa</h2>${groupFacts(inquiry)}</section>
          <section class="panel"><h2 class="panel__title">Oferta</h2>${offerSnapshotFacts(inquiry)}
            ${offer && offer.status === 'PUBLISHED' ? html`<a class="text-link" href="#/agent/oferty/${offer.id}">Aktualna karta oferty →</a>` : html`<p class="muted small">Oferta wycofana z katalogu – zapytanie toczy się dalej.</p>`}
          </section>
          ${when(!isTerminal(inquiry) && inquiry.status !== 'DRAFT', () => html`<p class="muted small">Prowizja dla tej oferty: ${formatRate(rate)}${offer?.commissionRate ? ' (stawka oferty)' : ''}.</p>`)}
        </aside>
      </div>`,
  };
}
