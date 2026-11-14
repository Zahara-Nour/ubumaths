"""Écrit les 3 modèles du lot 14 « approfondissements : équations différentielles et intégrales »
de la terminale spé dans scripts/questions/tspe-approfondissements-14/.

Phase 0 validée par David le 2026-11-13 (D3 du journal
« docs/wip/questions-tspe-demonstrations-progress.md », § 35), un point par modèle :

| # | Point    | Titre                                                  | Niv. | Nœud du modèle                                     |
| 1 | TSPE-473 | Autres équations différentielles, équation logistique  | 2    | Éq. diff. › Généralités › notion de solution       |
| 2 | TSPE-496 | Approcher une aire par deux suites adjacentes          | 6    | Intégration › Calcul d'intégrales › méthode des rectangles |
| 3 | TSPE-497 | Encadrer Hₙ par des intégrales                         | 4    | Intégration › Calcul d'intégrales › positivité et inégalités |

Les trois points sont posés sur la sous-notion du modèle. Niveaux au-dessus de ceux de la prod
(relevé MCP du 2026-11-14 : 1, 5, 3 au plus).

Forme (D3, Q2) : 497 est une preuve (cases, case choix à 4 propositions dont la première est la
bonne, variation « étapes à ranger », positions calculées par le générateur, graine 0) ; 473 et
496 des applications à valeurs tirées. Le résultat hors programme est donné dans l'énoncé
(solution de l'équation logistique, somme des carrés).

Pièges : pas de variable `e` ni `i` (lues comme le nombre d'Euler et l'imaginaire) ; un
coefficient tiré devant une lettre passe par `cf()` (`1x` n'est pas nettoyé dans f(x) = …).

    python3 docs/wip/questions/lot-tspe-approfondissements-14.py scripts/questions/tspe-approfondissements-14
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



def signe(k):
    """Signe d'une quantité tirée, à sortir d'une fraction : + ou −."""
    return '{{if:' + k + '>0|+|-}}'


def moins(k):
    """Signe d'une quantité tirée devant une expression : rien ou −."""
    return '{{if:' + k + '<0|-|}}'


def frac_signee(k, den):
    """± |k|/den, le signe sorti de la fraction."""
    return signe(k) + '\\dfrac{' + ev('abs(' + k + ')') + '}{' + den + '}'


LIM_N = '\\displaystyle\\lim_{n\\to+\\infty}'
INT01 = '\\displaystyle\\int_0^1'
MODELES = []

# --- 1. TSPE-473 : autres équations différentielles ----------------------------------------------

V473_CARRE = justification(
    'On considère l\'équation différentielle $y\'=y^2$, d\'inconnue $y$, fonction dérivable.\n\n'
    'Laquelle de ces fonctions, définies sur $]-\\infty;' + ev('c') + '[$, en est solution ?',
    [var('c', '1..6')],
    '$f(x)=\\dfrac{1}{' + ev('c') + '-x}$',
    ['$f(x)=\\dfrac{1}{x-' + ev('c') + '}$', '$f(x)=(' + ev('c') + '-x)^2$',
     '$f(x)=\\ln(' + ev('c') + '-x)$'],
    ['Pour $f(x)=\\dfrac{1}{' + ev('c') + '-x}$, la dérivée de $\\dfrac{1}{u}$ est $-\\dfrac{u\'}{u^2}$,'
     ' avec $u\'(x)=-1$ : $f\'(x)=\\dfrac{1}{(' + ev('c') + '-x)^2}=\\left(f(x)\\right)^2$.',
     'Pour $f(x)=\\dfrac{1}{x-' + ev('c') + '}$, $f\'(x)=-\\dfrac{1}{(x-' + ev('c') + ')^2}=-\\left(f(x)'
     '\\right)^2$ : le signe ne convient pas.',
     'Donc $' + col('f(x)=\\dfrac{1}{' + ev('c') + '-x}') + '$ est solution de $y\'=y^2$.'])

FONC_473 = (cf('a') + '\\cos(' + ev('w') + 'x)+' + cf('b') + '\\sin(' + ev('w') + 'x)')

