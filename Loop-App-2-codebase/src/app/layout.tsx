import type { Metadata, Viewport } from "next";
import { Space_Grotesk } from 'next/font/google';
import "./globals.css";
import { Toaster } from "@/components/ui/NativeToast";

const spaceGrotesk = Space_Grotesk({ 
  subsets: ['latin'], 
  weight: ['300', '400', '500', '600', '700'], 
  variable: '--font-space-grotesk', 
  display: 'swap' 
});

export const metadata: Metadata = {
  title: "LOOP - Purpose-Based Ride Coordination",
  description: "Rides go better in Loop. Mobile-first real-time ride sharing and coordination.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon-192.png", type: "image/png", sizes: "192x192" },
      { url: "/icon-512.png", type: "image/png", sizes: "512x512" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "LOOP",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={spaceGrotesk.variable}>
      <head>
        <link rel="preload" as="image" href="/header-logo.png" />
      </head>
      <body className="antialiased">
        {children}
        <Toaster />
        {/* Apple iOS 26 Liquid Glass Distortion & Caustic Filters */}
        <svg
          style={{ position: "absolute", width: 0, height: 0, pointerEvents: "none", overflow: "hidden" }}
          aria-hidden="true"
        >
          <defs>
            <filter id="liquid-glass-refraction" x="-10%" y="-10%" width="120%" height="120%">
              <feTurbulence type="fractalNoise" baseFrequency="0.04 0.04" numOctaves="3" result="noise" />
              <feDisplacementMap in="SourceGraphic" in2="noise" scale="5" xChannelSelector="R" yChannelSelector="G" />
            </filter>
            <filter id="liquid-caustic-edge" x="-10%" y="-10%" width="120%" height="120%">
              <feTurbulence type="turbulence" baseFrequency="0.02" numOctaves="2" result="turb" />
              <feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7" />
            </filter>
          </defs>
        </svg>
      </body>
    </html>
  );
}
