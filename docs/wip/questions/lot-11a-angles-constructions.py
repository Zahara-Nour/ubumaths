"""Écrit les 6 modèles du lot 11a « Angles et constructions » de la 6e dans
scripts/questions/6-angles-constructions/.

Phase 0 validée par David le 2026-11-09 (§ 26 du journal `docs/wip/questions-6-progress.md`).
Quatre modèles TÉMOINS des contrôles de la figure à compléter (§ 25) : `mesure` (6-169, rapporteur
posé puis à poser), `angle` (6-170), `bissectrice` (6-172), droite à construire `mediatrice`
(6-166, modèle neuf : 9e90342c reste tel quel). Bornes : `cycle3.json`, 6e (6-168 : angles
saillants, plus plat et plein ; 6-169 : 0 à 360° ; 6-170 : au plus 180°). Le nœud et le tag sont
posés par la migration de rangement, après le `--publier` de David.

Décisions et pièges :
- figure à compléter : papier uni, fenêtre au plus deux fois plus large que haute (rapporteur),
  angle seul dans la figure ; la mesure attendue de `mesure AOB` est calculée sur la figure
  (B = rotation(…, angle={{a}}, centre=O)) ;
- réponses d'essai des figures calculées ici en pleine précision (repère du rapporteur :
  `repereAt` de `construction/instruments.ts` ; intersections de cercles), comme le juge ;
- une figure à compléter n'a pas de `blanks` (la case est la figure) ;
- `eval:` ne connaît ni `==` ni `>` : indicatrices de Lagrange (`lag`) ; bonne réponse d'un choix
  toujours par une variable.

    python3 docs/wip/questions/lot-11a-angles-constructions.py scripts/questions
"""
import json
import math
import os
import subprocess
import sys

RACINE = sys.argv[1]
DOSSIER = os.path.join(RACINE, '6-angles-constructions')


def spec(desc, vi, variables, answers, status):
    return {'description': desc, 'variationIndex': vi,
            'variables': {k: str(v) for k, v in variables.items()},
            'answers': answers if isinstance(answers, list) else [answers],
            'expected': {'status': status}}


def modele(nom, title, description, level, variations, specs, delay=60):
    m = {'title': title, 'description': description, 'grades': ['6'], 'level': level,
         'delay': delay, 'status': 'draft', 'variations': variations, 'testSpecs': specs}
    return nom, m


def var(nom, expression):
    return {'name': nom, 'expression': expression}


def variation(statement, variables, answers, steps, conditions=None):
    v = {'statement': statement, 'variables': variables}
    if conditions:
        v['conditions'] = conditions
    if answers:
        v['blanks'] = [{'expectedAnswer': a} for a in answers]
    v['correction'] = {'steps': steps}
    return v


def col(x, k=0):
    return '\\textcolor{{{color:primary.' + str(k) + '}}}{' + x + '}'


def colt(x):
    """Mot coloré dans une phrase (hors des $…$)."""
    return '$' + col(x) + '$'


def choix(lignes, plusieurs=False, melanger=True):
    tete = ''
    if plusieurs:
        tete += 'plusieurs: oui\n'
    if not melanger:
        tete += 'melanger: non\n'
    return '\n\n```choix\n' + tete + ''.join('- ' + l + '\n' for l in lignes) + '```'


def si(cond, oui, non):
    return '{{if:' + cond + '|' + oui + '|' + non + '}}'


def si3(v, a, b, c):
    """Texte selon v ∈ {1, 2, 3}."""
    return si(v + '==1', a, si(v + '==2', b, c))


def lag(v, valeurs):
    """Expression qui vaut valeurs[i - 1] quand v == i (v ∈ 1..n), par indicatrices de Lagrange."""
    n = len(valeurs)
    termes = []
    for i in range(1, n + 1):
        if valeurs[i - 1] == 0:
            continue
        num = '*'.join('(' + v + '-' + str(j) + ')' for j in range(1, n + 1) if j != i)
        den = 1
        for j in range(1, n + 1):
            if j != i:
                den *= (i - j)
        termes.append('(' + str(valeurs[i - 1]) + ')*' + num + '/(' + str(den) + ')')
    return '+'.join(termes) if termes else '0'


def figure(fenetre, description, lignes):
    return ('\n\n```figure\nfenetre: ' + fenetre + '\ndescription: ' + description + '\n---\n'
            + '\n'.join(lignes) + '\n```\n\n')


def a_completer(fenetre, verifier, lignes):
    return ('\n\n```figure-a-completer\nfenetre: ' + fenetre + '\nverifier: ' + verifier
            + '\n---\n' + '\n'.join(lignes) + '\n```')


