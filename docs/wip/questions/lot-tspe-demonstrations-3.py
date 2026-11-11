"""Écrit les 5 modèles du lot 3 « démonstrations : dérivation, logarithme, primitives » de la
terminale spécialité dans scripts/questions/tspe-demonstrations-3/.

Phase 0 validée par David le 2026-11-11 (« je suis tes recos », D1 du journal
« docs/wip/questions-tspe-demonstrations-progress.md », § 2), un point par modèle :

| # | Point     | Titre                                                              | Nœud du point (prod), niveau                  |
| 1 | TSPE-421  | Démontrer que la courbe est au-dessus de ses tangentes si f″ ⩾ 0   | Convexité › inégalités de convexité, 4        |
| 2 | TSPE-448  | Démontrer la dérivée de la fonction logarithme népérien            | Logarithmes › dérivée, 3                      |
| 3 | TSPE-449  | Démontrer la limite en 0 de x ln x                                 | Limites de fonctions › croissances comp., 7   |
| 4 | TSPE-471  | Démontrer que deux primitives diffèrent d'une constante            | y′ = f › primitives : notion, 5               |
| 5 | TSPE-472  | Démontrer la résolution de y′ = ay                                 | Équations différentielles › y′ = ay (notion), 2 |

Forme (D1, Q2) : 3 variations à trous (case, ou case choix à 4 propositions) + une variation
« étapes à ranger » (` ```ranger `, `signe: aucun`). Valeurs tirées (Q3) : a pour 472 ; lettres
ailleurs.

Niveaux : après ceux déjà présents sur le nœud (relevé prod du 2026-11-11 : inégalités de
convexité 3, dérivée de ln 1-2, croissances comparées 3-6, primitives : notion 1-4, y′ = ay 1).
TSPE-472 est posé sur la NOTION « y′ = ay », qui n'a pas de sous-notion : le modèle y va.

    python3 docs/wip/questions/lot-tspe-demonstrations-3.py scripts/questions/tspe-demonstrations-3
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

# --- 1. TSPE-421 : f″ ⩾ 0 ⟹ courbe au-dessus de ses tangentes ------------------------------------

TANGENTE = 'y=f\'(a)(x-a)+f(a)'
INTRO_421 = ('Soit $f$ une fonction deux fois dérivable sur un intervalle $I$, telle que'
             ' $f\'\'(x)\\geqslant 0$ pour tout $x$ de $I$, et $a$ un réel de $I$. On démontre que la'
             ' courbe de $f$ est au-dessus de sa tangente au point d\'abscisse $a$, d\'équation $'
             + TANGENTE + '$.\n\n'
             'On étudie la fonction $g$ définie sur $I$ par $g(x)=f(x)-f\'(a)(x-a)-f(a)$ : elle est'
             ' dérivable et $g\'(x)=f\'(x)-f\'(a)$.\n\n')

V421_SIGNE = justification(
    INTRO_421 + 'Pourquoi $g\'(x)\\leqslant 0$ pour $x\\leqslant a$ et $g\'(x)\\geqslant 0$ pour'
    ' $x\\geqslant a$ ?',
    [],
    'Car $f\'\'\\geqslant 0$ sur $I$, donc $f\'$ est croissante sur $I$.',
    ['Car $f\'\'\\geqslant 0$, donc $g\'(x)\\geqslant 0$ pour tout $x$ de $I$.',
     'Car $f$ est croissante sur $I$.',
     'Car $g(a)=0$.'],
    ['$f\'\'$ est la dérivée de $f\'$ : comme $f\'\'\\geqslant 0$, $f\'$ est croissante sur $I$.',
     'Pour $x\\leqslant a$, $f\'(x)\\leqslant f\'(a)$ ; pour $x\\geqslant a$, $f\'(x)\\geqslant'
     ' f\'(a)$ : c\'est le signe de $' + col('g\'(x)=f\'(x)-f\'(a)') + '$.',
     'C\'est $f\'$ qui est croissante, pas forcément $f$.'])
V421_VALEUR = case(
    INTRO_421 + '$g$ est décroissante pour $x\\leqslant a$ et croissante pour $x\\geqslant a$ : elle'
    ' atteint son minimum en $a$. Complète.\n\n$g(a)=?$',
    [], '0',
    ['$g(a)=f(a)-f\'(a)(a-a)-f(a)$.',
     'Or $a-a=0$, donc $g(a)=f(a)-f(a)=' + col('0') + '$.'])
V421_CONCLURE = justification(
    INTRO_421 + '$g$ a pour minimum $g(a)=0$ sur $I$. Que peut-on conclure ?',
    [],
    'Pour tout $x$ de $I$, $g(x)\\geqslant 0$, donc $f(x)\\geqslant f\'(a)(x-a)+f(a)$ : la courbe'
    ' est au-dessus de la tangente.',
    ['Pour tout $x$ de $I$, $g(x)=0$ : la courbe est confondue avec la tangente.',
     'Pour tout $x$ de $I$, $g(x)\\leqslant 0$ : la courbe est au-dessous de la tangente.',
     'On ne peut rien conclure sans connaître $f$.'],
    ['Le minimum de $g$ sur $I$ est $0$, donc $g(x)\\geqslant 0$ pour tout $x$ de $I$.',
     '$g(x)$ est l\'écart entre la courbe et la tangente : $' + col('f(x)\\geqslant'
                                                                   ' f\'(a)(x-a)+f(a)') + '$.',
     'Un minimum égal à $0$ ne veut pas dire que $g$ est nulle : seulement que $g$ ne descend pas'
     ' sous $0$.'])
V421_RANGER = ranger(
    'Soit $f$ une fonction deux fois dérivable sur un intervalle $I$, telle que $f\'\'\\geqslant 0$'
    ' sur $I$, et $a$ un réel de $I$. On démontre que la courbe de $f$ est au-dessus de sa'
    ' tangente au point d\'abscisse $a$.',
    ['On pose $g(x)=f(x)-f\'(a)(x-a)-f(a)$ sur $I$ ; $g\'(x)=f\'(x)-f\'(a)$.',
     'Comme $f\'\'\\geqslant 0$, $f\'$ est croissante : $g\'\\leqslant 0$ pour $x\\leqslant a$ et'
     ' $g\'\\geqslant 0$ pour $x\\geqslant a$.',
     '$g$ a donc pour minimum $g(a)=0$ sur $I$.',
     'Pour tout $x$ de $I$, $g(x)\\geqslant 0$ : $f(x)\\geqslant f\'(a)(x-a)+f(a)$.'],
    ['On étudie le signe de l\'écart $g$ entre la courbe et la tangente.',
     'Conclusion : la courbe de $f$ est ' + '$' + col('\\text{au-dessus}') + '$ de chacune de ses'
     ' tangentes.'])

MODELES.append(modele(
    '01-demontrer-courbe-au-dessus-des-tangentes',
    'Démontrer que la courbe est au-dessus de ses tangentes quand f″ est positive',
    'Démonstration à trous : f′ croissante (choix), g(a) = 0 (case), conclusion g ⩾ 0 (choix) ;'
    ' étapes à ranger',
    4,
    [V421_SIGNE, V421_VALEUR, V421_CONCLURE, V421_RANGER],
    specs_choix(0, 'f′ croissante', ['g′ ⩾ 0 partout', 'f croissante', 'g(a) = 0'])
    + [spec('0', 1, '0', 'correct'),
       spec('Erreur : 1', 1, '1', 'incorrect'),
       spec('Erreur : a', 1, 'a', 'incorrect')]
    + specs_choix(2, 'g ⩾ 0', ['g = 0', 'g ⩽ 0', 'rien'])
    + ['RANGER:3']))

# --- 2. TSPE-448 : dérivée de ln (dérivabilité admise) --------------------------------------------

INTRO_448 = ('On admet que la fonction $\\ln$ est dérivable sur $]0\\,;\\,+\\infty[$. On démontre que,'
             ' pour tout $x>0$, $\\ln\'(x)=\\dfrac{1}{x}$.\n\n')

V448_RECIPROQUE = case(
    INTRO_448 + 'On part d\'une égalité vraie pour tout $x>0$. Complète.\n\n$e^{\\ln x}=?$',
    [], 'x',
    ['$\\ln x$ est le réel dont l\'exponentielle vaut $x$.',
     'Donc, pour tout $x>0$, $e^{\\ln x}=' + col('x') + '$.'])
V448_DERIVER = justification(
    INTRO_448 + 'Pour tout $x>0$, $e^{\\ln x}=x$. On dérive les deux membres. Quelle est la dérivée'
    ' de $x\\mapsto e^{\\ln x}$ ?',
    [],
    '$x\\mapsto\\ln\'(x)\\,e^{\\ln x}$',
    ['$x\\mapsto e^{\\ln x}$',
     '$x\\mapsto e^{\\ln\'(x)}$',
     '$x\\mapsto\\ln\'(x)\\,\\ln x$'],
    ['La dérivée de $x\\mapsto e^{u(x)}$ est $x\\mapsto u\'(x)\\,e^{u(x)}$.',
     'Avec $u=\\ln$, la dérivée de $x\\mapsto e^{\\ln x}$ est $x\\mapsto' + col('\\ln\'(x)\\,'
                                                                              'e^{\\ln x}') + '$.',
     'On n\'oublie pas le facteur $u\'(x)$ : $e^{\\ln x}$ seul serait la dérivée si $u\'=1$.'])
V448_CONCLURE = case(
    INTRO_448 + 'En dérivant $e^{\\ln x}=x$, on obtient $\\ln\'(x)\\,e^{\\ln x}=1$, c\'est-à-dire'
    ' $\\ln\'(x)\\times x=1$. Complète.\n\n$\\ln\'(x)=?$',
    [], '\\dfrac{1}{x}',
    ['$e^{\\ln x}=x$, donc l\'égalité s\'écrit $\\ln\'(x)\\times x=1$.',
     'Comme $x>0$, on divise par $x$ : $\\ln\'(x)=' + col('\\dfrac{1}{x}') + '$.'])
V448_RANGER = ranger(
    'On admet que la fonction $\\ln$ est dérivable sur $]0\\,;\\,+\\infty[$. On démontre que, pour'
    ' tout $x>0$, $\\ln\'(x)=\\dfrac{1}{x}$.',
    ['Pour tout $x>0$, $e^{\\ln x}=x$.',
     'On dérive les deux membres : $\\ln\'(x)\\,e^{\\ln x}=1$.',
     'Comme $e^{\\ln x}=x$, cela s\'écrit $\\ln\'(x)\\times x=1$.',
     'On divise par $x>0$ : $\\ln\'(x)=\\dfrac{1}{x}$.'],
    ['On dérive l\'égalité $e^{\\ln x}=x$, la dérivabilité de $\\ln$ étant admise.',
     'Conclusion : $' + col('\\ln\'(x)=\\dfrac{1}{x}') + '$ pour tout $x>0$.'])

MODELES.append(modele(
    '02-demontrer-derivee-logarithme',
    'Démontrer la dérivée de la fonction logarithme népérien',
    'Démonstration à trous : e^(ln x) = x (case), dérivée de e^(ln x) (choix), ln′(x) = 1/x'
    ' (case) ; étapes à ranger',
    3,
    [V448_RECIPROQUE, V448_DERIVER, V448_CONCLURE, V448_RANGER],
    [spec('x', 0, 'x', 'correct'),
     spec('Erreur : 1', 0, '1', 'incorrect'),
     spec('Erreur : eˣ', 0, 'e^{x}', 'incorrect'),
     spec('Erreur : ln x', 0, '\\ln(x)', 'incorrect')]
    + specs_choix(1, 'ln′(x) e^(ln x)', ['e^(ln x)', 'e^(ln′(x))', 'ln′(x) ln x'])
    + [spec('1/x', 2, '\\dfrac{1}{x}', 'correct'),
       spec('Écriture \\frac (saisie MathLive)', 2, '\\frac{1}{x}', 'correct'),
       spec('Erreur : x', 2, 'x', 'incorrect'),
       spec('Erreur : −1/x²', 2, '-\\dfrac{1}{x^2}', 'incorrect'),
       spec('Erreur : 1', 2, '1', 'incorrect')]
    + ['RANGER:3']))

# --- 3. TSPE-449 : limite en 0 de x ln x ------------------------------------------------------------

INTRO_449 = ('On démontre que $\\displaystyle\\lim_{x\\to 0^+}x\\ln x=0$. On sait que'
             ' $\\displaystyle\\lim_{X\\to-\\infty}Xe^X=0$ (croissance comparée).\n\n'
             'Pour $x>0$, on pose $X=\\ln x$.\n\n')

V449_ECRIRE = case(
    INTRO_449 + 'Comme $x=e^{X}$, complète.\n\n$x\\ln x=X\\times ?$',
    [], 'e^{X}',
    ['$X=\\ln x$, donc $x=e^{\\ln x}=e^{X}$.',
     'Donc $x\\ln x=e^{X}\\times X=X\\times' + col('e^{X}') + '$.'])
V449_LIMITE_X = justification(
    INTRO_449 + 'Que devient $X=\\ln x$ quand $x$ tend vers $0$ par valeurs positives ?',
    [],
    '$X$ tend vers $-\\infty$.',
    ['$X$ tend vers $0$.',
     '$X$ tend vers $+\\infty$.',
     '$X$ tend vers $1$.'],
    ['On sait que $\\displaystyle\\lim_{x\\to 0^+}\\ln x=-\\infty$.',
     'Donc, quand $x\\to 0^+$, $X=\\ln x$ tend vers $' + col('-\\infty') + '$.',
     'C\'est $\\ln 1$ qui vaut $0$, pas la limite de $\\ln x$ en $0$.'])
V449_CONCLURE = justification(
    INTRO_449 + 'On a $x\\ln x=Xe^X$, et $X\\to-\\infty$ quand $x\\to 0^+$. Pourquoi peut-on'
    ' conclure que $\\displaystyle\\lim_{x\\to 0^+}x\\ln x=0$ ?',
    [],
    'Par composition : $X\\to-\\infty$ et $\\displaystyle\\lim_{X\\to-\\infty}Xe^X=0$.',
    ['$x\\to 0$, donc le produit $x\\ln x$ tend vers $0$.',
     '$\\ln x\\to-\\infty$, donc $x\\ln x\\to-\\infty$.',
     'On ne peut pas conclure : « $0\\times\\infty$ » est une forme indéterminée.'],
    ['Quand $x\\to 0^+$, $X=\\ln x\\to-\\infty$.',
     'Et $Xe^X\\to 0$ quand $X\\to-\\infty$ : par composition, $'
     + col('\\displaystyle\\lim_{x\\to 0^+}x\\ln x=0') + '$.',
     '« $0\\times\\infty$ » est bien indéterminé : c\'est pour lever l\'indétermination qu\'on'
     ' change de variable.'])
V449_RANGER = ranger(
    'On démontre que $\\displaystyle\\lim_{x\\to 0^+}x\\ln x=0$, en utilisant'
    ' $\\displaystyle\\lim_{X\\to-\\infty}Xe^X=0$.',
    ['Pour $x>0$, on pose $X=\\ln x$, de sorte que $x=e^{X}$.',
     'Alors $x\\ln x=Xe^{X}$.',
     'Quand $x\\to 0^+$, $X=\\ln x\\to-\\infty$.',
     'Par composition, $\\displaystyle\\lim_{x\\to 0^+}x\\ln x=\\lim_{X\\to-\\infty}Xe^X=0$.'],
    ['On lève la forme indéterminée « $0\\times\\infty$ » par le changement de variable'
     ' $X=\\ln x$.',
     'Conclusion : $' + col('\\displaystyle\\lim_{x\\to 0^+}x\\ln x=0') + '$.'])

MODELES.append(modele(
    '03-demontrer-limite-x-ln-x-en-0',
    'Démontrer la limite en 0 de x ln x',
    'Démonstration à trous : x ln x = X e^X (case), X → −∞ (choix), composition (choix) ; étapes à'
    ' ranger',
    7,
    [V449_ECRIRE, V449_LIMITE_X, V449_CONCLURE, V449_RANGER],
    [spec('e^X', 0, 'e^{X}', 'correct'),
     spec('Erreur : X', 0, 'X', 'incorrect'),
     spec('Erreur : ln X', 0, '\\ln(X)', 'incorrect'),
     spec('Erreur : x', 0, 'x', 'incorrect')]
    + specs_choix(1, '−∞', ['0', '+∞', '1'])
    + specs_choix(2, 'composition', ['x → 0', '−∞', 'forme indéterminée'])
    + ['RANGER:3']))

# --- 4. TSPE-471 : deux primitives diffèrent d'une constante ----------------------------------------

INTRO_471 = ('Soit $f$ une fonction continue sur un intervalle $I$, et $F$ et $G$ deux primitives de'
             ' $f$ sur $I$. On démontre qu\'il existe un réel $c$ tel que $F(x)=G(x)+c$ pour tout $x$'
             ' de $I$.\n\nOn pose $H=F-G$ sur $I$.\n\n')

V471_DERIVEE = case(
    INTRO_471 + 'Complète, pour tout $x$ de $I$.\n\n$H\'(x)=?$',
    [], '0',
    ['$F$ et $G$ sont des primitives de $f$ : $F\'=f$ et $G\'=f$.',
     'Donc $H\'(x)=F\'(x)-G\'(x)=f(x)-f(x)=' + col('0') + '$.'])
V471_CONSTANTE = justification(
    INTRO_471 + 'Pour tout $x$ de $I$, $H\'(x)=0$. Pourquoi $H$ est-elle constante sur $I$ ?',
    [],
    'Une fonction dérivable de dérivée nulle sur un intervalle est constante sur cet intervalle.',
    ['Car $H(0)=0$.',
     'Car $F$ et $G$ sont égales.',
     'Car $f$ est continue sur $I$.'],
    ['$H\'=0$ sur $I$ : $H$ est à la fois croissante et décroissante sur $I$.',
     '$I$ est un intervalle, donc $H$ est ' + '$' + col('\\text{constante}') + '$ sur $I$ : il'
     ' existe un réel $c$ tel que $H(x)=c$.',
     'L\'hypothèse « intervalle » compte : sur une réunion de deux intervalles, $H$ peut prendre'
     ' une valeur différente sur chacun.'])
V471_CONCLURE = justification(
    INTRO_471 + 'Il existe un réel $c$ tel que $H(x)=c$ pour tout $x$ de $I$. Que peut-on conclure ?',
    [],
    'Pour tout $x$ de $I$, $F(x)=G(x)+c$.',
    ['Pour tout $x$ de $I$, $F(x)=G(x)$.',
     'Pour tout $x$ de $I$, $F(x)=c\\,G(x)$.',
     'Pour tout $x$ de $I$, $F(x)=c$.'],
    ['$H(x)=F(x)-G(x)=c$.',
     'Donc $' + col('F(x)=G(x)+c') + '$ : deux primitives de $f$ sur $I$ diffèrent d\'une'
     ' constante.',
     'La constante $c$ n\'est pas forcément nulle : $F$ et $G$ peuvent être différentes.'])
V471_RANGER = ranger(
    'Soit $f$ une fonction continue sur un intervalle $I$, et $F$ et $G$ deux primitives de $f$ sur'
    ' $I$. On démontre que $F$ et $G$ diffèrent d\'une constante.',
    ['On pose $H=F-G$ sur $I$.',
     'Pour tout $x$ de $I$, $H\'(x)=F\'(x)-G\'(x)=f(x)-f(x)=0$.',
     '$H$ a une dérivée nulle sur l\'intervalle $I$ : elle est constante, égale à un réel $c$.',
     'Donc, pour tout $x$ de $I$, $F(x)=G(x)+c$.'],
    ['On étudie la différence des deux primitives.',
     'Conclusion : $' + col('F=G+c') + '$ sur $I$.'])

MODELES.append(modele(
    '04-demontrer-primitives-different-d-une-constante',
    'Démontrer que deux primitives d\'une même fonction diffèrent d\'une constante',
    'Démonstration à trous : H′ = 0 (case), dérivée nulle sur un intervalle (choix), F = G + c'
    ' (choix) ; étapes à ranger',
    5,
    [V471_DERIVEE, V471_CONSTANTE, V471_CONCLURE, V471_RANGER],
    [spec('0', 0, '0', 'correct'),
     spec('Erreur : 1', 0, '1', 'incorrect'),
     spec('Erreur : 2f(x)', 0, '2f(x)', 'incorrect')]
    + specs_choix(1, 'dérivée nulle sur un intervalle', ['H(0) = 0', 'F = G', 'f continue'])
    + specs_choix(2, 'F = G + c', ['F = G', 'F = cG', 'F = c'])
    + ['RANGER:3']))

# --- 5. TSPE-472 : résolution de y′ = ay (a tiré dans une variation) ---------------------------------

INTRO_472 = ('Soit $a$ un réel. On démontre que les solutions sur $\\mathbb{R}$ de l\'équation'
             ' différentielle $y\'=ay$ sont les fonctions $x\\mapsto Ce^{ax}$, où $C$ est un réel.\n\n')
V_A = [var('a', '-6..6!0,1,-1')]
VA = {'a': -3}

V472_SOLUTION = case(
    INTRO_472 + 'On vérifie d\'abord, sur un exemple, que $x\\mapsto e^{ax}$ est solution. Complète'
    ' la dérivée de $x\\mapsto e^{ ' + v('a') + 'x}$.\n\n'
    '$\\left(e^{ ' + v('a') + 'x}\\right)\'=?\\,e^{ ' + v('a') + 'x}$',
    V_A, v('a'),
    ['La dérivée de $x\\mapsto e^{kx}$ est $x\\mapsto ke^{kx}$.',
     'Ici $k=' + v('a') + '$ : $\\left(e^{ ' + v('a') + 'x}\\right)\'=' + col(v('a'))
     + '\\,e^{ ' + v('a') + 'x}$, donc $x\\mapsto e^{ ' + v('a') + 'x}$ est solution de $y\'='
     + v('a') + 'y$.'])
V472_NULLE = justification(
    INTRO_472 + 'Soit $y$ une solution. On pose $z(x)=y(x)e^{-ax}$ ; on calcule'
    ' $z\'(x)=\\big(y\'(x)-ay(x)\\big)e^{-ax}$. Pourquoi $z\'(x)=0$ pour tout réel $x$ ?',
    [],
    'Car $y$ est solution : $y\'(x)=ay(x)$, donc $y\'(x)-ay(x)=0$.',
    ['Car $e^{-ax}\\neq 0$.',
     'Car $z$ est constante.',
     'Car $y(0)=0$.'],
    ['$y$ est solution de $y\'=ay$ : pour tout $x$, $y\'(x)=ay(x)$.',
     'Donc $y\'(x)-ay(x)=0$ et $' + col('z\'(x)=0') + '$.',
     '« $z$ est constante » est ce qu\'on cherche à établir : on ne peut pas s\'en servir.'])
V472_CONCLURE = justification(
    INTRO_472 + 'Soit $y$ une solution et $z(x)=y(x)e^{-ax}$. On a $z\'=0$ sur $\\mathbb{R}$.'
    ' Que peut-on conclure ?',
    [],
    '$z$ est constante, égale à un réel $C$ : $y(x)=Ce^{ax}$ pour tout réel $x$.',
    ['$z$ est nulle, donc $y$ est la fonction nulle.',
     '$z$ est constante, égale à $C$ : $y(x)=Ce^{-ax}$.',
     '$z$ est constante, égale à $C$ : $y(x)=C+e^{ax}$.'],
    ['$z\'=0$ sur l\'intervalle $\\mathbb{R}$ : $z$ est constante, égale à un réel $C$.',
     '$y(x)e^{-ax}=C$, et on multiplie par $e^{ax}$ : $' + col('y(x)=Ce^{ax}') + '$.',
     'Diviser par $e^{-ax}$, c\'est multiplier par $e^{ax}$ : l\'exposant change de signe.'])
V472_RANGER = ranger(
    'Soit $a$ un réel. On démontre que les solutions sur $\\mathbb{R}$ de $y\'=ay$ sont les'
    ' fonctions $x\\mapsto Ce^{ax}$, où $C$ est un réel.',
    ['Pour tout réel $C$, $x\\mapsto Ce^{ax}$ a pour dérivée $x\\mapsto aCe^{ax}$ : c\'est une'
     ' solution.',
     'Réciproquement, soit $y$ une solution ; on pose $z(x)=y(x)e^{-ax}$.',
     '$z\'(x)=\\big(y\'(x)-ay(x)\\big)e^{-ax}=0$, donc $z$ est constante, égale à un réel $C$.',
     'Donc $y(x)=Ce^{ax}$ pour tout réel $x$.'],
    ['On vérifie que ces fonctions sont solutions, puis que toute solution est de cette forme.',
     'Conclusion : les solutions de $y\'=ay$ sont les fonctions $' + col('x\\mapsto Ce^{ax}')
     + '$.'])

MODELES.append(modele(
    '05-demontrer-resolution-y-prime-egal-ay',
    'Démontrer la résolution de l\'équation différentielle y′ = ay',
    'Démonstration à trous : dérivée de e^(ax) (case, a tiré), z′ = 0 (choix), y = Ce^(ax)'
    ' (choix) ; étapes à ranger',
    2,
    [V472_SOLUTION, V472_NULLE, V472_CONCLURE, V472_RANGER],
    [spec('a = −3', 0, '-3', 'correct', VA),
     spec('Erreur : 3', 0, '3', 'incorrect', VA),
     spec('Erreur : 1', 0, '1', 'incorrect', VA),
     spec('Erreur : −3x', 0, '-3x', 'incorrect', VA)]
    + specs_choix(1, 'y′ = ay', ['e^(−ax) ≠ 0', 'circulaire', 'y(0) = 0'])
    + specs_choix(2, 'y = Ce^(ax)', ['y nulle', 'Ce^(−ax)', 'C + e^(ax)'])
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
