"""Écrit les 4 modèles du lot 11 « approfondissements : suites » de la terminale spé dans
scripts/questions/tspe-approfondissements-11/.

Phase 0 validée par David le 2026-11-13 (D3 du journal
« docs/wip/questions-tspe-demonstrations-progress.md », § 35), un point par modèle :

| # | Point    | Titre                                                          | Niv. | Nœud du modèle                                       |
| 1 | TSPE-394 | Suites adjacentes : définition, propriété, limite commune      | 5    | Limites de suites › convergence monotone             |
| 2 | TSPE-395 | Suite récurrente linéaire d'ordre 2 : termes, forme explicite  | 1    | Suites récurrentes › récurrence linéaire d'ordre 2 ¹ |
| 3 | TSPE-396 | Méthode de Newton : calculer des itérés à la main              | 4    | Suites récurrentes › point fixe                      |
| 4 | TSPE-571 | Démontrer la convergence de la méthode de Héron                | 5    | Suites récurrentes › point fixe                      |

¹ Sous-notion NEUVE (D3, Q4 a), posée par la migration du lot ; le point 395 est sur la notion
Suites récurrentes. Niveau 1 : la sous-notion est vide. Les autres niveaux sont au-dessus de ceux
de la prod (relevé du 2026-11-14 : 4 au plus sur « convergence monotone », 3 sur « point fixe »).

Forme (D3, Q2) : 394 et 571 sont des preuves (cases, cases choix à 4 propositions dont la première
est la bonne, variation « étapes à ranger », positions calculées par le générateur, graine 0) ;
395 et 396 des applications à valeurs tirées. Le résultat hors programme est donné dans l'énoncé
(forme explicite d'une récurrence linéaire d'ordre 2, formule de Newton). 396 ne refait pas
l'algorithme 434 (Newton en Python) ni 571 l'algorithme 393 (Héron en Python) : itérés à la main
pour 396, preuve de la convergence pour 571 ; 396 prend f(x) = x³ − A, pour ne pas retomber sur
Héron (f(x) = x² − A).

    python3 docs/archive/wip/questions-tspe-demonstrations/lot-tspe-approfondissements-11.py scripts/questions/tspe-approfondissements-11
"""
import json
import os
import subprocess
import sys

DOSSIER = sys.argv[1]


def spec(desc, vi, answer, status, variables=None):
    expected = {'status': status}
    answers = answer if isinstance(answer, list) else [answer]
    return {'description': desc, 'variationIndex': vi,
            'variables': {k: str(v) for k, v in (variables or {}).items()},
            'answers': answers, 'expected': expected}


def modele(nom, title, description, level, variations, specs):
    return nom, {'title': title, 'description': description, 'grades': ['T_SPE'],
                 'level': level, 'delay': 120, 'status': 'draft',
                 'shared': {'cleanCoefficients': True},
                 'variations': variations, 'testSpecs': specs}


def var(nom, expression):
    return {'name': nom, 'expression': expression}


def ev(x):
    return '{{eval:' + x + '}}'


def col(x, k=0):
    return '\\textcolor{{{color:primary.' + str(k) + '}}}{' + x + '}'


def choix(lignes):
    return '\n\n```choix\n' + ''.join('- ' + l + '\n' for l in lignes) + '```'


def case(statement, variables, attendus, steps, conditions=None):
    """Variation à une ou plusieurs cases ouvertes (`?` dans une formule de l'énoncé)."""
    attendus = attendus if isinstance(attendus, list) else [attendus]
    v = {'statement': statement, 'variables': variables,
         'blanks': [{'expectedAnswer': a} for a in attendus],
         'correction': {'steps': steps}}
    if conditions:
        v['conditions'] = conditions
    return v


def justification(statement, variables, bonne, autres, steps, conditions=None):
    """Variation à une case choix : la première proposition est la bonne (index 0)."""
    v = {'statement': statement + choix([bonne] + autres), 'variables': variables,
         'blanks': [{'expectedAnswer': '0'}], 'correction': {'steps': steps}}
    if conditions:
        v['conditions'] = conditions
    return v


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

# --- 1. TSPE-394 : suites adjacentes ----------------------------------------------------------

DEF_ADJ = ('Deux suites $(u_n)$ et $(v_n)$ sont **adjacentes** si l\'une est croissante, l\'autre'
           ' décroissante, et si $\\displaystyle\\lim_{n\\to+\\infty}(v_n-u_n)=0$.')

