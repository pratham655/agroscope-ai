import type { Metadata } from "next";
import "./globals.css";
import "leaflet/dist/leaflet.css";
import Nav from "@/components/Nav";
import { LocationProvider } from "@/context/LocationContext";
import GlobalLocationModal from "@/components/GlobalLocationModal";

export const metadata: Metadata = {
  title: "AGROSCOPE AI — Planetary Earth Intelligence for Resilient Agriculture",
  description:
    "NASA Space Apps Challenge 2026 · Problem #7 Field Shift. " +
    "Global agricultural intelligence powered by NASA Earth observations, climate reanalysis, and biophysical modeling.",
  keywords: ["NASA", "Earth observation", "agriculture", "crop rotation", "NDVI", "soil moisture", "SPI", "Space Apps"],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#f8fafc] text-slate-900 antialiased selection:bg-emerald-100 selection:text-emerald-900">
        <LocationProvider>
          <Nav />
          <main className="min-h-[calc(100vh-3.5rem)]">{children}</main>
          <GlobalLocationModal />
        </LocationProvider>
      </body>
    </html>
  );
}
