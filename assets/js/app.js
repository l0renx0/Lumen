// Lumen — logica dell'app (nessuna dipendenza esterna)

const TOPICS = [
  { id: 'Scienza', glyph: 'Sc' },
  { id: 'Spazio', glyph: 'Sp' },
  { id: 'Salute', glyph: 'Sa' },
  { id: 'Storia', glyph: 'St' },
  { id: 'Tecnologia', glyph: 'Te' },
  { id: 'Natura', glyph: 'Na' },
  { id: 'Società', glyph: 'So' },
];

const SOLIDITY = {
  consolidato: {
    label: 'Consolidato',
    desc: 'Conoscenza accettata da tempo, verificata da molte fonti indipendenti, oppure fatto storico documentato.',
  },
  ufficiale: {
    label: 'Dato ufficiale',
    desc: 'Dato, misura o annuncio diffuso direttamente da un ente ufficiale (agenzia spaziale, istituto statistico, autorità sanitaria).',
  },
  recente: {
    label: 'Studio recente, da confermare',
    desc: 'Risultato nuovo e pubblicato, ma non ancora replicato da altri gruppi di ricerca. Potrebbe essere precisato o corretto.',
  },
  preliminare: {
    label: 'Preliminare',
    desc: 'Ipotesi teorica o risultato iniziale. È un tassello interessante, non una conclusione.',
  },
};

const DAILY_GOAL = 1;
const POLL_MS = 5 * 60 * 1000;

const $ = (s, el = document) => el.querySelector(s);
const store = {
  get(k, fallback) { try { const v = localStorage.getItem('lumen.' + k); return v === null ? fallback : JSON.parse(v); } catch { return fallback; } },
  set(k, v) { try { localStorage.setItem('lumen.' + k, JSON.stringify(v)); } catch { /* modalità privata */ } },
};

const state = {
  section: store.get('section', 'novita'),
  topic: null,
  cards: [],
  byId: new Map(),
  updatedAt: null,
  openId: null,
};

/* ---------------------------------------------------------------- utilità */

const fmtDay = new Intl.DateTimeFormat('it-IT', { weekday: 'long', day: 'numeric', month: 'long' });
const fmtDate = new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'short', year: 'numeric' });
const fmtLong = new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'long', year: 'numeric' });

function relDate(iso) {
  const d = new Date(iso);
  if (isNaN(d)) return '';
  const days = Math.floor((startOfDay(new Date()) - startOfDay(d)) / 86400000);
  if (days <= 0) return 'Oggi';
  if (days === 1) return 'Ieri';
  if (days < 7) return `${days} giorni fa`;
  return fmtDate.format(d);
}
function startOfDay(d) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
function todayKey() { const d = new Date(); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; }
function safeUrl(u) { try { const x = new URL(u); return /^https?:$/.test(x.protocol) ? x.href : null; } catch { return null; } }
// Virgolette e apostrofi tipografici: 'parola' → “parola”, dell'acqua → dell’acqua
function typo(s) {
  return String(s)
    .replace(/(^|[\s(«“—-])'([^'\n]+?)'(?=[\s.,;:!?)»”—-]|$)/g, '$1“$2”')
    .replace(/(^|[\s(«—-])"([^"\n]+?)"(?=[\s.,;:!?)»—-]|$)/g, '$1“$2”')
    .replace(/'/g, '’');
}
function el(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = typo(text); return e; }
function readingMinutes(card) {
  const words = [card.summary, ...(card.body || [])].join(' ').split(/\s+/).length;
  return Math.max(1, Math.round(words / 200));
}

function topicChip(topic) {
  const t = el('span', 'topic', topic);
  t.dataset.topic = topic;
  return t;
}
function solidityBadge(level) {
  const info = SOLIDITY[level] || SOLIDITY.recente;
  const b = el('span', 'badge');
  b.dataset.level = level;
  const bars = el('span', 'bars');
  for (let i = 0; i < 4; i++) bars.append(el('b'));
  b.append(bars, document.createTextNode(level === 'recente' ? 'Da confermare' : info.label));
  b.title = info.label;
  return b;
}

function mediaFor(card, container) {
  const art = el('div', 'art');
  art.dataset.glyph = (TOPICS.find((t) => t.id === card.topic) || TOPICS[0]).glyph;
  container.append(art);
  const src = card.image && safeUrl(card.image);
  if (!src) return;
  const img = new Image();
  img.alt = card.imageAlt || '';
  img.decoding = 'async';
  img.loading = 'lazy';
  img.referrerPolicy = 'no-referrer';
  img.onload = () => { img.classList.add('is-loaded'); art.remove(); };
  img.onerror = () => img.remove();
  img.src = src;
  container.append(img);
}

/* ---------------------------------------------------------------- dati */

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
    const res = await fetch('data/meta.json?t=' + Date.now(), { cache: 'no-store' });
    if (!res.ok) return;
    const meta = await res.json();
    if (meta.updatedAt && new Date(meta.updatedAt) > new Date(state.updatedAt)) {
      $('#fresh').hidden = false;
      syncHeaderHeight();
    }
  } catch { /* offline: riproveremo */ }
}

