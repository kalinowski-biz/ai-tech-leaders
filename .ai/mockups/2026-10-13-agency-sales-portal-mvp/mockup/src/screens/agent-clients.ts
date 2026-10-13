import { emptyState, field, linkButton, pageHeader, rowLink, statusChip, textareaField } from '../components';
import { html, onChange, onClick, onSubmit, runPending, showToast, textOf, when } from '../dom';
import { formatDateRange, formatMoney } from '../format';
import { currentLocation, navigate, withQuery } from '../navigation';
import { clientFullName, deleteClient, findClient, inquiriesOfClient, inquiryValue, saveClient, state, type ClientInput } from '../store';
import type { Client } from '../types';
import { closeModal, openModal, type ScreenDefinition } from '../ui';
import { isValidEmail, isValidPolishPhone } from '../validation';

function validateClient(data: FormData): Record<string, string> {
  const errors: Record<string, string> = {};
  const phone = textOf(data, 'phone');
  const email = textOf(data, 'email');
  if (!textOf(data, 'firstName')) errors.firstName = 'Wpisz imię.';
  if (!textOf(data, 'lastName')) errors.lastName = 'Wpisz nazwisko.';
  if (!phone && !email) {
    errors.phone = 'Podaj telefon albo e-mail, żeby był kontakt z klientem.';
    errors.email = 'Podaj telefon albo e-mail, żeby był kontakt z klientem.';
  }
  if (phone && !isValidPolishPhone(phone)) errors.phone = 'Wpisz 9 cyfr numeru, np. 601 234 567.';
  if (email && !isValidEmail(email)) errors.email = 'To nie jest poprawny adres e-mail.';
  if (textOf(data, 'school').length > 120) errors.school = 'Nazwa szkoły może mieć najwyżej 120 znaków.';
  if (textOf(data, 'note').length > 1000) errors.note = 'Notatka może mieć najwyżej 1000 znaków.';
  return errors;
}

export function openClientModal(client: Client | null, onSaved: (client: Client) => void, prefill: Partial<ClientInput> = {}): void {
  const values = { ...prefill, ...(client ?? {}) };
  openModal({
    title: client ? 'Edytuj klienta' : 'Dodaj klienta',
    variant: 'dialog',
    render: () => html`<form class="form" ${onSubmit(validateClient, (data, _form, submitter) => {
        const input: ClientInput = {
          firstName: textOf(data, 'firstName'),
          lastName: textOf(data, 'lastName'),
          phone: textOf(data, 'phone'),
          email: textOf(data, 'email').toLowerCase(),
          school: textOf(data, 'school'),
          city: textOf(data, 'city'),
          note: textOf(data, 'note'),
        };
        runPending(submitter, 'Zapisywanie…', () => {
          const saved = saveClient(input, client?.id ?? null);
          closeModal();
          showToast(client ? 'Zapisano zmiany' : `Dodano klienta ${clientFullName(saved)}`);
          onSaved(saved);
        });
      })}>
      <div class="form-grid">
        ${field({ name: 'firstName', label: 'Imię', required: true, value: values.firstName ?? '', autocomplete: 'off' })}
        ${field({ name: 'lastName', label: 'Nazwisko', required: true, value: values.lastName ?? '', autocomplete: 'off' })}
        ${field({ name: 'phone', label: 'Telefon', type: 'tel', inputMode: 'tel', value: values.phone ?? '', placeholder: '601 234 567' })}
        ${field({ name: 'email', label: 'E-mail', type: 'email', value: values.email ?? '', placeholder: 'nauczyciel@szkola.pl' })}
      </div>
      <p class="form-note">Podaj telefon albo e-mail – wystarczy jeden kanał kontaktu.</p>
      <div class="form-grid">
        ${field({ name: 'school', label: 'Szkoła', value: values.school ?? '', placeholder: 'np. SP nr 12' })}
        ${field({ name: 'city', label: 'Miejscowość', value: values.city ?? '' })}
      </div>
      ${textareaField({ name: 'note', label: 'Notatka', value: values.note ?? '', rows: 2, placeholder: 'np. woli kontakt po 15:00' })}
      <div class="form-actions">
        <button type="button" class="button button--ghost" ${onClick(() => closeModal())}>Anuluj</button>
        <button type="submit" class="button button--primary">${client ? 'Zapisz zmiany' : 'Dodaj klienta'}</button>
      </div>
    </form>`,
  });
}

