(function () {
  const form = document.querySelector("#serviceForm");
  if (!form) return;

  const newTirePanel = document.querySelector("#serviceNewTirePanel");
  const createTires = document.querySelector("#createServiceTires");
  const photoInput = document.querySelector("#deliveryPhoto");
  const photoStatus = document.querySelector("#deliveryPhotoStatus");

  const money = (value) =>
    new Intl.NumberFormat("cs-CZ", {
      style: "currency",
      currency: "CZK",
      maximumFractionDigits: 0
    }).format(Number(value) || 0);

  function text(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function list(value) {
    return String(value || "")
      .split(/[;,]/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  function nextTireId(size, usedIds, counter) {
    const prefix = String(size || "PNE").slice(0, 3).replace(/\D/g, "") || "PNE";
    let number = counter.value;
    let id = "";
    do {
      id = `KS-${prefix}-${String(number).padStart(5, "0")}`;
      number += 1;
    } while (usedIds.has(id));
    counter.value = number;
    usedIds.add(id);
    return id;
  }

  function newTreadFor(type) {
    if (type === "protektor") return 14;
    if (type === "pouzita") return 8;
    return 16;
  }

  function createNewTires(data, positions, count) {
    if (!form.elements.createTires.checked) return { created: [], replaced: [] };
    const vehicle = state.vehicles.find((item) => item.spz === data.vehicle);
    const usedIds = new Set((state.tires || []).map((tire) => tire.id));
    const size = data.newTireSize || "315/80 R22,5";
    const unitPrice = Number(data.newTirePrice) || (count ? (Number(data.tireCost) || 0) / count : 0);
    const tireType = data.newTireType || "nova";
    const counter = { value: state.tires.length + 61 };
    const created = [];
    const replaced = [];

    for (let index = 0; index < count; index += 1) {
      const position = positions[index] || "";
      const currentTire = position
        ? state.tires.find((tire) => tire.vehicle === data.vehicle && tire.position === position)
        : null;
      if (currentTire) {
        replaced.push(currentTire.id);
        currentTire.state = "sklad";
        currentTire.vehicle = "";
        currentTire.position = "";
        currentTire.mounted = "";
      }
      const tire = {
        id: nextTireId(size, usedIds, counter),
        manufacturer: String(data.newTireManufacturer || "nezadan").trim(),
        model: String(data.newTireModel || "nezadan").trim(),
        size,
        index: "",
        dot: String(data.newTireDot || "").trim(),
        type: tireType,
        priceEx: Math.round(unitPrice),
        supplier: String(data.supplier || "").trim(),
        purchaseDate: data.date || todayIso(),
        invoice: String(data.invoice || "").trim(),
        state: position ? "na vozidle" : "sklad",
        vehicle: position ? data.vehicle : "",
        position,
        mounted: position ? data.date || todayIso() : "",
        mountedOdo: vehicle?.odometer || 0,
        currentTread: newTreadFor(tireType),
        pressure: 0,
        mileage: 0,
        defects: 0
      };
      state.tires.unshift(tire);
      created.push(tire);
    }

    return { created, replaced };
  }

  function enhancedRenderServices() {
    const target = document.querySelector("#serviceList");
    if (!target) return;
    target.innerHTML = state.services
      .slice()
      .sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")))
      .slice(0, 8)
      .map((service) => {
        const labor = Number(service.labor) || 0;
        const material = Number(service.material) || 0;
        const tireCost = Number(service.tireCost) || 0;
        const total = labor + material + tireCost;
        const ids = service.tireIds || [];
        const positions = service.tirePositions || [];
        const created = service.createdTires || [];
        const chips = [
          service.tireCount ? `${service.tireCount} ks pneu` : "",
          positions.length ? `pozice ${positions.join(", ")}` : "",
          ids.length ? `ID ${ids.join(", ")}` : "",
          service.replacedTires?.length ? `sundano ${service.replacedTires.join(", ")}` : "",
          created.length ? `nove ${created.join(", ")}` : "",
          service.invoice ? `DL/FV ${service.invoice}` : "",
          service.deliveryPhotoName ? `foto ${service.deliveryPhotoName}` : ""
        ].filter(Boolean);

        return `
          <div class="service-item">
            <div>
              <strong>${text(service.date)} / ${text(service.vehicle)} / ${text(service.type)}</strong>
              <p>${text(service.person)}, ${text(service.supplier)}. Prace ${money(labor)}, material ${money(material)}, pneu ${money(tireCost)}.</p>
              ${chips.length ? `<div class="service-tire-line">${chips.map((chip) => `<span class="service-tire-chip">${text(chip)}</span>`).join("")}</div>` : ""}
              <p>${text(service.note || "")}</p>
            </div>
            <span class="service-total">${money(total)}</span>
          </div>
        `;
      })
      .join("");
  }

  if (typeof renderServices === "function") {
    const originalRenderServices = renderServices;
    renderServices = function () {
      originalRenderServices();
      enhancedRenderServices();
    };
  }

  function syncNewTirePanel() {
    if (!newTirePanel || !createTires) return;
    newTirePanel.hidden = !createTires.checked;
    if (createTires.checked && form.elements.type.value === "kontrola") {
      form.elements.type.value = "prezuti";
    }
  }

  function applyDeliveryPhoto(file) {
    if (!file) return;
    photoStatus.textContent = file.name;
    const guessedDocument = file.name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim();
    if (!form.elements.invoice.value) form.elements.invoice.value = guessedDocument;
    if (!form.elements.note.value) {
      form.elements.note.value = `Foto DL: ${file.name}`;
    } else if (!form.elements.note.value.includes(file.name)) {
      form.elements.note.value += ` | Foto DL: ${file.name}`;
    }
    showToast("Fotka DL je pripojena ke karte a cislo dokladu je predvyplnene.");
  }

  function addEnhancedService(event) {
    event.preventDefault();
    event.stopImmediatePropagation();

    const data = Object.fromEntries(new FormData(form).entries());
    const tireIds = list(data.tireIds);
    const tirePositions = list(data.tirePositions);
    const requestedCount = Number(data.tireCount) || tirePositions.length || tireIds.length || 0;
    const createCount = form.elements.createTires.checked ? Math.max(requestedCount, 1) : requestedCount;
    const tireCreation = createNewTires(data, tirePositions, createCount);
    const createdTires = tireCreation.created;
    const allTireIds = [...tireIds, ...createdTires.map((tire) => tire.id)];
    const tireCount = Math.max(createCount, allTireIds.length, tirePositions.length);
    const photo = photoInput?.files?.[0];

    state.services.unshift({
      id: `S-${Date.now()}`,
      date: data.date,
      vehicle: data.vehicle,
      person: String(data.person || "").trim(),
      type: data.type,
      supplier: String(data.supplier || "").trim(),
      invoice: String(data.invoice || "").trim(),
      tireIds: allTireIds,
      tirePositions,
      tireCount,
      createdTires: createdTires.map((tire) => tire.id),
      replacedTires: tireCreation.replaced,
      deliveryPhotoName: photo?.name || "",
      labor: Number(data.labor) || 0,
      material: Number(data.material) || 0,
      tireCost: Number(data.tireCost) || 0,
      note: String(data.note || "").trim()
    });

    saveState();
    form.reset();
    form.elements.date.value = todayIso();
    if (photoStatus) photoStatus.textContent = "bez fotky";
    syncNewTirePanel();
    updateServiceTotal();
    renderAll();
    enhancedRenderServices();
    showToast(createdTires.length ? `Servisni karta ulozena a zalozeno ${createdTires.length} pneu.` : "Servisni karta je ulozena.");
  }

  function exportEnhancedCsv(event) {
    event.preventDefault();
    event.stopImmediatePropagation();
    const header = [
      "datum",
      "SPZ",
      "osoba",
      "typ",
      "dodavatel",
      "DL/faktura",
      "pocet pneu",
      "pozice",
      "ID pneu",
      "nove pneu",
      "sundane pneu",
      "foto DL",
      "prace",
      "material",
      "pneu",
      "celkem",
      "poznamka"
    ];
    const rows = state.services.map((item) => {
      const total = (Number(item.labor) || 0) + (Number(item.material) || 0) + (Number(item.tireCost) || 0);
      return [
        item.date,
        item.vehicle,
        item.person,
        item.type,
        item.supplier,
        item.invoice,
        item.tireCount || "",
        (item.tirePositions || []).join(", "),
        (item.tireIds || []).join(", "),
        (item.createdTires || []).join(", "),
        (item.replacedTires || []).join(", "),
        item.deliveryPhotoName || "",
        item.labor,
        item.material,
        item.tireCost,
        total,
        item.note
      ]
        .map((value) => `"${String(value ?? "").replace(/"/g, '""')}"`)
        .join(";");
    });
    const blob = new Blob([[header.join(";"), ...rows].join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `kaiser-servisni-karty-${todayIso()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  createTires?.addEventListener("change", syncNewTirePanel);
  form.elements.type?.addEventListener("change", () => {
    if (["prezuti", "vymena"].includes(form.elements.type.value) && createTires) {
      createTires.checked = true;
      syncNewTirePanel();
    }
  });
  document.querySelector("#openDeliveryPhoto")?.addEventListener("click", () => photoInput?.click());
  photoInput?.addEventListener("change", () => applyDeliveryPhoto(photoInput.files?.[0]));
  form.addEventListener("submit", addEnhancedService, true);
  document.querySelector("#exportCsv")?.addEventListener("click", exportEnhancedCsv, true);
  syncNewTirePanel();
  enhancedRenderServices();
})();
