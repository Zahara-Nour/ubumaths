"""Écrit les 9 modèles du lot 4 « intégrales et primitives : restes » de la terminale spécialité
dans scripts/questions/tspe-4-integrales-primitives/.

Phase 0 validée par David le 2026-11-02 (« go » sur les recos, § 17 du journal
« docs/wip/questions-tspe-progress.md »), un point par modèle :

| # | Point    | Titre                                           | Catégorie, niveau                                         |
| 1 | TSPE-461 | Résoudre l'équation y′ = f                      | Primitives › Notion de primitive, 3                       |
| 2 | TSPE-462 | F est-elle une primitive de f ?                 | Primitives › Notion de primitive, 2                       |
| 3 | TSPE-478 | Existence de primitives d'une fonction continue | Primitives › Notion de primitive, 4                       |
| 4 | TSPE-480 | Linéarité de l'intégrale                        | Propriétés de l'intégrale › Linéarité, 1                  |
| 5 | TSPE-485 | Estimer graphiquement une intégrale             | Intégrale et aire › Lecture graphique, 2                  |
| 6 | TSPE-486 | Estimer graphiquement une valeur moyenne        | Valeur moyenne › Lecture graphique, 1                     |
| 7 | TSPE-489 | Majorer une intégrale par une autre fonction    | Propriétés de l'intégrale › Positivité et inégalités, 3   |
| 8 | TSPE-491 | Suite d'intégrales                              | Calcul intégral › Suites d'intégrales, 1                  |
| 9 | TSPE-465 | Allure des solutions de y′ = ay                 | Équations différentielles › Allure des courbes, 1         |

Décisions : niveau `T_SPE` seul ; aucune sous-notion neuve ; M7 et M9 écrits bien que 489 et 465
aient déjà un modèle (dd0ee69a : constantes ; 624bf511 : y′ = ay + b) ; estimations graphiques
(M5, M6) en case choix (une case n'accepte pas de marge).

    python3 docs/wip/questions/lot-tspe-integrales-primitives.py scripts/questions/tspe-4-integrales-primitives
"""
import json
import os
import subprocess
import sys

DOSSIER = sys.argv[1]
PRIM = 'Primitives et équations différentielles'
INTEG = 'Intégration'


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


def variation(statement, variables, answers, steps, conditions=None):
    v = {'statement': statement, 'blanks': [{'expectedAnswer': a} for a in answers],
         'correction': {'steps': steps}}
    if variables:
        v['variables'] = variables
    if conditions:
        v['conditions'] = conditions
    return v


def colm(x):
    """Couleur dans le texte : la formule colorée entre $…$."""
    return '$' + col(x) + '$'


def col(x):
    return '\\textcolor{{{color:primary.0}}}{' + x + '}'


def si(cond, alors, sinon):
    return '{{if:' + cond + '|' + alors + '|' + sinon + '}}'


def par_k(valeurs, nom='k'):
    """Une valeur par cas de la variable k (ifs à plat, jamais imbriqués)."""
    return ''.join('{{if:' + nom + '==' + str(i) + '|' + v + '}}' for i, v in enumerate(valeurs))


def coef(E, m):
    """Premier terme E·m : 1·m → m, −1·m → −m (le nettoyage ne lit pas toutes les formules)."""
    if m == '':
        return '{{eval:' + E + '}}'
    return ('{{if:' + E + '==1|' + m + '}}{{if:' + E + '==-1|-' + m + '}}{{if:' + E + '!=1 && ' + E
            + '!=-1|{{eval:' + E + '}}' + m + '}}')


def terme(E, m):
    """Terme suivant, signe écrit : +m, −m, +3m, −3m, ou constante signée."""
    if m == '':
        return '{{if:' + E + '>0|+}}{{eval:' + E + '}}'
    return ('{{if:' + E + '==1|+' + m + '}}{{if:' + E + '==-1|-' + m + '}}{{if:' + E + '>1|+{{eval:' + E
            + '}}' + m + '}}{{if:' + E + '<-1|{{eval:' + E + '}}' + m + '}}')


def choix(*items):
    """Bloc choix ; le PREMIER item est la bonne réponse (index 0)."""
    return '```choix\n' + '\n'.join('- ' + i for i in items) + '\n```'


def integrale(a, b, f):
    return '\\displaystyle\\int_{' + a + '}^{' + b + '}' + f + '\\,\\mathrm{d}x'


R = '\\mathbb{R}'
RP = '\\left]0\\,;+\\infty\\right['
MODELES = []

# --- 1. TSPE-461 : résoudre y′ = f ------------------------------------------------------------

QUEL = ', où $C$ est un réel quelconque'
F461 = coef('p', 'x^3') + terme('q', 'x^2') + terme('c', 'x')
E461 = coef('3*p', 'x^2') + terme('2*q', 'x') + terme('c', '')
V461_POLY = variation(
    'On considère l\'équation différentielle $(E) : y\'=' + E461 + '$ sur $' + R
    + '$.\n\nQuelles sont les solutions de cette équation ?\n\n'
    + choix('les fonctions $x\\mapsto ' + F461 + '+C$' + QUEL,
            'la seule fonction $x\\mapsto ' + F461 + '$',
            'les fonctions $x\\mapsto ' + coef('6*p', 'x') + terme('2*q', '') + '+C$' + QUEL,
            'les fonctions $x\\mapsto ' + coef('3*p', 'x^3') + terme('2*q', 'x^2') + terme('c', 'x') + '+C$'
            + QUEL),
    [var('p', '1..3;±'), var('q', '1..3;±'), var('c', '1..5;±')], ['0'],
    ['Les solutions de $y\'=f$ sont les **primitives** de $f$ : on ne dérive pas, on cherche $F$ telle '
     'que $F\'=f$.',
     'Une primitive de $x\\mapsto ' + E461 + '$ est $F(x)=' + F461 + '$ (on divise '
     'par le nouvel exposant).',
     'Les solutions sont ' + colm('\\text{les fonctions } x\\mapsto ' + F461 + '+C') + ', $C\\in' + R
     + '$ : il y en a une infinité, qui diffèrent d\'une constante.'])

