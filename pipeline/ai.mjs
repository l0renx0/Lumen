// Le due chiamate a Claude: (1) scrivere la scheda, (2) verificarla contro la fonte.
import Anthropic from '@anthropic-ai/sdk';

const ARGOMENTI = ['Scienza', 'Spazio', 'Salute', 'Storia', 'Tecnologia', 'Natura', 'Società'];
const SOLIDITA = ['consolidato', 'ufficiale', 'recente', 'preliminare'];

const client = new Anthropic(); // legge ANTHROPIC_API_KEY dall'ambiente

/* ------------------------------------------------------------------ schemi JSON */

const SCHEMA_SCHEDA = {
  type: 'object',
  additionalProperties: false,
  required: ['pertinente', 'motivo_scarto', 'sezione', 'argomento', 'solidita', 'nota_solidita', 'titolo', 'riassunto', 'corpo', 'citazioni', 'quando'],
  properties: {
    pertinente: { type: 'boolean' },
    motivo_scarto: { type: 'string' },
    sezione: { type: 'string', enum: ['novita', 'sapevi'] },
    argomento: { type: 'string', enum: ARGOMENTI },
    solidita: { type: 'string', enum: SOLIDITA },
    nota_solidita: { type: 'string' },
    titolo: { type: 'string' },
    riassunto: { type: 'string' },
    corpo: { type: 'array', items: { type: 'string' } },
    citazioni: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['testo', 'traduzione', 'autore'],
        properties: { testo: { type: 'string' }, traduzione: { type: 'string' }, autore: { type: 'string' } },
      },
    },
    quando: { type: 'string' },
  },
};

const SCHEMA_VERIFICA = {
  type: 'object',
  additionalProperties: false,
  required: ['esito', 'problemi', 'titolo', 'riassunto', 'corpo', 'solidita', 'nota_solidita'],
  properties: {
    esito: { type: 'string', enum: ['approvata', 'corretta', 'scartata'] },
    problemi: { type: 'array', items: { type: 'string' } },
    titolo: { type: 'string' },
    riassunto: { type: 'string' },
    corpo: { type: 'array', items: { type: 'string' } },
    solidita: { type: 'string', enum: SOLIDITA },
    nota_solidita: { type: 'string' },
  },
};

/* ------------------------------------------------------------------ istruzioni */

const ISTRUZIONI_SCRITTURA = `Sei la redazione di Lumen, un'app personale in italiano che ogni giorno fa imparare qualcosa di vero a un lettore curioso ma non specialista. Ricevi il testo di una pagina pubblicata da una fonte affidabile (agenzia spaziale, rivista scientifica, ente statistico o sanitario, università, enciclopedia) e la trasformi in una scheda.

Regole sull'accuratezza (le più importanti):
- Usa SOLO le informazioni presenti nel testo fornito. Non aggiungere fatti, numeri, nomi o contesto presi dalla tua memoria, nemmeno se ti sembrano veri.
- Non esagerare mai. Niente clickbait, niente superlativi che la fonte non usa, niente "rivoluzionario", "svolta epocale", "gli scienziati sono sconvolti". Se la fonte dice "potrebbe", "suggerisce", "secondo un modello", tu devi dire lo stesso.
- Distingui con cura tra ciò che è stato osservato, ciò che è un'ipotesi e ciò che è un modello o una simulazione.
- Riporta i numeri esattamente come nella fonte (convertendo le unità solo se utile, e correttamente).

Il titolo (massimo 90 caratteri) e il riassunto (massimo 220 caratteri) devono incuriosire e invogliare a leggere, ma dire esattamente ciò che dice la fonte. Scrivi in un italiano chiaro, elegante e concreto.

Il corpo è una spiegazione completa in 3-6 paragrafi brevi: cosa è successo o cosa sappiamo, come lo si è scoperto o misurato, perché conta, quali sono i limiti o le cautele indicate dalla fonte. Spiega i termini tecnici con parole semplici.

Citazioni: al massimo 2, ciascuna di massimo 35 parole, copiate CARATTERE PER CARATTERE dal testo originale (nella lingua originale), senza modifiche, tagli interni o parafrasi. Se il testo non è in italiano, aggiungi la traduzione italiana; se è già in italiano lascia "traduzione" vuota. "autore" è chi parla (nome e ruolo come indicati nel testo) oppure stringa vuota. Se non ci sono frasi adatte, lascia la lista vuota.

Sezione:
- "novita" per notizie: nuove scoperte, studi, dati appena pubblicati, eventi recenti.
- "sapevi" per conoscenze consolidate e senza data di scadenza: spiegazioni di fenomeni noti, fatti storici, curiosità scientifiche solide. In questo caso "quando" indica in poche parole il periodo o la data storica (es. "1952", "III secolo a.C.", "20 ottobre 1973") oppure il tipo di conoscenza (es. "Fenomeno oceanografico"); per le novità lascia "quando" vuoto.

Solidità dell'informazione:
- "consolidato": conoscenza accettata da tempo e verificata da molte fonti, oppure fatto storico documentato.
- "ufficiale": dato, misura, evento o annuncio diffuso da un ente ufficiale (es. un lancio avvenuto, statistiche ISTAT, dati di sorveglianza sanitaria).
- "recente": risultato scientifico nuovo, pubblicato ma non ancora replicato in modo indipendente.
- "preliminare": ipotesi teorica, modello non confermato da osservazioni, studio non ancora sottoposto a revisione (preprint), o risultato che gli stessi autori definiscono da confermare.
In "nota_solidita" spiega in una frase perché hai scelto quel livello.

Imposta "pertinente" a false (e spiega in "motivo_scarto") se la pagina non insegna nulla di concreto: bandi, concorsi, nomine, eventi promozionali, accordi diplomatici senza contenuto informativo, raccolte di immagini senza spiegazione, opinioni, testi troppo brevi o confusi per scrivere una scheda accurata. Se pertinente è false, compila gli altri campi con valori qualsiasi validi.`;

