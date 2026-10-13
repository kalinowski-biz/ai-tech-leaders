import { banner, emptyState, field, linkButton, pageHeader, seasonStrip, selectField, textareaField } from '../components';
import { Html, html, numberOf, onChange, onClick, onInput, onSubmit, runPending, showFormErrors, showToast, textOf, when } from '../dom';
import { addDays, daysBetween, formatMoney, monthShortNames, pluralizeDays } from '../format';
import { currentLocation, navigate } from '../navigation';
import { clientFullName, findInquiry, findOffer, saveInquiry, state, type InquiryDraftInput } from '../store';
import type { Inquiry, Offer } from '../types';
import { requestRender, type ScreenDefinition } from '../ui';
import { isWholeNumberInRange } from '../validation';
import { openClientModal } from './agent-clients';

let selectedClientIdOverride: string | null = null;
let withdrawnOfferBlocked = false;

function seasonLabel(months: number[]): string {
  return months.map((month) => monthShortNames[month - 1]).join(', ');
}

function collectWarnings(form: HTMLFormElement, offer: Offer): string[] {
  const data = new FormData(form);
  const warnings: string[] = [];
  const students = numberOf(data, 'students');
  const dateFrom = textOf(data, 'dateFrom');
  const dateTo = textOf(data, 'dateTo');
  const exactDates = textOf(data, 'dateMode') !== 'range';
  if (offer.minParticipants && Number.isFinite(students) && students > 0 && students < offer.minParticipants) {
    warnings.push(`Oferta wymaga min. ${offer.minParticipants} uczestników. Cena za osobę może być wyższa.`);
  }
  const outOfSeason = [dateFrom, dateTo].filter(Boolean).some((date) => !offer.seasonMonths.includes(Number(date.slice(5, 7))));
  if (outOfSeason) warnings.push(`Termin wypada poza sezonem oferty (${seasonLabel(offer.seasonMonths)}). Biuro może nie mieć dostępności.`);
  if (exactDates && dateFrom && dateTo && dateTo >= dateFrom) {
    const tripDays = daysBetween(dateFrom, dateTo) + 1;
    if (tripDays !== offer.days) warnings.push(`Oferta trwa ${pluralizeDays(offer.days)}, wybrany termin ma ${pluralizeDays(tripDays)}. Biuro uwzględni to w wycenie.`);
  }
  return warnings;
}

function renderWarnings(form: HTMLFormElement, offer: Offer): void {
  const container = form.querySelector<HTMLElement>('[data-warnings]');
  if (!container) return;
  const warnings = collectWarnings(form, offer);
  container.innerHTML = warnings.length === 0 ? '' : `<div class="warning-list" role="status"><p class="warning-list__title">Ostrzeżenia – nie blokują wysłania</p><ul>${warnings.map((warning) => `<li>${warning}</li>`).join('')}</ul></div>`;
}

function validateInquiry(data: FormData): Record<string, string> {
  const errors: Record<string, string> = {};
  const tomorrow = addDays(state.today, 1);
  const dateFrom = textOf(data, 'dateFrom');
  const dateTo = textOf(data, 'dateTo');
  if (!textOf(data, 'clientId')) errors.clientId = 'Wybierz klienta albo dodaj nowego.';
  if (!dateFrom || dateFrom < tomorrow) errors.dateFrom = 'Data wyjazdu musi być w przyszłości.';
  if (!dateTo) errors.dateTo = 'Podaj datę powrotu.';
  else if (dateFrom && dateTo < dateFrom) errors.dateTo = 'Data powrotu nie może być wcześniejsza niż wyjazdu.';
  if (!isWholeNumberInRange(numberOf(data, 'students'), 1, 200)) errors.students = 'Podaj liczbę uczniów (1–200).';
  if (!isWholeNumberInRange(numberOf(data, 'guardians'), 0, 30)) errors.guardians = 'Podaj liczbę opiekunów (0–30).';
  const ageOrClass = textOf(data, 'ageOrClass');
  if (!ageOrClass || ageOrClass.length > 60) errors.ageOrClass = 'Podaj wiek lub klasę uczniów.';
  const departureCity = textOf(data, 'departureCity');
  if (!departureCity || departureCity.length > 80) errors.departureCity = 'Podaj miejsce wyjazdu.';
  if (textOf(data, 'notes').length > 2000) errors.notes = 'Uwagi mogą mieć najwyżej 2000 znaków.';
  return errors;
}

