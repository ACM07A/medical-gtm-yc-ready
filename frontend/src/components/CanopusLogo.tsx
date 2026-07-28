import React from 'react';

interface CanopusLogoProps {
  className?: string;
  size?: number;
}

export function CanopusLogo({ className = "w-8 h-8", size }: CanopusLogoProps) {
  return (
    <svg
      viewBox="0 0 500 500"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={size ? { width: size, height: size } : undefined}
    >
      <defs>
        {/* Teal gradient for upper & left region */}
        <linearGradient id="canopusTealGrad" x1="50" y1="50" x2="300" y2="300" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#00DFCC" />
          <stop offset="50%" stopColor="#00B4A4" />
          <stop offset="100%" stopColor="#0D9488" />
        </linearGradient>

        {/* Navy gradient for lower & right region */}
        <linearGradient id="canopusNavyGrad" x1="200" y1="200" x2="450" y2="450" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#0D2040" />
          <stop offset="100%" stopColor="#071224" />
        </linearGradient>

        {/* Clip path for the rounded medical cross */}
        <clipPath id="crossClip">
          <path d="M 205,46 H 295 C 322,46 336,60 336,87 V 164 H 413 C 440,164 454,178 454,205 V 295 C 454,322 440,336 413,336 H 336 V 413 C 336,440 322,454 295,454 H 205 C 178,454 164,440 164,413 V 336 H 87 C 60,336 46,322 46,295 V 205 C 46,178 60,164 87,164 H 164 V 87 C 164,60 178,46 205,46 Z" />
        </clipPath>
      </defs>

      {/* Main Group clipped to Cross shape */}
      <g clipPath="url(#crossClip)">
        {/* Upper Teal Background */}
        <rect x="0" y="0" width="500" height="500" fill="url(#canopusTealGrad)" />

        {/* Lower Navy Section (Split beneath swoosh) */}
        <path
          d="M 130,460 C 180,310 270,230 460,180 L 460,460 Z"
          fill="url(#canopusNavyGrad)"
        />

        {/* Sweeping White Arc / Swoosh */}
        <path
          d="M 130,460 C 130,460 160,320 235,260 C 310,200 460,180 460,180 C 460,180 300,215 205,285 C 150,325 130,460 130,460 Z"
          fill="#FFFFFF"
        />

        {/* Four-point Sparkle Star in the upper center */}
        <path
          d="M 250,150 Q 250,210 180,210 Q 250,210 250,270 Q 250,210 320,210 Q 250,210 250,150 Z"
          fill="#FFFFFF"
        />
      </g>
    </svg>
  );
}
