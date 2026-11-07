"use client";

import { useState, useCallback, useEffect } from "react";
import {
  BarChart3,
  AlertTriangle,
  Sparkles,
  Info,
  TrendingUp,
  Compass,
} from "lucide-react";
import { getPhenology, type PhenologyResult } from "@/lib/api";
import { useLocation } from "@/context/LocationContext";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from "recharts";

const DEMO_LOCATIONS = [
  { label: "Kansas Wheat Belt, USA", lat: 38.34, lon: -98.12, crop: "Winter Wheat" },
  { label: "Iowa Corn Belt, USA", lat: 41.85, lon: -93.62, crop: "Corn / Soybeans" },
  { label: "Punjab, India", lat: 30.73, lon: 76.78, crop: "Wheat / Rice Rotation" },
  { label: "São Paulo State, Brazil", lat: -22.5, lon: -48.0, crop: "Soybean / Sugarcane" },
  { label: "Nile Delta, Egypt", lat: 30.5, lon: 31.2, crop: "Cotton / Maize" },
];

const YEAR_COLORS = ["#94a3b8", "#38bdf8", "#818cf8", "#f59e0b", "#059669"];

export default function PhenologyPage() {
  const { currentLocation } = useLocation();
  const [lat, setLat] = useState(() => (currentLocation ? String(currentLocation.latitude) : "38.34"));
  const [lon, setLon] = useState(() => (currentLocation ? String(currentLocation.longitude) : "-98.12"));
  const [years, setYears] = useState("2021,2022,2023,2024");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PhenologyResult | null>(null);

  useEffect(() => {
    if (currentLocation && typeof currentLocation.latitude === "number" && typeof currentLocation.longitude === "number") {
      setLat(String(currentLocation.latitude));
      setLon(String(currentLocation.longitude));
    }
  }, [currentLocation]);

  const fetchPhenology = useCallback(async () => {
    const latN = parseFloat(lat);
    const lonN = parseFloat(lon);
    if (isNaN(latN) || isNaN(lonN)) {
      setError("Please enter valid geographic decimal coordinates.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await getPhenology({
        latitude: latN,
        longitude: lonN,
        years,
      });
      setResult(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load phenology data.");
    } finally {
      setLoading(false);
    }
  }, [lat, lon, years]);

  useEffect(() => {
    let active = true;
    const initialLat = currentLocation?.latitude ?? 38.34;
    const initialLon = currentLocation?.longitude ?? -98.12;
    getPhenology({
      latitude: initialLat,
      longitude: initialLon,
      years: "2021,2022,2023,2024",
    })
      .then((data) => {
        if (active) setResult(data);
      })
      .catch((e: unknown) => {
        if (active) setError(e instanceof Error ? e.message : "Failed to load phenology data.");
      });
    return () => {
      active = false;
    };
  }, [currentLocation]);

  // Combine curves into unified recharts data array keyed by DOY
  const combinedCurves: Array<{ doy: number; [key: string]: number }> = [];
  if (result && result.curves.length > 0) {
    const doys = result.curves[0].doy;
    doys.forEach((d, i) => {
      if (i % 3 === 0) {
        const point: { doy: number; [key: string]: number } = { doy: d };
        result.curves.forEach((c) => {
          point[`year_${c.year}`] = c.ndvi_smooth[i] ?? 0;
        });
        combinedCurves.push(point);
      }
    });
  }

  const anomalyData: Array<{ doy: number; anomaly: number }> = [];
  if (result && result.anomaly?.anomaly_series) {
    result.anomaly.doy.forEach((d, i) => {
      if (i % 3 === 0) {
        anomalyData.push({
          doy: d,
          anomaly: result.anomaly?.anomaly_series[i] ?? 0,
        });
      }
    });
  }

  return (
    <div className="max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-8 py-5 space-y-5">
      {/* ── Top Bar: Page Header ────────────────────────────────────── */}
      <div className="bg-white rounded-xl p-4 sm:p-5 border border-slate-200 shadow-2xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-[#0d3b2e] text-emerald-400">
              <BarChart3 className="h-4 w-4" />
            </span>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              Crop Phenology Tracker
            </h1>
            <span className="text-[10px] font-semibold uppercase text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              Multi-Year Canopy Trajectories
            </span>
          </div>
          <p className="text-xs text-slate-500 max-w-3xl leading-relaxed">
            Multi-year seasonal vegetation growth curves, green-up inflection dates, peak canopy biomass timing, and seasonal shift anomaly detection with Savitzky-Golay filtering.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-500 font-medium shrink-0">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span>Savitzky-Golay Filter · DOY 1–365 Alignment</span>
        </div>
      </div>

      {/* ── Southern Hemisphere Notice ───────────────────────────────── */}
      {parseFloat(lat) < 0 && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-2.5 text-xs text-blue-900">
          <Info className="h-4 w-4 shrink-0 text-blue-600" />
          <span>
            <strong>Southern Hemisphere Detected ({parseFloat(lat).toFixed(2)}°S):</strong> Growing seasons run inverted relative to the Northern Hemisphere calendar. Peak summer vegetative biomass typically occurs around Day of Year (DOY) 330–60 (December–February), while winter dormancy falls around DOY 150–240 (June–August).
          </span>
        </div>
      )}

      {/* ── Coordinate Console ───────────────────────────────────────── */}
      <div className="bg-white rounded-xl p-4 sm:p-5 border border-slate-200 shadow-2xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
          <span className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
            <Compass className="w-3.5 h-3.5 text-[#0d3b2e]" />
            <span>Target Coordinates & Archive Years</span>
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

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
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
              Years to Align (Max 5)
            </label>
            <input
              value={years}
              onChange={(e) => setYears(e.target.value)}
              placeholder="2021,2022,2023,2024"
              className="w-full px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-md outline-none focus:border-[#0d3b2e] focus:bg-white transition"
            />
          </div>
          <div>
            <button
              onClick={fetchPhenology}
              disabled={loading}
              className="w-full py-2 px-4 bg-[#0d3b2e] hover:bg-[#134e39] text-white font-semibold text-xs rounded-md shadow-2xs transition disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              {loading ? (
                <>
                  <span className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Processing Curves...</span>
                </>
              ) : (
                <>
                  <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Plot Phenology Curves</span>
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
            <p className="font-semibold">Computation Notice</p>
            <p className="text-[11px] text-red-600">{error}</p>
          </div>
        </div>
      )}

      {/* ── Results Container ────────────────────────────────────────── */}
      {result && (
        <div className="space-y-5">
          {/* Main Phenology Chart */}
          <div className="bg-white rounded-xl p-4 sm:p-5 border border-slate-200 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-100">
              <div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <span>Multi-Year Seasonal Canopy Curves (Savitzky-Golay Smoothed)</span>
                  <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                    Day of Year 1–365
                  </span>
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Continuous vegetative proxy curves filtered across DOY coordinates to reveal shifts in onset, peak biomass, and senescence.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
                {result.curves.map((c, idx) => (
                  <div
                    key={c.year}
                    className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-50 border border-slate-200 text-xs"
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: YEAR_COLORS[idx % YEAR_COLORS.length] }}
                    />
                    <span className="text-slate-700 font-mono text-[11px]">{c.year}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={combinedCurves} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis
                    dataKey="doy"
                    tick={{ fontSize: 10, fill: "#64748b" }}
                    label={{ value: "Day of Year (DOY)", position: "insideBottomRight", offset: -5, fontSize: 10, fill: "#64748b" }}
                  />
                  <YAxis domain={[0, 1]} tick={{ fontSize: 10, fill: "#64748b" }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#ffffff",
                      borderColor: "#e2e8f0",
                      borderRadius: "0.5rem",
                      fontSize: "11px",
                    }}
                  />
                  <ReferenceLine
                    y={0.25}
                    stroke="#d97706"
                    strokeDasharray="4 4"
                    label={{
                      value: "Green-up Threshold (0.25)",
                      position: "insideTopRight",
                      fill: "#d97706",
                      fontSize: 10,
                    }}
                  />
                  {result.curves.map((c, idx) => (
                    <Line
                      key={c.year}
                      type="monotone"
                      dataKey={`year_${c.year}`}
                      name={`Year ${c.year}`}
                      stroke={YEAR_COLORS[idx % YEAR_COLORS.length]}
                      strokeWidth={idx === result.curves.length - 1 ? 2.5 : 1.5}
                      dot={false}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Phenological Event Milestones Table */}
          <div className="bg-white rounded-xl p-4 sm:p-5 border border-slate-200 shadow-2xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-[#0d3b2e]" />
                  <span>Estimated Phenological Stage Milestones</span>
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Inflection points automatically extracted from smoothed vegetation trajectories.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-600 uppercase font-semibold text-[10px] border-b border-slate-200">
                  <tr>
                    <th className="p-2.5">Year</th>
                    <th className="p-2.5">Green-up Onset</th>
                    <th className="p-2.5">Peak Canopy</th>
                    <th className="p-2.5">Max NDVI Proxy</th>
                    <th className="p-2.5">Senescence Phase</th>
                    <th className="p-2.5">Active Season Length</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                  {result.curves.map((c) => {
                    const validSmooth = c.ndvi_smooth.filter((v): v is number => v !== null && !isNaN(v));
                    const peakNdvi = validSmooth.length > 0 ? Math.max(...validSmooth).toFixed(3) : "—";
                    const seasonLength = c.phenological_events.senescence_doy && c.phenological_events.green_up_doy
                      ? c.phenological_events.senescence_doy - c.phenological_events.green_up_doy
                      : null;

                    return (
                      <tr key={c.year} className="hover:bg-slate-50/60 transition">
                        <td className="p-2.5 font-bold font-sans text-slate-900">{c.year}</td>
                        <td className="p-2.5 text-slate-600">
                          {c.phenological_events.green_up_doy ? `DOY ${c.phenological_events.green_up_doy}` : "Indeterminate"}
                        </td>
                        <td className="p-2.5 text-emerald-700 font-bold">
                          {c.phenological_events.peak_doy ? `DOY ${c.phenological_events.peak_doy}` : "Indeterminate"}
                        </td>
                        <td className="p-2.5 text-slate-900 font-bold">
                          {peakNdvi}
                        </td>
                        <td className="p-2.5 text-slate-600">
                          {c.phenological_events.senescence_doy ? `DOY ${c.phenological_events.senescence_doy}` : "Indeterminate"}
                        </td>
                        <td className="p-2.5 font-sans">
                          {seasonLength ? (
                            <span className="px-2 py-0.5 rounded font-semibold text-[10px] bg-slate-100 text-slate-700 border border-slate-200">
                              {seasonLength} days
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
