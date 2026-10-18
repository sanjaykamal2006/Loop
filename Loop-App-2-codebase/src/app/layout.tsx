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

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://loop-app.runs-on.dev";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "LOOP - Purpose-Based Ride Coordination",
  description: "Rides go better in Loop. Mobile-first real-time ride sharing and coordination.",
  manifest: "/manifest.webmanifest",
  openGraph: {
    type: "website",
    siteName: "LOOP",
    url: "/",
    title: "LOOP - Purpose-Based Ride Coordination",
    description:
      "Rides go better in Loop. Mobile-first real-time ride sharing and coordination for university students.",
    images: [
      {
        url: "/feature-graphic.png",
        width: 1024,
        height: 500,
        alt: "LOOP — Rides go better in Loop. Real-time ride coordination for university students.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "LOOP - Purpose-Based Ride Coordination",
    description:
      "Rides go better in Loop. Mobile-first real-time ride sharing and coordination for university students.",
    images: ["/feature-graphic.png"],
  },
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
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:z-[100000] focus:top-2 focus:left-2 focus:rounded-lg focus:bg-black focus:px-3 focus:py-2 focus:text-sm focus:font-bold focus:text-white"
        >
          Skip to content
        </a>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
