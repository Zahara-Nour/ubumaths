"""Écrit les 9 modèles du lot 10 du CE1 (espace et mesure) dans scripts/questions/ce1-10/.

Phase 0 validée par David le 2026-11-02 (§ 17 du journal `docs/wip/questions-ce1-progress.md`,
« tes recos ? » puis « go »). Bornes `cycle2.json` : CE1-044 (règle graduée, encadrer entre deux
entiers de centimètres), CE1-064 (reconnaître cube, boule, cône, pyramide, cylindre, pavé), CE1-065
(nommer cube, boule, pavé, cône, pyramide : pas le cylindre), CE1-079 (assemblages de cubes),
CE1-076 (à gauche, à droite, sur, sous, entre, devant, derrière, au-dessus, en dessous, près, loin),
CE1-077 (se situer dans un espace familier, plan), CE1-080 (au plus 15 instructions dont 4 virages ;
« avancer de », « pivoter d'un quart de tour »). Décisions :

1. Cylindre : ni dessiné ni proposé au 065 ; l'un des solides à trouver au 064.
2. 079 : compter (aucun cube caché : une rangée, ou deux rangées dont chaque colonne n'a de cubes
   que dans une rangée) et « le même assemblage » (choix de dessins) ; empiler = outil futur.
3. Gauche / droite (076, 077) : du point de vue de l'élève qui regarde le dessin, jamais d'un
   personnage vu de face. (080 : la droite du robot, qui fait partie du code.)
4. 080 « produire » : choisir le bon code parmi trois ; deux modèles (avance / pivote ; flèches).
5. Niveaux : premiers libres de chaque catégorie, aucun publié renuméroté.

Figures précalculées ici et tirées par une variable (`k` ou `u`) ; réponse d'un choix posée dans
une variable `a` (un `{{if:}}` imbriqué n'est pas résolu dans la réponse attendue). Variables à
une lettre ; jamais `e` ni `i`.

    python3 docs/wip/questions/lot-ce1-10.py scripts/questions/ce1-10
"""
import json
import random
import sys

DOSSIER = sys.argv[1]
ALEA = random.Random(20261102)

# ---- Gabarits (comme lot-ce1-9.py) ----


def spec(desc, vi, variables, answers, status):
    return {'description': desc, 'variationIndex': vi,
            'variables': {k: str(x) for k, x in variables.items()},
            'answers': answers if isinstance(answers, list) else [answers],
            'expected': {'status': status}}


def modele(title, description, theme, domain, subdomain, level, variations, specs, delay=90):
    # theme / domain / subdomain : anciennes colonnes, remplies pour create-questions ; le
    # rangement (sous-notion du point) est posé par la migration
    return {'title': title, 'description': description, 'grades': ['CE1'], 'theme': theme,
            'domain': domain, 'subdomain': subdomain, 'level': level, 'delay': delay,
            'status': 'draft', 'variations': variations, 'testSpecs': specs}


def var(nom, expression):
    return {'name': nom, 'expression': expression}


def variation(statement, reponses, variables, etapes, conditions=None):
    v = {'statement': statement, 'variables': variables}
    if conditions:
        v['conditions'] = conditions
    v['blanks'] = [{'expectedAnswer': r} for r in reponses]
    v['correction'] = {'steps': etapes}
    return v


def bloc(nom, *lignes):
    return '\n\n```' + nom + '\n' + '\n'.join(lignes) + '\n```'


def choix(lignes, melanger=True):
    tete = '' if melanger else 'melanger: non\n'
    return '\n\n```choix\n' + tete + ''.join('- ' + c + '\n' for c in lignes) + '```'


def choix_dessins(blocs):
    """Choix dont chaque option est un bloc dessiné (ouvert sur la ligne de l'item)."""
    items = []
    for nom, lignes in blocs:
        items.append('- ```' + nom + '\n' + ''.join('  ' + x + '\n' for x in lignes) + '  ```')
    return '\n\n````choix\n' + '\n'.join(items) + '\n````'


def selon(k, textes, n=1):
    """`{{if:k==1|…|{{if:k==2|…|…}}}}` : le texte numéro k (à partir de 1)."""
    textes = [str(t) for t in textes]
    if len(textes) == 1:
        return textes[0]
    return ('{{if:' + k + '==' + str(n) + '|' + textes[0] + '|' + selon(k, textes[1:], n + 1)
            + '}}')


def col(x, k=0):
    """Couleur DANS une formule (entre `$…$`)."""
    return '\\textcolor{{{color:primary.' + str(k) + '}}}{' + x + '}'


def colt(x, k=0):
    """Mots en couleur dans le texte : une formule à part (hors `$…$`, `\\textcolor` resterait brut)."""
    return '$' + col('\\text{' + x + '}', k) + '$'


def nombre(x):
    """2.5 → « 2.5 », 3.0 → « 3 » (coordonnées de figure)."""
    x = round(x, 2)
    return str(int(x)) if x == int(x) else str(x)


# ---- 01. Mesurer avec la règle (CE1-044) ----

REGLE_MAX = 15


def regle():
    lignes = ['regle1 = point(-0.4, 0, visible=faux)',
              f'regle2 = point({REGLE_MAX + 0.4}, 0, visible=faux)',
              f'regle3 = point({REGLE_MAX + 0.4}, 1.4, visible=faux)',
              'regle4 = point(-0.4, 1.4, visible=faux)',
              'regle = polygone(regle1, regle2, regle3, regle4, couleur="noir")']
    for g in range(REGLE_MAX + 1):
        lignes += [f'g{g}a = point({g}, 1.4, visible=faux)',
                   f'g{g}b = point({g}, 0.9, visible=faux)',
                   f'segment(g{g}a, g{g}b, couleur="noir")',
                   f'texte({g}, 0.5, "{g}")']
    return lignes


def segment_sur_regle(debut, fin):
    return [f'M = point({debut}, 2, visible=faux)',
            f'N = point({fin}, 2, visible=faux)',
            's = segment(M, N, couleur="bleu", epaisseur=3)',
            f'Mt1 = point({debut}, 1.7, visible=faux)',
            f'Mt2 = point({debut}, 2.3, visible=faux)',
            'segment(Mt1, Mt2, couleur="bleu", epaisseur=3)',
            f'Nt1 = point({fin}, 1.7, visible=faux)',
            f'Nt2 = point({fin}, 2.3, visible=faux)',
            'segment(Nt1, Nt2, couleur="bleu", epaisseur=3)']


def figure_regle(description, debut, fin):
    return ('```figure\nfenetre: -0.8 ; 15.8 ; -0.5 ; 3.9\ndescription: ' + description + '\n---\n'
            + '\n'.join(regle() + segment_sur_regle(debut, fin)) + '\n```')


PAS_AU_ZERO = variation(
    'Mesure ce segment avec la règle.\n\n'
    + figure_regle('Un segment posé au-dessus d\'une règle graduée en centimètres ; le segment ne'
                   ' commence pas au 0.', '{{d}}', '{{eval:d+L}}')
    + '\n\nLe segment mesure $?~\\text{cm}$.',
    ['{{L}}'], [var('d', '1..4'), var('L', '3..10')],
    ['Le segment ne commence pas au $0$ : il va du ${{d}}$ au ${{eval:d+L}}$ de la règle.',
     'On compte les centimètres entre les deux : de ${{d}}$ à ${{eval:d+L}}$, il y en a $'
     + col('{{L}}') + '$. Le segment mesure ${{L}}$ cm.'],
    ['d+L <= 15'])

