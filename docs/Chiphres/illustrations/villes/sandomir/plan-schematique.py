# Plan schématique de Sandomir (Compendium § II « Sandomir, capitale du Royaume », décisions de David du 2026-10-29).
# Usage : python3 plan-schematique.py plan-schematique.svg [--reference-ia]
# Une seule rue en spirale, de l'entrée (Pont-Levis, au sud) au Palais Royal (centre) ; lac au nord-ouest qui alimente
# les douves ; route circulaire de l'autre bord des douves, d'où partent les six routes des provinces ;
# chemin de fer venu de l'est, terminus à la Gare hors des douves (les rails ne franchissent pas les douves).
# Lieux le long de la spirale, de l'entrée au centre : Pont-Levis, Grand Marché, Caserne, Arène, Gazette, Bibliothèque,
# Trône Royal (dans le Palais). Disposition gardée de la vignette de la grande carte (lac au NO, pont au sud).
# --reference-ia : référence pour l'IA (qui recopie tout) : aucun texte.
# Rendu PNG : chrome-headless-shell de Playwright (--screenshot) ; magick ne trouve pas les polices.
import math, sys

W = H = 1000
CX, CY = 500, 500
INK = '#1B2232'
PAPER = '#F1EDE4'
GOLD = '#F3C025'
GREEN = '#1F9346'
BROWN = '#593B26'
SEA = '#2F62B0'

R_OUT, R_IN = 312, 118  # rayon de la rue au départ (entrée) et à l'arrivée (porte du Palais)
TURNS = 2  # deux tours : lisible sur téléphone, et Nano Banana compte mal (David, 2026-10-29)
T = TURNS * 360  # angle parcouru le long de la rue
A0 = 180  # entrée au sud (angle compas : 0 = nord, sens des aiguilles d'une montre)
R_MOAT, MOAT_W = 362, 24
R_RING = 402
R_PALACE = 78
LIEU_OFF = 46  # centre d'un lieu : côté intérieur de la rue, au milieu de la bande de maisons
LIEU_SCALE = 1.3

# lieux : (nom, angle parcouru depuis l'entrée) ; bâtis côté intérieur de la rue
LIEUX = [
    ('Le Grand Marché Polonais', 100),
    ('La Caserne des Palotins', 215),
    ("L'Arène des Polonais", 330),
    ('La Gazette du Royaume', 445),
    ('La Bibliothèque du Décervelage', 560),
]
ROUTES = [('Yoyolande', 0), ('Bedonstan', 45), ('Glitchistan', 90), ('Patatovie', 180), ('Nombrilie', 225),
          ('Pifométrie', 270)]


def mix(c, t, base=PAPER):
    a = [int(c[i:i + 2], 16) for i in (1, 3, 5)]
    b = [int(base[i:i + 2], 16) for i in (1, 3, 5)]
    return '#' + ''.join(f'{round(b[i] + (a[i] - b[i]) * t):02X}' for i in range(3))


def pol(a, r):
    return (CX + r * math.sin(math.radians(a)), CY - r * math.cos(math.radians(a)))


def spiral(t):
    # point de la rue après un angle parcouru t ; la rue s'enroule dans le sens des aiguilles d'une montre
    return A0 + t, R_OUT - (R_OUT - R_IN) * t / T


def path(pts, close=False):
    d = 'M' + ' L'.join(f'{x:.1f},{y:.1f}' for x, y in pts)
    return d + (' Z' if close else '')


IA = '--reference-ia' in sys.argv
out = []
add = out.append
add(f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}">')
add(f'<rect width="{W}" height="{H}" fill="{mix(GREEN, 0.22)}"/>')

# routes des provinces, depuis la route circulaire jusqu'au bord
road = mix(BROWN, 0.35)
for name, a in ROUTES:
    xa, ya = pol(a, R_RING)
    xb, yb = pol(a, 760)
    add(f'<line x1="{xa:.1f}" y1="{ya:.1f}" x2="{xb:.1f}" y2="{yb:.1f}" stroke="{road}" stroke-width="12" '
        f'stroke-linecap="round"/>')
add(f'<circle cx="{CX}" cy="{CY}" r="{R_RING}" fill="none" stroke="{road}" stroke-width="12"/>')

