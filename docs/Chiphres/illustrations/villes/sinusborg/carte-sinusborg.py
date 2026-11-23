# Carte de Sinusborg : surcouche SVG (noms des lieux, cibles de clic) posée sur carte-ville.png.
# Usage : python3 carte-sinusborg.py carte-sinusborg.svg [--controle]  (--controle : cibles de clic en rouge)
# Coordonnées = pixels de carte-ville.png (1024×1024), relevées sur l'image de l'IA. Modèle : ../turingrad/carte-turingrad.py.
# Rendu PNG : Chrome sans tête (le fond est référencé par chemin relatif, rendre depuis ce dossier).
import sys

CONTROLE = '--controle' in sys.argv

W, H = 1024, 1024
INK = '#1B2232'
PAPER = '#F1EDE4'
FONT = "Georgia, 'Times New Roman', serif"

# (id, nom sur la carte, nom du Compendium, x et y du nom, cibles de clic [(cx, cy, rx, ry)…])
# Les Ponts du delta : six ponts, une cible par pont, un seul nom.
LIEUX = [
    ('grand-phare', 'Le Grand Phare', 'Le Grand Phare', 742, 128, [(633, 120, 40, 75)]),
    ('port', 'Le Port', 'Le Port', 537, 200, [(512, 280, 70, 65)]),
    ('grue-du-port', 'La Grue', 'La Grue du Port', 330, 236, [(440, 230, 50, 50)]),
    ('residence-de-bougrelas', 'La Résidence', 'La Résidence de Bougrelas', 372, 384, [(375, 320, 30, 42)]),
    ('ponts-du-delta', 'Les Ponts du delta', 'Les Ponts du delta', 515, 728,
     [(300, 478, 30, 18), (505, 480, 30, 18), (752, 478, 30, 18), (357, 676, 30, 18), (515, 676, 30, 18),
      (612, 676, 30, 18)]),
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
