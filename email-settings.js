(function () {
  function insertEmailSettingsCard() {
    const summary = document.querySelector("#settingsSummary");
    if (!summary || summary.querySelector("[data-email-settings-card]")) return;
    const card = document.createElement("div");
    card.className = "settings-summary-card";
    card.dataset.emailSettingsCard = "true";
    card.innerHTML = `
      <span>E-maily</span>
      <strong>Twilio SendGrid SMTP</strong>
      <p>Supabase Authentication / SMTP: host smtp.sendgrid.net, port 587, uzivatel apikey.</p>
      <p>Heslo je SendGrid API key a patri pouze do Supabase, nikdy do GitHub Pages kodu.</p>
    `;
    const versionCard = summary.querySelector(".app-version-card");
    summary.insertBefore(card, versionCard || null);
  }

  function boot() {
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