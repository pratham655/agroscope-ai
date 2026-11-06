"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import {
  Globe2,
  Calendar,
  Layers,
  MapPin,
  ArrowRight,
  Sparkles,
  Satellite,
  Compass,
  Boxes,
  Map as MapIcon,
} from "lucide-react";
import Link from "next/link";
import { type GlobeLocation } from "@/components/EarthGlobe3D";

// Dynamically import 3D Globe (SSR false for Three.js WebGL canvas safety)
const EarthGlobe3D = dynamic(() => import("@/components/EarthGlobe3D"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[620px] rounded-3xl bg-[#07130b] animate-pulse flex flex-col items-center justify-center text-emerald-400/80 gap-3 border border-[#234b32]">
      <Globe2 className="h-12 w-12 text-emerald-400 animate-spin" />
      <div className="text-sm font-bold text-white tracking-wide">
        Initializing Cinematic 3D Earth Intelligence Engine...
      </div>
      <div className="text-xs text-emerald-300/60 font-mono">
        Loading WebGL Shaders &bull; Atmospheric Rayleigh Scattering Model
      </div>
    </div>
  ),
});

// Dynamically import 2D Leaflet GIBS Explorer
const EarthExplorerMap = dynamic(() => import("@/components/EarthExplorerMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[540px] rounded-3xl bg-[#0f1f14] animate-pulse flex flex-col items-center justify-center text-white/60 gap-3 border border-[#d2e4d0]">
      <Globe2 className="h-10 w-10 text-[#86efac] animate-spin" />
      <div className="text-sm font-bold text-white tracking-wide">
        Connecting to NASA Global Imagery Browse Services (GIBS)...
      </div>
      <div className="text-xs text-white/50">Initializing EPSG:3857 Web Mercator Tile Matrix Level 9</div>
    </div>
  ),
});

const GLOBAL_SITES = [
  { name: "Kansas Winter Wheat Belt", country: "USA", lat: 38.34, lon: -98.12, crop: "Winter Wheat" },
  { name: "Punjab Indo-Gangetic Basin", country: "India", lat: 30.73, lon: 76.78, crop: "Wheat / Rice" },
  { name: "Central Valley Agro-District", country: "USA", lat: 36.75, lon: -119.77, crop: "Fruit & Nuts" },
  { name: "Mato Grosso Cerrado Soybean Bowl", country: "Brazil", lat: -12.54, lon: -55.71, crop: "Soybean / Corn" },
  { name: "Nile River Irrigated Delta", country: "Egypt", lat: 31.11, lon: 30.94, crop: "Cotton / Wheat" },
  { name: "Ukrainian Chernozem Steppe", country: "Ukraine", lat: 49.58, lon: 34.55, crop: "Wheat / Sunflower" },
  { name: "Murray-Darling Agricultural Basin", country: "Australia", lat: -34.28, lon: 146.04, crop: "Barley / Cotton" },
];

