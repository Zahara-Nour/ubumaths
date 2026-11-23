"""Écrit les 10 modèles du lot B2 (reconnaître sur une figure, CP) dans scripts/questions/cp-b2/."""
import json
import re
import sys
from itertools import combinations, permutations

DOSSIER = sys.argv[1]

# Décisions de David le 2026-10-25 (journal docs/wip/questions-progress.md § 4 duodecies).
# Figures affichées seulement : l'élève répond par une case nombre ou un QCM.
# Une virgule décimale casse un bloc ```figure : toute coordonnée qui dépend du tirage est une
# chaîne de {{if:…}} sur des valeurs écrites ici (avec un point décimal).


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


def indicatrice(var, k, valeurs):
    """Polynôme qui vaut 1 si var = k et 0 pour les autres valeurs (Lagrange)."""
    num = '*'.join(f'({var}-{j})' for j in valeurs if j != k)
    den = 1
    for j in valeurs:
        if j != k:
            den *= k - j
    return f'{num}/({den})'


def nombre(x):
    return f'{x:g}'


# --- Dessin ----------------------------------------------------------------------------------


def figure(fenetre, description, lignes, grille=False):
    tete = [f'fenetre: {fenetre}', f'description: {description}']
    if grille:
        tete.append('grille: oui')
    return '```figure\n' + '\n'.join(tete) + '\n---\n' + '\n'.join(lignes) + '\n```'


def polygone(nom, sommets, fond, visible=None):
    lignes = [f'{nom}{i} = point({x}, {y}, visible=faux)' for i, (x, y) in enumerate(sommets, 1)]
    noms = ', '.join(f'{nom}{i}' for i in range(1, len(sommets) + 1))
    vis = f', visible={visible}' if visible else ''
    # fond None : contour seul (un texte posé sur un fond coloré se lit mal)
    remplir = f', remplissage="{fond}", opacite_fond=1' if fond else ''
    lignes.append(f'{nom} = polygone({noms}, couleur="noir"{remplir}{vis})')
    return lignes


def rect(nom, x1, y1, x2, y2, fond, visible=None):
    return polygone(nom, [(x1, y1), (x2, y1), (x2, y2), (x1, y2)], fond, visible)


def disque(nom, x, y, r, fond, visible=None):
    vis = f', visible={visible}' if visible else ''
    return [f'{nom}o = point({x}, {y}, visible=faux)',
            f'{nom} = cercle({nom}o, rayon={r}, couleur="noir", remplissage="{fond}",'
            f' opacite_fond=1{vis})']


def si(condition):
    """Valeur de `visible=` : vrai si la condition {{if:…}} tient."""
    return f'{{{{if:{condition}|vrai|faux}}}}'


# --- CP-054 : reconnaître des formes dans un assemblage ---------------------------------------

FORMES_PL = ['triangles', 'carrés', 'rectangles', 'disques']


def assemblage(nom_dessin, fenetre, lignes, comptes, parties):
    """comptes : expressions du nombre de triangles, carrés, rectangles, disques."""
    reponse = '+'.join(f'({indicatrice("t", k, [1, 2, 3, 4])})*({c})'
                       for k, c in enumerate(comptes, 1))
    question = choisir('t', FORMES_PL)
    precision = '{{if:t==3| Un carré ne compte pas comme un rectangle.|}}'
    return {
        'statement': f'Voici {nom_dessin} {"faite" if nom_dessin == "une maison" else "fait"}'
        ' de formes.\n\n'
        + figure(fenetre, f'{nom_dessin.capitalize()} fait de triangles, de carrés, de'
                 ' rectangles et de disques.', lignes)
        + f'\n\nCombien de {question} vois-tu dans ce dessin ?{precision}\n\n'
        'Nombre de ' + question + ' : [_]',  # « Il y a [_] triangles » se lirait « 1 triangles »
        'variables': [{'name': 't', 'expression': '1..4'}] + VARIABLES_ASSEMBLAGE[nom_dessin]
        + [{'name': 'nrep', 'expression': f'eval:{reponse}'}],
        'conditions': [],
        'blanks': [{'expectedAnswer': '{{nrep}}'}],
        'correction': {'steps': [
            f'On cherche les {question} un par un : ' + choisir('t', parties) + '.',
            f'Il y a ${{{{nrep}}}}$ {question}.',
        ]},
    }


VARIABLES_ASSEMBLAGE = {
    'une maison': [{'name': 'n1', 'expression': '1..3'}, {'name': 'n2', 'expression': '0..2'}],
    'un bateau': [{'name': 'n1', 'expression': '2..4'}, {'name': 'n2', 'expression': '0..2'}],
    'un robot': [{'name': 'n1', 'expression': '1..3'}],
}

MAISON = assemblage(
    'une maison', '0 ; 13 ; 0 ; 9',
    rect('mur', 2, 1, 7, 6, 'jaune')
    + polygone('toit', [(1.5, 6), (7.5, 6), (4.5, 8.5)], 'rouge')
    + rect('porte', 4, 1, 5.5, 4, 'marron')
    + rect('fa', 2.5, 4.5, 3.5, 5.5, 'cyan')
    + rect('fb', 5.8, 4.5, 6.8, 5.5, 'cyan', si('n1>=2'))
    + rect('fc', 2.5, 2, 3.5, 3, 'cyan', si('n1==3'))
    + disque('soleil', 11, 7.5, 1, 'orange')
    + rect('tronc', 9.2, 1, 9.8, 2.5, 'marron')
    + polygone('sapin', [(8.3, 2.5), (10.7, 2.5), (9.5, 5.5)], 'vert')
    + disque('ba', 11.6, 1.5, 0.5, 'vert', si('n2>=1'))
    + disque('bb', 12.5, 1.5, 0.4, 'vert', si('n2==2')),
    ['2', '1+n1', '2', '1+n2'],
    ['le toit et le sapin', 'le mur et {{if:n1==1|la fenêtre|les fenêtres}}',
     'la porte et le tronc du sapin',
     'le soleil{{if:n2==1| et le buisson|}}{{if:n2==2| et les deux buissons|}}'])

