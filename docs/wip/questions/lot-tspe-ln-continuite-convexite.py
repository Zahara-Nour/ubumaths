"""Écrit les 6 modèles du lot 3 « logarithme, continuité, convexité : restes » de la terminale
spécialité dans scripts/questions/tspe-3-ln-continuite-convexite/.

Phase 0 validée par David le 2026-11-02 (« je suis tes recos », § 16 du journal
« docs/wip/questions-tspe-progress.md »), un point par modèle :

| # | Point    | Titre                                         | Catégorie, niveau                                            |
| 1 | TSPE-593 | Variations de ln : comparer, signe            | Fonctions › Logarithmes › dérivée, 1                         |
| 2 | TSPE-447 | Problème : demi-vie, doublement (exp et ln)   | Fonctions › Logarithmes › équations et inéquations, 4        |
| 3 | TSPE-626 | Transformer une écriture exponentielle        | Fonctions › Fonction exponentielle › propriétés algébriques, 8 |
| 4 | TSPE-426 | Dérivable implique continue                   | Fonctions › Continuité › continuité en un point, 2           |
| 5 | TSPE-589 | Point d'inflexion lu sur la courbe de f′      | Fonctions › Convexité › point d'inflexion, 3                 |
| 6 | TSPE-591 | Point d'inflexion lu sur la courbe de f″      | Fonctions › Convexité › point d'inflexion, 4                 |

Décisions : aucune sous-notion neuve ; M2 en valeur exacte ; M3 modèle de terminale neuf (les
modèles de 1re spé réduisent des exposants, 1SPE-294) ; M4 interroge le fait, jamais une
justification de continuité (borne générale) ; niveau `T_SPE` seul.

Voisins à ne pas répéter : ffd5c051 (propriétés de ln), d3301f2d / 14036c68 (équations, inéquations
avec ln), f1963ef2 (seuil discret par le logarithme), 1re spé e6b429b4 / 6137a555 / bd45ed7f /
a4272b10 (réduire un exposant), 10393ff9 (continuité lue sur une courbe), 08f9ad7b / 98f9d4b2
(point d'inflexion par le calcul, sur la courbe de f), e3e19d28 / 225c8682 (convexité lue sur f′, f″).

    python3 docs/wip/questions/lot-tspe-ln-continuite-convexite.py scripts/questions/tspe-3-ln-continuite-convexite
"""
import json
import os
import subprocess
import sys

DOSSIER = sys.argv[1]


def spec(desc, vi, variables, answers, status):
    return {'description': desc, 'variationIndex': vi,
            'variables': {k: str(v) for k, v in variables.items()},
            'answers': answers if isinstance(answers, list) else [answers],
            'expected': ({'status': status, 'constraintViolations': ['form']} if status == 'bad_form'
                         else {'status': status})}


def modele(nom, title, description, theme, domain, subdomain, level, variations, specs, delay=60):
    return nom, {'title': title, 'description': description, 'grades': ['T_SPE'],
                 'theme': theme, 'domain': domain, 'subdomain': subdomain,
                 'level': level, 'delay': delay, 'status': 'draft',
                 'shared': {'blankDefaults': {'acceptDecimal': True}, 'cleanCoefficients': True},
                 'variations': variations, 'testSpecs': specs}


def var(nom, expression):
    return {'name': nom, 'expression': expression}


def variation(statement, variables, answers, steps):
    v = {'statement': statement, 'blanks': [{'expectedAnswer': a} for a in answers],
         'correction': {'steps': steps}}
    if variables:
        v['variables'] = variables
    return v


def col(x):
    return '\\textcolor{{{color:primary.0}}}{' + x + '}'


def si(cond, alors, sinon):
    return '{{if:' + cond + '|' + alors + '|' + sinon + '}}'


def choix(*items):
    """Bloc choix ; le PREMIER item est la bonne réponse (index 0)."""
    return '```choix\n' + '\n'.join('- ' + i for i in items) + '\n```'


