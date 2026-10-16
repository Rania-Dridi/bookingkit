import type { Booking, Service, Staff } from '../domain/types.js';

export interface CatalogRepository {
  listServices(): Service[];
  getService(id: number): Service | undefined;
  listStaff(): Staff[];
  getStaff(id: number): Staff | undefined;
}

export interface BookingRepository {
  /** Bookings for one day, optionally restricted to one staff member. */
  listByDate(date: string, staffId?: number): Booking[];
  get(id: number): Booking | undefined;
  insert(booking: Omit<Booking, 'id' | 'createdAt'>): Booking;
  setStatus(id: number, status: Booking['status']): void;
}
