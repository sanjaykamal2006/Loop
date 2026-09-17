"use client";

import React, { useState, useEffect } from "react";
import { useLoop } from "@/lib/LoopContext";
import { supabase } from "@/lib/supabase";
import { toast } from "@/components/ui/NativeToast";
import { IndianRupee, X, Plus, MapPin, ArrowRight, Trash2, Sparkles, ArrowLeft, Search, Car } from "lucide-react";
import type { ExpectedFare } from "@/lib/types";
import { VehicleTypeIcon, AutoIcon, BikeIcon, ShareAutoIcon, CarIcon } from "@/components/ui/VehicleIcons";



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
    return <VehicleTypeIcon vehicleType={type} size={14} className={className} strokeWidth={2.2} />;
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
                <div className={`w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 ${
                  isDark ? "bg-[#FFC554]/15 text-[#FFC554]" : "bg-[#881337]/10 text-[#881337]"
                }`}>
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
                <Sparkles size={14} className={isDark ? "text-[#FFC554]" : "text-[#881337]"} />
                <span>Add an expected fare from <strong className={isDark ? "text-[#FFC554]" : "text-[#881337]"}>A to B</strong> based on your experience</span>
              </div>
              <button
                onClick={() => setViewMode("add")}
                className={`w-full py-3 ${
                  isDark ? "bg-[#FFC554] text-black shadow-[#FFC554]/10" : "bg-[#881337] text-white shadow-[#881337]/20"
                } font-black text-xs uppercase tracking-wider rounded-2xl active:scale-[0.98] shadow-md flex items-center justify-center gap-2 transition-transform`}
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
                          <MapPin size={12} className={`shrink-0 ${isDark ? "text-[#FFC554]" : "text-[#881337]"}`} />
                          <span className="truncate">{f.from_location}</span>
                          <ArrowRight size={11} className="shrink-0 opacity-40" />
                          <span className={`truncate ${isDark ? "text-[#FFC554]" : "text-[#881337]"}`}>{f.to_location}</span>
                        </div>

                        <div className="flex items-center gap-2 text-[10px] font-bold opacity-60 uppercase tracking-wider">
                          <div className="flex items-center gap-1">
                            {renderVehicleIcon(f.vehicle_type, `w-3 h-3 ${isDark ? "text-[#FFC554]" : "text-[#881337]"}`)}
                            <span>{f.vehicle_type || "Auto"}</span>
                          </div>
                          <span>•</span>
                          <span>By {isOwner ? "You" : f.profiles?.display_name || "Student"}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`px-3 py-1 rounded-full text-xs font-black shadow-sm ${
                          isDark
                            ? "text-[#FFC554] bg-[#FFC554]/10 border border-[#FFC554]/30"
                            : "text-[#881337] bg-[#881337]/10 border border-[#881337]/25"
                        }`}>
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
                  { id: "cab", label: "Cab", icon: CarIcon }
                ].map(t => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setVType(t.id as any)}
                    className={`flex flex-col items-center justify-center py-3 gap-1 rounded-2xl border transition-all ${
                      vType === t.id
                        ? isDark
                          ? "bg-[#FFC554] border-[#FFC554] text-black shadow-md font-black"
                          : "bg-[#881337] border-[#881337] text-white shadow-md font-black"
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
                <MapPin size={16} className={isDark ? "text-[#FFC554]" : "text-[#881337]"} />
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
                <span className={`text-sm font-black ${isDark ? "text-[#FFC554]" : "text-[#881337]"}`}>₹</span>
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
                className={`w-full py-3.5 ${
                  isDark
                    ? "bg-[#FFC554] text-black shadow-[#FFC554]/10"
                    : "bg-[#881337] text-white shadow-[#881337]/20"
                } font-black text-xs uppercase tracking-wider rounded-2xl active:scale-[0.98] shadow-lg disabled:opacity-50 transition-transform`}
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
