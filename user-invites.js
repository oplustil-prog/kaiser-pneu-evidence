(function () {
  const STORAGE_KEY = "kaiser-pneu-evidence-v5";
  const INVITE_STATUS = "pozvanka";

  function readState() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    } catch {
      return {};
    }
  }

  function userByEmail(email) {
    const normalized = String(email || "").trim().toLowerCase();
    return (readState().users || []).find((user) => String(user.email || "").toLowerCase() === normalized) || null;
  }

  function invitationUrl() {
    return `${window.location.origin}${window.location.pathname}`;
  }

  function buildInviteText(user) {
    return [
      "Dobry den,",
      "",
      "byl vam pripraven pristup do aplikace Kaiser Evidence pneumatik.",
      "",
      `Odkaz: ${invitationUrl()}`,
      `Prihlasovaci e-mail: ${user.email}`,
      user.role ? `Role: ${user.role}` : "",
      "",
      "Postup pro prihlaseni:",
      "1. Otevrete odkaz do aplikace.",
      "2. Do pole E-mail zadejte svuj prihlasovaci e-mail.",
      "3. Pokud heslo jeste nemate, kliknete na Obnovit e-mailem a nastavte si vlastni heslo.",
      "4. Pri prvnim vstupu nastavte dvoufaktorove overeni podle pokynu na obrazovce.",
      "",
      "Pokud e-mail neprijde, pozadejte spravce o kontrolu uctu v Supabase."
    ].filter(Boolean).join("\n");
  }

  function toast(message) {
    if (typeof window.showToast === "function") window.showToast(message);
  }

  function openInviteEmail(user) {
    const subject = "Pozvanka do Kaiser evidence pneumatik";
    const body = buildInviteText(user);
    navigator.clipboard?.writeText(body).catch(() => {});
    window.location.href = `mailto:${user.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    toast("Pozvanka je pripravena v e-mailu a text je zkopirovany.");
  }

  function ensureStyles() {
    if (document.querySelector("#kaiserUserInvitesStyle")) return;
    const style = document.createElement("style");
    style.id = "kaiserUserInvitesStyle";
    style.textContent = `
      .user-form-actions {
        display: grid;
        grid-column: 1 / -1;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 10px;
      }
      .user-form-actions .button { width: 100%; }
      .user-card.is-invited {
        background: #fffdf3;
        border-color: rgba(198, 142, 22, 0.28);
      }
      @media (max-width: 620px) {
        .user-form-actions { grid-template-columns: 1fr; }
      }
    `;
    document.head.appendChild(style);
  }

  function ensureStatusOption() {
    const statusSelect = document.querySelector('#userForm select[name="status"]');
    if (statusSelect && !statusSelect.querySelector(`option[value="${INVITE_STATUS}"]`)) {
      const option = document.createElement("option");
      option.value = INVITE_STATUS;
      option.textContent = "Ceka na pozvanku";
      statusSelect.insertBefore(option, statusSelect.querySelector('option[value="pozastaveno"]') || null);
    }

    const filter = document.querySelector("#userStatusFilter");
    if (filter && !filter.querySelector(`option[value="${INVITE_STATUS}"]`)) {
      const option = document.createElement("option");
      option.value = INVITE_STATUS;
      option.textContent = "Ceka na pozvanku";
      filter.insertBefore(option, filter.querySelector('option[value="pozastaveno"]') || null);
    }
  }

  function formUser() {
    const form = document.querySelector("#userForm");
    if (!form) return null;
    return {
      name: String(form.elements.name?.value || "").trim(),
      email: String(form.elements.email?.value || "").trim().toLowerCase(),
      role: String(form.elements.role?.value || "").trim(),
      depot: String(form.elements.depot?.value || "").trim()
    };
  }

  function inviteFromForm() {
    const form = document.querySelector("#userForm");
    if (!form?.reportValidity()) return;
    const user = formUser();
    if (!user?.email) return;
    ensureStatusOption();
    form.elements.status.value = INVITE_STATUS;
    form.requestSubmit();
    window.setTimeout(() => openInviteEmail(user), 120);
  }

  function ensureInviteButton() {
    const form = document.querySelector("#userForm");
    if (!form || document.querySelector("#inviteUserButton")) return;
    const saveButton = form.querySelector('button[type="submit"]');
    if (!saveButton) return;
    const wrapper = document.createElement("div");
    wrapper.className = "user-form-actions";
    saveButton.parentNode.insertBefore(wrapper, saveButton);
    wrapper.appendChild(saveButton);
    const button = document.createElement("button");
    button.className = "button button-soft";
    button.id = "inviteUserButton";
    button.type = "button";
    button.textContent = "Pozvat uzivatele";
    button.addEventListener("click", inviteFromForm);
    wrapper.appendChild(button);
  }

  function cardEmail(card) {
    return card.querySelector(".user-card-header p")?.textContent?.trim().toLowerCase() || "";
  }

  function enhanceUserCards() {
    document.querySelectorAll(".user-card").forEach((card) => {
      const email = cardEmail(card);
      const user = userByEmail(email);
      if (!user) return;
      const badge = card.querySelector(".badge");
      if (user.status === INVITE_STATUS) {
        card.classList.remove("is-paused");
        card.classList.add("is-invited");
        if (badge) {
          badge.className = "badge badge-warning";
          badge.textContent = "ceka na pozvanku";
        }
      }
      const actions = card.querySelector(".user-actions");
      if (!actions) return;
      const appInvite = actions.querySelector("[data-user-invite]");
      const mailInvites = [...actions.querySelectorAll("[data-user-mail-invite]")];
      if (appInvite) {
        mailInvites.forEach((button) => button.remove());
        return;
      }
      const [existingInvite, ...duplicates] = mailInvites;
      duplicates.forEach((button) => button.remove());
      if (existingInvite) return;
      const button = document.createElement("button");
      button.className = "button button-soft";
      button.type = "button";
      button.dataset.userMailInvite = email;
      button.textContent = "Poslat pozvanku";
      button.addEventListener("click", () => openInviteEmail(user));
      actions.insertBefore(button, actions.querySelector("[data-user-email-preview]") || actions.querySelector("[data-user-toggle]") || null);
    });
  }

  function boot() {
    ensureStyles();
    ensureStatusOption();
    ensureInviteButton();
    enhanceUserCards();
    const target = document.querySelector("#users") || document.body;
    const observer = new MutationObserver(() => {
      ensureStatusOption();
      ensureInviteButton();
      enhanceUserCards();
    });
    observer.observe(target, { childList: true, subtree: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();
