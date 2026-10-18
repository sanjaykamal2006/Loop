import { describe, it, expect, afterEach } from "vitest";
import { GET } from "@/app/.well-known/assetlinks.json/route";

const ENV_KEYS = ["ASSETLINKS_SHA256", "NEXT_PUBLIC_PACKAGE_NAME"] as const;
const saved: Record<string, string | undefined> = {};

for (const key of ENV_KEYS) {
  saved[key] = process.env[key];
}

afterEach(() => {
  for (const key of ENV_KEYS) {
    if (saved[key] === undefined) delete process.env[key];
    else process.env[key] = saved[key];
  }
});

const VALID_A = "AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99:AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99";
const VALID_B = "11:22:33:44:55:66:77:88:99:AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99:AA:BB:CC:DD:EE:FF:00";
const ALL_ZERO = `00:${Array.from({ length: 30 }, () => "00").join(":")}:00`;

describe("GET /.well-known/assetlinks.json", () => {
  it("returns an empty association list when no fingerprint is configured", async () => {
    delete process.env.ASSETLINKS_SHA256;
    const res = await GET();
    expect(await res.json()).toEqual([]);
  });

  it("never serves the all-zero placeholder digest", async () => {
    process.env.ASSETLINKS_SHA256 = ALL_ZERO;
    const res = await GET();
    expect(await res.json()).toEqual([]);
  });

  it("rejects malformed fingerprints", async () => {
    process.env.ASSETLINKS_SHA256 = "not-a-fingerprint";
    const res = await GET();
    expect(await res.json()).toEqual([]);
  });

  it("serves the real fingerprint(s) with the configured package name", async () => {
    process.env.ASSETLINKS_SHA256 = `${VALID_A},${ALL_ZERO}`;
    process.env.NEXT_PUBLIC_PACKAGE_NAME = "com.example.twa";
    const res = await GET();
    const body = (await res.json()) as Array<{
      relation: string[];
      target: { namespace: string; package_name: string; sha256_cert_fingerprints: string[] };
    }>;
    expect(body).toHaveLength(1);
    expect(body[0].target.package_name).toBe("com.example.twa");
    expect(body[0].target.sha256_cert_fingerprints).toEqual([VALID_A]);
    expect(body[0].relation).toContain("delegate_permission/common.handle_all_urls");
  });

  it("defaults the package name to app.loop.twa", async () => {
    delete process.env.NEXT_PUBLIC_PACKAGE_NAME;
    process.env.ASSETLINKS_SHA256 = VALID_B;
    const res = await GET();
    const body = (await res.json()) as Array<{ target: { package_name: string } }>;
    expect(body[0].target.package_name).toBe("app.loop.twa");
  });
});
