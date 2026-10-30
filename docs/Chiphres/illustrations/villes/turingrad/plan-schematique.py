# Plan schématique de Turingrad (Compendium § « Capitale Turingrad », plan décidé par David le 2026-10-29).
# Usage : python3 plan-schematique.py plan-schematique.svg [--reference-ia]
# Ville de brique et de fonte coupée du nord au sud par la Vistule canalisée ; place ronde au centre (Place du Reset),
# que le canal contourne par l'est ; trois quartiers autour : Babbage (rive ouest), Lovelace (rive est), Tubes (nord) ;
# la Gare au sud, terminus du chemin de fer venu de l'ouest (Sandomir) ; les Écluses sur le canal, au sud de la place,
# avec la Pile de Charbon. Tubes pneumatiques de laiton de toit en toit, depuis la centrale du Quartier des Tubes.
# --reference-ia : référence pour l'IA (qui recopie tout) : aucun texte.
# Rendu PNG : chrome-headless-shell de Playwright (--screenshot) ; magick ne trouve pas les polices.
import math, sys

W = H = 1000
CX, CY = 470, 500
INK = '#1B2232'
PAPER = '#F1EDE4'
GOLD = '#F3C025'
GREEN = '#1F9346'
BROWN = '#593B26'
SEA = '#2F62B0'
BRICK = '#9C3B2A'
BRASS = '#C9A13B'

R_PLACE = 92
CANAL_W = 34
R_CITY = 395  # limite de la ville bâtie


def mix(c, t, base=PAPER):
    a = [int(c[i:i + 2], 16) for i in (1, 3, 5)]
    b = [int(base[i:i + 2], 16) for i in (1, 3, 5)]
    return '#' + ''.join(f'{round(b[i] + (a[i] - b[i]) * t):02X}' for i in range(3))


def path(pts, close=False):
    d = 'M' + ' L'.join(f'{x:.1f},{y:.1f}' for x, y in pts)
    return d + (' Z' if close else '')


def canal_x(y):
    # le canal descend tout droit au nord et au sud, et s'écarte vers l'est autour de la place
    d = abs(y - CY)
    bulge = R_PLACE + 48
    return CX + (math.sqrt(max(0, bulge ** 2 - d ** 2)) if d < bulge else 0) + 0


IA = '--reference-ia' in sys.argv
out = []
add = out.append
add(f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}">')
add(f'<rect width="{W}" height="{H}" fill="{mix(GREEN, 0.22)}"/>')
water = mix(SEA, 0.45)

# Vistule naturelle hors de la ville (sinueuse), canalisée dans la ville (droite, quais de pierre)
south = [(CX + 40 * min(1, (y - 890) / 60) * math.sin((y - 890) / 60), y) for y in range(1010, 890, -10)]
north = [(CX + 45 * min(1, (110 - y) / 60) * math.sin((110 - y) / 55), y) for y in range(110, -15, -10)]
canal = [(canal_x(y), y) for y in range(890, 109, -5)]
river = south + canal + north
add(f'<path d="{path(river)}" fill="none" stroke="{INK}" stroke-width="{CANAL_W + 6}" stroke-linejoin="round"/>')
add(f'<path d="{path(river)}" fill="none" stroke="{water}" stroke-width="{CANAL_W}" stroke-linejoin="round"/>')
# quais de pierre le long du canal
for side in (-1, 1):
    q = [(x + side * (CANAL_W / 2 + 5), y) for x, y in canal]
    add(f'<path d="{path(q)}" fill="none" stroke="{mix(INK, 0.35)}" stroke-width="6"/>')

# chemin de fer à vapeur venu de l'ouest, terminus à la Gare (sud, rive ouest)
GARE = (CX - 120, 820)
rail = [(-20, 760), (150, 770), (260, 795), (GARE[0] - 50, GARE[1])]
add(f'<path d="{path(rail)}" fill="none" stroke="{INK}" stroke-width="9" stroke-dasharray="2 5"/>')
add(f'<path d="{path(rail)}" fill="none" stroke="{INK}" stroke-width="2.5"/>')
add(f'<g transform="translate({GARE[0]:.1f},{GARE[1]:.1f})"><rect x="-55" y="-22" width="110" height="44" '
    f'fill="{mix(BRICK, 0.6)}" stroke="{INK}" stroke-width="1.6"/><path d="M-55,-22 L0,-40 L55,-22" fill="{mix(INK, 0.25)}" '
    f'stroke="{INK}" stroke-width="1.4"/><circle cx="0" cy="-4" r="9" fill="{PAPER}" stroke="{INK}" stroke-width="1.2"/></g>')