# k : 0 → a/x sur ]0 ; +∞[, 1 → a cos x, 2 → a sin x, 3 → a/x² sur ]0 ; +∞[
F_REF = par_k(['\\dfrac{{{a}}}{x}', '{{a}}\\cos x', '{{a}}\\sin x', '\\dfrac{{{a}}}{x^2}'])
PRIM_REF = par_k(['{{a}}\\ln x', '{{a}}\\sin x', '-{{a}}\\cos x', '-\\dfrac{{{a}}}{x}'])
DERIV_REF = par_k(['-\\dfrac{{{a}}}{x^2}', '-{{a}}\\sin x', '{{a}}\\cos x', '-\\dfrac{{{eval:2*a}}}{x^3}'])
I_REF = par_k([RP, R, R, RP])
V461_REF = variation(
    'On considère l\'équation différentielle $(E) : y\'=' + F_REF + '$ sur $' + I_REF
    + '$.\n\nQuelles sont les solutions de cette équation ?\n\n'
    + choix('les fonctions $x\\mapsto ' + PRIM_REF + '+C$' + QUEL,
            'la seule fonction $x\\mapsto ' + PRIM_REF + '$',
            'les fonctions $x\\mapsto ' + DERIV_REF + '+C$' + QUEL,
            'les fonctions $x\\mapsto ' + F_REF + '+C$' + QUEL),
    [var('k', '0..3'), var('a', '2..5')], ['0'],
    ['Les solutions de $y\'=f$ sur un intervalle sont les **primitives** de $f$ sur cet intervalle.',
     'Une primitive de $x\\mapsto ' + F_REF + '$ sur $' + I_REF + '$ est $x\\mapsto ' + PRIM_REF + '$ : sa '
     'dérivée redonne bien $' + F_REF + '$.',
     'Les solutions sont ' + colm('\\text{les fonctions } x\\mapsto ' + PRIM_REF + '+C') + ', $C\\in' + R
     + '$.'])

MODELES.append(modele(
    '1-resoudre-y-prime-egal-f', 'Résoudre l\'équation y′ = f',
    'Les solutions de y′ = f sont les primitives de f, à une constante près (pièges : une seule solution, '
    'la dérivée au lieu d\'une primitive, exposant non divisé, f elle-même)',
    PRIM, 'Primitives', 'Notion de primitive', 3,
    [V461_POLY, V461_REF],
    [spec('v0 : F + C', 0, {'p': 1, 'q': -2, 'c': 3}, '0', 'correct'),
     spec('v0 : une seule solution', 0, {'p': 1, 'q': -2, 'c': 3}, '1', 'incorrect'),
     spec('v0 : dérivée', 0, {'p': 1, 'q': -2, 'c': 3}, '2', 'incorrect'),
     spec('v0 : exposant non divisé', 0, {'p': 1, 'q': -2, 'c': 3}, '3', 'incorrect'),
     spec('v1 : a ln x + C', 1, {'k': 0, 'a': 3}, '0', 'correct'),
     spec('v1 : −a cos x + C', 1, {'k': 2, 'a': 3}, '0', 'correct'),
     spec('v1 : f + C', 1, {'k': 1, 'a': 3}, '3', 'incorrect')]))

# --- 2. TSPE-462 : F est-elle une primitive de f ? --------------------------------------------

OUI_NON = choix(si('s==0', 'Oui', 'Non'), si('s==0', 'Non', 'Oui'))
U462 = coef('a', 'x') + terme('b', '')
F462_PROD = '(' + U462 + ')e^{x}'
FP462_PROD = '(' + coef('a', 'x') + terme('a+b', '') + ')e^{x}'
AEX = coef('a', 'e^{x}')
V462_PRODUIT = variation(
    'Sur $' + R + '$, on donne $F(x)=' + F462_PROD + '$ et $f(x)=' + si('s==0', FP462_PROD, AEX)
    + '$.\n\n$F$ est-elle une primitive de $f$ sur $' + R + '$ ?\n\n' + OUI_NON,
    [var('a', '1..3;±'), var('b', '1..4;±'), var('s', '0..1')], ['0'],
    ['$F$ est une primitive de $f$ si $F\'=f$ : on **dérive** $F$, pas besoin de chercher une primitive.',
     'Dérivée d\'un produit $uv$ avec $u(x)=' + U462 + '$ et $v(x)=e^{x}$ : $F\'(x)=' + AEX + '+'
     + F462_PROD + '=' + FP462_PROD + '$.',
     si('s==0', '$F\'=f$ : ' + colm('\\text{oui}') + ', $F$ est une primitive de $f$.',
        '$F\'(x)\\neq ' + AEX + '$ : ' + colm('\\text{non}') + ' (la dérivée d\'un produit n\'est pas le '
        'produit des dérivées).')],
    ['a+b != 0'])

V462_LN = variation(
    'Sur $' + RP + '$, on donne $F(x)=x\\ln x-x$ et $f(x)=' + si('s==0', '\\ln x', '\\dfrac{1}{x}-1')
    + '$.\n\n$F$ est-elle une primitive de $f$ sur $' + RP + '$ ?\n\n' + OUI_NON,
    [var('s', '0..1')], ['0'],
    ['On dérive $F$ : $(x\\ln x)\'=1\\times\\ln x+x\\times\\dfrac{1}{x}=\\ln x+1$.',
     'Donc $F\'(x)=\\ln x+1-1=\\ln x$.',
     si('s==0', '$F\'=f$ : ' + colm('\\text{oui}') + ', $F$ est une primitive de $f$.',
        '$F\'(x)=\\ln x\\neq\\dfrac{1}{x}-1$ : ' + colm('\\text{non}') + '.')])

