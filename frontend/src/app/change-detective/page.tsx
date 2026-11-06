"use client";

import { useState, useCallback } from "react";
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

const SynchronizedChangeMap = dynamic(() => import("@/components/SynchronizedChangeMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[400px] rounded-3xl bg-[#0f1f14] animate-pulse flex flex-col items-center justify-center text-white/60 gap-3 border border-[#d2e4d0]">
      <Globe2 className="h-10 w-10 text-[#86efac] animate-spin" />
      <div className="text-sm font-bold text-white tracking-wide">
        Aligning Synchronized Dual Orbital Satellites...
      </div>
      <div className="text-xs text-white/50">NASA GIBS MODIS Terra / Aqua Orthorectification</div>
    </div>
  ),
});

const PRESET_COMPARISONS = [
  {
    label: "Kansas Severe Drought vs Post-Rainfall",
    subtitle: "2022 Mega-Drought vs 2023 Normal Summer",
    lat: 38.34,
    lon: -98.12,
    date1: "2022-07-15",
    date2: "2023-07-15",
  },
  {
    label: "Punjab Pre-Monsoon vs Post-Monsoon",
    subtitle: "Dry May Sowing vs Peak September Rice Canopy",
    lat: 30.73,
    lon: 76.78,
    date1: "2023-05-15",
    date2: "2023-09-15",
  },
  {
    label: "São Paulo Dry Winter vs Peak Wet Summer",
    subtitle: "Cerrado Dry Spell vs Intensive Vegetative Season",
    lat: -22.5,
    lon: -48.0,
    date1: "2023-07-01",
    date2: "2023-12-01",
  },
  {
    label: "California Central Valley Drought vs Atmospheric River",
    subtitle: "Winter 2022 Dry Baseline vs 2023 Heavy Snowmelt Recovery",
    lat: 36.75,
    lon: -119.77,
    date1: "2022-06-15",
    date2: "2023-06-15",
  },
];

