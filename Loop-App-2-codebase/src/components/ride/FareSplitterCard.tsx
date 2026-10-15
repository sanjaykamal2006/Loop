"use client";

import React from "react";
import { Receipt, Check, X } from "lucide-react";
import { SteeringWheelIcon } from "@/components/ui/VehicleIcons";
import type { Loop, ThemeClasses } from "@/lib/types";

interface FareSplitterCardProps {
  loop: Loop;
  isCreator: boolean;
  isPast: boolean;
  memberCount: number;
  fareInput: string;
  setFareInput: (val: string) => void;
  isEditingFare: boolean;
  setIsEditingFare: (editing: boolean) => void;
  onSaveFare: () => void;
  theme: ThemeClasses;
}

export function FareSplitterCard({
  loop,
  isCreator,
  isPast,
  memberCount,
  fareInput,
  setFareInput,
  isEditingFare,
  setIsEditingFare,
  onSaveFare,
  theme,
}: FareSplitterCardProps) {
  const { isDark, bg, border, cardBg, mutedText } = theme;

  if (loop.is_driver_offering) {
    return (
      <div className={`p-4 ${cardBg} ${isDark ? "border border-[#FFC554]/30" : "border border-[#881337]/30"} rounded-[28px] flex items-center justify-between shadow-sm`}>
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-2xl ${isDark ? "bg-[#FFC554]/15 border border-[#FFC554]/25 text-[#FFC554]" : "bg-[#881337]/10 border border-[#881337]/20 text-[#881337]"} flex items-center justify-center shrink-0`}>
            <SteeringWheelIcon size={20} />
          </div>
          <div>
            <p className={`text-[9px] font-black ${mutedText} uppercase tracking-wider`}>Student Driver</p>
            <h4 className={`font-black text-sm uppercase ${isDark ? "text-[#FFC554]" : "text-[#881337]"}`}>
              Personal {loop.vehicle_type || "Vehicle"} Drop
            </h4>
          </div>
        </div>
        <span className={`text-[9px] font-black ${isDark ? "text-[#FFC554] bg-[#FFC554]/10 border border-[#FFC554]/25" : "text-[#881337] bg-[#881337]/10 border border-[#881337]/25"} px-2.5 py-1 rounded-full uppercase tracking-wider`}>
          Coordinate in chat
        </span>
      </div>
    );
  }

  return (
    <div className={`p-4 ${cardBg} border ${border} rounded-[28px] space-y-3`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Receipt size={14} className={mutedText} strokeWidth={2.5} />
          <p className={`text-[10px] font-black ${mutedText} uppercase tracking-wider`}>Fare Splitter</p>
        </div>
        {isCreator && !isEditingFare && !isPast && (
          <button
            type="button"
            onClick={() => setIsEditingFare(true)}
            className={`text-[10px] font-black ${isDark ? "text-[#FFC554]" : "text-[#881337]"} uppercase tracking-wider active:scale-95 cursor-pointer`}
          >
            {loop.total_fare ? "Edit Fare" : "Set Fare"}
          </button>
        )}
      </div>

      {isEditingFare && !isPast ? (
        <div className="flex items-center gap-2">
          <div className={`flex-1 flex items-center h-10 ${bg} border ${border} rounded-[16px] px-3`}>
            <span className={`font-black ${mutedText} mr-2`}>₹</span>
            <input 
              type="number" 
              value={fareInput} 
              onChange={e => setFareInput(e.target.value)} 
              placeholder="Total Fare"
              className="flex-1 bg-transparent text-sm font-bold outline-none"
              autoFocus
            />
          </div>
          <button
            type="button"
            onClick={onSaveFare}
            className="w-10 h-10 bg-green-500/10 text-green-500 flex items-center justify-center rounded-[16px] active:scale-95 cursor-pointer"
          >
            <Check size={16} strokeWidth={3} />
          </button>
          <button
            type="button"
            onClick={() => setIsEditingFare(false)}
            className={`w-10 h-10 ${cardBg} border border-red-500/20 text-red-500 flex items-center justify-center rounded-[16px] active:scale-95 cursor-pointer`}
          >
            <X size={16} strokeWidth={3} />
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-between w-full">
          <div>
            <p className={`text-[9px] font-bold ${mutedText} uppercase tracking-wider`}>Total Fare</p>
            <h3 className="font-black text-lg">
              {loop.total_fare ? `₹${loop.total_fare}` : "Not Set"}
            </h3>
          </div>
          
          <div className="text-right">
            <p className={`text-[9px] font-bold ${mutedText} uppercase tracking-wider`}>Split (Per Person)</p>
            <h3 className="font-black text-lg text-[#FFC554]">
              {loop.total_fare ? `₹${Math.ceil((loop.total_fare) / Math.max(1, memberCount))}` : "—"}
            </h3>
          </div>
        </div>
      )}
    </div>
  );
}