export default function ExplorerPage() {
  const [viewMode, setViewMode] = useState<"3d" | "2d">("3d");
  const [selectedCoords, setSelectedCoords] = useState<{ lat: number; lon: number }>({
    lat: 38.34,
    lon: -98.12,
  });
  const [obsDate, setObsDate] = useState("2024-06-15");

  const handleSelectSite = (site: typeof GLOBAL_SITES[0]) => {
    setSelectedCoords({ lat: site.lat, lon: site.lon });
  };

  const handleGlobeSelectSite = (site: GlobeLocation) => {
    setSelectedCoords({ lat: site.lat, lon: site.lon });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header Banner */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#dce8da] shadow-xs relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-linear-to-br from-[#2d7a3a]/10 via-[#0b3d91]/5 to-transparent rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#eef7ec] border border-[#d2e4d0] text-xs font-bold text-[#2d7a3a]">
              <Satellite className="h-3.5 w-3.5" />
              <span>NASA GIBS Global Earth Observation &bull; Cinematic 3D + 2D</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-[#1a2e1a] tracking-tight">
              Earth Explorer
            </h1>
            <p className="text-sm sm:text-base text-[#4a6741] leading-relaxed">
              Explore planetary observations across global agricultural watersheds. Orbit the photorealistic 3D Earth or stream calibrated NASA MODIS, VIIRS, and GPM satellite imagery at up to 250m daily ground resolution.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-end sm:items-center gap-3 shrink-0">
            {/* 2D / 3D Switcher Toggle */}
            <div className="flex p-1 bg-[#f0f7ee] border border-[#d2e4d0] rounded-2xl shadow-inner">
              <button
                onClick={() => setViewMode("3d")}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
                  viewMode === "3d"
                    ? "bg-[#2d7a3a] text-white shadow-xs"
                    : "text-[#4a6741] hover:text-[#1a2e1a]"
                }`}
              >
                <Boxes className="h-4 w-4" />
                <span>Cinematic 3D Globe</span>
              </button>
              <button
                onClick={() => setViewMode("2d")}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
                  viewMode === "2d"
                    ? "bg-[#2d7a3a] text-white shadow-xs"
                    : "text-[#4a6741] hover:text-[#1a2e1a]"
                }`}
              >
                <MapIcon className="h-4 w-4" />
                <span>2D Satellite Tiles</span>
              </button>
            </div>

            {/* Date selector for 2D tiles */}
            {viewMode === "2d" && (
              <div className="p-2.5 bg-[#f8faf7] rounded-2xl border border-[#e2ece0] text-xs">
                <span className="text-[10px] uppercase font-bold text-gray-400 block">Observation Date</span>
                <div className="flex items-center gap-2 mt-0.5">
                  <Calendar className="h-3.5 w-3.5 text-[#2d7a3a]" />
                  <input
                    type="date"
                    value={obsDate}
                    onChange={(e) => setObsDate(e.target.value)}
                    className="bg-transparent font-bold text-gray-800 outline-none text-xs"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Global Agricultural Site Preset Chips */}
        <div className="pt-6 mt-6 border-t border-[#eef4ed] flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold text-gray-500 mr-1 flex items-center gap-1">
            <Compass className="h-3.5 w-3.5 text-[#2d7a3a]" /> Global Benchmark Basins:
          </span>
          {GLOBAL_SITES.map((site) => (
            <button
              key={site.name}
              onClick={() => handleSelectSite(site)}
              className={`text-xs px-3 py-1.5 rounded-xl font-medium transition border flex items-center gap-1.5 ${
                Math.abs(selectedCoords.lat - site.lat) < 0.1 && Math.abs(selectedCoords.lon - site.lon) < 0.1
                  ? "bg-[#2d7a3a] text-white border-[#2d7a3a] shadow-xs"
                  : "bg-[#f8faf7] text-gray-700 border-[#dce8da] hover:bg-[#eef7ec] hover:text-[#2d7a3a]"
              }`}
            >
              <span>{site.name}</span>
              <span className="text-[10px] opacity-75 font-mono">({site.crop})</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Visualization Canvas: Toggle between 3D Globe and 2D GIBS Map */}
      {viewMode === "3d" ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-[#4a6741]">
            <span className="font-semibold flex items-center gap-1.5">
              <Boxes className="h-4 w-4 text-[#2d7a3a]" />
              Interactive Three.js 3D Earth &bull; Drag to rotate, scroll to zoom, click beacons to fly to coordinates
            </span>
            <button
              onClick={() => setViewMode("2d")}
              className="font-bold text-[#2d7a3a] hover:underline flex items-center gap-1"
            >
              <span>Switch to 2D GIBS Map</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
          <EarthGlobe3D onSelectSite={handleGlobeSelectSite} />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-[#4a6741]">
            <span className="font-semibold flex items-center gap-1.5">
              <MapIcon className="h-4 w-4 text-[#2d7a3a]" />
              NASA GIBS WMTS 2D Tile Stream &bull; MODIS TrueColor, Bands 7-2-1 Agriculture, VIIRS &amp; IMERG
            </span>
            <button
              onClick={() => setViewMode("3d")}
              className="font-bold text-[#2d7a3a] hover:underline flex items-center gap-1"
            >
              <span>Switch to 3D Globe View</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
          <EarthExplorerMap
            initialLat={selectedCoords.lat}
            initialLon={selectedCoords.lon}
            selectedDate={obsDate}
            onSelectCoords={(nLat, nLon) => setSelectedCoords({ lat: nLat, lon: nLon })}
          />
        </div>
      )}

      {/* Target Location Intelligence Hub */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Selected Coordinates Card */}
        <div className="bg-white rounded-3xl p-6 border border-[#dce8da] shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Spatial Target</span>
            <span className="p-2 rounded-xl bg-[#eef7ec] text-[#2d7a3a]">
              <MapPin className="h-4 w-4" />
            </span>
          </div>

          <div>
            <div className="text-xl font-extrabold font-mono text-[#1a2e1a]">
              {selectedCoords.lat.toFixed(4)}°, {selectedCoords.lon.toFixed(4)}°
            </div>
            <p className="text-xs text-[#4a6741] mt-1">
              {selectedCoords.lat >= 0 ? `${selectedCoords.lat.toFixed(4)}° North` : `${Math.abs(selectedCoords.lat).toFixed(4)}° South`},{" "}
              {selectedCoords.lon >= 0 ? `${selectedCoords.lon.toFixed(4)}° East` : `${Math.abs(selectedCoords.lon).toFixed(4)}° West`}
            </p>
          </div>

          <div className="pt-2">
            <Link
              href={`/analyze?lat=${selectedCoords.lat}&lon=${selectedCoords.lon}`}
              className="w-full flex items-center justify-center gap-2 py-3 bg-[#2d7a3a] hover:bg-[#23602d] text-white font-bold text-xs rounded-xl shadow-xs transition"
            >
              <span>Run Deep Field Analysis</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        {/* Adaptation & Simulation Cross-Link */}
        <div className="bg-white rounded-3xl p-6 border border-[#dce8da] shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Simulation Workspace</span>
            <span className="p-2 rounded-xl bg-blue-50 text-[#0b3d91]">
              <Sparkles className="h-4 w-4" />
            </span>
          </div>

          <div>
            <div className="text-base font-bold text-[#1a2e1a]">Simulate Climate Stress</div>
            <p className="text-xs text-[#4a6741] mt-1 leading-relaxed">
              Transfer these coordinates directly to the Farm Futures Lab to test hypothetical precipitation and temperature shifts.
            </p>
          </div>

          <div className="pt-2">
            <Link
              href={`/farm-futures?lat=${selectedCoords.lat}&lon=${selectedCoords.lon}`}
              className="w-full flex items-center justify-center gap-2 py-3 bg-[#f8faf7] hover:bg-[#eef7ec] text-[#2d7a3a] border border-[#dce8da] font-bold text-xs rounded-xl transition"
            >
              <span>Open Farm Futures Lab</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        {/* Satellite Time Machine Cross-Link */}
        <div className="bg-white rounded-3xl p-6 border border-[#dce8da] shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Satellite Time Machine</span>
            <span className="p-2 rounded-xl bg-purple-50 text-purple-700">
              <Layers className="h-4 w-4" />
            </span>
          </div>

          <div>
            <div className="text-base font-bold text-[#1a2e1a]">Interactive Time Machine</div>
            <p className="text-xs text-[#4a6741] mt-1 leading-relaxed">
              Step through historical seasonal imagery with split-slider before/after comparisons and automated time-lapse playback.
            </p>
          </div>

          <div className="pt-2">
            <Link
              href={`/time-machine?lat=${selectedCoords.lat}&lon=${selectedCoords.lon}`}
              className="w-full flex items-center justify-center gap-2 py-3 bg-[#f8faf7] hover:bg-purple-50 text-purple-800 border border-purple-200 font-bold text-xs rounded-xl transition"
            >
              <span>Launch Satellite Time Machine</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
