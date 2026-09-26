"""
Pages d'un PDF en images, pour les relire (<nom>-1.png, <nom>-2.png…)
======================================================================

Les détecteurs ne voient pas tout (chaîne d'égalités fausse, vecteur minuscule,
ligne étirée) : relire les pages reste indispensable.

Usage : python scripts/fiches/pages-png.py <fichier.pdf>... [--dpi 70]
"""
import sys

import fitz

args = sys.argv[1:]
dpi = 70
if '--dpi' in args:
    i = args.index('--dpi')
    dpi = int(args[i + 1])
    del args[i : i + 2]
for f in args:
    doc = fitz.open(f)
    for i, page in enumerate(doc):
        page.get_pixmap(dpi=dpi).save(f[:-4] + f'-{i + 1}.png')
    print(f.split('/')[-1], len(doc), 'pages')
