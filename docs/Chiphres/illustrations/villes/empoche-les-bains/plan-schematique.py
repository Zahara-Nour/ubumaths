# Plan schématique d'Empoche-les-Bains (Compendium, fiche Nombrilie, « Plan de la ville », décidé par David le 2026-10-29).
# Usage : python3 plan-schematique.py plan-schematique.svg [--reference-ia]
# Station thermale de 1880 au fond d'une vallée boisée, au pied de montagnes moyennes au sud-ouest (comme les Sudètes).
# La Vistule arrive du sud-est, longe la ville à l'est puis la contourne par le nord vers Bonneteau. La ville s'organise
# autour du grand parc thermal, entre la Place de la Gidouille (nord) et les Bains (sud) : allée centrale de
# marronniers, kiosque à musique, Buvette à colonnade sur la source chaude ; guichets de péage de Mère Ubu à l'entrée
# des Bains ; Villa des Phynances sur la pente du sud-ouest ; Promenade de la Vistule, quai planté de marronniers.
# Ni enceinte ni chiffres : l'argent (l'or) suffit à dire la province. Vapeur = brume blanche légère.
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
BRONZE = '#9C6B2E'
SLATE = '#5E6E84'
TILE = '#B5603F'
STUCCO = '#EFE3C8'
TREE = '#1F5E3A'
RIVER_W = 46


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


IA = '--reference-ia' in sys.argv
out = []
add = out.append
add(f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}">')
add(f'<rect width="{W}" height="{H}" fill="{mix(GREEN, 0.25)}"/>')
water = mix(SEA, 0.45)

# la Vistule : arrive du sud-est, longe la ville à l'est, la contourne par le nord, repart vers l'ouest (Bonneteau)
RIVER = smooth([(1030, 860), (930, 820), (840, 760), (805, 650), (808, 520), (800, 400), (775, 290), (720, 190),
                (620, 120), (470, 92), (320, 95), (170, 120), (-30, 165)])

# les montagnes moyennes du sud-ouest : teinte d'altitude, du vert de la vallée au brun des sommets
add('<defs><radialGradient id="mont" cx="0" cy="1" r="0.75" gradientUnits="objectBoundingBox">'
    f'<stop offset="0" stop-color="{mix(BROWN, 0.6)}"/><stop offset="0.55" stop-color="{mix(BROWN, 0.35)}"/>'
    f'<stop offset="1" stop-color="{mix(GREEN, 0.25)}" stop-opacity="0"/></radialGradient></defs>')
add(f'<rect x="-20" y="560" width="560" height="460" fill="url(#mont)"/>')
# sommets arrondis (montagnes moyennes, sans neige), en rangées
for x0, y0, s in ((70, 900, 120), (200, 960, 110), (40, 760, 90), (330, 975, 80), (150, 820, 80), (260, 870, 70)):
    add(f'<path d="M{x0 - s},{y0 + 20} Q{x0 - s * 0.4},{y0 - s * 0.55} {x0},{y0 - s * 0.7} Q{x0 + s * 0.4},{y0 - s * 0.55} '
        f'{x0 + s},{y0 + 20} Z" fill="{mix(BROWN, 0.5)}" stroke="{INK}" stroke-width="1.4"/>')
    add(f'<path d="M{x0},{y0 - s * 0.7} Q{x0 + s * 0.15},{y0 - s * 0.2} {x0 + s * 0.35},{y0 + 15}" fill="none" '
        f'stroke="{INK}" stroke-width="1" opacity="0.6"/>')
# collines basses : courbes de niveau douces
for x0, y0, r in ((900, 120, 130), (940, 330, 90), (120, 330, 110), (620, 940, 120), (920, 960, 110)):
    for k in range(3):
        add(f'<path d="M{x0 - r + 25 * k},{y0 + 28 * k} Q{x0},{y0 - r * 0.6 + 28 * k} {x0 + r - 25 * k},{y0 + 28 * k}" '
            f'fill="none" stroke="{mix(BROWN, 0.45)}" stroke-width="1.6"/>')

