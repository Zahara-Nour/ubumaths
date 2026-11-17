"""Écrit les 9 modèles du lot 13 « Triangles : droites remarquables » de la 5e dans
scripts/questions/5-triangles/.

Phase 0 validée par David le 2026-11-15 (§ 28 et 28 bis du journal `docs/wip/questions-5-progress.md`).
Bornes : `cycle4.json`, 5e (5-057 : alternes-internes et correspondants seulement, réciproques
comprises ; 5-060 : le triangle rectangle inscrit dans un demi-cercle est observé et admis, démontré en
4e). Le nœud et le tag sont posés par la migration de rangement, après le `--publier` de David.

Décisions et pièges :
- 057 en deux modèles (reconnaître, puis utiliser et la réciproque) ;
- les figures d'angles (01, 02) sont écrites dans le langage des figures avec cos / sin (degrés par
  défaut) : la sécante fait l'angle {{a}} avec (d), la mesure dessinée est celle de l'énoncé ;
- 04, 05 : les trois points de (BC) s'appellent D, E, F dans l'ordre de la droite, pour que la lettre
  ne trahisse ni le pied (H) ni le milieu (M) : seuls les codages (angle droit, traits) disent qui est
  qui ;
- 08, 09 : quadrillage seulement (sur papier uni, la droite à construire n'accepte que médiatrice et
  bissectrice) ; sommets, pied de la hauteur et milieu sur des nœuds ;
- bonne réponse d'un choix toujours par une variable (`eval:` + indicatrices `lag`) ; les choix sont
  mélangés à l'affichage, le corrigé nomme la bonne réponse, jamais son rang.

    python3 docs/wip/questions/lot-5-triangles.py scripts/questions
"""
import json
import math
import os
import subprocess
import sys

RACINE = sys.argv[1]
DOSSIER = os.path.join(RACINE, '5-triangles')


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


def colm(texte, maths):
    """Mots puis formule colorés ensemble : « le sommet A »."""
    return '$' + col('\\text{' + texte + '}' + maths) + '$'


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


def figure(fenetre, description, lignes, tete=None):
    return ('\n\n```figure\nfenetre: ' + fenetre + '\n' + ''.join(t + '\n' for t in (tete or []))
            + 'description: ' + description + '\n---\n' + '\n'.join(lignes) + '\n```\n\n')


def a_completer(fenetre, verifier, lignes, tete=None):
    return ('\n\n```figure-a-completer\nfenetre: ' + fenetre + '\n'
            + ''.join(t + '\n' for t in (tete or [])) + 'verifier: ' + verifier
            + '\n---\n' + '\n'.join(lignes) + '\n```')


def deg(x):
    return x + '^\\circ'


# --- Géométrie (calculs des figures et des réponses d'essai) --------------------------------------

def n(x):
    """Nombre écrit dans une figure ou une réponse : 3 décimales au plus, sans « -0 »."""
    x = round(x + 0.0, 3)
    if abs(x - round(x)) < 1e-9:
        return str(int(round(x)))
    return repr(x)


def pt(nom, p, etiquette=None, visible=True):
    args = n(p[0]) + ', ' + n(p[1])
    if etiquette:
        args += ', etiquette="' + etiquette + '"'
    if not visible:
        args += ', visible=faux'
    return nom + ' = point(' + args + ')'


def milieu(p, q):
    return ((p[0] + q[0]) / 2, (p[1] + q[1]) / 2)


def pied(a, b, c):
    """Pied de la perpendiculaire à (BC) passant par A."""
    dx, dy = c[0] - b[0], c[1] - b[1]
    t = ((a[0] - b[0]) * dx + (a[1] - b[1]) * dy) / (dx * dx + dy * dy)
    return (b[0] + t * dx, b[1] + t * dy)


def le_long(b, c, t):
    return (b[0] + t * (c[0] - b[0]), b[1] + t * (c[1] - b[1]))


def droite_rep(p, q):
    return 'droite(' + ';'.join(n(x) for x in (p[0], p[1], q[0], q[1])) + ')'


def perp_par(p, b, c):
    """Deux points de la perpendiculaire à (BC) passant par p."""
    dx, dy = c[0] - b[0], c[1] - b[1]
    return p, (p[0] - dy, p[1] + dx)


def angle_en(v, p, q):
    """Mesure en degrés de l'angle pVq."""
    a1 = math.atan2(p[1] - v[1], p[0] - v[0])
    a2 = math.atan2(q[1] - v[1], q[0] - v[0])
    d = abs(a1 - a2) * 180 / math.pi
    return 360 - d if d > 180 else d


def etiq(v, centre):
    """Étiquette d'un sommet, à l'opposé du centre du triangle."""
    dx, dy = v[0] - centre[0], v[1] - centre[1]
    h = 'haut' if dy > 0.3 else ('bas' if dy < -0.3 else '')
    l = 'droite' if dx > 0.3 else ('gauche' if dx < -0.3 else '')
    return '-'.join(x for x in (h, l) if x) or 'haut'


def fenetre_de(points, marge=0.9):
    xs, ys = [p[0] for p in points], [p[1] for p in points]
    return (n(min(xs) - marge) + ' ; ' + n(max(xs) + marge) + ' ; ' + n(min(ys) - marge) + ' ; '
            + n(max(ys) + marge))


MODELES = []

# --- 1. 5-057 : reconnaître des angles alternes-internes, correspondants ------------------------
# (d) horizontale en y = 1,5 ; (d') par F, parallèle (p = 1) ou un peu penchée (p = 2) ; la sécante (t)
# passe par E(0 ; 1,5) et F(fx ; −1,5), penchée à gauche (s = 1) ou à droite (s = 2).
# Les quatre angles en E et en F : hd, hg, bg, bd (haut / bas, droite / gauche).
# k : 1 alternes-internes (E bd, F hg) · 2 correspondants (E hd, F hd) · 3 ni l'un ni l'autre
# (E bd, F hd : du même côté, entre les droites) · 4 alternes-internes (E bg, F hd) ·
# 5 correspondants (E bg, F bg) · 6 ni l'un ni l'autre (E hg, F hd).

COINS_E = {'hd': 'D2, E, T1', 'hg': 'T1, E, D1', 'bg': 'D1, E, F', 'bd': 'F, E, D2'}
COINS_F = {'hd': 'G2, F, E', 'hg': 'E, F, G1', 'bg': 'G1, F, T2', 'bd': 'T2, F, G2'}
PAIRES_057 = [('bd', 'hg'), ('hd', 'hd'), ('bd', 'hd'), ('bg', 'hd'), ('bg', 'bg'), ('hg', 'hd')]
TYPES_057 = ['alternes-internes', 'correspondants', 'ni alternes-internes ni correspondants',
             'alternes-internes', 'correspondants', 'ni alternes-internes ni correspondants']

