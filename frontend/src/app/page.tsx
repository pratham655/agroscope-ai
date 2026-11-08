"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import {
  Satellite,
  Globe2,
  Compass,
  ArrowRight,
  ShieldCheck,
  Activity,
  Layers,
  Sparkles,
  Cpu,
  Droplets,
  Sprout,
  BarChart3,
  Clock,
  ScanEye,
  FileText,
  Thermometer,
  CloudRain,
  Database,
  ExternalLink,
} from "lucide-react";
import { useLocation } from "@/context/LocationContext";

// Dynamically load interactive 3D Globe with SSR disabled
const EarthGlobe3D = dynamic(() => import("@/components/EarthGlobe3D"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[520px] rounded-2xl bg-slate-900 flex flex-col items-center justify-center text-emerald-400 gap-3 border border-slate-700/60 shadow-2xl">
      <Globe2 className="h-8 w-8 animate-spin text-emerald-400" />
      <span className="text-xs font-semibold text-slate-300">
        Initializing Planetary Observation Globe...
      </span>
    </div>
  ),
});

interface FeatureCardData {
  title: string;
  category: string;
  description: string;
  href: string;
  badge: string;
  gradientClass: string;
  glowClass: string;
  icon: React.ComponentType<{ className?: string }>;
  accentColor: string;
  borderAccent: string;
  metrics: string[];
}

