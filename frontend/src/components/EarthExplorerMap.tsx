"use client";

import { useEffect, useRef, useState } from "react";
import { Layers, Crosshair, MapPin, Copy, Check } from "lucide-react";
import type { Map as LeafletMap, Marker as LeafletMarker, TileLayer as LeafletTileLayer, LeafletMouseEvent } from "leaflet";

export interface ExplorerMapProps {
  initialLat?: number;
  initialLon?: number;
  selectedDate: string;
  onSelectCoords: (lat: number, lon: number) => void;
  selectedLayerKey?: GibsLayerKey;
  onSelectLayer?: (layer: GibsLayerKey) => void;
  hideInternalLayerSelector?: boolean;
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
    name: "NASA MODIS NDVI (Canopy Greenness)",
    sensor: "Terra / MODIS (MOD13A2)",
    resolution: "1km / Monthly Composite",
    format: "png",
    level: "GoogleMapsCompatible_Level7",
    layerId: "MODIS_Terra_L3_NDVI_Monthly",
    maxNativeZoom: 7,
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
    name: "OpenStreetMap Cartography",
    sensor: "OpenStreetMap Foundation",
    resolution: "Field & Parcel Level",
    format: "png",
    level: "Standard",
    maxNativeZoom: 19,
    description: "Standard high-resolution cultural geography, administrative boundaries, watercourses, and rural road networks.",
    paletteType: "vector",
  },
];

function buildGibsUrl(layer: LayerMetadata, dateStr: string): string {
  if (layer.key === "osm_topo") {
    return "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
  }
  let dateFormatted = dateStr && dateStr.length === 10 ? dateStr : "default";
  if (layer.key === "modis_ndvi" && dateFormatted !== "default") {
    dateFormatted = `${dateFormatted.slice(0, 7)}-01`;
  }
  return `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/${layer.layerId}/default/${dateFormatted}/${layer.level}/{z}/{y}/{x}.${layer.format}`;
}

