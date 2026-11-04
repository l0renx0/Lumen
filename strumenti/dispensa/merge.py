"""Unisce un blocco scritto ai dati: python3 -I merge.py b01 [b02 ...]"""
import json, re, sys, os, html, unicodedata, datetime, importlib
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
sys.path.insert(0, HERE)
REPO = "/Users/lorenzodevicienti/Desktop/Lumen 2.0"
CH = {"fisica": ["Metodo e misure", "Meccanica", "Statica e rotazioni", "Fluidi", "Termodinamica", "Onde e suono", "Elettricità e magnetismo", "Luce e ottica", "Fisica moderna", "Fisica nucleare e particelle", "Frontiere della fisica"],
      "psicologia": ["La psicologia", "Cervello e biologia", "Sensi e percezione", "Apprendimento", "Memoria e pensiero", "Sviluppo", "Emozioni e motivazione", "Personalità", "Psicologia sociale", "Lavoro e organizzazioni", "Salute e benessere", "Disturbi psicologici", "Terapie"],
      "astronomia": ["Le basi", "Terra, Luna e cielo", "Pianeti e orbite", "Luce e strumenti", "Sistema solare", "Stelle", "Galassie e cosmo", "Vita nell'universo"]}
MOVE = {"marte-acqua": "Sistema solare", "lune-giove": "Sistema solare"}
BOOK = {"college-physics-2e": "College Physics 2e", "psychology-2e": "Psychology 2e", "astronomy-2e": "Astronomy 2e"}
EXTRA = {"entropia": ("college-physics-2e/15-7-statistical-interpretation-of-entropy-and-the-second-law-of-thermodynamics-the-underlying-explanation", "15.7 Statistical Interpretation of Entropy"),
         "rinforzo": ("psychology-2e/6-1-what-is-learning", "6.1 What Is Learning?")}


def norm(t):
    t = unicodedata.normalize("NFKC", html.unescape(t)); t = re.sub(r"[‘’']", "'", t); t = re.sub(r'[“”"«»]', '"', t)
    return re.sub(r"\s+", " ", t).strip().lower()


def nice_title(t):
    n, rest = t.split(" ", 1)
    return n + " " + rest[0].upper() + rest[1:]


def key(t):
    m = re.search(r"/pages/(\d+)-(\d+)-", t["sources"][0]["url"])
    return (list(CH).index(t["subject"]), int(m[1]), int(m[2])) if m else (list(CH).index(t["subject"]), 999, 0)


def main():
    data = json.load(open(REPO + "/data/argomenti.json"))
    have = {t["id"] for t in data["topics"]}
    now = datetime.datetime.now(datetime.timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")
    errors, added = [], 0
    for mod in sys.argv[1:]:
        M = importlib.import_module(mod)
        for w in M.T:
            pr = json.load(open(os.path.join(ROOT, "prep", w["id"] + ".json")))
            srcs = [{"name": "OpenStax · " + BOOK[s["url"].split("/books/")[1].split("/")[0]], "title": nice_title(s["title"]), "url": s["url"]} for s in pr["sources"]]
            vids = pr["videos"] if w.get("keep") is None else [pr["videos"][i] for i in w["keep"]]
            vids = vids + w.get("addvideos", [])
            t = {"id": w["id"], "subject": pr["subject"], "chapter": pr["chapter"], "title": w["title"], "hook": w["hook"], "points": w["points"],
                 "sections": [{"h": h, "p": p} for h, p in w["sections"]], "formulas": [{"f": a, "d": b} for a, b in w.get("formulas", [])],
                 "example": w["example"], "mistakes": w["mistakes"], "terms": [{"t": a, "d": b} for a, b in w["terms"]],
                 "quote": {"text": w["quote"], "translation": w["tr"]}, "sources": srcs, "videos": vids, "videoQuery": pr["videoQuery"], "addedAt": now}
            # la citazione deve essere nel testo della prima fonte
            found = None
            for i, s in enumerate(srcs):
                txt = open(os.path.join(ROOT, "os", s["url"].split("/books/")[1].replace("/pages/", "_") + ".txt")).read()
                if norm(w["quote"]).rstrip(".") in norm(txt): found = i; break
            if found is None: errors.append(f"{w['id']}: citazione non trovata")
            elif found: srcs.insert(0, srcs.pop(found)); t["sources"] = srcs
            if len(w["hook"]) > 185: errors.append(f"{w['id']}: hook lungo {len(w['hook'])}")
            if not vids: print("  (nessun video)", w["id"])
            if t["id"] in have:
                data["topics"] = [x for x in data["topics"] if x["id"] != t["id"]]
            data["topics"].append(t); have.add(t["id"]); added += 1
    if errors:
        print("\n".join(errors)); sys.exit(1)
    for t in data["topics"]:
        if t["id"] in MOVE: t["chapter"] = MOVE[t["id"]]
        if t["id"] in EXTRA and not any(EXTRA[t["id"]][0] in s["url"] for s in t["sources"]):
            p, title = EXTRA[t["id"]]
            t["sources"].append({"name": "OpenStax · " + BOOK[p.split("/")[0]], "title": title, "url": "https://openstax.org/books/" + p.replace("/", "/pages/", 1)})
    for s in data["subjects"]:
        s["chapters"] = CH[s["id"]]
    bad = [t["id"] for t in data["topics"] if t["chapter"] not in CH[t["subject"]]]
    if bad: print("capitolo non valido:", bad); sys.exit(1)
    data["topics"].sort(key=key)
    data["updatedAt"] = now
    open(REPO + "/data/argomenti.json", "w").write(json.dumps(data, ensure_ascii=False, indent=1) + "\n")
    open(REPO + "/data/meta.json", "w").write(json.dumps({"updatedAt": now, "count": len(data["topics"])}) + "\n")
    ind = json.load(open(REPO + "/strumenti/indice_dispensa.json"))
    cover = {}
    for t in data["topics"]:
        for s in t["sources"]: cover.setdefault(s["url"], set()).add(t["id"])
    tot = cov = 0
    for m in ind["materie"].values():
        for c in m["capitoli"]:
            for sec in c["sections"]:
                sec["argomenti"] = sorted(cover.get(sec["url"], [])); tot += 1; cov += bool(sec["argomenti"])
    open(REPO + "/strumenti/indice_dispensa.json", "w").write(json.dumps(ind, ensure_ascii=False, indent=1) + "\n")
    from collections import Counter
    print(f"+{added} · totale {len(data['topics'])} {dict(Counter(t['subject'] for t in data['topics']))} · sezioni coperte {cov}/{tot}")


main()
