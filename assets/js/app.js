// Lumen — scegli una materia, sfoglia gli argomenti, approfondisci quello che ti incuriosisce.
// Nessuna dipendenza. I contenuti stanno in data/argomenti.json.

const $ = (s, el = document) => el.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const store = {
  get(k, d) { try { const v = localStorage.getItem('lumen.' + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem('lumen.' + k, JSON.stringify(v)); } catch {} },
};
const today = () => new Date().toLocaleDateString('sv-SE'); // AAAA-MM-GG, ora locale

const ICONS = {
  fisica: '<svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="4" fill="currentColor"/><ellipse cx="32" cy="32" rx="28" ry="10"/><ellipse cx="32" cy="32" rx="28" ry="10" transform="rotate(60 32 32)"/><ellipse cx="32" cy="32" rx="28" ry="10" transform="rotate(120 32 32)"/></svg>',
  psicologia: '<svg viewBox="0 0 64 64"><path d="M38 56V46h6a4 4 0 0 0 4-4v-7l5-2-5-9C48 13 40 7 30 7 18 7 10 16 10 27c0 7 3 12 8 16v13"/><path d="M24 22c2-4 9-4 11 0 4-1 7 3 5 6 2 3-1 7-5 6-2 3-8 3-10 0-4 1-6-4-3-6-2-3 0-6 2-6Z"/></svg>',
  astronomia: '<svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="13"/><ellipse cx="32" cy="32" rx="29" ry="9" transform="rotate(-20 32 32)"/><circle cx="52" cy="10" r="1.6" fill="currentColor"/><circle cx="9" cy="50" r="1.2" fill="currentColor"/><circle cx="14" cy="12" r="1" fill="currentColor"/></svg>',
};
const PLAY = '<svg viewBox="0 0 24 24"><path d="M7 4.5v15l13-7.5z"/></svg>';

const state = { data: null, subjects: new Map(), topics: new Map(), query: '', chip: {} };

/* ── Progressi: letti, posizione di lettura, salvati, giorni di fila ── */
const explored = () => store.get('explored', {});        // { id: 'AAAA-MM-GG' }
const positions = () => store.get('pos', {});            // { id: { p: 0..1, at: timestamp } }
function markExplored(id) {
  const e = explored();
  if (e[id]) return;
  e[id] = today();
  store.set('explored', e);
  renderStreak();
  toast('Argomento completato ✓');
}
function savePos(id, p) {
  const all = positions();
  all[id] = { p: Math.round(p * 1000) / 1000, at: Date.now() };
  store.set('pos', all);
}
function streak() {
  const days = new Set(Object.values(explored()));
  let n = 0;
  const d = new Date();
  if (!days.has(d.toLocaleDateString('sv-SE'))) d.setDate(d.getDate() - 1); // oggi non ancora: conta da ieri
  while (days.has(d.toLocaleDateString('sv-SE'))) { n++; d.setDate(d.getDate() - 1); }
  return n;
}
function renderStreak() {
  $('#streakNum').textContent = streak();
  $('#streakBtn').classList.toggle('on', Object.values(explored()).includes(today()));
}
const savedIds = () => store.get('saved', []);
const isSaved = (id) => savedIds().includes(id);
function toggleSave(id) {
  const s = savedIds();
  const i = s.indexOf(id);
  if (i >= 0) s.splice(i, 1); else s.unshift(id);
  store.set('saved', s);
  toast(i >= 0 ? 'Tolto dai salvati' : 'Salvato');
  return i < 0;
}

/* ── Utilità ── */
let toastTimer;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 1900);
}
const topicsOf = (sid) => state.data.topics.filter((t) => t.subject === sid);
const subjectName = (sid) => state.subjects.get(sid).name;
function words(t) {
  const parts = [t.hook, t.example, ...t.points, ...t.sections.flatMap((s) => [s.h, ...s.p]),
    ...(t.mistakes || []), ...(t.terms || []).map((x) => x.d), ...(t.formulas || []).map((x) => x.d)];
  return parts.join(' ').split(/\s+/).length;
}
const minutes = (t) => Math.max(3, Math.round(words(t) / 200));
function hashSeed(str) { let h = 2166136261; for (const c of str) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; }
function progressOf(id) {
  if (explored()[id]) return 1;
  return positions()[id]?.p || 0;
}

