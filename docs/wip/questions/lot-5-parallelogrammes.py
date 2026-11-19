"""Écrit les 7 modèles du lot 14 « Parallélogrammes » de la 5e dans
scripts/questions/5-parallelogrammes/.

Phase 0 validée par David le 2026-11-15 (§ 29 et 29 bis du journal `docs/wip/questions-5-progress.md`).
Bornes : `cycle4.json`, 5e (5-071 : rectangle = parallélogramme ayant un angle droit ; losange = deux
côtés consécutifs égaux ; carré = rectangle et losange). Le nœud et le tag sont posés par la migration
de rangement, après le `--publier` de David.

Décisions et pièges :
- « on ne peut pas savoir » est la bonne réponse d'une variation piège de 03 et 05 : seuls les codages
  comptent, jamais l'œil ;
- 06 : quadrillage (v1), puis papier uni aux instruments (v2, palette par défaut du point) ;
- 07 : par les diagonales seulement (les côtés sont le 06) ;
- bonne réponse d'un choix toujours par une variable ou une constante de rang écrit ; les choix sont
  mélangés à l'affichage (sauf oui / non), le corrigé nomme la bonne réponse, jamais son rang.

    python3 docs/wip/questions/lot-5-parallelogrammes.py scripts/questions
"""
import json
import math
import os
import subprocess
import sys

RACINE = sys.argv[1]
DOSSIER = os.path.join(RACINE, '5-parallelogrammes')


def spec(desc, vi, variables, answers, status):
    return {'description': desc, 'variationIndex': vi,
            'variables': {k: str(v) for k, v in variables.items()},
            'answers': answers if isinstance(answers, list) else [answers],
            'expected': {'status': status}}


def modele(nom, title, description, level, variations, specs, delay=60):
    m = {'title': title, 'description': description, 'grades': ['5'], 'level': level,
         'delay': delay, 'status': 'draft', 'variations': variations, 'testSpecs': specs}
    return nom, m


def var(nom, expression):
    return {'name': nom, 'expression': expression}


def variation(statement, variables, answers, steps):
    v = {'statement': statement, 'variables': variables}
    if answers:
        v['blanks'] = [{'expectedAnswer': a} for a in answers]
    v['correction'] = {'steps': steps}
    return v


def col(x, k=0):
    return '\\textcolor{{{color:primary.' + str(k) + '}}}{' + x + '}'


def colt(x):
    """Mot coloré dans une phrase (hors des $…$)."""
    return '$' + col('\\text{' + x + '}') + '$'


def choix(lignes, melanger=True):
    tete = '' if melanger else 'melanger: non\n'
    return '\n\n```choix\n' + tete + ''.join('- ' + l + '\n' for l in lignes) + '```'


def si(cond, oui, non):
    return '{{if:' + cond + '|' + oui + '|' + non + '}}'


def selon(v, textes):
    """Texte selon v ∈ {1, …, n}."""
    if len(textes) == 1:
        return textes[0]
    return si(v + '==1', textes[0], selon_suite(v, textes[1:], 2))


def selon_suite(v, textes, i):
    if len(textes) == 1:
        return textes[0]
    return si(v + '==' + str(i), textes[0], selon_suite(v, textes[1:], i + 1))


def figure(fenetre, description, lignes):
    return ('\n\n```figure\nfenetre: ' + fenetre + '\ndescription: ' + description + '\n---\n'
            + '\n'.join(lignes) + '\n```\n\n')


def a_completer(fenetre, verifier, lignes, tete=None):
    return ('\n\n```figure-a-completer\nfenetre: ' + fenetre + '\n'
            + ''.join(t + '\n' for t in (tete or []))
            + ''.join('verifier: ' + v + '\n' for v in verifier)
            + '---\n' + '\n'.join(lignes) + '\n```')


# --- Géométrie ---------------------------------------------------------------------------------

def n(x):
    """Nombre écrit dans une figure ou une réponse : 3 décimales au plus, sans « -0 »."""
    x = round(x + 0.0, 3)
    if abs(x - round(x)) < 1e-9:
        return str(int(round(x)))
    return repr(x)


def etiq(v, centre):
    """Étiquette d'un sommet, à l'opposé du centre de la figure."""
    dx, dy = v[0] - centre[0], v[1] - centre[1]
    h = 'haut' if dy > 0.3 else ('bas' if dy < -0.3 else '')
    l = 'droite' if dx > 0.3 else ('gauche' if dx < -0.3 else '')
    return '-'.join(x for x in (h, l) if x) or 'haut'


def pt(nom, p, centre=None, visible=True):
    args = n(p[0]) + ', ' + n(p[1])
    if centre is not None:
        args += ', etiquette="' + etiq(p, centre) + '"'
    if not visible:
        args += ', visible=faux'
    return nom + ' = point(' + args + ')'


def milieu(p, q):
    return ((p[0] + q[0]) / 2, (p[1] + q[1]) / 2)


def plus(p, q, r):
    """p + q − r."""
    return (p[0] + q[0] - r[0], p[1] + q[1] - r[1])


