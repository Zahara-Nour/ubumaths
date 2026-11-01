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


# la plaine : champs en damier, blé, prairies, labours, bordés de haies
rng = random.Random(11)
fields = []
for gx in range(-40, W + 40, 92):
    for gy in range(-40, H + 40, 76):
        x0, y0 = gx + rng.uniform(-10, 10), gy + rng.uniform(-8, 8)
        w, h = rng.uniform(80, 104), rng.uniform(64, 84)
        fields.append((x0, y0, w, h))
for x0, y0, w, h in fields:
    cx, cy = x0 + w / 2, y0 + h / 2
    if town(cx, cy, 30) or track(cx, cy, 10):
        continue
    c = rng.choice((mix(GOLD, 0.55), mix(GOLD, 0.4), mix(GREEN, 0.45), mix(GREEN, 0.35), mix(BROWN, 0.3)))
    add(f'<rect x="{x0:.1f}" y="{y0:.1f}" width="{w:.1f}" height="{h:.1f}" fill="{c}" stroke="{mix(TREE, 0.7)}" '
        f'stroke-width="3" stroke-dasharray="5 3"/>')
    if rng.random() < 0.5:  # sillons
        for k in range(1, 6):
            yy = y0 + h * k / 6
            add(f'<line x1="{x0 + 5:.1f}" y1="{yy:.1f}" x2="{x0 + w - 5:.1f}" y2="{yy:.1f}" stroke="{INK}" '
                f'stroke-width="0.5" opacity="0.3"/>')
# arbres de haie isolés
for x0, y0, w, h in fields:
    if rng.random() < 0.45:
        x, y = x0 + rng.choice((0, w)), y0 + rng.uniform(0, h)
        if not town(x, y, 30) and not track(x, y) and dist_to(RIVER, x, y) > RIVER_W / 2 + 10:
            add(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{rng.uniform(6, 9):.1f}" fill="{mix(TREE, 0.75)}" '
                f'stroke="{INK}" stroke-width="0.7"/>')

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

# rues
for pts in STREETS:
    add(f'<path d="{path(pts)}" fill="none" stroke="{street}" stroke-width="12" stroke-linejoin="round"/>')

# le pont de bois (route de la plaine)
bx, by = BRIDGE
add(f'<rect x="-{RIVER_W / 2 + 14}" y="-11" width="{RIVER_W + 28}" height="22" fill="{mix(BROWN, 0.7)}" stroke="{INK}" '
    f'stroke-width="1.3" transform="translate({bx:.1f},{by:.1f}) rotate(-75)"/>')
for k in range(-4, 5):
    add(f'<line x1="{k * 10}" y1="-11" x2="{k * 10}" y2="11" stroke="{INK}" stroke-width="0.6" '
        f'transform="translate({bx:.1f},{by:.1f}) rotate(-75)"/>')

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
    rot_rect(x, y, 30, 34, ang, BROWN, 1.3)
    add(f'<line x1="0" y1="-15" x2="0" y2="15" stroke="{PAPER}" stroke-width="0.7" opacity="0.6" '
        f'transform="translate({x:.1f},{y:.1f}) rotate({ang:.1f})"/>')

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
    return any(dist_to(pts, x, y) < 13 + m for pts in STREETS)


def free_box(x, y, w, h):
    if occupied(x + w / 2, y + h / 2) or any(occupied(px, py, -5) for px, py in ((x, y), (x + w, y), (x, y + h), (x + w, y + h))):
        return False
    if any(x < bx + bw + 3 and bx < x + w + 3 and y < by + bh + 3 and by < y + h + 3 for bx, by, bw, bh in PLACED):
        return False
    PLACED.append((x, y, w, h))
    return True


rng = random.Random(3)
for gx_ in range(110, 780, 22):
    for gy_ in range(190, 760, 20):
        x, y = gx_ + rng.uniform(-4, 4), gy_ + rng.uniform(-3, 3)
        if not town(x, y) or occupied(x, y) or rng.random() < 0.15:
            continue
        roof = rng.choice((BROWN, mix(BROWN, 0.75), SLATE, TILE))
        w, h = rng.choice([(20, 14), (14, 20), (24, 13), (16, 16), (13, 18)])
        if free_box(x - w / 2, y - h / 2, w, h):
            add(f'<rect x="{x - w / 2:.1f}" y="{y - h / 2:.1f}" width="{w}" height="{h}" fill="{roof}" stroke="{INK}" '
                f'stroke-width="1.1"/>')
            if w >= h:
                add(f'<line x1="{x - w / 2:.1f}" y1="{y:.1f}" x2="{x + w / 2:.1f}" y2="{y:.1f}" stroke="{PAPER}" '
                    f'stroke-width="0.6" opacity="0.5"/>')
            else:
                add(f'<line x1="{x:.1f}" y1="{y - h / 2:.1f}" x2="{x:.1f}" y2="{y + h / 2:.1f}" stroke="{PAPER}" '
                    f'stroke-width="0.6" opacity="0.5"/>')

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
