"use client";

import { useEffect, useRef, useState } from "react";
import { Crosshair, MapPin, Eye } from "lucide-react";
import type { Map as LeafletMap, Marker as LeafletMarker, TileLayer as LeafletTileLayer, LeafletMouseEvent } from "leaflet";

interface SimulationMapProps {
  latitude: number;
  longitude: number;
  locationLabel: string;
  onSelectCoordinates: (lat: number, lon: number) => void;
}

type MapLayerType = "osm" | "gibs_true_color" | "gibs_ndvi" | "gibs_lst";

const LAYER_CONFIGS: Record<MapLayerType, { name: string; url: string; attribution: string }> = {
  osm: {
    name: "Standard Topo",
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: "© OpenStreetMap contributors",
  },
  gibs_true_color: {
    name: "NASA MODIS True Color",
    url: "https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Terra_SurfaceReflectance_Bands143/default/default/GoogleMapsCompatible_Level9/{z}/{y}/{x}.png",
    attribution: "NASA GIBS / Terra MODIS",
  },
  gibs_ndvi: {
    name: "NASA MODIS NDVI",
    url: "https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Terra_NDVI_8Day/default/default/GoogleMapsCompatible_Level9/{z}/{y}/{x}.png",
    attribution: "NASA GIBS / Terra NDVI",
  },
  gibs_lst: {
    name: "NASA Land Surface Temp",
    url: "https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Terra_Land_Surface_Temp_Day/default/default/GoogleMapsCompatible_Level9/{z}/{y}/{x}.png",
    attribution: "NASA GIBS / LST Day",
  },
};

