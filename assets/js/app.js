// Lumen — logica dell'app (nessuna dipendenza esterna)

/* ------------------------------------------------------------------ testi IT / EN */

const I18N = {
  it: {
    skip: 'Vai alle schede', fresh: 'Nuove schede', refresh: 'Aggiorna', close: 'Chiudi', sources: 'Fonti',
    tab_sapevi: 'Lo sapevi?', tab_novita: 'Ricerca', tab_aneddoti: 'Aneddoti', all: 'Tutti',
    read: 'Leggi', readMin: (n) => `${n} min`, alreadyRead: 'Letto', today_badge: 'La scoperta di oggi', new_badge: 'Nuovo',
    today: 'Oggi', yesterday: 'Ieri', daysAgo: (n) => `${n} giorni fa`, minRead: (n) => `${n} min di lettura`,
    score_solid: 'Solidità', score_verdict: 'Verdetto', fromSource: 'Dalla fonte',
    videos: 'Approfondisci in video', moreVideos: 'Cerca altri video su YouTube', play: 'Guarda il video',
    nextUp: 'Continua a leggere', image: 'Immagine',
    disclaimer: 'Ogni scheda riassume fonti ufficiali o autorevoli, con citazioni verificate parola per parola. In caso di dubbio, fa fede sempre l’originale.',
    done_t: 'Una cosa nuova imparata', done_s: (n) => n > 1 ? `Serie di ${n} giorni: continua così.` : 'Hai acceso la fiamma di oggi.',
    toast_read: (n) => `+1 conoscenza · serie di ${n} ${n === 1 ? 'giorno' : 'giorni'}`,
    hint: 'Tocca la fiamma per vedere i tuoi progressi',
    empty_t: 'Ancora niente qui', empty_s: 'Prova un altro argomento.',
    end_left: (n) => `Ti restano ${n} ${n === 1 ? 'scheda' : 'schede'} da scoprire`,
    end_tomorrow: 'Domani l’ordine cambia: una nuova scoperta ti aspetta in cima.',
    end_all: 'Le hai lette tutte', end_all_s: 'Nuove schede arriveranno con il prossimo aggiornamento.',
    end_research: 'Sei arrivato in fondo', end_research_s: 'Nuove ricerche arriveranno con il prossimo aggiornamento.',
    sheet_t: 'I tuoi progressi', sheet_sub_on: (n) => `Oggi hai imparato ${n} ${n === 1 ? 'cosa nuova' : 'cose nuove'}. La fiamma è accesa.`,
    sheet_sub_off: (s) => s > 0 ? `Leggi una scheda oggi per non spegnere la tua serie di ${s} ${s === 1 ? 'giorno' : 'giorni'}.` : 'Leggi una scheda fino in fondo per accendere la fiamma di oggi.',
    st_today: 'oggi', st_streak: 'giorni di fila', st_total: 'imparate', explored: 'Biblioteca esplorata',
    howto: '<b>Come funziona.</b> Il cerchio arancione si riempie quando leggi almeno una scheda fino in fondo: è l’obiettivo di ogni giorno. Il numero accanto alla fiamma è la tua serie, cioè quanti giorni di fila hai raggiunto l’obiettivo.',
    gotit: 'Ho capito', theme: 'Tema', lang: 'Lingua',
    weekdays: ['L', 'M', 'M', 'G', 'V', 'S', 'D'],
  },
  en: {
    skip: 'Skip to cards', fresh: 'New cards', refresh: 'Refresh', close: 'Close', sources: 'Sources',
    tab_sapevi: 'Did you know?', tab_novita: 'Research', tab_aneddoti: 'Anecdotes', all: 'All',
    read: 'Read', readMin: (n) => `${n} min`, alreadyRead: 'Read', today_badge: 'Today’s discovery', new_badge: 'New',
    today: 'Today', yesterday: 'Yesterday', daysAgo: (n) => `${n} days ago`, minRead: (n) => `${n} min read`,
    score_solid: 'Reliability', score_verdict: 'Verdict', fromSource: 'From the source',
    videos: 'Watch to learn more', moreVideos: 'Search more videos on YouTube', play: 'Play video',
    nextUp: 'Keep reading', image: 'Image',
    disclaimer: 'Every card summarises official or authoritative sources, with quotes checked word for word. When in doubt, the original always prevails.',
    done_t: 'One new thing learned', done_s: (n) => n > 1 ? `${n}-day streak: keep it up.` : 'You lit today’s flame.',
    toast_read: (n) => `+1 fact · ${n}-day streak`,
    hint: 'Tap the flame to see your progress',
    empty_t: 'Nothing here yet', empty_s: 'Try another topic.',
    end_left: (n) => `${n} ${n === 1 ? 'card' : 'cards'} left to discover`,
    end_tomorrow: 'Tomorrow the order changes: a new discovery will be waiting at the top.',
    end_all: 'You’ve read them all', end_all_s: 'New cards will arrive with the next update.',
    end_research: 'You’ve reached the end', end_research_s: 'New research will arrive with the next update.',
    sheet_t: 'Your progress', sheet_sub_on: (n) => `Today you learned ${n} new ${n === 1 ? 'thing' : 'things'}. The flame is lit.`,
    sheet_sub_off: (s) => s > 0 ? `Read a card today to keep your ${s}-day streak alive.` : 'Read a card to the end to light today’s flame.',
    st_today: 'today', st_streak: 'day streak', st_total: 'learned', explored: 'Library explored',
    howto: '<b>How it works.</b> The orange ring fills up when you read at least one card to the end: that’s the daily goal. The number next to the flame is your streak — how many days in a row you’ve reached it.',
    gotit: 'Got it', theme: 'Theme', lang: 'Language',
    weekdays: ['M', 'T', 'W', 'T', 'F', 'S', 'S'],
  },
};