const FEATURE_CATALOG: FeatureCardData[] = [
  {
    title: "Earth Explorer",
    category: "Satellite Telemetry",
    badge: "2D & 3D Planetary Swaths",
    description:
      "Explore high-resolution NASA satellite imagery and planetary observations across 2D cartographic projections and interactive 3D globes.",
    href: "/explorer",
    gradientClass: "grad-explorer",
    glowClass: "glow-cyan",
    icon: Globe2,
    accentColor: "from-cyan-400 to-blue-500",
    borderAccent: "hover:border-cyan-400/60",
    metrics: ["MODIS Terra & Aqua", "VIIRS NOAA-20", "GPM IMERG Rain", "NDVI & LST"],
  },
  {
    title: "Field Intelligence Engine",
    category: "Biophysical Modeling",
    badge: "Multivariate Telemetry",
    description:
      "Analyze multivariate agroclimatic conditions, drought severity indices, thermal units, and heuristic crop suitability for arbitrary global coordinates.",
    href: "/analyze",
    gradientClass: "grad-field-intel",
    glowClass: "glow-emerald",
    icon: Activity,
    accentColor: "from-emerald-400 to-teal-400",
    borderAccent: "hover:border-emerald-400/60",
    metrics: ["SPI-3 Drought Index", "Root-Zone Wetness", "Cumulative GDD", "Crop Scoring"],
  },
  {
    title: "Farmer Action Copilot",
    category: "Conversational Intelligence",
    badge: "Evidence-Grounded AI",
    description:
      "Query complex agronomic strategies and receive AI-guided adaptation pathways strictly verified against NASA Earth observations.",
    href: "/advisor",
    gradientClass: "grad-copilot",
    glowClass: "glow-indigo",
    icon: Cpu,
    accentColor: "from-violet-400 to-indigo-400",
    borderAccent: "hover:border-purple-400/60",
    metrics: ["OpenRouter LLM", "0.1° Coordinate Guard", "NASA Data Citation", "Rotation Guidance"],
  },
  {
    title: "Farm Futures Lab",
    category: "Climate Simulation",
    badge: "Scenario Stress Testing",
    description:
      "Simulate extreme climate shock scenarios—precipitation deficits, heatwaves, and soil dry spells—to evaluate adaptive crop resilience.",
    href: "/farm-futures",
    gradientClass: "grad-futures",
    glowClass: "glow-amber",
    icon: Sparkles,
    accentColor: "from-amber-400 to-rose-400",
    borderAccent: "hover:border-amber-400/60",
    metrics: ["Precipitation Delta", "Thermal Shift (ΔT)", "Soil Moisture Bias", "Irrigation Toggles"],
  },
  {
    title: "Smart Water Intelligence",
    category: "Hydrological Systems",
    badge: "Root-Zone Soil Moisture",
    description:
      "Track precipitation dynamics, dual-depth root-zone wetness, dry spell frequency, and calculate FAO-56 irrigation demands.",
    href: "/water-intel",
    gradientClass: "grad-water",
    glowClass: "glow-cyan",
    icon: Droplets,
    accentColor: "from-cyan-400 to-sky-500",
    borderAccent: "hover:border-cyan-400/60",
    metrics: ["Root-Zone vs. Surface", "MERRA-2 Hydrology", "SMAP Observation", "FAO-56 Water Need"],
  },
  {
    title: "Crop Phenology Tracker",
    category: "Vegetation Dynamics",
    badge: "Canopy Seasonality",
    description:
      "Explore seasonal vegetation growth trajectories, Savitzky-Golay smoothed NDVI curves, and inter-annual peak canopy timing.",
    href: "/phenology",
    gradientClass: "grad-phenology",
    glowClass: "glow-emerald",
    icon: Sprout,
    accentColor: "from-emerald-300 to-lime-400",
    borderAccent: "hover:border-emerald-400/60",
    metrics: ["Green-up Onset (DOY)", "Peak Canopy Timing", "Season Length", "Inter-Annual Trends"],
  },
  {
    title: "Regional Risk Radar",
    category: "Geographic Vulnerability",
    badge: "Global Breadbasket Audit",
    description:
      "Benchmark agricultural vulnerability across major global agricultural breadbaskets with ranked stress scores and resilient crop portfolios.",
    href: "/risk-radar",
    gradientClass: "grad-risk",
    glowClass: "glow-amber",
    icon: Compass,
    accentColor: "from-rose-400 to-amber-400",
    borderAccent: "hover:border-rose-400/60",
    metrics: ["Kansas Wheat Belt", "Punjab Basin", "São Paulo Cerrado", "Murray-Darling"],
  },
  {
    title: "Satellite Change Detective",
    category: "Dual-Epoch Analytics",
    badge: "Synchronized Map Comparison",
    description:
      "Compare dual-epoch satellite swaths side-by-side to detect land cover changes, irrigation expansion, or drought progression over time.",
    href: "/change-detective",
    gradientClass: "grad-change",
    glowClass: "glow-cyan",
    icon: ScanEye,
    accentColor: "from-sky-400 to-blue-500",
    borderAccent: "hover:border-sky-400/60",
    metrics: ["Dual Map Viewports", "Differential Telemetry", "Epoch Comparison", "CSV Export"],
  },
  {
    title: "Field Boundary Intelligence",
    category: "Vector Parcel GIS",
    badge: "Polygon Geodesics",
    description:
      "Draw custom field boundaries, upload GeoJSON polygons, and extract geodesic acreage, perimeter, and centroid climate overlays.",
    href: "/field-boundary",
    gradientClass: "grad-boundary",
    glowClass: "glow-emerald",
    icon: Layers,
    accentColor: "from-teal-300 to-emerald-400",
    borderAccent: "hover:border-teal-400/60",
    metrics: ["Interactive Vector GIS", "WGS-84 Centroid", "Hectare Calculations", "GeoJSON Import/Export"],
  },
  {
    title: "Satellite Time Machine",
    category: "Chronological Sequence",
    badge: "Orbital Timeline Scrubbing",
    description:
      "Travel back through historical satellite observations to inspect annual crop seasons, monsoon arrivals, and weather impacts.",
    href: "/time-machine",
    gradientClass: "grad-time",
    glowClass: "glow-indigo",
    icon: Clock,
    accentColor: "from-purple-400 to-indigo-400",
    borderAccent: "hover:border-purple-400/60",
    metrics: ["Multi-Year Time Lapse", "Instrument Calibration", "Temporal Sliders", "NASA GIBS Archive"],
  },
  {
    title: "Agricultural Intelligence Reports",
    category: "Institutional Dossier",
    badge: "Publication-Grade Export",
    description:
      "Generate comprehensive, printable scientific field dossiers with automated executive findings, biophysical tables, and PDF export.",
    href: "/reports",
    gradientClass: "grad-reports",
    glowClass: "glow-cyan",
    icon: FileText,
    accentColor: "from-slate-300 to-sky-400",
    borderAccent: "hover:border-slate-400/60",
    metrics: ["Automated Executive Summary", "Vector Charts Included", "Markdown & Print Canvas", "Direct PDF Download"],
  },
];