# rues : grille de part et d'autre du canal, avenue en anneau autour de la place, pont vers l'est
street = mix(BROWN, 0.3)
add(f'<circle cx="{CX}" cy="{CY}" r="{R_PLACE + 18}" fill="none" stroke="{street}" stroke-width="14"/>')
for y in (230, 330, 670, 760):  # rues est-ouest et ponts
    add(f'<line x1="{CX - 360}" y1="{y}" x2="{CX + 360}" y2="{y}" stroke="{street}" stroke-width="10"/>')
for x in (CX - 270, CX - 170):  # rues nord-sud, rive ouest
    add(f'<line x1="{x}" y1="150" x2="{x}" y2="860" stroke="{street}" stroke-width="10"/>')
for x in (CX + 230, CX + 320):  # rues nord-sud, rive est
    add(f'<line x1="{x}" y1="150" x2="{x}" y2="860" stroke="{street}" stroke-width="10"/>')
add(f'<line x1="{CX - 360}" y1="{CY}" x2="{CX + 360}" y2="{CY}" stroke="{street}" stroke-width="12"/>')
for y in (230, 330, CY, 670, 760):  # ponts sur le canal
    x = canal_x(y)
    add(f'<rect x="{x - CANAL_W / 2 - 8:.1f}" y="{y - 9}" width="{CANAL_W + 16}" height="18" fill="{mix(INK, 0.4)}" '
        f'stroke="{INK}" stroke-width="1.2"/>')


def block(x, y, w, h, fill):
    add(f'<rect x="{x:.1f}" y="{y:.1f}" width="{w:.1f}" height="{h:.1f}" fill="{fill}" stroke="{INK}" stroke-width="1.2"/>')


# maisons de brique en rangs serrés, sauf sur les lieux
brick = mix(BRICK, 0.55)
free = [(CX - 220, 300, 150), (CX + 275, 520, 110), (CX - 30, 200, 120), (CX + 60, 715, 95), (GARE[0], GARE[1], 90),
        (CX, CY, R_PLACE + 30)]
for gx in range(CX - 380, CX + 381, 30):
    for gy in range(160, 860, 26):
        if math.hypot(gx - CX, gy - CY) > R_CITY or any(math.hypot(gx - fx, gy - fy) < fr for fx, fy, fr in free):
            continue
        if abs(gx - canal_x(gy)) < CANAL_W / 2 + 22:
            continue
        if any(abs(gy - y) < 14 for y in (230, 330, CY, 670, 760)) or \
                any(abs(gx - x) < 14 for x in (CX - 270, CX - 170, CX + 230, CX + 320)):
            continue
        block(gx - 11, gy - 9, 22, 18, brick)

# 2. Quartier Babbage (rive ouest) : usines, cheminées, halle à verrière de la Machine Analytique
bx, by = CX - 220, 300
block(bx - 80, by - 40, 160, 80, mix(INK, 0.15))  # verrière
for k in range(-70, 71, 14):
    add(f'<line x1="{bx + k}" y1="{by - 40}" x2="{bx + k}" y2="{by + 40}" stroke="{INK}" stroke-width="0.8"/>')
for dx, dy in ((-95, -60), (95, -55), (-100, 60)):
    block(bx + dx - 22, by + dy - 18, 44, 36, mix(BRICK, 0.8))
    add(f'<circle cx="{bx + dx + 12}" cy="{by + dy - 6}" r="6" fill="{INK}"/>')  # cheminée

# 3. Quartier Lovelace (rive est) : ateliers de métiers à tisser, python mécanique
lx, ly = CX + 275, 520
for k in range(3):
    block(lx - 60, ly - 70 + k * 48, 120, 36, mix(BRICK, 0.7))
    add(f'<path d="M{lx - 60},{ly - 52 + k * 48} l20,-18 l0,18 l20,-18 l0,18 l20,-18 l0,18 l20,-18 l0,18 l20,-18 l0,18 '
        f'l20,-18 l0,18" fill="none" stroke="{INK}" stroke-width="1"/>')  # toits en dents de scie
snake = [(lx - 50 + u * 10, ly + 85 + 8 * math.sin(u)) for u in range(11)]
add(f'<path d="{path(snake)}" fill="none" stroke="{BRASS}" stroke-width="6" stroke-linecap="round"/>')

