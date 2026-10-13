# Portal sprzedaży agencyjnej — specyfikacja ekranów

Źródło: `00-zakres-funkcjonalny.md` · Mapa i katalog API: `01-mapa-ekranow-i-nawigacji.md` · Data: 2026-10-13

Dla każdego ekranu: cel, funkcje, komponenty UI, stany (loading, empty, error, success), walidacje i endpointy. Identyfikatory ekranów, trasy, kody statusów i ścieżki API są takie same jak w `01`. Konwencje wspólne opisuje sekcja 1 i nie są powtarzane przy ekranach, chyba że ekran od nich odbiega.

## 1. Wzorce wspólne

### 1.1 Stany

| Stan | Reguła |
|---|---|
| Loading | Szkielet o kształcie docelowego układu (wiersze tabeli, karty, pola formularza), bez spinnera na całą stronę. Szkielet pojawia się po 150 ms, żeby szybkie odpowiedzi nie migały. Odświeżenie danych już widocznych: cienki pasek postępu u góry treści, dane pozostają. |
| Empty | Zaproszenie do działania: jedno zdanie, co tu będzie, i główny przycisk (np. „Dodaj klienta”). Pusty wynik filtrów jest osobnym stanem z przyciskiem „Wyczyść filtry”. |
| Error | Baner w miejscu treści, z opisem co się stało, kodem błędu i przyciskiem „Spróbuj ponownie”. Błędy mutacji: baner w modalu lub nad formularzem, dane formularza zostają. |
| Success | Toast u dołu ekranu (5 s, z zamknięciem) z czasownikiem przycisku w formie dokonanej: „Opublikuj” → „Opublikowano”, „Przejmij” → „Przejęto zapytanie”. Po mutacji dane i liczniki menu są odświeżane. |

### 1.2 Mapowanie kodów błędów

| Kod | Zachowanie UI | Komunikat |
|---|---|---|
| 401 | Przekierowanie na S-01 z powrotem na bieżącą trasę po zalogowaniu | „Sesja wygasła. Zaloguj się ponownie.” |
| 403 | Agent na trasie biura: przekierowanie na A-01. Akcja niedozwolona: baner | „Nie masz dostępu do tego zasobu.” |
| 404 | Ekran „Nie znaleziono” z linkiem do listy nadrzędnej | „Zapytanie ZAP-2026-0142 nie istnieje albo nie masz do niego dostępu.” |
| 409 (wersja) | Baner nad formularzem lub w modalu, dane formularza zostają, przycisk „Wczytaj aktualną wersję” | „Ktoś zmienił ten rekord w międzyczasie. Wczytaj aktualną wersję i powtórz zmianę.” |
| 409 (reguła) | Baner z komunikatem domenowym z odpowiedzi | np. „Status zapytania zmienił się na Wycofana (agent). Odśwież kartę.” |
| 410 | Ekran nieaktualnego tokenu (S-02, S-04, K-01) | zależnie od ekranu |
| 422 | Błędy przypisane do pól (`field`, `code`), fokus na pierwszym błędnym polu | komunikaty z sekcji Walidacje |
| 5xx / sieć | Baner z „Spróbuj ponownie”, dane formularza zostają | „Nie udało się połączyć z serwerem. Spróbuj ponownie za chwilę.” |

### 1.3 Mutacje i formularze

- Przycisk mutacji w trakcie żądania jest nieaktywny i ma etykietę w formie trwającej: „Publikowanie…”, „Wysyłanie…”. Drugi klik nie wysyła żądania.
- Każda mutacja zasobu wersjonowanego wysyła `If-Match` z wersją z ostatniego odczytu. Wersja `0` jest poprawna.
- Walidacja pola przy opuszczeniu pola (blur) i całości przy wysłaniu. Po pierwszej próbie wysłania błędy pól są przeliczane na bieżąco.
- Ostrzeżenia (np. liczba uczestników poniżej minimum) są żółte, pod polem, nie blokują wysłania. Błędy są czerwone i blokują.
- Zamknięcie modalu lub wyjście z formularza ze zmianami: potwierdzenie „Masz niezapisane zmiany. Odrzucić je?” (Odrzuć zmiany / Wróć do edycji).

### 1.4 Formaty

| Dane | Format | Przykład |
|---|---|---|
| Kwota | separator tysięcy spacja, przecinek dziesiętny, „zł” | 23 140,00 zł |
| Kwota w zestawieniach | bez groszy, gdy całkowita | 1 157 zł |
| Data | DD.MM.RRRR | 13.05.2027 |
| Zakres dat | DD.MM–DD.MM.RRRR | 13–15.05.2027 |
| Data i godzina | DD.MM.RRRR, GG:MM | 02.11.2026, 14:05 |
| Wiek zapytania | względny | „3 dni temu”, „2 godz. temu” |
| Telefon | 9 cyfr PL, opcjonalny prefiks +48, zapis z grupami | +48 601 234 567 |
| NIP | 10 cyfr, suma kontrolna (wagi 6,5,7,2,3,4,5,6,7), zapis bez kresek | 7251234567 |
| E-mail | RFC 5322 uproszczony, zapis małymi literami | jan@kowalski-wycieczki.pl |
| Stawka prowizji | 0–30, krok 0,5, z „%” | 5% |
| Numer zapytania | `ZAP-RRRR-NNNN` | ZAP-2026-0142 |

### 1.5 Powiadomienia w portalu

- Licznik w menu z `GET /me/counters`, odpytywany co 60 s i po każdej mutacji.
- Badge nieprzeczytanych na wierszu zapytania (kropka + liczba). Otwarcie karty wywołuje `POST /inquiries/{id}/messages/read`.
- Zmiana statusu wykonana przez drugą stronę liczy się jako nieprzeczytane zdarzenie (wiersz pogrubiony do otwarcia karty).

## 2. Konto (wspólne)

### S-01 Logowanie

**Cel:** wejście agenta lub pracownika biura do portalu.

**Funkcje:** logowanie e-mailem i hasłem; przekierowanie według roli (AGENT → A-01, OFFICE → B-01) albo na trasę z parametru `?powrot=`; link „Nie pamiętam hasła” → S-03.

**Komponenty UI:** karta z logo, pola E-mail i Hasło (z przełącznikiem pokaż/ukryj), przycisk „Zaloguj się”, link do resetu, baner błędu.

**Stany**

| Stan | Zachowanie |
|---|---|
| Loading | Przycisk „Logowanie…”, pola nieaktywne. |
| Empty | Nie dotyczy (formularz). |
| Error | 401: „Nieprawidłowy e-mail lub hasło.” Konto `DEACTIVATED` (403): „Konto jest nieaktywne. Skontaktuj się z biurem.” Konto `INVITED`: „Konto nie jest jeszcze aktywne. Użyj linku z zaproszenia.” 5 nieudanych prób (429): „Zbyt wiele prób. Spróbuj za 15 minut.” |
| Success | Przekierowanie bez toastu. |

**Walidacje**

| Pole | Reguła | Komunikat |
|---|---|---|
| E-mail | wymagane, format | „Wpisz adres e-mail.” / „To nie jest poprawny adres e-mail.” |
| Hasło | wymagane | „Wpisz hasło.” |

**API:** `POST /auth/login` przy wysłaniu; `GET /auth/me` po sukcesie (rola, nazwa do powłoki).

### S-02 Aktywacja konta

**Cel:** agent ustawia hasło z linku zaproszenia i wchodzi do portalu (UC-A1 PG).

**Funkcje:** walidacja tokenu przy wejściu; powitanie z nazwą firmy agenta; ustawienie hasła; automatyczne zalogowanie i przejście na A-01.

**Komponenty UI:** karta „Witaj, Kowalski Wycieczki”, pola Hasło i Powtórz hasło, lista wymagań hasła odhaczana na bieżąco, przycisk „Aktywuj konto”.

**Stany**

| Stan | Zachowanie |
|---|---|
| Loading | Szkielet karty podczas `GET` tokenu; przycisk „Aktywowanie…”. |
| Empty | Nie dotyczy. |
| Error | 410 (wygasły lub unieważniony po ponownym zaproszeniu): karta bez formularza „Link aktywacyjny wygasł lub został zastąpiony nowym. Poproś biuro o ponowne zaproszenie.” z telefonem i e-mailem biura. Konto już aktywne: „Konto jest już aktywne.” + przycisk „Przejdź do logowania”. |
| Success | Przekierowanie na A-01, toast „Konto aktywowane”. |

**Walidacje**

| Pole | Reguła | Komunikat |
|---|---|---|
| Hasło | min. 10 znaków, litera i cyfra | „Hasło musi mieć co najmniej 10 znaków, w tym literę i cyfrę.” |
| Powtórz hasło | równe Hasło | „Hasła różnią się.” |

**API:** `GET /auth/activation/{token}` przy wejściu; `POST /auth/activation/{token}` przy wysłaniu.

### S-03 Reset hasła – prośba

**Cel:** wysłanie linku do ustawienia nowego hasła (UC-A1 PA2).

**Funkcje:** podanie e-maila; zawsze ten sam komunikat sukcesu (bez ujawniania, czy konto istnieje); powrót do S-01.

**Komponenty UI:** karta, pole E-mail, przycisk „Wyślij link”, link „Wróć do logowania”.

**Stany**

| Stan | Zachowanie |
|---|---|
| Loading | Przycisk „Wysyłanie…”. |
| Empty | Nie dotyczy. |
| Error | 5xx / sieć według 1.2; 429: „Link wysłano niedawno. Spróbuj ponownie za 5 minut.” |
| Success | Karta zastąpiona komunikatem „Jeśli konto o adresie jan@kowalski-wycieczki.pl istnieje, wysłaliśmy na nie link. Link jest ważny 60 minut.” |

**Walidacje**

| Pole | Reguła | Komunikat |
|---|---|---|
| E-mail | wymagane, format | „Wpisz adres e-mail.” / „To nie jest poprawny adres e-mail.” |

**API:** `POST /auth/password-reset`.

### S-04 Reset hasła – nowe hasło

**Cel:** ustawienie nowego hasła z linku.

**Funkcje:** walidacja tokenu; ustawienie hasła; przekierowanie na S-01 z toastem.