const TOPICS = [
  ['Scienza', 'Science'], ['Spazio', 'Space'], ['Salute', 'Health'], ['Storia', 'History'],
  ['Natura', 'Nature'], ['Tecnologia', 'Technology'], ['Psicologia', 'Psychology'], ['Design', 'Design'],
  ['Finanza', 'Finance'], ['Cinema', 'Cinema'], ['Società', 'Society'],
].map(([id, en]) => ({ id, en, glyph: id.slice(0, 2) }));

const LEVELS = {
  consolidato: { n: 4, it: ['Consolidato', 'Consolidato', 'Conoscenza accettata da tempo, verificata da molte fonti indipendenti, oppure fatto storico documentato.'], en: ['Established', 'Established', 'Long-accepted knowledge, verified by many independent sources, or a documented historical fact.'] },
  ufficiale: { n: 3, it: ['Dato ufficiale', 'Dato ufficiale', 'Dato, misura o annuncio diffuso direttamente da un ente ufficiale.'], en: ['Official data', 'Official', 'Data, measurement or announcement released directly by an official body.'] },
  recente: { n: 2, it: ['Studio recente, da confermare', 'Da confermare', 'Risultato nuovo e pubblicato, ma non ancora replicato da altri. Potrebbe essere precisato o corretto.'], en: ['Recent study, to be confirmed', 'To be confirmed', 'A new, published result not yet replicated by others. It may be refined or corrected.'] },
  preliminare: { n: 1, it: ['Preliminare', 'Preliminare', 'Ipotesi teorica o risultato iniziale: un tassello, non una conclusione.'], en: ['Preliminary', 'Preliminary', 'A theoretical hypothesis or early result: a piece of the puzzle, not a conclusion.'] },
  verosimile: { v: '✓', it: ['Probabilmente vero', 'Probabilmente vero', 'Le fonti indicano che la storia è in gran parte vera, anche se con qualche abbellimento o incertezza.'], en: ['Probably true', 'Probably true', 'Sources suggest the story is largely true, though with some embellishment or uncertainty.'] },
  dubbio: { v: '?', it: ['Dubbio', 'Dubbio', 'Le prove sono scarse o contraddittorie: la maggior parte degli esperti dubita che sia andata così.'], en: ['Doubtful', 'Doubtful', 'Evidence is thin or contradictory: most experts doubt it happened that way.'] },
  mito: { v: '✕', it: ['Falso: è un mito', 'Falso', 'Le fonti autorevoli smentiscono la versione popolare.'], en: ['False: it’s a myth', 'Myth', 'Authoritative sources contradict the popular version.'] },
};

const SECTIONS = ['sapevi', 'novita', 'aneddoti'];
const DAILY_GOAL = 1;
const POLL_MS = 5 * 60 * 1000;

/* ------------------------------------------------------------------ utilità */

const $ = (s, el = document) => el.querySelector(s);
const store = {
  get(k, fallback) { try { const v = localStorage.getItem('lumen.' + k); if (v === null) return fallback; try { return JSON.parse(v); } catch { return v; } } catch { return fallback; } },
  set(k, v) { try { localStorage.setItem('lumen.' + k, JSON.stringify(v)); } catch { /* modalità privata */ } },
};

