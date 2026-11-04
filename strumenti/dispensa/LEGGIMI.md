# Come continuare la dispensa
- `plan.py`: elenco completo degli argomenti da scrivere (materia, id, capitolo, sezioni OpenStax, ricerca video).
- Fatti: indici 0-114 del piano (Fisica completa, Psicologia fino a "altruismo-amore").
- Da fare: indici 115-207 (16 di Psicologia, 77 di Astronomia).
- Flusso: `python3 -I prep.py DA A` (scarica testi, propone citazioni e video) → scrivere `bNN.py` con `W(...)` come i blocchi precedenti → `python3 -I merge.py bNN` → `./pub.sh "messaggio"`.
- Gli script si aspettano di stare in una cartella di lavoro con le sottocartelle `os/` e `prep/` accanto (la cartella superiore): ricrearle se mancano.
