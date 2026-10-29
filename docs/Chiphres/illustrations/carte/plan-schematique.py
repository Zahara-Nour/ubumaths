# Plan schématique de la carte du Royaume (validé par David le 2026-10-29).
# Usage : python3 plan-schematique.py plan-schematique.svg [--sans-texte]
# Couleurs des provinces : lignes « Pour l'illustration » du Compendium (2026-10-29).
# --sans-texte : même plan sans aucun texte, pour servir de référence à l'IA (qui recopie les lettres).
# Rendu PNG : Chromium de Playwright (viewport 1100×860, deviceScaleFactor 2) ; magick ne trouve pas les polices.
import math, random, re, sys

W, H = 1100, 860
INK = '#1B2232'
PAPER = '#F1EDE4'
K = 120
COS = math.cos(math.radians(52))


def mix(c, t, base=PAPER):
    a = [int(c[i:i + 2], 16) for i in (1, 3, 5)]
    b = [int(base[i:i + 2], 16) for i in (1, 3, 5)]
    return '#' + ''.join(f'{round(b[i] + (a[i] - b[i]) * t):02X}' for i in range(3))


def geo(lon, lat):
    return (60 + (lon - 14) * COS * K, 50 + (55.2 - lat) * K)


# contour approximatif de la Pologne réelle (lon, lat), dans le sens des aiguilles d'une montre
COAST = [(14.22, 53.92), (14.6, 54.0), (15.6, 54.18), (16.4, 54.43), (16.85, 54.59), (17.55, 54.76),
         (18.33, 54.83), (18.55, 54.6), (18.6, 54.42), (19.0, 54.35), (19.6, 54.45)]
LAND = [(20.5, 54.38), (21.5, 54.33), (22.8, 54.36), (23.5, 54.0), (23.9, 53.75), (23.9, 53.15),
        (23.55, 52.6), (23.2, 52.3), (23.65, 52.05), (23.65, 51.6), (24.1, 51.0), (24.0, 50.6),
        (23.6, 50.4), (23.0, 50.2), (22.6, 49.55), (22.85, 49.05), (22.55, 49.08), (22.0, 49.2),
        (21.0, 49.4), (20.1, 49.2), (19.5, 49.6), (18.85, 49.5), (18.6, 49.9), (17.9, 50.0),
        (17.2, 50.35), (16.85, 50.2), (16.6, 50.1), (16.4, 50.4), (16.2, 50.65), (15.5, 50.8),
        (14.83, 50.87), (14.95, 51.4), (14.7, 51.55), (14.75, 52.05), (14.55, 52.6), (14.15, 52.85),
        (14.4, 53.3), (14.25, 53.7)]
POLAND = [geo(*p) for p in COAST + LAND]
CX, CY = geo(21.0, 52.23)  # Sandomir = Varsovie


def pt(a, r):
    return (CX + r * math.sin(math.radians(a)), CY - r * math.cos(math.radians(a)))


def border(a):
    # frontière irrégulière : le rayon issu de Sandomir, décalé perpendiculairement par une somme de sinus
    rnd = random.Random((int(a) % 360) * 7919)
    waves = [(rnd.uniform(0.012, 0.02), rnd.uniform(0, 6.28), 9), (rnd.uniform(0.03, 0.05), rnd.uniform(0, 6.28), 5),
             (rnd.uniform(0.08, 0.12), rnd.uniform(0, 6.28), 2.5)]
    ux, uy = math.sin(math.radians(a)), -math.cos(math.radians(a))
    pts = []
    r = 0.0
    while r <= 1200:
        damp = min(1.0, max(0.0, (r - 30) / 50))
        off = damp * sum(amp * math.sin(f * r + ph) for f, ph, amp in waves)
        pts.append((CX + r * ux - off * uy, CY + r * uy + off * ux))
        r += 6
    return pts


def path(pts, close=False):
    return 'M' + ' L'.join(f'{x:.1f},{y:.1f}' for x, y in pts) + (' Z' if close else '')


def smooth(pts):
    # Catmull-Rom → Bézier
    d = f'M{pts[0][0]:.1f},{pts[0][1]:.1f}'
    for i in range(len(pts) - 1):
        p0 = pts[i - 1] if i > 0 else pts[i]
        p1, p2 = pts[i], pts[i + 1]
        p3 = pts[i + 2] if i + 2 < len(pts) else p2
        c1 = (p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6)
        c2 = (p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6)
        d += f' C{c1[0]:.1f},{c1[1]:.1f} {c2[0]:.1f},{c2[1]:.1f} {p2[0]:.1f},{p2[1]:.1f}'
    return d


