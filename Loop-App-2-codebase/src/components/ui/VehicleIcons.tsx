import React from "react";

export interface VehicleIconProps {
  size?: number;
  className?: string;
  strokeWidth?: number;
}

/**
 * 1. Steering Wheel Icon - Driver offering indicator
 */
export const SteeringWheelIcon: React.FC<VehicleIconProps> = ({
  size = 20,
  className = "",
  strokeWidth = 2,
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <circle cx="12" cy="12" r="10" />
    <circle cx="12" cy="12" r="3" />
    <path d="M12 2v7" />
    <path d="m4.93 19.07 4.24-4.24" />
    <path d="m19.07 19.07-4.24-4.24" />
  </svg>
);

/**
 * 2. Auto-Rickshaw Icon (3-Wheeler / Tuk-Tuk)
 * Distinctive canvas canopy and compact 3-wheel profile for Indian transit
 */
export const AutoRickshawIcon: React.FC<VehicleIconProps> = ({
  size = 20,
  className = "",
  strokeWidth = 2,
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <circle cx="5" cy="18" r="2.5" />
    <circle cx="17.5" cy="18" r="2.5" />
    <path d="M7.5 18h7.5" />
    <path d="M5 15.5V13l3.5-7h8l2.5 6v3.5" />
    <path d="M10.5 13h8.5" />
    <path d="M10.5 6v7" />
    <path d="M2.5 13h2.5" />
  </svg>
);
export const AutoIcon = AutoRickshawIcon;

/**
 * 3. Scooter / Scooty Icon (Activa / EV Scooty)
 * Step-through floorboard, front apron, and sleek grab rail
 */
export const ScooterIcon: React.FC<VehicleIconProps> = ({
  size = 20,
  className = "",
  strokeWidth = 2,
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <circle cx="5" cy="18" r="2.5" />
    <circle cx="18" cy="18" r="2.5" />
    <path d="M7.5 18h8" />
    <path d="M7.5 6h3" />
    <path d="M9 6l-2 8h4.5l2.5-4h4.5v4" />
    <path d="M18.5 10h2" />
  </svg>
);

/**
 * 4. Motorcycle / Bike Icon (Pulsar / Splendor / Street Bike)
 * Angular telescopic fork, sculpted fuel tank, and stepped seat
 */
export const MotorcycleIcon: React.FC<VehicleIconProps> = ({
  size = 20,
  className = "",
  strokeWidth = 2,
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <circle cx="5" cy="18" r="2.5" />
    <circle cx="18.5" cy="18" r="2.5" />
    <path d="M8.5 7h3" />
    <path d="M10 7L5 18" />
    <path d="M10 7l3.5 3h4l2 3.5-1 4.5" />
    <path d="M7.5 18h8.5" />
    <path d="M12 10l-1.5 8" />
  </svg>
);
export const BikeIcon = MotorcycleIcon;

/**
 * 5. Car / Cab Icon (Swift / Dzire / Compact Sedan)
 * Aerodynamic profile with raked windshield, roofline, and window divider
 */
export const CarIcon: React.FC<VehicleIconProps> = ({
  size = 20,
  className = "",
  strokeWidth = 2,
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <circle cx="6.5" cy="17.5" r="2.5" />
    <circle cx="17.5" cy="17.5" r="2.5" />
    <path d="M9 17.5h6" />
    <path d="M2 16l2.5-4.5h2l3-4.5h6l3 4.5h2.5l1 4.5" />
    <path d="M9 11.5h6.5" />
    <path d="M12 7v4.5" />
  </svg>
);
export const SolidCarIcon = CarIcon;

/**
 * 6. Share Auto / 7-Seater Icon (High-Roof Group Transit)
 */
export const ShareAutoIcon: React.FC<VehicleIconProps> = ({
  size = 20,
  className = "",
  strokeWidth = 2,
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <circle cx="5" cy="18" r="2.5" />
    <circle cx="18" cy="18" r="2.5" />
    <path d="M5 15.5V12l3-6h10.5v9.5" />
    <path d="M7.5 18h8" />
    <path d="M10 12h8.5" />
    <path d="M10 6v6" />
    <path d="M14.5 6v6" />
    <path d="M2.5 12h2.5" />
  </svg>
);

/**
 * Smart Vehicle Icon Resolver
 */
export const VehicleTypeIcon: React.FC<{
  vehicleType?: string | null;
  size?: number;
  className?: string;
  strokeWidth?: number;
}> = ({ vehicleType, size = 20, className = "", strokeWidth = 2 }) => {
  switch (vehicleType) {
    case "bike":
      return <MotorcycleIcon size={size} className={className} strokeWidth={strokeWidth} />;
    case "scooter":
      return <ScooterIcon size={size} className={className} strokeWidth={strokeWidth} />;
    case "auto":
      return <AutoRickshawIcon size={size} className={className} strokeWidth={strokeWidth} />;
    case "share_auto":
      return <ShareAutoIcon size={size} className={className} strokeWidth={strokeWidth} />;
    case "car":
    default:
      return <CarIcon size={size} className={className} strokeWidth={strokeWidth} />;
  }
};
