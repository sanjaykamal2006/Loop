"use client";

import React from "react";
import type { SlotProps } from "input-otp";

export function AuthSlot(props: SlotProps) {
  return (
    <div
      className={`
        relative w-11 h-12 text-2xl font-black flex items-center justify-center
        transition-all duration-300 border-b-2
        ${props.isActive ? "border-[#FFC554] text-[#FFC554]" : "border-white/10 text-white/40"}
      `}
    >
      {props.char !== null && <div>{props.char}</div>}
      {props.hasFakeCaret && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-px h-6 bg-[#FFC554] animate-caret-blink" />
        </div>
      )}
    </div>
  );
}
