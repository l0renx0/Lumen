// Aggiornamento quotidiano di Lumen.
//
//   npm run aggiorna          → legge le fonti, scrive e verifica le schede con Claude, salva in data/
//   npm run prova             → mostra solo quali articoli verrebbero elaborati (non usa l'AI, non salva)
//   node pipeline/aggiorna.mjs --limite 3   → elabora al massimo 3 articoli
import { caricaArchivio, caricaFonti, salvaArchivio, idDaUrl, normalizzaUrl } from './archivio.mjs';
import { candidatiDaFonte } from './fonti.mjs';
import { estraiArticolo, normalizzaPerConfronto } from './testo.mjs';
import { scriviScheda, verificaScheda } from './ai.mjs';

const args = process.argv.slice(2);
const PROVA = args.includes('--prova');
const limiteArg = args.indexOf('--limite');

const config = await caricaFonti();
if (!config) throw new Error('File config/fonti.json mancante o non valido.');
const imp = config.impostazioni;
const limite = limiteArg >= 0 ? Number(args[limiteArg + 1]) : imp.nuoveSchedePerGiorno;

if (!PROVA && !process.env.ANTHROPIC_API_KEY) {
  console.error('Manca la chiave ANTHROPIC_API_KEY. Inseriscila nei "Secrets" del repository GitHub (vedi README).');
  process.exit(1);
}

const archivio = await caricaArchivio();
const { dati, scartate, conosciuti } = archivio;

/* 1. Raccolta dei candidati dalla whitelist ------------------------------------------------ */
console.log('Leggo le fonti…');
const perFonte = [];
for (const fonte of config.fonti.filter((f) => f.attiva !== false)) {
  try {
    const lista = await candidatiDaFonte(fonte, { conosciuti, etaMassimaGiorni: imp.etaMassimaGiorni });
    lista.sort((a, b) => new Date(b.data || 0) - new Date(a.data || 0));
    perFonte.push(lista.slice(0, fonte.massimoPerFonte ?? imp.massimoPerFonte));
    console.log(`  ✓ ${fonte.id}: ${lista.length} nuovi`);
  } catch (err) {
    console.warn(`  ✗ ${fonte.id}: ${err.message}`);
  }
}

// Alterna le fonti (una per giro) così il feed resta vario.
const coda = [];
for (let giro = 0; coda.length < limite && perFonte.some((l) => l[giro]); giro++) {
  for (const lista of perFonte) if (lista[giro] && coda.length < limite) coda.push(lista[giro]);
}
console.log(`\nDa elaborare: ${coda.length}`);

if (PROVA) {
  for (const c of coda) console.log(`  • [${c.fonte.id}] ${c.titolo}\n    ${c.url}`);
  process.exit(0);
}

/* 2-3. Scrittura e verifica con Claude ------------------------------------------------------ */
const ora = new Date().toISOString();
let aggiunte = 0;

function scarta(candidato, motivo) {
  scartate.push({ url: normalizzaUrl(candidato.url), motivo, data: ora });
  console.log(`    → scartata: ${motivo}`);
}

for (const candidato of coda) {
  console.log(`\n• [${candidato.fonte.id}] ${candidato.titolo}`);
  let articolo;
  try {
    articolo = await estraiArticolo(candidato.url);
  } catch (err) {
    articolo = { testo: '', immagine: null, data: null, titolo: candidato.titolo };
    console.log(`    pagina non leggibile (${err.message}), uso il testo del feed`);
  }
  if (articolo.testo.length < 600 && candidato.estratto.length > articolo.testo.length) articolo.testo = candidato.estratto;
  if (articolo.testo.length < 300) { scarta(candidato, 'testo della fonte troppo breve'); continue; }

  try {
    const scheda = await scriviScheda({ modello: imp.modello, candidato, articolo });
    if (!scheda.pertinente) { scarta(candidato, scheda.motivo_scarto || 'non pertinente'); continue; }

    // Controllo automatico: ogni citazione deve comparire alla lettera nel testo originale.
    const originale = normalizzaPerConfronto(articolo.testo);
    const citazioni = scheda.citazioni.filter((q) => {
      const ok = q.testo.length > 10 && originale.includes(normalizzaPerConfronto(q.testo).replace(/[.,;:]$/, ''));
      if (!ok) console.log(`    citazione rimossa (non trovata alla lettera): "${q.testo.slice(0, 60)}…"`);
      return ok;
    });

    const verifica = await verificaScheda({ modello: imp.modello, candidato, articolo, scheda });
    if (verifica.esito === 'scartata') { scarta(candidato, 'verifica: ' + verifica.problemi.join('; ')); continue; }
    if (verifica.esito === 'corretta') console.log(`    corretta in verifica: ${verifica.problemi.join('; ')}`);
    const finale = verifica.esito === 'corretta' ? { ...scheda, ...verifica } : scheda;

    const sezione = candidato.fonte.sezione && candidato.fonte.sezione !== 'auto' ? candidato.fonte.sezione : finale.sezione;
    const dataFonte = candidato.data || articolo.data;
    dati.cards.push({
      id: idDaUrl(candidato.url),
      section: sezione,
      topic: finale.argomento,
      solidity: finale.solidita,
      title: finale.titolo.trim(),
      summary: finale.riassunto.trim(),
      body: finale.corpo.map((p) => p.trim()).filter(Boolean),
      quotes: citazioni.map((q) => ({ text: q.testo, translation: q.traduzione || null, author: q.autore || null })),
      sources: [{ name: candidato.fonte.nome, title: candidato.titolo || articolo.titolo, url: candidato.url }],
      date: dataFonte && !isNaN(new Date(dataFonte)) ? new Date(dataFonte).toISOString() : ora,
      addedAt: ora,
      when: sezione === 'sapevi' ? finale.quando || null : null,
      image: candidato.immagine || articolo.immagine || null,
      imageCredit: candidato.immagine || articolo.immagine ? candidato.fonte.nome : null,
      solidityNote: finale.nota_solidita || null,
      verification: verifica.esito,
      url: normalizzaUrl(candidato.url),
    });
    conosciuti.add(normalizzaUrl(candidato.url));
    aggiunte++;
    console.log(`    ✓ aggiunta (${sezione}, ${finale.argomento}, ${finale.solidita}, verifica: ${verifica.esito})`);
  } catch (err) {
    // Errori temporanei (rete, limiti dell'API): non segno l'articolo come scartato, riproverò domani.
    console.warn(`    ✗ errore: ${err.message}`);
  }
}

/* 4. Salvataggio ---------------------------------------------------------------------------- */
if (aggiunte > 0 || scartate.length) {
  await salvaArchivio(archivio, { massimo: imp.schedeMassimeConservate, nuove: aggiunte });
}
console.log(`\nFatto: ${aggiunte} nuove schede.`);
