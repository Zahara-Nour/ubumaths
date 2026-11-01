"""Écrit les 9 modèles du lot 7 C « Variations et extrémums » de la 2de dans
scripts/questions/2de-variations-c/.

Phase 0 validée par David le 2026-11-01 (§ 44 du journal `docs/wip/questions-2de-progress.md`).
Bornes : `bornes/lycee/2de.json` (2-345, 2-473, 2-346, 2-349, 2-350, 2-354, 2-355, 2-356, 2-477).
Un point par modèle ; nœud et tag posés par la migration de rangement.

Décisions et pièges :
- fonctions de référence pour comparer : carré, inverse, valeur absolue (ni √ ni cube, l2-2) ;
- intervalle de monotonie demandé « le plus grand, bornes comprises » (convention du corrigé) ;
- parabole tracée : f(x) = s·0,5(x − h)² + k, sommet entier, valeurs entières aux points lus ;
- un tableau de variations sur ℝ ne porte pas de valeur en ±∞ (rendu : bornes implicites) ;
- jamais de `{{if:…}}` imbriqué : une variation par cas ; égalité traitée dans sa propre variation ;
- variables `e` et `i` interdites.

    python3 docs/wip/questions-2de/lot-variations-c-2de.py scripts/questions/2de-variations-c
"""
import json
import os
import subprocess
import sys

DOSSIER = sys.argv[1]
VARIATIONS = ('Fonctions', 'Généralités', 'Variations')
EXTREMUMS = ('Fonctions', 'Généralités', 'Extremums')


def spec(desc, vi, variables, answers, status):
    return {'description': desc, 'variationIndex': vi,
            'variables': {k: str(v) for k, v in variables.items()},
            'answers': answers if isinstance(answers, list) else [answers],
            'expected': {'status': status}}


def modele(nom, title, description, categorie, level, variations, specs, delay=60):
    m = {'title': title, 'description': description, 'grades': ['2'], 'theme': categorie[0],
         'domain': categorie[1], 'subdomain': categorie[2], 'level': level, 'delay': delay,
         'status': 'draft',
         'shared': {'cleanCoefficients': True, 'blankDefaults': {'acceptDecimal': True}},
         'variations': variations, 'testSpecs': specs}
    return nom, m


def var(nom, expression):
    return {'name': nom, 'expression': expression}


def variation(statement, variables, blanks, steps, conditions=None):
    v = {'statement': statement, 'variables': variables}
    if conditions:
        v['conditions'] = conditions
    v['blanks'] = blanks
    v['correction'] = {'steps': steps}
    return v


def case(attendu):
    return {'expectedAnswer': attendu}


def case_ens(attendu):
    return {'expectedAnswer': attendu, 'answerKind': 'intervalles'}


def col(x, k=0):
    return '\\textcolor{{{color:primary.' + str(k) + '}}}{' + x + '}'


def choix(question, options, melanger=False):
    entete = '' if melanger else 'melanger: non\n'
    return question + '\n\n```choix\n' + entete + ''.join('- ' + o + '\n' for o in options) + '```'


def courbe_lignes(x, y, lignes, description, points=None, taille='moyenne'):
    out = ['```courbe', 'x: ' + x, 'y: ' + y, 'grille: 1 ; 1'] + lignes
    if points:
        out.append('points: ' + points)
    return out + ['taille: ' + taille, 'description: ' + description, '```']


def courbe(x, y, lignes, description, points=None):
    return '\n'.join(courbe_lignes(x, y, lignes, description, points))


def bloc_choix(question, blocs):
    """Case choix dont chaque choix est un bloc (liste de lignes), mélangés ; le bon en premier."""
    options = []
    for lignes in blocs:
        options.append('- ' + lignes[0] + '\n' + ''.join(('  ' + l if l else '') + '\n' for l in lignes[1:]))
    return question + '\n\n````choix\n' + ''.join(options) + '````'


def tableau_var_lignes(domaine, points, label='f(x)'):
    """`points` : liste de (abscisse, valeur ou None, position top|bottom|center)."""
    out = ['```variation', 'variable: x', 'domain: ' + ', '.join(domaine), '', 'variation: ' + label]
    for x, v, pos in points:
        if v is not None:
            out.append('  ' + x + ': ' + v + ', ' + pos)
    return out + ['```']


def tableau_var(domaine, points, label='f(x)'):
    return '\n'.join(tableau_var_lignes(domaine, points, label))


SENS = ['croissante', 'décroissante', 'ni croissante ni décroissante']
COMPARE = ['$f(u)<f(v)$', '$f(u)=f(v)$', '$f(u)>f(v)$']

# Parabole s·0,5(x − h)² + k sur [h − 4 ; h + 4]
PARA = '{{s}}*0.5*(x-({{h}}))^2+({{k}})'
X_PARA = '{{eval:(h)-5}} ; {{eval:(h)+5}}'
Y_PARA = '{{eval:(k)-5+4*(s)}} ; {{eval:(k)+5+4*(s)}}'
VAR_PARA = [var('h', '-3..3'), var('k', '-3..3'), var('s', '-1|1')]
DESC_PARA = ('Parabole tournée vers le {{if:s>0|haut|bas}}, de sommet ({{h}} ; {{k}}), tracée de {{eval:(h)-4}}'
             ' à {{eval:(h)+4}}.')
