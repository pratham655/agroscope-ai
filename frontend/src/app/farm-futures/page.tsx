"use client";

import { useState, useCallback, useRef } from "react";
import {
  FlaskConical,
  Play,
  RotateCcw,
  AlertTriangle,
  Info,
  TrendingUp,
  TrendingDown,
  ShieldCheck,
  Search,
  Navigation,
  Globe2,
  Droplets,
  Thermometer,
  Layers,
  Sprout,
  Calendar,
} from "lucide-react";
import dynamic from "next/dynamic";
import {
  simulateScenario,
  geocodeLocation,
  reverseGeocodeLocation,
  type ScenarioSimulationResult,
  type GeocodeLocation,
} from "@/lib/api";
import ScenarioCharts from "@/components/ScenarioCharts";
import { useLocation } from "@/context/LocationContext";
import GlobalLocationBar from "@/components/GlobalLocationBar";

// Dynamically import Leaflet map to prevent SSR window issues
const SimulationMap = dynamic(() => import("@/components/SimulationMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[360px] rounded-2xl bg-[#f0f4ef] animate-pulse flex flex-col items-center justify-center text-gray-400 gap-2 border border-[#d2e4d0]">
      <Globe2 className="h-8 w-8 text-[#2d7a3a]/40 animate-spin" />
      <span className="text-xs font-semibold text-[#4a6741]">Initializing NASA Earth Observation View...</span>
    </div>
  ),
});

// Global Agricultural Benchmark Presets
const DEMO_LOCATIONS = [
  { label: "Kansas Wheat Belt, USA", lat: 38.34, lon: -98.12, region: "North America" },
  { label: "Punjab Plain, India", lat: 30.73, lon: 76.78, region: "South Asia" },
  { label: "Chennai Agro-District, India", lat: 13.0827, lon: 80.2707, region: "South Asia" },
  { label: "São Paulo State, Brazil", lat: -23.5505, lon: -46.6333, region: "South America" },
  { label: "Nairobi Basin, Kenya", lat: -1.2921, lon: 36.8219, region: "East Africa" },
  { label: "Sydney / Murray Basin, Australia", lat: -33.8688, lon: 151.2093, region: "Oceania" },
  { label: "Iowa Corn Belt, USA", lat: 41.85, lon: -93.62, region: "North America" },
  { label: "California Central Valley, USA", lat: 36.75, lon: -119.77, region: "North America" },
];

