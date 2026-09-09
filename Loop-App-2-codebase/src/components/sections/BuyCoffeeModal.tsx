"use client";

import React, { useState } from "react";
import { useLoop } from "@/lib/LoopContext";
import { X, Coffee, Copy, Check, ExternalLink, Heart, QrCode, Smartphone, Info } from "lucide-react";
import { toast } from "@/components/ui/NativeToast";
import { triggerHaptic } from "@/lib/haptics";

const UPI_ID = "8825680623@slice";
const CREATOR_NAME = "Sanjay Kamal";

const PRESET_AMOUNTS = [
  { amount: 20, label: "Chai", emoji: "☕" },
  { amount: 50, label: "Coffee", emoji: "🧋", popular: true },
  { amount: 100, label: "Energy", emoji: "⚡" },
  { amount: 200, label: "Meal", emoji: "🍕" },
];

export default function BuyCoffeeModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const { theme } = useLoop();
  const { isDark, border, cardBg, mutedText } = theme;

  const [selectedAmount, setSelectedAmount] = useState<number>(50);
  const [customAmount, setCustomAmount] = useState<string>("");
  const [isCustom, setIsCustom] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<"pay" | "qr">("pay");

  if (!isOpen) return null;

  const finalAmount = isCustom
    ? Math.max(1, parseInt(customAmount) || 50)
    : selectedAmount;

  // Build clean P2P UPI link (omitting merchant parameters prevents the "No registered account" banking error on personal Slice VPAs)
  const buildCleanUpiUrl = () => {
    return `upi://pay?pa=${encodeURIComponent(UPI_ID)}&pn=${encodeURIComponent(CREATOR_NAME)}&cu=INR`;
  };

  // QR code image URL (uses QR Server API, margin 8, size 260x260)
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&margin=8&data=${encodeURIComponent(
    `upi://pay?pa=${UPI_ID}&pn=${encodeURIComponent(CREATOR_NAME)}&am=${finalAmount}&cu=INR`
  )}`;

  const handleCopyUpi = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    triggerHaptic(10);
    if (navigator.clipboard) {
      navigator.clipboard.writeText(UPI_ID);
      setCopied(true);
      toast.success("UPI ID copied: 8825680623@slice");
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handlePayViaApp = () => {
    triggerHaptic(15);
    
    // Always copy UPI ID to clipboard as immediate fail-safe
    if (navigator.clipboard) {
      navigator.clipboard.writeText(UPI_ID);
    }

    // Launch standard P2P intent
    const cleanUrl = buildCleanUpiUrl();
    window.location.href = cleanUrl;

    toast.info("Opening UPI app... (UPI ID copied to clipboard 📋)");
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-xl flex items-center justify-center p-4 animate-fade-in">
      <div
        className={`w-full max-w-sm ${
          isDark ? "bg-[#121214]" : "bg-[#FFFFFF]"
        } border ${border} rounded-[32px] p-5 flex flex-col relative shadow-2xl overflow-y-auto max-h-[92vh] scrollbar-hide`}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-amber-500/15 flex items-center justify-center text-[#FFC554]">
              <Coffee size={15} strokeWidth={2.5} />
            </div>
            <h2 className="text-xs font-black uppercase tracking-widest text-[#FFC554]">
              Support Creator
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close modal"
            className={`w-8 h-8 rounded-full ${
              isDark ? "bg-white/10 hover:bg-white/15" : "bg-black/5 hover:bg-black/10"
            } flex items-center justify-center active:scale-90 transition-transform cursor-pointer`}
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="py-3.5 space-y-3.5 text-center">
          {/* Creator Mini Hero */}
          <div className="flex flex-col items-center">
            <div className="relative">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-[#FFC554] shadow-lg">
                <Coffee size={28} strokeWidth={2.2} />
              </div>
              <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-[#FFC554] text-black flex items-center justify-center shadow-md">
                <Heart size={11} fill="currentColor" />
              </div>
            </div>

            <h3 className={`text-base font-black mt-2.5 ${isDark ? "text-white" : "text-zinc-900"}`}>
              Buy Creator a Coffee ☕
            </h3>
            <p className={`text-[11px] font-medium ${mutedText} mt-0.5 max-w-[260px] leading-relaxed`}>
              LOOP is built by <span className="font-bold text-[#FFC554]">Sanjay Kamal</span> (VIT-AP). Tips keep servers lightning fast!
            </p>
          </div>

          {/* Amount Selection Chips */}
          <div className="space-y-1.5 text-left">
            <label className={`text-[10px] font-black uppercase tracking-wider ${mutedText} ml-1`}>
              Select Amount
            </label>
            <div className="grid grid-cols-4 gap-2">
              {PRESET_AMOUNTS.map((p) => {
                const isSelected = !isCustom && selectedAmount === p.amount;
                return (
                  <button
                    key={p.amount}
                    type="button"
                    onClick={() => {
                      triggerHaptic(8);
                      setIsCustom(false);
                      setSelectedAmount(p.amount);
                    }}
                    className={`py-2 px-1 rounded-2xl border text-center transition-all cursor-pointer relative ${
                      isSelected
                        ? "bg-[#FFC554] border-[#FFC554] text-black shadow-md scale-[1.02]"
                        : isDark
                        ? "bg-white/5 border-white/10 text-white hover:bg-white/10"
                        : "bg-black/5 border-black/10 text-zinc-900 hover:bg-black/10"
                    }`}
                  >
                    <div className="text-xs">{p.emoji}</div>
                    <div className="text-xs font-black">₹{p.amount}</div>
                    {p.popular && !isSelected && (
                      <span className="absolute -top-1.5 left-1/2 -translate-x-1/2 text-[7px] font-black uppercase px-1 rounded bg-[#FFC554] text-black shadow-xs">
                        Popular
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Custom Amount Input Toggle */}
            <div className="pt-0.5">
              {isCustom ? (
                <div className="flex items-center gap-2">
                  <div className={`flex-1 h-9 px-3 rounded-xl border ${border} ${cardBg} flex items-center gap-1.5`}>
                    <span className="text-xs font-black text-[#FFC554]">₹</span>
                    <input
                      type="number"
                      min="1"
                      value={customAmount}
                      onChange={(e) => setCustomAmount(e.target.value)}
                      placeholder="Enter amount"
                      className="w-full bg-transparent text-xs font-bold outline-none"
                      autoFocus
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsCustom(false)}
                    className="text-xs font-bold text-zinc-400 hover:text-white px-2 cursor-pointer"
                  >
                    Presets
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setIsCustom(true);
                    setCustomAmount("");
                  }}
                  className={`text-[11px] font-bold ${mutedText} hover:underline ml-1 cursor-pointer`}
                >
                  + Custom amount
                </button>
              )}
            </div>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="flex items-center p-1 rounded-2xl bg-white/5 border border-white/10">
            <button
              type="button"
              onClick={() => {
                triggerHaptic(5);
                setActiveTab("pay");
              }}
              className={`flex-1 py-1.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeTab === "pay"
                  ? "bg-[#FFC554] text-black font-black shadow-sm"
                  : mutedText
              }`}
            >
              <Smartphone size={13} />
              <span>UPI App</span>
            </button>
            <button
              type="button"
              onClick={() => {
                triggerHaptic(5);
                setActiveTab("qr");
              }}
              className={`flex-1 py-1.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeTab === "qr"
                  ? "bg-[#FFC554] text-black font-black shadow-sm"
                  : mutedText
              }`}
            >
              <QrCode size={13} />
              <span>Scan QR Code</span>
            </button>
          </div>

          {/* Tab 1: UPI App Intent */}
          {activeTab === "pay" && (
            <div className="space-y-3 pt-1">
              <button
                type="button"
                onClick={handlePayViaApp}
                className="w-full py-3.5 px-4 rounded-2xl bg-[#FFC554] text-black font-black text-xs uppercase tracking-wider shadow-lg flex items-center justify-center gap-2 active:scale-[0.98] transition-transform cursor-pointer"
              >
                <span>Pay ₹{finalAmount} via UPI App</span>
                <ExternalLink size={14} strokeWidth={2.5} />
              </button>

              <p className={`text-[10px] ${mutedText} leading-relaxed text-center px-1`}>
                Launches Google Pay, PhonePe, Paytm, or Slice. We automatically copy the UPI ID as a backup.
              </p>
            </div>
          )}

          {/* Tab 2: Scannable QR Code */}
          {activeTab === "qr" && (
            <div className="space-y-3 pt-1 flex flex-col items-center">
              {/* High-contrast crisp white QR card */}
              <div className="p-3 bg-white rounded-2xl shadow-xl flex flex-col items-center border border-zinc-200">
                <img
                  src={qrCodeUrl}
                  alt="UPI QR Code"
                  className="w-48 h-48 rounded-lg object-contain"
                  loading="eager"
                />
                <div className="mt-2 text-center">
                  <p className="text-[11px] font-black text-black">Scan to Pay ₹{finalAmount}</p>
                  <p className="text-[9px] font-bold text-zinc-600">Sanjay Kamal • 8825680623@slice</p>
                </div>
              </div>

              <p className={`text-[10px] ${mutedText} leading-relaxed text-center px-2`}>
                Scan with any UPI app scanner, or screenshot this QR and open it via <span className="font-bold">"Scan from Gallery"</span>.
              </p>
            </div>
          )}

          {/* UPI ID Copy Box (Always Visible) */}
          <div
            onClick={handleCopyUpi}
            className={`p-2.5 rounded-2xl border ${border} ${
              isDark ? "bg-white/[0.04]" : "bg-black/[0.04]"
            } flex items-center justify-between cursor-pointer active:scale-[0.99] transition-all hover:border-[#FFC554]/40`}
          >
            <div className="text-left min-w-0">
              <span className={`text-[9px] font-black uppercase tracking-wider ${mutedText}`}>
                UPI ID (Sanjay Kamal)
              </span>
              <p className={`text-xs font-black font-mono truncate ${isDark ? "text-white" : "text-zinc-900"}`}>
                {UPI_ID}
              </p>
            </div>
            <button
              type="button"
              className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shrink-0 ${
                copied
                  ? "bg-emerald-500/20 text-emerald-400"
                  : isDark
                  ? "bg-white/10 text-[#FFC554]"
                  : "bg-black/5 text-[#B45309]"
              }`}
            >
              {copied ? <Check size={11} strokeWidth={3} /> : <Copy size={11} strokeWidth={2.5} />}
              <span>{copied ? "Copied!" : "Copy"}</span>
            </button>
          </div>

          {/* Info helper note explaining P2P resolution */}
          <div className={`p-2.5 rounded-xl ${isDark ? "bg-amber-500/10 border-amber-500/20 text-amber-300" : "bg-amber-50 border-amber-200 text-amber-900"} border text-left flex items-start gap-2`}>
            <Info size={14} className="shrink-0 mt-0.5" />
            <p className="text-[10px] leading-relaxed">
              <span className="font-bold">Troubleshooting tip:</span> If your bank app shows <span className="italic">"No registered account"</span>, simply tap <span className="font-bold">Copy</span> above, open your UPI app, and paste into <span className="font-bold">"Pay to UPI ID"</span>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
