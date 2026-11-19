"""Écrit les 6 modèles du lot 8b du CM1 (aires et angles) dans scripts/questions/cm1-8b/.

Phase 0 validée par David le 2026-11-18 (§ 22 et 22 bis du journal
`docs/archive/wip/questions-cm1-progress.md`) : 6 modèles (CM1-086 à 091), tout en bloc ```figure ;
niveaux CM1 et CM2 sauf le 088 (cm², CM1 seul : le CM2 ajoute dm² et m²) ; sous-notion neuve
« aires sur quadrillage » (créée par la migration nœud + tag) pour 086 et 087.

Bornes (`cycle3.json`) : 086 sans mesure (superposition, découpage-recollement) ; 087 unité
fournie, carreaux entiers et demi-carreaux ; 088 le cm² seul ; 089 sommet, côtés, angle droit,
aigu, obtus ; 090 notations â, ABC chapeau, Â ; 091 sans mesure, pas de degré (aucune mesure
écrite à l'élève : les ouvertures ne servent qu'à dessiner).

Patrons : CE1 `ce1-9/09` (angle sur quadrillage, case choix), 6e
`6-angles-constructions/01` (demi-droites, points nommés).

Pièges (relus dans le journal et la doc § 9) : `i` et `e` jamais comme variables ; dans une
variable, `eval:` sans `==` (indicatrices) et `{{if:}}` sur un seul niveau ; la case choix
répond par l'indice d'origine (`melanger: non` partout : listes ordonnées) ; le corrigé nomme la
bonne réponse, jamais son rang ; aucun `|` dans un texte placé dans un `{{if:}}`.

    python3 docs/wip/questions/lot-cm1-8b.py scripts/questions/cm1-8b
"""
import json
import math
import os
import sys

DOSSIER = sys.argv[1]
MODELES = {}

# ---- Gabarits ----


def var(nom, expression):
    return {'name': nom, 'expression': expression}


def variation(enonce, variables, reponses, etapes):
    return {'statement': enonce, 'variables': variables,
            'blanks': [r if isinstance(r, dict) else {'expectedAnswer': r} for r in reponses],
            'correction': {'steps': etapes}}


def modele(title, description, niveau, variations, specs, grades=('CM1', 'CM2'), delay=90):
    return {'title': title, 'description': description, 'grades': list(grades), 'level': niveau,
            'delay': delay, 'status': 'draft', 'variations': variations, 'testSpecs': specs}


def ecrire(nom, mod):
    MODELES[nom] = mod


FONCTIONS = {'__builtins__': {}, 'floor': math.floor, 'mod': lambda a, b: a % b, 'abs': abs,
             'max': max, 'min': min}


def calcule(variables, tirage):
    valeurs = {}
    for v in variables:
        nom, expr = v['name'], v['expression']
        if expr.startswith('eval:') and nom not in tirage:
            x = eval(expr[5:], FONCTIONS, dict(valeurs))
            assert abs(x - round(x)) < 1e-9, (nom, x)
            valeurs[nom] = int(round(x))
        else:
            assert nom in tirage, ('tirage manquant', nom)
            valeurs[nom] = tirage[nom]
    return valeurs


def spec(desc, vi, vs, tirage, answers, status):
    valeurs = calcule(vs[vi]['variables'], tirage)
    return {'description': desc, 'variationIndex': vi,
            'variables': {k: str(x) for k, x in valeurs.items()},
            'answers': answers if isinstance(answers, list) else [answers],
            'expected': {'status': status}}


def ev(x):
    return '{{eval:' + x + '}}'


def col(x, k=0):
    return '\\textcolor{{{color:primary.' + str(k) + '}}}{' + x + '}'


def selon(k, textes, n=1):
    """`{{if:k==1|…|{{if:k==2|…|…}}}}` : le texte numéro `n` pour k == n, etc."""
    if len(textes) == 1:
        return textes[0]
    return ('{{if:' + k + '==' + str(n) + '|' + textes[0] + '|' + selon(k, textes[1:], n + 1)
            + '}}')


def table(nom, valeurs):
    """Variable `nom` = valeurs[j - 1], par indicatrices (`eval:` ne connaît pas `==`) : une
    réponse attendue `{{n}}` plutôt qu'un `{{if:}}` imbriqué sur 10 niveaux, que le filtre de
    sécurité des réponses abîme (test `student-answer-safety`)."""
    return var(nom, 'eval:' + '+'.join(f'(1-min(abs(j-{m}),1))*{int(v)}'
                                       for m, v in enumerate(valeurs, 1)))


def choix(lignes):
    return '\n\n```choix\nmelanger: non\n' + ''.join('- ' + c + '\n' for c in lignes) + '```'


# ---- Formes sur quadrillage ----


def aire(sommets):
    s = 0
    for (x1, y1), (x2, y2) in zip(sommets, sommets[1:] + sommets[:1]):
        s += x1 * y2 - x2 * y1
    return abs(s) / 2


def perimetre(sommets):
    """Tour d'une forme à côtés droits (les formes comparées par leur tour n'ont pas de biais)."""
    p = 0
    for (x1, y1), (x2, y2) in zip(sommets, sommets[1:] + sommets[:1]):
        assert x1 == x2 or y1 == y2, 'côté en biais'
        p += abs(x2 - x1) + abs(y2 - y1)
    return p


def dedans(x, y, sommets):
    c = False
    for (x1, y1), (x2, y2) in zip(sommets, sommets[1:] + sommets[:1]):
        if (y1 > y) != (y2 > y) and x < x1 + (y - y1) * (x2 - x1) / (y2 - y1):
            c = not c
    return c


def carreaux(sommets):
    """(carreaux entiers, demi-carreaux) : chaque carreau est sondé en 20 × 20 points."""
    xs, ys = [p[0] for p in sommets], [p[1] for p in sommets]
    entiers = demis = 0
    for cx in range(min(xs), max(xs)):
        for cy in range(min(ys), max(ys)):
            n = sum(dedans(cx + (a + 0.5) / 20, cy + (b + 0.5) / 20, sommets)
                    for a in range(20) for b in range(20))
            if n == 400:
                entiers += 1
            elif n == 0:
                pass
            else:
                assert abs(n - 200) <= 20, ('carreau ni entier ni demi', sommets, cx, cy, n)
                demis += 1
    assert entiers + demis / 2 == aire(sommets), sommets
    return entiers, demis


