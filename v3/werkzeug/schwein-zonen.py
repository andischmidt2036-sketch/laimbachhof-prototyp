#!/usr/bin/env python3
"""
Schweinebild austauschen – ohne Umbau der Seite.

Aufruf (aus dem Ordner v2/):
    python3 werkzeug/schwein-zonen.py NEUES-BILD.png [--kopf-rechts] [--duoton]

NEUES-BILD.png muss freigestellt sein (transparenter Hintergrund), Schwein in
Seitenansicht. Freistellen geht z. B. auf ft-bau:
    ~/venv-rembg/bin/rembg i -m isnet-general-use foto.jpg foto-frei.png

Das Skript schreibt nach bilder/:
    schwein.webp, schwein.png      das Bild (1400 px breit, auf das Tier zugeschnitten)
    schwein-zonen.json             Klickzonen je Teilstück (Polygone in Bildpixeln) + Pin-Punkte
    schwein-bild.js                dasselbe als  window.SCHWEIN_BILD = {...}  zum Einbinden per <script>
    schwein-zonen-kontrolle.jpg    Kontrollbild: alle Zonen farbig über dem Tier (nicht ausliefern)

Wie die Zonen entstehen: Jeder Pixel der Silhouette wird nach festen Regeln
einem Teilstück zugeordnet. Die Regeln sind für ein Referenzschwein geschrieben
(Rahmen 1385×735 px) und werden auf den Rahmen des neuen Tiers umgerechnet.
Passt eine Grenze nicht, die Zahlen in zone() anpassen und neu laufen lassen.
Feinschliff von Hand: schwein-zonen.json direkt bearbeiten.
"""
import sys, json, math, os
from PIL import Image, ImageDraw, ImageOps, ImageFilter

# Rahmen (x0, y0, x1, y1) des Referenzschweins, für das die Regeln unten gelten
REF = (0, 28, 1385, 763)
BREITE = 1400
TEILE = ['kopf','nacken','schulter','ruecken','filet','wurst','bauch','schinken','haxe-vorne','haxe-hinten']

args = [a for a in sys.argv[1:] if not a.startswith('--')]
if not args:
    print(__doc__); sys.exit(1)
quelle = args[0]
ziel = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'bilder')

# ---------- Bild vorbereiten ----------
img = Image.open(quelle).convert('RGBA')
if '--kopf-rechts' in sys.argv:
    img = ImageOps.mirror(img)          # die Seite erwartet den Kopf links
rahmen = img.getchannel('A').point(lambda v: 255 if v > 128 else 0).getbbox()
if not rahmen:
    sys.exit('Kein freigestelltes Tier gefunden (Alphakanal leer).')
rand = 20
img = img.crop((max(0, rahmen[0]-rand), max(0, rahmen[1]-rand),
                min(img.width, rahmen[2]+rand), min(img.height, rahmen[3]+rand)))
img = img.resize((BREITE, round(img.height * BREITE / img.width)), Image.LANCZOS)
if '--duoton' in sys.argv:
    # nur für alte, körnige Vorlagen: Raster glätten, dunkles Duoton
    a = img.getchannel('A')
    g = img.convert('L').filter(ImageFilter.MedianFilter(5)).filter(ImageFilter.GaussianBlur(2.2))
    g = ImageOps.autocontrast(g, cutoff=0.5).point(lambda v: int(255 * ((v/255) ** 1.6)))
    g = g.filter(ImageFilter.UnsharpMask(radius=6, percent=70, threshold=1))
    img = ImageOps.colorize(g, black=(8,9,8), mid=(40,40,37), white=(150,142,130))
    img.putalpha(a)
W, H = img.size
A = img.getchannel('A').load()
neu = img.getchannel('A').point(lambda v: 255 if v > 128 else 0).getbbox()

def auf_referenz(x, y):
    """Punkt im neuen Bild -> Punkt im Rahmen des Referenzschweins."""
    rx = REF[0] + (x - neu[0]) / (neu[2] - neu[0]) * (REF[2] - REF[0])
    ry = REF[1] + (y - neu[1]) / (neu[3] - neu[1]) * (REF[3] - REF[1])
    return rx, ry

# ---------- Regeln (Koordinaten im Referenzrahmen) ----------
def zone(x,y):
    # Grenzlinien leicht geschwungen, damit die Zonen nicht wie Kästchen wirken
    if x < 300 + (y-110)*0.07 + 18*math.sin(max(0,min(1,(y-110)/460))*math.pi): return 'kopf'
    b1 = 560 + (y-40)*0.04 + 22*math.sin(max(0,min(1,(y-40)/560))*math.pi)
    b2 = 1015 - (y-30)*0.06 - 28*math.sin(max(0,min(1,(y-30)/600))*math.pi)
    if x < b1:
        if y > 572 + (x-430)*0.04: return 'haxe-vorne'
        return 'nacken' if y < 250 + (x-300)*0.04 - 14*math.sin(max(0,min(1,(x-300)/260))*math.pi) else 'schulter'
    if x > b2:
        return 'haxe-hinten' if y > 612 else 'schinken'
    t = max(0, min(1, (x-560)/460))
    if y < 238 + 16*math.sin(t*math.pi): return 'ruecken'
    if y < 312 + 16*math.sin(t*math.pi): return 'filet' if x > 690 + (y-240)*0.4 else 'wurst'
    if y < 412 + 18*math.sin(t*math.pi): return 'wurst'
    return 'bauch'

