# Lumen — istruzioni per Claude

App personale per imparare (PWA statica, nessun build) pubblicata su GitHub Pages: https://l0renx0.github.io/Lumen/ (repository `l0renx0/Lumen`, ramo `main`). L'utente non è uno sviluppatore: spiega sempre in italiano semplice, passo per passo.

**Nessun costo**: l'utente non vuole pagare l'API di Claude. Non esiste (e non va reintrodotta) un'automazione che chiami l'API. I contenuti si aggiungono solo quando l'utente lo chiede, in una conversazione come questa.

## Idea dell'app
L'utente sceglie una **materia** (Fisica, Psicologia, Astronomia…) e vede un **feed di argomenti** da cui sceglie liberamente quello da approfondire. L'utente NON vuole lezioni numerate, percorsi obbligati né quiz/test. Ogni argomento: spiegazione semplice, "In breve", esempio di vita quotidiana, citazione dal manuale, video YouTube, link per approfondire. Solo italiano (niente versione inglese).

## File
- `index.html`, `assets/css/app.css`, `assets/js/app.js`, `sw.js`, `manifest.webmanifest`: l'app. Navigazione con indirizzi `#/` (home), `#/m/<materia>`, `#/a/<argomento>`, `#/salvati`.
- `data/argomenti.json`: `{updatedAt, subjects: [...], topics: [...]}`.
- `data/meta.json`: `{updatedAt, count}` → se `updatedAt` è più recente di quello caricato, l'app mostra il banner "Nuovi argomenti · Aggiorna".
- `strumenti/controlla_argomenti.py`: controlli prima di pubblicare.
- `.github/workflows/pubblica.yml`: pubblica il sito a ogni push su `main`.
- `turni/`: app separata "Turni" (https://l0renx0.github.io/Lumen/turni/): timbratura entrata/uscita, ore della settimana e del mese, ore extra sul mese oltre il contratto (20 h × settimane del mese: 4 settimane = 80 h, 5 = 100 h; criterio sconosciuto: si contano lunedì, giovedì e domeniche del mese; se sono tutti 4 → 4 settimane, altrimenti nel dubbio 5; la sezione Soldi mostra entrambi i resoconti (4 e 5) e quale torna con i soldi ricevuti; modificabile mese per mese) pagate a 9 €/h, pause pagate (nessun campo pausa), turno spezzato = due turni nello stesso giorno, soldi ricevuti e confronto tra modi di arrotondare le ore. File: `turni/index.html`, `turni/app.css`, `turni/app.js`. Font: Bricolage Grotesque (titoli e numeri) + Inter. Lingue: italiano e spagnolo (scelta in Impostazioni, `localStorage` `turni.lang`); tutti i testi stanno in `I18N` in `turni/app.js` e i testi fissi della pagina hanno `data-i18n`: ogni nuovo testo va aggiunto in entrambe le lingue. I dati restano solo nel telefono (localStorage `turni.v1`), con backup JSON ed esportazione CSV. Se la modifichi, aumenta `VERSION` in `turni/sw.js`.

## Formato
Materia (`subjects`):
```json
{"id": "fisica", "name": "Fisica", "tagline": "una frase", "chapters": ["Meccanica", "…"], "book": {"title": "College Physics 2e", "url": "https://openstax.org/books/..."}}
```
Per una nuova materia aggiungi anche: colori in `app.css` (`[data-subject="id"] { --hue; --hue-2 }`) e un'icona SVG in `ICONS` in `app.js`, poi aumenta `VERSION` in `sw.js`.

Argomento (`topics`):
```json
{
  "id": "slug-minuscolo",
  "subject": "fisica",
  "title": "max ~80 caratteri, invitante ma fedele",
  "hook": "frase di lancio, max ~180 caratteri",
  "chapter": "uno dei capitoli in subjects[].chapters (es. Meccanica)",
  "sections": [{"h": "sottotitolo", "p": ["2-4 paragrafi"]}],
  "formulas": [{"f": "F = m · a", "d": "spiegazione a parole"}],
  "mistakes": ["errori comuni"],
  "terms": [{"t": "termine", "d": "definizione"}],
  "points": ["3-4 cose che imparerai"],
  "example": "un esempio della vita di tutti i giorni",
  "quote": {"text": "copiata ALLA LETTERA dalla prima fonte", "translation": "traduzione italiana"},
  "sources": [{"name": "OpenStax · Psychology 2e", "title": "8.1 How Memory Functions", "url": "https://openstax.org/books/psychology-2e/pages/8-1-how-memory-functions"}],
  "videos": [{"id": "ID YouTube", "title": "…", "channel": "…", "length": "9:55", "lang": "it"}],
  "videoQuery": "parole chiave per la ricerca su YouTube",
  "addedAt": "ISO"
}
```

## Come aggiungere argomenti o materie (quando l'utente lo chiede)
La dispensa delle tre materie attuali (Fisica, Psicologia, Astronomia) è COMPLETA: tutte le 487 sezioni dei manuali OpenStax sono coperte da 252 argomenti (vedi `strumenti/indice_dispensa.json`). L'utente non vuole lezioni numerate né quiz. Per nuove materie o argomenti usa gli strumenti in `strumenti/dispensa/` (leggi il LEGGIMI.md): `plan.py` (piano), `prep.py` (scarica testi, propone citazioni, cerca e verifica video), `merge.py` (unisce ai dati, verifica le citazioni, aggiorna indice e ordine per capitoli), `pub.sh` (controllo + commit + push). Spiegazioni di 5-6 sezioni con sottotitolo (~500-650 parole) più i riquadri. Per una nuova materia aggiungi anche il suo manuale OpenStax all'indice, i capitoli in `merge.py` (CH), i colori in `app.css` e l'icona in `app.js`.

1. **Fonti**: preferisci i manuali gratuiti **OpenStax** (openstax.org, Rice University): c'è un libro per moltissime materie (fisica, chimica, biologia, astronomia, psicologia, sociologia, economia, statistica…). L'indice dei capitoli si ricava dagli `"slug"` presenti nell'HTML di una pagina del libro. In alternativa: enti e università (NASA, ESA, MIT OpenCourseWare, musei). **NON usare Wikipedia**, blog o siti commerciali.
2. Leggi davvero il capitolo e scrivi solo ciò che dice, in modo semplice; niente esagerazioni, numeri solo se sono nella fonte.
3. **Video**: solo canali ufficiali o divulgatori riconosciuti (CrashCourse, Khan Academy, TED-Ed, Kurzgesagt, minutephysics, PBS, agenzie, università). Si trovano cercando su `https://www.youtube.com/results?search_query=…` e leggendo `ytInitialData`.
   **Video in italiano**: l'utente vuole, quando c'è e ne vale la pena, anche un video in italiano per argomento (216 argomenti su 252 lo hanno). Va messo per PRIMO nella lista, con `"lang": "it"` (l'app mostra l'etichetta "In italiano"; senza `lang` il video è considerato in inglese). Canali italiani affidabili: enti (INAF, ASI, INFN, Politecnico di Milano/Polimi OpenKnowledge, università, Rai SuperQuark), editori scolastici (Zanichelli, HUB Scuola), divulgatori riconosciuti (Amedeo Balbi, Luca Perri, Link4Universe, Geopop, CURIUSS, Pepite di Scienza, Random Physics, Luca Nardi, La Fisica Che Ci Piace/Vincenzo Schettini, Step by Step Fisica, Valerio Pattaro, Sprouts Italia, Dott. Valerio Rosso, Luca Mazzucchelli, Laura Pirotta, Alessandro Fanello). Mai canali "documentari per dormire", motivazionali o titoli tradotti automaticamente da canali inglesi. Strumenti: `strumenti/dispensa/video_it_cerca.py` (ricerca con `hl=it`) e `video_it_scegli.py` (candidati per argomento); la scelta finale si fa leggendo i titoli. Pulisci i titoli scritti tutti in maiuscolo o pieni di parole chiave. Se il video non si può incorporare (oEmbed 401), scegline un altro.
4. Aggiorna `updatedAt` (ora UTC attuale, mai nel futuro) in `data/argomenti.json` e `data/meta.json` (anche `count`).
5. `python3 -I strumenti/controlla_argomenti.py --rete` → deve dare 0 errori (controlla link, video via oEmbed e che la citazione sia davvero nella fonte).
6. Prova in locale se hai cambiato l'app, poi commit e push su `main`: il sito si ripubblica da solo in circa un minuto.

## Pubblicare (push)
L'accesso GitHub dell'utente è salvato in `~/.config/gh/hosts.yml` (account `l0renx0`), se l'utente non l'ha revocato. Con il programma `gh` (GitHub CLI; se non c'è, scarica la release ufficiale da https://github.com/cli/cli/releases per macOS arm64 nella cartella temporanea della sessione, verificando il checksum):
```bash
git -c credential.helper= -c "credential.helper=!<percorso>/gh auth git-credential" push origin main
```
Se l'accesso non c'è più, l'utente deve rifare `gh auth login --web` (lui inserisce il codice nel browser).

## Modifiche all'app
Se cambi `index.html`, CSS o JS, aumenta `VERSION` in `sw.js`. Mantieni il design: sfondo bianco, Newsreader + Inter, accento arancione, un colore sfumato per materia, modalità scura tramite i token in `:root`.
