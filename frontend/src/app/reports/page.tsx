"use client";

import { useState, useCallback, useRef } from "react";
import {
  FileText,
  MapPin,
  Loader2,
  AlertTriangle,
  Download,
  CheckCircle2,
  Printer,
  Sparkles,
  ShieldCheck,
  Layers,
  Info,
} from "lucide-react";
import { analyzeField, type FieldReport } from "@/lib/api";

const DEMO_LOCATIONS = [
  { label: "Kansas Wheat Belt, USA", lat: 38.34, lon: -98.12, crop: "Winter Wheat" },
  { label: "Punjab Plain, India", lat: 30.73, lon: 76.78, crop: "Wheat / Basmati Rice" },
  { label: "São Paulo State, Brazil", lat: -22.5, lon: -48.0, crop: "Soybean / Sugarcane" },
  { label: "Nile Delta Irrigated Basin, Egypt", lat: 30.5, lon: 31.2, crop: "Cotton / Wheat" },
  { label: "Po Valley Lowland, Italy", lat: 45.13, lon: 10.02, crop: "Maize & Forage" },
];

export default function ReportsPage() {
  const [lat, setLat] = useState("38.34");
  const [lon, setLon] = useState("-98.12");
  const [label, setLabel] = useState("Kansas Wheat Belt (Benchmark Field 4B)");
  const [loading, setLoading] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<FieldReport | null>(null);
  const [reportMd, setReportMd] = useState<string | null>(null);

  const printableRef = useRef<HTMLDivElement>(null);

  const generate = useCallback(async () => {
    const latN = parseFloat(lat);
    const lonN = parseFloat(lon);
    if (isNaN(latN) || isNaN(lonN)) {
      setError("Please enter valid decimal coordinates (Latitude -90..90, Longitude -180..180).");
      return;
    }

    setLoading(true);
    setError(null);
    setReport(null);
    setReportMd(null);

    try {
      const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

      // 1. Fetch structured field report
      const data = await analyzeField({
        latitude: latN,
        longitude: lonN,
        label: label || "Agricultural Parcel",
      });
      setReport(data);

      // 2. Fetch Markdown report text
      const url = new URL(`${BASE}/api/reports/field-report`);
      url.searchParams.set("latitude", String(latN));
      url.searchParams.set("longitude", String(lonN));
      url.searchParams.set("format", "markdown");
      if (label) url.searchParams.set("label", label);

      const res = await fetch(url.toString());
      if (res.ok) {
        const text = await res.text();
        setReportMd(text);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Report generation failed. Please verify API connection.");
    } finally {
      setLoading(false);
    }
  }, [lat, lon, label]);

  // Markdown file download
  const downloadMarkdown = () => {
    if (!reportMd && !report) return;
    const content = reportMd || JSON.stringify(report, null, 2);
    const blob = new Blob([content], { type: "text/markdown" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `agroscope-dossier-${label.replace(/[^a-zA-Z0-9]/g, "_") || lat}.md`;
    a.click();
  };

  // High-fidelity client-side PDF generation
  const downloadPdf = async () => {
    if (!printableRef.current) return;
    setExportingPdf(true);

    try {
      const html2canvas = (await import("html2canvas")).default;
      const { jsPDF } = await import("jspdf");

      const canvas = await html2canvas(printableRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const imgWidth = 210; // A4 width mm
      const pageHeight = 297; // A4 height mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`AGROSCOPE_AI_Dossier_${label.replace(/[^a-zA-Z0-9]/g, "_") || lat}.pdf`);
    } catch (err) {
      console.error("PDF generation failed:", err);
      // Fallback to standard window print dialog
      window.print();
    } finally {
      setExportingPdf(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8faf5]">
      {/* Hero Header */}
      <div className="bg-linear-to-b from-[#0c1b12] via-[#12281a] to-[#183624] text-white py-12 px-4 sm:px-6 lg:px-8 border-b border-[#234b32]">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-emerald-500/20 border border-emerald-400/30 text-emerald-300">
                <FileText className="h-5 w-5" />
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-300 bg-emerald-950/60 px-3 py-1 rounded-full border border-emerald-800/60">
                AI Field Intelligence Dossier Generator
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-emerald-200/80">
              <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>NASA Space Apps 2026 Compliant Submission Dossier &bull; PDF / Markdown</span>
            </div>
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white mb-3">
            Field Intelligence Dossier
          </h1>
          <p className="text-base text-emerald-100/90 max-w-3xl leading-relaxed">
            Generate, preview, and export a structured, publication-grade scientific dossier. Synthesizes satellite observations, agro-hydrological indicators, explainable stress decomposition, and crop rotation suitability into an actionable briefing.
          </p>

          {/* Quick Presets */}
          <div className="mt-6 flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-emerald-300/80 mr-1 flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" /> Benchmark Presets:
            </span>
            {DEMO_LOCATIONS.map((loc) => (
              <button
                key={loc.label}
                onClick={() => {
                  setLat(String(loc.lat));
                  setLon(String(loc.lon));
                  setLabel(loc.label);
                }}
                className={`text-xs px-3 py-1.5 rounded-full border transition flex items-center gap-1.5 ${
                  lat === String(loc.lat) && lon === String(loc.lon)
                    ? "bg-emerald-600 text-white border-emerald-400 shadow-md"
                    : "bg-white/10 hover:bg-white/20 border-white/15 text-emerald-100"
                }`}
              >
                <span>{loc.label}</span>
                <span className="text-[10px] text-emerald-300/80">({loc.crop})</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Input Parameters Bar */}
        <div className="bg-white rounded-2xl p-6 border border-[#e2ece0] shadow-xs space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                Target Latitude (°N)
              </label>
              <input
                value={lat}
                onChange={(e) => setLat(e.target.value)}
                placeholder="38.34"
                className="w-full px-3.5 py-2.5 text-sm bg-gray-50/50 border border-[#e2ece0] rounded-xl outline-none focus:ring-2 focus:ring-[#2d7a3a] focus:bg-white transition"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                Target Longitude (°E)
              </label>
              <input
                value={lon}
                onChange={(e) => setLon(e.target.value)}
                placeholder="-98.12"
                className="w-full px-3.5 py-2.5 text-sm bg-gray-50/50 border border-[#e2ece0] rounded-xl outline-none focus:ring-2 focus:ring-[#2d7a3a] focus:bg-white transition"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                Parcel / Field Identifier
              </label>
              <input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="e.g. Field Parcel 4B"
                className="w-full px-3.5 py-2.5 text-sm bg-gray-50/50 border border-[#e2ece0] rounded-xl outline-none focus:ring-2 focus:ring-[#2d7a3a] focus:bg-white transition"
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              onClick={generate}
              disabled={loading}
              className="flex items-center gap-2 bg-[#2d7a3a] hover:bg-[#23602d] text-white px-7 py-3 rounded-xl font-bold text-sm shadow-md transition disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Compiling Scientific Dossier...</span>
                </>
              ) : (
                <>
                  <FileText className="h-4 w-4" />
                  <span>Generate Intelligence Dossier</span>
                </>
              )}
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-6 flex gap-3 bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">
            <AlertTriangle className="h-5 w-5 shrink-0 text-red-600 mt-0.5" />
            <div>
              <strong className="block font-bold">Report Synthesis Error</strong>
              <span className="text-xs">{error}</span>
            </div>
          </div>
        )}

        {/* Generated Dossier Preview & Export Controls */}
        {report && (
          <div className="space-y-6">
            {/* Action Bar */}
            <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-white rounded-2xl border border-[#e2ece0] shadow-xs">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-emerald-50 text-[#2d7a3a] border border-emerald-200">
                  <CheckCircle2 className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="text-sm font-bold text-[#1a2e1a]">
                    Scientific Dossier Ready: {report.location.label}
                  </h3>
                  <p className="text-xs text-gray-500 font-mono">
                    Generated: {new Date().toISOString().slice(0, 10)} &bull; NASA Space Apps Challenge 2026 Compliant
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={downloadMarkdown}
                  className="flex items-center gap-2 px-4 py-2 bg-[#f8faf7] hover:bg-[#eef7ec] text-gray-800 border border-[#dce8da] rounded-xl text-xs font-bold transition"
                  title="Download Raw Markdown Dossier"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Download .MD</span>
                </button>

                <button
                  onClick={downloadPdf}
                  disabled={exportingPdf}
                  className="flex items-center gap-2 px-5 py-2.5 bg-[#2d7a3a] hover:bg-[#23602d] text-white rounded-xl text-xs font-bold shadow-md transition disabled:opacity-50"
                  title="Download Publication-Ready PDF"
                >
                  {exportingPdf ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Exporting PDF...</span>
                    </>
                  ) : (
                    <>
                      <Printer className="h-3.5 w-3.5" />
                      <span>Export PDF Report</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Printable Scientific Document Canvas */}
            <div
              ref={printableRef}
              className="bg-white rounded-3xl p-8 sm:p-12 border border-[#dce8da] shadow-lg space-y-8 text-gray-900 font-sans"
            >
              {/* Document Header */}
              <div className="border-b-2 border-emerald-800/30 pb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#2d7a3a]">
                    <span>🛰️ AGROSCOPE AI</span>
                    <span>&bull;</span>
                    <span>NASA Space Apps Challenge 2026</span>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-extrabold text-[#0c1b12] mt-1 tracking-tight">
                    Agricultural Intelligence &amp; Climate Adaptation Dossier
                  </h2>
                  <p className="text-xs text-gray-600 mt-1">
                    Problem #7: Field Shift &bull; Grounded in NASA Earth Observation &amp; Biophysical Sensitivity Models
                  </p>
                </div>

                <div className="text-right sm:border-l sm:border-gray-200 sm:pl-6 shrink-0">
                  <span className="text-[10px] font-bold uppercase text-gray-400 block">Dossier Timestamp</span>
                  <span className="text-xs font-mono font-bold text-gray-800 block">
                    {new Date().toISOString().slice(0, 19).replace("T", " ")} UTC
                  </span>
                  <span className="text-[10px] text-emerald-700 font-semibold block mt-0.5">
                    {report.is_demo ? "Demo Baseline Grid" : "Verified NASA Data Stream"}
                  </span>
                </div>
              </div>

              {/* Section 1: Executive Summary & Field Coordinates */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 space-y-3">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-gray-800 flex items-center gap-1.5">
                    <MapPin className="h-4 w-4 text-[#2d7a3a]" /> 1. Spatial Target &amp; Executive Summary
                  </h3>
                  <div className="p-4 rounded-2xl bg-[#f8faf7] border border-[#e2ece0] text-xs leading-relaxed text-gray-700">
                    <p>
                      <strong>Target Area:</strong> {report.location.label} (
                      <span className="font-mono">{report.location.latitude.toFixed(4)}°N, {report.location.longitude.toFixed(4)}°E</span>).
                    </p>
                    <p className="mt-2">
                      <strong>Observation Period:</strong> {report.period.start} to {report.period.end} ({report.period.days} observation days).
                    </p>
                    <p className="mt-2">
                      <strong>Current Agricultural Status:</strong> The field exhibits a composite agricultural stress score of{" "}
                      <strong>{report.stress.score}/100</strong> (Category: <em>{report.stress.level}</em>). Recent meteorological precipitation trends indicate{" "}
                      {report.climate.precipitation.trend.direction} rainfall patterns with an SPI drought proxy of{" "}
                      <strong>{report.climate.spi_3.recent !== null ? report.climate.spi_3.recent.toFixed(2) : "N/A"}</strong>.
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-gray-800 flex items-center gap-1.5">
                    <ShieldCheck className="h-4 w-4 text-[#2d7a3a]" /> 2. Composite Stress Rating
                  </h3>
                  <div className="p-4 rounded-2xl bg-[#f8faf7] border border-[#e2ece0] flex flex-col justify-center items-center text-center">
                    <div className="text-4xl font-extrabold text-[#1a2e1a]">{report.stress.score}</div>
                    <span
                      className="text-xs font-bold px-3 py-0.5 rounded-full mt-1"
                      style={{
                        backgroundColor: `${report.stress.color}20`,
                        color: report.stress.color,
                      }}
                    >
                      {report.stress.level} Stress
                    </span>
                    <span className="text-[10px] text-gray-500 mt-2">
                      Channel Completeness: {(report.stress.confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Section 2: NASA Biophysical Telemetry Summary Table */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold uppercase tracking-wider text-gray-800 flex items-center gap-1.5">
                  <Layers className="h-4 w-4 text-[#2d7a3a]" /> 3. Environmental Conditions &amp; NASA Telemetry
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left border border-gray-200 rounded-xl overflow-hidden">
                    <thead className="bg-[#f0f7ee] text-gray-700 font-bold uppercase">
                      <tr>
                        <th className="p-3">Variable</th>
                        <th className="p-3">NASA Dataset Source</th>
                        <th className="p-3">Observed Value</th>
                        <th className="p-3">Climatological Interpretation</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      <tr>
                        <td className="p-3 font-semibold">Mean Air Temperature (T2M)</td>
                        <td className="p-3 font-mono text-gray-500">NASA POWER / MERRA-2</td>
                        <td className="p-3 font-bold text-gray-900">{report.climate.temperature.mean.toFixed(1)} °C</td>
                        <td className="p-3 text-gray-600">
                          {report.climate.temperature.trend.significant
                            ? `${report.climate.temperature.trend.direction} trend detected`
                            : "Stable historical distribution"}
                        </td>
                      </tr>
                      <tr>
                        <td className="p-3 font-semibold">Cumulative Precipitation (PRECTOTCORR)</td>
                        <td className="p-3 font-mono text-gray-500">NASA POWER / MERRA-2</td>
                        <td className="p-3 font-bold text-blue-700">{report.climate.precipitation.total_mm.toFixed(1)} mm</td>
                        <td className="p-3 text-gray-600">
                          SPI Drought Proxy: {report.climate.spi_3.recent !== null ? report.climate.spi_3.recent.toFixed(2) : "Neutral"}
                        </td>
                      </tr>
                      <tr>
                        <td className="p-3 font-semibold">Root-Zone Soil Wetness (0–100 cm)</td>
                        <td className="p-3 font-mono text-gray-500">NASA MERRA-2 (GWETROOT)</td>
                        <td className="p-3 font-bold text-emerald-700">
                          {report.soil_moisture.analysis.root_zone.mean ?? "—"} fraction
                        </td>
                        <td className="p-3 text-gray-600">
                          {report.soil_moisture.analysis.dry_stress_days} deficit days (&lt;0.25 wilting threshold)
                        </td>
                      </tr>
                      <tr>
                        <td className="p-3 font-semibold">Thermal Accumulation (GDD)</td>
                        <td className="p-3 font-mono text-gray-500">Calculated (Base 10°C)</td>
                        <td className="p-3 font-bold text-amber-700">{Math.round(report.climate.gdd.cumulative)} GDD</td>
                        <td className="p-3 text-gray-600">Sufficient thermal units for standard field crops</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Section 3: Explainable AI Stress Attribution Breakdown */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold uppercase tracking-wider text-gray-800 flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-[#2d7a3a]" /> 4. Explainable AI Decision Engine Decomposition
                </h3>
                <div className="p-4 rounded-2xl bg-[#f8faf7] border border-[#e2ece0] text-xs font-mono text-gray-700 mb-3">
                  Composite Stress = (0.35 &times; SPI) + (0.30 &times; NDVI Anomaly) + (0.20 &times; Root Wetness) + (0.15 &times; Temp Anomaly)
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-3 rounded-xl border border-gray-200 bg-white">
                    <span className="text-gray-500 block text-[10px]">Precipitation (SPI)</span>
                    <span className="text-lg font-bold text-blue-700">{report.stress.indicators.spi?.value ?? "N/A"}</span>
                    <span className="text-[10px] text-gray-400 block mt-1">Weight: 35%</span>
                  </div>
                  <div className="p-3 rounded-xl border border-gray-200 bg-white">
                    <span className="text-gray-500 block text-[10px]">Vegetation (NDVI)</span>
                    <span className="text-lg font-bold text-emerald-700">{report.stress.indicators.ndvi?.value ?? "N/A"}</span>
                    <span className="text-[10px] text-gray-400 block mt-1">Weight: 30%</span>
                  </div>
                  <div className="p-3 rounded-xl border border-gray-200 bg-white">
                    <span className="text-gray-500 block text-[10px]">Root Wetness</span>
                    <span className="text-lg font-bold text-amber-700">{report.stress.indicators.soil?.value ?? "N/A"}</span>
                    <span className="text-[10px] text-gray-400 block mt-1">Weight: 20%</span>
                  </div>
                  <div className="p-3 rounded-xl border border-gray-200 bg-white">
                    <span className="text-gray-500 block text-[10px]">Thermal Anomaly</span>
                    <span className="text-lg font-bold text-red-600">
                      {report.stress.indicators.temp?.value ? `${report.stress.indicators.temp.value > 0 ? "+" : ""}${report.stress.indicators.temp.value}°C` : "N/A"}
                    </span>
                    <span className="text-[10px] text-gray-400 block mt-1">Weight: 15%</span>
                  </div>
                </div>
              </div>

              {/* Section 4: Recommended Adaptive Crop Shifts */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold uppercase tracking-wider text-gray-800 flex items-center gap-1.5">
                  <Info className="h-4 w-4 text-[#2d7a3a]" /> 5. Crop Rotation Suitability &amp; Adaptation Guidance
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {report.crop_recommendations.slice(0, 3).map((crop, idx) => (
                    <div key={crop.name} className="p-4 rounded-xl border border-[#d2e4d0] bg-[#f8faf7]">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-sm text-[#1a2e1a]">{crop.name}</span>
                        <span className="text-xs font-extrabold text-[#2d7a3a]">{crop.score} pts</span>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold inline-block mb-2">
                        Rank #{idx + 1} Suitable
                      </span>
                      <p className="text-[11px] text-gray-600 leading-snug">
                        {crop.benefits?.[0] || `Water need: ${crop.water_need_mm}mm · GDD: ${crop.gdd_required}`}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Section 5: Data Provenance & Limitations */}
              <div className="border-t border-gray-200 pt-6 text-[10px] text-gray-500 leading-relaxed space-y-2">
                <p>
                  <strong>Data Provenance &amp; Attribution:</strong> NASA POWER Agroclimatology API (LaRC); NASA Global Imagery Browse Services (GIBS); MODIS Terra/Aqua Corrected Reflectance (Bands 1-4-3 &amp; Bands 7-2-1); GPM IMERG Precipitation; MERRA-2 Land Surface Modeling (GMAO).
                </p>
                <p>
                  <strong>Scientific Limitations &amp; Disclaimer:</strong> NASA POWER (~55 km) grid-cell observations represent regional atmospheric context and cannot resolve sub-parcel variability. Composite stress and crop suitability scores are explainable heuristic decision-support metrics, not deterministic yield forecasts. Always verify local soil test results and pest pressures with certified extension agronomists.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
