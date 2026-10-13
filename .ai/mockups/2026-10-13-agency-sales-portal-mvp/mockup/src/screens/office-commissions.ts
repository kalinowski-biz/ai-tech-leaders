import { commissionChip, emptyState, field, linkButton, pageHeader, textareaField } from '../components';
import { html, onChange, onClick, onSubmit, runPending, showToast, textOf } from '../dom';
import { commissionStatusLabels, formatDate, formatMoney, formatRate } from '../format';
import { currentLocation, navigate, withQuery } from '../navigation';
import { agentFullName, clientFullName, findAgent, findClient, findInquiry, markCommissionsPaid, revertCommissionPayment, state } from '../store';
import type { CommissionStatus, Inquiry } from '../types';
import { closeModal, openModal, requestRender, type ScreenDefinition } from '../ui';
import { commissionTotals } from './agent-dashboard';

const selectedInquiryIds = new Set<string>();
const commissionStatuses: CommissionStatus[] = ['DUE', 'FORECAST', 'PAID', 'CANCELLED'];

function completionDate(inquiry: Inquiry): string {
  return inquiry.completion ? inquiry.statusChangedAt.slice(0, 10) : '';
}

function openMarkPaidModal(): void {
  const items = [...selectedInquiryIds].map(findInquiry).filter((inquiry): inquiry is Inquiry => Boolean(inquiry?.commission));
  const total = items.reduce((sum, inquiry) => sum + (inquiry.commission?.amount ?? 0), 0);
  const latestCompletion = items.map(completionDate).sort().at(-1) ?? '';
  openModal({
    title: 'Oznacz jako wypłacone',
    variant: 'dialog',
    render: () => html`<form class="form" ${onSubmit(
        (data) => {
          const paidOn = textOf(data, 'paidOn');
          if (!paidOn) return { paidOn: 'Podaj datę wypłaty.' };
          if (paidOn > state.today) return { paidOn: 'Data wypłaty nie może być w przyszłości.' };
          if (latestCompletion && paidOn < latestCompletion) return { paidOn: `Data wypłaty nie może być wcześniejsza niż realizacja (${formatDate(latestCompletion)}).` };
          return {};
        },
        (data, _form, submitter) =>
          runPending(submitter, 'Zapisywanie…', () => {
            closeModal();
            markCommissionsPaid(items.map((inquiry) => inquiry.id), textOf(data, 'paidOn'));
            selectedInquiryIds.clear();
            showToast(`Oznaczono ${items.length} ${items.length === 1 ? 'prowizję' : 'prowizje'} jako wypłacone`);
          }),
      )}>
      <ul class="summary-list">${items.map((inquiry) => html`<li><span class="mono">${inquiry.number}</span><span>${agentFullName(findAgent(inquiry.agentId))}</span><span class="mono">${formatMoney(inquiry.commission?.amount ?? 0)}</span></li>`)}</ul>
      <p class="summary-total">Razem: <strong>${formatMoney(total)}</strong></p>
      ${field({ name: 'paidOn', label: 'Data wypłaty', type: 'date', required: true, value: state.today, max: state.today })}
      <div class="form-actions">
        <button type="button" class="button button--ghost" ${onClick(() => closeModal())}>Anuluj</button>
        <button type="submit" class="button button--primary">Oznacz jako wypłacone</button>
      </div>
    </form>`,
  });
}

function openRevertModal(inquiry: Inquiry): void {
  openModal({
    title: 'Cofnij wypłatę',
    variant: 'dialog',
    render: () => html`<form class="form" ${onSubmit(
        (data) => {
          const reason = textOf(data, 'reason');
          return reason.length >= 5 && reason.length <= 500 ? {} : { reason: 'Podaj powód cofnięcia wypłaty.' };
        },
        (data, _form, submitter) =>
          runPending(submitter, 'Zapisywanie…', () => {
            closeModal();
            revertCommissionPayment(inquiry.id, textOf(data, 'reason'));
            showToast('Cofnięto wypłatę');
          }),
      )}>
      <p><span class="mono">${inquiry.number}</span> · ${formatMoney(inquiry.commission?.amount ?? 0)} · wypłacona ${inquiry.commission?.paidOn ? formatDate(inquiry.commission.paidOn) : ''}</p>
      ${textareaField({ name: 'reason', label: 'Powód', required: true, rows: 2, placeholder: 'np. pomyłka – przelew nie wyszedł', hint: 'Prowizja wróci do statusu należna. Wpis trafi do historii.' })}
      <div class="form-actions">
        <button type="button" class="button button--ghost" ${onClick(() => closeModal())}>Anuluj</button>
        <button type="submit" class="button button--danger">Cofnij wypłatę</button>
      </div>
    </form>`,
  });
}

