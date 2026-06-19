(function () {
  if (typeof setQuickMeasureOpen === "function") return;

  const dock = document.querySelector("#quickMeasureDock");
  const panel = document.querySelector("#quickMeasurePanel");
  const toggle = document.querySelector("#quickMeasureToggle");
  const close = document.querySelector("#quickMeasureClose");
  const form = document.querySelector("#quickMeasurementForm");

  if (!dock || !panel || !toggle || !close || !form) return;

  function setOpen(open) {
    dock.classList.toggle("is-open", open);
    if (open) dock.classList.remove("is-editing");
    panel.hidden = !open;
    toggle.setAttribute("aria-expanded", String(open));
    if (open) {
      refreshQuickForm();
      requestAnimationFrame(() => form.elements.tread?.focus());
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

  function syncOdometer(spz) {
    const vehicle = state.vehicles.find((item) => item.spz === spz);
    form.elements.odometer.value = vehicle?.odometer ? Math.round(vehicle.odometer) : "";
  }

  function refreshQuickForm(spz = form.elements.vehicle.value, position = form.elements.position.value) {
    fillVehicles();
    form.elements.vehicle.value = spz || form.elements.vehicle.value;
    fillPositions(form.elements.vehicle.value, position);
    syncOdometer(form.elements.vehicle.value);
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
  });

  form.addEventListener("submit", (event) => {
    const vehicle = form.elements.vehicle.value;
    const position = form.elements.position.value;
    if (typeof addMeasurement === "function") {
      addMeasurement(event);
      refreshQuickForm(vehicle, position);
      setOpen(true);
    }
  });

  refreshQuickForm();
  updateEditingMode();
})();