V394_APPLICATION = case(
    'Pour tout entier naturel $n$, on pose $u_n=' + ev('c') + '-\\dfrac{' + ev('a') + '}{n+1}$ et'
    ' $v_n=' + ev('c') + '+\\dfrac{' + ev('b') + '}{n+1}$. La suite $(u_n)$ est croissante et'
    ' $(v_n)$ décroissante.\n\n' + DEF_ADJ + '\n\nComplète, puis donne la limite commune $\\ell$'
    ' de ces deux suites adjacentes.\n\n$v_n-u_n=\\dfrac{?}{n+1}$ et $\\ell=?$',
    [var('c', '1..5;±'), var('a', '1..5'), var('b', '1..5')], [ev('a+b'), ev('c')],
    ['$v_n-u_n=\\dfrac{' + ev('b') + '}{n+1}+\\dfrac{' + ev('a') + '}{n+1}=\\dfrac{' + ev('a+b')
     + '}{n+1}$, qui tend vers $0$ : les suites sont adjacentes.',
     'Comme $\\displaystyle\\lim_{n\\to+\\infty}\\dfrac{1}{n+1}=0$, $(u_n)$ et $(v_n)$ tendent'
     ' toutes deux vers $' + ev('c') + '$.',
     'Donc $v_n-u_n=\\dfrac{' + col(ev('a+b')) + '}{n+1}$ et $' + col('\\ell=' + ev('c')) + '$.'])

V394_DEFINITION = justification(
    'La suite $(u_n)$ est croissante et la suite $(v_n)$ est décroissante.\n\nQuelle condition'
    ' faut-il ajouter pour que $(u_n)$ et $(v_n)$ soient **adjacentes** ?',
    [],
    '$\\displaystyle\\lim_{n\\to+\\infty}(v_n-u_n)=0$',
    ['$u_n\\leqslant v_n$ pour tout entier naturel $n$',
     '$(u_n)$ et $(v_n)$ sont bornées',
     '$u_0\\leqslant v_0$'],
    ['Par définition, deux suites sont adjacentes si l\'une est croissante, l\'autre'
     ' décroissante, et si leur différence tend vers $0$.',
     '$u_n\\leqslant v_n$ n\'est pas une condition : c\'est une **conséquence** de la définition.',
     'La condition à ajouter est $' + col('\\displaystyle\\lim_{n\\to+\\infty}(v_n-u_n)=0') + '$.'])

V394_SIGNE = justification(
    'Soit $(u_n)$ croissante et $(v_n)$ décroissante, adjacentes. On pose $w_n=v_n-u_n$ : la suite'
    ' $(w_n)$ est décroissante, car $w_{n+1}-w_n=(v_{n+1}-v_n)-(u_{n+1}-u_n)\\leqslant 0$.\n\n'
    'Pourquoi a-t-on $w_n\\geqslant 0$ pour tout entier naturel $n$ ?',
    [],
    '$(w_n)$ est décroissante et tend vers $0$ : si un terme $w_N$ était négatif, les suivants'
    ' resteraient sous $w_N<0$',
    ['$(w_n)$ est croissante et tend vers $0$',
     '$u_n$ et $v_n$ sont positifs',
     '$w_0\\geqslant 0$, donc tous les termes le sont'],
    ['Si $w_N<0$ pour un rang $N$, alors $w_n\\leqslant w_N$ pour tout $n\\geqslant N$, car $(w_n)$'
     ' est décroissante.',
     'La limite vérifierait $0\\leqslant w_N<0$ : c\'est impossible.',
     'Donc $' + col('w_n\\geqslant 0') + '$ pour tout $n$ : une suite décroissante de limite $0$'
     ' reste positive.'])