COURBE_PARA = courbe(X_PARA, Y_PARA, ['f(x) = ' + PARA + ' sur [{{eval:(h)-4}} ; {{eval:(h)+4}}]   bleu'],
                     DESC_PARA)
INTRO_PARA = ('La courbe ci-dessous représente une fonction $f$ définie sur $\\left[{{eval:(h)-4}}\\,;'
              '{{eval:(h)+4}}\\right]$.\n\n' + COURBE_PARA + '\n\n')

MODELES = []

# =============================================================================================
# 1. 2-345 : croissante, décroissante sur un intervalle
# =============================================================================================


def monotonie(debut, fin, rep, explication):
    return variation(
        INTRO_PARA + choix('Sur $\\left[' + debut + '\\,;' + fin + '\\right]$, la fonction $f$ est :', SENS),
        VAR_PARA,
        [case(rep)],
        ['Le sommet de la parabole a pour abscisse ${{h}}$ : $f$ {{if:s>0|décroît avant et croît après|croît'
         ' avant et décroît après}}.', explication])


MONO_GAUCHE = monotonie('{{eval:(h)-3}}', '{{eval:(h)-1}}', '{{if:s>0|1|0}}',
                        'Cet intervalle est à gauche du sommet : quand $x$ augmente, la courbe {{if:s>0|descend :'
                        ' $f$ est **décroissante**|monte : $f$ est **croissante**}}.')
MONO_DROITE = monotonie('{{eval:(h)+1}}', '{{eval:(h)+3}}', '{{if:s>0|0|1}}',
                        'Cet intervalle est à droite du sommet : quand $x$ augmente, la courbe {{if:s>0|monte :'
                        ' $f$ est **croissante**|descend : $f$ est **décroissante**}}.')
MONO_SOMMET = monotonie('{{eval:(h)-2}}', '{{eval:(h)+2}}', '2',
                        'Cet intervalle contient le sommet : la courbe {{if:s>0|descend puis monte|monte puis'
                        ' descend}}. $f$ n\'est **ni croissante ni décroissante** sur tout l\'intervalle.')

DEFINITION = variation(
    'Une fonction $f$ est {{if:g==0|croissante|décroissante}} sur un intervalle $I$. Les réels $a$ et $b$'
    ' sont dans $I$, avec $a<b$.\n\n'
    + choix('Que peut-on en déduire ?', ['$f(a)\\leqslant f(b)$', '$f(a)\\geqslant f(b)$',
                                         'on ne peut pas comparer $f(a)$ et $f(b)$']),
    [var('g', '0|1')],
    [case('{{if:g==0|0|1}}')],
    ['{{if:g==0|$f$ **croissante** sur $I$ : les images sont rangées **dans le même ordre** que les nombres.|'
     '$f$ **décroissante** sur $I$ : les images sont rangées **dans l\'ordre contraire** des nombres.}}',
     '$a<b$ donc ' + col('{{if:g==0|f(a)\\leqslant f(b)|f(a)\\geqslant f(b)}}') + '.'])

SP_P = {'h': 1, 'k': -2, 's': 1}
SP_N = {'h': -1, 'k': 2, 's': -1}
MODELES.append(modele(
    '01-croissante-decroissante-sur-un-intervalle', 'Croissante ou décroissante sur un intervalle',
    'Lire sur une courbe si f est croissante, décroissante ou ni l\'un ni l\'autre sur un intervalle ;'
    ' traduire « f croissante » par l\'ordre des images (pièges : lire de droite à gauche, intervalle qui'
    ' contient le sommet, ordre des images inversé pour une fonction décroissante)',
    VARIATIONS, 1, [MONO_GAUCHE, MONO_DROITE, MONO_SOMMET, DEFINITION],
    [spec('Gauche du sommet, parabole vers le haut : décroissante', 0, SP_P, '1', 'correct'),
     spec('Erreur : croissante', 0, SP_P, '0', 'incorrect'),
     spec('Gauche, vers le bas : croissante', 0, SP_N, '0', 'correct'),
     spec('Droite, vers le haut : croissante', 1, SP_P, '0', 'correct'),
     spec('Sommet dedans : ni l\'un ni l\'autre', 2, SP_P, '2', 'correct'),
     spec('Erreur : décroissante', 2, SP_P, '1', 'incorrect'),
     spec('Croissante : f(a) ⩽ f(b)', 3, {'g': 0}, '0', 'correct'),
     spec('Décroissante : f(a) ⩾ f(b)', 3, {'g': 1}, '1', 'correct'),
     spec('Erreur : même ordre pour décroissante', 3, {'g': 1}, '0', 'incorrect')]))

# =============================================================================================
# 2. 2-473 et 3. 2-346 : tableau de variations, maximum et minimum
# =============================================================================================

