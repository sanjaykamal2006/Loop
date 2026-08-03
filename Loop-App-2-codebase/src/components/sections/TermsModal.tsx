"use client";

import React from "react";
import { useLoop } from "@/lib/LoopContext";
import { ShieldCheck, X } from "lucide-react";

export default function TermsModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { theme } = useLoop();
  const { isDark, cardBg, border, mutedText } = theme;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
      <div className={`w-full max-w-md max-h-[85vh] ${cardBg} border ${border} rounded-[28px] p-6 flex flex-col relative shadow-2xl overflow-hidden`}>
        <div className="flex items-center justify-between pb-4 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#FFC554]/10 text-[#FFC554] flex items-center justify-center">
              <ShieldCheck size={18} strokeWidth={2.5} />
            </div>
            <div>
              <h2 className="text-base font-black uppercase tracking-tight">Terms & Privacy</h2>
              <p className={`text-[10px] font-bold ${mutedText}`}>LOOP Platform Guidelines</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center active:scale-90"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-4 pt-4 pr-1 text-xs leading-relaxed opacity-90 scrollbar-hide">
          <section className="space-y-1">
            <h3 className="font-black text-sm uppercase tracking-wider text-[#FFC554]">1. Platform Nature</h3>
            <p className={mutedText}>
              LOOP is a purpose-based, peer-to-peer coordination platform. LOOP does not provide transportation services, employ drivers, or operate as a taxi company. All rides and interactions are voluntarily arranged between individual users.
            </p>
          </section>

          <section className="space-y-1">
            <h3 className="font-black text-sm uppercase tracking-wider text-[#FFC554]">2. Limitation of Liability</h3>
            <p className={mutedText}>
              LOOP and its operators assume zero liability for any personal injury, property damage, accidents, delays, financial disputes, or conduct occurring during or after coordinated rides. Users participate entirely at their own risk.
            </p>
          </section>

          <section className="space-y-1">
            <h3 className="font-black text-sm uppercase tracking-wider text-[#FFC554]">3. User Conduct & Misuse</h3>
            <p className={mutedText}>
              Users must maintain respectful conduct. Any harassment, illegal activity, unsafe driving, misrepresentation, or misuse will result in immediate permanent account suspension.
            </p>
          </section>

          <section className="space-y-1">
            <h3 className="font-black text-sm uppercase tracking-wider text-[#FFC554]">4. Privacy & Data Handling</h3>
            <p className={mutedText}>
              We collect minimal profile information (display name, reg. number, gender) strictly to facilitate authentic coordination. We do not sell your personal data to third parties.
            </p>
          </section>
        </div>

        <div className="pt-4 border-t border-white/10 shrink-0">
          <button
            onClick={onClose}
            className="w-full py-3 bg-[#FFC554] text-black font-black text-xs uppercase tracking-wider rounded-2xl active:scale-[0.98] shadow-md"
          >
            I Understand & Agree
          </button>
        </div>
      </div>
    </div>
  );
}
