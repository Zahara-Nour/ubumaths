"""Écrit les 4 modèles du lot 1 « démonstrations : dénombrement et géométrie » de la terminale
spécialité dans scripts/questions/tspe-demonstrations-1/.

Phase 0 validée par David le 2026-11-11 (« je suis tes recos », D1 du journal
« docs/wip/questions-tspe-demonstrations-progress.md », § 2), un point par modèle :

| # | Point     | Titre                                                          | Sous-notion du point (prod), niveau        |
| 1 | TSPE-321  | Démontrer la relation de Pascal par le calcul                  | Combinaisons › triangle de Pascal, 5       |
| 2 | TSPE-548  | Démontrer la relation de Pascal par dénombrement               | Combinaisons › triangle de Pascal, 6       |
| 3 | TSPE-359  | Démontrer que le projeté orthogonal est le point le plus proche | Orthogonalité… › projeté orthogonal, 6     |
| 4 | TSPE-373  | Démontrer l'équation cartésienne d'un plan de vecteur normal donné | Orthogonalité… › vecteur normal…, 4     |

Forme (D1, Q2) : 3 variations à trous (case, ou case choix à 4 propositions) + une variation
« étapes à ranger » (` ```ranger `, `signe: aucun`). Valeurs tirées (Q3) : n pour 548 (exemple
chiffré), A et n pour 373 ; lettres ailleurs.

Niveaux : après ceux déjà présents sur la sous-notion (relevé prod du 2026-11-11 : triangle de
Pascal 3-4, projeté orthogonal 2-5, vecteur normal et équation cartésienne 1-3).

    python3 docs/wip/questions/lot-tspe-demonstrations-1.py scripts/questions/tspe-demonstrations-1
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
    return nom, {'title': title, 'description': description, 'grades': ['T_SPE'],
                 'level': level, 'delay': 90, 'status': 'draft',
                 'shared': {},
                 'variations': variations, 'testSpecs': specs}


def var(nom, expression):
    return {'name': nom, 'expression': expression}


def v(x):
    return '{{' + x + '}}'


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


def colonne(a, b, c):
    return '\\begin{pmatrix}' + a + '\\\\' + b + '\\\\' + c + '\\end{pmatrix}'


MODELES = []

# --- 1. TSPE-321 : relation de Pascal par le calcul ------------------------------------------------

BINOM_NK = '\\dfrac{n!}{k!\\,(n-k)!}'
BINOM_NK1 = '\\dfrac{n!}{(k+1)!\\,(n-k-1)!}'
DENOM = '(k+1)!\\,(n-k)!'
INTRO_321 = ('Soient $n$ et $k$ deux entiers naturels tels que $0\\leqslant k\\leqslant n-1$. On'
             ' démontre par le calcul la relation de Pascal :'
             ' $\\binom{n}{k}+\\binom{n}{k+1}=\\binom{n+1}{k+1}$.\n\n'
             'On part de $\\binom{n}{k}+\\binom{n}{k+1}=' + BINOM_NK + '+' + BINOM_NK1
             + '$ et on réduit au dénominateur commun $' + DENOM + '$.\n\n')

V321_PREMIER = case(
    INTRO_321 + 'Complète.\n\n$' + BINOM_NK + '=\\dfrac{n!\\times(?)}{' + DENOM + '}$',
    [], 'k+1',
    ['$(k+1)!\\,=(k+1)\\times k!$ : pour passer de $k!$ à $(k+1)!$, on multiplie par $k+1$.',
     'On multiplie le numérateur par le même nombre : $' + BINOM_NK + '=\\dfrac{n!\\times'
     + col('(k+1)') + '}{' + DENOM + '}$.'])
V321_SECOND = case(
    INTRO_321 + 'Complète.\n\n$' + BINOM_NK1 + '=\\dfrac{n!\\times(?)}{' + DENOM + '}$',
    [], 'n-k',
    ['$(n-k)!\\,=(n-k)\\times(n-k-1)!$ : pour passer de $(n-k-1)!$ à $(n-k)!$, on multiplie'
     ' par $n-k$.',
     'On multiplie le numérateur par le même nombre : $' + BINOM_NK1 + '=\\dfrac{n!\\times'
     + col('(n-k)') + '}{' + DENOM + '}$.'])
V321_CONCLURE = justification(
    INTRO_321 + 'On obtient $\\binom{n}{k}+\\binom{n}{k+1}=\\dfrac{n!\\,(k+1)+n!\\,(n-k)}{' + DENOM
    + '}=\\dfrac{(n+1)!}{' + DENOM + '}$. Pourquoi ce quotient est-il égal à'
    ' $\\binom{n+1}{k+1}$ ?',
    [],
    'Car $(n+1)-(k+1)=n-k$ : c\'est $\\dfrac{(n+1)!}{(k+1)!\\,\\big((n+1)-(k+1)\\big)!}$.',
    ['Car $(n+1)!\\,=n!+1$.',
     'Car $\\binom{n+1}{k+1}=\\binom{n}{k}\\times\\binom{n}{k+1}$.',
     'Car $(k+1)!\\,=k!+1$ et $(n-k)!\\,=(n-k-1)!+1$.'],
    ['Le numérateur se factorise : $n!\\,(k+1+n-k)=n!\\,(n+1)=(n+1)!$.',
     'Par définition, $\\binom{n+1}{k+1}=\\dfrac{(n+1)!}{(k+1)!\\,\\big((n+1)-(k+1)\\big)!}$, et'
     ' $(n+1)-(k+1)=' + col('n-k') + '$.',
     'Attention : $(n+1)!\\,=(n+1)\\times n!$, et non $n!+1$.'])
V321_RANGER = ranger(
    'Soient $n$ et $k$ deux entiers naturels tels que $0\\leqslant k\\leqslant n-1$. On démontre'
    ' par le calcul que $\\binom{n}{k}+\\binom{n}{k+1}=\\binom{n+1}{k+1}$.',
    ['On écrit $\\binom{n}{k}+\\binom{n}{k+1}=' + BINOM_NK + '+' + BINOM_NK1 + '$.',
     'On réduit au dénominateur commun : la somme vaut $\\dfrac{n!\\,(k+1)+n!\\,(n-k)}{' + DENOM
     + '}$.',
     'On factorise le numérateur : $n!\\,(k+1+n-k)=n!\\,(n+1)=(n+1)!$.',
     'La somme vaut donc $\\dfrac{(n+1)!}{' + DENOM + '}$.',
     'Comme $(n+1)-(k+1)=n-k$, ce quotient est $\\binom{n+1}{k+1}$.'],
    ['On écrit les deux coefficients avec les factorielles, puis on les ajoute.',
     'Conclusion : $\\binom{n}{k}+\\binom{n}{k+1}=' + col('\\binom{n+1}{k+1}') + '$.'])

MODELES.append(modele(
    '01-demontrer-relation-de-pascal-par-le-calcul',
    'Démontrer la relation de Pascal par le calcul',
    'Démonstration à trous : facteur k + 1 (case), facteur n − k (case), (n + 1)!/((k + 1)!(n − k)!)'
    ' = C(n + 1, k + 1) (choix) ; étapes à ranger',
    5,
    [V321_PREMIER, V321_SECOND, V321_CONCLURE, V321_RANGER],
    [spec('k + 1', 0, 'k+1', 'correct'),
     spec('Écriture 1 + k', 0, '1+k', 'correct'),
     spec('Erreur : k', 0, 'k', 'incorrect'),
     spec('Erreur : n − k', 0, 'n-k', 'incorrect'),
     spec('Erreur : k − 1', 0, 'k-1', 'incorrect'),
     spec('n − k', 1, 'n-k', 'correct'),
     spec('Écriture −k + n', 1, '-k+n', 'correct'),
     spec('Erreur : n − k − 1', 1, 'n-k-1', 'incorrect'),
     spec('Erreur : k + 1', 1, 'k+1', 'incorrect'),
     spec('Erreur : k − n', 1, 'k-n', 'incorrect')]
    + specs_choix(2, '(n + 1) − (k + 1) = n − k', ['(n + 1)! = n! + 1', 'produit',
                                                   '(k + 1)! = k! + 1'])
    + ['RANGER:3']))

# --- 2. TSPE-548 : relation de Pascal par dénombrement (n tiré pour l'exemple) --------------------

INTRO_548 = ('Soit $E$ un ensemble à $n+1$ éléments ($n\\geqslant 1$), $a$ un élément de $E$ et $k$'
             ' un entier tel que $0\\leqslant k\\leqslant n-1$. On démontre que'
             ' $\\binom{n+1}{k+1}=\\binom{n}{k}+\\binom{n}{k+1}$ en comptant les parties de $E$ à'
             ' $k+1$ éléments : celles qui contiennent $a$, puis celles qui ne le contiennent'
             ' pas.\n\n')
V_N = [var('n', '4..8')]
VN = {'n': 6}

V548_EXEMPLE = case(
    'On démontre la relation de Pascal par dénombrement. On commence par un exemple.\n\n'
    'Soit $E$ un ensemble à $' + v('eval:n+1') + '$ éléments et $a$ un élément de $E$.\n\n'
    'Combien de parties à $3$ éléments de $E$ contiennent $a$ ?\n\nIl y en a $?$.',
    V_N, v('eval:n*(n-1)/2'),
    ['Une partie à $3$ éléments qui contient $a$ est déterminée par ses $2$ autres éléments,'
     ' choisis parmi les $' + v('n') + '$ éléments de $E$ autres que $a$.',
     'Il y en a donc $\\binom{' + v('n') + '}{2}=\\dfrac{' + v('n') + '\\times' + v('eval:n-1')
     + '}{2}=' + col(v('eval:n*(n-1)/2')) + '$.'])
V548_SANS_A = justification(
    INTRO_548 + 'Combien de parties de $E$ à $k+1$ éléments ne contiennent pas $a$ ?',
    [],
    '$\\binom{n}{k+1}$ : ce sont les parties à $k+1$ éléments de $E$ privé de $a$, qui a $n$'
    ' éléments.',
    ['$\\binom{n+1}{k+1}$ : ce sont des parties à $k+1$ éléments de $E$.',
     '$\\binom{n}{k}$ : on choisit $k$ éléments parmi les $n$ autres que $a$.',
     '$\\binom{n+1}{k}$ : on retire $a$ des $k+1$ éléments.'],
    ['Une partie qui ne contient pas $a$ est une partie de $E$ privé de $a$, ensemble à $n$'
     ' éléments.',
     'Il y en a donc $' + col('\\binom{n}{k+1}') + '$ à $k+1$ éléments.',
     '$\\binom{n}{k}$ compte, lui, les parties qui **contiennent** $a$ : $a$ plus $k$ autres'
     ' éléments.'])
V548_ADDITIF = justification(
    INTRO_548 + 'Il y a $\\binom{n}{k}$ parties qui contiennent $a$ et $\\binom{n}{k+1}$ qui ne le'
    ' contiennent pas. Pourquoi peut-on conclure que'
    ' $\\binom{n+1}{k+1}=\\binom{n}{k}+\\binom{n}{k+1}$ ?',
    [],
    'Les deux familles sont disjointes et leur réunion est l\'ensemble des parties de $E$ à'
    ' $k+1$ éléments : on applique le principe additif.',
    ['On applique le principe multiplicatif : on choisit une partie dans chaque famille.',
     'Les deux familles ont le même nombre d\'éléments.',
     'Toute partie de $E$ à $k+1$ éléments contient $a$.'],
    ['Une partie de $E$ à $k+1$ éléments contient $a$ ou ne le contient pas, jamais les deux :'
     ' les deux familles sont disjointes et, réunies, donnent toutes ces parties.',
     'Par le principe additif, $\\binom{n+1}{k+1}=' + col('\\binom{n}{k}+\\binom{n}{k+1}') + '$.',
     'Le principe multiplicatif compte des couples (une partie de chaque famille), pas des'
     ' parties.'])
V548_RANGER = ranger(
    'Soit $E$ un ensemble à $n+1$ éléments ($n\\geqslant 1$), $a$ un élément de $E$ et $k$ un'
    ' entier tel que $0\\leqslant k\\leqslant n-1$. On démontre que'
    ' $\\binom{n+1}{k+1}=\\binom{n}{k}+\\binom{n}{k+1}$.',
    ['On sépare les parties de $E$ à $k+1$ éléments en deux familles : celles qui contiennent'
     ' $a$ et celles qui ne le contiennent pas.',
     'Une partie qui contient $a$ est déterminée par ses $k$ autres éléments, pris parmi les $n$'
     ' éléments autres que $a$ : il y en a $\\binom{n}{k}$.',
     'Les autres, qui ne contiennent pas $a$, sont les parties à $k+1$ éléments de $E$ privé de'
     ' $a$ : il y en a $\\binom{n}{k+1}$.',
     'Les deux familles sont disjointes : par le principe additif,'
     ' $\\binom{n+1}{k+1}=\\binom{n}{k}+\\binom{n}{k+1}$.'],
    ['On compte de deux façons les parties de $E$ à $k+1$ éléments.',
     'Conclusion : $' + col('\\binom{n+1}{k+1}=\\binom{n}{k}+\\binom{n}{k+1}') + '$.'])

MODELES.append(modele(
    '02-demontrer-relation-de-pascal-par-denombrement',
    'Démontrer la relation de Pascal par dénombrement',
    'Démonstration à trous : exemple chiffré, parties à 3 éléments contenant a (case, n tiré),'
    ' parties sans a (choix), principe additif (choix) ; étapes à ranger',
    6,
    [V548_EXEMPLE, V548_SANS_A, V548_ADDITIF, V548_RANGER],
    [spec('C(6, 2) = 15', 0, '15', 'correct', VN),
     spec('Erreur : C(7, 3) = 35, toutes les parties', 0, '35', 'incorrect', VN),
     spec('Erreur : C(6, 3) = 20, trois éléments parmi les autres', 0, '20', 'incorrect', VN),
     spec('Erreur : 6 × 5 = 30, ordre compté', 0, '30', 'incorrect', VN)]
    + specs_choix(1, 'C(n, k + 1)', ['C(n + 1, k + 1)', 'C(n, k)', 'C(n + 1, k)'])
    + specs_choix(2, 'principe additif', ['principe multiplicatif', 'même cardinal',
                                          'toutes contiennent a'])
    + ['RANGER:3']))

# --- 3. TSPE-359 : le projeté orthogonal est le point du plan le plus proche ----------------------

INTRO_359 = ('Soit $\\mathcal{P}$ un plan, $M$ un point de l\'espace et $H$ son projeté orthogonal'
             ' sur $\\mathcal{P}$. On démontre que $H$ est le point de $\\mathcal{P}$ le plus proche'
             ' de $M$.\n\nSoit $N$ un point de $\\mathcal{P}$ distinct de $H$.\n\n')
DEV_359 = ('$MN^2=MH^2+2\\,\\overrightarrow{MH}\\cdot\\overrightarrow{HN}+HN^2$')

V359_PRODUIT = case(
    INTRO_359 + 'Par la relation de Chasles, $\\overrightarrow{MN}=\\overrightarrow{MH}'
    '+\\overrightarrow{HN}$, donc ' + DEV_359 + '.\n\nComplète.\n\n'
    '$\\overrightarrow{MH}\\cdot\\overrightarrow{HN}=?$',
    [], '0',
    ['$\\overrightarrow{MH}$ est orthogonal au plan $\\mathcal{P}$, et $\\overrightarrow{HN}$ est'
     ' un vecteur de $\\mathcal{P}$ (car $H$ et $N$ sont dans $\\mathcal{P}$).',
     'Deux vecteurs orthogonaux ont un produit scalaire nul :'
     ' $\\overrightarrow{MH}\\cdot\\overrightarrow{HN}=' + col('0') + '$.'])
V359_POURQUOI = justification(
    INTRO_359 + 'On a ' + DEV_359 + '. Pourquoi'
    ' $\\overrightarrow{MH}\\cdot\\overrightarrow{HN}=0$ ?',
    [],
    'La droite $(MH)$ est orthogonale au plan $\\mathcal{P}$, donc à tout vecteur de'
    ' $\\mathcal{P}$, en particulier à $\\overrightarrow{HN}$.',
    ['Car $M$, $H$ et $N$ sont alignés.',
     'Car $H$ est le milieu de $[MN]$.',
     'Car $MH=HN$.'],
    ['$H$ est le projeté orthogonal de $M$ sur $\\mathcal{P}$ : $(MH)$ est orthogonale à'
     ' $\\mathcal{P}$.',
     '$H$ et $N$ sont dans $\\mathcal{P}$, donc $\\overrightarrow{HN}$ est un vecteur de'
     ' $\\mathcal{P}$ : $' + col('\\overrightarrow{MH}\\cdot\\overrightarrow{HN}=0') + '$.',
     '$M$, $H$, $N$ ne sont pas alignés en général : le triangle $MHN$ est rectangle en $H$.'])
V359_CONCLURE = justification(
    INTRO_359 + 'On a obtenu $MN^2=MH^2+HN^2$. Que peut-on conclure ?',
    [],
    '$N\\neq H$, donc $HN^2>0$ : $MN^2>MH^2$, d\'où $MN>MH$.',
    ['$MN^2=MH^2+HN^2$, donc $MN=MH+HN$, d\'où $MN>MH$.',
     '$HN^2>0$, donc $MN^2<MH^2$, d\'où $MN<MH$.',
     'On ne peut pas conclure sans connaître la longueur $HN$.'],
    ['$N\\neq H$, donc $HN>0$ et $HN^2>0$.',
     'Donc $MN^2>MH^2$ et, les longueurs étant positives, $' + col('MN>MH') + '$ : $H$ est le'
     ' point de $\\mathcal{P}$ le plus proche de $M$.',
     'Attention : $MN^2=MH^2+HN^2$ ne donne pas $MN=MH+HN$ (la racine d\'une somme n\'est pas'
     ' la somme des racines).'])
V359_RANGER = ranger(
    'Soit $\\mathcal{P}$ un plan, $M$ un point de l\'espace et $H$ son projeté orthogonal sur'
    ' $\\mathcal{P}$. On démontre que $H$ est le point de $\\mathcal{P}$ le plus proche de $M$.'
    ' Soit $N$ un point de $\\mathcal{P}$ distinct de $H$.',
    ['Par la relation de Chasles, $\\overrightarrow{MN}=\\overrightarrow{MH}+\\overrightarrow{HN}$,'
     ' donc ' + DEV_359 + '.',
     'Or $\\overrightarrow{MH}$ est orthogonal à $\\mathcal{P}$ et $\\overrightarrow{HN}$ est un'
     ' vecteur de $\\mathcal{P}$, donc $\\overrightarrow{MH}\\cdot\\overrightarrow{HN}=0$.',
     'Donc $MN^2=MH^2+HN^2$, avec $HN^2>0$ car $N\\neq H$.',
     'Donc $MN^2>MH^2$, soit $MN>MH$ : $H$ est le point de $\\mathcal{P}$ le plus proche de $M$.'],
    ['On compare $MN$ et $MH$ par leurs carrés, développés avec le produit scalaire.',
     'Conclusion : pour tout point $N$ de $\\mathcal{P}$ distinct de $H$, $' + col('MN>MH')
     + '$.'])

MODELES.append(modele(
    '03-demontrer-projete-orthogonal-plus-proche',
    'Démontrer que le projeté orthogonal sur un plan est le point le plus proche',
    'Démonstration à trous : produit scalaire MH·HN = 0 (case), sa justification (choix),'
    ' conclusion MN > MH (choix) ; étapes à ranger',
    6,
    [V359_PRODUIT, V359_POURQUOI, V359_CONCLURE, V359_RANGER],
    [spec('0', 0, '0', 'correct'),
     spec('Erreur : 1', 0, '1', 'incorrect'),
     spec('Erreur : −1', 0, '-1', 'incorrect')]
    + specs_choix(1, 'orthogonale au plan', ['alignés', 'milieu', 'MH = HN'])
    + specs_choix(2, 'MN > MH', ['MN = MH + HN', 'mauvais sens', 'pas de conclusion'])
    + ['RANGER:3']))

# --- 4. TSPE-373 : équation cartésienne du plan normal à n passant par A (A et n tirés) ----------

A_LETTRES = 'A(x_A\\,;\\,y_A\\,;\\,z_A)'
N_LETTRES = '\\vec{n}' + colonne('a', 'b', 'c')
INTRO_373 = ('Dans un repère orthonormé de l\'espace, $\\mathcal{P}$ est le plan passant par $'
             + A_LETTRES + '$ et de vecteur normal $' + N_LETTRES + '$ non nul. On démontre que'
             ' $\\mathcal{P}$ a une équation de la forme $ax+by+cz+d=0$.\n\nSoit $M(x\\,;\\,y\\,;\\,z)$'
             ' un point de l\'espace.\n\n')
V_PLAN = [var('a', '2..5'), var('b', '2..5'), var('c', '2..5'),
          var('xa', '1..6'), var('ya', '1..6'), var('za', '1..6')]
VPLAN = {'a': 2, 'b': 3, 'c': 4, 'xa': 1, 'ya': 2, 'za': 3}

V373_APPARTENANCE = justification(
    INTRO_373 + 'Pourquoi $M\\in\\mathcal{P}$ si et seulement si'
    ' $\\overrightarrow{AM}\\cdot\\vec{n}=0$ ?',
    [],
    '$\\mathcal{P}$ est le plan passant par $A$ et orthogonal à $\\vec{n}$ : $M$ est dans'
    ' $\\mathcal{P}$ si et seulement si $\\overrightarrow{AM}$ est orthogonal à $\\vec{n}$.',
    ['$M$ est dans $\\mathcal{P}$ si et seulement si $\\overrightarrow{AM}$ et $\\vec{n}$ sont'
     ' colinéaires.',
     '$M$ est dans $\\mathcal{P}$ si et seulement si $\\overrightarrow{AM}=\\vec{n}$.',
     '$M$ est dans $\\mathcal{P}$ si et seulement si $AM=\\lVert\\vec{n}\\rVert$.'],
    ['Un vecteur normal à $\\mathcal{P}$ est orthogonal à tout vecteur de $\\mathcal{P}$.',
     '$A$ est dans $\\mathcal{P}$, donc $M$ y est si et seulement si $\\overrightarrow{AM}$ est un'
     ' vecteur de $\\mathcal{P}$, c\'est-à-dire orthogonal à $\\vec{n}$ :'
     ' $' + col('\\overrightarrow{AM}\\cdot\\vec{n}=0') + '$.',
     'Si $\\overrightarrow{AM}$ et $\\vec{n}$ étaient colinéaires, $M$ serait sur la droite'
     ' passant par $A$ orthogonale à $\\mathcal{P}$, pas dans le plan.'])
V373_D = case(
    'Dans un repère orthonormé de l\'espace, $\\mathcal{P}$ est le plan passant par'
    ' $A(' + v('xa') + '\\,;\\,' + v('ya') + '\\,;\\,' + v('za') + ')$ et de vecteur normal'
    ' $\\vec{n}' + colonne(v('a'), v('b'), v('c')) + '$. On démontre que $\\mathcal{P}$ a une'
    ' équation de la forme $' + v('a') + 'x+' + v('b') + 'y+' + v('c') + 'z+d=0$.\n\n'
    'Pour $M(x\\,;\\,y\\,;\\,z)$ : $M\\in\\mathcal{P}\\iff' + v('a') + '(x-' + v('xa') + ')+'
    + v('b') + '(y-' + v('ya') + ')+' + v('c') + '(z-' + v('za') + ')=0$.\n\n'
    'En développant, on obtient $' + v('a') + 'x+' + v('b') + 'y+' + v('c') + 'z+d=0$.'
    ' Complète.\n\n$d=?$',
    V_PLAN, v('eval:-(a*xa+b*ya+c*za)'),
    ['En développant, le terme constant est $-' + v('a') + '\\times' + v('xa') + '-' + v('b')
     + '\\times' + v('ya') + '-' + v('c') + '\\times' + v('za') + '$.',
     'Donc $d=-(' + v('eval:a*xa') + '+' + v('eval:b*ya') + '+' + v('eval:c*za') + ')='
     + col(v('eval:-(a*xa+b*ya+c*za)')) + '$.',
     'Vérification : $A$ est dans $\\mathcal{P}$, et $' + v('a') + '\\times' + v('xa') + '+'
     + v('b') + '\\times' + v('ya') + '+' + v('c') + '\\times' + v('za') + '+d=0$.'])
V373_ORTHONORME = justification(
    INTRO_373 + '$\\overrightarrow{AM}$ a pour coordonnées $(x-x_A\\,;\\,y-y_A\\,;\\,z-z_A)$. On'
    ' écrit $\\overrightarrow{AM}\\cdot\\vec{n}=a(x-x_A)+b(y-y_A)+c(z-z_A)$. Qu\'est-ce qui'
    ' permet cette écriture ?',
    [],
    'Le repère est orthonormé : le produit scalaire de deux vecteurs s\'y calcule par'
    ' $xx\'+yy\'+zz\'$.',
    ['Le produit scalaire se calcule par $xx\'+yy\'+zz\'$ dans n\'importe quel repère.',
     'Le vecteur $\\vec{n}$ est de norme $1$.',
     'Le point $A$ est l\'origine du repère.'],
    ['L\'expression $xx\'+yy\'+zz\'$ du produit scalaire n\'est valable que dans une base'
     ' **orthonormée**.',
     'Ici le repère est orthonormé : $\\overrightarrow{AM}\\cdot\\vec{n}=' + col('a(x-x_A)+b(y-y_A)'
                                                                                '+c(z-z_A)') + '$.',
     'Aucune hypothèse sur la norme de $\\vec{n}$ ni sur la position de $A$ n\'est nécessaire.'])
V373_RANGER = ranger(
    'Dans un repère orthonormé de l\'espace, $\\mathcal{P}$ est le plan passant par $' + A_LETTRES
    + '$ et de vecteur normal $' + N_LETTRES + '$ non nul. On démontre que $\\mathcal{P}$ a une'
    ' équation de la forme $ax+by+cz+d=0$. Soit $M(x\\,;\\,y\\,;\\,z)$ un point de l\'espace.',
    ['$M\\in\\mathcal{P}$ si et seulement si $\\overrightarrow{AM}\\cdot\\vec{n}=0$.',
     'Le repère est orthonormé et $\\overrightarrow{AM}$ a pour coordonnées'
     ' $(x-x_A\\,;\\,y-y_A\\,;\\,z-z_A)$, donc'
     ' $\\overrightarrow{AM}\\cdot\\vec{n}=a(x-x_A)+b(y-y_A)+c(z-z_A)$.',
     'En développant : $\\overrightarrow{AM}\\cdot\\vec{n}=ax+by+cz-(ax_A+by_A+cz_A)$.',
     'On pose $d=-(ax_A+by_A+cz_A)$ : $M\\in\\mathcal{P}\\iff ax+by+cz+d=0$.'],
    ['On traduit l\'appartenance au plan par un produit scalaire nul, puis on le calcule en'
     ' coordonnées.',
     'Conclusion : $\\mathcal{P}$ a pour équation $' + col('ax+by+cz+d=0') + '$, avec'
     ' $d=-(ax_A+by_A+cz_A)$.'])

MODELES.append(modele(
    '04-demontrer-equation-cartesienne-plan',
    'Démontrer l\'équation cartésienne d\'un plan dont on connaît un vecteur normal et un point',
    'Démonstration à trous : M ∈ P ⟺ AM·n = 0 (choix), calcul de d (case, A et n tirés),'
    ' repère orthonormé (choix) ; étapes à ranger',
    4,
    [V373_APPARTENANCE, V373_D, V373_ORTHONORME, V373_RANGER],
    specs_choix(0, 'orthogonal à n', ['colinéaires', 'AM = n', 'AM = ‖n‖'])
    + [spec('d = −20', 1, '-20', 'correct', VPLAN),
       spec('Erreur : signe oublié, 20', 1, '20', 'incorrect', VPLAN),
       spec('Erreur : coefficients oubliés, −6', 1, '-6', 'incorrect', VPLAN),
       spec('Erreur : premier terme seul, −2', 1, '-2', 'incorrect', VPLAN)]
    + specs_choix(2, 'repère orthonormé', ['tout repère', 'n unitaire', 'A origine'])
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