# lac au nord-ouest et son canal vers les douves
lake = [(105 + 88 * math.cos(u) * (1 + 0.12 * math.sin(3 * u)), 110 + 66 * math.sin(u) * (1 + 0.1 * math.cos(2 * u)))
        for u in [i * math.pi / 40 for i in range(80)]]
water = mix(SEA, 0.45)
x1, y1 = (170, 160)
x2, y2 = pol(315, R_MOAT)
add(f'<path d="M{x1:.1f},{y1:.1f} Q{(x1 + x2) / 2 + 25:.1f},{(y1 + y2) / 2 - 15:.1f} {x2:.1f},{y2:.1f}" fill="none" '
    f'stroke="{INK}" stroke-width="18" stroke-linecap="round"/>')
add(f'<path d="M{x1:.1f},{y1:.1f} Q{(x1 + x2) / 2 + 25:.1f},{(y1 + y2) / 2 - 15:.1f} {x2:.1f},{y2:.1f}" fill="none" '
    f'stroke="{water}" stroke-width="14" stroke-linecap="round"/>')
add(f'<path d="{path(lake, True)}" fill="{water}" stroke="{INK}" stroke-width="2"/>')

# petit pont de la route circulaire sur le canal
xp, yp = pol(315, R_RING)
add(f'<g transform="translate({xp:.1f},{yp:.1f}) rotate(45)"><rect x="-13" y="-8" width="26" height="16" '
    f'fill="{mix(BROWN, 0.55)}" stroke="{INK}" stroke-width="1.2"/></g>')

# chemin de fer à vapeur venu du Glitchistan (est) ; terminus à la Gare, hors des douves (David, 2026-10-29)
GARE = pol(62, R_RING + 52)
rail = [(W + 20, 330), (960, 318), (920, 300), (GARE[0] + 30, GARE[1] + 6)]
add(f'<path d="{path(rail)}" fill="none" stroke="{INK}" stroke-width="9" stroke-dasharray="2 5"/>')
add(f'<path d="{path(rail)}" fill="none" stroke="{INK}" stroke-width="2.5"/>')
add(f'<g transform="translate({GARE[0]:.1f},{GARE[1]:.1f}) rotate(-20)"><rect x="-30" y="-14" width="60" height="22" '
    f'fill="{mix(BROWN, 0.55)}" stroke="{INK}" stroke-width="1.4"/><rect x="-30" y="8" width="60" height="6" '
    f'fill="{mix(INK, 0.3)}" stroke="{INK}" stroke-width="1"/><rect x="-6" y="-24" width="12" height="10" '
    f'fill="{GOLD}" stroke="{INK}" stroke-width="1"/></g>')
xg, yg = pol(62, R_RING)  # chemin de la gare à la route circulaire
add(f'<line x1="{xg:.1f}" y1="{yg:.1f}" x2="{GARE[0] - 8:.1f}" y2="{GARE[1] + 12:.1f}" stroke="{road}" stroke-width="8"/>')

# douves
add(f'<circle cx="{CX}" cy="{CY}" r="{R_MOAT}" fill="none" stroke="{INK}" stroke-width="{MOAT_W + 4}"/>')
add(f'<circle cx="{CX}" cy="{CY}" r="{R_MOAT}" fill="none" stroke="{water}" stroke-width="{MOAT_W}"/>')
# terre de la ville
add(f'<circle cx="{CX}" cy="{CY}" r="{R_MOAT - MOAT_W / 2 - 2}" fill="{mix(BROWN, 0.12)}"/>')

# Pont-Levis : de la route circulaire au début de la rue
xa, ya = pol(A0, R_RING - 6)
xb, yb = pol(A0, R_OUT)
add(f'<line x1="{xa:.1f}" y1="{ya:.1f}" x2="{xb:.1f}" y2="{yb:.1f}" stroke="{INK}" stroke-width="22"/>')
add(f'<line x1="{xa:.1f}" y1="{ya:.1f}" x2="{xb:.1f}" y2="{yb:.1f}" stroke="{mix(BROWN, 0.55)}" stroke-width="18"/>')
for k in range(-3, 4):
    xp, yp = pol(A0, R_MOAT + k * 6)
    add(f'<line x1="{xp - 9:.1f}" y1="{yp:.1f}" x2="{xp + 9:.1f}" y2="{yp:.1f}" stroke="{INK}" stroke-width="1"/>')


