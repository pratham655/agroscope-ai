"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";
import {
  Globe2,
  Play,
  Pause,
  RotateCcw,
  MapPin,
  ChevronRight,
} from "lucide-react";

export interface GlobeLocation {
  id: string;
  name: string;
  country: string;
  region: string;
  lat: number;
  lon: number;
  crop: string;
  climateZone: string;
  stressScore: number;
}

export const GLOBAL_AG_SITES: GlobeLocation[] = [
  {
    id: "kansas",
    name: "Kansas Wheat Belt",
    country: "United States",
    region: "North America",
    lat: 38.34,
    lon: -98.12,
    crop: "Winter Wheat & Sorghum",
    climateZone: "Temperate Semi-Arid Plains",
    stressScore: 42,
  },
  {
    id: "punjab",
    name: "Punjab Indo-Gangetic Basin",
    country: "India",
    region: "South Asia",
    lat: 30.73,
    lon: 76.78,
    crop: "Wheat & Basmati Rice",
    climateZone: "Subtropical Alluvial Plain",
    stressScore: 68,
  },
  {
    id: "cerrado",
    name: "Mato Grosso Cerrado Frontier",
    country: "Brazil",
    region: "South America",
    lat: -12.54,
    lon: -55.71,
    crop: "Soybeans & Maize",
    climateZone: "Tropical Savannah",
    stressScore: 38,
  },
  {
    id: "sahel",
    name: "Sahelian Agro-Pastoral Belt",
    country: "Burkina Faso",
    region: "West Africa",
    lat: 14.03,
    lon: -0.03,
    crop: "Pearl Millet & Sorghum",
    climateZone: "Semi-Arid Steppe",
    stressScore: 79,
  },
  {
    id: "nile",
    name: "Nile Delta Irrigated Basin",
    country: "Egypt",
    region: "North Africa",
    lat: 31.11,
    lon: 30.94,
    crop: "Cotton, Rice & Wheat",
    climateZone: "Arid Mediterranean Delta",
    stressScore: 54,
  },
  {
    id: "pampas",
    name: "Humid Argentine Pampas",
    country: "Argentina",
    region: "South America",
    lat: -33.89,
    lon: -60.57,
    crop: "Soybean, Corn & Wheat",
    climateZone: "Humid Subtropical Grassland",
    stressScore: 31,
  },
  {
    id: "murray",
    name: "Murray-Darling Basin",
    country: "Australia",
    region: "Oceania",
    lat: -34.28,
    lon: 146.04,
    crop: "Barley, Cotton & Citrus",
    climateZone: "Semi-Arid Basin",
    stressScore: 64,
  },
  {
    id: "povalley",
    name: "Po River Cereal Basin",
    country: "Italy",
    region: "Southern Europe",
    lat: 45.13,
    lon: 10.02,
    crop: "Maize, Rice & Forage",
    climateZone: "Humid Subtropical Lowland",
    stressScore: 47,
  },
  {
    id: "northchina",
    name: "North China Plain",
    country: "China",
    region: "East Asia",
    lat: 37.43,
    lon: 116.29,
    crop: "Winter Wheat & Summer Corn",
    climateZone: "Monsoon Semi-Humid Plain",
    stressScore: 71,
  },
  {
    id: "ukraine",
    name: "Ukrainian Chernozem Belt",
    country: "Ukraine",
    region: "Eastern Europe",
    lat: 49.58,
    lon: 34.55,
    crop: "Sunflower, Wheat & Corn",
    climateZone: "Temperate Black Soil Steppe",
    stressScore: 51,
  },
];

interface EarthGlobe3DProps {
  onSelectSite?: (site: GlobeLocation) => void;
  selectedSiteId?: string;
  className?: string;
}