V394_PREUVE = ranger(
    'Soit $(u_n)$ croissante et $(v_n)$ décroissante, telles que'
    ' $\\displaystyle\\lim_{n\\to+\\infty}(v_n-u_n)=0$. On démontre qu\'elles convergent vers la'
    ' même limite.',
    ['On pose $w_n=v_n-u_n$ pour tout entier naturel $n$.',
     '$w_{n+1}-w_n=(v_{n+1}-v_n)-(u_{n+1}-u_n)\\leqslant 0$ : la suite $(w_n)$ est décroissante.',
     'Décroissante et de limite $0$, la suite $(w_n)$ est positive : $u_n\\leqslant v_n$.',
     'Ainsi $u_0\\leqslant u_n\\leqslant v_n\\leqslant v_0$ : $(u_n)$, croissante et majorée par'
     ' $v_0$, converge, et $(v_n)$, décroissante et minorée par $u_0$, converge.',
     'Comme $\\displaystyle\\lim_{n\\to+\\infty}(v_n-u_n)=0$, les deux limites sont égales.'],
    ['On étudie la différence $w_n=v_n-u_n$ : décroissante de limite $0$, elle est positive.',
     'L\'encadrement $u_0\\leqslant u_n\\leqslant v_n\\leqslant v_0$ donne la convergence des'
     ' deux suites (théorème de la limite monotone), et la différence nulle à la limite donne'
     ' $' + col('\\text{la même limite}') + '$.'])

MODELES.append(modele(
    '01-suites-adjacentes', 'Suites adjacentes : définition, propriété, limite commune',
    'Différence et limite commune de deux suites adjacentes (deux cases), condition qui manque à'
    ' la définition (case choix), pourquoi v_n − u_n reste positive (case choix), convergence vers'
    ' la même limite (étapes à ranger)',
    5,
    [V394_APPLICATION, V394_DEFINITION, V394_SIGNE, V394_PREUVE],
    [spec('v_n − u_n = 4/(n + 1), ℓ = 2', 0, ['4', '2'], 'correct', {'c': 2, 'a': 3, 'b': 1}),
     spec('Erreur : b − a', 0, ['-2', '2'], 'incorrect', {'c': 2, 'a': 3, 'b': 1}),
     spec('Erreur : ℓ = 0 (limite de la différence)', 0, ['4', '0'], 'incorrect',
          {'c': 2, 'a': 3, 'b': 1})]
    + specs_choix(1, 'différence de limite nulle', ['u_n ≤ v_n', 'bornées', 'u_0 ≤ v_0'])
    + specs_choix(2, 'décroissante de limite 0', ['croissante', 'termes positifs', 'w_0 ≥ 0'])
    + ['RANGER:3']))

# --- 2. TSPE-395 : récurrence linéaire d'ordre 2 ----------------------------------------------

THEOREME_395 = (
    'On admet que si l\'équation $r^2=ar+b$ a deux racines réelles distinctes $r_1$ et $r_2$,'
    ' toute suite vérifiant $u_{n+2}=au_{n+1}+bu_n$ s\'écrit $u_n=\\lambda r_1^{\\,n}+\\mu'
    ' r_2^{\\,n}$, avec $\\lambda$ et $\\mu$ réels.')

V395_TERMES = case(
    'La suite $(u_n)$ est définie par $u_0=' + ev('u0') + '$, $u_1=' + ev('u1') + '$ et, pour tout'
    ' entier naturel $n$, $u_{n+2}=' + ev('a') + 'u_{n+1}+(' + ev('b') + ')u_n$.\n\nCalcule $u_2$'
    ' et $u_3$.\n\n$u_2=?$ et $u_3=?$',
    [var('a', '1..3;±'), var('b', '1..3;±'), var('u0', '-3..3'), var('u1', '1..3;±'),
     var('u2', 'eval:(a)*(u1)+(b)*(u0)')],
    [ev('u2'), ev('a*u2+b*u1')],
    ['Avec $n=0$ : $u_2=' + ev('a') + '\\times' + ev('u1;()') + '+' + ev('b;()') + '\\times'
     + ev('u0;()') + '=' + ev('u2') + '$.',
     'Avec $n=1$ : $u_3=' + ev('a') + '\\times' + ev('u2;()') + '+' + ev('b;()') + '\\times'
     + ev('u1;()') + '=' + ev('a*u2+b*u1') + '$.',
     'Donc $' + col('u_2=' + ev('u2')) + '$ et $' + col('u_3=' + ev('a*u2+b*u1')) + '$.'])

V_395_RACINES = [var('r1', '1..4'), var('r2', '1..3;±'), var('a', 'eval:(r1)+(r2)'),
                 var('b', 'eval:-(r1)*(r2)')]
