"""Écrit les 8 modèles du lot 6 A « Fonctions : généralités et courbes de référence » de la 2de
dans scripts/questions/2de-fonctions-a/.

Phase 0 validée par David le 2026-11-01 (§ 37 du journal `docs/wip/questions-2de-progress.md`).
Bornes : `bornes/lycee/2de.json` (2-325, 2-327, 2-331, 2-447, 2-326 ; 2-333, 2-334, 2-335). Un point
par modèle ; le nœud et le tag sont posés par la migration de rangement, après le `--publier` de
David.

Décisions et pièges :
- ensembles (ensemble de définition, abscisses de deux points) : case `answerKind: 'intervalles'`,
  posée case par case (les modèles mêlent nombres, choix et ensembles) ; ℝ \\ {a} écrit
  `\\mathbb{R}\\setminus\\{a\\}` ;
- 2-326 : dénominateur non nul seulement (pas de √(x − 2), l2-2) ;
- 2-447 : une abscisse seulement si f(x) = b est d'un type du programme (affine, x² + c = b) ;
- courbes de référence (2-333, 334, 335) : case choix entre quatre ` ```courbe ` mélangées, la bonne
  en premier (réponse « 0 ») ;
- jamais de `|` dans un `{{if:…}}` (séparateur) : valeur absolue écrite `\\lvert x\\rvert` ;
- les variables sont substituées telles quelles dans les `eval` : toujours `(a)`, `-(a)` ;
- variables `e` et `i` interdites.

    python3 docs/wip/questions-2de/lot-fonctions-a-2de.py scripts/questions/2de-fonctions-a
"""
import json
import os
import subprocess
import sys

DOSSIER = sys.argv[1]
THEME = 'Fonctions'
GENERALITES = ('Généralités', 'Définition et courbe')


def spec(desc, vi, variables, answers, status, violations=None):
    s = {'description': desc, 'variationIndex': vi,
         'variables': {k: str(v) for k, v in variables.items()},
         'answers': answers if isinstance(answers, list) else [answers],
         'expected': {'status': status}}
    if violations:
        s['expected']['constraintViolations'] = violations
    return s