def deg(x):
    return x + '^\\circ'


def angle_hat(nom):
    return '\\widehat{' + nom + '}'


# --- Géométrie des réponses d'essai (même calcul que le juge) --------------------------------------

def n(x):
    """Nombre écrit dans une réponse de figure : pleine précision, sans « -0 »."""
    x = x + 0.0
    if abs(x - round(x)) < 1e-12:
        return str(int(round(x)))
    return repr(x)


def repere_at(vx, vy, ax, ay, r, d, sens):
    base = math.atan2(ay - vy, ax - vx)
    t = base + sens * d * math.pi / 180
    return vx + r * math.cos(t), vy + r * math.sin(t)


def repere(vx, vy, ax, ay, r, d, sens=1):
    return 'repere(' + ';'.join(n(x) for x in (vx, vy, ax, ay, r, d, sens)) + ')'


def segment(p, q):
    return 'segment(' + ';'.join(n(x) for x in (p[0], p[1], q[0], q[1])) + ')'


def droite(p, q):
    return 'droite(' + ';'.join(n(x) for x in (p[0], p[1], q[0], q[1])) + ')'


def cercle(c, p):
    return 'cercle(' + ';'.join(n(x) for x in (c[0], c[1], p[0], p[1])) + ')'


def inter_cercles(c1, r1, c2, r2):
    dx, dy = c2[0] - c1[0], c2[1] - c1[1]
    d = math.hypot(dx, dy)
    a = (r1 * r1 - r2 * r2 + d * d) / (2 * d)
    h = math.sqrt(r1 * r1 - a * a)
    mx, my = c1[0] + a * dx / d, c1[1] + a * dy / d
    return (mx - h * dy / d, my + h * dx / d), (mx + h * dy / d, my - h * dx / d)


def sur(o, p, r):
    """Point à la distance r de o, vers p."""
    d = math.hypot(p[0] - o[0], p[1] - o[1])
    return o[0] + r * (p[0] - o[0]) / d, o[1] + r * (p[1] - o[1]) / d


def rot(p, o, d):
    t = d * math.pi / 180
    x, y = p[0] - o[0], p[1] - o[1]
    return o[0] + x * math.cos(t) - y * math.sin(t), o[1] + x * math.sin(t) + y * math.cos(t)


MODELES = []

# --- 1. 6-168 : le vocabulaire des angles ---------------------------------------------------------
# v1 : un angle dessiné, sa mesure écrite (aigu, droit, obtus, plat) ; v2 : deux angles, figure tirée
# parmi trois (adjacents, opposés par le sommet, ni l'un ni l'autre : même côté [OA), l'un dans
# l'autre) ; v3 : supplémentaires (le leurre « complémentaires » est 90 − a) ; v4 : la notation.

S168, P168, Q168 = si3('k', 'A', 'B', 'C'), si3('k', 'B', 'A', 'A'), si3('k', 'C', 'C', 'B')
A168 = lag('k', ['(10*r)', 90, '(90+10*r)', 180])
FIG_168_1 = figure(
    '-5 ; 5 ; -1.5 ; 5',
    'Un angle AOB de sommet O, codé par un arc, qui mesure {{a}} degrés.',
    ['O = point(0, 0, etiquette="bas")',
     'A = point(4, 0, etiquette="bas")',
     'B = rotation(A, angle={{a}}, centre=O)',
     'demidroite(O, A)', 'demidroite(O, B)',
     'arc(O, rayon=0.8, debut=0, fin={{a}})',
     'H = point(1.5, 0, visible=faux)',
     'T = rotation(H, angle={{eval:a/2;d}}, centre=O, visible=faux)',
     'texte(T, "{{a}}°")'])

# Trois figures de deux angles, coordonnées écrites (angles fixes) ; arcs de deux couleurs.
def rayons(*angles):
    pts = []
    for i, t in enumerate(angles):
        x, y = rot((4, 0), (0, 0), t)
        pts.append(chr(ord('A') + i) + ' = point(' + n(round(x, 4)) + ', ' + n(round(y, 4))
                   + ', etiquette="' + ('haut' if y > 0.5 else 'bas') + '")')
    return pts


