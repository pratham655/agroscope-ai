"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import {
  Clock,
  Calendar,
  Layers,
  ArrowRight,
  ShieldCheck,
  Compass,
} from "lucide-react";
import Link from "next/link";
import { useLocation } from "@/context/LocationContext";

const SatelliteTimeMachineMap = dynamic(() => import("@/components/SatelliteTimeMachineMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[540px] rounded-xl bg-slate-900 flex flex-col items-center justify-center text-slate-300 gap-2 border border-slate-700">
      <Clock className="h-8 w-8 text-emerald-400 animate-spin" />
      <div className="text-xs font-semibold text-white">
        Calibrating Satellite Time Machine Chronological Sequence...
      </div>
      <div className="text-[10px] text-slate-400 font-mono">
        Querying NASA GIBS EPSG:3857 Tile Archive (2021–Present)
      </div>
    </div>
  ),
});

const PRESET_BREADBASKETS = [
  { label: "Kansas Wheat Belt, USA", lat: 38.34, lon: -98.12, crop: "Winter Wheat" },
  { label: "Punjab Plain, India", lat: 30.73, lon: 76.78, crop: "Rice / Wheat" },
  { label: "Mato Grosso Cerrado, Brazil", lat: -12.54, lon: -55.71, crop: "Soybean Frontier" },
  { label: "Nile Delta, Egypt", lat: 31.11, lon: 30.94, crop: "Cotton / Wheat" },
  { label: "Po Valley, Italy", lat: 45.13, lon: 10.02, crop: "Maize & Forage" },
];

