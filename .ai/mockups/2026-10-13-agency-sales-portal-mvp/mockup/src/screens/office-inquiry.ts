import { banner, definitionList, emptyState, field, linkButton, pageHeader, quoteTicket, selectField, statusChip, statusRoute, textareaField } from '../components';
import { Html, html, linesOf, numberOf, onClick, onInput, onSubmit, runPending, showToast, textOf, when } from '../dom';
import { addDays, daysBetween, formatAgeInDays, formatDate, formatDateTime, formatMoney, formatRate } from '../format';
import {
  acceptedQuote,
  activeQuote,
  agentFullName,
  cancelBooking,
  clientFullName,
  commissionAmount,
  completeBooking,
  confirmBooking,
  currentOfficeUserName,
  effectiveCommissionRate,
  findAgent,
  findClient,
  findInquiry,
  findOffer,
  inquiryValue,
  issueQuote,
  latestQuote,
  markReadBy,
  quoteValue,
  reassignHandler,
  rejectByOffice,
  reopenForRequote,
  state,
  takeOverInquiry,
} from '../store';
import { officeRejectReasons } from '../seed';
import type { Inquiry, PricedService } from '../types';
import { closeModal, openModal, type ScreenDefinition } from '../ui';
import { isWholeNumberInRange } from '../validation';
import { bookingFacts, closingBanner, conversationPanel, groupFacts, offerSnapshotFacts, quoteExpiryBanner, quoteVersionHistory, whoseMove } from './inquiry-shared';

function parseOptionalServices(lines: string[]): { services: PricedService[]; invalid: boolean } {
  const services = lines.map((line) => {
    const [name = '', price = ''] = line.split(';').map((part) => part.trim());
    return { name, price: Number(price.replace(',', '.').replace(/\s|zł/g, '')) };
  });
  return { services, invalid: services.some((service) => !service.name || !(service.price > 0)) };
}

function updateQuoteCalculator(form: HTMLFormElement, rate: number): void {
  const data = new FormData(form);
  const price = numberOf(data, 'pricePerParticipant');
  const participants = numberOf(data, 'paidParticipants');
  const output = form.querySelector<HTMLElement>('[data-calculator]');
  if (!output) return;
  const value = Number.isFinite(price) && Number.isFinite(participants) ? price * participants : 0;
  output.innerHTML = `<span>Wartość <strong>${formatMoney(value)}</strong></span><span class="muted">${Number.isFinite(price) ? formatMoney(price) : '—'} × ${Number.isFinite(participants) ? participants : '—'}</span><span>Prowizja agenta <strong>${formatMoney(commissionAmount(value, rate))}</strong> (${formatRate(rate)})</span>`;
}

