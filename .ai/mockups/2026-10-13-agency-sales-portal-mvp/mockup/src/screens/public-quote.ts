import { quoteTicket, selectField, textareaField } from '../components';
import { Html, html, onClick, onSubmit, runPending, textOf, when } from '../dom';
import { formatDate, formatDateTime, formatMoney } from '../format';
import { agentFullName, findAgent, findClient, findOffer, findQuoteByToken, quoteValue, recordClientDecision } from '../store';
import type { Agent, Inquiry, Quote } from '../types';
import { requestRender, type ScreenDefinition } from '../ui';

type PublicStep = 'view' | 'confirm-accept' | 'reject';

let stepByToken: { token: string; step: PublicStep } | null = null;
let landingStampToken: string | null = null;

function setStep(token: string, step: PublicStep): void {
  stepByToken = { token, step };
  requestRender();
}

function agentCard(agent: Agent): Html {
  return html`<section class="agent-card" aria-label="Twój agent">
    <p class="eyebrow">Twój agent</p>
    <p class="agent-card__name">${agentFullName(agent)}</p>
    <p class="muted">${agent.companyName}</p>
    <p class="agent-card__contact"><a href="tel:${agent.phone.replace(/\s/g, '')}">${agent.phone}</a> · <a href="mailto:${agent.email}">${agent.email}</a></p>
  </section>`;
}

function publicFrame(content: Html): Html {
  return html`<div class="public-page">
    <header class="public-page__header"><span class="brand"><span class="brand__mark" aria-hidden="true"></span>Wycieczki szkolne</span></header>
    <div class="public-page__main">${content}</div>
  </div>`;
}

function decisionBar(quote: Quote, token: string): Html {
  const step = stepByToken?.token === token ? stepByToken.step : 'view';
  if (step === 'confirm-accept') {
    return html`<div class="decision-bar decision-bar--confirm" role="region" aria-label="Potwierdzenie">
      <p>Akceptujesz wycenę na <strong>${formatMoney(quoteValue(quote))}</strong>. Agent skontaktuje się w sprawie umowy.</p>
      <div class="decision-bar__buttons">
        <button class="button button--ghost" ${onClick(() => setStep(token, 'view'))}>Wróć</button>
        <button class="button button--accept" data-autofocus ${onClick((element) =>
          runPending(element, 'Zapisywanie…', () => {
            const found = findQuoteByToken(token);
            if (!found || found.quote.status !== 'ACTIVE') return requestRender();
            landingStampToken = token;
            stepByToken = null;
            recordClientDecision(found.inquiry, true, 'link', '');
          }),
        )}>Potwierdzam akceptację</button>
      </div>
    </div>`;
  }
  if (step === 'reject') {
    return html`<form class="decision-bar decision-bar--reject" aria-label="Odrzucenie wyceny" ${onSubmit(
        (data) => (textOf(data, 'reasonText').length > 1000 ? { reasonText: 'Powód może mieć najwyżej 1000 znaków.' } : {}),
        (data, _form, submitter) =>
          runPending(submitter, 'Zapisywanie…', () => {
            const found = findQuoteByToken(token);
            if (!found || found.quote.status !== 'ACTIVE') return requestRender();
            stepByToken = null;
            recordClientDecision(found.inquiry, false, 'link', [textOf(data, 'reason'), textOf(data, 'reasonText')].filter(Boolean).join(': '));
          }),
      )}>
      ${selectField({ name: 'reason', label: 'Powód (opcjonalnie)', emptyLabel: 'Bez podania powodu', choices: ['Cena', 'Termin', 'Wybraliśmy inny wyjazd', 'Rezygnacja z wyjazdu'].map((reason) => ({ value: reason, label: reason })) })}
      ${textareaField({ name: 'reasonText', label: 'Komentarz dla agenta (opcjonalnie)', rows: 2 })}
      <div class="decision-bar__buttons">
        <button type="button" class="button button--ghost" ${onClick(() => setStep(token, 'view'))}>Wróć</button>
        <button type="submit" class="button button--danger">Odrzuć wycenę</button>
      </div>
    </form>`;
  }
  return html`<div class="decision-bar" role="region" aria-label="Decyzja">
    <p class="decision-bar__hint">Ważna do <strong>${formatDate(quote.validUntil)}</strong></p>
    <div class="decision-bar__buttons">
      <button class="button button--secondary" ${onClick(() => setStep(token, 'reject'))}>Odrzucam</button>
      <button class="button button--accept" ${onClick(() => setStep(token, 'confirm-accept'))}>Akceptuję</button>
    </div>
  </div>`;
}

