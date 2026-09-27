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
import { sanitizeIndianPhoneNumber } from "@/lib/utils";

export default function SosModal() {
  const {
    showSosModal,
    setShowSosModal,
    setShowEmergencyContactModal,
    emergencyContacts = [],
    selectedLoop,
    profile,
    theme,
  } = useLoop();
  const { isDark, cardBg, border, mutedText } = theme;

  const [location, setLocation] = useState<{ lat: number; lng: number; accuracy: number } | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [locError, setLocError] = useState<string | null>(null);
  const [selectedContactIdx, setSelectedContactIdx] = useState(0);

  // Active targeted emergency contact
  const currentContact = emergencyContacts[selectedContactIdx] || emergencyContacts[0] || null;
  const hasValidContact = Boolean(
    currentContact?.phone && /^[6-9]\d{9}$/.test(sanitizeIndianPhoneNumber(currentContact.phone))
  );

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
        if (process.env.NODE_ENV !== "production") {
          console.warn("SOS Geolocation error:", err);
        }
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
    } else {
      text += `⚠️ Live GPS Pin: Unavailable (location permission denied on phone)\n`;
    }

    text += `\nPlease check on me immediately or contact authorities if I do not answer!`;
    return text;
  };

  const handleWhatsAppAlert = () => {
    if (!hasValidContact || !currentContact) {
      toast.error("Please add an emergency contact first");
      setShowSosModal(false);
      setShowEmergencyContactModal(true);
      return;
    }
    triggerHaptic(15);
    const msg = buildSosMessage();
    const cleanPhone = sanitizeIndianPhoneNumber(currentContact.phone);
    const waUrl = `https://api.whatsapp.com/send?phone=91${cleanPhone}&text=${encodeURIComponent(msg)}`;
    window.open(waUrl, "_blank");
  };

  const handleSmsAlert = () => {
    if (!hasValidContact || !currentContact) {
      toast.error("Please add an emergency contact first");
      setShowSosModal(false);
      setShowEmergencyContactModal(true);
      return;
    }
    triggerHaptic(15);
    const msg = buildSosMessage();
    const cleanPhone = sanitizeIndianPhoneNumber(currentContact.phone);
    const isIOS = typeof navigator !== "undefined" && /iPad|iPhone|iPod/.test(navigator.userAgent);
    const smsUrl = isIOS
      ? `sms:+91${cleanPhone}&body=${encodeURIComponent(msg)}`
      : `sms:+91${cleanPhone}?body=${encodeURIComponent(msg)}`;
    window.location.href = smsUrl;
  };

  const handlePhoneCall = () => {
    if (!hasValidContact || !currentContact) return;
    triggerHaptic(15);
    const cleanPhone = sanitizeIndianPhoneNumber(currentContact.phone);
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

        {/* Multiple Contact Selector Tabs if > 1 */}
        {emergencyContacts.length > 1 && (
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-black/20 border border-white/5">
            {emergencyContacts.map((c, i) => (
              <button
                key={c.id || i}
                type="button"
                onClick={() => {
                  triggerHaptic(6);
                  setSelectedContactIdx(i);
                }}
                className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-black transition-all cursor-pointer truncate ${
                  selectedContactIdx === i
                    ? "bg-red-600 text-white shadow-xs"
                    : `${isDark ? "text-zinc-400 hover:text-white" : "text-stone-600 hover:text-black"}`
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>
        )}

        {/* Target Emergency Contact Card */}
        {hasValidContact && currentContact ? (
          <div className={`p-3 rounded-2xl border ${border} ${isDark ? "bg-white/5" : "bg-black/[0.03]"} flex items-center justify-between`}>
            <div>
              <p className={`text-[9px] font-black uppercase tracking-wider ${mutedText}`}>Target Contact</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-sm font-black tracking-tight">{currentContact.name}</span>
                {currentContact.relation && (
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                    isDark ? "bg-white/10 text-zinc-300" : "bg-black/10 text-stone-700"
                  }`}>
                    {currentContact.relation}
                  </span>
                )}
              </div>
              <p className="text-xs font-mono font-bold text-red-400 mt-0.5">
                +91 {currentContact.phone}
              </p>
            </div>
            <button
              onClick={() => {
                setShowSosModal(false);
                setShowEmergencyContactModal(true);
              }}
              aria-label="Manage contacts"
              className={`px-2.5 py-1.5 rounded-xl border ${border} ${isDark ? "hover:bg-white/10" : "hover:bg-black/5"} active:scale-90 transition-all cursor-pointer flex items-center gap-1 text-[11px] font-bold`}
            >
              <Edit3 size={12} className={mutedText} />
              <span className={mutedText}>Manage</span>
            </button>
          </div>
        ) : (
          <div className="p-3.5 rounded-2xl border border-dashed border-red-500/40 bg-red-500/5 text-center space-y-1.5">
            <p className="text-xs font-black text-red-400">No emergency contact saved yet</p>
            <p className="text-[10px] text-zinc-400 leading-tight">
              Add at least one trusted contact to enable WhatsApp and SMS SOS dispatches.
            </p>
            <button
              onClick={() => {
                setShowSosModal(false);
                setShowEmergencyContactModal(true);
              }}
              className="px-3.5 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-black uppercase tracking-wider active:scale-95 transition-all cursor-pointer shadow-md shadow-red-600/20"
            >
              + Add Contact Now
            </button>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-2 pt-1">
          {/* 1. Primary Action: Call 112 Immediately */}
          <a
            href="tel:112"
            onClick={handleCall112}
            className="w-full h-12 bg-red-600 hover:bg-red-500 text-white font-black rounded-2xl text-xs uppercase tracking-wider shadow-lg shadow-red-600/30 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer select-none"
          >
            <Phone size={16} strokeWidth={2.5} />
            <span>Call Emergency Services (112)</span>
          </a>

          {/* 2. WhatsApp Alert */}
          <button
            onClick={handleWhatsAppAlert}
            disabled={!hasValidContact}
            className="w-full h-12 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-30 disabled:cursor-not-allowed text-white font-black rounded-2xl text-xs uppercase tracking-wider shadow-md shadow-emerald-600/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Send size={16} strokeWidth={2.5} />
            <span>Alert {currentContact ? currentContact.name : "Contact"} via WhatsApp</span>
          </button>

          {/* 3. SMS Alert & Call Contact in 2-column grid */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleSmsAlert}
              disabled={!hasValidContact}
              className={`h-11 border ${border} ${isDark ? "bg-white/5 hover:bg-white/10 text-white" : "bg-black/5 hover:bg-black/10 text-black"} disabled:opacity-30 disabled:cursor-not-allowed font-bold rounded-2xl text-xs uppercase tracking-wider active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 cursor-pointer`}
            >
              <MessageSquare size={15} />
              <span>SMS Alert</span>
            </button>

            <button
              onClick={handlePhoneCall}
              disabled={!hasValidContact}
              className={`h-11 border ${border} ${isDark ? "bg-white/5 hover:bg-white/10 text-white" : "bg-black/5 hover:bg-black/10 text-black"} disabled:opacity-30 disabled:cursor-not-allowed font-bold rounded-2xl text-xs uppercase tracking-wider active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 cursor-pointer`}
            >
              <Phone size={15} />
              <span>Call Contact</span>
            </button>
          </div>

          {/* Honest in-modal explanation note directly under buttons */}
          <p className={`text-[10px] text-center font-bold ${mutedText} pt-1 leading-snug`}>
            WhatsApp/SMS opens with your alert and live pin ready — hit send there to notify {currentContact ? currentContact.name : "your contact"}.
          </p>
        </div>
      </div>
    </div>
  );
}
