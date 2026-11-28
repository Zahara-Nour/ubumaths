"""Écrit les modèles du lot 2 « second degré sans formule » de la 1re techno dans
scripts/questions/1techno-2/.

Phase 0 validée par David le 2026-11-17 (journal docs/archive/wip/questions-1techno-progress.md, § 24).
Sept modèles COMMUNS à la 1re générale et à la 1re techno (points identiques, accord de
questions-1gen : c'est tout son lot 5), un modèle propre à la 1re techno (064) :

- M1 allure → 1TECHNO-057 + 1GEN-022 (remplace 1acb6d47 pour 057) ;
- M2 associer une parabole → 1TECHNO-061 + 1GEN-024 ;
- M3 axe de symétrie → 1TECHNO-123 + 1GEN-052 ;
- M4 sommet → 1TECHNO-124 + 1GEN-053 ;
- M5 ax² + bx + c par f(x) = c → 1TECHNO-062 + 1GEN-025 ;
- M6 tableau de variation → 1TECHNO-125 + 1GEN-054 ;
- M7 signe sous forme factorisée → 1TECHNO-126 + 1GEN-027 (afe51ac4 porte déjà 1GEN-055 et
  1TECHNO-066 : un point par programme) ;
- M8 factoriser connaissant une racine → 1TECHNO-064 (1re techno seule).

Bornes (1re générale, la plus stricte) : ni discriminant ni formule −b/2a ; racines lues sur la
forme factorisée, entières ; a entier non nul de −3 à 3. Les corrigés passent par la symétrie
(milieu des racines, deux points de même image), jamais par une formule ni par la dérivée.
Un point par programme (ADR 0020) ; nœud et tags viendront par migration.

    python3 docs/wip/questions/lot-1techno-2.py scripts/questions/1techno-2
"""
import json
import os
import sys

DOSSIER = sys.argv[1]
COMMUNS = ['1_GEN', '1_TECHNO']


def spec(desc, vi, answers, status, variables=None):
    return {'description': desc, 'variationIndex': vi,
            'variables': {k: str(v) for k, v in (variables or {}).items()},
            'answers': answers if isinstance(answers, list) else [answers],
            'expected': {'status': status}}


def var(nom, expression):
    return {'name': nom, 'expression': expression}


X = var('x', 'x|x')


def modele(title, points, description, level, variations, specs, grades=None):
    return {'title': title, 'description': description,
            'grades': grades or COMMUNS, 'level': level, 'delay': 60, 'status': 'draft',
            'shared': {'blankDefaults': {'acceptDecimal': True}, 'cleanCoefficients': True},
            'variations': variations, 'testSpecs': specs, '_points': points}


def variation(statement, blanks, variables, steps, conditions=None):
    v = {'statement': statement, 'blanks': blanks, 'variables': variables,
         'correction': {'steps': steps}}
    if conditions:
        v['conditions'] = conditions
    return v


def a_fois(nom):
    """Coefficient devant une parenthèse : « », « - », « 2 », « -3 »."""
    return '{{if:' + nom + '==-1|-|}}{{if:' + nom + '*' + nom + '>1|{{' + nom + '}}|}}'


# Forme factorisée a(x − r)(x − s), écrite comme dans afe51ac4.
FACT = a_fois('a') + '(x{{eval:-(r);+}})(x{{eval:-(s);+}})'
# Forme piège k(u − x)(x + v) : le coefficient de x² est −k.
PIEGE = a_fois('k') + '({{u}}-x)(x{{eval:v;+}})'

HAUT_BAS = '\n\n```choix\nmelanger: non\n- vers le haut\n- vers le bas\n```'

MODELES = []

# ---------------------------------------------------------------------------------------------
# M1 — allure : 1TECHNO-057 + 1GEN-022
# ---------------------------------------------------------------------------------------------

ALLURE = ('Soit $f$ la fonction définie sur $\\mathbb{R}$ par $f(x)=EXPR$.\n\n'
          'Sa courbe est une parabole tournée :' + HAUT_BAS)
SENS_A = ('{{if:a>0|positif : la parabole est tournée vers le haut|négatif : la parabole est'
          ' tournée vers le bas}}.')
