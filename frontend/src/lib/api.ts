/**
 * AGROSCOPE AI — Frontend API client
 * Communicates with the FastAPI backend.
 */

function getNormalizedBaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_API_URL;
  let url = (typeof raw === "string" ? raw : "")
    .replace(/^[\s\uFEFF\xA0\t\r\n]+|[\s\uFEFF\xA0\t\r\n]+$/g, "")
    .trim();

  if (!url) {
    url = process.env.NODE_ENV === "production"
      ? "https://agroscope-ai.onrender.com"
      : "http://localhost:8000";
  }

  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    url = `https://${url}`;
  }

  url = url.replace(/\/+$/, "");
  url = url.replace(/\/api$/, "");

  return url;
}

const BASE = getNormalizedBaseUrl();

export interface FieldAnalysisParams {
  latitude: number;
  longitude: number;
  startDate?: string;
  endDate?: string;
  label?: string;
}

export interface FieldReport {
  location:     { latitude: number; longitude: number; label: string };
  period:       {
    start: string;
    end: string;
    days: number;
    valid_days?: number;
    finalized_until?: string | null;
    finalized_pct?: number;
  };
  is_demo:      boolean;
  demo_notice?: string;
  climate: {
    temperature:   { dates: string[]; values: number[]; unit: string; mean: number; trend: TrendResult };
    precipitation: { dates: string[]; values: number[]; unit: string; total_mm: number; trend: TrendResult };
    humidity:      { dates: string[]; values: number[]; unit: string };
    solar:         { dates: string[]; values: number[]; unit: string };
    spi_3:         { dates: string[]; values: (number | null)[]; unit: string; recent: number | null };
    gdd:           { dates: string[]; values: number[]; unit: string; cumulative: number; t_base: number };
  };
  soil_moisture: {
    surface:    { dates: string[]; values: number[]; unit: string };
    root_zone:  { dates: string[]; values: number[]; unit: string };
    analysis:   SoilMoistureAnalysis;
    data_type:  string;
  };
  vegetation_proxy: {
    dates:         string[];
    values:        number[];
    anomaly:       number;
    is_proxy:      boolean;
    proxy_notice:  string;
  };
  stress: StressAssessment;
  crop_recommendations: CropScore[];
  key_findings:  string[];
  gibs_layers:   GibsLayer[];
  data_sources:  DataSource[];
  methodology:   string;
  limitations:   string;
  generated_at:  string;
}

export interface TrendResult {
  slope: number | null;
  r2: number | null;
  p_value: number | null;
  significant: boolean;
  direction: "increasing" | "decreasing";
  interpretation: string;
}

export interface SoilMoistureAnalysis {
  surface:         { mean: number; min: number; max: number; std: number };
  root_zone:       { mean: number; min: number; max: number; std: number };
  dry_stress_days: number;
  dry_stress_pct:  number;
  dry_threshold:   number;
  interpretation:  string;
  data_source:     string;
}

export interface StressAssessment {
  score:      number;
  level:      "Low" | "Moderate" | "Elevated" | "High" | "Severe";
  color:      string;
  indicators: Record<string, { value: number | null; stress_contribution: number | null }>;
  confidence: number;
  note:       string;
}

export interface CropScore {
  crop_id:       string;
  name:          string;
  score:         number;
  scores:        Record<string, number>;
  benefits:      string[];
  risks:         string[];
  gdd_required:  number;
  gdd_available: number;
  water_need_mm: number;
  precip_mm:     number;
}

export interface GibsLayer {
  key:      string;
  name:     string;
  tile_url: string;
  source:   string;
  units:    string;
}

export interface DataSource {
  name:       string;
  url:        string;
  type:       string;
  variables?: string;
  resolution?:string;
  auth?:      string;
}

export interface AdvisorResponse {
  location:              { latitude: number; longitude: number; label: string };
  period:                { start: string; end: string };
  is_demo:               boolean;
  environmental_context: Record<string, number | null | string>;
  evidence_summary:      string[];
  adaptation_strategies: { title: string; strategies: string[]; data_basis: string }[];
  crop_rotation_ranking: CropScore[];
  key_caveats:           string[];
  data_sources:          string[];
}

