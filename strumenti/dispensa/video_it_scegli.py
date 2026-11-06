# Propone i migliori candidati italiani per ogni argomento (canali affidabili, durata, pertinenza).
# Uso: python3 -I video_it_scegli.py data/argomenti.json  (legge it/cache.json e it/queries.json). La scelta finale va fatta a mano.
import json, re, sys, os, unicodedata
S = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
A = {"MEDIAINAF TV","EDU INAF","AsiTV","INFN LNF - Laboratori Nazionali di Frascati","INFN - Istituto Nazionale di Fisica Nucleare","Polimi OpenKnowledge","Zanichelli editore","HUB Scuola","Amedeo Balbi","Luca Perri","link4universe","Gabriele Ghisellini","Marco Casolino","La Fisica Che Ci Piace","Geopop","Veritasium in Italiano","Sprouts Italia","Dott. Valerio Rosso","Psicologia - Luca Mazzucchelli","PSYCHIATRY ON LINE ITALIA - VIDEOCHANNEL","Random Physics","Pepite di Scienza","CURIUSS","SAIt - Società Astronomica Italiana","Luca Nardi","AstroViktor","INAF - Osservatorio Astronomico di Palermo G.S. Vaiana","European Space Agency, ESA","Rai Scuola","Rai Cultura","Federica WebLearning","Treccani"}
B = {"Step by Step - Fisica e Mate","Fisica Fast [Elia Rampi]","Valerio Pattaro - Fisica Matematica Logica","The Blackboard","La Biologia per tutti","Laura Pirotta","Antonio Loiacono","Francesco Bigolin","Alessandro Fanello","DIDATTICAMENTE","Edulia dal sapere Treccani","Maledetta Fisica","Simone Casadei - Il Prof. di Fisica","Rai"}
STOP = set("il lo la i gli le un uno una di a da in con su per tra fra e o che come cosa perche non del della dello dei degli delle al alla allo ai agli alle dal dalla dai nel nella nei nelle sul sulla sui è si ci ne sono piu più tutto fisica psicologia astronomia quando dove cos cosa davvero".split())
def norm(s): return unicodedata.normalize('NFD', s.lower()).encode('ascii','ignore').decode()
def toks(s): return {w[:6] for w in re.findall(r"[a-z0-9]+", norm(s)) if len(w) > 2 and w not in STOP}
def secs(l):
    p = [int(x) for x in l.split(':')] if re.fullmatch(r"[\d:]+", l or '') else []
    return sum(x * 60 ** i for i, x in enumerate(reversed(p))) if p else 0
def views(v): 
    m = re.match(r"([\d\.]+)", v or ''); return int(m.group(1).replace('.', '')) if m else 0
cache = json.load(open(os.path.join(S, 'it', 'cache.json')))
qs = json.load(open(os.path.join(S, 'it', 'queries.json')))
d = json.load(open(sys.argv[1]))
out = {}
for t in d['topics']:
    key = toks(t['title'].split(':')[0]) | set().union(*[toks(x['t']) for x in t['terms'][:4]])
    core = toks(t['title'].split(':')[0])
    seen = {}
    for q in qs[t['id']] + [q for q in cache if q.startswith(t['id'] + '::')]:
        for r, v in enumerate(cache.get(q) or []):
            ch = v['channel']; tier = 2 if ch in A else 1 if ch in B else 0
            if not tier or v['id'] in seen: continue
            s = secs(v['length']); vw = views(v['views'])
            if s < 150 or s > 4200: continue
            if ch == 'Rai' and 'superquark' not in norm(v['title']): continue
            vt = toks(v['title'] + ' ' + v.get('desc', ''))
            rel = len(key & toks(v['title'])) * 2 + len(key & vt) + (3 if core and len(core & toks(v['title'])) >= max(1, len(core) // 2) else 0)
            if rel < 3: continue
            score = rel + tier * 2 + min(vw, 300000) / 100000 - r * 0.15
            seen[v['id']] = dict(v, score=round(score, 1), rel=rel, tier=tier)
    out[t['id']] = sorted(seen.values(), key=lambda x: -x['score'])[:3]
json.dump(out, open(os.path.join(S, 'it', 'cands.json'), 'w'), ensure_ascii=False, indent=1)
for t in d['topics']:
    c = out[t['id']]
    print(f"{t['id']} | {t['title'][:60]}")
    for v in c: print(f"    {v['score']:5} {v['id']} {v['title'][:70]} | {v['channel'][:22]} | {v['length']} | {v['views'].split(' ')[0]}")
print('con candidati:', sum(1 for v in out.values() if v), '/', len(out))