export default function EarthExplorerMap({
  initialLat = 30.73,
  initialLon = 76.78,
  selectedDate,
  onSelectCoords,
  selectedLayerKey,
  onSelectLayer,
  hideInternalLayerSelector = false,
}: ExplorerMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markerRef = useRef<LeafletMarker | null>(null);
  const baseTileRef = useRef<LeafletTileLayer | null>(null);
  const gibsTileRef = useRef<LeafletTileLayer | null>(null);

  const [internalLayerKey, setInternalLayerKey] = useState<GibsLayerKey>("modis_bands721");
  const activeLayerKey = selectedLayerKey || internalLayerKey;
  const setActiveLayerKey = (key: GibsLayerKey) => {
    if (onSelectLayer) onSelectLayer(key);
    else setInternalLayerKey(key);
  };

  const [tileLoading, setTileLoading] = useState(false);
  const [tileError, setTileError] = useState(false);
  const [copied, setCopied] = useState(false);
  const [currentCoords, setCurrentCoords] = useState<{ lat: number; lon: number }>({
    lat: initialLat,
    lon: initialLon,
  });

  const activeLayer = SATELLITE_LAYERS.find((l) => l.key === activeLayerKey) || SATELLITE_LAYERS[1];

  // Update pin when coordinates change from parent
  useEffect(() => {
    if (typeof initialLat === "number" && typeof initialLon === "number") {
      setCurrentCoords({ lat: initialLat, lon: initialLon });
      if (markerRef.current) {
        markerRef.current.setLatLng([initialLat, initialLon]);
      }
      if (mapRef.current) {
        mapRef.current.panTo([initialLat, initialLon]);
      }
    }
  }, [initialLat, initialLon]);

  // Leaflet initialization
  useEffect(() => {
    let isCancelled = false;
    let t1: NodeJS.Timeout | undefined;
    let t2: NodeJS.Timeout | undefined;
    let t3: NodeJS.Timeout | undefined;
    let handleResize: (() => void) | undefined;
    const domNode = containerRef.current;
    if (!domNode || typeof window === "undefined") return;

    if (mapRef.current) {
      try {
        mapRef.current.remove();
      } catch {
        // ignore
      }
      mapRef.current = null;
    }
    if ((domNode as unknown as { _leaflet_id?: unknown })._leaflet_id) {
      delete (domNode as unknown as { _leaflet_id?: unknown })._leaflet_id;
    }

    import("leaflet").then((L) => {
      import("leaflet/dist/leaflet.css" as never);
      if (isCancelled || !containerRef.current) return;

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

      L.control.zoom({ position: "topright" }).addTo(map);

      // OpenStreetMap Base Layer
      const baseLayer = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a>',
        subdomains: ["a", "b", "c"],
        opacity: activeLayerKey === "osm_topo" ? 1.0 : 0.45,
        maxZoom: 19,
        maxNativeZoom: 19,
      }).addTo(map);
      baseTileRef.current = baseLayer;

      // Primary satellite layer
      const initUrl = buildGibsUrl(activeLayer, selectedDate);
      const satLayer = L.tileLayer(initUrl, {
        attribution: "NASA GIBS / Earthdata",
        opacity: activeLayerKey === "osm_topo" ? 0.0 : 0.95,
        maxZoom: 19,
        maxNativeZoom: activeLayer.maxNativeZoom,
      }).addTo(map);
      gibsTileRef.current = satLayer;

      t1 = setTimeout(() => { try { map.invalidateSize(); } catch {} }, 100);
      t2 = setTimeout(() => { try { map.invalidateSize(); } catch {} }, 350);
      t3 = setTimeout(() => { try { map.invalidateSize(); } catch {} }, 750);

      handleResize = () => { try { map.invalidateSize(); } catch {} };
      window.addEventListener("resize", handleResize);

      satLayer.on("loading", () => {
        setTileLoading(true);
        setTileError(false);
      });
      satLayer.on("load", () => {
        setTileLoading(false);
        setTileError(false);
      });
      satLayer.on("tileerror", () => {
        setTileLoading(false);
        setTileError(true);
      });

      // Marker Icon
      const customPin = L.divIcon({
        className: "custom-field-pin",
        html: `
          <div style="
            position: relative;
            width: 32px;
            height: 32px;
            display: flex;
            align-items: center;
            justify-content: center;
          ">
            <div style="
              position: absolute;
              width: 32px;
              height: 32px;
              border-radius: 50%;
              background: rgba(13, 59, 46, 0.25);
              border: 1px solid rgba(13, 59, 46, 0.4);
            "></div>
            <div style="
              position: relative;
              width: 14px;
              height: 14px;
              border-radius: 50%;
              background: #0d3b2e;
              border: 2px solid #ffffff;
              box-shadow: 0 2px 6px rgba(0,0,0,0.3);
            "></div>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      const marker = L.marker([currentCoords.lat, currentCoords.lon], {
        icon: customPin,
        draggable: true,
      }).addTo(map);
      markerRef.current = marker;

      marker.on("dragend", () => {
        const pos = marker.getLatLng();
        setCurrentCoords({ lat: pos.lat, lon: pos.lng });
        onSelectCoords(pos.lat, pos.lng);
      });

      map.on("click", (e: LeafletMouseEvent) => {
        const { lat, lng } = e.latlng;
        marker.setLatLng([lat, lng]);
        setCurrentCoords({ lat, lon: lng });
        onSelectCoords(lat, lng);
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
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update satellite layer when layer key or date changes
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;

    import("leaflet").then((L) => {
      if (baseTileRef.current) {
        baseTileRef.current.setOpacity(activeLayerKey === "osm_topo" ? 1.0 : 0.45);
      }
      if (gibsTileRef.current) {
        map.removeLayer(gibsTileRef.current);
        gibsTileRef.current = null;
      }
      setTileError(false);

      if (activeLayerKey !== "osm_topo") {
        const newUrl = buildGibsUrl(activeLayer, selectedDate);
        const newSat = L.tileLayer(newUrl, {
          attribution: "NASA GIBS / Earthdata",
          opacity: 0.95,
          maxZoom: 19,
          maxNativeZoom: activeLayer.maxNativeZoom,
        }).addTo(map);

        newSat.on("loading", () => {
          setTileLoading(true);
          setTileError(false);
        });
        newSat.on("load", () => {
          setTileLoading(false);
          setTileError(false);
        });
        newSat.on("tileerror", () => {
          setTileLoading(false);
          setTileError(true);
        });

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
    <div className="relative w-full rounded-xl overflow-hidden border border-slate-200 bg-slate-900 shadow-2xs">
      {/* Top Floating Glass HUD */}
      <div className="absolute top-3 left-3 right-14 z-[400] flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        {/* Active Coordinate & Sensor Pill */}
        <div className="pointer-events-auto bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-700/80 shadow-md flex items-center gap-2.5 text-xs text-white">
          <div className="flex items-center gap-1.5 font-semibold text-emerald-400">
            <MapPin className="h-3.5 w-3.5 text-emerald-400" />
            <span>Target:</span>
          </div>
          <span className="font-mono font-bold text-white text-[11px]">
            {currentCoords.lat >= 0 ? `${currentCoords.lat.toFixed(4)}°N` : `${Math.abs(currentCoords.lat).toFixed(4)}°S`},{" "}
            {currentCoords.lon >= 0 ? `${currentCoords.lon.toFixed(4)}°E` : `${Math.abs(currentCoords.lon).toFixed(4)}°W`}
          </span>
          <button
            onClick={copyCoords}
            title="Copy coordinates"
            className="p-0.5 hover:bg-white/10 rounded transition text-slate-300 hover:text-white"
          >
            {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
          </button>
          <div className="h-3 w-px bg-slate-700 hidden sm:block"></div>
          <span className="text-[11px] text-slate-300 hidden sm:inline">
            Observation: <strong className="text-white">{selectedDate}</strong>
          </span>
        </div>

        {/* Status / Recenter */}
        <div className="pointer-events-auto flex items-center gap-2">
          {tileLoading && (
            <div className="bg-slate-900/90 backdrop-blur-md px-2.5 py-1 rounded-md border border-slate-700 text-[11px] text-emerald-400 flex items-center gap-1.5 font-medium animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
              Streaming Tiles...
            </div>
          )}

          {tileError && activeLayerKey !== "osm_topo" && (
            <div className="bg-amber-950/90 backdrop-blur-md px-2.5 py-1 rounded-md border border-amber-600/50 text-[11px] text-amber-300 flex items-center gap-1.5 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
              Observation unavailable for {selectedDate} — Base map active
            </div>
          )}

          <button
            onClick={recenter}
            title="Recenter on target"
            className="p-1.5 bg-slate-900/90 hover:bg-slate-800 text-white rounded-md border border-slate-700 shadow-md transition flex items-center justify-center text-xs"
          >
            <Crosshair className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Satellite Layer Switcher Overlay (Shown only if not hidden by external side panel) */}
      {!hideInternalLayerSelector && (
        <div className="absolute bottom-3 left-3 z-[400] max-w-xs sm:max-w-sm bg-slate-900/95 backdrop-blur-md p-3 rounded-lg border border-slate-700 shadow-xl space-y-2 text-white">
          <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 uppercase tracking-wider">
              <Layers className="h-3.5 w-3.5" />
              <span>NASA Satellite Layer</span>
            </div>
            <span className="text-[10px] text-slate-400 font-mono">{activeLayer.sensor}</span>
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            {SATELLITE_LAYERS.map((layer) => {
              const isSelected = layer.key === activeLayerKey;
              return (
                <button
                  key={layer.key}
                  onClick={() => setActiveLayerKey(layer.key)}
                  className={`text-left p-1.5 rounded transition border text-[11px] ${
                    isSelected
                      ? "bg-[#0d3b2e] border-emerald-500 text-white font-medium"
                      : "bg-white/5 border-transparent hover:bg-white/10 text-slate-300"
                  }`}
                >
                  <div className="font-semibold truncate">{layer.name.replace("NASA ", "")}</div>
                  <div className="text-[9px] text-slate-400 font-mono">{layer.resolution}</div>
                </button>
              );
            })}
          </div>

          <div className="pt-1 text-[11px] text-slate-300 leading-tight">
            {activeLayer.description}
          </div>
        </div>
      )}

      {/* Map DOM Element */}
      <div
        ref={containerRef}
        className="w-full relative z-0 cursor-crosshair"
        style={{ height: "640px", minHeight: "560px", width: "100%" }}
      />

      {/* Bottom Right Scientific Attribution */}
      <div className="absolute bottom-2 right-2 z-[400] pointer-events-none text-[10px] text-slate-400 bg-slate-950/70 backdrop-blur-sm px-2 py-0.5 rounded">
        NASA GIBS WMTS &bull; OpenStreetMap &bull; EPSG:3857
      </div>
    </div>
  );
}