function readInput(data: FormData, offerId: string): InquiryDraftInput {
  const students = numberOf(data, 'students');
  const guardians = numberOf(data, 'guardians');
  return {
    clientId: textOf(data, 'clientId'),
    offerId,
    dateFrom: textOf(data, 'dateFrom'),
    dateTo: textOf(data, 'dateTo'),
    students: Number.isFinite(students) ? students : 0,
    guardians: Number.isFinite(guardians) ? guardians : 0,
    ageOrClass: textOf(data, 'ageOrClass'),
    departureCity: textOf(data, 'departureCity'),
    notes: textOf(data, 'notes'),
  };
}

function offerSummary(offer: Offer): Html {
  return html`<aside class="offer-summary" aria-label="Wybrana oferta">
    <p class="eyebrow">Zapytanie do oferty</p>
    <p class="offer-summary__title">${offer.title}</p>
    <p class="offer-summary__meta">${offer.region} · ${pluralizeDays(offer.days)} · od ${offer.priceFrom ? formatMoney(offer.priceFrom) : '—'} / uczestnik · min. ${offer.minParticipants ?? '—'} uczestników</p>
    ${seasonStrip(offer.seasonMonths)}
    <a class="text-link" href="#/agent/oferty/${offer.id}">Zmień ofertę</a>
  </aside>`;
}

