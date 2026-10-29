# Carte du Royaume : surcouche SVG (frontières des provinces, noms) posée sur carte-villes-hd.webp.
# Usage : python3 carte-royaume.py carte-royaume.svg [--controle]  (--controle : trait rouge au centre des frontières)
# Coordonnées = pixels de carte-villes-hd.webp (4356×3904). Les frontières suivent les pointillés
# peints par l'IA sur le fond (relevés à la main sur une grille), pas le plan schématique : l'IA a déplacé le tracé.
# Rendu PNG : Chrome sans tête (le fond est référencé par chemin relatif, rendre depuis ce dossier).
import sys

CONTROLE = '--controle' in sys.argv

W, H = 4356, 3904
INK = '#1B2232'
PAPER = '#F1EDE4'
FONT = "Georgia, 'Times New Roman', serif"

# frontières, de Sandomir vers le bord du Royaume (nom : provinces de part et d'autre)
BORDERS = {
    'yoyolande-bedonstan': [(2602, 1650), (2590, 1420), (2655, 1260), (2687, 1075), (2645, 905), (2602, 690)],
    'bedonstan-glitchistan': [(2860, 1770), (3000, 1735), (3200, 1700), (3400, 1625), (3470, 1612)],
    'glitchistan-patatovie': [(2694, 2085), (2730, 2205), (2779, 2375), (2793, 2573), (2795, 2740), (2850, 2886),
                              (2900, 3000), (2950, 3120), (2975, 3250), (3040, 3356), (3107, 3469), (3136, 3527)],
    'patatovie-nombrilie': [(2454, 2050), (2319, 2290), (2263, 2432), (2230, 2560), (2100, 2690), (1990, 2780),
                            (1867, 2889), (1800, 3030), (1770, 3100)],
    'nombrilie-pifometrie': [(2362, 1901), (2192, 1937), (2135, 2035), (1966, 2092), (1810, 2106), (1655, 2177),
                             (1480, 2300), (1301, 2389), (990, 2455), (778, 2535), (552, 2587)],
    'pifometrie-yoyolande': [(2390, 1724), (2192, 1625), (2065, 1526), (1945, 1477), (1725, 1400), (1584, 1375),
                             (1528, 1371), (1350, 1310), (1273, 1245), (1132, 1117), (990, 1047), (792, 962),
                             (594, 856)],
}

# (id, nom, x, y)
PROVINCES = [
    ('yoyolande', 'Yoyolande', 2100, 1300),
    ('bedonstan', 'Bedonstan', 3050, 1480),
    ('glitchistan', 'Glitchistan', 3150, 2560),
    ('patatovie', 'Patatovie', 2560, 3200),
    ('nombrilie', 'Nombrilie', 1980, 2330),
    ('pifometrie', 'Pifométrie', 760, 2130),
]
# (id, nom, x, y, ancrage)
CAPITALS = [
    ('sinusborg', 'Sinusborg', 1900, 890, 'middle'),
    ('lobatchevsk', 'Lobatchevsk', 2810, 1335, 'middle'),
    ('turingrad', 'Turingrad', 3150, 2230, 'middle'),
    ('cracovenn', 'Cracovenn', 2110, 3010, 'end'),
    ('empoche-les-bains', 'Empoche-les-Bains', 1520, 2700, 'middle'),
    ('bonneteau-sur-vistule', 'Bonneteau-sur-Vistule', 1180, 1910, 'middle'),
]
SANDOMIR = (2613, 1615)

# bout de pointillé qui déborde dans l'Empire du Czar : recouvert par la neige juste en dessous (tampon)
PATCH = {'cx': 3560, 'cy': 2082, 'rx': 80, 'ry': 36, 'dy': 90}