C_395 = ['r2 != r1', 'r1+r2 != 0']
V395_RACINES = case(
    'La suite $(u_n)$ vérifie, pour tout entier naturel $n$, $u_{n+2}=' + ev('a') + 'u_{n+1}+('
    + ev('b') + ')u_n$.\n\n' + THEOREME_395 + '\n\nDétermine $r_1$ et $r_2$, avec $r_1<r_2$.\n\n'
    '$r_1=?$ et $r_2=?$',
    V_395_RACINES, [ev('min(r1,r2)'), ev('max(r1,r2)')],
    ['L\'équation s\'écrit $r^2-(' + ev('a') + ')r-(' + ev('b') + ')=0$.',
     'Ses racines ont pour somme $' + ev('a') + '$ et pour produit $' + ev('-b') + '$ : ce sont $'
     + ev('r1') + '$ et $' + ev('r2') + '$ (on vérifie : $' + ev('r1;()') + '^2=' + ev('r1^2')
     + '$ et $' + ev('a') + '\\times' + ev('r1;()') + ev('b;+') + '=' + ev('a*r1+b') + '$).',
     'Donc $' + col('r_1=' + ev('min(r1,r2)')) + '$ et $' + col('r_2=' + ev('max(r1,r2)')) + '$.'],
    C_395)

V395_EXPLICITE = case(
    'La suite $(u_n)$ est définie par $u_0=' + ev('l+m') + '$, $u_1=' + ev('l*r1+m*r2') + '$ et,'
    ' pour tout entier naturel $n$, $u_{n+2}=' + ev('a') + 'u_{n+1}+(' + ev('b') + ')u_n$.\n\n'
    + THEOREME_395 + ' Ici, $r_1=' + ev('r1') + '$ et $r_2=' + ev('r2') + '$.\n\nDétermine'
    ' $\\lambda$ et $\\mu$ tels que $u_n=\\lambda\\times ' + ev('r1;()') + '^n+\\mu\\times '
    + ev('r2;()') + '^n$.\n\n$\\lambda=?$ et $\\mu=?$',
    V_395_RACINES + [var('l', '1..3;±'), var('m', '1..3;±')], [ev('l'), ev('m')],
    ['Avec $n=0$ : $\\lambda+\\mu=' + ev('l+m') + '$. Avec $n=1$ : $' + ev('r1') + '\\lambda+('
     + ev('r2') + ')\\mu=' + ev('l*r1+m*r2') + '$.',
     'En retranchant $' + ev('r1') + '$ fois la première équation : $(' + ev('r2-r1') + ')\\mu='
     + ev('m*(r2-r1)') + '$, donc $\\mu=' + ev('m') + '$, puis $\\lambda=' + ev('l+m') + '-'
     + ev('m;()') + '=' + ev('l') + '$.',
     'Donc $' + col('\\lambda=' + ev('l')) + '$ et $' + col('\\mu=' + ev('m')) + '$.'],
    C_395 + ['r1 != 1', 'r2 != 1'])

VARS_395_R = {'r1': 3, 'r2': -1, 'a': 2, 'b': 3}
VARS_395_E = {'r1': 2, 'r2': -1, 'a': 1, 'b': 2, 'l': 3, 'm': -2}
MODELES.append(modele(
    '02-suite-recurrente-lineaire-d-ordre-2',
    'Suite récurrente linéaire d\'ordre 2 : termes, forme explicite',
    'Termes u₂ et u₃ d\'une suite définie par u_{n+2} = a u_{n+1} + b u_n (deux cases), racines'
    ' de l\'équation caractéristique (deux cases), coefficients λ et μ de la forme explicite,'
    ' théorème donné (deux cases)',
    1,
    [V395_TERMES, V395_RACINES, V395_EXPLICITE],
    [spec('u₂ = 7, u₃ = 12', 0, ['7', '12'], 'correct', {'a': 2, 'b': -1, 'u0': -3, 'u1': 2,
                                                         'u2': 7}),
     spec('Erreur : coefficients échangés', 0, ['-8', '12'], 'incorrect',
          {'a': 2, 'b': -1, 'u0': -3, 'u1': 2, 'u2': 7}),
     spec('Erreur : u₂ et u₃ échangés', 0, ['12', '7'], 'incorrect',
          {'a': 2, 'b': -1, 'u0': -3, 'u1': 2, 'u2': 7}),
     spec('r₁ = −1, r₂ = 3', 1, ['-1', '3'], 'correct', VARS_395_R),
     spec('Erreur : signes (r² + ar + b)', 1, ['-3', '1'], 'incorrect', VARS_395_R),
     spec('Erreur : ordre', 1, ['3', '-1'], 'incorrect', VARS_395_R),
     spec('λ = 3, μ = −2', 2, ['3', '-2'], 'correct', VARS_395_E),
     spec('Erreur : λ et μ échangés', 2, ['-2', '3'], 'incorrect', VARS_395_E),
     spec('Erreur : μ = 2 (signe)', 2, ['3', '2'], 'incorrect', VARS_395_E)]))

