"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "@/components/ui/NativeToast";
import { Eye, EyeOff, ArrowLeft, AlertTriangle, Mail, GraduationCap } from "lucide-react";
import { OTPInput, SlotProps } from "input-otp";
import PrivacyPolicyView from "./PrivacyPolicyView";
import { isAllowedStudentEmail, parseStudentEmail, validateEmailWithQuota } from "@/lib/studentParser";
import {
  isAllowedInstitutionalEmail,
  INSTITUTIONAL_ERROR_MESSAGE,
  PLUS_ADDRESSING_ERROR_MESSAGE,
  hasPlusAddressing,
} from "@/lib/authConfig";

interface AuthLoginProps {
  initialPasswordReset?: boolean;
  onStartPasswordReset?: () => void;
  onPasswordResetComplete?: () => void;
}

export default function AuthLogin({ 
  initialPasswordReset = false, 
  onStartPasswordReset,
  onPasswordResetComplete 
}: AuthLoginProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResetOtp, setIsResetOtp] = useState(false);
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

    if (hasPlusAddressing(email)) {
      toast.error(PLUS_ADDRESSING_ERROR_MESSAGE);
      return;
    }

    const passwordError = validatePassword(password);
    if (!isLogin && passwordError) {
      toast.error(passwordError);
      return;
    }

    // Pre-submit validation: Check static list first (0ms), fallback to DB dynamic table
    if (!isLogin && !isAllowedInstitutionalEmail(email)) {
      const allowedCheck = await validateEmailWithQuota(email, isLogin);
      if (!allowedCheck.allowed) {
        toast.error(allowedCheck.reason || INSTITUTIONAL_ERROR_MESSAGE);
        return;
      }
    }

    setIsLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) {
          if (error.message.includes("Email rate limit") || error.status === 429) {
            throw new Error("Rate limit exceeded. Please wait a moment before trying again.");
          }
          throw new Error("Incorrect email or password. Please try again or switch to Sign Up.");
        }
        toast.success("Welcome back!");
      } else {
        const parsed = parseStudentEmail(email);
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              display_name: parsed.displayName,
              reg_no: parsed.regNo,
              is_student_verified: parsed.isStudentDomain,
            },
          },
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

  const handleVerifyResetOtp = async () => {
    if (otp.length !== 6) {
      toast.error("Please enter the 6-digit code");
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: otp.trim(),
        type: "recovery",
      });

      if (error) {
        if (error.message.includes("expired")) {
          throw new Error("Token has expired. Please request a new code.");
        }
        throw error;
      }

      toast.success("Code verified! Set your new password.");
      if (onStartPasswordReset) onStartPasswordReset();
      setIsResetOtp(false);
      setIsResettingPassword(true);
      setPassword("");
    } catch (error: any) {
      if (process.env.NODE_ENV !== "production") {
        console.error("Recovery OTP verify error:", error);
      }
      toast.error(error.message || "Invalid or expired code");
    } finally {
      setIsLoading(false);
    }
  };

  const resendResetOtp = async () => {
    if (countdown > 0) return;
    
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: typeof window !== "undefined" ? window.location.origin : undefined,
      });
      if (error) throw error;
      setCountdown(60);
      setOtp("");
      toast.success("New reset code sent! Please check your Spam folder.");
    } catch (error: any) {
      toast.error(error.message || "Failed to resend reset code");
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
          <button 
            onClick={async () => {
              setIsResettingPassword(false);
              await supabase.auth.signOut({ scope: "global" }).catch(() => {});
              if (onPasswordResetComplete) onPasswordResetComplete();
            }}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-white/5 border border-white/10 mb-8 active:scale-90 transition-transform"
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
                    className="absolute right-6 top-1/2 -translate-y-1/2 z-10 text-white/80 hover:text-[#FFC554] active:scale-95 transition-all"
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

          <div className="flex flex-col items-center justify-center flex-1 space-y-8 sm:space-y-10">
            <div className="text-center space-y-2">
              <h1 className="text-4xl font-black tracking-tighter">VERIFY</h1>
              <p className="text-sm font-medium opacity-40 max-w-[200px] mx-auto">
                Enter the code sent to <span className="text-white opacity-100">{email}</span>
              </p>
            </div>

            <div className="space-y-6 w-full flex flex-col items-center">
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

              {/* Informative Spam / Junk note */}
              <div className="space-y-1 text-center px-2">
                <p className="text-xs text-white/60 font-medium flex items-center justify-center gap-1.5">
                  <Mail size={13} className="text-[#FFC554]/80 shrink-0" />
                  <span>Can&apos;t find the OTP? Check your <strong className="text-white font-semibold">Spam or Junk</strong> folder.</span>
                </p>
                <p className="text-[10px] text-white/35">
                  Still haven&apos;t received it? Wait a moment and try Resend OTP.
                </p>
              </div>

              <div className="w-full space-y-3">
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

  if (isResetOtp) {
    return (
      <div className="flex flex-col h-[100dvh] max-w-md mx-auto relative overflow-hidden bg-black text-white font-sans no-scroll">
        <div className="dot-matrix-bg text-white" />
        <div className="flex flex-col h-full px-8 relative z-10 pt-10 pb-8 justify-between">
          <div>
            <button 
              onClick={() => {
                setIsResetOtp(false);
                setOtp("");
              }}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-white/5 border border-white/10 active:scale-90 transition-transform mb-6"
            >
              <ArrowLeft size={20} />
            </button>

            <div className="text-center space-y-2 mb-6">
              <h1 className="text-4xl font-black tracking-tighter">RESET CODE</h1>
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
                  Verification emails often land in Spam. If you don't see the code in your inbox, please check your Spam folder.
                </p>
              </div>
            </div>

            <div className="space-y-6 w-full flex flex-col items-center">
              <OTPInput
                maxLength={6}
                value={otp}
                onChange={setOtp}
                onComplete={handleVerifyResetOtp}
                containerClassName="flex gap-2"
                render={({ slots }) => (
                  <div className="flex gap-2">
                    {slots.map((slot, idx) => (
                      <Slot key={idx} {...slot} />
                    ))}
                  </div>
                )}
              />

              <button
                onClick={handleVerifyResetOtp}
                disabled={isLoading || otp.length < 6}
                className="w-full h-14 bg-[#FFC554] text-black font-black rounded-full text-sm transition-all active:scale-[0.98] shadow-xl shadow-[#FFC554]/10 disabled:opacity-40"
              >
                {isLoading ? "Verifying..." : "Verify Code & Set Password"}
              </button>
            </div>
          </div>

          <div className="space-y-2 text-center w-full">
            <button 
              onClick={resendResetOtp}
              disabled={isLoading || countdown > 0}
              className="w-full py-2 text-xs font-bold text-[#FFC554] opacity-90 disabled:opacity-30 transition-opacity"
            >
              {countdown > 0 ? `Resend code in ${countdown}s` : "Resend reset code"}
            </button>
            <button
              onClick={() => {
                setIsResetOtp(false);
                setOtp("");
              }}
              className="w-full py-1 text-xs font-bold opacity-40 hover:opacity-80 transition-opacity"
            >
              Back to Login
            </button>
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
            <p className="text-base font-semibold text-white/70">Rides go better in Loop.</p>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-2.5">
              <label className="text-[11px] uppercase font-extrabold text-white tracking-[0.18em] ml-4 block">
                {isLogin ? "VIT-AP Institutional or Registered Email" : "VIT-AP Institutional Email"}
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name.rollno@vitapstudent.ac.in"
                className="w-full h-14 bg-white/10 border border-white/20 text-white rounded-full px-7 text-base font-bold outline-none focus:border-[#FFC554] focus:bg-white/[0.12] transition-all placeholder:text-white/30"
              />
              {!isLogin && (
                <p className="text-[10px] font-bold text-[#FFC554] ml-4 flex items-center gap-1.5 opacity-90">
                  <GraduationCap size={14} className="text-[#FFC554] shrink-0" strokeWidth={2.2} />
                  <span>Students: @vitapstudent.ac.in | Faculty: @vitap.ac.in</span>
                </p>
              )}
            </div>

            <div className="space-y-2.5">
              <label className="text-[11px] uppercase font-extrabold text-white tracking-[0.18em] ml-4 block">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full h-14 bg-white/10 border border-white/20 text-white rounded-full px-7 pr-14 text-base font-bold outline-none focus:border-[#FFC554] focus:bg-white/[0.12] transition-all placeholder:text-white/30"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-6 top-1/2 -translate-y-1/2 z-10 text-white/80 hover:text-[#FFC554] active:scale-95 transition-all"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {isLogin && (
                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={async () => {
                      if (!email?.trim()) {
                        toast.error("Please enter your email first");
                        return;
                      }
                      const allowedCheck = await validateEmailWithQuota(email, true);
                      if (!allowedCheck.allowed) {
                        toast.error(allowedCheck.reason || "Please enter your registered email address.");
                        return;
                      }
                      setIsLoading(true);
                      try {
                        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { 
                          redirectTo: typeof window !== "undefined" ? window.location.origin : undefined 
                        });
                        if (error) throw error;
                        setOtp("");
                        setCountdown(60);
                        setIsResetOtp(true);
                        toast.success("Reset code sent! Please check your Inbox and Spam folder.");
                      } catch (err: any) {
                        if (process.env.NODE_ENV !== "production") {
                          console.error("Password reset request failed:", err);
                        }
                        const msg = typeof err?.message === "string" && err.message.trim() ? err.message : "Failed to send reset code. Please check your email or try again.";
                        toast.error(msg);
                      } finally {
                        setIsLoading(false);
                      }
                    }}
                    className="text-xs font-extrabold text-[#FFC554] hover:underline tracking-wider transition-colors inline-block"
                  >
                    Forgot Password?
                  </button>
                </div>
              )}
            </div>

            <div className="pt-2 space-y-4">
              {!isLogin && (
                <div className="flex items-center gap-2 ml-4">
                  <input 
                    type="checkbox" 
                    id="privacy-consent"
                    checked={agreedToPrivacy}
                    onChange={(e) => setAgreedToPrivacy(e.target.checked)}
                    className="accent-[#FFC554]"
                  />
                  <label htmlFor="privacy-consent" className="text-xs text-white/80 font-medium">
                    I have read and agree to LOOP's{" "}
                    <button 
                      type="button"
                      onClick={() => setShowPrivacy(true)}
                      className="text-[#FFC554] hover:underline font-bold"
                    >
                      Privacy Notice
                    </button>
                  </label>
                </div>
              )}
              <button
                type="submit"
                disabled={isLoading || (!isLogin && !agreedToPrivacy)}
                className="w-full h-14 bg-[#FFC554] text-black font-black rounded-full text-base tracking-wide transition-all active:scale-[0.98] shadow-xl shadow-[#FFC554]/10 disabled:opacity-50"
              >
                {isLoading ? "Please wait..." : isLogin ? "Login" : "Create Account"}
              </button>

              <div className="text-center pt-1">
                <button 
                  type="button"
                  className="text-xs font-extrabold text-white/80 hover:text-white transition-colors tracking-wide"
                  onClick={() => {
                    setIsLogin(!isLogin);
                    setShowPassword(false);
                  }}
                >
                  {isLogin ? "New to Loop? Sign Up" : "Have an account? Login"}
                </button>
              </div>
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