ENCADRER = variation(
    'Mesure ce segment avec la règle.\n\n'
    + figure_regle('Un segment posé au-dessus d\'une règle graduée en centimètres, le 0 au début'
                   ' du segment ; le bout du segment tombe entre deux graduations.',
                   '0', '{{n}}.{{f}}')
    + '\n\nLe segment mesure entre $?~\\text{cm}$ et $?~\\text{cm}$.',
    ['{{n}}', '{{eval:n+1}}'], [var('n', '2..13'), var('f', '3..7')],
    ['Le segment commence au $0$. Son bout tombe entre le ${{n}}$ et le ${{eval:n+1}}$ de la'
     ' règle.',
     'Il mesure plus de ${{n}}$ cm et moins de ${{eval:n+1}}$ cm : entre $' + col('{{n}}')
     + '$ cm et $' + col('{{eval:n+1}}') + '$ cm.'])

SPECS_REGLE = [
    spec('Du 3 au 10 : 7 cm', 0, {'d': 3, 'L': 7}, '7', 'correct'),
    spec('Erreur : 10 (lu au bout, sans retirer le départ)', 0, {'d': 3, 'L': 7}, '10',
         'incorrect'),
    spec('Erreur : 8 (graduations comptées au lieu des intervalles)', 0, {'d': 3, 'L': 7}, '8',
         'incorrect'),
    spec('Du 1 au 4 : 3 cm', 0, {'d': 1, 'L': 3}, '3', 'correct'),
    spec('Entre 8 et 9 cm', 1, {'n': 8, 'f': 5}, ['8', '9'], 'correct'),
    spec('Erreur : entre 7 et 8', 1, {'n': 8, 'f': 5}, ['7', '8'], 'incorrect'),
    spec('Erreur : entre 9 et 8 (renversé)', 1, {'n': 8, 'f': 5}, ['9', '8'], 'incorrect'),
    spec('Erreur : entre 8 et 10 (à 2 cm près)', 1, {'n': 8, 'f': 5}, ['8', '10'], 'incorrect'),
]

# ---- 02, 03. Solides (CE1-064, CE1-065) ----

# Formes du bloc ```solide ; les dimensions tirées gardent chaque solide reconnaissable.
F_CUBE = 'forme: cube 3'
F_PAVE = 'forme: pave {{if:o==1|5 2.5 2|2.5 2 4.5}}'  # couché ou debout
F_PAVE_CARRE = 'forme: pave 4.5 3 3'  # deux faces carrées, à côté du cube
F_PYRAMIDE = 'forme: pyramide {{if:q==1|carree 3 3.5|triangle 3.5 3.5}}'
F_CONE = 'forme: cone 1.5 {{h}}'
F_CYLINDRE = 'forme: cylindre 1.5 {{h}}'
F_BOULE = 'forme: boule 2'

SOLIDE_VARS = [var('o', '1..2'), var('q', '1..2'), var('h', '3..4')]

DIT = {
    'cube': 'Le cube a $6$ faces, toutes des carrés de la même taille.',
    'pavé': 'Le pavé a $6$ faces, des rectangles : il est plus long dans un sens.',
    'pyramide': 'La pyramide a une base plate ({{if:q==1|un carré|un triangle}}) et des faces en'
                ' triangles qui se rejoignent en une pointe.',
    'cône': 'Le cône a une base ronde, un disque, et une face courbe qui finit en pointe.',
    'cylindre': 'Le cylindre a deux disques, en haut et en bas, reliés par une face courbe ;'
                ' il n\'a pas de pointe.',
    'boule': 'La boule est toute ronde : elle n\'a ni face plate, ni pointe, ni arête.',
}

LE = {'cube': 'le cube', 'pavé': 'le pavé', 'pyramide': 'la pyramide', 'cône': 'le cône',
      'cylindre': 'le cylindre', 'boule': 'la boule'}

FORME = {'cube': F_CUBE, 'pavé': F_PAVE, 'pyramide': F_PYRAMIDE, 'cône': F_CONE,
         'cylindre': F_CYLINDRE, 'boule': F_BOULE}

# 02 : le solide cherché d'abord, puis trois voisins qui lui ressemblent
OU_EST = [
    ('cube', [F_CUBE, F_PAVE_CARRE, F_PYRAMIDE, F_CYLINDRE]),
    ('pavé', [F_PAVE, F_CUBE, F_CYLINDRE, F_PYRAMIDE]),
    ('boule', [F_BOULE, F_CYLINDRE, F_CONE, F_CUBE]),
    ('cône', [F_CONE, F_PYRAMIDE, F_CYLINDRE, F_BOULE]),
    ('pyramide', [F_PYRAMIDE, F_CONE, F_CUBE, F_PAVE]),
    ('cylindre', [F_CYLINDRE, F_CONE, F_PAVE, F_BOULE]),
]


def ou_est(nom, formes):
    return variation(
        'Où est ' + LE[nom] + ' ?'
        + choix_dessins([('solide', [f]) for f in formes]),
        ['0'], SOLIDE_VARS,
        [DIT[nom], 'C\'est ' + colt(LE[nom]) + '.'])


OU_EST_VARIATIONS = [ou_est(n, f) for n, f in OU_EST]

SPECS_OU_EST = [
    spec('Le cube', 0, {'o': 1, 'q': 1, 'h': 3}, '0', 'correct'),
    spec('Erreur : le pavé à faces carrées pris pour le cube', 0, {'o': 1, 'q': 1, 'h': 3}, '1',
         'incorrect'),
    spec('Le pavé debout', 1, {'o': 2, 'q': 1, 'h': 3}, '0', 'correct'),
    spec('Erreur : le cube pris pour le pavé', 1, {'o': 2, 'q': 1, 'h': 3}, '1', 'incorrect'),
    spec('La boule', 2, {'o': 1, 'q': 2, 'h': 4}, '0', 'correct'),
    spec('Le cône', 3, {'o': 1, 'q': 2, 'h': 4}, '0', 'correct'),
    spec('Erreur : la pyramide prise pour le cône', 3, {'o': 1, 'q': 2, 'h': 4}, '1',
         'incorrect'),
    spec('La pyramide à base triangle', 4, {'o': 1, 'q': 2, 'h': 3}, '0', 'correct'),
    spec('Erreur : le cône pris pour la pyramide', 4, {'o': 1, 'q': 2, 'h': 3}, '1', 'incorrect'),
    spec('Le cylindre', 5, {'o': 2, 'q': 1, 'h': 4}, '0', 'correct'),
    spec('Erreur : le cône pris pour le cylindre', 5, {'o': 2, 'q': 1, 'h': 4}, '1', 'incorrect'),
]

# 03 : un solide dessiné, cinq noms (sans le cylindre)
NOMS_065 = ['cube', 'pavé', 'boule', 'cône', 'pyramide']
C_NOMS = ['C\'est ' + ('une ' if n in ('boule', 'pyramide') else 'un ') + n + '.' for n in NOMS_065]


def nomme(nom):
    return variation(
        'Comment s\'appelle ce solide ?' + bloc('solide', FORME[nom]) + choix(C_NOMS),
        [str(NOMS_065.index(nom))], SOLIDE_VARS,
        [DIT[nom], 'C\'est ' + colt(('une ' if nom in ('boule', 'pyramide') else 'un ') + nom)
         + '.'])


