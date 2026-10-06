"use client";

import React, { useState } from "react";
import { useLoop } from "@/lib/LoopContext";
import { 
  ShieldAlert, 
  X, 
  Phone, 
  User, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  Send, 
  MessageSquare, 
  AlertCircle,
  Sparkles
} from "lucide-react";
import { toast } from "@/components/ui/NativeToast";
import { triggerHaptic } from "@/lib/haptics";
import { sanitizeIndianPhoneNumber } from "@/lib/utils";
import { openWhatsApp } from "@/lib/whatsapp";
import type { EmergencyContact } from "@/lib/types";

export default function EmergencyContactModal() {
  const {
    showEmergencyContactModal,
    setShowEmergencyContactModal,
    emergencyContacts = [],
    saveEmergencyContacts,
    profile,
    theme,
  } = useLoop();
  const { isDark, cardBg, border, mutedText } = theme;

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [relation, setRelation] = useState("Parent");
  const [showAddForm, setShowAddForm] = useState(false);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [testTargetContact, setTestTargetContact] = useState<EmergencyContact | null>(null);

  if (!showEmergencyContactModal) return null;

  // Clean, focused relation options (Roommate removed)
  const relations = ["Parent", "Guardian", "Sibling", "Friend"];

  const formatPhoneNumber = (val: string) => {
    const cleaned = sanitizeIndianPhoneNumber(val);
    if (cleaned.length === 10) {
      return `${cleaned.slice(0, 5)} ${cleaned.slice(5)}`;
    }
    return cleaned;
  };

  const validatePhone = (val: string): string | null => {
    if (!val) return "Phone number is required";
    if (val.length !== 10) return "Enter a valid 10-digit number";
    if (!/^[6-9]\d{9}$/.test(val)) return "Enter a valid mobile number";
    return null;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const cleaned = sanitizeIndianPhoneNumber(raw);
    setPhone(cleaned);

    if (phoneError) {
      if (cleaned.length === 10 && /^[6-9]\d{9}$/.test(cleaned)) {
        setPhoneError(null);
      }
    }
  };

  const handlePhonePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData("text");
    const cleaned = sanitizeIndianPhoneNumber(pasted);
    if (cleaned) {
      e.preventDefault();
      setPhone(cleaned);
      if (cleaned.length === 10 && /^[6-9]\d{9}$/.test(cleaned)) {
        setPhoneError(null);
      }
    }
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    triggerHaptic(12);

    const cleanName = name.trim();
    const cleanPhone = sanitizeIndianPhoneNumber(phone);

    if (!cleanName) {
      return toast.error("Please enter a contact name");
    }

    const err = validatePhone(cleanPhone);
    if (err) {
      setPhoneError(err);
      return toast.error(err);
    }

    if (emergencyContacts.some((c) => sanitizeIndianPhoneNumber(c.phone) === cleanPhone)) {
      setPhoneError("Phone number already added");
      return toast.error("This number is already in your emergency contacts");
    }

    if (emergencyContacts.length >= 3) {
      return toast.error("Maximum 3 emergency contacts allowed");
    }

    const newContact: EmergencyContact = {
      id: `ec-${Date.now()}`,
      name: cleanName,
      phone: cleanPhone,
      relation,
    };

    const updated = [...emergencyContacts, newContact];
    saveEmergencyContacts(updated);
    setName("");
    setPhone("");
    setPhoneError(null);
    setRelation("Parent");
    setShowAddForm(false);
    toast.success(`Added ${cleanName} to emergency contacts`);
  };

  const handleDelete = (index: number) => {
    triggerHaptic(10);
    const target = emergencyContacts[index];
    const updated = emergencyContacts.filter((_, i) => i !== index);
    saveEmergencyContacts(updated);
    toast.info(`Removed ${target?.name || "contact"}`);
  };

  const getTestMessage = () => {
    const senderName = profile?.display_name?.trim() || "A student";
    return `LOOP Emergency Test: ${senderName} added you as a trusted emergency contact. If they ever trigger an SOS alert during a ride, you will receive live trip and GPS updates here.`;
  };

  const handleSendTestMessage = (contact: EmergencyContact, medium: "whatsapp" | "sms") => {
    triggerHaptic(12);
    const cleanPhone = sanitizeIndianPhoneNumber(contact.phone);
    const msg = getTestMessage();

    if (medium === "whatsapp") {
      openWhatsApp({ phone: cleanPhone, text: msg });
      toast.success(`Opening WhatsApp alert for ${contact.name}`);
    } else {
      const isIOS = typeof navigator !== "undefined" && /iPad|iPhone|iPod/.test(navigator.userAgent);
      const smsUrl = isIOS
        ? `sms:+91${cleanPhone}&body=${encodeURIComponent(msg)}`
        : `sms:+91${cleanPhone}?body=${encodeURIComponent(msg)}`;
      window.location.href = smsUrl;
      toast.success(`Opening SMS alert for ${contact.name}`);
    }
  };

  const isFormOpen = showAddForm || emergencyContacts.length === 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in font-sans">
      <div
        className={`w-full max-w-sm max-h-[90dvh] flex flex-col rounded-[28px] ${cardBg} border ${border} p-5 sm:p-6 shadow-2xl relative overflow-hidden animate-scale-up`}
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 mb-3 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-red-500/15 border border-red-500/25 text-red-500 flex items-center justify-center shrink-0">
              <ShieldAlert size={18} strokeWidth={2.4} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black tracking-tight">Emergency Contacts</h2>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-red-500/20 text-red-400">
                  {emergencyContacts.length}/3
                </span>
              </div>
              <p className={`text-[11px] font-medium ${mutedText}`}>Saved for 1-tap emergency SOS</p>
            </div>
          </div>
          <button
            onClick={() => {
              triggerHaptic(8);
              setShowEmergencyContactModal(false);
            }}
            aria-label="Close modal"
            className={`w-8 h-8 rounded-full border ${border} ${
              isDark ? "bg-white/5 hover:bg-white/10 text-zinc-300" : "bg-black/5 hover:bg-black/10 text-stone-700"
            } flex items-center justify-center cursor-pointer active:scale-90 transition-transform`}
          >
            <X size={15} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-0.5 min-h-0 scrollbar-hide">
          {/* Saved Contacts List */}
          {emergencyContacts.length > 0 && (
            <div className="space-y-2">
              {emergencyContacts.map((contact, idx) => (
                <div
                  key={contact.id || idx}
                  className={`p-3 rounded-2xl border ${border} ${
                    isDark ? "bg-white/[0.03] hover:bg-white/[0.05]" : "bg-black/[0.02] hover:bg-black/[0.04]"
                  } transition-all space-y-2`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      {/* Avatar initial badge */}
                      <div className="w-9 h-9 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center text-xs font-black shrink-0">
                        {contact.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs sm:text-sm font-black truncate">{contact.name}</span>
                          {contact.relation && (
                            <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded-md shrink-0 ${
                              isDark ? "bg-white/10 text-zinc-300" : "bg-black/10 text-stone-700"
                            }`}>
                              {contact.relation}
                            </span>
                          )}
                        </div>
                        <p className={`text-xs font-mono font-medium ${mutedText} mt-0.5 flex items-center gap-1`}>
                          <span>+91 {formatPhoneNumber(contact.phone)}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {/* Test Alert Button */}
                      <button
                        type="button"
                        onClick={() => {
                          triggerHaptic(8);
                          setTestTargetContact(contact);
                        }}
                        title={`Send test alert to ${contact.name}`}
                        className="h-8 px-2.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-400 text-[11px] font-black tracking-wide flex items-center gap-1 active:scale-95 transition-all cursor-pointer"
                      >
                        <Send size={11} strokeWidth={2.4} />
                        <span>Test</span>
                      </button>

                      {/* Remove Button */}
                      <button
                        type="button"
                        onClick={() => handleDelete(idx)}
                        aria-label={`Remove ${contact.name}`}
                        className="w-8 h-8 rounded-xl border border-white/10 hover:border-red-500/40 text-zinc-400 hover:text-red-400 hover:bg-red-500/10 flex items-center justify-center transition-colors active:scale-90 cursor-pointer"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Add Contact Card / Form */}
          {emergencyContacts.length < 3 && (
            <div>
              {!isFormOpen ? (
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic(8);
                    setShowAddForm(true);
                  }}
                  className={`w-full py-3 rounded-2xl border border-dashed ${border} hover:border-red-500/50 ${
                    isDark ? "bg-white/[0.02] hover:bg-white/[0.05] text-zinc-300" : "bg-black/[0.02] hover:bg-black/[0.05] text-stone-700"
                  } text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer`}
                >
                  <Plus size={15} strokeWidth={2.4} className="text-red-400" />
                  <span>Add Emergency Contact ({emergencyContacts.length}/3)</span>
                </button>
              ) : (
                <form 
                  onSubmit={handleAdd} 
                  className={`p-3.5 rounded-2xl border ${border} ${
                    isDark ? "bg-white/[0.02]" : "bg-black/[0.02]"
                  } space-y-3 animate-fade-in`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black uppercase tracking-wider text-red-400 flex items-center gap-1.5">
                      <Sparkles size={12} />
                      <span>New Contact ({emergencyContacts.length + 1}/3)</span>
                    </span>
                    {emergencyContacts.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          triggerHaptic(6);
                          setShowAddForm(false);
                          setPhoneError(null);
                        }}
                        className="text-[11px] font-bold text-zinc-400 hover:text-white cursor-pointer transition-colors"
                      >
                        Cancel
                      </button>
                    )}
                  </div>

                  {/* Name Input */}
                  <div className="space-y-1">
                    <label className={`text-[10px] font-black uppercase tracking-wider block ${mutedText}`}>
                      Name
                    </label>
                    <div className={`flex items-center gap-2 px-3 h-10 rounded-xl border ${border} ${
                      isDark ? "bg-white/5" : "bg-black/5"
                    }`}>
                      <User size={14} className={isDark ? "text-zinc-400" : "text-stone-500"} />
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Mom, Dad, or Name"
                        maxLength={30}
                        className="flex-1 bg-transparent text-xs sm:text-sm font-bold outline-none placeholder:text-zinc-500"
                        autoFocus={emergencyContacts.length > 0}
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
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                            relation === rel
                              ? "bg-red-500 text-white font-black shadow-xs shadow-red-500/30 scale-[1.02]"
                              : `${border} border ${isDark ? "bg-white/5 text-zinc-300 hover:bg-white/10" : "bg-black/5 text-stone-700 hover:bg-black/10"}`
                          }`}
                        >
                          {rel}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Phone Number Input */}
                  <div className="space-y-1">
                    <label className={`text-[10px] font-black uppercase tracking-wider block ${mutedText}`}>
                      Phone Number
                    </label>
                    <div className={`flex items-center gap-2 px-3 h-10 rounded-xl border ${
                      phoneError ? "border-red-500/80 ring-1 ring-red-500/30" : border
                    } ${isDark ? "bg-white/5" : "bg-black/5"} transition-all`}>
                      <span className="text-xs font-black text-red-400">+91</span>
                      <Phone size={13} className={isDark ? "text-zinc-400" : "text-stone-500"} />
                      <input
                        type="tel"
                        inputMode="numeric"
                        value={phone}
                        onChange={handlePhoneChange}
                        onPaste={handlePhonePaste}
                        placeholder="98765 43210"
                        maxLength={10}
                        className="flex-1 bg-transparent text-xs sm:text-sm font-mono font-bold outline-none placeholder:text-zinc-500 tracking-wider"
                      />
                    </div>
                    {phoneError && (
                      <p className="text-[11px] text-red-400 font-bold flex items-center gap-1 mt-1 animate-fade-in">
                        <AlertCircle size={12} className="shrink-0 text-red-500" />
                        <span>{phoneError}</span>
                      </p>
                    )}
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    className="w-full h-11 rounded-2xl bg-red-600 hover:bg-red-700 text-white text-xs font-black uppercase tracking-wider shadow-md shadow-red-600/20 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Plus size={15} strokeWidth={2.6} />
                    <span>Save Contact ({emergencyContacts.length + 1}/3)</span>
                  </button>
                </form>
              )}
            </div>
          )}
        </div>

        {/* Done / Close footer */}
        <div className="pt-3 border-t border-white/10 shrink-0">
          <button
            type="button"
            onClick={() => {
              triggerHaptic(8);
              setShowEmergencyContactModal(false);
            }}
            className={`w-full h-11 rounded-2xl ${
              isDark ? "bg-white/10 hover:bg-white/15 text-white" : "bg-black/5 hover:bg-black/10 text-zinc-900"
            } text-xs font-black uppercase tracking-wider active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-1.5`}
          >
            <CheckCircle2 size={15} />
            <span>Done</span>
          </button>
        </div>

        {/* Test Alert Modal Popup */}
        {testTargetContact && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
            <div className={`w-full max-w-xs rounded-[24px] ${cardBg} border ${border} p-5 space-y-3.5 shadow-2xl animate-scale-up`}>
              <div className="flex items-center justify-between pb-2 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 flex items-center justify-center shrink-0">
                    <Send size={14} strokeWidth={2.4} />
                  </div>
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-wider text-emerald-400">Test Alert</h3>
                    <p className={`text-[11px] font-bold ${mutedText} truncate`}>
                      {testTargetContact.name} (+91 {formatPhoneNumber(testTargetContact.phone)})
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setTestTargetContact(null)}
                  className={`w-7 h-7 rounded-full border ${border} flex items-center justify-center text-zinc-400 hover:text-white cursor-pointer`}
                >
                  <X size={13} />
                </button>
              </div>

              {/* Message Preview */}
              <div className={`p-3 rounded-xl ${
                isDark ? "bg-black/50 border border-white/5" : "bg-black/[0.03] border border-black/5"
              } text-[11px] leading-relaxed text-zinc-300 font-mono`}>
                &ldquo;{getTestMessage()}&rdquo;
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    handleSendTestMessage(testTargetContact, "whatsapp");
                    setTestTargetContact(null);
                  }}
                  className="w-full h-11 rounded-xl bg-[#25D366] hover:bg-[#20ba59] text-white text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 active:scale-95 transition-all shadow-md shadow-[#25D366]/20 cursor-pointer"
                >
                  <Send size={13} strokeWidth={2.4} />
                  <span>WhatsApp Alert</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleSendTestMessage(testTargetContact, "sms");
                    setTestTargetContact(null);
                  }}
                  className={`w-full h-10 rounded-xl border ${border} ${
                    isDark ? "bg-white/5 hover:bg-white/10 text-white" : "bg-black/5 hover:bg-black/10 text-black"
                  } text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer`}
                >
                  <MessageSquare size={13} />
                  <span>SMS Alert</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