# --- 3. TSPE-396 : méthode de Newton ----------------------------------------------------------

NEWTON = ('La **méthode de Newton** approche une solution de $f(x)=0$ : à partir de $x_0$, on'
          ' remplace $x_n$ par l\'abscisse $x_{n+1}$ du point où la tangente à la courbe de $f$'
          ' en $x_n$ coupe l\'axe des abscisses, soit $x_{n+1}=x_n-\\dfrac{f(x_n)}{f\'(x_n)}$.')

V396_FORMULE = justification(
    'Soit $f$ une fonction dérivable et $x_n$ un réel tel que $f\'(x_n)\\neq 0$. La tangente à la'
    ' courbe de $f$ au point d\'abscisse $x_n$ a pour équation $y=f\'(x_n)(x-x_n)+f(x_n)$.\n\nÀ'
    ' quelle abscisse $x_{n+1}$ coupe-t-elle l\'axe des abscisses ?',
    [],
    '$x_{n+1}=x_n-\\dfrac{f(x_n)}{f\'(x_n)}$',
    ['$x_{n+1}=x_n-\\dfrac{f\'(x_n)}{f(x_n)}$',
     '$x_{n+1}=x_n+\\dfrac{f(x_n)}{f\'(x_n)}$',
     '$x_{n+1}=\\dfrac{f(x_n)}{f\'(x_n)}$'],
    ['On cherche $x$ tel que $y=0$ : $f\'(x_n)(x-x_n)+f(x_n)=0$.',
     'Donc $x-x_n=-\\dfrac{f(x_n)}{f\'(x_n)}$.',
     'Soit $' + col('x_{n+1}=x_n-\\dfrac{f(x_n)}{f\'(x_n)}') + '$ : c\'est la relation de la'
     ' méthode de Newton.'])

V396_RECURRENCE = case(
    NEWTON + '\n\nOn l\'applique à $f(x)=x^3-' + ev('A') + '$, pour approcher $\\sqrt[3]{'
    + ev('A') + '}$. Complète la relation de récurrence obtenue, écrite avec un seul quotient.'
    '\n\n$x_{n+1}=\\dfrac{?x_n^3+?}{?x_n^2}$',
    [var('A', '2..30')], ['2', ev('A'), '3'],
    ['$f\'(x)=3x^2$, donc $x_{n+1}=x_n-\\dfrac{x_n^3-' + ev('A') + '}{3x_n^2}$.',
     'Au même dénominateur : $x_{n+1}=\\dfrac{3x_n^3-x_n^3+' + ev('A') + '}{3x_n^2}$.',
     'Donc $' + col('x_{n+1}=\\dfrac{2x_n^3+' + ev('A') + '}{3x_n^2}') + '$.'],
    ['A != 8', 'A != 27'])

V396_ITERE = case(
    NEWTON + '\n\nOn l\'applique à $f(x)=x^3-' + ev('A') + '$ avec $x_0=' + ev('x0') + '$.'
    ' Calcule $x_1$ (valeur exacte).\n\n$x_1=?$',
    [var('A', '2..30'), var('x0', '1..3')], ev('(2*x0^3+A)/(3*x0^2)'),
    ['$f\'(x)=3x^2$, donc $x_1=x_0-\\dfrac{x_0^3-' + ev('A') + '}{3x_0^2}$.',
     'Avec $x_0=' + ev('x0') + '$ : $x_1=' + ev('x0') + '-\\dfrac{' + ev('x0^3') + '-' + ev('A') + '}{'
     + ev('3*x0^2') + '}$.',
     'Donc $' + col('x_1=' + ev('(2*x0^3+A)/(3*x0^2)')) + '$.'],
    ['A != x0^3', 'A != 8', 'A != 27'])

