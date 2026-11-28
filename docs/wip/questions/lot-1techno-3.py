"""Écrit les modèles du lot 3 « dérivation » de la 1re techno dans scripts/questions/1techno-3/.

Phase 0 validée par David le 2026-11-18 (journal docs/archive/wip/questions-1techno-progress.md, § 25).
Neuf modèles propres à la 1re techno (aucun jumeau en 1re générale, accord de questions-1gen) :

- M1 taux de variation en un point → 1TECHNO-128 (jumeau de b05ec37a, décision l1t-7) ;
- M2 tangente, position limite des sécantes (cours) → 1TECHNO-069 ;
- M3 équation réduite de la tangente (cours) → 1TECHNO-071 ;
- M4 fonction dérivée (cours) → 1TECHNO-072 ;
- M5 dérivée d'une somme → 1TECHNO-074 ;
- M6 dérivée de kf → 1TECHNO-130 ;
- M7 dérivée d'un polynôme de degré ≤ 3 → 1TECHNO-131 (distinct de 1666b8e9, qui porte 080) ;
- M8 sens de variation d'un polynôme de degré ≤ 3 → 1TECHNO-081 (jumeau de 2b382069 sans
  discriminant, décision l1t-2) ;
- M9 monotonie et signe du taux de variation (cours) → 1TECHNO-056.

Bornes 1re techno : polynômes de degré ≤ 3 seulement (x², x³, somme, kf) ; ni 1/x, ni √x ; pas de
discriminant (racines données, évidentes ou lues sur une forme factorisée) ; limite intuitive.
Un point par programme (ADR 0020) ; nœud et tags viendront par migration.

    python3 docs/wip/questions/lot-1techno-3.py scripts/questions/1techno-3
"""
import json
import os
import sys

DOSSIER = sys.argv[1]


def spec(desc, vi, answers, status, variables=None):
    return {'description': desc, 'variationIndex': vi,
            'variables': {k: str(v) for k, v in (variables or {}).items()},
            'answers': answers if isinstance(answers, list) else [answers],
            'expected': {'status': status}}


def var(nom, expression):
    return {'name': nom, 'expression': expression}


X = var('x', 'x|x')


def modele(title, point, description, level, variations, specs, cours=False):
    m = {'title': title, 'description': description,
         'grades': ['1_TECHNO'], 'level': level, 'delay': 30 if cours else 60, 'status': 'draft'}
    if cours:
        m['options'] = {'courseQuestion': True}
    m.update({'shared': {'blankDefaults': {'acceptDecimal': True}, 'cleanCoefficients': True},
              'variations': variations, 'testSpecs': specs, '_point': point})
    return m


def variation(statement, blanks, variables, steps, conditions=None):
    v = {'statement': statement, 'blanks': blanks, 'variables': variables,
         'correction': {'steps': steps}}
    if conditions:
        v['conditions'] = conditions
    return v


def choix(enonce, bonne, autres, steps, variables=None, conditions=None):
    """Case choix mélangée : la bonne réponse est écrite en premier (index 0)."""
    bloc = '\n\n```choix\n' + ''.join('- ' + l + '\n' for l in [bonne] + autres) + '```'
    return variation(enonce + bloc, [{'expectedAnswer': '0'}], variables or [], steps, conditions)


def choix_fixe(enonce, propositions, bonne, steps, variables=None, conditions=None):
    """Case choix dans l'ordre écrit : `bonne` = rang (ou expression du rang) de la bonne réponse."""
    bloc = ('\n\n```choix\nmelanger: non\n' + ''.join('- ' + l + '\n' for l in propositions)
            + '```')
    return variation(enonce + bloc, [{'expectedAnswer': str(bonne)}], variables or [], steps,
                     conditions)


def case(attendue, **options):
    return {'expectedAnswer': attendue, **options}


VRAI_FAUX = ['Vrai', 'Faux']

MODELES = []

# ---------------------------------------------------------------------------------------------
# M1 — taux de variation en un point : 1TECHNO-128
# ---------------------------------------------------------------------------------------------

TAUX = ('Soit $f$ la fonction définie sur $\\mathbb{R}$ par $f(x)=x^2$. Pour $h\\neq 0$, le taux de'
        ' variation de $f$ entre ${{a}}$ et ${{a}}+h$ est\n\n'
        '$$\\dfrac{f({{a}}+h)-f({{a}})}{h}=\\dfrac{({{a}}+h)^2-{{eval:a^2}}}{h}$$\n\n')
TAUX_B = ('Soit $f$ la fonction définie sur $\\mathbb{R}$ par $f(x)={{eval:x^2+bx}}$. Pour'
          ' $h\\neq 0$, on calcule le taux de variation de $f$ entre ${{a}}$ et ${{a}}+h$.\n\n')
