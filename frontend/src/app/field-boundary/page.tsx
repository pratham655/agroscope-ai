"use client";

import { useState, useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import { MapPin, Upload, AlertTriangle, Globe2, Compass, Layers } from "lucide-react";
import { analyzeFieldBoundary, type BoundaryAnalysisResult } from "@/lib/api";
import { useLocation } from "@/context/LocationContext";

const FieldBoundaryMap = dynamic(() => import("@/components/FieldBoundaryMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[520px] rounded-xl bg-slate-900 flex flex-col items-center justify-center text-slate-300 gap-2 border border-slate-700">
      <Globe2 className="h-8 w-8 text-emerald-400 animate-spin" />
      <div className="text-xs font-semibold text-white">
        Projecting Field Boundary onto NASA GIBS Surface Reflectance...
      </div>
    </div>
  ),
});

function parsePolygonGeometry(input: unknown): { type: "Polygon"; coordinates: number[][][] } {
  if (!input || typeof input !== "object") throw new Error("GeoJSON must be an object.");
  const candidate = input as { type?: string; geometry?: unknown; coordinates?: unknown };
  const geometry = candidate.type === "Feature" ? candidate.geometry as { type?: string; coordinates?: unknown } : candidate;
  if (!geometry || geometry.type !== "Polygon" || !Array.isArray(geometry.coordinates)) {
    throw new Error("Only GeoJSON Polygon or Feature<Polygon> files are supported.");
  }
  const raw = geometry.coordinates as unknown[];
  const rings = Array.isArray(raw[0]) && Array.isArray((raw[0] as unknown[])[0])
    ? raw as number[][][]
    : [raw as number[][]];
  const outer = rings[0];
  if (!Array.isArray(outer) || outer.length < 4 || outer.some((point) =>
    !Array.isArray(point) || point.length < 2 ||
    !Number.isFinite(point[0]) || !Number.isFinite(point[1]) ||
    point[0] < -180 || point[0] > 180 || point[1] < -90 || point[1] > 90
  )) {
    throw new Error("Polygon coordinates must contain at least four valid [longitude, latitude] positions.");
  }
  return { type: "Polygon", coordinates: rings };
}

const PRESET_POLYGONS = [
  {
    name: "Kansas Wheat Field #4 (180 ha)",
    coordinates: [
      [-98.127683, 38.338974],
      [-98.112317, 38.338974],
      [-98.112317, 38.351026],
      [-98.127683, 38.351026],
      [-98.127683, 38.338974],
    ],
  },
  {
    name: "Iowa Corn Demo Plot (95 ha)",
    coordinates: [
      [-93.630878, 41.850622],
      [-93.619122, 41.850622],
      [-93.619122, 41.859378],
      [-93.630878, 41.859378],
      [-93.630878, 41.850622],
    ],
  },
  {
    name: "Punjab Agroforestry (120 ha)",
    coordinates: [
      [76.774276, 30.730080],
      [76.785724, 30.730080],
      [76.785724, 30.739920],
      [76.774276, 30.739920],
      [76.774276, 30.730080],
    ],
  },
  {
    name: "California Almond Orchard (65 ha)",
    coordinates: [
      [-119.779519, 36.741379],
      [-119.770481, 36.741379],
      [-119.770481, 36.748621],
      [-119.779519, 36.748621],
      [-119.779519, 36.741379],
    ],
  },
];

