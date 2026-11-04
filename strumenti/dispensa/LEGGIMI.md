# Come continuare la dispensa
- `plan.py`: elenco completo degli argomenti da scrivere (materia, id, capitolo, sezioni OpenStax, ricerca video).
- Il piano è COMPLETATO: tutte le 487 sezioni di Fisica, Psicologia e Astronomia sono coperte (252 argomenti).
- Per una nuova materia: aggiungere il manuale all'indice, le voci a `plan.py` e i capitoli a `CH` in `merge.py`.
- Flusso: `python3 -I prep.py DA A` (scarica testi, propone citazioni e video) → scrivere `bNN.py` con `W(...)` come i blocchi precedenti → `python3 -I merge.py bNN` → `./pub.sh "messaggio"`.
- Gli script si aspettano di stare in una cartella di lavoro con le sottocartelle `os/` e `prep/` accanto (la cartella superiore): ricrearle se mancano.