V473_OSCILLATEUR = case(
    'La fonction $f$ est définie sur $\\mathbb{R}$ par $f(x)=' + FONC_473 + '$.\n\nComplète : pour'
    ' tout réel $x$,\n\n$f\'\'(x)+?f(x)=0$',
    [var('a', '1..5'), var('b', '1..5'), var('w', '2..5')], ev('w^2'),
    ['$f\'(x)=' + ev('-a*w') + '\\sin(' + ev('w') + 'x)' + ev('b*w;+') + '\\cos(' + ev('w') + 'x)$.',
     '$f\'\'(x)=' + ev('-a*w^2') + '\\cos(' + ev('w') + 'x)' + ev('-b*w^2;+') + '\\sin(' + ev('w')
     + 'x)=-' + ev('w^2') + 'f(x)$.',
     'Donc $' + col('f\'\'(x)+' + ev('w^2') + 'f(x)=0') + '$ : $f$ est solution de'
     ' $y\'\'+\\omega^2y=0$ avec $\\omega=' + ev('w') + '$.'])

LOGISTIQUE = ('y\'=' + cf('r') + 'y\\left(1-\\dfrac{y}{' + ev('K') + '}\\right)')

V473_CHANGEMENT = case(
    'On considère l\'**équation logistique** $' + LOGISTIQUE + '$. Soit $f$ une solution'
    ' strictement positive sur $[0;+\\infty[$ ; on pose $g=\\dfrac{1}{f}$.\n\nComplète l\'équation'
    ' différentielle vérifiée par $g$.\n\n$g\'=?g+?$',
    [var('r', '1..3'), var('K', '2..10')], [ev('-r'), ev('r/K')],
    ['$g\'=-\\dfrac{f\'}{f^2}=-\\dfrac{' + cf('r') + 'f\\left(1-\\frac{f}{' + ev('K')
     + '}\\right)}{f^2}=-' + cf('r') + '\\left(\\dfrac{1}{f}-\\dfrac{1}{' + ev('K')
     + '}\\right)$.',
     'Or $\\dfrac{1}{f}=g$, donc $g\'=-' + cf('r') + 'g+' + ev('r/K') + '$.',
     'Donc $' + col('g\'=-' + cf('r') + 'g+' + ev('r/K')) + '$ : une équation $y\'=ay+b$ que l\'on'
     ' sait résoudre.'])

V473_POPULATION = case(
    'Une population (en milliers d\'individus) suit l\'**équation logistique** $' + LOGISTIQUE
    + '$, le temps $t$ étant en années. On admet que la fonction $f$ définie sur $[0;+\\infty['
    '$ par $f(t)=\\dfrac{' + ev('K') + '}{1+' + cf('c') + 'e^{-' + cf('r') + 't}}$ en est'
    ' solution.\n\nComplète.\n\n$f(0)=?$ et $\\displaystyle\\lim_{t\\to+\\infty}f(t)=?$',
    [var('r', '1..3'), var('c', '1..4'), var('m', '2..5'), var('K', 'eval:m*(c+1)')],
    [ev('m'), ev('K')],
    ['$f(0)=\\dfrac{' + ev('K') + '}{1+' + ev('c') + '}=' + ev('m') + '$.',
     'Quand $t\\to+\\infty$, $e^{-' + cf('r') + 't}\\to 0$, donc le dénominateur tend vers $1$.',
     'Donc $' + col('f(0)=' + ev('m')) + '$ et $' + col('\\displaystyle\\lim_{t\\to+\\infty}f(t)='
                                                       + ev('K')) + '$ : la population tend vers'
     ' la capacité d\'accueil du milieu.'])

