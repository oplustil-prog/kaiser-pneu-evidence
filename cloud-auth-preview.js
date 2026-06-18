(function () {
  const MASKED_PASSWORD = "*******";
  let observer = null;
  let retryCount = 0;

  function isEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());
  }

  function setFieldLocked(field, locked) {
    if (!field) return;
    field.readOnly = locked;
    field.setAttribute("aria-readonly", locked ? "true" : "false");
    field.tabIndex = locked ? -1 : 0;
  }

  function ensureStyles() {
    if (document.querySelector("#cloudAuthPreviewStyles")) return;
    const style = document.createElement("style");
    style.id = "cloudAuthPreviewStyles";
    style.textContent = `
      .cloud-auth-form.is-authenticated label {
        position: relative;
      }

      .cloud-auth-form.is-authenticated label::after {
        color: var(--brand-strong);
        content: "zamceno";
        font-size: .78rem;
        font-weight: 900;
        position: absolute;
        right: 12px;
        top: 4px;
      }

      .cloud-auth-form.is-authenticated input {
        background: rgba(117, 189, 37, .05);
        color: var(--ink);
        cursor: not-allowed;
      }
    `;
    document.head.appendChild(style);
  }

  function applyAuthPreview() {
    const form = document.querySelector("#cloudAuthForm");
    const badge = document.querySelector("[data-cloud-auth]");
    if (!form || !badge) return false;

    const emailField = form.elements.email;
    const passwordField = form.elements.password;
    const signInButton = form.querySelector("[data-cloud-signin]") || form.querySelector('button[type="submit"]');
    const signOutButton = form.querySelector("[data-cloud-signout]");
    const email = String(badge.textContent || "").trim();
    const authenticated = isEmail(email);

    form.classList.toggle("is-authenticated", authenticated);

    if (authenticated) {
      emailField.value = email;
      passwordField.type = "text";
      passwordField.value = MASKED_PASSWORD;
    } else if (form.dataset.previewLocked === "true") {
      emailField.value = "";
      passwordField.type = "password";
      passwordField.value = "";
    }

    setFieldLocked(emailField, authenticated);
    setFieldLocked(passwordField, authenticated);

    if (signInButton) {
      signInButton.disabled = authenticated;
      signInButton.textContent = authenticated ? "Prihlaseno" : "Prihlasit";
    }
    if (signOutButton) signOutButton.disabled = !authenticated;

    form.dataset.previewLocked = authenticated ? "true" : "false";
    return true;
  }

  function bootAuthPreview() {
    ensureStyles();
    applyAuthPreview();

    if (!observer) {
      observer = new MutationObserver(() => applyAuthPreview());
      observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    }

    if (retryCount < 20) {
      retryCount += 1;
      window.setTimeout(bootAuthPreview, 500);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bootAuthPreview);
  } else {
    bootAuthPreview();
  }
})();