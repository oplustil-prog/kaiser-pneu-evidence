(function () {
  const CONFIG_KEY = "kaiser-pneu-supabase-config-v1";
  const SUPABASE_MODULE_URL = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
  const PUBLIC_APP_URL = "https://oplustil-prog.github.io/kaiser-pneu-evidence/";
  const gate = {
    client: null,
    clientKey: "",
    email: "",
    busy: false
  };

  function setAuthState(user) {
    const authenticated = Boolean(user?.email);
    window.kaiserAuthState = {
      authenticated,
      email: user?.email || "",
      user: user || null,
      checkedAt: new Date().toISOString()
    };
    document.body.classList.toggle("kaiser-auth-locked", !authenticated);
    window.dispatchEvent(new CustomEvent("kaiser-auth-state", { detail: window.kaiserAuthState }));
  }

  window.kaiserIsAuthenticated = function () {
    return Boolean(window.kaiserAuthState?.authenticated);
  };

  window.kaiserRequireAuth = function (action = "upravu dat") {
    if (window.kaiserIsAuthenticated()) return true;
    step("password");
    show(true);
    status(`Pro ${action} se nejdrive prihlaste. Bez prihlaseni nelze menit data.`, "warn");
    return false;
  };

  window.kaiserLockApp = function (message = "Aplikace je zamcena. Nejdrive se prihlaste.") {
    setAuthState(null);
    step("password");
    show(true);
    status(message, "warn");
  };

  function readJson(key, fallback) {
    try {
      const value = localStorage.getItem(key);
      return value ? JSON.parse(value) : fallback;
    } catch {
      return fallback;
    }
  }

  function config() {
    const defaults = window.kaiserSupabaseDefaults || window.kaiserSupabaseConfig || {};
    return { ...defaults, ...readJson(CONFIG_KEY, {}), autoLoad: true, autoSync: true };
  }

  function isConfigured(next = config()) {
    return Boolean(String(next.url || "").trim() && String(next.anonKey || "").trim());
  }

  function publicRedirectUrl() {
    const origin = String(window.location.origin || "");
    if (!origin || origin === "null" || origin.includes("localhost") || origin.includes("127.0.0.1")) {
      return PUBLIC_APP_URL;
    }
    try {
      const url = new URL(window.location.pathname || "/", origin);
      return url.toString();
    } catch {
      return PUBLIC_APP_URL;
    }
  }

  async function client() {
    const next = config();
    if (!isConfigured(next)) throw new Error("Cloudove prihlaseni neni nastavene.");
    const key = `${next.url}|${next.anonKey}`;
    if (gate.client && gate.clientKey === key) return gate.client;
    const module = await import(SUPABASE_MODULE_URL);
    gate.client = module.createClient(next.url.trim(), next.anonKey.trim(), {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
      }
    });
    gate.client.auth.onAuthStateChange((event) => {
      if (event !== "SIGNED_OUT" && event !== "USER_DELETED") return;
      setAuthState(null);
      show(true);
      step("password");
      status("Byli jste odhlaseni. Pro dalsi praci se znovu prihlaste.", "warn");
    });
    gate.clientKey = key;
    return gate.client;
  }

  function ensureStyles() {
    if (document.querySelector("#kaiserLoginGateStyles")) return;
    const style = document.createElement("style");
    style.id = "kaiserLoginGateStyles";
    style.textContent = `
      body.kaiser-login-active { overflow: hidden; }
      body.kaiser-auth-locked .app-shell,
      body.kaiser-auth-locked .quick-measure-dock,
      body.kaiser-login-active .app-shell,
      body.kaiser-login-active .quick-measure-dock {
        filter: blur(2px);
        pointer-events: none;
        user-select: none;
      }
      .kaiser-login-gate {
        align-items: center;
        background: rgba(245, 248, 243, .9);
        display: none;
        inset: 0;
        justify-content: center;
        padding: 18px;
        position: fixed;
        z-index: 2500;
      }
      .kaiser-login-gate.is-visible { display: flex; }
      .kaiser-login-card {
        background: #fff;
        border: 1px solid rgba(117, 189, 37, .34);
        border-radius: 8px;
        box-shadow: 0 28px 80px rgba(25, 34, 28, .2);
        display: grid;
        gap: 18px;
        max-height: calc(100vh - 36px);
        max-width: 560px;
        overflow: auto;
        padding: 24px;
        width: min(100%, 560px);
      }
      .kaiser-login-logo {
        align-items: center;
        background: var(--brand, #75bd25);
        border-radius: 7px;
        color: #fff;
        display: inline-flex;
        font-size: 2.1rem;
        font-weight: 800;
        height: 58px;
        line-height: 1;
        padding: 0 12px 4px;
        width: 178px;
      }
      .kaiser-login-title h2 {
        color: var(--ink, #19221c);
        font-size: 1.55rem;
        line-height: 1.14;
        margin: 0 0 6px;
      }
      .kaiser-login-title p,
      .kaiser-login-help p {
        color: var(--muted, #61705e);
        font-size: .98rem;
        margin: 0;
      }
      .kaiser-login-progress {
        display: grid;
        gap: 10px;
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
      .kaiser-login-progress span {
        background: #eef0ef;
        border-radius: 999px;
        color: #61705e;
        font-size: .8rem;
        font-weight: 800;
        padding: 9px 12px;
        text-align: center;
      }
      .kaiser-login-progress span.is-active {
        background: #eaf6df;
        color: #4f9418;
      }
      .kaiser-login-step,
      .kaiser-login-form {
        display: grid;
        gap: 14px;
      }
      .kaiser-login-step[hidden] { display: none; }
      .kaiser-login-form label {
        color: var(--muted, #61705e);
        display: grid;
        font-weight: 800;
        gap: 7px;
      }
      .kaiser-login-form input {
        border: 1px solid rgba(117, 189, 37, .35);
        border-radius: 8px;
        color: var(--ink, #19221c);
        font: inherit;
        font-weight: 700;
        min-height: 48px;
        padding: 0 14px;
      }
      .kaiser-login-help {
        background: #f5fbf0;
        border: 1px solid rgba(117, 189, 37, .28);
        border-radius: 8px;
        color: var(--muted, #61705e);
        display: grid;
        gap: 8px;
        padding: 13px;
      }
      .kaiser-login-help strong { color: var(--ink, #19221c); }
      .kaiser-login-help ol {
        margin: 0;
        padding-left: 19px;
      }
      .kaiser-login-help li + li { margin-top: 5px; }
      .kaiser-login-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
      }
      .kaiser-login-actions .button { flex: 1 1 170px; }
      .kaiser-login-status {
        color: #4f9418;
        font-size: .95rem;
        font-weight: 800;
        min-height: 1.2em;
      }
      .kaiser-login-status.is-warn { color: #9c6a08; }
      .kaiser-login-status.is-danger { color: #c73636; }
      .kaiser-login-secondary-note {
        color: var(--muted, #61705e);
        font-size: .86rem;
      }
      @media (max-width: 620px) {
        .kaiser-login-gate { align-items: stretch; padding: 10px; }
        .kaiser-login-card { align-self: center; padding: 19px; }
      }
    `;
    document.head.appendChild(style);
  }

  function mount() {
    if (document.querySelector("#kaiserLoginGate")) return;
    document.body.insertAdjacentHTML(
      "beforeend",
      `
        <div class="kaiser-login-gate" id="kaiserLoginGate" role="dialog" aria-modal="true" aria-labelledby="kaiserLoginTitle">
          <article class="kaiser-login-card">
            <div>
              <div class="kaiser-login-logo" aria-label="Kaiser Servis">kaiser.</div>
            </div>
            <div class="kaiser-login-title">
              <h2 id="kaiserLoginTitle">Prihlaseni do aplikace</h2>
              <p>Zadejte firemni e-mail a heslo. Bez prihlaseni neni mozne aplikaci pouzivat.</p>
            </div>
            <div class="kaiser-login-progress" aria-hidden="true">
              <span data-login-pill="password" class="is-active">1. Prihlaseni</span>
              <span data-login-pill="done">2. Otevreno</span>
            </div>
            <section class="kaiser-login-step" data-login-step="password">
              <form class="kaiser-login-form" id="kaiserPasswordForm">
                <label>E-mail <input name="email" type="email" autocomplete="email" placeholder="oplustil@kaiserservis.cz" required /></label>
                <label>Heslo <input name="password" type="password" autocomplete="current-password" placeholder="firemni heslo" required /></label>
                <div class="kaiser-login-actions">
                  <button class="button button-primary" type="submit">Prihlasit</button>
                  <button class="button button-soft" type="button" data-login-reset>Nastavit / obnovit heslo</button>
                </div>
                <div class="kaiser-login-secondary-note">Obnova hesla odejde e-mailem pres Supabase / Twilio SendGrid.</div>
              </form>
            </section>
            <section class="kaiser-login-step" data-login-step="new-password" hidden>
              <div class="kaiser-login-help">
                <strong>Nastaveni noveho hesla</strong>
                <ol>
                  <li>Zadejte vlastni silne heslo.</li>
                  <li>Po ulozeni budete pokracovat rovnou do aplikace.</li>
                </ol>
              </div>
              <form class="kaiser-login-form" id="kaiserNewPasswordForm">
                <label>Nove heslo <input name="password" type="password" autocomplete="new-password" minlength="10" required /></label>
                <label>Zopakovat heslo <input name="passwordConfirm" type="password" autocomplete="new-password" minlength="10" required /></label>
                <div class="kaiser-login-actions">
                  <button class="button button-primary" type="submit">Ulozit heslo</button>
                </div>
              </form>
            </section>
            <div class="kaiser-login-status" data-login-status role="status" aria-live="polite"></div>
          </article>
        </div>
      `
    );
  }

  function show(visible) {
    const element = document.querySelector("#kaiserLoginGate");
    if (!element) return;
    element.classList.toggle("is-visible", visible);
    document.body.classList.toggle("kaiser-login-active", visible);
    if (visible) window.setTimeout(() => element.querySelector("[data-login-step]:not([hidden]) input")?.focus(), 40);
  }

  function step(name) {
    document.querySelectorAll("[data-login-step]").forEach((section) => {
      section.hidden = section.dataset.loginStep !== name;
    });
    document.querySelectorAll("[data-login-pill]").forEach((pill) => {
      pill.classList.toggle("is-active", pill.dataset.loginPill === (name === "password" ? "password" : "done"));
    });
  }

  function status(message, kind = "") {
    const target = document.querySelector("[data-login-status]");
    if (!target) return;
    target.textContent = message || "";
    target.className = `kaiser-login-status${kind ? ` is-${kind}` : ""}`;
  }

  function busy(value) {
    gate.busy = value;
    document.querySelectorAll("#kaiserLoginGate button, #kaiserLoginGate input").forEach((element) => {
      element.disabled = value;
    });
  }

  async function unlock(user) {
    gate.email = user?.email || gate.email;
    if (typeof window.kaiserSetLoginUser === "function") {
      window.kaiserSetLoginUser({ email: gate.email, name: user?.name || gate.email });
    }
    setAuthState(user || { email: gate.email });
    step("done");
    show(false);
    window.dispatchEvent(new CustomEvent("kaiser-auth-ready", { detail: { user } }));
    if (window.kaiserCloud?.pullState) window.setTimeout(() => window.kaiserCloud.pullState(), 250);
  }

  async function submitPassword(event) {
    event.preventDefault();
    if (gate.busy) return;
    const form = event.currentTarget;
    gate.email = String(form.elements.email.value || "").trim();
    const password = String(form.elements.password.value || "");
    if (!gate.email || !password) {
      status("Doplnte e-mail a heslo.", "warn");
      return;
    }
    busy(true);
    status("Overuji prihlaseni...");
    try {
      const supabase = await client();
      const { data, error } = await supabase.auth.signInWithPassword({ email: gate.email, password });
      form.elements.password.value = "";
      if (error) throw error;
      await unlock(data?.user || { email: gate.email });
      status("Prihlaseni hotovo. Aplikace je otevrena.", "ok");
    } catch (error) {
      const message = String(error?.message || "");
      if (message.includes("Invalid login credentials")) {
        status("E-mail nebo heslo nesedi. Zkuste obnovu hesla e-mailem.", "danger");
      } else {
        status(message || "Prihlaseni selhalo.", "danger");
      }
      step("password");
      show(true);
    } finally {
      busy(false);
    }
  }

  async function sendPasswordReset() {
    if (gate.busy) return;
    const form = document.querySelector("#kaiserPasswordForm");
    const email = String(form?.elements.email.value || "").trim().toLowerCase();
    if (!email) {
      status("Nejdrive vyplnte e-mail.", "warn");
      form?.elements.email.focus();
      return;
    }
    busy(true);
    status("Posilam e-mail pro nastaveni hesla...");
    try {
      const supabase = await client();
      const redirectTo = publicRedirectUrl();
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
      if (error) throw error;
      status("E-mail pro nastaveni hesla je odeslany.", "ok");
    } catch (error) {
      status(error?.message || "E-mail pro nastaveni hesla se nepodarilo odeslat.", "danger");
    } finally {
      busy(false);
    }
  }

  async function submitNewPassword(event) {
    event.preventDefault();
    if (gate.busy) return;
    const form = event.currentTarget;
    const password = String(form.elements.password.value || "");
    const passwordConfirm = String(form.elements.passwordConfirm.value || "");
    if (password.length < 10) {
      status("Heslo musi mit aspon 10 znaku.", "warn");
      return;
    }
    if (password !== passwordConfirm) {
      status("Hesla se neshoduji.", "warn");
      return;
    }
    busy(true);
    status("Ukladam nove heslo...");
    try {
      const supabase = await client();
      const { data, error } = await supabase.auth.updateUser({ password });
      form.reset();
      if (error) throw error;
      if (window.location.hash || window.location.search.includes("type=recovery")) {
        window.history.replaceState(null, "", window.location.pathname);
      }
      await unlock(data?.user || { email: gate.email });
      status("Heslo je ulozene. Aplikace je otevrena.", "ok");
    } catch (error) {
      status(error?.message || "Heslo se nepodarilo ulozit.", "danger");
    } finally {
      busy(false);
    }
  }

  async function boot() {
    ensureStyles();
    mount();
    setAuthState(null);
    document.querySelector("#kaiserPasswordForm")?.addEventListener("submit", submitPassword);
    document.querySelector("#kaiserNewPasswordForm")?.addEventListener("submit", submitNewPassword);
    document.querySelector("[data-login-reset]")?.addEventListener("click", sendPasswordReset);

    step("password");
    show(true);
    if (!isConfigured()) {
      status("Cloudove prihlaseni neni nastavene.", "danger");
      return;
    }
    status("Kontroluji prihlaseni...");
    try {
      const supabase = await client();
      const { data } = await supabase.auth.getSession();
      const user = data?.session?.user || null;
      const authParams = new URLSearchParams(window.location.hash.replace(/^#/, "") || window.location.search);
      const isRecovery = authParams.get("type") === "recovery";
      if (isRecovery && user) {
        gate.email = user.email || gate.email;
        step("new-password");
        show(true);
        status("Zadejte nove heslo pro svuj ucet.", "ok");
        return;
      }
      if (!user) {
        status("");
        return;
      }
      await unlock(user);
    } catch (error) {
      status(error?.message || "Prihlaseni neni dostupne.", "danger");
      step("password");
      show(true);
    }
  }

  function blockUnauthenticatedAppEvent(event) {
    if (window.kaiserIsAuthenticated()) return;
    const target = event.target;
    if (target?.closest?.("#kaiserLoginGate, #kaiser-system-notice")) return;
    if (!target?.closest?.(".app-shell, .quick-measure-dock")) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    window.kaiserRequireAuth("praci v aplikaci");
  }

  document.addEventListener("click", blockUnauthenticatedAppEvent, true);
  document.addEventListener("submit", blockUnauthenticatedAppEvent, true);
  document.addEventListener("input", blockUnauthenticatedAppEvent, true);

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();
