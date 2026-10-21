# Lumen — istruzioni per Claude

App personale (PWA statica, nessun build) pubblicata su GitHub Pages: https://l0renx0.github.io/Lumen/ (repository `l0renx0/Lumen`, ramo `main`). L'utente non è uno sviluppatore: spiega sempre in italiano semplice, passo per passo.

**Nessun costo**: l'utente non vuole pagare l'API di Claude. Non esiste (e non va reintrodotta) un'automazione che chiami l'API. Le schede si aggiornano solo quando l'utente lo chiede, in una conversazione come questa.

## File
- `index.html`, `assets/css/app.css`, `assets/js/app.js`, `sw.js`, `manifest.webmanifest`: l'app.
- `data/cards.json`: tutte le schede. `data/meta.json`: `updatedAt` → se è più recente di quello caricato, l'app mostra il banner arancione "Nuove schede · Aggiorna".
- `strumenti/controlla_schede.py`: controlli prima di pubblicare.
- `.github/workflows/pubblica.yml`: pubblica il sito a ogni push su `main`.

## Sezioni
- `sapevi` → "Lo sapevi?": conoscenze consolidate. Sezione principale: l'app mostra prima le schede non lette, in un ordine che cambia ogni giorno ("La scoperta di oggi").
- `novita` → "Ricerca recente": studi e notizie da enti/riviste, ordinate per data.

## Come aggiungere schede (quando l'utente lo chiede)
1. Scegli fonti affidabili: enti di ricerca e agenzie (ESA, NASA, ESO, INAF, INGV, ISTAT, ECDC, OMS, NOAA), riviste scientifiche, università, Wikipedia (italiana) per le conoscenze consolidate. Niente aggregatori, blog o testate generaliste.
2. Leggi il testo vero della fonte (pagina o API di Wikipedia). Scrivi **solo** ciò che dice la fonte: niente fatti dalla memoria, niente esagerazioni o clickbait; mantieni le cautele ("potrebbe", "secondo un modello").
3. Formato di ogni scheda in `data/cards.json` (campo `cards`):
   ```json
   {
     "section": "sapevi | novita",
     "topic": "Scienza | Spazio | Salute | Storia | Tecnologia | Natura | Società",
     "solidity": "consolidato | ufficiale | recente | preliminare",
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
     "solidityNote": "una frase sul perché di quel livello, o null"
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