# ↗ ↘ ↗ : x0 < x1 < x2 < x3, f(x1) maximum, f(x2) minimum
VAR_TAB = [var('x0', '-6..-4'), var('x1', '-3..-1'), var('x2', '1..3'), var('x3', '4..6'),
           var('y1', '3..7'), var('y0', '-1..2'), var('y2', '-6..-3'), var('y3', '0..2')]
DOM = ['{{x0}}', '{{x1}}', '{{x2}}', '{{x3}}']
TAB = tableau_var(DOM, [('{{x0}}', '{{y0}}', 'bottom'), ('{{x1}}', '{{y1}}', 'top'),
                        ('{{x2}}', '{{y2}}', 'bottom'), ('{{x3}}', '{{y3}}', 'top')])
INTRO_TAB = ('Voici le tableau de variations d\'une fonction $f$ définie sur $\\left[{{x0}}\\,;{{x3}}\\right]$.\n\n'
             + TAB + '\n\n')
BORNES = ' Donne le plus grand intervalle, bornes comprises.\n\n$I=?$'

TAB_DECROIT = variation(
    INTRO_TAB + 'Sur quel intervalle $f$ est-elle décroissante ?' + BORNES
    + '\n\nQuelle est l\'image de ${{x1}}$ par $f$ ?\n\n$f({{x1}})=?$',
    VAR_TAB,
    [case_ens('[{{x1}};{{x2}}]'), case('{{y1}}')],
    ['La flèche descend de ${{x1}}$ à ${{x2}}$ : $f$ est décroissante sur $'
     + col('\\left[{{x1}}\\,;{{x2}}\\right]') + '$.',
     'Sous ${{x1}}$, au bout de la flèche, on lit $f({{x1}})=' + col('{{y1}}', 1) + '$.'])

TAB_CROIT = variation(
    INTRO_TAB + 'Sur quel intervalle, contenant ${{x3}}$, $f$ est-elle croissante ?' + BORNES
    + '\n\nQuelle est l\'image de ${{x2}}$ par $f$ ?\n\n$f({{x2}})=?$',
    VAR_TAB,
    [case_ens('[{{x2}};{{x3}}]'), case('{{y2}}')],
    ['La flèche monte de ${{x2}}$ à ${{x3}}$ : $f$ est croissante sur $'
     + col('\\left[{{x2}}\\,;{{x3}}\\right]') + '$.',
     'Sous ${{x2}}$, au bout de la flèche, on lit $f({{x2}})=' + col('{{y2}}', 1) + '$.'])

SP_T = {'x0': -5, 'x1': -2, 'x2': 2, 'x3': 5, 'y1': 4, 'y0': 1, 'y2': -3, 'y3': 2}
MODELES.append(modele(
    '02-lire-un-tableau-de-variations', 'Lire un tableau de variations',
    'Intervalle où f est croissante ou décroissante, image lue dans un tableau de variations (pièges :'
    ' intervalle des images au lieu des abscisses, bornes inversées)',
    VARIATIONS, 2, [TAB_DECROIT, TAB_CROIT],
    [spec('[−2 ; 2], f(−2) = 4', 0, SP_T, ['[-2;2]', '4'], 'correct'),
     spec('Erreur : intervalle des images [−3 ; 4]', 0, SP_T, ['[-3;4]', '4'], 'incorrect'),
     spec('Erreur : f(−2) lu 1', 0, SP_T, ['[-2;2]', '1'], 'incorrect'),
     spec('[2 ; 5], f(2) = −3', 1, SP_T, ['[2;5]', '-3'], 'correct'),
     spec('Erreur : [−3 ; 2]', 1, SP_T, ['[-3;2]', '-3'], 'incorrect')]))

EXTREMUM_TOUT = variation(
    INTRO_TAB + 'Quel est le maximum de $f$ sur $\\left[{{x0}}\\,;{{x3}}\\right]$ ?\n\n$M=?$\n\nEn quelle valeur'
    ' est-il atteint ?\n\n$x=?$\n\nQuel est le minimum de $f$ sur cet intervalle ?\n\n$m=?$',
    VAR_TAB,
    [case('{{y1}}'), case('{{x1}}'), case('{{y2}}')],
    ['Le maximum est la plus grande valeur lue au bout des flèches : ${{y1}}$ (en ${{x1}}$) ou ${{y3}}$ (en'
     ' ${{x3}}$). Ici $M=' + col('{{y1}}') + '$, atteint en $x=' + col('{{x1}}', 1) + '$.',
     'Le minimum est la plus petite : ${{y0}}$ ou ${{y2}}$, soit $m=' + col('{{y2}}') + '$.'])

EXTREMUM_PARTIE = variation(
    INTRO_TAB + 'Quel est le maximum de $f$ sur $\\left[{{x2}}\\,;{{x3}}\\right]$ ?\n\n$M=?$\n\nEn quelle valeur'
    ' est-il atteint ?\n\n$x=?$',
    VAR_TAB,
    [case('{{y3}}'), case('{{x3}}')],
    ['Sur $\\left[{{x2}}\\,;{{x3}}\\right]$ seulement, $f$ est croissante : son maximum est au bout de la flèche,'
     ' $M=' + col('{{y3}}') + '$, atteint en $x=' + col('{{x3}}', 1) + '$.',
     'Le maximum ${{y1}}$ de tout l\'intervalle est atteint en ${{x1}}$, qui n\'est pas dans'
     ' $\\left[{{x2}}\\,;{{x3}}\\right]$.'])

