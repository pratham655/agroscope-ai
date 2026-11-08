"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Maximize2, MapPin, RefreshCw } from "lucide-react";
import type { Map as LeafletMap, GeoJSON as LeafletGeoJSON, TileLayer as LeafletTileLayer, Marker as LeafletMarker } from "leaflet";

interface FieldBoundaryMapProps {
  coordinates: number[][];
  centroid?: { latitude: number; longitude: number };
  fieldName?: string;
}

type LayerMode = "modis_truecolor" | "modis_bands721" | "osm";

const OSM_URL = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

function getLayerUrl(mode: LayerMode) {
  if (mode === "osm") return null;
  const layer = mode === "modis_bands721"
    ? "MODIS_Terra_CorrectedReflectance_Bands721"
    : "MODIS_Terra_CorrectedReflectance_TrueColor";
  return `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/${layer}/default/default/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg`;
}

function validRing(points: number[][]) {
  return points.length >= 4 && points.every(
    (point) => Array.isArray(point) && point.length >= 2 &&
      Number.isFinite(point[0]) && Number.isFinite(point[1]) &&
      point[0] >= -180 && point[0] <= 180 && point[1] >= -90 && point[1] <= 90
  );
}

export default function FieldBoundaryMap({
  coordinates,
  centroid,
  fieldName = "Field Parcel",
}: FieldBoundaryMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const polygonRef = useRef<LeafletGeoJSON | null>(null);
  const baseRef = useRef<LeafletTileLayer | null>(null);
  const imageryRef = useRef<LeafletTileLayer | null>(null);
  const markerRef = useRef<LeafletMarker | null>(null);
  const [activeLayer, setActiveLayer] = useState<LayerMode>("modis_bands721");
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [imageryError, setImageryError] = useState(false);

  // Create the Leaflet map once. Keep a full-opacity OSM base underneath NASA
  // imagery so the viewport remains useful when a satellite tile is unavailable.
  useEffect(() => {
    let cancelled = false;
    let resizeObserver: ResizeObserver | undefined;
    let resizeTimer: ReturnType<typeof setTimeout> | undefined;
    const node = containerRef.current;
    if (!node) return;

    void import("leaflet").then((L) => {
      if (cancelled || !containerRef.current) return;

      const map = L.map(containerRef.current, {
        center: [20, 0],
        zoom: 2,
        minZoom: 2,
        maxZoom: 18,
        zoomControl: false,
        preferCanvas: true,
      });
      mapRef.current = map;
      L.control.zoom({ position: "topright" }).addTo(map);

      const base = L.tileLayer(OSM_URL, {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        subdomains: ["a", "b", "c"],
        maxZoom: 19,
        opacity: 1,
      }).addTo(map);
      baseRef.current = base;
      base.on("tileerror", () => setMapError("The base map tiles could not be loaded. Check your connection or try again."));

      setMapReady(true);
      requestAnimationFrame(() => map.invalidateSize());
      resizeObserver = new ResizeObserver(() => map.invalidateSize());
      resizeObserver.observe(node);
      window.addEventListener("resize", onResize);
      function onResize() { map.invalidateSize(); }
      resizeTimer = setTimeout(() => map.invalidateSize(), 300);
    }).catch((error: unknown) => {
      if (!cancelled) {
        setMapError(error instanceof Error ? error.message : "The interactive map could not be initialized.");
      }
    });

    return () => {
      cancelled = true;
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeObserver?.disconnect();
      window.removeEventListener("resize", () => undefined);
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      polygonRef.current = null;
      imageryRef.current = null;
      markerRef.current = null;
    };
  }, []);

  // Draw/update the polygon independently of map creation and layer changes.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    void import("leaflet").then((L) => {
      if (!mapRef.current) return;
      if (polygonRef.current) map.removeLayer(polygonRef.current);
      if (markerRef.current) map.removeLayer(markerRef.current);
      polygonRef.current = null;
      markerRef.current = null;

      if (!validRing(coordinates)) {
        setMapError("The GeoJSON polygon is invalid. Provide at least four valid [longitude, latitude] coordinate pairs.");
        return;
      }
      setMapError(null);
      const closedRing = coordinates[0][0] === coordinates[coordinates.length - 1][0] &&
        coordinates[0][1] === coordinates[coordinates.length - 1][1]
        ? coordinates
        : [...coordinates, coordinates[0]];
      const feature: GeoJSON.Feature<GeoJSON.Polygon> = {
        type: "Feature",
        properties: { name: fieldName },
        geometry: { type: "Polygon", coordinates: [closedRing] },
      };
      const polygon = L.geoJSON(feature, {
        style: { color: "#047857", weight: 3, opacity: 1, fillColor: "#34d399", fillOpacity: 0.28 },
      }).addTo(map);
      polygonRef.current = polygon;
      const bounds = polygon.getBounds();
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [48, 48], maxZoom: 16 });
      }
      if (centroid && Number.isFinite(centroid.latitude) && Number.isFinite(centroid.longitude)) {
        const marker = L.marker([centroid.latitude, centroid.longitude]).addTo(map);
        const popup = document.createElement("div");
        popup.textContent = `${fieldName} centroid · ${centroid.latitude.toFixed(4)}, ${centroid.longitude.toFixed(4)}`;
        marker.bindPopup(popup);
        markerRef.current = marker;
      }
      requestAnimationFrame(() => map.invalidateSize());
    }).catch(() => setMapError("The parcel boundary could not be drawn."));
  }, [coordinates, centroid, fieldName, mapReady]);

  // Swap only the satellite overlay. The OSM base layer stays visible underneath.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    void import("leaflet").then((L) => {
      if (imageryRef.current) {
        map.removeLayer(imageryRef.current);
        imageryRef.current = null;
      }
      setImageryError(false);
      const url = getLayerUrl(activeLayer);
      if (!url) return;
      const imagery = L.tileLayer(url, {
        attribution: "NASA GIBS / Terra",
        maxZoom: 18,
        maxNativeZoom: 9,
        opacity: 0.72,
        updateWhenIdle: true,
      });
      imagery.on("tileerror", () => setImageryError(true));
      imagery.addTo(map);
      imageryRef.current = imagery;
    }).catch(() => setImageryError(true));
  }, [activeLayer, mapReady]);

  const zoomToFit = () => {
    const map = mapRef.current;
    const bounds = polygonRef.current?.getBounds();
    if (map && bounds?.isValid()) map.fitBounds(bounds, { padding: [48, 48], maxZoom: 16 });
  };

  const retryMap = () => {
    setMapError(null);
    if (mapRef.current) mapRef.current.invalidateSize();
  };

  return (
    <section className="relative isolate overflow-hidden rounded-2xl border border-slate-300 bg-slate-100 shadow-lg">
      <div className="absolute left-3 right-3 top-3 z-[1000] flex flex-wrap items-start justify-between gap-2 pointer-events-none">
        <div className="pointer-events-auto flex items-center gap-2 rounded-xl border border-slate-700/70 bg-slate-950/90 px-3 py-2 text-xs text-white shadow-lg backdrop-blur">
          <MapPin className="h-4 w-4 text-emerald-400" />
          <span className="max-w-[220px] truncate font-semibold">{fieldName}</span>
          <span className="text-[10px] text-slate-300">{coordinates.length} vertices</span>
        </div>
        <div className="pointer-events-auto flex flex-wrap items-center gap-1 rounded-xl border border-slate-700/70 bg-slate-950/90 p-1 shadow-lg backdrop-blur">
          {([
            ["modis_bands721", "Agro bands"],
            ["modis_truecolor", "True colour"],
            ["osm", "Street map"],
          ] as const).map(([mode, label]) => (
            <button key={mode} type="button" onClick={() => setActiveLayer(mode)}
              aria-pressed={activeLayer === mode}
              className={`rounded-lg px-3 py-2 text-[11px] font-semibold transition ${activeLayer === mode ? "bg-emerald-600 text-white" : "text-slate-200 hover:bg-white/10"}`}>
              {label}
            </button>
          ))}
          <button type="button" onClick={zoomToFit} title="Zoom to parcel" aria-label="Zoom to parcel"
            className="rounded-lg p-2 text-white hover:bg-white/10">
            <Maximize2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div ref={containerRef} className="relative z-0 h-[460px] min-h-[360px] w-full bg-slate-200 sm:h-[520px]" />

      {!mapReady && !mapError && (
        <div className="absolute inset-0 z-[500] flex items-center justify-center bg-slate-100/95 text-sm font-medium text-slate-700">
          Initialising interactive parcel map…
        </div>
      )}
      {mapError && (
        <div role="alert" className="absolute bottom-3 left-3 right-3 z-[1000] flex items-center justify-between gap-3 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-950 shadow-lg">
          <span className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 shrink-0" />{mapError}</span>
          <button type="button" onClick={retryMap} className="inline-flex shrink-0 items-center gap-1 font-semibold"><RefreshCw className="h-3.5 w-3.5" />Retry</button>
        </div>
      )}
      {imageryError && (
        <div className="absolute bottom-3 right-3 z-[900] rounded-lg border border-amber-300 bg-amber-50/95 px-3 py-2 text-[11px] font-medium text-amber-900 shadow">
          NASA imagery unavailable for this view; street basemap remains active.
        </div>
      )}
      <div className="pointer-events-none absolute bottom-2 left-3 z-[800] rounded-md bg-slate-950/80 px-2 py-1 text-[10px] text-white">
        NASA GIBS imagery · OpenStreetMap basemap · WGS-84
      </div>
    </section>
  );
}
