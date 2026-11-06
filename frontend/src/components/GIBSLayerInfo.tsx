"use client";

import { Layers } from "lucide-react";
import type { GibsLayer } from "@/lib/api";

interface Props { layers: GibsLayer[] }

export default function GIBSLayerInfo({ layers }: Props) {
  return (
    <div className="card">
      <h3 className="font-semibold text-[#1a2e1a] mb-2 flex items-center gap-2">
        <Layers className="h-5 w-5 text-[#1e6fa8]" />
        NASA GIBS Satellite Imagery Layers
      </h3>
      <p className="text-xs text-[#4a6741] mb-4">
        These WMTS tile URLs stream directly from NASA GIBS — no download or authentication required.
        Use them in Leaflet / MapLibre via the Earth Explorer page.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {layers.map(l => (
          <div key={l.key} className="bg-[#f0f7ee] rounded-lg p-3">
            <div className="font-medium text-[#1a2e1a] text-sm mb-1">{l.name}</div>
            <div className="text-xs text-[#4a6741] mb-2">{l.source}</div>
            {l.units && <div className="text-xs text-[#2d7a3a] font-mono bg-white rounded px-1.5 py-0.5 inline-block mb-2">{l.units}</div>}
            <div className="text-xs font-mono text-[#94a3b8] break-all">{l.tile_url.slice(0, 60)}…</div>
          </div>
        ))}
      </div>
      <p className="text-xs text-[#4a6741] mt-3">
        Attribution: <a href="https://earthdata.nasa.gov/gibs" target="_blank" rel="noopener noreferrer" className="text-[#1e6fa8] hover:underline">
          NASA GIBS (https://earthdata.nasa.gov/gibs)
        </a>
      </p>
    </div>
  );
}