MODELES.append(modele(
    '03-maximum-minimum-sur-un-intervalle', 'Maximum et minimum sur un intervalle',
    'Maximum, minimum et où ils sont atteints, lus dans un tableau de variations, sur tout l\'intervalle puis'
    ' sur une partie (pièges : abscisse et valeur échangées, maximum de tout l\'intervalle donné pour une partie)',
    EXTREMUMS, 1, [EXTREMUM_TOUT, EXTREMUM_PARTIE],
    [spec('M = 4 en −2, m = −3', 0, SP_T, ['4', '-2', '-3'], 'correct'),
     spec('Erreur : abscisse et valeur échangées', 0, SP_T, ['-2', '4', '-3'], 'incorrect'),
     spec('Erreur : minimum lu au bord (1)', 0, SP_T, ['4', '-2', '1'], 'incorrect'),
     spec('Sur [2 ; 5] : M = 2 en 5', 1, SP_T, ['2', '5'], 'correct'),
     spec('Erreur : maximum global 4', 1, SP_T, ['4', '-2'], 'incorrect')]))

# =============================================================================================
# 4. 2-349 : courbe ↔ tableau de variations
# =============================================================================================

DOM_PARA = ['{{eval:(h)-4}}', '{{h}}', '{{eval:(h)+4}}']


def tableau_para(xs, ys, positions):
    return tableau_var_lignes(xs, list(zip(xs, ys, positions)))


HAUT = ('top', 'bottom', 'top')
BAS = ('bottom', 'top', 'bottom')
Y_BORD = '{{eval:(k)+8*(s)}}'
Y_BORD_OPP = '{{eval:(k)-8*(s)}}'
POS = '{{if:s>0|top|bottom}}'
POS_OPP = '{{if:s>0|bottom|top}}'

COURBE_VERS_TABLEAU = variation(
    INTRO_PARA + bloc_choix('Quel est le tableau de variations de $f$ ?', [
        tableau_var_lignes(DOM_PARA, [(DOM_PARA[0], Y_BORD, POS), ('{{h}}', '{{k}}', POS_OPP),
                                      (DOM_PARA[2], Y_BORD, POS)]),
        tableau_var_lignes(DOM_PARA, [(DOM_PARA[0], Y_BORD_OPP, POS_OPP), ('{{h}}', '{{k}}', POS),
                                      (DOM_PARA[2], Y_BORD_OPP, POS_OPP)]),
        tableau_var_lignes(['{{eval:(k)-4}}', '{{k}}', '{{eval:(k)+4}}'],
                           [('{{eval:(k)-4}}', Y_BORD, POS), ('{{k}}', '{{h}}', POS_OPP),
                            ('{{eval:(k)+4}}', Y_BORD, POS)]),
        tableau_var_lignes([DOM_PARA[0], DOM_PARA[2]], [(DOM_PARA[0], Y_BORD_OPP, POS_OPP),
                                                        (DOM_PARA[2], Y_BORD, POS)])]),
    VAR_PARA,
    [case('0')],
    ['La courbe {{if:s>0|descend jusqu\'au sommet puis monte|monte jusqu\'au sommet puis descend}} : le tableau'
     ' a deux flèches, qui changent de sens en $x={{h}}$, abscisse du sommet, où $f({{h}})={{k}}$.',
     tableau_var(DOM_PARA, [(DOM_PARA[0], Y_BORD, POS), ('{{h}}', '{{k}}', POS_OPP), (DOM_PARA[2], Y_BORD, POS)])],
    ['h != k'])


def courbe_choix(expression, description):
    return courbe_lignes(X_PARA, Y_PARA, ['f(x) = ' + expression + ' sur [{{eval:(h)-4}} ; {{eval:(h)+4}}]'
                                          '   bleu'], description, taille='petite')


TABLEAU_VERS_COURBE = variation(
    'Voici le tableau de variations d\'une fonction $f$ définie sur $\\left[{{eval:(h)-4}}\\,;{{eval:(h)+4}}\\right]$.'
    '\n\n' + tableau_var(DOM_PARA, [(DOM_PARA[0], Y_BORD, POS), ('{{h}}', '{{k}}', POS_OPP),
                                    (DOM_PARA[2], Y_BORD, POS)]) + '\n\n'
    + bloc_choix('Quelle courbe peut représenter $f$ ?', [
        courbe_choix(PARA, DESC_PARA),
        courbe_choix('-({{s}})*0.5*(x-({{h}}))^2+({{k}})+8*({{s}})',
                     'Parabole tournée vers le {{if:s>0|bas|haut}}, de sommet ({{h}} ; {{eval:(k)+8*(s)}}).'),
        courbe_choix('{{s}}*0.5*(x-({{h}})-2)^2+({{k}})',
                     'Parabole tournée vers le {{if:s>0|haut|bas}}, de sommet ({{eval:(h)+2}} ; {{k}}).'),
        courbe_choix('{{s}}*(x-({{h}}))+({{k}})+4*({{s}})',
                     'Droite {{if:s>0|montante|descendante}} passant par ({{h}} ; {{eval:(k)+4*(s)}}).')]),
    VAR_PARA,
    [case('0')],
    ['La courbe doit {{if:s>0|descendre jusqu\'en $x={{h}}$ puis monter|monter jusqu\'en $x={{h}}$ puis'
     ' descendre}}, et passer par le point $({{h}}\\,;{{k}})$ : c\'est la parabole de sommet $' + col('({{h}}\\,;'
     '{{k}})') + '$.', COURBE_PARA])

