(function () {
  const CONFIG_KEY = "kaiser-pneu-supabase-config-v1";
  const META_KEY = "kaiser-pneu-supabase-meta-v1";
  const BACKUP_KEY = "kaiser-pneu-local-backup-before-cloud-pull";
  const SUPABASE_MODULE_URL = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

  const defaults = {
    url: "",
    anonKey: "",
    table: "kaiser_app_state",
    rowId: "production",
    bucket: "kaiser-documents",
    autoLoad: true,
    autoSync: true
  };

  let client = null;
  let clientKey = "";
  let pushTimer = 0;
  let syncPaused = false;
  let localSaveState = null;
  let initialized = false;

  function text(value) {
    return String(value || "").replace(/[&<>"']/g, (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[char]
    );
  }

  function readJson(key, fallback) {
    try {
      const value = localStorage.getItem(key);
      return value ? JSON.parse(value) : fallback;
    } catch {
      return fallback;
    }
  }

  function readConfig() {
    const runtimeDefaults = window.kaiserSupabaseDefaults || window.kaiserSupabaseConfig || {};
    return {
      ...defaults,
      ...runtimeDefaults,
      ...readJson(CONFIG_KEY, {}),
      autoLoad: true,
      autoSync: true
    };
  }

  function writeConfig(config) {
    localStorage.setItem(CONFIG_KEY, JSON.stringify({ ...defaults, ...config, autoLoad: true, autoSync: true }));
    client = null;
    clientKey = "";
  }

  function hasConnection(config = readConfig()) {
    return Boolean(String(config.url || "").trim() && String(config.anonKey || "").trim());
  }

  function getMeta() {
    return readJson(META_KEY, {});
  }

  function setMeta(meta) {
    localStorage.setItem(META_KEY, JSON.stringify({ ...getMeta(), ...meta }));
  }

  function setStatus(kind, message, detail = "") {
    const panel = document.querySelector("#cloudPanel");
    if (!panel) return;
    const dot = panel.querySelector("[data-cloud-dot]");
    const status = panel.querySelector("[data-cloud-status]");
    const meta = panel.querySelector("[data-cloud-meta]");
    const badgeClass = kind === "ok" ? "badge-ok" : kind === "danger" ? "badge-danger" : "badge-warning";

    dot.className = `cloud-dot is-${kind}`;
    status.className = `badge ${badgeClass}`;
    status.textContent = message;
    meta.textContent = detail || lastSyncLabel();
  }

  function lastSyncLabel() {
    const meta = getMeta();
    if (!meta.lastSyncAt) return "Zatim bez cloud synchronizace.";
    return `Posledni synchronizace ${new Date(meta.lastSyncAt).toLocaleString("cs-CZ")}.`;
  }

  function stateCounts() {
    return {
      tires: Array.isArray(state?.tires) ? state.tires.length : 0,
      vehicles: Array.isArray(state?.vehicles) ? state.vehicles.length : 0,
      services: Array.isArray(state?.services) ? state.services.length : 0,
      measurements: Array.isArray(state?.measurements) ? state.measurements.length : 0,
      users: Array.isArray(state?.users) ? state.users.length : 0
    };
  }

  function snapshotState() {
    return JSON.parse(JSON.stringify(state || {}));
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

  function patchSaveState() {
    if (window.kaiserCloudSavePatched || typeof saveState !== "function") return;
    localSaveState = saveState;
    saveState = function () {
      localSaveState();
      if (!syncPaused) schedulePush();
    };
    window.kaiserCloudSavePatched = true;
  }

  async function getClient() {
    const config = readConfig();
    if (!hasConnection(config)) throw new Error("Supabase neni nastaveny.");

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

  async function refreshAuthStatus() {
    const target = document.querySelector("[data-cloud-auth]");
    if (!target) return null;
    if (!hasConnection()) {
      target.textContent = "bez cloudu";
      return null;
    }

    try {
      const supabase = await getClient();
      const { data } = await supabase.auth.getSession();
      const user = data?.session?.user || null;
      target.textContent = user?.email || "neprihlaseno";
      return user;
    } catch {
      target.textContent = "neprihlaseno";
      return null;
    }
  }

  async function signIn(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());
    const email = String(data.email || "").trim();
    const password = String(data.password || "");

    if (!email || !password) {
      setStatus("warn", "Doplnte e-mail a heslo");
      return;
    }

    setStatus("work", "Prihlasuji...");
    try {
      const supabase = await getClient();
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      form.elements.password.value = "";
      await refreshAuthStatus();
      setStatus("ok", "Uzivatel je prihlaseny", lastSyncLabel());
      if (readConfig().autoLoad) window.setTimeout(() => pullState(), 300);
    } catch (error) {
      setStatus("danger", "Prihlaseni selhalo", error.message || "Zkontrolujte e-mail a heslo.");
    }
  }

  async function signOut() {
    try {
      const supabase = await getClient();
      await supabase.auth.signOut();
      await refreshAuthStatus();
      setStatus("warn", "Uzivatel je odhlaseny", "Data zustavaji ulozena v tomto prohlizeci.");
    } catch (error) {
      setStatus("danger", "Odhlaseni selhalo", error.message || "");
    }
  }

  async function testConnection() {
    const config = readConfig();
    if (!hasConnection(config)) {
      setStatus("warn", "Cloud neni nastaveny", "Doplnte Supabase URL a public key.");
      return;
    }

    setStatus("work", "Testuji pripojeni...");
    try {
      const supabase = await getClient();
      const { data, error } = await supabase
        .from(config.table)
        .select("id, updated_at")
        .eq("id", config.rowId)
        .maybeSingle();

      if (error) throw error;
      setStatus(
        "ok",
        data ? "Supabase je pripojeny" : "Supabase je pripojeny, cloud je zatim prazdny",
        data?.updated_at ? `Cloudova data z ${new Date(data.updated_at).toLocaleString("cs-CZ")}.` : ""
      );
    } catch (error) {
      setStatus("danger", "Pripojeni selhalo", error.message || "Zkontrolujte tabulku a pristupy.");
    }
  }

  async function pushState(options = {}) {
    const config = readConfig();
    if (!hasConnection(config)) {
      if (!options.quiet) setStatus("warn", "Cloud neni nastaveny", "Data zustavaji ulozena v tomto prohlizeci.");
      return;
    }

    setStatus("work", options.quiet ? "Ukladam do cloudu..." : "Nahravam data do cloudu...");
    try {
      const supabase = await getClient();
      const now = new Date().toISOString();
      const counts = stateCounts();
      const { error } = await supabase.from(config.table).upsert(
        {
          id: config.rowId,
          state: snapshotState(),
          app_version: STORAGE_KEY,
          counts,
          updated_at: now,
          updated_by: "github-pages"
        },
        { onConflict: "id" }
      );

      if (error) throw error;
      setMeta({ lastSyncAt: now, lastPushAt: now, counts });
      setStatus("ok", "Data jsou ulozena v cloudu", lastSyncLabel());
    } catch (error) {
      setStatus("danger", "Ulozeni do cloudu selhalo", error.message || "Zkontrolujte Supabase nastaveni.");
    }
  }

  async function pullState() {
    const config = readConfig();
    if (!hasConnection(config)) {
      setStatus("warn", "Cloud neni nastaveny", "Data zustavaji ulozena v tomto prohlizeci.");
      return;
    }

    setStatus("work", "Stahuji data z cloudu...");
    try {
      const supabase = await getClient();
      const { data, error } = await supabase
        .from(config.table)
        .select("state, updated_at, counts")
        .eq("id", config.rowId)
        .maybeSingle();

      if (error) throw error;
      if (!data?.state) {
        setStatus("warn", "Cloud je prazdny", "Nejdrive nahrajte aktualni data do cloudu.");
        return;
      }

      localStorage.setItem(
        BACKUP_KEY,
        JSON.stringify({
          createdAt: new Date().toISOString(),
          state: snapshotState()
        })
      );

      state = normalizeState(data.state);
      selectedVehicle = state.vehicles[0]?.spz || "";
      selectedPosition = "";
      saveLocalOnly();
      if (typeof renderAll === "function") renderAll();
      setMeta({ lastSyncAt: new Date().toISOString(), lastPullAt: new Date().toISOString(), counts: data.counts || stateCounts() });
      setStatus("ok", "Cloudova data jsou nactena", lastSyncLabel());
    } catch (error) {
      setStatus("danger", "Stazeni z cloudu selhalo", error.message || "Zkontrolujte Supabase nastaveni.");
    }
  }

  function schedulePush() {
    const config = readConfig();
    if (!config.autoSync || !hasConnection(config)) return;
    window.clearTimeout(pushTimer);
    pushTimer = window.setTimeout(() => pushState({ quiet: true }), 1200);
  }

  async function uploadFile(file, folder = "documents") {
    const config = readConfig();
    if (!file || !hasConnection(config)) return null;

    const supabase = await getClient();
    const safeName = String(file.name || "soubor")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9._-]+/g, "-")
      .replace(/^-+|-+$/g, "");
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const path = `${folder}/${stamp}-${safeName || "soubor"}`;
    const { data, error } = await supabase.storage.from(config.bucket).upload(path, file, {
      cacheControl: "3600",
      contentType: file.type || "application/octet-stream",
      upsert: false
    });

    if (error) throw error;
    const signed = await supabase.storage.from(config.bucket).createSignedUrl(data.path, 60 * 60 * 24 * 7);
    const publicData = supabase.storage.from(config.bucket).getPublicUrl(data.path);
    return {
      path: data.path,
      publicUrl: signed?.data?.signedUrl || publicData?.data?.publicUrl || "",
      name: file.name
    };
  }

  async function openFile(path) {
    const config = readConfig();
    if (!path || !hasConnection(config)) return;
    try {
      const supabase = await getClient();
      const { data, error } = await supabase.storage.from(config.bucket).createSignedUrl(path, 60 * 10);
      if (error) throw error;
      if (data?.signedUrl) window.open(data.signedUrl, "_blank", "noopener");
    } catch (error) {
      setStatus("danger", "Soubor se nepodarilo otevrit", error.message || "");
    }
  }

  function downloadJson(name, payload) {
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = name;
    link.click();
    URL.revokeObjectURL(url);
  }

  function downloadBackup() {
    downloadJson(`kaiser-pneu-zaloha-${new Date().toISOString().slice(0, 10)}.json`, {
      exportedAt: new Date().toISOString(),
      source: "Kaiser Evidence pneumatik",
      state: snapshotState()
    });
    setStatus("ok", "Zaloha JSON je stazena", lastSyncLabel());
  }

  function bindPanel(panel) {
    const form = panel.querySelector("#cloudConfigForm");
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const data = Object.fromEntries(new FormData(form).entries());
      writeConfig({
        url: String(data.url || "").trim(),
        anonKey: String(data.anonKey || "").trim(),
        table: String(data.table || defaults.table).trim() || defaults.table,
        rowId: String(data.rowId || defaults.rowId).trim() || defaults.rowId,
        bucket: String(data.bucket || defaults.bucket).trim() || defaults.bucket,
        autoLoad: true,
        autoSync: true
      });
      setStatus(hasConnection() ? "ok" : "warn", hasConnection() ? "Cloud nastaveni je ulozeno" : "Cloud neni nastaveny");
      refreshAuthStatus();
    });

    panel.querySelector("[data-cloud-test]").addEventListener("click", testConnection);
    panel.querySelector("[data-cloud-push]").addEventListener("click", () => pushState());
    panel.querySelector("[data-cloud-pull]").addEventListener("click", pullState);
    panel.querySelector("[data-cloud-backup]").addEventListener("click", downloadBackup);
    panel.querySelector("[data-cloud-disconnect]").addEventListener("click", () => {
      localStorage.removeItem(CONFIG_KEY);
      client = null;
      clientKey = "";
      fillForm();
      refreshAuthStatus();
      setStatus("warn", "Cloud je odpojeny", "Data zustavaji ulozena v tomto prohlizeci.");
    });
    panel.querySelector("#cloudAuthForm").addEventListener("submit", signIn);
    panel.querySelector("[data-cloud-signout]").addEventListener("click", signOut);
  }

  function fillForm() {
    const form = document.querySelector("#cloudConfigForm");
    if (!form) return;
    const config = readConfig();
    form.elements.url.value = config.url || "";
    form.elements.anonKey.value = config.anonKey || "";
    form.elements.table.value = config.table || defaults.table;
    form.elements.rowId.value = config.rowId || defaults.rowId;
    form.elements.bucket.value = config.bucket || defaults.bucket;
    form.elements.autoLoad.checked = true;
    form.elements.autoSync.checked = true;
    form.elements.autoLoad.disabled = true;
    form.elements.autoSync.disabled = true;
  }

  function ensureStyles() {
    if (document.querySelector("#cloudSyncStyles")) return;
    const style = document.createElement("style");
    style.id = "cloudSyncStyles";
    style.textContent = `
      .cloud-panel {
        border-color: rgba(117, 189, 37, .32);
      }

      .cloud-status-row {
        align-items: center;
        display: flex;
        gap: 10px;
      }

      .cloud-dot {
        border-radius: 999px;
        display: inline-block;
        height: 10px;
        width: 10px;
      }

      .cloud-dot.is-ok { background: var(--green); }
      .cloud-dot.is-warn { background: #f3b53f; }
      .cloud-dot.is-danger { background: #e05252; }
      .cloud-dot.is-work { background: #2d7dd2; }

      .cloud-meta {
        color: var(--muted);
        font-size: .86rem;
        margin: 8px 0 0;
      }

      .cloud-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin-top: 14px;
      }

      .cloud-config-form,
      .cloud-auth-form {
        margin-top: 16px;
      }

      .cloud-config-form input[type="password"] {
        font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      }

      .cloud-auth-form {
        border-top: 1px solid rgba(30, 41, 36, .1);
        padding-top: 14px;
      }

      .settings-switch.is-locked {
        border-color: rgba(117, 189, 37, .32);
        background: rgba(117, 189, 37, .08);
      }

      .settings-switch.is-locked input {
        cursor: not-allowed;
      }

      .settings-switch.is-locked span::after {
        color: var(--brand-strong);
        content: " zamceno";
        font-size: .78rem;
        font-weight: 800;
      }
    `;
    document.head.appendChild(style);
  }

  function ensurePanel() {
    if (document.querySelector("#cloudPanel")) return true;
    const grid = document.querySelector(".settings-grid");
    if (!grid) return false;

    const config = readConfig();
    grid.insertAdjacentHTML(
      "beforeend",
      `
        <article class="panel wide-panel cloud-panel" id="cloudPanel">
          <div class="panel-header">
            <div>
              <p class="eyebrow">Cloud</p>
              <h3>Supabase databaze a uloziste</h3>
            </div>
            <div class="cloud-status-row">
              <span class="cloud-dot is-${hasConnection(config) ? "ok" : "warn"}" data-cloud-dot></span>
              <span class="badge ${hasConnection(config) ? "badge-ok" : "badge-warning"}" data-cloud-status>
                ${hasConnection(config) ? "pripraveno" : "lokalni rezim"}
              </span>
              <span class="badge badge-neutral" data-cloud-auth>neprihlaseno</span>
            </div>
          </div>
          <p class="cloud-meta" data-cloud-meta>${text(lastSyncLabel())}</p>

          <form class="entry-form cloud-config-form" id="cloudConfigForm">
            <label>
              Supabase URL
              <input name="url" type="url" placeholder="https://...supabase.co" />
            </label>
            <label>
              Public anon / publishable key
              <input name="anonKey" type="password" autocomplete="off" />
            </label>
            <label>
              Tabulka
              <input name="table" type="text" />
            </label>
            <label>
              ID dat
              <input name="rowId" type="text" />
            </label>
            <label>
              Storage bucket
              <input name="bucket" type="text" />
            </label>
            <label class="settings-switch is-locked" title="V ostrém provozu je načítání cloudu povinné.">
              <input name="autoLoad" type="checkbox" checked disabled />
              <span>Nacist cloud pri otevreni</span>
            </label>
            <label class="settings-switch is-locked" title="V ostrém provozu je automatické ukládání povinné.">
              <input name="autoSync" type="checkbox" checked disabled />
              <span>Automaticky ukladat zmeny</span>
            </label>
            <button class="button button-primary" type="submit">Ulozit cloud</button>
          </form>

          <form class="entry-form cloud-auth-form" id="cloudAuthForm">
            <label>
              E-mail
              <input name="email" type="email" autocomplete="email" />
            </label>
            <label>
              Heslo
              <input name="password" type="password" autocomplete="current-password" />
            </label>
            <button class="button button-primary" type="submit">Prihlasit</button>
            <button class="button button-soft" type="button" data-cloud-signout>Odhlasit</button>
          </form>

          <div class="cloud-actions">
            <button class="button button-soft" type="button" data-cloud-test>Test pripojeni</button>
            <button class="button button-primary" type="button" data-cloud-push>Nahrat data</button>
            <button class="button button-soft" type="button" data-cloud-pull>Stahnout data</button>
            <button class="button button-soft" type="button" data-cloud-backup>Zaloha JSON</button>
            <button class="button button-soft" type="button" data-cloud-disconnect>Odpojit</button>
          </div>
        </article>
      `
    );

    bindPanel(document.querySelector("#cloudPanel"));
    fillForm();
    return true;
  }

  function initCloudSync() {
    if (initialized) return;
    initialized = true;
    ensureStyles();
    patchSaveState();
    document.addEventListener("click", (event) => {
      const trigger = event.target.closest("[data-open-cloud-file]");
      if (trigger) openFile(trigger.dataset.openCloudFile);
    });
    if (!ensurePanel()) return;

    const config = readConfig();
    if (hasConnection(config)) {
      setStatus("ok", "Cloud pripraven", lastSyncLabel());
      refreshAuthStatus().then((user) => {
        if (config.autoLoad && user) {
          window.setTimeout(() => pullState(), 500);
        } else if (config.autoLoad) {
          setStatus("warn", "Cloud pripraven, cekam na prihlaseni", lastSyncLabel());
        }
      });
    } else {
      setStatus("warn", "Lokalni rezim", "Data jsou zatim jen v tomto prohlizeci.");
    }
  }

  window.kaiserCloud = {
    downloadBackup,
    isConfigured: hasConnection,
    openFile,
    pullState,
    pushState,
    testConnection,
    uploadFile
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initCloudSync);
  } else {
    initCloudSync();
  }
}());
