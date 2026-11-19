"""Écrit les 8 modèles du lot 15 « Symétrie centrale, aires, solides » de la 5e dans
scripts/questions/5-symetrie-aires-solides/.

Phase 0 validée par David le 2026-11-16 (§ 30 et 30 bis du journal `docs/wip/questions-5-progress.md`).
Bornes : `cycle4.json`, 5e (5-055 : conservation admise ; 5-115 : parallélogrammes, triangles, disques ;
5-144 : cube et pavé seulement ; 5-048 : pavé, cube, cylindre, prisme droit ; 5-049 : pavé, prisme droit,
cylindre). Le nœud et le tag sont posés par la migration de rangement, après le `--publier` de David.

Décisions et pièges :
- 115 : π ≈ 3,14 dit dans l'énoncé, réponse décimale exacte (comme `28d7ad74`) ;
- 048 : aucune perspective à dessiner (le bloc solide n'a ni orientation ni geste) ;
- 08 v3 : la lettre manquante se choisit parmi quatre (aucune case n'attend une lettre) ;
- bonne réponse d'un choix toujours par une variable ou une constante de rang écrit ; les choix sont
  mélangés à l'affichage, le corrigé nomme la bonne réponse, jamais son rang ;
- l'`id` d'un fichier déjà publié est gardé quand le script réécrit le lot.

    python3 docs/wip/questions/lot-5-symetrie-aires-solides.py scripts/questions
"""
import json
import math
import os
import subprocess
import sys

RACINE = sys.argv[1]
DOSSIER = os.path.join(RACINE, '5-symetrie-aires-solides')


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
    return '$' + col('\\text{' + x + '}') + '$'


def choix(lignes, melanger=True):
    tete = '' if melanger else 'melanger: non\n'
    return '\n\n```choix\n' + tete + ''.join('- ' + l + '\n' for l in lignes) + '```'


def choix_blocs(blocs):
    """Choix dont chaque option est un bloc (solide, patron) : clôture à quatre accents."""
    corps = ''
    for b in blocs:
        lignes = b.split('\n')
        corps += '- ' + lignes[0] + '\n' + ''.join('  ' + l + '\n' for l in lignes[1:])
    return '\n\n````choix\n' + corps + '````'


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


def n(x):
    """Nombre écrit dans une figure ou une réponse : 3 décimales au plus, sans « -0 »."""
    x = round(x + 0.0, 3)
    if abs(x - round(x)) < 1e-9:
        return str(int(round(x)))
    return repr(x)


def etiq(v, centre):
    dx, dy = v[0] - centre[0], v[1] - centre[1]
    h = 'haut' if dy > 0.3 else ('bas' if dy < -0.3 else '')
    l = 'droite' if dx > 0.3 else ('gauche' if dx < -0.3 else '')
    return '-'.join(x for x in (h, l) if x) or 'haut'


def pt(nom, p, centre=None, visible=True, etiquette=None):
    args = n(p[0]) + ', ' + n(p[1])
    if etiquette:
        args += ', etiquette="' + etiquette + '"'
    elif centre is not None:
        args += ', etiquette="' + etiq(p, centre) + '"'
    if not visible:
        args += ', visible=faux'
    return nom + ' = point(' + args + ')'


def sym(p, o):
    return (2 * o[0] - p[0], 2 * o[1] - p[1])


def centre_de(points):
    return (sum(p[0] for p in points) / len(points), sum(p[1] for p in points) / len(points))


def p_rep(p):
    return 'point(' + n(p[0]) + ';' + n(p[1]) + ')'


def c_rep(o, p):
    return 'cercle(' + ';'.join(n(x) for x in (*o, *p)) + ')'


def d_rep(p, q):
    return 'droite(' + ';'.join(n(x) for x in (*p, *q)) + ')'


def s_rep(p, q):
    return 'segment(' + ';'.join(n(x) for x in (*p, *q)) + ')'


def construit_sym(p, o):
    return d_rep(p, o) + '|' + c_rep(o, p) + '|' + p_rep(sym(p, o))


def dedans(p, fen):
    x0, x1, y0, y1 = fen
    return x0 + 0.4 <= p[0] <= x1 - 0.4 and y0 + 0.4 <= p[1] <= y1 - 0.4


MODELES = []

# --- 1. 5-054 : définir la symétrie centrale ---------------------------------------------------------

DEF_SYM = ('**Définition.** Le symétrique du point $M$ par rapport au point $O$ est le point $M\'$ tel que'
           ' $O$ soit le **milieu** du segment $[MM\']$ : on fait un **demi-tour** autour de $O$.')

O_1 = (5, 4)
M_1 = {1: (2, 5), 2: (4, 1), 3: (1.5, 3)}
FEN_1 = (0, 10, 0, 8)


def candidats_1(m):
    """(symétrique, sur (OM) à la mauvaise distance, quart de tour, symétrique axial vertical)."""
    o = O_1
    u = (m[0] - o[0], m[1] - o[1])
    return [sym(m, o), (o[0] - 0.5 * u[0], o[1] - 0.5 * u[1]), (o[0] - u[1], o[1] + u[0]),
            (2 * o[0] - m[0], m[1])]


LETTRES_1 = {1: 'EFGH', 2: 'FHEG', 3: 'GEHF'}   # le vrai reçoit E, F, G selon k


def verifie_1():
    for k, m in M_1.items():
        c = candidats_1(m)
        assert all(dedans(p, FEN_1) for p in c + [m]), k
        for i in range(4):
            for j in range(i + 1, 4):
                assert math.dist(c[i], c[j]) > 1.2, (k, i, j)
        assert LETTRES_1[k][0] == 'EFG'[k - 1]


verifie_1()


def corps_1(k):
    m = M_1[k]
    lignes = [pt('O', O_1, etiquette='bas'), pt('M', m, O_1)]
    for nom, p in zip(LETTRES_1[k], candidats_1(m)):
        lignes.append(pt(nom, p, O_1))
    return '\n'.join(lignes)


