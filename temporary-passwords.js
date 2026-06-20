(function () {
  const memory = new Map();

  function text(value) {
    return String(value || "").replace(/[&<>"']/g, (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[char]
    );
  }

  function toast(message) {
    if (typeof showToast === "function") showToast(message);
  }

  function userKey(card) {
    const editButton = card.querySelector("[data-user-fill]");
    const toggleButton = card.querySelector("[data-user-toggle]");
    return editButton?.dataset.userFill || toggleButton?.dataset.userToggle || "";
  }

  function injectCard(card) {
    if (card.querySelector("[data-temp-password-panel]")) return;
    const key = userKey(card);
    const actions = card.querySelector(".user-actions");
    if (!key || !actions) return;

    actions.insertAdjacentHTML(
      "afterend",
      `
        <div class="temp-password-panel" data-temp-password-panel data-temp-password-key="${text(key)}">
          <label>
            Interni poznamka k heslu
            <input data-temp-password-input type="password" autocomplete="new-password" placeholder="neni prihlasovaci heslo" />
          </label>
          <div class="temp-password-actions">
            <button class="button button-soft" type="button" data-temp-password-toggle>Ukazat</button>
            <button class="button button-soft" type="button" data-temp-password-copy>Kopirovat</button>
            <button class="button button-soft" type="button" data-temp-password-clear>Vymazat</button>
          </div>
          <small>Jen docasne v tomto otevrenem okne. Nevytvari ucet ani heslo v Supabase.</small>
        </div>
      `
    );

    const input = card.querySelector("[data-temp-password-input]");
    input.value = memory.get(key) || "";
  }

  function injectForm() {
    const form = document.querySelector("#userForm");
    if (!form || form.querySelector("[data-temp-password-form-panel]")) return;
    const submit = form.querySelector('button[type="submit"]');
    if (!submit) return;

    submit.insertAdjacentHTML(
      "beforebegin",
      `
        <div class="temp-password-panel temp-password-form-panel" data-temp-password-panel data-temp-password-form-panel data-temp-password-key="user-form">
          <label>
            Interni poznamka k heslu
            <input data-temp-password-input type="password" autocomplete="new-password" placeholder="neni prihlasovaci heslo" />
          </label>
          <div class="temp-password-actions">
            <button class="button button-soft" type="button" data-temp-password-toggle>Ukazat</button>
            <button class="button button-soft" type="button" data-temp-password-copy>Kopirovat</button>
            <button class="button button-soft" type="button" data-temp-password-clear>Vymazat</button>
          </div>
          <small>Jen pro rucni poznamku. Neuklada se do aplikace ani do cloudu a neprihlasi uzivatele.</small>
        </div>
      `
    );

    const input = form.querySelector("[data-temp-password-form-panel] [data-temp-password-input]");
    input.value = memory.get("user-form") || "";
  }

  function injectAll() {
    injectForm();
    document.querySelectorAll(".user-card").forEach(injectCard);
  }

  async function copyText(value, input) {
    if (!value) {
      toast("Poznamka je prazdna.");
      return;
    }
    try {
      await navigator.clipboard.writeText(value);
      toast("Poznamka je zkopirovana.");
    } catch {
      input.type = "text";
      input.select();
      document.execCommand("copy");
      input.type = "password";
      toast("Poznamka je zkopirovana.");
    }
  }

  function bindEvents() {
    document.addEventListener("input", (event) => {
      const input = event.target.closest("[data-temp-password-input]");
      if (!input) return;
      const panel = input.closest("[data-temp-password-panel]");
      const key = panel?.dataset.tempPasswordKey || "";
      if (!key) return;
      memory.set(key, input.value);
    });

    document.addEventListener("click", (event) => {
      const panel = event.target.closest("[data-temp-password-panel]");
      if (!panel) return;
      const input = panel.querySelector("[data-temp-password-input]");
      const key = panel.dataset.tempPasswordKey || "";
      if (!input || !key) return;

      if (event.target.closest("[data-temp-password-toggle]")) {
        const visible = input.type === "text";
        input.type = visible ? "password" : "text";
        event.target.closest("[data-temp-password-toggle]").textContent = visible ? "Ukazat" : "Skryt";
      }

      if (event.target.closest("[data-temp-password-copy]")) {
        copyText(input.value, input);
      }

      if (event.target.closest("[data-temp-password-clear]")) {
        input.value = "";
        memory.delete(key);
        toast("Poznamka je vymazana.");
      }
    });
  }

  function ensureStyles() {
    if (document.querySelector("#temporaryPasswordsStyles")) return;
    const style = document.createElement("style");
    style.id = "temporaryPasswordsStyles";
    style.textContent = `
      .temp-password-panel {
        background: rgba(117, 189, 37, .07);
        border: 1px solid rgba(117, 189, 37, .22);
        border-radius: 8px;
        display: grid;
        gap: 8px;
        margin-top: 12px;
        padding: 12px;
      }

      .temp-password-panel label {
        color: var(--muted);
        display: grid;
        font-size: .82rem;
        font-weight: 900;
        gap: 6px;
      }

      .temp-password-panel input {
        border: 1px solid var(--line);
        border-radius: 8px;
        color: var(--ink);
        font: inherit;
        font-weight: 800;
        min-height: 42px;
        padding: 9px 11px;
      }

      .temp-password-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 7px;
      }

      .temp-password-actions .button {
        min-height: 34px;
        padding: 7px 10px;
      }

      .temp-password-panel small {
        color: var(--muted);
        font-size: .78rem;
        font-weight: 800;
      }

      .temp-password-form-panel {
        grid-column: 1 / -1;
        margin: 0;
      }
    `;
    document.head.appendChild(style);
  }

  function boot() {
    ensureStyles();
    bindEvents();
    injectAll();
    const observer = new MutationObserver(injectAll);
    observer.observe(document.querySelector("#users") || document.body, { childList: true, subtree: true });
  }

  window.kaiserTemporaryPasswords = {
    clearAll() {
      memory.clear();
      document.querySelectorAll("[data-temp-password-input]").forEach((input) => {
        input.value = "";
      });
    }
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();
