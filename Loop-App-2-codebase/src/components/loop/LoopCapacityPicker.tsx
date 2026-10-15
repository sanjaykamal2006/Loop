"use client";

import React from "react";
import { ScooterIcon, MotorcycleIcon, CarIcon } from "@/components/ui/VehicleIcons";

interface LoopCapacityPickerProps {
  isDriverOffering?: boolean | null;
  vehicleType: "scooter" | "bike" | "car";
  setVehicleType: (v: "scooter" | "bike" | "car") => void;
  limit: number;
  setLimit: (n: number) => void;
  minPassengerSeats: number;
  minAllowedSeats: number;
  currentMemberCount: number;
  theme: {
    isDark: boolean;
    bg: string;
    border: string;
    mutedText: string;
  };
}

export function LoopCapacityPicker({
  isDriverOffering,
  vehicleType,
  setVehicleType,
  limit,
  setLimit,
  minPassengerSeats,
  minAllowedSeats,
  currentMemberCount,
  theme,
}: LoopCapacityPickerProps) {
  const { isDark, bg, border, mutedText } = theme;

  return (
    <div className="space-y-3">
      {/* Student Driver Vehicle Selection (if offering ride) */}
      {isDriverOffering && (
        <div className="space-y-1.5">
          <label className={`text-[10px] uppercase font-black ${mutedText} tracking-[0.15em] ml-1`}>
            Vehicle
          </label>
          <div className="flex gap-1.5">
            {(
              [
                { type: "scooter", label: "Scooter", Icon: ScooterIcon },
                { type: "bike", label: "Bike", Icon: MotorcycleIcon },
                { type: "car", label: "Car", Icon: CarIcon },
              ] as const
            ).map((v) => {
              const isSelected = vehicleType === v.type;
              return (
                <button
                  key={v.type}
                  type="button"
                  onClick={() => {
                    setVehicleType(v.type);
                    if (v.type === "scooter" || v.type === "bike") {
                      setLimit(1);
                    } else if (limit === 1) {
                      setLimit(3);
                    }
                  }}
                  className={`flex-1 h-8 rounded-xl border flex items-center justify-center gap-1.5 active:scale-95 transition-all text-xs cursor-pointer ${
                    isSelected
                      ? isDark
                        ? "bg-[#FFC554] border-[#FFC554] text-black font-black shadow-sm"
                        : "bg-[#881337] border-[#881337] text-white font-black shadow-sm"
                      : `${bg} ${border} ${mutedText} font-bold`
                  }`}
                >
                  <v.Icon
                    size={14}
                    strokeWidth={2.2}
                    className={
                      isSelected
                        ? isDark
                          ? "text-black"
                          : "text-white"
                        : isDark
                        ? "text-[#FFC554]"
                        : "text-[#881337]"
                    }
                  />
                  <span className="text-[10px] font-black uppercase">{v.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Available Seats / Limit */}
      {isDriverOffering && vehicleType === "car" ? (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between ml-1">
            <label className={`text-[10px] uppercase font-black ${mutedText} tracking-[0.15em]`}>
              Passenger Seats to Offer
            </label>
            <span className={`text-[10px] font-bold ${isDark ? "text-[#FFC554]" : "text-[#881337]"}`}>
              {limit} {limit === 1 ? "passenger" : "passengers"} (+ driver)
            </span>
          </div>

          <div className="space-y-1.5">
            <div className="flex gap-1.5">
              {[1, 2, 3, 4, 5, 6].map((n) => {
                const isDisabled = n < minPassengerSeats;
                return (
                  <button
                    key={n}
                    type="button"
                    disabled={isDisabled}
                    onClick={() => setLimit(n)}
                    className={`flex-1 h-9 rounded-xl border font-black text-xs active:scale-95 transition-all cursor-pointer ${
                      limit === n
                        ? isDark
                          ? "bg-[#FFC554] border-[#FFC554] text-black shadow-sm"
                          : "bg-[#881337] border-[#881337] text-white shadow-sm"
                        : isDisabled
                        ? "opacity-25 cursor-not-allowed border-white/5"
                        : `${border} ${bg} ${mutedText}`
                    }`}
                  >
                    {n}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ) : isDriverOffering && (vehicleType === "bike" || vehicleType === "scooter") ? (
        <div className={`p-3 ${bg} border ${border} rounded-[18px] flex items-center justify-between`}>
          <div>
            <p className={`text-[10px] uppercase font-black ${mutedText} tracking-wider`}>Capacity</p>
            <p className="text-xs font-black">1 Passenger Seat (Pillion)</p>
          </div>
          <span
            className={`text-[10px] font-bold ${
              isDark
                ? "text-[#FFC554] bg-[#FFC554]/10 border border-[#FFC554]/20"
                : "text-[#881337] bg-[#881337]/10 border border-[#881337]/25"
            } px-2.5 py-1 rounded-full`}
          >
            Driver + 1 Rider
          </span>
        </div>
      ) : !isDriverOffering ? (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between ml-1">
            <label className={`text-[10px] uppercase font-black ${mutedText} tracking-[0.15em]`}>
              Total Group Size / Limit
            </label>
            {currentMemberCount > 1 && (
              <span className={`text-[9px] ${isDark ? "text-[#FFC554]" : "text-[#881337]"} font-bold`}>
                Min {minAllowedSeats} (Joined: {currentMemberCount})
              </span>
            )}
          </div>

          <div className="space-y-1.5">
            <div className="flex gap-1.5">
              {[2, 3, 4, 5, 6].map((n) => {
                const isDisabled = n < minAllowedSeats;
                return (
                  <button
                    key={n}
                    type="button"
                    disabled={isDisabled}
                    onClick={() => setLimit(n)}
                    className={`flex-1 h-9 rounded-xl border font-black text-xs active:scale-95 transition-all cursor-pointer ${
                      limit === n
                        ? isDark
                          ? "bg-[#FFC554] border-[#FFC554] text-black shadow-sm"
                          : "bg-[#881337] border-[#881337] text-white shadow-sm"
                        : isDisabled
                        ? "opacity-25 cursor-not-allowed border-white/5"
                        : `${border} ${bg} ${mutedText}`
                    }`}
                  >
                    {n}
                  </button>
                );
              })}
            </div>

            <div className="flex gap-1.5">
              {[7, 8, 9, 10].map((n) => {
                const isDisabled = n < minAllowedSeats;
                return (
                  <button
                    key={n}
                    type="button"
                    disabled={isDisabled}
                    onClick={() => setLimit(n)}
                    className={`flex-1 h-9 rounded-xl border font-black text-xs active:scale-95 transition-all cursor-pointer ${
                      limit === n
                        ? isDark
                          ? "bg-[#FFC554] border-[#FFC554] text-black shadow-sm"
                          : "bg-[#881337] border-[#881337] text-white shadow-sm"
                        : isDisabled
                        ? "opacity-25 cursor-not-allowed border-white/5"
                        : `${border} ${bg} ${mutedText}`
                    }`}
                  >
                    {n}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
