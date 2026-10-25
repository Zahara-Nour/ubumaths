"""Écrit les 7 modèles du lot B3 (solides et masses, CP) dans scripts/questions/cp-b3/."""
import json
import math
import sys

DOSSIER = sys.argv[1]

# Décisions de David le 2026-10-25 (journal docs/wip/questions-progress.md § 4 terdecies).
# Solides et balance dessinés en bloc ```figure (pas de courbe dans une figure) : les ellipses
# sont des lignes brisées aux coordonnées calculées ici. Aucune coordonnée ne dépend du tirage
# (une virgule décimale casserait le bloc) : ce qui change d'un tirage à l'autre passe par
# `visible=` ou par une variation de plus.


def spec(desc, vi, variables_, status, choix=None, answers=None):
    s = {'description': desc, 'variationIndex': vi, 'variables': variables_,
         'expected': {'status': status}}
    if choix is not None:
        s['selectedChoices'] = [choix]
    if answers is not None:
        s['answers'] = answers
    return s


def modele(title, description, theme, domain, subdomain, delay, variations, specs):
    # theme / domain / subdomain : anciennes colonnes, remplies pour create-questions ; le
    # rangement (nœud du point) est posé par la migration
    return {'title': title, 'description': description, 'grades': ['CP'], 'theme': theme,
            'domain': domain, 'subdomain': subdomain, 'level': 1, 'delay': delay,
            'status': 'draft', 'variations': variations, 'testSpecs': specs}


def choisir(var, valeurs):
    """Valeur selon var = 1, 2, … : {{if:k==1|a|{{if:k==2|b|c}}}}."""
    texte = str(valeurs[-1])
    for k in range(len(valeurs) - 1, 0, -1):
        texte = f'{{{{if:{var}=={k}|{valeurs[k - 1]}|{texte}}}}}'
    return texte


def si(condition):
    """Valeur de `visible=` : vrai si la condition {{if:…}} tient."""
    return f'{{{{if:{condition}|vrai|faux}}}}'


def nombre(x):
    return f'{round(x, 3):g}'


# --- Dessin ----------------------------------------------------------------------------------

DEMI = 16      # segments d'une demi-ellipse vue
TIRETS = 11    # tirets d'une demi-ellipse cachée


class Dessin:
    """Lignes d'un bloc ```figure ; les points sont cachés et numérotés."""

    def __init__(self):
        self.lignes = []
        self.k = 0

    def point(self, x, y):
        self.k += 1
        nom = f'p{self.k}'
        self.lignes.append(f'{nom} = point({nombre(x)}, {nombre(y)}, visible=faux)')
        return nom

    def segment(self, a, b, cache=False, extra=''):
        trait = ', trait="tirets"' if cache else ''
        self.lignes.append(f'segment({a}, {b}{trait}{extra})')

    def ligne(self, pts, extra=''):
        noms = [self.point(x, y) for x, y in pts]
        for a, b in zip(noms, noms[1:]):
            self.segment(a, b, extra=extra)

    def demi_ellipse(self, cx, cy, a, b, devant, cache=False):
        """devant : la moitié basse, vers l'élève."""
        sgn = -1 if devant else 1

        def pt(t, n):
            return (cx + a * math.cos(math.pi * t / n), cy + sgn * b * math.sin(math.pi * t / n))

        if cache:
            # tirets faits main, un morceau sur deux : le motif du trait (12 px) ne tient pas
            # sur des morceaux de 10 px, la ligne brisée sortirait pleine
            for i in range(0, TIRETS, 2):
                self.ligne([pt(t, 2 * TIRETS) for t in (2 * i, 2 * i + 1, 2 * i + 2)])
            return
        self.ligne([pt(i, DEMI) for i in range(DEMI + 1)])

    def polygone(self, pts, fond=None, visible=None, epaisseur=None, opacite=1):
        noms = [self.point(x, y) for x, y in pts]
        remplir = f', remplissage="{fond}", opacite_fond={nombre(opacite)}' if fond else ''
        vis = f', visible={visible}' if visible else ''
        ep = f', epaisseur={epaisseur}' if epaisseur else ''
        self.k += 1
        self.lignes.append(f'q{self.k} = polygone({", ".join(noms)}, couleur="noir"'
                           f'{remplir}{ep}{vis})')

    def disque(self, x, y, r, fond, visible=None):
        o = self.point(x, y)
        vis = f', visible={visible}' if visible else ''
        self.lignes.append(f'cercle({o}, rayon={nombre(r)}, couleur="noir",'
                           f' remplissage="{fond}", opacite_fond=1{vis})')

    def texte(self, x, y, t):
        self.lignes.append(f'texte({nombre(x)}, {nombre(y)}, "{t}")')

    def bloc(self, fenetre, description):
        return ('```figure\n' + f'fenetre: {fenetre}\ndescription: {description}\n---\n'
                + '\n'.join(self.lignes) + '\n```')


