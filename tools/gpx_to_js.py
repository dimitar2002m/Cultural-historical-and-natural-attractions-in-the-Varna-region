#!/usr/bin/env python3
"""Събира всички .gpx файлове от папка gpx/ в data/_3.js (GeoJSON за картата).
Употреба:  python3 tools/gpx_to_js.py          (от главната папка на картата)
Ако дадена
следа е изцяло извън областта, тя се пропуска."""
import glob, json, math, os, re, xml.etree.ElementTree as ET
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
b = open(os.path.join(root, 'data/_boundary.js'), encoding='utf8').read()
ring = json.loads(b[b.index('=')+1:].strip().rstrip(';'))['geometry']['coordinates'][0]
def inside(x, y):
    r = False; j = len(ring)-1
    for i in range(len(ring)):
        xi, yi = ring[i]; xj, yj = ring[j]
        if (yi > y) != (yj > y) and x < (xj-xi)*(y-yi)/(yj-yi)+xi: r = not r
        j = i
    return r
def km(a, b_):
    R = 6371; p1, p2 = math.radians(a[1]), math.radians(b_[1])
    dp = p2-p1; dl = math.radians(b_[0]-a[0])
    h = math.sin(dp/2)**2+math.cos(p1)*math.cos(p2)*math.sin(dl/2)**2
    return 2*R*math.asin(math.sqrt(h))
def simplify(pts, step=0.00002):  # ~2 м, само махаме почти еднакви точки
    out = [pts[0]]
    for p in pts[1:]:
        if abs(p[0]-out[-1][0]) > step or abs(p[1]-out[-1][1]) > step: out.append(p)
    return out
feats = []
for fn in sorted(glob.glob(os.path.join(root, 'gpx', '*.gpx'))):
    t = ET.parse(fn).getroot()
    strip = lambda e: e.tag.split('}')[-1]
    lines = []
    for el in t.iter():
        if strip(el) in ('trkseg', 'rte'):
            pts = [[float(p.get('lon')), float(p.get('lat'))] for p in el if strip(p) in ('trkpt', 'rtept')]
            if len(pts) > 1: lines.append(simplify([[round(x,5), round(y,5)] for x, y in pts]))
    if not lines: print('пропуснат (няма линии):', fn); continue
    if not any(inside(*p) for l in lines for p in l[::10]): print('извън област Варна:', os.path.basename(fn)); continue
    name = os.path.splitext(os.path.basename(fn))[0]
    nm = t.find('.//{*}trk/{*}name')
    if nm is None: nm = t.find('.//{*}metadata/{*}name')
    title = (nm.text.strip() if nm is not None and nm.text else name.replace('_', ' '))
    L = sum(km(l[i], l[i+1]) for l in lines for i in range(len(l)-1))
    feats.append({"type":"Feature","properties":{"Име":title,"Дължина_км":round(L,1),"Източник":"varnamaps.eu"},
                  "geometry":{"type":"MultiLineString","coordinates":lines}})
open(os.path.join(root, 'data/_3.js'), 'w', encoding='utf8').write(
    'var json__3 = ' + json.dumps({"type":"FeatureCollection","name":"Туристически маршрути","features":feats}, ensure_ascii=False) + ';')
print('Записани маршрути:', len(feats))