def taille(sommets):
    xs, ys = [p[0] for p in sommets], [p[1] for p in sommets]
    assert min(xs) == 0 and min(ys) == 0, sommets
    return max(xs), max(ys)


def forme(prefixe, sommets, dx, dy, couleur):
    lignes = [f'{prefixe}{n} = point({x + dx}, {y + dy}, visible=faux)'
              for n, (x, y) in enumerate(sommets, 1)]
    noms = ', '.join(f'{prefixe}{n}' for n in range(1, len(sommets) + 1))
    lignes.append(f'polygone({noms}, couleur="noir", epaisseur=2, remplissage="{couleur}",'
                  ' opacite_fond=0.35)')
    return '\n'.join(lignes)


def figure(fenetre, description, corps):
    return ('\n\n```figure\nfenetre: ' + fenetre + '\ngrille: 1\ndescription: ' + description
            + '\n---\n' + corps + '\n```')


def nombre(n):
    return str(int(n)) if n == int(n) else str(n).replace('.', ',')


# Formes en carreaux entiers (sommets entiers, côtés droits)
RECT = lambda w, h: [(0, 0), (w, 0), (w, h), (0, h)]
L_5_4 = [(0, 0), (5, 0), (5, 2), (2, 2), (2, 4), (0, 4)]                       # 14
L_FIN = [(0, 0), (7, 0), (7, 1), (1, 1), (1, 5), (0, 5)]                       # 11
L_9 = [(0, 0), (5, 0), (5, 1), (1, 1), (1, 5), (0, 5)]                         # 9
T_7 = [(0, 2), (2, 2), (2, 0), (3, 0), (3, 2), (5, 2), (5, 3), (0, 3)]         # 7
U_10 = [(0, 0), (4, 0), (4, 3), (3, 3), (3, 2), (1, 2), (1, 3), (0, 3)]        # 10
U_FIN = [(0, 0), (5, 0), (5, 4), (4, 4), (4, 1), (1, 1), (1, 4), (0, 4)]       # 11
U_13 = [(0, 0), (5, 0), (5, 4), (4, 4), (4, 2), (1, 2), (1, 4), (0, 4)]        # 14
ESC_8 = [(0, 0), (4, 0), (4, 1), (5, 1), (5, 2), (1, 2), (1, 1), (0, 1)]       # 8
ESC_10 = [(0, 0), (4, 0), (4, 1), (3, 1), (3, 2), (2, 2), (2, 3), (1, 3), (1, 4), (0, 4)]
CROIX = [(1, 0), (3, 0), (3, 1), (4, 1), (4, 3), (3, 3), (3, 4), (1, 4), (1, 3), (0, 3),
         (0, 1), (1, 1)]                                                       # 12
Z_10 = [(0, 2), (2, 2), (2, 0), (5, 0), (5, 2), (3, 2), (3, 4), (0, 4)]
ESC_15 = [(0, 0), (5, 0), (5, 1), (4, 1), (4, 2), (3, 2), (3, 3), (2, 3), (2, 4), (1, 4),
          (1, 5), (0, 5)]                                                      # 15
L_17 = [(0, 0), (6, 0), (6, 2), (3, 2), (3, 5), (0, 5)]                        # 21 (nom historique)
F_13 = [(0, 0), (2, 0), (2, 2), (4, 2), (4, 3), (2, 3), (2, 4), (5, 4), (5, 5), (0, 5)]

# Formes avec des demi-carreaux (côtés en biais qui coupent chaque carreau par sa diagonale)
MAISON = [(0, 0), (4, 0), (4, 2), (2, 4), (0, 2)]                              # 12
PARALL = [(0, 0), (4, 0), (6, 2), (2, 2)]                                      # 8
TRAPEZE = [(0, 0), (6, 0), (4, 2), (2, 2)]                                     # 8
TRIANGLE = [(0, 0), (4, 0), (0, 4)]                                            # 8
LOSANGE = [(2, 0), (4, 2), (2, 4), (0, 2)]                                     # 8
FLECHE = [(0, 1), (3, 1), (3, 0), (5, 2), (3, 4), (3, 3), (0, 3)]              # 10
TOIT_PLAT = [(0, 0), (6, 0), (6, 2), (4, 4), (2, 4), (0, 2)]                   # 20

# ======================================================================================
# 01. Comparer les aires de deux figures (CM1-086 / CM2-071)
# ======================================================================================

FEN2 = '0 ; 10 ; 0 ; 14.5'
DESC2 = 'Deux figures coloriées sur un quadrillage : A en haut, B en bas.'


def deux_formes(gauche, droite, ca='bleu', cb='rouge'):
    wg, hg = taille(gauche)
    wd, hd = taille(droite)
    assert wg <= 8 and wd <= 8 and hg <= 5 and hd <= 5, (gauche, droite)  # x 1 à 9
    # A en haut, B en bas : côte à côte, les carreaux seraient trop petits sur un téléphone
    return '\n'.join([forme('a', gauche, 1, 8, ca), forme('b', droite, 1, 1, cb),
                      f'texte(0.5, {8 + hg / 2}, "A")', f'texte(0.5, {1 + hd / 2}, "B")'])


def entrees(paires):
    """Chaque paire (grande, petite) donne deux tirages : grande à gauche (j impair, réponse 0),
    grande à droite (j pair, réponse 1)."""
    out = []
    for g, p in paires:
        assert aire(g) > aire(p), (g, p)
        out += [(g, p), (p, g)]
    return out


CHOIX_AIRES = ['La figure A a la plus grande aire.', 'La figure B a la plus grande aire.',
               'Les deux figures ont la même aire.']


def compte(sommets):
    return nombre(aire(sommets))


NETTES = [(RECT(4, 4), U_10), (U_13, T_7), (ESC_15, RECT(2, 4)), (CROIX, ESC_8)]
for g, p in NETTES:
    assert aire(g) - aire(p) >= 3
EGALES = [(RECT(6, 2), RECT(3, 4)), (RECT(4, 2), ESC_8), (RECT(3, 3), L_9), (RECT(5, 2), U_10)]
for a, b in EGALES:
    assert aire(a) == aire(b) and a != b
