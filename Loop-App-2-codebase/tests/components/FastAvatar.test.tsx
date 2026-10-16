import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import FastAvatar from "@/components/ui/FastAvatar";
import { avatarLoadedCache } from "@/lib/imageOptimization";

describe("FastAvatar Component", () => {
  beforeEach(() => {
    avatarLoadedCache.clear();
  });

  it("renders monogram initials when src is not provided", () => {
    render(<FastAvatar name="Rahul Sharma" />);
    expect(screen.getByText("RA")).toBeInTheDocument();
  });

  it("renders custom initialsText when explicitly supplied", () => {
    render(<FastAvatar name="Rahul Sharma" initialsText="RS" />);
    expect(screen.getByText("RS")).toBeInTheDocument();
  });

  it("renders image layer when valid clean src is provided", () => {
    render(<FastAvatar src="https://example.com/avatar.jpg" name="Priya" priority />);
    const img = screen.getByRole("img");
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute("src", "https://example.com/avatar.jpg");
    expect(img).toHaveAttribute("alt", "Priya");
    expect(img).toHaveAttribute("loading", "eager");
  });

  it("adds cleanSrc to avatarLoadedCache on load", () => {
    render(<FastAvatar src="https://example.com/cached.jpg" name="Alex" />);
    const img = screen.getByRole("img");
    fireEvent.load(img);
    expect(avatarLoadedCache.has("https://example.com/cached.jpg")).toBe(true);
  });

  it("handles image load errors by setting error state and falling back to initials", () => {
    render(<FastAvatar src="https://example.com/broken.jpg" name="Divya" />);
    const img = screen.getByRole("img");
    fireEvent.error(img);
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(screen.getByText("DI")).toBeInTheDocument();
  });
});
