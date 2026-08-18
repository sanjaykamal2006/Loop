"use client";

import React, { useState, useEffect } from "react";
import { useLoop } from "@/lib/LoopContext";
import { supabase } from "@/lib/supabase";
import { toast } from "@/components/ui/NativeToast";
import { Plus, X, Phone, User, Info, ArrowLeft, ShieldCheck, MapPin, ArrowRight, IndianRupee, Search } from "lucide-react";
import type { TrustedVehicle } from "@/lib/types";

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

export default function TrustedVehiclesView() {
  const { session, theme, setView } = useLoop();
  const { isDark, cardBg, border, mutedText, text } = theme;

  const [vehicles, setVehicles] = useState<TrustedVehicle[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [loading, setLoading] = useState(true);
  const [revealedPhones, setRevealedPhones] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");

  const maskPhone = (phone: string) => phone.length > 4 ? phone.substring(0, 2) + 'XXX XXX' + phone.slice(-2) : '****';

  // Form State
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [type, setType] = useState<"bike" | "auto" | "share_auto" | "">("");
  const [fromLocation, setFromLocation] = useState("Campus");
  const [toLocation, setToLocation] = useState("");
  const [expectedFare, setExpectedFare] = useState("");

  const myVehiclesCount = vehicles.filter(v => v.user_id === session.user.id).length;
  const canAdd = myVehiclesCount < 5;

  useEffect(() => {
    fetchVehicles();
  }, []);

  const fetchVehicles = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("trusted_vehicles")
      .select("id, user_id, driver_name, phone_number, vehicle_type, from_location, to_location, expected_fare, created_at, profiles:user_id(display_name, avatar_url)")
      .order("created_at", { ascending: false });

    if (error) toast.error("Failed to fetch drivers & fares");
    else setVehicles((data || []) as unknown as TrustedVehicle[]);
    setLoading(false);
  };

  const handleAdd = async () => {
    if (!canAdd) {
      toast.error("You can only add up to 5 trusted drivers.");
      return;
    }
    if (!name.trim() || !phone.trim() || !type) {
      toast.error("Please enter driver name, phone, and vehicle type.");
      return;
    }

    const fareNum = expectedFare ? parseInt(expectedFare) : null;

    const { data, error } = await supabase
      .from("trusted_vehicles")
      .insert({
        user_id: session.user.id,
        driver_name: name.trim(),
        phone_number: phone.trim(),
        vehicle_type: type,
        from_location: fromLocation.trim() || "Campus",
        to_location: toLocation.trim() || null,
        expected_fare: fareNum,
      })
      .select("id, user_id, driver_name, phone_number, vehicle_type, from_location, to_location, expected_fare, created_at, profiles:user_id(display_name, avatar_url)")
      .single();

    if (error) {
      toast.error("Failed to add driver. Please try again.");
    } else {
      toast.success("Driver & Expected Fare added!");
      setVehicles([data as unknown as TrustedVehicle, ...vehicles]);
      setIsAdding(false);
      setName("");
      setPhone("");
      setType("");
      setFromLocation("Campus");
      setToLocation("");
      setExpectedFare("");
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("trusted_vehicles").delete().eq("id", id);
    if (error) toast.error("Failed to delete");
    else {
      toast.success("Driver removed");
      setVehicles(vehicles.filter(v => v.id !== id));
    }
  };

  const renderIcon = (vType: string, className: string) => {
    switch (vType) {
      case "bike": return <BikeIcon className={className} />;
      case "auto": return <AutoIcon className={className} />;
      case "share_auto": return <ShareAutoIcon className={className} />;
      default: return null;
    }
  };

  const filteredVehicles = vehicles.filter((v) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      v.driver_name?.toLowerCase().includes(q) ||
      v.from_location?.toLowerCase().includes(q) ||
      v.to_location?.toLowerCase().includes(q) ||
      v.vehicle_type?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="flex flex-col h-full pt-2">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setView("profile")} 
            aria-label="Back to profile"
            className={`w-9 h-9 rounded-full ${cardBg} border ${border} flex items-center justify-center active:scale-90 transition-transform`}
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 className="text-xl font-black uppercase tracking-tight">Drivers & Fares</h1>
            <p className={`text-[10px] font-bold ${mutedText}`}>Verified drivers & standard campus fares</p>
          </div>
        </div>
        <button 
          onClick={() => setIsAdding(true)}
          aria-label="Add trusted driver"
          className="bg-[#FFC554] text-black w-9 h-9 rounded-full flex items-center justify-center shadow-lg active:scale-90 transition-transform shrink-0"
        >
          <Plus strokeWidth={3} size={20} />
        </button>
      </div>

      {/* Search Input */}
      {vehicles.length > 2 && (
        <div className="mb-3 px-1">
          <div className={`flex items-center gap-2.5 px-3.5 h-10 ${cardBg} border ${border} rounded-2xl`}>
            <Search size={14} className={mutedText} />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search destination, route, or driver..."
              className="flex-1 bg-transparent text-xs font-bold outline-none placeholder:opacity-40"
            />
          </div>
        </div>
      )}

      {/* Driver & Fares List */}
      <div className="flex-1 overflow-y-auto space-y-3 pb-8 scrollbar-hide px-1">
        {loading ? (
          <p className={`text-center text-xs font-bold ${mutedText} mt-10`}>Loading drivers & fares...</p>
        ) : filteredVehicles.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-center space-y-3 px-4">
            <div className="w-16 h-16 rounded-[24px] bg-[#FFC554]/10 border border-[#FFC554]/20 flex items-center justify-center text-[#FFC554]">
              <ShieldCheck size={32} strokeWidth={1.8} />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em]">
                {searchQuery ? "No Matching Drivers" : "No Drivers or Fares Yet"}
              </p>
              <p className={`text-xs font-medium ${mutedText} mt-1 max-w-[240px]`}>
                {searchQuery ? "Try searching for a different destination or driver name." : "Add trusted campus auto, bike, or cab drivers with expected route fares for everyone to use."}
              </p>
            </div>
            {!searchQuery && (
              <button
                onClick={() => setIsAdding(true)}
                className="mt-2 px-5 py-2.5 rounded-full bg-[#FFC554] text-black font-black text-xs uppercase tracking-wider active:scale-95 shadow-md"
              >
                + Add Driver & Fare
              </button>
            )}
          </div>
        ) : (
          filteredVehicles.map(v => (
            <div key={v.id} className={`p-4 ${cardBg} border ${border} rounded-[24px] space-y-3 shadow-sm hover:border-[#FFC554]/30 transition-colors`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 shrink-0 bg-[#FFC554]/10 rounded-2xl flex items-center justify-center text-[#FFC554]">
                    {renderIcon(v.vehicle_type, "w-6 h-6")}
                  </div>
                  <div>
                    <h3 className="font-black text-sm uppercase tracking-tight">{v.driver_name}</h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <a href={`tel:${v.phone_number}`} className={`flex items-center gap-1 text-xs font-bold ${mutedText} hover:text-[#FFC554]`}>
                        <Phone size={10} /> 
                        {revealedPhones.has(v.id) ? v.phone_number : maskPhone(v.phone_number)}
                      </a>
                      <button 
                        onClick={() => {
                          const next = new Set(revealedPhones);
                          if (next.has(v.id)) next.delete(v.id);
                          else next.add(v.id);
                          setRevealedPhones(next);
                        }}
                        className="text-[10px] text-[#FFC554] font-black uppercase tracking-wider"
                      >
                        {revealedPhones.has(v.id) ? "Hide" : "Show"}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Expected Fare Tag */}
                {v.expected_fare ? (
                  <div className="text-right shrink-0">
                    <span className="inline-flex items-center gap-0.5 px-2.5 py-1 rounded-full text-xs font-black text-[#FFC554] bg-[#FFC554]/10 border border-[#FFC554]/30">
                      ₹{v.expected_fare}
                    </span>
                    <p className={`text-[8px] font-black uppercase tracking-wider ${mutedText} mt-0.5`}>Expected Fare</p>
                  </div>
                ) : null}
              </div>

              {/* Route Display if present */}
              {(v.from_location || v.to_location) && (
                <div className={`p-2.5 ${isDark ? "bg-white/5" : "bg-black/5"} border ${border} rounded-xl flex items-center gap-2 text-xs font-bold`}>
                  <MapPin size={12} className="text-[#FFC554] shrink-0" />
                  <span className="truncate opacity-80">{v.from_location || "Campus"}</span>
                  <ArrowRight size={11} className="shrink-0 opacity-40" />
                  <span className="truncate text-[#FFC554]">{v.to_location || "Anywhere"}</span>
                </div>
              )}

              {/* Footer */}
              <div className="flex items-center justify-between pt-1 border-t border-white/5">
                <div className="flex items-center gap-1.5">
                  {v.profiles?.avatar_url ? (
                    <img src={v.profiles.avatar_url} alt="" className="w-4 h-4 rounded-full object-cover" />
                  ) : (
                    <div className="w-4 h-4 rounded-full bg-white/10 flex items-center justify-center text-[8px] font-bold">
                      {v.profiles?.display_name?.substring(0, 1).toUpperCase()}
                    </div>
                  )}
                  <p className={`text-[9px] uppercase tracking-wider font-bold opacity-60`}>
                    Added by {v.user_id === session.user.id ? "You" : v.profiles?.display_name || "Student"}
                  </p>
                </div>

                {v.user_id === session.user.id && (
                  <button 
                    onClick={() => handleDelete(v.id)}
                    aria-label="Delete trusted driver"
                    className={`w-7 h-7 rounded-full ${isDark ? "bg-white/5" : "bg-black/5"} text-zinc-400 hover:text-red-400 flex items-center justify-center shrink-0 active:scale-90 transition-colors`}
                  >
                    <X size={13} strokeWidth={2.5} />
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Driver & Fare Modal */}
      {isAdding && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-xl p-4 animate-fade-in">
          <div className={`w-full max-w-md max-h-[85vh] flex flex-col overflow-y-auto scrollbar-hide ${isDark ? "bg-[#121214]" : "bg-[#FFFFFF]"} border ${border} rounded-[32px] p-6 space-y-4 shadow-2xl`}>
            <div className="flex items-center justify-between shrink-0 pb-1 border-b border-white/10">
              <div>
                <h2 className="text-base font-black uppercase tracking-tight">Add Driver & Fare</h2>
                <p className={`text-[10px] font-bold ${mutedText}`}>Share trusted campus transport info</p>
              </div>
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

            <div className="space-y-3">
              {/* Vehicle Type */}
              <div className="space-y-1">
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

              {/* Driver Name & Phone */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <label className={`text-[10px] font-black ${mutedText} uppercase tracking-wider`}>Driver Name</label>
                  <div className={`flex items-center gap-2 px-3 py-2 ${isDark ? "bg-white/5" : "bg-black/5"} border ${border} rounded-2xl`}>
                    <User size={14} className={mutedText} />
                    <input 
                      value={name} 
                      onChange={e => setName(e.target.value)} 
                      placeholder="Name" 
                      className="flex-1 bg-transparent text-xs font-bold outline-none placeholder:opacity-40"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className={`text-[10px] font-black ${mutedText} uppercase tracking-wider`}>Phone Number</label>
                  <div className={`flex items-center gap-2 px-3 py-2 ${isDark ? "bg-white/5" : "bg-black/5"} border ${border} rounded-2xl`}>
                    <Phone size={14} className={mutedText} />
                    <input 
                      type="tel"
                      value={phone} 
                      onChange={e => setPhone(e.target.value)} 
                      placeholder="Number" 
                      className="flex-1 bg-transparent text-xs font-bold outline-none placeholder:opacity-40"
                    />
                  </div>
                </div>
              </div>

              {/* Route & Expected Fare */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <label className={`text-[10px] font-black ${mutedText} uppercase tracking-wider`}>From Location</label>
                  <input 
                    value={fromLocation} 
                    onChange={e => setFromLocation(e.target.value)} 
                    placeholder="e.g. Main Gate" 
                    className={`w-full px-3 py-2 ${isDark ? "bg-white/5" : "bg-black/5"} border ${border} rounded-2xl text-xs font-bold outline-none placeholder:opacity-40`}
                  />
                </div>

                <div className="space-y-1">
                  <label className={`text-[10px] font-black ${mutedText} uppercase tracking-wider`}>To Destination</label>
                  <input 
                    value={toLocation} 
                    onChange={e => setToLocation(e.target.value)} 
                    placeholder="e.g. Station / Airport" 
                    className={`w-full px-3 py-2 ${isDark ? "bg-white/5" : "bg-black/5"} border ${border} rounded-2xl text-xs font-bold outline-none placeholder:opacity-40`}
                  />
                </div>
              </div>

              {/* Expected Fare (Optional) */}
              <div className="space-y-1">
                <label className={`text-[10px] font-black ${mutedText} uppercase tracking-wider`}>Expected Fare (₹)</label>
                <div className={`flex items-center gap-2 px-3 py-2 ${isDark ? "bg-white/5" : "bg-black/5"} border ${border} rounded-2xl`}>
                  <span className={`text-xs font-black ${mutedText}`}>₹</span>
                  <input 
                    type="number"
                    value={expectedFare} 
                    onChange={e => setExpectedFare(e.target.value)} 
                    placeholder="e.g. 150 (standard negotiated auto rate)" 
                    className="flex-1 bg-transparent text-xs font-bold outline-none placeholder:opacity-40"
                  />
                </div>
              </div>
            </div>

            <button
              onClick={handleAdd}
              disabled={!canAdd}
              className={`w-full py-3 bg-[#FFC554] text-black rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100 transition-transform mt-2`}
            >
              Save Driver & Fare
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
