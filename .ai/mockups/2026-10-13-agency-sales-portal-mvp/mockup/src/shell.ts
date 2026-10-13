import { Html, html, onChange, onClick } from './dom';
import { formatDate } from './format';
import { navigate } from './navigation';
import type { Zone } from './router';
import { agentCounters, agentFullName, currentAgent, currentOfficeUserName, officeCounters, resetState, setClock, shiftClock, state } from './store';
import type { ScreenMode } from './types';
import { requestRender, uiState } from './ui';

interface NavItem {
  key: string;
  label: string;
  href: string;
  count: number;
  icon: string;
}

const icons: Record<string, string> = {
  panel: '<path d="M3 3h7v7H3zM14 3h7v4h-7zM14 11h7v10h-7zM3 14h7v7H3z"/>',
  oferty: '<path d="M2 20 9 7l4 7 3-4 6 10z"/>',
  zapytania: '<path d="M4 4h16v12H8l-4 4z"/>',
  klienci: '<circle cx="9" cy="8" r="4"/><path d="M1 21c0-4 4-6 8-6s8 2 8 6M17 4a4 4 0 0 1 0 8M23 21c0-3-2-5-5-5.6"/>',
  prowizje: '<path d="M3 6h18v12H3z"/><circle cx="12" cy="12" r="3"/>',
  kolejka: '<path d="M4 6h16M4 12h16M4 18h10"/>',
  'do-rozliczenia': '<path d="M9 11l3 3 8-8M20 12v8H4V4h11"/>',
  agenci: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/>',
  raport: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
};

function icon(key: string): Html {
  return new Html(`<svg class="nav-icon" viewBox="0 0 24 24" aria-hidden="true">${icons[key] ?? ''}</svg>`);
}

function navList(items: NavItem[], activeKey: string, variant: 'rail' | 'tabs'): Html {
  return html`<ul class="nav nav--${variant}">
    ${items.map((item) => html`<li><a class="nav__link ${item.key === activeKey ? 'is-active' : ''}" href="${item.href}" ${item.key === activeKey ? html`aria-current="page"` : ''}>
      ${icon(item.icon)}<span class="nav__label">${item.label}</span>${item.count > 0 ? html`<span class="nav__count" aria-label="${item.count} do obsłużenia">${item.count}</span>` : ''}
    </a></li>`)}
  </ul>`;
}

function agentNav(): NavItem[] {
  const counters = agentCounters(state.currentAgentId);
  return [
    { key: 'panel', label: 'Panel', href: '#/agent/panel', count: counters.actionItems, icon: 'panel' },
    { key: 'oferty', label: 'Oferty', href: '#/agent/oferty', count: 0, icon: 'oferty' },
    { key: 'zapytania', label: 'Zapytania', href: '#/agent/zapytania', count: counters.unreadInquiries, icon: 'zapytania' },
    { key: 'klienci', label: 'Klienci', href: '#/agent/klienci', count: 0, icon: 'klienci' },
    { key: 'prowizje', label: 'Prowizje', href: '#/agent/prowizje', count: 0, icon: 'prowizje' },
  ];
}

function officeNav(): NavItem[] {
  const counters = officeCounters();
  return [
    { key: 'kolejka', label: 'Kolejka', href: '#/biuro/kolejka', count: counters.queue, icon: 'kolejka' },
    { key: 'do-rozliczenia', label: 'Do rozliczenia', href: '#/biuro/do-rozliczenia', count: counters.settlement, icon: 'do-rozliczenia' },
    { key: 'oferty', label: 'Oferty', href: '#/biuro/oferty', count: 0, icon: 'oferty' },
    { key: 'agenci', label: 'Agenci', href: '#/biuro/agenci', count: 0, icon: 'agenci' },
    { key: 'prowizje', label: 'Prowizje', href: '#/biuro/prowizje', count: counters.commissionsDue, icon: 'prowizje' },
    { key: 'raport', label: 'Raport agentów', href: '#/biuro/raport', count: 0, icon: 'raport' },
  ];
}