MODELES.append(modele(
    '01-definir-la-symetrie-centrale', 'Définir la symétrie centrale',
    'Le symétrique de M par rapport à O : O est le milieu de [MM\'] (demi-tour autour de O)',
    1,
    [variation('Le symétrique du point $M$ par rapport au point $O$ est le point $M\'$ tel que :'
               + choix(['$O$ est le milieu du segment $[MM\']$', '$OM = OM\'$',
                        '$M\'$ est sur la droite $(OM)$',
                        '$(MM\')$ est perpendiculaire à une droite passant par $O$']),
               [], ['0'],
               [DEF_SYM,
                '$OM = OM\'$ seul ne suffit pas (tous les points d\'un cercle de centre $O$) ; être sur'
                ' $(OM)$ seul non plus. Il faut **les deux** : c\'est dire que $O$ est le milieu.',
                'La réponse est donc ' + colt('O est le milieu de [MM\']') + '.']),
     variation('Voici le point $O$, le point $M$ et quatre autres points.'
               + figure('0 ; 10 ; 0 ; 8', 'Les points O et M, et quatre points E, F, G, H autour de O.',
                        [selon('k', [corps_1(k) for k in (1, 2, 3)])])
               + 'Quel point est le symétrique de $M$ par rapport à $O$ ?'
               + choix(['$E$', '$F$', '$G$', '$H$'], melanger=False),
               [var('k', '1..3'), var('j', 'eval:k-1')], ['{{j}}'],
               [DEF_SYM,
                'Les points trop près de $O$, ou à la bonne distance mais hors de la droite $(OM)$, ne'
                ' conviennent pas ; le symétrique par rapport à une **droite** non plus.',
                'On prolonge $[MO]$ de la même longueur : on arrive en '
                + selon('k', [colt('E'), colt('F'), colt('G')]) + '.'])],
    [spec('Définition : O milieu', 0, {}, '0', 'correct'),
     spec('Erreur : OM = OM\' seulement', 0, {}, '1', 'incorrect'),
     spec('Erreur : sur la droite (OM) seulement', 0, {}, '2', 'incorrect'),
     spec('Figure 1 : E', 1, {'k': 1, 'j': 0}, '0', 'correct'),
     spec('Figure 1 : erreur, mauvaise distance', 1, {'k': 1, 'j': 0}, '1', 'incorrect'),
     spec('Figure 2 : F', 1, {'k': 2, 'j': 1}, '1', 'correct'),
     spec('Figure 2 : erreur, symétrique axial', 1, {'k': 2, 'j': 1}, '3', 'incorrect'),
     spec('Figure 3 : G', 1, {'k': 3, 'j': 2}, '2', 'correct'),
     spec('Figure 3 : erreur, quart de tour', 1, {'k': 3, 'j': 2}, '3', 'incorrect')],
    delay=45))

# --- 2. 5-054 : construire le symétrique ---------------------------------------------------------------

FEN_2Q = (0, 10, 0, 8)
PT_2 = {1: ((2, 2), (5, 4)), 2: ((3, 6), (5, 4)), 3: ((1, 4), (4, 3))}       # (A, O), quadrillage
FIG_2 = {1: ([(1, 1), (4, 2), (2, 4)], (5, 4)),
         2: ([(1, 5), (3, 7), (4, 5), (2, 4)], (5, 4)),
         3: ([(2, 1), (4, 1), (4, 4)], (5, 4))}                              # (sommets, O)
FEN_2U = (0, 12, 0, 9)
PT_2U = {1: ((2, 3), (6, 4.5)), 2: ((3, 7), (6, 5)), 3: ((2.5, 5), (6.5, 4))}  # papier uni


def verifie_2():
    for k, (a, o) in PT_2.items():
        assert dedans(sym(a, o), FEN_2Q), k
    for k, (s, o) in FIG_2.items():
        assert all(dedans(sym(p, o), FEN_2Q) for p in s), k
    for k, (a, o) in PT_2U.items():
        assert dedans(sym(a, o), FEN_2U), k


verifie_2()


def corps_2_point(k, tab):
    a, o = tab[k]
    g = centre_de([a, o, sym(a, o)])
    return '\n'.join([pt('A', a, g), pt('O', o, etiquette='bas')])


def corps_2_fig(k):
    s, o = FIG_2[k]
    lignes = [pt('p' + str(i), p, visible=False) for i, p in enumerate(s)]
    lignes += ['segment(p%d, p%d, epaisseur=3)' % (i, (i + 1) % len(s)) for i in range(len(s))]
    lignes.append(pt('O', o, etiquette='bas'))
    return '\n'.join(lignes)


def segs_image(s, f):
    im = [f(p) for p in s]
    return '|'.join(s_rep(im[i], im[(i + 1) % len(im)]) for i in range(len(im)))


ETAPES_2 = [DEF_SYM,
            'Sur le quadrillage, on compte les carreaux pour aller de $A$ à $O$, puis on fait **le même'
            ' déplacement** à partir de $O$ : on arrive en ' + colt('A\'') + '.']
ETAPES_2_FIG = [
    'On construit le symétrique de chaque sommet par rapport à $O$ : on compte les carreaux du sommet'
    ' jusqu\'à $O$, et on refait le même déplacement après $O$.',
    'On relie les sommets obtenus dans le même ordre : la figure obtenue est '
    + colt('retournée d\'un demi-tour') + ' autour de $O$.']
ETAPES_2_UNI = [
    DEF_SYM,
    'On trace la droite $(AO)$, puis le cercle de centre $O$ qui passe par $A$ : il recoupe la droite'
    ' en ' + colt('A\'') + ', de l\'autre côté de $O$.']