export default function SimulationMap({
  latitude,
  longitude,
  locationLabel,
  onSelectCoordinates,
}: SimulationMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<LeafletMap | null>(null);
  const markerRef = useRef<LeafletMarker | null>(null);
  const currentTileLayerRef = useRef<LeafletTileLayer | null>(null);
  const [activeLayer, setActiveLayer] = useState<MapLayerType>("osm");

  // Keep a stable ref for onSelectCoordinates callback
  const onSelectCoordinatesRef = useRef(onSelectCoordinates);
  useEffect(() => {
    onSelectCoordinatesRef.current = onSelectCoordinates;
  }, [onSelectCoordinates]);

  // Initialize Leaflet map
  useEffect(() => {
    let isCancelled = false;

    if (typeof window === "undefined" || !mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    import("leaflet").then((L) => {
      import("leaflet/dist/leaflet.css" as never);
      if (isCancelled || !mapContainerRef.current) return;

      const map = L.map(mapContainerRef.current, {
        center: [latitude, longitude],
        zoom: 6,
        zoomControl: true,
      });

      // Initial Tile Layer
      const initialCfg = LAYER_CONFIGS[activeLayer];
      const tileLayer = L.tileLayer(initialCfg.url, {
        attribution: initialCfg.attribution,
        maxZoom: 18,
      }).addTo(map);
      currentTileLayerRef.current = tileLayer;

      // Custom pulsing scientific pin marker
      const markerHtml = `
        <div style="position: relative; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;">
          <div style="position: absolute; width: 32px; height: 32px; border-radius: 50%; background: rgba(45, 122, 58, 0.25); animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
          <div style="position: relative; width: 14px; height: 14px; border-radius: 50%; background: #2d7a3a; border: 2.5px solid #ffffff; box-shadow: 0 2px 6px rgba(0,0,0,0.35);"></div>
        </div>
      `;
      const customIcon = L.divIcon({
        className: "custom-sim-marker",
        html: markerHtml,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      const marker = L.marker([latitude, longitude], { icon: customIcon }).addTo(map);
      marker.bindPopup(`<b>${locationLabel}</b><br/>${latitude.toFixed(4)}°, ${longitude.toFixed(4)}°`);
      markerRef.current = marker;

      // Map click handler to select new coordinates
      map.on("click", (e: LeafletMouseEvent) => {
        const newLat = parseFloat(e.latlng.lat.toFixed(4));
        const newLon = parseFloat(e.latlng.lng.toFixed(4));
        onSelectCoordinatesRef.current(newLat, newLon);
      });

      mapInstanceRef.current = map;
    });

    return () => {
      isCancelled = true;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update map center and marker when coordinates change
  useEffect(() => {
    if (!mapInstanceRef.current || !markerRef.current) return;
    const map = mapInstanceRef.current;
    const marker = markerRef.current;

    marker.setLatLng([latitude, longitude]);
    marker.setPopupContent(`<b>${locationLabel}</b><br/>${latitude.toFixed(4)}°, ${longitude.toFixed(4)}°`);

    // Smoothly pan if within reasonable distance, otherwise fly
    const curCenter = map.getCenter();
    const dist = Math.hypot(curCenter.lat - latitude, curCenter.lng - longitude);
    if (dist > 0.01) {
      if (dist < 10) {
        map.panTo([latitude, longitude], { animate: true, duration: 0.8 });
      } else {
        map.flyTo([latitude, longitude], map.getZoom() < 5 ? 6 : map.getZoom(), { duration: 1.2 });
      }
    }
  }, [latitude, longitude, locationLabel]);

  // Swap active tile layer
  const handleLayerChange = (layerKey: MapLayerType) => {
    setActiveLayer(layerKey);
    if (!mapInstanceRef.current) return;
    import("leaflet").then((L) => {
      if (mapInstanceRef.current && currentTileLayerRef.current) {
        mapInstanceRef.current.removeLayer(currentTileLayerRef.current);
      }
      const cfg = LAYER_CONFIGS[layerKey];
      const newTile = L.tileLayer(cfg.url, {
        attribution: cfg.attribution,
        maxZoom: 18,
      });
      if (mapInstanceRef.current) {
        newTile.addTo(mapInstanceRef.current);
        currentTileLayerRef.current = newTile;
      }
    });
  };

  const recenter = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([latitude, longitude], 7, { duration: 0.8 });
    }
  };

  return (
    <div className="relative w-full rounded-2xl overflow-hidden border border-[#d2e4d0] shadow-sm bg-[#f4f7f3]">
      {/* Top Map HUD Bar */}
      <div className="absolute top-3 left-3 right-3 z-[400] flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        {/* Location pill */}
        <div className="pointer-events-auto bg-white/95 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-[#d2e4d0] shadow-sm flex items-center gap-2 text-xs font-semibold text-[#1a2e1a]">
          <MapPin className="h-4 w-4 text-[#2d7a3a] shrink-0" />
          <span className="truncate max-w-[220px] sm:max-w-[340px]">{locationLabel}</span>
          <span className="text-[11px] font-mono text-[#4a6741] bg-[#eef7ec] px-1.5 py-0.5 rounded border border-[#d8edd6]">
            {latitude >= 0 ? `${latitude.toFixed(4)}°N` : `${Math.abs(latitude).toFixed(4)}°S`},{" "}
            {longitude >= 0 ? `${longitude.toFixed(4)}°E` : `${Math.abs(longitude).toFixed(4)}°W`}
          </span>
        </div>

        {/* Controls */}
        <div className="pointer-events-auto flex items-center gap-1.5">
          {/* Recenter Button */}
          <button
            onClick={recenter}
            title="Recenter map on selected coordinates"
            className="p-2 bg-white/95 hover:bg-white text-gray-700 hover:text-[#2d7a3a] rounded-xl border border-[#d2e4d0] shadow-sm transition flex items-center justify-center text-xs font-medium"
          >
            <Crosshair className="h-4 w-4" />
          </button>

          {/* Layer Selector */}
          <div className="flex bg-white/95 backdrop-blur-md p-1 rounded-xl border border-[#d2e4d0] shadow-sm">
            {(Object.keys(LAYER_CONFIGS) as MapLayerType[]).map((key) => {
              const cfg = LAYER_CONFIGS[key];
              const isActive = activeLayer === key;
              return (
                <button
                  key={key}
                  onClick={() => handleLayerChange(key)}
                  className={`text-[11px] px-2.5 py-1 rounded-lg font-medium transition ${
                    isActive
                      ? "bg-[#2d7a3a] text-white shadow-xs"
                      : "text-gray-600 hover:text-[#1a2e1a] hover:bg-gray-100"
                  }`}
                >
                  {cfg.name}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Map DOM Element */}
      <div ref={mapContainerRef} className="w-full h-[320px] sm:h-[380px] z-0" />

      {/* Bottom Map Status & Instructions */}
      <div className="absolute bottom-2 left-3 right-3 z-[400] flex items-center justify-between pointer-events-none text-[11px] text-gray-600 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-lg border border-[#e2ece0]">
        <div className="flex items-center gap-1.5">
          <Eye className="h-3.5 w-3.5 text-[#2d7a3a]" />
          <span>Click anywhere on the satellite surface to relocate and simulate.</span>
        </div>
        <div className="font-medium text-gray-500 hidden sm:block">
          NASA GIBS WMTS &amp; OpenStreetMap
        </div>
      </div>
    </div>
  );
}
