"""Prepara un blocco: python3 -I prep.py <da> <a>   (indici nel piano)
Scarica i testi delle sezioni, propone citazioni, cerca e verifica video. Salva prep/<id>.json"""
import json, re, sys, os, subprocess, urllib.request, urllib.parse, html, time
from concurrent.futures import ThreadPoolExecutor
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
sys.path.insert(0, HERE)
from plan import P
REPO = "/Users/lorenzodevicienti/Desktop/Lumen 2.0"
IND = json.load(open(REPO + "/strumenti/indice_dispensa.json"))
BOOKKEY = {"fisica": "fisica", "psicologia": "psicologia", "astronomia": "astronomia"}
UA = {"User-Agent": "Mozilla/5.0", "Accept-Language": "en"}
TRUSTED = ["CrashCourse", "Khan Academy", "TED-Ed", "TED", "Kurzgesagt", "minutephysics", "PBS Space Time", "SciShow", "Veritasium",
           "NASA", "European Space Agency", "ESA", "National Geographic", "Sprouts", "Professor Dave Explains", "Physics Girl",
           "The Royal Institution", "MIT OpenCourseWare", "BBC", "Smithsonian", "California Academy of Sciences", "FuseSchool",
           "The Efficient Engineer", "Steve Mould", "Sixty Symbols", "Fermilab", "CERN", "ScienceClic English", "Science ABC",
           "Cognito", "NASA Goddard", "NASA Jet Propulsion Laboratory", "Neuro Transmissions", "Amoeba Sisters", "Tyler DeWitt",
           "World Science Festival", "Big Think", "PBS", "BrainCraft", "Harvard", "Yale", "Stanford", "Scientific American",
           "Astrum", "Launch Pad Astronomy", "Dr. Becky", "Primer", "Domain of Science", "Practical Engineering", "AlphaPhoenix",
           "3Blue1Brown", "Simple History", "Psych2Go"]
BAD_CH = {"Psych2Go", "Simple History", "Astrum", "Science ABC"}  # solo come ripiego


def section_url(subject, num):
    for c in IND["materie"][subject]["capitoli"]:
        for s in c["sections"]:
            if s["title"].split(" ", 1)[0] == num:
                return s["url"], s["title"]
    raise KeyError(subject + " " + num)


def get(url, binary=False):
    req = urllib.request.Request(url, headers=UA)
    for i in range(3):
        try:
            with urllib.request.urlopen(req, timeout=40) as r:
                b = r.read()
                return b if binary else b.decode("utf-8", "replace")
        except Exception as e:
            err = e; time.sleep(2)
    raise err


def text_of(url):
    path = os.path.join(ROOT, "os", url.split("/books/")[1].replace("/pages/", "_") + ".txt")
    if os.path.exists(path):
        return open(path).read()
    h = get(url)
    m = re.search(r'(?s)<div[^>]*data-type="page".*', h); h = m.group(0) if m else h
    h = re.sub(r"(?is)<(script|style)[^>]*>.*?</\1>", " ", h)
    h = re.sub(r"(?i)</(p|li|h\d|div|figcaption)>", "\n", h)
    t = html.unescape(re.sub(r"<[^>]+>", "", h)); t = re.sub(r"[ \t]+", " ", t); t = re.sub(r"\n\s*\n+", "\n", t)
    open(path, "w").write(t)
    return t


ART = re.compile(r"(?<![A-Za-z])(\S{1,6})\1(?![A-Za-z])")
def candidates(t):
    t = re.sub(r"\s+", " ", t)
    sents = re.split(r"(?<=[.!?])\s+(?=[A-Z])", t)
    out = []
    for s in sents:
        if not (60 < len(s) < 230): continue
        if re.search(r"Figure|Table|Link to Learning|credit|Learning Objectives|Example|Check Your|Solution|Strategy|=|\(\w+ & |et al|\d{4}\)|see |Section|Chapter|Appendix", s): continue
        if ART.search(s) or not s.rstrip().endswith("."): continue
        if re.search(r"\b(is|are|was|were|means|called|refers|describes|can|shows)\b", s): out.append(s.strip())
    # preferisci frasi che definiscono
    out.sort(key=lambda s: (0 if re.search(r"\b(is called|is defined|refers to|is the|are the|we call)\b", s) else 1, len(s)))
    return out[:4]


def yt(q):
    u = "https://www.youtube.com/results?hl=en&search_query=" + urllib.parse.quote(q)
    h = get(u)
    m = re.search(r"var ytInitialData = (\{.*?\});</script>", h)
    if not m: return []
    d = json.loads(m.group(1)); out = []
    def walk(o):
        if isinstance(o, dict):
            if "videoRenderer" in o:
                v = o["videoRenderer"]
                try: out.append((v["videoId"], "".join(r["text"] for r in v["title"]["runs"]), v.get("ownerText", {}).get("runs", [{}])[0].get("text", "?"), v.get("lengthText", {}).get("simpleText", "?")))
                except Exception: pass
            for x in o.values(): walk(x)
        elif isinstance(o, list):
            for x in o: walk(x)
    walk(d); return out


def trusted(ch):
    return any(ch == t or ch.startswith(t) for t in TRUSTED)


def length_ok(l):
    p = l.split(":")
    if len(p) == 3: return False
    try: return 1 <= int(p[0]) <= 30
    except Exception: return False


def oembed(i):
    try:
        get(f"https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v={i}&format=json"); return True
    except Exception: return False


def prep(entry, used):
    subject, id, ch, secs, q = entry
    srcs = [section_url(subject, n) for n in secs]
    texts = [text_of(u) for u, _ in srcs]
    cands = candidates(texts[0])
    vids = []
    try:
        res = yt(q)
        good = [r for r in res if trusted(r[2]) and length_ok(r[3]) and r[0] not in used]
        good.sort(key=lambda r: (r[2] in BAD_CH,))
        for r in good:
            if len(vids) == 2: break
            if oembed(r[0]): vids.append({"id": r[0], "title": r[1], "channel": r[2], "length": r[3]})
    except Exception as e:
        print("video err", id, e)
    data = {"subject": subject, "id": id, "chapter": ch, "sources": [{"url": u, "title": t} for u, t in srcs], "videos": vids, "videoQuery": q, "cands": cands,
            "words": sum(len(x.split()) for x in texts)}
    os.makedirs(os.path.join(ROOT, "prep"), exist_ok=True)
    json.dump(data, open(os.path.join(ROOT, "prep", id + ".json"), "w"), ensure_ascii=False, indent=1)
    return data


if __name__ == "__main__":
    a, b = int(sys.argv[1]), int(sys.argv[2])
    used = set()
    for fn in os.listdir(os.path.join(ROOT, "prep")) if os.path.isdir(os.path.join(ROOT, "prep")) else []:
        for v in json.load(open(os.path.join(ROOT, "prep", fn)))["videos"]: used.add(v["id"])
    data = json.load(open(REPO + "/data/argomenti.json"))
    for t in data["topics"]:
        for v in t["videos"]: used.add(v["id"])
    with ThreadPoolExecutor(6) as ex:
        res = list(ex.map(lambda e: prep(e, used), P[a:b]))
    for d in res:
        print(f"\n### {d['id']} [{d['chapter']}] " + " + ".join(s["title"] for s in d["sources"]))
        for v in d["videos"]: print(f"   ▶ {v['channel']} | {v['title'][:70]} | {v['length']}")
        for c in d["cands"]: print("   «", c)
