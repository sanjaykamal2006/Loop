/**
 * Campus Tenant Configuration System
 * Provides multi-campus support and tenant customization for university ride coordination.
 */

export interface CampusTransitHub {
  id: string;
  name: string;
  destination: string;
  subtitle: string;
  estTime: string;
}

export interface CampusConfig {
  id: string;
  name: string;
  shortName: string;
  code: string;
  domains: readonly string[];
  defaultStartPoint: string;
  locationRegex: RegExp;
  transitHubs: readonly CampusTransitHub[];
}

export const CAMPUS_REGISTRY: Record<string, CampusConfig> = {
  "vit-ap": {
    id: "vit-ap",
    name: "VIT-AP University",
    shortName: "VIT-AP",
    code: "VITAP",
    domains: ["vitapstudent.ac.in", "vitap.ac.in"],
    defaultStartPoint: "VIT-AP Campus",
    locationRegex: /^vit[\s\-_.]*ap([\s\-_.]*campus)?$/i,
    transitHubs: [
      {
        id: "bza-station",
        name: "Vijayawada Railway Station",
        destination: "Vijayawada Railway Station",
        subtitle: "Peak train arrivals & departures",
        estTime: "~45 min",
      },
      {
        id: "airport",
        name: "Vijayawada Airport",
        destination: "Airport",
        subtitle: "Gannavaram flight sync & express autos",
        estTime: "~1h 15m",
      },
      {
        id: "bus-stand",
        name: "Vijayawada Bus Stand",
        destination: "Vijayawada Bus Stand",
        subtitle: "PNBS RTC & inter-city coaches",
        estTime: "~50 min",
      },
    ],
  },
  "srm-ap": {
    id: "srm-ap",
    name: "SRM University AP",
    shortName: "SRM-AP",
    code: "SRMAP",
    domains: ["srmap.edu.in"],
    defaultStartPoint: "SRM-AP Campus",
    locationRegex: /^srm[\s\-_.]*ap([\s\-_.]*campus)?$/i,
    transitHubs: [
      {
        id: "bza-station",
        name: "Vijayawada Railway Station",
        destination: "Vijayawada Railway Station",
        subtitle: "Peak train arrivals & departures",
        estTime: "~45 min",
      },
      {
        id: "airport",
        name: "Vijayawada Airport",
        destination: "Airport",
        subtitle: "Gannavaram flight sync & express autos",
        estTime: "~1h 15m",
      },
      {
        id: "bus-stand",
        name: "Vijayawada Bus Stand",
        destination: "Vijayawada Bus Stand",
        subtitle: "PNBS RTC & inter-city coaches",
        estTime: "~50 min",
      },
    ],
  },
};

/**
 * Returns active campus tenant configuration.
 * Default campus is "vit-ap" (overridable via NEXT_PUBLIC_CAMPUS_ID env).
 */
export function getActiveCampus(): CampusConfig {
  const campusId = (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_CAMPUS_ID) || "vit-ap";
  return CAMPUS_REGISTRY[campusId] || CAMPUS_REGISTRY["vit-ap"];
}

/**
 * Resolves which campus an email belongs to based on registered institutional domains.
 */
export function getCampusByEmail(email: string): CampusConfig | null {
  if (!email || !email.includes("@")) return null;
  const domain = email.split("@")[1]?.toLowerCase().trim();
  if (!domain) return null;

  for (const campus of Object.values(CAMPUS_REGISTRY)) {
    if ((campus.domains as readonly string[]).includes(domain)) {
      return campus;
    }
  }
  return null;
}