NOMME_VARIATIONS = [nomme(n) for n in NOMS_065]

SPECS_NOMME = [
    spec('Cube', 0, {'o': 1, 'q': 1, 'h': 3}, '0', 'correct'),
    spec('Erreur : cube pris pour un pavé', 0, {'o': 1, 'q': 1, 'h': 3}, '1', 'incorrect'),
    spec('Pavé couché', 1, {'o': 1, 'q': 1, 'h': 3}, '1', 'correct'),
    spec('Erreur : pavé pris pour un cube', 1, {'o': 1, 'q': 1, 'h': 3}, '0', 'incorrect'),
    spec('Boule', 2, {'o': 1, 'q': 1, 'h': 3}, '2', 'correct'),
    spec('Cône', 3, {'o': 1, 'q': 1, 'h': 4}, '3', 'correct'),
    spec('Erreur : cône pris pour une pyramide', 3, {'o': 1, 'q': 1, 'h': 4}, '4', 'incorrect'),
    spec('Pyramide à base carrée', 4, {'o': 1, 'q': 1, 'h': 3}, '4', 'correct'),
    spec('Erreur : pyramide prise pour un cône', 4, {'o': 1, 'q': 1, 'h': 3}, '3', 'incorrect'),
]

# ---- 04, 05. Assemblages de cubes (CE1-079) ----

UNE_RANGEE = 'hauteurs: {{a}} {{b}} {{c}} {{d}}'
# rangée du fond d'abord : chaque colonne n'a de cubes que dans une rangée (aucun cube caché)
DEUX_RANGEES = 'hauteurs: 0 {{b}} 0 {{d}} / {{a}} 0 {{c}} 0'
VARS_PILES = [var('a', '1..3'), var('b', '1..3'), var('c', '1..3'), var('d', '1..3')]
SOMME = '{{eval:a+b+c+d}}'

COMBIEN_UNE = variation(
    'Combien de cubes faut-il pour construire cet assemblage ?' + bloc('cubes', UNE_RANGEE)
    + '\n\n$?$',
    [SOMME], VARS_PILES,
    ['On compte les cubes de chaque pile, de gauche à droite : ${{a}}$, ${{b}}$, ${{c}}$ et'
     ' ${{d}}$.',
     '${{a}} + {{b}} + {{c}} + {{d}} = ' + col(SOMME) + '$ cubes.'],
    ['a+b+c+d <= 10'])

COMBIEN_DEUX = variation(
    'Combien de cubes faut-il pour construire cet assemblage ?' + bloc('cubes', DEUX_RANGEES)
    + '\n\n$?$',
    [SOMME], VARS_PILES,
    ['Les piles sont sur deux rangées, l\'une devant, l\'autre derrière. On compte chaque pile,'
     ' de gauche à droite : ${{a}}$, ${{b}}$, ${{c}}$ et ${{d}}$.',
     '${{a}} + {{b}} + {{c}} + {{d}} = ' + col(SOMME) + '$ cubes.'],
    ['a+b+c+d <= 10'])

SPECS_COMBIEN = [
    spec('2, 1, 3, 1 : 7 cubes', 0, {'a': 2, 'b': 1, 'c': 3, 'd': 1}, '7', 'correct'),
    spec('Erreur : 4 (les piles comptées, pas les cubes)', 0, {'a': 2, 'b': 1, 'c': 3, 'd': 1},
         '4', 'incorrect'),
    spec('Erreur : 6 (un cube oublié)', 0, {'a': 2, 'b': 1, 'c': 3, 'd': 1}, '6', 'incorrect'),
    spec('Deux rangées, 3, 2, 1, 2 : 8 cubes', 1, {'a': 3, 'b': 2, 'c': 1, 'd': 2}, '8',
         'correct'),
    spec('Erreur : 4 (les piles)', 1, {'a': 3, 'b': 2, 'c': 1, 'd': 2}, '4', 'incorrect'),
]


def le_meme(modele_hauteurs, ajoute, echange, description_piles):
    return variation(
        'Voici un assemblage de cubes.' + bloc('cubes', modele_hauteurs)
        + '\n\nQuel assemblage est le même ?'
        + choix_dessins([('cubes', [modele_hauteurs]), ('cubes', [ajoute]),
                         ('cubes', [echange])]),
        ['0'], VARS_PILES,
        ['On compare pile par pile, de gauche à droite : ' + description_piles + '.',
         'Le ' + colt('même assemblage') + ' a les mêmes piles, aux mêmes places. Un autre a un'
         ' cube de plus ; un autre a le même nombre de cubes, mais deux piles ont changé de'
         ' place.'],
        ['a != b'])


MEME_UNE = le_meme(UNE_RANGEE, 'hauteurs: {{a}} {{b}} {{eval:c+1}} {{d}}',
                   'hauteurs: {{b}} {{a}} {{c}} {{d}}',
                   '${{a}}$, ${{b}}$, ${{c}}$ et ${{d}}$ cubes')
MEME_DEUX = le_meme(DEUX_RANGEES, 'hauteurs: 0 {{b}} 0 {{d}} / {{a}} 0 {{eval:c+1}} 0',
                    'hauteurs: 0 {{a}} 0 {{d}} / {{b}} 0 {{c}} 0',
                    '${{a}}$ devant, ${{b}}$ derrière, ${{c}}$ devant, ${{d}}$ derrière')

SPECS_MEME = [
    spec('Le même', 0, {'a': 2, 'b': 1, 'c': 3, 'd': 1}, '0', 'correct'),
    spec('Erreur : un cube de plus', 0, {'a': 2, 'b': 1, 'c': 3, 'd': 1}, '1', 'incorrect'),
    spec('Erreur : deux piles échangées (même nombre de cubes)', 0,
         {'a': 2, 'b': 1, 'c': 3, 'd': 1}, '2', 'incorrect'),
    spec('Deux rangées : le même', 1, {'a': 1, 'b': 3, 'c': 2, 'd': 2}, '0', 'correct'),
    spec('Deux rangées, erreur : piles échangées', 1, {'a': 1, 'b': 3, 'c': 2, 'd': 2}, '2',
         'incorrect'),
]

# ---- 06. Positions sur une étagère (CE1-076) ----

# nom : (le …, du …, dessin) ; dessin = lignes de figure centrées en (x, y) = bas de l'objet


def dessin_ballon(x, y, p):
    return [f'{p}o = point({nombre(x)}, {nombre(y + 0.55)}, visible=faux)',
            f'{p} = cercle({p}o, rayon=0.55, couleur="noir", remplissage="rouge", opacite_fond=1)']


def poly(p, pts, couleur):
    lignes = [f'{p}{j} = point({nombre(px)}, {nombre(py)}, visible=faux)'
              for j, (px, py) in enumerate(pts)]
    noms = ', '.join(f'{p}{j}' for j in range(len(pts)))
    return lignes + [f'{p} = polygone({noms}, couleur="noir", remplissage="{couleur}",'
                     ' opacite_fond=1)']


def dessin_boite(x, y, p):
    return poly(p, [(x - 0.55, y), (x + 0.55, y), (x + 0.55, y + 1.1), (x - 0.55, y + 1.1)],
                'bleu')


def dessin_livre(x, y, p):
    return poly(p, [(x - 0.35, y), (x + 0.35, y), (x + 0.35, y + 1.3), (x - 0.35, y + 1.3)],
                'vert')


