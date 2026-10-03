/**
 * lib/time.ts
 *
 * Club-local time helpers. All DB timestamps are UTC; the club's timezone
 * (club.timezone, e.g. "Asia/Kolkata") is used only at the edges: turning a
 * picked "date + hour" into an instant, and formatting instants for humans.
 * Uses Intl only, no tz library.
 */

export type DateKey = `${number}-${number}-${number}`; // YYYY-MM-DD

const partsCache = new Map<string, Intl.DateTimeFormat>();

function formatter(tz: string): Intl.DateTimeFormat {
  let f = partsCache.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      weekday: "short",
    });
    partsCache.set(tz, f);
  }
  return f;
}

export interface LocalParts {
  year: number;
  month: number; // 1-12
  day: number;
  hour: number;
  minute: number;
  second: number;
  weekday: number; // 0 = Sunday
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function toLocalParts(date: Date, tz: string): LocalParts {
  const map: Record<string, string> = {};
  for (const p of formatter(tz).formatToParts(date)) map[p.type] = p.value;
  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    hour: Number(map.hour),
    minute: Number(map.minute),
    second: Number(map.second),
    weekday: WEEKDAYS.indexOf(map.weekday),
  };
}

/** Offset of `tz` from UTC in minutes at the given instant. */
export function tzOffsetMinutes(date: Date, tz: string): number {
  const p = toLocalParts(date, tz);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return Math.round((asUtc - date.getTime()) / 60_000);
}

/** Build the UTC instant for a wall-clock time in `tz`. */
export function localToUtc(
  tz: string,
  year: number,
  month: number,
  day: number,
  hour = 0,
  minute = 0
): Date {
  const guess = Date.UTC(year, month - 1, day, hour, minute);
  const offset1 = tzOffsetMinutes(new Date(guess), tz);
  const candidate = new Date(guess - offset1 * 60_000);
  // Second pass handles the rare case of crossing a DST boundary.
  const offset2 = tzOffsetMinutes(candidate, tz);
  return offset2 === offset1 ? candidate : new Date(guess - offset2 * 60_000);
}

export function parseDateKey(key: string): { year: number; month: number; day: number } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key);
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return { year, month, day };
}

export function toDateKey(date: Date, tz: string): DateKey {
  const p = toLocalParts(date, tz);
  return `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}` as DateKey;
}

export function todayKey(tz: string): DateKey {
  return toDateKey(new Date(), tz);
}

export function addDaysToKey(key: string, days: number): DateKey {
  const p = parseDateKey(key);
  if (!p) throw new Error(`Bad date key ${key}`);
  const d = new Date(Date.UTC(p.year, p.month - 1, p.day + days));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(
    d.getUTCDate()
  ).padStart(2, "0")}` as DateKey;
}

/** Start of a club-local day as a UTC instant. */
export function dayStart(key: string, tz: string): Date {
  const p = parseDateKey(key);
  if (!p) throw new Error(`Bad date key ${key}`);
  return localToUtc(tz, p.year, p.month, p.day, 0, 0);
}

/** "HH:MM" → minutes since midnight. */
export function hhmmToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + (m || 0);
}

export function isWeekend(date: Date, tz: string): boolean {
  const w = toLocalParts(date, tz).weekday;
  return w === 0 || w === 6;
}

export function formatTime(date: Date, tz: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: tz,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })
    .format(date)
    .replace(/\s?(am|pm)/i, (s) => s.trim().toLowerCase());
}

export function formatDayLabel(key: string, tz: string): string {
  const d = dayStart(key, tz);
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: tz,
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(d);
}

export function formatDateTime(date: Date, tz: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: tz,
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}

export function minutesToLabel(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const suffix = h >= 12 ? "pm" : "am";
  const hh = h % 12 === 0 ? 12 : h % 12;
  return m === 0 ? `${hh}${suffix}` : `${hh}:${String(m).padStart(2, "0")}${suffix}`;
}
