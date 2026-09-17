"use client";

import React, { useState, useEffect } from "react";
import { useLoop } from "@/lib/LoopContext";
import { ShieldAlert, X, Phone, User, HeartHandshake, Check } from "lucide-react";
import { toast } from "@/components/ui/NativeToast";
import { triggerHaptic } from "@/lib/haptics";

export default function EmergencyContactModal() {
  const {
    showEmergencyContactModal,
    setShowEmergencyContactModal,
    emergencyContact,
    saveEmergencyContact,
    theme,
  } = useLoop();
  const { isDark, cardBg, border, mutedText } = theme;

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [relation, setRelation] = useState("Parent");

  useEffect(() => {
    if (emergencyContact) {
      setName(emergencyContact.name || "");
      setPhone(emergencyContact.phone || "");
      setRelation(emergencyContact.relation || "Parent");
    } else {
      setName("");
      setPhone("");
      setRelation("Parent");
    }
  }, [emergencyContact, showEmergencyContactModal]);

  if (!showEmergencyContactModal) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    triggerHaptic(12);

    const cleanName = name.trim();
    let cleanPhone = phone.trim().replace(/[^\d]/g, "");
    if (cleanPhone.startsWith("91") && cleanPhone.length === 12) {
      cleanPhone = cleanPhone.slice(2);
    }

    if (!cleanName) {
      return toast.error("Please enter contact name (e.g. Mom, Dad, Roommate)");
    }
    if (!cleanPhone || cleanPhone.length !== 10) {
      return toast.error("Please enter a valid 10-digit mobile number");
    }

    const saved = {
      name: cleanName,
      phone: cleanPhone,
      relation,
    };

    saveEmergencyContact(saved);
    setShowEmergencyContactModal(false);
    toast.success(`Emergency contact set to ${cleanName}`);
  };

  const relations = ["Parent", "Friend", "Guardian", "Sibling", "Roommate"];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in">
      <div
        className={`w-full max-w-sm rounded-[28px] ${cardBg} border ${border} p-5 sm:p-6 shadow-2xl relative overflow-hidden animate-scale-up`}
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-red-500/15 border border-red-500/30 text-red-500 flex items-center justify-center shrink-0">
              <ShieldAlert size={22} strokeWidth={2.5} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-tight">Emergency SOS Contact</h2>
              <p className={`text-[11px] font-medium ${mutedText}`}>Parents or trusted friends for instant alerts</p>
            </div>
          </div>
          <button
            onClick={() => {
              triggerHaptic(8);
              setShowEmergencyContactModal(false);
            }}
            aria-label="Close modal"
            className={`w-8 h-8 rounded-full border ${border} flex items-center justify-center cursor-pointer active:scale-90 transition-transform`}
          >
            <X size={15} />
          </button>
        </div>

        {/* Safety Note */}
        <div className="p-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs mb-4 flex items-start gap-2.5">
          <HeartHandshake size={16} className="shrink-0 mt-0.5" />
          <p className="text-[11px] leading-relaxed">
            In an emergency, tapping the <strong className="text-red-300">SOS</strong> button on any ride will automatically package your ride route and live GPS location pin to alert this contact.
          </p>
        </div>

        <form onSubmit={handleSave} className="space-y-3.5">
          {/* Contact Name */}
          <div className="space-y-1">
            <label className={`text-[10px] font-black uppercase tracking-wider block ${mutedText}`}>
              Contact Name / Person
            </label>
            <div className={`flex items-center gap-2 px-3 h-11 rounded-xl border ${border} ${isDark ? "bg-white/5" : "bg-black/5"}`}>
              <User size={16} className={isDark ? "text-zinc-400" : "text-stone-500"} />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Dad, Mom, Roommate"
                maxLength={30}
                className="flex-1 bg-transparent text-sm font-bold outline-none placeholder:text-zinc-500"
                autoFocus
              />
            </div>
          </div>

          {/* Relationship Chips */}
          <div className="space-y-1">
            <label className={`text-[10px] font-black uppercase tracking-wider block ${mutedText}`}>
              Relationship
            </label>
            <div className="flex flex-wrap gap-1.5">
              {relations.map((rel) => (
                <button
                  key={rel}
                  type="button"
                  onClick={() => {
                    triggerHaptic(6);
                    setRelation(rel);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    relation === rel
                      ? "bg-red-500 text-white shadow-xs font-black"
                      : `${border} border ${isDark ? "bg-white/5 text-zinc-300" : "bg-black/5 text-stone-700"}`
                  }`}
                >
                  {rel}
                </button>
              ))}
            </div>
          </div>

          {/* Phone Number */}
          <div className="space-y-1">
            <label className={`text-[10px] font-black uppercase tracking-wider block ${mutedText}`}>
              10-Digit Mobile / WhatsApp Number
            </label>
            <div className={`flex items-center gap-2 px-3 h-11 rounded-xl border ${border} ${isDark ? "bg-white/5" : "bg-black/5"}`}>
              <span className="text-xs font-black text-red-400">+91</span>
              <Phone size={15} className={isDark ? "text-zinc-400" : "text-stone-500"} />
              <input
                type="tel"
                inputMode="numeric"
                maxLength={10}
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                placeholder="9876543210"
                className="flex-1 bg-transparent text-sm font-mono font-bold outline-none placeholder:text-zinc-500 tracking-wider"
              />
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="pt-2 flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowEmergencyContactModal(false)}
              className={`flex-1 h-11 rounded-xl border ${border} text-xs font-bold active:scale-95 transition-all cursor-pointer ${
                isDark ? "text-zinc-300 hover:bg-white/5" : "text-stone-700 hover:bg-black/5"
              }`}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 h-11 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-black uppercase tracking-wider shadow-lg shadow-red-500/20 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Check size={16} strokeWidth={3} />
              <span>Save Contact</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
