import type { NextConfig } from "next";

/**
 * Content Security Policy (CSP) Configuration
 *
 * NOTE ON SCRIPT-SRC 'UNSAFE-INLINE':
 * Next.js App Router (RSC) emits dynamic inline hydration scripts (e.g. self.__next_f.push)
 * during server-side page emission. In static/serverless deployment without edge middleware
 * nonces, 'unsafe-inline' is required for React 19 client component hydration.
 *
 * Security defenses in depth:
 * - 'unsafe-eval' is strictly gated to development mode only and banned in production.
 * - object-src 'none', frame-ancestors 'none', and base-uri 'self' prevent plugin-based injection and clickjacking.
 * - media-src is restricted to 'self' (internal Web Audio API synthesizer).
 */
const isDev = process.env.NODE_ENV === "development";

const scriptSrc = isDev
  ? "script-src 'self' 'unsafe-inline' 'unsafe-eval';"
  : "script-src 'self' 'unsafe-inline';";

const connectSrc = isDev
  ? "connect-src 'self' https://*.supabase.co wss://*.supabase.co ws://localhost:* http://localhost:*;"
  : "connect-src 'self' https://*.supabase.co wss://*.supabase.co;";

const cspHeader = [
  "default-src 'self';",
  scriptSrc,
  "style-src 'self' 'unsafe-inline';",
  "img-src 'self' data: blob: https://*.supabase.co https://api.qrserver.com;",
  "media-src 'self';",
  "font-src 'self' data:;",
  connectSrc,
  "object-src 'none';",
  "frame-ancestors 'none';",
  "base-uri 'self';",
  "form-action 'self' https://wa.me;",
].join(" ");

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
      {
        protocol: 'https',
        hostname: 'api.qrserver.com',
      },
    ],
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains; preload",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(self)",
          },
          {
            key: "Content-Security-Policy",
            value: cspHeader,
          },
        ],
      },
    ];
  },
};

export default nextConfig;