export default function FieldBoundaryPage() {
  const { currentLocation } = useLocation();
  const [fieldName, setFieldName] = useState("Kansas Wheat Field #4 (180 ha)");
  const [geoJsonText, setGeoJsonText] = useState(
    JSON.stringify(
      {
        type: "Polygon",
        coordinates: PRESET_POLYGONS[0].coordinates,
      },
      null,
      2
    )
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BoundaryAnalysisResult | null>(null);

  const generateBoundaryForActiveLocation = useCallback(() => {
    if (!currentLocation || typeof currentLocation.latitude !== "number" || typeof currentLocation.longitude !== "number") return;
    const clat = currentLocation.latitude;
    const clon = currentLocation.longitude;
    const dlat = 0.009;
    const dlon = 0.009 / Math.max(0.1, Math.cos((clat * Math.PI) / 180));
    const coords = [
      [Number((clon - dlon).toFixed(5)), Number((clat - dlat).toFixed(5))],
      [Number((clon + dlon).toFixed(5)), Number((clat - dlat).toFixed(5))],
      [Number((clon + dlon).toFixed(5)), Number((clat + dlat).toFixed(5))],
      [Number((clon - dlon).toFixed(5)), Number((clat + dlat).toFixed(5))],
      [Number((clon - dlon).toFixed(5)), Number((clat - dlat).toFixed(5))],
    ];
    setFieldName(currentLocation.label ? `${currentLocation.label} Parcel` : `Parcel at ${clat.toFixed(4)}, ${clon.toFixed(4)}`);
    setGeoJsonText(
      JSON.stringify(
        {
          type: "Polygon",
          coordinates: coords,
        },
        null,
        2
      )
    );
  }, [currentLocation]);

  const activeCoords = useMemo(() => {
    try {
      return parsePolygonGeometry(JSON.parse(geoJsonText)).coordinates[0] ?? [];
    } catch {
      return [];
    }
  }, [geoJsonText]);

  const runAnalysis = useCallback(async () => {
    setError(null);
    let parsedGeom: { type: "Polygon"; coordinates: number[][][] };
    try {
      parsedGeom = parsePolygonGeometry(JSON.parse(geoJsonText));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Invalid GeoJSON Polygon.");
      return;
    }

    setLoading(true);
    try {
      const data = await analyzeFieldBoundary({
        fieldName,
        geometry: parsedGeom,
      });
      setResult(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to analyze field polygon.");
    } finally {
      setLoading(false);
    }
  }, [fieldName, geoJsonText]);

  const loadPreset = (preset: (typeof PRESET_POLYGONS)[0]) => {
    setFieldName(preset.name);
    setGeoJsonText(
      JSON.stringify(
        {
          type: "Polygon",
          coordinates: preset.coordinates,
        },
        null,
        2
      )
    );
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setGeoJsonText(content);
      setFieldName(file.name.replace(/\.[^/.]+$/, ""));
    };
    reader.readAsText(file);
  };

  return (
    <div className="max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-8 py-5 space-y-5">
      {/* ── Feature Discovery Banner: Field Boundary Intelligence ─────── */}
      <div className="grad-boundary rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-3xl">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-white/20 text-white backdrop-blur-sm border border-white/30">
                Vector Geometry & Parcels
              </span>
              <span className="text-xs text-emerald-200 font-mono">GeoJSON · Geodesics · Surface Reflectance</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
              Field Boundary Intelligence: Vector Parcel Geometry & Geodesic Telemetry
            </h1>
            <p className="text-xs sm:text-sm text-emerald-100/90 leading-relaxed">
              Delineate agricultural parcels with GeoJSON boundaries, inspect approximate parcel area and perimeter, and overlay NASA satellite imagery with regional agroclimatological context. Climate indicators remain regional reanalysis estimates, not sub-field measurements.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <span className="px-3 py-1.5 rounded-lg bg-black/25 backdrop-blur-md border border-white/20 text-xs font-mono text-emerald-200">
              WGS-84 Coordinates &bull; Regional Telemetry
            </span>
          </div>
        </div>
      </div>

      {/* ── Action Console Bar ────────────────────────────────────── */}
      <div className="bg-white rounded-xl p-4 sm:p-5 border border-slate-200 shadow-2xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-[#0d3b2e] text-emerald-400">
              <MapPin className="h-4 w-4" />
            </span>
            <h2 className="text-lg font-bold tracking-tight text-slate-900">
              Parcel Delineation Console
            </h2>
            <span className="text-[10px] font-semibold uppercase text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              Vector Geodesics
            </span>
          </div>
          <p className="text-xs text-slate-500 max-w-3xl leading-relaxed">
            Delineate field parcels from GeoJSON polygons. Review approximate area, perimeter and centroid, then run regional NASA POWER analysis at the parcel centroid.
          </p>
        </div>

        <button
          onClick={runAnalysis}
          disabled={loading}
          className="flex items-center gap-2 px-5 py-2 rounded-md bg-[#0d3b2e] hover:bg-[#134e39] text-white text-xs font-semibold shadow-2xs transition disabled:opacity-50 cursor-pointer shrink-0"
        >
          {loading ? (
            <>
              <Globe2 className="h-3.5 w-3.5 animate-spin text-emerald-400" />
              <span>Computing Geometry...</span>
            </>
          ) : (
            <>
              <MapPin className="h-3.5 w-3.5 text-emerald-400" />
              <span>Analyze Parcel Geometry</span>
            </>
          )}
        </button>
      </div>

      {/* ── Configuration Console ────────────────────────────────────── */}
      <div className="bg-white rounded-xl p-4 sm:p-5 border border-slate-200 shadow-2xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
          <span className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
            <Compass className="w-3.5 h-3.5 text-[#0d3b2e]" />
            <span>Preset Parcels &amp; Actions</span>
          </span>
          <div className="flex items-center gap-1.5 flex-wrap">
            {PRESET_POLYGONS.map((p) => (
              <button
                key={p.name}
                onClick={() => loadPreset(p)}
                className={`text-[11px] px-2 py-0.5 rounded-md border transition ${
                  fieldName === p.name
                    ? "bg-[#0d3b2e] text-white border-[#0d3b2e]"
                    : "border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700"
                }`}
              >
                {p.name.split(" (")[0]}
              </button>
            ))}

            {currentLocation && typeof currentLocation.latitude === "number" && (
              <button
                onClick={generateBoundaryForActiveLocation}
                className="text-[11px] px-2 py-0.5 rounded-md border border-emerald-200 bg-emerald-50 text-emerald-900 font-semibold hover:bg-emerald-100 transition"
              >
                Generate for Active Target
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-end">
          <div className="lg:col-span-8">
            <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
              Field Identifier / Parcel Name
            </label>
            <input
              value={fieldName}
              onChange={(e) => setFieldName(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-md outline-none focus:border-[#0d3b2e] focus:bg-white transition"
            />
          </div>
          <div className="lg:col-span-4 flex items-center gap-2">
            <label className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-md text-xs font-medium text-slate-700 cursor-pointer transition">
              <Upload className="w-3.5 h-3.5 text-slate-500" />
              <span>Upload GeoJSON File</span>
              <input type="file" accept=".geojson,.json" onChange={handleFileUpload} className="hidden" />
            </label>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0 text-red-600" />
          <span>{error}</span>
        </div>
      )}

      {/* ── Main Layout: Map (7 cols) + GeoJSON Editor / Results (5 cols) ── */}
      <div className="grid grid-cols-1 gap-5 items-start">
        {/* Interactive Boundary Map */}
        <div className="w-full min-w-0 space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-[#0d3b2e]" />
              <span>Live Parcel Boundary Map</span>
            </h2>
            <span className="text-[10px] text-slate-500 font-mono">
              EPSG:4326 WGS-84 &bull; EPSG:3857 Display
            </span>
          </div>

          <FieldBoundaryMap
            coordinates={activeCoords}
            fieldName={fieldName}
            centroid={result ? result.boundary_metrics.centroid : undefined}
          />
        </div>

        {/* Right: GeoJSON Editor & Calculated Metrics */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 items-start">
          {/* GeoJSON Polygon Editor */}
          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs space-y-2">
            <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                GeoJSON Polygon Definition
              </span>
              <span className="text-[10px] text-slate-400 font-mono">WGS-84 [Lon, Lat]</span>
            </div>

            <textarea
              rows={8}
              value={geoJsonText}
              onChange={(e) => setGeoJsonText(e.target.value)}
              className="w-full p-2.5 text-xs font-mono bg-slate-50 border border-slate-200 rounded-md outline-none focus:border-[#0d3b2e] focus:bg-white transition"
              spellCheck={false}
            />
          </div>

          {/* Results Summary */}
          {result && (
            <div className="bg-white rounded-xl p-4 sm:p-5 border border-slate-200 shadow-2xs space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div>
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Geodesic Metrics
                  </h3>
                  <div className="text-xs font-bold text-[#0d3b2e] mt-0.5">{result.field_name}</div>
                </div>
                <span className="text-[10px] font-mono text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  Calculated
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                  <div className="text-[10px] text-slate-500 uppercase font-semibold">Area</div>
                  <div className="text-base font-bold font-mono text-slate-900 mt-0.5">
                    {result.boundary_metrics.area_hectares.toFixed(1)} ha
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono">
                    {(result.boundary_metrics.area_hectares * 2.47105).toFixed(1)} acres
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                  <div className="text-[10px] text-slate-500 uppercase font-semibold">Perimeter</div>
                  <div className="text-base font-bold font-mono text-slate-900 mt-0.5">
                    {result.boundary_metrics.perimeter_km.toFixed(2)} km
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono">
                    {(result.boundary_metrics.perimeter_km * 1000).toFixed(0)} meters
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                  <div className="text-[10px] text-slate-500 uppercase font-semibold">Centroid Latitude</div>
                  <div className="text-sm font-bold font-mono text-slate-900 mt-0.5">
                    {Math.abs(result.boundary_metrics.centroid.latitude).toFixed(4)}°{result.boundary_metrics.centroid.latitude >= 0 ? "N" : "S"}
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                  <div className="text-[10px] text-slate-500 uppercase font-semibold">Centroid Longitude</div>
                  <div className="text-sm font-bold font-mono text-slate-900 mt-0.5">
                    {Math.abs(result.boundary_metrics.centroid.longitude).toFixed(4)}°{result.boundary_metrics.centroid.longitude >= 0 ? "E" : "W"}
                  </div>
                </div>
              </div>

              {/* Climate Overlay on Parcel Centroid */}
              <div className="pt-2 border-t border-slate-100 space-y-2">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Agroclimatic Telemetry at Centroid
                </span>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2 rounded bg-slate-50 border border-slate-200">
                    <div className="text-[10px] text-slate-400">Stress Index</div>
                    <div className="text-xs font-bold text-slate-900 font-mono mt-0.5">
                      {result.analysis?.stress?.score ?? 0}/100
                    </div>
                  </div>
                  <div className="p-2 rounded bg-slate-50 border border-slate-200">
                    <div className="text-[10px] text-slate-400">Annual Precip</div>
                    <div className="text-xs font-bold text-slate-900 font-mono mt-0.5">
                      {result.analysis?.climate?.precipitation?.total_mm?.toFixed(0) ?? 0} mm
                    </div>
                  </div>
                  <div className="p-2 rounded bg-slate-50 border border-slate-200">
                    <div className="text-[10px] text-slate-400">Mean Temp</div>
                    <div className="text-xs font-bold text-slate-900 font-mono mt-0.5">
                      {result.analysis?.climate?.temperature?.mean?.toFixed(1) ?? 0}°C
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
