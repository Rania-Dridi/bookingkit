import { describe, expect, it } from 'vitest';
import { openDatabase, SqliteBookings, SqliteCatalog } from '../src/repositories/sqlite.js';
import { seed } from '../src/seed.js';
import { BookingService } from '../src/services/bookingService.js';
import { MONDAY, fixedClock } from './helpers.js';

describe('SQLite repositories', () => {
  it('seeds a catalogue once and enforces the same booking rules as the memory repositories', () => {
    const db = openDatabase(':memory:');
    seed(db, '2030-03-01');
    seed(db, '2030-03-01'); // idempotent

    const catalog = new SqliteCatalog(db);
    expect(catalog.listServices()).toHaveLength(5);
    expect(catalog.getStaff(1)?.serviceIds).toEqual([1, 2, 3]);

    const service = new BookingService(catalog, new SqliteBookings(db), fixedClock());
    const input = { serviceId: 3, staffId: 2, date: MONDAY, startMin: 9 * 60, clientName: 'Test User', clientEmail: 't@example.com' };
    const booking = service.book(input);
    expect(booking.id).toBeGreaterThan(0);
    expect(() => service.book(input)).toThrow('no longer available');
    service.cancel(booking.id);
    expect(service.availability(3, 2, MONDAY)).toContain(9 * 60);
  });
});