export interface ScenarioSimulationResult {
  location: { latitude: number; longitude: number };
  period: { start: string; end: string };
  scenario_inputs: {
    rainfall_delta_pct: number;
    temp_delta_c: number;
    soil_moisture_delta: number;
    irrigation_available: boolean;
  };
  baseline: {
    stress: StressAssessment;
    crops: CropScore[];
    total_gdd: number;
    total_precip_mm: number;
    mean_temp_c: number;
    soil_mean: number;
    ndvi_anomaly: number;
  };
  scenario: {
    stress: StressAssessment;
    crops: CropScore[];
    total_gdd: number;
    total_precip_mm: number;
    mean_temp_c: number;
    soil_mean: number;
    ndvi_anomaly: number;
  };
  delta_summary: {
    stress_delta: number;
    stress_direction: string;
    gdd_delta: number;
    precip_delta_mm: number;
    soil_moisture_delta: number;
  };
  narrative: string;
  data_source: string;
  is_demo: boolean;
  scientific_disclaimer: string;
}

export interface ChangeComparisonRow {
  indicator: string;
  period1_value: number | string | null;
  period2_value: number | string | null;
  delta: number | null;
  direction: string;
}

export interface ChangeDetectionResult {
  location: { latitude: number; longitude: number };
  period1: {
    label: string;
    period_start: string;
    period_end: string;
    mean_temp_c: number;
    total_precip_mm: number;
    mean_soil_wetness: number;
    ndvi_proxy_mean: number;
    spi_recent: number | null;
    total_gdd: number;
    stress_score: number;
    stress_level: string;
    stress_color: string;
  };
  period2: {
    label: string;
    period_start: string;
    period_end: string;
    mean_temp_c: number;
    total_precip_mm: number;
    mean_soil_wetness: number;
    ndvi_proxy_mean: number;
    spi_recent: number | null;
    total_gdd: number;
    stress_score: number;
    stress_level: string;
    stress_color: string;
  };
  comparison_table: ChangeComparisonRow[];
  imagery: {
    period1: { layer: string; date: string; wms_url: string; note: string };
    period2: { layer: string; date: string; wms_url: string; note: string };
  };
  narrative: string;
  is_demo: boolean;
  scientific_note: string;
}

export interface WaterIntelligenceResult {
  location: { latitude: number; longitude: number };
  period: { start: string; end: string };
  dates: string[];
  gwettop_series: (number | null)[];
  gwetroot_series: (number | null)[];
  precip_series: (number | null)[];
  spi_series: (number | null)[];
  evap_mmday: (number | null)[];
  cumulative_precip: number[];
  soil_moisture_analysis: {
    surface: { mean: number; min: number; max: number };
    root_zone: { mean: number; min: number; max: number };
    dry_stress_days: number;
    dry_stress_pct: number;
    dry_threshold: number;
    interpretation: string;
  };
  water_stress_index: {
    wsi: number;
    level: string;
    color: string;
    note: string;
  };
  spi_recent: number | null;
  spi_category: string;
  total_precip_mm: number;
  seasonal_comparison: { label: string; total_precip_mm: number; mean_root_wetness: number }[];
  dry_spells: { start_date: string; end_date: string; length_days: number }[];
  is_demo: boolean;
  scientific_note: string;
}

export interface PhenologyCurve {
  year: number;
  doy: number[];
  ndvi_proxy: (number | null)[];
  ndvi_smooth: (number | null)[];
  cumulative_gdd: number[];
  phenological_events: {
    green_up_doy: number | null;
    peak_doy: number | null;
    senescence_doy: number | null;
  };
  gdd_crop_thresholds: Record<string, Record<string, number | null>>;
  n_days: number;
}

export interface PhenologyResult {
  location: { latitude: number; longitude: number };
  years: number[];
  curves: PhenologyCurve[];
  anomaly: {
    year: number;
    baseline_years: number[];
    anomaly_series: (number | null)[];
    doy: number[];
    mean_anomaly: number;
  } | null;
  inter_annual_trend: {
    peak_ndvi_per_year: (number | null)[];
    peak_doy_per_year: (number | null)[];
    trend: { slope: number | null; p_value: number | null; significant: boolean };
  };
  is_demo: boolean;
  scientific_disclaimer: string;
}

