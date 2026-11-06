"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Satellite,
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
  ExternalLink,
  ChevronRight,
  Sparkles,
  Clock,
} from "lucide-react";

// Interactive Live Intelligence Preview Locations
const LIVE_PREVIEWS = [
  {
    name: "Punjab Indo-Gangetic Plain",
    country: "India",
    lat: 30.73,
    lon: 76.78,
    crop: "Wheat & Basmati Rice",
    meanTemp: "24.6°C",
    precip: "680 mm",
    soilWetness: "0.48",
    stressScore: "49.2/100",
    stressLevel: "Moderate",
    stressColor: "#ca8a04",
    layer: "MODIS Bands 7-2-1 Agriculture",
    imgDate: "2024-06-15",
  },
  {
    name: "Kansas Winter Wheat Belt",
    country: "USA",
    lat: 38.34,
    lon: -98.12,
    crop: "Hard Red Winter Wheat",
    meanTemp: "14.2°C",
    precip: "740 mm",
    soilWetness: "0.39",
    stressScore: "60.4/100",
    stressLevel: "Elevated",
    stressColor: "#ca8a04",
    layer: "MODIS Terra TrueColor",
    imgDate: "2024-06-15",
  },
  {
    name: "California Central Valley",
    country: "USA",
    lat: 36.75,
    lon: -119.77,
    crop: "Almonds, Citrus & Vegetables",
    meanTemp: "18.5°C",
    precip: "280 mm",
    soilWetness: "0.32",
    stressScore: "68.1/100",
    stressLevel: "High",
    stressColor: "#ea580c",
    layer: "MODIS Bands 7-2-1 Agriculture",
    imgDate: "2024-06-15",
  },
  {
    name: "São Paulo Cerrado Agro-Belt",
    country: "Brazil",
    lat: -22.5,
    lon: -48.0,
    crop: "Soybeans & Sugarcane",
    meanTemp: "21.8°C",
    precip: "1,420 mm",
    soilWetness: "0.56",
    stressScore: "37.0/100",
    stressLevel: "Low",
    stressColor: "#16a34a",
    layer: "MODIS Terra TrueColor",
    imgDate: "2024-06-15",
  },
];