# 4. Quartier des Tubes (nord) : centrale des tubes pneumatiques et archives
tx, ty = CX - 30, 200
add(f'<circle cx="{tx}" cy="{ty}" r="48" fill="{mix(BRASS, 0.6)}" stroke="{INK}" stroke-width="1.8"/>')
add(f'<circle cx="{tx}" cy="{ty}" r="18" fill="{BRASS}" stroke="{INK}" stroke-width="1.4"/>')
block(tx + 55, ty - 30, 60, 60, mix(BRICK, 0.7))  # archives
# tubes de laiton de la centrale vers chaque quartier
for ex, ey in ((bx, by), (lx, ly - 60), (CX, CY - R_PLACE), (GARE[0], GARE[1] - 30), (CX + 60, 700),
               (CX - 300, 160), (CX + 300, 250)):
    add(f'<path d="M{tx},{ty} Q{(tx + ex) / 2 + 30},{(ty + ey) / 2 - 20} {ex},{ey}" fill="none" stroke="{INK}" '
        f'stroke-width="6"/><path d="M{tx},{ty} Q{(tx + ex) / 2 + 30},{(ty + ey) / 2 - 20} {ex},{ey}" fill="none" '
        f'stroke="{BRASS}" stroke-width="3.5"/>')

# 6. Les Écluses (canal, sud de la place) et la Pile de Charbon
ey = 715
for k in (-28, 0, 28):
    add(f'<line x1="{canal_x(ey + k) - CANAL_W / 2 - 4:.1f}" y1="{ey + k}" x2="{canal_x(ey + k) + CANAL_W / 2 + 4:.1f}" '
        f'y2="{ey + k}" stroke="{INK}" stroke-width="5"/>')
add(f'<path d="M{CX + 50},{ey + 30} l30,-50 l30,50 Z" fill="{mix(INK, 0.85)}" stroke="{INK}" stroke-width="1.2"/>')

# 1. Place du Reset : place ronde pavée, Machine de Turing (ruban perforé) et clocher de la Cloche de Reset
add(f'<circle cx="{CX}" cy="{CY}" r="{R_PLACE}" fill="{mix(GOLD, 0.18)}" stroke="{INK}" stroke-width="2"/>')
add(f'<rect x="{CX - 34}" y="{CY - 22}" width="68" height="44" fill="{mix(BRASS, 0.85)}" stroke="{INK}" stroke-width="1.6"/>')
add(f'<circle cx="{CX}" cy="{CY}" r="14" fill="{BRASS}" stroke="{INK}" stroke-width="1.2"/>')
tape = f'M{CX - 34},{CY + 8} C{CX - 70},{CY + 10} {CX - 60},{CY + 60} {CX - 20},{CY + 70} S{CX + 50},{CY + 60} {CX + 70},{CY + 40}'
add(f'<path d="{tape}" fill="none" stroke="{INK}" stroke-width="12"/><path d="{tape}" fill="none" stroke="{PAPER}" '
    f'stroke-width="9" stroke-dasharray="3 4"/>')
add(f'<rect x="{CX + 20}" y="{CY - 72}" width="26" height="26" fill="{mix(BRICK, 0.8)}" stroke="{INK}" stroke-width="1.4"/>'
    f'<circle cx="{CX + 33}" cy="{CY - 59}" r="7" fill="{GOLD}" stroke="{INK}" stroke-width="1"/>')

if not IA:
    font = 'font-family="Georgia, serif"'
    marks = [(1, CX - 60, CY - 50), (2, bx, by - 58), (3, lx, ly - 90), (4, tx, ty - 62), (5, GARE[0], GARE[1] + 40),
             (6, CX + 95, ey + 45)]
    for n, x, y in marks:
        add(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="11" fill="{INK}"/><text x="{x:.1f}" y="{y + 4.5:.1f}" '
            f'text-anchor="middle" font-size="13" fill="{PAPER}" {font} font-weight="bold">{n}</text>')
    for txt, x, y in (('la Vistule', CX + 70, 960), ('la Vistule', CX + 80, 50), ('vers Sandomir', 90, 745)):
        add(f'<text x="{x}" y="{y}" text-anchor="middle" font-size="16" font-style="italic" fill="{INK}" {font} '
            f'paint-order="stroke" stroke="{PAPER}" stroke-width="4">{txt}</text>')
    legend = ['1 Place du Reset (Machine, Cloche)', '2 Quartier Babbage', '3 Quartier Lovelace', '4 Quartier des Tubes',
              '5 La Gare', '6 Les Écluses (Pile de Charbon)']
    add(f'<rect x="{W - 290}" y="{H - 30 - 22 * len(legend)}" width="280" height="{22 * len(legend) + 20}" '
        f'fill="{PAPER}" stroke="{INK}" stroke-width="1.2" opacity="0.95"/>')
    for k, line in enumerate(legend):
        add(f'<text x="{W - 278}" y="{H - 14 - 22 * (len(legend) - k)}" font-size="14" fill="{INK}" {font}>{line}</text>')

add('</svg>')
with open(sys.argv[1], 'w') as f:
    f.write('\n'.join(out))
