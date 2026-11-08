import { describe, it, expect } from "vitest";
import {
  getActiveCampus,
  getCampusByEmail,
  CAMPUS_REGISTRY,
} from "@/lib/campusConfig";

describe("campusConfig", () => {
  it("defaults active campus to vit-ap", () => {
    const campus = getActiveCampus();
    expect(campus.id).toBe("vit-ap");
    expect(campus.shortName).toBe("VIT-AP");
    expect(campus.defaultStartPoint).toBe("VIT-AP Campus");
    expect(campus.domains).toContain("vitapstudent.ac.in");
    expect(campus.transitHubs.length).toBeGreaterThanOrEqual(3);
  });

  it("identifies campus by email address", () => {
    const vitStudent = getCampusByEmail("sanjay.kamal@vitapstudent.ac.in");
    expect(vitStudent?.id).toBe("vit-ap");

    const vitFaculty = getCampusByEmail("faculty@vitap.ac.in");
    expect(vitFaculty?.id).toBe("vit-ap");

    const srmStudent = getCampusByEmail("student@srmap.edu.in");
    expect(srmStudent?.id).toBe("srm-ap");

    const invalid = getCampusByEmail("user@gmail.com");
    expect(invalid).toBeNull();
  });

  it("provides valid transit hubs for all registered campuses", () => {
    for (const campus of Object.values(CAMPUS_REGISTRY)) {
      expect(campus.transitHubs.length).toBeGreaterThan(0);
      for (const hub of campus.transitHubs) {
        expect(hub.id).toBeTruthy();
        expect(hub.name).toBeTruthy();
        expect(hub.destination).toBeTruthy();
        expect(hub.estTime).toBeTruthy();
      }
    }
  });
});
