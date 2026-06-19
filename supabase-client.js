(function () {
  const MODULE_URL = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
  const clients = new Map();
  const clientPromises = new Map();
  const listeners = new Set();
  let modulePromise = null;

  function keyFor(config) {
    return `${String(config?.url || "").trim()}|${String(config?.anonKey || "").trim()}`;
  }

  function assertConfig(config) {
    if (!String(config?.url || "").trim() || !String(config?.anonKey || "").trim()) {
      throw new Error("Cloudove pripojeni neni nastavene.");
    }
  }

  async function loadModule() {
    if (!modulePromise) modulePromise = import(MODULE_URL);
    return modulePromise;
  }

  window.kaiserGetSupabaseClient = async function (config, options = {}) {
    assertConfig(config);
    const key = keyFor(config);
    if (!clients.has(key)) {
      if (!clientPromises.has(key)) {
        clientPromises.set(
          key,
          loadModule().then((module) => module.createClient(config.url.trim(), config.anonKey.trim(), {
            auth: {
              autoRefreshToken: true,
              persistSession: true,
              detectSessionInUrl: true
            }
          }))
        );
      }
      clients.set(key, await clientPromises.get(key));
    }

    const client = clients.get(key);
    if (typeof options.onAuthStateChange === "function") {
      const listenerKey = `${key}|${options.listenerKey || options.onAuthStateChange.name || "listener"}`;
      if (!listeners.has(listenerKey)) {
        client.auth.onAuthStateChange(options.onAuthStateChange);
        listeners.add(listenerKey);
      }
    }
    return client;
  };

  window.kaiserClearSupabaseClients = function () {
    clients.clear();
    clientPromises.clear();
    listeners.clear();
  };
})();