BATEAU = assemblage(
    'un bateau', '0 ; 12 ; 0 ; 9.5',
    rect('coque', 1, 1, 11, 3, 'bleu')
    + disque('ha', 3, 2, 0.4, 'blanc')
    + disque('hb', 5, 2, 0.4, 'blanc')
    + disque('hc', 7, 2, 0.4, 'blanc', si('n1>=3'))
    + disque('hd', 9, 2, 0.4, 'blanc', si('n1==4'))
    + rect('mat', 5.8, 3, 6.2, 8, 'marron')
    + polygone('voile1', [(6.4, 3.5), (9.5, 3.5), (6.4, 7.5)], 'blanc')
    + polygone('voile2', [(5.6, 3.5), (2.8, 3.5), (5.6, 7)], 'blanc')
    + rect('drapeau', 6.2, 7.2, 7, 8, 'rouge')
    + disque('soleil', 1.5, 8, 0.9, 'orange')
    + rect('ca', 1.2, 3, 2, 3.8, 'marron', si('n2>=1'))
    + rect('cb', 10, 3, 10.8, 3.8, 'marron', si('n2==2')),
    ['2', '1+n2', '2', '1+n1'],
    ['les deux voiles', 'le drapeau{{if:n2==1| et la caisse|}}{{if:n2==2| et les deux caisses|}}',
     'la coque et le mât', 'le soleil et les ${{n1}}$ hublots'])

ROBOT = assemblage(
    'un robot', '0 ; 10 ; 0 ; 12.5',
    polygone('antenne', [(4.5, 11), (5.5, 11), (5, 12)], 'rouge')
    + rect('tete', 3.5, 8, 6.5, 11, 'gris')
    + disque('oa', 4.3, 9.9, 0.4, 'blanc')
    + disque('ob', 5.7, 9.9, 0.4, 'blanc')
    + rect('bouche', 4.2, 8.4, 5.8, 8.9, 'rose')
    + rect('corps', 2, 4.5, 8, 7.5, 'bleu')
    + rect('ba', 0.3, 6.5, 2, 7.1, 'gris')
    + rect('bb', 8, 6.5, 9.7, 7.1, 'gris')
    + rect('ja', 3, 1, 4, 4.5, 'gris')
    + rect('jb', 6, 1, 7, 4.5, 'gris')
    + rect('ka', 2.9, 5.6, 3.7, 6.4, 'jaune')
    + rect('kb', 4.6, 5.6, 5.4, 6.4, 'jaune', si('n1>=2'))
    + rect('kc', 6.3, 5.6, 7.1, 6.4, 'jaune', si('n1==3')),
    ['1', '1+n1', '6', '2'],
    ['l\'antenne', 'la tête et {{if:n1==1|le bouton|les ${{n1}}$ boutons}}',
     'la bouche, le corps, les deux bras et les deux jambes', 'les deux yeux'])

# t : 1 triangles, 2 carrés, 3 rectangles, 4 disques
SPECS_ASSEMBLAGE = [
    spec('Maison, triangles : 2', 0, {'t': '1', 'n1': '2', 'n2': '1'}, 'correct', answers=['2']),
    spec('Maison, carrés : 3 (mur + 2 fenêtres)', 0, {'t': '2', 'n1': '2', 'n2': '1'}, 'correct',
         answers=['3']),
    spec('Erreur : le mur oublié', 0, {'t': '2', 'n1': '2', 'n2': '1'}, 'incorrect',
         answers=['2']),
    spec('Maison, rectangles : 2', 0, {'t': '3', 'n1': '3', 'n2': '0'}, 'correct', answers=['2']),
    spec('Erreur : carrés comptés avec les rectangles', 0, {'t': '3', 'n1': '3', 'n2': '0'},
         'incorrect', answers=['6']),
    spec('Maison, disques : 3', 0, {'t': '4', 'n1': '1', 'n2': '2'}, 'correct', answers=['3']),
    spec('Bateau, disques : soleil + 4 hublots', 1, {'t': '4', 'n1': '4', 'n2': '0'}, 'correct',
         answers=['5']),
    spec('Bateau, carrés : drapeau + 2 caisses', 1, {'t': '2', 'n1': '2', 'n2': '2'}, 'correct',
         answers=['3']),
    spec('Robot, rectangles : 6', 2, {'t': '3', 'n1': '2'}, 'correct', answers=['6']),
    spec('Robot, carrés : tête + 3 boutons', 2, {'t': '2', 'n1': '3'}, 'correct', answers=['4']),
    spec('Erreur : la tête oubliée', 2, {'t': '2', 'n1': '3'}, 'incorrect', answers=['3']),
]

# --- CP-055 : nommer le disque, le carré, le rectangle, le triangle ---------------------------

NOMS = ['un disque', 'un carré', 'un rectangle', 'un triangle']
COULEURS = ['bleu', 'rouge', 'vert', 'orange']
FENETRE_FORME = '0 ; 10 ; 0 ; 7'


def nommer(lignes, juste, raison, variables):
    return {
        'statement': 'Quelle est cette forme ?\n\n'
        + figure(FENETRE_FORME, 'Une forme pleine, à nommer.', lignes),
        'variables': [{'name': 'c', 'expression': '1..4'}] + variables,
        'conditions': [],
        'choices': [{'content': f'C\'est {n}.'} for n in NOMS],
        'correctChoiceIndex': [str(juste)],
        'correction': {'steps': [f'C\'est {NOMS[juste]} : {raison}']},
    }


FOND = choisir('c', COULEURS)
NOMMER = [
    nommer(disque('d', choisir('x', [3.5, 5, 6.5]), 3.5, choisir('r', [1.5, 2, 2.5]), FOND),
           0, 'il est tout rond, il n\'a ni côté ni sommet.',
           [{'name': 'x', 'expression': '1..3'}, {'name': 'r', 'expression': '1..3'}]),
    nommer(rect('q', choisir('a', [3.5, 3, 2.5]), choisir('a', [2, 1.5, 1]),
                choisir('a', [6.5, 7, 7.5]), choisir('a', [5, 5.5, 6]), FOND),
           1, 'il a 4 côtés de la même longueur.', [{'name': 'a', 'expression': '1..3'}]),
    # carré posé sur une pointe : c'est toujours un carré
    nommer(polygone('q', [(5, choisir('a', [1.5, 1, 0.5])), (choisir('a', [7, 7.5, 8]), 3.5),
                          (5, choisir('a', [5.5, 6, 6.5])), (choisir('a', [3, 2.5, 2]), 3.5)],
                    FOND),
           1, 'il a 4 côtés de la même longueur. Il est posé sur une pointe, mais c\'est'
           ' toujours un carré.', [{'name': 'a', 'expression': '1..3'}]),
    nommer(rect('r', choisir('o', [2, 3.5]), choisir('o', [2.5, 0.5]),
                choisir('o', [8, 6.5]), choisir('o', [4.5, 6.5]), FOND),
           2, 'il a 4 côtés : deux grands côtés et deux petits côtés.',
           [{'name': 'o', 'expression': '1..2'}]),
    nommer(polygone('t', [(choisir('k', [2.5, 3, 2]), choisir('k', [1, 1, 5.5])),
                          (choisir('k', [7.5, 7.5, 8]), choisir('k', [1, 1, 5.5])),
                          (choisir('k', [5, 3, 4]), choisir('k', [5.5, 5.5, 1]))], FOND),
           3, 'il a 3 côtés et 3 sommets.', [{'name': 'k', 'expression': '1..3'}]),
]