export function openQuoteDrawer(inquiry: Inquiry): void {
  const previous = latestQuote(inquiry);
  const offer = findOffer(inquiry.offerId);
  const version = (previous?.version ?? 0) + 1;
  const rate = effectiveCommissionRate(inquiry);
  const rateSource = offer?.commissionRate ? 'stawka oferty' : 'stawka agenta';
  const supersedes = activeQuote(inquiry);
  const defaults = {
    dateFrom: previous?.dateFrom ?? inquiry.dateFrom,
    dateTo: previous?.dateTo ?? inquiry.dateTo,
    price: previous?.pricePerParticipant ?? offer?.priceFrom ?? '',
    paid: previous?.paidParticipants ?? inquiry.students,
    guardians: previous?.freeGuardians ?? inquiry.guardians,
    included: (previous?.included ?? offer?.included ?? []).join('\n'),
    optional: (previous?.optional ?? offer?.extras ?? []).map((service) => `${service.name}; ${service.price}`).join('\n'),
  };
  const minimum = inquiry.offerSnapshot.minParticipants;
  openModal({
    title: `Wycena v${version} dla ${inquiry.number}`,
    variant: 'drawer',
    render: () => html`<form class="form" ${onSubmit(
        (data) => {
          const errors: Record<string, string> = {};
          const dateFrom = textOf(data, 'dateFrom');
          const dateTo = textOf(data, 'dateTo');
          const validUntil = textOf(data, 'validUntil');
          const price = numberOf(data, 'pricePerParticipant');
          if (!dateFrom || dateFrom <= state.today) errors.dateFrom = 'Data wyjazdu musi być w przyszłości.';
          if (!dateTo || (dateFrom && dateTo < dateFrom)) errors.dateTo = 'Data powrotu nie może być wcześniejsza niż wyjazdu.';
          if (!(price > 0) || price > 20000 || Math.round(price * 100) !== price * 100) errors.pricePerParticipant = 'Podaj cenę za uczestnika.';
          if (!isWholeNumberInRange(numberOf(data, 'paidParticipants'), 1, 250)) errors.paidParticipants = 'Podaj liczbę płatnych uczestników.';
          if (!isWholeNumberInRange(numberOf(data, 'freeGuardians'), 0, 30)) errors.freeGuardians = 'Podaj liczbę od 0 do 30.';
          const included = linesOf(data, 'included');
          if (included.length === 0) errors.included = 'Dodaj co najmniej jedno świadczenie.';
          else if (included.some((line) => line.length > 200)) errors.included = 'Każde świadczenie może mieć najwyżej 200 znaków.';
          if (parseOptionalServices(linesOf(data, 'optional')).invalid) errors.optional = 'Podaj nazwę i cenę świadczenia, np. „Rejs po Wiśle; 35”.';
          if (!validUntil || validUntil < state.today) errors.validUntil = 'Data ważności nie może być w przeszłości.';
          else if (dateFrom && validUntil > dateFrom) errors.validUntil = 'Wycena nie może być ważna dłużej niż do dnia wyjazdu.';
          if (textOf(data, 'clientNote').length > 2000) errors.clientNote = 'Uwagi mogą mieć najwyżej 2000 znaków.';
          return errors;
        },
        (data, _form, submitter) =>
          runPending(submitter, 'Wystawianie…', () => {
            closeModal();
            issueQuote(inquiry, {
              dateFrom: textOf(data, 'dateFrom'),
              dateTo: textOf(data, 'dateTo'),
              pricePerParticipant: numberOf(data, 'pricePerParticipant'),
              paidParticipants: numberOf(data, 'paidParticipants'),
              freeGuardians: numberOf(data, 'freeGuardians'),
              included: linesOf(data, 'included'),
              optional: parseOptionalServices(linesOf(data, 'optional')).services,
              validUntil: textOf(data, 'validUntil'),
              clientNote: textOf(data, 'clientNote'),
            });
            showToast(`Wystawiono wycenę v${version}`);
          }),
      )} ${onInput((element) => {
        if (element.form) updateQuoteCalculator(element.form, rate);
        if (element.name === 'paidParticipants' && element.form && minimum) {
          const warning = element.form.querySelector<HTMLElement>('[data-minimum-warning]');
          if (warning) warning.textContent = Number(element.value) > 0 && Number(element.value) < minimum ? `Poniżej minimum oferty (${minimum}).` : '';
        }
      })}>
      ${when(previous, () => html`<details class="versions"><summary>Poprzednia wersja v${previous?.version ?? ''}: ${formatMoney(previous?.pricePerParticipant ?? 0)} × ${previous?.paidParticipants ?? 0}</summary>${previous ? quoteTicket(previous, inquiry, { compact: true }) : ''}</details>`)}
      ${when(inquiry.messages.some((message) => message.kind === 'change-request'), () => {
        const lastRequest = [...inquiry.messages].reverse().find((message) => message.kind === 'change-request');
        return banner('info', 'Ostatnia prośba agenta', lastRequest?.text ?? '');
      })}
      <div class="form-grid">
        ${field({ name: 'dateFrom', label: 'Wyjazd', type: 'date', required: true, value: defaults.dateFrom })}
        ${field({ name: 'dateTo', label: 'Powrót', type: 'date', required: true, value: defaults.dateTo })}
      </div>
      <div class="form-grid form-grid--thirds">
        ${field({ name: 'pricePerParticipant', label: 'Cena za uczestnika (zł)', type: 'number', required: true, step: '0.01', min: 0, value: defaults.price, inputMode: 'decimal' })}
        ${field({ name: 'paidParticipants', label: 'Uczestnicy płatni', type: 'number', required: true, min: 1, value: defaults.paid, inputMode: 'numeric' })}
        ${field({ name: 'freeGuardians', label: 'Opiekunowie gratis', type: 'number', required: true, min: 0, value: defaults.guardians, inputMode: 'numeric' })}
      </div>
      <p class="field-warning" data-minimum-warning aria-live="polite">${minimum && Number(defaults.paid) < minimum ? `Poniżej minimum oferty (${minimum}).` : ''}</p>
      ${textareaField({ name: 'included', label: 'Świadczenia w cenie', required: true, rows: 5, value: defaults.included, hint: 'Jedno świadczenie w wierszu. Domyślnie z oferty.' })}
      ${textareaField({ name: 'optional', label: 'Świadczenia opcjonalne', rows: 2, value: defaults.optional, hint: 'Format: nazwa; cena za osobę.' })}
      ${field({ name: 'validUntil', label: 'Ważna do', type: 'date', required: true, value: addDays(state.today, 14), hint: 'Domyślnie 14 dni. Po tej dacie link przestanie działać.' })}
      ${textareaField({ name: 'clientNote', label: 'Uwagi dla klienta', rows: 2, placeholder: 'np. cena zawiera wariant bez Wieliczki' })}
      ${when(supersedes, () => banner('warning', `Wersja v${supersedes?.version ?? ''} zostanie oznaczona jako Zastąpiona`, 'Jej link przestanie działać.'))}
      <div class="calculator" data-calculator aria-live="polite"><span>Wartość <strong>${formatMoney(Number(defaults.price || 0) * Number(defaults.paid))}</strong></span><span class="muted">${formatMoney(Number(defaults.price || 0))} × ${defaults.paid}</span><span>Prowizja agenta <strong>${formatMoney(commissionAmount(Number(defaults.price || 0) * Number(defaults.paid), rate))}</strong> (${formatRate(rate)}, ${rateSource})</span></div>
      <div class="form-actions form-actions--sticky">
        <button type="button" class="button button--ghost" ${onClick(() => closeModal())}>Anuluj</button>
        <button type="submit" class="button button--primary">Wystaw wycenę v${version}</button>
      </div>
    </form>`,
  });
}