def courbe(xmin, xmax, ymin, ymax, expr, couleur, description):
    return ('```courbe\nx: ' + xmin + ' ; ' + xmax + '\ny: ' + ymin + ' ; ' + ymax
            + '\ngrille: 1 ; 1\ng(x) = ' + expr + '   ' + couleur
            + '\ntaille: moyenne\ndescription: ' + description + '\n```')


MODELES = []

# --- 1. TSPE-593 : variations de ln ---------------------------------------------------------

V593_SENS = variation(
    'Quel est le sens de variation de la fonction logarithme népérien $\\ln$ ?\n\n'
    + choix('$\\ln$ est strictement croissante sur $\\left]0\\,;+\\infty\\right[$',
            '$\\ln$ est strictement croissante sur $\\mathbb{R}$',
            '$\\ln$ est strictement décroissante sur $\\left]0\\,;+\\infty\\right[$',
            '$\\ln$ est décroissante sur $\\left]0\\,;1\\right]$ et croissante sur '
            '$\\left[1\\,;+\\infty\\right[$'),
    None, ['0'],
    ['$\\ln$ est définie sur $\\left]0\\,;+\\infty\\right[$ seulement, et $\\ln\'(x)=\\dfrac{1}{x}>0$ '
     'sur cet intervalle.',
     '$\\ln$ est donc ' + col('strictement croissante sur \\left]0\\,;+\\infty\\right[') + '.',
     '$\\ln x$ est négatif sur $\\left]0\\,;1\\right[$, mais il augmente quand même : le signe et le '
     'sens de variation sont deux choses différentes.'])

A = '{{eval:p/10;d}}'
B = '{{eval:q/10;d}}'
V593_COMPARER = variation(
    'Compare, sans calculatrice, $\\ln ' + A + '$ et $\\ln ' + B + '$.\n\n'
    + choix('$\\ln ' + A + si('p<q', '<', '>') + '\\ln ' + B + '$',
            '$\\ln ' + A + si('p<q', '>', '<') + '\\ln ' + B + '$',
            '$\\ln ' + A + '=\\ln ' + B + '$'),
    [var('p', '1..30'), var('q', '1..30')], ['0'],
    ['La fonction $\\ln$ est strictement croissante sur $\\left]0\\,;+\\infty\\right[$ : elle range '
     'les images dans le même ordre que les nombres.',
     '$' + A + si('p<q', '<', '>') + B + '$, donc $' + col('\\ln ' + A + si('p<q', '<', '>') + '\\ln ' + B)
     + '$.'])
V593_COMPARER['conditions'] = ['p != q', 'p != 10', 'q != 10']

X = '{{eval:p/10;d}}'
V593_SIGNE = variation(
    'Quel est le signe de $\\ln ' + X + '$ ?\n\n'
    + choix('$\\ln ' + X + si('p<10', '<', '>') + '0$',
            '$\\ln ' + X + si('p<10', '>', '<') + '0$',
            '$\\ln ' + X + '=0$'),
    [var('p', '1..30')], ['0'],
    ['$\\ln 1=0$ et $\\ln$ est strictement croissante sur $\\left]0\\,;+\\infty\\right[$.',
     '$' + X + si('p<10', '<', '>') + '1$, donc $\\ln ' + X + si('p<10', '<', '>') + '\\ln 1$, soit $'
     + col('\\ln ' + X + si('p<10', '<', '>') + '0') + '$.'])
V593_SIGNE['conditions'] = ['p != 10']

V593_IMPLICATION = variation(
    'Soient $a$ et $b$ deux réels tels que $0<a<b$. Que peut-on en déduire ?\n\n'
    + choix('$\\ln a<\\ln b$', '$\\ln a>\\ln b$', '$\\ln(b-a)>0$', '$\\ln a\\times\\ln b>0$'),
    None, ['0'],
    ['$\\ln$ est strictement croissante sur $\\left]0\\,;+\\infty\\right[$, donc elle conserve l\'ordre : '
     '$0<a<b\\implies' + col('\\ln a<\\ln b') + '$.',
     '$\\ln(b-a)$ peut être négatif (si $b-a<1$), et $\\ln a$, $\\ln b$ peuvent être de signes contraires.'])

