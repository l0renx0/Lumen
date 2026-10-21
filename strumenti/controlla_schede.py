"""Controlla data/cards.json prima di pubblicare.

Uso (dalla cartella del progetto):
    python3 strumenti/controlla_schede.py            controlli veloci (struttura, duplicati, identificativi)
    python3 strumenti/controlla_schede.py --rete     anche link, immagini e citazioni verificate sulla fonte

Corregge da solo identificativi e indirizzi normalizzati mancanti; per tutto il resto segnala i problemi.
"""
import hashlib, html, json, re, sys, time, unicodedata, urllib.request
from pathlib import Path
from urllib.parse import urlsplit, urlunsplit, parse_qsl, urlencode

FILE = Path(__file__).resolve().parent.parent / "data" / "cards.json"
TOPICS = {"Scienza", "Spazio", "Salute", "Storia", "Tecnologia", "Natura", "Società"}
SOLIDITY = {"consolidato", "ufficiale", "recente", "preliminare"}
UA = "Mozilla/5.0 (compatible; LumenBot/1.0; lettore personale di divulgazione)"


def norm_url(u):
    p = urlsplit(u.strip())
    q = [(k, v) for k, v in parse_qsl(p.query) if not k.lower().startswith("utm_")]
    return urlunsplit(("https", p.netloc.lower().removeprefix("www."), p.path.rstrip("/") or "/", urlencode(q), ""))


def card_id(u):
    return hashlib.sha1(norm_url(u).encode()).hexdigest()[:12]


def norm_text(t):
    t = unicodedata.normalize("NFKC", html.unescape(t))
    t = re.sub(r"[‘’']", "'", t)
    t = re.sub(r'[“”"«»]', '"', t)
    return re.sub(r"\s+", " ", t).strip().lower()


def fetch(u):
    req = urllib.request.Request(u, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.status, r.read()


def page_text(u):
    """Testo leggibile di una pagina; per Wikipedia usa l'API, che restituisce il testo pulito."""
    m = re.match(r"https://(\w+)\.wikipedia\.org/wiki/(.+)", u)
    if m:
        api = f"https://{m[1]}.wikipedia.org/w/api.php?action=query&prop=extracts&explaintext=1&format=json&formatversion=2&redirects=1&titles={m[2]}"
        return json.loads(fetch(api)[1])["query"]["pages"][0].get("extract", "")
    raw = fetch(u)[1].decode("utf-8", "replace")
    return re.sub(r"<[^>]+>", "", re.sub(r"(?is)<(script|style)[^>]*>.*?</\1>", " ", raw))


def main():
    rete = "--rete" in sys.argv
    data = json.loads(FILE.read_text())
    errori, avvisi, visti = [], [], set()
    for c in data["cards"]:
        nome = c.get("title", "?")[:50]
        for campo in ("section", "topic", "solidity", "title", "summary", "body", "sources", "date"):
            if not c.get(campo):
                errori.append(f"{nome}: manca '{campo}'")
        if c.get("section") not in ("novita", "sapevi"):
            errori.append(f"{nome}: sezione non valida")
        if c.get("topic") not in TOPICS:
            errori.append(f"{nome}: argomento non valido ({c.get('topic')})")
        if c.get("solidity") not in SOLIDITY:
            errori.append(f"{nome}: solidità non valida ({c.get('solidity')})")
        if len(c.get("summary", "")) > 230:
            avvisi.append(f"{nome}: riassunto lungo ({len(c['summary'])} caratteri)")
        if not c.get("sources"):
            continue
        src = c["sources"][0]["url"]
        c["url"], giusto = norm_url(src), card_id(src)
        if c.get("id") != giusto:
            c["id"] = giusto
        if c["id"] in visti:
            errori.append(f"{nome}: scheda duplicata (stessa fonte di un'altra)")
        visti.add(c["id"])
        c.setdefault("addedAt", c["date"])
        c.setdefault("quotes", [])

        if rete:
            for s in c["sources"]:
                try:
                    fetch(s["url"])
                except Exception as e:
                    errori.append(f"{nome}: link non raggiungibile {s['url']} ({e})")
            if c.get("image"):
                try:
                    fetch(c["image"])
                except Exception as e:
                    avvisi.append(f"{nome}: immagine non raggiungibile ({e})")
            if c["quotes"]:
                try:
                    testo = norm_text(page_text(src))
                    for q in c["quotes"]:
                        if norm_text(q["text"]).rstrip(".,") not in testo:
                            errori.append(f"{nome}: citazione non trovata alla lettera nella fonte: “{q['text'][:60]}…”")
                except Exception as e:
                    avvisi.append(f"{nome}: impossibile verificare le citazioni ({e})")
            time.sleep(1)

    FILE.write_text(json.dumps(data, ensure_ascii=False, indent=1) + "\n")
    for a in avvisi:
        print("  avviso:", a)
    for e in errori:
        print("  ERRORE:", e)
    conta = {s: sum(c["section"] == s for c in data["cards"]) for s in ("sapevi", "novita")}
    print(f"{len(data['cards'])} schede ({conta['sapevi']} Lo sapevi?, {conta['novita']} Ricerca recente) · {len(errori)} errori · {len(avvisi)} avvisi")
    sys.exit(1 if errori else 0)


if __name__ == "__main__":
    main()