const ISTRUZIONI_VERIFICA = `Sei il revisore di Lumen: il tuo unico compito è proteggere il lettore dalla disinformazione. Ricevi il testo originale di una fonte e una scheda in italiano scritta a partire da esso.

Controlla, frase per frase:
1. Ogni affermazione della scheda è sostenuta dal testo originale? Segnala qualunque fatto, numero, nome o dettaglio che non compare nella fonte.
2. Titolo e riassunto esagerano? Sono sensazionalistici o clickbait? Presentano un'ipotesi come certezza, un modello come osservazione, una correlazione come causa, un singolo studio come verità definitiva?
3. Le cautele e i limiti espressi dalla fonte sono stati mantenuti?
4. Il livello di solidità è coerente con la natura dell'informazione (consolidato / ufficiale / recente / preliminare)?

Esito:
- "approvata" se la scheda è fedele: ripeti titolo, riassunto, corpo, solidità e nota invariati.
- "corretta" se ci sono problemi risolvibili: riscrivi titolo, riassunto e corpo eliminando o correggendo le parti non supportate o esagerate (titolo max 90 caratteri, riassunto max 220, stesso stile chiaro e invitante ma sobrio), e correggi la solidità se serve.
- "scartata" se la fonte è troppo vaga, contraddittoria o non adatta a una scheda affidabile, o se la scheda andrebbe riscritta da capo.
Elenca in "problemi" ciò che hai trovato (lista vuota se nessuno).`;

/* ------------------------------------------------------------------ chiamata */

let fallbackDisponibile = true;

async function chiedi({ modello, sistema, utente, schema }) {
  const richiesta = {
    model: modello,
    max_tokens: 16000,
    thinking: { type: 'adaptive' },
    output_config: { effort: 'medium', format: { type: 'json_schema', schema } },
    system: sistema,
    messages: [{ role: 'user', content: utente }],
  };

  let risposta;
  if (fallbackDisponibile) {
    try {
      // Se un filtro di sicurezza rifiuta per errore la richiesta, l'API riprova con un modello alternativo.
      risposta = await client.beta.messages.create({
        ...richiesta,
        betas: ['server-side-fallback-2026-07-01'],
        fallbacks: 'default',
      });
    } catch (err) {
      if (!(err instanceof Anthropic.BadRequestError)) throw err;
      fallbackDisponibile = false;
      console.warn('  (fallback non disponibile per questo account: proseguo senza)');
    }
  }
  if (!risposta) risposta = await client.messages.create(richiesta);

  if (risposta.stop_reason === 'refusal') throw new Error('richiesta rifiutata dal modello');
  if (risposta.stop_reason === 'max_tokens') throw new Error('risposta troppo lunga, interrotta');
  const testo = risposta.content.filter((b) => b.type === 'text').map((b) => b.text).join('');
  return JSON.parse(testo);
}

function descriviFonte(candidato, articolo) {
  return [
    `FONTE: ${candidato.fonte.nome}`,
    `URL: ${candidato.url}`,
    `TITOLO ORIGINALE: ${candidato.titolo || articolo.titolo || ''}`,
    `DATA DI PUBBLICAZIONE: ${candidato.data || articolo.data || 'sconosciuta'}`,
    candidato.fonte.sezione && candidato.fonte.sezione !== 'auto' ? `SEZIONE PREVISTA: ${candidato.fonte.sezione}` : '',
    '',
    'TESTO ORIGINALE:',
    '"""',
    articolo.testo,
    '"""',
  ].filter((r) => r !== '').join('\n');
}

export async function scriviScheda({ modello, candidato, articolo }) {
  return chiedi({
    modello,
    sistema: ISTRUZIONI_SCRITTURA,
    utente: `${descriviFonte(candidato, articolo)}\n\nScrivi la scheda per Lumen.`,
    schema: SCHEMA_SCHEDA,
  });
}

export async function verificaScheda({ modello, candidato, articolo, scheda }) {
  const daVerificare = {
    titolo: scheda.titolo,
    riassunto: scheda.riassunto,
    corpo: scheda.corpo,
    solidita: scheda.solidita,
    nota_solidita: scheda.nota_solidita,
  };
  return chiedi({
    modello,
    sistema: ISTRUZIONI_VERIFICA,
    utente: `${descriviFonte(candidato, articolo)}\n\nSCHEDA DA VERIFICARE:\n${JSON.stringify(daVerificare, null, 2)}`,
    schema: SCHEMA_VERIFICA,
  });
}
