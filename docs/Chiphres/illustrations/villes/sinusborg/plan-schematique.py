# Plan schématique de Sinusborg (Compendium, fiche Yoyolande, « Plan de la ville », décidé par David le 2026-10-29).
# Usage : python3 plan-schematique.py plan-schematique.svg [--reference-ia]
# Port nordique bâti sur les îles du delta de la Vistule : le fleuve arrive par le sud et se partage en trois bras qui
# découpent la ville en îlots avant de se jeter dans la Baltique (au nord). Le bras du milieu s'élargit en bassin du
# Port ; la jetée part du bassin vers le large, le Grand Phare à son bout. Sur le quai principal (rive ouest du
# bassin), la Grue du Port et la Résidence de Bougrelas. Ponts du delta entre les îlots. Toits en sinusoïdes.
# Côte basse de dunes et de plages, forêts de pins derrière.
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
SAND = '#E2C98F'

ARM_W = 30  # largeur d'un bras du delta
FORK = (500, 830)  # où la Vistule se partage


def mix(c, t, base=PAPER):
    a = [int(c[i:i + 2], 16) for i in (1, 3, 5)]
    b = [int(base[i:i + 2], 16) for i in (1, 3, 5)]
    return '#' + ''.join(f'{round(b[i] + (a[i] - b[i]) * t):02X}' for i in range(3))


def path(pts, close=False):
    d = 'M' + ' L'.join(f'{x:.1f},{y:.1f}' for x, y in pts)
    return d + (' Z' if close else '')


def coast_y(x):
    # côte basse, légèrement ondulée
    return 235 + 14 * math.sin(x / 70) + 8 * math.sin(x / 23)


def bezier(p0, p1, p2, p3, n=60):
    pts = []
    for k in range(n + 1):
        t = k / n
        u = 1 - t
        pts.append((u ** 3 * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t ** 3 * p3[0],
                    u ** 3 * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t ** 3 * p3[1]))
    return pts


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
add(f'<rect width="{W}" height="{H}" fill="{mix(GREEN, 0.22)}"/>')
water = mix(SEA, 0.45)

# la Baltique au nord, plage de sable et dunes
coast = [(x, coast_y(x)) for x in range(-10, W + 11, 10)]
add(f'<path d="{path([(-10, -10)] + coast + [(W + 10, -10)], True)}" fill="{mix(SAND, 0.9)}"/>')
sea = [(x, y - 28) for x, y in coast]
add(f'<path d="{path([(-10, -10)] + sea + [(W + 10, -10)], True)}" fill="{water}" stroke="{INK}" stroke-width="2"/>')
for x0 in list(range(30, 330, 55)) + list(range(700, 990, 55)):  # dunes
    y0 = coast_y(x0) - 8
    add(f'<path d="M{x0 - 18},{y0 + 6} Q{x0},{y0 - 10} {x0 + 18},{y0 + 6}" fill="none" stroke="{mix(BROWN, 0.5)}" '
        f'stroke-width="1.5"/>')
for x0, y0 in ((120, 110), (820, 90), (300, 60)):  # houle
    add(f'<path d="M{x0 - 30},{y0} q7.5,-8 15,0 t15,0 t15,0 t15,0" fill="none" stroke="{INK}" stroke-width="1.2"/>')

# la Vistule arrive du sud et se partage en trois bras jusqu'à la mer
trunk = [(FORK[0] + 25 * math.sin((y - FORK[1]) / 50) * min(1, (y - FORK[1]) / 60), y) for y in range(1010, FORK[1] - 1, -10)]


def meander(pts, amp, waves):
    # bras sinueux (David, 2026-10-30 : des bras trop parfaits) ; écart nul à la fourche et au bout
    n = len(pts) - 1
    return [(x + amp * math.sin(math.pi * k / n) * math.sin(waves * math.pi * k / n), y) for k, (x, y) in enumerate(pts)]


ARMS = [
    meander(bezier(FORK, (420, 760), (260, 560), (230, coast_y(230) - 70)), 30, 3),  # bras ouest
    meander(bezier(FORK, (500, 700), (500, 520), (500, 330)), 22, 2.5),  # bras du milieu, jusqu'au bassin
    meander(bezier(FORK, (580, 760), (740, 560), (770, coast_y(770) - 70)), 30, 3.5),  # bras est
]
for pts in [trunk] + ARMS:
    add(f'<path d="{path(pts)}" fill="none" stroke="{INK}" stroke-width="{ARM_W + 6}" stroke-linejoin="round" '
        f'stroke-linecap="round"/>')