MODELES.append(('M1-taux-de-variation-en-un-point', modele(
    'Taux de variation en un point', '1TECHNO-128',
    'Taux de variation de x ↦ x² (ou x² + bx) entre a et a + h : développer, simplifier par h', 2,
    [variation(TAUX + 'Développe et réduis le numérateur.\n\n$({{a}}+h)^2-{{eval:a^2}}=?$',
               [case('{{eval:2*a}}h+h^2', requiredForm={'pattern': 'u'})],
               [var('a', '1..5')],
               ['$({{a}}+h)^2={{eval:a^2}}+{{eval:2*a}}h+h^2$ (identité remarquable).',
                'Donc $({{a}}+h)^2-{{eval:a^2}}=\\textcolor{{{color:primary.0}}}{ {{eval:2*a}}h+h^2 }$ :'
                ' les ${{eval:a^2}}$ se compensent.']),
     variation(TAUX + 'Le numérateur vaut ${{eval:2*a}}h+h^2$. Simplifie le taux par $h$.\n\n'
               '$\\dfrac{f({{a}}+h)-f({{a}})}{h}=?$',
               [case('{{eval:2*a}}+h', requiredForm={'pattern': 'u'})],
               [var('a', '1..5')],
               ['${{eval:2*a}}h+h^2=h({{eval:2*a}}+h)$ : on met $h$ en facteur.',
                'Comme $h\\neq 0$, on simplifie : le taux vaut'
                ' $\\textcolor{{{color:primary.0}}}{ {{eval:2*a}}+h }$.']),
     variation(TAUX + 'Ce taux vaut ${{eval:2*a}}+h$. Calcule-le pour $h={{hh}}$.\n\n'
               '$\\text{taux}=?$',
               [case('{{eval:2*a+hh}}')],
               [var('a', '1..5'), var('hh', '0.1|0.01|0.5')],
               ['On remplace $h$ par ${{hh}}$ : ${{eval:2*a}}+{{hh}}='
                '\\textcolor{{{color:primary.0}}}{ {{eval:2*a+hh}} }$.',
                'Plus $h$ est proche de $0$, plus le taux est proche de ${{eval:2*a}}$.']),
     variation(TAUX_B + 'On trouve $f({{a}}+h)-f({{a}})=h^2+{{eval:2*a+b}}h$ (après développement).'
               ' Simplifie le taux par $h$.\n\n$\\dfrac{f({{a}}+h)-f({{a}})}{h}=?$',
               [case('h+{{eval:2*a+b}}', requiredForm={'pattern': 'u'})],
               [X, var('a', '1..4'), var('b', '1..5;±')],
               ['$h^2{{eval:2*a+b;+}}h=h(h{{eval:2*a+b;+}})$ : on met $h$ en facteur.',
                'Comme $h\\neq 0$, le taux vaut'
                ' $\\textcolor{{{color:primary.0}}}{h{{eval:2*a+b;+}}}$.'],
               ['2*a+b != 0'])],
    [spec('a = 3 : 6h + h²', 0, '6h+h^2', 'correct', {'a': 3}),
     spec('Erreur : (a+h)² = a² + h²', 0, 'h^2', 'incorrect', {'a': 3}),
     spec('Erreur : double produit oublié de 2', 0, '3h+h^2', 'incorrect', {'a': 3}),
     spec('a = 3 : 6 + h', 1, '6+h', 'correct', {'a': 3}),
     spec('Erreur : h oublié', 1, '6', 'incorrect', {'a': 3}),
     spec('a = 2, h = 0,1 : 4,1', 2, '4.1', 'correct', {'a': 2, 'hh': '0.1'}),
     spec('Erreur : h non ajouté', 2, '4', 'incorrect', {'a': 2, 'hh': '0.1'}),
     spec('a = 2, b = -3 : h + 1', 3, 'h+1', 'correct', {'a': 2, 'b': -3}),
     spec('Erreur : b oublié', 3, 'h+4', 'incorrect', {'a': 2, 'b': -3})])))

# ---------------------------------------------------------------------------------------------
# M2 — tangente, position limite des sécantes (cours) : 1TECHNO-069
# ---------------------------------------------------------------------------------------------

SECANTES = ('| $h$ | $1$ | $0{,}1$ | $0{,}01$ | $0{,}001$ |\n| --- | --- | --- | --- | --- |\n'
            '| Pente de $(AM)$ | ${{eval:2*a+1}}$ | ${{eval:2*a+0.1}}$ | ${{eval:2*a+0.01}}$ |'
            ' ${{eval:2*a+0.001}}$ |')
MODELES.append(('M2-tangente-position-limite-des-secantes', modele(
    'Tangente : position limite des sécantes', '1TECHNO-069',
    'La tangente en A est la position limite des sécantes (AM) quand M se rapproche de A', 1,
    [choix('$A$ est un point de la courbe d\'une fonction $f$, et $M$ un autre point de cette courbe.'
           ' Quand $M$ se rapproche de $A$ sur la courbe, la sécante $(AM)$ se rapproche…',
           'de la tangente à la courbe en $A$',
           ['de l\'axe des abscisses', 'de la droite qui passe par $A$ et l\'origine',
            'de la courbe elle-même'],
           ['La tangente en $A$ est, par définition, la **position limite** des sécantes $(AM)$'
            ' quand $M$ se rapproche de $A$.']),
     variation('$f(x)=x^2$, $A$ est le point de sa courbe d\'abscisse ${{a}}$ et $M$ celui d\'abscisse'
               ' ${{a}}+h$. Le tableau donne la pente de la sécante $(AM)$ pour des valeurs de $h$ de'
               ' plus en plus proches de $0$.\n\n' + SECANTES + '\n\n'
               'Quelle est, d\'après ce tableau, la pente de la tangente en $A$ ?\n\n$\\text{pente}=?$',
               [case('{{eval:2*a}}')], [var('a', '1..5')],
               ['Quand $h$ se rapproche de $0$, $M$ se rapproche de $A$, et les pentes des sécantes se'
                ' rapprochent de ${{eval:2*a}}$.',
                'La tangente est la position limite des sécantes : sa pente vaut'
                ' $\\textcolor{{{color:primary.0}}}{ {{eval:2*a}} }$.']),
     choix_fixe('Vrai ou faux : « la tangente à une courbe en un point $A$ est la droite qui ne touche'
                ' la courbe qu\'en $A$ ».', VRAI_FAUX, 1,
                ['**Faux.** La tangente est définie comme la position limite des sécantes $(AM)$ quand'
                 ' $M$ se rapproche de $A$.',
                 'Elle peut recouper la courbe ailleurs : la tangente à la courbe de $x\\mapsto x^3$ en'
                 ' son point d\'abscisse $1$, $y=3x-2$, la recoupe au point d\'abscisse $-2$.']),
     choix_fixe('Vrai ou faux : « la tangente en $A$ est la sécante $(AM)$ obtenue en prenant $M$ très'
                ' proche de $A$ ».', VRAI_FAUX, 1,
                ['**Faux.** Une sécante $(AM)$, même avec $M$ très proche, n\'est pas la tangente : la'
                 ' tangente est la **position limite** de ces sécantes quand $M$ se rapproche de $A$.'])],
    [spec('Position limite : tangente', 0, '0', 'correct'),
     spec('Erreur : axe des abscisses', 0, '1', 'incorrect'),
     spec('a = 3 : pente 6', 1, '6', 'correct', {'a': 3}),
     spec('Erreur : dernière valeur du tableau', 1, '6.001', 'incorrect', {'a': 3}),
     spec('Ne touche qu\'en A : faux', 2, '1', 'correct'),
     spec('Erreur : vrai', 2, '0', 'incorrect'),
     spec('Sécante proche : faux', 3, '1', 'correct'),
     spec('Erreur : vrai', 3, '0', 'incorrect')], cours=True)))

