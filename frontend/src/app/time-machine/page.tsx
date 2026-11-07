"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import {
  Clock,
  MapPin,
  Calendar,
  Layers,
  ArrowRight,
  Sparkles,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { useLocation } from "@/context/LocationContext";
import GlobalLocationBar from "@/components/GlobalLocationBar";

// Dynamic import for Leaflet-based Time Machine Map
const SatelliteTimeMachineMap = dynamic(() => import("@/components/SatelliteTimeMachineMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[540px] rounded-3xl bg-[#07130b] animate-pulse flex flex-col items-center justify-center text-emerald-400 gap-3 border border-[#234b32]">
      <Clock className="h-12 w-12 text-emerald-400 animate-spin" />
      <div className="text-sm font-bold text-white tracking-wide">
        Calibrating Satellite Time Machine Chronological Sequence...
      </div>
      <div className="text-xs text-emerald-300/60 font-mono">
        Querying NASA GIBS EPSG:3857 Tile Archive (2021–2024)
      </div>
    </div>
  ),
});

const PRESET_BREADBASKETS = [
  { label: "Kansas Wheat Belt, USA", lat: 38.34, lon: -98.12, crop: "Winter Wheat", note: "Ogallala Aquifer / Great Plains" },
  { label: "Punjab Plain, India", lat: 30.73, lon: 76.78, crop: "Rice / Wheat", note: "Indo-Gangetic Basin" },
  { label: "Mato Grosso Cerrado, Brazil", lat: -12.54, lon: -55.71, crop: "Soybean Frontier", note: "Tropical Agricultural Frontier" },
  { label: "Nile Delta Irrigated Basin, Egypt", lat: 31.11, lon: 30.94, crop: "Cotton / Wheat", note: "Intensive Alluvial Delta" },
  { label: "Po Valley Cereal Plain, Italy", lat: 45.13, lon: 10.02, crop: "Maize & Forage", note: "Northern Mediterranean Lowland" },
];

