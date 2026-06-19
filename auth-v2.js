(function () {
  const CONFIG_KEY = "kaiser-pneu-supabase-config-v1";
  const AUTH_TIMEOUT_MS = 12000;
  const PUBLIC_APP_URL = "https://oplustil-prog.github.io/kaiser-pneu-evidence/";

  let clientPromise = null;
  let authReady = false;

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

  function escapeHtml(value) {
    return String(value || "").replace(/[&<>"']/g, (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[char]
    );
  }

  function withTimeout(promise, message) {
    let timer = 0;
    const timeout = new Promise((_, reject) => {
      timer = window.setTimeout(() => reject(new Error(message)), AUTH_TIMEOUT_MS);
    });
    return Promise.race([promise, timeout]).finally(() => window.clearTimeout(timer));
  }

  function ensureStyles() {
    if (document.querySelector("#kaiserAuthV2Styles")) return;
    const style = document.createElement("style");
    style.id = "kaiserAuthV2Styles";
    style.textContent = `
      body.kaiser-auth-v2-loading .app-shell,
      body.kaiser-auth-v2-loading .quick-measure-dock,
      body.kaiser-auth-v2-locked .app-shell,
      body.kaiser-auth-v2-locked .quick-measure-dock {
        display: none !important;
      }

      .kaiser-auth-v2 {
        position: fixed;
        inset: 0;
        z-index: 2147483000;
        display: grid;
        place-items: center;
        padding: 24px;
        overflow: auto;
        background: #f7fbf4;
        font-family: Quicksand, Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        color: #172018;
      }

      .kaiser-auth-v2-card {
        width: min(100%, 660px);
        display: grid;
        gap: 22px;
        padding: 34px;
        border: 1px solid rgba(117, 189, 37, 0.36);
        border-radius: 12px;
        background: #ffffff;
        box-shadow: 0 18px 48px rgba(31, 54, 25, 0.13);
      }

      .kaiser-auth-v2-logo {
        width: min(280px, 100%);
        padding: 16px 24px 19px;
        border-radius: 8px;
        background: #75bd25;
        color: #ffffff;
        font-size: clamp(2.4rem, 8vw, 4rem);
        line-height: 0.95;
        font-weight: 900;
        letter-spacing: 0;
      }

      .kaiser-auth-v2-card h1 {
        margin: 0 0 6px;
        font-size: clamp(2rem, 5vw, 3rem);
        line-height: 1.05;
        letter-spacing: 0;
      }

      .kaiser-auth-v2-card p {
        margin: 0;
        color: #637160;
        font-size: 1.12rem;
      }

      .kaiser-auth-v2-form {
        display: grid;
        gap: 14px;
      }

      .kaiser-auth-v2-form label {
        display: grid;
        gap: 7px;
        color: #637160;
        font-size: 0.92rem;
        font-weight: 900;
      }

      .kaiser-auth-v2-form input {
        width: 100%;
        min-height: 58px;
        border: 1px solid #bfd9b4;
        border-radius: 8px;
        padding: 0 16px;
        background: #ffffff;
        color: #172018;
        font: inherit;
        font-weight: 800;
        box-sizing: border-box;
      }

      .kaiser-auth-v2-actions {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 12px;
      }

      .kaiser-auth-v2 .button {
        appearance: none;
        border: 1px solid #bfd9b4;
        border-radius: 8px;
        padding: 0 16px;
        background: #ffffff;
        color: #172018;
        font: inherit;
        font-weight: 900;
        cursor: pointer;
      }

      .kaiser-auth-v2 .button:disabled {
        cursor: wait;
        opacity: 0.62;
      }

      .kaiser-auth-v2 .button-primary {
        border-color: #75bd25;
        background: #75bd25;
        color: #ffffff;
      }

      .kaiser-auth-v2 .button-soft {
        background: #ffffff;
      }

      .kaiser-auth-v2-actions .button {
        width: 100%;
        min-height: 54px;
      }

      .kaiser-auth-v2-status {
        min-height: 1.5em;
        color: #4c8f18;
        font-weight: 900;
      }

      .kaiser-auth-v2-status.is-warn {
        color: #a46800;
      }

      .kaiser-auth-v2-status.is-danger {
        color: #c94040;
      }

      .kaiser-auth-v2-status.is-ok {
        color: #4c8f18;
      }

      @media (max-width: 640px) {
        .kaiser-auth-v2 {
          align-items: start;
          padding: 14px;
        }

        .kaiser-auth-v2-card {
          padding: 20px;
        }

        .kaiser-auth-v2-actions {
          grid-template-columns: 1fr;
        }
      }
    `;
    document.head.appendChild(style);
  }

  async function client() {
    if (clientPromise) return clientPromise;
    const next = config();
    if (typeof window.kaiserGetSupabaseClient !== "function") {
      throw new Error("Prihlasovaci klient se nenacetl. Obnovte prosim stranku.");
    }
    clientPromise = withTimeout(
      window.kaiserGetSupabaseClient(next, {
        listenerKey: "auth-v2",
        onAuthStateChange: (event, session) => {
          if (event === "SIGNED_OUT" || event === "USER_DELETED") {
            lock("Byli jste odhlaseni. Pro dalsi praci se znovu prihlaste.");
            return;
          }
          if (session?.user?.email) open(session.user);
        }
      }),
      "Prihlaseni se nenacetlo vcas. Zkuste prosim obnovit stranku."
    ).catch((error) => {
      clientPromise = null;
      throw error;
    });
    return clientPromise;
  }

  function setAuthState(user) {
    const authenticated = Boolean(user?.email);
    window.kaiserAuthState = {
      authenticated,
      email: user?.email || "",
      user: user || null,
      checkedAt: new Date().toISOString(),
      authVersion: "v2"
    };
    window.dispatchEvent(new CustomEvent("kaiser-auth-state", { detail: window.kaiserAuthState }));
  }

  function setTopStatus(user) {
    const box = document.querySelector("#loginStatusBox");
    if (!box) return;
    if (!user?.email) {
      box.innerHTML = `
        <span class="login-status-dot" aria-hidden="true"></span>
        <span><strong>Neprihlasen</strong><small>prihlaste se pro cloud</small></span>
      `;
      return;
    }
    box.innerHTML = `
      <span class="login-status-dot" aria-hidden="true"></span>
      <span><strong>Cloud prihlasen</strong><small>${escapeHtml(user.email)}</small></span>
    `;
  }

  function authRoot() {
    ensureStyles();
    let root = document.querySelector("#kaiserAuthV2");
    if (root) return root;
    root = document.createElement("div");
    root.id = "kaiserAuthV2";
    root.className = "kaiser-auth-v2";
    root.innerHTML = `
      <main class="kaiser-auth-v2-card" role="dialog" aria-labelledby="kaiserAuthV2Title" aria-modal="true">
        <div class="kaiser-auth-v2-logo">kaiser.</div>
        <div>
          <h1 id="kaiserAuthV2Title">Prihlaseni do aplikace</h1>
          <p>Nejdrive se prihlaste firemnim e-mailem a heslem. Potom se otevre evidence pneumatik.</p>
        </div>
        <form id="kaiserAuthV2Form" class="kaiser-auth-v2-form">
          <label>E-mail <input name="email" type="email" autocomplete="email" placeholder="oplustil@kaiserservis.cz" required></label>
          <label>Heslo <input name="password" type="password" autocomplete="current-password" placeholder="firemni heslo" required></label>
          <div class="kaiser-auth-v2-actions">
            <button class="button button-primary" type="submit">Prihlasit</button>
            <button class="button button-soft" type="button" data-auth-v2-reset>Nastavit / obnovit heslo</button>
          </div>
        </form>
        <form id="kaiserAuthV2NewPasswordForm" class="kaiser-auth-v2-form" hidden>
          <label>Nove heslo <input name="password" type="password" autocomplete="new-password" minlength="10" required></label>
          <label>Zopakovat heslo <input name="passwordConfirm" type="password" autocomplete="new-password" minlength="10" required></label>
          <div class="kaiser-auth-v2-actions">
            <button class="button button-primary" type="submit">Ulozit heslo</button>
            <button class="button button-soft" type="button" data-auth-v2-back>Zpet na prihlaseni</button>
          </div>
        </form>
        <p class="kaiser-auth-v2-status" data-auth-v2-status role="status" aria-live="polite">Kontroluji prihlaseni...</p>
        <div class="kaiser-auth-v2-actions">
          <button class="button button-soft" type="button" data-auth-v2-reload>Znovu nacist aplikaci</button>
          <button class="button button-soft" type="button" data-auth-v2-clear>Odhlasit a zacit znovu</button>
        </div>
      </main>
    `;
    document.body.appendChild(root);
    root.querySelector("#kaiserAuthV2Form")?.addEventListener("submit", signIn);
    root.querySelector("#kaiserAuthV2NewPasswordForm")?.addEventListener("submit", saveNewPassword);
    root.querySelector("[data-auth-v2-reset]")?.addEventListener("click", resetPassword);
    root.querySelector("[data-auth-v2-back]")?.addEventListener("click", () => showPasswordStep(false));
    root.querySelector("[data-auth-v2-reload]")?.addEventListener("click", () => {
      window.location.href = `${PUBLIC_APP_URL}?fresh=auth-v2-${Date.now()}`;
    });
    root.querySelector("[data-auth-v2-clear]")?.addEventListener("click", signOutAndReset);
    return root;
  }

  function isRecoveryUrl() {
    const params = new URLSearchParams(window.location.hash.replace(/^#/, "") || window.location.search);
    return params.get("type") === "recovery";
  }

  function showPasswordStep(isNewPassword) {
    const root = authRoot();
    const loginForm = root.querySelector("#kaiserAuthV2Form");
    const newPasswordForm = root.querySelector("#kaiserAuthV2NewPasswordForm");
    if (loginForm) loginForm.hidden = Boolean(isNewPassword);
    if (newPasswordForm) newPasswordForm.hidden = !isNewPassword;
  }

  function status(message, kind = "") {
    const target = document.querySelector("[data-auth-v2-status]");
    if (!target) return;
    target.textContent = message || "";
    target.className = `kaiser-auth-v2-status${kind ? ` is-${kind}` : ""}`;
  }

  function busy(value) {
    document.querySelectorAll("#kaiserAuthV2 button, #kaiserAuthV2 input").forEach((node) => {
      node.disabled = value;
    });
  }

  function open(user) {
    authReady = true;
    setAuthState(user);
    setTopStatus(user);
    document.body.classList.remove("kaiser-auth-v2-loading", "kaiser-auth-v2-locked");
    document.body.classList.add("kaiser-auth-v2-open");
    document.querySelector("#kaiserAuthV2")?.remove();
    window.dispatchEvent(new CustomEvent("kaiser-auth-ready", { detail: { user } }));
    if (window.kaiserCloud?.pullState) window.setTimeout(() => window.kaiserCloud.pullState().catch(() => {}), 250);
  }

  function lock(message = "") {
    authReady = false;
    setAuthState(null);
    setTopStatus(null);
    document.body.classList.add("kaiser-auth-v2-locked");
    document.body.classList.remove("kaiser-auth-v2-loading", "kaiser-auth-v2-open");
    authRoot();
    status(message, message ? "warn" : "");
  }

  async function signIn(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const email = String(form.elements.email.value || "").trim();
    const password = String(form.elements.password.value || "");
    if (!email || !password) {
      status("Doplnte e-mail a heslo.", "warn");
      return;
    }
    busy(true);
    status("Overuji prihlaseni...");
    try {
      const supabase = await client();
      const { data, error } = await withTimeout(
        supabase.auth.signInWithPassword({ email, password }),
        "Prihlaseni trva moc dlouho. Zkuste to prosim znovu."
      );
      form.elements.password.value = "";
      if (error) throw error;
      open(data?.user || { email });
    } catch (error) {
      const message = String(error?.message || "");
      status(message.includes("Invalid login credentials") ? "E-mail nebo heslo nesedi." : message || "Prihlaseni selhalo.", "danger");
    } finally {
      busy(false);
    }
  }

  async function resetPassword() {
    const form = document.querySelector("#kaiserAuthV2Form");
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
      const redirectTo = PUBLIC_APP_URL;
      const { error } = await withTimeout(
        supabase.auth.resetPasswordForEmail(email, { redirectTo }),
        "Odeslani e-mailu trva moc dlouho. Zkuste to prosim znovu."
      );
      if (error) throw error;
      status("E-mail pro nastaveni hesla je odeslany.", "ok");
    } catch (error) {
      status(error?.message || "E-mail se nepodarilo odeslat.", "danger");
    } finally {
      busy(false);
    }
  }

  async function saveNewPassword(event) {
    event.preventDefault();
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
      const { data, error } = await withTimeout(
        supabase.auth.updateUser({ password }),
        "Ulozeni hesla trva moc dlouho. Zkuste to prosim znovu."
      );
      if (error) throw error;
      form.reset();
      if (window.location.hash || window.location.search.includes("type=recovery")) {
        window.history.replaceState(null, "", window.location.pathname);
      }
      open(data?.user || { email: window.kaiserAuthState?.email || "" });
    } catch (error) {
      status(error?.message || "Heslo se nepodarilo ulozit.", "danger");
    } finally {
      busy(false);
    }
  }

  async function signOutAndReset() {
    busy(true);
    try {
      const supabase = await client();
      await withTimeout(supabase.auth.signOut(), "Odhlaseni trva moc dlouho.");
    } catch {
      // Continue with local cleanup even if remote sign-out is slow.
    }
    try {
      localStorage.removeItem("kaiser-pneu-trusted-login-v1");
      window.kaiserClearSupabaseClients?.();
    } catch {
      // Ignore cleanup failures.
    }
    window.location.href = `${PUBLIC_APP_URL}?fresh=auth-v2-reset-${Date.now()}`;
  }

  async function checkSession() {
    document.body.classList.add("kaiser-auth-v2-loading");
    authRoot();
    try {
      const supabase = await client();
      const { data, error } = await withTimeout(
        supabase.auth.getSession(),
        "Kontrola prihlaseni trva moc dlouho. Prihlaste se prosim znovu."
      );
      if (error) throw error;
      const user = data?.session?.user || null;
      if (user?.email && isRecoveryUrl()) {
        setAuthState(user);
        setTopStatus(user);
        document.body.classList.add("kaiser-auth-v2-locked");
        document.body.classList.remove("kaiser-auth-v2-loading", "kaiser-auth-v2-open");
        authRoot();
        showPasswordStep(true);
        status("Zadejte nove heslo pro svuj ucet.", "ok");
      } else if (user?.email) {
        open(user);
      } else {
        showPasswordStep(false);
        lock("");
      }
    } catch (error) {
      lock(error?.message || "Prihlaseni neni dostupne.");
    }
  }

  window.kaiserIsAuthenticated = function () {
    return Boolean(authReady && window.kaiserAuthState?.authenticated);
  };

  window.kaiserRequireAuth = function (action = "praci v aplikaci") {
    if (window.kaiserIsAuthenticated()) return true;
    lock(`Pro ${action} se nejdrive prihlaste.`);
    return false;
  };

  window.kaiserLockApp = function (message) {
    lock(message);
  };

  window.kaiserAuthV2Open = open;
  window.kaiserAuthV2Lock = lock;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", checkSession, { once: true });
  } else {
    checkSession();
  }
})();
