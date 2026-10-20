// Lettura delle fonti della whitelist: feed RSS/Atom e "Accadde oggi" di Wikipedia.
import Parser from 'rss-parser';
import { normalizzaUrl } from './archivio.mjs';

export const USER_AGENT = 'Mozilla/5.0 (compatible; LumenBot/1.0; lettore personale di divulgazione)';

const parser = new Parser({
  timeout: 20000,
  headers: { 'User-Agent': USER_AGENT, Accept: 'application/rss+xml, application/xml, text/xml, */*' },
  customFields: {
    item: [
      ['media:content', 'mediaContent', { keepArray: true }],
      ['media:thumbnail', 'mediaThumbnail'],
    ],
  },
});

/** Il link appartiene a uno dei domini ammessi per questa fonte? */
export function dominioAmmesso(url, domini) {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return domini.some((d) => host === d || host.endsWith('.' + d));
  } catch {
    return false;
  }
}

function immagineDaItem(item) {
  const m = item.mediaContent?.find?.((x) => x?.$?.url && (!x.$.medium || x.$.medium === 'image'));
  if (m) return m.$.url;
  if (item.mediaThumbnail?.$?.url) return item.mediaThumbnail.$.url;
  if (item.enclosure?.url && /^image\//.test(item.enclosure.type || 'image/')) return item.enclosure.url;
  return null;
}

async function leggiRss(fonte) {
  const feed = await parser.parseURL(fonte.url);
  return feed.items
    .filter((it) => it.link)
    .map((it) => ({
      fonte,
      url: it.link.trim(),
      titolo: (it.title || '').trim(),
      data: it.isoDate || it.pubDate || null,
      estratto: (it.contentSnippet || it.summary || it.content || '').trim(),
      immagine: immagineDaItem(it),
    }));
}

async function leggiWikipediaOggi(fonte) {
  const oggi = new Date();
  const mm = String(oggi.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(oggi.getUTCDate()).padStart(2, '0');
  const lingua = fonte.lingua || 'it';
  const res = await fetch(`https://api.wikimedia.org/feed/v1/wikipedia/${lingua}/onthisday/all/${mm}/${dd}`, {
    headers: { 'User-Agent': USER_AGENT },
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) throw new Error(`Wikipedia HTTP ${res.status}`);
  const json = await res.json();
  const eventi = [...(json.selected || []), ...(json.events || [])];
  const visti = new Set();
  const out = [];
  for (const ev of eventi) {
    const pagina = ev.pages?.find((p) => p.extract && p.extract.length > 300 && p.type === 'standard');
    const url = pagina?.content_urls?.desktop?.page;
    if (!url || visti.has(url)) continue;
    visti.add(url);
    out.push({
      fonte,
      url,
      titolo: pagina.titles?.normalized || pagina.title,
      data: oggi.toISOString(),
      estratto: `Accadde il ${Number(dd)}/${Number(mm)}/${ev.year}: ${ev.text}\n\n${pagina.extract}`,
      immagine: pagina.originalimage?.source || pagina.thumbnail?.source || null,
      contesto: { anno: ev.year, evento: ev.text, titoloPagina: pagina.title },
    });
  }
  // Prima le voci più ricche di contenuto.
  return out.sort((a, b) => b.estratto.length - a.estratto.length);
}

/**
 * Restituisce i candidati nuovi di una fonte: link nei domini ammessi, non già visti, abbastanza recenti.
 */
export async function candidatiDaFonte(fonte, { conosciuti, etaMassimaGiorni }) {
  const grezzi = fonte.tipo === 'wikipedia-accadde-oggi' ? await leggiWikipediaOggi(fonte) : await leggiRss(fonte);
  const limite = Date.now() - etaMassimaGiorni * 86400000;
  return grezzi.filter((c) => {
    if (!dominioAmmesso(c.url, fonte.domini || [])) return false;
    if (fonte.soloSeUrlContiene && !fonte.soloSeUrlContiene.some((s) => c.url.includes(s))) return false;
    if (fonte.escludiSeUrlContiene?.some((s) => c.url.includes(s))) return false;
    let chiave;
    try { chiave = normalizzaUrl(c.url); } catch { return false; }
    if (conosciuti.has(chiave)) return false;
    const t = c.data ? new Date(c.data).getTime() : NaN;
    if (fonte.tipo === 'rss' && (isNaN(t) || t < limite || t > Date.now() + 86400000)) return false;
    return true;
  });
}
