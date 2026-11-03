"""Controlla data/argomenti.json prima di pubblicare.

Uso (dalla cartella del progetto):
    python3 strumenti/controlla_argomenti.py          controlli veloci (struttura, duplicati)
    python3 strumenti/controlla_argomenti.py --rete   anche link, video (YouTube oEmbed) e citazioni verificate sulla fonte
"""
import html, json, re, sys, time, unicodedata, urllib.request
from pathlib import Path

FILE = Path(__file__).resolve().parent.parent / "data" / "argomenti.json"
UA = "Mozilla/5.0 (compatible; LumenBot/1.0; lettore personale di divulgazione)"
CAMPI = ("id", "subject", "title", "hook", "chapter", "sections", "points", "example", "sources", "videoQuery")


def fetch(u):
    with urllib.request.urlopen(urllib.request.Request(u, headers={"User-Agent": UA}), timeout=30) as r:
        return r.read()


def norm(t):
    t = unicodedata.normalize("NFKC", html.unescape(t))
    t = re.sub(r"[‘’']", "'", t)
    t = re.sub(r'[“”"«»]', '"', t)
    return re.sub(r"\s+", " ", t).strip().lower()


def testo(u):
    h = fetch(u).decode("utf-8", "replace")
    h = re.sub(r"(?is)<(script|style)[^>]*>.*?</\1>", " ", h)
    # Due versioni: tag tolti con uno spazio (fine paragrafo) o senza (grassetti e termini a metà frase).
    return re.sub(r"<[^>]+>", " ", h) + "\n" + re.sub(r"<[^>]+>", "", h)


def main():
    rete = "--rete" in sys.argv
    data = json.loads(FILE.read_text())
    materie = {s["id"] for s in data["subjects"]}
    errori, avvisi, visti = [], [], set()
    for t in data["topics"]:
        nome = t.get("title", "?")[:50]
        for c in CAMPI:
            if not t.get(c):
                errori.append(f"{nome}: manca '{c}'")
        if t.get("subject") not in materie:
            errori.append(f"{nome}: materia sconosciuta ({t.get('subject')})")
        if t.get("id") in visti:
            errori.append(f"{nome}: id duplicato ({t['id']})")
        visti.add(t.get("id"))
        if not re.fullmatch(r"[a-z0-9-]+", t.get("id", "")):
            errori.append(f"{nome}: id non valido (solo minuscole, numeri e trattini)")
        if len(t.get("hook", "")) > 160:
            avvisi.append(f"{nome}: frase di lancio lunga ({len(t['hook'])} caratteri)")
        if not t.get("videos"):
            avvisi.append(f"{nome}: nessun video")
        if rete:
            for s in t.get("sources", []):
                try:
                    fetch(s["url"])
                except Exception as e:
                    errori.append(f"{nome}: link non raggiungibile {s['url']} ({e})")
            for v in t.get("videos", []):
                try:
                    fetch(f"https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v={v['id']}&format=json")
                except Exception as e:
                    errori.append(f"{nome}: video non disponibile {v['id']} ({e})")
            q = t.get("quote")
            if q:
                try:
                    if norm(q["text"]).rstrip(".") not in norm(testo(t["sources"][0]["url"])):
                        errori.append(f"{nome}: citazione non trovata alla lettera nella fonte")
                except Exception as e:
                    avvisi.append(f"{nome}: impossibile verificare la citazione ({e})")
            time.sleep(0.5)
    if rete:
        for s in data["subjects"]:
            try:
                fetch(s["book"]["url"])
            except Exception as e:
                errori.append(f"{s['name']}: link al manuale non raggiungibile ({e})")
    for a in avvisi:
        print("  avviso:", a)
    for e in errori:
        print("  ERRORE:", e)
    conta = ", ".join(f"{s['name']} {sum(t['subject'] == s['id'] for t in data['topics'])}" for s in data["subjects"])
    print(f"{len(data['topics'])} argomenti ({conta}) · {len(errori)} errori · {len(avvisi)} avvisi")
    sys.exit(1 if errori else 0)


if __name__ == "__main__":
    main()
