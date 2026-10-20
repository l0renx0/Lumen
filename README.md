# Lumen · Una cosa vera al giorno

Lumen è un'app personale da installare sul telefono: un feed di schede da scorrere, come un social, ma senza utenti e senza disinformazione. Ogni scheda nasce da una **fonte affidabile** (ESA, NASA, ESO, INAF, INGV, ISTAT, ECDC, OMS, Nature, Science, Wikipedia…), viene **riassunta in italiano da Claude** (l'intelligenza artificiale di Anthropic) e poi **ricontrollata da un secondo passaggio** che verifica che titolo e riassunto non esagerino.

- **Novità**: notizie recenti, dalla più nuova; scorrendo si torna indietro nel tempo.
- **Lo sapevi?**: conoscenze consolidate e affascinanti (scoperte storiche, fenomeni naturali, "accadde oggi").
- Ogni scheda mostra un **indicatore di solidità**: *Consolidato*, *Dato ufficiale*, *Studio recente, da confermare*, *Preliminare*.
- Nel dettaglio trovi la spiegazione completa, **citazioni copiate alla lettera** dalla fonte (con traduzione) e i **link all'originale**.
- Ogni mattina un'automazione su GitHub aggiunge le nuove schede. Quando ci sono, in cima all'app compare la scritta arancione **"Nuove notizie · Aggiorna"**.

L'app parte già con 23 schede reali, quindi funziona subito, anche prima di inserire la chiave dell'AI.

---

## Cosa devi fare tu (una volta sola)

Servono circa 15 minuti. Non devi scrivere codice: solo cliccare nei posti giusti.

### Passo 1 · Mettere i file su GitHub

Se hai già creato il repository vuoto su GitHub, salta al punto 1.3.

