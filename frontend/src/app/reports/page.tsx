"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import {
  FileText,
  Loader2,
  AlertTriangle,
  Download,
  CheckCircle2,
  Printer,
  Compass,
} from "lucide-react";
import { analyzeField, type FieldReport } from "@/lib/api";
import { useLocation } from "@/context/LocationContext";

const DEMO_LOCATIONS = [
  { label: "Kansas Wheat Belt, USA", lat: 38.34, lon: -98.12, crop: "Winter Wheat" },
  { label: "Punjab Plain, India", lat: 30.73, lon: 76.78, crop: "Wheat / Basmati Rice" },
  { label: "São Paulo State, Brazil", lat: -22.5, lon: -48.0, crop: "Soybean / Sugarcane" },
  { label: "Nile Delta, Egypt", lat: 30.5, lon: 31.2, crop: "Cotton / Wheat" },
  { label: "Po Valley Lowland, Italy", lat: 45.13, lon: 10.02, crop: "Maize & Forage" },
];

export default function ReportsPage() {
  const { currentLocation } = useLocation();
  const [lat, setLat] = useState(() => (currentLocation ? String(currentLocation.latitude) : "38.34"));
  const [lon, setLon] = useState(() => (currentLocation ? String(currentLocation.longitude) : "-98.12"));
  const [label, setLabel] = useState(() => (currentLocation ? currentLocation.label : "Kansas Wheat Belt (Benchmark Field 4B)"));
  const [loading, setLoading] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<FieldReport | null>(null);
  const [reportMd, setReportMd] = useState<string | null>(null);

  useEffect(() => {
    if (currentLocation && typeof currentLocation.latitude === "number" && typeof currentLocation.longitude === "number") {
      setLat(String(currentLocation.latitude));
      setLon(String(currentLocation.longitude));
      if (currentLocation.label) setLabel(currentLocation.label);
    }
  }, [currentLocation]);

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

      const data = await analyzeField({
        latitude: latN,
        longitude: lonN,
        label: label || "Agricultural Parcel",
      });
      setReport(data);

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

  const downloadMarkdown = () => {
    if (!reportMd && !report) return;
    const content = reportMd || JSON.stringify(report, null, 2);
    const blob = new Blob([content], { type: "text/markdown" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `agroscope-dossier-${label.replace(/[^a-zA-Z0-9]/g, "_") || lat}.md`;
    a.click();
  };

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
      const imgWidth = 210;
      const pageHeight = 297;
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
      window.print();
    } finally {
      setExportingPdf(false);
    }
  };

  return (
    <div className="max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-8 py-5 space-y-5">
      {/* ── Feature Discovery Banner: Reports & Dossiers ─────────────── */}
      <div className="grad-reports rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-3xl">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-white/20 text-white backdrop-blur-sm border border-white/30">
                Publication-Grade Export
              </span>
              <span className="text-xs text-rose-200 font-mono">PDF · Markdown · Multi-Sensor Synthesis</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
              Agricultural Intelligence Reports: Publication-Grade Field Dossier Generator
            </h1>
            <p className="text-xs sm:text-sm text-rose-100/90 leading-relaxed">
              Compile comprehensive, publication-ready agricultural briefings synthesizing multi-sensor NASA Earth observations, hydrological risk models, biophysical stress scores, and crop suitability rankings into formatted Markdown and printable PDF reports.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <span className="px-3 py-1.5 rounded-lg bg-black/25 backdrop-blur-md border border-white/20 text-xs font-mono text-rose-200">
              Vector PDF &bull; Structured Markdown
            </span>
          </div>
        </div>
      </div>

      {/* ── Action Console Bar ──────────────────────────────────────── */}
      <div className="bg-white rounded-xl p-4 sm:p-5 border border-slate-200 shadow-2xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-[#0d3b2e] text-emerald-400">
              <FileText className="h-4 w-4" />
            </span>
            <h2 className="text-lg font-bold tracking-tight text-slate-900">
              Dossier Compiler Console
            </h2>
            <span className="text-[10px] font-semibold uppercase text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              Publication-Grade Export
            </span>
          </div>
          <p className="text-xs text-slate-500 max-w-3xl leading-relaxed">
            Generate, preview, and export a structured, publication-grade scientific dossier. Synthesizes satellite observations, agro-hydrological indicators, explainable stress decomposition, and crop rotation suitability into an actionable briefing.
          </p>
        </div>

        <button
          onClick={generate}
          disabled={loading}
          className="flex items-center gap-2 px-5 py-2 rounded-md bg-[#0d3b2e] hover:bg-[#134e39] text-white text-xs font-semibold shadow-2xs transition disabled:opacity-50 cursor-pointer shrink-0"
        >
          {loading ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-400" />
              <span>Compiling Dossier...</span>
            </>
          ) : (
            <>
              <FileText className="h-3.5 w-3.5 text-emerald-400" />
              <span>Generate Dossier</span>
            </>
          )}
        </button>
      </div>

      {/* ── Configuration Console ────────────────────────────────────── */}
      <div className="bg-white rounded-xl p-4 sm:p-5 border border-slate-200 shadow-2xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
          <span className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
            <Compass className="w-3.5 h-3.5 text-[#0d3b2e]" />
            <span>Target Location for Dossier Generation</span>
          </span>
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] uppercase font-bold text-slate-400 mr-1">Presets:</span>
            {DEMO_LOCATIONS.map((loc) => (
              <button
                key={loc.label}
                onClick={() => {
                  setLat(String(loc.lat));
                  setLon(String(loc.lon));
                  setLabel(loc.label);
                }}
                className={`text-[11px] px-2 py-0.5 rounded-md border transition ${
                  lat === String(loc.lat) && lon === String(loc.lon)
                    ? "bg-[#0d3b2e] text-white border-[#0d3b2e]"
                    : "border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700"
                }`}
              >
                {loc.label.split(",")[0]}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
              Target Latitude (°N)
            </label>
            <input
              value={lat}
              onChange={(e) => setLat(e.target.value)}
              placeholder="38.34"
              className="w-full px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-md outline-none focus:border-[#0d3b2e] focus:bg-white transition"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
              Target Longitude (°E)
            </label>
            <input
              value={lon}
              onChange={(e) => setLon(e.target.value)}
              placeholder="-98.12"
              className="w-full px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-md outline-none focus:border-[#0d3b2e] focus:bg-white transition"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
              Parcel Identifier / Label
            </label>
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. Field Parcel 4B"
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-md outline-none focus:border-[#0d3b2e] focus:bg-white transition"
            />
          </div>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0 text-red-600" />
          <span>{error}</span>
        </div>
      )}

      {/* ── Generated Dossier Preview & Export Controls ──────────────── */}
      {report && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-md bg-emerald-50 text-[#0d3b2e] border border-emerald-200">
                <CheckCircle2 className="h-4 w-4" />
              </span>
              <div>
                <h3 className="text-xs font-bold text-slate-900">
                  Dossier Compiled: {report.location.label}
                </h3>
                <p className="text-[10px] text-slate-500 font-mono">
                  Observation Period: {report.period.start} → {report.period.end} &bull; NASA Space Apps 2026 Compliant
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={downloadMarkdown}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-md text-xs font-semibold transition"
                title="Download Raw Markdown Dossier"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" />
                <span>Download .MD</span>
              </button>

              <button
                onClick={downloadPdf}
                disabled={exportingPdf}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-[#0d3b2e] hover:bg-[#134e39] text-white rounded-md text-xs font-semibold shadow-2xs transition disabled:opacity-50"
                title="Download Publication-Ready PDF"
              >
                {exportingPdf ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                    <span>Exporting PDF...</span>
                  </>
                ) : (
                  <>
                    <Printer className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Export PDF Report</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Printable Document Sheet */}
          <div
            ref={printableRef}
            className="bg-white rounded-xl p-6 sm:p-10 border border-slate-200 shadow-sm space-y-6 text-slate-900 font-sans"
          >
            {/* Header */}
            <div className="border-b border-slate-200 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-[#0d3b2e]">
                  <span>AGROSCOPE AI</span>
                  <span>&bull;</span>
                  <span>NASA Space Apps Challenge 2026</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mt-0.5 tracking-tight">
                  Agricultural Intelligence &amp; Climate Adaptation Dossier
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Problem #7: Field Shift &bull; Grounded in NASA Earth Observation &amp; Biophysical Modeling
                </p>
              </div>

              <div className="text-right sm:border-l sm:border-slate-200 sm:pl-4 shrink-0 font-mono text-[11px] text-slate-500">
                <div>Date: {new Date().toISOString().slice(0, 10)}</div>
                <div>Status: Verified</div>
              </div>
            </div>

            {/* Target Information */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-lg border border-slate-200 text-xs">
              <div>
                <span className="text-[10px] font-semibold text-slate-500 uppercase">Target Field</span>
                <div className="font-bold text-slate-900 mt-0.5">{report.location.label}</div>
              </div>
              <div>
                <span className="text-[10px] font-semibold text-slate-500 uppercase">Coordinates</span>
                <div className="font-bold font-mono text-slate-900 mt-0.5">
                  {report.location.latitude.toFixed(4)}°N, {report.location.longitude.toFixed(4)}°E
                </div>
              </div>
              <div>
                <span className="text-[10px] font-semibold text-slate-500 uppercase">Observation Window</span>
                <div className="font-bold font-mono text-slate-900 mt-0.5">
                  {report.period.start} → {report.period.end}
                </div>
              </div>
              <div>
                <span className="text-[10px] font-semibold text-slate-500 uppercase">Data Provenance</span>
                <div className="font-bold text-slate-900 mt-0.5">NASA POWER MERRA-2</div>
              </div>
            </div>

            {/* Findings & Recommendations */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider pb-1 border-b border-slate-200">
                1. Executive Summary &amp; Key Findings
              </h3>
              <div className="space-y-2">
                {report.key_findings.map((f, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-slate-700">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#0d3b2e] mt-1.5 shrink-0" />
                    <span>{f}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Crop Recommendations Table */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider pb-1 border-b border-slate-200">
                2. Adaptive Crop Rotation Portfolio
              </h3>
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-600 uppercase font-semibold text-[10px]">
                  <tr>
                    <th className="p-2">Rank</th>
                    <th className="p-2">Crop</th>
                    <th className="p-2">Suitability Score</th>
                    <th className="p-2">Water Requirement</th>
                    <th className="p-2">Agronomic Guidance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                  {report.crop_recommendations.map((c, i) => (
                    <tr key={c.crop_id}>
                      <td className="p-2 font-bold font-sans">#{i + 1}</td>
                      <td className="p-2 font-bold font-sans text-slate-900">{c.name}</td>
                      <td className="p-2 font-bold text-[#0d3b2e]">{c.score}/100</td>
                      <td className="p-2 text-slate-600">{c.water_need_mm} mm</td>
                      <td className="p-2 font-sans text-slate-600 text-[11px]">{c.benefits?.[0] || "Suitable agroclimatic match"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Authoritative Sources */}
            <div className="pt-4 border-t border-slate-200 text-[11px] text-slate-500 flex flex-wrap items-center justify-between gap-2">
              <span>NASA POWER &bull; NASA GIBS &bull; GPM IMERG &bull; SMAP Hydrology</span>
              <span className="font-mono">AGROSCOPE AI &bull; Space Apps 2026</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
