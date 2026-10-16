# BookingKit

Online appointment booking for salons and clinics: a 4-step client booking flow and a day agenda for the team.
Written in TypeScript with Express and SQLite (the `node:sqlite` module built into Node 22).

Personal demo project written in 2026 to practise domain-driven structure and testable business rules.
All data is fictional.

## Features

- Booking flow: service, professional, date and time, contact details, confirmation.
- Only free slots are offered; the slot is checked again on submit, so two clients cannot take the same time.
- Agenda: one column per professional, bookings drawn at their real time and length, daily revenue and booked hours.
- Cancellation with a 24-hour notice rule.

Business rules (in `src/domain` and `src/services`):

- Opening hours 09:00 to 18:00, Monday to Saturday, slots every 30 minutes.
- A service must fit before closing time; overlapping bookings of the same professional are refused.
- 30 minutes of notice for same-day bookings; no booking in the past.
- A professional can only be booked for the services they perform.
- A booking can only be cancelled at least 24 hours before it starts.

## Architecture

```
src/
  domain/         pure rules: availability.ts (slots), types.ts, errors.ts
  services/       bookingService.ts (use cases: book, cancel, availability, agenda)
  repositories/   types.ts (interfaces), sqlite.ts (production), memory.ts (tests)
  http/           app.ts (Express routes and error mapping)
  seed.ts server.ts
public/           booking page, agenda page, plain CSS and ES modules (no build step)
tests/            domain, service, HTTP and SQLite tests
```

The time is injected through a `Clock`, so every rule that depends on "now" is tested with a fixed date.
Services depend on repository interfaces, which is why the same tests run on memory and on SQLite.
Domain errors carry their HTTP status (404, 409, 422) and one error handler turns them into JSON responses.

## API

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/services` | Service catalogue |
| GET | `/api/staff?serviceId=` | Professionals, optionally for one service |
| GET | `/api/availability?serviceId=&staffId=&date=` | Free start times |
| POST | `/api/bookings` | Create a booking |
| GET | `/api/bookings?date=` | Agenda of a day |
| POST | `/api/bookings/:id/cancel` | Cancel a booking |

## Run

Requires Node 22.13 or later.

```bash
npm install
npm start          # http://localhost:3000
npm test           # 22 tests
npm run typecheck
```

The first start creates `bookingkit.db` with demo data (`SEED_DEMO_DATA=0` to start empty, `PORT` and `DATABASE_PATH` to configure).

## Screenshots

In `docs/screenshots/`: service choice, time slots, confirmation and the day agenda.
