# SSR data fetching: `useRequestFetch()` has no `.raw`; typed `$fetch` explodes on dynamic paths

- **Date:** 2026-10-13
- **Source:** run [2026-10-13-implement-engineering-standards](../runs/2026-10-13-implement-engineering-standards.md)

## What happened
1. `/admin` rendered "Nie udało się połączyć z serwerem" (`NETWORK_ERROR`) during SSR although `/api/v1/health` answered 503 `DATABASE_UNAVAILABLE`. `useApi` called `useRequestFetch().raw(...)`: on the server `useRequestFetch()` returns Nitro's `event.$fetch`, which has **no `.raw`**, so the call threw a `TypeError` – and `toApiError` mapped every status-less error to `NETWORK_ERROR`, hiding the bug.
2. Calling the global `$fetch(path, …)` with a `string` path made `nuxt typecheck` fail with "TS2321: Excessive stack depth comparing types" (Nitro's typed-route overloads).

## Root cause / insight
- Only the global `$fetch` (ofetch) has `.raw` everywhere; cookie forwarding during SSR must then be done by hand (`useRequestHeaders(['cookie'])`).
- An error mapper that turns "anything without a status" into a network error masks programming errors.

## What to do (or avoid) next time
- Keep all API calls in `useApi` (global `$fetch` through an untyped interface + forwarded cookie). Do not reintroduce `useRequestFetch()` there.
- `toApiError` maps only real `FetchError`s to `NETWORK_ERROR`; anything else is logged and becomes `CLIENT_ERROR`. Keep it that way.
- Verify SSR paths by running the built server (`node packages/app/.output/server/index.mjs`) and curling the page, not only the API.
