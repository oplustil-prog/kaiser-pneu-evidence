(function () {
  if (typeof setQuickMeasureOpen === "function") return;

  function clearOdometer(formElement) {
    const input = formElement?.elements?.odometer;
    if (!input) return;
    if (input.dataset.userEdited === "true") return;
    input.value = "";
    input.defaultValue = "";
    input.removeAttribute("value");
    input.placeholder = "opsat aktualni km";
    input.autocomplete = "off";
    input.setAttribute("autocomplete", "off");
    input.setAttribute("data-lpignore", "true");
    input.setAttribute("data-1p-ignore", "true");
  }

  function resetOdometer(formElement) {
    const input = formElement?.elements?.odometer;
    if (input) input.dataset.userEdited = "";
    clearOdometer(formElement);
  }

  function clearAllOdometers() {
    document.querySelectorAll("[data-measurement-form]").forEach((formElement) => clearOdometer(formElement));
  }

  function watchOdometer(formElement) {
    const input = formElement?.elements?.odometer;
    if (!input || input.dataset.odoWatchInstalled) return;
    input.dataset.odoWatchInstalled = "true";
    input.addEventListener("input", () => {
      input.dataset.userEdited = input.value ? "true" : "";
    });
  }

  function installGlobalOdometerGuard() {
    if (window.kaiserOdometerGuardInstalled) return;
    window.kaiserOdometerGuardInstalled = true;

    const originalSync = window.syncMeasurementOdometer;
    if (typeof originalSync === "function") {
      window.syncMeasurementOdometer = function (...args) {
        const result = originalSync.apply(this, args);
        window.setTimeout(clearAllOdometers, 0);
        return result;
      };
    }

    const originalRenderAll = window.renderAll;
    if (typeof originalRenderAll === "function") {
      window.renderAll = function (...args) {
        const result = originalRenderAll.apply(this, args);
        window.setTimeout(clearAllOdometers, 0);
        window.setTimeout(clearAllOdometers, 150);
        return result;
      };
    }

    window.setTimeout(clearAllOdometers, 0);
    window.setTimeout(clearAllOdometers, 600);
    window.setTimeout(clearAllOdometers, 1800);
    window.addEventListener("pageshow", clearAllOdometers);
  }

  function installMainMeasurementGuard() {
    const mainForm = document.querySelector("#measurementForm");
    if (!mainForm) return;
    watchOdometer(mainForm);
    resetOdometer(mainForm);
    mainForm.elements.vehicle?.addEventListener("change", () => {
      resetOdometer(mainForm);
      window.setTimeout(() => resetOdometer(mainForm), 0);
      window.setTimeout(() => resetOdometer(mainForm), 150);
    });
    mainForm.addEventListener("submit", () => {
      window.setTimeout(() => resetOdometer(mainForm), 0);
      window.setTimeout(() => resetOdometer(mainForm), 150);
    });
  }

  installGlobalOdometerGuard();
  installMainMeasurementGuard();

  const dock = document.querySelector("#quickMeasureDock");
  const panel = document.querySelector("#quickMeasurePanel");
  const toggle = document.querySelector("#quickMeasureToggle");
  const close = document.querySelector("#quickMeasureClose");
  const form = document.querySelector("#quickMeasurementForm");

  if (!dock || !panel || !toggle || !close || !form) return;
  watchOdometer(form);

  let quickMode = "single";
  let bulkForm = null;
  let bulkRows = null;
  let bulkVehicle = null;
  let bulkOdometer = null;

  function toast(message) {
    if (typeof showToast === "function") showToast(message);
  }

  function safe(value) {
    return String(value || "").replace(/[&<>"']/g, (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[char]
    );
  }

  function tireOnPosition(spz, position) {
    if (typeof tireForPosition === "function") return tireForPosition(spz, position);
    return (state.tires || []).find((tire) => tire.vehicle === spz && tire.position === position);
  }

  function ensureBulkForm() {
    if (bulkForm) return;
    form.insertAdjacentHTML(
      "afterend",
      `
        <form class="quick-bulk-form" id="quickBulkMeasurementForm" hidden>
          <div class="quick-bulk-top">
            <label>
              SPZ
              <select name="vehicle" required></select>
            </label>
            <label>
              Stav km pro vsechny pozice
              <input name="odometer" inputmode="numeric" type="number" step="1" min="0" required placeholder="opsat aktualni km" />
            </label>
          </div>
          <div class="quick-bulk-rows" id="quickBulkRows"></div>
          <div class="quick-bulk-actions">
            <button class="button button-primary" type="submit">Ulozit vyplnene pozice</button>
            <button class="button button-soft" type="button" data-quick-mode="single">Jedna pozice</button>
          </div>
        </form>
      `
    );
    bulkForm = document.querySelector("#quickBulkMeasurementForm");
    bulkRows = document.querySelector("#quickBulkRows");
    bulkVehicle = bulkForm.elements.vehicle;
    bulkOdometer = bulkForm.elements.odometer;
    watchOdometer(bulkForm);
    bulkVehicle.addEventListener("change", () => {
      renderBulkRows(bulkVehicle.value);
      resetOdometer(bulkForm);
    });
    bulkForm.addEventListener("submit", saveBulkMeasurements);
  }

  function ensureModeControls() {
    if (panel.querySelector("[data-quick-mode-controls]")) return;
    panel.querySelector(".quick-measure-head")?.insertAdjacentHTML(
      "afterend",
      `
        <div class="quick-mode-controls" data-quick-mode-controls>
          <button class="button button-primary" type="button" data-quick-mode="single">Jedna pozice</button>
          <button class="button button-soft" type="button" data-quick-mode="bulk">Vsechny pozice</button>
        </div>
      `
    );
  }

  function setMode(mode) {
    ensureBulkForm();
    ensureModeControls();
    quickMode = mode === "bulk" ? "bulk" : "single";
    form.hidden = quickMode !== "single";
    bulkForm.hidden = quickMode !== "bulk";
    panel.querySelectorAll("[data-quick-mode]").forEach((button) => {
      const active = button.dataset.quickMode === quickMode;
      button.classList.toggle("button-primary", active);
      button.classList.toggle("button-soft", !active);
    });
    if (quickMode === "bulk") {
      refreshBulkForm(form.elements.vehicle.value);
      requestAnimationFrame(() => bulkOdometer?.focus());
    } else {
      requestAnimationFrame(() => form.elements.tread?.focus());
    }
  }

  function setOpen(open) {
    dock.classList.toggle("is-open", open);
    if (open) dock.classList.remove("is-editing");
    panel.hidden = !open;
    toggle.setAttribute("aria-expanded", String(open));
    if (open) {
      ensureModeControls();
      ensureBulkForm();
      refreshQuickForm();
      if (quickMode === "bulk") {
        refreshBulkForm(form.elements.vehicle.value);
        requestAnimationFrame(() => bulkOdometer?.focus());
      } else {
        syncOdometer();
        requestAnimationFrame(() => form.elements.tread?.focus());
      }
    }
  }

  function isEditingTarget(target) {
    if (!target || dock.contains(target)) return false;
    return Boolean(
      target.closest?.("input, select, textarea, button, label, [contenteditable='true']")
    );
  }

  function updateEditingMode(target = document.activeElement) {
    dock.classList.toggle("is-editing", isEditingTarget(target));
  }

  function fillVehicles() {
    const current = form.elements.vehicle.value || state.vehicles[0]?.spz || "";
    form.elements.vehicle.innerHTML = "";
    state.vehicles.forEach((vehicle) => {
      form.elements.vehicle.add(new Option(`${vehicle.spz} - ${vehicle.driver}`, vehicle.spz));
    });
    form.elements.vehicle.value = state.vehicles.some((vehicle) => vehicle.spz === current)
      ? current
      : state.vehicles[0]?.spz || "";
  }

  function fillBulkVehicles(preferred = "") {
    const current = preferred || bulkVehicle.value || form.elements.vehicle.value || state.vehicles[0]?.spz || "";
    bulkVehicle.innerHTML = "";
    state.vehicles.forEach((vehicle) => {
      bulkVehicle.add(new Option(`${vehicle.spz} - ${vehicle.driver}`, vehicle.spz));
    });
    bulkVehicle.value = state.vehicles.some((vehicle) => vehicle.spz === current)
      ? current
      : state.vehicles[0]?.spz || "";
  }

  function fillPositions(spz, preferredPosition = "") {
    const vehicle = state.vehicles.find((item) => item.spz === spz) || state.vehicles[0];
    const positions = vehicle?.configuration || [];
    form.elements.position.innerHTML = "";
    positions.forEach((position) => {
      form.elements.position.add(new Option(position, position));
    });
    form.elements.position.value = positions.includes(preferredPosition)
      ? preferredPosition
      : positions[0] || "";
  }

  function syncOdometer() {
    resetOdometer(form);
  }

  function refreshQuickForm(spz = form.elements.vehicle.value, position = form.elements.position.value) {
    fillVehicles();
    form.elements.vehicle.value = spz || form.elements.vehicle.value;
    fillPositions(form.elements.vehicle.value, position);
    syncOdometer(form.elements.vehicle.value);
  }

  function renderBulkRows(spz) {
    const vehicle = state.vehicles.find((item) => item.spz === spz) || state.vehicles[0];
    const positions = vehicle?.configuration || [];
    bulkRows.innerHTML = positions
      .map((position) => {
        const tire = tireOnPosition(vehicle.spz, position);
        const tireLabel = tire ? `${tire.id} / ${tire.manufacturer || ""} ${tire.model || ""}`.trim() : "bez pneu";
        return `
          <div class="quick-bulk-row" data-position="${safe(position)}">
            <div>
              <strong>${safe(position)}</strong>
              <small>${safe(tireLabel)}</small>
            </div>
            <label>
              Dezen mm
              <input name="tread-${safe(position)}" data-bulk-tread data-position="${safe(position)}" inputmode="decimal" type="number" step="0.1" min="0" max="30" />
            </label>
            <label>
              Tlak bar
              <input name="pressure-${safe(position)}" data-bulk-pressure data-position="${safe(position)}" inputmode="decimal" type="number" step="0.1" min="0" max="15" />
            </label>
            <label>
              Poznamka
              <input name="note-${safe(position)}" data-bulk-note data-position="${safe(position)}" type="text" placeholder="volitelne" />
            </label>
          </div>
        `;
      })
      .join("") || `<p class="meta">Vybrane vozidlo nema nastavene pozice.</p>`;
  }

  function refreshBulkForm(spz = form.elements.vehicle.value) {
    fillBulkVehicles(spz);
    renderBulkRows(bulkVehicle.value);
    resetOdometer(bulkForm);
  }

  function fieldValue(position, kind) {
    return bulkRows.querySelector(`[data-bulk-${kind}][data-position="${CSS.escape(position)}"]`)?.value || "";
  }

  function saveBulkMeasurements(event) {
    event.preventDefault();
    if (typeof saveMeasurementData !== "function") {
      toast("Hromadne mereni neni v teto verzi dostupne.");
      return;
    }
    const vehicle = bulkVehicle.value;
    const odometer = bulkOdometer.value;
    const positions = (state.vehicles.find((item) => item.spz === vehicle)?.configuration || []);
    const rows = positions
      .map((position) => ({
        vehicle,
        position,
        odometer,
        tread: fieldValue(position, "tread"),
        pressure: fieldValue(position, "pressure"),
        note: fieldValue(position, "note")
      }))
      .filter((row) => row.tread || row.pressure || row.note);

    if (!rows.length) {
      toast("Vyplnte alespon jednu pozici.");
      return;
    }

    for (const row of rows) {
      if (!row.tread || !row.pressure) {
        toast(`Pozice ${row.position}: doplnte dezen i tlak.`);
        return;
      }
    }

    let saved = 0;
    for (const row of rows) {
      const result = saveMeasurementData(row);
      if (!result.ok) {
        toast(`Pozice ${row.position}: ${result.message}`);
        if (result.field === "odometer") bulkOdometer.focus();
        return;
      }
      saved += 1;
    }

    saveState();
    renderAll();
    setOpen(true);
    setMode("bulk");
    bulkVehicle.value = vehicle;
    renderBulkRows(vehicle);
    resetOdometer(bulkForm);
    toast(`Ulozeno ${saved} pozic pro ${vehicle}.`);
  }

  toggle.addEventListener("click", () => setOpen(!dock.classList.contains("is-open")));
  close.addEventListener("click", () => setOpen(false));
  document.addEventListener("focusin", (event) => updateEditingMode(event.target));
  document.addEventListener("focusout", () => window.setTimeout(() => updateEditingMode(), 0));
  document.addEventListener("pointerdown", (event) => updateEditingMode(event.target));
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") setOpen(false);
  });

  form.elements.vehicle.addEventListener("change", (event) => {
    fillPositions(event.target.value);
    syncOdometer(event.target.value);
    if (quickMode === "bulk") refreshBulkForm(event.target.value);
    window.setTimeout(syncOdometer, 150);
  });

  panel.addEventListener("click", (event) => {
    const modeButton = event.target.closest("[data-quick-mode]");
    if (modeButton) setMode(modeButton.dataset.quickMode);
  });

  form.addEventListener("submit", (event) => {
    const vehicle = form.elements.vehicle.value;
    const position = form.elements.position.value;
    if (typeof addMeasurement === "function") {
      addMeasurement(event);
      refreshQuickForm(vehicle, position);
      syncOdometer();
      setOpen(true);
    }
  });

  refreshQuickForm();
  ensureModeControls();
  ensureBulkForm();
  setMode("single");
  updateEditingMode();
})();