def kontur(lab):
    # Moore-Nachbarschaft: Start = erste Zelle der Zone (oben links)
    zellen=[(gx,gy) for gy in range(GH) for gx in range(GW) if gitter[gy][gx]==lab]
    # größte zusammenhängende Komponente
    rest=set(zellen); best=[]
    while rest:
        s=rest.pop(); comp=[s]; st=[s]
        while st:
            cx,cy=st.pop()
            for dx,dy in((1,0),(-1,0),(0,1),(0,-1)):
                n=(cx+dx,cy+dy)
                if n in rest: rest.remove(n); comp.append(n); st.append(n)
        if len(comp)>len(best): best=comp
    menge=set(best)
    start=min(best,key=lambda c:(c[1],c[0]))
    rich=[(1,0),(1,1),(0,1),(-1,1),(-1,0),(-1,-1),(0,-1),(1,-1)]
    pfad=[start]; cur=start; d=6
    for _ in range(200000):
        for i in range(8):
            k=(d+i)%8; n=(cur[0]+rich[k][0],cur[1]+rich[k][1])
            if n in menge:
                cur=n; d=(k+5)%8; break
        else: break
        if cur==start: break
        pfad.append(cur)
    return pfad, best

def rdp(p,eps):
    if len(p)<3: return p
    a,b=p[0],p[-1]; dm=0; im=0
    for i in range(1,len(p)-1):
        x,y=p[i]
        num=abs((b[1]-a[1])*x-(b[0]-a[0])*y+b[0]*a[1]-b[1]*a[0]); den=math.hypot(b[0]-a[0],b[1]-a[1]) or 1
        dd=num/den
        if dd>dm: dm=dd; im=i
    if dm>eps: return rdp(p[:im+1],eps)[:-1]+rdp(p[im:],eps)
    return [a,b]


S = 1   # Rastergröße in Pixeln (1 = keine sichtbaren Fugen zwischen den Zonen)
GW, GH = W // S, H // S
gitter = [[None] * GW for _ in range(GH)]
for gy in range(GH):
    for gx in range(GW):
        x, y = gx * S + S // 2, gy * S + S // 2
        if A[x, y] > 110:
            gitter[gy][gx] = zone(*auf_referenz(x, y))

def rdp(p, eps):
    """Linie vereinfachen (Ramer-Douglas-Peucker)."""
    if len(p) < 3: return p
    a, b = p[0], p[-1]; dm = 0; im = 0
    den = math.hypot(b[0]-a[0], b[1]-a[1]) or 1
    for i in range(1, len(p)-1):
        x, y = p[i]
        dd = abs((b[1]-a[1])*x - (b[0]-a[0])*y + b[0]*a[1] - b[1]*a[0]) / den
        if dd > dm: dm = dd; im = i
    if dm > eps: return rdp(p[:im+1], eps)[:-1] + rdp(p[im:], eps)
    return [a, b]

zonen = {}; pins = {}
for lab in TEILE:
    pfad, zellen = kontur(lab)
    pts = [(gx*S + S//2, gy*S + S//2) for gx, gy in pfad]
    f = max(range(len(pts)), key=lambda i: (pts[i][0]-pts[0][0])**2 + (pts[i][1]-pts[0][1])**2)
    pts = rdp(pts[:f+1], 1.5)[:-1] + rdp(pts[f:] + [pts[0]], 1.5)[:-1]
    zonen[lab] = ' '.join(f'{x},{y}' for x, y in pts)
    pins[lab] = [round(sum(c[0] for c in zellen) / len(zellen) * S), round(sum(c[1] for c in zellen) / len(zellen) * S)]

daten = {'datei': 'bilder/schwein.webp', 'breite': W, 'hoehe': H, 'zonen': zonen, 'pins': pins}
img.save(os.path.join(ziel, 'schwein.png'), optimize=True)
img.save(os.path.join(ziel, 'schwein.webp'), quality=88, method=6)
json.dump(daten, open(os.path.join(ziel, 'schwein-zonen.json'), 'w'), ensure_ascii=False, indent=1)
open(os.path.join(ziel, 'schwein-bild.js'), 'w').write(
    '// Erzeugt von werkzeug/schwein-zonen.py – Bild + Klickzonen, austauschbar\n'
    'window.SCHWEIN_BILD = ' + json.dumps(daten, ensure_ascii=False) + ';\n')

# ---------- Kontrollbild ----------
farben = ['#e06c4f','#e0a84f','#c9d14f','#6fd14f','#4fd1b5','#4f9ed1','#6a4fd1','#c44fd1','#d14f86','#ffffff']
bg = Image.new('RGBA', (W, H), (34, 38, 32, 255)); bg.alpha_composite(img)
ov = Image.new('RGBA', (W, H), (0, 0, 0, 0)); dr = ImageDraw.Draw(ov)
for lab, c in zip(TEILE, farben):
    r, g, b = int(c[1:3], 16), int(c[3:5], 16), int(c[5:7], 16)
    dr.polygon([tuple(map(int, p.split(','))) for p in zonen[lab].split()], fill=(r,g,b,70), outline=(r,g,b,255))
    dr.text(tuple(pins[lab]), lab, fill=(255, 255, 255, 255))
bg.alpha_composite(ov)
bg.convert('RGB').resize((1000, round(1000 * H / W))).save(os.path.join(ziel, 'schwein-zonen-kontrolle.jpg'), quality=85)
print(f'fertig: {W}×{H}, {len(zonen)} Zonen -> {os.path.normpath(ziel)}')