# le grand parc thermal, entre la place (nord) et les bains (sud)
PARK = (370, 335, 700, 610)
# lieux bâtis
HOTEL = (395, 170, 690, 228)          # corps principal du Grand Hôtel
WINGS = ((395, 228, 430, 300), (655, 228, 690, 300))
PLACE = (440, 238, 645, 318)
GIDOUILLE = (542, 280)
BAINS = (420, 652, 660, 728)
POOLS_BOX = (405, 728, 675, 840)
VILLA = (205, 600)

# rues : boulevard autour du parc, quartier ouest en damier, routes vers la campagne
street = mix(BROWN, 0.28)
BOULEVARD = [(352, 318), (352, 640), (720, 640), (720, 318)]
ROADS = [
    smooth([(352, 250), (250, 250), (130, 240), (-20, 250)]),                      # route de Bonneteau (ouest)
    smooth([(720, 330), (770, 330), (860, 320), (960, 290), (1020, 280)]),         # route de Sandomir (est, pont)
    smooth([(690, 690), (780, 700), (870, 690), (950, 720), (1020, 740)]),         # route de Cracovenn (sud-est, pont)
    smooth([(352, 560), (300, 575), (250, 590), (225, 600)]),                      # allée de la Villa
]
GRID = [[(150, 330), (352, 330)], [(150, 420), (352, 420)], [(150, 505), (352, 505)],
        [(200, 250), (200, 540)], [(275, 250), (275, 560)], [(352, 250), (352, 318)],
        [(430, 300), (440, 300)]]
STREETS = [BOULEVARD + [BOULEVARD[0]]] + ROADS + GRID
# rues du faubourg de la rive est
EAST = [[(850, 330), (850, 690)], [(850, 450), (990, 450)], [(850, 570), (990, 570)], [(920, 320), (920, 700)]]
STREETS += EAST
PROMENADE = [(x - RIVER_W / 2 - 24, y) for x, y in RIVER if 300 <= y <= 700]


def river_x(y):
    pts = [p for p in RIVER if p[0] > 700]
    return min(pts, key=lambda p: abs(p[1] - y))[0]


# forêts sur les collines (vallée boisée), hors ville, eau et sommets
rng = random.Random(5)


def in_box(x, y, b, m=0):
    return b[0] - m < x < b[2] + m and b[1] - m < y < b[3] + m


TOWN_BOXES = [(130, 150, 360, 570), (360, 150, 730, 860), (830, 310, 1000, 720), (150, 560, 300, 680)]


def town(x, y, m=0):
    return any(in_box(x, y, b, m) for b in TOWN_BOXES)


def mountain(x, y):
    return y > 700 and x < 380 and (x - 0) ** 2 / 400 ** 2 + (y - 1000) ** 2 / 330 ** 2 < 1


trees = []
for gx in range(0, W + 1, 17):
    for gy in range(0, H + 1, 16):
        x, y = gx + rng.uniform(-6, 6), gy + rng.uniform(-6, 6)
        if town(x, y, 12) or dist_to(RIVER, x, y) < RIVER_W / 2 + 10 or any(dist_to(r, x, y) < 12 for r in ROADS[:3]):
            continue
        if mountain(x, y) and rng.random() < 0.7:
            continue
        if rng.random() < 0.82:
            trees.append((x, y, rng.uniform(7, 10)))
for x, y, r in trees:
    add(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{r:.1f}" fill="{mix(TREE, rng.uniform(0.6, 0.8))}" stroke="{INK}" '
        f'stroke-width="0.7"/>')

# la rivière
for color, width in ((INK, RIVER_W + 6), (water, RIVER_W)):
    add(f'<path d="{path(RIVER)}" fill="none" stroke="{color}" stroke-width="{width}" stroke-linejoin="round"/>')

# rues
for pts in STREETS:
    add(f'<path d="{path(pts)}" fill="none" stroke="{street}" stroke-width="12" stroke-linejoin="round"/>')
# la Promenade de la Vistule : large quai planté d'une double rangée de marronniers
add(f'<path d="{path(PROMENADE)}" fill="none" stroke="{mix(GOLD, 0.3)}" stroke-width="26"/>')
for i, (x, y) in enumerate(PROMENADE):
    if i % 2 == 0:
        for dx in (-11, 11):
            add(f'<circle cx="{x + dx:.1f}" cy="{y:.1f}" r="6" fill="{mix(TREE, 0.85)}" stroke="{INK}" stroke-width="0.8"/>')

