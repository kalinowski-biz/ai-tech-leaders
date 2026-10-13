import { banner, emptyState, field, linkButton, pageHeader, plainChip, rowLink, selectField } from '../components';
import { html, numberOf, onChange, onClick, onSubmit, runPending, showFormErrors, showToast, textOf, when } from '../dom';
import { agentStatusLabels, formatMoney, formatRate } from '../format';
import { currentLocation, navigate, withQuery } from '../navigation';
import { agentFullName, deactivateAgent, findAgentConflict, inquiriesOfAgent, isTerminal, resendInvitation, saveAgent, state, type AgentInput } from '../store';
import type { Agent, AgentStatus } from '../types';
import type { ScreenDefinition } from '../ui';
import { isRateInRange, isValidEmail, isValidNip, isValidPolishPhone } from '../validation';

const agentRegions = ['Dolnośląskie', 'Kujawsko-pomorskie', 'Lubelskie', 'Lubuskie', 'Łódzkie', 'Małopolskie', 'Mazowieckie', 'Opolskie', 'Podkarpackie', 'Podlaskie', 'Pomorskie', 'Śląskie', 'Świętokrzyskie', 'Warmińsko-mazurskie', 'Wielkopolskie', 'Zachodniopomorskie'];
const agentStatuses: AgentStatus[] = ['ACTIVE', 'INVITED', 'DEACTIVATED'];
const statusTone: Record<AgentStatus, string> = { INVITED: 'marker', ACTIVE: 'pine', DEACTIVATED: 'closed' };

let lastInvitation: { agentId: string; token: string } | null = null;

function openInquiries(agent: Agent): number {
  return inquiriesOfAgent(agent.id).filter((inquiry) => inquiry.status !== 'DRAFT' && !isTerminal(inquiry)).length;
}

function resendButton(agent: Agent, small = true) {
  return html`<button class="button button--ghost ${small ? 'button--small' : ''}" ${onClick((element) =>
    runPending(element, 'Wysyłanie…', () => {
      resendInvitation(agent);
      lastInvitation = { agentId: agent.id, token: agent.invitationToken ?? '' };
      showToast(`Wysłano zaproszenie ponownie do ${agent.email}. Poprzedni link przestał działać.`);
    }),
  )}>Wyślij zaproszenie ponownie</button>`;
}

export function officeAgentListScreen(): ScreenDefinition {
  const query = currentLocation().query;
  const statusFilter = query.get('status') ?? '';
  const phrase = query.get('szukaj') ?? '';
  const rows = state.agents.filter(
    (agent) => (!statusFilter || agent.status === statusFilter) && `${agent.companyName} ${agent.firstName} ${agent.lastName} ${agent.nip} ${agent.email}`.toLowerCase().includes(phrase.toLowerCase()),
  );
  const addAgent = linkButton('Dodaj agenta', '#/biuro/agenci/nowy', 'primary');
  const noAgents = emptyState({ title: 'Nie ma jeszcze agentów', text: 'Dodaj pierwszego – dostanie e-mail z linkiem aktywacyjnym.', action: addAgent });
  return {
    screenId: 'B-08',
    title: 'Agenci',
    skeleton: 'list',
    errorCopy: { title: 'Nie udało się wczytać agentów', text: 'Spróbuj ponownie.', code: 'GET /agents · 503' },
    render: () => html`${pageHeader({ eyebrow: 'Administracja', title: 'Agenci', lead: 'Jeden login to jeden podmiot rozliczeniowy.', actions: addAgent })}
      <form class="filter-bar" onsubmit="return false">
        <label class="filter"><span>Status</span><select ${onChange((element) => navigate(withQuery('/biuro/agenci', { status: element.value, szukaj: phrase })))}><option value="">Wszystkie</option>${agentStatuses.map((status) => html`<option value="${status}" ${status === statusFilter ? 'selected' : ''}>${agentStatusLabels[status]}</option>`)}</select></label>
        <label class="filter filter--search"><span>Szukaj</span><input type="search" value="${phrase}" placeholder="firma, osoba, NIP, e-mail" ${onChange((element) => navigate(withQuery('/biuro/agenci', { status: statusFilter, szukaj: element.value })))}></label>
      </form>
      ${state.agents.length === 0
        ? noAgents
        : rows.length === 0
          ? emptyState({ title: statusFilter ? `Brak agentów w statusie ${agentStatusLabels[agentStatuses.find((status) => status === statusFilter) ?? 'ACTIVE']}` : `Brak agentów „${phrase}”`, text: 'Zmień filtr albo wyszukiwanie.', action: linkButton('Wyczyść filtry', '#/biuro/agenci') })
          : html`<div class="table-wrap"><table class="table">
              <thead><tr><th>Firma</th><th>Osoba</th><th>Region</th><th>Kontakt</th><th class="numeric">Stawka</th><th>Status</th><th class="numeric">Otwarte zapyt.</th><th><span class="visually-hidden">Akcje</span></th></tr></thead>
              <tbody>${rows.map((agent) => html`<tr class="is-clickable" ${rowLink(`/biuro/agenci/${agent.id}`)}>
                <td data-label="Firma"><a href="#/biuro/agenci/${agent.id}"><strong>${agent.companyName}</strong></a><br><span class="muted small mono">NIP ${agent.nip}</span></td>
                <td data-label="Osoba">${agentFullName(agent)}</td>
                <td data-label="Region">${agent.region}</td>
                <td data-label="Kontakt">${agent.email}<br><span class="muted small">${agent.phone}</span></td>
                <td data-label="Stawka" class="numeric mono">${formatRate(agent.commissionRate)}</td>
                <td data-label="Status">${plainChip(agentStatusLabels[agent.status], statusTone[agent.status])}</td>
                <td data-label="Otwarte zapytania" class="numeric">${openInquiries(agent)}</td>
                <td class="row-actions">${when(agent.status === 'INVITED', () => resendButton(agent))}</td>
              </tr>`)}</tbody>
            </table></div>`}`,
    renderEmpty: () => html`${pageHeader({ eyebrow: 'Administracja', title: 'Agenci', actions: addAgent })}${noAgents}`,
  };
}

