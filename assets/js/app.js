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

const state = { data: null, subjects: new Map(), topics: new Map(), query: '' };

/* ── Progressi: argomenti esplorati, salvati, giorni di fila ── */
const explored = () => store.get('explored', {}); // { idArgomento: 'AAAA-MM-GG' }
function markExplored(id) {
  const e = explored();
  if (e[id]) return;
  e[id] = today();
  store.set('explored', e);
  renderStreak();
  toast('Argomento esplorato ✓');
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
  const n = streak();
  const doneToday = Object.values(explored()).includes(today());
  $('#streakNum').textContent = n;
  $('#streakBtn').classList.toggle('on', doneToday);
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
  toastTimer = setTimeout(() => t.classList.remove('show'), 1800);
}
const topicsOf = (sid) => state.data.topics.filter((t) => t.subject === sid);
const minutes = (t) => Math.max(2, Math.round([t.hook, ...t.body, t.example].join(' ').split(/\s+/).length / 190));
function hashSeed(str) { let h = 2166136261; for (const c of str) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; }

/* ── Viste ── */
function setTop({ back }) {
  $('#back').hidden = !back;
}

function renderHome() {
  setTop({ back: false });
  const e = explored();
  const date = new Date().toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' });
  // Argomento del giorno: uno non ancora esplorato, scelto in base alla data.
  const pool = state.data.topics.filter((t) => !e[t.id]);
  const list = pool.length ? pool : state.data.topics;
  const pick = list[hashSeed(today()) % list.length];
  $('#view').innerHTML = `
    <section class="hello">
      <p class="hello__over">${esc(date)}</p>
      <h1 class="hello__title">Cosa vuoi <em>imparare</em> oggi?</h1>
    </section>
    <label class="search">
      <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
      <input id="q" type="search" placeholder="Cerca un argomento, es. gravità, memoria…" autocomplete="off" value="${esc(state.query)}">
    </label>
    <div id="results"></div>
    <div id="homeMain">
      <p class="label">Le materie</p>
      <div class="subjects">${state.data.subjects.map(subjectTile).join('')}</div>
      <p class="label">Ti incuriosisce?</p>
      <a class="pick" data-subject="${pick.subject}" href="#/a/${pick.id}">
        <span class="pick__dot">${ICONS[pick.subject]}</span>
        <span><span class="pick__kicker">${esc(state.subjects.get(pick.subject).name)} · argomento del giorno</span><p class="pick__title">${esc(pick.title)}</p></span>
      </a>
      <p class="note">Spiegazioni semplici basate su manuali universitari gratuiti (OpenStax, Rice University), con video da canali divulgativi riconosciuti. Nuove materie e argomenti si aggiungono quando lo chiedi.</p>
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
    <div class="subject__meta"><span>${all.length} argomenti</span>${done ? `<span class="bar"><span style="width:${(done / all.length) * 100}%"></span></span><span>${done} esplorati</span>` : ''}</div>
  </a>`;
}

