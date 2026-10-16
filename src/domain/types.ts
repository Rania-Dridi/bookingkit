/** Domain types. Dates are 'YYYY-MM-DD' strings and times are minutes since midnight, so there is no timezone arithmetic. */

export interface Service {
  id: number;
  name: string;
  description: string;
  durationMin: number;
  priceTnd: number;
}

export interface Staff {
  id: number;
  name: string;
  role: string;
  /** Services this person can perform. */
  serviceIds: number[];
}

export type BookingStatus = 'confirmed' | 'cancelled';

export interface Booking {
  id: number;
  serviceId: number;
  staffId: number;
  date: string;
  startMin: number;
  endMin: number;
  clientName: string;
  clientEmail: string;
  status: BookingStatus;
  createdAt: string;
}

export interface NewBooking {
  serviceId: number;
  staffId: number;
  date: string;
  startMin: number;
  clientName: string;
  clientEmail: string;
}

export interface Clock {
  /** Current local date and time, injectable so rules can be tested. */
  now(): { date: string; minutes: number };
}