const state = {
  lang: store.get('lang', (navigator.language || 'it').startsWith('it') ? 'it' : 'it'),
  section: SECTIONS.includes(store.get('section', 'sapevi')) ? store.get('section', 'sapevi') : 'sapevi',
  topic: null, cards: [], byId: new Map(), updatedAt: null, openId: null, order: [],
};
const t = (k, ...a) => { const v = I18N[state.lang][k] ?? I18N.it[k]; return typeof v === 'function' ? v(...a) : v; };
const locale = () => (state.lang === 'en' ? 'en-GB' : 'it-IT');
const topicLabel = (id) => { const x = TOPICS.find((tp) => tp.id === id); return x ? (state.lang === 'en' ? x.en : x.id) : id; };
const lvl = (k) => LEVELS[k] || LEVELS.recente;
const lvlText = (k, i) => lvl(k)[state.lang][i];

/** Testo della scheda nella lingua scelta (con ripiego sull'italiano). */
function tx(c) {
  if (state.lang === 'en' && c.en) {
    return { title: c.en.title, summary: c.en.summary, body: c.en.body, when: c.en.when ?? c.when, note: c.en.note ?? null, qtr: c.en.quotes || [] };
  }
  return { title: c.title, summary: c.summary, body: c.body, when: c.when, note: c.solidityNote, qtr: null };
}

function dayKey(d = new Date()) { return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; }
function startOfDay(d) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
function relDate(iso) {
  const d = new Date(iso); if (isNaN(d)) return '';
  const days = Math.floor((startOfDay(new Date()) - startOfDay(d)) / 86400000);
  if (days <= 0) return t('today'); if (days === 1) return t('yesterday'); if (days < 7) return t('daysAgo', days);
  return new Intl.DateTimeFormat(locale(), { day: 'numeric', month: 'short', year: 'numeric' }).format(d);
}
function safeUrl(u) { try { const x = new URL(u); return /^https?:$/.test(x.protocol) ? x.href : null; } catch { return null; } }
function typo(s) {
  return String(s)
    .replace(/(^|[\s(«“—-])'([^'\n]+?)'(?=[\s.,;:!?)»”—-]|$)/g, '$1“$2”')
    .replace(/(^|[\s(«—-])"([^"\n]+?)"(?=[\s.,;:!?)»—-]|$)/g, '$1“$2”')
    .replace(/'/g, '’');
}
function el(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = typo(text); return e; }
function minutes(c) { const x = tx(c); return Math.max(1, Math.round([x.summary, ...(x.body || [])].join(' ').split(/\s+/).length / 200)); }
function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; }
function vibrate(ms) { try { navigator.vibrate?.(ms); } catch { /* */ } }

/* ------------------------------------------------------------------ letture, serie, progressi */

const reads = () => store.get('read', []);
const readSet = () => new Set(reads().map((r) => r.id));
function readsOn(key) { return reads().filter((r) => r.day === key).length; }
function streak() {
  const days = new Set(reads().map((r) => r.day));
  const d = new Date(); let n = 0;
  if (!days.has(dayKey(d))) d.setDate(d.getDate() - 1); // la serie resta valida fino a fine giornata
  while (days.has(dayKey(d))) { n++; d.setDate(d.getDate() - 1); }
  return n;
}
function markRead(id) {
  const list = reads(); if (list.some((r) => r.id === id)) return false;
  list.push({ id, day: dayKey() }); store.set('read', list.slice(-5000));
  document.querySelector(`.card[data-id="${CSS.escape(id)}"]`)?.classList.add('is-read');
  renderStreak(true);
  return true;
}
function renderStreak(pop = false) {
  const today = readsOn(dayKey());
  const btn = $('#streakBtn');
  btn.classList.toggle('is-lit', today >= DAILY_GOAL);
  $('#streakNum').textContent = streak();
  $('#streakFill').style.strokeDashoffset = String(100.5 * (1 - Math.min(1, today / DAILY_GOAL)));
  btn.setAttribute('aria-label', today >= DAILY_GOAL ? t('sheet_sub_on', today) : t('sheet_sub_off', streak()));
  if (pop) { btn.classList.add('is-pop'); setTimeout(() => btn.classList.remove('is-pop'), 450); }
}