PIEGES = [(RECT(3, 3), RECT(8, 1)), (RECT(4, 4), RECT(7, 2)), (RECT(4, 3), L_FIN),
          (RECT(4, 3), U_FIN)]
for g, p in PIEGES:
    assert aire(g) > aire(p) and perimetre(p) > perimetre(g), (g, p)


def comparer(paires, enonce, intro, conclusion, egales=False):
    tirages = paires if egales else entrees(paires)
    fig = figure(FEN2, DESC2, selon('j', [deux_formes(a, b) for a, b in tirages]))
    comptes = ('On compte les carreaux de chaque figure : A en a $'
               + selon('j', [compte(a) for a, b in tirages]) + '$, B en a $'
               + selon('j', [compte(b) for a, b in tirages]) + '$.')
    variables = [var('j', f'1..{len(tirages)}')]
    if not egales:
        variables.append(var('r', 'eval:1-mod(j,2)'))
    rep = '2' if egales else '{{r}}'
    bonne = ('Les deux figures ont $' + col('\\text{la même aire}') + '$.' if egales else
             'La figure $' + col('{{if:r==0|\\text{A}|\\text{B}}}') + '$ a la plus grande aire.')
    return variation(enonce + fig + choix(CHOIX_AIRES), variables, [rep],
                     [intro, comptes, conclusion, bonne])


V1 = comparer(NETTES, 'Quelle figure a la plus grande aire ?',
              'L\'aire, c\'est la place que prend la surface de la figure. On peut poser une figure'
              ' sur l\'autre, ou compter les carreaux qu\'elle recouvre.',
              'La figure qui recouvre le plus de carreaux prend le plus de place.')
V2 = comparer(EGALES, 'Quelle figure a la plus grande aire ?',
              'On peut découper la figure A et recoller les morceaux autrement, sans rien perdre ni'
              ' rien ajouter : on obtient la figure B.',
              'Découper et recoller ne change pas l\'aire.', egales=True)
V3 = comparer(PIEGES, 'Lucas dit : « la figure qui a le plus long tour a la plus grande aire ».'
              ' Quelle figure a la plus grande aire ?',
              'Le tour d\'une figure (son périmètre) et sa surface (son aire) sont deux choses'
              ' différentes : une figure longue et fine a un grand tour mais peu de place.',
              'Lucas se trompe : la figure au plus long tour a ici la plus petite aire.')
vs = [V1, V2, V3]
ecrire('01-comparer-des-aires', modele(
    'Comparer les aires de deux figures',
    'Deux figures sur quadrillage : aires nettement différentes ; même aire après découpage et'
    ' recollement ; la figure au plus long tour a la plus petite aire',
    1, vs,
    [spec('A (4 × 4) plus grande que B', 0, vs, {'j': 1}, ['0'], 'correct'),
     spec('Erreur : B choisie', 0, vs, {'j': 1}, ['1'], 'incorrect'),
     spec('Grande figure à droite : B', 0, vs, {'j': 2}, ['1'], 'correct'),
     spec('Erreur : « même aire » quand B est plus grande', 0, vs, {'j': 2}, ['2'], 'incorrect'),
     spec('6 × 2 et 3 × 4 : même aire', 1, vs, {'j': 1}, ['2'], 'correct'),
     spec('Erreur : la plus longue (A) choisie', 1, vs, {'j': 1}, ['0'], 'incorrect'),
     spec('3 × 3 contre 8 × 1 : A', 2, vs, {'j': 1}, ['0'], 'correct'),
     spec('Erreur : la plus longue figure (B) choisie', 2, vs, {'j': 1}, ['1'], 'incorrect'),
     spec('Bande fine à gauche : B', 2, vs, {'j': 6}, ['1'], 'correct')]))

# ======================================================================================
# 02. Aire en carreaux (CM1-087 / CM2-072)
# ======================================================================================

FEN1 = '0 ; 9 ; 0 ; 7'
FEN_U = '0 ; 13 ; 0 ; 7'


def une_forme(sommets, couleur='bleu'):
    w, h = taille(sommets)
    assert w <= 7 and h <= 5, sommets
    return forme('a', sommets, 1, 1, couleur)


def lignes_de(sommets):
    """Compte par lignes du bas vers le haut : « 4 + 4 + 2 »."""
    xs, ys = [p[0] for p in sommets], [p[1] for p in sommets]
    parts = []
    for cy in range(min(ys), max(ys)):
        n = sum(1 for cx in range(min(xs), max(xs))
                if dedans(cx + 0.5, cy + 0.5, sommets))
        parts.append(str(n))
    return ' + '.join(parts)


ENTIERS = [RECT(4, 3), L_5_4, U_10, ESC_10, CROIX, Z_10, ESC_15, F_13, T_7, U_13]
for s in ENTIERS:
    assert carreaux(s)[1] == 0 and 6 <= aire(s) <= 20, s
DEMIS = [MAISON, PARALL, TRAPEZE, TRIANGLE, LOSANGE, FLECHE, TOIT_PLAT]
for s in DEMIS:
    assert carreaux(s)[1] > 0 and aire(s) == int(aire(s)), s
DOMINOS = [s for s in ENTIERS if aire(s) % 2 == 0]
assert len(DOMINOS) >= 5, DOMINOS


