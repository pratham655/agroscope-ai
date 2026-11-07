"use client";

import { useEffect, useRef, useState } from "react";
import { Layers, Crosshair, MapPin, Copy, Check } from "lucide-react";
import type { Map as LeafletMap, Marker as LeafletMarker, TileLayer as LeafletTileLayer, LeafletMouseEvent } from "leaflet";

export interface ExplorerMapProps {
  initialLat?: number;
  initialLon?: number;
  selectedDate: string;
  onSelectCoords: (lat: number, lon: number) => void;
}

export type GibsLayerKey =
  | "modis_terra_truecolor"
  | "modis_bands721"
  | "modis_ndvi"
  | "modis_lst"
  | "modis_aqua_truecolor"
  | "viirs_truecolor"
  | "imerg_precip"
  | "osm_topo";

export interface LayerMetadata {
  key: GibsLayerKey;
  name: string;
  sensor: string;
  resolution: string;
  format: "jpg" | "png";
  level: string;
  layerId?: string;
  maxNativeZoom: number;
  description: string;
  paletteType: "rgb" | "agriculture" | "radar" | "vector" | "ndvi" | "lst";
}

export const SATELLITE_LAYERS: LayerMetadata[] = [
  {
    key: "modis_terra_truecolor",
    name: "NASA MODIS Terra True Color",
    sensor: "Terra Satellite (EOS AM-1)",
    resolution: "250m / daily",
    format: "jpg",
    level: "GoogleMapsCompatible_Level9",
    layerId: "MODIS_Terra_CorrectedReflectance_TrueColor",
    maxNativeZoom: 9,
    description: "Natural photorealistic view of planetary land surfaces, vegetative cover, and cloud patterns.",
    paletteType: "rgb",
  },
  {
    key: "modis_bands721",
    name: "NASA MODIS Agricultural (Bands 7-2-1)",
    sensor: "Terra Shortwave / Near-IR",
    resolution: "250m / daily",
    format: "jpg",
    level: "GoogleMapsCompatible_Level9",
    layerId: "MODIS_Terra_CorrectedReflectance_Bands721",
    maxNativeZoom: 9,
    description: "Specially calibrated for agriculture: active healthy vegetation appears in vibrant green, bare soil in tan/brown, and standing water in dark black/blue.",
    paletteType: "agriculture",
  },
  {
    key: "modis_ndvi",
    name: "NASA MODIS NDVI (Vegetation)",
    sensor: "Terra / MODIS (MOD13Q1)",
    resolution: "250m / 8-day rolling",
    format: "png",
    level: "GoogleMapsCompatible_Level9",
    layerId: "MODIS_Terra_NDVI_8Day",
    maxNativeZoom: 9,
    description: "Normalized Difference Vegetation Index representing photosynthetic canopy chlorophyll and vegetative biomass.",
    paletteType: "ndvi",
  },
  {
    key: "modis_lst",
    name: "NASA Land Surface Temp (LST)",
    sensor: "Terra / MODIS (MOD11A1)",
    resolution: "1km / daytime daily",
    format: "png",
    level: "GoogleMapsCompatible_Level7",
    layerId: "MODIS_Terra_Land_Surface_Temp_Day",
    maxNativeZoom: 7,
    description: "Radiometric land surface skin temperature calibrated during Terra morning equatorial transit.",
    paletteType: "lst",
  },
  {
    key: "modis_aqua_truecolor",
    name: "NASA MODIS Aqua True Color",
    sensor: "Aqua Satellite (EOS PM-1)",
    resolution: "250m / daily afternoon",
    format: "jpg",
    level: "GoogleMapsCompatible_Level9",
    layerId: "MODIS_Aqua_CorrectedReflectance_TrueColor",
    maxNativeZoom: 9,
    description: "Afternoon diurnal orbital pass capturing peak thermal boundary layer and agricultural evapotranspiration.",
    paletteType: "rgb",
  },
  {
    key: "viirs_truecolor",
    name: "NASA VIIRS NOAA-20 True Color",
    sensor: "Suomi NPP / JPSS-1 VIIRS",
    resolution: "375m / daily",
    format: "jpg",
    level: "GoogleMapsCompatible_Level9",
    layerId: "VIIRS_NOAA20_CorrectedReflectance_TrueColor",
    maxNativeZoom: 9,
    description: "High-radiometric-fidelity visible Earth imagery with enhanced atmospheric correction.",
    paletteType: "rgb",
  },
  {
    key: "imerg_precip",
    name: "GPM IMERG Precipitation Rate",
    sensor: "Global Precipitation Measurement",
    resolution: "0.1° / 30-min",
    format: "png",
    level: "GoogleMapsCompatible_Level6",
    layerId: "IMERG_Precipitation_Rate_30min",
    maxNativeZoom: 6,
    description: "Real-time rainfall and storm precipitation intensity over agricultural watersheds.",
    paletteType: "radar",
  },
  {
    key: "osm_topo",
    name: "CARTO Voyager Topography",
    sensor: "CARTO & OpenStreetMap",
    resolution: "Parcel-level",
    format: "png",
    level: "Vector",
    maxNativeZoom: 18,
    description: "Geographic administrative borders, watercourses, rural road networks, and field boundaries.",
    paletteType: "vector",
  },
];

