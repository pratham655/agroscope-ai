"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import {
  Globe2,
  Calendar,
  Layers,
  MapPin,
  ArrowRight,
  Satellite,
  Compass,
  Boxes,
  Map as MapIcon,
  FlaskConical,
  Clock,
  CheckCircle2,
} from "lucide-react";
import Link from "next/link";
import { type GlobeLocation } from "@/components/EarthGlobe3D";
import { useLocation } from "@/context/LocationContext";
import { SATELLITE_LAYERS, type GibsLayerKey } from "@/components/EarthExplorerMap";

// Dynamically import 3D Globe
const EarthGlobe3D = dynamic(() => import("@/components/EarthGlobe3D"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[640px] rounded-xl bg-slate-900 flex flex-col items-center justify-center text-emerald-400 gap-3 border border-slate-700">
      <Globe2 className="h-10 w-10 text-emerald-400 animate-spin" />
      <div className="text-sm font-bold text-white tracking-wide">
        Initializing 3D Planetary Earth Visualization...
      </div>
      <div className="text-xs text-slate-400 font-mono">
        Loading WebGL Rayleigh Atmospheric Shaders
      </div>
    </div>
  ),
});

// Dynamically import 2D Leaflet GIBS Explorer
const EarthExplorerMap = dynamic(() => import("@/components/EarthExplorerMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[640px] rounded-xl bg-slate-900 flex flex-col items-center justify-center text-white/70 gap-3 border border-slate-700">
      <Globe2 className="h-8 w-8 text-emerald-400 animate-spin" />
      <div className="text-sm font-bold text-white tracking-wide">
        Connecting to NASA Global Imagery Browse Services (GIBS)...
      </div>
      <div className="text-xs text-slate-400 font-mono">Streaming EPSG:3857 Web Mercator Tile Matrix</div>
    </div>
  ),
});

const GLOBAL_BENCHMARKS = [
  { name: "Kansas Wheat Belt", country: "USA", lat: 38.34, lon: -98.12, crop: "Winter Wheat" },
  { name: "Punjab Basin", country: "India", lat: 30.73, lon: 76.78, crop: "Wheat / Rice" },
  { name: "São Paulo Cerrado", country: "Brazil", lat: -23.5505, lon: -46.6333, crop: "Soybean / Cane" },
  { name: "Nairobi Highlands", country: "Kenya", lat: -1.2921, lon: 36.8219, crop: "Maize / Coffee" },
  { name: "Sydney Basin", country: "Australia", lat: -33.8688, lon: 151.2093, crop: "Barley / Cotton" },
];

