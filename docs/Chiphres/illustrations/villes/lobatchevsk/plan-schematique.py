# Plan schématique de Lobatchevsk (Compendium, fiche Bedonstan, « Plan de la ville », décidé par David le 2026-10-29).
# Usage : python3 plan-schematique.py plan-schematique.svg [--reference-ia]
# La ville occupe un col en selle de cheval : deux pentes montent vers les sommets (les Pythagoriades au nord-est, une
# butte rocheuse au sud-ouest), deux descendent vers les vallées (la steppe au nord-ouest, le torrent au sud-est).
# La route de Sandomir passe le col en ligne droite (« la route est droite ») ; les autres rues suivent les courbes de
# niveau de la selle, des hyperboles (« mais la courbe est forte »). Académie Achrasienne au point-selle ; place
# triangulaire aux côtés creusés (angles de moins de 180°) ; enceinte à douze côtés, une tour à chaque angle ;
# Polyèdre de la Voie Royale devant la porte de Sandomir ; Pont du Torrent sur la Vistule naissante.
# La géométrie tient à la seule ville : le paysage est naturel (steppe, bouleaux, lacs, montagnes).
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
STONE = '#8C8C88'
SLATE = '#56657A'
BIRCH = '#7FA35A'

CENTER = (500, 500)
R_WALL = 255  # rayon du dodécagone (centre → sommet)
APOTHEM = R_WALL * math.cos(math.radians(15))
# axes de la selle : u le long de la route (vers le sud-est, descend des deux côtés), v le long de la crête
# (vers le nord-est, monte des deux côtés) ; altitude z = v² − u²
EU = (math.sqrt(0.5), math.sqrt(0.5))
EV = (math.sqrt(0.5), -math.sqrt(0.5))
RIVER_W = 24


def mix(c, t, base=PAPER):
    a = [int(c[i:i + 2], 16) for i in (1, 3, 5)]
    b = [int(base[i:i + 2], 16) for i in (1, 3, 5)]
    return '#' + ''.join(f'{round(b[i] + (a[i] - b[i]) * t):02X}' for i in range(3))


def path(pts, close=False):
    d = 'M' + ' L'.join(f'{x:.1f},{y:.1f}' for x, y in pts)
    return d + (' Z' if close else '')


def smooth(pts):
    # courbe lissée passant par les points (Catmull-Rom → Bézier)
    d = f'M{pts[0][0]:.1f},{pts[0][1]:.1f}'
    for i in range(len(pts) - 1):
        p0, p1, p2, p3 = pts[max(i - 1, 0)], pts[i], pts[i + 1], pts[min(i + 2, len(pts) - 1)]
        c1 = (p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6)
        c2 = (p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6)
        d += f' C{c1[0]:.1f},{c1[1]:.1f} {c2[0]:.1f},{c2[1]:.1f} {p2[0]:.1f},{p2[1]:.1f}'
    return d


def world(u, v):
    return CENTER[0] + u * EU[0] + v * EV[0], CENTER[1] + u * EU[1] + v * EV[1]


def local(x, y):
    dx, dy = x - CENTER[0], y - CENTER[1]
    return dx * EU[0] + dy * EU[1], dx * EV[0] + dy * EV[1]


def dist_to(pts, x, y):
    best = 1e9
    for (x1, y1), (x2, y2) in zip(pts, pts[1:]):
        dx, dy = x2 - x1, y2 - y1
        t = max(0, min(1, ((x - x1) * dx + (y - y1) * dy) / (dx * dx + dy * dy or 1)))
        best = min(best, math.hypot(x - x1 - t * dx, y - y1 - t * dy))
    return best


WALL = [(CENTER[0] + R_WALL * math.cos(math.radians(30 * k)), CENTER[1] + R_WALL * math.sin(math.radians(30 * k)))
        for k in range(12)]


def in_city(x, y, margin=0):
    # dans le dodécagone (distance à chaque côté, par l'apothème)
    dx, dy = x - CENTER[0], y - CENTER[1]
    return all(dx * math.cos(math.radians(15 + 30 * k)) + dy * math.sin(math.radians(15 + 30 * k)) < APOTHEM - margin
               for k in range(12))


IA = '--reference-ia' in sys.argv
out = []
add = out.append
add(f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}">')
add(f'<rect width="{W}" height="{H}" fill="{mix(GOLD, 0.2, mix(GREEN, 0.25))}"/>')
water = mix(SEA, 0.45)
rng = random.Random(5)

