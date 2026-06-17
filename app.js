const STORAGE_KEY = "kaiser-pneu-evidence-v1";

const todayIso = () => new Date().toISOString().slice(0, 10);

const initialState = {
  tires: [
    {
      id: "KS-315-00042",
      manufacturer: "Hankook",
      model: "AH31",
      size: "315/80 R22,5",
      index: "156/150K",
      dot: "1823",
      type: "nova",
      priceEx: 9456,
      supplier: "CZVEHA",
      purchaseDate: "2026-03-13",
      invoice: "FV-2026-0313",
      state: "na vozidle",
      vehicle: "2BD 8835",
      position: "HL vnejsi",
      mounted: "2026-03-15",
      mountedOdo: 325400,
      currentTread: 8.4,
      pressure: 8.6,
      mileage: 17400,
      defects: 1
    },
    {
      id: "KS-315-00043",
      manufacturer: "Hankook",
      model: "AH31",
      size: "315/80 R22,5",
      index: "156/150K",
      dot: "1823",
      type: "nova",
      priceEx: 9456,
      supplier: "CZVEHA",
      purchaseDate: "2026-03-13",
      invoice: "FV-2026-0313",
      state: "na vozidle",
      vehicle: "2BD 8835",
      position: "HP vnejsi",
      mounted: "2026-03-15",
      mountedOdo: 325400,
      currentTread: 3.9,
      pressure: 8.1,
      mileage: 17400,
      defects: 0
    },
    {
      id: "KS-385-00014",
      manufacturer: "Pirelli",
      model: "R02",
      size: "385/65 R22,5",
      index: "160K",
      dot: "4022",
      type: "nova",
      priceEx: 11280,
      supplier: "Pneuservis A",
      purchaseDate: "2026-02-01",
      invoice: "PA-260211",
      state: "na vozidle",
      vehicle: "4J9 2218",
      position: "P",
      mounted: "2026-02-03",
      mountedOdo: 418700,
      currentTread: 6.1,
      pressure: 8.9,
      mileage: 28900,
      defects: 0
    },
    {
      id: "KS-265-00022",
      manufacturer: "Sailun",
      model: "SDM1S",
      size: "265/70 R19,5",
      index: "143/141J",
      dot: "1121",
      type: "protektor",
      priceEx: 4850,
      supplier: "Pneuservis A",
      purchaseDate: "2025-10-21",
      invoice: "PA-251021",
      state: "na vozidle",
      vehicle: "6B4 9142",
      position: "L",
      mounted: "2025-11-02",
      mountedOdo: 180200,
      currentTread: 5.2,
      pressure: 7.2,
      mileage: 34600,
      defects: 2
    },
    {
      id: "KS-315-00057",
      manufacturer: "Goodride",
      model: "CM983",
      size: "315/80 R22,5",
      index: "156/150K",
      dot: "0626",
      type: "nova",
      priceEx: 7950,
      supplier: "CZVEHA",
      purchaseDate: "2026-06-03",
      invoice: "FV-2026-0603",
      state: "sklad",
      vehicle: "",
      position: "",
      mounted: "",
      mountedOdo: 0,
      currentTread: 16,
      pressure: 0,
      mileage: 0,
      defects: 0
    },
    {
      id: "KS-13R-00008",
      manufacturer: "Barum",
      model: "BDY3",
      size: "13 R22,5",
      index: "154/150K",
      dot: "2019",
      type: "pouzita",
      priceEx: 2500,
      supplier: "sklad prevod",
      purchaseDate: "2024-09-12",
      invoice: "INT-240912",
      state: "oprava",
      vehicle: "",
      position: "",
      mounted: "",
      mountedOdo: 0,
      currentTread: 4.6,
      pressure: 0,
      mileage: 71200,
      defects: 3
    }
  ],
  vehicles: [
    {
      spz: "2BD 8835",
      type: "Nakladni vozidlo",
      driver: "Sovka",
      odometer: 342800,
      depot: "Brno",
      monthlyCost: 28760,
      configuration: ["L", "P", "HL vnitrni", "HL vnejsi", "HP vnitrni", "HP vnejsi", "VL", "VP"]
    },
    {
      spz: "4J9 2218",
      type: "Naves / prives",
      driver: "Nemecek",
      odometer: 447600,
      depot: "Slapanice",
      monthlyCost: 19440,
      configuration: ["L", "P", "VL", "VP", "ZL", "ZP"]
    },
    {
      spz: "6B4 9142",
      type: "Dodavka servis",
      driver: "Kral",
      odometer: 214800,
      depot: "Brno",
      monthlyCost: 8320,
      configuration: ["L", "P", "ZL", "ZP"]
    }
  ],
  services: [
    {
      id: "S-260613-01",
      date: "2026-06-13",
      vehicle: "2BD 8835",
      person: "Sovka",
      type: "defekt",
      supplier: "Pneuservis A",
      labor: 1200,
      material: 300,
      tireCost: 9456,
      note: "vymena na hnaci naprave, ventil"
    },
    {
      id: "S-260607-01",
      date: "2026-06-07",
      vehicle: "4J9 2218",
      person: "Nemecek",
      type: "kontrola",
      supplier: "interne",
      labor: 450,
      material: 0,
      tireCost: 0,
      note: "kontrola tlaku pred vikendovym provozem"
    },
    {
      id: "S-260522-01",
      date: "2026-05-22",
      vehicle: "6B4 9142",
      person: "Kral",
      type: "oprava",
      supplier: "CZVEHA",
      labor: 850,
      material: 180,
      tireCost: 0,
      note: "oprava prurazu, kontrola rezervy"
    }
  ],
  measurements: [
    {
      date: "2026-06-15",
      vehicle: "2BD 8835",
      position: "HP vnejsi",
      tread: 3.9,
      pressure: 8.1,
      person: "dilna",
      note: "pod limitem"
    },
    {
      date: "2026-06-12",
      vehicle: "4J9 2218",
      position: "P",
      tread: 6.1,
      pressure: 8.9,
      person: "dilna",
      note: "bez zasahu"
    }
  ],
  priceRefs: [
    { size: "315/80 R22,5", last: 9456, reference: 8750, supplier: "CZVEHA" },
    { size: "385/65 R22,5", last: 11280, reference: 10850, supplier: "Pneuservis A" },
    { size: "265/70 R19,5", last: 4850, reference: 4650, supplier: "Pneuservis A" },
    { size: "13 R22,5", last: 2500, reference: 3900, supplier: "sklad prevod" }
  ],
  imports: []
};