MODELES.append(('M1-allure-de-la-parabole', modele(
    'Allure de la parabole selon le coefficient de x²', ['1TECHNO-057', '1GEN-022'],
    'Parabole tournée vers le haut ou vers le bas, lue sur le coefficient de x²', 1,
    [variation(ALLURE.replace('EXPR', '{{eval:ax^2}}'), [{'expectedAnswer': '{{if:a>0|0|1}}'}],
               [X, var('a', '1..3;±')],
               ['Le coefficient de $x^2$ est $a={{a}}$, ' + SENS_A]),
     variation(ALLURE.replace('EXPR', '{{eval:ax^2+c}}'), [{'expectedAnswer': '{{if:a>0|0|1}}'}],
               [X, var('a', '1..3;±'), var('c', '1..6;±')],
               ['Le coefficient de $x^2$ est $a={{a}}$ (le nombre ${{c}}$ ne compte pas), '
                + SENS_A]),
     variation(ALLURE.replace('EXPR', FACT), [{'expectedAnswer': '{{if:a>0|0|1}}'}],
               [var('a', '1..3;±'), var('r', '-6..6'), var('s', '-6..6')],
               ['En développant, le terme en $x^2$ vient de $' + a_fois('a') + 'x\\times x$ : le'
                ' coefficient de $x^2$ est $a={{a}}$, ' + SENS_A],
               ['r < s']),
     variation(ALLURE.replace('EXPR', '{{eval:ax^2+bx+c}}'), [{'expectedAnswer': '{{if:a>0|0|1}}'}],
               [X, var('a', '1..3;±'), var('b', '1..6;±'), var('c', '-6..6')],
               ['Le coefficient de $x^2$ est $a={{a}}$, ' + SENS_A]),
     variation(ALLURE.replace('EXPR', PIEGE), [{'expectedAnswer': '{{if:k>0|1|0}}'}],
               [var('k', '1..3;±'), var('u', '1..6'), var('v', '1..6')],
               ['En développant, le terme en $x^2$ vient de $' + a_fois('k') + '(-x)\\times x$ :'
                ' le coefficient de $x^2$ est ${{eval:-k}}$, {{if:k>0|négatif : la parabole est'
                ' tournée vers le bas|positif : la parabole est tournée vers le haut}}.',
                'Attention : le signe écrit devant les parenthèses ne suffit pas, le $-x$ de'
                ' ${{u}}-x$ change le signe.'])],
    [spec('a > 0 : haut', 0, '0', 'correct', {'a': 2}),
     spec('Erreur : bas', 0, '1', 'incorrect', {'a': 2}),
     spec('a < 0 : bas', 1, '1', 'correct', {'a': -1, 'c': 4}),
     spec('Erreur : lire le signe de c', 1, '0', 'incorrect', {'a': -1, 'c': 4}),
     spec('-2(x-1)(x-3) : bas', 2, '1', 'correct', {'a': -2, 'r': 1, 's': 3}),
     spec('Erreur : haut', 2, '0', 'incorrect', {'a': -2, 'r': 1, 's': 3}),
     spec('3x²-4x+1 : haut', 3, '0', 'correct', {'a': 3, 'b': -4, 'c': 1}),
     spec('Erreur : lire le signe de b', 3, '1', 'incorrect', {'a': 3, 'b': -4, 'c': 1}),
     spec('2(3-x)(x+1) : bas', 4, '1', 'correct', {'k': 2, 'u': 3, 'v': 1}),
     spec('Erreur : lire le signe devant les parenthèses', 4, '0', 'incorrect',
          {'k': 2, 'u': 3, 'v': 1})])))

# ---------------------------------------------------------------------------------------------
# M2 — associer une parabole à son expression : 1TECHNO-061 + 1GEN-024
# ---------------------------------------------------------------------------------------------


def courbe(fx, description):
    return ('- ```courbe\n  x: -6 ; 6\n  y: -6 ; 6\n  grille: 1 ; 1\n  f(x) = ' + fx
            + '   bleu\n  taille: petite\n  description: ' + description + '\n  ```\n')


def choix_courbes(enonce, courbes):
    """Case choix mélangée, la bonne courbe écrite en premier (index 0)."""
    return enonce + '\n\n````choix\n' + ''.join(courbes) + '````'


def sens(signe_positif):
    return '{{if:' + signe_positif + '|le haut|le bas}}'