a1, o1 = PT_2[1]
a2, o2 = PT_2[2]
a3, o3 = PT_2[3]
MODELES.append(modele(
    '02-construire-le-symetrique-par-rapport-a-un-point',
    'Construire le symétrique par rapport à un point',
    'Construire le symétrique d\'un point ou d\'une figure par rapport à un point : sur quadrillage, puis'
    ' au compas sur papier uni',
    2,
    [variation('Place le point $A\'$, symétrique du point $A$ par rapport au point $O$.'
               + a_completer('0 ; 10 ; 0 ; 8', ['point A\' = symetrie(A, centre=O)'],
                             [selon('k', [corps_2_point(k, PT_2) for k in (1, 2, 3)])],
                             tete=['grille: 1', 'outils: point']),
               [var('k', '1..3')], [], ETAPES_2),
     variation('Construis le symétrique de la figure par rapport au point $O$.'
               + a_completer('0 ; 10 ; 0 ; 8', ['symetrique par O'],
                             [selon('k', [corps_2_fig(k) for k in (1, 2, 3)])],
                             tete=['grille: 1']),
               [var('k', '1..3')], [], ETAPES_2_FIG),
     variation('Construis le point $A\'$, symétrique du point $A$ par rapport au point $O$, avec tes'
               ' instruments.'
               + a_completer('0 ; 12 ; 0 ; 9', ['point A\' = symetrie(A, centre=O)'],
                             [selon('k', [corps_2_point(k, PT_2U) for k in (1, 2, 3)])],
                             tete=['outils: point, droite, compas']),
               [var('k', '1..3')], [], ETAPES_2_UNI)],
    [spec('Quadrillage 1 : A\' juste', 0, {'k': 1}, p_rep(sym(a1, o1)), 'correct'),
     spec('Quadrillage 2 : A\' juste', 0, {'k': 2}, p_rep(sym(a2, o2)), 'correct'),
     spec('Quadrillage 3 : A\' juste', 0, {'k': 3}, p_rep(sym(a3, o3)), 'correct'),
     spec('Erreur : symétrique par la verticale passant par O', 0, {'k': 1},
          p_rep((2 * o1[0] - a1[0], a1[1])), 'incorrect'),
     spec('Erreur : A\' placé sur O', 0, {'k': 2}, p_rep(o2), 'incorrect'),
     spec('Erreur : rien de placé', 0, {'k': 3}, '', 'empty'),
     spec('Triangle : juste', 1, {'k': 1}, segs_image(FIG_2[1][0], lambda p: sym(p, FIG_2[1][1])),
          'correct'),
     spec('Quadrilatère : juste', 1, {'k': 2},
          segs_image(FIG_2[2][0], lambda p: sym(p, FIG_2[2][1])), 'correct'),
     spec('Triangle rectangle : juste', 1, {'k': 3},
          segs_image(FIG_2[3][0], lambda p: sym(p, FIG_2[3][1])), 'correct'),
     spec('Erreur : figure glissée (translation)', 1, {'k': 1},
          segs_image(FIG_2[1][0], lambda p: (p[0] + 5, p[1] + 3)), 'incorrect'),
     spec('Erreur : symétrique par la verticale passant par O', 1, {'k': 3},
          segs_image(FIG_2[3][0], lambda p: (2 * FIG_2[3][1][0] - p[0], p[1])), 'incorrect'),
     spec('Papier uni 1 : construit', 2, {'k': 1}, construit_sym(*PT_2U[1]), 'correct'),
     spec('Papier uni 2 : construit', 2, {'k': 2}, construit_sym(*PT_2U[2]), 'correct'),
     spec('Erreur : cercle de centre A passant par O', 2, {'k': 3},
          d_rep(*PT_2U[3]) + '|' + c_rep(PT_2U[3][0], PT_2U[3][1]) + '|'
          + p_rep(sym(PT_2U[3][1], PT_2U[3][0])), 'incorrect'),
     spec('Erreur : A\' placé à l\'œil', 2, {'k': 1}, p_rep(sym(*PT_2U[1])), 'incorrect')],
    delay=150))

# --- 3. 5-055 : propriétés de la symétrie centrale ------------------------------------------------------

O_3 = (5, 3.5)
TRI_3 = [(1, 1), (4, 1.5), (2, 4)]


def corps_3(angles=False):
    a, b, c = TRI_3
    ap, bp, cp = (sym(p, O_3) for p in TRI_3)
    g = centre_de(TRI_3)
    gp = sym(g, O_3)
    lignes = [pt('A', a, g), pt('B', b, g), pt('C', c, g), 'polygone(A, B, C)',
              pt('Ap', ap, etiquette='aucune'), pt('Bp', bp, etiquette='aucune'),
              pt('Cp', cp, etiquette='aucune'), 'polygone(Ap, Bp, Cp, couleur="bleu")']
    # un nom de point ne prend pas d'apostrophe : « A' » est écrit à côté du point
    for nom, q in (("A'", ap), ("B'", bp), ("C'", cp)):
        dx, dy = q[0] - gp[0], q[1] - gp[1]
        lg = math.hypot(dx, dy)
        lignes.append('texte(%s, %s, "%s")' % (n(q[0] + 0.5 * dx / lg), n(q[1] + 0.5 * dy / lg), nom))
    lignes.append(pt('O', O_3, etiquette='haut'))
    if angles:
        lignes += ['angle(A, B, C)', 'angle(Ap, Bp, Cp, couleur="bleu")']
    return lignes


FEN_3 = '0 ; 10 ; 0 ; 7'
assert all(dedans(sym(p, O_3), (0, 10, 0, 7)) for p in TRI_3)
CONSERVE = ('**Propriété** (admise). La symétrie centrale **conserve** les longueurs, les angles,'
            ' l\'alignement et le parallélisme.')

MODELES.append(modele(
    '03-proprietes-de-la-symetrie-centrale', 'Propriétés de la symétrie centrale',
    'La symétrie centrale conserve les longueurs et les angles ; le symétrique d\'une droite est une'
    ' droite parallèle',
    3,
    [variation('Le triangle $A\'B\'C\'$ est le symétrique du triangle $ABC$ par rapport au point $O$.'
               ' On sait que $AB = {{a}}$ cm et $AC = {{c}}$ cm.'
               + figure(FEN_3, 'Le triangle ABC et son symétrique A\'B\'C\' par rapport au point O.',
                        corps_3())
               + 'Combien mesure $A\'B\'$ ?\n\n$A\'B\' = ?$ cm',
               [var('a', '3..9'), var('w', '1..3'), var('c', 'eval:a+w')], ['{{a}}'],
               [CONSERVE,
                '$[A\'B\']$ est le symétrique de $[AB]$ (et non de $[AC]$) : $A\'B\' = AB = '
                + col('{{a}}') + '$ cm.']),
     variation('Le triangle $A\'B\'C\'$ est le symétrique du triangle $ABC$ par rapport au point $O$.'
               ' On sait que $\\widehat{ABC} = {{g}}°$.'
               + figure(FEN_3, 'Le triangle ABC et son symétrique A\'B\'C\' par rapport au point O ; les'
                        ' angles en B et en B\' sont marqués.', corps_3(True))
               + 'Combien mesure l\'angle $\\widehat{A\'B\'C\'}$ ?\n\n$\\widehat{A\'B\'C\'} = ?°$',
               [var('g', '25..140')], ['{{g}}'],
               [CONSERVE,
                '$\\widehat{A\'B\'C\'}$ est le symétrique de $\\widehat{ABC}$ : $\\widehat{A\'B\'C\'} = '
                '\\widehat{ABC} = ' + col('{{g}}°') + '$.']),
     variation('La droite $(d)$ ne passe pas par le point $O$. Son symétrique par rapport à $O$ est une'
               ' droite :'
               + choix(['parallèle à $(d)$', 'perpendiculaire à $(d)$', 'sécante à $(d)$ en $O$']),
               [], ['0'],
               ['**Propriété** (admise). Le symétrique d\'une droite par rapport à un point est une droite'
                ' **parallèle**.',
                'Le symétrique de $(d)$ par rapport à $O$ est donc une droite ' + colt('parallèle à (d)')
                + ', de l\'autre côté de $O$.'])],
    [spec('A\'B\' = AB = 6', 0, {'a': 6, 'w': 2, 'c': 8}, '6', 'correct'),
     spec('Erreur : A\'B\' = AC', 0, {'a': 6, 'w': 2, 'c': 8}, '8', 'incorrect'),
     spec('Angle conservé : 47°', 1, {'g': 47}, '47', 'correct'),
     spec('Erreur : 180 − l\'angle', 1, {'g': 47}, '133', 'incorrect'),
     spec('Droite parallèle', 2, {}, '0', 'correct'),
     spec('Erreur : perpendiculaire', 2, {}, '1', 'incorrect')],
    delay=60))

