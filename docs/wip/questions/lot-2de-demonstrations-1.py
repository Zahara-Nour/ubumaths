"""Écrit les 5 modèles du lot 1 « démonstrations : arithmétique, nombres réels, racines » de la
seconde dans scripts/questions/2de-demonstrations-1/.

Phase 0 validée par David le 2026-11-06 (« je valide », D1 du journal
« docs/wip/questions-2de-demonstrations-progress.md », § 2), un point par modèle :

| # | Point | Titre                                              | Sous-notion du point (prod), niveau              |
| 1 | 2-239 | Démontrer que la somme de deux multiples de a…     | Divisibilité › multiples et diviseurs, 11         |
| 2 | 2-240 | Démontrer que le carré d'un nombre impair est…     | Divisibilité › pair ou impair, 3                  |
| 3 | 2-255 | Démontrer que 1/3 n'est pas décimal                | Ensembles de nombres › nombres irrationnels, 5    |
| 4 | 2-256 | Démontrer que √2 est irrationnel                   | Ensembles de nombres › nombres irrationnels, 6    |
| 5 | 2-282 | Démontrer que √(ab) = √a √b                        | Racines carrées : calculs › propriétés, 3         |

Forme (D1, Q2) : la démonstration est écrite, l'élève complète l'étape clé (case) ou choisit la
justification (case choix à 4 propositions, la première est la bonne, l'affichage les mélange) ;
dernière variation « étapes à ranger » (`signe: aucun`), positions calculées par le générateur
(graine 0, `positions-ranger.ts`). Valeur tirée pour 239 (a de 2 à 9), lettres ailleurs (Q3).

Niveaux : après ceux déjà présents sur la sous-notion (relevé prod du 2026-11-06).

    python3 docs/wip/questions/lot-2de-demonstrations-1.py scripts/questions/2de-demonstrations-1
"""
import json
import os
import subprocess
import sys

DOSSIER = sys.argv[1]


def spec(desc, vi, answer, status, variables=None, violations=None):
    expected = {'status': status}
    if status in ('bad_form', 'unoptimal_form'):
        expected['constraintViolations'] = violations or ['form']
    answers = answer if isinstance(answer, list) else [answer]
    return {'description': desc, 'variationIndex': vi,
            'variables': {k: str(v) for k, v in (variables or {}).items()},
            'answers': answers, 'expected': expected}


def modele(nom, title, description, level, variations, specs):
    return nom, {'title': title, 'description': description, 'grades': ['2'],
                 'level': level, 'delay': 90, 'status': 'draft',
                 'shared': {},
                 'variations': variations, 'testSpecs': specs}


def var(nom, expression):
    return {'name': nom, 'expression': expression}


def ev(x):
    return '{{eval:' + x + '}}'


def col(x, k=0):
    return '\\textcolor{{{color:primary.' + str(k) + '}}}{' + x + '}'


def choix(lignes):
    return '\n\n```choix\n' + ''.join('- ' + l + '\n' for l in lignes) + '```'


def case(statement, variables, attendu, steps):
    """Variation à une case ouverte (`?` dans une formule de l'énoncé)."""
    return {'statement': statement, 'variables': variables,
            'blanks': [attendu if isinstance(attendu, dict) else {'expectedAnswer': attendu}],
            'correction': {'steps': steps}}


def justification(statement, variables, bonne, autres, steps):
    """Variation à une case choix : la première proposition est la bonne (index 0)."""
    return {'statement': statement + choix([bonne] + autres), 'variables': variables,
            'blanks': [{'expectedAnswer': '0'}], 'correction': {'steps': steps}}


def ranger(intro, etapes, steps):
    """Variation « étapes à ranger » : étapes données dans le bon ordre."""
    return {'statement': intro + '\n\nRemets les étapes de la démonstration dans l\'ordre.\n\n'
            '```ranger\nsigne: aucun\n' + ''.join('- ' + e + '\n' for e in etapes) + '```',
            'variables': [], 'correction': {'steps': steps}}


def specs_choix(vi, juste, erreurs, variables=None):
    out = [spec(juste, vi, '0', 'correct', variables)]
    for k, erreur in enumerate(erreurs, start=1):
        out.append(spec('Erreur : ' + erreur, vi, str(k), 'incorrect', variables))
    return out


MODELES = []

