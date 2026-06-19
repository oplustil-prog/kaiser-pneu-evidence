import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type InviteUser = {
  name?: string;
  email?: string;
  role?: string;
  depot?: string;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};
const publicAppUrl = "https://oplustil-prog.github.io/kaiser-pneu-evidence/";

function jsonResponse(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json; charset=utf-8"
    }
  });
}

function env(name: string, fallback = "") {
  return Deno.env.get(name) || fallback;
}

function clean(value: unknown) {
  return String(value ?? "").trim();
}

function safe(value: unknown) {
  return clean(value).replace(/[&<>"']/g, (char) => {
    const replacements: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    };
    return replacements[char] || char;
  });
}

function normalizeEmail(value: unknown) {
  return clean(value).toLowerCase();
}

function validEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function normalizeAppUrl(value: unknown) {
  const raw = clean(value);
  if (!raw || raw.includes("localhost") || raw.includes("127.0.0.1") || raw.startsWith("file:")) {
    return publicAppUrl;
  }
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" && url.hostname !== "localhost") return publicAppUrl;
    return url.toString().endsWith("/") ? url.toString() : `${url.toString()}/`;
  } catch {
    return publicAppUrl;
  }
}

function roleLabel(value: unknown) {
  return clean(value) || "Uzivatel";
}

function displayName(user: InviteUser) {
  return clean(user.name) || normalizeEmail(user.email) || "uzivateli";
}

function buildText(user: InviteUser, actionUrl: string, appUrl: string) {
  return [
    `Dobry den${displayName(user) ? `, ${displayName(user)}` : ""},`,
    "",
    "byl Vam pripraven pristup do aplikace Kaiser Evidence pneumatik.",
    "",
    `Nastaveni hesla: ${actionUrl}`,
    `Odkaz na aplikaci: ${appUrl}`,
    `Prihlasovaci e-mail: ${normalizeEmail(user.email)}`,
    clean(user.role) ? `Role: ${clean(user.role)}` : "",
    clean(user.depot) ? `Stredisko: ${clean(user.depot)}` : "",
    "",
    "Postup:",
    "1. Otevrete odkaz pro nastaveni hesla.",
    "2. Nastavte si vlastni heslo.",
    "3. Prihlaste se do aplikace pomoci e-mailu a noveho hesla.",
    "",
    "Heslo Vam nikdo neposila. Nastavujete si jej sami."
  ]
    .filter(Boolean)
    .join("\n");
}

function buildHtml(user: InviteUser, actionUrl: string, appUrl: string) {
  const name = displayName(user);
  const email = normalizeEmail(user.email);
  const role = roleLabel(user.role);
  const depot = clean(user.depot);
  return `<!DOCTYPE html>
<html lang="cs">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Přístup do Kaiser Evidence pneumatik</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: #1a2420;
      font-family: Inter, Arial, sans-serif;
      color: #e5e5e5;
      padding: 48px 16px;
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
    }
    .logo-box {
      display: inline-block;
      background: #75bd25;
      border-radius: 12px;
      padding: 8px 18px 9px;
      margin-bottom: 14px;
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
      margin-bottom: 20px;
    }
    .header h1 {
      font-size: 22px;
      font-weight: 800;
      color: #ffffff;
      line-height: 1.35;
      letter-spacing: -0.3px;
    }
    .header h1 span { color: #75bd25; }
    .header-desc {
      margin-top: 8px;
      font-size: 14px;
      color: #7a9a80;
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
    }
    .info-row:last-child { border-bottom: none; }
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
      word-break: break-word;
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
    }
    .footer {
      background: #161e18;
      border-top: 1px solid #2e3d32;
      padding: 18px 32px;
    }
    .sig-name { font-size: 14px; font-weight: 700; color: #e5e5e5; }
    .sig-meta { font-size: 12px; color: #5a7a60; margin-top: 3px; }
    .sig-meta a { color: #75bd25; text-decoration: none; font-weight: 600; }
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
        <p class="greeting">Dobrý den, ${safe(name)}.<br />Váš účet v aplikaci <strong>Kaiser Evidence pneumatik</strong> je připraven.</p>
        <div class="info-box">
          <div class="info-row">
            <div class="num-badge">01</div>
            <div>
              <div class="info-label">Přihlašovací e-mail</div>
              <div class="info-value">${safe(email)}</div>
            </div>
          </div>
          <div class="info-row">
            <div class="num-badge">02</div>
            <div>
              <div class="info-label">Role</div>
              <div class="info-value"><span class="role-badge">${safe(role)}</span></div>
            </div>
          </div>
          ${depot ? `<div class="info-row">
            <div class="num-badge">03</div>
            <div>
              <div class="info-label">Středisko</div>
              <div class="info-value">${safe(depot)}</div>
            </div>
          </div>` : ""}
        </div>
        <div class="steps-label">Postup pro první přihlášení</div>
        <ol class="steps">
          <li><span class="step-num">01</span><span>Klikněte na zelené tlačítko níže.</span></li>
          <li><span class="step-num">02</span><span>Nastavte si vlastní <strong>heslo</strong>.</span></li>
          <li><span class="step-num">03</span><span>Přihlaste se do aplikace pomocí e-mailu a nového hesla.</span></li>
        </ol>
        <div class="note">🔒 <strong>Heslo Vám nikdo neposílá.</strong> Nastavujete si jej sami. Odkaz je časově omezený.</div>
        <div class="cta-wrap"><a href="${safe(actionUrl)}" class="cta-btn">Nastavit heslo →</a></div>
      </div>
      <div class="footer">
        <div class="sig-name">Kaiser Servis</div>
        <div class="sig-meta"><a href="https://kaiserservis.cz">kaiserservis.cz</a></div>
      </div>
    </div>
  </div>
</body>
</html>`;
}

