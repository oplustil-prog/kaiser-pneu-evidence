(function () {
  const STORAGE_KEY = "kaiser-pneu-evidence-v5";
  const CONFIG_KEY = "kaiser-pneu-supabase-config-v1";
  const SUPABASE_MODULE_URL = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
  const INVITE_STATUS = "pozvanka";

  let client = null;
  let clientKey = "";
  let pendingEmail = "";

  function toast(message) {
    if (typeof window.showToast === "function") window.showToast(message);
  }

  function readJson(key, fallback) {
    try {
      const value = localStorage.getItem(key);
      return value ? JSON.parse(value) : fallback;
    } catch {
      return fallback;
    }
  }

  function appState() {
    try {
      if (typeof state !== "undefined") return state || {};
    } catch {
      // The main app may not be loaded yet.
    }
    return readJson(STORAGE_KEY, {});
  }

  function config() {
    const defaults = window.kaiserSupabaseDefaults || window.kaiserSupabaseConfig || {};
    return { ...defaults, ...readJson(CONFIG_KEY, {}) };
  }

  function normalizeEmail(value) {
    return String(value || "").trim().toLowerCase();
  }

  function userById(userId) {
    return (appState().users || []).find((user) => user.id === userId) || null;
  }

  function userByEmail(email) {
    const normalized = normalizeEmail(email);
    return (appState().users || []).find((user) => normalizeEmail(user.email) === normalized) || null;
  }

  function formUser() {
    const form = document.querySelector("#userForm");
    if (!form?.reportValidity()) return null;
    if (typeof collectUserFormData === "function") {
      return collectUserFormData(form, INVITE_STATUS);
    }
    return {
      name: String(form.elements.name?.value || "").trim(),
      email: normalizeEmail(form.elements.email?.value),
      role: String(form.elements.role?.value || "").trim(),
      depot: String(form.elements.depot?.value || "").trim(),
      status: INVITE_STATUS,
      phone: String(form.elements.phone?.value || "").trim()
    };
  }

  function upsertFormUser() {
    const form = document.querySelector("#userForm");
    const data = formUser();
    if (!data) return null;
    if (typeof upsertUser === "function") {
      const result = upsertUser(data);
      if (typeof saveState === "function") saveState();
      form?.reset();
      if (typeof renderAll === "function") renderAll();
      if (typeof setSection === "function") setSection("users");
      return result.user;
    }
    return data;
  }

  function markInvited(user) {
    if (!user) return;
    user.status = INVITE_STATUS;
    user.lastActive = "pozvanka odeslana";
    if (typeof saveState === "function") saveState();
    if (typeof renderUsers === "function") renderUsers();
  }

  async function supabaseClient() {
    const next = config();
    if (!next.url || !next.anonKey) throw new Error("Cloud neni nastaveny.");
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
    clientKey = key;
    return client;
  }

  async function activeSession() {
    const supabase = await supabaseClient();
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    const session = data?.session || null;
    if (!session?.access_token) throw new Error("Nejdrive se prihlaste do aplikace.");
    return session;
  }

  function inviteEndpoint() {
    const next = config();
    if (!next.url) throw new Error("Supabase URL neni nastavena.");
    return `${String(next.url).replace(/\/+$/, "")}/functions/v1/send-user-invite`;
  }

  function appUrl() {
    return `${window.location.origin}${window.location.pathname}`;
  }

  async function callInviteFunction(user) {
    const next = config();
    const session = await activeSession();
    const response = await fetch(inviteEndpoint(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: next.anonKey,
        Authorization: `Bearer ${session.access_token}`
      },
      body: JSON.stringify({
        appUrl: appUrl(),
        user: {
          name: user.name || "",
          email: normalizeEmail(user.email),
          role: user.role || "",
          depot: user.depot || ""
        }
      })
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload.error || "Pozvanku se nepodarilo odeslat.");
    }
    return payload;
  }

  function setButtonBusy(email, busy) {
    pendingEmail = busy ? email : "";
    document.querySelectorAll("#inviteUserButton, [data-user-invite], [data-user-mail-invite]").forEach((button) => {
      const buttonEmail = button.dataset.userMailInvite || "";
      const shouldAffect = button.id === "inviteUserButton" || !email || buttonEmail === email || button.dataset.userInvite;
      if (!shouldAffect) return;
      button.disabled = busy;
      button.textContent = busy ? "Odesilam..." : "Poslat pozvanku";
    });
  }

  async function saveCloudAfterInvite() {
    if (typeof window.kaiserSaveCloudNow === "function") {
      await window.kaiserSaveCloudNow({ visible: false });
    }
  }

  async function sendInvite(user) {
    if (!user?.email) return;
    const email = normalizeEmail(user.email);
    setButtonBusy(email, true);
    try {
      await callInviteFunction(user);
      markInvited(userByEmail(email) || user);
      await saveCloudAfterInvite();
      toast(`Pozvanka byla odeslana na ${email}.`);
    } catch (error) {
      const message = error?.message || "Pozvanku se nepodarilo odeslat.";
      toast(message);
      if (window.kaiserEmailTemplates?.prepareOutgoingInvite) {
        window.kaiserEmailTemplates.prepareOutgoingInvite(user, { preview: true, mailto: false });
      }
    } finally {
      setButtonBusy(email, false);
    }
  }

  function userFromTrigger(trigger) {
    if (trigger.id === "inviteUserButton") return upsertFormUser();
    if (trigger.dataset.userInvite) return userById(trigger.dataset.userInvite);
    if (trigger.dataset.userMailInvite) return userByEmail(trigger.dataset.userMailInvite);
    return null;
  }

  function handleClick(event) {
    const trigger = event.target.closest("#inviteUserButton, [data-user-invite], [data-user-mail-invite]");
    if (!trigger) return;
    if (pendingEmail) return;
    if (window.kaiserRequireAuth && !window.kaiserRequireAuth("odeslani pozvanky")) return;
    const user = userFromTrigger(trigger);
    if (!user?.email) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    sendInvite(user);
  }

  function labelButtons() {
    document.querySelectorAll("#inviteUserButton, [data-user-invite], [data-user-mail-invite]").forEach((button) => {
      if (!button.disabled) button.textContent = "Poslat pozvanku";
      button.title = "Odeslat pozvanku e-mailem pres Twilio SendGrid";
    });
  }

  function boot() {
    window.addEventListener("click", handleClick, true);
    labelButtons();
    const target = document.querySelector("#users") || document.body;
    const observer = new MutationObserver(labelButtons);
    observer.observe(target, { childList: true, subtree: true });
  }

  window.kaiserInviteSender = {
    sendInvite
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();