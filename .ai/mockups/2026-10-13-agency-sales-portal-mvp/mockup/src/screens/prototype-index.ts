import { html, onClick } from '../dom';
import { formatDate } from '../format';
import { navigate } from '../navigation';
import { resetState, state } from '../store';
import type { ScreenDefinition } from '../ui';

interface ScreenLink {
  id: string;
  label: string;
  href: string;
}

const screenGroups: Array<{ title: string; screens: ScreenLink[] }> = [
  {
    title: 'Konto',
    screens: [
      { id: 'S-01', label: 'Logowanie', href: '#/logowanie' },
      { id: 'S-02', label: 'Aktywacja konta (Piotr Zając)', href: '#/aktywacja/akt-zajac-7Q2' },
      { id: 'S-02', label: 'Aktywacja – link wygasł', href: '#/aktywacja/niewazny' },
      { id: 'S-03', label: 'Reset hasła – prośba', href: '#/reset-hasla' },
      { id: 'S-04', label: 'Reset hasła – nowe hasło', href: '#/reset-hasla/demo-reset' },
    ],
  },
  {
    title: 'Agent – Jan Kowalski',
    screens: [
      { id: 'A-01', label: 'Panel', href: '#/agent/panel' },
      { id: 'A-02', label: 'Oferty', href: '#/agent/oferty' },
      { id: 'A-03', label: 'Karta oferty', href: '#/agent/oferty/off-krakow' },
      { id: 'A-04', label: 'Nowe zapytanie', href: '#/agent/zapytania/nowe?oferta=off-krakow' },
      { id: 'A-05', label: 'Moje zapytania', href: '#/agent/zapytania' },
      { id: 'A-06', label: 'Karta zapytania (wycena gotowa)', href: '#/agent/zapytania/inq-0141' },
      { id: 'A-06', label: 'Karta zapytania (wycena wygasła)', href: '#/agent/zapytania/inq-0133' },
      { id: 'A-07', label: 'Klienci', href: '#/agent/klienci' },
      { id: 'A-08', label: 'Karta klienta', href: '#/agent/klienci/cl-dabrowska' },
      { id: 'A-09', label: 'Prowizje', href: '#/agent/prowizje' },
    ],
  },
  {
    title: 'Biuro – Ewa Nowak',
    screens: [
      { id: 'B-01', label: 'Kolejka zapytań', href: '#/biuro/kolejka' },
      { id: 'B-02', label: 'Karta zapytania (zaakceptowana)', href: '#/biuro/zapytania/inq-0136' },
      { id: 'B-04', label: 'Do rozliczenia', href: '#/biuro/do-rozliczenia' },
      { id: 'B-05', label: 'Oferty', href: '#/biuro/oferty' },
      { id: 'B-06', label: 'Edytor oferty (szkic z brakami)', href: '#/biuro/oferty/off-wroclaw' },
      { id: 'B-07', label: 'Podgląd oferty', href: '#/biuro/oferty/off-krakow/podglad' },
      { id: 'B-08', label: 'Agenci', href: '#/biuro/agenci' },
      { id: 'B-09', label: 'Konto agenta', href: '#/biuro/agenci/ag-kowalski' },
      { id: 'B-10', label: 'Prowizje', href: '#/biuro/prowizje' },
      { id: 'B-11', label: 'Raport agentów', href: '#/biuro/raport' },
    ],
  },
  {
    title: 'Klient – strona wyceny',
    screens: [
      { id: 'K-01', label: 'Aktywna wycena', href: '#/w/gd-0138-v2' },
      { id: 'K-01', label: 'Wycena zastąpiona (W1)', href: '#/w/gd-v1-zastapiona' },
      { id: 'K-01', label: 'Decyzja już podjęta (W2)', href: '#/w/kr-0118-zaakceptowana' },
    ],
  },
];

