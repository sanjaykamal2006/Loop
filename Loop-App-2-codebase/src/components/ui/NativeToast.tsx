"use client";

import React, { useState, useEffect } from "react";
import { CheckCircle2, AlertCircle, Info } from "lucide-react";

type ToastType = "success" | "error" | "info";

interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
}

type Listener = (toast: ToastItem | null) => void;
let listeners: Listener[] = [];
let dismissTimeout: NodeJS.Timeout | null = null;

function notify(item: ToastItem | null) {
  listeners.forEach((l) => l(item));
}

export const toast = {
  success: (message: string) => {
    if (!message) return;
    if (dismissTimeout) clearTimeout(dismissTimeout);
    notify({ id: Math.random().toString(), message: String(message), type: "success" });
    dismissTimeout = setTimeout(() => notify(null), 2300);
  },
  error: (message: string) => {
    if (!message) return;
    if (dismissTimeout) clearTimeout(dismissTimeout);
    notify({ id: Math.random().toString(), message: String(message), type: "error" });
    dismissTimeout = setTimeout(() => notify(null), 2600);
  },
  info: (message: string) => {
    if (!message) return;
    if (dismissTimeout) clearTimeout(dismissTimeout);
    notify({ id: Math.random().toString(), message: String(message), type: "info" });
    dismissTimeout = setTimeout(() => notify(null), 2300);
  },
};

export function Toaster() {
  const [activeToast, setActiveToast] = useState<ToastItem | null>(null);

  useEffect(() => {
    const handleToast: Listener = (t) => setActiveToast(t);
    listeners.push(handleToast);
    return () => {
      listeners = listeners.filter((l) => l !== handleToast);
    };
  }, []);

  if (!activeToast) return null;

  return (
    <div className="fixed inset-0 z-[99999] pointer-events-none flex items-center justify-center p-4">
      <div 
        key={activeToast.id}
        className="pointer-events-auto max-w-[85vw] bg-[#18181b]/95 backdrop-blur-xl border border-white/15 text-white rounded-2xl px-5 py-3.5 shadow-2xl flex items-center gap-3 animate-fade-in transition-all"
        style={{
          boxShadow: activeToast.type === 'error' 
            ? '0 20px 40px rgba(0,0,0,0.85), 0 0 20px rgba(239, 68, 68, 0.15)' 
            : '0 20px 40px rgba(0,0,0,0.85), 0 0 20px rgba(255, 197, 84, 0.12)'
        }}
      >
        {activeToast.type === "success" && (
          <CheckCircle2 size={20} className="text-[#FFC554] shrink-0" />
        )}
        {activeToast.type === "error" && (
          <AlertCircle size={20} className="text-red-400 shrink-0" />
        )}
        {activeToast.type === "info" && (
          <Info size={20} className="text-[#FFC554] shrink-0" />
        )}
        <span className="text-sm font-bold text-white tracking-wide text-center">
          {activeToast.message}
        </span>
      </div>
    </div>
  );
}

export default Toaster;
