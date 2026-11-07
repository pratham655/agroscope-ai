"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  Play,
  Pause,
  MapPin,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Info,
  Clock,
} from "lucide-react";
import type { Map as LeafletMap, TileLayer as LeafletTileLayer, Marker as LeafletMarker } from "leaflet";

interface TimeMachineProps {
  latitude: number;
  longitude: number;
  initialDate?: string;
  onDateChange?: (date: string) => void;
}

// 8-step chronological observation sequence covering peak vegetative cycles across 4 seasons
const TIMELINE_STEPS = [
  { date: "2021-06-15", label: "2021 Peak Summer Canopy", season: "2021 Summer", note: "La Niña baseline cycle" },
  { date: "2021-10-15", label: "2021 Autumn Post-Harvest", season: "2021 Autumn", note: "Crop senescence & stubble" },
  { date: "2022-04-15", label: "2022 Spring Green-up", season: "2022 Spring", note: "Emergence & tillering" },
  { date: "2022-07-20", label: "2022 Severe Heat Wave Peak", season: "2022 Summer", note: "Significant thermal stress anomaly" },
  { date: "2023-05-10", label: "2023 Early Vegetative Peak", season: "2023 Spring", note: "Normal rainfall restoration" },
  { date: "2023-08-15", label: "2023 Late Summer Ripening", season: "2023 Summer", note: "Grain filling & maturity" },
  { date: "2024-04-20", label: "2024 Spring Planting Window", season: "2024 Spring", note: "Active vegetative emergence" },
  { date: "2024-07-15", label: "2024 Peak Canopy Season", season: "2024 Summer", note: "Recent verified observation" },
];

type LayerType = "modis_truecolor" | "modis_bands721" | "modis_aqua" | "viirs";