# --- 1. 2-239 : la somme de deux multiples de a est un multiple de a ---------------------------

A = ev('a')
V_A = [var('a', '2..9')]
VA = {'a': 3}
INTRO_239 = ('Soit $x$ et $y$ deux entiers multiples de $' + A + '$. On démontre que $x+y$ est'
             ' un multiple de $' + A + '$.\n\n')
ECRITURE_239 = ('Comme $x$ et $y$ sont des multiples de $' + A + '$, il existe deux entiers $k$'
                ' et $m$ tels que $x=' + A + 'k$ et $y=' + A + 'm$.\n\n')

V239_ECRIRE = case(
    INTRO_239 + 'Comme $x$ est un multiple de $' + A + '$, il existe un entier $k$ tel que'
    ' $x=' + A + 'k$. Complète de même pour $y$, avec un entier $m$.\n\n$y=?$',
    V_A, A + 'm',
    ['Un multiple de $' + A + '$ est un entier qui s\'écrit $' + A + '\\times$ (un entier).',
     'Donc il existe un entier $m$ tel que $y=' + col(A + 'm') + '$.'])
V239_FACTORISER = case(
    INTRO_239 + ECRITURE_239 + 'On factorise par $' + A + '$. Complète.\n\n'
    '$x+y=' + A + 'k+' + A + 'm=' + A + '\\times(?)$',
    V_A, 'k+m',
    ['$' + A + '$ est un facteur commun aux deux termes $' + A + 'k$ et $' + A + 'm$.',
     'Donc $x+y=' + A + '\\times(' + col('k+m') + ')$.'])
V239_CONCLURE = justification(
    INTRO_239 + ECRITURE_239 + 'On a $x+y=' + A + '(k+m)$. Pourquoi peut-on conclure que $x+y$'
    ' est un multiple de $' + A + '$ ?',
    V_A,
    'Car $k+m$ est un entier.',
    ['Car $k$ et $m$ sont égaux.',
     'Car $' + A + '$ divise $k+m$.',
     'Car $x+y$ est positif.'],
    ['La somme de deux entiers est un entier : $k+m$ est un entier.',
     '$x+y$ s\'écrit donc $' + A + '\\times$ (un entier) : c\'est ' + '**un multiple de $' + A
     + '$**' + '.',
     'Il n\'est pas nécessaire que $k$ et $m$ soient égaux, ni que $' + A + '$ divise $k+m$.'])
V239_RANGER = ranger(
    'Soit $a$ un entier naturel non nul, et $x$, $y$ deux multiples de $a$. On démontre que $x+y$'
    ' est un multiple de $a$.',
    ['Il existe deux entiers $k$ et $m$ tels que $x=ak$ et $y=am$.',
     'Donc $x+y=ak+am$.',
     'On factorise par $a$ : $x+y=a(k+m)$.',
     'Or $k+m$ est un entier, donc $x+y$ est un multiple de $a$.'],
    ['On écrit d\'abord $x$ et $y$ comme multiples de $a$, puis on additionne et on factorise.',
     'Comme $k+m$ est un entier, $' + col('x+y=a(k+m)') + '$ est un multiple de $a$.'])

MODELES.append(modele(
    '01-demontrer-somme-de-deux-multiples', 'Démontrer que la somme de deux multiples de a est un multiple de a',
    'Démonstration à trous (a tiré de 2 à 9) : écrire y = am, factoriser ak + am = a(k + m), justifier'
    ' la conclusion (k + m entier) ; étapes à ranger',
    11,
    [V239_ECRIRE, V239_FACTORISER, V239_CONCLURE, V239_RANGER],
    [spec('3m', 0, '3m', 'correct', VA),
     spec('Erreur : 3k (même entier que x)', 0, '3k', 'incorrect', VA),
     spec('Erreur : m', 0, 'm', 'incorrect', VA),
     spec('Erreur : m + 3', 0, 'm+3', 'incorrect', VA),
     spec('k + m', 1, 'k+m', 'correct', VA),
     spec('Écriture m + k', 1, 'm+k', 'correct', VA),
     spec('Erreur : km', 1, 'km', 'incorrect', VA),
     spec('Erreur : 3k + 3m', 1, '3k+3m', 'incorrect', VA)]
    + specs_choix(2, 'k + m entier', ['k = m', 'a divise k + m', 'x + y positif'], VA)
    + ['RANGER:3']))

