"use client";

import React from "react";
import { Users } from "lucide-react";
import { SteeringWheelIcon, ScooterIcon, MotorcycleIcon, CarIcon } from "@/components/ui/VehicleIcons";

interface VehiclePreferencesCardProps {
  isDriver: boolean;
  setIsDriver: (val: boolean) => void;
  vehicleType: "scooter" | "bike" | "car";
  setVehicleType: (val: "scooter" | "bike" | "car") => void;
  limit: number;
  setLimit: (val: number) => void;
  isFemaleOnly: boolean;
  onToggleFemaleOnly: () => void;
  cardBg: string;
  border: string;
  mutedText: string;
  isDark: boolean;
}

export default function VehiclePreferencesCard({
  isDriver,
  setIsDriver,
  vehicleType,
  setVehicleType,
  limit,
  setLimit,
  isFemaleOnly,
  onToggleFemaleOnly,
  cardBg,
  border,
  mutedText,
  isDark,
}: VehiclePreferencesCardProps) {
  return (
    <>
      {/* Offering a Ride Toggle Card with Compact Vehicle Pills */}
      <div
        className={`p-4 sm:p-4.5 px-4.5 ${cardBg} border ${border} rounded-[24px] space-y-2.5 transition-all ${
          isDriver ? (isDark ? "border-[#FFC554]/50 shadow-sm" : "border-[#881337]/40 shadow-sm") : ""
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div
              className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-colors shrink-0 ${
                isDriver
                  ? isDark
                    ? "bg-[#FFC554] text-black shadow-sm"
                    : "bg-[#881337] text-white shadow-sm"
                  : isDark
                  ? "bg-white/5 text-white/40"
                  : "bg-black/5 text-black/40"
              }`}
            >
              <SteeringWheelIcon size={20} />
            </div>
            <div className="space-y-0.5">
              <span className="text-xs sm:text-[13px] font-black tracking-tight uppercase block leading-tight">
                Offering a Ride
              </span>
              <p className={`text-[10px] sm:text-[11px] font-bold ${mutedText} leading-tight`}>
                Offer a lift with your vehicle
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              const next = !isDriver;
              setIsDriver(next);
              if (next) {
                if (vehicleType === "bike" || vehicleType === "scooter") setLimit(1);
                else setLimit(3);
              } else {
                setLimit(4);
              }
            }}
            className={`w-12 h-7 rounded-full p-0.5 transition-colors duration-200 shrink-0 cursor-pointer ${
              isDriver
                ? isDark
                  ? "bg-[#FFC554]"
                  : "bg-[#881337]"
                : isDark
                ? "bg-zinc-800"
                : "bg-zinc-300"
            }`}
          >
            <div
              className={`w-6 h-6 rounded-full bg-white shadow-md transition-transform duration-200 ${
                isDriver ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>

        {/* Compact 1-Row Vehicle Selection Pills */}
        {isDriver && (
          <div className="pt-2 border-t border-white/5 flex gap-2 animate-fade-in">
            {(
              [
                { type: "scooter", label: "Scooter (1)", Icon: ScooterIcon },
                { type: "bike", label: "Bike (1)", Icon: MotorcycleIcon },
                { type: "car", label: "Car (1-6)", Icon: CarIcon },
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
                  className={`flex-1 h-9 sm:h-10 rounded-xl border flex items-center justify-center gap-1.5 active:scale-95 transition-all text-xs cursor-pointer ${
                    isSelected
                      ? isDark
                        ? "bg-[#FFC554] border-[#FFC554] text-black shadow-sm font-black"
                        : "bg-[#881337] border-[#881337] text-white shadow-sm font-black"
                      : `${cardBg} ${border} ${isDark ? "text-zinc-300" : "text-stone-700"} font-bold`
                  }`}
                >
                  <v.Icon
                    size={15}
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
                  <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider">{v.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Available Seats / Capacity */}
      {isDriver && vehicleType === "car" ? (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between ml-1">
            <label className={`text-[10px] sm:text-[11px] uppercase font-black ${mutedText} tracking-[0.15em]`}>
              Passenger Seats to Offer
            </label>
            <span className={`text-[11px] font-bold ${isDark ? "text-[#FFC554]" : "text-[#881337]"}`}>
              {limit} {limit === 1 ? "passenger" : "passengers"} (+ driver)
            </span>
          </div>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setLimit(n)}
                className={`flex-1 h-11 sm:h-12 rounded-2xl border font-black text-sm sm:text-base active:scale-95 transition-all cursor-pointer ${
                  limit === n
                    ? isDark
                      ? "bg-[#FFC554] border-[#FFC554] text-black shadow-sm"
                      : "bg-[#881337] border-[#881337] text-white shadow-sm"
                    : `${border} ${cardBg} ${isDark ? "text-zinc-300" : "text-stone-700"}`
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
      ) : isDriver && (vehicleType === "bike" || vehicleType === "scooter") ? (
        <div className={`p-3.5 ${cardBg} border ${border} rounded-[20px] flex items-center justify-between`}>
          <div className="flex items-center gap-3">
            <div
              className={`w-8 h-8 rounded-xl ${
                isDark ? "bg-[#FFC554]/15 text-[#FFC554]" : "bg-[#881337]/10 text-[#881337]"
              } flex items-center justify-center shrink-0`}
            >
              <Users size={16} />
            </div>
            <div>
              <p className={`text-[10px] uppercase font-black ${mutedText} tracking-wider`}>Capacity</p>
              <p className="text-xs sm:text-sm font-black">1 Passenger Seat (Pillion)</p>
            </div>
          </div>
          <span
            className={`text-[10px] sm:text-[11px] font-bold ${
              isDark
                ? "text-[#FFC554] bg-[#FFC554]/10 border border-[#FFC554]/20"
                : "text-[#881337] bg-[#881337]/10 border border-[#881337]/25"
            } px-3 py-1 rounded-full`}>
            Driver + 1 Rider
          </span>
        </div>
      ) : !isDriver ? (
        <div className="space-y-1.5">
          <label className={`text-[10px] sm:text-[11px] uppercase font-black ${mutedText} tracking-[0.15em] ml-1`}>
            Total Group Size
          </label>
          <div className="space-y-2">
            <div className="flex gap-2">
              {[2, 3, 4, 5, 6].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setLimit(n)}
                  className={`flex-1 h-11 sm:h-12 rounded-2xl border font-black text-sm sm:text-base active:scale-95 transition-all cursor-pointer ${
                    limit === n
                      ? isDark
                        ? "bg-[#FFC554] border-[#FFC554] text-black shadow-sm"
                        : "bg-[#881337] border-[#881337] text-white shadow-sm"
                      : `${border} ${cardBg} ${isDark ? "text-zinc-300" : "text-stone-700"}`
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
            <div className="flex gap-2 px-3 sm:px-4">
              {[7, 8, 9, 10].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setLimit(n)}
                  className={`flex-1 h-11 sm:h-12 rounded-2xl border font-black text-sm sm:text-base active:scale-95 transition-all cursor-pointer ${
                    limit === n
                      ? isDark
                        ? "bg-[#FFC554] border-[#FFC554] text-black shadow-sm"
                        : "bg-[#881337] border-[#881337] text-white shadow-sm"
                      : `${border} ${cardBg} ${isDark ? "text-zinc-300" : "text-stone-700"}`
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {/* Female Only Option */}
      <div
        onClick={onToggleFemaleOnly}
        className={`flex items-center justify-between p-3.5 px-4 ${cardBg} border ${border} rounded-[22px] cursor-pointer active:scale-[0.99] transition-all ${
          isFemaleOnly ? "border-pink-500/50" : ""
        }`}
      >
        <div className="flex items-center gap-3">
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center ${
              isFemaleOnly ? "bg-pink-500 text-white" : isDark ? "bg-white/5 text-white/40" : "bg-black/5 text-black/40"
            }`}
          >
            <Users size={17} strokeWidth={2.5} />
          </div>
          <div>
            <span className="text-xs sm:text-[13px] font-black tracking-tight uppercase">Female Only</span>
            <p className={`text-[10px] font-bold ${mutedText}`}>Visible to women only</p>
            {isFemaleOnly && (
              <p className="text-[9px] text-pink-400 font-medium leading-tight mt-1 animate-fade-in">
                Based on self-reported gender at signup. Not independently verified.
              </p>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleFemaleOnly();
          }}
          className={`w-12 h-7 rounded-full p-0.5 transition-colors duration-200 shrink-0 cursor-pointer ${
            isFemaleOnly ? "bg-pink-500" : isDark ? "bg-zinc-800" : "bg-zinc-300"
          }`}
        >
          <div
            className={`w-6 h-6 rounded-full bg-white shadow-md transition-transform duration-200 ${
              isFemaleOnly ? "translate-x-5" : "translate-x-0"
            }`}
          />
        </button>
      </div>
    </>
  );
}
