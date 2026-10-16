import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { MONDAY, setup } from './helpers.js';

const payload = { serviceId: 1, staffId: 1, date: MONDAY, startMin: 600, clientName: 'Sonia Karray', clientEmail: 'sonia@example.com' };

describe('HTTP API', () => {
  it('lists services and only the staff who perform a service', async () => {
    const { app } = setup();
    expect((await request(app).get('/api/services')).body).toHaveLength(2);
    const staff = (await request(app).get('/api/staff').query({ serviceId: 1 })).body;
    expect(staff.map((s: { name: string }) => s.name)).toEqual(['Nadia']);
  });

  it('returns labelled availability that shrinks after a booking', async () => {
    const { app } = setup();
    const query = { serviceId: 1, staffId: 1, date: MONDAY };
    const before = (await request(app).get('/api/availability').query(query)).body.slots;
    expect(before[0]).toEqual({ minutes: 540, label: '09:00' });

    const created = await request(app).post('/api/bookings').send(payload);
    expect(created.status).toBe(201);

    const after = (await request(app).get('/api/availability').query(query)).body.slots;
    expect(after.length).toBeLessThan(before.length);
  });

  it('maps business errors to HTTP status codes', async () => {
    const { app } = setup();
    await request(app).post('/api/bookings').send(payload);
    expect((await request(app).post('/api/bookings').send(payload)).status).toBe(409);
    expect((await request(app).post('/api/bookings').send({ ...payload, serviceId: 99 })).status).toBe(404);
    expect((await request(app).post('/api/bookings').send({ ...payload, clientEmail: 'bad' })).status).toBe(422);
  });

  it('cancels a booking and exposes the agenda', async () => {
    const { app } = setup();
    const { id } = (await request(app).post('/api/bookings').send(payload)).body;
    expect((await request(app).get('/api/bookings').query({ date: MONDAY })).body).toHaveLength(1);
    const cancelled = await request(app).post(`/api/bookings/${id}/cancel`);
    expect(cancelled.body.status).toBe('cancelled');
  });
});