export function officeCommissionsScreen(): ScreenDefinition {
  const query = currentLocation().query;
  const statusFilter = query.get('status') ?? 'DUE';
  const agentFilter = query.get('agent') ?? '';
  const apply = (patch: { status?: string; agent?: string }) => {
    selectedInquiryIds.clear();
    navigate(withQuery('/biuro/prowizje', { status: statusFilter, agent: agentFilter, ...patch }));
  };
  const withCommission = state.inquiries.filter((inquiry) => inquiry.commission && (!agentFilter || inquiry.agentId === agentFilter));
  const rows = withCommission.filter((inquiry) => !statusFilter || inquiry.commission?.status === statusFilter);
  const totals = commissionTotals(withCommission);
  [...selectedInquiryIds].forEach((inquiryId) => {
    if (!rows.some((inquiry) => inquiry.id === inquiryId && inquiry.commission?.status === 'DUE')) selectedInquiryIds.delete(inquiryId);
  });
  const selectedTotal = rows.filter((inquiry) => selectedInquiryIds.has(inquiry.id)).reduce((sum, inquiry) => sum + (inquiry.commission?.amount ?? 0), 0);
  const selectable = rows.filter((inquiry) => inquiry.commission?.status === 'DUE');
  const toggle = (inquiryId: string, checked: boolean) => {
    if (checked) selectedInquiryIds.add(inquiryId);
    else selectedInquiryIds.delete(inquiryId);
    requestRender();
  };
  return {
    screenId: 'B-10',
    title: 'Prowizje',
    skeleton: 'list',
    errorCopy: { title: 'Nie udało się wczytać prowizji', text: 'Spróbuj ponownie.', code: 'GET /commissions · 503' },
    render: () => html`${pageHeader({ eyebrow: 'Rozliczenia', title: 'Prowizje', lead: 'Agent wystawia fakturę poza portalem. Tu oznaczasz, że prowizja została wypłacona.' })}
      <dl class="ledger ledger--filters">
        ${commissionStatuses.map((status) => html`<div class="${statusFilter === status ? 'is-on' : ''}"><dt><button class="ledger__filter" aria-pressed="${statusFilter === status}" ${onClick(() => apply({ status }))}>${commissionStatusLabels[status]}</button></dt><dd>${formatMoney(totals[status])}</dd></div>`)}
      </dl>
      <form class="filter-bar" onsubmit="return false">
        <label class="filter"><span>Agent</span><select ${onChange((element) => apply({ agent: element.value }))}><option value="">Wszyscy</option>${state.agents.map((agent) => html`<option value="${agent.id}" ${agent.id === agentFilter ? 'selected' : ''}>${agentFullName(agent)}</option>`)}</select></label>
      </form>
      ${rows.length === 0
        ? emptyState(statusFilter === 'DUE' && !agentFilter ? { title: 'Brak należnych prowizji do wypłaty', text: 'Prowizja staje się należna po oznaczeniu realizacji wyjazdu.' } : { title: 'Brak prowizji dla wybranych filtrów', text: 'Zmień status albo agenta.', action: linkButton('Wyczyść filtry', '#/biuro/prowizje') })
        : html`<div class="table-wrap"><table class="table">
            <thead><tr>
              <th><input type="checkbox" aria-label="Zaznacz wszystkie należne" ${selectable.length > 0 && selectable.every((inquiry) => selectedInquiryIds.has(inquiry.id)) ? 'checked' : ''} ${selectable.length === 0 ? 'disabled' : ''} ${onChange((element) => {
                const checked = element instanceof HTMLInputElement && element.checked;
                selectable.forEach((inquiry) => (checked ? selectedInquiryIds.add(inquiry.id) : selectedInquiryIds.delete(inquiry.id)));
                requestRender();
              })}></th>
              <th>Zapytanie</th><th>Agent</th><th>Klient</th><th class="numeric">Wartość</th><th class="numeric">Stawka</th><th class="numeric">Kwota</th><th>Status</th><th>Realizacja</th><th>Wypłata</th><th><span class="visually-hidden">Akcje</span></th>
            </tr></thead>
            <tbody>${rows.map((inquiry) => {
              const commission = inquiry.commission;
              if (!commission) return '';
              const due = commission.status === 'DUE';
              return html`<tr class="${selectedInquiryIds.has(inquiry.id) ? 'is-selected' : ''}">
                <td><input type="checkbox" aria-label="Zaznacz ${inquiry.number}" ${due ? '' : 'disabled'} ${selectedInquiryIds.has(inquiry.id) ? 'checked' : ''} ${onChange((element) => toggle(inquiry.id, element instanceof HTMLInputElement && element.checked))}></td>
                <td data-label="Zapytanie" class="mono"><a href="#/biuro/zapytania/${inquiry.id}">${inquiry.number}</a></td>
                <td data-label="Agent">${agentFullName(findAgent(inquiry.agentId))}</td>
                <td data-label="Klient">${clientFullName(findClient(inquiry.clientId))}</td>
                <td data-label="Wartość" class="numeric mono">${formatMoney(commission.baseValue)}</td>
                <td data-label="Stawka" class="numeric mono">${formatRate(commission.rate)}</td>
                <td data-label="Kwota" class="numeric mono"><strong>${formatMoney(commission.amount)}</strong></td>
                <td data-label="Status">${commissionChip(commission.status)}</td>
                <td data-label="Realizacja">${completionDate(inquiry) ? formatDate(completionDate(inquiry)) : '—'}</td>
                <td data-label="Wypłata">${commission.paidOn ? formatDate(commission.paidOn) : '—'}</td>
                <td class="row-actions">${commission.status === 'PAID' ? html`<button class="button button--ghost button--small" ${onClick(() => openRevertModal(inquiry))}>Cofnij wypłatę</button>` : ''}</td>
              </tr>`;
            })}</tbody>
          </table></div>`}
      ${selectedInquiryIds.size > 0
        ? html`<div class="bulk-bar" role="region" aria-label="Zaznaczone prowizje">
            <span>Zaznaczono ${selectedInquiryIds.size} ${selectedInquiryIds.size === 1 ? 'pozycję' : 'pozycje'}: <strong>${formatMoney(selectedTotal)}</strong></span>
            <button class="button button--primary" ${onClick(() => openMarkPaidModal())}>Oznacz jako wypłacone</button>
          </div>`
        : ''}`,
  };
}