MODELES.append(modele(
    '01-autres-equations-differentielles', 'Autres équations différentielles, équation logistique',
    'Solution de y\' = y² (case choix), f\'\' + ω²f = 0 pour a cos(ωx) + b sin(ωx) (case),'
    ' équation logistique : équation vérifiée par 1/f (deux cases), population, f(0) et limite'
    ' (deux cases)',
    2,
    [V473_CARRE, V473_OSCILLATEUR, V473_CHANGEMENT, V473_POPULATION],
    specs_choix(0, '1/(c − x)', ['1/(x − c), signe', '(c − x)²', 'ln(c − x)'], {'c': 3})
    + [spec('ω² = 9', 1, '9', 'correct', {'a': 2, 'b': 1, 'w': 3}),
       spec('Erreur : ω', 1, '3', 'incorrect', {'a': 2, 'b': 1, 'w': 3}),
       spec('Erreur : −ω²', 1, '-9', 'incorrect', {'a': 2, 'b': 1, 'w': 3}),
       spec('g\' = −2g + 1/5', 2, ['-2', '\\frac{1}{5}'], 'correct', {'r': 2, 'K': 10}),
       spec('Erreur : signe', 2, ['2', '\\frac{1}{5}'], 'incorrect', {'r': 2, 'K': 10}),
       spec('Erreur : K/r', 2, ['-2', '5'], 'incorrect', {'r': 2, 'K': 10}),
       spec('f(0) = 5, limite 20', 3, ['5', '20'], 'correct', {'r': 2, 'c': 3, 'm': 5, 'K': 20}),
       spec('Erreur : f(0) = K', 3, ['20', '20'], 'incorrect', {'r': 2, 'c': 3, 'm': 5, 'K': 20}),
       spec('Erreur : limite 0', 3, ['5', '0'], 'incorrect', {'r': 2, 'c': 3, 'm': 5, 'K': 20})]))

# --- 2. TSPE-496 : aire par suites adjacentes ----------------------------------------------------

PAS = '\\dfrac{' + ev('a') + '}{n}'
POINT = '\\dfrac{' + cf('a') + 'k}{n}'
RAPPEL_496 = (
    'On note $\\mathcal{A}$ l\'aire du domaine compris entre la courbe de $f:x\\mapsto x^2$, l\'axe'
    ' des abscisses et les droites d\'équations $x=0$ et $x=' + ev('a') + '$. Pour $n\\geqslant 1$,'
    ' on partage $[0;' + ev('a') + ']$ en $n$ intervalles de longueur $' + PAS + '$ et l\'on pose'
    ' $s_n=' + PAS + '\\displaystyle\\sum_{k=0}^{n-1}f\\left(' + POINT + '\\right)$ et $S_n=' + PAS
    + '\\displaystyle\\sum_{k=1}^{n}f\\left(' + POINT + '\\right)$.')

V496_ENCADRER = justification(
    RAPPEL_496 + '\n\nPourquoi a-t-on $s_n\\leqslant\\mathcal{A}\\leqslant S_n$ pour tout'
    ' $n\\geqslant 1$ ?',
    [var('a', '1..3')],
    '$f$ est croissante sur $[0;' + ev('a') + ']$ : sur chaque intervalle, le rectangle de hauteur'
    ' la valeur à gauche est sous la courbe, celui de hauteur la valeur à droite au-dessus',
    ['$f$ est positive sur $[0;' + ev('a') + ']$',
     '$f$ est convexe sur $[0;' + ev('a') + ']$',
     'Les suites $(s_n)$ et $(S_n)$ ont la même limite'],
    ['$s_n$ est la somme des aires des rectangles de hauteur $f$ au bord gauche de chaque'
     ' intervalle ; $S_n$, au bord droit.',
     '$f$ est croissante sur $[0;' + ev('a') + ']$ : sur chaque intervalle, $f$ est comprise entre sa'
     ' valeur à gauche et sa valeur à droite.',
     'Donc $' + col('s_n\\leqslant\\mathcal{A}\\leqslant S_n') + '$. La positivité seule ne'
     ' compare pas les rectangles à la courbe.'])

V496_ECART = case(
    RAPPEL_496 + '\n\nComplète, pour tout $n\\geqslant 1$.\n\n$S_n-s_n=?$',
    [var('a', '1..3')], '\\frac{' + ev('a^3') + '}{n}',
    ['Les deux sommes ont en commun les termes de $k=1$ à $k=n-1$ : $S_n-s_n=' + PAS
     + '\\left(f(' + ev('a') + ')-f(0)\\right)$.',
     '$f(' + ev('a') + ')-f(0)=' + ev('a^2') + '$, donc $S_n-s_n=' + PAS + '\\times' + ev('a^2') + '$.',
     'Donc $' + col('S_n-s_n=\\dfrac{' + ev('a^3') + '}{n}') + '$, qui tend vers $0$.'])