MODELES.append(modele(
    '1-variations-ln', 'Variations de ln : comparer, signe',
    'ln strictement croissante sur ]0 ; +∞[ : sens de variation, comparer ln a et ln b, signe de ln x '
    '(pièges : croissante sur ℝ, signe confondu avec le sens)',
    'Fonctions', 'Logarithmes', 'Dérivée', 1,
    [V593_SENS, V593_COMPARER, V593_SIGNE, V593_IMPLICATION],
    [spec('v0 : croissante sur ]0 ; +∞[', 0, {}, '0', 'correct'),
     spec('v0 : croissante sur ℝ', 0, {}, '1', 'incorrect'),
     spec('v1 : ln 0,3 < ln 0,7', 1, {'p': 3, 'q': 7}, '0', 'correct'),
     spec('v1 : ordre inversé', 1, {'p': 3, 'q': 7}, '1', 'incorrect'),
     spec('v1 : ln 2,5 > ln 1,2', 1, {'p': 25, 'q': 12}, '0', 'correct'),
     spec('v2 : ln 0,7 < 0', 2, {'p': 7}, '0', 'correct'),
     spec('v2 : ln 0,7 > 0', 2, {'p': 7}, '1', 'incorrect'),
     spec('v3 : ln a < ln b', 3, {}, '0', 'correct'),
     spec('v3 : ln(b − a) > 0', 3, {}, '2', 'incorrect')]))

# --- 2. TSPE-447 : problème avec exp et ln (valeur exacte) ------------------------------------

LAMBDA = '{{eval:1/duree;d}}'
DUREE = var('duree', '10|20|25|50')
V447_DEMI_VIE = variation(
    'La masse, en grammes, d\'un isotope radioactif au bout de $t$ années est '
    '$m(t)={{m0}}\\,e^{-' + LAMBDA + 't}$.\n\n'
    'La **demi-vie** est la durée $T$ au bout de laquelle la masse a été divisée par $2$ : '
    '$m(T)=\\dfrac{ {{m0}} }{2}$.\n\nDonne la valeur exacte de $T$.\n\n$T=?$',
    [DUREE, var('m0', '100|200|500')], ['{{duree}}\\ln 2'],
    ['$m(T)=\\dfrac{ {{m0}} }{2}\\iff e^{-' + LAMBDA + 'T}=\\dfrac{1}{2}$ (on divise par ${{m0}}$).',
     'On applique $\\ln$ : $-' + LAMBDA + 'T=\\ln\\dfrac{1}{2}=-\\ln 2$.',
     '$T=\\dfrac{\\ln 2}{' + LAMBDA + '}=' + col('{{duree}}\\ln 2') + '$ années (environ '
     '{{eval:round(duree*6.931)/10;d}}).'])

V447_LAMBDA = variation(
    'La masse d\'un isotope radioactif au bout de $t$ années est $m(t)=m_0\\,e^{-\\lambda t}$, où $m_0$ est '
    'la masse de départ et $\\lambda$ un réel strictement positif.\n\n'
    'Sa **demi-vie** est de ${{duree}}$ années : $m({{duree}})=\\dfrac{m_0}{2}$.\n\n'
    'Donne la valeur exacte de $\\lambda$.\n\n$\\lambda=?$',
    [var('duree', '5|8|12|30')], ['\\dfrac{\\ln 2}{ {{duree}} }'],
    ['$m({{duree}})=\\dfrac{m_0}{2}\\iff e^{-{{duree}}\\lambda}=\\dfrac{1}{2}$ (on divise par $m_0>0$).',
     'On applique $\\ln$ : $-{{duree}}\\lambda=\\ln\\dfrac{1}{2}=-\\ln 2$.',
     '$\\lambda=' + col('\\dfrac{\\ln 2}{ {{duree}} }') + '$.'])

