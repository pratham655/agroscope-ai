"use client";

import { useState, useCallback, useEffect } from "react";
import dynamic from "next/dynamic";
import {
  ScanEye,
  Download,
  AlertTriangle,
  Layers,
  Compass,
  ShieldCheck,
  Globe2,
} from "lucide-react";
import { compareChangeDetection, type ChangeDetectionResult } from "@/lib/api";
import { useLocation } from "@/context/LocationContext";

const SynchronizedChangeMap = dynamic(() => import("@/components/SynchronizedChangeMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[400px] rounded-xl bg-slate-900 flex flex-col items-center justify-center text-slate-300 gap-2 border border-slate-700">
      <Globe2 className="h-8 w-8 text-emerald-400 animate-spin" />
      <div className="text-xs font-semibold text-white">
        Aligning Synchronized Dual Orbital Satellites...
      </div>
      <div className="text-[10px] text-slate-400 font-mono">NASA GIBS MODIS Terra / Aqua Orthorectification</div>
    </div>
  ),
});

const PRESET_COMPARISONS = [
  {
    label: "Kansas Drought vs Recovery",
    subtitle: "2022 Summer vs 2023 Summer",
    lat: 38.34,
    lon: -98.12,
    date1: "2022-07-15",
    date2: "2023-07-15",
  },
  {
    label: "Punjab Pre vs Post Monsoon",
    subtitle: "May Dry Sowing vs Sept Rice Canopy",
    lat: 30.73,
    lon: 76.78,
    date1: "2023-05-15",
    date2: "2023-09-15",
  },
  {
    label: "São Paulo Dry vs Wet Season",
    subtitle: "July Winter vs Dec Summer",
    lat: -22.5,
    lon: -48.0,
    date1: "2023-07-01",
    date2: "2023-12-01",
  },
  {
    label: "California Central Valley",
    subtitle: "2022 Drought vs 2023 Atmospheric River",
    lat: 36.75,
    lon: -119.77,
    date1: "2022-06-15",
    date2: "2023-06-15",
  },
];