CORPS_057 = [
    'E = point(0, 1.5, visible=faux)',
    'F = point(({{fx}}), -1.5, visible=faux)',
    'D1 = point(-6, 1.5, visible=faux)',
    'D2 = point(6, 1.5, visible=faux)',
    'G1 = point(-6, -1.5 + (-6 - ({{fx}}))*{{m}}, visible=faux)',
    'G2 = point(6, -1.5 + (6 - ({{fx}}))*{{m}}, visible=faux)',
    'T1 = point(-0.9*({{fx}}), 4.2, visible=faux)',
    'T2 = point(1.9*({{fx}}), -4.2, visible=faux)',
    'droite(D1, D2)', 'droite(G1, G2)', 'droite(T1, T2)',
    'texte(-5.2, 1.85, "(d)")',
    'texte(-5.2, -1.15 + (-5.2 - ({{fx}}))*{{m}}, "(d\')")',
    'texte(-0.9*({{fx}}) + 0.45, 4.1, "(t)")',
    'angle(' + selon('k', [COINS_E[e] for e, _ in PAIRES_057]) + ', couleur="bleu")',
    'angle(' + selon('k', [COINS_F[f] for _, f in PAIRES_057]) + ', couleur="rouge")']

ETAPES_057 = [
    '**Deux droites $(d)$ et $(d\')$ coupées par une sécante $(t)$.** Deux angles sont'
    ' **alternes-internes** s\'ils sont **entre** $(d)$ et $(d\')$ et **de part et d\'autre** de $(t)$.'
    ' Ils sont **correspondants** s\'ils sont **du même côté** de $(t)$ et placés de la même façon :'
    ' l\'un au-dessus de $(d)$, l\'autre au-dessus de $(d\')$ (ou les deux en dessous).',
    selon('k', [
        'L\'angle bleu et l\'angle rouge sont entre les deux droites, de part et d\'autre de la'
        ' sécante : ils sont ' + colt('alternes-internes') + '.',
        'L\'angle bleu et l\'angle rouge sont du même côté de la sécante, tous deux au-dessus de leur'
        ' droite : ils sont ' + colt('correspondants') + '.',
        'Ils sont entre les deux droites, mais **du même côté** de la sécante : ils ne sont '
        + colt('ni alternes-internes ni correspondants') + '.',
        'L\'angle bleu et l\'angle rouge sont entre les deux droites, de part et d\'autre de la'
        ' sécante : ils sont ' + colt('alternes-internes') + '.',
        'L\'angle bleu et l\'angle rouge sont du même côté de la sécante, tous deux en dessous de leur'
        ' droite : ils sont ' + colt('correspondants') + '.',
        'L\'angle bleu est au-dessus de $(d)$, l\'angle rouge au-dessus de $(d\')$, mais ils ne sont'
        ' pas du même côté de la sécante : ils ne sont '
        + colt('ni alternes-internes ni correspondants') + '.']),
    'Le nom dépend seulement de la **position** des angles : les droites $(d)$ et $(d\')$ n\'ont pas'
    ' besoin d\'être parallèles.']

MODELES.append(modele(
    '01-angles-alternes-internes-correspondants',
    'Reconnaître des angles alternes-internes ou correspondants',
    'Deux droites coupées par une sécante : dire si deux angles marqués sont alternes-internes,'
    ' correspondants, ou ni l\'un ni l\'autre',
    1,
    [variation('Les droites $(d)$ et $(d\')$ sont coupées par la sécante $(t)$.'
               + figure('-6 ; 6 ; -4.6 ; 4.6',
                        'Deux droites (d) et (d\') coupées par une sécante (t) ; un angle bleu en'
                        ' haut, un angle rouge en bas.',
                        CORPS_057)
               + 'L\'angle bleu et l\'angle rouge sont :'
               + choix(['alternes-internes', 'correspondants',
                        'ni alternes-internes ni correspondants'], melanger=False),
               [var('k', '1..6'), var('s', '1..2'), var('p', '1..2'),
                var('fx', 'eval:3.2*s-4.8'), var('m', 'eval:0.12*(p-1)'),
                var('j', 'eval:' + lag('k', [0, 1, 2, 0, 1, 2]))],
               ['{{j}}'], ETAPES_057)],
    [spec('Alternes-internes (E bas-droite, F haut-gauche)', 0,
          {'k': 1, 's': 1, 'p': 1, 'fx': -1.6, 'm': 0, 'j': 0}, '0', 'correct'),
     spec('Erreur : correspondants au lieu d\'alternes-internes', 0,
          {'k': 1, 's': 1, 'p': 1, 'fx': -1.6, 'm': 0, 'j': 0}, '1', 'incorrect'),
     spec('Correspondants (haut-droite), droites non parallèles', 0,
          {'k': 2, 's': 2, 'p': 2, 'fx': 1.6, 'm': 0.12, 'j': 1}, '1', 'correct'),
     spec('Ni l\'un ni l\'autre (même côté, entre les droites)', 0,
          {'k': 3, 's': 1, 'p': 1, 'fx': -1.6, 'm': 0, 'j': 2}, '2', 'correct'),
     spec('Erreur : alternes-internes quand ils sont du même côté', 0,
          {'k': 3, 's': 1, 'p': 1, 'fx': -1.6, 'm': 0, 'j': 2}, '0', 'incorrect'),
     spec('Alternes-internes (E bas-gauche, F haut-droite)', 0,
          {'k': 4, 's': 2, 'p': 1, 'fx': 1.6, 'm': 0, 'j': 0}, '0', 'correct'),
     spec('Correspondants (bas-gauche)', 0,
          {'k': 5, 's': 1, 'p': 2, 'fx': -1.6, 'm': 0.12, 'j': 1}, '1', 'correct'),
     spec('Ni l\'un ni l\'autre (au-dessus, côtés opposés)', 0,
          {'k': 6, 's': 2, 'p': 1, 'fx': 1.6, 'm': 0, 'j': 2}, '2', 'correct'),
     spec('Erreur : correspondants (tous deux au-dessus, mais pas du même côté)', 0,
          {'k': 6, 's': 2, 'p': 1, 'fx': 1.6, 'm': 0, 'j': 2}, '1', 'incorrect')],
    delay=60))

# --- 2. 5-057 : angles et droites parallèles --------------------------------------------------------
# La sécante passe par E(0 ; 1,5) et fait l'angle a avec (d) ; F sur la droite y = −1,5.
# q = 1 : bleu en E bas-gauche (D1, E, F), rouge en F haut-droite (G2, F, E) → alternes-internes ;
# q = 2 : bleu en E haut-droite (D2, E, T1), rouge en F haut-droite → correspondants.
# v2 : (d') tournée autour de F de a − b degrés : l'angle rouge mesure b.

def corps_057b(rouge):
    return [
    'E = point(0, 1.5, visible=faux)',
    'F = point(-3*cos({{a}})/sin({{a}}), -1.5, visible=faux)',
    'D1 = point(-6, 1.5, visible=faux)',
    'D2 = point(6, 1.5, visible=faux)',
    'T1 = point(4*cos({{a}}), 1.5 + 4*sin({{a}}), visible=faux)',
    'H2 = point(-3*cos({{a}})/sin({{a}}) + 6, -1.5, visible=faux)',
    'G2 = rotation(H2, angle={{a}} - {{b}}, centre=F, visible=faux)',
    'G1 = rotation(G2, angle=180, centre=F, visible=faux)',
    'droite(D1, D2)', 'droite(G1, G2)', 'droite(E, F)',
    'texte(-5.4, 1.85, "(d)")',
    'texte(-5.4, -1.15, "(d\')")',
    'angle(' + si('q==1', COINS_E['bg'], COINS_E['hd']) + ', couleur="bleu")',
    'angle(G2, F, E, couleur="rouge")',
    'texte(' + si('q==1', '-1.4*cos({{a}}/2), 1.5 - 1.4*sin({{a}}/2)',
                  '1.4*cos({{a}}/2), 1.5 + 1.4*sin({{a}}/2)')
    + ', "{{a}}°", couleur="bleu")',
    'texte(-3*cos({{a}})/sin({{a}}) + 1.4*cos({{a}}/2), -1.5 + 1.4*sin({{a}}/2), "'
    + rouge + '", couleur="rouge")']

