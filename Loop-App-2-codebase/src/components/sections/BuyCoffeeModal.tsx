"use client";

import React, { useState } from "react";
import { useLoop } from "@/lib/LoopContext";
import { X, Coffee, Copy, Check, ExternalLink, Heart, QrCode, Zap, ArrowRight } from "lucide-react";
import { toast } from "@/components/ui/NativeToast";
import { triggerHaptic } from "@/lib/haptics";

const UPI_ID = "8825680623@slc";
const CREATOR_NAME = "Sanjay Kamal";

const PRESET_AMOUNTS = [
  { amount: 20, label: "Chai" },
  { amount: 50, label: "Coffee", popular: true },
  { amount: 100, label: "Energy" },
  { amount: 200, label: "Meal" },
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

  const [activeTab, setActiveTab] = useState<"instant" | "qr">("instant");
  const [selectedAmount, setSelectedAmount] = useState<number>(50);
  const [customAmount, setCustomAmount] = useState<string>("");
  const [isCustom, setIsCustom] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const finalAmount = isCustom
    ? Math.max(1, parseInt(customAmount, 10) || 50)
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

  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=8&data=${encodeURIComponent(
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
    triggerHaptic(14);
    if (navigator.clipboard) {
      navigator.clipboard.writeText(UPI_ID).catch(() => {});
    }
    const url = getUpiUrl(pkg);
    window.location.href = url;
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
      <div
        className={`w-full max-w-sm ${
          isDark ? "bg-[#111113]" : "bg-[#FFFFFF]"
        } border ${border} rounded-[32px] p-5 sm:p-6 flex flex-col relative shadow-2xl animate-modal-scale-up`}
        role="dialog"
        aria-modal="true"
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between pb-3 shrink-0">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
              isDark ? "bg-[#FFC554]/15 text-[#FFC554]" : "bg-[#881337]/10 text-[#881337]"
            }`}>
              <Coffee size={16} strokeWidth={2.5} />
            </div>
            <div>
              <h2 className={`text-xs font-black uppercase tracking-wider ${isDark ? "text-white" : "text-zinc-900"}`}>
                Support LOOP
              </h2>
              <p className={`text-[10px] font-medium ${mutedText}`}>Keep servers fast & free for students</p>
            </div>
          </div>
          <button
            onClick={() => {
              triggerHaptic(8);
              onClose();
            }}
            aria-label="Close modal"
            className={`w-8 h-8 rounded-full ${
              isDark ? "bg-white/10 hover:bg-white/15 text-zinc-300" : "bg-black/5 hover:bg-black/10 text-zinc-700"
            } flex items-center justify-center active:scale-90 transition-transform cursor-pointer`}
          >
            <X size={15} />
          </button>
        </div>

        {/* Segmented Mode Switcher (Instant Pay vs Scan QR) */}
        <div className={`p-1 rounded-2xl ${isDark ? "bg-white/5" : "bg-black/5"} flex items-center gap-1 my-2`}>
          <button
            type="button"
            onClick={() => {
              triggerHaptic(8);
              setActiveTab("instant");
            }}
            className={`flex-1 py-1.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === "instant"
                ? isDark
                  ? "bg-[#FFC554] text-black shadow-sm font-black"
                  : "bg-[#881337] text-white shadow-sm font-black"
                : `${mutedText} hover:text-white`
            }`}
          >
            <Zap size={13} strokeWidth={2.5} />
            <span>Instant Pay</span>
          </button>
          <button
            type="button"
            onClick={() => {
              triggerHaptic(8);
              setActiveTab("qr");
            }}
            className={`flex-1 py-1.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === "qr"
                ? isDark
                  ? "bg-[#FFC554] text-black shadow-sm font-black"
                  : "bg-[#881337] text-white shadow-sm font-black"
                : `${mutedText} hover:text-white`
            }`}
          >
            <QrCode size={13} strokeWidth={2.5} />
            <span>Scan QR</span>
          </button>
        </div>

        {/* Amount Selector Row */}
        <div className="py-2 space-y-1.5">
          <div className="flex items-center justify-between px-0.5">
            <span className={`text-[10px] font-black uppercase tracking-wider ${mutedText}`}>
              Select Tip
            </span>
            {isCustom && (
              <button
                type="button"
                onClick={() => {
                  triggerHaptic(6);
                  setIsCustom(false);
                }}
                className="text-[10px] font-bold text-zinc-400 hover:text-white cursor-pointer"
              >
                Back to presets
              </button>
            )}
          </div>

          {!isCustom ? (
            <div className="grid grid-cols-5 gap-1.5">
              {PRESET_AMOUNTS.map((p) => {
                const isSelected = !isCustom && selectedAmount === p.amount;
                return (
                  <button
                    key={p.amount}
                    type="button"
                    onClick={() => {
                      triggerHaptic(8);
                      setSelectedAmount(p.amount);
                    }}
                    className={`py-2 rounded-xl text-center transition-all cursor-pointer border relative ${
                      isSelected
                        ? isDark
                          ? "bg-[#FFC554] border-[#FFC554] text-black font-black shadow-sm scale-[1.02]"
                          : "bg-[#881337] border-[#881337] text-white font-black shadow-sm scale-[1.02]"
                        : isDark
                        ? "bg-white/5 border-white/10 text-zinc-300 hover:bg-white/10"
                        : "bg-black/[0.03] border-black/10 text-zinc-800 hover:bg-black/5"
                    }`}
                  >
                    <span className="text-xs font-bold">₹{p.amount}</span>
                  </button>
                );
              })}

              {/* Custom amount trigger pill */}
              <button
                type="button"
                onClick={() => {
                  triggerHaptic(8);
                  setIsCustom(true);
                  setCustomAmount("");
                }}
                className={`py-2 rounded-xl text-center transition-all cursor-pointer border ${
                  isDark
                    ? "bg-white/5 border-white/10 text-zinc-400 hover:text-white hover:bg-white/10"
                    : "bg-black/[0.03] border-black/10 text-zinc-600 hover:bg-black/5"
                }`}
              >
                <span className="text-[11px] font-bold">+ More</span>
              </button>
            </div>
          ) : (
            <div className={`h-10 px-3.5 rounded-xl border ${border} ${cardBg} flex items-center gap-2 animate-fade-in`}>
              <span className={`text-sm font-black ${isDark ? "text-[#FFC554]" : "text-[#881337]"}`}>₹</span>
              <input
                type="number"
                min="1"
                max="10000"
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
                placeholder="Enter custom amount"
                className="w-full bg-transparent text-sm font-bold outline-none"
                autoFocus
              />
            </div>
          )}
        </div>

        {/* Tab Content: Instant Pay vs QR Code */}
        {activeTab === "instant" ? (
          <div className="pt-2 space-y-3 animate-fade-in">
            {/* Primary Action Button */}
            <a
              href={getUpiUrl()}
              onClick={() => handlePayClick()}
              className={`w-full h-12 rounded-2xl ${
                isDark ? "bg-[#FFC554] text-black shadow-[#FFC554]/20" : "bg-[#881337] text-white shadow-[#881337]/20"
              } font-black text-xs uppercase tracking-wider shadow-lg flex items-center justify-center gap-2 active:scale-[0.98] transition-transform cursor-pointer`}
            >
              <span>Pay ₹{finalAmount} with UPI</span>
              <ArrowRight size={15} strokeWidth={2.5} />
            </a>

            {/* Quick App Badges */}
            <div className="space-y-1">
              <span className={`text-[9px] font-black uppercase tracking-wider block text-center ${mutedText}`}>
                Or tap your preferred app
              </span>
              <div className="flex items-center justify-center gap-1.5">
                <a
                  href={getUpiUrl("com.google.android.apps.nbu.paisa.user")}
                  onClick={() => handlePayClick("com.google.android.apps.nbu.paisa.user")}
                  className={`flex-1 py-2 rounded-xl text-[10px] font-bold border ${border} ${cardBg} ${
                    isDark ? "hover:border-[#FFC554]/50 text-zinc-200" : "hover:border-[#881337]/50 text-zinc-800"
                  } active:scale-95 transition-all text-center flex items-center justify-center gap-1 cursor-pointer`}
                >
                  Google Pay
                </a>
                <a
                  href={getUpiUrl("com.phonepe.app")}
                  onClick={() => handlePayClick("com.phonepe.app")}
                  className={`flex-1 py-2 rounded-xl text-[10px] font-bold border ${border} ${cardBg} ${
                    isDark ? "hover:border-[#FFC554]/50 text-zinc-200" : "hover:border-[#881337]/50 text-zinc-800"
                  } active:scale-95 transition-all text-center flex items-center justify-center gap-1 cursor-pointer`}
                >
                  PhonePe
                </a>
                <a
                  href={getUpiUrl("net.one97.paytm")}
                  onClick={() => handlePayClick("net.one97.paytm")}
                  className={`flex-1 py-2 rounded-xl text-[10px] font-bold border ${border} ${cardBg} ${
                    isDark ? "hover:border-[#FFC554]/50 text-zinc-200" : "hover:border-[#881337]/50 text-zinc-800"
                  } active:scale-95 transition-all text-center flex items-center justify-center gap-1 cursor-pointer`}
                >
                  Paytm
                </a>
              </div>
            </div>
          </div>
        ) : (
          <div className="pt-2 flex flex-col items-center animate-fade-in">
            <div className="p-3 bg-white rounded-2xl shadow-xl border border-zinc-200 text-center">
              <img
                src={qrCodeUrl}
                alt="UPI QR Code"
                className="w-36 h-36 sm:w-40 sm:h-40 rounded-lg object-contain mx-auto"
                loading="eager"
              />
              <p className="text-[10px] font-black text-black mt-1.5 tracking-tight">
                Scan with any UPI app to pay ₹{finalAmount}
              </p>
            </div>
          </div>
        )}

        {/* Discreet UPI ID Copy Pill Footer */}
        <div className="pt-3.5 mt-1 border-t border-white/10 shrink-0">
          <div
            onClick={handleCopyUpi}
            className={`px-3 py-1.5 rounded-xl border ${border} ${
              isDark ? "bg-white/[0.02] hover:bg-white/[0.05]" : "bg-black/[0.02] hover:bg-black/[0.04]"
            } flex items-center justify-between cursor-pointer active:scale-[0.99] transition-all`}
          >
            <div className="flex items-center gap-1.5 min-w-0">
              <span className={`text-[9px] font-black uppercase ${mutedText}`}>UPI:</span>
              <span className={`text-[11px] font-mono font-bold truncate ${isDark ? "text-zinc-200" : "text-zinc-800"}`}>
                {UPI_ID}
              </span>
            </div>
            <button
              type="button"
              className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider flex items-center gap-1 shrink-0 ${
                copied
                  ? "bg-emerald-500/20 text-emerald-400"
                  : isDark
                  ? "text-[#FFC554]"
                  : "text-[#881337]"
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