# relief : les deux pentes qui montent se teintent de brun (vers les sommets), les deux vallées restent vertes
add('<defs>'
    f'<radialGradient id="ne" cx="0.92" cy="0.08" r="0.75"><stop offset="0" stop-color="{mix(BROWN, 0.45)}"/>'
    f'<stop offset="1" stop-color="{mix(BROWN, 0.45)}" stop-opacity="0"/></radialGradient>'
    f'<radialGradient id="sw" cx="0.1" cy="0.9" r="0.6"><stop offset="0" stop-color="{mix(BROWN, 0.35)}"/>'
    f'<stop offset="1" stop-color="{mix(BROWN, 0.35)}" stop-opacity="0"/></radialGradient></defs>')
add(f'<rect width="{W}" height="{H}" fill="url(#ne)"/><rect width="{W}" height="{H}" fill="url(#sw)"/>')

# hachures de pente : de courts traits dans le sens de la pente, autour des deux sommets
for (px, py), rmin, rmax in (((900, 100), 230, 420), ((110, 890), 120, 300)):
    for k in range(260):
        a = rng.uniform(0, 2 * math.pi)
        r = rng.uniform(rmin, rmax)
        x, y = px + r * math.cos(a), py + r * math.sin(a)
        if not (15 < x < W - 15 and 15 < y < H - 15) or in_city(x, y, -40):
            continue
        add(f'<line x1="{x:.1f}" y1="{y:.1f}" x2="{x + 9 * math.cos(a):.1f}" y2="{y + 9 * math.sin(a):.1f}" '
            f'stroke="{mix(BROWN, 0.6)}" stroke-width="1.3"/>')

# herbe de steppe : touffes au nord et au nord-ouest
for _ in range(220):
    x, y = rng.uniform(20, W - 20), rng.uniform(20, H - 20)
    if in_city(x, y, -30) or local(x, y)[1] > 120 or x + y > 1200:
        continue
    add(f'<path d="M{x - 4:.1f},{y:.1f} L{x - 1:.1f},{y - 6:.1f} M{x:.1f},{y:.1f} L{x:.1f},{y - 8:.1f} '
        f'M{x + 4:.1f},{y:.1f} L{x + 1:.1f},{y - 6:.1f}" stroke="{mix(GREEN, 0.7)}" stroke-width="1.2" fill="none"/>')

# les Pythagoriades, au nord-est : vraies montagnes rocheuses aux sommets enneigés
PEAKS = [(700, 70, 70), (830, 120, 95), (950, 60, 80), (960, 230, 85), (880, 330, 60), (620, 20, 45)]
for x, y, s in sorted(PEAKS, key=lambda p: p[1]):
    base = y + s * 0.9
    left, right = (x - s, base), (x + s * 0.95, base)
    add(f'<path d="M{left[0]:.1f},{left[1]:.1f} L{x - s * 0.45:.1f},{y + s * 0.15:.1f} L{x:.1f},{y - s * 0.6:.1f} '
        f'L{x + s * 0.4:.1f},{y + s * 0.05:.1f} L{right[0]:.1f},{right[1]:.1f} Z" fill="{mix(STONE, 0.75)}" '
        f'stroke="{INK}" stroke-width="1.6"/>')
    add(f'<path d="M{x:.1f},{y - s * 0.6:.1f} L{x + 0.6 * s * 0.95:.1f},{base:.1f} L{x + s * 0.95:.1f},{base:.1f} '
        f'L{x + s * 0.4:.1f},{y + s * 0.05:.1f} Z" fill="{mix(INK, 0.45)}" opacity="0.6"/>')  # versant à l'ombre
    add(f'<path d="M{x - s * 0.3:.1f},{y - s * 0.17:.1f} L{x:.1f},{y - s * 0.6:.1f} L{x + s * 0.27:.1f},{y - s * 0.15:.1f} '
        f'L{x + s * 0.1:.1f},{y - s * 0.05:.1f} L{x - s * 0.05:.1f},{y - s * 0.2:.1f} L{x - s * 0.17:.1f},{y - s * 0.05:.1f} Z" '
        f'fill="{PAPER}" stroke="{INK}" stroke-width="1.1"/>')