# Solides posés sur une ligne de base, centrés sur cx. Perspective cavalière : fuyantes à 45°,
# réduites de moitié ; arêtes cachées en tirets.

FUITE = 0.5 * math.cos(math.pi / 4)


def cylindre(d, cx, base, a=1.4, b=0.4, h=3.4):
    d.demi_ellipse(cx, base + b, a, b, True)
    d.demi_ellipse(cx, base + b, a, b, False, cache=True)
    d.demi_ellipse(cx, base + b + h, a, b, True)
    d.demi_ellipse(cx, base + b + h, a, b, False)
    d.segment(d.point(cx - a, base + b), d.point(cx - a, base + b + h))
    d.segment(d.point(cx + a, base + b), d.point(cx + a, base + b + h))


def cone(d, cx, base, a=1.4, b=0.4, h=3.8):
    d.demi_ellipse(cx, base + b, a, b, True)
    d.demi_ellipse(cx, base + b, a, b, False, cache=True)
    sommet = d.point(cx, base + b + h)
    d.segment(d.point(cx - a, base + b), sommet)
    d.segment(d.point(cx + a, base + b), sommet)


def boule(d, cx, base, r=1.7):
    o = d.point(cx, base + r)
    d.lignes.append(f'cercle({o}, rayon={nombre(r)})')
    d.demi_ellipse(cx, base + r, r, r * 0.28, True)
    d.demi_ellipse(cx, base + r, r, r * 0.28, False, cache=True)


FACES = {
    'devant': (0, 1, 2, 3),
    'dessus': (3, 2, 6, 7),
    'droite': (1, 5, 6, 2),
}


def pave(d, cx, base, l, h, p, face=None):
    """Face avant l × h ; face : nom de la face coloriée (FACES), ou None."""
    dx = dy = p * FUITE
    x = cx - (l + dx) / 2
    avant = [(x, base), (x + l, base), (x + l, base + h), (x, base + h)]
    sommets = avant + [(u + dx, v + dy) for u, v in avant]
    if face:
        # bleu translucide : les arêtes cachées restent visibles à travers la face
        d.polygone([sommets[i] for i in FACES[face]], 'bleu', opacite=0.35)
    a, b, c, dd, e, f, g, hh = [d.point(*s) for s in sommets]
    for u, v in ((a, b), (b, c), (c, dd), (dd, a), (b, f), (f, g), (c, g), (dd, hh), (hh, g)):
        d.segment(u, v)
    for u, v in ((a, e), (e, f), (e, hh)):
        d.segment(u, v, cache=True)


def cube(d, cx, base, cote=2.6, face=None):
    pave(d, cx, base, cote, cote, cote, face)


def pave_couche(d, cx, base, face=None):
    pave(d, cx, base, 3.2, 1.7, 2, face)


def pave_debout(d, cx, base, face=None):
    pave(d, cx, base, 1.8, 3.4, 1.4, face)