**Komponenty UI:** jak S-02, przycisk „Ustaw hasło”.

**Stany**

| Stan | Zachowanie |
|---|---|
| Loading | Szkielet karty; przycisk „Zapisywanie…”. |
| Empty | Nie dotyczy. |
| Error | 410: „Link wygasł lub został już użyty.” + przycisk „Wyślij nowy link” (→ S-03). Konto dezaktywowane: „Konto jest nieaktywne. Skontaktuj się z biurem.” |
| Success | S-01 z toastem „Hasło zmienione. Zaloguj się nowym hasłem.” |

**Walidacje:** jak S-02.

**API:** `GET /auth/password-reset/{token}` przy wejściu; `POST /auth/password-reset/{token}` przy wysłaniu.

## 3. Agent

### A-01 Panel agenta

**Cel:** jedno miejsce, z którego agent wie, co teraz zależy od niego, jak idzie sprzedaż i ile zarobi (UC-A9).

**Funkcje**
- **Wymaga akcji** – lista posortowana od najpilniejszej, każda pozycja otwiera A-06:

| Typ pozycji | Warunek | Etykieta |
|---|---|---|
| Wycena do wysłania | `QUOTE_READY` z aktywną wyceną | „Wycena v2 gotowa – wyślij klientowi” |
| Wycena wygasła | `QUOTE_READY`, `quoteExpired` | „Wycena wygasła 10.11.2026 – poproś o odświeżenie” |
| Wycena wygasa | aktywna wycena, ważność ≤ 3 dni | „Wycena wygasa za 2 dni (14.11.2026)” |
| Brak decyzji klienta | `SENT_TO_CLIENT` > 7 dni | „Wysłana 9 dni temu, brak decyzji klienta” |
| Wiadomość od biura | nieprzeczytana wiadomość | „Nowa wiadomość od biura” |
| Pytanie biura | wiadomość biura w `NEW`/`QUOTING` bez odpowiedzi agenta | „Biuro pyta o szczegóły” |
| Zmiana statusu przez biuro | odrzucenie, rezerwacja, anulowanie, realizacja (nieprzeczytane) | „Rezerwacja potwierdzona – umowa 2027/05/118” |

- **Lejek** – kolumny aktywnych statusów (`NEW`, `QUOTING`, `QUOTE_READY`, `SENT_TO_CLIENT`, `ACCEPTED`, `BOOKING_CONFIRMED`) z liczbą i sumą wartości (wartość aktywnej lub zaakceptowanej wyceny; dla `NEW`/`QUOTING` liczba bez kwoty). Klik → A-05 z filtrem statusu.
- **Wyniki sprzedaży** – selektor okresu (domyślnie bieżący rok szkolny 01.09.2026–31.08.2027; opcje: rok szkolny, poprzedni rok szkolny, własny zakres): liczba i wartość rezerwacji (`BOOKING_CONFIRMED` + `COMPLETED`), liczba uczestników, konwersja = rezerwacje / wszystkie zamknięte.
- **Prowizje** – 4 sumy (prognozowana, należna, wypłacona, anulowana) + 5 ostatnich pozycji; link „Wszystkie prowizje” → A-09.

**Komponenty UI:** nagłówek z imieniem i okresem; lista „Wymaga akcji” (pozycja: plakietka typu, numer zapytania, klient, oferta, termin, strzałka); lejek jako poziomy pasek kolumn (na telefonie przewijany poziomo); 3 kafle wyników; 4 kafle prowizji + mini tabela.

**Stany**

| Stan | Zachowanie |
|---|---|
| Loading | Każda sekcja ma własny szkielet i ładuje się niezależnie (błąd jednej nie blokuje pozostałych). |
| Empty | Wymaga akcji: „Nic na Ciebie nie czeka. Gdy biuro wyceni zapytanie albo napisze, zobaczysz to tutaj.” Lejek bez zapytań: „Nie masz jeszcze zapytań. Znajdź ofertę i złóż pierwsze zapytanie.” + „Przeglądaj oferty”. Wyniki: „Brak rezerwacji w tym okresie.” Prowizje: „Prowizje pojawią się po pierwszej akceptacji wyceny przez klienta.” |
| Error | Baner w sekcji: „Nie udało się wczytać listy Wymaga akcji.” + „Spróbuj ponownie”. |
| Success | Brak mutacji; zmiana okresu przeładowuje sekcję Wyniki. |

**Walidacje**

| Pole | Reguła | Komunikat |
|---|---|---|
| Własny zakres – od / do | od ≤ do, zakres ≤ 3 lata | „Data początkowa musi być wcześniejsza niż końcowa.” |

**API:** `GET /me/action-items`, `GET /me/funnel`, `GET /me/sales?from&to` (przy wejściu i zmianie okresu), `GET /me/commissions?from&to` (sumy i ostatnie pozycje), `GET /me/counters`.

### A-02 Oferty – wyszukiwarka

**Cel:** szybko znaleźć ofertę pasującą do klasy (UC-A2 PG 1–3).

**Funkcje:** filtry region/kierunek (wielokrotny wybór), liczba dni (zakres od–do, 1–14), etap edukacji (SP 1–3, SP 4–8, szkoła ponadpodstawowa), szukaj w tytule; filtry w URL (udostępnialne, przywracane przy powrocie); sortowanie: cena „od” rosnąco, długość, najnowsze; klik karty → A-03. Widoczne tylko oferty `PUBLISHED`.

**Komponenty UI:** pasek filtrów (na telefonie w szufladzie „Filtry (3)”), aktywne filtry jako usuwalne etykiety, licznik „12 ofert”, siatka kart (zdjęcie, tytuł „Kraków i Wieliczka”, region „Małopolska”, „3 dni”, „SP 4–8”, „od 980 zł / uczestnik”).

**Stany**

| Stan | Zachowanie |
|---|---|
| Loading | 6 szkieletów kart; przy zmianie filtrów pasek postępu, stare wyniki przygaszone. |
| Empty | Brak ofert w katalogu: „Biuro nie opublikowało jeszcze ofert.” Brak wyników filtrów (PA1): „Żadna oferta nie pasuje do filtrów Małopolska, 2–3 dni, SP 1–3.” + „Wyczyść filtry”. |
| Error | Baner „Nie udało się wczytać ofert.” + „Spróbuj ponownie”. |
| Success | Brak mutacji. |

**Walidacje**

| Pole | Reguła | Komunikat |
|---|---|---|
| Liczba dni | od ≤ do, 1–14 | „Wartość „od” nie może być większa niż „do”.” |

**API:** `GET /dictionaries` (regiony, etapy); `GET /offers?region&daysMin&daysMax&stage&q` przy wejściu i każdej zmianie filtrów (debounce 300 ms dla `q`).

### A-03 Karta oferty

**Cel:** pełna informacja o ofercie do rozmowy z klientem i start zapytania (UC-A2 PG 4–5, PA2).

**Funkcje:** galeria; parametry (region, liczba dni, etapy, sezon jako 12 miesięcy z zaznaczeniem, cena „od”, min. liczba uczestników); program dzień po dniu; świadczenia w cenie i dodatkowo płatne; „Pobierz PDF” (PA2); **prowizja agenta dla tej oferty** („Twoja prowizja: 5%” albo stawka oferty z dopiskiem „stawka specjalna oferty”); „Złóż zapytanie” → A-04; lista „Twoje zapytania do tej oferty” (jeśli są).

**Komponenty UI:** nagłówek ze zdjęciem i tytułem, kolumna boczna (na telefonie przyklejony dolny pasek) z ceną „od”, prowizją i przyciskiem „Złóż zapytanie”; oś programu dni; dwie listy świadczeń; pasek miesięcy sezonu.

**Stany**

| Stan | Zachowanie |
|---|---|
| Loading | Szkielet nagłówka, kolumny i 3 dni programu. |
| Empty | Brak PDF: przycisk ukryty. Brak zdjęć: tło z nazwą regionu. |
| Error | 404 lub oferta `WITHDRAWN`: „Ta oferta nie jest już dostępna w katalogu.” + „Wróć do ofert”. Pobranie PDF: toast błędu „Nie udało się pobrać PDF. Spróbuj ponownie.” |
| Success | Pobranie PDF uruchamia zapis pliku `krakow-i-wieliczka.pdf`. |

**Walidacje:** brak.

**API:** `GET /offers/{offerId}`; `GET /offers/{offerId}/pdf` przy kliknięciu; `GET /inquiries?offerId=` (własne zapytania do oferty).

### A-04 Nowe zapytanie

**Cel:** złożenie zapytania w minutę, z klientem z kartoteki (UC-A4, UC-A3 PA1).

**Funkcje**
- Podsumowanie oferty u góry (tytuł, dni, cena „od”, min. uczestników, sezon), bez możliwości zmiany oferty (zmiana = powrót do A-02).
- Klient: wyszukiwarka z kartoteki (imię, nazwisko, szkoła, miejscowość) albo „Dodaj nowego klienta” → M-A1; po zapisie klient wybrany automatycznie.
- Termin: tryb „konkretne daty” (wyjazd, powrót; powrót podpowiadany jako wyjazd + liczba dni oferty − 1) albo „przedział” (najwcześniej, najpóźniej; liczba dni z oferty).
- Grupa: liczba uczniów, liczba opiekunów, wiek lub klasa (tekst, np. „klasa 6b, 12–13 lat”), miejsce wyjazdu, uwagi (diety, niepełnosprawności, budżet).
- Ostrzeżenia na żywo (nie blokują): poniżej minimum, termin poza sezonem.
- „Zapisz szkic” (PA1) i „Wyślij zapytanie”. Szkic otwierany z A-05 przez `/agent/zapytania/{id}/edycja`.

**Komponenty UI:** karta podsumowania oferty, combobox klienta z pozycją „+ Dodaj nowego klienta”, przełącznik trybu terminu, pola dat, pola liczbowe ze stepperem, pole tekstowe uwag z licznikiem znaków, sekcja ostrzeżeń, dolny pasek akcji przyklejony na telefonie.

**Stany**

