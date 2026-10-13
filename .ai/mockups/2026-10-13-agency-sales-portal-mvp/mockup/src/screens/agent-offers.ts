import { banner, emptyState, linkButton, offerPhoto, pageHeader, seasonStrip } from '../components';
import { Html, html, onChange, onClick, showToast, when } from '../dom';
import { formatMoney, formatRate, formatWholeMoney, pluralizeDays } from '../format';
import { currentLocation, navigate, withQuery } from '../navigation';
import { currentAgent, findOffer, state } from '../store';
import { educationStages, regions } from '../seed';
import type { Offer } from '../types';
import type { ScreenDefinition } from '../ui';

interface OfferFilters {
  region: string;
  daysMin: string;
  daysMax: string;
  stage: string;
  phrase: string;
  clientId: string;
}

function readFilters(): OfferFilters {
  const query = currentLocation().query;
  return {
    region: query.get('region') ?? '',
    daysMin: query.get('dniOd') ?? '',
    daysMax: query.get('dniDo') ?? '',
    stage: query.get('etap') ?? '',
    phrase: query.get('szukaj') ?? '',
    clientId: query.get('klient') ?? '',
  };
}

function applyFilters(filters: OfferFilters): void {
  navigate(withQuery('/agent/oferty', { region: filters.region, dniOd: filters.daysMin, dniDo: filters.daysMax, etap: filters.stage, szukaj: filters.phrase, klient: filters.clientId }));
}

function matchingOffers(filters: OfferFilters): Offer[] {
  return state.offers.filter((offer) => {
    if (offer.status !== 'PUBLISHED') return false;
    if (filters.region && offer.region !== filters.region) return false;
    if (filters.daysMin && offer.days < Number(filters.daysMin)) return false;
    if (filters.daysMax && offer.days > Number(filters.daysMax)) return false;
    if (filters.stage && !offer.stages.includes(filters.stage)) return false;
    if (filters.phrase && !`${offer.title} ${offer.summary}`.toLowerCase().includes(filters.phrase.toLowerCase())) return false;
    return true;
  });
}

function filterBar(filters: OfferFilters): Html {
  const update = (key: keyof OfferFilters) => onChange((element) => applyFilters({ ...filters, [key]: element.value }));
  const dayChoices = [1, 2, 3, 4, 5, 6, 7];
  return html`<form class="filter-bar" role="search" aria-label="Filtry ofert" onsubmit="return false">
    <label class="filter"><span>Region lub kierunek</span>
      <select ${update('region')}><option value="">Wszystkie</option>${regions.map((region) => html`<option ${region === filters.region ? 'selected' : ''}>${region}</option>`)}</select>
    </label>
    <fieldset class="filter filter--range"><legend>Liczba dni</legend>
      <select aria-label="od" ${update('daysMin')}><option value="">od</option>${dayChoices.map((day) => html`<option value="${day}" ${String(day) === filters.daysMin ? 'selected' : ''}>${day}</option>`)}</select>
      <span aria-hidden="true">–</span>
      <select aria-label="do" ${update('daysMax')}><option value="">do</option>${dayChoices.map((day) => html`<option value="${day}" ${String(day) === filters.daysMax ? 'selected' : ''}>${day}</option>`)}</select>
    </fieldset>
    <fieldset class="filter filter--stages"><legend>Etap edukacji</legend>
      <div class="segmented">
        <button type="button" class="${filters.stage === '' ? 'is-on' : ''}" aria-pressed="${filters.stage === ''}" ${onClick(() => applyFilters({ ...filters, stage: '' }))}>Każdy</button>
        ${educationStages.map((stage) => html`<button type="button" class="${filters.stage === stage ? 'is-on' : ''}" aria-pressed="${filters.stage === stage}" ${onClick(() => applyFilters({ ...filters, stage }))}>${stage}</button>`)}
      </div>
    </fieldset>
    <label class="filter filter--search"><span>Szukaj</span><input type="search" value="${filters.phrase}" placeholder="np. Wieliczka" ${update('phrase')}></label>
  </form>`;
}

function offerCard(offer: Offer, clientId: string): Html {
  return html`<li>
    <a class="offer-card" href="${withQuery(`/agent/oferty/${offer.id}`, { klient: clientId })}">
      ${offerPhoto(offer.photoHues, offer.title)}
      <span class="offer-card__region">${offer.region}</span>
      <span class="offer-card__title">${offer.title}</span>
      <span class="offer-card__meta">${pluralizeDays(offer.days)} · ${offer.stages.join(', ')}</span>
      <span class="offer-card__price">od <strong>${offer.priceFrom ? formatWholeMoney(offer.priceFrom) : '—'}</strong> / uczestnik</span>
    </a>
  </li>`;
}

