(function () {
  const CONFIG_KEY = "kaiser-pneu-supabase-config-v1";

  function readStoredConfig() {
    try {
      return JSON.parse(localStorage.getItem(CONFIG_KEY) || "{}");
    } catch {
      return {};
    }
  }

  function enableAutosaveConfig() {
    const defaults = window.kaiserSupabaseDefaults || {};
    window.kaiserSupabaseDefaults = {
      ...defaults,
      autoLoad: true,
      autoSync: false
    };

    const stored = readStoredConfig();
    if (stored.autoSync === false && stored.autoLoad !== false) return;
    localStorage.setItem(
      CONFIG_KEY,
      JSON.stringify({
        ...stored,
        autoLoad: true,
        autoSync: false
      })
    );
  }

  function installFastCloudSave() {
    if (window.kaiserFastCloudAutosaveInstalled || typeof saveState !== "function") return;
    const originalSaveState = saveState;
    let pushTimer = 0;

    saveState = function () {
      originalSaveState();
      window.clearTimeout(pushTimer);
    };

    window.kaiserFastCloudAutosaveInstalled = true;
  }

  enableAutosaveConfig();

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", installFastCloudSave);
  } else {
    installFastCloudSave();
  }
})();