export interface RegionalRiskLocation {
  label: string;
  latitude: number;
  longitude: number;
  stress_score: number | null;
  stress_level: string;
  stress_color: string;
  stress_indicators: Record<string, { value: number | null; stress_contribution: number | null }>;
  spi_recent: number | null;
  spi_category: string;
  total_precip_mm: number;
  mean_temp_c: number;
  soil_mean: number;
  total_gdd: number;
  top_crops: CropScore[];
  dry_stress_pct: number;
  is_demo: boolean;
  error?: string | null;
}

export interface RegionalRiskResult {
  period: { start: string; end: string };
  locations: RegionalRiskLocation[];
  summary: {
    n_locations: number;
    n_successful: number;
    mean_stress: number | null;
    max_stress: number | null;
    min_stress: number | null;
    highest_risk_location: string | null;
    lowest_risk_location: string | null;
  };
  is_demo: boolean;
  scientific_note: string;
}

export interface BoundaryAnalysisResult {
  field_name: string;
  boundary_metrics: {
    centroid: { latitude: number; longitude: number };
    bbox: { min_lon: number; min_lat: number; max_lon: number; max_lat: number };
    area_hectares: number;
    area_km2: number;
    perimeter_km: number;
    vertex_count: number;
  };
  analysis: FieldReport;
  spatial_resolution_disclaimer: string;
}

// ── API functions ──────────────────────────────────────────

export async function analyzeField(params: FieldAnalysisParams): Promise<FieldReport> {
  const url = new URL(`${BASE}/api/field-intelligence/analyze`);
  url.searchParams.set("latitude",  String(params.latitude));
  url.searchParams.set("longitude", String(params.longitude));
  if (params.startDate) url.searchParams.set("start_date", params.startDate);
  if (params.endDate)   url.searchParams.set("end_date",   params.endDate);
  if (params.label)     url.searchParams.set("label",      params.label);

  try {
    const res = await fetch(url.toString());
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      const detail = err.detail || "";
      if (res.status === 422) {
        throw new Error(`Validation Error (422): ${detail || "Invalid latitude, longitude, or date range."}`);
      }
      if (res.status === 503 || res.status === 504) {
        throw new Error(`NASA Upstream Error (${res.status}): ${detail || "NASA POWER API is temporarily unreachable or rate limited."}`);
      }
      if (res.status === 500) {
        throw new Error(`Backend Pipeline Error (500): ${detail || "An unexpected error occurred during scientific calculation."}`);
      }
      throw new Error(detail || `API error (${res.status})`);
    }
    return res.json();
  } catch (err: unknown) {
    if (err instanceof Error && err.name === "TypeError" && err.message?.includes("fetch")) {
      throw new Error(`Connection Error: Unable to reach AGROSCOPE AI backend at ${BASE}. Ensure the FastAPI server is running on port 8000.`);
    }
    throw err;
  }
}

export interface CopilotChatPayload {
  question: string;
  requested_latitude: number;
  requested_longitude: number;
  canonical_location_label?: string;
  location_revision?: number;
  data_latitude?: number;
  data_longitude?: number;
  data_retrieval_timestamp?: string;
  advisor_context?: Record<string, unknown> | null;
}

export interface CopilotChatResponse {
  reply: string;
  model?: string | null;
  ai_powered: boolean;
  fallback_reason?: string | null;
  mismatch_detected?: boolean;
  requested_latitude: number;
  requested_longitude: number;
  canonical_location_label?: string | null;
  data_latitude?: number | null;
  data_longitude?: number | null;
  location_match: boolean;
  disclaimer: string;
}

export interface CopilotStatusResponse {
  ai_powered: boolean;
  model?: string | null;
  status: string;
}

