# Lumen · Una cosa vera al giorno

**L'app è online: https://l0renx0.github.io/Lumen/**

Lumen è un'app personale da tenere sul telefono: un feed di schede da scorrere, come un social, ma senza utenti e senza disinformazione. Ogni scheda nasce da una **fonte ufficiale o di grande autorevolezza**: agenzie ed enti (NASA, ESA, ESO, INAF, INGV, ISTAT, OMS, ECDC, NOAA, UNESCO), grandi riviste scientifiche (Nature, PNAS, Scientific American), università e musei (British Museum, Smithsonian, Museo Galileo, King's College London, Fondazione Nobel). **Niente Wikipedia.** Ogni scheda è scritta in italiano chiaro e riporta **citazioni copiate alla lettera** e i **link all'originale**.

**È gratuita**: il sito sta su GitHub Pages (gratis) e non usa nessun servizio a pagamento.

## Le due sezioni

- **Lo sapevi?**: la sezione principale. Conoscenze consolidate e affascinanti: scoperte storiche, fenomeni naturali, invenzioni, curiosità scientifiche solide. Ogni giorno in cima trovi **"La scoperta di oggi"**: l'app mostra prima le schede che non hai ancora letto, in un ordine che cambia ogni giorno.
- **Ricerca recente**: studi e notizie scientifiche aggiornati all'ultima volta che abbiamo aggiornato l'app, dal più recente.

Ogni scheda ha un **indicatore di solidità**:

| Livello | Significato |
|---|---|
| **Consolidato** | Conoscenza accettata da tempo o fatto storico documentato |
| **Dato ufficiale** | Dato o annuncio diretto di un ente ufficiale |
| **Studio recente, da confermare** | Risultato nuovo, non ancora confermato da altri |
| **Preliminare** | Ipotesi o primo risultato: un tassello, non una conclusione |

## Come si usa

- **Scorri** in verticale: la scheda in primo piano è nitida, la successiva si intravede sfocata.
- **Tocca** una scheda per leggere la spiegazione completa, le citazioni e le fonti. Per chiudere: la ✕, il tasto Indietro, oppure trascina verso il basso.
- In alto scegli la sezione e filtra per argomento (Scienza, Spazio, Salute, Storia, Tecnologia, Natura, Società).
- Il cerchio arancione conta quante schede hai letto oggi: l'obiettivo è almeno una.
- Il pulsante sole/luna attiva la **modalità scura**.

## Installarla sul telefono

Apri **https://l0renx0.github.io/Lumen/** sul telefono:

- **iPhone (Safari)**: tocca **Condividi** (il quadrato con la freccia) → **Aggiungi alla schermata Home** → **Aggiungi**.
- **Android (Chrome)**: tocca il menu **⋮** → **Installa app** (oppure "Aggiungi a schermata Home").

L'icona arancione di Lumen comparirà tra le tue app. Funziona anche offline con le schede già viste.

## Aggiungere nuove schede

Non c'è nessun aggiornamento automatico (per non pagare nulla). Quando vuoi nuove schede:

1. Apri Claude nella cartella **Lumen 2.0**.
2. Scrivi per esempio: *"Aggiungi 10 nuove schede a Lumen"*, oppure *"Aggiungi schede di Ricerca recente sulle ultime notizie dell'ESA"*, oppure *"Voglio schede sulla storia della medicina"*.
3. Claude legge le fonti, scrive le schede, controlla che le citazioni siano davvero nelle fonti e pubblica. Dopo circa un minuto, sull'app compare la scritta arancione **"Nuove schede · Aggiorna"**.

Le istruzioni dettagliate che Claude segue sono nel file [`CLAUDE.md`](CLAUDE.md).

## Struttura del progetto

```
index.html, manifest.webmanifest, sw.js   l'app (installabile sul telefono)
assets/css/app.css                        lo stile
assets/js/app.js                          la logica dell'app
assets/icons/                             le icone
data/cards.json                           tutte le schede
data/meta.json                            data dell'ultimo aggiornamento (fa comparire il banner)
strumenti/controlla_schede.py             controlli sulle schede prima di pubblicare
.github/workflows/pubblica.yml            pubblicazione automatica su GitHub Pages a ogni modifica
CLAUDE.md                                 istruzioni per Claude su come aggiornare l'app
```