V462_COMPOSEE = variation(
    'Sur $' + R + '$, on donne $F(x)=\\ln(x^2+{{c}})$ et $f(x)='
    + si('s==0', '\\dfrac{2x}{x^2+{{c}}}', '\\dfrac{1}{x^2+{{c}}}')
    + '$.\n\n$F$ est-elle une primitive de $f$ sur $' + R + '$ ?\n\n' + OUI_NON,
    [var('c', '1..5'), var('s', '0..1')], ['0'],
    ['$x^2+{{c}}>0$ sur $' + R + '$ ; la dérivée de $\\ln u$ est $\\dfrac{u\'}{u}$, avec $u(x)=x^2+{{c}}$ et '
     '$u\'(x)=2x$.',
     'Donc $F\'(x)=\\dfrac{2x}{x^2+{{c}}}$.',
     si('s==0', '$F\'=f$ : ' + colm('\\text{oui}') + ', $F$ est une primitive de $f$.',
        '$F\'(x)\\neq\\dfrac{1}{x^2+{{c}}}$ : ' + colm('\\text{non}') + ' (le facteur $u\'(x)=2x$ manque).')])

MODELES.append(modele(
    '2-f-primitive-de-f', 'F est-elle une primitive de f ?',
    'Vérifier qu\'une fonction donnée est une primitive en la dérivant : produit par eˣ, x ln x − x, '
    'ln(x² + c) (pièges : dérivée d\'un produit, facteur u′ oublié)',
    PRIM, 'Primitives', 'Notion de primitive', 2,
    [V462_PRODUIT, V462_LN, V462_COMPOSEE],
    [spec('v0 : oui', 0, {'a': 2, 'b': 1, 's': 0}, '0', 'correct'),
     spec('v0 : non', 0, {'a': 2, 'b': 1, 's': 1}, '0', 'correct'),
     spec('v0 : oui à tort', 0, {'a': 2, 'b': 1, 's': 1}, '1', 'incorrect'),
     spec('v1 : oui', 1, {'s': 0}, '0', 'correct'),
     spec('v1 : non à tort', 1, {'s': 0}, '1', 'incorrect'),
     spec('v2 : non', 2, {'c': 3, 's': 1}, '0', 'correct'),
     spec('v2 : oui à tort', 2, {'c': 3, 's': 1}, '1', 'incorrect')]))

# --- 3. TSPE-478 : existence de primitives ----------------------------------------------------

F478 = par_k(['e^{-x^2}', '\\sqrt{x^3+1}', '\\dfrac{e^{x}}{x}'])
I478 = par_k([R, '\\left[0\\,;+\\infty\\right[', RP])
V478_ADMET = variation(
    'La fonction $f : x\\mapsto ' + F478 + '$ est continue sur $I=' + I478 + '$. On ne sait pas écrire '
    'une de ses primitives à l\'aide des fonctions usuelles.\n\nQue peut-on affirmer ?\n\n'
    + choix('$f$ admet des primitives sur $I$',
            '$f$ n\'admet pas de primitive sur $I$, puisqu\'on ne sait pas l\'écrire',
            '$f$ admet une seule primitive sur $I$',
            '$f$ admet des primitives sur $I$ seulement si elle est dérivable sur $I$'),
    [var('k', '0..2')], ['0'],
    ['Théorème : ' + colm('\\text{toute fonction continue sur un intervalle admet des primitives}')
     + ' sur cet intervalle.',
     '$f$ est continue sur $I$ : elle a des primitives, même si on ne sait pas les écrire avec les '
     'fonctions usuelles.',
     'Elle en a même une infinité : deux primitives diffèrent d\'une constante.'])

V478_LAQUELLE = variation(
    'Laquelle de ces fonctions admet des primitives sur l\'intervalle $\\left[-1\\,;1\\right]$, d\'après le '
    'théorème du cours ?\n\n'
    + choix('$x\\mapsto\\dfrac{1}{x^2+{{c}}}$', '$x\\mapsto\\dfrac{1}{x}$', '$x\\mapsto\\ln x$',
            '$x\\mapsto\\dfrac{1}{2x-1}$'),
    [var('c', '1..5')], ['0'],
    ['Le théorème s\'applique aux fonctions **continues sur tout l\'intervalle** $\\left[-1\\,;1\\right]$.',
     '$x\\mapsto\\dfrac{1}{x}$ n\'est pas définie en $0$, $\\ln$ n\'est pas définie sur '
     '$\\left[-1\\,;0\\right]$, $x\\mapsto\\dfrac{1}{2x-1}$ n\'est pas définie en $\\dfrac{1}{2}$.',
     '$x^2+{{c}}>0$ : ' + colm('x\\mapsto\\dfrac{1}{x^2+{{c}}}') + ' est continue sur '
     '$\\left[-1\\,;1\\right]$, elle admet des primitives.'])

MODELES.append(modele(
    '3-existence-primitives', 'Existence de primitives d\'une fonction continue',
    'Toute fonction continue sur un intervalle admet des primitives, même sans expression explicite '
    '(pièges : pas de formule donc pas de primitive, une seule primitive, fonction non définie sur '
    'l\'intervalle)',
    PRIM, 'Primitives', 'Notion de primitive', 4,
    [V478_ADMET, V478_LAQUELLE],
    [spec('v0 : admet des primitives', 0, {'k': 0}, '0', 'correct'),
     spec('v0 : pas de formule', 0, {'k': 0}, '1', 'incorrect'),
     spec('v0 : une seule', 0, {'k': 2}, '2', 'incorrect'),
     spec('v1 : 1/(x² + c)', 1, {'c': 2}, '0', 'correct'),
     spec('v1 : 1/x', 1, {'c': 2}, '1', 'incorrect')]))

# --- 4. TSPE-480 : linéarité de l'intégrale ---------------------------------------------------

INTRO480 = ('$f$ et $g$ sont deux fonctions continues sur $\\left[{{a}}\\,;{{b}}\\right]$. On sait que $'
            + integrale('{{a}}', '{{b}}', 'f(x)') + '={{p}}$')