SOLIDES = ['cube', 'boule', 'cône', 'cylindre', 'pavé']
LE_SOLIDE = ['le cube', 'la boule', 'le cône', 'le cylindre', 'le pavé']
UN_SOLIDE = ['un cube', 'une boule', 'un cône', 'un cylindre', 'un pavé']
DESSINER = {'cube': cube, 'boule': boule, 'cône': cone, 'cylindre': cylindre,
            'pavé': pave_couche}
CHOIX_SOLIDES = [{'content': f'C\'est {s}.'} for s in UN_SOLIDE]
GEO = ('Géométrie', 'Solides', 'Reconnaître et décrire')

# --- CP-049 : reconnaître parmi les cinq solides ------------------------------------------------

PLACES = [(2.5, 7), (7.5, 7), (12.5, 7), (5, 1), (10, 1)]
RANGEMENTS = [
    ['cylindre', 'cube', 'cône', 'pavé', 'boule'],
    ['boule', 'pavé', 'cylindre', 'cône', 'cube'],
    ['cône', 'boule', 'pavé', 'cube', 'cylindre'],
    ['pavé', 'cylindre', 'cube', 'boule', 'cône'],
]


def trouve(rangement):
    d = Dessin()
    for n, (solide, (x, base)) in enumerate(zip(rangement, PLACES), 1):
        DESSINER[solide](d, x, base)
        d.texte(x, base - 0.6, str(n))
    # numéro du solide demandé (s = rang dans SOLIDES)
    numeros = [rangement.index(s) + 1 for s in SOLIDES]
    return {
        'statement': 'Voici cinq solides.\n\n'
        + d.bloc('0 ; 15 ; -0.9 ; 11.8', 'Cinq solides numérotés de 1 à 5 : un cube, une'
                 ' boule, un cône, un cylindre et un pavé, dans le désordre.')
        + f'\n\nQuel numéro porte {choisir("s", LE_SOLIDE)} ?\n\nNuméro : [_]',
        'variables': [{'name': 's', 'expression': '1..5'}],
        'conditions': [],
        'blanks': [{'expectedAnswer': choisir('s', numeros)}],
        'correction': {'steps': [
            choisir('s', [
                'Le cube a 6 faces carrées, toutes pareilles.',
                'La boule est toute ronde : elle n\'a aucune face plate.',
                'Le cône a un rond pour fond et une pointe en haut.',
                'Le cylindre a deux ronds, un en haut et un en bas, comme une boîte de'
                ' conserve.',
                'Le pavé a 6 faces rectangulaires, comme une boîte à chaussures.',
            ]),
            f'{choisir("s", [s.capitalize() for s in LE_SOLIDE])} porte le numéro'
            f' ${choisir("s", numeros)}$.',
        ]},
    }


TROUVE = [trouve(r) for r in RANGEMENTS]
SPECS_TROUVE = []
for i, r in enumerate(RANGEMENTS):
    for s in (1, 4):
        juste = r.index(SOLIDES[s - 1]) + 1
        SPECS_TROUVE.append(spec(f'Rangement {i + 1}, {SOLIDES[s - 1]} : n° {juste}', i,
                                 {'s': str(s)}, 'correct', answers=[str(juste)]))
        faux = juste % 5 + 1
        SPECS_TROUVE.append(spec(f'Rangement {i + 1}, {SOLIDES[s - 1]} : n° {faux}, erreur',
                                 i, {'s': str(s)}, 'incorrect', answers=[str(faux)]))

# --- CP-049 : les solides dans les objets de tous les jours -------------------------------------