# maisons serrées des deux côtés de la rue, sauf là où un lieu ouvre une place
def near_lieu(x, y):
    # distance au centre de chaque lieu : la place s'ouvre des deux côtés
    for _, tl in LIEUX:
        a, r = spiral(tl)
        lx, ly = pol(a, r - LIEU_OFF)
        if math.hypot(x - lx, y - ly) < 56:
            return True
    return False


house = mix(BROWN, 0.6)
roof = mix(BROWN, 0.85)
step = 25
t = 0.0
while t <= T:
    a, r = spiral(t)
    rows = [(1, 21), (-1, -21), (-1, -48)]  # bande de deux rangées entre deux tours
    if t < 360:  # premier tour : rangées en plus jusqu'aux douves, là où aucun tour extérieur ne passe
        rows += [(1, 21 + 28 * k) for k in range(1, 4)]
    for side, off in rows:
        rr = r + off
        if rr > R_MOAT - MOAT_W / 2 - 14 or rr < R_PALACE + 26:
            continue
        x, y = pol(a, rr)
        if near_lieu(x, y) or (t < 20 and side > 0) or (abs(x - CX) < 26 and y > CY + R_OUT - 20):  # devant le pont
            continue
        add(f'<g transform="translate({x:.1f},{y:.1f}) rotate({a:.1f})"><rect x="-10" y="-9" width="20" height="18" '
            f'fill="{house}" stroke="{INK}" stroke-width="1.2"/><line x1="-10" y1="0" x2="10" y2="0" stroke="{roof}" '
            f'stroke-width="2"/></g>')
    t += step / r * 180 / math.pi

# la rue en spirale
street = [pol(*spiral(i)) for i in range(0, T + 1, 3)]
street.append(pol(A0 + T, R_PALACE))
add(f'<path d="{path(street)}" fill="none" stroke="{INK}" stroke-width="15" stroke-linejoin="round"/>')
add(f'<path d="{path(street)}" fill="none" stroke="{mix(GOLD, 0.25)}" stroke-width="12" stroke-linejoin="round"/>')


# lieux, côté intérieur de la rue
def lieu_shape(i, x, y, a):
    g = f'<g transform="translate({x:.1f},{y:.1f}) rotate({a:.1f}) scale({LIEU_SCALE})">'
    if i == 0:  # marché : place et étals
        g += f'<rect x="-34" y="-17" width="68" height="34" fill="{mix(GOLD, 0.2)}" stroke="{INK}" stroke-width="1.2"/>'
        for sx in (-24, -8, 8, 24):
            for sy in (-7, 7):
                g += (f'<rect x="{sx - 5}" y="{sy - 4}" width="10" height="8" fill="{mix(GREEN, 0.7)}" '
                      f'stroke="{INK}" stroke-width="0.8"/>')
    elif i == 1:  # caserne : bâtiment en U autour d'une cour
        g += (f'<path d="M-32,-18 H32 V18 H18 V-4 H-18 V18 H-32 Z" fill="{mix(GREEN, 0.55)}" stroke="{INK}" '
              f'stroke-width="1.4"/>')
    elif i == 2:  # arène : petite arène ronde
        g += (f'<circle r="20" fill="{mix(BROWN, 0.45)}" stroke="{INK}" stroke-width="1.4"/>'
              f'<circle r="11" fill="{mix(GOLD, 0.35)}" stroke="{INK}" stroke-width="1"/>')
    elif i == 3:  # gazette : longue imprimerie, cheminée
        g += (f'<rect x="-30" y="-12" width="60" height="24" fill="{mix(INK, 0.35)}" stroke="{INK}" stroke-width="1.4"/>'
              f'<circle cx="20" cy="0" r="4" fill="{INK}"/>')
    elif i == 4:  # bibliothèque : colonnade
        g += f'<rect x="-28" y="-14" width="56" height="28" fill="{PAPER}" stroke="{INK}" stroke-width="1.4"/>'
        for sx in range(-22, 23, 9):
            g += f'<line x1="{sx}" y1="-14" x2="{sx}" y2="14" stroke="{INK}" stroke-width="1"/>'
    return g + '</g>'


