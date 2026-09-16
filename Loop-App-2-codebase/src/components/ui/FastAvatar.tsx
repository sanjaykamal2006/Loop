"use client";

import React, { useState, useEffect } from "react";
import { avatarLoadedCache } from "@/lib/imageOptimization";

interface FastAvatarProps {
  src?: string | null;
  name?: string;
  sizeClassName?: string;
  roundedClassName?: string;
  borderClassName?: string;
  className?: string;
  priority?: boolean;
  initialsText?: string;
  initialsClassName?: string;
  fallbackBgClassName?: string;
  title?: string;
}

export default function FastAvatar({
  src,
  name = "User",
  sizeClassName = "w-10 h-10",
  roundedClassName = "rounded-full",
  borderClassName = "",
  className = "",
  priority = false,
  initialsText,
  initialsClassName = "text-xs font-black text-[#FFC554]",
  fallbackBgClassName = "bg-[#FFC554]/20",
  title,
}: FastAvatarProps) {
  const cleanSrc = src?.trim();
  const alreadyCached = cleanSrc ? avatarLoadedCache.has(cleanSrc) : false;

  const [isLoaded, setIsLoaded] = useState(alreadyCached);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (!cleanSrc) {
      setIsLoaded(false);
      setHasError(false);
      return;
    }

    if (avatarLoadedCache.has(cleanSrc)) {
      setIsLoaded(true);
      setHasError(false);
    } else {
      setIsLoaded(false);
      setHasError(false);
    }
  }, [cleanSrc]);

  const initials = initialsText || (name ? name.trim().substring(0, 2).toUpperCase() : "U");

  return (
    <div
      className={`relative ${sizeClassName} ${roundedClassName} ${borderClassName} ${className} shrink-0 overflow-hidden select-none flex items-center justify-center`}
      title={title || name}
    >
      {/* 1. Instant Zero-Latency Placeholder (Monogram / Initials) */}
      <div
        className={`absolute inset-0 w-full h-full flex items-center justify-center ${fallbackBgClassName}`}
      >
        <span className={initialsClassName}>{initials}</span>
      </div>

      {/* 2. Optimized Image Layer with Progressive Smooth Fade */}
      {cleanSrc && !hasError && (
        <img
          src={cleanSrc}
          alt={name}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          // @ts-ignore - fetchpriority is standard HTML
          fetchpriority={priority ? "high" : "auto"}
          onLoad={() => {
            avatarLoadedCache.add(cleanSrc);
            setIsLoaded(true);
          }}
          onError={() => {
            setHasError(true);
            setIsLoaded(false);
          }}
          className={`absolute inset-0 w-full h-full object-cover ${roundedClassName} transition-opacity duration-150 ${
            isLoaded ? "opacity-100" : "opacity-0"
          }`}
        />
      )}
    </div>
  );
}
