# Carte de Bonneteau-sur-Vistule : surcouche SVG (noms des lieux, cibles de clic) posée sur carte-ville.png.
# Usage : python3 carte-bonneteau-sur-vistule.py carte-bonneteau-sur-vistule.svg [--controle]  (--controle : cibles de clic en rouge)
# Coordonnées = pixels de carte-ville.png (1024×1024), relevées sur carte-ville.png (original de l’IA, 2e essai, carrés tribunes et pont retouchés et recollés par coller-retouches.sh). Modèle : ../empoche-les-bains/carte-empoche-les-bains.py.
# Rendu PNG : Chrome sans tête (le fond est référencé par chemin relatif, rendre depuis ce dossier).
import sys

CONTROLE = '--controle' in sys.argv

W, H = 1024, 1024
INK = '#1B2232'
PAPER = '#F1EDE4'
FONT = "Georgia, 'Times New Roman', serif"

# (id, nom sur la carte, nom du Compendium, x et y du nom, rotation du nom, cibles de clic [(cx, cy, rx, ry)…])
# la Grand-Place avant le Quai : la cible du Quai, posée au-dessus, l'emporte au clic
LIEUX = [
    ('grand-place', 'La Grand-Place', 'La Grand-Place (Roulette Royale et estrade du Cheval à Phynances)', 610, 590, 0,
     [(590, 480, 110, 95)]),
    ('quai-des-tripots', 'Quai des Tripots', 'Le Quai des Tripots', 470, 712, 38, [(430, 420, 45, 70), (470, 590, 55, 90)]),
    ('casino-flottant', 'Casino flottant', 'Le Casino flottant', 300, 520, -90, [(348, 520, 30, 85)]),
    ('champ-de-courses', 'Champ de courses', 'Le Champ de courses', 850, 715, 0, [(850, 690, 150, 100)]),
    ('caisse-du-cheval', 'La Caisse du Cheval', 'La Caisse du Cheval', 880, 545, 0, [(765, 515, 32, 32)]),
]


def text(x, y, s, size, cls, rot=0):
    tr = f' transform="rotate({rot} {x} {y})"' if rot else ''
    return f'<text x="{x}" y="{y}" font-size="{size}" text-anchor="middle" class="{cls}"{tr}>{s}</text>'


o = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}" font-family="{FONT}">']
o.append('<style>'
         f'text{{fill:{INK};paint-order:stroke;stroke:{PAPER};stroke-linejoin:round}}'
         '.lieu{font-weight:bold;font-style:italic;stroke-width:6px;stroke-opacity:.9}'
         '</style>')
o.append(f'<image href="carte-ville.png" width="{W}" height="{H}"/>')

o.append('<g id="lieux">')
for lid, name, full, x, y, rot, cibles in LIEUX:
    # ellipses transparentes = cibles du clic sur le site ; le nom aussi est cliquable (même groupe)
    stroke = ' stroke="red" stroke-width="2"' if CONTROLE else ''
    ellipses = ''.join(f'<ellipse cx="{cx}" cy="{cy}" rx="{rx}" ry="{ry}" fill="#fff" fill-opacity="0"{stroke}/>'
                       for cx, cy, rx, ry in cibles)
    o.append(f'<g id="lieu-{lid}"><title>{full}</title>{ellipses}{text(x, y, name, 24, "lieu", rot)}</g>')
o.append('</g>')
o.append('</svg>')

open(sys.argv[1], 'w').write('\n'.join(o) + '\n')
