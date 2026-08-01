"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import AuthLogin from "../components/sections/AuthLogin";
import MainApp from "../components/sections/MainApp";
import { Session } from "@supabase/supabase-js";

export default function Home() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const handleAuth = async () => {
      // Check for OAuth PKCE code
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");
      
      if (code) {
        try {
          await supabase.auth.exchangeCodeForSession(code);
          // Clean up the URL
          window.history.replaceState({}, document.title, window.location.pathname);
        } catch (err) {
          console.error("Error exchanging code:", err);
        }
      }

      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      setLoading(false);
    };

    handleAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
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
    <main>
      {session ? <MainApp session={session} /> : <AuthLogin />}
    </main>
  );
}
