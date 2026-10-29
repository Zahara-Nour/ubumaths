# Carte de Sandomir : surcouche SVG (noms des lieux, cibles de clic) posée sur carte-ville.png.
# Usage : python3 carte-sandomir.py carte-sandomir.svg [--controle]  (--controle : cibles de clic en rouge)
# Coordonnées = pixels de carte-ville.png (1024×1024). Les lieux sont ceux que l'IA a dessinés (relevés sur une grille),
# pas ceux du plan schématique : l'IA les a déplacés.
# Rendu PNG : Chrome sans tête (le fond est référencé par chemin relatif, rendre depuis ce dossier).
import sys

CONTROLE = '--controle' in sys.argv

W, H = 1024, 1024
INK = '#1B2232'
PAPER = '#F1EDE4'
FONT = "Georgia, 'Times New Roman', serif"

# (id, nom sur la carte, nom du Compendium, x et y du nom, cible de clic (cx, cy, rx, ry))
LIEUX = [
    ('pont-levis', 'Le Pont-Levis', 'Le Pont-Levis du Royaume', 512, 938, (511, 858, 42, 40)),
    ('grand-marche', 'Le Grand Marché', 'Le Grand Marché Polonais', 262, 402, (270, 465, 46, 54)),
    ('caserne', 'La Caserne', 'La Caserne des Palotins', 735, 396, (729, 283, 84, 84)),
    ('arene', "L'Arène", "L'Arène des Polonais", 603, 748, (602, 677, 46, 46)),
    ('gazette', 'La Gazette', 'La Gazette du Royaume', 322, 602, (366, 514, 34, 58)),
    ('bibliotheque', 'La Bibliothèque', 'La Bibliothèque du Décervelage', 552, 340, (552, 390, 46, 42)),
    ('trone-royal', 'Le Trône Royal', 'Le Trône Royal (Palais)', 512, 608, (512, 492, 72, 72)),
    ('gare', 'La Gare', 'La Gare', 922, 348, (920, 292, 46, 30)),
]


def text(x, y, s, size, cls, anchor='middle'):
    return f'<text x="{x}" y="{y}" font-size="{size}" text-anchor="{anchor}" class="{cls}">{s}</text>'


o = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}" font-family="{FONT}">']
o.append('<style>'
         f'text{{fill:{INK};paint-order:stroke;stroke:{PAPER};stroke-linejoin:round}}'
         '.lieu{font-weight:bold;font-style:italic;stroke-width:6px;stroke-opacity:.9}'
         '</style>')
o.append(f'<image href="carte-ville.png" width="{W}" height="{H}"/>')

o.append('<g id="lieux">')
for lid, name, full, x, y, (cx, cy, rx, ry) in LIEUX:
    # ellipse transparente = cible du clic sur le site ; le nom aussi est cliquable (même groupe)
    stroke = ' stroke="red" stroke-width="2"' if CONTROLE else ''
    o.append(f'<g id="lieu-{lid}"><title>{full}</title>'
             f'<ellipse cx="{cx}" cy="{cy}" rx="{rx}" ry="{ry}" fill="#fff" fill-opacity="0"{stroke}/>'
             f'{text(x, y, name, 24, "lieu")}</g>')
o.append('</g>')
o.append('</svg>')

open(sys.argv[1], 'w').write('\n'.join(o) + '\n')