# ---------------------------------------------------------------------------------------------
# M3 — équation réduite de la tangente (cours) : 1TECHNO-071
# ---------------------------------------------------------------------------------------------

MODELES.append(('M3-equation-reduite-de-la-tangente', modele(
    'Équation réduite de la tangente : la formule', '1TECHNO-071',
    'Formule y = f′(a)(x − a) + f(a), coefficient directeur f′(a), lecture inverse', 1,
    [choix('Soit $f$ une fonction dérivable en $a$. La tangente à sa courbe au point d\'abscisse $a$'
           ' a pour équation…',
           '$y=f\'(a)(x-a)+f(a)$',
           ['$y=f(a)(x-a)+f\'(a)$', '$y=f\'(a)x+f(a)$', '$y=f\'(a)(x+a)+f(a)$'],
           ['La tangente passe par $A(a\\,;\\,f(a))$ et a pour coefficient directeur $f\'(a)$ :'
            ' $y=f\'(a)(x-a)+f(a)$.',
            'Pour $x=a$, on retrouve bien $y=f(a)$ : c\'est ce que ne vérifie pas $y=f\'(a)x+f(a)$.']),
     choix_fixe('Soit $f$ une fonction dérivable en $a$. Le coefficient directeur de la tangente à sa'
                ' courbe au point d\'abscisse $a$ est…',
                ['$f\'(a)$', '$f(a)$', '$a$', '$f(a)-a$'], 0,
                ['Le nombre dérivé $f\'(a)$ est le coefficient directeur de la tangente en $a$ ;'
                 ' $f(a)$ est l\'ordonnée du point de contact.']),
     variation('La tangente à la courbe d\'une fonction $f$ au point d\'abscisse ${{a}}$ a pour'
               ' équation $y={{eval:m*x+p}}$.\n\n$f\'({{a}})=?$',
               [case('{{m}}')],
               [X, var('a', '1..5;±'), var('m', '1..6;±'), var('p', '1..9;±')],
               ['Le coefficient directeur de la tangente au point d\'abscisse ${{a}}$ est le nombre'
                ' dérivé $f\'({{a}})$.',
                'Ici il vaut ${{m}}$ : $f\'({{a}})=\\textcolor{{{color:primary.0}}}{ {{m}} }$.']),
     variation('La tangente à la courbe d\'une fonction $f$ au point d\'abscisse ${{a}}$ a pour'
               ' équation $y={{eval:m*x+p}}$.\n\n$f({{a}})=?$',
               [case('{{eval:m*a+p}}')],
               [X, var('a', '1..4;±'), var('m', '1..5;±'), var('p', '1..9;±')],
               ['La tangente passe par le point de la courbe d\'abscisse ${{a}}$, de coordonnées'
                ' $({{a}}\\,;\\,f({{a}}))$.',
                'Donc $f({{a}})={{m}}\\times{{a;()}}{{p;+}}='
                '\\textcolor{{{color:primary.0}}}{ {{eval:m*a+p}} }$.'])],
    [spec('Formule', 0, '0', 'correct'),
     spec('Erreur : f et f′ échangés', 0, '1', 'incorrect'),
     spec('Erreur : y = f′(a)x + f(a)', 0, '2', 'incorrect'),
     spec('Coefficient directeur f′(a)', 1, '0', 'correct'),
     spec('Erreur : f(a)', 1, '1', 'incorrect'),
     spec('y = 4x - 3 en 2 : 4', 2, '4', 'correct', {'a': 2, 'm': 4, 'p': -3}),
     spec('Erreur : ordonnée à l\'origine', 2, '-3', 'incorrect', {'a': 2, 'm': 4, 'p': -3}),
     spec('Erreur : image 5', 2, '5', 'incorrect', {'a': 2, 'm': 4, 'p': -3}),
     spec('y = 2x + 1 en 3 : 7', 3, '7', 'correct', {'a': 3, 'm': 2, 'p': 1}),
     spec('Erreur : coefficient directeur', 3, '2', 'incorrect', {'a': 3, 'm': 2, 'p': 1})],
    cours=True)))