MODELES.append(modele(
    '04-relier-courbe-et-tableau-de-variations', 'Relier courbe et tableau de variations',
    'Choisir le tableau de variations d\'une courbe, puis la courbe d\'un tableau (pièges : flèches à'
    ' l\'envers, abscisse et ordonnée du sommet échangées, extremum mal placé)',
    VARIATIONS, 3, [COURBE_VERS_TABLEAU, TABLEAU_VERS_COURBE],
    [spec('Le bon tableau', 0, SP_P, '0', 'correct'),
     spec('Erreur : flèches à l\'envers', 0, SP_P, '1', 'incorrect'),
     spec('Erreur : sommet échangé', 0, SP_P, '2', 'incorrect'),
     spec('La bonne courbe', 1, SP_N, '0', 'correct'),
     spec('Erreur : sommet décalé', 1, SP_N, '2', 'incorrect')],
    delay=90))

# =============================================================================================
# 5. 2-350 : extremums lus sur la courbe
# =============================================================================================

# Parabole sur [h − 2 ; h + 4] : extremum au sommet, l'autre en h + 4 (0,5 × 16 = 8)
X_ASYM = '{{eval:(h)-3}} ; {{eval:(h)+5}}'


def extremums_courbe(s):
    haut = s > 0
    expression = ('' if haut else '-') + '0.5*(x-({{h}}))^2+({{k}})'
    y = '{{eval:(k)-1}} ; {{eval:(k)+9}}' if haut else '{{eval:(k)-9}} ; {{eval:(k)+1}}'
    bord = '{{eval:(k)+8}}' if haut else '{{eval:(k)-8}}'
    return variation(
        'La courbe ci-dessous représente une fonction $f$ définie sur $\\left[{{eval:(h)-2}}\\,;{{eval:(h)+4}}'
        '\\right]$.\n\n'
        + courbe(X_ASYM, y, ['f(x) = ' + expression + ' sur [{{eval:(h)-2}} ; {{eval:(h)+4}}]   bleu'],
                 'Parabole tournée vers le ' + ('haut' if haut else 'bas') + ', de sommet ({{h}} ; {{k}}),'
                 ' tracée de {{eval:(h)-2}} à {{eval:(h)+4}}.')
        + '\n\nQuel est le maximum de $f$ ?\n\n$M=?$\n\nEn quelle valeur est-il atteint ?\n\n$x=?$\n\n'
        'Quel est le minimum de $f$ ?\n\n$m=?$\n\nEn quelle valeur est-il atteint ?\n\n$x=?$',
        [var('h', '-3..3'), var('k', '-3..3')],
        [case(bord if haut else '{{k}}'), case('{{eval:(h)+4}}' if haut else '{{h}}'),
         case('{{k}}' if haut else bord), case('{{h}}' if haut else '{{eval:(h)+4}}')],
        ['Le maximum est l\'ordonnée du point **le plus haut** de la courbe, le minimum celle du point **le plus'
         ' bas** ; on donne aussi leur abscisse.',
         ('Point le plus bas : le sommet $({{h}}\\,;{{k}})$, donc $m=' + col('{{k}}') + '$ en $x={{h}}$. Point le'
          ' plus haut : l\'extrémité droite, donc $M=' + col(bord) + '$ en $x={{eval:(h)+4}}$.') if haut else
         ('Point le plus haut : le sommet $({{h}}\\,;{{k}})$, donc $M=' + col('{{k}}') + '$ en $x={{h}}$. Point le'
          ' plus bas : l\'extrémité droite, donc $m=' + col(bord) + '$ en $x={{eval:(h)+4}}$.')])


SP_E = {'h': 1, 'k': -2}
MODELES.append(modele(
    '05-extremums-lus-sur-une-courbe', 'Extremums lus sur une courbe',
    'Maximum et minimum d\'une fonction sur un intervalle et leurs abscisses, lus sur la courbe (pièges :'
    ' abscisse donnée pour la valeur, maximum cherché au sommet seulement, extrémité oubliée)',
    EXTREMUMS, 2, [extremums_courbe(1), extremums_courbe(-1)],
    [spec('Vers le haut : M = 6 en 5, m = −2 en 1', 0, SP_E, ['6', '5', '-2', '1'], 'correct'),
     spec('Erreur : abscisse et valeur échangées', 0, SP_E, ['5', '6', '1', '-2'], 'incorrect'),
     spec('Erreur : M lu à gauche (0 en −1)', 0, SP_E, ['0', '-1', '-2', '1'], 'incorrect'),
     spec('Vers le bas : M = −2 en 1, m = −10 en 5', 1, SP_E, ['-2', '1', '-10', '5'], 'correct')]))

