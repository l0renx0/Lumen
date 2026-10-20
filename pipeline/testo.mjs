// Scarica la pagina originale ed estrae il testo dell'articolo (senza menu, pubblicità, ecc.).
import { JSDOM, VirtualConsole } from 'jsdom';
import { Readability } from '@mozilla/readability';
import { USER_AGENT } from './fonti.mjs';

const MAX_CARATTERI = 14000;

function meta(doc, nome) {
  const el = doc.querySelector(`meta[property="${nome}"], meta[name="${nome}"]`);
  return el?.getAttribute('content')?.trim() || null;
}

export async function estraiArticolo(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT, Accept: 'text/html,application/xhtml+xml' },
    redirect: 'follow',
    signal: AbortSignal.timeout(25000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const html = await res.text();
  // La console virtuale silenzia gli errori CSS/JS delle pagine, che qui non servono.
  const dom = new JSDOM(html, { url: res.url, virtualConsole: new VirtualConsole() });
  const doc = dom.window.document;
  const info = {
    urlFinale: res.url,
    immagine: meta(doc, 'og:image') || meta(doc, 'twitter:image'),
    data: meta(doc, 'article:published_time'),
    titolo: meta(doc, 'og:title') || doc.title,
  };
  const articolo = new Readability(doc).parse();
  const testo = (articolo?.textContent || '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n+/g, '\n\n')
    .trim();
  dom.window.close();
  return { ...info, testo: testo.slice(0, MAX_CARATTERI) };
}

/** Normalizzazione usata per controllare che le citazioni siano davvero nel testo. */
export function normalizzaPerConfronto(t) {
  return t
    .normalize('NFKC')
    .replace(/[‘’‛′`]/g, "'")
    .replace(/[“”„″«»]/g, '"')
    .replace(/[–—]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}
