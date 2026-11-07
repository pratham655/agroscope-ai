"use client";

import { useState, useCallback, useEffect } from "react";
import { TrendingUp, MapPin, Loader2, AlertTriangle, Calendar } from "lucide-react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useLocation } from "@/context/LocationContext";
import GlobalLocationBar from "@/components/GlobalLocationBar";

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
  const [lat, setLat] = useState(() => (currentLocation ? String(currentLocation.latitude) : ""));
  const [lon, setLon] = useState(() => (currentLocation ? String(currentLocation.longitude) : ""));
  const [startYear, setStart] = useState("2010");
  const [endYear, setEnd] = useState("2024");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<HistoryResponse | null>(null);

  // Sync with universal LocationContext
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

  const chartData =
    data?.temperature && data?.precipitation ? buildChartData(data.temperature, data.precipitation) : [];

  return (
    <div className="min-h-screen bg-[#f8faf5]">
      {/* Hero Header */}
      <div className="bg-linear-to-b from-[#0c1b12] via-[#12281a] to-[#183624] text-white py-12 px-4 sm:px-6 lg:px-8 border-b border-[#234b32]">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-emerald-500/20 border border-emerald-400/30 text-emerald-300">
                <TrendingUp className="h-5 w-5" />
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-300 bg-emerald-950/60 px-3 py-1 rounded-full border border-emerald-800/60">
                Multi-Decade Climate Trend Analytics
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-emerald-200/80">
              <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>NASA POWER &bull; MERRA-2 1981–Present Time Series</span>
            </div>
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white mb-3">
            Historical Climate Trends
          </h1>
          <p className="text-base text-emerald-100/90 max-w-3xl leading-relaxed">
            Multi-decade monthly temperature and precipitation trajectories to evaluate long-term thermal drift, shifting growing seasons, and drying trends across global agricultural coordinates.
          </p>

          {/* Quick Presets */}
          <div className="mt-6 flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-emerald-300/80 mr-1 flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" /> Reference Locations:
            </span>
            {DEMO_LOCATIONS.map((loc) => (
              <button
                key={loc.label}
                onClick={() => {
                  setLat(String(loc.lat));
                  setLon(String(loc.lon));
                }}
                className="text-xs px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 text-emerald-100 font-medium transition"
              >
                {loc.label}
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
                placeholder="e.g. 38.34"
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
                placeholder="e.g. -98.12"
                className="w-full px-3.5 py-2.5 text-sm bg-gray-50/50 border border-[#e2ece0] rounded-xl outline-none focus:ring-2 focus:ring-[#2d7a3a] focus:bg-white transition"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                Start Year (1981–)
              </label>
              <input
                type="number"
                value={startYear}
                onChange={(e) => setStart(e.target.value)}
                min="1981"
                max="2024"
                className="w-full px-3.5 py-2.5 text-sm bg-gray-50/50 border border-[#e2ece0] rounded-xl outline-none focus:ring-2 focus:ring-[#2d7a3a] focus:bg-white transition"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                End Year (&le; 2024)
              </label>
              <input
                type="number"
                value={endYear}
                onChange={(e) => setEnd(e.target.value)}
                min="1981"
                max="2024"
                className="w-full px-3.5 py-2.5 text-sm bg-gray-50/50 border border-[#e2ece0] rounded-xl outline-none focus:ring-2 focus:ring-[#2d7a3a] focus:bg-white transition"
              />
            </div>
            <div>
              <button
                onClick={run}
                disabled={loading}
                className="w-full py-2.5 px-4 bg-[#2d7a3a] hover:bg-[#23602d] text-white font-semibold text-sm rounded-xl shadow-xs transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Querying Archive...</span>
                  </>
                ) : (
                  <>
                    <Calendar className="h-4 w-4" />
                    <span>Load Climate History</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 flex gap-3 bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">
            <AlertTriangle className="h-5 w-5 shrink-0 text-red-600 mt-0.5" />
            <div>
              <strong className="block font-bold">Historical Data Fetch Error</strong>
              <span className="text-xs">{error}</span>
            </div>
          </div>
        )}

        {loading && (
          <div className="bg-white rounded-2xl p-16 text-center border border-[#e2ece0] shadow-xs">
            <Loader2 className="h-10 w-10 animate-spin text-[#2d7a3a] mx-auto mb-4" />
            <h3 className="text-base font-bold text-[#1a2e1a]">
              Ingesting Monthly NASA POWER Archives...
            </h3>
            <p className="text-xs text-[#4a6741] mt-1 max-w-md mx-auto">
              Extracting multi-decadal monthly temperature (T2M) and precipitation (PRECTOTCORR) series from MERRA-2 reanalysis.
            </p>
          </div>
        )}

        {data && !loading && chartData.length > 0 && (
          <div className="space-y-8">
            {data.is_demo && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs font-semibold text-amber-800 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
                <span>Demonstration Mode: NASA POWER API temporarily reached or using cached reference grid.</span>
              </div>
            )}

            {/* Temperature Trend */}
            {data.temperature && (
              <div className="bg-white rounded-2xl p-6 border border-[#e2ece0] shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                  <div>
                    <h3 className="text-base font-bold text-[#1a2e1a]">
                      Monthly Mean Temperature (T2M)
                    </h3>
                    <p className="text-xs text-[#4a6741] mt-0.5">
                      NASA MERRA-2 2-meter air temperature monthly climatology (°C)
                    </p>
                  </div>
                  {data.temperature.trend?.significant && (
                    <span
                      className={`text-xs font-bold px-3 py-1 rounded-full border ${
                        data.temperature.trend.direction === "increasing"
                          ? "bg-red-50 text-red-700 border-red-200"
                          : "bg-blue-50 text-blue-700 border-blue-200"
                      }`}
                    >
                      {data.temperature.trend.direction === "increasing" ? "↑ Warming Trend Detected" : "↓ Cooling Trend"} (p={data.temperature.trend.p_value?.toFixed(3)})
                    </span>
                  )}
                </div>

                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 10, right: 10, bottom: 5, left: -20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f3ee" />
                      <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#6b7280" }} interval="preserveStartEnd" />
                      <YAxis tick={{ fontSize: 10, fill: "#6b7280" }} unit="°C" />
                      <Tooltip
                        contentStyle={{
                          borderRadius: "0.75rem",
                          border: "1px solid #e2ece0",
                          fontSize: "12px",
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="temp"
                        stroke="#ea580c"
                        strokeWidth={2}
                        dot={false}
                        name="Temperature (°C)"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {data.temperature.trend?.interpretation && (
                  <p className="text-xs text-gray-600 mt-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                    <strong className="text-gray-800">OLS Regression Analysis:</strong> {data.temperature.trend.interpretation}
                  </p>
                )}
              </div>
            )}

            {/* Precipitation Trend */}
            {data.precipitation && (
              <div className="bg-white rounded-2xl p-6 border border-[#e2ece0] shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                  <div>
                    <h3 className="text-base font-bold text-[#1a2e1a]">
                      Monthly Precipitation Accumulation
                    </h3>
                    <p className="text-xs text-[#4a6741] mt-0.5">
                      NASA MERRA-2 bias-corrected total precipitation (mm)
                    </p>
                  </div>
                  {data.precipitation.trend?.significant && (
                    <span
                      className={`text-xs font-bold px-3 py-1 rounded-full border ${
                        data.precipitation.trend.direction === "decreasing"
                          ? "bg-amber-50 text-amber-700 border-amber-200"
                          : "bg-blue-50 text-blue-700 border-blue-200"
                      }`}
                    >
                      {data.precipitation.trend.direction === "decreasing" ? "↓ Drying Trend Detected" : "↑ Wetting Trend"} (p={data.precipitation.trend.p_value?.toFixed(3)})
                    </span>
                  )}
                </div>

                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 10, right: 10, bottom: 5, left: -20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f3ee" />
                      <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#6b7280" }} interval="preserveStartEnd" />
                      <YAxis tick={{ fontSize: 10, fill: "#6b7280" }} unit="mm" />
                      <Tooltip
                        contentStyle={{
                          borderRadius: "0.75rem",
                          border: "1px solid #e2ece0",
                          fontSize: "12px",
                        }}
                      />
                      <Bar dataKey="precip" fill="#2563eb" radius={[2, 2, 0, 0]} name="Precipitation (mm)" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