VARS_396 = {'A': 10, 'x0': 2}
MODELES.append(modele(
    '03-methode-de-newton-iteres-a-la-main', 'Méthode de Newton : calculer des itérés à la main',
    'Abscisse où la tangente coupe l\'axe des abscisses (case choix), relation de récurrence de'
    ' la méthode de Newton pour f(x) = x³ − A (trois cases), premier itéré exact (case)',
    4,
    [V396_FORMULE, V396_RECURRENCE, V396_ITERE],
    specs_choix(0, 'x_n − f/f\'', ['f\'/f', 'signe +', 'sans x_n'])
    + [spec('(2x³ + 10)/(3x²)', 1, ['2', '10', '3'], 'correct', {'A': 10}),
       spec('Erreur : 3x³ (x_n oublié au même dénominateur)', 1, ['3', '10', '3'], 'incorrect',
            {'A': 10}),
       spec('Erreur : −A (signe)', 1, ['2', '-10', '3'], 'incorrect', {'A': 10}),
       spec('x₁ = 13/6', 2, '\\frac{13}{6}', 'correct', VARS_396),
       spec('Erreur : 11/6 (signe +)', 2, '\\frac{11}{6}', 'incorrect', VARS_396),
       spec('Erreur : 7/2 (formule de Héron)', 2, '\\frac{7}{2}', 'incorrect', VARS_396)]))

# --- 4. TSPE-571 : convergence de la méthode de Héron -----------------------------------------

V_571 = [var('A', '2..20')]
# A sans facteur carré : √8, √12… s'afficheraient non simplifiés
C_571 = ['A != 4', 'A != 8', 'A != 9', 'A != 12', 'A != 16', 'A != 18', 'A != 20']
HERON = ('Soit la suite $(u_n)$ définie par $u_0>0$ et, pour tout entier naturel $n$,'
         ' $u_{n+1}=\\dfrac{1}{2}\\left(u_n+\\dfrac{' + ev('A') + '}{u_n}\\right)$ (méthode de'
         ' Héron). On admet que $u_n>0$ pour tout $n$.')
RA = '\\sqrt{' + ev('A') + '}'

V571_ECART = case(
    HERON + '\n\nPour comparer $u_{n+1}$ à $' + RA + '$, complète.\n\n$u_{n+1}-' + RA
    + '=\\dfrac{u_n^2-?' + RA + '\\,u_n+?}{2u_n}$',
    V_571, ['2', ev('A')],
    ['Au même dénominateur : $u_{n+1}-' + RA + '=\\dfrac{u_n^2+' + ev('A') + '-2' + RA
     + '\\,u_n}{2u_n}$.',
     'Le numérateur est une identité remarquable : $u_n^2-2' + RA + '\\,u_n+' + ev('A') + '=(u_n-'
     + RA + ')^2$, car $(' + RA + ')^2=' + ev('A') + '$.',
     'Donc $u_{n+1}-' + RA + '=\\dfrac{u_n^2-' + col('2') + RA + '\\,u_n+' + col(ev('A'))
     + '}{2u_n}=\\dfrac{(u_n-' + RA + ')^2}{2u_n}\\geqslant 0$ : $u_n\\geqslant ' + RA
     + '$ dès $n\\geqslant 1$.'],
    C_571)

V571_DECROISSANCE = justification(
    HERON + ' On a montré que $u_n\\geqslant ' + RA + '$ pour tout $n\\geqslant 1$, et $u_{n+1}-u_n'
    '=\\dfrac{' + ev('A') + '-u_n^2}{2u_n}$.\n\nPourquoi la suite est-elle décroissante à partir'
    ' du rang $1$ ?',
    V_571,
    '$u_n\\geqslant ' + RA + '$ donne $u_n^2\\geqslant ' + ev('A') + '$, et $2u_n>0$ : le quotient'
    ' est négatif',
    ['$u_n\\leqslant ' + RA + '$, donc $' + ev('A') + '-u_n^2\\geqslant 0$',
     '$u_n>0$ suffit : le quotient est négatif',
     'Le numérateur $' + ev('A') + '-u_n^2$ est positif'],
    ['Pour $n\\geqslant 1$, $u_n\\geqslant ' + RA + '\\geqslant 0$, donc $u_n^2\\geqslant '
     + ev('A') + '$ : le numérateur $' + ev('A') + '-u_n^2$ est négatif.',
     'Le dénominateur $2u_n$ est strictement positif.',
     'Donc $' + col('u_{n+1}-u_n\\leqslant 0') + '$ : la suite est décroissante à partir du'
     ' rang $1$.'],
    C_571)