function lastInquiryLabel(client: Client) {
  const inquiries = inquiriesOfClient(client.id);
  const latest = [...inquiries].sort((left, right) => right.statusChangedAt.localeCompare(left.statusChangedAt))[0];
  return latest ? html`${inquiries.length} · ${statusChip(latest)}` : html`<span class="muted">brak</span>`;
}

export function agentClientListScreen(): ScreenDefinition {
  const phrase = currentLocation().query.get('szukaj') ?? '';
  const ownClients = state.clients.filter((client) => client.agentId === state.currentAgentId);
  const matching = ownClients.filter((client) => `${client.firstName} ${client.lastName} ${client.school} ${client.city} ${client.phone} ${client.email}`.toLowerCase().includes(phrase.toLowerCase()));
  const addClient = (prefillLastName = '') =>
    html`<button class="button button--primary" ${onClick(() => openClientModal(null, (saved) => navigate(`/agent/klienci/${saved.id}`), { lastName: prefillLastName }))}>${prefillLastName ? `Dodaj klienta ${prefillLastName}` : 'Dodaj klienta'}</button>`;
  const emptyCatalog = emptyState({ title: 'Twoja kartoteka jest pusta', text: 'Dodaj klienta, żeby przy zapytaniu nie wpisywać jego danych od nowa.', action: addClient() });
  return {
    screenId: 'A-07',
    title: 'Klienci',
    skeleton: 'list',
    errorCopy: { title: 'Nie udało się wczytać klientów', text: 'Spróbuj ponownie za chwilę.', code: 'GET /clients · 503' },
    render: () => html`${pageHeader({ eyebrow: 'Kartoteka', title: 'Klienci', lead: `${ownClients.length} osób w Twojej kartotece. Widzisz tylko swoich klientów.`, actions: addClient() })}
      <div class="toolbar"><label class="filter filter--search"><span>Szukaj</span><input type="search" value="${phrase}" placeholder="nazwisko, szkoła, miejscowość" ${onChange((element) => navigate(withQuery('/agent/klienci', { szukaj: element.value })))}></label></div>
      ${ownClients.length === 0
        ? emptyCatalog
        : matching.length === 0
          ? emptyState({ title: `Nie znaleziono klienta „${phrase}”`, text: 'Sprawdź pisownię albo dodaj nowego klienta.', action: addClient(phrase) })
          : html`<div class="table-wrap"><table class="table">
              <thead><tr><th>Klient</th><th>Szkoła</th><th>Kontakt</th><th>Zapytania</th></tr></thead>
              <tbody>${matching.map((client) => html`<tr class="is-clickable" ${rowLink(`/agent/klienci/${client.id}`)}>
                <td data-label="Klient"><a href="#/agent/klienci/${client.id}"><strong>${clientFullName(client)}</strong></a></td>
                <td data-label="Szkoła">${client.school || '—'}${client.city ? `, ${client.city}` : ''}</td>
                <td data-label="Kontakt">${client.phone || ''}${client.phone && client.email ? html`<br>` : ''}${client.email || ''}</td>
                <td data-label="Zapytania">${lastInquiryLabel(client)}</td>
              </tr>`)}</tbody>
            </table></div>`}`,
    renderEmpty: () => html`${pageHeader({ eyebrow: 'Kartoteka', title: 'Klienci', actions: addClient() })}${emptyCatalog}`,
  };
}