function openProgress() {
  const today = readsOn(dayKey()); const s = streak(); const total = readSet().size; const all = state.cards.length || 1;
  const body = $('#sheetBody'); body.textContent = '';
  body.append(el('h3', null, t('sheet_t')));
  const sub = el('p', 'sub', today >= DAILY_GOAL ? t('sheet_sub_on', today) : t('sheet_sub_off', s)); sub.id = 'sheetTitle'; body.append(sub);
  const stats = el('div', 'stats');
  [[today + '/' + DAILY_GOAL, t('st_today'), today >= DAILY_GOAL], [s, t('st_streak'), s > 0], [total, t('st_total'), false]].forEach(([v, l, hot]) => {
    const x = el('div', 'stat' + (hot ? ' is-hot' : '')); x.append(el('b', null, String(v)), el('span', null, l)); stats.append(x);
  });
  body.append(stats);
  const ex = el('div', 'explore'); const row = el('div', 'explore__row'); const pct = Math.round((total / all) * 100);
  row.append(el('span', null, t('explored')), el('span', null, `${Math.min(total, all)}/${all} · ${pct}%`));
  const bar = el('div', 'explore__bar'); const fill = el('span'); fill.style.width = '0%'; bar.append(fill); ex.append(row, bar); body.append(ex);
  requestAnimationFrame(() => requestAnimationFrame(() => { fill.style.width = Math.min(100, pct) + '%'; }));
  const days = new Set(reads().map((r) => r.day)); const week = el('div', 'week');
  const now = new Date(); const monday = new Date(now); monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday); d.setDate(monday.getDate() + i);
    const w = el('div'); const dot = el('i'); const k = dayKey(d);
    if (days.has(k)) { dot.className = 'on'; dot.innerHTML = '<svg viewBox="0 0 24 24"><path d="M12 2.5c.6 3.2-1.2 4.9-2.7 6.5C7.8 10.6 6.5 12.2 6.5 15a5.5 5.5 0 0 0 11 0c0-2.1-.9-3.6-1.9-4.9-.3 1.5-1.1 2.6-2.4 3 .6-3.9-.4-7.6-1.2-10.6Z"/></svg>'; }
    else if (k === dayKey()) dot.className = 'today';
    w.append(dot, el('span', null, t('weekdays')[i])); week.append(w);
  }
  body.append(week);
  const how = el('div', 'howto'); how.innerHTML = t('howto'); body.append(how);
  const ok = el('button', 'sheet__close', t('gotit')); ok.dataset.close = ''; body.append(ok);
  const sh = $('#sheet'); sh.hidden = false; document.body.classList.add('locked');
  store.set('hintSeen', true);
}
function closeSheet() { $('#sheet').hidden = true; if (!state.openId) document.body.classList.remove('locked'); }

let toastTimer;
function toast(msg) { const x = $('#toast'); x.textContent = msg; x.classList.add('is-on'); clearTimeout(toastTimer); toastTimer = setTimeout(() => x.classList.remove('is-on'), 2600); }

/* ------------------------------------------------------------------ dati */

async function loadData() {
  const res = await fetch('data/cards.json', { cache: 'no-cache' });
  if (!res.ok) throw new Error('HTTP ' + res.status);
  const data = await res.json();
  state.cards = (data.cards || []).filter((c) => c && c.id && c.title);
  state.byId = new Map(state.cards.map((c) => [c.id, c]));
  state.updatedAt = data.updatedAt || null;
}
async function checkForUpdates() {
  if (!state.updatedAt || document.visibilityState !== 'visible') return;
  try {
    const res = await fetch('data/meta.json?t=' + Date.now(), { cache: 'no-store' }); if (!res.ok) return;
    const meta = await res.json();
    if (meta.updatedAt && new Date(meta.updatedAt) > new Date(state.updatedAt)) { $('#fresh').hidden = false; syncHeaderHeight(); }
  } catch { /* offline */ }
}

/* ------------------------------------------------------------------ feed */

function visibleCards() {
  const list = state.cards.filter((c) => c.section === state.section && (!state.topic || c.topic === state.topic));
  if (state.section === 'novita') return list.sort((a, b) => new Date(b.date) - new Date(a.date));
  const read = readSet(); const seed = dayKey();
  return list.sort((a, b) => (read.has(a.id) - read.has(b.id)) || (hash(seed + a.id) - hash(seed + b.id)));
}

function mediaFor(card, container) {
  const art = el('div', 'art'); art.dataset.glyph = (TOPICS.find((tp) => tp.id === card.topic) || TOPICS[0]).glyph; container.append(art);
  const src = card.image && safeUrl(card.image); if (!src) return;
  const img = new Image(); img.alt = ''; img.decoding = 'async'; img.loading = 'lazy'; img.referrerPolicy = 'no-referrer';
  img.onload = () => { img.classList.add('is-loaded'); art.remove(); }; img.onerror = () => img.remove();
  img.src = src; container.append(img);
}

function scoreChip(level) {
  const L = lvl(level); const chip = el('span', 'score-chip'); chip.dataset.level = level;
  if (L.v) { const ico = el('span', 'verdict-ico'); ico.textContent = L.v; chip.append(ico); }
  else { const m = el('span', 'meter'); m.dataset.n = L.n; for (let i = 0; i < 4; i++) m.append(el('b')); chip.append(m); }
  chip.append(document.createTextNode(lvlText(level, 1)));
  if (!L.v) chip.append(el('small', null, `${L.n}/4`));
  return chip;
}

