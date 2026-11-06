"use client";

import { useEffect, useRef, useState } from "react";
import { Maximize2, MapPin } from "lucide-react";
import type { Map as LeafletMap, GeoJSON as LeafletGeoJSON, TileLayer as LeafletTileLayer } from "leaflet";

interface FieldBoundaryMapProps {
  coordinates: number[][]; // GeoJSON [lon, lat]
  centroid?: { latitude: number; longitude: number };
  fieldName?: string;
}

type LayerMode = "modis_truecolor" | "modis_bands721" | "osm";

export default function FieldBoundaryMap({
  coordinates,
  centroid,
  fieldName = "Field Parcel",
}: FieldBoundaryMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const geoJsonLayerRef = useRef<LeafletGeoJSON | null>(null);
  const currentTileRef = useRef<LeafletTileLayer | null>(null);

  const [activeLayer, setActiveLayer] = useState<LayerMode>("modis_bands721");

  useEffect(() => {
    let isCancelled = false;
    const domNode = containerRef.current;
    if (!domNode || typeof window === "undefined") return;

    // Clean any existing Leaflet instances
    if (mapRef.current) {
      try { mapRef.current.remove(); } catch { /* ignore */ }
      mapRef.current = null;
    }
    if ((domNode as unknown as { _leaflet_id?: unknown })._leaflet_id) {
      delete (domNode as unknown as { _leaflet_id?: unknown })._leaflet_id;
    }

    import("leaflet").then((L) => {
      import("leaflet/dist/leaflet.css" as never);
      if (isCancelled || !containerRef.current) return;

      if ((containerRef.current as unknown as { _leaflet_id?: unknown })._leaflet_id) {
        delete (containerRef.current as unknown as { _leaflet_id?: unknown })._leaflet_id;
      }

      // Initial center from centroid or first coordinate
      const centerLat = centroid ? centroid.latitude : coordinates[0]?.[1] ?? 38.34;
      const centerLon = centroid ? centroid.longitude : coordinates[0]?.[0] ?? -98.12;

      const map = L.map(containerRef.current, {
        center: [centerLat, centerLon],
        zoom: 13,
        zoomControl: true,
      });

      // Underlay OSM
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
        opacity: 0.35,
        maxZoom: 18,
      }).addTo(map);

      // Add NASA GIBS or OSM layer
      const getLayerUrl = (mode: LayerMode) => {
        if (mode === "osm") return "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
        if (mode === "modis_bands721") {
          return "https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Terra_CorrectedReflectance_Bands721/default/default/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg";
        }
        return "https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Terra_CorrectedReflectance_TrueColor/default/default/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg";
      };

      const satLayer = L.tileLayer(getLayerUrl(activeLayer), {
        attribution: "NASA GIBS / Terra",
        opacity: 0.95,
        maxZoom: 18,
        maxNativeZoom: activeLayer === "osm" ? 18 : 9,
      }).addTo(map);
      currentTileRef.current = satLayer;

      // Convert GeoJSON coordinates [lon, lat] to Leaflet GeoJSON feature
      const geoJsonData: GeoJSON.Feature<GeoJSON.Polygon> = {
        type: "Feature",
        properties: { name: fieldName },
        geometry: {
          type: "Polygon",
          coordinates: [coordinates],
        },
      };

      const polyLayer = L.geoJSON(geoJsonData, {
        style: {
          color: "#22c55e",
          weight: 3,
          fillColor: "#86efac",
          fillOpacity: 0.35,
          dashArray: "4 4",
        },
      }).addTo(map);
      geoJsonLayerRef.current = polyLayer;

      // Fit bounds to polygon
      try {
        const bounds = polyLayer.getBounds();
        if (bounds.isValid()) {
          map.fitBounds(bounds, { padding: [40, 40] });
        }
      } catch {
        // ignore
      }

      // Add Centroid pin if available
      if (centroid) {
        const centroidHtml = `
          <div style="position: relative; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center;">
            <div style="position: absolute; width: 28px; height: 28px; border-radius: 50%; background: rgba(34, 197, 94, 0.4); animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
            <div style="position: relative; width: 12px; height: 12px; border-radius: 50%; background: #16a34a; border: 2px solid #ffffff; box-shadow: 0 2px 6px rgba(0,0,0,0.4);"></div>
          </div>
        `;
        const centroidIcon = L.divIcon({
          className: "centroid-pin",
          html: centroidHtml,
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        });
        L.marker([centroid.latitude, centroid.longitude], { icon: centroidIcon })
          .addTo(map)
          .bindPopup(`<b>Centroid: ${fieldName}</b><br/>${centroid.latitude.toFixed(4)}°, ${centroid.longitude.toFixed(4)}°`);
      }

      mapRef.current = map;
    });

    return () => {
      isCancelled = true;
      if (mapRef.current) {
        try { mapRef.current.remove(); } catch { /* ignore */ }
        mapRef.current = null;
      }
      if (domNode && (domNode as unknown as { _leaflet_id?: unknown })._leaflet_id) {
        delete (domNode as unknown as { _leaflet_id?: unknown })._leaflet_id;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coordinates, centroid, fieldName]);

  // Handle layer toggle
  const handleLayerSwitch = (mode: LayerMode) => {
    setActiveLayer(mode);
    if (!mapRef.current) return;
    import("leaflet").then((L) => {
      if (currentTileRef.current && mapRef.current) {
        mapRef.current.removeLayer(currentTileRef.current);
      }
      const getLayerUrl = (m: LayerMode) => {
        if (m === "osm") return "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
        if (m === "modis_bands721") {
          return "https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Terra_CorrectedReflectance_Bands721/default/default/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg";
        }
        return "https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Terra_CorrectedReflectance_TrueColor/default/default/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg";
      };
      const newLayer = L.tileLayer(getLayerUrl(mode), {
        attribution: "NASA GIBS / Terra",
        opacity: 0.95,
        maxZoom: 18,
        maxNativeZoom: mode === "osm" ? 18 : 9,
      });
      if (mapRef.current) {
        newLayer.addTo(mapRef.current);
        currentTileRef.current = newLayer;
      }
    });
  };

  const zoomToFit = () => {
    if (mapRef.current && geoJsonLayerRef.current) {
      const bounds = geoJsonLayerRef.current.getBounds();
      if (bounds.isValid()) {
        mapRef.current.fitBounds(bounds, { padding: [40, 40], duration: 0.8 });
      }
    }
  };

  return (
    <div className="relative rounded-3xl overflow-hidden border border-[#d2e4d0] shadow-md bg-[#0f1f14]">
      {/* Top Map HUD */}
      <div className="absolute top-3 left-3 right-3 z-[400] flex items-center justify-between pointer-events-none">
        <div className="pointer-events-auto bg-slate-900/85 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-white/10 text-xs text-white flex items-center gap-2">
          <MapPin className="h-4 w-4 text-[#86efac]" />
          <span className="font-bold">{fieldName}</span>
          <span className="text-[10px] text-gray-400 font-mono">({coordinates.length} vertices)</span>
        </div>

        <div className="pointer-events-auto flex items-center gap-2">
          <button
            onClick={zoomToFit}
            title="Zoom to Fit Field"
            className="p-2 bg-slate-900/85 hover:bg-slate-900 text-white rounded-xl border border-white/10 shadow-sm transition"
          >
            <Maximize2 className="h-3.5 w-3.5" />
          </button>

          <div className="flex bg-slate-900/85 backdrop-blur-md p-1 rounded-xl border border-white/10 text-xs">
            <button
              onClick={() => handleLayerSwitch("modis_bands721")}
              className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition ${
                activeLayer === "modis_bands721" ? "bg-[#2d7a3a] text-white" : "text-gray-300 hover:text-white"
              }`}
            >
              Agro Bands 7-2-1
            </button>
            <button
              onClick={() => handleLayerSwitch("modis_truecolor")}
              className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition ${
                activeLayer === "modis_truecolor" ? "bg-[#2d7a3a] text-white" : "text-gray-300 hover:text-white"
              }`}
            >
              TrueColor
            </button>
            <button
              onClick={() => handleLayerSwitch("osm")}
              className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition ${
                activeLayer === "osm" ? "bg-[#2d7a3a] text-white" : "text-gray-300 hover:text-white"
              }`}
            >
              Carto
            </button>
          </div>
        </div>
      </div>

      <div ref={containerRef} className="w-full h-[360px] sm:h-[440px] z-0" />
    </div>
  );
}
