"use client";

import { useState, useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import { MapPin, Upload, AlertTriangle, Info, Globe2, Compass, Layers } from "lucide-react";
import { analyzeFieldBoundary, type BoundaryAnalysisResult } from "@/lib/api";
import { useLocation } from "@/context/LocationContext";
import GlobalLocationBar from "@/components/GlobalLocationBar";

const FieldBoundaryMap = dynamic(() => import("@/components/FieldBoundaryMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[400px] rounded-3xl bg-[#0f1f14] animate-pulse flex flex-col items-center justify-center text-white/60 gap-3 border border-[#d2e4d0]">
      <Globe2 className="h-10 w-10 text-[#86efac] animate-spin" />
      <div className="text-sm font-bold text-white tracking-wide">
        Projecting Field Boundary onto NASA GIBS Surface Reflectance...
      </div>
    </div>
  ),
});

const PRESET_POLYGONS = [
  {
    name: "Kansas Wheat Field #4 (180 ha)",
    coordinates: [
      [-98.14, 38.33],
      [-98.10, 38.33],
      [-98.10, 38.36],
      [-98.14, 38.36],
      [-98.14, 38.33],
    ],
  },
  {
    name: "Iowa Corn Belt Demonstration Plot (95 ha)",
    coordinates: [
      [-93.64, 41.84],
      [-93.61, 41.84],
      [-93.61, 41.87],
      [-93.64, 41.87],
      [-93.64, 41.84],
    ],
  },
  {
    name: "Punjab Agroforestry Parcel (120 ha)",
    coordinates: [
      [76.76, 30.72],
      [76.80, 30.72],
      [76.80, 30.75],
      [76.76, 30.75],
      [76.76, 30.72],
    ],
  },
  {
    name: "California Central Valley Almond Orchard (65 ha)",
    coordinates: [
      [-119.79, 36.73],
      [-119.76, 36.73],
      [-119.76, 36.76],
      [-119.79, 36.76],
      [-119.79, 36.73],
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
    // ~1 km square parcel around centroid
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

  // Parse coordinates safely for the map
  const activeCoordinates = useMemo<number[][]>(() => {
    try {
      const parsed = JSON.parse(geoJsonText);
      if (parsed.type === "Polygon" && Array.isArray(parsed.coordinates)) {
        return parsed.coordinates[0] || parsed.coordinates;
      }
    } catch {
      // ignore
    }
    return PRESET_POLYGONS[0].coordinates;
  }, [geoJsonText]);

  const runAnalysis = useCallback(async () => {
    setError(null);
    let parsedGeom: { type: "Polygon"; coordinates: number[][][] };
    try {
      const obj = JSON.parse(geoJsonText);
      if (obj.type !== "Polygon" || !Array.isArray(obj.coordinates)) {
        throw new Error("Invalid GeoJSON Polygon");
      }
      // Standardize coordinates
      const coords = Array.isArray(obj.coordinates[0][0]) ? obj.coordinates : [obj.coordinates];
      parsedGeom = { type: "Polygon", coordinates: coords };
    } catch {
      setError("Invalid JSON format. Please ensure valid GeoJSON Polygon syntax with coordinates [[lon, lat], ...].");
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

  const loadPreset = (preset: typeof PRESET_POLYGONS[0]) => {
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header Banner */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#dce8da] shadow-xs relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-[#2d7a3a]/10 via-[#0b3d91]/5 to-transparent rounded-full blur-2xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#eef7ec] border border-[#d2e4d0] text-xs font-bold text-[#2d7a3a]">
              <Compass className="h-3.5 w-3.5" />
              <span>Geospatial Vector Intelligence · Land Surface Delineation</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-[#1a2e1a] tracking-tight">
              Field Boundary Intelligence
            </h1>
            <p className="text-sm sm:text-base text-[#4a6741] leading-relaxed">
              Delineate custom field parcels via GeoJSON polygons. Calculate exact geodesics (hectares, perimeter,
              and centroid) and overlay calibrated NASA POWER agroclimatology directly onto land boundaries.
            </p>
          </div>

          <button
            onClick={runAnalysis}
            disabled={loading}
            className="inline-flex items-center gap-2 px-6 py-3.5 bg-[#2d7a3a] hover:bg-[#23602d] text-white font-bold text-sm rounded-2xl shadow-md shadow-[#2d7a3a]/20 transition disabled:opacity-50 shrink-0"
          >
            {loading ? (
              <>
                <Globe2 className="h-4 w-4 animate-spin" />
                <span>Computing Geometry...</span>
              </>
            ) : (
              <>
                <MapPin className="h-4 w-4" />
                <span>Analyze Parcel Geometry</span>
              </>
            )}
          </button>
        </div>

        {/* Preset boundary chips */}
        <div className="pt-6 mt-6 border-t border-[#eef4ed] flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold text-gray-500 mr-1 flex items-center gap-1">
            <Layers className="h-3.5 w-3.5 text-[#2d7a3a]" /> Benchmark Agricultural Parcels:
          </span>
          {PRESET_POLYGONS.map((p) => (
            <button
              key={p.name}
              onClick={() => loadPreset(p)}
              className={`text-xs px-3 py-1 rounded-xl font-medium transition border ${
                fieldName === p.name
                  ? "bg-[#2d7a3a] text-white border-[#2d7a3a] shadow-xs"
                  : "bg-[#f8faf7] text-gray-700 border-[#dce8da] hover:bg-[#eef7ec] hover:text-[#2d7a3a]"
              }`}
            >
              {p.name}
            </button>
          ))}

          {currentLocation && typeof currentLocation.latitude === "number" && (
            <button
              onClick={generateBoundaryForActiveLocation}
              className="text-xs px-3 py-1 rounded-xl font-bold bg-[#eef7ec] text-[#2d7a3a] border border-[#d2e4d0] hover:bg-[#dce8da] transition flex items-center gap-1"
            >
              <Compass className="h-3.5 w-3.5" /> Delineate Active Location ({currentLocation.label})
            </button>
          )}
        </div>
      </div>

      {/* Universal Global Location Context Bar */}
      <GlobalLocationBar />

      {/* Main Workspace: Parameters & Interactive Map */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Editor Card (5 Cols) */}
        <div className="lg:col-span-5 bg-white rounded-3xl p-6 border border-[#dce8da] shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-[#eef4ed] pb-3">
            <h2 className="text-sm font-bold text-[#1a2e1a]">Parcel Parameters</h2>
            <label className="text-xs text-[#2d7a3a] font-bold cursor-pointer flex items-center gap-1 hover:underline">
              <Upload className="h-3.5 w-3.5" /> Upload .geojson
              <input type="file" accept=".json,.geojson" onChange={handleFileUpload} className="hidden" />
            </label>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Field / Parcel Name</label>
            <input
              value={fieldName}
              onChange={(e) => setFieldName(e.target.value)}
              className="w-full px-3 py-2 text-xs font-bold bg-[#fbfdfb] border border-[#d2e4d0] rounded-xl outline-none focus:border-[#2d7a3a]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">GeoJSON Polygon Coordinates</label>
            <textarea
              rows={9}
              value={geoJsonText}
              onChange={(e) => setGeoJsonText(e.target.value)}
              className="w-full p-3 text-xs font-mono bg-[#f9fbf8] border border-[#d2e4d0] rounded-2xl outline-none focus:border-[#2d7a3a] text-gray-800"
            />
          </div>

          <div className="p-3 bg-[#eef7ec] rounded-2xl border border-[#c2ddbf] text-[11px] text-[#2d7a3a] flex gap-2">
            <Info className="h-4 w-4 shrink-0 text-[#2d7a3a] mt-0.5" />
            <span>
              GeoJSON specification requires coordinates in <code>[longitude, latitude]</code> format with closed boundary ring.
            </span>
          </div>
        </div>

        {/* Map Visualization (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          <FieldBoundaryMap
            coordinates={activeCoordinates}
            centroid={result ? result.boundary_metrics.centroid : undefined}
            fieldName={fieldName}
          />
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-700 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Results View */}
      {result && (
        <div className="space-y-6">
          {/* Land Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-3xl border border-[#dce8da] shadow-xs">
              <div className="text-[10px] text-gray-400 uppercase font-bold">Total Land Area</div>
              <div className="text-2xl font-extrabold text-[#2d7a3a] mt-1">
                {result.boundary_metrics.area_hectares} ha
              </div>
              <div className="text-[11px] text-gray-500 mt-0.5">({result.boundary_metrics.area_km2} km²)</div>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-[#dce8da] shadow-xs">
              <div className="text-[10px] text-gray-400 uppercase font-bold">Boundary Perimeter</div>
              <div className="text-2xl font-extrabold text-gray-800 mt-1">
                {result.boundary_metrics.perimeter_km} km
              </div>
              <div className="text-[11px] text-gray-500 mt-0.5">
                {result.boundary_metrics.vertex_count} boundary vertices
              </div>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-[#dce8da] shadow-xs">
              <div className="text-[10px] text-gray-400 uppercase font-bold">Centroid Latitude</div>
              <div className="text-2xl font-extrabold text-gray-800 font-mono mt-1">
                {result.boundary_metrics.centroid.latitude.toFixed(4)}° N
              </div>
              <div className="text-[11px] text-gray-500 mt-0.5">Center of mass</div>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-[#dce8da] shadow-xs">
              <div className="text-[10px] text-gray-400 uppercase font-bold">Centroid Longitude</div>
              <div className="text-2xl font-extrabold text-gray-800 font-mono mt-1">
                {result.boundary_metrics.centroid.longitude.toFixed(4)}° E
              </div>
              <div className="text-[11px] text-gray-500 mt-0.5">WGS84 projection</div>
            </div>
          </div>

          {/* Environmental Telemetry Snapshot for Centroid */}
          <div className="bg-white p-6 rounded-3xl border border-[#dce8da] shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-[#eef4ed] pb-3">
              <div>
                <h3 className="text-base font-bold text-[#1a2e1a]">Environmental Telemetry for Centroid</h3>
                <p className="text-xs text-[#4a6741]">NASA POWER Agroclimatology &amp; MERRA-2</p>
              </div>
              <span
                className="px-3 py-1 rounded-full text-xs font-bold"
                style={{
                  backgroundColor: `${result.analysis.stress.color}20`,
                  color: result.analysis.stress.color,
                }}
              >
                {result.analysis.stress.level} Stress ({result.analysis.stress.score}/100)
              </span>
            </div>

            {/* Findings */}
            <div className="space-y-2">
              <div className="text-xs font-bold text-gray-700">Parcel Agro-Climate Findings:</div>
              {result.analysis.key_findings.map((f, i) => (
                <div
                  key={i}
                  className="p-3 bg-[#f8faf7] rounded-xl text-xs text-gray-700 flex items-start gap-2 border border-[#eef4ed]"
                >
                  <span className="text-[#2d7a3a] font-bold mt-0.5">•</span>
                  <span>{f}</span>
                </div>
              ))}
            </div>

            {/* Recommended Rotations */}
            <div className="pt-2">
              <div className="text-xs font-bold text-gray-700 mb-2">Suitable Rotational Crops for this Parcel:</div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {result.analysis.crop_recommendations.slice(0, 3).map((crop) => (
                  <div key={crop.crop_id} className="p-3 rounded-2xl bg-gray-50 border border-gray-100">
                    <div className="font-bold text-xs text-gray-800">{crop.name}</div>
                    <div className="text-[#2d7a3a] font-extrabold text-sm mt-0.5">{crop.score} pts</div>
                    <div className="text-[10px] text-gray-500 mt-1 line-clamp-1">{crop.benefits[0]}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
