import { emptyState, errorBanner, pageHeader, skeleton } from './components';
import { clearHandlers, Html, html, installDelegatedEvents } from './dom';
import { currentLocation, navigate } from './navigation';
import { resolveRoute } from './router';
import { agentShell, bareShell, officeShell, prototypeBar } from './shell';
import { applySystemClock, commit, subscribe } from './store';
import { renderModal, setRenderCallback, uiState, type ScreenDefinition } from './ui';

const appRoot = document.getElementById('app');
const modalRoot = document.getElementById('modal-root');
const navigationLoadingMs = 380;
let lastPath = '';

type PreservedForms = Map<string, Array<{ name: string; value: string; checked: boolean; type: string }>>;

function snapshotForms(): PreservedForms {
  const snapshot: PreservedForms = new Map();
  document.querySelectorAll<HTMLFormElement>('form[data-preserve]').forEach((form) => {
    const fields = Array.from(form.elements)
      .filter((element): element is HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement => element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement || element instanceof HTMLSelectElement)
      .filter((element) => element.name && !element.hasAttribute('data-no-restore'))
      .map((element) => ({ name: element.name, value: element.value, checked: element instanceof HTMLInputElement && element.checked, type: element instanceof HTMLInputElement ? element.type : element.tagName }));
    snapshot.set(form.dataset.preserve ?? '', fields);
  });
  return snapshot;
}

function restoreForms(snapshot: PreservedForms): void {
  snapshot.forEach((fields, key) => {
    const form = document.querySelector<HTMLFormElement>(`form[data-preserve="${key}"]`);
    if (!form) return;
    const elements = Array.from(form.elements).filter((element): element is HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement => element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement || element instanceof HTMLSelectElement);
    elements.forEach((element) => {
      if (!element.name || element.hasAttribute('data-no-restore')) return;
      if (element instanceof HTMLInputElement && (element.type === 'checkbox' || element.type === 'radio')) {
        const saved = fields.find((candidate) => candidate.name === element.name && candidate.value === element.value);
        if (saved) element.checked = saved.checked;
        return;
      }
      const sameName = elements.filter((candidate) => candidate.name === element.name);
      const savedSameName = fields.filter((candidate) => candidate.name === element.name);
      const saved = savedSameName[sameName.indexOf(element)];
      if (saved) element.value = saved.value;
    });
  });
}

function genericErrorCopy(screen: ScreenDefinition) {
  return screen.errorCopy ?? { title: `Nie udało się wczytać: ${screen.title}`, text: 'Nie udało się połączyć z serwerem. Spróbuj ponownie za chwilę.', code: '503' };
}

function screenBody(screen: ScreenDefinition): Html {
  if (uiState.navigationLoading || uiState.screenMode === 'loading') return skeleton(screen.skeleton);
  if (uiState.screenMode === 'error') {
    const copy = genericErrorCopy(screen);
    return html`${pageHeader({ title: screen.title })}${errorBanner({
      ...copy,
      retry: () => {
        uiState.screenMode = 'data';
        render();
      },
    })}`;
  }
  if (uiState.screenMode === 'empty') {
    return screen.renderEmpty
      ? screen.renderEmpty()
      : html`${pageHeader({ title: screen.title })}${emptyState({ title: 'Ten ekran nie ma stanu pustego', text: 'To formularz albo widok pojedynczego rekordu – pusty stan dotyczy list i paneli. Wróć do widoku „Dane”.' })}`;
  }
  return screen.render();
}

function render(): void {
  if (!appRoot || !modalRoot) return;
  const location = currentLocation();
  const route = resolveRoute(location);
  if ('redirect' in route) {
    navigate(route.redirect);
    return;
  }
  const preserved = snapshotForms();
  clearHandlers();
  const screen = route.build();
  const body = screenBody(screen);
  const content =
    route.zone === 'agent' ? agentShell(route.navKey, body) : route.zone === 'office' ? officeShell(route.navKey, body) : bareShell(route.zone, body);
  appRoot.innerHTML = html`${prototypeBar(route.zone, screen.screenId)}${content}`.value;
  modalRoot.innerHTML = renderModal().value;
  document.body.classList.toggle('has-modal', uiState.modal !== null);
  document.title = `${screen.title} · Portal agentów`;
  restoreForms(preserved);
}

function onLocationChange(): void {
  const path = currentLocation().path;
  const pathChanged = path !== lastPath;
  lastPath = path;
  uiState.modal = null;
  if (!pathChanged) {
    render();
    return;
  }
  uiState.navigationLoading = true;
  render();
  window.scrollTo({ top: 0 });
  window.setTimeout(() => {
    uiState.navigationLoading = false;
    render();
    document.getElementById('main')?.focus({ preventScroll: true });
  }, navigationLoadingMs);
}

installDelegatedEvents(document);
setRenderCallback(render);
subscribe(render);
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && uiState.modal) {
    uiState.modal = null;
    render();
  }
});
window.addEventListener('hashchange', onLocationChange);
applySystemClock();
commit();
onLocationChange();
