import {
  Database,
  FlaskConical,
  ExternalLink,
  ShieldAlert,
  BookOpen,
} from "lucide-react";

const datasets = [
  {
    name: "NASA POWER Agroclimatology",
    url: "https://power.larc.nasa.gov/",
    type: "Model reanalysis (MERRA-2 / GMAO)",
    variables:
      "T2M, T2M_MIN, T2M_MAX, PRECTOTCORR, RH2M, ALLSKY_SFC_SW_DWN, WS2M, GWETTOP, GWETROOT, GWETPROF",
    resolution: "~0.5° × 0.625° (~55 km)",
    temporal: "Daily, Monthly | 1981–present",
    auth: "Public Open API (No key required)",
    note: "Meteorological reanalysis estimates. Bias-corrected surface precipitation.",
  },
  {
    name: "NASA GIBS (Global Imagery Browse Services)",
    url: "https://nasa-gibs.github.io/gibs-api-docs/",
    type: "Satellite imagery WMTS tile server",
    variables:
      "MODIS Terra/Aqua TrueColor, MODIS Bands 7-2-1 Agriculture, VIIRS NOAA-20 TrueColor, GPM IMERG 30-min Rain",
    resolution: "250m – 1km optical resolution",
    temporal: "Daily Composites | 2000–present",
    auth: "Public EPSG:3857 Web Mercator WMTS",
    note: "Direct raster tile streaming to Leaflet map viewports without raw HDF binary downloads.",
  },
  {
    name: "MODIS Terra / Aqua (EOS AM-1 / PM-1)",
    url: "https://modis.gsfc.nasa.gov/",
    type: "Radiometric satellite observation",
    variables: "MOD09 / MYD09 Corrected Reflectance Bands 1, 4, 3 (TrueColor) and Bands 7, 2, 1 (Agricultural)",
    resolution: "250m – 500m optical nadir resolution",
    temporal: "Daily repeat cycle | 2000–present",
    auth: "Public WMTS streaming via NASA GIBS",
    note: "Agricultural Bands 7-2-1 render healthy crop canopies in vivid green, bare soil in tan, and open water in black.",
  },
  {
    name: "GPM IMERG (Global Precipitation Measurement)",
    url: "https://gpm.nasa.gov/data/imerg",
    type: "Multi-satellite constellation precipitation",
    variables: "IMERG_Precipitation_Rate_30min, Cumulative Rain (mm)",
    resolution: "0.1° (~11 km)",
    temporal: "Half-hourly & Monthly | 2000–present",
    auth: "Public WMTS streaming via NASA GIBS",
    note: "Integrated Multi-satellitE Retrievals for GPM. Fuses microwave and geostationary infrared sensors.",
  },
];

const methods = [
  {
    label: "Vegetation Index (NDVI)",
    formula: "NDVI = (NIR − Red) / (NIR + Red)",
    ref: "Tucker (1979), Remote Sensing of Environment",
  },
  {
    label: "Growing Degree Days (GDD)",
    formula: "GDD = max((min(T_max, T_cap) + max(T_min, T_base)) / 2 − T_base, 0)",
    ref: "McMaster & Wilhelm (1997), Agricultural and Forest Meteorology",
  },
  {
    label: "Standardized Precipitation Index (SPI-3)",
    formula: "Gamma distribution MLE fit → inverse standard normal transformation (90-day rolling window)",
    ref: "McKee, Doesken & Kleist (1993), 8th Conference on Applied Climatology",
  },
  {
    label: "Biophysical Composite Stress Score",
    formula: "Score = (0.35 × SPI) + (0.30 × NDVI_anomaly) + (0.20 × Root_wetness) + (0.15 × Temp_anomaly) × 100",
    ref: "AGROSCOPE AI Explainable Decision Engine",
  },
  {
    label: "Crop Suitability Ranking",
    formula: "Score = (0.35 × GDD_suitability + 0.35 × Water_balance + 0.20 × Temp_tolerance) × Stress_penalty × 100",
    ref: "Multi-parameter agronomic matching heuristic",
  },
  {
    label: "Savitzky-Golay Phenological Smoothing",
    formula: "Y_k = Σ (C_i × y_{k+i}) / N, with local degree-2 polynomial fitting across DOY 1..365",
    ref: "Savitzky & Golay (1964), Analytical Chemistry; Jönsson & Eklundh (2004)",
  },
];