V447_MULTIPLIE = variation(
    'Le nombre de bactéries d\'une culture au bout de $t$ heures est $N(t)={{n0}}\\,e^{' + LAMBDA + 't}$.\n\n'
    'Au bout de combien d\'heures le nombre de bactéries aura-t-il été multiplié par ${{fois}}$ ? '
    'Donne la valeur exacte.\n\n$t=?$',
    [DUREE, var('n0', '1000|2000|5000'), var('fois', '2|3|5|10')], ['{{duree}}\\ln {{fois}}'],
    ['$N(t)={{fois}}\\times{{n0}}\\iff e^{' + LAMBDA + 't}={{fois}}$ (on divise par ${{n0}}$).',
     'On applique $\\ln$ : $' + LAMBDA + 't=\\ln {{fois}}$.',
     '$t=\\dfrac{\\ln {{fois}}}{' + LAMBDA + '}=' + col('{{duree}}\\ln {{fois}}') + '$ heures.'])

MODELES.append(modele(
    '2-probleme-exp-ln', 'Problème : demi-vie, doublement (exp et ln)',
    'Décroissance radioactive (demi-vie, constante λ) et croissance exponentielle (temps pour multiplier '
    'par k) : valeur exacte par ln (pièges : arrondi, ln(1/2) = ln 2, λ/ln 2)',
    'Fonctions', 'Logarithmes', 'Équations et inéquations', 4,
    [V447_DEMI_VIE, V447_LAMBDA, V447_MULTIPLIE],
    [spec('v0 : 25 ln 2', 0, {'duree': 25, 'm0': 200}, '25\\ln 2', 'correct'),
     spec('v0 : ln 2 / 0,04 non simplifié', 0, {'duree': 25, 'm0': 200}, '\\dfrac{\\ln 2}{0,04}', 'bad_form'),
     spec('v0 : arrondi', 0, {'duree': 25, 'm0': 200}, '17,3', 'incorrect'),
     spec('v0 : 0,04 / ln 2', 0, {'duree': 25, 'm0': 200}, '\\dfrac{0,04}{\\ln 2}', 'incorrect'),
     spec('v0 : −25 ln 2', 0, {'duree': 25, 'm0': 200}, '-25\\ln 2', 'incorrect'),
     spec('v1 : ln 2 / 8', 1, {'duree': 8}, '\\dfrac{\\ln 2}{8}', 'correct'),
     spec('v1 : 8 ln 2', 1, {'duree': 8}, '8\\ln 2', 'incorrect'),
     spec('v1 : 8 / ln 2', 1, {'duree': 8}, '\\dfrac{8}{\\ln 2}', 'incorrect'),
     spec('v2 : 20 ln 3', 2, {'duree': 20, 'n0': 1000, 'fois': 3}, '20\\ln 3', 'correct'),
     spec('v2 : ln 3 / 0,05 non simplifié', 2, {'duree': 20, 'n0': 1000, 'fois': 3}, '\\dfrac{\\ln 3}{0,05}', 'bad_form'),
     spec('v2 : 60 (3 × 20)', 2, {'duree': 20, 'n0': 1000, 'fois': 3}, '60', 'incorrect'),
     spec('v2 : arrondi', 2, {'duree': 20, 'n0': 1000, 'fois': 3}, '22', 'incorrect')]))

# --- 3. TSPE-626 : transformer une écriture exponentielle -------------------------------------

V626_FACTORISER = variation(
    'Complète pour que l\'égalité soit vraie pour tout réel $x$.\n\n'
    '$e^{ {{p}}x}-{{a}}e^{' + si('q==1', 'x', '{{q}}x') + '}=e^{' + si('q==1', 'x', '{{q}}x')
    + '}\\left(e^{?x}-{{a}}\\right)$',
    [var('p', '2..5'), var('q', '1..4'), var('a', '2..9')], ['{{eval:p-q}}'],
    ['$e^{ {{p}}x}=e^{' + si('q==1', 'x', '{{q}}x') + '+{{eval:p-q}}x}=e^{' + si('q==1', 'x', '{{q}}x')
     + '}\\times e^{ {{eval:p-q}}x}$ (équation fonctionnelle).',
     'On factorise par $e^{' + si('q==1', 'x', '{{q}}x') + '}$ : il manque $' + col('{{eval:p-q}}')
     + '$ à l\'exposant.'])
