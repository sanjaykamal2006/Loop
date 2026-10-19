import { NextResponse } from "next/server";

export const dynamic = "force-static";

export function GET() {
  const body = [
    "Contact: https://github.com/sanjaykamal2006/Loop/security/advisories/new",
    "Expires: 2027-12-31T00:00:00.000Z",
    "Preferred-Languages: en",
    "Canonical: https://loop-app.runs-on.dev/.well-known/security.txt",
    "",
  ].join("\n");

  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
