"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import AuthLogin from "../components/sections/AuthLogin";
import MainApp from "../components/sections/MainApp";
import ErrorBoundary from "@/components/ErrorBoundary";
import { Session } from "@supabase/supabase-js";

export default function Home() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPasswordReset, setIsPasswordReset] = useState(false);

  useEffect(() => {
    // Detect password recovery token in URL hash or search params
    if (typeof window !== "undefined" && (window.location.hash.includes("type=recovery") || window.location.search.includes("type=recovery"))) {
      setIsPasswordReset(true);
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        setIsPasswordReset(true);
      }
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-black relative overflow-hidden">
        <div className="dot-matrix-bg text-white" />
        
        {/* Soft radial glow behind auto */}
        <div className="absolute w-72 h-72 rounded-full bg-[#FFC554]/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center gap-6">
          <div className="w-32 h-32 sm:w-36 sm:h-36 flex items-center justify-center animate-fade-in">
            <img
              src="/logo.png"
              alt="LOOP"
              width={144}
              height={144}
              className="w-full h-full object-contain drop-shadow-[0_12px_24px_rgba(0,0,0,0.8)]"
              loading="eager"
            />
          </div>
          <div className="flex flex-col items-center gap-3">
            <h1 className="text-4xl font-black tracking-tighter text-white">LOOP</h1>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-[#FFC554] animate-pulse" />
              <div className="w-1.5 h-1.5 rounded-full bg-[#FFC554] animate-pulse [animation-delay:150ms]" />
              <div className="w-1.5 h-1.5 rounded-full bg-[#FFC554] animate-pulse [animation-delay:300ms]" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      {isPasswordReset ? (
        <main>
          <AuthLogin
            initialPasswordReset={true}
            onPasswordResetComplete={() => {
              setIsPasswordReset(false);
              if (typeof window !== "undefined") {
                window.history.replaceState(null, "", window.location.pathname);
              }
            }}
          />
        </main>
      ) : (
        <main>
          {session ? <MainApp session={session} /> : <AuthLogin />}
        </main>
      )}
    </ErrorBoundary>
  );
}