# ---------------------------------------------------------------------------------------------
# M4 — fonction dérivée (cours) : 1TECHNO-072
# ---------------------------------------------------------------------------------------------

MODELES.append(('M4-fonction-derivee', modele(
    'Fonction dérivée et nombre dérivé', '1TECHNO-072',
    'f′ associe à x le nombre dérivé f′(x) ; f′(a) se calcule sur f′, pas sur f', 1,
    [choix('Soit $f$ une fonction dérivable sur un intervalle $I$. Sa fonction dérivée $f\'$ associe'
           ' à chaque réel $x$ de $I$…',
           'le nombre dérivé de $f$ en $x$, noté $f\'(x)$',
           ['l\'image $f(x)$', 'le taux de variation de $f$ entre $0$ et $x$',
            'l\'ordonnée à l\'origine de la tangente en $x$'],
           ['La fonction dérivée $f\'$ est la fonction $x\\mapsto f\'(x)$ : en chaque $x$, elle donne'
            ' le **nombre dérivé** de $f$ en $x$, coefficient directeur de la tangente.']),
     variation('La dérivée d\'une fonction $f$ est $f\'(x)={{eval:m*x+p}}$.\n\n$f\'({{a}})=?$',
               [case('{{eval:m*a+p}}')],
               [X, var('a', '1..5;±'), var('m', '2..5;±'), var('p', '1..9;±')],
               ['Le nombre dérivé en ${{a}}$ est l\'image de ${{a}}$ par la fonction dérivée :'
                ' $f\'({{a}})={{m}}\\times{{a;()}}{{p;+}}='
                '\\textcolor{{{color:primary.0}}}{ {{eval:m*a+p}} }$.']),
     variation('Soit $f$ la fonction définie sur $\\mathbb{R}$ par $f(x)=x^2$, de dérivée'
               ' $f\'(x)=2x$.\n\n$f\'({{a}})=?$',
               [case('{{eval:2*a}}')],
               [var('a', '2..9;±')],
               ['On calcule avec la **dérivée** : $f\'({{a}})=2\\times{{a;()}}='
                '\\textcolor{{{color:primary.0}}}{ {{eval:2*a}} }$.',
                '${{eval:a^2}}$ serait $f({{a}})$, l\'image, pas le nombre dérivé.']),
     choix_fixe('Soit $f$ la fonction définie sur $\\mathbb{R}$ par $f(x)={{k}}$. Sa dérivée est…',
                ['$f\'(x)=0$', '$f\'(x)={{k}}$', '$f\'(x)=1$', '$f\'(x)={{k}}x$'], 0,
                ['Une fonction constante a une courbe horizontale : ses tangentes ont toutes un'
                 ' coefficient directeur nul, donc $f\'(x)=0$.'],
                [var('k', '2..9;±')]),
     choix_fixe('Soit $f$ la fonction définie sur $\\mathbb{R}$ par $f(x)=x$. Sa dérivée est…',
                ['$f\'(x)=1$', '$f\'(x)=0$', '$f\'(x)=x$', '$f\'(x)=2x$'], 0,
                ['La courbe de $x\\mapsto x$ est la droite $y=x$, de coefficient directeur $1$ : en tout'
                 ' point, sa tangente est elle-même, donc $f\'(x)=1$.'])],
    [spec('Nombre dérivé en x', 0, '0', 'correct'),
     spec('Erreur : l\'image', 0, '1', 'incorrect'),
     spec('f′(x) = 2x + 1, f′(3) = 7', 1, '7', 'correct', {'a': 3, 'm': 2, 'p': 1}),
     spec('Erreur : coefficient seul', 1, '2', 'incorrect', {'a': 3, 'm': 2, 'p': 1}),
     spec('x², f′(3) = 6', 2, '6', 'correct', {'a': 3}),
     spec('Erreur : f(3) = 9', 2, '9', 'incorrect', {'a': 3}),
     spec('Constante : 0', 3, '0', 'correct', {'k': 5}),
     spec('Erreur : la constante', 3, '1', 'incorrect', {'k': 5}),
     spec('x : 1', 4, '0', 'correct'),
     spec('Erreur : 0', 4, '1', 'incorrect')], cours=True)))

# ---------------------------------------------------------------------------------------------
# M5 — dérivée d'une somme : 1TECHNO-074
# ---------------------------------------------------------------------------------------------

