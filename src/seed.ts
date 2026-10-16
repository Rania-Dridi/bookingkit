import type { DatabaseSync } from 'node:sqlite';
import { SqliteBookings, SqliteCatalog } from './repositories/sqlite.js';
import { DEMO_BOOKINGS, SERVICES, STAFF, addDays } from './seedData.js';
import { BookingService } from './services/bookingService.js';

/** Inserts the demo catalogue and a few bookings on the next working days. No-op if already seeded. */
export function seed(db: DatabaseSync, today: string): void {
  const count = (db.prepare('SELECT COUNT(*) AS n FROM services').get() as { n: number }).n;
  if (count > 0) return;

  for (const s of SERVICES) {
    db.prepare('INSERT INTO services (id, name, description, duration_min, price_tnd) VALUES (?,?,?,?,?)').run(s.id, s.name, s.description, s.durationMin, s.priceTnd);
  }
  for (const p of STAFF) {
    db.prepare('INSERT INTO staff (id, name, role) VALUES (?,?,?)').run(p.id, p.name, p.role);
    for (const serviceId of p.serviceIds) db.prepare('INSERT INTO staff_services (staff_id, service_id) VALUES (?,?)').run(p.id, serviceId);
  }

  const service = new BookingService(new SqliteCatalog(db), new SqliteBookings(db), { now: () => ({ date: today, minutes: 0 }) });
  for (const [dayOffset, staffId, serviceId, startMin, clientName, clientEmail] of DEMO_BOOKINGS) {
    try {
      service.book({ serviceId, staffId, date: addDays(today, dayOffset), startMin, clientName, clientEmail });
    } catch {
      /* a demo slot may fall outside opening hours: ignore */
    }
  }
}