SPECS_NOMMER = [
    spec('Disque', 0, {'c': '1', 'x': '2', 'r': '2'}, 'correct', 0),
    spec('Erreur : disque pris pour un carré', 0, {'c': '1', 'x': '2', 'r': '2'}, 'incorrect', 1),
    spec('Carré', 1, {'c': '2', 'a': '1'}, 'correct', 1),
    spec('Erreur : carré pris pour un rectangle', 1, {'c': '2', 'a': '1'}, 'incorrect', 2),
    spec('Carré sur une pointe', 2, {'c': '3', 'a': '2'}, 'correct', 1),
    spec('Erreur : carré sur une pointe pris pour un triangle', 2, {'c': '3', 'a': '2'},
         'incorrect', 3),
    spec('Rectangle debout', 3, {'c': '4', 'o': '2'}, 'correct', 2),
    spec('Erreur : rectangle pris pour un carré', 3, {'c': '4', 'o': '2'}, 'incorrect', 1),
    spec('Triangle pointe en bas', 4, {'c': '1', 'k': '3'}, 'correct', 3),
]

# --- CP-056 a : compter les côtés ou les sommets ----------------------------------------------

# f : 1 triangle, 2 carré, 3 rectangle ; q : 1 côtés, 2 sommets
SOMMETS_F = {
    1: [(2.5, 1), (7.5, 1.5), (4, 6)],
    2: [(3, 1), (7, 1), (7, 5), (3, 5)],
    3: [(1.5, 1.5), (8.5, 1.5), (8.5, 4.5), (1.5, 4.5)],
}


def coord(i, j):
    """Coordonnée j (0 = x, 1 = y) du sommet i, selon la forme f ; le 4e sommet du triangle
    est confondu avec le 3e (caché)."""
    vals = []
    for f in (1, 2, 3):
        pts = SOMMETS_F[f]
        vals.append(pts[min(i, len(pts) - 1)][j])
    return choisir('f', vals)


COMPTER_COTES = {
    'statement': 'Combien de {{if:q==1|côtés|sommets}} a cette forme ?\n\n'
    + figure(FENETRE_FORME, 'Une forme dont les sommets sont marqués.',
             [f'S{i} = point({coord(i, 0)}, {coord(i, 1)}, couleur="noir", etiquette="aucune",'
              f' visible={"{{if:f==1|faux|vrai}}" if i == 3 else "vrai"})' for i in range(4)]
             + ['p = polygone(S0, S1, S2, couleur="noir", remplissage="'
                + choisir('c', COULEURS) + '", opacite_fond=0.5, visible={{if:f==1|vrai|faux}})',
                'q = polygone(S0, S1, S2, S3, couleur="noir", remplissage="'
                + choisir('c', COULEURS) + '", opacite_fond=0.5, visible={{if:f==1|faux|vrai}})'])
    + '\n\nCette forme a [_] {{if:q==1|côtés|sommets}}.',
    'variables': [{'name': 'f', 'expression': '1..3'}, {'name': 'q', 'expression': '1..2'},
                  {'name': 'c', 'expression': '1..4'}],
    'conditions': [],
    'blanks': [{'expectedAnswer': '{{if:f==1|3|4}}'}],
    'correction': {'steps': [
        '{{if:q==1|Un côté est un trait droit entre deux sommets.|Un sommet est un « coin » de'
        ' la forme, là où deux côtés se rencontrent.}}',
        'C\'est ' + choisir('f', ['un triangle', 'un carré', 'un rectangle'])
        + ' : il a {{if:f==1|$3$|$4$}} {{if:q==1|côtés|sommets}}.',
    ]},
}

SPECS_COTES = [
    spec('Triangle, côtés : 3', 0, {'f': '1', 'q': '1', 'c': '1'}, 'correct', answers=['3']),
    spec('Carré, sommets : 4', 0, {'f': '2', 'q': '2', 'c': '2'}, 'correct', answers=['4']),
    spec('Rectangle, côtés : 4', 0, {'f': '3', 'q': '1', 'c': '3'}, 'correct', answers=['4']),
    spec('Erreur : rectangle, 2 côtés (les longs seulement)', 0, {'f': '3', 'q': '1', 'c': '3'},
         'incorrect', answers=['2']),
    spec('Erreur : triangle, 4 sommets', 0, {'f': '1', 'q': '2', 'c': '4'}, 'incorrect',
         answers=['4']),
]

# --- CP-056 b : « Qui suis-je ? » --------------------------------------------------------------

NOMS_QUI = ['un triangle', 'un carré', 'un rectangle', 'un disque']


def devinette(phrases, juste):
    return {
        'statement': 'Qui suis-je ?\n\n' + '\n\n'.join(f'_{p}_' for p in phrases),
        'variables': [],
        'conditions': [],
        'choices': [{'content': f'Je suis {n}.'} for n in NOMS_QUI],
        'correctChoiceIndex': [str(juste)],
        'correction': {'steps': [f'C\'est {NOMS_QUI[juste]}.'] + [EXPLIQUE[juste]]},
    }


EXPLIQUE = [
    'Un triangle a 3 côtés et 3 sommets.',
    'Un carré a 4 côtés, tous de la même longueur, et 4 sommets.',
    'Un rectangle a 4 côtés et 4 sommets : deux grands côtés et deux petits côtés.',
    'Un disque est tout rond : il n\'a ni côté ni sommet.',
]