DERIVE = 'Soit $f$ la fonction définie sur $\\mathbb{R}$ par $f(x)=EXPR$.\n\n$f\'(x)=?$'
MODELES.append(('M5-derivee-d-une-somme', modele(
    'Dérivée d\'une somme', '1TECHNO-074',
    'Dériver terme à terme une somme de x³, x², x et d\'une constante (coefficients 1)', 2,
    [variation(DERIVE.replace('EXPR', 'x^3+x^2'), [case('3x^2+2x')], [],
               ['La dérivée d\'une somme est la somme des dérivées : $(x^3)\'=3x^2$ et $(x^2)\'=2x$.',
                '$f\'(x)=\\textcolor{{{color:primary.0}}}{3x^2+2x}$.']),
     variation(DERIVE.replace('EXPR', 'x^2+x{{c;+}}'), [case('2x+1')], [var('c', '1..9;±')],
               ['On dérive terme à terme : $(x^2)\'=2x$, $(x)\'=1$, et la dérivée d\'une constante est'
                ' nulle.',
                '$f\'(x)=\\textcolor{{{color:primary.0}}}{2x+1}$.']),
     variation(DERIVE.replace('EXPR', 'x^3+x{{c;+}}'), [case('3x^2+1')], [var('c', '1..9;±')],
               ['On dérive terme à terme : $(x^3)\'=3x^2$, $(x)\'=1$, et la dérivée de ${{c}}$ est'
                ' nulle.',
                '$f\'(x)=\\textcolor{{{color:primary.0}}}{3x^2+1}$.']),
     choix('Soit $u$ et $v$ deux fonctions dérivables sur un intervalle $I$. La dérivée de $u+v$ est…',
           '$u\'+v\'$', ['$u\'\\times v\'$', '$u\'+v$', '$u+v\'$'],
           ['La dérivée d\'une somme est la somme des dérivées : $(u+v)\'=u\'+v\'$.'])],
    [spec('x³ + x² : 3x² + 2x', 0, '3x^2+2x', 'correct'),
     spec('Erreur : exposants non baissés', 0, '3x^3+2x^2', 'incorrect'),
     spec('x² + x + 5 : 2x + 1', 1, '2x+1', 'correct', {'c': 5}),
     spec('Erreur : constante gardée', 1, '2x+6', 'incorrect', {'c': 5}),
     spec('Erreur : dérivée de x nulle', 1, '2x', 'incorrect', {'c': 5}),
     spec('x³ + x - 4 : 3x² + 1', 2, '3x^2+1', 'correct', {'c': -4}),
     spec('Erreur : constante gardée', 2, '3x^2-3', 'incorrect', {'c': -4}),
     spec('(u + v)′ = u′ + v′', 3, '0', 'correct'),
     spec('Erreur : produit des dérivées', 3, '1', 'incorrect')])))

# ---------------------------------------------------------------------------------------------
# M6 — dérivée de kf : 1TECHNO-130
# ---------------------------------------------------------------------------------------------

MODELES.append(('M6-derivee-de-kf', modele(
    'Dérivée de kf', '1TECHNO-130',
    'Dériver kx, kx², kx³, k entier ou fraction simple : (kf)′ = k f′', 2,
    [variation(DERIVE.replace('EXPR', '{{k}}x^2'), [case('{{eval:2*k}}x')], [var('k', '2..9;±')],
               ['$(kf)\'=k\\,f\'$, et $(x^2)\'=2x$.',
                '$f\'(x)={{k}}\\times 2x=\\textcolor{{{color:primary.0}}}{ {{eval:2*k}}x }$.']),
     variation(DERIVE.replace('EXPR', '{{k}}x^3'), [case('{{eval:3*k}}x^2')], [var('k', '2..9;±')],
               ['$(kf)\'=k\\,f\'$, et $(x^3)\'=3x^2$.',
                '$f\'(x)={{k}}\\times 3x^2=\\textcolor{{{color:primary.0}}}{ {{eval:3*k}}x^2 }$.']),
     variation(DERIVE.replace('EXPR', '{{k}}x'), [case('{{k}}')], [var('k', '2..9;±')],
               ['$(kf)\'=k\\,f\'$, et $(x)\'=1$.',
                '$f\'(x)={{k}}\\times 1=\\textcolor{{{color:primary.0}}}{ {{k}} }$.']),
     variation(DERIVE.replace('EXPR', '{{s}}\\dfrac{x^3}{3}'), [case('{{s}}x^2')],
               [var('sg', '1|-1'), var('s', '{{if:sg<0|-|}}')],
               ['$f(x)={{s}}\\dfrac{1}{3}\\times x^3$ : $(kf)\'=k\\,f\'$, et $(x^3)\'=3x^2$.',
                '$f\'(x)={{s}}\\dfrac{1}{3}\\times 3x^2=\\textcolor{{{color:primary.0}}}{ {{s}}x^2 }$.']),
     variation(DERIVE.replace('EXPR', '\\dfrac{ {{k}} }{2}x^2'), [case('{{k}}x')],
               [var('k', '1|3|5|7|-1|-3|-5')],
               ['$(kf)\'=k\\,f\'$, et $(x^2)\'=2x$.',
                '$f\'(x)=\\dfrac{ {{k}} }{2}\\times 2x=\\textcolor{{{color:primary.0}}}{ {{k}}x }$.'])],
    [spec('5x² : 10x', 0, '10x', 'correct', {'k': 5}),
     spec('Erreur : k oublié', 0, '2x', 'incorrect', {'k': 5}),
     spec('Erreur : exposant non baissé', 0, '10x^2', 'incorrect', {'k': 5}),
     spec('-4x³ : -12x²', 1, '-12x^2', 'correct', {'k': -4}),
     spec('Erreur : signe perdu', 1, '12x^2', 'incorrect', {'k': -4}),
     spec('7x : 7', 2, '7', 'correct', {'k': 7}),
     spec('Erreur : 7x', 2, '7x', 'incorrect', {'k': 7}),
     spec('x³/3 : x²', 3, 'x^2', 'correct', {'sg': 1}),
     spec('Erreur : x²/3', 3, '\\frac{x^2}{3}', 'incorrect', {'sg': 1}),
     spec('-x³/3 : -x²', 3, '-x^2', 'correct', {'sg': -1}),
     spec('3/2 x² : 3x', 4, '3x', 'correct', {'k': 3}),
     spec('Erreur : 3/2 x', 4, '\\frac{3}{2}x', 'incorrect', {'k': 3})])))

# ---------------------------------------------------------------------------------------------
# M7 — dérivée d'un polynôme de degré ≤ 3 : 1TECHNO-131
# ---------------------------------------------------------------------------------------------

