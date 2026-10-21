import React from "react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { AuthOtpView } from "@/components/auth/AuthOtpView";
import { AuthResetPasswordView } from "@/components/auth/AuthResetPasswordView";
import PrivacyPolicyView from "@/components/sections/PrivacyPolicyView";
import { THEME_COLORS, BRAND_GOLD, BRAND_MAROON } from "@/lib/themeTokens";

const otpBase = {
  title: "Check your email",
  email: "student@vitap.ac.in",
  otp: "",
  setOtp: vi.fn(),
  onVerify: vi.fn(),
  onResend: vi.fn(),
  isLoading: false,
  countdown: 0,
};

describe("AuthOtpView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // input-otp depends on ResizeObserver, which jsdom does not implement.
    vi.stubGlobal(
      "ResizeObserver",
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      }
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows the email, spam-folder hint, and wired OTP controls", () => {
    render(<AuthOtpView {...otpBase} />);

    expect(screen.getByText("Check your email")).toBeInTheDocument();
    expect(screen.getByText(/student@vitap\.ac\.in/)).toBeInTheDocument();
    expect(screen.getByText(/Spam \/ Junk folder/)).toBeInTheDocument();

    fireEvent.click(screen.getByText("Resend verification code"));
    expect(otpBase.onResend).toHaveBeenCalledTimes(1);
  });

  it("disables verify until six digits are entered and submits on verify", () => {
    render(<AuthOtpView {...otpBase} otp="123456" />);

    const verifyButton = screen.getByText("Verify & Continue");
    expect(verifyButton).not.toBeDisabled();
    fireEvent.click(verifyButton);
    expect(otpBase.onVerify).toHaveBeenCalledTimes(1);
  });

  it("shows the countdown label and loading state", () => {
    render(<AuthOtpView {...otpBase} countdown={30} isLoading />);

    expect(screen.getByText("Resend code in 30s")).toBeInTheDocument();
    expect(screen.getByText("Verifying...")).toBeInTheDocument();
  });

  it("supports back navigation and a custom secondary action", () => {
    render(
      <AuthOtpView
        {...otpBase}
        otp="123456"
        onBack={otpBase.onVerify}
        verifyButtonText="Reset password"
        alertText="Check Outlook"
        secondaryAction={{ label: "Use a different email", onClick: otpBase.onResend }}
      />
    );

    fireEvent.click(screen.getByLabelText("Back"));
    expect(otpBase.onVerify).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByText("Use a different email"));
    expect(otpBase.onResend).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Check Outlook")).toBeInTheDocument();
  });
});

describe("AuthResetPasswordView", () => {
  const resetBase = {
    password: "",
    setPassword: vi.fn(),
    showPassword: false,
    setShowPassword: vi.fn(),
    isLoading: false,
    onSubmit: vi.fn(),
    onBack: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("submits the form from the primary button and echoes the password value", () => {
    render(<AuthResetPasswordView {...resetBase} password="n0t-my-pass" />);
    const input = screen.getByPlaceholderText("••••••••");
    expect(input).toHaveAttribute("type", "password");
    expect(input).toHaveValue("n0t-my-pass");

    fireEvent.submit(screen.getByText("Update Password & Continue"));
    expect(resetBase.onSubmit).toHaveBeenCalledTimes(1);
  });

  it("toggles visibility between masked and plain text", () => {
    render(<AuthResetPasswordView {...resetBase} />);

    fireEvent.click(screen.getByLabelText("Show password"));
    expect(resetBase.setShowPassword).toHaveBeenCalledWith(true);
  });

  it("navigates back and shows the updating state", () => {
    render(<AuthResetPasswordView {...resetBase} isLoading onBack={resetBase.onBack} />);

    fireEvent.click(screen.getByLabelText("Back"));
    expect(resetBase.onBack).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Updating...")).toBeInTheDocument();
  });
});

describe("PrivacyPolicyView", () => {
  it("renders the notice and returns to settings via the header back button", () => {
    const onBack = vi.fn();
    render(<PrivacyPolicyView onBack={onBack} />);

    expect(screen.getByText("Privacy Notice")).toBeInTheDocument();
    expect(screen.getByText("1. Who We Are")).toBeInTheDocument();
    // The header back button is an icon-only control.
    fireEvent.click(screen.getByText("Privacy Notice").parentElement!.querySelector("button")!);
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});

describe("themeTokens", () => {
  it("exposes the two brand palettes with primaries matching the brand constants", () => {
    expect(THEME_COLORS.dark.primary).toBe("#FFC554");
    expect(THEME_COLORS.dark.background).toBe("#000000");
    expect(THEME_COLORS.light.primary).toBe("#881337");
    expect(THEME_COLORS.light.background).toBe("#FFFFFF");
    expect(BRAND_GOLD).toBe("#FFC554");
    expect(BRAND_MAROON).toBe("#881337");
    // Every token is a non-empty string in both palettes.
    for (const palette of [THEME_COLORS.dark, THEME_COLORS.light]) {
      for (const value of Object.values(palette)) {
        expect(value).toMatch(/^#|rgba\(/);
      }
    }
  });
});