OBJETS = {
    'cube': ['un dé à jouer', 'un morceau de sucre', 'un glaçon carré'],
    'boule': ['un ballon de foot', 'une bille', 'une perle ronde'],
    'cône': ['un cornet de glace vide', 'un chapeau pointu d\'anniversaire',
             'un plot de sport pointu'],
    'cylindre': ['une boîte de conserve', 'un rouleau de papier essuie-tout', 'une bougie toute'
                 ' droite'],
    'pavé': ['une boîte à chaussures', 'une brique de lait', 'une gomme'],
}
POURQUOI = {
    'cube': 'Un cube a 6 faces carrées, toutes pareilles.',
    'boule': 'Une boule est toute ronde, sans face plate.',
    'cône': 'Un cône a un rond d\'un côté et une pointe de l\'autre.',
    'cylindre': 'Un cylindre a deux ronds pareils, en haut et en bas.',
    'pavé': 'Un pavé a 6 faces rectangulaires.',
}


def ressemble(solide):
    objets = OBJETS[solide]
    un = UN_SOLIDE[SOLIDES.index(solide)]
    return {
        'statement': f'À quel solide ressemble {choisir("o", objets)} ?',
        'variables': [{'name': 'o', 'expression': f'1..{len(objets)}'}],
        'conditions': [],
        'choices': [{'content': f'À {u}.'} for u in [un]
                    + [u for s, u in zip(SOLIDES, UN_SOLIDE) if s != solide]],
        'correctChoiceIndex': ['0'],
        'correction': {'steps': [
            f'{choisir("o", [o[0].upper() + o[1:] for o in objets])} ressemble à {un}.',
            POURQUOI[solide],
        ]},
    }


RESSEMBLE = [ressemble(s) for s in SOLIDES]
SPECS_RESSEMBLE = []
for i, s in enumerate(SOLIDES):
    SPECS_RESSEMBLE += [spec(f'{OBJETS[s][0]} : {s}', i, {'o': '1'}, 'correct', 0),
                        spec(f'{OBJETS[s][1]} : leurre', i, {'o': '2'}, 'incorrect', 1)]

# --- CP-050 : nommer un cube, un pavé, une boule ------------------------------------------------

FENETRE_SEUL = '0 ; 8 ; 0 ; 4.7'


def un_solide(dessiner, nom, description, explication):
    d = Dessin()
    dessiner(d, 4, 0.3)
    i = SOLIDES.index(nom)
    return {
        'statement': 'Comment s\'appelle ce solide ?\n\n' + d.bloc(FENETRE_SEUL, description),
        'variables': [],
        'conditions': [],
        'choices': [CHOIX_SOLIDES[i]] + [c for j, c in enumerate(CHOIX_SOLIDES) if j != i],
        'correctChoiceIndex': ['0'],
        'correction': {'steps': [explication]},
    }


NOMMER = [
    un_solide(lambda d, x, b: cube(d, x, b), 'cube', 'Un cube.',
              'C\'est un cube : ses 6 faces sont des carrés, toutes pareilles.'),
    un_solide(lambda d, x, b: cube(d, x, b, cote=2), 'cube', 'Un petit cube.',
              'C\'est un cube : ses 6 faces sont des carrés, toutes pareilles. Petit ou grand,'
              ' c\'est toujours un cube.'),
    un_solide(pave_couche, 'pavé', 'Un pavé couché.',
              'C\'est un pavé : ses faces sont des rectangles. Ce n\'est pas un cube : ses'
              ' faces ne sont pas toutes des carrés.'),
    un_solide(pave_debout, 'pavé', 'Un pavé debout.',
              'C\'est un pavé, posé debout : ses faces sont des rectangles. Ce n\'est pas un'
              ' cube : ses faces ne sont pas toutes des carrés.'),
    un_solide(lambda d, x, b: boule(d, x, b, r=2), 'boule', 'Une boule.',
              'C\'est une boule : elle est toute ronde, elle n\'a aucune face plate.'),
]
SPECS_NOMMER = []
for i, (nom, leurre) in enumerate([('cube', 'pavé'), ('petit cube', 'pavé'),
                                   ('pavé couché', 'cube'), ('pavé debout', 'cube'),
                                   ('boule', 'cylindre')]):
    SPECS_NOMMER += [spec(f'{nom.capitalize()} : bon nom', i, {}, 'correct', 0),
                     spec(f'{nom.capitalize()} pris pour un {leurre}', i, {}, 'incorrect', 1)]

