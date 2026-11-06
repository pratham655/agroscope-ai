"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  X,
  Search,
  MapPin,
  Navigation,
  Globe2,
  Bookmark,
  Check,
  AlertCircle,
  Compass,
} from "lucide-react";
import { useLocation } from "@/context/LocationContext";
import { type GeocodeLocation } from "@/lib/api";

const GLOBAL_CROPS = [
  "Rice / Wheat Rotation",
  "Hard Red Winter Wheat",
  "Corn / Soybean Rotation",
  "Soybean / Sugarcane / Citrus",
  "Paddy Rice / Pulses",
  "Maize / Horticulture / Coffee",
  "Winter Cereals / Pasture",
  "Cotton / Wheat / Vegetables",
  "Maize / Forage / Rice",
  "Pearl / Finger Millet",
  "Chickpea / Pulses",
  "Potato / Tubers",
  "Sunflower / Oilseeds",
  "Custom / Mixed Agroforestry",
];

export default function GlobalLocationModal() {
  const {
    currentLocation,
    setLocation,
    savedLocations,
    saveLocation,
    removeSavedLocation,
    isModalOpen,
    closeModal,
    presets,
    searchLocations,
    reverseGeocode,
    acquireGpsLocation,
    formattedCoords,
    hemisphereLabel,
  } = useLocation();

  const [activeTab, setActiveTab] = useState<"search" | "coords" | "presets" | "saved">("search");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<GeocodeLocation[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Manual Coordinate inputs
  const [inputLat, setInputLat] = useState(String(currentLocation.latitude));
  const [inputLon, setInputLon] = useState(String(currentLocation.longitude));
  const [inputLabel, setInputLabel] = useState(currentLocation.label);
  const [coordError, setCoordError] = useState<string | null>(null);
  const [resolvingCoord, setResolvingCoord] = useState(false);

  // Crop & Date range
  const [selectedCrop, setSelectedCrop] = useState(currentLocation.crop || GLOBAL_CROPS[0]);
  const [startDate, setStartDate] = useState(currentLocation.startDate || "2023-01-01");
  const [endDate, setEndDate] = useState(currentLocation.endDate || "2023-12-31");

  // GPS state
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);

  const searchTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isModalOpen) {
      /* eslint-disable react-hooks/set-state-in-effect */
      setInputLat(String(currentLocation.latitude));
      setInputLon(String(currentLocation.longitude));
      setInputLabel(currentLocation.label);
      setSelectedCrop(currentLocation.crop || GLOBAL_CROPS[0]);
      setStartDate(currentLocation.startDate || "2023-01-01");
      setEndDate(currentLocation.endDate || "2023-12-31");
      /* eslint-enable react-hooks/set-state-in-effect */
    }
  }, [isModalOpen, currentLocation]);

  // Debounced search handler
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchQuery(val);
    setSearchError(null);

    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);

    if (val.trim().length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    searchTimerRef.current = setTimeout(async () => {
      try {
        const results = await searchLocations(val);
        setSearchResults(results);
        if (results.length === 0) {
          setSearchError("No locations matched. You can also type decimal coordinates directly (e.g., '13.08, 80.27').");
        }
      } catch {
        setSearchError("Location search unavailable. Please enter coordinates manually.");
      } finally {
        setIsSearching(false);
      }
    }, 350);
  };

  const handleSelectSearchResult = (loc: GeocodeLocation) => {
    setLocation({
      latitude: loc.latitude,
      longitude: loc.longitude,
      label: loc.label,
      name: loc.name,
      country: loc.country,
      crop: selectedCrop,
      startDate,
      endDate,
      source: "search",
    });
    closeModal();
  };

  const handleSelectPreset = (p: typeof presets[0]) => {
    setLocation({
      latitude: p.latitude,
      longitude: p.longitude,
      label: p.label,
      name: p.name,
      country: p.country,
      region: p.region,
      crop: p.crop || selectedCrop,
      startDate,
      endDate,
      source: "preset",
    });
    closeModal();
  };

  const handleManualApply = async () => {
    const latN = parseFloat(inputLat.trim());
    const lonN = parseFloat(inputLon.trim());

    if (isNaN(latN) || isNaN(lonN)) {
      setCoordError("Please enter valid decimal coordinates.");
      return;
    }
    if (latN < -90 || latN > 90) {
      setCoordError("Latitude must be between -90.0° and +90.0°.");
      return;
    }
    if (lonN < -180 || lonN > 180) {
      setCoordError("Longitude must be between -180.0° and +180.0°.");
      return;
    }

    setCoordError(null);
    setResolvingCoord(true);

    let finalLabel = inputLabel.trim();
    let place = "Custom Agricultural Parcel";
    let country = "Global Coordinates";

    try {
      const rev = await reverseGeocode(latN, lonN);
      if (rev && rev.label && !finalLabel) {
        finalLabel = rev.label;
        if (rev.place) place = rev.place;
        if (rev.country) country = rev.country;
      }
    } catch {
      // Keep coordinate label
    } finally {
      setResolvingCoord(false);
    }

    if (!finalLabel) {
      const latDir = latN >= 0 ? "N" : "S";
      const lonDir = lonN >= 0 ? "E" : "W";
      finalLabel = `Field Coordinates (${Math.abs(latN).toFixed(4)}°${latDir}, ${Math.abs(lonN).toFixed(4)}°${lonDir})`;
    }

    setLocation({
      latitude: latN,
      longitude: lonN,
      label: finalLabel,
      name: place,
      country,
      crop: selectedCrop,
      startDate,
      endDate,
      source: "coords",
    });
    closeModal();
  };

  const handleUseGps = async () => {
    setGpsLoading(true);
    setGpsError(null);
    try {
      await acquireGpsLocation();
      closeModal();
    } catch (err: unknown) {
      setGpsError(err instanceof Error ? err.message : "Failed to obtain GPS location.");
    } finally {
      setGpsLoading(false);
    }
  };

  if (!isModalOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-[#d2e4d0] w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-linear-to-r from-[#183624] via-[#234b32] to-[#2d7a3a] text-white p-6 relative">
          <button
            onClick={closeModal}
            className="absolute top-5 right-5 p-2 rounded-full hover:bg-white/10 text-white/80 hover:text-white transition-colors"
            title="Close"
          >
            <X className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-400/20 text-emerald-300 text-[11px] font-bold tracking-wider uppercase border border-emerald-400/30">
              Universal Location Engine
            </span>
            <span className="text-white/60 text-xs">• NASA Global Coverage</span>
          </div>
          <h2 className="text-xl font-extrabold tracking-tight">Select Any Agricultural Field on Earth</h2>
          <p className="text-white/70 text-xs mt-1">
            Analyze arbitrary coordinates worldwide. Never bound to hardcoded benchmark locations.
          </p>

          {/* Current Active Location Pill */}
          <div className="mt-4 p-2.5 rounded-xl bg-white/10 border border-white/15 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 truncate">
              <MapPin className="h-4 w-4 text-emerald-300 shrink-0" />
              <span className="font-semibold truncate">{currentLocation.label}</span>
              <span className="text-white/60 shrink-0 font-mono">({formattedCoords})</span>
            </div>
            <span className="shrink-0 text-[11px] px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-200 font-medium">
              {hemisphereLabel}
            </span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-[#e2ece0] bg-[#f8faf7] px-6 pt-3 gap-2">
          <button
            onClick={() => setActiveTab("search")}
            className={`pb-3 px-3 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 ${
              activeTab === "search"
                ? "border-[#2d7a3a] text-[#2d7a3a]"
                : "border-transparent text-gray-500 hover:text-gray-800"
            }`}
          >
            <Search className="h-3.5 w-3.5" />
            Global Search
          </button>
          <button
            onClick={() => setActiveTab("coords")}
            className={`pb-3 px-3 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 ${
              activeTab === "coords"
                ? "border-[#2d7a3a] text-[#2d7a3a]"
                : "border-transparent text-gray-500 hover:text-gray-800"
            }`}
          >
            <Compass className="h-3.5 w-3.5" />
            Manual Coordinates
          </button>
          <button
            onClick={() => setActiveTab("presets")}
            className={`pb-3 px-3 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 ${
              activeTab === "presets"
                ? "border-[#2d7a3a] text-[#2d7a3a]"
                : "border-transparent text-gray-500 hover:text-gray-800"
            }`}
          >
            <Globe2 className="h-3.5 w-3.5" />
            Global Presets
          </button>
          <button
            onClick={() => setActiveTab("saved")}
            className={`pb-3 px-3 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 ${
              activeTab === "saved"
                ? "border-[#2d7a3a] text-[#2d7a3a]"
                : "border-transparent text-gray-500 hover:text-gray-800"
            }`}
          >
            <Bookmark className="h-3.5 w-3.5" />
            Saved ({savedLocations.length})
          </button>
        </div>

        {/* Body content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {/* TAB 1: SEARCH */}
          {activeTab === "search" && (
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={handleSearchChange}
                  placeholder="Search country, province, district, city, town, village, or 'lat, lon'..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#d2e4d0] text-sm focus:outline-none focus:ring-2 focus:ring-[#2d7a3a]/30 focus:border-[#2d7a3a] transition-all bg-[#f8faf7]"
                  autoFocus
                />
                {isSearching && (
                  <span className="absolute right-3.5 top-3.5 text-xs text-gray-400 animate-pulse">
                    Searching...
                  </span>
                )}
              </div>

              {/* Quick GPS button */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-[#f0f7ee] border border-[#d2e4d0]">
                <div className="flex items-center gap-2.5">
                  <Navigation className="h-4 w-4 text-[#2d7a3a]" />
                  <div>
                    <div className="text-xs font-bold text-[#1e3a1f]">Use Browser GPS Location</div>
                    <div className="text-[11px] text-[#4a6741]">Analyze the agricultural zone around your current device</div>
                  </div>
                </div>
                <button
                  onClick={handleUseGps}
                  disabled={gpsLoading}
                  className="px-3 py-1.5 rounded-lg bg-[#2d7a3a] text-white text-xs font-bold hover:bg-[#23632f] transition-colors disabled:opacity-50 shrink-0"
                >
                  {gpsLoading ? "Acquiring..." : "Detect Location"}
                </button>
              </div>

              {gpsError && (
                <div className="p-2.5 rounded-lg bg-red-50 text-red-700 text-xs flex items-center gap-2 border border-red-200">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{gpsError}</span>
                </div>
              )}

              {searchError && (
                <div className="p-3 rounded-lg bg-amber-50 text-amber-800 text-xs border border-amber-200">
                  {searchError}
                </div>
              )}

              {/* Search Results list */}
              {searchResults.length > 0 && (
                <div className="space-y-1.5">
                  <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider px-1">
                    Matched Locations
                  </div>
                  {searchResults.map((loc, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSelectSearchResult(loc)}
                      className="w-full text-left p-3 rounded-xl border border-[#e2ece0] hover:border-[#2d7a3a] hover:bg-[#f0f7ee] transition-all flex items-center justify-between group"
                    >
                      <div className="truncate pr-2">
                        <div className="text-xs font-bold text-[#1e3a1f] group-hover:text-[#2d7a3a] truncate">
                          {loc.label}
                        </div>
                        <div className="text-[11px] text-gray-500 font-mono mt-0.5">
                          {loc.latitude.toFixed(4)}°, {loc.longitude.toFixed(4)}° • {loc.type} ({loc.source})
                        </div>
                      </div>
                      <Check className="h-4 w-4 text-[#2d7a3a] opacity-0 group-hover:opacity-100 shrink-0 transition-opacity" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: MANUAL COORDINATES */}
          {activeTab === "coords" && (
            <div className="space-y-4">
              <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-200 text-blue-900 text-xs">
                Enter any valid geographical coordinates: <strong>Latitude (-90° to +90°)</strong> and{" "}
                <strong>Longitude (-180° to +180°)</strong>. AGROSCOPE AI will query NASA POWER, MERRA-2, and GIBS
                directly for these coordinates.
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Latitude (°Decimal, -90 to +90)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={inputLat}
                    onChange={(e) => setInputLat(e.target.value)}
                    placeholder="e.g. 13.0827"
                    className="w-full px-3 py-2 rounded-xl border border-[#d2e4d0] text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#2d7a3a]/30 focus:border-[#2d7a3a] bg-[#f8faf7]"
                  />
                  <span className="text-[10px] text-gray-400">Positive for North, negative for South</span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Longitude (°Decimal, -180 to +180)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={inputLon}
                    onChange={(e) => setInputLon(e.target.value)}
                    placeholder="e.g. 80.2707"
                    className="w-full px-3 py-2 rounded-xl border border-[#d2e4d0] text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#2d7a3a]/30 focus:border-[#2d7a3a] bg-[#f8faf7]"
                  />
                  <span className="text-[10px] text-gray-400">Positive for East, negative for West</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Location Custom Label (Optional)
                </label>
                <input
                  type="text"
                  value={inputLabel}
                  onChange={(e) => setInputLabel(e.target.value)}
                  placeholder="e.g. Chennai Coastal Paddy Field #2"
                  className="w-full px-3 py-2 rounded-xl border border-[#d2e4d0] text-sm focus:outline-none focus:ring-2 focus:ring-[#2d7a3a]/30 focus:border-[#2d7a3a] bg-[#f8faf7]"
                />
              </div>

              {coordError && (
                <div className="p-2.5 rounded-lg bg-red-50 text-red-700 text-xs flex items-center gap-2 border border-red-200">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{coordError}</span>
                </div>
              )}

              <button
                onClick={handleManualApply}
                disabled={resolvingCoord}
                className="w-full py-2.5 rounded-xl bg-[#2d7a3a] text-white text-xs font-bold hover:bg-[#23632f] transition-colors shadow-xs"
              >
                {resolvingCoord ? "Validating & Reverse Geocoding..." : "Apply Custom Coordinates"}
              </button>
            </div>
          )}

          {/* TAB 3: PRESETS */}
          {activeTab === "presets" && (
            <div className="space-y-3">
              <div className="text-xs text-gray-500">
                These locations are reference benchmarks for immediate exploration across diverse global agro-climates.
                They demonstrate the platform across the Northern and Southern Hemispheres:
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {presets.map((p, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSelectPreset(p)}
                    className="text-left p-3 rounded-xl border border-[#e2ece0] hover:border-[#2d7a3a] hover:bg-[#f0f7ee] transition-all group"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-[#1e3a1f] group-hover:text-[#2d7a3a]">
                        {p.label}
                      </span>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-gray-100 text-gray-600">
                        {p.latitude < 0 ? "South" : "North"}
                      </span>
                    </div>
                    <div className="text-[11px] text-gray-500 font-mono">
                      {p.latitude.toFixed(2)}°, {p.longitude.toFixed(2)}°
                    </div>
                    <div className="text-[11px] text-[#2d7a3a] font-medium mt-1 truncate">
                      Crop: {p.crop}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: SAVED LOCATIONS */}
          {activeTab === "saved" && (
            <div className="space-y-3">
              {savedLocations.length === 0 ? (
                <div className="text-center py-8 text-gray-400 text-xs">
                  No saved fields yet. Click &quot;Save to My Fields&quot; on any location to revisit it here.
                </div>
              ) : (
                <div className="space-y-2">
                  {savedLocations.map((s, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl border border-[#e2ece0] hover:border-[#2d7a3a] flex items-center justify-between bg-[#f8faf7]"
                    >
                      <button
                        onClick={() => {
                          setLocation(s);
                          closeModal();
                        }}
                        className="text-left flex-1 truncate pr-2"
                      >
                        <div className="text-xs font-bold text-[#1e3a1f] truncate">{s.label}</div>
                        <div className="text-[11px] text-gray-500 font-mono">
                          {s.latitude.toFixed(4)}°, {s.longitude.toFixed(4)}° • {s.crop || "No crop specified"}
                        </div>
                      </button>
                      <button
                        onClick={() => removeSavedLocation(s.label)}
                        className="text-gray-400 hover:text-red-500 p-1 rounded-lg text-xs"
                        title="Remove"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Settings Section: Crop & Analysis Period */}
          <div className="pt-4 border-t border-[#e2ece0] space-y-3">
            <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
              Field Agronomy & Date Parameters
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-gray-600 mb-1">Focus Crop</label>
                <select
                  value={selectedCrop}
                  onChange={(e) => {
                    setSelectedCrop(e.target.value);
                    setLocation({ crop: e.target.value });
                  }}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-[#d2e4d0] text-xs bg-white text-gray-800"
                >
                  {GLOBAL_CROPS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-600 mb-1">Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setLocation({ startDate: e.target.value });
                  }}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-[#d2e4d0] text-xs bg-white text-gray-800"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-600 mb-1">End Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setLocation({ endDate: e.target.value });
                  }}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-[#d2e4d0] text-xs bg-white text-gray-800"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-[#f0f7ee] border-t border-[#d2e4d0] p-4 flex items-center justify-between text-xs">
          <button
            onClick={() => saveLocation(currentLocation)}
            className="flex items-center gap-1.5 text-[#2d7a3a] font-semibold hover:underline"
          >
            <Bookmark className="h-3.5 w-3.5" />
            Save Current Field
          </button>
          <button
            onClick={closeModal}
            className="px-4 py-2 rounded-xl bg-[#2d7a3a] text-white font-bold hover:bg-[#23632f] transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
