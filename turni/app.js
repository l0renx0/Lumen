// Turni — segna entrata e uscita, conta ore, extra e soldi.
// I dati restano solo nel telefono (localStorage), con backup in un file.
(() => {
  'use strict';

  // ---------- Dati ----------
  const KEY = 'turni.v1';
  const DEFAULTS = { weekHours: 20, extraRate: 9, salary: 0, method: 'exact', monthWeeks: {} };

  function normalize(d) {
    const out = {
      shifts: Array.isArray(d && d.shifts) ? d.shifts : [],
      payments: Array.isArray(d && d.payments) ? d.payments : [],
      open: d && d.open && d.open.date && d.open.start ? d.open : null,
      settings: { ...DEFAULTS, ...((d && d.settings) || {}) },
    };
    if (!METHODS[out.settings.method]) out.settings.method = 'exact';
    if (!out.settings.monthWeeks || typeof out.settings.monthWeeks !== 'object') out.settings.monthWeeks = {};
    return out;
  }
  function load() {
    try { return normalize(JSON.parse(localStorage.getItem(KEY))); } catch (e) { return normalize(null); }
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) { toast('Non riesco a salvare: memoria del browser piena o bloccata'); }
  }
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

  // Modi in cui l'azienda potrebbe contare le ore (per difetto, come conti tu)
  const METHODS = {
    exact: { name: 'Al minuto', desc: 'L\'orario esatto. Es. 8:01 → 10:01 = 2 h' },
    dur30: { name: 'Totale a mezz\'ore', desc: 'Il totale del turno arrotondato per difetto alla mezz\'ora. Es. 8:01 → 10:01 = 2 h, 8:01 → 9:59 = 1 h 30' },
    clock30: { name: 'Orari a mezz\'ore', desc: 'Entrata spostata alla mezz\'ora dopo, uscita a quella prima. Es. 8:01 → 10:01 = 1 h 30' },
    clock15: { name: 'Orari a quarti d\'ora', desc: 'Come sopra, ma ogni 15 minuti. Es. 8:01 → 10:01 = 1 h 45' },
  };

  let db = load();

  // ---------- Date, ore, numeri ----------
  const pad = (n) => String(n).padStart(2, '0');
  const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const parse = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
  const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
  const monday = (d) => { const x = addDays(d, -((d.getDay() + 6) % 7)); x.setHours(0, 0, 0, 0); return x; };
  const toMin = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
  const hhmm = (d) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  const monthKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
  const today0 = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };

  const DAYS = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];
  const DAYS_LONG = ['domenica', 'lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato'];
  const MONTHS = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];
  const MON = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic'];
  const cap = (s) => s[0].toUpperCase() + s.slice(1);

  const parseNum = (v) => { const n = parseFloat(String(v).trim().replace(/\./g, (m, i, s) => (s.includes(',') ? '' : m)).replace(',', '.')); return Number.isFinite(n) ? n : 0; };
  const eur = (v) => v.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' });
  const dec = (min) => (min / 60).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmtH = (min) => {
    const h = Math.floor(min / 60), m = Math.round(min % 60);
    if (!h) return `${m} min`;
    return m ? `${h} h ${pad(m)}` : `${h} h`;
  };
  // "16 h 30" in grande, con le unità più piccole
  const bigH = (min) => `${Math.floor(min / 60)}<em>h</em>${min % 60 ? `${pad(min % 60)}` : ''}`;
  const money = (min) => Math.round((min / 60) * db.settings.extraRate * 100) / 100;

  // Minuti di un turno, contati con il metodo scelto
  function minutes(s, method = db.settings.method) {
    let a = toMin(s.start), b = toMin(s.end);
    if (b <= a) b += 24 * 60; // finisce il giorno dopo
    let m;
    if (method === 'clock30' || method === 'clock15') {
      const q = method === 'clock30' ? 30 : 15;
      m = Math.max(0, Math.floor(b / q) * q - Math.ceil(a / q) * q);
      m -= Number(s.pause) || 0;
    } else {
      m = b - a - (Number(s.pause) || 0);
      if (method === 'dur30') m = Math.floor(m / 30) * 30;
    }
    return Math.max(0, m);
  }

  const sorted = (list) => list.slice().sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start));
  const between = (from, to) => sorted(db.shifts.filter((s) => s.date >= from && s.date <= to));
  const total = (list, method) => list.reduce((a, s) => a + minutes(s, method), 0);

  // ---------- Conti: settimana, mese, extra ----------
  const W = () => Math.round(db.settings.weekHours * 60);

  function weekInfo(mon, method) {
    const list = between(iso(mon), iso(addDays(mon, 6)));
    const min = total(list, method);
    return { list, min, extra: Math.max(0, min - W()) };
  }

  // Settimane che "appartengono" al mese: quelle il cui giovedì cade nel mese
  function weeksOfMonth(y, m) {
    const out = [];
    for (let w = monday(new Date(y, m, 1)); w <= new Date(y, m + 1, 0); w = addDays(w, 7)) {
      if (addDays(w, 3).getMonth() === m) out.push(w);
    }
    return out;
  }

  // Ore del mese da contratto: ore a settimana × settimane del mese (4 o 5).
  // Se per un mese l'azienda conta diversamente, si può cambiare a mano.
  const autoWeeks = (y, m) => weeksOfMonth(y, m).length;
  const weeksIn = (y, m) => db.settings.monthWeeks[`${y}-${pad(m + 1)}`] || autoWeeks(y, m);
  const M = (y, m) => W() * weeksIn(y, m);

  function monthInfo(y, m, method = db.settings.method) {
    const first = new Date(y, m, 1), last = new Date(y, m + 1, 0);
    const list = between(iso(first), iso(last));
    const min = total(list, method);
    const goal = M(y, m);
    const extra = Math.max(0, min - goal);
    return { list, min, goal, extra, eur: money(extra), key: `${y}-${pad(m + 1)}` };
  }

  const paid = (key, kind) => db.payments.filter((p) => p.month === key && p.kind === kind).reduce((a, p) => a + p.amount, 0);

  // ---------- Stato della vista ----------
  let tab = 'oggi';
  let cursor = today0();
  try { const t = localStorage.getItem('turni.tab'); if (['oggi', 'settimana', 'mese', 'soldi'].includes(t)) tab = t; } catch (e) { /* ok */ }

  const $ = (id) => document.getElementById(id);
  const view = $('view');
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const ICON = {
    prev: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>',
    next: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>',
    in: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3"/></svg>',
    out: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>',
    clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
    plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
    x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  };

  // ---------- Pezzi di interfaccia ----------
  function ring(min, goal) {
    const r = 37, c = 2 * Math.PI * r;
    const base = Math.min(min, goal) / (goal || 1);
    const over = goal ? Math.min(1, Math.max(0, min - goal) / goal) : 0;
    return `<div class="ring"><svg viewBox="0 0 84 84">
        <circle class="track" cx="42" cy="42" r="${r}"/>
        <circle class="base" cx="42" cy="42" r="${r}" stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - base)}"/>
        ${over ? `<circle class="over" cx="42" cy="42" r="${r}" stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - over)}"/>` : ''}
      </svg><div class="pct">${goal ? Math.round((min / goal) * 100) : 0}%</div></div>`;
  }

  function meter(min, goal) {
    const max = Math.max(min, goal) || 1;
    const b = Math.min(min, goal), o = Math.max(0, min - goal);
    return `<div class="meter"><i class="b" style="width:${(b / max) * 100}%"></i><i class="o" style="width:${(o / max) * 100}%"></i></div>
      <div class="meter-legend"><span>Contratto <b>${fmtH(goal)}</b></span>${o ? `<span style="color:var(--money)">Extra <b style="color:inherit">+${fmtH(o)}</b></span>` : `<span>${min < goal ? `Mancano <b>${fmtH(goal - min)}</b>` : 'Ore piene'}</span>`}</div>`;
  }

  function shiftBtn(s) {
    const night = toMin(s.end) <= toMin(s.start);
    const bits = [];
    if (Number(s.pause)) bits.push(`pausa ${s.pause} min`);
    if (s.note) bits.push(esc(s.note));
    const m = minutes(s), ex = minutes(s, 'exact');
    if (m !== ex) bits.push(`esatte ${fmtH(ex)}`);
    return `<button class="shift" data-edit="${s.id}">
        <span style="min-width:0"><span class="t num">${s.start} – ${s.end}${night ? ' <small>+1</small>' : ''}</span>${bits.length ? `<span class="n">${bits.join(' · ')}</span>` : ''}</span>
        <span class="d num">${fmtH(m)}</span>
      </button>`;
  }

  // Turni di un giorno; tra due turni (turno spezzato) mostra le ore non pagate
  function dayShifts(ds, openHtml = '') {
    let html = '';
    ds.forEach((s, i) => {
      if (i) {
        const g = toMin(s.start) - toMin(ds[i - 1].end);
        if (g > 0) html += `<div class="gap">spezzato · ${fmtH(g)} non pagate</div>`;
      }
      html += shiftBtn(s);
    });
    return html + openHtml;
  }

  function openShiftBtn() {
    const o = db.open;
    return `<button class="shift open" data-open>
        <span><span class="t num">${o.start} – in corso</span><span class="n">Tocca per segnare l'uscita</span></span>
        <span class="d num" data-live-short>${fmtH(liveMin())}</span>
      </button>`;
  }

  function periodNav(label, sub, isNow) {
    return `<div class="period">
        <button class="icon-btn" data-move="-1" aria-label="Precedente">${ICON.prev}</button>
        <div class="label"><b>${label}</b>${isNow ? `<small>${sub}</small>` : '<button data-today>Torna a oggi</button>'}</div>
        <button class="icon-btn" data-move="1" aria-label="Successivo">${ICON.next}</button>
      </div>`;
  }

  // "Ottobre: 5 settimane = 100 h" — tocca per passare da 4 a 5 settimane
  function weeksBtn(y, m) {
    const n = weeksIn(y, m);
    return `<button class="weeks-btn" data-weeks="${y}-${pad(m + 1)}">${cap(MONTHS[m])} conta <b>${n} settimane</b> = ${fmtH(M(y, m))} · cambia</button>`;
  }

  // Minuti del turno in corso (dall'entrata a adesso)
  function liveMin(now = new Date()) {
    if (!db.open) return 0;
    const start = parse(db.open.date);
    const [h, m] = db.open.start.split(':').map(Number);
    start.setHours(h, m, 0, 0);
    return Math.max(0, Math.floor((now - start) / 60000) - (Number(db.open.pause) || 0));
  }
  function liveClock(now = new Date()) {
    if (!db.open) return '';
    const start = parse(db.open.date);
    const [h, m] = db.open.start.split(':').map(Number);
    start.setHours(h, m, 0, 0);
    const sec = Math.max(0, Math.floor((now - start) / 1000));
    return `${Math.floor(sec / 3600)}:${pad(Math.floor(sec / 60) % 60)}<small>${pad(sec % 60)}</small>`;
  }

  // ---------- Viste ----------
  function renderOggi() {
    const now = new Date();
    const o = db.open;
    let clock;
    if (o) {
      const long = liveMin(now) > 14 * 60;
      clock = `<section class="card clock live">
          <div class="state"><span class="dot"></span>In turno${o.date !== iso(now) ? ` da ${DAYS_LONG[parse(o.date).getDay()]}` : ''}</div>
          <div class="time" id="liveTime">${liveClock(now)}</div>
          <div class="meta">Entrata alle <b class="num">${o.start}</b> · <button data-fix>correggi</button>${long ? '<br><span style="color:var(--danger)">Turno molto lungo: hai dimenticato di segnare l\'uscita?</span>' : ''}</div>
          <button class="punch out" id="punchOut">${ICON.out}Segna uscita <small class="num" id="nowShort">${hhmm(now)}</small></button>
        </section>`;
    } else {
      clock = `<section class="card clock">
          <div class="state"><span class="dot"></span>Non sei in turno</div>
          <div class="time num" id="nowTime">${hhmm(now)}</div>
          <div class="meta">${cap(DAYS_LONG[now.getDay()])} ${now.getDate()} ${MONTHS[now.getMonth()]}</div>
          <button class="punch" id="punchIn">${ICON.in}Segna entrata <small class="num" id="nowShort">${hhmm(now)}</small></button>
          <p class="hint">Tocca appena timbri sul tablet. Se c'è qualche minuto di differenza, puoi correggere l'orario subito dopo.</p>
        </section>`;
    }

    const wk = weekInfo(monday(now));
    const wMin = wk.min + liveMin(now);
    const mi = monthInfo(now.getFullYear(), now.getMonth());
    const mMin = mi.min + liveMin(now);
    const mGoal = mi.goal;
    const mExtraNow = Math.max(0, mMin - mGoal);

    const recent = sorted(db.shifts).slice(-5).reverse();
    const recentHtml = recent.length
      ? `<div class="section-title">Ultimi turni <button data-goto="settimana">Vedi tutti</button></div>
         <div class="list">${recent.map((s) => { const d = parse(s.date); return `<div class="day"><div class="dname"><span>${DAYS[d.getDay()]}</span><b>${d.getDate()}</b></div><div class="shifts">${shiftBtn(s)}</div></div>`; }).join('')}</div>`
      : `<div class="section-title">Ultimi turni</div><div class="list"><div class="empty">Ancora nessun turno.<br>Segna l'entrata qui sopra, oppure aggiungi un turno passato con il <b>+</b>.</div></div>`;

    view.innerHTML = clock
      + `<button class="card tap" data-goto="settimana">
          <div class="kicker">Questa settimana</div>
          <div class="ringrow" style="margin-top:10px">${ring(wMin, W())}
            <div class="info"><div class="h num" data-live-week>${fmtH(wMin)}<em>su ${fmtH(W())}</em></div>
            <div class="pills">${wMin > W() ? `<span class="pill extra">+${fmtH(wMin - W())} extra</span>` : `<span class="pill">mancano ${fmtH(W() - wMin)}</span>`}</div></div>
          </div>
        </button>
        <button class="card tap" data-goto="soldi">
          <div class="kicker">${cap(MONTHS[now.getMonth()])}</div>
          <div class="ringrow" style="margin-top:10px">${ring(mMin, mGoal)}
            <div class="info"><div class="h num">${fmtH(mMin)}<em>su ${fmtH(mGoal)}</em></div>
            <div class="pills">${mExtraNow ? `<span class="pill extra">+${fmtH(mExtraNow)} · ${eur(money(mExtraNow))}</span>` : `<span class="pill">mancano ${fmtH(Math.max(0, mGoal - mMin))}</span>`}</div></div>
          </div>
        </button>`
      + recentHtml;
  }

  function renderSettimana() {
    const mon = monday(cursor), sun = addDays(mon, 6);
    const wk = weekInfo(mon);
    const isNow = iso(mon) === iso(monday(new Date()));
    const label = `${mon.getDate()}${mon.getMonth() === sun.getMonth() ? '' : ' ' + MON[mon.getMonth()]} – ${sun.getDate()} ${MON[sun.getMonth()]}`;
    const todayKey = iso(new Date());
    const open = db.open && db.open.date >= iso(mon) && db.open.date <= iso(sun) ? db.open : null;

    // Grafico
    const perDay = [];
    for (let i = 0; i < 7; i++) {
      const key = iso(addDays(mon, i));
      perDay.push(total(wk.list.filter((s) => s.date === key)) + (open && open.date === key ? liveMin() : 0));
    }
    const max = Math.max(8 * 60, ...perDay) * 1.08;
    const bars = perDay.map((m, i) => {
      const d = addDays(mon, i);
      return `<button class="bar${iso(d) === todayKey ? ' today' : ''}" data-scroll="${iso(d)}">
          <span class="v num">${m ? fmtH(m).replace(' h ', ':').replace(' h', 'h') : ''}</span>
          <span class="col${m ? '' : ' zero'}" style="height:${m ? Math.max(6, (m / max) * 100) : 3}%"></span>
          <span class="d">${DAYS[d.getDay()][0]}</span>
        </button>`;
    }).join('');

    const wMin = wk.min + (open ? liveMin() : 0);
    const extra = Math.max(0, wMin - W());
    let rows = '';
    for (let i = 0; i < 7; i++) {
      const d = addDays(mon, i), key = iso(d);
      const ds = wk.list.filter((s) => s.date === key);
      const hasOpen = open && open.date === key;
      rows += `<div class="day${key === todayKey ? ' is-today' : ''}" id="d-${key}">
          <div class="dname"><span>${DAYS[d.getDay()]}</span><b>${d.getDate()}</b></div>
          <div class="shifts">${dayShifts(ds, hasOpen ? openShiftBtn() : '')}
            <button class="add-day${ds.length || hasOpen ? ' small' : ''}" data-add="${key}">${ds.length || hasOpen ? '+ altro turno' : 'Riposo · tocca per aggiungere'}</button>
          </div>
        </div>`;
    }

    view.innerHTML = periodNav(label, 'Questa settimana', isNow)
      + `<section class="card">
          <div class="kicker">Ore lavorate</div>
          <div class="big">${bigH(wMin)}</div>
          <div class="sub">${dec(wMin)} ore${extra ? ` · <b style="color:var(--money)">+${fmtH(extra)}</b> oltre le ${fmtH(W())}` : ''}</div>
          ${meter(wMin, W())}
          <div class="bars">${bars}</div>
        </section>
        <div class="list">${rows}</div>`;
  }

  function renderMese() {
    const y = cursor.getFullYear(), m = cursor.getMonth();
    const now = new Date();
    const isNow = y === now.getFullYear() && m === now.getMonth();
    const mi = monthInfo(y, m);
    const days = new Set(mi.list.map((s) => s.date)).size;

    // Calendario
    const first = new Date(y, m, 1), nDays = new Date(y, m + 1, 0).getDate();
    let cal = ['L', 'M', 'M', 'G', 'V', 'S', 'D'].map((d) => `<div class="h">${d}</div>`).join('');
    for (let i = 0; i < (first.getDay() + 6) % 7; i++) cal += '<div class="blank"></div>';
    for (let d = 1; d <= nDays; d++) {
      const key = iso(new Date(y, m, d));
      const min = total(mi.list.filter((s) => s.date === key));
      const lv = !min ? '' : min < 4 * 60 ? ' l1' : min < 7 * 60 ? ' l2' : ' l3';
      cal += `<button class="${lv}${key === iso(now) ? ' today' : ''}" data-day="${key}"><b>${d}</b><span class="num">${min ? fmtH(min).replace(' h ', ':').replace(' h', 'h') : ''}</span></button>`;
    }

    // Settimane
    const weeks = weeksOfMonth(y, m).map((w) => ({ w, ...weekInfo(w) }));
    const maxW = Math.max(W(), ...weeks.map((x) => x.min)) || 1;
    const wrows = weeks.map((x) => {
      const e = addDays(x.w, 6);
      return `<button class="row" data-week="${iso(x.w)}">
          <span class="l">${x.w.getDate()} ${MON[x.w.getMonth()]} – ${e.getDate()} ${MON[e.getMonth()]}<small>${x.list.length} ${x.list.length === 1 ? 'turno' : 'turni'}</small></span>
          <span class="wbar"><i class="b" style="width:${(Math.min(x.min, W()) / maxW) * 100}%"></i><i class="o" style="width:${(x.extra / maxW) * 100}%"></i></span>
          <span class="r num" style="min-width:64px">${x.min ? fmtH(x.min) : '–'}${x.extra ? `<small style="color:var(--money)">+${fmtH(x.extra)}</small>` : ''}</span>
        </button>`;
    }).join('');

    view.innerHTML = periodNav(`${cap(MONTHS[m])} ${y}`, 'Questo mese', isNow)
      + `<section class="card">
          <div class="kicker">Ore lavorate</div>
          <div class="big">${bigH(mi.min)}</div>
          <div class="sub">${dec(mi.min)} ore</div>
          ${meter(mi.min, mi.goal)}
          ${weeksBtn(y, m)}
          <div class="stats">
            <div class="stat"><b class="num">${mi.list.length}</b><span>${mi.list.length === 1 ? 'turno' : 'turni'}</span></div>
            <div class="stat"><b class="num">${days}</b><span>${days === 1 ? 'giorno' : 'giorni'}</span></div>
            <div class="stat money"><b class="num">${eur(mi.eur)}</b><span>extra</span></div>
          </div>
          <div class="cal">${cal}</div>
        </section>
        <div class="section-title">Settimana per settimana</div>
        <div class="list">${wrows}</div>
        ${mi.list.length ? '<div class="actions"><button class="btn" data-csv-month>Esporta il mese per Excel</button></div>' : ''}`;
  }

  function renderSoldi() {
    const y = cursor.getFullYear(), m = cursor.getMonth();
    const now = new Date();
    const isNow = y === now.getFullYear() && m === now.getMonth();
    const s = db.settings;
    const mi = monthInfo(y, m);
    const got = paid(mi.key, 'extra');
    const diff = Math.round((mi.eur - got) * 100) / 100;

    let state;
    if (!got && !mi.eur) state = `<div class="paystate"><div class="ic">${ICON.clock}</div><div><b>Nessuna ora extra ${isNow ? 'per ora' : ''}</b><span>Superate le ${fmtH(mi.goal)} del mese, qui vedi quanto ti spetta.</span></div></div>`;
    else if (!got) state = `<div class="paystate due"><div class="ic">${ICON.clock}</div><div><b>Da ricevere: ${eur(mi.eur)}</b><span>Quando ti pagano, tocca «Segna soldi ricevuti».</span></div></div>`;
    else if (Math.abs(diff) < 0.01) state = `<div class="paystate ok"><div class="ic">${ICON.check}</div><div><b>Pagato tutto</b><span>Hai ricevuto ${eur(got)}: torna con il conteggio.</span></div></div>`;
    else if (diff > 0) state = `<div class="paystate due"><div class="ic">${ICON.clock}</div><div><b>Mancano ${eur(diff)}</b><span>Ricevuti ${eur(got)} su ${eur(mi.eur)}.</span></div></div>`;
    else state = `<div class="paystate ok"><div class="ic">${ICON.check}</div><div><b>Ricevuti ${eur(-diff)} in più</b><span>Ricevuti ${eur(got)}, il conteggio dice ${eur(mi.eur)}.</span></div></div>`;

    // Il calcolo passo per passo
    const wn = weeksIn(y, m);
    const calc = `<div class="row"><span class="l">Ore lavorate</span><span class="r num">${fmtH(mi.min)}<small>${dec(mi.min)} ore</small></span></div>
        <button class="row" data-weeks="${mi.key}"><span class="l">Ore da contratto<small>${wn} settimane × ${fmtH(W())} · <span style="color:var(--accent-ink);font-weight:650">cambia</span></small></span><span class="r num">− ${fmtH(mi.goal)}</span></button>
        <div class="row"><span class="l">Ore extra</span><span class="r num">${fmtH(mi.extra)}<small>${dec(mi.extra)} ore</small></span></div>
        <div class="row total"><span class="l">× ${eur(s.extraRate)} all'ora</span><span class="r num money">${eur(mi.eur)}</span></div>`;

    // Confronto tra i modi di contare
    let match = null;
    if (got) {
      let best = Infinity;
      Object.keys(METHODS).forEach((k) => { const d = Math.abs(monthInfo(y, m, k).eur - got); if (d < best) { best = d; match = d < 0.5 ? k : null; } });
    }
    const methods = Object.keys(METHODS).map((k) => {
      const x = monthInfo(y, m, k);
      return `<button class="row${k === s.method ? ' sel' : ''}" data-method="${k}">
          <span class="l">${METHODS[k].name}${k === s.method ? ' <span class="pill extra" style="margin-left:4px">in uso</span>' : ''}${k === match ? ' <span class="pill accent" style="margin-left:4px">torna con i soldi ricevuti</span>' : ''}<small>${fmtH(x.min)} lavorate · ${fmtH(x.extra)} extra</small></span>
          <span class="r num money">${eur(x.eur)}</span>
        </button>`;
    }).join('');

    // Stipendio
    let salary = '';
    if (s.salary) {
      const sg = paid(mi.key, 'stipendio');
      salary = `<div class="section-title">Stipendio in busta paga</div><div class="list">
          <div class="row"><span class="l">Da contratto (netto)</span><span class="r num">${eur(s.salary)}</span></div>
          <div class="row"><span class="l">Ricevuto</span><span class="r num${sg >= s.salary ? ' money' : ''}">${sg ? eur(sg) : '–'}</span></div>
          <div class="row total"><span class="l">Totale del mese (stipendio + extra)</span><span class="r num money">${eur(s.salary + mi.eur)}</span></div>
        </div>`;
    }

    const pays = db.payments.filter((p) => p.month === mi.key).sort((a, b) => a.date.localeCompare(b.date));
    const paysHtml = pays.length
      ? `<div class="list">${pays.map((p) => { const d = parse(p.date); return `<div class="row"><span class="l">${p.kind === 'extra' ? 'Ore extra' : 'Stipendio'}<small>Ricevuti il ${d.getDate()} ${MON[d.getMonth()]}${p.note ? ' · ' + esc(p.note) : ''}</small></span><span class="r num money">${eur(p.amount)}</span><button class="x" data-delpay="${p.id}" aria-label="Elimina">${ICON.x}</button></div>`; }).join('')}</div>`
      : '<div class="list"><div class="empty">Nessun pagamento segnato per questo mese.</div></div>';

    // Totale ancora da ricevere, tutti i mesi
    const months = new Set(db.shifts.map((x) => x.date.slice(0, 7)));
    let owed = 0;
    months.forEach((k) => { const [yy, mm] = k.split('-').map(Number); owed += Math.max(0, monthInfo(yy, mm - 1).eur - paid(k, 'extra')); });

    view.innerHTML = periodNav(`${cap(MONTHS[m])} ${y}`, 'Questo mese', isNow)
      + `<section class="card">
          <div class="kicker">Extra di ${MONTHS[m]}</div>
          <div class="big money">${eur(mi.eur)}</div>
          <div class="sub">${fmtH(mi.extra)} extra × ${eur(s.extraRate)} all'ora${isNow ? ' · mese in corso' : ''}</div>
          ${state}
          <div class="actions"><button class="btn money full" id="addPay">${ICON.plus}Segna soldi ricevuti</button></div>
        </section>
        ${owed >= 0.01 ? `<div class="card flat" style="display:flex;justify-content:space-between;align-items:center;gap:12px"><span><span class="kicker">In tutto ti devono ancora</span><br><span class="sub">Tutti i mesi${months.has(monthKey(now)) ? ', compreso quello in corso' : ''}</span></span><b class="num" style="font-size:22px;color:var(--accent-ink)">${eur(owed)}</b></div>` : ''}
        <div class="section-title">Il calcolo</div>
        <div class="list">${calc}</div>
        <div class="section-title">Se contano le ore in un altro modo</div>
        <div class="list">${methods}</div>
        <p class="hint">Tocca un conteggio per usarlo in tutta l'app. Quando segni i soldi ricevuti, ti dico quale conteggio corrisponde.</p>
        ${salary}
        <div class="section-title">Soldi ricevuti per ${MONTHS[m]}</div>
        ${paysHtml}`;
  }

  const TITLES = { oggi: 'Oggi', settimana: 'Settimana', mese: 'Mese', soldi: 'Soldi' };
  function render(animate) {
    document.querySelectorAll('.tabbar .tab').forEach((b) => b.setAttribute('aria-selected', b.dataset.tab === tab));
    $('title').textContent = TITLES[tab];
    const now = new Date();
    $('eyebrow').textContent = tab === 'oggi' ? cap(`${DAYS_LONG[now.getDay()]} ${now.getDate()} ${MONTHS[now.getMonth()]}`)
      : tab === 'soldi' ? 'Ore extra e pagamenti' : 'Ore lavorate';
    ({ oggi: renderOggi, settimana: renderSettimana, mese: renderMese, soldi: renderSoldi })[tab]();
    if (animate) { view.classList.remove('view-enter'); void view.offsetWidth; view.classList.add('view-enter'); }
  }

  // Aggiorna l'orologio ogni secondo (solo i numeri, senza ridisegnare tutto)
  let lastMinute = new Date().getMinutes();
  setInterval(() => {
    const now = new Date();
    // Ogni minuto, con un turno in corso, aggiorna anche i totali
    if (now.getMinutes() !== lastMinute) { lastMinute = now.getMinutes(); if (db.open && !document.hidden) render(); }
    const n = $('nowTime'); if (n) n.textContent = hhmm(now);
    const ns = $('nowShort'); if (ns) ns.textContent = hhmm(now);
    const l = $('liveTime'); if (l) l.innerHTML = liveClock(now);
    document.querySelectorAll('[data-live-short]').forEach((el) => { el.textContent = fmtH(liveMin(now)); });
  }, 1000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) render(); });

  // ---------- Navigazione ----------
  function go(t) {
    if (t === tab) { window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
    tab = t;
    try { localStorage.setItem('turni.tab', t); } catch (e) { /* ok */ }
    window.scrollTo(0, 0);
    render(true);
  }
  document.querySelectorAll('.tabbar .tab').forEach((b) => { b.onclick = () => go(b.dataset.tab); });

  function move(dir) {
    if (tab === 'settimana') cursor = addDays(cursor, 7 * dir);
    else if (tab === 'mese' || tab === 'soldi') cursor = new Date(cursor.getFullYear(), cursor.getMonth() + dir, 1);
    else return;
    render(true);
  }

  // Scorri a destra/sinistra per cambiare settimana o mese
  let tx = null, ty = null;
  view.addEventListener('touchstart', (e) => { tx = e.touches[0].clientX; ty = e.touches[0].clientY; }, { passive: true });
  view.addEventListener('touchend', (e) => {
    if (tx === null) return;
    const dx = e.changedTouches[0].clientX - tx, dy = e.changedTouches[0].clientY - ty;
    if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.5) move(dx < 0 ? 1 : -1);
    tx = null;
  }, { passive: true });

  const buzz = () => { try { navigator.vibrate && navigator.vibrate(15); } catch (e) { /* ok */ } };

  view.addEventListener('click', (e) => {
    const t = e.target.closest('button');
    if (!t) return;
    const d = t.dataset;
    if (t.id === 'punchIn') punchIn();
    else if ('fix' in d) openShift('fix');
    else if (t.id === 'punchOut' || 'open' in d) openShift('open');
    else if (t.id === 'addPay') openPay();
    else if (d.edit) openShift('edit', db.shifts.find((s) => s.id === d.edit));
    else if (d.add) openShift('new', null, d.add);
    else if (d.move) move(Number(d.move));
    else if ('today' in d) { cursor = today0(); render(true); }
    else if (d.goto) go(d.goto);
    else if (d.week) { cursor = parse(d.week); go('settimana'); }
    else if (d.scroll) { const el = $('d-' + d.scroll); if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'start' }); el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash'); } }
    else if (d.day) {
      const has = db.shifts.some((s) => s.date === d.day);
      if (has) { cursor = parse(d.day); go('settimana'); setTimeout(() => { const el = $('d-' + d.day); if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'start' }); el.classList.add('flash'); } }, 50); }
      else openShift('new', null, d.day);
    }
    else if (d.weeks) {
      const [yy, mm] = d.weeks.split('-').map(Number);
      const auto = autoWeeks(yy, mm - 1), next = weeksIn(yy, mm - 1) === 5 ? 4 : 5;
      if (next === auto) delete db.settings.monthWeeks[d.weeks]; else db.settings.monthWeeks[d.weeks] = next;
      save(); render();
      toast(`${cap(MONTHS[mm - 1])}: ${next} settimane = ${fmtH(M(yy, mm - 1))} da contratto`);
    }
    else if (d.method) { db.settings.method = d.method; save(); render(); toast(`Ora conto «${METHODS[d.method].name}»`); }
    else if (d.delpay) {
      const p = db.payments.find((x) => x.id === d.delpay);
      db.payments = db.payments.filter((x) => x !== p); save(); render();
      toast('Pagamento eliminato', 'Annulla', () => { db.payments.push(p); save(); render(); });
    } else if ('csvMonth' in d) {
      const y = cursor.getFullYear(), m = cursor.getMonth();
      exportCsv(between(iso(new Date(y, m, 1)), iso(new Date(y, m + 1, 0))), `turni-${y}-${pad(m + 1)}.csv`);
    }
  });

  // ---------- Timbratura ----------
  function punchIn() {
    const now = new Date();
    db.open = { date: iso(now), start: hhmm(now), pause: 0, note: '' };
    save(); buzz(); render();
    toast(`Entrata segnata alle ${db.open.start}`, 'Correggi', () => openShift('fix'));
  }

  // ---------- Fogli dal basso ----------
  let sheet = null;
  function show(el) { sheet = el; $('scrim').classList.add('open'); el.classList.add('open'); }
  function hide() {
    if (!sheet) return;
    if (sheet.id === 'settingsSheet') saveSettings();
    sheet.classList.remove('open'); $('scrim').classList.remove('open'); sheet = null;
  }
  $('scrim').onclick = hide;
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') hide(); });

  // ---------- Turno: nuovo, modifica, in corso ----------
  // mode: 'new' (nuovo), 'edit' (turno salvato), 'open' (chiudi il turno in corso), 'fix' (correggi l'entrata)
  let editMode = 'new', editing = null;
  const onOpen = () => editMode === 'open' || editMode === 'fix';
  const f = { date: $('fDate'), start: $('fStart'), end: $('fEnd'), start2: $('fStart2'), end2: $('fEnd2'), note: $('fNote') };
  let split = false;
  function setSplit(on) {
    split = on;
    $('fSplit').setAttribute('aria-pressed', on);
    $('splitBox').hidden = !on;
    updatePreview();
  }
  $('fSplit').onclick = () => setSplit(!split);

  function presets() {
    const count = {};
    db.shifts.forEach((s) => { const k = `${s.start}|${s.end}`; count[k] = (count[k] || 0) + 1; });
    return Object.entries(count).filter(([, n]) => n > 1).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([k]) => k.split('|'));
  }

  function openShift(mode, s, date) {
    editMode = mode; editing = s || null;
    const now = new Date();
    $('fDelete').hidden = mode === 'new';
    $('fDelete').textContent = mode === 'open' || mode === 'fix' ? 'Annulla entrata' : 'Elimina';
    let ps = [];
    if (mode === 'open' || mode === 'fix') {
      const o = db.open;
      $('shiftTitle').textContent = mode === 'open' ? 'Fine turno' : 'Correggi entrata';
      f.date.value = o.date; f.start.value = o.start; f.end.value = mode === 'open' ? hhmm(now) : '';
      f.note.value = o.note || '';
    } else if (mode === 'edit') {
      $('shiftTitle').textContent = 'Modifica turno';
      f.date.value = s.date; f.start.value = s.start; f.end.value = s.end;
      f.note.value = s.note || '';
    } else {
      $('shiftTitle').textContent = 'Nuovo turno';
      f.date.value = date || iso(now);
      f.start.value = ''; f.end.value = ''; f.note.value = '';
      ps = presets();
    }
    f.start2.value = ''; f.end2.value = '';
    $('fSplit').hidden = mode !== 'new';
    split = false; $('fSplit').setAttribute('aria-pressed', 'false'); $('splitBox').hidden = true;
    $('presetsBox').innerHTML = ps.length
      ? `<div class="chips-label">Orari che usi spesso</div><div class="chips">${ps.map(([a, b]) =>
        `<button type="button" class="chip num" data-preset="${a}|${b}">${a}–${b}</button>`).join('')}</div>`
      : '';
    updatePreview();
    show($('shiftSheet'));
  }

  function updatePreview() {
    const p = $('fPreview');
    if (!f.start.value) { p.className = 'preview bad'; p.textContent = 'Scrivi l\'orario di entrata'; return; }
    if (!f.end.value) {
      p.className = 'preview';
      p.innerHTML = db.open && !onOpen() ? 'Scrivi anche l\'uscita<small>Hai già un turno in corso.</small>' : 'Turno in corso<small>Lascia vuota l\'uscita e segnala dopo con «Segna uscita».</small>';
      if (db.open && !onOpen()) p.className = 'preview bad';
      return;
    }
    const parts = [{ start: f.start.value, end: f.end.value }];
    let note = '';
    if (split) {
      if (!f.start2.value || !f.end2.value) { p.className = 'preview bad'; p.textContent = 'Scrivi l\'orario di rientro e di uscita'; return; }
      const gap = toMin(f.start2.value) - toMin(f.end.value);
      if (gap <= 0 || toMin(f.end.value) <= toMin(f.start.value)) { p.className = 'preview bad'; p.textContent = 'Il rientro deve essere dopo la prima uscita'; return; }
      parts.push({ start: f.start2.value, end: f.end2.value });
      note = `${fmtH(minutes(parts[0], 'exact'))} + ${fmtH(minutes(parts[1], 'exact'))} · ${fmtH(gap)} di spezzato non pagate. `;
    }
    const ex = total(parts, 'exact'), m = total(parts);
    const last = parts[parts.length - 1];
    if (toMin(last.end) <= toMin(last.start)) note += 'Finisce il giorno dopo. ';
    p.className = 'preview';
    p.innerHTML = `Totale: ${fmtH(ex)} <span style="font-weight:500">(${dec(ex)} ore)</span>`
      + `<small>${note}${m !== ex ? `Con il conteggio «${METHODS[db.settings.method].name}»: ${fmtH(m)}.` : ''}</small>`;
  }

  $('presetsBox').addEventListener('click', (e) => {
    const c = e.target.closest('[data-preset]');
    if (!c) return;
    const [a, b] = c.dataset.preset.split('|');
    f.start.value = a; f.end.value = b;
    updatePreview();
  });
  ['input', 'change'].forEach((ev) => [f.start, f.end, f.start2, f.end2].forEach((el) => el.addEventListener(ev, updatePreview)));

  $('shiftSheet').addEventListener('submit', (e) => {
    e.preventDefault();
    const data = { date: f.date.value, start: f.start.value, end: f.end.value, pause: 0, note: f.note.value.trim() };
    if (!data.date || !data.start) return;

    // Turno spezzato: due turni nello stesso giorno, le ore in mezzo non contano
    if (split) {
      if (!data.end || !f.start2.value || !f.end2.value) { toast('Scrivi tutti e quattro gli orari'); return; }
      if (toMin(f.start2.value) <= toMin(data.end) || toMin(data.end) <= toMin(data.start)) { toast('Il rientro deve essere dopo la prima uscita'); return; }
      const second = { ...data, start: f.start2.value, end: f.end2.value };
      db.shifts.push({ id: uid(), ...data }, { id: uid(), ...second });
      save(); buzz(); hide();
      if (tab !== 'oggi') cursor = parse(data.date);
      render();
      toast(`Turno spezzato salvato · ${fmtH(minutes(data, 'exact') + minutes(second, 'exact'))}`);
      return;
    }

    // Senza uscita: è (o resta) un turno in corso
    if (!data.end) {
      if (editMode === 'edit' || (db.open && !onOpen())) { toast('Scrivi anche l\'orario di uscita'); return; }
      db.open = { date: data.date, start: data.start, pause: 0, note: data.note };
      save(); hide(); render();
      toast(`Turno in corso dalle ${data.start}`);
      return;
    }
    if (!minutes(data, 'exact')) { toast('Entrata e uscita sono uguali'); return; }

    if (editMode === 'edit') Object.assign(editing, data);
    else {
      db.shifts.push({ id: uid(), ...data });
      if (onOpen()) db.open = null;
    }
    save(); buzz();
    const mode = editMode;
    hide();
    if (tab !== 'oggi') cursor = parse(data.date);
    render();
    toast(mode === 'edit' ? 'Turno aggiornato' : `Turno salvato · ${fmtH(minutes(data, 'exact'))}`);
  });
  $('fCancel').onclick = hide;
  $('fDelete').onclick = () => {
    if (onOpen()) {
      const o = db.open; db.open = null; save(); hide(); render();
      toast('Entrata annullata', 'Ripristina', () => { db.open = o; save(); render(); });
      return;
    }
    const s = editing;
    db.shifts = db.shifts.filter((x) => x !== s);
    save(); hide(); render();
    toast('Turno eliminato', 'Annulla', () => { db.shifts.push(s); save(); render(); });
  };
  $('addShift').onclick = () => {
    const d = tab === 'settimana' && iso(monday(cursor)) !== iso(monday(new Date())) ? iso(monday(cursor)) : null;
    openShift('new', null, d);
  };

  // ---------- Soldi ricevuti ----------
  let payKind = 'extra';
  $('payKind').addEventListener('click', (e) => {
    const c = e.target.closest('[data-kind]');
    if (!c) return;
    payKind = c.dataset.kind;
    document.querySelectorAll('#payKind .chip').forEach((b) => b.setAttribute('aria-pressed', b === c));
  });
  function openPay() {
    const y = cursor.getFullYear(), m = cursor.getMonth();
    const opts = [];
    for (let i = -12; i <= 1; i++) { const d = new Date(y, m + i, 1); opts.push(`<option value="${monthKey(d)}">${cap(MONTHS[d.getMonth()])} ${d.getFullYear()}</option>`); }
    $('pMonth').innerHTML = opts.join('');
    $('pMonth').value = monthKey(new Date(y, m, 1));
    payKind = 'extra';
    document.querySelectorAll('#payKind .chip').forEach((b) => b.setAttribute('aria-pressed', b.dataset.kind === 'extra'));
    const mi = monthInfo(y, m);
    const due = Math.max(0, mi.eur - paid(mi.key, 'extra'));
    $('pAmount').value = due ? due.toFixed(2).replace('.', ',') : '';
    $('pDate').value = iso(new Date());
    $('pNote').value = '';
    show($('paySheet'));
  }
  $('paySheet').addEventListener('submit', (e) => {
    e.preventDefault();
    const amount = Math.round(parseNum($('pAmount').value) * 100) / 100;
    if (!(amount > 0)) { toast('Scrivi l\'importo ricevuto'); return; }
    db.payments.push({ id: uid(), kind: payKind, amount, date: $('pDate').value, month: $('pMonth').value, note: $('pNote').value.trim() });
    save(); buzz(); hide();
    const [yy, mm] = $('pMonth').value.split('-').map(Number);
    cursor = new Date(yy, mm - 1, 1);
    render();
    toast(`Segnati ${eur(amount)}`);
  });
  $('pCancel').onclick = hide;

  // ---------- Impostazioni ----------
  const fmtIn = (n) => (n ? String(n).replace('.', ',') : '');
  $('sMethod').innerHTML = Object.entries(METHODS).map(([k, v]) =>
    `<label><input type="radio" name="method" value="${k}"><span><b>${v.name}</b><small>${v.desc}</small></span></label>`).join('');
  $('openSettings').onclick = () => {
    const s = db.settings;
    $('sWeek').value = fmtIn(s.weekHours);
    $('sRate').value = s.extraRate ? s.extraRate.toFixed(2).replace('.', ',') : '';
    $('sSalary').value = s.salary ? s.salary.toFixed(2).replace('.', ',') : '';
    document.querySelectorAll('input[name="method"]').forEach((r) => { r.checked = r.value === s.method; });
    show($('settingsSheet'));
  };
  function saveSettings() {
    const s = db.settings;
    s.weekHours = parseNum($('sWeek').value) || DEFAULTS.weekHours;
    s.extraRate = parseNum($('sRate').value);
    s.salary = parseNum($('sSalary').value);
    const m = document.querySelector('input[name="method"]:checked'); if (m) s.method = m.value;
    save(); render();
  }
  $('settingsDone').onclick = hide;

  // ---------- Backup ed Excel ----------
  function download(name, text, type) {
    const url = URL.createObjectURL(new Blob([text], { type }));
    const a = document.createElement('a');
    a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function exportCsv(list, name) {
    // Separatore ";" e virgola decimale: Excel in italiano lo apre già in colonne
    const method = db.settings.method;
    const head = ['Data', 'Giorno', 'Entrata', 'Uscita', 'Ore esatte'];
    if (method !== 'exact') head.push(`Ore (${METHODS[method].name})`);
    head.push('Nota');
    const rows = [head];
    sorted(list).forEach((s) => {
      const d = parse(s.date);
      const r = [`${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`, DAYS[d.getDay()], s.start, s.end, dec(minutes(s, 'exact'))];
      if (method !== 'exact') r.push(dec(minutes(s)));
      r.push(`"${(s.note || '').replace(/"/g, '""')}"`);
      rows.push(r);
    });
    const tot = ['Totale', '', '', '', dec(total(list, 'exact'))];
    if (method !== 'exact') tot.push(dec(total(list)));
    rows.push(tot);
    download(name, '﻿' + rows.map((r) => r.join(';')).join('\r\n'), 'text/csv;charset=utf-8');
  }
  $('exportCsv').onclick = () => {
    if (!db.shifts.length) { toast('Non ci sono ancora turni'); return; }
    exportCsv(db.shifts, 'turni-tutti.csv');
  };
  $('exportJson').onclick = () => {
    download(`turni-backup-${iso(new Date())}.json`, JSON.stringify({ app: 'turni', version: 2, ...db }, null, 2), 'application/json');
    toast('Backup salvato nei download');
  };
  $('importJson').onclick = () => $('importFile').click();
  $('importFile').onchange = async (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    try {
      const d = JSON.parse(await file.text());
      if (!d || !Array.isArray(d.shifts)) throw new Error('formato');
      const okT = (t) => /^\d{2}:\d{2}$/.test(t);
      const shifts = d.shifts.filter((s) => s && /^\d{4}-\d{2}-\d{2}$/.test(s.date) && okT(s.start) && okT(s.end))
        .map((s) => ({ id: String(s.id || uid()), date: s.date, start: s.start, end: s.end, pause: Number(s.pause) || 0, note: String(s.note || '') }));
      const payments = (Array.isArray(d.payments) ? d.payments : []).filter((p) => p && Number(p.amount) > 0 && /^\d{4}-\d{2}$/.test(p.month))
        .map((p) => ({ id: String(p.id || uid()), kind: p.kind === 'stipendio' ? 'stipendio' : 'extra', amount: Number(p.amount), date: String(p.date || ''), month: p.month, note: String(p.note || '') }));
      if (!confirm(`Il backup contiene ${shifts.length} turni e ${payments.length} pagamenti. Vuoi sostituire i dati attuali con questi?`)) return;
      db = normalize({ shifts, payments, open: d.open, settings: d.settings });
      save(); hide(); render(); toast('Backup ripristinato');
    } catch (err) { toast('Questo file non è un backup di Turni'); }
  };

  // ---------- Avvisi ----------
  let toastT, toastFn = null;
  function toast(msg, action, fn) {
    $('toastMsg').textContent = msg;
    $('toastAct').textContent = action || '';
    toastFn = fn || null;
    $('toast').classList.add('show');
    clearTimeout(toastT); toastT = setTimeout(() => $('toast').classList.remove('show'), action ? 5000 : 2400);
  }
  $('toastAct').onclick = () => { $('toast').classList.remove('show'); if (toastFn) toastFn(); toastFn = null; };

  render(true);
  if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
})();
