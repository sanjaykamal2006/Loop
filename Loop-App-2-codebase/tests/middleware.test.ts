import { describe, it, expect } from "vitest";
import { createHash } from "node:crypto";
import { NextRequest } from "next/server";
import { proxy } from "@/proxy";
import { STRUCTURED_DATA_JSON } from "@/lib/structuredData";

describe("CSP proxy", () => {
  it("sets a nonce-based policy without unsafe-inline scripts", async () => {
    const response = await proxy(new NextRequest("http://localhost/"));
    const csp = response.headers.get("content-security-policy") || "";

    expect(csp).toContain("script-src 'self' 'nonce-");
    expect(csp).toContain("'strict-dynamic'");
    expect(csp).not.toContain("script-src 'self' 'unsafe-inline'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("frame-ancestors 'none'");
  });

  it("allows the static JSON-LD block by hash", async () => {
    const response = await proxy(new NextRequest("http://localhost/"));
    const csp = response.headers.get("content-security-policy") || "";
    const expectedHash = createHash("sha256")
      .update(STRUCTURED_DATA_JSON)
      .digest("base64");

    expect(csp).toContain(`'sha256-${expectedHash}'`);
  });

  it("generates a different nonce per request", async () => {
    const first = await proxy(new NextRequest("http://localhost/"));
    const second = await proxy(new NextRequest("http://localhost/"));
    const firstNonce = first.headers.get("content-security-policy")?.match(/'nonce-([^']+)'/)?.[1];
    const secondNonce = second.headers.get("content-security-policy")?.match(/'nonce-([^']+)'/)?.[1];

    expect(firstNonce).toBeTruthy();
    expect(secondNonce).toBeTruthy();
    expect(firstNonce).not.toBe(secondNonce);
  });
});