export default function TimeMachinePage() {
  const { currentLocation, setLocation } = useLocation();
  const [lat, setLat] = useState(() => (currentLocation ? String(currentLocation.latitude) : "38.34"));
  const [lon, setLon] = useState(() => (currentLocation ? String(currentLocation.longitude) : "-98.12"));
  const [currentObsDate, setCurrentObsDate] = useState("2024-07-15");

  useEffect(() => {
    if (currentLocation && typeof currentLocation.latitude === "number" && typeof currentLocation.longitude === "number") {
      setLat(String(currentLocation.latitude));
      setLon(String(currentLocation.longitude));
    }
  }, [currentLocation]);

  const handleSelectPreset = (b: (typeof PRESET_BREADBASKETS)[0]) => {
    setLat(String(b.lat));
    setLon(String(b.lon));
    setLocation({
      latitude: b.lat,
      longitude: b.lon,
      label: b.label,
      crop: b.crop,
      source: "preset",
    });
  };

  const latN = parseFloat(lat) || 38.34;
  const lonN = parseFloat(lon) || -98.12;

  return (
    <div className="max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-8 py-5 space-y-5">
      {/* ── Feature Discovery Banner: Satellite Time Machine ─────────── */}
      <div className="grad-time rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-3xl">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-white/20 text-white backdrop-blur-sm border border-white/30">
                Multi-Year Chronological Sequence
              </span>
              <span className="text-xs text-amber-200 font-mono">NASA GIBS · MODIS · VIIRS (2021–Present)</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
              Satellite Time Machine: Historical Orbital Chronology & Time-Lapse Scrubbing
            </h1>
            <p className="text-xs sm:text-sm text-amber-100/90 leading-relaxed">
              Step through authentic multi-year satellite observations across global agricultural breadbaskets. Scrub through seasonal vegetative growth cycles, analyze inter-annual crop rotations, and observe land transformation over time.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <span className="px-3 py-1.5 rounded-lg bg-black/25 backdrop-blur-md border border-white/20 text-xs font-mono text-amber-200">
              EPSG:3857 &bull; Daily Satellite Archive
            </span>
          </div>
        </div>
      </div>

      {/* ── Top Bar: Workspace Controls ────────────────────────────── */}
      <div className="bg-white rounded-xl p-4 sm:p-5 border border-slate-200 shadow-2xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-[#0d3b2e] text-emerald-400">
              <Clock className="h-4 w-4" />
            </span>
            <h2 className="text-lg font-bold tracking-tight text-slate-900">
              Time-Lapse Controls & Chronology
            </h2>
            <span className="text-[10px] font-semibold uppercase text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              Multi-Year Chronological Sequence
            </span>
          </div>
          <p className="text-xs text-slate-500 max-w-3xl leading-relaxed">
            Investigate multi-year agricultural landscape shifts across global farming basins. Step through authentic NASA MODIS and VIIRS satellite imagery, animate seasonal vegetative growth cycles, and assess land-use changes.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Link
            href={`/change-detective?lat=${latN}&lon=${lonN}`}
            className="flex items-center gap-1.5 px-3 py-2 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold border border-slate-200 transition"
          >
            <Layers className="w-3.5 h-3.5 text-slate-600" />
            <span>Dual Split Detective</span>
          </Link>
        </div>
      </div>

      {/* ── Coordinate Console ───────────────────────────────────────── */}
      <div className="bg-white rounded-xl p-4 sm:p-5 border border-slate-200 shadow-2xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
          <span className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
            <Compass className="w-3.5 h-3.5 text-[#0d3b2e]" />
            <span>Target Observation Coordinates</span>
          </span>
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] uppercase font-bold text-slate-400 mr-1">Presets:</span>
            {PRESET_BREADBASKETS.map((b) => (
              <button
                key={b.label}
                onClick={() => handleSelectPreset(b)}
                className={`text-[11px] px-2 py-0.5 rounded-md border transition ${
                  Math.abs(latN - b.lat) < 0.1 && Math.abs(lonN - b.lon) < 0.1
                    ? "bg-[#0d3b2e] text-white border-[#0d3b2e]"
                    : "border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700"
                }`}
              >
                {b.label.split(",")[0]}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
          <div>
            <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
              Target Latitude (°N)
            </label>
            <input
              value={lat}
              onChange={(e) => setLat(e.target.value)}
              placeholder="38.34"
              className="w-full px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-md outline-none focus:border-[#0d3b2e] focus:bg-white transition"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
              Target Longitude (°E)
            </label>
            <input
              value={lon}
              onChange={(e) => setLon(e.target.value)}
              placeholder="-98.12"
              className="w-full px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-md outline-none focus:border-[#0d3b2e] focus:bg-white transition"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
              Active Observation Date
            </label>
            <div className="px-3 py-2 text-xs font-mono bg-slate-100 border border-slate-200 rounded-md text-slate-800 font-semibold">
              {currentObsDate}
            </div>
          </div>
          <div>
            <Link
              href={`/analyze?lat=${latN}&lon=${lonN}&autorun=true`}
              className="w-full py-2 px-4 bg-[#0d3b2e] hover:bg-[#134e39] text-white font-semibold text-xs rounded-md shadow-2xs transition flex items-center justify-center gap-1.5"
            >
              <span>Analyze Field Telemetry</span>
              <ArrowRight className="w-3.5 h-3.5 text-emerald-400" />
            </Link>
          </div>
        </div>
      </div>

      {/* ── Primary Time Machine Interactive Map ─────────────────────── */}
      <div className="space-y-2">
        <SatelliteTimeMachineMap
          latitude={latN}
          longitude={lonN}
          initialDate={currentObsDate}
          onDateChange={(d) => setCurrentObsDate(d)}
        />
      </div>

      {/* ── Provenance & Adaptation Context Cards ────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Timeline Index
            </span>
            <Calendar className="h-4 w-4 text-[#0d3b2e]" />
          </div>
          <div className="text-xl font-bold text-slate-900 font-mono">
            {currentObsDate}
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">
            Observation rendered at true nadir optical or false-color agricultural reflectance via NASA GIBS EPSG:3857 tile services.
          </p>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Sensor Provenance
            </span>
            <ShieldCheck className="h-4 w-4 text-[#0d3b2e]" />
          </div>
          <div className="text-sm font-bold text-slate-900">
            MODIS Terra &bull; 250m Swath
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">
            Corrected Reflectance Bands 7-2-1 utilizes shortwave infrared, near-infrared, and red to clearly delineate vegetated cropland from bare soils.
          </p>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Adaptation Modeling
            </span>
            <Compass className="h-4 w-4 text-[#0d3b2e]" />
          </div>
          <div className="text-sm font-bold text-slate-900">
            Climate Shift Lab
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">
            Observed historical vegetative shifts inform climate stress simulations in the Farm Futures Lab to evaluate future rotation viability.
          </p>
          <div className="pt-1">
            <Link
              href={`/farm-futures?lat=${latN}&lon=${lonN}`}
              className="text-xs font-semibold text-[#0d3b2e] hover:underline flex items-center gap-1"
            >
              <span>Simulate in Climate Lab</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
