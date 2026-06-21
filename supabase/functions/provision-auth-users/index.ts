import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type AppUser = {
  name?: string;
  email?: string;
  role?: string;
  depot?: string;
  status?: string;
};

type ProvisionResult = {
  created: string[];
  existing: string[];
  skipped: string[];
  failed: { email: string; error: string }[];
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const TABLE_NAME = Deno.env.get("SUPABASE_STATE_TABLE") || "kaiser_app_state";
const ROW_ID = Deno.env.get("SUPABASE_STATE_ROW_ID") || "production";
const PASSWORD_REDIRECT_TO =
  Deno.env.get("PASSWORD_REDIRECT_TO") || "https://oplustil-prog.github.io/kaiser-pneu-evidence/";

const corsHeaders = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "authorization, x-client-info, apikey, content-type",
  "access-control-allow-methods": "POST, OPTIONS"
};

const removedEmails = new Set(["dilna@kaiserservis.cz", "management@kaiserservis.cz"]);
const adminEmails = new Set(["oplustil@kaiserservis.cz"]);

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "content-type": "application/json"
    }
  });
}

function normalizeEmail(email: unknown) {
  return String(email || "").trim().toLowerCase();
}

function normalizeRole(role: unknown) {
  const value = String(role || "").trim().toLowerCase();
  if (value === "spravce" || value === "spravce vozoveho parku") {
    return "Spravce vozoveho parku";
  }
  if (value === "manager" || value === "management") return "Management";
  if (value === "technik" || value === "technici") return "Technik";
  return value === "ridic" || value === "ridic/obsluha" ? "Ridic" : String(role || "").trim();
}

function isRealActiveUser(user: AppUser) {
  const email = normalizeEmail(user.email);
  if (!email || !email.includes("@")) return false;
  if (email.endsWith("@kaiser.local")) return false;
  if (removedEmails.has(email)) return false;
  return String(user.status || "aktivni").trim().toLowerCase() === "aktivni";
}

function cleanUser(user: AppUser) {
  return {
    email: normalizeEmail(user.email),
    name: String(user.name || "").trim(),
    role: normalizeRole(user.role),
    depot: String(user.depot || "").trim(),
    status: String(user.status || "aktivni").trim() || "aktivni"
  };
}

function randomPassword() {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function loadState(supabase: ReturnType<typeof createClient>) {
  const { data, error } = await supabase.from(TABLE_NAME).select("state").eq("id", ROW_ID).single();
  if (error) throw new Error(`Nelze nacist produkcni stav: ${error.message}`);
  const state = data?.state;
  if (!state || !Array.isArray(state.users)) {
    throw new Error("Produkci stav neobsahuje seznam uzivatelu.");
  }
  return state as { users: AppUser[] };
}

async function assertAdminCaller(supabase: ReturnType<typeof createClient>, authorization: string, state: { users: AppUser[] }) {
  const token = authorization.replace(/^Bearer\s+/i, "").trim();
  if (!token) throw new Error("Chybi prihlasovaci token.");

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user?.email) throw new Error("Prihlaseni se nepodarilo overit.");

  const callerEmail = normalizeEmail(data.user.email);
  if (adminEmails.has(callerEmail)) return callerEmail;

  const caller = state.users.find((user) => normalizeEmail(user.email) === callerEmail);
  if (caller && normalizeRole(caller.role) === "Spravce vozoveho parku") return callerEmail;

  throw new Error("K synchronizaci Auth uctu muze jen spravce.");
}

async function listAuthUsers(supabase: ReturnType<typeof createClient>) {
  const existing = new Set<string>();
  for (let page = 1; page <= 50; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 100 });
    if (error) throw new Error(`Nelze nacist Supabase Auth uzivatele: ${error.message}`);
    const users = data?.users || [];
    users.forEach((user) => {
      const email = normalizeEmail(user.email);
      if (email) existing.add(email);
    });
    if (users.length < 100) break;
  }
  return existing;
}

async function createAuthUser(supabase: ReturnType<typeof createClient>, user: ReturnType<typeof cleanUser>) {
  const { error } = await supabase.auth.admin.createUser({
    email: user.email,
    password: randomPassword(),
    email_confirm: true,
    user_metadata: {
      name: user.name,
      role: user.role,
      depot: user.depot,
      source: "kaiser-pneu-evidence"
    }
  });
  if (error) throw new Error(error.message);
}

async function sendResetEmail(supabase: ReturnType<typeof createClient>, email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: PASSWORD_REDIRECT_TO
  });
  if (error) throw new Error(error.message);
}

async function provisionUsers(
  supabase: ReturnType<typeof createClient>,
  users: AppUser[],
  sendReset: boolean
): Promise<ProvisionResult> {
  const result: ProvisionResult = { created: [], existing: [], skipped: [], failed: [] };
  const existingAuthUsers = await listAuthUsers(supabase);
  const uniqueUsers = new Map<string, ReturnType<typeof cleanUser>>();

  users.forEach((user) => {
    const cleaned = cleanUser(user);
    if (!isRealActiveUser(cleaned)) {
      if (cleaned.email) result.skipped.push(cleaned.email);
      return;
    }
    uniqueUsers.set(cleaned.email, cleaned);
  });

  for (const user of uniqueUsers.values()) {
    try {
      if (existingAuthUsers.has(user.email)) {
        result.existing.push(user.email);
      } else {
        await createAuthUser(supabase, user);
        existingAuthUsers.add(user.email);
        result.created.push(user.email);
      }
      if (sendReset) await sendResetEmail(supabase, user.email);
    } catch (error) {
      result.failed.push({
        email: user.email,
        error: error instanceof Error ? error.message : "Neznama chyba"
      });
    }
  }

  return result;
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return jsonResponse({ ok: false, error: "Pouzijte POST." }, 405);
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    return jsonResponse({ ok: false, error: "Supabase Function nema nastaveny service-role klic." }, 500);
  }

  try {
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
    const state = await loadState(supabase);
    await assertAdminCaller(supabase, request.headers.get("authorization") || "", state);

    const body = await request.json().catch(() => ({}));
    const mode = String(body?.mode || "sync-all");
    const sendReset = Boolean(body?.sendReset);
    const users = mode === "ensure-user" ? [body?.user || {}] : state.users;
    const result = await provisionUsers(supabase, users, sendReset);

    return jsonResponse({ ok: result.failed.length === 0, ...result });
  } catch (error) {
    return jsonResponse(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Neznama chyba"
      },
      400
    );
  }
});