TYPE_057B = si('q==1', 'alternes-internes', 'correspondants')

MODELES.append(modele(
    '02-angles-et-droites-paralleles', 'Angles et droites parallèles',
    'Deux droites parallèles coupées par une sécante : les angles alternes-internes ou correspondants'
    ' ont la même mesure ; réciproque : deux tels angles de même mesure, les droites sont parallèles',
    2,
    [variation('Les droites $(d)$ et $(d\')$ sont **parallèles**.'
               + figure('-6 ; 6 ; -3.8 ; 4.4',
                        'Deux droites parallèles (d) et (d\') coupées par une sécante ; un angle bleu'
                        ' de {{a}} degrés et un angle rouge de mesure inconnue.',
                        corps_057b('?'))
               + 'Combien mesure l\'angle rouge ?\n\n$\\text{angle rouge} = ' + deg('?') + '$',
               [var('q', '1..2'), var('u', '40..80'), var('g', '1..2'),
                var('a', 'eval:u+60*(g-1)'), var('b', 'eval:a')],
               ['{{a}}'],
               ['Les angles bleu et rouge sont ' + colt(TYPE_057B)
                + ' : ' + si('q==1', 'entre les deux droites, de part et d\'autre de la sécante',
                             'du même côté de la sécante, chacun au-dessus de sa droite') + '.',
                '**Propriété.** Si deux droites parallèles sont coupées par une sécante, les angles'
                ' ' + TYPE_057B + ' qu\'elles forment ont la même mesure.',
                'L\'angle rouge mesure donc $' + col(deg('{{a}}')) + '$.']),
     variation('Les droites $(d)$ et $(d\')$ sont coupées par une sécante. On a mesuré deux angles.'
               + figure('-6 ; 6 ; -3.8 ; 4.4',
                        'Deux droites (d) et (d\') coupées par une sécante ; un angle bleu de {{a}}'
                        ' degrés et un angle rouge de {{b}} degrés.',
                        corps_057b('{{b}}°'))
               + 'Les droites $(d)$ et $(d\')$ sont-elles parallèles ?'
               + choix(['oui', 'non', 'on ne peut pas savoir'], melanger=False),
               [var('q', '1..2'), var('u', '45..75'), var('g', '1..2'),
                var('a', 'eval:u+60*(g-1)'), var('z', '1..2'), var('w', '3..6'),
                var('b', 'eval:a+(z-1)*w'), var('j', 'eval:z-1')],
               ['{{j}}'],
               ['Les angles bleu et rouge sont ' + TYPE_057B + ' ('
                + si('q==1', 'entre les deux droites, de part et d\'autre de la sécante',
                     'du même côté de la sécante, chacun au-dessus de sa droite') + ').',
                si('z==1',
                   '**Propriété réciproque.** Si deux droites coupées par une sécante forment deux angles '
                   + TYPE_057B + ' de même mesure, alors elles sont parallèles. Ici, les deux angles'
                   ' mesurent $' + deg('{{a}}') + '$ : ' + colt('oui') + ', $(d)$ et $(d\')$ sont'
                   ' parallèles.',
                   'Si $(d)$ et $(d\')$ étaient parallèles, ces deux angles auraient la même mesure. Or $'
                   + deg('{{a}}') + ' \\neq ' + deg('{{b}}') + '$ : ' + colt('non') + ', les droites'
                   ' ne sont pas parallèles.')])],
    [spec('Alternes-internes, 50°', 0, {'q': 1, 'u': 50, 'g': 1, 'a': 50, 'b': 50}, '50',
          'correct'),
     spec('Erreur : 180 − 50 = 130', 0, {'q': 1, 'u': 50, 'g': 1, 'a': 50, 'b': 50}, '130',
          'incorrect'),
     spec('Correspondants, 115°', 0, {'q': 2, 'u': 55, 'g': 2, 'a': 115, 'b': 115}, '115',
          'correct'),
     spec('Erreur : 180 − 115 = 65', 0, {'q': 2, 'u': 55, 'g': 2, 'a': 115, 'b': 115},
          '65', 'incorrect'),
     spec('Réciproque : 62° et 62°, parallèles', 1,
          {'q': 1, 'u': 62, 'g': 1, 'a': 62, 'z': 1, 'w': 4, 'b': 62, 'j': 0}, '0',
          'correct'),
     spec('Erreur : « on ne peut pas savoir » alors que la réciproque conclut', 1,
          {'q': 1, 'u': 62, 'g': 1, 'a': 62, 'z': 1, 'w': 4, 'b': 62, 'j': 0}, '2',
          'incorrect'),
     spec('118° et 122°, pas parallèles', 1,
          {'q': 2, 'u': 58, 'g': 2, 'a': 118, 'z': 2, 'w': 4, 'b': 122, 'j': 1}, '1',
          'correct'),
     spec('Erreur : oui, à l\'œil', 1,
          {'q': 2, 'u': 58, 'g': 2, 'a': 118, 'z': 2, 'w': 4, 'b': 122, 'j': 1}, '0',
          'incorrect')],
    delay=90))

# --- 3. 5-060 : cercle circonscrit d'un triangle particulier --------------------------------------
# Les sommets s'appellent selon k : l'angle droit (v1) ou le sommet principal (v3) en A, B ou C.

NOMS = {1: ('A', 'B', 'C'), 2: ('B', 'C', 'A'), 3: ('C', 'A', 'B')}  # (R, P, Q)


def tourne(p, t):
    c, s = math.cos(t * math.pi / 180), math.sin(t * math.pi / 180)
    return (p[0] * c - p[1] * s, p[0] * s + p[1] * c)


def triangle_rectangle(k):
    """Triangle rectangle en R, centré sur le milieu de l'hypoténuse."""
    p, q = (5, 0), (0, 3.4)
    o = milieu(p, q)
    rot = [0, 25, -20][k - 1]
    return [tourne((x[0] - o[0], x[1] - o[1]), rot) for x in ((0, 0), p, q)]


def corps_rectangle(k):
    r, p, q = triangle_rectangle(k)
    nr, np_, nq = NOMS[k]
    c = ((r[0] + p[0] + q[0]) / 3, (r[1] + p[1] + q[1]) / 3)
    return '\n'.join([pt(nr, r, etiq(r, c)), pt(np_, p, etiq(p, c)), pt(nq, q, etiq(q, c)),
                      'triangle(' + nr + ', ' + np_ + ', ' + nq + ')',
                      'angle(' + np_ + ', ' + nr + ', ' + nq + ', marque="carre")',
                      'cercle_circonscrit(' + nr + ', ' + np_ + ', ' + nq + ', couleur="bleu")'])


