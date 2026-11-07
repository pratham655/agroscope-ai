"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  Crosshair,
  MapPin,
  Layers,
  Copy,
  Check,
  AlertCircle,
  Eye,
} from "lucide-react";
import type {
  Map as LeafletMap,
  Marker as LeafletMarker,
  TileLayer as LeafletTileLayer,
  LeafletMouseEvent,
} from "leaflet";

export interface SimulationMapProps {
  latitude: number;
  longitude: number;
  locationLabel: string;
  onSelectCoordinates: (lat: number, lon: number) => void;
}

export type MapLayerType =
  | "carto_topo"
  | "gibs_true_color"
  | "gibs_bands721"
  | "gibs_ndvi"
  | "gibs_lst"
  | "gibs_imerg";

export interface LayerSpec {
  key: MapLayerType;
  name: string;
  shortName: string;
  sensor: string;
  resolution: string;
  layerId?: string;
  format: "jpg" | "png";
  matrixSet: string;
  maxNativeZoom: number;
  isOverlay: boolean;
  opacity: number;
  description: string;
  legendType: "none" | "rgb" | "agriculture" | "ndvi" | "lst" | "precip";
  scientificNote?: string;
  attribution: string;
}

export const MAP_LAYERS: Record<MapLayerType, LayerSpec> = {
  carto_topo: {
    key: "carto_topo",
    name: "Standard Topographic Map",
    shortName: "Standard Topo",
    sensor: "CARTO Voyager & OpenStreetMap",
    resolution: "Parcel-level cartography",
    format: "png",
    matrixSet: "Vector",
    maxNativeZoom: 18,
    isOverlay: false,
    opacity: 1.0,
    description: "High-resolution topography, administrative boundaries, road corridors, and hydrological networks.",
    legendType: "none",
    attribution: "© OpenStreetMap contributors, © CARTO",
  },
  gibs_true_color: {
    key: "gibs_true_color",
    name: "NASA MODIS Terra True Color",
    shortName: "MODIS True Color",
    sensor: "Terra Satellite (EOS AM-1)",
    resolution: "250m daily",
    layerId: "MODIS_Terra_CorrectedReflectance_TrueColor",
    format: "jpg",
    matrixSet: "GoogleMapsCompatible_Level9",
    maxNativeZoom: 9,
    isOverlay: true,
    opacity: 0.95,
    description: "Natural-colour photorealistic imagery from Terra MODIS corrected reflectance at 250m ground resolution.",
    legendType: "rgb",
    scientificNote: "Natural photorealistic Earth observation surface reflectance calibrated for daily global monitoring.",
    attribution: "NASA GIBS / Terra MODIS Corrected Reflectance",
  },
  gibs_bands721: {
    key: "gibs_bands721",
    name: "NASA MODIS Agricultural (Bands 7-2-1)",
    shortName: "Bands 7-2-1",
    sensor: "Terra Shortwave / Near-IR",
    resolution: "250m daily",
    layerId: "MODIS_Terra_CorrectedReflectance_Bands721",
    format: "jpg",
    matrixSet: "GoogleMapsCompatible_Level9",
    maxNativeZoom: 9,
    isOverlay: true,
    opacity: 0.95,
    description: "Agricultural shortwave/near-infrared composite: active healthy vegetation appears in vibrant green, bare soil in tan/brown, and surface water in dark navy/black.",
    legendType: "agriculture",
    scientificNote: "SWIR/NIR reflectance clearly distinguishes actively transpiring photosynthetic crop canopy from dormant stubble and dry soil.",
    attribution: "NASA GIBS / Terra MODIS Bands 7-2-1",
  },
  gibs_ndvi: {
    key: "gibs_ndvi",
    name: "NASA MODIS NDVI (Vegetation Index)",
    shortName: "MODIS NDVI",
    sensor: "Terra / MODIS MOD13Q1",
    resolution: "250m / 8-day rolling",
    layerId: "MODIS_Terra_NDVI_8Day",
    format: "png",
    matrixSet: "GoogleMapsCompatible_Level9",
    maxNativeZoom: 9,
    isOverlay: true,
    opacity: 0.92,
    description: "Normalized Difference Vegetation Index representing photosynthetic chlorophyll absorption and canopy density.",
    legendType: "ndvi",
    scientificNote: "NDVI indicates canopy chlorophyll density and vegetative vigor. It is an optical vegetation index, not a direct harvest yield measurement.",
    attribution: "NASA GIBS / Terra MODIS NDVI 8-Day Composite",
  },
  gibs_lst: {
    key: "gibs_lst",
    name: "NASA Land Surface Temperature",
    shortName: "Surface Temp (LST)",
    sensor: "Terra / MODIS MOD11A1",
    resolution: "1km / daily daytime",
    layerId: "MODIS_Terra_Land_Surface_Temp_Day",
    format: "png",
    matrixSet: "GoogleMapsCompatible_Level7",
    maxNativeZoom: 7,
    isOverlay: true,
    opacity: 0.88,
    description: "Radiometric land surface skin temperature calibrated during Terra morning equatorial transit.",
    legendType: "lst",
    scientificNote: "LST represents radiative land surface skin/canopy temperature, distinct from 2-metre shelter ambient air temperature.",
    attribution: "NASA GIBS / Terra MODIS LST Day",
  },
  gibs_imerg: {
    key: "gibs_imerg",
    name: "GPM IMERG Precipitation Rate",
    shortName: "Precipitation",
    sensor: "GPM Satellite Constellation",
    resolution: "0.1° / 30-min avg",
    layerId: "IMERG_Precipitation_Rate_30min",
    format: "png",
    matrixSet: "GoogleMapsCompatible_Level6",
    maxNativeZoom: 6,
    isOverlay: true,
    opacity: 0.85,
    description: "Real-time calibrated precipitation rate (mm/hr) across agricultural watersheds from the GPM satellite constellation.",
    legendType: "precip",
    scientificNote: "Multi-satellite combined precipitation estimate calibrated against microwave sensors.",
    attribution: "NASA GIBS / GPM IMERG Precipitation Rate",
  },
};

