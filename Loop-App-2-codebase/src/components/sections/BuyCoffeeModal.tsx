"use client";

import React, { useState } from "react";
import { useLoop } from "@/lib/LoopContext";
import { X, Coffee, Copy, Check, ExternalLink, Heart, QrCode } from "lucide-react";
import { toast } from "@/components/ui/NativeToast";
import { triggerHaptic } from "@/lib/haptics";

const UPI_ID = "8825680623@slc";
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
  const [showQr, setShowQr] = useState(false);

  if (!isOpen) return null;

  const finalAmount = isCustom
    ? Math.max(1, parseInt(customAmount) || 50)
    : selectedAmount;

  // IMPORTANT: The '@' symbol in the UPI ID MUST NEVER be URL-encoded (no %40),
  // as UPI apps validate the VPA with a regex requiring literal '@'.
  const getUpiUrl = (androidPackage?: string) => {
    const isAndroid =
      typeof navigator !== "undefined" && /android/i.test(navigator.userAgent);
    const baseParams = `pa=${UPI_ID}&pn=Sanjay%20Kamal&am=${finalAmount}&cu=INR`;

    if (isAndroid && androidPackage) {
      return `intent://pay?${baseParams}#Intent;scheme=upi;package=${androidPackage};end`;
    }
    return `upi://pay?${baseParams}`;
  };

  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&margin=8&data=${encodeURIComponent(
    `upi://pay?pa=${UPI_ID}&pn=Sanjay Kamal&am=${finalAmount}&cu=INR`
  )}`;

  const handleCopyUpi = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    triggerHaptic(10);
    if (navigator.clipboard) {
      navigator.clipboard.writeText(UPI_ID);
      setCopied(true);
      toast.success(`UPI ID copied: ${UPI_ID}`);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handlePayClick = (pkg?: string) => {
    triggerHaptic(15);
    if (navigator.clipboard) {
      navigator.clipboard.writeText(UPI_ID).catch(() => {});
    }
    const url = getUpiUrl(pkg);
    window.location.href = url;
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
              Buy Creator a Coffee
            </h3>
            <p className={`text-[11px] font-medium ${mutedText} mt-0.5 max-w-[260px] leading-relaxed`}>
              LOOP is built by <span className="font-bold text-[#FFC554]">Sanjay Kamal</span> (VIT-AP). Tips keep servers fast & free!
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

          {/* Primary Instant Pay Button */}
          <div className="space-y-2 pt-1">
            <a
              href={getUpiUrl()}
              onClick={() => handlePayClick()}
              className="w-full py-3.5 px-4 rounded-2xl bg-[#FFC554] text-black font-black text-xs uppercase tracking-wider shadow-lg flex items-center justify-center gap-2 active:scale-[0.98] transition-transform cursor-pointer"
            >
              <span>Pay ₹{finalAmount} Now</span>
              <ExternalLink size={14} strokeWidth={2.5} />
            </a>

            {/* Direct App Buttons Row */}
            <div className="flex items-center justify-center gap-2">
              <a
                href={getUpiUrl("com.google.android.apps.nbu.paisa.user")}
                onClick={() => handlePayClick("com.google.android.apps.nbu.paisa.user")}
                className={`flex-1 py-2.5 px-2 rounded-xl text-[10px] font-black border ${border} ${cardBg} hover:border-[#FFC554]/40 active:scale-95 transition-all text-center flex items-center justify-center gap-1 cursor-pointer ${
                  isDark ? "text-white" : "text-zinc-900"
                }`}
              >
                Google Pay
              </a>
              <a
                href={getUpiUrl("com.phonepe.app")}
                onClick={() => handlePayClick("com.phonepe.app")}
                className={`flex-1 py-2.5 px-2 rounded-xl text-[10px] font-black border ${border} ${cardBg} hover:border-[#FFC554]/40 active:scale-95 transition-all text-center flex items-center justify-center gap-1 cursor-pointer ${
                  isDark ? "text-white" : "text-zinc-900"
                }`}
              >
                PhonePe
              </a>
              <a
                href={getUpiUrl("net.one97.paytm")}
                onClick={() => handlePayClick("net.one97.paytm")}
                className={`flex-1 py-2.5 px-2 rounded-xl text-[10px] font-black border ${border} ${cardBg} hover:border-[#FFC554]/40 active:scale-95 transition-all text-center flex items-center justify-center gap-1 cursor-pointer ${
                  isDark ? "text-white" : "text-zinc-900"
                }`}
              >
                Paytm
              </a>
            </div>
          </div>

          {/* Toggle QR Code */}
          <div className="pt-1">
            <button
              type="button"
              onClick={() => {
                triggerHaptic(5);
                setShowQr(!showQr);
              }}
              className={`text-xs font-bold flex items-center justify-center gap-1.5 mx-auto ${mutedText} hover:text-[#FFC554] transition-colors cursor-pointer`}
            >
              <QrCode size={13} />
              <span>{showQr ? "Hide QR Code" : "Show QR Code to Scan"}</span>
            </button>

            {showQr && (
              <div className="pt-2 flex flex-col items-center animate-fade-in">
                <div className="p-3 bg-white rounded-2xl shadow-xl border border-zinc-200">
                  <img
                    src={qrCodeUrl}
                    alt="UPI QR Code"
                    className="w-44 h-44 rounded-lg object-contain"
                    loading="eager"
                  />
                  <p className="text-[10px] font-black text-black mt-1.5">
                    Scan with any UPI app to pay ₹{finalAmount}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* UPI ID Info Bar */}
          <div
            onClick={handleCopyUpi}
            className={`p-2 rounded-xl border ${border} ${
              isDark ? "bg-white/[0.03]" : "bg-black/[0.03]"
            } flex items-center justify-between cursor-pointer active:scale-[0.99] transition-all`}
          >
            <div className="text-left min-w-0">
              <span className={`text-[8px] font-black uppercase tracking-wider ${mutedText}`}>
                UPI ID (Sanjay Kamal)
              </span>
              <p className={`text-[11px] font-black font-mono truncate ${isDark ? "text-white" : "text-zinc-900"}`}>
                {UPI_ID}
              </p>
            </div>
            <button
              type="button"
              className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider flex items-center gap-1 shrink-0 ${
                copied
                  ? "bg-emerald-500/20 text-emerald-400"
                  : isDark
                  ? "bg-white/10 text-[#FFC554]"
                  : "bg-black/5 text-[#B45309]"
              }`}
            >
              {copied ? <Check size={10} strokeWidth={3} /> : <Copy size={10} strokeWidth={2.5} />}
              <span>{copied ? "Copied" : "Copy"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
