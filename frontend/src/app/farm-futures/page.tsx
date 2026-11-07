"use client";

import { useState, useCallback, useEffect } from "react";
import {
  FlaskConical,
  Play,
  RotateCcw,
  AlertTriangle,
  Info,
  TrendingUp,
  TrendingDown,
  ShieldCheck,
  Globe2,
  Droplets,
  Thermometer,
  Layers,
  Sprout,
  MapPin,
} from "lucide-react";
import dynamic from "next/dynamic";
import {
  simulateScenario,
  reverseGeocodeLocation,
  type ScenarioSimulationResult,
} from "@/lib/api";
import ScenarioCharts from "@/components/ScenarioCharts";
import { useLocation } from "@/context/LocationContext";

// Dynamically import Leaflet map to prevent SSR window issues
const SimulationMap = dynamic(() => import("@/components/SimulationMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[320px] rounded-lg bg-slate-100 flex flex-col items-center justify-center text-slate-400 gap-2 border border-slate-200">
      <Globe2 className="h-6 w-6 text-[#0d3b2e] animate-spin" />
      <span className="text-xs font-semibold text-slate-700">Loading Geospatial Terrain...</span>
    </div>
  ),
});

const DEMO_LOCATIONS = [
  { label: "Kansas Wheat Belt, USA", lat: 38.34, lon: -98.12, region: "North America" },
  { label: "Punjab Plain, India", lat: 30.73, lon: 76.78, region: "South Asia" },
  { label: "Chennai Agro-District, India", lat: 13.0827, lon: 80.2707, region: "South Asia" },
  { label: "São Paulo State, Brazil", lat: -23.5505, lon: -46.6333, region: "South America" },
  { label: "Nairobi Basin, Kenya", lat: -1.2921, lon: 36.8219, region: "East Africa" },
  { label: "Sydney / Murray Basin, Australia", lat: -33.8688, lon: 151.2093, region: "Oceania" },
];