# --- 4. 5-115 : aire d'une figure composée, ajouter ----------------------------------------------------

PI = 'On prend $\\pi \\approx 3{,}14$.'
# Échelle double (1 cm = 2 unités) : toutes les coordonnées calculées sont entières (un `eval` non entier
# s'écrit en fraction, ou avec une virgule en `;d` : illisible dans une figure). Pas de `secteur` (non
# pris en charge, pas d'export PDF) : le demi-disque est un disque recouvert à moitié par le rectangle.
# Couleurs NOMMÉES (elles suivent le thème) ; « blanc » = le fond de la page : il dessine les trous.
FOND = 'remplissage="bleu", opacite_fond=0.3'
POINTILLES = 'trait="tirets"'
DROIT = 'marque="carre"'

V4_1 = [  # rectangle L × l, triangle rectangle accolé à droite (côtés l et t)
    'a = point(0, 0, visible=faux)', 'b = point({{eval:2*L}}, 0, visible=faux)',
    'c = point({{eval:2*L+2*t}}, 0, visible=faux)', 'd = point({{eval:2*L}}, {{eval:2*l}}, visible=faux)',
    'g = point(0, {{eval:2*l}}, visible=faux)',
    'polygone(a, c, d, g, ' + FOND + ')', 'segment(b, d, ' + POINTILLES + ')',
    'angle(c, b, d, ' + DROIT + ')',
    'texte({{L}}, -1, "{{L}} cm")', 'texte({{eval:2*L+t}}, -1, "{{t}} cm")',
    'texte(-2, {{l}}, "{{l}} cm")']
V4_2 = [  # rectangle L × d, demi-disque de diamètre d accolé à droite
    'O = point({{eval:2*L}}, {{d}}, visible=faux)',
    'cercle(O, rayon={{d}}, ' + FOND + ')',
    'a = point(0, 0, visible=faux)', 'b = point({{eval:2*L}}, 0, visible=faux)',
    'c = point({{eval:2*L}}, {{eval:2*d}}, visible=faux)', 'g = point(0, {{eval:2*d}}, visible=faux)',
    # le rectangle « blanc » efface la moitié gauche du disque, puis il est coloré comme le reste
    'polygone(a, b, c, g, remplissage="blanc", opacite_fond=1)',
    'polygone(a, b, c, g, ' + FOND + ')',
    'texte({{L}}, -1, "{{L}} cm")', 'texte(-2, {{d}}, "{{d}} cm")']
V4_3 = [  # parallélogramme de base b, hauteur h ; triangle de base [DC] et de hauteur t au-dessus
    'A = point(0, 0, visible=faux)', 'B = point({{eval:2*b}}, 0, visible=faux)',
    'C = point({{eval:2*b+3}}, {{eval:2*h}}, visible=faux)', 'D = point(3, {{eval:2*h}}, visible=faux)',
    'E = point({{eval:b+3}}, {{eval:2*h+2*t}}, visible=faux)',
    'polygone(A, B, C, E, D, ' + FOND + ')', 'segment(D, C, ' + POINTILLES + ')',
    'H = point(3, 0, visible=faux)', 'segment(D, H, ' + POINTILLES + ')',
    'angle(B, H, D, ' + DROIT + ')',
    'K = point({{eval:b+3}}, {{eval:2*h}}, visible=faux)', 'segment(E, K, ' + POINTILLES + ')',
    'angle(C, K, E, ' + DROIT + ')',
    'texte({{b}}, -1, "{{b}} cm")', 'texte(4.6, {{h}}, "{{h}} cm")',
    'texte({{eval:b+4.6}}, {{eval:2*h+t}}, "{{t}} cm")']

