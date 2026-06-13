import { useEffect, useRef } from "react";
import { loadLeaflet } from "../lib/loadLeaflet";
import { MAPBOX_TOKEN } from "../lib/mapbox";

const MILES_TO_METERS = 1609.34;

const CARTO_TILES = {
  url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
  subdomains: "abcd",
};

function basemapLayer(L) {
  if (MAPBOX_TOKEN) {
    return L.tileLayer(
      `https://api.mapbox.com/styles/v1/mapbox/dark-v11/tiles/256/{z}/{x}/{y}@2x?access_token=${MAPBOX_TOKEN}`,
      {
        attribution:
          '&copy; <a href="https://www.mapbox.com/about/maps/">Mapbox</a> &copy; OpenStreetMap',
        tileSize: 512,
        zoomOffset: -1,
        maxZoom: 18,
      }
    );
  }
  return L.tileLayer(CARTO_TILES.url, {
    attribution: CARTO_TILES.attribution,
    subdomains: CARTO_TILES.subdomains,
    maxZoom: 19,
  });
}

function storeIcon(L) {
  return L.divIcon({
    className: "trade-area-marker",
    html: `<div style="width:16px;height:16px;border-radius:50%;background:#4aa3ff;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.45);"></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });
}

export default function TradeAreaMap({
  lat,
  lng,
  radiusMiles = 10,
  interactive = false,
  bottomPadding = 28,
  className = "",
}) {
  const hostRef = useRef(null);

  useEffect(() => {
    if (!hostRef.current) return;

    let map = null;
    let ro = null;
    let cancelled = false;

    loadLeaflet()
      .then((L) => {
        if (cancelled || !hostRef.current) return;

        map = L.map(hostRef.current, {
          center: [lat, lng],
          zoom: 11,
          zoomControl: interactive,
          attributionControl: true,
          dragging: interactive,
          scrollWheelZoom: false,
          doubleClickZoom: interactive,
          boxZoom: false,
          keyboard: interactive,
          touchZoom: interactive,
        });

        basemapLayer(L).addTo(map);

        const outer = L.circle([lat, lng], {
          radius: radiusMiles * MILES_TO_METERS,
          color: "#4aa3ff",
          weight: 2,
          opacity: 0.75,
          fillColor: "#4aa3ff",
          fillOpacity: 0.16,
        }).addTo(map);

        L.circle([lat, lng], {
          radius: 5 * MILES_TO_METERS,
          color: "#4aa3ff",
          weight: 1.5,
          opacity: 0.45,
          fillColor: "#4aa3ff",
          fillOpacity: 0.08,
          dashArray: "5 7",
        }).addTo(map);

        L.marker([lat, lng], { icon: storeIcon(L), interactive: false }).addTo(map);

        map.fitBounds(outer.getBounds(), {
          paddingTopLeft: [32, 32],
          paddingBottomRight: [32, bottomPadding],
        });

        ro = new ResizeObserver(() => map.invalidateSize());
        ro.observe(hostRef.current);
      })
      .catch(() => {
        /* Map preview falls back to gradient overlay in parent */
      });

    return () => {
      cancelled = true;
      ro?.disconnect();
      map?.remove();
    };
  }, [lat, lng, radiusMiles, interactive, bottomPadding]);

  return (
    <div
      ref={hostRef}
      className={"h-full w-full " + className}
      aria-hidden={!interactive}
    />
  );
}
