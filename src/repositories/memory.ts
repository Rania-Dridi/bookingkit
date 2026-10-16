import type { Booking, Service, Staff } from '../domain/types.js';
import type { BookingRepository, CatalogRepository } from './types.js';

/** In-memory implementations used by the unit tests; the app uses the SQLite ones. */
export class MemoryCatalog implements CatalogRepository {
  constructor(
    private readonly services: Service[],
    private readonly staff: Staff[],
  ) {}
  listServices = () => this.services;
  getService = (id: number) => this.services.find((s) => s.id === id);
  listStaff = () => this.staff;
  getStaff = (id: number) => this.staff.find((s) => s.id === id);
}

export class MemoryBookings implements BookingRepository {
  private rows: Booking[] = [];
  private nextId = 1;

  listByDate(date: string, staffId?: number): Booking[] {
    return this.rows.filter((b) => b.date === date && (staffId === undefined || b.staffId === staffId));
  }
  get(id: number): Booking | undefined {
    return this.rows.find((b) => b.id === id);
  }
  insert(booking: Omit<Booking, 'id' | 'createdAt'>): Booking {
    const row: Booking = { ...booking, id: this.nextId++, createdAt: new Date().toISOString() };
    this.rows.push(row);
    return row;
  }
  setStatus(id: number, status: Booking['status']): void {
    const row = this.get(id);
    if (row) row.status = status;
  }
}
