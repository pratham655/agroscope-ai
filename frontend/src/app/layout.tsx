import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import "leaflet/dist/leaflet.css";
import Nav from "@/components/Nav";
import { LocationProvider } from "@/context/LocationContext";
import GlobalLocationModal from "@/components/GlobalLocationModal";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "AGROSCOPE AI — Earth Intelligence for Smarter Agriculture",
  description:
    "NASA Space Apps Challenge 2026 — Field Shift. " +
    "Crop rotation decision support powered by NASA Earth observations.",
  keywords: ["NASA", "agriculture", "crop rotation", "NDVI", "soil moisture", "Space Apps"],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen bg-[#f8faf5]">
        <LocationProvider>
          <Nav />
          <main>{children}</main>
          <GlobalLocationModal />
        </LocationProvider>
      </body>
    </html>
  );
}
