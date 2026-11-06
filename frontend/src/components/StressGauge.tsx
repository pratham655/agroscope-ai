"use client";

import { type StressAssessment } from "@/lib/api";

const ARC_R = 80;
const CX = 100, CY = 100;
const ARC_START = Math.PI;

function polar(cx: number, cy: number, r: number, angle: number) {
  return { x: cx + r * Math.cos(angle), y: cy - r * Math.sin(angle) };
}

function arcPath(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  const s = polar(cx, cy, r, startAngle);
  const e = polar(cx, cy, r, endAngle);
  const large = endAngle - startAngle > Math.PI ? 1 : 0;
  return `M ${s.x} ${s.y} A ${r} ${r} 0 ${large} 0 ${e.x} ${e.y}`;
}

interface Props { stress: StressAssessment }

export default function StressGauge({ stress }: Props) {
  const score   = Math.max(0, Math.min(100, stress.score));
  const angle   = ARC_START - (score / 100) * Math.PI;
  const needle  = polar(CX, CY, ARC_R - 10, angle);

  const fillPath  = arcPath(CX, CY, ARC_R, ARC_START, angle);

  const zoneColors = ["#22c55e","#86efac","#fcd34d","#f97316","#dc2626"];
  const zones = [0, 20, 40, 60, 75, 100];

  return (
    <div className="card flex flex-col items-center">
      <h3 className="font-semibold text-[#1a2e1a] mb-4 self-start">Agricultural Stress Score</h3>

      <svg viewBox="0 0 200 120" className="w-48 h-28">
        {/* Track segments */}
        {zones.slice(0,-1).map((z, i) => {
          const a1 = ARC_START - (z       / 100) * Math.PI;
          const a2 = ARC_START - (zones[i+1] / 100) * Math.PI;
          return <path key={i} d={arcPath(CX, CY, ARC_R, a1, a2)}
            fill="none" stroke={zoneColors[i]} strokeWidth={18} strokeLinecap="butt" opacity={0.25} />;
        })}

        {/* Fill arc */}
        <path d={fillPath} fill="none" stroke={stress.color} strokeWidth={18} strokeLinecap="butt" />

        {/* Needle */}
        <line x1={CX} y1={CY} x2={needle.x} y2={needle.y}
          stroke="#1a2e1a" strokeWidth={2.5} strokeLinecap="round" />
        <circle cx={CX} cy={CY} r={5} fill="#1a2e1a" />

        {/* Labels */}
        <text x={20}  y={115} fontSize={9} fill="#94a3b8" textAnchor="middle">0</text>
        <text x={180} y={115} fontSize={9} fill="#94a3b8" textAnchor="middle">100</text>
      </svg>

      <div className="text-4xl font-bold mt-1" style={{ color: stress.color }}>{score.toFixed(0)}</div>
      <div className="text-sm font-semibold mt-1" style={{ color: stress.color }}>{stress.level} Stress</div>
      <div className="text-xs text-[#4a6741] mt-1" title="Channel completeness: fraction of the 4 biophysical sub-indicators available">Data Completeness: {(stress.confidence * 100).toFixed(0)}%</div>

      {/* Indicator breakdown */}
      <div className="w-full mt-5 space-y-2">
        {Object.entries(stress.indicators).map(([key, ind]) => {
          const labels: Record<string,string> = { spi: "SPI Proxy", ndvi: "Vegetation Proxy", soil: "Soil Wetness (MERRA-2)", temp: "Thermal Anomaly" };
          const pct = ind.stress_contribution != null ? Math.round(ind.stress_contribution * 100) : null;
          return (
            <div key={key} className="text-xs">
              <div className="flex justify-between mb-0.5">
                <span className="text-[#4a6741] font-medium">{labels[key] ?? key}</span>
                <span className="text-[#1a2e1a]">{ind.value != null ? ind.value.toFixed(2) : "N/A"}</span>
              </div>
              {pct != null && (
                <div className="h-1.5 bg-[#e2ece0] rounded-full">
                  <div className="h-full rounded-full bg-[#2d7a3a]" style={{ width: `${pct}%` }} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <p className="text-xs text-[#4a6741] mt-4 bg-amber-50 border border-amber-100 rounded-lg p-2 leading-relaxed">
        {stress.note}
      </p>
    </div>
  );
}