| Stan | Zachowanie |
|---|---|
| Loading | Szkielet podsumowania oferty i formularza; przyciski „Zapisywanie…” / „Wysyłanie…”. |
| Empty | Kartoteka pusta: combobox pokazuje „Nie masz jeszcze klientów” + „Dodaj nowego klienta”. |
| Error | W1 – oferta wycofana (409 `OFFER_WITHDRAWN`): baner „Oferta Kraków i Wieliczka została wycofana z katalogu. Nie można złożyć do niej zapytania. Szkic zachowano.” przycisk „Wyślij” nieaktywny. 422: błędy pól. Inne według 1.2. |
| Success | Wysłanie: przejście na A-06 z toastem „Wysłano zapytanie ZAP-2026-0142” i statusem Nowe. Szkic: toast „Zapisano szkic”, pozostanie na formularzu (adres zmienia się na `/edycja`). |

**Walidacje**

| Pole | Reguła | Typ | Komunikat |
|---|---|---|---|
| Klient | wymagany | błąd | „Wybierz klienta albo dodaj nowego.” |
| Data wyjazdu / najwcześniej | wymagana, ≥ jutro | błąd | „Data wyjazdu musi być w przyszłości.” |
| Data powrotu / najpóźniej | wymagana, ≥ data wyjazdu | błąd | „Data powrotu nie może być wcześniejsza niż wyjazdu.” |
| Długość terminu | konkretne daty: różna od liczby dni oferty | ostrzeżenie | „Oferta trwa 3 dni, wybrany termin ma 4 dni. Biuro uwzględni to w wycenie.” |
| Termin | miesiąc poza sezonem oferty | ostrzeżenie | „Termin wypada poza sezonem oferty (kwiecień–czerwiec, wrzesień–październik). Biuro może nie mieć dostępności.” |
| Liczba uczniów | wymagana, liczba całkowita 1–200 | błąd | „Podaj liczbę uczniów (1–200).” |
| Liczba uczniów | < minimum oferty | ostrzeżenie | „Oferta wymaga min. 25 uczestników. Cena za osobę może być wyższa.” |
| Liczba opiekunów | wymagana, 0–30 | błąd | „Podaj liczbę opiekunów (0–30).” |
| Wiek lub klasa | wymagane, ≤ 60 znaków | błąd | „Podaj wiek lub klasę uczniów.” |
| Miejsce wyjazdu | wymagane, ≤ 80 znaków | błąd | „Podaj miejsce wyjazdu.” |
| Uwagi | ≤ 2000 znaków | błąd | „Uwagi mogą mieć najwyżej 2000 znaków.” |
| Szkic | tylko oferta i klient wymagane | — | — |

**API:** `GET /offers/{offerId}` (podsumowanie i sezon); `GET /clients?q` (combobox); `POST /inquiries` z `submit: false` (pierwszy zapis szkicu) lub `submit: true` (bezpośrednie wysłanie); `PATCH /inquiries/{inquiryId}` + `POST /inquiries/{inquiryId}/submit` dla istniejącego szkicu; `GET /inquiries/{inquiryId}` przy edycji szkicu.

### A-05 Moje zapytania

**Cel:** lista wszystkich zapytań agenta z filtrami (UC-A9 PA).

**Funkcje:** filtry status (wielokrotny, z presetami „Aktywne”, „Zamknięte”, „Szkice”), klient, oferta, termin wyjazdu (od–do); sortowanie: ostatnia zmiana (domyślnie), termin wyjazdu, wartość; filtry w URL (wejście z lejka A-01); badge nieprzeczytanych; klik wiersza → A-06 (szkic → A-04 edycja); „Nowe zapytanie” → A-02.

**Komponenty UI:** pasek filtrów, tabela (desktop) / lista kart (telefon): numer, klient + szkoła, oferta, termin, uczestnicy, status (etykieta), wartość aktywnej wyceny, „kto ma ruch”, badge; paginacja 25 wierszy.

**Stany**

| Stan | Zachowanie |
|---|---|
| Loading | 8 szkieletów wierszy. |
| Empty | Brak zapytań: „Nie masz jeszcze zapytań. Znajdź ofertę dla swojego klienta i złóż pierwsze zapytanie.” + „Przeglądaj oferty”. Brak wyników filtrów: „Brak zapytań w statusie Wysłana do klienta dla klienta Anna Nowak.” + „Wyczyść filtry”. |
| Error | Baner „Nie udało się wczytać zapytań.” + „Spróbuj ponownie”. |
| Success | Brak mutacji. |

**Walidacje:** termin od ≤ do: „Data początkowa musi być wcześniejsza niż końcowa.”

**API:** `GET /inquiries?status&clientId&offerId&departureFrom&departureTo&sort`; `GET /clients?q` i `GET /offers?q` (podpowiedzi filtrów).

### A-06 Karta zapytania (agent)

**Cel:** pełny obraz zapytania i wszystkie decyzje agenta: wysłanie wyceny, negocjacja, decyzja klienta, wycofanie (UC-A5–A8, UC-S1).

**Funkcje**
- Nagłówek: numer, status, „kto ma ruch” („Czeka na Ciebie: wyślij wycenę klientowi”), klient (link → A-08), oferta z migawki (link → A-03, z dopiskiem „oferta wycofana z katalogu”, jeśli dotyczy).
- **Wycena aktywna** jako karta: wersja (v2), termin 13–15.05.2027, cena za uczestnika 890 zł, płatni uczestnicy 26, opiekunowie gratis 2, wartość 23 140,00 zł, ważna do 26.11.2026 (z odliczaniem „jeszcze 5 dni”), świadczenia w cenie i opcjonalne, uwagi dla klienta, **prognozowana prowizja 1 157,00 zł (5%)**.
- Historia wersji wycen (zwinięta): v1 980 zł – Zastąpiona; v2 890 zł – Aktywna.
- Akcje według macierzy poniżej.
- Wątek wiadomości z załącznikami (UC-A7 PA1, PA2), oznaczenie autora (agent / imię pracownika biura), wpisy systemowe o zmianie statusu w wątku jako szare linie.
- Historia statusów (kto, kiedy, kanał, komentarz) – zakładka.
- Dane grupy: termin preferowany, uczniowie, opiekunowie, wiek, miejsce wyjazdu, uwagi.
- Po potwierdzeniu: numer umowy; po realizacji: wartość końcowa 24 030,00 zł, uczestnicy 27, prowizja należna 1 201,50 zł, status wypłaty.
- Powody zamknięcia (odrzucenie przez biuro, klienta, anulowanie) wyświetlane w banerze statusu.

**Macierz akcji agenta**

| Status | Wyślij klientowi (M-A2) | Kopiuj link (M-A2) | Poproś o zmianę (M-A3) | Klient zaakceptował / odrzucił (M-A4) | Wycofaj (M-A5) | Wiadomość |
|---|---|---|---|---|---|---|
| `NEW` | – | – | – | – | tak | tak |
| `QUOTING` | – | – | – | – | tak | tak |
| `QUOTE_READY` (aktywna wycena) | **główna** | – | tak | – | tak | tak |
| `QUOTE_READY` (`quoteExpired`) | – | – | **główna** („Poproś o odświeżenie wyceny”) | – | tak | tak |
| `SENT_TO_CLIENT` | – | tak | tak | **główna** (dwa przyciski) | tak | tak |
| `ACCEPTED` | – | – | – | – | tak (ostrzeżenie: „prognozowana prowizja zostanie anulowana”) | tak |
| `BOOKING_CONFIRMED` | – | – | – | – | – (podpowiedź: „Aby anulować, napisz do biura”) | tak |
| `COMPLETED`, `CANCELLED`, `REJECTED_*`, `WITHDRAWN_BY_AGENT` | – | – | – | – | – | – (wątek tylko do odczytu) |

**Wygasła wycena (UC-S1):** w `QUOTE_READY` bez aktywnej wyceny karta wyceny jest zastąpiona banerem z czerwonym marginesem „Wycena v2 wygasła 26.11.2026. Link przestał działać. Poproś biuro o odświeżenie albo poczekaj na nową wersję.”; etykieta statusu ma plakietkę „wycena wygasła”; ostatnia wersja widoczna w historii jako „Wygasła”. Ostrzeżenie ≤ 3 dni: żółty pasek nad kartą wyceny „Wycena wygasa za 2 dni”.

**Nieprzeczytane:** nowe wiadomości od ostatniego otwarcia oznaczone linią „Nowe” w wątku; zakładka „Wiadomości (2)”; po otwarciu karty badge znika z listy i licznika menu.

**Komponenty UI:** nagłówek z etykietą statusu i ścieżką postępu statusów, karta wyceny (z odcinkiem pokazującym wersję, ważność i prowizję), pasek akcji (na telefonie przyklejony dół, akcja główna + menu „Więcej”), zakładki Wiadomości / Historia / Dane grupy, kompozytor wiadomości z dodawaniem plików, modale M-A2–M-A5.

**Stany**

| Stan | Zachowanie |
|---|---|
| Loading | Szkielet nagłówka, karty wyceny i 3 wiadomości; wątek i historia ładują się osobno. |
| Empty | Brak wyceny (`NEW`, `QUOTING`): miejsce karty wyceny z tekstem „Biuro przygotowuje wycenę. Możesz dopisać szczegóły w wiadomości.” Brak wiadomości: „Napisz do biura, jeśli klient ma dodatkowe wymagania.” |
| Error | 404 według 1.2. 409 przy akcji (status zmieniony przez biuro): baner „Status zapytania zmienił się w międzyczasie na W wycenie. Odśwież kartę.” + „Odśwież”. Wysłanie wiadomości: wiadomość zostaje w kompozytorze z „Nie wysłano. Spróbuj ponownie.” |
| Success | Toasty: „Wysłano wycenę klientowi” (+ M-A2 z linkiem), „Skopiowano link”, „Wysłano prośbę o zmianę”, „Odnotowano akceptację klienta”, „Odnotowano odrzucenie przez klienta”, „Wycofano zapytanie”, „Wysłano wiadomość”. |

**Walidacje**

| Pole | Reguła | Komunikat |
|---|---|---|
| Wiadomość | treść albo załącznik; ≤ 4000 znaków | „Wpisz treść albo dodaj plik.” |
| Załącznik | PDF, JPG, PNG, XLSX, DOCX; ≤ 10 MB; ≤ 5 plików | „Plik lista-6b.xlsx jest większy niż 10 MB.” / „Nieobsługiwany typ pliku.” |

