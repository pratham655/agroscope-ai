"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Leaf, Menu, X, ChevronDown, Compass, FlaskConical, Droplets, MapPin, BarChart3, ScanEye, Clock } from "lucide-react";
import { useState } from "react";
import { useLocation } from "@/context/LocationContext";

interface NavItem {
  href: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  desc?: string;
}

const mainLinks: NavItem[] = [
  { href: "/", label: "Home" },
  { href: "/analyze", label: "Field Intelligence" },
  { href: "/advisor", label: "Farmer Copilot" },
  { href: "/explorer", label: "Earth Explorer (3D/2D)" },
];

const capabilities: NavItem[] = [
  { href: "/farm-futures", label: "Farm Futures Lab", icon: FlaskConical, desc: "Climate sensitivity & stress simulation" },
  { href: "/time-machine", label: "Satellite Time Machine", icon: Clock, desc: "Multi-year time-lapse & seasonal trajectories" },
  { href: "/change-detective", label: "Satellite Change Detective", icon: ScanEye, desc: "Before/after satellite & indicator comparison" },
  { href: "/water-intel", label: "Smart Water Intelligence", icon: Droplets, desc: "Root-zone wetness & drought risk dashboard" },
  { href: "/phenology", label: "Crop Phenology Tracker", icon: BarChart3, desc: "Multi-year vegetation curves & green-up" },
  { href: "/risk-radar", label: "Regional Risk Radar", icon: Compass, desc: "Multi-regional agricultural vulnerability rankings" },
  { href: "/field-boundary", label: "Field Boundary Intelligence", icon: MapPin, desc: "Polygon delineation & land metrics" },
];

const secondaryLinks: NavItem[] = [
  { href: "/history", label: "History" },
  { href: "/reports", label: "Reports" },
  { href: "/about", label: "Methodology" },
];

export default function Nav() {
  const pathname = usePathname();
  const { currentLocation, openModal } = useLocation();
  const [open, setOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);

  const isCapabilitiesActive = capabilities.some((c) => pathname.startsWith(c.href));

  return (
    <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-[#e2ece0] shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-2 font-bold text-[#2d7a3a]">
          <Leaf className="h-6 w-6 text-[#2d7a3a]" />
          <span className="text-lg tracking-tight font-extrabold">AGROSCOPE AI</span>
        </Link>

        {/* Desktop links */}
        <div className="hidden lg:flex items-center gap-1">
          {mainLinks.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                pathname === l.href
                  ? "bg-[#2d7a3a] text-white shadow-xs"
                  : "text-[#4a6741] hover:bg-[#f0f7ee]"
              }`}
            >
              {l.label}
            </Link>
          ))}

          {/* Capabilities Dropdown */}
          <div className="relative">
            <button
              onClick={() => setToolsOpen(!toolsOpen)}
              onBlur={() => setTimeout(() => setToolsOpen(false), 200)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                isCapabilitiesActive
                  ? "bg-[#2d7a3a] text-white shadow-xs"
                  : "text-[#4a6741] hover:bg-[#f0f7ee]"
              }`}
            >
              <span>Adaptation Suite</span>
              <ChevronDown className="h-4 w-4" />
            </button>

            {toolsOpen && (
              <div className="absolute left-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-[#e2ece0] p-2 z-50">
                <div className="text-[10px] font-bold text-[#6b8f64] px-3 py-1 uppercase tracking-wider">
                  Advanced Earth Observation Modules
                </div>
                {capabilities.map((c) => {
                  const Icon = c.icon;
                  return (
                    <Link
                      key={c.href}
                      href={c.href}
                      onClick={() => setToolsOpen(false)}
                      className={`flex items-start gap-3 p-2.5 rounded-lg transition-colors ${
                        pathname === c.href ? "bg-[#f0f7ee] text-[#2d7a3a]" : "hover:bg-[#f8faf7] text-[#2a3826]"
                      }`}
                    >
                      <div className="p-1.5 rounded-md bg-[#eef7ec] text-[#2d7a3a]">
                        {Icon && <Icon className="h-4 w-4" />}
                      </div>
                      <div>
                        <div className="text-xs font-semibold">{c.label}</div>
                        <div className="text-[11px] text-gray-500 leading-tight">{c.desc}</div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {secondaryLinks.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                pathname === l.href
                  ? "bg-[#2d7a3a] text-white shadow-xs"
                  : "text-[#4a6741] hover:bg-[#f0f7ee]"
              }`}
            >
              {l.label}
            </Link>
          ))}
        </div>

        {/* Location & NASA badge */}
        <div className="hidden md:flex items-center gap-2">
          {currentLocation && (
            <button
              onClick={openModal}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#f0f7ee] hover:bg-[#e2ece0] text-xs font-semibold text-[#2d7a3a] border border-[#d2e4d0] transition cursor-pointer max-w-[200px]"
              title="Click to change active global location"
            >
              <MapPin className="h-3.5 w-3.5 text-[#2d7a3a] shrink-0" />
              <span className="truncate">{currentLocation.label}</span>
            </button>
          )}

          <div className="text-xs text-[#2d7a3a] font-semibold bg-[#eef7ec] px-3 py-1 rounded-full border border-[#c5dfc2] flex items-center gap-1.5 shadow-2xs">
            <span>🛰️</span>
            <span>NASA Space Apps 2026</span>
          </div>
        </div>

        {/* Mobile menu toggle */}
        <button
          className="lg:hidden p-2 text-[#2d7a3a] hover:bg-[#f0f7ee] rounded-md"
          onClick={() => setOpen(!open)}
          aria-label="Toggle Menu"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="lg:hidden border-t border-[#e2ece0] bg-white px-4 py-4 space-y-2 max-h-[85vh] overflow-y-auto">
          <div className="text-xs font-bold text-gray-400 uppercase tracking-wider px-2">Core Navigation</div>
          {mainLinks.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className={`block px-3 py-2 rounded-lg text-sm font-medium ${
                pathname === l.href ? "bg-[#2d7a3a] text-white" : "text-[#4a6741] hover:bg-[#f0f7ee]"
              }`}
            >
              {l.label}
            </Link>
          ))}

          <div className="text-xs font-bold text-gray-400 uppercase tracking-wider px-2 pt-2">Adaptation Suite</div>
          {capabilities.map((c) => {
            const Icon = c.icon;
            return (
              <Link
                key={c.href}
                href={c.href}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium ${
                  pathname === c.href ? "bg-[#2d7a3a] text-white" : "text-[#4a6741] hover:bg-[#f0f7ee]"
                }`}
              >
                {Icon && <Icon className="h-4 w-4" />}
                <span>{c.label}</span>
              </Link>
            );
          })}

          <div className="text-xs font-bold text-gray-400 uppercase tracking-wider px-2 pt-2">Resources</div>
          {secondaryLinks.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className={`block px-3 py-2 rounded-lg text-sm font-medium ${
                pathname === l.href ? "bg-[#2d7a3a] text-white" : "text-[#4a6741] hover:bg-[#f0f7ee]"
              }`}
            >
              {l.label}
            </Link>
          ))}
        </div>
      )}
    </nav>
  );
}
