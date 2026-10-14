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
    (hash.includes("access_token=") && hash.includes("recovery")) ||
    (search.includes("code=") && (search.includes("recovery") || hash.includes("recovery")))
  );
}

function getCachedOfflineSession(): Session | null {
  if (typeof window === "undefined") return null;
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith("sb-") && key.endsWith("-auth-token")) {
        const raw = localStorage.getItem(key);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed?.user?.id) return parsed as Session;
        }
      }
    }
    const legacy = localStorage.getItem("loop_offline_session");
    if (legacy) {
      const parsed = JSON.parse(legacy);
      if (parsed?.user?.id) return parsed as Session;
    }
  } catch {}
  return null;
}

export default function Home() {
  const [session, setSession] = useState<Session | null>(() => getCachedOfflineSession());
  const [loading, setLoading] = useState<boolean>(() => !getCachedOfflineSession());
  const [isPasswordReset, setIsPasswordReset] = useState<boolean>(() => checkIsRecovery());

  useEffect(() => {
    // Detect password recovery token in URL hash or search params
    if (checkIsRecovery()) {
      setIsPasswordReset(true);
    }

    const fallbackTimer = setTimeout(() => {
      setLoading(false);
    }, 1500);

    supabase.auth
      .getSession()
      .then(({ data: { session: liveSession } }) => {
        clearTimeout(fallbackTimer);
        if (liveSession) {
          setSession(liveSession);
        } else if (typeof navigator !== "undefined" && !navigator.onLine) {
          const offlineFallback = getCachedOfflineSession();
          if (offlineFallback) setSession(offlineFallback);
        } else {
          setSession(null);
        }
        setLoading(false);
      })
      .catch(() => {
        clearTimeout(fallbackTimer);
        const offlineFallback = getCachedOfflineSession();
        if (offlineFallback) setSession(offlineFallback);
        setLoading(false);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (event === "PASSWORD_RECOVERY") {
        setIsPasswordReset(true);
      }
      if (nextSession) {
        setSession(nextSession);
      } else if (event === "SIGNED_OUT" && (typeof navigator === "undefined" || navigator.onLine)) {
        setSession(null);
        try {
          localStorage.removeItem("loop_offline_session");
        } catch {}
      }
    });

    return () => {
      clearTimeout(fallbackTimer);
      subscription.unsubscribe();
    };
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
          {session ? (
            <MainApp session={session} />
          ) : (
            <AuthLogin
              onStartPasswordReset={() => setIsPasswordReset(true)}
              onPasswordResetComplete={() => {
                setIsPasswordReset(false);
                if (typeof window !== "undefined") {
                  window.history.replaceState(null, "", window.location.pathname);
                }
              }}
            />
          )}
        </main>
      )}
    </ErrorBoundary>
  );
}
