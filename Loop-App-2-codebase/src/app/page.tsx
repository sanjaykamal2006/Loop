"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import AuthLogin from "../components/sections/AuthLogin";
import MainApp from "../components/sections/MainApp";
import ErrorBoundary from "@/components/ErrorBoundary";
import { Session } from "@supabase/supabase-js";

function checkIsRecovery(): boolean {
  if (typeof window === "undefined") return false;
  const hash = window.location.hash || "";
  const search = window.location.search || "";
  return (
    hash.includes("type=recovery") ||
    search.includes("type=recovery") ||
    (hash.includes("access_token=") && hash.includes("recovery"))
  );
}

export default function Home() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPasswordReset, setIsPasswordReset] = useState<boolean>(() => checkIsRecovery());

  useEffect(() => {
    // Detect password recovery token in URL hash or search params
    if (checkIsRecovery()) {
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
        <div className="relative z-10 flex flex-col items-center gap-6">
          <h1 className="text-5xl font-black tracking-tighter text-white">LOOP</h1>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-[#FFC554] animate-pulse" />
            <div className="w-1.5 h-1.5 rounded-full bg-[#FFC554] animate-pulse [animation-delay:150ms]" />
            <div className="w-1.5 h-1.5 rounded-full bg-[#FFC554] animate-pulse [animation-delay:300ms]" />
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