V571_LIMITE = case(
    HERON + ' On a montré qu\'elle est décroissante à partir du rang $1$ et minorée par $0$ : elle'
    ' converge vers un réel $\\ell$, et l\'on admet que $\\ell>0$.\n\nDétermine la valeur exacte de'
    ' $\\ell$.\n\n$\\ell=?$',
    V_571, RA,
    ['La fonction $x\\mapsto\\dfrac{1}{2}\\left(x+\\dfrac{' + ev('A') + '}{x}\\right)$ est continue'
     ' en $\\ell$, donc $\\ell=\\dfrac{1}{2}\\left(\\ell+\\dfrac{' + ev('A') + '}{\\ell}\\right)$.',
     'En multipliant par $2\\ell$ (non nul) : $2\\ell^2=\\ell^2+' + ev('A') + '$, soit $\\ell^2='
     + ev('A') + '$.',
     'Comme $\\ell>0$ : $' + col('\\ell=' + RA) + '$ ; la méthode de Héron approche $' + RA
     + '$.'],
    C_571)

V571_PREUVE = ranger(
    'Soit $A>0$ et la suite $(u_n)$ définie par $u_0>0$ et'
    ' $u_{n+1}=\\dfrac{1}{2}\\left(u_n+\\dfrac{A}{u_n}\\right)$, dont tous les termes sont'
    ' strictement positifs. On démontre qu\'elle converge vers $\\sqrt{A}$.',
    ['$u_{n+1}-\\sqrt{A}=\\dfrac{(u_n-\\sqrt{A})^2}{2u_n}\\geqslant 0$ : $u_n\\geqslant\\sqrt{A}$'
     ' pour tout $n\\geqslant 1$.',
     '$u_{n+1}-u_n=\\dfrac{A-u_n^2}{2u_n}\\leqslant 0$ pour $n\\geqslant 1$ : la suite est'
     ' décroissante à partir du rang $1$.',
     'Décroissante et minorée par $\\sqrt{A}$, elle converge vers un réel $\\ell\\geqslant'
     '\\sqrt{A}>0$.',
     'Par continuité de $x\\mapsto\\dfrac{1}{2}\\left(x+\\dfrac{A}{x}\\right)$ en $\\ell$ :'
     ' $\\ell=\\dfrac{1}{2}\\left(\\ell+\\dfrac{A}{\\ell}\\right)$, soit $\\ell^2=A$.',
     'Comme $\\ell>0$, $\\ell=\\sqrt{A}$.'],
    ['On minore d\'abord la suite par $\\sqrt{A}$, puis on en déduit qu\'elle décroît.',
     'Décroissante et minorée, elle converge ; sa limite est un point fixe positif :'
     ' $' + col('\\ell=\\sqrt{A}') + '$.'])

VARS_571 = {'A': 7}
MODELES.append(modele(
    '04-demontrer-convergence-methode-de-heron', 'Démontrer la convergence de la méthode de Héron',
    'Écart u_{n+1} − √A mis au même dénominateur (deux cases), décroissance à partir du rang 1'
    ' (case choix), valeur exacte de la limite (case), convergence vers √A (étapes à'
    ' ranger)',
    5,
    [V571_ECART, V571_DECROISSANCE, V571_LIMITE, V571_PREUVE],
    [spec('2 et 7', 0, ['2', '7'], 'correct', VARS_571),
     spec('Erreur : 1 (double produit oublié)', 0, ['1', '7'], 'incorrect', VARS_571),
     spec('Erreur : 49', 0, ['2', '49'], 'incorrect', VARS_571)]
    + specs_choix(1, 'u_n ≥ √A', ['u_n ≤ √A', 'u_n > 0 suffit', 'numérateur positif'], VARS_571)
    + [spec('ℓ = √7', 2, '\\sqrt{7}', 'correct', VARS_571),
       spec('Erreur : 7 (ℓ² au lieu de ℓ)', 2, '7', 'incorrect', VARS_571),
       spec('Erreur : −√7 (signe)', 2, '-\\sqrt{7}', 'incorrect', VARS_571)]
    + ['RANGER:3']))


# --- Specs « ranger » : positions affichées calculées par le générateur (graine 0) -------------

def positions(chemin, vi):
    out = subprocess.run(['pnpm', 'exec', 'tsx', 'docs/wip/questions/positions-ranger.ts', chemin,
                          str(vi)],
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