**API:** `GET /inquiries/{inquiryId}`; `GET /inquiries/{inquiryId}/quotes`; `GET /inquiries/{inquiryId}/messages`; `POST /inquiries/{inquiryId}/messages/read` (po wczytaniu wątku); `GET /inquiries/{inquiryId}/history` (przy otwarciu zakładki); `POST /inquiries/{inquiryId}/messages`; akcje w modalach.

### A-07 Klienci

**Cel:** kartoteka klientów agenta (UC-A3 PG).

**Funkcje:** wyszukiwanie (imię, nazwisko, szkoła, miejscowość, telefon, e-mail); „Dodaj klienta” → M-A1; klik wiersza → A-08; kolumna z liczbą zapytań i statusem ostatniego.

**Komponenty UI:** pole wyszukiwania, tabela / karty: imię i nazwisko, szkoła, miejscowość, telefon, e-mail, zapytania (np. „3, ostatnie: Wysłana do klienta”).

**Stany**

| Stan | Zachowanie |
|---|---|
| Loading | 8 szkieletów wierszy. |
| Empty | „Twoja kartoteka jest pusta. Dodaj klienta, żeby przy zapytaniu nie wpisywać jego danych od nowa.” + „Dodaj klienta”. Brak wyników: „Nie znaleziono klienta „Nowak”.” + „Dodaj klienta Nowak” (otwiera M-A1 z nazwiskiem). |
| Error | Baner „Nie udało się wczytać klientów.” + „Spróbuj ponownie”. |
| Success | Po zapisie w M-A1: toast „Dodano klienta Anna Nowak”, wiersz na górze listy. |

**Walidacje:** brak.

**API:** `GET /clients?q` (debounce 300 ms).

### A-08 Karta klienta

**Cel:** dane klienta i historia współpracy (UC-A3 PA2, PA3).

**Funkcje:** dane kontaktowe z linkami `tel:` i `mailto:`; notatka; „Edytuj” → M-A1; „Usuń klienta” (aktywne tylko bez zapytań); lista zapytań klienta ze statusami (klik → A-06); „Nowe zapytanie dla klienta” → A-02 z zapamiętanym klientem (preselekcja w A-04).

**Komponenty UI:** nagłówek z imieniem i szkołą, karta kontaktu, notatka, tabela zapytań (numer, oferta, termin, status, wartość), dialog potwierdzenia usunięcia.

**Stany**

| Stan | Zachowanie |
|---|---|
| Loading | Szkielet karty kontaktu i 3 wierszy zapytań. |
| Empty | Brak zapytań: „Anna Nowak nie ma jeszcze zapytań.” + „Nowe zapytanie dla klienta”. |
| Error | 404 według 1.2. Usuwanie 409 `CLIENT_HAS_INQUIRIES`: „Nie można usunąć klienta, który ma zapytania.” |
| Success | Usunięcie: powrót na A-07, toast „Usunięto klienta Anna Nowak”. Edycja: toast „Zapisano zmiany”. |

**Walidacje:** przycisk „Usuń klienta” nieaktywny z podpowiedzią „Klienta z zapytaniami nie można usunąć”, gdy liczba zapytań > 0.

**API:** `GET /clients/{clientId}`; `GET /inquiries?clientId=`; `DELETE /clients/{clientId}` (z `If-Match`).

### A-09 Prowizje (agent)

**Cel:** przejrzyste rozliczenie prowizji (UC-A9 sekcja 4).

**Funkcje:** 4 sumy (prognozowana, należna, wypłacona, anulowana) dla okresu; filtr statusu i okresu (domyślnie rok szkolny); lista pozycji: zapytanie (link → A-06), klient, wartość (wyceny lub końcowa), stawka, kwota, status, data wypłaty; objaśnienie „Prognozowana = wartość zaakceptowanej wyceny × stawka. Należna = wartość końcowa × stawka. Fakturę wystawiasz poza portalem.”

**Komponenty UI:** 4 kafle sum (klik filtruje listę), filtry, tabela / karty pozycji, etykiety statusu prowizji.

**Stany**

| Stan | Zachowanie |
|---|---|
| Loading | Szkielety kafli i 6 wierszy. |
| Empty | „Nie masz jeszcze prowizji. Prowizja prognozowana pojawi się, gdy klient zaakceptuje wycenę.” Brak wyników filtrów: „Brak prowizji wypłaconych w tym okresie.” + „Wyczyść filtry”. |
| Error | Baner „Nie udało się wczytać prowizji.” + „Spróbuj ponownie”. |
| Success | Brak mutacji. Przykład pozycji: ZAP-2026-0142, Anna Nowak, 24 030,00 zł, 5%, 1 201,50 zł, wypłacona, 15.06.2027. |

**Walidacje:** okres od ≤ do.

**API:** `GET /me/commissions?status&from&to`.

### M-A1 Modal: klient (dodaj / edytuj)

**Cel:** dodanie lub edycja klienta bez opuszczania bieżącego ekranu (UC-A3 PG, PA1, PA3).

**Funkcje:** formularz; zapis; w kontekście A-04 po zapisie klient wybierany w formularzu zapytania.

**Komponenty UI:** modal (na telefonie pełny ekran), pola Imię, Nazwisko, Telefon, E-mail, Szkoła, Miejscowość, Notatka; dopisek „Podaj telefon albo e-mail”; przyciski „Dodaj klienta” / „Zapisz zmiany” i „Anuluj”.

**Stany**

| Stan | Zachowanie |
|---|---|
| Loading | Edycja: szkielet pól. Zapis: „Zapisywanie…”. |
| Empty | Nie dotyczy. |
| Error | 422 przy polach; 409 wersji według 1.2. |
| Success | Zamknięcie modalu, toast „Dodano klienta Anna Nowak” / „Zapisano zmiany”. |

**Walidacje**

| Pole | Reguła | Komunikat |
|---|---|---|
| Imię, Nazwisko | wymagane, ≤ 60 znaków | „Wpisz imię.” / „Wpisz nazwisko.” |
| Telefon, E-mail | co najmniej jedno (W1) | „Podaj telefon albo e-mail, żeby był kontakt z klientem.” (przy obu polach) |
| Telefon | format PL | „Wpisz 9 cyfr numeru, np. 601 234 567.” |
| E-mail | format | „To nie jest poprawny adres e-mail.” |
| Szkoła | ≤ 120 znaków | „Nazwa szkoły może mieć najwyżej 120 znaków.” |
| Notatka | ≤ 1000 znaków | „Notatka może mieć najwyżej 1000 znaków.” |

**API:** `POST /clients`; `PATCH /clients/{clientId}` (z `If-Match`); `GET /clients/{clientId}` (edycja).

### M-A2 Modal: link do wyceny

**Cel:** wysłanie wyceny klientowi i skopiowanie linku (UC-A6).

**Funkcje:** w `QUOTE_READY`: podsumowanie (wersja, wartość, ważność) i „Wyślij klientowi”, co generuje link i zmienia status na `SENT_TO_CLIENT`; następnie pole z linkiem, „Kopiuj”, gotowa treść SMS do skopiowania („Dzień dobry, przesyłam wycenę wycieczki Kraków i Wieliczka: {link}. Wycena ważna do 26.11.2026. Jan Kowalski”); „Podgląd strony klienta” (nowa karta K-01). W `SENT_TO_CLIENT`: tylko link i „Kopiuj” (PA2).

**Komponenty UI:** modal, podsumowanie wyceny, pole tylko do odczytu z linkiem, przyciski „Kopiuj link”, „Kopiuj treść SMS”, „Otwórz podgląd”.

**Stany**

| Stan | Zachowanie |
|---|---|
| Loading | „Wysyłanie…” podczas generowania; szkielet pola linku przy ponownym otwarciu. |
| Empty | Nie dotyczy. |
| Error | 409 (wycena wygasła lub zastąpiona w międzyczasie): „Wycena v2 nie jest już aktywna. Odśwież kartę zapytania.” Brak dostępu do schowka: link zaznaczony z podpowiedzią „Skopiuj ręcznie (Ctrl+C)”. |
| Success | Toast „Wysłano wycenę klientowi”, przycisk „Kopiuj” zmienia się na „Skopiowano” na 2 s. |

**Walidacje:** brak.

**API:** `POST /inquiries/{inquiryId}/quotes/active/send`; `GET /inquiries/{inquiryId}/quotes/active/link` (ponowne otwarcie).

### M-A3 Modal: prośba o zmianę

**Cel:** negocjacja z biurem (UC-A7 PG) i prośba o odświeżenie wygasłej wyceny (UC-S1).

**Funkcje:** opis oczekiwań; szybkie podpowiedzi („Inny termin”, „Inna liczba uczestników”, „Tańszy wariant”, „Odśwież wygasłą wycenę”) wstawiające początek tekstu; ostrzeżenie o skutku; „Wyślij prośbę”.

**Komponenty UI:** modal, etykiety-podpowiedzi, pole tekstowe, baner skutku „Aktywna wycena v2 zostanie unieważniona, a link wysłany klientowi przestanie działać.” (tylko gdy jest aktywna wycena).

**Stany**

| Stan | Zachowanie |
|---|---|
| Loading | „Wysyłanie…”. |
| Empty | Nie dotyczy. |
| Error | 409 statusu według A-06; inne według 1.2. |
| Success | Toast „Wysłano prośbę o zmianę”; status W wycenie; treść w wątku. |

**Walidacje**

| Pole | Reguła | Komunikat |
|---|---|---|
| Opis | wymagany, 10–2000 znaków | „Opisz, co ma się zmienić w wycenie (min. 10 znaków).” |

**API:** `POST /inquiries/{inquiryId}/change-requests`.

### M-A4 Modal: decyzja klienta (ręcznie)

**Cel:** odnotowanie decyzji klienta przekazanej poza linkiem (UC-A8).

**Funkcje:** otwierany z „Klient zaakceptował” albo „Klient odrzucił”; podsumowanie wyceny; adnotacja; przy akceptacji informacja „Prognozowana prowizja: 1 157,00 zł (5%). Stawka zostanie zamrożona.”; przy odrzuceniu wybór powodu (cena, termin, wybrano inną ofertę, rezygnacja z wyjazdu, inny).

