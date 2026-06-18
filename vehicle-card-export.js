(function () {
  const PDF_WIDTH = 595.28;
  const PDF_HEIGHT = 841.89;

  function normalizeText(value) {
    return String(value ?? "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^\x20-\x7E]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function escapePdf(value) {
    return normalizeText(value)
      .replace(/\\/g, "\\\\")
      .replace(/\(/g, "\\(")
      .replace(/\)/g, "\\)");
  }

  function formatNumberValue(value, decimals = 0) {
    const number = Number(value) || 0;
    return new Intl.NumberFormat("cs-CZ", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    }).format(number);
  }

  function formatCurrencyValue(value) {
    return `${formatNumberValue(value, 0)} Kc`;
  }

  function serviceTotal(service) {
    return (Number(service.labor) || 0) + (Number(service.material) || 0) + (Number(service.tireCost) || 0);
  }

  function currentVehicle() {
    const select = document.querySelector("#vehicleSelect");
    const spz = select ? select.value : "";
    return state.vehicles.find((vehicle) => vehicle.spz === spz) || state.vehicles[0];
  }

  function sortByVehicleConfiguration(vehicle, tires) {
    const order = new Map((vehicle.configuration || []).map((position, index) => [position, index]));
    return [...tires].sort((a, b) => {
      const aOrder = order.has(a.position) ? order.get(a.position) : 999;
      const bOrder = order.has(b.position) ? order.get(b.position) : 999;
      return aOrder - bOrder || String(a.position || "").localeCompare(String(b.position || ""), "cs");
    });
  }

  function wrapText(value, maxChars) {
    const words = normalizeText(value).split(" ").filter(Boolean);
    const lines = [];
    let line = "";

    words.forEach((word) => {
      const next = line ? `${line} ${word}` : word;
      if (next.length > maxChars && line) {
        lines.push(line);
        line = word;
      } else {
        line = next;
      }
    });

    if (line) lines.push(line);
    return lines.length ? lines : [""];
  }

  function buildPdf(pages) {
    const objects = [];
    const addObject = (body) => {
      objects.push(body);
      return objects.length;
    };

    const regularFont = addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
    const boldFont = addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>");
    const pageRefs = [];

    pages.forEach((ops) => {
      const stream = ops.join("\n");
      const contentRef = addObject(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
      const pageRef = addObject(
        `<< /Type /Page /Parent 0 0 R /MediaBox [0 0 ${PDF_WIDTH} ${PDF_HEIGHT}] /Resources << /Font << /F1 ${regularFont} 0 R /F2 ${boldFont} 0 R >> >> /Contents ${contentRef} 0 R >>`
      );
      pageRefs.push(pageRef);
    });

    const pagesRef = addObject(`<< /Type /Pages /Kids [${pageRefs.map((ref) => `${ref} 0 R`).join(" ")}] /Count ${pageRefs.length} >>`);
    const catalogRef = addObject(`<< /Type /Catalog /Pages ${pagesRef} 0 R >>`);

    pageRefs.forEach((pageRef) => {
      objects[pageRef - 1] = objects[pageRef - 1].replace("/Parent 0 0 R", `/Parent ${pagesRef} 0 R`);
    });

    let pdf = "%PDF-1.4\n";
    const offsets = [0];

    objects.forEach((body, index) => {
      offsets.push(pdf.length);
      pdf += `${index + 1} 0 obj\n${body}\nendobj\n`;
    });

    const xrefOffset = pdf.length;
    pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
    offsets.slice(1).forEach((offset) => {
      pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
    });
    pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogRef} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
    return pdf;
  }

  function createPdfCanvas() {
    const ops = [];
    const topY = (y) => PDF_HEIGHT - y;

    function fillColor(color) {
      ops.push(`${color.map((part) => (part / 255).toFixed(3)).join(" ")} rg`);
    }

    function strokeColor(color) {
      ops.push(`${color.map((part) => (part / 255).toFixed(3)).join(" ")} RG`);
    }

    function text(x, y, size, value, options = {}) {
      const font = options.bold ? "F2" : "F1";
      const color = options.color || [25, 36, 39];
      fillColor(color);
      ops.push(`BT /${font} ${size} Tf ${x} ${topY(y)} Td (${escapePdf(value)}) Tj ET`);
    }

    function line(x1, y1, x2, y2, color = [211, 219, 216], width = 1) {
      strokeColor(color);
      ops.push(`${width} w ${x1} ${topY(y1)} m ${x2} ${topY(y2)} l S`);
    }

    function rect(x, y, width, height, color) {
      fillColor(color);
      ops.push(`${x} ${topY(y + height)} ${width} ${height} re f`);
    }

    return { ops, text, line, rect };
  }

  function addKeyValue(canvas, x, y, label, value) {
    canvas.text(x, y, 8.5, label, { color: [99, 113, 117], bold: true });
    canvas.text(x, y + 14, 13, value || "-", { bold: true });
  }

  function buildVehiclePdf(vehicle) {
    const canvas = createPdfCanvas();
    const settings = state.settings || {};
    const tires = sortByVehicleConfiguration(
      vehicle,
      state.tires.filter((tire) => tire.vehicle === vehicle.spz)
    );
    const services = state.services
      .filter((service) => service.vehicle === vehicle.spz)
      .sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));
    const serviceCost = services.reduce((sum, service) => sum + serviceTotal(service), 0);
    const avgTread = tires.reduce((sum, tire) => sum + (Number(tire.currentTread) || 0), 0) / Math.max(tires.length, 1);
    const latestService = services[0]?.date || "bez zaznamu";
    const lowTreadCount = tires.filter((tire) => Number(tire.currentTread) < (Number(settings.treadWarning) || 4.5)).length;
    const lowPressureCount = tires.filter((tire) => Number(tire.pressure) > 0 && Number(tire.pressure) < (Number(settings.pressureMin) || 8.2)).length;

    canvas.rect(0, 0, PDF_WIDTH, 74, [117, 189, 37]);
    canvas.text(38, 35, 20, "KAISER SERVIS", { color: [255, 255, 255], bold: true });
    canvas.text(38, 56, 10, "Karta vozidla - evidence pneumatik", { color: [255, 255, 255] });
    canvas.text(436, 35, 18, vehicle.spz || "-", { color: [255, 255, 255], bold: true });
    canvas.text(436, 56, 8.5, `Export ${new Date().toLocaleDateString("cs-CZ")}`, { color: [255, 255, 255] });

    canvas.text(38, 104, 20, vehicle.spz || "-", { bold: true });
    canvas.text(38, 126, 11, vehicle.type || "-");
    canvas.text(38, 144, 10, `Ridic: ${vehicle.driver || "-"}   |   Stredisko: ${vehicle.depot || "-"}`);

    addKeyValue(canvas, 38, 184, "Tachometr", `${formatNumberValue(vehicle.odometer)} km`);
    addKeyValue(canvas, 180, 184, "Osazene pozice", `${tires.length}/${vehicle.configuration?.length || 0}`);
    addKeyValue(canvas, 322, 184, "Prumerny dezen", `${formatNumberValue(avgTread, 1)} mm`);
    addKeyValue(canvas, 448, 184, "Naklady servis", formatCurrencyValue(serviceCost));

    canvas.line(38, 240, 557, 240, [211, 219, 216], 1);
    canvas.text(38, 267, 12, "Doporuceni", { bold: true });
    const recommendation =
      lowTreadCount > 0
        ? `${lowTreadCount} pozic je pod limitem dezenu. Naplanovat kontrolu / vymenu.`
        : lowPressureCount > 0
          ? `${lowPressureCount} pozic ma tlak pod limitem. Zkontrolovat a dofouknout.`
          : "Pokračovat v pravidelne kontrole tlaku, dezenu a servisnich zaznamu.";
    wrapText(recommendation, 88).forEach((line, index) => canvas.text(38, 286 + index * 13, 9.5, line));
    canvas.text(38, 322, 9.5, `Posledni servis: ${latestService}`);

    let y = 360;
    canvas.text(38, y, 12, "Aktualni osazeni pneu", { bold: true });
    y += 18;
    canvas.rect(38, y, 519, 20, [236, 243, 238]);
    canvas.text(44, y + 14, 8.5, "Pozice", { bold: true });
    canvas.text(132, y + 14, 8.5, "ID pneu", { bold: true });
    canvas.text(238, y + 14, 8.5, "Rozmer / typ", { bold: true });
    canvas.text(412, y + 14, 8.5, "Dezen", { bold: true });
    canvas.text(476, y + 14, 8.5, "Tlak", { bold: true });
    y += 24;

    const tireRows = tires.length ? tires : (vehicle.configuration || []).map((position) => ({ position }));
    tireRows.slice(0, 14).forEach((tire) => {
      canvas.line(38, y - 5, 557, y - 5);
      canvas.text(44, y + 8, 8.2, tire.position || "-");
      canvas.text(132, y + 8, 8.2, tire.id || "-");
      canvas.text(238, y + 8, 8.2, [tire.size, tire.manufacturer].filter(Boolean).join(" / ") || "-");
      canvas.text(412, y + 8, 8.2, tire.currentTread ? `${formatNumberValue(tire.currentTread, 1)} mm` : "-");
      canvas.text(476, y + 8, 8.2, tire.pressure ? `${formatNumberValue(tire.pressure, 1)} bar` : "-");
      y += 18;
    });

    if (tireRows.length > 14) {
      canvas.text(44, y + 8, 8.2, `+ dalsich ${tireRows.length - 14} pozic v aplikaci`);
      y += 18;
    }

    y += 22;
    canvas.text(38, y, 12, "Servisni historie", { bold: true });
    y += 18;
    canvas.rect(38, y, 519, 20, [236, 243, 238]);
    canvas.text(44, y + 14, 8.5, "Datum", { bold: true });
    canvas.text(112, y + 14, 8.5, "Typ", { bold: true });
    canvas.text(184, y + 14, 8.5, "Doklad / dodavatel", { bold: true });
    canvas.text(440, y + 14, 8.5, "Cena", { bold: true });
    y += 24;

    services.slice(0, 8).forEach((service) => {
      const supplier = [service.invoice, service.supplier].filter(Boolean).join(" / ");
      canvas.line(38, y - 5, 557, y - 5);
      canvas.text(44, y + 8, 8.2, service.date || "-");
      canvas.text(112, y + 8, 8.2, service.type || "-");
      canvas.text(184, y + 8, 8.2, supplier || "-");
      canvas.text(440, y + 8, 8.2, formatCurrencyValue(serviceTotal(service)));
      y += 18;
    });

    if (!services.length) {
      canvas.line(38, y - 5, 557, y - 5);
      canvas.text(44, y + 8, 8.2, "Bez servisnich zaznamu pro toto vozidlo.");
      y += 18;
    } else if (services.length > 8) {
      canvas.text(44, y + 8, 8.2, `Zobrazeno poslednich 8 z celkem ${services.length} zaznamu.`);
    }

    canvas.text(38, 812, 8, "Vystaveno z aplikace Kaiser Evidence pneumatik. Hodnoty vychazeji z aktualnich dat v prohlizeci.", {
      color: [99, 113, 117]
    });

    return buildPdf([canvas.ops]);
  }

  function downloadVehicleCard() {
    const vehicle = currentVehicle();
    if (!vehicle) return;

    const pdf = buildVehiclePdf(vehicle);
    const blob = new Blob([pdf], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `karta-vozidla-${normalizeText(vehicle.spz).replace(/\s+/g, "-")}.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1500);

    if (typeof showToast === "function") {
      showToast(`PDF karta vozidla ${vehicle.spz} je pripravena.`);
    }
  }

  function enhanceVehicleCardExport() {
    const card = document.querySelector("#vehicleDetail");
    if (!card || typeof state === "undefined" || !Array.isArray(state.vehicles)) return;
    if (card.querySelector("[data-export-vehicle-card]")) return;

    const infoBlock = [...card.children].find((child) => child.matches("div") && child.querySelector("h2"));
    if (!infoBlock) return;

    infoBlock.insertAdjacentHTML(
      "beforeend",
      `
        <div class="vehicle-card-actions">
          <button class="button button-primary" type="button" data-export-vehicle-card>
            Karta vozidla PDF
          </button>
        </div>
      `
    );
  }

  if (typeof renderVehicles === "function") {
    const originalRenderVehicles = renderVehicles;
    renderVehicles = function () {
      originalRenderVehicles();
      enhanceVehicleCardExport();
    };
  }

  document.addEventListener("click", (event) => {
    const button = event.target.closest("[data-export-vehicle-card]");
    if (!button) return;
    downloadVehicleCard();
  });

  window.addEventListener("DOMContentLoaded", enhanceVehicleCardExport);
  window.addEventListener("load", enhanceVehicleCardExport);
}());
