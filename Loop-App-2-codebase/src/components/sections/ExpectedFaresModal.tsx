"use client";

import React, { useState, useEffect } from "react";
import { useLoop } from "@/lib/LoopContext";
import { supabase } from "@/lib/supabase";
import { toast } from "@/components/ui/NativeToast";
import { IndianRupee, X, Plus, MapPin, ArrowRight, Trash2, Sparkles, ArrowLeft, Search, Car } from "lucide-react";
import type { ExpectedFare } from "@/lib/types";

const AutoIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M19.5,9.5L18,6h-4.5L12,2H7C6.4,2,6,2.4,6,3v8H4v3h2v3c0,1.1,0.9,2,2,2s2-0.9,2-2h4c0,1.1,0.9,2,2,2s2-0.9,2-2h2v-6.5C20,10.2,19.8,9.8,19.5,9.5z M8,17c-0.6,0-1-0.4-1-1s0.4-1,1-1s1,0.4,1,1S8.6,17,8,17z M16,17c-0.6,0-1-0.4-1-1s0.4-1,1-1s1,0.4,1,1S16.6,17,16,17z M8,11V4h3.5l1.5,4H17l1,3H8z" />
  </svg>
);

const BikeIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M15.5,5.5c1.1,0,2-0.9,2-2s-0.9-2-2-2s-2,0.9-2,2S14.4,5.5,15.5,5.5z M5,12c-2.8,0-5,2.2-5,5s2.2,5,5,5s5-2.2,5-5S7.8,12,5,12z M5,20c-1.7,0-3-1.3-3-3s1.3-3,3-3s3,1.3,3,3S6.7,20,5,20z M19,12c-2.8,0-5,2.2-5,5s2.2,5,5,5s5-2.2,5-5S21.8,12,19,12z M19,20c-1.7,0-3-1.3-3-3s1.3-3,3-3s3,1.3,3,3S20.7,20,19,20z M11.2,7l-2-2H4v2h4l2,2l-2.9,3.1c-0.6-0.3-1.3-0.5-2.1-0.5v2c1,0,1.8,0.4,2.5,1.1L8.7,17h2.2l2.6-3.8L15,14v6h2v-7.3l-4.7-4.4l0.9-1.2C15.8,7.7,16.8,8,18,8V6C16.3,6,14.8,5.3,13.8,4.2L11.2,7z" />
  </svg>
);

const ShareAutoIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M20.5,9.5L19,5H5L3.5,9.5C3.2,9.8,3,10.2,3,10.5V17h2v3c0,1.1,0.9,2,2,2s2-0.9,2-2h6c0,1.1,0.9,2,2,2s2-0.9,2-2h2v-3h2V10.5C21,10.2,20.8,9.8,20.5,9.5z M7,19c-0.6,0-1-0.4-1-1s0.4-1,1-1s1,0.4,1,1S7.6,19,7,19z M17,19c-0.6,0-1-0.4-1-1s0.4-1,1-1s1,0.4,1,1S17.6,19,17,19z M19,15H5v-4h14V15z M5.5,9l1-3h11l1,3H5.5z" />
  </svg>
);

