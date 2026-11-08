import type { NextConfig } from "next";
import path from "path";

/**
 * Normalize the backend API URL for Next.js rewrites:
 * - Trims leading/trailing whitespace, tabs (\t), and newlines
 * - Defaults to production Render deployment or local development port
 * - Guarantees http:// or https:// protocol
 * - Strips trailing slashes and redundant trailing /api to prevent duplicate paths
 */
function getNormalizedBackendUrl(): string {
  const raw = process.env.NEXT_PUBLIC_API_URL;
  let url = (typeof raw === "string" ? raw : "")
    .replace(/^[\s\uFEFF\xA0\t\r\n]+|[\s\uFEFF\xA0\t\r\n]+$/g, "")
    .trim();

  if (!url) {
    url = process.env.NODE_ENV === "production"
      ? "https://agroscope-ai.onrender.com"
      : "http://localhost:8000";
  }

  // Ensure absolute protocol
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    url = `https://${url}`;
  }

  // Remove any trailing slashes
  url = url.replace(/\/+$/, "");

  // Remove redundant trailing /api to prevent duplicate /api/api/:path*
  url = url.replace(/\/api$/, "");

  return url;
}

const backendUrl = getNormalizedBackendUrl();

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(__dirname),
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${backendUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