# ponts de pierre : là où une route croise la rivière
for r in ROADS[1:3]:
    best = min(r, key=lambda p: dist_to(RIVER, *p))
    x, y = best
    add(f'<rect x="{x - RIVER_W / 2 - 10:.1f}" y="{y - 12:.1f}" width="{RIVER_W + 20}" height="24" rx="4" '
        f'fill="{mix(INK, 0.4)}" stroke="{INK}" stroke-width="1.2"/>')

# le parc thermal : pelouses, allées sinueuses à l'anglaise, allée centrale de marronniers
x0, y0, x1, y1 = PARK
add(f'<rect x="{x0}" y="{y0}" width="{x1 - x0}" height="{y1 - y0}" rx="14" fill="{mix(GREEN, 0.5)}" stroke="{INK}" '
    f'stroke-width="1.4"/>')
path_c = mix(GOLD, 0.3)
for pts in ([(380, 360), (430, 420), (420, 500), (470, 590)], [(690, 360), (640, 410), (660, 520), (610, 595)],
            [(400, 470), (470, 450), (542, 470)], [(542, 470), (610, 490), (685, 470)]):
    add(f'<path d="{path(smooth(pts))}" fill="none" stroke="{path_c}" stroke-width="7" stroke-linecap="round"/>')
add(f'<line x1="542" y1="{y0}" x2="542" y2="{y1}" stroke="{path_c}" stroke-width="16"/>')
for y in range(y0 + 14, y1 - 6, 20):
    for dx in (-17, 17):
        if abs(y - 470) > 34:
            add(f'<circle cx="{542 + dx}" cy="{y}" r="6.5" fill="{mix(TREE, 0.85)}" stroke="{INK}" stroke-width="0.8"/>')
# bosquets et arbres isolés sur les pelouses
rng = random.Random(9)
for cx, cy in ((400, 380), (660, 380), (470, 540), (640, 560), (395, 580), (685, 600), (600, 380), (470, 380)):
    for k in range(rng.choice((1, 3, 4))):
        add(f'<circle cx="{cx + rng.uniform(-10, 10):.1f}" cy="{cy + rng.uniform(-8, 8):.1f}" r="{rng.uniform(7, 10):.1f}" '
            f'fill="{mix(TREE, 0.75)}" stroke="{INK}" stroke-width="0.8"/>')
# parterres fleuris près de la place
for cx in (470, 614):
    for cy in (360, 400):
        add(f'<ellipse cx="{cx}" cy="{cy}" rx="22" ry="11" fill="{mix("#C2185B", 0.45)}" stroke="{INK}" stroke-width="1"/>')
        add(f'<ellipse cx="{cx}" cy="{cy}" rx="11" ry="5" fill="{mix(GOLD, 0.7)}"/>')

# le kiosque à musique, au milieu de l'allée centrale, sur un rond-point
add(f'<circle cx="542" cy="470" r="32" fill="{path_c}" stroke="{INK}" stroke-width="1"/>')
octo = [(542 + 18 * math.cos(math.radians(22.5 + 45 * k)), 470 + 18 * math.sin(math.radians(22.5 + 45 * k))) for k in range(8)]
add(f'<path d="{path(octo, True)}" fill="{TILE}" stroke="{INK}" stroke-width="1.5"/>')
for px, py in octo:
    add(f'<line x1="542" y1="470" x2="{px:.1f}" y2="{py:.1f}" stroke="{INK}" stroke-width="0.7"/>')
add(f'<circle cx="542" cy="470" r="3.5" fill="{GOLD}" stroke="{INK}" stroke-width="0.8"/>')


def steam(cx, cy, s=1.0):
    # brume blanche légère qui monte
    for dx, dy, r in ((0, 0, 9), (7, -10, 8), (-4, -19, 7), (5, -27, 6), (-2, -34, 5)):
        add(f'<circle cx="{cx + dx * s:.1f}" cy="{cy + dy * s:.1f}" r="{r * s:.1f}" fill="white" opacity="0.8" '
            f'stroke="{mix(INK, 0.25)}" stroke-width="0.6"/>')