export default function ChangeDetectivePage() {
  const { currentLocation } = useLocation();
  const [lat, setLat] = useState(() => (currentLocation ? String(currentLocation.latitude) : "38.34"));
  const [lon, setLon] = useState(() => (currentLocation ? String(currentLocation.longitude) : "-98.12"));
  const [date1, setDate1] = useState("2022-07-15");
  const [date2, setDate2] = useState("2023-07-15");
  const windowDays = 30;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ChangeDetectionResult | null>(null);

  useEffect(() => {
    if (currentLocation && typeof currentLocation.latitude === "number" && typeof currentLocation.longitude === "number") {
      setLat(String(currentLocation.latitude));
      setLon(String(currentLocation.longitude));
    }
  }, [currentLocation]);

  const runComparison = useCallback(async () => {
    const latN = parseFloat(lat);
    const lonN = parseFloat(lon);
    if (isNaN(latN) || isNaN(lonN)) {
      setError("Please enter valid latitude and longitude coordinates.");
      return;
    }
    if (date1 === date2) {
      setError("Comparison dates must be different.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await compareChangeDetection({
        latitude: latN,
        longitude: lonN,
        date1,
        date2,
        windowDays,
      });
      setResult(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to execute change detection comparison.");
    } finally {
      setLoading(false);
    }
  }, [lat, lon, date1, date2, windowDays]);

  useEffect(() => {
    runComparison();
  }, [runComparison]);

  const setPreset = (preset: (typeof PRESET_COMPARISONS)[0]) => {
    setLat(String(preset.lat));
    setLon(String(preset.lon));
    setDate1(preset.date1);
    setDate2(preset.date2);
  };

  const downloadCSV = () => {
    if (!result) return;
    const headers = ["Indicator", "Period 1 Value", "Period 2 Value", "Delta", "Direction"];
    const rows = result.comparison_table.map((r) => [
      `"${r.indicator}"`,
      r.period1_value ?? "",
      r.period2_value ?? "",
      r.delta ?? "",
      `"${r.direction}"`,
    ]);
    const csvContent =
      "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `agroscope_change_detection_${date1}_vs_${date2}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-8 py-5 space-y-5">
      {/* ── Top Bar: Page Header ────────────────────────────────────── */}
      <div className="bg-white rounded-xl p-4 sm:p-5 border border-slate-200 shadow-2xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-[#0d3b2e] text-emerald-400">
              <ScanEye className="h-4 w-4" />
            </span>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              Satellite Change Detective
            </h1>
            <span className="text-[10px] font-semibold uppercase text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              Multi-Epoch Differential Audit
            </span>
          </div>
          <p className="text-xs text-slate-500 max-w-3xl leading-relaxed">
            Synchronized comparative satellite imagery and biophysical telemetry across two observation epochs.
            Isolate drought degradation, vegetation recovery, hydrothermal anomalies, and phenological shifts.
          </p>
        </div>

        <button
          onClick={runComparison}
          disabled={loading}
          className="flex items-center gap-2 px-5 py-2 rounded-md bg-[#0d3b2e] hover:bg-[#134e39] text-white text-xs font-semibold shadow-2xs transition disabled:opacity-50 cursor-pointer shrink-0"
        >
          {loading ? (
            <>
              <Globe2 className="h-3.5 w-3.5 animate-spin text-emerald-400" />
              <span>Synchronizing Imagery...</span>
            </>
          ) : (
            <>
              <ScanEye className="h-3.5 w-3.5 text-emerald-400" />
              <span>Execute Multi-Epoch Audit</span>
            </>
          )}
        </button>
      </div>

      {/* ── Configuration Console ────────────────────────────────────── */}
      <div className="bg-white rounded-xl p-4 sm:p-5 border border-slate-200 shadow-2xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
          <span className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
            <Compass className="w-3.5 h-3.5 text-[#0d3b2e]" />
            <span>Epoch &amp; Coordinate Configuration</span>
          </span>
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] uppercase font-bold text-slate-400 mr-1">Case Studies:</span>
            {PRESET_COMPARISONS.map((preset) => (
              <button
                key={preset.label}
                onClick={() => setPreset(preset)}
                className={`text-[11px] px-2 py-0.5 rounded-md border transition ${
                  lat === String(preset.lat) && date1 === preset.date1 && date2 === preset.date2
                    ? "bg-[#0d3b2e] text-white border-[#0d3b2e]"
                    : "border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700"
                }`}
              >
                {preset.label.split(" ")[0]}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
              Target Latitude
            </label>
            <input
              type="number"
              step="0.0001"
              value={lat}
              onChange={(e) => setLat(e.target.value)}
              className="w-full px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-md outline-none focus:border-[#0d3b2e] focus:bg-white transition"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
              Target Longitude
            </label>
            <input
              type="number"
              step="0.0001"
              value={lon}
              onChange={(e) => setLon(e.target.value)}
              className="w-full px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-md outline-none focus:border-[#0d3b2e] focus:bg-white transition"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
              Epoch 1 (Baseline Date)
            </label>
            <input
              type="date"
              value={date1}
              onChange={(e) => setDate1(e.target.value)}
              className="w-full px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-md outline-none focus:border-[#0d3b2e] focus:bg-white transition"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
              Epoch 2 (Comparison Date)
            </label>
            <input
              type="date"
              value={date2}
              onChange={(e) => setDate2(e.target.value)}
              className="w-full px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-md outline-none focus:border-[#0d3b2e] focus:bg-white transition"
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

      {/* ── Synchronized Dual-Orbital Swath Map ──────────────────────── */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-[#0d3b2e]" />
            <span>Synchronized Dual-Swath Satellite Viewports</span>
          </h2>
          <span className="text-[10px] text-slate-500 font-mono hidden sm:inline">
            Both viewports pan and zoom synchronously in real time
          </span>
        </div>

        <SynchronizedChangeMap
          latitude={parseFloat(lat) || 38.34}
          longitude={parseFloat(lon) || -98.12}
          date1={date1}
          date2={date2}
          period1Label="Epoch 1 Baseline"
          period2Label="Epoch 2 Comparison"
        />
      </div>

      {/* ── Comparative Findings Table & Narrative ───────────────────── */}
      {result && (
        <div className="space-y-4">
          <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 uppercase tracking-wider">
              <ShieldCheck className="w-3.5 h-3.5 text-[#0d3b2e]" />
              <span>Biophysical Change Synthesis</span>
            </div>
            <p className="text-xs text-slate-700 leading-relaxed font-medium">
              {result.narrative}
            </p>
          </div>

          <div className="bg-white rounded-xl p-4 sm:p-5 border border-slate-200 shadow-2xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
              <div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Differential Telemetry Matrix ({date1} vs {date2})
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Quantified shifts across NASA POWER meteorological indicators and biophysical proxies.
                </p>
              </div>

              <button
                onClick={downloadCSV}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-800 border border-slate-200 font-semibold text-xs rounded-md transition"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" />
                <span>Export CSV</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-600 uppercase font-semibold text-[10px] border-b border-slate-200">
                  <tr>
                    <th className="p-2.5">Biophysical Indicator</th>
                    <th className="p-2.5">Epoch 1 ({date1})</th>
                    <th className="p-2.5">Epoch 2 ({date2})</th>
                    <th className="p-2.5">Observed Shift (&Delta;)</th>
                    <th className="p-2.5">Directional Impact</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                  {result.comparison_table.map((row) => (
                    <tr key={row.indicator} className="hover:bg-slate-50/60 transition">
                      <td className="p-2.5 font-bold font-sans text-slate-900">{row.indicator}</td>
                      <td className="p-2.5 text-slate-600">{row.period1_value ?? "—"}</td>
                      <td className="p-2.5 font-bold text-slate-900">{row.period2_value ?? "—"}</td>
                      <td className="p-2.5 font-bold text-[#0d3b2e]">{row.delta ?? "—"}</td>
                      <td className="p-2.5 font-sans">
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                          {row.direction}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