QUELLE = 'Soit $f$ la fonction définie sur $\\mathbb{R}$ par $f(x)=EXPR$.\n\nQuelle courbe représente $f$ ?'
MODELES.append(('M2-associer-une-parabole-a-son-expression', modele(
    'Associer une parabole à son expression', ['1TECHNO-061', '1GEN-024'],
    'Formes ax², ax² + c et a(x − x₁)(x − x₂) : sens, sommet ou racines lus sur la courbe', 2,
    [variation(choix_courbes(QUELLE.replace('EXPR', '{{eval:a*x^2}}'), [
        courbe('{{a}}*x^2', 'Parabole tournée vers ' + sens('a>0') + ', passant par le point (1 ; {{a}}).'),
        courbe('-({{a}})*x^2', 'Parabole tournée vers ' + sens('a<0') + ', passant par le point (1 ; {{eval:-a}}).'),
        courbe('{{m}}*x^2', 'Parabole tournée vers ' + sens('m>0') + ', passant par le point (1 ; {{m}}).'),
        courbe('-({{m}})*x^2', 'Parabole tournée vers ' + sens('m<0') + ', passant par le point (1 ; {{eval:-m}}).')]),
        [{'expectedAnswer': '0'}],
        [X, var('s', '1|-1'), var('t', '1|2'), var('a', 'eval:s*t'), var('m', 'eval:s*(3-t)')],
        ['Le coefficient de $x^2$ est ${{a}}$ : la parabole est tournée vers '
         + sens('a>0') + '.',
         '$f(1)={{a}}\\times1^2={{a}}$ : la courbe passe par le point $(1\\,;{{a}})$.']),
     variation(choix_courbes(QUELLE.replace('EXPR', '{{eval:a*x^2+c}}'), [
        courbe('{{a}}*x^2+({{c}})', 'Parabole tournée vers ' + sens('a>0') + ', de sommet (0 ; {{c}}).'),
        courbe('-({{a}})*x^2+({{c}})', 'Parabole tournée vers ' + sens('a<0') + ', de sommet (0 ; {{c}}).'),
        courbe('{{a}}*x^2-({{c}})', 'Parabole tournée vers ' + sens('a>0') + ', de sommet (0 ; {{eval:-c}}).'),
        courbe('-({{a}})*x^2-({{c}})', 'Parabole tournée vers ' + sens('a<0') + ', de sommet (0 ; {{eval:-c}}).')]),
        [{'expectedAnswer': '0'}],
        [X, var('a', '1..2;±'), var('c', '1..4;±')],
        ['Le coefficient de $x^2$ est ${{a}}$ : la parabole est tournée vers '
         + sens('a>0') + '.',
         '$f(0)={{c}}$ : la courbe coupe l\'axe des ordonnées au point $(0\\,;{{c}})$, son'
         ' sommet.']),
     variation(choix_courbes(QUELLE.replace('EXPR', FACT), [
        courbe('{{a}}*(x-({{r}}))*(x-({{s}}))', 'Parabole tournée vers ' + sens('a>0') + ', qui coupe l\'axe des abscisses en {{r}} et {{s}}.'),
        courbe('-({{a}})*(x-({{r}}))*(x-({{s}}))', 'Parabole tournée vers ' + sens('a<0') + ', qui coupe l\'axe des abscisses en {{r}} et {{s}}.'),
        courbe('{{a}}*(x+({{r}}))*(x+({{s}}))', 'Parabole tournée vers ' + sens('a>0') + ', qui coupe l\'axe des abscisses en {{eval:-r}} et {{eval:-s}}.'),
        courbe('-({{a}})*(x+({{r}}))*(x+({{s}}))', 'Parabole tournée vers ' + sens('a<0') + ', qui coupe l\'axe des abscisses en {{eval:-r}} et {{eval:-s}}.')]),
        [{'expectedAnswer': '0'}],
        [var('a', '1|-1'), var('r', '-4..2'), var('d', '2|4'), var('s', 'eval:r+d')],
        ['$f(x)=0$ pour $x={{r}}$ ou $x={{s}}$ : la courbe coupe l\'axe des abscisses en'
         ' ${{r}}$ et en ${{s}}$ (et non en ${{eval:-r}}$ et ${{eval:-s}}$).',
         'Le coefficient de $x^2$ est ${{a}}$ : la parabole est tournée vers '
         + sens('a>0') + '.'],
        ['s <= 4', 'r + s != 0']),
     variation(
        'La parabole ci-dessous représente une fonction $f$.\n\n'
        '```courbe\nx: -6 ; 6\ny: -6 ; 6\ngrille: 1 ; 1\n'
        'f(x) = {{a}}*(x-({{r}}))*(x-({{s}}))   bleu\ntaille: moyenne\n'
        'description: Parabole tournée vers ' + sens('a>0') + ', qui coupe l\'axe des abscisses'
        ' en {{r}} et {{s}}.\n```\n\nQuelle est l\'expression de $f(x)$ ?\n\n```choix\n'
        '- $' + FACT + '$\n'
        '- $' + a_fois('m') + '(x{{eval:-(r);+}})(x{{eval:-(s);+}})$\n'
        '- $' + a_fois('a') + '(x{{eval:r;+}})(x{{eval:s;+}})$\n'
        '- $' + a_fois('m') + '(x{{eval:r;+}})(x{{eval:s;+}})$\n```',
        [{'expectedAnswer': '0'}],
        [var('a', '1|-1'), var('m', 'eval:-a'), var('r', '-4..2'), var('d', '2|4'),
         var('s', 'eval:r+d')],
        ['La courbe coupe l\'axe des abscisses en ${{r}}$ et ${{s}}$ : $f(x)$ s\'annule pour'
         ' $x={{r}}$ et $x={{s}}$, donc $f(x)=a(x{{eval:-(r);+}})(x{{eval:-(s);+}})$.',
         'La parabole est tournée vers ' + sens('a>0') + ' : $a={{a}}$, d\'où $f(x)='
         + FACT + '$.'],
        ['s <= 4', 'r + s != 0', 'r != 0', 's != 0'])],
    [spec('x² : bonne courbe', 0, '0', 'correct', {'s': 1, 't': 1, 'a': 1, 'm': 2}),
     spec('Erreur : sens inversé', 0, '1', 'incorrect', {'s': 1, 't': 1, 'a': 1, 'm': 2}),
     spec('Erreur : 2x² au lieu de x²', 0, '2', 'incorrect', {'s': 1, 't': 1, 'a': 1, 'm': 2}),
     spec('-x²+3 : bonne courbe', 1, '0', 'correct', {'a': -1, 'c': 3}),
     spec('Erreur : sommet (0 ; -3)', 1, '2', 'incorrect', {'a': -1, 'c': 3}),
     spec('(x+1)(x-3) : bonne courbe', 2, '0', 'correct', {'a': 1, 'r': -1, 'd': 4, 's': 3}),
     spec('Erreur : racines 1 et -3', 2, '2', 'incorrect', {'a': 1, 'r': -1, 'd': 4, 's': 3}),
     spec('-(x-1)(x-3) : bonne expression', 3, '0', 'correct',
          {'a': -1, 'm': 1, 'r': 1, 'd': 2, 's': 3}),
     spec('Erreur : racines changées de signe', 3, '2', 'incorrect',
          {'a': -1, 'm': 1, 'r': 1, 'd': 2, 's': 3}),
     spec('Erreur : sens inversé', 3, '1', 'incorrect',
          {'a': -1, 'm': 1, 'r': 1, 'd': 2, 's': 3})])))