let state = loadState();
let activeSection = "dashboard";
let selectedVehicle = state.vehicles[0]?.spz || "";
let selectedPosition = "";

const titles = {
  dashboard: "Dashboard provozu",
  tires: "Evidence pneumatik",
  vehicles: "Vozidla a pozice",
  service: "Servisni zasahy",
  import: "Import faktur",
  reports: "Reporty a naklady"
};

const formatCurrency = (value) =>
  new Intl.NumberFormat("cs-CZ", {
    style: "currency",
    currency: "CZK",
    maximumFractionDigits: 0
  }).format(Number(value) || 0);

const formatNumber = (value, decimals = 0) =>
  new Intl.NumberFormat("cs-CZ", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(Number(value) || 0);

function loadState() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return structuredClone(initialState);
    const parsed = JSON.parse(stored);
    return {
      ...structuredClone(initialState),
      ...parsed,
      tires: parsed.tires || [],
      vehicles: parsed.vehicles || [],
      services: parsed.services || [],
      measurements: parsed.measurements || [],
      priceRefs: parsed.priceRefs || [],
      imports: parsed.imports || []
    };
  } catch {
    return structuredClone(initialState);
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function query(selector, scope = document) {
  return scope.querySelector(selector);
}

function queryAll(selector, scope = document) {
  return [...scope.querySelectorAll(selector)];
}

function showToast(message) {
  const toast = query("#toast");
  toast.textContent = message;
  toast.classList.add("is-visible");
  window.clearTimeout(showToast.timeout);
  showToast.timeout = window.setTimeout(() => toast.classList.remove("is-visible"), 2600);
}

function setSection(section) {
  activeSection = section;
  queryAll(".section").forEach((el) => el.classList.toggle("is-active", el.id === section));
  queryAll(".nav-item").forEach((el) =>
    el.classList.toggle("is-active", el.dataset.section === section)
  );
  query("#pageTitle").textContent = titles[section] || "Evidence pneumatik";
  if (section === "vehicles") renderVehicles();
  if (section === "reports") renderReports();
}

function getSearchTerm() {
  return query("#globalSearch").value.trim().toLowerCase();
}

function matchesSearch(tire, term) {
  if (!term) return true;
  return [tire.id, tire.manufacturer, tire.model, tire.size, tire.supplier, tire.vehicle, tire.invoice]
    .join(" ")
    .toLowerCase()
    .includes(term);
}

function tireCostPerKm(tire) {
  if (!tire.mileage) return 0;
  return tire.priceEx / tire.mileage;
}

function tireStatus(tire) {
  if (tire.state === "vyrazeno") return "danger";
  if (tire.state === "na vozidle") return tire.currentTread < 4.5 ? "danger" : "on";
  if (tire.state === "oprava") return "warn";
  return "";
}

function dotYear(dot) {
  const text = String(dot || "");
  if (text.length < 4) return null;
  const year = Number(text.slice(-2));
  return Number.isFinite(year) ? 2000 + year : null;
}

function getAlerts() {
  const alerts = [];
  state.tires.forEach((tire) => {
    if (tire.state === "na vozidle" && tire.currentTread < 4.5) {
      alerts.push({
        level: "danger",
        title: `${tire.vehicle} / ${tire.position}`,
        body: `${tire.id} ma dezen ${formatNumber(tire.currentTread, 1)} mm. Pripravit vymenu.`
      });
    }

    if (tire.state === "na vozidle" && tire.pressure > 0 && tire.pressure < 8.2) {
      alerts.push({
        level: "warning",
        title: `${tire.vehicle} / ${tire.position}`,
        body: `Tlak ${formatNumber(tire.pressure, 1)} bar je pod internim limitem. Zkontrolovat dvojmontaz.`
      });
    }

    const year = dotYear(tire.dot);
    if (year && new Date().getFullYear() - year >= 5 && tire.state !== "vyrazeno") {
      alerts.push({
        level: "warning",
        title: `${tire.id} / DOT ${tire.dot}`,
        body: "Pneu je podle DOT starsi nez limit pro kontrolu."
      });
    }

    if (tire.defects >= 2 && tire.state !== "vyrazeno") {
      alerts.push({
        level: "warning",
        title: `${tire.vehicle || "sklad"} / opakovane defekty`,
        body: `${tire.id} ma ${tire.defects} defekty. Proverit trasu, ridice nebo typ pneu.`
      });
    }
  });

  return alerts.slice(0, 8);
}

function calculateKpis() {
  const serviceMonth = state.services
    .filter((item) => item.date?.startsWith("2026-06"))
    .reduce((sum, item) => sum + item.labor + item.material + item.tireCost, 0);
  const ytd = state.services
    .filter((item) => item.date?.startsWith("2026"))
    .reduce((sum, item) => sum + item.labor + item.material + item.tireCost, 0);
  const active = state.tires.filter((tire) => tire.state !== "vyrazeno").length;
  const replaceSoon = state.tires.filter(
    (tire) => tire.state === "na vozidle" && tire.currentTread < 5.2
  ).length;
  const costKmValues = state.tires.filter((tire) => tire.mileage > 0).map(tireCostPerKm);
  const avgCostKm =
    costKmValues.reduce((sum, value) => sum + value, 0) / Math.max(costKmValues.length, 1);

  return [
    { label: "Naklad pneu tento mesic", value: formatCurrency(serviceMonth), hint: "prace, material i pneu" },
    { label: "Naklad pneu YTD", value: formatCurrency(ytd), hint: "souhrn za rok 2026" },
    { label: "Aktivni pneu", value: `${active} ks`, hint: "sklad + vozidla + oprava" },
    { label: "K vymene do 30 dnu", value: `${replaceSoon} ks`, hint: "pod internim limitem" },
    { label: "Prumer Kc / km", value: `${formatNumber(avgCostKm, 2)} Kc`, hint: "z evidovaneho najezdu" }
  ];
}

function renderKpis() {
  query("#kpiGrid").innerHTML = calculateKpis()
    .map(
      (kpi) => `
        <article class="kpi-card">
          <span>${kpi.label}</span>
          <strong>${kpi.value}</strong>
          <small>${kpi.hint}</small>
        </article>
      `
    )
    .join("");
}

function renderAlerts() {
  const alerts = getAlerts();
  query("#alertCount").textContent = `${alerts.length} aktivnich`;
  query("#alertList").innerHTML =
    alerts
      .map(
        (alert) => `
          <div class="alert-item ${alert.level === "danger" ? "danger" : ""}">
            <span class="alert-marker" aria-hidden="true"></span>
            <div>
              <strong>${alert.title}</strong>
              <p>${alert.body}</p>
            </div>
            <span class="badge ${alert.level === "danger" ? "badge-danger" : "badge-warning"}">
              ${alert.level === "danger" ? "urgentni" : "kontrola"}
            </span>
          </div>
        `
      )
      .join("") || `<p class="meta">Bez aktivnich upozorneni.</p>`;
}

function vehicleCosts() {
  return state.vehicles
    .map((vehicle) => {
      const serviceCost = state.services
        .filter((item) => item.vehicle === vehicle.spz)
        .reduce((sum, item) => sum + item.labor + item.material + item.tireCost, 0);
      return { label: vehicle.spz, value: vehicle.monthlyCost + serviceCost };
    })
    .sort((a, b) => b.value - a.value);
}

function driverDefects() {
  return state.vehicles
    .map((vehicle) => {
      const tireDefects = state.tires
        .filter((tire) => tire.vehicle === vehicle.spz)
        .reduce((sum, tire) => sum + tire.defects, 0);
      const serviceDefects = state.services.filter(
        (service) => service.vehicle === vehicle.spz && service.type === "defekt"
      ).length;
      return { label: vehicle.driver, value: tireDefects + serviceDefects };
    })
    .sort((a, b) => b.value - a.value);
}

function sizeCosts() {
  return Object.values(
    state.tires.reduce((acc, tire) => {
      if (!acc[tire.size]) acc[tire.size] = { label: tire.size, value: 0 };
      acc[tire.size].value += tire.priceEx;
      return acc;
    }, {})
  ).sort((a, b) => b.value - a.value);
}

function potentialSavings() {
  return state.priceRefs.reduce((sum, item) => sum + Math.max(item.last - item.reference, 0), 0);
}

function previewRows(data, formatter = formatCurrency) {
  const max = Math.max(...data.map((item) => item.value), 1);
  return data
    .map(
      (item) => `
        <div class="preview-mini-row">
          <div>
            <strong>${item.label}</strong>
            <span>${formatter(item.value)}</span>
          </div>
          <span class="preview-mini-track" aria-hidden="true">
            <span class="preview-mini-fill" style="width: ${Math.max((item.value / max) * 100, 8)}%"></span>
          </span>
        </div>
      `
    )
    .join("");
}

function renderLiveDashboard() {
  const target = query("#liveDashboard");
  if (!target) return;

  const kpis = calculateKpis();
  const costKmValues = state.tires.filter((tire) => tire.mileage > 0).map(tireCostPerKm);
  const avgCostKm =
    costKmValues.reduce((sum, value) => sum + value, 0) / Math.max(costKmValues.length, 1);
  const needleRotation = Math.min(Math.max(-62 + avgCostKm * 170, -62), 58);
  const topSizes = sizeCosts().slice(0, 3);
  const totalSizeCost = topSizes.reduce((sum, item) => sum + item.value, 0) || 1;
  const firstSlice = Math.round((topSizes[0]?.value || 0) / totalSizeCost * 100);
  const secondSlice = Math.round(((topSizes[0]?.value || 0) + (topSizes[1]?.value || 0)) / totalSizeCost * 100);

  target.innerHTML = `
    <div class="preview-main">
      <div class="preview-title">Aktivni Kaiser dashboard</div>
      <button class="preview-gauge-card" type="button" data-section-jump="reports">
        <span class="preview-gauge" style="--needle-rotation: ${needleRotation}deg"><span></span></span>
        <span class="preview-gauge-value">
          <strong>${kpis[4].value}</strong>
          <span>${kpis[4].label}</span>
        </span>
      </button>
      ${kpis
        .map(
          (kpi, index) => `
            <div class="preview-row">
              <span class="preview-icon ${["circle", "wheel", "stack", "calendar", "chart"][index]}"></span>
              <strong>${kpi.label}</strong>
              <b>${kpi.value}</b>
            </div>
          `
        )
        .join("")}
    </div>

    <button class="preview-tile" type="button" data-section-jump="reports">
      <div class="preview-title">top SPZ podle nakladu</div>
      <div class="preview-list">${previewRows(vehicleCosts().slice(0, 4))}</div>
    </button>

    <button class="preview-tile" type="button" data-section-jump="reports">
      <div class="preview-title">ridici podle defektu</div>
      <div class="preview-list">${previewRows(driverDefects().slice(0, 4), (value) => `${value}x`)}</div>
    </button>

    <button class="preview-tile preview-chart" type="button" data-section-jump="reports" style="--slice-one: ${firstSlice}%; --slice-two: ${secondSlice}%">
      <div class="preview-title">rozmery podle nakladu</div>
      <span aria-hidden="true"></span>
      <strong>${topSizes[0]?.label || "-"}<small>${formatCurrency(topSizes[0]?.value || 0)}</small></strong>
    </button>

    <button class="preview-tile preview-savings" type="button" data-section-jump="reports">
      <div class="preview-title">uspora proti referenci</div>
      <span aria-hidden="true"></span>
      <strong>${formatCurrency(potentialSavings())}<small>k provereni</small></strong>
    </button>
  `;
}

function renderBarList(target, data, formatter = formatCurrency) {
  const max = Math.max(...data.map((item) => item.value), 1);
  target.innerHTML = data
    .map(
      (item) => `
        <div class="bar-row">
          <div class="bar-row-header">
            <strong>${item.label}</strong>
            <span>${formatter(item.value)}</span>
          </div>
          <div class="bar-track" aria-hidden="true">
            <div class="bar-fill" style="width: ${Math.max((item.value / max) * 100, 5)}%"></div>
          </div>
        </div>
      `
    )
    .join("");
}

function renderTires() {
  const term = getSearchTerm();
  const stateFilter = query("#tireStateFilter")?.value || "all";
  const tires = state.tires.filter(
    (tire) => matchesSearch(tire, term) && (stateFilter === "all" || tire.state === stateFilter)
  );

  query("#tireTableBody").innerHTML =
    tires
      .map(
        (tire) => `
          <tr>
            <td>
              <div class="tire-id">${tire.id}</div>
              <div class="meta">DOT ${tire.dot} / ${tire.type}</div>
            </td>
            <td>
              <strong>${tire.manufacturer} ${tire.model}</strong>
              <div class="meta">${tire.index || "bez indexu"} / faktura ${tire.invoice || "-"}</div>
            </td>
            <td>${tire.size}</td>
            <td><span class="state-pill ${tireStatus(tire)}">${tire.state}</span></td>
            <td>
              <strong>${tire.vehicle || "sklad"}</strong>
              <div class="meta">${tire.position || "bez pozice"}</div>
            </td>
            <td>
              <strong>${formatNumber(tire.currentTread, 1)} mm</strong>
              <div class="meta">${tire.pressure ? `${formatNumber(tire.pressure, 1)} bar` : "tlak nezadan"}</div>
            </td>
            <td>${tire.mileage ? `${formatNumber(tireCostPerKm(tire), 2)} Kc` : "-"}</td>
            <td>
              ${tire.supplier}
              <div class="meta">${formatCurrency(tire.priceEx)}</div>
            </td>
          </tr>
        `
      )
      .join("") || `<tr><td colspan="8">Zadna pneumatika neodpovida filtru.</td></tr>`;
}

function fillSelectOptions() {
  const vehicleOptions = state.vehicles
    .map((vehicle) => `<option value="${vehicle.spz}">${vehicle.spz} - ${vehicle.driver}</option>`)
    .join("");

  queryAll('select[name="vehicle"]').forEach((select) => {
    const current = select.value;
    select.innerHTML = vehicleOptions;
    select.value = current || state.vehicles[0]?.spz || "";
  });

  const vehicleSelect = query("#vehicleSelect");
  vehicleSelect.innerHTML = state.vehicles
    .map((vehicle) => `<option value="${vehicle.spz}">${vehicle.spz} - ${vehicle.type}</option>`)
    .join("");
  vehicleSelect.value = selectedVehicle;

  fillPositionOptions(query('#measurementForm select[name="vehicle"]').value);
}

function fillPositionOptions(spz) {
  const vehicle = state.vehicles.find((item) => item.spz === spz) || state.vehicles[0];
  const select = query('#measurementForm select[name="position"]');
  select.innerHTML = (vehicle?.configuration || [])
    .map((position) => `<option value="${position}">${position}</option>`)
    .join("");
}

function renderDashboard() {
  renderLiveDashboard();
  renderKpis();
  renderAlerts();
  renderBarList(query("#vehicleCostBars"), vehicleCosts().slice(0, 5));
}

function tireForPosition(spz, position) {
  return state.tires.find((tire) => tire.vehicle === spz && tire.position === position);
}

function renderVehicles() {
  const vehicle = state.vehicles.find((item) => item.spz === selectedVehicle) || state.vehicles[0];
  if (!vehicle) return;
  selectedVehicle = vehicle.spz;
  query("#vehicleSelect").value = selectedVehicle;

  const vehicleTires = state.tires.filter((tire) => tire.vehicle === vehicle.spz);
  const avgTread =
    vehicleTires.reduce((sum, tire) => sum + tire.currentTread, 0) / Math.max(vehicleTires.length, 1);
  const vehicleServiceCost = state.services
    .filter((item) => item.vehicle === vehicle.spz)
    .reduce((sum, item) => sum + item.labor + item.material + item.tireCost, 0);

  query("#vehicleDetail").innerHTML = `
    <div>
      <p class="eyebrow">${vehicle.depot}</p>
      <h2>${vehicle.spz}</h2>
      <p class="meta">${vehicle.type} / ridic ${vehicle.driver}</p>
    </div>
    <div class="vehicle-metric-grid">
      <div class="vehicle-metric"><span>Tachometr</span><strong>${formatNumber(vehicle.odometer)} km</strong></div>
      <div class="vehicle-metric"><span>Osazene pozice</span><strong>${vehicleTires.length}/${vehicle.configuration.length}</strong></div>
      <div class="vehicle-metric"><span>Prumerny dezen</span><strong>${formatNumber(avgTread, 1)} mm</strong></div>
      <div class="vehicle-metric"><span>Naklady servis</span><strong>${formatCurrency(vehicleServiceCost)}</strong></div>
    </div>
    <div class="alert-item">
      <span class="alert-marker" aria-hidden="true"></span>
      <div>
        <strong>Doporuceni</strong>
        <p>${avgTread < 5 ? "Zaridit planovanou vymenu pro nejvice sjete pozice." : "Pokračovat v tydenni kontrole tlaku a dezenu."}</p>
      </div>
    </div>
  `;

  renderVehicleMap(vehicle);
}

function getPositionCoordinates(position, index, total) {
  const axleIndex = Math.floor(index / 2);
  const sideIndex = index % 2;
  const top = 110 + axleIndex * Math.max(78, 230 / Math.max(Math.ceil(total / 2), 1));
  const isLeft = sideIndex === 0;
  return {
    left: isLeft ? "15%" : "calc(85% - 76px)",
    top: `${Math.min(top, 330)}px`
  };
}

function renderVehicleMap(vehicle) {
  const axleLines = vehicle.configuration
    .filter((_, index) => index % 2 === 0)
    .map((_, index) => `<div class="axle" style="top: ${146 + index * 84}px"></div>`)
    .join("");

  const positions = vehicle.configuration
    .map((position, index) => {
      const tire = tireForPosition(vehicle.spz, position);
      const coords = getPositionCoordinates(position, index, vehicle.configuration.length);
      const status = tire ? (tire.currentTread < 4.5 ? "low" : tire.currentTread < 5.5 ? "warn" : "") : "warn";
      return `
        <button
          class="position-button ${status}"
          type="button"
          style="left: ${coords.left}; top: ${coords.top}"
          data-position="${position}"
          aria-label="${position} ${tire ? tire.id : "bez pneu"}"
        >
          <span>${shortPosition(position)}</span>
        </button>
      `;
    })
    .join("");

  query("#vehicleMap").innerHTML = `
    <div class="vehicle-body" aria-hidden="true"></div>
    <div class="vehicle-cabin" aria-hidden="true"></div>
    ${axleLines}
    ${positions}
  `;

  queryAll(".position-button", query("#vehicleMap")).forEach((button) => {
    button.addEventListener("click", () => {
      selectedPosition = button.dataset.position;
      renderPositionDetail(vehicle.spz, selectedPosition);
    });
  });

  selectedPosition = selectedPosition || vehicle.configuration[0];
  renderPositionDetail(vehicle.spz, selectedPosition);
}

function shortPosition(position) {
  return position
    .replace("vnitrni", "V")
    .replace("vnejsi", "X")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 3)
    .toUpperCase();
}

