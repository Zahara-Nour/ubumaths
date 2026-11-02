"""Écrit les 6 modèles du lot 7 « logique, dénombrement, suites : restes » de la terminale
spécialité dans scripts/questions/tspe-7-restes/.

Phase 0 validée par David le 2026-11-02 (« je valide », journal
« docs/wip/questions-tspe-restes-progress.md »), un point par modèle :

| # | Point    | Titre                                                 | Catégorie, niveau                                              |
| 1 | TSPE-302 | Nier une proposition à deux quantificateurs           | Logique › Quantificateurs et négation › négation, 3            |
| 2 | TSPE-303 | Raisonner par équivalence                             | Logique › Raisonnements › par équivalence, 1                   |
| 3 | TSPE-310 | Factorielle : calculer, simplifier                    | Dénombrement › Arrangements et permutations › factorielle, 1   |
| 4 | TSPE-569 | Suite croissante non majorée : limite                 | Suites › Limites de suites › définition, 5                     |
| 5 | TSPE-386 | Récurrence sur une suite uₙ₊₁ = f(uₙ), f croissante   | Suites › Raisonnement par récurrence › structure, 3            |
| 6 | TSPE-387 | Évolution en pourcentage avec apport constant         | Suites › Modèles d'évolution › pourcentages, 1                 |

Décisions : niveau `T_SPE` seul ; ∀ et ∃ jamais écrits (borne de 302) ; M5 sans suite affine
(618d795c en a déjà une) ; M6 sous « pourcentages », la limite chiffrée reste à 81ff485d.

    python3 docs/wip/questions/lot-tspe-restes.py scripts/questions/tspe-7-restes
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


def variation(statement, variables, answers, steps, conditions=None):
    v = {'statement': statement, 'blanks': [{'expectedAnswer': a} for a in answers],
         'correction': {'steps': steps}}
    if variables:
        v['variables'] = variables
    if conditions:
        v['conditions'] = conditions
    return v


def col(x):
    return '\\textcolor{{{color:primary.0}}}{' + x + '}'


def colm(x):
    """Couleur dans le texte : la formule colorée entre $…$."""
    return '$' + col(x) + '$'


def si(cond, alors, sinon):
    return '{{if:' + cond + '|' + alors + '|' + sinon + '}}'


def par_k(valeurs, nom='k'):
    """Une valeur par cas de la variable k (ifs à plat, jamais imbriqués)."""
    return ''.join('{{if:' + nom + '==' + str(i) + '|' + v + '}}' for i, v in enumerate(valeurs))


def coef(E, m):
    """Premier terme E·m : 1·m → m, −1·m → −m."""
    return ('{{if:' + E + '==1|' + m + '}}{{if:' + E + '==-1|-' + m + '}}{{if:' + E + '!=1 && ' + E
            + '!=-1|{{eval:' + E + '}}' + m + '}}')


def choix(*items):
    """Bloc choix ; le PREMIER item est la bonne réponse (index 0)."""
    return '```choix\n' + '\n'.join('- ' + i for i in items) + '\n```'


MODELES = []

# --- 1. TSPE-302 : nier une proposition à deux quantificateurs ------------------------------

# r : 0 → >, 1 → ⩾, 2 → <, 3 → ⩽ ; la négation est la relation complémentaire
REL = par_k(['>', '\\geqslant ', '< ', '\\leqslant '], 'r')
NON_REL = par_k(['\\leqslant ', '< ', '\\geqslant ', '>'], 'r')
NIER = ('Pour nier une proposition, on **change chaque quantificateur** (« pour tout » devient « il '
        'existe », et inversement), **dans le même ordre**, puis on **nie la propriété** finale.')
NEG_REL = ('La négation de « $>$ » est « $\\leqslant$ », celle de « $\\geqslant$ » est « $<$ » (et '
           'inversement).')

V302_XY = variation(
    'Quelle est la négation de la proposition « pour tout réel $x$, il existe un réel $y$ tel que '
    '$x+y' + REL + '{{c}}$ » ?\n\n'
    + choix('Il existe un réel $x$ tel que, pour tout réel $y$, $x+y' + NON_REL + '{{c}}$.',
            'Pour tout réel $x$, il existe un réel $y$ tel que $x+y' + NON_REL + '{{c}}$.',
            'Il existe un réel $x$ tel que, pour tout réel $y$, $x+y' + REL + '{{c}}$.',
            'Il existe un réel $y$ tel que, pour tout réel $x$, $x+y' + NON_REL + '{{c}}$.'),
    [var('r', '0..3'), var('c', '-9..9')], ['0'],
    [NIER,
     '« Pour tout réel $x$, il existe un réel $y$ » devient « il existe un réel $x$ tel que, pour tout '
     'réel $y$ » : $x$ reste en premier.',
     NEG_REL,
     'La négation est : « il existe un réel $x$ tel que, pour tout réel $y$, '
     + colm('x+y' + NON_REL + '{{c}}') + ' ».'])

# s : 0 → majorée (⩽ M), 1 → minorée (⩾ M)
BORNE = si('s==0', '\\leqslant ', '\\geqslant ')
NON_BORNE = si('s==0', '>', '< ')
FAUX_BORNE = si('s==0', '\\geqslant ', '\\leqslant ')
V302_MAJOREE = variation(
    'Dire que la suite $(u_n)$ est ' + si('s==0', 'majorée', 'minorée') + ', c\'est dire : « il existe un '
    'réel $M$ tel que, pour tout entier naturel $n$, $u_n' + BORNE + 'M$ ».\n\n'
    'Quelle est la négation de cette proposition ?\n\n'
    + choix('Pour tout réel $M$, il existe un entier naturel $n$ tel que $u_n' + NON_BORNE + 'M$.',
            'Il existe un réel $M$ tel que, pour tout entier naturel $n$, $u_n' + NON_BORNE + 'M$.',
            'Pour tout réel $M$, il existe un entier naturel $n$ tel que $u_n' + FAUX_BORNE + 'M$.',
            'Pour tout réel $M$, il existe un entier naturel $n$ tel que $u_n' + BORNE + 'M$.'),
    [var('s', '0..1')], ['0'],
    [NIER,
     '« Il existe un réel $M$ tel que, pour tout entier naturel $n$ » devient « pour tout réel $M$, il '
     'existe un entier naturel $n$ tel que ».',
     'La négation de $u_n' + BORNE + 'M$ est $u_n' + NON_BORNE + 'M$ (inégalité **stricte**).',
     'La négation est : « pour tout réel $M$, il existe un entier naturel $n$ tel que '
     + colm('u_n' + NON_BORNE + 'M') + ' » : la suite n\'est pas ' + si('s==0', 'majorée', 'minorée') + '.'])

V302_RANG = variation(
    'Quelle est la négation de la proposition « il existe un entier naturel $N$ tel que, pour tout '
    'entier $n\\geqslant N$, $u_n' + REL + '{{c}}$ » ?\n\n'
    + choix('Pour tout entier naturel $N$, il existe un entier $n\\geqslant N$ tel que $u_n' + NON_REL
            + '{{c}}$.',
            'Pour tout entier naturel $N$, il existe un entier $n< N$ tel que $u_n' + NON_REL + '{{c}}$.',
            'Pour tout entier naturel $N$ et pour tout entier $n\\geqslant N$, $u_n' + NON_REL + '{{c}}$.',
            'Il existe un entier naturel $N$ tel que, pour tout entier $n\\geqslant N$, $u_n' + NON_REL
            + '{{c}}$.'),
    [var('r', '0..3'), var('c', '-9..9')], ['0'],
    [NIER,
     '« Il existe $N$ » devient « pour tout $N$ », et « pour tout entier $n\\geqslant N$ » devient « il '
     'existe un entier $n\\geqslant N$ » : la condition $n\\geqslant N$ décrit **où** on cherche $n$, '
     'on ne la nie pas.',
     NEG_REL,
     'La négation est : « pour tout entier naturel $N$, il existe un entier $n\\geqslant N$ tel que '
     + colm('u_n' + NON_REL + '{{c}}') + ' ».'])

MODELES.append(modele(
    '1-nier-deux-quantificateurs', 'Nier une proposition à deux quantificateurs',
    'Négation d\'une proposition à deux quantificateurs, écrits en mots (pièges : un seul quantificateur '
    'changé, propriété non niée, ordre inversé, inégalité large, condition n ⩾ N niée)',
    'Logique', 'Quantificateurs et négation', 'Négation d\'une proposition', 3,
    [V302_XY, V302_MAJOREE, V302_RANG],
    [spec('v0 : il existe x, pour tout y, non R', 0, {'r': 0, 'c': 3}, '0', 'correct'),
     spec('v0 : propriété seule niée', 0, {'r': 0, 'c': 3}, '1', 'incorrect'),
     spec('v0 : propriété non niée', 0, {'r': 0, 'c': 3}, '2', 'incorrect'),
     spec('v0 : ordre inversé', 0, {'r': 0, 'c': 3}, '3', 'incorrect'),
     spec('v1 : non majorée', 1, {'s': 0}, '0', 'correct'),
     spec('v1 : inégalité large', 1, {'s': 0}, '2', 'incorrect'),
     spec('v2 : il existe n ⩾ N', 2, {'r': 1, 'c': -2}, '0', 'correct'),
     spec('v2 : n < N', 2, {'r': 1, 'c': -2}, '1', 'incorrect')]))

# --- 2. TSPE-303 : raisonner par équivalence -------------------------------------------------

EQ = '$P\\iff Q$ : les deux propositions sont équivalentes'
PQ = '$P\\implies Q$, mais la réciproque est fausse'
QP = '$Q\\implies P$, mais la réciproque est fausse'
AUCUN = 'Aucune des deux implications n\'est vraie'
# k : 0 → x = a / x² = a² (P ⇒ Q) ; 1 → eˣ = eᵃ / x = a (⇔) ; 2 → x² = ax / x = a (Q ⇒ P) ;
#     3 → x > a / x² > a² (P ⇒ Q) ; 4 → ln x < ln a / 0 < x < a (⇔)
P303 = par_k(['x={{a}}', 'e^{x}=e^{{{a}}}', 'x^2={{a}}x', 'x>{{a}}', '\\ln x<\\ln {{a}}'])
Q303 = par_k(['x^2={{eval:a*a}}', 'x={{a}}', 'x={{a}}', 'x^2>{{eval:a*a}}', '0<x<{{a}}'])
BON = par_k([PQ, EQ, QP, PQ, EQ])
FAUX1 = par_k([EQ, PQ, EQ, EQ, PQ])
FAUX2 = par_k([QP, QP, PQ, QP, QP])
V303_LIEN = variation(
    'Pour un réel $x$' + par_k(['', '', '', '', ' strictement positif']) + ', on considère les '
    'propositions $P$ : « $' + P303 + '$ » et $Q$ : « $' + Q303 + '$ ».\n\nQuel lien logique y a-t-il '
    'entre $P$ et $Q$ ?\n\n' + choix(BON, FAUX1, FAUX2, AUCUN),
    [var('k', '0..4'), var('a', '2..9')], ['0'],
    ['On teste les deux sens : si $P$ est vraie, $Q$ l\'est-elle ? Et si $Q$ est vraie ?',
     par_k(['Si $x={{a}}$, alors $x^2={{eval:a*a}}$. Mais $x=-{{a}}$ vérifie $Q$ sans vérifier $P$.',
            'La fonction exponentielle est strictement croissante : $e^{x}=e^{{{a}}}$ équivaut à $x={{a}}$.',
            'Si $x={{a}}$, alors $x^2={{eval:a*a}}={{a}}x$. Mais $x=0$ vérifie $P$ sans vérifier $Q$.',
            'Si $x>{{a}}>0$, alors $x^2>{{eval:a*a}}$ (la fonction carré est croissante sur '
            '$\\left[0\\,;+\\infty\\right[$). Mais $x=-{{eval:a+1}}$ vérifie $Q$ sans vérifier $P$.',
            'La fonction $\\ln$ est strictement croissante sur $\\left]0\\,;+\\infty\\right[$ : pour '
            '$x>0$, $\\ln x<\\ln {{a}}$ équivaut à $x<{{a}}$.']),
     'Le lien est donc : ' + par_k([colm('P\\implies Q') + ' seulement', colm('P\\iff Q'),
                                    colm('Q\\implies P') + ' seulement', colm('P\\implies Q') + ' seulement',
                                    colm('P\\iff Q')]) + '.'])

V303_PERDUE = variation(
    par_k(['Pour résoudre l\'équation $x^2={{a}}x$, Lina divise les deux membres par $x$ et trouve '
           '$x={{a}}$.',
           'Pour résoudre l\'équation $x^2={{eval:a*a}}$, Lina écrit « $x^2={{eval:a*a}}\\iff x={{a}}$ » '
           'et trouve $x={{a}}$.'])
    + '\n\nUne étape n\'est pas une équivalence : Lina a perdu une solution. Laquelle ?\n\n$x=?$',
    [var('k', '0..1'), var('a', '2..9')], [par_k(['0', '-{{a}}'])],
    [par_k(['Diviser par $x$ n\'est possible que si $x\\neq0$ : ce n\'est pas une équivalence quand '
            '$x$ peut valoir $0$.',
            '$x^2={{eval:a*a}}$ donne $x={{a}}$ **ou** $x=-{{a}}$ : « $x^2={{eval:a*a}}\\iff x={{a}}$ » est '
            'faux.']),
     par_k(['Par équivalence : $x^2={{a}}x\\iff x(x-{{a}})=0\\iff x=0$ ou $x={{a}}$.',
            'Par équivalence : $x^2={{eval:a*a}}\\iff x={{a}}$ ou $x=-{{a}}$.']),
     'La solution perdue est $x=' + col(par_k(['0', '-{{a}}'])) + '$.'])

# k : 0 → géométrique de raison q, 1 → arithmétique de raison r
V303_CARACT = variation(
    'Pour démontrer que la suite $(v_n)$ est ' + par_k(['géométrique de raison ${{q}}$',
                                                       'arithmétique de raison ${{q}}$'])
    + ', il suffit de démontrer que :\n\n'
    + choix(par_k(['pour tout entier naturel $n$, $v_{n+1}={{q}}v_n$',
                   'pour tout entier naturel $n$, $v_{n+1}-v_n={{q}}$']),
            par_k(['$v_1={{q}}v_0$', '$v_1-v_0={{q}}$']),
            par_k(['$v_1={{q}}v_0$ et $v_2={{q}}v_1$', '$v_1-v_0={{q}}$ et $v_2-v_1={{q}}$']),
            par_k(['pour tout entier naturel $n$, $v_{n+1}-v_n={{q}}$',
                   'pour tout entier naturel $n$, $v_{n+1}={{q}}v_n$'])),
    [var('k', '0..1'), var('q', '2..9')], ['0'],
    [par_k(['Propriété caractéristique : $(v_n)$ est géométrique de raison $q$ **si et seulement si**, '
            'pour tout entier naturel $n$, $v_{n+1}=qv_n$.',
            'Propriété caractéristique : $(v_n)$ est arithmétique de raison $r$ **si et seulement si**, '
            'pour tout entier naturel $n$, $v_{n+1}-v_n=r$.']),
     'Vérifier la relation sur les premiers termes ne suffit pas : elle doit être vraie **pour tout** $n$.',
     'Il suffit donc de démontrer : ' + par_k([colm('v_{n+1}={{q}}v_n'), colm('v_{n+1}-v_n={{q}}')])
     + ' pour tout entier naturel $n$.'])

MODELES.append(modele(
    '2-raisonner-par-equivalence', 'Raisonner par équivalence',
    'Équivalence ou implication seule entre deux propositions, solution perdue par une étape non '
    'équivalente, propriété caractéristique d\'une suite (pièges : diviser par x, x² = a² ⇔ x = a, '
    'vérifier sur les premiers termes)',
    'Logique', 'Raisonnements', 'Par équivalence', 1,
    [V303_LIEN, V303_PERDUE, V303_CARACT],
    [spec('v0 : x = a ⇒ x² = a²', 0, {'k': 0, 'a': 3}, '0', 'correct'),
     spec('v0 : équivalence', 0, {'k': 0, 'a': 3}, '1', 'incorrect'),
     spec('v0 : x² = ax ⇐ x = a', 0, {'k': 2, 'a': 3}, '0', 'correct'),
     spec('v0 : ln, équivalence', 0, {'k': 4, 'a': 3}, '0', 'correct'),
     spec('v1 : 0 perdue', 1, {'k': 0, 'a': 5}, '0', 'correct'),
     spec('v1 : a', 1, {'k': 0, 'a': 5}, '5', 'incorrect'),
     spec('v1 : −a perdue', 1, {'k': 1, 'a': 5}, '-5', 'correct'),
     spec('v1 : a au lieu de −a', 1, {'k': 1, 'a': 5}, '5', 'incorrect'),
     spec('v2 : pour tout n', 2, {'k': 0, 'q': 3}, '0', 'correct'),
     spec('v2 : premiers termes', 2, {'k': 0, 'q': 3}, '2', 'incorrect')]))

# --- 3. TSPE-310 : factorielle -------------------------------------------------------------

FACT = {3: 6, 4: 24, 5: 120, 6: 720, 7: 5040, 8: 40320, 9: 362880}


def fact(nom, decalage=0):
    """(nom + decalage)! par cas de nom ({{eval:…}} ne lit pas un {{if:…}} imbriqué)."""
    return ''.join('{{if:' + nom + '==' + str(n) + '|' + str(FACT[n + decalage]) + '}}'
                   for n in FACT if n + decalage in FACT)


def produit(nom):
    """1 × 2 × … × n écrit en entier."""
    return ''.join('{{if:' + nom + '==' + str(n) + '|' + '\\times '.join(str(i) for i in range(1, n + 1))
                   + '}}' for n in FACT)


V310_CALCUL = variation(
    'Calcule ${{n}}!$.\n\n$?$',
    [var('n', '3..7')], [fact('n')],
    ['Par définition, $n!\\,=1\\times2\\times\\cdots\\times n$ (produit des entiers de $1$ à $n$).',
     '${{n}}!\\,=' + produit('n') + '=' + col(fact('n')) + '$.'])

V310_SUIVANT = variation(
    'On donne ${{n}}!\\,=' + fact('n') + '$. Calcule ${{eval:n+1}}!$ sans tout recalculer.\n\n$?$',
    [var('n', '6..8')], [fact('n', 1)],
    ['Pour tout entier naturel $n$, $(n+1)!\\,=(n+1)\\times n!$.',
     '${{eval:n+1}}!\\,={{eval:n+1}}\\times{{n}}!\\,={{eval:n+1}}\\times' + fact('n') + '='
     + col(fact('n', 1)) + '$.'])

V310_QUOTIENT = variation(
    'Calcule $\\dfrac{{{eval:n+2}}!}{{{n}}!}$.\n\n$?$',
    [var('n', '5..15')], ['{{eval:(n+1)*(n+2)}}'],
    ['${{eval:n+2}}!\\,={{eval:n+2}}\\times{{eval:n+1}}\\times{{n}}!$ : on simplifie par ${{n}}!$.',
     '$\\dfrac{{{eval:n+2}}!}{{{n}}!}\\,={{eval:n+2}}\\times{{eval:n+1}}=' + col('{{eval:(n+1)*(n+2)}}') + '$.'])

V310_ZERO = variation(
    'Combien vaut $0!$ ?\n\n$?$',
    None, ['1'],
    ['Par convention, $0!\\,=1$.',
     'Cette convention rend vraie $(n+1)!\\,=(n+1)\\times n!$ dès $n=0$ : $1!\\,=1\\times0!\\,=1$. Donc $0!\\,='
     + col('1') + '$.'])

MODELES.append(modele(
    '3-factorielle', 'Factorielle : calculer, simplifier',
    'Définition de n! : calculer n!, (n+1)! à partir de n!, (n+2)!/n!, 0! (pièges : 0! = 0, '
    '(n+2)!/n! = 2)',
    'Dénombrement', 'Arrangements et permutations', 'Factorielle', 1,
    [V310_CALCUL, V310_SUIVANT, V310_QUOTIENT, V310_ZERO],
    [spec('v0 : 5! = 120', 0, {'n': 5}, '120', 'correct'),
     spec('v0 : 5! = 15 (somme)', 0, {'n': 5}, '15', 'incorrect'),
     spec('v1 : 7! = 5040', 1, {'n': 6}, '5040', 'correct'),
     spec('v1 : 7! = 721', 1, {'n': 6}, '721', 'incorrect'),
     spec('v2 : 8!/6! = 56', 2, {'n': 6}, '56', 'correct'),
     spec('v2 : 2', 2, {'n': 6}, '2', 'incorrect'),
     spec('v3 : 1', 3, {}, '1', 'correct'),
     spec('v3 : 0', 3, {}, '0', 'incorrect')]))

# --- 4. TSPE-569 : suite croissante non majorée --------------------------------------------

PLUS = '$(u_n)$ tend vers $+\\infty$'
MOINS = '$(u_n)$ tend vers $-\\infty$'
CONV = '$(u_n)$ converge vers un réel'
RIEN = 'On ne peut pas conclure sur la limite'
# k : 0 → croissante non majorée (+∞), 1 → décroissante non minorée (−∞),
#     2 → non majorée seule (rien), 3 → croissante seule (rien)
V569_PROPRIETES = variation(
    'On sait seulement que la suite $(u_n)$ est '
    + par_k(['croissante et non majorée', 'décroissante et non minorée', 'non majorée', 'croissante'])
    + '.\n\nQue peut-on en déduire ?\n\n'
    + choix(par_k([PLUS, MOINS, RIEN, RIEN]), par_k([CONV, CONV, PLUS, PLUS]),
            par_k([RIEN, RIEN, CONV, CONV]), par_k([MOINS, PLUS, MOINS, MOINS])),
    [var('k', '0..3')], ['0'],
    [par_k(['Théorème : une suite **croissante et non majorée** tend vers $+\\infty$.',
            'Théorème : une suite **décroissante et non minorée** tend vers $-\\infty$.',
            'Sans monotonie, « non majorée » ne suffit pas : $u_n=(-1)^n n$ n\'est pas majorée, et '
            'n\'a pas de limite.',
            'Une suite croissante peut tendre vers $+\\infty$ ($u_n=n$) ou converger ($u_n=-\\dfrac{1}{n+1}$) '
            ': il manque « majorée » ou « non majorée ».']),
     'Conclusion : ' + par_k([colm('\\lim u_n=+\\infty'), colm('\\lim u_n=-\\infty'),
                             colm('\\text{on ne peut pas conclure}'),
                             colm('\\text{on ne peut pas conclure}')]) + '.'])

V569_ECART = variation(
    'La suite $(u_n)$ vérifie, pour tout entier naturel $n$, $u_{n+1}-u_n\\geqslant{{eval:c/2;d}}$.\n\n'
    'Que peut-on en déduire ?\n\n'
    + choix(PLUS, CONV, '$(u_n)$ est majorée par $u_0+{{eval:c/2;d}}$', RIEN),
    [var('c', '1..6')], ['0'],
    ['$u_{n+1}-u_n\\geqslant{{eval:c/2;d}}>0$ : la suite est **croissante**.',
     'En ajoutant ces inégalités de $0$ à $n-1$ : $u_n\\geqslant u_0+{{eval:c/2;d}}n$, qui dépasse tout '
     'réel quand $n$ grandit : la suite n\'est **pas majorée**.',
     'Croissante et non majorée : ' + colm('(u_n)\\text{ tend vers }+\\infty') + '.'])

V569_CONTRE = variation(
    'Une suite non majorée tend-elle forcément vers $+\\infty$ ?\n\n'
    + choix('Non : par exemple $u_n=' + par_k(['(-1)^n n', 'n\\left(1+(-1)^n\\right)']) + '$',
            'Oui : c\'est un théorème du cours',
            'Non : par exemple $u_n=' + par_k(['n^2', '2n']) + '$',
            'Non : par exemple $u_n=\\dfrac{1}{n+1}$'),
    [var('k', '0..1')], ['0'],
    ['Le théorème demande **deux** hypothèses : croissante **et** non majorée.',
     par_k(['$u_n=(-1)^n n$ prend les valeurs $0,-1,2,-3,4,\\dots$ : elle n\'est pas majorée, mais ses '
            'termes impairs tendent vers $-\\infty$.',
            '$u_n=n\\left(1+(-1)^n\\right)$ prend les valeurs $0,0,4,0,8,\\dots$ : elle n\'est pas majorée, '
            'mais elle revient à $0$ une fois sur deux.']),
     'Réponse : ' + colm('\\text{non}') + ', elle n\'a pas de limite. ($n^2$ et $2n$ tendent vers '
     '$+\\infty$ ; $\\dfrac{1}{n+1}$ est majorée.)'])

MODELES.append(modele(
    '4-croissante-non-majoree', 'Suite croissante non majorée : limite',
    'Une suite croissante non majorée tend vers +∞ : conclure à partir des propriétés, écart minoré par '
    'une constante positive, contre-exemple (pièges : non majorée seule, croissante seule)',
    'Suites', 'Limites de suites', 'Définition de la limite', 5,
    [V569_PROPRIETES, V569_ECART, V569_CONTRE],
    [spec('v0 : +∞', 0, {'k': 0}, '0', 'correct'),
     spec('v0 : converge', 0, {'k': 0}, '1', 'incorrect'),
     spec('v0 : non majorée seule', 0, {'k': 2}, '0', 'correct'),
     spec('v0 : non majorée → +∞', 0, {'k': 2}, '1', 'incorrect'),
     spec('v1 : +∞', 1, {'c': 1}, '0', 'correct'),
     spec('v1 : on ne peut pas conclure', 1, {'c': 1}, '3', 'incorrect'),
     spec('v2 : (−1)ⁿ n', 2, {'k': 0}, '0', 'correct'),
     spec('v2 : oui', 2, {'k': 0}, '1', 'incorrect')]))

# --- 5. TSPE-386 : récurrence sur une suite ------------------------------------------------

V386_ENCADREMENT = variation(
    'La suite $(u_n)$ est définie par $u_0=1$ et $u_{n+1}=f(u_n)$, où $f(x)=\\dfrac{{{p}}x}{x+1}$. '
    'La fonction $f$ est croissante sur $\\left[0\\,;+\\infty\\right[$.\n\n'
    'On démontre par récurrence que, pour tout entier naturel $n$, $1\\leqslant u_n\\leqslant{{eval:p-1}}$.\n\n'
    'Hérédité : on suppose $1\\leqslant u_k\\leqslant{{eval:p-1}}$. Comme $f$ est croissante, '
    '$f(1)\\leqslant u_{k+1}\\leqslant f({{eval:p-1}})$.\n\nCalcule $f(1)$ et $f({{eval:p-1}})$.\n\n'
    '$f(1)=?$ et $f({{eval:p-1}})=?$',
    [var('p', '3..9')], ['{{eval:p/2}}', '{{eval:p-1}}'],
    ['$f(1)=\\dfrac{{{p}}\\times1}{1+1}=' + col('{{eval:p/2;d}}') + '$ et '
     '$f({{eval:p-1}})=\\dfrac{{{p}}\\times{{eval:p-1}}}{{{p}}}=' + col('{{eval:p-1}}') + '$.',
     'Donc ${{eval:p/2;d}}\\leqslant u_{k+1}\\leqslant{{eval:p-1}}$, et comme ${{eval:p/2;d}}\\geqslant1$ : '
     '$1\\leqslant u_{k+1}\\leqslant{{eval:p-1}}$. La propriété est héréditaire.',
     'Initialisation : $u_0=1$ vérifie $1\\leqslant u_0\\leqslant{{eval:p-1}}$ ; la propriété est vraie '
     'pour tout $n$.'])

V386_MONOTONIE = variation(
    'La suite $(u_n)$ est définie par $u_0=0$ et $u_{n+1}=\\sqrt{u_n+{{c}}}$. Ses termes sont positifs.\n\n'
    'On démontre par récurrence que, pour tout entier naturel $n$, $u_n\\leqslant u_{n+1}$. On suppose '
    '$u_k\\leqslant u_{k+1}$ pour un entier $k$.\n\nQuelle rédaction prouve l\'hérédité ?\n\n'
    + choix('$x\\mapsto\\sqrt{x+{{c}}}$ est croissante sur $\\left[0\\,;+\\infty\\right[$, donc '
            '$\\sqrt{u_k+{{c}}}\\leqslant\\sqrt{u_{k+1}+{{c}}}$, c\'est-à-dire $u_{k+1}\\leqslant u_{k+2}$',
            '$u_1=\\sqrt{{{c}}}\\geqslant u_0$, donc $u_{k+1}\\leqslant u_{k+2}$',
            'On suppose $u_{k+1}\\leqslant u_{k+2}$, donc $\\sqrt{u_k+{{c}}}\\leqslant\\sqrt{u_{k+1}+{{c}}}$, '
            'donc $u_k\\leqslant u_{k+1}$',
            '$u_{k+1}-u_k\\geqslant0$, donc $u_{k+2}-u_{k+1}\\geqslant0$'),
    [var('c', '1..9')], ['0'],
    ['On part de l\'hypothèse $u_k\\leqslant u_{k+1}$ et on applique la fonction croissante '
     '$f : x\\mapsto\\sqrt{x+{{c}}}$, qui **conserve l\'ordre**.',
     '$f(u_k)\\leqslant f(u_{k+1})$, soit ' + colm('u_{k+1}\\leqslant u_{k+2}') + '.',
     'Les autres rédactions vérifient seulement l\'initialisation, partent de la conclusion, ou affirment '
     'le résultat sans le justifier.'])

AK2 = coef('a', 'k^2')
V386_FORMULE = variation(
    'La suite $(u_n)$ est définie par $u_0=0$ et $u_{n+1}=u_n+{{eval:2*a}}n+{{a}}$. On conjecture que, '
    'pour tout entier naturel $n$, $u_n=' + coef('a', 'n^2') + '$.\n\n'
    'Hérédité : on suppose $u_k=' + AK2 + '$ pour un entier $k$. Écris $u_{k+1}$ en fonction de $k$, sous la forme '
    'de la formule au rang $k+1$ (factorisée).\n\n'
    '$u_{k+1}=?$',
    [var('a', '1..4')], [coef('a', '(k+1)^2')],
    ['$u_{k+1}=u_k+{{eval:2*a}}k+{{a}}=' + AK2 + '+{{eval:2*a}}k+{{a}}$.',
     '$' + AK2 + '+{{eval:2*a}}k+{{a}}' + si('a==1', '', '=' + coef('a', '(k^2+2k+1)')) + '=' + col(coef('a', '(k+1)^2'))
     + '$ : c\'est la formule au rang $k+1$.',
     'Avec l\'initialisation $u_0=0$, qui vérifie la formule pour $n=0$, elle est vraie pour tout '
     '$n$.'])

MODELES.append(modele(
    '5-recurrence-suite', 'Récurrence sur une suite définie par une fonction croissante',
    'Hérédité d\'un encadrement et de la monotonie quand u_{n+1} = f(u_n) avec f croissante, hérédité '
    'd\'une formule conjecturée (pièges : vérifier l\'initialisation seule, partir de la conclusion)',
    'Suites', 'Raisonnement par récurrence', 'Structure d\'une récurrence', 3,
    [V386_ENCADREMENT, V386_MONOTONIE, V386_FORMULE],
    [spec('v0 : p/2 et p − 1', 0, {'p': 5}, ['2.5', '4'], 'correct'),
     spec('v0 : f(1) = p', 0, {'p': 5}, ['5', '4'], 'incorrect'),
     spec('v1 : f croissante', 1, {'c': 2}, '0', 'correct'),
     spec('v1 : initialisation seule', 1, {'c': 2}, '1', 'incorrect'),
     spec('v1 : part de la conclusion', 1, {'c': 2}, '2', 'incorrect'),
     spec('v2 : a(k+1)²', 2, {'a': 3}, '3(k+1)^2', 'correct'),
     spec('v2 : développé, forme refusée', 2, {'a': 3}, '3k^2+6k+3', 'bad_form'),
     spec('v2 : 3k² + 3', 2, {'a': 3}, '3k^2+3', 'incorrect'),
     spec('v2 : a = 1', 2, {'a': 1}, '(k+1)^2', 'correct')]))

# --- 6. TSPE-387 : évolution en pourcentage avec apport constant -----------------------------

# k : 0 → abonnés (−p %, +b), 1 → médicament (−p %, +b), 2 → épargne (+p %, +b)
AK = par_k(['{{eval:1-p/100;d}}', '{{eval:1-p/100;d}}', '{{eval:1+p/100;d}}'])
WK = '{{eval:p/100;d}}'
V387_RELATION = variation(
    par_k(['Un club compte ${{eval:100*m}}$ adhérents en 2025. Chaque année, ${{p}}~\\%$ des adhérents ne '
           'renouvellent pas leur adhésion et ${{b}}$ nouveaux adhérents s\'inscrivent. On note $u_n$ le '
           'nombre d\'adhérents en $2025+n$.',
           'Un patient reçoit ${{eval:100*m}}~\\unit{mg}$ d\'un médicament. Chaque heure, son organisme '
           'élimine ${{p}}~\\%$ de la quantité présente, puis on lui injecte ${{b}}~\\unit{mg}$. On note '
           '$u_n$ la quantité (en $\\unit{mg}$) présente au bout de $n$ heures.',
           'Mehdi place ${{eval:100*m}}~\\unit{€}$ à ${{p}}~\\%$ par an (intérêts composés) et ajoute '
           '${{b}}~\\unit{€}$ à la fin de chaque année. On note $u_n$ la somme (en euros) au bout de '
           '$n$ années.'])
    + '\n\nQuelle relation vérifie la suite $(u_n)$ ?\n\n'
    + choix('$u_{n+1}=' + AK + 'u_n+{{b}}$', '$u_{n+1}=' + WK + 'u_n+{{b}}$',
            '$u_{n+1}=' + AK + '(u_n+{{b}})$', '$u_{n+1}=' + AK + 'u_n-{{b}}$'),
    [var('k', '0..2'), var('m', '2..9'), var('p', '2..9'), var('b', '10..90')], ['0'],
    [par_k(['Perdre ${{p}}~\\%$, c\'est multiplier par $1-\\dfrac{{{p}}}{100}=' + AK + '$ ; on ajoute '
            'ensuite les ${{b}}$ nouveaux.',
            'Éliminer ${{p}}~\\%$, c\'est multiplier par $1-\\dfrac{{{p}}}{100}=' + AK + '$ ; l\'injection '
            'vient **après** : on ajoute ${{b}}$ au résultat.',
            'Augmenter de ${{p}}~\\%$, c\'est multiplier par $1+\\dfrac{{{p}}}{100}=' + AK + '$ ; on ajoute '
            'ensuite les ${{b}}~\\unit{€}$ versés.']),
     'Donc ' + colm('u_{n+1}=' + AK + 'u_n+{{b}}') + '.',
     par_k(['Multiplier par $' + WK + '$ donnerait seulement les ${{p}}~\\%$ perdus, pas ce qui reste.',
            'Multiplier par $' + WK + '$ donnerait seulement les ${{p}}~\\%$ éliminés, pas ce qui reste.',
            'Multiplier par $' + WK + '$ donnerait seulement les intérêts, sans la somme placée.'])])

A1 = '{{eval:1-p/100;d}}'
U1 = '{{eval:100*m*(1-p/100)+b}}'
U2 = '{{eval:(100*m*(1-p/100)+b)*(1-p/100)+b}}'
U2_D = '{{eval:(100*m*(1-p/100)+b)*(1-p/100)+b;d}}'
V387_TERMES = variation(
    'Une citerne contient ${{eval:100*m}}~\\unit{m^3}$ d\'eau. Chaque semaine, ${{p}}~\\%$ de l\'eau est '
    'consommée, puis on la remplit de ${{b}}~\\unit{m^3}$. On note $u_n$ le volume (en $\\unit{m^3}$) au '
    'bout de $n$ semaines : $u_0={{eval:100*m}}$ et $u_{n+1}=' + A1 + 'u_n+{{b}}$.\n\n'
    'Calcule $u_1$ et $u_2$.\n\n$u_1=?$ et $u_2=?$',
    [var('m', '2..9'), var('p', '10|20|30'), var('b', '10|20|30|40|50|60|70|80|90')], [U1, U2],
    ['$u_1=' + A1 + '\\times{{eval:100*m}}+{{b}}=' + col(U1) + '$.',
     '$u_2=' + A1 + '\\times' + U1 + '+{{b}}=' + col(U2_D) + '$.'])

# k : 0 → a < 1, départ sous l'équilibre ; 1 → a < 1, départ au-dessus ; 2 → a > 1 (épargne)
L387 = '{{eval:100*m}}'
HAUSSE_LIM = 'Elle augmente et se rapproche d\'une valeur limite'
BAISSE_LIM = 'Elle diminue et se rapproche d\'une valeur limite'
HAUSSE_INF = 'Elle augmente sans limite'
BAISSE_NUL = 'Elle diminue jusqu\'à devenir nulle'
V387_LONG_TERME = variation(
    par_k(['Une réserve contient $u_0={{eval:100*m-h}}$ tonnes de grain. Chaque mois, ${{p}}~\\%$ du grain est '
           'vendu, puis on rentre ${{eval:m*p}}$ tonnes : $u_{n+1}={{eval:1-p/100;d}}u_n+{{eval:m*p}}$.',
           'Une réserve contient $u_0={{eval:100*m+h}}$ tonnes de grain. Chaque mois, ${{p}}~\\%$ du grain est '
           'vendu, puis on rentre ${{eval:m*p}}$ tonnes : $u_{n+1}={{eval:1-p/100;d}}u_n+{{eval:m*p}}$.',
           'Un compte rapporte ${{p}}~\\%$ par an et reçoit ${{eval:m*p}}~\\unit{€}$ à la fin de chaque année, '
           'avec $u_0={{eval:100*m}}$ (en euros) : $u_{n+1}={{eval:1+p/100;d}}u_n+{{eval:m*p}}$.'])
    + '\n\nComment évolue cette quantité au fil du temps ?\n\n'
    + choix(par_k([HAUSSE_LIM, BAISSE_LIM, HAUSSE_INF]), par_k([HAUSSE_INF, BAISSE_NUL, HAUSSE_LIM]),
            par_k([BAISSE_LIM, HAUSSE_LIM, BAISSE_LIM]), par_k([BAISSE_NUL, HAUSSE_INF, BAISSE_NUL])),
    [var('k', '0..2'), var('m', '2..9'), var('p', '2..9'), var('h', '20..90')], ['0'],
    [par_k(['La quantité qui ne change plus vérifie $\\ell={{eval:1-p/100;d}}\\ell+{{eval:m*p}}$, soit '
            '$\\ell=' + L387 + '$ : les ventes compensent alors exactement les rentrées.',
            'La quantité qui ne change plus vérifie $\\ell={{eval:1-p/100;d}}\\ell+{{eval:m*p}}$, soit '
            '$\\ell=' + L387 + '$ : les ventes compensent alors exactement les rentrées.',
            'Chaque année, la somme est multipliée par ${{eval:1+p/100;d}}>1$ **et** augmentée de '
            '${{eval:m*p}}~\\unit{€}$ : rien ne la freine.']),
     par_k(['$u_0={{eval:100*m-h}}<' + L387 + '$ : les rentrées dépassent les ventes, la quantité monte '
            'vers $' + L387 + '$ sans l\'atteindre.',
            '$u_0={{eval:100*m+h}}>' + L387 + '$ : les ventes dépassent les rentrées, la quantité descend '
            'vers $' + L387 + '$ sans l\'atteindre.',
            'Elle dépasse donc n\'importe quel montant au bout d\'un nombre suffisant d\'années.']),
     'Réponse : ' + par_k([colm('\\text{elle augmente et se rapproche de }' + L387),
                           colm('\\text{elle diminue et se rapproche de }' + L387),
                           colm('\\text{elle augmente sans limite}')]) + '.'])

MODELES.append(modele(
    '6-evolution-pourcentage-apport', 'Évolution en pourcentage avec apport constant',
    'Modéliser une évolution « p % puis apport constant » par u_{n+1} = a·u_n + b : relation, premiers '
    'termes, évolution à long terme (pièges : multiplier par p/100, apport avant le pourcentage, '
    'stabilisation confondue avec croissance sans limite)',
    'Suites', 'Modèles d\'évolution', 'Pourcentages', 1,
    [V387_RELATION, V387_TERMES, V387_LONG_TERME],
    [spec('v0 : a uₙ + b', 0, {'k': 0, 'm': 5, 'p': 4, 'b': 30}, '0', 'correct'),
     spec('v0 : p/100', 0, {'k': 0, 'm': 5, 'p': 4, 'b': 30}, '1', 'incorrect'),
     spec('v0 : apport avant', 0, {'k': 1, 'm': 5, 'p': 4, 'b': 30}, '2', 'incorrect'),
     spec('v0 : épargne', 0, {'k': 2, 'm': 5, 'p': 4, 'b': 30}, '0', 'correct'),
     spec('v1 : u₁ = 430, u₂ = 374', 1, {'m': 5, 'p': 20, 'b': 30}, ['430', '374'], 'correct'),
     spec('v1 : u₁ = 130 (p/100)', 1, {'m': 5, 'p': 20, 'b': 30}, ['130', '56'], 'incorrect'),
     spec('v1 : p = 30', 1, {'m': 3, 'p': 30, 'b': 10}, ['220', '164'], 'correct'),
     spec('v2 : monte vers ℓ', 2, {'k': 0, 'm': 5, 'p': 4, 'h': 50}, '0', 'correct'),
     spec('v2 : sans limite', 2, {'k': 0, 'm': 5, 'p': 4, 'h': 50}, '1', 'incorrect'),
     spec('v2 : épargne sans limite', 2, {'k': 2, 'm': 5, 'p': 4, 'h': 50}, '0', 'correct')]))

os.makedirs(DOSSIER, exist_ok=True)
for nom, m in MODELES:
    with open(os.path.join(DOSSIER, nom + '.json'), 'w', encoding='utf-8') as f:
        json.dump(m, f, ensure_ascii=False, indent='\t')
        f.write('\n')
# Mis en forme comme le pre-commit, pour que le script redonne les fichiers commités
subprocess.run(['pnpm', 'exec', 'prettier', '--write', DOSSIER], check=True,
               stdout=subprocess.DEVNULL)
print(f'{len(MODELES)} modèles écrits dans {DOSSIER}')