CORPS_168_2 = si3(
    'k',
    '\n'.join(rayons(0, 55, 125) + ['demidroite(O, A)', 'demidroite(O, B)', 'demidroite(O, C)',
                                    'arc(O, rayon=1, debut=0, fin=55, couleur="bleu")',
                                    'arc(O, rayon=1.3, debut=55, fin=125, couleur="rouge")']),
    '\n'.join(rayons(30, 150, 210, 330) + ['droite(A, C)', 'droite(B, D)',
                                           'arc(O, rayon=1, debut=30, fin=150, couleur="bleu")',
                                           'arc(O, rayon=1, debut=210, fin=330, couleur="rouge")']),
    '\n'.join(rayons(0, 60, 130) + ['demidroite(O, A)', 'demidroite(O, B)', 'demidroite(O, C)',
                                    'arc(O, rayon=1, debut=0, fin=60, couleur="bleu")',
                                    'arc(O, rayon=1.5, debut=0, fin=130, couleur="rouge")']))
FIG_168_2 = figure(
    '-5 ; 5 ; -4.5 ; 4.5',
    si3('k', 'Deux angles AOB (bleu) et BOC (rouge) de même sommet O, de part et d\'autre du côté'
             ' [OB).',
        'Deux droites qui se coupent en O ; un angle bleu et un angle rouge face à face.',
        'Deux angles AOB (bleu) et AOC (rouge) de même sommet O et de même côté [OA) ; le bleu'
        ' est dans le rouge.'),
    ['O = point(0, 0, etiquette="bas-gauche")', CORPS_168_2])

MODELES.append(modele(
    '01-vocabulaire-des-angles', 'Le vocabulaire des angles',
    'Nommer un angle d\'après sa mesure (aigu, droit, obtus, plat), reconnaître des angles'
    ' adjacents ou opposés par le sommet, calculer le supplémentaire d\'un angle, lire la notation',
    1,
    [variation('Voici un angle.' + FIG_168_1 + 'Comment s\'appelle cet angle ?'
               + choix(['un angle aigu', 'un angle droit', 'un angle obtus', 'un angle plat',
                        'un angle nul', 'un angle plein'], melanger=False),
               [var('k', '1..4'), var('r', '2..8'), var('a', 'eval:' + A168),
                var('j', 'eval:k-1')], ['{{j}}'],
               ['**Les noms des angles.** Un angle **aigu** mesure moins de $' + deg('90')
                + '$ ; un angle **droit** mesure $' + deg('90') + '$ ; un angle **obtus** mesure'
                ' entre $' + deg('90') + '$ et $' + deg('180') + '$ ; un angle **plat** mesure $'
                + deg('180') + '$ (ses côtés forment une droite).',
                'Cet angle mesure $' + deg('{{a}}') + '$ : c\'est un angle '
                + colt('\\text{' + si('k==1', 'aigu', si('k==2', 'droit', si('k==3', 'obtus',
                                                                             'plat'))) + '}')
                + '.']),
     variation('Voici deux angles, l\'un en bleu, l\'autre en rouge.' + FIG_168_2
               + 'Que peut-on dire de ces deux angles ?'
               + choix(['ils sont adjacents', 'ils sont opposés par le sommet',
                        'ils ne sont ni adjacents, ni opposés par le sommet'], melanger=False),
               [var('k', '1..3'), var('j', 'eval:k-1')], ['{{j}}'],
               ['**Adjacents** : même sommet, un côté commun, et ils sont **de part et d\'autre** de'
                ' ce côté. **Opposés par le sommet** : même sommet, et les côtés de l\'un'
                ' prolongent ceux de l\'autre (deux droites qui se coupent).',
                si3('k', 'Les angles ont le sommet $O$ et le côté $[OB)$ en commun, de part et'
                         ' d\'autre de $[OB)$ : ils sont ' + colt('\\text{adjacents}') + '.',
                    'Les deux droites se coupent en $O$ ; les angles sont face à face : ils sont '
                    + colt('\\text{opposés par le sommet}') + '.',
                    'Les angles ont le sommet $O$ et le côté $[OA)$ en commun, mais l\'angle bleu'
                    ' est **dans** l\'angle rouge : ils ne sont '
                    + colt('\\text{ni adjacents, ni opposés par le sommet}') + '.')]),
     variation('Deux angles sont **supplémentaires**. L\'un mesure $' + deg('{{a}}')
               + '$.\n\nCombien mesure l\'autre ?\n\n$' + deg('?') + '$',
               [var('a', '20..70')], ['{{eval:180-a}}'],
               ['**Deux angles supplémentaires** : la somme de leurs mesures est $' + deg('180')
                + '$ (ensemble, ils forment un angle plat).',
                '$180 - {{a}} = ' + col('{{eval:180-a}}') + '$ : l\'autre angle mesure $'
                + col(deg('{{eval:180-a}}')) + '$.']),
     variation('Dans un triangle $ABC$, comment note-t-on l\'angle de **sommet $' + S168
               + '$** ?' + choix(['$' + angle_hat(P168 + S168 + Q168) + '$',
                                  '$' + angle_hat(S168 + P168 + Q168) + '$',
                                  '$' + angle_hat(P168 + Q168 + S168) + '$']),
               [var('k', '1..3')], ['0'],
               ['**La notation d\'un angle** : la lettre du **sommet** s\'écrit **au milieu**,'
                ' entre les lettres d\'un point de chaque côté.',
                'L\'angle de sommet $' + S168 + '$ se note $' + col(angle_hat(P168 + S168 + Q168))
                + '$ (ou $' + angle_hat(Q168 + S168 + P168) + '$).'])],
    [spec('Aigu', 0, {'k': 1, 'r': 4, 'a': 40, 'j': 0}, '0', 'correct'),
     spec('Erreur : obtus pour un aigu', 0, {'k': 1, 'r': 4, 'a': 40, 'j': 0}, '2', 'incorrect'),
     spec('Droit', 0, {'k': 2, 'r': 4, 'a': 90, 'j': 1}, '1', 'correct'),
     spec('Obtus', 0, {'k': 3, 'r': 4, 'a': 130, 'j': 2}, '2', 'correct'),
     spec('Plat', 0, {'k': 4, 'r': 4, 'a': 180, 'j': 3}, '3', 'correct'),
     spec('Erreur : nul pour un plat', 0, {'k': 4, 'r': 4, 'a': 180, 'j': 3}, '4', 'incorrect'),
     spec('Adjacents', 1, {'k': 1, 'j': 0}, '0', 'correct'),
     spec('Opposés par le sommet', 1, {'k': 2, 'j': 1}, '1', 'correct'),
     spec('Ni l\'un ni l\'autre (l\'un dans l\'autre)', 1, {'k': 3, 'j': 2}, '2', 'correct'),
     spec('Erreur : adjacents quand l\'un est dans l\'autre', 1, {'k': 3, 'j': 2}, '0',
          'incorrect'),
     spec('180 − 35 = 145', 2, {'a': 35}, '145', 'correct'),
     spec('Erreur : 55 (complémentaire)', 2, {'a': 35}, '55', 'incorrect'),
     spec('Sommet au milieu', 3, {'k': 2}, '0', 'correct'),
     spec('Erreur : sommet en premier', 3, {'k': 2}, '1',
          'incorrect')],
    delay=90))