# la butte du sud-ouest : rocheuse, plus basse, sans neige
for x, y, s in ((95, 880, 55), (175, 935, 42), (40, 960, 35)):
    add(f'<path d="M{x - s:.1f},{y + s * 0.6:.1f} Q{x - s * 0.4:.1f},{y - s * 0.5:.1f} {x:.1f},{y - s * 0.55:.1f} '
        f'Q{x + s * 0.5:.1f},{y - s * 0.4:.1f} {x + s:.1f},{y + s * 0.6:.1f} Z" fill="{mix(BROWN, 0.45)}" '
        f'stroke="{INK}" stroke-width="1.4"/>')

# lacs ordinaires dans la steppe
for x, y, rx, ry in ((200, 120, 62, 30), (90, 520, 40, 26)):
    add(f'<ellipse cx="{x}" cy="{y}" rx="{rx}" ry="{ry}" fill="{water}" stroke="{INK}" stroke-width="1.4"/>')

# la Vistule naissante, encore torrent : descend des Pythagoriades, passe au pied de la ville au sud-est
RIVER_PTS = [(1010, 300), (930, 400), (870, 480), (830, 590), (790, 720), (740, 820), (690, 900), (660, 1010)]
add(f'<path d="{smooth(RIVER_PTS)}" fill="none" stroke="{INK}" stroke-width="{RIVER_W + 5}" stroke-linecap="round"/>')
add(f'<path d="{smooth(RIVER_PTS)}" fill="none" stroke="{water}" stroke-width="{RIVER_W}" stroke-linecap="round"/>')
RIVER = [(x, y) for x, y in RIVER_PTS]
for i in range(len(RIVER_PTS) - 1):  # rapides : écume blanche
    (x1, y1), (x2, y2) = RIVER_PTS[i], RIVER_PTS[i + 1]
    for t in (0.3, 0.7):
        x, y = x1 + (x2 - x1) * t, y1 + (y2 - y1) * t
        add(f'<path d="M{x - 6:.1f},{y:.1f} q3,-4 6,0 q3,4 6,0" fill="none" stroke="{PAPER}" stroke-width="1.6"/>')

# bosquets de bouleaux (troncs blancs) dans la steppe et les vallées
for gx, gy in ((120, 300), (300, 60), (60, 700), (400, 830), (600, 830), (900, 600), (960, 820), (240, 640)):
    for _ in range(6):
        x, y = gx + rng.uniform(-35, 35), gy + rng.uniform(-25, 25)
        if in_city(x, y, -25):
            continue
        add(f'<line x1="{x:.1f}" y1="{y:.1f}" x2="{x:.1f}" y2="{y + 14:.1f}" stroke="{INK}" stroke-width="3.4"/>'
            f'<line x1="{x:.1f}" y1="{y + 1:.1f}" x2="{x:.1f}" y2="{y + 13:.1f}" stroke="{PAPER}" stroke-width="1.8"/>'
            f'<ellipse cx="{x:.1f}" cy="{y - 4:.1f}" rx="8" ry="10" fill="{mix(BIRCH, 0.8)}" stroke="{INK}" '
            f'stroke-width="1"/>')

# le sol de la ville : terre battue claire
add(f'<path d="{path(WALL, True)}" fill="{mix(GOLD, 0.14)}"/>')

# rues
street = mix(BROWN, 0.3)
GATE_NW = world(-APOTHEM, 0)
GATE_SE = world(APOTHEM, 0)
# la route de Sandomir : droite à travers le col, du nord-ouest au sud-est
MAIN = [world(-APOTHEM - 30, 0), world(APOTHEM + 30, 0)]
ROAD_NW = [world(-APOTHEM, 0), (250, 255), (140, 220), (-20, 230)]
ROAD_SE = [world(APOTHEM, 0), (820, 820), (1020, 1000)]
# courbes de niveau v² − u² = ±a² : les rues qui suivent la courbure (hyperboles)
CONTOURS = []
for a, sign in ((70, 1), (150, 1), (160, -1)):
    if True:
        for side in (1, -1):
            pts = []
            for k in range(-60, 61):
                t = k * 4
                u, v = (t, side * math.sqrt(a * a + t * t)) if sign > 0 else (side * math.sqrt(a * a + t * t), t)
                x, y = world(u, v)
                if in_city(x, y, 18):
                    pts.append((x, y))
            CONTOURS.append(pts)
STREETS = [MAIN] + CONTOURS
for pts in [ROAD_NW, ROAD_SE]:
    add(f'<path d="{smooth(pts)}" fill="none" stroke="{street}" stroke-width="13"/>')