def centre_de(points):
    return (sum(p[0] for p in points) / len(points), sum(p[1] for p in points) / len(points))


def quadri(sommets, diagonales=False, centre_o=False):
    """Lignes d'un quadrilatère ABCD (sommets dans l'ordre), diagonales et O en option."""
    g = centre_de(sommets)
    lignes = [pt(nm, p, g) for nm, p in zip('ABCD', sommets)]
    lignes.append('polygone(A, B, C, D)')
    if diagonales:
        lignes += ['segment(A, C)', 'segment(B, D)']
    if centre_o:
        o = milieu(sommets[0], sommets[2])
        lignes.append('O = point(' + n(o[0]) + ', ' + n(o[1]) + ', etiquette="haut")')
    return lignes


def parallelogramme(a, b, d):
    return [a, b, plus(b, d, a), d]


def fen(points, marge=1.0):
    xs, ys = [p[0] for p in points], [p[1] for p in points]
    return (n(min(xs) - marge) + ' ; ' + n(max(xs) + marge) + ' ; ' + n(min(ys) - marge) + ' ; '
            + n(max(ys) + marge))


# Formes de référence (A en bas à gauche, sens direct)
PARA = [parallelogramme((0, 0), (5, 0), (1.6, 3)),
        parallelogramme((0, 0), (5.5, 0.8), (-1.4, 3.2)),
        parallelogramme((0, 0), (5.2, -0.6), (2.2, 3.4))]
RECT = parallelogramme((0, 0), (5, 1), (-0.6, 3))      # AB·AD = −3 + 3 = 0
LOS = [(0, 0), (2.5, -1.6), (5, 0), (2.5, 1.6)]        # diagonales perpendiculaires
CARRE = parallelogramme((0, 0), (3.6, 1), (-1, 3.6))
TRAPEZE = [(0, 0), (6, 0), (4.6, 3), (1.4, 3)]         # isocèle : AD = BC, AC = BD


def verifie_formes():
    def dist(p, q):
        return math.hypot(p[0] - q[0], p[1] - q[1])

    def scal(u, v):
        return u[0] * v[0] + u[1] * v[1]
    a, b, c, d = RECT
    assert abs(scal((b[0] - a[0], b[1] - a[1]), (d[0] - a[0], d[1] - a[1]))) < 1e-9
    a, b, c, d = LOS
    assert abs(dist(a, b) - dist(b, c)) < 1e-9 and abs(dist(b, c) - dist(c, d)) < 1e-9
    a, b, c, d = CARRE
    assert abs(dist(a, b) - dist(a, d)) < 1e-9
    assert abs(scal((b[0] - a[0], b[1] - a[1]), (d[0] - a[0], d[1] - a[1]))) < 1e-9
    a, b, c, d = TRAPEZE
    assert abs(dist(a, d) - dist(b, c)) < 1e-9 and abs(dist(a, c) - dist(b, d)) < 1e-9
    assert abs(dist(a, b) - dist(c, d)) > 1
    for p in PARA:
        a, b, c, d = p
        assert abs(scal((b[0] - a[0], b[1] - a[1]), (d[0] - a[0], d[1] - a[1]))) > 1
        assert abs(dist(a, b) - dist(a, d)) > 0.8


verifie_formes()


def fig_quadri(sommets, description, extra=(), diagonales=False, centre_o=False):
    return figure(fen(sommets), description, quadri(sommets, diagonales, centre_o) + list(extra))


MODELES = []

# --- 1. 5-067 : définir le parallélogramme ------------------------------------------------------

DEF_PARA = ('**Définition.** Un parallélogramme est un quadrilatère dont les côtés opposés sont'
            ' **parallèles deux à deux** : $(AB) \\parallel (DC)$ et $(AD) \\parallel (BC)$.')

MODELES.append(modele(
    '01-definir-le-parallelogramme', 'Définir le parallélogramme',
    'Reconnaître la définition du parallélogramme : un quadrilatère dont les côtés opposés sont'
    ' parallèles deux à deux',
    1,
    [variation('Un parallélogramme est un quadrilatère :'
               + choix(['dont les côtés opposés sont parallèles deux à deux',
                        'qui a deux côtés opposés parallèles',
                        'qui a quatre côtés de même longueur',
                        'qui a quatre angles droits']),
               [], ['0'],
               [DEF_PARA,
                'Avoir seulement **deux** côtés parallèles ne suffit pas (c\'est un trapèze). Quatre'
                ' côtés de même longueur, c\'est un losange ; quatre angles droits, un rectangle : ce'
                ' sont des parallélogrammes **particuliers**.',
                'La définition est donc : ' + colt('les côtés opposés sont parallèles deux à deux')
                + '.']),
     variation('On sait que $(AB) \\parallel (DC)$ et que $(AD) \\parallel (BC)$.'
               + figure(fen(sum(PARA, [])), 'Un quadrilatère ABCD penché, sans codage.',
                        [selon('k', ['\n'.join(quadri(PARA[i])) for i in range(3)])])
               + 'Le quadrilatère $ABCD$ est :'
               + choix(['un parallélogramme', 'un rectangle', 'un losange',
                        'on ne peut pas savoir']),
               [var('k', '1..3')], ['0'],
               ['Les côtés opposés de $ABCD$ sont parallèles deux à deux.',
                DEF_PARA,
                '$ABCD$ est donc ' + colt('un parallélogramme')
                + '. Rien ne dit qu\'il a un angle droit ou deux côtés consécutifs de même longueur :'
                ' on ne peut pas dire rectangle ni losange.'])],
    [spec('Définition', 0, {}, '0', 'correct'),
     spec('Erreur : deux côtés parallèles (trapèze)', 0, {}, '1', 'incorrect'),
     spec('Erreur : quatre côtés égaux', 0, {}, '2', 'incorrect'),
     spec('Côtés parallèles deux à deux : parallélogramme', 1, {'k': 1}, '0', 'correct'),
     spec('Erreur : rectangle', 1, {'k': 2}, '1', 'incorrect'),
     spec('Erreur : on ne peut pas savoir', 1, {'k': 3}, '3', 'incorrect')],
    delay=45))