export default function TimeMachinePage() {
  const { currentLocation } = useLocation();
  const [lat, setLat] = useState(() => (currentLocation ? String(currentLocation.latitude) : "38.34"));
  const [lon, setLon] = useState(() => (currentLocation ? String(currentLocation.longitude) : "-98.12"));
  const [currentObsDate, setCurrentObsDate] = useState("2024-07-15");

  // Sync with universal LocationContext
  useEffect(() => {
    if (currentLocation && typeof currentLocation.latitude === "number" && typeof currentLocation.longitude === "number") {
      setLat(String(currentLocation.latitude));
      setLon(String(currentLocation.longitude));
    }
  }, [currentLocation]);

  const handleSelectPreset = (b: typeof PRESET_BREADBASKETS[0]) => {
    setLat(String(b.lat));
    setLon(String(b.lon));
  };

  const latN = parseFloat(lat) || 38.34;
  const lonN = parseFloat(lon) || -98.12;

  return (
    <div className="min-h-screen bg-[#f8faf5]">
      {/* Hero Header */}
      <div className="bg-linear-to-b from-[#0c1b12] via-[#12281a] to-[#183624] text-white py-12 px-4 sm:px-6 lg:px-8 border-b border-[#234b32]">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-emerald-500/20 border border-emerald-400/30 text-emerald-300">
                <Clock className="h-5 w-5" />
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-300 bg-emerald-950/60 px-3 py-1 rounded-full border border-emerald-800/60">
                NASA GIBS Multi-Year Observation Archive
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-emerald-200/80">
              <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Calibrated Daily Surface Reflectance &bull; 2021–2024 Time-Lapse Trajectories</span>
            </div>
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white mb-3">
            Satellite Time Machine
          </h1>
          <p className="text-base text-emerald-100/90 max-w-3xl leading-relaxed">
            Investigate multi-year agricultural landscape shifts across global farming basins. Step through authentic NASA MODIS and VIIRS satellite imagery, animate seasonal vegetative growth cycles, and assess land-use changes.
          </p>

          {/* Quick Presets */}
          <div className="mt-6 flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-emerald-300/80 mr-1 flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" /> Benchmark Basins:
            </span>
            {PRESET_BREADBASKETS.map((b) => (
              <button
                key={b.label}
                onClick={() => handleSelectPreset(b)}
                className={`text-xs px-3 py-1.5 rounded-full border transition flex items-center gap-1.5 ${
                  Math.abs(latN - b.lat) < 0.1 && Math.abs(lonN - b.lon) < 0.1
                    ? "bg-emerald-600 text-white border-emerald-400 shadow-md"
                    : "bg-white/10 hover:bg-white/20 border-white/15 text-emerald-100"
                }`}
              >
                <span>{b.label}</span>
                <span className="text-[10px] text-emerald-300/80">({b.crop})</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Universal Global Location Context Bar */}
        <GlobalLocationBar />

        {/* Coordinate Input Bar */}
        <div className="bg-white rounded-2xl p-5 border border-[#e2ece0] shadow-xs">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                Target Latitude (°N)
              </label>
              <input
                value={lat}
                onChange={(e) => setLat(e.target.value)}
                placeholder="38.34"
                className="w-full px-3.5 py-2 text-sm bg-gray-50/50 border border-[#e2ece0] rounded-xl outline-none focus:ring-2 focus:ring-[#2d7a3a] focus:bg-white transition"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                Target Longitude (°E)
              </label>
              <input
                value={lon}
                onChange={(e) => setLon(e.target.value)}
                placeholder="-98.12"
                className="w-full px-3.5 py-2 text-sm bg-gray-50/50 border border-[#e2ece0] rounded-xl outline-none focus:ring-2 focus:ring-[#2d7a3a] focus:bg-white transition"
              />
            </div>
            <div className="flex items-center gap-3">
              <Link
                href={`/change-detective?lat=${latN}&lon=${lonN}`}
                className="w-full py-2.5 px-4 bg-[#f8faf7] hover:bg-[#eef7ec] text-[#2d7a3a] border border-[#dce8da] font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5"
              >
                <Layers className="h-3.5 w-3.5" />
                <span>Dual Split Detective</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Primary Interactive Satellite Time-Lapse Component */}
        <SatelliteTimeMachineMap
          latitude={latN}
          longitude={lonN}
          initialDate={currentObsDate}
          onDateChange={(d) => setCurrentObsDate(d)}
        />

        {/* Climatological Context & Adaptation Insights Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-3xl p-6 border border-[#e2ece0] shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                Observation Date
              </span>
              <Calendar className="h-4 w-4 text-[#2d7a3a]" />
            </div>
            <div className="text-2xl font-extrabold text-[#1a2e1a] font-mono">
              {currentObsDate}
            </div>
            <p className="text-xs text-gray-500 leading-relaxed">
              Observation rendered at true nadir optical or false-color agricultural reflectance. Cloud shadows and atmospheric haze are handled by NASA GIBS processing pipelines.
            </p>
          </div>

          <div className="bg-white rounded-3xl p-6 border border-[#e2ece0] shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                Sensor Provenance
              </span>
              <ShieldCheck className="h-4 w-4 text-[#2d7a3a]" />
            </div>
            <div className="text-base font-bold text-[#1a2e1a]">
              MODIS Terra &bull; 250m Resolution
            </div>
            <p className="text-xs text-gray-500 leading-relaxed">
              Corrected Reflectance Bands 7-2-1 utilizes shortwave infrared (Band 7), near-infrared (Band 2), and red (Band 1) to clearly distinguish vegetated cropland from bare soil.
            </p>
          </div>

          <div className="bg-white rounded-3xl p-6 border border-[#e2ece0] shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                Adaptation Pipeline
              </span>
              <Sparkles className="h-4 w-4 text-[#2d7a3a]" />
            </div>
            <div className="text-base font-bold text-[#1a2e1a]">
              Simulate Future Shifts
            </div>
            <p className="text-xs text-gray-500 leading-relaxed">
              Observed historical trends inform climate stress simulations in the Farm Futures Lab to evaluate future crop shifts.
            </p>
            <div className="pt-1">
              <Link
                href={`/farm-futures?lat=${latN}&lon=${lonN}`}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#2d7a3a] hover:underline"
              >
                <span>Simulate Climate Scenarios</span>
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
