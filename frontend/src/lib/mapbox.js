/** Default La Bodega store — Calhoun GA (matches config.json). */
export const DEFAULT_STORE = {
  zip: "30701",
  city: "Calhoun",
  state: "GA",
  lng: -84.951,
  lat: 34.5037,
  radiusMiles: 10,
};

/** Optional: set VITE_MAPBOX_TOKEN to use Mapbox tiles instead of CARTO/OSM. */
export const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN?.trim() || "";
