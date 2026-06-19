(function () {
  const CONFIG_KEY = "kaiser-pneu-supabase-config-v1";
  const SUPABASE_MODULE_URL = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
  const AUTH_TIMEOUT_MS = 10000;

  let client = null;
  let clientKey = "";
  let clientPromise = null;
  let busy = false;

  window.kaiserAuthState = {
    authenticated: false,
    email: "",
    user: null,
    authVersion: "simple"
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

  function hasConfig(next = config()) {
    return Boolean(String(next.url || "").trim() && String(next.anonKey || "").trim());
  }

  async function supabaseClient() {
    const next = config();
    if (!hasConfig(next)) throw new Error("Cloudove prihlaseni neni nastavene.");

    const key = `${next.url}|${next.anonKey}`;
    if (client && clientKey === key) return client;
    if (clientPromise && clientKey === key) return clientPromise;

    clientKey = key;
    clientPromise = import(SUPABASE_MODULE_URL)
      .then((module) => {
        client = module.createClient(next.url.trim(), next.anonKey.trim(), {
          auth: {
            autoRefreshToken: true,
            persistSession: true,
            detectSessionInUrl: false
          }
        });
        return client;
      })
      .finally(() => {
        clientPromise = null;
      });
    return clientPromise;
  }

  function withTimeout(promise, message) {
    let timer = 0;
    const timeout = new Promise((_, reject) => {
      timer = window.setTimeout(() => reject(new Error(message)), AUTH_TIMEOUT_MS);
    });
    return Promise.race([promise, timeout]).finally(() => window.clearTimeout(timer));
  }

  function text(value) {
    return String(value || "").replace(/[&<>"']/g, (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[char]
    );
  }

  function ensureStyles() {
    if (document.querySelector("#kaiserAuthSimpleStyles")) return;
    const style = document.createElement("style");
    style.id = "kaiserAuthSimpleStyles";
    style.textContent = `
      body.kaiser-auth-simple-locked { overflow: hidden; }

      body.kaiser-auth-simple-locked .app-shell,
      body.kaiser-auth-simple-locked .quick-measure-dock {
        filter: blur(2px);
        pointer-events: none;
        user-select: none;
      }

      .kaiser-auth-simple {
        align-items: center;
        background: rgba(245, 248, 243, .92);
        display: none;
        inset: 0;
        justify-content: center;
        padding: 18px;
        position: fixed;
        z-index: 3000;
      }

      .kaiser-auth-simple.is-visible { display: flex; }

      .kaiser-auth-simple-card {
        background: #ffffff;
        border: 1px solid rgba(117, 189, 37, .34);
        border-radius: 8px;
        box-shadow: 0 28px 80px rgba(25, 34, 28, .2);
        display: grid;
        gap: 18px;
        max-width: 460px;
        padding: 24px;
        width: min(100%, 460px);
      }

      .kaiser-auth-simple-logo {
        align-items: center;
        background: var(--brand, #75bd25);
        border-radius: 7px;
        color: #ffffff;
        display: inline-flex;
        font-size: 2.1rem;
        font-weight: 900;
        height: 58px;
        line-height: 1;
        padding: 0 12px 4px;
        width: 178px;
      }

      .kaiser-auth-simple-card h2 {
        color: var(--ink, #19221c);
        font-size: 1.55rem;
        line-height: 1.14;
        margin: 0 0 6px;
      }

      .kaiser-auth-simple-card p {
        color: var(--muted, #61705e);
        line-height: 1.45;
        margin: 0;
      }

      .kaiser-auth-simple-form {
        display: grid;
        gap: 13px;
      }

      .kaiser-auth-simple-form label {
        color: var(--muted, #61705e);
        display: grid;
        font-weight: 900;
        gap: 7px;
      }

      .kaiser-auth-simple-form input {
        border: 1px solid var(--line, #dce8d5);
        border-radius: 8px;
        color: var(--ink, #19221c);
        font: inherit;
        font-weight: 800;
        min-height: 46px;
        padding: 11px 13px;
      }

      .kaiser-auth-simple-status {
        color: var(--muted, #61705e);
        font-size: .9rem;
        font-weight: 800;
        min-height: 20px;
      }

      .kaiser-auth-simple-status.is-ok { color: var(--brand-strong, #579718); }
      .kaiser-auth-simple-status.is-warn { color: #9c6a08; }
      .kaiser-auth-simple-status.is-danger { color: #c73636; }

      .login-status-card.is-logged-out {
        border-color: rgba(243, 181, 63, .44);
        background: rgba(243, 181, 63, .13);
      }

      .login-status-card.is-logged-out .login-status-dot {
        background: #f3b53f;
        box-shadow: 0 0 0 5px rgba(243, 181, 63, .18);
      }

      .login-status-card .auth-logout-button {
        margin-left: 4px;
        min-height: 30px;
        padding: 6px 10px;
      }

      @media (max-width: 620px) {
        .kaiser-auth-simple {
          align-items: stretch;
          padding: 10px;
        }

        .kaiser-auth-simple-card {
          align-self: center;
          padding: 19px;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function authRoot() {
    let root = document.querySelector("#kaiserAuthSimple");
    if (root) return root;

    document.body.insertAdjacentHTML(
      "beforeend",
      `
        <div class="kaiser-auth-simple" id="kaiserAuthSimple" role="dialog" aria-modal="true" aria-labelledby="kaiserAuthSimpleTitle">
          <main class="kaiser-auth-simple-card">
            <div class="kaiser-auth-simple-logo" aria-label="Kaiser Servis">kaiser.</div>
            <div>
              <h2 id="kaiserAuthSimpleTitle">Prihlaseni do aplikace</h2>
              <p>Evidence je dostupna po prihlaseni e-mailem a heslem.</p>
            </div>
            <form class="kaiser-auth-simple-form" id="kaiserAuthSimpleForm">
              <label>E-mail <input name="email" type="email" autocomplete="email" required /></label>
              <label>Heslo <input name="password" type="password" autocomplete="current-password" required /></label>
              <button class="button button-primary" type="submit">Prihlasit</button>
            </form>
            <p class="kaiser-auth-simple-status" data-auth-simple-status role="status" aria-live="polite"></p>
          </main>
        </div>
      `
    );

    root = document.querySelector("#kaiserAuthSimple");
    root.querySelector("#kaiserAuthSimpleForm")?.addEventListener("submit", signIn);
    return root;
  }

  function status(message, kind = "") {
    const target = document.querySelector("[data-auth-simple-status]");
    if (!target) return;
    target.textContent = message || "";
    target.className = `kaiser-auth-simple-status${kind ? ` is-${kind}` : ""}`;
  }

  function setBusy(value) {
    busy = value;
    document.querySelectorAll("#kaiserAuthSimple button, #kaiserAuthSimple input").forEach((element) => {
      element.disabled = value;
    });
  }

  function renderHeader() {
    const box = document.querySelector("#loginStatusBox");
    if (!box) return;

    const state = window.kaiserAuthState || {};
    if (!state.authenticated) {
      box.classList.add("is-logged-out");
      box.innerHTML = `
        <span class="login-status-dot" aria-hidden="true"></span>
        <span>
          <strong>Cloud zamceny</strong>
          <small>cloud je zamceny</small>
        </span>
      `;
      box.title = "";
      return;
    }

    const email = String(state.email || state.user?.email || "").trim();
    const users = Array.isArray(window.state?.users) ? window.state.users : [];
    const knownUser = users.find((item) => item.email === email);
    const name = knownUser?.name || email || "uzivatel";

    box.classList.remove("is-logged-out");
    box.innerHTML = `
      <span class="login-status-dot" aria-hidden="true"></span>
      <span>
        <strong>Cloud prihlasen</strong>
        <small>${text(name)}</small>
      </span>
      <button class="button button-soft auth-logout-button" type="button" data-auth-simple-logout>Odhlasit</button>
    `;
    box.title = email;
  }

  function showLogin() {
    const root = authRoot();
    root.classList.add("is-visible");
    document.body.classList.add("kaiser-auth-simple-locked");
    window.setTimeout(() => root.querySelector("input[name='email']")?.focus(), 40);
  }

  function hideLogin() {
    document.querySelector("#kaiserAuthSimple")?.classList.remove("is-visible");
    document.body.classList.remove("kaiser-auth-simple-locked");
  }

  function setAuth(user) {
    const email = String(user?.email || "").trim();
    const authenticated = Boolean(email);
    window.kaiserAuthState = {
      authenticated,
      email,
      user: user || null,
      authVersion: "simple"
    };
    renderHeader();
    window.dispatchEvent(new CustomEvent("kaiser-auth-state", { detail: window.kaiserAuthState }));
    window.dispatchEvent(
      new CustomEvent(authenticated ? "kaiser-auth-ready" : "kaiser-auth-locked", {
        detail: window.kaiserAuthState
      })
    );
  }

  async function signIn(event) {
    event.preventDefault();
    if (busy) return;

    const form = event.currentTarget;
    const email = String(form.elements.email.value || "").trim();
    const password = String(form.elements.password.value || "");
    if (!email || !password) {
      status("Doplnte e-mail a heslo.", "warn");
      return;
    }

    setBusy(true);
    status("Prihlasuji...");
    try {
      const supabase = await supabaseClient();
      const { data, error } = await withTimeout(
        supabase.auth.signInWithPassword({ email, password }),
        "Pripojeni trva moc dlouho. Zkuste to prosim znovu."
      );
      form.elements.password.value = "";
      if (error) throw error;
      setAuth(data?.user || { email });
      status("Prihlaseno.", "ok");
      hideLogin();
    } catch (error) {
      const message = String(error?.message || "");
      status(message.includes("Invalid login credentials") ? "E-mail nebo heslo nesedi." : message || "Prihlaseni selhalo.", "danger");
      setAuth(null);
      showLogin();
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    if (busy) return;
    setBusy(true);
    try {
      const supabase = await supabaseClient();
      await withTimeout(supabase.auth.signOut(), "Odhlaseni trva moc dlouho.");
    } catch {
      // The local lock is still safer if remote sign-out cannot finish.
    } finally {
      setAuth(null);
      window.dispatchEvent(new CustomEvent("kaiser-auth-signed-out", { detail: window.kaiserAuthState }));
      showLogin();
      status("Odhlaseno.", "ok");
      setBusy(false);
    }
  }

  async function boot() {
    ensureStyles();
    document.querySelector("#kaiser-system-notice")?.remove();
    document.querySelector("#kaiser-system-notice-style")?.remove();
    authRoot();
    renderHeader();

    if (!hasConfig()) {
      setAuth(null);
      showLogin();
      status("Cloudove prihlaseni neni nastavene.", "danger");
      return;
    }

    showLogin();
    status("Kontroluji prihlaseni...");
    try {
      const supabase = await supabaseClient();
      const { data, error } = await withTimeout(
        supabase.auth.getSession(),
        "Kontrola prihlaseni trva moc dlouho. Zkuste to prosim znovu."
      );
      if (error) throw error;
      const user = data?.session?.user || null;
      if (user) {
        setAuth(user);
        hideLogin();
        status("");
      } else {
        setAuth(null);
        showLogin();
        status("");
      }
    } catch (error) {
      setAuth(null);
      showLogin();
      status(error?.message || "Prihlaseni neni dostupne.", "danger");
    }
  }

  window.kaiserAuthSimple = {
    getClient: supabaseClient,
    renderHeader,
    signOut
  };

  document.addEventListener("click", (event) => {
    if (event.target.closest("[data-auth-simple-logout]")) signOut();
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
}());
