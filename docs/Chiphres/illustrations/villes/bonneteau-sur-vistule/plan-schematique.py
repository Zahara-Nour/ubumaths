# Plan schématique de Bonneteau-sur-Vistule (Compendium, fiche Pifométrie, « Plan de la ville », décidé par David
# le 2026-10-29).
# Usage : python3 plan-schematique.py plan-schematique.svg [--reference-ia]
# Ville-tripot fluviale dans la grande plaine agricole : la Vistule, large et paresseuse, arrive du sud (Empoche-les-Bains),
# fait un grand méandre vers l'ouest puis repart au nord (Yoyolande). Ville sur les deux rives : le gros de la ville
# dans la boucle (rive est), un petit quartier sur la rive ouest, un pont de bois entre les deux. Un banc de sable au
# milieu du fleuve, des péniches. Cinq lieux : la Grand-Place (Roulette Royale sans numéros, estrade du Cheval à
# Phynances), le Quai des Tripots (tables à tapis vert au bord de l'eau), le Casino flottant (bateau à aubes amarré
# au quai), le Champ de courses (à la sortie de la ville, côté plaine), la Caisse du Cheval (petit comptoir sur la
# route des courses, où passent tous les parieurs). Champs, prairies et haies tout autour ; pas de forêt, pas d'enceinte.
# --reference-ia : référence pour l'IA (qui recopie tout) : aucun texte.
# Rendu PNG : chrome-headless-shell de Playwright (--screenshot) ; magick ne trouve pas les polices.
import math, random, sys

W = H = 1000
INK = '#1B2232'
PAPER = '#F1EDE4'
GOLD = '#F3C025'
GREEN = '#1F9346'
BROWN = '#593B26'
SEA = '#2F62B0'
SLATE = '#5E6E84'
TILE = '#B5603F'
FELT = '#1E6B3C'       # tapis vert
RED = '#A62639'        # cases rouges de la roulette
TREE = '#1F5E3A'
SAND = '#E6CF97'
RIVER_W = 72


def mix(c, t, base=PAPER):
    a = [int(c[i:i + 2], 16) for i in (1, 3, 5)]
    b = [int(base[i:i + 2], 16) for i in (1, 3, 5)]
    return '#' + ''.join(f'{round(b[i] + (a[i] - b[i]) * t):02X}' for i in range(3))


def path(pts, close=False):
    d = 'M' + ' L'.join(f'{x:.1f},{y:.1f}' for x, y in pts)
    return d + (' Z' if close else '')


def smooth(pts, n=12):
    # Catmull-Rom : courbe lisse passant par les points
    out = []
    p = [pts[0]] + pts + [pts[-1]]
    for i in range(1, len(p) - 2):
        p0, p1, p2, p3 = p[i - 1], p[i], p[i + 1], p[i + 2]
        for k in range(n):
            t = k / n
            out.append(tuple(0.5 * (2 * p1[j] + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t * t
                                    + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t ** 3) for j in (0, 1)))
    return out + [pts[-1]]


def dist_to(pts, x, y):
    best = 1e9
    for (x1, y1), (x2, y2) in zip(pts, pts[1:]):
        dx, dy = x2 - x1, y2 - y1
        t = max(0, min(1, ((x - x1) * dx + (y - y1) * dy) / (dx * dx + dy * dy or 1)))
        best = min(best, math.hypot(x - x1 - t * dx, y - y1 - t * dy))
    return best


def frame(pts, i):
    # point, tangente unitaire (sens du courant, vers le nord) et normale côté est (rive droite)
    a, b = pts[max(i - 1, 0)], pts[min(i + 1, len(pts) - 1)]
    dx, dy = b[0] - a[0], b[1] - a[1]
    n = math.hypot(dx, dy) or 1
    tx, ty = dx / n, dy / n
    return pts[i], (tx, ty), (-ty, tx)


def rot_rect(cx, cy, w, h, ang, fill, sw=1.1, extra=''):
    add(f'<rect x="{-w / 2:.1f}" y="{-h / 2:.1f}" width="{w:.1f}" height="{h:.1f}" fill="{fill}" stroke="{INK}" '
        f'stroke-width="{sw}" transform="translate({cx:.1f},{cy:.1f}) rotate({ang:.1f})" {extra}/>')


IA = '--reference-ia' in sys.argv
out = []
add = out.append
add(f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}">')
add(f'<rect width="{W}" height="{H}" fill="{mix(GREEN, 0.3)}"/>')
water = mix(SEA, 0.45)
street = mix(BROWN, 0.28)