function renderPositionDetail(spz, position) {
  const tire = tireForPosition(spz, position);
  query("#positionDetail").innerHTML = tire
    ? `
      <strong>${position}: ${tire.id}</strong>
      <p class="meta">${tire.manufacturer} ${tire.model}, ${tire.size}</p>
      <dl>
        <div><dt>Montaz od</dt><dd>${tire.mounted || "-"}</dd></div>
        <div><dt>Najezd pozice</dt><dd>${formatNumber(tire.mileage)} km</dd></div>
        <div><dt>Dezen</dt><dd>${formatNumber(tire.currentTread, 1)} mm</dd></div>
        <div><dt>Tlak</dt><dd>${tire.pressure ? `${formatNumber(tire.pressure, 1)} bar` : "-"}</dd></div>
      </dl>
    `
    : `
      <strong>${position}: pozice bez pneu</strong>
      <p class="meta">Vyberte pneu ze skladu nebo zalozte novou montaz.</p>
    `;
}

function renderServices() {
  query("#serviceList").innerHTML = state.services
    .slice()
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 8)
    .map((service) => {
      const total = service.labor + service.material + service.tireCost;
      return `
        <div class="service-item">
          <div>
            <strong>${service.date} / ${service.vehicle} / ${service.type}</strong>
            <p>${service.person}, ${service.supplier}. Prace ${formatCurrency(service.labor)}, material ${formatCurrency(service.material)}, pneu ${formatCurrency(service.tireCost)}.</p>
            <p>${service.note || ""}</p>
          </div>
          <span class="service-total">${formatCurrency(total)}</span>
        </div>
      `;
    })
    .join("");
}