# --- CP-051 : le mot « face » -------------------------------------------------------------------


def partie(dessiner, nom, face):
    d = Dessin()
    dessiner(d, 4, 0.3, face=face)
    return {
        'statement': f'Comment s\'appelle la partie coloriée de ce {nom} ?\n\n'
        + d.bloc(FENETRE_SEUL, f'Un {nom} dont une face est coloriée.'),
        'variables': [],
        'conditions': [],
        'choices': [{'content': 'C\'est une face.'}, {'content': 'C\'est un côté.'},
                    {'content': 'C\'est un sommet.'}],
        'correctChoiceIndex': ['0'],
        'correction': {'steps': [
            f'La partie coloriée est toute plate : c\'est une face du {nom}.',
            'On dit « côté » pour une figure plane, comme le carré dessiné sur une feuille ; un'
            ' sommet est un coin pointu.',
        ]},
    }


FACE = [
    partie(lambda d, x, b, face: cube(d, x, b, face=face), 'cube', 'devant'),
    partie(lambda d, x, b, face: cube(d, x, b, face=face), 'cube', 'dessus'),
    partie(pave_couche, 'pavé', 'droite'),
    partie(pave_debout, 'pavé', 'devant'),
]
SPECS_FACE = []
for i in range(len(FACE)):
    SPECS_FACE += [spec(f'Dessin {i + 1} : une face', i, {}, 'correct', 0),
                   spec(f'Dessin {i + 1} : un côté, erreur', i, {}, 'incorrect', 1)]

# --- CP-052 : nombre et nature des faces --------------------------------------------------------


def combien(dessiner, nom, description):
    d = Dessin()
    dessiner(d, 4, 0.3)
    return {
        'statement': f'Combien de faces a ce {nom} ?\n\n' + d.bloc(FENETRE_SEUL, description)
        + '\n\nNombre de faces : [_]',
        'variables': [],
        'conditions': [],
        'blanks': [{'expectedAnswer': '6'}],
        'correction': {'steps': [
            'On voit 3 faces : celle de devant, celle du dessus et celle de droite.',
            'Il y en a 3 cachées : celle de derrière, celle du dessous et celle de gauche.',
            f'$3 + 3 = 6$ : le {nom} a $6$ faces.',
        ]},
    }


COMBIEN = [
    combien(lambda d, x, b: cube(d, x, b), 'cube', 'Un cube, arêtes cachées en pointillés.'),
    combien(pave_couche, 'pavé', 'Un pavé couché, arêtes cachées en pointillés.'),
    combien(pave_debout, 'pavé', 'Un pavé debout, arêtes cachées en pointillés.'),
]
SPECS_COMBIEN = []
for i in range(len(COMBIEN)):
    SPECS_COMBIEN += [spec(f'Dessin {i + 1} : 6', i, {}, 'correct', answers=['6']),
                      spec(f'Dessin {i + 1} : 3, les faces vues seulement', i, {}, 'incorrect',
                           answers=['3'])]

CHOIX_NATURE = ['des carrés', 'des rectangles', 'des triangles', 'des disques']


def nature(dessiner, nom, juste, explication):
    d = Dessin()
    dessiner(d, 4, 0.3)
    i = CHOIX_NATURE.index(juste)
    return {
        'statement': f'Les faces de ce {nom} sont toutes…\n\n'
        + d.bloc(FENETRE_SEUL, f'Un {nom}.'),
        'variables': [],
        'conditions': [],
        'choices': [{'content': f'… {juste}.'}]
        + [{'content': f'… {c}.'} for j, c in enumerate(CHOIX_NATURE) if j != i],
        'correctChoiceIndex': ['0'],
        'correction': {'steps': [explication]},
    }


