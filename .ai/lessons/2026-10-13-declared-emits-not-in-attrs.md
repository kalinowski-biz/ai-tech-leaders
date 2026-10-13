# Listeners of declared emits never appear in `useAttrs()`

- **Date:** 2026-10-13
- **Source:** bug found while unit-testing `AppDataTable`

## What happened

`AppDataTable` made rows look clickable with `computed(() => 'onRowClick' in useAttrs())` while also declaring `defineEmits<{ rowClick: [...] }>()`. Rows never got `cursor-pointer`, even with `@row-click` attached.

## Root cause / insight

Vue removes listeners for declared emits from `attrs` (they belong to the component's emit contract). Checking `attrs` for a declared event is always false.

## What to do (or avoid) next time

- When a component's rendering depends on whether a listener is attached, declare it as an optional **prop** (`onRowClick?: (row) => void`) instead of an emit, and call it with `onRowClick?.(row)`. Parents still write `@row-click`.