function reasonModal(options: { title: string; reasons: string[]; messageLabel: string; messageError: string; effects: string; submitLabel: string; pendingLabel: string; onConfirm: (reason: string) => void; toast: string }): void {
  openModal({
    title: options.title,
    variant: 'dialog',
    render: () => html`<form class="form" ${onSubmit(
        (data) => {
          const errors: Record<string, string> = {};
          if (!textOf(data, 'reason')) errors.reason = 'Wybierz powód.';
          const message = textOf(data, 'message');
          if (message.length < 10 || message.length > 1000) errors.message = options.messageError;
          return errors;
        },
        (data, _form, submitter) =>
          runPending(submitter, options.pendingLabel, () => {
            closeModal();
            options.onConfirm(`${textOf(data, 'reason')}: ${textOf(data, 'message')}`);
            showToast(options.toast);
          }),
      )}>
      ${selectField({ name: 'reason', label: 'Powód', required: true, emptyLabel: 'Wybierz…', choices: options.reasons.map((reason) => ({ value: reason, label: reason })) })}
      ${textareaField({ name: 'message', label: options.messageLabel, required: true, rows: 3, hint: 'Agent zobaczy tę treść na karcie zapytania.' })}
      ${banner('warning', 'Skutki', options.effects)}
      <div class="form-actions">
        <button type="button" class="button button--ghost" ${onClick(() => closeModal())}>Wróć</button>
        <button type="submit" class="button button--danger">${options.submitLabel}</button>
      </div>
    </form>`,
  });
}

function openRejectModal(inquiry: Inquiry): void {
  reasonModal({
    title: inquiry.quoteExpired ? 'Zamknij zapytanie' : 'Odrzuć zapytanie',
    reasons: officeRejectReasons,
    messageLabel: 'Wiadomość dla agenta',
    messageError: 'Napisz agentowi, dlaczego zapytanie jest odrzucane.',
    effects: `Status zmieni się na „Odrzucona (biuro)”.${activeQuote(inquiry) ? ' Aktywna wycena zostanie unieważniona.' : ''}${inquiry.status === 'ACCEPTED' ? ' Prognozowana prowizja agenta zostanie anulowana.' : ''}`,
    submitLabel: 'Odrzuć zapytanie',
    pendingLabel: 'Odrzucanie…',
    onConfirm: (reason) => rejectByOffice(inquiry, reason),
    toast: 'Odrzucono zapytanie',
  });
}