export function agentInquiryFormScreen(draftId: string | null): ScreenDefinition {
  const query = currentLocation().query;
  const draft: Inquiry | undefined = draftId ? findInquiry(draftId) : undefined;
  const offer = findOffer(draft?.offerId ?? query.get('oferta') ?? '');
  const clients = state.clients.filter((client) => client.agentId === state.currentAgentId);
  const selectedClientId = selectedClientIdOverride ?? draft?.clientId ?? query.get('klient') ?? '';
  selectedClientIdOverride = null;

  if (!offer || (offer.status !== 'PUBLISHED' && !draft)) {
    return {
      screenId: 'A-04',
      title: 'Nowe zapytanie',
      skeleton: 'form',
      render: () => html`${pageHeader({ title: 'Nowe zapytanie', back: { href: '#/agent/oferty', label: 'Oferty' } })}${emptyState({ title: 'Wybierz ofertę z katalogu', text: 'Zapytanie zawsze dotyczy konkretnej oferty. Otwórz kartę oferty i kliknij „Złóż zapytanie”.', action: linkButton('Przeglądaj oferty', '#/agent/oferty', 'primary') })}`,
    };
  }

  const blocked = withdrawnOfferBlocked || offer.status !== 'PUBLISHED';
  withdrawnOfferBlocked = false;
  const addClientButton = html`<button type="button" class="button button--ghost button--small" ${onClick(() =>
    openClientModal(null, (saved) => {
      selectedClientIdOverride = saved.id;
      requestRender();
    }),
  )}>+ Dodaj nowego klienta</button>`;

  return {
    screenId: 'A-04',
    title: draft ? `Szkic ${draft.number}` : 'Nowe zapytanie',
    skeleton: 'form',
    errorCopy: { title: 'Nie udało się wczytać formularza', text: 'Nie mamy danych oferty. Spróbuj ponownie.', code: `GET /offers/${offer.id} · 503` },
    render: () => html`${pageHeader({ back: { href: `#/agent/oferty/${offer.id}`, label: offer.title }, eyebrow: draft ? `Szkic ${draft.number}` : 'Nowe zapytanie', title: 'Zapytanie o wycenę', lead: 'Biuro dostanie je w kolejce i odpowie wyceną w tym wątku.' })}
      <div class="form-layout">
        <form class="form panel" data-preserve="inquiry-${draft?.id ?? offer.id}" ${onSubmit(validateInquiry, (data, form, submitter) => {
          const intent = submitter?.value ?? 'submit';
          const input = readInput(data, offer.id);
          if (intent === 'draft') {
            if (!input.clientId) {
              showFormErrors(form, { clientId: 'Wybierz klienta, żeby zapisać szkic.' });
              return;
            }
            runPending(submitter, 'Zapisywanie…', () => {
              const saved = saveInquiry(input, false, draft?.id ?? null);
              showToast('Zapisano szkic');
              navigate(`/agent/zapytania/${saved.id}/edycja`);
            });
            return;
          }
          runPending(submitter, 'Wysyłanie…', () => {
            if (findOffer(offer.id)?.status !== 'PUBLISHED') {
              saveInquiry(input, false, draft?.id ?? null);
              withdrawnOfferBlocked = true;
              requestRender();
              return;
            }
            const sent = saveInquiry(input, true, draft?.id ?? null);
            showToast(`Wysłano zapytanie ${sent.number}`);
            navigate(`/agent/zapytania/${sent.id}`);
          });
        })} ${onInput((element) => {
          if (element.form) renderWarnings(element.form, offer);
        })}>
          ${when(blocked, () => banner('alert', `Oferta ${offer.title} została wycofana z katalogu`, 'Nie można złożyć do niej zapytania. Szkic zachowano – możesz wybrać podobną ofertę.', linkButton('Przeglądaj oferty', '#/agent/oferty')))}
          <fieldset class="form-section">
            <legend class="form-section__title">Klient</legend>
            ${clients.length === 0
              ? html`<p class="muted">Nie masz jeszcze klientów.</p><input type="hidden" name="clientId" value=""><p class="field-error" data-error-for="clientId"></p>`
              : selectField({ name: 'clientId', label: 'Klient z kartoteki', required: true, value: selectedClientId, emptyLabel: 'Wybierz klienta…', choices: clients.map((client) => ({ value: client.id, label: `${clientFullName(client)} – ${[client.school, client.city].filter(Boolean).join(', ')}` })), attrs: html`data-no-restore` })}
            ${addClientButton}
          </fieldset>
          <fieldset class="form-section">
            <legend class="form-section__title">Termin</legend>
            <div class="segmented segmented--radio" role="radiogroup" aria-label="Rodzaj terminu">
              <label><input type="radio" name="dateMode" value="exact" checked ${onChange((element) => updateDateLabels(element.form))}><span>Konkretne daty</span></label>
              <label><input type="radio" name="dateMode" value="range" ${onChange((element) => updateDateLabels(element.form))}><span>Przedział (${pluralizeDays(offer.days)} w tym okresie)</span></label>
            </div>
            <div class="form-grid">
              ${field({ name: 'dateFrom', label: 'Wyjazd', type: 'date', required: true, value: draft?.dateFrom ?? '', min: addDays(state.today, 1), attrs: onChange((element) => {
                const form = element.form;
                const dateTo = form?.elements.namedItem('dateTo');
                const exact = !isRangeMode(form);
                if (exact && dateTo instanceof HTMLInputElement && element.value && (!dateTo.value || dateTo.dataset.autofilled === 'true')) {
                  dateTo.value = addDays(element.value, offer.days - 1);
                  dateTo.dataset.autofilled = 'true';
                }
                if (form) renderWarnings(form, offer);
              }) })}
              ${field({ name: 'dateTo', label: 'Powrót', type: 'date', required: true, value: draft?.dateTo ?? '', hint: `Podpowiadamy według długości oferty (${pluralizeDays(offer.days)}).`, attrs: onInput((element) => {
                element.dataset.autofilled = 'false';
              }) })}
            </div>
          </fieldset>
          <fieldset class="form-section">
            <legend class="form-section__title">Grupa</legend>
            <div class="form-grid form-grid--thirds">
              ${field({ name: 'students', label: 'Uczniowie', type: 'number', required: true, inputMode: 'numeric', min: 1, max: 200, value: draft?.students || '' })}
              ${field({ name: 'guardians', label: 'Opiekunowie', type: 'number', required: true, inputMode: 'numeric', min: 0, max: 30, value: draft?.guardians ?? 2 })}
              ${field({ name: 'ageOrClass', label: 'Wiek lub klasa', required: true, value: draft?.ageOrClass ?? '', placeholder: 'np. kl. 6b, 12–13 lat' })}
            </div>
            ${field({ name: 'departureCity', label: 'Miejsce wyjazdu', required: true, value: draft?.departureCity ?? '', placeholder: 'np. Łódź, parking przy szkole' })}
            ${textareaField({ name: 'notes', label: 'Uwagi dla biura', value: draft?.notes ?? '', rows: 3, placeholder: 'Diety, niepełnosprawności, budżet, preferowany hotel…' })}
          </fieldset>
          <div data-warnings></div>
          <div class="form-actions form-actions--sticky">
            <button type="submit" class="button button--ghost" name="intent" value="draft" data-skip-validation="true">Zapisz szkic</button>
            <button type="submit" class="button button--primary" name="intent" value="submit" ${blocked ? 'disabled' : ''}>Wyślij zapytanie</button>
          </div>
        </form>
        ${offerSummary(offer)}
      </div>`,
  };
}

function isRangeMode(form: HTMLFormElement | null): boolean {
  const modeField = form?.elements.namedItem('dateMode');
  return modeField instanceof RadioNodeList && modeField.value === 'range';
}

function updateDateLabels(form: HTMLFormElement | null): void {
  if (!form) return;
  const range = isRangeMode(form);
  const fromLabel = form.querySelector('label[for="field-dateFrom"]');
  const toLabel = form.querySelector('label[for="field-dateTo"]');
  if (fromLabel?.firstChild) fromLabel.firstChild.textContent = range ? 'Najwcześniej' : 'Wyjazd';
  if (toLabel?.firstChild) toLabel.firstChild.textContent = range ? 'Najpóźniej' : 'Powrót';
}