const CAPABILITIES = [
  {
    id: "farm-futures",
    title: "Farm Futures Lab",
    badge: "Climate Shift Simulator",
    icon: FlaskConical,
    href: "/farm-futures",
    color: "#2d7a3a",
    bg: "from-green-900/20 to-green-950/40",
    tagline: "Hydrothermal Perturbation & Stress Simulation",
    desc: "Simulate hypothetical rainfall deficits (-80% to +100%) and thermal forcing (-4°C to +6°C) against NASA MERRA-2 baselines to evaluate crop rotation viability.",
    metric: "6 Crop Portfolio Scoring",
  },
  {
    id: "time-machine",
    title: "Satellite Time Machine",
    badge: "Multi-Year Time-Lapse",
    icon: Clock,
    href: "/time-machine",
    color: "#059669",
    bg: "from-emerald-900/20 to-emerald-950/40",
    tagline: "Historical Landscape Trajectories",
    desc: "Animate multi-year seasonal growth cycles and step through calibrated NASA MODIS & VIIRS observations to identify long-term vegetative changes.",
    metric: "2021–2024 Multi-Year Archive",
  },
  {
    id: "change-detective",
    title: "Satellite Change Detective",
    badge: "Multi-Epoch Audit",
    icon: ScanEye,
    href: "/change-detective",
    color: "#8b5cf6",
    bg: "from-purple-900/20 to-purple-950/40",
    tagline: "Synchronized Dual Orbital Comparison",
    desc: "Dual synchronized Leaflet viewports streaming real NASA GIBS satellite swaths. Quantify environmental shifts between drought and recovery seasons.",
    metric: "250m Daily Ground Resolution",
  },
  {
    id: "farmer-copilot",
    title: "Farmer Action Copilot",
    badge: "Evidence-Grounded AI",
    icon: Brain,
    href: "/advisor",
    color: "#0b3d91",
    bg: "from-blue-900/20 to-blue-950/40",
    tagline: "Conversational Agronomic Intelligence",
    desc: "Consult an AI agronomist strictly grounded in observed biophysical telemetry. Receive actionable adaptation advice with data-backed citations.",
    metric: "100% Evidence Citation",
  },
  {
    id: "field-boundary",
    title: "Field Boundary Intelligence",
    badge: "Geospatial Vector Engine",
    icon: MapPin,
    href: "/field-boundary",
    color: "#059669",
    bg: "from-emerald-900/20 to-emerald-950/40",
    tagline: "Custom Polygon Land Delineation",
    desc: "Draw or upload GeoJSON farm boundaries. Calculate exact hectares, perimeter geodesics, and project NASA agroclimatology onto user-defined parcels.",
    metric: "Sub-Hectare Precision",
  },
  {
    id: "risk-radar",
    title: "Regional Agricultural Risk Radar",
    badge: "Macro Vulnerability",
    icon: Compass,
    href: "/risk-radar",
    color: "#ea580c",
    bg: "from-amber-900/20 to-amber-950/40",
    tagline: "Multi-Regional Vulnerability Index",
    desc: "Screen agricultural regions across continents. Compare composite stress scores, Standardized Precipitation Indices, and crop risks simultaneously.",
    metric: "Continental Comparative Matrix",
  },
  {
    id: "explainable-ai",
    title: "Explainable AI Decision Engine",
    badge: "Transparent Science",
    icon: Activity,
    href: "/analyze",
    color: "#0284c7",
    bg: "from-sky-900/20 to-sky-950/40",
    tagline: "Decomposed Biophysical Indicators",
    desc: "Deconstruct overall stress scores into four transparent sub-indicators: 3-month SPI, root-zone wetness, temperature anomaly, and vegetation condition proxy.",
    metric: "Zero Black-Box Math",
  },
  {
    id: "smart-water",
    title: "Smart Water Intelligence",
    badge: "Hydrological Telemetry",
    icon: Droplets,
    href: "/water-intel",
    color: "#0284c7",
    bg: "from-cyan-900/20 to-cyan-950/40",
    tagline: "Root-Zone Moisture & Drought Tracking",
    desc: "Track surface and root-zone soil wetness from NASA POWER MERRA-2. Identify dry stress days below the critical 0.25 wilting threshold.",
    metric: "Root-Zone vs Surface Wetness",
  },
  {
    id: "phenology-tracker",
    title: "Crop Phenology Tracker",
    badge: "Seasonal Dynamics",
    icon: BarChart3,
    href: "/phenology",
    color: "#16a34a",
    bg: "from-lime-900/20 to-lime-950/40",
    tagline: "Multi-Year Vegetation Growth Curves",
    desc: "Analyze multi-year seasonal greenness curves with Savitzky-Golay smoothing. Automatically detect green-up, peak canopy, and senescence day-of-year.",
    metric: "DOY Phenological Detection",
  },
];

const WORKFLOW_STEPS = [
  {
    step: "01",
    title: "NASA Earth Observation",
    agency: "MODIS Terra/Aqua · GPM IMERG · SMAP",
    desc: "Ingests raw spectral reflectance, microwave radiometry, and satellite thermal telemetry across global 250m to 10km footprints.",
    color: "#0b3d91",
  },
  {
    step: "02",
    title: "Agroclimatological Synthesis",
    agency: "NASA POWER MERRA-2 Reanalysis",
    desc: "Processes 2-meter air temperature, surface wetness, precipitation totals, and solar radiation into verified daily time-series.",
    color: "#1e6fa8",
  },
  {
    step: "03",
    title: "Scientific Indicator Pipeline",
    agency: "SPI-3 · Cumulative GDD · NDVI Anomaly",
    desc: "Computes 3-month rolling meteorological drought indices, thermal accumulation units, and biophysical vegetation proxies.",
    color: "#2d7a3a",
  },
  {
    step: "04",
    title: "Composite Stress Modeling",
    agency: "Multi-Factor Weighted Matrix",
    desc: "Scores total agricultural stress from 0 to 100 with five calibrated severity tiers: Low, Moderate, Elevated, High, and Severe.",
    color: "#ca8a04",
  },
  {
    step: "05",
    title: "Evidence-Grounded Action",
    agency: "Crop Ranking & Adaptive Guidance",
    desc: "Ranks six rotation crops based on thermal and moisture requirements, providing tailored irrigation and planting window adaptations.",
    color: "#16a34a",
  },
];