# =============================================================================================
# 6. 2-354 et 7. 2-355 : variations de |x| et de x²
# =============================================================================================


def variations_reference(nom, expr, label, valeur, categorie, point_titre, desc_courbe):
    tab_r = tableau_var(['-inf', '0', '+inf'], [('0', '0', 'bottom')], label)
    decroit = variation(
        'On note $f$ la fonction ' + nom + ' : $f(x)=' + expr + '$.\n\nSur quel intervalle $f$ est-elle'
        ' décroissante ?' + BORNES,
        [], [case_ens(']-\\infty;0]')],
        ['$f$ décroît jusqu\'en $0$ puis croît : elle est décroissante sur $' + col('\\left]-\\infty\\,;0\\right]')
         + '$.', tab_r])
    croit = variation(
        'On note $f$ la fonction ' + nom + ' : $f(x)=' + expr + '$.\n\nSur quel intervalle $f$ est-elle'
        ' croissante ?' + BORNES,
        [], [case_ens('[0;+\\infty[')],
        ['$f$ décroît jusqu\'en $0$ puis croît : elle est croissante sur $' + col('\\left[0\\,;+\\infty\\right[')
         + '$.', tab_r])
    minimum = variation(
        'On note $f$ la fonction ' + nom + ' : $f(x)=' + expr + '$.\n\nQuel est le minimum de $f$ sur'
        ' $\\mathbb{R}$ ?\n\n$m=?$\n\nEn quelle valeur est-il atteint ?\n\n$x=?$',
        [], [case('0'), case('0')],
        ['$' + expr + '\\geqslant 0$ pour tout réel $x$, et $f(0)=0$ : le minimum est $' + col('0') + '$, atteint'
         ' en $x=' + col('0', 1) + '$.', tab_r])
    v = '{{a}}' if valeur == 'abs' else '{{eval:(a)^2}}'
    dom = ['{{eval:-(a)}}', '0', '{{a}}']
    choix_tab = variation(
        'On note $f$ la fonction ' + nom + ', étudiée sur $\\left[-{{a}}\\,;{{a}}\\right]$.\n\n'
        + bloc_choix('Quel est son tableau de variations ?', [
            tableau_var_lignes(dom, [(dom[0], v, 'top'), ('0', '0', 'bottom'), (dom[2], v, 'top')], label),
            tableau_var_lignes(dom, [(dom[0], '-' + v, 'bottom'), ('0', '0', 'top'), (dom[2], '-' + v, 'bottom')],
                               label),
            tableau_var_lignes(dom, [(dom[0], '-' + v, 'bottom'), ('0', '0', 'center'), (dom[2], v, 'top')],
                               label),
            tableau_var_lignes(dom, [(dom[0], v, 'top'), ('0', '0', 'center'), (dom[2], '-' + v, 'bottom')],
                               label)]),
        [var('a', '2..5')], [case('0')],
        ['$f(-{{a}})=f({{a}})=' + v + '$ et $f(0)=0$ : $f$ décroît de $' + v + '$ à $0$, puis croît de $0$ à $' + v
         + '$.', courbe('-6 ; 6', ('-1 ; 7' if valeur == 'abs' else '-1 ; 26'),
                        ['f(x) = ' + desc_courbe[0] + ' sur [-{{a}} ; {{a}}]   bleu'], desc_courbe[1])])
    return [decroit, croit, minimum, choix_tab]


VA_VARIATIONS = variations_reference('valeur absolue', '\\lvert x\\rvert', '\\lvert x\\rvert', 'abs',
                                     ('Fonctions', 'Valeur absolue', 'Variations'), '',
                                     ('abs(x)', 'Courbe en V, pointe à l\'origine.'))
CARRE_VARIATIONS = variations_reference('carré', 'x^2', 'x^2', 'carre', ('Fonctions', 'Fonction carré',
                                                                          'Variations'), '',
                                        ('x^2', 'Parabole tournée vers le haut, sommet à l\'origine.'))


def specs_reference(a, v):
    return [spec(']−∞ ; 0]', 0, {}, ']-\\infty;0]', 'correct'),
            spec('Erreur : [0 ; +∞[', 0, {}, '[0;+\\infty[', 'incorrect'),
            spec('[0 ; +∞[', 1, {}, '[0;+\\infty[', 'correct'),
            spec('Erreur : ℝ', 1, {}, '\\mathbb{R}', 'incorrect'),
            spec('Minimum 0 en 0', 2, {}, ['0', '0'], 'correct'),
            spec('Le bon tableau', 3, {'a': a}, '0', 'correct'),
            spec('Erreur : ↗ ↘', 3, {'a': a}, '1', 'incorrect'),
            spec('Erreur : croissante (comme x)', 3, {'a': a}, '2', 'incorrect')]