MODELES.append(('M7-derivee-d-un-polynome', modele(
    'Dérivée d\'un polynôme de degré au plus 3', '1TECHNO-131',
    'Variable t, termes dans le désordre ou manquants, fonction coût ; degré de la dérivée', 3,
    [variation('Soit $g$ la fonction définie sur $\\mathbb{R}$ par $g(t)={{eval:a*t^3+b*t^2+c*t+d}}$.'
               '\n\n$g\'(t)=?$',
               [case('{{eval:3*a*t^2+2*b*t+c}}')],
               [var('t', 't|t'), var('a', '1..4;±'), var('b', '1..5;±'), var('c', '1..9;±'),
                var('d', '1..9;±')],
               ['La variable s\'appelle $t$ : on dérive de la même façon, terme à terme.',
                '$(t^3)\'=3t^2$, $(t^2)\'=2t$, $(t)\'=1$, et la constante a une dérivée nulle.',
                '$g\'(t)=\\textcolor{{{color:primary.0}}}{ {{eval:3*a*t^2+2*b*t+c}} }$.']),
     variation('Soit $f$ la fonction définie sur $\\mathbb{R}$ par $f(x)={{d}}{{eval:c;+}}x{{eval:a;+}}x^3$.'
               '\n\n$f\'(x)=?$',
               [case('{{eval:3*a*x^2+c}}')],
               [X, var('a', '2..5;±'), var('c', '2..9;±'), var('d', '1..9')],
               ['Les termes ne sont pas rangés : on dérive chacun. $({{d}})\'=0$, $({{c}}x)\'={{c}}$,'
                ' $({{a}}x^3)\'={{eval:3*a}}x^2$.',
                '$f\'(x)=\\textcolor{{{color:primary.0}}}{ {{eval:3*a*x^2+c}} }$.']),
     variation('Soit $f$ la fonction définie sur $\\mathbb{R}$ par $f(x)={{eval:x^3+c*x}}$.'
               '\n\n$f\'(x)=?$',
               [case('{{eval:3*x^2+c}}')],
               [X, var('c', '2..15;±')],
               ['Il n\'y a ni terme en $x^2$ ni constante : $(x^3)\'=3x^2$ et $({{c}}x)\'={{c}}$.',
                '$f\'(x)=\\textcolor{{{color:primary.0}}}{ {{eval:3*x^2+c}} }$.']),
     variation('Une entreprise fabrique $q$ objets par jour. Son coût de production, en euros, est'
               ' $C(q)={{a}}q^2+{{b}}q+{{c}}$.\n\n$C\'(q)=?$',
               [case('{{eval:2*a*q+b}}')],
               [var('q', 'q|q'), var('a', '0.5|1.5|2.5|0.1|0.2'), var('b', '2..9'), var('c', '50|80|100|120|200')],
               ['$(q^2)\'=2q$, $(q)\'=1$, et le coût fixe ${{c}}$ a une dérivée nulle.',
                '$C\'(q)={{a}}\\times 2q+{{b}}=\\textcolor{{{color:primary.0}}}{ {{eval:2*a*q+b}} }$.']),
     choix_fixe('Soit $f$ une fonction polynôme de degré $3$. Sa dérivée $f\'$ est une fonction'
                ' polynôme de degré…', ['$2$', '$3$', '$4$', '$1$'], 0,
                ['En dérivant, $x^3$ devient $3x^2$ : le degré baisse de $1$. $f\'$ est de degré'
                 ' $\\textcolor{{{color:primary.0}}}{2}$.'])],
    [spec('2t³ - 3t² + 4t - 1', 0, '6t^2-6t+4', 'correct', {'a': 2, 'b': -3, 'c': 4, 'd': -1}),
     spec('Erreur : constante gardée', 0, '6t^2-6t+3', 'incorrect', {'a': 2, 'b': -3, 'c': 4, 'd': -1}),
     spec('Erreur : réponse en x', 0, '6x^2-6x+4', 'incorrect', {'a': 2, 'b': -3, 'c': 4, 'd': -1}),
     spec('5 - 2x + 4x³ : 12x² - 2', 1, '12x^2-2', 'correct', {'a': 4, 'c': -2, 'd': 5}),
     spec('Ordre libre : -2 + 12x²', 1, '-2+12x^2', 'correct', {'a': 4, 'c': -2, 'd': 5}),
     spec('Erreur : 5 dérivé en 5', 1, '12x^2+3', 'incorrect', {'a': 4, 'c': -2, 'd': 5}),
     spec('x³ - 12x : 3x² - 12', 2, '3x^2-12', 'correct', {'c': -12}),
     spec('Erreur : 3x² - 12x', 2, '3x^2-12x', 'incorrect', {'c': -12}),
     spec('C(q) = 0,5q² + 3q + 100 : q + 3', 3, 'q+3', 'correct', {'a': '0.5', 'b': 3, 'c': 100}),
     spec('Erreur : coût fixe gardé', 3, 'q+103', 'incorrect', {'a': '0.5', 'b': 3, 'c': 100}),
     spec('Degré 2', 4, '0', 'correct'),
     spec('Erreur : degré 3', 4, '1', 'incorrect')])))

# ---------------------------------------------------------------------------------------------
# M8 — sens de variation d'un polynôme de degré ≤ 3 : 1TECHNO-081
# ---------------------------------------------------------------------------------------------

CROISSANTE = ('\n\nDonne le ou les intervalles sur lesquels $f$ est croissante (intervalle ou réunion'
              ' d\'intervalles).\n\n$S=?$')


def intervalles(attendue):
    return case(attendue, answerKind='intervalles', openableBounds=True)