V496_RANG = case(
    RAPPEL_496 + ' On a $S_n-s_n=\\dfrac{' + ev('a^3') + '}{n}$.\n\nComplète : l\'encadrement'
    ' $s_n\\leqslant\\mathcal{A}\\leqslant S_n$ a une amplitude inférieure ou égale à $10^{-'
    + ev('p') + '}$ si et seulement si\n\n$n\\geqslant ?$',
    [var('a', '1..3'), var('p', '1..3')], ev('a^3*10^p'),
    ['L\'amplitude de l\'encadrement est $S_n-s_n=\\dfrac{' + ev('a^3') + '}{n}$.',
     '$\\dfrac{' + ev('a^3') + '}{n}\\leqslant 10^{-' + ev('p') + '}$ si et seulement si $n\\geqslant '
     + '{{if:a==1||' + ev('a^3') + '\\times }}10^{' + ev('p') + '}$.',
     'Donc $' + col('n\\geqslant ' + ev('a^3*10^p')) + '$.'])

V496_AIRE = case(
    RAPPEL_496 + '\n\nOn admet que $\\displaystyle\\sum_{k=1}^{n}k^2=\\dfrac{n(n+1)(2n+1)}{6}$ et'
    ' que les suites $(s_n)$ et $(S_n)$ sont adjacentes.\n\nCalcule l\'aire.\n\n'
    '$\\mathcal{A}=?$',
    [var('a', '1..3')], ev('a^3/3'),
    ['$S_n=' + PAS + '\\displaystyle\\sum_{k=1}^{n}\\dfrac{' + cf('a^2') + 'k^2}{n^2}=\\dfrac{'
     + ev('a^3') + '}{n^3}\\times\\dfrac{n(n+1)(2n+1)}{6}=\\dfrac{' + ev('a^3')
     + '}{6}\\times\\dfrac{(n+1)(2n+1)}{n^2}$.',
     '$\\dfrac{(n+1)(2n+1)}{n^2}=\\left(1+\\dfrac{1}{n}\\right)\\left(2+\\dfrac{1}{n}\\right)$ tend'
     ' vers $2$, donc $(S_n)$ tend vers $\\dfrac{' + ev('a^3') + '}{3}$.',
     'Les suites sont adjacentes : $(s_n)$ a la même limite, et $s_n\\leqslant\\mathcal{A}\\leqslant'
     ' S_n$. Donc $' + col('\\mathcal{A}=' + ev('a^3/3')) + '$.'])

MODELES.append(modele(
    '02-aire-par-suites-adjacentes', 'Approcher une aire par deux suites adjacentes',
    'Aire sous x ↦ x² sur [0 ; a] par les sommes s_n et S_n : pourquoi s_n ≤ A ≤ S_n (case'
    ' choix), S_n − s_n (case), rang pour une précision 10^{−p} (case), aire par la somme des carrés'
    ' donnée (case)',
    6,
    [V496_ENCADRER, V496_ECART, V496_RANG, V496_AIRE],
    specs_choix(0, 'f croissante', ['positive', 'convexe', 'même limite'], {'a': 2})
    + [spec('8/n', 1, '\\frac{8}{n}', 'correct', {'a': 2}),
       spec('Erreur : a²/n', 1, '\\frac{4}{n}', 'incorrect', {'a': 2}),
       spec('Erreur : a/n', 1, '\\frac{2}{n}', 'incorrect', {'a': 2}),
       spec('n ≥ 800', 2, '800', 'correct', {'a': 2, 'p': 2}),
       spec('Erreur : a³ seul', 2, '8', 'incorrect', {'a': 2, 'p': 2}),
       spec('Erreur : 10^p', 2, '100', 'incorrect', {'a': 2, 'p': 2}),
       spec('A = 9', 3, '9', 'correct', {'a': 3}),
       spec('A = 1/3', 3, '\\frac{1}{3}', 'correct', {'a': 1}),
       spec('Erreur : a³', 3, '27', 'incorrect', {'a': 3}),
       spec('Erreur : a³/6', 3, '\\frac{9}{2}', 'incorrect', {'a': 3})]))

