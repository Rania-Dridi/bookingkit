import { describe, expect, it } from 'vitest';
import { availableSlots, formatMinutes, isValidDate, isWorkingDay } from '../src/domain/availability.js';
import { MONDAY, SUNDAY, fixedClock } from './helpers.js';

describe('availableSlots', () => {
  it('offers every half hour between opening and closing for a 60 minute service', () => {
    const slots = availableSlots(MONDAY, 60, [], fixedClock());
    expect(slots[0]).toBe(9 * 60);
    expect(slots.at(-1)).toBe(17 * 60); // 17:00 + 60 min = closing time
    expect(slots).toHaveLength(17);
  });

  it('is closed on Sundays', () => {
    expect(isWorkingDay(SUNDAY)).toBe(false);
    expect(availableSlots(SUNDAY, 30, [], fixedClock())).toEqual([]);
  });

  it('removes slots that overlap a confirmed booking, including partial overlaps', () => {
    const slots = availableSlots(MONDAY, 60, [{ startMin: 10 * 60, endMin: 11 * 60, status: 'confirmed' }], fixedClock());
    expect(slots).not.toContain(9 * 60 + 30); // would end at 10:30
    expect(slots).not.toContain(10 * 60);
    expect(slots).not.toContain(10 * 60 + 30);
    expect(slots).toContain(9 * 60); // ends exactly when the booking starts
    expect(slots).toContain(11 * 60); // starts exactly when it ends
  });

  it('ignores cancelled bookings', () => {
    const slots = availableSlots(MONDAY, 60, [{ startMin: 10 * 60, endMin: 11 * 60, status: 'cancelled' }], fixedClock());
    expect(slots).toContain(10 * 60);
  });

  it('requires 30 minutes of notice on the current day and nothing for past days', () => {
    const today = availableSlots(MONDAY, 30, [], fixedClock(MONDAY, 10 * 60 + 10));
    expect(today[0]).toBe(11 * 60); // 10:10 + 30 min = 10:40, next slot is 11:00
    expect(availableSlots(MONDAY, 30, [], fixedClock('2030-03-05', 0))).toEqual([]);
  });

  it('does not offer a start time that would run past closing', () => {
    expect(availableSlots(MONDAY, 120, [], fixedClock()).at(-1)).toBe(16 * 60);
  });
});

describe('helpers', () => {
  it('validates real calendar dates only', () => {
    expect(isValidDate('2030-02-28')).toBe(true);
    expect(isValidDate('2030-02-30')).toBe(false);
    expect(isValidDate('30/02/2030')).toBe(false);
  });

  it('formats minutes as HH:MM', () => {
    expect(formatMinutes(9 * 60 + 5)).toBe('09:05');
  });
});
