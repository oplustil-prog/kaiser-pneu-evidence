(function () {
  function loadAuthPersistence() {
    if (window.kaiserAuthPersistenceRequested || document.querySelector('script[src*="auth-persistence"]')) return;
    window.kaiserAuthPersistenceRequested = true;
    const script = document.createElement("script");
    script.src = "./auth-persistence.js?v=20260619-57";
    script.async = false;
    script.onerror = () => {
      if (typeof window.showToast === "function") {
        window.showToast("Dlouhe prihlaseni se nenacetlo. Zkuste tvrdy refresh prohlizece.");
      }
    };
    document.head.appendChild(script);
  }

  function loadInviteTemplateFallback() {
    if (window.kaiserEmailTemplates || window.kaiserInviteTemplateRequested) return;
    window.kaiserInviteTemplateRequested = true;
    const script = document.createElement("script");
    script.src = "./email-templates.js?v=20260619-58";
    script.async = false;
    script.onerror = () => {
      if (typeof window.showToast === "function") {
        window.showToast("Sablona pozvanky se nenacetla. Zkuste tvrdy refresh prohlizece.");
      }
    };
    document.head.appendChild(script);
  }

  function loadInviteSender() {
    if (window.kaiserInviteSenderRequested || document.querySelector('script[src*="invite-sender"]')) return;
    window.kaiserInviteSenderRequested = true;
    const script = document.createElement("script");
    script.src = "./invite-sender.js?v=20260619-58";
    script.async = false;
    script.onerror = () => {
      if (typeof window.showToast === "function") {
        window.showToast("Odesilani pozvanek se nenacetlo. Zkuste tvrdy refresh prohlizece.");
      }
    };
    document.head.appendChild(script);
  }

  function insertEmailSettingsCard() {
    const summary = document.querySelector("#settingsSummary");
    if (!summary || summary.querySelector("[data-email-settings-card]")) return;
    const card = document.createElement("div");
    card.className = "settings-summary-card";
    card.dataset.emailSettingsCard = "true";
    card.innerHTML = `
      <span>E-maily a prihlaseni</span>
      <strong>Twilio SendGrid SMTP</strong>
      <p>Supabase Authentication / SMTP: host smtp.sendgrid.net, port 587, uzivatel apikey.</p>
      <p>Pozvanky pouzivaji vychozi grafiku Kaiser a heslo se nikdy neposila primo v e-mailu.</p>
      <p>Po uspesnem 2FA zustane tento prohlizec duveryhodny az 90 dni, pokud se uzivatel rucne neodhlasi.</p>
    `;
    const versionCard = summary.querySelector(".app-version-card");
    summary.insertBefore(card, versionCard || null);
  }

  function boot() {
    loadAuthPersistence();
    loadInviteTemplateFallback();
    loadInviteSender();
    insertEmailSettingsCard();
    const target = document.querySelector("#settingsSummary") || document.body;
    const observer = new MutationObserver(insertEmailSettingsCard);
    observer.observe(target, { childList: true, subtree: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();