import { createApp } from './http/app.js';
import { openDatabase, SqliteBookings, SqliteCatalog } from './repositories/sqlite.js';
import { seed } from './seed.js';
import { BookingService } from './services/bookingService.js';
import type { Clock } from './domain/types.js';

const systemClock: Clock = {
  now() {
    const d = new Date();
    const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    return { date, minutes: d.getHours() * 60 + d.getMinutes() };
  },
};

const db = openDatabase(process.env.DATABASE_PATH ?? 'bookingkit.db');
if (process.env.SEED_DEMO_DATA !== '0') seed(db, systemClock.now().date);

const catalog = new SqliteCatalog(db);
const service = new BookingService(catalog, new SqliteBookings(db), systemClock);
const port = Number(process.env.PORT ?? 3000);

createApp(catalog, service).listen(port, () => console.log(`BookingKit listening on http://localhost:${port}`));
