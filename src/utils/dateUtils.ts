/**
 * Location-agnostic local calendar date helpers.
 * Uses native Temporal.PlainDate when available and falls back to explicit local calendar
 * fields (getFullYear/getMonth/getDate) so UTC+8 00:00-07:59 never drifts to yesterday.
 */

type TemporalPlainDateLike = {
  year: number;
  month: number;
  day: number;
  toString(): string;
  add(duration: { days?: number; months?: number }): TemporalPlainDateLike;
};

type TemporalGlobal = {
  Now?: { plainDateISO?: () => TemporalPlainDateLike };
  PlainDate?: { from?: (v: string) => TemporalPlainDateLike };
};

const getTemporal = (): TemporalGlobal | undefined =>
  (globalThis as unknown as { Temporal?: TemporalGlobal }).Temporal;

const pad2 = (n: number): string => String(n).padStart(2, '0');

/** Format a local Date object into YYYY-MM-DD using local calendar components (never UTC). */
export const formatLocalDate = (d: Date): string =>
  `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

/** Return today's local calendar date as YYYY-MM-DD without UTC midnight drift. */
export const getLocalTodayIso = (): string => {
  const temporalNow = getTemporal()?.Now?.plainDateISO;
  if (typeof temporalNow === 'function') {
    return temporalNow().toString();
  }
  return formatLocalDate(new Date());
};

/** Return local date offset by `deltaDays` as YYYY-MM-DD. */
export const getLocalDateOffsetIso = (deltaDays: number): string => {
  const temporalNow = getTemporal()?.Now?.plainDateISO;
  if (typeof temporalNow === 'function') {
    return temporalNow().add({ days: deltaDays }).toString();
  }
  const d = new Date();
  d.setDate(d.getDate() + deltaDays);
  return formatLocalDate(d);
};

/** Return a local datetime string `YYYY-MM-DD HH:mm` offset by `deltaDays` at given hour:minute. */
export const getLocalDateTimeOffset = (
  deltaDays: number,
  hour = 10,
  minute = 0
): string => `${getLocalDateOffsetIso(deltaDays)} ${pad2(hour)}:${pad2(minute)}`;

/**
 * Parse a YYYY-MM-DD (or YYYY-MM-DD HH:mm / ISO) string into a local-midnight Date
 * without UTC-parsing drift (avoids `new Date('2026-03-01')` shifting in negative offsets).
 */
export const parseLocalCalendarDate = (input: string): Date => {
  const clean = input.trim().slice(0, 10);
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(clean);
  if (m) {
    return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  }
  return new Date(input.replace(' ', 'T'));
};