V480_COMBI = variation(
    INTRO480 + ' et $' + integrale('{{a}}', '{{b}}', 'g(x)') + '={{q}}$.\n\nCalcule $'
    + integrale('{{a}}', '{{b}}', '\\left({{k}}f(x)' + terme('m', 'g(x)') + '\\right)') + '$.\n\n$?$',
    [var('a', '-2..1'), var('b', '2..5'), var('p', '1..6;±'), var('q', '1..6;±'), var('k', '2..4'),
     var('m', '1..3;±')], ['{{eval:k*p+m*q}}'],
    ['Linéarité : $' + integrale('{{a}}', '{{b}}', '\\left({{k}}f(x)' + terme('m', 'g(x)') + '\\right)')
     + '={{k}}' + integrale('{{a}}', '{{b}}', 'f(x)') + si('m>0', '+', '') + coef('m', integrale('{{a}}', '{{b}}', 'g(x)'))
     + '$.',
     'Donc l\'intégrale vaut ${{k}}\\times({{p}})' + si('m>0', '+', '') + '{{m}}\\times({{q}})=' + col('{{eval:k*p+m*q}}') + '$.'])

V480_DIFF = variation(
    INTRO480 + ' et $' + integrale('{{a}}', '{{b}}', '\\left(f(x)+g(x)\\right)') + '={{t}}$.\n\nCalcule $'
    + integrale('{{a}}', '{{b}}', 'g(x)') + '$.\n\n$?$',
    [var('a', '-2..1'), var('b', '2..5'), var('p', '1..6;±'), var('t', '1..8;±')], ['{{eval:t-p}}'],
    ['Linéarité : $' + integrale('{{a}}', '{{b}}', '\\left(f(x)+g(x)\\right)') + '='
     + integrale('{{a}}', '{{b}}', 'f(x)') + '+' + integrale('{{a}}', '{{b}}', 'g(x)') + '$.',
     'Donc ${{t}}={{p}}+' + integrale('{{a}}', '{{b}}', 'g(x)') + '$, d\'où $'
     + integrale('{{a}}', '{{b}}', 'g(x)') + '={{t}}-({{p}})=' + col('{{eval:t-p}}') + '$.'],
    ['t != p'])

V480_CONSTANTE = variation(
    '$f$ est une fonction continue sur $\\left[{{a}}\\,;{{b}}\\right]$ telle que $'
    + integrale('{{a}}', '{{b}}', 'f(x)') + '={{p}}$.\n\nCalcule $'
    + integrale('{{a}}', '{{b}}', '\\left({{k}}f(x)' + terme('c', '') + '\\right)') + '$.\n\n$?$',
    [var('a', '-1..1'), var('b', '2..4'), var('p', '1..6;±'), var('k', '2..4'), var('c', '1..5;±')],
    ['{{eval:k*p+c*(b-a)}}'],
    ['Linéarité : $' + integrale('{{a}}', '{{b}}', '\\left({{k}}f(x)' + terme('c', '') + '\\right)') + '={{k}}'
     + integrale('{{a}}', '{{b}}', 'f(x)') + '+' + integrale('{{a}}', '{{b}}', '({{c}})') + '$.',
     'L\'intégrale de la constante ${{c}}$ sur $\\left[{{a}}\\,;{{b}}\\right]$ vaut ${{c}}\\times({{b}}-({{a}}))'
     '={{eval:c*(b-a)}}$ (aire algébrique d\'un rectangle), et non ${{c}}$.',
     'Total : ${{k}}\\times({{p}})+({{eval:c*(b-a)}})=' + col('{{eval:k*p+c*(b-a)}}') + '$.'])

MODELES.append(modele(
    '4-linearite-integrale', 'Linéarité de l\'intégrale',
    'Calculer avec la linéarité : combinaison αf + βg, déduire ∫g de ∫(f + g), constante ajoutée '
    '(piège : ∫c = c au lieu de c(b − a))',
    INTEG, 'Propriétés de l\'intégrale', 'Linéarité', 1,
    [V480_COMBI, V480_DIFF, V480_CONSTANTE],
    [spec('v0 : 2·3 + (−1)·4 = 2', 0, {'a': 0, 'b': 3, 'p': 3, 'q': 4, 'k': 2, 'm': -1}, '2', 'correct'),
     spec('v0 : coefficient de g oublié', 0, {'a': 0, 'b': 3, 'p': 3, 'q': 4, 'k': 2, 'm': -1}, '10',
          'incorrect'),
     spec('v1 : 5 − 2 = 3', 1, {'a': 0, 'b': 3, 'p': 2, 't': 5}, '3', 'correct'),
     spec('v1 : somme au lieu de différence', 1, {'a': 0, 'b': 3, 'p': 2, 't': 5}, '7', 'incorrect'),
     spec('v2 : 2·3 + 4·3 = 18', 2, {'a': 0, 'b': 3, 'p': 3, 'k': 2, 'c': 4}, '18', 'correct'),
     spec('v2 : ∫c = c', 2, {'a': 0, 'b': 3, 'p': 3, 'k': 2, 'c': 4}, '10', 'incorrect')]))

# --- 5. TSPE-485 : estimer graphiquement une intégrale ----------------------------------------

AIRE_INTRO = ('On a représenté ci-dessous la courbe $\\mathcal{C}_f$ d\'une fonction $f$ continue et '
              'positive sur $\\left[0\\,;4\\right]$ ; le domaine sous la courbe est colorié.\n\n')


def courbe_aire(expr, ymax, gy, description):
    return ('```courbe\nx: -0.5 ; 4.5\ny: -' + gy + ' ; ' + ymax + '\ngrille: 1 ; ' + gy + '\nf(x) = '
            + expr + ' sur [0 ; 4]   bleu   nom=C_f\naire: f ; 0 ; 4\ntaille: moyenne\ndescription: '
            + description + '\n```')


