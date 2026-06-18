(function () {
  const DEFAULT_INTERVAL_DAYS = 30;
  const DAY_MS = 24 * 60 * 60 * 1000;

  function html(value) {
    if (typeof escapeHtml === "function") return escapeHtml(value);
    return String(value || "").replace(/[&<>"']/g, (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[char]
    );
  }

  function today() {
    return typeof todayIso === "function" ? todayIso() : new Date().toISOString().slice(0, 10);
  }

  function isoTime(value) {
    const [year, month, day] = String(value || "").split("-").map(Number);
    if (!year || !month || !day) return null;
    return Date.UTC(year, month - 1, day);
  }

  function daysSince(value) {
    const start = isoTime(value);
    const end = isoTime(today());
    if (!start || !end) return null;
    return Math.max(0, Math.floor((end - start) / DAY_MS));
  }

  function measurementInterval() {
    const settings = typeof currentSettings === "function" ? currentSettings() : state?.settings || {};
    return Number(settings.measurementIntervalDays) || DEFAULT_INTERVAL_DAYS;
  }

  function lastMeasurementMap() {
    return (state.measurements || []).reduce((map, measurement) => {
      if (!measurement.vehicle || !measurement.date) return map;
      const current = map.get(measurement.vehicle);
      if (!current || String(measurement.date).localeCompare(current.date) > 0) {
        map.set(measurement.vehicle, measurement);
      }
      return map;
    }, new Map());
  }

  function measurementAlerts() {
    if (typeof state === "undefined" || !Array.isArray(state.vehicles)) return [];

    const interval = measurementInterval();
    const lastByVehicle = lastMeasurementMap();

    return state.vehicles
      .map((vehicle) => {
        const last = lastByVehicle.get(vehicle.spz);
        const age = last ? daysSince(last.date) : null;
        const due = age === null || age >= interval;
        if (!due) return null;

        const overdue = age === null ? interval : age - interval;
        return {
          level: overdue >= 15 ? "danger" : "warning",
          title: `${vehicle.spz} / rychle mereni`,
          body: last
            ? `Posledni mereni probehlo ${last.date}, tedy pred ${age} dny. Interval je ${interval} dni.`
            : `U vozidla zatim neni ulozene rychle mereni. Interval je ${interval} dni.`,
          action: {
            label: "Zmerit",
            vehicle: vehicle.spz
          },
          sortDate: last?.date || ""
        };
      })
      .filter(Boolean)
      .sort((a, b) => {
        if (!a.sortDate && b.sortDate) return -1;
        if (a.sortDate && !b.sortDate) return 1;
        return String(a.sortDate).localeCompare(String(b.sortDate));
      });
  }

  function openQuickMeasurement(vehicleSpz) {
    const vehicle = state.vehicles.find((item) => item.spz === vehicleSpz);
    if (!vehicle) return;

    document.querySelectorAll("[data-measurement-form]").forEach((form) => {
      if (!form.elements.vehicle) return;
      form.elements.vehicle.value = vehicle.spz;
      if (typeof fillPositionOptions === "function") fillPositionOptions(vehicle.spz, form);
      if (typeof syncMeasurementOdometer === "function") syncMeasurementOdometer(vehicle.spz, form);
    });

    if (typeof setQuickMeasureOpen === "function") setQuickMeasureOpen(true);
    window.setTimeout(() => {
      const form = document.querySelector("#quickMeasurementForm");
      form?.elements.tread?.focus();
    }, 0);

    if (typeof showToast === "function") {
      showToast(`Rychle mereni je pripravene pro ${vehicle.spz}.`);
    }
  }

  function renderAlertAction(alert) {
    if (!alert.action?.vehicle) return "";
    return `
      <button
        class="button button-soft alert-action"
        type="button"
        data-start-quick-measure="${html(alert.action.vehicle)}"
      >
        ${html(alert.action.label || "Zmerit")}
      </button>
    `;
  }

  function installStyles() {
    if (document.querySelector("#measurementReminderStyles")) return;
    const style = document.createElement("style");
    style.id = "measurementReminderStyles";
    style.textContent = `
      .alert-item {
        grid-template-columns: auto minmax(0, 1fr) auto;
      }

      .alert-actions {
        align-items: end;
        display: grid;
        gap: 8px;
        justify-items: end;
      }

      .alert-action {
        min-height: 32px;
        padding: 7px 11px;
        white-space: nowrap;
      }

      @media (max-width: 760px) {
        .alert-item {
          grid-template-columns: auto minmax(0, 1fr);
        }

        .alert-actions {
          grid-column: 2;
          justify-items: start;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function installAlertPatch() {
    if (window.kaiserMeasurementRemindersInstalled || typeof getAlerts !== "function") return;
    window.kaiserMeasurementRemindersInstalled = true;

    const originalGetAlerts = getAlerts;
    getAlerts = function () {
      const reminders = measurementAlerts();
      const regularAlerts = originalGetAlerts().filter(
        (alert) => !alert.action || !alert.action.vehicle
      );
      return [...reminders, ...regularAlerts].slice(0, 8);
    };

    renderAlerts = function () {
      const alerts = getAlerts();
      const alertCount = document.querySelector("#alertCount");
      const alertList = document.querySelector("#alertList");
      if (!alertList) return;
      if (alertCount) alertCount.textContent = `${alerts.length} aktivnich`;
      alertList.innerHTML =
        alerts
          .map(
            (alert) => `
              <div class="alert-item ${alert.level === "danger" ? "danger" : ""}">
                <span class="alert-marker" aria-hidden="true"></span>
                <div>
                  <strong>${html(alert.title)}</strong>
                  <p>${html(alert.body)}</p>
                </div>
                <div class="alert-actions">
                  <span class="badge ${alert.level === "danger" ? "badge-danger" : "badge-warning"}">
                    ${alert.level === "danger" ? "urgentni" : "kontrola"}
                  </span>
                  ${renderAlertAction(alert)}
                </div>
              </div>
            `
          )
          .join("") || `<p class="meta">Bez aktivnich upozorneni.</p>`;
    };
  }

  document.addEventListener("click", (event) => {
    const trigger = event.target.closest("[data-start-quick-measure]");
    if (!trigger) return;
    openQuickMeasurement(trigger.dataset.startQuickMeasure);
  });

  installStyles();
  installAlertPatch();
  if (typeof renderDashboard === "function") renderDashboard();
  else if (typeof renderAlerts === "function") renderAlerts();
}());