function renderReports() {
  const byBrand = Object.values(
    state.tires.reduce((acc, tire) => {
      const key = `${tire.manufacturer} ${tire.model}`;
      if (!acc[key]) acc[key] = { label: key, totalCostKm: 0, count: 0 };
      if (tire.mileage > 0) {
        acc[key].totalCostKm += tireCostPerKm(tire);
        acc[key].count += 1;
      }
      return acc;
    }, {})
  )
    .map((item) => ({ label: item.label, value: item.totalCostKm / Math.max(item.count, 1) }))
    .sort((a, b) => b.value - a.value);

  renderBarList(query("#brandCostBars"), byBrand, (value) => `${formatNumber(value, 2)} Kc/km`);

  const suppliers = Object.values(
    state.services.reduce((acc, service) => {
      if (!acc[service.supplier]) {
        acc[service.supplier] = { supplier: service.supplier, labor: 0, material: 0, tireCost: 0 };
      }
      acc[service.supplier].labor += service.labor;
      acc[service.supplier].material += service.material;
      acc[service.supplier].tireCost += service.tireCost;
      return acc;
    }, {})
  );

  query("#supplierCards").innerHTML = suppliers
    .map(
      (item) => `
        <div class="supplier-card">
          <strong>${item.supplier}</strong>
          <p>Prace ${formatCurrency(item.labor)}</p>
          <p>Material ${formatCurrency(item.material)}</p>
          <p>Pneu ${formatCurrency(item.tireCost)}</p>
        </div>
      `
    )
    .join("");

  query("#priceTableBody").innerHTML = state.priceRefs
    .map((item) => {
      const diff = item.last - item.reference;
      const isHigh = diff > 0;
      return `
        <tr>
          <td>${item.size}</td>
          <td>${formatCurrency(item.last)}<div class="meta">${item.supplier}</div></td>
          <td>${formatCurrency(item.reference)}</td>
          <td><span class="badge ${isHigh ? "badge-danger" : "badge-ok"}">${isHigh ? "+" : ""}${formatCurrency(diff)}</span></td>
          <td>${isHigh ? "vyzadat porovnani" : "cena v poradku"}</td>
        </tr>
      `;
    })
    .join("");
}

