let loadPromise = null;

/** Load Leaflet from the app bundle — reliable on Render without CDN. */
export function loadLeaflet() {
  if (typeof window !== "undefined" && window.L) {
    return Promise.resolve(window.L);
  }
  if (loadPromise) return loadPromise;

  loadPromise = import("leaflet")
    .then(async (mod) => {
      await import("leaflet/dist/leaflet.css");
      const L = mod.default;
      window.L = L;
      return L;
    })
    .catch((err) => {
      loadPromise = null;
      throw err;
    });

  return loadPromise;
}