function openCancelModal(inquiry: Inquiry): void {
  reasonModal({
    title: 'Anuluj rezerwację',
    reasons: ['Rezygnacja szkoły', 'Brak minimum uczestników', 'Siła wyższa', 'Inny powód'],
    messageLabel: 'Opis dla agenta',
    messageError: 'Opisz powód anulowania dla agenta.',
    effects: 'Status zmieni się na „Anulowana”, prowizja agenta zostanie anulowana (0 zł).',
    submitLabel: 'Anuluj rezerwację',
    pendingLabel: 'Anulowanie…',
    onConfirm: (reason) => cancelBooking(inquiry, reason),
    toast: 'Anulowano rezerwację',
  });
}

function openConfirmBookingModal(inquiry: Inquiry): void {
  const quote = acceptedQuote(inquiry);
  if (!quote) return;
  openModal({
    title: 'Potwierdź rezerwację',
    variant: 'dialog',
    render: () => html`<form class="form" ${onSubmit(
        (data) => {
          const contractNumber = textOf(data, 'contractNumber');
          if (contractNumber.length < 3 || contractNumber.length > 40) return { contractNumber: 'Wpisz numer umowy.' };
          const taken = state.inquiries.find((candidate) => candidate.contractNumber === contractNumber && candidate.id !== inquiry.id);
          return taken ? { contractNumber: `Numer umowy ${contractNumber} jest przypisany do ${taken.number}.` } : {};
        },
        (data, _form, submitter) =>
          runPending(submitter, 'Potwierdzanie…', () => {
            closeModal();
            confirmBooking(inquiry, textOf(data, 'contractNumber'));
            showToast('Potwierdzono rezerwację');
          }),
      )}>
      ${definitionList([
        ['Wycena', `v${quote.version}: ${formatMoney(quote.pricePerParticipant)} × ${quote.paidParticipants} = ${formatMoney(quoteValue(quote))}`],
        ['Termin', `${formatDate(quote.dateFrom)} – ${formatDate(quote.dateTo)}`],
        ['Akceptacja', quote.decision ? `${quote.decision.channel === 'link' ? 'link klienta' : 'odnotowana przez agenta'}, ${formatDateTime(quote.decision.at)}` : '—'],
      ])}
      ${field({ name: 'contractNumber', label: 'Numer umowy', required: true, placeholder: 'np. UM/2027/0118', hint: 'Umowę zawierasz poza portalem.' })}
      <div class="form-actions">
        <button type="button" class="button button--ghost" ${onClick(() => closeModal())}>Anuluj</button>
        <button type="submit" class="button button--primary">Potwierdź rezerwację</button>
      </div>
    </form>`,
  });
}

function openRequoteModal(inquiry: Inquiry): void {
  openModal({
    title: 'Zmiana warunków – powrót do wyceny',
    variant: 'dialog',
    render: () => html`<form class="form" ${onSubmit(
        (data) => {
          const errors: Record<string, string> = {};
          const message = textOf(data, 'message');
          if (message.length < 10 || message.length > 2000) errors.message = 'Opisz, co się zmienia w ofercie.';
          if (!data.get('consent')) errors.consent = 'Potwierdź, że agent zgodził się na zmianę.';
          return errors;
        },
        (data, _form, submitter) =>
          runPending(submitter, 'Przywracanie…', () => {
            closeModal();
            reopenForRequote(inquiry, textOf(data, 'message'));
            showToast('Przywrócono do wyceny');
            openQuoteDrawer(inquiry);
          }),
      )}>
      ${textareaField({ name: 'message', label: 'Opis zmiany', required: true, rows: 3, placeholder: 'np. hostel przy Plantach niedostępny, proponujemy hotel na Kazimierzu (+40 zł/os.)', hint: 'Trafi do wątku z agentem.' })}
      <label class="check-row"><input type="checkbox" name="consent" value="1"> Agent zgodził się w wątku na zmianę</label>
      <p class="field-error" data-error-for="consent"></p>
      ${banner('warning', 'Skutki', 'Zaakceptowana wycena zostanie zastąpiona, prognozowana prowizja anulowana, a klient będzie musiał zaakceptować nową wersję.')}
      <div class="form-actions">
        <button type="button" class="button button--ghost" ${onClick(() => closeModal())}>Anuluj</button>
        <button type="submit" class="button button--primary">Przywróć do wyceny</button>
      </div>
    </form>`,
  });
}