function parseImportRows(raw) {
  return raw
    .split(/\r?\n/)
    .map((row) => row.trim())
    .filter(Boolean)
    .map((row) => {
      const [date, supplier, invoice, item, qty, price, target] = row.split(";").map((part) => part?.trim());
      const itemText = (item || "").toLowerCase();
      let category = "ostatni";
      if (/(315|385|265|r22|r19|pneu|hankook|pirelli|sailun|goodride)/.test(itemText)) {
        category = "pneumatika";
      } else if (/(montaz|demontaz|oprava|prezuti|vyjezd)/.test(itemText)) {
        category = "servisni prace";
      } else if (/(ventil|zavazi|material|lepeni)/.test(itemText)) {
        category = "material";
      }
      return {
        date,
        supplier,
        invoice,
        item,
        qty: Number(qty) || 1,
        price: Number(String(price || "0").replace(",", ".")) || 0,
        target,
        category
      };
    });
}

function renderImportPreview(rows = state.imports) {
  query("#importSummary").textContent = `${rows.length} radku`;
  query("#importPreview").innerHTML =
    rows
      .map(
        (row) => `
          <div class="import-item">
            <div>
              <strong>${row.category}: ${row.item || "-"}</strong>
              <p>${row.date || "-"} / ${row.supplier || "-"} / ${row.invoice || "-"} / ${row.target || "bez SPZ"}</p>
            </div>
            <span class="service-total">${formatCurrency(row.qty * row.price)}</span>
          </div>
        `
      )
      .join("") || `<p class="meta">Zatim nejsou rozpoznane zadne polozky.</p>`;
}