function validateAgent(data: FormData): Record<string, string> {
  const errors: Record<string, string> = {};
  const companyName = textOf(data, 'companyName');
  if (!companyName || companyName.length > 120) errors.companyName = 'Wpisz nazwę firmy.';
  if (!isValidNip(textOf(data, 'nip'))) errors.nip = textOf(data, 'nip') ? 'NIP ma błędną sumę kontrolną albo nie ma 10 cyfr.' : 'Wpisz NIP.';
  if (!textOf(data, 'firstName')) errors.firstName = 'Wpisz imię.';
  if (!textOf(data, 'lastName')) errors.lastName = 'Wpisz nazwisko.';
  if (!isValidEmail(textOf(data, 'email'))) errors.email = textOf(data, 'email') ? 'To nie jest poprawny adres e-mail.' : 'Wpisz adres e-mail.';
  if (!isValidPolishPhone(textOf(data, 'phone'))) errors.phone = 'Wpisz 9 cyfr numeru.';
  if (!textOf(data, 'region')) errors.region = 'Wybierz region działania.';
  if (!isRateInRange(numberOf(data, 'commissionRate'))) errors.commissionRate = 'Stawka musi być od 0 do 30%.';
  return errors;
}

export function officeAgentFormScreen(agentId: string | null): ScreenDefinition {
  const agent = agentId ? state.agents.find((candidate) => candidate.id === agentId) : undefined;
  if (agentId && !agent) return { screenId: 'B-09', title: 'Nie znaleziono agenta', skeleton: 'form', render: () => html`${pageHeader({ title: 'Nie znaleziono agenta', back: { href: '#/biuro/agenci', label: 'Agenci' } })}` };
  const invitation = lastInvitation && agent && lastInvitation.agentId === agent.id ? lastInvitation : null;
  const agentInquiries = agent ? inquiriesOfAgent(agent.id).filter((inquiry) => inquiry.status !== 'DRAFT') : [];
  const dueCommissions = agentInquiries.filter((inquiry) => inquiry.commission?.status === 'DUE');
  const bookings = agentInquiries.filter((inquiry) => inquiry.status === 'BOOKING_CONFIRMED' || inquiry.status === 'COMPLETED');
  return {
    screenId: 'B-09',
    title: agent ? agent.companyName : 'Nowy agent',
    skeleton: 'form',
    errorCopy: { title: 'Nie udało się wczytać agenta', text: 'Spróbuj ponownie.', code: `GET /agents/${agentId ?? ''} · 500` },
    render: () => html`${pageHeader({
        back: { href: '#/biuro/agenci', label: 'Agenci' },
        eyebrow: agent ? `Agent · ${agentStatusLabels[agent.status]}` : 'Nowy agent',
        title: agent ? agent.companyName : 'Dodaj agenta',
        lead: agent ? undefined : 'Agent dostanie e-mail z linkiem do ustawienia hasła.',
      })}
      ${when(invitation, () =>
        banner('info', 'Symulacja e-maila z zaproszeniem', html`W prawdziwym portalu agent dostanie ten link e-mailem. <a href="#/aktywacja/${invitation?.token ?? ''}">Otwórz link aktywacyjny</a>`),
      )}
      ${when(agent?.status === 'DEACTIVATED', () => banner('warning', 'Konto dezaktywowane', 'Agent nie może się logować. Należne prowizje są nadal rozliczane.'))}
      ${when(agent, () => html`<dl class="figures figures--compact">
        <div><dt>Zapytania</dt><dd><a href="${withQuery('/biuro/kolejka', { widok: 'wszystkie', agent: agent?.id })}">${agentInquiries.length}</a></dd></div>
        <div><dt>Rezerwacje</dt><dd>${bookings.length}</dd></div>
        <div><dt>Prowizje należne</dt><dd><a href="${withQuery('/biuro/prowizje', { agent: agent?.id })}">${formatMoney(dueCommissions.reduce((sum, inquiry) => sum + (inquiry.commission?.amount ?? 0), 0))}</a></dd></div>
      </dl>`)}
      <form class="form panel form--narrow" data-preserve="agent-${agent?.id ?? 'new'}" ${onSubmit(validateAgent, (data, form, submitter) => {
        const input: AgentInput = {
          companyName: textOf(data, 'companyName'),
          nip: textOf(data, 'nip').replace(/[\s-]/g, ''),
          firstName: textOf(data, 'firstName'),
          lastName: textOf(data, 'lastName'),
          email: textOf(data, 'email').toLowerCase(),
          phone: textOf(data, 'phone'),
          region: textOf(data, 'region'),
          commissionRate: numberOf(data, 'commissionRate'),
        };
        runPending(submitter, agent ? 'Zapisywanie…' : 'Wysyłanie…', () => {
          const conflict = findAgentConflict(input, agent?.id ?? null);
          if (conflict) {
            const owner = state.agents.find((candidate) => (conflict === 'email' ? candidate.email.toLowerCase() === input.email : candidate.nip === input.nip));
            showFormErrors(form, conflict === 'email' ? { email: `Ten e-mail jest już przypisany do agenta ${owner?.companyName ?? ''}.` } : { nip: 'Agent z tym NIP-em już istnieje.' });
            return;
          }
          const saved = saveAgent(input, agent?.id ?? null);
          if (agent) {
            showToast('Zapisano zmiany');
            return;
          }
          lastInvitation = { agentId: saved.id, token: saved.invitationToken ?? '' };
          showToast(`Dodano agenta. Wysłano zaproszenie na ${saved.email}.`);
          navigate(`/biuro/agenci/${saved.id}`);
        });
      })} ${onChange((element) => {
        if (!agent || element.name !== 'commissionRate') return;
        const note = element.form?.querySelector<HTMLElement>('[data-rate-note]');
        const nextRate = Number(element.value);
        if (note) note.textContent = nextRate !== agent.commissionRate && Number.isFinite(nextRate) ? `Nowa stawka ${formatRate(nextRate)} obejmie zapytania zaakceptowane od teraz. Zaakceptowane wcześniej zachowują ${formatRate(agent.commissionRate)}.` : '';
      })}>
        ${field({ name: 'companyName', label: 'Nazwa firmy', required: true, value: agent?.companyName ?? '' })}
        <div class="form-grid">
          ${field({ name: 'nip', label: 'NIP', required: true, value: agent?.nip ?? '', inputMode: 'numeric', placeholder: '10 cyfr' })}
          ${selectField({ name: 'region', label: 'Region działania', required: true, value: agent?.region ?? '', emptyLabel: 'Wybierz…', choices: agentRegions.map((region) => ({ value: region, label: region })) })}
          ${field({ name: 'firstName', label: 'Imię', required: true, value: agent?.firstName ?? '' })}
          ${field({ name: 'lastName', label: 'Nazwisko', required: true, value: agent?.lastName ?? '' })}
          ${field({ name: 'email', label: 'E-mail (login)', type: 'email', required: true, value: agent?.email ?? '' })}
          ${field({ name: 'phone', label: 'Telefon', type: 'tel', required: true, value: agent?.phone ?? '', placeholder: '601 234 567' })}
        </div>
        ${field({ name: 'commissionRate', label: 'Domyślna stawka prowizji (%)', type: 'number', required: true, min: 0, max: 30, step: '0.5', value: agent?.commissionRate ?? 5, className: 'field--short' })}
        <p class="field-warning" data-rate-note aria-live="polite"></p>
        <div class="form-actions">
          ${agent && agent.status === 'INVITED' ? resendButton(agent, false) : ''}
          <button type="submit" class="button button--primary">${agent ? 'Zapisz zmiany' : 'Dodaj agenta i wyślij zaproszenie'}</button>
        </div>
      </form>
      ${agent && agent.status !== 'DEACTIVATED' ? html`<section class="panel danger-zone form--narrow">
        <h2 class="panel__title">Dezaktywacja</h2>
        <p class="muted small">Agent nie zaloguje się. Otwarte zapytania (${openInquiries(agent)}) zostają w kolejce, należne prowizje (${dueCommissions.length}) będą rozliczane.</p>
        <button class="button button--danger-ghost" ${onClick((element) => {
          if (!window.confirm(`Dezaktywować konto ${agent.companyName}?`)) return;
          runPending(element, 'Dezaktywowanie…', () => {
            deactivateAgent(agent);
            showToast('Dezaktywowano konto');
          });
        })}>Dezaktywuj konto</button>
      </section>` : ''}`,
  };
}