export async function askCopilot(
  param: string | CopilotChatPayload,
  advisorContext?: Record<string, unknown> | null
): Promise<CopilotChatResponse> {
  const url = `${BASE}/api/copilot/chat`;

  let body: Record<string, unknown>;
  if (typeof param === "object") {
    body = {
      question: param.question,
      requested_latitude: param.requested_latitude,
      requested_longitude: param.requested_longitude,
      canonical_location_label: param.canonical_location_label || undefined,
      location_revision: param.location_revision || undefined,
      data_latitude: param.data_latitude || undefined,
      data_longitude: param.data_longitude || undefined,
      data_retrieval_timestamp: param.data_retrieval_timestamp || undefined,
      advisor_context: param.advisor_context || null,
    };
  } else {
    body = {
      question: param,
      requested_latitude: 30.73,
      requested_longitude: 76.78,
      canonical_location_label: "Punjab, India",
      advisor_context: advisorContext || null,
    };
  }

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    const detail = err?.detail;
    const message = Array.isArray(detail)
      ? detail.map((item: unknown) => {
          if (item && typeof item === "object") {
            const issue = item as { loc?: unknown[]; msg?: unknown };
            const field = Array.isArray(issue.loc)
              ? issue.loc.filter((part) => part !== "body").join(".")
              : "request";
            return `${field}: ${typeof issue.msg === "string" ? issue.msg : "Invalid value"}`;
          }
          return String(item);
        }).join("; ")
      : typeof detail === "string"
        ? detail
        : detail && typeof detail === "object"
          ? JSON.stringify(detail)
          : `Copilot API error ${res.status}`;
    throw new Error(message);
  }
  return res.json();
}

export async function getCopilotStatus(): Promise<CopilotStatusResponse> {
  const url = `${BASE}/api/copilot/status`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Copilot status API error ${res.status}`);
  return res.json();
}

export async function getAdvisorRecommendations(params: FieldAnalysisParams): Promise<AdvisorResponse> {
  const url = new URL(`${BASE}/api/advisor/recommendations`);
  url.searchParams.set("latitude",  String(params.latitude));
  url.searchParams.set("longitude", String(params.longitude));
  if (params.startDate) url.searchParams.set("start_date", params.startDate);
  if (params.endDate)   url.searchParams.set("end_date",   params.endDate);
  if (params.label)     url.searchParams.set("label",      params.label);

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Advisor API error ${res.status}`);
  return res.json();
}

export async function getDailyClimate(params: FieldAnalysisParams) {
  const url = new URL(`${BASE}/api/power/daily`);
  url.searchParams.set("latitude",   String(params.latitude));
  url.searchParams.set("longitude",  String(params.longitude));
  url.searchParams.set("start_date", params.startDate || "2023-01-01");
  url.searchParams.set("end_date",   params.endDate   || "2023-12-31");
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Climate API error ${res.status}`);
  return res.json();
}

export async function checkHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${BASE}/api/health`, { cache: "no-store" });
    return res.ok;
  } catch {
    return false;
  }
}

export async function simulateScenario(params: {
  latitude: number;
  longitude: number;
  startDate: string;
  endDate: string;
  rainfallDeltaPct?: number;
  tempDeltaC?: number;
  soilMoistureDelta?: number;
  irrigationAvailable?: boolean;
}): Promise<ScenarioSimulationResult> {
  const url = new URL(`${BASE}/api/scenarios/simulate`);
  url.searchParams.set("latitude", String(params.latitude));
  url.searchParams.set("longitude", String(params.longitude));
  url.searchParams.set("start_date", params.startDate);
  url.searchParams.set("end_date", params.endDate);
  if (params.rainfallDeltaPct !== undefined) url.searchParams.set("rainfall_delta_pct", String(params.rainfallDeltaPct));
  if (params.tempDeltaC !== undefined) url.searchParams.set("temp_delta_c", String(params.tempDeltaC));
  if (params.soilMoistureDelta !== undefined) url.searchParams.set("soil_moisture_delta", String(params.soilMoistureDelta));
  if (params.irrigationAvailable !== undefined) url.searchParams.set("irrigation_available", String(params.irrigationAvailable));

  const res = await fetch(url.toString());
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || `Scenario API error ${res.status}`);
  }
  return res.json();
}

