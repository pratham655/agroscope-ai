"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Menu,
  X,
  ChevronDown,
  MapPin,
  Satellite,
  Layers,
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useLocation } from "@/context/LocationContext";

interface NavLink {
  href: string;
  label: string;
  shortLabel?: string;
}

const primaryLinks: NavLink[] = [
  { href: "/", label: "Overview", shortLabel: "Overview" },
  { href: "/analyze", label: "Field Intelligence", shortLabel: "Field Intel" },
  { href: "/explorer", label: "Earth Explorer", shortLabel: "Explorer" },
  { href: "/advisor", label: "Farmer Copilot", shortLabel: "Copilot" },
  { href: "/farm-futures", label: "Climate Simulation", shortLabel: "Simulation" },
  { href: "/water-intel", label: "Water Intelligence", shortLabel: "Water" },
  { href: "/phenology", label: "Phenology", shortLabel: "Phenology" },
  { href: "/risk-radar", label: "Risk Radar", shortLabel: "Risk Radar" },
  { href: "/time-machine", label: "Satellite History", shortLabel: "History" },
  { href: "/reports", label: "Reports", shortLabel: "Reports" },
];

const secondaryTools = [
  {
    href: "/change-detective",
    label: "Satellite Change Detective",
    desc: "Dual-swath synchronized before/after comparative analysis",
  },
  {
    href: "/field-boundary",
    label: "Field Boundary Intelligence",
    desc: "Polygon drawing, GeoJSON upload & parcel geodesics",
  },
  {
    href: "/history",
    label: "Temporal Data Archive",
    desc: "Long-term multi-year agroclimatic reanalysis history",
  },
  {
    href: "/about",
    label: "Scientific Methodology",
    desc: "Equations, peer-reviewed indices & NASA mission data sources",
  },
];

export default function Nav() {
  const pathname = usePathname();
  const { currentLocation, formattedCoords, openModal } = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const isSecondaryActive = secondaryTools.some((t) => pathname.startsWith(t.href));

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-slate-200/90 shadow-2xs">
      <div className="max-w-[1720px] mx-auto px-3 sm:px-5 lg:px-6 flex items-center justify-between h-14">
        {/* Brand Identity */}
        <div className="flex items-center gap-3 shrink-0">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-lg bg-[#0d3b2e] flex items-center justify-center text-emerald-400 font-bold shadow-xs transition-transform group-hover:scale-102">
              <Satellite className="w-4 h-4 text-emerald-300" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-bold tracking-tight text-slate-900 group-hover:text-[#0d3b2e] transition-colors leading-none">
                AGROSCOPE AI
              </span>
              <span className="text-[10px] font-medium tracking-wide text-slate-500 uppercase mt-0.5 leading-none">
                Geospatial Intelligence
              </span>
            </div>
          </Link>
        </div>

        {/* Primary Desktop Navigation */}
        <nav className="hidden xl:flex items-center gap-0.5 overflow-x-auto no-scrollbar mx-2">
          {primaryLinks.map((link) => {
            const isActive = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                  isActive
                    ? "bg-slate-100 text-[#0d3b2e] font-semibold"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                }`}
              >
                {link.shortLabel || link.label}
              </Link>
            );
          })}

          {/* Secondary Tools Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
                isSecondaryActive || dropdownOpen
                  ? "bg-slate-100 text-[#0d3b2e] font-semibold"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-slate-500" />
              <span>More</span>
              <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${dropdownOpen ? "rotate-180" : ""}`} />
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 mt-1.5 w-72 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-50 animate-in fade-in zoom-in-95 duration-100">
                <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-100">
                  Specialized Geospatial Modules
                </div>
                {secondaryTools.map((tool) => (
                  <Link
                    key={tool.href}
                    href={tool.href}
                    onClick={() => setDropdownOpen(false)}
                    className={`block px-3 py-2 text-xs transition-colors ${
                      pathname.startsWith(tool.href)
                        ? "bg-slate-50 text-[#0d3b2e] font-semibold"
                        : "text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                    }`}
                  >
                    <div className="font-medium">{tool.label}</div>
                    <div className="text-[11px] text-slate-500 line-clamp-1">{tool.desc}</div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </nav>

        {/* Global Context Controls & Provenance */}
        <div className="flex items-center gap-2">
          {/* Compact Global Location Pill */}
          <button
            onClick={openModal}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-slate-200 hover:border-slate-300 bg-slate-50 hover:bg-slate-100 transition text-xs text-slate-700 cursor-pointer max-w-[200px] sm:max-w-[260px]"
            title={`Active Location: ${currentLocation.label} (${formattedCoords}) — Click to change`}
          >
            <MapPin className="w-3.5 h-3.5 text-[#0d3b2e] shrink-0" />
            <span className="font-semibold text-slate-900 truncate">
              {currentLocation.label}
            </span>
            <span className="text-[11px] font-mono text-slate-500 hidden md:inline shrink-0">
              {currentLocation.latitude.toFixed(2)}°, {currentLocation.longitude.toFixed(2)}°
            </span>
            <span className="text-[9px] font-bold px-1 py-0.2 rounded bg-emerald-100 text-emerald-800 shrink-0">
              EDIT
            </span>
          </button>

          {/* NASA Space Apps Attribution */}
          <div className="hidden lg:flex items-center gap-1.5 px-2 py-1 rounded-md bg-slate-50 border border-slate-200 text-[11px] text-slate-600 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>NASA Space Apps</span>
          </div>

          {/* Mobile Navigation Toggle */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="xl:hidden p-1.5 rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            aria-label="Toggle Navigation Menu"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5 text-slate-700" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileOpen && (
        <div className="xl:hidden border-t border-slate-200 bg-white px-4 py-3 space-y-1 shadow-lg max-h-[85vh] overflow-y-auto">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1">
            Core Workspaces
          </div>
          {primaryLinks.map((link) => {
            const isActive = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className={`block px-3 py-2 rounded-md text-xs font-medium ${
                  isActive
                    ? "bg-slate-100 text-[#0d3b2e] font-semibold"
                    : "text-slate-700 hover:bg-slate-50"
                }`}
              >
                {link.label}
              </Link>
            );
          })}

          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 pt-3 pb-1">
            Specialized Modules
          </div>
          {secondaryTools.map((tool) => (
            <Link
              key={tool.href}
              href={tool.href}
              onClick={() => setMobileOpen(false)}
              className={`block px-3 py-2 rounded-md text-xs font-medium ${
                pathname.startsWith(tool.href)
                  ? "bg-slate-100 text-[#0d3b2e] font-semibold"
                  : "text-slate-700 hover:bg-slate-50"
              }`}
            >
              <div>{tool.label}</div>
              <div className="text-[10px] text-slate-500">{tool.desc}</div>
            </Link>
          ))}

          <div className="pt-3 border-t border-slate-100 mt-2">
            <button
              onClick={() => {
                setMobileOpen(false);
                openModal();
              }}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-md bg-[#0d3b2e] text-white text-xs font-semibold"
            >
              <MapPin className="w-3.5 h-3.5 text-emerald-400" />
              <span>Change Active Global Location</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