# ---------------------------------------------------------------------------------------------
# M3 — axe de symétrie : 1TECHNO-123 + 1GEN-052
# ---------------------------------------------------------------------------------------------

AXE = ('Soit $f$ la fonction définie sur $\\mathbb{R}$ par $f(x)=EXPR$.\n\n'
       'L\'axe de symétrie de la parabole qui représente $f$ a pour équation $x=?$.')
MILIEU = ('La parabole est symétrique par rapport à la droite verticale qui passe par le milieu'
          ' de ses deux points d\'intersection avec l\'axe des abscisses : ')
MODELES.append(('M3-axe-de-symetrie-de-la-parabole', modele(
    'Axe de symétrie d\'une parabole, sans formule', ['1TECHNO-123', '1GEN-052'],
    'Milieu des racines lues sur la forme factorisée ; x = 0 pour ax² + c', 2,
    [variation(AXE.replace('EXPR', FACT), [{'expectedAnswer': '{{eval:(r+s)/2}}'}],
               [var('a', '1..3;±'), var('r', '-6..6'), var('s', '-6..6')],
               ['$f(x)=0$ pour $x={{r}}$ ou $x={{s}}$ (un produit est nul si l\'un de ses facteurs'
                ' l\'est).',
                MILIEU + '$x=\\dfrac{{{r}}+{{if:s<0|({{s}})|{{s}}}}}{2}={{eval:(r+s)/2}}$.'],
               ['r < s', 'r + s != 0']),
     variation(AXE.replace('EXPR', '{{eval:ax^2+c}}'), [{'expectedAnswer': '0'}],
               [X, var('a', '1..3;±'), var('c', '1..6;±')],
               ['$f(-x)=f(x)$ pour tout $x$ : deux nombres opposés ont la même image, la parabole'
                ' est symétrique par rapport à l\'axe des ordonnées, d\'équation $x=0$.']),
     variation(AXE.replace('EXPR', PIEGE), [{'expectedAnswer': '{{eval:(u-v)/2}}'}],
               [var('k', '1..3;±'), var('u', '1..6'), var('v', '1..6')],
               ['$f(x)=0$ pour ${{u}}-x=0$, soit $x={{u}}$, ou pour $x{{eval:v;+}}=0$, soit'
                ' $x={{eval:-v}}$.',
                MILIEU + '$x=\\dfrac{{{u}}+({{eval:-v}})}{2}={{eval:(u-v)/2}}$.'],
               ['u != v'])],
    [spec('2(x-1)(x-5) : x = 3', 0, '3', 'correct', {'a': 2, 'r': 1, 's': 5}),
     spec('Erreur : signes des racines', 0, '-3', 'incorrect', {'a': 2, 'r': 1, 's': 5}),
     spec('Erreur : somme des racines', 0, '6', 'incorrect', {'a': 2, 'r': 1, 's': 5}),
     spec('(x+2)(x-1) : x = -0,5', 0, '-0{,}5', 'correct', {'a': 1, 'r': -2, 's': 1}),
     spec('(x+2)(x-1) : x = -1/2', 0, '-\\frac{1}{2}', 'correct', {'a': 1, 'r': -2, 's': 1}),
     spec('-3x²+5 : x = 0', 1, '0', 'correct', {'a': -3, 'c': 5}),
     spec('Erreur : lire c', 1, '5', 'incorrect', {'a': -3, 'c': 5}),
     spec('2(5-x)(x+1) : x = 2', 2, '2', 'correct', {'k': 2, 'u': 5, 'v': 1}),
     spec('Erreur : racines 5 et 1', 2, '3', 'incorrect', {'k': 2, 'u': 5, 'v': 1})])))

# ---------------------------------------------------------------------------------------------
# M4 — sommet : 1TECHNO-124 + 1GEN-053
# ---------------------------------------------------------------------------------------------

SOMMET = ('Soit $f$ la fonction définie sur $\\mathbb{R}$ par $f(x)=EXPR$.\n\n'
          'Le sommet de la parabole qui représente $f$ est $S\\left(\\,?\\,;\\,?\\,\\right)$.')