# --- 2. 2-240 : le carré d'un nombre impair est impair -----------------------------------------

INTRO_240 = ('Soit $n$ un entier impair. On démontre que $n^2$ est impair.\n\n'
             'Comme $n$ est impair, il existe un entier $k$ tel que $n=2k+1$.\n\n')
DEV_240 = 'On développe : $n^2=(2k+1)^2=4k^2+4k+1$.\n\n'

V240_DEVELOPPER = case(
    INTRO_240 + 'On développe avec l\'identité remarquable $(a+b)^2=a^2+2ab+b^2$. Complète.\n\n'
    '$n^2=(2k+1)^2=4k^2+?+1$',
    [], '4k',
    ['$(2k+1)^2=(2k)^2+2\\times 2k\\times 1+1^2$.',
     'Le double produit vaut $2\\times 2k\\times 1=' + col('4k') + '$, d\'où $n^2=4k^2+4k+1$.'])
V240_FACTORISER = case(
    INTRO_240 + DEV_240 + 'On met $2$ en facteur dans $4k^2+4k$. Complète.\n\n'
    '$n^2=2\\times(?)+1$',
    [], {'expectedAnswer': '2k^2+2k', 'requiredForm': {'pattern': 'u'}},
    ['$4k^2=2\\times 2k^2$ et $4k=2\\times 2k$.',
     'Donc $4k^2+4k=2(2k^2+2k)$ et $n^2=2\\times(' + col('2k^2+2k') + ')+1$.'])
V240_CONCLURE = justification(
    INTRO_240 + DEV_240 + 'On a $n^2=2(2k^2+2k)+1$. Pourquoi peut-on conclure que $n^2$ est'
    ' impair ?',
    [],
    'Car $2k^2+2k$ est un entier, donc $n^2$ s\'écrit $2K+1$ avec $K$ entier.',
    ['Car $4k^2+4k+1$ se termine par le chiffre $1$.',
     'Car $n^2$ est plus grand que $n$.',
     'Car tout carré est impair.'],
    ['$k$ est un entier, donc $K=2k^2+2k$ est un entier.',
     '$n^2=2K+1$ : c\'est la forme d\'un ' + '**nombre impair**' + '.',
     'Un carré n\'est pas toujours impair : $4=2^2$ est pair.'])
V240_RANGER = ranger(
    'Soit $n$ un entier impair. On démontre que $n^2$ est impair.',
    ['Il existe un entier $k$ tel que $n=2k+1$.',
     'Donc $n^2=(2k+1)^2=4k^2+4k+1$.',
     'Donc $n^2=2(2k^2+2k)+1$.',
     'Or $2k^2+2k$ est un entier, donc $n^2$ est impair.'],
    ['On écrit $n$ sous la forme $2k+1$, on développe son carré, puis on met $2$ en facteur.',
     '$' + col('n^2=2(2k^2+2k)+1') + '$ avec $2k^2+2k$ entier : $n^2$ est impair.'])

MODELES.append(modele(
    '02-demontrer-carre-d-un-impair', 'Démontrer que le carré d\'un nombre impair est impair',
    'Démonstration à trous de n = 2k + 1 ⟹ n² impair : double produit 4k, factorisation'
    ' n² = 2(2k² + 2k) + 1, justification de la conclusion ; étapes à ranger',
    3,
    [V240_DEVELOPPER, V240_FACTORISER, V240_CONCLURE, V240_RANGER],
    [spec('4k', 0, '4k', 'correct'),
     spec('Erreur : 2k', 0, '2k', 'incorrect'),
     spec('Erreur : 4k² oublié, 2k + 1', 0, '2k+1', 'incorrect'),
     spec('Erreur : 4', 0, '4', 'incorrect'),
     spec('2k² + 2k', 1, '2k^2+2k', 'correct'),
     spec('Écriture 2k(k + 1)', 1, '2k(k+1)', 'correct'),
     spec('Erreur : 4k² + 4k', 1, '4k^2+4k', 'incorrect'),
     spec('Erreur : k² + k', 1, 'k^2+k', 'incorrect'),
     spec('Erreur : 2k² + 4k', 1, '2k^2+4k', 'incorrect')]
    + specs_choix(2, '2K + 1', ['chiffre des unités', 'n² > n', 'tout carré impair'])
    + ['RANGER:3']))

