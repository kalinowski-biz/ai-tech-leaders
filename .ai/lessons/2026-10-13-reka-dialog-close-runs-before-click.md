# reka-ui `AlertDialogAction` closes the dialog before your `@click`

- **Date:** 2026-10-13
- **Source:** bug found while unit-testing `AppConfirmDialog`

## What happened

`AppConfirmDialog` rendered the confirm button as `<AlertDialogAction @click="settle(true)">` and handled `@update:open` with `settle(false)`. Every `await confirm(...)` resolved **`false`**, also when the user clicked the confirm button – a destructive action guarded by `useConfirm()` could never proceed.

## Root cause / insight

`AlertDialogAction` is reka's `DialogClose`. Its own `onClick` (`rootContext.onOpenChange(false)`) is merged **before** the fall-through `onClick` from the parent. So the dialog emitted `update:open(false)` → `settle(false)` resolved the promise, and our `settle(true)` ran afterwards on an already-settled request.

## What to do (or avoid) next time

- When a click must decide the outcome of a dialog, use a plain `Button` that sets the state; let the controlled `open` prop close the dialog. Use `AlertDialogCancel`/`DialogClose` only for "dismiss = no".
- Test confirmations end to end through the component (`ConfirmDialog.nuxt.test.ts` clicks the real button and asserts the resolved value).