MODELES.append(modele(
    '04-aire-d-une-figure-composee-ajouter', 'Aire d\'une figure composée : ajouter',
    'Calculer l\'aire d\'une figure faite d\'un rectangle ou d\'un parallélogramme et d\'un triangle ou'
    ' d\'un demi-disque : on additionne les aires',
    1,
    [variation('La figure colorée est faite d\'un rectangle et d\'un triangle rectangle.'
               + figure('-4 ; {{eval:2*L+2*t+2}} ; -2 ; {{eval:max(2*l+1,6)}}', 'Un rectangle de {{L}} cm sur {{l}} cm, et à sa droite un triangle'
                        ' rectangle de côtés {{l}} cm et {{t}} cm.', V4_1)
               + 'Calcule son aire.\n\n$?~\\unit{cm^2}$',
               [var('L', '4..8'), var('l', '2..6'), var('t', '2..4')],
               ['{{eval:L*l+t*l/2;d}}'],
               ['On découpe la figure en deux : $\\text{aire} = \\text{aire du rectangle} +'
                ' \\text{aire du triangle}$.',
                'Rectangle : ${{L}} \\times {{l}} = {{eval:L*l}}~\\unit{cm^2}$. Triangle rectangle :'
                ' $\\dfrac{ {{t}} \\times {{l}} }{2} = {{eval:t*l/2;d}}~\\unit{cm^2}$.',
                'Aire de la figure : ${{eval:L*l}} + {{eval:t*l/2;d}} = '
                + col('{{eval:L*l+t*l/2;d}}~\\unit{cm^2}') + '$.']),
     variation('La figure colorée est faite d\'un rectangle et d\'un demi-disque. ' + PI
               + figure('-4 ; {{eval:2*L+d+2}} ; -2 ; {{eval:2*d+1}}', 'Un rectangle de {{L}} cm sur {{d}} cm, et à sa droite un demi-disque de'
                        ' diamètre {{d}} cm.', V4_2)
               + 'Calcule son aire.\n\n$?~\\unit{cm^2}$',
               [var('L', '4..8'), var('r', '1..3'), var('d', 'eval:2*r')],
               ['{{eval:L*d+157*r^2/100;d}}'],
               ['On découpe la figure en deux : $\\text{aire} = \\text{aire du rectangle} +'
                ' \\text{aire du demi-disque}$.',
                'Rectangle : ${{L}} \\times {{d}} = {{eval:L*d}}~\\unit{cm^2}$. Le demi-disque a pour'
                ' rayon $\\dfrac{ {{d}} }{2} = {{r}}$ cm : $\\dfrac{3{,}14 \\times {{r}} \\times {{r}}}{2}'
                ' = {{eval:157*r^2/100;d}}~\\unit{cm^2}$.',
                'Aire de la figure : ${{eval:L*d}} + {{eval:157*r^2/100;d}} = '
                + col('{{eval:L*d+157*r^2/100;d}}~\\unit{cm^2}') + '$.']),
     variation('La figure colorée est faite d\'un parallélogramme et d\'un triangle posé sur son côté du'
               ' haut. Les hauteurs sont en pointillés.'
               + figure('-2 ; {{eval:2*b+5}} ; -2 ; {{eval:2*h+2*t+1}}', 'Un parallélogramme de base {{b}} cm et de hauteur {{h}} cm, surmonté'
                        ' d\'un triangle de même base et de hauteur {{t}} cm.', V4_3)
               + 'Calcule son aire.\n\n$?~\\unit{cm^2}$',
               [var('b', '4..8'), var('h', '2..4'), var('t', '2..3')],
               ['{{eval:b*h+b*t/2;d}}'],
               ['On découpe la figure en deux : $\\text{aire} = \\text{aire du parallélogramme} +'
                ' \\text{aire du triangle}$.',
                'Parallélogramme : $\\text{base} \\times \\text{hauteur} = {{b}} \\times {{h}} ='
                ' {{eval:b*h}}~\\unit{cm^2}$. Triangle : $\\dfrac{ {{b}} \\times {{t}} }{2} ='
                ' {{eval:b*t/2;d}}~\\unit{cm^2}$.',
                'Aire de la figure : ${{eval:b*h}} + {{eval:b*t/2;d}} = '
                + col('{{eval:b*h+b*t/2;d}}~\\unit{cm^2}') + '$.'])],
    [spec('Rectangle 6 × 4 + triangle 3 × 4 / 2 = 30', 0, {'L': 6, 'l': 4, 't': 3}, '30', 'correct'),
     spec('Erreur : triangle non divisé par 2', 0, {'L': 6, 'l': 4, 't': 3}, '36', 'incorrect'),
     spec('Erreur : périmètre', 0, {'L': 6, 'l': 4, 't': 3}, '22', 'incorrect'),
     spec('Rectangle 5 × 4 + demi-disque r = 2 : 26,28', 1, {'L': 5, 'r': 2, 'd': 4}, '26,28',
          'correct'),
     spec('Erreur : disque entier', 1, {'L': 5, 'r': 2, 'd': 4}, '32,56', 'incorrect'),
     spec('Erreur : diamètre pris pour rayon', 1, {'L': 5, 'r': 2, 'd': 4}, '45,12', 'incorrect'),
     spec('Parallélogramme 6 × 3 + triangle 6 × 2 / 2 = 24', 2, {'b': 6, 'h': 3, 't': 2}, '24',
          'correct'),
     spec('Erreur : triangle non divisé par 2', 2, {'b': 6, 'h': 3, 't': 2}, '30', 'incorrect')],
    delay=120))

# --- 5. 5-115 : aire d'une figure composée, retrancher -------------------------------------------------

TROU = 'remplissage="blanc", opacite_fond=1'
V5_1 = [  # rectangle L × l privé d'un coin triangulaire (côtés u, v)
    'a = point(0, 0, visible=faux)', 'b = point({{eval:2*L}}, 0, visible=faux)',
    'c1 = point({{eval:2*L}}, {{eval:2*l-2*v}}, visible=faux)',
    'c2 = point({{eval:2*L-2*u}}, {{eval:2*l}}, visible=faux)',
    'c = point({{eval:2*L}}, {{eval:2*l}}, visible=faux)', 'g = point(0, {{eval:2*l}}, visible=faux)',
    'polygone(a, b, c1, c2, g, ' + FOND + ')', 'segment(c1, c, ' + POINTILLES + ')',
    'segment(c, c2, ' + POINTILLES + ')',
    'texte({{L}}, -1, "{{L}} cm")', 'texte(-2, {{l}}, "{{l}} cm")',
    'texte({{eval:2*L-u}}, {{eval:2*l+1}}, "{{u}} cm")',
    'texte({{eval:2*L+1.6}}, {{eval:2*l-v}}, "{{v}} cm")']
V5_2 = [  # carré de côté c privé du disque inscrit
    'a = point(0, 0, visible=faux)', 'b = point({{eval:2*c}}, 0, visible=faux)',
    'f = point({{eval:2*c}}, {{eval:2*c}}, visible=faux)', 'g = point(0, {{eval:2*c}}, visible=faux)',
    'polygone(a, b, f, g, ' + FOND + ')',
    'O = point({{c}}, {{c}}, visible=faux)', 'cercle(O, rayon={{c}}, ' + TROU + ')',
    'texte({{c}}, -1, "{{c}} cm")', 'texte(-2, {{c}}, "{{c}} cm")']
V5_3 = [  # cadre : rectangle L × l privé d'un rectangle intérieur, bordure de 1 cm
    'a = point(0, 0, visible=faux)', 'b = point({{eval:2*L}}, 0, visible=faux)',
    'f = point({{eval:2*L}}, {{eval:2*l}}, visible=faux)', 'g = point(0, {{eval:2*l}}, visible=faux)',
    'polygone(a, b, f, g, ' + FOND + ')',
    'i = point(2, 2, visible=faux)', 'j = point({{eval:2*L-2}}, 2, visible=faux)',
    'm = point({{eval:2*L-2}}, {{eval:2*l-2}}, visible=faux)', 'q = point(2, {{eval:2*l-2}}, visible=faux)',
    'polygone(i, j, m, q, ' + TROU + ')',
    'texte({{L}}, -1, "{{L}} cm")', 'texte(-2, {{l}}, "{{l}} cm")',
    'texte({{L}}, 1, "1 cm")']