def dessin_tente(x, y, p):
    return poly(p, [(x - 0.7, y), (x + 0.7, y), (x, y + 1.1)], 'orange')


def dessin_pot(x, y, p):
    return poly(p, [(x - 0.4, y), (x + 0.4, y), (x + 0.6, y + 1), (x - 0.6, y + 1)], 'marron')


def dessin_etoile(x, y, p):
    import math
    pts = []
    for j in range(10):
        r = 0.65 if j % 2 == 0 else 0.27
        a = math.radians(90 + 36 * j)
        pts.append((x + r * math.cos(a), y + 0.6 + r * math.sin(a)))
    return poly(p, pts, 'violet')


OBJETS = {
    'ballon': ('le ballon', 'du ballon', dessin_ballon),
    'boîte': ('la boîte', 'de la boîte', dessin_boite),
    'livre': ('le livre', 'du livre', dessin_livre),
    'tente': ('la tente', 'de la tente', dessin_tente),
    'pot': ('le pot', 'du pot', dessin_pot),
    'étoile': ('l\'étoile', 'de l\'étoile', dessin_etoile),
}
NOMS_OBJETS = list(OBJETS)
C_OBJETS = [OBJETS[n][0][0].upper() + OBJETS[n][0][1:] + '.' for n in NOMS_OBJETS]

COLONNES = [2, 5, 8]
PLANCHES = [3.6, 0.6]  # haut, bas (y du dessus de la planche)


def etagere(rangement, description):
    """rangement[r][c] = nom de l'objet, rangée r (0 = haut), colonne c (0 = gauche)."""
    lignes = []
    for r, y in enumerate(PLANCHES):
        lignes += [f'pl{r}a = point(0.5, {y}, visible=faux)',
                   f'pl{r}b = point(9.5, {y}, visible=faux)',
                   f'segment(pl{r}a, pl{r}b, couleur="marron", epaisseur=5)']
    for r, rangee in enumerate(rangement):
        for c, nom in enumerate(rangee):
            x, y = COLONNES[c], PLANCHES[r]
            lignes += OBJETS[nom][2](x, y, f'o{r}{c}')
            lignes.append(f'texte({x}, {nombre(y - 0.4)}, "{nom}")')
    return ('```figure\nfenetre: 0 ; 10 ; -0.2 ; 6\ndescription: ' + description + '\n---\n'
            + '\n'.join(lignes) + '\n```')


def rangements(n):
    out = []
    while len(out) < n:
        noms = NOMS_OBJETS[:]
        ALEA.shuffle(noms)
        r = [noms[:3], noms[3:]]
        if r not in out:
            out.append(r)
    return out


RANGEMENTS = rangements(6)
ETAGERE_DESC = 'Une étagère à deux planches ; sur chacune, trois objets avec leur nom.'


def etagere_selon(k):
    """Une figure par rangement, tirée par k (le texte entier d'une figure par branche)."""
    return selon(k, [etagere(r, ETAGERE_DESC) for r in RANGEMENTS])


# Les figures étant longues, une variation = un rangement tiré par k, et la question tirée
# par une seconde variable ; les textes sont posés par u = (k, question).

def entre_variation():
    cas = []  # (k, rangée)
    for k in range(6):
        for r in range(2):
            cas.append((k, r))
    textes = []
    reponses = []
    for k, r in cas:
        rg = RANGEMENTS[k][r]
        textes.append(('du haut' if r == 0 else 'du bas', OBJETS[rg[0]][0], OBJETS[rg[2]][0]))
        reponses.append(NOMS_OBJETS.index(rg[1]))
    figure = selon('k', [etagere(r, ETAGERE_DESC) for r in RANGEMENTS])
    return variation(
        'Sur la planche ' + selon('u', [t[0] for t in textes]) + ', quel objet est entre '
        + selon('u', [t[1] for t in textes]) + ' et ' + selon('u', [t[2] for t in textes])
        + ' ?\n\n' + figure + choix(C_OBJETS, melanger=False),
        ['{{a}}'],
        [var('u', '1..12'), var('k', selon('u', [k + 1 for k, _ in cas])),
         var('a', selon('u', reponses))],
        ['Sur la planche ' + selon('u', [t[0] for t in textes]) + ', '
         + colt(selon('u', [OBJETS[RANGEMENTS[k][r][1]][0] for k, r in cas])) + ' est au milieu :'
         ' d\'un côté ' + selon('u', [t[1] for t in textes]) + ', de l\'autre '
         + selon('u', [t[2] for t in textes]) + '.'])


def dessus_dessous_variation():
    cas = []  # (k, colonne, sens) : sens 0 = « au-dessus de » l'objet du bas
    for k in range(6):
        for s in range(2):
            cas.append((k, (k + s) % 3, s))
    textes, reponses, cibles = [], [], []
    for k, c, s in cas:
        haut, bas = RANGEMENTS[k][0][c], RANGEMENTS[k][1][c]
        if s == 0:
            textes.append('au-dessus ' + OBJETS[bas][1])
            reponses.append(NOMS_OBJETS.index(haut))
            cibles.append((haut, 'au-dessus', bas))
        else:
            textes.append('en dessous ' + OBJETS[haut][1])
            reponses.append(NOMS_OBJETS.index(bas))
            cibles.append((bas, 'en dessous', haut))
    figure = selon('k', [etagere(r, ETAGERE_DESC) for r in RANGEMENTS])
    return variation(
        'Quel objet est juste ' + selon('u', textes) + ' ?\n\n' + figure
        + choix(C_OBJETS, melanger=False),
        ['{{a}}'],
        [var('u', '1..12'), var('k', selon('u', [k + 1 for k, _, _ in cas])),
         var('a', selon('u', reponses))],
        [colt(selon('u', [OBJETS[a][0] for a, _, _ in cibles])) + ' est sur l\'autre planche, '
         + selon('u', ['juste au-dessus ' + OBJETS[b][1] if s == 'au-dessus'
                       else 'juste en dessous ' + OBJETS[b][1] for _, s, b in cibles]) + '.'])


RELATIONS = ['à gauche', 'à droite', 'au-dessus', 'en dessous']


def relation_variation():
    cas = []  # (k, objet, relation, repère)
    for k in range(6):
        rg = RANGEMENTS[k]
        r = k % 2
        c = k % 2  # une paire horizontale
        if k % 2 == 0:
            cas.append((k, rg[r][c], 0, rg[r][c + 1]))  # à gauche
        else:
            cas.append((k, rg[r][c + 1], 1, rg[r][c]))  # à droite
        c2 = (k + 1) % 3  # une paire verticale
        if k % 2 == 0:
            cas.append((k, rg[1][c2], 3, rg[0][c2]))  # en dessous
        else:
            cas.append((k, rg[0][c2], 2, rg[1][c2]))  # au-dessus
    figure = selon('k', [etagere(r, ETAGERE_DESC) for r in RANGEMENTS])
    objet = selon('u', [OBJETS[o][0][0].upper() + OBJETS[o][0][1:] for _, o, _, _ in cas])
    repere = selon('u', [OBJETS[p][1] for _, _, _, p in cas])
    return variation(
        objet + ' est … ' + repere + '.\n\n' + figure + choix(RELATIONS, melanger=False),
        ['{{a}}'],
        [var('u', '1..12'), var('k', selon('u', [k + 1 for k, _, _, _ in cas])),
         var('a', selon('u', [rel for _, _, rel, _ in cas]))],
        ['On regarde le dessin, tel qu\'on le voit.',
         objet + ' est ' + colt(selon('u', [RELATIONS[rel] for _, _, rel, _ in cas])) + ' '
         + repere + '.'])


