/**
 * Site-wide structured data. Kept as a constant so the proxy can compute
 * a matching CSP hash for the inline JSON-LD block (no nonce needed, no
 * dynamic rendering of the root layout).
 */
export const STRUCTURED_DATA = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://loop-app.runs-on.dev/#organization",
      name: "LOOP",
      url: "https://loop-app.runs-on.dev",
      logo: "https://loop-app.runs-on.dev/icon-512.png",
    },
    {
      "@type": "WebSite",
      "@id": "https://loop-app.runs-on.dev/#website",
      url: "https://loop-app.runs-on.dev",
      name: "LOOP",
      description:
        "Purpose-based real-time ride coordination for university students.",
      publisher: { "@id": "https://loop-app.runs-on.dev/#organization" },
      inLanguage: "en-IN",
    },
  ],
} as const;

export const STRUCTURED_DATA_JSON = JSON.stringify(STRUCTURED_DATA);
