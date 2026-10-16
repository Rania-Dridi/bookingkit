import { DatabaseSync } from 'node:sqlite';
import type { Booking, Service, Staff } from '../domain/types.js';
import type { BookingRepository, CatalogRepository } from './types.js';

export function openDatabase(path: string): DatabaseSync {
  const db = new DatabaseSync(path);
  db.exec(`
    PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS services (
      id INTEGER PRIMARY KEY, name TEXT NOT NULL, description TEXT NOT NULL,
      duration_min INTEGER NOT NULL, price_tnd INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS staff (
      id INTEGER PRIMARY KEY, name TEXT NOT NULL, role TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS staff_services (
      staff_id INTEGER NOT NULL REFERENCES staff(id), service_id INTEGER NOT NULL REFERENCES services(id),
      PRIMARY KEY (staff_id, service_id)
    );
    CREATE TABLE IF NOT EXISTS bookings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      service_id INTEGER NOT NULL REFERENCES services(id),
      staff_id INTEGER NOT NULL REFERENCES staff(id),
      date TEXT NOT NULL, start_min INTEGER NOT NULL, end_min INTEGER NOT NULL,
      client_name TEXT NOT NULL, client_email TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'confirmed', created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_bookings_day ON bookings(date, staff_id);
  `);
  return db;
}

type Row = Record<string, unknown>;

export class SqliteCatalog implements CatalogRepository {
  constructor(private readonly db: DatabaseSync) {}

  listServices(): Service[] {
    return (this.db.prepare('SELECT * FROM services ORDER BY id').all() as Row[]).map(toService);
  }
  getService(id: number): Service | undefined {
    const row = this.db.prepare('SELECT * FROM services WHERE id = ?').get(id) as Row | undefined;
    return row ? toService(row) : undefined;
  }
  listStaff(): Staff[] {
    return (this.db.prepare('SELECT * FROM staff ORDER BY id').all() as Row[]).map((r) => this.toStaff(r));
  }
  getStaff(id: number): Staff | undefined {
    const row = this.db.prepare('SELECT * FROM staff WHERE id = ?').get(id) as Row | undefined;
    return row ? this.toStaff(row) : undefined;
  }
  private toStaff(row: Row): Staff {
    const ids = this.db.prepare('SELECT service_id FROM staff_services WHERE staff_id = ?').all(row.id as number) as Row[];
    return { id: row.id as number, name: row.name as string, role: row.role as string, serviceIds: ids.map((r) => r.service_id as number) };
  }
}

export class SqliteBookings implements BookingRepository {
  constructor(private readonly db: DatabaseSync) {}

  listByDate(date: string, staffId?: number): Booking[] {
    const rows =
      staffId === undefined
        ? this.db.prepare('SELECT * FROM bookings WHERE date = ? ORDER BY start_min').all(date)
        : this.db.prepare('SELECT * FROM bookings WHERE date = ? AND staff_id = ? ORDER BY start_min').all(date, staffId);
    return (rows as Row[]).map(toBooking);
  }
  get(id: number): Booking | undefined {
    const row = this.db.prepare('SELECT * FROM bookings WHERE id = ?').get(id) as Row | undefined;
    return row ? toBooking(row) : undefined;
  }
  insert(b: Omit<Booking, 'id' | 'createdAt'>): Booking {
    const createdAt = new Date().toISOString();
    const result = this.db
      .prepare('INSERT INTO bookings (service_id, staff_id, date, start_min, end_min, client_name, client_email, status, created_at) VALUES (?,?,?,?,?,?,?,?,?)')
      .run(b.serviceId, b.staffId, b.date, b.startMin, b.endMin, b.clientName, b.clientEmail, b.status, createdAt);
    return { ...b, id: Number(result.lastInsertRowid), createdAt };
  }
  setStatus(id: number, status: Booking['status']): void {
    this.db.prepare('UPDATE bookings SET status = ? WHERE id = ?').run(status, id);
  }
}

const toService = (r: Row): Service => ({
  id: r.id as number, name: r.name as string, description: r.description as string,
  durationMin: r.duration_min as number, priceTnd: r.price_tnd as number,
});

const toBooking = (r: Row): Booking => ({
  id: r.id as number, serviceId: r.service_id as number, staffId: r.staff_id as number, date: r.date as string,
  startMin: r.start_min as number, endMin: r.end_min as number, clientName: r.client_name as string,
  clientEmail: r.client_email as string, status: r.status as Booking['status'], createdAt: r.created_at as string,
});