V626_FACTORISER['conditions'] = ['q < p']

V626_DIVISER = variation(
    'Complète pour que l\'égalité soit vraie pour tout réel $x$.\n\n'
    '$\\dfrac{e^{x}-{{a}}}{e^{x}+{{b}}}=\\dfrac{1-{{a}}e^{?}}{1+{{b}}e^{?}}$',
    [var('a', '1..9'), var('b', '1..9')], ['-x', '-x'],
    ['On divise le numérateur et le dénominateur par $e^{x}\\neq 0$.',
     '$\\dfrac{ {{a}} }{e^{x}}={{a}}e^{-x}$, donc les deux cases valent $' + col('-x') + '$.'])

V626_CARRE = variation(
    'Complète pour que l\'égalité soit vraie pour tout réel $x$.\n\n'
    '$\\left(e^{x}' + si('s>0', '+', '-') + 'e^{-x}\\right)^2=e^{2x}+?+e^{-2x}$',
    [var('s', '-1|1')], ['{{eval:2*s}}'],
    ['Identités remarquables : $(a+b)^2=a^2+2ab+b^2$ et $(a-b)^2=a^2-2ab+b^2$, ici avec $a=e^{x}$ et '
     '$b=e^{-x}$.',
     '$e^{x}\\times e^{-x}=e^{x-x}=e^{0}=1$, donc le double produit vaut $' + col('{{eval:2*s}}') + '$.'])

V626_FRACTION = variation(
    'Complète pour que l\'égalité soit vraie pour tout réel $x$.\n\n'
    '$e^{x}' + si('s>0', '+', '-') + 'e^{-x}=\\dfrac{e^{2x}' + si('s>0', '+', '-') + '1}{?}$',
    [var('s', '-1|1')], ['e^{x}'],
    ['$e^{-x}=\\dfrac{1}{e^{x}}$ et $e^{x}=\\dfrac{e^{x}\\times e^{x}}{e^{x}}=\\dfrac{e^{2x}}{e^{x}}$.',
     'Au même dénominateur : $e^{x}' + si('s>0', '+', '-') + 'e^{-x}=\\dfrac{e^{2x}' + si('s>0', '+', '-')
     + '1}{' + col('e^{x}') + '}$.'])

MODELES.append(modele(
    '3-transformer-ecriture-exp', 'Transformer une écriture exponentielle',
    'Équation fonctionnelle de exp pour transformer : factoriser par e^{qx}, diviser haut et bas par eˣ, '
    'double produit eˣ·e⁻ˣ = 1, réduire au même dénominateur',
    'Fonctions', 'Fonction exponentielle', 'Propriétés algébriques', 8,
    [V626_FACTORISER, V626_DIVISER, V626_CARRE, V626_FRACTION],
    [spec('v0 : e^{5x} − 3e^{2x}, 3', 0, {'p': 5, 'q': 2, 'a': 3}, '3', 'correct'),
     spec('v0 : quotient des exposants', 0, {'p': 4, 'q': 2, 'a': 3}, '2', 'correct'),
     spec('v0 : p', 0, {'p': 5, 'q': 2, 'a': 3}, '5', 'incorrect'),
     spec('v0 : p/q', 0, {'p': 5, 'q': 2, 'a': 3}, '2,5', 'incorrect'),
     spec('v1 : −x, −x', 1, {'a': 3, 'b': 2}, ['-x', '-x'], 'correct'),
     spec('v1 : x, x', 1, {'a': 3, 'b': 2}, ['x', 'x'], 'incorrect'),
     spec('v2 : + → 2', 2, {'s': 1}, '2', 'correct'),
     spec('v2 : − → −2', 2, {'s': -1}, '-2', 'correct'),
     spec('v2 : 0 (produit oublié)', 2, {'s': 1}, '0', 'incorrect'),
     spec('v2 : 2e^{0} non réduit', 2, {'s': 1}, '2e^{0}', 'bad_form'),
     spec('v3 : eˣ', 3, {'s': 1}, 'e^{x}', 'correct'),
     spec('v3 : e^{2x}', 3, {'s': 1}, 'e^{2x}', 'incorrect'),
     spec('v3 : e^{-x}', 3, {'s': -1}, 'e^{-x}', 'incorrect')]))

