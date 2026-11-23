# Carte de Cracovenn : surcouche SVG (noms des lieux, cibles de clic) posée sur carte-ville.png.
# Usage : python3 carte-cracovenn.py carte-cracovenn.svg [--controle]  (--controle : cibles de clic en rouge)
# Coordonnées = pixels de carte-ville.png (1024×1024), relevées sur carte-ville.png (original de l'IA retouché et recadré par coller-retouche.sh). Modèle : ../sinusborg/carte-sinusborg.py.
# Rendu PNG : Chrome sans tête (le fond est référencé par chemin relatif, rendre depuis ce dossier).
import sys

CONTROLE = '--controle' in sys.argv

W, H = 1024, 1024
INK = '#1B2232'
PAPER = '#F1EDE4'
FONT = "Georgia, 'Times New Roman', serif"

# (id, nom sur la carte, nom du Compendium, x et y du nom, cibles de clic [(cx, cy, rx, ry)…])
LIEUX = [
    ('bibliotheque-de-faustroll', 'La Bibliothèque', 'La Bibliothèque de Faustroll', 510, 396, [(510, 470, 62, 66)]),
    ('porte-de-brique', 'Porte de brique', "Porte de l'enceinte de brique", 112, 368, [(220, 300, 28, 45)]),
    ('porte-de-pierre', 'Porte de pierre', "Porte de l'enceinte de pierre", 918, 408, [(805, 300, 30, 45)]),
    ('porte-de-bois', 'Porte de bois', "Porte de l'enceinte de bois", 640, 848, [(512, 808, 32, 28)]),
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
for lid, name, full, x, y, cibles in LIEUX:
    # ellipses transparentes = cibles du clic sur le site ; le nom aussi est cliquable (même groupe)
    stroke = ' stroke="red" stroke-width="2"' if CONTROLE else ''
    ellipses = ''.join(f'<ellipse cx="{cx}" cy="{cy}" rx="{rx}" ry="{ry}" fill="#fff" fill-opacity="0"{stroke}/>'
                       for cx, cy, rx, ry in cibles)
    o.append(f'<g id="lieu-{lid}"><title>{full}</title>{ellipses}{text(x, y, name, 24, "lieu")}</g>')
o.append('</g>')
o.append('</svg>')

open(sys.argv[1], 'w').write('\n'.join(o) + '\n')
