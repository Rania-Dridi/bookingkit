import type { Clock } from '../src/domain/types.js';
import { createApp } from '../src/http/app.js';
import { MemoryBookings, MemoryCatalog } from '../src/repositories/memory.js';
import { BookingService } from '../src/services/bookingService.js';

export const MONDAY = '2030-03-04'; // a Monday far in the future
export const SUNDAY = '2030-03-10';

export const fixedClock = (date = '2030-03-01', minutes = 8 * 60): Clock => ({ now: () => ({ date, minutes }) });

export function setup(clock: Clock = fixedClock()) {
  const catalog = new MemoryCatalog(
    [
      { id: 1, name: 'Coupe', description: '', durationMin: 60, priceTnd: 50 },
      { id: 2, name: 'Soin', description: '', durationMin: 30, priceTnd: 30 },
    ],
    [
      { id: 1, name: 'Nadia', role: 'Coiffeuse', serviceIds: [1, 2] },
      { id: 2, name: 'Lilia', role: 'Esthéticienne', serviceIds: [2] },
    ],
  );
  const bookings = new MemoryBookings();
  const service = new BookingService(catalog, bookings, clock);
  return { catalog, bookings, service, app: createApp(catalog, service) };
}