EXPR485 = par_k(['0.25*x^2+1', '4-0.25*x^2', '6/(x+1)'])
EXACT485 = par_k(['\\dfrac{28}{3}\\approx 9{,}3', '\\dfrac{32}{3}\\approx 10{,}7', '6\\ln 5\\approx 9{,}7'])
V485_CARREAU = variation(
    AIRE_INTRO
    + courbe_aire(EXPR485, '6.5', '1',
                  'Courbe positive sur [0 ; 4] au-dessus d\'un quadrillage d\'un carreau par unité, aire '
                  'sous la courbe coloriée.')
    + '\n\nParmi ces valeurs, laquelle est la meilleure estimation de $' + integrale('0', '4', 'f(x)')
    + '$ ?\n\n'
    + choix('$' + par_k(['9', '11', '10']) + '$', '$' + par_k(['4', '6', '5']) + '$',
            '$' + par_k(['14', '16', '15']) + '$', '$' + par_k(['20', '21', '24']) + '$'),
    [var('k', '0..2')], ['0'],
    ['$f$ est positive : $' + integrale('0', '4', 'f(x)') + '$ est l\'**aire** du domaine colorié, en '
     'unités d\'aire.',
     'Ici un carreau mesure $1\\times 1$ : une unité d\'aire. On compte les carreaux entiers, puis on '
     'regroupe les morceaux de carreaux coupés par la courbe.',
     'On trouve environ $' + col(par_k(['9', '11', '10'])) + '$ carreaux. (Valeur exacte : $' + EXACT485
     + '$.)'])

EXPR485_2 = par_k(['0.5*x^2+2', '8-0.5*x^2', '12/(x+1)'])
EXACT485_2 = par_k(['\\dfrac{56}{3}\\approx 18{,}7', '\\dfrac{64}{3}\\approx 21{,}3',
                    '12\\ln 5\\approx 19{,}3'])
N485_2 = par_k(['19', '21', '19'])
V485_DEUX = variation(
    AIRE_INTRO
    + courbe_aire(EXPR485_2, '13', '2',
                  'Courbe positive sur [0 ; 4] ; le quadrillage a un pas de 1 en abscisse et de 2 en '
                  'ordonnée ; aire sous la courbe coloriée.')
    + '\n\nRegarde bien les graduations. Parmi ces valeurs, laquelle est la meilleure estimation de $'
    + integrale('0', '4', 'f(x)') + '$ ?\n\n'
    + choix('$' + N485_2 + '$', '$' + par_k(['9', '11', '10']) + '$', '$' + par_k(['27', '29', '27']) + '$',
            '$' + par_k(['40', '32', '48']) + '$'),
    [var('k', '0..2')], ['0'],
    ['$f$ est positive : $' + integrale('0', '4', 'f(x)') + '$ est l\'aire du domaine colorié, en unités '
     'd\'aire.',
     'Attention : un carreau mesure $1$ en abscisse et $2$ en ordonnée, soit $2$ unités d\'aire.',
     'On compte environ $' + par_k(['9{,}5', '10{,}5', '9{,}5']) + '$ carreaux, donc environ $'
     + col(N485_2) + '$ unités d\'aire. (Valeur exacte : $' + EXACT485_2 + '$.)'])

MODELES.append(modele(
    '5-estimer-integrale', 'Estimer graphiquement une intégrale',
    'Estimer l\'intégrale d\'une fonction positive en comptant les carreaux sous la courbe (pièges : '
    'carreau de 2 unités d\'aire, rectangle de hauteur maximale)',
    INTEG, 'Intégrale et aire', 'Lecture graphique', 2,
    [V485_CARREAU, V485_DEUX],
    [spec('v0 : 9', 0, {'k': 0}, '0', 'correct'),
     spec('v0 : rectangle de hauteur max', 0, {'k': 0}, '3', 'incorrect'),
     spec('v1 : 21', 1, {'k': 1}, '0', 'correct'),
     spec('v1 : carreaux comptés pour 1', 1, {'k': 1}, '1', 'incorrect')]))

# --- 6. TSPE-486 : estimer graphiquement une valeur moyenne -----------------------------------

EXPR486 = par_k(['0.375*x^2+1', '6-0.375*x^2', '0.75*(x-2)^2+1'])
MU486 = par_k(['3', '4', '2'])
I486 = par_k(['12', '16', '8'])
V486 = variation(
    'On a représenté ci-dessous la courbe $\\mathcal{C}_f$ d\'une fonction $f$ continue sur '
    '$\\left[0\\,;4\\right]$ ; le domaine sous la courbe est colorié.\n\n'
    + courbe_aire(EXPR486, '7.5', '1',
                  'Courbe positive sur [0 ; 4] au-dessus d\'un quadrillage d\'un carreau par unité, aire '
                  'sous la courbe coloriée.')
    + '\n\nParmi ces valeurs, laquelle est la meilleure estimation de la valeur moyenne de $f$ sur '
      '$\\left[0\\,;4\\right]$ ?\n\n'
    + choix('$' + MU486 + '$', '$' + par_k(['4', '3', '4']) + '$', '$' + par_k(['7', '6', '1']) + '$',
            '$' + I486 + '$'),
    [var('k', '0..2')], ['0'],
    ['La valeur moyenne de $f$ sur $\\left[0\\,;4\\right]$ est $\\mu=\\dfrac{1}{4-0}'
     + integrale('0', '4', 'f(x)') + '$.',
     'On estime l\'intégrale en comptant les carreaux sous la courbe : environ $' + I486 + '$ carreaux.',
     'Donc $\\mu\\approx\\dfrac{' + I486 + '}{4}=' + col(MU486) + '$ : le rectangle de base '
     '$\\left[0\\,;4\\right]$ et de hauteur $\\mu$ a la même aire que le domaine colorié. (Ce n\'est ni '
     'la moyenne de $f(0)$ et $f(4)$, ni une valeur extrême de $f$.)'])

