import { NextResponse } from 'next/server';

export const dynamic = 'force-static';
export const revalidate = 86400;

const FINGERPRINT_RE = /^([0-9A-F]{2}:){31}[0-9A-F]{2}$/;

/**
 * Android App Links verification file.
 *
 * Only a real SHA-256 signing-certificate fingerprint can authorise the
 * installed app. A placeholder (all-zero) digest silently fails verification,
 * and the previous static public/.well-known/assetlinks.json shipped exactly
 * that. Configure the real value(s) from Play Console (Play App Signing) or
 * your local keystore:
 *
 *   ASSETLINKS_SHA256="AA:BB:…"           # single certificate
 *   ASSETLINKS_SHA256="AA:BB:…,11:22:…"   # Play App Signing + upload key
 *
 * When nothing valid is configured, serve an empty association list — the
 * honest "no app links" answer — instead of a fake fingerprint.
 */
export async function GET() {
  const packageName = process.env.NEXT_PUBLIC_PACKAGE_NAME || 'app.loop.twa';
  const raw = process.env.ASSETLINKS_SHA256 || '';

  const fingerprints = raw
    .split(',')
    .map((value) => value.trim().toUpperCase())
    .filter((value) => FINGERPRINT_RE.test(value))
    // The old static file shipped an all-zero placeholder digest; it is
    // format-valid but verifies nothing, so never serve it as a real entry.
    .filter((value) => value.replace(/:/g, '') !== '0'.repeat(64));

  if (fingerprints.length === 0) {
    return NextResponse.json([], {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300, stale-while-revalidate=86400',
      },
    });
  }

  const assetlinks = [
    {
      relation: ['delegate_permission/common.handle_all_urls'],
      target: {
        namespace: 'android_app',
        package_name: packageName,
        sha256_cert_fingerprints: fingerprints,
      },
    },
  ];

  return NextResponse.json(assetlinks, {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
    },
  });
}
