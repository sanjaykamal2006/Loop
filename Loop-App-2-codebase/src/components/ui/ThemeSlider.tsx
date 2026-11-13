"use client";

import React, { useRef, useState, useCallback, useEffect } from "react";
import { Moon, Sun, FileText } from "lucide-react";
import { triggerHaptic } from "@/lib/haptics";
import type { AppTheme } from "@/lib/types";

interface ThemeSliderProps {
  currentTheme: AppTheme;
  onSelectTheme: (theme: AppTheme) => void;
  isDark: boolean;
  isPaper?: boolean;
  compact?: boolean;
  className?: string;
}

const THEMES: { id: AppTheme; label: string; icon: typeof Moon }[] = [
  { id: "dark", label: "Dark", icon: Moon },
  { id: "light", label: "Light", icon: Sun },
  { id: "paper", label: "Paper", icon: FileText },
];

export default function ThemeSlider({
  currentTheme,
  onSelectTheme,
  isDark,
  isPaper = false,
  compact = false,
  className = "",
}: ThemeSliderProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragProgress, setDragProgress] = useState<number | null>(null);

  // Active index: 0 = dark, 1 = light, 2 = paper
  const activeIndex = THEMES.findIndex((t) => t.id === currentTheme);
  const safeActiveIndex = activeIndex === -1 ? 0 : activeIndex;

  // Track pointer for swipe / drag
  const handlePointerDown = (e: React.PointerEvent) => {
    // Only drag on primary pointer
    if (e.button !== 0) return;
    setIsDragging(true);
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    updateDrag(e.clientX);
  };

  const updateDrag = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const relativeX = clientX - rect.left;
    const itemWidth = rect.width / THEMES.length;
    const progress = Math.max(0, Math.min(THEMES.length - 1, (relativeX - itemWidth / 2) / itemWidth));
    setDragProgress(progress);
  }, []);

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    updateDrag(e.clientX);
  };

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging) return;
      setIsDragging(false);

      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const relativeX = e.clientX - rect.left;
        const itemWidth = rect.width / THEMES.length;
        const targetIndex = Math.max(0, Math.min(THEMES.length - 1, Math.round(relativeX / itemWidth)));
        const newTheme = THEMES[targetIndex]?.id;
        if (newTheme && newTheme !== currentTheme) {
          triggerHaptic(12);
          onSelectTheme(newTheme);
        }
      }
      setDragProgress(null);
    },
    [isDragging, currentTheme, onSelectTheme]
  );

  const handleSelect = (theme: AppTheme) => {
    if (theme === currentTheme) return;
    triggerHaptic(10);
    onSelectTheme(theme);
  };

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault();
      const nextIdx = (safeActiveIndex + 1) % THEMES.length;
      handleSelect(THEMES[nextIdx].id);
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      const prevIdx = (safeActiveIndex - 1 + THEMES.length) % THEMES.length;
      handleSelect(THEMES[prevIdx].id);
    }
  };

  // Current visual position: during drag, use dragProgress; otherwise use safeActiveIndex
  const visualIndex = dragProgress !== null ? dragProgress : safeActiveIndex;
  const thumbTranslatePct = visualIndex * 100;

  // Dynamic Theme Colors
  let sliderBg = "bg-white/10 border-white/10";
  let thumbBg = "bg-[#FFC554] text-black shadow-md";
  let inactiveText = "text-zinc-400 hover:text-zinc-200";

  if (isPaper) {
    sliderBg = compact
      ? "bg-[#FAF8F5] border border-[#2A2420] shadow-[1.5px_1.5px_0px_#2A2420]"
      : "bg-[#FAF8F5] border-2 border-[#2A2420] shadow-[2px_2px_0px_#2A2420]";
    thumbBg = "bg-[#FFC554] text-[#2A2420] border border-[#2A2420] shadow-[1px_1px_0px_#2A2420]";
    inactiveText = "text-[#6B6660] hover:text-[#2A2420]";
  } else if (!isDark) {
    sliderBg = "bg-black/5 border-black/10";
    thumbBg = "bg-[#881337] text-white shadow-md";
    inactiveText = "text-zinc-600 hover:text-zinc-900";
  }

  return (
    <div
      ref={containerRef}
      role="radiogroup"
      aria-label="Select app theme"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      className={`relative flex items-center ${
        compact ? "p-0.5 rounded-xl text-[10.5px]" : "p-1 rounded-2xl text-xs"
      } border select-none cursor-pointer touch-none ${sliderBg} ${className}`}
      style={{ minWidth: compact ? "180px" : "210px" }}
    >
      {/* Sliding Active Pill Indicator */}
      <div
        className={`absolute ${
          compact
            ? "top-0.5 bottom-0.5 left-0.5 w-[calc((100%-4px)/3)] rounded-[9px]"
            : "top-1 bottom-1 left-1 w-[calc((100%-8px)/3)] rounded-xl"
        } transition-transform ${
          isDragging ? "duration-75 ease-out" : "duration-250 ease-[cubic-bezier(0.16,1,0.3,1)]"
        } ${thumbBg}`}
        style={{
          transform: `translateX(${thumbTranslatePct}%)`,
        }}
      />

      {/* Segment Buttons */}
      {THEMES.map((theme, index) => {
        const Icon = theme.icon;
        const isActive = index === safeActiveIndex;

        return (
          <button
            key={theme.id}
            type="button"
            role="radio"
            aria-checked={isActive}
            aria-label={`${theme.label} theme`}
            onClick={() => handleSelect(theme.id)}
            className={`relative z-10 flex-1 ${
              compact ? "py-1 gap-1 text-[10.5px] rounded-[9px]" : "py-1.5 gap-1.5 text-xs rounded-xl"
            } flex items-center justify-center font-black uppercase tracking-wider transition-colors duration-200 focus:outline-none ${
              isActive
                ? isPaper
                  ? "text-[#2A2420] font-black"
                  : isDark
                  ? "text-black font-extrabold"
                  : "text-white font-extrabold"
                : inactiveText
            }`}
          >
            <Icon
              size={compact ? 11 : 13}
              strokeWidth={isActive ? 2.8 : 2}
              className={isActive && isPaper ? "text-[#2A2420]" : ""}
            />
            <span>{theme.label}</span>
          </button>
        );
      })}
    </div>
  );
}