DEVINETTES = [
    devinette(['J\'ai 3 côtés.', 'J\'ai 3 sommets.'], 0),
    devinette(['J\'ai 4 côtés et 4 sommets.', 'Mes 4 côtés ont la même longueur.'], 1),
    devinette(['J\'ai 4 côtés et 4 sommets.', 'J\'ai deux grands côtés et deux petits côtés.'],
              2),
    devinette(['Je suis tout rond.', 'Je n\'ai ni côté ni sommet.'], 3),
]

SPECS_DEVINETTES = [
    spec('3 côtés : triangle', 0, {}, 'correct', 0),
    spec('Côtés égaux : carré', 1, {}, 'correct', 1),
    spec('Erreur : côtés égaux, rectangle', 1, {}, 'incorrect', 2),
    spec('Grands et petits côtés : rectangle', 2, {}, 'correct', 2),
    spec('Erreur : grands et petits côtés, carré', 2, {}, 'incorrect', 1),
    spec('Tout rond : disque', 3, {}, 'correct', 3),
]

# --- CP-057 : repérer des alignements --------------------------------------------------------

# Chaque configuration : 5 points A…E ; un seul groupe de 3 alignés ; les deux leurres sont
# nettement hors ligne (plus d'une unité dans une fenêtre de 10).
ALIGNEMENTS = [
    ({'A': (1, 1), 'B': (3, 5.5), 'C': (4, 3), 'D': (7, 5), 'E': (9, 1.5)},
     'A, C et D', ['A, B et D', 'B, C et E'], 'Les points A, C et D sont sur une même ligne'
     ' droite qui monte.'),
    ({'A': (1, 4), 'B': (3, 1), 'C': (5, 4.5), 'D': (7, 2), 'E': (9, 5)},
     'A, C et E', ['A, B et D', 'B, C et D'], 'Les points A, C et E sont sur une même ligne'
     ' droite presque horizontale.'),
    ({'A': (2, 1.5), 'B': (2, 6), 'C': (5, 3.5), 'D': (5, 6), 'E': (8, 1)},
     'B, C et E', ['A, C et D', 'B, D et E'], 'Les points B, C et E sont sur une même ligne'
     ' droite qui descend.'),
    ({'A': (1, 1), 'B': (3.5, 3.5), 'C': (5, 1), 'D': (8, 3.5), 'E': (6, 6)},
     'A, B et E', ['A, C et D', 'C, D et E'], 'Les points A, B et E sont sur une même ligne'
     ' droite qui monte.'),
]


def verifier_alignements():
    """Le groupe juste est aligné ; tout autre groupe de 3 points est nettement hors ligne."""
    for pts, juste, leurres, _ in ALIGNEMENTS:
        def aire(groupe):
            (ax, ay), (bx, by), (cx, cy) = (pts[n] for n in groupe)
            return abs((bx - ax) * (cy - ay) - (by - ay) * (cx - ax))
        lettres = lambda texte: tuple(texte.replace(' et', ',').split(', '))
        assert aire(lettres(juste)) < 1e-9, juste
        assert all(lettres(lr) != lettres(juste) for lr in leurres)
        for groupe in combinations('ABCDE', 3):
            if groupe != lettres(juste):
                assert aire(groupe) >= 5, (juste, groupe, aire(groupe))


verifier_alignements()


def numeros(texte):
    """A…E → 1…5 : les choix du QCM portent déjà les lettres A, B, C ; les points sont
    numérotés pour ne pas s'y mêler."""
    return re.sub(r'\b([A-E])\b', lambda m: str('ABCDE'.index(m.group(1)) + 1), texte)


def alignement(pts, juste, leurres, explication):
    lignes = []
    for n, (x, y) in pts.items():
        lignes += [f'{n} = point({nombre(x)}, {nombre(y)}, couleur="noir", etiquette="aucune")',
                   f'texte({nombre(x)}, {nombre(y + 0.45)}, "{numeros(n)}")']
    return {
        'statement': 'Quels points semblent être alignés ?\n\n'
        + figure('0 ; 10 ; 0 ; 7', 'Cinq points numérotés de 1 à 5.', lignes),
        'variables': [],
        'conditions': [],
        'choices': [{'content': f'Les points {numeros(juste)}.'}]
        + [{'content': f'Les points {numeros(lr)}.'} for lr in leurres],
        'correctChoiceIndex': ['0'],
        'correction': {'steps': [numeros(explication) + ' On peut le vérifier avec une règle.']},
    }


ALIGNER = [alignement(*a) for a in ALIGNEMENTS]
SPECS_ALIGNER = []
for i in range(len(ALIGNEMENTS)):
    SPECS_ALIGNER.append(spec(f'Configuration {i + 1} : bon groupe', i, {}, 'correct', 0))
    SPECS_ALIGNER.append(spec(f'Configuration {i + 1} : leurre', i, {}, 'incorrect', 1 + i % 2))

# --- CP-061 : vocabulaire des positions relatives ---------------------------------------------

# V1 : gauche, droite, au-dessus, en dessous (p = position du carré par rapport au disque)
POS = ['à gauche du disque', 'à droite du disque', 'au-dessus du disque', 'en dessous du disque']
CARRE_XY = [(1.5, 2.5), (6.5, 2.5), (4, 5), (4, 0.2)]
DISQUE_XY = [(7, 3.5), (3, 3.5), (5, 2.5), (5, 5.3)]
POSITIONS_CARDINALES = {
    'statement': 'Regarde la figure. Où est le carré ?\n\n'
    + figure('0 ; 10 ; 0 ; 7', 'Un carré bleu et un disque rouge.',
             rect('q', choisir('p', [x for x, _ in CARRE_XY]),
                  choisir('p', [y for _, y in CARRE_XY]),
                  choisir('p', [x + 2 for x, _ in CARRE_XY]),
                  choisir('p', [y + 2 for _, y in CARRE_XY]), 'bleu')
             + disque('d', choisir('p', [x for x, _ in DISQUE_XY]),
                      choisir('p', [y for _, y in DISQUE_XY]), 1.2, 'rouge')),
    'variables': [{'name': 'p', 'expression': '1..4'}],
    'conditions': [],
    'choices': [{'content': f'Le carré est {pos}.'} for pos in POS],
    'correctChoiceIndex': ['{{eval:p-1}}'],
    'correction': {'steps': ['Le carré est ' + choisir('p', POS) + '.']},
}

