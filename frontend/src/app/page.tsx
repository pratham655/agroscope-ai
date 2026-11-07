"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import {
  Globe2,
  FlaskConical,
  ScanEye,
  Brain,
  MapPin,
  Compass,
  Droplets,
  BarChart3,
  ArrowRight,
  ShieldCheck,
  Activity,
  Sprout,
  FileText,
  ChevronRight,
  Database,
  Thermometer,
  CloudRain,
  Clock,
} from "lucide-react";
import { useLocation } from "@/context/LocationContext";
import { analyzeField, type FieldReport } from "@/lib/api";

// Dynamically load interactive map preview (SSR false for Leaflet compatibility)
const EarthExplorerMap = dynamic(() => import("@/components/EarthExplorerMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[420px] rounded-lg bg-slate-100 flex flex-col items-center justify-center text-slate-500 gap-2 border border-slate-200">
      <Globe2 className="h-7 w-7 text-emerald-700 animate-spin" />
      <div className="text-xs font-semibold text-slate-700">Connecting to NASA Global Imagery Browse Services (GIBS)...</div>
      <div className="text-[11px] text-slate-500 font-mono">Streaming EPSG:3857 Basemap & Satellite Swath</div>
    </div>
  ),
});

interface ModuleCard {
  id: string;
  name: string;
  purpose: string;
  category: "Core Analytical" | "Simulation & Forecasting" | "Hydrology & Phenology" | "Geospatial";
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  status: string;
  tag: string;
}

const MODULES: ModuleCard[] = [
  {
    id: "field-intelligence",
    name: "Field Intelligence Engine",
    purpose: "Multivariate biophysical telemetry, SPI-3 drought calculation & crop suitability ranking.",
    category: "Core Analytical",
    href: "/analyze",
    icon: Activity,
    status: "Operational",
    tag: "NASA POWER MERRA-2",
  },
  {
    id: "earth-explorer",
    name: "Earth Explorer (2D / 3D)",
    purpose: "Planetary cartographic command center streaming 7 NASA GIBS satellite swaths.",
    category: "Core Analytical",
    href: "/explorer",
    icon: Globe2,
    status: "Operational",
    tag: "MODIS · VIIRS · GPM",
  },
  {
    id: "farmer-copilot",
    name: "Farmer Action Copilot",
    purpose: "Evidence-grounded conversational agronomist with strict coordinate verification.",
    category: "Core Analytical",
    href: "/advisor",
    icon: Brain,
    status: "Active",
    tag: "OpenRouter LLM",
  },
  {
    id: "farm-futures",
    name: "Farm Futures Lab",
    purpose: "Hydrothermal climate perturbation simulator assessing crop vulnerability shifts.",
    category: "Simulation & Forecasting",
    href: "/farm-futures",
    icon: FlaskConical,
    status: "Operational",
    tag: "Scenario Modeling",
  },
  {
    id: "water-intel",
    name: "Smart Water Intelligence",
    purpose: "Root-zone vs. surface wetness fractions and drought wilting point analysis.",
    category: "Hydrology & Phenology",
    href: "/water-intel",
    icon: Droplets,
    status: "Operational",
    tag: "SMAP / MERRA-2",
  },
  {
    id: "phenology-tracker",
    name: "Crop Phenology Tracker",
    purpose: "Multi-year vegetation trajectory analysis with green-up and senescence DOY.",
    category: "Hydrology & Phenology",
    href: "/phenology",
    icon: BarChart3,
    status: "Operational",
    tag: "Savitzky-Golay",
  },
  {
    id: "risk-radar",
    name: "Regional Risk Radar",
    purpose: "Cross-continental agricultural vulnerability index and multi-region comparisons.",
    category: "Geospatial",
    href: "/risk-radar",
    icon: Compass,
    status: "Operational",
    tag: "Comparative Matrix",
  },
  {
    id: "satellite-time-machine",
    name: "Satellite Time Machine",
    purpose: "Historical multi-epoch orbital imagery replay and seasonal transition analysis.",
    category: "Geospatial",
    href: "/time-machine",
    icon: Clock,
    status: "Operational",
    tag: "2021–Present Archive",
  },
  {
    id: "change-detective",
    name: "Satellite Change Detective",
    purpose: "Dual synchronized orbital viewports for comparative anomaly detection.",
    category: "Geospatial",
    href: "/change-detective",
    icon: ScanEye,
    status: "Operational",
    tag: "Dual Swath Split",
  },
  {
    id: "field-boundary",
    name: "Field Boundary Intelligence",
    purpose: "Vector parcel delineation, polygon drawing, GeoJSON upload & geodesic area.",
    category: "Geospatial",
    href: "/field-boundary",
    icon: MapPin,
    status: "Operational",
    tag: "Geodesic Hectares",
  },
  {
    id: "reports",
    name: "Agronomic Reports & Export",
    purpose: "Formal institutional PDF & Markdown documentation with provenance citations.",
    category: "Core Analytical",
    href: "/reports",
    icon: FileText,
    status: "Operational",
    tag: "Institutional Export",
  },
];

