"use client";

import { useState, useCallback, useEffect } from "react";
import dynamic from "next/dynamic";
import {
  Compass,
  AlertTriangle,
  Plus,
  Trash2,
  MapPin,
  Layers,
  ArrowRight,
  Globe2,
} from "lucide-react";
import Link from "next/link";
import { getRegionalRisk, type RegionalRiskResult } from "@/lib/api";
import { useLocation } from "@/context/LocationContext";

const RiskRadarMap = dynamic(() => import("@/components/RiskRadarMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[420px] rounded-xl bg-slate-100 flex flex-col items-center justify-center text-slate-400 gap-2 border border-slate-200">
      <Globe2 className="h-6 w-6 text-[#0d3b2e] animate-spin" />
      <span className="text-xs font-semibold text-slate-700">Loading Planetary Risk Distribution...</span>
    </div>
  ),
});

export default function RiskRadarPage() {
  const { currentLocation, setLocation } = useLocation();
  const [startDate, setStartDate] = useState("2023-01-01");
  const [endDate, setEndDate] = useState("2023-12-31");
  const [customLocations, setCustomLocations] = useState<{ lat: number; lon: number; label: string }[]>([]);

  const [newLabel, setNewLabel] = useState("");
  const [newLat, setNewLat] = useState("");
  const [newLon, setNewLon] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<RegionalRiskResult | null>(null);

  const addActiveField = () => {
    if (!currentLocation || typeof currentLocation.latitude !== "number" || typeof currentLocation.longitude !== "number") return;
    const exists = customLocations.some(
      (c) => Math.abs(c.lat - currentLocation.latitude) < 0.001 && Math.abs(c.lon - currentLocation.longitude) < 0.001
    );
    if (!exists) {
      setCustomLocations((prev) => [
        ...prev,
        {
          label: currentLocation.label || `Active Field (${currentLocation.latitude.toFixed(2)}, ${currentLocation.longitude.toFixed(2)})`,
          lat: currentLocation.latitude,
          lon: currentLocation.longitude,
        },
      ]);
    }
  };

  const fetchRisk = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getRegionalRisk({
        startDate,
        endDate,
        locations: customLocations,
        usePresets: true,
      });
      setResult(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load regional risk radar data.");
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, customLocations]);

  useEffect(() => {
    let active = true;
    getRegionalRisk({
      startDate: "2023-01-01",
      endDate: "2023-12-31",
      usePresets: true,
    })
      .then((data) => {
        if (active) setResult(data);
      })
      .catch((e: unknown) => {
        if (active) setError(e instanceof Error ? e.message : "Failed to load regional risk radar data.");
      });
    return () => {
      active = false;
    };
  }, []);

  const addCustomLocation = () => {
    const latN = parseFloat(newLat);
    const lonN = parseFloat(newLon);
    if (!newLabel || isNaN(latN) || isNaN(lonN)) {
      alert("Please enter a valid region name and numeric latitude & longitude.");
      return;
    }
    if (latN < -90 || latN > 90 || lonN < -180 || lonN > 180) {
      alert("Coordinates out of range (-90..90, -180..180).");
      return;
    }
    setCustomLocations((prev) => [...prev, { label: newLabel, lat: latN, lon: lonN }]);
    setNewLabel("");
    setNewLat("");
    setNewLon("");
  };

  const removeCustomLocation = (idx: number) => {
    setCustomLocations((prev) => prev.filter((_, i) => i !== idx));
  };

  return (
    <div className="max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-8 py-5 space-y-5">
      {/* ── Feature Discovery Banner: Regional Risk Radar ──────────── */}
      <div className="grad-risk rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-3xl">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-white/20 text-white backdrop-blur-sm border border-white/30">
                Macro-Vulnerability Workspace
              </span>
              <span className="text-xs text-rose-200 font-mono">NASA POWER · Concurrent Ingestion</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
              Regional Agricultural Risk Radar
            </h1>
            <p className="text-xs sm:text-sm text-rose-100/90 leading-relaxed">
              Macro-scale vulnerability ranking and concurrent stress comparison across primary global agricultural breadbaskets, quantifying relative exposure to meteorological droughts, heat waves, and soil exhaustion.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <span className="px-3 py-1.5 rounded-lg bg-black/25 backdrop-blur-md border border-white/20 text-xs font-mono text-rose-200">
              Global Breadbasket Ranking &bull; Risk Heatmap
            </span>
          </div>
        </div>
      </div>

      {/* ── Controls Console: Date Range & Breadbasket Customization ─── */}
      <div className="bg-white rounded-xl p-4 sm:p-5 border border-slate-200 shadow-2xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
          <div>
            <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
              Surveillance Window Start
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-md outline-none focus:border-[#0d3b2e] focus:bg-white transition"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
              Surveillance Window End
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-md outline-none focus:border-[#0d3b2e] focus:bg-white transition"
            />
          </div>
          <div>
            <button
              onClick={fetchRisk}
              disabled={loading}
              className="w-full py-2 px-4 bg-[#0d3b2e] hover:bg-[#134e39] text-white font-semibold text-xs rounded-md shadow-2xs transition disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              {loading ? (
                <>
                  <span className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Processing Radar...</span>
                </>
              ) : (
                <>
                  <Compass className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Update Radar Analysis</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Append Custom Breadbasket */}
        <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-semibold text-slate-600 flex items-center gap-1">
            <Plus className="w-3.5 h-3.5 text-[#0d3b2e]" />
            <span>Add Breadbasket:</span>
          </span>
          <input
            placeholder="Region label (e.g. Kenya Highlands)"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            className="px-2.5 py-1 text-xs border border-slate-200 rounded-md bg-slate-50 outline-none focus:border-[#0d3b2e]"
          />
          <input
            placeholder="Lat (-0.3)"
            value={newLat}
            onChange={(e) => setNewLat(e.target.value)}
            className="w-20 px-2 py-1 text-xs font-mono border border-slate-200 rounded-md bg-slate-50 outline-none focus:border-[#0d3b2e]"
          />
          <input
            placeholder="Lon (36.9)"
            value={newLon}
            onChange={(e) => setNewLon(e.target.value)}
            className="w-20 px-2 py-1 text-xs font-mono border border-slate-200 rounded-md bg-slate-50 outline-none focus:border-[#0d3b2e]"
          />
          <button
            onClick={addCustomLocation}
            className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-md border border-slate-200 transition"
          >
            Append
          </button>

          {currentLocation && typeof currentLocation.latitude === "number" && (
            <button
              onClick={addActiveField}
              className="px-3 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 text-xs font-semibold rounded-md transition flex items-center gap-1"
            >
              <MapPin className="w-3 h-3 text-[#0d3b2e]" />
              <span>Include Active Target ({currentLocation.label})</span>
            </button>
          )}

          {customLocations.map((loc, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-xs font-mono border border-slate-200"
            >
              <span>{loc.label}</span>
              <button onClick={() => removeCustomLocation(i)} className="hover:text-red-600 transition">
                <Trash2 className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
          <div>
            <p className="font-semibold">Radar Notice</p>
            <p className="text-[11px] text-red-600">{error}</p>
          </div>
        </div>
      )}

      {/* ── Central Interactive Map & KPI Summary ────────────────────── */}
      {result && (
        <div className="space-y-5">
          {/* Central Interactive Global Risk Map */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <Globe2 className="w-3.5 h-3.5 text-[#0d3b2e]" />
                <span>Global Risk Distribution Map</span>
              </h2>
              <span className="text-[10px] text-slate-500 font-mono">
                {result.locations.length} Global Basins Mapped
              </span>
            </div>

            <RiskRadarMap
              locations={result.locations.map((l) => ({
                label: l.label,
                latitude: l.latitude,
                longitude: l.longitude,
                stress_score: l.stress_score ?? 50,
                stress_level: l.stress_level,
                rainfall_mm: l.total_precip_mm,
                soil_wetness: l.soil_mean,
                top_crop: l.top_crops?.[0]?.name,
              }))}
              onSelectLocation={(loc) => {
                setLocation({
                  latitude: loc.latitude,
                  longitude: loc.longitude,
                  label: loc.label,
                  source: "map",
                });
              }}
            />
          </div>

          {/* 4 Summary KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs space-y-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                Breadbaskets Monitored
              </span>
              <div className="text-2xl font-bold font-mono text-slate-900">
                {result.summary.n_successful}
              </div>
              <p className="text-[11px] text-slate-500">
                Processed across NASA POWER grids
              </p>
            </div>

            <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs space-y-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                Global Mean Stress
              </span>
              <div className="flex items-baseline gap-1 text-slate-900">
                <span className="text-2xl font-bold font-mono text-[#0d3b2e]">
                  {result.summary.mean_stress}
                </span>
                <span className="text-xs text-slate-400 font-sans">/ 100</span>
              </div>
              <p className="text-[11px] text-slate-500">
                Average index across monitored zones
              </p>
            </div>

            <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs space-y-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                Highest Vulnerability
              </span>
              <div className="text-sm font-bold text-red-600 truncate">
                {result.summary.highest_risk_location || "—"}
              </div>
              <div className="text-[11px] font-semibold text-red-600 font-mono">
                Peak Stress: {result.summary.max_stress}/100
              </div>
            </div>

            <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs space-y-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                Most Resilient Zone
              </span>
              <div className="text-sm font-bold text-emerald-700 truncate">
                {result.summary.lowest_risk_location || "—"}
              </div>
              <div className="text-[11px] font-semibold text-emerald-700 font-mono">
                Min Stress: {result.summary.min_stress}/100
              </div>
            </div>
          </div>

          {/* Ranked Regional Heatmap Table */}
          <div className="bg-white rounded-xl p-4 sm:p-5 border border-slate-200 shadow-2xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="h-4 w-4 text-[#0d3b2e]" />
                <span>Ranked Regional Agricultural Risk Heatmap</span>
              </h3>
              <div className="text-[11px] text-slate-500 flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-red-500" /> High
                <span className="inline-block w-2 h-2 rounded-full bg-amber-500 ml-1" /> Elevated
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 ml-1" /> Resilient
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-600 uppercase font-semibold text-[10px] border-b border-slate-200">
                  <tr>
                    <th className="p-2.5">Rank</th>
                    <th className="p-2.5">Agricultural Region</th>
                    <th className="p-2.5">Coordinates</th>
                    <th className="p-2.5">Composite Stress</th>
                    <th className="p-2.5">Rainfall</th>
                    <th className="p-2.5">Root Wetness</th>
                    <th className="p-2.5">Top Crop</th>
                    <th className="p-2.5">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                  {result.locations.map((loc, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/60 transition">
                      <td className="p-2.5 font-bold font-sans text-slate-500">#{idx + 1}</td>
                      <td className="p-2.5 font-bold font-sans text-slate-900">{loc.label}</td>
                      <td className="p-2.5 text-slate-600">
                        {loc.latitude.toFixed(2)}°, {loc.longitude.toFixed(2)}°
                      </td>
                      <td className="p-2.5">
                        <span
                          className="px-2 py-0.5 rounded font-bold text-[10px] font-sans"
                          style={{
                            backgroundColor: `${loc.stress_color}15`,
                            color: loc.stress_color,
                          }}
                        >
                          {loc.stress_score}/100 ({loc.stress_level})
                        </span>
                      </td>
                      <td className="p-2.5 text-slate-700">{loc.total_precip_mm.toFixed(0)} mm</td>
                      <td className="p-2.5 text-slate-700">{(loc.soil_mean * 100).toFixed(1)}%</td>
                      <td className="p-2.5 font-sans font-semibold text-emerald-800">{loc.top_crops?.[0]?.name || "—"}</td>
                      <td className="p-2.5 font-sans">
                        <Link
                          href={`/analyze?lat=${loc.latitude}&lon=${loc.longitude}&label=${encodeURIComponent(loc.label)}&autorun=true`}
                          className="text-[#0d3b2e] hover:underline flex items-center gap-1 font-semibold text-[11px]"
                        >
                          <span>Deep Audit</span>
                          <ArrowRight className="w-3 h-3" />
                        </Link>
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
