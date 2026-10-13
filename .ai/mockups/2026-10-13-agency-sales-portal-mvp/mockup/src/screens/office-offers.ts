import { banner, checkboxGroup, emptyState, field, linkButton, offerPhoto, pageHeader, plainChip, rowLink, selectField, textareaField } from '../components';
import { Html, html, linesOf, listOf, numberOf, onChange, onClick, onInput, onSubmit, runPending, showToast, textOf, when } from '../dom';
import { formatDateTime, formatMoney, formatRate, monthShortNames, offerStatusLabels, pluralizeDays } from '../format';
import { currentLocation, navigate, withQuery } from '../navigation';
import { duplicateOffer, findOffer, isTerminal, missingFieldsForPublication, saveOffer, setOfferStatus, state, type OfferInput } from '../store';
import { educationStages, regions } from '../seed';
import type { Offer, OfferStatus } from '../types';
import { requestRender, type ScreenDefinition } from '../ui';
import { isRateInRange, isWholeNumberInRange } from '../validation';
import { offerDetailBody } from './agent-offers';

const statusTone: Record<OfferStatus, string> = { DRAFT: 'draft', PUBLISHED: 'pine', WITHDRAWN: 'closed' };

function openInquiriesCount(offerId: string): number {
  return state.inquiries.filter((inquiry) => inquiry.offerId === offerId && inquiry.status !== 'DRAFT' && !isTerminal(inquiry)).length;
}

function withdrawOffer(offer: Offer, button: HTMLElement): void {
  const openCount = openInquiriesCount(offer.id);
  if (!window.confirm(`Wycofać ofertę „${offer.title}”? Oferta zniknie z wyszukiwarki agentów. Otwarte zapytania (${openCount}) toczą się dalej.`)) return;
  runPending(button, 'Wycofywanie…', () => {
    setOfferStatus(offer, 'WITHDRAWN');
    showToast('Wycofano ofertę');
  });
}

function publishOffer(offer: Offer, button: HTMLElement): void {
  const missing = missingFieldsForPublication(offer);
  if (missing.length > 0) {
    publicationErrors = { offerId: offer.id, missing };
    navigate(`/biuro/oferty/${offer.id}`);
    requestRender();
    return;
  }
  const republish = offer.status === 'WITHDRAWN';
  runPending(button, 'Publikowanie…', () => {
    setOfferStatus(offer, 'PUBLISHED');
    showToast(republish ? 'Opublikowano ponownie' : 'Opublikowano ofertę');
  });
}

function copyAsDraft(offer: Offer, button: HTMLElement): void {
  runPending(button, 'Kopiowanie…', () => {
    const copy = duplicateOffer(offer);
    showToast('Skopiowano jako szkic');
    navigate(`/biuro/oferty/${copy.id}`);
  });
}

const listTabs: Array<{ key: string; label: string; status: OfferStatus | null }> = [
  { key: 'opublikowane', label: 'Opublikowane', status: 'PUBLISHED' },
  { key: 'szkice', label: 'Szkice', status: 'DRAFT' },
  { key: 'wycofane', label: 'Wycofane', status: 'WITHDRAWN' },
  { key: 'wszystkie', label: 'Wszystkie', status: null },
];