# --- 2. 6-169 : mesurer un angle — TÉMOIN `mesure` ------------------------------------------------
# v1 : rapporteur déjà posé (base sur [OA), lire) ; v2 : rapporteur à poser, angle tourné de t.
# Fenêtre 10 × 8 : rapporteur de rayon 2,8 ; O au centre, côtés de 3,6 (B dans la fenêtre pour
# toute mesure de 11 à 169).

FIG_169_1 = a_completer(
    '0 ; 10 ; 0 ; 8', 'mesure AOB, rapporteur posé',
    ['O = point(5, 2.5)', 'A = point(9, 2.5)', 'P = point(8.6, 2.5, visible=faux)',
     'B = rotation(P, angle={{a}}, centre=O)', 'x = demidroite(O, A)', 'y = demidroite(O, B)'])
FIG_169_2 = a_completer(
    '0 ; 10 ; 0 ; 8', 'mesure AOB',
    ['O = point(5, 4)', 'P = point(8.6, 4, visible=faux)',
     'A = rotation(P, angle={{t}}, centre=O)', 'B = rotation(P, angle={{eval:t+a}}, centre=O)',
     'x = demidroite(O, A)', 'y = demidroite(O, B)'])

ETAPES_169 = ['**Lire la bonne graduation.** Le centre du rapporteur est sur le sommet $O$, sa base'
              ' sur le côté $[OA)$. On part du $0$ qui est **sur le côté $[OA)$** et on suit cette'
              ' graduation jusqu\'au côté $[OB)$.',
              'L\'angle est ' + si('a<90', 'aigu', 'obtus') + ' : sa mesure est '
              + si('a<90', 'plus petite', 'plus grande') + ' que $' + deg('90') + '$. $'
              + angle_hat('AOB') + ' = ' + col(deg('{{a}}')) + '$.']

