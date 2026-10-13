/** Liveness + database check: 200 `{ status: 'ok', ... }` or 503 `{ code: 'DATABASE_UNAVAILABLE' }`. */
export default defineApiHandler((event) => useScope(event).cradle.healthService.check())