export default function HomePage() {
  const { setLocation } = useLocation();

  return (
    <div className="min-h-screen bg-[#F7F8F4] text-slate-900 selection:bg-emerald-100 selection:text-emerald-900">
      {/* ─────────────────────────────────────────────────────────────
          SECTION 1 — VISUAL HERO
      ───────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden pt-8 pb-16 lg:pt-16 lg:pb-24 border-b border-slate-200/80 bg-gradient-to-b from-white via-[#F7F8F4] to-[#eef2eb]">
        {/* Atmospheric Glow Backdrops */}
        <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-emerald-400/15 blur-3xl pointer-events-none" />
        <div className="absolute top-10 right-0 w-[500px] h-[500px] rounded-full bg-cyan-400/15 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 left-1/3 w-80 h-80 rounded-full bg-amber-400/10 blur-3xl pointer-events-none" />

        <div className="max-w-[1500px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            {/* Left Content Column (7 cols) */}
            <div className="lg:col-span-7 space-y-6">
              {/* NASA Space Apps 2026 Pill */}
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 shadow-2xs">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-900">
                  NASA Space Apps Challenge · Field Shift
                </span>
                <span className="text-slate-300">|</span>
                <span className="text-xs font-semibold text-emerald-800">
                  Global Earth Intelligence
                </span>
              </div>

              {/* Main Headline */}
              <h1 className="heading-display text-slate-950">
                Understand Earth. <br />
                <span className="bg-gradient-to-r from-[#123D2C] via-[#1C9B63] to-[#176B9B] bg-clip-text text-transparent">
                  Transform Agriculture.
                </span>
              </h1>

              {/* Supporting Text */}
              <p className="text-base sm:text-lg text-slate-600 max-w-2xl leading-relaxed text-balance">
                Explore our planet through NASA Earth observations, discover agricultural risks, and build
                climate-resilient farming strategies with intelligent geospatial analysis.
              </p>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3.5 pt-2">
                <a
                  href="#discover"
                  className="px-6 py-3.5 rounded-xl bg-[#123D2C] hover:bg-[#1a523b] text-white text-sm font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-2 group cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 text-emerald-300 group-hover:rotate-12 transition-transform" />
                  <span>Explore Intelligence</span>
                  <ArrowRight className="w-4 h-4 text-emerald-400 group-hover:translate-x-1 transition-transform" />
                </a>

                <Link
                  href="/explorer"
                  className="px-6 py-3.5 rounded-xl bg-white hover:bg-slate-50 text-slate-900 text-sm font-bold border border-slate-300 shadow-2xs hover:shadow-md transition-all flex items-center gap-2 group"
                >
                  <Globe2 className="w-4 h-4 text-[#176B9B] group-hover:scale-110 transition-transform" />
                  <span>Launch Earth Explorer</span>
                </Link>
              </div>

              {/* Live Mission Instruments Bar */}
              <div className="pt-6 border-t border-slate-200/80 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-slate-500">
                <span className="font-semibold text-slate-700 uppercase tracking-wider text-[11px]">
                  NASA Integrations:
                </span>
                <span className="flex items-center gap-1 font-mono">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-500" />
                  MODIS Terra / Aqua
                </span>
                <span className="flex items-center gap-1 font-mono">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  MERRA-2 Reanalysis
                </span>
                <span className="flex items-center gap-1 font-mono">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                  GPM IMERG Rain
                </span>
                <span className="flex items-center gap-1 font-mono">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  SMAP Soil Moisture
                </span>
              </div>
            </div>

            {/* Right Visual Artwork & Hero Card (5 cols) */}
            <div className="lg:col-span-5">
              <div className="relative rounded-2xl p-1 bg-gradient-to-br from-[#1C9B63] via-[#48C9D6] to-[#5554C8] shadow-2xl">
                <div className="rounded-[14px] bg-slate-950 p-6 text-white space-y-5 overflow-hidden relative">
                  {/* Atmospheric Glow inside card */}
                  <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />

                  <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                    <div className="flex items-center gap-2">
                      <Satellite className="w-5 h-5 text-emerald-400 animate-pulse" />
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                        Orbital Perspective
                      </span>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-700/50">
                      GIBS WMTS Live
                    </span>
                  </div>

                  {/* Atmospheric Geospatial Infographic */}
                  <div className="space-y-4">
                    <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400 flex items-center gap-1.5">
                          <CloudRain className="w-3.5 h-3.5 text-cyan-400" />
                          Precipitation Regime
                        </span>
                        <span className="font-mono text-cyan-300 font-bold">GPM IMERG</span>
                      </div>
                      <div className="text-sm font-semibold text-slate-200">
                        Multi-sensor bias-corrected 30-minute global precipitation
                      </div>
                    </div>

                    <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400 flex items-center gap-1.5">
                          <Droplets className="w-3.5 h-3.5 text-emerald-400" />
                          Root-Zone Hydrology
                        </span>
                        <span className="font-mono text-emerald-300 font-bold">MERRA-2 / SMAP</span>
                      </div>
                      <div className="text-sm font-semibold text-slate-200">
                        Dual-depth 0–100 cm soil moisture profile & wilting point bounds
                      </div>
                    </div>

                    <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400 flex items-center gap-1.5">
                          <Thermometer className="w-3.5 h-3.5 text-amber-400" />
                          Thermal Energy (GDD)
                        </span>
                        <span className="font-mono text-amber-300 font-bold">NASA POWER</span>
                      </div>
                      <div className="text-sm font-semibold text-slate-200">
                        Growing Degree Days accumulation & heatwave risk detection
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 flex items-center justify-between text-xs">
                    <span className="text-slate-400 font-mono text-[11px]">
                      Global Resolution: 0.1° / 0.5°
                    </span>
                    <Link
                      href="/analyze"
                      className="text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1 text-xs transition"
                    >
                      <span>Launch Pipeline</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          SECTION 2 — DISCOVER OUR INTELLIGENCE (11 VIBRANT FEATURE CARDS)
      ───────────────────────────────────────────────────────────── */}
      <section id="discover" className="py-20 max-w-[1500px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto space-y-3 mb-14">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-xs font-bold uppercase tracking-wider text-slate-700">
            Feature Discovery
          </div>
          <h2 className="heading-section text-slate-950">
            One Planet. Multiple Perspectives.
          </h2>
          <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
            Explore the science, intelligence, and Earth observation capabilities transforming
            agricultural decision-making across the world.
          </p>
        </div>

        {/* 11 Distinct Colourful Feature Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURE_CATALOG.map((feat) => {
            const Icon = feat.icon;
            return (
              <div
                key={feat.title}
                className={`feature-card rounded-2xl border border-slate-200/90 bg-white overflow-hidden flex flex-col justify-between shadow-xs ${feat.borderAccent} ${feat.glowClass}`}
              >
                <div>
                  {/* Card Visual Header with Feature-Specific Gradient */}
                  <div className={`p-6 text-white ${feat.gradientClass} relative overflow-hidden`}>
                    <div className="relative z-10 flex items-center justify-between">
                      <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur-md flex items-center justify-center text-white border border-white/25 shadow-xs">
                        <Icon className="w-5 h-5 text-white" />
                      </div>
                      <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-black/25 text-white backdrop-blur-sm border border-white/20">
                        {feat.category}
                      </span>
                    </div>

                    <div className="relative z-10 mt-5">
                      <span className="text-xs font-semibold text-white/80 block">
                        {feat.badge}
                      </span>
                      <h3 className="text-xl font-extrabold text-white tracking-tight mt-0.5">
                        {feat.title}
                      </h3>
                    </div>

                    {/* Subtle geometric circle overlay */}
                    <div className="absolute -bottom-8 -right-8 w-32 h-32 rounded-full bg-white/10 blur-xl pointer-events-none" />
                  </div>

                  {/* Card Body Description */}
                  <div className="p-6 space-y-4">
                    <p className="text-xs sm:text-sm text-slate-600 leading-relaxed min-h-[4rem]">
                      {feat.description}
                    </p>

                    {/* Key Technical Signals / Metrics Pills */}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {feat.metrics.map((m) => (
                        <span
                          key={m}
                          className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-slate-50 text-slate-700 border border-slate-200"
                        >
                          {m}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Card Action Footer */}
                <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Full Workspace
                  </span>
                  <Link
                    href={feat.href}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-[#123D2C] hover:text-[#1C9B63] transition group"
                  >
                    <span>Launch Feature</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          SECTION 3 — HOW AGROSCOPE AI WORKS (3-STAGE VISUAL STORYTELLING)
      ───────────────────────────────────────────────────────────── */}
      <section className="py-20 bg-white border-y border-slate-200/80">
        <div className="max-w-[1500px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-3 mb-14">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-xs font-bold uppercase tracking-wider text-emerald-900">
              Scientific Pipeline
            </div>
            <h2 className="heading-section text-slate-950">
              Observe. Anticipate. Adapt.
            </h2>
            <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
              From raw satellite radiances to actionable on-farm climate adaptation pathways.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            {/* Stage 1: OBSERVE */}
            <div className="rounded-2xl p-6 sm:p-8 bg-gradient-to-b from-cyan-50/70 to-white border border-cyan-200/80 shadow-xs space-y-4">
              <div className="w-12 h-12 rounded-xl bg-cyan-600 flex items-center justify-center text-white shadow-md">
                <Satellite className="w-6 h-6 text-white" />
              </div>
              <div className="space-y-1">
                <span className="text-xs font-bold uppercase tracking-wider text-cyan-800">
                  Step 01
                </span>
                <h3 className="text-xl font-bold text-slate-900">OBSERVE</h3>
              </div>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Ingest continuous global Earth observation swaths from NASA GIBS, GPM IMERG, and MERRA-2 reanalysis.
                Capture surface temperatures, solar radiation, rainfall volume, and soil wetness at high temporal frequency.
              </p>
              <div className="pt-2 text-xs font-semibold text-cyan-800 flex items-center gap-1">
                <span>Direct Satellite Observation</span>
              </div>
            </div>

            {/* Stage 2: ANTICIPATE */}
            <div className="rounded-2xl p-6 sm:p-8 bg-gradient-to-b from-amber-50/70 to-white border border-amber-200/80 shadow-xs space-y-4">
              <div className="w-12 h-12 rounded-xl bg-amber-500 flex items-center justify-center text-white shadow-md">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <div className="space-y-1">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-800">
                  Step 02
                </span>
                <h3 className="text-xl font-bold text-slate-900">ANTICIPATE</h3>
              </div>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Compute meteorological and hydrological drought stress using Standardized Precipitation Index (SPI-3)
                and root-zone wilting thresholds. Track GDD accumulation and model climate shock vulnerabilities.
              </p>
              <div className="pt-2 text-xs font-semibold text-amber-800 flex items-center gap-1">
                <span>Biophysical Risk Modeling</span>
              </div>
            </div>

            {/* Stage 3: ADAPT */}
            <div className="rounded-2xl p-6 sm:p-8 bg-gradient-to-b from-emerald-50/70 to-white border border-emerald-200/80 shadow-xs space-y-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-700 flex items-center justify-center text-white shadow-md">
                <Sprout className="w-6 h-6 text-white" />
              </div>
              <div className="space-y-1">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                  Step 03
                </span>
                <h3 className="text-xl font-bold text-slate-900">ADAPT</h3>
              </div>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Translate planetary telemetry into evidence-grounded crop rotation choices, deficit irrigation schedules,
                and conversational agronomic counsel through our OpenRouter AI copilot bounded by observed telemetry.
              </p>
              <div className="pt-2 text-xs font-semibold text-emerald-800 flex items-center gap-1">
                <span>Resilient Agricultural Action</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          SECTION 4 — GLOBAL AGRICULTURAL INTELLIGENCE (INTERACTIVE GLOBE)
      ───────────────────────────────────────────────────────────── */}
      <section className="py-20 max-w-[1500px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl p-8 sm:p-12 bg-slate-950 text-white shadow-2xl relative overflow-hidden">
          {/* Subtle background glow */}
          <div className="absolute top-0 right-1/4 w-96 h-96 rounded-full bg-cyan-500/15 blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-10 w-96 h-96 rounded-full bg-emerald-500/15 blur-3xl pointer-events-none" />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
            {/* Left Narrative Column */}
            <div className="lg:col-span-5 space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800 text-xs font-bold uppercase tracking-wider">
                Planetary Scale
              </div>

              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-white leading-tight">
                Global Agricultural Intelligence Across Every Coordinate.
              </h2>

              <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
                From the Indo-Gangetic Plains of Punjab to the wheat belts of Kansas, the Cerrado of Brazil,
                and the Murray-Darling basin of Australia. AGROSCOPE AI eliminates geographic borders
                with continuous, bias-corrected Earth observations.
              </p>

              <div className="pt-2">
                <Link
                  href="/explorer"
                  className="inline-flex items-center gap-2.5 px-6 py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-slate-950 font-bold text-sm shadow-lg hover:shadow-cyan-500/25 transition-all group"
                >
                  <Globe2 className="w-4 h-4 text-slate-950 group-hover:rotate-45 transition-transform" />
                  <span>Explore the Earth</span>
                  <ArrowRight className="w-4 h-4 text-slate-950 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>

              <div className="pt-4 border-t border-slate-800 grid grid-cols-2 gap-4 text-xs">
                <div>
                  <div className="text-slate-400 font-mono">Global Coverage</div>
                  <div className="text-base font-bold text-white mt-0.5">85°N to 85°S</div>
                </div>
                <div>
                  <div className="text-slate-400 font-mono">Observation Pipeline</div>
                  <div className="text-base font-bold text-white mt-0.5">Continuous GIBS WMTS</div>
                </div>
              </div>
            </div>

            {/* Right Interactive 3D Earth Globe Showcase */}
            <div className="lg:col-span-7">
              <div className="rounded-2xl overflow-hidden border border-slate-800 shadow-2xl">
                <EarthGlobe3D
                  className="w-full h-[520px]"
                  onSelectSite={(site) => {
                    setLocation({
                      latitude: site.lat,
                      longitude: site.lon,
                      label: `${site.name}, ${site.country}`,
                      crop: site.crop,
                      source: "map",
                    });
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          SECTION 5 — NASA AND SCIENTIFIC FOUNDATION
      ───────────────────────────────────────────────────────────── */}
      <section className="py-20 bg-white border-t border-slate-200/80">
        <div className="max-w-[1500px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-3 mb-14">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-xs font-bold uppercase tracking-wider text-slate-700">
              Rigorous Provenance
            </div>
            <h2 className="heading-section text-slate-950">
              NASA & Scientific Foundation
            </h2>
            <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
              Transparent demarcation between direct satellite radiances, numerical reanalysis models, and derived biophysical indicators.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm">
                <Database className="w-4 h-4 text-emerald-700" />
                <span>1. Direct Satellite Observations</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Raw orbital radiometer observations captured by MODIS Terra, MODIS Aqua, and VIIRS NOAA-20.
                Served as standardized EPSG:3857 WMTS tiles via NASA GIBS for TrueColor and false-color Bands 7-2-1.
              </p>
              <div className="text-[11px] font-mono text-slate-500 pt-1">
                Resolution: 250m–1km · Latency: ~3–5 hours
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex items-center gap-2 text-cyan-800 font-bold text-sm">
                <Activity className="w-4 h-4 text-cyan-700" />
                <span>2. Numerical Reanalysis Products</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                NASA MERRA-2 (Modern-Era Retrospective analysis for Research and Applications) combining satellite
                soundings with atmospheric general circulation models (GMAO) for surface precipitation and soil wetness.
              </p>
              <div className="text-[11px] font-mono text-slate-500 pt-1">
                Grid: ~0.5° × 0.625° (~55 km) · NASA POWER API
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex items-center gap-2 text-purple-800 font-bold text-sm">
                <ShieldCheck className="w-4 h-4 text-purple-700" />
                <span>3. Derived Biophysical Indices</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Peer-reviewed scientific formulations including McKee et al. Standardized Precipitation Index (SPI-3),
                Growing Degree Days (GDD), FAO-56 Penman-Monteith crop water requirements, and Savitzky-Golay smoothed NDVI.
              </p>
              <div className="text-[11px] font-mono text-slate-500 pt-1">
                Open formulas · Zero proprietary black-boxes
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          SECTION 6 — FINAL CALL TO ACTION
      ───────────────────────────────────────────────────────────── */}
      <section className="py-24 bg-gradient-to-br from-[#123D2C] via-[#0d2e21] to-[#091f16] text-white relative overflow-hidden">
        {/* Glow Effects */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-emerald-500/10 blur-3xl pointer-events-none" />

        <div className="max-w-4xl mx-auto px-4 text-center space-y-8 relative z-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-700/60 text-xs font-bold uppercase tracking-wider">
            NASA Space Apps Challenge 2026
          </div>

          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
            Explore the Planet. <br />
            Understand the Field. <br />
            <span className="text-emerald-400">Shape the Future.</span>
          </h2>

          <p className="text-slate-300 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
            Harness the power of planetary Earth observations to anticipate climate volatility and adapt agricultural
            production across arbitrary coordinates.
          </p>

          <div className="pt-4 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/explorer"
              className="px-8 py-4 rounded-xl bg-gradient-to-r from-emerald-400 to-teal-400 hover:from-emerald-300 hover:to-teal-300 text-slate-950 font-bold text-base shadow-xl hover:shadow-emerald-400/25 transition-all flex items-center gap-2 group"
            >
              <span>Start Exploring</span>
              <ArrowRight className="w-5 h-5 text-slate-950 group-hover:translate-x-1 transition-transform" />
            </Link>

            <Link
              href="/about"
              className="px-8 py-4 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-base border border-white/20 transition-all flex items-center gap-2"
            >
              <ExternalLink className="w-4 h-4 text-emerald-300" />
              <span>Scientific Documentation</span>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
