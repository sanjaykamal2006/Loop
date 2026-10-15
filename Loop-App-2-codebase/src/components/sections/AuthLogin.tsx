"use client";

import React, { useState, useEffect } from "react";
import { logger } from "@/lib/logger";
import { supabase } from "@/lib/supabase";
import { toast } from "@/components/ui/NativeToast";
import { Eye, EyeOff, GraduationCap } from "lucide-react";
import PrivacyPolicyView from "./PrivacyPolicyView";
import { parseStudentEmail, validateEmailWithQuota } from "@/lib/studentParser";
import {
  isAllowedInstitutionalEmail,
  INSTITUTIONAL_ERROR_MESSAGE,
  PLUS_ADDRESSING_ERROR_MESSAGE,
  hasPlusAddressing,
} from "@/lib/authConfig";
import { AuthOtpView } from "@/components/auth/AuthOtpView";
import { AuthResetPasswordView } from "@/components/auth/AuthResetPasswordView";

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
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "An error occurred";
      toast.error(message);
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
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to update password";
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
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Invalid or expired code";
      toast.error(message);
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
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to resend code";
      toast.error(message);
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
      const { error } = await supabase.auth.verifyOtp({
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
    } catch (error: unknown) {
      logger.error("Recovery OTP verify error:", error);
      const message = error instanceof Error ? error.message : "Invalid or expired code";
      toast.error(message);
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
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to resend reset code";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  if (showPrivacy) {
    return <PrivacyPolicyView onBack={() => setShowPrivacy(false)} />;
  }

  if (isResettingPassword) {
    return (
      <AuthResetPasswordView
        password={password}
        setPassword={setPassword}
        showPassword={showPassword}
        setShowPassword={setShowPassword}
        isLoading={isLoading}
        onSubmit={handleSetNewPassword}
        onBack={async () => {
          setIsResettingPassword(false);
          await supabase.auth.signOut({ scope: "global" }).catch(() => {});
          if (onPasswordResetComplete) onPasswordResetComplete();
        }}
      />
    );
  }

  if (isVerifying) {
    return (
      <AuthOtpView
        title="VERIFY"
        email={email}
        otp={otp}
        setOtp={setOtp}
        onVerify={handleVerifyOtp}
        onResend={resendOtp}
        onBack={() => setIsVerifying(false)}
        isLoading={isLoading}
        countdown={countdown}
        verifyButtonText="Verify & Continue"
        resendButtonText="Resend verification code"
      />
    );
  }

  if (isResetOtp) {
    return (
      <AuthOtpView
        title="RESET CODE"
        email={email}
        otp={otp}
        setOtp={setOtp}
        onVerify={handleVerifyResetOtp}
        onResend={resendResetOtp}
        onBack={() => {
          setIsResetOtp(false);
          setOtp("");
        }}
        isLoading={isLoading}
        countdown={countdown}
        verifyButtonText="Verify Code & Set Password"
        resendButtonText="Resend reset code"
        alertText="Verification emails often land in Spam. If you don't see the code in your inbox, please check your Spam folder."
        secondaryAction={{
          label: "Back to Login",
          onClick: () => {
            setIsResetOtp(false);
            setOtp("");
          },
        }}
      />
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
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-6 top-1/2 -translate-y-1/2 z-10 text-white/80 hover:text-[#FFC554] active:scale-95 transition-all cursor-pointer"
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
                      } catch (err: unknown) {
                        logger.error("Password reset request failed:", err);
                        const msg = err instanceof Error && err.message.trim() ? err.message : "Failed to send reset code. Please check your email or try again.";
                        toast.error(msg);
                      } finally {
                        setIsLoading(false);
                      }
                    }}
                    className="text-xs font-extrabold text-[#FFC554] hover:underline tracking-wider transition-colors inline-block cursor-pointer"
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
                    I have read and agree to LOOP&apos;s{" "}
                    <button 
                      type="button"
                      onClick={() => setShowPrivacy(true)}
                      className="text-[#FFC554] hover:underline font-bold cursor-pointer"
                    >
                      Privacy Notice
                    </button>
                  </label>
                </div>
              )}
              <button
                type="submit"
                disabled={isLoading || (!isLogin && !agreedToPrivacy)}
                className="w-full h-14 bg-[#FFC554] text-black font-black rounded-full text-base tracking-wide transition-all active:scale-[0.98] shadow-xl shadow-[#FFC554]/10 disabled:opacity-50 cursor-pointer"
              >
                {isLoading ? "Please wait..." : isLogin ? "Login" : "Create Account"}
              </button>

              <div className="text-center pt-1">
                <button 
                  type="button"
                  className="text-xs font-extrabold text-white/80 hover:text-white transition-colors tracking-wide cursor-pointer"
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