# --- 2. 5-069 : côtés opposés et diagonales ---------------------------------------------------------

MODELES.append(modele(
    '02-cotes-et-diagonales-du-parallelogramme',
    'Côtés opposés et diagonales d\'un parallélogramme',
    'Dans un parallélogramme, les côtés opposés ont la même longueur et les diagonales se coupent en'
    ' leur milieu',
    2,
    [variation('$ABCD$ est un parallélogramme avec $AB = {{a}}$ cm et $AD = {{b}}$ cm.'
               + fig_quadri(PARA[0], 'Un parallélogramme ABCD.')
               + 'Combien mesure $CD$ ?\n\n$CD = ?$ cm',
               [var('a', '3..9'), var('w', '1..3'), var('b', 'eval:a-w')], ['{{a}}'],
               ['**Propriété.** Dans un parallélogramme, les **côtés opposés** ont la même'
                ' longueur.',
                '$[CD]$ est le côté opposé à $[AB]$ (et non à $[AD]$) : $CD = AB = '
                + col('{{a}}') + '$ cm.']),
     variation('$ABCD$ est un parallélogramme ; ses diagonales se coupent en $O$. On sait que'
               ' $AC = {{c}}$ cm et $BD = {{d}}$ cm.'
               + fig_quadri(PARA[1], 'Un parallélogramme ABCD et ses diagonales, qui se coupent'
                            ' en O.', diagonales=True, centre_o=True)
               + 'Combien mesure $AO$ ?\n\n$AO = ?$ cm',
               [var('m', '3..8'), var('c', 'eval:2*m'), var('p', '2..5'),
                var('d', 'eval:2*p+1')], ['{{m}}'],
               ['**Propriété.** Les diagonales d\'un parallélogramme **se coupent en leur'
                ' milieu** : $O$ est le milieu de $[AC]$.',
                '$AO = \\dfrac{AC}{2} = \\dfrac{ {{c}} }{2} = ' + col('{{m}}') + '$ cm.']),
     variation('Les diagonales d\'un parallélogramme :'
               + choix(['se coupent en leur milieu', 'ont la même longueur',
                        'sont perpendiculaires']),
               [], ['0'],
               ['Les diagonales d\'un parallélogramme ' + colt('se coupent en leur milieu') + '.',
                'Même longueur : c\'est le cas du **rectangle** ; perpendiculaires : du **losange**.'
                ' Un parallélogramme quelconque n\'a ni l\'un ni l\'autre.'])],
    [spec('CD = AB = 7', 0, {'a': 7, 'w': 2, 'b': 5}, '7', 'correct'),
     spec('Erreur : CD = AD', 0, {'a': 7, 'w': 2, 'b': 5}, '5', 'incorrect'),
     spec('AO = 6', 1, {'m': 6, 'c': 12, 'p': 3, 'd': 7}, '6', 'correct'),
     spec('Erreur : AO = AC', 1, {'m': 6, 'c': 12, 'p': 3, 'd': 7}, '12', 'incorrect'),
     spec('Erreur : AO = BD / 2', 1, {'m': 6, 'c': 12, 'p': 3, 'd': 7}, '3.5', 'incorrect'),
     spec('Se coupent en leur milieu', 2, {}, '0', 'correct'),
     spec('Erreur : même longueur', 2, {}, '1', 'incorrect')],
    delay=60))

# --- 3. 5-070 : est-ce un parallélogramme ? ----------------------------------------------------------

AVERT = 'On ne se fie qu\'aux **codages**, jamais à l\'œil.'

DIAG_MILIEU = ['marque_segment(A, O)', 'marque_segment(O, C)', 'marque_segment(B, O, traits=2)',
               'marque_segment(O, D, traits=2)']
COTES_EGAUX = ['marque_segment(A, B)', 'marque_segment(D, C)', 'marque_segment(A, D, traits=2)',
               'marque_segment(B, C, traits=2)']

