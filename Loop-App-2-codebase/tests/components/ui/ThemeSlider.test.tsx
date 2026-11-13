import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import ThemeSlider from "@/components/ui/ThemeSlider";

describe("ThemeSlider Component", () => {
  it("renders all three themes side-by-side (Dark, Light, Paper)", () => {
    const handleSelect = vi.fn();
    render(
      <ThemeSlider
        currentTheme="dark"
        onSelectTheme={handleSelect}
        isDark={true}
      />
    );

    expect(screen.getByRole("radio", { name: /dark theme/i })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /light theme/i })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /paper theme/i })).toBeInTheDocument();
  });

  it("calls onSelectTheme with 'paper' when Paper is clicked", () => {
    const handleSelect = vi.fn();
    render(
      <ThemeSlider
        currentTheme="dark"
        onSelectTheme={handleSelect}
        isDark={true}
      />
    );

    const paperBtn = screen.getByRole("radio", { name: /paper theme/i });
    fireEvent.click(paperBtn);

    expect(handleSelect).toHaveBeenCalledWith("paper");
  });

  it("calls onSelectTheme with 'light' when Light is clicked", () => {
    const handleSelect = vi.fn();
    render(
      <ThemeSlider
        currentTheme="dark"
        onSelectTheme={handleSelect}
        isDark={true}
      />
    );

    const lightBtn = screen.getByRole("radio", { name: /light theme/i });
    fireEvent.click(lightBtn);

    expect(handleSelect).toHaveBeenCalledWith("light");
  });

  it("supports keyboard navigation (ArrowRight / ArrowLeft)", () => {
    const handleSelect = vi.fn();
    render(
      <ThemeSlider
        currentTheme="dark"
        onSelectTheme={handleSelect}
        isDark={true}
      />
    );

    const radiogroup = screen.getByRole("radiogroup");
    fireEvent.keyDown(radiogroup, { key: "ArrowRight" });

    expect(handleSelect).toHaveBeenCalledWith("light");
  });
});
