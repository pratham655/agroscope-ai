"use client";

import { useState, useCallback, useEffect } from "react";
import { TrendingUp, Loader2, AlertTriangle, Compass } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useLocation } from "@/context/LocationContext";

const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const DEMO_LOCATIONS = [
  { label: "Kansas Wheat Belt, USA", lat: 38.34, lon: -98.12 },
  { label: "Punjab, India", lat: 30.73, lon: 76.78 },
  { label: "Murray-Darling Basin, AU", lat: -34.5, lon: 145.5 },
  { label: "São Paulo State, Brazil", lat: -22.5, lon: -48.0 },
];

interface MonthlyData {
  dates: string[];
  values: number[];
  unit: string;
  trend?: {
    slope: number | null;
    direction: string;
    significant: boolean;
    p_value: number | null;
    interpretation: string;
  };
}

interface HistoryResponse {
  temperature: MonthlyData | null;
  precipitation: MonthlyData | null;
  humidity: MonthlyData | null;
  is_demo: boolean;
}

function buildChartData(temp: MonthlyData, precip: MonthlyData) {
  const step = Math.max(1, Math.ceil(temp.dates.length / 120));
  return temp.dates
    .filter((_, i) => i % step === 0)
    .map((d, i) => ({
      date: `${d.slice(0, 4)}-${d.slice(4, 6)}`,
      temp: temp.values[i * step] ?? null,
      precip: precip.values[i * step] ?? null,
    }));
}

