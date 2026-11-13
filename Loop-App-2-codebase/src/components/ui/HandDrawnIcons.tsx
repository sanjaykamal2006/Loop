"use client";

import React from "react";

interface IconProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string;
  color?: string;
  className?: string;
}

/**
 * Hand-sketched organic arrow inspired by Looseleaf arrow recipes.
 */
export function HandDrawnArrow({
  size = 18,
  color = "currentColor",
  className = "",
  direction = "right",
  ...props
}: IconProps & { direction?: "right" | "left" | "up" | "down" }) {
  const rotation =
    direction === "left"
      ? "rotate-180"
      : direction === "up"
      ? "-rotate-90"
      : direction === "down"
      ? "rotate-90"
      : "";

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`inline-block shrink-0 ${rotation} ${className}`}
      {...props}
    >
      {/* Hand-drawn stem with subtle natural wobble */}
      <path
        d="M2.5 12.2C6.8 11.9 12.2 12.1 19.8 12.0"
        stroke={color}
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Upper arrow wing with hand-drawn angle */}
      <path
        d="M13.8 6.5C15.6 8.3 17.8 10.4 20.2 11.9"
        stroke={color}
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Lower arrow wing */}
      <path
        d="M14.1 17.6C16.0 15.7 18.1 13.5 20.3 12.1"
        stroke={color}
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Hand-sketched Map Pin
 */
export function HandDrawnMapPin({
  size = 18,
  color = "currentColor",
  className = "",
  ...props
}: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`inline-block shrink-0 ${className}`}
      {...props}
    >
      <path
        d="M12.1 2.4C7.7 2.3 4.2 5.8 4.3 10.2C4.4 13.9 7.8 17.6 11.3 21.4C11.7 21.8 12.4 21.8 12.8 21.4C16.3 17.5 19.8 13.8 19.8 10.1C19.8 5.7 16.4 2.4 12.1 2.4Z"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="10" r="2.8" stroke={color} strokeWidth="1.8" />
    </svg>
  );
}

/**
 * Hand-sketched Plus icon
 */
export function HandDrawnPlus({
  size = 18,
  color = "currentColor",
  className = "",
  ...props
}: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`inline-block shrink-0 ${className}`}
      {...props}
    >
      <path
        d="M12.1 4.2C11.9 8.6 12.2 15.3 12.0 19.8"
        stroke={color}
        strokeWidth="2.3"
        strokeLinecap="round"
      />
      <path
        d="M4.3 11.8C8.8 12.1 15.4 11.9 19.7 12.2"
        stroke={color}
        strokeWidth="2.3"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * Hand-sketched Search Magnifier
 */
export function HandDrawnSearch({
  size = 18,
  color = "currentColor",
  className = "",
  ...props
}: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`inline-block shrink-0 ${className}`}
      {...props}
    >
      <path
        d="M10.8 18.2C14.8 18.1 18.1 14.8 18.1 10.8C18.0 6.7 14.7 3.5 10.7 3.6C6.6 3.7 3.5 7.0 3.6 11.1C3.7 15.1 6.9 18.2 10.8 18.2Z"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M16.2 16.3L20.8 20.8"
        stroke={color}
        strokeWidth="2.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * Hand-sketched Clock
 */
export function HandDrawnClock({
  size = 18,
  color = "currentColor",
  className = "",
  ...props
}: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`inline-block shrink-0 ${className}`}
      {...props}
    >
      <circle cx="12" cy="12" r="9.2" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <path
        d="M12 7.2V12.1L15.6 14.3"
        stroke={color}
        strokeWidth="2.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Hand-sketched Users
 */
export function HandDrawnUsers({
  size = 18,
  color = "currentColor",
  className = "",
  ...props
}: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`inline-block shrink-0 ${className}`}
      {...props}
    >
      <circle cx="9" cy="8" r="3.6" stroke={color} strokeWidth="1.9" />
      <path
        d="M3.5 19.2C3.8 16.1 6.3 14.2 9.2 14.2C12.1 14.2 14.5 16.1 14.8 19.2"
        stroke={color}
        strokeWidth="1.9"
        strokeLinecap="round"
      />
      <path
        d="M15.5 6.3C16.8 6.7 17.6 7.8 17.6 9.1C17.6 10.4 16.7 11.5 15.4 11.9"
        stroke={color}
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <path
        d="M17.5 15.2C19.1 15.9 20.3 17.3 20.6 19.1"
        stroke={color}
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * Hand-sketched Checkmark
 */
export function HandDrawnCheck({
  size = 18,
  color = "currentColor",
  className = "",
  ...props
}: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`inline-block shrink-0 ${className}`}
      {...props}
    >
      <path
        d="M4.5 12.8L9.6 17.9L19.8 6.8"
        stroke={color}
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Hand-sketched Cross
 */
export function HandDrawnCross({
  size = 18,
  color = "currentColor",
  className = "",
  ...props
}: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`inline-block shrink-0 ${className}`}
      {...props}
    >
      <path
        d="M5.5 5.8L18.6 18.4"
        stroke={color}
        strokeWidth="2.3"
        strokeLinecap="round"
      />
      <path
        d="M18.7 5.7L5.4 18.5"
        stroke={color}
        strokeWidth="2.3"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * Authentic Looseleaf Washi Tape strip with zig-zag serrated torn edges.
 */
export function WashiTape({
  className = "",
  color = "masking",
  width = 68,
  height = 18,
  angle = -1.2,
}: {
  className?: string;
  color?: "masking" | "yellow" | "coral" | "mint" | "blue";
  width?: number;
  height?: number;
  angle?: number;
}) {
  const colorMap = {
    masking: "fill-[#F5EEDC]/80 stroke-[#8E887F]/30",
    yellow: "fill-[#F8DC4C]/70 stroke-[#A87F0C]/30",
    coral: "fill-[#F7C08E]/75 stroke-[#D9776A]/30",
    mint: "fill-[#CFE6A8]/70 stroke-[#7FA37C]/30",
    blue: "fill-[#BCD8F0]/75 stroke-[#2C4F9E]/30",
  };

  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 80 20"
      className={`pointer-events-none drop-shadow-[0_1px_2px_rgba(58,44,30,0.15)] ${className}`}
      style={{ transform: `rotate(${angle}deg)` }}
      preserveAspectRatio="none"
    >
      {/* Torn zig-zag edges on left and right */}
      <path
        d="M 4 2 
           L 76 2 
           L 78 5 L 76 8 L 78 11 L 76 14 L 78 17 L 76 20 
           L 4 20 
           L 2 17 L 4 14 L 2 11 L 4 8 L 2 5 Z"
        className={colorMap[color]}
        strokeWidth="0.8"
      />
      {/* Semi-transparent tape sheen line */}
      <line
        x1="8"
        y1="5"
        x2="72"
        y2="5"
        stroke="rgba(255,255,255,0.45)"
        strokeWidth="1"
        strokeDasharray="4 2"
      />
    </svg>
  );
}