# --- 4. TSPE-426 : dérivable implique continue ------------------------------------------------

V426_DIRECT = variation(
    'Soit $f$ une fonction définie sur un intervalle $I$ et $a$ un réel de $I$.\n\n'
    'On sait que $f$ est **dérivable** en $a$. Que peut-on en déduire ?\n\n'
    + choix('$f$ est continue en $a$', '$f\'(a)=0$', '$f$ n\'est pas forcément continue en $a$',
            '$f$ est dérivable sur tout l\'intervalle $I$'),
    None, ['0'],
    ['Propriété : toute fonction ' + col('dérivable en a est continue en a') + '.',
     '$f\'(a)=0$ n\'a aucune raison d\'être vrai : c\'est le cas seulement aux extremums.'])

V426_RECIPROQUE = variation(
    'Que penser de l\'affirmation : « Si $f$ est continue en $a$, alors $f$ est dérivable en $a$ » ?\n\n'
    + choix('Fausse : ' + si('c==0', '$x\\mapsto\\lvert x\\rvert$', '$x\\mapsto\\sqrt{x}$')
            + ' est continue en $0$ mais pas dérivable en $0$',
            'Vraie : c\'est la propriété du cours',
            'Vraie : toute fonction continue est dérivable',
            'Fausse : une fonction continue en $a$ n\'est jamais dérivable en $a$'),
    [var('c', '0..1')], ['0'],
    ['Le cours dit : dérivable $\\implies$ continue. L\'affirmation est la **réciproque**, qui est '
     + col('fausse') + '.',
     si('c==0', '$x\\mapsto\\lvert x\\rvert$ est continue en $0$, mais sa courbe a un point anguleux en $0$ : '
                'elle n\'y est pas dérivable.',
        '$x\\mapsto\\sqrt{x}$ est continue en $0$, mais sa courbe a une tangente verticale en $0$ : '
        'elle n\'y est pas dérivable.')])

V426_CONTRAPOSEE = variation(
    'Soit $f$ une fonction définie sur un intervalle $I$ et $a$ un réel de $I$.\n\n'
    'On sait que $f$ n\'est **pas continue** en $a$. Que peut-on en déduire ?\n\n'
    + choix('$f$ n\'est pas dérivable en $a$', '$f$ est dérivable en $a$',
            'On ne peut rien dire de la dérivabilité de $f$ en $a$', '$f\'(a)=0$'),
    None, ['0'],
    ['Si $f$ était dérivable en $a$, elle serait continue en $a$ (propriété du cours).',
     'Comme elle n\'est pas continue en $a$, ' + col('f \\text{ n\'est pas dérivable en } a') + '.'])

MODELES.append(modele(
    '4-derivable-continue', 'Dérivable implique continue',
    'Toute fonction dérivable est continue : la propriété, sa réciproque fausse (|x|, √x en 0), sa '
    'contraposée',
    'Fonctions', 'Continuité', 'Continuité en un point', 2,
    [V426_DIRECT, V426_RECIPROQUE, V426_CONTRAPOSEE],
    [spec('v0 : continue', 0, {}, '0', 'correct'),
     spec('v0 : f′(a) = 0', 0, {}, '1', 'incorrect'),
     spec('v1 : fausse, contre-exemple', 1, {'c': 0}, '0', 'correct'),
     spec('v1 : vraie', 1, {'c': 1}, '1', 'incorrect'),
     spec('v2 : pas dérivable', 2, {}, '0', 'correct'),
     spec('v2 : on ne peut rien dire', 2, {}, '2', 'incorrect')]))

# --- 5. TSPE-589 : point d'inflexion sur la courbe de f′ --------------------------------------

INTRO_FP = ('On a représenté ci-dessous la courbe de la fonction **dérivée** $f\'$ d\'une fonction $f$ deux '
            'fois dérivable sur $\\mathbb{R}$.\n\n')
