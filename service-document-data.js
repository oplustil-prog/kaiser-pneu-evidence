window.kaiserServiceDocumentData = {
  invoices: {
    "VF-26061801": {
      invoicePdfFileName: "VF-26061801.pdf",
      invoicePdfChunks: [
        "./assets/invoices/vf-26061801-01.txt",
        "./assets/invoices/vf-26061801-02.txt",
        "./assets/invoices/vf-26061801-03.txt",
        "./assets/invoices/vf-26061801-04.txt",
        "./assets/invoices/vf-26061801-05.txt",
        "./assets/invoices/vf-26061801-06.txt",
        "./assets/invoices/vf-26061801-07.txt",
        "./assets/invoices/vf-26061801-08.txt",
        "./assets/invoices/vf-26061801-09.txt",
        "./assets/invoices/vf-26061801-10.txt",
        "./assets/invoices/vf-26061801-11.txt",
        "./assets/invoices/vf-26061801-12.txt",
        "./assets/invoices/vf-26061801-13.txt",
        "./assets/invoices/vf-26061801-14.txt"
      ],
      invoicePdfData: "",
      digitooUrl: "https://app.digitoo.ai/o4851/q30031/invoice/a4e65e1e-72bb-4332-9794-878022809ea6",
      jobSheetFileName: "",
      jobSheetPdfData: ""
    }
  }
};

(async function loadServiceDocumentChunks() {
  const invoices = window.kaiserServiceDocumentData?.invoices || {};
  const entries = Object.values(invoices).filter((item) => item.invoicePdfChunks?.length);

  await Promise.all(entries.map(async (item) => {
    try {
      const chunks = await Promise.all(
        item.invoicePdfChunks.map(async (path) => {
          const response = await fetch(path, { cache: "force-cache" });
          if (!response.ok) throw new Error(`Nepodarilo se nacist ${path}`);
          return response.text();
        })
      );
      item.invoicePdfData = `data:application/pdf;base64,${chunks.join("")}`;
    } catch (error) {
      item.invoicePdfError = error?.message || "PDF fakturu se nepodarilo nacist.";
    }
  }));

  window.dispatchEvent(new CustomEvent("kaiserServiceDocumentsReady"));
}());