def tableau3(cache):
    """Tableau de variation d'un polynôme de degré 3 de dérivée 3a(x − p)(x − q), a > 0, p < q."""
    c = '?' if cache else ''
    return ('```variation\nvariable: x\ndomain: -inf, ' + c + '{{p}}, ' + c + '{{q}}, +inf\n\n'
            'sign: f\'(x)\n  -inf,{{p}}: ' + c + '+\n  {{p}}: z\n  {{p}},{{q}}: ' + c + '-\n'
            '  {{q}}: z\n  {{q}},+inf: ' + c + '+\n\n'
            'variation: f(x)\n  {{p}}: {{fp}}, top\n  {{q}}: {{fq}}, bottom\n'
            + ('  -inf,{{p}}: ?flèche\n  {{p}},{{q}}: ?flèche\n  {{q}},+inf: ?flèche\n' if cache else '')
            + '```')


SIGNE_FACT = ('$f\'(x)$ est un produit : ${{eval:3*a}}>0$, $x{{eval:-p;+}}$ s\'annule en ${{p}}$ et'
              ' $x{{eval:-q;+}}$ en ${{q}}$. $f\'(x)$ est positif à l\'extérieur des racines, négatif'
              ' entre elles.')
MODELES.append(('M8-sens-de-variation-d-un-polynome', modele(
    'Sens de variation d\'une fonction polynôme de degré au plus 3', '1TECHNO-081',
    'Signe de la dérivée (affine, ou factorisée de racines données ou évidentes), puis variations', 3,
    [variation('Soit $f$ la fonction définie sur $\\mathbb{R}$ par $f(x)={{eval:a*x^2+b*x+c}}$.'
               + CROISSANTE,
               [intervalles('{{if:a>0|[{{r}};+\\infty[|]-\\infty;{{r}}]}}')],
               [X, var('a', '1..3;±'), var('r', '-4..4'), var('b', 'eval:-2*a*r'),
                var('c', '-6..6')],
               ['$f\'(x)={{eval:2*a*x+b}}$, qui s\'annule en $x={{r}}$.',
                '{{if:a>0|Le coefficient de $x$ dans $f\'(x)$ est positif : $f\'(x)\\geqslant 0$ pour'
                ' $x\\geqslant {{r}}$.|Le coefficient de $x$ dans $f\'(x)$ est négatif : $f\'(x)\\geqslant 0$'
                ' pour $x\\leqslant {{r}}$.}}',
                '$f$ est croissante sur $\\textcolor{{{color:primary.0}}}{ {{if:a>0|[{{r}}\\,;+\\infty['
                '|]-\\infty\\,;{{r}}]}} }$.'],
               ['r != 0']),
     variation('Soit $f$ une fonction polynôme de degré $3$, définie sur $\\mathbb{R}$. On admet que sa'
               ' dérivée s\'écrit $f\'(x)={{eval:3*a}}(x{{eval:-p;+}})(x{{eval:-q;+}})$.' + CROISSANTE,
               [intervalles(']-\\infty;{{p}}]\\cup[{{q}};+\\infty[')],
               [var('a', '1..2'), var('p', '-5..3'), var('d', '1..5'), var('q', 'eval:p+d')],
               [SIGNE_FACT,
                '$f$ est croissante là où $f\'(x)\\geqslant 0$ : sur'
                ' $\\textcolor{{{color:primary.0}}}{]-\\infty\\,;{{p}}]\\cup[{{q}}\\,;+\\infty[}$.'],
               ['p != 0', 'q != 0']),
     variation('Soit $f$ la fonction définie sur $\\mathbb{R}$ par $f(x)={{eval:x^3-3*p^2*x}}$.\n\n'
               'Sa dérivée est $f\'(x)=3x^2-{{eval:3*p^2}}=3(x^2-{{eval:p^2}})$ ; ses racines sont'
               ' évidentes.' + CROISSANTE,
               [intervalles(']-\\infty;{{eval:-p}}]\\cup[{{p}};+\\infty[')],
               [X, var('p', '1..4')],
               ['$x^2={{eval:p^2}}$ pour $x=-{{p}}$ ou $x={{p}}$ : $f\'(x)=3(x+{{p}})(x-{{p}})$.',
                '$f\'(x)$ est positif à l\'extérieur des racines, négatif entre elles.',
                '$f$ est croissante sur $\\textcolor{{{color:primary.0}}}{]-\\infty\\,;-{{p}}]\\cup'
                '[{{p}}\\,;+\\infty[}$.']),
     variation('Soit $f$ une fonction polynôme de degré $3$, définie sur $\\mathbb{R}$, avec'
               ' $f({{p}})={{fp}}$ et $f({{q}})={{fq}}$. On admet que sa dérivée s\'écrit'
               ' $f\'(x)=3(x{{eval:-p;+}})(x{{eval:-q;+}})$.\n\n'
               'Complète le tableau de variation.\n\n' + tableau3(True),
               [], [var('a', '1'), var('p', '-4..1'), var('d', '1..4'), var('q', 'eval:p+d'),
                    var('fp', '1..9'), var('fq', 'eval:fp-d^3')],
               [SIGNE_FACT, tableau3(False)],
               ['p != 0', 'q != 0'])],
    [spec('x² - 4x + 1 : [2 ; +∞[', 0, '[2;+\\infty[', 'correct', {'a': 1, 'r': 2, 'b': -4, 'c': 1}),
     spec('Borne ouverte acceptée', 0, ']2;+\\infty[', 'correct', {'a': 1, 'r': 2, 'b': -4, 'c': 1}),
     spec('Erreur : intervalle de décroissance', 0, ']-\\infty;2]', 'incorrect',
          {'a': 1, 'r': 2, 'b': -4, 'c': 1}),
     spec('-x² - 2x : ]-∞ ; -1]', 0, ']-\\infty;-1]', 'correct', {'a': -1, 'r': -1, 'b': -2, 'c': 0}),
     spec('3(x+1)(x-2)', 1, ']-\\infty;-1]\\cup[2;+\\infty[', 'correct',
          {'a': 1, 'p': -1, 'd': 3, 'q': 2}),
     spec('Erreur : entre les racines', 1, '[-1;2]', 'incorrect', {'a': 1, 'p': -1, 'd': 3, 'q': 2}),
     spec('Erreur : signes des racines', 1, ']-\\infty;-2]\\cup[1;+\\infty[', 'incorrect',
          {'a': 1, 'p': -1, 'd': 3, 'q': 2}),
     spec('x³ - 12x', 2, ']-\\infty;-2]\\cup[2;+\\infty[', 'correct', {'p': 2}),
     spec('Erreur : [-2 ; 2]', 2, '[-2;2]', 'incorrect', {'p': 2}),
     spec('Tableau : -1, 1, +, -, +, ↗, ↘, ↗', 3, ['-1', '1', '+', '-', '+', '↗', '↘', '↗'], 'correct',
          {'a': 1, 'p': -1, 'd': 2, 'q': 1, 'fp': 5, 'fq': -3}),
     spec('Erreur : signes inversés', 3, ['-1', '1', '-', '+', '-', '↘', '↗', '↘'], 'incorrect',
          {'a': 1, 'p': -1, 'd': 2, 'q': 1, 'fp': 5, 'fq': -3})])))