MODELES.append(modele(
    '03-est-ce-un-parallelogramme', 'Est-ce un parallélogramme ?',
    'Reconnaître un parallélogramme à ses diagonales qui se coupent en leur milieu, ou à ses côtés'
    ' opposés de même longueur ; une seule égalité ne suffit pas',
    3,
    [variation('Les diagonales du quadrilatère $ABCD$ se coupent en $O$. ' + AVERT
               + figure(fen(sum(PARA, [])), 'Un quadrilatère ABCD et ses diagonales ; OA = OC (un trait),'
                        ' OB = OD (deux traits).',
                        [selon('k', ['\n'.join(quadri(PARA[i], True, True)) for i in range(3)])]
                        + DIAG_MILIEU)
               + '$ABCD$ est-il un parallélogramme ?'
               + choix(['oui', 'on ne peut pas savoir'], melanger=False),
               [var('k', '1..3')], ['0'],
               ['Les codages disent $OA = OC$ et $OB = OD$ : les diagonales se coupent en leur'
                ' milieu $O$.',
                '**Propriété.** Si les diagonales d\'un quadrilatère se coupent en leur milieu, alors'
                ' c\'est un parallélogramme.',
                'Donc ' + colt('oui') + ', $ABCD$ est un parallélogramme.']),
     variation('Voici un quadrilatère $ABCD$ non croisé. ' + AVERT
               + figure(fen(sum(PARA, [])), 'Un quadrilatère ABCD ; AB = DC (un trait), AD = BC (deux'
                        ' traits).',
                        [selon('k', ['\n'.join(quadri(PARA[i])) for i in range(3)])] + COTES_EGAUX)
               + '$ABCD$ est-il un parallélogramme ?'
               + choix(['oui', 'on ne peut pas savoir'], melanger=False),
               [var('k', '1..3')], ['0'],
               ['Les codages disent $AB = DC$ et $AD = BC$ : les côtés opposés ont deux à deux la'
                ' même longueur.',
                '**Propriété.** Si un quadrilatère non croisé a ses côtés opposés de même longueur'
                ' deux à deux, alors c\'est un parallélogramme.',
                'Donc ' + colt('oui') + ', $ABCD$ est un parallélogramme.']),
     variation(si('k==1', 'Voici un quadrilatère $ABCD$ non croisé.',
                  'Les diagonales du quadrilatère $ABCD$ se coupent en $O$.') + ' ' + AVERT
               + figure(fen(TRAPEZE), 'Un quadrilatère ABCD ; '
                        + si('k==1', 'seuls AD et BC sont codés de même longueur.',
                             'seules les diagonales AC et BD sont codées de même longueur.'),
                        ['\n'.join(quadri(TRAPEZE)),
                         si('k==1', 'marque_segment(A, D)\nmarque_segment(B, C)',
                            'segment(A, C)\nsegment(B, D)\nmarque_segment(A, C)\n'
                            'marque_segment(B, D)')])
               + '$ABCD$ est-il un parallélogramme ?'
               + choix(['oui', 'on ne peut pas savoir'], melanger=False),
               [var('k', '1..2')], ['1'],
               [si('k==1',
                   'Une **seule** paire de côtés opposés est codée de même longueur : $AD = BC$.'
                   ' Rien n\'est dit sur $[AB]$ et $[DC]$.',
                   'Les diagonales ont la même longueur, mais rien ne dit qu\'elles se coupent en'
                   ' leur **milieu**.'),
                'Les propriétés du parallélogramme demandent **deux** paires de côtés opposés de'
                ' même longueur, ou des diagonales qui se coupent en leur milieu.',
                'Avec ces seuls codages, ' + colt('on ne peut pas savoir')
                + ' : un trapèze isocèle a ces mêmes codages sans être un parallélogramme.'])],
    [spec('Diagonales de même milieu : oui', 0, {'k': 1}, '0', 'correct'),
     spec('Erreur : on ne peut pas savoir (propriété ignorée)', 0, {'k': 2}, '1', 'incorrect'),
     spec('Côtés opposés égaux : oui', 1, {'k': 3}, '0', 'correct'),
     spec('Erreur : on ne peut pas savoir', 1, {'k': 1}, '1', 'incorrect'),
     spec('Une seule paire : on ne peut pas savoir', 2, {'k': 1}, '1', 'correct'),
     spec('Erreur : oui avec une seule paire', 2, {'k': 1}, '0', 'incorrect'),
     spec('Diagonales égales seulement : on ne peut pas savoir', 2, {'k': 2}, '1', 'correct'),
     spec('Erreur : oui avec des diagonales égales', 2, {'k': 2}, '0', 'incorrect')],
    delay=60))

# --- 4. 5-071 : rectangle, losange, carré : définitions --------------------------------------------

FIGS = ['rectangle', 'losange', 'carré']
CHOIX_DEF = ['un angle droit', 'deux côtés consécutifs de même longueur',
             'un angle droit et deux côtés consécutifs de même longueur',
             'des diagonales qui se coupent en leur milieu']