MODELES.append(('M4-sommet-de-la-parabole', modele(
    'Coordonnées du sommet d\'une parabole, par la symétrie', ['1TECHNO-124', '1GEN-053'],
    'Abscisse par l\'axe de symétrie (milieu des racines), ordonnée par le calcul de son image', 3,
    [variation(SOMMET.replace('EXPR', FACT),
               [{'expectedAnswer': '{{al}}'}, {'expectedAnswer': '{{eval:-a*h^2}}'}],
               [var('a', '1..3;±'), var('r', '-6..4'), var('h', '1..3'), var('s', 'eval:r+2*h'),
                var('al', 'eval:r+h')],
               ['$f(x)=0$ pour $x={{r}}$ ou $x={{s}}$. ' + MILIEU + '$x=\\dfrac{{{r}}+{{if:s<0|({{s}})|{{s}}}}}{2}'
                '={{al}}$. Le sommet est sur cet axe : son abscisse est ${{al}}$.',
                'Son ordonnée est l\'image de ${{al}}$ : $f({{al}})=' + a_fois('a')
                + '({{al}}{{eval:-(r);+}})({{al}}{{eval:-(s);+}})={{eval:-a*h^2}}$.',
                'Donc $S\\left({{al}}\\,;{{eval:-a*h^2}}\\right)$.'],
               ['s <= 6']),
     variation(SOMMET.replace('EXPR', '{{eval:ax^2+c}}'),
               [{'expectedAnswer': '0'}, {'expectedAnswer': '{{c}}'}],
               [X, var('a', '1..3;±'), var('c', '1..6;±')],
               ['$f(-x)=f(x)$ : la parabole est symétrique par rapport à l\'axe des ordonnées ;'
                ' le sommet a pour abscisse $0$.',
                '$f(0)={{c}}$, donc $S\\left(0\\,;{{c}}\\right)$.'])],
    [spec('2(x-1)(x-5) : S(3 ; -8)', 0, ['3', '-8'], 'correct',
          {'a': 2, 'r': 1, 'h': 2, 's': 5, 'al': 3}),
     spec('Erreur : ordonnée de signe contraire', 0, ['3', '8'], 'incorrect',
          {'a': 2, 'r': 1, 'h': 2, 's': 5, 'al': 3}),
     spec('Erreur : abscisse -3', 0, ['-3', '-8'], 'incorrect',
          {'a': 2, 'r': 1, 'h': 2, 's': 5, 'al': 3}),
     spec('-x²+4 : S(0 ; 4)', 1, ['0', '4'], 'correct', {'a': -1, 'c': 4}),
     spec('Erreur : S(4 ; 0)', 1, ['4', '0'], 'incorrect', {'a': -1, 'c': 4})])))

# ---------------------------------------------------------------------------------------------
# M5 — ax² + bx + c par f(x) = c : 1TECHNO-062 + 1GEN-025
# ---------------------------------------------------------------------------------------------

POLY = '{{eval:ax^2+bx+c}}'
VARS5 = [X, var('a', '1..2;±'), var('al', '1..4;±'), var('b', 'eval:-2*a*al'), var('c', '-6..6'),
         var('be', 'eval:c-a*al^2')]
FXC = ['$f(x)={{c}}\\iff {{eval:ax^2+bx}}=0\\iff x({{eval:ax+b}})=0$, donc $x=0$ ou'
       ' $x={{eval:2*al}}$.',
       'Les points d\'abscisses $0$ et ${{eval:2*al}}$ ont la même image ${{c}}$ : ils sont'
       ' symétriques par rapport à l\'axe de la parabole, qui passe par leur milieu,'
       ' $x=\\dfrac{0+{{if:al<0|({{eval:2*al}})|{{eval:2*al}}}}}{2}={{al}}$.']
