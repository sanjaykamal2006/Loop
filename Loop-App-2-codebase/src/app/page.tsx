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
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <div className="text-white text-sm uppercase tracking-widest animate-pulse">Loading...</div>
      </div>
    );
  }

  return (
    <main>
      {session ? <MainApp session={session} /> : <AuthLogin />}
    </main>
  );
}