# ---------------------------------------------------------------------------------------------
# M9 — monotonie et signe du taux de variation (cours) : 1TECHNO-056
# ---------------------------------------------------------------------------------------------

SENS = ['croissante', 'décroissante', 'on ne peut pas savoir']
MODELES.append(('M9-monotonie-et-signe-du-taux-de-variation', modele(
    'Fonction monotone et signe du taux de variation', '1TECHNO-056',
    'Croissante : taux positif ou nul entre deux réels de I ; deux images ne suffisent pas', 1,
    [choix('Une fonction $f$ est croissante sur un intervalle $I$. Pour deux réels $a\\neq b$ de $I$, le'
           ' taux de variation $\\dfrac{f(b)-f(a)}{b-a}$ est…',
           'positif ou nul', ['négatif ou nul', 'égal à $0$', 'de signe quelconque'],
           ['$f$ croissante sur $I$ : $f(a)$ et $f(b)$ sont rangés dans le même ordre que $a$ et $b$,'
            ' donc $f(b)-f(a)$ et $b-a$ ont le même signe.',
            'Le taux de variation est **positif ou nul** ; il est négatif ou nul pour une fonction'
            ' décroissante.']),
     choix_fixe('On sait que $f$ est monotone sur $[0\\,;10]$, avec $f({{a}})={{fa}}$ et'
                ' $f({{b}})={{fb}}$. Sur $[0\\,;10]$, $f$ est…', SENS, '{{if:fb>fa|0|1}}',
                ['Le taux de variation entre ${{a}}$ et ${{b}}$ vaut'
                 ' $\\dfrac{ {{fb}}-{{fa;()}} }{ {{b}}-{{a}} }=\\dfrac{ {{eval:fb-fa}} }{ {{eval:b-a}} }$,'
                 ' {{if:fb>fa|positif|négatif}}.',
                 '$f$ étant monotone, elle est {{if:fb>fa|croissante|décroissante}} sur $[0\\,;10]$.'],
                [var('a', '1..4'), var('b', '5..9'), var('fa', '-9..9'), var('fb', '-9..9')],
                ['fa != fb', 'fb - fa != b - a', 'fb - fa != a - b']),
     choix_fixe('On ne sait rien de $f$, sauf que $f(0)={{fa}}$ et $f(4)={{fb}}$. Sur $[0\\,;4]$, $f$'
                ' est…', SENS, 2,
                ['Deux images ne suffisent pas : entre $0$ et $4$, $f$ peut monter puis descendre.',
                 'Il faudrait savoir que $f$ est monotone sur $[0\\,;4]$ pour conclure : **on ne peut pas'
                 ' savoir**.'],
                [var('fa', '-5..3'), var('d', '2..8'), var('fb', 'eval:fa+d')])],
    [spec('Positif ou nul', 0, '0', 'correct'),
     spec('Erreur : négatif', 0, '1', 'incorrect'),
     spec('f(2) = 7, f(5) = 1 : décroissante', 1, '1', 'correct', {'a': 2, 'b': 5, 'fa': 7, 'fb': 1}),
     spec('Erreur : croissante', 1, '0', 'incorrect', {'a': 2, 'b': 5, 'fa': 7, 'fb': 1}),
     spec('f(1) = -3, f(6) = 4 : croissante', 1, '0', 'correct', {'a': 1, 'b': 6, 'fa': -3, 'fb': 4}),
     spec('Sans monotonie : on ne sait pas', 2, '2', 'correct', {'fa': 1, 'd': 8, 'fb': 9}),
     spec('Erreur : croissante', 2, '0', 'incorrect', {'fa': 1, 'd': 8, 'fb': 9})], cours=True)))

# ---------------------------------------------------------------------------------------------
# Écriture
# ---------------------------------------------------------------------------------------------

os.makedirs(DOSSIER, exist_ok=True)
for nom, m in MODELES:
    m = dict(m)
    m.pop('_point')
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
    print(' ', m['_point'], nom)
