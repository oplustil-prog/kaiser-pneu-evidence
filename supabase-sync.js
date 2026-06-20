(function () {
  const CONFIG_KEY = "kaiser-pneu-supabase-config-v1";
  const META_KEY = "kaiser-pneu-supabase-meta-v1";
  const APP_STORAGE_KEY = "kaiser-pneu-evidence-v5";
  const SUPABASE_MODULE_URL = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

  const defaults = {
    url: "",
    anonKey: "",
    table: "kaiser_app_state",
    rowId: "production",
    bucket: "kaiser-documents",
    autoLoad: true,
    autoSync: false
  };

  let client = null;
  let clientKey = "";
  let clientPromise = null;
  let pushTimer = 0;
  let syncPaused = false;
  let localSaveState = null;
  let initialized = false;
  let cloudSessionReady = false;
  let pushInFlight = false;
  let pendingPush = false;
  let saveGuardActive = false;
  let storagePatched = false;
  let cloudBaselineReady = false;

  function saveGuard(event) {
    event.preventDefault();
    event.returnValue = "Zmeny se jeste ukladaji do cloudu.";
    return event.returnValue;
  }

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
      autoSync: false
    };
  }

  function writeConfig(config) {
    localStorage.setItem(CONFIG_KEY, JSON.stringify({ ...defaults, ...config, autoLoad: true, autoSync: false }));
    client = null;
    clientKey = "";
  }

  function hasConnection(config = readConfig()) {
    return Boolean(String(config.url || "").trim() && String(config.anonKey || "").trim());
  }

  function hasAuthenticatedSession() {
    return Boolean(window.kaiserAuthState?.authenticated || cloudSessionReady);
  }

  function getMeta() {
    return readJson(META_KEY, {});
  }

  function setMeta(meta) {
    localStorage.setItem(META_KEY, JSON.stringify({ ...getMeta(), ...meta }));
  }

  function settingsStatusText(kind, message) {
    const normalized = String(message || "").toLowerCase();
    if (kind === "danger") return "chyba cloudu";
    if (kind === "work") {
      if (normalized.includes("stahuji")) return "nacitam z cloudu";
      return "ukladam do cloudu";
    }
    if (kind === "warn") {
      if (normalized.includes("prihlaseni")) return "cekam na prihlaseni";
      if (normalized.includes("lokalni")) return "lokalni rezim";
      return "cloud ceka";
    }
    if (normalized.includes("ulozena")) return "ulozeno v cloudu";
    if (normalized.includes("nactena")) return "nacteno z cloudu";
    if (hasAuthenticatedSession()) return "cloud aktivni";
    return "cloud pripraven";
  }

  function headerStatusText(kind, message) {
    const normalized = String(message || "").toLowerCase();
    if (!hasAuthenticatedSession()) return "Cloud neni prihlasen";
    if (kind === "danger") return normalized.includes("ulozeni") ? "Chyba ulozeni" : "Chyba cloudu";
    if (kind === "work") {
      if (normalized.includes("stahuji")) return "Nacitam z cloudu";
      return "Ukladam do cloudu";
    }
    if (normalized.includes("ulozena")) return "Ulozeno v cloudu";
    if (normalized.includes("nactena")) return "Nacteno z cloudu";
    return "Cloud prihlasen";
  }

  function headerStatusDetail(kind, message, detail = "") {
    const normalized = String(message || "").toLowerCase();
    const auth = window.kaiserAuthState || {};
    const email = String(auth.email || auth.user?.email || "").trim();
    const users = Array.isArray(window.state?.users) ? window.state.users : [];
    const knownUser = users.find((item) => item.email === email);
    const name = knownUser?.name || email || "prihlaseny uzivatel";

    if (!hasAuthenticatedSession()) return "ceka na cloudove prihlaseni";
    if (kind === "danger") return detail || "ulozeni se nepodarilo";
    if (kind === "work") return normalized.includes("stahuji") ? "cekam na data" : "zmena se odesila";
    if (normalized.includes("ulozena") || normalized.includes("nactena")) return compactSyncLabel(detail);
    return name;
  }

  function compactSyncLabel(detail = "") {
    const meta = getMeta();
    const syncDate = meta.lastSyncAt ? new Date(meta.lastSyncAt) : null;
    if (syncDate && Number.isFinite(syncDate.getTime())) {
      return `Sync ${syncDate.toLocaleTimeString("cs-CZ", { hour: "2-digit", minute: "2-digit" })}`;
    }
    const match = String(detail || "").match(/(\d{1,2}:\d{2})/);
    return match ? `Sync ${match[1]}` : "Sync hotovo";
  }

  function updateHeaderStatus(kind, message, detail = "") {
    window.kaiserCloudHeaderStatus = { kind, message, detail };
    const box = document.querySelector("#loginStatusBox");
    if (!box) return;

    const title = box.querySelector("[data-login-status-title]");
    const subtitle = box.querySelector("[data-login-status-subtitle]");
    if (!title || !subtitle) return;

    const hasSession = hasAuthenticatedSession();
    const isProblem = kind === "danger" || !hasSession;
    box.classList.toggle("is-logged-out", isProblem);
    box.classList.toggle("is-syncing", kind === "work" && hasSession);
    title.textContent = headerStatusText(kind, message);
    subtitle.textContent = headerStatusDetail(kind, message, detail);
    box.title = detail || message || "";
  }

  window.kaiserApplyCloudHeaderStatus = function () {
    const status = window.kaiserCloudHeaderStatus;
    if (!status) return;
    updateHeaderStatus(status.kind, status.message, status.detail);
  };

  function setStatus(kind, message, detail = "") {
    const panel = document.querySelector("#cloudPanel");
    const badgeClass = kind === "ok" ? "badge-ok" : kind === "danger" ? "badge-danger" : "badge-warning";
    const settingsBadge = document.querySelector("[data-settings-sync-status]");
    updateHeaderStatus(kind, message, detail);
    if (settingsBadge) {
      settingsBadge.className = `badge ${badgeClass}`;
      settingsBadge.textContent = settingsStatusText(kind, message);
      settingsBadge.title = detail || message || "";
    }

    if (!panel) return;
    const dot = panel.querySelector("[data-cloud-dot]");
    const status = panel.querySelector("[data-cloud-status]");
    const meta = panel.querySelector("[data-cloud-meta]");

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
    return stateProfile(state);
  }

  function snapshotState() {
    return JSON.parse(JSON.stringify(state || {}));
  }

  function stateProfile(sourceState = {}) {
    const tires = Array.isArray(sourceState?.tires) ? sourceState.tires : [];
    const vehicles = Array.isArray(sourceState?.vehicles) ? sourceState.vehicles : [];
    const services = Array.isArray(sourceState?.services) ? sourceState.services : [];
    const measurements = Array.isArray(sourceState?.measurements) ? sourceState.measurements : [];
    const users = Array.isArray(sourceState?.users) ? sourceState.users : [];
    return {
      tires: tires.length,
      vehicles: vehicles.length,
      services: services.length,
      measurements: measurements.length,
      users: users.length,
      mountedPositions: tires.filter((tire) => tire?.vehicle && tire?.position).length,
      vehicleSlots: vehicles.reduce((sum, vehicle) => sum + (Array.isArray(vehicle?.configuration) ? vehicle.configuration.length : 0), 0),
      realUsers: users.filter((user) => String(user?.email || "").includes("@") && !String(user?.email || "").endsWith("@kaiser.local")).length
    };
  }

  function profileText(profile) {
    return [
      `vozidla ${profile.vehicles}`,
      `pozice ${profile.vehicleSlots}`,
      `pneu ${profile.tires}`,
      `osazene ${profile.mountedPositions}`,
      `uzivatele ${profile.users}`
    ].join(", ");
  }

  function destructiveDrops(nextProfile, currentProfile) {
    return profileDrops(nextProfile, currentProfile, true);
  }

  function anyProfileDrops(nextProfile, currentProfile) {
    return profileDrops(nextProfile, currentProfile, false);
  }

  function profileDrops(nextProfile, currentProfile, severeOnly) {
    const labels = {
      vehicles: "vozidla",
      vehicleSlots: "pozice vozidel",
      tires: "pneu",
      mountedPositions: "osazene pozice",
      users: "uzivatele",
      realUsers: "realne pristupy",
      services: "servis",
      measurements: "mereni"
    };
    return Object.keys(labels)
      .filter((key) => {
        const nextValue = Number(nextProfile[key] || 0);
        const currentValue = Number(currentProfile[key] || 0);
        return severeOnly
          ? isSevereDrop(key, nextValue, currentValue)
          : currentValue > 0 && nextValue < currentValue;
      })
      .map((key) => `${labels[key]} ${currentProfile[key]} -> ${nextProfile[key]}`);
  }

  function isSevereDrop(key, nextValue, currentValue) {
    if (currentValue <= 0 || nextValue >= currentValue) return false;
    const lost = currentValue - nextValue;
    if (nextValue <= 0) return true;
    const ratio = lost / currentValue;
    const limits = {
      vehicles: { count: 3, ratio: 0.15 },
      vehicleSlots: { count: 6, ratio: 0.18 },
      tires: { count: 8, ratio: 0.12 },
      mountedPositions: { count: 3, ratio: 0.35 },
      users: { count: 3, ratio: 0.18 },
      realUsers: { count: 3, ratio: 0.18 },
      services: { count: 10, ratio: 0.2 },
      measurements: { count: 10, ratio: 0.3 }
    };
    const limit = limits[key] || { count: 3, ratio: 0.25 };
    return lost >= limit.count || ratio >= limit.ratio;
  }

  function hardValidationProblems(profile) {
    const problems = [];
    if (profile.vehicles <= 0) problems.push("chybi vozidla");
    if (profile.vehicleSlots <= 0) problems.push("chybi pozice vozidel");
    if (profile.tires <= 0) problems.push("chybi pneu");
    if (profile.users <= 0) problems.push("chybi uzivatele");
    return problems;
  }

  function guardMessage(action, drops, fromProfile, toProfile) {
    return `${action} zablokovano: ${drops.join("; ")}. Zdroj: ${profileText(fromProfile)}. Cil: ${profileText(toProfile)}.`;
  }

  function userMergeKey(user) {
    return String(user?.email || user?.id || user?.name || "").trim().toLowerCase();
  }

  function mergeUserRows(baseUsers = [], incomingUsers = []) {
    const users = new Map();
    (baseUsers || []).forEach((user) => {
      const key = userMergeKey(user);
      if (key) users.set(key, structuredClone(user));
    });
    (incomingUsers || []).forEach((user) => {
      const key = userMergeKey(user);
      if (!key) return;
      users.set(key, {
        ...(users.get(key) || {}),
        ...user
      });
    });
    return [...users.values()];
  }

  function normalizeState(nextState) {
    const base = typeof initialState !== "undefined" ? structuredClone(initialState) : {};
    const mergedUsers =
      typeof mergeDefaultUsers === "function"
        ? mergeDefaultUsers(nextState?.users || base.users || [])
        : mergeUserRows(base.users || [], nextState?.users || []);
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
      users: mergedUsers,
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
      if (!syncPaused) schedulePush({ delay: 250, source: "Auto" });
    };
    window.kaiserCloudSavePatched = true;
  }

  function patchLocalStorageWrites() {
    if (storagePatched) return;
    const originalSetItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      const result = originalSetItem.call(this, key, value);
      if (this === localStorage && key === APP_STORAGE_KEY && !syncPaused) {
        schedulePush({ delay: 250, source: "Auto" });
      }
      return result;
    };
    storagePatched = true;
  }

  async function getClient() {
    const config = readConfig();
    if (!hasConnection(config)) throw new Error("Supabase neni nastaveny.");

    const key = `${config.url}|${config.anonKey}`;
    if (window.kaiserAuthSimple?.getClient) {
      const sharedClient = await window.kaiserAuthSimple.getClient();
      client = sharedClient;
      clientKey = key;
      return sharedClient;
    }

    if (client && clientKey === key) return client;
    if (clientPromise && clientKey === key) return clientPromise;

    clientKey = key;
    clientPromise = import(SUPABASE_MODULE_URL)
      .then((module) => {
        client = module.createClient(config.url.trim(), config.anonKey.trim(), {
          auth: {
            autoRefreshToken: true,
            persistSession: true,
            detectSessionInUrl: false
          }
        });
        return client;
      })
      .finally(() => {
        clientPromise = null;
      });
    return clientPromise;
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
      cloudSessionReady = Boolean(user);
      target.textContent = user?.email || "neprihlaseno";
      return user;
    } catch {
      cloudSessionReady = false;
      target.textContent = "neprihlaseno";
      return null;
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
    const manual = options.manual === true;
    const config = readConfig();
    if (!hasConnection(config)) {
      if (!options.quiet) setStatus("warn", "Cloud neni nastaveny", "Data nejsou odeslana do cloudu.");
      return false;
    }
    if (!hasAuthenticatedSession()) {
      if (!options.quiet) setStatus("warn", "Cloud ceka na prihlaseni", "Nejdrive se prihlaste.");
      return false;
    }
    setStatus("work", manual ? "Kontroluji data pred nahranim..." : "Ukladam zmenu do cloudu...");
    try {
      const supabase = await getClient();
      const nextState = snapshotState();
      const nextProfile = stateProfile(nextState);
      const hardProblems = hardValidationProblems(nextProfile);
      if (hardProblems.length) {
        setStatus("danger", "Nahrani do cloudu zablokovano", hardProblems.join(", "));
        return false;
      }

      const current = await supabase
        .from(config.table)
        .select("state, updated_at, counts, app_version, updated_by")
        .eq("id", config.rowId)
        .maybeSingle();
      if (current.error) throw current.error;
      if (current.data?.state) {
        const cloudProfile = stateProfile(current.data.state);
        const anyDrops = anyProfileDrops(nextProfile, cloudProfile);
        if (anyDrops.length && !cloudBaselineReady) {
          if (!manual) {
            setStatus("work", "Nacitam aktualni cloudova data...", `Cloud ma vice dat: ${anyDrops.join("; ")}.`);
            await pullState({ reason: "pre-upload-baseline" });
            return false;
          }
          setStatus("danger", "Cloud chranen - nejdrive stahnete data", guardMessage("Nahrani", anyDrops, nextProfile, cloudProfile));
          return false;
        }
        const drops = destructiveDrops(nextProfile, cloudProfile);
        if (drops.length) {
          setStatus("danger", "Cloud chranen - nahrani zablokovano", guardMessage("Nahrani", drops, nextProfile, cloudProfile));
          return false;
        }
      }

      const now = new Date().toISOString();
      const counts = nextProfile;
      const payload = {
        state: nextState,
        app_version: STORAGE_KEY,
        counts,
        updated_at: now,
        updated_by: "github-pages"
      };
      const write = current.data
        ? await supabase.from(config.table).update(payload).eq("id", config.rowId)
        : await supabase.from(config.table).upsert({ id: config.rowId, ...payload }, { onConflict: "id" });
      const { error } = write;

      if (error) throw error;
      setMeta({ lastSyncAt: now, lastPushAt: now, counts });
      setStatus("ok", "Data jsou ulozena v cloudu", lastSyncLabel());
      pendingPush = false;
      cloudBaselineReady = true;
      return true;
    } catch (error) {
      setStatus("danger", "Ulozeni do cloudu selhalo", error.message || "Zkontrolujte Supabase nastaveni.");
      return false;
    }
  }

  async function pullState(options = {}) {
    const config = readConfig();
    if (!hasConnection(config)) {
      setStatus("warn", "Cloud neni nastaveny", "Data nejsou pripojena ke cloudu.");
      return;
    }
    if (!hasAuthenticatedSession()) {
      setStatus("warn", "Cloud ceka na prihlaseni", "Nejdrive se prihlaste.");
      return;
    }

    setStatus("work", "Stahuji data z cloudu...");
    try {
      const supabase = await getClient();
      const { data, error } = await supabase
        .from(config.table)
        .select("state, updated_at, counts, app_version, updated_by")
        .eq("id", config.rowId)
        .maybeSingle();

      if (error) throw error;
      if (!data?.state) {
        setStatus("warn", "Cloud je prazdny", "Nejdrive nahrajte aktualni data do cloudu.");
        return;
      }

      const localBefore = snapshotState();
      const localProfile = stateProfile(localBefore);
      const cloudProfile = stateProfile(data.state);
      const hardProblems = hardValidationProblems(cloudProfile);
      if (hardProblems.length) {
        setStatus("danger", "Stazeni z cloudu zablokovano", hardProblems.join(", "));
        return;
      }
      const drops = destructiveDrops(cloudProfile, localProfile);
      if (drops.length) {
        setStatus("danger", "Data v aplikaci chranena - stazeni zablokovano", guardMessage("Stazeni", drops, cloudProfile, localProfile));
        return;
      }

      state = normalizeState(data.state);
      selectedVehicle = state.vehicles[0]?.spz || "";
      selectedPosition = "";
      saveLocalOnly();
      if (typeof renderAll === "function") renderAll();
      window.kaiserAuthSimple?.renderHeader?.();
      setMeta({ lastSyncAt: new Date().toISOString(), lastPullAt: new Date().toISOString(), counts: data.counts || stateCounts() });
      cloudBaselineReady = true;
      setStatus("ok", "Cloudova data jsou nactena", lastSyncLabel());
    } catch (error) {
      setStatus("danger", "Stazeni z cloudu selhalo", error.message || "Zkontrolujte Supabase nastaveni.");
    }
  }

  function setSaveGuard(active) {
    if (active === saveGuardActive) return;
    saveGuardActive = active;
    if (active) {
      window.addEventListener("beforeunload", saveGuard);
    } else {
      window.removeEventListener("beforeunload", saveGuard);
    }
  }

  async function flushQueuedPush(source = "Auto") {
    return pushState({ source });
  }

  function schedulePush(options = {}) {
    pendingPush = true;
    const config = readConfig();
    if (!hasConnection(config)) return;
    if (!hasAuthenticatedSession()) {
      setStatus("warn", "Cloud ceka na prihlaseni", "Nejdrive se prihlaste.");
      return;
    }
    setStatus("work", "Ukladam zmenu do cloudu...", "Po ulozeni bude zmena drzet i po obnoveni stranky.");
    setSaveGuard(true);
    window.clearTimeout(pushTimer);
    pushTimer = window.setTimeout(() => {
      pushState({ source: options.source || "Auto" }).finally(() => {
        if (!pendingPush) setSaveGuard(false);
      });
    }, options.delay || 250);
  }

  async function uploadFile(file, folder = "documents") {
    const config = readConfig();
    if (!file || !hasConnection(config) || !hasAuthenticatedSession()) return null;

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
    if (!path || !hasConnection(config) || !hasAuthenticatedSession()) return;
    try {
      const supabase = await getClient();
      const { data, error } = await supabase.storage.from(config.bucket).createSignedUrl(path, 60 * 10);
      if (error) throw error;
      if (data?.signedUrl) window.open(data.signedUrl, "_blank", "noopener");
    } catch (error) {
      setStatus("danger", "Soubor se nepodarilo otevrit", error.message || "");
    }
  }

  function bindPanel(panel) {
    const form = panel.querySelector("#cloudConfigForm");
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      setStatus("ok", "Cloud nastaveni je zamcene", "Produkční Supabase pripojeni meni jen spravce aplikace.");
    });

    panel.querySelector("[data-cloud-test]").addEventListener("click", testConnection);
    panel.querySelector("[data-cloud-push]").addEventListener("click", () => pushState({ manual: true }));
    panel.querySelector("[data-cloud-pull]").addEventListener("click", pullState);
    panel.querySelector("[data-cloud-disconnect]").addEventListener("click", () => {
      localStorage.removeItem(CONFIG_KEY);
      client = null;
      clientKey = "";
      fillForm();
      refreshAuthStatus();
      setStatus("warn", "Cloud je odpojeny", "Data nejsou pripojena ke cloudu.");
    });
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
    form.elements.autoSync.checked = false;
    form.elements.autoLoad.disabled = true;
    form.elements.autoSync.disabled = true;
    ["url", "anonKey", "table", "rowId", "bucket"].forEach((name) => {
      const field = form.elements[name];
      if (!field) return;
      field.readOnly = true;
      field.setAttribute("aria-readonly", "true");
      field.tabIndex = -1;
    });
    const saveButton = form.querySelector("[data-cloud-save]");
    if (saveButton) saveButton.disabled = true;
    const disconnectButton = document.querySelector("[data-cloud-disconnect]");
    if (disconnectButton) disconnectButton.disabled = true;
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

      .cloud-config-form label.is-locked {
        position: relative;
      }

      .cloud-config-form label.is-locked::after {
        color: var(--brand-strong);
        content: "zamceno";
        font-size: .78rem;
        font-weight: 900;
        position: absolute;
        right: 12px;
        top: 4px;
      }

      .cloud-config-form label.is-locked input {
        background: rgba(117, 189, 37, .05);
        color: var(--ink);
        cursor: not-allowed;
      }

      .cloud-panel .button:disabled {
        cursor: not-allowed;
        opacity: .62;
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
            <label class="is-locked" title="Produkční Supabase URL je zamčená.">
              Supabase URL
              <input name="url" type="url" placeholder="https://...supabase.co" readonly />
            </label>
            <label class="is-locked" title="Produkční publishable key je zamčený.">
              Public anon / publishable key
              <input name="anonKey" type="password" autocomplete="off" readonly />
            </label>
            <label class="is-locked" title="Produkční tabulka je zamčená.">
              Tabulka
              <input name="table" type="text" readonly />
            </label>
            <label class="is-locked" title="Produkční ID dat je zamčené.">
              ID dat
              <input name="rowId" type="text" readonly />
            </label>
            <label class="is-locked" title="Produkční storage bucket je zamčený.">
              Storage bucket
              <input name="bucket" type="text" readonly />
            </label>
            <label class="settings-switch is-locked" title="V ostrém provozu je načítání cloudu povinné.">
              <input name="autoLoad" type="checkbox" checked disabled />
              <span>Nacist cloud pri otevreni</span>
            </label>
            <label class="settings-switch is-locked" title="Automatické přepisování cloudu je bezpečnostně vypnuté.">
              <input name="autoSync" type="checkbox" disabled />
              <span>Automaticky prepisovat cloud vypnuto</span>
            </label>
            <button class="button button-primary" type="submit" data-cloud-save disabled>Cloud nastaveni zamceno</button>
          </form>

          <div class="cloud-actions">
            <button class="button button-soft" type="button" data-cloud-test>Test pripojeni</button>
            <button class="button button-primary" type="button" data-cloud-push>Nahrat data</button>
            <button class="button button-soft" type="button" data-cloud-pull>Stahnout data</button>
            <button class="button button-soft" type="button" data-cloud-disconnect disabled>Odpojit</button>
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
    patchLocalStorageWrites();
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
        if (config.autoLoad && hasAuthenticatedSession() && user) {
          window.setTimeout(() => pullState(), 500);
        } else if (config.autoLoad) {
          setStatus("warn", "Cloud pripraven, cekam na prihlaseni", lastSyncLabel());
        }
      });
    } else {
      setStatus("warn", "Cloud neni pripojen", "Data nejsou pripojena ke cloudu.");
    }
  }

  window.kaiserCloud = {
    isConfigured: hasConnection,
    openFile,
    pullState,
    pushState,
    testConnection,
    uploadFile
  };

  window.addEventListener("kaiser-auth-ready", () => {
    cloudSessionReady = true;
    setStatus("work", "Cloudove prihlaseni overeno", pendingPush ? "Ukladam cekajici zmeny do cloudu..." : "Stahuji produkcni data...");
    refreshAuthStatus();
    if (pendingPush) {
      window.setTimeout(() => pushState({ source: "Auth ready" }), 100);
    } else if (readConfig().autoLoad) {
      window.setTimeout(() => pullState(), 300);
    }
  });

  window.addEventListener("kaiser-auth-signed-out", () => {
    cloudSessionReady = false;
    refreshAuthStatus();
    setStatus("warn", "Uzivatel je odhlaseny", "Cekam na cloudove prihlaseni.");
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initCloudSync);
  } else {
    initCloudSync();
  }
}());