function buildGibsUrl(layer: LayerMetadata, dateStr: string): string {
  if (layer.key === "osm_topo") {
    return "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";
  }
  const dateFormatted = dateStr && dateStr.length === 10 ? dateStr : "default";
  return `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/${layer.layerId}/default/${dateFormatted}/${layer.level}/{z}/{y}/{x}.${layer.format}`;
}

export default function EarthExplorerMap({
  initialLat = 30.73,
  initialLon = 76.78,
  selectedDate,
  onSelectCoords,
}: ExplorerMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markerRef = useRef<LeafletMarker | null>(null);
  const baseTileRef = useRef<LeafletTileLayer | null>(null);
  const gibsTileRef = useRef<LeafletTileLayer | null>(null);

  const [activeLayerKey, setActiveLayerKey] = useState<GibsLayerKey>("modis_bands721");
  const [currentCoords, setCurrentCoords] = useState<{ lat: number; lon: number }>({
    lat: initialLat,
    lon: initialLon,
  });
  const [copied, setCopied] = useState(false);
  const [tileLoading, setTileLoading] = useState(false);

  const activeLayer = SATELLITE_LAYERS.find((l) => l.key === activeLayerKey) || SATELLITE_LAYERS[0];

  // Callback ref for onSelectCoords to avoid re-triggering map initialization
  const onSelectRef = useRef(onSelectCoords);
  useEffect(() => {
    onSelectRef.current = onSelectCoords;
  }, [onSelectCoords]);

  // Robust, lifecycle-safe Leaflet initialization
  useEffect(() => {
    let isCancelled = false;
    let t1: NodeJS.Timeout | undefined;
    let t2: NodeJS.Timeout | undefined;
    let t3: NodeJS.Timeout | undefined;
    let handleResize: (() => void) | undefined;
    const domNode = containerRef.current;
    if (!domNode || typeof window === "undefined") return;

    // Destroy any existing map attached to this DOM container
    if (mapRef.current) {
      try {
        mapRef.current.remove();
      } catch {
        // ignore
      }
      mapRef.current = null;
    }
    // Clean any lingering _leaflet_id to eliminate "Map container is already initialized"
    if ((domNode as unknown as { _leaflet_id?: unknown })._leaflet_id) {
      delete (domNode as unknown as { _leaflet_id?: unknown })._leaflet_id;
    }

    import("leaflet").then((L) => {
      import("leaflet/dist/leaflet.css" as never);
      if (isCancelled || !containerRef.current) return;

      // Double-check container has no lingering ID
      if ((containerRef.current as unknown as { _leaflet_id?: unknown })._leaflet_id) {
        delete (containerRef.current as unknown as { _leaflet_id?: unknown })._leaflet_id;
      }

      const map = L.map(containerRef.current, {
        center: [currentCoords.lat, currentCoords.lon],
        zoom: 5,
        minZoom: 2,
        maxZoom: 18,
        zoomControl: false,
      });

      // Add Zoom control at top right
      L.control.zoom({ position: "topright" }).addTo(map);

      // Base Topo layer underneath with crisp visibility
      const baseLayer = L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
        attribution: "© OpenStreetMap contributors, © CARTO",
        subdomains: "abcd",
        opacity: activeLayerKey === "osm_topo" ? 1.0 : 0.7,
        maxZoom: 18,
        maxNativeZoom: 18,
      }).addTo(map);
      baseTileRef.current = baseLayer;

      // Primary satellite layer
      const initUrl = buildGibsUrl(activeLayer, selectedDate);
      const satLayer = L.tileLayer(initUrl, {
        attribution: "NASA GIBS / Earthdata",
        opacity: activeLayerKey === "osm_topo" ? 0.0 : 0.95,
        maxZoom: 18,
        maxNativeZoom: activeLayer.maxNativeZoom,
      }).addTo(map);
      gibsTileRef.current = satLayer;

      // Invalidate size on mount and staggered timers to ensure instant tile rendering
      t1 = setTimeout(() => { try { map.invalidateSize(); } catch {} }, 100);
      t2 = setTimeout(() => { try { map.invalidateSize(); } catch {} }, 350);
      t3 = setTimeout(() => { try { map.invalidateSize(); } catch {} }, 750);

      handleResize = () => { try { map.invalidateSize(); } catch {} };
      window.addEventListener("resize", handleResize);

      // Tile loading indicators
      satLayer.on("loading", () => setTileLoading(true));
      satLayer.on("load", () => setTileLoading(false));
      satLayer.on("tileerror", () => setTileLoading(false));

      // Custom pulsing scientific target marker
      const pinHtml = `
        <div style="position: relative; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center;">
          <div style="position: absolute; width: 36px; height: 36px; border-radius: 50%; background: rgba(45, 122, 58, 0.3); animation: ping 1.8s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
          <div style="position: relative; width: 16px; height: 16px; border-radius: 50%; background: #2d7a3a; border: 2.5px solid #ffffff; box-shadow: 0 4px 10px rgba(0,0,0,0.45);"></div>
        </div>
      `;
      const customPin = L.divIcon({
        className: "explorer-target-pin",
        html: pinHtml,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      });

      const marker = L.marker([currentCoords.lat, currentCoords.lon], { icon: customPin }).addTo(map);
      marker.bindPopup(`<b>Observation Target</b><br/>${currentCoords.lat.toFixed(4)}°, ${currentCoords.lon.toFixed(4)}°`);
      markerRef.current = marker;

      // On map click: update coordinates
      map.on("click", (e: LeafletMouseEvent) => {
        const nLat = parseFloat(e.latlng.lat.toFixed(4));
        const nLon = parseFloat(e.latlng.lng.toFixed(4));
        setCurrentCoords({ lat: nLat, lon: nLon });
        marker.setLatLng([nLat, nLon]);
        marker.setPopupContent(`<b>Observation Target</b><br/>${nLat.toFixed(4)}°, ${nLon.toFixed(4)}°`);
        onSelectRef.current(nLat, nLon);
      });

      mapRef.current = map;
    });

    return () => {
      isCancelled = true;
      if (t1) clearTimeout(t1);
      if (t2) clearTimeout(t2);
      if (t3) clearTimeout(t3);
      if (handleResize) window.removeEventListener("resize", handleResize);
      if (mapRef.current) {
        try {
          mapRef.current.remove();
        } catch {
          // ignore
        }
        mapRef.current = null;
      }
      if (domNode && (domNode as unknown as { _leaflet_id?: unknown })._leaflet_id) {
        delete (domNode as unknown as { _leaflet_id?: unknown })._leaflet_id;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync when initialLat or initialLon prop changes externally
  useEffect(() => {
    if (typeof initialLat === "number" && typeof initialLon === "number") {
      setCurrentCoords({ lat: initialLat, lon: initialLon });
      if (mapRef.current) {
        mapRef.current.flyTo([initialLat, initialLon], mapRef.current.getZoom(), { duration: 0.8 });
      }
      if (markerRef.current) {
        markerRef.current.setLatLng([initialLat, initialLon]);
        markerRef.current.setPopupContent(`<b>Observation Target</b><br/>${initialLat.toFixed(4)}°, ${initialLon.toFixed(4)}°`);
      }
    }
  }, [initialLat, initialLon]);

  // Update Satellite Layer when active layer or date changes
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;

    import("leaflet").then((L) => {
      if (baseTileRef.current) {
        baseTileRef.current.setOpacity(activeLayerKey === "osm_topo" ? 1.0 : 0.7);
      }
      if (gibsTileRef.current) {
        map.removeLayer(gibsTileRef.current);
        gibsTileRef.current = null;
      }

      if (activeLayerKey !== "osm_topo") {
        const newUrl = buildGibsUrl(activeLayer, selectedDate);
        const newSat = L.tileLayer(newUrl, {
          attribution: "NASA GIBS / Earthdata",
          opacity: 0.95,
          maxZoom: 18,
          maxNativeZoom: activeLayer.maxNativeZoom,
        }).addTo(map);

        newSat.on("loading", () => setTileLoading(true));
        newSat.on("load", () => setTileLoading(false));
        newSat.on("tileerror", () => setTileLoading(false));

        gibsTileRef.current = newSat;
      }
    });
  }, [activeLayerKey, selectedDate, activeLayer]);

  const recenter = () => {
    if (mapRef.current) {
      mapRef.current.flyTo([currentCoords.lat, currentCoords.lon], 6, { duration: 0.9 });
    }
  };

  const copyCoords = () => {
    navigator.clipboard.writeText(`${currentCoords.lat.toFixed(4)}, ${currentCoords.lon.toFixed(4)}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative w-full rounded-3xl overflow-hidden border border-[#d2e4d0] shadow-xl bg-[#0f1f14]">
      {/* Top Floating Glass HUD */}
      <div className="absolute top-4 left-4 right-16 z-[400] flex flex-wrap items-center justify-between gap-3 pointer-events-none">
        {/* Active Coordinate & Sensor Pill */}
        <div className="pointer-events-auto bg-slate-900/85 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/10 shadow-lg flex items-center gap-3 text-xs text-white">
          <div className="flex items-center gap-1.5 font-bold text-[#86efac]">
            <MapPin className="h-4 w-4 text-[#86efac]" />
            <span>Target:</span>
          </div>
          <span className="font-mono font-bold text-white">
            {currentCoords.lat >= 0 ? `${currentCoords.lat.toFixed(4)}°N` : `${Math.abs(currentCoords.lat).toFixed(4)}°S`},{" "}
            {currentCoords.lon >= 0 ? `${currentCoords.lon.toFixed(4)}°E` : `${Math.abs(currentCoords.lon).toFixed(4)}°W`}
          </span>
          <button
            onClick={copyCoords}
            title="Copy coordinates"
            className="p-1 hover:bg-white/10 rounded-md transition text-gray-300 hover:text-white"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
          </button>
          <div className="h-3.5 w-px bg-white/20 hidden sm:block"></div>
          <span className="text-[11px] text-gray-300 hidden sm:inline">
            Observation Date: <strong className="text-white">{selectedDate}</strong>
          </span>
        </div>

        {/* Status / Recenter */}
        <div className="pointer-events-auto flex items-center gap-2">
          {tileLoading && (
            <div className="bg-slate-900/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 text-[11px] text-[#86efac] flex items-center gap-1.5 font-medium animate-pulse">
              <span className="w-2 h-2 rounded-full bg-[#86efac] inline-block animate-ping"></span>
              Streaming NASA Tiles...
            </div>
          )}

          <button
            onClick={recenter}
            title="Recenter on target"
            className="p-2.5 bg-slate-900/85 hover:bg-slate-900 text-white rounded-2xl border border-white/10 shadow-lg transition flex items-center justify-center text-xs font-semibold"
          >
            <Crosshair className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Satellite Layer Switcher Overlay (Bottom Left) */}
      <div className="absolute bottom-4 left-4 z-[400] max-w-sm sm:max-w-md bg-slate-900/90 backdrop-blur-md p-3 rounded-2xl border border-white/10 shadow-2xl space-y-2 text-white">
        <div className="flex items-center justify-between border-b border-white/10 pb-1.5">
          <div className="flex items-center gap-1.5 text-xs font-bold text-[#86efac] uppercase tracking-wider">
            <Layers className="h-3.5 w-3.5" />
            <span>NASA GIBS Earth Observation Layer</span>
          </div>
          <span className="text-[10px] text-gray-400 font-mono">{activeLayer.sensor}</span>
        </div>

        {/* Layer Buttons */}
        <div className="grid grid-cols-2 gap-1.5">
          {SATELLITE_LAYERS.map((layer) => {
            const isSelected = layer.key === activeLayerKey;
            return (
              <button
                key={layer.key}
                onClick={() => setActiveLayerKey(layer.key)}
                className={`text-left p-2 rounded-xl transition border text-[11px] ${
                  isSelected
                    ? "bg-[#2d7a3a] border-[#86efac] text-white shadow-md"
                    : "bg-white/5 border-white/5 hover:bg-white/10 text-gray-300"
                }`}
              >
                <div className="font-bold truncate">{layer.name.replace("NASA ", "")}</div>
                <div className="text-[9px] text-gray-400 font-mono mt-0.5">{layer.resolution}</div>
              </button>
            );
          })}
        </div>

        {/* Layer Description & Legend */}
        <div className="pt-1 text-[11px] text-gray-300 leading-snug">
          {activeLayer.description}
        </div>
      </div>

      {/* Map DOM Element */}
      <div
        ref={containerRef}
        className="w-full relative z-0 cursor-crosshair"
        style={{ height: "640px", minHeight: "560px", width: "100%" }}
      />

      {/* Bottom Right Scientific Attribution */}
      <div className="absolute bottom-3 right-3 z-[400] pointer-events-none text-[10px] text-white/70 bg-black/50 backdrop-blur-sm px-2.5 py-1 rounded-md">
        NASA GIBS WMTS · OpenStreetMap · EPSG:3857 Web Mercator
      </div>
    </div>
  );
}