def triangle_isocele(k):
    sommet, b, c = (0, 3.2), (-2.2, -1.2), (2.2, -1.2)
    rot = [0, 30, -35][k - 1]
    return [tourne(x, rot) for x in (sommet, b, c)]


def corps_isocele(k, avec_hauteur=False):
    s, b, c = triangle_isocele(k)
    ns, nb, nc = NOMS[k]
    g = ((s[0] + b[0] + c[0]) / 3, (s[1] + b[1] + c[1]) / 3)
    lignes = [pt(ns, s, etiq(s, g)), pt(nb, b, etiq(b, g)), pt(nc, c, etiq(c, g)),
              'triangle(' + ns + ', ' + nb + ', ' + nc + ')',
              'marque_segment(' + ns + ', ' + nb + ')', 'marque_segment(' + ns + ', ' + nc + ')']
    if avec_hauteur:
        h = milieu(b, c)
        lignes += [pt('H', h, etiq(h, s)),
                   'segment(' + ns + ', H, couleur="bleu")',
                   'angle(' + ns + ', H, ' + nc + ', marque="carre")']
    return '\n'.join(lignes)


R_, P_, Q_ = (selon('k', [NOMS[i][j] for i in (1, 2, 3)]) for j in range(3))

MODELES.append(modele(
    '03-cercle-circonscrit-triangle-particulier',
    'Cercle circonscrit d\'un triangle particulier',
    'Le centre du cercle circonscrit d\'un triangle rectangle est le milieu de l\'hypoténuse (observé,'
    ' admis) ; dans un triangle isocèle, la médiatrice de la base passe par le sommet principal',
    2,
    [variation('Le triangle $' + R_ + P_ + Q_ + '$ est rectangle en $' + R_ + '$. On a tracé son cercle'
               ' circonscrit.'
               + figure('-3.6 ; 3.6 ; -3.4 ; 3.4',
                        'Un triangle rectangle et son cercle circonscrit, en bleu ; le centre du'
                        ' cercle n\'est pas marqué.',
                        [selon('k', [corps_rectangle(i) for i in (1, 2, 3)])])
               + 'Où se trouve le centre de ce cercle ?'
               + choix(['au milieu du côté $[' + P_ + Q_ + ']$',
                        'au sommet $' + R_ + '$',
                        'au milieu du côté $[' + R_ + P_ + ']$',
                        'à l\'intérieur du triangle, sur aucun côté']),
               [var('k', '1..3')], ['0'],
               ['Le côté opposé à l\'angle droit, $[' + P_ + Q_ + ']$, est l\'**hypoténuse**.',
                '**Le centre du cercle circonscrit à un triangle rectangle est le milieu de son'
                ' hypoténuse** (on l\'observe sur la figure ; on le démontrera en 4e).',
                'Le centre est ' + colm('au milieu de ', '[' + P_ + Q_ + ']') + '.']),
     variation('Le triangle $ABC$ est rectangle en $A$, et $BC = {{c}}~\\unit{cm}$.\n\nQuel est le'
               ' rayon de son cercle circonscrit ?\n\n$\\text{rayon} = ?~\\text{cm}$',
               [var('h', '3..7'), var('c', 'eval:2*h')], ['{{h}}'],
               ['**Le centre du cercle circonscrit à un triangle rectangle est le milieu de son'
                ' hypoténuse.** Ici, l\'hypoténuse est $[BC]$ (le côté opposé à l\'angle droit).',
                'Le rayon est donc la moitié de l\'hypoténuse : $\\dfrac{{{c}}}{2} = '
                + col('{{h}}~\\unit{cm}') + '$.']),
     variation('Le triangle $' + R_ + P_ + Q_ + '$ est isocèle en $' + R_ + '$.'
               + figure('-3.6 ; 3.6 ; -3 ; 4',
                        'Un triangle isocèle, ses deux côtés égaux codés.',
                        [selon('k', [corps_isocele(i) for i in (1, 2, 3)])])
               + 'La médiatrice du côté $[' + P_ + Q_ + ']$ passe par :'
               + choix(['le sommet $' + R_ + '$', 'le milieu de $[' + R_ + P_ + ']$',
                        'le sommet $' + P_ + '$', 'aucun sommet du triangle']),
               [var('k', '1..3')], ['0'],
               ['**La médiatrice d\'un segment** est formée des points à égale distance de ses deux'
                ' extrémités.',
                'Le triangle est isocèle en $' + R_ + '$ : $' + R_ + P_ + ' = ' + R_ + Q_ + '$. Le'
                ' point $' + R_ + '$ est à égale distance de $' + P_ + '$ et de $' + Q_ + '$ : la'
                ' médiatrice de $[' + P_ + Q_ + ']$ passe par ' + colm('le sommet ', R_) + '.'])],
    [spec('Rectangle en A : milieu de [BC]', 0, {'k': 1}, '0', 'correct'),
     spec('Erreur : le sommet de l\'angle droit', 0, {'k': 2}, '1', 'incorrect'),
     spec('Erreur : à l\'intérieur', 0, {'k': 3}, '3', 'incorrect'),
     spec('BC = 10 : rayon 5', 1, {'h': 5, 'c': 10}, '5', 'correct'),
     spec('Erreur : le rayon pris égal à l\'hypoténuse', 1, {'h': 5, 'c': 10}, '10', 'incorrect'),
     spec('Isocèle en A : par A', 2, {'k': 1}, '0', 'correct'),
     spec('Erreur : par le milieu d\'un côté égal', 2, {'k': 3}, '1', 'incorrect')],
    delay=90))

# --- 4 et 5. 5-062, 5-064 : quelle est la hauteur, la médiane issue de A ? -------------------------
# Trois points D, E, F sur (BC), nommés dans l'ordre de la droite : le pied H de la hauteur issue de
# A (angle droit codé), le milieu M de [BC] (traits codés), un point K quelconque. Le 4e segment est
# une autre hauteur (04) ou une autre médiane (05), issue d'un autre sommet.

def par_pied(b, c, th, h, tk):
    """Triangle dont le pied de la hauteur issue de A est en B + th·(C − B), à la hauteur h (A à
    gauche de (BC) orientée de B vers C). Les traits du milieu se posent aux quarts de [BC] : le
    pied et K s'en tiennent loin (codages lisibles, revue de l'aperçu du 2026-11-15)."""
    dx, dy = c[0] - b[0], c[1] - b[1]
    lg = math.hypot(dx, dy)
    f = (b[0] + th * dx, b[1] + th * dy)
    return ((f[0] - h * dy / lg, f[1] + h * dx / lg), b, c, tk)


TRIANGLES_ROTATION = {
    # pied en th (0..1 : aigu ; < 0 : obtus en B ; > 1 : obtus en C), K en tk
    'aigu1': par_pied((-3.5, 0), (3.5, 0), 0.62, 4.2, 0.1),
    'aigu2': par_pied((-3.4, 0.5), (3.6, -0.5), 0.38, 4.3, 0.9),
    'aigu3': par_pied((-3.2, -0.3), (3.8, 0.4), 0.88, 4, 0.64),
    'obtusB1': par_pied((-1.4, 0), (4.2, 0), -0.42, 3.6, 0.1),
    'obtusB2': par_pied((-1, 0.3), (4.2, -0.4), -0.55, 3.4, 0.12),
    'obtusC': par_pied((-4.2, 0), (1.4, 0), 1.42, 3.6, 0.1),
}


