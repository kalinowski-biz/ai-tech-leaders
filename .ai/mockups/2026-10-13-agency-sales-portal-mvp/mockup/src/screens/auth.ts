import { banner, field } from '../components';
import { Html, html, onSubmit, runPending, showFormErrors, showToast, textOf, when } from '../dom';
import { navigate } from '../navigation';
import { activateAgent, agentFullName, commit, state } from '../store';
import type { ScreenDefinition } from '../ui';
import { isStrongPassword, isValidEmail } from '../validation';

const officeContact = 'Biuro: 42 630 11 22 · agenci@biuro.pl';

function authCard(title: string, body: Html, lead: string | Html = ''): Html {
  return html`<section class="auth-card">
    <p class="brand brand--dark"><span class="brand__mark" aria-hidden="true"></span>Portal agentów</p>
    <h1 class="auth-card__title">${title}</h1>
    ${when(lead, () => html`<p class="auth-card__lead">${lead}</p>`)}
    ${body}
  </section>`;
}

function validateEmail(data: FormData): Record<string, string> {
  const email = textOf(data, 'email');
  if (!email) return { email: 'Wpisz adres e-mail.' };
  return isValidEmail(email) ? {} : { email: 'To nie jest poprawny adres e-mail.' };
}

function validateNewPassword(data: FormData): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!isStrongPassword(textOf(data, 'password'))) errors.password = 'Hasło musi mieć co najmniej 10 znaków, w tym literę i cyfrę.';
  if (textOf(data, 'passwordRepeat') !== textOf(data, 'password')) errors.passwordRepeat = 'Hasła różnią się.';
  return errors;
}

function passwordFields(): Html {
  return html`${field({ name: 'password', label: 'Hasło', type: 'password', required: true, autocomplete: 'new-password', hint: 'Co najmniej 10 znaków, w tym litera i cyfra.' })}
    ${field({ name: 'passwordRepeat', label: 'Powtórz hasło', type: 'password', required: true, autocomplete: 'new-password' })}`;
}

export function loginScreen(): ScreenDefinition {
  return {
    screenId: 'S-01',
    title: 'Logowanie',
    skeleton: 'form',
    render: () =>
      authCard(
        'Zaloguj się',
        html`<form class="form" ${onSubmit(
            (data) => ({ ...validateEmail(data), ...(textOf(data, 'password') ? {} : { password: 'Wpisz hasło.' }) }),
            (data, form, submitter) => {
              const email = textOf(data, 'email').toLowerCase();
              runPending(submitter, 'Logowanie…', () => {
                const agent = state.agents.find((candidate) => candidate.email === email);
                const officeUser = state.officeUsers.find((candidate) => candidate.email === email);
                const banners = form.querySelector<HTMLElement>('[data-login-error]');
                const fail = (message: string) => {
                  if (banners) banners.innerHTML = banner('alert', message).value;
                };
                if (textOf(data, 'password') === 'zle') return fail('Nieprawidłowy e-mail lub hasło.');
                if (officeUser) {
                  state.currentOfficeUserId = officeUser.id;
                  commit();
                  navigate('/biuro/kolejka');
                  return;
                }
                if (!agent) return fail('Nieprawidłowy e-mail lub hasło.');
                if (agent.status === 'DEACTIVATED') return fail('Konto jest nieaktywne. Skontaktuj się z biurem.');
                if (agent.status === 'INVITED') return fail('Konto nie jest jeszcze aktywne. Użyj linku z zaproszenia.');
                state.currentAgentId = agent.id;
                commit();
                showFormErrors(form, {});
                navigate('/agent/panel');
              });
            },
          )}>
          <div data-login-error></div>
          ${field({ name: 'email', label: 'E-mail', type: 'email', required: true, autocomplete: 'username' })}
          ${field({ name: 'password', label: 'Hasło', type: 'password', required: true, autocomplete: 'current-password' })}
          <button type="submit" class="button button--primary button--block">Zaloguj się</button>
          <a class="text-link" href="#/reset-hasla">Nie pamiętam hasła</a>
        </form>
        <details class="demo-accounts"><summary>Konta w prototypie</summary>
          <ul>
            ${state.agents.map((agent) => html`<li><code>${agent.email}</code> – ${agentFullName(agent)} (${agent.status === 'ACTIVE' ? 'agent' : agent.status === 'INVITED' ? 'zaproszony' : 'dezaktywowany'})</li>`)}
            ${state.officeUsers.map((user) => html`<li><code>${user.email}</code> – ${user.name} (biuro)</li>`)}
          </ul>
          <p class="small muted">Dowolne hasło. Hasło „zle” pokazuje błąd logowania.</p>
        </details>`,
      ),
  };
}