# --- 3. 2-255 : 1/3 n'est pas décimal ----------------------------------------------------------

INTRO_255 = 'On démontre par l\'absurde que le nombre rationnel $\\dfrac{1}{3}$ n\'est pas décimal.\n\n'
HYP_255 = ('Supposons que $\\dfrac{1}{3}$ soit décimal : il existe un entier $a$ et un entier naturel'
           ' $n$ tels que $\\dfrac{1}{3}=\\dfrac{a}{10^n}$.\n\n')

V255_HYPOTHESE = justification(
    INTRO_255 + 'Que suppose-t-on au début de la démonstration ?',
    [],
    'Que $\\dfrac{1}{3}$ est décimal : $\\dfrac{1}{3}=\\dfrac{a}{10^n}$ avec $a$ entier et $n$'
    ' entier naturel.',
    ['Que $\\dfrac{1}{3}$ n\'est pas décimal.',
     'Que $\\dfrac{1}{3}=0{,}333$.',
     'Que $3$ est un nombre décimal.'],
    ['Dans un raisonnement par l\'absurde, on suppose le **contraire** de ce qu\'on veut'
     ' démontrer.',
     'On veut démontrer que $\\dfrac{1}{3}$ n\'est pas décimal : on suppose donc qu\'il l\'est,'
     ' c\'est-à-dire que $' + col('\\dfrac{1}{3}=\\dfrac{a}{10^n}') + '$.',
     '$0{,}333$ n\'est qu\'une valeur approchée : $3\\times 0{,}333=0{,}999\\neq 1$.'])
V255_PRODUIT = case(
    INTRO_255 + HYP_255 + 'On multiplie les deux membres par $3\\times 10^n$. Complète.\n\n'
    '$?=10^n$',
    [], '3a',
    ['$\\dfrac{1}{3}\\times 3\\times 10^n=10^n$ et $\\dfrac{a}{10^n}\\times 3\\times 10^n=3a$.',
     'Donc $' + col('3a') + '=10^n$ : $10^n$ serait un multiple de $3$.'])
V255_CONTRADICTION = justification(
    INTRO_255 + HYP_255 + 'On en déduit $3a=10^n$, donc $10^n$ serait un multiple de $3$. Pourquoi'
    ' est-ce impossible ?',
    [],
    'Car la somme des chiffres de $10^n$ vaut $1$, qui n\'est pas un multiple de $3$.',
    ['Car $10^n$ est pair.',
     'Car $10^n$ se termine par $0$.',
     'Car $10$ n\'est pas un nombre premier.'],
    ['$10^n$ s\'écrit avec un $1$ suivi de $n$ zéros : la somme de ses chiffres vaut $1$.',
     'Un entier est multiple de $3$ si et seulement si la somme de ses chiffres l\'est : $10^n$'
     ' n\'est ' + '**pas un multiple de $3$**' + '.',
     'L\'hypothèse mène à une contradiction : $\\dfrac{1}{3}$ n\'est pas décimal. (Être pair ou'
     ' finir par $0$ n\'empêche pas d\'être multiple de $3$ : pensez à $6$ ou à $30$.)'])
V255_RANGER = ranger(
    'On démontre par l\'absurde que $\\dfrac{1}{3}$ n\'est pas un nombre décimal.',
    ['Supposons que $\\dfrac{1}{3}=\\dfrac{a}{10^n}$, avec $a$ entier et $n$ entier naturel.',
     'En multipliant par $3\\times 10^n$, on obtient $3a=10^n$.',
     'Donc $10^n$ serait un multiple de $3$.',
     'Or la somme des chiffres de $10^n$ vaut $1$ : $10^n$ n\'est pas un multiple de $3$.',
     'C\'est une contradiction : $\\dfrac{1}{3}$ n\'est pas décimal.'],
    ['On suppose le contraire, on en tire $3a=10^n$, et on aboutit à une contradiction.',
     'Conclusion : $' + col('\\dfrac{1}{3}') + '$ n\'est pas un nombre décimal.'])