# V2 : entre ; g = forme du milieu (0 triangle, 1 carré, 2 disque), e = sens des deux autres ;
# k = 1 + 2g + e numérote l'ordre de gauche à droite. Un {{if:…}} imbriqué n'est pas résolu
# dans correctChoiceIndex : la bonne réponse y est la variable g elle-même.
FORMES3 = ['le triangle', 'le carré', 'le disque']


def ordre(g, e):
    bouts = [f for f in range(3) if f != g]
    if e:
        bouts.reverse()
    return (bouts[0], g, bouts[1])


ORDRES = [ordre(g, e) for g in range(3) for e in range(2)]  # ORDRES[k-1][place] = forme
XS = [2, 5, 8]


def x_de(forme):
    return choisir('k', [XS[o.index(forme)] for o in ORDRES])


def nom_a_place(place):
    return choisir('k', [FORMES3[o[place]] for o in ORDRES])


ENTRE = {
    'statement': 'Regarde la figure. Quelle forme est entre ' + nom_a_place(0) + ' et '
    + nom_a_place(2) + ' ?\n\n'
    + figure('0 ; 10 ; 0 ; 4', 'Un triangle, un carré et un disque, rangés sur une ligne.',
             polygone('t', [(f'{x_de(0)}-1', 1), (f'{x_de(0)}+1', 1), (x_de(0), 3)], 'vert')
             + rect('q', f'{x_de(1)}-1', 1, f'{x_de(1)}+1', 3, 'bleu')
             + disque('d', x_de(2), 2, 1, 'rouge')),
    'variables': [{'name': 'g', 'expression': '0..2'}, {'name': 'e', 'expression': '0..1'},
                  {'name': 'k', 'expression': 'eval:1+2*g+e'}],
    'conditions': [],
    'choices': [{'content': f'{f[0].upper()}{f[1:]}.'} for f in FORMES3],
    'correctChoiceIndex': ['{{g}}'],
    'correction': {'steps': [nom_a_place(1)[0].upper() + nom_a_place(1)[1:]
                             + ' est entre ' + nom_a_place(0) + ' et ' + nom_a_place(2) + '.']},
}

# V3 : sur, sous, à côté de la table (b = position du ballon)
TABLE = (rect('plateau', 3, 3, 8, 3.5, 'marron') + rect('pa', 3.3, 0.5, 3.7, 3, 'marron')
         + rect('pb', 7.3, 0.5, 7.7, 3, 'marron'))
SUR_SOUS = ['sur la table', 'sous la table', 'à côté de la table']
TABLE_V = {
    'statement': 'Regarde la figure. Où est le ballon ?\n\n'
    + figure('0 ; 10 ; 0 ; 6', 'Une table et un ballon.',
             TABLE + disque('ballon', choisir('b', [5.5, 5.5, 1.5]),
                            choisir('b', [4.3, 1.3, 1.3]), 0.8, 'rouge')
             + ['sol1 = point(0, 0.5, visible=faux)', 'sol2 = point(10, 0.5, visible=faux)',
                'segment(sol1, sol2, couleur="noir")']),
    'variables': [{'name': 'b', 'expression': '1..3'}],
    'conditions': [],
    'choices': [{'content': f'Le ballon est {s}.'} for s in SUR_SOUS],
    'correctChoiceIndex': ['{{eval:b-1}}'],
    'correction': {'steps': ['Le ballon est ' + choisir('b', SUR_SOUS) + '.']},
}

# V4 : devant, derrière (o = 1 : le disque cache une partie du carré)
DEVANT = {
    'statement': 'Regarde la figure. Où est le disque ?\n\n'
    + figure('0 ; 10 ; 0 ; 6', 'Un carré et un disque, l\'un cache une partie de l\'autre.',
             disque('d1', 5.8, 2.6, 1.6, 'rouge', si('o==2'))
             + rect('q', 2.5, 1, 5.5, 4, 'bleu')
             + disque('d2', 5.8, 2.6, 1.6, 'rouge', si('o==1'))),
    'variables': [{'name': 'o', 'expression': '1..2'}],
    'conditions': [],
    'choices': [{'content': 'Le disque est devant le carré.'},
                {'content': 'Le disque est derrière le carré.'}],
    'correctChoiceIndex': ['{{eval:o-1}}'],
    'correction': {'steps': [
        '{{if:o==1|Le disque cache une partie du carré : il est devant le carré.|Le carré cache'
        ' une partie du disque : le disque est derrière le carré.}}']},
}

SPECS_POSITIONS = [
    spec('Carré à gauche', 0, {'p': '1'}, 'correct', 0),
    spec('Erreur : gauche et droite inversées', 0, {'p': '1'}, 'incorrect', 1),
    spec('Carré en dessous', 0, {'p': '4'}, 'correct', 3),
    spec('Erreur : au-dessus au lieu d\'en dessous', 0, {'p': '4'}, 'incorrect', 2),
    spec('Entre : le triangle', 1, {'g': '0', 'e': '0', 'k': '1'}, 'correct', 0),
    spec('Erreur : une forme du bout', 1, {'g': '0', 'e': '0', 'k': '1'}, 'incorrect', 1),
    spec('Entre : le disque', 1, {'g': '2', 'e': '1', 'k': '6'}, 'correct', 2),
    spec('Ballon sous la table', 2, {'b': '2'}, 'correct', 1),
    spec('Erreur : sur au lieu de sous', 2, {'b': '2'}, 'incorrect', 0),
    spec('Ballon à côté', 2, {'b': '3'}, 'correct', 2),
    spec('Disque devant', 3, {'o': '1'}, 'correct', 0),
    spec('Disque derrière', 3, {'o': '2'}, 'correct', 1),
    spec('Erreur : devant au lieu de derrière', 3, {'o': '2'}, 'incorrect', 0),
]

# --- CP-062 : se situer dans la classe ---------------------------------------------------------

PRENOMS = ['Léa', 'Tom', 'Lina', 'Sami', 'Jade', 'Hugo', 'Nour', 'Léo', 'Maya']
# places : rangée r (1 = devant, près du tableau), colonne c (1 = gauche) → indice 3(r-1)+(c-1)
# k = 1..4 décale les prénoms (un prénom rangé dans une variable serait relu comme un nom de
# variable : il est écrit dans le texte par {{if:…}})


