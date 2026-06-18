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
        max-width: 480px;
        padding: 24px;
        width: min(100%, 480px);
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
        grid-template-columns: repeat(3, minmax(0, 1fr));
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
        letter-spacing: .18em;
        text-align: center;
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
        min-height: 210px;
        padding: 14px;
      }
      .kaiser-login-qr img {
        display: block;
        max-width: 210px;
        width: 100%;
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
              <p>Pristup je chraneny heslem a dvoufaktorovym overenim.</p>
            </div>
            <div class="kaiser-login-progress" aria-hidden="true">
              <span data-login-pill="password" class="is-active">1. Heslo</span>
              <span data-login-pill="setup">2. Nastaveni</span>
              <span data-login-pill="mfa">3. Kod</span>
            </div>
            <section class="kaiser-login-step" data-login-step="password">
              <form class="kaiser-login-form" id="kaiserPasswordForm">
                <label>E-mail <input name="email" type="email" autocomplete="email" required /></label>
                <label>Heslo <input name="password" type="password" autocomplete="current-password" required /></label>
                <div class="kaiser-login-actions">
                  <button class="button button-primary" type="submit">Prihlasit</button>
                </div>
              </form>
            </section>
            <section class="kaiser-login-step" data-login-step="setup" hidden>
              <div class="kaiser-login-setup">
                <p>Naskenujte QR kod v autentizacni aplikaci a zadejte prvni kod.</p>
                <div class="kaiser-login-qr" data-login-qr></div>
                <div class="kaiser-login-secret" data-login-secret hidden></div>
              </div>
              <form class="kaiser-login-form" id="kaiserSetupForm">
                <label>Prvni overovaci kod <input class="kaiser-login-code" name="code" type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="6" pattern="[0-9]{6}" required /></label>
                <div class="kaiser-login-actions">
                  <button class="button button-primary" type="submit">Aktivovat 2FA</button>
                  <button class="button button-soft" type="button" data-login-back>Zpet</button>
                </div>
              </form>
            </section>
            <section class="kaiser-login-step" data-login-step="mfa" hidden>
              <form class="kaiser-login-form" id="kaiserMfaForm">
                <label>Overovaci kod <input class="kaiser-login-code" name="code" type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="6" pattern="[0-9]{6}" required /></label>
                <div class="kaiser-login-actions">
                  <button class="button button-primary" type="submit">Overit kod</button>
                  <button class="button button-soft" type="button" data-login-back>Zpet</button>
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
      pill.classList.toggle("is-active", pill.dataset.loginPill === name);
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
    if (code.startsWith("data:")) return code;
    if (code.trim().startsWith("<svg")) return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(code)}`;
    return code;
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
      window.kaiserSetLoginUser({ email: gate.email, name: gate.email });
    }
    show(false);
    window.dispatchEvent(new CustomEvent("kaiser-auth-ready", { detail: { user } }));
    if (window.kaiserCloud?.pullState) window.setTimeout(() => window.kaiserCloud.pullState(), 250);
  }

  async function startSetup(supabase) {
    status("Pripravuji QR kod pro 2FA...");
    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: `Kaiser ${gate.email || "uzivatel"}`
    });
    if (error) throw error;
    gate.factor = data;
    const image = qrSrc(data?.totp?.qr_code);
    const qr = document.querySelector("[data-login-qr]");
    const secret = document.querySelector("[data-login-secret]");
    if (qr) {
      qr.innerHTML = image
        ? `<img src="${image}" alt="QR kod pro dvoufaktorove overeni" />`
        : "<p>QR kod neni dostupny. Pouzijte rucni klic.</p>";
    }
    if (secret) {
      secret.hidden = !data?.totp?.secret;
      secret.textContent = data?.totp?.secret ? `Rucni klic: ${data.totp.secret}` : "";
    }
    step("setup");
    show(true);
    status("Naskenujte QR kod a zadejte prvni 6mistny kod.", "ok");
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
    status("Zadejte 6mistny kod z autentizacni aplikace.", "ok");
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
      status(error?.message || "Prihlaseni selhalo.", "danger");
      step("password");
      show(true);
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
    document.querySelector("#kaiserPasswordForm")?.addEventListener("submit", submitPassword);
    document.querySelector("#kaiserSetupForm")?.addEventListener("submit", (event) => submitCode(event, true));
    document.querySelector("#kaiserMfaForm")?.addEventListener("submit", (event) => submitCode(event, false));
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

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();