MODELES.append(modele(
    '04-rectangle-losange-carre-definitions', 'Rectangle, losange, carré : définitions',
    'Définir le rectangle, le losange et le carré comme des parallélogrammes particuliers',
    4,
    [variation('Un **' + selon('k', FIGS) + '** est un parallélogramme qui a :' + choix(CHOIX_DEF),
               [var('k', '1..3'), var('j', 'eval:k-1')], ['{{j}}'],
               ['**Définitions.** Un **rectangle** est un parallélogramme qui a un angle droit. Un'
                ' **losange** est un parallélogramme qui a deux côtés consécutifs de même longueur.'
                ' Un **carré** est à la fois un rectangle et un losange.',
                'Un ' + selon('k', FIGS) + ' est donc un parallélogramme qui a '
                + selon('k', [colt(c) for c in CHOIX_DEF[:3]]) + '.',
                'Les diagonales qui se coupent en leur milieu : **tout** parallélogramme les a, ce'
                ' n\'est pas ce qui le rend particulier.'])],
    [spec('Rectangle : un angle droit', 0, {'k': 1, 'j': 0}, '0', 'correct'),
     spec('Erreur : rectangle, deux côtés consécutifs égaux', 0, {'k': 1, 'j': 0}, '1',
          'incorrect'),
     spec('Losange : deux côtés consécutifs égaux', 0, {'k': 2, 'j': 1}, '1', 'correct'),
     spec('Erreur : losange, diagonales de même milieu', 0, {'k': 2, 'j': 1}, '3', 'incorrect'),
     spec('Carré : les deux', 0, {'k': 3, 'j': 2}, '2', 'correct'),
     spec('Erreur : carré, un angle droit seulement', 0, {'k': 3, 'j': 2}, '0', 'incorrect')],
    delay=45))

# --- 5. 5-072 : rectangle, losange, carré : propriétés ---------------------------------------------

DIAG_EGALES = ['marque_segment(A, O)', 'marque_segment(O, C)', 'marque_segment(B, O)',
               'marque_segment(O, D)']
ANGLE_O = 'angle(A, O, B, marque="carre")'
FORMES_05 = [RECT, LOS, CARRE, PARA[2]]
CODAGES_05 = ['\n'.join(DIAG_EGALES), '\n'.join(DIAG_MILIEU + [ANGLE_O]),
              '\n'.join(DIAG_EGALES + [ANGLE_O]), '\n'.join(DIAG_MILIEU)]
NATURES = ['un rectangle', 'un losange', 'un carré',
           'on ne peut pas savoir s\'il est rectangle, losange ou carré']

MODELES.append(modele(
    '05-rectangle-losange-carre-proprietes', 'Rectangle, losange, carré : propriétés',
    'Reconnaître un rectangle, un losange ou un carré à ses diagonales ; propriétés des diagonales',
    5,
    [variation('$ABCD$ est un **parallélogramme** ; ses diagonales se coupent en $O$. ' + AVERT
               + figure(fen(sum(FORMES_05, [])), 'Un parallélogramme ABCD et ses diagonales, codées.',
                        [selon('k', ['\n'.join(quadri(FORMES_05[i], True, True)) + '\n'
                                     + CODAGES_05[i] for i in range(4)])])
               + 'Quelle est la nature la plus précise de $ABCD$ ?' + choix(NATURES),
               [var('k', '1..4'), var('j', 'eval:k-1')], ['{{j}}'],
               [selon('k', [
                   'Les codages disent $OA = OB = OC = OD$ : les diagonales ont la **même'
                   ' longueur**.',
                   'Les diagonales se coupent en leur milieu et sont **perpendiculaires** (angle'
                   ' droit en $O$).',
                   'Les diagonales ont la **même longueur** et sont **perpendiculaires**.',
                   'Les diagonales se coupent en leur milieu, c\'est tout : ni même longueur, ni angle'
                   ' droit codé.']),
                '**Propriétés.** Un parallélogramme dont les diagonales ont la même longueur est un'
                ' rectangle ; dont les diagonales sont perpendiculaires, un losange ; les deux, un'
                ' carré.',
                selon('k', ['$ABCD$ est ' + colt('un rectangle') + '.',
                            '$ABCD$ est ' + colt('un losange') + '.',
                            '$ABCD$ est ' + colt('un carré') + '.',
                            '$ABCD$ est un parallélogramme, et ' + colt('on ne peut pas savoir')
                            + ' s\'il est rectangle, losange ou carré.'])]),
     variation('$ABCD$ est un **' + si('k==1', 'losange', 'rectangle') + '**. Ses diagonales :'
               + choix(['sont perpendiculaires', 'ont la même longueur',
                        'ne se coupent pas en leur milieu']),
               [var('k', '1..2'), var('j', 'eval:k-1')], ['{{j}}'],
               ['Un ' + si('k==1', 'losange', 'rectangle') + ' est un parallélogramme : ses'
                ' diagonales se coupent en leur milieu.',
                si('k==1', 'De plus, les diagonales d\'un losange '
                   + colt('sont perpendiculaires') + '.',
                   'De plus, les diagonales d\'un rectangle ' + colt('ont la même longueur') + '.')]),
     variation('$ABCD$ est un **rectangle** avec $AC = {{c}}$ cm.'
               + fig_quadri(RECT, 'Un rectangle ABCD et ses diagonales.', [
                   'angle(D, A, B, marque="carre")'], diagonales=True)
               + 'Combien mesure $BD$ ?\n\n$BD = ?$ cm',
               [var('c', '4..12')], ['{{c}}'],
               ['**Propriété.** Les diagonales d\'un rectangle ont la **même longueur**.',
                '$BD = AC = ' + col('{{c}}') + '$ cm.'])],
    [spec('Diagonales égales : rectangle', 0, {'k': 1, 'j': 0}, '0', 'correct'),
     spec('Erreur : losange au lieu de rectangle', 0, {'k': 1, 'j': 0}, '1', 'incorrect'),
     spec('Diagonales perpendiculaires : losange', 0, {'k': 2, 'j': 1}, '1', 'correct'),
     spec('Les deux : carré', 0, {'k': 3, 'j': 2}, '2', 'correct'),
     spec('Erreur : carré → rectangle seulement', 0, {'k': 3, 'j': 2}, '0', 'incorrect'),
     spec('Milieu seulement : on ne peut pas savoir', 0, {'k': 4, 'j': 3}, '3', 'correct'),
     spec('Erreur : rectangle à l\'œil', 0, {'k': 4, 'j': 3}, '0', 'incorrect'),
     spec('Losange : perpendiculaires', 1, {'k': 1, 'j': 0}, '0', 'correct'),
     spec('Erreur : losange, même longueur', 1, {'k': 1, 'j': 0}, '1', 'incorrect'),
     spec('Rectangle : même longueur', 1, {'k': 2, 'j': 1}, '1', 'correct'),
     spec('BD = AC = 9', 2, {'c': 9}, '9', 'correct'),
     spec('Erreur : BD = AC / 2', 2, {'c': 9}, '4.5', 'incorrect')],
    delay=60))

