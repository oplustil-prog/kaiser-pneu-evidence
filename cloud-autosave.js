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
      autoSync: true
    };

    const stored = readStoredConfig();
    if (stored.autoSync === true && stored.autoLoad !== false) return;
    localStorage.setItem(
      CONFIG_KEY,
      JSON.stringify({
        ...stored,
        autoLoad: true,
        autoSync: true
      })
    );
  }

  function installFastCloudSave() {
    if (window.kaiserFastCloudAutosaveInstalled || typeof saveState !== "function") return;
    const originalSaveState = saveState;
    let pushTimer = 0;

    saveState = function () {
      originalSaveState();
      if (!window.kaiserCloud?.isConfigured?.() || !window.kaiserCloud?.pushState) return;
      if (!window.kaiserAuthState?.authenticated) return;
      window.clearTimeout(pushTimer);
      pushTimer = window.setTimeout(() => window.kaiserCloud.pushState({ quiet: true }), 250);
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