**Komponenty UI:** modal z nagłówkiem zależnym od decyzji, podsumowanie, lista powodów (odrzucenie), pole adnotacji, przycisk „Odnotuj akceptację” / „Odnotuj odrzucenie”.

**Stany**

| Stan | Zachowanie |
|---|---|
| Loading | „Zapisywanie…”. |
| Empty | Nie dotyczy. |
| Error | 409 `DECISION_ALREADY_MADE` (klient zdążył kliknąć w linku): „Klient podjął już decyzję przez link: zaakceptował 02.11.2026, 14:05.” + „Odśwież”. 409 wygaśnięcia: „Wycena wygasła. Poproś biuro o odświeżenie.” |
| Success | Toast „Odnotowano akceptację klienta” / „Odnotowano odrzucenie przez klienta”; historia pokazuje kanał „agent” i adnotację. |

**Walidacje**

| Pole | Reguła | Komunikat |
|---|---|---|
| Adnotacja | wymagana, 3–500 znaków | „Napisz, jak klient przekazał decyzję, np. telefonicznie 12.11.” |
| Powód (odrzucenie) | wymagany | „Wybierz powód odrzucenia.” |

**API:** `POST /inquiries/{inquiryId}/client-decision` (`decision: ACCEPT | REJECT`, `note`, `reasonCode`).

### M-A5 Modal: wycofanie zapytania

**Cel:** zamknięcie zapytania przez agenta (UC-A5).

**Funkcje:** powód z listy (klient zrezygnował, klient wybrał inne biuro, zmiana terminu poza ofertą, inny) i opis; skutki: unieważnienie aktywnej wyceny i linku, w `ACCEPTED` anulowanie prognozowanej prowizji; przycisk destrukcyjny „Wycofaj zapytanie”.

**Komponenty UI:** modal, lista powodów, pole tekstowe, baner skutków, przycisk w kolorze ostrzegawczym.

**Stany**

| Stan | Zachowanie |
|---|---|
| Loading | „Wycofywanie…”. |
| Empty | Nie dotyczy. |
| Error | 409 W1 (biuro potwierdziło rezerwację w międzyczasie): „Rezerwacja została już potwierdzona. Aby ją anulować, napisz do biura.” |
| Success | Toast „Wycofano zapytanie”; status Wycofana (agent); akcje znikają. |

**Walidacje**

| Pole | Reguła | Komunikat |
|---|---|---|
| Powód | wymagany | „Wybierz powód.” |
| Opis | wymagany dla „inny”, ≤ 1000 znaków | „Opisz powód wycofania.” |

**API:** `POST /inquiries/{inquiryId}/withdraw` (`reasonCode`, `reasonText`).

## 4. Biuro

### B-01 Kolejka zapytań

**Cel:** wspólna kolejka, w której nic nie leży (UC-B3 PG 1).

**Funkcje:** zakładki-presety z licznikami: „Nowe” (domyślna), „W wycenie”, „Czeka na agenta/klienta” (`QUOTE_READY`, `SENT_TO_CLIENT`), „Zaakceptowane”, „Rezerwacje”, „Wszystkie”; filtry status, agent, oferta, termin wyjazdu (od–do), „tylko moje” (obsługujący); domyślne sortowanie od najstarszych w statusie Nowe; kolumna wieku w bieżącym statusie z wyróżnieniem > 2 dni robocze; badge nieprzeczytanych od agenta; wejście z B-11 z filtrem `agentId`; klik → B-02.

**Komponenty UI:** zakładki z licznikami, pasek filtrów, gęsta tabela: numer, wiek w statusie („3 dni”, czerwony margines > 2 dni), status, agent, klient + szkoła, oferta, termin, uczestnicy, wartość, obsługujący (inicjały), badge; paginacja 50.

**Stany**

| Stan | Zachowanie |
|---|---|
| Loading | 10 szkieletów wierszy; liczniki zakładek jako szare plakietki. |
| Empty | Zakładka Nowe: „Wszystkie nowe zapytania są przejęte.” Brak wyników filtrów: „Brak zapytań agenta Jan Kowalski w statusie Zaakceptowana.” + „Wyczyść filtry”. |
| Error | Baner „Nie udało się wczytać kolejki.” + „Spróbuj ponownie”. |
| Success | Brak mutacji. |

**Walidacje:** termin od ≤ do.

**API:** `GET /inquiries?status&agentId&offerId&departureFrom&departureTo&sort`; `GET /agents?status` i `GET /offers?q` (filtry); `GET /me/counters` (liczniki zakładek i menu).

### B-02 Karta zapytania (biuro)

**Cel:** prowadzenie zapytania od przejęcia do realizacji (UC-B3, UC-B5–B7, UC-A7 PA1).

**Funkcje**
- Nagłówek: numer, status, wiek w statusie, obsługujący („Obsługuje: Marta Zielińska” lub „Nieprzejęte”), agent (link → B-09) ze stawką, klient z danymi kontaktowymi.
- Migawka oferty z chwili złożenia (tytuł, dni, cena „od”, min. uczestników, sezon, świadczenia) z dopiskiem „Oferta zmieniła się od złożenia zapytania – zobacz aktualną” (link → B-06), gdy wersja inna.
- Dane grupy z ostrzeżeniami z A-04 (poniżej minimum, poza sezonem) jako żółte plakietki.
- Wyceny: aktywna jak w A-06 (bez sformułowania „Twoja prowizja”; zamiast tego „Prowizja agenta: 1 157,00 zł (5%, stawka agenta)”); historia wersji.
- Akcje według macierzy; wątek, historia, dane rezerwacji (numer umowy), dane realizacji.

**Macierz akcji biura**

| Status | Przejmij | Wystaw wycenę (B-03) | Odrzuć (M-B1) | Potwierdź rezerwację (M-B2) | Zmiana warunków (M-B5) | Oznacz realizację (M-B3) | Anuluj (M-B4) | Wiadomość |
|---|---|---|---|---|---|---|---|---|
| `NEW` | **główna** | – | tak | – | – | – | – | tak (pytanie do agenta, PA2) |
| `QUOTING` | tak, gdy obsługuje ktoś inny („Przejmij od Marty Z.”) | **główna** („Wystaw wycenę v{N}”) | tak | – | – | – | – | tak |
| `QUOTE_READY` (aktywna) | – | – | – | – | – | – | – | tak |
| `QUOTE_READY` (`quoteExpired`) | – | **główna** („Wystaw nową wersję”) | tak („Zamknij zapytanie”) | – | – | – | – | tak |
| `SENT_TO_CLIENT` | – | – | – | – | – | – | – | tak |
| `ACCEPTED` | – | – | tak (brak dostępności) | **główna** | tak | – | – | tak |
| `BOOKING_CONFIRMED` (przed powrotem) | – | – | – | – | – | nieaktywna („Dostępne po 15.05.2027”) | tak | tak |
| `BOOKING_CONFIRMED` (po powrocie) | – | – | – | – | – | **główna** | tak | tak |
| `COMPLETED` | – | – | – | – | – | – | – | – (wątek tylko do odczytu); pokazuje status prowizji |
| `CANCELLED`, `REJECTED_*`, `WITHDRAWN_BY_AGENT` | – | – | – | – | – | – | – | – |

**Wygasła wycena:** baner „Wycena v2 wygasła 26.11.2026. Wystaw nową wersję albo zamknij zapytanie.”; w kolejce plakietka „wycena wygasła”.

**Nieprzeczytane:** linia „Nowe” w wątku; prośba o zmianę od agenta wyróżniona w wątku jako wpis „Prośba o zmianę” z treścią; po otwarciu `messages/read`.

**Komponenty UI:** układ dwukolumnowy (lewa: nagłówek, wycena, wątek; prawa: agent, klient, migawka oferty, dane grupy), pasek akcji w nagłówku (główna + „Więcej”), panel boczny B-03, modale M-B1–M-B5, zakładki Wiadomości / Historia.

**Stany**

| Stan | Zachowanie |
|---|---|
| Loading | Szkielety obu kolumn; wątek osobno. |
| Empty | Brak wyceny w `NEW`: „Przejmij zapytanie, żeby przygotować wycenę.” W `QUOTING`: „Brak wyceny. Wystaw wycenę v1.” Brak wiadomości: „Zadaj agentowi pytanie, jeśli brakuje danych do wyceny.” |
| Error | 409 statusu (np. agent wycofał w międzyczasie): „Agent wycofał zapytanie 02.11.2026, 14:05. Odśwież kartę.” + „Odśwież”. Inne według 1.2. |
| Success | Toasty: „Przejęto zapytanie”, „Wystawiono wycenę v2”, „Odrzucono zapytanie”, „Potwierdzono rezerwację”, „Przywrócono do wyceny”, „Oznaczono jako zrealizowane”, „Anulowano rezerwację”, „Wysłano wiadomość”. |

**Walidacje:** wiadomość jak A-06.

**API:** `GET /inquiries/{inquiryId}`; `GET /inquiries/{inquiryId}/quotes`; `GET /inquiries/{inquiryId}/messages`; `POST /inquiries/{inquiryId}/messages/read`; `GET /inquiries/{inquiryId}/history`; `POST /inquiries/{inquiryId}/take-over` (Przejmij); `POST /inquiries/{inquiryId}/messages`; akcje modali.

### B-03 Formularz wyceny (panel boczny)

**Cel:** wystawienie wyceny i kolejnych wersji (UC-B4).

**Funkcje**
- Nagłówek „Wycena v2 dla ZAP-2026-0142”, obok zwinięta poprzednia wersja do porównania (v1: 980 zł × 26).
- Pola: termin (wyjazd, powrót; domyślnie z zapytania), cena za uczestnika, płatni uczestnicy (domyślnie liczba uczniów), bezpłatni opiekunowie (domyślnie liczba opiekunów), świadczenia w cenie (lista z oferty, edytowalna: dodaj / usuń / zmień tekst), świadczenia opcjonalne (nazwa + cena za osobę), data ważności (domyślnie dziś + 14 dni), uwagi dla klienta.
- Obliczenia na żywo: **wartość = cena × płatni uczestnicy** (890 × 26 = 23 140,00 zł); **prognozowana prowizja** = wartość × stawka (oferty, a gdy brak – agenta) = 1 157,00 zł (5%, stawka agenta).
- „Podgląd strony klienta” (K-01 w trybie podglądu, bez przycisków decyzji).
- „Wystaw wycenę” z potwierdzeniem przy wersji > 1: „Wersja v1 zostanie oznaczona jako Zastąpiona.”

