(function () {
  const labels = {
    abroll: "Nosic kontejneru",
    tanker: "Cisterna",
    garbage: "Popelarske vozidlo",
    van: "Dodavka",
    trailer: "Prives / naves",
    hauler: "Tahac / souprava"
  };

  function normalize(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function detectKind(vehicle) {
    const text = normalize([vehicle.type, vehicle.category, vehicle.depot].join(" "));

    if (/cisterna|ibos/.test(text)) return "tanker";
    if (/popelar|ros\s*roca|hanes|olympus|kobit/.test(text)) return "garbage";
    if (/daily|esprinter|citan|combo|dodav|van|skrin/.test(text)) return "van";
    if (/tahac|souprava/.test(text)) return "hauler";
    if (/prives|naves|vlek|huffermann|huf|kogel|svan|milcom|vozik|roller/.test(text)) return "trailer";
    if (/abroll|kontejner|nosic|ramen|meiller|palfinger|pak|kuhn|canter/.test(text)) return "abroll";

    return "abroll";
  }

  function svgDataUri(markup) {
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(markup)}`;
  }

  function wheel(cx, cy, r = 48) {
    return `
      <ellipse cx="${cx}" cy="${cy + 12}" rx="${r + 9}" ry="${r * 0.42}" fill="rgba(28,38,35,.22)"/>
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="#20292b"/>
      <circle cx="${cx}" cy="${cy}" r="${r - 13}" fill="#75868a"/>
      <circle cx="${cx}" cy="${cy}" r="${r - 28}" fill="#e7eded"/>
      <path d="M${cx} ${cy - r + 17}v${(r - 17) * 2}M${cx - r + 17} ${cy}h${(r - 17) * 2}M${cx - 25} ${cy - 25}l50 50M${cx + 25} ${cy - 25}l-50 50" stroke="#52666a" stroke-width="4" stroke-linecap="round"/>
    `;
  }

  function cab(x = 130, y = 220) {
    return `
      <path d="M${x} ${y + 120}l24-94 104-27 92 36 17 108H${x + 26}z" fill="#f8faf8" stroke="#41565b" stroke-width="2"/>
      <path d="M${x + 48} ${y + 35}l80-18 48 31-16 40H${x + 38}z" fill="#b9d4dd" stroke="#5e7780" stroke-width="2"/>
      <path d="M${x + 172} ${y + 47}l38 13 12 52-58-10z" fill="#9fc0cb" stroke="#5e7780" stroke-width="2"/>
      <rect x="${x + 12}" y="${y + 112}" width="212" height="27" rx="2" fill="#75bd25"/>
      <rect x="${x + 19}" y="${y + 147}" width="205" height="19" rx="4" fill="#20292b"/>
      <rect x="${x + 205}" y="${y + 130}" width="27" height="12" rx="2" fill="#f4d45f"/>
      <rect x="${x + 12}" y="${y + 130}" width="20" height="12" rx="2" fill="#e84f43"/>
    `;
  }

  function chassis(x1 = 128, x2 = 790, y = 402) {
    return `
      <rect x="${x1}" y="${y}" width="${x2 - x1}" height="22" rx="8" fill="#20292b"/>
      <rect x="${x1 + 58}" y="${y - 18}" width="${x2 - x1 - 112}" height="14" rx="4" fill="#59696e"/>
    `;
  }

  function vehicleBody(kind) {
    if (kind === "tanker") {
      return `
        ${chassis()}${cab()}
        <rect x="343" y="237" width="432" height="141" rx="70" fill="#f4f8f5" stroke="#52666a" stroke-width="3"/>
        <ellipse cx="410" cy="307" rx="67" ry="70" fill="#fbfdfb" stroke="#52666a" stroke-width="3"/>
        <ellipse cx="708" cy="307" rx="67" ry="70" fill="#dce7e2" stroke="#52666a" stroke-width="3"/>
        <rect x="404" y="302" width="304" height="43" rx="22" fill="#75bd25"/>
        <rect x="484" y="218" width="100" height="20" rx="4" fill="#4e6065"/>
        ${wheel(230, 424)}${wheel(526, 424)}${wheel(666, 424)}${wheel(750, 424)}
      `;
    }
    if (kind === "garbage") {
      return `
        ${chassis()}${cab()}
        <path d="M350 244h338l84 66-36 76H350z" fill="#edf3ef" stroke="#52666a" stroke-width="3"/>
        <path d="M376 270h274l50 45-26 41H376z" fill="#e2ebe7" stroke="#8ca09f" stroke-width="2"/>
        <path d="M610 246h78l84 64-36 76h-61l37-71z" fill="#75bd25" stroke="#447d35" stroke-width="3"/>
        <rect x="374" y="326" width="252" height="31" fill="#75bd25"/>
        ${wheel(230, 424)}${wheel(548, 424)}${wheel(688, 424)}${wheel(762, 424)}
      `;
    }
    if (kind === "van") {
      return `
        <rect x="160" y="388" width="600" height="30" rx="12" fill="#20292b"/>
        <path d="M164 348l24-102 208-28 269 12 85 84 18 70H174z" fill="#f8faf8" stroke="#52666a" stroke-width="3"/>
        <path d="M215 256l175-20-7 68-185 5z" fill="#b6d1da" stroke="#657c84" stroke-width="2"/>
        <path d="M410 238l192 8 58 59H406z" fill="#adcbd5" stroke="#657c84" stroke-width="2"/>
        <rect x="216" y="322" width="488" height="38" rx="14" fill="#75bd25"/>
        <rect x="708" y="344" width="44" height="16" rx="3" fill="#f4d45f"/>
        <rect x="172" y="342" width="36" height="16" rx="3" fill="#e84f43"/>
        ${wheel(285, 395, 52)}${wheel(640, 395, 52)}
      `;
    }
    if (kind === "trailer") {
      return `
        <rect x="140" y="394" width="655" height="26" rx="8" fill="#20292b"/>
        <path d="M168 254l530-18 80 134-540 18z" fill="#e8efeb" stroke="#52666a" stroke-width="3"/>
        <path d="M212 276l440-16 58 90-452 16z" fill="#57984e" stroke="#2f5f40" stroke-width="3"/>
        <path d="M212 276l108-4 46 89-108 5z" fill="#75bd25"/>
        <path d="M142 392l-46-48" stroke="#20292b" stroke-width="12" stroke-linecap="round"/>
        <circle cx="102" cy="350" r="21" fill="#52666a"/>
        ${wheel(328, 415)}${wheel(558, 415)}${wheel(700, 415)}
      `;
    }
    if (kind === "hauler") {
      return `
        ${chassis()}${cab()}
        <path d="M352 252l392-14 44 132-414 16z" fill="#edf3ef" stroke="#52666a" stroke-width="3"/>
        <path d="M390 278l300-10 34 76-314 12z" fill="#57984e" stroke="#2f5f40" stroke-width="3"/>
        <path d="M390 278l78-2 32 76-90 4z" fill="#75bd25"/>
        <path d="M333 397l52-57" stroke="#34464a" stroke-width="10" stroke-linecap="round"/>
        <rect x="350" y="388" width="452" height="22" rx="5" fill="#20292b"/>
        ${wheel(230, 424)}${wheel(526, 424)}${wheel(656, 424)}${wheel(752, 424)}
      `;
    }

    return `
      ${chassis()}${cab()}
      <path d="M348 266l352-53 54 134-362 49z" fill="#345b5c" stroke="#20292b" stroke-width="3"/>
      <path d="M374 282l300-44 40 94-303 39z" fill="#57984e" stroke="#2f5f40" stroke-width="3"/>
      <path d="M374 282l66-10 36 90-65 9z" fill="#75bd25"/>
      <path d="M335 250l187 142M366 224a54 54 0 0 1 34 88" fill="none" stroke="#20292b" stroke-width="8" stroke-linecap="round"/>
      ${wheel(230, 421)}${wheel(580, 421)}${wheel(708, 421)}
    `;
  }

  function photoSource(kind) {
    const markup = `
      <svg xmlns="http://www.w3.org/2000/svg" width="900" height="560" viewBox="0 0 900 560" role="img" aria-label="${labels[kind] || labels.abroll}">
        <defs>
          <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="#edf5f2"/>
            <stop offset=".58" stop-color="#dce7e3"/>
            <stop offset=".59" stop-color="#c8d0ca"/>
            <stop offset="1" stop-color="#a7b1aa"/>
          </linearGradient>
        </defs>
        <rect width="900" height="560" fill="url(#sky)"/>
        <rect y="210" width="900" height="128" fill="#dfe8e5" opacity=".85"/>
        ${Array.from({ length: 7 }, (_, index) => {
          const x = -10 + index * 145;
          return `<rect x="${x}" y="196" width="82" height="142" fill="#c9d8d6" opacity=".45"/><rect x="${x + 8}" y="204" width="66" height="88" fill="#f4f8f7" opacity=".7"/>`;
        }).join("")}
        <rect y="330" width="900" height="230" fill="#bec7c0" opacity=".72"/>
        <path d="M0 520h900v40H0z" fill="#a8b2ac" opacity=".55"/>
        <g opacity=".25" stroke="#8f9c95" stroke-width="2">
          <path d="M-40 560L155 330M105 560L300 330M250 560L445 330M395 560L590 330M540 560L735 330M685 560L880 330"/>
        </g>
        <ellipse cx="478" cy="436" rx="360" ry="58" fill="rgba(28,38,35,.14)"/>
        <g>${vehicleBody(kind)}</g>
      </svg>
    `;

    return svgDataUri(markup);
  }

  function currentVehicle() {
    const select = document.querySelector("#vehicleSelect");
    const spz = select ? select.value : "";
    return state.vehicles.find((vehicle) => vehicle.spz === spz) || state.vehicles[0];
  }

  function enhanceVehiclePhoto() {
    const card = document.querySelector("#vehicleDetail");
    if (!card || typeof state === "undefined" || !Array.isArray(state.vehicles)) return;

    const vehicle = currentVehicle();
    if (!vehicle) return;

    const kind = detectKind(vehicle);
    const source = photoSource(kind);

    const previous = card.querySelector(".vehicle-photo");
    if (previous) previous.remove();

    const label = labels[kind] || labels.abroll;
    const type = vehicle.type || "Vozidlo";
    const spz = vehicle.spz || "";

    card.insertAdjacentHTML(
      "afterbegin",
      `
        <figure class="vehicle-photo" data-vehicle-photo="${escapeHtml(kind)}">
          <img
            src="${source}"
            alt="Ilustracni foto vozidla ${escapeHtml(spz)}"
            loading="lazy"
            decoding="async"
          />
          <figcaption>
            <span class="vehicle-photo-title">
              <strong>${escapeHtml(spz)}</strong>
              <small>${escapeHtml(type)}</small>
            </span>
            <span class="vehicle-photo-pill">${escapeHtml(label)}</span>
          </figcaption>
        </figure>
      `
    );
  }

  if (typeof renderVehicles === "function") {
    const originalRenderVehicles = renderVehicles;
    renderVehicles = function () {
      originalRenderVehicles();
      enhanceVehiclePhoto();
    };
  }

  window.addEventListener("DOMContentLoaded", enhanceVehiclePhoto);
  window.addEventListener("load", enhanceVehiclePhoto);
}());
