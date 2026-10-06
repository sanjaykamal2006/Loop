import { describe, it, expect } from "vitest";
import { formatLocation } from "@/lib/locationFormatter";

describe("locationFormatter", () => {
  it("should standardize VIT-AP campus variations", () => {
    expect(formatLocation("vit ap")).toBe("VIT-AP");
    expect(formatLocation("vitap")).toBe("VIT-AP");
    expect(formatLocation("vit ap campus")).toBe("VIT-AP Campus");
    expect(formatLocation("vit campus")).toBe("VIT-AP Campus");
  });

  it("should standardize Airport variations", () => {
    expect(formatLocation("airport")).toBe("Airport");
    expect(formatLocation("vga")).toBe("Airport");
    expect(formatLocation("gannavaram")).toBe("Airport");
    expect(formatLocation("vijayawada airport")).toBe("Airport");
  });

  it("should standardize Railway Station variations", () => {
    expect(formatLocation("bza")).toBe("Vijayawada Railway Station");
    expect(formatLocation("bza station")).toBe("Vijayawada Railway Station");
    expect(formatLocation("vijayawada railway station")).toBe("Vijayawada Railway Station");
    expect(formatLocation("gnt station")).toBe("Guntur Railway Station");
    expect(formatLocation("gnt railway station")).toBe("Guntur Railway Station");
  });

  it("should standardize Bus Stand variations", () => {
    expect(formatLocation("pnbs")).toBe("Vijayawada Bus Stand");
    expect(formatLocation("bus stand")).toBe("Vijayawada Bus Stand");
    expect(formatLocation("pandit nehru bus stand")).toBe("Vijayawada Bus Stand");
  });

  it("should standardize Major City Names", () => {
    expect(formatLocation("vja")).toBe("Vijayawada");
    expect(formatLocation("gnt")).toBe("Guntur");
    expect(formatLocation("mangalagiri")).toBe("Mangalagiri");
    expect(formatLocation("amaravati")).toBe("Amaravati");
    expect(formatLocation("tenali")).toBe("Tenali");
    expect(formatLocation("hyd")).toBe("Hyderabad");
  });

  it("should title-case and clean arbitrary destinations", () => {
    expect(formatLocation("kl university")).toBe("Kl University");
    expect(formatLocation("pvr riponz mall")).toBe("Pvr Riponz Mall");
    expect(formatLocation("  mg   road  ")).toBe("Mg Road");
  });

  it("should deduplicate repeated words", () => {
    expect(formatLocation("bza railway station station")).toBe("Vijayawada Railway Station");
  });

  it("should return empty string for falsy input", () => {
    expect(formatLocation("")).toBe("");
  });
});
