"use client";

import { useState, useEffect } from "react";
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
import { useLocation } from "@/context/LocationContext";

// Dynamically import 3D Globe (SSR false for Three.js WebGL canvas safety)
const EarthGlobe3D = dynamic(() => import("@/components/EarthGlobe3D"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[640px] rounded-3xl bg-[#07130b] animate-pulse flex flex-col items-center justify-center text-emerald-400/80 gap-3 border border-[#234b32]">
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
    <div className="w-full h-[640px] rounded-3xl bg-[#0f1f14] animate-pulse flex flex-col items-center justify-center text-white/60 gap-3 border border-[#d2e4d0]">
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
  { name: "Chennai Agro-District", country: "India", lat: 13.0827, lon: 80.2707, crop: "Paddy / Groundnut" },
  { name: "São Paulo State", country: "Brazil", lat: -23.5505, lon: -46.6333, crop: "Soybean / Sugarcane" },
  { name: "Nairobi Highlands Basin", country: "Kenya", lat: -1.2921, lon: 36.8219, crop: "Maize / Coffee" },
  { name: "Sydney / Murray Basin", country: "Australia", lat: -33.8688, lon: 151.2093, crop: "Barley / Cotton" },
  { name: "Central Valley Agro-District", country: "USA", lat: 36.75, lon: -119.77, crop: "Fruit & Nuts" },
  { name: "Nile River Irrigated Delta", country: "Egypt", lat: 31.11, lon: 30.94, crop: "Cotton / Wheat" },
];

export default function ExplorerPage() {
  const { currentLocation, openModal, setLocation } = useLocation();
  // Default to 2D for immediate map-first satellite rendering
  const [viewMode, setViewMode] = useState<"2d" | "3d">("2d");
  const [selectedCoords, setSelectedCoords] = useState<{ lat: number; lon: number }>(() => ({
    lat: currentLocation?.latitude ?? 30.73,
    lon: currentLocation?.longitude ?? 76.78,
  }));
  const [obsDate, setObsDate] = useState("2024-06-15");

  // Allow ?mode=3d in URL query params
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("mode") === "3d") {
        setViewMode("3d");
      }
    }
  }, []);

  // Sync with universal LocationContext
  useEffect(() => {
    if (currentLocation && typeof currentLocation.latitude === "number" && typeof currentLocation.longitude === "number") {
      setSelectedCoords({ lat: currentLocation.latitude, lon: currentLocation.longitude });
    }
  }, [currentLocation]);

  const handleSelectSite = (site: typeof GLOBAL_SITES[0]) => {
    setSelectedCoords({ lat: site.lat, lon: site.lon });
    setLocation({
      latitude: site.lat,
      longitude: site.lon,
      label: `${site.name}, ${site.country}`,
      crop: site.crop,
      source: "preset",
    });
  };

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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* 1 & 2 & 3 & 4: Compact Earth Explorer Heading, Location Control, Date, and 2D/3D View Selector */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#dce8da] shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Title & Badge */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-[#eef7ec] text-[#2d7a3a]">
              <Satellite className="h-4 w-4" />
            </span>
            <h1 className="text-xl sm:text-2xl font-extrabold text-[#1a2e1a] tracking-tight">
              Earth Explorer
            </h1>
            <span className="text-[10px] uppercase font-bold text-[#2d7a3a] bg-[#eef7ec] px-2.5 py-0.5 rounded-full border border-[#d2e4d0]">
              NASA GIBS &bull; EPSG:3857 &bull; 250m
            </span>
          </div>
          <p className="text-xs text-[#4a6741]">
            Global satellite surveillance streaming daily calibrated NASA MODIS, VIIRS, and GPM planetary imagery.
          </p>
        </div>

        {/* Compact Right Controls: Active Location Chip + Date Selector + 2D/3D Switcher */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Active Global Location Pill */}
          <button
            onClick={openModal}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#f8faf7] hover:bg-[#eef7ec] border border-[#dce8da] text-xs font-semibold text-[#1a2e1a] transition cursor-pointer shadow-2xs"
            title="Click to search global location or input custom coordinates"
          >
            <MapPin className="h-3.5 w-3.5 text-[#2d7a3a]" />
            <span className="max-w-[180px] sm:max-w-[220px] truncate font-medium">
              {currentLocation?.label || `${selectedCoords.lat.toFixed(4)}°, ${selectedCoords.lon.toFixed(4)}°`}
            </span>
            <span className="text-[10px] text-[#2d7a3a] font-bold underline ml-0.5">Change</span>
          </button>

          {/* Date Picker */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#f8faf7] border border-[#dce8da] text-xs">
            <Calendar className="h-3.5 w-3.5 text-[#2d7a3a]" />
            <span className="text-[10px] uppercase font-bold text-gray-400 mr-1">Date</span>
            <input
              type="date"
              value={obsDate}
              onChange={(e) => setObsDate(e.target.value)}
              className="bg-transparent font-mono font-bold text-gray-800 outline-none text-xs"
            />
          </div>

          {/* 2D / 3D View Selector */}
          <div className="flex p-0.5 bg-[#f0f7ee] border border-[#d2e4d0] rounded-xl shadow-inner">
            <button
              onClick={() => setViewMode("2d")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                viewMode === "2d"
                  ? "bg-[#2d7a3a] text-white shadow-xs"
                  : "text-[#4a6741] hover:text-[#1a2e1a]"
              }`}
            >
              <MapIcon className="h-3.5 w-3.5" />
              <span>2D Satellite</span>
            </button>
            <button
              onClick={() => setViewMode("3d")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                viewMode === "3d"
                  ? "bg-[#2d7a3a] text-white shadow-xs"
                  : "text-[#4a6741] hover:text-[#1a2e1a]"
              }`}
            >
              <Boxes className="h-3.5 w-3.5" />
              <span>3D Globe</span>
            </button>
          </div>
        </div>
      </div>

      {/* 5. Central Interactive Visual Showcase: Large 2D Satellite Map or 3D Earth Globe */}
      <div className="w-full">
        {viewMode === "2d" ? (
          <div className="space-y-2">
            <EarthExplorerMap
              initialLat={selectedCoords.lat}
              initialLon={selectedCoords.lon}
              selectedDate={obsDate}
              onSelectCoords={handleMapSelectCoords}
            />
          </div>
        ) : (
          <div className="space-y-2">
            <EarthGlobe3D onSelectSite={handleGlobeSelectSite} />
          </div>
        )}
      </div>

      {/* 7 & 8: Contextual Analysis Panels & Supporting Feature Cards (Below the Map) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Spatial Target Card */}
        <div className="bg-white rounded-2xl p-5 border border-[#dce8da] shadow-xs flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Target Coordinate</span>
              <span className="p-1.5 rounded-lg bg-[#eef7ec] text-[#2d7a3a]">
                <MapPin className="h-4 w-4" />
              </span>
            </div>
            <div>
              <div className="text-xl font-extrabold font-mono text-[#1a2e1a]">
                {selectedCoords.lat.toFixed(4)}°, {selectedCoords.lon.toFixed(4)}°
              </div>
              <p className="text-xs text-[#4a6741] mt-0.5">
                {selectedCoords.lat >= 0 ? `${selectedCoords.lat.toFixed(4)}° North` : `${Math.abs(selectedCoords.lat).toFixed(4)}° South`},{" "}
                {selectedCoords.lon >= 0 ? `${selectedCoords.lon.toFixed(4)}° East` : `${Math.abs(selectedCoords.lon).toFixed(4)}° West`}
              </p>
            </div>
          </div>
          <div className="pt-4">
            <Link
              href={`/analyze?lat=${selectedCoords.lat}&lon=${selectedCoords.lon}&label=${encodeURIComponent(currentLocation?.label || "Observation Target")}&autorun=true`}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#2d7a3a] hover:bg-[#23602d] text-white font-bold text-xs rounded-xl shadow-xs transition"
            >
              <span>Run Deep Field Analysis</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        {/* Farm Futures Lab Shortcut */}
        <div className="bg-white rounded-2xl p-5 border border-[#dce8da] shadow-xs flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Climate Stress Lab</span>
              <span className="p-1.5 rounded-lg bg-blue-50 text-[#0b3d91]">
                <Sparkles className="h-4 w-4" />
              </span>
            </div>
            <div>
              <div className="text-base font-bold text-[#1a2e1a]">Farm Futures Simulation</div>
              <p className="text-xs text-[#4a6741] mt-0.5 leading-relaxed">
                Test hypothetical drought perturbations, temperature shocks, and irrigation adaptations at these coordinates.
              </p>
            </div>
          </div>
          <div className="pt-4">
            <Link
              href={`/farm-futures?lat=${selectedCoords.lat}&lon=${selectedCoords.lon}`}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#f8faf7] hover:bg-[#eef7ec] text-[#2d7a3a] border border-[#dce8da] font-bold text-xs rounded-xl transition"
            >
              <span>Open Farm Futures Lab</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        {/* Satellite Time Machine Shortcut */}
        <div className="bg-white rounded-2xl p-5 border border-[#dce8da] shadow-xs flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Multi-Year Chronology</span>
              <span className="p-1.5 rounded-lg bg-purple-50 text-purple-700">
                <Layers className="h-4 w-4" />
              </span>
            </div>
            <div>
              <div className="text-base font-bold text-[#1a2e1a]">Satellite Time Machine</div>
              <p className="text-xs text-[#4a6741] mt-0.5 leading-relaxed">
                Scrub across 2021–2024 historical observation archives with dual-epoch split comparison and seasonal time-lapses.
              </p>
            </div>
          </div>
          <div className="pt-4">
            <Link
              href={`/time-machine?lat=${selectedCoords.lat}&lon=${selectedCoords.lon}`}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#f8faf7] hover:bg-purple-50 text-purple-800 border border-purple-200 font-bold text-xs rounded-xl transition"
            >
              <span>Launch Satellite Time Machine</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* Global Benchmark Basins Quick-Select Drawer (Subordinate, below the map & feature cards) */}
      <div className="bg-white rounded-2xl p-4 border border-[#e2ece0] shadow-xs">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold text-gray-500 mr-2 flex items-center gap-1.5">
            <Compass className="h-3.5 w-3.5 text-[#2d7a3a]" /> Quick Preset Teleport:
          </span>
          {GLOBAL_SITES.map((site) => (
            <button
              key={site.name}
              onClick={() => handleSelectSite(site)}
              className={`text-xs px-3 py-1 rounded-xl font-medium transition border flex items-center gap-1.5 ${
                Math.abs(selectedCoords.lat - site.lat) < 0.05 && Math.abs(selectedCoords.lon - site.lon) < 0.05
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
    </div>
  );
}
