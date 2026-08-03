"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Eye, EyeOff, ArrowLeft } from "lucide-react";
import { OTPInput, SlotProps } from "input-otp";

export default function AuthLogin() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [otp, setOtp] = useState("");
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  const validatePassword = (pass: string) => {
    if (pass.length < 6) {
      return "Password must be at least 6 characters long";
    }
    return null;
  };

  const sanitizeEmail = (raw: string) => raw.trim().toLowerCase();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isVerifying) {
      handleVerifyOtp();
      return;
    }

    const passwordError = validatePassword(password);
    if (!isLogin && passwordError) {
      toast.error(passwordError);
      return;
    }

    setIsLoading(true);
    const cleanEmail = sanitizeEmail(email);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });
        if (error) {
          if (error.message.includes("Email rate limit") || error.status === 429) {
            throw new Error("Rate limit exceeded. Please wait a moment before trying again.");
          }
          throw error;
        }
        toast.success("Welcome back!");
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
        });
        if (error) {
          if (error.message.includes("Email rate limit") || error.status === 429) {
            throw new Error("Rate limit exceeded. Please wait a moment before trying again.");
          }
          throw error;
        }

        if (data.session) {
          toast.success("Welcome to Loop!");
        } else {
          setIsVerifying(true);
          setCountdown(60);
        }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "An error occurred";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.length !== 6) {
      toast.error("Please enter the 6-digit code");
      return;
    }

    setIsLoading(true);
    const cleanEmail = sanitizeEmail(email);

    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email: cleanEmail,
        token: otp,
        type: "email",
      });

      if (error) {
        if (error.message.includes("expired")) {
          throw new Error("Token has expired. Please request a new code.");
        }
        throw error;
      }

      if (data.session) {
        toast.success("Account activated! Welcome to Loop.");
      } else {
        toast.success("Email verified! You can now login.");
        setIsLogin(true);
        setIsVerifying(false);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Invalid or expired code";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const resendOtp = async () => {
    if (countdown > 0) return;

    setIsLoading(true);
    const cleanEmail = sanitizeEmail(email);

    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: cleanEmail,
      });
      if (error) throw error;
      setCountdown(60);
      setOtp("");
      toast.success("New code sent!");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to resend code";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/`,
        }
      });
      if (error) throw error;
    } catch (err: any) {
      toast.error(err.message || "Failed to sign in with Google");
      setIsLoading(false);
    }
  };

  if (isVerifying) {
    return (
      <div className="flex flex-col h-[100dvh] max-w-md mx-auto relative overflow-hidden bg-black text-white font-sans no-scroll">
        <div className="dot-matrix-bg text-white" />
        <div className="flex flex-col h-full px-8 relative z-10 pt-12">
          <button
            onClick={() => setIsVerifying(false)}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-white/5 border border-white/10 mb-8 active:scale-90 "
          >
            <ArrowLeft size={20} />
          </button>

          <div className="flex flex-col items-center justify-center flex-1 space-y-12">
            <div className="text-center space-y-3">
              <h1 className="text-4xl font-black tracking-tighter">VERIFY</h1>
              <p className="text-sm font-medium opacity-40 max-w-[200px] mx-auto">
                Enter the code sent to <span className="text-white opacity-100">{email}</span>
              </p>
            </div>

            <div className="space-y-8 w-full flex flex-col items-center">
              <OTPInput
                maxLength={6}
                value={otp}
                onChange={setOtp}
                onComplete={handleVerifyOtp}
                containerClassName="flex gap-2"
                render={({ slots }) => (
                  <div className="flex gap-2">
                    {slots.map((slot, idx) => (
                      <Slot key={idx} {...slot} />
                    ))}
                  </div>
                )}
              />

              <div className="w-full space-y-4">
                <button
                  onClick={handleVerifyOtp}
                  disabled={isLoading || otp.length < 6}
                  className="w-full h-14 bg-[#FFC554] text-black font-black rounded-full text-sm transition-all active:scale-[0.98] shadow-xl shadow-[#FFC554]/10 disabled:opacity-50"
                >
                  {isLoading ? "Verifying..." : "Verify & Continue"}
                </button>

                <button
                  onClick={resendOtp}
                  disabled={isLoading || countdown > 0}
                  className="w-full py-2 text-xs font-bold opacity-40 disabled:opacity-20 transition-opacity"
                >
                  {countdown > 0 ? `Resend code in ${countdown}s` : "Resend verification code"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[100dvh] max-w-md mx-auto relative overflow-hidden bg-black text-white font-sans no-scroll">
      <div className="dot-matrix-bg text-white" />

      <div className="flex flex-col items-center justify-center h-full px-8 relative z-10">
        <div className="w-full space-y-12">
          <div className="text-center space-y-2">
            <h1 className="text-6xl font-black tracking-tighter">LOOP</h1>
            <p className="text-sm font-medium opacity-40">Rides go better in Loop.</p>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label className="text-[10px] uppercase font-black opacity-30 tracking-[0.2em] ml-4">Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@email.com"
                className="w-full h-14 bg-white/10 border border-white/20 text-white rounded-full px-7 text-sm font-bold outline-none focus:border-[#FFC554] focus:bg-white/[0.12] transition-all placeholder:text-white/30"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] uppercase font-black opacity-30 tracking-[0.2em] ml-4">Password</label>
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
                  className="absolute right-6 top-1/2 -translate-y-1/2 opacity-60 active:opacity-100 transition-opacity"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="pt-4 space-y-4">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-14 bg-[#FFC554] text-black font-black rounded-full text-sm transition-all active:scale-[0.98] shadow-xl shadow-[#FFC554]/10 disabled:opacity-50"
              >
                {isLoading ? "Please wait..." : isLogin ? "Login" : "Create Account"}
              </button>

              <button
                type="button"
                className="w-full py-2 text-sm font-bold opacity-40 hover:opacity-100 transition-opacity"
                onClick={() => {
                  setIsLogin(!isLogin);
                  setShowPassword(false);
                }}
              >
                {isLogin ? "New to Loop? Sign Up" : "Have an account? Login"}
              </button>

              <div className="relative py-4 flex items-center justify-center">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-white/10"></div>
                </div>
                <div className="relative bg-black px-4 text-xs font-bold uppercase tracking-widest opacity-40">
                  Or
                </div>
              </div>

              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={isLoading}
                className="w-full h-14 bg-white text-black font-black rounded-full text-sm transition-all active:scale-[0.98] shadow-xl disabled:opacity-50 flex items-center justify-center gap-3"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                  <path d="M1 1h22v22H1z" fill="none" />
                </svg>
                Continue with Google
              </button>
            </div>
            <p className="text-[10px] text-center opacity-40 mt-4">By continuing, you agree to LOOP's Terms & Privacy Policy.</p>
          </form>
        </div>
      </div>
    </div>
  );
}

function Slot(props: SlotProps) {
  return (
    <div
      className={`
        relative w-11 h-12 text-2xl font-black flex items-center justify-center
        transition-all duration-300 border-b-2
        ${props.isActive ? "border-[#FFC554] text-[#FFC554]" : "border-white/10 text-white/40"}
      `}
    >
      {props.char !== null && <div>{props.char}</div>}
      {props.hasFakeCaret && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-px h-6 bg-[#FFC554] animate-caret-blink" />
        </div>
      )}
    </div>
  );
}
