# Carte de Turingrad : surcouche SVG (noms des lieux, cibles de clic) posée sur carte-ville.png.
# Usage : python3 carte-turingrad.py carte-turingrad.svg [--controle]  (--controle : cibles de clic en rouge)
# Coordonnées = pixels de carte-ville.png (1024×1024), relevées sur l'image de l'IA. Modèle : ../sandomir/carte-sandomir.py.
# Rendu PNG : Chrome sans tête (le fond est référencé par chemin relatif, rendre depuis ce dossier).
import sys

CONTROLE = '--controle' in sys.argv

W, H = 1024, 1024
INK = '#1B2232'
PAPER = '#F1EDE4'
FONT = "Georgia, 'Times New Roman', serif"

# (id, nom sur la carte, nom du Compendium, x et y du nom, cible de clic (cx, cy, rx, ry))
LIEUX = [
    ('place-du-reset', 'La Place du Reset', 'Place du Reset (Machine de Turing, Cloche de Reset)', 480, 640,
     (480, 505, 115, 105)),
    ('quartier-babbage', 'Quartier Babbage', 'Quartier Babbage', 250, 368, (215, 230, 135, 115)),
    ('quartier-lovelace', 'Quartier Lovelace', 'Quartier Lovelace', 772, 446, (772, 530, 80, 85)),
    ('quartier-des-tubes', 'Quartier des Tubes', 'Quartier des Tubes', 470, 128, (470, 205, 85, 60)),
    ('gare', 'La Gare', 'La Gare', 358, 898, (358, 800, 62, 70)),
    ('ecluses', 'Les Écluses', 'Les Écluses (Pile de Charbon)', 628, 905, (515, 770, 95, 135)),
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
