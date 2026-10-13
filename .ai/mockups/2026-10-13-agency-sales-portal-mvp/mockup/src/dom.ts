export class Html {
  constructor(readonly value: string) {}
}

type Renderable = Html | string | number | boolean | null | undefined | Renderable[];

const escapeMap: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

function escapeText(text: string): string {
  return text.replace(/[&<>"']/g, (character) => escapeMap[character] ?? character);
}

function renderValue(value: Renderable): string {
  if (value instanceof Html) return value.value;
  if (Array.isArray(value)) return value.map(renderValue).join('');
  if (value === null || value === undefined) return '';
  return escapeText(String(value));
}

export function html(strings: TemplateStringsArray, ...values: Renderable[]): Html {
  return new Html(strings.reduce((output, chunk, index) => output + chunk + (index < values.length ? renderValue(values[index]) : ''), ''));
}

export function when(condition: unknown, content: () => Html): Html | null {
  return condition ? content() : null;
}

type ClickHandler = (element: HTMLElement, event: Event) => void;
type FieldHandler = (element: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement) => void;
type SubmitHandler = (data: FormData, form: HTMLFormElement, submitter: HTMLButtonElement | null) => void;
export type FormErrors = Partial<Record<string, string>>;
export type FormValidator = (data: FormData, form: HTMLFormElement) => FormErrors;

const clickHandlers = new Map<string, ClickHandler>();
const fieldHandlers = new Map<string, FieldHandler>();
const submitHandlers = new Map<string, SubmitHandler>();
const validators = new Map<string, FormValidator>();
let handlerSequence = 0;

function register<T>(registry: Map<string, T>, handler: T): string {
  handlerSequence += 1;
  const key = `h${handlerSequence}`;
  registry.set(key, handler);
  return key;
}

export function onClick(handler: ClickHandler): Html {
  return new Html(`data-click="${register(clickHandlers, handler)}"`);
}

export function onInput(handler: FieldHandler): Html {
  return new Html(`data-input="${register(fieldHandlers, handler)}"`);
}

export function onChange(handler: FieldHandler): Html {
  return new Html(`data-change="${register(fieldHandlers, handler)}"`);
}

export function onSubmit(validator: FormValidator, handler: SubmitHandler): Html {
  const submitKey = register(submitHandlers, handler);
  const validatorKey = register(validators, validator);
  return new Html(`data-submit="${submitKey}" data-validate="${validatorKey}" novalidate`);
}

export function clearHandlers(): void {
  clickHandlers.clear();
  fieldHandlers.clear();
  submitHandlers.clear();
  validators.clear();
}

function setFieldError(form: HTMLFormElement, fieldName: string, message: string): void {
  const errorElement = form.querySelector<HTMLElement>(`[data-error-for="${fieldName}"]`);
  if (errorElement) errorElement.textContent = message;
  form.querySelectorAll<HTMLElement>(`[name="${fieldName}"]`).forEach((input) => {
    if (message) input.setAttribute('aria-invalid', 'true');
    else input.removeAttribute('aria-invalid');
  });
}

export function showFormErrors(form: HTMLFormElement, errors: FormErrors): boolean {
  form.querySelectorAll<HTMLElement>('[data-error-for]').forEach((element) => {
    const fieldName = element.dataset.errorFor ?? '';
    setFieldError(form, fieldName, errors[fieldName] ?? '');
  });
  const firstInvalidName = Object.keys(errors).find((fieldName) => Boolean(errors[fieldName]));
  if (firstInvalidName) form.querySelector<HTMLElement>(`[name="${firstInvalidName}"]`)?.focus();
  return Boolean(firstInvalidName);
}

function revalidateField(form: HTMLFormElement, fieldName: string): void {
  const validator = validators.get(form.dataset.validate ?? '');
  if (!validator || !form.querySelector(`[data-error-for="${fieldName}"]`)) return;
  const errors = validator(new FormData(form), form);
  setFieldError(form, fieldName, errors[fieldName] ?? '');
}

export function installDelegatedEvents(root: Document): void {
  root.addEventListener('click', (event) => {
    if (!(event.target instanceof Element)) return;
    const target = event.target.closest<HTMLElement>('[data-click]');
    if (!target) return;
    const nestedInteractive = event.target.closest('a[href], button, input, select, textarea, label');
    if (nestedInteractive && nestedInteractive !== target && target.contains(nestedInteractive)) return;
    const handler = clickHandlers.get(target.dataset.click ?? '');
    if (!handler) return;
    event.preventDefault();
    handler(target, event);
  });
  const dispatchFieldEvent = (event: Event, datasetKey: 'input' | 'change') => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement || target instanceof HTMLSelectElement || target instanceof HTMLTextAreaElement)) return;
    let node: HTMLElement | null = target;
    while (node) {
      const handlerKey = node.dataset[datasetKey];
      if (handlerKey) fieldHandlers.get(handlerKey)?.(target);
      node = node.parentElement;
    }
    const form = target.form;
    if (form) form.querySelectorAll<HTMLElement>('[aria-invalid="true"][name]').forEach((invalid) => revalidateField(form, invalid.getAttribute('name') ?? ''));
  };
  root.addEventListener('input', (event) => dispatchFieldEvent(event, 'input'));
  root.addEventListener('change', (event) => dispatchFieldEvent(event, 'change'));
  root.addEventListener('focusout', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement || target instanceof HTMLSelectElement || target instanceof HTMLTextAreaElement)) return;
    if (target.form && target.name && target.dataset.touched !== 'skip') {
      target.dataset.touched = 'true';
      if (target.value !== '' || target.getAttribute('aria-invalid') === 'true') revalidateField(target.form, target.name);
    }
  });
  root.addEventListener('submit', (event) => {
    const form = event.target;
    if (!(form instanceof HTMLFormElement)) return;
    const handler = submitHandlers.get(form.dataset.submit ?? '');
    if (!handler) return;
    event.preventDefault();
    const submitter = event instanceof SubmitEvent && event.submitter instanceof HTMLButtonElement ? event.submitter : null;
    const skipValidation = submitter?.dataset.skipValidation === 'true';
    const validator = validators.get(form.dataset.validate ?? '');
    const errors = !skipValidation && validator ? validator(new FormData(form), form) : {};
    if (showFormErrors(form, errors)) return;
    handler(new FormData(form), form, submitter);
  });
}

