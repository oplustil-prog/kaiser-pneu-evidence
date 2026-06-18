(function () {
  function localEscape(value) {
    if (typeof escapeHtml === "function") return escapeHtml(value);
    return String(value || "").replace(/[&<>"']/g, (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[char]
    );
  }

  function injectPositionPickerStyles() {
    if (document.querySelector("#vehiclePositionPickerStyles")) return;
    const style = document.createElement("style");
    style.id = "vehiclePositionPickerStyles";
    style.textContent = `
      .position-tire-form {
        display: grid;
        gap: 11px;
        margin-top: 14px;
        border-top: 1px solid var(--line);
        padding-top: 13px;
      }

      .position-tire-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
      }

      .position-tire-note {
        margin: 0;
        color: var(--muted);
        font-size: 0.78rem;
        line-height: 1.4;
      }

      @media (max-width: 700px) {
        .position-tire-actions {
          align-items: stretch;
          flex-direction: column;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function releaseTirePlacement(tire) {
    if (!tire) return;
    if (tire.state !== "vyrazeno") tire.state = "sklad";
    tire.vehicle = "";
    tire.position = "";
    tire.mounted = "";
    tire.mountedOdo = 0;
  }

  function tireLabel(tire) {
    const location = tire.vehicle ? `${tire.vehicle} / ${tire.position || "bez pozice"}` : tire.state;
    return `${tire.id} - ${tire.manufacturer} ${tire.model}, ${tire.size} (${location})`;
  }

  function assignableTiresFor(currentTire) {
    return [...state.tires]
      .filter((tire) => tire.state !== "vyrazeno")
      .sort((a, b) => {
        if (a.id === currentTire?.id) return -1;
        if (b.id === currentTire?.id) return 1;
        if (!a.vehicle && b.vehicle) return -1;
        if (a.vehicle && !b.vehicle) return 1;
        return String(a.id).localeCompare(String(b.id), "cs");
      });
  }

  function enhancePositionDetail(spz, position) {
    if (typeof state === "undefined" || !Array.isArray(state.tires)) return;

    const detail = document.querySelector("#positionDetail");
    if (!detail || detail.querySelector("[data-position-tire-form]")) return;

    const currentTire = tireForPosition(spz, position);
    const assignableTires = assignableTiresFor(currentTire);
    const tireOptions = assignableTires
      .map((tire) => `
        <option value="${localEscape(tire.id)}" ${tire.id === currentTire?.id ? "selected" : ""}>
          ${localEscape(tireLabel(tire))}
        </option>
      `)
      .join("");

    detail.insertAdjacentHTML(
      "beforeend",
      `
        <form class="position-tire-form" data-position-tire-form data-spz="${localEscape(spz)}" data-position="${localEscape(position)}">
          <label>
            <span>Vybrat pneumatiku pro tuto pozici</span>
            <select name="tireId" ${assignableTires.length ? "" : "disabled"}>
              <option value="">Bez pneu / uvolnit pozici</option>
              ${tireOptions}
            </select>
          </label>
          <div class="position-tire-actions">
            <button class="button button-primary" type="submit" ${assignableTires.length || currentTire ? "" : "disabled"}>Ulozit osazeni</button>
            <button class="button button-soft" type="button" data-clear-position data-spz="${localEscape(spz)}" data-position="${localEscape(position)}" ${currentTire ? "" : "disabled"}>Uvolnit pozici</button>
          </div>
          <p class="position-tire-note">Vyber ze skladu pneu priradi rovnou sem. Vyber pneu z jine pozice ji presune.</p>
        </form>
      `
    );
  }

  function assignTireToPosition(spz, position, tireId) {
    if (typeof state === "undefined" || !Array.isArray(state.tires)) return;

    const vehicle = state.vehicles.find((item) => item.spz === spz);
    const currentTires = state.tires.filter((tire) => tire.vehicle === spz && tire.position === position);

    if (!tireId) {
      currentTires.forEach(releaseTirePlacement);
      saveState();
      selectedVehicle = spz;
      selectedPosition = position;
      renderAll();
      showToast(currentTires.length ? `Pozice ${position} je uvolnena.` : `Pozice ${position} zustava bez pneu.`);
      return;
    }

    const nextTire = state.tires.find((tire) => tire.id === tireId);
    if (!nextTire) {
      showToast("Vybrana pneumatika neni v evidenci.");
      return;
    }

    currentTires
      .filter((tire) => tire.id !== nextTire.id)
      .forEach(releaseTirePlacement);

    const isMoved = nextTire.vehicle !== spz || nextTire.position !== position;
    nextTire.state = "na vozidle";
    nextTire.vehicle = spz;
    nextTire.position = position;
    if (isMoved || !nextTire.mounted) {
      nextTire.mounted = todayIso();
      nextTire.mountedOdo = vehicle?.odometer || 0;
    }

    saveState();
    selectedVehicle = spz;
    selectedPosition = position;
    renderAll();
    showToast(`Pneu ${nextTire.id} je prirazena na ${spz} / ${position}.`);
  }

  function refreshCurrentPositionPicker() {
    if (typeof state === "undefined" || !Array.isArray(state.vehicles)) return;

    const vehicle = state.vehicles.find((item) => item.spz === selectedVehicle) || state.vehicles[0];
    if (!vehicle) return;

    const position = vehicle.configuration.includes(selectedPosition)
      ? selectedPosition
      : vehicle.configuration[0];
    if (!position) return;

    renderPositionDetail(vehicle.spz, position);
  }

  injectPositionPickerStyles();

  if (typeof renderPositionDetail === "function") {
    const originalRenderPositionDetail = renderPositionDetail;
    renderPositionDetail = function (spz, position) {
      originalRenderPositionDetail(spz, position);
      enhancePositionDetail(spz, position);
    };
  }

  document.addEventListener("submit", (event) => {
    const form = event.target.closest("[data-position-tire-form]");
    if (!form) return;
    event.preventDefault();
    assignTireToPosition(form.dataset.spz, form.dataset.position, form.elements.tireId.value);
  });

  document.addEventListener("click", (event) => {
    const button = event.target.closest("[data-clear-position]");
    if (!button) return;
    assignTireToPosition(button.dataset.spz, button.dataset.position, "");
  });

  window.addEventListener("DOMContentLoaded", refreshCurrentPositionPicker);
  window.addEventListener("load", refreshCurrentPositionPicker);
  window.setTimeout(refreshCurrentPositionPicker, 0);
}());