# la Vistule : arrive du sud, grand méandre vers l'ouest, repart vers le nord
RIVER = smooth([(700, 1040), (690, 920), (650, 820), (570, 740), (460, 680), (370, 610), (330, 510), (345, 410),
                (410, 320), (510, 250), (590, 170), (620, 60), (625, -40)])
# le banc de sable, au milieu du fleuve, dans la descente sud du méandre
SANDBANK = (505, 712, 38, 15, 33)    # cx, cy, rx, ry, angle

# lieux
PLACE = (470, 390, 690, 560)
ROULETTE = (585, 478, 62)
ESTRADE = (515, 420)
TRACK = (830, 690, 125, 78)           # Champ de courses : cx, cy, rx, ry
STANDS = (720, 585, 940, 607)         # tribunes, côté nord de la piste
CAISSE = (745, 505)

# rues et routes
ROADS = [
    smooth([(690, 470), (760, 468), (880, 455), (1040, 440)]),                     # route de Sandomir (est)
    smooth([(640, 390), (650, 300), (690, 200), (730, 90), (750, -30)]),           # route de Sinusborg (nord)
    smooth([(690, 540), (735, 600), (760, 760), (790, 880), (800, 1040)]),         # route d'Empoche-les-Bains (sud)
    smooth([(470, 290), (330, 255), (200, 250), (60, 270), (-40, 290)]),           # route de la plaine (ouest, par le pont)
    smooth([(745, 505), (790, 560), (830, 585)]),                                  # allée du champ de courses
]
TOWN_STREETS = [
    [(470, 470), (420, 470)], [(580, 390), (560, 300), (470, 290)], [(470, 540), (470, 640)],
    [(600, 560), (610, 650)], [(690, 410), (720, 380)],
    # quartier de la rive ouest
    [(250, 250), (240, 560)], [(160, 255), (165, 520)], [(165, 400), (285, 400)], [(165, 500), (275, 505)],
]
STREETS = ROADS + TOWN_STREETS
BRIDGE = min(ROADS[3], key=lambda p: dist_to(RIVER, *p))

# le quai des tripots : rive est (intérieur de la boucle), entre le pont et le sud de la ville
QUAI_I = [i for i, (x, y) in enumerate(RIVER) if 330 <= y <= 700 and x < 520]
QUAI = []
for i in QUAI_I:
    (x, y), _, (nx, ny) = frame(RIVER, i)
    QUAI.append((x + nx * (RIVER_W / 2 + 12), y + ny * (RIVER_W / 2 + 12)))


def in_box(x, y, b, m=0):
    return b[0] - m < x < b[2] + m and b[1] - m < y < b[3] + m


def town(x, y, m=0):
    # la ville : dans la boucle (rive est) et le petit quartier de la rive ouest
    east = 200 < y < 720 and 330 < x < 730 + m and (x - 330) > (y - 600) * 0.9 - 40
    west = 225 < y < 580 and 120 - m < x < 300
    return east or west


def track(x, y, m=0):
    cx, cy, rx, ry = TRACK
    return ((x - cx) / (rx + 22 + m)) ** 2 + ((y - cy) / (ry + 22 + m)) ** 2 < 1


def shade(c, t):
    # assombrit (t < 0) ou éclaircit (t > 0) une couleur
    return mix(c, 1 + t, INK) if t < 0 else mix(c, 1 - t, '#FFFFFF')


