(function () {
  if (window.kaiserGlobalSearchInstalled) return;

  const MAX_RESULTS = 12;

  function byId(id) {
    return document.getElementById(id);
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => {
      const replacements = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" };
      return replacements[char] || char;
    });
  }

  function normalize(value) {
    return String(value ?? "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();
  }

  function haystack(values) {
    return normalize(values.flat().filter(Boolean).join(" "));
  }

  function matches(values, term) {
    return haystack(values).includes(term);
  }

  function money(value) {
    return new Intl.NumberFormat("cs-CZ", {
      style: "currency",
      currency: "CZK",
      maximumFractionDigits: 0
    }).format(Number(value) || 0);
  }

  function ensureStyles() {
    if (document.getElementById("kaiserGlobalSearchStyles")) return;
    const style = document.createElement("style");
    style.id = "kaiserGlobalSearchStyles";
    style.textContent = `
      .search-control {
        position: relative;
      }

      .global-search-panel {
        background: #ffffff;
        border: 1px solid rgba(117, 189, 37, 0.28);
        border-radius: 8px;
        box-shadow: 0 18px 45px rgba(25, 34, 28, 0.16);
        color: var(--ink);
        display: grid;
        gap: 8px;
        left: 0;
        max-height: min(62vh, 520px);
        min-width: min(520px, 88vw);
        overflow: auto;
        padding: 10px;
        position: absolute;
        right: 0;
        top: calc(100% + 8px);
        z-index: 80;
      }

      .global-search-panel[hidden] {
        display: none;
      }

      .global-search-head,
      .global-search-empty {
        align-items: center;
        display: flex;
        justify-content: space-between;
        padding: 8px 10px;
      }

      .global-search-head span {
        color: var(--muted);
        font-size: 0.82rem;
        font-weight: 900;
      }

      .global-search-list {
        display: grid;
        gap: 6px;
      }

      .global-search-result {
        align-items: center;
        background: var(--surface-strong);
        border: 1px solid var(--line);
        border-radius: 8px;
        color: var(--ink);
        cursor: pointer;
        display: grid;
        gap: 3px 10px;
        grid-template-columns: auto minmax(0, 1fr);
        padding: 10px;
        text-align: left;
      }

      .global-search-result:hover,
      .global-search-result:focus-visible {
        border-color: var(--brand);
        box-shadow: 0 0 0 3px rgba(117, 189, 37, 0.13);
        outline: none;
      }

      .global-search-result strong,
      .global-search-result small {
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .global-search-result small {
        color: var(--muted);
        font-weight: 700;
        grid-column: 2;
      }

      @media (max-width: 760px) {
        .global-search-panel {
          left: auto;
          min-width: min(92vw, 440px);
          right: 0;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function ensurePanel(input) {
    if (!input) return null;
    const existing = byId("globalSearchPanel");
    if (existing) return existing;

    const holder = input.closest(".search-control") || input.parentElement;
    if (!holder) return null;
    holder.classList.add("global-search-wrap");
    const panel = document.createElement("div");
    panel.className = "global-search-panel";
    panel.id = "globalSearchPanel";
    panel.hidden = true;
    holder.appendChild(panel);
    return panel;
  }

  function currentState() {
    if (typeof state === "undefined") return { vehicles: [], tires: [], services: [], users: [] };
    return state || { vehicles: [], tires: [], services: [], users: [] };
  }

  function resultRows(term) {
    if (!term) return [];
    const data = currentState();
    const vehicles = (data.vehicles || [])
      .filter((vehicle) =>
        matches([vehicle.spz, vehicle.type, vehicle.driver, vehicle.depot, vehicle.configuration, vehicle.odometer], term)
      )
      .slice(0, 5)
      .map((vehicle) => ({
        type: "Vozidlo",
        section: "vehicles",
        id: vehicle.spz,
        title: vehicle.spz,
        meta: `${vehicle.driver || "bez ridice"} / ${vehicle.type || "vozidlo"}`
      }));

    const tires = (data.tires || [])
      .filter((tire) =>
        matches(
          [
            tire.id,
            tire.manufacturer,
            tire.model,
            tire.size,
            tire.index,
            tire.supplier,
            tire.vehicle,
            tire.position,
            tire.sourceVehicle,
            tire.invoice,
            tire.sourceLabel,
            tire.state
          ],
          term
        )
      )
      .slice(0, 7)
      .map((tire) => ({
        type: "Pneu",
        section: "tires",
        id: tire.id,
        title: tire.id,
        meta: `${tire.manufacturer || ""} ${tire.model || ""}, ${tire.size || "rozmer nezadan"} / ${
          tire.vehicle || tire.sourceVehicle || "sklad"
        }`
      }));

    const services = (data.services || [])
      .filter((service) =>
        matches(
          [
            service.date,
            service.vehicle,
            service.type,
            service.person,
            service.supplier,
            service.invoice,
            service.note,
            service.tireIds,
            service.tirePositions
          ],
          term
        )
      )
      .sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")))
      .slice(0, 5)
      .map((service) => ({
        type: "Servis",
        section: "service",
        id: `${service.date || ""}-${service.vehicle || ""}-${service.invoice || service.type || ""}`,
        title: `${service.date || "-"} / ${service.vehicle || "-"}`,
        meta: `${service.type || "servis"}, ${service.supplier || "bez dodavatele"} / ${money(
          (Number(service.labor) || 0) + (Number(service.material) || 0) + (Number(service.tireCost) || 0)
        )}`
      }));

    const users = (data.users || [])
      .filter((user) => matches([user.name, user.email, user.role, user.depot, user.status, user.phone], term))
      .slice(0, 4)
      .map((user) => ({
        type: "Uzivatel",
        section: "users",
        id: user.id || user.email,
        title: user.name || user.email,
        meta: `${user.email || "bez e-mailu"} / ${user.role || "role nezadana"}`
      }));

    return [...vehicles, ...tires, ...services, ...users].slice(0, MAX_RESULTS);
  }

  function renderPanel() {
    const input = byId("globalSearch");
    const panel = byId("globalSearchPanel");
    if (!input || !panel) return;
    const term = normalize(input.value);
    if (!term) {
      panel.hidden = true;
      panel.innerHTML = "";
      return;
    }

    const results = resultRows(term);
    panel.hidden = false;
    panel.innerHTML = results.length
      ? `
        <div class="global-search-head">
          <strong>Vysledky hledani</strong>
          <span>${results.length}</span>
        </div>
        <div class="global-search-list">
          ${results
            .map(
              (result) => `
                <button
                  class="global-search-result"
                  type="button"
                  data-global-search-section="${escapeHtml(result.section)}"
                  data-global-search-id="${escapeHtml(result.id)}"
                >
                  <span class="badge badge-neutral">${escapeHtml(result.type)}</span>
                  <strong>${escapeHtml(result.title)}</strong>
                  <small>${escapeHtml(result.meta)}</small>
                </button>
              `
            )
            .join("")}
        </div>
      `
      : `<div class="global-search-empty">Nic nenalezeno. Zkuste SPZ, ID pneu, fakturu nebo jmeno ridice.</div>`;
  }

  function setSectionSafe(section) {
    if (typeof setSection === "function") {
      setSection(section);
      return;
    }
    document.querySelector(`[data-section="${section}"]`)?.click();
  }

  function openResult(button) {
    const section = button.dataset.globalSearchSection;
    const id = button.dataset.globalSearchId;

    if (section === "vehicles" && id) {
      try {
        selectedVehicle = id;
        selectedPosition = "";
      } catch {
        // Older builds may not expose selectedVehicle as a writable global.
      }
    }

    if (section === "tires") {
      const stateFilter = byId("tireStateFilter");
      if (stateFilter) stateFilter.value = "all";
    }
    if (section === "users") {
      const roleFilter = byId("userRoleFilter");
      const statusFilter = byId("userStatusFilter");
      if (roleFilter) roleFilter.value = "all";
      if (statusFilter) statusFilter.value = "all";
    }

    setSectionSafe(section);
    const panel = byId("globalSearchPanel");
    if (panel) panel.hidden = true;
  }

  function boot() {
    const input = byId("globalSearch");
    const panel = ensurePanel(input);
    if (!input || !panel) return;

    window.kaiserGlobalSearchInstalled = true;
    ensureStyles();
    input.addEventListener("input", renderPanel);
    input.addEventListener("focus", renderPanel);
    input.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        input.value = "";
        renderPanel();
        return;
      }
      if (event.key !== "Enter") return;
      const first = panel.querySelector("[data-global-search-section]");
      if (!first) return;
      event.preventDefault();
      openResult(first);
    });

    document.addEventListener("click", (event) => {
      const result = event.target.closest("[data-global-search-section]");
      if (result) {
        openResult(result);
        return;
      }
      if (!event.target.closest(".global-search-wrap") && !event.target.closest(".search-control")) panel.hidden = true;
    });

    document.addEventListener("keydown", (event) => {
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== "k") return;
      event.preventDefault();
      input.focus();
      input.select();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();