export default function ExpectedFaresModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { session, theme } = useLoop();
  const { isDark, border, cardBg, mutedText, text } = theme;

  const [viewMode, setViewMode] = useState<"list" | "add">("list");
  const [fares, setFares] = useState<ExpectedFare[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Form inputs
  const [fromLoc, setFromLoc] = useState("Campus");
  const [toLoc, setToLoc] = useState("");
  const [fareAmount, setFareAmount] = useState("");
  const [vType, setVType] = useState<"auto" | "bike" | "share_auto" | "cab">("auto");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setViewMode("list");
      fetchFares();
    }
  }, [isOpen]);

  const fetchFares = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("expected_fares")
        .select("id, user_id, from_location, to_location, expected_fare, vehicle_type, created_at, profiles:user_id(display_name, avatar_url)")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setFares((data || []) as unknown as ExpectedFare[]);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load expected fares");
    } finally {
      setLoading(false);
    }
  };

  const handleAddFare = async () => {
    if (!toLoc.trim()) return toast.error("Please enter a destination");
    const num = parseInt(fareAmount);
    if (!fareAmount.trim() || isNaN(num) || num <= 0) {
      return toast.error("Please enter a valid fare amount");
    }

    setIsSubmitting(true);
    try {
      const { data, error } = await supabase
        .from("expected_fares")
        .insert({
          user_id: session.user.id,
          from_location: fromLoc.trim() || "Campus",
          to_location: toLoc.trim(),
          expected_fare: num,
          vehicle_type: vType,
        })
        .select("id, user_id, from_location, to_location, expected_fare, vehicle_type, created_at, profiles:user_id(display_name, avatar_url)")
        .single();

      if (error) throw error;

      toast.success("Expected fare added!");
      setFares([data as unknown as ExpectedFare, ...fares]);
      setViewMode("list");
      setFromLoc("Campus");
      setToLoc("");
      setFareAmount("");
      setVType("auto");
    } catch (err) {
      console.error(err);
      toast.error("Failed to add fare. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteFare = async (id: string) => {
    try {
      const { error } = await supabase.from("expected_fares").delete().eq("id", id);
      if (error) throw error;
      toast.success("Fare entry removed");
      setFares(fares.filter(f => f.id !== id));
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete");
    }
  };

  const renderVehicleIcon = (type?: string, className = "w-4 h-4") => {
    switch (type) {
      case "bike": return <BikeIcon className={className} />;
      case "auto": return <AutoIcon className={className} />;
      case "share_auto": return <ShareAutoIcon className={className} />;
      default: return <Car className={className} />;
    }
  };

  if (!isOpen) return null;

  const filteredFares = fares.filter(f => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      f.from_location?.toLowerCase().includes(q) ||
      f.to_location?.toLowerCase().includes(q) ||
      f.vehicle_type?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-xl flex items-center justify-center p-4 animate-fade-in">
      <div 
        className={`w-full max-w-md max-h-[85vh] ${isDark ? "bg-[#121214]" : "bg-[#FFFFFF]"} border ${border} rounded-[32px] p-6 flex flex-col relative shadow-2xl overflow-hidden`}
      >
        {/* ================= VIEW 1: BROWSE FARES LIST ================= */}
        {viewMode === "list" && (
          <>
            {/* Header */}
            <div className="flex items-center justify-between pb-3.5 border-b border-white/10 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-2xl bg-[#FFC554]/15 text-[#FFC554] flex items-center justify-center shrink-0">
                  <IndianRupee size={18} strokeWidth={2.5} />
                </div>
                <div>
                  <h2 className="text-base font-black uppercase tracking-tight">Expected Fares</h2>
                  <p className={`text-[10px] font-bold ${mutedText}`}>Campus transport rate guide</p>
                </div>
              </div>
              <button
                onClick={onClose}
                aria-label="Close modal"
                className={`w-8 h-8 rounded-full ${isDark ? "bg-white/10" : "bg-black/5"} flex items-center justify-center active:scale-90 transition-transform`}
              >
                <X size={16} />
              </button>
            </div>

            {/* Experience Prompt Banner with Middle Add Button */}
            <div className={`my-3 p-4 ${isDark ? "bg-white/5" : "bg-black/5"} border ${border} rounded-[24px] space-y-3 text-center shrink-0`}>
              <div className="flex items-center justify-center gap-1.5 text-xs font-bold">
                <Sparkles size={14} className="text-[#FFC554]" />
                <span>Add an expected fare from <strong className="text-[#FFC554]">A to B</strong> based on your experience</span>
              </div>
              <button
                onClick={() => setViewMode("add")}
                className="w-full py-3 bg-[#FFC554] text-black font-black text-xs uppercase tracking-wider rounded-2xl active:scale-[0.98] shadow-md flex items-center justify-center gap-2 transition-transform"
              >
                <Plus size={16} strokeWidth={3} />
                + Add Expected Fare
              </button>
            </div>

            {/* Search filter if there are several fares */}
            {fares.length > 2 && (
              <div className="mb-2.5 shrink-0">
                <div className={`flex items-center gap-2.5 px-3.5 h-9 ${isDark ? "bg-white/5" : "bg-black/5"} border ${border} rounded-xl`}>
                  <Search size={13} className={mutedText} />
                  <input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search route (e.g. Station, Airport)..."
                    className="flex-1 bg-transparent text-xs font-bold outline-none placeholder:opacity-40"
                  />
                </div>
              </div>
            )}

            {/* Fares List - Scrollable */}
            <div className="flex-1 min-h-0 overflow-y-auto space-y-2.5 pr-1 pb-2 scrollbar-hide">
              {loading ? (
                <p className={`text-center text-xs font-bold ${mutedText} py-10`}>Loading expected fares...</p>
              ) : filteredFares.length === 0 ? (
                <div className="text-center py-10 space-y-1 opacity-60">
                  <p className="text-xs font-black uppercase tracking-wider">No Expected Fares Yet</p>
                  <p className={`text-[11px] ${mutedText}`}>Tap the button above to contribute standard campus rates.</p>
                </div>
              ) : (
                filteredFares.map((f) => {
                  const isOwner = f.user_id === session.user.id;
                  return (
                    <div 
                      key={f.id} 
                      className={`p-3.5 ${isDark ? "bg-white/5" : "bg-black/5"} border ${border} rounded-2xl flex items-center justify-between gap-3 shadow-sm`}
                    >
                      <div className="space-y-1.5 min-w-0 flex-1">
                        <div className="flex items-center gap-2 text-xs font-black">
                          <MapPin size={12} className="text-[#FFC554] shrink-0" />
                          <span className="truncate">{f.from_location}</span>
                          <ArrowRight size={11} className="shrink-0 opacity-40" />
                          <span className="truncate text-[#FFC554]">{f.to_location}</span>
                        </div>

                        <div className="flex items-center gap-2 text-[10px] font-bold opacity-60 uppercase tracking-wider">
                          <div className="flex items-center gap-1">
                            {renderVehicleIcon(f.vehicle_type, "w-3 h-3 text-[#FFC554]")}
                            <span>{f.vehicle_type || "Auto"}</span>
                          </div>
                          <span>•</span>
                          <span>By {isOwner ? "You" : f.profiles?.display_name || "Student"}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="px-3 py-1 rounded-full text-xs font-black text-[#FFC554] bg-[#FFC554]/10 border border-[#FFC554]/30 shadow-sm">
                          ₹{f.expected_fare}
                        </span>

                        {isOwner && (
                          <button
                            onClick={() => handleDeleteFare(f.id)}
                            aria-label="Delete fare"
                            className={`w-7 h-7 rounded-full ${isDark ? "bg-white/10" : "bg-black/5"} text-zinc-400 hover:text-red-400 flex items-center justify-center active:scale-90 transition-colors`}
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="pt-3 border-t border-white/10 shrink-0">
              <button
                onClick={onClose}
                className={`w-full py-3 ${cardBg} border ${border} rounded-2xl font-black text-xs uppercase tracking-wider active:scale-[0.98] transition-transform`}
              >
                Close
              </button>
            </div>
          </>
        )}

        {/* ================= VIEW 2: DEDICATED ADD FARE SCREEN ================= */}
        {viewMode === "add" && (
          <div className="space-y-4">
            {/* Header with Back button */}
            <div className="flex items-center justify-between pb-3 border-b border-white/10 shrink-0">
              <div className="flex items-center gap-2.5">
                <button
                  onClick={() => setViewMode("list")}
                  aria-label="Back to fares list"
                  className={`w-8 h-8 rounded-full ${isDark ? "bg-white/10" : "bg-black/5"} flex items-center justify-center active:scale-90 transition-transform`}
                >
                  <ArrowLeft size={16} />
                </button>
                <div>
                  <h2 className="text-base font-black uppercase tracking-tight">Add Expected Fare</h2>
                  <p className={`text-[10px] font-bold ${mutedText}`}>Share your travel route experience</p>
                </div>
              </div>
              <button
                onClick={onClose}
                aria-label="Close modal"
                className={`w-8 h-8 rounded-full ${isDark ? "bg-white/10" : "bg-black/5"} flex items-center justify-center active:scale-90 transition-transform`}
              >
                <X size={16} />
              </button>
            </div>

            {/* Vehicle Type Selection */}
            <div className="space-y-1.5">
              <label className={`text-[10px] font-black ${mutedText} uppercase tracking-wider`}>Vehicle Type</label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { id: "auto", label: "Auto", icon: AutoIcon },
                  { id: "bike", label: "Bike", icon: BikeIcon },
                  { id: "share_auto", label: "Share Auto", icon: ShareAutoIcon },
                  { id: "cab", label: "Cab", icon: Car }
                ].map(t => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setVType(t.id as any)}
                    className={`flex flex-col items-center justify-center py-3 gap-1 rounded-2xl border transition-all ${
                      vType === t.id
                        ? "bg-[#FFC554] border-[#FFC554] text-black shadow-md font-black"
                        : `${isDark ? "bg-white/5" : "bg-black/5"} border-transparent ${mutedText}`
                    }`}
                  >
                    <t.icon className="w-5 h-5" />
                    <span className="text-[10px] font-black uppercase tracking-tight leading-none mt-0.5">{t.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* From Location */}
            <div className="space-y-1.5">
              <label className={`text-[10px] font-black ${mutedText} uppercase tracking-wider`}>From (Origin)</label>
              <div className={`flex items-center gap-2.5 px-3.5 py-3 ${isDark ? "bg-white/5" : "bg-black/5"} border ${border} rounded-2xl`}>
                <MapPin size={16} className={mutedText} />
                <input
                  value={fromLoc}
                  onChange={(e) => setFromLoc(e.target.value)}
                  placeholder="e.g. Campus / Main Gate"
                  className="flex-1 bg-transparent text-xs font-bold outline-none placeholder:opacity-40"
                />
              </div>
            </div>

            {/* To Destination */}
            <div className="space-y-1.5">
              <label className={`text-[10px] font-black ${mutedText} uppercase tracking-wider`}>To (Destination)</label>
              <div className={`flex items-center gap-2.5 px-3.5 py-3 ${isDark ? "bg-white/5" : "bg-black/5"} border ${border} rounded-2xl`}>
                <MapPin size={16} className="text-[#FFC554]" />
                <input
                  value={toLoc}
                  onChange={(e) => setToLoc(e.target.value)}
                  placeholder="e.g. Railway Station / Airport"
                  className="flex-1 bg-transparent text-xs font-bold outline-none placeholder:opacity-40"
                />
              </div>
            </div>

            {/* Expected Fare Amount */}
            <div className="space-y-1.5">
              <label className={`text-[10px] font-black ${mutedText} uppercase tracking-wider`}>Expected Fare (₹)</label>
              <div className={`flex items-center gap-2 px-3.5 py-3 ${isDark ? "bg-white/5" : "bg-black/5"} border ${border} rounded-2xl`}>
                <span className="text-sm font-black text-[#FFC554]">₹</span>
                <input
                  type="number"
                  value={fareAmount}
                  onChange={(e) => setFareAmount(e.target.value)}
                  placeholder="e.g. 150 (standard rate)"
                  className="flex-1 bg-transparent text-xs font-bold outline-none placeholder:opacity-40"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-2 space-y-2">
              <button
                onClick={handleAddFare}
                disabled={isSubmitting}
                className="w-full py-3.5 bg-[#FFC554] text-black font-black text-xs uppercase tracking-wider rounded-2xl active:scale-[0.98] shadow-lg disabled:opacity-50 transition-transform"
              >
                {isSubmitting ? "Saving..." : "Save Expected Fare"}
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`w-full py-3 ${cardBg} border ${border} rounded-2xl font-black text-xs uppercase tracking-wider active:scale-[0.98] transition-transform`}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
