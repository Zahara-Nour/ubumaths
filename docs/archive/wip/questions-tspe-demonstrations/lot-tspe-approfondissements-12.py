"""Écrit les 5 modèles du lot 12 « approfondissements : limites et continuité » de la terminale
spé dans scripts/questions/tspe-approfondissements-12/.

Phase 0 validée par David le 2026-11-13 (D3 du journal
« docs/wip/questions-tspe-demonstrations-progress.md », § 35), un point par modèle :

| # | Point    | Titre                                                           | Niv. | Nœud du modèle                         |
| 1 | TSPE-406 | Asymptote oblique : équation, division, position                | 2    | Limites de fonctions › asymptotes      |
| 2 | TSPE-584 | Branches infinies : asymptote ou branche parabolique            | 3    | Limites de fonctions › asymptotes      |
| 3 | TSPE-435 | Démontrer le théorème des valeurs intermédiaires par dichotomie | 3    | Continuité › valeurs intermédiaires    |
| 4 | TSPE-436 | Fonctions continues telles que f(x + y) = f(x) + f(y)           | 4    | Continuité › continuité en un point ¹  |
| 5 | TSPE-437 | Prolongement par continuité en un point                         | 3    | Continuité › continuité en un point    |

¹ Le point 436 est sur la notion Continuité ; faute de mieux, le modèle va sur « continuité en un
point » (D3, Q4), sans nœud neuf. Niveaux au-dessus de ceux de la prod (relevé MCP du 2026-11-14 :
1 au plus sur « asymptotes », 2 sur « valeurs intermédiaires » et sur « continuité en un point »).

Forme (D3, Q2) : 435 et 436 sont des preuves (cases, cases choix à 4 propositions dont la première
est la bonne, variation « étapes à ranger », positions calculées par le générateur, graine 0) ;
406, 584 et 437 des applications à valeurs tirées. Le résultat hors programme est donné dans
l'énoncé (classement des branches infinies pour 584). 435 n'est pas l'algorithme 433 (dichotomie en
Python) : c'est la preuve du TVI par les suites adjacentes.

Pièges : pas de variable `e` (lue comme le nombre d'Euler) ; un coefficient tiré dans un exposant
ne vaut jamais ±1 (`e^{1x}` ne serait pas nettoyé) ; le numérateur d'une fraction tirée reste
positif (`+\\dfrac{-3}{…}` ne serait pas nettoyé).

    python3 docs/archive/wip/questions-tspe-demonstrations/lot-tspe-approfondissements-12.py scripts/questions/tspe-approfondissements-12
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


def cf(k):
    """Coefficient devant une lettre : 1 et −1 écrits sans chiffre (le nettoyage ne passe pas
    dans les formules en f(x) = …)."""
    return '{{if:' + k + '==1||{{if:' + k + '==-1|-|' + ev(k) + '}}}}'


def cfs(k):
    """Coefficient signé devant une lettre (+x, −x, +3x)."""
    return '{{if:' + k + '==1|+|{{if:' + k + '==-1|-|' + ev(k + ';+') + '}}}}'


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


LIM_P = '\\displaystyle\\lim_{x\\to+\\infty}'
MODELES = []

# --- 1. TSPE-406 : asymptotes obliques --------------------------------------------------------

V406_DEFINITION = justification(
    'Soit $f$ une fonction définie sur $]0;+\\infty[$, de courbe $\\mathcal{C}_f$, et $D$ la droite'
    ' d\'équation $y=mx+p$, avec $m\\neq 0$.\n\nÀ quelle condition $D$ est-elle **asymptote'
    ' oblique** à $\\mathcal{C}_f$ en $+\\infty$ ?',
    [],
    '$' + LIM_P + '\\big(f(x)-(mx+p)\\big)=0$',
    ['$' + LIM_P + '\\dfrac{f(x)}{x}=m$',
     '$' + LIM_P + 'f(x)=+\\infty$',
     '$f(x)-(mx+p)>0$ pour tout $x>0$'],
    ['Par définition, $D$ est asymptote oblique en $+\\infty$ si l\'écart vertical entre la'
     ' courbe et la droite tend vers $0$.',
     '$\\dfrac{f(x)}{x}\\to m$ est une **conséquence** de cette définition, pas une condition'
     ' suffisante : $f(x)=x+\\sqrt{x}$ vérifie $\\dfrac{f(x)}{x}\\to 1$ sans asymptote.',
     'La condition est $' + col(LIM_P + '\\big(f(x)-(mx+p)\\big)=0') + '$.'])

V_406 = [var('a', '1..3;±'), var('b', '1..5;±'), var('c', '1..5'), var('d', '1..3;±')]
F_406 = cf('a') + 'x' + ev('b;+') + '+\\dfrac{' + ev('c') + '}{x' + ev('-d;+') + '}'

V406_LECTURE = case(
    'La fonction $f$ est définie sur $]' + ev('d') + ';+\\infty[$ par $f(x)=' + F_406 + '$.\n\n'
    'Donne l\'équation de l\'asymptote oblique $D$ à sa courbe en $+\\infty$.\n\n$D : y=?x+?$',
    V_406, [ev('a'), ev('b')],
    ['$f(x)-(' + cf('a') + 'x' + ev('b;+') + ')=\\dfrac{' + ev('c') + '}{x' + ev('-d;+') + '}$.',
     'Or $' + LIM_P + '\\dfrac{' + ev('c') + '}{x' + ev('-d;+') + '}=0$ : l\'écart entre la'
     ' courbe et la droite tend vers $0$.',
     'Donc $' + col('D : y=' + cf('a') + 'x' + ev('b;+')) + '$.'])

V406_DIVISION = case(
    'La fonction $f$ est définie sur $]' + ev('d') + ';+\\infty[$ par $f(x)=\\dfrac{' + cf('a')
    + 'x^2' + cfs('k1') + 'x' + ev('k2;+') + '}{x' + ev('-d;+') + '}$.\n\nComplète l\'écriture'
    ' de $f(x)$, qui donne l\'asymptote oblique $y=mx+p$ en $+\\infty$.\n\n'
    '$f(x)=?x+?+\\dfrac{?}{x' + ev('-d;+') + '}$',
    [var('a', '1..3'), var('b', '1..5;±'), var('c', '1..5'), var('d', '1..3;±'),
     var('k1', 'eval:(b)-(a)*(d)'), var('k2', 'eval:(c)-(b)*(d)')],
    [ev('a'), ev('b'), ev('c')],
    ['On cherche $m$, $p$ et $r$ tels que $(mx+p)(x' + ev('-d;+') + ')+r=' + cf('a') + 'x^2'
     + cfs('k1') + 'x' + ev('k2;+') + '$.',
     'En développant : $mx^2+(p' + ev('-d;+') + 'm)x+r' + ev('-d;+') + 'p$. Par identification,'
     ' $m=' + ev('a') + '$, puis $p=' + ev('b') + '$, puis $r=' + ev('c') + '$.',
     'Donc $f(x)=' + col(ev('a')) + 'x+' + col(ev('b;()')) + '+\\dfrac{' + col(ev('c')) + '}{x'
     + ev('-d;+') + '}$ : la droite $y=' + cf('a') + 'x' + ev('b;+') + '$ est asymptote oblique.'],
    ['k1 != 0', 'k2 != 0'])

V406_POSITION = justification(
    'La fonction $f$ est définie sur $\\mathbb{R}\\setminus\\{' + ev('d') + '\\}$ par $f(x)='
    + F_406 + '$. La droite $D : y=' + cf('a') + 'x' + ev('b;+') + '$ est asymptote oblique à'
    ' sa courbe $\\mathcal{C}_f$.\n\nQuelle est la position de $\\mathcal{C}_f$ par rapport à $D$'
    ' sur $]-\\infty;' + ev('d') + '[$ ?',
    V_406,
    '$\\mathcal{C}_f$ est au-dessous de $D$',
    ['$\\mathcal{C}_f$ est au-dessus de $D$',
     '$\\mathcal{C}_f$ coupe $D$ en un seul point',
     '$\\mathcal{C}_f$ et $D$ sont confondues'],
    ['On étudie le signe de $f(x)-(' + cf('a') + 'x' + ev('b;+') + ')=\\dfrac{' + ev('c') + '}{x'
     + ev('-d;+') + '}$.',
     'Pour $x<' + ev('d') + '$, $x' + ev('-d;+') + '<0$ et $' + ev('c') + '>0$ : le quotient est'
     ' strictement négatif.',
     'Donc, sur $]-\\infty;' + ev('d') + '[$, $' + col('\\mathcal{C}_f\\text{ est au-dessous de }D')
     + '$.'])

VARS_406 = {'a': 2, 'b': -3, 'c': 4, 'd': 1}
VARS_406_D = {'a': 2, 'b': 1, 'c': 3, 'd': 2, 'k1': -3, 'k2': 1}
MODELES.append(modele(
    '01-asymptote-oblique', 'Asymptote oblique : équation, division, position',
    'Définition d\'une asymptote oblique (case choix), équation lue sur f(x) = ax + b + c/(x − d)'
    ' (deux cases), écriture d\'une fraction rationnelle sous la forme mx + p + r/(x − d) (trois'
    ' cases), position de la courbe par rapport à l\'asymptote (case choix)',
    2,
    [V406_DEFINITION, V406_LECTURE, V406_DIVISION, V406_POSITION],
    specs_choix(0, 'écart de limite nulle', ['f(x)/x → m', 'f → +∞', 'écart positif'])
    + [spec('y = 2x − 3', 1, ['2', '-3'], 'correct', VARS_406),
       spec('Erreur : signe de b', 1, ['2', '3'], 'incorrect', VARS_406),
       spec('Erreur : b + c', 1, ['2', '1'], 'incorrect', VARS_406),
       spec('2x + 1 + 3/(x − 2)', 2, ['2', '1', '3'], 'correct', VARS_406_D),
       spec('Erreur : p = k1 (division oubliée)', 2, ['2', '-3', '3'], 'incorrect', VARS_406_D),
       spec('Erreur : r = k2', 2, ['2', '1', '1'], 'incorrect', VARS_406_D)]
    + specs_choix(3, 'au-dessous', ['au-dessus', 'coupe', 'confondues'], VARS_406)))

# --- 2. TSPE-584 : branches infinies ----------------------------------------------------------

RAPPEL_584 = (
    'On admet le classement suivant. Si $' + LIM_P + 'f(x)=+\\infty$, on étudie'
    ' $\\dfrac{f(x)}{x}$ en $+\\infty$ :\n\n'
    '- s\'il tend vers $+\\infty$, la courbe a une **branche parabolique de direction $(Oy)$** ;\n'
    '- s\'il tend vers $0$, une **branche parabolique de direction $(Ox)$** ;\n'
    '- s\'il tend vers un réel $a\\neq 0$, on étudie $f(x)-ax$ : s\'il tend vers un réel $b$, la'
    ' droite $y=ax+b$ est **asymptote oblique** ; s\'il tend vers $+\\infty$, la courbe a une'
    ' **branche parabolique de direction la droite $y=ax$**.')

def FRAC_X(k):
    """± |k|/x, le signe sorti de la fraction."""
    return '{{if:' + k + '>0|+|-}}\\dfrac{' + ev('abs(' + k + ')') + '}{x}'


NATURES = ['une branche parabolique de direction $(Oy)$',
           'une branche parabolique de direction $(Ox)$',
           'une asymptote oblique']

V584_OY = justification(
    'La fonction $f$ est définie sur $]0;+\\infty[$ par $f(x)=' + cf('a') + 'x^2' + ev('b;+') + 'x'
    + ev('c;+') + '$.\n\n' + RAPPEL_584 + '\n\nQuelle branche infinie la courbe de $f$'
    ' a-t-elle en $+\\infty$ ?',
    [var('a', '1..3'), var('b', '1..5;±'), var('c', '1..5;±')],
    NATURES[0],
    [NATURES[1], NATURES[2], 'une asymptote horizontale'],
    ['$' + LIM_P + 'f(x)=+\\infty$, car $' + ev('a') + '>0$ (terme de plus haut degré).',
     '$\\dfrac{f(x)}{x}=' + cf('a') + 'x' + ev('b;+') + FRAC_X('c') + '$, qui tend'
     ' vers $+\\infty$.',
     'Donc la courbe a $' + col('\\text{une branche parabolique de direction }(Oy)') + '$.'])

V584_OX = justification(
    'La fonction $f$ est définie sur $]0;+\\infty[$ par $f(x)=' + ev('a') + '\\ln(x)' + ev('b;+')
    + '$.\n\n' + RAPPEL_584 + '\n\nQuelle branche infinie la courbe de $f$ a-t-elle en'
    ' $+\\infty$ ?',
    [var('a', '2..5'), var('b', '1..5;±')],
    NATURES[1],
    [NATURES[0], NATURES[2], 'une asymptote horizontale'],
    ['$' + LIM_P + '\\ln(x)=+\\infty$ et $' + ev('a') + '>0$, donc $' + LIM_P + 'f(x)=+\\infty$.',
     '$\\dfrac{f(x)}{x}=' + ev('a') + '\\times\\dfrac{\\ln(x)}{x}' + FRAC_X('b') + '$, qui'
     ' tend vers $0$ par croissance comparée.',
     'Donc la courbe a $' + col('\\text{une branche parabolique de direction }(Ox)') + '$.'])

V_584_R = [var('a', '1..4'), var('b', '2..5')]
F_584_R = cf('a') + 'x+' + ev('b') + '\\sqrt{x}'

V584_PENTE = case(
    'La fonction $f$ est définie sur $]0;+\\infty[$ par $f(x)=' + F_584_R + '$, et $' + LIM_P
    + 'f(x)=+\\infty$.\n\nPour étudier sa branche infinie en $+\\infty$, calcule la limite'
    ' suivante.\n\n$' + LIM_P + '\\dfrac{f(x)}{x}=?$',
    V_584_R, ev('a'),
    ['Pour $x>0$, $\\dfrac{f(x)}{x}=' + ev('a') + '+\\dfrac{' + ev('b') + '\\sqrt{x}}{x}='
     + ev('a') + '+\\dfrac{' + ev('b') + '}{\\sqrt{x}}$.',
     'Or $' + LIM_P + '\\dfrac{1}{\\sqrt{x}}=0$.',
     'Donc $' + col(LIM_P + '\\dfrac{f(x)}{x}=' + ev('a')) + '$.'])

V584_NATURE = justification(
    'La fonction $f$ est définie sur $]0;+\\infty[$ par $f(x)=' + F_584_R + '$ ; on a $' + LIM_P
    + 'f(x)=+\\infty$ et $' + LIM_P + '\\dfrac{f(x)}{x}=' + ev('a') + '$.\n\n' + RAPPEL_584
    + '\n\nQuelle branche infinie la courbe de $f$ a-t-elle en $+\\infty$ ?',
    V_584_R,
    'une branche parabolique de direction la droite $y=' + cf('a') + 'x$',
    ['une asymptote oblique d\'équation $y=' + cf('a') + 'x$', NATURES[0], NATURES[1]],
    ['$\\dfrac{f(x)}{x}$ tend vers $' + ev('a') + '\\neq 0$ : on étudie $f(x)-' + cf('a')
     + 'x=' + ev('b') + '\\sqrt{x}$.',
     '$' + LIM_P + ev('b') + '\\sqrt{x}=+\\infty$ : l\'écart ne tend pas vers un réel, il n\'y a'
     ' pas d\'asymptote.',
     'Donc la courbe a $' + col('\\text{une branche parabolique de direction la droite }y='
                               + cf('a') + 'x') + '$.'])

MODELES.append(modele(
    '02-branches-infinies', 'Branches infinies : asymptote ou branche parabolique',
    'Classement donné dans l\'énoncé : branche parabolique de direction (Oy) pour un polynôme du'
    ' second degré, de direction (Ox) pour a ln(x) + b (cases choix), limite de f(x)/x pour'
    ' f(x) = ax + b√x (case), branche parabolique de direction y = ax (case choix)',
    3,
    [V584_OY, V584_OX, V584_PENTE, V584_NATURE],
    specs_choix(0, 'direction (Oy)', ['direction (Ox)', 'asymptote oblique', 'horizontale'])
    + specs_choix(1, 'direction (Ox)', ['direction (Oy)', 'asymptote oblique', 'horizontale'])
    + [spec('limite 3', 2, '3', 'correct', {'a': 3, 'b': 2}),
       spec('Erreur : 0', 2, '0', 'incorrect', {'a': 3, 'b': 2}),
       spec('Erreur : a + b', 2, '5', 'incorrect', {'a': 3, 'b': 2})]
    + specs_choix(3, 'direction y = ax', ['asymptote y = ax', 'direction (Oy)', 'direction (Ox)'],
                  {'a': 3, 'b': 2})))

# --- 3. TSPE-435 : TVI démontré par dichotomie ------------------------------------------------

SUITES_435 = (
    'on pose $a_0=a$, $b_0=b$ et, pour tout entier naturel $n$, $c_n=\\dfrac{a_n+b_n}{2}$ : si'
    ' $f(c_n)\\leqslant 0$, alors $a_{n+1}=c_n$ et $b_{n+1}=b_n$ ; sinon $a_{n+1}=a_n$ et'
    ' $b_{n+1}=c_n$')
CADRE_435 = (
    'Soit $f$ une fonction continue sur $[a;b]$ telle que $f(a)\\leqslant 0\\leqslant f(b)$. On'
    ' démontre qu\'elle s\'annule sur $[a;b]$ : ' + SUITES_435 + '. Ainsi $a_n\\leqslant b_n$ et'
    ' $f(a_n)\\leqslant 0\\leqslant f(b_n)$ pour tout $n$.')

V435_LONGUEUR = case(
    'Soit $f$ une fonction continue sur $[' + ev('a0') + ';' + ev('a0+L') + ']$ telle que $f('
    + ev('a0') + ')\\leqslant 0\\leqslant f(' + ev('a0+L') + ')$. On pose $a_0=' + ev('a0')
    + '$, $b_0=' + ev('a0+L') + '$ et, pour tout entier naturel $n$, $c_n=\\dfrac{a_n+b_n}{2}$ :'
    ' si $f(c_n)\\leqslant 0$, alors $a_{n+1}=c_n$ et $b_{n+1}=b_n$ ; sinon $a_{n+1}=a_n$ et'
    ' $b_{n+1}=c_n$.\n\nComplète.\n\n$b_1-a_1=?$ et, pour tout $n$, $b_n-a_n=\\dfrac{?}{2^n}$',
    [var('a0', '-3..3'), var('L', '1..7')], [ev('L/2'), ev('L')],
    ['Dans les deux cas, l\'intervalle $[a_{n+1};b_{n+1}]$ est une moitié de $[a_n;b_n]$ :'
     ' $b_{n+1}-a_{n+1}=\\dfrac{b_n-a_n}{2}$.',
     'La suite $(b_n-a_n)$ est géométrique de raison $\\dfrac{1}{2}$ et de premier terme $b_0-a_0='
     + ev('L') + '$.',
     'Donc $' + col('b_1-a_1=' + ev('L/2')) + '$ et $b_n-a_n=\\dfrac{' + col(ev('L')) + '}{2^n}$.'])

V435_ADJACENTES = justification(
    CADRE_435 + '\n\nPourquoi les suites $(a_n)$ et $(b_n)$ convergent-elles vers une même limite'
    ' $\\ell$ ?',
    [],
    '$(a_n)$ est croissante, $(b_n)$ décroissante et $b_n-a_n=\\dfrac{b-a}{2^n}$ tend vers $0$ :'
    ' elles sont adjacentes',
    ['$(a_n)$ et $(b_n)$ sont bornées par $a$ et $b$',
     '$f$ est continue sur $[a;b]$',
     '$a_n\\leqslant b_n$ pour tout entier naturel $n$'],
    ['À chaque étape, $a_{n+1}\\geqslant a_n$ et $b_{n+1}\\leqslant b_n$ : $(a_n)$ croît et $(b_n)$'
     ' décroît.',
     'Leur différence $b_n-a_n=\\dfrac{b-a}{2^n}$ tend vers $0$.',
     'Les suites sont donc $' + col('\\text{adjacentes}') + '$ : elles convergent vers une même'
     ' limite $\\ell\\in[a;b]$. Être bornées ne suffirait pas à avoir la même limite.'])

V435_ANNULATION = justification(
    CADRE_435 + ' Les suites $(a_n)$ et $(b_n)$ convergent vers un même réel $\\ell$ de $[a;b]$.'
    '\n\nPourquoi a-t-on $f(\\ell)=0$ ?',
    [],
    '$f$ est continue en $\\ell$ : $f(a_n)\\to f(\\ell)$ avec $f(a_n)\\leqslant 0$, et'
    ' $f(b_n)\\to f(\\ell)$ avec $f(b_n)\\geqslant 0$',
    ['$f$ est croissante sur $[a;b]$',
     '$a_n$ tend vers $\\ell$, donc $f(a_n)$ tend vers $0$',
     '$f(a)\\leqslant 0\\leqslant f(b)$ suffit'],
    ['$f$ étant continue en $\\ell$, $\\displaystyle\\lim_{n\\to+\\infty}f(a_n)=f(\\ell)$ et'
     ' $\\displaystyle\\lim_{n\\to+\\infty}f(b_n)=f(\\ell)$.',
     'Par passage à la limite dans les inégalités : $f(a_n)\\leqslant 0$ donne $f(\\ell)'
     '\\leqslant 0$, et $f(b_n)\\geqslant 0$ donne $f(\\ell)\\geqslant 0$.',
     'Donc $' + col('f(\\ell)=0') + '$ : $f$ s\'annule en $\\ell\\in[a;b]$. Aucune monotonie'
     ' n\'est nécessaire.'])

V435_PREUVE = ranger(
    'Soit $f$ une fonction continue sur $[a;b]$ telle que $f(a)\\leqslant 0\\leqslant f(b)$. On'
    ' démontre par dichotomie que $f$ s\'annule sur $[a;b]$.',
    ['On pose $a_0=a$, $b_0=b$ et l\'on coupe $[a_n;b_n]$ en deux en gardant la moitié'
     ' $[a_{n+1};b_{n+1}]$ où $f(a_{n+1})\\leqslant 0\\leqslant f(b_{n+1})$.',
     '$(a_n)$ est croissante, $(b_n)$ décroissante et $b_n-a_n=\\dfrac{b-a}{2^n}$.',
     'Comme $b_n-a_n$ tend vers $0$, les suites sont adjacentes : elles convergent vers un même'
     ' réel $\\ell\\in[a;b]$.',
     'Par continuité de $f$ en $\\ell$, $f(a_n)\\to f(\\ell)$ et $f(b_n)\\to f(\\ell)$.',
     'Par passage à la limite, $f(\\ell)\\leqslant 0$ et $f(\\ell)\\geqslant 0$, donc'
     ' $f(\\ell)=0$.'],
    ['On construit deux suites adjacentes qui encadrent une solution, en coupant l\'intervalle'
     ' en deux à chaque étape.',
     'La continuité de $f$ en leur limite commune $\\ell$ donne $' + col('f(\\ell)=0') + '$.'])

MODELES.append(modele(
    '03-demontrer-tvi-par-dichotomie',
    'Démontrer le théorème des valeurs intermédiaires par dichotomie',
    'Longueur des intervalles de la dichotomie (deux cases), suites adjacentes (case choix),'
    ' annulation en la limite commune par continuité (case choix), démonstration (étapes à'
    ' ranger)',
    3,
    [V435_LONGUEUR, V435_ADJACENTES, V435_ANNULATION, V435_PREUVE],
    [spec('3/2 et 3', 0, ['\\frac{3}{2}', '3'], 'correct', {'a0': 1, 'L': 3}),
     spec('Erreur : longueur non divisée', 0, ['3', '3'], 'incorrect', {'a0': 1, 'L': 3}),
     spec('Erreur : b₀ au lieu de b₀ − a₀', 0, ['\\frac{3}{2}', '4'], 'incorrect',
          {'a0': 1, 'L': 3})]
    + specs_choix(1, 'adjacentes', ['bornées', 'f continue', 'a_n ≤ b_n'])
    + specs_choix(2, 'continuité en ℓ', ['f croissante', 'f(a_n) → 0', 'f(a) ≤ 0 ≤ f(b)'])
    + ['RANGER:3']))

# --- 4. TSPE-436 : f(x + y) = f(x) + f(y) -----------------------------------------------------

CADRE_436 = ('Soit $f$ une fonction continue sur $\\mathbb{R}$ telle que, pour tous réels $x$ et'
             ' $y$, $f(x+y)=f(x)+f(y)$.')

V436_ENTIERS = case(
    CADRE_436 + ' On sait que $f(1)=' + ev('c') + '$.\n\nComplète.\n\n$f(0)=?$, $f(' + ev('N')
    + ')=?$ et $f(' + ev('-N') + ')=?$',
    [var('c', '1..5;±'), var('N', '2..6')], ['0', ev('N*c'), ev('-N*c')],
    ['Avec $x=y=0$ : $f(0)=2f(0)$, donc $f(0)=0$.',
     'Avec $y=1$ : $f(n+1)=f(n)+f(1)$ ; par récurrence, $f(n)=nf(1)$, donc $f(' + ev('N') + ')='
     + ev('N') + '\\times' + ev('c;()') + '=' + ev('N*c') + '$.',
     'Avec $y=-x$ : $f(x)+f(-x)=f(0)=0$, donc $f(' + ev('-N') + ')=-f(' + ev('N') + ')$.',
     'Donc $' + col('f(0)=0') + '$, $' + col('f(' + ev('N') + ')=' + ev('N*c')) + '$ et $'
     + col('f(' + ev('-N') + ')=' + ev('-N*c')) + '$.'])

V436_RATIONNELS = case(
    CADRE_436 + ' On sait que $f(1)=' + ev('c') + '$, et que $f(nx)=nf(x)$ pour tout entier'
    ' naturel $n$ et tout réel $x$.\n\nDétermine la valeur exacte de'
    ' $f\\left(\\dfrac{' + ev('p') + '}{' + ev('q') + '}\\right)$.\n\n$f\\left(\\dfrac{' + ev('p')
    + '}{' + ev('q') + '}\\right)=?$',
    [var('c', '1..5;±'), var('q', '2..7'), var('p', '1..{{eval:q-1}}')], ev('p*c/q'),
    ['Avec $n=' + ev('q') + '$ et $x=\\dfrac{1}{' + ev('q') + '}$ : $f(1)=' + ev('q')
     + 'f\\left(\\dfrac{1}{' + ev('q') + '}\\right)$, donc $f\\left(\\dfrac{1}{' + ev('q')
     + '}\\right)=' + ev('c/q') + '$.',
     'Avec $n=' + ev('p') + '$ : $f\\left(\\dfrac{' + ev('p') + '}{' + ev('q') + '}\\right)='
     + ev('p') + 'f\\left(\\dfrac{1}{' + ev('q') + '}\\right)$.',
     'Donc $' + col('f\\left(\\dfrac{' + ev('p') + '}{' + ev('q') + '}\\right)=' + ev('p*c/q'))
     + '$ : sur les rationnels, $f(r)=f(1)\\,r$.'],
    ['gcd(p,q) == 1'])

V436_REELS = justification(
    CADRE_436 + ' On a montré que $f(r)=f(1)\\,r$ pour tout rationnel $r$.\n\nPourquoi a-t-on'
    ' $f(x)=f(1)\\,x$ pour tout **réel** $x$ ?',
    [],
    'Tout réel $x$ est limite d\'une suite de rationnels $(r_n)$ ; $f(r_n)=f(1)\\,r_n$ et $f$ est'
    ' continue en $x$',
    ['Parce que $f(0)=0$',
     'Parce que $f$ est dérivable sur $\\mathbb{R}$',
     'Parce que l\'égalité est vraie pour tous les entiers'],
    ['Soit $x$ réel et $(r_n)$ une suite de rationnels de limite $x$ (par exemple les valeurs'
     ' décimales approchées de $x$).',
     'Pour tout $n$, $f(r_n)=f(1)\\,r_n$ ; $f$ étant continue en $x$, $f(r_n)\\to f(x)$, et'
     ' $f(1)\\,r_n\\to f(1)\\,x$.',
     'Par unicité de la limite, $' + col('f(x)=f(1)\\,x') + '$ : $f$ est linéaire. Sans la'
     ' continuité, le passage des rationnels aux réels tomberait.'])

V436_PREUVE = ranger(
    CADRE_436 + ' On démontre que $f$ est linéaire : $f(x)=ax$, avec $a=f(1)$.',
    ['Avec $x=y=0$, $f(0)=2f(0)$, donc $f(0)=0$.',
     'Par récurrence, $f(n)=na$ pour tout entier naturel $n$.',
     'Avec $y=-x$, $f(-x)=-f(x)$ : $f(n)=na$ pour tout entier relatif $n$.',
     'Comme $a=f\\left(q\\times\\dfrac{1}{q}\\right)=qf\\left(\\dfrac{1}{q}\\right)$, on obtient'
     ' $f\\left(\\dfrac{p}{q}\\right)=\\dfrac{p}{q}a$ pour tout rationnel $\\dfrac{p}{q}$.',
     'Tout réel est limite d\'une suite de rationnels et $f$ est continue : $f(x)=ax$ pour tout'
     ' réel $x$.'],
    ['On établit $f(x)=ax$ de proche en proche : en $0$, sur les entiers naturels, sur les'
     ' entiers relatifs, sur les rationnels.',
     'La continuité étend l\'égalité à tous les réels : $' + col('f(x)=f(1)\\,x') + '$.'])

MODELES.append(modele(
    '04-fonctions-continues-additives',
    'Fonctions continues telles que f(x + y) = f(x) + f(y)',
    'Valeurs en 0, en un entier et en son opposé (trois cases), valeur en un rationnel (case),'
    ' passage des rationnels aux réels par continuité (case choix), f est linéaire (étapes à'
    ' ranger)',
    4,
    [V436_ENTIERS, V436_RATIONNELS, V436_REELS, V436_PREUVE],
    [spec('0, 12, −12', 0, ['0', '12', '-12'], 'correct', {'c': 3, 'N': 4}),
     spec('Erreur : f(0) = f(1)', 0, ['3', '12', '-12'], 'incorrect', {'c': 3, 'N': 4}),
     spec('Erreur : f(−N) = f(N)', 0, ['0', '12', '12'], 'incorrect', {'c': 3, 'N': 4}),
     spec('f(2/5) = −6/5', 1, '-\\frac{6}{5}', 'correct', {'c': -3, 'q': 5, 'p': 2}),
     spec('Erreur : signe', 1, '\\frac{6}{5}', 'incorrect', {'c': -3, 'q': 5, 'p': 2}),
     spec('Erreur : c/q (p oublié)', 1, '-\\frac{3}{5}', 'incorrect', {'c': -3, 'q': 5, 'p': 2})]
    + specs_choix(2, 'densité et continuité', ['f(0) = 0', 'dérivable', 'vrai sur les entiers'])
    + ['RANGER:3']))

# --- 5. TSPE-437 : prolongement par continuité ------------------------------------------------

V437_RATIONNELLE = case(
    'La fonction $f$ est définie sur $\\mathbb{R}\\setminus\\{' + ev('d') + '\\}$ par $f(x)='
    '\\dfrac{x^2' + cfs('k1') + 'x' + ev('k2;+') + '}{x' + ev('-d;+') + '}$.\n\nPar quelle valeur'
    ' faut-il poser $f(' + ev('d') + ')$ pour prolonger $f$ par continuité en $' + ev('d') + '$ ?'
    '\n\n$f(' + ev('d') + ')=?$',
    [var('d', '1..4;±'), var('m', '1..5;±'), var('k1', 'eval:(m)-(d)'),
     var('k2', 'eval:-(m)*(d)')],
    ev('d+m'),
    ['Le numérateur s\'annule en $' + ev('d') + '$ : $x^2' + cfs('k1') + 'x' + ev('k2;+')
     + '=(x' + ev('-d;+') + ')(x' + ev('m;+') + ')$.',
     'Pour $x\\neq ' + ev('d') + '$, $f(x)=x' + ev('m;+') + '$, donc $\\displaystyle\\lim_{x\\to '
     + ev('d') + '}f(x)=' + ev('d;()') + ev('m;+') + '=' + ev('d+m') + '$.',
     'La limite est finie : on prolonge $f$ par continuité en posant $' + col('f(' + ev('d') + ')='
                                                                             + ev('d+m')) + '$.'],
    ['m != d'])

V437_EXPONENTIELLE = case(
    'La fonction $f$ est définie sur $\\mathbb{R}^*$ par $f(x)=\\dfrac{e^{' + ev('a') + 'x}-1}{x}$.'
    '\n\nPar quelle valeur faut-il poser $f(0)$ pour prolonger $f$ par continuité en $0$ ?\n\n'
    '$f(0)=?$',
    [var('a', '2..5;±')], ev('a'),
    ['Avec $g(x)=e^{' + ev('a') + 'x}$, $g(0)=1$ et $f(x)=\\dfrac{g(x)-g(0)}{x-0}$ : c\'est un taux'
     ' de variation de $g$ en $0$.',
     '$g$ est dérivable, $g\'(x)=' + ev('a') + 'e^{' + ev('a') + 'x}$, donc'
     ' $\\displaystyle\\lim_{x\\to 0}f(x)=g\'(0)=' + ev('a') + '$.',
     'On prolonge $f$ par continuité en posant $' + col('f(0)=' + ev('a')) + '$.'])

V437_LAQUELLE = justification(
    'Les quatre fonctions ci-dessous sont définies sur $]0;+\\infty[$.\n\nLaquelle se prolonge par'
    ' continuité en $0$ ?',
    [],
    '$x\\mapsto x\\ln(x)$',
    ['$x\\mapsto\\ln(x)$', '$x\\mapsto\\dfrac{1}{x}$', '$x\\mapsto\\dfrac{e^x}{x}$'],
    ['Une fonction se prolonge par continuité en $0$ si elle a une limite **finie** en $0$.',
     '$\\displaystyle\\lim_{x\\to 0^+}x\\ln(x)=0$ (croissance comparée), alors que $\\ln(x)\\to'
     '-\\infty$, $\\dfrac{1}{x}\\to+\\infty$ et $\\dfrac{e^x}{x}\\to+\\infty$.',
     'Seule $' + col('x\\mapsto x\\ln(x)') + '$ se prolonge, en posant $f(0)=0$.'])

MODELES.append(modele(
    '05-prolongement-par-continuite', 'Prolongement par continuité en un point',
    'Valeur du prolongement d\'une fraction rationnelle simplifiable (case), de (e^{ax} − 1)/x'
    ' en 0 par le nombre dérivé (case), fonction qui se prolonge en 0 (case choix)',
    3,
    [V437_RATIONNELLE, V437_EXPONENTIELLE, V437_LAQUELLE],
    [spec('f(2) = 5', 0, '5', 'correct', {'d': 2, 'm': 3, 'k1': 1, 'k2': -6}),
     spec('Erreur : m seul', 0, '3', 'incorrect', {'d': 2, 'm': 3, 'k1': 1, 'k2': -6}),
     spec('Erreur : d − m', 0, '-1', 'incorrect', {'d': 2, 'm': 3, 'k1': 1, 'k2': -6}),
     spec('f(0) = −3', 1, '-3', 'correct', {'a': -3}),
     spec('Erreur : 0', 1, '0', 'incorrect', {'a': -3}),
     spec('Erreur : 1', 1, '1', 'incorrect', {'a': -3})]
    + specs_choix(2, 'x ln x', ['ln x', '1/x', 'e^x/x'])))


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
