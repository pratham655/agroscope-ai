"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Droplets, Sun, Sprout } from "lucide-react";
import type { CropScore } from "@/lib/api";

interface Props { crops: CropScore[] }

export default function CropRanking({ crops }: Props) {
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div className="card">
      <div className="mb-4">
        <h3 className="font-semibold text-[#1a2e1a] text-lg">Crop Rotation Ranking</h3>
        <p className="text-xs text-[#4a6741] mt-1">
          Scored against observed GDD, rainfall, and soil moisture.
          Indicative only — consult local agronomic expertise before acting.
        </p>
      </div>

      <div className="space-y-3">
        {crops.map((crop, rank) => {
          const isOpen = expanded === crop.crop_id;
          const barColor = rank === 0 ? "#2d7a3a" : rank <= 2 ? "#65a30d" : "#94a3b8";

          return (
            <div key={crop.crop_id} className="border border-[#e2ece0] rounded-xl overflow-hidden">
              <button
                className="w-full flex items-center gap-4 p-4 hover:bg-[#f0f7ee] transition-colors text-left"
                onClick={() => setExpanded(isOpen ? null : crop.crop_id)}
              >
                {/* Rank badge */}
                <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${rank === 0 ? "bg-[#2d7a3a] text-white" : "bg-[#f0f7ee] text-[#4a6741]"}`}>
                  {rank + 1}
                </div>

                {/* Name and score bar */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between mb-1">
                    <span className="font-semibold text-[#1a2e1a] text-sm">{crop.name}</span>
                    <span className="text-sm font-bold" style={{ color: barColor }}>{crop.score.toFixed(0)}/100</span>
                  </div>
                  <div className="h-2 bg-[#e2ece0] rounded-full">
                    <div className="h-full rounded-full transition-all" style={{ width: `${crop.score}%`, background: barColor }} />
                  </div>
                </div>

                {isOpen ? <ChevronUp className="h-4 w-4 text-[#4a6741] flex-shrink-0" /> : <ChevronDown className="h-4 w-4 text-[#4a6741] flex-shrink-0" />}
              </button>

              {isOpen && (
                <div className="px-4 pb-4 border-t border-[#f0f7ee] bg-[#fafcfa]">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-3 mb-4">
                    <div className="flex items-center gap-2 text-xs">
                      <Sun className="h-4 w-4 text-amber-500" />
                      <div>
                        <div className="text-[#4a6741]">GDD Available / Required</div>
                        <div className="font-semibold text-[#1a2e1a]">{crop.gdd_available.toFixed(0)} / {crop.gdd_required} °C·day</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <Droplets className="h-4 w-4 text-[#1e6fa8]" />
                      <div>
                        <div className="text-[#4a6741]">Water Available / Needed</div>
                        <div className="font-semibold text-[#1a2e1a]">{crop.precip_mm.toFixed(0)} / {crop.water_need_mm} mm</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <Sprout className="h-4 w-4 text-[#2d7a3a]" />
                      <div>
                        <div className="text-[#4a6741]">Suitability Score</div>
                        <div className="font-semibold text-[#1a2e1a]">{crop.score.toFixed(1)} / 100</div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <h4 className="text-xs font-semibold text-green-700 mb-2">✓ Benefits</h4>
                      <ul className="space-y-1">
                        {crop.benefits.map((b, i) => <li key={i} className="text-xs text-[#4a6741]">• {b}</li>)}
                      </ul>
                    </div>
                    <div>
                      <h4 className="text-xs font-semibold text-amber-700 mb-2">⚠ Risks</h4>
                      <ul className="space-y-1">
                        {crop.risks.map((r, i) => <li key={i} className="text-xs text-[#4a6741]">• {r}</li>)}
                      </ul>
                    </div>
                  </div>

                  <p className="text-xs text-[#94a3b8] mt-3 bg-amber-50 border border-amber-100 rounded p-2">
                    Scores are simplified heuristics based on GDD, rainfall, and temperature — not validated agronomic models.
                    Local soil, pest, and market conditions are not included.
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