MODELES.append(('M5-elements-caracteristiques-par-f-x-egal-c', modele(
    'Éléments caractéristiques de ax² + bx + c en résolvant f(x) = c',
    ['1TECHNO-062', '1GEN-025'],
    'Résoudre f(x) = c par factorisation par x, en déduire l\'axe puis le sommet', 3,
    [variation('Soit $f$ la fonction définie sur $\\mathbb{R}$ par $f(x)=' + POLY + '$.\n\n'
               'Les solutions de l\'équation $f(x)={{c}}$ sont $0$ et $?$.\n\n'
               'L\'axe de symétrie de la parabole a pour équation $x=?$.\n\n'
               'Le sommet de la parabole est $S\\left(\\,?\\,;\\,?\\,\\right)$.',
               [{'expectedAnswer': '{{eval:2*al}}'}, {'expectedAnswer': '{{al}}'},
                {'expectedAnswer': '{{al}}'}, {'expectedAnswer': '{{be}}'}],
               VARS5,
               FXC + ['Le sommet est sur l\'axe : $f({{al}})={{be}}$, donc'
                      ' $S\\left({{al}}\\,;{{be}}\\right)$.'],
               ['be >= -9', 'be <= 9']),
     variation('Soit $f$ la fonction définie sur $\\mathbb{R}$ par $f(x)=' + POLY + '$.\n\n'
               'En résolvant $f(x)={{c}}$, détermine l\'axe de symétrie de la parabole qui'
               ' représente $f$ : $x=?$.',
               [{'expectedAnswer': '{{al}}'}], VARS5, FXC)],
    [spec('x²-6x+4 : 6, 3, S(3 ; -5)', 0, ['6', '3', '3', '-5'], 'correct',
          {'a': 1, 'al': 3, 'b': -6, 'c': 4, 'be': -5}),
     spec('Erreur : solution -6, axe -3', 0, ['-6', '-3', '-3', '-5'], 'incorrect',
          {'a': 1, 'al': 3, 'b': -6, 'c': 4, 'be': -5}),
     spec('Erreur : ordonnée = c', 0, ['6', '3', '3', '4'], 'incorrect',
          {'a': 1, 'al': 3, 'b': -6, 'c': 4, 'be': -5}),
     spec('-2x²-8x+1 : axe x = -2', 1, '-2', 'correct',
          {'a': -2, 'al': -2, 'b': -8, 'c': 1, 'be': 9}),
     spec('Erreur : axe = autre solution', 1, '-4', 'incorrect',
          {'a': -2, 'al': -2, 'b': -8, 'c': 1, 'be': 9})])))

# ---------------------------------------------------------------------------------------------
# M6 — tableau de variation : 1TECHNO-125 + 1GEN-054
# ---------------------------------------------------------------------------------------------


def tableau(al, be, cache):
    """Tableau de variations d'une parabole ; `cache` préfixe les cellules à compléter."""
    q = '?' if cache else ''
    return ('```variation\nvariable: x\ndomain: -inf, ' + q + al + ', +inf\n\n'
            'variation: f(x)\n  ' + al + ': ' + q + be + ', {{if:a>0|bottom|top}}\n'
            + ('  -inf,' + al + ': ?flèche\n  ' + al + ',+inf: ?flèche\n' if cache else '')
            + '```')


FLECHES = ('{{if:a>0|décroissante puis croissante|croissante puis décroissante}}, avec un'
           ' {{if:a>0|minimum|maximum}} au sommet')
MODELES.append(('M6-tableau-de-variation-du-second-degre', modele(
    'Tableau de variation d\'une fonction du second degré', ['1TECHNO-125', '1GEN-054'],
    'Compléter le tableau : abscisse et ordonnée du sommet, sens des flèches', 3,
    [variation('Soit $f$ la fonction définie sur $\\mathbb{R}$ par $f(x)=' + FACT + '$.\n\n'
               'Complète son tableau de variation.\n\n' + tableau('{{al}}', '{{be}}', True),
               [], [var('a', '1..3;±'), var('r', '-6..4'), var('h', '1..3'),
                    var('s', 'eval:r+2*h'), var('al', 'eval:r+h'), var('be', 'eval:-a*h^2')],
               ['$f(x)=0$ pour $x={{r}}$ ou $x={{s}}$ ; l\'axe de symétrie passe par le milieu,'
                ' $x={{al}}$ : c\'est l\'abscisse du sommet, et $f({{al}})={{be}}$.',
                'Le coefficient de $x^2$ est ${{a}}$ : $f$ est ' + FLECHES + '.',
                tableau('{{al}}', '{{be}}', False)],
               ['s <= 6']),
     variation('Soit $f$ la fonction définie sur $\\mathbb{R}$ par $f(x)={{eval:ax^2+c}}$.\n\n'
               'Complète son tableau de variation.\n\n' + tableau('0', '{{c}}', True),
               [], [X, var('a', '1..3;±'), var('c', '1..6;±')],
               ['La parabole est symétrique par rapport à l\'axe des ordonnées : le sommet a pour'
                ' abscisse $0$, et $f(0)={{c}}$.',
                'Le coefficient de $x^2$ est ${{a}}$ : $f$ est ' + FLECHES + '.',
                tableau('0', '{{c}}', False)])],
    [spec('2(x-1)(x-5) : 3, ↘, -8, ↗', 0, ['3', '↘', '-8', '↗'], 'correct',
          {'a': 2, 'r': 1, 'h': 2, 's': 5, 'al': 3, 'be': -8}),
     spec('Erreur : flèches inversées', 0, ['3', '↗', '-8', '↘'], 'incorrect',
          {'a': 2, 'r': 1, 'h': 2, 's': 5, 'al': 3, 'be': -8}),
     spec('Erreur : extremum 8', 0, ['3', '↘', '8', '↗'], 'incorrect',
          {'a': 2, 'r': 1, 'h': 2, 's': 5, 'al': 3, 'be': -8}),
     spec('-x²+4 : 0, ↗, 4, ↘', 1, ['0', '↗', '4', '↘'], 'correct', {'a': -1, 'c': 4}),
     spec('Erreur : flèches de a > 0', 1, ['0', '↘', '4', '↗'], 'incorrect', {'a': -1, 'c': 4})])))