/* ---------------------------------------------------------------- feed */

function visibleCards() {
  const list = state.cards.filter((c) => c.section === state.section && (!state.topic || c.topic === state.topic));
  const key = state.section === 'novita' ? 'date' : 'addedAt';
  return list.sort((a, b) => new Date(b[key] || b.date) - new Date(a[key] || a.date));
}

function renderChips() {
  const wrap = $('#chips');
  wrap.textContent = '';
  const all = el('button', 'chip', 'Tutti');
  all.setAttribute('aria-pressed', String(!state.topic));
  all.onclick = () => setTopic(null);
  wrap.append(all);
  const counts = new Map();
  state.cards.filter((c) => c.section === state.section).forEach((c) => counts.set(c.topic, (counts.get(c.topic) || 0) + 1));
  for (const t of TOPICS) {
    if (!counts.get(t.id)) continue;
    const b = el('button', 'chip');
    b.dataset.topic = t.id;
    b.append(el('i'), document.createTextNode(t.id));
    b.setAttribute('aria-pressed', String(state.topic === t.id));
    b.onclick = () => setTopic(state.topic === t.id ? null : t.id);
    wrap.append(b);
  }
}

function renderFeed() {
  const feed = $('#feed');
  feed.textContent = '';
  const list = visibleCards();
  const read = new Set(store.get('read', []).map((r) => r.id));

  if (!list.length) {
    const box = el('div', 'empty');
    box.append(el('h2', null, 'Ancora niente qui'), el('p', null, 'Prova un altro argomento: nuove schede arrivano ogni giorno.'));
    feed.append(box);
    return;
  }

  const tpl = $('#cardTpl');
  list.forEach((card, i) => {
    const node = tpl.content.firstElementChild.cloneNode(true);
    node.dataset.id = card.id;
    node.dataset.topic = card.topic;
    node.style.setProperty('--i', Math.min(i, 4));
    if (read.has(card.id)) node.classList.add('is-read');
    mediaFor(card, $('.card__media', node));
    const meta = $('.meta-row', node);
    meta.append(topicChip(card.topic), solidityBadge(card.solidity));
    $('.card__title', node).textContent = typo(card.title);
    $('.card__summary', node).textContent = typo(card.summary);
    const first = card.sources?.[0];
    $('.card__source', node).textContent = [first?.name, state.section === 'novita' ? relDate(card.date) : card.when].filter(Boolean).join(' · ');
    node.setAttribute('aria-label', `${card.title}. ${card.summary}`);
    node.onclick = () => openDetail(card.id);
    node.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openDetail(card.id); } };
    feed.append(node);
  });

  const end = el('div', 'end');
  end.append(el('span', null, state.section === 'novita' ? 'Sei arrivato in fondo.' : 'Per oggi è tutto.'), document.createTextNode('Domani arriveranno nuove schede.'));
  feed.append(end);
  requestAnimationFrame(updateFocus);
}

function setSection(section) {
  if (section === state.section) return;
  state.section = section;
  state.topic = null;
  store.set('section', section);
  syncTabs();
  renderChips();
  renderFeed();
  window.scrollTo({ top: 0, behavior: 'instant' });
}
function setTopic(topic) {
  state.topic = topic;
  renderChips();
  renderFeed();
  window.scrollTo({ top: 0, behavior: 'instant' });
}
function syncTabs() {
  const tabs = $('.tabs');
  tabs.dataset.active = state.section;
  tabs.querySelectorAll('.tabs__btn').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.section === state.section)));
}

