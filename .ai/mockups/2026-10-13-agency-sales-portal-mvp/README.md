# Portal sprzedaży agencyjnej – MVP: ekrany i prototyp

Źródło: `../2026-10-13-agency-sales-portal-mvp.md` · 2026-10-13

| Plik | Zawartość |
|---|---|
| `01-mapa-ekranow-i-nawigacji.md` | Strefy portalu, inwentarz 33 ekranów i modali (ID, trasa, UC), menu, graf przejść, kluczowe ścieżki P1–P11, słownik statusów, katalog endpointów API |
| `02-specyfikacja-ekranow.md` | Wzorce wspólne (stany, kody błędów, mutacje, formaty) i karta każdego ekranu: cel, funkcje, komponenty UI, stany loading/empty/error/success, walidacje, API; macierze akcji per status dla A-06 i B-02 |
| `mockup/` | Klikalny prototyp HTML/CSS/TypeScript |

## Uruchomienie prototypu

Otwórz `mockup/index.html` w przeglądarce (działa z `file://`, zbudowany plik `dist/app.js` leży obok; katalog `local/` jest poza gitem) albo zaserwuj katalog `mockup/` dowolnym serwerem statycznym.

Po zmianie kodu: `mockup/build.sh` (typecheck `tsc` + bundle `esbuild` z zależności monorepo).

- Start: `#/` – mapa prototypu z instrukcjami ścieżek P1–P11 i linkami do wszystkich ekranów.
- Pasek „Prototyp” u góry: przełączanie roli (Agent / Biuro / Konto), stanu ekranu (Dane / Ładowanie / Pusto / Błąd), daty systemowej (wygasanie wycen, data powrotu) i reset danych.
- Dane trzymane w `localStorage` przeglądarki; przejścia statusów, wersje wycen, prowizje i liczniki działają jak w opisanym modelu.
- Identyfikator ekranu z dokumentów jest widoczny w pasku (np. `A-06`).

## Kierunek wizualny

Motyw „zeszyt i bilet”: atramentowy granat (menu, akcje główne), zakreślacz (wszystko, co wymaga ruchu użytkownika), czerwień marginesu (błędy, wygasłe wyceny), tło w kratkę. Element rozpoznawczy: wycena jako bilet z odcinkiem (wersja, ważność), na który przy decyzji klienta spada pieczątka „Zaakceptowano”. Fonty: Bricolage Grotesque (nagłówki), Schibsted Grotesk (tekst), IBM Plex Mono (numery, kwoty).

## Struktura `mockup/src`

`types.ts` model · `seed.ts` dane startowe · `store.ts` przejścia stanów i reguły biznesowe · `dom.ts` renderowanie, zdarzenia, walidacja formularzy · `components.ts` wspólne komponenty (bilet, etykiety statusów, stany) · `screens/*` ekrany według stref · `router.ts`, `shell.ts`, `main.ts` nawigacja i powłoki.