MODELES.append(modele(
    '03-demontrer-un-tiers-non-decimal', 'Démontrer que 1/3 n\'est pas un nombre décimal',
    'Démonstration par l\'absurde à trous : hypothèse 1/3 = a/10ⁿ (choix), 3a = 10ⁿ (case),'
    ' contradiction par la somme des chiffres (choix) ; étapes à ranger',
    5,
    [V255_HYPOTHESE, V255_PRODUIT, V255_CONTRADICTION, V255_RANGER],
    specs_choix(0, 'on suppose 1/3 décimal', ['on suppose la conclusion', 'valeur approchée',
                                               '3 décimal'])
    + [spec('3a', 1, '3a', 'correct'),
       spec('Erreur : a', 1, 'a', 'incorrect'),
       spec('Erreur : a/3', 1, '\\frac{a}{3}', 'incorrect'),
       spec('Erreur : 3', 1, '3', 'incorrect')]
    + specs_choix(2, 'somme des chiffres', ['pair', 'finit par 0', '10 non premier'])
    + ['RANGER:3']))

# --- 4. 2-256 : √2 est irrationnel -------------------------------------------------------------

INTRO_256 = ('On démontre par l\'absurde que $\\sqrt{2}$ est irrationnel.\n\n'
             'Supposons que $\\sqrt{2}$ soit rationnel : $\\sqrt{2}=\\dfrac{p}{q}$, avec $p$ et $q$'
             ' entiers naturels non nuls et la fraction $\\dfrac{p}{q}$ irréductible.\n\n')
CARRE_256 = 'En élevant au carré, on obtient $p^2=2q^2$.\n\n'

V256_CARRE = case(
    INTRO_256 + 'On élève au carré les deux membres de $\\sqrt{2}=\\dfrac{p}{q}$, puis on'
    ' multiplie par $q^2$. Complète.\n\n$p^2=?$',
    [], '2q^2',
    ['$\\left(\\sqrt{2}\\right)^2=2$ et $\\left(\\dfrac{p}{q}\\right)^2=\\dfrac{p^2}{q^2}$ : donc'
     ' $2=\\dfrac{p^2}{q^2}$.',
     'En multipliant par $q^2$ : $p^2=' + col('2q^2') + '$.'])
V256_PAIR = justification(
    INTRO_256 + CARRE_256 + 'Donc $p^2$ est pair. On en déduit que $p$ est pair. Pourquoi ?',
    [],
    'Car si $p$ était impair, $p^2$ serait impair.',
    ['Car le carré d\'un nombre pair est pair.',
     'Car $p=2q$.',
     'Car $p^2$ est divisible par $4$.'],
    ['On sait que le carré d\'un nombre impair est impair.',
     'Si $p$ était impair, $p^2$ serait impair : c\'est faux, donc ' + '**$p$ est pair**' + '.',
     '« Le carré d\'un pair est pair » dit l\'inverse : il part de $p$ pair, ce qu\'on cherche à'
     ' démontrer.'])
V256_CONTRADICTION = justification(
    INTRO_256 + CARRE_256 + 'On montre que $p$ est pair, puis, en écrivant $p=2k$, que'
    ' $q^2=2k^2$ : $q$ est pair aussi. Où est la contradiction ?',
    [],
    '$p$ et $q$ sont tous les deux pairs, alors que la fraction $\\dfrac{p}{q}$ est irréductible.',
    ['$q^2=2k^2$ est impossible.',
     '$p$ est à la fois pair et impair.',
     '$\\sqrt{2}$ n\'est pas un nombre entier.'],
    ['Si $p$ et $q$ sont pairs, on peut simplifier $\\dfrac{p}{q}$ par $2$.',
     'Cela contredit l\'hypothèse : la fraction était ' + '**irréductible**' + '.',
     'Donc $\\sqrt{2}$ n\'est pas rationnel : il est irrationnel.'])
V256_RANGER = ranger(
    'On démontre par l\'absurde que $\\sqrt{2}$ est irrationnel.',
    ['Supposons que $\\sqrt{2}=\\dfrac{p}{q}$, avec $p$ et $q$ entiers naturels non nuls et'
     ' $\\dfrac{p}{q}$ irréductible.',
     'Alors $p^2=2q^2$ : $p^2$ est pair, donc $p$ est pair.',
     'On écrit $p=2k$ : $4k^2=2q^2$, donc $q^2=2k^2$ et $q$ est pair.',
     '$p$ et $q$ sont pairs : $\\dfrac{p}{q}$ n\'est pas irréductible, c\'est une contradiction.'],
    ['On suppose $\\sqrt{2}$ rationnel, on montre que $p$ puis $q$ sont pairs, ce qui contredit'
     ' l\'irréductibilité.',
     'Conclusion : $' + col('\\sqrt{2}') + '$ est irrationnel.'])

