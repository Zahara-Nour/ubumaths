# Carte d'Empoche-les-Bains : surcouche SVG (noms des lieux, cibles de clic) posée sur carte-ville.png.
# Usage : python3 carte-empoche-les-bains.py carte-empoche-les-bains.svg [--controle]  (--controle : cibles de clic en rouge)
# Coordonnées = pixels de carte-ville.png (1024×1024), relevées sur carte-ville.png (original de l’IA, 1er essai, six carrés de maisons retouchés et recollés par coller-maisons.sh). Modèle : ../lobatchevsk/carte-lobatchevsk.py.
# Rendu PNG : Chrome sans tête (le fond est référencé par chemin relatif, rendre depuis ce dossier).
import sys

CONTROLE = '--controle' in sys.argv

W, H = 1024, 1024
INK = '#1B2232'
PAPER = '#F1EDE4'
FONT = "Georgia, 'Times New Roman', serif"

# (id, nom sur la carte, nom du Compendium, x et y du nom, rotation du nom, cibles de clic [(cx, cy, rx, ry)…])
# le Parc avant la Buvette : la cible de la Buvette, posée au-dessus, l'emporte au clic
LIEUX = [
    ('place-de-la-gidouille', 'Place de la Gidouille', 'La Place de la Gidouille et le Grand Hôtel thermal', 555, 336, 0,
     [(555, 240, 150, 80)]),
    ('parc-thermal', 'Le Parc thermal', 'Le Parc thermal', 548, 650, 0, [(548, 485, 172, 150)]),
    ('buvette', 'La Buvette', 'La Buvette à colonnade', 440, 545, 0, [(440, 470, 44, 52)]),
    ('bains', 'Les Bains', 'Les Bains', 555, 940, 0, [(555, 780, 150, 112)]),
    ('villa-des-phynances', 'Villa des Phynances', 'La Villa des Phynances', 210, 700, 0, [(210, 615, 76, 60)]),
    ('promenade-de-la-vistule', 'La Promenade', 'La Promenade de la Vistule', 748, 510, -90, [(765, 510, 22, 180)]),
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