V589_PARABOLE = variation(
    INTRO_FP
    + courbe('{{eval:h-4}}', '{{eval:h+4}}', '-5', '5', '{{s}}*0.5*((x-{{h}})^2-{{eval:m^2}})', 'rouge',
             'Courbe de la dérivée f′ : une parabole qui coupe l\'axe des abscisses en deux points.')
    + '\n\nQuelle est l\'abscisse du point d\'inflexion de la courbe de $f$ ?\n\n$x=?$',
    [var('s', '-1|1'), var('h', '-2..2'), var('m', '1..2')], ['{{h}}'],
    ['La courbe de $f$ a un point d\'inflexion là où la convexité change, c\'est-à-dire là où $f\'$ '
     'change de sens de variation : à un **extremum** de $f\'$.',
     '$f\'$ est ' + si('s>0', 'décroissante puis croissante', 'croissante puis décroissante')
     + ', avec un ' + si('s>0', 'minimum', 'maximum') + ' en $x={{h}}$.',
     'Le point d\'inflexion a pour abscisse $x=' + col('{{h}}') + '$. (Les points où $f\'$ s\'annule, '
     '$x={{eval:h-m}}$ et $x={{eval:h+m}}$, sont les extremums de $f$.)'])

V589_CUBIQUE = variation(
    INTRO_FP
    + courbe('{{eval:h-3}}', '{{eval:h+3}}', '-4', '4', '{{s}}*0.5*((x-{{h}})^3-3*(x-{{h}}))', 'rouge',
             'Courbe de la dérivée f′ : elle monte et descend, avec deux sommets.')
    + '\n\nLa courbe de $f$ a deux points d\'inflexion. Donne leurs abscisses, de la plus petite à la '
      'plus grande.\n\n$x_1=?$ et $x_2=?$',
    [var('s', '-1|1'), var('h', '-1..1')], ['{{eval:h-1}}', '{{eval:h+1}}'],
    ['Un point d\'inflexion de la courbe de $f$ correspond à un **extremum** de $f\'$ : là, $f\'$ change de '
     'sens de variation, donc $f$ change de convexité.',
     '$f\'$ a un ' + si('s>0', 'maximum', 'minimum') + ' en $x={{eval:h-1}}$ et un '
     + si('s>0', 'minimum', 'maximum') + ' en $x={{eval:h+1}}$.',
     '$x_1=' + col('{{eval:h-1}}') + '$ et $x_2=' + col('{{eval:h+1}}') + '$. (Là où $f\'$ s\'annule, '
     '$f$ a un extremum, pas un point d\'inflexion.)'])

MODELES.append(modele(
    '5-inflexion-courbe-derivee', 'Point d\'inflexion lu sur la courbe de f′',
    'Lire sur la courbe de f′ l\'abscisse des points d\'inflexion de f : extremums de f′ (piège : les zéros '
    'de f′, extremums de f)',
    'Fonctions', 'Convexité', 'Point d\'inflexion', 3,
    [V589_PARABOLE, V589_CUBIQUE],
    [spec('v0 : sommet h', 0, {'s': 1, 'h': 1, 'm': 2}, '1', 'correct'),
     spec('v0 : zéro de f′', 0, {'s': 1, 'h': 1, 'm': 2}, '3', 'incorrect'),
     spec('v0 : zéro de f′ (gauche)', 0, {'s': -1, 'h': 1, 'm': 2}, '-1', 'incorrect'),
     spec('v1 : h ± 1', 1, {'s': 1, 'h': 0}, ['-1', '1'], 'correct'),
     spec('v1 : zéro h de f′', 1, {'s': 1, 'h': 0}, ['0', '1'], 'incorrect')]))

# --- 6. TSPE-591 : point d'inflexion sur la courbe de f″ --------------------------------------

INTRO_FS = ('On a représenté ci-dessous la courbe de la fonction **dérivée seconde** $f\'\'$ d\'une fonction '
            '$f$ deux fois dérivable sur $\\mathbb{R}$.\n\n')
