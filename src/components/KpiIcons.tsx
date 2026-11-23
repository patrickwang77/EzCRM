import React from 'react';
import type { LayoutVariant } from '../context/LayoutContext';

interface ThemedIconProps {
  variant: LayoutVariant;
  className?: string;
}

const getVariantPalette = (variant: LayoutVariant) => {
  switch (variant) {
    case 'B':
      return { light: '#5eead4', mid: '#14b8a6', dark: '#0f766e', accent: '#06b6d4' };
    case 'C':
      return { light: '#c4b5fd', mid: '#8b5cf6', dark: '#5b21b6', accent: '#6366f1' };
    case 'A':
    default:
      return { light: '#7dd3fc', mid: '#3b82f6', dark: '#1d4ed8', accent: '#0ea5e9' };
  }
};

/** 1. 多級商機轉化漏斗 (All Potential Pipeline) */
export const KpiFunnelIcon: React.FC<ThemedIconProps> = ({ variant, className = 'w-10 h-10' }) => {
  const p = getVariantPalette(variant);
  const id = `kpi-funnel-${variant}`;
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={`${id}-top`} x1="8" y1="8" x2="40" y2="20" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={p.light} />
          <stop offset="100%" stopColor={p.mid} />
        </linearGradient>
        <linearGradient id={`${id}-body`} x1="12" y1="14" x2="34" y2="42" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={p.mid} />
          <stop offset="100%" stopColor={p.dark} />
        </linearGradient>
      </defs>
      {/* Floating opportunity orbs entering funnel */}
      <circle cx="17" cy="8.5" r="2.2" fill={p.light} opacity="0.9" />
      <circle cx="24" cy="6.5" r="2.6" fill={p.accent} />
      <circle cx="31" cy="8.5" r="2" fill={p.mid} opacity="0.85" />
      {/* Funnel body (multi-tier) */}
      <path
        d="M9 14.5C9 13.4 9.9 12.5 11 12.5H37C38.1 12.5 39 13.4 39 14.5C39 15.1 38.7 15.7 38.2 16.1L28.5 25.5V36.8C28.5 37.5 28.1 38.2 27.4 38.5L21.4 41.3C20.4 41.8 19.5 41.1 19.5 40V25.5L9.8 16.1C9.3 15.7 9 15.1 9 14.5Z"
        fill={`url(#${id}-body)`}
      />
      {/* Top rim ellipse highlight */}
      <ellipse cx="24" cy="14" rx="14.5" ry="3.4" fill={`url(#${id}-top)`} />
      <ellipse cx="24" cy="14" rx="11" ry="1.8" fill="#ffffff" opacity="0.28" />
      {/* Mid stage tier ring */}
      <path
        d="M15.5 21.5C18 22.8 30 22.8 32.5 21.5"
        stroke="#ffffff"
        strokeWidth="1.6"
        strokeLinecap="round"
        opacity="0.45"
      />
      {/* Output sparkle */}
      <circle cx="24" cy="43.5" r="1.6" fill={p.light} />
    </svg>
  );
};

/** 2. 多態商機案件公事包 (BD Case Count) */
export const KpiBriefcaseIcon: React.FC<ThemedIconProps & { lostCount?: number }> = ({
  variant,
  lostCount = 0,
  className = 'w-10 h-10',
}) => {
  const p = getVariantPalette(variant);
  const id = `kpi-case-${variant}`;
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={`${id}-bag`} x1="8" y1="14" x2="38" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={p.mid} />
          <stop offset="100%" stopColor={p.dark} />
        </linearGradient>
        <linearGradient id={`${id}-flap`} x1="8" y1="14" x2="38" y2="26" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={p.light} />
          <stop offset="100%" stopColor={p.mid} />
        </linearGradient>
      </defs>
      {/* Handle */}
      <path
        d="M17.5 15V12.5C17.5 10.8 18.8 9.5 20.5 9.5H25.5C27.2 9.5 28.5 10.8 28.5 12.5V15"
        stroke={p.mid}
        strokeWidth="2.8"
        strokeLinecap="round"
      />
      {/* Main briefcase body */}
      <rect x="7" y="15" width="32" height="23" rx="4.5" fill={`url(#${id}-bag)`} />
      {/* Upper flap */}
      <path
        d="M7 19.5C7 17 9 15 11.5 15H34.5C37 15 39 17 39 19.5V23.5C39 24.6 38.1 25.5 37 25.5H9C7.9 25.5 7 24.6 7 23.5V19.5Z"
        fill={`url(#${id}-flap)`}
      />
      {/* Clasp */}
      <rect x="20.5" y="22.5" width="5" height="4.5" rx="1.4" fill="#ffffff" opacity="0.92" />
      {/* Secondary mini deal card bottom-right */}
      <rect
        x="27"
        y="28"
        width="14.5"
        height="11.5"
        rx="2.6"
        fill={p.accent}
        stroke="#ffffff"
        strokeWidth="1.4"
        strokeOpacity="0.8"
      />
      <path d="M30.5 32.5H38" stroke="#ffffff" strokeWidth="1.6" strokeLinecap="round" opacity="0.9" />
      <path d="M30.5 35.8H35.5" stroke="#ffffff" strokeWidth="1.6" strokeLinecap="round" opacity="0.65" />
      {/* Optional live lost alert badge top-right */}
      {lostCount > 0 && (
        <g>
          <circle cx="38.5" cy="12" r="6.5" fill="#f43f5e" stroke="#ffffff" strokeWidth="1.4" />
          <text
            x="38.5"
            y="14.7"
            textAnchor="middle"
            fill="#ffffff"
            fontSize="8"
            fontWeight="800"
            fontFamily="system-ui, sans-serif"
          >
            {lostCount > 9 ? '9+' : lostCount}
          </text>
        </g>
      )}
    </svg>
  );
};