def decor(nom, sorte):
    """Lignes de la figure et lettre de la bonne réponse parmi D, E, F (et le sommet du 4e segment)."""
    a, b, c, tk = TRIANGLES_ROTATION[nom]
    h, m, kk = pied(a, b, c), milieu(b, c), le_long(b, c, tk)
    dx, dy = c[0] - b[0], c[1] - b[1]
    sur_bc = sorted([('H', h), ('M', m), ('K', kk)],
                    key=lambda x: (x[1][0] - b[0]) * dx + (x[1][1] - b[1]) * dy)
    lettres = {}
    for lettre, (role, p) in zip('DEF', sur_bc):
        lettres[role] = (lettre, p)
    g = ((a[0] + b[0] + c[0]) / 3, (a[1] + b[1] + c[1]) / 3)
    obtus_b = angle_en(b, a, c) > 90
    obtus_c = angle_en(c, a, b) > 90
    lignes = [pt('A', a, etiq(a, g)), pt('B', b, etiq(b, g)), pt('C', c, etiq(c, g)),
              'triangle(A, B, C)']
    for lettre, p in lettres.values():
        lignes.append(pt(lettre, p, 'bas'))
    lh = lettres['H'][0]
    # le pied hors de [BC] : prolonger le côté en pointillés
    if obtus_b:
        lignes.append('segment(' + lh + ', B, trait="pointilles")')
    if obtus_c:
        lignes.append('segment(C, ' + lh + ', trait="pointilles")')
    lignes.append('angle(A, ' + lh + ', ' + ('C' if not obtus_c else 'B') + ', marque="carre")')
    lm = lettres['M'][0]
    lignes += ['marque_segment(B, ' + lm + ')', 'marque_segment(' + lm + ', C)']
    for lettre, _ in lettres.values():
        lignes.append('segment(A, ' + lettre + ')')
    if sorte == 'hauteur':
        # hauteur issue du sommet X (l'obtus s'il y en a un, sinon B) : pied G sur (AY)
        x, nx, y, ny = (c, 'C', b, 'B') if obtus_c else (b, 'B', c, 'C')
        gp = pied(x, a, y)
        lignes += [pt('G', gp, etiq(gp, g)), 'segment(' + nx + ', G)',
                   'angle(' + nx + ', G, A, marque="carre")']
        bonne, autre = lettres['H'][0], nx
    else:
        # médiane issue de C : G milieu de [AB]
        gp = milieu(a, b)
        lignes += [pt('G', gp, etiq(gp, g)), 'segment(C, G)',
                   'marque_segment(A, G, traits=2)', 'marque_segment(G, B, traits=2)']
        bonne, autre = lettres['M'][0], 'C'
    toutes = [a, b, c, h, m, kk, gp]
    return '\n'.join(lignes), bonne, autre, fenetre_de(toutes)


def bloc_decor(noms, sorte, description):
    """Une figure par valeur de k ; fenêtre commune ; lettre juste et sommet du 4e segment par k."""
    decors = [decor(nm, sorte) for nm in noms]
    xs, ys = [], []
    for _, _, _, f in decors:
        x0, x1, y0, y1 = (float(v) for v in f.split(' ; '))
        xs += [x0, x1]
        ys += [y0, y1]
    fen = n(min(xs)) + ' ; ' + n(max(xs)) + ' ; ' + n(min(ys)) + ' ; ' + n(max(ys))
    fig = figure(fen, description, [selon('k', [d[0] for d in decors])])
    j = lag('k', ['DEF'.index(d[1]) for d in decors])
    autre = selon('k', [d[2] for d in decors])
    return fig, j, autre, decors


def var_k(nb):
    return var('k', '1..' + str(nb))


FIG_062_1, J_062_1, X_062_1, D_062_1 = bloc_decor(
    ['aigu1', 'aigu2', 'aigu3'], 'hauteur',
    'Un triangle ABC ; trois segments partent de A vers des points D, E, F de [BC] ; un quatrième'
    ' segment part d\'un autre sommet. Les angles droits et les longueurs égales sont codés.')
FIG_062_2, J_062_2, X_062_2, D_062_2 = bloc_decor(
    ['obtusB1', 'obtusB2', 'obtusC'], 'hauteur',
    'Un triangle ABC qui a un angle obtus ; trois segments partent de A vers des points D, E, F de'
    ' la droite (BC) ; un quatrième segment part d\'un autre sommet. Les angles droits et les'
    ' longueurs égales sont codés.')

CHOIX_DEF = ['$[AD]$', '$[AE]$', '$[AF]$']


def lettre_juste(decors):
    return selon('k', [d[1] for d in decors])


MODELES.append(modele(
    '04-quelle-est-la-hauteur', 'Quelle est la hauteur issue de A ?',
    'Reconnaître la hauteur issue d\'un sommet parmi plusieurs segments codés : elle part du sommet et'
    ' est perpendiculaire au côté opposé (ou à son prolongement)',
    3,
    [variation('Voici un triangle $ABC$.' + FIG_062_1
               + 'Quel segment est la **hauteur issue de $A$** ?'
               + choix(CHOIX_DEF + ['$[' + X_062_1 + 'G]$']),
               [var_k(3), var('j', 'eval:' + J_062_1)], ['{{j}}'],
               ['**La hauteur issue de $A$** est le segment qui part de $A$ et qui est'
                ' **perpendiculaire** au côté opposé $[BC]$.',
                '$[' + X_062_1 + 'G]$ est bien une hauteur, mais issue de $' + X_062_1 + '$. Le'
                ' segment qui joint $A$ au milieu de $[BC]$ est une médiane.',
                'La hauteur issue de $A$ est ' + '$' + col('[A' + lettre_juste(D_062_1) + ']')
                + '$ : l\'angle droit est codé en $' + lettre_juste(D_062_1) + '$.']),
     variation('Le triangle $ABC$ a un angle obtus.' + FIG_062_2
               + 'Quel segment est la **hauteur issue de $A$** ?'
               + choix(CHOIX_DEF + ['$[' + X_062_2 + 'G]$']),
               [var_k(3), var('j', 'eval:' + J_062_2)], ['{{j}}'],
               ['**La hauteur issue de $A$** part de $A$ et est **perpendiculaire à la droite'
                ' $(BC)$**. Quand le triangle a un angle obtus en $B$ ou en $C$, son pied est **hors**'
                ' du segment $[BC]$, sur son prolongement (en pointillés).',
                'La hauteur issue de $A$ est $' + col('[A' + lettre_juste(D_062_2) + ']')
                + '$ : l\'angle droit est codé en $' + lettre_juste(D_062_2) + '$.'])],
    [spec('Aigu 1 : la bonne lettre', 0, {'k': 1, 'j': 'DEF'.index(D_062_1[0][1])},
          str('DEF'.index(D_062_1[0][1])), 'correct'),
     spec('Erreur aigu 1 : la médiane', 0, {'k': 1, 'j': 'DEF'.index(D_062_1[0][1])},
          str([c for c in range(3) if c != 'DEF'.index(D_062_1[0][1])][0]), 'incorrect'),
     spec('Erreur aigu 2 : la hauteur issue de B', 0, {'k': 2, 'j': 'DEF'.index(D_062_1[1][1])},
          '3', 'incorrect'),
     spec('Aigu 3 : la bonne lettre', 0, {'k': 3, 'j': 'DEF'.index(D_062_1[2][1])},
          str('DEF'.index(D_062_1[2][1])), 'correct'),
     spec('Obtus en B : pied sur le prolongement', 1, {'k': 1, 'j': 'DEF'.index(D_062_2[0][1])},
          str('DEF'.index(D_062_2[0][1])), 'correct'),
     spec('Obtus en C : pied sur le prolongement', 1, {'k': 3, 'j': 'DEF'.index(D_062_2[2][1])},
          str('DEF'.index(D_062_2[2][1])), 'correct'),
     spec('Erreur obtus : la hauteur issue de l\'autre sommet', 1,
          {'k': 2, 'j': 'DEF'.index(D_062_2[1][1])}, '3', 'incorrect')],
    delay=90))