export function officeOfferListScreen(): ScreenDefinition {
  const query = currentLocation().query;
  const tab = listTabs.find((candidate) => candidate.key === query.get('widok')) ?? listTabs[3]!;
  const phrase = query.get('szukaj') ?? '';
  const inTab = (candidate: (typeof listTabs)[number]) => state.offers.filter((offer) => !candidate.status || offer.status === candidate.status);
  const rows = inTab(tab).filter((offer) => offer.title.toLowerCase().includes(phrase.toLowerCase()));
  const newOffer = linkButton('Nowa oferta', '#/biuro/oferty/nowa', 'primary');
  const emptyCatalog = emptyState({ title: 'Katalog jest pusty', text: 'Utwórz pierwszą ofertę i opublikuj ją dla agentów.', action: newOffer });
  return {
    screenId: 'B-05',
    title: 'Oferty',
    skeleton: 'list',
    errorCopy: { title: 'Nie udało się wczytać ofert', text: 'Spróbuj ponownie.', code: 'GET /offers · 503' },
    render: () => html`${pageHeader({ eyebrow: 'Katalog', title: 'Oferty', lead: 'Opublikowane oferty widzą wszyscy aktywni agenci.', actions: newOffer })}
      <div class="tabs" role="tablist">${listTabs.map((candidate) => html`<button role="tab" aria-selected="${candidate === tab}" class="${candidate === tab ? 'is-on' : ''}" ${onClick(() => navigate(withQuery('/biuro/oferty', { widok: candidate.key, szukaj: phrase })))}>${candidate.label} <span class="tab-count">${inTab(candidate).length}</span></button>`)}</div>
      <div class="toolbar"><label class="filter filter--search"><span>Szukaj</span><input type="search" value="${phrase}" placeholder="tytuł oferty" ${onChange((element) => navigate(withQuery('/biuro/oferty', { widok: tab.key, szukaj: element.value })))}></label></div>
      ${state.offers.length === 0
        ? emptyCatalog
        : rows.length === 0
          ? emptyState({ title: phrase ? `Brak ofert „${phrase}”` : `Brak ofert w widoku „${tab.label}”`, text: 'Zmień widok albo wyszukiwanie.' })
          : html`<div class="table-wrap"><table class="table">
              <thead><tr><th>Oferta</th><th>Dni</th><th>Etapy</th><th class="numeric">Cena „od”</th><th>Stawka</th><th>Status</th><th class="numeric">Otwarte zapyt.</th><th>Zmiana</th><th><span class="visually-hidden">Akcje</span></th></tr></thead>
              <tbody>${rows.map((offer) => html`<tr class="is-clickable" ${rowLink(`/biuro/oferty/${offer.id}`)}>
                <td data-label="Oferta"><div class="offer-cell">${offerPhoto(offer.photoHues, offer.title)}<span><a href="#/biuro/oferty/${offer.id}"><strong>${offer.title}</strong></a><br><span class="muted small">${offer.region}</span></span></div></td>
                <td data-label="Dni">${offer.days}</td>
                <td data-label="Etapy">${offer.stages.join(', ') || '—'}</td>
                <td data-label="Cena „od”" class="numeric mono">${offer.priceFrom ? formatMoney(offer.priceFrom) : '—'}</td>
                <td data-label="Stawka">${offer.commissionRate ? formatRate(offer.commissionRate) : html`<span class="muted">stawka agenta</span>`}</td>
                <td data-label="Status">${plainChip(offerStatusLabels[offer.status], statusTone[offer.status])}</td>
                <td data-label="Otwarte zapytania" class="numeric">${openInquiriesCount(offer.id)}</td>
                <td data-label="Zmiana" class="small">${formatDateTime(offer.updatedAt)}</td>
                <td class="row-actions">
                  <a class="button button--ghost button--small" href="#/biuro/oferty/${offer.id}/podglad">Podgląd</a>
                  ${offer.status === 'PUBLISHED'
                    ? html`<button class="button button--ghost button--small" ${onClick((element) => withdrawOffer(offer, element))}>Wycofaj</button>`
                    : html`<button class="button button--ghost button--small" ${onClick((element) => publishOffer(offer, element))}>Opublikuj</button>`}
                  <button class="button button--ghost button--small" ${onClick((element) => copyAsDraft(offer, element))}>Kopiuj jako szkic</button>
                </td>
              </tr>`)}</tbody>
            </table></div>`}`,
    renderEmpty: () => html`${pageHeader({ eyebrow: 'Katalog', title: 'Oferty', actions: newOffer })}${emptyCatalog}`,
  };
}

let publicationErrors: { offerId: string; missing: string[] } | null = null;
let editorFiles: { offerKey: string; photoHues: number[]; pdfName: string | null } | null = null;
const samplePhotoHues = [[12, 40], [195, 215], [140, 170], [260, 290], [35, 55]];