for pts in STREETS:
    add(f'<path d="{path(pts)}" fill="none" stroke="{street}" stroke-width="{14 if pts is MAIN else 10}" '
        f'stroke-linejoin="round"/>')

# le Pont du Torrent : pont de pierre à arches, là où la route du sud-est croise le torrent
BRIDGE = (805, 792)
ang = math.degrees(math.atan2(1, 1))
add(f'<g transform="translate({BRIDGE[0]},{BRIDGE[1]}) rotate({ang:.1f})">'
    f'<rect x="-26" y="-11" width="52" height="22" rx="3" fill="{mix(STONE, 0.8)}" stroke="{INK}" stroke-width="1.5"/>'
    + ''.join(f'<line x1="{x}" y1="-11" x2="{x}" y2="11" stroke="{INK}" stroke-width="0.8" opacity="0.6"/>'
              for x in (-13, 0, 13)) + '</g>')

# la Place du Triangle : place triangulaire aux côtés creusés vers l'intérieur (angles de moins de 180°)
TRI_C = world(-108, 0)
TRI = [(TRI_C[0] + 44 * math.cos(math.radians(45 + 120 * k)), TRI_C[1] + 44 * math.sin(math.radians(45 + 120 * k)))
       for k in range(3)]
d = f'M{TRI[0][0]:.1f},{TRI[0][1]:.1f}'
for k in range(3):
    p, q = TRI[k], TRI[(k + 1) % 3]
    mx, my = (p[0] + q[0]) / 2, (p[1] + q[1]) / 2
    cx, cy = mx + (TRI_C[0] - mx) * 0.75, my + (TRI_C[1] - my) * 0.75  # point de contrôle tiré vers le centre
    d += f' Q{cx:.1f},{cy:.1f} {q[0]:.1f},{q[1]:.1f}'
add(f'<path d="{d} Z" fill="{mix(GOLD, 0.45)}" stroke="{INK}" stroke-width="1.8"/>')
for p in TRI:  # une borne à chaque angle
    add(f'<circle cx="{p[0]:.1f}" cy="{p[1]:.1f}" r="4" fill="{mix(STONE, 0.9)}" stroke="{INK}" stroke-width="1"/>')

# l'Académie Achrasienne, au point-selle : bâtiment carré aux côtés creusés, cour, petite coupole
AC = 40


def academy_free(x, y):
    return math.hypot(x - CENTER[0], y - CENTER[1]) > AC + 30


def tri_free(x, y):
    return math.hypot(x - TRI_C[0], y - TRI_C[1]) > 40


def occupied(x, y, margin=0):
    if not academy_free(x, y) or not tri_free(x, y):
        return True
    if any(dist_to(pts, x, y) < 14 + margin for pts in STREETS if pts):
        return True
    return not in_city(x, y, 20 + margin)


# maisons : de pierre aux toits d'ardoise, alignées sur les courbes de niveau (elles tournent avec la selle)
PLACED = []


def free_disc(x, y, r):
    if occupied(x, y) or any(occupied(x + r * math.cos(a), y + r * math.sin(a), -5) for a in (0, 1.57, 3.14, 4.71)):
        return False
    if any(math.hypot(x - px, y - py) < r + pr + 1.5 for px, py, pr in PLACED):
        return False
    PLACED.append((x, y, r))
    return True


def house(x, y, w, h, roof=SLATE):
    u, v = local(x, y)
    ang = math.degrees(math.atan2(v * EU[1] + u * EV[1], v * EU[0] + u * EV[0]))  # tangente à la courbe de niveau
    add(f'<g transform="translate({x:.1f},{y:.1f}) rotate({ang:.1f})">'
        f'<rect x="{-w / 2:.1f}" y="{-h / 2:.1f}" width="{w}" height="{h}" fill="{mix(roof, 0.8)}" stroke="{INK}" '
        f'stroke-width="1.1"/><line x1="{-w / 2:.1f}" y1="0" x2="{w / 2:.1f}" y2="0" stroke="{INK}" '
        f'stroke-width="0.7" opacity="0.6"/></g>')


def resample(pts, step):
    res = []
    for (x1, y1), (x2, y2) in zip(pts, pts[1:]):
        n = max(1, int(math.hypot(x2 - x1, y2 - y1) / step))
        res += [(x1 + (x2 - x1) * k / n, y1 + (y2 - y1) * k / n, x2 - x1, y2 - y1) for k in range(n)]
    return res