/* ── Suggerimenti: cosa leggere adesso ──
   Niente percorsi obbligati: guarda cosa hai letto di recente e propone
   (1) l'argomento che viene subito dopo nel manuale, (2) altri argomenti dello
   stesso capitolo, (3) qualcosa da una materia che non hai ancora esplorato.
   Ogni proposta dice perché è lì. Un po' di varietà cambia ogni giorno. */
const DAY = 864e5;
function suggestions(exclude, max = 3) {
  const e = explored();
  const pos = positions();
  const now = Date.now();
  // Quando hai toccato un argomento l'ultima volta (letto o iniziato).
  const touched = new Map();
  for (const [id, d] of Object.entries(e)) touched.set(id, Math.max(touched.get(id) || 0, new Date(d + 'T12:00').getTime()));
  for (const [id, v] of Object.entries(pos)) if (v.p > 0.04) touched.set(id, Math.max(touched.get(id) || 0, v.at));
  const recent = [...touched.entries()].filter(([id]) => state.topics.has(id))
    .sort((a, b) => b[1] - a[1]).slice(0, 8).map(([id, at]) => ({ t: state.topics.get(id), at }));
  const busy = (t) => e[t.id] || (pos[t.id]?.p || 0) > 0.04 || exclude.has(t.id);
  const cand = new Map(); // id → { t, score, why }
  const offer = (t, score, why) => {
    if (!t || busy(t)) return;
    const c = cand.get(t.id);
    if (!c || c.score < score) cand.set(t.id, { t, score, why });
  };
  recent.forEach(({ t, at }, i) => {
    // Più recente = più peso; un argomento finito conta più di uno solo iniziato.
    const fresh = Math.max(0.3, 1 - (now - at) / (21 * DAY)) * (1 - i * 0.08) * (e[t.id] ? 1 : 0.6);
    const list = topicsOf(t.subject);
    const k = list.indexOf(t);
    const after = list.slice(k + 1).find((x) => !busy(x));
    offer(after, 10 * fresh, `Dopo «${shortTitle(t)}»`);
    list.filter((x) => x.chapter === t.chapter && x !== t).forEach((x) => offer(x, 5 * fresh + jitter(x.id), `${subjectName(x.subject)} · ${x.chapter}`));
  });
  // Una materia che non hai ancora aperto: il suo primo argomento non letto.
  const seen = new Set(recent.map((r) => r.t.subject));
  for (const s of state.data.subjects) {
    if (seen.has(s.id)) continue;
    const first = topicsOf(s.id).find((x) => !busy(x));
    offer(first, recent.length ? 3 + jitter(s.id) : 6 + jitter(s.id), recent.length ? `Prova ${s.name}` : `Per iniziare · ${s.name}`);
  }
  // Al massimo due proposte per materia, così resta varietà.
  const per = {};
  return [...cand.values()].sort((a, b) => b.score - a.score)
    .filter((c) => (per[c.t.subject] = (per[c.t.subject] || 0) + 1) <= 2)
    .slice(0, max);
}
const jitter = (id) => (hashSeed(today() + id) % 1000) / 1000; // 0..1, cambia ogni giorno
const shortTitle = (t) => { const s = t.title.split(/[:(]/)[0].trim(); return s.length > 42 ? s.slice(0, 40).trim() + '…' : s; };

/* ── Home ── */
function renderHome() {
  $('#back').hidden = true;
  const e = explored();
  const date = new Date().toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' });
  // Continua a leggere: fino a 3 argomenti iniziati e non finiti, i più recenti prima.
  const pos = positions();
  const going = Object.entries(pos)
    .filter(([id, v]) => state.topics.has(id) && !e[id] && v.p > 0.04)
    .sort((a, b) => b[1].at - a[1].at).slice(0, 3);
  const shown = new Set(going.map(([id]) => id));
  const forYou = suggestions(shown);
  forYou.forEach((c) => shown.add(c.t.id));
  // Argomento del giorno: uno non ancora letto (e non già proposto), scelto in base alla data.
  const pool = state.data.topics.filter((t) => !e[t.id] && !shown.has(t.id));
  const list = pool.length ? pool : state.data.topics;
  const pick = list[hashSeed(today()) % list.length];
  const row = (t, kicker, p) => `<a class="pick" data-subject="${t.subject}" href="#/a/${t.id}">
      <span class="pick__dot">${ICONS[t.subject]}</span>
      <span style="flex:1;min-width:0"><span class="pick__kicker">${esc(kicker)}</span><p class="pick__title">${esc(t.title)}</p>
      ${p ? `<span class="pick__bar"><span style="width:${Math.round(p * 100)}%"></span></span>` : ''}</span></a>`;
  const anyRead = Object.keys(e).length || going.length;
  $('#view').innerHTML = `
    <section class="hello">
      <p class="hello__over">${esc(date)}</p>
      <h1 class="hello__title">Cosa vuoi <em>imparare</em> oggi?</h1>
    </section>
    <label class="search">
      <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
      <input id="q" type="search" placeholder="Cerca: gravità, memoria, buchi neri…" autocomplete="off" enterkeyhint="search" value="${esc(state.query)}">
    </label>
    <div id="results"></div>
    <div id="homeMain">
      ${going.length ? `<p class="label">Continua a leggere</p>${going.map(([id, v]) => row(state.topics.get(id), subjectName(state.topics.get(id).subject) + ' · ' + Math.round(v.p * 100) + '% letto', v.p)).join('')}` : ''}
      ${anyRead && forYou.length ? `<p class="label">Per te</p>${forYou.map((c) => row(c.t, c.why)).join('')}` : ''}
      <p class="label">Le materie</p>
      <div class="subjects">${state.data.subjects.map(subjectTile).join('')}</div>
      ${!anyRead && forYou.length ? `<p class="label">Da dove iniziare</p>${forYou.map((c) => row(c.t, c.why)).join('')}` : ''}
      <p class="label">Ti incuriosisce?</p>
      ${row(pick, subjectName(pick.subject) + ' · argomento del giorno')}
      <p class="note">Spiegazioni basate sui manuali universitari gratuiti OpenStax (Rice University), con video da canali divulgativi riconosciuti. Nuovi argomenti e materie si aggiungono quando lo chiedi.</p>
    </div>`;
  const q = $('#q');
  q.addEventListener('input', () => { state.query = q.value; renderResults(); });
  renderResults();
}

function subjectTile(s) {
  const all = topicsOf(s.id);
  const done = all.filter((t) => explored()[t.id]).length;
  return `<a class="subject" data-subject="${s.id}" href="#/m/${s.id}">
    ${ICONS[s.id].replace('<svg', '<svg class="subject__icon"')}
    <h2 class="subject__name">${esc(s.name)}</h2>
    <p class="subject__tag">${esc(s.tagline)}</p>
    <div class="subject__meta"><span>${all.length} argomenti</span>${done ? `<span class="bar"><span style="width:${(done / all.length) * 100}%"></span></span><span>${done} letti</span>` : ''}</div>
  </a>`;
}

const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
// Radice approssimata di una parola italiana: toglie la vocale finale (e la "h" di -chi/-ghi),
// così "buco" trova "buchi" e "stella" trova "stelle". Le parole corte restano intere.
const stem = (w) => (w.length >= 5 || /[cg]h?[aeiou]$/.test(w) ? w.replace(/h?[aeiou]$/, '') : w);
// Testo normalizzato con uno spazio davanti a ogni parola: si cerca solo a inizio parola.
const words0 = (s) => ' ' + norm(s).replace(/[^a-z0-9]+/g, ' ');
const SEARCH = new Map();
function searchIndex(t) {
  if (!SEARCH.has(t.id)) SEARCH.set(t.id, {
    title: words0(t.title),
    terms: words0((t.terms || []).map((x) => x.t).join(' ')),
    head: words0([t.hook, t.chapter, subjectName(t.subject), ...t.points].join(' ')),
    body: words0([...t.sections.flatMap((s) => [s.h, ...s.p]), t.example, ...(t.mistakes || []), ...(t.terms || []).map((x) => x.d)].join(' ')),
  });
  return SEARCH.get(t.id);
}
function renderResults() {
  const box = $('#results');
  const q = norm(state.query.trim());
  $('#homeMain').hidden = !!q;
  if (!q) { box.innerHTML = ''; return; }
  // Ogni parola si cerca anche "accorciata" (buchi → buc, nero/neri → ner), così
  // singolare e plurale si trovano a vicenda. Conta di più dove compare.
  const STOP = new Set(['il', 'lo', 'la', 'i', 'gli', 'le', 'un', 'una', 'di', 'del', 'della', 'dei', 'e', 'a', 'in', 'che', 'come', 'cos', 'per', 'con']);
  const ws = q.replace(/[^a-z0-9]+/g, ' ').split(' ').filter((w) => w && !STOP.has(w)).map((w) => ' ' + stem(w));
  if (!ws.length) { box.innerHTML = ''; return; }
  const scored = state.data.topics.map((t) => {
    const idx = searchIndex(t);
    let score = 0;
    for (const w of ws) {
      const s = (idx.title.includes(w) ? 6 : 0) + (idx.terms.includes(w) ? 4 : 0) + (idx.head.includes(w) ? 2 : 0) + (idx.body.includes(w) ? 1 : 0);
      if (!s) return null; // tutte le parole devono esserci
      score += s;
    }
    return { t, score };
  }).filter(Boolean).sort((a, b) => b.score - a.score);
  const raw = state.query.trim();
  box.innerHTML = `
    ${scored.length ? `<p class="label">In Lumen · ${scored.length}</p><div class="topics">${scored.map((x) => topicCard(x.t)).join('')}</div>`
      : `<p class="empty">Non c'è ancora un argomento su “${esc(raw)}”.<br>Chiedimelo e lo aggiungo, oppure cerca subito qui:</p>`}
    <p class="label">Cerca anche fuori</p>
    <div class="external">
      <a class="extlink" target="_blank" rel="noopener" href="https://www.youtube.com/results?search_query=${encodeURIComponent(raw + ' spiegazione')}">
        <svg viewBox="0 0 24 24"><rect x="2.5" y="5" width="19" height="14" rx="4"/><path d="m10 9 5 3-5 3z"/></svg>
        <span>Video su YouTube<small>Risultati per “${esc(raw)}”</small></span></a>
      <a class="extlink" target="_blank" rel="noopener" href="https://openstax.org/search?q=${encodeURIComponent(raw)}">
        <svg viewBox="0 0 24 24"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z"/><path d="M4 20.5A2.5 2.5 0 0 1 6.5 18H20v3H6.5"/></svg>
        <span>Manuali gratuiti OpenStax<small>Testi universitari, in inglese</small></span></a>
    </div>`;
}

/* ── Feed di una materia ── */
function topicCard(t, grouped) {
  const done = !!explored()[t.id];
  const p = progressOf(t.id);
  return `<a class="tcard${done ? ' is-done' : ''}" data-subject="${t.subject}" href="#/a/${t.id}">
    <div class="tcard__top"><i></i>${grouped ? `${minutes(t)} min di lettura` : esc(subjectName(t.subject) + (t.chapter ? ' · ' + t.chapter : ''))}</div>
    <div class="tcard__body">
      <h3 class="tcard__title">${esc(t.title)}</h3>
      <p class="tcard__hook">${esc(t.hook)}</p>
      <div class="tcard__foot">
        ${grouped ? '' : `<span class="pill">${minutes(t)} min</span>`}
        ${t.videos.length ? `<span class="pill">${PLAY} ${t.videos.length} video</span>` : ''}
        ${hasIt(t) ? '<span class="pill pill--it">Video in italiano</span>' : ''}
        ${done ? '<span class="pill pill--done">✓ Letto</span>' : p > 0.04 ? `<span class="pill pill--prog">In lettura · ${Math.round(p * 100)}%</span>` : ''}
        ${isSaved(t.id) ? '<span class="pill pill--saved">Salvato</span>' : ''}
      </div>
    </div>
    ${!done && p > 0.04 ? `<span class="tcard__line" style="width:${Math.round(p * 100)}%"></span>` : ''}
  </a>`;
}

function renderSubject(sid) {
  const s = state.subjects.get(sid);
  if (!s) return go('#/', true);
  $('#back').hidden = false;
  const all = topicsOf(sid);
  const e = explored();
  const done = all.filter((t) => e[t.id]).length;
  const chapters = (s.chapters || []).filter((c) => all.some((t) => t.chapter === c));
  const extra = [...new Set(all.map((t) => t.chapter).filter((c) => c && !chapters.includes(c)))];
  const chs = [...chapters, ...extra];
  const cur = chs.includes(state.chip[sid]) ? state.chip[sid] : '';
  const groups = (cur ? [cur] : chs).map((c) => ({ c, list: all.filter((t) => t.chapter === c) }));
  const loose = all.filter((t) => !t.chapter);
  if (!cur && loose.length) groups.push({ c: 'Altro', list: loose });
  $('#view').innerHTML = `
    <section class="shead" data-subject="${sid}">
      <h1 class="shead__name">${esc(s.name)}</h1>
      <p class="shead__tag">${esc(s.tagline)}</p>
      <div class="shead__stats"><span class="bar"><span style="width:${(done / all.length) * 100}%"></span></span>${done} letti su ${all.length} argomenti</div>
    </section>
    <nav class="chips" aria-label="Capitoli">
      <button class="chip" data-chip="" aria-pressed="${!cur}">Tutti<small>${all.length}</small></button>
      ${chs.map((c) => `<button class="chip" data-chip="${esc(c)}" aria-pressed="${cur === c}">${esc(c)}<small>${all.filter((t) => t.chapter === c).length}</small></button>`).join('')}
    </nav>
    ${groups.map((g) => `<section class="group">
      <div class="group__h"><h2>${esc(g.c)}</h2><span>${g.list.length} ${g.list.length === 1 ? 'argomento' : 'argomenti'}</span></div>
      <div class="topics">${g.list.map((t) => topicCard(t, true)).join('')}</div></section>`).join('')}
    <p class="note">Fonte principale: il manuale gratuito <a href="${esc(s.book.url)}" target="_blank" rel="noopener">${esc(s.book.title)}</a> di OpenStax (Rice University). Gli argomenti crescono a ogni aggiornamento.</p>`;
  $('#view').querySelectorAll('[data-chip]').forEach((b) => b.addEventListener('click', () => {
    state.chip[sid] = b.dataset.chip;
    const y = Math.min(scrollY, $('.chips').offsetTop - 61);
    renderSubject(sid);
    scrollTo(0, y);
  }));
}

function renderSaved() {
  $('#back').hidden = false;
  const items = savedIds().map((id) => state.topics.get(id)).filter(Boolean);
  $('#view').innerHTML = `
    <section class="shead"><h1 class="shead__name" style="color:var(--accent)">Salvati</h1>
    <p class="shead__tag">${items.length ? 'Gli argomenti che vuoi ritrovare.' : 'Ancora niente. Tocca il segnalibro in un argomento per ritrovarlo qui.'}</p></section>
    <div style="margin-top:14px">${items.map((t) => `<a class="srow" data-subject="${t.subject}" href="#/a/${t.id}"><span class="srow__dot"></span>
      <span><span class="srow__sub">${esc(subjectName(t.subject))} · ${minutes(t)} min</span><p class="srow__title">${esc(t.title)}</p></span></a>`).join('')}</div>`;
}

/* ── Pagina argomento ── */
let openId = null;
let resumeTimer;
const hasIt = (t) => t.videos.some((v) => v.lang === 'it');
function openTopic(id) {
  const t = state.topics.get(id);
  if (!t) return go('#/', true);
  openId = id;
  const d = $('#detail');
  d.dataset.subject = t.subject;
  $('#dBarTitle').textContent = t.title;
  syncSave(id);
  const siblings = topicsOf(t.subject);
  const e = explored();
  const idx = siblings.indexOf(t);
  const next = [...siblings.slice(idx + 1), ...siblings.slice(0, idx)].find((x) => !e[x.id]) || siblings[(idx + 1) % siblings.length];
  const src0 = t.sources[0].name.replace('OpenStax · ', '');
  $('#dBody').innerHTML = `
    <header class="hero">
      ${ICONS[t.subject].replace('<svg', '<svg class="hero__icon"')}
      <p class="hero__kicker">${esc(subjectName(t.subject))}${t.chapter ? ' · ' + esc(t.chapter) : ''}</p>
      <h1 class="hero__title" id="dTitle">${esc(t.title)}</h1>
      <p class="hero__hook">${esc(t.hook)}</p>
      <div class="hero__meta"><span class="pill">${minutes(t)} min di lettura</span>${t.videos.length ? `<span class="pill">${PLAY} ${t.videos.length} video${hasIt(t) ? ' · anche in italiano' : ''}</span>` : ''}<span class="pill">${t.sources.length} ${t.sources.length === 1 ? 'fonte' : 'fonti'}</span></div>
    </header>
    <div class="learn"><h3>Cosa imparerai</h3><ul>${t.points.map((p) => `<li>${esc(p)}</li>`).join('')}</ul></div>
    <nav class="toc"><h3>In questa pagina</h3><ol>${t.sections.map((s, i) => `<li><button data-goto="s${i}">${esc(s.h)}</button></li>`).join('')}</ol></nav>
    <div class="prose">${t.sections.map((s, i) => `<section id="s${i}"><h2><small>${i + 1} di ${t.sections.length}</small>${esc(s.h)}</h2>${s.p.map((p) => `<p>${esc(p)}</p>`).join('')}</section>`).join('')}</div>
    ${t.formulas?.length ? `<div class="box box--formula"><h3>Le formule, spiegate</h3>${t.formulas.map((f) => `<div class="formula"><code>${esc(f.f)}</code><span>${esc(f.d)}</span></div>`).join('')}</div>` : ''}
    <div class="box box--life"><h3>Nella vita di tutti i giorni</h3><p>${esc(t.example)}</p></div>
    ${t.mistakes?.length ? `<div class="box box--mist"><h3>Errori comuni</h3><ul>${t.mistakes.map((m) => `<li>${esc(m)}</li>`).join('')}</ul></div>` : ''}
    ${t.terms?.length ? `<div class="box"><h3>Parole chiave</h3><dl class="terms">${t.terms.map((x) => `<div><dt>${esc(x.t)}</dt><dd>${esc(x.d)}</dd></div>`).join('')}</dl></div>` : ''}
    ${t.quote ? `<blockquote class="quote"><p class="quote__text">“${esc(t.quote.text)}”</p>
      ${t.quote.translation ? `<p class="quote__tr">${esc(t.quote.translation)}</p>` : ''}
      <p class="quote__src">Dal manuale ${esc(src0)}</p></blockquote>` : ''}
    ${t.videos.length ? `<section class="section"><h3>Guarda</h3><div class="videos">${t.videos.map(videoCard).join('')}</div></section>` : ''}
    <section class="section"><h3>Approfondisci</h3><ul class="sources">
      ${t.sources.map((x) => `<li><a href="${esc(x.url)}" target="_blank" rel="noopener"><span><strong>${esc(x.title)}</strong><span>${esc(x.name)} · gratuito, in inglese</span></span></a></li>`).join('')}
      <li><a href="https://www.youtube.com/results?search_query=${encodeURIComponent(t.videoQuery)}" target="_blank" rel="noopener"><span><strong>Altri video su YouTube</strong><span>Ricerca: ${esc(t.videoQuery)}</span></span></a></li>
    </ul></section>
    <div class="finish" id="dFinish"><b>${e[id] ? 'Argomento già letto ✓' : 'Sei arrivato in fondo'}</b><span>${e[id] ? 'Puoi rileggerlo quando vuoi.' : 'Lo segno come letto.'}</span></div>
    ${next && next !== t ? `<a class="next" data-subject="${next.subject}" href="#/a/${next.id}" data-replace><small>Prossimo argomento · ${minutes(next)} min</small><strong>${esc(next.title)} →</strong></a>` : ''}
    <p class="fineprint">Spiegazione scritta in modo semplice a partire dalle fonti indicate; la citazione è copiata parola per parola dal manuale. In caso di dubbio fa fede l'originale.</p>`;
  d.hidden = false;
  d.classList.remove('closing');
  document.body.classList.add('locked');
  const sc = $('#dScroll');
  sc.style.scrollBehavior = 'auto';
  sc.scrollTop = 0;
  sc.style.scrollBehavior = '';
  // Riprendi da dove eri
  const saved = positions()[id]?.p || 0;
  const resume = $('#dResume');
  resume.hidden = !(saved > 0.06 && saved < 0.95 && !e[id]);
  resume.onclick = () => { sc.scrollTop = saved * (sc.scrollHeight - sc.clientHeight); resume.hidden = true; };
  clearTimeout(resumeTimer);
  resumeTimer = setTimeout(() => { resume.hidden = true; }, 7000);
  // Indice: tocca un capitolo per saltarci
  $('#dBody').querySelectorAll('[data-goto]').forEach((b) => b.addEventListener('click', () => {
    const el = document.getElementById(b.dataset.goto);
    sc.scrollTop = el.offsetTop - 70;
  }));
  const heads = [...$('#dBody').querySelectorAll('.prose section')];
  const tocBtns = [...$('#dBody').querySelectorAll('[data-goto]')];
  let busy = false;
  sc.onscroll = () => {
    if (busy) return;
    busy = true;
    setTimeout(() => {
      busy = false;
      if (openId !== id) return;
      const max = sc.scrollHeight - sc.clientHeight;
      const p = max > 0 ? sc.scrollTop / max : 1;
      $('#dProgress').style.width = (p * 100).toFixed(1) + '%';
      $('#dBar').classList.toggle('scrolled', sc.scrollTop > 120);
      heads.forEach((h, i) => tocBtns[i].classList.toggle('read', h.offsetTop < sc.scrollTop + sc.clientHeight * 0.5));
      if (!resume.hidden && sc.scrollTop > 200) resume.hidden = true;
      if (p > (positions()[id]?.p || 0) || p < 0.02) savePos(id, p);
      const fin = $('#dFinish');
      if (fin && fin.offsetTop < sc.scrollTop + sc.clientHeight - 60) markExplored(id);
    }, 60);
  };
  $('#dProgress').style.width = '0%';
  $('#dBar').classList.remove('scrolled');
  $('#dClose').focus({ preventScroll: true });
}
function videoCard(v) {
  return `<div class="video">
    <button class="video__frame" data-video="${esc(v.id)}" style="background-image:url(https://i.ytimg.com/vi/${esc(v.id)}/hqdefault.jpg)" aria-label="Guarda ${esc(v.title)}">
      <span class="video__play"><span>${PLAY}</span></span><span class="video__len">${esc(v.length)}</span></button>
    <div class="video__info"><p class="video__title">${esc(v.title)}</p><p class="video__ch">${v.lang === 'it' ? '<span class="lang">In italiano</span> ' : ''}${esc(v.channel)}${v.lang === 'it' ? '' : ' · in inglese'}</p></div></div>`;
}
function syncSave(id) {
  const b = $('#dSave');
  b.setAttribute('aria-pressed', String(isSaved(id)));
  b.onclick = () => b.setAttribute('aria-pressed', String(toggleSave(id)));
}
function closeTopic() {
  const d = $('#detail');
  if (d.hidden) return;
  openId = null;
  $('#dScroll').onscroll = null;
  d.classList.add('closing');
  setTimeout(() => { if (!openId) { d.hidden = true; $('#dBody').innerHTML = ''; } d.classList.remove('closing'); }, 260);
  document.body.classList.remove('locked');
}

/* ── Navigazione: l'indirizzo (#/…) decide sempre cosa si vede ── */
let lastBase = '';
function go(hash, replace) {
  const depth = (history.state?.d || 0) + (replace ? 0 : 1);
  if (replace) history.replaceState({ d: depth }, '', hash); else history.pushState({ d: depth }, '', hash);
  route();
}
function route() {
  const h = location.hash || '#/';
  let m;
  if ((m = h.match(/^#\/a\/(.+)$/))) {
    const t = state.topics.get(m[1]);
    if (!t) return go('#/', true);
    // Sotto la pagina dell'argomento resta la vista da cui si è arrivati (o la sua materia).
    if (!lastBase) { lastBase = '#/m/' + t.subject; renderSubject(t.subject); }
    openTopic(m[1]);
    return;
  }
  closeTopic();
  if (h === lastBase && $('#view').childElementCount) { refreshBase(); return; }
  lastBase = h;
  if ((m = h.match(/^#\/m\/(.+)$/))) renderSubject(m[1]);
  else if (h === '#/salvati') renderSaved();
  else renderHome();
  scrollTo(0, 0);
}
// Tornando indietro aggiorna "letto/in lettura/salvato" senza perdere la posizione.
function refreshBase() {
  const y = scrollY;
  const m = lastBase.match(/^#\/m\/(.+)$/);
  if (m) renderSubject(m[1]); else if (lastBase === '#/salvati') renderSaved(); else renderHome();
  scrollTo(0, y);
}

document.addEventListener('click', (ev) => {
  const v = ev.target.closest('[data-video]');
  if (v) {
    v.innerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/${v.dataset.video}?autoplay=1&rel=0" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen title="Video"></iframe>`;
    v.removeAttribute('data-video');
    return;
  }
  const a = ev.target.closest('a[href^="#/"]');
  if (a && !ev.metaKey && !ev.ctrlKey) {
    ev.preventDefault();
    const target = a.getAttribute('href');
    if (target === location.hash) return;
    // Da un argomento al successivo: sostituisci, così "indietro" torna all'elenco.
    go(target, a.hasAttribute('data-replace'));
  }
});
addEventListener('popstate', route);
// "Indietro" usa la cronologia solo se c'è una pagina precedente dentro Lumen.
function goBack(fallback) {
  if (history.state?.d > 0) history.back(); else go(fallback, true);
}
$('#dClose').onclick = () => goBack(lastBase || '#/');
$('#back').onclick = () => goBack('#/');
addEventListener('keydown', (e) => { if (e.key === 'Escape' && !$('#detail').hidden) $('#dClose').click(); });
$('#streakBtn').onclick = () => {
  const n = streak();
  const tot = Object.keys(explored()).length;
  toast(n ? `${n} ${n === 1 ? 'giorno' : 'giorni'} di fila · ${tot} argomenti letti` : 'Leggi un argomento fino in fondo per accendere la fiamma');
};
$('#themeBtn').onclick = () => {
  const dark = matchMedia('(prefers-color-scheme: dark)').matches;
  const cur = document.documentElement.dataset.theme || (dark ? 'dark' : 'light');
  const nextTheme = cur === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = nextTheme;
  store.set('theme', nextTheme);
};
// Dimensione del testo: normale → grande → piccola → normale
const SIZES = { 2: 'Testo normale', 3: 'Testo grande', 1: 'Testo piccolo' };
function applySize(n) { document.documentElement.dataset.size = n; }
applySize(store.get('size', 2));
$('#dSize').onclick = () => {
  const n = { 2: 3, 3: 1, 1: 2 }[store.get('size', 2)] || 2;
  store.set('size', n);
  applySize(n);
  toast(SIZES[n]);
};

/* ── Avvio ── */
async function load() {
  const res = await fetch('data/argomenti.json', { cache: 'no-cache' });
  state.data = await res.json();
  state.data.subjects.forEach((s) => state.subjects.set(s.id, s));
  state.data.topics.forEach((t) => state.topics.set(t.id, t));
}
async function checkFresh() {
  try {
    const m = await (await fetch('data/meta.json?t=' + Date.now(), { cache: 'no-store' })).json();
    if (m.updatedAt && m.updatedAt > state.data.updatedAt) {
      const b = $('#fresh');
      b.hidden = false;
      b.onclick = () => location.reload();
    }
  } catch {}
}
(async () => {
  try { await load(); } catch {
    $('#view').innerHTML = '<p class="empty">Non riesco a caricare i contenuti. Controlla la connessione e riprova.</p>';
    return;
  }
  renderStreak();
  route();
  checkFresh();
  document.addEventListener('visibilitychange', () => { if (!document.hidden) checkFresh(); });
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
})();
