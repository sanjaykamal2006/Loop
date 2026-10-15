"use client";

import React from "react";
import { ArrowLeft, Eye, EyeOff } from "lucide-react";

interface AuthResetPasswordViewProps {
  password: string;
  setPassword: (val: string) => void;
  showPassword: boolean;
  setShowPassword: (val: boolean) => void;
  isLoading: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onBack: () => void;
}

export function AuthResetPasswordView({
  password,
  setPassword,
  showPassword,
  setShowPassword,
  isLoading,
  onSubmit,
  onBack,
}: AuthResetPasswordViewProps) {
  return (
    <div className="flex flex-col h-[100dvh] max-w-md mx-auto relative overflow-hidden bg-black text-white font-sans no-scroll">
      <div className="dot-matrix-bg text-white" />
      <div className="flex flex-col h-full px-8 relative z-10 pt-12">
        <button
          onClick={onBack}
          aria-label="Back"
          className="w-10 h-10 flex items-center justify-center rounded-full bg-white/5 border border-white/10 mb-8 active:scale-90 transition-transform cursor-pointer"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="flex flex-col items-center justify-center flex-1 space-y-8">
          <div className="text-center space-y-3">
            <h1 className="text-4xl font-black tracking-tighter">NEW PASSWORD</h1>
            <p className="text-sm font-medium opacity-40 max-w-[240px] mx-auto">
              Set a new 8+ character password for your account
            </p>
          </div>

          <form onSubmit={onSubmit} className="space-y-6 w-full">
            <div className="space-y-2">
              <label className="text-[10px] uppercase font-black opacity-30 tracking-[0.2em] ml-4">
                New Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full h-14 bg-white/10 border border-white/20 text-white rounded-full px-7 pr-14 text-sm font-bold outline-none focus:border-[#FFC554] focus:bg-white/[0.12] transition-all placeholder:text-white/30"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-6 top-1/2 -translate-y-1/2 z-10 text-white/80 hover:text-[#FFC554] active:scale-95 transition-all cursor-pointer"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-14 bg-[#FFC554] text-black font-black rounded-full text-sm transition-all active:scale-[0.98] shadow-xl shadow-[#FFC554]/10 disabled:opacity-50 cursor-pointer"
            >
              {isLoading ? "Updating..." : "Update Password & Continue"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