MODELES.append(modele(
    '05-aire-d-une-figure-composee-retrancher', 'Aire d\'une figure composée : retrancher',
    'Calculer l\'aire d\'une figure obtenue en retirant un triangle, un disque ou un rectangle d\'un'
    ' rectangle ou d\'un carré : on soustrait les aires',
    2,
    [variation('On a coupé un coin triangulaire dans un rectangle. Voici ce qui reste (en couleur).'
               + figure('-4 ; {{eval:2*L+4}} ; -2 ; {{eval:2*l+2}}', 'Un rectangle de {{L}} cm sur {{l}} cm dont on a coupé le coin en haut à'
                        ' droite : un triangle rectangle de côtés {{u}} cm et {{v}} cm.', V5_1)
               + 'Calcule l\'aire de la partie colorée.\n\n$?~\\unit{cm^2}$',
               [var('L', '6..10'), var('l', '4..6'), var('u', '2..3'), var('v', '2..3')],
               ['{{eval:L*l-u*v/2;d}}'],
               ['$\\text{aire} = \\text{aire du rectangle} - \\text{aire du triangle retiré}$.',
                'Rectangle : ${{L}} \\times {{l}} = {{eval:L*l}}~\\unit{cm^2}$. Triangle rectangle :'
                ' $\\dfrac{ {{u}} \\times {{v}} }{2} = {{eval:u*v/2;d}}~\\unit{cm^2}$.',
                'Aire de la partie colorée : ${{eval:L*l}} - {{eval:u*v/2;d}} = '
                + col('{{eval:L*l-u*v/2;d}}~\\unit{cm^2}') + '$.']),
     variation('On a retiré un disque d\'un carré. Voici ce qui reste (en couleur). ' + PI
               + figure('-4 ; {{eval:2*c+1}} ; -2 ; {{eval:2*c+1}}', 'Un carré de côté {{c}} cm ; le disque qui touche ses quatre côtés est'
                        ' retiré.', V5_2)
               + 'Calcule l\'aire de la partie colorée.\n\n$?~\\unit{cm^2}$',
               [var('r', '2..4'), var('c', 'eval:2*r')],
               ['{{eval:c^2-314*r^2/100;d}}'],
               ['$\\text{aire} = \\text{aire du carré} - \\text{aire du disque}$.',
                'Le disque a pour diamètre le côté du carré : son rayon est $\\dfrac{ {{c}} }{2} ='
                ' {{r}}$ cm, son aire $3{,}14 \\times {{r}} \\times {{r}} = {{eval:314*r^2/100;d}}'
                '~\\unit{cm^2}$.',
                'Carré : ${{c}} \\times {{c}} = {{eval:c^2}}~\\unit{cm^2}$. Partie colorée : ${{eval:c^2}}'
                ' - {{eval:314*r^2/100;d}} = ' + col('{{eval:c^2-314*r^2/100;d}}~\\unit{cm^2}') + '$.']),
     variation('Ce cadre est un rectangle dont on a retiré un rectangle intérieur ; la bordure a'
               ' partout une largeur de $1$ cm.'
               + figure('-4 ; {{eval:2*L+1}} ; -2 ; {{eval:2*l+1}}', 'Un cadre : rectangle de {{L}} cm sur {{l}} cm, bordure de 1 cm.', V5_3)
               + 'Calcule l\'aire du cadre (en couleur).\n\n$?~\\unit{cm^2}$',
               [var('L', '6..11'), var('l', '4..7')],
               ['{{eval:L*l-(L-2)*(l-2)}}'],
               ['$\\text{aire} = \\text{aire du grand rectangle} - \\text{aire du rectangle intérieur}$.',
                'Le rectangle intérieur perd $1$ cm de chaque côté : il mesure ${{eval:L-2}}$ cm sur'
                ' ${{eval:l-2}}$ cm.',
                '${{L}} \\times {{l}} - {{eval:L-2}} \\times {{eval:l-2}} = {{eval:L*l}} -'
                ' {{eval:(L-2)*(l-2)}} = ' + col('{{eval:L*l-(L-2)*(l-2)}}~\\unit{cm^2}') + '$.'])],
    [spec('Rectangle 8 × 5 − triangle 2 × 3 / 2 = 37', 0, {'L': 8, 'l': 5, 'u': 2, 'v': 3}, '37',
          'correct'),
     spec('Erreur : triangle ajouté', 0, {'L': 8, 'l': 5, 'u': 2, 'v': 3}, '43', 'incorrect'),
     spec('Erreur : triangle non divisé par 2', 0, {'L': 8, 'l': 5, 'u': 2, 'v': 3}, '34',
          'incorrect'),
     spec('Carré 6 − disque r = 3 : 7,74', 1, {'r': 3, 'c': 6}, '7,74', 'correct'),
     spec('Erreur : disque de rayon 6', 1, {'r': 3, 'c': 6}, '-77,04', 'incorrect'),
     spec('Carré 8 − disque r = 4 : 13,76', 1, {'r': 4, 'c': 8}, '13,76', 'correct'),
     spec('Erreur : disque ajouté', 1, {'r': 4, 'c': 8}, '114,24', 'incorrect'),
     spec('Cadre 8 × 5 : 40 − 18 = 22', 2, {'L': 8, 'l': 5}, '22', 'correct'),
     spec('Erreur : aire du grand rectangle', 2, {'L': 8, 'l': 5}, '40', 'incorrect'),
     spec('Erreur : rectangle intérieur seul', 2, {'L': 8, 'l': 5}, '18', 'incorrect')],
    delay=120))

# --- 6. 5-144 : reconnaître un cube, un pavé ----------------------------------------------------------


def solide(forme, *lignes):
    return '```solide\nforme: ' + forme + '\n' + ''.join(l + '\n' for l in lignes) + '```'


QUATRE_6 = [solide('cube 3'), solide('pave 4.5 2 2.5'), solide('prisme triangle 3 2.5 4'),
            solide('pyramide carree 3 3.5')]