MODELES.append(modele(
    '02-mesurer-un-angle', 'Mesurer un angle au rapporteur',
    'Lire la mesure d\'un angle sur un rapporteur déjà posé, puis poser soi-même le rapporteur'
    ' (centre au sommet, base sur un côté) et lire la bonne graduation',
    1,
    [variation('Le rapporteur est posé sur l\'angle $' + angle_hat('AOB') + '$. Quelle est sa'
               ' mesure, en degrés ?' + FIG_169_1,
               [var('a', '15..165')], [], ETAPES_169, conditions=['a!=90']),
     variation('Mesure l\'angle $' + angle_hat('AOB') + '$ avec le rapporteur, puis écris sa'
               ' mesure, en degrés.' + FIG_169_2,
               [var('a', '15..165'), var('t', '0..50')], [], ETAPES_169,
               conditions=['a!=90'])],
    [spec('Rapporteur posé : 50', 0, {'a': 50}, 'mesure(50)', 'correct'),
     spec('Erreur : 130 (mauvaise graduation)', 0, {'a': 50}, 'mesure(130)', 'incorrect'),
     spec('Rapporteur posé : 124', 0, {'a': 124}, 'mesure(124)', 'correct'),
     spec('Erreur : 56 (mauvaise graduation)', 0, {'a': 124}, 'mesure(56)', 'incorrect'),
     spec('Angle tourné : 72', 1, {'a': 72, 't': 30}, 'mesure(72)', 'correct'),
     spec('Erreur : 102 (lu depuis l\'horizontale)', 1, {'a': 72, 't': 30}, 'mesure(102)',
          'incorrect'),
     spec('Erreur : 108 (mauvaise graduation)', 1, {'a': 72, 't': 30}, 'mesure(108)',
          'incorrect')],
    delay=120))

# --- 3. 6-170 : construire un angle de mesure donnée — TÉMOIN `angle` -----------------------------
# v1 : [OA) horizontal, mesure multiple de 10 ; v2 : [OA) oblique, vers la gauche, mesure entière.

O170_1, A170_1 = (4, 3), (9, 3)
O170_2, A170_2 = (5, 4), (1, 3)


def angle_juste(o, a, d, sens=1, r=3):
    m = repere(o[0], o[1], a[0], a[1], r, d, sens)
    return m + '|' + segment(o, repere_at(o[0], o[1], a[0], a[1], r, d, sens))


ETAPES_170 = ['**Poser le rapporteur** : son centre sur le sommet $O$, sa base le long de'
              ' $[OA)$.',
              'Partir du $0$ qui est sur $[OA)$, marquer un repère à la graduation $' + deg('{{a}}')
              + '$, puis tracer à la règle la demi-droite $' + col('[Oy)') + '$ de $O$ au repère.']

MODELES.append(modele(
    '03-construire-un-angle', 'Construire un angle de mesure donnée',
    'Au rapporteur : poser le centre sur le sommet et la base sur le côté donné, marquer la'
    ' graduation voulue, tracer le second côté',
    1,
    [variation('Construis la demi-droite $[Oy)$ telle que $' + angle_hat('AOy') + ' = '
               + deg('{{a}}') + '$.'
               + a_completer('0 ; 10 ; 0 ; 8', 'angle AOy = {{a}}',
                             ['O = point(4, 3)', 'A = point(9, 3)', 'x = demidroite(O, A)']),
               [var('r', '2..16'), var('a', 'eval:10*r')], [], ETAPES_170,
               conditions=['a!=90']),
     variation('Construis la demi-droite $[Oy)$ telle que $' + angle_hat('AOy') + ' = '
               + deg('{{a}}') + '$.'
               + a_completer('0 ; 10 ; 0 ; 8', 'angle AOy = {{a}}',
                             ['O = point(5, 4)', 'A = point(1, 3)', 'x = demidroite(O, A)']),
               [var('a', '15..165')], [], ETAPES_170, conditions=['a!=90'])],
    [spec('50°, au-dessus de [OA)', 0, {'r': 5, 'a': 50}, angle_juste(O170_1, A170_1, 50),
          'correct'),
     spec('50°, au-dessous de [OA)', 0, {'r': 5, 'a': 50}, angle_juste(O170_1, A170_1, 50, -1),
          'correct'),
     spec('Erreur : 130° (mauvaise graduation)', 0, {'r': 5, 'a': 50},
          angle_juste(O170_1, A170_1, 130), 'incorrect'),
     spec('Erreur : côté tracé à l\'œil, sans repère', 0, {'r': 5, 'a': 50},
          segment(O170_1, repere_at(4, 3, 9, 3, 3, 50, 1)), 'incorrect'),
     spec('Oblique : 37°', 1, {'a': 37}, angle_juste(O170_2, A170_2, 37), 'correct'),
     spec('Oblique : 128°, de l\'autre côté', 1, {'a': 128},
          angle_juste(O170_2, A170_2, 128, -1), 'correct'),
     spec('Erreur : 143° au lieu de 37°', 1, {'a': 37}, angle_juste(O170_2, A170_2, 143),
          'incorrect')],
    delay=180))