# Près, loin : une seule planche, quatre objets à des places inégales ; le repère à un bout.

def planche_pres_loin(places, description):
    lignes = ['pla = point(0.3, 0.6, visible=faux)', 'plb = point(9.7, 0.6, visible=faux)',
              'segment(pla, plb, couleur="marron", epaisseur=5)']
    for j, (nom, x) in enumerate(places):
        lignes += OBJETS[nom][2](x, 0.6, f'p{j}')
        lignes.append(f'texte({nombre(x)}, 0.2, "{nom}")')
    return ('```figure\nfenetre: 0 ; 10 ; -0.2 ; 2.6\ndescription: ' + description + '\n---\n'
            + '\n'.join(lignes) + '\n```')


def tirages_pres_loin(n):
    out = []
    while len(out) < n:
        noms = NOMS_OBJETS[:]
        ALEA.shuffle(noms)
        noms = noms[:4]
        # repère à gauche (x = 1) ; trois autres à des distances bien distinctes
        xs = sorted(ALEA.sample([3.2, 4.4, 5.8, 7.2, 8.8], 3))
        if min(b - a for a, b in zip([1] + xs, xs)) < 1.3:
            continue
        gauche = ALEA.random() < 0.5
        places = [(noms[0], 1)] + list(zip(noms[1:], xs))
        if not gauche:  # miroir : repère à droite
            places = [(n_, round(10 - x, 2)) for n_, x in places]
        out.append(places)
    return out


PRES_LOIN = tirages_pres_loin(6)


def pres_loin_variation():
    cas = [(k, s) for k in range(6) for s in range(2)]  # s 0 = plus près, 1 = plus loin
    textes, reponses, cibles = [], [], []
    for k, s in cas:
        places = PRES_LOIN[k]
        repere, xr = places[0]
        autres = sorted(places[1:], key=lambda p: abs(p[1] - xr))
        cible = autres[0][0] if s == 0 else autres[-1][0]
        textes.append(('le plus près ' if s == 0 else 'le plus loin ') + OBJETS[repere][1])
        reponses.append(NOMS_OBJETS.index(cible))
        cibles.append((cible, s, repere))
    figure = selon('k', [planche_pres_loin(p, 'Une planche et quatre objets avec leur nom, plus'
                                           ' ou moins écartés.') for p in PRES_LOIN])
    return variation(
        'Quel objet est ' + selon('u', textes) + ' ?\n\n' + figure
        + choix(C_OBJETS, melanger=False),
        ['{{a}}'],
        [var('u', '1..12'), var('k', selon('u', [k + 1 for k, _ in cas])),
         var('a', selon('u', reponses))],
        ['On regarde l\'écart entre ' + selon('u', [OBJETS[r][0] for _, _, r in cibles])
         + ' et chacun des autres objets.',
         colt(selon('u', [OBJETS[c][0] for c, _, _ in cibles])) + ' est '
         + selon('u', ['le plus près' if s == 0 else 'le plus loin' for _, s, _ in cibles]) + '.'])


ENTRE = entre_variation()
DESSUS_DESSOUS = dessus_dessous_variation()
RELATION = relation_variation()
PRES_LOIN_V = pres_loin_variation()


def valeurs(variation_, nom):
    """Valeurs (par u = 1, 2, …) d'une variable tirée par `selon('u', …)`."""
    import re
    expr = [v for v in variation_['variables'] if v['name'] == nom][0]['expression']
    morceaux = re.findall(r'\{\{if:u==\d+\|([^|{}]*)\|', expr)
    dernier = re.search(r'\|([^|{}]*)\}\}+$', expr).group(1)
    return [int(x) for x in morceaux + [dernier]]


def specs_positions(vi, variation_, desc, faux):
    aa = valeurs(variation_, "a")
    out = []
    for u in (1, 6, 11):
        out.append(spec(f'{desc} (u = {u})', vi, {'u': u}, str(aa[u - 1]), 'correct'))
    u = 2
    out.append(spec(f'Erreur : {faux}', vi, {'u': u},
                    str((aa[u - 1] + 1) % (4 if vi == 2 else 6)), 'incorrect'))
    return out


SPECS_POSITIONS = (specs_positions(0, ENTRE, 'Entre', 'un voisin, pas celui du milieu')
                   + specs_positions(1, DESSUS_DESSOUS, 'Au-dessus, en dessous',
                                     'un autre objet de la planche')
                   + specs_positions(2, RELATION, 'Gauche, droite, dessus, dessous',
                                     'une autre relation')
                   + specs_positions(3, PRES_LOIN_V, 'Près, loin', 'un autre objet'))

# ---- 07. Sur le plan du quartier (CE1-077) ----

BATIMENTS = ['école', 'mairie', 'poste', 'parc', 'piscine', 'gare']
LE_BAT = {'école': 'l\'école', 'mairie': 'la mairie', 'poste': 'la poste', 'parc': 'le parc',
          'piscine': 'la piscine', 'gare': 'la gare'}
DE_BAT = {'école': 'de l\'école', 'mairie': 'de la mairie', 'poste': 'de la poste',
          'parc': 'du parc', 'piscine': 'de la piscine', 'gare': 'de la gare'}
FOND = {'école': 'orange', 'mairie': 'bleu', 'poste': 'jaune', 'parc': 'vert',
        'piscine': 'cyan', 'gare': 'rose'}
C_BAT = [LE_BAT[b][0].upper() + LE_BAT[b][1:] + '.' for b in BATIMENTS]
# x des trois bâtiments d'un côté : écarts inégaux (le plus près se voit)
XS_PLAN = [[1.5, 3.9, 8.5], [1.5, 6.1, 8.5]]
Y_PLAN = [4.6, 0.6]  # bas des bâtiments : en haut du plan, en bas du plan


def plan(rangement, xs):
    lignes = ['r1 = point(0, 3, visible=faux)', 'r2 = point(10, 3, visible=faux)',
              'r3 = point(10, 4.2, visible=faux)', 'r4 = point(0, 4.2, visible=faux)',
              'rue = polygone(r1, r2, r3, r4, couleur="gris", remplissage="gris", opacite_fond=0.4)',
              'texte(5, 3.45, "rue")']
    for r, rangee in enumerate(rangement):
        for c, nom in enumerate(rangee):
            x, y = xs[c], Y_PLAN[r]
            p = f'b{r}{c}'
            pts = [(x - 0.9, y), (x + 0.9, y), (x + 0.9, y + 1.7), (x - 0.9, y + 1.7)]
            lignes += [f'{p}{j} = point({nombre(px)}, {nombre(py)}, visible=faux)'
                       for j, (px, py) in enumerate(pts)]
            lignes.append(f'{p} = polygone({p}0, {p}1, {p}2, {p}3, couleur="noir",'
                          f' remplissage="{FOND[nom]}", opacite_fond=0.5)')
            lignes.append(f'texte({nombre(x)}, {nombre(y + 0.7)}, "{nom}")')
    return ('```figure\nfenetre: 0 ; 10 ; 0 ; 7\ndescription: Le plan d\'un quartier vu du dessus :'
            ' une rue, trois bâtiments de chaque côté, avec leur nom.\n---\n'
            + '\n'.join(lignes) + '\n```')