def path(pts):
    # Catmull-Rom → Bézier : les pointillés de l'IA sont des courbes
    d = f'M{pts[0][0]},{pts[0][1]}'
    for i in range(len(pts) - 1):
        p0 = pts[i - 1] if i > 0 else pts[i]
        p1, p2 = pts[i], pts[i + 1]
        p3 = pts[i + 2] if i + 2 < len(pts) else p2
        c1 = (p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6)
        c2 = (p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6)
        d += f' C{c1[0]:.0f},{c1[1]:.0f} {c2[0]:.0f},{c2[1]:.0f} {p2[0]},{p2[1]}'
    return d


def text(x, y, s, size, cls, anchor='middle', extra=''):
    return f'<text x="{x}" y="{y}" font-size="{size}" text-anchor="{anchor}" class="{cls}"{extra}>{s}</text>'


o = [f'<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 {W} {H}" '
     f'width="{W}" height="{H}" font-family="{FONT}">']
o.append('<style>'
         f'text{{fill:{INK};paint-order:stroke;stroke:{PAPER};stroke-linejoin:round}}'
         '.prov{font-weight:bold;letter-spacing:18px;stroke-width:14px;stroke-opacity:.75}'
         '.cap{font-style:italic;stroke-width:12px;stroke-opacity:.85}'
         '.capitale{font-weight:bold;stroke-width:14px;stroke-opacity:.85}'
         '.eau{font-style:italic;fill:#2B5C9E;stroke-width:10px;stroke-opacity:.6;letter-spacing:12px}'
         '.voisin{font-style:italic;stroke-width:10px;stroke-opacity:.6}'
         '.titre{font-weight:bold;letter-spacing:5px;stroke:none}'
         '</style>')
p = PATCH
o.append('<defs>'
         f'<radialGradient id="flou"><stop offset=".55" stop-color="#fff"/><stop offset="1" stop-color="#000"/></radialGradient>'
         f'<mask id="tampon"><ellipse cx="{p["cx"]}" cy="{p["cy"]}" rx="{p["rx"]}" ry="{p["ry"]}" fill="url(#flou)"/></mask>'
         '</defs>')
o.append(f'<image href="carte-villes-hd.webp" width="{W}" height="{H}"/>')
o.append(f'<g mask="url(#tampon)"><image href="carte-villes-hd.webp" width="{W}" height="{H}" y="{-p["dy"]}"/></g>')

o.append('<g id="frontieres" fill="none" stroke-linecap="round" stroke-linejoin="round">')
for name, pts in BORDERS.items():
    d = path(pts)
    ctrl = f'<path d="{d}" stroke="red" stroke-width="3"/>' if CONTROLE else ''
    # invisibles : les pointillés peints suffisent ; les tracés servent de cibles (survol, clic) sur le site
    o.append(f'<path id="frontiere-{name}" d="{d}" stroke="#8F2447" stroke-opacity="0" stroke-width="34"/>{ctrl}')
o.append('</g>')

o.append('<g id="noms">')
o.append(text(1180, 500, 'Mer Baltique', 76, 'eau'))
o.append(text(2660, 2830, 'Vistule', 56, 'eau', extra=' transform="rotate(-10 2660 2830)"'))
o.append(text(3080, 1010, 'Pythagoriades', 50, 'voisin'))
o.append(text(3950, 480, 'Lithuanie', 84, 'voisin'))
o.append(text(3950, 560, '(Champs Minés)', 52, 'voisin'))
o.append(text(3600, 2900, 'Empire du Czar', 84, 'voisin'))
for pid, name, x, y in PROVINCES:
    o.append(f'<g id="province-{pid}">{text(x, y, name.upper(), 92, "prov")}</g>')
o.append(f'<g id="ville-sandomir">{text(*SANDOMIR, "Sandomir", 80, "capitale")}</g>')
for cid, name, x, y, anchor in CAPITALS:
    o.append(f'<g id="ville-{cid}">{text(x, y, name, 60, "cap", anchor)}</g>')
o.append('</g>')

o.append('<g id="cartouche">')
o.append(text(817, 3395, 'ROYAUME DE POLOGNE', 54, 'titre'))
o.append('</g>')
o.append('</svg>')

open(sys.argv[1], 'w').write('\n'.join(o) + '\n')