for pts in [trunk] + ARMS:
    add(f'<path d="{path(pts)}" fill="none" stroke="{water}" stroke-width="{ARM_W}" stroke-linejoin="round" '
        f'stroke-linecap="round"/>')
# la mer recouvre le bout des bras : les bras s'ouvrent sur la Baltique
add(f'<path d="{path([(-10, -10)] + sea + [(W + 10, -10)], True)}" fill="{water}"/>')

# 2. Le Port : bassin rectangulaire au bout du bras du milieu, ouvert sur la mer
BASIN = (435, 200, 130, 140)  # x, y, l, h (le haut déborde dans la mer)
bx, by, bw, bh = BASIN
add(f'<rect x="{bx}" y="{by}" width="{bw}" height="{bh}" fill="{water}" stroke="{INK}" stroke-width="3"/>')
add(f'<rect x="{bx + 3}" y="{by - 40}" width="{bw - 6}" height="{bh}" fill="{water}"/>')  # ouverture sur la mer
for x0, y0 in ((470, 250), (520, 300), (510, 225)):  # bateaux au port
    add(f'<path d="M{x0 - 14},{y0} l28,0 l-6,8 l-16,0 Z" fill="{mix(BROWN, 0.8)}" stroke="{INK}" stroke-width="1"/>'
        f'<line x1="{x0}" y1="{y0}" x2="{x0}" y2="{y0 - 18}" stroke="{INK}" stroke-width="1.2"/>'
        f'<path d="M{x0 + 1},{y0 - 17} l10,12 l-10,0 Z" fill="{PAPER}" stroke="{INK}" stroke-width="0.8"/>')
for x0, y0 in ((330, 140), (700, 170)):  # bateaux au large
    add(f'<path d="M{x0 - 14},{y0} l28,0 l-6,8 l-16,0 Z" fill="{mix(BROWN, 0.8)}" stroke="{INK}" stroke-width="1"/>'
        f'<line x1="{x0}" y1="{y0}" x2="{x0}" y2="{y0 - 18}" stroke="{INK}" stroke-width="1.2"/>'
        f'<path d="M{x0 + 1},{y0 - 17} l10,12 l-10,0 Z" fill="{PAPER}" stroke="{INK}" stroke-width="0.8"/>')

# 1. Le Grand Phare, au bout de la jetée qui part du coin est du bassin vers le large
JETTY = [(bx + bw, by + 20), (bx + bw + 25, 130), (bx + bw + 55, 70)]
PHARE = JETTY[-1]
add(f'<path d="{path(JETTY)}" fill="none" stroke="{INK}" stroke-width="16" stroke-linejoin="round"/>')
add(f'<path d="{path(JETTY)}" fill="none" stroke="{mix(INK, 0.35)}" stroke-width="12" stroke-linejoin="round"/>')
px, py = PHARE
add(f'<path d="M{px},{py} L{px - 200},{py - 70} L{px - 200},{py - 20} Z" fill="{mix(GOLD, 0.45)}" opacity="0.8"/>')  # faisceau
add(f'<circle cx="{px}" cy="{py}" r="16" fill="{PAPER}" stroke="{INK}" stroke-width="1.8"/>')
add(f'<circle cx="{px}" cy="{py}" r="10" fill="{PURPLE}" stroke="{INK}" stroke-width="1.2"/>')
add(f'<circle cx="{px}" cy="{py}" r="4" fill="{GOLD}"/>')

# rues : quais le long des bras, deux rues transversales qui franchissent les trois bras
street = mix(BROWN, 0.3)
CROSS = (470, 660)
for y in CROSS:
    add(f'<line x1="120" y1="{y}" x2="880" y2="{y}" stroke="{street}" stroke-width="11"/>')
add(f'<line x1="{bx - 22}" y1="{by + 10}" x2="{bx - 22}" y2="{CROSS[1]}" stroke="{street}" stroke-width="11"/>')  # quai principal
add(f'<line x1="{bx + bw + 22}" y1="{by + 40}" x2="{bx + bw + 22}" y2="{CROSS[1]}" stroke="{street}" stroke-width="11"/>')
add(f'<line x1="{bx - 22}" y1="{by + bh + 8}" x2="{bx + bw + 22}" y2="{by + bh + 8}" stroke="{street}" stroke-width="11"/>')