MODELES.append(modele(
    '6-estimer-valeur-moyenne', 'Estimer graphiquement une valeur moyenne',
    'Estimer la valeur moyenne d\'une fonction en comptant les carreaux sous la courbe puis en divisant '
    'par la longueur (pièges : moyenne de f(a) et f(b), extremum, intégrale non divisée)',
    INTEG, 'Valeur moyenne', 'Lecture graphique', 1,
    [V486],
    [spec('k = 0 : 3', 0, {'k': 0}, '0', 'correct'),
     spec('k = 0 : (f(0) + f(4))/2', 0, {'k': 0}, '1', 'incorrect'),
     spec('k = 1 : intégrale non divisée', 0, {'k': 1}, '3', 'incorrect'),
     spec('k = 2 : 2', 0, {'k': 2}, '0', 'correct')]))

# --- 7. TSPE-489 : majorer une intégrale par une autre fonction -------------------------------

V489_EXP = variation(
    'Pour tout $x$ de $\\left[0\\,;1\\right]$, on admet que $0\\leqslant x^{{{n}}}e^{x}\\leqslant e\\,x^{{{n}}}$.'
    '\n\nOn note $I=' + integrale('0', '1', 'x^{{{n}}}e^{x}') + '$. Complète le majorant de $I$ que l\'on '
    'en déduit.\n\n$I\\leqslant ?$',
    [var('n', '2..6')], ['\\dfrac{e}{{{eval:n+1}}}'],
    ['On intègre l\'inégalité sur $\\left[0\\,;1\\right]$ (bornes dans le bon ordre) : $I\\leqslant'
     + integrale('0', '1', 'e\\,x^{{{n}}}') + '$.',
     '$' + integrale('0', '1', 'e\\,x^{{{n}}}') + '=e\\left[\\dfrac{x^{{{eval:n+1}}}}{{{eval:n+1}}}\\right]_0^1'
     '=\\dfrac{e}{{{eval:n+1}}}$.',
     'Donc $I\\leqslant' + col('\\dfrac{e}{{{eval:n+1}}}') + '$.'])

V489_LN = variation(
    'Pour tout $x\\geqslant 0$, on admet que $\\ln(1+x)\\leqslant x$.\n\nOn note $I='
    + integrale('0', '{{b}}', '\\ln(1+x)') + '$. Complète le majorant de $I$ que l\'on en déduit.'
    '\n\n$I\\leqslant ?$',
    [var('b', '2|4|6')], ['{{eval:b^2/2}}'],
    ['On intègre l\'inégalité sur $\\left[0\\,;{{b}}\\right]$ : $I\\leqslant' + integrale('0', '{{b}}', 'x')
     + '$.',
     '$' + integrale('0', '{{b}}', 'x') + '=\\left[\\dfrac{x^2}{2}\\right]_0^{{{b}}}=\\dfrac{{{eval:b^2}}}{2}$.',
     'Donc $I\\leqslant' + col('{{eval:b^2/2}}') + '$.'])

V489_MINORER = variation(
    'Pour tout réel $x$, on admet que $e^{-x^2}\\geqslant 1-x^2$.\n\nOn note $I='
    + integrale('0', '1', 'e^{-x^2}') + '$. Complète le minorant de $I$ que l\'on en déduit.'
    '\n\n$?\\leqslant I$',
    None, ['\\dfrac{2}{3}'],
    ['On intègre l\'inégalité sur $\\left[0\\,;1\\right]$ : $I\\geqslant' + integrale('0', '1', '(1-x^2)')
     + '$.',
     '$' + integrale('0', '1', '(1-x^2)') + '=\\left[x-\\dfrac{x^3}{3}\\right]_0^1=1-\\dfrac{1}{3}'
     '=\\dfrac{2}{3}$.',
     'Donc $' + col('\\dfrac{2}{3}') + '\\leqslant I$ (on ne sait pas calculer $I$, mais on l\'a minorée).'])

MODELES.append(modele(
    '7-majorer-integrale-par-fonction', 'Majorer une intégrale par une autre fonction',
    'Intégrer une inégalité f ⩽ g pour majorer ou minorer une intégrale qu\'on ne sait pas calculer : '
    'xⁿeˣ ⩽ e·xⁿ, ln(1 + x) ⩽ x, e^(−x²) ⩾ 1 − x² (pièges : majorant non intégré, borne oubliée)',
    INTEG, 'Propriétés de l\'intégrale', 'Positivité et inégalités', 3,
    [V489_EXP, V489_LN, V489_MINORER],
    [spec('v0 : e/4', 0, {'n': 3}, '\\dfrac{e}{4}', 'correct'),
     spec('v0 : e', 0, {'n': 3}, 'e', 'incorrect'),
     spec('v0 : 1/4', 0, {'n': 3}, '\\dfrac{1}{4}', 'incorrect'),
     spec('v0 : e/3', 0, {'n': 3}, '\\dfrac{e}{3}', 'incorrect'),
     spec('v1 : 8', 1, {'b': 4}, '8', 'correct'),
     spec('v1 : b', 1, {'b': 4}, '4', 'incorrect'),
     spec('v1 : b²', 1, {'b': 4}, '16', 'incorrect'),
     spec('v2 : 2/3', 2, {}, '\\dfrac{2}{3}', 'correct'),
     spec('v2 : 1', 2, {}, '1', 'incorrect')]))

# --- 8. TSPE-491 : suite d'intégrales ---------------------------------------------------------

V491_CALCUL = variation(
    'Pour tout entier naturel $n$, on pose $I_n=' + integrale('0', '1', 'x^n') + '$.\n\nCalcule $I_{{{k}}}$.'
    '\n\n$I_{{{k}}}=?$',
    [var('k', '2..9')], ['\\dfrac{1}{{{eval:k+1}}}'],
    ['Une primitive de $x\\mapsto x^{{{k}}}$ est $x\\mapsto\\dfrac{x^{{{eval:k+1}}}}{{{eval:k+1}}}$.',
     '$I_{{{k}}}=\\left[\\dfrac{x^{{{eval:k+1}}}}{{{eval:k+1}}}\\right]_0^1=\\dfrac{1}{{{eval:k+1}}}-0='
     + col('\\dfrac{1}{{{eval:k+1}}}') + '$.'])