const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
function renderResults() {
  const box = $('#results');
  const q = norm(state.query.trim());
  $('#homeMain').hidden = !!q;
  if (!q) { box.innerHTML = ''; return; }
  const words = q.split(/\s+/);
  const hits = state.data.topics.filter((t) => {
    const hay = norm([t.title, t.hook, ...t.body, ...t.points, state.subjects.get(t.subject).name].join(' '));
    return words.every((w) => hay.includes(w));
  });
  const raw = state.query.trim();
  box.innerHTML = `
    ${hits.length ? `<p class="label">In Lumen</p><div class="topics">${hits.map(topicCard).join('')}</div>`
      : `<p class="empty">Non c'è ancora un argomento su “${esc(raw)}” in Lumen.<br>Chiedimelo e lo aggiungo, oppure cerca subito qui:</p>`}
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

function topicCard(t, i) {
  const e = explored();
  const nv = t.videos.length;
  return `<a class="tcard" data-subject="${t.subject}" href="#/a/${t.id}">
    <div class="tcard__band">${ICONS[t.subject]}<span class="tcard__num">${esc(state.subjects.get(t.subject).name)}</span></div>
    <div class="tcard__body">
      <h2 class="tcard__title">${esc(t.title)}</h2>
      <p class="tcard__hook">${esc(t.hook)}</p>
      <div class="tcard__foot">
        <span class="pill">${minutes(t)} min</span>
        ${nv ? `<span class="pill">${PLAY} ${nv} video</span>` : ''}
        ${e[t.id] ? '<span class="pill pill--done">✓ Esplorato</span>' : ''}
        ${isSaved(t.id) ? '<span class="pill pill--saved">Salvato</span>' : ''}
        <span class="tcard__go">Approfondisci →</span>
      </div>
    </div>
  </a>`;
}

function renderSubject(sid) {
  const s = state.subjects.get(sid);
  if (!s) return go('#/');
  setTop({ back: true });
  const all = topicsOf(sid);
  const e = explored();
  // Prima gli argomenti non ancora esplorati, poi gli altri.
  const list = [...all.filter((t) => !e[t.id]), ...all.filter((t) => e[t.id])];
  const done = all.length - all.filter((t) => !e[t.id]).length;
  $('#view').innerHTML = `
    <section class="shead" data-subject="${sid}">
      <h1 class="shead__name">${esc(s.name)}</h1>
      <p class="shead__tag">${esc(s.tagline)}</p>
      <div class="shead__progress"><span class="bar"><span style="width:${(done / all.length) * 100}%"></span></span>${done} su ${all.length} esplorati</div>
    </section>
    <div class="topics" id="feed">${list.map(topicCard).join('')}</div>
    <p class="note">Fonte principale: il manuale gratuito <a href="${esc(s.book.url)}" target="_blank" rel="noopener"><u>${esc(s.book.title)}</u></a> di OpenStax (Rice University).</p>`;
  watchFeed();
}

function renderSaved() {
  setTop({ back: true });
  const items = savedIds().map((id) => state.topics.get(id)).filter(Boolean);
  $('#view').innerHTML = `
    <section class="shead"><h1 class="shead__name" style="background:var(--accent);-webkit-background-clip:text;background-clip:text">Salvati</h1>
    <p class="shead__tag">${items.length ? 'Gli argomenti che vuoi ritrovare.' : 'Ancora niente. Tocca il segnalibro in un argomento per ritrovarlo qui.'}</p></section>
    <div>${items.map((t) => `<a class="srow" data-subject="${t.subject}" href="#/a/${t.id}"><span class="srow__dot"></span>
      <span><span class="srow__sub">${esc(state.subjects.get(t.subject).name)}</span><p class="srow__title">${esc(t.title)}</p></span></a>`).join('')}</div>`;
}

/* Sfocatura leggera delle schede lontane dal centro dello schermo */
let feedRaf;
function watchFeed() {
  const update = () => {
    feedRaf = 0;
    const mid = innerHeight * 0.48;
    document.querySelectorAll('#feed .tcard').forEach((c) => {
      const r = c.getBoundingClientRect();
      const d = Math.min(1, Math.max(0, (Math.abs(r.top + r.height / 2 - mid) - r.height * 0.6) / innerHeight));
      c.style.setProperty('--d', d.toFixed(3));
    });
  };
  update();
  onscroll = () => { if (!feedRaf) feedRaf = requestAnimationFrame(update); };
}

/* ── Pagina argomento ── */
function openTopic(id) {
  const t = state.topics.get(id);
  if (!t) return go('#/');
  const s = state.subjects.get(t.subject);
  const d = $('#detail');
  d.dataset.subject = t.subject;
  $('#dKicker').textContent = `${s.name} · ${minutes(t)} min di lettura`;
  $('#dTitle').textContent = t.title;
  syncSave(id);
  const siblings = topicsOf(t.subject);
  const e = explored();
  const idx = siblings.indexOf(t);
  const next = [...siblings.slice(idx + 1), ...siblings.slice(0, idx)].find((x) => !e[x.id]) || siblings[(idx + 1) % siblings.length];
  $('#dBody').innerHTML = `
    <p class="lead">${esc(t.hook)}</p>
    <div class="prose">${t.body.map((p) => `<p>${esc(p)}</p>`).join('')}</div>
    <div class="box"><h3>In breve</h3><ul>${t.points.map((p) => `<li>${esc(p)}</li>`).join('')}</ul></div>
    <div class="box box--life"><h3>Nella vita di tutti i giorni</h3><p>${esc(t.example)}</p></div>
    ${t.quote ? `<blockquote class="quote"><p class="quote__text">“${esc(t.quote.text)}”</p>
      ${t.quote.translation ? `<p class="quote__tr">${esc(t.quote.translation)}</p>` : ''}
      <p class="quote__src">Dal manuale ${esc(t.sources[0].name.replace('OpenStax · ', ''))}</p></blockquote>` : ''}
    ${t.videos.length ? `<section class="section"><h3>Guarda</h3><div class="videos">${t.videos.map(videoCard).join('')}</div></section>` : ''}
    <section class="section"><h3>Approfondisci</h3><ul class="sources">
      ${t.sources.map((x) => `<li><a href="${esc(x.url)}" target="_blank" rel="noopener"><strong>${esc(x.title)}</strong><span>${esc(x.name)} · gratuito, in inglese</span></a></li>`).join('')}
      <li><a href="https://www.youtube.com/results?search_query=${encodeURIComponent(t.videoQuery)}" target="_blank" rel="noopener"><strong>Altri video su YouTube</strong><span>Ricerca: ${esc(t.videoQuery)}</span></a></li>
    </ul></section>
    ${next && next !== t ? `<a class="next" data-subject="${next.subject}" href="#/a/${next.id}" data-replace><small>Prossimo argomento</small><strong>${esc(next.title)} →</strong></a>` : ''}
    <p class="fineprint">Spiegazione semplificata a partire dalle fonti indicate; la citazione è copiata parola per parola dal manuale. In caso di dubbio fa fede l'originale.</p>`;
  d.hidden = false;
  d.classList.remove('closing');
  document.body.classList.add('locked');
  const sc = $('#dScroll');
  sc.scrollTop = 0;
  sc.onscroll = () => { if (sc.scrollTop + sc.clientHeight > sc.scrollHeight * 0.75) markExplored(id); };
  $('#dClose').focus({ preventScroll: true });
}
function videoCard(v) {
  return `<div class="video">
    <button class="video__frame" data-video="${esc(v.id)}" style="background-image:url(https://i.ytimg.com/vi/${esc(v.id)}/hqdefault.jpg)" aria-label="Guarda ${esc(v.title)}">
      <span class="video__play"><span>${PLAY}</span></span><span class="video__len">${esc(v.length)}</span></button>
    <div class="video__info"><p class="video__title">${esc(v.title)}</p><p class="video__ch">${esc(v.channel)}</p></div></div>`;
}
function syncSave(id) {
  const b = $('#dSave');
  b.setAttribute('aria-pressed', String(isSaved(id)));
  b.onclick = () => b.setAttribute('aria-pressed', String(toggleSave(id)));
}
function closeTopic() {
  const d = $('#detail');
  if (d.hidden) return;
  d.classList.add('closing');
  setTimeout(() => { d.hidden = true; d.classList.remove('closing'); $('#dBody').innerHTML = ''; }, 280);
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
  onscroll = null;
  if ((m = h.match(/^#\/m\/(.+)$/))) renderSubject(m[1]);
  else if (h === '#/salvati') renderSaved();
  else renderHome();
  scrollTo(0, 0);
}
// Tornando indietro aggiorna i segni "esplorato/salvato" senza perdere la posizione.
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
    const id = (location.hash.match(/^#\/a\/(.+)$/) || [])[1];
    if (id) markExplored(id);
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
  toast(n ? `${n} ${n === 1 ? 'giorno' : 'giorni'} di fila · ${tot} argomenti esplorati` : 'Esplora un argomento per accendere la fiamma');
};
$('#themeBtn').onclick = () => {
  const dark = matchMedia('(prefers-color-scheme: dark)').matches;
  const cur = document.documentElement.dataset.theme || (dark ? 'dark' : 'light');
  const nextTheme = cur === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = nextTheme;
  store.set('theme', nextTheme);
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
