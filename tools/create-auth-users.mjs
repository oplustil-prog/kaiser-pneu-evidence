#!/usr/bin/env node

import crypto from "node:crypto";

const SUPABASE_URL = process.env.SUPABASE_URL || "https://fhjcadhvfutipwbvdzik.supabase.co";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const TABLE_NAME = process.env.SUPABASE_STATE_TABLE || "kaiser_app_state";
const ROW_ID = process.env.SUPABASE_STATE_ROW_ID || "production";
const APPLY = process.argv.includes("--apply");
const SEND_RESETS = process.argv.includes("--send-resets");
const REDIRECT_TO =
  process.env.PASSWORD_REDIRECT_TO || "https://oplustil-prog.github.io/kaiser-pneu-evidence/";

const removedEmails = new Set(["dilna@kaiserservis.cz", "management@kaiserservis.cz"]);

function fail(message) {
  console.error(message);
  process.exit(1);
}

if (!SERVICE_ROLE_KEY) {
  fail("Missing SUPABASE_SERVICE_ROLE_KEY. Use a Supabase service-role key, never the public anon key.");
}

function headers(extra = {}) {
  return {
    apikey: SERVICE_ROLE_KEY,
    authorization: `Bearer ${SERVICE_ROLE_KEY}`,
    ...extra
  };
}

async function supabaseFetch(path, options = {}) {
  const response = await fetch(`${SUPABASE_URL}${path}`, {
    ...options,
    headers: headers(options.headers || {})
  });
  const text = await response.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  if (!response.ok) {
    const detail = typeof body === "string" ? body : JSON.stringify(body);
    throw new Error(`${response.status} ${response.statusText}: ${detail}`);
  }
  return body;
}

async function loadProductionState() {
  const query = `/rest/v1/${encodeURIComponent(TABLE_NAME)}?id=eq.${encodeURIComponent(ROW_ID)}&select=state`;
  const rows = await supabaseFetch(query);
  const state = Array.isArray(rows) ? rows[0]?.state : null;
  if (!state || !Array.isArray(state.users)) {
    fail("Production state does not contain a users array.");
  }
  return state;
}

function realActiveUsers(users) {
  const unique = new Map();
  users.forEach((user) => {
    const email = String(user?.email || "").trim().toLowerCase();
    if (!email || !email.includes("@")) return;
    if (email.endsWith("@kaiser.local")) return;
    if (removedEmails.has(email)) return;
    if (String(user?.status || "aktivni").toLowerCase() !== "aktivni") return;
    unique.set(email, {
      email,
      name: String(user?.name || "").trim(),
      role: String(user?.role || "").trim(),
      depot: String(user?.depot || "").trim()
    });
  });
  return [...unique.values()].sort((a, b) => a.email.localeCompare(b.email));
}

async function listAuthUsers() {
  const existing = new Map();
  for (let page = 1; page <= 50; page += 1) {
    const body = await supabaseFetch(`/auth/v1/admin/users?page=${page}&per_page=100`);
    const users = Array.isArray(body?.users) ? body.users : [];
    users.forEach((user) => {
      const email = String(user?.email || "").trim().toLowerCase();
      if (email) existing.set(email, user);
    });
    if (users.length < 100) break;
  }
  return existing;
}

function randomPassword() {
  return crypto.randomBytes(24).toString("base64url");
}

async function createAuthUser(user) {
  return supabaseFetch("/auth/v1/admin/users", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      email: user.email,
      password: randomPassword(),
      email_confirm: true,
      user_metadata: {
        name: user.name,
        role: user.role,
        depot: user.depot,
        source: "kaiser-pneu-evidence"
      }
    })
  });
}

async function sendPasswordReset(user) {
  return supabaseFetch("/auth/v1/recover", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      email: user.email,
      gotrue_meta_security: {},
      redirect_to: REDIRECT_TO
    })
  });
}

const state = await loadProductionState();
const users = realActiveUsers(state.users);
const existing = await listAuthUsers();
const missing = users.filter((user) => !existing.has(user.email));

console.log(`Real active application users: ${users.length}`);
console.log(`Already in Supabase Auth: ${users.length - missing.length}`);
console.log(`Missing in Supabase Auth: ${missing.length}`);
missing.forEach((user) => console.log(`MISSING ${user.email} | ${user.name || "-"} | ${user.role || "-"}`));

if (!APPLY) {
  console.log("Dry run only. Re-run with --apply to create missing Auth users.");
  process.exit(0);
}

for (const user of missing) {
  await createAuthUser(user);
  console.log(`CREATED ${user.email}`);
}

if (SEND_RESETS) {
  for (const user of users) {
    await sendPasswordReset(user);
    console.log(`RESET_SENT ${user.email}`);
  }
} else {
  console.log("No reset e-mails sent. Users can request reset from the app.");
}