G491 = par_k(['\\dfrac{x^n}{1+x}', 'x^n e^{-x}'])
V491_SENS = variation(
    'Pour tout entier naturel $n$, on pose $I_n=' + integrale('0', '1', G491)
    + '$.\n\nQuel est le sens de variation de la suite $(I_n)$ ?\n\n'
    + choix('$(I_n)$ est décroissante', '$(I_n)$ est croissante', '$(I_n)$ est constante',
            'On ne peut pas le savoir sans calculer $I_n$'),
    [var('k', '0..1')], ['0'],
    ['On compare $I_{n+1}$ et $I_n$ sans les calculer : $I_{n+1}-I_n=' + integrale('0', '1', par_k([
        '\\dfrac{x^n(x-1)}{1+x}', 'x^n(x-1)e^{-x}'])) + '$ (linéarité).',
     'Sur $\\left[0\\,;1\\right]$, $x^n\\geqslant 0$, $x-1\\leqslant 0$ et ' + par_k(['$1+x>0$', '$e^{-x}>0$'])
     + ' : la fonction intégrée est négative, et les bornes sont dans le bon ordre.',
     'Donc $I_{n+1}-I_n\\leqslant 0$ : $(I_n)$ est ' + colm('\\text{décroissante}') + '.'])

def par_m(valeurs):
    """Une valeur par cas de m = 1, 2, 3…"""
    return ''.join('{{if:m==' + str(i + 1) + '|' + v + '}}' for i, v in enumerate(valeurs))


I491_REC = par_m(['1', 'e-2', '6-2e'])
V491_REC_EXP = variation(
    'Pour tout entier naturel $n$, on pose $I_n=' + integrale('0', '1', 'x^n e^{x}') + '$. On admet que '
    '$I_0=e-1$ et que, pour tout $n$, $I_{n+1}=e-(n+1)I_n$.\n\nCalcule la valeur exacte de $I_{{{m}}}$.'
    '\n\n$I_{{{m}}}=?$',
    [var('m', '1..3')], [I491_REC],
    ['On applique la relation de proche en proche, à partir de $I_0=e-1$.',
     '$I_1=e-1\\times I_0=e-(e-1)=1$'
     + par_m(['.', ' ; $I_2=e-2\\times I_1=e-2$.',
              ' ; $I_2=e-2\\times I_1=e-2$ ; $I_3=e-3\\times I_2=e-3(e-2)=6-2e$.']),
     '$I_{{{m}}}=' + col(I491_REC) + '$.'])

J491_REC = par_m(['1-\\ln 2', '\\ln 2-\\dfrac{1}{2}'])
V491_REC_LN = variation(
    'Pour tout entier naturel $n$, on pose $J_n=' + integrale('0', '1', '\\dfrac{x^n}{1+x}')
    + '$. On admet que $J_0=\\ln 2$ et que, pour tout $n$, $J_n+J_{n+1}=\\dfrac{1}{n+1}$.\n\nCalcule la '
    'valeur exacte de $J_{{{m}}}$.\n\n$J_{{{m}}}=?$',
    [var('m', '1..2')], [J491_REC],
    ['Avec $n=0$ : $J_0+J_1=1$, donc $J_1=1-\\ln 2$.'
     + par_m(['', ' Avec $n=1$ : $J_1+J_2=\\dfrac{1}{2}$, donc $J_2=\\dfrac{1}{2}-(1-\\ln 2)'
              '=\\ln 2-\\dfrac{1}{2}$.']),
     '$J_{{{m}}}=' + col(J491_REC) + '$.'])

MODELES.append(modele(
    '8-suite-integrales', 'Suite d\'intégrales',
    'Suites définies par une intégrale : calculer Iₙ = ∫₀¹ xⁿ, sens de variation par comparaison des '
    'fonctions intégrées, termes par une relation de récurrence (pièges : 1/n, signe de x − 1)',
    INTEG, 'Calcul intégral', 'Suites d\'intégrales', 1,
    [V491_CALCUL, V491_SENS, V491_REC_EXP, V491_REC_LN],
    [spec('v0 : I₃ = 1/4', 0, {'k': 3}, '\\dfrac{1}{4}', 'correct'),
     spec('v0 : 1/3', 0, {'k': 3}, '\\dfrac{1}{3}', 'incorrect'),
     spec('v1 : décroissante', 1, {'k': 0}, '0', 'correct'),
     spec('v1 : croissante', 1, {'k': 1}, '1', 'incorrect'),
     spec('v2 : I₁ = 1', 2, {'m': 1}, '1', 'correct'),
     spec('v2 : I₂ = e − 2', 2, {'m': 2}, 'e-2', 'correct'),
     spec('v2 : I₂ = 2 − e', 2, {'m': 2}, '2-e', 'incorrect'),
     spec('v2 : I₃ = 6 − 2e', 2, {'m': 3}, '6-2e', 'correct'),
     spec('v2 : I₃ = e − 6', 2, {'m': 3}, 'e-6', 'incorrect'),
     spec('v3 : J₁ = 1 − ln 2', 3, {'m': 1}, '1-\\ln 2', 'correct'),
     spec('v3 : J₁ = ln 2 − 1', 3, {'m': 1}, '\\ln 2-1', 'incorrect'),
     spec('v3 : J₂ = ln 2 − 1/2', 3, {'m': 2}, '\\ln 2-\\dfrac{1}{2}', 'correct')]))

# --- 9. TSPE-465 : allure des solutions de y′ = ay --------------------------------------------

