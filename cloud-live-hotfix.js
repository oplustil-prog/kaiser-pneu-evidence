(function () {
  const CONFIG = {
    url: "https://fhjcadhvfutipwbvdzik.supabase.co",
    anonKey: "sb_publishable_r_lxnCz4v0T2jikoxJigmw_A1U0F5of",
    table: "kaiser_app_state",
    rowId: "production",
    bucket: "kaiser-documents",
    autoLoad: true,
    autoSync: true
  };
  const CONFIG_KEY = "kaiser-pneu-supabase-config-v1";
  const META_KEY = "kaiser-pneu-supabase-meta-v1";
  const BACKUP_KEY = "kaiser-pneu-local-backup-before-cloud-pull";
  const SUPABASE_MODULE_URL = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

  let client = null;
  let clientKey = "";
  let pushTimer = 0;
  let pullAttempted = false;
  let savePatched = false;
  let localSaveState = null;
  let syncPaused = false;

  function readJson(key, fallback) {
    try {
      const value = localStorage.getItem(key);
      return value ? JSON.parse(value) : fallback;
    } catch {
      return fallback;
    }
  }

  function writeJson(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Storage may be blocked in private modes; cloud operations can still run.
    }
  }

  function readConfig() {
    const stored = readJson(CONFIG_KEY, {});
    const runtime = window.kaiserSupabaseDefaults || window.kaiserSupabaseConfig || {};
    return { ...CONFIG, ...runtime, ...stored, autoLoad: true, autoSync: true };
  }

  function ensureDefaults() {
    window.kaiserSupabaseDefaults = { ...CONFIG, ...(window.kaiserSupabaseDefaults || {}), autoLoad: true, autoSync: true };
    writeJson(CONFIG_KEY, { ...readJson(CONFIG_KEY, {}), autoLoad: true, autoSync: true });
  }

  function isConfigured(config = readConfig()) {
    return Boolean(String(config.url || "").trim() && String(config.anonKey || "").trim());
  }

  async function getClient() {
    const config = readConfig();
    if (!isConfigured(config)) throw new Error("Cloudove pripojeni neni nastavene.");
    const key = `${config.url}|${config.anonKey}`;
    if (client && clientKey === key) return client;
    const module = await import(SUPABASE_MODULE_URL);
    client = module.createClient(config.url.trim(), config.anonKey.trim(), {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
      }
    });
    clientKey = key;
    return client;
  }

  async function getSession() {
    const supabase = await getClient();
    const { data } = await supabase.auth.getSession();
    return data?.session || null;
  }

  function getMeta() {
    return readJson(META_KEY, {});
  }

  function setMeta(meta) {
    writeJson(META_KEY, { ...getMeta(), ...meta });
  }

  function lastSyncLabel() {
    const meta = getMeta();
    if (!meta.lastSyncAt) return "Cloud je pripraveny, zatim bez synchronizace.";
    return `Posledni synchronizace ${new Date(meta.lastSyncAt).toLocaleString("cs-CZ")}.`;
  }

  function setSettingsBadge(kind, message) {
    const badge = document.querySelector("#settings .toolbar .badge");
    if (!badge) return;
    badge.className = `badge ${kind === "ok" ? "badge-ok" : kind === "danger" ? "badge-danger" : "badge-warning"}`;
    badge.textContent = message;
  }

  function setCloudPanel(kind, message, detail) {
    const panel = document.querySelector("#cloudPanel");
    if (!panel) return;
    const dot = panel.querySelector("[data-cloud-dot]");
    const status = panel.querySelector("[data-cloud-status]");
    const meta = panel.querySelector("[data-cloud-meta]");
    if (dot) dot.className = `cloud-dot is-${kind}`;
    if (status) {
      status.className = `badge ${kind === "ok" ? "badge-ok" : kind === "danger" ? "badge-danger" : "badge-warning"}`;
      status.textContent = message;
    }
    if (meta) meta.textContent = detail || lastSyncLabel();
  }

  function updateTopStatus(user) {
    const box = document.querySelector("#loginStatusBox");
    if (!box) return;
    const isLocalFile = window.location.protocol === "file:";
    const title = isLocalFile ? "Lokalni soubor" : user?.email ? "Cloud prihlasen" : "Cloud neprihlasen";
    const detail = isLocalFile ? "otevrete verejny odkaz" : user?.email || "prihlaste se pro ukladani";
    const color = isLocalFile ? "#e05252" : user?.email ? "var(--green)" : "#f3b53f";
    const shadow = isLocalFile ? "rgba(224,82,82,.18)" : user?.email ? "rgba(117,189,37,.18)" : "rgba(243,181,63,.2)";

    box.innerHTML = `
      <span class="login-status-dot" aria-hidden="true"></span>
      <span>
        <strong>${escapeHtml(title)}</strong>
        <small>${escapeHtml(detail)}</small>
      </span>
    `;
    const dot = box.querySelector(".login-status-dot");
    if (dot) {
      dot.style.background = color;
      dot.style.boxShadow = `0 0 0 5px ${shadow}`;
    }
  }

  function escapeHtml(value) {
    return String(value || "").replace(/[&<>"']/g, (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[char]
    );
  }

  function hasRuntimeState() {
    return typeof state !== "undefined" && typeof saveState === "function";
  }

  function stateCounts() {
    const current = typeof state !== "undefined" ? state : {};
    return {
      tires: Array.isArray(current?.tires) ? current.tires.length : 0,
      vehicles: Array.isArray(current?.vehicles) ? current.vehicles.length : 0,
      services: Array.isArray(current?.services) ? current.services.length : 0,
      measurements: Array.isArray(current?.measurements) ? current.measurements.length : 0,
      users: Array.isArray(current?.users) ? current.users.length : 0
    };
  }

  function snapshotState() {
    const current = typeof state !== "undefined" ? state : {};
    return JSON.parse(JSON.stringify(current || {}));
  }

  function normalizeState(nextState) {
    const base = typeof initialState !== "undefined" ? structuredClone(initialState) : {};
    return {
      ...base,
      ...(nextState || {}),
      tires: nextState?.tires || base.tires || [],
      vehicles: nextState?.vehicles || base.vehicles || [],
      services: nextState?.services || base.services || [],
      measurements: nextState?.measurements || base.measurements || [],
      priceRefs: nextState?.priceRefs || base.priceRefs || [],
      imports: nextState?.imports || base.imports || [],
      vehicleImports: nextState?.vehicleImports || base.vehicleImports || [],
      users: nextState?.users || base.users || [],
      settings: {
        ...(base.settings || {}),
        ...(nextState?.settings || {})
      }
    };
  }

  function saveLocalOnly() {
    if (!localSaveState && typeof saveState === "function") localSaveState = saveState;
    if (!localSaveState) return;
    syncPaused = true;
    try {
      localSaveState();
    } finally {
      syncPaused = false;
    }
  }

  async function requireSession() {
    const session = await getSession();
    if (!session?.user?.email) {
      updateTopStatus(null);
      setSettingsBadge("warn", "prihlaste se do cloudu");
      if (typeof window.kaiserLockApp === "function") {
        window.kaiserLockApp("Nejdrive se prihlaste. Bez prihlaseni se zmeny neulozi do cloudu.");
      }
      throw new Error("Nejdrive se prihlaste do aplikace.");
    }
    window.kaiserAuthState = {
      authenticated: true,
      email: session.user.email,
      user: session.user,
      checkedAt: new Date().toISOString()
    };
    updateTopStatus(session.user);
    return session;
  }

  async function pullState() {
    if (!hasRuntimeState()) return false;
    const session = await requireSession();
    const config = readConfig();
    setCloudPanel("work", "Stahuji data z cloudu...", lastSyncLabel());
    const supabase = await getClient();
    const { data, error } = await supabase
      .from(config.table)
      .select("state, updated_at, counts")
      .eq("id", config.rowId)
      .maybeSingle();
    if (error) throw error;
    if (!data?.state) {
      setCloudPanel("warn", "Cloud je prazdny", "Nejdrive nahrajte produkcni data do cloudu.");
      setSettingsBadge("warn", "cloud je prazdny");
      return false;
    }

    writeJson(BACKUP_KEY, {
      createdAt: new Date().toISOString(),
      state: snapshotState()
    });

    state = normalizeState(data.state);
    if (typeof selectedVehicle !== "undefined") selectedVehicle = state.vehicles?.[0]?.spz || "";
    if (typeof selectedPosition !== "undefined") selectedPosition = "";
    saveLocalOnly();
    if (typeof renderAll === "function") renderAll();

    const now = new Date().toISOString();
    setMeta({ lastSyncAt: now, lastPullAt: now, counts: data.counts || stateCounts(), user: session.user.email });
    setCloudPanel("ok", "Cloudova data jsou nactena", lastSyncLabel());
    setSettingsBadge("ok", "cloudova data nactena");
    return true;
  }

  async function pushState(options = {}) {
    if (!hasRuntimeState()) return false;
    const session = await requireSession();
    const config = readConfig();
    const now = new Date().toISOString();
    const counts = stateCounts();
    const supabase = await getClient();
    if (!options.quiet) setCloudPanel("work", "Ukladam do cloudu...", lastSyncLabel());
    const { error } = await supabase.from(config.table).upsert(
      {
        id: config.rowId,
        state: snapshotState(),
        app_version: "kaiser-pneu-evidence-v5",
        counts,
        updated_at: now,
        updated_by: session.user.email || "github-pages"
      },
      { onConflict: "id" }
    );
    if (error) throw error;
    setMeta({ lastSyncAt: now, lastPushAt: now, counts, user: session.user.email });
    setCloudPanel("ok", "Data jsou ulozena v cloudu", lastSyncLabel());
    setSettingsBadge("ok", "ulozeno do cloudu");
    return true;
  }

  function schedulePush() {
    if (!readConfig().autoSync || syncPaused) return;
    window.clearTimeout(pushTimer);
    pushTimer = window.setTimeout(() => {
      pushState({ quiet: true }).catch((error) => {
        setCloudPanel("danger", "Cloud neulozil", error?.message || "Zkontrolujte prihlaseni.");
        setSettingsBadge("danger", "cloud neulozil");
      });
    }, 900);
  }

  function patchSaveState() {
    if (savePatched || typeof saveState !== "function") return;
    localSaveState = saveState;
    saveState = function () {
      const result = localSaveState.apply(this, arguments);
      schedulePush();
      return result;
    };
    savePatched = true;
    window.kaiserCloudSavePatched = true;
  }

  async function testConnection() {
    const session = await requireSession();
    const config = readConfig();
    const supabase = await getClient();
    const { data, error } = await supabase
      .from(config.table)
      .select("id, updated_at")
      .eq("id", config.rowId)
      .maybeSingle();
    if (error) throw error;
    setCloudPanel(
      "ok",
      data ? "Supabase je pripojeny" : "Supabase je pripojeny, data zatim prazdna",
      session.user.email
    );
    setSettingsBadge("ok", "cloud je pripojeny");
    return true;
  }

  function installApi() {
    window.kaiserCloud = {
      ...(window.kaiserCloud || {}),
      isConfigured,
      pullState,
      pushState,
      testConnection,
      readConfig,
      getClient
    };
    window.kaiserSaveCloudNow = function (options = {}) {
      return pushState({ quiet: !options.visible }).catch((error) => {
        setSettingsBadge("danger", "cloud neulozil");
        if (options.visible && typeof window.showToast === "function") {
          window.showToast(error?.message || "Cloudove ulozeni selhalo.");
        }
        return false;
      });
    };
  }

  function bindPanelButtons() {
    const panel = document.querySelector("#cloudPanel");
    if (!panel || panel.dataset.liveHotfixBound === "1") return;
    panel.dataset.liveHotfixBound = "1";
    panel.querySelector("[data-cloud-test]")?.addEventListener("click", () => testConnection().catch((error) => {
      setCloudPanel("danger", "Pripojeni selhalo", error?.message || "");
    }));
    panel.querySelector("[data-cloud-pull]")?.addEventListener("click", () => pullState().catch((error) => {
      setCloudPanel("danger", "Stazeni selhalo", error?.message || "");
    }));
    panel.querySelector("[data-cloud-push]")?.addEventListener("click", () => pushState({ quiet: false }).catch((error) => {
      setCloudPanel("danger", "Ulozeni selhalo", error?.message || "");
    }));
  }

  async function refreshAuthAndMaybePull() {
    try {
      const session = await getSession();
      const user = session?.user || null;
      updateTopStatus(user);
      if (!user?.email) {
        setSettingsBadge("warn", "prihlaste se do cloudu");
        setCloudPanel("warn", "Cloud ceka na prihlaseni", "Bez prihlaseni se zmeny neulozi do cloudu.");
        if (typeof window.kaiserLockApp === "function") {
          window.kaiserLockApp("Nejdrive se prihlaste. Bez prihlaseni se zmeny neulozi do cloudu.");
        }
        return;
      }

      window.kaiserAuthState = {
        authenticated: true,
        email: user.email,
        user,
        checkedAt: new Date().toISOString()
      };
      setCloudPanel("ok", "Cloud prihlasen", user.email);
      setSettingsBadge("ok", "cloud prihlasen");
      if (!pullAttempted && hasRuntimeState()) {
        pullAttempted = true;
        window.setTimeout(() => pullState().catch(() => {}), 350);
      }
    } catch {
      updateTopStatus(null);
      setSettingsBadge("warn", "prihlaste se do cloudu");
    }
  }

  function bootWhenReady(attempt = 0) {
    ensureDefaults();
    installApi();
    bindPanelButtons();
    if (typeof saveState === "function") patchSaveState();
    refreshAuthAndMaybePull();

    if ((!hasRuntimeState() || !document.querySelector("#cloudPanel")) && attempt < 80) {
      window.setTimeout(() => bootWhenReady(attempt + 1), 150);
      return;
    }
    if (hasRuntimeState()) {
      patchSaveState();
      if (!pullAttempted) {
        pullAttempted = true;
        window.setTimeout(() => pullState().catch(() => {}), 500);
      }
    }
    bindPanelButtons();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => bootWhenReady(), { once: true });
  } else {
    bootWhenReady();
  }
})();