export default function ChangeDetectivePage() {
  const [lat, setLat] = useState("38.34");
  const [lon, setLon] = useState("-98.12");
  const [date1, setDate1] = useState("2022-07-15");
  const [date2, setDate2] = useState("2023-07-15");
  const windowDays = 30;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ChangeDetectionResult | null>(null);

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
      setError(e instanceof Error ? e.message : "Failed to execute change comparison.");
    } finally {
      setLoading(false);
    }
  }, [lat, lon, date1, date2, windowDays]);

  const setPreset = (preset: typeof PRESET_COMPARISONS[0]) => {
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header Banner */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#dce8da] shadow-xs relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-purple-500/10 via-[#2d7a3a]/5 to-transparent rounded-full blur-2xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-50 border border-purple-200 text-xs font-bold text-purple-800">
              <ScanEye className="h-3.5 w-3.5" />
              <span>Multi-Temporal Earth Observation &amp; Biophysical Audit</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-[#1a2e1a] tracking-tight">
              Satellite Change Detective
            </h1>
            <p className="text-sm sm:text-base text-[#4a6741] leading-relaxed">
              Synchronized comparative satellite imagery and biophysical telemetry across two observation epochs.
              Isolate drought degradation, vegetation recovery, hydrothermal anomalies, and phenological shifts.
            </p>
          </div>

          <button
            onClick={runComparison}
            disabled={loading}
            className="inline-flex items-center gap-2 px-6 py-3.5 bg-[#2d7a3a] hover:bg-[#23602d] text-white font-bold text-sm rounded-2xl shadow-md shadow-[#2d7a3a]/20 transition disabled:opacity-50 shrink-0"
          >
            {loading ? (
              <>
                <Globe2 className="h-4 w-4 animate-spin" />
                <span>Synchronizing Imagery...</span>
              </>
            ) : (
              <>
                <ScanEye className="h-4 w-4" />
                <span>Execute Multi-Epoch Audit</span>
              </>
            )}
          </button>
        </div>

        {/* Preset Case Studies */}
        <div className="pt-6 mt-6 border-t border-[#eef4ed] space-y-2">
          <span className="text-xs font-bold text-gray-500 flex items-center gap-1">
            <Compass className="h-3.5 w-3.5 text-[#2d7a3a]" /> Climatological Case Studies:
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
            {PRESET_COMPARISONS.map((preset) => (
              <button
                key={preset.label}
                onClick={() => setPreset(preset)}
                className={`p-3 text-left rounded-2xl border transition text-xs space-y-1 ${
                  lat === String(preset.lat) && date1 === preset.date1 && date2 === preset.date2
                    ? "bg-[#2d7a3a] text-white border-[#2d7a3a] shadow-xs"
                    : "bg-[#f8faf7] text-gray-800 border-[#dce8da] hover:bg-[#eef7ec]"
                }`}
              >
                <div className="font-bold truncate">{preset.label}</div>
                <div
                  className={`text-[10px] truncate ${
                    lat === String(preset.lat) && date1 === preset.date1 && date2 === preset.date2
                      ? "text-green-100"
                      : "text-gray-500"
                  }`}
                >
                  {preset.subtitle}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Control Strip */}
      <div className="bg-white rounded-3xl p-6 border border-[#dce8da] shadow-xs space-y-4">
        <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
          Spatial &amp; Temporal Epoch Configuration
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Target Latitude</label>
            <input
              type="number"
              step="0.0001"
              value={lat}
              onChange={(e) => setLat(e.target.value)}
              className="w-full px-3 py-2 text-xs font-mono bg-[#fbfdfb] border border-[#d2e4d0] rounded-xl outline-none focus:border-[#2d7a3a]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Target Longitude</label>
            <input
              type="number"
              step="0.0001"
              value={lon}
              onChange={(e) => setLon(e.target.value)}
              className="w-full px-3 py-2 text-xs font-mono bg-[#fbfdfb] border border-[#d2e4d0] rounded-xl outline-none focus:border-[#2d7a3a]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Epoch 1 (Baseline Date)</label>
            <input
              type="date"
              value={date1}
              onChange={(e) => setDate1(e.target.value)}
              className="w-full px-3 py-2 text-xs font-bold bg-[#fbfdfb] border border-[#d2e4d0] rounded-xl outline-none focus:border-[#2d7a3a]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Epoch 2 (Comparison Date)</label>
            <input
              type="date"
              value={date2}
              onChange={(e) => setDate2(e.target.value)}
              className="w-full px-3 py-2 text-xs font-bold bg-[#fbfdfb] border border-[#d2e4d0] rounded-xl outline-none focus:border-[#2d7a3a]"
            />
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-700 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Synchronized Real NASA GIBS Satellite Map Panels */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-[#1a2e1a] flex items-center gap-2">
            <Layers className="h-5 w-5 text-[#2d7a3a]" />
            Synchronized Earth Observation Swaths (NASA GIBS)
          </h2>
          <span className="text-xs text-gray-500 hidden sm:inline">
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

      {/* Comparative Findings Table & Narrative */}
      {result && (
        <div className="space-y-6">
          {/* Scientific Change Synthesis Narrative */}
          <div className="p-6 bg-gradient-to-br from-[#f0f7ee] via-white to-[#f8faf5] rounded-3xl border border-[#d3e5d0] shadow-xs space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-[#2d7a3a] uppercase tracking-wider">
              <ShieldCheck className="h-4 w-4" />
              <span>Biophysical Change Synthesis</span>
            </div>
            <p className="text-sm text-[#1e331c] font-medium leading-relaxed">
              {result.narrative}
            </p>
          </div>

          {/* Quantified Change Comparison Table */}
          <div className="bg-white rounded-3xl p-6 border border-[#e2ece0] shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#eef4ed] pb-4">
              <div>
                <h3 className="text-base font-bold text-[#1a2e1a]">
                  Differential Telemetry Matrix ({date1} vs {date2})
                </h3>
                <p className="text-xs text-[#4a6741]">
                  Quantified shifts across NASA POWER meteorological indicators and biophysical proxies
                </p>
              </div>

              <button
                onClick={downloadCSV}
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#f8faf7] hover:bg-[#eef7ec] text-[#2d7a3a] border border-[#d2e4d0] font-bold text-xs rounded-xl transition"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Export CSV Dataset</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-[#f7faf6] text-gray-600 uppercase font-bold text-[11px]">
                  <tr>
                    <th className="p-3">Biophysical Indicator</th>
                    <th className="p-3">Epoch 1 ({date1})</th>
                    <th className="p-3">Epoch 2 ({date2})</th>
                    <th className="p-3">Observed Shift (&Delta;)</th>
                    <th className="p-3">Directional Impact</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {result.comparison_table.map((row) => (
                    <tr key={row.indicator} className="hover:bg-gray-50 transition">
                      <td className="p-3 font-semibold text-gray-800">{row.indicator}</td>
                      <td className="p-3 font-mono text-gray-600">{row.period1_value ?? "—"}</td>
                      <td className="p-3 font-mono font-bold text-[#1a2e1a]">{row.period2_value ?? "—"}</td>
                      <td className="p-3 font-mono font-bold">
                        <span
                          className={
                            row.delta && row.delta > 0
                              ? "text-blue-600"
                              : row.delta && row.delta < 0
                              ? "text-amber-600"
                              : "text-gray-500"
                          }
                        >
                          {row.delta !== null && row.delta > 0 ? `+${row.delta}` : row.delta ?? "—"}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className="px-2.5 py-1 bg-gray-100 text-gray-700 rounded-full font-bold text-[10px] capitalize">
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