V591_PARABOLE = variation(
    INTRO_FS
    + courbe('{{eval:h-4}}', '{{eval:h+4}}', '-5', '5', '{{s}}*0.5*((x-{{h}})^2-{{eval:m^2}})', 'violet',
             'Courbe de la dérivée seconde f″ : une parabole qui coupe l\'axe des abscisses en deux points.')
    + '\n\nLa courbe de $f$ a deux points d\'inflexion. Donne leurs abscisses, de la plus petite à la '
      'plus grande.\n\n$x_1=?$ et $x_2=?$',
    [var('s', '-1|1'), var('h', '-2..2'), var('m', '1..2')], ['{{eval:h-m}}', '{{eval:h+m}}'],
    ['La courbe de $f$ a un point d\'inflexion là où $f\'\'$ s\'annule **en changeant de signe** : la '
     'convexité de $f$ change.',
     'Sur le graphique, $f\'\'$ change de signe en $x={{eval:h-m}}$ et en $x={{eval:h+m}}$.',
     '$x_1=' + col('{{eval:h-m}}') + '$ et $x_2=' + col('{{eval:h+m}}') + '$. (Le sommet de la courbe de '
     '$f\'\'$, en $x={{h}}$, n\'est pas un point d\'inflexion de $f$.)'])

V591_RACINE_DOUBLE = variation(
    INTRO_FS
    + courbe('{{eval:min(a,b)-3}}', '{{eval:max(a,b)+3}}', '-5', '5', '{{s}}*0.2*(x-{{a}})^2*(x-{{b}})',
             'violet',
             'Courbe de la dérivée seconde f″ : elle touche l\'axe des abscisses en un point sans le traverser, '
             'et le traverse en un autre.')
    + '\n\nCombien la courbe de $f$ a-t-elle de points d\'inflexion ?\n\n$?$',
    [var('s', '-1|1'), var('a', '-2..2'), var('b', '-2..2')], ['1'],
    ['Un point d\'inflexion correspond à un zéro de $f\'\'$ où $f\'\'$ **change de signe**.',
     'En $x={{a}}$, la courbe de $f\'\'$ touche l\'axe sans le traverser : $f\'\'$ garde le même signe, '
     'pas de point d\'inflexion.',
     'En $x={{b}}$, $f\'\'$ change de signe : un point d\'inflexion. Il y en a donc $' + col('1') + '$.'])
V591_RACINE_DOUBLE['conditions'] = ['abs(a-b) >= 2', 'abs(a-b) <= 3']

MODELES.append(modele(
    '6-inflexion-courbe-derivee-seconde', 'Point d\'inflexion lu sur la courbe de f″',
    'Lire sur la courbe de f″ les points d\'inflexion de f : zéros où f″ change de signe (pièges : le sommet '
    'de f″, un zéro où f″ ne change pas de signe)',
    'Fonctions', 'Convexité', 'Point d\'inflexion', 4,
    [V591_PARABOLE, V591_RACINE_DOUBLE],
    [spec('v0 : h ± m', 0, {'s': 1, 'h': 0, 'm': 2}, ['-2', '2'], 'correct'),
     spec('v0 : sommet', 0, {'s': 1, 'h': 0, 'm': 2}, ['0', '2'], 'incorrect'),
     spec('v1 : 1', 1, {'s': 1, 'a': -1, 'b': 1}, '1', 'correct'),
     spec('v1 : 2 (racine double comptée)', 1, {'s': 1, 'a': -1, 'b': 1}, '2', 'incorrect')]))

os.makedirs(DOSSIER, exist_ok=True)
for nom, m in MODELES:
    with open(os.path.join(DOSSIER, nom + '.json'), 'w', encoding='utf-8') as f:
        json.dump(m, f, ensure_ascii=False, indent='\t')
        f.write('\n')
# Mis en forme comme le pre-commit, pour que le script redonne les fichiers commités
subprocess.run(['pnpm', 'exec', 'prettier', '--write', DOSSIER], check=True,
               stdout=subprocess.DEVNULL)
print(f'{len(MODELES)} modèles écrits dans {DOSSIER}')
