(function () {
  const STORAGE_KEY = "kaiser-pneu-evidence-v5";

  function toast(message) {
    if (typeof window.showToast === "function") window.showToast(message);
  }

  function readState() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    } catch {
      return {};
    }
  }

  function randomHex(byteLength = 16) {
    const bytes = new Uint8Array(byteLength);
    crypto.getRandomValues(bytes);
    return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  }

  async function digestHex(value) {
    const bytes = new TextEncoder().encode(value);
    const hash = await crypto.subtle.digest("SHA-256", bytes);
    return [...new Uint8Array(hash)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  }

  async function passwordPayload(email, password) {
    const salt = randomHex();
    return {
      passwordHash: `sha256$${salt}$${await digestHex(`${salt}:${String(email || "").toLowerCase()}:${password}`)}`,
      passwordMode: "manual",
      passwordSetAt: new Date().toISOString(),
      mustChangePassword: true
    };
  }

  function ensureStyles() {
    if (document.querySelector("#kaiserManualPasswordsStyle")) return;
    const style = document.createElement("style");
    style.id = "kaiserManualPasswordsStyle";
    style.textContent = `
      .user-password-note {
        grid-column: 1 / -1;
        margin: -2px 0 0;
        color: var(--muted, #61705e);
        font-size: .88rem;
        font-weight: 700;
        line-height: 1.35;
      }
    `;
    document.head.appendChild(style);
  }

  function ensureFields() {
    const form = document.querySelector("#userForm");
    if (!form || form.elements.manualPassword) return;
    const actions = form.querySelector(".user-form-actions") || form.querySelector('button[type="submit"]');
    if (!actions) return;
    actions.insertAdjacentHTML(
      "beforebegin",
      `
        <label>
          Docasne heslo
          <input name="manualPassword" type="password" autocomplete="new-password" minlength="8" placeholder="volitelne pro rucni prihlaseni" />
        </label>
        <label>
          Zopakovat heslo
          <input name="manualPasswordConfirm" type="password" autocomplete="new-password" minlength="8" placeholder="stejne heslo znovu" />
        </label>
        <p class="user-password-note">
          Vyplnte jen kdyz chcete nastavit nebo zmenit firemni heslo. Heslo se ulozi jako hash.
        </p>
      `
    );
  }

  function formUserData(form) {
    const data = Object.fromEntries(new FormData(form).entries());
    return {
      name: String(data.name || "").trim(),
      email: String(data.email || "").trim().toLowerCase(),
      role: data.role,
      depot: data.depot,
      status: data.status,
      phone: String(data.phone || "").trim()
    };
  }

  function upsertUser(userData) {
    if (!Array.isArray(state.users)) state.users = [];
    const existing = state.users.find((user) => String(user.email || "").toLowerCase() === userData.email);
    const completeUserData = {
      ...userData,
      lastActive: userData.status === "pozvanka" ? "ceka na prvni prihlaseni" : existing?.lastActive || new Date().toISOString().slice(0, 10)
    };
    if (existing) {
      Object.assign(existing, completeUserData);
      return { user: existing, existing: true };
    }
    const user = {
      id: `USR-${String(Date.now()).slice(-6)}`,
      ...completeUserData
    };
    state.users.unshift(user);
    return { user, existing: false };
  }

  async function handleUserSubmit(event) {
    const form = event.target.closest("#userForm");
    if (!form) return;
    const password = String(form.elements.manualPassword?.value || "");
    const passwordConfirm = String(form.elements.manualPasswordConfirm?.value || "");
    if (!password && !passwordConfirm) return;

    event.preventDefault();
    event.stopImmediatePropagation();

    if (!form.reportValidity()) return;
    if (password.length < 8) {
      toast("Docasne heslo musi mit aspon 8 znaku.");
      form.elements.manualPassword?.focus();
      return;
    }
    if (password !== passwordConfirm) {
      toast("Docasna hesla se neshoduji.");
      form.elements.manualPasswordConfirm?.focus();
      return;
    }

    const userData = formUserData(form);
    const payload = await passwordPayload(userData.email, password);
    upsertUser({ ...userData, ...payload });
    if (typeof saveState === "function") saveState();
    form.reset();
    if (typeof renderAll === "function") renderAll();
    if (typeof setSection === "function") setSection("users");
    toast("Uzivatel je ulozeny a docasne heslo je nastavene.");
  }

  function syncLocalStateAfterCloudPull() {
    const nextState = readState();
    if (!nextState?.users || !Array.isArray(nextState.users)) return;
    try {
      state.users = nextState.users;
      if (typeof renderUsers === "function") renderUsers();
    } catch {
      // The main app may not have finished booting yet.
    }
  }

  function boot() {
    ensureStyles();
    ensureFields();
    document.addEventListener("submit", handleUserSubmit, true);
    window.addEventListener("kaiser-local-state-refreshed", syncLocalStateAfterCloudPull);
    const target = document.querySelector("#users") || document.body;
    const observer = new MutationObserver(ensureFields);
    observer.observe(target, { childList: true, subtree: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();