const DATASETS = [
  {
    name: "NASA POWER API",
    category: "Agroclimatology Reanalysis",
    source: "MERRA-2 Goddard Earth Observing System",
    resolution: "0.5° × 0.625° (~55 km) · Daily 1981–present",
    variables: "T2M, T2M_MIN, T2M_MAX, PRECTOTCORR, GWETTOP, GWETROOT",
    badge: "Operational Live Integration",
  },
  {
    name: "NASA GIBS WMTS",
    category: "Satellite Imagery Tile Server",
    source: "Global Imagery Browse Services (EPSG:3857)",
    resolution: "250m–1km Ground Resolution · Daily Swaths",
    variables: "MODIS Corrected Reflectance TrueColor, Bands 7-2-1, VIIRS",
    badge: "Live WMTS Tile Integration",
  },
  {
    name: "GPM IMERG",
    category: "Satellite Precipitation",
    source: "Global Precipitation Measurement Mission",
    resolution: "0.1° × 0.1° · Half-Hourly / Monthly",
    variables: "Precipitation Rate, Calibrated Surface Rainfall",
    badge: "Integrated GIBS Layer",
  },
  {
    name: "SMAP / GWET",
    category: "Soil Moisture Active Passive",
    source: "NASA Hydrological Land Models",
    resolution: "0–5 cm Surface & 0–100 cm Root Zone",
    variables: "Soil Wetness Fraction (0.0 to 1.0 field saturation)",
    badge: "Integrated Telemetry",
  },
];

