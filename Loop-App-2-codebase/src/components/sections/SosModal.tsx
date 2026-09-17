"use client";

import React, { useState, useEffect } from "react";
import { useLoop } from "@/lib/LoopContext";
import { 
  ShieldAlert, 
  X, 
  Phone, 
  MapPin, 
  Send, 
  MessageSquare, 
  AlertTriangle, 
  Edit3, 
  Navigation, 
  CheckCircle2, 
  Loader2 
} from "lucide-react";
import { toast } from "@/components/ui/NativeToast";
import { triggerHaptic } from "@/lib/haptics";

export default function SosModal() {
  const {
    showSosModal,
    setShowSosModal,
    setShowEmergencyContactModal,
    emergencyContact,
    selectedLoop,
    profile,
    theme,
  } = useLoop();
  const { isDark, cardBg, border, mutedText } = theme;

  const [location, setLocation] = useState<{ lat: number; lng: number; accuracy: number } | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [locError, setLocError] = useState<string | null>(null);

  // Auto-fetch real-time GPS coordinates as soon as SOS opens
  useEffect(() => {
    if (!showSosModal) return;

    if (!navigator.geolocation) {
      setLocError("GPS not supported on this device");
      return;
    }

    setIsLocating(true);
    setLocError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: Math.round(pos.coords.accuracy),
        });
        setIsLocating(false);
      },
      (err) => {
        console.warn("SOS Geolocation error:", err);
        setLocError("Could not retrieve GPS pin. Sharing ride details.");
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
    );
  }, [showSosModal]);

  if (!showSosModal) return null;

  // Build the standardized emergency dispatch message
  const buildSosMessage = () => {
    const sender = profile.display_name?.trim() || "A student";
    const senderReg = profile.reg_no ? ` (${profile.reg_no})` : "";
    const destination = selectedLoop?.destination || "Destination";
    const startPoint = selectedLoop?.start_point || "Campus";
    const departureTime = selectedLoop?.departure_time 
      ? new Date(selectedLoop.departure_time).toLocaleString("en-US", {
          month: "short",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        })
      : "Current Ride";
    const host = selectedLoop?.creator?.display_name || "Co-riders";
    const hostReg = selectedLoop?.creator?.reg_no ? ` (${selectedLoop.creator.reg_no})` : "";

    let text = `🚨 EMERGENCY SOS ALERT from ${sender}${senderReg}!\n`;
    text += `I need immediate help! I am on a LOOP ride:\n`;
    text += `📍 Destination: ${destination}\n`;
    text += `📍 Starting Point: ${startPoint}\n`;
    text += `⏰ Departure: ${departureTime}\n`;
    text += `👤 Ride Host: ${host}${hostReg}\n`;

    if (location) {
      text += `🗺️ My Live GPS Pin: https://maps.google.com/?q=${location.lat},${location.lng}\n`;
      text += `🎯 GPS Accuracy: ~${location.accuracy}m\n`;
    }

    text += `\nPlease check on me immediately or contact authorities if I do not answer!`;
    return text;
  };

  const handleWhatsAppAlert = () => {
    if (!emergencyContact?.phone) return;
    triggerHaptic(15);
    const msg = buildSosMessage();
    const cleanPhone = emergencyContact.phone.replace(/[^\d]/g, "");
    const waUrl = `https://api.whatsapp.com/send?phone=91${cleanPhone}&text=${encodeURIComponent(msg)}`;
    window.open(waUrl, "_blank");
  };

  const handleSmsAlert = () => {
    if (!emergencyContact?.phone) return;
    triggerHaptic(15);
    const msg = buildSosMessage();
    const cleanPhone = emergencyContact.phone.replace(/[^\d]/g, "");
    // Cross-platform SMS URL
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const smsUrl = isIOS
      ? `sms:+91${cleanPhone}&body=${encodeURIComponent(msg)}`
      : `sms:+91${cleanPhone}?body=${encodeURIComponent(msg)}`;
    window.location.href = smsUrl;
  };

  const handlePhoneCall = () => {
    if (!emergencyContact?.phone) return;
    triggerHaptic(15);
    const cleanPhone = emergencyContact.phone.replace(/[^\d]/g, "");
    window.location.href = `tel:+91${cleanPhone}`;
  };

  const handleCall112 = () => {
    triggerHaptic(25);
    window.location.href = "tel:112";
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div
        className={`w-full max-w-sm rounded-[32px] ${cardBg} border-2 border-red-500/40 p-5 sm:p-6 shadow-[0_0_50px_rgba(239,68,68,0.25)] relative overflow-hidden animate-scale-up space-y-4`}
        role="dialog"
        aria-modal="true"
      >
        {/* Top Emergency Beacon Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-red-600 text-white flex items-center justify-center shrink-0 shadow-lg shadow-red-600/40 animate-pulse">
              <ShieldAlert size={26} strokeWidth={2.5} />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h2 className="text-lg font-black text-red-500 tracking-tight uppercase">Emergency SOS</h2>
                <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
              </div>
              <p className={`text-[11px] font-bold ${mutedText}`}>Instant safety alert dispatch</p>
            </div>
          </div>
          <button
            onClick={() => {
              triggerHaptic(8);
              setShowSosModal(false);
            }}
            aria-label="Close SOS modal"
            className={`w-8 h-8 rounded-full border ${border} flex items-center justify-center cursor-pointer active:scale-90 transition-transform`}
          >
            <X size={16} />
          </button>
        </div>

        {/* GPS Status Pill */}
        <div className={`p-2.5 px-3 rounded-xl border flex items-center justify-between text-xs ${
          location
            ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-400 font-bold"
            : isLocating
            ? "bg-amber-500/10 border-amber-500/25 text-amber-400 font-bold"
            : "bg-red-500/10 border-red-500/25 text-red-400"
        }`}>
          <div className="flex items-center gap-2">
            {isLocating ? (
              <Loader2 size={14} className="animate-spin text-amber-400" />
            ) : location ? (
              <CheckCircle2 size={14} className="text-emerald-400" />
            ) : (
              <AlertTriangle size={14} className="text-red-400" />
            )}
            <span className="text-[11px] font-bold">
              {isLocating
                ? "Locating your GPS coordinates..."
                : location
                ? `Live GPS Pinpoint ready (±${location.accuracy}m)`
                : locError || "GPS Pinpoint unavailable"}
            </span>
          </div>
          {location && (
            <span className="text-[9px] font-black uppercase tracking-wider bg-emerald-500/20 px-1.5 py-0.5 rounded text-emerald-300">
              Live
            </span>
          )}
        </div>

        {/* Target Emergency Contact Card */}
        {emergencyContact && emergencyContact.phone ? (
          <div className={`p-3 rounded-2xl border ${border} ${isDark ? "bg-white/5" : "bg-black/[0.03]"} flex items-center justify-between`}>
            <div>
              <p className={`text-[9px] font-black uppercase tracking-wider ${mutedText}`}>Emergency Contact</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-sm font-black tracking-tight">{emergencyContact.name}</span>
                {emergencyContact.relation && (
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                    isDark ? "bg-white/10 text-zinc-300" : "bg-black/10 text-stone-700"
                  }`}>
                    {emergencyContact.relation}
                  </span>
                )}
              </div>
              <p className="text-xs font-mono font-bold text-red-400 mt-0.5">
                +91 {emergencyContact.phone}
              </p>
            </div>
            <button
              onClick={() => {
                setShowSosModal(false);
                setShowEmergencyContactModal(true);
              }}
              aria-label="Change contact"
              className={`p-2 rounded-xl border ${border} ${isDark ? "hover:bg-white/10" : "hover:bg-black/5"} active:scale-90 transition-all cursor-pointer`}
            >
              <Edit3 size={14} className={mutedText} />
            </button>
          </div>
        ) : (
          <div className="p-3 rounded-2xl border border-dashed border-red-500/40 bg-red-500/5 text-center space-y-1.5">
            <p className="text-xs font-bold text-red-400">No emergency contact saved yet</p>
            <button
              onClick={() => {
                setShowSosModal(false);
                setShowEmergencyContactModal(true);
              }}
              className="px-3 py-1 bg-red-600 text-white rounded-lg text-xs font-black uppercase tracking-wider"
            >
              + Add Contact Now
            </button>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-2 pt-1">
          {/* 1. WhatsApp Alert (Preferred for rich formatted text + map link) */}
          <button
            onClick={handleWhatsAppAlert}
            disabled={!emergencyContact?.phone}
            className="w-full h-12 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-black rounded-2xl text-xs uppercase tracking-wider shadow-lg shadow-emerald-600/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Send size={16} strokeWidth={2.5} />
            <span>Send SOS via WhatsApp</span>
          </button>

          {/* 2. SMS Alert */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleSmsAlert}
              disabled={!emergencyContact?.phone}
              className={`h-11 border ${border} ${isDark ? "bg-white/5 hover:bg-white/10" : "bg-black/5 hover:bg-black/10"} disabled:opacity-50 font-bold rounded-2xl text-xs uppercase tracking-wider active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 cursor-pointer`}
            >
              <MessageSquare size={15} />
              <span>SMS Alert</span>
            </button>

            {/* 3. Direct Phone Call */}
            <button
              onClick={handlePhoneCall}
              disabled={!emergencyContact?.phone}
              className={`h-11 border ${border} ${isDark ? "bg-white/5 hover:bg-white/10" : "bg-black/5 hover:bg-black/10"} disabled:opacity-50 font-bold rounded-2xl text-xs uppercase tracking-wider active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 cursor-pointer`}
            >
              <Phone size={15} />
              <span>Call Contact</span>
            </button>
          </div>

          {/* 4. National Emergency Number (112) */}
          <button
            onClick={handleCall112}
            className="w-full h-11 bg-red-600/20 hover:bg-red-600/30 border border-red-500/50 text-red-400 hover:text-red-300 font-black rounded-2xl text-xs uppercase tracking-wider active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Phone size={15} strokeWidth={2.5} />
            <span>Call National Helpline (112)</span>
          </button>
        </div>
      </div>
    </div>
  );
}