def plans(n):
    out = []
    while len(out) < n:
        noms = BATIMENTS[:]
        ALEA.shuffle(noms)
        p = ([noms[:3], noms[3:]], len(out) % 2)
        if p not in out:
            out.append(p)
    return out


PLANS = plans(6)
FIG_PLAN = selon('k', [plan(r, XS_PLAN[x]) for r, x in PLANS])
INTRO_PLAN = 'Voici le plan d\'un quartier, vu du dessus.\n\n' + FIG_PLAN + '\n\n'


def plan_entre():
    cas = [(k, r) for k in range(6) for r in range(2)]
    t, rep = [], []
    for k, r in cas:
        rg = PLANS[k][0][r]
        t.append((LE_BAT[rg[0]], LE_BAT[rg[2]], LE_BAT[rg[1]]))
        rep.append(BATIMENTS.index(rg[1]))
    return variation(
        INTRO_PLAN + 'Du même côté de la rue, qu\'y a-t-il entre ' + selon('u', [x[0] for x in t])
        + ' et ' + selon('u', [x[1] for x in t]) + ' ?' + choix(C_BAT, melanger=False),
        ['{{a}}'],
        [var('u', '1..12'), var('k', selon('u', [k + 1 for k, _ in cas])),
         var('a', selon('u', rep))],
        ['Du même côté de la rue, on trouve ' + selon('u', [x[0] for x in t]) + ', puis '
         + colt(selon('u', [x[2] for x in t])) + ', puis ' + selon('u', [x[1] for x in t]) + '.'])


def plan_en_face():
    cas = [(k, s) for k in range(6) for s in range(2)]
    t, rep = [], []
    for k, s in cas:
        c = (k + s) % 3
        haut, bas = PLANS[k][0][0][c], PLANS[k][0][1][c]
        a, b = (haut, bas) if s == 0 else (bas, haut)
        t.append((LE_BAT[a], LE_BAT[b], DE_BAT[a]))
        rep.append(BATIMENTS.index(b))
    return variation(
        INTRO_PLAN + 'Qu\'y a-t-il en face ' + selon('u', [x[2] for x in t])
        + ', de l\'autre côté de la rue ?' + choix(C_BAT, melanger=False),
        ['{{a}}'],
        [var('u', '1..12'), var('k', selon('u', [k + 1 for k, _ in cas])),
         var('a', selon('u', rep))],
        ['On traverse la rue tout droit depuis ' + selon('u', [x[0] for x in t]) + ' : on arrive à '
         + colt(selon('u', [x[1] for x in t])) + '.'])


def plan_pres():
    cas = [(k, r) for k in range(6) for r in range(2)]
    t, rep = [], []
    for k, r in cas:
        rg, x = PLANS[k][0][r], XS_PLAN[PLANS[k][1]]
        pres = rg[0] if x[1] - x[0] < x[2] - x[1] else rg[2]
        t.append((DE_BAT[rg[1]], LE_BAT[pres], LE_BAT[rg[1]]))
        rep.append(BATIMENTS.index(pres))
    return variation(
        INTRO_PLAN + 'Du même côté de la rue, quel bâtiment est le plus près '
        + selon('u', [x[0] for x in t]) + ' ?' + choix(C_BAT, melanger=False),
        ['{{a}}'],
        [var('u', '1..12'), var('k', selon('u', [k + 1 for k, _ in cas])),
         var('a', selon('u', rep))],
        [selon('u', [x[2][0].upper() + x[2][1:] for x in t]) + ' a un voisin de chaque côté ; '
         + colt(selon('u', [x[1] for x in t])) + ' est le plus près, l\'autre est plus loin.'])


def plan_gauche_droite():
    cas = [(k, s) for k in range(6) for s in range(2)]
    t, rep = [], []
    for k, s in cas:
        r = s
        rg = PLANS[k][0][r]
        if (k + s) % 2 == 0:
            t.append((LE_BAT[rg[0]], DE_BAT[rg[2]], 0))  # à gauche
        else:
            t.append((LE_BAT[rg[2]], DE_BAT[rg[0]], 1))  # à droite
        rep.append(t[-1][2])
    return variation(
        INTRO_PLAN + 'Sur le plan, ' + selon('u', [x[0] for x in t]) + ' est … '
        + selon('u', [x[1] for x in t]) + '.' + choix(['à gauche', 'à droite'], melanger=False),
        ['{{a}}'],
        [var('u', '1..12'), var('k', selon('u', [k + 1 for k, _ in cas])),
         var('a', selon('u', rep))],
        ['On regarde le plan tel qu\'on le voit : ' + selon('u', [x[0] for x in t]) + ' est '
         + colt(selon('u', ['à gauche' if x[2] == 0 else 'à droite' for x in t])) + ' '
         + selon('u', [x[1] for x in t]) + '.'])


PLAN_ENTRE, PLAN_FACE, PLAN_PRES, PLAN_GD = plan_entre(), plan_en_face(), plan_pres(), \
    plan_gauche_droite()

SPECS_PLAN = []
for vi, v, desc in [(0, PLAN_ENTRE, 'Entre'), (1, PLAN_FACE, 'En face'),
                    (2, PLAN_PRES, 'Le plus près'), (3, PLAN_GD, 'À gauche, à droite')]:
    aa = valeurs(v, "a")
    n = 2 if vi == 3 else 6
    for u in (1, 8):
        SPECS_PLAN.append(spec(f'{desc} (u = {u})', vi, {'u': u}, str(aa[u - 1]), 'correct'))
    SPECS_PLAN.append(spec(f'{desc}, erreur', vi, {'u': 3},
                           str((aa[2] + 1) % n), 'incorrect'))

# ---- 08, 09. Le robot (CE1-080) ----

DIRS = {'N': (0, 1), 'E': (1, 0), 'S': (0, -1), 'O': (-1, 0)}
TOUR_D = {'N': 'E', 'E': 'S', 'S': 'O', 'O': 'N'}
TOUR_G = {v: k for k, v in TOUR_D.items()}


def execute(depart, dir0, code, largeur, hauteur):
    """Suit un code relatif ; None si le robot sort du quadrillage."""
    (x, y), d = depart, dir0
    for ins in code:
        if ins == 'D':
            d = TOUR_D[d]
        elif ins == 'G':
            d = TOUR_G[d]
        else:
            dx, dy = DIRS[d]
            x, y = x + ins * dx, y + ins * dy
            if not (0 <= x <= largeur and 0 <= y <= hauteur):
                return None
    return (x, y)


def inverse(code):
    return [{'D': 'G', 'G': 'D'}.get(c, c) for c in code]


def texte_code(code):
    mots = []
    for c in code:
        if c == 'D':
            mots.append('pivote à droite')
        elif c == 'G':
            mots.append('pivote à gauche')
        else:
            mots.append(f'avance de {c}')
    return ', '.join(mots)


RL, RH = 8, 5  # nœuds du quadrillage du robot : x 0..8, y 0..5


