"use client";

import React, { useState, useRef, useCallback } from "react";
import { RotateCw, Check } from "lucide-react";
import { haptic } from "@/lib/haptics";

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
  isDark: boolean;
  isPaper?: boolean;
  className?: string;
  disabled?: boolean;
}

const PULL_THRESHOLD = 52;
const MAX_PULL = 76;

export default function PullToRefresh({
  onRefresh,
  children,
  isDark,
  isPaper = false,
  className = "",
  disabled = false,
}: PullToRefreshProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pullY, setPullY] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const startYRef = useRef<number | null>(null);
  const isPullingRef = useRef(false);
  const thresholdReachedRef = useRef(false);

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (disabled || isRefreshing) return;
    const container = containerRef.current;
    if (!container) return;

    // Only engage pull-to-refresh when scrolled to top
    if (container.scrollTop <= 2) {
      startYRef.current = e.touches[0].clientY;
      isPullingRef.current = true;
      thresholdReachedRef.current = false;
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!isPullingRef.current || startYRef.current === null || isRefreshing || disabled) return;
    const container = containerRef.current;
    if (!container || container.scrollTop > 2) {
      isPullingRef.current = false;
      setPullY(0);
      return;
    }

    const currentY = e.touches[0].clientY;
    const deltaY = currentY - startYRef.current;

    if (deltaY > 0) {
      // Elastic rubber-banding curve
      const damped = Math.min(Math.pow(deltaY, 0.82) * 1.8, MAX_PULL);
      setPullY(damped);

      // Trigger physical tactile click once when crossing threshold
      if (damped >= PULL_THRESHOLD && !thresholdReachedRef.current) {
        thresholdReachedRef.current = true;
        haptic.snap();
      } else if (damped < PULL_THRESHOLD && thresholdReachedRef.current) {
        thresholdReachedRef.current = false;
      }
    } else {
      setPullY(0);
    }
  };

  const handleTouchEnd = useCallback(async () => {
    if (!isPullingRef.current || isRefreshing || disabled) return;
    isPullingRef.current = false;
    startYRef.current = null;

    if (pullY >= PULL_THRESHOLD) {
      setIsRefreshing(true);
      setPullY(44);
      haptic.medium();

      try {
        await onRefresh();
        setShowSuccess(true);
        haptic.success();
        await new Promise((resolve) => setTimeout(resolve, 400));
      } catch {
        // Fallback gracefully on refresh error
      } finally {
        setShowSuccess(false);
        setIsRefreshing(false);
        setPullY(0);
        thresholdReachedRef.current = false;
      }
    } else {
      setPullY(0);
      thresholdReachedRef.current = false;
    }
  }, [pullY, isRefreshing, disabled, onRefresh]);

  const rotationDeg = isRefreshing ? 0 : Math.min((pullY / PULL_THRESHOLD) * 360, 360);
  const progressRatio = Math.min(pullY / PULL_THRESHOLD, 1);

  // Badge styles per theme
  let badgeStyle = "bg-zinc-900/90 text-white border-white/10 shadow-lg";
  let spinnerColor = "text-[#FFC554]";

  if (isPaper) {
    badgeStyle = "bg-[#FAF8F5] text-[#2A2420] border-2 border-[#2A2420] shadow-[2px_2px_0px_#2A2420]";
    spinnerColor = "text-[#2A2420]";
  } else if (!isDark) {
    badgeStyle = "bg-white text-zinc-900 border-black/10 shadow-lg";
    spinnerColor = "text-[#881337]";
  }

  return (
    <div
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      className={`relative w-full ${className}`}
    >
      {/* Pull Indicator Dropdown */}
      <div
        aria-hidden="true"
        className="absolute top-0 left-0 right-0 flex justify-center pointer-events-none z-30 transition-transform duration-100 ease-out"
        style={{
          transform: `translateY(${Math.max(pullY - 38, -42)}px)`,
          opacity: pullY > 6 || isRefreshing ? 1 : 0,
        }}
      >
        <div
          className={`px-3 py-1.5 rounded-full border flex items-center gap-1.5 text-xs font-black uppercase tracking-wider backdrop-blur-md transition-all ${badgeStyle}`}
        >
          {showSuccess ? (
            <>
              <Check size={13} strokeWidth={3} className="text-emerald-500" />
              <span className="text-[10px]">Updated</span>
            </>
          ) : (
            <>
              <RotateCw
                size={13}
                strokeWidth={2.8}
                className={`${spinnerColor} ${isRefreshing ? "animate-spin" : ""}`}
                style={{
                  transform: isRefreshing ? undefined : `rotate(${rotationDeg}deg)`,
                }}
              />
              <span className="text-[10px]">
                {isRefreshing
                  ? "Refreshing..."
                  : progressRatio >= 1
                  ? "Release to refresh"
                  : "Pull down"}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Main scrollable body with spring translateY during pull */}
      <div
        style={{
          transform: `translateY(${pullY * 0.48}px)`,
          transition: isPullingRef.current ? "none" : "transform 0.28s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
        {children}
      </div>
    </div>
  );
}