export function activationScreen(token: string): ScreenDefinition {
  const agent = state.agents.find((candidate) => candidate.invitationToken === token && candidate.status === 'INVITED');
  if (!agent) {
    return {
      screenId: 'S-02',
      title: 'Link nieaktualny',
      skeleton: 'form',
      render: () => authCard('Link aktywacyjny wygasł', html`<p>Link wygasł albo został zastąpiony nowym. Poproś biuro o ponowne zaproszenie.</p><p class="muted">${officeContact}</p><a class="button button--secondary" href="#/logowanie">Przejdź do logowania</a>`),
    };
  }
  return {
    screenId: 'S-02',
    title: 'Aktywacja konta',
    skeleton: 'form',
    render: () =>
      authCard(
        `Witaj, ${agent.companyName}`,
        html`<form class="form" ${onSubmit(validateNewPassword, (_data, _form, submitter) =>
          runPending(submitter, 'Aktywowanie…', () => {
            activateAgent(token);
            showToast('Konto aktywowane');
            navigate('/agent/panel');
          }),
        )}>
          ${passwordFields()}
          <button type="submit" class="button button--primary button--block">Aktywuj konto</button>
        </form>`,
        html`Ustaw hasło do konta <strong>${agent.email}</strong>. Po aktywacji od razu trafisz do panelu.`,
      ),
  };
}

export function passwordResetRequestScreen(): ScreenDefinition {
  return {
    screenId: 'S-03',
    title: 'Reset hasła',
    skeleton: 'form',
    render: () =>
      authCard(
        'Nie pamiętasz hasła?',
        html`<form class="form" ${onSubmit(validateEmail, (data, form, submitter) =>
          runPending(submitter, 'Wysyłanie…', () => {
            form.outerHTML = `<div class="banner banner--success" role="status"><div><p class="banner__title">Sprawdź skrzynkę</p><p>Jeśli konto o adresie ${textOf(data, 'email')} istnieje, wysłaliśmy na nie link. Link jest ważny 60 minut.</p><p><a href="#/reset-hasla/demo-reset">Otwórz link z e-maila (symulacja)</a></p></div></div>`;
          }),
        )}>
          ${field({ name: 'email', label: 'E-mail', type: 'email', required: true, autocomplete: 'username' })}
          <button type="submit" class="button button--primary button--block">Wyślij link</button>
        </form>
        <a class="text-link" href="#/logowanie">Wróć do logowania</a>`,
        'Podaj e-mail konta – wyślemy link do ustawienia nowego hasła.',
      ),
  };
}

export function passwordResetScreen(token: string): ScreenDefinition {
  if (token === 'wygasly') {
    return {
      screenId: 'S-04',
      title: 'Link nieaktualny',
      skeleton: 'form',
      render: () => authCard('Link wygasł lub został już użyty', html`<a class="button button--primary" href="#/reset-hasla">Wyślij nowy link</a>`),
    };
  }
  return {
    screenId: 'S-04',
    title: 'Nowe hasło',
    skeleton: 'form',
    render: () =>
      authCard(
        'Ustaw nowe hasło',
        html`<form class="form" ${onSubmit(validateNewPassword, (_data, _form, submitter) =>
          runPending(submitter, 'Zapisywanie…', () => {
            showToast('Hasło zmienione. Zaloguj się nowym hasłem.');
            navigate('/logowanie');
          }),
        )}>
          ${passwordFields()}
          <button type="submit" class="button button--primary button--block">Ustaw hasło</button>
        </form>`,
      ),
  };
}
