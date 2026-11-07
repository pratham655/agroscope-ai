"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import {
  geocodeLocation,
  reverseGeocodeLocation,
  getBenchmarkPresets,
  type GeocodeLocation,
  type ReverseGeocodeResult,
  type BenchmarkPreset,
} from "@/lib/api";

export interface CanonicalLocation {
  latitude: number;
  longitude: number;
  label: string;
  name?: string;
  country?: string;
  region?: string;
  crop?: string;
  startDate: string;
  endDate: string;
  source?: "search" | "coords" | "map" | "gps" | "preset" | "polygon";
}

interface LocationContextType {
  currentLocation: CanonicalLocation;
  setLocation: (loc: Partial<CanonicalLocation>) => void;
  savedLocations: CanonicalLocation[];
  saveLocation: (loc: CanonicalLocation) => void;
  removeSavedLocation: (label: string) => void;
  isModalOpen: boolean;
  openModal: () => void;
  closeModal: () => void;
  presets: BenchmarkPreset[];
  searchLocations: (q: string) => Promise<GeocodeLocation[]>;
  reverseGeocode: (lat: number, lon: number) => Promise<ReverseGeocodeResult>;
  acquireGpsLocation: () => Promise<CanonicalLocation>;
  useCurrentLocationGps: () => Promise<CanonicalLocation>;
  formattedCoords: string;
  hemisphereLabel: string;
}

const DEFAULT_LOCATION: CanonicalLocation = {
  latitude: 30.73,
  longitude: 76.78,
  label: "Punjab Plain, India",
  name: "Punjab Indo-Gangetic Basin",
  country: "India",
  region: "South Asia",
  crop: "Rice / Wheat Rotation",
  startDate: "2023-01-01",
  endDate: "2023-12-31",
  source: "preset",
};

const LocationContext = createContext<LocationContextType | undefined>(undefined);

const STORAGE_KEY_ACTIVE = "agroscope_active_location";
const STORAGE_KEY_SAVED = "agroscope_saved_locations";