function renderChips() {
  const wrap = $('#chips'); wrap.textContent = '';
  const all = el('button', 'chip', t('all')); all.setAttribute('aria-pressed', String(!state.topic)); all.onclick = () => setTopic(null); wrap.append(all);
  const counts = new Map(); state.cards.filter((c) => c.section === state.section).forEach((c) => counts.set(c.topic, (counts.get(c.topic) || 0) + 1));
  for (const tp of TOPICS) {
    if (!counts.get(tp.id)) continue;
    const b = el('button', 'chip'); b.dataset.topic = tp.id; b.append(el('i'), document.createTextNode(topicLabel(tp.id)));
    b.setAttribute('aria-pressed', String(state.topic === tp.id)); b.onclick = () => setTopic(state.topic === tp.id ? null : tp.id); wrap.append(b);
  }
}

function renderFeed() {
  const feed = $('#feed'); feed.textContent = '';
  const list = visibleCards(); state.order = list.map((c) => c.id);
  const read = readSet();
  if (!list.length) { const box = el('div', 'empty'); box.append(el('h2', null, t('empty_t')), el('p', null, t('empty_s'))); feed.append(box); return; }
  const tpl = $('#cardTpl');
  const fresh = Date.now() - 3 * 86400000;
  list.forEach((card, i) => {
    const x = tx(card);
    const node = tpl.content.firstElementChild.cloneNode(true);
    node.dataset.id = card.id; node.dataset.topic = card.topic; node.style.setProperty('--i', Math.min(i, 4));
    const isRead = read.has(card.id); if (isRead) node.classList.add('is-read');
    const media = $('.card__media', node); mediaFor(card, media);
    const tags = el('div', 'media-tags');
    const tp = el('span', 'pill topic-pill', topicLabel(card.topic)); tags.append(tp);
    if (i === 0 && state.section !== 'novita' && !state.topic && !isRead) tags.prepend(el('span', 'pill today', t('today_badge')));
    else if (!isRead && new Date(card.addedAt) > fresh && state.section !== 'novita') tags.append(el('span', 'pill new', t('new_badge')));
    media.append(tags, scoreChip(card.solidity));
    const meta = $('.card__meta', node);
    const when = state.section === 'novita' ? relDate(card.date) : x.when;
    meta.append(el('span', null, card.sources?.[0]?.name || ''));
    if (when) { meta.append(el('span', 'dot')); meta.append(el('span', null, when)); }
    $('.card__title', node).textContent = typo(x.title);
    $('.card__summary', node).textContent = typo(x.summary);
    $('.card__source', node).textContent = t('minRead', minutes(card));
    $('.card__more-label', node).textContent = isRead ? t('alreadyRead') + ' ✓' : t('read');
    node.setAttribute('aria-label', `${x.title}. ${x.summary}`);
    node.onclick = () => openDetail(card.id);
    node.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openDetail(card.id); } };
    feed.append(node);
  });
  const end = el('div', 'end');
  if (state.section === 'novita') end.append(el('span', 'end__big', t('end_research')), document.createTextNode(t('end_research_s')));
  else {
    const left = list.filter((c) => !read.has(c.id)).length;
    if (left) {
      end.append(el('span', 'end__big', t('end_left', left)));
      const bar = el('div', 'end__bar'); const f = el('span'); f.style.width = Math.round(((list.length - left) / list.length) * 100) + '%'; bar.append(f);
      end.append(bar, document.createTextNode(t('end_tomorrow')));
    } else end.append(el('span', 'end__big', t('end_all')), document.createTextNode(t('end_all_s')));
  }
  feed.append(end);
  requestAnimationFrame(updateFocus);
}

function setSection(section) {
  if (section === state.section) return;
  state.section = section; state.topic = null; store.set('section', section);
  syncTabs(); renderChips(); renderFeed(); window.scrollTo({ top: 0, behavior: 'instant' });
}
function setTopic(topic) { state.topic = topic; renderChips(); renderFeed(); window.scrollTo({ top: 0, behavior: 'instant' }); }
function syncTabs() {
  const tabs = $('#tabs'); tabs.style.setProperty('--tab', SECTIONS.indexOf(state.section));
  tabs.querySelectorAll('.tabs__btn').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.section === state.section)));
}