async function ensureAuthUser(adminClient: ReturnType<typeof createClient>, user: InviteUser) {
  const email = normalizeEmail(user.email);
  const { error } = await adminClient.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: {
      name: clean(user.name),
      role: clean(user.role),
      depot: clean(user.depot)
    }
  });

  if (!error) return { created: true };
  const message = String(error.message || "").toLowerCase();
  if (message.includes("already") || message.includes("registered") || message.includes("exists")) {
    return { created: false };
  }
  throw error;
}

async function recoveryLink(adminClient: ReturnType<typeof createClient>, email: string, appUrl: string) {
  const { data, error } = await adminClient.auth.admin.generateLink({
    type: "recovery",
    email,
    options: { redirectTo: appUrl }
  });
  if (error) throw error;
  return data?.properties?.action_link || appUrl;
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return jsonResponse(405, { error: "Pouzijte POST." });
  }

  try {
    const supabaseUrl = env("SUPABASE_URL");
    const anonKey = env("SUPABASE_ANON_KEY");
    const serviceRoleKey = env("SUPABASE_SERVICE_ROLE_KEY");
    const sendgridKey = env("SENDGRID_API_KEY");
    const fromEmail = env("SENDGRID_FROM_EMAIL", "oplustil@kaiserservis.cz");
    const fromName = env("SENDGRID_FROM_NAME", "Kaiser Servis");
    const replyTo = env("SENDGRID_REPLY_TO", fromEmail);

    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      return jsonResponse(500, { error: "Supabase secrets nejsou dostupne." });
    }
    if (!sendgridKey) {
      return jsonResponse(500, { error: "Chybi secret SENDGRID_API_KEY." });
    }

    const authorization = request.headers.get("Authorization") || "";
    const token = authorization.replace(/^Bearer\s+/i, "");
    if (!token) {
      return jsonResponse(401, { error: "Nejdrive se prihlaste do aplikace." });
    }

    const authClient = createClient(supabaseUrl, anonKey, {
      auth: { persistSession: false },
      global: { headers: { Authorization: `Bearer ${token}` } }
    });
    const { data: callerData, error: callerError } = await authClient.auth.getUser(token);
    if (callerError || !callerData?.user?.email) {
      return jsonResponse(401, { error: "Prihlaseni neni platne." });
    }

    const payload = await request.json().catch(() => ({}));
    const user = (payload.user || {}) as InviteUser;
    const appUrl = normalizeAppUrl(payload.appUrl);
    const email = normalizeEmail(user.email);

    if (!validEmail(email)) {
      return jsonResponse(400, { error: "Chybi platny e-mail uzivatele." });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false }
    });

    const authUser = await ensureAuthUser(adminClient, { ...user, email });
    const actionUrl = await recoveryLink(adminClient, email, appUrl);
    const subject = "Přístup do Kaiser Evidence pneumatik";
    const html = buildHtml({ ...user, email }, actionUrl, appUrl);
    const text = buildText({ ...user, email }, actionUrl, appUrl);

    const sendgridResponse = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${sendgridKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        personalizations: [
          {
            to: [{ email, name: clean(user.name) || email }],
            subject
          }
        ],
        from: { email: fromEmail, name: fromName },
        reply_to: { email: replyTo, name: fromName },
        content: [
          { type: "text/plain", value: text },
          { type: "text/html", value: html }
        ]
      })
    });

    if (!sendgridResponse.ok) {
      const body = await sendgridResponse.text();
      return jsonResponse(502, {
        error: "SendGrid e-mail neodeslal.",
        detail: body.slice(0, 500)
      });
    }

    return jsonResponse(200, {
      ok: true,
      email,
      createdAuthUser: authUser.created
    });
  } catch (error) {
    return jsonResponse(500, {
      error: error instanceof Error ? error.message : "Odeslani pozvanky selhalo."
    });
  }
});
