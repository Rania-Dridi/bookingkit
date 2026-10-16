// Day agenda: one column per professional, bookings drawn at their real time and length.
const OPEN = 9 * 60;
const CLOSE = 18 * 60;
const PX_PER_HOUR = 60;

const $date = document.getElementById('date');
const $agenda = document.getElementById('agenda');
const $kpis = document.getElementById('kpis');
const $label = document.getElementById('dateLabel');

const pad = (n) => String(n).padStart(2, '0');
const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const label = (m) => `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const json = async (url, options) => {
  const res = await fetch(url, options);
  const body = await res.json();
  if (!res.ok) throw new Error(body.error || 'Erreur');
  return body;
};

let catalog = null;

async function load() {
  const date = $date.value;
  $label.textContent = new Date(`${date}T12:00:00`).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const [bookings] = await Promise.all([json(`/api/bookings?date=${date}`), catalog ?? loadCatalog()]);
  render(bookings);
}

async function loadCatalog() {
  const [services, staff] = await Promise.all([json('/api/services'), json('/api/staff')]);
  catalog = { services: new Map(services.map((s) => [s.id, s])), staff };
}

function render(bookings) {
  const confirmed = bookings.filter((b) => b.status === 'confirmed');
  const revenue = confirmed.reduce((sum, b) => sum + (catalog.services.get(b.serviceId)?.priceTnd ?? 0), 0);
  const hours = confirmed.reduce((sum, b) => sum + (b.endMin - b.startMin), 0) / 60;
  $kpis.innerHTML = [['Rendez-vous', confirmed.length], ['Chiffre d\'affaires prévu', `${revenue} TND`], ['Heures réservées', `${hours.toFixed(1)} h`]]
    .map(([k, v]) => `<div class="kpi"><span>${k}</span><b>${v}</b></div>`).join('');

  const height = ((CLOSE - OPEN) / 60) * PX_PER_HOUR;
  const hourLabels = Array.from({ length: (CLOSE - OPEN) / 60 + 1 }, (_, i) => `<div class="hour" style="top:${i * PX_PER_HOUR}px">${pad(9 + i)}:00</div>`).join('');
  const columns = catalog.staff.map((person, index) => {
    const blocks = bookings.filter((b) => b.staffId === person.id).map((b) => {
      const service = catalog.services.get(b.serviceId);
      const top = ((b.startMin - OPEN) / 60) * PX_PER_HOUR;
      const h = ((b.endMin - b.startMin) / 60) * PX_PER_HOUR - 4;
      const cls = b.status === 'cancelled' ? 'cancelled' : `c${index % 3}`;
      return `<div class="blk ${cls}" style="top:${top}px;height:${h}px"><div><strong>${esc(b.clientName)}</strong><small>${esc(service?.name ?? '')} · ${label(b.startMin)}</small></div>
        ${b.status === 'confirmed' && h > 62 ? `<button data-id="${b.id}">Annuler</button>` : ''}</div>`;
    }).join('');
    return `<div><div class="head">${esc(person.name)}<small>${esc(person.role)}</small></div><div class="col" style="height:${height}px">${blocks}</div></div>`;
  }).join('');

  $agenda.style.gridTemplateColumns = `64px repeat(${catalog.staff.length}, 1fr)`;
  $agenda.innerHTML = `<div><div class="head">&nbsp;<small>&nbsp;</small></div><div class="timecol" style="height:${height}px">${hourLabels}</div></div>${columns}`;

  $agenda.querySelectorAll('button[data-id]').forEach((b) => b.addEventListener('click', async () => {
    try {
      await json(`/api/bookings/${b.dataset.id}/cancel`, { method: 'POST' });
    } catch (err) {
      $label.innerHTML = `<span class="err">${esc(err.message)}</span>`;
      return;
    }
    load();
  }));
}

const shift = (days) => { const d = new Date(`${$date.value}T12:00:00`); d.setDate(d.getDate() + days); $date.value = iso(d); load(); };
document.getElementById('prev').onclick = () => shift(-1);
document.getElementById('next').onclick = () => shift(1);
$date.addEventListener('change', load);

// Open on the next working day that has bookings (the demo data starts tomorrow).
(() => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  if (d.getDay() === 0) d.setDate(d.getDate() + 1);
  $date.value = iso(d);
  load();
})();
