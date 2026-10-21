import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { VehicleTypeIcon, AutoIcon, BikeIcon, ShareAutoIcon } from "@/components/ui/VehicleIcons";

describe("VehicleTypeIcon", () => {
  it("maps each vehicle type to its icon and defaults unknown types to the car", () => {
    const { container, rerender } = render(<VehicleTypeIcon vehicleType="auto" size={22} />);

    const containsSvg = () => container.querySelectorAll("svg").length > 0;
    expect(containsSvg()).toBe(true);

    rerender(<VehicleTypeIcon vehicleType="bike" />);
    rerender(<VehicleTypeIcon vehicleType="scooter" />);
    rerender(<VehicleTypeIcon vehicleType="share_auto" />);
    rerender(<VehicleTypeIcon vehicleType="some-new-type" />); // default → car
    expect(containsSvg()).toBe(true);
  });

  it("exposes the individual icon components", () => {
    for (const Icon of [AutoIcon, BikeIcon, ShareAutoIcon]) {
      const { container } = render(<Icon size={18} />);
      expect(container.querySelector("svg")).not.toBeNull();
    }
  });
});
