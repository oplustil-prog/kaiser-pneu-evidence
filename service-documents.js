(function () {
  const documentData = window.kaiserServiceDocumentData || { invoices: {} };

  const money = (value) =>
    new Intl.NumberFormat("cs-CZ", {
      style: "currency",
      currency: "CZK",
      maximumFractionDigits: 0
    }).format(Number(value) || 0);

  function text(value) {
    if (typeof escapeHtml === "function") return escapeHtml(value);
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function normalizeInvoice(value) {
    const raw = String(value || "").trim().toUpperCase();
    if (!raw) return "";
    if (raw.startsWith("VF-")) return raw;
    const digits = raw.replace(/\D/g, "");
    return digits ? `VF-${digits}` : raw;
  }

  function documentFor(service) {
    const invoice = normalizeInvoice(service.invoice);
    return documentData.invoices?.[invoice] || null;
  }

  function serviceChips(service) {
    const ids = service.tireIds || [];
    const positions = service.tirePositions || [];
    const created = service.createdTires || [];
    return [
      service.tireCount ? `${service.tireCount} ks pneu` : "",
      positions.length ? `pozice ${positions.join(", ")}` : "",
      ids.length ? `ID ${ids.join(", ")}` : "",
      service.replacedTires?.length ? `sundano ${service.replacedTires.join(", ")}` : "",
      created.length ? `nove ${created.join(", ")}` : "",
      service.invoice ? `DL/FV ${service.invoice}` : "",
      service.deliveryPhotoName ? `foto ${service.deliveryPhotoName}` : ""
    ].filter(Boolean);
  }

  function renderDocumentActions(service) {
    const docs = documentFor(service);
    if (!service.invoice && !docs) return "";

    const invoiceKey = normalizeInvoice(service.invoice);
    const invoicePdf = docs?.invoicePdfData
      ? `<button class="service-doc-link" type="button" data-open-service-doc="${text(invoiceKey)}" data-doc-kind="invoice">Faktura PDF</button>`
      : docs?.digitooUrl
        ? `<a class="service-doc-link" href="${text(docs.digitooUrl)}" target="_blank" rel="noopener">Faktura PDF</a>`
        : docs?.invoicePdfChunks?.length && !docs?.invoicePdfError
          ? `<span class="service-doc-missing">Faktura se nacita</span>`
          : `<span class="service-doc-missing">Faktura PDF chybi</span>`;
    const digitoo = docs?.digitooUrl && docs?.invoicePdfData
      ? `<a class="service-doc-link" href="${text(docs.digitooUrl)}" target="_blank" rel="noopener">Digitoo</a>`
      : "";
    const jobSheet = docs?.jobSheetPdfData
      ? `<button class="service-doc-link" type="button" data-open-service-doc="${text(invoiceKey)}" data-doc-kind="jobSheet">Zakazkovy list</button>`
      : `<span class="service-doc-missing">Zakazkovy list nedodan</span>`;

    return `
      <div class="service-documents" aria-label="Doklady k servisnimu zasahu">
        ${invoicePdf}
        ${jobSheet}
        ${digitoo}
      </div>
    `;
  }

  function renderServicesWithDocuments() {
    const target = document.querySelector("#serviceList");
    if (!target || typeof state === "undefined") return;

    target.innerHTML = state.services
      .slice()
      .sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")))
      .slice(0, 8)
      .map((service) => {
        const labor = Number(service.labor) || 0;
        const material = Number(service.material) || 0;
        const tireCost = Number(service.tireCost) || 0;
        const total = labor + material + tireCost;
        const chips = serviceChips(service);

        return `
          <div class="service-item">
            <div>
              <strong>${text(service.date)} / ${text(service.vehicle)} / ${text(service.type)}</strong>
              <p>${text(service.person)}, ${text(service.supplier)}. Prace ${money(labor)}, material ${money(material)}, pneu ${money(tireCost)}.</p>
              ${chips.length ? `<div class="service-tire-line">${chips.map((chip) => `<span class="service-tire-chip">${text(chip)}</span>`).join("")}</div>` : ""}
              <p>${text(service.note || "")}</p>
              ${renderDocumentActions(service)}
            </div>
            <span class="service-total">${money(total)}</span>
          </div>
        `;
      })
      .join("");
  }

  function base64ToBlob(dataUrl) {
    const [, metadata = "", payload = ""] = String(dataUrl || "").match(/^data:([^,]+),(.*)$/) || [];
    const mime = metadata.split(";")[0] || "application/pdf";
    const isBase64 = metadata.includes(";base64");
    const binary = isBase64 ? atob(payload) : decodeURIComponent(payload);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }
    return new Blob([bytes], { type: mime });
  }

  function openDocument(invoiceKey, kind) {
    const docs = documentData.invoices?.[normalizeInvoice(invoiceKey)];
    const dataUrl = kind === "jobSheet" ? docs?.jobSheetPdfData : docs?.invoicePdfData;
    const fileName = kind === "jobSheet" ? docs?.jobSheetFileName : docs?.invoicePdfFileName;
    if (!dataUrl) {
      if (typeof showToast === "function") showToast("Doklad zatim neni pripojeny.");
      return;
    }

    const blobUrl = URL.createObjectURL(base64ToBlob(dataUrl));
    const opened = window.open(blobUrl, "_blank", "noopener");
    if (!opened) {
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = fileName || `${invoiceKey}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
    }
    window.setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
  }

  function injectDocumentStyles() {
    if (document.querySelector("#serviceDocumentStyles")) return;
    const style = document.createElement("style");
    style.id = "serviceDocumentStyles";
    style.textContent = `
      .service-documents {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin-top: 10px;
      }

      .service-doc-link,
      .service-doc-missing {
        min-height: 30px;
        border-radius: 8px;
        padding: 6px 10px;
        font-size: 0.78rem;
        font-weight: 900;
      }

      .service-doc-link {
        border: 1px solid rgba(117, 189, 37, 0.45);
        background: rgba(117, 189, 37, 0.14);
        color: var(--green-dark);
        text-decoration: none;
      }

      .service-doc-link:hover {
        border-color: var(--brand);
        background: var(--brand-soft);
      }

      .service-doc-missing {
        display: inline-flex;
        align-items: center;
        border: 1px solid var(--line);
        background: #f2f4f1;
        color: var(--muted);
      }
    `;
    document.head.appendChild(style);
  }

  injectDocumentStyles();

  if (typeof renderServices === "function") {
    const originalRenderServices = renderServices;
    renderServices = function () {
      originalRenderServices();
      renderServicesWithDocuments();
    };
  }

  document.addEventListener("click", (event) => {
    const trigger = event.target.closest("[data-open-service-doc]");
    if (!trigger) return;
    openDocument(trigger.dataset.openServiceDoc, trigger.dataset.docKind);
  });

  window.addEventListener("DOMContentLoaded", renderServicesWithDocuments);
  window.addEventListener("load", renderServicesWithDocuments);
  window.addEventListener("kaiserServiceDocumentsReady", renderServicesWithDocuments);
  window.setTimeout(renderServicesWithDocuments, 0);
}());
