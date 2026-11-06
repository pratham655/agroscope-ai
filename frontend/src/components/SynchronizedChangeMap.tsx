"use client";

import { useEffect, useRef, useState } from "react";
import { Layers, Lock, Unlock } from "lucide-react";
import type { Map as LeafletMap, TileLayer as LeafletTileLayer } from "leaflet";

interface SynchronizedChangeMapProps {
  latitude: number;
  longitude: number;
  date1: string;
  date2: string;
  period1Label?: string;
  period2Label?: string;
}

type CompareLayer = "true_color" | "bands721" | "osm";

const LAYER_CONFIGS: Record<CompareLayer, { name: string; layerId?: string; format?: string; tms?: string }> = {
  true_color: {
    name: "NASA MODIS TrueColor (250m)",
    layerId: "MODIS_Terra_CorrectedReflectance_TrueColor",
    format: "jpg",
    tms: "GoogleMapsCompatible_Level9",
  },
  bands721: {
    name: "NASA Agricultural Vigor (Bands 7-2-1)",
    layerId: "MODIS_Terra_CorrectedReflectance_Bands721",
    format: "jpg",
    tms: "GoogleMapsCompatible_Level9",
  },
  osm: {
    name: "OpenStreetMap Carto",
  },
};

function buildTileUrl(layerKey: CompareLayer, dateStr: string) {
  if (layerKey === "osm") {
    return "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
  }
  const cfg = LAYER_CONFIGS[layerKey];
  const d = dateStr && dateStr.length === 10 ? dateStr : "default";
  return `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/${cfg.layerId}/default/${d}/${cfg.tms}/{z}/{y}/{x}.${cfg.format}`;
}

