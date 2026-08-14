"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Eye, EyeOff, ArrowLeft } from "lucide-react";
import { OTPInput, SlotProps } from "input-otp";
import PrivacyPolicyView from "./PrivacyPolicyView";

interface AuthLoginProps {
  initialPasswordReset?: boolean;
  onPasswordResetComplete?: () => void;
}

export default function AuthLogin({ initialPasswordReset = false, onPasswordResetComplete }: AuthLoginProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(initialPasswordReset);
  const [otp, setOtp] = useState("");
  const [countdown, setCountdown] = useState(0);
  const [agreedToPrivacy, setAgreedToPrivacy] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);

  useEffect(() => {
    setIsResettingPassword(initialPasswordReset);
  }, [initialPasswordReset]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  const validatePassword = (pass: string) => {
    if (pass.length < 8) {
      return "Password must be at least 8 characters long";
    }
    return null;
  };

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

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
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
          email,
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
    } catch (error: any) {
      toast.error(error.message || "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const passErr = validatePassword(password);
    if (passErr) {
      toast.error(passErr);
      return;
    }
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("Password updated successfully!");
      if (onPasswordResetComplete) {
        onPasswordResetComplete();
      } else {
        setIsResettingPassword(false);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to update password");
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
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email,
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
    } catch (error: any) {
      toast.error(error.message || "Invalid or expired code");
    } finally {
      setIsLoading(false);
    }
  };

  const resendOtp = async () => {
    if (countdown > 0) return;
    
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: email,
      });
      if (error) throw error;
      setCountdown(60);
      setOtp("");
      toast.success("New code sent!");
    } catch (error: any) {
      toast.error(error.message || "Failed to resend code");
    } finally {
      setIsLoading(false);
    }
  };

  if (showPrivacy) {
    return <PrivacyPolicyView onBack={() => setShowPrivacy(false)} />;
  }

  if (isResettingPassword) {
    return (
      <div className="flex flex-col h-[100dvh] max-w-md mx-auto relative overflow-hidden bg-black text-white font-sans no-scroll">
        <div className="dot-matrix-bg text-white" />
        <div className="flex flex-col h-full px-8 relative z-10 pt-12">
          <div className="flex flex-col items-center justify-center flex-1 space-y-8">
            <div className="text-center space-y-3">
              <h1 className="text-4xl font-black tracking-tighter">NEW PASSWORD</h1>
              <p className="text-sm font-medium opacity-40 max-w-[240px] mx-auto">
                Set a new 8+ character password for your account
              </p>
            </div>

            <form onSubmit={handleSetNewPassword} className="space-y-6 w-full">
              <div className="space-y-2">
                <label className="text-[10px] uppercase font-black opacity-30 tracking-[0.2em] ml-4">New Password</label>
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

              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-14 bg-[#FFC554] text-black font-black rounded-full text-sm transition-all active:scale-[0.98] shadow-xl shadow-[#FFC554]/10 disabled:opacity-50"
              >
                {isLoading ? "Updating..." : "Update Password & Continue"}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  if (isVerifying) {
    return (
      <div className="flex flex-col h-[100dvh] max-w-md mx-auto relative overflow-hidden bg-black text-white font-sans no-scroll">
        <div className="dot-matrix-bg text-white" />
        <div className="flex flex-col h-full px-8 relative z-10 pt-12">
          <button 
            onClick={() => setIsVerifying(false)}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-white/5 border border-white/10 mb-8 active:scale-90 transition-transform"
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
              {isLogin && (
                <button
                  type="button"
                  onClick={async () => {
                    if (!email) {
                      toast.error("Please enter your email first");
                      return;
                    }
                    try {
                      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin });
                      if (error) throw error;
                      toast.success("Password reset link sent to your email!");
                    } catch (err: any) {
                      toast.error(err.message || "Failed to send reset link");
                    }
                  }}
                  className="text-xs font-bold text-[#FFC554]/60 hover:text-[#FFC554] transition-colors ml-4 mt-1"
                >
                  Forgot Password?
                </button>
              )}
            </div>

            <div className="pt-4 space-y-4">
              {!isLogin && (
                <div className="flex items-center gap-2 ml-4">
                  <input 
                    type="checkbox" 
                    id="privacy-consent"
                    checked={agreedToPrivacy}
                    onChange={(e) => setAgreedToPrivacy(e.target.checked)}
                    className="accent-[#FFC554]"
                  />
                  <label htmlFor="privacy-consent" className="text-xs text-white/60">
                    I have read and agree to LOOP's{" "}
                    <button 
                      type="button"
                      onClick={() => setShowPrivacy(true)}
                      className="text-[#FFC554] hover:underline"
                    >
                      Privacy Notice
                    </button>
                  </label>
                </div>
              )}
              <button
                type="submit"
                disabled={isLoading || (!isLogin && !agreedToPrivacy)}
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
            </div>
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