export default function AboutPage() {
  return (
    <div className="max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-8 py-5 space-y-5">
      {/* ── Top Bar: Page Header ────────────────────────────────────── */}
      <div className="bg-white rounded-xl p-4 sm:p-5 border border-slate-200 shadow-2xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-[#0d3b2e] text-emerald-400">
              <BookOpen className="h-4 w-4" />
            </span>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              Scientific Methodology &amp; Data Provenance
            </h1>
            <span className="text-[10px] font-semibold uppercase text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              Transparent Science
            </span>
          </div>
          <p className="text-xs text-slate-500 max-w-3xl leading-relaxed">
            NASA Space Apps Challenge 2026 · Problem #7 Field Shift. Open-source agroclimatic decision support architecture, peer-reviewed mathematical formulations, and authoritative Earth observation citations.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-500 font-medium shrink-0">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span>NASA POWER &bull; NASA GIBS &bull; GPM &bull; MERRA-2</span>
        </div>
      </div>

      {/* ── Authoritative NASA Datasets ──────────────────────────────── */}
      <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-2xs space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-[#0d3b2e]" />
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Authoritative Ingested Data Streams
            </h2>
          </div>
          <span className="text-[10px] text-slate-500 font-mono">100% Non-Fabricated Telemetry</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {datasets.map((ds) => (
            <div key={ds.name} className="p-4 rounded-lg bg-slate-50/70 border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-slate-900">{ds.name}</span>
                <a
                  href={ds.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-slate-400 hover:text-[#0d3b2e] transition"
                  title="Source Portal"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
              <div className="text-[11px] text-slate-600">{ds.type}</div>
              <div className="p-2 rounded bg-white border border-slate-200 text-[10px] font-mono text-slate-700">
                Variables: {ds.variables}
              </div>
              <div className="text-[10px] text-slate-500 space-y-0.5">
                <div>Spatial: {ds.resolution} &bull; Temporal: {ds.temporal}</div>
                <div>Access: {ds.auth}</div>
                <div className="text-slate-600 italic mt-1">{ds.note}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Peer-Reviewed Biophysical Methodologies ────────────────────── */}
      <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-2xs space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <FlaskConical className="w-4 h-4 text-[#0d3b2e]" />
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Mathematical Formulations &amp; Scientific Citations
            </h2>
          </div>
          <span className="text-[10px] text-slate-500 font-mono">Deterministic Heuristics</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {methods.map((m) => (
            <div key={m.label} className="p-4 rounded-lg bg-slate-50/70 border border-slate-200 space-y-2">
              <span className="font-bold text-xs text-slate-900">{m.label}</span>
              <div className="p-2 rounded bg-white border border-slate-200 text-[11px] font-mono text-[#0d3b2e] font-semibold">
                {m.formula}
              </div>
              <div className="text-[10px] text-slate-500 italic">
                Citation: {m.ref}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Spatial Limitations & Scientific Disclaimer ───────────────── */}
      <div className="bg-white rounded-xl p-4 sm:p-5 border border-slate-200 shadow-2xs space-y-2">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-900 uppercase tracking-wider">
          <ShieldAlert className="w-4 h-4 text-amber-600" />
          <span>Spatial Limitations &amp; Decision Disclaimers</span>
        </div>
        <p className="text-xs text-slate-600 leading-relaxed">
          NASA POWER provides meteorological reanalysis on a ~55 km grid. While highly accurate for macro-scale agroclimatic trends, local microtopography and microclimates may vary. Satellite observations from NASA GIBS provide 250m daily spatial resolution, subject to cloud obscuration during intense storm events. All stress indicators and rotation recommendations serve as decision-support heuristics to supplement on-the-ground agronomic expertise.
        </p>
      </div>
    </div>
  );
}
