"use client";

import { CheckCircle2, AlertTriangle, Info } from "lucide-react";

interface Props { findings: string[] }

function iconFor(text: string) {
  if (text.includes("⚠️") || text.includes("🌵") || text.includes("🌱")) return <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />;
  if (text.includes("✅") || text.includes("💧")) return <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />;
  return <Info className="h-4 w-4 text-[#1e6fa8] flex-shrink-0 mt-0.5" />;
}

export default function FindingsPanel({ findings }: Props) {
  return (
    <div className="card h-full">
      <h3 className="font-semibold text-[#1a2e1a] mb-4">Key Findings</h3>
      <ul className="space-y-3">
        {findings.map((f, i) => (
          <li key={i} className="flex gap-3 text-sm text-[#4a6741] leading-relaxed border-b border-[#f0f7ee] pb-3 last:border-0 last:pb-0">
            {iconFor(f)}
            <span>{f}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