# --- 6. 5-068 : placer le 4e sommet --------------------------------------------------------------
# A, B, C donnés, [AB] et [BC] tracés ; D = A + C − B. Fenêtre 0..10 × 0..9.

FEN_6 = '0 ; 10 ; 0 ; 9'
TRI_6 = {1: ((2, 2), (7, 2), (8, 6)), 2: ((1, 5), (5, 1), (9, 4)), 3: ((2, 1), (8, 3), (7, 7))}


def quatrieme(t):
    a, b, c = t
    return plus(a, c, b)


def croise(t):
    """L'autre intersection des reports (cercle de centre A de rayon BC, de centre C de rayon AB) :
    le symétrique de D par rapport à (AC)."""
    a, b, c = t
    d = quatrieme(t)
    ux, uy = c[0] - a[0], c[1] - a[1]
    k = ((d[0] - a[0]) * ux + (d[1] - a[1]) * uy) / (ux * ux + uy * uy)
    h = (a[0] + k * ux, a[1] + k * uy)
    return (2 * h[0] - d[0], 2 * h[1] - d[1])


def verifie_6():
    for i, t in TRI_6.items():
        d = quatrieme(t)
        assert 0 <= d[0] <= 10 and 0 <= d[1] <= 9, (i, d)


verifie_6()


def corps_6(t):
    a, b, c = t
    g = centre_de([a, b, c, quatrieme(t)])
    return '\n'.join([pt('A', a, g), pt('B', b, g), pt('C', c, g), 'segment(A, B)',
                      'segment(B, C)'])


def p_rep(p):
    return 'point(' + n(p[0]) + ';' + n(p[1]) + ')'


def reports_justes(t):
    a, b, c = t
    d = quatrieme(t)
    return ('report(' + ';'.join(n(x) for x in (*a, *b, *c)) + ')|report('
            + ';'.join(n(x) for x in (*c, *a, *b)) + ')|' + p_rep(d))


def reports_croise(t):
    a, b, c = t
    return ('report(' + ';'.join(n(x) for x in (*a, *b, *c)) + ')|report('
            + ';'.join(n(x) for x in (*c, *a, *b)) + ')|' + p_rep(croise(t)))


ETAPES_6 = [
    'Dans le parallélogramme $ABCD$, les sommets se suivent dans cet ordre : $D$ est **opposé** à'
    ' $B$, et les côtés opposés sont parallèles et de même longueur.',
    'Pour aller de $B$ à $C$, on fait un certain déplacement ; on fait le **même** depuis $A$ pour'
    ' arriver en $D$ (sur le quadrillage : on compte les carreaux).',
    'On place ' + colt('D') + ' : alors $AD = BC$ et $(AD) \\parallel (BC)$.']

ETAPES_6_UNI = [
    'Dans le parallélogramme $ABCD$, les côtés opposés ont la même longueur : $AD = BC$ et'
    ' $CD = AB$.',
    'Au compas (ou au report), on reporte la longueur $BC$ à partir de $A$, puis la longueur $AB$ à'
    ' partir de $C$.',
    'Les deux arcs se coupent en deux points : ' + colt('D') + ' est celui qui est **de l\'autre'
    ' côté** de $(AC)$ par rapport à $B$ (l\'autre donnerait un quadrilatère croisé).']