const journeys: Array<{ id: string; title: string; start: string; steps: string[] }> = [
  {
    id: 'P3–P7',
    title: 'Pełna sprzedaż: od klienta do wypłaconej prowizji',
    start: '#/agent/oferty?region=Ma%C5%82opolska&dniOd=2&dniDo=3&etap=SP%204%E2%80%938',
    steps: [
      'Agent: otwórz „Kraków i Wieliczka”, kliknij „Złóż zapytanie”, dodaj nowego klienta (np. Katarzyna Malinowska, SP nr 12, Łódź).',
      'Wpisz 13–15.05.2027, 26 uczniów, 2 opiekunów, kl. 6b, wyjazd z Łodzi i wyślij. Wpisz 19 uczniów, żeby zobaczyć ostrzeżenie o minimum.',
      'Biuro (pasek u góry): kolejka → nowe zapytanie → „Przejmij” → „Wystaw wycenę v1”: 980 zł × 26.',
      'Agent: „Poproś o zmianę” – „wariant bez Wieliczki”. Biuro: wycena v2 za 890 zł.',
      'Agent: „Wyślij klientowi” → „Podgląd strony klienta” → „Akceptuję” → „Potwierdzam akceptację”.',
      'Biuro: „Potwierdź rezerwację” z numerem umowy. Pasek prototypu: ustaw datę na 16.05.2027.',
      'Biuro: „Do rozliczenia” → „Oznacz jako zrealizowaną”: 27 uczestników, „Przelicz” → 24 030 zł, komentarz.',
      'Biuro: „Prowizje” → zaznacz pozycję → „Oznacz jako wypłacone”. Agent: „Prowizje” pokazuje 1 201,50 zł wypłacone.',
    ],
  },
  {
    id: 'P1',
    title: 'Biuro publikuje ofertę',
    start: '#/biuro/oferty/off-wroclaw',
    steps: ['Kliknij „Opublikuj” – baner wskaże braki (W1).', 'Uzupełnij sezon, cenę, opis, program 3 dni, świadczenia i dodaj zdjęcie. Panel „Gotowość” odhacza braki na bieżąco.', '„Podgląd” pokazuje widok agenta, „Opublikuj” udostępnia ofertę w wyszukiwarce.'],
  },
  {
    id: 'P2',
    title: 'Biuro zakłada konto agenta, agent je aktywuje',
    start: '#/biuro/agenci/nowy',
    steps: ['Wpisz dane (NIP z poprawną sumą, np. 1132853869). Spróbuj e-maila jan@kowalski-wycieczki.pl, żeby zobaczyć konflikt.', 'Po zapisie kliknij „Otwórz link aktywacyjny” (symulacja e-maila).', 'Ustaw hasło – agent trafia na swój panel.'],
  },
  {
    id: 'P6a',
    title: 'Decyzja klienta przekazana telefonicznie',
    start: '#/agent/zapytania/inq-0138',
    steps: ['Wycena jest u klienta od 11 dni („wymaga akcji”).', 'Kliknij „Klient zaakceptował”, wpisz adnotację „telefonicznie 13.10”.', 'Historia pokazuje kanał „zgłoszone przez agenta”, powstaje prognozowana prowizja.'],
  },
  {
    id: 'P8',
    title: 'Ścieżki zamykające',
    start: '#/agent/zapytania/inq-0144',
    steps: ['Agent: „Wycofaj” z powodem (UC-A5).', 'Biuro: kolejka → ZAP-2026-0139 → „Odrzuć” (UC-B3 PA1).', 'Biuro: ZAP-2026-0118 → „Anuluj rezerwację” (UC-B7) – prowizja spada do 0.'],
  },
  {
    id: 'P9',
    title: 'Wygaśnięcie wyceny',
    start: '#/agent/panel',
    steps: ['ZAP-2026-0141 wygasa 15.10 – panel ostrzega.', 'Pasek prototypu: „+3 dni”. Wycena wygasa, zapytanie wraca do „Wycena gotowa” z plakietką „wycena wygasła”.', 'Agent: „Poproś o odświeżenie wyceny” albo biuro: „Wystaw nową wersję”.'],
  },
  {
    id: 'P10–P11',
    title: 'Link nieaktualny i raport',
    start: '#/w/gd-v1-zastapiona',
    steps: ['Stary link pokazuje „Wycena nieaktualna” bez przycisków.', 'Biuro: „Raport agentów” → klik agenta otwiera kolejkę z filtrem.'],
  },
];

export function prototypeIndexScreen(): ScreenDefinition {
  return {
    screenId: 'Mapa',
    title: 'Mapa prototypu',
    skeleton: 'list',
    render: () => html`<div class="prototype-index">
      <header class="prototype-index__header">
        <p class="eyebrow">Prototyp · ${formatDate(state.today)}</p>
        <h1 class="page-title">Portal sprzedaży agencyjnej – MVP</h1>
        <p class="page-lead">Klikalny prototyp wszystkich ekranów z dokumentu. Dane żyją w przeglądarce, przejścia statusów działają jak w docelowym systemie. Pasek u góry przełącza rolę, stan ekranu (ładowanie, pusto, błąd) i datę systemową.</p>
        <p><button class="button button--secondary button--small" ${onClick(() => {
          resetState();
          navigate('/');
        })}>Przywróć dane startowe</button></p>
      </header>
      <section aria-labelledby="journeys-title">
        <h2 id="journeys-title" class="section-title">Kluczowe ścieżki</h2>
        <ol class="journeys">${journeys.map((journey) => html`<li class="journey">
          <p class="journey__id mono">${journey.id}</p>
          <h3 class="journey__title">${journey.title}</h3>
          <ol class="journey__steps">${journey.steps.map((step) => html`<li>${step}</li>`)}</ol>
          <a class="button button--primary button--small" href="${journey.start}">Zacznij</a>
        </li>`)}</ol>
      </section>
      <section aria-labelledby="screens-title">
        <h2 id="screens-title" class="section-title">Wszystkie ekrany</h2>
        <div class="screen-groups">${screenGroups.map((group) => html`<div class="screen-group">
          <h3 class="screen-group__title">${group.title}</h3>
          <ul>${group.screens.map((screen) => html`<li><a href="${screen.href}"><span class="mono screen-id">${screen.id}</span>${screen.label}</a></li>`)}</ul>
        </div>`)}</div>
      </section>
    </div>`,
  };
}