export default function HistoryPage() {
  const { currentLocation } = useLocation();
  const [lat, setLat] = useState(() => (currentLocation ? String(currentLocation.latitude) : "38.34"));
  const [lon, setLon] = useState(() => (currentLocation ? String(currentLocation.longitude) : "-98.12"));
  const [startYear, setStart] = useState("2010");
  const [endYear, setEnd] = useState("2024");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<HistoryResponse | null>(null);

  useEffect(() => {
    if (currentLocation && typeof currentLocation.latitude === "number" && typeof currentLocation.longitude === "number") {
      setLat(String(currentLocation.latitude));
      setLon(String(currentLocation.longitude));
    }
  }, [currentLocation]);

  const run = useCallback(async () => {
    const latN = parseFloat(lat),
      lonN = parseFloat(lon);
    if (isNaN(latN) || isNaN(lonN)) {
      setError("Please enter valid decimal coordinates.");
      return;
    }
    setLoading(true);
    setError(null);
    setData(null);
    try {
      const url = new URL(`${BASE}/api/power/monthly`);
      url.searchParams.set("latitude", String(latN));
      url.searchParams.set("longitude", String(lonN));
      url.searchParams.set("start_year", startYear);
      url.searchParams.set("end_year", endYear);
      const res = await fetch(url.toString());
      if (!res.ok) throw new Error(`API error ${res.status}`);
      setData(await res.json());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "History fetch failed");
    } finally {
      setLoading(false);
    }
  }, [lat, lon, startYear, endYear]);

  useEffect(() => {
    run();
  }, [run]);

  const chartData =
    data?.temperature && data?.precipitation ? buildChartData(data.temperature, data.precipitation) : [];

  return (
    <div className="max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-8 py-5 space-y-5">
      {/* ── Feature Discovery Banner: Temporal Archive ──────────────── */}
      <div className="grad-futures rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-3xl">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-white/20 text-white backdrop-blur-sm border border-white/30">
                Multi-Decade Temporal Archive
              </span>
              <span className="text-xs text-indigo-200 font-mono">NASA POWER · MERRA-2 · Monthly Aggregations</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
              Temporal Data Archive: Multi-Decade Reanalysis History & Trend Detection
            </h1>
            <p className="text-xs sm:text-sm text-indigo-100/90 leading-relaxed">
              Examine multi-decade continuous agroclimatological records. Detect statistical thermal drift, precipitation shift trajectories, and calculate Mann-Kendall trend significance across custom historical epochs.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <span className="px-3 py-1.5 rounded-lg bg-black/25 backdrop-blur-md border border-white/20 text-xs font-mono text-indigo-200">
              1981–Present &bull; Statistical Trends
            </span>
          </div>
        </div>
      </div>

      {/* ── Top Bar: Workspace Controls ────────────────────────────── */}
      <div className="bg-white rounded-xl p-4 sm:p-5 border border-slate-200 shadow-2xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-[#0d3b2e] text-emerald-400">
              <TrendingUp className="h-4 w-4" />
            </span>
            <h2 className="text-lg font-bold tracking-tight text-slate-900">
              Historical Climate Trends
            </h2>
            <span className="text-[10px] font-semibold uppercase text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              Multi-Decade Reanalysis
            </span>
          </div>
          <p className="text-xs text-slate-500 max-w-3xl leading-relaxed">
            Multi-decade monthly temperature and precipitation trajectories to evaluate long-term thermal drift, shifting growing seasons, and drying trends across global agricultural coordinates.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-500 font-medium shrink-0">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span>NASA POWER &bull; MERRA-2 1981–Present Time Series</span>
        </div>
      </div>

      {/* ── Controls Console ────────────────────────────────────────── */}
      <div className="bg-white rounded-xl p-4 sm:p-5 border border-slate-200 shadow-2xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
          <span className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
            <Compass className="w-3.5 h-3.5 text-[#0d3b2e]" />
            <span>Target Coordinates &amp; Year Range</span>
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
              Start Year (1981–)
            </label>
            <input
              type="number"
              value={startYear}
              onChange={(e) => setStart(e.target.value)}
              min="1981"
              max="2024"
              className="w-full px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-md outline-none focus:border-[#0d3b2e] focus:bg-white transition"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
              End Year (&le; 2024)
            </label>
            <input
              type="number"
              value={endYear}
              onChange={(e) => setEnd(e.target.value)}
              min="1981"
              max="2024"
              className="w-full px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-md outline-none focus:border-[#0d3b2e] focus:bg-white transition"
            />
          </div>
          <div>
            <button
              onClick={run}
              disabled={loading}
              className="w-full py-2 px-4 bg-[#0d3b2e] hover:bg-[#134e39] text-white font-semibold text-xs rounded-md shadow-2xs transition disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-400" />
                  <span>Querying NASA...</span>
                </>
              ) : (
                <>
                  <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Fetch History</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0 text-red-600" />
          <span>{error}</span>
        </div>
      )}

      {/* ── Results Container ────────────────────────────────────────── */}
      {data && (
        <div className="space-y-5">
          {/* Trend Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {data.temperature?.trend && (
              <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs space-y-2">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Temperature Drift Analysis
                </span>
                <div className="text-sm font-bold text-slate-900">
                  {data.temperature.trend.direction.toUpperCase()}:{" "}
                  {data.temperature.trend.slope ? `${(data.temperature.trend.slope * 12).toFixed(2)} °C / decade` : "Negligible"}
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {data.temperature.trend.interpretation}
                </p>
              </div>
            )}

            {data.precipitation?.trend && (
              <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs space-y-2">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Precipitation Regime Shift
                </span>
                <div className="text-sm font-bold text-slate-900">
                  {data.precipitation.trend.direction.toUpperCase()}:{" "}
                  {data.precipitation.trend.slope ? `${(data.precipitation.trend.slope * 12).toFixed(1)} mm / decade` : "Negligible"}
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {data.precipitation.trend.interpretation}
                </p>
              </div>
            )}
          </div>

          {/* Time Series Charts */}
          {chartData.length > 0 && (
            <div className="bg-white rounded-xl p-4 sm:p-5 border border-slate-200 shadow-2xs space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Monthly Temperature (°C) &amp; Precipitation (mm) History
                </h3>
                <span className="text-[10px] font-mono text-slate-500">
                  {startYear} → {endYear} ({chartData.length} sample points)
                </span>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#64748b" }} minTickGap={40} />
                    <YAxis tick={{ fontSize: 10, fill: "#64748b" }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#ffffff",
                        borderColor: "#e2e8f0",
                        borderRadius: "0.5rem",
                        fontSize: "11px",
                      }}
                    />
                    <Line type="monotone" dataKey="temp" name="Temperature (°C)" stroke="#d97706" strokeWidth={1.5} dot={false} />
                    <Line type="monotone" dataKey="precip" name="Rainfall (mm)" stroke="#0284c7" strokeWidth={1.25} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