MODELES.append(modele(
    '06-placer-le-4e-sommet', 'Placer le 4e sommet d\'un parallélogramme',
    'Trois sommets d\'un parallélogramme sont donnés : placer le quatrième, sur quadrillage puis aux'
    ' instruments sur papier uni',
    6,
    [variation('$A$, $B$ et $C$ sont trois sommets du parallélogramme $ABCD$. Place le point $D$.'
               + a_completer(FEN_6, ['point D = sommet(parallelogramme(A, B, C), 4)'],
                             [selon('k', [corps_6(TRI_6[i]) for i in (1, 2, 3)])],
                             tete=['grille: 1', 'outils: point']),
               [var('k', '1..3')], [], ETAPES_6),
     variation('$A$, $B$ et $C$ sont trois sommets du parallélogramme $ABCD$. Construis le point $D$'
               ' avec tes instruments.'
               + a_completer(FEN_6, ['point D = sommet(parallelogramme(A, B, C), 4)'],
                             [selon('k', [corps_6(TRI_6[i]) for i in (1, 2, 3)])]),
               [var('k', '1..3')], [], ETAPES_6_UNI)],
    [spec('Quadrillage 1 : D juste', 0, {'k': 1}, p_rep(quatrieme(TRI_6[1])), 'correct'),
     spec('Quadrillage 2 : D juste', 0, {'k': 2}, p_rep(quatrieme(TRI_6[2])), 'correct'),
     spec('Quadrillage 3 : D juste', 0, {'k': 3}, p_rep(quatrieme(TRI_6[3])), 'correct'),
     spec('Erreur : ABDC (D = B + C − A)', 0, {'k': 1},
          p_rep(plus(TRI_6[1][1], TRI_6[1][2], TRI_6[1][0])), 'incorrect'),
     spec('Erreur : symétrique de B par A', 0, {'k': 2},
          p_rep((2 * TRI_6[2][0][0] - TRI_6[2][1][0], 2 * TRI_6[2][0][1] - TRI_6[2][1][1])),
          'incorrect'),
     spec('Erreur : rien de placé', 0, {'k': 3}, '', 'empty'),
     spec('Papier uni 1 : deux reports, D juste', 1, {'k': 1}, reports_justes(TRI_6[1]),
          'correct'),
     spec('Papier uni 3 : deux reports, D juste', 1, {'k': 3}, reports_justes(TRI_6[3]),
          'correct'),
     spec('Erreur : l\'autre intersection (croisé)', 1, {'k': 1}, reports_croise(TRI_6[1]),
          'incorrect'),
     spec('Erreur : D placé à l\'œil', 1, {'k': 2}, p_rep(quatrieme(TRI_6[2])), 'incorrect')],
    delay=180))

# --- 7. 5-133 : construire par les diagonales ------------------------------------------------------
# Papier uni, fenêtre 0..12 × 0..9. v1 : A, B, O → C, D symétriques de A, B par O.
# v2 : losange, [AC] tracée, O son milieu, B sur la perpendiculaire en O → D.

FEN_7 = '0 ; 12 ; 0 ; 9'
DON_7 = {1: ((2, 2), (7, 1.5), (6, 4.5)), 2: ((1.5, 4), (6, 1), (6.5, 4.5)),
         3: ((3, 1.5), (9, 3), (6, 5))}       # (A, B, O)
LOS_7 = {1: ((2, 4.5), (10, 4.5), 2.8), 2: ((3, 2), (9, 7), 2.4)}   # (A, C, OB)


def sym(p, o):
    return (2 * o[0] - p[0], 2 * o[1] - p[1])


def verifie_7():
    for i, (a, b, o) in DON_7.items():
        for p in (sym(a, o), sym(b, o)):
            assert 0.5 <= p[0] <= 11.5 and 0.5 <= p[1] <= 8.5, (i, p)
    for i, (a, c, r) in LOS_7.items():
        b, d = los_bd(a, c, r)
        for p in (b, d):
            assert 0.5 <= p[0] <= 11.5 and 0.5 <= p[1] <= 8.5, (i, p)


def los_bd(a, c, r):
    o = milieu(a, c)
    ux, uy = c[0] - a[0], c[1] - a[1]
    lg = math.hypot(ux, uy)
    nx, ny = -uy / lg, ux / lg
    return (o[0] - r * nx, o[1] - r * ny), (o[0] + r * nx, o[1] + r * ny)


verifie_7()


def corps_7(d):
    a, b, o = d
    g = centre_de([a, b, sym(a, o), sym(b, o)])
    return '\n'.join([pt('A', a, g), pt('B', b, g), 'O = point(' + n(o[0]) + ', ' + n(o[1]) + ', etiquette="haut")'])


def corps_7_los(d):
    a, c, r = d
    b, _ = los_bd(a, c, r)
    o = milieu(a, c)
    g = o
    return '\n'.join([pt('A', a, g), pt('C', c, g), pt('B', b, g),
                      'O = point(' + n(o[0]) + ', ' + n(o[1]) + ', etiquette="haut-droite")',
                      'segment(A, C)', 'marque_segment(A, O)', 'marque_segment(O, C)',
                      'droite(B, O, trait="tirets", couleur="gris")',
                      'angle(C, O, B, marque="carre")'])