# rangées de maisons des deux côtés de chaque rue, dans le sens de la rue
for pts in STREETS:
    width = 14 if pts is MAIN else 10
    for side in (1, -1):
        acc = 0.0
        for x, y, dx, dy in resample(pts, 2):
            acc -= 2
            if acc > 0:
                continue
            w, h = rng.choice([(16, 10), (20, 11), (24, 12), (13, 10), (18, 10)])
            n = math.hypot(dx, dy)
            tx, ty = dx / n, dy / n
            hx, hy = x - side * ty * (width / 2 + h / 2 + 3), y + side * tx * (width / 2 + h / 2 + 3)
            r = min(w, h) / 2 + 2
            if (not in_city(hx, hy, 22) or not academy_free(hx, hy) or not tri_free(hx, hy)
                    or any(dist_to(q, hx, hy) < width / 2 + h / 2 + 1 for q in STREETS if q is not pts)
                    or any(math.hypot(hx - px, hy - py) < r + pr for px, py, pr in PLACED)):
                acc = 4
                continue
            PLACED.append((hx, hy, r))
            ang = math.degrees(math.atan2(ty, tx))
            add(f'<g transform="translate({hx:.1f},{hy:.1f}) rotate({ang:.1f})">'
                f'<rect x="{-w / 2:.1f}" y="{-h / 2:.1f}" width="{w}" height="{h}" fill="{mix(SLATE, 0.8)}" '
                f'stroke="{INK}" stroke-width="1.1"/><line x1="{-w / 2:.1f}" y1="0" x2="{w / 2:.1f}" y2="0" '
                f'stroke="{INK}" stroke-width="0.7" opacity="0.6"/></g>')
            acc = w + 2

# remplissage : maisons et jardins dans les vides, alignés sur les courbes de niveau
for gx in range(240, 761, 9):
    for gy in range(240, 761, 9):
        x, y = gx + rng.uniform(-3, 3), gy + rng.uniform(-3, 3)
        if rng.random() < 0.04:
            if free_disc(x, y, 10):  # jardin, un bouleau
                add(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="9" fill="{mix(GREEN, 0.45)}" stroke="{INK}" stroke-width="0.8"/>'
                    f'<circle cx="{x:.1f}" cy="{y:.1f}" r="5" fill="{mix(BIRCH, 0.8)}" stroke="{INK}" stroke-width="0.8"/>')
            continue
        w, h = rng.choice([(16, 10), (12, 9), (20, 11), (10, 8)])
        if free_disc(x, y, min(w, h) / 2 + 2):
            house(x, y, w, h)

# l'Académie
lx, ly = CENTER
d = ''
corners = [world(-AC, -AC), world(AC, -AC), world(AC, AC), world(-AC, AC)]
d = f'M{corners[0][0]:.1f},{corners[0][1]:.1f}'
for k in range(4):
    p, q = corners[k], corners[(k + 1) % 4]
    mx, my = (p[0] + q[0]) / 2, (p[1] + q[1]) / 2
    d += f' Q{mx + (lx - mx) * 0.35:.1f},{my + (ly - my) * 0.35:.1f} {q[0]:.1f},{q[1]:.1f}'
add(f'<circle cx="{lx}" cy="{ly}" r="{AC + 16}" fill="{mix(GOLD, 0.3)}" stroke="{INK}" stroke-width="1.2"/>')  # parvis
add(f'<path d="{d} Z" fill="{mix(GREEN, 0.85)}" stroke="{INK}" stroke-width="2"/>')
add(f'<circle cx="{lx}" cy="{ly}" r="16" fill="{mix(GOLD, 0.35)}" stroke="{INK}" stroke-width="1.4"/>')  # cour
add(f'<circle cx="{lx}" cy="{ly}" r="8" fill="{GOLD}" stroke="{INK}" stroke-width="1.4"/>')  # coupole

# l'enceinte à douze côtés, une tour ronde à chaque angle
add(f'<path d="{path(WALL, True)}" fill="none" stroke="{INK}" stroke-width="15" stroke-linejoin="round"/>')
add(f'<path d="{path(WALL, True)}" fill="none" stroke="{mix(STONE, 0.9)}" stroke-width="11" stroke-linejoin="round"/>')
add(f'<path d="{path(WALL, True)}" fill="none" stroke="{INK}" stroke-width="11" stroke-dasharray="1 8" opacity="0.45"/>')
for x, y in WALL:
    add(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="15" fill="{mix(STONE, 0.9)}" stroke="{INK}" stroke-width="1.6"/>'
        f'<circle cx="{x:.1f}" cy="{y:.1f}" r="8" fill="{mix(SLATE, 0.85)}" stroke="{INK}" stroke-width="1"/>')