MODELES.append(modele(
    '06-reconnaitre-un-cube-un-pave', 'Reconnaître un cube, un pavé',
    'Reconnaître un cube et un pavé droit représentés en perspective cavalière',
    1,
    [variation('Lequel de ces solides est ' + si('k==1', 'un **cube**', 'un **pavé droit** qui n\'est'
                                                  ' pas un cube') + ' ?'
               + choix_blocs(QUATRE_6),
               [var('k', '1..2'), var('j', 'eval:k-1')], ['{{j}}'],
               ['Un **pavé droit** a $6$ faces rectangulaires. Un **cube** est un pavé droit dont les $6$'
                ' faces sont des carrés : toutes ses arêtes ont la même longueur.',
                'En perspective cavalière, la face de devant est dessinée en vraie grandeur : '
                + si('k==1', 'un carré pour le cube.', 'un rectangle non carré pour ce pavé.'),
                'Les deux autres sont un prisme (faces de devant triangulaires) et une pyramide (un'
                ' sommet en haut) : ' + si('k==1', colt('le cube'), colt('le pavé')) + ' est le seul'
                ' qui convient.']),
     variation('Voici un solide en perspective cavalière.'
               + '\n\n' + si('k==1', solide('cube {{a}}', 'cotes: cm'),
                             solide('pave {{l}} {{p}} {{h}}', 'cotes: cm')) + '\n\n'
               + 'Quel est le nom le plus précis de ce solide ?'
               + choix(['un cube', 'un pavé droit (non cube)', 'un prisme droit à base triangulaire']),
               [var('k', '1..2'), var('j', 'eval:k-1'), var('a', '2..6'), var('l', '3..7'),
                var('p', '2..5'), var('h', '2..6')], ['{{j}}'],
               ['Les $6$ faces de ce solide sont des rectangles : c\'est un pavé droit.',
                si('k==1', 'Ses trois dimensions sont égales ($ {{a}} $ cm) : toutes ses faces sont des'
                   ' carrés. C\'est ' + colt('un cube') + ', un pavé droit particulier.',
                   'Ses dimensions ne sont pas toutes égales : ce n\'est pas un cube, c\'est '
                   + colt('un pavé droit') + '.')],
               conditions=['l!=p', 'p!=h', 'l!=h'])],
    [spec('Le cube', 0, {'k': 1, 'j': 0}, '0', 'correct'),
     spec('Erreur : le pavé pour le cube', 0, {'k': 1, 'j': 0}, '1', 'incorrect'),
     spec('Le pavé', 0, {'k': 2, 'j': 1}, '1', 'correct'),
     spec('Erreur : le prisme pour le pavé', 0, {'k': 2, 'j': 1}, '2', 'incorrect'),
     spec('Cube coté : un cube', 1, {'k': 1, 'j': 0, 'a': 4, 'l': 5, 'p': 3, 'h': 2}, '0', 'correct'),
     spec('Erreur : cube appelé pavé (non cube)', 1, {'k': 1, 'j': 0, 'a': 4, 'l': 5, 'p': 3, 'h': 2},
          '1', 'incorrect'),
     spec('Pavé coté : un pavé', 1, {'k': 2, 'j': 1, 'a': 4, 'l': 5, 'p': 3, 'h': 2}, '1', 'correct'),
     spec('Erreur : pavé appelé cube', 1, {'k': 2, 'j': 1, 'a': 4, 'l': 5, 'p': 3, 'h': 2}, '0',
          'incorrect')],
    delay=45))

# --- 7. 5-048 : lire des perspectives cavalières ------------------------------------------------------

QUATRE_7 = [solide('cube 3'), solide('pave 4.5 2 2.5'), solide('prisme triangle 3 2.5 4'),
            solide('cylindre 1.5 3.5')]
# Choix à dessins : jamais de bloc dans un {{if:…}} (clôture non reconnue) ; seules les lignes varient.
OPTIONS_7B = [solide('pave {{h}} {{p}} {{l}}', 'cotes: cm'),        # le même, debout
              solide('pave {{l}} {{p}} {{eval:h+1}}', 'cotes: cm'),  # une dimension changée
              solide('cube {{l}}', 'cotes: cm')]
FORMES_7C = ['pave 4 2 3', 'prisme triangle 3 2.5 4', 'cube 3']

MODELES.append(modele(
    '07-lire-des-perspectives-cavalieres', 'Lire des perspectives cavalières',
    'Reconnaître un prisme droit, un cylindre ; retrouver un même pavé dessiné autrement ; les arêtes'
    ' cachées en pointillés',
    2,
    [variation('Lequel de ces solides est ' + si('k==1', 'un **prisme droit**', 'un **cylindre**') + ' ?'
               + choix_blocs(QUATRE_7),
               [var('k', '1..2'), var('j', 'eval:k+1')], ['{{j}}'],
               ['Un **prisme droit** a deux bases superposables (ici des triangles) reliées par des'
                ' rectangles. Un **cylindre** a deux disques pour bases, dessinés aplatis (en ellipses)'
                ' en perspective.',
                'C\'est donc ' + si('k==1', colt('le solide aux faces triangulaires'),
                                    colt('le solide aux bases rondes')) + '.']),
     variation('Voici un pavé droit.'
               + '\n\n' + solide('pave {{l}} {{p}} {{h}}', 'cotes: cm') + '\n\n'
               + 'Lequel de ces dessins représente **le même pavé**, posé autrement ?'
               + choix_blocs(OPTIONS_7B),
               [var('l', '4..6'), var('p', '2..3'), var('h', '2..4')], ['0'],
               ['Un même pavé posé autrement garde ses **trois dimensions** : seule leur place change.',
                'Le pavé donné mesure ${{l}}$ cm, ${{p}}$ cm et ${{h}}$ cm.',
                'Seul ' + colt('le pavé debout aux mêmes trois dimensions') + ' convient ; l\'autre a une'
                ' dimension changée, et le cube n\'a qu\'une seule dimension.'],
               conditions=['l!=p', 'p!=h', 'l!=h']),
     variation('Lequel de ces deux dessins est une perspective cavalière correcte ?'
               + choix_blocs([solide(selon('k', FORMES_7C)),
                              solide(selon('k', FORMES_7C), 'cachees: non')]),
               [var('k', '1..3')], ['0'],
               ['En perspective cavalière, les arêtes **cachées** (qu\'on ne verrait pas de face) sont'
                ' dessinées en **pointillés**.',
                'Le dessin correct est donc ' + colt('celui aux arêtes cachées en pointillés')
                + '.'])],
    [spec('Le prisme', 0, {'k': 1, 'j': 2}, '2', 'correct'),
     spec('Erreur : le pavé pour le prisme', 0, {'k': 1, 'j': 2}, '1', 'incorrect'),
     spec('Le cylindre', 0, {'k': 2, 'j': 3}, '3', 'correct'),
     spec('Erreur : le prisme pour le cylindre', 0, {'k': 2, 'j': 3}, '2', 'incorrect'),
     spec('Même pavé debout', 1, {'l': 5, 'p': 2, 'h': 3}, '0', 'correct'),
     spec('Erreur : une dimension changée', 1, {'l': 5, 'p': 2, 'h': 3}, '1', 'incorrect'),
     spec('Erreur : le cube', 1, {'l': 4, 'p': 3, 'h': 2}, '2', 'incorrect'),
     spec('Arêtes cachées en pointillés', 2, {'k': 1}, '0', 'correct'),
     spec('Erreur : tout en trait plein', 2, {'k': 2}, '1', 'incorrect')],
    delay=60))

# --- 8. 5-049 : perspective et patron -----------------------------------------------------------------