function filesFor(offer: Offer | undefined): { offerKey: string; photoHues: number[]; pdfName: string | null } {
  const offerKey = offer?.id ?? 'new';
  if (!editorFiles || editorFiles.offerKey !== offerKey) {
    editorFiles = { offerKey, photoHues: [...(offer?.photoHues ?? [])], pdfName: offer?.pdfName ?? null };
  }
  return editorFiles;
}

function readOfferInput(data: FormData, files: { photoHues: number[]; pdfName: string | null }): OfferInput {
  const days = numberOf(data, 'days');
  const dayCount = Number.isFinite(days) ? days : 0;
  const priceFrom = numberOf(data, 'priceFrom');
  const minParticipants = numberOf(data, 'minParticipants');
  const commissionRate = numberOf(data, 'commissionRate');
  return {
    title: textOf(data, 'title'),
    region: textOf(data, 'region'),
    days: dayCount,
    stages: listOf(data, 'stages'),
    seasonMonths: listOf(data, 'seasonMonths').map(Number),
    priceFrom: Number.isFinite(priceFrom) ? priceFrom : null,
    minParticipants: Number.isFinite(minParticipants) ? minParticipants : null,
    commissionRate: Number.isFinite(commissionRate) ? commissionRate : null,
    summary: textOf(data, 'summary'),
    program: Array.from({ length: Math.max(dayCount, 0) }, (_, index) => ({ day: index + 1, text: textOf(data, `program-${index + 1}`) })),
    included: linesOf(data, 'included'),
    extras: linesOf(data, 'extras').map((line) => {
      const [name = '', price = ''] = line.split(';').map((part) => part.trim());
      return { name, price: Number(price.replace(',', '.')) };
    }),
    photoHues: files.photoHues,
    pdfName: files.pdfName,
  };
}

function validateDraft(data: FormData): Record<string, string> {
  const errors: Record<string, string> = {};
  const title = textOf(data, 'title');
  if (!title || title.length > 120) errors.title = 'Wpisz tytuł oferty.';
  if (!isWholeNumberInRange(numberOf(data, 'days'), 1, 14)) errors.days = 'Podaj liczbę dni (1–14).';
  const price = textOf(data, 'priceFrom');
  if (price && !(Number(price) > 0)) errors.priceFrom = 'Podaj cenę „od” za uczestnika.';
  const minimum = textOf(data, 'minParticipants');
  if (minimum && !isWholeNumberInRange(Number(minimum), 1, 200)) errors.minParticipants = 'Podaj minimalną liczbę uczestników.';
  const rate = textOf(data, 'commissionRate');
  if (rate && !isRateInRange(Number(rate.replace(',', '.')))) errors.commissionRate = 'Stawka musi być od 0 do 30%.';
  const extrasInvalid = linesOf(data, 'extras').some((line) => {
    const [name = '', extraPrice = ''] = line.split(';').map((part) => part.trim());
    return !name || !(Number(extraPrice.replace(',', '.')) > 0);
  });
  if (extrasInvalid) errors.extras = 'Podaj nazwę i cenę świadczenia, np. „Rejs po Wiśle; 35”.';
  return errors;
}

function programFields(program: Array<{ day: number; text: string }>, days: number): Html {
  return html`${Array.from({ length: Math.max(days, 1) }, (_, index) => textareaField({ name: `program-${index + 1}`, label: `Dzień ${index + 1}`, rows: 2, value: program.find((day) => day.day === index + 1)?.text ?? '', placeholder: index === 0 ? 'np. Wyjazd rano, Wawel z przewodnikiem, nocleg' : '' }))}`;
}

function rebuildProgram(form: HTMLFormElement, days: number): void {
  const container = form.querySelector<HTMLElement>('[data-program]');
  if (!container || !isWholeNumberInRange(days, 1, 14)) return;
  const current = Array.from(container.querySelectorAll('textarea')).map((textarea, index) => ({ day: index + 1, text: textarea.value }));
  const removed = current.slice(days).filter((day) => day.text.trim());
  if (removed.length > 0 && !window.confirm(`Program dni ${removed.map((day) => day.day).join(', ')} zostanie usunięty.`)) return;
  container.innerHTML = programFields(current, days).value;
}

