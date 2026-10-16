import { describe, expect, it } from 'vitest';
import { ConflictError, DomainError, NotFoundError } from '../src/domain/errors.js';
import { MONDAY, fixedClock, setup } from './helpers.js';

const base = { serviceId: 1, staffId: 1, date: MONDAY, startMin: 10 * 60, clientName: 'Sonia Karray', clientEmail: 'Sonia@Example.com' };

describe('BookingService.book', () => {
  it('confirms a booking, computes its end time and normalises the e-mail', () => {
    const { service } = setup();
    const booking = service.book(base);
    expect(booking).toMatchObject({ status: 'confirmed', startMin: 600, endMin: 660, clientEmail: 'sonia@example.com' });
  });

  it('refuses a double booking of the same staff member', () => {
    const { service } = setup();
    service.book(base);
    expect(() => service.book({ ...base, serviceId: 2, startMin: 10 * 60 + 30, clientEmail: 'other@example.com' })).toThrow(ConflictError);
  });

  it('allows the same time with another staff member', () => {
    const { service } = setup();
    service.book({ ...base, serviceId: 2 });
    expect(() => service.book({ ...base, serviceId: 2, staffId: 2 })).not.toThrow();
  });

  it('refuses a staff member who does not perform the service', () => {
    const { service } = setup();
    expect(() => service.book({ ...base, staffId: 2 })).toThrow(DomainError);
  });

  it('refuses unknown services and invalid input', () => {
    const { service } = setup();
    expect(() => service.book({ ...base, serviceId: 99 })).toThrow(NotFoundError);
    expect(() => service.book({ ...base, clientEmail: 'nope' })).toThrow('valid e-mail');
    expect(() => service.book({ ...base, clientName: ' ' })).toThrow('name');
    expect(() => service.book({ ...base, date: '2030-13-45' })).toThrow('Invalid date');
  });

  it('refuses a time that is not on offer, such as after closing', () => {
    const { service } = setup();
    expect(() => service.book({ ...base, startMin: 17 * 60 + 30 })).toThrow(ConflictError);
  });
});

describe('BookingService.cancel', () => {
  it('frees the slot again', () => {
    const { service } = setup();
    const booking = service.book(base);
    service.cancel(booking.id);
    expect(service.availability(1, 1, MONDAY)).toContain(10 * 60);
  });

  it('refuses cancellations less than 24 hours before the appointment', () => {
    const { service } = setup(fixedClock('2030-03-03', 12 * 60)); // Sunday noon, appointment Monday 10:00 = 22 h later
    const booking = service.book({ ...base, date: MONDAY });
    expect(() => service.cancel(booking.id)).toThrow('24 hours');
  });

  it('refuses to cancel twice and unknown bookings', () => {
    const { service } = setup();
    const booking = service.book(base);
    service.cancel(booking.id);
    expect(() => service.cancel(booking.id)).toThrow(ConflictError);
    expect(() => service.cancel(404)).toThrow(NotFoundError);
  });
});
