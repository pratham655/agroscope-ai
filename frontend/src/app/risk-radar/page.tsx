"use client";

import { useState, useCallback, useEffect } from "react";
import {
  Compass,
  AlertTriangle,
  Plus,
  Trash2,
  MapPin,
  Info,
  ExternalLink,
  Layers,
} from "lucide-react";
import Link from "next/link";
import { getRegionalRisk, type RegionalRiskResult } from "@/lib/api";

export default function RiskRadarPage() {
  const [startDate, setStartDate] = useState("2023-01-01");
  const [endDate, setEndDate] = useState("2023-12-31");
  const [customLocations, setCustomLocations] = useState<{ lat: number; lon: number; label: string }[]>([]);

  // New location inputs
  const [newLabel, setNewLabel] = useState("");
  const [newLat, setNewLat] = useState("");
  const [newLon, setNewLon] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<RegionalRiskResult | null>(null);

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
      alert("Please enter a valid region name and numeric latitude (-90..90) & longitude (-180..180).");
      return;
    }
    if (latN < -90 || latN > 90 || lonN < -180 || lonN > 180) {
      alert("Coordinates out of range. Latitude: -90 to 90, Longitude: -180 to 180.");
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
    <div className="min-h-screen bg-[#f8faf5]">
      {/* Hero Header */}
      <div className="bg-linear-to-b from-[#0c1b12] via-[#12281a] to-[#183624] text-white py-12 px-4 sm:px-6 lg:px-8 border-b border-[#234b32]">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-emerald-500/20 border border-emerald-400/30 text-emerald-300">
                <Compass className="h-5 w-5" />
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-300 bg-emerald-950/60 px-3 py-1 rounded-full border border-emerald-800/60">
                NASA Global Food Security Surveillance
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-emerald-200/80">
              <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Multi-Region Concurrent Geospatial Ingestion &bull; NASA POWER 0.5° Grids</span>
            </div>
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white mb-3">
            Regional Agricultural Risk Radar
          </h1>
          <p className="text-base text-emerald-100/90 max-w-3xl leading-relaxed">
            Macro-scale vulnerability ranking and concurrent stress comparison across primary global agricultural breadbaskets, quantifying relative exposure to meteorological droughts, heat waves, and soil exhaustion.
          </p>
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Control bar */}
        <div className="bg-white rounded-2xl p-6 border border-[#e2ece0] shadow-xs mb-8 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                Surveillance Window Start
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm bg-gray-50/50 border border-[#e2ece0] rounded-xl outline-none focus:ring-2 focus:ring-[#2d7a3a] focus:bg-white transition"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                Surveillance Window End
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm bg-gray-50/50 border border-[#e2ece0] rounded-xl outline-none focus:ring-2 focus:ring-[#2d7a3a] focus:bg-white transition"
              />
            </div>
            <div>
              <button
                onClick={fetchRisk}
                disabled={loading}
                className="w-full py-2.5 px-4 bg-[#2d7a3a] hover:bg-[#23602d] text-white font-semibold text-sm rounded-xl shadow-xs transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Processing Radar...</span>
                  </>
                ) : (
                  <>
                    <Compass className="h-4 w-4" />
                    <span>Update Radar Analysis</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Custom Location Drawer */}
          <div className="pt-4 border-t border-gray-100 flex flex-wrap items-center gap-3">
            <span className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
              <Plus className="h-3.5 w-3.5 text-[#2d7a3a]" /> Add Custom Breadbasket:
            </span>
            <input
              placeholder="Region label (e.g. Kenya Highlands)"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              className="px-3 py-1.5 text-xs border border-[#e2ece0] rounded-xl outline-none focus:ring-2 focus:ring-[#2d7a3a]"
            />
            <input
              placeholder="Lat (e.g. -0.3)"
              value={newLat}
              onChange={(e) => setNewLat(e.target.value)}
              className="w-24 px-3 py-1.5 text-xs border border-[#e2ece0] rounded-xl outline-none focus:ring-2 focus:ring-[#2d7a3a]"
            />
            <input
              placeholder="Lon (e.g. 36.9)"
              value={newLon}
              onChange={(e) => setNewLon(e.target.value)}
              className="w-24 px-3 py-1.5 text-xs border border-[#e2ece0] rounded-xl outline-none focus:ring-2 focus:ring-[#2d7a3a]"
            />
            <button
              onClick={addCustomLocation}
              className="px-3.5 py-1.5 bg-[#2d7a3a] hover:bg-[#23602d] text-white text-xs font-semibold rounded-xl flex items-center gap-1 transition"
            >
              <Plus className="h-3.5 w-3.5" /> Append Region
            </button>

            {customLocations.map((loc, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-medium border border-emerald-200"
              >
                <span>{loc.label}</span>
                <button onClick={() => removeCustomLocation(i)} className="hover:text-red-600 transition">
                  <Trash2 className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        </div>

        {error && (
          <div className="p-4 mb-6 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 shrink-0 text-red-600 mt-0.5" />
            <div>
              <p className="font-bold">Radar Telemetry Error</p>
              <p className="text-xs text-red-600 mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {result && (
          <div className="space-y-8">
            {/* Summary KPIs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white rounded-2xl p-5 border border-[#e2ece0] shadow-xs">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1">
                  Breadbaskets Monitored
                </span>
                <div className="text-3xl font-extrabold text-[#1a2e1a]">
                  {result.summary.n_successful}
                </div>
                <p className="text-[11px] text-gray-500 mt-2">
                  Processed concurrently across NASA POWER grids
                </p>
              </div>

              <div className="bg-white rounded-2xl p-5 border border-[#e2ece0] shadow-xs">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1">
                  Global Mean Stress
                </span>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-extrabold text-[#2d7a3a]">
                    {result.summary.mean_stress}
                  </span>
                  <span className="text-xs text-gray-400 font-semibold">/ 100</span>
                </div>
                <p className="text-[11px] text-gray-500 mt-2">
                  Average stress index across all monitored zones
                </p>
              </div>

              <div className="bg-white rounded-2xl p-5 border border-[#e2ece0] shadow-xs">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1">
                  Highest Vulnerability
                </span>
                <div className="text-base font-extrabold text-red-600 truncate mt-1">
                  {result.summary.highest_risk_location || "—"}
                </div>
                <div className="text-xs font-bold text-red-500 mt-2">
                  Peak Stress: {result.summary.max_stress} / 100
                </div>
              </div>

              <div className="bg-white rounded-2xl p-5 border border-[#e2ece0] shadow-xs">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1">
                  Most Resilient Zone
                </span>
                <div className="text-base font-extrabold text-emerald-700 truncate mt-1">
                  {result.summary.lowest_risk_location || "—"}
                </div>
                <div className="text-xs font-bold text-emerald-600 mt-2">
                  Min Stress: {result.summary.min_stress} / 100
                </div>
              </div>
            </div>

            {/* Regional Ranking Heatmap Table */}
            <div className="bg-white rounded-2xl p-6 border border-[#e2ece0] shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
                <div>
                  <h3 className="text-base font-bold text-[#1a2e1a] flex items-center gap-2">
                    <Layers className="h-4 w-4 text-[#2d7a3a]" />
                    <span>Ranked Regional Agricultural Risk Heatmap</span>
                  </h3>
                  <p className="text-xs text-[#4a6741] mt-0.5">
                    Ordered from highest vulnerability to highest resilience based on composite NASA multi-parameter stress.
                  </p>
                </div>
                <div className="text-xs text-gray-500 flex items-center gap-2">
                  <span className="inline-block w-2.5 h-2.5 rounded-full bg-red-500" /> High Stress
                  <span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-500 ml-2" /> Elevated
                  <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 ml-2" /> Resilient
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-[#f7faf6] text-gray-600 uppercase font-semibold">
                    <tr>
                      <th className="p-3 rounded-l-xl">Rank</th>
                      <th className="p-3">Agricultural Region</th>
                      <th className="p-3">Coordinates</th>
                      <th className="p-3">Composite Stress</th>
                      <th className="p-3">Rainfall</th>
                      <th className="p-3">Root Wetness</th>
                      <th className="p-3">SPI Proxy</th>
                      <th className="p-3 rounded-r-xl">Top Resilient Crop</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {result.locations.map((loc, idx) => (
                      <tr key={idx} className="hover:bg-gray-50/70 transition">
                        <td className="p-3 font-bold text-gray-500">#{idx + 1}</td>
                        <td className="p-3 font-bold text-gray-900">
                          <div className="flex items-center gap-1.5">
                            <MapPin className="h-3.5 w-3.5 text-[#2d7a3a]" />
                            <span>{loc.label}</span>
                          </div>
                        </td>
                        <td className="p-3 text-gray-500 font-mono text-[11px]">
                          {loc.latitude.toFixed(2)}°, {loc.longitude.toFixed(2)}°
                        </td>
                        <td className="p-3">
                          <span
                            className="px-2.5 py-1 rounded-full font-bold text-[11px] inline-flex items-center gap-1"
                            style={{
                              backgroundColor: `${loc.stress_color}20`,
                              color: loc.stress_color,
                            }}
                          >
                            {loc.stress_score !== null ? `${loc.stress_score} pts (${loc.stress_level})` : "Error"}
                          </span>
                        </td>
                        <td className="p-3 font-medium text-gray-700">{loc.total_precip_mm} mm</td>
                        <td className="p-3 font-medium text-gray-700">{loc.soil_mean}</td>
                        <td className="p-3">
                          <span className="font-semibold text-gray-800 bg-gray-100 px-2 py-0.5 rounded">
                            {loc.spi_category}
                          </span>
                        </td>
                        <td className="p-3 font-semibold text-[#2d7a3a]">
                          <div className="flex items-center justify-between gap-2">
                            <span>
                              {loc.top_crops && loc.top_crops[0]
                                ? `${loc.top_crops[0].name} (${loc.top_crops[0].score}%)`
                                : "—"}
                            </span>
                            <Link
                              href={`/farm-futures?lat=${loc.latitude}&lon=${loc.longitude}`}
                              className="text-[10px] text-emerald-700 hover:text-emerald-900 font-bold underline"
                              title="Simulate this region in Farm Futures Lab"
                            >
                              Simulate
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Scientific Provenance & Methodology Card */}
            <div className="p-5 bg-white border border-[#e2ece0] rounded-2xl text-xs text-gray-600 leading-relaxed shadow-2xs">
              <div className="flex items-center gap-2 font-bold text-gray-800 mb-2">
                <Info className="h-4 w-4 text-[#2d7a3a]" />
                <span>NASA Scientific Surveillance Methodology &amp; Footnote</span>
              </div>
              <p>{result.scientific_note}</p>
              <div className="mt-3 pt-3 border-t border-gray-100 flex flex-wrap items-center justify-between gap-2 text-[11px] text-gray-500">
                <span>NASA POWER Agroclimatology &bull; Standardized Precipitation Index &bull; MERRA-2 Land Surface Modeling</span>
                <a
                  href="https://power.larc.nasa.gov/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#2d7a3a] font-semibold hover:underline flex items-center gap-1"
                >
                  NASA POWER Portal <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