MODELES.append(modele(
    '06-variations-de-la-valeur-absolue', 'Variations de la fonction valeur absolue',
    'Intervalles où |x| décroît et croît, minimum 0 en 0, tableau de variations à choisir (pièges : |x|'
    ' croissante comme x, sens inversés)',
    ('Fonctions', 'Valeur absolue', 'Variations'), 1, VA_VARIATIONS, specs_reference(3, 3)))
MODELES.append(modele(
    '07-variations-du-carre', 'Variations de la fonction carré',
    'Intervalles où x² décroît et croît, minimum 0 en 0, tableau de variations à choisir (pièges : x²'
    ' croissante sur ℝ, sens inversés)',
    ('Fonctions', 'Fonction carré', 'Variations'), 1, CARRE_VARIATIONS, specs_reference(3, 9)))

# =============================================================================================
# 8. 2-356 : comparer f(a) et f(b) numériquement
# =============================================================================================

# u et v sont des décimaux p/10, q/10 (p < q), placés selon la variation
DEC = [var('p', '1..19!10'), var('q', '1..19!10')]


def comparer(nom, expr, u, v, rep, steps):
    return variation(
        'On note $f$ la fonction ' + nom + ' : $f(x)=' + expr + '$. On pose $u=' + u + '$ et $v=' + v + '$.\n\n'
        + choix('Sans calculer les images, compare $f(u)$ et $f(v)$.', COMPARE),
        DEC, [case(rep)], steps, ['p < q'])


P10, Q10 = '{{eval:(p)/10;d}}', '{{eval:(q)/10;d}}'
MP10, MQ10 = '{{eval:-(p)/10;d}}', '{{eval:-(q)/10;d}}'

CMP = [
    # carré, 0 < u < v : croissante sur [0 ; +∞[
    comparer('carré', 'x^2', P10, Q10, '0',
             ['$u$ et $v$ sont dans $\\left[0\\,;+\\infty\\right[$, où la fonction carré est **croissante** :'
              ' les images sont dans le même ordre.', '$u<v$ donc ' + col('f(u)<f(v)') + '.']),
    # carré, u < v < 0 : décroissante sur ]−∞ ; 0]
    comparer('carré', 'x^2', MQ10, MP10, '2',
             ['$u$ et $v$ sont dans $\\left]-\\infty\\,;0\\right]$, où la fonction carré est **décroissante** :'
              ' les images sont dans l\'ordre contraire.', '$u<v$ donc ' + col('f(u)>f(v)') + '.']),
    # inverse, 0 < u < v : décroissante sur ]0 ; +∞[
    comparer('inverse', '\\dfrac{1}{x}', P10, Q10, '2',
             ['$u$ et $v$ sont dans $\\left]0\\,;+\\infty\\right[$, où la fonction inverse est **décroissante** :'
              ' les images sont dans l\'ordre contraire.', '$u<v$ donc ' + col('f(u)>f(v)') + '.']),
    # inverse, u < v < 0 : décroissante sur ]−∞ ; 0[
    comparer('inverse', '\\dfrac{1}{x}', MQ10, MP10, '2',
             ['$u$ et $v$ sont dans $\\left]-\\infty\\,;0\\right[$, où la fonction inverse est **décroissante** :'
              ' les images sont dans l\'ordre contraire.', '$u<v$ donc ' + col('f(u)>f(v)') + '.']),
    # valeur absolue, u < 0 < v : distances à 0
    comparer('valeur absolue', '\\lvert x\\rvert', MQ10, P10, '2',
             ['$u$ et $v$ ne sont pas du même côté de $0$ : on compare leurs **distances à $0$**.',
              '$\\lvert u\\rvert=' + Q10 + '$ et $\\lvert v\\rvert=' + P10 + '$, donc ' + col('f(u)>f(v)') + '.']),
    # carré, u < 0 < v, u plus près de 0
    comparer('carré', 'x^2', MP10, Q10, '0',
             ['$u$ et $v$ ne sont pas du même côté de $0$ : la fonction carré n\'est pas monotone sur un intervalle'
              ' qui les contient. On compare leurs **distances à $0$** : $(-a)^2=a^2$.',
              '$f(u)=f(' + P10 + ')$ et $' + P10 + '<' + Q10 + '$ dans $\\left[0\\,;+\\infty\\right[$, donc '
              + col('f(u)<f(v)') + '.']),
]