# 5. Les Ponts du delta : un pont à chaque croisement d'une rue transversale et d'un bras
BRIDGES = []
for pts in ARMS:
    for y in CROSS:
        x = min(pts, key=lambda p: abs(p[1] - y))[0]
        BRIDGES.append((x, y))
        add(f'<rect x="{x - ARM_W / 2 - 8:.1f}" y="{y - 9}" width="{ARM_W + 16}" height="18" rx="4" '
            f'fill="{mix(INK, 0.4)}" stroke="{INK}" stroke-width="1.2"/>')


def house(x, y, w, h, fill):
    # maison vue d'en haut, faîtage en sinusoïde
    add(f'<rect x="{x:.1f}" y="{y:.1f}" width="{w:.1f}" height="{h:.1f}" fill="{fill}" stroke="{INK}" stroke-width="1.1"/>')
    if IA:
        return  # l'IA recopiait la sinusoïde comme un logo sur des carrés plats (2e essai) : blocs nus, le prompt fait les toits
    wave = [(x + 2 + u, y + h / 2 + (h / 2 - 3) * math.sin(u / (w - 4) * 2 * math.pi)) for u in range(0, int(w - 3), 2)]
    add(f'<path d="{path(wave)}" fill="none" stroke="{INK}" stroke-width="1"/>')


# 4. La Résidence de Bougrelas et 3. la Grue du Port, sur le quai principal (rive ouest du bassin)
CRANE = (bx - 22, by + 35)
RESID = (bx - 70, by + 110)
free = [(CRANE[0], CRANE[1], 50), (RESID[0], RESID[1], 48)]

# quelques lieux sans nom, pour la diversité (David, 2026-10-30) : église, place du marché, entrepôts, jardins
CHURCH = (345, 565)
MARKET = (655, 400)
free += [(CHURCH[0], CHURCH[1], 34), (MARKET[0], MARKET[1], 40)]


def occupied(x, y, margin=0):
    if ((x - 500) / 400) ** 2 + ((y - 500) / 310) ** 2 > 1 or y < coast_y(x) + 12:
        return True
    if any(math.hypot(x - fx, y - fy) < fr + margin for fx, fy, fr in free):
        return True
    if bx - 40 < x < bx + bw + 40 and y < by + bh + 25:
        return True
    if any(dist_to(pts, x, y) < ARM_W / 2 + 14 + margin for pts in ARMS):
        return True
    if any(abs(y - c) < 14 + margin for c in CROSS):
        return True
    return y < CROSS[1] + 10 and any(abs(x - c) < 14 + margin for c in (bx - 22, bx + bw + 22))


# maisons à toits en sinusoïdes, de tailles et d'orientations variées, en îlots irréguliers avec cours et jardins
rng = random.Random(7)
colors = [mix(c, 0.55) for c in (PURPLE, SEA, GOLD, '#2E7D6B', BROWN, '#B5562F')]
for gx in range(110, 891, 27):
    for gy in range(by + 5, 800, 24):
        x, y = gx + rng.uniform(-4, 4), gy + rng.uniform(-3, 3)
        if occupied(x, y):
            continue
        r = rng.random()
        if r < 0.07:  # jardin ou cour plantée
            add(f'<rect x="{x - 13:.1f}" y="{y - 11:.1f}" width="26" height="22" rx="3" fill="{mix(GREEN, 0.4)}" '
                f'stroke="{INK}" stroke-width="0.8"/><circle cx="{x:.1f}" cy="{y:.1f}" r="6" fill="{mix("#1F5E3A", 0.7)}" '
                f'stroke="{INK}" stroke-width="0.8"/>')
        elif r < 0.11:
            continue  # petite place vide
        elif r < 0.18 and not occupied(x + 14, y, 4) and not occupied(x - 14, y, 4):  # entrepôt long
            house(x - 24, y - 9, 48, 18, mix(BROWN, 0.7))
        else:
            w, h = rng.choice([(12, 20), (16, 14), (20, 16), (22, 12), (11, 11), (18, 20)])
            house(x - w / 2, y - h / 2, w, h, rng.choice(colors))

# église au clocher de cuivre vert (îlot ouest)
ex, ey = CHURCH
add(f'<path d="M{ex - 12},{ey - 26} h24 v18 h14 v16 h-14 v18 h-24 v-18 h-14 v-16 h14 Z" fill="{mix(BROWN, 0.45)}" '
    f'stroke="{INK}" stroke-width="1.4"/><circle cx="{ex}" cy="{ey - 26}" r="8" fill="{mix("#2E7D6B", 0.8)}" '
    f'stroke="{INK}" stroke-width="1.2"/>')