export function openCompletionModal(inquiry: Inquiry): void {
  const quote = acceptedQuote(inquiry);
  const quotedValue = quote ? quoteValue(quote) : inquiryValue(inquiry).value;
  const rate = inquiry.commission?.rate ?? effectiveCommissionRate(inquiry);
  const returned = inquiry.dateTo < state.today;
  const refresh = (form: HTMLFormElement) => {
    const data = new FormData(form);
    const finalValue = numberOf(data, 'finalValue');
    const preview = form.querySelector<HTMLElement>('[data-commission-preview]');
    const deviation = form.querySelector<HTMLElement>('[data-deviation-warning]');
    if (preview) preview.innerHTML = Number.isFinite(finalValue) ? `Prowizja należna: ${formatMoney(finalValue)} × ${formatRate(rate)} = <strong>${formatMoney(commissionAmount(finalValue, rate))}</strong>` : 'Prowizja należna: —';
    if (deviation) {
      const percent = quotedValue ? Math.round((Math.abs(finalValue - quotedValue) / quotedValue) * 100) : 0;
      deviation.textContent = Number.isFinite(finalValue) && percent > 30 ? `Wartość różni się od wyceny o ${percent}%. Sprawdź kwotę.` : '';
    }
  };
  openModal({
    title: 'Oznacz jako zrealizowaną',
    variant: 'dialog',
    render: () =>
      !returned
        ? html`${banner('info', `Wyjazd kończy się ${formatDate(inquiry.dateTo)}`, 'Realizację oznaczysz po tej dacie.')}<div class="form-actions"><button class="button button--ghost" ${onClick(() => closeModal())}>Zamknij</button></div>`
        : html`<form class="form" ${onSubmit(
            (data) => {
              const errors: Record<string, string> = {};
              const finalValue = numberOf(data, 'finalValue');
              if (!(finalValue >= 0) || Math.round(finalValue * 100) !== finalValue * 100) errors.finalValue = 'Podaj wartość końcową sprzedaży.';
              const participants = textOf(data, 'actualParticipants');
              if (participants && !isWholeNumberInRange(Number(participants), 1, 250)) errors.actualParticipants = 'Podaj liczbę od 1 do 250.';
              if (finalValue !== quotedValue && !textOf(data, 'comment')) errors.comment = 'Wyjaśnij różnicę wartości, np. pojechało 27 uczniów.';
              return errors;
            },
            (data, _form, submitter) =>
              runPending(submitter, 'Zapisywanie…', () => {
                closeModal();
                completeBooking(inquiry, numberOf(data, 'finalValue'), Number(textOf(data, 'actualParticipants') || quote?.paidParticipants || inquiry.students), textOf(data, 'comment'));
                showToast('Oznaczono jako zrealizowane');
              }),
          )} ${onInput((element) => {
            if (element.form) refresh(element.form);
          })}>
          <p>Wycena: ${quote ? `${formatMoney(quote.pricePerParticipant)} × ${quote.paidParticipants} = ` : ''}<strong>${formatMoney(quotedValue)}</strong></p>
          <div class="form-grid">
            ${field({ name: 'finalValue', label: 'Wartość końcowa (zł)', type: 'number', step: '0.01', required: true, value: quotedValue, inputMode: 'decimal' })}
            ${field({ name: 'actualParticipants', label: 'Uczestnicy faktycznie', type: 'number', value: quote?.paidParticipants ?? inquiry.students, inputMode: 'numeric' })}
          </div>
          ${when(quote, () => html`<button type="button" class="button button--ghost button--small" ${onClick((element) => {
            const form = element.closest('form');
            if (!form || !quote) return;
            const participantsField = form.elements.namedItem('actualParticipants');
            const finalValueField = form.elements.namedItem('finalValue');
            if (!(participantsField instanceof HTMLInputElement) || !(finalValueField instanceof HTMLInputElement)) return;
            finalValueField.value = String(Number(participantsField.value) * quote.pricePerParticipant);
            refresh(form);
          })}>Przelicz: uczestnicy × ${formatMoney(quote?.pricePerParticipant ?? 0)}</button>`)}
          <p class="field-warning" data-deviation-warning aria-live="polite"></p>
          ${textareaField({ name: 'comment', label: 'Komentarz', rows: 2, hint: 'Wymagany, gdy wartość różni się od wyceny.' })}
          <p class="calculator" data-commission-preview aria-live="polite">Prowizja należna: ${formatMoney(quotedValue)} × ${formatRate(rate)} = <strong>${formatMoney(commissionAmount(quotedValue, rate))}</strong></p>
          <div class="form-actions">
            <button type="button" class="button button--ghost" ${onClick(() => closeModal())}>Anuluj</button>
            <button type="submit" class="button button--primary">Oznacz jako zrealizowaną</button>
          </div>
        </form>`,
  });
}