def patron(solide_, *lignes):
    return '```patron\nsolide: ' + solide_ + '\n' + ''.join(l + '\n' for l in lignes) + '```'


OPTIONS_8A = [patron('pave {{l}} {{p}} {{h}}', 'forme: {{f}}', 'cotes: cm'),
              patron('pave {{l}} {{eval:p+1}} {{h}}', 'forme: {{f}}', 'cotes: cm'),
              patron('pave {{l}} {{p}} {{h}}', 'forme: faux {{m}}', 'cotes: cm')]
SOLIDES_8B = ['prisme triangle 3 2.5 4', 'cylindre 1 3', 'pave 4 2 3', 'pyramide carree 3 3']
NOMS_8B = ['d\'un prisme droit', 'd\'un cylindre', 'd\'un pavé droit', 'd\'une pyramide']
# lettre cachée (un sommet du dessus), puis les trois autres du dessus ; la bonne en premier.
# Le patron n'écrit que A, B, C, D et le « ? » : il faut le replier (avec les 7 autres lettres écrites,
# la réponse serait la seule lettre absente).
TROU_8C = {1: ('F', 'GEH'), 2: ('G', 'HFE'), 3: ('H', 'EGF'), 4: ('E', 'FHG')}


def sommets_8c(lettre):
    return ' '.join(x if x in 'ABCD' else ('?' if x == lettre else '-') for x in 'ABCDEFGH')


MODELES.append(modele(
    '08-perspective-et-patron', 'Perspective et patron',
    'Associer un pavé, un prisme droit, un cylindre en perspective cavalière à son patron',
    3,
    [variation('Voici un pavé droit.'
               + '\n\n' + solide('pave {{l}} {{p}} {{h}}', 'cotes: cm') + '\n\n'
               + 'Lequel de ces dessins est un patron de ce pavé ?'
               + choix_blocs(OPTIONS_8A),
               [var('l', '4..5'), var('p', '2..3'), var('h', '2..4'), var('f', '1..11'),
                var('m', '1..8')], ['0'],
               ['Un patron d\'un pavé a $6$ rectangles, deux à deux identiques, qui se replient sans se'
                ' chevaucher, avec les **mêmes dimensions** que le pavé.',
                'L\'un des dessins a une dimension différente ; un autre, en se repliant, met deux faces'
                ' au même endroit.',
                'Le patron du pavé est donc ' + colt('celui qui a ses trois dimensions et se replie')
                + '.'],
               conditions=['l!=p', 'p!=h', 'l!=h', 'l!=p+1', 'h!=p+1']),
     variation('Voici un patron.'
               + '\n\n' + patron(selon('k', SOLIDES_8B), 'forme: 1') + '\n\n'
               + 'C\'est le patron :' + choix(NOMS_8B),
               [var('k', '1..4'), var('j', 'eval:k-1')], ['{{j}}'],
               [selon('k', [
                   'Deux triangles identiques et trois rectangles : en se repliant, ils forment un prisme'
                   ' droit à base triangulaire.',
                   'Deux disques et un rectangle qui s\'enroule autour : c\'est un cylindre.',
                   'Six rectangles, deux à deux identiques : c\'est un pavé droit.',
                   'Un carré et quatre triangles qui se rejoignent en un sommet : c\'est une pyramide.']),
                'C\'est le patron ' + selon('k', [colt(x) for x in NOMS_8B]) + '.']),
     variation('Voici le pavé $ABCDEFGH$ et un de ses patrons ; sur le patron, seuls $A$, $B$, $C$, $D$ et un point d\'interrogation sont écrits.'
               + '\n\n' + solide('pave 4 2 3', 'sommets: A B C D E F G H') + '\n\n'
               + patron('pave 4 2 3', 'forme: 1',
                        'sommets: ' + selon('k', [sommets_8c(TROU_8C[k][0]) for k in (1, 2, 3, 4)]))
               + '\n\nQuelle lettre doit-on écrire à la place du point d\'interrogation ?'
               + choix(['$' + selon('k', [(TROU_8C[k][0] + TROU_8C[k][1])[i] for k in (1, 2, 3, 4)])
                        + '$' for i in range(4)]),
               [var('k', '1..4')], ['0'],
               ['On replie le patron autour de la face $ABCD$ : chaque sommet du dessus vient au-dessus d\'un'
                ' sommet du dessous ($E$ sur $A$, $F$ sur $B$, $G$ sur $C$, $H$ sur $D$).',
                'En repliant le patron, le point d\'interrogation vient sur le sommet '
                + selon('k', [colt(TROU_8C[k][0]) for k in (1, 2, 3, 4)]) + ' du pavé.'])],
    [spec('Le bon patron', 0, {'l': 5, 'p': 2, 'h': 4, 'f': 1, 'm': 3}, '0', 'correct'),
     spec('Erreur : dimensions différentes', 0, {'l': 5, 'p': 2, 'h': 4, 'f': 7, 'm': 3}, '1',
          'incorrect'),
     spec('Erreur : faux patron', 0, {'l': 4, 'p': 3, 'h': 2, 'f': 11, 'm': 5}, '2', 'incorrect'),
     spec('Prisme', 1, {'k': 1, 'j': 0}, '0', 'correct'),
     spec('Cylindre', 1, {'k': 2, 'j': 1}, '1', 'correct'),
     spec('Erreur : cylindre pris pour un prisme', 1, {'k': 2, 'j': 1}, '0', 'incorrect'),
     spec('Pyramide', 1, {'k': 4, 'j': 3}, '3', 'correct'),
     spec('Erreur : pyramide prise pour un prisme', 1, {'k': 4, 'j': 3}, '0', 'incorrect'),
     spec('Lettre juste', 2, {'k': 1}, '0', 'correct'),
     spec('Erreur : sommet voisin', 2, {'k': 2}, '1', 'incorrect')],
    delay=75))

os.makedirs(DOSSIER, exist_ok=True)
for nom, m in MODELES:
    chemin = os.path.join(DOSSIER, nom + '.json')
    if os.path.exists(chemin):                     # garder l'id d'un brouillon déjà créé en prod
        ancien = json.load(open(chemin, encoding='utf-8'))
        if 'id' in ancien:
            m = {'id': ancien['id'], **m}
    with open(chemin, 'w', encoding='utf-8') as f:
        json.dump(m, f, ensure_ascii=False, indent='\t')
        f.write('\n')
subprocess.run(['pnpm', 'exec', 'prettier', '--write', DOSSIER], check=True,
               stdout=subprocess.DEVNULL)
print(f'{len(MODELES)} modèles écrits dans {DOSSIER}')