export default function EarthGlobe3D({
  onSelectSite,
  selectedSiteId,
  className = "w-full h-[620px]",
}: EarthGlobe3DProps) {
  const mountRef = useRef<HTMLDivElement>(null);

  // UI state
  const [activeSite, setActiveSite] = useState<GlobeLocation>(() => {
    if (selectedSiteId) {
      const match = GLOBAL_AG_SITES.find((s) => s.id === selectedSiteId);
      if (match) return match;
    }
    return GLOBAL_AG_SITES[0];
  });
  const [autoRotate, setAutoRotate] = useState(true);
  const [cameraCoordinates, setCameraCoordinates] = useState({ lat: 38.3, lon: -98.1, alt: 1420 });

  // References for animation
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const globeGroupRef = useRef<THREE.Group | null>(null);
  const cloudsMeshRef = useRef<THREE.Mesh | null>(null);
  const markerObjectsRef = useRef<{ id: string; mesh: THREE.Mesh; data: GlobeLocation }[]>([]);
  const targetRotationRef = useRef<{ x: number; y: number } | null>(null);
  const isDraggingRef = useRef(false);
  const previousMousePositionRef = useRef({ x: 0, y: 0 });
  const zoomLevelRef = useRef(2.5);

  // Helper to convert lat/lon to spherical 3D Cartesian coordinates
  const latLonToVector3 = (lat: number, lon: number, radius: number): THREE.Vector3 => {
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lon + 180) * (Math.PI / 180);
    const x = -(radius * Math.sin(phi) * Math.cos(theta));
    const z = radius * Math.sin(phi) * Math.sin(theta);
    const y = radius * Math.cos(phi);
    return new THREE.Vector3(x, y, z);
  };

  // Helper to build a high-resolution NASA Blue Marble style Earth texture procedurally
  const createProceduralEarthTexture = (): THREE.CanvasTexture => {
    const canvas = document.createElement("canvas");
    canvas.width = 2048;
    canvas.height = 1024;
    const ctx = canvas.getContext("2d");
    if (!ctx) return new THREE.CanvasTexture(canvas);

    // Deep ocean base
    const oceanGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    oceanGrad.addColorStop(0, "#081b2e");
    oceanGrad.addColorStop(0.5, "#0b2545");
    oceanGrad.addColorStop(1, "#081b2e");
    ctx.fillStyle = oceanGrad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Subtle bathymetric ocean shelves
    ctx.fillStyle = "rgba(18, 55, 95, 0.45)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw Landmasses with agricultural green vegetation gradients
    const landforms = [
      // North America
      { x: 340, y: 150, w: 380, h: 280, color: "#2d5a27", arid: "#a88746" },
      // South America
      { x: 620, y: 520, w: 260, h: 360, color: "#1e6027", arid: "#9a814c" },
      // Europe
      { x: 960, y: 180, w: 240, h: 180, color: "#3a692a", arid: "#8f8252" },
      // Africa
      { x: 1000, y: 380, w: 320, h: 380, color: "#365c27", arid: "#c29b4e" },
      // Asia & Siberia
      { x: 1220, y: 140, w: 580, h: 320, color: "#2b5624", arid: "#a6884e" },
      // South Asia / India
      { x: 1420, y: 360, w: 140, h: 180, color: "#3b6e2d", arid: "#9d824d" },
      // Australia
      { x: 1680, y: 640, w: 240, h: 190, color: "#4f5e2d", arid: "#bf853a" },
    ];

    landforms.forEach((land) => {
      // Land gradient (lush forest -> fertile agricultural plain -> semi-arid plateau)
      const grad = ctx.createRadialGradient(
        land.x + land.w * 0.4,
        land.y + land.h * 0.5,
        20,
        land.x + land.w * 0.5,
        land.y + land.h * 0.5,
        land.w * 0.55
      );
      grad.addColorStop(0, land.color);
      grad.addColorStop(0.65, "#3d6d2b");
      grad.addColorStop(0.85, land.arid);
      grad.addColorStop(1, "rgba(194, 155, 78, 0.15)");

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.ellipse(
        land.x + land.w / 2,
        land.y + land.h / 2,
        land.w / 2,
        land.h / 2,
        0,
        0,
        Math.PI * 2
      );
      ctx.fill();
    });

    // Polar ice caps
    ctx.fillStyle = "rgba(235, 245, 255, 0.92)";
    // Arctic
    ctx.beginPath();
    ctx.ellipse(canvas.width / 2, 35, canvas.width * 0.48, 55, 0, 0, Math.PI * 2);
    ctx.fill();
    // Antarctica
    ctx.beginPath();
    ctx.ellipse(canvas.width / 2, canvas.height - 30, canvas.width * 0.52, 65, 0, 0, Math.PI * 2);
    ctx.fill();

    // Subtle latitude/longitude graticule lines (NASA science standard)
    ctx.strokeStyle = "rgba(255, 255, 255, 0.04)";
    ctx.lineWidth = 1;
    for (let x = 0; x < canvas.width; x += canvas.width / 12) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += canvas.height / 6) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    return texture;
  };

  // Helper to build a procedural cloud layer texture
  const createProceduralCloudTexture = (): THREE.CanvasTexture => {
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 512;
    const ctx = canvas.getContext("2d");
    if (!ctx) return new THREE.CanvasTexture(canvas);

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Weather bands & tropical cloud swirls
    ctx.fillStyle = "rgba(255, 255, 255, 0.28)";
    for (let i = 0; i < 40; i++) {
      const cx = Math.random() * canvas.width;
      const cy = Math.random() * (canvas.height * 0.8) + canvas.height * 0.1;
      const rw = Math.random() * 120 + 40;
      const rh = Math.random() * 30 + 10;
      ctx.beginPath();
      ctx.ellipse(cx, cy, rw, rh, Math.random() * 0.4 - 0.2, 0, Math.PI * 2);
      ctx.fill();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    return texture;
  };

  // Initialize Three.js Scene
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    let animationFrameId: number;
    const width = container.clientWidth || 800;
    const height = container.clientHeight || 620;

    // 1. Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100);
    camera.position.set(0, 0, zoomLevelRef.current);
    cameraRef.current = camera;

    // 3. Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    container.replaceChildren(renderer.domElement);
    rendererRef.current = renderer;

    // 4. Lighting
    // Directional Sunlight (Sun angle mimics high-noon lighting)
    const sunLight = new THREE.DirectionalLight(0xffffff, 2.0);
    sunLight.position.set(5, 3, 4);
    scene.add(sunLight);

    // Soft Ambient Space light
    const ambientLight = new THREE.AmbientLight(0x1a3325, 0.7);
    scene.add(ambientLight);

    // Subtle atmospheric blue rim light
    const rimLight = new THREE.DirectionalLight(0x4ade80, 0.5);
    rimLight.position.set(-5, -2, -3);
    scene.add(rimLight);

    // 5. Globe Group (Rotates dynamically)
    const globeGroup = new THREE.Group();
    scene.add(globeGroup);
    globeGroupRef.current = globeGroup;

    // Earth Sphere Geometry
    const earthRadius = 1.0;
    const earthGeometry = new THREE.SphereGeometry(earthRadius, 64, 64);

    // High quality material with procedural Earth texture
    const earthTexture = createProceduralEarthTexture();
    const earthMaterial = new THREE.MeshStandardMaterial({
      map: earthTexture,
      roughness: 0.65,
      metalness: 0.1,
    });
    const earthMesh = new THREE.Mesh(earthGeometry, earthMaterial);
    globeGroup.add(earthMesh);

    // 6. Atmosphere Shell (Limb Glow)
    const atmosphereGeometry = new THREE.SphereGeometry(earthRadius * 1.025, 64, 64);
    const atmosphereMaterial = new THREE.MeshBasicMaterial({
      color: 0x86efac,
      transparent: true,
      opacity: 0.12,
      side: THREE.BackSide,
    });
    const atmosphereMesh = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
    globeGroup.add(atmosphereMesh);

    // Outer space rim glow
    const outerGlowGeo = new THREE.SphereGeometry(earthRadius * 1.12, 32, 32);
    const outerGlowMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.05,
      side: THREE.BackSide,
    });
    const outerGlow = new THREE.Mesh(outerGlowGeo, outerGlowMat);
    scene.add(outerGlow);

    // 7. Cloud Layer
    const cloudGeometry = new THREE.SphereGeometry(earthRadius * 1.012, 48, 48);
    const cloudTexture = createProceduralCloudTexture();
    const cloudMaterial = new THREE.MeshStandardMaterial({
      map: cloudTexture,
      transparent: true,
      opacity: 0.38,
      blending: THREE.NormalBlending,
    });
    const cloudsMesh = new THREE.Mesh(cloudGeometry, cloudMaterial);
    globeGroup.add(cloudsMesh);
    cloudsMeshRef.current = cloudsMesh;

    // 8. Place Agricultural Breadbasket Site Markers
    markerObjectsRef.current = [];
    GLOBAL_AG_SITES.forEach((site) => {
      const pos = latLonToVector3(site.lat, site.lon, earthRadius * 1.015);

      // Marker container
      const markerGroup = new THREE.Group();
      markerGroup.position.copy(pos);
      markerGroup.lookAt(0, 0, 0);

      // Glowing circular beacon
      const pinGeometry = new THREE.CylinderGeometry(0.016, 0.003, 0.05, 12);
      pinGeometry.rotateX(Math.PI / 2);
      const pinColor = site.stressScore >= 65 ? 0xef4444 : site.stressScore >= 45 ? 0xf59e0b : 0x22c55e;
      const pinMaterial = new THREE.MeshBasicMaterial({ color: pinColor });
      const pinMesh = new THREE.Mesh(pinGeometry, pinMaterial);
      markerGroup.add(pinMesh);

      // Pulsing head orb
      const orbGeometry = new THREE.SphereGeometry(0.018, 16, 16);
      const orbMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
      const orbMesh = new THREE.Mesh(orbGeometry, orbMaterial);
      orbMesh.position.set(0, 0, 0.035);
      markerGroup.add(orbMesh);

      globeGroup.add(markerGroup);
      markerObjectsRef.current.push({ id: site.id, mesh: pinMesh, data: site });
    });

    // Rotate initially to show Kansas & the Americas
    globeGroup.rotation.y = -Math.PI * 0.25;
    globeGroup.rotation.x = 0.2;

    // 9. Animation & Interaction Loop
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      // Auto rotation if enabled
      if (autoRotate && !isDraggingRef.current && !targetRotationRef.current) {
        globeGroup.rotation.y += 0.0012;
      }

      // Smooth camera interpolation to target site
      if (targetRotationRef.current) {
        globeGroup.rotation.y += (targetRotationRef.current.y - globeGroup.rotation.y) * 0.06;
        globeGroup.rotation.x += (targetRotationRef.current.x - globeGroup.rotation.x) * 0.06;

        if (
          Math.abs(targetRotationRef.current.y - globeGroup.rotation.y) < 0.002 &&
          Math.abs(targetRotationRef.current.x - globeGroup.rotation.x) < 0.002
        ) {
          targetRotationRef.current = null;
        }
      }

      // Clouds rotate slightly faster for dynamic atmospheric movement
      if (cloudsMeshRef.current) {
        cloudsMeshRef.current.rotation.y += 0.0003;
      }

      renderer.render(scene, camera);
    };

    animate();

    // Resize Handler
    const handleResize = () => {
      if (!container || !rendererRef.current || !cameraRef.current) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };

    window.addEventListener("resize", handleResize);

    // Teardown
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", handleResize);
      renderer.dispose();
      earthGeometry.dispose();
      earthMaterial.dispose();
      atmosphereGeometry.dispose();
      atmosphereMaterial.dispose();
      cloudGeometry.dispose();
      cloudMaterial.dispose();
      outerGlowGeo.dispose();
      outerGlowMat.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [autoRotate]);

  // Smoothly rotate globe to face coordinates of selected site
  const flyToSite = useCallback((site: GlobeLocation) => {
    setActiveSite(site);
    if (onSelectSite) onSelectSite(site);

    const phi = (site.lat * Math.PI) / 180;
    const theta = ((site.lon + 90) * Math.PI) / 180;

    targetRotationRef.current = {
      x: phi * 0.7,
      y: -theta,
    };

    setCameraCoordinates({
      lat: site.lat,
      lon: site.lon,
      alt: 840,
    });
  }, [onSelectSite]);

  // Handle external selection safely without cascading re-renders
  const prevSiteIdRef = useRef<string | undefined>(selectedSiteId);
  useEffect(() => {
    if (selectedSiteId && selectedSiteId !== prevSiteIdRef.current) {
      prevSiteIdRef.current = selectedSiteId;
      const match = GLOBAL_AG_SITES.find((s) => s.id === selectedSiteId);
      if (match) {
        const phi = (match.lat * Math.PI) / 180;
        const theta = ((match.lon + 90) * Math.PI) / 180;
        targetRotationRef.current = { x: phi * 0.7, y: -theta };
      }
    }
  }, [selectedSiteId]);

  // Mouse interaction handlers for orbit & drag
  const onMouseDown = (e: React.MouseEvent) => {
    isDraggingRef.current = true;
    previousMousePositionRef.current = { x: e.clientX, y: e.clientY };
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current || !globeGroupRef.current) return;
    const deltaX = e.clientX - previousMousePositionRef.current.x;
    const deltaY = e.clientY - previousMousePositionRef.current.y;

    globeGroupRef.current.rotation.y += deltaX * 0.005;
    globeGroupRef.current.rotation.x = Math.max(
      -Math.PI / 3,
      Math.min(Math.PI / 3, globeGroupRef.current.rotation.x + deltaY * 0.005)
    );

    previousMousePositionRef.current = { x: e.clientX, y: e.clientY };

    // Update estimated camera coordinate display
    const currentLon = ((-globeGroupRef.current.rotation.y * 180) / Math.PI) % 360;
    const currentLat = ((globeGroupRef.current.rotation.x * 180) / Math.PI);
    setCameraCoordinates((prev) => ({
      lat: Math.round(currentLat * 10) / 10,
      lon: Math.round(currentLon * 10) / 10,
      alt: prev.alt,
    }));
  };

  const onMouseUp = () => {
    isDraggingRef.current = false;
  };

  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (!cameraRef.current) return;
    const newZ = Math.max(1.6, Math.min(4.5, cameraRef.current.position.z + e.deltaY * 0.002));
    cameraRef.current.position.z = newZ;
    zoomLevelRef.current = newZ;
    setCameraCoordinates((prev) => ({
      ...prev,
      alt: Math.round(newZ * 560),
    }));
  };

  const resetHome = () => {
    flyToSite(GLOBAL_AG_SITES[0]);
  };

  return (
    <div className={`relative rounded-3xl overflow-hidden border border-[#234b32] bg-[#07130b] shadow-2xl ${className}`}>
      {/* 3D WebGL Canvas */}
      <div
        ref={mountRef}
        className="w-full h-full cursor-grab active:cursor-grabbing"
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        onWheel={onWheel}
      />

      {/* Top Left HUD: Mission Orbit Telemetry */}
      <div className="absolute top-4 left-4 z-20 pointer-events-none">
        <div className="bg-slate-950/85 backdrop-blur-md px-4 py-3 rounded-2xl border border-emerald-500/30 text-white shadow-xl pointer-events-auto">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[11px] font-extrabold uppercase tracking-widest text-emerald-300">
              Orbital Earth Telemetry (3D)
            </span>
          </div>
          <div className="grid grid-cols-3 gap-3 text-xs font-mono">
            <div>
              <span className="text-[10px] text-gray-400 block">Sub-Solar Lat</span>
              <span className="font-bold text-white">{cameraCoordinates.lat >= 0 ? `+${cameraCoordinates.lat}` : cameraCoordinates.lat}°</span>
            </div>
            <div>
              <span className="text-[10px] text-gray-400 block">Sub-Solar Lon</span>
              <span className="font-bold text-white">{cameraCoordinates.lon >= 0 ? `+${cameraCoordinates.lon}` : cameraCoordinates.lon}°</span>
            </div>
            <div>
              <span className="text-[10px] text-gray-400 block">Altitude</span>
              <span className="font-bold text-emerald-400">{cameraCoordinates.alt} km</span>
            </div>
          </div>
        </div>
      </div>

      {/* Top Right HUD: 3D Camera Controls */}
      <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
        <button
          onClick={() => setAutoRotate(!autoRotate)}
          className={`px-3 py-2 rounded-xl backdrop-blur-md text-xs font-semibold border transition flex items-center gap-1.5 shadow-md ${
            autoRotate
              ? "bg-emerald-600/90 text-white border-emerald-400/50"
              : "bg-slate-950/80 text-gray-300 border-white/10 hover:text-white"
          }`}
          title="Toggle Auto Rotation"
        >
          {autoRotate ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
          <span className="hidden sm:inline">{autoRotate ? "Orbiting" : "Paused"}</span>
        </button>

        <button
          onClick={resetHome}
          className="p-2 bg-slate-950/80 hover:bg-slate-900 backdrop-blur-md text-gray-300 hover:text-white rounded-xl border border-white/10 shadow-md transition"
          title="Reset Camera to Home (Kansas Wheat Belt)"
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Bottom Floating Card: Currently Focused Agricultural Zone */}
      <div className="absolute bottom-4 left-4 right-4 sm:right-auto sm:max-w-md z-20">
        <div className="bg-slate-950/90 backdrop-blur-lg p-4 rounded-2xl border border-emerald-500/40 text-white shadow-2xl">
          <div className="flex items-start justify-between gap-3 mb-2">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  <Globe2 className="h-4 w-4" />
                </span>
                <span className="text-sm font-bold text-white tracking-tight">{activeSite.name}</span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                {activeSite.country} &bull; {activeSite.region}
              </p>
            </div>
            <span
              className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full border ${
                activeSite.stressScore >= 65
                  ? "bg-red-500/20 text-red-300 border-red-500/40"
                  : activeSite.stressScore >= 45
                  ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                  : "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
              }`}
            >
              Stress {activeSite.stressScore}/100
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs py-2 border-y border-white/10 my-2">
            <div>
              <span className="text-[10px] text-gray-400 block">Primary Crops</span>
              <span className="font-semibold text-emerald-200">{activeSite.crop}</span>
            </div>
            <div>
              <span className="text-[10px] text-gray-400 block">Climatological Zone</span>
              <span className="font-semibold text-gray-200">{activeSite.climateZone}</span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-[11px] font-mono text-gray-400">
              {activeSite.lat.toFixed(2)}°N, {activeSite.lon.toFixed(2)}°E
            </span>
            <a
              href={`/farm-futures?lat=${activeSite.lat}&lon=${activeSite.lon}`}
              className="text-xs font-bold text-emerald-300 hover:text-emerald-100 flex items-center gap-1 transition"
            >
              <span>Simulate Climate Shift</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      </div>

      {/* Quick Breadbasket Switcher Drawer */}
      <div className="hidden lg:flex flex-col gap-1.5 absolute right-4 bottom-4 z-20 max-h-[380px] overflow-y-auto pr-1">
        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-300/80 px-2 py-0.5 bg-slate-950/70 rounded backdrop-blur-sm self-end">
          Global Breadbasket Targets
        </span>
        {GLOBAL_AG_SITES.map((site) => (
          <button
            key={site.id}
            onClick={() => flyToSite(site)}
            className={`text-left px-3 py-1.5 rounded-xl text-xs font-medium backdrop-blur-md transition flex items-center justify-between gap-3 border ${
              activeSite.id === site.id
                ? "bg-emerald-600/90 text-white border-emerald-400/80 shadow-lg scale-102"
                : "bg-slate-950/70 text-gray-300 hover:text-white hover:bg-slate-900/80 border-white/10"
            }`}
          >
            <div className="flex items-center gap-1.5">
              <MapPin className="h-3 w-3 text-emerald-400" />
              <span className="truncate max-w-[140px]">{site.name}</span>
            </div>
            <span className="text-[10px] opacity-75 font-mono">{site.country}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
