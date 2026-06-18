(function () {
  const CONFIG_KEY = "kaiser-pneu-supabase-config-v1";
  const SUPABASE_MODULE_URL = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
  const gate = {
    client: null,
    clientKey: "",
    factor: null,
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
      .kaiser-login-setup p {
        color: var(--muted, #61705e);
        line-height: 1.45;
        margin: 0;
      }
      .kaiser-login-progress {
        display: grid;
        gap: 8px;
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
      .kaiser-login-progress span {
        background: rgba(30, 41, 36, .07);
        border-radius: 999px;
        color: var(--muted, #61705e);
        font-size: .72rem;
        font-weight: 900;
        padding: 7px 9px;
        text-align: center;
      }
      .kaiser-login-progress span.is-active {
        background: rgba(117, 189, 37, .16);
        color: var(--brand-strong, #579718);
      }
      .kaiser-login-step,
      .kaiser-login-form {
        display: grid;
        gap: 13px;
      }
      .kaiser-login-step[hidden] { display: none; }
      .kaiser-login-form label {
        color: var(--muted, #61705e);
        display: grid;
        font-weight: 900;
        gap: 7px;
      }
      .kaiser-login-form input {
        border: 1px solid var(--line, #dce8d5);
        border-radius: 8px;
        color: var(--ink, #19221c);
        font: inherit;
        font-weight: 800;
        min-height: 46px;
        padding: 11px 13px;
      }
      .kaiser-login-code {
        font-size: 1.35rem;
        letter-spacing: .08em;
        text-align: center;
      }
      .kaiser-login-help {
        background: rgba(117, 189, 37, .09);
        border: 1px solid rgba(117, 189, 37, .24);
        border-radius: 8px;
        color: var(--ink, #19221c);
        display: grid;
        gap: 8px;
        line-height: 1.38;
        padding: 13px;
      }
      .kaiser-login-help strong {
        color: var(--brand-strong, #579718);
      }
      .kaiser-login-help ol {
        margin: 0;
        padding-left: 20px;
      }
      .kaiser-login-help li + li {
        margin-top: 4px;
      }
      .kaiser-login-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
      }
      .kaiser-login-actions .button { flex: 1 1 150px; }
      .kaiser-login-status {
        color: var(--muted, #61705e);
        font-size: .9rem;
        font-weight: 800;
        min-height: 20px;
      }
      .kaiser-login-status.is-ok { color: var(--brand-strong, #579718); }
      .kaiser-login-status.is-warn { color: #9c6a08; }
      .kaiser-login-status.is-danger { color: #c73636; }
      .kaiser-login-qr {
        background: #fff;
        border: 1px solid var(--line, #dce8d5);
        border-radius: 8px;
        display: grid;
        justify-items: center;
        min-height: 230px;
        padding: 14px;
      }
      .kaiser-login-qr img {
        display: block;
        max-width: 210px;
        width: 100%;
      }
      .kaiser-login-qr p {
        color: var(--muted, #61705e);
        font-weight: 800;
        margin: 0;
        text-align: center;
      }
      .kaiser-login-secret {
        background: rgba(117, 189, 37, .08);
        border: 1px solid rgba(117, 189, 37, .26);
        border-radius: 8px;
        color: var(--ink, #19221c);
        font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
        font-size: .86rem;
        font-weight: 800;
        overflow-wrap: anywhere;
        padding: 10px;
      }
      .kaiser-login-secondary-note {
        color: var(--muted, #61705e);
        font-size: .86rem;
        font-weight: 800;
        line-height: 1.35;
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
              <p>Nejdrive zadejte firemni e-mail a heslo. U Supabase uctu se overovaci kod zadava az v dalsim kroku.</p>
            </div>
            <div class="kaiser-login-progress" aria-hidden="true">
              <span data-login-pill="password" class="is-active">1. Prihlaseni</span>
              <span data-login-pill="verify">2. Overeni</span>
            </div>
            <section class="kaiser-login-step" data-login-step="password">
              <form class="kaiser-login-form" id="kaiserPasswordForm">
                <label>E-mail <input name="email" type="email" autocomplete="email" placeholder="oplustil@kaiserservis.cz" required /></label>
                <label>Heslo <input name="password" type="password" autocomplete="current-password" placeholder="firemni heslo" required /></label>
                <div class="kaiser-login-actions">
                  <button class="button button-primary" type="submit">Prihlasit</button>
                  <button class="button button-soft" type="button" data-login-reset>Obnovit e-mailem</button>
                </div>
                <div class="kaiser-login-secondary-note">Kdyz e-mail neprijde, spravce zkontroluje ucet v Supabase.</div>
              </form>
            </section>
            <section class="kaiser-login-step" data-login-step="new-password" hidden>
              <div class="kaiser-login-help">
                <strong>Nastaveni noveho hesla</strong>
                <ol>
                  <li>Zadejte vlastni silne heslo.</li>
                  <li>Po ulozeni budete pokracovat do overeni 2FA.</li>
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
            <section class="kaiser-login-step" data-login-step="setup" hidden>
              <div class="kaiser-login-help">
                <strong>Prvni nastaveni dvoufaktoru</strong>
                <ol>
                  <li>Otevrite v telefonu Microsoft Authenticator, Google Authenticator nebo 1Password.</li>
                  <li>Naskenujte QR kod nize.</li>
                  <li>Do pole pod QR kodem napiste 6 cislic z telefonu. Nepiste rucni klic.</li>
                </ol>
              </div>
              <div class="kaiser-login-setup">
                <div class="kaiser-login-qr" data-login-qr></div>
                <div class="kaiser-login-secret" data-login-secret hidden></div>
              </div>
              <form class="kaiser-login-form" id="kaiserSetupForm">
                <label>6mistny kod z aplikace <input class="kaiser-login-code" name="code" type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="6" pattern="[0-9]{6}" placeholder="123456" required /></label>
                <div class="kaiser-login-actions">
                  <button class="button button-primary" type="submit">Aktivovat a pokracovat</button>
                  <button class="button button-soft" type="button" data-login-back>Zpet na prihlaseni</button>
                </div>
                <div class="kaiser-login-secondary-note">Rucni klic slouzi jen jako zaloha, kdyz nejde naskenovat QR kod.</div>
              </form>
            </section>
            <section class="kaiser-login-step" data-login-step="mfa" hidden>
              <form class="kaiser-login-form" id="kaiserMfaForm">
                <label>6mistny kod z aplikace <input class="kaiser-login-code" name="code" type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="6" pattern="[0-9]{6}" placeholder="123456" required /></label>
                <div class="kaiser-login-actions">
                  <button class="button button-primary" type="submit">Overit a otevrit aplikaci</button>
                  <button class="button button-soft" type="button" data-login-back>Zpet na prihlaseni</button>
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
    const activePill = name === "setup" || name === "mfa" ? "verify" : "password";
    document.querySelectorAll("[data-login-pill]").forEach((pill) => {
      pill.classList.toggle("is-active", pill.dataset.loginPill === activePill);
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

  function cleanCode(form) {
    return String(form.elements.code.value || "").replace(/\D/g, "");
  }

  function verifiedFactors(data) {
    const factors = [...(data?.totp || []), ...(data?.phone || []), ...(data?.all || [])];
    const unique = new Map();
    factors.forEach((factor) => {
      if (factor?.id && factor.status === "verified") unique.set(factor.id, factor);
    });
    return [...unique.values()];
  }

  function qrSrc(value) {
    const code = String(value || "");
    if (!code) return "";
    const trimmed = code.trim();
    if (trimmed.startsWith("<svg")) return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(trimmed)}`;
    if (trimmed.startsWith("data:image/svg+xml")) {
      const comma = trimmed.indexOf(",");
      if (comma > -1 && trimmed.slice(comma + 1).trim().startsWith("<svg")) {
        return `${trimmed.slice(0, comma)},${encodeURIComponent(trimmed.slice(comma + 1))}`;
      }
      return trimmed;
    }
    if (trimmed.startsWith("data:")) return trimmed;
    return trimmed;
  }

  function renderQr(qr, rawQrCode) {
    qr.replaceChildren();
    const source = qrSrc(rawQrCode);
    if (!source) {
      const message = document.createElement("p");
      message.textContent = "QR kod neni dostupny. Pouzijte rucni klic nize.";
      qr.appendChild(message);
      return;
    }
    const image = document.createElement("img");
    image.alt = "QR kod pro dvoufaktorove overeni";
    image.decoding = "async";
    image.loading = "eager";
    image.src = source;
    image.addEventListener("error", () => {
      qr.replaceChildren();
      const message = document.createElement("p");
      message.textContent = "QR kod se nepodarilo zobrazit. Pouzijte rucni klic nize.";
      qr.appendChild(message);
    }, { once: true });
    qr.appendChild(image);
  }

  async function firstVerifiedFactor(supabase) {
    const { data, error } = await supabase.auth.mfa.listFactors();
    if (error) throw error;
    return verifiedFactors(data)[0] || null;
  }

  async function aal(supabase) {
    const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (error) return null;
    return data || null;
  }

  async function unlock(user) {
    gate.factor = null;
    gate.email = user?.email || gate.email;
    if (typeof window.kaiserSetLoginUser === "function") {
      window.kaiserSetLoginUser({ email: gate.email, name: user?.name || gate.email });
    }
    setAuthState(user || { email: gate.email });
    show(false);
    window.dispatchEvent(new CustomEvent("kaiser-auth-ready", { detail: { user } }));
    if (window.kaiserCloud?.pullState) window.setTimeout(() => window.kaiserCloud.pullState(), 250);
  }

  async function startSetup(supabase) {
    status("Pripravuji QR kod pro 2FA...");
    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: `Kaiser aplikace ${new Date().toISOString().replace(/[:.]/g, "-")}`
    });
    if (error) throw error;
    gate.factor = data;
    const qr = document.querySelector("[data-login-qr]");
    const secret = document.querySelector("[data-login-secret]");
    if (qr) renderQr(qr, data?.totp?.qr_code);
    if (secret) {
      secret.hidden = !data?.totp?.secret;
      secret.textContent = data?.totp?.secret ? `Rucni klic pro zalozni zadani: ${data.totp.secret}` : "";
    }
    step("setup");
    show(true);
    status("Zadejte 6 cislic z Authenticatoru. Neopisujte rucni klic.", "ok");
  }

  async function afterPassword(supabase, user) {
    gate.email = user?.email || gate.email;
    const level = await aal(supabase);
    if (level?.currentLevel === "aal2") {
      await unlock(user);
      return;
    }
    const factor = await firstVerifiedFactor(supabase);
    if (!factor) {
      await startSetup(supabase);
      return;
    }
    gate.factor = factor;
    step("mfa");
    show(true);
    status("Zadejte 6 cislic z Authenticatoru.", "ok");
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
      await afterPassword(supabase, data?.user || { email: gate.email });
    } catch (error) {
      const message = String(error?.message || "");
      if (message.includes("friendly name") && message.includes("already exists")) {
        status("Rozpracovane 2FA uz existuje. Zkuste prihlaseni znovu, pripravi se novy QR kod.", "danger");
      } else if (message.includes("Invalid login credentials")) {
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
      const redirectTo = `${window.location.origin}${window.location.pathname}`;
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
      if (error) throw error;
      status("E-mail pro nastaveni hesla je odeslany. Otevrete odkaz v dorucene poste.", "ok");
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
      status("Heslo je ulozene. Pokracujte overenim.", "ok");
      await afterPassword(supabase, data?.user || { email: gate.email });
    } catch (error) {
      status(error?.message || "Heslo se nepodarilo ulozit.", "danger");
    } finally {
      busy(false);
    }
  }

  async function verifyCurrentFactor(code, setupMode) {
    if (!gate.factor?.id) throw new Error("2FA faktor neni pripraveny.");
    const supabase = await client();
    const { error } = await supabase.auth.mfa.challengeAndVerify({
      factorId: gate.factor.id,
      code
    });
    if (error) throw error;
    const { data } = await supabase.auth.getSession();
    await unlock(data?.session?.user || { email: gate.email });
    status(setupMode ? "2FA je aktivni." : "Prihlaseni overeno.", "ok");
  }

  async function submitCode(event, setupMode) {
    event.preventDefault();
    if (gate.busy) return;
    const form = event.currentTarget;
    const code = cleanCode(form);
    if (code.length !== 6) {
      status("Kod musi mit 6 cislic.", "warn");
      return;
    }
    busy(true);
    status(setupMode ? "Aktivuji 2FA..." : "Overuji kod...");
    try {
      await verifyCurrentFactor(code, setupMode);
    } catch (error) {
      status(error?.message || "Overeni kodu selhalo.", "danger");
      form.elements.code.value = "";
    } finally {
      busy(false);
    }
  }

  async function backToPassword() {
    busy(true);
    try {
      const supabase = await client();
      await supabase.auth.signOut();
    } catch {
      // Login window remains active even if sign-out cleanup cannot reach Supabase.
    } finally {
      gate.factor = null;
      busy(false);
      step("password");
      status("");
      show(true);
    }
  }

  async function boot() {
    ensureStyles();
    mount();
    setAuthState(null);
    document.querySelector("#kaiserPasswordForm")?.addEventListener("submit", submitPassword);
    document.querySelector("#kaiserSetupForm")?.addEventListener("submit", (event) => submitCode(event, true));
    document.querySelector("#kaiserMfaForm")?.addEventListener("submit", (event) => submitCode(event, false));
    document.querySelector("#kaiserNewPasswordForm")?.addEventListener("submit", submitNewPassword);
    document.querySelector("[data-login-reset]")?.addEventListener("click", sendPasswordReset);
    document.querySelectorAll(".kaiser-login-code").forEach((input) => {
      input.addEventListener("input", () => {
        input.value = String(input.value || "").replace(/\D/g, "").slice(0, 6);
      });
    });
    document.querySelectorAll("[data-login-back]").forEach((button) => button.addEventListener("click", backToPassword));

    show(true);
    step("password");
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
      await afterPassword(supabase, user);
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
