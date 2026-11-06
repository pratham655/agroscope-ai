"use client";

import { useState, useCallback, useEffect } from "react";
import {
  BarChart3,
  AlertTriangle,
  MapPin,
  Sparkles,
  Info,
  ArrowRight,
  TrendingUp,
  ShieldCheck,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";
import { getPhenology, type PhenologyResult } from "@/lib/api";
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

const YEAR_COLORS = ["#94a3b8", "#38bdf8", "#818cf8", "#f59e0b", "#10b981"];

export default function PhenologyPage() {
  const [lat, setLat] = useState("38.34");
  const [lon, setLon] = useState("-98.12");
  const [years, setYears] = useState("2021,2022,2023,2024");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PhenologyResult | null>(null);

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
    getPhenology({
      latitude: 38.34,
      longitude: -98.12,
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
  }, []);

  // Combine DOY curves for recharts (DOY 1..365)
  const combinedCurves: Record<string, number | null>[] = [];
  if (result && result.curves.length > 0) {
    const maxDays = Math.max(...result.curves.map((c) => c.doy.length));
    for (let i = 0; i < maxDays; i += 3) {
      const doy = result.curves[0].doy[i] || i + 1;
      const row: Record<string, number | null> = { doy };
      result.curves.forEach((c) => {
        row[`year_${c.year}`] = c.ndvi_smooth[i] ?? null;
      });
      combinedCurves.push(row);
    }
  }

  // Anomaly chart data
  const anomalyData: Record<string, number | null>[] = [];
  if (result?.anomaly) {
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
    <div className="min-h-screen bg-[#f8faf5]">
      {/* Hero Header */}
      <div className="bg-linear-to-b from-[#0c1b12] via-[#12281a] to-[#183624] text-white py-12 px-4 sm:px-6 lg:px-8 border-b border-[#234b32]">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-emerald-500/20 border border-emerald-400/30 text-emerald-300">
                <BarChart3 className="h-5 w-5" />
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-300 bg-emerald-950/60 px-3 py-1 rounded-full border border-emerald-800/60">
                NASA Phenological Observation Suite
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-emerald-200/80">
              <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Savitzky-Golay Filtering &bull; Multi-Year Day of Year (DOY 1–365) Alignment</span>
            </div>
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white mb-3">
            Crop Phenology Tracker
          </h1>
          <p className="text-base text-emerald-100/90 max-w-3xl leading-relaxed">
            Multi-year seasonal vegetation growth trajectories, green-up inflection dates, peak canopy biomass timing, and seasonal shift anomaly detection to diagnose climate-driven phenological shifts.
          </p>

          {/* Quick Presets */}
          <div className="mt-6 flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-emerald-300/80 mr-1 flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" /> Reference Breadbaskets:
            </span>
            {DEMO_LOCATIONS.map((loc) => (
              <button
                key={loc.label}
                onClick={() => {
                  setLat(String(loc.lat));
                  setLon(String(loc.lon));
                }}
                className="text-xs px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 text-emerald-100 font-medium transition flex items-center gap-1.5"
              >
                <span>{loc.label}</span>
                <span className="text-[10px] text-emerald-300/80">({loc.crop})</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Controls Bar */}
        <div className="bg-white rounded-2xl p-6 border border-[#e2ece0] shadow-xs mb-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                Latitude (°N)
              </label>
              <input
                value={lat}
                onChange={(e) => setLat(e.target.value)}
                placeholder="38.34"
                className="w-full px-3.5 py-2.5 text-sm bg-gray-50/50 border border-[#e2ece0] rounded-xl outline-none focus:ring-2 focus:ring-[#2d7a3a] focus:bg-white transition"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                Longitude (°E)
              </label>
              <input
                value={lon}
                onChange={(e) => setLon(e.target.value)}
                placeholder="-98.12"
                className="w-full px-3.5 py-2.5 text-sm bg-gray-50/50 border border-[#e2ece0] rounded-xl outline-none focus:ring-2 focus:ring-[#2d7a3a] focus:bg-white transition"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                Years to Align (Max 5)
              </label>
              <input
                value={years}
                onChange={(e) => setYears(e.target.value)}
                placeholder="2021,2022,2023,2024"
                className="w-full px-3.5 py-2.5 text-sm bg-gray-50/50 border border-[#e2ece0] rounded-xl outline-none focus:ring-2 focus:ring-[#2d7a3a] focus:bg-white transition"
              />
            </div>
            <div>
              <button
                onClick={fetchPhenology}
                disabled={loading}
                className="w-full py-2.5 px-4 bg-[#2d7a3a] hover:bg-[#23602d] text-white font-semibold text-sm rounded-xl shadow-xs transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Processing Curves...</span>
                  </>
                ) : (
                  <>
                    <TrendingUp className="h-4 w-4" />
                    <span>Plot Phenology Curves</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="p-4 mb-6 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 shrink-0 text-red-600 mt-0.5" />
            <div>
              <p className="font-bold">Computation Error</p>
              <p className="text-xs text-red-600 mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {result && (
          <div className="space-y-8">
            {/* Main Phenology Chart */}
            <div className="bg-white rounded-2xl p-6 border border-[#e2ece0] shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                  <h3 className="text-base font-bold text-[#1a2e1a] flex items-center gap-2">
                    <span>Multi-Year Seasonal Canopy Curves (Savitzky-Golay Smoothed)</span>
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                      Day of Year 1–365
                    </span>
                  </h3>
                  <p className="text-xs text-[#4a6741] mt-0.5">
                    Continuous vegetative proxy curves filtered across DOY coordinates to reveal shifts in onset, peak biomass, and senescence.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs font-semibold">
                  {result.curves.map((c, idx) => (
                    <div
                      key={c.year}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-50 border border-gray-200"
                    >
                      <span
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: YEAR_COLORS[idx % YEAR_COLORS.length] }}
                      />
                      <span className="text-gray-700">Year {c.year}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={combinedCurves} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f3ee" />
                    <XAxis
                      dataKey="doy"
                      tick={{ fontSize: 10, fill: "#6b7280" }}
                      label={{ value: "Day of Year (DOY)", position: "insideBottomRight", offset: -5, fontSize: 10, fill: "#6b7280" }}
                    />
                    <YAxis domain={[0, 1]} tick={{ fontSize: 10, fill: "#6b7280" }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#ffffff",
                        borderColor: "#e2ece0",
                        borderRadius: "0.75rem",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
                        fontSize: "12px",
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
                        fontWeight: 600,
                      }}
                    />
                    {result.curves.map((c, idx) => (
                      <Line
                        key={c.year}
                        type="monotone"
                        dataKey={`year_${c.year}`}
                        name={`Year ${c.year}`}
                        stroke={YEAR_COLORS[idx % YEAR_COLORS.length]}
                        strokeWidth={idx === result.curves.length - 1 ? 3 : 1.75}
                        dot={false}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Phenological Event Milestones Table */}
            <div className="bg-white rounded-2xl p-6 border border-[#e2ece0] shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-bold text-[#1a2e1a] flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-[#2d7a3a]" />
                    <span>Estimated Phenological Stage Milestones</span>
                  </h3>
                  <p className="text-xs text-[#4a6741] mt-0.5">
                    Inflection points automatically extracted from smoothed vegetation trajectories.
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-[#f7faf6] text-gray-600 font-semibold uppercase">
                    <tr>
                      <th className="p-3 rounded-l-xl">Season Year</th>
                      <th className="p-3">Green-up Onset</th>
                      <th className="p-3">Peak Canopy Greenness</th>
                      <th className="p-3">Senescence Onset</th>
                      <th className="p-3 rounded-r-xl">Peak Proxy Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {result.curves.map((c) => {
                      const peakVal = Math.max(...(c.ndvi_smooth.filter((v): v is number => v !== null) || [0]));
                      return (
                        <tr key={c.year} className="hover:bg-gray-50/70 transition">
                          <td className="p-3 font-bold text-gray-900 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-600" />
                            <span>{c.year}</span>
                          </td>
                          <td className="p-3 font-semibold text-emerald-700">
                            {c.phenological_events.green_up_doy ? (
                              <span className="px-2 py-0.5 rounded bg-emerald-50 border border-emerald-200">
                                DOY {c.phenological_events.green_up_doy}
                              </span>
                            ) : (
                              <span className="text-gray-400">Continuous / Low dynamic</span>
                            )}
                          </td>
                          <td className="p-3 font-semibold text-blue-700">
                            {c.phenological_events.peak_doy ? (
                              <span className="px-2 py-0.5 rounded bg-blue-50 border border-blue-200">
                                DOY {c.phenological_events.peak_doy}
                              </span>
                            ) : (
                              "—"
                            )}
                          </td>
                          <td className="p-3 font-semibold text-amber-700">
                            {c.phenological_events.senescence_doy ? (
                              <span className="px-2 py-0.5 rounded bg-amber-50 border border-amber-200">
                                DOY {c.phenological_events.senescence_doy}
                              </span>
                            ) : (
                              <span className="text-gray-400">Post-Season / Late</span>
                            )}
                          </td>
                          <td className="p-3 font-bold text-[#2d7a3a]">
                            <span className="font-mono">{peakVal.toFixed(3)}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Anomaly Chart (Latest Year vs Multi-Year Mean) */}
            {result.anomaly && (
              <div className="bg-white rounded-2xl p-6 border border-[#e2ece0] shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
                  <div>
                    <h3 className="text-base font-bold text-[#1a2e1a]">
                      Vegetation Growth Anomaly: Year {result.anomaly.year} vs Multi-Year Mean
                    </h3>
                    <p className="text-xs text-[#4a6741] mt-0.5">
                      Positive anomaly values indicate vegetative biomass surplus; negative values indicate thermal or moisture stress.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">Mean Anomaly:</span>
                    <span
                      className={`text-xs font-bold px-2.5 py-1 rounded-full border ${
                        result.anomaly.mean_anomaly >= 0
                          ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                          : "bg-red-50 text-red-800 border-red-200"
                      }`}
                    >
                      {result.anomaly.mean_anomaly >= 0
                        ? `+${result.anomaly.mean_anomaly}`
                        : result.anomaly.mean_anomaly}
                    </span>
                  </div>
                </div>

                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={anomalyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f3ee" />
                      <XAxis dataKey="doy" tick={{ fontSize: 10, fill: "#6b7280" }} />
                      <YAxis tick={{ fontSize: 10, fill: "#6b7280" }} domain={[-0.3, 0.3]} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#ffffff",
                          borderColor: "#e2ece0",
                          borderRadius: "0.75rem",
                          boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
                          fontSize: "12px",
                        }}
                      />
                      <ReferenceLine y={0} stroke="#94a3b8" strokeWidth={1.5} />
                      <Line
                        type="monotone"
                        dataKey="anomaly"
                        stroke="#2563eb"
                        strokeWidth={2}
                        dot={false}
                        name="Anomaly"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Scientific Methodology & Filtering Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl p-6 border border-[#e2ece0] shadow-xs">
                <h4 className="text-sm font-bold text-gray-900 mb-2 flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-[#2d7a3a]" />
                  Savitzky-Golay Polynomial Filtering
                </h4>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Remote sensing vegetation trajectories frequently suffer from atmospheric noise, aerosol contamination, and residual cloud shadowing. AGROSCOPE AI applies a moving polynomial Savitzky-Golay filter to preserve peak heights and narrow inflection boundaries while eliminating sub-seasonal sensor noise.
                </p>
              </div>

              <div className="bg-white rounded-2xl p-6 border border-[#e2ece0] shadow-xs">
                <h4 className="text-sm font-bold text-gray-900 mb-2 flex items-center gap-2">
                  <Info className="h-4 w-4 text-emerald-600" />
                  Adaptation Relevance for Problem #7
                </h4>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Shifts in Green-up Day of Year (earlier planting or delayed monsoons) directly reflect changing thermal regimes. Farmers can adjust planting dates and select shorter-season varieties using these empirical multi-year trajectories.
                </p>
                <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
                  <Link
                    href={`/farm-futures?lat=${lat}&lon=${lon}`}
                    className="text-xs text-[#2d7a3a] font-semibold hover:underline inline-flex items-center gap-1"
                  >
                    Simulate future crop shifts in Futures Lab <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            </div>

            {/* Scientific Provenance & Disclaimer Card */}
            <div className="p-5 bg-white border border-[#e2ece0] rounded-2xl text-xs text-gray-600 leading-relaxed shadow-2xs">
              <div className="flex items-center gap-2 font-bold text-gray-800 mb-2">
                <Info className="h-4 w-4 text-[#2d7a3a]" />
                <span>NASA Scientific Provenance &amp; Biophysical Footnote</span>
              </div>
              <p>{result.scientific_disclaimer}</p>
              <div className="mt-3 pt-3 border-t border-gray-100 flex flex-wrap items-center justify-between gap-2 text-[11px] text-gray-500">
                <span>NASA Earthdata &bull; MODIS MOD13Q1 Vegetation Index / MERRA-2 Biophysical Proxy</span>
                <a
                  href="https://modis.gsfc.nasa.gov/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#2d7a3a] font-semibold hover:underline flex items-center gap-1"
                >
                  NASA MODIS Science Team <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
