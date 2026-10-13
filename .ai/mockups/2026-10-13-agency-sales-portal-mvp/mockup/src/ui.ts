import { Html, html, onClick } from './dom';
import type { SkeletonKind } from './components';
import type { ScreenMode } from './types';

export interface ScreenDefinition {
  screenId: string;
  title: string;
  skeleton: SkeletonKind;
  render: () => Html;
  renderEmpty?: () => Html;
  errorCopy?: { title: string; text: string; code: string };
}

interface ModalDefinition {
  title: string;
  variant: 'dialog' | 'drawer';
  render: () => Html;
  wide?: boolean;
}

export const uiState: { screenMode: ScreenMode; navigationLoading: boolean; modal: ModalDefinition | null; prototypePanelOpen: boolean } = {
  screenMode: 'data',
  navigationLoading: false,
  modal: null,
  prototypePanelOpen: false,
};

let renderCallback: () => void = () => undefined;

export function setRenderCallback(callback: () => void): void {
  renderCallback = callback;
}

export function requestRender(): void {
  renderCallback();
}

let lastFocusedBeforeModal: HTMLElement | null = null;

export function openModal(modal: ModalDefinition): void {
  lastFocusedBeforeModal = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  uiState.modal = modal;
  requestRender();
  window.requestAnimationFrame(() => {
    document.querySelector<HTMLElement>('#modal-root [data-autofocus], #modal-root input:not([type=hidden]), #modal-root textarea, #modal-root select, #modal-root button')?.focus();
  });
}

export function closeModal(): void {
  uiState.modal = null;
  requestRender();
  lastFocusedBeforeModal?.focus();
}

export function renderModal(): Html {
  const modal = uiState.modal;
  if (!modal) return html``;
  return html`<div class="modal-backdrop" ${onClick((element, event) => {
    if (event.target === element) closeModal();
  })}>
    <section class="modal modal--${modal.variant} ${modal.wide ? 'modal--wide' : ''}" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <header class="modal__header">
        <h2 id="modal-title" class="modal__title">${modal.title}</h2>
        <button class="icon-button" aria-label="Zamknij" ${onClick(() => closeModal())}>×</button>
      </header>
      <div class="modal__body">${modal.render()}</div>
    </section>
  </div>`;
}
