"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import {
  AlertTriangle,
  Waves,
  ShieldCheck,
  Compass,
} from "lucide-react";
import { getWaterIntelligence, type WaterIntelligenceResult } from "@/lib/api";
import { useLocation } from "@/context/LocationContext";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  ReferenceLine,
} from "recharts";

const DEMO_LOCATIONS = [
  { label: "Kansas Wheat Belt, USA", lat: 38.34, lon: -98.12, crop: "Winter Wheat" },
  { label: "Murray-Darling Basin, AU", lat: -34.5, lon: 145.5, crop: "Cotton / Rice" },
  { label: "Punjab, India", lat: 30.73, lon: 76.78, crop: "Wheat / Basmati Rice" },
  { label: "Sahel Zone, Burkina Faso", lat: 12.0, lon: 2.5, crop: "Sorghum / Millet" },
  { label: "São Paulo State, Brazil", lat: -22.5, lon: -48.0, crop: "Soybean / Sugarcane" },
];

export default function WaterIntelPage() {
  const { currentLocation } = useLocation();
  const [lat, setLat] = useState(() => (currentLocation ? String(currentLocation.latitude) : "38.34"));
  const [lon, setLon] = useState(() => (currentLocation ? String(currentLocation.longitude) : "-98.12"));
  const [startDate, setStartDate] = useState("2023-01-01");
  const [endDate, setEndDate] = useState("2023-12-31");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<WaterIntelligenceResult | null>(null);

  useEffect(() => {
    if (currentLocation && typeof currentLocation.latitude === "number" && typeof currentLocation.longitude === "number") {
      setLat(String(currentLocation.latitude));
      setLon(String(currentLocation.longitude));
    }
  }, [currentLocation]);

  const fetchData = useCallback(async () => {
    const latN = parseFloat(lat);
    const lonN = parseFloat(lon);
    if (isNaN(latN) || isNaN(lonN)) {
      setError("Please enter valid decimal coordinates (Latitude -90..90, Longitude -180..180).");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await getWaterIntelligence({
        latitude: latN,
        longitude: lonN,
        startDate,
        endDate,
      });
      setResult(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load water intelligence telemetry.");
    } finally {
      setLoading(false);
    }
  }, [lat, lon, startDate, endDate]);

  useEffect(() => {
    let active = true;
    const initialLat = currentLocation?.latitude ?? 38.34;
    const initialLon = currentLocation?.longitude ?? -98.12;
    getWaterIntelligence({
      latitude: initialLat,
      longitude: initialLon,
      startDate: "2023-01-01",
      endDate: "2023-12-31",
    })
      .then((data) => {
        if (active) setResult(data);
      })
      .catch((e: unknown) => {
        if (active) setError(e instanceof Error ? e.message : "Failed to load water intelligence telemetry.");
      });

    return () => {
      active = false;
    };
  }, [currentLocation]);

  const timeseriesData = useMemo(() => {
    if (!result) return [];
    return result.dates.map((d, i) => ({
      date: d,
      soil_wetness_root_zone: result.gwetroot_series[i] ?? 0,
      soil_wetness_surface: result.gwettop_series[i] ?? 0,
      precipitation_mm: result.precip_series[i] ?? 0,
    }));
  }, [result]);

  return (
    <div className="max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-8 py-5 space-y-5">
      {/* ── Feature Discovery Banner: Smart Water Intelligence ───────── */}
      <div className="grad-water rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-3xl">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-white/20 text-white backdrop-blur-sm border border-white/30">
                Hydrological Precision Workspace
              </span>
              <span className="text-xs text-cyan-200 font-mono">MERRA-2 · SMAP Hydrology · FAO-56</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
              Root-Zone Moisture & Irrigation Intelligence
            </h1>
            <p className="text-xs sm:text-sm text-cyan-100/90 leading-relaxed">
              Track 0–100 cm root-zone soil wetness, surface evaporation losses, and meteorological dry spells to guide precision deficit irrigation schedules and avoid irreversible wilting stress.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <span className="px-3 py-1.5 rounded-lg bg-black/25 backdrop-blur-md border border-white/20 text-xs font-mono text-cyan-200">
              GWETROOT / GWETTOP &bull; Daily Inflow
            </span>
          </div>
        </div>
      </div>

      {/* ── Coordinate & Temporal Console ────────────────────────────── */}
      <div className="bg-white rounded-xl p-4 sm:p-5 border border-slate-200 shadow-2xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
          <span className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
            <Compass className="w-3.5 h-3.5 text-[#0d3b2e]" />
            <span>Target Hydrological Coordinates</span>
          </span>
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] uppercase font-bold text-slate-400 mr-1">Presets:</span>
            {DEMO_LOCATIONS.map((loc) => (
              <button
                key={loc.label}
                onClick={() => {
                  setLat(String(loc.lat));
                  setLon(String(loc.lon));
                }}
                className="text-[11px] px-2 py-0.5 rounded-md border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 transition"
              >
                {loc.label.split(",")[0]}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
          <div>
            <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
              Latitude (°N)
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
              Longitude (°E)
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
              Observation Start
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-md outline-none focus:border-[#0d3b2e] focus:bg-white transition"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
              Observation End
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-md outline-none focus:border-[#0d3b2e] focus:bg-white transition"
            />
          </div>
          <div>
            <button
              onClick={fetchData}
              disabled={loading}
              className="w-full py-2 px-4 bg-[#0d3b2e] hover:bg-[#134e39] text-white font-semibold text-xs rounded-md shadow-2xs transition disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              {loading ? (
                <>
                  <span className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Querying NASA...</span>
                </>
              ) : (
                <>
                  <Waves className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Run Water Analysis</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
          <div>
            <p className="font-semibold">Telemetry Notice</p>
            <p className="text-[11px] text-red-600">{error}</p>
          </div>
        </div>
      )}

      {/* ── Results Container ────────────────────────────────────────── */}
      {result && (
        <div className="space-y-5">
          {/* Top Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {/* Water Stress Index */}
            <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Water Stress Index
                </span>
                <span
                  className="text-[10px] font-bold px-2 py-0.5 rounded"
                  style={{
                    backgroundColor: `${result.water_stress_index.color}15`,
                    color: result.water_stress_index.color,
                  }}
                >
                  {result.water_stress_index.level}
                </span>
              </div>
              <div className="flex items-baseline gap-1 text-slate-900">
                <span className="text-2xl font-bold font-mono">
                  {result.water_stress_index.wsi}
                </span>
                <span className="text-xs text-slate-400">/ 100</span>
              </div>
              <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                <div
                  className="h-1.5 rounded-full"
                  style={{
                    width: `${Math.min(100, result.water_stress_index.wsi)}%`,
                    backgroundColor: result.water_stress_index.color,
                  }}
                />
              </div>
              <p className="text-[11px] text-slate-500 leading-tight">
                Weighted combination of root-zone deficit and rainfall anomalies.
              </p>
            </div>

            {/* Mean Root-Zone Wetness */}
            <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Root-Zone Wetness
                </span>
                <span className="text-[10px] font-mono text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                  0–100 cm
                </span>
              </div>
              <div className="flex items-baseline gap-1 text-slate-900">
                <span className="text-2xl font-bold font-mono text-[#0d3b2e]">
                  {result.soil_moisture_analysis.root_zone.mean ?? "—"}
                </span>
                <span className="text-xs text-slate-500">fraction</span>
              </div>
              <div className="text-[10px] text-slate-500 flex items-center justify-between font-mono">
                <span>Min: {result.soil_moisture_analysis.root_zone.min}</span>
                <span>Max: {result.soil_moisture_analysis.root_zone.max}</span>
              </div>
              <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                <div
                  className="h-1.5 rounded-full bg-emerald-600"
                  style={{
                    width: `${Math.min(100, ((result.soil_moisture_analysis.root_zone.mean ?? 0) as number) * 100)}%`,
                  }}
                />
              </div>
            </div>

            {/* Deficit Days (<0.25) */}
            <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Wilting Days (&lt;0.25)
                </span>
                <span className="text-[10px] font-semibold text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                  Critical
                </span>
              </div>
              <div className="flex items-baseline gap-1 text-amber-700">
                <span className="text-2xl font-bold font-mono">
                  {result.soil_moisture_analysis.dry_stress_days}
                </span>
                <span className="text-xs text-slate-500 font-sans">
                  days ({result.soil_moisture_analysis.dry_stress_pct}%)
                </span>
              </div>
              <p className="text-[11px] text-slate-500 leading-tight">
                Days where root-zone wetness plunged below permanent wilting point.
              </p>
            </div>

            {/* Cumulative Rainfall */}
            <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Accumulated Rainfall
                </span>
                <span className="text-[10px] font-semibold text-blue-800 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                  {result.spi_category}
                </span>
              </div>
              <div className="flex items-baseline gap-1 text-blue-700">
                <span className="text-2xl font-bold font-mono">
                  {result.total_precip_mm}
                </span>
                <span className="text-xs text-slate-500 font-sans">mm</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-tight">
                Total observed surface precipitation across observation window.
              </p>
            </div>
          </div>

          {/* Agronomic Adaptation & Irrigation Strategy */}
          <div className="bg-white rounded-xl p-4 sm:p-5 border border-slate-200 shadow-2xs space-y-2">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-[#0d3b2e]" />
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Agronomic Adaptation &amp; Irrigation Strategy
                </h3>
              </div>
              <span className="text-[10px] font-mono text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                FAO-56 Irrigation Model
              </span>
            </div>

            <p className="text-xs text-slate-700 leading-relaxed font-medium">
              {result.water_stress_index.wsi >= 65
                ? "CRITICAL STRESS: Root-zone moisture has severely depleted. Implement emergency deficit irrigation immediately. Schedule night or early-morning drip irrigation to minimize evaporative losses."
                : result.water_stress_index.wsi >= 40
                ? "MODERATE WATER DEFICIT: Soil moisture levels indicate intermittent depletion. Plan supplemental irrigation cycles aligned with crop flowering or grain-fill stages."
                : "OPTIMAL HYDRATION: Root-zone moisture is sufficient for transpirational demand. Preserve water storage and delay supplemental pumping until root wetness drops toward 0.35."}
            </p>
          </div>

          {/* Hydrological Time-Series Charts */}
          <div className="bg-white rounded-xl p-4 sm:p-5 border border-slate-200 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Soil Moisture Profile Dynamics (Surface vs. Root-Zone)
                </h3>
                <p className="text-[11px] text-slate-500">
                  Daily MERRA-2 telemetry comparing topsoil (0–5 cm) and root profile (0–100 cm).
                </p>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
                  <span className="text-[11px] text-slate-600">Root-Zone Wetness</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                  <span className="text-[11px] text-slate-600">Surface Wetness</span>
                </div>
              </div>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={timeseriesData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#64748b" }} minTickGap={30} />
                  <YAxis domain={[0, 1]} tick={{ fontSize: 10, fill: "#64748b" }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#ffffff",
                      borderColor: "#e2e8f0",
                      borderRadius: "0.5rem",
                      fontSize: "11px",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
                    }}
                  />
                  <ReferenceLine y={0.25} stroke="#dc2626" strokeDasharray="3 3" label={{ value: "Wilting (0.25)", fill: "#dc2626", fontSize: 10 }} />
                  <Line type="monotone" dataKey="soil_wetness_root_zone" stroke="#059669" strokeWidth={1.75} dot={false} />
                  <Line type="monotone" dataKey="soil_wetness_surface" stroke="#3b82f6" strokeWidth={1.25} dot={false} strokeOpacity={0.7} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Precipitation Distribution Bar Chart */}
          <div className="bg-white rounded-xl p-4 sm:p-5 border border-slate-200 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Daily Precipitation Inflow (mm)
              </h3>
              <span className="text-[10px] text-slate-400 font-mono">MERRA-2 PRECTOTCORR</span>
            </div>

            <div className="h-44 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={timeseriesData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#64748b" }} minTickGap={30} />
                  <YAxis tick={{ fontSize: 10, fill: "#64748b" }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#ffffff",
                      borderColor: "#e2e8f0",
                      borderRadius: "0.5rem",
                      fontSize: "11px",
                    }}
                  />
                  <Bar dataKey="precipitation_mm" fill="#0284c7" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