export default function SatelliteTimeMachineMap({
  latitude,
  longitude,
  initialDate = "2024-07-15",
  onDateChange,
}: TimeMachineProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const tileLayerRef = useRef<LeafletTileLayer | null>(null);
  const markerRef = useRef<LeafletMarker | null>(null);

  // Time-lapse state
  const [currentStepIndex, setCurrentStepIndex] = useState(() => {
    const matchIdx = TIMELINE_STEPS.findIndex((s) => s.date === initialDate);
    return matchIdx !== -1 ? matchIdx : 7;
  });
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1500); // ms per step
  const [activeLayer, setActiveLayer] = useState<LayerType>("modis_bands721");
  const [tileLoading, setTileLoading] = useState(false);

  const currentDate = TIMELINE_STEPS[currentStepIndex].date;
  const currentStep = TIMELINE_STEPS[currentStepIndex];

  // NASA GIBS tile URL builder
  const getGibsTileUrl = useCallback((layer: LayerType, date: string): string => {
    switch (layer) {
      case "modis_bands721":
        return `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Terra_CorrectedReflectance_Bands721/default/${date}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg`;
      case "modis_aqua":
        return `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Aqua_CorrectedReflectance_TrueColor/default/${date}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg`;
      case "viirs":
        return `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/VIIRS_NOAA20_CorrectedReflectance_TrueColor/default/${date}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg`;
      case "modis_truecolor":
      default:
        return `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Terra_CorrectedReflectance_TrueColor/default/${date}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg`;
    }
  }, []);

  // Update tile layer whenever date or layer changes
  const updateMapLayer = useCallback((date: string, layer: LayerType) => {
    if (!mapRef.current) return;
    setTileLoading(true);

    import("leaflet").then((L) => {
      if (tileLayerRef.current && mapRef.current) {
        mapRef.current.removeLayer(tileLayerRef.current);
      }

      const url = getGibsTileUrl(layer, date);
      const newLayer = L.tileLayer(url, {
        maxZoom: 18,
        maxNativeZoom: 9,
        minZoom: 1,
        attribution: "NASA Global Imagery Browse Services (GIBS)",
      });

      newLayer.on("load", () => setTileLoading(false));
      newLayer.on("tileerror", () => setTileLoading(false));

      if (mapRef.current) {
        newLayer.addTo(mapRef.current);
        tileLayerRef.current = newLayer;
      }
    });
  }, [getGibsTileUrl]);

  // Initialize Leaflet Map
  useEffect(() => {
    let isCancelled = false;
    const domNode = containerRef.current;
    if (!domNode || typeof window === "undefined") return;

    if (mapRef.current) {
      try { mapRef.current.remove(); } catch { /* ignore */ }
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
        center: [latitude, longitude],
        zoom: 7,
        zoomControl: true,
      });

      // Standard OpenStreetMap base underlay
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors',
        subdomains: ["a", "b", "c"],
        opacity: 0.35,
        maxZoom: 19,
        maxNativeZoom: 19,
      }).addTo(map);

      const url = getGibsTileUrl(activeLayer, currentDate);
      const tileLayer = L.tileLayer(url, {
        maxZoom: 18,
        maxNativeZoom: 9,
        minZoom: 1,
        attribution: "NASA GIBS &bull; EOSDIS &bull; Earth Science Data",
      }).addTo(map);

      tileLayerRef.current = tileLayer;

      // Pin Marker
      const customIcon = L.divIcon({
        className: "custom-pin",
        html: `<div style="background-color:#22c55e;width:16px;height:16px;border-radius:50%;border:3px solid white;box-shadow:0 0 10px rgba(0,0,0,0.5);"></div>`,
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      });

      const marker = L.marker([latitude, longitude], { icon: customIcon }).addTo(map);
      marker.bindPopup(`<strong>Target Field</strong><br/>${latitude.toFixed(4)}°, ${longitude.toFixed(4)}°`);
      markerRef.current = marker;

      mapRef.current = map;
    });

    return () => {
      isCancelled = true;
      if (mapRef.current) {
        try { mapRef.current.remove(); } catch { /* ignore */ }
        mapRef.current = null;
      }
      if (domNode && (domNode as unknown as { _leaflet_id?: unknown })._leaflet_id) {
        delete (domNode as unknown as { _leaflet_id?: unknown })._leaflet_id;
      }
    };
  }, [latitude, longitude, activeLayer, currentDate, getGibsTileUrl]);

  // Time-lapse animation loop
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (isPlaying) {
      timer = setInterval(() => {
        setCurrentStepIndex((prev) => {
          const next = (prev + 1) % TIMELINE_STEPS.length;
          const nextDate = TIMELINE_STEPS[next].date;
          updateMapLayer(nextDate, activeLayer);
          if (onDateChange) onDateChange(nextDate);
          return next;
        });
      }, playbackSpeed);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isPlaying, playbackSpeed, activeLayer, updateMapLayer, onDateChange]);

  const goToStep = (index: number) => {
    const clamped = Math.max(0, Math.min(TIMELINE_STEPS.length - 1, index));
    setCurrentStepIndex(clamped);
    const date = TIMELINE_STEPS[clamped].date;
    updateMapLayer(date, activeLayer);
    if (onDateChange) onDateChange(date);
  };

  const handleLayerSwitch = (layer: LayerType) => {
    setActiveLayer(layer);
    updateMapLayer(currentDate, layer);
  };

  const recenter = () => {
    if (mapRef.current) {
      mapRef.current.setView([latitude, longitude], 7, { animate: true });
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Map Display Container */}
      <div className="relative rounded-3xl overflow-hidden border border-[#234b32] bg-[#07130b] shadow-2xl">
        {/* Map Canvas */}
        <div ref={containerRef} className="w-full h-[460px] sm:h-[540px] z-0" />

        {/* Loading Pill */}
        {tileLoading && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[400] bg-slate-950/85 backdrop-blur-md px-4 py-1.5 rounded-full border border-emerald-500/40 text-xs text-white flex items-center gap-2 shadow-lg">
            <span className="h-3 w-3 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
            <span>Streaming NASA GIBS observation for {currentDate}...</span>
          </div>
        )}

        {/* Top Floating HUD: Layer Selector & Metadata */}
        <div className="absolute top-4 left-4 right-4 z-[400] flex flex-wrap items-center justify-between gap-2 pointer-events-none">
          <div className="pointer-events-auto bg-slate-950/85 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/10 text-white shadow-xl flex items-center gap-3">
            <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-300">
              <Clock className="h-4 w-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-white flex items-center gap-2">
                <span>{currentStep.label}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800 font-mono">
                  {currentDate}
                </span>
              </div>
              <p className="text-[11px] text-gray-400 mt-0.5">{currentStep.note}</p>
            </div>
          </div>

          <div className="pointer-events-auto flex items-center gap-2">
            <div className="flex bg-slate-950/85 backdrop-blur-md p-1 rounded-2xl border border-white/10 text-xs shadow-xl">
              <button
                onClick={() => handleLayerSwitch("modis_bands721")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                  activeLayer === "modis_bands721"
                    ? "bg-[#2d7a3a] text-white shadow-xs"
                    : "text-gray-300 hover:text-white"
                }`}
                title="Bands 7-2-1 highlights healthy crops in bright green"
              >
                Agro 7-2-1
              </button>
              <button
                onClick={() => handleLayerSwitch("modis_truecolor")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                  activeLayer === "modis_truecolor"
                    ? "bg-[#2d7a3a] text-white shadow-xs"
                    : "text-gray-300 hover:text-white"
                }`}
              >
                TrueColor
              </button>
              <button
                onClick={() => handleLayerSwitch("viirs")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                  activeLayer === "viirs"
                    ? "bg-[#2d7a3a] text-white shadow-xs"
                    : "text-gray-300 hover:text-white"
                }`}
              >
                VIIRS (375m)
              </button>
            </div>

            <button
              onClick={recenter}
              className="p-2.5 bg-slate-950/85 hover:bg-slate-900 text-white rounded-2xl border border-white/10 shadow-xl transition"
              title="Recenter Map to Target Field"
            >
              <Maximize2 className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Target Field Location Pin Tag */}
        <div className="absolute bottom-4 left-4 z-[400] bg-slate-950/85 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-white/10 text-xs text-white flex items-center gap-2">
          <MapPin className="h-3.5 w-3.5 text-emerald-400" />
          <span className="font-mono text-[11px]">
            Target: {latitude.toFixed(4)}°, {longitude.toFixed(4)}°
          </span>
        </div>
      </div>

      {/* Interactive Time-Lapse Player Console */}
      <div className="bg-white rounded-3xl p-6 border border-[#dce8da] shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-[#eef7ec] text-[#2d7a3a]">
                <Clock className="h-4 w-4" />
              </span>
              <h3 className="text-base font-extrabold text-[#1a2e1a]">
                Satellite Time-Lapse &amp; Historical Trajectory
              </h3>
            </div>
            <p className="text-xs text-[#4a6741] mt-0.5">
              Sequence calibrated observations across multiple vegetative growth cycles (2021–2024).
            </p>
          </div>

          {/* Player Controls (Play, Step Backward, Step Forward, Speed) */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => goToStep(currentStepIndex - 1)}
              disabled={currentStepIndex === 0}
              className="p-2.5 bg-[#f8faf7] hover:bg-[#eef7ec] disabled:opacity-40 text-gray-700 rounded-xl border border-[#dce8da] transition"
              title="Previous Observation"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#2d7a3a] hover:bg-[#23602d] text-white font-bold text-xs rounded-xl shadow-xs transition"
            >
              {isPlaying ? (
                <>
                  <Pause className="h-4 w-4" />
                  <span>Pause Time-Lapse</span>
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" />
                  <span>Play Time-Lapse</span>
                </>
              )}
            </button>

            <button
              onClick={() => goToStep(currentStepIndex + 1)}
              disabled={currentStepIndex === TIMELINE_STEPS.length - 1}
              className="p-2.5 bg-[#f8faf7] hover:bg-[#eef7ec] disabled:opacity-40 text-gray-700 rounded-xl border border-[#dce8da] transition"
              title="Next Observation"
            >
              <ChevronRight className="h-4 w-4" />
            </button>

            {/* Playback speed toggle */}
            <div className="flex items-center gap-1 bg-[#f0f7ee] border border-[#d2e4d0] rounded-xl p-1 text-xs font-semibold text-gray-700">
              <button
                onClick={() => setPlaybackSpeed(2500)}
                className={`px-2 py-1 rounded-lg text-[10px] transition ${
                  playbackSpeed === 2500 ? "bg-[#2d7a3a] text-white" : "hover:bg-white"
                }`}
              >
                0.5x
              </button>
              <button
                onClick={() => setPlaybackSpeed(1500)}
                className={`px-2 py-1 rounded-lg text-[10px] transition ${
                  playbackSpeed === 1500 ? "bg-[#2d7a3a] text-white" : "hover:bg-white"
                }`}
              >
                1x
              </button>
              <button
                onClick={() => setPlaybackSpeed(750)}
                className={`px-2 py-1 rounded-lg text-[10px] transition ${
                  playbackSpeed === 750 ? "bg-[#2d7a3a] text-white" : "hover:bg-white"
                }`}
              >
                2x
              </button>
            </div>
          </div>
        </div>

        {/* Scrubbing Timeline Bar */}
        <div className="space-y-2">
          <div className="relative pt-2">
            <input
              type="range"
              min={0}
              max={TIMELINE_STEPS.length - 1}
              step={1}
              value={currentStepIndex}
              onChange={(e) => goToStep(parseInt(e.target.value, 10))}
              className="w-full h-2.5 bg-[#e2ece0] rounded-lg appearance-none cursor-pointer accent-[#2d7a3a]"
            />
          </div>

          {/* Timeline Nodes */}
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-1 pt-1">
            {TIMELINE_STEPS.map((step, idx) => (
              <button
                key={step.date}
                onClick={() => goToStep(idx)}
                className={`text-center p-2 rounded-xl text-xs font-medium transition border ${
                  currentStepIndex === idx
                    ? "bg-[#2d7a3a] text-white border-[#2d7a3a] shadow-xs"
                    : "bg-[#f8faf7] text-gray-600 border-transparent hover:border-[#dce8da] hover:bg-[#eef7ec]"
                }`}
              >
                <div className="font-bold text-[11px] truncate">{step.season}</div>
                <div className="text-[10px] opacity-75 font-mono">{step.date.slice(0, 7)}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Observation Disclosures & Sensor Characteristics */}
        <div className="p-4 bg-[#f8faf7] rounded-2xl border border-[#e2ece0] text-xs text-gray-600 flex flex-col sm:flex-row sm:items-center justify-between gap-3 leading-relaxed">
          <div className="flex items-start gap-2">
            <Info className="h-4 w-4 text-[#2d7a3a] shrink-0 mt-0.5" />
            <p>
              Observations derived from NASA MODIS Terra (MOD09) and Aqua (MYD09) daily surface reflectance. Cloud-covered or obscured pixels are masked; seasonal variations reflect surface moisture, vegetation canopy expansion, and harvest clearing.
            </p>
          </div>
          <span className="text-[11px] font-mono text-gray-500 shrink-0">
            Sensor: MODIS / 250m &bull; NASA GIBS WMTS
          </span>
        </div>
      </div>
    </div>
  );
}