function buildTileUrl(layer: LayerSpec, dateStr: string = "default"): string {
  if (layer.key === "carto_topo") {
    return "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
  }
  const dateFormatted = dateStr && dateStr.length === 10 ? dateStr : "default";
  return `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/${layer.layerId}/default/${dateFormatted}/${layer.matrixSet}/{z}/{y}/{x}.${layer.format}`;
}

export default function SimulationMap({
  latitude,
  longitude,
  locationLabel,
  onSelectCoordinates,
}: SimulationMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<LeafletMap | null>(null);
  const markerRef = useRef<LeafletMarker | null>(null);
  const baseTileRef = useRef<LeafletTileLayer | null>(null);
  const satTileRef = useRef<LeafletTileLayer | null>(null);

  const [activeLayerKey, setActiveLayerKey] = useState<MapLayerType>("carto_topo");
  const [tileLoading, setTileLoading] = useState(false);
  const [tileError, setTileError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [selectedObsDate] = useState<string>("default");
  const [showLegend] = useState(true);

  const activeLayer = MAP_LAYERS[activeLayerKey] || MAP_LAYERS.carto_topo;

  // Keep a stable ref for onSelectCoordinates callback
  const onSelectCoordinatesRef = useRef(onSelectCoordinates);
  useEffect(() => {
    onSelectCoordinatesRef.current = onSelectCoordinates;
  }, [onSelectCoordinates]);

  // Leaflet initialization with safe cleanup
  useEffect(() => {
    let isCancelled = false;
    const domNode = mapContainerRef.current;
    if (!domNode || typeof window === "undefined") return;

    // Destroy any existing map attached to this DOM container
    if (mapInstanceRef.current) {
      try {
        mapInstanceRef.current.remove();
      } catch {
        // ignore
      }
      mapInstanceRef.current = null;
    }

    // Clean any lingering _leaflet_id
    if ((domNode as unknown as { _leaflet_id?: unknown })._leaflet_id) {
      delete (domNode as unknown as { _leaflet_id?: unknown })._leaflet_id;
    }

    import("leaflet").then((L) => {
      if (isCancelled || !mapContainerRef.current) return;

      if ((mapContainerRef.current as unknown as { _leaflet_id?: unknown })._leaflet_id) {
        delete (mapContainerRef.current as unknown as { _leaflet_id?: unknown })._leaflet_id;
      }

      // Initialize Map
      const map = L.map(mapContainerRef.current, {
        center: [latitude, longitude],
        zoom: 6,
        minZoom: 2,
        maxZoom: 18,
        zoomControl: false,
      });

      // Add Zoom Control at top right
      L.control.zoom({ position: "topright" }).addTo(map);

      // Add resilient base layer: Standard OpenStreetMap (no API key required)
      const baseLayer = L.tileLayer(
        "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors',
          subdomains: ["a", "b", "c"],
          maxZoom: 19,
          maxNativeZoom: 19,
          opacity: activeLayerKey === "carto_topo" ? 1.0 : 0.35,
        }
      ).addTo(map);
      baseTileRef.current = baseLayer;

      // Primary satellite overlay layer if active
      if (activeLayerKey !== "carto_topo") {
        const satUrl = buildTileUrl(activeLayer, selectedObsDate);
        const satLayer = L.tileLayer(satUrl, {
          attribution: activeLayer.attribution,
          maxZoom: 18,
          maxNativeZoom: activeLayer.maxNativeZoom,
          opacity: activeLayer.opacity,
        }).addTo(map);

        satLayer.on("loading", () => {
          setTileLoading(true);
          setTileError(null);
        });
        satLayer.on("load", () => {
          setTileLoading(false);
        });
        satLayer.on("tileerror", () => {
          setTileLoading(false);
          setTileError("NASA GIBS tile stream unavailable for this region/date combination.");
        });

        satTileRef.current = satLayer;
      }

      // Custom pulsing scientific target pin marker
      const markerHtml = `
        <div style="position: relative; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center;">
          <div style="position: absolute; width: 34px; height: 34px; border-radius: 50%; background: rgba(45, 122, 58, 0.35); animation: ping 1.8s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
          <div style="position: relative; width: 15px; height: 15px; border-radius: 50%; background: #2d7a3a; border: 2.5px solid #ffffff; box-shadow: 0 3px 8px rgba(0,0,0,0.4);"></div>
        </div>
      `;
      const customIcon = L.divIcon({
        className: "custom-sim-marker",
        html: markerHtml,
        iconSize: [34, 34],
        iconAnchor: [17, 17],
      });

      const marker = L.marker([latitude, longitude], { icon: customIcon }).addTo(map);
      marker.bindPopup(
        `<div style="font-family: inherit; font-size: 12px;"><b>${locationLabel}</b><br/>` +
        `<span style="color: #2d7a3a; font-family: monospace; font-weight: bold;">${latitude.toFixed(4)}°, ${longitude.toFixed(4)}°</span></div>`
      );
      markerRef.current = marker;

      // On map click: update coordinates dynamically
      map.on("click", (e: LeafletMouseEvent) => {
        const newLat = parseFloat(e.latlng.lat.toFixed(4));
        const newLon = parseFloat(e.latlng.lng.toFixed(4));
        onSelectCoordinatesRef.current(newLat, newLon);
      });

      // Force size invalidation to avoid grey borders or collapsed tiles
      setTimeout(() => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize();
        }
      }, 100);

      mapInstanceRef.current = map;
    });

    return () => {
      isCancelled = true;
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.remove();
        } catch {
          // ignore
        }
        mapInstanceRef.current = null;
      }
      if (domNode && (domNode as unknown as { _leaflet_id?: unknown })._leaflet_id) {
        delete (domNode as unknown as { _leaflet_id?: unknown })._leaflet_id;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update map center and marker when coordinates change
  useEffect(() => {
    if (!mapInstanceRef.current || !markerRef.current) return;
    const map = mapInstanceRef.current;
    const marker = markerRef.current;

    marker.setLatLng([latitude, longitude]);
    marker.setPopupContent(
      `<div style="font-family: inherit; font-size: 12px;"><b>${locationLabel}</b><br/>` +
      `<span style="color: #2d7a3a; font-family: monospace; font-weight: bold;">${latitude.toFixed(4)}°, ${longitude.toFixed(4)}°</span></div>`
    );

    const curCenter = map.getCenter();
    const dist = Math.hypot(curCenter.lat - latitude, curCenter.lng - longitude);
    if (dist > 0.001) {
      if (dist < 8) {
        map.panTo([latitude, longitude], { animate: true, duration: 0.8 });
      } else {
        map.flyTo([latitude, longitude], map.getZoom() < 5 ? 6 : map.getZoom(), { duration: 1.1 });
      }
    }
  }, [latitude, longitude, locationLabel]);

  // Update tile layers when active layer or observation date changes
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    import("leaflet").then((L) => {
      // Clean up previous satellite tile
      if (satTileRef.current) {
        map.removeLayer(satTileRef.current);
        satTileRef.current = null;
      }

      // Update base layer opacity depending on active mode
      if (baseTileRef.current) {
        baseTileRef.current.setOpacity(activeLayerKey === "carto_topo" ? 1.0 : 0.35);
      }

      // If satellite layer selected, mount it on top
      if (activeLayerKey !== "carto_topo") {
        setTileLoading(true);
        setTileError(null);

        const satUrl = buildTileUrl(activeLayer, selectedObsDate);
        const newSat = L.tileLayer(satUrl, {
          attribution: activeLayer.attribution,
          maxZoom: 18,
          maxNativeZoom: activeLayer.maxNativeZoom,
          opacity: activeLayer.opacity,
        }).addTo(map);

        newSat.on("loading", () => {
          setTileLoading(true);
          setTileError(null);
        });
        newSat.on("load", () => {
          setTileLoading(false);
        });
        newSat.on("tileerror", () => {
          setTileLoading(false);
          setTileError("Selected NASA GIBS imagery is currently unavailable for this layer/date combination.");
        });

        satTileRef.current = newSat;
      } else {
        setTileLoading(false);
        setTileError(null);
      }
    });
  }, [activeLayerKey, selectedObsDate, activeLayer]);

  const recenter = useCallback(() => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([latitude, longitude], 7, { duration: 0.8 });
    }
  }, [latitude, longitude]);

  const copyCoords = () => {
    navigator.clipboard.writeText(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative w-full rounded-3xl overflow-hidden border border-[#d2e4d0] shadow-md bg-[#0f1f14]">
      {/* Top Map HUD Bar */}
      <div className="absolute top-3 left-3 right-3 z-[400] flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        {/* Location pill */}
        <div className="pointer-events-auto bg-slate-900/90 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-white/15 shadow-xl flex items-center gap-2.5 text-xs text-white">
          <div className="p-1 rounded-lg bg-[#2d7a3a]/30 text-[#86efac]">
            <MapPin className="h-4 w-4" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-white truncate max-w-[180px] sm:max-w-[280px]">
              {locationLabel}
            </span>
            <span className="font-mono text-[11px] text-[#86efac]">
              {latitude >= 0 ? `${latitude.toFixed(4)}°N` : `${Math.abs(latitude).toFixed(4)}°S`},{" "}
              {longitude >= 0 ? `${longitude.toFixed(4)}°E` : `${Math.abs(longitude).toFixed(4)}°W`}
            </span>
          </div>

          <button
            onClick={copyCoords}
            title="Copy coordinates"
            className="p-1.5 hover:bg-white/10 rounded-lg transition text-gray-300 hover:text-white shrink-0"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
          </button>
        </div>

        {/* Status / Recenter / Date Controls */}
        <div className="pointer-events-auto flex items-center gap-2">
          {tileLoading && (
            <div className="bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/15 text-[11px] text-[#86efac] flex items-center gap-2 font-medium shadow-lg animate-pulse">
              <span className="w-2 h-2 rounded-full bg-[#86efac] inline-block animate-ping"></span>
              <span>Streaming NASA GIBS...</span>
            </div>
          )}

          {tileError && (
            <div className="bg-amber-950/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-amber-500/30 text-[11px] text-amber-300 flex items-center gap-1.5 font-medium shadow-lg">
              <AlertCircle className="h-3.5 w-3.5 text-amber-400" />
              <span>Layer offline · Base map active</span>
            </div>
          )}

          <button
            onClick={recenter}
            title="Recenter on target"
            className="p-2.5 bg-slate-900/90 hover:bg-slate-900 text-white hover:text-[#86efac] rounded-2xl border border-white/15 shadow-xl transition flex items-center justify-center text-xs font-semibold"
          >
            <Crosshair className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Layer Selection HUD (Bottom Left) */}
      <div className="absolute bottom-3 left-3 z-[400] max-w-sm sm:max-w-md bg-slate-900/95 backdrop-blur-md p-3.5 rounded-2xl border border-white/15 shadow-2xl space-y-2.5 text-white">
        <div className="flex items-center justify-between border-b border-white/10 pb-2">
          <div className="flex items-center gap-2 text-xs font-bold text-[#86efac] uppercase tracking-wider">
            <Layers className="h-4 w-4" />
            <span>Map &amp; Satellite Layer</span>
          </div>
          <span className="text-[10px] text-gray-400 font-mono">{activeLayer.sensor}</span>
        </div>

        {/* Layer Buttons */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
          {(Object.keys(MAP_LAYERS) as MapLayerType[]).map((key) => {
            const layer = MAP_LAYERS[key];
            const isSelected = layer.key === activeLayerKey;
            return (
              <button
                key={layer.key}
                onClick={() => setActiveLayerKey(layer.key)}
                className={`text-left p-2 rounded-xl transition border text-[11px] flex flex-col justify-between ${
                  isSelected
                    ? "bg-[#2d7a3a] border-[#86efac] text-white shadow-md font-bold"
                    : "bg-white/5 border-white/5 hover:bg-white/10 text-gray-300 font-medium"
                }`}
              >
                <div className="truncate">{layer.shortName}</div>
                <div className="text-[9px] opacity-75 font-mono mt-0.5">{layer.resolution.split(" ")[0]}</div>
              </button>
            );
          })}
        </div>

        {/* Layer-Specific Scientific Legend */}
        {showLegend && activeLayer.legendType !== "none" && (
          <div className="p-2.5 bg-white/5 rounded-xl border border-white/10 space-y-1.5 text-[11px]">
            {activeLayer.legendType === "ndvi" && (
              <div>
                <div className="flex items-center justify-between text-[10px] text-gray-300 mb-1">
                  <span>Vegetation Density (NDVI)</span>
                  <span className="font-mono">-1.0 to +1.0</span>
                </div>
                <div className="h-2.5 rounded-md bg-gradient-to-r from-red-500 via-amber-400 via-lime-400 to-emerald-700 w-full shadow-inner" />
                <div className="flex justify-between text-[9px] text-gray-400 font-mono mt-1">
                  <span>&lt;0.1 Bare/Water</span>
                  <span>0.3 Sparse</span>
                  <span>&gt;0.6 Dense Canopy</span>
                </div>
              </div>
            )}

            {activeLayer.legendType === "lst" && (
              <div>
                <div className="flex items-center justify-between text-[10px] text-gray-300 mb-1">
                  <span>Land Surface Skin Temp (LST)</span>
                  <span className="font-mono">Kelvin / °C</span>
                </div>
                <div className="h-2.5 rounded-md bg-gradient-to-r from-blue-600 via-cyan-400 via-emerald-400 via-yellow-400 to-red-600 w-full shadow-inner" />
                <div className="flex justify-between text-[9px] text-gray-400 font-mono mt-1">
                  <span>&lt;10°C Cool/Wet</span>
                  <span>25°C Optimal</span>
                  <span>&gt;45°C Thermal Stress</span>
                </div>
              </div>
            )}

            {activeLayer.legendType === "agriculture" && (
              <div className="space-y-1">
                <div className="text-[10px] font-bold text-[#86efac] uppercase">Bands 7-2-1 Agricultural Calibration</div>
                <div className="grid grid-cols-3 gap-1 text-[10px]">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0"></span>
                    <span>Crops (Green)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-700 shrink-0"></span>
                    <span>Soil (Tan)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-900 border border-white/30 shrink-0"></span>
                    <span>Water (Navy)</span>
                  </div>
                </div>
              </div>
            )}

            {activeLayer.legendType === "rgb" && (
              <div className="text-[10px] text-gray-300">
                Natural-colour photorealistic visible Earth observation at 250m resolution.
              </div>
            )}

            {activeLayer.legendType === "precip" && (
              <div>
                <div className="flex items-center justify-between text-[10px] text-gray-300 mb-1">
                  <span>Precipitation Rate</span>
                  <span className="font-mono">mm / hour</span>
                </div>
                <div className="h-2.5 rounded-md bg-gradient-to-r from-blue-300 via-blue-600 to-purple-800 w-full shadow-inner" />
                <div className="flex justify-between text-[9px] text-gray-400 font-mono mt-1">
                  <span>0.5 Light</span>
                  <span>5.0 Moderate</span>
                  <span>&gt;25 Intense</span>
                </div>
              </div>
            )}

            {activeLayer.scientificNote && (
              <p className="text-[10px] text-gray-400 italic pt-1 border-t border-white/10 leading-tight">
                {activeLayer.scientificNote}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Map DOM Element */}
      <div ref={mapContainerRef} className="w-full h-[360px] sm:h-[420px] z-0" />

      {/* Bottom Attribution & Instructions Bar */}
      <div className="absolute bottom-2 right-3 z-[400] flex items-center gap-2 pointer-events-none text-[10px] text-white/80 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10">
        <div className="flex items-center gap-1.5">
          <Eye className="h-3.5 w-3.5 text-[#86efac]" />
          <span>Click map to relocate marker &bull; EPSG:3857 Web Mercator</span>
        </div>
      </div>
    </div>
  );
}