MODELES.append(modele(
    '04-demontrer-racine-de-deux-irrationnel', 'Démontrer que √2 est irrationnel',
    'Démonstration par l\'absurde à trous : p² = 2q² (case), p² pair donc p pair (choix),'
    ' contradiction avec l\'irréductibilité (choix) ; étapes à ranger',
    6,
    [V256_CARRE, V256_PAIR, V256_CONTRADICTION, V256_RANGER],
    [spec('2q²', 0, '2q^2', 'correct'),
     spec('Erreur : 2q', 0, '2q', 'incorrect'),
     spec('Erreur : 4q²', 0, '4q^2', 'incorrect'),
     spec('Erreur : q²/2', 0, '\\frac{q^2}{2}', 'incorrect')]
    + specs_choix(1, 'contraposée', ['réciproque', 'p = 2q', 'divisible par 4'])
    + specs_choix(2, 'irréductible', ['q² = 2k² impossible', 'pair et impair', 'pas entier'])
    + ['RANGER:3']))

# --- 5. 2-282 : √(ab) = √a √b -----------------------------------------------------------------

INTRO_282 = ('Soit $a$ et $b$ deux réels positifs. On démontre que $\\sqrt{ab}=\\sqrt{a}\\sqrt{b}$.'
             '\n\n$\\sqrt{ab}$ est, par définition, le nombre positif dont le carré vaut $ab$.\n\n')

V282_CARRE = case(
    INTRO_282 + 'On calcule le carré de $\\sqrt{a}\\sqrt{b}$. Complète.\n\n'
    '$\\left(\\sqrt{a}\\sqrt{b}\\right)^2=\\left(\\sqrt{a}\\right)^2\\times\\left(\\sqrt{b}\\right)^2=?$',
    [], 'ab',
    ['Par définition de la racine carrée, $\\left(\\sqrt{a}\\right)^2=a$ et'
     ' $\\left(\\sqrt{b}\\right)^2=b$.',
     'Donc $\\left(\\sqrt{a}\\sqrt{b}\\right)^2=' + col('ab') + '$.'])
V282_POSITIF = justification(
    INTRO_282 + 'Pourquoi le nombre $\\sqrt{a}\\sqrt{b}$ est-il positif ?',
    [],
    'Car c\'est le produit de deux nombres positifs, $\\sqrt{a}$ et $\\sqrt{b}$.',
    ['Car son carré $\\left(\\sqrt{a}\\sqrt{b}\\right)^2$ est positif.',
     'Car $\\sqrt{a}\\sqrt{b}=\\sqrt{ab}$.',
     'Car $a$ est plus grand que $b$.'],
    ['Une racine carrée est toujours positive : $\\sqrt{a}\\geqslant 0$ et $\\sqrt{b}\\geqslant 0$.',
     'Le produit de deux nombres positifs est positif : $' + col('\\sqrt{a}\\sqrt{b}\\geqslant 0')
     + '$.',
     'Un carré est positif même si le nombre est négatif ; et utiliser $\\sqrt{a}\\sqrt{b}=\\sqrt{ab}$,'
     ' c\'est supposer ce qu\'on veut démontrer.'])
V282_CONCLURE = justification(
    INTRO_282 + 'On a montré que $\\sqrt{a}\\sqrt{b}\\geqslant 0$ et que'
    ' $\\left(\\sqrt{a}\\sqrt{b}\\right)^2=ab$. Pourquoi peut-on conclure que'
    ' $\\sqrt{a}\\sqrt{b}=\\sqrt{ab}$ ?',
    [],
    'Car $\\sqrt{ab}$ est le seul nombre positif dont le carré vaut $ab$.',
    ['Car tout nombre dont le carré vaut $ab$ est égal à $\\sqrt{ab}$.',
     'Car $a$ et $b$ sont égaux.',
     'Car la racine carrée d\'une somme est la somme des racines carrées.'],
    ['$\\sqrt{a}\\sqrt{b}$ est positif et son carré vaut $ab$.',
     'Or $\\sqrt{ab}$ est ' + '**le seul nombre positif**' + ' dont le carré vaut $ab$ : donc'
     ' $\\sqrt{a}\\sqrt{b}=\\sqrt{ab}$.',
     'Le mot « positif » compte : $-\\sqrt{ab}$ a aussi pour carré $ab$.'])
