(function () {
  const NOTICE_STORAGE_KEY = "kaiser-system-notice-dismissed";
  const BUILD_STORAGE_KEY = "kaiser-system-notice-build";

  const activeNotice = {
    id: "hotfix-public-page-20260618-1",
    enabled: true,
    kind: "update",
    title: "Stranka byla obnovena",
    message:
      "Nasazena oprava po zaseknuti verejne stranky. Pokud stale vidite starou verzi, pouzijte tvrdy refresh."
  };

  function getScriptBuild() {
    const script = document.currentScript || document.querySelector('script[src*="cloud-auth-preview"]');
    try {
      const url = new URL(script?.src || window.location.href, window.location.href);
      return url.searchParams.get("v") || "bez-verze";
    } catch {
      return "bez-verze";
    }
  }

  function readDismissed() {
    try {
      return JSON.parse(localStorage.getItem(NOTICE_STORAGE_KEY) || "[]");
    } catch {
      return [];
    }
  }

  function rememberDismissed(id) {
    if (!id) return;
    const dismissed = new Set(readDismissed());
    dismissed.add(id);
    localStorage.setItem(NOTICE_STORAGE_KEY, JSON.stringify([...dismissed].slice(-20)));
  }

  function injectStyles() {
    if (document.getElementById("kaiser-system-notice-style")) return;
    const style = document.createElement("style");
    style.id = "kaiser-system-notice-style";
    style.textContent = `
      .kaiser-system-notice {
        position: sticky;
        top: 0;
        z-index: 100;
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto;
        gap: 14px;
        align-items: center;
        width: 100%;
        padding: 13px 18px;
        border-bottom: 1px solid rgba(117, 189, 37, 0.34);
        background: #f3fbec;
        color: #19221c;
        box-shadow: 0 12px 30px rgba(25, 34, 28, 0.08);
        font-family: "Quicksand", ui-sans-serif, system-ui, sans-serif;
      }
      .kaiser-system-notice strong {
        display: block;
        font-size: 0.98rem;
      }
      .kaiser-system-notice p {
        margin: 2px 0 0;
        color: #4f604c;
        font-size: 0.9rem;
      }
      .kaiser-system-notice button {
        min-height: 40px;
        padding: 0 15px;
        border: 1px solid rgba(117, 189, 37, 0.45);
        border-radius: 8px;
        background: #ffffff;
        color: #2c5415;
        font: inherit;
        font-weight: 800;
        cursor: pointer;
      }
      .kaiser-system-notice--reset {
        background: #fff8e8;
        border-bottom-color: rgba(198, 142, 22, 0.34);
      }
      @media (max-width: 720px) {
        .kaiser-system-notice {
          grid-template-columns: 1fr;
          padding: 12px 14px;
        }
        .kaiser-system-notice button {
          width: 100%;
        }
      }
    `;
    document.head.append(style);
  }

  function showNotice(notice) {
    const data = {
      id: notice?.id || `notice-${Date.now()}`,
      kind: notice?.kind || "update",
      title: notice?.title || "Systemova hlaska",
      message: notice?.message || "Aplikace byla aktualizovana."
    };

    injectStyles();

    let banner = document.getElementById("kaiser-system-notice");
    if (!banner) {
      banner = document.createElement("div");
      banner.id = "kaiser-system-notice";
      banner.setAttribute("role", "status");
      banner.setAttribute("aria-live", "polite");
      const anchor = document.body.firstElementChild;
      document.body.insertBefore(banner, anchor || null);
    }

    banner.className = `kaiser-system-notice kaiser-system-notice--${data.kind}`;
    banner.innerHTML = `
      <div>
        <strong>${escapeHtml(data.title)}</strong>
        <p>${escapeHtml(data.message)}</p>
      </div>
      <button type="button">Rozumim</button>
    `;
    banner.hidden = false;
    banner.querySelector("button").addEventListener("click", () => {
      rememberDismissed(data.id);
      banner.hidden = true;
    });
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (char) => {
      const replacements = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" };
      return replacements[char] || char;
    });
  }

  function noticeFromUrl() {
    const params = new URLSearchParams(window.location.search);
    if (params.has("reset")) {
      return {
        id: `reset-${Date.now()}`,
        kind: "reset",
        title: "Data byla resetovana",
        message: "Aplikace nacetla vychozi stav. Zkontrolujte prosim, ze jsou cloudova data nactena."
      };
    }
    if (params.has("update") || String(params.get("fresh") || "").includes("hotfix")) {
      return {
        id: `update-${params.get("fresh") || getScriptBuild()}`,
        kind: "update",
        title: "Aplikace byla aktualizovana",
        message: "Je nactena cerstva verze. Pri potizich pouzijte tvrdy refresh prohlizece."
      };
    }
    const custom = params.get("notice");
    if (custom) {
      return {
        id: `notice-${custom.slice(0, 24)}`,
        kind: "update",
        title: "Hlaseni aplikace",
        message: custom
      };
    }
    return null;
  }

  function noticeFromBuildChange() {
    const build = getScriptBuild();
    const previous = localStorage.getItem(BUILD_STORAGE_KEY);
    localStorage.setItem(BUILD_STORAGE_KEY, build);
    if (!previous || previous === build) return null;
    return {
      id: `build-${build}`,
      kind: "update",
      title: "Aplikace byla aktualizovana",
      message: `Nactena nova verze aplikace (${build}). Pokud vidite neobvykle chovani, obnovte stranku tvrde.`
    };
  }

  function boot() {
    const dismissed = new Set(readDismissed());
    const notice = noticeFromUrl() || noticeFromBuildChange() || activeNotice;
    if (notice?.enabled === false || dismissed.has(notice?.id)) return;
    if (notice) showNotice(notice);
  }

  window.kaiserShowSystemNotice = function (message, options = {}) {
    showNotice({
      id: options.id || `manual-${Date.now()}`,
      kind: options.kind || "update",
      title: options.title || "Systemova hlaska",
      message
    });
  };

  document.addEventListener("click", (event) => {
    if (!event.target.closest("#resetDemoData")) return;
    window.setTimeout(() => {
      showNotice({
        id: `reset-click-${Date.now()}`,
        kind: "reset",
        title: "Data byla resetovana",
        message: "Prave probehl reset dat v aplikaci. Pokud pracujete v cloudu, overte nasledne synchronizaci."
      });
    }, 150);
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();