export default function ExplorerPage() {
  const { currentLocation, openModal, setLocation } = useLocation();
  const [viewMode, setViewMode] = useState<"2d" | "3d">("2d");
  const [selectedCoords, setSelectedCoords] = useState<{ lat: number; lon: number }>(() => ({
    lat: currentLocation?.latitude ?? 30.73,
    lon: currentLocation?.longitude ?? 76.78,
  }));
  const [obsDate, setObsDate] = useState("2024-06-15");
  const [activeLayerKey, setActiveLayerKey] = useState<GibsLayerKey>("modis_bands721");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("mode") === "3d") {
        setViewMode("3d");
      }
    }
  }, []);

  useEffect(() => {
    if (currentLocation && typeof currentLocation.latitude === "number" && typeof currentLocation.longitude === "number") {
      setSelectedCoords({ lat: currentLocation.latitude, lon: currentLocation.longitude });
    }
  }, [currentLocation]);

  const activeLayerMeta = SATELLITE_LAYERS.find((l) => l.key === activeLayerKey) || SATELLITE_LAYERS[1];

  const handleGlobeSelectSite = (site: GlobeLocation) => {
    setSelectedCoords({ lat: site.lat, lon: site.lon });
    setLocation({
      latitude: site.lat,
      longitude: site.lon,
      label: site.name,
      crop: site.crop,
      source: "map",
    });
  };

  const handleMapSelectCoords = (nLat: number, nLon: number) => {
    setSelectedCoords({ lat: nLat, lon: nLon });
    setLocation({
      latitude: nLat,
      longitude: nLon,
      label: `Field at ${nLat.toFixed(4)}°, ${nLon.toFixed(4)}°`,
      source: "map",
    });
  };

  return (
    <div className="max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-8 py-5 space-y-4">
      {/* ── Feature Discovery Banner: Earth Explorer ────────────────── */}
      <div className="grad-explorer rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-3xl">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-white/20 text-white backdrop-blur-sm border border-white/30">
                Planetary Observation Workspace
              </span>
              <span className="text-xs text-cyan-200 font-mono">NASA GIBS WMTS Live</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
              See Earth From a Different Perspective.
            </h1>
            <p className="text-xs sm:text-sm text-cyan-100/90 leading-relaxed">
              Explore 2D cartographic projections and 3D planetary Earth swaths streaming directly from NASA&apos;s
              orbital fleet. Switch between MODIS agricultural false-color, VIIRS surface reflectance, GPM precipitation, and monthly NDVI vegetation metrics.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <span className="px-3 py-1.5 rounded-lg bg-black/25 backdrop-blur-md border border-white/20 text-xs font-mono text-cyan-200">
              EPSG:3857 &bull; 8 NASA Layers
            </span>
          </div>
        </div>
      </div>

      {/* ── Top Bar: Compact Title, Active Location, Date & 2D/3D Mode ─── */}
      <div className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-2xs flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#0d3b2e] flex items-center justify-center text-emerald-400 shrink-0">
            <Satellite className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-slate-900">Earth Explorer Command Center</h1>
              <span className="text-[10px] font-semibold uppercase text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                NASA GIBS WMTS
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Planetary satellite surveillance streaming calibrated NASA MODIS, VIIRS, and GPM swaths.
            </p>
          </div>
        </div>

        {/* Compact Right Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Active Location Button */}
          <button
            onClick={openModal}
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-800 transition cursor-pointer"
            title="Click to search global location"
          >
            <MapPin className="w-3.5 h-3.5 text-[#0d3b2e]" />
            <span className="max-w-[170px] truncate">
              {currentLocation?.label || `${selectedCoords.lat.toFixed(4)}°, ${selectedCoords.lon.toFixed(4)}°`}
            </span>
            <span className="text-[10px] text-slate-500 font-mono">
              ({selectedCoords.lat.toFixed(2)}°, {selectedCoords.lon.toFixed(2)}°)
            </span>
          </button>

          {/* Date Picker */}
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-slate-50 border border-slate-200 text-xs">
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-[10px] uppercase font-bold text-slate-400">Date</span>
            <input
              type="date"
              value={obsDate}
              onChange={(e) => setObsDate(e.target.value)}
              className="bg-transparent font-mono font-semibold text-slate-800 outline-none text-xs"
            />
          </div>

          {/* 2D / 3D Toggle */}
          <div className="flex p-0.5 bg-slate-100 border border-slate-200 rounded-md">
            <button
              onClick={() => setViewMode("2d")}
              className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold transition ${
                viewMode === "2d"
                  ? "bg-white text-[#0d3b2e] shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <MapIcon className="w-3.5 h-3.5" />
              <span>2D Satellite</span>
            </button>
            <button
              onClick={() => setViewMode("3d")}
              className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold transition ${
                viewMode === "3d"
                  ? "bg-white text-[#0d3b2e] shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Boxes className="w-3.5 h-3.5" />
              <span>3D Globe</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Main Workspace: 70% Map + 30% Satellite Layer Side Panel ──── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* Large Interactive Map (8 cols / ~68%) */}
        <div className="lg:col-span-8 space-y-2">
          {viewMode === "2d" ? (
            <EarthExplorerMap
              initialLat={selectedCoords.lat}
              initialLon={selectedCoords.lon}
              selectedDate={obsDate}
              onSelectCoords={handleMapSelectCoords}
              selectedLayerKey={activeLayerKey}
              onSelectLayer={setActiveLayerKey}
              hideInternalLayerSelector={true}
            />
          ) : (
            <EarthGlobe3D onSelectSite={handleGlobeSelectSite} />
          )}
        </div>

        {/* Dedicated Scientific Side Panel (4 cols / ~32%) */}
        <div className="lg:col-span-4 space-y-3">
          {/* Layer Selector Card */}
          <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#0d3b2e]" />
                <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  NASA Observation Layers
                </h2>
              </div>
              <span className="text-[10px] font-mono text-slate-500">8 Supported</span>
            </div>

            <div className="space-y-1.5 max-h-[360px] overflow-y-auto pr-1">
              {SATELLITE_LAYERS.map((layer) => {
                const isSelected = layer.key === activeLayerKey;
                return (
                  <button
                    key={layer.key}
                    onClick={() => setActiveLayerKey(layer.key)}
                    className={`w-full text-left p-2.5 rounded-lg border transition text-xs flex flex-col gap-0.5 cursor-pointer ${
                      isSelected
                        ? "border-[#0d3b2e] bg-slate-50 font-semibold text-slate-900 shadow-2xs"
                        : "border-slate-200 hover:bg-slate-50 text-slate-700"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">{layer.name}</span>
                      {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-[#0d3b2e]" />}
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono">
                      <span>{layer.sensor}</span>
                      <span>&bull;</span>
                      <span>{layer.resolution}</span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Active Layer Dossier */}
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
                <span>Active Instrument</span>
                <span className="font-mono text-slate-500">{activeLayerMeta.sensor}</span>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                {activeLayerMeta.description}
              </p>
              <div className="text-[10px] text-slate-500 font-mono pt-1 border-t border-slate-200">
                Tile Matrix: {activeLayerMeta.level} &bull; Native Zoom: {activeLayerMeta.maxNativeZoom}
              </div>
            </div>
          </div>

          {/* Preset Benchmark Quick Select */}
          <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">
              Preset Agro-Climatic Sites
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {GLOBAL_BENCHMARKS.map((b) => (
                <button
                  key={b.name}
                  onClick={() => {
                    setSelectedCoords({ lat: b.lat, lon: b.lon });
                    setLocation({
                      latitude: b.lat,
                      longitude: b.lon,
                      label: `${b.name}, ${b.country}`,
                      crop: b.crop,
                      source: "preset",
                    });
                  }}
                  className={`p-2 rounded-md border text-left text-xs transition ${
                    selectedCoords.lat === b.lat && selectedCoords.lon === b.lon
                      ? "border-[#0d3b2e] bg-slate-50 font-semibold text-slate-900"
                      : "border-slate-200 hover:bg-slate-50 text-slate-700"
                  }`}
                >
                  <div className="font-semibold truncate">{b.name}</div>
                  <div className="text-[10px] text-slate-500 truncate">{b.crop}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Below Map: Compact Shortcuts to Analytical Workspaces ─────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 pt-1">
        {/* Field Analysis Shortcut */}
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Biophysical Modeling
              </span>
              <Compass className="w-4 h-4 text-[#0d3b2e]" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">Field Intelligence Engine</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Run multivariate agroclimatic reanalysis, SPI-3 drought calculations, and crop rotation scoring for these exact coordinates.
            </p>
          </div>
          <div className="pt-3 mt-2 border-t border-slate-100">
            <Link
              href={`/analyze?lat=${selectedCoords.lat}&lon=${selectedCoords.lon}&label=${encodeURIComponent(currentLocation?.label || "Observation Target")}&autorun=true`}
              className="w-full flex items-center justify-center gap-1.5 py-2 bg-[#0d3b2e] hover:bg-[#134e39] text-white font-semibold text-xs rounded-md shadow-2xs transition"
            >
              <span>Analyze Active Coordinates</span>
              <ArrowRight className="w-3.5 h-3.5 text-emerald-400" />
            </Link>
          </div>
        </div>

        {/* Farm Futures Shortcut */}
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Climate Perturbation
              </span>
              <FlaskConical className="w-4 h-4 text-[#0d3b2e]" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">Farm Futures Lab</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Simulate rainfall deficits (-80% to +100%) and thermal forcing (-4°C to +6°C) against historical baselines.
            </p>
          </div>
          <div className="pt-3 mt-2 border-t border-slate-100">
            <Link
              href="/farm-futures"
              className="w-full flex items-center justify-center gap-1.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-900 font-semibold text-xs rounded-md transition"
            >
              <span>Launch Climate Lab</span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-600" />
            </Link>
          </div>
        </div>

        {/* Satellite Time Machine Shortcut */}
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Historical Archive
              </span>
              <Clock className="w-4 h-4 text-[#0d3b2e]" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">Satellite Time Machine</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Step through multi-year orbital imagery and seasonal vegetation transitions across 2021–present archives.
            </p>
          </div>
          <div className="pt-3 mt-2 border-t border-slate-100">
            <Link
              href="/time-machine"
              className="w-full flex items-center justify-center gap-1.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-900 font-semibold text-xs rounded-md transition"
            >
              <span>Explore Historical Timeline</span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-600" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