def tire_code_relatif():
    while True:
        virages = ALEA.randint(1, 3)
        code = []
        for v in range(virages + 1):
            code.append(ALEA.randint(1, 4))
            if v < virages:
                code.append(ALEA.choice('DG'))
        if not 3 <= len(code) <= 7:
            continue
        depart = (ALEA.randint(1, RL - 1), ALEA.randint(0, 2))
        dir0 = ALEA.choice('NE')
        fin = execute(depart, dir0, code, RL, RH)
        faux_virages = execute(depart, dir0, inverse(code), RL, RH)
        tout_droit = execute(depart, dir0, [c for c in code if c not in ('D', 'G')], RL, RH)
        # code faux pour « quel code ? » : la dernière avance d'un carreau de plus
        plus_un = code[:-1] + [code[-1] + 1]
        fin_plus_un = execute(depart, dir0, plus_un, RL, RH)
        points_ = [fin, faux_virages, tout_droit]
        if None in points_ or fin_plus_un is None or len(set(points_)) < 3:
            continue
        if fin == depart or fin_plus_un == fin:
            continue
        return {'code': code, 'depart': depart, 'dir': dir0, 'points': points_,
                'plus_un': plus_un}


def robot(depart, d):
    """Triangle rouge pointé dans la direction d, sur le nœud de départ."""
    x, y = depart
    dx, dy = DIRS[d]
    px, py = -dy, dx
    pts = [(x + 0.4 * dx, y + 0.4 * dy), (x - 0.25 * dx + 0.25 * px, y - 0.25 * dy + 0.25 * py),
           (x - 0.25 * dx - 0.25 * px, y - 0.25 * dy - 0.25 * py)]
    lignes = [f'rb{j} = point({nombre(a)}, {nombre(b)}, visible=faux)'
              for j, (a, b) in enumerate(pts)]
    return lignes + ['rb = polygone(rb0, rb1, rb2, couleur="noir", remplissage="rouge",'
                     ' opacite_fond=1)']


def carre_depart(depart):
    x, y = depart
    pts = [(x - 0.2, y - 0.2), (x + 0.2, y - 0.2), (x + 0.2, y + 0.2), (x - 0.2, y + 0.2)]
    return [f'dp{j} = point({nombre(a)}, {nombre(b)}, visible=faux)'
            for j, (a, b) in enumerate(pts)] + [
        'dp = polygone(dp0, dp1, dp2, dp3, couleur="noir", remplissage="rouge", opacite_fond=1)']


def arrivee(fin):
    x, y = fin
    pts = [(x - 0.2, y - 0.2), (x + 0.2, y - 0.2), (x + 0.2, y + 0.2), (x - 0.2, y + 0.2)]
    return [f'ar{j} = point({nombre(a)}, {nombre(b)}, visible=faux)'
            for j, (a, b) in enumerate(pts)] + [
        'ar = polygone(ar0, ar1, ar2, ar3, couleur="noir", remplissage="vert", opacite_fond=1)']


def points_numerotes(points_, etiquettes):
    lignes = []
    for j, ((x, y), lab) in enumerate(zip(points_, etiquettes)):
        lignes.append(f'P{j} = point({x}, {y}, couleur="noir", etiquette="aucune")')
        lignes.append(f'texte({nombre(x + 0.3)}, {nombre(y + 0.3)}, "{lab}")')
    return lignes


def fig_robot(fenetre, description, lignes):
    return ('```figure\nfenetre: ' + fenetre + '\ndescription: ' + description
            + '\ngrille: oui\n---\n' + '\n'.join(lignes) + '\n```')


FEN_ROBOT = f'-0.6 ; {RL + 0.6} ; -0.6 ; {RH + 0.6}'
REGLE_ROBOT = ('**Avance de 2** : le robot avance de $2$ carreaux, tout droit, dans le sens où il'
               ' regarde. **Pivote à droite** (ou **à gauche**) : il tourne sur place d\'un quart'
               ' de tour vers sa droite (ou sa gauche), sans avancer.')

N_ROBOT = 10
CODES_RELATIFS = [tire_code_relatif() for _ in range(N_ROBOT)]
for p in CODES_RELATIFS:
    labs = [1, 2, 3]
    ALEA.shuffle(labs)
    p['labels'] = labs  # labels[j] = numéro écrit à côté du point j (0 = la bonne arrivée)


def ou_arrive(programmes, fenetre, regle_txt, texte_code_fn, intro, dessin_depart):
    figures = [fig_robot(fenetre, 'Un quadrillage, le robot au départ et trois points numérotés 1,'
                         ' 2 et 3.', dessin_depart(p) + points_numerotes(p['points'], p['labels']))
               for p in programmes]
    return variation(
        intro + regle_txt + '\n\nCode : ' + selon('k', [texte_code_fn(p) for p in programmes])
        + '\n\n' + selon('k', figures) + '\n\nOù arrive le robot ?'
        + choix(['Au point 1.', 'Au point 2.', 'Au point 3.'], melanger=False),
        ['{{a}}'],
        [var('k', f'1..{len(programmes)}'),
         var('a', selon('k', [p['labels'][0] - 1 for p in programmes]))],
        ['On suit le code une instruction après l\'autre, depuis le départ.',
         'Le robot arrive au ' + colt('point ' + selon('k', [p['labels'][0] for p in programmes]))
         + '.'])


def quel_code(programmes, fenetre, regle_txt, codes_fn, intro, dessin_depart):
    figures = [fig_robot(fenetre, 'Un quadrillage, le robot au départ et le carré vert de'
                         ' l\'arrivée.', dessin_depart(p) + arrivee(p['points'][0]))
               for p in programmes]
    juste, faux1, faux2 = (selon('k', [codes_fn(p)[j] for p in programmes]) for j in range(3))
    return variation(
        intro + regle_txt + '\n\n' + selon('k', figures)
        + '\n\nQuel code mène le robot au carré vert ?' + choix([juste, faux1, faux2]),
        ['0'], [var('k', f'1..{len(programmes)}')],
        ['On essaie chaque code depuis le départ : un seul s\'arrête sur le carré vert.',
         'Le bon code : ' + juste + '.'])


INTRO_RELATIF = 'Le robot rouge regarde dans le sens de la pointe.\n\n'

ROBOT_OU = ou_arrive(CODES_RELATIFS, FEN_ROBOT, REGLE_ROBOT, lambda p: texte_code(p['code']),
                     INTRO_RELATIF, lambda p: robot(p['depart'], p['dir']))
ROBOT_CODE = quel_code(CODES_RELATIFS, FEN_ROBOT, REGLE_ROBOT,
                       lambda p: [texte_code(p['code']), texte_code(inverse(p['code'])),
                                  texte_code(p['plus_un'])],
                       INTRO_RELATIF, lambda p: robot(p['depart'], p['dir']))

for p in CODES_RELATIFS:  # bornes du BO : au plus 15 instructions dont 4 virages
    assert len(p['code']) <= 15 and sum(c in ('D', 'G') for c in p['code']) <= 4
    # le code « inversé » et le code « plus un » ne mènent pas au carré vert
    assert execute(p['depart'], p['dir'], inverse(p['code']), RL, RH) != p['points'][0]

# 09 : flèches (directions absolues), longs codes

FL, FH = 10, 6
FLECHE = {'N': '\\uparrow', 'E': '\\rightarrow', 'S': '\\downarrow', 'O': '\\leftarrow'}
OPPOSE = {'N': 'S', 'S': 'N', 'E': 'O', 'O': 'E'}


def suit_fleches(depart, runs):
    x, y = depart
    for d, n in runs:
        dx, dy = DIRS[d]
        x, y = x + n * dx, y + n * dy
        if not (0 <= x <= FL and 0 <= y <= FH):
            return None
    return (x, y)


