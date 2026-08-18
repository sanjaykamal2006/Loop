"use client";

import React, { useState, useEffect } from "react";
import { useLoop } from "@/lib/LoopContext";
import { supabase } from "@/lib/supabase";
import { toast } from "@/components/ui/NativeToast";
import { IndianRupee, X, Plus, MapPin, ArrowRight, Trash2, Info, Sparkles } from "lucide-react";
import type { ExpectedFare } from "@/lib/types";

export default function ExpectedFaresModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { session, theme } = useLoop();
  const { isDark, border, cardBg, mutedText, text } = theme;

  const [fares, setFares] = useState<ExpectedFare[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [fromLoc, setFromLoc] = useState("Campus");
  const [toLoc, setToLoc] = useState("");
  const [fareAmount, setFareAmount] = useState("");
  const [vType, setVType] = useState<"auto" | "bike" | "share_auto" | "cab">("auto");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
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

      if (error) {
        console.error(error);
      } else {
        setFares((data || []) as unknown as ExpectedFare[]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddFare = async () => {
    if (!toLoc.trim()) return toast.error("Destination is required");
    const num = parseInt(fareAmount);
    if (!fareAmount.trim() || isNaN(num) || num <= 0) return toast.error("Please enter a valid fare amount");

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
      setIsAdding(false);
      setFromLoc("Campus");
      setToLoc("");
      setFareAmount("");
      setVType("auto");
    } catch (err) {
      console.error(err);
      toast.error("Failed to add expected fare. Please try again.");
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-xl flex items-center justify-center p-4 animate-fade-in">
      <div 
        className={`w-full max-w-md max-h-[82vh] ${isDark ? "bg-[#121214]" : "bg-[#FFFFFF]"} border ${border} rounded-[32px] p-5 flex flex-col relative shadow-2xl overflow-hidden`}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#FFC554]/15 text-[#FFC554] flex items-center justify-center shrink-0">
              <IndianRupee size={17} strokeWidth={2.5} />
            </div>
            <div>
              <h2 className="text-base font-black uppercase tracking-tight">Expected Campus Fares</h2>
              <p className={`text-[10px] font-bold ${mutedText}`}>Community standard rate guide</p>
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

        {/* Experience Prompt & Add Button Banner */}
        <div className={`mt-3 p-3.5 ${isDark ? "bg-white/5" : "bg-black/5"} border ${border} rounded-[22px] space-y-2.5 shrink-0`}>
          <div className="flex items-center gap-2">
            <Sparkles size={14} className="text-[#FFC554] shrink-0" />
            <p className="text-xs font-bold leading-tight">
              Add an expected fare from <span className="text-[#FFC554]">A to B</span> based on your experience
            </p>
          </div>

          {!isAdding ? (
            <button
              onClick={() => setIsAdding(true)}
              className="w-full py-2.5 bg-[#FFC554] text-black font-black text-xs uppercase tracking-wider rounded-xl active:scale-[0.98] shadow-md flex items-center justify-center gap-1.5 transition-transform"
            >
              <Plus size={15} strokeWidth={3} />
              + Add Expected Fare
            </button>
          ) : (
            <div className="space-y-2.5 pt-1">
              {/* Vehicle Type Row */}
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { id: "auto", label: "Auto" },
                  { id: "bike", label: "Bike" },
                  { id: "share_auto", label: "Share Auto" },
                  { id: "cab", label: "Cab" }
                ].map(t => (
                  <button
                    key={t.id}
                    onClick={() => setVType(t.id as any)}
                    className={`py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${vType === t.id ? 'bg-[#FFC554] text-black shadow-sm' : `${isDark ? "bg-white/5" : "bg-black/5"} ${mutedText}`}`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Origin & Destination Inputs */}
              <div className="grid grid-cols-2 gap-2">
                <input
                  value={fromLoc}
                  onChange={e => setFromLoc(e.target.value)}
                  placeholder="From (e.g. Campus)"
                  className={`px-3 py-2 ${isDark ? "bg-white/5" : "bg-black/5"} border ${border} rounded-xl text-xs font-bold outline-none placeholder:opacity-40`}
                />
                <input
                  value={toLoc}
                  onChange={e => setToLoc(e.target.value)}
                  placeholder="To (e.g. Station)"
                  className={`px-3 py-2 ${isDark ? "bg-white/5" : "bg-black/5"} border ${border} rounded-xl text-xs font-bold outline-none placeholder:opacity-40`}
                />
              </div>

              {/* Amount Input & Actions */}
              <div className="flex items-center gap-2">
                <div className={`flex-1 flex items-center gap-1 px-3 py-2 ${isDark ? "bg-white/5" : "bg-black/5"} border ${border} rounded-xl`}>
                  <span className={`text-xs font-black ${mutedText}`}>₹</span>
                  <input
                    type="number"
                    value={fareAmount}
                    onChange={e => setFareAmount(e.target.value)}
                    placeholder="Expected Fare"
                    className="flex-1 bg-transparent text-xs font-bold outline-none placeholder:opacity-40"
                  />
                </div>
                <button
                  onClick={handleAddFare}
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-[#FFC554] text-black font-black text-xs uppercase tracking-wider rounded-xl active:scale-95 shadow-sm disabled:opacity-50"
                >
                  {isSubmitting ? "..." : "Save"}
                </button>
                <button
                  onClick={() => setIsAdding(false)}
                  className={`p-2 rounded-xl ${isDark ? "bg-white/5" : "bg-black/5"} text-xs font-bold active:scale-95`}
                >
                  <X size={15} />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Fares List - Scrollable */}
        <div className="flex-1 min-h-0 overflow-y-auto space-y-2.5 py-3 pr-1 scrollbar-hide">
          {loading ? (
            <p className={`text-center text-xs font-bold ${mutedText} py-8`}>Loading fares guide...</p>
          ) : fares.length === 0 ? (
            <div className="text-center py-8 space-y-1 opacity-60">
              <p className="text-xs font-black uppercase tracking-wider">No Expected Fares Yet</p>
              <p className={`text-[11px] ${mutedText}`}>Be the first to share a known route fare above!</p>
            </div>
          ) : (
            fares.map((f) => {
              const isOwner = f.user_id === session.user.id;
              return (
                <div 
                  key={f.id} 
                  className={`p-3 ${isDark ? "bg-white/5" : "bg-black/5"} border ${border} rounded-2xl flex items-center justify-between gap-2.5 shadow-sm`}
                >
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 text-xs font-bold">
                      <span className="truncate">{f.from_location}</span>
                      <ArrowRight size={11} className="shrink-0 opacity-40" />
                      <span className="truncate text-[#FFC554]">{f.to_location}</span>
                    </div>

                    <div className="flex items-center gap-2 text-[9px] font-bold opacity-60 uppercase tracking-wider">
                      <span>{f.vehicle_type || "Auto"}</span>
                      <span>•</span>
                      <span>By {isOwner ? "You" : f.profiles?.display_name || "Student"}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="px-2.5 py-1 rounded-full text-xs font-black text-[#FFC554] bg-[#FFC554]/10 border border-[#FFC554]/30 shadow-sm">
                      ₹{f.expected_fare}
                    </span>

                    {isOwner && (
                      <button
                        onClick={() => handleDeleteFare(f.id)}
                        aria-label="Delete fare"
                        className={`w-6 h-6 rounded-full ${isDark ? "bg-white/5" : "bg-black/5"} text-zinc-400 hover:text-red-400 flex items-center justify-center active:scale-90 transition-colors`}
                      >
                        <Trash2 size={11} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Close */}
        <div className="pt-2.5 border-t border-white/10 shrink-0">
          <button
            onClick={onClose}
            className={`w-full py-2.5 ${cardBg} border ${border} rounded-xl font-black text-xs uppercase tracking-wider active:scale-[0.98] transition-transform`}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