/** 3. 成交增長與貨幣徽章 (BD WON AMT - Fixed Emerald Green) */
export const KpiWonIcon: React.FC<{ className?: string }> = ({ className = 'w-10 h-10' }) => (
  <svg viewBox="0 0 48 48" fill="none" className={className} aria-hidden="true">
    <defs>
      <linearGradient id="kpi-won-coin" x1="8" y1="10" x2="30" y2="34" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#34d399" />
        <stop offset="100%" stopColor="#059669" />
      </linearGradient>
      <linearGradient id="kpi-won-arrow" x1="22" y1="34" x2="42" y2="10" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#10b981" />
        <stop offset="100%" stopColor="#6ee7b7" />
      </linearGradient>
    </defs>
    {/* Subtle emerald halo */}
    <circle cx="19.5" cy="23" r="12" fill="#10b981" opacity="0.16" />
    {/* Coin badge */}
    <circle cx="19.5" cy="23" r="10.2" fill="url(#kpi-won-coin)" />
    <circle cx="19.5" cy="23" r="7.8" stroke="#ffffff" strokeWidth="1.2" strokeOpacity="0.35" />
    <text
      x="19.5"
      y="27.2"
      textAnchor="middle"
      fill="#ffffff"
      fontSize="12.5"
      fontWeight="900"
      fontFamily="system-ui, sans-serif"
    >
      $
    </text>
    {/* Rising growth arrow */}
    <path
      d="M27.5 28L33 22.5L36 25.5L41.5 14"
      stroke="url(#kpi-won-arrow)"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M36 14.5L41.8 13.5L42.5 19.3"
      stroke="#34d399"
      strokeWidth="2.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* Deal closed check pill bottom-right */}
    <circle cx="34.5" cy="34.5" r="6.5" fill="#059669" stroke="#ffffff" strokeWidth="1.4" strokeOpacity="0.85" />
    <path
      d="M31.7 34.5L33.7 36.5L37.5 32.5"
      stroke="#ffffff"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

/** 4. 流失下降與預警趨勢 (BD LOST AMT - Fixed Rose Red) */
export const KpiLostIcon: React.FC<{ className?: string }> = ({ className = 'w-10 h-10' }) => (
  <svg viewBox="0 0 48 48" fill="none" className={className} aria-hidden="true">
    <defs>
      <linearGradient id="kpi-lost-coin" x1="12" y1="8" x2="32" y2="28" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#fb7185" />
        <stop offset="100%" stopColor="#e11d48" />
      </linearGradient>
      <linearGradient id="kpi-lost-line" x1="8" y1="22" x2="40" y2="39" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#fda4af" />
        <stop offset="100%" stopColor="#f43f5e" />
      </linearGradient>
    </defs>
    {/* Subtle halo */}
    <circle cx="23.5" cy="18" r="11" fill="#f43f5e" opacity="0.16" />
    {/* Declining zigzag trend arrow */}
    <path
      d="M9 21L18.5 30.5L25.5 24.5L38.5 37.5"
      stroke="url(#kpi-lost-line)"
      strokeWidth="3.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M32.5 38H39V31.5"
      stroke="#f43f5e"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* Currency coin badge */}
    <circle cx="23.5" cy="17.5" r="8.8" fill="url(#kpi-lost-coin)" stroke="#ffffff" strokeWidth="1.3" strokeOpacity="0.4" />
    <text
      x="23.5"
      y="21.3"
      textAnchor="middle"
      fill="#ffffff"
      fontSize="11.5"
      fontWeight="900"
      fontFamily="system-ui, sans-serif"
    >
      $
    </text>
    {/* Small downward indicator */}
    <path
      d="M38.5 14V20M38.5 20L35.8 17.3M38.5 20L41.2 17.3"
      stroke="#fb7185"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

/** 5. 目標完成率靶心箭矢 (Activity Completion Rate) */
export const KpiTargetIcon: React.FC<ThemedIconProps> = ({ variant, className = 'w-10 h-10' }) => {
  const p = getVariantPalette(variant);
  const id = `kpi-target-${variant}`;
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={`${id}-ring`} x1="8" y1="10" x2="38" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={p.light} />
          <stop offset="100%" stopColor={p.dark} />
        </linearGradient>
      </defs>
      {/* Outer concentric ring */}
      <circle cx="22.5" cy="25.5" r="15" stroke={`url(#${id}-ring)`} strokeWidth="3.8" />
      {/* Middle concentric ring */}
      <circle cx="22.5" cy="25.5" r="9.5" stroke={p.mid} strokeWidth="3.2" opacity="0.8" />
      {/* Bullseye core */}
      <circle cx="22.5" cy="25.5" r="4.2" fill={p.dark} />
      {/* Precision dart arrow hitting center */}
      <path
        d="M23 25L37.5 10.5"
        stroke={p.accent}
        strokeWidth="2.8"
        strokeLinecap="round"
      />
      <path
        d="M33.5 9.5H38.5V14.5L41.5 11.5V6.5H36.5L33.5 9.5Z"
        fill={p.light}
        stroke={p.mid}
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    </svg>
  );
};