labels = []
for i, (name, tl) in enumerate(LIEUX):
    a, r = spiral(tl)
    x, y = pol(a, r - LIEU_OFF)
    add(lieu_shape(i, x, y, a))
    labels.append((i + 2, name, x, y))

# Palais Royal : rond et ventru, dôme doré, gidouille d'or au sommet
add(f'<circle cx="{CX}" cy="{CY}" r="{R_PALACE}" fill="{PAPER}" stroke="{INK}" stroke-width="2"/>')
for k in range(12):
    x, y = pol(k * 30, R_PALACE - 6)
    add(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="3" fill="{GOLD}" stroke="{INK}" stroke-width="0.8"/>')
add(f'<circle cx="{CX}" cy="{CY}" r="{R_PALACE - 16}" fill="{GOLD}" stroke="{INK}" stroke-width="2"/>')
gid = [(CX + 2.2 * u * math.cos(u), CY + 2.2 * u * math.sin(u)) for u in [j * 0.15 for j in range(0, 100)]]
add(f'<path d="{path(gid)}" fill="none" stroke="{BROWN}" stroke-width="2.5"/>')
for a in (45, 135, 225, 315):  # bannières vertes
    x, y = pol(a, R_PALACE + 4)
    add(f'<path d="M{x:.1f},{y:.1f} l0,-16 l12,5 l-12,5" fill="{GREEN}" stroke="{INK}" stroke-width="1"/>')

if not IA:
    font = 'font-family="Georgia, serif"'
    for n, name, x, y in labels:
        add(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="11" fill="{INK}"/><text x="{x:.1f}" y="{y + 4.5:.1f}" '
            f'text-anchor="middle" font-size="13" fill="{PAPER}" {font} font-weight="bold">{n}</text>')
    x, y = pol(A0, R_MOAT)
    add(f'<circle cx="{x + 26:.1f}" cy="{y:.1f}" r="11" fill="{INK}"/><text x="{x + 26:.1f}" y="{y + 4.5:.1f}" '
        f'text-anchor="middle" font-size="13" fill="{PAPER}" {font} font-weight="bold">1</text>')
    add(f'<circle cx="{CX + 30}" cy="{CY + 30}" r="11" fill="{INK}"/><text x="{CX + 30}" y="{CY + 34.5}" '
        f'text-anchor="middle" font-size="13" fill="{PAPER}" {font} font-weight="bold">7</text>')
    for name, a in ROUTES:
        x, y = pol(a, 445)
        x = min(max(x, 70), W - 70)
        y = min(max(y, 20), H - 12)
        add(f'<text x="{x:.1f}" y="{y:.1f}" text-anchor="middle" font-size="15" font-style="italic" fill="{INK}" '
            f'{font} paint-order="stroke" stroke="{PAPER}" stroke-width="4">vers {name}</text>')
    add(f'<text x="105" y="116" text-anchor="middle" font-size="16" font-style="italic" fill="{INK}" {font}>le lac</text>')
    add(f'<text x="{GARE[0]:.1f}" y="{GARE[1] - 32:.1f}" text-anchor="middle" font-size="16" font-style="italic" fill="{INK}" '
        f'{font} paint-order="stroke" stroke="{PAPER}" stroke-width="4">la Gare</text>')
    legend = ['1 Le Pont-Levis du Royaume'] + [f'{n} {name}' for n, name, _, _ in labels] + ['7 Le Trône Royal (Palais)']
    add(f'<rect x="{W - 290}" y="{H - 30 - 22 * len(legend)}" width="280" height="{22 * len(legend) + 20}" '
        f'fill="{PAPER}" stroke="{INK}" stroke-width="1.2" opacity="0.95"/>')
    for k, line in enumerate(legend):
        add(f'<text x="{W - 278}" y="{H - 14 - 22 * (len(legend) - k)}" font-size="14" fill="{INK}" {font}>{line}</text>')

add('</svg>')
with open(sys.argv[1], 'w') as f:
    f.write('\n'.join(out))