# --- 3. TSPE-497 : encadrement de H_n ------------------------------------------------------------

DEF_H = 'Pour tout entier $n\\geqslant 1$, on note $H_n=\\displaystyle\\sum_{k=1}^{n}\\dfrac{1}{k}$.'
ENCADRE_K = ('\\dfrac{1}{k+1}\\leqslant\\ln(k+1)-\\ln(k)\\leqslant\\dfrac{1}{k}')
INT_K = '\\displaystyle\\int_k^{k+1}\\dfrac{1}{t}\\,\\mathrm{d}t'

V497_INTEGRER = justification(
    DEF_H + ' Soit $k\\geqslant 1$ un entier. Pour tout $t\\in[k;k+1]$,'
    ' $\\dfrac{1}{k+1}\\leqslant\\dfrac{1}{t}\\leqslant\\dfrac{1}{k}$.\n\nQuelle inégalité'
    ' obtient-on en intégrant sur $[k;k+1]$ ?',
    [],
    '$' + ENCADRE_K + '$',
    ['$\\dfrac{1}{k}\\leqslant\\ln(k+1)-\\ln(k)\\leqslant\\dfrac{1}{k+1}$',
     '$\\dfrac{1}{(k+1)^2}\\leqslant\\ln(k+1)-\\ln(k)\\leqslant\\dfrac{1}{k^2}$',
     '$\\ln(k+1)\\leqslant\\ln(k+1)-\\ln(k)\\leqslant\\ln(k)$'],
    ['$k\\leqslant k+1$ : l\'intégration sur $[k;k+1]$ conserve l\'ordre.',
     'L\'intervalle est de longueur $1$ : une constante $c$ s\'intègre en $c$ ; et $' + INT_K
     + '=\\ln(k+1)-\\ln(k)$.',
     'Donc $' + col(ENCADRE_K) + '$.'])

V497_DROITE = case(
    DEF_H + ' On a montré que, pour tout entier $k\\geqslant 1$, $' + ENCADRE_K + '$.\n\n'
    'En ajoutant les inégalités $\\ln(k+1)-\\ln(k)\\leqslant\\dfrac{1}{k}$ pour $k$ allant de $1$ à $' + ev('N') + '$,'
    ' complète.\n\n'
    '$\\ln(?)\\leqslant H_{' + ev('N') + '}$',
    [var('N', '5..30')], ev('N+1'),
    ['La somme des $\\dfrac{1}{k}$ vaut $\\displaystyle\\sum_{k=1}^{' + ev('N') + '}\\dfrac{1}{k}=H_{' + ev('N') + '}$.',
     'Celle des $\\ln(k+1)-\\ln(k)$ est télescopique : $\\displaystyle\\sum_{k=1}^{' + ev('N')
     + '}\\left(\\ln(k+1)-\\ln(k)\\right)=\\ln(' + ev('N+1') + ')-\\ln(1)=\\ln(' + ev('N+1') + ')$.',
     'Donc $' + col('\\ln(' + ev('N+1') + ')\\leqslant H_{' + ev('N') + '}') + '$.'])

V497_GAUCHE = case(
    DEF_H + ' On a montré que, pour tout entier $k\\geqslant 1$, $' + ENCADRE_K + '$.\n\n'
    'En ajoutant les inégalités $\\dfrac{1}{k+1}\\leqslant\\ln(k+1)-\\ln(k)$ pour $k$ allant de $1$ à $' + ev('N-1') + '$,'
    ' complète.\n\n'
    '$H_{' + ev('N') + '}-?\\leqslant\\ln(' + ev('N') + ')$',
    [var('N', '5..30')], '1',
    ['La somme des $\\dfrac{1}{k+1}$ vaut $\\displaystyle\\sum_{k=1}^{' + ev('N-1') + '}\\dfrac{1}{k+1}=\\dfrac{1}{2}+\\cdots+'
     '\\dfrac{1}{' + ev('N') + '}=H_{' + ev('N') + '}-1$ : il manque le premier terme.',
     'Celle des $\\ln(k+1)-\\ln(k)$, télescopique, vaut $\\ln(' + ev('N') + ')-\\ln(1)=\\ln(' + ev('N') + ')$.',
     'Donc $' + col('H_{' + ev('N') + '}-1\\leqslant\\ln(' + ev('N') + ')') + '$, soit $H_{' + ev('N')
     + '}\\leqslant 1+\\ln(' + ev('N') + ')$.'])