NATURE = [
    nature(lambda d, x, b: cube(d, x, b), 'cube', 'des carrés',
           'Les 6 faces du cube sont des carrés, toutes pareilles.'),
    nature(pave_couche, 'pavé', 'des rectangles',
           'Les 6 faces de ce pavé sont des rectangles. Elles vont par deux : celles d\'en face'
           ' sont pareilles.'),
    nature(pave_debout, 'pavé', 'des rectangles',
           'Les 6 faces de ce pavé sont des rectangles. Elles vont par deux : celles d\'en face'
           ' sont pareilles.'),
]
SPECS_NATURE = [
    spec('Cube : des carrés', 0, {}, 'correct', 0),
    spec('Cube : des rectangles, erreur', 0, {}, 'incorrect', 1),
    spec('Pavé couché : des rectangles', 1, {}, 'correct', 0),
    spec('Pavé couché : des carrés, erreur', 1, {}, 'incorrect', 1),
    spec('Pavé debout : des rectangles', 2, {}, 'correct', 0),
    spec('Pavé debout : des triangles, erreur', 2, {}, 'incorrect', 2),
]

# --- CP-040 : comparer des masses sur une balance -----------------------------------------------

FORMES = ['le disque', 'le carré', 'le triangle']
FENETRE_BALANCE = '0 ; 10 ; -0.2 ; 5'


def objet(d, k, x, y, cote):
    """Forme k (1 disque, 2 carré, 3 triangle) posée en (x, y), visible si cote == k."""
    vis = si(f'{cote}=={k}')
    if k == 1:
        d.disque(x, y + 0.55, 0.55, 'bleu', vis)
    elif k == 2:
        d.polygone([(x - 0.55, y), (x + 0.55, y), (x + 0.55, y + 1.1), (x - 0.55, y + 1.1)],
                   'rouge', vis)
    else:
        d.polygone([(x - 0.65, y), (x + 0.65, y), (x, y + 1.15)], 'vert', vis)


def balance(penche):
    """penche : -1 le plateau de gauche descend, 1 celui de droite, 0 équilibre."""
    d = Dessin()
    d.polygone([(3.8, 0), (6.2, 0), (5, 0.8)], 'gris')
    d.segment(d.point(5, 0.8), d.point(5, 4), extra=', epaisseur=3')
    dy = 0.6 * penche
    gauche, droite = (1.8, 4 + dy), (8.2, 4 - dy)
    d.segment(d.point(*gauche), d.point(*droite), extra=', epaisseur=3')
    for (x, y), cote in ((gauche, 'g'), (droite, 'd')):
        haut = d.point(x, y)
        bas = y - 2.2
        d.segment(haut, d.point(x - 1.2, bas))
        d.segment(haut, d.point(x + 1.2, bas))
        d.polygone([(x - 1.3, bas), (x + 1.3, bas), (x + 1.1, bas - 0.25),
                    (x - 1.1, bas - 0.25)], 'gris')
        for k in (1, 2, 3):
            objet(d, k, x, bas, cote)
    return d.bloc(FENETRE_BALANCE, {
        -1: 'Une balance à deux plateaux, penchée : le plateau de gauche est plus bas.',
        1: 'Une balance à deux plateaux, penchée : le plateau de droite est plus bas.',
        0: 'Une balance à deux plateaux, à l\'équilibre.',
    }[penche])


VARIABLES_BALANCE = [{'name': 'g', 'expression': '1..3'}, {'name': 'd', 'expression': '1..3'}]
NOM = {c: choisir(c, FORMES) for c in 'gd'}
# majuscule dans chaque branche : str.capitalize() ne touche pas une chaîne qui commence par {{if:
MAJ = {c: choisir(c, [f[0].upper() + f[1:] for f in FORMES]) for c in 'gd'}