SP_C = {'p': 3, 'q': 7}
MODELES.append(modele(
    '08-comparer-des-images-par-le-calcul', 'Comparer des images par le sens de variation',
    'Comparer f(u) et f(v) sans calculer, pour f carré, inverse ou valeur absolue, par le sens de variation'
    ' ou la distance à 0 (pièges : ordre conservé pour une fonction décroissante, (−0,7)² < (−0,3)² « car'
    ' −0,7 < −0,3 », 1/u et 1/v rangés comme u et v)',
    VARIATIONS, 4, CMP,
    [spec('0,3² < 0,7²', 0, SP_C, '0', 'correct'),
     spec('(−0,7)² > (−0,3)²', 1, SP_C, '2', 'correct'),
     spec('Erreur : ordre conservé', 1, SP_C, '0', 'incorrect'),
     spec('1/0,3 > 1/0,7', 2, SP_C, '2', 'correct'),
     spec('Erreur : 1/0,3 < 1/0,7', 2, SP_C, '0', 'incorrect'),
     spec('1/(−0,7) > 1/(−0,3)', 3, SP_C, '2', 'correct'),
     spec('|−0,7| > |0,3|', 4, SP_C, '2', 'correct'),
     spec('Erreur : |−0,7| < |0,3| « car négatif »', 4, SP_C, '0', 'incorrect'),
     spec('(−0,3)² < 0,7²', 5, SP_C, '0', 'correct')]))

# =============================================================================================
# 9. 2-477 : comparer f(a) et f(b) graphiquement
# =============================================================================================


def graphique(nom, expression, y, image, desc, rep, egal=False, valeurs='-4..4!0'):
    v_expr = 'eval:-(u)' if egal else valeurs
    conditions = None if egal else ['u != v', 'fu != fv']
    return variation(
        'La courbe ci-dessous représente la fonction ' + nom + ' $f$. Les points $A$ et $B$ de la courbe ont'
        ' pour abscisses $u={{u}}$ et $v={{v}}$.\n\n'
        + courbe('-5 ; 5', y, ['f(x) = ' + expression + '   bleu'], desc, 'A({{u}} ; {{fu;d}}), B({{v}} ; {{fv;d}})')
        + '\n\n' + choix('Compare $f(u)$ et $f(v)$.', COMPARE),
        [var('u', valeurs), var('v', v_expr), var('fu', 'eval:' + image.replace('X', '(u)')),
         var('fv', 'eval:' + image.replace('X', '(v)'))],
        [case(rep)],
        ['$f(u)$ et $f(v)$ sont les **ordonnées** de $A$ et de $B$ : on compare leurs hauteurs.',
         ('$A$ et $B$ sont à la même hauteur : ' + col('f(u)=f(v)') + '.') if egal else
         ('{{if:fu<fv|$A$ est plus bas que $B$ : ' + col('f(u)<f(v)') + '.|$A$ est plus haut que $B$ : '
          + col('f(u)>f(v)') + '.}}')],
        conditions if not egal else ['u != 0'])


REP_GRAPH = '{{if:fu<fv|0|2}}'
GRAPH = [
    graphique('carré', 'x^2', '-1 ; 17', 'X^2', 'Parabole de la fonction carré, sommet à l\'origine.', REP_GRAPH),
    graphique('valeur absolue', 'abs(x)', '-1 ; 5', 'abs(X)', 'Courbe en V de la valeur absolue, pointe à'
              ' l\'origine.', REP_GRAPH),
    graphique('inverse', '1/x', '-2 ; 2', '1/X', 'Hyperbole de la fonction inverse, deux branches.', REP_GRAPH,
              valeurs='-4|-2|-1|1|2|4'),
    graphique('carré', 'x^2', '-1 ; 17', 'X^2', 'Parabole de la fonction carré, sommet à l\'origine.', '1',
              egal=True),
]
MODELES.append(modele(
    '09-comparer-des-images-graphiquement', 'Comparer des images sur la courbe',
    'Comparer f(u) et f(v) en lisant les hauteurs des points de la courbe d\'une fonction de référence'
    ' (pièges : comparer les abscisses, oubli de l\'égalité f(−u) = f(u))',
    VARIATIONS, 5, GRAPH,
    [spec('x² : f(1) < f(−3)', 0, {'u': 1, 'v': -3, 'fu': 1, 'fv': 9}, '0', 'correct'),
     spec('Erreur : comparer les abscisses', 0, {'u': 1, 'v': -3, 'fu': 1, 'fv': 9}, '2', 'incorrect'),
     spec('|x| : f(−4) > f(2)', 1, {'u': -4, 'v': 2, 'fu': 4, 'fv': 2}, '2', 'correct'),
     spec('1/x : f(−1) < f(2)', 2, {'u': -1, 'v': 2, 'fu': -1, 'fv': 0.5}, '0', 'correct'),
     spec('x² : f(2) = f(−2)', 3, {'u': 2, 'v': -2, 'fu': 4, 'fv': 4}, '1', 'correct'),
     spec('Erreur : f(2) > f(−2)', 3, {'u': 2, 'v': -2, 'fu': 4, 'fv': 4}, '2', 'incorrect')]))

os.makedirs(DOSSIER, exist_ok=True)
for nom, m in MODELES:
    with open(os.path.join(DOSSIER, nom + '.json'), 'w', encoding='utf-8') as f:
        json.dump(m, f, ensure_ascii=False, indent='\t')
        f.write('\n')
subprocess.run(['pnpm', 'exec', 'prettier', '--write', DOSSIER], check=True,
               stdout=subprocess.DEVNULL)
print(f'{len(MODELES)} modèles écrits dans {DOSSIER}')
