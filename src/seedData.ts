import type { Service, Staff } from './domain/types.js';

/** Demo catalogue shared by the SQLite seed and the in-browser demo. */
export const SERVICES: Service[] = [
  { id: 1, name: 'Coupe et brushing', description: 'Diagnostic, coupe et coiffage', durationMin: 60, priceTnd: 55 },
  { id: 2, name: 'Coloration complète', description: 'Couleur, soin et brushing', durationMin: 120, priceTnd: 140 },
  { id: 3, name: 'Soin profond', description: 'Masque réparateur et massage du cuir chevelu', durationMin: 30, priceTnd: 35 },
  { id: 4, name: 'Manucure gel', description: 'Pose de vernis semi-permanent', durationMin: 45, priceTnd: 45 },
  { id: 5, name: 'Massage relaxant', description: 'Massage du dos et des épaules', durationMin: 60, priceTnd: 80 },
];

export const STAFF: Staff[] = [
  { id: 1, name: 'Nadia Belhaj', role: 'Coloriste', serviceIds: [1, 2, 3] },
  { id: 2, name: 'Karim Mezghani', role: 'Coiffeur', serviceIds: [1, 3] },
  { id: 3, name: 'Lilia Chtioui', role: 'Esthéticienne', serviceIds: [4, 5] },
];

/** [days from today, staffId, serviceId, start minute, client name, client e-mail] */
export type DemoBooking = [number, number, number, number, string, string];

export const DEMO_BOOKINGS: DemoBooking[] = [
  [1, 1, 1, 9 * 60 + 30, 'Sonia Karray', 'sonia.karray@example.com'],
  [1, 2, 3, 11 * 60, 'Emna Jaziri', 'emna.jaziri@example.com'],
  [1, 1, 3, 14 * 60, 'Hajer Ben Amor', 'hajer.benamor@example.com'],
  [1, 3, 5, 10 * 60, 'Rached Saidi', 'rached.saidi@example.com'],
  [1, 3, 4, 15 * 60 + 30, 'Dorra Fakhfakh', 'dorra.fakhfakh@example.com'],
  [2, 1, 1, 10 * 60, 'Meriem Agrebi', 'meriem.agrebi@example.com'],
  [2, 2, 3, 12 * 60, 'Yassine Dridi', 'yassine.dridi@example.com'],
];

export const addDays = (today: string, offset: number): string => {
  let date = new Date(Date.parse(`${today}T00:00:00Z`) + offset * 86_400_000);
  if (date.getUTCDay() === 0) date = new Date(date.getTime() + 86_400_000); // skip Sunday
  return date.toISOString().slice(0, 10);
};