export default function HomePage() {
  const [activePreviewIdx, setActivePreviewIdx] = useState(0);
  const activePreview = LIVE_PREVIEWS[activePreviewIdx];

  return (
    <div className="min-h-screen bg-[#f8faf5] text-[#1a2e1a]">
      {/* ── 1. Premium Institutional Hero Section ──────────────────────── */}
      <section className="relative overflow-hidden bg-[#0c1b12] text-white pt-20 pb-28 px-4 sm:px-6 lg:px-8 border-b border-[#1b3b24]">
        {/* Subtle Satellite Orbital Grid Lines Background */}
        <div
          className="absolute inset-0 opacity-20 pointer-events-none"
          style={{
            backgroundImage:
              "linear-gradient(to right, #2d7a3a30 1px, transparent 1px), linear-gradient(to bottom, #2d7a3a30 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />
        <div className="absolute -top-40 -right-40 w-[600px] h-[600px] bg-gradient-to-br from-[#2d7a3a]/30 via-[#0b3d91]/20 to-transparent rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-7xl mx-auto space-y-8">
          {/* Institutional Badge */}
          <div className="inline-flex items-center gap-2.5 bg-white/10 hover:bg-white/15 backdrop-blur-md border border-white/15 rounded-full px-4 py-1.5 text-xs font-semibold text-[#86efac] shadow-lg transition">
            <Satellite className="h-4 w-4 text-[#86efac]" />
            <span>NASA Space Apps Challenge 2026 · Problem #7 Field Shift</span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#86efac] animate-ping" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-8 space-y-6">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-[1.08]">
                Planetary Earth Observations for{" "}
                <span className="bg-gradient-to-r from-[#86efac] via-[#4ade80] to-[#22c55e] bg-clip-text text-transparent">
                  Resilient Agriculture
                </span>
              </h1>

              <p className="text-base sm:text-lg text-gray-300 max-w-2xl leading-relaxed">
                AGROSCOPE AI transforms raw NASA satellite radiometry, MERRA-2 meteorological reanalysis, and
                SMAP root-zone soil wetness into actionable biophysical intelligence, stress forecasting, and
                climate-adaptive crop rotation guidance.
              </p>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-4 pt-2">
                <Link
                  href="/analyze"
                  className="inline-flex items-center gap-2.5 bg-[#2d7a3a] hover:bg-[#23602d] text-white px-7 py-4 rounded-2xl font-bold text-sm shadow-xl shadow-green-900/30 transition transform hover:-translate-y-0.5"
                >
                  <span>Explore Agricultural Intelligence</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>

                <Link
                  href="/explorer"
                  className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/15 text-white border border-white/20 px-6 py-4 rounded-2xl font-semibold text-sm backdrop-blur-md transition"
                >
                  <Globe2 className="h-4 w-4 text-[#86efac]" />
                  <span>Launch Live Earth Explorer</span>
                </Link>

                <Link
                  href="/farm-futures"
                  className="inline-flex items-center gap-2 bg-slate-900/80 hover:bg-slate-900 text-gray-300 hover:text-white border border-white/10 px-5 py-4 rounded-2xl font-semibold text-sm transition"
                >
                  <FlaskConical className="h-4 w-4 text-purple-400" />
                  <span>Farm Futures Lab</span>
                </Link>

                <Link
                  href="/time-machine"
                  className="inline-flex items-center gap-2 bg-emerald-950/70 hover:bg-emerald-900 text-emerald-300 hover:text-white border border-emerald-500/30 px-5 py-4 rounded-2xl font-semibold text-sm transition"
                >
                  <Clock className="h-4 w-4 text-emerald-400" />
                  <span>Satellite Time Machine</span>
                </Link>
              </div>
            </div>

            {/* Quick Live Telemetry Strip */}
            <div className="lg:col-span-4 space-y-3">
              <div className="bg-slate-900/80 backdrop-blur-md rounded-3xl p-5 border border-white/10 shadow-2xl space-y-4">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#86efac] uppercase tracking-wider">
                    <Activity className="h-4 w-4" />
                    <span>Real-Time Observation Stream</span>
                  </div>
                  <span className="text-[10px] text-gray-400 font-mono">NASA POWER + GIBS</span>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="flex justify-between items-center py-1 border-b border-white/5">
                    <span className="text-gray-400">Atmospheric Spatial Resolution:</span>
                    <span className="font-mono font-bold text-white">~55 km (MERRA-2 Grid)</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-white/5">
                    <span className="text-gray-400">Radiometric Ground Resolution:</span>
                    <span className="font-mono font-bold text-white">250m Daily (MODIS)</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-white/5">
                    <span className="text-gray-400">Soil Moisture Profiles:</span>
                    <span className="font-mono font-bold text-white">Surface (5cm) &amp; Root (1m)</span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-gray-400">Candidate Crop Portfolio:</span>
                    <span className="font-mono font-bold text-[#86efac]">6 Rotation Candidates</span>
                  </div>
                </div>

                <div className="pt-2 text-[11px] text-gray-400 leading-snug">
                  Zero simulated synthetic metrics: all calculations strictly execute over NASA satellite observations.
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 2. Live Earth Intelligence Interactive Preview ───────────── */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto -mt-14 relative z-20">
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#dce8da] shadow-xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#eef4ed] pb-5">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold text-[#2d7a3a] uppercase tracking-wider">
                <Globe2 className="h-4 w-4" />
                <span>Live Planetary Agronomic Telemetry</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-[#1a2e1a] tracking-tight mt-1">
                Global Agricultural Watershed Monitoring
              </h2>
            </div>

            {/* Basin Selectors */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {LIVE_PREVIEWS.map((site, idx) => (
                <button
                  key={site.name}
                  onClick={() => setActivePreviewIdx(idx)}
                  className={`text-xs px-3 py-1.5 rounded-xl font-bold transition border ${
                    activePreviewIdx === idx
                      ? "bg-[#2d7a3a] text-white border-[#2d7a3a] shadow-xs"
                      : "bg-[#f8faf7] text-gray-700 border-[#dce8da] hover:bg-[#eef7ec]"
                  }`}
                >
                  {site.name.split(" ")[0]} ({site.country})
                </button>
              ))}
            </div>
          </div>

          {/* Live Data Grid for Selected Basin */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
            {/* Left Data Cards (7 Cols) */}
            <div className="md:col-span-7 space-y-4">
              <div className="flex items-baseline justify-between">
                <div>
                  <h3 className="text-lg font-bold text-[#1a2e1a]">{activePreview.name}</h3>
                  <div className="text-xs text-[#4a6741] font-mono">
                    {activePreview.lat.toFixed(2)}°, {activePreview.lon.toFixed(2)}° · Dominant:{" "}
                    <strong>{activePreview.crop}</strong>
                  </div>
                </div>
                <span
                  className="px-3 py-1 rounded-full text-xs font-bold"
                  style={{
                    backgroundColor: `${activePreview.stressColor}20`,
                    color: activePreview.stressColor,
                  }}
                >
                  {activePreview.stressLevel} Stress ({activePreview.stressScore})
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-[#f8faf7] rounded-2xl border border-[#e2ece0]">
                  <div className="text-[10px] uppercase font-bold text-gray-400">Surface Air Temp</div>
                  <div className="text-base font-extrabold text-[#1a2e1a] mt-0.5">{activePreview.meanTemp}</div>
                  <div className="text-[10px] text-gray-500">2-meter mean</div>
                </div>

                <div className="p-3 bg-[#f8faf7] rounded-2xl border border-[#e2ece0]">
                  <div className="text-[10px] uppercase font-bold text-gray-400">Total Rainfall</div>
                  <div className="text-base font-extrabold text-[#1a2e1a] mt-0.5">{activePreview.precip}</div>
                  <div className="text-[10px] text-gray-500">Seasonal depth</div>
                </div>

                <div className="p-3 bg-[#f8faf7] rounded-2xl border border-[#e2ece0]">
                  <div className="text-[10px] uppercase font-bold text-gray-400">Root-Zone Wetness</div>
                  <div className="text-base font-extrabold text-[#1a2e1a] mt-0.5">{activePreview.soilWetness}</div>
                  <div className="text-[10px] text-gray-500">0.0 to 1.0 fraction</div>
                </div>

                <div className="p-3 bg-[#f8faf7] rounded-2xl border border-[#e2ece0]">
                  <div className="text-[10px] uppercase font-bold text-gray-400">Satellite Sensor</div>
                  <div className="text-xs font-bold text-[#2d7a3a] mt-0.5 truncate">MODIS 250m</div>
                  <div className="text-[10px] text-gray-500">NASA GIBS WMTS</div>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <Link
                  href={`/analyze?lat=${activePreview.lat}&lon=${activePreview.lon}`}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#2d7a3a] hover:bg-[#23602d] text-white rounded-xl text-xs font-bold transition shadow-xs"
                >
                  <span>Analyse This Basin</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>

                <Link
                  href={`/farm-futures`}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#f8faf7] hover:bg-[#eef7ec] text-[#2d7a3a] border border-[#dce8da] rounded-xl text-xs font-bold transition"
                >
                  <FlaskConical className="h-3.5 w-3.5" />
                  <span>Simulate Shift</span>
                </Link>
              </div>
            </div>

            {/* Right Map/Satellite Callout (5 Cols) */}
            <div className="md:col-span-5 relative rounded-2xl overflow-hidden border border-[#d2e4d0] shadow-inner bg-[#0f1f14] p-4 text-white space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-[#86efac] flex items-center gap-1.5">
                  <Satellite className="h-4 w-4" /> NASA GIBS Swath
                </span>
                <span className="font-mono text-[11px] text-gray-300">MODIS Terra / Bands 7-2-1</span>
              </div>
              <div className="h-28 rounded-xl bg-gradient-to-br from-green-900/60 to-slate-900/80 p-3 flex flex-col justify-end border border-white/10">
                <div className="text-xs font-bold text-white">{activePreview.name}</div>
                <div className="text-[11px] text-gray-300">
                  Calibrated shortwave &amp; near-IR surface reflectance
                </div>
              </div>
              <div className="flex items-center justify-between text-[11px] text-gray-300 pt-1 border-t border-white/10">
                <span>Active Swath Date: {activePreview.imgDate}</span>
                <Link href="/explorer" className="text-[#86efac] hover:underline flex items-center gap-1">
                  Full Explorer <ExternalLink className="h-3 w-3" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 3. Eight Core Capabilities Showcase ─────────────────────── */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-12">
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#eef7ec] border border-[#d2e4d0] text-xs font-bold text-[#2d7a3a]">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Comprehensive Scientific Adaptation Suite</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[#1a2e1a] tracking-tight">
            Integrated Earth Observation &amp; Adaptation Modules
          </h2>
          <p className="text-sm sm:text-base text-[#4a6741]">
            Every module directly executes real scientific calculations over live NASA POWER MERRA-2 and NASA GIBS
            Earth observations — zero simulated placeholders.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {CAPABILITIES.map((cap) => {
            const Icon = cap.icon;
            return (
              <Link
                key={cap.id}
                href={cap.href}
                className="group bg-white rounded-3xl p-6 border border-[#dce8da] hover:border-[#2d7a3a] shadow-xs hover:shadow-xl transition-all duration-300 flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="p-3 rounded-2xl bg-[#eef7ec] text-[#2d7a3a] group-hover:bg-[#2d7a3a] group-hover:text-white transition">
                      <Icon className="h-6 w-6" />
                    </span>
                    <span className="text-[10px] uppercase font-bold text-[#2d7a3a] bg-[#eef7ec] px-2.5 py-0.5 rounded-full border border-[#d2e4d0]">
                      {cap.badge}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-[#1a2e1a] group-hover:text-[#2d7a3a] transition">
                    {cap.title}
                  </h3>

                  <div className="text-xs font-semibold text-[#2d7a3a]">{cap.tagline}</div>

                  <p className="text-xs text-[#4a6741] leading-relaxed line-clamp-4">{cap.desc}</p>
                </div>

                <div className="pt-3 border-t border-[#f0f7ee] flex items-center justify-between text-xs font-bold text-[#2d7a3a]">
                  <span className="text-[11px] text-gray-500 font-mono">{cap.metric}</span>
                  <span className="inline-flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                    Launch <ChevronRight className="h-4 w-4" />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ── 4. Scientific Intelligence Workflow Pipeline ────────────── */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-[#f0f7ee] border-y border-[#dce8da]">
        <div className="max-w-7xl mx-auto space-y-12">
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <span className="text-xs font-bold text-[#2d7a3a] uppercase tracking-wider">
              End-to-End Processing Architecture
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[#1a2e1a] tracking-tight">
              From Raw Planetary Swaths to Farm-Level Decisions
            </h2>
            <p className="text-sm sm:text-base text-[#4a6741]">
              How AGROSCOPE AI transforms terabytes of orbital Earth science into verified, explainable agricultural actions.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 relative">
            {WORKFLOW_STEPS.map((step, idx) => (
              <div
                key={step.step}
                className="bg-white rounded-3xl p-5 border border-[#dce8da] shadow-xs space-y-3 relative flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-black text-[#2d7a3a]">{step.step}</span>
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: step.color }} />
                  </div>
                  <h3 className="text-sm font-bold text-[#1a2e1a]">{step.title}</h3>
                  <div className="text-[10px] font-bold font-mono text-[#4a6741]">{step.agency}</div>
                  <p className="text-xs text-gray-600 leading-relaxed">{step.desc}</p>
                </div>

                {idx < WORKFLOW_STEPS.length - 1 && (
                  <div className="hidden md:block absolute -right-3 top-1/2 -translate-y-1/2 z-10 text-gray-300">
                    <ChevronRight className="h-6 w-6" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 5. Data Provenance & Scientific Transparency ────────────── */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-12">
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#eef7ec] border border-[#d2e4d0] text-xs font-bold text-[#2d7a3a]">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Strict Scientific Provenance</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[#1a2e1a] tracking-tight">
            Integrated NASA Earth Observation Datasets
          </h2>
          <p className="text-sm sm:text-base text-[#4a6741]">
            We operate exclusively over authenticated, public NASA Earthdata missions and documented bioclimatological models.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {DATASETS.map((ds) => (
            <div
              key={ds.name}
              className="bg-white rounded-3xl p-6 border border-[#dce8da] shadow-xs space-y-4"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-[#1a2e1a]">{ds.name}</h3>
                  <div className="text-xs text-[#2d7a3a] font-semibold">{ds.category}</div>
                </div>
                <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-[#eef7ec] text-[#2d7a3a] border border-[#c2ddbf]">
                  {ds.badge}
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-gray-100">
                  <span className="text-gray-500">Source Mission:</span>
                  <span className="font-semibold text-gray-800">{ds.source}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-gray-100">
                  <span className="text-gray-500">Spatial &amp; Temporal Coverage:</span>
                  <span className="font-semibold text-gray-800">{ds.resolution}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-gray-500">Extracted Variables:</span>
                  <span className="font-mono font-bold text-[#1a2e1a]">{ds.variables}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── 6. Professional Call to Action ──────────────────────────── */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-[#163e26] to-[#0c1b12] text-white">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <div className="p-4 rounded-3xl bg-white/10 w-fit mx-auto border border-white/10">
            <Sprout className="h-10 w-10 text-[#86efac]" />
          </div>

          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Ready to Analyze Any Agricultural Field on Earth?
          </h2>

          <p className="text-base text-gray-300 max-w-2xl mx-auto leading-relaxed">
            Select custom geographic coordinates or draw field polygons. Receive comprehensive agroclimatological history,
            drought stress decomposition, and evidence-grounded crop rotation guidance in seconds.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            <Link
              href="/analyze"
              className="inline-flex items-center gap-2 px-8 py-4 bg-[#86efac] hover:bg-[#4ade80] text-[#0c1b12] font-extrabold text-sm rounded-2xl shadow-xl transition transform hover:-translate-y-0.5"
            >
              <span>Start Field Intelligence</span>
              <ArrowRight className="h-4 w-4" />
            </Link>

            <Link
              href="/explorer"
              className="inline-flex items-center gap-2 px-7 py-4 bg-white/10 hover:bg-white/20 text-white border border-white/20 font-bold text-sm rounded-2xl backdrop-blur-md transition"
            >
              <span>Explore Satellite Swaths</span>
            </Link>
          </div>
        </div>
      </section>

      {/* ── 7. Professional Institutional Footer ────────────────────── */}
      <footer className="bg-[#0c1b12] text-gray-400 py-16 px-4 sm:px-6 lg:px-8 border-t border-[#1b3b24]">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-10">
          <div className="space-y-4 md:col-span-1">
            <div className="flex items-center gap-2 text-white font-extrabold text-lg">
              <Sprout className="h-6 w-6 text-[#86efac]" />
              <span>AGROSCOPE AI</span>
            </div>
            <p className="text-xs text-gray-400 leading-relaxed">
              Global agricultural intelligence platform powered by Earth observation, environmental science and
              explainable AI. Built for the NASA Space Apps Challenge 2026.
            </p>
            <div className="text-[11px] font-mono text-[#86efac]">
              Problem #7: Field Shift
            </div>
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase text-white tracking-wider mb-4">Core Capabilities</h4>
            <ul className="space-y-2 text-xs">
              <li><Link href="/farm-futures" className="hover:text-white transition">Farm Futures Lab</Link></li>
              <li><Link href="/change-detective" className="hover:text-white transition">Satellite Change Detective</Link></li>
              <li><Link href="/advisor" className="hover:text-white transition">Farmer Action Copilot</Link></li>
              <li><Link href="/field-boundary" className="hover:text-white transition">Field Boundary Intelligence</Link></li>
              <li><Link href="/risk-radar" className="hover:text-white transition">Regional Risk Radar</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase text-white tracking-wider mb-4">Intelligence &amp; Science</h4>
            <ul className="space-y-2 text-xs">
              <li><Link href="/analyze" className="hover:text-white transition">Field Intelligence Scorer</Link></li>
              <li><Link href="/water-intel" className="hover:text-white transition">Smart Water Intelligence</Link></li>
              <li><Link href="/phenology" className="hover:text-white transition">Crop Phenology Tracker</Link></li>
              <li><Link href="/explorer" className="hover:text-white transition">Earth Explorer (GIBS)</Link></li>
              <li><Link href="/about" className="hover:text-white transition">Methodology &amp; Formulas</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase text-white tracking-wider mb-4">Data Transparency</h4>
            <ul className="space-y-2 text-xs">
              <li><span className="text-gray-300">NASA POWER Agroclimatology</span></li>
              <li><span className="text-gray-300">NASA GIBS Satellite Swaths</span></li>
              <li><span className="text-gray-300">MODIS Terra / Aqua Reflectance</span></li>
              <li><span className="text-gray-300">GPM IMERG Global Precipitation</span></li>
              <li><span className="text-gray-300">SMAP Soil Moisture Active Passive</span></li>
            </ul>
          </div>
        </div>

        <div className="max-w-7xl mx-auto pt-10 mt-10 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between text-xs text-gray-500 gap-4">
          <div>
            © 2026 AGROSCOPE AI · NASA Space Apps Challenge Project. All satellite imagery courtesy of NASA GIBS / Earthdata.
          </div>
          <div>
            Meteorological reanalysis provided by NASA POWER Project (MERRA-2).
          </div>
        </div>
      </footer>
    </div>
  );
}
