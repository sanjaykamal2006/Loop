"use client";

import React from "react";
import { ArrowLeft, AlertTriangle } from "lucide-react";
import { OTPInput } from "input-otp";
import { AuthSlot } from "./AuthSlot";

interface AuthOtpViewProps {
  title: string;
  email: string;
  otp: string;
  setOtp: (val: string) => void;
  onVerify: () => void;
  onResend: () => void;
  onBack?: () => void;
  isLoading: boolean;
  countdown: number;
  verifyButtonText?: string;
  resendButtonText?: string;
  alertText?: string;
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
}

export function AuthOtpView({
  title,
  email,
  otp,
  setOtp,
  onVerify,
  onResend,
  onBack,
  isLoading,
  countdown,
  verifyButtonText = "Verify & Continue",
  resendButtonText,
  alertText,
  secondaryAction,
}: AuthOtpViewProps) {
  return (
    <div className="flex flex-col h-[100dvh] max-w-md mx-auto relative overflow-hidden bg-black text-white font-sans no-scroll">
      <div className="dot-matrix-bg text-white" />
      <div className="flex flex-col h-full px-8 relative z-10 pt-10 pb-8 justify-between">
        <div>
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              aria-label="Back"
              className="w-10 h-10 flex items-center justify-center rounded-full bg-white/5 border border-white/10 active:scale-90 transition-transform mb-6 cursor-pointer"
            >
              <ArrowLeft size={20} />
            </button>
          )}

          <div className="text-center space-y-2 mb-6">
            <h1 className="text-4xl font-black tracking-tighter">{title}</h1>
            <p className="text-sm font-medium opacity-50 max-w-[260px] mx-auto">
              Enter the 6-digit code sent to <span className="text-white font-bold opacity-100">{email}</span>
            </p>
          </div>

          {/* Spam Folder Alert */}
          <div className="w-full p-3.5 bg-[#FFC554]/10 border border-[#FFC554]/30 rounded-2xl flex items-start gap-2.5 text-left mb-6">
            <AlertTriangle size={18} className="text-[#FFC554] shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <p className="text-xs font-bold text-[#FFC554]">Check your Spam / Junk folder</p>
              <p className="text-[11px] text-white/75 leading-tight">
                {alertText ||
                  "VIT-AP Gmail often filters verification codes into Spam. If it's not in your inbox within 10 seconds, check your Spam folder!"}
              </p>
            </div>
          </div>

          <div className="space-y-6 w-full flex flex-col items-center">
            <OTPInput
              maxLength={6}
              value={otp}
              onChange={setOtp}
              onComplete={onVerify}
              containerClassName="flex gap-2"
              render={({ slots }) => (
                <div className="flex gap-2">
                  {slots.map((slot, idx) => (
                    <AuthSlot key={idx} {...slot} />
                  ))}
                </div>
              )}
            />

            <div className="w-full space-y-3">
              <button
                type="button"
                onClick={onVerify}
                disabled={isLoading || otp.length < 6}
                className="w-full h-14 bg-[#FFC554] text-black font-black rounded-full text-sm transition-all active:scale-[0.98] shadow-xl shadow-[#FFC554]/10 disabled:opacity-50 cursor-pointer"
              >
                {isLoading ? "Verifying..." : verifyButtonText}
              </button>

              <button
                type="button"
                onClick={onResend}
                disabled={isLoading || countdown > 0}
                className="w-full py-2 text-xs font-bold opacity-40 disabled:opacity-20 transition-opacity cursor-pointer"
              >
                {countdown > 0
                  ? `Resend code in ${countdown}s`
                  : (resendButtonText || "Resend verification code")}
              </button>
            </div>
          </div>
        </div>

        {secondaryAction && (
          <div className="text-center w-full pt-2">
            <button
              type="button"
              onClick={secondaryAction.onClick}
              className="w-full py-1 text-xs font-bold opacity-40 hover:opacity-80 transition-opacity cursor-pointer"
            >
              {secondaryAction.label}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
