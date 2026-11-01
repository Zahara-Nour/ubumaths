# Carte de Lobatchevsk : surcouche SVG (noms des lieux, cibles de clic) posée sur carte-ville.png.
# Usage : python3 carte-lobatchevsk.py carte-lobatchevsk.svg [--controle]  (--controle : cibles de clic en rouge)
# Coordonnées = pixels de carte-ville.png (1024×1024), relevées sur carte-ville.png (original de l’IA, 2e essai, sans retouche ni recadrage). Modèle : ../cracovenn/carte-cracovenn.py.
# Rendu PNG : Chrome sans tête (le fond est référencé par chemin relatif, rendre depuis ce dossier).
import sys

CONTROLE = '--controle' in sys.argv

W, H = 1024, 1024
INK = '#1B2232'
PAPER = '#F1EDE4'
FONT = "Georgia, 'Times New Roman', serif"

# (id, nom sur la carte, nom du Compendium, x et y du nom, cibles de clic [(cx, cy, rx, ry)…])
# les douze tours de l'enceinte : cibles du clic sur l'enceinte
TOURS = [(510, 252), (640, 287), (735, 380), (770, 510), (735, 640), (640, 735), (510, 770), (380, 735), (285, 640), (250, 510), (285, 380), (380, 287)]
LIEUX = [
    ('academie-achrasienne', 'L’Académie', 'L’Académie Achrasienne', 512, 604, [(512, 510, 58, 60)]),
    ('place-du-triangle', 'Place du Triangle', 'La Place du Triangle', 458, 394, [(432, 440, 34, 30)]),
    ('polyedre-de-la-voie-royale', 'Le Polyèdre', 'Le Polyèdre de la Voie Royale', 150, 330, [(262, 322, 30, 38)]),
    ('pont-du-torrent', 'Pont du Torrent', 'Le Pont du Torrent', 905, 840, [(795, 795, 50, 32)]),
    ('enceinte', 'L’Enceinte', 'L’enceinte à douze côtés', 590, 222, [(x, y, 22, 22) for x, y in TOURS]),
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
