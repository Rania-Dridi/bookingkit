/**
 * In-browser demo. The real BookingService runs in the page and `fetch('/api/...')` is answered locally,
 * so the unchanged front end works on a static host. Bookings are kept in localStorage.
 */
import { formatMinutes } from '../src/domain/availability.js';
import { DomainError } from '../src/domain/errors.js';
import type { Booking, Clock } from '../src/domain/types.js';
import { MemoryCatalog } from '../src/repositories/memory.js';
import type { BookingRepository } from '../src/repositories/types.js';
import { DEMO_BOOKINGS, SERVICES, STAFF, addDays } from '../src/seedData.js';
import { BookingService } from '../src/services/bookingService.js';

const STORAGE_KEY = 'bookingkit-demo-v1';

const clock: Clock = {
  now() {
    const d = new Date();
    const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    return { date, minutes: d.getHours() * 60 + d.getMinutes() };
  },
};

class LocalBookings implements BookingRepository {
  private rows: Booking[] = [];
  private nextId = 1;

  constructor() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null');
      if (saved?.rows) {
        this.rows = saved.rows;
        this.nextId = saved.nextId;
      }
    } catch {
      /* storage unavailable: the demo still works for this visit */
    }
  }
  private persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ rows: this.rows, nextId: this.nextId }));
    } catch {
      /* ignore */
    }
  }
  get empty() {
    return this.rows.length === 0;
  }
  listByDate(date: string, staffId?: number) {
    return this.rows.filter((b) => b.date === date && (staffId === undefined || b.staffId === staffId));
  }
  get(id: number) {
    return this.rows.find((b) => b.id === id);
  }
  insert(booking: Omit<Booking, 'id' | 'createdAt'>) {
    const row: Booking = { ...booking, id: this.nextId++, createdAt: new Date().toISOString() };
    this.rows.push(row);
    this.persist();
    return row;
  }
  setStatus(id: number, status: Booking['status']) {
    const row = this.get(id);
    if (row) row.status = status;
    this.persist();
  }
  reset() {
    this.rows = [];
    this.nextId = 1;
    this.persist();
  }
}

const catalog = new MemoryCatalog(SERVICES, STAFF);
const store = new LocalBookings();
const service = new BookingService(catalog, store, clock);

function seedIfEmpty() {
  if (!store.empty) return;
  const today = clock.now().date;
  const seeder = new BookingService(catalog, store, { now: () => ({ date: today, minutes: 0 }) });
  for (const [offset, staffId, serviceId, startMin, clientName, clientEmail] of DEMO_BOOKINGS) {
    try {
      seeder.book({ serviceId, staffId, date: addDays(today, offset), startMin, clientName, clientEmail });
    } catch {
      /* ignore a slot outside opening hours */
    }
  }
}
seedIfEmpty();

const int = (v: unknown) => Number.parseInt(String(v), 10);

function route(method: string, url: URL, body: Record<string, unknown>): unknown {
  const q = url.searchParams;
  const path = url.pathname;
  if (method === 'GET' && path === '/api/services') return catalog.listServices();
  if (method === 'GET' && path === '/api/staff') {
    const sid = q.get('serviceId') ? int(q.get('serviceId')) : undefined;
    return catalog.listStaff().filter((s) => sid === undefined || s.serviceIds.includes(sid));
  }
  if (method === 'GET' && path === '/api/availability') {
    const slots = service.availability(int(q.get('serviceId')), int(q.get('staffId')), q.get('date') ?? '');
    return { slots: slots.map((minutes) => ({ minutes, label: formatMinutes(minutes) })) };
  }
  if (method === 'GET' && path === '/api/bookings') return service.agenda(q.get('date') ?? '');
  if (method === 'POST' && path === '/api/bookings') {
    return {
      __status: 201,
      body: service.book({
        serviceId: int(body.serviceId), staffId: int(body.staffId), date: String(body.date ?? ''), startMin: int(body.startMin),
        clientName: String(body.clientName ?? ''), clientEmail: String(body.clientEmail ?? ''),
      }),
    };
  }
  const cancel = path.match(/^\/api\/bookings\/(\d+)\/cancel$/);
  if (method === 'POST' && cancel) return service.cancel(int(cancel[1]));
  throw new DomainError(`No route for ${method} ${path}`, 404);
}

const realFetch = window.fetch.bind(window);
window.fetch = async (input, init) => {
  const raw = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
  const url = new URL(raw, location.href);
  if (!url.pathname.startsWith('/api/')) return realFetch(input, init);
  const method = (init?.method ?? 'GET').toUpperCase();
  const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
  try {
    const body = init?.body ? JSON.parse(String(init.body)) : {};
    const result = route(method, url, body) as { __status?: number; body?: unknown };
    return result && typeof result === 'object' && '__status' in result ? json(result.body, result.__status) : json(result);
  } catch (err) {
    if (err instanceof DomainError) return json({ error: err.message }, err.status);
    return json({ error: 'Unexpected demo error' }, 500);
  }
};

// Small banner so visitors know the data is local to their browser.
window.addEventListener('DOMContentLoaded', () => {
  const bar = document.createElement('div');
  bar.setAttribute('style', 'position:relative;z-index:5;background:#12142b;color:#fff;font:600 13px Manrope,system-ui,sans-serif;text-align:center;padding:8px 12px');
  bar.innerHTML = 'Mode démo : les réservations restent dans votre navigateur. <button id="demo-reset" style="margin-left:10px;border:1px solid #fff5;background:transparent;color:#fff;border-radius:999px;padding:2px 12px;font:inherit;cursor:pointer">Réinitialiser</button>';
  document.body.prepend(bar);
  document.getElementById('demo-reset')?.addEventListener('click', () => {
    store.reset();
    seedIfEmpty();
    location.reload();
  });
});
