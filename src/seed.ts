import type { DatabaseSync } from 'node:sqlite';
import { BookingService } from './services/bookingService.js';
import { SqliteBookings, SqliteCatalog } from './repositories/sqlite.js';

const SERVICES = [
  [1, 'Coupe et brushing', 'Diagnostic, coupe et coiffage', 60, 55],
  [2, 'Coloration complète', 'Couleur, soin et brushing', 120, 140],
  [3, 'Soin profond', 'Masque réparateur et massage du cuir chevelu', 30, 35],
  [4, 'Manucure gel', 'Pose de vernis semi-permanent', 45, 45],
  [5, 'Massage relaxant', 'Massage du dos et des épaules', 60, 80],
] as const;

const STAFF = [
  [1, 'Nadia Belhaj', 'Coloriste', [1, 2, 3]],
  [2, 'Karim Mezghani', 'Coiffeur', [1, 3]],
  [3, 'Lilia Chtioui', 'Esthéticienne', [4, 5]],
] as const;

/** Inserts the demo catalogue and a few bookings on the next working days. No-op if already seeded. */
export function seed(db: DatabaseSync, today: string): void {
  const count = (db.prepare('SELECT COUNT(*) AS n FROM services').get() as { n: number }).n;
  if (count > 0) return;

  for (const [id, name, description, duration, price] of SERVICES) {
    db.prepare('INSERT INTO services (id, name, description, duration_min, price_tnd) VALUES (?,?,?,?,?)').run(id, name, description, duration, price);
  }
  for (const [id, name, role, serviceIds] of STAFF) {
    db.prepare('INSERT INTO staff (id, name, role) VALUES (?,?,?)').run(id, name, role);
    for (const serviceId of serviceIds) db.prepare('INSERT INTO staff_services (staff_id, service_id) VALUES (?,?)').run(id, serviceId);
  }

  const service = new BookingService(new SqliteCatalog(db), new SqliteBookings(db), { now: () => ({ date: today, minutes: 0 }) });
  const day = (offset: number) => new Date(Date.parse(`${today}T00:00:00Z`) + offset * 86_400_000).toISOString().slice(0, 10);

  const demo: [number, number, number, number, string, string][] = [
    [1, 1, 1, 9 * 60 + 30, 'Sonia Karray', 'sonia.karray@example.com'],
    [1, 2, 2, 11 * 60, 'Emna Jaziri', 'emna.jaziri@example.com'],
    [1, 2, 1, 14 * 60, 'Hajer Ben Amor', 'hajer.benamor@example.com'],
    [1, 3, 5, 10 * 60, 'Rached Saidi', 'rached.saidi@example.com'],
    [1, 3, 4, 15 * 60 + 30, 'Dorra Fakhfakh', 'dorra.fakhfakh@example.com'],
    [2, 1, 1, 10 * 60, 'Meriem Agrebi', 'meriem.agrebi@example.com'],
    [2, 2, 3, 12 * 60, 'Yassine Dridi', 'yassine.dridi@example.com'],
  ];
  for (const [dayOffset, staffId, serviceId, startMin, clientName, clientEmail] of demo) {
    let date = day(dayOffset);
    if (new Date(`${date}T00:00:00Z`).getUTCDay() === 0) date = day(dayOffset + 1); // skip Sunday
    try {
      service.book({ serviceId, staffId, date, startMin, clientName, clientEmail });
    } catch {
      /* a demo slot may fall outside opening hours: ignore */
    }
  }
}