export default function SynchronizedChangeMap({
  latitude,
  longitude,
  date1,
  date2,
  period1Label = "Period 1 (Baseline)",
  period2Label = "Period 2 (Comparison)",
}: SynchronizedChangeMapProps) {
  const map1Ref = useRef<HTMLDivElement>(null);
  const map2Ref = useRef<HTMLDivElement>(null);
  const map1Obj = useRef<LeafletMap | null>(null);
  const map2Obj = useRef<LeafletMap | null>(null);
  const tile1Ref = useRef<LeafletTileLayer | null>(null);
  const tile2Ref = useRef<LeafletTileLayer | null>(null);

  const [activeLayer, setActiveLayer] = useState<CompareLayer>("true_color");
  const [syncEnabled, setSyncEnabled] = useState(true);
  const [loading1, setLoading1] = useState(false);
  const [loading2, setLoading2] = useState(false);

  // Synchronization guard ref to break recursive event loops
  const isSyncingRef = useRef(false);

  useEffect(() => {
    let isCancelled = false;
    const dom1 = map1Ref.current;
    const dom2 = map2Ref.current;
    if (!dom1 || !dom2 || typeof window === "undefined") return;

    // Destroy existing instances & clear _leaflet_id
    if (map1Obj.current) {
      try { map1Obj.current.remove(); } catch { /* ignore */ }
      map1Obj.current = null;
    }
    if (map2Obj.current) {
      try { map2Obj.current.remove(); } catch { /* ignore */ }
      map2Obj.current = null;
    }
    if ((dom1 as unknown as { _leaflet_id?: unknown })._leaflet_id) {
      delete (dom1 as unknown as { _leaflet_id?: unknown })._leaflet_id;
    }
    if ((dom2 as unknown as { _leaflet_id?: unknown })._leaflet_id) {
      delete (dom2 as unknown as { _leaflet_id?: unknown })._leaflet_id;
    }

    import("leaflet").then((L) => {
      import("leaflet/dist/leaflet.css" as never);
      if (isCancelled || !map1Ref.current || !map2Ref.current) return;

      // Clean ID again if set
      if ((map1Ref.current as unknown as { _leaflet_id?: unknown })._leaflet_id) {
        delete (map1Ref.current as unknown as { _leaflet_id?: unknown })._leaflet_id;
      }
      if ((map2Ref.current as unknown as { _leaflet_id?: unknown })._leaflet_id) {
        delete (map2Ref.current as unknown as { _leaflet_id?: unknown })._leaflet_id;
      }

      // Initialize Map 1
      const m1 = L.map(map1Ref.current, {
        center: [latitude, longitude],
        zoom: 6,
        zoomControl: true,
      });

      // Initialize Map 2
      const m2 = L.map(map2Ref.current, {
        center: [latitude, longitude],
        zoom: 6,
        zoomControl: true,
      });

      // Underlay base OSM
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
        opacity: 0.3,
        maxZoom: 18,
      }).addTo(m1);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
        opacity: 0.3,
        maxZoom: 18,
      }).addTo(m2);

      // Add NASA satellite layers
      const url1 = buildTileUrl(activeLayer, date1);
      const url2 = buildTileUrl(activeLayer, date2);

      const t1 = L.tileLayer(url1, {
        attribution: "NASA GIBS / Terra",
        opacity: 0.95,
        maxZoom: 18,
        maxNativeZoom: activeLayer === "osm" ? 18 : 9,
      }).addTo(m1);
      tile1Ref.current = t1;

      const t2 = L.tileLayer(url2, {
        attribution: "NASA GIBS / Terra",
        opacity: 0.95,
        maxZoom: 18,
        maxNativeZoom: activeLayer === "osm" ? 18 : 9,
      }).addTo(m2);
      tile2Ref.current = t2;

      t1.on("loading", () => setLoading1(true));
      t1.on("load", () => setLoading1(false));
      t1.on("tileerror", () => setLoading1(false));

      t2.on("loading", () => setLoading2(true));
      t2.on("load", () => setLoading2(false));
      t2.on("tileerror", () => setLoading2(false));

      // Synchronize Map 1 -> Map 2
      m1.on("move", () => {
        if (!syncEnabled || isSyncingRef.current) return;
        isSyncingRef.current = true;
        m2.setView(m1.getCenter(), m1.getZoom(), { animate: false });
        isSyncingRef.current = false;
      });

      // Synchronize Map 2 -> Map 1
      m2.on("move", () => {
        if (!syncEnabled || isSyncingRef.current) return;
        isSyncingRef.current = true;
        m1.setView(m2.getCenter(), m2.getZoom(), { animate: false });
        isSyncingRef.current = false;
      });

      map1Obj.current = m1;
      map2Obj.current = m2;
    });

    return () => {
      isCancelled = true;
      if (map1Obj.current) {
        try { map1Obj.current.remove(); } catch { /* ignore */ }
        map1Obj.current = null;
      }
      if (map2Obj.current) {
        try { map2Obj.current.remove(); } catch { /* ignore */ }
        map2Obj.current = null;
      }
      if (dom1 && (dom1 as unknown as { _leaflet_id?: unknown })._leaflet_id) {
        delete (dom1 as unknown as { _leaflet_id?: unknown })._leaflet_id;
      }
      if (dom2 && (dom2 as unknown as { _leaflet_id?: unknown })._leaflet_id) {
        delete (dom2 as unknown as { _leaflet_id?: unknown })._leaflet_id;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [latitude, longitude]);

  // Update Tile Layers when activeLayer or dates change
  useEffect(() => {
    if (!map1Obj.current || !map2Obj.current) return;
    const m1 = map1Obj.current;
    const m2 = map2Obj.current;

    import("leaflet").then((L) => {
      if (tile1Ref.current) m1.removeLayer(tile1Ref.current);
      if (tile2Ref.current) m2.removeLayer(tile2Ref.current);

      const url1 = buildTileUrl(activeLayer, date1);
      const url2 = buildTileUrl(activeLayer, date2);

      const t1 = L.tileLayer(url1, {
        attribution: "NASA GIBS / Terra",
        opacity: 0.95,
        maxZoom: 18,
        maxNativeZoom: activeLayer === "osm" ? 18 : 9,
      }).addTo(m1);

      const t2 = L.tileLayer(url2, {
        attribution: "NASA GIBS / Terra",
        opacity: 0.95,
        maxZoom: 18,
        maxNativeZoom: activeLayer === "osm" ? 18 : 9,
      }).addTo(m2);

      t1.on("loading", () => setLoading1(true));
      t1.on("load", () => setLoading1(false));
      t1.on("tileerror", () => setLoading1(false));

      t2.on("loading", () => setLoading2(true));
      t2.on("load", () => setLoading2(false));
      t2.on("tileerror", () => setLoading2(false));

      tile1Ref.current = t1;
      tile2Ref.current = t2;
    });
  }, [activeLayer, date1, date2]);

  return (
    <div className="space-y-4">
      {/* Synchronization HUD Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-white rounded-2xl border border-[#dce8da] shadow-xs">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-[#2d7a3a]" />
          <span className="text-xs font-bold text-[#1a2e1a]">Sensor Product:</span>
          <div className="flex gap-1.5">
            {(Object.keys(LAYER_CONFIGS) as CompareLayer[]).map((key) => (
              <button
                key={key}
                onClick={() => setActiveLayer(key)}
                className={`text-xs px-2.5 py-1 rounded-lg font-medium transition ${
                  activeLayer === key
                    ? "bg-[#2d7a3a] text-white shadow-xs"
                    : "bg-[#f8faf7] text-gray-600 hover:bg-[#eef7ec]"
                }`}
              >
                {LAYER_CONFIGS[key].name}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setSyncEnabled(!syncEnabled)}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold border transition ${
              syncEnabled
                ? "bg-[#eef7ec] text-[#2d7a3a] border-[#c2ddbf]"
                : "bg-gray-100 text-gray-500 border-gray-200"
            }`}
          >
            {syncEnabled ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
            <span>{syncEnabled ? "Viewport Synchronized" : "Unlinked"}</span>
          </button>
        </div>
      </div>

      {/* Side-by-Side Synchronized Map Panels */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Map Panel 1 (Baseline) */}
        <div className="relative rounded-3xl overflow-hidden border border-[#d2e4d0] shadow-md bg-[#0f1f14]">
          <div className="absolute top-3 left-3 z-[400] bg-slate-900/85 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 text-xs text-white flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-400"></span>
            <span className="font-bold">{period1Label}</span>
            <span className="text-gray-400 font-mono">({date1})</span>
          </div>

          {loading1 && (
            <div className="absolute top-3 right-3 z-[400] bg-slate-900/80 px-2.5 py-1 rounded-lg text-[10px] text-green-400 animate-pulse">
              Streaming...
            </div>
          )}

          <div ref={map1Ref} className="w-full h-[360px] sm:h-[420px] z-0" />
        </div>

        {/* Map Panel 2 (Comparison) */}
        <div className="relative rounded-3xl overflow-hidden border border-[#d2e4d0] shadow-md bg-[#0f1f14]">
          <div className="absolute top-3 left-3 z-[400] bg-slate-900/85 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 text-xs text-white flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-purple-400"></span>
            <span className="font-bold">{period2Label}</span>
            <span className="text-gray-400 font-mono">({date2})</span>
          </div>

          {loading2 && (
            <div className="absolute top-3 right-3 z-[400] bg-slate-900/80 px-2.5 py-1 rounded-lg text-[10px] text-purple-400 animate-pulse">
              Streaming...
            </div>
          )}

          <div ref={map2Ref} className="w-full h-[360px] sm:h-[420px] z-0" />
        </div>
      </div>
    </div>
  );
}