FIG_064, J_064, X_064, D_064 = bloc_decor(
    ['aigu3', 'obtusB1', 'aigu2'], 'mediane',
    'Un triangle ABC ; trois segments partent de A vers des points D, E, F de la droite (BC) ; un'
    ' quatrième segment part de C. Les angles droits et les longueurs égales sont codés.')

MODELES.append(modele(
    '05-quelle-est-la-mediane', 'Quelle est la médiane issue de A ?',
    'Reconnaître la médiane issue d\'un sommet parmi plusieurs segments codés : elle joint le sommet'
    ' au milieu du côté opposé',
    4,
    [variation('Voici un triangle $ABC$.' + FIG_064
               + 'Quel segment est la **médiane issue de $A$** ?'
               + choix(CHOIX_DEF + ['$[CG]$']),
               [var_k(3), var('j', 'eval:' + J_064)], ['{{j}}'],
               ['**La médiane issue de $A$** est le segment qui joint $A$ au **milieu** du côté'
                ' opposé $[BC]$.',
                '$[CG]$ est bien une médiane, mais issue de $C$ ($G$ est le milieu de $[AB]$). Le'
                ' segment perpendiculaire à $(BC)$ est la hauteur issue de $A$.',
                'Le milieu de $[BC]$ est $' + lettre_juste(D_064) + '$ (traits codés) : la médiane'
                ' issue de $A$ est $' + col('[A' + lettre_juste(D_064) + ']') + '$.'])],
    [spec('Triangle 1 : la bonne lettre', 0, {'k': 1, 'j': 'DEF'.index(D_064[0][1])},
          str('DEF'.index(D_064[0][1])), 'correct'),
     spec('Triangle 2 (obtus) : la bonne lettre', 0, {'k': 2, 'j': 'DEF'.index(D_064[1][1])},
          str('DEF'.index(D_064[1][1])), 'correct'),
     spec('Erreur : la médiane issue de C', 0, {'k': 3, 'j': 'DEF'.index(D_064[2][1])}, '3',
          'incorrect'),
     spec('Erreur : un autre segment', 0, {'k': 1, 'j': 'DEF'.index(D_064[0][1])},
          str([c for c in range(3) if c != 'DEF'.index(D_064[0][1])][0]), 'incorrect')],
    delay=90))

# --- 6. 5-063 : les hauteurs sont concourantes ------------------------------------------------------

TRI_063 = [((0.8, 4.2), (-3.4, 0), (3.8, 0.2)), ((-1.2, 4), (-3.2, -0.4), (4, 0.4)),
           ((1.6, 4.4), (-3, 0.6), (3.6, -0.4))]


def corps_063(i):
    a, b, c = TRI_063[i]
    ha, hb = pied(a, b, c), pied(b, a, c)
    # orthocentre : intersection de (A ha) et (B hb)
    x1, y1, x2, y2 = a[0], a[1], ha[0], ha[1]
    x3, y3, x4, y4 = b[0], b[1], hb[0], hb[1]
    den = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4)
    px = ((x1 * y2 - y1 * x2) * (x3 - x4) - (x1 - x2) * (x3 * y4 - y3 * x4)) / den
    py = ((x1 * y2 - y1 * x2) * (y3 - y4) - (y1 - y2) * (x3 * y4 - y3 * x4)) / den
    g = ((a[0] + b[0] + c[0]) / 3, (a[1] + b[1] + c[1]) / 3)
    return '\n'.join([
        pt('A', a, etiq(a, g)), pt('B', b, etiq(b, g)), pt('C', c, etiq(c, g)),
        'triangle(A, B, C)',
        pt('I', ha, 'bas'), pt('J', hb, etiq(hb, g)),
        'segment(A, I, couleur="bleu")', 'segment(B, J, couleur="bleu")',
        'angle(A, I, C, marque="carre")', 'angle(B, J, C, marque="carre")',
        pt('H', (px, py), 'droite')])


NOMS_063 = [('A', 'B', 'C'), ('E', 'F', 'G'), ('R', 'S', 'T')]
X1, X2, X3 = (selon('k', [t[i] for t in NOMS_063]) for i in range(3))

MODELES.append(modele(
    '06-hauteurs-concourantes', 'Les hauteurs d\'un triangle sont concourantes',
    'Les trois hauteurs d\'un triangle se coupent en un même point : la troisième hauteur passe par'
    ' le point d\'intersection des deux autres et est perpendiculaire au troisième côté',
    5,
    [variation('Dans le triangle $ABC$, on a tracé en bleu la hauteur issue de $A$ et la hauteur'
               ' issue de $B$. Elles se coupent en $H$.'
               + figure('-4.2 ; 4.6 ; -1.2 ; 5.2',
                        'Un triangle ABC et deux de ses hauteurs, en bleu, qui se coupent en H.',
                        [selon('k', [corps_063(i) for i in range(3)])])
               + 'La hauteur issue de $C$ passe par :'
               + choix(['le point $H$', 'le milieu de $[AB]$', 'le point $A$',
                        'aucun de ces points']),
               [var('k', '1..3')], ['0'],
               ['**Les trois hauteurs d\'un triangle sont concourantes** : elles se coupent en un'
                ' même point.',
                'Les hauteurs issues de $A$ et de $B$ se coupent en $H$ : la hauteur issue de $C$'
                ' passe aussi par ' + colm('le point ', 'H') + '.']),
     variation('Dans un triangle $' + X1 + X2 + X3 + '$, le point $H$ est le point d\'intersection'
               ' de la hauteur issue de $' + X1 + '$ et de la hauteur issue de $' + X2 + '$.\n\n'
               'La droite $(' + X3 + 'H)$ est :'
               + choix(['perpendiculaire à $(' + X1 + X2 + ')$', 'parallèle à $(' + X1 + X2 + ')$',
                        'la médiatrice de $[' + X1 + X2 + ']$',
                        'la médiane issue de $' + X3 + '$']),
               [var('k', '1..3')], ['0'],
               ['**Les trois hauteurs d\'un triangle sont concourantes** : la hauteur issue de $'
                + X3 + '$ passe aussi par $H$. La droite $(' + X3 + 'H)$ porte donc cette hauteur.',
                'La hauteur issue de $' + X3 + '$ est perpendiculaire au côté opposé : $(' + X3
                + 'H)$ est ' + colt('perpendiculaire') + ' à $(' + X1 + X2 + ')$.'])],
    [spec('Par H', 0, {'k': 1}, '0', 'correct'),
     spec('Erreur : par le milieu de [AB]', 0, {'k': 2}, '1', 'incorrect'),
     spec('Erreur : aucun point', 0, {'k': 3}, '3', 'incorrect'),
     spec('(CH) perpendiculaire à (AB)', 1, {'k': 1}, '0', 'correct'),
     spec('Erreur : la médiatrice', 1, {'k': 2}, '2', 'incorrect'),
     spec('Erreur : la médiane', 1, {'k': 3}, '3', 'incorrect')],
    delay=90))