def prenom_place(r, c):
    i = 3 * (r - 1) + (c - 1)
    return choisir('k', [PRENOMS[(i + 2 * k) % 9] for k in range(4)])


def plan_classe():
    lignes = rect('tableau', 2, 8.2, 8, 8.8, 'gris') + ['texte(5, 9.3, "tableau")']
    for r in (1, 2, 3):
        for c in (1, 2, 3):
            x, y = 1 + 3 * (c - 1), 6.5 - 2.4 * (r - 1)
            lignes += rect(f't{r}{c}', x, y - 0.6, x + 2, y + 0.6, None)
            lignes.append(f'texte({nombre(x + 1)}, {nombre(y)}, "{prenom_place(r, c)}")')
    return figure('0 ; 10 ; 0 ; 10', 'Plan de la classe vu du dessus : le tableau en haut,'
                  ' trois rangées de trois tables avec le prénom de chaque élève.', lignes)


def situer(question, ref, juste, leurres, explication):
    """ref, juste, leurres : places (r, c)."""
    return {
        'statement': 'Voici le plan de la classe, vu du dessus. Les élèves sont assis face au'
        ' tableau.\n\n' + plan_classe() + '\n\n'
        # replace et non format : les {{if:…}} des prénoms perdraient leurs accolades
        + question.replace('{ref}', prenom_place(*ref)),
        'variables': [{'name': 'k', 'expression': '1..4'}],
        'conditions': [],
        'choices': [{'content': prenom_place(*p) + '.'} for p in [juste] + leurres],
        'correctChoiceIndex': ['0'],
        'correction': {'steps': [explication.replace('{ref}', prenom_place(*ref))
                                 .replace('{juste}', prenom_place(*juste))]},
    }


SITUER = [
    situer('Qui est assis à gauche de {ref} ?', (2, 2), (2, 1), [(2, 3), (1, 2)],
           'Les élèves regardent le tableau : la gauche de {ref} est la gauche du plan.'
           ' {juste} est à gauche de {ref}.'),
    situer('Qui est assis à droite de {ref} ?', (3, 2), (3, 3), [(3, 1), (2, 2)],
           'Les élèves regardent le tableau : la droite de {ref} est la droite du plan.'
           ' {juste} est à droite de {ref}.'),
    situer('Qui est assis juste devant {ref} ?', (3, 1), (2, 1), [(3, 2), (1, 2)],
           '« Devant », c\'est plus près du tableau, dans la même colonne. {juste} est juste'
           ' devant {ref}.'),
    situer('Qui est assis juste derrière {ref} ?', (1, 3), (2, 3), [(1, 2), (3, 2)],
           '« Derrière », c\'est plus loin du tableau, dans la même colonne. {juste} est juste'
           ' derrière {ref}.'),
    situer('Qui est assis entre ' + prenom_place(2, 1) + ' et {ref} ?', (2, 3), (2, 2),
           [(1, 2), (3, 2)],
           '{juste} est assis au milieu de la rangée, entre ' + prenom_place(2, 1)
           + ' et {ref}.'),
]

SPECS_SITUER = []
for i in range(len(SITUER)):
    SPECS_SITUER += [spec(f'Question {i + 1}, k = 1 : bon prénom', i, {'k': '1'}, 'correct', 0),
                     spec(f'Question {i + 1}, k = 3 : leurre', i, {'k': '3'}, 'incorrect', 1)]

# --- CP-067 : coder un déplacement --------------------------------------------------------------

FL = {'d': '\\rightarrow', 'g': '\\leftarrow', 'h': '\\uparrow', 'b': '\\downarrow'}
PAS = {'d': (1, 0), 'g': (-1, 0), 'h': (0, 1), 'b': (0, -1)}
DEPART = (1, 1)


def arrivee(code):
    x, y = DEPART
    for m in code:
        x, y = x + PAS[m][0], y + PAS[m][1]
    return x, y


def latex_code(code):
    return '$' + '\\ '.join(FL[m] for m in code) + '$'


# (code juste, leurre 1 : une flèche changée, leurre 2 : une flèche oubliée)
CODES = [('ddh', 'ddb', 'dd'), ('hhdd', 'hhgd', 'hdd'), ('dhdh', 'dbdh', 'dhd'),
         ('dddhh', 'dddbh', 'ddhh')]
for juste_, l1, l2 in CODES:
    pts = {arrivee(juste_), arrivee(l1), arrivee(l2)}
    assert len(pts) == 3, juste_
    assert all(0 <= x <= 7 and 0 <= y <= 5 for x, y in pts), juste_

NOM_PT = ['1', '2', '3']
FENETRE_ROBOT = '-0.5 ; 7.5 ; -0.9 ; 5.5'


def lettre_de(role):
    """Numéro posé sur l'arrivée du code juste (role 0) ou d'un leurre : décalage l."""
    return choisir('l', [NOM_PT[(role + l) % 3] for l in range(3)])


def depart_lignes():
    x, y = DEPART
    return rect('dep', x - 0.2, y - 0.2, x + 0.2, y + 0.2, 'rouge') + [
        f'texte({x}, {nombre(y - 0.55)}, "départ")']


def robot_lignes(cibles):
    lignes = depart_lignes()
    for role, (xs, ys, yt) in enumerate(cibles):
        lignes += [f'P{role} = point({xs}, {ys}, couleur="noir", etiquette="aucune")',
                   f'texte({xs}, {yt}, "{lettre_de(role)}")']
    return lignes


def coord_code(role, j, decalage=0):
    return choisir('m', [nombre(arrivee(c[role])[j] + decalage) for c in CODES])


OU_ARRIVE = {
    'statement': 'Le robot part du carré rouge. Chaque flèche le fait avancer d\'un carreau.'
    '\n\nCode : ' + choisir('m', [latex_code(c[0]) for c in CODES]) + '\n\n'
    + figure(FENETRE_ROBOT, 'Un quadrillage, la case de départ du robot et trois points'
             ' 1, 2 et 3.', robot_lignes([(coord_code(r, 0), coord_code(r, 1),
                                           coord_code(r, 1, 0.4)) for r in range(3)]),
             grille=True)
    + '\n\nOù arrive le robot ?',
    'variables': [{'name': 'm', 'expression': '1..4'}, {'name': 'l', 'expression': '0..2'}],
    'conditions': [],
    'choices': [{'content': f'Au point {n}.'} for n in NOM_PT],
    'correctChoiceIndex': ['{{l}}'],
    'correction': {'steps': ['On suit les flèches une par une, depuis le carré rouge : le robot'
                             ' arrive au point ' + lettre_de(0) + '.']},
}

