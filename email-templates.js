(function () {
  const APP_URL = "https://oplustil-prog.github.io/kaiser-pneu-evidence/";
  const STORAGE_KEY = "kaiser-pneu-evidence-v5";
  const INVITE_STATUS = "pozvanka";

  function safe(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => {
      const replacements = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" };
      return replacements[char] || char;
    });
  }

  function readState() {
    try {
      if (typeof state !== "undefined") return state || {};
    } catch {
      // The main app may not be loaded yet.
    }
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    } catch {
      return {};
    }
  }

  function toast(message) {
    if (typeof window.showToast === "function") window.showToast(message);
  }

  function normalizeEmail(email) {
    return String(email || "").trim().toLowerCase();
  }

  function userById(userId) {
    return (readState().users || []).find((user) => user.id === userId) || null;
  }

  function userByEmail(email) {
    const normalized = normalizeEmail(email);
    return (readState().users || []).find((user) => normalizeEmail(user.email) === normalized) || null;
  }

  function roleLabel(role) {
    const value = String(role || "").trim();
    return value || "Uzivatel";
  }

  function formUser() {
    const form = document.querySelector("#userForm");
    if (!form) return null;
    return {
      id: "",
      name: String(form.elements.name?.value || "").trim(),
      email: normalizeEmail(form.elements.email?.value),
      role: String(form.elements.role?.value || "").trim(),
      depot: String(form.elements.depot?.value || "").trim(),
      status: INVITE_STATUS
    };
  }

  function buildInviteText(user) {
    return [
      "Dobry den,",
      "",
      "byl vam pripraven pristup do aplikace Kaiser Evidence pneumatik.",
      "",
      `Odkaz: ${APP_URL}`,
      `Prihlasovaci e-mail: ${user.email}`,
      user.role ? `Role: ${user.role}` : "",
      "",
      "Postup pro prvni prihlaseni:",
      "1. Otevrete odkaz do aplikace.",
      "2. Do pole E-mail zadejte svuj prihlasovaci e-mail.",
      "3. Kliknete na Nastavit / obnovit heslo.",
      "4. V dorucene poste otevrete odkaz a nastavte si vlastni heslo.",
      "5. Po nastaveni hesla se prihlaste a aplikace se otevre.",
      "",
      "Heslo vam nikdo neposila. Nastavujete si jej sami. Pokud e-mail pro nastaveni hesla neprijde, pozadejte spravce o aktivaci uctu."
    ]
      .filter(Boolean)
      .join("\n");
  }

  function buildInviteHtml(user) {
    const displayName = user.name || user.email || "uzivateli";
    return `<!DOCTYPE html>
<html lang="cs">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Přístup do Kaiser Evidence pneumatik</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: #1a2420;
      font-family: 'Inter', Arial, sans-serif;
      color: #e5e5e5;
      padding: 48px 16px;
      min-height: 100vh;
    }
    .wrapper { max-width: 540px; margin: 0 auto; }
    .card {
      background: #222d28;
      border-radius: 20px;
      overflow: hidden;
      border: 1px solid #2e3d32;
      box-shadow: 0 4px 24px rgba(0,0,0,0.5), 0 1px 3px rgba(0,0,0,0.4);
    }
    .header {
      background: #1a2420;
      border-bottom: 1px solid #2e3d32;
      padding: 36px 32px 32px;
      position: relative;
      overflow: hidden;
    }
    .header::before {
      content: '';
      position: absolute;
      inset: 0;
      background:
        radial-gradient(circle at 90% 10%, rgba(117,189,37,0.08) 0%, transparent 55%),
        radial-gradient(circle at 10% 90%, rgba(117,189,37,0.05) 0%, transparent 50%);
    }
    .logo-box {
      display: inline-block;
      background: #75bd25;
      border-radius: 12px;
      padding: 8px 18px 9px;
      margin-bottom: 14px;
      position: relative;
      z-index: 1;
    }
    .logo-box span {
      font-size: 22px;
      font-weight: 800;
      color: #ffffff;
      letter-spacing: -0.5px;
    }
    .header-sub {
      font-size: 13px;
      font-weight: 600;
      color: #6a8a70;
      letter-spacing: 1.5px;
      text-transform: uppercase;
      position: relative;
      z-index: 1;
      margin-bottom: 20px;
    }
    .header h1 {
      font-size: 22px;
      font-weight: 800;
      color: #ffffff;
      line-height: 1.35;
      position: relative;
      z-index: 1;
      letter-spacing: -0.3px;
    }
    .header h1 span { color: #75bd25; }
    .header-desc {
      margin-top: 8px;
      font-size: 14px;
      color: #7a9a80;
      position: relative;
      z-index: 1;
      font-weight: 500;
    }
    .body { padding: 32px 32px 28px; }
    .greeting {
      font-size: 14px;
      color: #9ab5a0;
      margin-bottom: 24px;
      line-height: 1.65;
    }
    .greeting strong { color: #e5e5e5; }
    .info-box {
      background: #1e2c24;
      border: 1px solid #2e3d32;
      border-radius: 14px;
      overflow: hidden;
      margin-bottom: 28px;
    }
    .info-row {
      display: flex;
      align-items: flex-start;
      gap: 14px;
      padding: 14px 18px;
      border-bottom: 1px solid #2e3d32;
      transition: background 0.15s;
    }
    .info-row:last-child { border-bottom: none; }
    .info-row:hover { background: #263a2c; }
    .num-badge {
      flex-shrink: 0;
      width: 28px;
      height: 28px;
      border-radius: 8px;
      background: #2a3d2e;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 11px;
      font-weight: 700;
      color: #75bd25;
      margin-top: 1px;
      letter-spacing: 0.5px;
    }
    .info-label {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      color: #5a7a60;
      margin-bottom: 3px;
    }
    .info-value {
      font-size: 13.5px;
      font-weight: 600;
      color: #e5e5e5;
      word-break: break-all;
    }
    .info-value a { color: #75bd25; text-decoration: none; }
    .role-badge {
      display: inline-block;
      background: rgba(117,189,37,0.12);
      color: #75bd25;
      border: 1px solid rgba(117,189,37,0.25);
      border-radius: 6px;
      font-size: 12px;
      font-weight: 700;
      padding: 3px 10px;
      letter-spacing: 0.5px;
    }
    .steps-label {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 2px;
      color: #5a7a60;
      margin-bottom: 12px;
    }
    .steps {
      list-style: none;
      margin-bottom: 24px;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .steps li {
      display: flex;
      align-items: flex-start;
      gap: 14px;
      font-size: 13.5px;
      color: #9ab5a0;
      line-height: 1.6;
      padding: 10px 14px;
      background: #1e2c24;
      border: 1px solid #2e3d32;
      border-radius: 10px;
    }
    .steps li strong { color: #e5e5e5; }
    .step-num {
      flex-shrink: 0;
      width: 26px;
      height: 26px;
      background: #2a3d2e;
      color: #75bd25;
      border-radius: 7px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 11px;
      font-weight: 800;
      margin-top: 1px;
      letter-spacing: 0.5px;
    }
    .note {
      background: #222010;
      border: 1px solid #3d3a20;
      border-left: 3px solid #f59e0b;
      border-radius: 0 10px 10px 0;
      padding: 13px 16px;
      font-size: 13px;
      color: #b8a060;
      line-height: 1.65;
      margin-bottom: 28px;
    }
    .note strong { color: #d4b870; }
    .cta-wrap { text-align: center; margin-bottom: 4px; }
    .cta-btn {
      display: inline-block;
      background: #75bd25;
      color: #ffffff;
      text-decoration: none;
      font-size: 14px;
      font-weight: 800;
      padding: 15px 44px;
      border-radius: 10px;
      letter-spacing: 0.3px;
      box-shadow: 0 4px 20px rgba(117,189,37,0.30), 0 1px 3px rgba(0,0,0,0.3);
      transition: transform 0.15s, box-shadow 0.15s, background 0.15s;
    }
    .cta-btn:hover {
      background: #82cc2a;
      transform: translateY(-2px);
      box-shadow: 0 8px 28px rgba(117,189,37,0.40), 0 2px 6px rgba(0,0,0,0.3);
    }
    .footer {
      background: #161e18;
      border-top: 1px solid #2e3d32;
      padding: 18px 32px;
    }
    .signature {
      display: flex;
      align-items: center;
      gap: 14px;
    }
    .sig-avatar {
      width: 40px;
      height: 40px;
      border-radius: 10px;
      background: #2a3d2e;
      border: 1px solid #3a5040;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      flex-shrink: 0;
    }
    .sig-name { font-size: 14px; font-weight: 700; color: #e5e5e5; }
    .sig-meta {
      font-size: 12px;
      color: #5a7a60;
      margin-top: 3px;
      display: flex;
      align-items: center;
      gap: 6px;
      flex-wrap: wrap;
    }
    .sig-meta a { color: #75bd25; text-decoration: none; font-weight: 600; }
    .dot { color: #3a5040; }
    @media (max-width: 600px) {
      body { padding: 20px 10px; }
      .header, .body, .footer { padding-left: 20px; padding-right: 20px; }
      .cta-btn { display: block; padding-left: 16px; padding-right: 16px; }
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="card">
      <div class="header">
        <div class="logo-box"><span>kaiser.</span></div>
        <div class="header-sub">Evidence pneumatik</div>
        <h1>Byl Vám připraven<br /><span>přístup do aplikace</span></h1>
        <p class="header-desc">Níže najdete vše potřebné pro první přihlášení.</p>
      </div>
      <div class="body">
        <p class="greeting">Dobrý den${displayName ? `, ${safe(displayName)}` : ""},<br />Váš účet v aplikaci <strong>Kaiser Evidence pneumatik</strong> je připraven. Přihlásit se můžete pomocí níže uvedených údajů.</p>
        <div class="info-box">
          <div class="info-row">
            <div class="num-badge">01</div>
            <div>
              <div class="info-label">Odkaz na aplikaci</div>
              <div class="info-value"><a href="${APP_URL}">oplustil-prog.github.io/kaiser-pneu-evidence</a></div>
            </div>
          </div>
          <div class="info-row">
            <div class="num-badge">02</div>
            <div>
              <div class="info-label">Přihlašovací e-mail</div>
              <div class="info-value">${safe(user.email)}</div>
            </div>
          </div>
          <div class="info-row">
            <div class="num-badge">03</div>
            <div>
              <div class="info-label">Role</div>
              <div class="info-value"><span class="role-badge">${safe(roleLabel(user.role))}</span></div>
            </div>
          </div>
        </div>
        <div class="steps-label">Postup pro první přihlášení</div>
        <ol class="steps">
          <li><span class="step-num">01</span><span>Otevřete odkaz do aplikace.</span></li>
          <li><span class="step-num">02</span><span>Do pole <strong>E-mail</strong> zadejte svůj přihlašovací e-mail.</span></li>
          <li><span class="step-num">03</span><span>Klikněte na <strong>Nastavit / obnovit heslo</strong>.</span></li>
          <li><span class="step-num">04</span><span>V doručené poště otevřete odkaz a nastavte si vlastní heslo.</span></li>
          <li><span class="step-num">05</span><span>Po nastavení hesla se přihlaste a aplikace se otevře.</span></li>
        </ol>
        <div class="note">🔒 <strong>Heslo Vám nikdo neposílá.</strong> Nastavujete si jej sami. Pokud e-mail pro nastavení hesla nepřijde, požádejte správce o aktivaci účtu.</div>
        <div class="cta-wrap"><a href="${APP_URL}" class="cta-btn">Otevřít aplikaci →</a></div>
      </div>
      <div class="footer">
        <div class="signature">
          <div class="sig-avatar">👤</div>
          <div>
            <div class="sig-name">Radim</div>
            <div class="sig-meta">
              <a href="https://kaiserservis.cz">kaiserservis.cz</a>
              <span class="dot">·</span>
              <span>📞 604 542 004</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;
  }

  async function copyRichEmail(html, text) {
    if (navigator.clipboard?.write && window.ClipboardItem) {
      await navigator.clipboard.write([
        new ClipboardItem({
          "text/html": new Blob([html], { type: "text/html" }),
          "text/plain": new Blob([text], { type: "text/plain" })
        })
      ]);
      return "html";
    }
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return "text";
    }
    return "none";
  }

  function openPreview(user) {
    const html = buildInviteHtml(user);
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank", "noopener");
    window.setTimeout(() => URL.revokeObjectURL(url), 60000);
  }

  function openMailClient(user) {
    const subject = "Přístup do Kaiser Evidence pneumatik";
    const text = buildInviteText(user);
    window.location.href = `mailto:${encodeURIComponent(user.email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`;
  }

  function prepareOutgoingInvite(user, options = {}) {
    if (!user?.email) return;
    const html = buildInviteHtml(user);
    const text = buildInviteText(user);
    copyRichEmail(html, text)
      .then((mode) => {
        if (mode === "html") {
          toast("Pozvánka je zkopírovaná. Obnovu hesla odešle Supabase přes Twilio SendGrid.");
        } else if (mode === "text") {
          toast("Text pozvánky je zkopírovaný. HTML schránka není v tomto prohlížeči dostupná.");
        }
      })
      .catch(() => toast("Pozvánka je připravená. Pokud se nekopíruje, použijte náhled e-mailu."));

    if (options.preview) openPreview(user);
    if (options.mailto === true) window.setTimeout(() => openMailClient(user), 80);
  }

  function upsertInviteUserFromForm() {
    const form = document.querySelector("#userForm");
    if (!form?.reportValidity()) return null;
    if (typeof collectUserFormData === "function" && typeof upsertUser === "function") {
      const result = upsertUser(collectUserFormData(form, INVITE_STATUS));
      if (typeof saveState === "function") saveState();
      form.reset();
      if (typeof renderAll === "function") renderAll();
      if (typeof setSection === "function") setSection("users");
      return result.user;
    }
    return formUser();
  }

  function markExistingUserInvited(user) {
    if (!user) return;
    if (user.status !== "aktivni") {
      user.status = INVITE_STATUS;
      user.lastActive = "ceka na prvni prihlaseni";
      if (typeof saveState === "function") saveState();
      if (typeof renderUsers === "function") renderUsers();
    }
  }

  function handleInviteFromForm(event, previewOnly = false) {
    if (window.kaiserRequireAuth && !window.kaiserRequireAuth("pozvani uzivatele")) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const user = previewOnly ? formUser() : upsertInviteUserFromForm();
    if (!user?.email) return;
    prepareOutgoingInvite(user, { preview: true, mailto: false });
  }

  function handleExistingInvite(event, previewOnly = false) {
    if (window.kaiserRequireAuth && !window.kaiserRequireAuth("pozvani uzivatele")) return;
    const trigger = event.target.closest("[data-user-invite], [data-user-mail-invite], [data-user-email-preview]");
    const user = trigger.dataset.userInvite
      ? userById(trigger.dataset.userInvite)
      : userByEmail(trigger.dataset.userMailInvite || trigger.dataset.userEmailPreview);
    if (!user) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (!previewOnly) markExistingUserInvited(user);
    prepareOutgoingInvite(user, { preview: true, mailto: false });
  }

  function ensureStyles() {
    if (document.querySelector("#kaiserEmailTemplateStyles")) return;
    const style = document.createElement("style");
    style.id = "kaiserEmailTemplateStyles";
    style.textContent = `
      .user-form-actions {
        grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      }
      .user-actions {
        flex-wrap: wrap;
      }
      .user-mail-mode-note {
        background: #f4faef;
        border: 1px solid rgba(117, 189, 37, .25);
        border-radius: 8px;
        color: #5d6f58;
        font-size: 14px;
        font-weight: 700;
        grid-column: 1 / -1;
        line-height: 1.45;
        padding: 12px 14px;
      }
    `;
    document.head.appendChild(style);
  }

  function ensureMailModeNotice() {
    const form = document.querySelector("#userForm");
    if (!form || form.querySelector(".user-mail-mode-note")) return;
    const actions = form.querySelector(".user-form-actions");
    const note = document.createElement("div");
    note.className = "user-mail-mode-note";
    note.textContent = "Pozvanku pripravite z nahledu. Obnovu hesla pak odesle Supabase pres Twilio SendGrid SMTP.";
    form.insertBefore(note, actions || null);
  }

  function ensurePreviewButtons() {
    ensureMailModeNotice();
    const formActions = document.querySelector(".user-form-actions");
    if (formActions && !formActions.querySelector("[data-user-invite-preview-form]")) {
      const button = document.createElement("button");
      button.className = "button button-soft";
      button.type = "button";
      button.dataset.userInvitePreviewForm = "true";
      button.textContent = "Náhled e-mailu";
      formActions.appendChild(button);
    }

    document.querySelectorAll(".user-card").forEach((card) => {
      const actions = card.querySelector(".user-actions");
      const email = card.querySelector(".user-card-header p")?.textContent?.trim().toLowerCase();
      if (!actions || !email || actions.querySelector("[data-user-email-preview]")) return;
      const button = document.createElement("button");
      button.className = "button button-soft";
      button.type = "button";
      button.dataset.userEmailPreview = email;
      button.textContent = "Náhled e-mailu";
      actions.insertBefore(button, actions.querySelector("[data-user-toggle]") || null);
    });
  }

  function bindEvents() {
    document.addEventListener(
      "click",
      (event) => {
        if (event.target.closest("[data-user-invite-preview-form]")) {
          handleInviteFromForm(event, true);
          return;
        }
        if (event.target.closest("#inviteUserButton")) {
          handleInviteFromForm(event, false);
          return;
        }
        if (event.target.closest("[data-user-email-preview]")) {
          handleExistingInvite(event, true);
          return;
        }
        if (event.target.closest("[data-user-invite], [data-user-mail-invite]")) {
          handleExistingInvite(event, false);
        }
      },
      true
    );
  }

  function boot() {
    ensureStyles();
    ensurePreviewButtons();
    bindEvents();
    const target = document.querySelector("#users") || document.body;
    const observer = new MutationObserver(ensurePreviewButtons);
    observer.observe(target, { childList: true, subtree: true });
  }

  window.kaiserEmailTemplates = {
    appUrl: APP_URL,
    buildInviteHtml,
    buildInviteText,
    openPreview,
    prepareOutgoingInvite
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();