def c_rep(o, p):
    return 'cercle(' + ';'.join(n(x) for x in (*o, *p)) + ')'


def d_rep(p, q):
    return 'droite(' + ';'.join(n(x) for x in (*p, *q)) + ')'


def construit_sym(p, o):
    return d_rep(p, o) + '|' + c_rep(o, p) + '|' + p_rep(sym(p, o))


ETAPES_7 = [
    '**Propriété.** Les diagonales d\'un parallélogramme se coupent en leur milieu : $O$ est le'
    ' milieu de $[AC]$ et de $[BD]$.',
    'On trace la droite $(AO)$, puis le cercle de centre $O$ qui passe par $A$ : il recoupe la'
    ' droite en ' + colt('C') + ', de l\'autre côté de $O$.',
    'De même avec $B$ : la droite $(BO)$ et le cercle de centre $O$ passant par $B$ donnent '
    + colt('D') + '.']

MODELES.append(modele(
    '07-construire-par-les-diagonales', 'Construire un parallélogramme par ses diagonales',
    'Les diagonales se coupent en leur milieu : construire les sommets manquants au compas, par le'
    ' centre du parallélogramme ou du losange',
    7,
    [variation('$ABCD$ est un parallélogramme de centre $O$. Construis les points $C$ et $D$ avec tes'
               ' instruments.'
               + a_completer(FEN_7, ['point C = symetrie(A, centre=O)',
                                     'point D = symetrie(B, centre=O)'],
                             [selon('k', [corps_7(DON_7[i]) for i in (1, 2, 3)])],
                             tete=['outils: point, droite, compas']),
               [var('k', '1..3')], [], ETAPES_7),
     variation('$ABCD$ est un **losange** de diagonale $[AC]$ ; ses diagonales se coupent en $O$.'
               ' Construis le point $D$ avec tes instruments.'
               + a_completer(FEN_7, ['point D = symetrie(B, centre=O)'],
                             [selon('k', [corps_7_los(LOS_7[i]) for i in (1, 2)])],
                             tete=['outils: point, droite, compas']),
               [var('k', '1..2')], [],
               ['Un losange est un parallélogramme : ses diagonales se coupent en leur milieu $O$.'
                ' $D$ est donc sur la droite $(BO)$, avec $OD = OB$.',
                'On trace le cercle de centre $O$ qui passe par $B$ : il recoupe la droite $(BO)$ en '
                + colt('D') + ', de l\'autre côté de $O$.'])],
    [spec('Parallélogramme 1 : C et D construits', 0, {'k': 1},
          construit_sym(DON_7[1][0], DON_7[1][2]) + '|' + construit_sym(DON_7[1][1], DON_7[1][2]),
          'correct'),
     spec('Parallélogramme 2 : C et D construits', 0, {'k': 2},
          construit_sym(DON_7[2][0], DON_7[2][2]) + '|' + construit_sym(DON_7[2][1], DON_7[2][2]),
          'correct'),
     spec('Erreur : cercle de centre A passant par O (C au-delà de A)', 0, {'k': 3},
          d_rep(DON_7[3][0], DON_7[3][2]) + '|' + c_rep(DON_7[3][0], DON_7[3][2]) + '|'
          + p_rep(sym(DON_7[3][2], DON_7[3][0])) + '|' + construit_sym(DON_7[3][1], DON_7[3][2]),
          'incorrect'),
     spec('Erreur : C et D placés à l\'œil', 0, {'k': 1},
          p_rep(sym(DON_7[1][0], DON_7[1][2])) + '|' + p_rep(sym(DON_7[1][1], DON_7[1][2])),
          'incorrect'),
     spec('Losange 1 : D construit', 1, {'k': 1},
          construit_sym(los_bd(*LOS_7[1])[0], milieu(LOS_7[1][0], LOS_7[1][1])), 'correct'),
     spec('Losange 2 : D construit', 1, {'k': 2},
          construit_sym(los_bd(*LOS_7[2])[0], milieu(LOS_7[2][0], LOS_7[2][1])), 'correct'),
     spec('Erreur : D sur le cercle, hors de la droite (BO)', 1, {'k': 1},
          c_rep(milieu(LOS_7[1][0], LOS_7[1][1]), los_bd(*LOS_7[1])[0]) + '|'
          + p_rep((milieu(LOS_7[1][0], LOS_7[1][1])[0] + 2.8, milieu(LOS_7[1][0], LOS_7[1][1])[1])),
          'incorrect'),
     spec('Erreur : rien de placé', 1, {'k': 2}, '', 'empty')],
    delay=240))

os.makedirs(DOSSIER, exist_ok=True)
for nom, m in MODELES:
    with open(os.path.join(DOSSIER, nom + '.json'), 'w', encoding='utf-8') as f:
        json.dump(m, f, ensure_ascii=False, indent='\t')
        f.write('\n')
subprocess.run(['pnpm', 'exec', 'prettier', '--write', DOSSIER], check=True,
               stdout=subprocess.DEVNULL)
print(f'{len(MODELES)} modèles écrits dans {DOSSIER}')