const screenModes: Array<{ mode: ScreenMode; label: string }> = [
  { mode: 'data', label: 'Dane' },
  { mode: 'loading', label: 'Ładowanie' },
  { mode: 'empty', label: 'Pusto' },
  { mode: 'error', label: 'Błąd' },
];

export function prototypeBar(zone: Zone, screenId: string): Html {
  const roleLink = (label: string, href: string, active: boolean) => html`<a class="proto-bar__role ${active ? 'is-on' : ''}" href="${href}">${label}</a>`;
  return html`<div class="proto-bar" role="region" aria-label="Sterowanie prototypem">
    <a class="proto-bar__badge" href="#/" title="Mapa prototypu">Prototyp</a>
    <span class="proto-bar__screen mono" title="Identyfikator ekranu ze specyfikacji">${screenId}</span>
    <span class="proto-bar__group" aria-label="Rola">
      ${roleLink('Agent', '#/agent/panel', zone === 'agent')}
      ${roleLink('Biuro', '#/biuro/kolejka', zone === 'office')}
      ${roleLink('Konto', '#/logowanie', zone === 'auth')}
    </span>
    <span class="proto-bar__group" role="radiogroup" aria-label="Stan ekranu">
      ${screenModes.map((option) => html`<button class="proto-bar__mode ${uiState.screenMode === option.mode ? 'is-on' : ''}" role="radio" aria-checked="${uiState.screenMode === option.mode}" ${onClick(() => {
        uiState.screenMode = option.mode;
        requestRender();
      })}>${option.label}</button>`)}
    </span>
    <span class="proto-bar__group" aria-label="Data systemowa">
      <label class="proto-bar__date"><span class="visually-hidden">Dzisiaj</span><input type="date" value="${state.today}" ${onChange((element) => {
        if (element.value) setClock(element.value);
      })}></label>
      <button class="proto-bar__mode" title="Przesuń datę o 3 dni" ${onClick(() => shiftClock(3))}>+3 d</button>
      <button class="proto-bar__mode" title="Przesuń datę o 15 dni" ${onClick(() => shiftClock(15))}>+15 d</button>
    </span>
    <button class="proto-bar__mode proto-bar__reset" ${onClick(() => {
      if (!window.confirm('Przywrócić dane startowe prototypu? Zmiany zostaną utracone.')) return;
      resetState();
      navigate('/');
    })}>Reset</button>
  </div>`;
}

export function agentShell(activeKey: string, content: Html): Html {
  const agent = currentAgent();
  return html`<div class="app app--agent">
    <nav class="rail" aria-label="Menu agenta">
      <a class="brand" href="#/agent/panel"><span class="brand__mark" aria-hidden="true"></span>Portal agentów</a>
      ${navList(agentNav(), activeKey, 'rail')}
      <div class="rail__user"><strong>${agentFullName(agent)}</strong><span>${agent.companyName}</span><a href="#/logowanie">Wyloguj</a></div>
    </nav>
    <main class="main" id="main" tabindex="-1">${content}</main>
    <nav class="tabbar" aria-label="Menu agenta (telefon)">${navList(agentNav(), activeKey, 'tabs')}</nav>
  </div>`;
}

export function officeShell(activeKey: string, content: Html): Html {
  return html`<div class="app app--office">
    <nav class="rail" aria-label="Menu biura">
      <a class="brand" href="#/biuro/kolejka"><span class="brand__mark" aria-hidden="true"></span>Portal · Biuro</a>
      ${navList(officeNav(), activeKey, 'rail')}
      <div class="rail__user"><strong>${currentOfficeUserName()}</strong><span>Pracownik biura · ${formatDate(state.today)}</span><a href="#/logowanie">Wyloguj</a></div>
    </nav>
    <main class="main main--dense" id="main" tabindex="-1">${content}</main>
  </div>`;
}

export function bareShell(zone: Zone, content: Html): Html {
  return html`<main class="bare bare--${zone}" id="main" tabindex="-1">${content}</main>`;
}