QUEL_CODE = {
    'statement': 'Le robot part du carré rouge. Chaque flèche le fait avancer d\'un carreau.'
    '\n\n' + figure(FENETRE_ROBOT, 'Un quadrillage, le carré rouge du départ et le carré vert'
                    ' de l\'arrivée.',
                    depart_lignes() + rect('arr', coord_code(0, 0, -0.2), coord_code(0, 1, -0.2),
                                           coord_code(0, 0, 0.2), coord_code(0, 1, 0.2), 'vert')
                    + [f'texte({coord_code(0, 0)}, {coord_code(0, 1, 0.55)}, "arrivée")'],
                    grille=True)
    + '\n\nQuel code mène le robot au carré vert ?',
    'variables': [{'name': 'm', 'expression': '1..4'}],
    'conditions': [],
    'choices': [{'content': choisir('m', [latex_code(c[r]) for c in CODES])} for r in range(3)],
    'correctChoiceIndex': ['0'],
    'correction': {'steps': ['On suit chaque code depuis le carré rouge. Seul '
                             + choisir('m', [latex_code(c[0]) for c in CODES])
                             + ' arrive au carré vert.']},
}

SPECS_ROBOT = [
    spec('Où arrive : bon point', 0, {'m': '1', 'l': '0'}, 'correct', 0),
    spec('Où arrive : bon point, lettres décalées', 0, {'m': '2', 'l': '2'}, 'correct', 2),
    spec('Erreur : point d\'une flèche changée', 0, {'m': '2', 'l': '2'}, 'incorrect', 0),
    spec('Quel code : le bon', 1, {'m': '3'}, 'correct', 0),
    spec('Erreur : une flèche oubliée', 1, {'m': '3'}, 'incorrect', 2),
    spec('Erreur : une flèche changée', 1, {'m': '4'}, 'incorrect', 1),
]

# --- CP-035 : mesurer avec une règle graduée ---------------------------------------------------


def regle():
    lignes = rect('regle', -0.4, 0, 13.4, 1.4, None)
    for i in range(14):
        lignes += [f'g{i}a = point({i}, 1.4, visible=faux)',
                   f'g{i}b = point({i}, 0.9, visible=faux)',
                   f'segment(g{i}a, g{i}b, couleur="noir")',
                   f'texte({i}, 0.5, "{i}")']
    return lignes


MESURER = {
    'statement': 'Mesure ce segment avec la règle.\n\n'
    + figure('-0.8 ; 13.8 ; -0.2 ; 3.5', 'Un segment posé au-dessus d\'une règle graduée en'
             ' centimètres, le 0 au début du segment.',
             regle() + ['M = point(0, 2, visible=faux)', 'N = point({{L}}, 2, visible=faux)',
                        's = segment(M, N, couleur="bleu", epaisseur=3)',
                        'Mt1 = point(0, 1.7, visible=faux)', 'Mt2 = point(0, 2.3, visible=faux)',
                        'segment(Mt1, Mt2, couleur="bleu", epaisseur=3)',
                        'Nt1 = point({{L}}, 1.7, visible=faux)',
                        'Nt2 = point({{L}}, 2.3, visible=faux)',
                        'segment(Nt1, Nt2, couleur="bleu", epaisseur=3)'])
    + '\n\nLe segment mesure [_] cm.',
    'variables': [{'name': 'L', 'expression': '2..12'}],
    'conditions': [],
    'blanks': [{'expectedAnswer': '{{L}}'}],
    'correction': {'steps': ['Le segment commence au $0$ de la règle et s\'arrête au ${{L}}$.',
                             'Il mesure ${{L}}$ cm.']},
}

SPECS_MESURER = [
    spec('7 cm', 0, {'L': '7'}, 'correct', answers=['7']),
    spec('Erreur : les traits comptés, 0 compris', 0, {'L': '7'}, 'incorrect', answers=['8']),
    spec('12 cm', 0, {'L': '12'}, 'correct', answers=['12']),
]

# --- CP-034 : comparer des segments selon leur longueur -----------------------------------------

# Trois segments 1 (horizontal), 2 (penché à 45°), 3 (vertical) ; longueurs s, s+1, s+2 (s = 3
# ou 4). q = 1 : le plus long, 2 : le plus court ; g = le segment cherché (0 → 1, 1 → 2, 2 → 3) ; m =
# ordre des deux autres. v = 1 + g + 3m + 6(s-3) + 12(q-1) numérote la figure. Un {{if:…}}
# imbriqué n'est pas résolu dans correctChoiceIndex : la bonne réponse y est g.
RAC2 = 2 ** -0.5
COMBOS = [(q, s_, m, g) for q in (1, 2) for s_ in (3, 4) for m in (0, 1) for g in range(3)]


def longueurs(v):
    q, s_, m, g = COMBOS[v - 1]
    rangs = [0, 0, 0]
    rangs[g] = 2 if q == 1 else 0
    autres = [i for i in range(3) if i != g]
    restants = [0, 1] if q == 1 else [1, 2]
    if m:
        restants.reverse()
    for i, r in zip(autres, restants):
        rangs[i] = r
    return [s_ + r for r in rangs]


for v_ in range(1, len(COMBOS) + 1):
    q_, s0, m_, g_ = COMBOS[v_ - 1]
    assert v_ == 1 + g_ + 3 * m_ + 6 * (s0 - 3) + 12 * (q_ - 1)
    ls = longueurs(v_)
    assert sorted(ls) == [s0, s0 + 1, s0 + 2]
    assert ls[g_] == (max(ls) if q_ == 1 else min(ls))


def bout(seg, j):
    """Extrémité du segment seg, coordonnée j, selon v."""
    origines = [(0.5, 6.5), (1, 0.5), (8.5, 0.5)]
    directions = [(1, 0), (RAC2, RAC2), (0, 1)]
    vals = [round(origines[seg][j] + longueurs(v)[seg] * directions[seg][j], 2)
            for v in range(1, len(COMBOS) + 1)]
    return choisir('v', [nombre(x) for x in vals])