# ---------------------------------------------------------------------------------------------
# M7 — signe sous forme factorisée : 1TECHNO-126 + 1GEN-027
# ---------------------------------------------------------------------------------------------


def signes(expr, r, s, coef, cache):
    """Tableau de signes d'un produit de racines r < s, du signe de `coef` à l'extérieur."""
    q = '?' if cache else ''
    ext = '{{if:' + coef + '>0|+|-}}'
    inte = '{{if:' + coef + '>0|-|+}}'
    return ('```variation\nvariable: x\ndomain: -inf, ' + q + r + ', ' + q + s + ', +inf\n\n'
            'sign: ' + expr + '\n  -inf,' + r + ': ' + q + ext + '\n  ' + r + ': ' + q + 'z\n  '
            + r + ',' + s + ': ' + q + inte + '\n  ' + s + ': ' + q + 'z\n  ' + s + ',+inf: '
            + q + ext + '\n```')


MODELES.append(('M7-signe-d-un-polynome-sous-forme-factorisee', modele(
    'Signe d\'un polynôme du second degré sous forme factorisée', ['1TECHNO-126', '1GEN-027'],
    'Du signe de a à l\'extérieur des racines, du signe contraire entre elles', 2,
    [variation('Un polynôme $P(x)=a(x-x_1)(x-x_2)$, avec $x_1<x_2$, est du signe de $a$…'
               '\n\n```choix\n- à l\'extérieur des racines, et du signe contraire entre elles\n'
               '- entre les racines, et du signe contraire à l\'extérieur\n'
               '- pour tout réel $x$\n```',
               [{'expectedAnswer': '0'}], [],
               ['Pour $x>x_2$, les deux facteurs $x-x_1$ et $x-x_2$ sont positifs : $P(x)$ est du'
                ' signe de $a$. Pour $x<x_1$, ils sont tous deux négatifs : leur produit est'
                ' positif, $P(x)$ est encore du signe de $a$.',
                'Entre $x_1$ et $x_2$, $x-x_1>0$ et $x-x_2<0$ : $P(x)$ est du signe contraire de'
                ' $a$.']),
     variation('Complète le tableau de signes de $P(x)=' + FACT + '$.\n\n'
               + signes('P(x)', '{{r}}', '{{s}}', 'a', True),
               [], [var('a', '1..3;±'), var('r', '-6..6'), var('s', '-6..6')],
               ['$P(x)=0$ pour $x={{r}}$ ou $x={{s}}$.',
                'Le coefficient de $x^2$ est $a={{a}}$ : $P(x)$ est du signe de $a$ à l\'extérieur'
                ' des racines, du signe contraire entre elles.',
                signes('P(x)', '{{r}}', '{{s}}', 'a', False)],
               ['r < s']),
     variation('Complète le tableau de signes de $P(x)=' + PIEGE + '$.\n\n'
               + signes('P(x)', '{{eval:-v}}', '{{u}}', 'm', True),
               [], [var('k', '1..3;±'), var('m', 'eval:-k'), var('u', '1..6'), var('v', '1..6')],
               ['$P(x)=0$ pour $x={{u}}$ ou $x={{eval:-v}}$.',
                'En développant, le terme en $x^2$ est $' + a_fois('k') + '(-x)\\times x$ : le'
                ' coefficient de $x^2$ est ${{m}}$. $P(x)$ est du signe de ${{m}}$ à l\'extérieur'
                ' des racines, du signe contraire entre elles.',
                signes('P(x)', '{{eval:-v}}', '{{u}}', 'm', False)])],
    [spec('à l\'extérieur', 0, '0', 'correct'),
     spec('Erreur : entre les racines', 0, '1', 'incorrect'),
     spec('2(x+1)(x-3) : -1, 3, + z - z +', 1, ['-1', '3', '+', 'z', '-', 'z', '+'], 'correct',
          {'a': 2, 'r': -1, 's': 3}),
     spec('Erreur : racines 1 et -3', 1, ['1', '-3', '+', 'z', '-', 'z', '+'], 'incorrect',
          {'a': 2, 'r': -1, 's': 3}),
     spec('Erreur : signes inversés', 1, ['-1', '3', '-', 'z', '+', 'z', '-'], 'incorrect',
          {'a': 2, 'r': -1, 's': 3}),
     spec('2(3-x)(x+1) : -1, 3, - z + z -', 2, ['-1', '3', '-', 'z', '+', 'z', '-'], 'correct',
          {'k': 2, 'm': -2, 'u': 3, 'v': 1}),
     spec('Erreur : signe lu devant les parenthèses', 2, ['-1', '3', '+', 'z', '-', 'z', '+'],
          'incorrect', {'k': 2, 'm': -2, 'u': 3, 'v': 1})])))

# ---------------------------------------------------------------------------------------------
# M8 — factoriser connaissant une racine : 1TECHNO-064 (1re techno seule)
# ---------------------------------------------------------------------------------------------

