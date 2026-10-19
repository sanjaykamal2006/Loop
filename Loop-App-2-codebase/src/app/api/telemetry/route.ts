import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 8_000;
const MAX_MESSAGE_LENGTH = 500;
const MAX_STACK_LENGTH = 4_000;
const MAX_PATH_LENGTH = 300;

function asTrimmedString(value: unknown, maxLength: number): string | undefined {
  if (typeof value !== "string" || value.length === 0) return undefined;
  return value.slice(0, maxLength);
}

export async function POST(request: NextRequest) {
  // Same-origin only: do not let third-party pages use this as a log sink.
  const origin = request.headers.get("origin");
  if (origin) {
    try {
      if (new URL(origin).host !== request.nextUrl.host) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    } catch {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const ip = getClientIp(request);
  const limit = await checkRateLimit(`telemetry:${ip}`, 20, 10 * 60 * 1000);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: { "Retry-After": String(limit.resetInSeconds) } }
    );
  }

  const contentType = request.headers.get("content-type") || "";
  if (!contentType.includes("application/json") && !contentType.includes("text/plain")) {
    return NextResponse.json({ error: "Unsupported content type" }, { status: 415 });
  }

  const rawBody = await request.text();
  if (rawBody.length === 0) {
    return NextResponse.json({ error: "Empty body" }, { status: 400 });
  }
  if (rawBody.length > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "Payload too large" }, { status: 413 });
  }

  let payload: Record<string, unknown>;
  try {
    const parsed = JSON.parse(rawBody);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }
    payload = parsed as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const message = asTrimmedString(payload.message, MAX_MESSAGE_LENGTH);
  if (!message) {
    return NextResponse.json({ error: "Missing message" }, { status: 400 });
  }

  const stack = asTrimmedString(payload.stack, MAX_STACK_LENGTH);
  const name = asTrimmedString(payload.name, 100);
  const digest = asTrimmedString(payload.digest, 100);
  const path = asTrimmedString(payload.path, MAX_PATH_LENGTH);
  const timestamp = asTrimmedString(payload.timestamp, 50);
  const userAgent = request.headers.get("user-agent")?.slice(0, 250);

  // Structured JSON in Vercel runtime logs. No cookies, tokens or user IDs.
  logger.error(`[client] ${message}`, {
    source: "client",
    name,
    digest,
    stack,
    path,
    timestamp,
    userAgent,
  });

  return new NextResponse(null, {
    status: 204,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function GET() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}
