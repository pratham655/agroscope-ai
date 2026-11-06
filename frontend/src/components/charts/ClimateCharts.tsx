"use client";

import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine
} from "recharts";
import { useState } from "react";
import { formatDate } from "@/lib/api";
import type { FieldReport } from "@/lib/api";

type ClimateData = FieldReport["climate"];

interface Props { climate: ClimateData; isDemo: boolean }

type Tab = "temperature" | "precipitation" | "spi" | "soil" | "gdd";

function buildTempData(climate: ClimateData) {
  const dates  = climate.temperature.dates;
  const means  = climate.temperature.values;
  const step   = Math.max(1, Math.ceil(dates.length / 120));
  return dates
    .filter((_, i) => i % step === 0)
    .map((d, i) => ({
      date:  formatDate(d),
      mean:  means[i * step] ?? null,
    }));
}

function buildPrecipData(climate: ClimateData) {
  const dates  = climate.precipitation.dates;
  const values = climate.precipitation.values;
  const step   = Math.max(1, Math.ceil(dates.length / 90));
  return dates
    .filter((_, i) => i % step === 0)
    .map((d, i) => ({ date: formatDate(d), precip: values[i * step] ?? null }));
}

function buildSPIData(climate: ClimateData) {
  const dates  = climate.spi_3.dates;
  const values = climate.spi_3.values;
  const step   = Math.max(1, Math.ceil(dates.length / 90));
  return dates
    .filter((_, i) => i % step === 0)
    .map((d, i) => ({ date: formatDate(d), spi: values[i * step] ?? null }));
}

function buildGDDData(climate: ClimateData) {
  const dates  = climate.gdd.dates;
  const values = climate.gdd.values;
  const step   = Math.max(1, Math.ceil(dates.length / 90));
  return dates
    .filter((_, i) => i % step === 0)
    .map((d, i) => ({ date: formatDate(d), gdd: values[i * step] ?? null }));
}

