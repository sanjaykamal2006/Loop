"use client";

import React, { useState } from "react";
import { useLoop } from "@/lib/LoopContext";
import { ShieldAlert, X, Phone, User, HeartHandshake, Plus, Trash2, CheckCircle, Send, MessageSquare, AlertTriangle } from "lucide-react";
import { toast } from "@/components/ui/NativeToast";
import { triggerHaptic } from "@/lib/haptics";
import { sanitizeIndianPhoneNumber } from "@/lib/utils";
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

  const relations = ["Parent", "Friend", "Guardian", "Sibling", "Roommate"];

  const validatePhone = (val: string): string | null => {
    if (!val) return "Phone number is required";
    if (!/^[6-9]/.test(val)) return "Indian mobile numbers must start with 6, 7, 8, or 9";
    if (val.length !== 10) return `Must be exactly 10 digits (${val.length}/10 entered)`;
    if (!/^[6-9]\d{9}$/.test(val)) return "Please enter a valid 10-digit Indian mobile number";
    return null;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const cleaned = sanitizeIndianPhoneNumber(raw);
    setPhone(cleaned);

    if (!cleaned) {
      setPhoneError(null);
    } else if (!/^[6-9]/.test(cleaned)) {
      setPhoneError("Indian mobile numbers must start with 6, 7, 8, or 9");
    } else if (cleaned.length < 10) {
      setPhoneError(`10 digits required (${cleaned.length}/10 entered)`);
    } else if (!/^[6-9]\d{9}$/.test(cleaned)) {
      setPhoneError("Please enter a valid 10-digit Indian mobile number");
    } else {
      setPhoneError(null);
    }
  };

  const handlePhonePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData("text");
    const cleaned = sanitizeIndianPhoneNumber(pasted);
    if (cleaned) {
      e.preventDefault();
      setPhone(cleaned);
      setPhoneError(validatePhone(cleaned));
    }
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    triggerHaptic(12);

    const cleanName = name.trim();
    const cleanPhone = sanitizeIndianPhoneNumber(phone);

    if (!cleanName) {
      return toast.error("Please enter contact name (e.g. Mom, Dad, Roommate)");
    }

    const err = validatePhone(cleanPhone);
    if (err) {
      setPhoneError(err);
      return toast.error(err);
    }

    if (emergencyContacts.some((c) => sanitizeIndianPhoneNumber(c.phone) === cleanPhone)) {
      setPhoneError("This phone number is already added");
      return toast.error("This phone number is already in your emergency contacts");
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
    toast.success(`Added ${cleanName} to emergency contacts (${updated.length}/3)`);
  };

  const handleDelete = (index: number) => {
    triggerHaptic(10);
    const target = emergencyContacts[index];
    const updated = emergencyContacts.filter((_, i) => i !== index);
    saveEmergencyContacts(updated);
    toast.info(`Removed ${target?.name || "contact"}`);
  };

  const getTestMessage = () => {
    const senderName = profile?.display_name?.trim() ? profile.display_name.trim() : "your friend";
    return `This is a test from LOOP. If ${senderName} ever sends an SOS alert, you will receive it at this number.`;
  };

  const handleSendTestMessage = (contact: EmergencyContact, medium: "whatsapp" | "sms") => {
    triggerHaptic(12);
    const cleanPhone = sanitizeIndianPhoneNumber(contact.phone);
    const msg = getTestMessage();

    if (medium === "whatsapp") {
      const waUrl = `https://api.whatsapp.com/send?phone=91${cleanPhone}&text=${encodeURIComponent(msg)}`;
      window.open(waUrl, "_blank");
      toast.success(`Opening WhatsApp test alert for ${contact.name}`);
    } else {
      const isIOS = typeof navigator !== "undefined" && /iPad|iPhone|iPod/.test(navigator.userAgent);
      const smsUrl = isIOS
        ? `sms:+91${cleanPhone}&body=${encodeURIComponent(msg)}`
        : `sms:+91${cleanPhone}?body=${encodeURIComponent(msg)}`;
      window.location.href = smsUrl;
      toast.success(`Opening SMS test alert for ${contact.name}`);
    }
  };

  const isFormOpen = showAddForm || emergencyContacts.length === 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div
        className={`w-full max-w-sm max-h-[90vh] flex flex-col rounded-[28px] ${cardBg} border ${border} p-5 sm:p-6 shadow-2xl relative overflow-hidden animate-scale-up`}
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-red-500/15 border border-red-500/30 text-red-500 flex items-center justify-center shrink-0">
              <ShieldAlert size={22} strokeWidth={2.5} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight">Emergency Contacts</h2>
                <span className="text-[10px] font-black px-1.5 py-0.2 rounded-full bg-red-500/20 text-red-400">
                  {emergencyContacts.length}/3
                </span>
              </div>
              <p className={`text-[11px] font-medium ${mutedText}`}>Up to 3 trusted contacts for 1-tap SOS</p>
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

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto space-y-3.5 pr-0.5 min-h-0">
          {/* Safety Explanation Banner */}
          <div className="p-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-start gap-2.5">
            <HeartHandshake size={16} className="shrink-0 mt-0.5" />
            <p className="text-[11px] leading-relaxed">
              In an emergency, tapping the <strong className="text-red-300">SOS</strong> button packages your ride details and live GPS pinpoint to dispatch to your saved contacts.
            </p>
          </div>

          {/* Saved Contacts List */}
          {emergencyContacts.length > 0 && (
            <div className="space-y-2">
              <label className={`text-[10px] font-black uppercase tracking-wider block ${mutedText}`}>
                Saved Contacts ({emergencyContacts.length}/3)
              </label>
              <div className="space-y-2">
                {emergencyContacts.map((contact, idx) => (
                  <div
                    key={contact.id || idx}
                    className={`p-3 rounded-2xl border ${border} ${isDark ? "bg-white/5" : "bg-black/[0.03]"} space-y-2`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs sm:text-sm font-black truncate">{contact.name}</span>
                          {contact.relation && (
                            <span className={`text-[9px] font-black px-1.5 py-0.2 rounded-md shrink-0 ${
                              isDark ? "bg-white/10 text-zinc-300" : "bg-black/10 text-stone-700"
                            }`}>
                              {contact.relation}
                            </span>
                          )}
                        </div>
                        <p className="text-xs font-mono font-bold text-red-400 mt-0.5 flex items-center gap-1">
                          <Phone size={11} />
                          <span>+91 {contact.phone}</span>
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDelete(idx)}
                        aria-label={`Remove ${contact.name}`}
                        className="w-8 h-8 rounded-xl border border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white flex items-center justify-center transition-colors active:scale-90 shrink-0 cursor-pointer"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>

                    <div className="pt-2 border-t border-white/5 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setTestTargetContact(contact)}
                        className="flex-1 py-1.5 px-3 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-400 text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer shadow-xs"
                      >
                        <Send size={11} strokeWidth={2.5} />
                        <span>Send Test Message</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Add Contact Form or Trigger Button */}
          {emergencyContacts.length < 3 && (
            <div>
              {!isFormOpen ? (
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic(8);
                    setShowAddForm(true);
                  }}
                  className={`w-full py-2.5 rounded-xl border border-dashed ${border} hover:border-red-500/50 ${isDark ? "bg-white/5 hover:bg-white/10 text-zinc-300" : "bg-black/5 hover:bg-black/10 text-stone-700"} text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer`}
                >
                  <Plus size={15} />
                  <span>Add Emergency Contact ({emergencyContacts.length}/3)</span>
                </button>
              ) : (
                <form onSubmit={handleAdd} className={`p-3.5 rounded-2xl border ${border} ${isDark ? "bg-white/[0.03]" : "bg-black/[0.02]"} space-y-3`}>
                  <div className="flex items-center justify-between">
                    <span className={`text-[10px] font-black uppercase tracking-wider ${isDark ? "text-red-400" : "text-red-600"}`}>
                      New Emergency Contact ({emergencyContacts.length + 1}/3)
                    </span>
                    {emergencyContacts.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setShowAddForm(false)}
                        className="text-[10px] font-bold text-zinc-400 hover:underline cursor-pointer"
                      >
                        Cancel
                      </button>
                    )}
                  </div>

                  {/* Contact Name */}
                  <div className="space-y-1">
                    <label className={`text-[10px] font-bold uppercase tracking-wider block ${mutedText}`}>
                      Name / Person
                    </label>
                    <div className={`flex items-center gap-2 px-3 h-10 rounded-xl border ${border} ${isDark ? "bg-white/5" : "bg-black/5"}`}>
                      <User size={15} className={isDark ? "text-zinc-400" : "text-stone-500"} />
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Dad, Mom, Roommate"
                        maxLength={30}
                        className="flex-1 bg-transparent text-xs sm:text-sm font-bold outline-none placeholder:text-zinc-500"
                        autoFocus={emergencyContacts.length > 0}
                      />
                    </div>
                  </div>

                  {/* Relationship Chips */}
                  <div className="space-y-1">
                    <label className={`text-[10px] font-bold uppercase tracking-wider block ${mutedText}`}>
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
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
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
                    <div className="flex items-center justify-between">
                      <label className={`text-[10px] font-bold uppercase tracking-wider block ${mutedText}`}>
                        10-Digit Mobile / WhatsApp Number
                      </label>
                      <span className="text-[9px] font-mono text-zinc-400">Starts with 6, 7, 8, 9</span>
                    </div>
                    <div className={`flex items-center gap-2 px-3 h-10 rounded-xl border ${
                      phoneError ? "border-red-500/80 ring-1 ring-red-500/30" : border
                    } ${isDark ? "bg-white/5" : "bg-black/5"} transition-all`}>
                      <span className="text-xs font-black text-red-400">+91</span>
                      <Phone size={14} className={isDark ? "text-zinc-400" : "text-stone-500"} />
                      <input
                        type="tel"
                        inputMode="numeric"
                        value={phone}
                        onChange={handlePhoneChange}
                        onPaste={handlePhonePaste}
                        placeholder="9876543210"
                        maxLength={10}
                        className="flex-1 bg-transparent text-xs sm:text-sm font-mono font-bold outline-none placeholder:text-zinc-500 tracking-wider"
                      />
                    </div>
                    {phoneError && (
                      <p className="text-[11px] text-red-400 font-bold flex items-center gap-1.5 mt-1 animate-fade-in">
                        <AlertTriangle size={12} className="shrink-0 text-red-500" />
                        <span>{phoneError}</span>
                      </p>
                    )}
                  </div>

                  {/* Add button */}
                  <button
                    type="submit"
                    className="w-full h-12 rounded-2xl bg-red-600 hover:bg-red-700 text-white text-xs font-black uppercase tracking-wider shadow-md shadow-red-500/20 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Plus size={15} strokeWidth={2.6} />
                    <span>Save Contact ({emergencyContacts.length + 1}/3)</span>
                  </button>
                </form>
              )}
            </div>
          )}

          {emergencyContacts.length >= 3 && (
            <p className={`text-[11px] font-medium text-center ${mutedText} pt-1`}>
              Maximum of 3 emergency contacts reached. Delete a contact above to add another.
            </p>
          )}
        </div>

        {/* Done / Close footer */}
        <div className="pt-3 border-t border-white/10 shrink-0">
          <button
            type="button"
            onClick={() => setShowEmergencyContactModal(false)}
            className={`w-full h-12 rounded-2xl ${isDark ? "bg-white/10 hover:bg-white/15 text-white" : "bg-black/5 hover:bg-black/10 text-zinc-900"} text-xs font-black uppercase tracking-wider active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-1.5`}
          >
            <CheckCircle size={15} />
            <span>Done</span>
          </button>
        </div>

        {/* Test Message Dispatch Modal Sheet */}
        {testTargetContact && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
            <div className={`w-full max-w-xs rounded-[24px] ${cardBg} border ${border} p-5 space-y-3.5 shadow-2xl animate-scale-up`}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0">
                    <Send size={15} strokeWidth={2.5} />
                  </div>
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-wider text-emerald-400">Send Test Message</h3>
                    <p className={`text-[10px] ${mutedText}`}>Verify contact readiness</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setTestTargetContact(null)}
                  className="w-7 h-7 rounded-full border border-white/10 flex items-center justify-center text-zinc-400 hover:text-white"
                >
                  <X size={13} />
                </button>
              </div>

              <p className="text-[11px] leading-relaxed">
                Send a real test alert to <strong className="text-white">{testTargetContact.name}</strong> (+91 {testTargetContact.phone}):
              </p>

              <div className={`p-3 rounded-xl ${isDark ? "bg-black/40 border border-white/5" : "bg-black/[0.04] border border-black/5"} text-[10px] font-mono leading-relaxed`}>
                &ldquo;{getTestMessage()}&rdquo;
              </div>

              <div className="space-y-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    handleSendTestMessage(testTargetContact, "whatsapp");
                    setTestTargetContact(null);
                  }}
                  className="w-full h-11 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 active:scale-95 transition-all shadow-md shadow-emerald-600/20 cursor-pointer"
                >
                  <Send size={13} strokeWidth={2.5} />
                  <span>Send via WhatsApp</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleSendTestMessage(testTargetContact, "sms");
                    setTestTargetContact(null);
                  }}
                  className={`w-full h-10 rounded-xl border ${border} ${isDark ? "bg-white/5 hover:bg-white/10 text-white" : "bg-black/5 hover:bg-black/10 text-black"} text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer`}
                >
                  <MessageSquare size={13} />
                  <span>Send via SMS</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