# la Buvette à colonnade, à l'ouest du parc, en demi-cercle autour de la source chaude
bx, by = 408, 470
add(f'<path d="M{bx},{by - 40} A40,40 0 0 0 {bx},{by + 40}" fill="none" stroke="{INK}" stroke-width="16" '
    f'transform="translate(30,0)"/>')
add(f'<path d="M{bx},{by - 40} A40,40 0 0 0 {bx},{by + 40}" fill="none" stroke="{STUCCO}" stroke-width="12" '
    f'transform="translate(30,0)"/>')
for k in range(11):
    a = math.radians(90 + 180 * k / 10)
    add(f'<circle cx="{bx + 30 + 40 * math.cos(a):.1f}" cy="{by + 40 * math.sin(a):.1f}" r="2.6" fill="{INK}"/>')
add(f'<circle cx="{bx + 30}" cy="{by}" r="13" fill="{water}" stroke="{INK}" stroke-width="1.4"/>')
steam(bx + 30, by - 6, 0.8)

# la Place de la Gidouille : pavée d'or pâle, la grande gidouille de bronze dans son bassin
px0, py0, px1, py1 = PLACE
add(f'<rect x="{px0}" y="{py0}" width="{px1 - px0}" height="{py1 - py0}" fill="{mix(GOLD, 0.35)}" stroke="{INK}" '
    f'stroke-width="1.2"/>')
gx, gy = GIDOUILLE
add(f'<circle cx="{gx}" cy="{gy}" r="27" fill="{water}" stroke="{INK}" stroke-width="1.5"/>')
spiral = [(gx + 1.9 * t * math.cos(t), gy + 1.9 * t * math.sin(t)) for t in [k * 0.12 for k in range(0, 105)]]
add(f'<path d="{path(spiral)}" fill="none" stroke="{INK}" stroke-width="6.5" stroke-linecap="round"/>')
add(f'<path d="{path(spiral)}" fill="none" stroke="{BRONZE}" stroke-width="4" stroke-linecap="round"/>')
steam(gx + 8, gy - 22, 0.7)

# le Grand Hôtel thermal : grand bâtiment en U autour de la place, toit d'ardoise, trois dômes dorés
for x_0, y_0, x_1, y_1 in (HOTEL,) + WINGS:
    add(f'<rect x="{x_0}" y="{y_0}" width="{x_1 - x_0}" height="{y_1 - y_0}" fill="{SLATE}" stroke="{INK}" stroke-width="1.6"/>')
    add(f'<rect x="{x_0 + 4}" y="{y_0 + 4}" width="{x_1 - x_0 - 8}" height="{y_1 - y_0 - 8}" fill="none" '
        f'stroke="{PAPER}" stroke-width="0.8" opacity="0.6"/>')
for dx in (412, 542, 672):
    add(f'<circle cx="{dx}" cy="199" r="{15 if dx == 542 else 10}" fill="{GOLD}" stroke="{INK}" stroke-width="1.4"/>')
# terrasse du restaurant, sur la place, devant l'hôtel
for k in range(7):
    tx = 460 + 28 * k
    if abs(tx - gx) > 30:
        add(f'<circle cx="{tx}" cy="250" r="4" fill="white" stroke="{INK}" stroke-width="0.8"/>')

# les Bains : établissement thermal, coupole de cuivre vert, bassins ronds fumants à l'arrière
bx0, by0, bx1, by1 = BAINS
add(f'<rect x="{bx0}" y="{by0}" width="{bx1 - bx0}" height="{by1 - by0}" fill="{STUCCO}" stroke="{INK}" stroke-width="1.6"/>')
add(f'<rect x="{bx0 + 6}" y="{by0 + 6}" width="{bx1 - bx0 - 12}" height="{by1 - by0 - 12}" fill="{SLATE}" '
    f'stroke="{INK}" stroke-width="0.8"/>')