SA = si('s>0', '>', '<')
SA_ = si('s>0', '<', '>')
SC = si('C>0', '>', '<')
SC_ = si('C>0', '<', '>')
V465_COURBE = variation(
    'Soit $a$ un réel non nul. La courbe $\\mathcal{C}_f$ ci-dessous représente une solution $f$, sur $' + R
    + '$, de l\'équation différentielle $y\'=ay$.\n\n'
    '```courbe\nx: -3 ; 3\ny: -8 ; 8\ngrille: 1 ; 2\nf(x) = {{C}}*exp({{s}}*{{h}}*x/2)   bleu   nom=C_f\n'
    'taille: moyenne\ndescription: Courbe d\'une fonction exponentielle, qui tend vers 0 d\'un côté et '
    's\'éloigne de l\'axe des abscisses de l\'autre.\n```\n\nQue peut-on dire du signe de $a$ et de celui '
    'de $f(0)$ ?\n\n'
    + choix('$a' + SA + '0$ et $f(0)' + SC + '0$', '$a' + SA_ + '0$ et $f(0)' + SC + '0$',
            '$a' + SA + '0$ et $f(0)' + SC_ + '0$', '$a' + SA_ + '0$ et $f(0)' + SC_ + '0$'),
    [var('s', '-1|1'), var('h', '1..2'), var('C', '1..3;±')], ['0'],
    ['Les solutions de $y\'=ay$ sont les fonctions $f(x)=Ce^{ax}$, avec $C=f(0)$.',
     '$f(0)$ est l\'ordonnée du point d\'abscisse $0$ : on lit $f(0)={{C}}$, donc $f(0)' + SC + '0$.',
     'La courbe tend vers $0$ en ' + si('s>0', '$-\\infty$', '$+\\infty$') + ' : $e^{ax}$ tend vers $0$ en '
     + si('s>0', '$-\\infty$', '$+\\infty$') + ' quand ' + si('s>0', '$a>0$', '$a<0$') + '. Donc $'
     + col('a' + SA + '0 \\text{ et } f(0)' + SC + '0') + '$.'])

# Allure : croissante si a·y0 > 0 ; limite en +∞ : 0 si a < 0, signe de y0 fois ∞ si a > 0
SENS = si('a*y0>0', 'croissante', 'décroissante')
SENS_ = si('a*y0>0', 'décroissante', 'croissante')
LIM = '{{if:a<0|0}}{{if:a>0 && y0>0|+\\infty}}{{if:a>0 && y0<0|-\\infty}}'
LIM_ = '{{if:a>0|0}}{{if:a<0 && y0>0|+\\infty}}{{if:a<0 && y0<0|-\\infty}}'
EAX = 'e^{' + coef('a', 'x') + '}'
V465_ALLURE = variation(
    'Soit $f$ la solution sur $' + R + '$ de l\'équation différentielle $y\'=' + coef('a', 'y') + '$ telle que '
    '$f(0)={{y0}}$.\n\nQuelle phrase décrit l\'allure de la courbe de $f$ ?\n\n'
    + choix('$f$ est ' + SENS + ' sur $' + R + '$ et tend vers $' + LIM + '$ en $+\\infty$',
            '$f$ est ' + SENS_ + ' sur $' + R + '$ et tend vers $' + LIM + '$ en $+\\infty$',
            '$f$ est ' + SENS + ' sur $' + R + '$ et tend vers $' + LIM_ + '$ en $+\\infty$',
            '$f$ est ' + SENS_ + ' sur $' + R + '$ et tend vers $' + LIM_ + '$ en $+\\infty$'),
    [var('a', '1..3;±'), var('y0', '1..4;±')], ['0'],
    ['$f(x)=' + coef('y0', EAX) + '$ et $f\'(x)=' + coef('a*y0', EAX) + '$ : comme $' + EAX + '>0$, $f\'$ a '
     'le signe de ${{eval:a*y0}}$, ' + si('a*y0>0', 'positif', 'négatif') + ' : $f$ est ' + SENS + '.',
     si('a<0', 'Comme $a<0$, $e^{ax}$ tend vers $0$ en $+\\infty$, donc $f$ aussi.',
        'Comme $a>0$, $e^{ax}$ tend vers $+\\infty$ en $+\\infty$ ; $f(0)$ donne le signe de la limite.'),
     '$f$ est ' + colm('\\text{' + SENS + '}') + ' et tend vers $' + col(LIM) + '$ en $+\\infty$.'])

MODELES.append(modele(
    '9-allure-solutions-y-prime-egal-ay', 'Allure des solutions de y′ = ay',
    'Solutions Ce^(ax) de y′ = ay : lire le signe de a et de f(0) sur la courbe, décrire l\'allure '
    'connaissant a et f(0) (pièges : signe de a confondu avec le sens de variation, limite en +∞)',
    PRIM, 'Équations différentielles', 'Allure des courbes', 1,
    [V465_COURBE, V465_ALLURE],
    [spec('v0 : a > 0, f(0) > 0', 0, {'s': 1, 'h': 2, 'C': 2}, '0', 'correct'),
     spec('v0 : signe de a inversé', 0, {'s': 1, 'h': 2, 'C': -2}, '1', 'incorrect'),
     spec('v1 : a < 0, y0 > 0', 1, {'a': -2, 'y0': 3}, '0', 'correct'),
     spec('v1 : a > 0, y0 < 0', 1, {'a': 2, 'y0': -3}, '0', 'correct'),
     spec('v1 : sens inversé', 1, {'a': 2, 'y0': -3}, '1', 'incorrect')]))

os.makedirs(DOSSIER, exist_ok=True)
for nom, m in MODELES:
    with open(os.path.join(DOSSIER, nom + '.json'), 'w', encoding='utf-8') as f:
        json.dump(m, f, ensure_ascii=False, indent='\t')
        f.write('\n')
# Mis en forme comme le pre-commit, pour que le script redonne les fichiers commités
subprocess.run(['pnpm', 'exec', 'prettier', '--write', DOSSIER], check=True,
               stdout=subprocess.DEVNULL)
print(f'{len(MODELES)} modèles écrits dans {DOSSIER}')
