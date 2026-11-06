# Cerca video in italiano su YouTube (hl=it). Uso: python3 -I video_it_cerca.py <domande.json>
# domande.json = {"id-argomento": ["ricerca 1", "ricerca 2"]}. I risultati finiscono in <cartella superiore>/it/cache.json
import json, re, sys, time, urllib.request, urllib.parse, os, concurrent.futures as cf
S = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CACHE = os.path.join(S, 'it', 'cache.json')
cache = json.load(open(CACHE)) if os.path.exists(CACHE) else {}
def txt(x):
    if not x: return ''
    if 'simpleText' in x: return x['simpleText']
    return ''.join(r.get('text', '') for r in x.get('runs', []))
def search(q):
    if q in cache: return cache[q]
    u = "https://www.youtube.com/results?hl=it&gl=IT&search_query=" + urllib.parse.quote(q)
    for a in range(3):
        try:
            h = urllib.request.urlopen(urllib.request.Request(u, headers={"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36", "Accept-Language": "it-IT,it;q=0.9"}), timeout=30).read().decode()
            d = json.loads(re.search(r"var ytInitialData = (\{.*?\});</script>", h).group(1)); break
        except Exception as e:
            time.sleep(3 + a * 5)
    else:
        return None
    out = []
    def walk(o):
        if isinstance(o, dict):
            if "videoRenderer" in o:
                v = o["videoRenderer"]
                out.append({"id": v["videoId"], "title": txt(v.get("title")), "channel": txt(v.get("ownerText")),
                    "chid": (v.get("ownerText", {}).get("runs", [{}])[0].get("navigationEndpoint", {}).get("browseEndpoint", {}).get("browseId", "")),
                    "length": txt(v.get("lengthText")), "views": txt(v.get("viewCountText")), "age": txt(v.get("publishedTimeText")),
                    "desc": "".join(txt(s.get("snippetText")) for s in v.get("detailedMetadataSnippets", []))[:200]})
                return
            for x in o.values(): walk(x)
        elif isinstance(o, list):
            for x in o: walk(x)
    walk(d)
    cache[q] = out[:15]
    return cache[q]
if __name__ == '__main__':
    qs = json.load(open(sys.argv[1]))
    todo = sorted({q for v in qs.values() for q in v} - set(cache))
    print(len(todo), 'ricerche')
    with cf.ThreadPoolExecutor(4) as ex:
        for i, _ in enumerate(ex.map(search, todo)):
            if i % 40 == 0:
                json.dump(cache, open(CACHE, 'w'), ensure_ascii=False); print(i, flush=True)
    json.dump(cache, open(CACHE, 'w'), ensure_ascii=False)
    print('fatto', sum(1 for q in todo if cache.get(q) is None), 'falliti')