# deux portes, sur la route de Sandomir
for gx, gy in (GATE_NW, GATE_SE):
    add(f'<g transform="translate({gx:.1f},{gy:.1f}) rotate(-45)">'
        f'<rect x="-10" y="-9" width="20" height="18" fill="{street}"/>'
        f'<rect x="-22" y="-12" width="12" height="24" fill="{mix(STONE, 0.9)}" stroke="{INK}" stroke-width="1.4"/>'
        f'<rect x="10" y="-12" width="12" height="24" fill="{mix(STONE, 0.9)}" stroke="{INK}" stroke-width="1.4"/>'
        f'<path d="M-10,-4 Q0,-12 10,-4" fill="none" stroke="{INK}" stroke-width="1.3"/></g>')

# le Polyèdre de la Voie Royale : dodécaèdre d'or sur un socle, devant la porte du nord-ouest
px, py = 255, 330


def pentagon(cx, cy, r, rot):
    return [(cx + r * math.cos(math.radians(rot + 72 * k)), cy + r * math.sin(math.radians(rot + 72 * k))) for k in range(5)]


add(f'<rect x="{px - 24}" y="{py - 24}" width="48" height="48" fill="{mix(STONE, 0.7)}" stroke="{INK}" stroke-width="1.4"/>')
outer = [(px + 21 * math.cos(math.radians(-90 + 36 * k)), py + 21 * math.sin(math.radians(-90 + 36 * k))) for k in range(10)]
inner = pentagon(px, py, 9, -90)
add(f'<path d="{path(outer, True)}" fill="{GOLD}" stroke="{INK}" stroke-width="1.5"/>')
add(f'<path d="{path(inner, True)}" fill="{mix(GOLD, 0.7, "#FFFFFF")}" stroke="{INK}" stroke-width="1.2"/>')
for k in range(5):
    add(f'<line x1="{inner[k][0]:.1f}" y1="{inner[k][1]:.1f}" x2="{outer[2 * k][0]:.1f}" y2="{outer[2 * k][1]:.1f}" '
        f'stroke="{INK}" stroke-width="1.2"/>')

if not IA:
    font = 'font-family="Georgia, serif"'
    gate_wall = world(0, -APOTHEM)
    marks = [(1, lx + 38, ly - 70), (2, TRI_C[0] - 10, TRI_C[1] - 52), (3, px - 38, py - 22),
             (4, BRIDGE[0] + 36, BRIDGE[1] - 18), (5, gate_wall[0] + 22, gate_wall[1] - 22)]
    for n, x, y in marks:
        add(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="11" fill="{INK}"/><text x="{x:.1f}" y="{y + 4.5:.1f}" '
            f'text-anchor="middle" font-size="13" fill="{PAPER}" {font} font-weight="bold">{n}</text>')
    for txt, x, y in (('la Vistule', 905, 560), ('les Pythagoriades', 800, 290), ('la steppe', 120, 410),
                      ('vers Sandomir', 70, 260)):
        add(f'<text x="{x}" y="{y}" text-anchor="middle" font-size="16" font-style="italic" fill="{INK}" {font} '
            f'paint-order="stroke" stroke="{PAPER}" stroke-width="4">{txt}</text>')
    legend = ['1 L’Académie Achrasienne', '2 La Place du Triangle', '3 Le Polyèdre de la Voie Royale',
              '4 Le Pont du Torrent', '5 L’enceinte à douze côtés']
    add(f'<rect x="355" y="{H - 30 - 22 * len(legend) - 30}" width="290" height="{22 * len(legend) + 20}" '
        f'fill="{PAPER}" stroke="{INK}" stroke-width="1.2" opacity="0.95"/>')
    for k, line in enumerate(legend):
        add(f'<text x="367" y="{H - 44 - 22 * (len(legend) - k)}" font-size="14" fill="{INK}" {font}>{line}</text>')

add('</svg>')
with open(sys.argv[1], 'w') as f:
    f.write('\n'.join(out))