V282_RANGER = ranger(
    'Soit $a$ et $b$ deux réels positifs. On démontre que $\\sqrt{ab}=\\sqrt{a}\\sqrt{b}$.',
    ['$\\sqrt{a}\\geqslant 0$ et $\\sqrt{b}\\geqslant 0$, donc $\\sqrt{a}\\sqrt{b}\\geqslant 0$.',
     '$\\left(\\sqrt{a}\\sqrt{b}\\right)^2=\\left(\\sqrt{a}\\right)^2\\times\\left(\\sqrt{b}\\right)^2=ab$.',
     '$\\sqrt{a}\\sqrt{b}$ est donc un nombre positif dont le carré vaut $ab$.',
     'Or $\\sqrt{ab}$ est le seul nombre positif dont le carré vaut $ab$ : $\\sqrt{ab}=\\sqrt{a}\\sqrt{b}$.'],
    ['On montre que $\\sqrt{a}\\sqrt{b}$ est positif et que son carré vaut $ab$.',
     'Par définition de la racine carrée, $' + col('\\sqrt{ab}=\\sqrt{a}\\sqrt{b}') + '$.'])

MODELES.append(modele(
    '05-demontrer-racine-d-un-produit', 'Démontrer que √(ab) = √a × √b',
    'Démonstration à trous pour a, b ≥ 0 : carré (√a√b)² = ab (case), √a√b positif (choix),'
    ' conclusion par la définition de la racine carrée (choix) ; étapes à ranger',
    3,
    [V282_CARRE, V282_POSITIF, V282_CONCLURE, V282_RANGER],
    [spec('ab', 0, 'ab', 'correct'),
     spec('Écriture ba', 0, 'ba', 'correct'),
     spec('Erreur : √(ab)', 0, '\\sqrt{ab}', 'incorrect'),
     spec('Erreur : a + b', 0, 'a+b', 'incorrect'),
     spec('Erreur : a²b²', 0, 'a^2b^2', 'incorrect')]
    + specs_choix(1, 'produit de positifs', ['carré positif', 'circulaire', 'a > b'])
    + specs_choix(2, 'seul positif', ['oubli du signe', 'a = b', 'somme'])
    + ['RANGER:3']))


# --- Specs « ranger » : positions affichées calculées par le générateur (graine 0) -------------

def positions(chemin, vi):
    out = subprocess.run(['pnpm', 'exec', 'tsx', 'docs/wip/questions/positions-ranger.ts', chemin, str(vi)],
                         check=True, capture_output=True, text=True).stdout.strip().splitlines()
    return json.loads(out[-1])


os.makedirs(DOSSIER, exist_ok=True)
for nom, m in MODELES:
    chemin = os.path.join(DOSSIER, nom + '.json')
    a_ranger = [s for s in m['testSpecs'] if isinstance(s, str)]
    m['testSpecs'] = [s for s in m['testSpecs'] if not isinstance(s, str)]
    with open(chemin, 'w', encoding='utf-8') as f:
        json.dump(m, f, ensure_ascii=False, indent='\t')
    for marque in a_ranger:
        vi = int(marque.split(':')[1])
        juste = positions(chemin, vi)
        faux = juste[:]
        faux[1], faux[2] = faux[2], faux[1]
        m['testSpecs'] += [spec('Étapes dans l’ordre', vi, juste, 'correct'),
                           spec('Erreur : deuxième et troisième étapes échangées', vi, faux,
                                'incorrect')]
    with open(chemin, 'w', encoding='utf-8') as f:
        json.dump(m, f, ensure_ascii=False, indent='\t')
        f.write('\n')
# Mis en forme comme le pre-commit, pour que le script redonne les fichiers commités
subprocess.run(['pnpm', 'exec', 'prettier', '--write', DOSSIER], check=True,
               stdout=subprocess.DEVNULL)
print(f'{len(MODELES)} modèles écrits dans {DOSSIER}')