export function textOf(data: FormData, name: string): string {
  const value = data.get(name);
  return typeof value === 'string' ? value.trim() : '';
}

export function numberOf(data: FormData, name: string): number {
  const normalized = textOf(data, name).replace(/\s/g, '').replace(',', '.');
  return normalized === '' ? Number.NaN : Number(normalized);
}

export function listOf(data: FormData, name: string): string[] {
  return data.getAll(name).filter((value): value is string => typeof value === 'string');
}

export function linesOf(data: FormData, name: string): string[] {
  return textOf(data, name)
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

const pendingDurationMs = 520;

export function runPending(button: HTMLElement | null, pendingLabel: string, action: () => void): void {
  if (!button) {
    action();
    return;
  }
  const originalLabel = button.innerHTML;
  button.setAttribute('disabled', 'true');
  button.setAttribute('aria-busy', 'true');
  button.innerHTML = `<span class="spinner" aria-hidden="true"></span>${escapeText(pendingLabel)}`;
  window.setTimeout(() => {
    button.removeAttribute('disabled');
    button.removeAttribute('aria-busy');
    button.innerHTML = originalLabel;
    action();
  }, pendingDurationMs);
}

let toastTimer = 0;

export function showToast(message: string, tone: 'success' | 'info' | 'error' = 'success'): void {
  const region = document.getElementById('toast-region');
  if (!region) return;
  region.innerHTML = `<div class="toast toast--${tone}" role="status">${escapeText(message)}</div>`;
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => {
    region.innerHTML = '';
  }, 3600);
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
