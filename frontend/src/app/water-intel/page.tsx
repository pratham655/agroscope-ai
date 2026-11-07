"use client";

import { useState, useCallback, useEffect } from "react";
import {
  Droplets,
  AlertTriangle,
  Waves,
  Calendar,
  MapPin,
  ArrowRight,
  TrendingDown,
  Info,
  ShieldCheck,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";
import { getWaterIntelligence, type WaterIntelligenceResult } from "@/lib/api";
import { useLocation } from "@/context/LocationContext";
import GlobalLocationBar from "@/components/GlobalLocationBar";
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

  // Sync with universal LocationContext
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

  // Prepare chart series data
  const chartData = (result?.dates || []).map((d, i) => ({
    date: d.slice(4, 6) + "/" + d.slice(6, 8),
    surface: result?.gwettop_series[i],
    rootZone: result?.gwetroot_series[i],
    precip: result?.precip_series[i],
    cumPrecip: result?.cumulative_precip[i],
  }));

  // Downsample if more than 90 points for cleaner charting
  const downsampled = chartData.filter((_, i) => i % Math.max(1, Math.floor(chartData.length / 90)) === 0);

  return (
    <div className="min-h-screen bg-[#f8faf5]">
      {/* Hero Header */}
      <div className="bg-linear-to-b from-[#0c1b12] via-[#12281a] to-[#183624] text-white py-12 px-4 sm:px-6 lg:px-8 border-b border-[#234b32]">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-emerald-500/20 border border-emerald-400/30 text-emerald-300">
                <Droplets className="h-5 w-5" />
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-300 bg-emerald-950/60 px-3 py-1 rounded-full border border-emerald-800/60">
                NASA Agro-Hydrology Suite
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-emerald-200/80">
              <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>MERRA-2 Land Surface Model &bull; NASA POWER Hourly-Derived Daily Grids</span>
            </div>
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white mb-3">
            Smart Water Intelligence
          </h1>
          <p className="text-base text-emerald-100/90 max-w-3xl leading-relaxed">
            Quantitative root-zone soil wetness telemetry, root-profile depletion thresholds, and precipitation deficit anomalies to guide precision irrigation scheduling and anticipate crop water stress.
          </p>

          {/* Quick Presets */}
          <div className="mt-6 flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-emerald-300/80 mr-1 flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" /> Global Breadbaskets:
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
        {/* Universal Global Location Context Bar */}
        <div className="mb-6">
          <GlobalLocationBar />
        </div>

        {/* Controls Bar */}
        <div className="bg-white rounded-2xl p-6 border border-[#e2ece0] shadow-xs mb-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
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
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm bg-gray-50/50 border border-[#e2ece0] rounded-xl outline-none focus:ring-2 focus:ring-[#2d7a3a] focus:bg-white transition"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm bg-gray-50/50 border border-[#e2ece0] rounded-xl outline-none focus:ring-2 focus:ring-[#2d7a3a] focus:bg-white transition"
              />
            </div>
            <div>
              <button
                onClick={fetchData}
                disabled={loading}
                className="w-full py-2.5 px-4 bg-[#2d7a3a] hover:bg-[#23602d] text-white font-semibold text-sm rounded-xl shadow-xs transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Querying NASA...</span>
                  </>
                ) : (
                  <>
                    <Waves className="h-4 w-4" />
                    <span>Run Water Analysis</span>
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
              <p className="font-bold">Telemetry Error</p>
              <p className="text-xs text-red-600 mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {result && (
          <div className="space-y-8">
            {/* Top Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Water Stress Index */}
              <div className="bg-white rounded-2xl p-5 border border-[#e2ece0] shadow-xs relative overflow-hidden">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Water Stress Index
                  </span>
                  <span
                    className="text-xs font-bold px-2.5 py-0.5 rounded-full"
                    style={{
                      backgroundColor: `${result.water_stress_index.color}20`,
                      color: result.water_stress_index.color,
                    }}
                  >
                    {result.water_stress_index.level}
                  </span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold text-[#1a2e1a]">
                    {result.water_stress_index.wsi}
                  </span>
                  <span className="text-xs text-gray-400 font-semibold">/ 100</span>
                </div>
                <div className="w-full bg-gray-100 h-2 rounded-full mt-3 overflow-hidden">
                  <div
                    className="h-2 rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(100, result.water_stress_index.wsi)}%`,
                      backgroundColor: result.water_stress_index.color,
                    }}
                  />
                </div>
                <p className="text-[11px] text-gray-500 mt-2 leading-tight">
                  Heuristic combination of root-zone moisture deficit &amp; precipitation anomalies.
                </p>
              </div>

              {/* Mean Root-Zone Wetness */}
              <div className="bg-white rounded-2xl p-5 border border-[#e2ece0] shadow-xs">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Root-Zone Wetness
                  </span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                    0–100 cm
                  </span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold text-[#2d7a3a]">
                    {result.soil_moisture_analysis.root_zone.mean ?? "—"}
                  </span>
                  <span className="text-xs text-gray-500">fraction</span>
                </div>
                <div className="text-[11px] text-gray-500 mt-3 flex items-center justify-between">
                  <span>Min: <strong>{result.soil_moisture_analysis.root_zone.min}</strong></span>
                  <span>Max: <strong>{result.soil_moisture_analysis.root_zone.max}</strong></span>
                </div>
                <div className="w-full bg-gray-100 h-2 rounded-full mt-2 overflow-hidden">
                  <div
                    className="h-2 rounded-full bg-emerald-600"
                    style={{
                      width: `${Math.min(100, ((result.soil_moisture_analysis.root_zone.mean ?? 0) as number) * 100)}%`,
                    }}
                  />
                </div>
              </div>

              {/* Critical Moisture Deficit */}
              <div className="bg-white rounded-2xl p-5 border border-[#e2ece0] shadow-xs">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Deficit Days (&lt;0.25)
                  </span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
                    Wilting Risk
                  </span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold text-amber-600">
                    {result.soil_moisture_analysis.dry_stress_days}
                  </span>
                  <span className="text-xs text-gray-500">
                    days ({result.soil_moisture_analysis.dry_stress_pct}%)
                  </span>
                </div>
                <p className="text-[11px] text-gray-500 mt-3">
                  Days where root-zone wetness plunged below permanent wilting point threshold (0.25).
                </p>
              </div>

              {/* Precipitation & SPI */}
              <div className="bg-white rounded-2xl p-5 border border-[#e2ece0] shadow-xs">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Cumulative Rainfall
                  </span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200">
                    {result.spi_category}
                  </span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold text-blue-600">
                    {result.total_precip_mm}
                  </span>
                  <span className="text-xs text-gray-500">mm</span>
                </div>
                <p className="text-[11px] text-gray-500 mt-3">
                  Estimated SPI proxy indicates {result.spi_category.toLowerCase()} meteorological moisture regime.
                </p>
              </div>
            </div>

            {/* Agronomic Irrigation Scheduling Card */}
            <div className="bg-linear-to-r from-emerald-950 via-[#132c1c] to-[#1c3e27] text-white rounded-2xl p-6 shadow-md border border-emerald-800/50">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 shrink-0">
                    <ShieldCheck className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      Agronomic Adaptation &amp; Irrigation Strategy
                      <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-800/80 text-emerald-200 border border-emerald-700">
                        FAO-56 Grounded
                      </span>
                    </h3>
                    <p className="text-xs text-emerald-100/80 mt-1 leading-relaxed max-w-3xl">
                      {result.water_stress_index.wsi >= 65
                        ? "CRITICAL STRESS: Root-zone moisture has severely depleted. Implement emergency deficit irrigation immediately. Schedule night or early-morning drip irrigation to minimize evaporative losses."
                        : result.water_stress_index.wsi >= 40
                        ? "MODERATE WATER DEFICIT: Soil moisture levels indicate intermittent depletion. Plan supplemental irrigation cycles aligned with crop flowering or grain-fill stages."
                        : "OPTIMAL HYDRATION: Root-zone moisture is sufficient for transpirational demand. Preserve water storage and delay supplemental pumping until root wetness drops toward 0.35."}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <Link
                    href={`/farm-futures?lat=${lat}&lon=${lon}`}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 text-white font-semibold text-xs hover:bg-emerald-400 transition"
                  >
                    <span>Simulate in Futures Lab</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            </div>

            {/* Soil Wetness Profiles Chart */}
            <div className="bg-white rounded-2xl p-6 border border-[#e2ece0] shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
                <div>
                  <h3 className="text-base font-bold text-[#1a2e1a] flex items-center gap-2">
                    <span>Root-Zone vs. Surface Wetness Dynamics</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 font-normal">
                      NASA MERRA-2
                    </span>
                  </h3>
                  <p className="text-xs text-[#4a6741] mt-0.5">
                    Surface layer (0–5 cm, top) responds rapidly to rainfall, while root-zone (0–100 cm, green) governs crop transpirational access.
                  </p>
                </div>
                <div className="flex items-center gap-4 text-xs font-medium">
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-emerald-600" />
                    <span className="text-gray-700">Root-Zone (0–100 cm)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-sky-400" />
                    <span className="text-gray-700">Surface (0–5 cm)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-1 border-b-2 border-dashed border-amber-600" />
                    <span className="text-amber-700 font-semibold">Wilting Point (0.25)</span>
                  </div>
                </div>
              </div>

              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={downsampled} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f3ee" />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#6b7280" }} />
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
                        value: "Critical Wilting Point (0.25)",
                        position: "insideTopRight",
                        fill: "#d97706",
                        fontSize: 10,
                        fontWeight: 600,
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="rootZone"
                      stroke="#059669"
                      strokeWidth={2.5}
                      dot={false}
                      name="Root-Zone Wetness"
                    />
                    <Line
                      type="monotone"
                      dataKey="surface"
                      stroke="#38bdf8"
                      strokeWidth={1.5}
                      dot={false}
                      name="Surface Wetness"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Cumulative Precipitation and Daily Events */}
            <div className="bg-white rounded-2xl p-6 border border-[#e2ece0] shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
                <div>
                  <h3 className="text-base font-bold text-[#1a2e1a]">
                    Precipitation Events &amp; Cumulative Hydrology
                  </h3>
                  <p className="text-xs text-[#4a6741] mt-0.5">
                    Daily precipitation depth (mm) measured across NASA POWER meteorological grid.
                  </p>
                </div>
                <div className="text-xs font-semibold text-blue-700 bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
                  Total Rainfall: {result.total_precip_mm} mm
                </div>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={downsampled} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f3ee" />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#6b7280" }} />
                    <YAxis tick={{ fontSize: 10, fill: "#6b7280" }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#ffffff",
                        borderColor: "#e2ece0",
                        borderRadius: "0.75rem",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
                        fontSize: "12px",
                      }}
                    />
                    <Bar dataKey="precip" fill="#2563eb" radius={[3, 3, 0, 0]} name="Daily Rain (mm)" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Bottom Grid: Dry Spells & Seasonal Split */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Dry Spells Table */}
              <div className="bg-white rounded-2xl p-6 border border-[#e2ece0] shadow-xs">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                      <TrendingDown className="h-4 w-4 text-amber-600" />
                      Detected Dry Spells (&ge; 5 Days)
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Consecutive rainless periods (&lt;1.0 mm/day) that escalate soil moisture depletion.
                    </p>
                  </div>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                    {result.dry_spells.length} spells
                  </span>
                </div>

                {result.dry_spells.length === 0 ? (
                  <div className="py-8 text-center text-xs text-gray-500 bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
                    No prolonged dry spells (&ge;5 consecutive days) detected in this window.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-[#f7faf6] text-gray-600 font-semibold uppercase">
                        <tr>
                          <th className="p-2.5 rounded-l-lg">Onset</th>
                          <th className="p-2.5">Termination</th>
                          <th className="p-2.5 rounded-r-lg">Duration</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {result.dry_spells.map((s, idx) => (
                          <tr key={idx} className="hover:bg-gray-50/70 transition">
                            <td className="p-2.5 font-medium text-gray-700">{s.start_date || "—"}</td>
                            <td className="p-2.5 font-medium text-gray-700">{s.end_date || "—"}</td>
                            <td className="p-2.5">
                              <span className="font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                                {s.length_days} days
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Biannual Hydrological Split */}
              <div className="bg-white rounded-2xl p-6 border border-[#e2ece0] shadow-xs">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                      <Calendar className="h-4 w-4 text-emerald-600" />
                      Biannual Hydrological Split
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      First half vs. second half seasonal partitioning of moisture availability.
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  {result.seasonal_comparison.map((sc, i) => (
                    <div
                      key={i}
                      className="p-4 bg-[#f8faf7] rounded-xl border border-[#eef4ed] flex items-center justify-between"
                    >
                      <div>
                        <div className="text-xs font-bold text-[#1a2e1a]">{sc.label}</div>
                        <div className="text-[11px] text-gray-500 mt-0.5">
                          Total Precip: <span className="font-bold text-blue-700">{sc.total_precip_mm} mm</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-extrabold text-[#2d7a3a]">
                          {sc.mean_root_wetness}
                        </div>
                        <div className="text-[10px] text-gray-500 font-medium">Mean Root Wetness</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Scientific Provenance & Disclaimer Card */}
            <div className="p-5 bg-white border border-[#e2ece0] rounded-2xl text-xs text-gray-600 leading-relaxed shadow-2xs">
              <div className="flex items-center gap-2 font-bold text-gray-800 mb-2">
                <Info className="h-4 w-4 text-[#2d7a3a]" />
                <span>NASA Scientific Provenance &amp; Biophysical Footnote</span>
              </div>
              <p>{result.scientific_note}</p>
              <div className="mt-3 pt-3 border-t border-gray-100 flex flex-wrap items-center justify-between gap-2 text-[11px] text-gray-500">
                <span>NASA Earthdata &bull; Modern-Era Retrospective analysis for Research and Applications, Version 2 (MERRA-2)</span>
                <a
                  href="https://power.larc.nasa.gov/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#2d7a3a] font-semibold hover:underline flex items-center gap-1"
                >
                  NASA POWER Portal <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