function officeActions(inquiry: Inquiry): Html {
  const me = currentOfficeUserName();
  const buttons: Html[] = [];
  const nextVersion = (latestQuote(inquiry)?.version ?? 0) + 1;
  const takeOver = (label: string, primary: boolean) =>
    html`<button class="button ${primary ? 'button--primary' : 'button--secondary'}" ${onClick((element) =>
      runPending(element, 'Przejmowanie…', () => {
        takeOverInquiry(inquiry);
        showToast('Przejęto zapytanie');
      }),
    )}>${label}</button>`;
  switch (inquiry.status) {
    case 'NEW':
      buttons.push(takeOver('Przejmij', true));
      buttons.push(html`<button class="button button--danger-ghost" ${onClick(() => openRejectModal(inquiry))}>Odrzuć</button>`);
      break;
    case 'QUOTING':
      buttons.push(html`<button class="button button--primary" ${onClick(() => openQuoteDrawer(inquiry))}>Wystaw wycenę v${nextVersion}</button>`);
      if (inquiry.handledBy && inquiry.handledBy !== me) {
        buttons.push(html`<button class="button button--secondary" ${onClick((element) =>
          runPending(element, 'Przejmowanie…', () => {
            reassignHandler(inquiry);
            showToast('Przejęto zapytanie');
          }),
        )}>Przejmij od ${inquiry.handledBy}</button>`);
      }
      buttons.push(html`<button class="button button--danger-ghost" ${onClick(() => openRejectModal(inquiry))}>Odrzuć</button>`);
      break;
    case 'QUOTE_READY':
      if (inquiry.quoteExpired) {
        buttons.push(html`<button class="button button--primary" ${onClick(() => openQuoteDrawer(inquiry))}>Wystaw nową wersję</button>`);
        buttons.push(html`<button class="button button--danger-ghost" ${onClick(() => openRejectModal(inquiry))}>Zamknij zapytanie</button>`);
      }
      break;
    case 'ACCEPTED':
      buttons.push(html`<button class="button button--primary" ${onClick(() => openConfirmBookingModal(inquiry))}>Potwierdź rezerwację</button>`);
      buttons.push(html`<button class="button button--secondary" ${onClick(() => openRequoteModal(inquiry))}>Zmiana warunków</button>`);
      buttons.push(html`<button class="button button--danger-ghost" ${onClick(() => openRejectModal(inquiry))}>Odrzuć (brak dostępności)</button>`);
      break;
    case 'BOOKING_CONFIRMED': {
      const returned = inquiry.dateTo < state.today;
      buttons.push(html`<button class="button button--primary" ${returned ? '' : 'disabled'} ${onClick(() => openCompletionModal(inquiry))}>Oznacz jako zrealizowaną</button>`);
      if (!returned) buttons.push(html`<p class="muted small">Dostępne po ${formatDate(inquiry.dateTo)}.</p>`);
      buttons.push(html`<button class="button button--danger-ghost" ${onClick(() => openCancelModal(inquiry))}>Anuluj rezerwację</button>`);
      break;
    }
    default:
      break;
  }
  return buttons.length ? html`<div class="action-bar">${buttons}</div>` : html``;
}