SEA = mix('#2F62B0', .40)
RIVER = mix('#2F62B0', .85)
# (nom, secteur (angle début, angle fin), teinte, capitale, position de la capitale, étape, position du nom)
PROV = [
    ('Yoyolande', (295, 360), mix('#8F2447', .28), 'Sinusborg', geo(18.65, 54.36), 3, geo(17.3, 53.8)),
    ('Bedonstan', (0, 75), mix('#1F9346', .30), 'Lobatchevsk', geo(21.4, 53.55), 4, geo(21.9, 53.0)),
    ('Glitchistan', (75, 165), mix('#AE4E1F', .30), 'Turingrad', geo(22.2, 51.85), 6, geo(22.28, 51.41)),
    ('Patatovie', (165, 215), mix('#3E8E86', .30), 'Cracovenn', geo(19.94, 50.06), 5, geo(20.44, 50.62)),
    ('Nombrilie', (215, 250), mix('#F3C025', .45), 'Empoche-les-Bains', None, 1, geo(18.55, 51.38)),
    ('Pifométrie', (250, 295), mix('#593B26', .28), 'Bonneteau-sur-Vistule', None, 2, geo(15.6, 52.75)),
]

# Vistule : Pythagoriades (Bedonstan) → Glitchistan → Cracovenn (Patatovie) → Nombrilie → Bonneteau (Pifométrie)
# → Yoyolande → Sinusborg : elle traverse les six provinces
RIVER_PTS = [geo(22.75, 53.55), geo(23.25, 52.75), geo(23.3, 52.0), geo(22.9, 51.0), geo(21.9, 50.45),
             geo(20.9, 50.1), geo(19.94, 50.06), geo(18.7, 50.4), geo(17.5, 50.95), geo(16.8, 51.6),
             geo(16.75, 52.35), geo(17.4, 52.9), geo(18.2, 53.4), geo(18.55, 53.9), geo(18.65, 54.36)]
BON = RIVER_PTS[10]
EMP = RIVER_PTS[8]

o = []
o.append(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}" font-family="Georgia, serif">')
o.append(f'<defs><clipPath id="pl"><path d="{path(POLAND, True)}"/></clipPath>'
         f'<marker id="fl" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,0 L10,5 L0,10 Z" fill="{mix("#8F2447", .8)}"/></marker></defs>')
o.append(f'<rect width="{W}" height="{H}" fill="{PAPER}"/>')
# voisins, derrière le Royaume
lx, ly = geo(21.3, 53.9)
o.append(f'<rect x="{lx:.0f}" y="0" width="{W - lx:.0f}" height="{ly:.0f}" fill="#DADBD8"/>')
cx0, _ = geo(22.2, 50)
o.append(f'<rect x="{cx0:.0f}" y="{ly:.0f}" width="{W - cx0:.0f}" height="{H - ly:.0f}" fill="{mix("#66AACC", .45)}"/>')
o.append(f'<path d="M{lx:.0f},{ly:.0f} L{W},{ly:.0f}" stroke="{INK}" stroke-width="1.5" stroke-dasharray="6 4"/>')
o.append(f'<text x="905" y="150" font-size="20" font-style="italic" fill="{INK}">Lithuanie</text>')
o.append(f'<text x="905" y="172" font-size="13" fill="{INK}">(Champs Minés)</text>')
o.append(f'<text x="920" y="470" font-size="22" font-style="italic" fill="{INK}">Empire</text>')
o.append(f'<text x="920" y="496" font-size="22" font-style="italic" fill="{INK}">du Czar</text>')
o.append(f'<text x="920" y="522" font-size="13" fill="{INK}">★ palais d’Hiver</text>')
# provinces : secteurs découpés par le contour
o.append('<g clip-path="url(#pl)">')
for name, (a0, a1), col, *_ in PROV:
    wedge = border(a0) + [pt(t, 1200) for t in range(a0, a1 + 1, 5)] + list(reversed(border(a1)))
    o.append(f'<path d="{path(wedge, True)}" fill="{col}"/>')
for name, (a0, a1), *_ in PROV:
    o.append(f'<path d="{path(border(a1))}" fill="none" stroke="{INK}" stroke-width="2" stroke-linejoin="round"/>')
o.append('</g>')
o.append(f'<path d="{path(POLAND, True)}" fill="none" stroke="{INK}" stroke-width="2.8" stroke-linejoin="round"/>')
# mer Baltique, par-dessus (sa côte = la côte du Royaume)
sea = [(0, 0), (geo(21.3, 56)[0], 0), geo(21.3, 54.33), geo(20.5, 54.38)] + [geo(*p) for p in reversed(COAST)] + [(0, geo(14.22, 53.92)[1])]
o.append(f'<path d="{path(sea, True)}" fill="{SEA}"/>')
o.append(f'<path d="{path([geo(*p) for p in COAST])}" fill="none" stroke="{INK}" stroke-width="2.8" stroke-linejoin="round"/>')
o.append(f'<text x="250" y="70" font-size="30" font-style="italic" fill="{mix("#2F62B0", .95)}" letter-spacing="4">Mer Baltique</text>')
# Pythagoriades, dans Bedonstan
for lon, lat in [(22.55, 53.85), (22.95, 53.95), (23.3, 53.8), (22.8, 53.65), (23.15, 53.55)]:
    x, y = geo(lon, lat)
    o.append(f'<path d="M{x - 13:.1f},{y + 10:.1f} L{x:.1f},{y - 13:.1f} L{x + 13:.1f},{y + 10:.1f} Z" fill="{mix("#593B26", .6)}" stroke="{INK}" stroke-width="1.5"/>')