**Komponenty UI:** panel boczny 560 px (telefon: pełny ekran), pola dat, pola kwot z „zł”, edytowalne listy świadczeń, kalkulator wartości i prowizji przyklejony u dołu panelu, przyciski „Wystaw wycenę”, „Podgląd”, „Anuluj”.

**Stany**

| Stan | Zachowanie |
|---|---|
| Loading | Szkielet pól podczas wczytywania domyślnych świadczeń; „Wystawianie…”. |
| Empty | Świadczenia w cenie puste: „Dodaj co najmniej jedno świadczenie, żeby klient wiedział, co obejmuje cena.” |
| Error | 409 (agent wycofał zapytanie lub status nie jest `QUOTING` / wygasłe `QUOTE_READY`): „Nie można wystawić wyceny: zapytanie ma status Wycofana (agent).” Dane panelu zostają. |
| Success | Zamknięcie panelu, toast „Wystawiono wycenę v2”, status Wycena gotowa, poprzednia wersja Zastąpiona. |

**Walidacje**

| Pole | Reguła | Komunikat |
|---|---|---|
| Wyjazd, powrót | wymagane, powrót ≥ wyjazd, wyjazd ≥ jutro | „Data powrotu nie może być wcześniejsza niż wyjazdu.” |
| Cena za uczestnika | wymagana, > 0, ≤ 20 000, 2 miejsca po przecinku (W1) | „Podaj cenę za uczestnika.” |
| Płatni uczestnicy | wymagane, 1–250 | „Podaj liczbę płatnych uczestników.” |
| Płatni uczestnicy | < min. oferty | ostrzeżenie: „Poniżej minimum oferty (25).” |
| Bezpłatni opiekunowie | 0–30 | „Podaj liczbę od 0 do 30.” |
| Świadczenia w cenie | ≥ 1 pozycja, każda ≤ 200 znaków | „Dodaj co najmniej jedno świadczenie.” |
| Świadczenie opcjonalne | nazwa wymagana, cena > 0 | „Podaj nazwę i cenę świadczenia.” |
| Data ważności | wymagana, ≥ dziś (W1), ≤ data wyjazdu | „Data ważności nie może być w przeszłości.” / „Wycena nie może być ważna dłużej niż do dnia wyjazdu.” |
| Uwagi dla klienta | ≤ 2000 znaków | „Uwagi mogą mieć najwyżej 2000 znaków.” |

**API:** `GET /inquiries/{inquiryId}/quotes` (poprzednia wersja do porównania); `POST /inquiries/{inquiryId}/quotes`.

### B-04 Do rozliczenia

**Cel:** lista rezerwacji po dacie powrotu do oznaczenia realizacji (UC-B6 PG 1).

**Funkcje:** lista `BOOKING_CONFIRMED` z datą powrotu < dziś, sortowana od najstarszego powrotu; filtr agent; „Oznacz jako zrealizowaną” w wierszu → M-B3; klik numeru → B-02.

**Komponenty UI:** tabela: numer, agent, klient, oferta, powrót („15.05.2027, 12 dni temu”), uczestnicy z wyceny, wartość wyceny, numer umowy, akcja.

**Stany**

| Stan | Zachowanie |
|---|---|
| Loading | 6 szkieletów wierszy. |
| Empty | „Wszystkie zakończone wyjazdy są rozliczone.” |
| Error | Baner „Nie udało się wczytać listy.” + „Spróbuj ponownie”. |
| Success | Po M-B3 wiersz znika, toast „Oznaczono jako zrealizowane”. |

**Walidacje:** brak.

**API:** `GET /inquiries/settlement-due?agentId`.

### B-05 Oferty (lista)

**Cel:** zarządzanie katalogiem (UC-B2 PA2–PA4).

**Funkcje:** zakładki statusu (Opublikowane, Szkice, Wycofane, Wszystkie); szukaj; „Nowa oferta” → B-06; w wierszu menu: Edytuj, Podgląd (B-07), Opublikuj (szkic, wycofana – PA3), Wycofaj (opublikowana – PA2, z potwierdzeniem „Oferta zniknie z wyszukiwarki agentów. Otwarte zapytania (3) toczą się dalej.”), Kopiuj jako szkic (PA4).

**Komponenty UI:** zakładki z licznikami, tabela: miniatura, tytuł, region, dni, etapy, cena „od”, stawka oferty (lub „stawka agenta”), status, liczba otwartych zapytań, ostatnia zmiana; menu wiersza; dialog potwierdzenia wycofania.

**Stany**

| Stan | Zachowanie |
|---|---|
| Loading | 8 szkieletów wierszy. |
| Empty | Katalog pusty: „Katalog jest pusty. Utwórz pierwszą ofertę i opublikuj ją dla agentów.” + „Nowa oferta”. Pusta zakładka: „Brak wycofanych ofert.” |
| Error | Baner listy. Publikacja z braków: przekierowanie na B-06 z listą braków. |
| Success | „Opublikowano ofertę”, „Wycofano ofertę”, „Skopiowano jako szkic” (z przejściem na B-06 kopii). |

**Walidacje:** brak (publikacja waliduje B-06).

**API:** `GET /offers?status&q`; `POST /offers/{offerId}/publish`; `POST /offers/{offerId}/withdraw`; `POST /offers/{offerId}/duplicate`.

### B-06 Edytor oferty

**Cel:** utworzenie, edycja i publikacja oferty (UC-B2 PG, PA1, W1).

**Funkcje:** sekcje: Podstawowe (tytuł, region lub kierunek, liczba dni, etapy edukacji, sezon – 12 przełączników miesięcy), Cena (cena „od”, min. uczestników, stawka prowizji oferty – opcjonalna z dopiskiem „Nadpisuje stawkę agenta”), Program (dni generowane z liczby dni: tytuł dnia i opis), Świadczenia (w cenie, dodatkowo płatne z ceną), Pliki (zdjęcia, PDF); „Zapisz szkic” / „Zapisz zmiany”; „Podgląd” (B-07); „Opublikuj” / „Wycofaj” / „Opublikuj ponownie”; „Kopiuj jako szkic”. Dla opublikowanej: baner „Zmiany są widoczne dla agentów od razu po zapisie. Złożone zapytania zachowują migawkę oferty.” Lista braków do publikacji w panelu bocznym (odhaczana na bieżąco).

**Komponenty UI:** nagłówek ze statusem oferty i akcjami, nawigacja po sekcjach (kotwice), pola, edytor dni programu (dodawanie, kolejność), przełączniki miesięcy, strefa upuszczania plików z miniaturami i ustawieniem zdjęcia głównego, panel „Gotowość do publikacji”.

**Stany**

| Stan | Zachowanie |
|---|---|
| Loading | Szkielet sekcji; upload: pasek postępu przy pliku. |
| Empty | Nowa oferta: puste pola z przykładami w placeholderach („np. Kraków i Wieliczka”); brak zdjęć: „Dodaj co najmniej jedno zdjęcie – pojawi się na karcie oferty.” |
| Error | W1 publikacja (422): baner „Nie można opublikować. Uzupełnij: program dnia 3, świadczenia w cenie, zdjęcie.” z linkami do pól; oferta pozostaje szkicem. 409 wersji według 1.2. Upload: „Plik program.pdf jest większy niż 20 MB.” |
| Success | „Zapisano szkic”, „Zapisano zmiany”, „Opublikowano ofertę”, „Wycofano ofertę”, „Opublikowano ponownie”, „Skopiowano jako szkic”. |

**Walidacje**

| Pole | Szkic | Publikacja | Komunikat |
|---|---|---|---|
| Tytuł | wymagany, ≤ 120 | wymagany | „Wpisz tytuł oferty.” |
| Region / kierunek | – | wymagany | „Wybierz region lub kierunek.” |
| Liczba dni | 1–14 | wymagana | „Podaj liczbę dni (1–14).” |
| Etapy edukacji | – | ≥ 1 | „Zaznacz co najmniej jeden etap edukacji.” |
| Sezon | – | ≥ 1 miesiąc | „Zaznacz miesiące, w których oferta jest dostępna.” |
| Cena „od” | > 0 | wymagana | „Podaj cenę „od” za uczestnika.” |
| Min. uczestników | 1–200 | wymagana | „Podaj minimalną liczbę uczestników.” |
| Stawka oferty | 0–30, krok 0,5, opcjonalna | – | „Stawka musi być od 0 do 30%.” |
| Program | – | opis dla każdego dnia 1..N | „Uzupełnij program dnia 3.” |
| Świadczenia w cenie | – | ≥ 1 | „Dodaj co najmniej jedno świadczenie w cenie.” |
| Świadczenia dodatkowo płatne | nazwa + cena > 0 | – | „Podaj nazwę i cenę świadczenia.” |
| Zdjęcia | JPG/PNG/WebP, ≤ 5 MB, ≤ 12 | ≥ 1 | „Dodaj co najmniej jedno zdjęcie.” |
| PDF | PDF, ≤ 20 MB, opcjonalny | – | „Plik musi być w formacie PDF.” |
| Zmniejszenie liczby dni | – | – | potwierdzenie: „Program dni 4–5 zostanie usunięty.” |

**API:** `GET /dictionaries`; `GET /offers/{offerId}`; `POST /offers` (pierwszy zapis); `PATCH /offers/{offerId}`; `POST /offers/{offerId}/files`; `DELETE /offers/{offerId}/files/{fileId}`; `POST /offers/{offerId}/publish`; `POST /offers/{offerId}/withdraw`; `POST /offers/{offerId}/duplicate`.

### B-07 Podgląd oferty w widoku agenta

**Cel:** sprawdzenie, jak agent zobaczy ofertę (UC-B2 PG 5).