FORME = {'pattern': 'u*($x+v)*($x+w)'}
MODELES.append(('M8-factoriser-connaissant-une-racine', modele(
    'Factoriser un polynôme du second degré connaissant ses racines', ['1TECHNO-064'],
    'Racines données ou évidentes ; coefficients retrouvés par le terme en x² et le terme constant',
    3,
    [variation('Le polynôme $P(x)={{eval:ax^2+bx+c}}$ a pour racines ${{r}}$ et ${{s}}$.'
               ' Écris-le sous forme factorisée.\n\n$P(x)=?$',
               [{'requiredForm': FORME, 'expectedAnswer': '{{eval:a*(x-r)*(x-s)}}'}],
               [X, var('a', '1..3;±'), var('r', '1..6;±'), var('s', '1..6;±'),
                var('b', 'eval:-a*(r+s)'), var('c', 'eval:a*r*s')],
               ['Un polynôme du second degré de racines $x_1$ et $x_2$ s\'écrit'
                ' $a(x-x_1)(x-x_2)$, où $a$ est le coefficient de $x^2$.',
                'Ici $a={{a}}$, $x_1={{r}}$ et $x_2={{s}}$ : $P(x)={{eval:a*(x-r)*(x-s)}}$.'],
               ['r < s', 'r != -s']),
     variation('${{r}}$ est une racine de $P(x)={{eval:ax^2+bx+c}}$.\n\n'
               'Complète : $P(x)=(x{{eval:-(r);+}})(\\,?\\,x+\\,?\\,)$.',
               [{'expectedAnswer': '{{a}}'}, {'expectedAnswer': '{{eval:-a*s}}'}],
               [X, var('a', '1..3;±'), var('r', '1..6;±'), var('s', '1..6;±'),
                var('b', 'eval:-a*(r+s)'), var('c', 'eval:a*r*s')],
               ['On cherche $P(x)=(x{{eval:-(r);+}})(mx+p)$.',
                'Terme en $x^2$ : $x\\times mx=mx^2$, donc $m={{a}}$.',
                'Terme constant : ${{eval:-r}}\\times p={{c}}$, donc $p={{eval:-a*s}}$.',
                '$P(x)=(x{{eval:-(r);+}})({{eval:a*x-a*s}})$.'],
               ['r != s', 'r != -s']),
     variation('Factorise $P(x)={{eval:ax^2+bx}}$ (une de ses racines est évidente).\n\n'
               '$P(x)=x(\\,?\\,x+\\,?\\,)$',
               [{'expectedAnswer': '{{a}}'}, {'expectedAnswer': '{{b}}'}],
               [X, var('a', '1..5;±'), var('b', '1..9;±')],
               ['$P(0)=0$ : $0$ est une racine évidente, et $x$ est facteur commun.',
                '$P(x)=x({{eval:ax+b}})$.'])],
    [spec('2x²+4x-6 = 2(x+3)(x-1)', 0, '2(x+3)(x-1)', 'correct',
          {'a': 2, 'r': -3, 's': 1, 'b': 4, 'c': -6}),
     spec('Erreur : signes des racines', 0, '2(x-3)(x+1)', 'incorrect',
          {'a': 2, 'r': -3, 's': 1, 'b': 4, 'c': -6}),
     spec('Erreur : a oublié', 0, '(x+3)(x-1)', 'incorrect',
          {'a': 2, 'r': -3, 's': 1, 'b': 4, 'c': -6}),
     dict(spec('Forme développée : refusée (forme)', 0, '2x^2+4x-6', 'bad_form',
               {'a': 2, 'r': -3, 's': 1, 'b': 4, 'c': -6}),
          expected={'status': 'bad_form', 'constraintViolations': ['form']}),
     spec('racine 2 de 3x²-3x-6 : (x-2)(3x+3)', 1, ['3', '3'], 'correct',
          {'a': 3, 'r': 2, 's': -1, 'b': -3, 'c': -6}),
     spec('Erreur : signe du terme constant', 1, ['3', '-3'], 'incorrect',
          {'a': 3, 'r': 2, 's': -1, 'b': -3, 'c': -6}),
     spec('-2x²+6x = x(-2x+6)', 2, ['-2', '6'], 'correct', {'a': -2, 'b': 6}),
     spec('Erreur : coefficients échangés', 2, ['6', '-2'], 'incorrect', {'a': -2, 'b': 6})],
    grades=['1_TECHNO'])))

# ---------------------------------------------------------------------------------------------
# Écriture
# ---------------------------------------------------------------------------------------------

os.makedirs(DOSSIER, exist_ok=True)
for nom, m in MODELES:
    m = dict(m)
    m.pop('_points')
    chemin = os.path.join(DOSSIER, nom + '.json')
    ancien_id = None
    if os.path.exists(chemin):
        with open(chemin, encoding='utf-8') as f:
            ancien_id = json.load(f).get('id')
    if ancien_id:
        m = {'id': ancien_id, **m}
    with open(chemin, 'w', encoding='utf-8') as f:
        json.dump(m, f, ensure_ascii=False, indent=1)
        f.write('\n')
print(len(MODELES), 'modèles écrits dans', DOSSIER)
for nom, m in MODELES:
    print(' ', ' + '.join(m['_points']), nom)
