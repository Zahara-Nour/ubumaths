# Plan schématique de Cracovenn (Compendium, fiche Patatovie, « Plan de la ville », décidé par David le 2026-10-29).
# Usage : python3 plan-schematique.py plan-schematique.svg [--reference-ia]
# Trois enceintes rondes qui se chevauchent : la ville est un diagramme de Venn habitable. Le diagramme se voit par les
# matériaux, sans étiquette : enceinte A en brique rouge (nord-ouest), B en pierre grise (nord-est), C en bois clair
# (sud). Chaque maison est bâtie dans les matériaux des enceintes qui l'entourent (toit partagé en bandes). Au centre
# (A ∩ B ∩ C), la bibliothèque de Faustroll mêle les trois. Hors des enceintes (le complémentaire) : faubourgs et
# champs de patates. La Vistule traverse la ville par l'enceinte C ; trois portes, une par enceinte.
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
PURPLE = '#8F2447'
BRICK = '#B5452F'
STONE = '#8C8C88'
WOOD = '#D9B57A'
RIVER_W = 44

# centres et rayon des trois enceintes (triangle équilatéral autour du centre de la ville)
CENTER = (500, 470)
R = 190
D = 125  # distance d'un centre d'enceinte au centre de la ville
WALLS = {
    'A': (CENTER[0] + D * math.cos(math.radians(210)), CENTER[1] + D * math.sin(math.radians(210))),
    'B': (CENTER[0] + D * math.cos(math.radians(330)), CENTER[1] + D * math.sin(math.radians(330))),
    'C': (CENTER[0], CENTER[1] + D),
}
MATERIAL = {'A': BRICK, 'B': STONE, 'C': WOOD}
# une porte par enceinte, sur le côté extérieur (opposé au centre)
GATES = {k: (cx + R * (cx - CENTER[0]) / D, cy + R * (cy - CENTER[1]) / D) for k, (cx, cy) in WALLS.items()}


def mix(c, t, base=PAPER):
    a = [int(c[i:i + 2], 16) for i in (1, 3, 5)]
    b = [int(base[i:i + 2], 16) for i in (1, 3, 5)]
    return '#' + ''.join(f'{round(b[i] + (a[i] - b[i]) * t):02X}' for i in range(3))


def path(pts, close=False):
    d = 'M' + ' L'.join(f'{x:.1f},{y:.1f}' for x, y in pts)
    return d + (' Z' if close else '')


def dist_to(pts, x, y):
    best = 1e9
    for (x1, y1), (x2, y2) in zip(pts, pts[1:]):
        dx, dy = x2 - x1, y2 - y1
        t = max(0, min(1, ((x - x1) * dx + (y - y1) * dy) / (dx * dx + dy * dy or 1)))
        best = min(best, math.hypot(x - x1 - t * dx, y - y1 - t * dy))
    return best


def inside(x, y):
    # enceintes qui entourent le point, dans l'ordre A, B, C
    return [k for k, (cx, cy) in WALLS.items() if math.hypot(x - cx, y - cy) < R]


def near_wall(x, y, margin):
    return any(abs(math.hypot(x - cx, y - cy) - R) < margin for cx, cy in WALLS.values())


IA = '--reference-ia' in sys.argv
out = []
add = out.append
add(f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}">')
add(f'<rect width="{W}" height="{H}" fill="{mix(GREEN, 0.22)}"/>')
water = mix(SEA, 0.45)

# collines rondes et douces aux coins (pas de montagnes)
for x0, y0, r in ((90, 90, 120), (930, 120, 110), (80, 930, 130), (950, 900, 120)):
    for k in range(3):
        add(f'<path d="M{x0 - r + 25 * k},{y0 + 30 * k} Q{x0},{y0 - r * 0.7 + 30 * k} {x0 + r - 25 * k},{y0 + 30 * k}" '
            f'fill="none" stroke="{mix(BROWN, 0.45)}" stroke-width="1.6"/>')

# la Vistule : arrive de l'est, traverse l'enceinte C par le sud de la ville, repart vers l'ouest
RIVER = [(x, 700 + 38 * math.sin((x - 60) / 150) + 14 * math.sin(x / 47)) for x in range(-20, W + 21, 10)]