**Funkcje:** render A-03 z danymi oferty (także szkicu) z paskiem „Podgląd – tak ofertę zobaczy agent”; przełącznik „Prowizja dla agenta ze stawką 5%” (przykładowa stawka agenta, gdy brak stawki oferty); „Złóż zapytanie” nieaktywne; „Wróć do edycji”; „Opublikuj” (dla szkicu).

**Komponenty UI:** pasek podglądu nad widokiem A-03, przyciski.

**Stany**

| Stan | Zachowanie |
|---|---|
| Loading | Jak A-03. |
| Empty | Brakujące pola szkicu jako szare miejsca „Brak programu dnia 3”. |
| Error | Jak A-03; publikacja jak B-06 W1. |
| Success | „Opublikowano ofertę”, powrót na B-06. |

**Walidacje:** jak publikacja B-06.

**API:** `GET /offers/{offerId}`; `POST /offers/{offerId}/publish`.

### B-08 Agenci (lista)

**Cel:** przegląd kont agentów (UC-B1 PG 4).

**Funkcje:** filtr statusu (Aktywny, Zaproszony, Dezaktywowany), szukaj (firma, osoba, NIP, e-mail); „Dodaj agenta” → B-09; w wierszu „Wyślij zaproszenie ponownie” dla Zaproszony (PA2); klik → B-09.

**Komponenty UI:** tabela: firma, osoba, region, e-mail, telefon, stawka, status (etykieta, przy Zaproszony data wysłania), otwarte zapytania, ostatnie logowanie.

**Stany**

| Stan | Zachowanie |
|---|---|
| Loading | 8 szkieletów wierszy. |
| Empty | „Nie ma jeszcze agentów. Dodaj pierwszego – dostanie e-mail z linkiem aktywacyjnym.” + „Dodaj agenta”. Brak wyników: „Brak agentów w statusie Dezaktywowany.” |
| Error | Baner listy. |
| Success | „Wysłano zaproszenie ponownie do jan@kowalski-wycieczki.pl. Poprzedni link przestał działać.” |

**Walidacje:** brak.

**API:** `GET /agents?status&q`; `POST /agents/{agentId}/resend-invitation`.

### B-09 Konto agenta (dodaj / edytuj)

**Cel:** założenie, edycja i dezaktywacja agenta (UC-B1 PG, PA1–PA3).

**Funkcje:** formularz: nazwa firmy, NIP, imię i nazwisko, e-mail, telefon, region działania, domyślna stawka prowizji; „Dodaj agenta i wyślij zaproszenie”; edycja: „Zapisz zmiany” z informacją przy zmianie stawki „Nowa stawka 6% obejmie zapytania zaakceptowane od teraz. Zaakceptowane wcześniej zachowują 5%.”; „Wyślij zaproszenie ponownie” (Zaproszony); „Dezaktywuj konto” z potwierdzeniem („Agent nie zaloguje się. Otwarte zapytania (4) zostają w kolejce, należne prowizje (1) będą rozliczane.”); skróty: zapytania agenta (→ B-01 z filtrem), prowizje (→ B-10 z filtrem).

**Komponenty UI:** formularz w karcie, etykieta statusu, sekcja „Strefa ryzyka” z dezaktywacją, kafle podsumowania (zapytania, rezerwacje, prowizje należne).

**Stany**

| Stan | Zachowanie |
|---|---|
| Loading | Szkielet formularza; „Zapisywanie…”, „Wysyłanie…”, „Dezaktywowanie…”. |
| Empty | Nowy agent: puste pola. |
| Error | W1 (409 `AGENT_EMAIL_TAKEN` / `AGENT_NIP_TAKEN`): błąd przy polu „Ten e-mail jest już przypisany do agenta Kowalski Wycieczki.” / „Agent z tym NIP-em już istnieje.” Konto nie powstaje. 409 wersji według 1.2. |
| Success | „Dodano agenta. Wysłano zaproszenie na jan@kowalski-wycieczki.pl.”, „Zapisano zmiany”, „Wysłano zaproszenie ponownie”, „Dezaktywowano konto”. |

**Walidacje**

| Pole | Reguła | Komunikat |
|---|---|---|
| Nazwa firmy | wymagana, ≤ 120 | „Wpisz nazwę firmy.” |
| NIP | wymagany, 10 cyfr, suma kontrolna, unikalny | „NIP ma błędną sumę kontrolną.” |
| Imię i nazwisko | wymagane, ≤ 120 | „Wpisz imię i nazwisko.” |
| E-mail | wymagany, format, unikalny | „To nie jest poprawny adres e-mail.” |
| Telefon | wymagany, format PL | „Wpisz 9 cyfr numeru.” |
| Region | wymagany | „Wybierz region działania.” |
| Stawka | wymagana, 0–30, krok 0,5 | „Stawka musi być od 0 do 30%.” |

**API:** `GET /agents/{agentId}`; `POST /agents`; `PATCH /agents/{agentId}`; `POST /agents/{agentId}/resend-invitation`; `POST /agents/{agentId}/deactivate`; `GET /dictionaries` (regiony).

### B-10 Prowizje (biuro)

**Cel:** rozliczanie prowizji należnych (UC-B9).

**Funkcje:** domyślny filtr status = należna; filtry agent, okres (data realizacji / wypłaty); zaznaczanie wierszy (i „zaznacz wszystkie na stronie”); pasek zbiorczy „Zaznaczono 3 pozycje: 3 604,50 zł” z „Oznacz jako wypłacone” → M-B6; w wierszu wypłaconym „Cofnij wypłatę” → M-B6 (PA1); klik numeru zapytania → B-02; sumy według statusu.

**Komponenty UI:** kafle sum, filtry, tabela z checkboxami: zapytanie, agent, klient, wartość końcowa, stawka, kwota, status, data realizacji, data wypłaty; przyklejony pasek zbiorczy.

**Stany**

| Stan | Zachowanie |
|---|---|
| Loading | Szkielety kafli i 10 wierszy. |
| Empty | Filtr należne: „Brak należnych prowizji do wypłaty.” Inne: „Brak prowizji dla wybranych filtrów.” + „Wyczyść filtry”. |
| Error | Baner listy; częściowy błąd zbiorczy (409 dla pozycji zmienionych w międzyczasie): „Oznaczono 2 z 3 pozycji. ZAP-2026-0150 ma już status wypłacona.” |
| Success | „Oznaczono 3 prowizje jako wypłacone”, „Cofnięto wypłatę”. |

**Walidacje:** zaznaczone tylko pozycje `DUE` (checkbox nieaktywny dla innych statusów).

**API:** `GET /commissions?status&agentId&from&to`; `GET /agents` (filtr); akcje M-B6.

### B-11 Raport agentów

**Cel:** wyniki sprzedaży agentów w okresie (UC-B8).

**Funkcje:** wybór okresu (rok szkolny, miesiąc, kwartał, własny zakres); tabela z wierszem na agenta: zapytania, rezerwacje, konwersja, wartość sprzedaży, prowizje prognozowane, należne, wypłacone; wiersz sumy; sortowanie po każdej kolumnie (domyślnie wartość malejąco); klik agenta → B-01 z `agentId` i okresem.

**Komponenty UI:** selektor okresu, tabela z liczbami wyrównanymi do prawej, pasek konwersji w komórce, wiersz sumy.

**Stany**

| Stan | Zachowanie |
|---|---|
| Loading | Szkielet tabeli 6 wierszy. |
| Empty | „Brak zapytań w okresie 01.09–30.09.2026.” |
| Error | Baner „Nie udało się wczytać raportu.” + „Spróbuj ponownie”. |
| Success | Brak mutacji. |

**Walidacje:** okres od ≤ do, ≤ 3 lata.

**API:** `GET /reports/agents?from&to`.

### M-B1 Modal: odrzucenie zapytania

**Cel:** zamknięcie zapytania przez biuro (UC-B3 PA1, UC-B5 PA1, UC-S1 krok 4).

**Funkcje:** powód z listy (brak dostępności w terminie, zapytanie niewykonalne, brak odpowiedzi agenta, inny) i treść widoczna dla agenta; skutki: aktywna wycena unieważniona, w `ACCEPTED` prognozowana prowizja anulowana.

**Komponenty UI:** modal, lista powodów, pole „Wiadomość dla agenta”, baner skutków, przycisk „Odrzuć zapytanie”.

**Stany**

| Stan | Zachowanie |
|---|---|
| Loading | „Odrzucanie…”. |
| Empty | Nie dotyczy. |
| Error | 409 statusu według B-02. |
| Success | „Odrzucono zapytanie”; status Odrzucona (biuro); agent widzi powód. |

**Walidacje**

| Pole | Reguła | Komunikat |
|---|---|---|
| Powód | wymagany | „Wybierz powód.” |
| Wiadomość dla agenta | wymagana, 10–1000 znaków | „Napisz agentowi, dlaczego zapytanie jest odrzucane.” |

**API:** `POST /inquiries/{inquiryId}/reject`.

### M-B2 Modal: potwierdzenie rezerwacji

**Cel:** potwierdzenie rezerwacji numerem umowy (UC-B5).

**Funkcje:** podsumowanie zaakceptowanej wyceny (v2, 890 zł × 26 = 23 140,00 zł, termin, kanał akceptacji „link, 02.11.2026”); pole numeru umowy; przypomnienie „Umowę zawierasz poza portalem.”

**Komponenty UI:** modal, podsumowanie, pole, przycisk „Potwierdź rezerwację”.

**Stany**

| Stan | Zachowanie |
|---|---|
| Loading | „Potwierdzanie…”. |
| Empty | Nie dotyczy. |
| Error | 409 statusu (agent wycofał): według B-02. 409 `CONTRACT_NUMBER_TAKEN`: „Numer umowy 2027/05/118 jest przypisany do ZAP-2026-0131.” |
| Success | „Potwierdzono rezerwację”; status Rezerwacja potwierdzona. |

**Walidacje**

| Pole | Reguła | Komunikat |
|---|---|---|
| Numer umowy | wymagany, 3–40 znaków, unikalny | „Wpisz numer umowy.” |

**API:** `POST /inquiries/{inquiryId}/confirm-booking`.

### M-B3 Modal: oznaczenie realizacji