function renderReadiness(form: HTMLFormElement, files: { photoHues: number[]; pdfName: string | null }): void {
  const list = form.ownerDocument.querySelector<HTMLElement>('[data-readiness]');
  if (!list) return;
  const missing = missingFieldsForPublication(readOfferInput(new FormData(form), files));
  list.innerHTML = missing.length === 0 ? '<li class="is-done">Wszystko gotowe do publikacji</li>' : missing.map((item) => `<li>${item}</li>`).join('');
}

export function officeOfferEditorScreen(offerId: string | null): ScreenDefinition {
  const offer = offerId ? findOffer(offerId) : undefined;
  if (offerId && !offer) {
    return { screenId: 'B-06', title: 'Nie znaleziono oferty', skeleton: 'form', render: () => html`${pageHeader({ title: 'Nie znaleziono oferty', back: { href: '#/biuro/oferty', label: 'Oferty' } })}` };
  }
  const files = filesFor(offer);
  const errorsForThisOffer = publicationErrors && publicationErrors.offerId === offer?.id ? publicationErrors.missing : null;
  publicationErrors = null;
  const status = offer?.status ?? 'DRAFT';
  const days = offer?.days ?? 3;
  const initialMissing = missingFieldsForPublication(offer ?? { title: '', region: '', days, stages: [], seasonMonths: [], priceFrom: null, minParticipants: null, commissionRate: null, summary: '', program: [], included: [], extras: [], photoHues: files.photoHues, pdfName: files.pdfName });

  const persist = (data: FormData) => saveOffer(readOfferInput(data, files), offer?.id ?? null);

  return {
    screenId: 'B-06',
    title: offer ? offer.title : 'Nowa oferta',
    skeleton: 'form',
    errorCopy: { title: 'Nie udało się wczytać oferty', text: 'Spróbuj ponownie.', code: `GET /offers/${offerId ?? ''} · 500` },
    render: () => html`${pageHeader({
        back: { href: '#/biuro/oferty', label: 'Oferty' },
        eyebrow: offer ? `Oferta · ${offerStatusLabels[status]}` : 'Nowa oferta',
        title: offer?.title || 'Nowa oferta',
        actions: offer ? html`<a class="button button--ghost" href="#/biuro/oferty/${offer.id}/podglad">Podgląd</a><button class="button button--ghost" ${onClick((element) => copyAsDraft(offer, element))}>Kopiuj jako szkic</button>` : undefined,
      })}
      ${when(errorsForThisOffer, () => banner('alert', 'Nie można opublikować', `Uzupełnij: ${(errorsForThisOffer ?? []).join(', ')}. Oferta pozostaje szkicem.`))}
      ${when(status === 'PUBLISHED', () => banner('info', 'Oferta jest opublikowana', 'Zmiany są widoczne dla agentów od razu po zapisie. Złożone zapytania zachowują migawkę oferty.'))}
      ${when(status === 'WITHDRAWN', () => banner('warning', 'Oferta jest wycofana', 'Agenci jej nie widzą i nie mogą składać zapytań. Otwarte zapytania toczą się dalej.'))}
      <div class="form-layout">
        <form class="form panel" id="offer-form" data-preserve="offer-${offer?.id ?? 'new'}" ${onSubmit(validateDraft, (data, form, submitter) => {
          const intent = submitter?.value ?? 'save';
          if (intent === 'publish') {
            const input = readOfferInput(data, files);
            const missing = missingFieldsForPublication(input);
            runPending(submitter, 'Publikowanie…', () => {
              const saved = persist(data);
              if (missing.length > 0) {
                publicationErrors = { offerId: saved.id, missing };
                if (!offer) navigate(`/biuro/oferty/${saved.id}`);
                else requestRender();
                window.scrollTo({ top: 0 });
                return;
              }
              const republish = saved.status === 'WITHDRAWN';
              setOfferStatus(saved, 'PUBLISHED');
              showToast(republish ? 'Opublikowano ponownie' : 'Opublikowano ofertę');
              if (!offer) navigate(`/biuro/oferty/${saved.id}`);
            });
            return;
          }
          if (intent === 'withdraw' && offer) {
            withdrawOffer(offer, submitter ?? form);
            return;
          }
          runPending(submitter, 'Zapisywanie…', () => {
            const saved = persist(data);
            showToast(status === 'DRAFT' ? 'Zapisano szkic' : 'Zapisano zmiany');
            if (!offer) navigate(`/biuro/oferty/${saved.id}`);
          });
        })} ${onInput((element) => {
          if (element.form) renderReadiness(element.form, files);
        })} ${onChange((element) => {
          if (element.form) renderReadiness(element.form, files);
        })}>
          <fieldset class="form-section"><legend class="form-section__title">Podstawowe</legend>
            ${field({ name: 'title', label: 'Tytuł', required: true, value: offer?.title ?? '', placeholder: 'np. Kraków i Wieliczka' })}
            <div class="form-grid">
              ${selectField({ name: 'region', label: 'Region lub kierunek', value: offer?.region ?? '', emptyLabel: 'Wybierz…', choices: regions.map((region) => ({ value: region, label: region })) })}
              ${field({ name: 'days', label: 'Liczba dni', type: 'number', required: true, min: 1, max: 14, value: days, inputMode: 'numeric', attrs: onChange((element) => {
                if (element.form) rebuildProgram(element.form, Number(element.value));
              }) })}
            </div>
            ${checkboxGroup({ name: 'stages', legend: 'Etapy edukacji', choices: educationStages.map((stage) => ({ value: stage, label: stage })), selected: offer?.stages ?? [] })}
            ${checkboxGroup({ name: 'seasonMonths', legend: 'Sezon dostępności', variant: 'months', choices: monthShortNames.map((name, index) => ({ value: String(index + 1), label: name })), selected: (offer?.seasonMonths ?? []).map(String) })}
            ${textareaField({ name: 'summary', label: 'Opis skrócony', rows: 2, value: offer?.summary ?? '', placeholder: 'Jedno, dwa zdania na kartę oferty' })}
          </fieldset>
          <fieldset class="form-section"><legend class="form-section__title">Cena i prowizja</legend>
            <div class="form-grid form-grid--thirds">
              ${field({ name: 'priceFrom', label: 'Cena „od” (zł / uczestnik)', type: 'number', min: 0, step: '0.01', value: offer?.priceFrom ?? '', inputMode: 'decimal' })}
              ${field({ name: 'minParticipants', label: 'Minimum uczestników', type: 'number', min: 1, value: offer?.minParticipants ?? '', inputMode: 'numeric' })}
              ${field({ name: 'commissionRate', label: 'Stawka prowizji oferty (%)', type: 'number', min: 0, max: 30, step: '0.5', value: offer?.commissionRate ?? '', hint: 'Opcjonalna. Nadpisuje stawkę agenta.' })}
            </div>
          </fieldset>
          <fieldset class="form-section"><legend class="form-section__title">Program dzień po dniu</legend>
            <div data-program>${programFields(offer?.program ?? [], days)}</div>
          </fieldset>
          <fieldset class="form-section"><legend class="form-section__title">Świadczenia</legend>
            ${textareaField({ name: 'included', label: 'W cenie', rows: 4, value: (offer?.included ?? []).join('\n'), hint: 'Jedno świadczenie w wierszu.' })}
            ${textareaField({ name: 'extras', label: 'Dodatkowo płatne', rows: 2, value: (offer?.extras ?? []).map((extra) => `${extra.name}; ${extra.price}`).join('\n'), hint: 'Format: nazwa; cena za osobę.' })}
          </fieldset>
          <fieldset class="form-section"><legend class="form-section__title">Pliki</legend>
            <div class="photo-strip">
              ${files.photoHues.length === 0 ? html`<p class="muted small">Dodaj co najmniej jedno zdjęcie – pojawi się na karcie oferty.</p>` : ''}
              ${chunkPairs(files.photoHues).map((pair, index) => html`<figure class="photo-thumb">${offerPhoto(pair, `zdjęcie ${index + 1}`)}<button type="button" class="icon-button" aria-label="Usuń zdjęcie ${index + 1}" ${onClick(() => {
                files.photoHues = files.photoHues.filter((_, hueIndex) => Math.floor(hueIndex / 2) !== index);
                requestRender();
              })}>×</button></figure>`)}
              <button type="button" class="dropzone" ${onClick(() => {
                const next = samplePhotoHues[(files.photoHues.length / 2) % samplePhotoHues.length] ?? [200, 230];
                files.photoHues = [...files.photoHues, ...next];
                requestRender();
              })}>+ Dodaj zdjęcie<br><span class="small muted">JPG, PNG, WebP do 5 MB</span></button>
            </div>
            <div class="pdf-row">
              ${files.pdfName
                ? html`<span class="file-chip">📄 ${files.pdfName}</span><button type="button" class="button button--ghost button--small" ${onClick(() => {
                    files.pdfName = null;
                    requestRender();
                  })}>Usuń PDF</button>`
                : html`<button type="button" class="button button--ghost button--small" ${onClick(() => {
                    files.pdfName = 'program-oferty.pdf';
                    requestRender();
                  })}>Dodaj PDF dla klienta</button><span class="muted small">opcjonalnie, do 20 MB</span>`}
            </div>
          </fieldset>
          <div class="form-actions form-actions--sticky">
            <button type="submit" class="button button--secondary" name="intent" value="save">${status === 'DRAFT' ? 'Zapisz szkic' : 'Zapisz zmiany'}</button>
            ${status === 'PUBLISHED'
              ? html`<button type="submit" class="button button--danger-ghost" name="intent" value="withdraw" data-skip-validation="true">Wycofaj</button>`
              : html`<button type="submit" class="button button--primary" name="intent" value="publish">${status === 'WITHDRAWN' ? 'Opublikuj ponownie' : 'Opublikuj'}</button>`}
          </div>
        </form>
        <aside class="readiness panel" aria-labelledby="readiness-title">
          <h2 id="readiness-title" class="panel__title">Gotowość do publikacji</h2>
          <p class="muted small">Brakuje:</p>
          <ul class="readiness__list" data-readiness aria-live="polite">${initialMissing.length === 0 ? html`<li class="is-done">Wszystko gotowe do publikacji</li>` : initialMissing.map((item) => html`<li>${item}</li>`)}</ul>
        </aside>
      </div>`,
  };
}

