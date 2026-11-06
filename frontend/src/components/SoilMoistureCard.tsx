"use client";

import { Droplets, AlertTriangle } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { formatDate } from "@/lib/api";
import type { FieldReport } from "@/lib/api";

type SoilData = FieldReport["soil_moisture"];

interface Props { soilData: SoilData }

export default function SoilMoistureCard({ soilData }: Props) {
  const { surface, root_zone, analysis } = soilData;

  const step = Math.max(1, Math.ceil((root_zone.dates?.length ?? 0) / 90));
  const chartData = root_zone.dates
    ? root_zone.dates
        .filter((_, i) => i % step === 0)
        .map((d, i) => ({
          date:  formatDate(d),
          surface:  surface.values?.[i * step] ?? null,
          rootzone: root_zone.values?.[i * step] ?? null,
        }))
    : [];

  const pctDry = analysis?.dry_stress_pct ?? 0;

  return (
    <div className="card">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-semibold text-[#1a2e1a] flex items-center gap-2">
            <Droplets className="h-5 w-5 text-[#1e6fa8]" />
            Soil Moisture Intelligence
          </h3>
          <p className="text-xs text-[#4a6741] mt-1">{soilData.data_type}</p>
        </div>
        {pctDry > 15 && (
          <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 text-amber-700 text-xs px-3 py-1.5 rounded-lg">
            <AlertTriangle className="h-3.5 w-3.5" />
            {pctDry.toFixed(0)}% dry-stress days
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
        {[
          { label: "Surface (0–5 cm)", stats: analysis?.surface,   unit: "fraction" },
          { label: "Root Zone",        stats: analysis?.root_zone,  unit: "fraction" },
        ].map(s => s.stats && (
          <div key={s.label} className="bg-[#f0f7ee] rounded-xl p-4">
            <div className="text-xs font-medium text-[#4a6741] mb-2">{s.label}</div>
            <div className="text-2xl font-bold text-[#1a2e1a]">{s.stats.mean?.toFixed(2)}</div>
            <div className="text-xs text-[#4a6741]">{s.unit}</div>
            <div className="mt-2 grid grid-cols-3 gap-1 text-xs text-[#4a6741]">
              <div>Min: {s.stats.min?.toFixed(2)}</div>
              <div>Max: {s.stats.max?.toFixed(2)}</div>
              <div>σ: {s.stats.std?.toFixed(2)}</div>
            </div>
          </div>
        ))}

        <div className="bg-[#f0f7ee] rounded-xl p-4 col-span-1">
          <div className="text-xs font-medium text-[#4a6741] mb-2">Stress Summary</div>
          <div className="text-2xl font-bold" style={{ color: pctDry > 25 ? "#dc2626" : pctDry > 10 ? "#f97316" : "#22c55e" }}>
            {pctDry.toFixed(0)}%
          </div>
          <div className="text-xs text-[#4a6741]">days below critical threshold (0.25)</div>
          <div className="h-1.5 bg-white rounded mt-2">
            <div className="h-full rounded" style={{ width: `${Math.min(100, pctDry)}%`, background: pctDry > 25 ? "#dc2626" : "#f97316" }} />
          </div>
        </div>
      </div>

      {chartData.length > 0 && (
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={chartData} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2ece0" />
            <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} interval="preserveStartEnd" />
            <YAxis domain={[0, 1]} tick={{ fontSize: 10 }} tickLine={false} />
            <Tooltip contentStyle={{ borderRadius: "0.75rem", border: "1px solid #e2ece0", fontSize: "12px" }}
              formatter={(v: unknown, name: unknown) => [`${(v as number)?.toFixed(3)}`, (name as string) === "surface" ? "Surface" : "Root Zone"]} />
            <ReferenceLine y={0.25} stroke="#f97316" strokeDasharray="5 3"
              label={{ value: "Critical (0.25)", fontSize: 9, fill: "#f97316", position: "insideTopRight" }} />
            <Line type="monotone" dataKey="surface"  stroke="#1e6fa8" strokeWidth={1.5} dot={false} name="Surface" />
            <Line type="monotone" dataKey="rootzone" stroke="#2d7a3a" strokeWidth={2}   dot={false} name="Root Zone" />
          </LineChart>
        </ResponsiveContainer>
      )}

      {analysis?.interpretation && (
        <p className="text-xs text-[#4a6741] mt-3 bg-[#f0f7ee] rounded-lg p-3">{analysis.interpretation}</p>
      )}
      <p className="text-xs text-[#94a3b8] mt-2">{soilData.data_type}</p>
    </div>
  );
}