# place du marché aux poissons (îlot est) : place pavée, étals
mx, my = MARKET
add(f'<rect x="{mx - 34}" y="{my - 28}" width="68" height="56" fill="{mix(GOLD, 0.18)}" stroke="{INK}" stroke-width="1.4"/>')
for dx, dy in ((-20, -14), (4, -14), (-20, 8), (4, 8)):
    add(f'<rect x="{mx + dx}" y="{my + dy}" width="16" height="10" fill="{mix(SEA, 0.6)}" stroke="{INK}" stroke-width="0.9"/>')
add(f'<circle cx="{mx + 26}" cy="{my}" r="4" fill="{water}" stroke="{INK}" stroke-width="0.9"/>')  # puits

# la Grue du Port : grande grue de bois au bord de l'eau, flèche au-dessus du bassin
cx, cy = CRANE
add(f'<rect x="{cx - 20}" y="{cy - 20}" width="40" height="40" fill="{mix(BROWN, 0.75)}" stroke="{INK}" stroke-width="1.6"/>')
add(f'<line x1="{cx}" y1="{cy}" x2="{cx + 60}" y2="{cy - 10}" stroke="{BROWN}" stroke-width="6"/>')
add(f'<line x1="{cx + 60}" y1="{cy - 10}" x2="{cx + 60}" y2="{cy + 14}" stroke="{INK}" stroke-width="1.4"/>'
    f'<rect x="{cx + 54}" y="{cy + 14}" width="12" height="9" fill="{mix(BROWN, 0.5)}" stroke="{INK}" stroke-width="1"/>')
# la Résidence de Bougrelas : maison haute et étroite à pignons, sur le quai principal
rx, ry = RESID
add(f'<rect x="{rx - 18}" y="{ry - 32}" width="36" height="64" fill="{mix(PURPLE, 0.8)}" stroke="{INK}" stroke-width="1.6"/>')
for k in range(4):  # pignons à redents
    add(f'<path d="M{rx - 18},{ry - 32 + 16 * k} l18,8 l18,-8" fill="none" stroke="{INK}" stroke-width="1"/>')
add(f'<circle cx="{rx}" cy="{ry - 40}" r="5" fill="{GOLD}" stroke="{INK}" stroke-width="1"/>')

# forêts de pins hors de la ville, et un petit lac
for x0, y0 in [(60 + 45 * i, 860 + 35 * (i % 3)) for i in range(8)] + [(940 - 45 * i, 860 + 35 * (i % 3)) for i in range(8)] \
        + [(50, 400), (60, 520), (950, 420), (940, 560), (80, 650), (930, 690)]:
    add(f'<path d="M{x0},{y0 - 14} l10,22 l-20,0 Z" fill="{mix("#1F5E3A", 0.8)}" stroke="{INK}" stroke-width="1"/>')
add(f'<ellipse cx="190" cy="940" rx="55" ry="28" fill="{water}" stroke="{INK}" stroke-width="1.6"/>')

if not IA:
    font = 'font-family="Georgia, serif"'
    marks = [(1, px + 26, py + 4), (2, bx + bw / 2, by + bh - 22), (3, CRANE[0] - 34, CRANE[1] - 6),
             (4, RESID[0] - 32, RESID[1]), (5, BRIDGES[2][0] + 34, BRIDGES[2][1] - 18)]
    for n, x, y in marks:
        add(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="11" fill="{INK}"/><text x="{x:.1f}" y="{y + 4.5:.1f}" '
            f'text-anchor="middle" font-size="13" fill="{PAPER}" {font} font-weight="bold">{n}</text>')
    for txt, x, y in (('mer Baltique', 180, 50), ('la Vistule', 560, 975)):
        add(f'<text x="{x}" y="{y}" text-anchor="middle" font-size="16" font-style="italic" fill="{INK}" {font} '
            f'paint-order="stroke" stroke="{PAPER}" stroke-width="4">{txt}</text>')
    legend = ['1 Le Grand Phare', '2 Le Port', '3 La Grue du Port', '4 La Résidence de Bougrelas', '5 Les Ponts du delta']
    add(f'<rect x="{W - 290}" y="{H - 30 - 22 * len(legend) - 30}" width="280" height="{22 * len(legend) + 20}" '
        f'fill="{PAPER}" stroke="{INK}" stroke-width="1.2" opacity="0.95"/>')
    for k, line in enumerate(legend):
        add(f'<text x="{W - 278}" y="{H - 44 - 22 * (len(legend) - k)}" font-size="14" fill="{INK}" {font}>{line}</text>')

add('</svg>')
with open(sys.argv[1], 'w') as f:
    f.write('\n'.join(out))
