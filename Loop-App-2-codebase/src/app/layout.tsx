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
    icon: "/logo.png",
    apple: "/logo.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "LOOP",
  },
};

export const viewport: Viewport = {
  themeColor: "#000000",
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
      <body className="antialiased">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
