import type { EntityTag } from '../services/db';

const RULES: { pattern: RegExp; label: string; tone: EntityTag['tone'] }[] = [
  { pattern: /價格|報價|折扣|議價|預算|費用|成本|殺價/i, label: '議價/預算', tone: 'warn' },
  { pattern: /競品|對手|比較|替代/i, label: '競品風險', tone: 'risk' },
  { pattern: /暫停|延後|凍結|流失|拒絕|卡關/i, label: '進度風險', tone: 'risk' },
  { pattern: /POC|測試|壓測|樣本|規格|API|導入|技術/i, label: '技術驗證', tone: 'info' },
  { pattern: /合約|簽約|用印|法務|SLA|成交/i, label: '合約/成交', tone: 'good' },
  { pattern: /決策|協理|總監|處長|副總|主管|高層/i, label: '決策層介入', tone: 'good' },
  { pattern: /簡報|Demo|展示|拜訪|會議|餐敘/i, label: '互動推進', tone: 'neutral' },
];

/**
 * Deterministic preview of future LLM auto-tagging on accumulated activity text.
 * Any saved tags on the entity are merged first, followed by inferred preview tags.
 */
export function inferPreviewTags(texts: string[], existingTags?: EntityTag[]): EntityTag[] {
  const result: EntityTag[] = [...(existingTags || [])];
  const seen = new Set(result.map(t => t.label));
  const combined = texts.join(' ');

  for (const rule of RULES) {
    if (rule.pattern.test(combined) && !seen.has(rule.label)) {
      result.push({ label: rule.label, source: 'ai', tone: rule.tone });
      seen.add(rule.label);
    }
    if (result.length >= 3) break;
  }
  return result;
}

export function getTagToneClass(tone?: EntityTag['tone']): string {
  switch (tone) {
    case 'good':
      return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25';
    case 'warn':
      return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25';
    case 'risk':
      return 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/25';
    case 'info':
      return 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/25';
    default:
      return 'bg-slate-500/10 text-slate-600 dark:text-slate-300 border-slate-500/25';
  }
}
