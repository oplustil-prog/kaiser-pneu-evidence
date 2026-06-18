(function () {
  function removeVehiclePhotos() {
    document.querySelectorAll(".vehicle-photo").forEach((item) => item.remove());
  }

  removeVehiclePhotos();
  window.addEventListener("DOMContentLoaded", removeVehiclePhotos);
  window.addEventListener("load", removeVehiclePhotos);
  window.setTimeout(removeVehiclePhotos, 0);

  if (typeof renderVehicles === "function") {
    const originalRenderVehicles = renderVehicles;

    renderVehicles = function () {
      const result = originalRenderVehicles.apply(this, arguments);
      removeVehiclePhotos();
      return result;
    };
  }

  function loadScript(src) {
    const fileName = src.split("?")[0];
    if (document.querySelector(`script[src*="${fileName}"]`)) return;
    const script = document.createElement("script");
    script.src = src;
    script.defer = true;
    document.head.appendChild(script);
  }

  loadScript("./measurement-reminders.js?v=20260618-23");
  loadScript("./supabase-sync.js?v=20260618-22");
}());
