import express, { type ErrorRequestHandler, type Express } from 'express';
import { fileURLToPath } from 'node:url';
import { formatMinutes } from '../domain/availability.js';
import { DomainError } from '../domain/errors.js';
import type { CatalogRepository } from '../repositories/types.js';
import type { BookingService } from '../services/bookingService.js';

const PUBLIC_DIR = fileURLToPath(new URL('../../public', import.meta.url));

const int = (value: unknown): number => Number.parseInt(String(value), 10);

export function createApp(catalog: CatalogRepository, service: BookingService): Express {
  const app = express();
  app.use(express.json());
  app.use(express.static(PUBLIC_DIR));

  app.get('/api/services', (_req, res) => res.json(catalog.listServices()));

  app.get('/api/staff', (req, res) => {
    const serviceId = req.query.serviceId ? int(req.query.serviceId) : undefined;
    const staff = catalog.listStaff().filter((s) => serviceId === undefined || s.serviceIds.includes(serviceId));
    res.json(staff);
  });

  app.get('/api/availability', (req, res) => {
    const slots = service.availability(int(req.query.serviceId), int(req.query.staffId), String(req.query.date ?? ''));
    res.json({ slots: slots.map((minutes) => ({ minutes, label: formatMinutes(minutes) })) });
  });

  app.post('/api/bookings', (req, res) => {
    const booking = service.book({
      serviceId: int(req.body?.serviceId),
      staffId: int(req.body?.staffId),
      date: String(req.body?.date ?? ''),
      startMin: int(req.body?.startMin),
      clientName: String(req.body?.clientName ?? ''),
      clientEmail: String(req.body?.clientEmail ?? ''),
    });
    res.status(201).json(booking);
  });

  app.get('/api/bookings', (req, res) => {
    res.json(service.agenda(String(req.query.date ?? '')));
  });

  app.post('/api/bookings/:id/cancel', (req, res) => {
    res.json(service.cancel(int(req.params.id)));
  });

  const onError: ErrorRequestHandler = (err, _req, res, _next) => {
    if (err instanceof DomainError) {
      res.status(err.status).json({ error: err.message });
      return;
    }
    console.error(err);
    res.status(500).json({ error: 'Unexpected server error' });
  };
  app.use(onError);

  return app;
}