def tire_fleches():
    while True:
        nruns = ALEA.randint(3, 5)  # au plus 4 changements de direction
        runs = []
        for _ in range(nruns):
            choix_d = [d for d in 'NESO' if not runs or (d != runs[-1][0]
                                                         and d != OPPOSE[runs[-1][0]])]
            runs.append((ALEA.choice(choix_d), ALEA.randint(1, 4)))
        total = sum(n for _, n in runs)
        if not 8 <= total <= 15:
            continue
        depart = (ALEA.randint(0, FL), ALEA.randint(0, FH))
        fin = suit_fleches(depart, runs)
        # erreur 1 : la plus longue suite comptée avec une flèche de moins
        j = max(range(nruns), key=lambda q: runs[q][1])
        moins_un = runs[:j] + [(runs[j][0], runs[j][1] - 1)] + runs[j + 1:]
        # erreur 2 : gauche et droite confondues dans la première suite horizontale
        h = [q for q in range(nruns) if runs[q][0] in 'EO']
        if not h:
            continue
        miroir = runs[:h[0]] + [(OPPOSE[runs[h[0]][0]], runs[h[0]][1])] + runs[h[0] + 1:]
        points_ = [fin, suit_fleches(depart, moins_un), suit_fleches(depart, miroir)]
        if None in points_ or len(set(points_)) < 3 or fin == depart:
            continue
        return {'runs': runs, 'depart': depart, 'points': points_, 'moins_un': moins_un,
                'miroir': miroir}


def texte_fleches(runs):
    return '$' + '\\ '.join(FLECHE[d] for d, n in runs for _ in range(n)) + '$'


CODES_FLECHES = [tire_fleches() for _ in range(N_ROBOT)]
for p in CODES_FLECHES:
    labs = [1, 2, 3]
    ALEA.shuffle(labs)
    p['labels'] = labs
    assert sum(n for _, n in p['runs']) <= 15 and len(p['runs']) - 1 <= 4

FEN_FLECHES = f'-0.6 ; {FL + 0.6} ; -0.6 ; {FH + 0.6}'
REGLE_FLECHES = 'Chaque flèche fait avancer le robot d\'un carreau dans son sens.'
INTRO_FLECHES = 'Le robot part du carré rouge.\n\n'

FLECHES_OU = ou_arrive(CODES_FLECHES, FEN_FLECHES, REGLE_FLECHES,
                       lambda p: texte_fleches(p['runs']), INTRO_FLECHES,
                       lambda p: carre_depart(p['depart']))
FLECHES_CODE = quel_code(CODES_FLECHES, FEN_FLECHES, REGLE_FLECHES,
                         lambda p: [texte_fleches(p['runs']), texte_fleches(p['moins_un']),
                                    texte_fleches(p['miroir'])],
                         INTRO_FLECHES, lambda p: carre_depart(p['depart']))


def specs_robot(programmes):
    out = []
    for k in (1, 4):
        bon = programmes[k - 1]['labels'][0] - 1
        out.append(spec(f'Où arrive-t-il ? (k = {k})', 0, {'k': k}, str(bon), 'correct'))
        faux = programmes[k - 1]['labels'][1] - 1
        out.append(spec(f'Erreur : l\'arrivée du code mal suivi (k = {k})', 0,
                        {'k': k}, str(faux), 'incorrect'))
    out += [spec('Quel code ? le bon', 1, {'k': 2}, '0', 'correct'),
            spec('Erreur : le code faux', 1, {'k': 2}, '1', 'incorrect'),
            spec('Erreur : l\'autre code faux', 1, {'k': 7}, '2', 'incorrect')]
    return out


SPECS_ROBOT = specs_robot(CODES_RELATIFS)
SPECS_FLECHES = specs_robot(CODES_FLECHES)

# ---- Fichiers ----

GEO = 'Géométrie'
SOLIDES, RECO, ASSEMBLAGES = 'Solides', 'Reconnaître et décrire', 'Assemblages de cubes'
REPERAGE, POSITIONS, CODER = 'Repérage et déplacements', 'Positions et plans', \
    'Coder un déplacement'

MODELES = {
    '01-mesure-a-la-regle': modele(
        'Mesurer un segment avec la règle, sans partir du 0',
        'Segment de 3 à 10 cm qui ne commence pas au 0 ; segment dont le bout tombe entre deux'
        ' graduations (encadrer entre deux nombres entiers de centimètres)',
        'Grandeurs', 'Longueurs', 'Comparaison et mesure', 6, [PAS_AU_ZERO, ENCADRER],
        SPECS_REGLE),
    '02-ou-est-le-solide': modele(
        'Où est le solide ? Cube, boule, cône, pyramide, cylindre, pavé',
        'Trouver un solide nommé parmi quatre dessins', GEO, SOLIDES, RECO, 7,
        OU_EST_VARIATIONS, SPECS_OU_EST),
    '03-nomme-le-solide': modele(
        'Nommer un solide : cube, pavé, boule, cône, pyramide',
        'Un solide dessiné en perspective, à nommer', GEO, SOLIDES, RECO, 8, NOMME_VARIATIONS,
        SPECS_NOMME),
    '04-combien-de-cubes': modele(
        'Combien de cubes pour construire cet assemblage ?',
        'Assemblage de 4 à 10 cubes, sans cube caché, sur une ou deux rangées', GEO, SOLIDES,
        ASSEMBLAGES, 4, [COMBIEN_UNE, COMBIEN_DEUX], SPECS_COMBIEN),
    '05-le-meme-assemblage': modele(
        'Le même assemblage de cubes',
        'Retrouver un assemblage parmi trois : un cube de plus, deux piles échangées', GEO,
        SOLIDES, ASSEMBLAGES, 5, [MEME_UNE, MEME_DEUX], SPECS_MEME),
    '06-entre-pres-loin': modele(
        'Entre, à gauche, à droite, au-dessus, en dessous, près, loin',
        'Situer des objets sur une étagère', GEO, REPERAGE, POSITIONS, 3,
        [ENTRE, DESSUS_DESSOUS, RELATION, PRES_LOIN_V], SPECS_POSITIONS),
    '07-sur-le-plan-du-quartier': modele(
        'Sur le plan du quartier',
        'Lire un plan vu du dessus : entre, en face, le plus près, à gauche, à droite', GEO,
        REPERAGE, POSITIONS, 4, [PLAN_ENTRE, PLAN_FACE, PLAN_PRES, PLAN_GD], SPECS_PLAN),
    '08-le-robot-pivote': modele(
        'Le robot avance et pivote',
        'Code « avance de », « pivote d\'un quart de tour » : où arrive le robot ? quel code ?',
        GEO, REPERAGE, CODER, 2, [ROBOT_OU, ROBOT_CODE], SPECS_ROBOT),
    '09-le-long-code': modele(
        'Le robot et un long code de flèches',
        'De 8 à 15 flèches, au plus 4 changements de direction : où arrive le robot ? quel'
        ' code ?', GEO, REPERAGE, CODER, 3, [FLECHES_OU, FLECHES_CODE], SPECS_FLECHES),
}

for nom, m in MODELES.items():
    with open(f'{DOSSIER}/{nom}.json', 'w') as f:
        json.dump(m, f, ensure_ascii=False, indent='\t')
        f.write('\n')
print(len(MODELES), 'modèles écrits')