export default function HomePage() {
  const { currentLocation, formattedCoords, hemisphereLabel, openModal, setLocation, presets } =
    useLocation();
  const [telemetry, setTelemetry] = useState<FieldReport | null>(null);
  const [loadingTelemetry, setLoadingTelemetry] = useState(false);
  const [telemetryError, setTelemetryError] = useState<string | null>(null);
  const [obsDate] = useState("2024-06-15");

  // Fetch light telemetry for the active location
  useEffect(() => {
    let isCancelled = false;
    setLoadingTelemetry(true);
    setTelemetryError(null);

    analyzeField({
      latitude: currentLocation.latitude,
      longitude: currentLocation.longitude,
      startDate: currentLocation.startDate || "2023-01-01",
      endDate: currentLocation.endDate || "2023-12-31",
      label: currentLocation.label,
    })
      .then((res: FieldReport) => {
        if (!isCancelled) {
          setTelemetry(res);
          setLoadingTelemetry(false);
        }
      })
      .catch((err: Error) => {
        if (!isCancelled) {
          setTelemetryError(err?.message || "Telemetry unavailable");
          setLoadingTelemetry(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [currentLocation.latitude, currentLocation.longitude, currentLocation.startDate, currentLocation.endDate, currentLocation.label]);

  return (
    <div className="max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* ── Section A: Compact Workspace Header & Global Target ───────── */}
      <section className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                NASA Space Apps Challenge 2026 · Field Shift
              </span>
              <span className="text-slate-300">•</span>
              <span className="text-[11px] font-medium text-slate-500">
                Scientific Observational Intelligence
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              Global Agricultural Intelligence
            </h1>
            <p className="text-sm text-slate-600 max-w-3xl leading-relaxed">
              Monitor environmental conditions, evaluate agricultural risks, and explore climate adaptation
              using verified NASA Earth observations, MERRA-2 meteorological reanalysis, and biophysical modeling.
            </p>
          </div>

          {/* Active Target Selector Card */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shrink-0 bg-slate-50 border border-slate-200 rounded-lg p-2.5">
            <div className="flex items-center gap-2.5 px-2">
              <div className="w-8 h-8 rounded-md bg-[#0d3b2e] flex items-center justify-center text-emerald-400 shrink-0">
                <MapPin className="w-4 h-4" />
              </div>
              <div className="min-w-[150px]">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  Target Coordinate
                </div>
                <div className="text-xs font-bold text-slate-900 truncate max-w-[180px]">
                  {currentLocation.label}
                </div>
                <div className="text-[10px] font-mono text-slate-500">
                  {formattedCoords} · {hemisphereLabel}
                </div>
              </div>
            </div>

            <button
              onClick={openModal}
              className="px-3 py-2 rounded-md bg-white hover:bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-800 transition flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
            >
              <span>Change Target</span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            </button>
          </div>
        </div>
      </section>

      {/* ── Section B & C: Global Intelligence Workspace (Map + Telemetry) ─ */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Interactive Earth Observation Map Panel (7 cols) */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Globe2 className="w-4 h-4 text-[#0d3b2e]" />
              <h2 className="text-sm font-bold text-slate-900">
                Orbital Telemetry & Surface Swath
              </h2>
              <span className="text-[10px] font-medium bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200">
                Leaflet + NASA GIBS
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href="/explorer"
                className="text-xs font-semibold text-[#0d3b2e] hover:text-emerald-700 flex items-center gap-1 transition"
              >
                <span>Full Command Center</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Leaflet Map Preview */}
          <div className="w-full h-[400px] rounded-lg overflow-hidden border border-slate-200">
            <EarthExplorerMap
              initialLat={currentLocation.latitude}
              initialLon={currentLocation.longitude}
              selectedDate={obsDate}
              onSelectCoords={(lat, lon) => {
                setLocation({
                  latitude: lat,
                  longitude: lon,
                  label: `Custom Field (${lat.toFixed(2)}°, ${lon.toFixed(2)}°)`,
                  source: "map",
                });
              }}
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px] text-slate-500">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Base: OpenStreetMap &bull; Overlay: NASA GIBS EPSG:3857</span>
            </div>
            <div className="font-mono">
              Date: {obsDate} &bull; Pin: {currentLocation.latitude.toFixed(4)}°, {currentLocation.longitude.toFixed(4)}°
            </div>
          </div>
        </div>

        {/* Environmental Overview & Live Biophysical Telemetry (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#0d3b2e]" />
                <h2 className="text-sm font-bold text-slate-900">
                  Biophysical Telemetry Overview
                </h2>
              </div>
              <span className="text-[10px] font-mono text-slate-500">
                {currentLocation.startDate} → {currentLocation.endDate}
              </span>
            </div>

            {loadingTelemetry ? (
              <div className="h-64 flex flex-col items-center justify-center text-slate-400 gap-2">
                <Activity className="w-6 h-6 animate-spin text-[#0d3b2e]" />
                <span className="text-xs">Querying NASA POWER MERRA-2 API...</span>
              </div>
            ) : telemetry ? (
              <div className="space-y-3">
                {/* Composite Stress Card */}
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Composite Agricultural Stress
                    </div>
                    <div className="text-xl font-bold text-slate-900 mt-0.5">
                      {telemetry.stress.score} <span className="text-xs text-slate-500 font-normal">/ 100</span>
                    </div>
                    <div className="text-xs font-semibold text-slate-700">
                      Level: <span className="text-emerald-800">{telemetry.stress.level}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] font-medium text-slate-500 block">Drought Index</span>
                    <span className="text-sm font-bold text-slate-900">
                      SPI-3: {telemetry.climate.spi_3.recent !== null && telemetry.climate.spi_3.recent !== undefined ? telemetry.climate.spi_3.recent.toFixed(2) : "N/A"}
                    </span>
                    <span className="text-[10px] text-slate-500 block font-mono">
                      {telemetry.stress.note || "Standardized Index"}
                    </span>
                  </div>
                </div>

                {/* 4 Quantitative Biophysical Metrics Grid */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="p-2.5 rounded-lg border border-slate-200 bg-white">
                    <div className="flex items-center gap-1.5 text-slate-500 text-[11px] font-medium">
                      <Thermometer className="w-3.5 h-3.5 text-amber-600" />
                      <span>Mean 2m Temperature</span>
                    </div>
                    <div className="text-base font-bold text-slate-900 mt-1">
                      {telemetry.climate.temperature.mean.toFixed(1)} °C
                    </div>
                    <div className="text-[10px] text-slate-500">
                      Trend: {telemetry.climate.temperature.trend?.direction || "Stable"}
                    </div>
                  </div>

                  <div className="p-2.5 rounded-lg border border-slate-200 bg-white">
                    <div className="flex items-center gap-1.5 text-slate-500 text-[11px] font-medium">
                      <CloudRain className="w-3.5 h-3.5 text-blue-600" />
                      <span>Annual Rainfall</span>
                    </div>
                    <div className="text-base font-bold text-slate-900 mt-1">
                      {telemetry.climate.precipitation.total_mm.toFixed(0)} mm
                    </div>
                    <div className="text-[10px] text-slate-500">
                      Total Annual Accumulation
                    </div>
                  </div>

                  <div className="p-2.5 rounded-lg border border-slate-200 bg-white">
                    <div className="flex items-center gap-1.5 text-slate-500 text-[11px] font-medium">
                      <Droplets className="w-3.5 h-3.5 text-cyan-600" />
                      <span>Root-Zone Wetness</span>
                    </div>
                    <div className="text-base font-bold text-slate-900 mt-1">
                      {(telemetry.soil_moisture.analysis.root_zone.mean * 100).toFixed(1)}%
                    </div>
                    <div className="text-[10px] text-slate-500 truncate">
                      {telemetry.soil_moisture.analysis.interpretation}
                    </div>
                  </div>

                  <div className="p-2.5 rounded-lg border border-slate-200 bg-white">
                    <div className="flex items-center gap-1.5 text-slate-500 text-[11px] font-medium">
                      <Sprout className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Thermal Units (GDD)</span>
                    </div>
                    <div className="text-base font-bold text-slate-900 mt-1">
                      {telemetry.climate.gdd.cumulative.toFixed(0)} GDD
                    </div>
                    <div className="text-[10px] text-slate-500">
                      Base: {telemetry.climate.gdd.t_base}°C &bull; Canopy
                    </div>
                  </div>
                </div>

                {/* Top Recommended Rotation Crop */}
                {telemetry.crop_recommendations && telemetry.crop_recommendations.length > 0 && (
                  <div className="p-3 rounded-lg border border-emerald-200 bg-emerald-50/50 flex items-center justify-between">
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">
                        Top Adaptive Rotation Match
                      </div>
                      <div className="text-sm font-bold text-slate-900">
                        {telemetry.crop_recommendations[0].name}
                      </div>
                      <div className="text-[11px] text-slate-600 line-clamp-1">
                        {telemetry.crop_recommendations[0].benefits?.[0] || "Optimal agroclimatic suitability match"}
                      </div>
                    </div>
                    <span className="text-xs font-bold text-emerald-800 bg-white px-2 py-1 rounded border border-emerald-200">
                      {telemetry.crop_recommendations[0].score}/100
                    </span>
                  </div>
                )}

                <div className="pt-1 flex items-center justify-between text-xs">
                  <span className="text-slate-500 text-[11px]">Provenance: NASA POWER MERRA-2 daily</span>
                  <Link
                    href={`/analyze?lat=${currentLocation.latitude}&lon=${currentLocation.longitude}`}
                    className="font-semibold text-[#0d3b2e] hover:underline flex items-center gap-1"
                  >
                    <span>Full Scientific Dossier</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ) : (
              <div className="p-6 text-center text-slate-500 space-y-2">
                <Database className="w-8 h-8 text-slate-300 mx-auto" />
                <div className="text-xs">
                  {telemetryError ? `Data stream notice: ${telemetryError}` : "No telemetry loaded yet."}
                </div>
                <Link
                  href="/analyze"
                  className="inline-block px-3 py-1.5 rounded-md bg-[#0d3b2e] text-white text-xs font-semibold"
                >
                  Run Field Analysis
                </Link>
              </div>
            )}
          </div>

          {/* Quick Benchmark Presets */}
          <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">
              Preset Agricultural Benchmarks
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              {presets.slice(0, 4).map((p) => (
                <button
                  key={p.label}
                  onClick={() =>
                    setLocation({
                      latitude: p.latitude,
                      longitude: p.longitude,
                      label: p.label,
                      name: p.name,
                      country: p.country,
                      crop: p.crop,
                      source: "preset",
                    })
                  }
                  className={`p-2 rounded-md text-left border transition text-xs ${
                    currentLocation.latitude === p.latitude && currentLocation.longitude === p.longitude
                      ? "border-emerald-600 bg-emerald-50 text-slate-900 font-semibold"
                      : "border-slate-200 hover:bg-slate-50 text-slate-700"
                  }`}
                >
                  <div className="font-semibold truncate">{p.name}</div>
                  <div className="text-[10px] text-slate-500 truncate">{p.country}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Section D: Intelligence Modules Navigation Grid ───────────── */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">Scientific Intelligence Modules</h2>
            <p className="text-xs text-slate-500">
              Access specialized analytical workspaces powered by NASA Earth observations and physical models.
            </p>
          </div>
          <span className="text-xs font-mono text-slate-400">11 Workspaces Available</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
          {MODULES.map((mod) => {
            const Icon = mod.icon;
            return (
              <Link
                key={mod.id}
                href={mod.href}
                className="group p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-300 hover:shadow-xs transition flex flex-col justify-between"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="w-8 h-8 rounded-lg bg-slate-100 group-hover:bg-[#0d3b2e] group-hover:text-emerald-400 text-slate-700 flex items-center justify-center transition-colors">
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] font-medium text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                      {mod.tag}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-slate-900 group-hover:text-[#0d3b2e] transition-colors flex items-center justify-between">
                      <span>{mod.name}</span>
                      <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-[#0d3b2e]" />
                    </h3>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed line-clamp-2">
                      {mod.purpose}
                    </p>
                  </div>
                </div>

                <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
                  <span className="text-slate-400">{mod.category}</span>
                  <span className="flex items-center gap-1 text-emerald-700 font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span>{mod.status}</span>
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ── Section E: Earth Observation Provenance & Verification ─────── */}
      <section className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs text-slate-600 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2">
          <div className="flex items-center gap-2 font-bold text-slate-800">
            <ShieldCheck className="w-4 h-4 text-[#0d3b2e]" />
            <span>Operational Data Ingestion Standards</span>
          </div>
          <span className="font-mono text-[11px] text-slate-500">
            NASA Space Apps Challenge 2026 &bull; Problem #7 Field Shift
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-1">
          <div>
            <div className="font-semibold text-slate-800">NASA POWER API</div>
            <div className="text-[11px] text-slate-500">MERRA-2 atmospheric reanalysis &bull; 0.5° × 0.625° daily resolution</div>
          </div>
          <div>
            <div className="font-semibold text-slate-800">NASA GIBS Tile Server</div>
            <div className="text-[11px] text-slate-500">MODIS Terra/Aqua & VIIRS &bull; 250m EPSG:3857 Web Mercator</div>
          </div>
          <div>
            <div className="font-semibold text-slate-800">GPM IMERG Radiometry</div>
            <div className="text-[11px] text-slate-500">Multi-satellite precipitation calibration &bull; 0.1° half-hourly</div>
          </div>
          <div>
            <div className="font-semibold text-slate-800">SMAP / GWET Hydrology</div>
            <div className="text-[11px] text-slate-500">0–5cm Surface & 0–100cm Root-Zone soil wetness fraction</div>
          </div>
        </div>
      </section>
    </div>
  );
}