function updateServiceTotal() {
  const form = query("#serviceForm");
  const total = ["labor", "material", "tireCost"].reduce(
    (sum, key) => sum + (Number(form.elements[key].value) || 0),
    0
  );
  query("#serviceTotal").textContent = `Celkem ${formatCurrency(total)}`;
}

function addTire(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const data = Object.fromEntries(new FormData(form).entries());
  const nextNumber = String(state.tires.length + 61).padStart(5, "0");
  state.tires.unshift({
    id: data.id?.trim() || `KS-${data.size.slice(0, 3).replace(/\D/g, "") || "PNE"}-${nextNumber}`,
    manufacturer: data.manufacturer.trim(),
    model: data.model.trim(),
    size: data.size,
    index: "",
    dot: data.dot.trim(),
    type: data.type,
    priceEx: Number(data.priceEx) || 0,
    supplier: data.supplier.trim(),
    purchaseDate: todayIso(),
    invoice: data.invoice.trim(),
    state: data.state,
    vehicle: "",
    position: "",
    mounted: "",
    mountedOdo: 0,
    currentTread: data.type === "nova" ? 16 : 8,
    pressure: 0,
    mileage: 0,
    defects: 0
  });
  saveState();
  form.reset();
  query("#tireFormPanel").hidden = true;
  renderAll();
  showToast("Pneumatika je zalozena v evidenci.");
}