x, y = geo(22.35, 54.2)
o.append(f'<text x="{x:.0f}" y="{y:.0f}" font-size="13" font-style="italic" fill="{INK}">Pythagoriades</text>')
# Vistule
rv = smooth(RIVER_PTS)
o.append(f'<path id="v" d="{rv}" fill="none" stroke="{RIVER}" stroke-width="6" stroke-linecap="round"/>')
o.append(f'<text font-size="15" font-style="italic" fill="{mix("#2F62B0", 1)}" dy="-8"><textPath href="#v" startOffset="2%">Vistule</textPath></text>')
# Sandomir en spirale
o.append(f'<circle cx="{CX:.1f}" cy="{CY:.1f}" r="34" fill="{PAPER}" stroke="{INK}" stroke-width="2.5"/>')
o.append(f'<path d="{path([pt(i, 2 + 28 * i / 720) for i in range(0, 721, 8)])}" fill="none" stroke="#C9970F" stroke-width="3"/>')
o.append(f'<text x="{CX:.0f}" y="{CY - 44:.0f}" font-size="17" font-weight="bold" text-anchor="middle" fill="{INK}">Sandomir</text>')
# noms et capitales
for name, a, col, cap, cpos, n, npos in PROV:
    x, y = npos
    ls = 0 if name == 'Glitchistan' else 2
    fs = 17 if name == 'Glitchistan' else 19
    o.append(f'<text x="{x:.0f}" y="{y:.0f}" font-size="{fs}" font-weight="bold" text-anchor="middle" fill="{INK}" letter-spacing="{ls}">{name.upper()}</text>')
    o.append(f'<text x="{x:.0f}" y="{y + 19:.0f}" font-size="12" text-anchor="middle" fill="{INK}">étape {n}</text>')
    if cap.startswith('Bonneteau'):
        cpos = BON
    elif cap.startswith('Empoche'):
        cpos = EMP
    cx_, cy_ = cpos
    label = cap + (' ⚓' if cap == 'Sinusborg' else '')
    dy = {'Sinusborg': 5, 'Cracovenn': 24}.get(cap, 20)
    anchor = 'start' if cap.startswith('Bonneteau') else ('end' if cap == 'Sinusborg' else 'middle')
    dx = 10 if cap.startswith('Bonneteau') else (-12 if cap == 'Sinusborg' else 0)
    o.append(f'<circle cx="{cx_:.1f}" cy="{cy_:.1f}" r="5.5" fill="{INK}"/><circle cx="{cx_:.1f}" cy="{cy_:.1f}" r="2.3" fill="{PAPER}"/>')
    o.append(f'<text x="{cx_ + dx:.0f}" y="{cy_ + dy:.0f}" font-size="14" font-style="italic" text-anchor="{anchor}" fill="{INK}">{label}</text>')
# encart : Isle de la Réunion
o.append(f'<rect x="30" y="690" width="210" height="140" fill="{SEA}" stroke="{INK}" stroke-width="2"/>')
o.append(f'<path d="M95,772 C100,745 150,740 170,758 C190,776 160,800 130,798 C105,797 92,788 95,772 Z" fill="{mix("#1F9346", .30)}" stroke="{INK}" stroke-width="2"/>')
o.append(f'<text x="135" y="712" font-size="14" font-style="italic" text-anchor="middle" fill="{INK}">Isle de la Réunion</text>')
o.append(f'<text x="135" y="729" font-size="14" font-style="italic" text-anchor="middle" fill="{INK}">Pataphysique</text>')
o.append(f'<text x="135" y="820" font-size="11" text-anchor="middle" fill="{INK}">(outre-mer, en encart)</text>')
# rose des vents
o.append(f'<g transform="translate(1050,90)"><path d="M0,-34 L8,0 L0,34 L-8,0 Z" fill="{INK}"/><path d="M-34,0 L0,-8 L34,0 L0,8 Z" fill="{INK}" opacity=".45"/><text y="-40" font-size="14" text-anchor="middle" fill="{INK}">N</text></g>')
# cartouche
o.append(f'<text x="{W - 20}" y="{H - 40}" font-size="18" text-anchor="end" font-weight="bold" fill="{INK}">Royaume de Pologne pataphysique</text>')
o.append(f'<text x="{W - 20}" y="{H - 18}" font-size="13" text-anchor="end" fill="{INK}">plan schématique validé le 2026-10-29 · étapes : ordre digestif</text>')
o.append('</svg>')

svg = '\n'.join(o)
if '--sans-texte' in sys.argv:
    svg = re.sub(r'<text\b.*?</text>', '', svg, flags=re.S)
open(sys.argv[1], 'w').write(svg)