# --- 4. 6-171 : définition de la bissectrice ------------------------------------------------------
# v1 : [Oz) dessinée, figure tirée parmi trois (bissectrice ; deux angles inégaux, mesures écrites ;
# demi-droite qui part d'un point M de [OA) au lieu du sommet) ; v2 : la définition (le leurre
# « par le milieu de [AB] » est l'erreur classique) ; v3 : [Oz) bissectrice, AOz donné → AOB.

Z171 = lag('k', ['h', '(h+d)', 'h'])
FIG_171_1 = figure(
    '-3 ; 8 ; -0.5 ; 7',
    si3('k', 'Un angle AOB et une demi-droite [Oz) qui le partage en deux angles de {{h}} degrés.',
        'Un angle AOB et une demi-droite [Oz) qui le partage en un angle de {{eval:h+d}} degrés'
        ' et un angle de {{eval:h-d}} degrés.',
        'Un angle AOB et une demi-droite [Mz) qui part d\'un point M du côté [OA), parallèle à'
        ' la bissectrice.'),
    ['O = point(0, 0, etiquette="bas")',
     'A = point(7, 0, etiquette="bas")',
     'B = rotation(A, angle={{eval:2*h}}, centre=O)',
     'demidroite(O, A)', 'demidroite(O, B)',
     'H6 = point(6, 0, visible=faux)', 'H7 = point(7, 0, visible=faux)',
     'H2 = point(2.4, 0, visible=faux)',
     'Z = rotation(H6, angle={{eval:' + Z171 + '}}, centre=O, visible=faux)',
     'M = point(2, 0, etiquette="bas", visible=' + si('k==3', 'vrai', 'faux') + ')',
     'W = rotation(H7, angle={{h}}, centre=M, visible=faux)',
     'demidroite(O, Z, visible=' + si('k==3', 'faux', 'vrai') + ')',
     'demidroite(M, W, visible=' + si('k==3', 'vrai', 'faux') + ')',
     'texte(Z, "z", dx=0.2, dy=0.2, visible=' + si('k==3', 'faux', 'vrai') + ')',
     'texte(W, "z", dx=0.2, dy=0.2, visible=' + si('k==3', 'vrai', 'faux') + ')',
     'T1 = rotation(H2, angle={{eval:(' + Z171 + ')/2;d}}, centre=O, visible=faux)',
     'T2 = rotation(H2, angle={{eval:h+(' + Z171 + ')/2;d}}, centre=O, visible=faux)',
     'texte(T1,'
     ' "{{eval:' + Z171 + '}}°", visible=' + si('k==3', 'faux', 'vrai') + ')',
     'texte(T2,'
     ' "{{eval:2*h-(' + Z171 + ')}}°", visible=' + si('k==3', 'faux', 'vrai') + ')'])