function addMeasurement(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const data = Object.fromEntries(new FormData(form).entries());
  const tire = tireForPosition(data.vehicle, data.position);
  const measurement = {
    date: todayIso(),
    vehicle: data.vehicle,
    position: data.position,
    tread: Number(data.tread) || 0,
    pressure: Number(data.pressure) || 0,
    person: "dilna",
    note: data.note || ""
  };
  state.measurements.unshift(measurement);
  if (tire) {
    tire.currentTread = measurement.tread;
    tire.pressure = measurement.pressure;
  }
  saveState();
  form.reset();
  fillPositionOptions(data.vehicle);
  renderAll();
  showToast(tire ? "Mereni ulozeno a pneu aktualizovana." : "Mereni ulozeno, pozice zatim nema prirazene ID pneu.");
}

function addService(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const data = Object.fromEntries(new FormData(form).entries());
  state.services.unshift({
    id: `S-${Date.now()}`,
    date: data.date,
    vehicle: data.vehicle,
    person: data.person.trim(),
    type: data.type,
    supplier: data.supplier.trim(),
    labor: Number(data.labor) || 0,
    material: Number(data.material) || 0,
    tireCost: Number(data.tireCost) || 0,
    note: data.note.trim()
  });
  saveState();
  form.reset();
  form.elements.date.value = todayIso();
  updateServiceTotal();
  renderAll();
  showToast("Servisni karta je ulozena.");
}

