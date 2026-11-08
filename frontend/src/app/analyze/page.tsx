"use client";

import { useState, useCallback, useEffect } from "react";
import {
  MapPin,
  Search,
  Loader2,
  AlertTriangle,
  CheckCircle,
  Info,
  Sparkles,
  ArrowRight,
  Compass,
} from "lucide-react";
import Link from "next/link";
import { analyzeField, type FieldReport } from "@/lib/api";
import { useLocation } from "@/context/LocationContext";
import ClimateCharts from "@/components/charts/ClimateCharts";
import StressGauge from "@/components/StressGauge";
import CropRanking from "@/components/CropRanking";
import SoilMoistureCard from "@/components/SoilMoistureCard";
import FindingsPanel from "@/components/FindingsPanel";
import GIBSLayerInfo from "@/components/GIBSLayerInfo";

const BENCHMARK_PRESETS = [
  { label: "Chennai Agro-District", lat: 13.0827, lon: 80.2707, crop: "Rice / Groundnut" },
  { label: "Kansas Wheat Belt", lat: 38.34, lon: -98.12, crop: "Winter Wheat" },
  { label: "Punjab Plain", lat: 30.73, lon: 76.78, crop: "Wheat / Rice" },
  { label: "São Paulo Cerrado", lat: -22.5, lon: -48.0, crop: "Soybean / Cane" },
  { label: "Nairobi Highlands", lat: -1.2921, lon: 36.8219, crop: "Maize / Coffee" },
  { label: "Sydney Basin", lat: -33.8688, lon: 151.2093, crop: "Barley / Cotton" },
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
            })
              .then((data) => {
                setReport(data);
                setLoading(false);
              })
              .catch((err) => {
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
      setError(e instanceof Error ? e.message : "Analysis failed. Verify backend connectivity.");
    } finally {
      setLoading(false);
    }
  }, [lat, lon, label, startDate, endDate, setLocation]);

  const prefill = (loc: (typeof BENCHMARK_PRESETS)[0]) => {
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
    <div className="max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-8 py-5 space-y-5">
      {/* ── Feature Discovery Banner: Field Intelligence Engine ─────── */}
      <div className="grad-field-intel rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-3xl">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-white/20 text-white backdrop-blur-sm border border-white/30">
                Analytical Biophysical Workspace
              </span>
              <span className="text-xs text-emerald-200 font-mono">NASA POWER · MERRA-2 · GIBS</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
              Biophysical Telemetry & Comprehensive Field Audit
            </h1>
            <p className="text-xs sm:text-sm text-emerald-100/90 leading-relaxed">
              Execute multi-sensor agroclimatological reanalysis for arbitrary global coordinates. Computes McKee et al. Standardized Precipitation Index (SPI-3), Growing Degree Days (GDD), dual-depth soil wetness, and adaptive crop rotation suitability.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <span className="px-3 py-1.5 rounded-lg bg-black/25 backdrop-blur-md border border-white/20 text-xs font-mono text-emerald-200">
              0.5° Resolution &bull; Daily Reanalysis
            </span>
          </div>
        </div>
      </div>

      {/* ── Input Parameters Console ────────────────────────────────── */}
      <div className="bg-white rounded-xl p-4 sm:p-5 border border-slate-200 shadow-2xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <Compass className="w-3.5 h-3.5 text-[#0d3b2e]" />
            <span>Target Coordinates & Temporal Range</span>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] uppercase font-bold text-slate-400 mr-1">Presets:</span>
            {BENCHMARK_PRESETS.map((p) => (
              <button
                key={p.label}
                onClick={() => prefill(p)}
                className="text-[11px] px-2 py-0.5 rounded-md border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 transition"
              >
                {p.label.split(" ")[0]}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div>
            <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
              Latitude (°N)
            </label>
            <input
              value={lat}
              onChange={(e) => setLat(e.target.value)}
              placeholder="e.g. 13.0827"
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
              placeholder="e.g. 80.2707"
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
              onChange={(e) => setStart(e.target.value)}
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
              onChange={(e) => setEnd(e.target.value)}
              className="w-full px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-md outline-none focus:border-[#0d3b2e] focus:bg-white transition"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
              Field Label / Identifier
            </label>
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Custom Parcel Name"
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-md outline-none focus:border-[#0d3b2e] focus:bg-white transition"
            />
          </div>
        </div>

        <div className="flex items-center justify-end pt-1">
          <button
            onClick={run}
            disabled={loading}
            className="flex items-center gap-2 bg-[#0d3b2e] hover:bg-[#134e39] text-white px-5 py-2 rounded-md font-semibold text-xs shadow-2xs transition disabled:opacity-50 cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-400" />
                <span>Computing Multi-Parameter Pipeline...</span>
              </>
            ) : (
              <>
                <Search className="h-3.5 w-3.5 text-emerald-400" />
                <span>Run Field Intelligence</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* ── Error Notification ───────────────────────────────────────── */}
      {error && (
        <div className="flex gap-2.5 bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-xs">
          <AlertTriangle className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
          <div>
            <strong className="block font-semibold">Analysis Pipeline Error</strong>
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* ── Loading Skeleton ─────────────────────────────────────────── */}
      {loading && (
        <div className="bg-white rounded-xl p-12 text-center border border-slate-200 shadow-2xs space-y-3">
          <Loader2 className="h-8 w-8 animate-spin text-[#0d3b2e] mx-auto" />
          <h3 className="text-sm font-bold text-slate-900">
            Querying NASA POWER Agroclimatology & Reanalysis...
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Synthesizing daily meteorological time-series, calculating SPI-3 drought coefficients, and scoring crop adaptability.
          </p>
        </div>
      )}

      {/* ── Scientific Results Dossier ───────────────────────────────── */}
      {report && !loading && (
        <div className="space-y-5">
          {/* Executive Target Dossier Card */}
          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-md bg-slate-100 text-[#0d3b2e] border border-slate-200">
                <MapPin className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">{report.location.label}</h2>
                <p className="text-xs text-slate-500 font-mono">
                  {report.location.latitude.toFixed(4)}°N, {report.location.longitude.toFixed(4)}°E &bull;{" "}
                  {report.period.start} → {report.period.end} ({report.period.days} observation days)
                  {report.period.valid_days !== undefined && report.period.valid_days < report.period.days && (
                    <span className="text-amber-700 font-semibold ml-2">
                      &bull; {report.period.valid_days} days finalized ({report.period.finalized_pct}%)
                    </span>
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {report.is_demo ? (
                <span className="text-xs font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-md">
                  Demonstration Grid
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-md">
                  <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />
                  <span>NASA Verified</span>
                </span>
              )}
              <Link
                href={`/farm-futures?lat=${report.location.latitude}&lon=${report.location.longitude}`}
                className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 bg-[#0d3b2e] hover:bg-[#134e39] text-white rounded-md transition"
              >
                <span>Simulate Climate Shift</span>
                <ArrowRight className="h-3 w-3 text-emerald-400" />
              </Link>
            </div>
          </div>

          {/* Stress Gauge & Key Findings */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <StressGauge stress={report.stress} />
            <div className="lg:col-span-2">
              <FindingsPanel findings={report.key_findings} />
            </div>
          </div>

          {/* Explainable AI Decision Attribution */}
          <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-2xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-[#0d3b2e]" />
                  <span>Explainable Decision Engine — Stress Score Attribution</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Transparent mathematical decomposition of all 4 biophysical sub-indicators contributing to the composite stress index ({report.stress.score}/100).
                </p>
              </div>
              <span className="text-xs font-mono text-slate-600 bg-slate-50 px-2.5 py-1 rounded border border-slate-200">
                Channel Completeness: {(report.stress.confidence * 100).toFixed(0)}% (4/4 channels active)
              </span>
            </div>

            <div className="p-2.5 rounded-md bg-slate-50 border border-slate-200 text-xs font-mono text-slate-700">
              Composite Stress = (0.35 &times; SPI Drought) + (0.30 &times; NDVI Anomaly) + (0.20 &times; Soil Deficit) + (0.15 &times; Thermal Anomaly)
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/50">
                <div className="flex justify-between items-center text-xs font-semibold text-slate-700 mb-1">
                  <span>Precipitation (SPI)</span>
                  <span className="text-[10px] text-slate-400 font-mono">Weight: 35%</span>
                </div>
                <div className="text-lg font-bold text-blue-700">
                  {report.stress.indicators.spi?.value ?? "N/A"}
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Contribution: <strong className="text-slate-800">{((report.stress.indicators.spi?.stress_contribution ?? 0) * 100).toFixed(0)}%</strong>
                </div>
                <div className="w-full bg-slate-200 h-1.5 rounded-full mt-2 overflow-hidden">
                  <div
                    className="bg-blue-600 h-1.5 rounded-full"
                    style={{ width: `${(report.stress.indicators.spi?.stress_contribution ?? 0) * 100}%` }}
                  />
                </div>
              </div>

              <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/50">
                <div className="flex justify-between items-center text-xs font-semibold text-slate-700 mb-1">
                  <span>Vegetation (NDVI)</span>
                  <span className="text-[10px] text-slate-400 font-mono">Weight: 30%</span>
                </div>
                <div className="text-lg font-bold text-emerald-700">
                  {report.stress.indicators.ndvi?.value ?? "N/A"}
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Contribution: <strong className="text-slate-800">{((report.stress.indicators.ndvi?.stress_contribution ?? 0) * 100).toFixed(0)}%</strong>
                </div>
                <div className="w-full bg-slate-200 h-1.5 rounded-full mt-2 overflow-hidden">
                  <div
                    className="bg-emerald-600 h-1.5 rounded-full"
                    style={{ width: `${(report.stress.indicators.ndvi?.stress_contribution ?? 0) * 100}%` }}
                  />
                </div>
              </div>

              <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/50">
                <div className="flex justify-between items-center text-xs font-semibold text-slate-700 mb-1">
                  <span>Root Wetness</span>
                  <span className="text-[10px] text-slate-400 font-mono">Weight: 20%</span>
                </div>
                <div className="text-lg font-bold text-amber-700">
                  {report.stress.indicators.soil?.value ?? "N/A"}
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Contribution: <strong className="text-slate-800">{((report.stress.indicators.soil?.stress_contribution ?? 0) * 100).toFixed(0)}%</strong>
                </div>
                <div className="w-full bg-slate-200 h-1.5 rounded-full mt-2 overflow-hidden">
                  <div
                    className="bg-amber-600 h-1.5 rounded-full"
                    style={{ width: `${(report.stress.indicators.soil?.stress_contribution ?? 0) * 100}%` }}
                  />
                </div>
              </div>

              <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/50">
                <div className="flex justify-between items-center text-xs font-semibold text-slate-700 mb-1">
                  <span>Thermal Anomaly</span>
                  <span className="text-[10px] text-slate-400 font-mono">Weight: 15%</span>
                </div>
                <div className="text-lg font-bold text-red-600">
                  {report.stress.indicators.temp?.value
                    ? `${report.stress.indicators.temp.value > 0 ? "+" : ""}${report.stress.indicators.temp.value}°C`
                    : "N/A"}
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Contribution: <strong className="text-slate-800">{((report.stress.indicators.temp?.stress_contribution ?? 0) * 100).toFixed(0)}%</strong>
                </div>
                <div className="w-full bg-slate-200 h-1.5 rounded-full mt-2 overflow-hidden">
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

          {/* Soil Moisture Hydrological Card */}
          <SoilMoistureCard soilData={report.soil_moisture} />

          {/* Crop Recommendations & Rotation Ranking */}
          <CropRanking crops={report.crop_recommendations} />

          {/* GIBS Satellite Tile Layers */}
          {report.gibs_layers?.length > 0 && <GIBSLayerInfo layers={report.gibs_layers} />}

          {/* Methodology & Limitations Panels */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs space-y-2">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Info className="h-4 w-4 text-[#0d3b2e]" />
                <span>Scientific Methodology</span>
              </h3>
              <pre className="text-xs text-slate-600 font-sans whitespace-pre-wrap leading-relaxed">
                {report.methodology}
              </pre>
            </div>

            <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs space-y-2">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                <span>Data Constraints &amp; Spatial Limitations</span>
              </h3>
              <pre className="text-xs text-slate-600 font-sans whitespace-pre-wrap leading-relaxed">
                {report.limitations}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
