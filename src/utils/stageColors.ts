import type { LayoutVariant } from '../context/LayoutContext';

export interface StageColorToken {
  hex: [string, string]; // [gradientStart, gradientEnd] for SVG funnel
  barBg: string;         // Top accent bar & dot solid fill
  dotBg: string;         // Gantt milestone dot bg + text
  pillClass: string;     // Unified oval badge (bg + text + border) for Kanban minimap, Table, Gantt
}

// Fixed semantic colors for the two most critical stages (always pinned to last two stages)
const WON_TOKEN: StageColorToken = {
  hex: ['#10b981', '#059669'],
  barBg: 'bg-emerald-500',
  dotBg: 'bg-emerald-500 text-white',
  pillClass:
    'bg-emerald-500/12 text-emerald-700 dark:text-emerald-300 border-emerald-500/35',
};

const LOSS_TOKEN: StageColorToken = {
  hex: ['#f43f5e', '#e11d48'],
  barBg: 'bg-rose-500',
  dotBg: 'bg-rose-500 text-white',
  pillClass:
    'bg-rose-500/12 text-rose-700 dark:text-rose-300 border-rose-500/35',
};

// High-contrast progression tokens for active stages (0 .. totalStages - 3)
// Distinct hues so every stage is unmistakable at a glance, while harmonizing with each variant
const ACTIVE_PALETTES: Record<LayoutVariant, StageColorToken[]> = {
  // Variant A (Cobalt Workspace): Slate -> Sky -> Cobalt Indigo -> Warm Amber -> Fuchsia
  A: [
    {
      hex: ['#64748b', '#475569'],
      barBg: 'bg-slate-500',
      dotBg: 'bg-slate-500 text-white',
      pillClass: 'bg-slate-500/12 text-slate-700 dark:text-slate-300 border-slate-500/35',
    },
    {
      hex: ['#0ea5e9', '#0284c7'],
      barBg: 'bg-sky-500',
      dotBg: 'bg-sky-500 text-white',
      pillClass: 'bg-sky-500/12 text-sky-700 dark:text-sky-300 border-sky-500/35',
    },
    {
      hex: ['#4f46e5', '#4338ca'],
      barBg: 'bg-indigo-600',
      dotBg: 'bg-indigo-600 text-white',
      pillClass: 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/35',
    },
    {
      hex: ['#f59e0b', '#d97706'],
      barBg: 'bg-amber-500',
      dotBg: 'bg-amber-500 text-white',
      pillClass: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/35',
    },
    {
      hex: ['#a855f7', '#9333ea'],
      barBg: 'bg-purple-500',
      dotBg: 'bg-purple-500 text-white',
      pillClass: 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/35',
    },
  ],
  // Variant B (Teal Executive): Slate -> Bright Cyan -> Deep Blue -> Warm Orange-Amber -> Indigo
  B: [
    {
      hex: ['#64748b', '#475569'],
      barBg: 'bg-slate-500',
      dotBg: 'bg-slate-500 text-white',
      pillClass: 'bg-slate-500/12 text-slate-700 dark:text-slate-300 border-slate-500/35',
    },
    {
      hex: ['#06b6d4', '#0891b2'],
      barBg: 'bg-cyan-500',
      dotBg: 'bg-cyan-500 text-white',
      pillClass: 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border-cyan-500/35',
    },
    {
      hex: ['#2563eb', '#1d4ed8'],
      barBg: 'bg-blue-600',
      dotBg: 'bg-blue-600 text-white',
      pillClass: 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/35',
    },
    {
      hex: ['#f59e0b', '#d97706'],
      barBg: 'bg-amber-500',
      dotBg: 'bg-amber-500 text-white',
      pillClass: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/35',
    },
    {
      hex: ['#6366f1', '#4f46e5'],
      barBg: 'bg-indigo-500',
      dotBg: 'bg-indigo-500 text-white',
      pillClass: 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/35',
    },
  ],
  // Variant C (Violet Copilot): Slate -> Electric Sky -> Royal Violet -> Warm Amber -> Fuchsia
  C: [
    {
      hex: ['#64748b', '#475569'],
      barBg: 'bg-slate-500',
      dotBg: 'bg-slate-500 text-white',
      pillClass: 'bg-slate-500/12 text-slate-700 dark:text-slate-300 border-slate-500/35',
    },
    {
      hex: ['#0284c7', '#0369a1'],
      barBg: 'bg-sky-600',
      dotBg: 'bg-sky-600 text-white',
      pillClass: 'bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/35',
    },
    {
      hex: ['#7c3aed', '#6d28d9'],
      barBg: 'bg-violet-600',
      dotBg: 'bg-violet-600 text-white',
      pillClass: 'bg-violet-500/15 text-violet-700 dark:text-violet-300 border-violet-500/35',
    },
    {
      hex: ['#f59e0b', '#d97706'],
      barBg: 'bg-amber-500',
      dotBg: 'bg-amber-500 text-white',
      pillClass: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/35',
    },
    {
      hex: ['#d946ef', '#c026d3'],
      barBg: 'bg-fuchsia-500',
      dotBg: 'bg-fuchsia-500 text-white',
      pillClass: 'bg-fuchsia-500/15 text-fuchsia-700 dark:text-fuchsia-300 border-fuchsia-500/35',
    },
  ],
};

/**
 * Returns the single-source-of-truth color token for a stage across
 * Dashboard Funnel, Kanban Minimap/Columns, Table oval pills, Gantt stage badges & dots, and Copilot Panel.
 * Automatically pins the last stage to Rose (Loss) and second-to-last stage to Emerald (Won),
 * regardless of whether the user configures 5, 6, or 7 stages.
 */
export function getStageColor(
  stageIndex: number,
  totalStages: number,
  variant: LayoutVariant
): StageColorToken {
  if (totalStages >= 2 && stageIndex === totalStages - 1) return LOSS_TOKEN;
  if (totalStages >= 2 && stageIndex === totalStages - 2) return WON_TOKEN;
  const palette = ACTIVE_PALETTES[variant];
  const safeIdx = stageIndex >= 0 ? stageIndex : 0;
  return palette[safeIdx % palette.length];
}