MODELES.append(modele(
    '04-definition-de-la-bissectrice', 'Définition de la bissectrice d\'un angle',
    'La bissectrice d\'un angle est la demi-droite qui part du sommet et le partage en deux angles'
    ' de même mesure : la reconnaître, choisir sa définition, s\'en servir pour une mesure',
    1,
    [variation('La demi-droite tracée dans l\'angle $' + angle_hat('AOB') + '$ est-elle sa'
               ' bissectrice ?' + FIG_171_1
               + choix(['oui', 'non, les deux angles n\'ont pas la même mesure',
                        'non, elle ne part pas du sommet de l\'angle'], melanger=False),
               [var('k', '1..3'), var('h', '25..55'), var('d', '6..12'), var('j', 'eval:k-1')],
               ['{{j}}'],
               ['**La bissectrice** d\'un angle part de son **sommet** et le partage en **deux'
                ' angles de même mesure**.',
                si3('k', 'Elle part de $O$ et les deux angles mesurent $' + deg('{{h}}') + '$ : '
                         + colt('\\text{oui}') + ', c\'est la bissectrice.',
                    'Elle part bien de $O$, mais $' + deg('{{eval:h+d}}') + ' \\neq '
                    + deg('{{eval:h-d}}') + '$ : ' + colt('\\text{non}')
                    + ', les deux angles ne sont pas égaux.',
                    'Elle part de $M$, pas du sommet $O$ : ' + colt('\\text{non}') + '.')]),
     variation('Qu\'est-ce que la bissectrice d\'un angle ?'
               + choix(['la demi-droite qui part du sommet et partage l\'angle en deux angles de'
                        ' même mesure',
                        'la demi-droite qui part du sommet et passe par le milieu du segment qui'
                        ' joint deux points des côtés',
                        'la droite perpendiculaire à un côté, qui passe par le sommet',
                        'la droite qui passe par le milieu d\'un côté de l\'angle']),
               [], ['0'],
               ['**Définition.** La bissectrice d\'un angle est '
                + colt('\\text{la demi-droite qui part du sommet}') + ' et '
                + colt('\\text{partage l\'angle en deux angles de même mesure}') + '.',
                'Le milieu d\'un segment $[AB]$ joignant les côtés n\'est sur la bissectrice que'
                ' si $OA = OB$.']),
     variation('La demi-droite $[Oz)$ est la bissectrice de l\'angle $' + angle_hat('AOB')
               + '$, et $' + angle_hat('AOz') + ' = ' + deg('{{c}}') + '$.\n\nCombien mesure'
               ' l\'angle $' + angle_hat('AOB') + '$ ?\n\n$' + angle_hat('AOB') + ' = ' + deg('?')
               + '$',
               [var('c', '20..80')], ['{{eval:2*c}}'],
               ['**La bissectrice** partage $' + angle_hat('AOB') + '$ en deux angles de même'
                ' mesure : $' + angle_hat('AOz') + ' = ' + angle_hat('zOB') + ' = ' + deg('{{c}}')
                + '$.',
                '$' + angle_hat('AOB') + ' = 2 \\times {{c}} = ' + col(deg('{{eval:2*c}}')) + '$.'])],
    [spec('Bissectrice', 0, {'k': 1, 'h': 35, 'd': 8, 'j': 0}, '0', 'correct'),
     spec('Angles inégaux', 0, {'k': 2, 'h': 35, 'd': 8, 'j': 1}, '1', 'correct'),
     spec('Erreur : oui quand les angles sont inégaux', 0, {'k': 2, 'h': 35, 'd': 8, 'j': 1}, '0',
          'incorrect'),
     spec('Ne part pas du sommet', 0, {'k': 3, 'h': 35, 'd': 8, 'j': 2}, '2', 'correct'),
     spec('Définition', 1, {}, '0', 'correct'),
     spec('Erreur : par le milieu de [AB]', 1, {}, '1', 'incorrect'),
     spec('2 × 35 = 70', 2, {'c': 35}, '70', 'correct'),
     spec('Erreur : 35 (sans doubler)', 2, {'c': 35}, '35', 'incorrect'),
     spec('Erreur : 17,5 (moitié)', 2, {'c': 35}, '17,5', 'incorrect')],
    delay=90))

# --- 5. 6-172 : construire la bissectrice — TÉMOIN `bissectrice` -----------------------------------
# Trois angles (k), papier uni ; compas et règle (pas de rapporteur).

ANGLES_172 = {1: ((2, 2), (8, 3), (4, 7)), 2: ((2, 1.5), (8.5, 1.5), (1, 6.5)),
              3: ((1.5, 5.5), (8, 6.5), (6, 1.5))}


def corps_172(k):
    o, a, b = ANGLES_172[k]
    return '\n'.join(['O = point(' + n(o[0]) + ', ' + n(o[1]) + ')',
                      'A = point(' + n(a[0]) + ', ' + n(a[1]) + ')',
                      'B = point(' + n(b[0]) + ', ' + n(b[1]) + ')'])


def bissectrice_juste(k, r=2):
    o, a, b = ANGLES_172[k]
    p1, p2 = sur(o, a, r), sur(o, b, r)
    d12 = math.hypot(p2[0] - p1[0], p2[1] - p1[1])
    q1, q2 = inter_cercles(p1, d12, p2, d12)
    q = max((q1, q2), key=lambda p: math.hypot(p[0] - o[0], p[1] - o[1]))
    return '|'.join([cercle(o, p1), cercle(p1, p2), cercle(p2, p1), droite(o, q)])


def bissectrice_oeil(k):
    """Droite par O et le milieu de [AB] (l'erreur classique), à l'œil."""
    o, a, b = ANGLES_172[k]
    return droite(o, ((a[0] + b[0]) / 2, (a[1] + b[1]) / 2))