export function agentOfferSearchScreen(): ScreenDefinition {
  const filters = readFilters();
  const offers = matchingOffers(filters);
  const hasFilters = Boolean(filters.region || filters.daysMin || filters.daysMax || filters.stage || filters.phrase);
  const clearFilters = linkButton('Wyczyść filtry', withQuery('/agent/oferty', { klient: filters.clientId }));
  return {
    screenId: 'A-02',
    title: 'Oferty',
    skeleton: 'cards',
    errorCopy: { title: 'Nie udało się wczytać ofert', text: 'Katalog jest chwilowo niedostępny. Spróbuj ponownie za moment.', code: 'GET /offers · 503' },
    render: () => html`${pageHeader({ eyebrow: 'Katalog biura', title: 'Oferty', lead: `${offers.length} ${offers.length === 1 ? 'oferta pasuje' : 'ofert pasuje'} do filtrów.` })}
      ${when(filters.clientId, () => banner('info', 'Szukasz oferty dla klienta', 'Po wybraniu oferty formularz zapytania będzie miał już wpisanego klienta.'))}
      ${filterBar(filters)}
      ${offers.length === 0
        ? emptyState({ title: 'Żadna oferta nie pasuje do filtrów', text: hasFilters ? 'Poszerz zakres dni albo wyczyść filtry, żeby zobaczyć cały katalog.' : 'Biuro nie opublikowało jeszcze ofert.', action: hasFilters ? clearFilters : undefined })
        : html`<ul class="offer-grid">${offers.map((offer) => offerCard(offer, filters.clientId))}</ul>`}`,
    renderEmpty: () => html`${pageHeader({ eyebrow: 'Katalog biura', title: 'Oferty' })}${filterBar(filters)}${emptyState({ title: 'Żadna oferta nie pasuje do filtrów', text: 'Poszerz zakres dni albo wyczyść filtry, żeby zobaczyć cały katalog.', action: clearFilters })}`,
  };
}

export function offerDetailBody(offer: Offer, options: { commissionRate: number; agentRate: number; primaryAction: Html | null }): Html {
  return html`<div class="offer-detail">
    <div class="offer-detail__hero">
      ${offerPhoto(offer.photoHues, offer.title, 'hero')}
      <div class="offer-detail__intro">
        <p class="eyebrow">${offer.region} · ${pluralizeDays(offer.days)}</p>
        <h1 class="page-title">${offer.title || 'Oferta bez tytułu'}</h1>
        <p class="page-lead">${offer.summary}</p>
        <dl class="offer-facts">
          <div><dt>Cena „od”</dt><dd class="offer-facts__price">${offer.priceFrom ? formatMoney(offer.priceFrom) : '—'}<small> / uczestnik</small></dd></div>
          <div><dt>Etap edukacji</dt><dd>${offer.stages.join(', ') || '—'}</dd></div>
          <div><dt>Minimum</dt><dd>${offer.minParticipants ?? '—'} uczestników</dd></div>
          <div><dt>Twoja prowizja</dt><dd>${formatRate(options.commissionRate)}${options.commissionRate !== options.agentRate ? html` <small>(stawka oferty, Twoja domyślna ${formatRate(options.agentRate)})</small>` : ''}</dd></div>
        </dl>
        <div class="offer-detail__actions">
          ${options.primaryAction ?? ''}
          ${offer.pdfName
            ? html`<button class="button button--secondary" ${onClick(() => showToast(`Pobieranie: ${offer.pdfName ?? ''}`, 'info'))}>Pobierz PDF dla klienta</button>`
            : html`<span class="muted small">Biuro nie dodało PDF do tej oferty.</span>`}
        </div>
      </div>
    </div>
    <div class="offer-detail__columns">
      <section aria-labelledby="program-heading">
        <h2 id="program-heading" class="section-title">Program dzień po dniu</h2>
        <ol class="program">${offer.program.map((day) => html`<li><span class="program__day">Dzień ${day.day}</span><p>${day.text}</p></li>`)}</ol>
      </section>
      <aside>
        <h2 class="section-title">Sezon</h2>
        ${seasonStrip(offer.seasonMonths)}
        <h2 class="section-title">W cenie</h2>
        <ul class="tick-list">${offer.included.map((item) => html`<li>${item}</li>`)}</ul>
        ${when(offer.extras.length > 0, () => html`<h2 class="section-title">Dodatkowo płatne</h2>
          <ul class="price-list">${offer.extras.map((extra) => html`<li><span>${extra.name}</span><span class="mono">+${formatMoney(extra.price)}</span></li>`)}</ul>`)}
      </aside>
    </div>
  </div>`;
}

export function agentOfferDetailScreen(offerId: string): ScreenDefinition {
  const offer = findOffer(offerId);
  const clientId = currentLocation().query.get('klient') ?? '';
  const agent = currentAgent();
  if (!offer || offer.status === 'DRAFT') {
    return {
      screenId: 'A-03',
      title: 'Oferta niedostępna',
      skeleton: 'detail',
      render: () => html`${pageHeader({ title: 'Oferta niedostępna', back: { href: '#/agent/oferty', label: 'Oferty' } })}${emptyState({ title: 'Ta oferta nie istnieje albo nie jest opublikowana', text: 'Wróć do katalogu i wybierz inną ofertę.', action: linkButton('Przejdź do ofert', '#/agent/oferty') })}`,
    };
  }
  const withdrawn = offer.status === 'WITHDRAWN';
  return {
    screenId: 'A-03',
    title: offer.title,
    skeleton: 'detail',
    errorCopy: { title: 'Nie udało się wczytać oferty', text: 'Spróbuj ponownie. Jeśli problem wraca, oferta mogła zostać usunięta.', code: `GET /offers/${offer.id} · 500` },
    render: () => html`<a class="back-link" href="${withQuery('/agent/oferty', { klient: clientId })}">← Oferty</a>
      ${when(withdrawn, () => banner('warning', 'Oferta wycofana z katalogu', 'Nie można składać do niej nowych zapytań. Zapytania już złożone toczą się dalej.'))}
      ${offerDetailBody(offer, {
        commissionRate: offer.commissionRate ?? agent.commissionRate,
        agentRate: agent.commissionRate,
        primaryAction: withdrawn ? null : html`<a class="button button--primary" href="${withQuery('/agent/zapytania/nowe', { oferta: offer.id, klient: clientId })}">Złóż zapytanie</a>`,
      })}`,
  };
}
