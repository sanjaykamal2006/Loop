"use client";

import React, { useState, useEffect } from "react";
import { useLoop } from "@/lib/LoopContext";
import { supabase } from "@/lib/supabase";
import { toast } from "@/components/ui/NativeToast";
import { Plus, X, Phone, User, Info, ArrowLeft, ShieldCheck, IndianRupee } from "lucide-react";
import type { TrustedVehicle } from "@/lib/types";
import ExpectedFaresModal from "./ExpectedFaresModal";
import { VehicleTypeIcon, AutoIcon, BikeIcon, ShareAutoIcon } from "@/components/ui/VehicleIcons";



export default function TrustedVehiclesView() {
  const { session, theme, setView } = useLoop();
  const { isDark, cardBg, border, mutedText, text } = theme;

  const [vehicles, setVehicles] = useState<TrustedVehicle[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [showFaresModal, setShowFaresModal] = useState(false);
  const [loading, setLoading] = useState(true);


  // Form State
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [type, setType] = useState<"bike" | "auto" | "share_auto" | "">("");

  const myVehiclesCount = vehicles.filter(v => v.user_id === session.user.id).length;
  const canAdd = myVehiclesCount < 5;

  useEffect(() => {
    fetchVehicles();
  }, []);

  const fetchVehicles = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("trusted_vehicles")
      .select("id, user_id, driver_name, phone_number, vehicle_type, created_at, profiles:user_id(display_name, avatar_url)")
      .order("created_at", { ascending: false });

    if (error) toast.error("Failed to fetch drivers");
    else setVehicles((data || []) as unknown as TrustedVehicle[]);
    setLoading(false);
  };

  const handleAdd = async () => {
    if (!canAdd) {
      toast.error("You can only add up to 5 trusted drivers.");
      return;
    }
    if (!name.trim() || !phone.trim() || !type) {
      toast.error("Please fill all fields.");
      return;
    }

    const { data, error } = await supabase
      .from("trusted_vehicles")
      .insert({
        user_id: session.user.id,
        driver_name: name.trim(),
        phone_number: phone.trim(),
        vehicle_type: type
      })
      .select("id, user_id, driver_name, phone_number, vehicle_type, created_at, profiles:user_id(display_name, avatar_url)")
      .single();

    if (error) {
      toast.error("Failed to add driver. Please try again.");
    } else {
      toast.success("Driver added!");
      setVehicles([data as unknown as TrustedVehicle, ...vehicles]);
      setIsAdding(false);
      setName("");
      setPhone("");
      setType("");
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("trusted_vehicles").delete().eq("id", id);
    if (error) toast.error("Failed to delete");
    else {
      toast.success("Removed");
      setVehicles(vehicles.filter(v => v.id !== id));
    }
  };

  const renderIcon = (vType: string, className: string) => {
    return <VehicleTypeIcon vehicleType={vType} size={22} className={className} strokeWidth={2} />;
  };

  return (
    <div className="flex flex-col h-full pt-2">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 px-1">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setView("profile")} 
            aria-label="Back to profile"
            className={`w-9 h-9 rounded-full ${cardBg} border ${border} flex items-center justify-center active:scale-90 transition-transform`}
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 className="text-xl font-black uppercase tracking-tight">Trusted Drivers</h1>
            <p className={`text-[10px] font-bold ${mutedText}`}>Verified campus driver contacts</p>
          </div>
        </div>

        {/* Action Buttons: Expected Fares Rupee Pill + Add Driver */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFaresModal(true)}
            aria-label="Open expected campus fares"
            className="h-9 px-3 rounded-full bg-[#FFC554]/15 border border-[#FFC554]/30 text-[#FFC554] font-black text-[10px] uppercase tracking-wider flex items-center gap-1.5 active:scale-95 shadow-sm hover:bg-[#FFC554]/25 transition-all shrink-0"
          >
            <IndianRupee size={12} strokeWidth={2.5} />
            <span>Fares</span>
          </button>

          <button 
            onClick={() => setIsAdding(true)}
            aria-label="Add trusted driver"
            className="bg-[#FFC554] text-black w-9 h-9 rounded-full flex items-center justify-center shadow-lg active:scale-90 transition-transform shrink-0"
          >
            <Plus strokeWidth={3} size={20} />
          </button>
        </div>
      </div>

      {/* Driver List */}
      <div className="flex-1 overflow-y-auto space-y-3 pb-8 scrollbar-hide px-1">
        {loading ? (
          <p className={`text-center text-sm font-bold ${mutedText} mt-10`}>Loading drivers...</p>
        ) : vehicles.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-center space-y-3 px-4">
            <div className="w-16 h-16 rounded-[24px] bg-[#FFC554]/10 border border-[#FFC554]/20 flex items-center justify-center text-[#FFC554]">
              <ShieldCheck size={32} strokeWidth={1.8} />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em]">No Trusted Drivers Yet</p>
              <p className={`text-xs font-medium ${mutedText} mt-1 max-w-[240px]`}>
                Add trusted auto, bike, or cab drivers to help other students on campus.
              </p>
            </div>
            <button
              onClick={() => setIsAdding(true)}
              className="mt-2 px-5 py-2.5 rounded-full bg-[#FFC554] text-black font-black text-xs uppercase tracking-wider active:scale-95 shadow-md"
            >
              + Add Driver
            </button>
          </div>
        ) : (
          vehicles.map(v => {
            const rawDigits = (v.phone_number || "").replace(/\D/g, "");
            const phoneDigits = rawDigits.length >= 10 ? rawDigits.slice(-10) : rawDigits;
            const displayPhone = phoneDigits.length === 10
              ? `+91 ${phoneDigits.slice(0, 5)} ${phoneDigits.slice(5)}`
              : v.phone_number;
            const isOwner = v.user_id === session.user.id;

            return (
              <div key={v.id} className={`p-4 ${cardBg} border ${border} rounded-[24px] flex items-center gap-3.5 shadow-sm hover:border-[#FFC554]/30 transition-colors`}>
                {/* Vehicle Icon */}
                <div className="w-12 h-12 shrink-0 bg-[#FFC554]/10 rounded-2xl flex items-center justify-center text-[#FFC554]">
                  {renderIcon(v.vehicle_type, "w-7 h-7")}
                </div>

                {/* Driver Info (Zero truncation, full name visible on dedicated row) */}
                <div className="flex-1 min-w-0 flex flex-col justify-center">
                  <h3 className="font-black text-sm uppercase tracking-tight break-words leading-snug">
                    {v.driver_name}
                  </h3>

                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="text-[8px] font-black uppercase tracking-wider bg-[#FFC554]/15 text-[#FFC554] border border-[#FFC554]/25 px-1.5 py-0.5 rounded-md shrink-0">
                      {v.vehicle_type === "share_auto" ? "Share Auto" : v.vehicle_type || "Auto"}
                    </span>
                    <p className={`text-xs font-bold ${mutedText} flex items-center gap-1.5`}>
                      <Phone size={11} className="text-[#FFC554] shrink-0" />
                      <span>{displayPhone}</span>
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 mt-2">
                    {v.profiles?.avatar_url ? (
                      <img src={v.profiles.avatar_url} alt="" className="w-3.5 h-3.5 rounded-full object-cover" />
                    ) : (
                      <div className="w-3.5 h-3.5 rounded-full bg-white/10 flex items-center justify-center text-[7px] font-bold">
                        {v.profiles?.display_name?.substring(0, 1).toUpperCase()}
                      </div>
                    )}
                    <p className="text-[9px] uppercase tracking-wider font-bold opacity-60 truncate">
                      Added by {isOwner ? "You" : v.profiles?.display_name || "Student"}
                    </p>
                  </div>
                </div>

                {/* Direct Dialer Call Action Button + Delete (if added by user) */}
                <div className="flex items-center gap-2 shrink-0">
                  <a
                    href={`tel:+91${phoneDigits}`}
                    aria-label={`Call ${v.driver_name}`}
                    className="h-9 px-3.5 rounded-full bg-[#FFC554] text-black font-black text-xs uppercase tracking-wider flex items-center gap-1.5 active:scale-95 shadow-md hover:brightness-105 transition-all"
                  >
                    <Phone size={13} strokeWidth={2.5} />
                    <span>Call</span>
                  </a>

                  {isOwner && (
                    <button 
                      onClick={() => handleDelete(v.id)}
                      aria-label="Delete trusted vehicle"
                      className={`w-8 h-8 rounded-full ${isDark ? "bg-white/5" : "bg-black/5"} text-zinc-400 hover:text-red-400 flex items-center justify-center active:scale-90 transition-colors`}
                    >
                      <X size={14} strokeWidth={2.5} />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add Driver Modal */}
      {isAdding && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-xl p-4 animate-fade-in">
          <div className={`w-full max-w-md max-h-[85vh] flex flex-col overflow-y-auto scrollbar-hide ${isDark ? "bg-[#121214]" : "bg-[#FFFFFF]"} border ${border} rounded-[32px] p-6 space-y-4 shadow-2xl`}>
            <div className="flex items-center justify-between shrink-0 pb-1 border-b border-white/10">
              <h2 className="text-lg font-black uppercase tracking-tight">Add Driver</h2>
              <button 
                onClick={() => setIsAdding(false)} 
                aria-label="Close"
                className={`w-8 h-8 rounded-full ${isDark ? "bg-white/10" : "bg-black/5"} flex items-center justify-center active:scale-90 transition-transform`}
              >
                <X size={16} strokeWidth={2.5} />
              </button>
            </div>

            {!canAdd && (
              <div className="p-3.5 bg-[#FFC554]/10 border border-[#FFC554]/25 rounded-2xl flex items-center gap-2.5 text-[#FFC554]">
                <Info size={16} className="shrink-0" />
                <p className="text-xs font-bold">You have reached the limit of 5 trusted drivers.</p>
              </div>
            )}

            <div className="space-y-3.5">
              <div className="space-y-1.5">
                <label className={`text-[10px] font-black ${mutedText} uppercase tracking-wider`}>Vehicle Type</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "bike", label: "Bike", icon: BikeIcon },
                    { id: "auto", label: "Auto", icon: AutoIcon },
                    { id: "share_auto", label: "Share Auto", icon: ShareAutoIcon }
                  ].map(t => (
                    <button
                      key={t.id}
                      onClick={() => setType(t.id as any)}
                      className={`flex flex-col items-center justify-center py-2.5 gap-1 rounded-2xl border ${type === t.id ? 'bg-[#FFC554] border-[#FFC554] text-black shadow-md' : `${isDark ? "bg-white/5" : "bg-black/5"} border-transparent ${mutedText}`}`}
                    >
                      <t.icon className="w-5 h-5" />
                      <span className="text-[10px] font-black uppercase tracking-tight text-center leading-tight mt-0.5">{t.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className={`text-[10px] font-black ${mutedText} uppercase tracking-wider`}>Driver Name</label>
                <div className={`flex items-center gap-3 px-4 py-2.5 ${isDark ? "bg-white/5" : "bg-black/5"} border ${border} rounded-2xl`}>
                  <User size={16} className={mutedText} />
                  <input 
                    value={name} 
                    onChange={e => setName(e.target.value)} 
                    placeholder="Driver's Name" 
                    className="flex-1 bg-transparent text-sm font-bold outline-none placeholder:opacity-40"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className={`text-[10px] font-black ${mutedText} uppercase tracking-wider`}>Phone Number</label>
                <div className={`flex items-center gap-3 px-4 py-2.5 ${isDark ? "bg-white/5" : "bg-black/5"} border ${border} rounded-2xl`}>
                  <Phone size={16} className={mutedText} />
                  <input 
                    type="tel"
                    value={phone} 
                    onChange={e => setPhone(e.target.value)} 
                    placeholder="Driver's Number" 
                    className="flex-1 bg-transparent text-sm font-bold outline-none placeholder:opacity-40"
                  />
                </div>
              </div>
            </div>

            <button
              onClick={handleAdd}
              disabled={!canAdd}
              className={`w-full py-3.5 bg-[#FFC554] text-black rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100 transition-transform`}
            >
              Add Trusted Driver
            </button>
          </div>
        </div>
      )}

      {/* Expected Fares Modal Triggered via Rupee Pill */}
      <ExpectedFaresModal isOpen={showFaresModal} onClose={() => setShowFaresModal(false)} />
    </div>
  );
}