let ticking = false; let headerH = 176;
function updateFocus() {
  ticking = false; const anchor = headerH + 12; const vh = window.innerHeight;
  for (const card of document.querySelectorAll('.card')) {
    const r = card.getBoundingClientRect();
    if (r.bottom < -50 || r.top > vh + 50) { card.style.setProperty('--d', '1'); continue; }
    card.style.setProperty('--d', (Math.round(Math.min(1, Math.abs(r.top - anchor) / (r.height * 0.85)) * 100) / 100).toString());
  }
  $('#top').classList.toggle('is-scrolled', window.scrollY > 4);
}
function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(updateFocus); } }
function syncHeaderHeight() { headerH = $('#top').offsetHeight; document.documentElement.style.setProperty('--header-h', headerH + 'px'); updateFocus(); }

/* ------------------------------------------------------------------ dettaglio */

let doneObserver;
function openDetail(id, { push = true } = {}) {
  const card = state.byId.get(id); if (!card) return;
  const x = tx(card);
  state.openId = id;
  const d = $('#detail'); d.dataset.topic = card.topic;

  const hero = $('#dHero'); hero.textContent = ''; mediaFor(card, hero);
  $('#dCredit').textContent = card.image && card.imageCredit ? typo(`${t('image')}: ${card.imageCredit}`) : '';

  const meta = $('#dMeta'); meta.textContent = '';
  const tp = el('span', 'topic', topicLabel(card.topic)); tp.dataset.topic = card.topic; meta.append(tp);
  const when = card.section === 'novita' ? new Intl.DateTimeFormat(locale(), { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(card.date)) : x.when;
  if (when) meta.append(el('span', null, when));
  meta.append(el('span', null, t('minRead', minutes(card))));

  $('#dTitle').textContent = typo(x.title);
  $('#dLead').textContent = typo(x.summary);

  // Punteggio di solidità / verdetto
  const L = lvl(card.solidity); const sc = $('#dScore'); sc.dataset.level = card.solidity; sc.textContent = '';
  const g = el('div', 'score__gauge');
  g.innerHTML = '<svg viewBox="0 0 58 58"><circle class="t" cx="29" cy="29" r="24"/><circle class="f" cx="29" cy="29" r="24" style="stroke-dashoffset:150.8"/></svg>';
  g.append(el('span', null, L.v || `${L.n}/4`));
  const head = el('div'); head.append(el('span', 'score__label', card.section === 'aneddoti' ? t('score_verdict') : t('score_solid')), el('strong', null, lvlText(card.solidity, 0)));
  sc.append(g, head, el('p', null, lvlText(card.solidity, 2)));
  if (x.note) sc.append(el('p', 'why', x.note));
  const frac = L.v ? ({ '✓': 0.85, '?': 0.5, '✕': 0.15 })[L.v] : L.n / 4;
  requestAnimationFrame(() => requestAnimationFrame(() => { $('.f', g).style.strokeDashoffset = String(150.8 * (1 - frac)); }));

  const body = $('#dBody'); body.textContent = ''; (x.body || []).forEach((p) => body.append(el('p', null, p)));

  const quotes = $('#dQuotes'); quotes.textContent = '';
  if (card.quotes?.length) {
    quotes.append(el('h3', 'label', t('fromSource')));
    card.quotes.forEach((q, i) => {
      const fig = el('figure', 'quote'); fig.append(el('blockquote', null, `“${q.text}”`));
      const tr = x.qtr ? x.qtr[i] : q.translation; if (tr) fig.append(el('p', 'tr', tr));
      if (q.author) fig.append(el('cite', null, '— ' + q.author)); quotes.append(fig);
    });
  }

  renderVideos(card);

  const list = $('#dSources'); list.textContent = '';
  for (const s of card.sources || []) {
    const url = safeUrl(s.url); if (!url) continue;
    const li = el('li'); const a = el('a', 'src'); a.href = url; a.target = '_blank'; a.rel = 'noopener noreferrer';
    const fav = el('span', 'src__fav', (s.name || '?').replace(/[^A-Za-zÀ-ÿ]/g, '').slice(0, 2).toUpperCase());
    const txt = el('span', 'src__txt'); txt.append(el('div', 'src__name', s.name || new URL(url).hostname), el('div', 'src__title', s.title || url));
    a.append(fav, txt); a.insertAdjacentHTML('beforeend', '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17 17 7M9 7h8v8"/></svg>');
    li.append(a); list.append(li);
  }

  renderDone(card, readSet().has(card.id));
  renderNext(card);

  $('#detailScroll').scrollTop = 0;
  d.classList.add('is-open'); document.body.classList.add('locked');
  $('#readBar').classList.add('is-on'); updateReadBar();
  if (push) history.pushState({ card: id }, '', '#/scheda/' + id);
  $('#dClose').focus({ preventScroll: true });

  // Quando arrivi in fondo: lettura completata
  doneObserver?.disconnect();
  doneObserver = new IntersectionObserver((entries) => {
    // Conta solo se l'utente ha davvero scorso il testo fino alle fonti.
    if (!entries.some((e) => e.isIntersecting) || state.openId !== id || $('#detailScroll').scrollTop < 300) return;
    doneObserver.disconnect();
    if (markRead(id)) { renderDone(card, true, true); vibrate(18); toast(t('toast_read', streak())); }
  }, { root: $('#detailScroll'), threshold: 0.5 });
  doneObserver.observe($('#dSources'));
}

function renderVideos(card) {
  const box = $('#dVideos'); box.textContent = '';
  box.append(el('h3', 'label', t('videos')));
  for (const v of card.videos || []) {
    const b = el('button', 'vcard'); b.setAttribute('aria-label', `${t('play')}: ${v.title}`);
    const th = el('div', 'vcard__thumb'); th.style.backgroundImage = `url(https://i.ytimg.com/vi/${encodeURIComponent(v.id)}/hqdefault.jpg)`;
    th.insertAdjacentHTML('beforeend', '<span class="vcard__play"><svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg></span>');
    if (v.length) th.append(el('span', 'vcard__len', v.length));
    const info = el('div', 'vcard__info'); info.append(el('div', 'vcard__title', v.title), el('div', 'vcard__ch', v.channel));
    b.append(th, info);
    b.onclick = () => {
      const f = document.createElement('iframe'); f.className = 'vframe';
      f.src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(v.id)}?autoplay=1&rel=0&modestbranding=1&hl=${state.lang}`;
      f.title = v.title; f.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen'; f.allowFullscreen = true;
      th.replaceWith(f);
    };
    box.append(b);
  }
  const q = card.videoQuery || tx(card).title;
  const a = el('a', 'vsearch'); a.href = 'https://www.youtube.com/results?search_query=' + encodeURIComponent(q); a.target = '_blank'; a.rel = 'noopener noreferrer';
  a.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg>';
  a.append(document.createTextNode(t('moreVideos'))); box.append(a);
}

function renderDone(card, isRead, animate = false) {
  const box = $('#dDone'); box.textContent = '';
  if (!isRead) return;
  const d = el('div', 'done__box'); if (!animate) d.style.animation = 'none';
  d.insertAdjacentHTML('afterbegin', '<span class="done__check"><svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></span>');
  const tx2 = el('div', 'done__txt'); tx2.append(el('strong', null, t('done_t')), el('span', null, t('done_s', streak()))); d.append(tx2);
  if (!animate) d.querySelector('.done__check svg').style.animation = 'none', d.querySelector('.done__check svg').style.strokeDashoffset = '0';
  box.append(d);
}

function renderNext(card) {
  const box = $('#dNext'); box.textContent = '';
  const read = readSet(); const ids = state.order.length ? state.order : visibleCards().map((c) => c.id);
  const start = ids.indexOf(card.id);
  const pool = [...ids.slice(start + 1), ...ids.slice(0, Math.max(0, start))].map((i) => state.byId.get(i)).filter(Boolean);
  const next = pool.find((c) => !read.has(c.id) && c.id !== card.id) || pool.find((c) => c.id !== card.id);
  if (!next) return;
  const x = tx(next);
  box.append(el('h3', 'label', t('nextUp')));
  const b = el('button', 'nextcard'); b.dataset.topic = next.topic;
  const im = el('div', 'nextcard__img'); mediaFor(next, im);
  const txt = el('div'); txt.append(el('div', 'nextcard__t', x.title), el('div', 'nextcard__m', `${topicLabel(next.topic)} · ${t('minRead', minutes(next))}`));
  b.append(im, txt); b.onclick = () => { history.replaceState({ card: next.id }, '', '#/scheda/' + next.id); openDetail(next.id, { push: false }); };
  box.append(b);
}

function closeDetail({ fromPop = false } = {}) {
  if (!state.openId) return;
  const id = state.openId; state.openId = null;
  doneObserver?.disconnect();
  const d = $('#detail'); d.classList.remove('is-open'); d.style.transform = '';
  $('#readBar').classList.remove('is-on');
  document.body.classList.remove('locked');
  setTimeout(() => { if (!state.openId) $('#dVideos').textContent = ''; }, 600); // ferma un eventuale video
  if (!fromPop && history.state?.card) history.back();
  const card = document.querySelector(`.card[data-id="${CSS.escape(id)}"]`);
  if (card && readSet().has(id)) { card.classList.add('is-read'); $('.card__more-label', card).textContent = t('alreadyRead') + ' ✓'; }
  card?.focus({ preventScroll: true });
}

function updateReadBar() {
  const sc = $('#detailScroll'); const max = sc.scrollHeight - sc.clientHeight;
  $('#readBar').style.setProperty('--p', max > 0 ? Math.min(1, sc.scrollTop / max) : 0);
}

function enableSwipeToClose() {
  const d = $('#detail'); const sc = $('#detailScroll'); let startY = null, dy = 0;
  sc.addEventListener('touchstart', (e) => { startY = sc.scrollTop <= 0 ? e.touches[0].clientY : null; dy = 0; }, { passive: true });
  sc.addEventListener('touchmove', (e) => { if (startY === null) return; dy = e.touches[0].clientY - startY; if (dy > 0) { d.style.transition = 'none'; d.style.transform = `translateY(${dy * 0.6}px)`; } }, { passive: true });
  sc.addEventListener('touchend', () => { if (startY === null) return; d.style.transition = ''; if (dy > 110) closeDetail(); else d.style.transform = ''; startY = null; });
  sc.addEventListener('scroll', updateReadBar, { passive: true });
}

/* ------------------------------------------------------------------ tema e lingua */

function currentTheme() { return document.documentElement.dataset.theme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'); }
function applyTheme(th) {
  document.documentElement.dataset.theme = th; store.set('theme', th);
  document.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.setAttribute('content', th === 'dark' ? '#0c0c0d' : '#ffffff'));
}
function applyLang(lang, rerender = true) {
  state.lang = lang; store.set('lang', lang); document.documentElement.lang = lang;
  document.querySelectorAll('[data-i18n]').forEach((n) => { n.textContent = t(n.dataset.i18n); });
  document.querySelectorAll('[data-i18n-label]').forEach((n) => n.setAttribute('aria-label', t(n.dataset.i18nLabel)));
  $('#themeBtn').setAttribute('aria-label', t('theme'));
  $('#today').textContent = new Intl.DateTimeFormat(locale(), { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date());
  if (!rerender) return;
  renderChips(); renderFeed(); renderStreak(); syncHeaderHeight();
  if (state.openId) openDetail(state.openId, { push: false });
}

/* ------------------------------------------------------------------ avvio */

async function init() {
  applyLang(state.lang, false); syncTabs(); renderStreak();
  if (document.documentElement.dataset.theme) applyTheme(document.documentElement.dataset.theme);
  const feed = $('#feed'); feed.innerHTML = '<div class="skeleton"></div><div class="skeleton"></div>';

  document.querySelectorAll('.tabs__btn').forEach((b) => (b.onclick = () => setSection(b.dataset.section)));
  $('#themeBtn').onclick = () => applyTheme(currentTheme() === 'dark' ? 'light' : 'dark');
  $('#langBtn').onclick = () => applyLang(state.lang === 'en' ? 'it' : 'en');
  $('#streakBtn').onclick = openProgress;
  $('#sheet').addEventListener('click', (e) => { if (e.target.closest('[data-close]')) closeSheet(); });
  $('#dClose').onclick = () => closeDetail();
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { if (!$('#sheet').hidden) closeSheet(); else closeDetail(); } });
  window.addEventListener('popstate', () => {
    const m = location.hash.match(/^#\/scheda\/(.+)$/);
    if (m && state.byId.has(m[1])) openDetail(m[1], { push: false }); else closeDetail({ fromPop: true });
  });
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', syncHeaderHeight);
  new ResizeObserver(syncHeaderHeight).observe($('#top'));
  enableSwipeToClose();
  $('#fresh').onclick = async () => { $('#fresh').hidden = true; await loadData().catch(() => {}); renderChips(); renderFeed(); syncHeaderHeight(); window.scrollTo({ top: 0, behavior: 'smooth' }); };

  try { await loadData(); }
  catch { feed.innerHTML = ''; const box = el('div', 'empty'); box.append(el('h2', null, 'Offline'), el('p', null, '—')); feed.append(box); return; }
  renderChips(); renderFeed(); syncHeaderHeight();

  const m = location.hash.match(/^#\/scheda\/(.+)$/);
  if (m && state.byId.has(m[1])) { history.replaceState(null, '', location.pathname); openDetail(m[1]); }

  if (!store.get('hintSeen', false)) setTimeout(() => { if (!state.openId) toast(t('hint')); }, 2500);
  setInterval(checkForUpdates, POLL_MS);
  document.addEventListener('visibilitychange', () => { checkForUpdates(); renderStreak(); });
  setTimeout(checkForUpdates, 4000);
  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
}

init();