function quoteContent(inquiry: Inquiry, quote: Quote, afterTicket: Html | null = null): Html {
  const client = findClient(inquiry.clientId);
  const offer = findOffer(inquiry.offerId);
  return html`<p class="eyebrow">Wycena wycieczki</p>
    <h1 class="public-title">${inquiry.offerSnapshot.title}</h1>
    <p class="public-lead">dla: ${[inquiry.ageOrClass || 'Twojej klasy', client?.school, client?.city].filter(Boolean).join(', ')}</p>
    ${quoteTicket(quote, inquiry, { stamp: quote.status === 'ACCEPTED' || quote.status === 'REJECTED', audience: 'client' })}
    ${afterTicket ?? ''}
    ${when(offer && offer.program.length > 0, () => html`<section class="public-section"><h2 class="section-title">Program</h2>
      <ol class="program">${(offer?.program ?? []).map((day) => html`<li><span class="program__day">Dzień ${day.day}</span><p>${day.text}</p></li>`)}</ol></section>`)}`;
}

export function publicQuoteScreen(token: string): ScreenDefinition {
  const found = findQuoteByToken(token);
  if (!found) {
    return {
      screenId: 'K-01',
      title: 'Nie znaleziono wyceny',
      skeleton: 'ticket',
      render: () => publicFrame(html`<section class="public-message"><h1 class="public-title">Nie znaleziono wyceny</h1><p>Sprawdź link od agenta – mógł zostać skopiowany niepełny.</p></section>`),
    };
  }
  const { inquiry, quote } = found;
  const agent = findAgent(inquiry.agentId);
  const decided = quote.status === 'ACCEPTED' || quote.status === 'REJECTED';
  const live = quote.status === 'ACTIVE' && inquiry.status === 'SENT_TO_CLIENT';
  const landing = landingStampToken === token;
  landingStampToken = null;

  if (decided && quote.decision) {
    const accepted = quote.decision.accepted;
    return {
      screenId: 'K-01',
      title: accepted ? 'Wycena zaakceptowana' : 'Wycena odrzucona',
      skeleton: 'ticket',
      render: () => publicFrame(html`<div class="public-stack ${landing ? 'is-landing' : ''}">
          ${quoteContent(
            inquiry,
            quote,
            html`<section class="public-message public-message--${accepted ? 'accepted' : 'rejected'}" role="status">
              ${accepted
                ? html`<p><strong>Wycena zaakceptowana ${formatDateTime(quote.decision?.at ?? '')}.</strong></p><p>${agentFullName(agent)} skontaktuje się z Panią/Panem w sprawie umowy.</p>`
                : html`<p><strong>Wycena odrzucona.</strong></p><p>Dziękujemy za informację. Jeśli zmienią się plany, skontaktuj się z agentem.</p>`}
            </section>`,
          )}
          ${agentCard(agent)}
        </div>`),
    };
  }

  if (!live) {
    return {
      screenId: 'K-01',
      title: 'Wycena nieaktualna',
      skeleton: 'ticket',
      render: () => publicFrame(html`<section class="public-message public-message--stale">
          <p class="eyebrow">${inquiry.offerSnapshot.title}</p>
          <h1 class="public-title">Wycena nieaktualna – skontaktuj się z agentem</h1>
          <p>Ta wersja wyceny została zastąpiona nowszą, wygasła albo zapytanie zostało zamknięte. Agent prześle aktualny link.</p>
        </section>
        ${agentCard(agent)}`),
    };
  }

  return {
    screenId: 'K-01',
    title: `Wycena: ${inquiry.offerSnapshot.title}`,
    skeleton: 'ticket',
    errorCopy: { title: 'Nie udało się wczytać wyceny', text: 'Spróbuj odświeżyć stronę za chwilę.', code: `GET /public/quotes/${token} · 503` },
    render: () => publicFrame(html`${quoteContent(inquiry, quote)}
        ${agentCard(agent)}
        ${decisionBar(quote, token)}`),
  };
}
