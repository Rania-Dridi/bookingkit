// Booking flow: service -> professional -> date and time -> details -> confirmation.
const STEPS = ['Prestation', 'Professionnel', 'Créneau', 'Coordonnées'];
const state = { step: 0, services: [], staff: [], service: null, staffMember: null, date: null, slots: [], slot: null, booking: null, error: '' };

const $panel = document.getElementById('panel');
const $summary = document.getElementById('summary');

const api = async (url, options) => {
  const res = await fetch(url, options);
  const body = await res.json();
  if (!res.ok) throw new Error(body.error || 'Une erreur est survenue');
  return body;
};
const el = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstChild; };
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const pad = (n) => String(n).padStart(2, '0');
const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const label = (m) => `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
const longDate = (s) => new Date(`${s}T12:00:00`).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

function nextDays(count) {
  const out = [];
  const d = new Date();
  for (let i = 0; i < count; i += 1) { out.push(new Date(d)); d.setDate(d.getDate() + 1); }
  return out;
}

function renderSteps() {
  return `<div class="steps">${STEPS.map((name, i) => `<div class="step ${i === state.step ? 'on' : ''} ${i < state.step ? 'done' : ''}"><b>${i < state.step ? '✓' : i + 1}</b>${name}</div>`).join('')}</div>`;
}

function renderSummary() {
  const rows = [];
  if (state.service) rows.push(['Prestation', state.service.name]);
  if (state.staffMember) rows.push(['Avec', state.staffMember.name]);
  if (state.date) rows.push(['Date', longDate(state.date)]);
  if (state.slot !== null) rows.push(['Heure', label(state.slot)]);
  $summary.innerHTML = `<h3>Votre rendez-vous</h3>
    ${rows.length ? rows.map(([k, v]) => `<div class="sum-row"><span>${k}</span><b>${esc(v)}</b></div>`).join('') : '<p class="sub">Votre sélection apparaîtra ici.</p>'}
    ${state.service ? `<div class="total"><span>Total</span><span>${state.service.priceTnd} TND</span></div><p class="sub" style="margin:8px 0 0">Durée : ${state.service.durationMin} min · paiement sur place</p>` : ''}`;
}

function view() {
  renderSummary();
  if (state.booking) return confirmation();
  return [serviceStep, staffStep, slotStep, detailsStep][state.step]();
}

function mount(html, bind) {
  $panel.innerHTML = renderSteps() + html;
  if (bind) bind();
}

function serviceStep() {
  mount(`<h2>Choisissez une prestation</h2><p class="sub">Tous les tarifs sont en dinars tunisiens.</p>
    <div class="choices">${state.services.map((s) => `<button class="choice ${state.service?.id === s.id ? 'sel' : ''}" data-id="${s.id}">
      <strong>${esc(s.name)}</strong><small>${esc(s.description)}</small><div class="meta"><span>${s.durationMin} min</span><span>${s.priceTnd} TND</span></div></button>`).join('')}</div>`,
  () => $panel.querySelectorAll('.choice').forEach((b) => b.addEventListener('click', async () => {
    state.service = state.services.find((s) => s.id === Number(b.dataset.id));
    state.staff = await api(`/api/staff?serviceId=${state.service.id}`);
    state.staffMember = null; state.date = null; state.slot = null; state.step = 1; view();
  })));
}

function staffStep() {
  mount(`<h2>Avec qui ?</h2><p class="sub">Les professionnels qui réalisent « ${esc(state.service.name)} ».</p>
    <div class="choices">${state.staff.map((p) => `<button class="choice ${state.staffMember?.id === p.id ? 'sel' : ''}" data-id="${p.id}">
      <div class="avatar">${esc(p.name.split(' ').map((w) => w[0]).join(''))}</div><strong>${esc(p.name)}</strong><small>${esc(p.role)}</small></button>`).join('')}</div>
    <div class="actions"><button class="btn ghost" id="back">Retour</button></div>`,
  () => {
    $panel.querySelectorAll('.choice').forEach((b) => b.addEventListener('click', () => {
      state.staffMember = state.staff.find((p) => p.id === Number(b.dataset.id));
      state.date = null; state.slot = null; state.step = 2; view();
    }));
    document.getElementById('back').onclick = () => { state.step = 0; view(); };
  });
}

async function loadSlots() {
  const q = new URLSearchParams({ serviceId: state.service.id, staffId: state.staffMember.id, date: state.date });
  state.slots = (await api(`/api/availability?${q}`)).slots;
}

function slotStep() {
  const days = nextDays(12);
  mount(`<h2>Choisissez un créneau</h2><p class="sub">Fermé le dimanche. Les créneaux affichés sont libres.</p>
    <div class="days">${days.map((d) => `<button class="day ${state.date === iso(d) ? 'sel' : ''}" data-date="${iso(d)}" ${d.getDay() === 0 ? 'disabled' : ''}>
      <small>${d.toLocaleDateString('fr-FR', { weekday: 'short' })}</small><b>${d.getDate()}</b></button>`).join('')}</div>
    <div id="slots">${state.date ? '' : '<p class="empty">Sélectionnez un jour pour voir les horaires.</p>'}</div>
    <div class="actions"><button class="btn ghost" id="back">Retour</button><button class="btn" id="next" ${state.slot === null ? 'disabled' : ''}>Continuer</button></div>`,
  async () => {
    $panel.querySelectorAll('.day').forEach((b) => b.addEventListener('click', async () => {
      state.date = b.dataset.date; state.slot = null; await loadSlots(); view();
    }));
    if (state.date) {
      const box = document.getElementById('slots');
      box.innerHTML = state.slots.length
        ? `<div class="slots">${state.slots.map((s) => `<button class="slot ${state.slot === s.minutes ? 'sel' : ''}" data-m="${s.minutes}">${s.label}</button>`).join('')}</div>`
        : '<p class="empty">Aucun créneau libre ce jour-là. Essayez une autre date.</p>';
      box.querySelectorAll('.slot').forEach((b) => b.addEventListener('click', () => { state.slot = Number(b.dataset.m); view(); }));
    }
    document.getElementById('back').onclick = () => { state.step = 1; view(); };
    document.getElementById('next').onclick = () => { state.step = 3; view(); };
  });
}

function detailsStep() {
  mount(`<h2>Vos coordonnées</h2><p class="sub">Pour confirmer votre rendez-vous du ${esc(longDate(state.date))} à ${label(state.slot)}.</p>
    <form id="form"><label for="name">Nom complet</label><input id="name" name="name" autocomplete="name" required minlength="2">
    <label for="email">E-mail</label><input id="email" name="email" type="email" autocomplete="email" required>
    ${state.error ? `<div class="err">${esc(state.error)}</div>` : ''}
    <div class="actions"><button type="button" class="btn ghost" id="back">Retour</button><button class="btn" type="submit">Confirmer le rendez-vous</button></div></form>`,
  () => {
    document.getElementById('back').onclick = () => { state.step = 2; state.error = ''; view(); };
    document.getElementById('form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const data = new FormData(e.target);
      try {
        state.booking = await api('/api/bookings', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ serviceId: state.service.id, staffId: state.staffMember.id, date: state.date, startMin: state.slot, clientName: data.get('name'), clientEmail: data.get('email') }),
        });
        state.error = '';
      } catch (err) {
        state.error = err.message;
        if (/no longer available/.test(err.message)) { state.slot = null; state.step = 2; await loadSlots(); }
      }
      view();
    });
  });
}

function confirmation() {
  $panel.innerHTML = `<div class="ok"><div class="tick">✓</div><h2>Rendez-vous confirmé</h2>
    <p class="sub">${esc(state.service.name)} avec ${esc(state.staffMember.name)}<br>${esc(longDate(state.booking.date))} à ${label(state.booking.startMin)}</p>
    <div class="actions" style="justify-content:center"><button class="btn" id="again">Prendre un autre rendez-vous</button><a class="btn ghost" href="/admin.html">Voir l'agenda</a></div></div>`;
  document.getElementById('again').onclick = () => { Object.assign(state, { step: 0, service: null, staffMember: null, date: null, slot: null, booking: null, error: '' }); view(); };
}

(async () => {
  state.services = await api('/api/services');
  view();
})();