export async function compareChangeDetection(params: {
  latitude: number;
  longitude: number;
  date1: string;
  date2: string;
  windowDays?: number;
}): Promise<ChangeDetectionResult> {
  const url = new URL(`${BASE}/api/change-detection/compare`);
  url.searchParams.set("latitude", String(params.latitude));
  url.searchParams.set("longitude", String(params.longitude));
  url.searchParams.set("date1", params.date1);
  url.searchParams.set("date2", params.date2);
  if (params.windowDays) url.searchParams.set("window_days", String(params.windowDays));

  const res = await fetch(url.toString());
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || `Change Detection API error ${res.status}`);
  }
  return res.json();
}

export async function getWaterIntelligence(params: {
  latitude: number;
  longitude: number;
  startDate: string;
  endDate: string;
}): Promise<WaterIntelligenceResult> {
  const url = new URL(`${BASE}/api/water/analysis`);
  url.searchParams.set("latitude", String(params.latitude));
  url.searchParams.set("longitude", String(params.longitude));
  url.searchParams.set("start_date", params.startDate);
  url.searchParams.set("end_date", params.endDate);

  const res = await fetch(url.toString());
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || `Water Intelligence API error ${res.status}`);
  }
  return res.json();
}

export async function getPhenology(params: {
  latitude: number;
  longitude: number;
  years?: string;
}): Promise<PhenologyResult> {
  const url = new URL(`${BASE}/api/phenology/seasonal`);
  url.searchParams.set("latitude", String(params.latitude));
  url.searchParams.set("longitude", String(params.longitude));
  if (params.years) url.searchParams.set("years", params.years);

  const res = await fetch(url.toString());
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || `Phenology API error ${res.status}`);
  }
  return res.json();
}

export async function getRegionalRisk(params: {
  startDate: string;
  endDate: string;
  locations?: { lat: number; lon: number; label: string }[];
  usePresets?: boolean;
}): Promise<RegionalRiskResult> {
  const url = new URL(`${BASE}/api/risk/regional`);
  url.searchParams.set("start_date", params.startDate);
  url.searchParams.set("end_date", params.endDate);
  if (params.usePresets !== undefined) url.searchParams.set("use_presets", String(params.usePresets));
  if (params.locations && params.locations.length > 0) {
    url.searchParams.set("locations", JSON.stringify(params.locations));
  }

  const res = await fetch(url.toString());
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || `Risk Radar API error ${res.status}`);
  }
  return res.json();
}

export async function analyzeFieldBoundary(payload: {
  fieldName: string;
  startDate?: string;
  endDate?: string;
  geometry: {
    type: "Polygon";
    coordinates: number[][][];
  };
}): Promise<BoundaryAnalysisResult> {
  const url = `${BASE}/api/field/analyze-boundary`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      field_name: payload.fieldName,
      start_date: payload.startDate,
      end_date: payload.endDate,
      geometry: payload.geometry,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || `Boundary API error ${res.status}`);
  }
  return res.json();
}

// ── Utility ────────────────────────────────────────────────

export function formatDate(iso: string): string {
  if (!iso || iso.length < 8) return iso;
  // POWER dates are YYYYMMDD
  if (iso.length === 8 && !iso.includes("-")) {
    return `${iso.slice(0, 4)}-${iso.slice(4, 6)}-${iso.slice(6, 8)}`;
  }
  return iso.slice(0, 10);
}

export function stressColor(level: string): string {
  const map: Record<string, string> = {
    Low: "#22c55e", Moderate: "#86efac", Elevated: "#fcd34d", High: "#f97316", Severe: "#dc2626",
  };
  return map[level] ?? "#94a3b8";
}

export interface GeocodeLocation {
  label: string;
  name: string;
  latitude: number;
  longitude: number;
  type: string;
  country: string;
  source: string;
}

export interface ReverseGeocodeResult {
  latitude: number;
  longitude: number;
  label: string;
  place: string;
  state?: string;
  country?: string;
  source: string;
}

export interface BenchmarkPreset {
  label: string;
  name: string;
  latitude: number;
  longitude: number;
  country: string;
  region: string;
  crop: string;
  note: string;
}

