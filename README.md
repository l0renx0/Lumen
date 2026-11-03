# Lumen · Impara quello che ti incuriosisce

Lumen è la tua app personale per imparare. Scegli una **materia** (per ora Fisica, Psicologia e Astronomia), sfogli gli **argomenti** come in un feed e tocchi quello che ti incuriosisce per approfondirlo.

Indirizzo dell'app: **https://l0renx0.github.io/Lumen/**

## Com'è fatto un argomento

Ogni argomento si legge in pochi minuti e contiene:

- una **spiegazione semplice**, in italiano;
- **In breve**: le 3 idee da ricordare;
- **Nella vita di tutti i giorni**: un esempio concreto;
- una **citazione dal manuale**, copiata parola per parola, con la traduzione;
- i **video** da canali divulgativi seri (CrashCourse, Khan Academy, TED-Ed, Kurzgesagt…), che si guardano dentro l'app;
- **Approfondisci**: i capitoli del manuale universitario gratuito da cui viene la spiegazione, più una ricerca di altri video su YouTube;
- il **prossimo argomento** della stessa materia.

Le fonti sono i manuali gratuiti **OpenStax** della Rice University (un'università americana): *College Physics*, *Psychology* e *Astronomy*. Sono testi universitari veri, controllati da professori, e chiunque può leggerli gratis. Non usiamo Wikipedia.

## Come si usa

- **Home**: le materie, la barra di ricerca e l'"argomento del giorno".
- **Cerca**: scrivi una parola (es. "gravità"). Se in Lumen non c'è ancora niente, trovi subito i link per cercare su YouTube e nei manuali OpenStax.
- **Segnalibro** (in alto a destra nell'argomento): lo salva. Ritrovi tutti i salvati toccando il segnalibro nella barra in alto.
- **Fiamma**: quanti giorni di fila hai esplorato almeno un argomento. Un argomento conta come "esplorato" quando lo leggi quasi fino in fondo o fai partire un video.
- **Sole/luna**: modalità chiara o scura.

I tuoi progressi (esplorati, salvati, fiamma) restano solo sul tuo telefono.

## Installarla sul telefono

1. Apri l'indirizzo dell'app con **Safari** (iPhone) o **Chrome** (Android).
2. iPhone: tocca il pulsante **Condividi** (il quadrato con la freccia) → **Aggiungi alla schermata Home**.
   Android: menu **⋮** → **Installa app** (o "Aggiungi a schermata Home").
3. Lumen compare tra le app e funziona anche senza connessione per gli argomenti già aperti.

## Aggiungere materie o argomenti

È gratis: non c'è nessun servizio a pagamento. Quando vuoi nuovi contenuti, apri una conversazione con Claude nella cartella del progetto e chiedi, per esempio:

> "Aggiungi la materia Chimica con 8 argomenti" oppure "Aggiungi 5 argomenti di Psicologia sullo stress e sulla personalità".

Claude scrive gli argomenti partendo dai manuali, controlla che citazioni, link e video funzionino e pubblica. Dopo circa un minuto, nell'app compare il banner arancione **"Nuovi argomenti · Aggiorna"**.

## Struttura del progetto

| File | A cosa serve |
|---|---|
| `index.html`, `assets/` | L'app (pagina, stile, codice, icone) |
| `data/argomenti.json` | Tutte le materie e tutti gli argomenti |
| `data/meta.json` | Data dell'ultimo aggiornamento (serve per il banner) |
| `strumenti/controlla_argomenti.py` | Controlli prima di pubblicare |
| `sw.js`, `manifest.webmanifest` | Rendono Lumen installabile e utilizzabile offline |
| `.github/workflows/pubblica.yml` | Pubblica il sito su GitHub Pages a ogni modifica |
