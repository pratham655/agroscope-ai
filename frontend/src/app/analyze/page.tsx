"use client";

import { useState, useCallback, useEffect } from "react";
import {
  MapPin,
  Search,
  Loader2,
  AlertTriangle,
  CheckCircle,
  Info,
  Cpu,
  Layers,
  Sparkles,
  ArrowRight,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";
import { analyzeField, type FieldReport } from "@/lib/api";
import { useLocation } from "@/context/LocationContext";
import GlobalLocationBar from "@/components/GlobalLocationBar";
import ClimateCharts from "@/components/charts/ClimateCharts";
import StressGauge from "@/components/StressGauge";
import CropRanking from "@/components/CropRanking";
import SoilMoistureCard from "@/components/SoilMoistureCard";
import FindingsPanel from "@/components/FindingsPanel";
import GIBSLayerInfo from "@/components/GIBSLayerInfo";

const DEMO_LOCATIONS = [
  { label: "Chennai, Tamil Nadu, India", lat: 13.0827, lon: 80.2707, crop: "Rice / Groundnut" },
  { label: "Kansas Wheat Belt, USA", lat: 38.34, lon: -98.12, crop: "Wheat" },
  { label: "Punjab Plain, India", lat: 30.73, lon: 76.78, crop: "Rice / Wheat" },
  { label: "São Paulo State, Brazil", lat: -22.5, lon: -48.0, crop: "Soybeans" },
  { label: "Nairobi, Kenya", lat: -1.2921, lon: 36.8219, crop: "Maize / Beans" },
  { label: "Murray-Darling Basin, AU", lat: -34.5, lon: 145.5, crop: "Barley" },
];

export default function AnalyzePage() {
  const { currentLocation, setLocation } = useLocation();
  const [lat, setLat] = useState(() => (currentLocation?.latitude ? String(currentLocation.latitude) : ""));
  const [lon, setLon] = useState(() => (currentLocation?.longitude ? String(currentLocation.longitude) : ""));
  const [label, setLabel] = useState(() => currentLocation?.label || "");
  const [startDate, setStart] = useState(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 1);
    return d.toISOString().slice(0, 10);
  });
  const [endDate, setEnd] = useState(() => new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<FieldReport | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const sp = new URLSearchParams(window.location.search);
      const urlLat = sp.get("lat");
      const urlLon = sp.get("lon");
      const urlLabel = sp.get("label");
      const autorun = sp.get("autorun");
      if (urlLat && urlLon) {
        setLat(urlLat);
        setLon(urlLon);
        if (urlLabel) setLabel(urlLabel);
        if (autorun === "true") {
          const latN = parseFloat(urlLat);
          const lonN = parseFloat(urlLon);
          if (!isNaN(latN) && !isNaN(lonN)) {
            setLoading(true);
            analyzeField({
              latitude: latN,
              longitude: lonN,
              startDate,
              endDate,
              label: urlLabel || "Selected Location",
            }).then((data) => {
              setReport(data);
              setLoading(false);
            }).catch((err) => {
              setError(err instanceof Error ? err.message : "Analysis failed");
              setLoading(false);
            });
          }
        }
        return;
      }
    }

    if (currentLocation && typeof currentLocation.latitude === "number" && typeof currentLocation.longitude === "number") {
      setLat(String(currentLocation.latitude));
      setLon(String(currentLocation.longitude));
      setLabel(currentLocation.label || `${currentLocation.latitude.toFixed(4)}, ${currentLocation.longitude.toFixed(4)}`);
    }
  }, [currentLocation, startDate, endDate]);

  const run = useCallback(async () => {
    const latN = parseFloat(lat),
      lonN = parseFloat(lon);
    if (isNaN(latN) || isNaN(lonN)) {
      setError("Please enter valid latitude and longitude.");
      return;
    }
    if (latN < -90 || latN > 90) {
      setError("Latitude must be between -90 and 90.");
      return;
    }
    if (lonN < -180 || lonN > 180) {
      setError("Longitude must be between -180 and 180.");
      return;
    }

    setLoading(true);
    setError(null);
    setReport(null);
    try {
      const data = await analyzeField({
        latitude: latN,
        longitude: lonN,
        startDate,
        endDate,
        label: label || `${latN.toFixed(4)}°, ${lonN.toFixed(4)}°`,
      });
      setReport(data);
      setLocation({
        latitude: latN,
        longitude: lonN,
        label: label || data.location.label || `${latN.toFixed(4)}°, ${lonN.toFixed(4)}°`,
        startDate,
        endDate,
      });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Analysis failed. Is the backend running?");
    } finally {
      setLoading(false);
    }
  }, [lat, lon, label, startDate, endDate, setLocation]);

  const prefill = (loc: typeof DEMO_LOCATIONS[0]) => {
    setLat(String(loc.lat));
    setLon(String(loc.lon));
    setLabel(loc.label);
    setLocation({
      latitude: loc.lat,
      longitude: loc.lon,
      label: loc.label,
    });
  };

  return (
    <div className="min-h-screen bg-[#f8faf5]">
      {/* Hero Header */}
      <div className="bg-linear-to-b from-[#0c1b12] via-[#12281a] to-[#183624] text-white py-12 px-4 sm:px-6 lg:px-8 border-b border-[#234b32]">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-emerald-500/20 border border-emerald-400/30 text-emerald-300">
                <Cpu className="h-5 w-5" />
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-300 bg-emerald-950/60 px-3 py-1 rounded-full border border-emerald-800/60">
                Full-Pipeline Analysis Engine
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-emerald-200/80">
              <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>NASA POWER &bull; MERRA-2 &bull; GIBS Layer Ingestion &bull; Explainable AI</span>
            </div>
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white mb-3">
            Field Intelligence Engine
          </h1>
          <p className="text-base text-emerald-100/90 max-w-3xl leading-relaxed">
            Execute the complete NASA multi-parameter agroclimatological pipeline for any parcel coordinate on Earth. Computes standardized precipitation indices, thermal accumulation, root-zone depletion, and adaptive crop rotation suitability.
          </p>

          {/* Quick Presets */}
          <div className="mt-6 flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-emerald-300/80 mr-1 flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" /> Quick Fill Coordinates:
            </span>
            {DEMO_LOCATIONS.map((loc) => (
              <button
                key={loc.label}
                onClick={() => prefill(loc)}
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Global Location Bar */}
        <GlobalLocationBar />

        {/* Input Form Bar */}
        <div className="bg-white rounded-2xl p-6 border border-[#e2ece0] shadow-xs space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                Latitude (°N)
              </label>
              <input
                value={lat}
                onChange={(e) => setLat(e.target.value)}
                placeholder="e.g. 13.0827"
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
                placeholder="e.g. 80.2707"
                className="w-full px-3.5 py-2.5 text-sm bg-gray-50/50 border border-[#e2ece0] rounded-xl outline-none focus:ring-2 focus:ring-[#2d7a3a] focus:bg-white transition"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                Observation Start
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStart(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm bg-gray-50/50 border border-[#e2ece0] rounded-xl outline-none focus:ring-2 focus:ring-[#2d7a3a] focus:bg-white transition"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                Observation End
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEnd(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm bg-gray-50/50 border border-[#e2ece0] rounded-xl outline-none focus:ring-2 focus:ring-[#2d7a3a] focus:bg-white transition"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-3 items-center pt-2">
            <div className="flex-1 min-w-56">
              <input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm bg-gray-50/50 border border-[#e2ece0] rounded-xl outline-none focus:ring-2 focus:ring-[#2d7a3a] focus:bg-white transition"
                placeholder="Custom Field Identifier or Parcel Label (optional)"
              />
            </div>
            <button
              onClick={run}
              disabled={loading}
              className="flex items-center gap-2 bg-[#2d7a3a] hover:bg-[#23602d] text-white px-6 py-2.5 rounded-xl font-semibold text-sm shadow-xs transition disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Computing Multi-Parameter Pipeline...</span>
                </>
              ) : (
                <>
                  <Search className="h-4 w-4" />
                  <span>Run Field Intelligence</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Error Notification */}
        {error && (
          <div className="mb-6 flex gap-3 bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">
            <AlertTriangle className="h-5 w-5 shrink-0 text-red-600 mt-0.5" />
            <div>
              <strong className="block font-bold">Analysis Pipeline Error</strong>
              <span className="text-xs">{error}</span>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="bg-white rounded-2xl p-16 text-center border border-[#e2ece0] shadow-xs">
            <Loader2 className="h-10 w-10 animate-spin text-[#2d7a3a] mx-auto mb-4" />
            <h3 className="text-base font-bold text-[#1a2e1a]">
              Fetching NASA Earth Observation Telemetry...
            </h3>
            <p className="text-xs text-[#4a6741] mt-1 max-w-md mx-auto">
              Connecting to NASA POWER and MERRA-2 servers: evaluating SPI-3 drought index, Growing Degree Days (GDD), root-zone moisture fraction, and composite stress score.
            </p>
          </div>
        )}

        {/* Results Container */}
        {report && !loading && (
          <div className="space-y-8">
            {/* Header Telemetry Badge */}
            <div className="bg-white rounded-2xl p-5 border border-[#e2ece0] shadow-xs flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-50 text-[#2d7a3a] border border-emerald-200">
                  <MapPin className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-[#1a2e1a]">{report.location.label}</h2>
                  <p className="text-xs text-[#4a6741] font-mono">
                    {report.location.latitude.toFixed(4)}°N, {report.location.longitude.toFixed(4)}°E &bull;{" "}
                    {report.period.start} to {report.period.end} ({report.period.days} days)
                    {report.period.valid_days !== undefined && report.period.valid_days < report.period.days && (
                      <span className="text-amber-700 font-semibold ml-2">
                        &bull; {report.period.valid_days} days finalized ({report.period.finalized_pct}%)
                      </span>
                    )}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {report.is_demo ? (
                  <span className="text-xs font-bold text-amber-800 bg-amber-50 border border-amber-200 px-3 py-1 rounded-full">
                    Demonstration Cached Grid
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
                    <CheckCircle className="h-3.5 w-3.5 text-emerald-600" /> Live NASA Data Verified
                  </span>
                )}
                <Link
                  href={`/farm-futures?lat=${report.location.latitude}&lon=${report.location.longitude}`}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 bg-[#2d7a3a] hover:bg-[#23602d] text-white rounded-full transition"
                >
                  <span>Simulate in Futures Lab</span>
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            </div>

            {/* Stress Gauge & Key Findings */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <StressGauge stress={report.stress} />
              <div className="lg:col-span-2">
                <FindingsPanel findings={report.key_findings} />
              </div>
            </div>

            {/* Explainable AI Decision Engine — Transparent Score Decomposition */}
            <div className="bg-white rounded-2xl p-6 border border-[#e2ece0] shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <div>
                  <h3 className="text-base font-bold text-[#1a2e1a] flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-[#2d7a3a]" />
                    <span>Explainable AI Decision Engine — Stress Score Attribution</span>
                  </h3>
                  <p className="text-xs text-[#4a6741] mt-0.5">
                    Transparent mathematical decomposition of all 4 biophysical sub-indicators contributing to the composite stress index ({report.stress.score}/100).
                  </p>
                </div>
                <span
                  className="text-xs font-semibold px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200"
                  title="Percentage of sub-indicators non-null"
                >
                  Channel Completeness: {(report.stress.confidence * 100).toFixed(0)}% (4/4 channels active)
                </span>
              </div>

              {/* Mathematical Formula Banner */}
              <div className="mb-5 p-3.5 rounded-xl bg-[#f8faf7] border border-[#eef4ed] text-xs font-mono text-gray-700">
                Composite Stress = (0.35 &times; SPI Drought Proxy) + (0.30 &times; NDVI Anomaly) + (0.20 &times; Soil Moisture Deficit) + (0.15 &times; Thermal Anomaly)
              </div>

              {/* Indicator Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* SPI */}
                <div className="p-4 rounded-xl border border-gray-100 bg-gray-50/70">
                  <div className="flex justify-between items-center text-xs font-semibold text-gray-700 mb-1">
                    <span>Precipitation (SPI)</span>
                    <span className="text-[10px] text-gray-400 font-mono">Weight: 35%</span>
                  </div>
                  <div className="text-xl font-extrabold text-blue-700">
                    {report.stress.indicators.spi?.value ?? "N/A"}
                  </div>
                  <div className="text-[11px] text-gray-500 mt-1">
                    Stress contribution:{" "}
                    <strong className="text-gray-800">
                      {((report.stress.indicators.spi?.stress_contribution ?? 0) * 100).toFixed(0)}%
                    </strong>
                  </div>
                  <div className="w-full bg-gray-200 h-1.5 rounded-full mt-2 overflow-hidden">
                    <div
                      className="bg-blue-600 h-1.5 rounded-full"
                      style={{ width: `${(report.stress.indicators.spi?.stress_contribution ?? 0) * 100}%` }}
                    />
                  </div>
                </div>

                {/* NDVI */}
                <div className="p-4 rounded-xl border border-gray-100 bg-gray-50/70">
                  <div className="flex justify-between items-center text-xs font-semibold text-gray-700 mb-1">
                    <span>Vegetation (NDVI)</span>
                    <span className="text-[10px] text-gray-400 font-mono">Weight: 30%</span>
                  </div>
                  <div className="text-xl font-extrabold text-emerald-700">
                    {report.stress.indicators.ndvi?.value ?? "N/A"}
                  </div>
                  <div className="text-[11px] text-gray-500 mt-1">
                    Stress contribution:{" "}
                    <strong className="text-gray-800">
                      {((report.stress.indicators.ndvi?.stress_contribution ?? 0) * 100).toFixed(0)}%
                    </strong>
                  </div>
                  <div className="w-full bg-gray-200 h-1.5 rounded-full mt-2 overflow-hidden">
                    <div
                      className="bg-emerald-600 h-1.5 rounded-full"
                      style={{ width: `${(report.stress.indicators.ndvi?.stress_contribution ?? 0) * 100}%` }}
                    />
                  </div>
                </div>

                {/* Soil Moisture */}
                <div className="p-4 rounded-xl border border-gray-100 bg-gray-50/70">
                  <div className="flex justify-between items-center text-xs font-semibold text-gray-700 mb-1">
                    <span>Root Wetness</span>
                    <span className="text-[10px] text-gray-400 font-mono">Weight: 20%</span>
                  </div>
                  <div className="text-xl font-extrabold text-amber-700">
                    {report.stress.indicators.soil?.value ?? "N/A"}
                  </div>
                  <div className="text-[11px] text-gray-500 mt-1">
                    Stress contribution:{" "}
                    <strong className="text-gray-800">
                      {((report.stress.indicators.soil?.stress_contribution ?? 0) * 100).toFixed(0)}%
                    </strong>
                  </div>
                  <div className="w-full bg-gray-200 h-1.5 rounded-full mt-2 overflow-hidden">
                    <div
                      className="bg-amber-600 h-1.5 rounded-full"
                      style={{ width: `${(report.stress.indicators.soil?.stress_contribution ?? 0) * 100}%` }}
                    />
                  </div>
                </div>

                {/* Temperature */}
                <div className="p-4 rounded-xl border border-gray-100 bg-gray-50/70">
                  <div className="flex justify-between items-center text-xs font-semibold text-gray-700 mb-1">
                    <span>Thermal Anomaly</span>
                    <span className="text-[10px] text-gray-400 font-mono">Weight: 15%</span>
                  </div>
                  <div className="text-xl font-extrabold text-red-600">
                    {report.stress.indicators.temp?.value
                      ? `${report.stress.indicators.temp.value > 0 ? "+" : ""}${report.stress.indicators.temp.value}°C`
                      : "N/A"}
                  </div>
                  <div className="text-[11px] text-gray-500 mt-1">
                    Stress contribution:{" "}
                    <strong className="text-gray-800">
                      {((report.stress.indicators.temp?.stress_contribution ?? 0) * 100).toFixed(0)}%
                    </strong>
                  </div>
                  <div className="w-full bg-gray-200 h-1.5 rounded-full mt-2 overflow-hidden">
                    <div
                      className="bg-red-500 h-1.5 rounded-full"
                      style={{ width: `${(report.stress.indicators.temp?.stress_contribution ?? 0) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Climate Charts */}
            <ClimateCharts climate={report.climate} isDemo={report.is_demo} />

            {/* Soil Moisture Card */}
            <SoilMoistureCard soilData={report.soil_moisture} />

            {/* Crop Recommendations */}
            <CropRanking crops={report.crop_recommendations} />

            {/* GIBS Satellite Tile Layers */}
            {report.gibs_layers?.length > 0 && <GIBSLayerInfo layers={report.gibs_layers} />}

            {/* Methodology & Limitations Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl p-6 border border-[#e2ece0] shadow-xs">
                <h3 className="font-bold text-[#1a2e1a] mb-3 flex items-center gap-2">
                  <Info className="h-4 w-4 text-[#2d7a3a]" />
                  <span>Scientific Methodology</span>
                </h3>
                <pre className="text-xs text-[#4a6741] font-sans whitespace-pre-wrap leading-relaxed">
                  {report.methodology}
                </pre>
              </div>

              <div className="bg-white rounded-2xl p-6 border border-[#e2ece0] shadow-xs">
                <h3 className="font-bold text-[#1a2e1a] mb-3 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  <span>Data Constraints &amp; Spatial Limitations</span>
                </h3>
                <pre className="text-xs text-[#4a6741] font-sans whitespace-pre-wrap leading-relaxed">
                  {report.limitations}
                </pre>
              </div>
            </div>

            {/* Data Sources Grid */}
            <div className="bg-white rounded-2xl p-6 border border-[#e2ece0] shadow-xs">
              <h3 className="font-bold text-[#1a2e1a] mb-4 flex items-center gap-2">
                <Layers className="h-4 w-4 text-[#2d7a3a]" />
                <span>Authoritative NASA Data Sources</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {report.data_sources.map((ds) => (
                  <div key={ds.name} className="bg-[#f0f7ee] rounded-xl p-4 border border-[#d8edd6]">
                    <div className="font-bold text-[#1a2e1a] text-sm">{ds.name}</div>
                    <div className="text-xs text-[#4a6741] mt-0.5">{ds.type}</div>
                    {ds.variables && (
                      <div className="text-xs font-mono text-[#2d7a3a] mt-1.5">{ds.variables}</div>
                    )}
                    <a
                      href={ds.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-[#1e6fa8] hover:underline mt-2 flex items-center gap-1 font-medium"
                    >
                      <span>Explore Source Documentation</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