def segments_lignes():
    origines = [(0.5, 6.5), (1, 0.5), (8.5, 0.5)]
    couleurs = ['bleu', 'rouge', 'vert']
    etiquettes = [(0.5, 7.1), (0.6, 1.4), (9.2, 1)]
    lignes = []
    for seg, nom in enumerate('ABC'):  # noms des points ; le segment est numéroté seg + 1
        ox, oy = origines[seg]
        lignes += [f'{nom}1 = point({nombre(ox)}, {nombre(oy)}, visible=faux)',
                   f'{nom}2 = point({bout(seg, 0)}, {bout(seg, 1)}, visible=faux)',
                   f'segment({nom}1, {nom}2, couleur="{couleurs[seg]}", epaisseur=3)',
                   f'texte({nombre(etiquettes[seg][0])}, {nombre(etiquettes[seg][1])},'
                   f' "{seg + 1}")']
    return lignes


def mesure(seg):
    return choisir('v', [str(longueurs(v)[seg]) for v in range(1, len(COMBOS) + 1)])


COMPARER = {
    'statement': 'Quel segment est le plus {{if:q==1|long|court}} ?\n\n'
    + figure('0 ; 10 ; 0 ; 8', 'Trois segments numérotés 1, 2 et 3, dans des directions'
                                    ' différentes.',
             segments_lignes()),
    'variables': [{'name': 'q', 'expression': '1..2'}, {'name': 's', 'expression': '3..4'},
                  {'name': 'm', 'expression': '0..1'}, {'name': 'g', 'expression': '0..2'},
                  {'name': 'v', 'expression': 'eval:1+g+3*m+6*(s-3)+12*(q-1)'}],
    'conditions': [],
    'choices': [{'content': f'Le segment {n}.'} for n in '123'],
    'correctChoiceIndex': ['{{g}}'],
    'correction': {'steps': [
        'Les segments ne sont pas dans la même direction : on peut reporter leur longueur sur'
        ' une bande de papier pour les comparer.',
        'Le segment 1 mesure ' + mesure(0) + ' cm, le segment 2 mesure ' + mesure(1)
        + ' cm et le segment 3 mesure ' + mesure(2) + ' cm : le plus {{if:q==1|long|court}} est'
        ' le segment {{if:g==0|1|{{if:g==1|2|3}}}}.',
    ]},
}


def vars_comparer(q, s_, m, g):
    return {'q': str(q), 's': str(s_), 'm': str(m), 'g': str(g),
            'v': str(1 + g + 3 * m + 6 * (s_ - 3) + 12 * (q - 1))}


SPECS_COMPARER = [
    spec('Le plus long : C', 0, vars_comparer(1, 3, 0, 2), 'correct', 2),
    spec('Erreur : le penché pris pour le plus long', 0, vars_comparer(1, 3, 0, 2), 'incorrect',
         1),
    spec('Le plus court : A', 0, vars_comparer(2, 4, 1, 0), 'correct', 0),
    spec('Erreur : le plus long pris pour le plus court', 0, vars_comparer(2, 4, 1, 0),
         'incorrect', 1),
    spec('Le plus long : B (penché)', 0, vars_comparer(1, 4, 1, 1), 'correct', 1),
]

GEO = ('Géométrie', 'Figures planes', 'Propriétés')
REPERAGE = 'Repérage et déplacements'
LONGUEURS = ('Grandeurs', 'Longueurs', 'Comparaison et mesure')

MODELES = {
    '01-formes-dans-un-dessin': modele(
        'Combien de formes dans le dessin ?',
        'Compter les triangles, carrés, rectangles ou disques d\'un dessin fait de formes'
        ' (maison, bateau, robot)', *GEO, 60, [MAISON, BATEAU, ROBOT], SPECS_ASSEMBLAGE),
    '02-quelle-forme': modele(
        'Quelle est cette forme ?',
        'Nommer une forme pleine : disque, carré (droit ou sur une pointe), rectangle, triangle',
        *GEO, 30, NOMMER, SPECS_NOMMER),
    '03-cotes-et-sommets': modele(
        'Combien de côtés ? Combien de sommets ?',
        'Compter les côtés ou les sommets d\'un triangle, d\'un carré ou d\'un rectangle', *GEO,
        30, [COMPTER_COTES], SPECS_COTES),
    '04-qui-suis-je': modele(
        'Qui suis-je ? (formes)',
        'Reconnaître une forme à sa description : côtés, sommets, longueurs', *GEO, 30,
        DEVINETTES, SPECS_DEVINETTES),
    '05-points-alignes': modele(
        'Quels points sont alignés ?',
        'Repérer à l\'œil trois points alignés parmi cinq', *GEO, 45, ALIGNER, SPECS_ALIGNER),
    '06-ou-est-il': modele(
        'Où est-il ?',
        'Positions relatives : gauche, droite, au-dessus, en dessous, entre, sur, sous, devant,'
        ' derrière', 'Géométrie', REPERAGE, 'Positions et plans', 30,
        [POSITIONS_CARDINALES, ENTRE, TABLE_V, DEVANT], SPECS_POSITIONS),
    '07-plan-de-classe': modele(
        'Qui est assis à côté ?',
        'Situer des élèves sur un plan de classe : à gauche, à droite, devant, derrière, entre',
        'Géométrie', REPERAGE, 'Positions et plans', 60, SITUER, SPECS_SITUER),
    '08-robot-quadrillage': modele(
        'Le robot sur le quadrillage',
        'Suivre un code de flèches sur un quadrillage, ou choisir le code qui mène à un point',
        'Géométrie', REPERAGE, 'Coder un déplacement', 60, [OU_ARRIVE, QUEL_CODE], SPECS_ROBOT),
    '09-mesurer-avec-la-regle': modele(
        'Mesure avec la règle',
        'Lire la longueur d\'un segment (2 à 12 cm) posé sur une règle, le 0 au début',
        *LONGUEURS, 30, [MESURER], SPECS_MESURER),
    '10-segment-le-plus-long': modele(
        'Quel segment est le plus long ?',
        'Comparer trois segments de directions différentes (1 cm d\'écart au moins)',
        *LONGUEURS, 30, [COMPARER], SPECS_COMPARER),
}

for nom, m in MODELES.items():
    with open(f'{DOSSIER}/{nom}.json', 'w') as f:
        json.dump(m, f, ensure_ascii=False, indent='\t')
        f.write('\n')
print(len(MODELES), 'modèles écrits')