export async function getBenchmarkPresets(): Promise<BenchmarkPreset[]> {
  const url = `${BASE}/api/location/presets`;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error("Presets fetch failed");
    const data = await res.json();
    return data.presets || [];
  } catch {
    return [
      {
        label: "Punjab Plain, India",
        name: "Punjab Indo-Gangetic Basin",
        latitude: 30.73,
        longitude: 76.78,
        country: "India",
        region: "South Asia",
        crop: "Rice / Wheat Rotation",
        note: "Intensive alluvial canal/tubewell irrigated rabi-kharif breadbasket",
      },
      {
        label: "Kansas Wheat Belt, USA",
        name: "Kansas Great Plains",
        latitude: 38.34,
        longitude: -98.12,
        country: "USA",
        region: "North America",
        crop: "Hard Red Winter Wheat",
        note: "Semi-arid dryland and Ogallala Aquifer center-pivot winter cereal system",
      },
      {
        label: "Chennai Coastal Agro-Zone, India",
        name: "Chennai Coromandel Coast",
        latitude: 13.0827,
        longitude: 80.2707,
        country: "India",
        region: "South Asia",
        crop: "Paddy Rice / Pulses",
        note: "Tropical wet-and-dry coastal basin with northeast monsoon rainfall",
      },
      {
        label: "São Paulo State, Brazil",
        name: "São Paulo Agro-Corridor",
        latitude: -23.5505,
        longitude: -46.6333,
        country: "Brazil",
        region: "South America",
        crop: "Soybean / Sugarcane / Citrus",
        note: "Southern Hemisphere subtropical plateau with summer rainfall peak",
      },
      {
        label: "Nairobi Highland Basin, Kenya",
        name: "Nairobi Rift Highlands",
        latitude: -1.2921,
        longitude: 36.8219,
        country: "Kenya",
        region: "East Africa",
        crop: "Maize / Horticulture / Coffee",
        note: "Equatorial bimodal rainfall highland system (long and short rains)",
      },
      {
        label: "Sydney Mixed Farming Basin, Australia",
        name: "Cumberland Plain & Basin",
        latitude: -33.8688,
        longitude: 151.2093,
        country: "Australia",
        region: "Oceania",
        crop: "Winter Cereals / Pasture",
        note: "Southern Hemisphere temperate maritime agricultural margin",
      },
    ];
  }
}

export async function geocodeLocation(query: string): Promise<GeocodeLocation[]> {
  if (!query || query.trim().length < 2) return [];
  const primaryUrl = new URL(`${BASE}/api/location/geocode`);
  primaryUrl.searchParams.set("query", query.trim());
  try {
    const res = await fetch(primaryUrl.toString());
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.results)) return data.results;
    }
  } catch {
    // try fallback
  }

  // Fallback to legacy scenarios endpoint
  try {
    const fallbackUrl = new URL(`${BASE}/api/scenarios/geocode`);
    fallbackUrl.searchParams.set("query", query.trim());
    const res = await fetch(fallbackUrl.toString());
    if (res.ok) {
      const data = await res.json();
      return data.results || [];
    }
  } catch {
    // ignored
  }
  return [];
}

export async function reverseGeocodeLocation(lat: number, lon: number): Promise<ReverseGeocodeResult> {
  const primaryUrl = new URL(`${BASE}/api/location/reverse-geocode`);
  primaryUrl.searchParams.set("latitude", String(lat));
  primaryUrl.searchParams.set("longitude", String(lon));
  try {
    const res = await fetch(primaryUrl.toString());
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // try fallback
  }

  try {
    const fallbackUrl = new URL(`${BASE}/api/scenarios/reverse-geocode`);
    fallbackUrl.searchParams.set("latitude", String(lat));
    fallbackUrl.searchParams.set("longitude", String(lon));
    const res = await fetch(fallbackUrl.toString());
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // ignored
  }

  const latDir = lat >= 0 ? "N" : "S";
  const lonDir = lon >= 0 ? "E" : "W";
  const hemi = lat < 0 ? "Southern Hemisphere" : "Northern Hemisphere";
  return {
    latitude: lat,
    longitude: lon,
    label: `Agricultural Parcel (${Math.abs(lat).toFixed(4)}°${latDir}, ${Math.abs(lon).toFixed(4)}°${lonDir} — ${hemi})`,
    place: "Custom Coordinates",
    source: "Coordinate Math",
  };
}