def corrige_demis(formes, unite):
    ent = selon('j', [str(carreaux(s)[0]) for s in formes])
    dem = selon('j', [str(carreaux(s)[1]) for s in formes])
    moit = selon('j', [str(carreaux(s)[1] // 2) for s in formes])
    tot = selon('j', [compte(s) for s in formes])
    return ['On compte d\'abord les carreaux entiers : $' + ent + '$.',
            'Puis les demi-carreaux : $' + dem + '$. Deux demi-carreaux font un carreau entier :'
            ' $' + dem + '$ demi-carreaux font $' + moit + '$ ' + unite + '.',
            'Aire : $' + ent + ' + ' + moit + ' = ' + col(tot) + '$ ' + unite + '.']


V1 = variation(
    'Quelle est l\'aire de la figure, en carreaux ?'
    + figure(FEN1, 'Une figure coloriée sur un quadrillage.',
             selon('j', [une_forme(s) for s in ENTIERS]))
    + '\n\nL\'aire de la figure est de $?$ carreaux.',
    [var('j', f'1..{len(ENTIERS)}'), table('n', [aire(s) for s in ENTIERS])], ['{{n}}'],
    ['L\'unité est le carreau : on compte les carreaux recouverts par la figure.',
     'Ligne par ligne, du bas vers le haut : $' + selon('j', [lignes_de(s) for s in ENTIERS])
     + ' = ' + col(selon('j', [compte(s) for s in ENTIERS])) + '$ carreaux.'])
V2 = variation(
    'Quelle est l\'aire de la figure, en carreaux ?'
    + figure(FEN1, 'Une figure coloriée sur un quadrillage, avec des carreaux entiers et des'
             ' demi-carreaux.', selon('j', [une_forme(s, 'vert') for s in DEMIS]))
    + '\n\nL\'aire de la figure est de $?$ carreaux.',
    [var('j', f'1..{len(DEMIS)}'), table('n', [aire(s) for s in DEMIS])], ['{{n}}'],
    corrige_demis(DEMIS, 'carreaux'))
UNITE = ('u1 = point(10, 1, visible=faux)\nu2 = point(12, 1, visible=faux)\n'
         'u3 = point(12, 2, visible=faux)\nu4 = point(10, 2, visible=faux)\n'
         'polygone(u1, u2, u3, u4, couleur="noir", epaisseur=2, remplissage="orange",'
         ' opacite_fond=0.6)\ntexte(11, 2.6, "u")')
V3 = variation(
    'L\'unité d\'aire est le rectangle orange **u**. Quelle est l\'aire de la figure bleue, en'
    ' unités **u** ?'
    + figure(FEN_U, 'Une figure bleue sur un quadrillage, et à côté un rectangle orange de deux'
             ' carreaux, l\'unité u.', selon('j', [une_forme(s) + '\n' + UNITE for s in DOMINOS]))
    + '\n\nL\'aire de la figure est de $?$ unités **u**.',
    [var('j', f'1..{len(DOMINOS)}'), table('n', [aire(s) / 2 for s in DOMINOS])],
    ['{{n}}'],
    ['L\'unité **u** recouvre $2$ carreaux.',
     'La figure recouvre $' + selon('j', [compte(s) for s in DOMINOS]) + '$ carreaux.',
     'En unités **u** : $' + selon('j', [compte(s) for s in DOMINOS]) + ' \\div 2 = '
     + col(selon('j', [nombre(aire(s) / 2) for s in DOMINOS])) + '$ unités **u**.'])
vs = [V1, V2, V3]
ecrire('02-aire-en-carreaux', modele(
    'Aire en carreaux',
    'Compter les carreaux d\'une figure sur quadrillage : carreaux entiers ; avec des'
    ' demi-carreaux ; dans une unité fournie de deux carreaux',
    2, vs,
    [spec('Rectangle 4 × 3 : 12', 0, vs, {'j': 1}, ['12'], 'correct'),
     spec('Erreur : le tour compté (14)', 0, vs, {'j': 1}, ['14'], 'incorrect'),
     spec('L : 5 + 5 + 2 + 2 = 14', 0, vs, {'j': 2}, ['14'], 'correct'),
     spec('Maison : 8 entiers + 4 demis = 12', 1, vs, {'j': 1}, ['12'], 'correct'),
     spec('Erreur : demi-carreaux comptés entiers (14)', 1, vs, {'j': 1},
          ['14'], 'incorrect'),
     spec('Triangle : 6 entiers + 4 demis = 8', 1, vs, {'j': 4}, ['8'], 'correct'),
     spec('Erreur : triangle, demis oubliés (6)', 1, vs, {'j': 4}, ['6'], 'incorrect'),
     spec('Rectangle 4 × 3 en dominos : 6 u', 2, vs, {'j': 1}, ['6'], 'correct'),
     spec('Erreur : carreaux comptés (12)', 2, vs, {'j': 1}, ['12'], 'incorrect')]))

# ======================================================================================
# 03. Aire en centimètres carrés (CM1-088)
# ======================================================================================

CM_ENTIERS = [RECT(5, 3), RECT(3, 3), L_17, ESC_10, CROIX, U_13, Z_10, F_13]
for s in CM_ENTIERS:
    assert carreaux(s)[1] == 0, s
CM_DEMIS = [TRIANGLE, PARALL, LOSANGE, MAISON, FLECHE, TRAPEZE]
CM_PAIRES = [(RECT(4, 4), L_9), (U_13, RECT(2, 4)), (ESC_15, T_7), (CROIX, ESC_8),
             (L_5_4, U_10)]
for g, p in CM_PAIRES:
    assert aire(g) > aire(p)
CM2 = 'Chaque carreau du quadrillage est un carré de $1~\\unit{cm}$ de côté.'
UN_CM2 = ('Un carré de $1~\\unit{cm}$ de côté a une aire de $1~\\unit{cm^2}$ (un centimètre'
          ' carré) : chaque carreau vaut $1~\\unit{cm^2}$.')

V1 = variation(
    CM2 + ' Quelle est l\'aire de la figure ?'
    + figure(FEN1, 'Une figure coloriée sur un quadrillage de carreaux de 1 cm.',
             selon('j', [une_forme(s) for s in CM_ENTIERS]))
    + '\n\n$\\text{Aire} = ?~\\unit{cm^2}$',
    [var('j', f'1..{len(CM_ENTIERS)}'), table('n', [aire(s) for s in CM_ENTIERS])], ['{{n}}'],
    [UN_CM2, 'Ligne par ligne : $' + selon('j', [lignes_de(s) for s in CM_ENTIERS]) + ' = '
     + selon('j', [compte(s) for s in CM_ENTIERS]) + '$ carreaux.',
     'Aire : $' + col(selon('j', [compte(s) for s in CM_ENTIERS]) + '~\\unit{cm^2}') + '$.'])
V2 = variation(
    CM2 + ' Quelle est l\'aire de la figure ?'
    + figure(FEN1, 'Une figure coloriée sur un quadrillage de carreaux de 1 cm, avec des carreaux'
             ' entiers et des demi-carreaux.', selon('j', [une_forme(s, 'vert') for s in CM_DEMIS]))
    + '\n\n$\\text{Aire} = ?~\\unit{cm^2}$',
    [var('j', f'1..{len(CM_DEMIS)}'), table('n', [aire(s) for s in CM_DEMIS])], ['{{n}}'],
    [UN_CM2] + corrige_demis(CM_DEMIS, 'carreaux')
    + ['Aire : $' + col(selon('j', [compte(s) for s in CM_DEMIS]) + '~\\unit{cm^2}') + '$.'])
V3 = variation(
    CM2 + ' De combien de centimètres carrés l\'aire de la figure A dépasse-t-elle celle de la'
    ' figure B ?'
    + figure(FEN2, 'Deux figures coloriées sur un quadrillage de carreaux de 1 cm : A en haut, B en bas.',
             selon('j', [deux_formes(g, p) for g, p in CM_PAIRES]))
    + '\n\nL\'aire de A dépasse celle de B de $?~\\unit{cm^2}$.',
    [var('j', f'1..{len(CM_PAIRES)}'), table('n', [aire(g) - aire(p) for g, p in CM_PAIRES])],
    ['{{n}}'],
    [UN_CM2,
     'Aire de A : $' + selon('j', [compte(g) for g, p in CM_PAIRES]) + '~\\unit{cm^2}$ ; aire de'
     ' B : $' + selon('j', [compte(p) for g, p in CM_PAIRES]) + '~\\unit{cm^2}$.',
     'Écart : $' + selon('j', [compte(g) + ' - ' + compte(p) for g, p in CM_PAIRES]) + ' = '
     + col(selon('j', [nombre(aire(g) - aire(p)) for g, p in CM_PAIRES]) + '~\\unit{cm^2}')
     + '$.'])
vs = [V1, V2, V3]
ecrire('03-aire-en-cm2', modele(
    'Aire en centimètres carrés',
    'Aire d\'une figure sur un quadrillage de carreaux de 1 cm, en cm² : carreaux entiers ; avec'
    ' des demi-carreaux ; écart entre les aires de deux figures',
    1, vs,
    [spec('Rectangle 5 × 3 : 15 cm²', 0, vs, {'j': 1}, ['15'], 'correct'),
     spec('Erreur : le tour (16)', 0, vs, {'j': 1}, ['16'], 'incorrect'),
     spec('Triangle : 6 + 2 = 8 cm²', 1, vs, {'j': 1}, ['8'], 'correct'),
     spec('Erreur : demis comptés entiers (10)', 1, vs, {'j': 1}, ['10'], 'incorrect'),
     spec('16 − 9 = 7 cm²', 2, vs, {'j': 1}, ['7'], 'correct'),
     spec('Erreur : aire de A seule (16)', 2, vs, {'j': 1}, ['16'], 'incorrect')],
    grades=('CM1',)))

# ======================================================================================
# Angles : lettres et sommets
# ======================================================================================

LETTRES = [('A', 'B', 'C'), ('M', 'N', 'P'), ('R', 'S', 'T'), ('F', 'G', 'H')]
NK = len(LETTRES)


def lettre(n):
    """Lettre numéro n (0, 1, 2) du trio tiré par k."""
    return selon('k', [t[n] for t in LETTRES])


def lettre_v(d):
    """Lettre numéro (v + d) mod 3 : d = 0 donne le sommet, 1 et 2 les deux autres points."""
    return selon('v', [lettre((n + d) % 3) for n in range(3)], 0)


def bouts(n):
    """Les deux autres lettres que la n-ième, dans l'ordre alphabétique du trio."""
    return [m for m in range(3) if m != n]


# ======================================================================================
# 04. Sommet, côtés et nature d'un angle (CM1-089 / CM2-076)
# ======================================================================================

ANGLE_NOMME = ('\n'.join([
    lettre_v(0) + ' = point(0, 0)',
    lettre_v(1) + ' = point(' + lettre_v(0) + ', longueur={{m1}}, angle={{t}})',
    lettre_v(2) + ' = point(' + lettre_v(0) + ', longueur={{m2}}, angle=' + ev('t+a') + ')',
    'demidroite(' + lettre_v(0) + ', ' + lettre_v(1) + ', epaisseur=2)',
    'demidroite(' + lettre_v(0) + ', ' + lettre_v(2) + ', epaisseur=2)',
    'angle(' + lettre_v(1) + ', ' + lettre_v(0) + ', ' + lettre_v(2) + ', couleur="rouge", arcRadiusPx=35)']))
FEN_A = '-5 ; 5 ; -5 ; 5'
VARS_NOMME = [var('k', f'1..{NK}'), var('v', '0..2'), var('t', '0..330'), var('a', '40..140'),
              var('m1', '3..4'), var('m2', '3..4')]
COTES = ('Les côtés de l\'angle sont les deux demi-droites qui partent du sommet : $[' + lettre_v(0)
         + lettre_v(1) + ')$ et $[' + lettre_v(0) + lettre_v(2) + ')$.')

V1 = variation(
    'Quel est le sommet de cet angle ?'
    + figure(FEN_A, 'Un angle marqué en rouge, formé de deux demi-droites, et trois points nommés.',
             ANGLE_NOMME).replace('grille: 1', 'grille: non')
    + choix(['le point ' + lettre(n) for n in range(3)]),
    VARS_NOMME, ['{{v}}'],
    ['Le sommet d\'un angle est le point d\'où partent ses deux côtés.', COTES,
     'Le sommet est le point $' + col(lettre_v(0)) + '$.'])
V2 = variation(
    'Quels sont les côtés de cet angle ?'
    + figure(FEN_A, 'Un angle marqué en rouge, formé de deux demi-droites, et trois points nommés.',
             ANGLE_NOMME).replace('grille: 1', 'grille: non')
    + choix(['$[' + lettre(n) + lettre(bouts(n)[0]) + ')$ et $[' + lettre(n) + lettre(bouts(n)[1])
             + ')$' for n in range(3)]),
    VARS_NOMME, ['{{v}}'],
    ['Les deux côtés partent du sommet de l\'angle, le point $' + lettre_v(0) + '$.',
     'Ce sont les demi-droites $' + col('[' + lettre_v(0) + lettre_v(1) + ')') + '$ et $'
     + col('[' + lettre_v(0) + lettre_v(2) + ')') + '$.'])
ANGLE_NU = '\n'.join([
    'O = point(0, 0, visible=faux)',
    'X = point(O, longueur={{m1}}, angle={{t}}, visible=faux)',
    'Y = point(O, longueur={{m2}}, angle=' + ev('t+a') + ', visible=faux)',
    'segment(O, X, epaisseur=2)', 'segment(O, Y, epaisseur=2)',
    'angle(X, O, Y, couleur="rouge", arcRadiusPx=35)'])
V3 = variation(
    'Cet angle est-il aigu, droit ou obtus ?'
    + figure(FEN_A, 'Un angle marqué en rouge, sans quadrillage.', ANGLE_NU).replace(
        'grille: 1', 'grille: non')
    + choix(['L\'angle est aigu.', 'L\'angle est droit.', 'L\'angle est obtus.']),
    [var('c', '0..2'), var('d', '25..50'), var('a', 'eval:90+(c-1)*d'), var('t', '0..330'),
     var('m1', '2..4'), var('m2', '3..4')],
    ['{{c}}'],
    ['On pose le coin de l\'équerre sur le sommet, un bord le long d\'un côté.',
     '{{if:c==0|L\'autre côté reste à l\'intérieur du coin de l\'équerre : l\'angle est plus petit'
     ' qu\'un angle droit.|{{if:c==1|L\'autre côté suit exactement l\'autre bord de l\'équerre.|'
     'L\'autre côté passe à l\'extérieur du coin de l\'équerre : l\'angle est plus grand qu\'un'
     ' angle droit.}}}}',
     'L\'angle est $' + col('{{if:c==0|\\text{aigu}|{{if:c==1|\\text{droit}|\\text{obtus}}}}}')
     + '$.'])
vs = [V1, V2, V3]
ecrire('04-vocabulaire-des-angles', modele(
    "Sommet, côtés et nature d'un angle",
    'Nommer le sommet et les côtés d\'un angle ; dire s\'il est aigu, droit ou obtus (sans'
    ' quadrillage, côtés de longueurs différentes)',
    1, vs,
    [spec('Sommet B (trio A, B, C)', 0, vs,
          {'k': 1, 'v': 1, 't': 20, 'a': 70, 'm1': 3, 'm2': 4}, ['1'], 'correct'),
     spec('Erreur : un bout de côté (A)', 0, vs,
          {'k': 1, 'v': 1, 't': 20, 'a': 70, 'm1': 3, 'm2': 4}, ['0'], 'incorrect'),
     spec('Côtés [NM) et [NP)', 1, vs,
          {'k': 2, 'v': 1, 't': 200, 'a': 110, 'm1': 4, 'm2': 3}, ['1'], 'correct'),
     spec('Erreur : côtés partant de M', 1, vs,
          {'k': 2, 'v': 1, 't': 200, 'a': 110, 'm1': 4, 'm2': 3}, ['0'], 'incorrect'),
     spec('Angle de 60 : aigu', 2, vs, {'c': 0, 'd': 30, 't': 45, 'm1': 2, 'm2': 4}, ['0'],
          'correct'),
     spec('Angle droit, tourné', 2, vs, {'c': 1, 'd': 30, 't': 30, 'm1': 3, 'm2': 4}, ['1'],
          'correct'),
     spec('Erreur : angle obtus dit aigu', 2, vs, {'c': 2, 'd': 40, 't': 0, 'm1': 2, 'm2': 3},
          ['0'], 'incorrect')]))

# ======================================================================================
# 05. Noter un angle (CM1-090 / CM2-077)
# ======================================================================================

TRIANGLES = [[(-3, -2), (3, -2), (0, 3)], [(-3.5, -1.5), (3, -2.5), (1, 3)],
             [(-2.5, 2.5), (-3, -2.5), (3.5, -0.5)], [(-3.5, 1), (2, -3), (3, 3)]]
assert len(TRIANGLES) == NK


def place(p, tri):
    cx = sum(q[0] for q in tri) / 3
    cy = sum(q[1] for q in tri) / 3
    dx, dy = p[0] - cx, p[1] - cy
    v = 'haut' if dy > abs(dx) / 2 else 'bas' if dy < -abs(dx) / 2 else ''
    h = 'droite' if dx > abs(dy) / 2 else 'gauche' if dx < -abs(dy) / 2 else ''
    return (v + '-' + h).strip('-') or 'haut'


def chapeau(n, lettres):
    a, b = bouts(n)
    return '\\widehat{' + lettres[a] + lettres[n] + lettres[b] + '}'


def triangle(t, marques):
    """marques : liste de (sommet n, couleur) ; angle(P, S, Q) dessine l'angle saillant."""
    tri, lt = TRIANGLES[t], LETTRES[t]
    lignes = [f'{lt[n]} = point({tri[n][0]}, {tri[n][1]}, etiquette="{place(tri[n], tri)}")'
              for n in range(3)]
    lignes.append(f'polygone({lt[0]}, {lt[1]}, {lt[2]}, couleur="noir", epaisseur=2)')
    for n, couleur in marques:
        a, b = bouts(n)
        lignes.append(f'angle({lt[a]}, {lt[n]}, {lt[b]}, couleur="{couleur}",'
                      f' remplissage="{couleur}", arcRadiusPx=32)')
    return '\n'.join(lignes)


def marque_v(t, couleur='rouge'):
    return selon('v', [triangle(t, [(n, couleur)]) for n in range(3)], 0)


FEN_T = '-4.5 ; 4.5 ; -4 ; 4'
NOTE_V = selon('k', [selon('v', [chapeau(n, lt) for n in range(3)], 0) for lt in LETTRES])
CHAPEAU_SEUL = selon('k', [selon('v', ['\\widehat{' + lt[n] + '}' for n in range(3)], 0)
                           for lt in LETTRES])
REGLE = ('On note un angle avec trois lettres sous un chapeau : la lettre du **sommet** au'
         ' milieu, une lettre de chaque côté.')

V1 = variation(
    'Comment se note l\'angle marqué en rouge ?'
    + figure(FEN_T, 'Un triangle aux sommets nommés ; un de ses angles est marqué en rouge.',
             selon('k', [marque_v(t) for t in range(NK)])).replace('grille: 1', 'grille: non')
    + choix(['$' + selon('k', [chapeau(n, lt) for lt in LETTRES]) + '$' for n in range(3)]),
    [var('k', f'1..{NK}'), var('v', '0..2')], ['{{v}}'],
    [REGLE, 'Le sommet de l\'angle rouge est le point $' + lettre_v(0) + '$.',
     'L\'angle se note $' + col(NOTE_V) + '$ (ou $' + CHAPEAU_SEUL + '$, quand il n\'y a qu\'un'
     ' angle en ce point).'])
V2 = variation(
    'Quel est le sommet de l\'angle $' + NOTE_V + '$ ?'
    + figure(FEN_T, 'Un triangle aux sommets nommés.',
             selon('k', [triangle(t, []) for t in range(NK)])).replace('grille: 1', 'grille: non')
    + choix(['le point ' + lettre(n) for n in range(3)]),
    [var('k', f'1..{NK}'), var('v', '0..2')], ['{{v}}'],
    [REGLE, 'Dans $' + NOTE_V + '$, la lettre du milieu est $' + lettre_v(0) + '$.',
     'Le sommet est le point $' + col(lettre_v(0)) + '$.'])
COULEURS = ['bleu', 'rouge', 'vert']
V3 = variation(
    'Quel angle est l\'angle $' + NOTE_V + '$ ?'
    + figure(FEN_T, 'Un triangle aux sommets nommés ; ses trois angles sont marqués en bleu, en'
             ' rouge et en vert.',
             selon('k', [triangle(t, list(enumerate(COULEURS))) for t in range(NK)])).replace(
        'grille: 1', 'grille: non')
    + choix(['l\'angle ' + c for c in COULEURS]),
    [var('k', f'1..{NK}'), var('v', '0..2')], ['{{v}}'],
    [REGLE, 'Dans $' + NOTE_V + '$, la lettre du milieu est $' + lettre_v(0) + '$ : c\'est le'
     ' sommet.',
     'C\'est l\'angle ' + selon('v', ['**' + col_ + '**' for col_ in COULEURS], 0) + ', marqué'
     ' au point $' + col(lettre_v(0)) + '$.'])
vs = [V1, V2, V3]
ecrire('05-noter-un-angle', modele(
    'Noter un angle',
    'Notation à chapeau dans un triangle : noter l\'angle marqué ; trouver le sommet d\'un angle'
    ' noté ; retrouver l\'angle noté parmi trois angles de couleur',
    2, vs,
    [spec('Angle en B : ABC', 0, vs, {'k': 1, 'v': 1}, ['1'], 'correct'),
     spec('Erreur : BAC (sommet en tête)', 0, vs, {'k': 1, 'v': 1}, ['0'], 'incorrect'),
     spec('MNP : sommet N', 1, vs, {'k': 2, 'v': 1}, ['1'], 'correct'),
     spec('Erreur : première lettre (M)', 1, vs, {'k': 2, 'v': 1}, ['0'], 'incorrect'),
     spec('RTS : angle vert (en T)', 2, vs, {'k': 3, 'v': 2}, ['2'], 'correct'),
     spec('Erreur : angle en R (bleu)', 2, vs, {'k': 3, 'v': 2}, ['0'], 'incorrect')]))

# ======================================================================================
# 06. Comparer des angles (CM1-091 / CM2-078)
# ======================================================================================


def angle_dessine(p, sommet, longueur, ouverture, orient, couleur):
    """Un angle de sommet `sommet` (x, y), côtés de longueur donnée, ouverture et orientation
    données en expressions."""
    x, y = sommet
    return '\n'.join([
        f'{p}0 = point({x}, {y}, visible=faux)',
        f'{p}1 = point({p}0, longueur={longueur}, angle={orient}, visible=faux)',
        f'{p}2 = point({p}0, longueur={longueur}, angle={ev(orient.strip("{}") + "+" + ouverture)},'
        ' visible=faux)',
        f'segment({p}0, {p}1, epaisseur=2, couleur="{couleur}")',
        f'segment({p}0, {p}2, epaisseur=2, couleur="{couleur}")',
        f'angle({p}1, {p}0, {p}2, couleur="{couleur}", arcRadiusPx=30)'])


FEN_C = '-4.5 ; 5 ; -0.8 ; 10.5'
# c = 0 : le bleu est le plus grand ; c = 1 : le rouge ; c = 2 : égaux. Le plus grand angle a les
# côtés les plus courts (piège) ; égaux : côtés de longueurs différentes.
VARS_C = [var('c', '0..2'), var('p', '30..60'), var('g', '25..45'),
          var('zb', 'eval:1-min(c,1)'), var('zr', 'eval:1-min(abs(c-1),1)'),
          var('ab', 'eval:p+g*zb'), var('ar', 'eval:p+g*zr'),
          var('lb', 'eval:2+2*(1-zb)'), var('lr', 'eval:2+2*zb'),
          var('tb', '0..40'), var('tr', '0..40')]
V1 = variation(
    'Quel angle est le plus grand ?'
    + figure(FEN_C, 'Un angle bleu en haut et un angle rouge en bas, aux côtés de longueurs différentes.',
             angle_dessine('b', (0, 6), '{{lb}}', 'ab', '{{tb}}', 'bleu') + '\n'
             + angle_dessine('r', (0, 0), '{{lr}}', 'ar', '{{tr}}', 'rouge')).replace(
        'grille: 1', 'grille: non')
    + choix(['L\'angle bleu est le plus grand.', 'L\'angle rouge est le plus grand.',
             'Les deux angles sont égaux.']),
    VARS_C, ['{{c}}'],
    ['Un angle est plus grand quand il est plus **ouvert** : la longueur des côtés ne compte'
     ' pas.',
     'On décalque un angle et on pose le calque sur l\'autre, sommet sur sommet, un côté sur un'
     ' côté.',
     '{{if:c==2|Les deux autres côtés se superposent : $' + col('\\text{les angles sont égaux}')
     + '$, même si leurs côtés n\'ont pas la même longueur.|L\'angle $' + col(
         '{{if:c==0|\\text{bleu}|\\text{rouge}}}') + '$ est le plus ouvert : c\'est le plus'
     ' grand, même si ses côtés sont plus courts.}}'])
V2 = variation(
    'Voici un angle droit (en noir) et un angle rouge. Compare l\'angle rouge à l\'angle droit.'
    + figure(FEN_C, 'En haut, un angle droit noir codé par un petit carré ; en bas, un angle rouge.',
             '\n'.join(['q0 = point(0, 6, visible=faux)', 'q1 = point(3, 6, visible=faux)',
                        'q2 = point(0, 9, visible=faux)', 'segment(q0, q1, epaisseur=2)',
                        'segment(q0, q2, epaisseur=2)',
                        'angle(q1, q0, q2, marque="carre", couleur="noir")'])
             + '\n' + angle_dessine('r', (0, 0), '{{l}}', 'a', '{{t}}', 'rouge')).replace(
        'grille: 1', 'grille: non')
    + choix(['L\'angle rouge est plus petit que l\'angle droit.',
             'L\'angle rouge est aussi grand que l\'angle droit.',
             'L\'angle rouge est plus grand que l\'angle droit.']),
    [var('c', '0..2'), var('d', '20..45'), var('a', 'eval:90+(c-1)*d'), var('t', '0..40'),
     var('l', '3..4')],
    ['{{c}}'],
    ['On compare avec un gabarit de l\'angle droit, par exemple le coin de l\'équerre, posé sur'
     ' le sommet de l\'angle rouge, un bord le long d\'un côté.',
     'L\'angle rouge est $' + col('{{if:c==0|\\text{plus petit}|{{if:c==1|\\text{aussi grand}|'
                                  '\\text{plus grand}}}}}') + '$ que l\'angle droit{{if:c==0| :'
     ' il est aigu.|{{if:c==1| : c\'est un angle droit.| : il est obtus.}}}}'])
# Trois angles : o0 < o1 < o2 ; w (0 à 5) dit l'ordre des couleurs du plus petit au plus grand.
ORDRES = [(0, 1, 2), (0, 2, 1), (1, 0, 2), (1, 2, 0), (2, 0, 1), (2, 1, 0)]
NOMS = ['bleu', 'rouge', 'vert']


def ouverture(couleur):
    """Variable `a<n>` : ouverture de la couleur n° n, o<rang> pour l'ordre w (indicatrices,
    `eval:` ne connaît pas `==`)."""
    return var('a' + str(couleur), 'eval:' + '+'.join(
        f'(1-min(abs(w-{m}),1))*o{o.index(couleur)}' for m, o in enumerate(ORDRES)))


V3 = variation(
    'Range les trois angles du plus petit au plus grand.'
    + figure('-3 ; 4 ; -0.8 ; 11.5', 'Trois angles, bleu, rouge et vert, l\'un au-dessus de'
             ' l\'autre.',
             '\n'.join(angle_dessine('abc'[n], (0, 8 - 4 * n), '{{l' + str(n) + '}}',
                                     'a' + str(n), '{{t' + str(n) + '}}', NOMS[n])
                       for n in range(3))).replace('grille: 1', 'grille: non')
    + choix([' < '.join(NOMS[n] for n in o) for o in ORDRES]),
    [var('w', '0..5'), var('o0', '25..40'), var('o1', 'eval:o0+30'), var('o2', 'eval:o1+30'),
     var('l0', '2..3'), var('l1', '2..3'), var('l2', '2..3'), var('t0', '0..30'),
     var('t1', '0..30'), var('t2', '0..30')] + [ouverture(n) for n in range(3)],
    ['{{w}}'],
    ['On compare les ouvertures deux à deux, avec un calque ou un gabarit : la longueur des'
     ' côtés ne compte pas.',
     'Du plus petit au plus grand : $' + col(selon('w', ['\\text{' + ' < '.join(NOMS[n] for n in o)
                                                         + '}' for o in ORDRES], 0)) + '$.'])
vs = [V1, V2, V3]
ecrire('06-comparer-des-angles', modele(
    'Comparer des angles',
    'Comparer deux angles sans mesure (le plus ouvert a les côtés les plus courts) ; comparer à'
    ' l\'angle droit ; ranger trois angles',
    1, vs,
    [spec('Bleu plus grand, côtés courts', 0, vs,
          {'c': 0, 'p': 40, 'g': 35, 'tb': 10, 'tr': 20}, ['0'], 'correct'),
     spec('Erreur : le rouge, aux côtés longs', 0, vs,
          {'c': 0, 'p': 40, 'g': 35, 'tb': 10, 'tr': 20}, ['1'], 'incorrect'),
     spec('Égaux, côtés différents', 0, vs, {'c': 2, 'p': 50, 'g': 30, 'tb': 0, 'tr': 30},
          ['2'], 'correct'),
     spec('Erreur : égaux dits différents', 0, vs, {'c': 2, 'p': 50, 'g': 30, 'tb': 0, 'tr': 30},
          ['1'], 'incorrect'),
     spec('Rouge plus grand qu\'un droit', 1, vs, {'c': 2, 'd': 30, 't': 10, 'l': 4}, ['2'],
          'correct'),
     spec('Rouge droit', 1, vs, {'c': 1, 'd': 30, 't': 25, 'l': 3}, ['1'], 'correct'),
     spec('Erreur : aigu dit plus grand', 1, vs, {'c': 0, 'd': 30, 't': 10, 'l': 4}, ['2'],
          'incorrect'),
     spec('Ordre rouge < bleu < vert', 2, vs,
          {'w': 2, 'o0': 30, 'l0': 2, 'l1': 3, 'l2': 2, 't0': 0, 't1': 10, 't2': 20}, ['2'],
          'correct'),
     spec('Erreur : ordre inverse', 2, vs,
          {'w': 2, 'o0': 30, 'l0': 2, 'l1': 3, 'l2': 2, 't0': 0, 't1': 10, 't2': 20}, ['4'],
          'incorrect')],
    delay=120))

# ============================================================================

os.makedirs(DOSSIER, exist_ok=True)
for nom, mod in MODELES.items():
    with open(os.path.join(DOSSIER, nom + '.json'), 'w', encoding='utf-8') as f:
        json.dump(mod, f, ensure_ascii=False, indent='\t')
        f.write('\n')
print(f'{len(MODELES)} modèles écrits dans {DOSSIER}')
