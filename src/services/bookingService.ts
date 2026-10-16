import { CANCELLATION_NOTICE_MIN, availableSlots, isValidDate } from '../domain/availability.js';
import { ConflictError, DomainError, NotFoundError } from '../domain/errors.js';
import type { Booking, Clock, NewBooking } from '../domain/types.js';
import type { BookingRepository, CatalogRepository } from '../repositories/types.js';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export class BookingService {
  constructor(
    private readonly catalog: CatalogRepository,
    private readonly bookings: BookingRepository,
    private readonly clock: Clock,
  ) {}

  /** Free start times for a service with a given staff member on a given day. */
  availability(serviceId: number, staffId: number, date: string): number[] {
    const { service } = this.resolve(serviceId, staffId);
    if (!isValidDate(date)) throw new DomainError('Invalid date, expected YYYY-MM-DD');
    return availableSlots(date, service.durationMin, this.bookings.listByDate(date, staffId), this.clock);
  }

  book(input: NewBooking): Booking {
    const { service } = this.resolve(input.serviceId, input.staffId);
    const name = input.clientName?.trim() ?? '';
    if (name.length < 2) throw new DomainError('Please enter your name');
    if (!EMAIL.test(input.clientEmail ?? '')) throw new DomainError('Please enter a valid e-mail address');
    if (!isValidDate(input.date)) throw new DomainError('Invalid date, expected YYYY-MM-DD');

    // Re-check against the live schedule: the slot may have been taken since the client loaded the page.
    const free = availableSlots(input.date, service.durationMin, this.bookings.listByDate(input.date, input.staffId), this.clock);
    if (!free.includes(input.startMin)) throw new ConflictError('This time slot is no longer available');

    return this.bookings.insert({
      serviceId: service.id,
      staffId: input.staffId,
      date: input.date,
      startMin: input.startMin,
      endMin: input.startMin + service.durationMin,
      clientName: name,
      clientEmail: input.clientEmail.trim().toLowerCase(),
      status: 'confirmed',
    });
  }

  cancel(id: number): Booking {
    const booking = this.bookings.get(id);
    if (!booking) throw new NotFoundError(`Booking ${id} not found`);
    if (booking.status === 'cancelled') throw new ConflictError('This booking is already cancelled');

    const now = this.clock.now();
    const minutesUntil = dayDiff(now.date, booking.date) * 1440 + (booking.startMin - now.minutes);
    if (minutesUntil < CANCELLATION_NOTICE_MIN) {
      throw new ConflictError('Bookings can only be cancelled at least 24 hours in advance');
    }
    this.bookings.setStatus(id, 'cancelled');
    return { ...booking, status: 'cancelled' };
  }

  agenda(date: string): Booking[] {
    if (!isValidDate(date)) throw new DomainError('Invalid date, expected YYYY-MM-DD');
    return this.bookings.listByDate(date);
  }

  private resolve(serviceId: number, staffId: number) {
    const service = this.catalog.getService(serviceId);
    if (!service) throw new NotFoundError(`Service ${serviceId} not found`);
    const staff = this.catalog.getStaff(staffId);
    if (!staff) throw new NotFoundError(`Staff member ${staffId} not found`);
    if (!staff.serviceIds.includes(serviceId)) throw new DomainError(`${staff.name} does not perform "${service.name}"`);
    return { service, staff };
  }
}

function dayDiff(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
}