export function officeInquiryDetailScreen(inquiryId: string): ScreenDefinition {
  const inquiry = findInquiry(inquiryId);
  if (!inquiry || inquiry.status === 'DRAFT') {
    return {
      screenId: 'B-02',
      title: 'Nie znaleziono zapytania',
      skeleton: 'detail',
      render: () => html`${pageHeader({ title: 'Nie znaleziono zapytania', back: { href: '#/biuro/kolejka', label: 'Kolejka' } })}${emptyState({ title: 'To zapytanie nie istnieje', text: 'Wróć do kolejki.', action: linkButton('Kolejka', '#/biuro/kolejka') })}`,
    };
  }
  markReadBy(inquiry, 'office');
  const agent = findAgent(inquiry.agentId);
  const client = findClient(inquiry.clientId);
  const offer = findOffer(inquiry.offerId);
  const rate = effectiveCommissionRate(inquiry);
  const displayedQuote = activeQuote(inquiry) ?? acceptedQuote(inquiry);
  const age = daysBetween(inquiry.statusChangedAt, state.today);
  const emptyQuote = inquiry.status === 'NEW' ? 'Przejmij zapytanie, żeby przygotować wycenę.' : inquiry.status === 'QUOTING' ? `Brak aktywnej wyceny. Wystaw wycenę v${(latestQuote(inquiry)?.version ?? 0) + 1}.` : '';
  return {
    screenId: 'B-02',
    title: inquiry.number,
    skeleton: 'detail',
    errorCopy: { title: 'Nie udało się wczytać zapytania', text: 'Spróbuj ponownie.', code: `GET /inquiries/${inquiry.id} · 500` },
    render: () => html`${pageHeader({
        back: { href: '#/biuro/kolejka', label: 'Kolejka' },
        eyebrow: `${inquiry.number} · w statusie ${formatAgeInDays(age)} · ${inquiry.handledBy ? `obsługuje: ${inquiry.handledBy}` : 'nieprzejęte'}`,
        title: inquiry.offerSnapshot.title,
        lead: html`${agentFullName(agent)} (${agent.companyName}) dla ${clientFullName(client)} · ${statusChip(inquiry)}`,
      })}
      ${statusRoute(inquiry)}
      ${whoseMove(inquiry, 'office')}
      ${closingBanner(inquiry)}
      ${quoteExpiryBanner(inquiry, 'office')}
      <div class="detail-layout">
        <div class="detail-layout__main">
          <section aria-labelledby="quote-heading">
            <h2 id="quote-heading" class="section-title">${displayedQuote ? `Wycena v${displayedQuote.version}` : 'Wycena'}</h2>
            ${displayedQuote
              ? quoteTicket(displayedQuote, inquiry, { showCommission: displayedQuote.status === 'ACTIVE' ? rate : null, commissionLabel: `Prowizja agenta (${offer?.commissionRate ? 'stawka oferty' : 'stawka agenta'})` })
              : emptyQuote
                ? html`<div class="ticket-placeholder"><p>${emptyQuote}</p></div>`
                : ''}
            ${officeActions(inquiry)}
            ${quoteVersionHistory(inquiry, displayedQuote?.id ?? null)}
          </section>
          ${bookingFacts(inquiry, 'office')}
          ${conversationPanel(inquiry, 'office')}
        </div>
        <aside class="detail-layout__side">
          <section class="panel"><h2 class="panel__title">Grupa</h2>${groupFacts(inquiry)}</section>
          <section class="panel"><h2 class="panel__title">Agent</h2>
            ${definitionList([
              ['Agent', html`<a href="#/biuro/agenci/${agent.id}">${agentFullName(agent)}</a>`],
              ['Firma', agent.companyName],
              ['Telefon', agent.phone],
              ['Stawka', `${formatRate(agent.commissionRate)}${offer?.commissionRate ? ` (oferta: ${formatRate(offer.commissionRate)})` : ''}`],
            ])}
          </section>
          <section class="panel"><h2 class="panel__title">Klient</h2>
            ${definitionList([
              ['Osoba', clientFullName(client)],
              ['Szkoła', [client?.school, client?.city].filter(Boolean).join(', ') || '—'],
              ['Kontakt', [client?.phone, client?.email].filter(Boolean).join(' · ') || '—'],
            ])}
          </section>
          <section class="panel"><h2 class="panel__title">Migawka oferty</h2>${offerSnapshotFacts(inquiry)}
            ${when(offer, () => html`<a class="text-link" href="#/biuro/oferty/${offer?.id ?? ''}">Aktualna oferta →</a>`)}
          </section>
        </aside>
      </div>`,
  };
}