export default function ClimateCharts({ climate, isDemo }: Props) {
  const [tab, setTab] = useState<Tab>("temperature");

  const tabs: { id: Tab; label: string }[] = [
    { id: "temperature",   label: "Temperature" },
    { id: "precipitation", label: "Precipitation" },
    { id: "spi",           label: "Precip. Anomaly Index" },
    { id: "gdd",           label: "Growing Degree Days" },
  ];

  return (
    <div className="card">
      <div className="flex flex-wrap gap-2 mb-5">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              tab === t.id ? "bg-[#2d7a3a] text-white" : "bg-[#f0f7ee] text-[#4a6741] hover:bg-[#e2ece0]"
            }`}>
            {t.label}
          </button>
        ))}
        {isDemo && <span className="ml-auto text-xs text-amber-700 bg-amber-50 border border-amber-200 px-2 py-1 rounded self-center">Demo Data</span>}
      </div>

      {tab === "temperature" && (
        <div>
          <div className="flex items-baseline justify-between mb-3">
            <h3 className="font-semibold text-[#1a2e1a]">Daily Temperature (2m)</h3>
            <div className="text-sm text-[#4a6741]">
              Mean: <strong>{climate.temperature.mean?.toFixed(1)}°C</strong>
              {climate.temperature.trend?.significant && (
                <span className={`ml-3 text-xs font-medium ${climate.temperature.trend.direction === "increasing" ? "text-red-600" : "text-blue-600"}`}>
                  ↗ {climate.temperature.trend.direction} trend (p={climate.temperature.trend.p_value?.toFixed(3)})
                </span>
              )}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={buildTempData(climate)} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2ece0" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 10 }} tickLine={false} unit="°C" />
              <Tooltip contentStyle={{ borderRadius: "0.75rem", border: "1px solid #e2ece0", fontSize: "12px" }} formatter={(v: unknown) => [`${(v as number)?.toFixed(1)}°C`, "Temp"]} />
              <Line type="monotone" dataKey="mean" stroke="#f97316" strokeWidth={2} dot={false} name="Temperature" />
            </LineChart>
          </ResponsiveContainer>
          <p className="text-xs text-[#4a6741] mt-2">Source: NASA POWER T2M (2m air temperature, MERRA-2 reanalysis) · Units: °C</p>
        </div>
      )}

      {tab === "precipitation" && (
        <div>
          <div className="flex items-baseline justify-between mb-3">
            <h3 className="font-semibold text-[#1a2e1a]">Daily Precipitation</h3>
            <div className="text-sm text-[#4a6741]">Total: <strong>{climate.precipitation.total_mm?.toFixed(0)} mm</strong></div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={buildPrecipData(climate)} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2ece0" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 10 }} tickLine={false} unit="mm" />
              <Tooltip contentStyle={{ borderRadius: "0.75rem", border: "1px solid #e2ece0", fontSize: "12px" }} formatter={(v: unknown) => [`${(v as number)?.toFixed(1)} mm`, "Precip"]} />
              <Bar dataKey="precip" fill="#1e6fa8" radius={[2, 2, 0, 0]} name="Precipitation" />
            </BarChart>
          </ResponsiveContainer>
          <p className="text-xs text-[#4a6741] mt-2">Source: NASA POWER PRECTOTCORR (bias-corrected precipitation, MERRA-2) · Units: mm/day</p>
        </div>
      )}

      {tab === "spi" && (
        <div>
          <div className="mb-3">
            <h3 className="font-semibold text-[#1a2e1a]">Precipitation Anomaly Index (3-day SPI proxy)</h3>
            <p className="text-xs text-[#4a6741] mt-1">
              Based on McKee et al. (1993) SPI method · Applied to <strong>daily</strong> 3-day rolling
              accumulations from NASA POWER (not standard monthly SPI-3) · Gamma fit → standard normal transform.
              <span className="ml-1 text-amber-700 font-medium">
                Note: standard SPI-3 uses 3-month accumulations. This is a daily proxy — directionally valid
                but not equivalent to the published monthly SPI-3 drought index.
              </span>
            </p>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={buildSPIData(climate)} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2ece0" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 10 }} tickLine={false} domain={[-3, 3]} />
              <Tooltip contentStyle={{ borderRadius: "0.75rem", border: "1px solid #e2ece0", fontSize: "12px" }} formatter={(v: unknown) => [(v as number)?.toFixed(2), "Precip. Anomaly Index"]} />
              <ReferenceLine y={-1.0} stroke="#f97316" strokeDasharray="4 2" label={{ value: "Moderate Dry", fontSize: 9, fill: "#f97316", position: "insideTopRight" }} />
              <ReferenceLine y={-1.5} stroke="#dc2626" strokeDasharray="4 2" label={{ value: "Severe Dry", fontSize: 9, fill: "#dc2626", position: "insideTopRight" }} />
              <ReferenceLine y={1.0}  stroke="#1e6fa8" strokeDasharray="4 2" />
              <Bar dataKey="spi" name="SPI-3"
                fill="#2d7a3a"
                radius={[2, 2, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
          <div className="grid grid-cols-4 gap-2 mt-3">
            {[
              { label: "Extremely Dry", range: "≤ −2.0", color: "#dc2626" },
              { label: "Severely Dry",  range: "−1.5 to −2.0", color: "#f97316" },
              { label: "Moderately Dry",range: "−1.0 to −1.5", color: "#fcd34d" },
              { label: "Near Normal",   range: "−1.0 to +1.0", color: "#86efac" },
            ].map(s => (
              <div key={s.label} className="text-xs text-center">
                <div className="h-1.5 rounded" style={{ background: s.color }} />
                <div className="text-[#4a6741] mt-1">{s.label}</div>
                <div className="text-[#94a3b8] font-mono">{s.range}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "gdd" && (
        <div>
          <div className="flex items-baseline justify-between mb-3">
            <h3 className="font-semibold text-[#1a2e1a]">Cumulative Growing Degree Days</h3>
            <div className="text-sm text-[#4a6741]">
              Total: <strong>{climate.gdd.cumulative.toFixed(0)} °C·day</strong>
              <span className="ml-2 text-xs">(base {climate.gdd.t_base}°C)</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={buildGDDData(climate)} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2ece0" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 10 }} tickLine={false} unit="°C·d" />
              <Tooltip contentStyle={{ borderRadius: "0.75rem", border: "1px solid #e2ece0", fontSize: "12px" }} formatter={(v: unknown) => [`${(v as number)?.toFixed(0)} °C·day`, "Cum. GDD"]} />
              <Line type="monotone" dataKey="gdd" stroke="#2d7a3a" strokeWidth={2.5} dot={false} name="Cum. GDD" />
              {/* Reference lines for common crops */}
              {[
                { gdd: 800,  label: "Wheat ~800",  color: "#8b5e3c" },
                { gdd: 1000, label: "Soybean ~1000", color: "#2d7a3a" },
                { gdd: 1200, label: "Maize ~1200",   color: "#f97316" },
              ].map(r => (
                <ReferenceLine key={r.label} y={r.gdd} stroke={r.color} strokeDasharray="5 3"
                  label={{ value: r.label, fontSize: 9, fill: r.color, position: "insideTopRight" }} />
              ))}
            </LineChart>
          </ResponsiveContainer>
          <p className="text-xs text-[#4a6741] mt-2">Formula: GDD = max((T_max_cap + T_min_eff)/2 − T_base, 0) · McMaster & Wilhelm (1997)</p>
        </div>
      )}
    </div>
  );
}