/* Effetto messa a fuoco: la scheda in primo piano è nitida, le altre sfocate */
let ticking = false;
function updateFocus() {
  ticking = false;
  const anchor = headerH + 12;
  const vh = window.innerHeight;
  for (const card of document.querySelectorAll('.card')) {
    const r = card.getBoundingClientRect();
    if (r.bottom < -50 || r.top > vh + 50) { card.style.setProperty('--d', '1'); continue; }
    const d = Math.min(1, Math.abs(r.top - anchor) / (r.height * 0.85));
    card.style.setProperty('--d', (Math.round(d * 100) / 100).toString());
  }
  $('#top').classList.toggle('is-scrolled', window.scrollY > 4);
}
function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(updateFocus); } }

let headerH = 168;
function syncHeaderHeight() {
  headerH = $('#top').offsetHeight;
  document.documentElement.style.setProperty('--header-h', headerH + 'px');
  updateFocus();
}

/* ---------------------------------------------------------------- dettaglio */

function openDetail(id, { push = true } = {}) {
  const card = state.byId.get(id);
  if (!card) return;
  state.openId = id;
  const d = $('#detail');
  d.dataset.topic = card.topic;

  const hero = $('#dHero');
  hero.textContent = '';
  mediaFor(card, hero);
  $('#dCredit').textContent = card.image && card.imageCredit ? typo('Immagine: ' + card.imageCredit) : '';

  const meta = $('#dMeta');
  meta.textContent = '';
  const when = state.section === 'novita' || card.section === 'novita' ? fmtLong.format(new Date(card.date)) : card.when || fmtLong.format(new Date(card.date));
  meta.append(topicChip(card.topic), el('span', null, when), el('span', null, `${readingMinutes(card)} min di lettura`));

  $('#dTitle').textContent = typo(card.title);
  $('#dLead').textContent = typo(card.summary);

  const info = SOLIDITY[card.solidity] || SOLIDITY.recente;
  const solid = $('#dSolid');
  solid.dataset.level = card.solidity;
  solid.textContent = '';
  const meter = el('div', 'meter');
  for (let i = 0; i < 4; i++) meter.append(el('b'));
  solid.append(meter, el('strong', null, info.label), el('p', null, info.desc));
  if (card.solidityNote) solid.append(el('p', 'why', card.solidityNote));

  const body = $('#dBody');
  body.textContent = '';
  (card.body || []).forEach((p) => body.append(el('p', null, p)));

  const quotes = $('#dQuotes');
  quotes.textContent = '';
  if (card.quotes?.length) {
    quotes.append(el('h3', 'label', 'Dalla fonte'));
    for (const q of card.quotes) {
      const fig = el('figure', 'quote');
      fig.append(el('blockquote', null, `“${q.text}”`));
      if (q.translation) fig.append(el('p', 'tr', q.translation));
      if (q.author) fig.append(el('cite', null, '— ' + q.author));
      quotes.append(fig);
    }
  }

  const list = $('#dSources');
  list.textContent = '';
  for (const s of card.sources || []) {
    const url = safeUrl(s.url);
    if (!url) continue;
    const li = el('li');
    const a = el('a', 'src');
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    const fav = el('span', 'src__fav', (s.name || '?').replace(/[^A-Za-zÀ-ÿ]/g, '').slice(0, 2).toUpperCase());
    const txt = el('span', 'src__txt');
    txt.append(el('div', 'src__name', s.name || new URL(url).hostname), el('div', 'src__title', s.title || url));
    a.append(fav, txt);
    a.insertAdjacentHTML('beforeend', '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17 17 7M9 7h8v8"/></svg>');
    li.append(a);
    list.append(li);
  }

  $('#detailScroll').scrollTop = 0;
  d.hidden = false;
  requestAnimationFrame(() => d.classList.add('is-open'));
  document.body.classList.add('locked');
  if (push) history.pushState({ card: id }, '', '#/scheda/' + id);
  $('#dClose').focus({ preventScroll: true });
  markRead(id);
}

function closeDetail({ fromPop = false } = {}) {
  if (!state.openId) return;
  const id = state.openId;
  state.openId = null;
  const d = $('#detail');
  d.classList.remove('is-open');
  d.style.transform = '';
  document.body.classList.remove('locked');
  if (!fromPop && history.state?.card) history.back();
  const card = document.querySelector(`.card[data-id="${CSS.escape(id)}"]`);
  card?.focus({ preventScroll: true });
}

