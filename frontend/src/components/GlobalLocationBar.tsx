"use client";

import React from "react";
import { MapPin, Globe2, Calendar, Sprout, Navigation } from "lucide-react";
import { useLocation } from "@/context/LocationContext";

interface Props {
  className?: string;
  compact?: boolean;
}

export default function GlobalLocationBar({ className = "", compact = false }: Props) {
  const { currentLocation, formattedCoords, hemisphereLabel, openModal, acquireGpsLocation } = useLocation();

  if (compact) {
    return (
      <button
        onClick={openModal}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 transition text-xs font-medium text-slate-700 cursor-pointer shadow-2xs ${className}`}
        title="Change global field location"
      >
        <MapPin className="h-3.5 w-3.5 text-[#0d3b2e]" />
        <span className="font-semibold text-slate-900 truncate max-w-[160px] sm:max-w-[220px]">
          {currentLocation.label}
        </span>
        <span className="font-mono text-slate-500 text-[11px] hidden sm:inline">
          ({formattedCoords})
        </span>
        <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-slate-100 text-slate-700">
          Change
        </span>
      </button>
    );
  }

  return (
    <div
      className={`rounded-lg border border-slate-200 bg-white p-3 sm:p-4 shadow-2xs ${className}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-2 rounded-md bg-slate-100 border border-slate-200 text-[#0d3b2e] shrink-0">
            <Globe2 className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Active Coordinate Target
              </span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                {hemisphereLabel}
              </span>
              <span className="text-slate-300 text-xs hidden sm:inline">•</span>
              <span className="text-slate-600 font-mono text-xs">{formattedCoords}</span>
            </div>
            <div className="text-sm sm:text-base font-bold text-slate-900 truncate mt-0.5">
              {currentLocation.label}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {currentLocation.crop && (
            <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-50 border border-slate-200 text-xs text-slate-700">
              <Sprout className="h-3.5 w-3.5 text-[#0d3b2e]" />
              <span className="font-medium truncate max-w-[130px]">{currentLocation.crop}</span>
            </div>
          )}

          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-50 border border-slate-200 text-xs text-slate-700">
            <Calendar className="h-3.5 w-3.5 text-slate-500" />
            <span className="font-mono text-[11px]">
              {currentLocation.startDate} → {currentLocation.endDate}
            </span>
          </div>

          <button
            onClick={() => acquireGpsLocation().catch(() => openModal())}
            className="p-1.5 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 transition-colors"
            title="Use Device GPS Location"
          >
            <Navigation className="h-4 w-4" />
          </button>

          <button
            onClick={openModal}
            className="px-3 py-1.5 rounded-md bg-[#0d3b2e] hover:bg-[#134e39] text-white text-xs font-semibold shadow-2xs transition-colors flex items-center gap-1.5"
          >
            <MapPin className="h-3.5 w-3.5 text-emerald-400" />
            <span>Select Location</span>
          </button>
        </div>
      </div>
    </div>
  );
}
