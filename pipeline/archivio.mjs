// Lettura e scrittura dei file JSON in data/, con identificativi stabili per evitare duplicati.
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';

export const PERCORSI = {
  schede: new URL('../data/cards.json', import.meta.url),
  meta: new URL('../data/meta.json', import.meta.url),
  scartate: new URL('../data/scartate.json', import.meta.url),
  fonti: new URL('../config/fonti.json', import.meta.url),
};

/** Normalizza un URL così che la stessa pagina abbia sempre lo stesso indirizzo. */
export function normalizzaUrl(u) {
  const x = new URL(u.trim());
  const params = [...x.searchParams].filter(([k]) => !k.toLowerCase().startsWith('utm_'));
  const query = new URLSearchParams(params).toString();
  const path = x.pathname.replace(/\/+$/, '') || '/';
  return `https://${x.hostname.toLowerCase().replace(/^www\./, '')}${path}${query ? '?' + query : ''}`;
}

export function idDaUrl(u) {
  return createHash('sha1').update(normalizzaUrl(u)).digest('hex').slice(0, 12);
}

async function leggiJson(percorso, predefinito) {
  try {
    return JSON.parse(await readFile(percorso, 'utf8'));
  } catch (err) {
    if (err.code === 'ENOENT') return predefinito;
    throw err;
  }
}

export async function caricaArchivio() {
  const dati = await leggiJson(PERCORSI.schede, { version: 1, updatedAt: null, cards: [] });
  const scartate = await leggiJson(PERCORSI.scartate, []);
  const conosciuti = new Set();
  for (const c of dati.cards) {
    conosciuti.add(c.url || normalizzaUrl(c.sources[0].url));
    c.sources.forEach((s) => conosciuti.add(normalizzaUrl(s.url)));
  }
  scartate.forEach((s) => conosciuti.add(s.url));
  return { dati, scartate, conosciuti };
}

export async function caricaFonti() {
  return leggiJson(PERCORSI.fonti, null);
}

export async function salvaArchivio({ dati, scartate }, { massimo, nuove }) {
  const ordinate = [...dati.cards].sort((a, b) => new Date(b.addedAt) - new Date(a.addedAt));
  const tenute = ordinate.slice(0, massimo).sort((a, b) => new Date(b.date) - new Date(a.date));
  // La data cambia solo se ci sono schede nuove: è ciò che fa comparire il banner nell'app.
  const ora = nuove > 0 || !dati.updatedAt ? new Date().toISOString() : dati.updatedAt;
  const out = { version: 1, updatedAt: ora, cards: tenute };
  await writeFile(PERCORSI.schede, JSON.stringify(out, null, 1) + '\n');
  await writeFile(PERCORSI.meta, JSON.stringify({ updatedAt: ora, count: tenute.length }) + '\n');
  await writeFile(PERCORSI.scartate, JSON.stringify(scartate.slice(-3000), null, 1) + '\n');
}
