(function () {
  const CONFIG_KEY = "kaiser-pneu-supabase-config-v1";
  const TRUSTED_LOGIN_KEY = "kaiser-pneu-trusted-login-v1";
  const TRUSTED_LOGIN_DAYS = 90;
  const SUPABASE_MODULE_URL = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
  const TRUSTED_POLICY_VERSION = "20260619-trusted-browser-1";

  let client = null;
  let clientKey = "";
  let lockWrapped = false;

  function readJson(key, fallback) {
    try {
      const value = localStorage.getItem(key);
      return value ? JSON.parse(value) : fallback;
    } catch {
      return fallback;
    }
  }

  function config() {
    const defaults = window.kaiserSupabaseDefaults || window.kaiserSupabaseConfig || {};
    return { ...defaults, ...readJson(CONFIG_KEY, {}) };
  }

  function normalizeEmail(value) {
    return String(value || "").trim().toLowerCase();
  }

  function appBuild() {
    const script = document.querySelector('script[src*="cloud-auth-preview"]') || document.currentScript;
    try {
      const url = new URL(script?.src || window.location.href, window.location.href);
      return url.searchParams.get("v") || "local";
    } catch {
      return "local";
    }
  }

  function trustedBuild() {
    return `${TRUSTED_POLICY_VERSION}|${appBuild()}`;
  }

  function isRecoveryUrl() {
    const params = new URLSearchParams(window.location.hash.replace(/^#/, "") || window.location.search);
    return params.get("type") === "recovery";
  }

  async function getClient() {
    const next = config();
    if (!next.url || !next.anonKey) return null;
    const key = `${next.url}|${next.anonKey}`;
    if (client && clientKey === key) return client;
    const module = await import(SUPABASE_MODULE_URL);
    client = module.createClient(next.url.trim(), next.anonKey.trim(), {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
      }
    });
    client.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT" || event === "USER_DELETED") forgetTrustedLogin();
    });
    clientKey = key;
    return client;
  }

  function sessionIsUsable(session) {
    if (!session?.user?.email) return false;
    if (!session.expires_at) return true;
    return session.expires_at * 1000 > Date.now() + 60 * 1000;
  }

  function rememberTrustedLogin(user, session) {
    const email = normalizeEmail(user?.email || session?.user?.email);
    if (!email || !sessionIsUsable(session)) return;
    const now = Date.now();
    const payload = {
      email,
      userId: user?.id || session?.user?.id || "",
      trustedBuild: trustedBuild(),
      rememberedAt: new Date(now).toISOString(),
      trustedUntil: now + TRUSTED_LOGIN_DAYS * 24 * 60 * 60 * 1000,
      sessionExpiresAt: session?.expires_at || null
    };
    try {
      localStorage.setItem(TRUSTED_LOGIN_KEY, JSON.stringify(payload));
    } catch {
      // Browser storage can be blocked; login still works normally.
    }
  }

  function forgetTrustedLogin() {
    try {
      localStorage.removeItem(TRUSTED_LOGIN_KEY);
    } catch {
      // Ignore storage cleanup failures.
    }
  }

  window.kaiserForgetTrustedLogin = forgetTrustedLogin;

  function readTrustedLogin() {
    try {
      return JSON.parse(localStorage.getItem(TRUSTED_LOGIN_KEY) || "null");
    } catch {
      return null;
    }
  }

  function canResume(user, session) {
    const trusted = readTrustedLogin();
    if (!trusted || !sessionIsUsable(session)) return false;
    if (trusted.trustedBuild !== trustedBuild()) {
      forgetTrustedLogin();
      return false;
    }
    if (Number(trusted.trustedUntil || 0) <= Date.now()) {
      forgetTrustedLogin();
      return false;
    }
    return normalizeEmail(trusted.email) === normalizeEmail(user?.email || session?.user?.email);
  }

  function hideLoginGate() {
    const gate = document.querySelector("#kaiserLoginGate");
    if (gate) gate.classList.remove("is-visible");
    document.body.classList.remove("kaiser-login-active", "kaiser-auth-locked");
  }

  function openTrustedSession(user, session) {
    const email = user?.email || session?.user?.email || "";
    window.kaiserAuthState = {
      authenticated: true,
      email,
      user: user || session?.user || { email },
      checkedAt: new Date().toISOString(),
      trustedBrowser: true
    };
    if (typeof window.kaiserSetLoginUser === "function") {
      window.kaiserSetLoginUser({ email, name: user?.user_metadata?.name || email });
    }
    hideLoginGate();
    window.dispatchEvent(new CustomEvent("kaiser-auth-state", { detail: window.kaiserAuthState }));
    if (window.kaiserCloud?.pullState) window.setTimeout(() => window.kaiserCloud.pullState(), 250);
  }

  async function currentSession() {
    const supabase = await getClient();
    if (!supabase) return null;
    const { data } = await supabase.auth.getSession();
    return data?.session || null;
  }

  async function rememberFromEvent(event) {
    const session = await currentSession();
    const user = event?.detail?.user || session?.user || null;
    if (user?.email && sessionIsUsable(session)) rememberTrustedLogin(user, session);
  }

  async function tryResume() {
    if (isRecoveryUrl()) return false;
    const session = await currentSession();
    const user = session?.user || null;
    if (!canResume(user, session)) return false;
    openTrustedSession(user, session);
    return true;
  }

  function startResumeLoop() {
    let attempts = 0;
    const timer = window.setInterval(async () => {
      attempts += 1;
      try {
        const resumed = await tryResume();
        if (resumed || attempts >= 50) window.clearInterval(timer);
      } catch {
        if (attempts >= 50) window.clearInterval(timer);
      }
    }, 300);
  }

  function wrapLockApp() {
    if (lockWrapped || typeof window.kaiserLockApp !== "function") return;
    const original = window.kaiserLockApp;
    window.kaiserLockApp = function (...args) {
      forgetTrustedLogin();
      return original.apply(this, args);
    };
    lockWrapped = true;
  }

  function boot() {
    wrapLockApp();
    window.setInterval(wrapLockApp, 1000);
    window.addEventListener("kaiser-auth-ready", rememberFromEvent);
    window.addEventListener("kaiser-auth-state", (event) => {
      if (event?.detail?.authenticated) rememberFromEvent(event);
    });
    document.addEventListener("click", (event) => {
      if (event.target.closest("[data-cloud-signout], [data-login-back]")) forgetTrustedLogin();
    }, true);
    tryResume();
    startResumeLoop();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();
