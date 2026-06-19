(function () {
  const BUILD = "20260618-43";
  const NOTE = "Jednoduche prirazovani pneu primo z mapy osazeni vozidla.";

  function safe(value) {
    return String(value || "").replace(/[&<>"']/g, (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[char]
    );
  }

  function today() {
    return new Date().toISOString().slice(0, 10);
  }

  function fmt(value, decimals = 0) {
    if (typeof formatNumber === "function") return formatNumber(value, decimals);
    return new Intl.NumberFormat("cs-CZ", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    }).format(Number(value) || 0);
  }

  function pushCritical(label) {
    if (typeof pushCriticalChange === "function") {
      pushCriticalChange(label);
      return;
    }
    window.kaiserCriticalCloudSavePending = true;
    const clear = () => {
      window.kaiserCriticalCloudSavePending = false;
    };
    const saver = window.kaiserSaveCloudNow || window.kaiserCloud?.pushState;
    if (!saver) {
      clear();
      return;
    }
    try {
      Promise.resolve(
        window.kaiserSaveCloudNow
          ? window.kaiserSaveCloudNow({ visible: true, source: label })
          : window.kaiserCloud.pushState({ quiet: false, source: label })
      ).finally(clear);
    } catch {
      clear();
    }
  }

  function getTire(spz, position) {
    if (typeof tireForPosition === "function") return tireForPosition(spz, position);
    return (state.tires || []).find((tire) => tire.vehicle === spz && tire.position === position);
  }

  function textForSearch(tire) {
    return [
      tire.id,
      tire.manufacturer,
      tire.model,
      tire.size,
      tire.dot,
      tire.invoice,
      tire.sourceVehicle,
      tire.sourceLabel,
      tire.supplier
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
  }

  function assignable(tire, currentTire) {
    if (!tire || tire.id === currentTire?.id) return false;
    if (tire.state === "vyrazeno" || tire.state === "oprava") return false;
    return !tire.vehicle || tire.state === "sklad";
  }

  function score(tire, spz, currentTire) {
    let value = 0;
    if (tire.sourceVehicle === spz) value += 80;
    if (currentTire?.size && tire.size === currentTire.size) value += 35;
    if (tire.state === "sklad") value += 12;
    if (tire.importedFromInvoice) value += 8;
    if (tire.purchaseDate) value += 2;
    return value;
  }

  function candidates(spz, position, term = "") {
    const currentTire = getTire(spz, position);
    const needle = String(term || "").trim().toLowerCase();
    return (state.tires || [])
      .filter((tire) => assignable(tire, currentTire))
      .filter((tire) => !needle || textForSearch(tire).includes(needle))
      .sort((a, b) => {
        const scoreDiff = score(b, spz, currentTire) - score(a, spz, currentTire);
        if (scoreDiff) return scoreDiff;
        return String(b.purchaseDate || "").localeCompare(String(a.purchaseDate || ""));
      });
  }

  function optionLabel(tire, spz, currentTire) {
    const prefix = tire.sourceVehicle === spz ? "doporuceno - " : "";
    const size = tire.size || "rozmer nezjisten";
    const tread = `${fmt(tire.currentTread, 1)} mm`;
    const invoice = tire.invoice ? `FA ${tire.invoice}` : "bez FA";
    const sameSize = currentTire?.size && tire.size === currentTire.size ? " / stejny rozmer" : "";
    return `${prefix}${tire.id} | ${tire.manufacturer} ${tire.model} | ${size} | ${tread} | ${invoice}${sameSize}`;
  }

  function updatePicker(spz, position) {
    const search = document.querySelector("#positionTireSearch");
    const select = document.querySelector("#positionTireSelect");
    const hint = document.querySelector("#positionTireHint");
    const button = document.querySelector("#positionAssignButton");
    if (!select || !hint || !button || typeof state === "undefined") return;

    const currentTire = getTire(spz, position);
    const rows = candidates(spz, position, search?.value || "");
    const visibleRows = rows.slice(0, 80);
    const previousValue = select.value;

    select.innerHTML = [
      `<option value="">Vybrat pneumatiku ze skladu</option>`,
      ...visibleRows.map((tire) => {
        const selected = tire.id === previousValue ? " selected" : "";
        return `<option value="${safe(tire.id)}"${selected}>${safe(optionLabel(tire, spz, currentTire))}</option>`;
      })
    ].join("");

    if (!visibleRows.some((tire) => tire.id === previousValue)) select.value = "";
    select.disabled = !visibleRows.length;
    button.disabled = !select.value;

    const recommended = rows.filter((tire) => tire.sourceVehicle === spz).length;
    hint.textContent = rows.length
      ? `${rows.length} dostupnych pneu${recommended ? `, z toho ${recommended} doporuceno pro tuto SPZ` : ""}.`
      : "Pro tento filtr neni dostupna zadna pneumatika ve skladu.";
  }

  function assignSelected(spz, position) {
    if (typeof window.kaiserRequireAuth === "function" && !window.kaiserRequireAuth("montaz pneu")) return;
    const tireId = document.querySelector("#positionTireSelect")?.value || "";
    const tire = (state.tires || []).find((item) => item.id === tireId);
    const vehicle = (state.vehicles || []).find((item) => item.spz === spz);
    if (!tire || !vehicle) {
      showToast?.("Nejdrive vyberte pneumatiku k montazi.");
      return;
    }

    const currentTire = getTire(spz, position);
    if (currentTire && currentTire.id !== tire.id) {
      currentTire.state = "sklad";
      currentTire.vehicle = "";
      currentTire.position = "";
      currentTire.mounted = "";
      currentTire.mountedOdo = 0;
    }

    tire.state = "na vozidle";
    tire.vehicle = spz;
    tire.position = position;
    tire.mounted = today();
    tire.mountedOdo = Number(vehicle.odometer) || 0;

    selectedVehicle = spz;
    selectedPosition = position;
    saveState?.();
    pushCritical("Montaz pneu");
    renderAll?.();
    showToast?.(`Pneu ${tire.id} je namontovana na ${spz} / ${position}.`);
  }

  function unassign(spz, position) {
    if (typeof window.kaiserRequireAuth === "function" && !window.kaiserRequireAuth("sundani pneu")) return;
    const tire = getTire(spz, position);
    if (!tire) {
      showToast?.("Na teto pozici neni prirazena pneumatika.");
      return;
    }
    tire.state = "sklad";
    tire.vehicle = "";
    tire.position = "";
    tire.mounted = "";
    tire.mountedOdo = 0;
    selectedVehicle = spz;
    selectedPosition = position;
    saveState?.();
    pushCritical("Sundani pneu");
    renderAll?.();
    showToast?.(`Pneu ${tire.id} je sundana na sklad.`);
  }

  function renderPatchedPositionDetail(spz, position) {
    const target = document.querySelector("#positionDetail");
    if (!target || typeof state === "undefined") return;
    const tire = getTire(spz, position);
    const availableCount = candidates(spz, position).length;

    target.innerHTML = `
      <div class="position-summary">
        <div>
          <p class="eyebrow">Vybrana pozice</p>
          ${
            tire
              ? `
                <strong>${safe(position)}: ${safe(tire.id)}</strong>
                <p class="meta">${safe(tire.manufacturer)} ${safe(tire.model)}, ${safe(tire.size)}</p>
              `
              : `
                <strong>${safe(position)}: bez pneu</strong>
                <p class="meta">Vyberte pneu ze skladu a ulozte montaz jednim kliknutim.</p>
              `
          }
        </div>
        ${
          tire
            ? `<button class="button button-soft" id="positionUnmountButton" type="button">Sundat na sklad</button>`
            : `<span class="badge badge-warning">volna pozice</span>`
        }
      </div>
      ${
        tire
          ? `
            <dl class="position-facts">
              <div><dt>Montaz od</dt><dd>${safe(tire.mounted || "-")}</dd></div>
              <div><dt>Najezd pozice</dt><dd>${fmt(tire.mileage)} km</dd></div>
              <div><dt>Dezen</dt><dd>${fmt(tire.currentTread, 1)} mm</dd></div>
              <div><dt>Tlak</dt><dd>${tire.pressure ? `${fmt(tire.pressure, 1)} bar` : "-"}</dd></div>
            </dl>
          `
          : ""
      }
      <div class="position-assignment" id="positionAssignmentPanel">
        <div>
          <p class="eyebrow">Rychla montaz</p>
          <h4>Priradit pneu na tuto pozici</h4>
        </div>
        <div class="position-assignment-form">
          <label>
            Hledat ID, rozmer, fakturu
            <input id="positionTireSearch" type="search" placeholder="napr. 315, LAUFENN, VF-26061801" autocomplete="off" />
          </label>
          <label>
            Pneumatika ze skladu
            <select id="positionTireSelect"${availableCount ? "" : " disabled"}></select>
          </label>
          <button class="button button-primary" id="positionAssignButton" type="button" disabled>Namontovat na pozici</button>
        </div>
        <p class="meta" id="positionTireHint"></p>
      </div>
    `;

    document.querySelector("#positionUnmountButton")?.addEventListener("click", () => unassign(spz, position));
    document.querySelector("#positionAssignButton")?.addEventListener("click", () => assignSelected(spz, position));
    document.querySelector("#positionTireSearch")?.addEventListener("input", () => updatePicker(spz, position));
    document.querySelector("#positionTireSelect")?.addEventListener("change", () => {
      const button = document.querySelector("#positionAssignButton");
      if (button) button.disabled = !document.querySelector("#positionTireSelect")?.value;
    });
    updatePicker(spz, position);
  }

  function injectStyles() {
    if (document.querySelector("#kaiserTireAssignmentStyles")) return;
    const style = document.createElement("style");
    style.id = "kaiserTireAssignmentStyles";
    style.textContent = `
      .position-detail { display: grid; gap: 13px; margin-top: 14px; }
      .position-summary { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 12px; align-items: start; }
      .position-summary strong { display: block; font-size: 1.05rem; }
      .position-summary .button, .position-assignment .button { min-height: 44px; white-space: normal; }
      .position-facts, .position-detail dl { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; margin: 0; }
      .position-facts div, .position-detail dl div { border: 1px solid var(--line); border-radius: 8px; padding: 10px 12px; background: var(--surface-strong); }
      .position-assignment { display: grid; gap: 12px; border: 1px solid rgba(117, 189, 37, 0.26); border-radius: 8px; padding: 13px; background: rgba(117, 189, 37, 0.07); }
      .position-assignment h4 { margin: 2px 0 0; font-size: 1rem; }
      .position-assignment-form { display: grid; grid-template-columns: minmax(160px, 0.6fr) minmax(260px, 1.3fr) minmax(170px, 0.5fr); gap: 10px; align-items: end; }
      .position-assignment-form label { display: grid; gap: 7px; color: var(--muted); font-size: 0.84rem; font-weight: 900; }
      .position-assignment-form input, .position-assignment-form select { width: 100%; min-height: 44px; border: 1px solid var(--line-strong); border-radius: 8px; padding: 0 11px; background: #ffffff; color: var(--ink); font-weight: 800; }
      @media (max-width: 1180px) { .position-assignment-form { grid-template-columns: 1fr; } }
      @media (max-width: 620px) { .position-summary, .position-facts, .position-detail dl { grid-template-columns: 1fr; } }
    `;
    document.head.appendChild(style);
  }

  function updateVersion() {
    try {
      if (typeof APP_VERSION !== "undefined") {
        APP_VERSION.number = "v0.9.11";
        APP_VERSION.build = BUILD;
        if (Array.isArray(APP_VERSION.notes) && !APP_VERSION.notes.includes(NOTE)) {
          APP_VERSION.notes.push(NOTE);
        }
      }
      renderVersionInfo?.();
    } catch {
      // Version badge is optional in older builds.
    }
  }

  function boot() {
    if (typeof state === "undefined" || typeof renderPositionDetail !== "function") {
      window.setTimeout(boot, 120);
      return;
    }
    injectStyles();
    updateVersion();
    renderPositionDetail = renderPatchedPositionDetail;
    renderVehicles?.();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();