function chunkPairs(values: number[]): number[][] {
  return values.reduce<number[][]>((pairs, value, index) => {
    if (index % 2 === 0) pairs.push([value]);
    else pairs[pairs.length - 1]?.push(value);
    return pairs;
  }, []);
}

export function officeOfferPreviewScreen(offerId: string): ScreenDefinition {
  const offer = findOffer(offerId);
  if (!offer) return { screenId: 'B-07', title: 'Nie znaleziono oferty', skeleton: 'detail', render: () => html`${pageHeader({ title: 'Nie znaleziono oferty', back: { href: '#/biuro/oferty', label: 'Oferty' } })}` };
  const sampleAgentRate = 5;
  const missing = missingFieldsForPublication(offer);
  return {
    screenId: 'B-07',
    title: `Podgląd: ${offer.title}`,
    skeleton: 'detail',
    render: () => html`<div class="preview-bar" role="status">
        <span><strong>Podgląd</strong> – tak ofertę zobaczy agent (prowizja liczona dla stawki agenta ${formatRate(sampleAgentRate)}).</span>
        <span class="preview-bar__actions">
          <a class="button button--ghost button--small" href="#/biuro/oferty/${offer.id}">Wróć do edycji</a>
          ${when(offer.status !== 'PUBLISHED', () => html`<button class="button button--primary button--small" ${onClick((element) => publishOffer(offer, element))}>Opublikuj</button>`)}
        </span>
      </div>
      ${when(missing.length > 0, () => banner('warning', 'Szkic ma braki', `Agent zobaczyłby puste miejsca: ${missing.join(', ')}.`))}
      ${offerDetailBody(offer, { commissionRate: offer.commissionRate ?? sampleAgentRate, agentRate: sampleAgentRate, primaryAction: html`<button class="button button--primary" disabled title="Niedostępne w podglądzie">Złóż zapytanie</button>` })}
      <p class="muted small">Długość: ${pluralizeDays(offer.days)} · status: ${offerStatusLabels[offer.status]}</p>`,
  };
}
