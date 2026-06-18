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

  function loadCloudSync() {
    if (document.querySelector('script[src*="supabase-sync.js"]')) return;
    const script = document.createElement("script");
    script.src = "./supabase-sync.js?v=20260618-22";
    script.defer = true;
    document.head.appendChild(script);
  }

  loadCloudSync();
}());