# --- 7. 5-066 : hauteurs et médianes des triangles particuliers -------------------------------------

S_, T_, U_ = R_, P_, Q_  # sommet principal (ou angle droit), puis les deux autres

MODELES.append(modele(
    '07-hauteurs-medianes-triangles-particuliers',
    'Hauteurs et médianes des triangles particuliers',
    'Triangle isocèle : la hauteur issue du sommet principal est aussi la médiane (son pied est le'
    ' milieu de la base) ; triangle rectangle : les côtés de l\'angle droit sont des hauteurs',
    6,
    [variation('Le triangle $ABC$ est isocèle en $A$, et $H$ est le pied de la hauteur issue de $A$.'
               + figure('-3.6 ; 3.6 ; -2.2 ; 4.2',
                        'Un triangle ABC isocèle en A et sa hauteur [AH], en bleu.',
                        [corps_isocele(1, avec_hauteur=True)])
               + 'On sait que $BC = {{c}}~\\unit{cm}$. Combien mesure $BH$ ?\n\n$BH = ?~\\text{cm}$',
               [var('h', '3..8'), var('c', 'eval:2*h')], ['{{h}}'],
               ['**Dans un triangle isocèle, la hauteur issue du sommet principal est aussi la'
                ' médiane** issue de ce sommet : son pied $H$ est le milieu de la base $[BC]$.',
                '$BH = \\dfrac{BC}{2} = \\dfrac{{{c}}}{2} = ' + col('{{h}}~\\unit{cm}') + '$.']),
     variation('Le triangle $' + S_ + T_ + U_ + '$ est isocèle en $' + S_ + '$.\n\nLa hauteur issue'
               ' de $' + S_ + '$ est aussi :'
               + choix(['la médiane issue de $' + S_ + '$', 'la médiane issue de $' + T_ + '$',
                        'la hauteur issue de $' + T_ + '$', 'aucune médiane du triangle']),
               [var('k', '1..3')], ['0'],
               ['**Dans un triangle isocèle, la hauteur issue du sommet principal est aussi la'
                ' médiane issue de ce sommet** : son pied est le milieu de la base $[' + T_ + U_
                + ']$.',
                'La hauteur issue de $' + S_ + '$ est aussi ' + colm('la médiane issue de ', S_) + '.']),
     variation('Le triangle $' + S_ + T_ + U_ + '$ est rectangle en $' + S_ + '$.\n\nLa hauteur'
               ' issue de $' + T_ + '$ est :'
               + choix(['le côté $[' + T_ + S_ + ']$', 'le côté $[' + T_ + U_ + ']$',
                        'un segment à l\'intérieur du triangle',
                        'un segment à l\'extérieur du triangle']),
               [var('k', '1..3')], ['0'],
               ['**La hauteur issue de $' + T_ + '$** part de $' + T_ + '$ et est perpendiculaire au'
                ' côté opposé $[' + S_ + U_ + ']$.',
                'Le triangle est rectangle en $' + S_ + '$ : $(' + T_ + S_ + ')$ est déjà'
                ' perpendiculaire à $(' + S_ + U_ + ')$. La hauteur issue de $' + T_ + '$ est le côté $'
                + col('[' + T_ + S_ + ']') + '$.'])],
    [spec('BC = 12 : BH = 6', 0, {'h': 6, 'c': 12}, '6', 'correct'),
     spec('Erreur : BH = BC', 0, {'h': 6, 'c': 12}, '12', 'incorrect'),
     spec('Isocèle en A : médiane issue de A', 1, {'k': 1}, '0', 'correct'),
     spec('Erreur : aucune médiane', 1, {'k': 2}, '3', 'incorrect'),
     spec('Rectangle en A : le côté [BA]', 2, {'k': 1}, '0', 'correct'),
     spec('Erreur : l\'hypoténuse', 2, {'k': 3}, '1', 'incorrect'),
     spec('Erreur : un segment intérieur', 2, {'k': 2}, '2', 'incorrect')],
    delay=90))

# --- 8 et 9. 5-131, 5-132 : tracer une hauteur, une médiane (quadrillage) ---------------------------
# Fenêtre 0..10 × 0..8, grille 1 ; sommets sur des nœuds ; le pied de la hauteur et le milieu de [BC]
# sur des nœuds.

FEN_Q = '0 ; 10 ; 0 ; 8'
TRI_131 = {  # (A, B, C) ; pieds vérifiés par verifie_quadrillage()
    1: ((3, 7), (5, 1), (8, 7)),    # aigu (72°, 45°, 63°), pied (7 ; 5)
    2: ((2, 3), (8, 1), (5, 7)),    # aigu, pied (6 ; 5)
    3: ((8, 6), (2, 4), (8, 1)),    # aigu, pied (6 ; 2)
    4: ((1, 5), (5, 2), (9, 4)),    # obtus en B (117°), pied (3 ; 1) hors de [BC]
    5: ((9, 5), (5, 3), (1, 7)),    # obtus en B (108°), pied (6 ; 2)
    6: ((9, 3), (6, 2), (1, 7)),    # obtus en B (117°), pied (7 ; 1)
}
TRI_132 = {
    1: ((1, 6), (8, 5), (2, 1)),    # M (5 ; 3)
    2: ((9, 3), (3, 7), (1, 1)),    # M (2 ; 4)
    3: ((3, 7), (3, 1), (9, 3)),    # M (6 ; 2)
}


def verifie_quadrillage():
    """Garde : sommets dans la fenêtre, pied de la hauteur et milieu sur des nœuds, triangle aigu
    ou obtus en B selon la variation, médiane distincte de la hauteur."""
    def noeud(p):
        return (abs(p[0] - round(p[0])) < 1e-9 and abs(p[1] - round(p[1])) < 1e-9
                and 0 <= p[0] <= 10 and 0 <= p[1] <= 8)
    for i, (a, b, c) in TRI_131.items():
        h = pied(a, b, c)
        assert noeud(h), ('131', i, h)
        angles = (angle_en(a, b, c), angle_en(b, a, c), angle_en(c, a, b))
        if i <= 3:
            assert max(angles) < 85, ('131 aigu', i, angles)
        else:
            assert angles[1] > 95, ('131 obtus en B', i, angles)
    for i, (a, b, c) in TRI_132.items():
        m = milieu(b, c)
        assert noeud(m), ('132', i, m)
        h = pied(a, b, c)
        assert math.hypot(h[0] - m[0], h[1] - m[1]) > 1, ('132 isocèle', i)


