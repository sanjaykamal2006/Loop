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
    <div
      role="status"
      aria-live={activeToast.type === "error" ? "assertive" : "polite"}
      className="fixed inset-0 z-[99999] pointer-events-none flex items-center justify-center p-4"
    >
      <div
        key={activeToast.id}
        className="loop-toast pointer-events-auto max-w-[85vw] rounded-2xl px-5 py-3.5 flex items-center gap-3 animate-fade-in transition-all"
      >
        {activeToast.type === "success" && (
          <CheckCircle2 size={20} className="toast-icon-success text-emerald-400 shrink-0" />
        )}
        {activeToast.type === "error" && (
          <AlertCircle size={20} className="toast-icon-error text-red-400 shrink-0" />
        )}
        {activeToast.type === "info" && (
          <Info size={20} className="toast-icon-info text-[#FFC554] shrink-0" />
        )}
        <span className="toast-text text-sm font-bold tracking-wide text-center">
          {activeToast.message}
        </span>
      </div>
    </div>
  );
}

export default Toaster;