function exportCsv() {
  const header = "datum;SPZ;osoba;typ;dodavatel;prace;material;pneu;celkem;poznamka";
  const rows = state.services.map((item) =>
    [
      item.date,
      item.vehicle,
      item.person,
      item.type,
      item.supplier,
      item.labor,
      item.material,
      item.tireCost,
      item.labor + item.material + item.tireCost,
      item.note
    ].join(";")
  );
  const blob = new Blob([[header, ...rows].join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `kaiser-servisni-karty-${todayIso()}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function renderAll() {
  fillSelectOptions();
  renderDashboard();
  renderTires();
  renderVehicles();
  renderServices();
  renderImportPreview();
  renderReports();
}

function bindEvents() {
  queryAll("[data-section]").forEach((button) =>
    button.addEventListener("click", () => setSection(button.dataset.section))
  );

  document.addEventListener("click", (event) => {
    const jumpTarget = event.target.closest("[data-section-jump]");
    if (!jumpTarget) return;
    setSection(jumpTarget.dataset.sectionJump);
  });

  query("#globalSearch").addEventListener("input", renderTires);
  query("#qrFocusButton").addEventListener("click", () => {
    query("#globalSearch").focus();
    query("#globalSearch").select();
    showToast("Zadejte nebo naskenujte interni ID pneu do vyhledavani.");
  });

  query("#tireStateFilter").addEventListener("change", renderTires);
  query("#openTireForm").addEventListener("click", () => {
    query("#tireFormPanel").hidden = false;
    query('#tireForm input[name="manufacturer"]').focus();
  });
  query("#closeTireForm").addEventListener("click", () => (query("#tireFormPanel").hidden = true));
  query("#tireForm").addEventListener("submit", addTire);

  query('#measurementForm select[name="vehicle"]').addEventListener("change", (event) =>
    fillPositionOptions(event.target.value)
  );
  query("#measurementForm").addEventListener("submit", addMeasurement);

  query("#vehicleSelect").addEventListener("change", (event) => {
    selectedVehicle = event.target.value;
    selectedPosition = "";
    renderVehicles();
  });

  query("#serviceForm").addEventListener("input", updateServiceTotal);
  query("#serviceForm").addEventListener("submit", addService);
  query('#serviceForm input[name="date"]').value = todayIso();
  query("#exportCsv").addEventListener("click", exportCsv);

  query("#loadSampleImport").addEventListener("click", () => {
    query("#invoiceImport").value =
      "2026-06-13;Pneuservis A;PA-260613;Hankook AH31 315/80 R22,5;1;9456;2BD 8835\n" +
      "2026-06-13;Pneuservis A;PA-260613;montaz a demontaz;1;1200;2BD 8835\n" +
      "2026-06-13;Pneuservis A;PA-260613;ventil a zavazi;1;300;2BD 8835";
  });

  query("#parseImport").addEventListener("click", () => {
    state.imports = parseImportRows(query("#invoiceImport").value);
    saveState();
    renderImportPreview();
    showToast("Polozky jsou rozpoznane a pripravene ke kontrole.");
  });

  query("#resetDemoData").addEventListener("click", () => {
    state = structuredClone(initialState);
    saveState();
    selectedVehicle = state.vehicles[0]?.spz || "";
    selectedPosition = "";
    renderAll();
    showToast("Demo data byla obnovena.");
  });
}

bindEvents();
renderAll();