def river_y(x):
    return min(RIVER, key=lambda p: abs(p[0] - x))[1]


# champs de patates en rangs (fleurs blanches et mauves) et vergers, hors des enceintes
rng = random.Random(11)
FIELDS = [(40, 230, 150, 110, 0), (40, 380, 120, 150, 1), (820, 250, 150, 120, 1), (840, 420, 130, 140, 0),
          (230, 840, 170, 90, 0), (600, 850, 180, 80, 1), (120, 790, 110, 60, 1), (820, 800, 130, 70, 0),
          (330, 30, 150, 80, 1), (560, 30, 140, 80, 0)]
for fx, fy, fw, fh, vertical in FIELDS:
    add(f'<rect x="{fx}" y="{fy}" width="{fw}" height="{fh}" fill="{mix(BROWN, 0.28)}" stroke="{INK}" stroke-width="1"/>')
    if vertical:
        for x in range(fx + 8, fx + fw - 4, 12):
            add(f'<line x1="{x}" y1="{fy + 4}" x2="{x}" y2="{fy + fh - 4}" stroke="{mix(GREEN, 0.75)}" stroke-width="4"/>')
            for y in range(fy + 10, fy + fh - 6, 14):
                add(f'<circle cx="{x}" cy="{y}" r="1.8" fill="{rng.choice((PAPER, "#B9A3D6"))}"/>')
    else:
        for y in range(fy + 8, fy + fh - 4, 12):
            add(f'<line x1="{fx + 4}" y1="{y}" x2="{fx + fw - 4}" y2="{y}" stroke="{mix(GREEN, 0.75)}" stroke-width="4"/>')
            for x in range(fx + 10, fx + fw - 6, 14):
                add(f'<circle cx="{x}" cy="{y}" r="1.8" fill="{rng.choice((PAPER, "#B9A3D6"))}"/>')
for ox, oy in ((60, 600), (900, 610), (420, 930)):  # vergers
    for i in range(3):
        for j in range(3):
            add(f'<circle cx="{ox + 22 * i}" cy="{oy + 20 * j}" r="7" fill="{mix("#1F5E3A", 0.7)}" stroke="{INK}" '
                f'stroke-width="0.9"/>')

# la rivière
for color, width in ((INK, RIVER_W + 6), (water, RIVER_W)):
    add(f'<path d="{path(RIVER)}" fill="none" stroke="{color}" stroke-width="{width}" stroke-linejoin="round"/>')

# fond des enceintes : terre battue claire, pour que les trois cercles se lisent
for k, (cx, cy) in WALLS.items():
    add(f'<circle cx="{cx:.1f}" cy="{cy:.1f}" r="{R}" fill="{mix(GOLD, 0.12)}"/>')
# la rivière repasse par-dessus le fond
for color, width in ((INK, RIVER_W + 6), (water, RIVER_W)):
    add(f'<path d="{path(RIVER)}" fill="none" stroke="{color}" stroke-width="{width}" stroke-linejoin="round"/>')

# rues : de chaque porte au centre, puis au-delà vers la campagne ; les rues de C franchissent la Vistule
street = mix(BROWN, 0.3)
ROADS = []
for k, (gx, gy) in GATES.items():
    ux, uy = (gx - CENTER[0]) / math.hypot(gx - CENTER[0], gy - CENTER[1]), (gy - CENTER[1]) / math.hypot(gx - CENTER[0], gy - CENTER[1])
    ROADS.append([CENTER, (gx + ux * 250, gy + uy * 250)])
# boulevard circulaire autour de la bibliothèque : il passe par les six quartiers qui l'entourent et franchit les
# murs intérieurs par des passages (essai Nano Banana du 2026-10-30 : sans passage dessiné, des quartiers fermés)
RING_R = 118
RING = [(CENTER[0] + RING_R * math.cos(math.radians(a)), CENTER[1] + RING_R * math.sin(math.radians(a)))
        for a in range(0, 361, 4)]
