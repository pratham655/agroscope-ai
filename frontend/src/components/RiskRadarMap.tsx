"use client";

import { useEffect, useRef } from "react";
import type { Map as LeafletMap } from "leaflet";

export interface RiskMapLocation {
  label: string;
  latitude: number;
  longitude: number;
  stress_score: number;
  stress_level: string;
  rainfall_mm: number;
  soil_wetness: number;
  top_crop?: string;
}

interface Props {
  locations: RiskMapLocation[];
  onSelectLocation?: (loc: RiskMapLocation) => void;
}

function getRiskColor(score: number): string {
  if (score >= 70) return "#dc2626"; // High/Severe
  if (score >= 50) return "#d97706"; // Elevated
  if (score >= 35) return "#ca8a04"; // Moderate
  return "#16a34a"; // Low/Resilient
}

export default function RiskRadarMap({ locations, onSelectLocation }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);

  useEffect(() => {
    let isCancelled = false;
    const domNode = containerRef.current;
    if (!domNode || typeof window === "undefined") return;

    if (mapRef.current) {
      try {
        mapRef.current.remove();
      } catch {
        // ignore
      }
      mapRef.current = null;
    }
    if ((domNode as unknown as { _leaflet_id?: unknown })._leaflet_id) {
      delete (domNode as unknown as { _leaflet_id?: unknown })._leaflet_id;
    }

    import("leaflet").then((L) => {
      import("leaflet/dist/leaflet.css" as never);
      if (isCancelled || !containerRef.current) return;

      const map = L.map(containerRef.current, {
        center: [20, 10],
        zoom: 2,
        minZoom: 2,
        maxZoom: 10,
        zoomControl: true,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        subdomains: ["a", "b", "c"],
        maxZoom: 18,
      }).addTo(map);

      // Add circle markers for each monitored region
      locations.forEach((loc) => {
        const color = getRiskColor(loc.stress_score);
        const circle = L.circleMarker([loc.latitude, loc.longitude], {
          radius: 9,
          fillColor: color,
          color: "#ffffff",
          weight: 2,
          opacity: 1,
          fillOpacity: 0.85,
        }).addTo(map);

        circle.bindTooltip(
          `<strong>${loc.label}</strong><br/>Stress: ${loc.stress_score}/100 (${loc.stress_level})`,
          { direction: "top", offset: [0, -8] }
        );

        circle.bindPopup(`
          <div style="font-family: inherit; font-size: 12px; min-width: 160px;">
            <div style="font-weight: bold; margin-bottom: 4px; color: #0f172a;">${loc.label}</div>
            <div style="color: ${color}; font-weight: bold; margin-bottom: 4px;">
              Stress Index: ${loc.stress_score}/100 (${loc.stress_level})
            </div>
            <div style="color: #64748b; font-size: 11px;">
              Rainfall: ${loc.rainfall_mm} mm<br/>
              Root Wetness: ${(loc.soil_wetness * 100).toFixed(1)}%<br/>
              Top Crop: ${loc.top_crop || "Wheat"}
            </div>
          </div>
        `);

        circle.on("click", () => {
          if (onSelectLocation) onSelectLocation(loc);
        });
      });

      setTimeout(() => {
        try {
          map.invalidateSize();
        } catch {
          // ignore
        }
      }, 200);

      mapRef.current = map;
    });

    return () => {
      isCancelled = true;
      if (mapRef.current) {
        try {
          mapRef.current.remove();
        } catch {
          // ignore
        }
        mapRef.current = null;
      }
    };
  }, [locations, onSelectLocation]);

  return (
    <div className="relative w-full rounded-xl overflow-hidden border border-slate-200 bg-slate-100 shadow-2xs">
      {/* Floating Legend */}
      <div className="absolute top-3 right-3 z-[400] bg-white/95 backdrop-blur-sm px-3 py-2 rounded-lg border border-slate-200 shadow-md text-xs space-y-1">
        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
          Vulnerability Tiers
        </div>
        <div className="flex flex-col gap-1 text-[11px]">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-600" />
            <span className="text-slate-700">High Risk (&ge;70)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-600" />
            <span className="text-slate-700">Elevated (50–69)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-yellow-600" />
            <span className="text-slate-700">Moderate (35–49)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
            <span className="text-slate-700">Resilient (&lt;35)</span>
          </div>
        </div>
      </div>

      <div
        ref={containerRef}
        className="w-full relative z-0"
        style={{ height: "420px", width: "100%" }}
      />
    </div>
  );
}
