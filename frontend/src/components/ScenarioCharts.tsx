"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useState } from "react";
import type { ScenarioSimulationResult } from "@/lib/api";
import { BarChart3 } from "lucide-react";

interface ScenarioChartsProps {
  result: ScenarioSimulationResult;
}

export default function ScenarioCharts({ result }: ScenarioChartsProps) {
  const [activeTab, setActiveTab] = useState<"crops" | "climate">("crops");

  // Format data for crop suitability comparison
  const cropData = result.scenario.crops.map((scCrop) => {
    const baseCrop = result.baseline.crops.find((c) => c.crop_id === scCrop.crop_id);
    const baseScore = baseCrop ? baseCrop.score : 0;
    const diff = Math.round((scCrop.score - baseScore) * 10) / 10;

    return {
      name: scCrop.name,
      Baseline: baseScore,
      Scenario: scCrop.score,
      delta: diff,
    };
  });

  // Format data for key bioclimatic indicators
  const climateData = [
    {
      metric: "Precipitation (mm)",
      Baseline: result.baseline.total_precip_mm,
      Scenario: result.scenario.total_precip_mm,
      unit: "mm",
    },
    {
      metric: "Mean Temp (°C)",
      Baseline: result.baseline.mean_temp_c,
      Scenario: result.scenario.mean_temp_c,
      unit: "°C",
    },
    {
      metric: "Cumulative GDD",
      Baseline: result.baseline.total_gdd,
      Scenario: result.scenario.total_gdd,
      unit: "°C·d",
    },
    {
      metric: "Soil Moisture (%)",
      Baseline: Math.round(result.baseline.soil_mean * 100),
      Scenario: Math.round(result.scenario.soil_mean * 100),
      unit: "%",
    },
    {
      metric: "Stress Score",
      Baseline: result.baseline.stress.score,
      Scenario: result.scenario.stress.score,
      unit: "pts",
    },
  ];

  return (
    <div className="bg-white rounded-2xl p-6 border border-[#e2ece0] shadow-xs space-y-5">
      {/* Tab Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#eef4ed] pb-4">
        <div>
          <h3 className="text-base font-bold text-[#1a2e1a] flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-[#2d7a3a]" />
            Comparative Biophysical Analytics
          </h3>
          <p className="text-xs text-[#4a6741]">
            Quantified delta between historical baseline and hypothetical climate shift
          </p>
        </div>

        <div className="flex bg-[#f4f7f3] p-1 rounded-xl border border-[#dce8da] self-start sm:self-auto">
          <button
            onClick={() => setActiveTab("crops")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeTab === "crops"
                ? "bg-white text-[#2d7a3a] shadow-xs"
                : "text-gray-600 hover:text-[#1a2e1a]"
            }`}
          >
            Crop Suitability (0–100)
          </button>
          <button
            onClick={() => setActiveTab("climate")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeTab === "climate"
                ? "bg-white text-[#2d7a3a] shadow-xs"
                : "text-gray-600 hover:text-[#1a2e1a]"
            }`}
          >
            Bioclimatic Indicators
          </button>
        </div>
      </div>

      {/* Chart 1: Crop Suitability */}
      {activeTab === "crops" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>Rotation Candidate Viability</span>
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-[#a3c9a0] inline-block"></span>
                Baseline Score
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-[#2d7a3a] inline-block"></span>
                Scenario Score
              </span>
            </div>
          </div>

          <ResponsiveContainer width="100%" height={260}>
            <BarChart
              data={cropData}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#eef4ed" />
              <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fontSize: 12, fill: "#1a2e1a", fontWeight: 600 }}
                width={80}
              />
              <Tooltip
                formatter={(val: unknown, name: unknown) => [`${val} / 100`, String(name)]}
                contentStyle={{
                  borderRadius: "0.75rem",
                  border: "1px solid #d2e4d0",
                  fontSize: "12px",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
                }}
              />
              <Bar dataKey="Baseline" fill="#b8d4b5" radius={[0, 4, 4, 0]} barSize={10} />
              <Bar dataKey="Scenario" fill="#2d7a3a" radius={[0, 4, 4, 0]} barSize={10} />
            </BarChart>
          </ResponsiveContainer>

          <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 pt-2">
            {cropData.map((c) => (
              <div
                key={c.name}
                className="p-2 bg-[#f9faf7] rounded-xl border border-[#e8efe6] text-center"
              >
                <div className="text-[11px] font-bold text-gray-700 truncate">{c.name}</div>
                <div className="text-xs font-mono font-bold mt-0.5 flex items-center justify-center gap-1">
                  <span>{c.Scenario}</span>
                  <span
                    className={`text-[10px] ${
                      c.delta > 0
                        ? "text-green-600"
                        : c.delta < 0
                        ? "text-red-600"
                        : "text-gray-400"
                    }`}
                  >
                    ({c.delta > 0 ? `+${c.delta}` : c.delta})
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Chart 2: Climate Indicators */}
      {activeTab === "climate" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>Relative Indicator Magnitudes</span>
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-slate-300 inline-block"></span>
                Historical Observed
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-[#0b3d91] inline-block"></span>
                Hypothetical Scenario
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {climateData.map((d) => {
              const diff = Math.round((d.Scenario - d.Baseline) * 10) / 10;
              const pct =
                d.Baseline !== 0
                  ? Math.round(((d.Scenario - d.Baseline) / Math.abs(d.Baseline)) * 100)
                  : 0;

              return (
                <div
                  key={d.metric}
                  className="p-4 rounded-xl border border-[#e2ece0] bg-[#fafcf9] space-y-2"
                >
                  <div className="text-xs font-semibold text-gray-600">{d.metric}</div>
                  <div className="flex items-baseline justify-between">
                    <div>
                      <div className="text-xs text-gray-400">Baseline</div>
                      <div className="text-sm font-semibold text-gray-700">
                        {d.Baseline} {d.unit}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-[#0b3d91] font-semibold">Simulated</div>
                      <div className="text-base font-extrabold text-[#1a2e1a]">
                        {d.Scenario} {d.unit}
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-[#eaf2e8] flex items-center justify-between text-xs">
                    <span className="text-gray-500">Net Shift:</span>
                    <span
                      className={`font-bold ${
                        diff === 0
                          ? "text-gray-400"
                          : d.metric.includes("Stress")
                          ? diff > 0
                            ? "text-red-600"
                            : "text-green-600"
                          : diff > 0
                          ? "text-blue-600"
                          : "text-amber-600"
                      }`}
                    >
                      {diff > 0 ? `+${diff}` : diff} {d.unit} ({diff > 0 ? `+${pct}%` : `${pct}%`})
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