STREETS = ROADS + [RING]
for pts in STREETS:
    add(f'<path d="{path(pts)}" fill="none" stroke="{street}" stroke-width="12"/>')
# quai le long de la Vistule, dans l'enceinte C
QUAI = [(x, river_y(x) - RIVER_W / 2 - 9) for x in range(int(WALLS['C'][0] - R + 30), int(WALLS['C'][0] + R - 29), 10)]
QUAI = [p for p in QUAI if 'C' in inside(*p)]
add(f'<path d="{path(QUAI)}" fill="none" stroke="{street}" stroke-width="9"/>')

# ponts : là où une rue croise la rivière
BRIDGES = []
for (x1, y1), (x2, y2) in ROADS:
    for k in range(400):
        t = k / 400
        x, y = x1 + (x2 - x1) * t, y1 + (y2 - y1) * t
        if abs(y - river_y(x)) < 2:
            BRIDGES.append((x, y))
            break
for x, y in BRIDGES:
    add(f'<rect x="{x - 12:.1f}" y="{y - RIVER_W / 2 - 8:.1f}" width="24" height="{RIVER_W + 16}" rx="4" '
        f'fill="{mix(INK, 0.4)}" stroke="{INK}" stroke-width="1.2"/>')

LIB_R = 46


def occupied(x, y, margin=0):
    if math.hypot(x - CENTER[0], y - CENTER[1]) < LIB_R + 18 + margin:
        return True
    if abs(y - river_y(x)) < RIVER_W / 2 + 14 + margin:
        return True
    if any(dist_to(pts, x, y) < 15 + margin for pts in STREETS):
        return True
    if QUAI and dist_to(QUAI, x, y) < 12 + margin:
        return True
    return near_wall(x, y, 14 + margin)


def house(x, y, w, h, mats):
    # toit partagé en bandes égales, une par matériau des enceintes qui entourent la maison
    horiz = w >= h
    n = len(mats)
    for i, m in enumerate(mats):
        if horiz:
            add(f'<rect x="{x + w * i / n:.1f}" y="{y:.1f}" width="{w / n:.1f}" height="{h}" fill="{m}"/>')
        else:
            add(f'<rect x="{x:.1f}" y="{y + h * i / n:.1f}" width="{w}" height="{h / n:.1f}" fill="{m}"/>')
    add(f'<rect x="{x:.1f}" y="{y:.1f}" width="{w}" height="{h}" fill="none" stroke="{INK}" stroke-width="1.1"/>')
    if horiz:
        add(f'<line x1="{x:.1f}" y1="{y + h / 2:.1f}" x2="{x + w:.1f}" y2="{y + h / 2:.1f}" stroke="{INK}" '
            f'stroke-width="0.6" opacity="0.5"/>')
    else:
        add(f'<line x1="{x + w / 2:.1f}" y1="{y:.1f}" x2="{x + w / 2:.1f}" y2="{y + h:.1f}" stroke="{INK}" '
            f'stroke-width="0.6" opacity="0.5"/>')


# maisons : dans les enceintes, serrées, aux matériaux de leurs enceintes ; hors des enceintes, faubourg clairsemé
PLACED = []


def free_box(x, y, w, h):
    # place libre pour une boîte (ni chevauchement, ni rue, ni mur) ; la réserve si oui
    if occupied(x + w / 2, y + h / 2) or any(occupied(px, py, -6) for px, py in ((x, y), (x + w, y), (x, y + h), (x + w, y + h))):
        return False
    if any(x < bx + bw + 1.5 and bx < x + w + 1.5 and y < by + bh + 1.5 and by < y + h + 1.5 for bx, by, bw, bh in PLACED):
        return False
    PLACED.append((x, y, w, h))
    return True