add(f'<circle cx="542" cy="690" r="28" fill="{mix("#3E8E86", 0.9)}" stroke="{INK}" stroke-width="1.6"/>')
add(f'<circle cx="542" cy="690" r="6" fill="{GOLD}" stroke="{INK}" stroke-width="1"/>')
qx0, qy0, qx1, qy1 = POOLS_BOX
add(f'<rect x="{qx0}" y="{qy0}" width="{qx1 - qx0}" height="{qy1 - qy0}" fill="{mix(STUCCO, 0.9)}" stroke="{INK}" '
    f'stroke-width="1.4"/>')
for cx, cy, r in ((460, 785, 30), (542, 790, 36), (624, 785, 30)):
    add(f'<circle cx="{cx}" cy="{cy}" r="{r + 5}" fill="{mix(STUCCO, 0.6)}" stroke="{INK}" stroke-width="1"/>')
    add(f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="{mix("#3FA7B5", 0.6)}" stroke="{INK}" stroke-width="1.3"/>')
    steam(cx, cy - 4, 0.9)
# les guichets de péage de Mère Ubu : une rangée de petites loges à toit d'or, barrière entre elles, devant l'entrée
for k in range(6):
    tx = 467 + 30 * k
    add(f'<rect x="{tx - 8}" y="622" width="16" height="16" fill="{GOLD}" stroke="{INK}" stroke-width="1.3"/>')
    add(f'<line x1="{tx - 8}" y1="622" x2="{tx + 8}" y2="638" stroke="{INK}" stroke-width="0.7"/>'
        f'<line x1="{tx + 8}" y1="622" x2="{tx - 8}" y2="638" stroke="{INK}" stroke-width="0.7"/>')
    if k < 5:
        add(f'<line x1="{tx + 8}" y1="630" x2="{tx + 22}" y2="630" stroke="{INK}" stroke-width="2.4"/>')
add(f'<rect x="530" y="638" width="24" height="14" fill="{path_c}"/>')  # passage d'entrée

# la Villa des Phynances : villa cossue sur la pente, jardin clos, salle des coffres à toit d'or
vx, vy = VILLA
add(f'<rect x="{vx - 70}" y="{vy - 50}" width="140" height="105" rx="6" fill="{mix(GREEN, 0.55)}" stroke="{INK}" '
    f'stroke-width="2.2"/>')  # mur du jardin
for cx, cy in ((vx - 50, vy + 35), (vx + 50, vy + 35), (vx - 50, vy - 30), (vx + 50, vy - 30)):
    add(f'<circle cx="{cx}" cy="{cy}" r="8" fill="{mix(TREE, 0.85)}" stroke="{INK}" stroke-width="0.8"/>')
add(f'<rect x="{vx - 32}" y="{vy - 26}" width="64" height="38" fill="{TILE}" stroke="{INK}" stroke-width="1.6"/>')
add(f'<line x1="{vx - 32}" y1="{vy - 7}" x2="{vx + 32}" y2="{vy - 7}" stroke="{INK}" stroke-width="0.8"/>')
add(f'<rect x="{vx + 32}" y="{vy - 16}" width="22" height="22" fill="{GOLD}" stroke="{INK}" stroke-width="2.6"/>')
add(f'<circle cx="{vx + 43}" cy="{vy - 5}" r="4" fill="none" stroke="{INK}" stroke-width="1.4"/>')
add(f'<path d="M{vx - 8},{vy + 12} L{vx - 8},{vy + 55} M{vx + 8},{vy + 12} L{vx + 8},{vy + 55}" stroke="{path_c}" '
    f'stroke-width="5"/>')

# maisons bourgeoises : villas et immeubles crème, toits d'ardoise ou de tuile, jardins
FEATURES = [HOTEL, *WINGS, PLACE, BAINS, POOLS_BOX, (PARK[0] - 6, PARK[1] - 6, PARK[2] + 6, PARK[3] + 6),
            (vx - 76, vy - 56, vx + 76, vy + 61), (455, 618, 630, 652)]
PLACED = []


def occupied(x, y, m=0):
    if any(in_box(x, y, b, 6 + m) for b in FEATURES):
        return True
    if dist_to(RIVER, x, y) < RIVER_W / 2 + 10 + m or dist_to(PROMENADE, x, y) < 22 + m:
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
for gx_ in range(130, 1000, 24):
    for gy_ in range(140, 880, 22):
        x, y = gx_ + rng.uniform(-4, 4), gy_ + rng.uniform(-3, 3)
        if not town(x, y) or occupied(x, y):
            continue
        roof = rng.choice((SLATE, SLATE, TILE, mix(TILE, 0.8)))
        r = rng.random()
        if r < 0.25:  # villa dans son jardin
            if free_box(x - 14, y - 12, 28, 24):
                add(f'<rect x="{x - 14:.1f}" y="{y - 12:.1f}" width="28" height="24" fill="{mix(GREEN, 0.5)}" '
                    f'stroke="{INK}" stroke-width="0.8"/>')
                add(f'<rect x="{x - 8:.1f}" y="{y - 7:.1f}" width="14" height="11" fill="{roof}" stroke="{INK}" stroke-width="1"/>')
                add(f'<circle cx="{x + 8:.1f}" cy="{y + 6:.1f}" r="4.5" fill="{mix(TREE, 0.8)}" stroke="{INK}" stroke-width="0.7"/>')
        elif r < 0.35:
            continue
        else:  # immeuble ou maison mitoyenne
            w, h = rng.choice([(20, 13), (13, 20), (24, 12), (16, 16), (12, 18)])
            if free_box(x - w / 2, y - h / 2, w, h):
                add(f'<rect x="{x - w / 2:.1f}" y="{y - h / 2:.1f}" width="{w}" height="{h}" fill="{roof}" stroke="{INK}" '
                    f'stroke-width="1.1"/>')
                if w >= h:
                    add(f'<line x1="{x - w / 2:.1f}" y1="{y:.1f}" x2="{x + w / 2:.1f}" y2="{y:.1f}" stroke="{INK}" '
                        f'stroke-width="0.6" opacity="0.5"/>')
                else:
                    add(f'<line x1="{x:.1f}" y1="{y - h / 2:.1f}" x2="{x:.1f}" y2="{y + h / 2:.1f}" stroke="{INK}" '
                        f'stroke-width="0.6" opacity="0.5"/>')

if not IA:
    font = 'font-family="Georgia, serif"'
    marks = [(1, gx - 50, gy + 10), (2, 610, 440), (3, bx + 30, by + 60), (4, 690, 760), (5, vx, vy - 70), (6, 735, 520)]
    for n, x, y in marks:
        add(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="11" fill="{INK}"/><text x="{x:.1f}" y="{y + 4.5:.1f}" '
            f'text-anchor="middle" font-size="13" fill="{PAPER}" {font} font-weight="bold">{n}</text>')
    add(f'<text x="250" y="80" text-anchor="middle" font-size="16" font-style="italic" fill="{INK}" {font} '
        f'paint-order="stroke" stroke="{PAPER}" stroke-width="4">la Vistule</text>')
    for txt, x, y, anchor in (('vers Bonneteau', 20, 236, 'start'), ('vers Sandomir', 985, 268, 'end'),
                              ('vers Cracovenn', 985, 768, 'end')):
        add(f'<text x="{x}" y="{y}" text-anchor="{anchor}" font-size="13" font-style="italic" fill="{INK}" {font} '
            f'paint-order="stroke" stroke="{PAPER}" stroke-width="4">{txt}</text>')
    legend = ['1 Place de la Gidouille et Grand Hôtel', '2 Le Parc thermal (kiosque)', '3 La Buvette à colonnade',
              '4 Les Bains (guichets de péage)', '5 La Villa des Phynances', '6 La Promenade de la Vistule']
    add(f'<rect x="{W - 330}" y="{H - 30 - 22 * len(legend) - 30}" width="320" height="{22 * len(legend) + 20}" '
        f'fill="{PAPER}" stroke="{INK}" stroke-width="1.2" opacity="0.95"/>')
    for k, line in enumerate(legend):
        add(f'<text x="{W - 318}" y="{H - 44 - 22 * (len(legend) - k)}" font-size="14" fill="{INK}" {font}>{line}</text>')

add('</svg>')
with open(sys.argv[1], 'w') as f:
    f.write('\n'.join(out))