export default function FarmFuturesPage() {
  const { currentLocation } = useLocation();

  // Selected location coordinates and label
  const [lat, setLat] = useState(() => (currentLocation ? String(currentLocation.latitude) : "38.34"));
  const [lon, setLon] = useState(() => (currentLocation ? String(currentLocation.longitude) : "-98.12"));
  const [locationLabel, setLocationLabel] = useState(() => (currentLocation ? currentLocation.label : "Kansas Wheat Belt, USA"));
  const [startDate, setStartDate] = useState("2023-01-01");
  const [endDate, setEndDate] = useState("2023-12-31");

  // Geocoding search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<GeocodeLocation[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [geoLocating, setGeoLocating] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);

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

  // Search debouncing ref
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Validate coordinates whenever changed
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

  // Perform geocoding search with debouncing
  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

    if (query.trim().length < 2) {
      setSearchResults([]);
      setShowSearchDropdown(false);
      return;
    }

    setIsSearching(true);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const results = await geocodeLocation(query);
        setSearchResults(results);
        setShowSearchDropdown(results.length > 0);
      } catch {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 350);
  };

  // Handle location selection from search or presets
  const selectLocation = async (item: { label: string; latitude: number; longitude: number }) => {
    const latStr = String(item.latitude);
    const lonStr = String(item.longitude);
    setLat(latStr);
    setLon(lonStr);
    setLocationLabel(item.label);
    setSearchQuery("");
    setShowSearchDropdown(false);
    validateCoordinates(latStr, lonStr);
  };

  // Select location by clicking on interactive map
  const handleMapSelect = async (newLat: number, newLon: number) => {
    const latStr = String(newLat);
    const lonStr = String(newLon);
    setLat(latStr);
    setLon(lonStr);
    validateCoordinates(latStr, lonStr);

    try {
      const rev = await reverseGeocodeLocation(newLat, newLon);
      setLocationLabel(rev.label);
    } catch {
      setLocationLabel(`Location (${newLat.toFixed(4)}°, ${newLon.toFixed(4)}°)`);
    }
  };

  // Browser Geolocation ("Use My Location")
  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      setGeoError("Geolocation is not supported by your current browser.");
      return;
    }

    setGeoLocating(true);
    setGeoError(null);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const userLat = parseFloat(pos.coords.latitude.toFixed(4));
        const userLon = parseFloat(pos.coords.longitude.toFixed(4));
        setLat(String(userLat));
        setLon(String(userLon));
        setGeoLocating(false);
        validateCoordinates(String(userLat), String(userLon));

        try {
          const rev = await reverseGeocodeLocation(userLat, userLon);
          setLocationLabel(`${rev.label} (Current Location)`);
        } catch {
          setLocationLabel(`My Location (${userLat.toFixed(4)}°, ${userLon.toFixed(4)}°)`);
        }
      },
      (err) => {
        setGeoLocating(false);
        if (err.code === err.PERMISSION_DENIED) {
          setGeoError("Location permission denied. Please allow location access or pick manually.");
        } else {
          setGeoError("Could not retrieve your physical location. Please select manually.");
        }
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  // Manual Lat/Lon change handlers
  const handleLatChange = (val: string) => {
    setLat(val);
    validateCoordinates(val, lon);
  };

  const handleLonChange = (val: string) => {
    setLon(val);
    validateCoordinates(lat, val);
  };

  // Execute simulation against backend
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* ── Professional NASA Platform Header ──────────────────────── */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#dce8da] shadow-xs relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-[#2d7a3a]/10 via-[#0b3d91]/5 to-transparent rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#eef7ec] border border-[#d2e4d0] text-xs font-bold text-[#2d7a3a]">
              <FlaskConical className="h-3.5 w-3.5" />
              <span>NASA Planetary Earth Observation · Agroclimatology Simulation Laboratory</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-[#1a2e1a] tracking-tight">
              Farm Futures Lab
            </h1>
            <p className="text-base font-semibold text-[#2d7a3a]">
              Planetary Earth Observations for Adaptive Agricultural Climate Resilience
            </p>
            <p className="text-xs sm:text-sm text-[#4a6741] leading-relaxed">
              Bioclimatic Sensitivity Modeling Powered by NASA POWER MERRA-2 &amp; GIBS Satellite Observations.
              Explore how hypothetical shifts in precipitation, thermal accumulation, and root-zone moisture
              affect agricultural stress indices and six rotation candidate crops.
            </p>
          </div>

          <div className="flex md:flex-col items-center md:items-end justify-between gap-3 shrink-0">
            <div className="text-right hidden md:block">
              <div className="text-[11px] uppercase tracking-wider font-bold text-gray-400">Scientific Engine</div>
              <div className="text-xs font-semibold text-[#1a2e1a]">NASA POWER MERRA-2 Reanalysis</div>
              <div className="text-[11px] text-[#4a6741]">Daily Meteorological &amp; Soil Synthesis</div>
            </div>

            <button
              onClick={runSimulation}
              disabled={loading || !!coordError}
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#2d7a3a] hover:bg-[#23602d] text-white font-semibold text-sm rounded-xl shadow-md shadow-[#2d7a3a]/20 transition disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Globe2 className="h-4 w-4 animate-spin" />
                  <span>Computing Scenario...</span>
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 fill-white" />
                  <span>Execute Simulation</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Persistent Global Location Intelligence Bar */}
      <GlobalLocationBar />

      {/* ── Location & Spatial Intelligence Workspace ──────────────── */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-[#dce8da] shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#eef4ed] pb-4">
          <div>
            <h2 className="text-base font-bold text-[#1a2e1a] flex items-center gap-2">
              <Navigation className="h-5 w-5 text-[#2d7a3a]" />
              Geographic &amp; Bioclimatic Site Selection
            </h2>
            <p className="text-xs text-[#4a6741]">
              Search global farming basins, click the interactive satellite map, or use GPS positioning
            </p>
          </div>

          {/* Quick preset selector buttons */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-bold text-gray-500 mr-1">Benchmarks:</span>
            {DEMO_LOCATIONS.map((loc) => (
              <button
                key={loc.label}
                onClick={() => selectLocation({ label: loc.label, latitude: loc.lat, longitude: loc.lon })}
                className={`text-[11px] px-2.5 py-1 rounded-lg font-medium transition border ${
                  Math.abs(parseFloat(lat) - loc.lat) < 0.1 && Math.abs(parseFloat(lon) - loc.lon) < 0.1
                    ? "bg-[#2d7a3a] text-white border-[#2d7a3a]"
                    : "bg-[#f7faf6] text-gray-700 border-[#dce8da] hover:bg-[#eef7ec] hover:text-[#2d7a3a]"
                }`}
              >
                {loc.label.split(",")[0]}
              </button>
            ))}
          </div>
        </div>

        {/* Search Bar & Manual Coordinate Controls */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Autocomplete Search Input */}
          <div className="lg:col-span-5 relative">
            <label className="block text-xs font-bold text-gray-700 mb-1.5">
              Search by Village, Town, City, District, State or Country
            </label>
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                onFocus={() => searchResults.length > 0 && setShowSearchDropdown(true)}
                placeholder="e.g., Ludhiana, Punjab or Finney County, Kansas..."
                className="w-full pl-9 pr-10 py-2.5 text-xs bg-[#fbfdfb] border border-[#d2e4d0] rounded-xl focus:ring-2 focus:ring-[#2d7a3a]/20 focus:border-[#2d7a3a] outline-none transition"
              />
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              {isSearching && (
                <div className="absolute right-3 top-3">
                  <Globe2 className="h-4 w-4 text-[#2d7a3a] animate-spin" />
                </div>
              )}
            </div>

            {/* Suggestions Dropdown */}
            {showSearchDropdown && searchResults.length > 0 && (
              <div className="absolute left-0 right-0 mt-1.5 bg-white border border-[#d2e4d0] rounded-xl shadow-lg z-50 max-h-60 overflow-y-auto divide-y divide-gray-100">
                {searchResults.map((item, idx) => (
                  <button
                    key={`${item.latitude}-${item.longitude}-${idx}`}
                    onClick={() => selectLocation(item)}
                    className="w-full text-left px-3.5 py-2.5 hover:bg-[#f4faf2] transition flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-semibold text-gray-800">{item.label}</div>
                      <div className="text-[10px] text-gray-400">
                        {item.type} · {item.country} ({item.latitude.toFixed(4)}°, {item.longitude.toFixed(4)}°)
                      </div>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-gray-100 text-gray-600 font-medium shrink-0">
                      Select
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Coordinate Precision Inputs */}
          <div className="lg:col-span-4 grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">
                Latitude (°N/S)
              </label>
              <input
                type="number"
                step="0.0001"
                min="-90"
                max="90"
                value={lat}
                onChange={(e) => handleLatChange(e.target.value)}
                className="w-full px-3 py-2.5 text-xs font-mono bg-[#fbfdfb] border border-[#d2e4d0] rounded-xl focus:ring-2 focus:ring-[#2d7a3a]/20 focus:border-[#2d7a3a] outline-none transition"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">
                Longitude (°E/W)
              </label>
              <input
                type="number"
                step="0.0001"
                min="-180"
                max="180"
                value={lon}
                onChange={(e) => handleLonChange(e.target.value)}
                className="w-full px-3 py-2.5 text-xs font-mono bg-[#fbfdfb] border border-[#d2e4d0] rounded-xl focus:ring-2 focus:ring-[#2d7a3a]/20 focus:border-[#2d7a3a] outline-none transition"
              />
            </div>
          </div>

          {/* GPS Button & Date Range */}
          <div className="lg:col-span-3 flex flex-col justify-end">
            <button
              onClick={handleUseMyLocation}
              disabled={geoLocating}
              className="w-full py-2.5 px-3 bg-[#eef7ec] hover:bg-[#e2f0e0] border border-[#c2ddbf] text-[#2d7a3a] text-xs font-bold rounded-xl transition flex items-center justify-center gap-2 shadow-xs disabled:opacity-50"
            >
              {geoLocating ? (
                <>
                  <Globe2 className="h-4 w-4 animate-spin text-[#2d7a3a]" />
                  <span>Accessing GPS...</span>
                </>
              ) : (
                <>
                  <Navigation className="h-4 w-4" />
                  <span>Use My Location</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Validation Error Notices */}
        {coordError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{coordError}</span>
          </div>
        )}
        {geoError && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700 flex items-center gap-2">
            <Info className="h-4 w-4 shrink-0" />
            <span>{geoError}</span>
          </div>
        )}

        {/* Central Satellite & Earth Observation Map Component */}
        <SimulationMap
          latitude={parseFloat(lat) || 38.34}
          longitude={parseFloat(lon) || -98.12}
          locationLabel={locationLabel}
          onSelectCoordinates={handleMapSelect}
        />
      </div>

      {/* ── Main Simulation Workspace: Controls + Findings ─────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Climate Perturbation Simulator Controls (5 Cols) */}
        <div className="lg:col-span-5 bg-white rounded-3xl p-6 sm:p-7 border border-[#dce8da] shadow-xs space-y-6">
          <div className="flex items-center justify-between border-b border-[#eef4ed] pb-3">
            <div>
              <h2 className="text-base font-bold text-[#1a2e1a] flex items-center gap-2">
                <Thermometer className="h-5 w-5 text-[#2d7a3a]" />
                Climate Shift Simulator
              </h2>
              <p className="text-[11px] text-[#4a6741]">
                Perturb environmental baselines to observe agricultural sensitivity
              </p>
            </div>
            <button
              onClick={resetSliders}
              className="text-xs text-gray-500 hover:text-[#2d7a3a] flex items-center gap-1 font-semibold transition bg-gray-50 hover:bg-gray-100 px-2.5 py-1 rounded-lg border border-gray-200"
            >
              <RotateCcw className="h-3 w-3" /> Reset Baseline
            </button>
          </div>

          {/* Temporal Period Picker */}
          <div className="bg-[#f9fbf8] p-3.5 rounded-2xl border border-[#e5eee3] space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-[#1a2e1a]">
              <span className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-[#2d7a3a]" />
                Baseline Analysis Window
              </span>
              <span className="text-[11px] font-normal text-gray-500">NASA POWER MERRA-2</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-[10px] text-gray-500 font-semibold block mb-0.5">Start Date</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-2 py-1.5 bg-white border border-[#d2e4d0] rounded-lg text-xs outline-none focus:border-[#2d7a3a]"
                />
              </div>
              <div>
                <span className="text-[10px] text-gray-500 font-semibold block mb-0.5">End Date</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-2 py-1.5 bg-white border border-[#d2e4d0] rounded-lg text-xs outline-none focus:border-[#2d7a3a]"
                />
              </div>
            </div>
          </div>

          {/* Slider 1: Precipitation Anomaly */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs font-bold">
              <span className="text-gray-700 flex items-center gap-1.5">
                <Droplets className="h-4 w-4 text-[#1e6fa8]" />
                Precipitation Anomaly (&Delta; Rainfall)
              </span>
              <span
                className={`px-2.5 py-0.5 rounded-full font-mono font-bold text-xs ${
                  rainfallDelta > 0
                    ? "bg-blue-100 text-blue-800"
                    : rainfallDelta < 0
                    ? "bg-amber-100 text-amber-800"
                    : "bg-gray-100 text-gray-700"
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
              className="w-full accent-[#2d7a3a] cursor-pointer"
            />

            <div className="flex justify-between text-[10px] text-gray-400 font-medium">
              <span>Severe Drought (-80%)</span>
              <span>Baseline (0%)</span>
              <span>Surplus (+100%)</span>
            </div>

            {/* Quick Presets for Rainfall */}
            <div className="flex items-center gap-1.5 pt-1">
              {[
                { label: "Drought (-40%)", val: -40 },
                { label: "Deficit (-15%)", val: -15 },
                { label: "Normal (0%)", val: 0 },
                { label: "Surplus (+30%)", val: 30 },
              ].map((p) => (
                <button
                  key={p.label}
                  onClick={() => setRainfallDelta(p.val)}
                  className={`text-[10px] px-2 py-0.5 rounded-md border transition ${
                    rainfallDelta === p.val
                      ? "bg-[#2d7a3a] text-white border-[#2d7a3a]"
                      : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Slider 2: Thermal Forcing (Temperature) */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs font-bold">
              <span className="text-gray-700 flex items-center gap-1.5">
                <Thermometer className="h-4 w-4 text-[#ea580c]" />
                Thermal Forcing (&Delta; Temperature)
              </span>
              <span
                className={`px-2.5 py-0.5 rounded-full font-mono font-bold text-xs ${
                  tempDelta > 0
                    ? "bg-red-100 text-red-800"
                    : tempDelta < 0
                    ? "bg-cyan-100 text-cyan-800"
                    : "bg-gray-100 text-gray-700"
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
              className="w-full accent-[#2d7a3a] cursor-pointer"
            />

            <div className="flex justify-between text-[10px] text-gray-400 font-medium">
              <span>Cooling (-4.0°C)</span>
              <span>Baseline (0.0°C)</span>
              <span>Extreme Warming (+6.0°C)</span>
            </div>

            {/* Quick Presets for Temperature */}
            <div className="flex items-center gap-1.5 pt-1">
              {[
                { label: "+1.5°C (Paris)", val: 1.5 },
                { label: "+2.5°C (Moderate)", val: 2.5 },
                { label: "+4.0°C (High)", val: 4.0 },
              ].map((p) => (
                <button
                  key={p.label}
                  onClick={() => setTempDelta(p.val)}
                  className={`text-[10px] px-2 py-0.5 rounded-md border transition ${
                    tempDelta === p.val
                      ? "bg-[#2d7a3a] text-white border-[#2d7a3a]"
                      : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Slider 3: Soil Moisture Bias */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs font-bold">
              <span className="text-gray-700 flex items-center gap-1.5">
                <Layers className="h-4 w-4 text-[#8b5e3c]" />
                Root-Zone Soil Moisture Bias (&Delta; &theta;)
              </span>
              <span className="px-2.5 py-0.5 rounded-full font-mono font-bold text-xs bg-gray-100 text-gray-800">
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
              className="w-full accent-[#2d7a3a] cursor-pointer"
            />

            <div className="flex justify-between text-[10px] text-gray-400 font-medium">
              <span>Depleted (-0.30)</span>
              <span>Baseline (0.00)</span>
              <span>Field Saturated (+0.30)</span>
            </div>
          </div>

          {/* Toggle: Supplemental Irrigation */}
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[#f7faf6] border border-[#dce8da]">
            <div>
              <div className="text-xs font-bold text-[#1a2e1a]">Supplemental Irrigation System</div>
              <div className="text-[11px] text-gray-500">
                Buffers root-zone moisture deficit (+0.15 effective soil fraction)
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={irrigation}
                onChange={(e) => setIrrigation(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-10 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#2d7a3a]"></div>
            </label>
          </div>

          {/* Simulation Trigger Button */}
          <button
            onClick={runSimulation}
            disabled={loading || !!coordError}
            className="w-full flex items-center justify-center gap-2 py-3.5 bg-[#2d7a3a] hover:bg-[#23602d] text-white font-bold text-sm rounded-2xl shadow-md shadow-[#2d7a3a]/20 transition disabled:opacity-50"
          >
            {loading ? (
              <>
                <Globe2 className="h-4 w-4 animate-spin" />
                <span>Running NASA Science Pipeline...</span>
              </>
            ) : (
              <>
                <Play className="h-4 w-4 fill-white" />
                <span>Run Scenario Simulation</span>
              </>
            )}
          </button>

          {/* Scientific Disclaimer Note */}
          <div className="p-3.5 bg-[#fefbf2] rounded-2xl border border-[#f5e6be] text-[11px] text-[#8d6215] flex gap-2.5 leading-relaxed">
            <Info className="h-4 w-4 shrink-0 text-[#c4860a] mt-0.5" />
            <span>
              <strong>Scientific Framing:</strong> Simulations perturb historical MERRA-2 baselines to evaluate
              crop sensitivity. Results represent hypothetical biophysical responses, not deterministic yield forecasts.
            </span>
          </div>
        </div>

        {/* Right Column: Simulation Findings & Visualizations (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-sm text-red-700 flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 shrink-0 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Empty State: Ready for Simulation */}
          {!result && !loading && (
            <div className="h-full min-h-[460px] flex flex-col items-center justify-center text-center p-8 bg-white rounded-3xl border border-dashed border-[#cfe0cc] space-y-4">
              <div className="p-4 rounded-full bg-[#f0f7ee] text-[#2d7a3a]">
                <FlaskConical className="h-10 w-10" />
              </div>
              <div className="max-w-md space-y-2">
                <h3 className="font-extrabold text-[#1a2e1a] text-lg">
                  Simulation Ready for {locationLabel}
                </h3>
                <p className="text-xs sm:text-sm text-[#4a6741] leading-relaxed">
                  Select your desired precipitation anomaly, thermal shift, or soil bias on the left,
                  then click &quot;Run Scenario Simulation&quot; to compute the comparative response of six rotation crops.
                </p>
              </div>
              <button
                onClick={runSimulation}
                className="px-5 py-2.5 bg-[#2d7a3a] text-white text-xs font-bold rounded-xl shadow-sm hover:bg-[#23602d] transition flex items-center gap-2"
              >
                <Play className="h-3.5 w-3.5 fill-white" />
                Simulate Baseline Conditions
              </button>
            </div>
          )}

          {/* Active Simulation Results Section */}
          {result && (
            <div className="space-y-6">
              {/* Findings & Bioclimatic Narrative Banner */}
              <div className="p-6 bg-gradient-to-br from-[#f0f7ee] via-white to-[#f8faf5] rounded-3xl border border-[#d3e5d0] shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#2d7a3a] uppercase tracking-wider">
                    <ShieldCheck className="h-4 w-4" />
                    <span>Scientific Narrative &amp; Shift Impact</span>
                  </div>
                  <span className="text-[11px] font-mono text-gray-500 bg-white px-2.5 py-0.5 rounded-full border border-[#d2e4d0]">
                    {result.delta_summary.stress_direction.toUpperCase()}
                  </span>
                </div>

                <p className="text-xs sm:text-sm text-[#253823] font-medium leading-relaxed">
                  {result.narrative}
                </p>

                {/* Metric Delta Badges Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-[#deede0]">
                  <div className="bg-white p-3 rounded-2xl border border-[#e2ece0] shadow-2xs">
                    <div className="text-[10px] text-gray-500 uppercase font-bold">Agricultural Stress</div>
                    <div className="flex items-baseline gap-1 font-bold text-sm mt-0.5">
                      <span>{result.scenario.stress.score}/100</span>
                      <span
                        className={`text-xs ${
                          result.delta_summary.stress_delta < 0
                            ? "text-green-600"
                            : result.delta_summary.stress_delta > 0
                            ? "text-red-600"
                            : "text-gray-400"
                        }`}
                      >
                        ({result.delta_summary.stress_delta > 0
                          ? `+${result.delta_summary.stress_delta}`
                          : result.delta_summary.stress_delta})
                      </span>
                    </div>
                  </div>

                  <div className="bg-white p-3 rounded-2xl border border-[#e2ece0] shadow-2xs">
                    <div className="text-[10px] text-gray-500 uppercase font-bold">Seasonal Precip</div>
                    <div className="flex items-baseline gap-1 font-bold text-sm mt-0.5">
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

                  <div className="bg-white p-3 rounded-2xl border border-[#e2ece0] shadow-2xs">
                    <div className="text-[10px] text-gray-500 uppercase font-bold">Cumulative GDD</div>
                    <div className="flex items-baseline gap-1 font-bold text-sm mt-0.5">
                      <span>{result.scenario.total_gdd}</span>
                      <span className="text-xs text-purple-600">
                        ({result.delta_summary.gdd_delta > 0
                          ? `+${result.delta_summary.gdd_delta}`
                          : result.delta_summary.gdd_delta})
                      </span>
                    </div>
                  </div>

                  <div className="bg-white p-3 rounded-2xl border border-[#e2ece0] shadow-2xs">
                    <div className="text-[10px] text-gray-500 uppercase font-bold">Root-Zone Wetness</div>
                    <div className="flex items-baseline gap-1 font-bold text-sm mt-0.5">
                      <span>{result.scenario.soil_mean}</span>
                      <span className="text-xs text-emerald-600">
                        ({result.delta_summary.soil_moisture_delta > 0
                          ? `+${result.delta_summary.soil_moisture_delta}`
                          : result.delta_summary.soil_moisture_delta})
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Side-by-Side Environmental Condition Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Historical Baseline Box */}
                <div className="bg-white rounded-3xl p-5 border border-[#e2ece0] shadow-xs space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">
                        Historical Baseline
                      </span>
                      <span className="text-sm font-extrabold text-[#1a2e1a]">Observed NASA MERRA-2</span>
                    </div>
                    <span
                      className="px-2.5 py-1 rounded-full text-xs font-bold"
                      style={{
                        backgroundColor: `${result.baseline.stress.color}20`,
                        color: result.baseline.stress.color,
                      }}
                    >
                      {result.baseline.stress.level} ({result.baseline.stress.score}/100)
                    </span>
                  </div>

                  <div className="space-y-2.5 text-xs">
                    <div className="flex justify-between py-1 border-b border-gray-100">
                      <span className="text-gray-500">Surface Air Temp (2m):</span>
                      <span className="font-semibold text-gray-800">{result.baseline.mean_temp_c}°C</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-gray-100">
                      <span className="text-gray-500">Precipitation Accumulation:</span>
                      <span className="font-semibold text-gray-800">{result.baseline.total_precip_mm} mm</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-gray-100">
                      <span className="text-gray-500">Cumulative GDD (Base 10°C):</span>
                      <span className="font-semibold text-gray-800">{result.baseline.total_gdd} °C·day</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-gray-500">Root-Zone Wetness Fraction:</span>
                      <span className="font-semibold text-gray-800">{result.baseline.soil_mean}</span>
                    </div>
                  </div>

                  <div className="border-t border-[#f0f7ee] pt-3">
                    <div className="text-xs font-bold text-gray-700 mb-2">Top 3 Baseline Crops:</div>
                    <div className="space-y-1.5">
                      {result.baseline.crops.slice(0, 3).map((crop, idx) => (
                        <div
                          key={crop.crop_id}
                          className="flex justify-between items-center text-xs p-2 rounded-xl bg-gray-50"
                        >
                          <span className="font-semibold text-gray-800">
                            {idx + 1}. {crop.name}
                          </span>
                          <span className="font-bold text-[#2d7a3a]">{crop.score} pts</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Simulated Climate Scenario Box */}
                <div className="bg-white rounded-3xl p-5 border-2 border-[#2d7a3a]/40 shadow-sm relative overflow-hidden space-y-4">
                  <div className="absolute top-0 right-0 bg-[#2d7a3a] text-white text-[9px] font-extrabold uppercase px-3 py-1 rounded-bl-xl tracking-wider">
                    Perturbed Scenario
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-[#2d7a3a] uppercase tracking-wider block">
                        Simulated Climate
                      </span>
                      <span className="text-sm font-extrabold text-[#1a2e1a]">Perturbed Sensitivity</span>
                    </div>
                    <span
                      className="px-2.5 py-1 rounded-full text-xs font-bold mr-20"
                      style={{
                        backgroundColor: `${result.scenario.stress.color}20`,
                        color: result.scenario.stress.color,
                      }}
                    >
                      {result.scenario.stress.level} ({result.scenario.stress.score}/100)
                    </span>
                  </div>

                  <div className="space-y-2.5 text-xs">
                    <div className="flex justify-between py-1 border-b border-gray-100">
                      <span className="text-gray-500">Surface Air Temp:</span>
                      <span className="font-semibold text-gray-800">{result.scenario.mean_temp_c}°C</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-gray-100">
                      <span className="text-gray-500">Precipitation Accumulation:</span>
                      <span className="font-semibold text-gray-800">{result.scenario.total_precip_mm} mm</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-gray-100">
                      <span className="text-gray-500">Cumulative GDD:</span>
                      <span className="font-semibold text-gray-800">{result.scenario.total_gdd} °C·day</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-gray-500">Root-Zone Wetness Fraction:</span>
                      <span className="font-semibold text-gray-800">{result.scenario.soil_mean}</span>
                    </div>
                  </div>

                  <div className="border-t border-[#f0f7ee] pt-3">
                    <div className="text-xs font-bold text-[#2d7a3a] mb-2">Scenario Crop Ranking:</div>
                    <div className="space-y-1.5">
                      {result.scenario.crops.slice(0, 3).map((crop, idx) => (
                        <div
                          key={crop.crop_id}
                          className="flex justify-between items-center text-xs p-2 rounded-xl bg-[#f4faf2]"
                        >
                          <span className="font-semibold text-gray-800">
                            {idx + 1}. {crop.name}
                          </span>
                          <span className="font-bold text-[#2d7a3a]">{crop.score} pts</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Interactive Visualizations */}
              <ScenarioCharts result={result} />

              {/* Complete Crop Suitability Shift Matrix */}
              <div className="bg-white rounded-3xl p-6 border border-[#e2ece0] shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="text-base font-bold text-[#1a2e1a] flex items-center gap-2">
                      <Sprout className="h-5 w-5 text-[#2d7a3a]" />
                      Crop Suitability Shift Matrix (Full 6-Crop Portfolio)
                    </h3>
                    <p className="text-xs text-[#4a6741]">
                      Detailed biophysical suitability scores under perturbed hydrothermal forcing
                    </p>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-[#f7faf6] text-gray-600 uppercase font-bold text-[11px]">
                      <tr>
                        <th className="p-3">Crop Candidate</th>
                        <th className="p-3">Baseline Score</th>
                        <th className="p-3">Scenario Score</th>
                        <th className="p-3">Net Shift</th>
                        <th className="p-3">Water Need (mm)</th>
                        <th className="p-3">Suitability Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {result.scenario.crops.map((scCrop) => {
                        const baseCrop = result.baseline.crops.find((c) => c.crop_id === scCrop.crop_id);
                        const diff = baseCrop ? Math.round((scCrop.score - baseCrop.score) * 10) / 10 : 0;
                        return (
                          <tr key={scCrop.crop_id} className="hover:bg-gray-50/80 transition">
                            <td className="p-3 font-bold text-gray-800 flex items-center gap-2">
                              <span>{scCrop.name}</span>
                            </td>
                            <td className="p-3 text-gray-600 font-mono">{baseCrop?.score ?? "—"}</td>
                            <td className="p-3 font-bold text-[#2d7a3a] font-mono text-sm">{scCrop.score}</td>
                            <td className="p-3">
                              <span
                                className={`inline-flex items-center gap-0.5 font-bold font-mono ${
                                  diff > 0
                                    ? "text-green-600"
                                    : diff < 0
                                    ? "text-red-600"
                                    : "text-gray-400"
                                }`}
                              >
                                {diff > 0 ? (
                                  <TrendingUp className="h-3.5 w-3.5" />
                                ) : diff < 0 ? (
                                  <TrendingDown className="h-3.5 w-3.5" />
                                ) : null}
                                {diff > 0 ? `+${diff}` : diff}
                              </span>
                            </td>
                            <td className="p-3 text-gray-600 font-mono">
                              {scCrop.water_need_mm} mm
                              <span className="text-[10px] text-gray-400 block">
                                (Avail: {result.scenario.total_precip_mm} mm)
                              </span>
                            </td>
                            <td className="p-3">
                              {scCrop.score >= 70 ? (
                                <span className="px-2.5 py-1 bg-green-100 text-green-800 rounded-full font-bold text-[10px]">
                                  Optimal Viability
                                </span>
                              ) : scCrop.score >= 50 ? (
                                <span className="px-2.5 py-1 bg-yellow-100 text-yellow-800 rounded-full font-bold text-[10px]">
                                  Moderate Viability
                                </span>
                              ) : (
                                <span className="px-2.5 py-1 bg-red-100 text-red-800 rounded-full font-bold text-[10px]">
                                  High Climatic Risk
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

              {/* Water Management & Adaptation Plan */}
              <div className="bg-white rounded-3xl p-6 border border-[#e2ece0] shadow-xs space-y-4">
                <div className="flex items-center gap-2 text-base font-bold text-[#1a2e1a]">
                  <Droplets className="h-5 w-5 text-[#1e6fa8]" />
                  <span>Evidence-Grounded Climate Adaptation &amp; Water Management Plan</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-[#f8faf7] rounded-2xl border border-[#e2ece0] space-y-2">
                    <div className="text-xs font-bold text-[#2d7a3a] uppercase">1. Irrigation Scheduling</div>
                    <p className="text-xs text-gray-600 leading-relaxed">
                      {result.scenario_inputs.rainfall_delta_pct < -20
                        ? "Implement deficit drip irrigation. Moisture deficits during reproductive stages (anthesis/silking) reduce yields exponentially. Buffer root-zone tension below 45 kPa."
                        : "Maintain scheduled baseline moisture monitoring. Natural precipitation provides adequate seasonal depth."}
                    </p>
                  </div>

                  <div className="p-4 bg-[#f8faf7] rounded-2xl border border-[#e2ece0] space-y-2">
                    <div className="text-xs font-bold text-[#2d7a3a] uppercase">2. Phenological Window</div>
                    <p className="text-xs text-gray-600 leading-relaxed">
                      {result.scenario_inputs.temp_delta_c > 1.5
                        ? "Shift sowing window earlier by 10–18 days to avoid terminal heat stress during grain fill, capitalizing on accelerated GDD accumulation."
                        : "Follow standard seasonal planting windows; temperature anomalies remain within historical standard deviations."}
                    </p>
                  </div>

                  <div className="p-4 bg-[#f8faf7] rounded-2xl border border-[#e2ece0] space-y-2">
                    <div className="text-xs font-bold text-[#2d7a3a] uppercase">3. Varietal Selection</div>
                    <p className="text-xs text-gray-600 leading-relaxed">
                      {result.scenario_inputs.rainfall_delta_pct < -15 || result.scenario_inputs.temp_delta_c > 2.0
                        ? "Prioritize heat-hardy, drought-tolerant cultivars (such as Sorghum and Millets) exhibiting high water-use efficiency (WUE) and stay-green traits."
                        : "Standard commercial varieties of primary cereal crops are well-matched to current hydrothermal availability."}
                    </p>
                  </div>
                </div>
              </div>

              {/* Scientific Limitations & Disclaimer Disclosure */}
              <div className="p-5 bg-gray-50 border border-gray-200 rounded-2xl text-xs text-gray-600 space-y-2">
                <div className="font-bold text-gray-800 flex items-center gap-1.5">
                  <Info className="h-4 w-4 text-gray-500" />
                  <span>Scientific Modeling Assumptions &amp; NASA Data Sources</span>
                </div>
                <p className="leading-relaxed">
                  {result.scientific_disclaimer}
                </p>
                <div className="text-[11px] text-gray-500 pt-1 border-t border-gray-200">
                  Data source: {result.data_source}. Historical baseline period: {result.period.start} to {result.period.end}.
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
