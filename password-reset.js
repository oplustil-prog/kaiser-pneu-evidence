(function () {
  const CONFIG_KEY = "kaiser-pneu-supabase-config-v1";
  const SUPABASE_MODULE_URL = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
  let supabaseClient = null;
  let clientKey = "";

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
    return { ...defaults, ...readJson(CONFIG_KEY, {}) };
  }

  async function client() {
    const next = config();
    const key = `${next.url}|${next.anonKey}`;
    if (supabaseClient && clientKey === key) return supabaseClient;
    const module = await import(SUPABASE_MODULE_URL);
    supabaseClient = module.createClient(next.url.trim(), next.anonKey.trim(), {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
      }
    });
    clientKey = key;
    return supabaseClient;
  }

  function status(message, kind = "") {
    const target = document.querySelector("[data-login-status]");
    if (!target) return;
    target.textContent = message || "";
    target.className = `kaiser-login-status${kind ? ` is-${kind}` : ""}`;
  }

  function emailValue() {
    const form = document.querySelector("#kaiserPasswordForm");
    return String(form?.elements.email.value || "").trim().toLowerCase();
  }

  async function sendPasswordReset() {
    const email = emailValue();
    const form = document.querySelector("#kaiserPasswordForm");
    if (!email) {
      status("Nejdrive vyplnte e-mail.", "warn");
      form?.elements.email.focus();
      return;
    }
    status("Posilam e-mail pro nastaveni hesla pres Twilio SendGrid...");
    try {
      const supabase = await client();
      const redirectTo = `${window.location.origin}${window.location.pathname}`;
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
      if (error) throw error;
      status("E-mail pro nastaveni hesla je odeslany. Pokud neprijde, zkontrolujte Twilio SendGrid SMTP v Supabase.", "ok");
    } catch (error) {
      status(error?.message || "E-mail pro nastaveni hesla se nepodarilo odeslat. Zkontrolujte Twilio SendGrid SMTP.", "danger");
    }
  }

  function ensureResetButton() {
    const form = document.querySelector("#kaiserPasswordForm");
    if (!form || form.querySelector("[data-login-reset], [data-password-reset]")) return;
    const actions = form.querySelector(".kaiser-login-actions");
    if (!actions) return;
    const button = document.createElement("button");
    button.className = "button button-soft";
    button.type = "button";
    button.dataset.passwordReset = "true";
    button.textContent = "Nastavit / obnovit heslo";
    button.addEventListener("click", sendPasswordReset);
    actions.appendChild(button);
    const note = document.createElement("div");
    note.className = "kaiser-login-secondary-note";
    note.textContent = "Pri prvnim prihlaseni zadejte e-mail a kliknete na obnovu hesla. Odkaz odesle Supabase pres Twilio SendGrid SMTP.";
    form.appendChild(note);
  }

  function ensureStyles() {
    if (document.querySelector("#kaiserPasswordResetStyle")) return;
    const style = document.createElement("style");
    style.id = "kaiserPasswordResetStyle";
    style.textContent = `
      .kaiser-password-reset {
        align-items: center;
        background: rgba(245, 248, 243, .92);
        display: none;
        inset: 0;
        justify-content: center;
        padding: 18px;
        position: fixed;
        z-index: 2700;
      }
      .kaiser-password-reset.is-visible { display: flex; }
      .kaiser-password-reset-card {
        background: #fff;
        border: 1px solid rgba(117, 189, 37, .34);
        border-radius: 8px;
        box-shadow: 0 28px 80px rgba(25, 34, 28, .2);
        display: grid;
        gap: 14px;
        max-width: 460px;
        padding: 24px;
        width: min(100%, 460px);
      }
      .kaiser-password-reset-card h2 { margin: 0; }
      .kaiser-password-reset-card p { color: var(--muted, #61705e); margin: 0; }
      .kaiser-password-reset-card label { display: grid; gap: 7px; font-weight: 900; color: var(--muted, #61705e); }
      .kaiser-password-reset-card input {
        border: 1px solid var(--line, #dce8d5);
        border-radius: 8px;
        color: var(--ink, #19221c);
        font: inherit;
        font-weight: 800;
        min-height: 46px;
        padding: 11px 13px;
      }
    `;
    document.head.appendChild(style);
  }

  function mountRecoveryDialog() {
    if (document.querySelector("#kaiserPasswordReset")) return;
    document.body.insertAdjacentHTML("beforeend", `
      <div class="kaiser-password-reset" id="kaiserPasswordReset" role="dialog" aria-modal="true">
        <form class="kaiser-password-reset-card" id="kaiserPasswordResetForm">
          <h2>Nastaveni noveho hesla</h2>
          <p>Zadejte vlastni heslo. Po ulozeni se aplikace znovu otevre pro prihlaseni a 2FA.</p>
          <label>Nove heslo <input name="password" type="password" minlength="10" autocomplete="new-password" required /></label>
          <label>Zopakovat heslo <input name="passwordConfirm" type="password" minlength="10" autocomplete="new-password" required /></label>
          <button class="button button-primary" type="submit">Ulozit heslo</button>
          <div class="kaiser-login-status" data-reset-status role="status" aria-live="polite"></div>
        </form>
      </div>
    `);
    document.querySelector("#kaiserPasswordResetForm").addEventListener("submit", saveNewPassword);
  }

  function resetStatus(message, kind = "") {
    const target = document.querySelector("[data-reset-status]");
    if (!target) return;
    target.textContent = message || "";
    target.className = `kaiser-login-status${kind ? ` is-${kind}` : ""}`;
  }

  async function saveNewPassword(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const password = String(form.elements.password.value || "");
    const passwordConfirm = String(form.elements.passwordConfirm.value || "");
    if (password.length < 10) {
      resetStatus("Heslo musi mit aspon 10 znaku.", "warn");
      return;
    }
    if (password !== passwordConfirm) {
      resetStatus("Hesla se neshoduji.", "warn");
      return;
    }
    resetStatus("Ukladam nove heslo...");
    try {
      const supabase = await client();
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      await supabase.auth.signOut();
      window.history.replaceState(null, "", window.location.pathname);
      window.location.reload();
    } catch (error) {
      resetStatus(error?.message || "Heslo se nepodarilo ulozit.", "danger");
    }
  }

  function isRecoveryUrl() {
    const params = new URLSearchParams(window.location.hash.replace(/^#/, "") || window.location.search);
    return params.get("type") === "recovery";
  }

  function showRecoveryIfNeeded() {
    if (!isRecoveryUrl()) return;
    if (document.querySelector("#kaiserNewPasswordForm")) return;
    ensureStyles();
    mountRecoveryDialog();
    document.querySelector("#kaiserPasswordReset")?.classList.add("is-visible");
  }

  function boot() {
    ensureStyles();
    ensureResetButton();
    showRecoveryIfNeeded();
    const observer = new MutationObserver(() => ensureResetButton());
    observer.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();