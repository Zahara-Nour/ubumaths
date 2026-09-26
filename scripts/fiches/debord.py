"""
Débords de colonne dans les PDF de fiches (A4, marges 1 cm, 2 colonnes)
=======================================================================

Signale tout ce qui franchit la limite de sa colonne, dans les deux familles :
  - TEXTE (formules comprises) : un fragment qui déborde de sa colonne ;
  - TRACÉS vectoriels (arbres pondérés cetz, figures) : invisibles pour le seul
    texte ; un arbre à 3 épreuves débordait sur la colonne voisine (#444).
Mise en page : A4, marges latérales 1 cm, 2 colonnes, gouttière 4 % (défaut Typst).
L'en-tête pleine largeur de la 1re page (titre, bandeau CORRECTION, date) est ignoré.

Accepte des fichiers PDF et/ou des dossiers (tous leurs .pdf). Refuse de conclure
sans PDF : une liste vide affichait « 0 débord » sans rien avoir analysé.

Code de sortie : 0 aucun débord, 1 débord(s), 2 aucun PDF trouvé.
Dépendance : PyMuPDF (`pip install pymupdf`, voir docs/ref/fiches-exercices.md).

Usage : python scripts/fiches/debord.py <pdf ou dossier>...
"""
import glob
import os
import sys

import fitz

W = 595.28
M = 28.35
INNER = W - 2 * M
GUT = 0.04 * INNER
COL = (INNER - GUT) / 2
G = (M, M + COL)
D = (M + COL + GUT, W - M)
TOLERANCE = 5  # pt
EN_TETE = 150  # pt : hauteur de l'en-tête pleine largeur de la 1re page
PIED = 800  # pt : pied de page


def depasse(x0, x1):
    """Côté et largeur du débord d'une boîte horizontale, ou None."""
    if x0 < G[1] - 2 and x1 > G[1] + TOLERANCE:
        return 'G', round(x1 - G[1])
    if x0 >= D[0] - 2 and x1 > D[1] + TOLERANCE:
        return 'D', round(x1 - D[1])
    return None


def analyse(pdf):
    doc = fitz.open(pdf)
    trouves = []
    for pno, page in enumerate(doc):
        for bloc in page.get_text('dict')['blocks']:
            for ligne in bloc.get('lines', []):
                for span in ligne['spans']:
                    if not span['text'].strip():
                        continue
                    x0, y0, x1, _ = span['bbox']
                    if (pno == 0 and y0 < EN_TETE) or y0 > PIED:
                        continue
                    d = depasse(x0, x1)
                    if d:
                        trouves.append((pno + 1, 'texte', *d, span['text'][:25]))
        for trace in page.get_drawings():
            r = trace['rect']
            if r.width > COL * 0.9 and r.height > 200:
                continue  # fond d'une colonne (encadré du corrigé)
            if pno == 0 and r.y1 < EN_TETE:
                continue
            d = depasse(r.x0, r.x1)
            if d:
                trouves.append((pno + 1, 'tracé', *d, ''))
    return len(doc), trouves


def pdfs(arguments):
    for a in arguments:
        if os.path.isdir(a):
            yield from sorted(glob.glob(os.path.join(a, '*.pdf')))
        elif a.endswith('.pdf') and os.path.exists(a):
            yield a
        else:
            print(f'⛔ ni PDF ni dossier : {a}')


liste = list(pdfs(sys.argv[1:]))
if not liste:
    print('⛔ aucun PDF analysé')
    sys.exit(2)
total = 0
for pdf in liste:
    pages, trouves = analyse(pdf)
    total += len(trouves)
    detail = f'  débords : {len(trouves)} {trouves[:4]}' if trouves else ''
    print(f'{os.path.basename(pdf):32} {pages:3} p{detail}')
print(f'{len(liste)} PDF analysés — débords : {total}')
sys.exit(1 if total else 0)