THATCH = '#E9E4D6'  # faubourg : murs chaulés, ni brique, ni pierre, ni bois
rng = random.Random(7)
for gx in range(60, 941, 25):
    for gy in range(60, 941, 22):
        x, y = gx + rng.uniform(-4, 4), gy + rng.uniform(-3, 3)
        if occupied(x, y):
            continue
        ks = inside(x, y)
        if ks:
            mats = [mix(MATERIAL[k], 0.85) for k in ks]
            r = rng.random()
            if r < 0.05:
                continue  # petite cour
            if r < 0.10:  # jardin planté
                if free_box(x - 11, y - 10, 22, 20):
                    add(f'<rect x="{x - 11:.1f}" y="{y - 10:.1f}" width="22" height="20" rx="3" fill="{mix(GREEN, 0.4)}" '
                        f'stroke="{INK}" stroke-width="0.8"/><circle cx="{x:.1f}" cy="{y:.1f}" r="6" '
                        f'fill="{mix("#1F5E3A", 0.7)}" stroke="{INK}" stroke-width="0.8"/>')
            elif r < 0.13:  # placette au puits
                if free_box(x - 12, y - 10, 24, 20):
                    add(f'<rect x="{x - 12:.1f}" y="{y - 10:.1f}" width="24" height="20" fill="{mix(GOLD, 0.35)}" '
                        f'stroke="{INK}" stroke-width="0.8"/><circle cx="{x:.1f}" cy="{y:.1f}" r="3.5" fill="{water}" '
                        f'stroke="{INK}" stroke-width="0.8"/>')
            elif r < 0.21:  # maison en L
                if free_box(x - 13, y - 11, 26, 22):
                    house(x - 13, y - 11, 26, 9, mats)
                    house(x - 13, y - 2, 10, 13, mats)
            elif r < 0.27:  # maison à cour fermée
                if free_box(x - 15, y - 13, 30, 26):
                    house(x - 15, y - 13, 30, 7, mats)
                    house(x - 15, y + 6, 30, 7, mats)
                    house(x - 15, y - 6, 7, 12, mats)
                    house(x + 8, y - 6, 7, 12, mats)
            elif r < 0.33:  # grande halle ou maison de maître
                w, h = rng.choice([(34, 15), (15, 32), (26, 22)])
                if free_box(x - w / 2, y - h / 2, w, h):
                    house(x - w / 2, y - h / 2, w, h, mats)
            elif r < 0.37:  # tour ronde
                if free_box(x - 9, y - 9, 18, 18):
                    n = len(mats)
                    for i, m in enumerate(mats):
                        a0, a1 = 2 * math.pi * i / n, 2 * math.pi * (i + 1) / n
                        if n == 1:
                            add(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="8" fill="{m}"/>')
                        else:
                            add(f'<path d="M{x:.1f},{y:.1f} L{x + 8 * math.cos(a0):.1f},{y + 8 * math.sin(a0):.1f} '
                                f'A8,8 0 0 1 {x + 8 * math.cos(a1):.1f},{y + 8 * math.sin(a1):.1f} Z" fill="{m}"/>')
                    add(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="8" fill="none" stroke="{INK}" stroke-width="1.1"/>'
                        f'<circle cx="{x:.1f}" cy="{y:.1f}" r="2" fill="{INK}"/>')
            else:  # maisons ordinaires, de tailles variées
                w, h = rng.choice([(10, 16), (16, 11), (20, 14), (14, 14), (24, 11), (11, 22), (8, 12), (18, 18)])
                if free_box(x - w / 2, y - h / 2, w, h):
                    house(x - w / 2, y - h / 2, w, h, mats)
        else:
            # faubourg : quelques maisons chaulées près des rues et de l'enceinte, pas dans les champs
            if any(fx - 6 < x < fx + fw + 6 and fy - 6 < y < fy + fh + 6 for fx, fy, fw, fh, _ in FIELDS):
                continue
            close = min(math.hypot(x - cx, y - cy) for cx, cy in WALLS.values()) - R
            near_road = min(dist_to(pts, x, y) for pts in ROADS) < 45
            if (close < 45 or near_road) and rng.random() < 0.45:
                w, h = rng.choice([(14, 12), (12, 14), (16, 12)])
                house(x - w / 2, y - h / 2, w, h, [THATCH])

# deuxième passe : petites maisons serrées dans les vides laissés par les grandes
for gx in range(60, 941, 9):
    for gy in range(60, 941, 9):
        x, y = gx + rng.uniform(-2, 2), gy + rng.uniform(-2, 2)
        ks = inside(x, y)
        if not ks or occupied(x, y) or rng.random() < 0.3:
            continue
        w, h = rng.choice([(10, 14), (14, 10), (12, 12), (16, 10), (10, 16), (9, 9)])
        if free_box(x - w / 2, y - h / 2, w, h):
            house(x - w / 2, y - h / 2, w, h, [mix(MATERIAL[k], 0.85) for k in ks])

# les trois enceintes : brique (A), pierre (B), palissade de bois (C)
for k, (cx, cy) in WALLS.items():
    add(f'<circle cx="{cx:.1f}" cy="{cy:.1f}" r="{R}" fill="none" stroke="{INK}" stroke-width="16"/>')
    add(f'<circle cx="{cx:.1f}" cy="{cy:.1f}" r="{R}" fill="none" stroke="{MATERIAL[k]}" stroke-width="12"/>')
    if k == 'A':  # joints de brique
        add(f'<circle cx="{cx:.1f}" cy="{cy:.1f}" r="{R}" fill="none" stroke="{INK}" stroke-width="12" '
            f'stroke-dasharray="1 7" opacity="0.45"/>')
    elif k == 'B':  # créneaux de pierre
        add(f'<circle cx="{cx:.1f}" cy="{cy:.1f}" r="{R + 4}" fill="none" stroke="{INK}" stroke-width="5" '
            f'stroke-dasharray="6 6" opacity="0.5"/>')
    else:  # pieux de la palissade
        add(f'<circle cx="{cx:.1f}" cy="{cy:.1f}" r="{R}" fill="none" stroke="{BROWN}" stroke-width="12" '
            f'stroke-dasharray="1.5 4.5" opacity="0.6"/>')


def crossings(pts, cx, cy):
    # points où une polyligne franchit le cercle d'une enceinte
    res = []
    for (x1, y1), (x2, y2) in zip(pts, pts[1:]):
        d1, d2 = math.hypot(x1 - cx, y1 - cy) - R, math.hypot(x2 - cx, y2 - cy) - R
        if d1 * d2 < 0:
            t = d1 / (d1 - d2)
            res.append((x1 + (x2 - x1) * t, y1 + (y2 - y1) * t))
    return res


def opening(k, x, y, length, fill, towers):
    # trouée dans l'enceinte k, le long de la tangente, encadrée de deux piliers (ou tours rondes) du même matériau
    cx, cy = WALLS[k]
    ang = math.degrees(math.atan2(y - cy, x - cx)) + 90
    g = f'<g transform="translate({x:.1f},{y:.1f}) rotate({ang:.1f})">'
    g += f'<rect x="{-length / 2:.1f}" y="-10" width="{length:.1f}" height="20" fill="{fill}"/>'
    for sx in (-1, 1):
        px = sx * (length / 2 + 4)
        if towers:
            g += f'<circle cx="{px:.1f}" cy="0" r="10" fill="{MATERIAL[k]}" stroke="{INK}" stroke-width="1.4"/>'
        else:
            g += f'<rect x="{px - 5:.1f}" y="-10" width="10" height="20" fill="{MATERIAL[k]}" stroke="{INK}" stroke-width="1.3"/>'
    add(g + '</g>')


# la palissade de bois s'arrête aux deux rives de la Vistule, une tour de bois sur chaque rive (David, 2026-10-30 :
# une palissade posée sur l'eau, pas terrible)
for x, y in crossings(RIVER, *WALLS['C']):
    opening('C', x, y, RIVER_W + 18, water, True)
# passages là où une rue franchit un mur intérieur (les portes extérieures sont dessinées plus bas)
for pts in STREETS:
    for k, (cx, cy) in WALLS.items():
        for x, y in crossings(pts, cx, cy):
            if math.hypot(x - GATES[k][0], y - GATES[k][1]) > 5:
                opening(k, x, y, 16, street, False)

# trois portes, une par enceinte, dans le matériau de leur enceinte
for k, (gx, gy) in GATES.items():
    ang = math.degrees(math.atan2(gy - CENTER[1], gx - CENTER[0]))
    add(f'<g transform="translate({gx:.1f},{gy:.1f}) rotate({ang + 90:.1f})">'
        f'<rect x="-22" y="-14" width="12" height="28" fill="{MATERIAL[k]}" stroke="{INK}" stroke-width="1.4"/>'
        f'<rect x="10" y="-14" width="12" height="28" fill="{MATERIAL[k]}" stroke="{INK}" stroke-width="1.4"/>'
        f'<path d="M-10,-6 Q0,-16 10,-6" fill="none" stroke="{INK}" stroke-width="1.4"/></g>')

# la bibliothèque de Faustroll : rotonde partagée en trois secteurs (brique, pierre, bois), coupole d'or
lx, ly = CENTER
add(f'<circle cx="{lx}" cy="{ly}" r="{LIB_R + 12}" fill="{mix(GOLD, 0.25)}" stroke="{INK}" stroke-width="1.2"/>')  # place
for i, k in enumerate(('A', 'B', 'C')):
    a0 = math.radians(210 + 120 * i - 60)
    a1 = math.radians(210 + 120 * i + 60)
    add(f'<path d="M{lx},{ly} L{lx + LIB_R * math.cos(a0):.1f},{ly + LIB_R * math.sin(a0):.1f} '
        f'A{LIB_R},{LIB_R} 0 0 1 {lx + LIB_R * math.cos(a1):.1f},{ly + LIB_R * math.sin(a1):.1f} Z" '
        f'fill="{MATERIAL[k]}" stroke="{INK}" stroke-width="1.6"/>')
add(f'<circle cx="{lx}" cy="{ly}" r="17" fill="{GOLD}" stroke="{INK}" stroke-width="1.6"/>')
add(f'<circle cx="{lx}" cy="{ly}" r="5" fill="{mix("#3E8E86", 0.9)}" stroke="{INK}" stroke-width="1"/>')

# bateaux-passoires sur la Vistule (la Régate de la Passoire), hors de la ville
for x0 in (110, 880):
    y0 = river_y(x0)
    add(f'<circle cx="{x0}" cy="{y0}" r="10" fill="{mix(STONE, 0.6)}" stroke="{INK}" stroke-width="1.2"/>')
    for dx, dy in ((-4, -3), (3, -4), (0, 2), (-3, 5), (4, 3)):
        add(f'<circle cx="{x0 + dx}" cy="{y0 + dy}" r="1.2" fill="{INK}"/>')

if not IA:
    font = 'font-family="Georgia, serif"'
    marks = [(1, lx, ly - LIB_R - 26)] + [(n, GATES[k][0] + dx, GATES[k][1] + dy)
                                          for n, k, dx, dy in ((2, 'A', -30, -20), (3, 'B', 30, -20), (4, 'C', 32, 6))]
    for n, x, y in marks:
        add(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="11" fill="{INK}"/><text x="{x:.1f}" y="{y + 4.5:.1f}" '
            f'text-anchor="middle" font-size="13" fill="{PAPER}" {font} font-weight="bold">{n}</text>')
    add(f'<text x="160" y="{river_y(160) + 50:.0f}" text-anchor="middle" font-size="16" font-style="italic" '
        f'fill="{INK}" {font} paint-order="stroke" stroke="{PAPER}" stroke-width="4">la Vistule</text>')
    legend = ['1 La Bibliothèque de Faustroll', '2 Porte de l’enceinte de brique', '3 Porte de l’enceinte de pierre',
              '4 Porte de l’enceinte de bois']
    add(f'<rect x="{W - 300}" y="{H - 30 - 22 * len(legend) - 30}" width="290" height="{22 * len(legend) + 20}" '
        f'fill="{PAPER}" stroke="{INK}" stroke-width="1.2" opacity="0.95"/>')
    for k, line in enumerate(legend):
        add(f'<text x="{W - 288}" y="{H - 44 - 22 * (len(legend) - k)}" font-size="14" fill="{INK}" {font}>{line}</text>')

add('</svg>')
with open(sys.argv[1], 'w') as f:
    f.write('\n'.join(out))
