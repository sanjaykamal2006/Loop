import { describe, it, expect } from "vitest";
import { formatLocation, getEstimatedTravelTime } from "@/lib/locationFormatter";

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

  describe("getEstimatedTravelTime", () => {
    it("should return ~1h 15m for airport routes", () => {
      expect(getEstimatedTravelTime("Airport")).toBe("~1h 15m");
      expect(getEstimatedTravelTime("Gannavaram")).toBe("~1h 15m");
    });

    it("should return ~45 min for Vijayawada railway station", () => {
      expect(getEstimatedTravelTime("Vijayawada Railway Station")).toBe("~45 min");
    });

    it("should return ~40 min for Guntur railway station", () => {
      expect(getEstimatedTravelTime("Guntur Railway Station")).toBe("~40 min");
    });

    it("should return ~50 min for bus stand", () => {
      expect(getEstimatedTravelTime("Vijayawada Bus Stand")).toBe("~50 min");
    });

    it("should return null for unknown routes", () => {
      expect(getEstimatedTravelTime("Secret Location")).toBeNull();
      expect(getEstimatedTravelTime("")).toBeNull();
      expect(getEstimatedTravelTime(null)).toBeNull();
    });
  });
});