export function LocationProvider({ children }: { children: React.ReactNode }) {
  const [currentLocation, setCurrentLocationState] = useState<CanonicalLocation>(DEFAULT_LOCATION);
  const [savedLocations, setSavedLocations] = useState<CanonicalLocation[]>([]);
  const [presets, setPresets] = useState<BenchmarkPreset[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Initialize from localStorage on mount (client-side only)
  useEffect(() => {
    try {
      const storedActive = localStorage.getItem(STORAGE_KEY_ACTIVE);
      if (storedActive) {
        const parsed = JSON.parse(storedActive);
        if (
          typeof parsed.latitude === "number" &&
          typeof parsed.longitude === "number" &&
          parsed.latitude >= -90 &&
          parsed.latitude <= 90 &&
          parsed.longitude >= -180 &&
          parsed.longitude <= 180
        ) {
          setCurrentLocationState((prev) => ({ ...prev, ...parsed }));
        }
      }

      const storedSaved = localStorage.getItem(STORAGE_KEY_SAVED);
      if (storedSaved) {
        const parsedSaved = JSON.parse(storedSaved);
        if (Array.isArray(parsedSaved)) {
          setSavedLocations(parsedSaved);
        }
      }
    } catch {
      // localStorage unavailable or invalid JSON
    }

    // Load benchmark presets from backend
    getBenchmarkPresets().then(setPresets).catch(() => {});
  }, []);

  const setLocation = useCallback((updates: Partial<CanonicalLocation>) => {
    setCurrentLocationState((prev) => {
      const nextLat = updates.latitude !== undefined ? updates.latitude : prev.latitude;
      const nextLon = updates.longitude !== undefined ? updates.longitude : prev.longitude;

      // Bound checks
      const validLat = Math.max(-90, Math.min(90, nextLat));
      const validLon = Math.max(-180, Math.min(180, nextLon));

      const updated: CanonicalLocation = {
        ...prev,
        ...updates,
        latitude: validLat,
        longitude: validLon,
      };

      try {
        localStorage.setItem(STORAGE_KEY_ACTIVE, JSON.stringify(updated));
      } catch {
        // storage quota or disabled
      }
      return updated;
    });
  }, []);

  const saveLocation = useCallback((loc: CanonicalLocation) => {
    setSavedLocations((prev) => {
      const filtered = prev.filter((item) => item.label !== loc.label && (item.latitude !== loc.latitude || item.longitude !== loc.longitude));
      const next = [loc, ...filtered].slice(0, 10);
      try {
        localStorage.setItem(STORAGE_KEY_SAVED, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  const removeSavedLocation = useCallback((label: string) => {
    setSavedLocations((prev) => {
      const next = prev.filter((item) => item.label !== label);
      try {
        localStorage.setItem(STORAGE_KEY_SAVED, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  const searchLocations = useCallback(async (q: string) => {
    return geocodeLocation(q);
  }, []);

  const reverseGeocode = useCallback(async (lat: number, lon: number) => {
    return reverseGeocodeLocation(lat, lon);
  }, []);

  const acquireGpsLocation = useCallback(async (): Promise<CanonicalLocation> => {
    return new Promise((resolve, reject) => {
      if (typeof window === "undefined" || !navigator.geolocation) {
        reject(new Error("Browser geolocation is not supported in this environment."));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = roundCoord(position.coords.latitude);
          const lon = roundCoord(position.coords.longitude);

          let label = `GPS Location (${Math.abs(lat).toFixed(4)}°${lat >= 0 ? "N" : "S"}, ${Math.abs(lon).toFixed(4)}°${lon >= 0 ? "E" : "W"})`;
          let country = "Current GPS Coordinates";
          let place = "Local Agricultural Field";

          try {
            const rev = await reverseGeocodeLocation(lat, lon);
            if (rev && rev.label) {
              label = rev.label;
              if (rev.country) country = rev.country;
              if (rev.place) place = rev.place;
            }
          } catch {
            // Keep coordinate label
          }

          const newLoc: CanonicalLocation = {
            latitude: lat,
            longitude: lon,
            label,
            name: place,
            country,
            startDate: currentLocation.startDate || "2023-01-01",
            endDate: currentLocation.endDate || "2023-12-31",
            source: "gps",
          };

          setLocation(newLoc);
          resolve(newLoc);
        },
        (err) => {
          reject(new Error(`GPS Geolocation denied or unavailable: ${err.message}`));
        },
        { timeout: 10000, enableHighAccuracy: true }
      );
    });
  }, [currentLocation.startDate, currentLocation.endDate, setLocation]);

  const formattedCoords = useMemo(() => {
    const lat = currentLocation.latitude;
    const lon = currentLocation.longitude;
    const latDir = lat >= 0 ? "N" : "S";
    const lonDir = lon >= 0 ? "E" : "W";
    return `${Math.abs(lat).toFixed(4)}°${latDir}, ${Math.abs(lon).toFixed(4)}°${lonDir}`;
  }, [currentLocation.latitude, currentLocation.longitude]);

  const hemisphereLabel = useMemo(() => {
    return currentLocation.latitude < 0 ? "Southern Hemisphere" : "Northern Hemisphere";
  }, [currentLocation.latitude]);

  const value = useMemo(
    () => ({
      currentLocation,
      setLocation,
      savedLocations,
      saveLocation,
      removeSavedLocation,
      isModalOpen,
      openModal: () => setIsModalOpen(true),
      closeModal: () => setIsModalOpen(false),
      presets,
      searchLocations,
      reverseGeocode,
      acquireGpsLocation,
      useCurrentLocationGps: acquireGpsLocation,
      formattedCoords,
      hemisphereLabel,
    }),
    [
      currentLocation,
      setLocation,
      savedLocations,
      saveLocation,
      removeSavedLocation,
      isModalOpen,
      presets,
      searchLocations,
      reverseGeocode,
      acquireGpsLocation,
      formattedCoords,
      hemisphereLabel,
    ]
  );

  return <LocationContext.Provider value={value}>{children}</LocationContext.Provider>;
}

export function useLocation() {
  const context = useContext(LocationContext);
  if (!context) {
    throw new Error("useLocation must be used within a LocationProvider");
  }
  return context;
}

function roundCoord(v: number): number {
  return Math.round(v * 10000) / 10000;
}