1. **1.1** Vai su [github.com](https://github.com) e accedi.
2. **1.2** In alto a destra clicca **+** → **New repository**. Come nome scrivi `lumen`, lascia **Public** (GitHub Pages gratuito richiede un repository pubblico) e **non** spuntare "Add a README". Clicca **Create repository**.
3. **1.3** Il modo più semplice per caricare i file è **GitHub Desktop**:
   - scaricalo da [desktop.github.com](https://desktop.github.com) e accedi con il tuo account GitHub;
   - menu **File → Add Local Repository…** e scegli la cartella `Lumen` sulla Scrivania (è già pronta come repository, con un primo salvataggio fatto);
   - clicca **Publish repository** (o **Push origin** se lo hai già collegato), scegli il nome `lumen` e **togli** la spunta "Keep this code private".

> In alternativa, se nel terminale c'è il comando `gh` di GitHub, basta chiedere a Claude Code di farlo per te.

### Passo 2 · Attivare GitHub Pages (il sito)

1. Nel repository su GitHub apri **Settings** (ingranaggio in alto).
2. Nel menu a sinistra clicca **Pages**.
3. In **Build and deployment → Source** scegli **GitHub Actions**.
4. Vai nella scheda **Actions** del repository: vedrai "Pubblica il sito". Se non è partito da solo, cliccalo e premi **Run workflow**.
5. Dopo circa un minuto il sito è online all'indirizzo
   `https://TUO-NOME-UTENTE.github.io/lumen/`
   (lo trovi anche in **Settings → Pages**, in alto).

### Passo 3 · Inserire la chiave API di Claude

La chiave permette all'automazione di usare Claude per scrivere e verificare le schede. Resta segreta: non compare mai nel sito.

1. Vai su [console.anthropic.com](https://console.anthropic.com), accedi e aggiungi un metodo di pagamento in **Billing** (consiglio: imposta un limite di spesa mensile in **Limits**).
2. Apri **API Keys** → **Create Key**, dai un nome (es. "Lumen") e **copia** la chiave (inizia con `sk-ant-`). Viene mostrata una sola volta.
3. Su GitHub, nel repository: **Settings → Secrets and variables → Actions → New repository secret**.
4. In **Name** scrivi esattamente `ANTHROPIC_API_KEY`, in **Secret** incolla la chiave, poi **Add secret**.

### Passo 4 · Prima prova dell'aggiornamento automatico

1. Scheda **Actions** → a sinistra **Aggiorna le schede** → **Run workflow** → **Run workflow**.
2. Dopo qualche minuto il pallino diventa verde ✅. Se ci sono schede nuove, il sito si ripubblica da solo.
3. Da quel momento parte **ogni giorno alle 7:30** (ora italiana estiva) senza che tu faccia nulla.

Se il pallino diventa rosso ❌, clicca sull'esecuzione e poi su "aggiorna" per leggere il messaggio: di solito è la chiave mancante o scritta male, oppure credito esaurito sulla console Anthropic.

### Passo 5 · Installare l'app sul telefono

Apri l'indirizzo del sito (`https://TUO-NOME-UTENTE.github.io/lumen/`) sul telefono.

- **iPhone (Safari)**: tocca il pulsante **Condividi** (quadrato con freccia) → **Aggiungi alla schermata Home** → **Aggiungi**.
- **Android (Chrome)**: tocca il menu **⋮** → **Installa app** (oppure "Aggiungi a schermata Home").

L'icona arancione di Lumen comparirà tra le tue app. Si apre a tutto schermo e funziona anche offline con le schede già scaricate.

---

## Come si usa

- **Scorri** in verticale: la scheda in primo piano è nitida, la successiva si intravede sfocata.
- **Tocca** una scheda per leggere la spiegazione completa, le citazioni e le fonti. Per chiudere: la ✕, il tasto Indietro, oppure trascina verso il basso.
- In alto scegli **Novità** o **Lo sapevi?** e filtra per argomento (Scienza, Spazio, Salute, Storia, Tecnologia, Natura, Società).
- Il cerchio arancione in alto conta quante schede hai letto oggi: l'obiettivo è almeno una.
- Il pulsante sole/luna attiva la **modalità scura**.

---

## Aggiungere o togliere fonti

Tutte le fonti sono nel file [`config/fonti.json`](config/fonti.json). Sono una **whitelist**: Claude riceve solo articoli che stanno sui siti elencati, mai fonti generiche.

Per modificarlo direttamente da GitHub: apri il file, clicca la **matita ✏️** in alto a destra, fai la modifica e premi **Commit changes**.

Ogni fonte è un blocco tra parentesi graffe. Per aggiungerne una, copia un blocco esistente, incollalo prima dell'ultima `]` (ricordati la **virgola** tra un blocco e l'altro) e cambia i valori:

```json
{
  "id": "nome-breve-senza-spazi",
  "nome": "Nome mostrato nell'app",
  "tipo": "rss",
  "url": "https://indirizzo-del-feed-rss",
  "domini": ["sito.it"],
  "sezione": "auto",
  "attiva": true
}
```

| Campo | Cosa significa |
|---|---|
| `id` | Un nome breve, unico, senza spazi. |
| `nome` | Come appare la fonte nelle schede. |
| `tipo` | `rss` per i feed RSS/Atom. (`wikipedia-accadde-oggi` è un tipo speciale già configurato.) |
| `url` | L'indirizzo del feed RSS. Di solito si trova cercando "RSS" nel sito, oppure provando `sito.it/feed`. |
| `domini` | I siti da cui accettare gli articoli: gli articoli con link verso altri siti vengono ignorati. |
| `sezione` | `novita`, `sapevi`, oppure `auto` (decide Claude in base al contenuto). |
| `attiva` | `false` per spegnere una fonte senza cancellarla. |
| `massimoPerFonte` | (facoltativo) quante schede al massimo da questa fonte per giorno. |
| `soloSeUrlContiene` / `escludiSeUrlContiene` | (facoltativi) filtri sull'indirizzo degli articoli, es. ISTAT usa solo i comunicati stampa. |

**Consigli sulla scelta delle fonti**: preferisci enti di ricerca, agenzie pubbliche, università e riviste scientifiche. Evita aggregatori, blog e testate generaliste: la verifica dell'AI controlla che la scheda sia fedele alla fonte, ma non può rendere affidabile una fonte che non lo è.

### Altre impostazioni (in cima allo stesso file)

| Impostazione | Valore attuale | Significato |
|---|---|---|
| `modello` | `claude-opus-5-5` | Il modello di Claude usato. Vedi "Costi" sotto. |
| `nuoveSchedePerGiorno` | `8` | Quanti articoli elaborare al massimo ogni giorno. |
| `massimoPerFonte` | `2` | Quante schede al massimo dalla stessa fonte per giorno. |
| `etaMassimaGiorni` | `10` | Ignora le notizie più vecchie di così. |
| `schedeMassimeConservate` | `800` | Oltre questo numero le schede più vecchie vengono rimosse. |

---

## Costi

GitHub Pages e GitHub Actions sono gratuiti per un repository pubblico. Paghi solo l'uso di Claude, a consumo:

- con `claude-opus-5-5` (il più accurato, impostato di default) ogni scheda costa indicativamente **10-15 centesimi di dollaro** (due passaggi: scrittura + verifica). Con 8 schede al giorno sono circa **1 $ al giorno, 25-35 $ al mese**;
- con `claude-sonnet-5-5` il costo è circa la **metà**;
- con `claude-haiku-5-5` è circa **30 volte più basso** (pochi centesimi al giorno), con verifiche un po' meno raffinate.

Per cambiare basta sostituire il valore di `modello` in `config/fonti.json`. Puoi anche ridurre `nuoveSchedePerGiorno`. Ti consiglio comunque di impostare un limite di spesa sulla console Anthropic.

---

## Come funziona la verifica

Per ogni articolo nuovo l'automazione:

1. legge il testo **dalla pagina originale** (non solo il titolo del feed);
2. chiede a Claude di scrivere la scheda usando **solo** le informazioni del testo, senza esagerazioni, scegliendo argomento, sezione e livello di solidità; le pagine senza contenuto utile (bandi, concorsi, eventi…) vengono scartate;
3. controlla **automaticamente** che ogni citazione compaia parola per parola nell'originale, altrimenti la toglie;
4. fa un **secondo passaggio indipendente**: un revisore confronta la scheda con la fonte frase per frase. Se trova esagerazioni o fatti non supportati la **riscrive**; se la fonte è inadatta la **scarta**;
5. salva le schede in `data/cards.json` evitando i duplicati (gli articoli scartati sono annotati in `data/scartate.json` per non pagarli due volte).

Nessun sistema è perfetto: per questo ogni scheda ha i link alla fonte, che fa sempre fede.

---

## Struttura del progetto

```
index.html, manifest.webmanifest, sw.js   l'app (PWA installabile)
assets/css/app.css                        lo stile
assets/js/app.js                          la logica dell'app
assets/icons/                             le icone
data/cards.json                           le schede (lette dall'app)
data/meta.json                            data dell'ultimo aggiornamento (fa comparire il banner)
config/fonti.json                         la whitelist delle fonti e le impostazioni
pipeline/                                 lo script Node che legge le fonti e usa Claude
.github/workflows/aggiorna.yml            l'automazione quotidiana
.github/workflows/pubblica.yml            la pubblicazione su GitHub Pages
```

### Per chi vuole provarlo sul computer (facoltativo)

Serve [Node.js](https://nodejs.org) 22 o più recente.

```bash
npm install
npm run prova                       # mostra quali articoli verrebbero elaborati, senza usare l'AI
ANTHROPIC_API_KEY=sk-ant-... npm run aggiorna -- --limite 2
```

Per vedere l'app in locale: `python3 -m http.server 8000` nella cartella e poi apri `http://localhost:8000`.