export default function FarmFuturesPage() {
  const { currentLocation, openModal, setLocation } = useLocation();

  const [lat, setLat] = useState(() => (currentLocation ? String(currentLocation.latitude) : "38.34"));
  const [lon, setLon] = useState(() => (currentLocation ? String(currentLocation.longitude) : "-98.12"));
  const [locationLabel, setLocationLabel] = useState(() => (currentLocation ? currentLocation.label : "Kansas Wheat Belt, USA"));
  const [startDate] = useState("2023-01-01");
  const [endDate] = useState("2023-12-31");

  useEffect(() => {
    if (currentLocation && typeof currentLocation.latitude === "number" && typeof currentLocation.longitude === "number") {
      setLat(String(currentLocation.latitude));
      setLon(String(currentLocation.longitude));
      if (currentLocation.label) setLocationLabel(currentLocation.label);
    }
  }, [currentLocation]);

  // Simulation Sliders
  const [rainfallDelta, setRainfallDelta] = useState(0); // -80% to +100%
  const [tempDelta, setTempDelta] = useState(0); // -4 to +6 °C
  const [soilDelta, setSoilDelta] = useState(0); // -0.3 to +0.3
  const [irrigation, setIrrigation] = useState(false);

  // Status and results
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [coordError, setCoordError] = useState<string | null>(null);
  const [result, setResult] = useState<ScenarioSimulationResult | null>(null);

  const validateCoordinates = (latStr: string, lonStr: string): boolean => {
    const latN = parseFloat(latStr);
    const lonN = parseFloat(lonStr);
    if (isNaN(latN) || isNaN(lonN)) {
      setCoordError("Coordinates must be valid numbers.");
      return false;
    }
    if (latN < -90 || latN > 90) {
      setCoordError("Latitude must be between -90.0° and +90.0°.");
      return false;
    }
    if (lonN < -180 || lonN > 180) {
      setCoordError("Longitude must be between -180.0° and +180.0°.");
      return false;
    }
    setCoordError(null);
    return true;
  };

  const selectLocation = (item: { label: string; latitude: number; longitude: number }) => {
    const latStr = String(item.latitude);
    const lonStr = String(item.longitude);
    setLat(latStr);
    setLon(lonStr);
    setLocationLabel(item.label);
    validateCoordinates(latStr, lonStr);
    setLocation({
      latitude: item.latitude,
      longitude: item.longitude,
      label: item.label,
      source: "preset",
    });
  };

  const handleMapSelect = async (newLat: number, newLon: number) => {
    const latStr = String(newLat);
    const lonStr = String(newLon);
    setLat(latStr);
    setLon(lonStr);
    validateCoordinates(latStr, lonStr);

    try {
      const rev = await reverseGeocodeLocation(newLat, newLon);
      setLocationLabel(rev.label);
      setLocation({
        latitude: newLat,
        longitude: newLon,
        label: rev.label,
        source: "map",
      });
    } catch {
      setLocationLabel(`Location (${newLat.toFixed(4)}°, ${newLon.toFixed(4)}°)`);
    }
  };

  const runSimulation = useCallback(async () => {
    if (!validateCoordinates(lat, lon)) {
      setError(coordError || "Please check coordinate values.");
      return;
    }

    const latN = parseFloat(lat);
    const lonN = parseFloat(lon);

    setLoading(true);
    setError(null);
    try {
      const data = await simulateScenario({
        latitude: latN,
        longitude: lonN,
        startDate,
        endDate,
        rainfallDeltaPct: rainfallDelta,
        tempDeltaC: tempDelta,
        soilMoistureDelta: soilDelta,
        irrigationAvailable: irrigation,
      });
      setResult(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to execute scenario simulation.");
    } finally {
      setLoading(false);
    }
  }, [lat, lon, startDate, endDate, rainfallDelta, tempDelta, soilDelta, irrigation, coordError]);

  const resetSliders = () => {
    setRainfallDelta(0);
    setTempDelta(0);
    setSoilDelta(0);
    setIrrigation(false);
  };

  return (
    <div className="max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-8 py-5 space-y-5">
      {/* ── Top Bar: Page Header ────────────────────────────────────── */}
      <div className="bg-white rounded-xl p-4 sm:p-5 border border-slate-200 shadow-2xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-[#0d3b2e] text-emerald-400">
              <FlaskConical className="h-4 w-4" />
            </span>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              Farm Futures Lab
            </h1>
            <span className="text-[10px] font-semibold uppercase text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              Bioclimatic Sensitivity Modeling
            </span>
          </div>
          <p className="text-xs text-slate-500 max-w-3xl leading-relaxed">
            Simulate hypothetical shifts in rainfall deficit (-80% to +100%), thermal accumulation (-4°C to +6°C), and root-zone moisture
            against NASA MERRA-2 historical baselines to evaluate crop rotation viability.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={runSimulation}
            disabled={loading || !!coordError}
            className="flex items-center gap-2 px-5 py-2 rounded-md bg-[#0d3b2e] hover:bg-[#134e39] text-white text-xs font-semibold shadow-2xs transition disabled:opacity-50 cursor-pointer"
          >
            {loading ? (
              <>
                <Globe2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                <span>Computing Perturbation...</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-white" />
                <span>Execute Simulation</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* ── Main Laboratory Layout (Left Controls 5 cols, Right Results 7 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column: Scenario Controls & Map (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Target Location Card */}
          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-[#0d3b2e]" />
                <span>Target Coordinate</span>
              </span>
              <button
                onClick={openModal}
                className="text-[11px] font-semibold text-[#0d3b2e] hover:underline"
              >
                Change
              </button>
            </div>

            <div>
              <div className="text-xs font-bold text-slate-900">{locationLabel}</div>
              <div className="text-[11px] font-mono text-slate-500">
                {parseFloat(lat).toFixed(4)}°N, {parseFloat(lon).toFixed(4)}°E
              </div>
            </div>

            {/* Quick Presets */}
            <div className="grid grid-cols-3 gap-1.5 pt-1">
              {DEMO_LOCATIONS.slice(0, 6).map((b) => (
                <button
                  key={b.label}
                  onClick={() => selectLocation({ label: b.label, latitude: b.lat, longitude: b.lon })}
                  className="p-1.5 rounded-md border border-slate-200 bg-slate-50 hover:bg-slate-100 text-left text-[11px] text-slate-700 transition truncate"
                >
                  {b.label.split(",")[0]}
                </button>
              ))}
            </div>

            {/* Compact Map Preview */}
            <div className="pt-2">
              <SimulationMap
                latitude={parseFloat(lat) || 38.34}
                longitude={parseFloat(lon) || -98.12}
                locationLabel={locationLabel}
                onSelectCoordinates={handleMapSelect}
              />
            </div>
          </div>

          {/* Scenario Perturbation Sliders Card */}
          <div className="bg-white rounded-xl p-4 sm:p-5 border border-slate-200 shadow-2xs space-y-5">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div>
                <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Thermometer className="w-3.5 h-3.5 text-[#0d3b2e]" />
                  <span>Climate Perturbation Sliders</span>
                </h2>
                <p className="text-[11px] text-slate-500">
                  Perturb baselines to test agroclimatic thresholds
                </p>
              </div>
              <button
                onClick={resetSliders}
                className="text-[11px] text-slate-500 hover:text-slate-900 flex items-center gap-1 px-2 py-0.5 rounded border border-slate-200 bg-slate-50 hover:bg-slate-100 transition"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset</span>
              </button>
            </div>

            {/* Slider 1: Precipitation Anomaly */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                  <Droplets className="w-3.5 h-3.5 text-blue-600" />
                  <span>Precipitation Delta (&Delta; Rainfall)</span>
                </span>
                <span
                  className={`px-2 py-0.2 rounded font-mono font-bold text-xs ${
                    rainfallDelta > 0
                      ? "bg-blue-50 text-blue-800 border border-blue-200"
                      : rainfallDelta < 0
                      ? "bg-amber-50 text-amber-800 border border-amber-200"
                      : "bg-slate-100 text-slate-700"
                  }`}
                >
                  {rainfallDelta > 0 ? `+${rainfallDelta}%` : `${rainfallDelta}%`}
                </span>
              </div>

              <input
                type="range"
                min="-80"
                max="100"
                step="5"
                value={rainfallDelta}
                onChange={(e) => setRainfallDelta(Number(e.target.value))}
                className="w-full accent-[#0d3b2e] cursor-pointer"
              />

              <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                <span>Severe Drought (-80%)</span>
                <span>Baseline (0%)</span>
                <span>Surplus (+100%)</span>
              </div>
            </div>

            {/* Slider 2: Thermal Forcing */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                  <Thermometer className="w-3.5 h-3.5 text-amber-600" />
                  <span>Thermal Forcing (&Delta; Temperature)</span>
                </span>
                <span
                  className={`px-2 py-0.2 rounded font-mono font-bold text-xs ${
                    tempDelta > 0
                      ? "bg-red-50 text-red-800 border border-red-200"
                      : tempDelta < 0
                      ? "bg-cyan-50 text-cyan-800 border border-cyan-200"
                      : "bg-slate-100 text-slate-700"
                  }`}
                >
                  {tempDelta > 0 ? `+${tempDelta}°C` : `${tempDelta}°C`}
                </span>
              </div>

              <input
                type="range"
                min="-4"
                max="6"
                step="0.5"
                value={tempDelta}
                onChange={(e) => setTempDelta(Number(e.target.value))}
                className="w-full accent-[#0d3b2e] cursor-pointer"
              />

              <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                <span>Cooling (-4.0°C)</span>
                <span>Baseline (0.0°C)</span>
                <span>Extreme Heat (+6.0°C)</span>
              </div>
            </div>

            {/* Slider 3: Root-Zone Soil Bias */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Root-Zone Soil Moisture Bias (&Delta; &theta;)</span>
                </span>
                <span className="px-2 py-0.2 rounded font-mono font-bold text-xs bg-slate-100 text-slate-700">
                  {soilDelta > 0 ? `+${soilDelta}` : `${soilDelta}`}
                </span>
              </div>

              <input
                type="range"
                min="-0.3"
                max="0.3"
                step="0.05"
                value={soilDelta}
                onChange={(e) => setSoilDelta(Number(e.target.value))}
                className="w-full accent-[#0d3b2e] cursor-pointer"
              />

              <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                <span>Depleted (-0.30)</span>
                <span>Baseline (0.00)</span>
                <span>Saturated (+0.30)</span>
              </div>
            </div>

            {/* Supplemental Irrigation Toggle */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-200">
              <div>
                <div className="text-xs font-semibold text-slate-900">Supplemental Irrigation System</div>
                <div className="text-[10px] text-slate-500">
                  Buffers moisture deficit (+0.15 effective soil fraction)
                </div>
              </div>
              <input
                type="checkbox"
                checked={irrigation}
                onChange={(e) => setIrrigation(e.target.checked)}
                className="h-4 w-4 accent-[#0d3b2e] rounded cursor-pointer"
              />
            </div>

            {/* Run Button */}
            <button
              onClick={runSimulation}
              disabled={loading || !!coordError}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#0d3b2e] hover:bg-[#134e39] text-white font-semibold text-xs rounded-md shadow-2xs transition disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <>
                  <Globe2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                  <span>Computing Scenario Response...</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-white" />
                  <span>Run Scenario Simulation</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Column: Simulation Findings & Visualizations (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          {!result && !loading && (
            <div className="min-h-[460px] flex flex-col items-center justify-center text-center p-8 bg-white rounded-xl border border-dashed border-slate-300 space-y-3">
              <div className="p-3 rounded-full bg-slate-100 text-[#0d3b2e]">
                <FlaskConical className="h-8 w-8" />
              </div>
              <div className="max-w-md space-y-1">
                <h3 className="font-bold text-slate-900 text-sm">
                  Ready to Simulate: {locationLabel}
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Adjust rainfall deficit, thermal shift, or soil bias on the left, then click &quot;Run Scenario Simulation&quot;
                  to evaluate before/after climate shifts and 6-crop rotation viability.
                </p>
              </div>
              <button
                onClick={runSimulation}
                className="px-4 py-2 bg-[#0d3b2e] text-white text-xs font-semibold rounded-md shadow-2xs hover:bg-[#134e39] transition flex items-center gap-1.5 cursor-pointer"
              >
                <Play className="w-3 h-3 fill-white" />
                <span>Simulate Baseline Conditions</span>
              </button>
            </div>
          )}

          {result && (
            <div className="space-y-4">
              {/* Shift Impact Summary Banner */}
              <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 uppercase tracking-wider">
                    <ShieldCheck className="w-4 h-4 text-[#0d3b2e]" />
                    <span>Scenario Impact Dossier</span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                    {result.delta_summary.stress_direction.toUpperCase()}
                  </span>
                </div>

                <p className="text-xs text-slate-700 leading-relaxed font-medium">
                  {result.narrative}
                </p>

                {/* 4 Delta Badges */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                    <div className="text-[10px] text-slate-500 uppercase font-semibold">Agricultural Stress</div>
                    <div className="flex items-baseline gap-1 font-bold text-sm mt-0.5 text-slate-900">
                      <span>{result.scenario.stress.score}/100</span>
                      <span
                        className={`text-xs ${
                          result.delta_summary.stress_delta < 0
                            ? "text-emerald-700"
                            : result.delta_summary.stress_delta > 0
                            ? "text-red-600"
                            : "text-slate-400"
                        }`}
                      >
                        ({result.delta_summary.stress_delta > 0
                          ? `+${result.delta_summary.stress_delta}`
                          : result.delta_summary.stress_delta})
                      </span>
                    </div>
                  </div>

                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                    <div className="text-[10px] text-slate-500 uppercase font-semibold">Precipitation Total</div>
                    <div className="flex items-baseline gap-1 font-bold text-sm mt-0.5 text-slate-900">
                      <span>{result.scenario.total_precip_mm} mm</span>
                      <span
                        className={`text-xs ${
                          result.delta_summary.precip_delta_mm >= 0 ? "text-blue-600" : "text-amber-600"
                        }`}
                      >
                        ({result.delta_summary.precip_delta_mm > 0
                          ? `+${result.delta_summary.precip_delta_mm}`
                          : result.delta_summary.precip_delta_mm})
                      </span>
                    </div>
                  </div>

                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                    <div className="text-[10px] text-slate-500 uppercase font-semibold">Cumulative GDD</div>
                    <div className="flex items-baseline gap-1 font-bold text-sm mt-0.5 text-slate-900">
                      <span>{result.scenario.total_gdd}</span>
                      <span className="text-xs text-purple-600">
                        ({result.delta_summary.gdd_delta > 0
                          ? `+${result.delta_summary.gdd_delta}`
                          : result.delta_summary.gdd_delta})
                      </span>
                    </div>
                  </div>

                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                    <div className="text-[10px] text-slate-500 uppercase font-semibold">Root Wetness</div>
                    <div className="flex items-baseline gap-1 font-bold text-sm mt-0.5 text-slate-900">
                      <span>{result.scenario.soil_mean}</span>
                      <span className="text-xs text-emerald-700">
                        ({result.delta_summary.soil_moisture_delta > 0
                          ? `+${result.delta_summary.soil_moisture_delta}`
                          : result.delta_summary.soil_moisture_delta})
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Side-by-Side Before / After Comparison */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Historical Baseline Box */}
                <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Historical Baseline
                      </span>
                      <span className="text-xs font-bold text-slate-900">Observed NASA MERRA-2</span>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                      {result.baseline.stress.level} ({result.baseline.stress.score}/100)
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs text-slate-600">
                    <div className="flex justify-between py-0.5 border-b border-slate-100">
                      <span>Mean 2m Temp:</span>
                      <span className="font-semibold text-slate-900">{result.baseline.mean_temp_c}°C</span>
                    </div>
                    <div className="flex justify-between py-0.5 border-b border-slate-100">
                      <span>Precipitation:</span>
                      <span className="font-semibold text-slate-900">{result.baseline.total_precip_mm} mm</span>
                    </div>
                    <div className="flex justify-between py-0.5 border-b border-slate-100">
                      <span>Cumulative GDD:</span>
                      <span className="font-semibold text-slate-900">{result.baseline.total_gdd}</span>
                    </div>
                    <div className="flex justify-between py-0.5">
                      <span>Root Wetness:</span>
                      <span className="font-semibold text-slate-900">{result.baseline.soil_mean}</span>
                    </div>
                  </div>
                </div>

                {/* Simulated Climate Box */}
                <div className="bg-white rounded-xl p-4 border border-[#0d3b2e] shadow-2xs space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <div>
                      <span className="text-[10px] font-bold text-[#0d3b2e] uppercase tracking-wider block">
                        Simulated Climate
                      </span>
                      <span className="text-xs font-bold text-slate-900">Perturbed Sensitivity</span>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                      {result.scenario.stress.level} ({result.scenario.stress.score}/100)
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs text-slate-600">
                    <div className="flex justify-between py-0.5 border-b border-slate-100">
                      <span>Mean 2m Temp:</span>
                      <span className="font-semibold text-slate-900">{result.scenario.mean_temp_c}°C</span>
                    </div>
                    <div className="flex justify-between py-0.5 border-b border-slate-100">
                      <span>Precipitation:</span>
                      <span className="font-semibold text-slate-900">{result.scenario.total_precip_mm} mm</span>
                    </div>
                    <div className="flex justify-between py-0.5 border-b border-slate-100">
                      <span>Cumulative GDD:</span>
                      <span className="font-semibold text-slate-900">{result.scenario.total_gdd}</span>
                    </div>
                    <div className="flex justify-between py-0.5">
                      <span>Root Wetness:</span>
                      <span className="font-semibold text-slate-900">{result.scenario.soil_mean}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Interactive Scenario Charts */}
              <ScenarioCharts result={result} />

              {/* Crop Suitability Shift Matrix */}
              <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Sprout className="w-3.5 h-3.5 text-[#0d3b2e]" />
                    <span>6-Crop Portfolio Adaptability Matrix</span>
                  </h3>
                  <span className="text-[10px] text-slate-400 font-mono">Biophysical Scoring</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 text-slate-600 uppercase font-semibold text-[10px] border-b border-slate-200">
                      <tr>
                        <th className="p-2.5">Crop Candidate</th>
                        <th className="p-2.5">Baseline</th>
                        <th className="p-2.5">Scenario</th>
                        <th className="p-2.5">Net Delta</th>
                        <th className="p-2.5">Water Need</th>
                        <th className="p-2.5">Viability Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                      {result.scenario.crops.map((scCrop) => {
                        const baseCrop = result.baseline.crops.find((c) => c.crop_id === scCrop.crop_id);
                        const diff = baseCrop ? Math.round((scCrop.score - baseCrop.score) * 10) / 10 : 0;
                        return (
                          <tr key={scCrop.crop_id} className="hover:bg-slate-50/60 transition">
                            <td className="p-2.5 font-bold font-sans text-slate-900">{scCrop.name}</td>
                            <td className="p-2.5 text-slate-600">{baseCrop?.score ?? "—"}</td>
                            <td className="p-2.5 font-bold text-[#0d3b2e] text-xs">{scCrop.score}</td>
                            <td className="p-2.5">
                              <span
                                className={`inline-flex items-center gap-0.5 font-bold ${
                                  diff > 0 ? "text-emerald-700" : diff < 0 ? "text-red-600" : "text-slate-400"
                                }`}
                              >
                                {diff > 0 ? <TrendingUp className="w-3 h-3" /> : diff < 0 ? <TrendingDown className="w-3 h-3" /> : null}
                                {diff > 0 ? `+${diff}` : diff}
                              </span>
                            </td>
                            <td className="p-2.5 text-slate-600">
                              {scCrop.water_need_mm} mm
                            </td>
                            <td className="p-2.5 font-sans">
                              {scCrop.score >= 70 ? (
                                <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 rounded font-semibold text-[10px] border border-emerald-200">
                                  Optimal
                                </span>
                              ) : scCrop.score >= 50 ? (
                                <span className="px-2 py-0.5 bg-amber-50 text-amber-800 rounded font-semibold text-[10px] border border-amber-200">
                                  Moderate
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 bg-red-50 text-red-800 rounded font-semibold text-[10px] border border-red-200">
                                  High Risk
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Scientific Assumptions Disclaimer */}
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-[11px] text-slate-600 flex gap-2 leading-relaxed">
                <Info className="h-4 w-4 shrink-0 text-slate-500 mt-0.5" />
                <span>
                  <strong>Scientific Methodology Note:</strong> Simulations apply linear perturbation to MERRA-2 meteorological time-series to test crop vulnerability curves. Outputs represent modeled biophysical suitability, clearly distinguished from historical observational data.
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