MODELES.append(modele(
    '05-construire-la-bissectrice', 'Construire la bissectrice d\'un angle',
    'Au compas et à la règle : un arc de centre le sommet coupe les deux côtés, deux arcs de même'
    ' rayon centrés en ces points se coupent sur la bissectrice',
    2,
    [variation('Construis la bissectrice de l\'angle $' + angle_hat('AOB')
               + '$ avec le compas et la règle.'
               + a_completer('0 ; 10 ; 0 ; 8', 'droite d = bissectrice(A, O, B)',
                             [si3('k', corps_172(1), corps_172(2), corps_172(3)),
                              'x = demidroite(O, A)', 'y = demidroite(O, B)']),
               [var('k', '1..3')], [],
               ['**Un arc de centre $O$** (compas ouvert comme on veut) coupe $[OA)$ en $M$ et'
                ' $[OB)$ en $N$ : $OM = ON$.',
                '**Deux arcs de même rayon**, centrés en $M$ et en $N$, se coupent en un point'
                ' $P$ : $PM = PN$.',
                'La demi-droite $' + col('[OP)') + '$ est la bissectrice : elle partage $'
                + angle_hat('AOB') + '$ en deux angles de même mesure.'])],
    [spec('Angle 1 : arc en O, deux arcs égaux, droite (OP)', 0, {'k': 1}, bissectrice_juste(1),
          'correct'),
     spec('Angle 2 : construite', 0, {'k': 2}, bissectrice_juste(2, 2.5), 'correct'),
     spec('Angle 3 : construite', 0, {'k': 3}, bissectrice_juste(3), 'correct'),
     spec('Erreur : droite par O et le milieu de [AB], à l\'œil', 0, {'k': 1},
          bissectrice_oeil(1), 'incorrect'),
     spec('Erreur : rien de tracé', 0, {'k': 2}, '', 'empty')],
    delay=240))

# --- 6. 6-166 : construire la médiatrice — TÉMOIN droite à construire ----------------------------
# Trois segments (k), papier uni ; deux cercles de rayon AB centrés en A et B.

SEGMENTS_166 = {1: ((3, 4), (6, 5)), 2: ((2.5, 3), (7, 3)), 3: ((4, 2), (5.5, 6))}


def corps_166(k):
    a, b = SEGMENTS_166[k]
    return '\n'.join(['A = point(' + n(a[0]) + ', ' + n(a[1]) + ')',
                      'B = point(' + n(b[0]) + ', ' + n(b[1]) + ')'])


def mediatrice_juste(k):
    a, b = SEGMENTS_166[k]
    r = math.hypot(b[0] - a[0], b[1] - a[1])
    p, q = inter_cercles(a, r, b, r)
    return '|'.join([cercle(a, b), cercle(b, a), droite(p, q)])


def mediatrice_hors_milieu(k):
    """Perpendiculaire à [AB] par A, tracée à l'œil."""
    a, b = SEGMENTS_166[k]
    return droite(a, rot(b, a, 90))


MODELES.append(modele(
    '06-construire-la-mediatrice', 'Construire la médiatrice d\'un segment',
    'Au compas et à la règle : deux cercles de même rayon centrés aux extrémités du segment se'
    ' coupent en deux points de la médiatrice',
    4,
    [variation('Construis la médiatrice du segment $[AB]$ avec le compas et la règle.'
               + a_completer('0 ; 10 ; 0 ; 8', 'droite m = mediatrice(A, B)',
                             [si3('k', corps_166(1), corps_166(2), corps_166(3)),
                              'segment(A, B)']),
               [var('k', '1..3')], [],
               ['**Deux cercles de même rayon**, centrés en $A$ et en $B$ (par exemple de rayon'
                ' $AB$), se coupent en deux points $P$ et $Q$.',
                '$P$ et $Q$ sont chacun à égale distance de $A$ et de $B$ : ils sont sur la'
                ' médiatrice. La droite $' + col('(PQ)') + '$ est la médiatrice de $[AB]$.'])],
    [spec('Segment 1 : deux cercles de rayon AB, droite (PQ)', 0, {'k': 1}, mediatrice_juste(1),
          'correct'),
     spec('Segment 2 : construite', 0, {'k': 2}, mediatrice_juste(2), 'correct'),
     spec('Segment 3 : construite', 0, {'k': 3}, mediatrice_juste(3), 'correct'),
     spec('Erreur : perpendiculaire par A, à l\'œil', 0, {'k': 2}, mediatrice_hors_milieu(2),
          'incorrect'),
     spec('Erreur : les cercles sans la droite', 0, {'k': 1},
          '|'.join(mediatrice_juste(1).split('|')[:2]), 'incorrect')],
    delay=240))

os.makedirs(DOSSIER, exist_ok=True)
for nom, m in MODELES:
    with open(os.path.join(DOSSIER, nom + '.json'), 'w', encoding='utf-8') as f:
        json.dump(m, f, ensure_ascii=False, indent='\t')
        f.write('\n')
subprocess.run(['pnpm', 'exec', 'prettier', '--write', DOSSIER], check=True,
               stdout=subprocess.DEVNULL)
print(f'{len(MODELES)} modèles écrits dans {DOSSIER}')