export function agentClientDetailScreen(clientId: string): ScreenDefinition {
  const client = findClient(clientId);
  if (!client || client.agentId !== state.currentAgentId) {
    return {
      screenId: 'A-08',
      title: 'Nie znaleziono klienta',
      skeleton: 'detail',
      render: () => html`${pageHeader({ title: 'Nie znaleziono klienta', back: { href: '#/agent/klienci', label: 'Klienci' } })}${emptyState({ title: 'Ten klient nie istnieje albo nie należy do Twojej kartoteki', text: 'Wróć do listy klientów.', action: linkButton('Klienci', '#/agent/klienci') })}`,
    };
  }
  const inquiries = inquiriesOfClient(client.id);
  const newInquiryButton = linkButton('Nowe zapytanie dla klienta', withQuery('/agent/oferty', { klient: client.id }), 'primary');
  const inquiriesTable = inquiries.length === 0
    ? emptyState({ title: `${clientFullName(client)} nie ma jeszcze zapytań`, text: 'Wybierz ofertę – formularz zapytania będzie miał już wpisanego klienta.', action: newInquiryButton })
    : html`<div class="table-wrap"><table class="table">
        <thead><tr><th>Numer</th><th>Oferta</th><th>Termin</th><th>Status</th><th class="numeric">Wartość</th></tr></thead>
        <tbody>${inquiries.map((inquiry) => html`<tr class="is-clickable" ${rowLink(`/agent/zapytania/${inquiry.id}`)}>
          <td data-label="Numer" class="mono"><a href="#/agent/zapytania/${inquiry.id}">${inquiry.number}</a></td>
          <td data-label="Oferta">${inquiry.offerSnapshot.title}</td>
          <td data-label="Termin">${formatDateRange(inquiry.dateFrom, inquiry.dateTo)}</td>
          <td data-label="Status">${statusChip(inquiry)}</td>
          <td data-label="Wartość" class="numeric mono">${inquiryValue(inquiry).estimated ? '—' : formatMoney(inquiryValue(inquiry).value)}</td>
        </tr>`)}</tbody>
      </table></div>`;
  const canDelete = inquiries.length === 0;
  return {
    screenId: 'A-08',
    title: clientFullName(client),
    skeleton: 'detail',
    errorCopy: { title: 'Nie udało się wczytać klienta', text: 'Spróbuj ponownie.', code: `GET /clients/${client.id} · 500` },
    render: () => html`${pageHeader({
        back: { href: '#/agent/klienci', label: 'Klienci' },
        eyebrow: [client.school, client.city].filter(Boolean).join(', ') || 'Klient',
        title: clientFullName(client),
        actions: html`<button class="button button--secondary" ${onClick(() => openClientModal(client, () => undefined))}>Edytuj</button>${newInquiryButton}`,
      })}
      <div class="split">
        <section class="panel">
          <h2 class="panel__title">Kontakt</h2>
          <dl class="facts">
            <div><dt>Telefon</dt><dd>${client.phone ? html`<a href="tel:${client.phone.replace(/\s/g, '')}">${client.phone}</a>` : '—'}</dd></div>
            <div><dt>E-mail</dt><dd>${client.email ? html`<a href="mailto:${client.email}">${client.email}</a>` : '—'}</dd></div>
            <div><dt>Szkoła</dt><dd>${client.school || '—'}</dd></div>
            <div><dt>Miejscowość</dt><dd>${client.city || '—'}</dd></div>
          </dl>
          ${when(client.note, () => html`<p class="note-card">${client.note}</p>`)}
          <div class="danger-zone">
            <button class="button button--danger-ghost" ${canDelete ? '' : html`disabled aria-describedby="delete-hint"`} ${onClick((element) => {
              if (!window.confirm(`Usunąć klienta ${clientFullName(client)}? Tej operacji nie można cofnąć.`)) return;
              runPending(element, 'Usuwanie…', () => {
                deleteClient(client.id);
                showToast(`Usunięto klienta ${clientFullName(client)}`);
                navigate('/agent/klienci');
              });
            })}>Usuń klienta</button>
            ${when(!canDelete, () => html`<p class="field-hint" id="delete-hint">Klienta z zapytaniami nie można usunąć.</p>`)}
          </div>
        </section>
        <section class="panel">
          <h2 class="panel__title">Historia współpracy</h2>
          ${inquiriesTable}
        </section>
      </div>`,
  };
}
