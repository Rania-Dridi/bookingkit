import type { Booking, Clock } from './types.js';

export const OPENING_MIN = 9 * 60;
export const CLOSING_MIN = 18 * 60;
export const SLOT_STEP_MIN = 30;
/** A booking cannot start less than this many minutes from now. */
export const MIN_NOTICE_MIN = 30;
/** Clients can cancel until this many minutes before the appointment. */
export const CANCELLATION_NOTICE_MIN = 24 * 60;

/** Day of week for a 'YYYY-MM-DD' string: 0 = Sunday. Parsed in UTC so it never shifts with the machine timezone. */
export function weekday(date: string): number {
  return new Date(`${date}T00:00:00Z`).getUTCDay();
}

export function isWorkingDay(date: string): boolean {
  return weekday(date) !== 0; // closed on Sundays
}

export function isValidDate(date: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const parsed = new Date(`${date}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().startsWith(date);
}

export function overlaps(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
  return aStart < bEnd && bStart < aEnd;
}

/**
 * Start times (minutes) at which a service of `durationMin` can be booked for one staff member on one day.
 * Pure function: every input is explicit.
 */
export function availableSlots(
  date: string,
  durationMin: number,
  bookings: Pick<Booking, 'startMin' | 'endMin' | 'status'>[],
  clock: Clock,
): number[] {
  if (!isWorkingDay(date)) return [];

  const now = clock.now();
  if (date < now.date) return [];
  const earliest = date === now.date ? now.minutes + MIN_NOTICE_MIN : 0;
  const busy = bookings.filter((b) => b.status === 'confirmed');

  const slots: number[] = [];
  for (let start = OPENING_MIN; start + durationMin <= CLOSING_MIN; start += SLOT_STEP_MIN) {
    if (start < earliest) continue;
    if (busy.some((b) => overlaps(start, start + durationMin, b.startMin, b.endMin))) continue;
    slots.push(start);
  }
  return slots;
}

export function formatMinutes(total: number): string {
  const h = Math.floor(total / 60).toString().padStart(2, '0');
  const m = (total % 60).toString().padStart(2, '0');
  return `${h}:${m}`;
}
