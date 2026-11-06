import {
  Leaf,
  Database,
  FlaskConical,
  Code2,
  Award,
  ExternalLink,
  ShieldAlert,
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
    auth: "None required (Public Open API)",
    note: "Model-derived estimates, not direct satellite measurements. Bias-corrected precipitation.",
  },
  {
    name: "NASA GIBS (Global Imagery Browse Services)",
    url: "https://nasa-gibs.github.io/gibs-api-docs/",
    type: "Satellite imagery WMTS tile service",
    variables:
      "MODIS Terra/Aqua TrueColor, MODIS Bands 7-2-1 Agriculture, VIIRS NOAA-20 TrueColor, GPM IMERG 30-min Rain",
    resolution: "250m – 9km depending on sensor and layer",
    temporal: "Near Real-Time to Daily Composites | 2000–present",
    auth: "None required (Public EPSG:3857 WMTS)",
    note: "Streams satellite raster tiles directly to browser WebGL/Leaflet canvas without downloading raw HDF/NetCDF binaries.",
  },
  {
    name: "MODIS Terra / Aqua (EOS AM-1 / PM-1)",
    url: "https://modis.gsfc.nasa.gov/",
    type: "Direct satellite radiometric observation",
    variables: "MOD09 / MYD09 Corrected Reflectance Bands 1, 4, 3 (TrueColor) and Bands 7, 2, 1 (Agricultural)",
    resolution: "250m – 500m optical nadir resolution",
    temporal: "Daily repeat cycle | 2000–present",
    auth: "Public WMTS streaming via NASA GIBS",
    note: "Agricultural Bands 7-2-1 render healthy crop canopies in vivid bright green, burn scars in red, bare soil in tan, and open water in black.",
  },
  {
    name: "GPM IMERG (Global Precipitation Measurement)",
    url: "https://gpm.nasa.gov/data/imerg",
    type: "Multi-satellite constellation precipitation estimate",
    variables: "IMERG_Precipitation_Rate_30min, Cumulative Rain (mm)",
    resolution: "0.1° (~11 km)",
    temporal: "Half-hourly & Monthly | 2000–present",
    auth: "Public WMTS streaming via NASA GIBS",
    note: "Integrated Multi-satellitE Retrievals for GPM. Fuses passive microwave and geostationary infrared sensor data.",
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
    formula: "Gamma distribution MLE fit → inverse standard normal transformation (90-day rolling)",
    ref: "McKee, Doesken & Kleist (1993), 8th Conference on Applied Climatology",
  },
  {
    label: "Biophysical Composite Stress Score",
    formula: "Score = (0.35 × SPI) + (0.30 × NDVI_anomaly) + (0.20 × Root_wetness) + (0.15 × Temp_anomaly) × 100",
    ref: "AGROSCOPE AI Explainable Heuristic Decision Engine",
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
    <div className="min-h-screen bg-[#f8faf5]">
      {/* Hero Header */}
      <div className="bg-linear-to-b from-[#0c1b12] via-[#12281a] to-[#183624] text-white py-12 px-4 sm:px-6 lg:px-8 border-b border-[#234b32]">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-emerald-500/20 border border-emerald-400/30 text-emerald-300">
                <Leaf className="h-5 w-5" />
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-300 bg-emerald-950/60 px-3 py-1 rounded-full border border-emerald-800/60">
                NASA Space Apps Challenge 2026
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-emerald-200/80">
              <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Problem #7: Field Shift &bull; Scientific Provenance &amp; System Architecture</span>
            </div>
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white mb-3">
            Methodology &amp; Scientific Architecture
          </h1>
          <p className="text-base text-emerald-100/90 max-w-3xl leading-relaxed">
            AGROSCOPE AI translates multi-mission NASA Earth observation data into actionable agricultural intelligence, empowering farmers and agronomists to anticipate climate shifts, optimize crop rotations, and conserve water.
          </p>
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Challenge Statement Card */}
        <div className="bg-white rounded-2xl p-6 border border-[#e2ece0] shadow-xs">
          <div className="flex items-center gap-2.5 text-[#2d7a3a] mb-3">
            <Award className="h-6 w-6" />
            <h2 className="text-lg font-bold text-[#1a2e1a]">
              The Mission: Problem #7 — Field Shift
            </h2>
          </div>
          <p className="text-sm text-[#4a6741] leading-relaxed">
            Farmers worldwide confront increasing operational complexity driven by shifting thermal zones, volatile precipitation regimes, groundwater depletion, and declining soil health. Deciding when and how to shift crop varieties requires synthesizing multi-decade NASA Earth observations, local soil hydrology, crop phenological requirements, and seasonal climate projections into clear, explainable, and accessible guidance.
          </p>
        </div>

        {/* NASA Datasets Section */}
        <div className="bg-white rounded-2xl p-6 border border-[#e2ece0] shadow-xs">
          <div className="flex items-center gap-2.5 text-[#2d7a3a] mb-6">
            <Database className="h-6 w-6" />
            <div>
              <h2 className="text-lg font-bold text-[#1a2e1a]">NASA Earth Observation Assets</h2>
              <p className="text-xs text-[#4a6741]">Direct data feeds and streaming services integrated into AGROSCOPE AI</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {datasets.map((d) => (
              <div key={d.name} className="p-5 rounded-xl border border-[#e2ece0] bg-[#f8faf7] flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="text-sm font-bold text-[#1a2e1a]">{d.name}</h3>
                    <a
                      href={d.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-[#1e6fa8] hover:underline flex items-center gap-1 font-medium shrink-0"
                    >
                      <span>Docs</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs mb-3 text-gray-600">
                    <div>
                      <span className="font-semibold text-gray-700">Type:</span> {d.type}
                    </div>
                    <div>
                      <span className="font-semibold text-gray-700">Resolution:</span> {d.resolution}
                    </div>
                    <div>
                      <span className="font-semibold text-gray-700">Temporal:</span> {d.temporal}
                    </div>
                    <div>
                      <span className="font-semibold text-gray-700">Auth:</span> {d.auth}
                    </div>
                  </div>
                  <div className="text-xs font-mono text-[#2d7a3a] bg-white border border-[#e2ece0] rounded-lg p-2.5 mb-3 break-all">
                    {d.variables}
                  </div>
                </div>
                <p className="text-xs text-amber-800 bg-amber-50/80 border border-amber-200/80 rounded-lg p-2.5 leading-relaxed">
                  {d.note}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Scientific Algorithms Section */}
        <div className="bg-white rounded-2xl p-6 border border-[#e2ece0] shadow-xs">
          <div className="flex items-center gap-2.5 text-[#2d7a3a] mb-6">
            <FlaskConical className="h-6 w-6" />
            <div>
              <h2 className="text-lg font-bold text-[#1a2e1a]">Scientific Formulas &amp; Algorithms</h2>
              <p className="text-xs text-[#4a6741]">Mathematical rigor and biophysical formulations</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {methods.map((m) => (
              <div key={m.label} className="p-4 rounded-xl border border-[#e2ece0] bg-[#f8faf7]">
                <div className="font-bold text-sm text-[#1a2e1a] mb-1.5">{m.label}</div>
                <code className="text-xs font-mono text-[#2d7a3a] bg-white border border-[#e2ece0] px-2.5 py-1.5 rounded-lg block mb-2 break-words">
                  {m.formula}
                </code>
                <div className="text-xs text-gray-500">
                  <span className="font-semibold text-gray-700">Citation:</span> {m.ref}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Technology Stack Grid */}
        <div className="bg-white rounded-2xl p-6 border border-[#e2ece0] shadow-xs">
          <div className="flex items-center gap-2.5 text-[#2d7a3a] mb-6">
            <Code2 className="h-6 w-6" />
            <div>
              <h2 className="text-lg font-bold text-[#1a2e1a]">System Architecture &amp; Tech Stack</h2>
              <p className="text-xs text-[#4a6741]">Full-stack implementation details</p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              {
                cat: "Frontend Layer",
                items: ["Next.js 16 (App Router)", "React 19", "TypeScript", "Tailwind CSS v4", "Recharts Visualizations", "Leaflet 1.9 & WMTS Tiles"],
              },
              {
                cat: "Backend Engine",
                items: ["Python 3.12", "FastAPI Asynchronous", "Uvicorn ASGI", "Pydantic v2 Models", "httpx Connection Pooling", "cachetools In-Memory Cache"],
              },
              {
                cat: "Scientific Analytics",
                items: ["NumPy Vectorized Ops", "Pandas Time-Series", "SciPy Gamma Distribution", "Savitzky-Golay Filter", "Geodesic Haversine / Shoelace"],
              },
              {
                cat: "NASA Integration",
                items: ["NASA POWER REST API", "NASA GIBS WMTS EPSG:3857", "MODIS Terra & Aqua", "GPM IMERG 30-min", "VIIRS NOAA-20 Reflectance"],
              },
            ].map((g) => (
              <div key={g.cat} className="p-4 rounded-xl border border-[#e2ece0] bg-[#f8faf7]">
                <h3 className="font-bold text-[#1a2e1a] mb-2.5 text-xs uppercase tracking-wider">{g.cat}</h3>
                <ul className="space-y-1.5">
                  {g.items.map((item) => (
                    <li key={item} className="text-xs text-[#4a6741] flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#2d7a3a]" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Assumptions & Limitations */}
        <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-6 shadow-xs">
          <div className="flex items-center gap-2.5 text-amber-800 mb-4">
            <ShieldAlert className="h-6 w-6 text-amber-600" />
            <h2 className="text-lg font-bold">Scientific Assumptions &amp; Operational Constraints</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-amber-900 leading-relaxed">
            {[
              "Spatial Resolution: NASA POWER spatial resolution (~55 km) provides regional atmospheric context; parcel-scale variations should be confirmed with ground sensors.",
              "Vegetation Proxy: The vegetation index in telemetry represents a calculated proxy; authentic direct optical views are streamed through the NASA GIBS satellite viewer.",
              "Composite Stress Score: The stress score is an explainable decision heuristic designed for comparative risk ranking, not a single certified government drought declaration.",
              "Agronomic Complexity: Suitability scores model climate, water balance, and thermal requirements; micro-nutrients, market prices, and pest pressures must be verified locally.",
              "Climate Scenarios: Farm Futures Lab simulations demonstrate sensitivity to biophysical shifts (+1.5°C, -20% rain) and do not represent deterministic weather forecasts.",
              "Continuous Data Continuity: When external NASA endpoints experience transient downtime, cached reference grids ensure mission continuity.",
            ].map((item, idx) => (
              <div key={idx} className="flex items-start gap-2 p-2 rounded-lg bg-amber-100/50">
                <span className="font-bold text-amber-700 mt-0.5">•</span>
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