V497_LIMITE = case(
    DEF_H + ' On a montré que, pour tout entier $n\\geqslant 1$,'
    ' $\\ln(n+1)\\leqslant H_n\\leqslant 1+\\ln(n)$.\n\nComplète.\n\n$' + LIM_N
    + '\\dfrac{H_n}{\\ln(n)}=?$',
    [], '1',
    ['Pour $n\\geqslant 2$, $\\ln(n)>0$ : $\\dfrac{\\ln(n+1)}{\\ln(n)}\\leqslant\\dfrac{H_n}{\\ln(n)}'
     '\\leqslant\\dfrac{1}{\\ln(n)}+1$.',
     '$\\dfrac{\\ln(n+1)}{\\ln(n)}=1+\\dfrac{\\ln\\left(1+\\frac{1}{n}\\right)}{\\ln(n)}$ tend vers $1$,'
     ' et $\\dfrac{1}{\\ln(n)}+1$ aussi.',
     'Par le théorème des gendarmes, $' + col(LIM_N + '\\dfrac{H_n}{\\ln(n)}=1') + '$ : $H_n$ tend'
     ' vers $+\\infty$ aussi lentement que $\\ln(n)$.'])

V497_PREUVE = ranger(
    DEF_H + ' Soit $n\\geqslant 2$ un entier. On démontre que'
    ' $\\ln(n+1)\\leqslant H_n\\leqslant 1+\\ln(n)$.',
    ['Pour tout entier $k\\geqslant 1$ et tout $t\\in[k;k+1]$, $\\dfrac{1}{k+1}\\leqslant\\dfrac{1}{t}'
     '\\leqslant\\dfrac{1}{k}$.',
     'On intègre sur $[k;k+1]$, de longueur $1$ : $' + ENCADRE_K + '$.',
     'On ajoute les inégalités $\\ln(k+1)-\\ln(k)\\leqslant\\dfrac{1}{k}$ pour $k$ de $1$ à $n$ ; la somme est'
     ' télescopique :'
     ' $\\ln(n+1)\\leqslant H_n$.',
     'De même, avec les inégalités $\\dfrac{1}{k+1}\\leqslant\\ln(k+1)-\\ln(k)$ pour $k$ de $1$ à $n-1$ : $H_n-1\\leqslant\\ln(n)$.',
     'Donc $\\ln(n+1)\\leqslant H_n\\leqslant 1+\\ln(n)$.'],
    ['On encadre $\\dfrac{1}{t}$ sur chaque intervalle $[k;k+1]$, puis on intègre.',
     'Les sommes télescopiques donnent $' + col('\\ln(n+1)\\leqslant H_n\\leqslant 1+\\ln(n)') + '$.'])

MODELES.append(modele(
    '03-encadrement-de-hn-par-des-integrales', 'Encadrer Hₙ par des intégrales',
    'Encadrement de ln(k + 1) − ln(k) en intégrant 1/t (case choix), ln(N + 1) ≤ H_N (case),'
    ' H_N − 1 ≤ ln(N) (case), limite de H_n / ln(n) (case), démonstration (étapes à ranger)',
    4,
    [V497_INTEGRER, V497_DROITE, V497_GAUCHE, V497_LIMITE, V497_PREUVE],
    specs_choix(0, 'encadrement par 1/(k + 1) et 1/k', ['sens inversé', 'carrés', 'ln'])
    + [spec('ln(13)', 1, '13', 'correct', {'N': 12}),
       spec('Erreur : N', 1, '12', 'incorrect', {'N': 12}),
       spec('1', 2, '1', 'correct', {'N': 12}),
       spec('Erreur : 1/N', 2, '\\frac{1}{12}', 'incorrect', {'N': 12}),
       spec('limite 1', 3, '1', 'correct'),
       spec('Erreur : 0', 3, '0', 'incorrect')]
    + ['RANGER:4']))
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