/* Trascina verso il basso per chiudere */
function enableSwipeToClose() {
  const d = $('#detail');
  const sc = $('#detailScroll');
  let startY = null, dy = 0;
  sc.addEventListener('touchstart', (e) => { startY = sc.scrollTop <= 0 ? e.touches[0].clientY : null; dy = 0; }, { passive: true });
  sc.addEventListener('touchmove', (e) => {
    if (startY === null) return;
    dy = e.touches[0].clientY - startY;
    if (dy > 0) { d.style.transition = 'none'; d.style.transform = `translateY(${dy * 0.6}px)`; }
  }, { passive: true });
  sc.addEventListener('touchend', () => {
    if (startY === null) return;
    d.style.transition = '';
    if (dy > 110) closeDetail(); else d.style.transform = '';
    startY = null;
  });
}

/* ---------------------------------------------------------------- obiettivo giornaliero */

function markRead(id) {
  const read = store.get('read', []).filter((r) => r.id !== id);
  read.push({ id, day: todayKey() });
  store.set('read', read.slice(-2000));
  document.querySelector(`.card[data-id="${CSS.escape(id)}"]`)?.classList.add('is-read');
  renderDaily();
}
function renderDaily() {
  const n = store.get('read', []).filter((r) => r.day === todayKey()).length;
  $('#dailyCount').textContent = n;
  const frac = Math.min(1, n / DAILY_GOAL);
  $('#dailyFill').style.strokeDashoffset = String(94.25 * (1 - frac));
  $('#daily').title = n >= DAILY_GOAL ? `Oggi hai imparato ${n} ${n === 1 ? 'cosa nuova' : 'cose nuove'}` : 'Leggi una scheda per raggiungere l’obiettivo di oggi';
}

/* ---------------------------------------------------------------- tema */

function currentTheme() {
  return document.documentElement.dataset.theme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
}
function applyTheme(t) {
  document.documentElement.dataset.theme = t;
  store.set('theme', t);
  try { localStorage.setItem('lumen.theme', t); } catch { /* */ }
  document.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.setAttribute('content', t === 'dark' ? '#0b0b0c' : '#ffffff'));
}

/* ---------------------------------------------------------------- avvio */

async function init() {
  $('#today').textContent = fmtDay.format(new Date());
  syncTabs();
  renderDaily();
  if (document.documentElement.dataset.theme) applyTheme(document.documentElement.dataset.theme);

  const feed = $('#feed');
  feed.innerHTML = '<div class="skeleton"></div><div class="skeleton"></div>';

  document.querySelectorAll('.tabs__btn').forEach((b) => (b.onclick = () => setSection(b.dataset.section)));
  $('#themeBtn').onclick = () => applyTheme(currentTheme() === 'dark' ? 'light' : 'dark');
  $('#dClose').onclick = () => closeDetail();
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeDetail(); });
  window.addEventListener('popstate', () => {
    const m = location.hash.match(/^#\/scheda\/(.+)$/);
    if (m && state.byId.has(m[1])) openDetail(m[1], { push: false });
    else closeDetail({ fromPop: true });
  });
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', syncHeaderHeight);
  new ResizeObserver(syncHeaderHeight).observe($('#top'));
  enableSwipeToClose();

  $('#fresh').onclick = async () => {
    $('#fresh').hidden = true;
    await loadData().catch(() => {});
    renderChips();
    renderFeed();
    syncHeaderHeight();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  try {
    await loadData();
  } catch (err) {
    feed.innerHTML = '';
    const box = el('div', 'empty');
    box.append(el('h2', null, 'Impossibile caricare le schede'), el('p', null, 'Controlla la connessione e riprova tra poco.'));
    feed.append(box);
    return;
  }
  renderChips();
  renderFeed();
  syncHeaderHeight();

  // Apertura diretta di una scheda da link (#/scheda/<id>)
  const m = location.hash.match(/^#\/scheda\/(.+)$/);
  if (m && state.byId.has(m[1])) {
    history.replaceState(null, '', location.pathname);
    openDetail(m[1]);
  }

  setInterval(checkForUpdates, POLL_MS);
  document.addEventListener('visibilitychange', checkForUpdates);
  setTimeout(checkForUpdates, 4000);

  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
}

init();
