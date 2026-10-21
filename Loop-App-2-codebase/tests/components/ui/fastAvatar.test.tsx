import React from "react";
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import FastAvatar from "@/components/ui/FastAvatar";
import { avatarLoadedCache } from "@/lib/imageOptimization";

describe("FastAvatar", () => {
  beforeEach(() => {
    avatarLoadedCache.clear();
  });

  it("shows the two-character monogram and never renders an img without a source", () => {
    const { container } = render(<FastAvatar name="Sanjay Kamal" />);

    expect(screen.getByText("SA")).toBeInTheDocument();
    expect(container.querySelector("img")).toBeNull();
  });

  it("renders the monogram when the source is whitespace-only", () => {
    const { container } = render(<FastAvatar src="   " name="Rider Raj" />);

    expect(screen.getByText("RI")).toBeInTheDocument();
    expect(container.querySelector("img")).toBeNull();
  });

  it("paints a cached URL instantly (opacity-100 from the first render)", () => {
    avatarLoadedCache.add("https://supabase.co/avatar.jpg");
    const { container } = render(<FastAvatar src="https://supabase.co/avatar.jpg" name="Lo" />);

    const img = container.querySelector("img");
    expect(img).not.toBeNull();
    expect(img?.className).toContain("opacity-100");
  });

  it("starts hidden for uncached URLs and paints after the browser load event", async () => {
    const { container } = render(<FastAvatar src="https://fresh.example/a.jpg" name="Q" />);

    const img = container.querySelector("img");
    expect(img).not.toBeNull();
    expect(img?.className).toContain("opacity-0"); // hidden until decoded

    fireEvent.load(img as HTMLElement);
    await waitFor(() => {
      expect((container.querySelector("img") as HTMLImageElement).className).toContain("opacity-100");
    });
    // The load is remembered in the session cache for the next mount.
    expect(avatarLoadedCache.has("https://fresh.example/a.jpg")).toBe(true);
  });

  it("drops the image layer for the initials fallback when it errors", async () => {
    const { container } = render(<FastAvatar src="https://broken.example/a.jpg" name="PZ" />);

    expect(container.querySelector("img")).not.toBeNull();
    fireEvent.error(container.querySelector("img") as HTMLElement);
    await waitFor(() => expect(container.querySelector("img")).toBeNull());
    expect(screen.getByText("PZ")).toBeInTheDocument();
  });

  it("honours custom initials overrides", () => {
    render(<FastAvatar src="" initialsText="GG" name="Anyone" />);
    expect(screen.getByText("GG")).toBeInTheDocument();
  });
});