**Cel:** zamknięcie wyjazdu z wartością końcową i naliczenie prowizji należnej (UC-B6).

**Funkcje:** wartość końcowa (domyślnie wartość wyceny 23 140,00 zł); faktyczna liczba uczestników (opcjonalna, domyślnie 26; zmiana podpowiada „Przelicz: 27 × 890 zł = 24 030,00 zł”); komentarz; podgląd na żywo „Prowizja należna: 24 030,00 zł × 5% = 1 201,50 zł”.

**Komponenty UI:** modal, pole kwoty, pole liczby, przycisk-podpowiedź przeliczenia, pole komentarza, kalkulator prowizji, przycisk „Oznacz jako zrealizowaną”.

**Stany**

| Stan | Zachowanie |
|---|---|
| Loading | „Zapisywanie…”. |
| Empty | Nie dotyczy. |
| Error | W1 (409 `RETURN_DATE_NOT_PASSED`): „Wyjazd kończy się 15.05.2027. Realizację oznaczysz po tej dacie.” |
| Success | „Oznaczono jako zrealizowane”; status Zrealizowana; prowizja należna. |

**Walidacje**

| Pole | Reguła | Komunikat |
|---|---|---|
| Wartość końcowa | wymagana, ≥ 0, 2 miejsca po przecinku | „Podaj wartość końcową sprzedaży.” |
| Wartość końcowa | różni się od wyceny o > 30% | ostrzeżenie: „Wartość różni się od wyceny o 35%. Sprawdź kwotę.” |
| Uczestnicy | 1–250, opcjonalne | „Podaj liczbę od 1 do 250.” |
| Komentarz | wymagany, gdy wartość ≠ wycena; ≤ 1000 | „Wyjaśnij różnicę wartości, np. pojechało 27 uczniów.” |

**API:** `POST /inquiries/{inquiryId}/complete` (`finalValue`, `actualParticipants`, `comment`).

### M-B4 Modal: anulowanie rezerwacji

**Cel:** anulowanie potwierdzonej rezerwacji (UC-B7).

**Funkcje:** powód (rezygnacja szkoły, brak minimum uczestników, siła wyższa, inny) i opis widoczny dla agenta; skutek „Prowizja zostanie anulowana (0 zł).”

**Komponenty UI:** modal, lista powodów, pole opisu, baner skutku, przycisk „Anuluj rezerwację”.

**Stany**

| Stan | Zachowanie |
|---|---|
| Loading | „Anulowanie…”. |
| Empty | Nie dotyczy. |
| Error | 409 statusu (już zrealizowana): „Rezerwacja jest już oznaczona jako zrealizowana.” |
| Success | „Anulowano rezerwację”; status Anulowana; prowizja anulowana. |

**Walidacje**

| Pole | Reguła | Komunikat |
|---|---|---|
| Powód | wymagany | „Wybierz powód.” |
| Opis | wymagany, 10–1000 znaków | „Opisz powód anulowania dla agenta.” |

**API:** `POST /inquiries/{inquiryId}/cancel`.

### M-B5 Modal: zmiana warunków (powrót do wyceny)

**Cel:** zmiana warunków zaakceptowanej wyceny za zgodą agenta (UC-B5 PA1).

**Funkcje:** opis zmiany wysyłany do wątku; potwierdzenie „Agent zgodził się w wątku na zmianę” (checkbox); skutki: zaakceptowana wycena → Zastąpiona, prognozowana prowizja → anulowana, status → W wycenie, wymagana ponowna akceptacja klienta.

**Komponenty UI:** modal, pole opisu, checkbox zgody, baner skutków, przycisk „Przywróć do wyceny”.

**Stany**

| Stan | Zachowanie |
|---|---|
| Loading | „Przywracanie…”. |
| Empty | Nie dotyczy. |
| Error | 409 statusu według B-02. |
| Success | „Przywrócono do wyceny”; status W wycenie; panel B-03 otwiera się automatycznie z danymi poprzedniej wersji. |

**Walidacje**

| Pole | Reguła | Komunikat |
|---|---|---|
| Opis zmiany | wymagany, 10–2000 znaków | „Opisz, co się zmienia w ofercie.” |
| Zgoda agenta | zaznaczona | „Potwierdź, że agent zgodził się na zmianę.” |

**API:** `POST /inquiries/{inquiryId}/requote`.

### M-B6 Modal: oznacz wypłatę / cofnij wypłatę

**Cel:** oznaczenie wypłaty prowizji i korekta pomyłki (UC-B9, PA1).

**Funkcje:** tryb „Oznacz jako wypłacone”: lista zaznaczonych pozycji z sumą (np. 3 pozycje, 3 604,50 zł; agenci), data wypłaty (domyślnie dziś). Tryb „Cofnij wypłatę”: pozycja, data wypłaty, powód (wpis do historii); skutek „Prowizja wróci do statusu należna.”

**Komponenty UI:** modal z listą pozycji, pole daty, pole powodu (cofanie), przycisk „Oznacz jako wypłacone” / „Cofnij wypłatę”.

**Stany**

| Stan | Zachowanie |
|---|---|
| Loading | „Zapisywanie…”. |
| Empty | Nie dotyczy (otwierany tylko z zaznaczeniem). |
| Error | Częściowy 409 według B-10. |
| Success | „Oznaczono 3 prowizje jako wypłacone” / „Cofnięto wypłatę”; agent widzi zmianę w A-09. |

**Walidacje**

| Pole | Reguła | Komunikat |
|---|---|---|
| Data wypłaty | wymagana, ≤ dziś, ≥ data realizacji | „Data wypłaty nie może być w przyszłości.” |
| Powód cofnięcia | wymagany, 5–500 znaków | „Podaj powód cofnięcia wypłaty.” |

**API:** `POST /commissions/mark-paid` (`ids[]`, `paidOn`, `If-Match` per pozycja w treści); `POST /commissions/{commissionId}/revert-payment`.

## 5. Klient

### K-01 Strona wyceny

**Cel:** czytelna wycena i decyzja jednym kliknięciem, bez konta (UC-K1).

**Funkcje**
- Nagłówek: tytuł oferty „Kraków i Wieliczka”, wersja nie jest pokazywana klientowi; „Wycena dla: klasa 6b, SP nr 12 w Łodzi”.
- Kluczowe liczby: termin 13–15.05.2027, cena za uczestnika 890 zł, uczestnicy płatni 26, opiekunowie gratis 2, razem 23 140,00 zł, ważna do 26.11.2026.
- Program dzień po dniu (z migawki i wyceny), świadczenia w cenie, świadczenia opcjonalne z cenami, uwagi biura.
- Kontakt do agenta (imię, firma, telefon `tel:`, e-mail `mailto:`).
- „Akceptuję” → potwierdzenie „Akceptujesz wycenę na 23 140,00 zł. Agent skontaktuje się w sprawie umowy.” → „Potwierdzam akceptację”.
- „Odrzucam” → opcjonalny powód (lista + tekst) → „Odrzuć wycenę”.
- Stany decyzji (W2) i nieaktualności (W1) bez przycisków. Brak prowizji i danych wewnętrznych.

**Komponenty UI:** strona mobile first, karta wyceny jako bilet z odcinkiem (termin, cena, ważność), oś programu, listy świadczeń, karta agenta, przyklejony dolny pasek z dwoma przyciskami, dialog potwierdzenia.

**Stany**

| Stan | Zachowanie |
|---|---|
| Loading | Szkielet biletu i programu. |
| Empty | Brak świadczeń opcjonalnych: sekcja ukryta. |
| Error | W1 (410: zastąpiona, wygasła, unieważniona, zapytanie zamknięte): „Wycena nieaktualna – skontaktuj się z agentem.” + karta agenta, bez przycisków. 404 (zły token): „Nie znaleziono wyceny. Sprawdź link od agenta.” Błąd wysłania decyzji: „Nie udało się zapisać decyzji. Spróbuj ponownie.” z przyciskami nadal aktywnymi. 409 (decyzja podjęta w międzyczasie, np. przez agenta) → widok W2. |
| Success | Akceptacja: „Wycena zaakceptowana 02.11.2026, 14:05. Jan Kowalski skontaktuje się z Panią/Panem w sprawie umowy.” z pieczęcią „Zaakceptowano”. Odrzucenie: „Wycena odrzucona. Dziękujemy za informację.” W2 przy ponownym wejściu: ten sam widok wyniku. |

**Walidacje**

| Pole | Reguła | Komunikat |
|---|---|---|
| Powód odrzucenia | opcjonalny, ≤ 1000 znaków | „Powód może mieć najwyżej 1000 znaków.” |
| Potwierdzenie akceptacji | wymagany drugi krok | — |

**API:** `GET /public/quotes/{token}`; `POST /public/quotes/{token}/accept`; `POST /public/quotes/{token}/reject` (`reasonCode`, `reasonText`). Endpointy publiczne z limitem 30 żądań / min na token.

## 6. Uzupełnienia katalogu API

Brak nowych endpointów. Doprecyzowania kontraktów względem `01`:

| Endpoint | Doprecyzowanie |
|---|---|
| `POST /inquiries/{inquiryId}/client-decision` | `decision: ACCEPT \| REJECT`, `note`, `reasonCode` (przy REJECT); 409 `DECISION_ALREADY_MADE`. |
| `POST /inquiries/{inquiryId}/requote` | `message`, `agentConsent: true`; tworzy wpis w wątku. |
| `POST /inquiries/{inquiryId}/complete` | `finalValue`, `actualParticipants?`, `comment?`; 409 `RETURN_DATE_NOT_PASSED`. |
| `POST /inquiries/{inquiryId}/confirm-booking` | `contractNumber`; 409 `CONTRACT_NUMBER_TAKEN`. |
| `POST /commissions/mark-paid` | odpowiedź z listą `succeeded[]` i `failed[{id, code}]` (częściowy sukces). |
| `POST /auth/login` | 429 po 5 nieudanych próbach. |
| `GET /public/quotes/{token}` | 200 `{state: ACTIVE \| ACCEPTED \| REJECTED}`; 410 dla `SUPERSEDED`, `EXPIRED`, `INVALIDATED` i zamkniętego zapytania (z danymi kontaktowymi agenta w treści). |