def modele(nom, title, description, categorie, level, variations, specs, delay=90):
    m = {'title': title, 'description': description, 'grades': ['2'], 'theme': THEME,
         'domain': categorie[0], 'subdomain': categorie[1], 'level': level, 'delay': delay,
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


def point(nom, x, y):
    return nom + '(' + x + '\\,;\\,' + y + ')'


def choix(question, options, melanger=True, plusieurs=False):
    entete = ('plusieurs: oui\n' if plusieurs else '') + ('' if melanger else 'melanger: non\n')
    return question + '\n\n```choix\n' + entete + ''.join('- ' + o + '\n' for o in options) + '```'


def courbe_lignes(x, y, lignes, description, points=None, taille='moyenne'):
    out = ['```courbe', 'x: ' + x, 'y: ' + y, 'grille: 1 ; 1'] + lignes
    if points:
        out.append('points: ' + points)
    return out + ['taille: ' + taille, 'description: ' + description, '```']


def courbe(x, y, lignes, description, points=None):
    return '\n'.join(courbe_lignes(x, y, lignes, description, points))


def choix_courbes(question, x, y, courbes):
    """Case choix entre des courbes (patron `lot-droites-b-2de.py`), mélangées.

    `courbes` : liste de (expression, description) ; la bonne en premier (réponse « 0 »)."""
    options = []
    for expression, description in courbes:
        lignes = courbe_lignes(x, y, ['f(x) = ' + expression + '   bleu'], description, taille='petite')
        options.append('- ' + lignes[0] + '\n' + ''.join('  ' + l + '\n' for l in lignes[1:]))
    return question + '\n\n````choix\n' + ''.join(options) + '````'


OUI_NON = ['Oui', 'Non']
MODELES = []

# =============================================================================================
# Généralités : définition et courbe
# =============================================================================================

# --- 1. 2-325 : ensemble de définition lu sur la courbe --------------------------------------

DF_QUESTION = ('\n\nSur quel ensemble la fonction $f$ est-elle définie ?\n\n'
               'Un disque plein est un point de la courbe ; un disque vide est un point exclu.\n\n'
               '$\\mathcal{D}_f=?$')
DF_INTRO = 'La courbe $\\mathcal{C}_f$ ci-dessous représente une fonction $f$.\n\n'
DF_METHODE = ('$f$ est définie pour les abscisses des points de la courbe : on lit les abscisses de ses'
              ' extrémités. Disque plein : la borne est **comprise** (crochet tourné vers le nombre) ;'
              ' disque vide : elle est **exclue**.')

# Pas d'étiquette C_f : posée près d'une extrémité, elle ressemble à un disque vide.
# Parabole f = m + 0,25(x − (a + b)/2)² sur [a ; b] (le milieu reste dans l'expression : un
# `eval` rendrait ½ en `\dfrac`, que le bloc ne lit pas)
F_PARA = '{{m}}+0.25*(x-({{a}})/2-({{b}})/2)^2'
X_PARA = '{{eval:(a)-1}} ; {{eval:(b)+1}}'
Y_PARA = '{{eval:min(-1,(m)-1)}} ; {{eval:max(1,(m)+5)}}'
VAR_PARA = [var('a', '-5..-1'), var('b', '1..5'), var('m', '-3..0')]

DF_FERME = variation(
    DF_INTRO + courbe(X_PARA, Y_PARA, ['f(x) = ' + F_PARA + ' sur [{{a}} ; {{b}}]   bleu'],
                      'Courbe d\'une fonction f, d\'abscisses allant de {{a}} à {{b}}, extrémités comprises'
                      ' (disques pleins).')
    + DF_QUESTION,
    VAR_PARA,
    [case_ens('[{{a}};{{b}}]')],
    [DF_METHODE,
     'Ici les deux extrémités, d\'abscisses ${{a}}$ et ${{b}}$, sont des disques pleins : $\\mathcal{D}_f='
     + col('\\left[{{a}}\\,;{{b}}\\right]') + '$.'])

# g = 0 : [a ; b[ ; g = 1 : ]a ; b]
DF_DEMI = variation(
    DF_INTRO + courbe(X_PARA, Y_PARA,
                      ['f(x) = ' + F_PARA + ' sur {{if:g==0|[|]}}{{a}} ; {{b}}{{if:g==0|[|]}}   bleu'],
                      'Courbe d\'une fonction f, d\'abscisses allant de {{a}} à {{b}} ; {{if:g==0|disque plein'
                      ' en {{a}}, disque vide en {{b}}|disque vide en {{a}}, disque plein en {{b}}}}.')
    + DF_QUESTION,
    VAR_PARA + [var('g', '0|1')],
    [case_ens('{{if:g==0|[|]}}{{a}};{{b}}{{if:g==0|[|]}}')],
    [DF_METHODE,
     '{{if:g==0|En ${{a}}$ le disque est plein, en ${{b}}$ il est vide|En ${{a}}$ le disque est vide, en'
     ' ${{b}}$ il est plein}} : $\\mathcal{D}_f=' + col('\\left{{if:g==0|[|]}}{{a}}\\,;{{b}}\\right{{if:g==0|[|]}}')
     + '$.'])

# Deux morceaux : f(x) = 0,5x + 3 sur [a ; b], f(x) = 2 − x sur ]c ; d]
DF_REUNION = variation(
    DF_INTRO + courbe('{{eval:(a)-1}} ; {{eval:(d)+1}}', '-4 ; 4',
                      ['f(x) = 0.5*x+3 sur [{{a}} ; {{b}}]   bleu',
                       'g(x) = 2-x sur ]{{c}} ; {{d}}]   bleu'],
                      'Courbe d\'une fonction f en deux morceaux : de {{a}} à {{b}}, disques pleins aux deux'
                      ' bouts ; de {{c}} à {{d}}, disque vide en {{c}} et plein en {{d}}.')
    + DF_QUESTION,
    [var('a', '-6..-4'), var('b', '-2..-1'), var('c', '0..2'), var('d', '4..5')],
    [case_ens('[{{a}};{{b}}]\\cup]{{c}};{{d}}]')],
    [DF_METHODE,
     'La courbe a deux morceaux : $f$ est définie sur la **réunion** des deux intervalles.',
     '$\\mathcal{D}_f=' + col('\\left[{{a}}\\,;{{b}}\\right]\\cup\\left]{{c}}\\,;{{d}}\\right]') + '$.'])

SP_F = {'a': -3, 'b': 4, 'm': -1}
SP_D0 = {'a': -2, 'b': 3, 'm': 0, 'g': 0}
SP_D1 = {'a': -2, 'b': 3, 'm': 0, 'g': 1}
SP_R = {'a': -5, 'b': -2, 'c': 1, 'd': 4}
MODELES.append(modele(
    '01-ensemble-de-definition-lu', 'Lire l\'ensemble de définition sur une courbe',
    'Ensemble de définition lu sur la courbe : intervalle fermé, semi-ouvert (disque vide), réunion de deux'
    ' intervalles (pièges : crochets inversés, ordonnées lues au lieu des abscisses)',
    GENERALITES, 1, [DF_FERME, DF_DEMI, DF_REUNION],
    [spec('[−3 ; 4]', 0, SP_F, '[-3;4]', 'correct'),
     spec('Erreur : crochets ouverts', 0, SP_F, ']-3;4[', 'incorrect'),
     spec('Erreur : sans crochets', 0, SP_F, '-3;4', 'incorrect'),
     spec('[−2 ; 3[', 1, SP_D0, '[-2;3[', 'correct'),
     spec('Erreur : borne exclue comprise', 1, SP_D0, '[-2;3]', 'incorrect'),
     spec(']−2 ; 3]', 1, SP_D1, ']-2;3]', 'correct'),
     spec('Erreur : crochets inversés', 1, SP_D1, '[-2;3[', 'incorrect'),
     spec('[−5 ; −2] ∪ ]1 ; 4]', 2, SP_R, '[-5;-2]\\cup]1;4]', 'correct'),
     spec('Erreur : un seul intervalle [−5 ; 4]', 2, SP_R, '[-5;4]', 'incorrect'),
     spec('Erreur : 1 compris', 2, SP_R, '[-5;-2]\\cup[1;4]', 'incorrect')],
    delay=60))

# --- 2. 2-327 : traduire « A ∈ C_f » ------------------------------------------------------------

APPARTIENT = variation(
    'On considère une fonction $f$ et sa courbe représentative $\\mathcal{C}_f$. Le point $'
    + point('A', '{{a}}', '{{b}}') + '$ appartient à $\\mathcal{C}_f$.\n\n'
    + choix('Quelles phrases sont vraies ?',
            ['$f({{a}})={{b}}$', '$f({{b}})={{a}}$', '${{b}}$ est l\'image de ${{a}}$ par $f$',
             '${{a}}$ est l\'image de ${{b}}$ par $f$', '${{a}}$ est un antécédent de ${{b}}$ par $f$',
             '${{b}}$ est un antécédent de ${{a}}$ par $f$'],
            plusieurs=True),
    [var('a', '-9..9!0'), var('b', '-9..9!0')],
    [case('0;2;4')],
    ['$A(x\\,;\\,y)$ est sur $\\mathcal{C}_f$ si et seulement si $y=f(x)$ : l\'**abscisse** est le nombre de'
     ' départ, l\'**ordonnée** son image.',
     'Ici $' + col('f({{a}})={{b}}') + '$ : ' + col('${{b}}$ est l\'image de ${{a}}$') + ', et '
     + col('${{a}}$ est un antécédent de ${{b}}$') + '.'],
    ['a != b'])

POINT_DE_LA_COURBE = variation(
    'On considère une fonction $f$ telle que $f({{a}})={{b}}$.\n\n'
    + choix('Quel point appartient à la courbe représentative $\\mathcal{C}_f$ de $f$ ?',
            ['$' + point('A', '{{a}}', '{{b}}') + '$', '$' + point('B', '{{b}}', '{{a}}') + '$',
             '$' + point('C', '{{a}}', '0') + '$', '$' + point('D', '0', '{{b}}') + '$']),
    [var('a', '-9..9!0'), var('b', '-9..9!0')],
    [case('0')],
    ['Le point de $\\mathcal{C}_f$ d\'abscisse $x$ a pour ordonnée $f(x)$.',
     'Ici $f({{a}})={{b}}$ : le point $' + col(point('A', '{{a}}', '{{b}}')) + '$ est sur $\\mathcal{C}_f$.'],
    ['a != b'])

SP_AP = {'a': 2, 'b': -5}
MODELES.append(modele(
    '02-traduire-un-point-de-la-courbe', 'Point d\'une courbe : image et antécédent',
    'Traduire « A(a ; b) appartient à C_f » : f(a) = b, image, antécédent ; point de la courbe connaissant'
    ' f(a) = b (pièges : coordonnées échangées, image et antécédent confondus)',
    GENERALITES, 2, [APPARTIENT, POINT_DE_LA_COURBE],
    [spec('f(2) = −5, image, antécédent', 0, SP_AP, '0;2;4', 'correct'),
     spec('Erreur : f(−5) = 2 coché', 0, SP_AP, '0;1;2;4', 'incorrect'),
     spec('Erreur : image et antécédent échangés', 0, SP_AP, '0;3;5', 'incorrect'),
     spec('A(2 ; −5)', 1, SP_AP, '0', 'correct'),
     spec('Erreur : B(−5 ; 2)', 1, SP_AP, '1', 'incorrect')],
    delay=60))

# --- 3. 2-331 : appartenance par le calcul -----------------------------------------------------

APP_QUESTION = ('\n\nCalcule $f({{xa}})$.\n\n$f({{xa}})=?$\n\n'
                + choix('Le point $' + point('A', '{{xa}}', '{{ya}}') + '$ appartient-il à $\\mathcal{C}_f$ ?',
                        OUI_NON, melanger=False))


def app_conclusion(valeur):
    return ('{{if:w==1|$f({{xa}})={{ya}}$, l\'ordonnée de $A$ : **$A$ appartient à $\\mathcal{C}_f$**.|'
            '$f({{xa}})=' + valeur + '\\neq{{ya}}$ : **$A$ n\'appartient pas à $\\mathcal{C}_f$**.}}')


APP_METHODE = ('$A$ appartient à $\\mathcal{C}_f$ si et seulement si son ordonnée est l\'image de son abscisse :'
               ' $y_A=f(x_A)$.')

# w = 1 : A sur C_f ; w = 0 : ordonnée décalée de s
APP_POLYNOME = variation(
    'On considère la fonction $f$ définie sur $\\mathbb{R}$ par $f(x)={{a}}x^2{{b;+}}x{{c;+}}$, et sa'
    ' courbe représentative $\\mathcal{C}_f$.' + APP_QUESTION,
    [var('a', '1..3;±'), var('b', '1..5;±'), var('c', '1..9;±'), var('xa', '-3..3!0'), var('w', '0|1'),
     var('s', '1..3;±'), var('ya', 'eval:(a)*(xa)^2+(b)*(xa)+(c)+(1-(w))*(s)')],
    [case('{{eval:(a)*(xa)^2+(b)*(xa)+(c)}}'), case('{{eval:1-(w)}}')],
    [APP_METHODE,
     '$$f({{xa}})={{a}}\\times{{xa;()}}^2{{b;+}}\\times{{xa;()}}{{c;+}}='
     + col('{{eval:(a)*(xa)^2+(b)*(xa)+(c)}}') + '$$',
     app_conclusion('{{eval:(a)*(xa)^2+(b)*(xa)+(c)}}')])

APP_PRODUIT = variation(
    'On considère la fonction $f$ définie sur $\\mathbb{R}$ par $f(x)=(x{{p;+}})(x{{q;+}})$, et sa courbe'
    ' représentative $\\mathcal{C}_f$.' + APP_QUESTION,
    [var('p', '1..6;±'), var('q', '1..6;±'), var('xa', '-5..5'), var('w', '0|1'), var('s', '1..3;±'),
     var('ya', 'eval:((xa)+(p))*((xa)+(q))+(1-(w))*(s)')],
    [case('{{eval:((xa)+(p))*((xa)+(q))}}'), case('{{eval:1-(w)}}')],
    [APP_METHODE,
     '$$f({{xa}})=({{xa}}{{p;+}})({{xa}}{{q;+}})={{eval:(xa)+(p);()}}\\times{{eval:(xa)+(q);()}}='
     + col('{{eval:((xa)+(p))*((xa)+(q))}}') + '$$',
     app_conclusion('{{eval:((xa)+(p))*((xa)+(q))}}')],
    ['p != q'])

# f(x) = k/(x − c) avec x_A − c = d qui divise k : f(x_A) = r entier
APP_QUOTIENT = variation(
    'On considère la fonction $f$ définie sur $\\mathbb{R}\\setminus\\{ {{c}} \\}$ par'
    ' $f(x)=\\dfrac{ {{k}} }{x{{eval:-(c);+}}}$, et sa courbe représentative $\\mathcal{C}_f$.'
    + APP_QUESTION,
    [var('c', '-4..4!0'), var('d', '1..4;±'), var('r', '1..5;±'), var('k', 'eval:(d)*(r)'),
     var('xa', 'eval:(c)+(d)'), var('w', '0|1'), var('s', '1..3;±'), var('ya', 'eval:(r)+(1-(w))*(s)')],
    [case('{{r}}'), case('{{eval:1-(w)}}')],
    [APP_METHODE,
     '$$f({{xa}})=\\dfrac{ {{k}} }{ {{xa}}{{eval:-(c);+}} }=\\dfrac{ {{k}} }{ {{d}} }=' + col('{{r}}') + '$$',
     app_conclusion('{{r}}')],
    ['xa != 0'])

SP_PO_OUI = {'a': 2, 'b': -3, 'c': 1, 'xa': 2, 'w': 1, 's': 1, 'ya': 3}
SP_PO_NON = {'a': 2, 'b': -3, 'c': 1, 'xa': 2, 'w': 0, 's': 2, 'ya': 5}
SP_PO_NEG = {'a': -1, 'b': 2, 'c': 3, 'xa': -2, 'w': 1, 's': 1, 'ya': -5}
SP_PR = {'p': -1, 'q': 2, 'xa': 3, 'w': 1, 's': 1, 'ya': 10}
SP_QU = {'c': 1, 'd': -2, 'r': 3, 'k': -6, 'xa': -1, 'w': 0, 's': 1, 'ya': 4}
MODELES.append(modele(
    '03-appartenance-a-une-courbe', 'Un point est-il sur la courbe ? (par le calcul)',
    'Calculer f(x_A) puis dire si A est sur C_f : polynôme du second degré, produit, quotient k/(x − c)'
    ' (pièges : (−2)² calculé −4, coordonnées échangées, conclusion sans calcul)',
    GENERALITES, 3, [APP_POLYNOME, APP_PRODUIT, APP_QUOTIENT],
    [spec('f(x) = 2x² − 3x + 1, f(2) = 3, A(2 ; 3) : « Oui »', 0, SP_PO_OUI, ['3', '0'], 'correct'),
     spec('A(2 ; 5) : « Non »', 0, SP_PO_NON, ['3', '1'], 'correct'),
     spec('Erreur : « Oui » pour A(2 ; 5)', 0, SP_PO_NON, ['3', '0'], 'incorrect'),
     spec('−x² + 2x + 3, f(−2) = −5', 0, SP_PO_NEG, ['-5', '0'], 'correct'),
     spec('Erreur : (−2)² = −4 → f(−2) = 3', 0, SP_PO_NEG, ['3', '1'], 'incorrect'),
     spec('(x − 1)(x + 2), f(3) = 10 : « Oui »', 1, SP_PR, ['10', '0'], 'correct'),
     spec('−6/(x − 1), f(−1) = 3, A(−1 ; 4) : « Non »', 2, SP_QU, ['3', '1'], 'correct'),
     spec('Erreur : signe (f(−1) = −3)', 2, SP_QU, ['-3', '1'], 'incorrect')]))

# --- 4. 2-447 : coordonnées d'un point de la courbe ---------------------------------------------

ORDONNEE = variation(
    'On considère la fonction $f$ définie sur $\\mathbb{R}$ par $f(x)={{a}}x^2{{b;+}}x{{c;+}}$, et sa'
    ' courbe représentative $\\mathcal{C}_f$.\n\nLe point $A$ de $\\mathcal{C}_f$ a pour abscisse ${{xa}}$.'
    ' Calcule son ordonnée.\n\n$y_A=?$',
    [var('a', '1..3;±'), var('b', '1..5;±'), var('c', '1..9;±'), var('xa', '-3..3!0')],
    [case('{{eval:(a)*(xa)^2+(b)*(xa)+(c)}}')],
    ['$A$ est sur $\\mathcal{C}_f$ : son ordonnée est l\'image de son abscisse, $y_A=f({{xa}})$.',
     '$$y_A={{a}}\\times{{xa;()}}^2{{b;+}}\\times{{xa;()}}{{c;+}}='
     + col('{{eval:(a)*(xa)^2+(b)*(xa)+(c)}}') + '$$'])

ABSCISSE_AFFINE = variation(
    'On considère la fonction $f$ définie sur $\\mathbb{R}$ par $f(x)={{m}}x{{p;+}}$, et sa courbe'
    ' représentative $\\mathcal{C}_f$.\n\nLe point $A$ de $\\mathcal{C}_f$ a pour ordonnée ${{yb}}$.'
    ' Calcule son abscisse.\n\n$x_A=?$',
    [var('m', '2..5;±'), var('p', '1..9;±'), var('yb', '-9..9')],
    [case('{{eval:((yb)-(p))/(m)}}')],
    ['$A$ est sur $\\mathcal{C}_f$ : son abscisse $x$ vérifie $f(x)={{yb}}$, une équation du premier degré.',
     '$${{m}}x{{p;+}}={{yb}}\\iff{{m}}x={{eval:(yb)-(p)}}\\iff x=' + col('{{eval:((yb)-(p))/(m)}}') + '$$'],
    ['yb != p'])

# f(x) = x² + c, ordonnée b = r² + c : deux points, d'abscisses −r et r
ABSCISSES_CARRE = variation(
    'On considère la fonction $f$ définie sur $\\mathbb{R}$ par $f(x)=x^2{{c;+}}$, et sa courbe'
    ' représentative $\\mathcal{C}_f$.\n\nDétermine les abscisses des points de $\\mathcal{C}_f$ d\'ordonnée'
    ' ${{yb}}$.\n\nL\'ensemble de ces abscisses est $?$',
    [var('c', '1..9;±'), var('r', '1..5'), var('yb', 'eval:(r)^2+(c)')],
    [case_ens('\\{ {{eval:-(r)}} ; {{r}} \\}')],
    ['Les abscisses cherchées sont les solutions de $f(x)={{yb}}$ :',
     '$$x^2{{c;+}}={{yb}}\\iff x^2={{eval:(r)^2}}\\iff x={{r}}\\ \\text{ou}\\ x=-{{r}}$$',
     'Deux points de $\\mathcal{C}_f$ ont pour ordonnée ${{yb}}$ : leurs abscisses forment l\'ensemble $'
     + col('\\{-{{r}}\\,;{{r}}\\}') + '$.'])

SP_OR = {'a': -2, 'b': 3, 'c': 5, 'xa': -1}
SP_AA = {'m': 3, 'p': -2, 'yb': 7}
SP_AF = {'m': -4, 'p': 1, 'yb': 7}
SP_AC = {'c': -3, 'r': 2, 'yb': 1}
MODELES.append(modele(
    '04-coordonnees-d-un-point-de-la-courbe', 'Coordonnées d\'un point de la courbe',
    'Ordonnée du point de C_f d\'abscisse donnée (f(a)) ; abscisse du point d\'ordonnée donnée, f affine ;'
    ' abscisses des deux points d\'ordonnée donnée, f(x) = x² + c (pièges : f(b) au lieu de résoudre,'
    ' une seule des deux abscisses)',
    GENERALITES, 4, [ORDONNEE, ABSCISSE_AFFINE, ABSCISSES_CARRE],
    [spec('−2x² + 3x + 5, x = −1 → 0', 0, SP_OR, '0', 'correct'),
     spec('Erreur : (−1)² = −1 → 4', 0, SP_OR, '4', 'incorrect'),
     spec('3x − 2 = 7 → 3', 1, SP_AA, '3', 'correct'),
     spec('Erreur : f(7) = 19', 1, SP_AA, '19', 'incorrect'),
     spec('−4x + 1 = 7 → −3/2', 1, SP_AF, '-\\frac{3}{2}', 'correct'),
     spec('En décimal −1,5', 1, SP_AF, '-1.5', 'correct'),
     spec('x² − 3 = 1 → {−2 ; 2}', 2, SP_AC, '\\{-2;2\\}', 'correct'),
     spec('Erreur : une seule abscisse', 2, SP_AC, '\\{2\\}', 'incorrect'),
     spec('Erreur : sans accolades', 2, SP_AC, '-2;2', 'incorrect')]))

# --- 5. 2-326 : ensemble de définition d'un quotient -------------------------------------------

DQ_QUESTION = '\n\nDétermine l\'ensemble de définition de $f$.\n\n$\\mathcal{D}_f=?$'
DQ_METHODE = 'Un quotient n\'existe que si son **dénominateur n\'est pas nul** : on cherche les valeurs interdites.'

DQ_SIMPLE = variation(
    'On considère la fonction $f$ définie par $f(x)=\\dfrac{ {{a}}x{{b;+}} }{x{{eval:-(c);+}}}$.' + DQ_QUESTION,
    [var('a', '1..5;±'), var('b', '1..9;±'), var('c', '1..9;±')],
    [case_ens('\\mathbb{R}\\setminus\\{ {{c}} \\}')],
    [DQ_METHODE,
     '$$x{{eval:-(c);+}}=0\\iff x={{c}}$$',
     '${{c}}$ est la seule valeur interdite : $\\mathcal{D}_f=' + col('\\mathbb{R}\\setminus\\{ {{c}} \\}') + '$.'],
    ['(a)*(c)+(b) != 0'])

DQ_FRACTION = variation(
    'On considère la fonction $f$ définie par $f(x)=\\dfrac{x{{b;+}} }{ {{a}}x{{d;+}} }$.' + DQ_QUESTION,
    [var('a', '2..5;±'), var('d', '1..9;±'), var('b', '1..9;±')],
    [case_ens('\\mathbb{R}\\setminus\\{ {{eval:-(d)/(a)}} \\}')],
    [DQ_METHODE,
     '$${{a}}x{{d;+}}=0\\iff{{a}}x={{eval:-(d)}}\\iff x={{eval:-(d)/(a)}}$$',
     '$\\mathcal{D}_f=' + col('\\mathbb{R}\\setminus\\left\\{ {{eval:-(d)/(a)}} \\right\\}') + '$.'],
    ['mod(d, a) != 0', '(b)*(a) != (d)'])

DQ_PRODUIT = variation(
    'On considère la fonction $f$ définie par $f(x)=\\dfrac{ {{k}} }{(x{{eval:-(p);+}})(x{{eval:-(q);+}})}$.'
    + DQ_QUESTION,
    [var('k', '1..9;±'), var('p', '-6..6!0'), var('q', '-6..6!0')],
    [case_ens('\\mathbb{R}\\setminus\\{ {{p}} ; {{q}} \\}')],
    [DQ_METHODE,
     'Le dénominateur est un produit : il est nul si et seulement si l\'un de ses facteurs est nul.',
     '$$(x{{eval:-(p);+}})(x{{eval:-(q);+}})=0\\iff x={{p}}\\ \\text{ou}\\ x={{q}}$$',
     '$\\mathcal{D}_f=' + col('\\mathbb{R}\\setminus\\{ {{eval:min(p,q)}} ; {{eval:max(p,q)}} \\}') + '$.'],
    ['p != q'])

SP_DS = {'a': 2, 'b': 1, 'c': 3}
SP_DF = {'a': 2, 'd': -5, 'b': 1}
SP_DP = {'k': 4, 'p': -2, 'q': 1}
MODELES.append(modele(
    '05-ensemble-de-definition-d-un-quotient', 'Ensemble de définition d\'un quotient',
    'Valeurs interdites d\'une fonction quotient : dénominateur x − c, ax + b (valeur fractionnaire),'
    ' produit (x − p)(x − q) ; ℝ privé des valeurs interdites (pièges : signe de la valeur, numérateur'
    ' annulé, {3} au lieu de ℝ \\ {3})',
    GENERALITES, 5, [DQ_SIMPLE, DQ_FRACTION, DQ_PRODUIT],
    [spec('(2x + 1)/(x − 3) → ℝ \\ {3}', 0, SP_DS, '\\mathbb{R}\\setminus\\{3\\}', 'correct'),
     spec('Réunion ]−∞ ; 3[ ∪ ]3 ; +∞[', 0, SP_DS, ']-\\infty;3[\\cup]3;+\\infty[', 'correct'),
     spec('Erreur : signe (ℝ \\ {−3})', 0, SP_DS, '\\mathbb{R}\\setminus\\{-3\\}', 'incorrect'),
     spec('Erreur : la valeur interdite seule', 0, SP_DS, '\\{3\\}', 'incorrect'),
     spec('Erreur : ℝ', 0, SP_DS, '\\mathbb{R}', 'incorrect'),
     spec('(x + 1)/(2x − 5) → ℝ \\ {5/2}', 1, SP_DF, '\\mathbb{R}\\setminus\\{\\frac{5}{2}\\}', 'correct'),
     spec('Erreur : valeur du numérateur (ℝ \\ {−1})', 1, SP_DF, '\\mathbb{R}\\setminus\\{-1\\}', 'incorrect'),
     spec('4/((x + 2)(x − 1)) → ℝ \\ {−2 ; 1}', 2, SP_DP, '\\mathbb{R}\\setminus\\{-2;1\\}', 'correct'),
     spec('Erreur : une seule valeur', 2, SP_DP, '\\mathbb{R}\\setminus\\{1\\}', 'incorrect'),
     spec('Erreur : signes (ℝ \\ {2 ; −1})', 2, SP_DP, '\\mathbb{R}\\setminus\\{2;-1\\}', 'incorrect')]))

# =============================================================================================
# Courbes des fonctions de référence
# =============================================================================================

QUELLE_COURBE = 'Quelle figure représente la fonction {} ?'

# --- 6. 2-333 : fonction valeur absolue --------------------------------------------------------

COURBE_ABS = variation(
    choix_courbes(QUELLE_COURBE.format('valeur absolue $x\\mapsto\\lvert x\\rvert$'), '-4 ; 4', '-4 ; 4',
                  [('abs(x)', 'Courbe en V, pointe en bas à l\'origine, passant par (−2 ; 2) et (2 ; 2).'),
                   ('-abs(x)', 'Courbe en V renversé, pointe en haut à l\'origine, passant par (−2 ; −2) et'
                    ' (2 ; −2).'),
                   ('x^2', 'Parabole tournée vers le haut, sommet à l\'origine, passant par (−2 ; 4) et'
                    ' (2 ; 4).'),
                   ('x', 'Droite passant par l\'origine et par (2 ; 2).')]),
    [],
    [case('0')],
    ['$\\lvert x\\rvert=x$ si $x\\geqslant 0$ et $\\lvert x\\rvert=-x$ si $x<0$ : la courbe est formée de deux'
     ' demi-droites, $y=x$ à droite de l\'origine et $y=-x$ à gauche. Elle est en **V**, au-dessus de l\'axe'
     ' des abscisses.',
     courbe('-4 ; 4', '-1 ; 4', ['f(x) = abs(x)   bleu   nom=C_f'],
            'Courbe de la fonction valeur absolue : un V de pointe l\'origine, passant par (−2 ; 2) et (2 ; 2).',
            'A(-2 ; 2), B(2 ; 2)')])

ABS_NEGATIF = variation(
    choix('Pour tout réel $x<0$, que vaut $\\lvert x\\rvert$ ?', ['$-x$', '$x$', '$0$', '$\\dfrac{1}{x}$']),
    [],
    [case('0')],
    ['La valeur absolue d\'un nombre négatif est son opposé : pour $x<0$, $' + col('\\lvert x\\rvert=-x') + '$,'
     ' qui est positif (par exemple $\\lvert -3\\rvert=-(-3)=3$).'])

ABS_IMAGE = variation(
    'On note $f$ la fonction valeur absolue : $f(x)=\\lvert x\\rvert$.\n\nCalcule l\'image de ${{eval:-(a)}}$'
    ' par $f$.\n\n$f({{eval:-(a)}})=?$',
    [var('a', '1..15')],
    [case('{{a}}')],
    ['${{eval:-(a)}}<0$ : sa valeur absolue est son opposé.',
     '$$f({{eval:-(a)}})=\\lvert {{eval:-(a)}}\\rvert=' + col('{{a}}') + '$$'])

SP_IM = {'a': 7}
MODELES.append(modele(
    '06-fonction-valeur-absolue', 'La fonction valeur absolue',
    'Reconnaître la courbe de x ↦ |x| (V de pointe l\'origine) ; |x| = −x pour x < 0 ; image d\'un'
    ' négatif (pièges : parabole prise pour le V, |x| = x toujours, image négative)',
    ('Valeur absolue', 'Courbe'), 1, [COURBE_ABS, ABS_NEGATIF, ABS_IMAGE],
    [spec('La courbe en V', 0, {}, '0', 'correct'),
     spec('Erreur : la parabole', 0, {}, '2', 'incorrect'),
     spec('−x', 1, {}, '0', 'correct'),
     spec('Erreur : x', 1, {}, '1', 'incorrect'),
     spec('|−7| = 7', 2, SP_IM, '7', 'correct'),
     spec('Erreur : −7', 2, SP_IM, '-7', 'incorrect')],
    delay=60))

# --- 7. 2-334 : fonction carré -------------------------------------------------------------------

COURBE_CARRE = variation(
    choix_courbes(QUELLE_COURBE.format('carré $x\\mapsto x^2$'), '-3 ; 3', '-4 ; 5',
                  [('x^2', 'Parabole tournée vers le haut, sommet à l\'origine, passant par (−1 ; 1), (1 ; 1)'
                    ' et (2 ; 4).'),
                   ('-x^2', 'Parabole tournée vers le bas, sommet à l\'origine, passant par (1 ; −1) et'
                    ' (2 ; −4).'),
                   ('abs(x)', 'Courbe en V, pointe à l\'origine, passant par (2 ; 2).'),
                   ('2*x', 'Droite passant par l\'origine et par (2 ; 4).')]),
    [],
    [case('0')],
    ['La courbe de $x\\mapsto x^2$ est une **parabole** de sommet l\'origine, tournée vers le haut (un carré'
     ' est positif), symétrique par rapport à l\'axe des ordonnées ($(-x)^2=x^2$).',
     courbe('-3 ; 3', '-1 ; 5', ['f(x) = x^2   bleu   nom=C_f'],
            'Parabole de la fonction carré, passant par (−2 ; 4), (−1 ; 1), (0 ; 0), (1 ; 1) et (2 ; 4).',
            'A(-2 ; 4), B(-1 ; 1), C(1 ; 1), D(2 ; 4)'),
     'Elle passe par $(1\\,;1)$ et $(2\\,;4)$ : ce n\'est pas le V de la valeur absolue, qui passe par'
     ' $(2\\,;2)$.'])

CARRE_NEGATIF = variation(
    'On note $f$ la fonction carré : $f(x)=x^2$.\n\nCalcule l\'image de ${{eval:-(a)}}$ par $f$.\n\n'
    '$f({{eval:-(a)}})=?$',
    [var('a', '2..12')],
    [case('{{eval:(a)^2}}')],
    ['On élève au carré **tout** le nombre, signe compris : on écrit les parenthèses.',
     '$$f({{eval:-(a)}})=({{eval:-(a)}})^2=({{eval:-(a)}})\\times({{eval:-(a)}})=' + col('{{eval:(a)^2}}') + '$$',
     'Un carré n\'est jamais négatif.'])

CARRE_DECIMAL = variation(
    'On note $f$ la fonction carré : $f(x)=x^2$.\n\nCalcule l\'image de ${{x0;d}}$ par $f$.\n\n$f({{x0;d}})=?$',
    [var('n', '1..9'), var('d', '10|100'), var('sg', '1|-1'), var('x0', 'eval:(sg)*(n)/(d)')],
    [case('{{eval:(n)^2/(d)^2;d}}')],
    ['$$f({{x0;d}})=({{x0;d}})^2=' + col('{{eval:(n)^2/(d)^2;d}}') + '$$',
     'Il y a deux fois plus de chiffres après la virgule dans le carré que dans le nombre.'])

SP_CN = {'a': 3}
SP_CD = {'n': 3, 'd': 10, 'sg': -1, 'x0': '-0.3'}
MODELES.append(modele(
    '07-fonction-carre', 'La fonction carré',
    'Reconnaître la parabole de x ↦ x² ; image d\'un négatif, d\'un décimal (pièges : −3² = −9, parabole'
    ' renversée, V de la valeur absolue, 0,3² = 0,9)',
    ('Fonction carré', 'Courbe'), 2, [COURBE_CARRE, CARRE_NEGATIF, CARRE_DECIMAL],
    [spec('La parabole', 0, {}, '0', 'correct'),
     spec('Erreur : le V', 0, {}, '2', 'incorrect'),
     spec('(−3)² = 9', 1, SP_CN, '9', 'correct'),
     spec('Erreur : −9', 1, SP_CN, '-9', 'incorrect'),
     spec('(−0,3)² = 0,09', 2, SP_CD, '0.09', 'correct'),
     spec('Erreur : 0,9', 2, SP_CD, '0.9', 'incorrect'),
     spec('Erreur : −0,09', 2, SP_CD, '-0.09', 'incorrect')],
    delay=60))

# --- 8. 2-335 : fonction inverse ----------------------------------------------------------------

COURBE_INVERSE = variation(
    choix_courbes(QUELLE_COURBE.format('inverse $x\\mapsto\\dfrac{1}{x}$'), '-4 ; 4', '-4 ; 4',
                  [('1/x', 'Hyperbole en deux branches, l\'une pour x > 0 au-dessus de l\'axe des abscisses,'
                    ' l\'autre pour x < 0 en dessous ; passe par (1 ; 1) et (−1 ; −1).'),
                   ('-1/x', 'Hyperbole en deux branches, l\'une pour x > 0 sous l\'axe des abscisses,'
                    ' l\'autre pour x < 0 au-dessus ; passe par (1 ; −1) et (−1 ; 1).'),
                   ('x^2', 'Parabole tournée vers le haut, sommet à l\'origine.'),
                   ('abs(x)', 'Courbe en V, pointe à l\'origine.')]),
    [],
    [case('0')],
    ['$\\dfrac{1}{x}$ n\'existe pas pour $x=0$ : la courbe a **deux branches**. $\\dfrac{1}{x}$ est du signe de'
     ' $x$ : la branche des $x>0$ est au-dessus de l\'axe des abscisses, celle des $x<0$ en dessous.',
     courbe('-4 ; 4', '-4 ; 4', ['f(x) = 1/x   bleu   nom=C_f'],
            'Hyperbole de la fonction inverse, passant par (1 ; 1), (2 ; 0,5), (−1 ; −1) et (−2 ; −0,5).',
            'A(1 ; 1), B(-1 ; -1)')])

INVERSE_DOMAINE = variation(
    'On note $f$ la fonction inverse : $f(x)=\\dfrac{1}{x}$.\n\nSur quel ensemble la fonction $f$ est-elle'
    ' définie ?\n\n$\\mathcal{D}_f=?$',
    [],
    [case_ens('\\mathbb{R}\\setminus\\{0\\}')],
    ['On ne peut pas diviser par $0$ : $0$ n\'a pas d\'image, tout autre réel en a une.',
     '$\\mathcal{D}_f=' + col('\\mathbb{R}\\setminus\\{0\\}') + '$, qu\'on écrit aussi'
     ' $\\left]-\\infty\\,;0\\right[\\cup\\left]0\\,;+\\infty\\right[$.'])

INVERSE_IMAGE = variation(
    'On note $f$ la fonction inverse : $f(x)=\\dfrac{1}{x}$.\n\nCalcule l\'image de $'
    '{{if:sg<0|-}}\\dfrac{ {{p}} }{ {{q}} }$ par $f$.\n\n$f\\left({{if:sg<0|-}}\\dfrac{ {{p}} }{ {{q}} }\\right)=?$',
    [var('p', '1..9'), var('q', '2..9'), var('sg', '1|-1')],
    [case('{{eval:(sg)*(q)/(p)}}')],
    ['L\'inverse d\'une fraction s\'obtient en échangeant numérateur et dénominateur ; le signe ne change pas.',
     '$$f\\left({{if:sg<0|-}}\\dfrac{ {{p}} }{ {{q}} }\\right)=\\dfrac{1}{ {{if:sg<0|-}}\\dfrac{ {{p}} }{ {{q}} } }'
     '=' + col('{{eval:(sg)*(q)/(p)}}') + '$$'],
    ['gcd(p, q) == 1', 'p != q'])

SP_II = {'p': 2, 'q': 3, 'sg': -1}
MODELES.append(modele(
    '08-fonction-inverse', 'La fonction inverse',
    'Reconnaître l\'hyperbole de x ↦ 1/x ; ensemble de définition ℝ \\ {0} ; image d\'une fraction'
    ' (pièges : hyperbole de −1/x, 0 compris, signe changé, opposé au lieu de l\'inverse)',
    ('Fonction inverse', 'Courbe'), 1, [COURBE_INVERSE, INVERSE_DOMAINE, INVERSE_IMAGE],
    [spec('L\'hyperbole de 1/x', 0, {}, '0', 'correct'),
     spec('Erreur : hyperbole de −1/x', 0, {}, '1', 'incorrect'),
     spec('ℝ \\ {0}', 1, {}, '\\mathbb{R}\\setminus\\{0\\}', 'correct'),
     spec('Réunion ]−∞ ; 0[ ∪ ]0 ; +∞[', 1, {}, ']-\\infty;0[\\cup]0;+\\infty[', 'correct'),
     spec('Erreur : ℝ', 1, {}, '\\mathbb{R}', 'incorrect'),
     spec('Erreur : ]0 ; +∞[', 1, {}, ']0;+\\infty[', 'incorrect'),
     spec('1/(−2/3) = −3/2', 2, SP_II, '-\\frac{3}{2}', 'correct'),
     spec('Erreur : signe (3/2)', 2, SP_II, '\\frac{3}{2}', 'incorrect'),
     spec('Erreur : opposé (2/3)', 2, SP_II, '\\frac{2}{3}', 'incorrect')],
    delay=60))

os.makedirs(DOSSIER, exist_ok=True)
for nom, m in MODELES:
    with open(os.path.join(DOSSIER, nom + '.json'), 'w', encoding='utf-8') as f:
        json.dump(m, f, ensure_ascii=False, indent='\t')
        f.write('\n')
# Mis en forme comme le pre-commit, pour que le script redonne les fichiers commités
subprocess.run(['pnpm', 'exec', 'prettier', '--write', DOSSIER], check=True,
               stdout=subprocess.DEVNULL)
print(f'{len(MODELES)} modèles écrits dans {DOSSIER}')
