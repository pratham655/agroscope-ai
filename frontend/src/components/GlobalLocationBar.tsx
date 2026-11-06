"use client";

import React from "react";
import { MapPin, Globe2, Calendar, Sprout, ChevronRight, Navigation } from "lucide-react";
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
        className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border border-[#d2e4d0] bg-[#f8faf7] hover:bg-[#f0f7ee] hover:border-[#2d7a3a] transition-all text-xs group ${className}`}
        title="Change global field location"
      >
        <MapPin className="h-3.5 w-3.5 text-[#2d7a3a]" />
        <span className="font-semibold text-[#1e3a1f] truncate max-w-[140px] sm:max-w-[200px]">
          {currentLocation.label}
        </span>
        <span className="font-mono text-gray-500 text-[11px] hidden md:inline">
          ({formattedCoords})
        </span>
        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
          Change
        </span>
      </button>
    );
  }

  return (
    <div
      className={`rounded-2xl border border-[#d2e4d0] bg-linear-to-r from-[#f8faf7] via-white to-[#f0f7ee] p-3.5 sm:p-4 shadow-xs ${className}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-2.5 rounded-xl bg-[#2d7a3a]/10 border border-[#2d7a3a]/20 text-[#2d7a3a] shrink-0">
            <Globe2 className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-[#2d7a3a] uppercase tracking-wider">
                Active Global Field
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                {hemisphereLabel}
              </span>
              <span className="text-gray-400 text-xs hidden sm:inline">•</span>
              <span className="text-gray-500 font-mono text-xs">{formattedCoords}</span>
            </div>
            <div className="text-sm sm:text-base font-extrabold text-[#1e3a1f] truncate mt-0.5">
              {currentLocation.label}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {currentLocation.crop && (
            <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-[#e2ece0] text-xs text-gray-700">
              <Sprout className="h-3.5 w-3.5 text-[#2d7a3a]" />
              <span className="font-medium truncate max-w-[120px]">{currentLocation.crop}</span>
            </div>
          )}

          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-[#e2ece0] text-xs text-gray-700">
            <Calendar className="h-3.5 w-3.5 text-[#2d7a3a]" />
            <span className="font-mono text-[11px]">
              {currentLocation.startDate} → {currentLocation.endDate}
            </span>
          </div>

          <button
            onClick={() => acquireGpsLocation().catch(() => openModal())}
            className="p-2 rounded-xl border border-[#d2e4d0] bg-white hover:bg-[#f0f7ee] text-gray-600 hover:text-[#2d7a3a] transition-colors"
            title="Use Device GPS Location"
          >
            <Navigation className="h-4 w-4" />
          </button>

          <button
            onClick={openModal}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#2d7a3a] text-white text-xs font-bold hover:bg-[#23632f] transition-all shadow-xs"
          >
            <span>Change Location</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
