# Lumen — istruzioni per Claude

App personale (PWA statica, nessun build) pubblicata su GitHub Pages: https://l0renx0.github.io/Lumen/ (repository `l0renx0/Lumen`, ramo `main`). L'utente non è uno sviluppatore: spiega sempre in italiano semplice, passo per passo.

**Nessun costo**: l'utente non vuole pagare l'API di Claude. Non esiste (e non va reintrodotta) un'automazione che chiami l'API. Le schede si aggiornano solo quando l'utente lo chiede, in una conversazione come questa.

## File
- `index.html`, `assets/css/app.css`, `assets/js/app.js`, `sw.js`, `manifest.webmanifest`: l'app.
- `data/cards.json`: tutte le schede. `data/meta.json`: `updatedAt` → se è più recente di quello caricato, l'app mostra il banner arancione "Nuove schede · Aggiorna".
- `strumenti/controlla_schede.py`: controlli prima di pubblicare.
- `.github/workflows/pubblica.yml`: pubblica il sito a ogni push su `main`.
- `turni/`: app separata "Turni" (https://l0renx0.github.io/Lumen/turni/): timbratura entrata/uscita, ore della settimana e del mese, ore extra sul mese oltre il contratto (20 h × settimane del mese: 4 settimane = 80 h, 5 = 100 h; criterio sconosciuto: si contano lunedì, giovedì e domeniche del mese; se sono tutti 4 → 4 settimane, altrimenti nel dubbio 5; la sezione Soldi mostra entrambi i resoconti (4 e 5) e quale torna con i soldi ricevuti; modificabile mese per mese) pagate a 9 €/h, pause pagate (nessun campo pausa), turno spezzato = due turni nello stesso giorno, soldi ricevuti e confronto tra modi di arrotondare le ore. File: `turni/index.html`, `turni/app.css`, `turni/app.js`. I dati restano solo nel telefono (localStorage `turni.v1`), con backup JSON ed esportazione CSV. Se la modifichi, aumenta `VERSION` in `turni/sw.js`.

## Sezioni
- `sapevi` → "Lo sapevi?": conoscenze consolidate. Sezione principale: l'app mostra prima le schede non lette, in un ordine che cambia ogni giorno ("La scoperta di oggi").
- `novita` → "Ricerca": studi e notizie da enti/riviste, ordinate per data.
- `aneddoti` → "Aneddoti": storie curiose, anche dubbie o false, ma sempre raccontate tramite una fonte autorevole che le verifica. Usano un **verdetto** invece della solidità: `verosimile` (probabilmente vero), `dubbio`, `mito` (falso).

Argomenti ammessi: Scienza, Spazio, Salute, Storia, Natura, Tecnologia, Psicologia, Design, Finanza, Cinema, Società.

## Lingue
L'app è in italiano e inglese (pulsante IT/EN). **Ogni scheda deve avere anche la versione inglese** nel campo `en`: `{title, summary, body (stesso numero di paragrafi), when, note, quotes}`, dove `en.quotes` ha un elemento per citazione: la traduzione inglese se la citazione originale è in italiano, altrimenti `null`.

## Video
Campo `videos`: `[{id, title, channel, length}]` (id YouTube). Solo canali ufficiali o divulgatori riconosciuti (agenzie, musei, università, TED-Ed, Kurzgesagt, PBS, BBC, SciShow, CrashCourse…). Verifica ogni video con `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=ID&format=json` (deve rispondere 200). Campo `videoQuery`: parole chiave per il pulsante "Cerca altri video su YouTube".

## Come aggiungere schede (quando l'utente lo chiede)
1. **Fonti: solo ufficiali o di grande autorevolezza. NON usare Wikipedia** (l'utente non la vuole: è modificabile da chiunque, e confrontandola con le fonti ufficiali abbiamo trovato dati sbagliati). Ordine di preferenza:
   - enti e agenzie: NASA, ESA, ESO, INAF, INGV, ISTAT, OMS, ECDC, NOAA, UNESCO, Commissione europea (CORDIS);
   - articoli originali e grandi riviste: Nature, Science, PNAS, Proceedings of the Royal Society, Physical Review Letters;
   - università, musei e istituzioni storiche: British Museum, Smithsonian, Museo Galileo, King's College, Linnean Society, Fondazione Nobel (nobelprize.org), American Physical Society, Science History Institute;
   - libri e testi pubblici (citazioni dall'opera originale, es. Darwin) solo tramite un'istituzione che li pubblica.
   Niente aggregatori, blog, testate generaliste o siti commerciali. Se per un argomento non esiste una fonte così, non fare la scheda. Le sole immagini possono venire da Wikimedia Commons, citando il credito.
2. Leggi il testo vero della fonte (pagina o API di Wikipedia). Scrivi **solo** ciò che dice la fonte: niente fatti dalla memoria, niente esagerazioni o clickbait; mantieni le cautele ("potrebbe", "secondo un modello").
3. Formato di ogni scheda in `data/cards.json` (campo `cards`):
   ```json
   {
     "section": "sapevi | novita | aneddoti",
     "topic": "Scienza | Spazio | Salute | Storia | Natura | Tecnologia | Psicologia | Design | Finanza | Cinema | Società",
     "solidity": "consolidato | ufficiale | recente | preliminare  (per gli aneddoti: verosimile | dubbio | mito)",
     "title": "max ~90 caratteri, invitante ma fedele",
     "summary": "max ~220 caratteri",
     "body": ["3-6 paragrafi brevi"],
     "quotes": [{"text": "copiata ALLA LETTERA dalla fonte", "translation": "se non è in italiano, altrimenti null", "author": "chi parla o null"}],
     "sources": [{"name": "ESA", "title": "titolo originale", "url": "https://..."}],
     "date": "ISO: data della fonte (per sapevi: data di aggiunta)",
     "addedAt": "ISO: data di aggiunta",
     "when": "per sapevi: periodo o data storica (es. '1952'); per novita: null",
     "image": "URL immagine della fonte o null",
     "imageCredit": "autore/fonte immagine o null",
     "solidityNote": "una frase sul perché di quel livello, o null",
     "en": {"title": "…", "summary": "…", "body": ["…"], "when": "…", "note": "…", "quotes": [null]},
     "videos": [{"id": "ID YouTube", "title": "…", "channel": "…", "length": "4:10"}],
     "videoQuery": "parole chiave per YouTube"
   }
   ```
   `id` e `url` li calcola lo script (sha1 dell'URL normalizzato della prima fonte): non serve scriverli.
4. Aggiorna `updatedAt` in `data/cards.json` e `data/meta.json` (anche `count`).
5. `python3 strumenti/controlla_schede.py --rete` → deve dare 0 errori (controlla anche che le citazioni siano davvero nella fonte).
6. Prova in locale se hai cambiato l'app, poi commit e push su `main`: il sito si ripubblica da solo in circa un minuto.

## Pubblicare (push)
L'accesso GitHub dell'utente è salvato in `~/.config/gh/hosts.yml` (account `l0renx0`), se l'utente non l'ha revocato. Serve il programma `gh` (GitHub CLI): se non c'è, scarica la release ufficiale da https://github.com/cli/cli/releases (macOS arm64) nella cartella temporanea della sessione, verificando il checksum, chiedendo prima all'utente. Poi:
```bash
git -c credential.helper= -c "credential.helper=!<percorso>/gh auth git-credential" push origin main
```
Se l'accesso non c'è più, l'utente deve rifare `gh auth login --web` (lui inserisce il codice nel browser).

## Modifiche all'app
Se cambi `index.html`, CSS o JS, aumenta `VERSION` in `sw.js`. Mantieni il design: sfondo bianco, Fraunces + Inter, accento arancione, modalità scura tramite i token in `:root`.