def peser(penche, question):
    """question : 'lourd' ou 'léger'."""
    if penche == 0:
        juste, autres = 'Ils ont la même masse.', [f'{MAJ["g"]}.', f'{MAJ["d"]}.']
        explication = ('La balance est à l\'équilibre : les deux plateaux sont à la même hauteur.'
                       f' {MAJ["g"]} et {NOM["d"]} ont la même masse.')
    else:
        bas, haut = ('g', 'd') if penche == -1 else ('d', 'g')
        lourd = question == 'lourd'
        juste = f'{MAJ[bas if lourd else haut]}.'
        autres = [f'{MAJ[haut if lourd else bas]}.', 'Ils ont la même masse.']
        explication = (f'Le plateau qui descend porte l\'objet le plus lourd : c\'est'
                       f' {NOM[bas]}. {MAJ[haut]} est plus léger : son plateau monte.')
    return {
        'statement': f'Regarde la balance.\n\n{balance(penche)}\n\nQuel objet est le plus'
        f' {question} ?',
        'variables': VARIABLES_BALANCE,
        'conditions': ['g != d'],
        'choices': [{'content': juste}] + [{'content': a} for a in autres],
        'correctChoiceIndex': ['0'],
        'correction': {'steps': [explication]},
    }


PESER = [peser(-1, 'lourd'), peser(1, 'lourd'), peser(-1, 'léger'), peser(1, 'léger'),
         peser(0, 'lourd')]
SPECS_PESER = []
for i, (desc, juste_texte) in enumerate([('gauche descend, plus lourd', 'le disque'),
                                         ('droite descend, plus lourd', 'le carré'),
                                         ('gauche descend, plus léger', 'le carré'),
                                         ('droite descend, plus léger', 'le disque'),
                                         ('équilibre', 'même masse')]):
    v = {'g': '1', 'd': '2'}
    SPECS_PESER += [spec(f'{desc} : {juste_texte}', i, v, 'correct', 0),
                    spec(f'{desc} : erreur', i, v, 'incorrect', 1)]

MASSES = ('Grandeurs', 'Masses', 'Comparaison')

MODELES = {
    '01-trouve-le-solide': modele(
        'Trouve le solide',
        'Reconnaître un cube, une boule, un cône, un cylindre ou un pavé parmi les cinq, dessinés',
        *GEO, 45, TROUVE, SPECS_TROUVE),
    '02-a-quoi-ressemble': modele(
        'À quel solide ressemble cet objet ?',
        'Reconnaître un solide dans un objet de tous les jours (dé, ballon, cornet, conserve,'
        ' boîte)', *GEO, 30, RESSEMBLE, SPECS_RESSEMBLE),
    '03-nommer-le-solide': modele(
        'Comment s\'appelle ce solide ?',
        'Nommer un cube, un pavé ou une boule dessinés', *GEO, 30, NOMMER, SPECS_NOMMER),
    '04-la-face': modele(
        'Comment s\'appelle la partie coloriée ?',
        'Le mot « face » : une face coloriée sur un cube ou un pavé', *GEO, 30, FACE, SPECS_FACE),
    '05-combien-de-faces': modele(
        'Combien de faces ?',
        'Le nombre de faces d\'un cube ou d\'un pavé (6), faces cachées comprises', *GEO, 30,
        COMBIEN, SPECS_COMBIEN),
    '06-nature-des-faces': modele(
        'De quelle forme sont les faces ?',
        'Les faces d\'un cube sont des carrés, celles d\'un pavé des rectangles', *GEO, 30,
        NATURE, SPECS_NATURE),
    '07-balance': modele(
        'Lequel est le plus lourd ?',
        'Comparer deux masses sur une balance à deux plateaux, penchée ou à l\'équilibre',
        *MASSES, 30, PESER, SPECS_PESER),
}

for nom, m in MODELES.items():
    with open(f'{DOSSIER}/{nom}.json', 'w') as f:
        json.dump(m, f, ensure_ascii=False, indent='\t')
        f.write('\n')
print(len(MODELES), 'modèles écrits')