def house(cx, cy, w, h, roof, ang=0, wall='#E9DCC0', sw=1.1):
    # maison vue de trois quarts : ombre portée, toit à deux pans (pan éclairé, pan à l'ombre), façade à fenêtres
    g = f'transform="translate({cx:.1f},{cy:.1f}) rotate({ang:.1f})"'
    fh = max(4, h * 0.3)
    add(f'<rect x="{-w / 2 + 3:.1f}" y="{-h / 2 + 3:.1f}" width="{w:.1f}" height="{h:.1f}" fill="{INK}" opacity="0.22" {g}/>')
    add(f'<rect x="{-w / 2:.1f}" y="{h / 2 - fh:.1f}" width="{w:.1f}" height="{fh:.1f}" fill="{wall}" stroke="{INK}" '
        f'stroke-width="{sw}" {g}/>')
    for k in range(max(1, int(w // 8))):
        wx = -w / 2 + (k + 0.5) * w / max(1, int(w // 8))
        add(f'<rect x="{wx - 1.3:.1f}" y="{h / 2 - fh * 0.7:.1f}" width="2.6" height="{fh * 0.45:.1f}" fill="{INK}" {g}/>')
    rh = h - fh
    add(f'<rect x="{-w / 2:.1f}" y="{-h / 2:.1f}" width="{w:.1f}" height="{rh / 2:.1f}" fill="{shade(roof, 0.25)}" '
        f'stroke="{INK}" stroke-width="{sw}" {g}/>')
    add(f'<rect x="{-w / 2:.1f}" y="{-h / 2 + rh / 2:.1f}" width="{w:.1f}" height="{rh / 2:.1f}" fill="{shade(roof, -0.2)}" '
        f'stroke="{INK}" stroke-width="{sw}" {g}/>')


def tree(x, y, r, c=None):
    add(f'<circle cx="{x + 2.5:.1f}" cy="{y + 2.5:.1f}" r="{r:.1f}" fill="{INK}" opacity="0.2"/>')
    add(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{r:.1f}" fill="{c or mix(TREE, 0.75)}" stroke="{INK}" stroke-width="0.7"/>')
    add(f'<circle cx="{x - r * 0.3:.1f}" cy="{y - r * 0.3:.1f}" r="{r * 0.4:.1f}" fill="#FFFFFF" opacity="0.18"/>')


# la plaine : grand patchwork irrégulier de champs (blé, prairies, labours, champs en lanières), bordés de haies
rng = random.Random(11)
ROT = math.radians(9)
cols = [-120]
while cols[-1] < W + 120:
    cols.append(cols[-1] + rng.uniform(60, 125))
rows = [-120]
while rows[-1] < H + 120:
    rows.append(rows[-1] + rng.uniform(55, 100))
V = {}
for i, u in enumerate(cols):
    for j, v in enumerate(rows):
        u2, v2 = u + rng.uniform(-14, 14), v + rng.uniform(-12, 12)
        V[i, j] = (500 + (u2 - 500) * math.cos(ROT) - (v2 - 500) * math.sin(ROT),
                   500 + (u2 - 500) * math.sin(ROT) + (v2 - 500) * math.cos(ROT))
FIELD_COLORS = (mix(GOLD, 0.6), mix(GOLD, 0.45), mix('#C9A227', 0.5), mix(GREEN, 0.5), mix(GREEN, 0.38),
                mix('#7FA650', 0.55), mix(BROWN, 0.38), mix(BROWN, 0.28))
hedges = []
for i in range(len(cols) - 1):
    for j in range(len(rows) - 1):
        q = [V[i, j], V[i + 1, j], V[i + 1, j + 1], V[i, j + 1]]
        cx, cy = sum(p[0] for p in q) / 4, sum(p[1] for p in q) / 4
        if not (-80 < cx < W + 80 and -80 < cy < H + 80):
            continue
        if rng.random() < 0.3:  # champ en lanières : trois bandes de cultures différentes
            for k in range(3):
                t0, t1 = k / 3, (k + 1) / 3
                strip = [(q[0][0] + (q[1][0] - q[0][0]) * t0, q[0][1] + (q[1][1] - q[0][1]) * t0),
                         (q[0][0] + (q[1][0] - q[0][0]) * t1, q[0][1] + (q[1][1] - q[0][1]) * t1),
                         (q[3][0] + (q[2][0] - q[3][0]) * t1, q[3][1] + (q[2][1] - q[3][1]) * t1),
                         (q[3][0] + (q[2][0] - q[3][0]) * t0, q[3][1] + (q[2][1] - q[3][1]) * t0)]
                add(f'<path d="{path(strip, True)}" fill="{rng.choice(FIELD_COLORS)}" stroke="{mix(BROWN, 0.5)}" stroke-width="0.8"/>')
        else:
            c = rng.choice(FIELD_COLORS)
            add(f'<path d="{path(q, True)}" fill="{c}"/>')
            if rng.random() < 0.55:  # sillons
                for k in range(1, 7):
                    t = k / 7
                    p0 = (q[0][0] + (q[3][0] - q[0][0]) * t, q[0][1] + (q[3][1] - q[0][1]) * t)
                    p1 = (q[1][0] + (q[2][0] - q[1][0]) * t, q[1][1] + (q[2][1] - q[1][1]) * t)
                    add(f'<line x1="{p0[0]:.1f}" y1="{p0[1]:.1f}" x2="{p1[0]:.1f}" y2="{p1[1]:.1f}" stroke="{INK}" '
                        f'stroke-width="0.5" opacity="0.3"/>')
        hedges += [(q[0], q[1]), (q[0], q[3])]
for a_, b_ in hedges:
    add(f'<line x1="{a_[0]:.1f}" y1="{a_[1]:.1f}" x2="{b_[0]:.1f}" y2="{b_[1]:.1f}" stroke="{mix(TREE, 0.8)}" '
        f'stroke-width="4" stroke-linecap="round"/>')
# arbres de haie
for a_, b_ in hedges:
    if rng.random() < 0.35:
        t = rng.uniform(0.2, 0.8)
        x, y = a_[0] + (b_[0] - a_[0]) * t, a_[1] + (b_[1] - a_[1]) * t
        if not town(x, y, 30) and not track(x, y) and dist_to(RIVER, x, y) > RIVER_W / 2 + 10:
            tree(x, y, rng.uniform(6, 9))
# bosquets
for bx_, by_ in ((70, 120), (930, 230), (120, 760), (930, 900), (420, 900)):
    for k in range(12):
        tree(bx_ + rng.gauss(0, 22), by_ + rng.gauss(0, 16), rng.uniform(7, 11), mix(TREE, rng.uniform(0.7, 0.9)))
# fermes : cour, trois bâtiments en U, meules de foin, mare
for fx, fy in ((120, 660), (880, 150), (280, 120), (560, 860), (920, 820)):
    add(f'<rect x="{fx - 34}" y="{fy - 28}" width="68" height="56" fill="{mix(BROWN, 0.22)}" stroke="{mix(TREE, 0.8)}" stroke-width="3"/>')
    house(fx, fy - 15, 46, 18, TILE)
    house(fx - 22, fy + 6, 14, 22, BROWN)
    house(fx + 22, fy + 6, 14, 22, mix(BROWN, 0.8))
    for k in range(3):
        hx, hy = fx + 46 + 10 * (k % 2), fy - 14 + 14 * k
        add(f'<circle cx="{hx + 2}" cy="{hy + 2}" r="6" fill="{INK}" opacity="0.2"/>')
        add(f'<circle cx="{hx}" cy="{hy}" r="6" fill="{GOLD}" stroke="{INK}" stroke-width="0.8"/>')
        add(f'<circle cx="{hx}" cy="{hy}" r="2" fill="{mix(BROWN, 0.6)}"/>')
    add(f'<ellipse cx="{fx - 46}" cy="{fy + 18}" rx="9" ry="6" fill="{mix(SEA, 0.45)}" stroke="{INK}" stroke-width="0.8"/>')
# moulins à vent dans la plaine : tour ronde, quatre ailes en X
for mx, my in ((80, 420), (900, 560), (230, 900)):
    add(f'<circle cx="{mx + 3}" cy="{my + 3}" r="11" fill="{INK}" opacity="0.22"/>')
    add(f'<circle cx="{mx}" cy="{my}" r="11" fill="#E9DCC0" stroke="{INK}" stroke-width="1.3"/>')
    add(f'<circle cx="{mx}" cy="{my}" r="6" fill="{TILE}" stroke="{INK}" stroke-width="1"/>')
    for k in range(4):
        a = math.radians(30 + 90 * k)
        ex_, ey_ = mx + 30 * math.cos(a), my + 30 * math.sin(a)
        add(f'<line x1="{mx}" y1="{my}" x2="{ex_:.1f}" y2="{ey_:.1f}" stroke="{INK}" stroke-width="1.6"/>')
        px_, py_ = -math.sin(a) * 5, math.cos(a) * 5
        add(f'<path d="M{mx + 10 * math.cos(a):.1f},{my + 10 * math.sin(a):.1f} L{ex_:.1f},{ey_:.1f} '
            f'L{ex_ + px_:.1f},{ey_ + py_:.1f} L{mx + 10 * math.cos(a) + px_:.1f},{my + 10 * math.sin(a) + py_:.1f} Z" '
            f'fill="{PAPER}" stroke="{INK}" stroke-width="0.8"/>')

# le sol de la ville
add(f'<path d="{path(smooth([(335, 200), (520, 190), (720, 230), (760, 400), (760, 560), (720, 700), (600, 740), (500, 690), (400, 600), (360, 450), (335, 200)]), True)}" '
    f'fill="{mix(BROWN, 0.12)}"/>')
add(f'<rect x="110" y="215" width="200" height="375" rx="30" fill="{mix(BROWN, 0.12)}"/>')

# la rivière, élargie autour du banc de sable
sx, sy, srx, sry, sa = SANDBANK
for color, width, pad in ((INK, RIVER_W + 6, 3), (water, RIVER_W, 0)):
    add(f'<path d="{path(RIVER)}" fill="none" stroke="{color}" stroke-width="{width}" stroke-linejoin="round"/>')
    add(f'<ellipse cx="{sx}" cy="{sy}" rx="{srx + 34 + pad}" ry="{sry + 30 + pad}" fill="{color}" '
        f'transform="rotate({sa} {sx} {sy})"/>')
add(f'<ellipse cx="{sx}" cy="{sy}" rx="{srx}" ry="{sry}" fill="{SAND}" stroke="{INK}" stroke-width="1.3" '
    f'transform="rotate({sa} {sx} {sy})"/>')
for k in range(3):
    add(f'<path d="M{sx - 20 + 14 * k},{sy - 3} q4,-3 8,0" fill="none" stroke="{mix(BROWN, 0.6)}" stroke-width="1" '
        f'transform="rotate({sa} {sx} {sy})"/>')

# saules et roseaux le long des berges, hors ville
for i in range(0, len(RIVER), 3):
    (x, y), _, (nx, ny) = frame(RIVER, i)
    for side in (-1, 1):
        d = RIVER_W / 2 + 12
        wx, wy = x + side * nx * d, y + side * ny * d
        if town(wx, wy, 25) or not (0 < wx < W and 0 < wy < H) or dist_to(RIVER, wx, wy) < RIVER_W / 2 + 6:
            continue
        if rng.random() < 0.6:
            tree(wx, wy, rng.uniform(7, 10), mix('#6E9B4A', 0.85))

# rues
for pts in STREETS:
    add(f'<path d="{path(pts)}" fill="none" stroke="{street}" stroke-width="12" stroke-linejoin="round"/>')

# le pont de bois (route de la plaine), dans l'axe de la route
span = [p for p in ROADS[3] if dist_to(RIVER, *p) < RIVER_W / 2 + 14]
span = [ROADS[3][max(ROADS[3].index(span[0]) - 1, 0)]] + span + [ROADS[3][min(ROADS[3].index(span[-1]) + 1, len(ROADS[3]) - 1)]]
add(f'<path d="{path([(x + 3, y + 4) for x, y in span])}" fill="none" stroke="{INK}" stroke-width="24" opacity="0.25"/>')
add(f'<path d="{path(span)}" fill="none" stroke="{INK}" stroke-width="24"/>')
add(f'<path d="{path(span)}" fill="none" stroke="{mix(BROWN, 0.7)}" stroke-width="20"/>')
acc = 0.0
for (x1, y1), (x2, y2) in zip(span, span[1:]):
    seg = math.dist((x1, y1), (x2, y2))
    ux, uy = (x2 - x1) / (seg or 1), (y2 - y1) / (seg or 1)
    t = (6 - acc % 6) % 6
    while t < seg:
        px_, py_ = x1 + ux * t, y1 + uy * t
        add(f'<line x1="{px_ - uy * 10:.1f}" y1="{py_ + ux * 10:.1f}" x2="{px_ + uy * 10:.1f}" y2="{py_ - ux * 10:.1f}" '
            f'stroke="{INK}" stroke-width="0.6"/>')
        t += 6
    acc += seg

# le Quai des Tripots : quai de planches le long de l'eau, tables à tapis vert dehors au bord de l'eau
add(f'<path d="{path(QUAI)}" fill="none" stroke="{mix(BROWN, 0.5)}" stroke-width="22" stroke-linecap="round"/>')
tripots = []
arc, last_table, last_tripot = 0.0, -99.0, -99.0
for k, i in enumerate(QUAI_I):
    (x, y), (tx, ty), (nx, ny) = frame(RIVER, i)
    if k:
        arc += math.dist(RIVER[i], RIVER[QUAI_I[k - 1]])
    ang = math.degrees(math.atan2(ty, tx))
    if arc - last_table >= 26:
        last_table = arc
        d = RIVER_W / 2 + 12
        rot_rect(x + nx * d, y + ny * d, 9, 12, ang, FELT, 0.8)
    if arc - last_tripot >= 50 and abs(y - 505) > 45:  # pas de tripot face au casino flottant
        last_tripot = arc
        d = RIVER_W / 2 + 44
        tripots.append((x + nx * d, y + ny * d, ang))
for x, y, ang in tripots:
    # maison de jeu : façade tournée vers l'eau, toit à deux pans
    house(x, y, 34, 30, BROWN, ang - 90, wall=mix(BROWN, 0.55), sw=1.3)

# le Casino flottant : bateau à aubes amarré au quai, au sommet de la boucle
ci = min(QUAI_I, key=lambda i: abs(RIVER[i][1] - 505))
(x, y), (tx, ty), (nx, ny) = frame(RIVER, ci)
ang = math.degrees(math.atan2(ty, tx))
bxc, byc = x + nx * 12, y + ny * 12
g = f'transform="translate({bxc:.1f},{byc:.1f}) rotate({ang:.1f})"'
add(f'<path d="M-62,-17 L48,-17 Q70,0 48,17 L-62,17 Z" fill="{mix(BROWN, 0.85)}" stroke="{INK}" stroke-width="1.5" {g}/>')
add(f'<rect x="-50" y="-11" width="82" height="22" fill="{PAPER}" stroke="{INK}" stroke-width="1" {g}/>')
add(f'<rect x="-46" y="-7" width="74" height="14" fill="{FELT}" stroke="{INK}" stroke-width="0.8" {g}/>')
for k in range(4):
    add(f'<circle cx="{-38 + 20 * k}" cy="0" r="3" fill="{GOLD}" stroke="{INK}" stroke-width="0.6" {g}/>')
# grande roue à aubes, à l'arrière ; deux cheminées
add(f'<rect x="-80" y="-16" width="18" height="32" fill="{RED}" stroke="{INK}" stroke-width="1.3" {g}/>')
for k in range(5):
    add(f'<line x1="{-79 + 4 * k}" y1="-16" x2="{-79 + 4 * k}" y2="16" stroke="{INK}" stroke-width="0.8" {g}/>')
for cy_ in (-5, 5):
    add(f'<circle cx="38" cy="{cy_}" r="4" fill="{INK}" {g}/>')
# amarres
for dx_ in (-40, 30):
    add(f'<line x1="{dx_}" y1="17" x2="{dx_ + 4}" y2="34" stroke="{INK}" stroke-width="1.2" {g}/>')

# péniches sur le fleuve
for yy in (130, 880):
    i = min(range(len(RIVER)), key=lambda j: abs(RIVER[j][1] - yy))
    (x, y), (tx, ty), (nx, ny) = frame(RIVER, i)
    ang = math.degrees(math.atan2(ty, tx))
    gg = f'transform="translate({x - nx * 10:.1f},{y - ny * 10:.1f}) rotate({ang:.1f})"'
    add(f'<path d="M-40,-10 L32,-10 Q44,0 32,10 L-40,10 Z" fill="{mix(BROWN, 0.75)}" stroke="{INK}" stroke-width="1.2" {gg}/>')
    for k in range(3):
        add(f'<rect x="{-32 + 20 * k}" y="-6" width="15" height="12" fill="{mix(GOLD, 0.6)}" stroke="{INK}" '
            f'stroke-width="0.7" {gg}/>')

# la Grand-Place : pavée, la Roulette Royale au centre, l'estrade du Cheval face à elle
px0, py0, px1, py1 = PLACE
add(f'<rect x="{px0}" y="{py0}" width="{px1 - px0}" height="{py1 - py0}" rx="8" fill="{mix(GOLD, 0.3)}" stroke="{INK}" '
    f'stroke-width="1.2"/>')
rx, ry, rr = ROULETTE
add(f'<circle cx="{rx}" cy="{ry}" r="{rr + 8}" fill="{mix(BROWN, 0.8)}" stroke="{INK}" stroke-width="1.6"/>')
for k in range(37):
    a0, a1 = 2 * math.pi * k / 37, 2 * math.pi * (k + 1) / 37
    c = '#2E8B57' if k == 0 else (RED if k % 2 else INK)
    pts = [(rx + rr * math.cos(a0), ry + rr * math.sin(a0)), (rx + rr * math.cos(a1), ry + rr * math.sin(a1)),
           (rx + rr * 0.72 * math.cos(a1), ry + rr * 0.72 * math.sin(a1)), (rx + rr * 0.72 * math.cos(a0), ry + rr * 0.72 * math.sin(a0))]
    add(f'<path d="{path(pts, True)}" fill="{c}" stroke="{PAPER}" stroke-width="0.5"/>')
add(f'<circle cx="{rx}" cy="{ry}" r="{rr * 0.72}" fill="{mix(BROWN, 0.55)}" stroke="{INK}" stroke-width="1.2"/>')
add(f'<circle cx="{rx}" cy="{ry}" r="{rr * 0.4}" fill="{GOLD}" stroke="{INK}" stroke-width="1.2"/>')
for k in range(4):
    a = math.pi / 4 + k * math.pi / 2
    add(f'<line x1="{rx}" y1="{ry}" x2="{rx + rr * 0.6 * math.cos(a):.1f}" y2="{ry + rr * 0.6 * math.sin(a):.1f}" '
        f'stroke="{INK}" stroke-width="3" stroke-linecap="round"/>')
add(f'<circle cx="{rx}" cy="{ry}" r="5" fill="{GOLD}" stroke="{INK}" stroke-width="1"/>')
add(f'<circle cx="{rx + rr * 0.86:.1f}" cy="{ry - 6}" r="3" fill="white" stroke="{INK}" stroke-width="0.6"/>')  # la bille
# l'estrade du Cheval à Phynances : plancher de bois, dais vert et or, marches vers la roulette
ex, ey = ESTRADE
add(f'<rect x="{ex - 30}" y="{ey - 22}" width="60" height="44" fill="{mix(BROWN, 0.7)}" stroke="{INK}" stroke-width="1.5"/>')
for k in range(1, 5):
    add(f'<line x1="{ex - 30}" y1="{ey - 22 + 8.8 * k}" x2="{ex + 30}" y2="{ey - 22 + 8.8 * k}" stroke="{INK}" '
        f'stroke-width="0.5" opacity="0.6"/>')
add(f'<rect x="{ex - 22}" y="{ey - 18}" width="44" height="18" fill="{FELT}" stroke="{INK}" stroke-width="1"/>')
add(f'<path d="M{ex - 22},{ey - 18} L{ex},{ey - 9} L{ex + 22},{ey - 18}" fill="none" stroke="{GOLD}" stroke-width="2"/>')
for k in range(3):
    add(f'<rect x="{ex + 30 + 4 * k}" y="{ey + 4 - 3 * k}" width="5" height="{18 + 6 * k}" fill="{mix(BROWN, 0.5)}" '
        f'stroke="{INK}" stroke-width="0.7"/>')
# tables à tapis vert autour de la place
for x, y in ((490, 520), (490, 545), (670, 410), (670, 530), (520, 545), (650, 545)):
    add(f'<rect x="{x - 7}" y="{y - 5}" width="14" height="10" fill="{FELT}" stroke="{INK}" stroke-width="0.8"/>')

# la Caisse du Cheval : petit comptoir à toit d'or, sur la route du champ de courses
cx_, cy_ = CAISSE
add(f'<rect x="{cx_ - 14}" y="{cy_ - 12}" width="28" height="24" fill="{GOLD}" stroke="{INK}" stroke-width="1.8"/>')
add(f'<line x1="{cx_ - 14}" y1="{cy_ - 12}" x2="{cx_ + 14}" y2="{cy_ + 12}" stroke="{INK}" stroke-width="0.7"/>'
    f'<line x1="{cx_ + 14}" y1="{cy_ - 12}" x2="{cx_ - 14}" y2="{cy_ + 12}" stroke="{INK}" stroke-width="0.7"/>')
add(f'<rect x="{cx_ - 14}" y="{cy_ + 12}" width="28" height="6" fill="{FELT}" stroke="{INK}" stroke-width="1"/>')
for k in range(3):  # sacs d'écus
    add(f'<circle cx="{cx_ + 22 + 7 * k}" cy="{cy_ + 6}" r="4" fill="{mix(GOLD, 0.8)}" stroke="{INK}" stroke-width="0.8"/>')

# le Champ de courses : piste ovale, pelouse au milieu, tribunes au nord
tx_, ty_, trx, try_ = TRACK
add(f'<ellipse cx="{tx_}" cy="{ty_}" rx="{trx + 14}" ry="{try_ + 14}" fill="{mix(BROWN, 0.45)}" stroke="{INK}" stroke-width="1.5"/>')
add(f'<ellipse cx="{tx_}" cy="{ty_}" rx="{trx - 10}" ry="{try_ - 10}" fill="{mix(GREEN, 0.55)}" stroke="{INK}" stroke-width="1.2"/>')
add(f'<ellipse cx="{tx_}" cy="{ty_}" rx="{trx + 2}" ry="{try_ + 2}" fill="none" stroke="white" stroke-width="1.2" '
    f'stroke-dasharray="6 4"/>')
add(f'<line x1="{tx_}" y1="{ty_ - try_ - 14}" x2="{tx_}" y2="{ty_ - try_ + 10}" stroke="white" stroke-width="3"/>')  # arrivée
sx0, sy0, sx1, sy1 = STANDS
add(f'<rect x="{sx0}" y="{sy0}" width="{sx1 - sx0}" height="{sy1 - sy0}" fill="{RED}" stroke="{INK}" stroke-width="1.5"/>')
for k in range(1, 8):
    xx = sx0 + (sx1 - sx0) * k / 8
    add(f'<line x1="{xx:.1f}" y1="{sy0}" x2="{xx:.1f}" y2="{sy1}" stroke="{PAPER}" stroke-width="1"/>')
for xx in (sx0 + 30, sx1 - 30):
    add(f'<line x1="{xx}" y1="{sy0}" x2="{xx}" y2="{sy0 - 14}" stroke="{INK}" stroke-width="1.2"/>'
        f'<path d="M{xx},{sy0 - 14} l12,4 l-12,4 Z" fill="{GOLD}" stroke="{INK}" stroke-width="0.6"/>')
# obstacles : haies sur la piste
for a in (200, 340):
    r_ = math.radians(a)
    hx, hy = tx_ + (trx + 2) * math.cos(r_), ty_ + (try_ + 2) * math.sin(r_)
    add(f'<rect x="{hx - 3:.1f}" y="{hy - 9:.1f}" width="6" height="18" fill="{mix(TREE, 0.85)}" stroke="{INK}" '
        f'stroke-width="0.7" transform="rotate({a + 90} {hx:.1f} {hy:.1f})"/>')

# maisons : bois brun des tripots, toits d'ardoise ou de tuile
FEATURES = [PLACE, (ex - 34, ey - 26, ex + 50, ey + 26), (cx_ - 20, cy_ - 18, cx_ + 46, cy_ + 22)]
PLACED = []


def occupied(x, y, m=0):
    if any(in_box(x, y, b, 6 + m) for b in FEATURES) or track(x, y, m):
        return True
    if dist_to(RIVER, x, y) < RIVER_W / 2 + 10 + m or dist_to(QUAI, x, y) < 16 + m:
        return True
    if any(math.hypot(x - tx, y - ty) < 30 + m for tx, ty, _ in tripots):
        return True
    return any(dist_to(pts, x, y) < 10 + m for pts in STREETS)


def free_box(x, y, w, h):
    if occupied(x + w / 2, y + h / 2) or any(occupied(px, py, -5) for px, py in ((x, y), (x + w, y), (x, y + h), (x + w, y + h))):
        return False
    if any(x < bx + bw + 2 and bx < x + w + 2 and y < by + bh + 2 and by < y + h + 2 for bx, by, bw, bh in PLACED):
        return False
    PLACED.append((x, y, w, h))
    return True


rng = random.Random(3)
for gx_ in range(110, 780, 13):
    for gy_ in range(190, 760, 12):
        x, y = gx_ + rng.uniform(-4, 4), gy_ + rng.uniform(-3, 3)
        if not town(x, y) or occupied(x, y) or rng.random() < 0.04:
            continue
        roof = rng.choice((BROWN, mix(BROWN, 0.8), SLATE, TILE, TILE))
        wall = rng.choice(('#E9DCC0', '#E9DCC0', mix(BROWN, 0.45), '#F3E7CF'))
        w, h = rng.choice([(22, 17), (16, 19), (26, 16), (18, 18), (14, 17), (30, 18)])
        if free_box(x - w / 2, y - h / 2, w, h):
            house(x, y, w, h, roof, wall=wall)

if not IA:
    font = 'font-family="Georgia, serif"'
    qm = QUAI[len(QUAI) // 3]
    marks = [(1, rx + 50, ry - 70), (2, qm[0] + 50, qm[1] + 5), (3, bxc - 50, byc), (4, tx_, ty_), (5, cx_ + 2, cy_ - 30)]
    for n, x, y in marks:
        add(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="11" fill="{INK}"/><text x="{x:.1f}" y="{y + 4.5:.1f}" '
            f'text-anchor="middle" font-size="13" fill="{PAPER}" {font} font-weight="bold">{n}</text>')
    add(f'<text x="575" y="20" text-anchor="end" font-size="16" font-style="italic" fill="{INK}" {font} '
        f'paint-order="stroke" stroke="{PAPER}" stroke-width="4">la Vistule</text>')
    for txt, x, y, anchor in (('vers Sinusborg', 760, 20, 'start'), ('vers Sandomir', 985, 425, 'end'),
                              ('vers Empoche-les-Bains', 812, 985, 'start'), ('vers la plaine', 15, 245, 'start')):
        add(f'<text x="{x}" y="{y}" text-anchor="{anchor}" font-size="13" font-style="italic" fill="{INK}" {font} '
            f'paint-order="stroke" stroke="{PAPER}" stroke-width="4">{txt}</text>')
    legend = ['1 La Grand-Place (Roulette Royale, estrade)', '2 Le Quai des Tripots', '3 Le Casino flottant',
              '4 Le Champ de courses', '5 La Caisse du Cheval']
    add(f'<rect x="15" y="{H - 30 - 22 * len(legend) - 30}" width="340" height="{22 * len(legend) + 20}" '
        f'fill="{PAPER}" stroke="{INK}" stroke-width="1.2" opacity="0.95"/>')
    for k, line in enumerate(legend):
        add(f'<text x="27" y="{H - 44 - 22 * (len(legend) - k)}" font-size="14" fill="{INK}" {font}>{line}</text>')

add('</svg>')
with open(sys.argv[1], 'w') as f:
    f.write('\n'.join(out))