def corps_q(tri):
    a, b, c = tri
    g = ((a[0] + b[0] + c[0]) / 3, (a[1] + b[1] + c[1]) / 3)
    return '\n'.join([pt('A', a, etiq(a, g)), pt('B', b, etiq(b, g)), pt('C', c, etiq(c, g)),
                      'triangle(A, B, C)'])


verifie_quadrillage()


def hauteur_juste(tri):
    a, b, c = tri
    return droite_rep(a, pied(a, b, c))


def mediane_juste(tri):
    a, b, c = tri
    return droite_rep(a, milieu(b, c))


def mediatrice_bc(tri):
    a, b, c = tri
    return droite_rep(*perp_par(milieu(b, c), b, c))


ETAPES_131_1 = [
    '**La hauteur issue de $A$** est la droite qui passe par $A$ et qui est **perpendiculaire** au'
    ' côté opposé $(BC)$.',
    'On pose l\'équerre le long de $[BC]$ et on la fait glisser jusqu\'à $A$ (sur le quadrillage, on'
    ' peut aussi compter les carreaux : si $(BC)$ avance de $p$ carreaux et monte de $q$, la'
    ' perpendiculaire avance de $q$ et descend de $p$).',
    'On trace la droite qui passe par $A$ et par le pied $H$ : c\'est la '
    + colm('hauteur issue de ', 'A')
    + '.']
ETAPES_131_2 = ETAPES_131_1[:2] + [
    'Le triangle a un angle obtus en $B$ : le pied $H$ est **hors** du segment $[BC]$, sur son'
    ' prolongement. On prolonge $[BC]$, puis on trace la droite $(AH)$ : c\'est la '
    + colm('hauteur issue de ', 'A')
    + '.']

MODELES.append(modele(
    '08-tracer-une-hauteur', 'Tracer une hauteur d\'un triangle',
    'Sur quadrillage, à la règle et à l\'équerre : tracer la droite qui passe par un sommet et qui est'
    ' perpendiculaire au côté opposé, prolongé si le triangle a un angle obtus',
    7,
    [variation('Trace la **hauteur issue de $A$** du triangle $ABC$.'
               + a_completer(FEN_Q, 'droite h = hauteur(A, B, C)',
                             [selon('k', [corps_q(TRI_131[i]) for i in (1, 2, 3)])],
                             tete=['grille: 1', 'outils: droite, equerre']),
               [var('k', '1..3')], [], ETAPES_131_1),
     variation('Le triangle $ABC$ a un angle obtus en $B$. Trace la **hauteur issue de $A$**.'
               + a_completer(FEN_Q, 'droite h = hauteur(A, B, C)',
                             [selon('k', [corps_q(TRI_131[i]) for i in (4, 5, 6)])],
                             tete=['grille: 1', 'outils: droite, equerre']),
               [var('k', '1..3')], [], ETAPES_131_2)],
    [spec('Aigu 1 : (AH)', 0, {'k': 1}, hauteur_juste(TRI_131[1]), 'correct'),
     spec('Aigu 2 : (AH)', 0, {'k': 2}, hauteur_juste(TRI_131[2]), 'correct'),
     spec('Aigu 3 : (AH)', 0, {'k': 3}, hauteur_juste(TRI_131[3]), 'correct'),
     spec('Erreur : la médiane issue de A', 0, {'k': 1}, mediane_juste(TRI_131[1]), 'incorrect'),
     spec('Erreur : la médiatrice de [BC]', 0, {'k': 2}, mediatrice_bc(TRI_131[2]), 'incorrect'),
     spec('Obtus 1 : pied hors de [BC]', 1, {'k': 1}, hauteur_juste(TRI_131[4]), 'correct'),
     spec('Obtus 2', 1, {'k': 2}, hauteur_juste(TRI_131[5]), 'correct'),
     spec('Obtus 3', 1, {'k': 3}, hauteur_juste(TRI_131[6]), 'correct'),
     spec('Erreur obtus : perpendiculaire à (BC) passant par B', 1, {'k': 1},
          droite_rep(*perp_par(TRI_131[4][1], TRI_131[4][1], TRI_131[4][2])), 'incorrect'),
     spec('Erreur : rien de tracé', 1, {'k': 2}, '', 'empty')],
    delay=240))

MODELES.append(modele(
    '09-tracer-une-mediane', 'Tracer une médiane d\'un triangle',
    'Sur quadrillage : placer le milieu du côté opposé en comptant les carreaux, puis tracer la droite'
    ' qui le joint au sommet',
    8,
    [variation('Trace la **médiane issue de $A$** du triangle $ABC$.'
               + a_completer(FEN_Q, 'droite m = droite(A, M)',
                             [selon('k', [corps_q(TRI_132[i]) for i in (1, 2, 3)]),
                              'M = milieu(B, C, visible=faux)'],
                             tete=['grille: 1', 'outils: droite']),
               [var('k', '1..3')], [],
               ['**La médiane issue de $A$** est la droite qui passe par $A$ et par le **milieu** $M$'
                ' du côté opposé $[BC]$.',
                'Sur le quadrillage, on compte les carreaux de $B$ à $C$ : $M$ est à mi-chemin, en'
                ' largeur comme en hauteur.',
                'On trace la droite $(AM)$ : c\'est la '
                + colm('médiane issue de ', 'A') + '.'])],
    [spec('Triangle 1 : (AM)', 0, {'k': 1}, mediane_juste(TRI_132[1]), 'correct'),
     spec('Triangle 2 : (AM)', 0, {'k': 2}, mediane_juste(TRI_132[2]), 'correct'),
     spec('Triangle 3 : (AM)', 0, {'k': 3}, mediane_juste(TRI_132[3]), 'correct'),
     spec('Erreur : la hauteur issue de A', 0, {'k': 1}, hauteur_juste(TRI_132[1]), 'incorrect'),
     spec('Erreur : la médiatrice de [BC]', 0, {'k': 2}, mediatrice_bc(TRI_132[2]), 'incorrect'),
     spec('Erreur : la médiane issue de C', 0, {'k': 3},
          droite_rep(TRI_132[3][2], milieu(TRI_132[3][0], TRI_132[3][1])), 'incorrect'),
     spec('Erreur : rien de tracé', 0, {'k': 1}, '', 'empty')],
    delay=240))

os.makedirs(DOSSIER, exist_ok=True)
for nom, m in MODELES:
    with open(os.path.join(DOSSIER, nom + '.json'), 'w', encoding='utf-8') as f:
        json.dump(m, f, ensure_ascii=False, indent='\t')
        f.write('\n')
subprocess.run(['pnpm', 'exec', 'prettier', '--write', DOSSIER], check=True,
               stdout=subprocess.DEVNULL)
print(f'{len(MODELES)} modèles écrits dans {DOSSIER}')
