import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Screenshot Preview | LOOP",
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: { index: false, follow: false },
  },
  alternates: { canonical: "/screenshots-preview" },
};

export default function ScreenshotPreviewLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
