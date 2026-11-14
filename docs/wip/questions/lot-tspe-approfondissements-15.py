"""Écrit les 5 modèles du lot 15 « approfondissements : probabilités et statistiques »
de la terminale spé dans scripts/questions/tspe-approfondissements-15/.

Phase 0 validée par David le 2026-11-13 (D3 du journal
« docs/wip/questions-tspe-demonstrations-progress.md », § 35), un point par modèle :

| # | Point    | Titre                                                  | Niv. | Nœud du modèle                                          |
| 1 | TSPE-517 | Loi de Poisson, limite de lois binomiales              | 1    | Probabilités › Autres lois › loi de Poisson (neuve)     |
| 2 | TSPE-529 | E(XY) = E(X)E(Y) et variance d'une somme               | 4    | Probabilités › Sommes et concentration › espérance et variance d'une somme |
| 3 | TSPE-537 | Estimer une proportion par l'inégalité de B.-T.        | 1    | Statistiques › Échantillonnage › estimation d'une proportion |
| 4 | TSPE-538 | Marche aléatoire et loi binomiale                      | 6    | Probabilités › Probabilités conditionnelles › épreuves indépendantes successives |
| 5 | TSPE-539 | Concentration : sondage, sex ratio, demi-vie           | 3    | Probabilités › Sommes et concentration › loi des grands nombres |

517 est posé sur la notion Autres lois : son modèle va sur la sous-notion neuve « loi de Poisson »
(D3, Q4 a), posée par la migration de rangement. Les quatre autres points sont sur la sous-notion
du modèle. Niveaux au-dessus de ceux de la prod (relevé MCP du 2026-11-14 : —, 3, —, 5, 2 au plus).
538 : modèle neuf, `4bd92a32` (1re, « Marche aléatoire sur une droite graduée ») sert de gabarit.

Forme (D3, Q2) : 529 est en partie une preuve (case choix, cases, variation « étapes à ranger »,
positions calculées par le générateur, graine 0) ; les autres, des applications à valeurs
tirées. Le résultat hors programme est donné dans l'énoncé (loi de Poisson, limite de
(1 + x/n)ⁿ, inégalités de Bienaymé-Tchebychev et de concentration).

Pièges : pas de variable `e` ni `i` (lues comme le nombre d'Euler et l'imaginaire) ; une réponse
décimale exige `blankDefaults.acceptDecimal` (sinon « bad_form ») ; les valeurs tirées gardent
les décimaux exacts (p = L/(1000 × 2ʲ), δ = d/20).

    python3 docs/wip/questions/lot-tspe-approfondissements-15.py scripts/questions/tspe-approfondissements-15
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
                 'shared': {'cleanCoefficients': True, 'blankDefaults': {'acceptDecimal': True}},
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
MODELES = []
CONSIGNE_EXACTE = 'Réponds par une fraction irréductible ou par un nombre décimal exact.'

# --- 1. TSPE-517 : loi de Poisson, limite de lois binomiales ------------------------------------

LAMBDA = ev('a')
INTRO_517 = (
    'Pour tout entier $n>' + LAMBDA + '$, la variable aléatoire $X_n$ suit la loi binomiale'
    ' $\\mathcal{B}\\left(n,\\dfrac{' + LAMBDA + '}{n}\\right)$ : son espérance, $n\\times\\dfrac{'
    + LAMBDA + '}{n}=' + LAMBDA + '$, ne dépend pas de $n$. On admet que, pour tout réel $x$, $'
    + LIM_N + '\\left(1+\\dfrac{x}{n}\\right)^n=e^x$.')

V517_ZERO = case(
    INTRO_517 + '\n\nComplète.\n\n$' + LIM_N + 'P(X_n=0)=e^{?}$',
    [var('a', '2..6')], ev('-a'),
    ['$P(X_n=0)=\\left(1-\\dfrac{' + LAMBDA + '}{n}\\right)^n$ : aucun succès en $n$ épreuves.',
     'Avec $x=-' + LAMBDA + '$ dans la limite admise, $\\left(1-\\dfrac{' + LAMBDA
     + '}{n}\\right)^n$ tend vers $e^{-' + LAMBDA + '}$.',
     'Donc $' + col(LIM_N + 'P(X_n=0)=e^{-' + LAMBDA + '}') + '$.'])

V517_UN = case(
    INTRO_517 + '\n\nComplète.\n\n$' + LIM_N + 'P(X_n=1)=?\\times e^{-' + LAMBDA + '}$',
    [var('a', '2..6')], ev('a'),
    ['$P(X_n=1)=n\\times\\dfrac{' + LAMBDA + '}{n}\\left(1-\\dfrac{' + LAMBDA
     + '}{n}\\right)^{n-1}=' + LAMBDA + '\\times\\dfrac{\\left(1-\\frac{' + LAMBDA
     + '}{n}\\right)^n}{1-\\frac{' + LAMBDA + '}{n}}$.',
     '$\\left(1-\\dfrac{' + LAMBDA + '}{n}\\right)^n$ tend vers $e^{-' + LAMBDA
     + '}$ et $1-\\dfrac{' + LAMBDA + '}{n}$ tend vers $1$.',
     'Donc $' + col(LIM_N + 'P(X_n=1)=' + LAMBDA + 'e^{-' + LAMBDA + '}') + '$.'])

N_517 = ev('2^j') + '\\,000'
V517_APPROCHER = case(
    'Une machine fabrique $' + N_517 + '$ pièces ; chacune est défectueuse avec la probabilité $'
    + ev('L/(1000*2^j);d') + '$, indépendamment des autres. Le nombre $X$ de pièces défectueuses suit'
    ' la loi binomiale de paramètres $n=' + N_517 + '$ et $p=' + ev('L/(1000*2^j);d') + '$.\n\n'
    'On approche la loi de $X$ par la **loi de Poisson** de paramètre $\\lambda=np$ : une variable'
    ' $Y$ qui suit cette loi vérifie, pour tout entier $k\\geqslant 0$,'
    ' $P(Y=k)=e^{-\\lambda}\\dfrac{\\lambda^k}{k!}$.\n\nComplète.\n\n$P(Y=2)=?\\times e^{-?}$',
    [var('L', '2..6'), var('j', '0..2')], [ev('L^2/2'), ev('L')],
    ['$\\lambda=np=' + N_517 + '\\times' + ev('L/(1000*2^j);d') + '=' + ev('L') + '$.',
     '$P(Y=2)=e^{-' + ev('L') + '}\\times\\dfrac{' + ev('L') + '^2}{2!}=\\dfrac{' + ev('L^2')
     + '}{2}e^{-' + ev('L') + '}$.',
     'Donc $' + col('P(Y=2)=' + ev('L^2/2') + 'e^{-' + ev('L') + '}') + '$ : c\'est une valeur'
     ' approchée de $P(X=2)$.'])

V517_RARES = justification(
    'On approche la loi binomiale $\\mathcal{B}(n,p)$ par la loi de Poisson de paramètre $np$.\n\n'
    'Dans quel cas cette approximation est-elle la mieux justifiée ?',
    [var('m', '2..9')],
    '$n=' + ev('m') + '\\,000' + '$ et $p=0{,}002$',
    ['$n=10$ et $p=0{,}5$', '$n=' + ev('m') + '\\,000' + '$ et $p=0{,}5$', '$n=5$ et $p=0{,}002$'],
    ['La loi de Poisson est la limite des lois $\\mathcal{B}\\left(n,\\dfrac{\\lambda}{n}\\right)$ :'
     ' elle convient quand $n$ est grand et $p$ petit, $np$ restant modéré.',
     'C\'est la loi des **évènements rares** : beaucoup d\'épreuves, chacune peu probable de réussir.'
     ' Avec $p=0{,}5$, le succès n\'est pas rare ; avec $n=5$, les épreuves sont trop peu nombreuses.',
     'Donc $' + col('n=' + ev('m') + '\\,000' + '\\text{ et }p=0{,}002') + '$, avec $\\lambda=np='
     + ev('2*m') + '$.'])

MODELES.append(modele(
    '01-loi-de-poisson-limite-de-binomiales', 'Loi de Poisson, limite de lois binomiales',
    'X_n de loi B(n, λ/n) : limite de P(X_n = 0) (case), de P(X_n = 1) (case) ; approcher une'
    ' loi binomiale par une loi de Poisson, P(Y = 2) (deux cases) ; évènements rares (case choix)',
    1,
    [V517_ZERO, V517_UN, V517_APPROCHER, V517_RARES],
    [spec('e^{−3}', 0, '-3', 'correct', {'a': 3}),
     spec('Erreur : signe', 0, '3', 'incorrect', {'a': 3}),
     spec('Erreur : (1 − 0)ⁿ → 1', 0, '0', 'incorrect', {'a': 3}),
     spec('3e^{−3}', 1, '3', 'correct', {'a': 3}),
     spec('Erreur : sans le facteur n', 1, '1', 'incorrect', {'a': 3}),
     spec('Erreur : limite nulle', 1, '0', 'incorrect', {'a': 3}),
     spec('8e^{−4}', 2, ['8', '4'], 'correct', {'L': 4, 'j': 1}),
     spec('Erreur : sans 2!', 2, ['16', '4'], 'incorrect', {'L': 4, 'j': 1}),
     spec('Erreur : λ = n', 2, ['8', '2000'], 'incorrect', {'L': 4, 'j': 1})]
    + specs_choix(3, 'n grand, p petit', ['n petit, p = 0,5', 'p = 0,5', 'n = 5'], {'m': 3})))

# --- 2. TSPE-529 : E(XY) = E(X)E(Y), variance d'une somme ---------------------------------------

INDEP = 'Soit $X$ et $Y$ deux variables aléatoires **indépendantes**, à valeurs réelles en nombre fini.'
TERME = 'E(XY)-E(X)E(Y)'
SOMME_XY = '\\displaystyle\\sum_{x,\\,y}xy\\,P\\left(\\{X=x\\}\\cap\\{Y=y\\}\\right)'

V529_FACTORISER = justification(
    INDEP + ' On écrit $E(XY)=' + SOMME_XY + '$, la somme portant sur les valeurs $x$ de $X$ et $y$'
    ' de $Y$.\n\nQuelle propriété permet de factoriser cette somme en'
    ' $\\left(\\displaystyle\\sum_{x}xP(X=x)\\right)\\left(\\displaystyle\\sum_{y}yP(Y=y)\\right)$ ?',
    [],
    'Par indépendance, $P\\left(\\{X=x\\}\\cap\\{Y=y\\}\\right)=P(X=x)\\times P(Y=y)$ pour tous $x$ et $y$',
    ['La linéarité de l\'espérance : $E(X+Y)=E(X)+E(Y)$',
     '$P\\left(\\{X=x\\}\\cap\\{Y=y\\}\\right)=P(X=x)+P(Y=y)$ pour tous $x$ et $y$',
     'Les évènements $\\{X=x\\}$ sont deux à deux incompatibles'],
    ['$X$ et $Y$ sont indépendantes : $P\\left(\\{X=x\\}\\cap\\{Y=y\\}\\right)=P(X=x)\\times P(Y=y)$.',
     'Chaque terme s\'écrit $xP(X=x)\\times yP(Y=y)$ : la somme double est le produit des deux'
     ' sommes simples.',
     'Donc $' + col('E(XY)=E(X)E(Y)') + '$. La linéarité ne parle que de sommes, pas de produits.'])

V529_DEVELOPPER = case(
    'Soit $X$ et $Y$ deux variables aléatoires à valeurs réelles en nombre fini (indépendantes ou'
    ' non). On rappelle que $V(Z)=E(Z^2)-\\left(E(Z)\\right)^2$ pour toute variable $Z$.\n\nEn développant,'
    ' complète.\n\n$V(X+Y)=V(X)+V(Y)+?\\left(' + TERME + '\\right)$',
    [], '2',
    ['Par linéarité, $E\\left((X+Y)^2\\right)=E(X^2)+2E(XY)+E(Y^2)$.',
     'Et $\\left(E(X+Y)\\right)^2=\\left(E(X)+E(Y)\\right)^2=E(X)^2+2E(X)E(Y)+E(Y)^2$.',
     'En soustrayant : $' + col('V(X+Y)=V(X)+V(Y)+2\\left(' + TERME + '\\right)') + '$. Si $X$ et'
     ' $Y$ sont indépendantes, le dernier terme est nul.'])

V529_CALCULER = case(
    INDEP + ' On sait que $E(X)=' + ev('u') + '$, $E(Y)=' + ev('w') + '$, $E(X^2)=' + ev('s')
    + '$ et $E(Y^2)=' + ev('t') + '$.\n\nComplète.\n\n$E\\left((X+Y)^2\\right)=?$ et $V(X+Y)=?$',
    [var('u', '1..5'), var('w', '1..5'), var('p', '1..6'), var('q', '1..6'),
     var('s', 'eval:u^2+p'), var('t', 'eval:w^2+q')],
    [ev('s+t+2*u*w'), ev('p+q')],
    ['Par indépendance, $E(XY)=E(X)E(Y)=' + ev('u*w') + '$.',
     '$E\\left((X+Y)^2\\right)=E(X^2)+2E(XY)+E(Y^2)=' + ev('s') + '+2\\times' + ev('u*w') + '+'
     + ev('t') + '=' + ev('s+t+2*u*w') + '$.',
     '$V(X+Y)=E\\left((X+Y)^2\\right)-\\left(E(X)+E(Y)\\right)^2=' + ev('s+t+2*u*w') + '-'
     + ev('u+w') + '^2=' + ev('p+q') + '$.',
     'Donc $' + col('E\\left((X+Y)^2\\right)=' + ev('s+t+2*u*w')) + '$ et $' + col('V(X+Y)='
                                                                             + ev('p+q')) + '$,'
     ' c\'est bien $V(X)+V(Y)=' + ev('p') + '+' + ev('q') + '$.'])

V529_CONTRE_EXEMPLE = case(
    'La variable aléatoire $X$ suit la loi de Bernoulli de paramètre $' + ev('k/10;d') + '$, et'
    ' l\'on pose $Y=X$.\n\n' + CONSIGNE_EXACTE + '\n\n$E(XY)=?$',
    [var('k', '1..9')], ev('k/10'),
    ['$X$ ne prend que les valeurs $0$ et $1$, donc $XY=X^2=X$ et $E(XY)=E(X)=' + ev('k/10;d') + '$.',
     'Or $E(X)E(Y)=' + ev('k/10;d') + '^2=' + ev('k^2/100;d') + '$ : l\'égalité $E(XY)=E(X)E(Y)$'
     ' est fausse ici, car $X$ et $Y=X$ ne sont pas indépendantes.',
     'Donc $' + col('E(XY)=' + ev('k/10;d')) + '$.'])

V529_PREUVE = ranger(
    INDEP + ' On démontre que $V(X+Y)=V(X)+V(Y)$.',
    ['En développant, $V(X+Y)=V(X)+V(Y)+2\\left(' + TERME + '\\right)$, sans hypothèse sur $X$ et'
     ' $Y$.',
     'Par indépendance, $P\\left(\\{X=x\\}\\cap\\{Y=y\\}\\right)=P(X=x)\\times P(Y=y)$ pour tous $x$'
     ' et $y$.',
     'En factorisant la somme $' + SOMME_XY + '$, on obtient $E(XY)=E(X)E(Y)$.',
     'Le terme $2\\left(' + TERME + '\\right)$ est donc nul.',
     'Donc $V(X+Y)=V(X)+V(Y)$.'],
    ['Le développement vaut pour toutes variables ; l\'indépendance sert seulement à montrer que'
     ' $E(XY)=E(X)E(Y)$.',
     'D\'où $' + col('V(X+Y)=V(X)+V(Y)') + '$ pour $X$ et $Y$ indépendantes.'])

MODELES.append(modele(
    '02-esperance-d-un-produit-et-variance-d-une-somme', 'E(XY) = E(X)E(Y) et variance d\'une somme',
    'Factoriser la somme qui définit E(XY) par indépendance (case choix), développement de'
    ' V(X + Y) (case), E((X + Y)²) et V(X + Y) (deux cases), contre-exemple Y = X (case),'
    ' démonstration (étapes à ranger)',
    4,
    [V529_FACTORISER, V529_DEVELOPPER, V529_CALCULER, V529_CONTRE_EXEMPLE, V529_PREUVE],
    specs_choix(0, 'indépendance', ['linéarité', 'somme des probabilités', 'incompatibles'])
    + [spec('2', 1, '2', 'correct'),
       spec('Erreur : 1', 1, '1', 'incorrect'),
       spec('Erreur : 0', 1, '0', 'incorrect'),
       spec('28 et 3', 2, ['28', '3'], 'correct', {'u': 2, 'w': 3, 'p': 1, 'q': 2, 's': 5, 't': 11}),
       spec('Erreur : sans 2E(XY)', 2, ['16', '3'], 'incorrect',
            {'u': 2, 'w': 3, 'p': 1, 'q': 2, 's': 5, 't': 11}),
       spec('Erreur : V = E(X²) + E(Y²)', 2, ['28', '16'], 'incorrect',
            {'u': 2, 'w': 3, 'p': 1, 'q': 2, 's': 5, 't': 11}),
       spec('0,3', 3, '0,3', 'correct', {'k': 3}),
       spec('Erreur : p²', 3, '0,09', 'incorrect', {'k': 3}),
       spec('Erreur : 0', 3, '0', 'incorrect', {'k': 3})]
    + ['RANGER:4']))

# --- 3. TSPE-537 : estimation d'une proportion --------------------------------------------------

INTRO_537 = (
    'On veut estimer la proportion inconnue $p$ d\'un caractère dans une population. Sur un'
    ' échantillon de $n$ individus tirés au hasard (tirages assimilés à des tirages indépendants),'
    ' on note $F_n$ la fréquence du caractère : $E(F_n)=p$ et $V(F_n)=\\dfrac{p(1-p)}{n}$. D\'après'
    ' l\'inégalité de Bienaymé-Tchebychev, pour tout $\\delta>0$,'
    ' $P\\left(\\lvert F_n-p\\rvert\\geqslant\\delta\\right)\\leqslant\\dfrac{p(1-p)}{n\\delta^2}$.')
MAJORANT = '\\dfrac{1}{4n\\delta^2}'

V537_MAJORER = justification(
    INTRO_537 + '\n\nPourquoi peut-on en déduire'
    ' $P\\left(\\lvert F_n-p\\rvert\\geqslant\\delta\\right)\\leqslant' + MAJORANT + '$, sans'
    ' connaître $p$ ?',
    [],
    'Pour tout $p\\in[0;1]$, $p(1-p)\\leqslant\\dfrac{1}{4}$',
    ['$p(1-p)=\\dfrac{1}{4}$ pour tout $p\\in[0;1]$',
     '$p\\leqslant\\dfrac{1}{4}$ dès que $n$ est assez grand',
     '$F_n$ est égale à $p$ quand $n$ est assez grand'],
    ['$\\dfrac{1}{4}-p(1-p)=p^2-p+\\dfrac{1}{4}=\\left(p-\\dfrac{1}{2}\\right)^2\\geqslant 0$ : le'
     ' maximum de $p(1-p)$, atteint en $p=\\dfrac{1}{2}$, vaut $\\dfrac{1}{4}$.',
     'Donc $\\dfrac{p(1-p)}{n\\delta^2}\\leqslant' + MAJORANT + '$, quel que soit $p$.',
     'D\'où $' + col('P\\left(\\lvert F_n-p\\rvert\\geqslant\\delta\\right)\\leqslant' + MAJORANT)
     + '$ : un majorant qui ne dépend que de $n$ et de $\\delta$.'])

V537_RISQUE = case(
    INTRO_537 + ' On en déduit $P\\left(\\lvert F_n-p\\rvert\\geqslant\\delta\\right)\\leqslant'
    + MAJORANT + '$.\n\nUn sondage interroge $n=' + ev('100*m') + '$ personnes ; on prend $\\delta='
    + ev('d/20;d') + '$. ' + CONSIGNE_EXACTE + '\n\n$P\\left(\\lvert F_n-p\\rvert\\geqslant'
    + ev('d/20;d') + '\\right)\\leqslant ?$',
    [var('m', '2..9'), var('d', '1..2')], ev('1/(m*d^2)'),
    ['$4n\\delta^2=4\\times' + ev('100*m') + '\\times' + ev('d/20;d') + '^2=' + ev('m*d^2') + '$.',
     'Donc $' + col('P\\left(\\lvert F_n-p\\rvert\\geqslant' + ev('d/20;d') + '\\right)\\leqslant'
                    + ev('1/(m*d^2)')) + '$ : au plus ce risque que l\'écart entre la fréquence'
     ' observée et $p$ atteigne $' + ev('d/20;d') + '$.'])

# 2 000 / (a d²) vaut 2 000, 1 000, 500 ou 250 : espace des milliers écrite à la main
TAILLE_537 = ('{{if:a*d^2==1|2\\,000|{{if:a*d^2==2|1\\,000|' + ev('2000/(a*d^2)') + '}}}}')

V537_TAILLE = case(
    INTRO_537 + ' On en déduit $P\\left(\\lvert F_n-p\\rvert\\geqslant\\delta\\right)\\leqslant'
    + MAJORANT + '$.\n\nOn veut une précision $\\delta=' + ev('d/20;d') + '$ avec un risque d\'au plus'
    ' $' + ev('a/20;d') + '$. Complète : le majorant $' + MAJORANT + '$ est inférieur ou égal à $'
    + ev('a/20;d') + '$ si et seulement si\n\n$n\\geqslant ?$',
    [var('a', '1..2'), var('d', '1..2')], ev('2000/(a*d^2)'),
    ['$' + MAJORANT + '\\leqslant' + ev('a/20;d') + '$ si et seulement si $n\\geqslant\\dfrac{1}{4\\times'
     + ev('a/20;d') + '\\times' + ev('d/20;d') + '^2}$.',
     '$4\\times' + ev('a/20;d') + '\\times' + ev('d/20;d') + '^2=' + ev('a*d^2/2000;d') + '$.',
     'Donc $' + col('n\\geqslant ' + TAILLE_537) + '$ : un échantillon de $' + TAILLE_537
     + '$ individus suffit.'])

V537_INTERVALLE = case(
    INTRO_537 + ' On en déduit $P\\left(\\lvert F_n-p\\rvert<\\delta\\right)\\geqslant 1-'
    + MAJORANT + '$.\n\nSur un échantillon de $n=2\\,000$ personnes, la fréquence observée est'
    ' $f=' + ev('r/100;d') + '$. Avec $\\delta=' + ev('d/20;d') + '$, on a $1-' + MAJORANT + '='
    + ev('1-1/(20*d^2);d') + '$. ' + CONSIGNE_EXACTE + '\n\nComplète l\'intervalle de confiance au'
    ' niveau $' + ev('1-1/(20*d^2);d') + '$.\n\n$?<p<?$',
    [var('r', '20..80'), var('d', '1..2')], [ev('(r-5*d)/100'), ev('(r+5*d)/100')],
    ['$\\lvert f-p\\rvert<\\delta$ équivaut à $f-\\delta<p<f+\\delta$.',
     '$f-\\delta=' + ev('r/100;d') + '-' + ev('d/20;d') + '=' + ev('(r-5*d)/100;d') + '$ et'
     ' $f+\\delta=' + ev('(r+5*d)/100;d') + '$.',
     'Donc $' + col(ev('(r-5*d)/100;d') + '<p<' + ev('(r+5*d)/100;d')) + '$, au niveau de confiance'
     ' $' + ev('1-1/(20*d^2);d') + '$ au moins.'])

MODELES.append(modele(
    '03-estimer-une-proportion', 'Estimer une proportion par l\'inégalité de Bienaymé-Tchebychev',
    'Majorer p(1 − p) par 1/4 (case choix), majorant du risque pour un sondage (case), taille'
    ' d\'échantillon pour une précision et un risque donnés (case), intervalle de confiance (deux'
    ' cases)',
    1,
    [V537_MAJORER, V537_RISQUE, V537_TAILLE, V537_INTERVALLE],
    specs_choix(0, 'p(1 − p) ≤ 1/4', ['égal à 1/4', 'p ≤ 1/4', 'F_n = p'])
    + [spec('1/4', 1, '\\frac{1}{4}', 'correct', {'m': 4, 'd': 1}),
       spec('Erreur : δ non élevé au carré', 1, '\\frac{1}{80}', 'incorrect', {'m': 4, 'd': 1}),
       spec('Erreur : sans le 4', 1, '1', 'incorrect', {'m': 4, 'd': 1}),
       spec('n ≥ 2000', 2, '2000', 'correct', {'a': 1, 'd': 1}),
       spec('Erreur : δ non élevé au carré', 2, '100', 'incorrect', {'a': 1, 'd': 1}),
       spec('Erreur : sans le 4', 2, '8000', 'incorrect', {'a': 1, 'd': 1}),
       spec('0,37 < p < 0,47', 3, ['0,37', '0,47'], 'correct', {'r': 42, 'd': 1}),
       spec('Erreur : borne droite f', 3, ['0,37', '0,42'], 'incorrect', {'r': 42, 'd': 1}),
       spec('Erreur : 2δ', 3, ['0,32', '0,52'], 'incorrect', {'r': 42, 'd': 1})]))

# --- 4. TSPE-538 : marche aléatoire -------------------------------------------------------------

PROBA_538 = ev('k/10;d')
INTRO_538 = (
    'Un pion part de l\'origine d\'une droite graduée. À chaque étape, il avance de $1$ avec la'
    ' probabilité $' + PROBA_538 + '$ et recule de $1$ sinon ; les étapes sont indépendantes. On note'
    ' $X_n$ le nombre d\'avancées au cours des $n$ premières étapes et $S_n$ l\'abscisse du pion'
    ' après $n$ étapes.')
def loi_538(nn):
    """Loi de X_nn, nn écrit en LaTeX (n, 4, ou un nombre tiré)."""
    x = 'X_{' + nn + '}'
    return ('$' + x + '$ compte les succès de $' + nn + '$ épreuves de Bernoulli indépendantes : $'
            + x + '$ suit la loi binomiale $\\mathcal{B}(' + nn + ';' + PROBA_538 + ')$.')


LOI_538 = loi_538('n')

V538_POSITION = case(
    INTRO_538 + '\n\nComplète, pour tout $n\\geqslant 1$.\n\n$S_n=?X_n-?$',
    [var('k', '1..9')], ['2', 'n'],
    ['En $n$ étapes, le pion avance $X_n$ fois et recule $n-X_n$ fois.',
     '$S_n=X_n-(n-X_n)=2X_n-n$.',
     'Donc $' + col('S_n=2X_n-n') + '$. ' + LOI_538])

V538_RETOUR = case(
    INTRO_538 + '\n\n' + CONSIGNE_EXACTE + '\n\n$P(S_4=0)=?$',
    [var('k', '1..9')], ev('6*k^2*(10-k)^2/10000'),
    ['$S_4=2X_4-4$, donc $S_4=0$ si et seulement si $X_4=2$ : deux avancées et deux reculs.',
     loi_538('4'),
     '$P(X_4=2)=\\dbinom{4}{2}\\times' + PROBA_538 + '^2\\times' + ev('1-k/10;d') + '^2=6\\times'
     + ev('k^2/100;d') + '\\times' + ev('(10-k)^2/100;d') + '$.',
     'Donc $' + col('P(S_4=0)=' + ev('6*k^2*(10-k)^2/10000;d')) + '$.'])

V538_MOMENTS = case(
    INTRO_538 + '\n\n' + CONSIGNE_EXACTE + '\n\n$E(S_{' + ev('N') + '})=?$ et $V(S_{' + ev('N')
    + '})=?$',
    [var('k', '1..9'), var('N', '10..50')],
    [ev('N*(2*k-10)/10'), ev('4*N*k*(10-k)/100')],
    [loi_538(ev('N'))
     + ' Donc $E(X_{' + ev('N') + '})=' + ev('N*k/10;d') + '$ et $V(X_{' + ev('N') + '})='
     + ev('N*k*(10-k)/100;d') + '$.',
     '$S_{' + ev('N') + '}=2X_{' + ev('N') + '}-' + ev('N') + '$ : $E(S_{' + ev('N') + '})=2E(X_{'
     + ev('N') + '})-' + ev('N') + '$ et $V(S_{' + ev('N') + '})=2^2V(X_{' + ev('N') + '})$.',
     'Donc $' + col('E(S_{' + ev('N') + '})=' + ev('N*(2*k-10)/10;d')) + '$ et $' + col(
         'V(S_{' + ev('N') + '})=' + ev('4*N*k*(10-k)/100;d')) + '$.'])

V538_PARITE = justification(
    INTRO_538 + '\n\nQue vaut $P(S_{' + ev('2*m+1') + '}=0)$ ?',
    [var('k', '1..9'), var('m', '3..12')],
    '$0$, car $S_{' + ev('2*m+1') + '}=2X_{' + ev('2*m+1') + '}-' + ev('2*m+1') + '$ est un entier'
    ' impair',
    ['$\\dfrac{1}{2}$, car le pion avance et recule autant en moyenne',
     '$' + PROBA_538 + '^{' + ev('2*m+1') + '}$',
     '$P(X_{' + ev('2*m+1') + '}=' + ev('m') + ')$'],
    ['$S_{' + ev('2*m+1') + '}=2X_{' + ev('2*m+1') + '}-' + ev('2*m+1') + '$ : un nombre pair moins'
     ' un nombre impair est impair.',
     '$S_{' + ev('2*m+1') + '}$ ne vaut jamais $0$ ; $X_{' + ev('2*m+1') + '}=' + ev('m')
     + '$ donne $S_{' + ev('2*m+1') + '}=-1$.',
     'Donc $' + col('P(S_{' + ev('2*m+1') + '}=0)=0') + '$ : après un nombre impair d\'étapes, le'
     ' pion n\'est jamais à l\'origine.'])

MODELES.append(modele(
    '04-marche-aleatoire-et-loi-binomiale', 'Marche aléatoire et loi binomiale',
    'Pion sur une droite graduée : S_n = 2X_n − n (deux cases), P(S_4 = 0) par la loi binomiale'
    ' (case), espérance et variance de S_N (deux cases), retour à l\'origine après un nombre impair'
    ' d\'étapes (case choix)',
    6,
    [V538_POSITION, V538_RETOUR, V538_MOMENTS, V538_PARITE],
    [spec('2X_n − n', 0, ['2', 'n'], 'correct', {'k': 3}),
     spec('Erreur : X_n − n', 0, ['1', 'n'], 'incorrect', {'k': 3}),
     spec('Erreur : 2X_n', 0, ['2', '0'], 'incorrect', {'k': 3}),
     spec('0,2646', 1, '0,2646', 'correct', {'k': 3}),
     spec('Erreur : sans le coefficient binomial', 1, '0,0441', 'incorrect', {'k': 3}),
     spec('Erreur : q⁴', 1, '0,2401', 'incorrect', {'k': 3}),
     spec('−8 et 16,8', 2, ['-8', '16,8'], 'correct', {'k': 3, 'N': 20}),
     spec('Erreur : E(X)', 2, ['6', '16,8'], 'incorrect', {'k': 3, 'N': 20}),
     spec('Erreur : 2V(X)', 2, ['-8', '8,4'], 'incorrect', {'k': 3, 'N': 20})]
    + specs_choix(3, '0, parité', ['1/2', 'pⁿ', 'P(X = m)'], {'k': 3, 'm': 5})))

# --- 5. TSPE-539 : sondage, sex ratio, demi-vie -------------------------------------------------

INTRO_539 = (
    'On répète $n$ fois, de façon indépendante, une épreuve dont le succès a la probabilité $p$, et'
    ' l\'on note $F_n$ la fréquence des succès. L\'inégalité de concentration donne, pour tout'
    ' $\\delta>0$, $P\\left(\\lvert F_n-p\\rvert\\geqslant\\delta\\right)\\leqslant\\dfrac{p(1-p)}'
    '{n\\delta^2}\\leqslant\\dfrac{1}{4n\\delta^2}$.')

V539_SONDAGE = case(
    INTRO_539 + '\n\n**Sondage.** On interroge $n=1\\,000$ personnes ; $p$ est la proportion, dans la'
    ' population, des personnes favorables à un projet. On prend $\\delta=' + ev('d/20;d') + '$. '
    + CONSIGNE_EXACTE + '\n\nComplète le majorant $\\dfrac{1}{4n\\delta^2}$.\n\n'
    '$P\\left(\\lvert F_n-p\\rvert\\geqslant' + ev('d/20;d') + '\\right)\\leqslant ?$',
    [var('d', '1..2')], ev('1/(10*d^2)'),
    ['$4n\\delta^2=4\\times 1\\,000\\times' + ev('d/20;d') + '^2=' + ev('10*d^2') + '$.',
     'Donc $' + col('P\\left(\\lvert F_n-p\\rvert\\geqslant' + ev('d/20;d') + '\\right)\\leqslant'
                    + ev('1/(10*d^2);d')) + '$ : avec mille personnes, un écart de $'
     + ev('d/20;d') + '$ reste possible.'])

V539_SEX_RATIO = case(
    INTRO_539 + '\n\n**Sex ratio.** Sur $n=10^6$ naissances, $F_n$ est la fréquence des garçons et'
    ' $p$ la probabilité qu\'un nouveau-né soit un garçon (environ $0{,}512$). On prend $\\delta='
    + ev('d/1000;d') + '$. ' + CONSIGNE_EXACTE + '\n\nComplète le majorant'
    ' $\\dfrac{1}{4n\\delta^2}$.\n\n$P\\left(\\lvert F_n-p\\rvert\\geqslant' + ev('d/1000;d')
    + '\\right)\\leqslant ?$',
    [var('d', '2..5')], ev('1/(4*d^2)'),
    ['$\\delta^2=' + ev('d^2') + '\\times 10^{-6}$, donc $4n\\delta^2=4\\times 10^6\\times' + ev('d^2')
     + '\\times 10^{-6}=' + ev('4*d^2') + '$.',
     'Donc $' + col('P\\left(\\lvert F_n-p\\rvert\\geqslant' + ev('d/1000;d') + '\\right)\\leqslant'
                    + ev('1/(4*d^2)')) + '$ : sur un million de naissances, la fréquence des garçons'
     ' s\'écarte rarement de $p$ de plus de $' + ev('d/1000;d') + '$.'])

V539_DEMI_VIE = case(
    INTRO_539 + '\n\n**Demi-vie.** Un échantillon contient $n=10^{23}$ atomes radioactifs ; chacun se'
    ' désintègre pendant une demi-vie avec la probabilité $p=\\dfrac{1}{2}$, indépendamment des'
    ' autres. $F_n$ est la proportion d\'atomes désintégrés au bout d\'une demi-vie.\n\nComplète.'
    '\n\n$P\\left(\\left\\lvert F_n-\\dfrac{1}{2}\\right\\rvert\\geqslant 10^{-' + ev('k')
    + '}\\right)\\leqslant 2{,}5\\times 10^{?}$',
    [var('k', '3..8')], ev('2*k-24'),
    ['Ici $p(1-p)=\\dfrac{1}{4}$ exactement : le majorant vaut $\\dfrac{1}{4n\\delta^2}=\\dfrac{1}{4'
     '\\times 10^{23}\\times 10^{-' + ev('2*k') + '}}=\\dfrac{10^{' + ev('2*k-23') + '}}{4}$.',
     '$\\dfrac{1}{4}=2{,}5\\times 10^{-1}$, donc $\\dfrac{10^{' + ev('2*k-23') + '}}{4}=2{,}5\\times 10^{'
     + ev('2*k-24') + '}$.',
     'Donc $' + col('P\\left(\\left\\lvert F_n-\\dfrac{1}{2}\\right\\rvert\\geqslant 10^{-' + ev('k')
                    + '}\\right)\\leqslant 2{,}5\\times 10^{' + ev('2*k-24') + '}') + '$ : la moitié'
     ' des atomes, à $10^{-' + ev('k') + '}$ près, est désintégrée, de façon quasi certaine.'])

V539_COMPARER = justification(
    INTRO_539 + '\n\nPour un même $\\delta$, par combien le majorant $\\dfrac{1}{4n\\delta^2}$ est-il'
    ' divisé quand on passe d\'un sondage de $n=10^3$ personnes à une étude de $n=10^6$ naissances ?',
    [],
    'Par $1\\,000$',
    ['Par $\\sqrt{1\\,000}$', 'Par $10^6$', 'Il ne change pas : seul $\\delta$ compte'],
    ['Le majorant $\\dfrac{1}{4n\\delta^2}$ est inversement proportionnel à $n$.',
     '$n$ est multiplié par $\\dfrac{10^6}{10^3}=1\\,000$.',
     'Donc le majorant est divisé par $' + col('1\\,000') + '$. (C\'est l\'écart type de $F_n$, en'
     ' $\\dfrac{1}{\\sqrt{n}}$, qui est divisé par $\\sqrt{1\\,000}$.)'])

MODELES.append(modele(
    '05-concentration-sondage-sex-ratio-demi-vie', 'Concentration : sondage, sex ratio, demi-vie',
    'Majorant 1/(4nδ²) de l\'inégalité de concentration pour un sondage (n = 1 000, case), le sex'
    ' ratio (n = 10⁶, case), la demi-vie (n = 10²³, exposant en case), effet de n sur le majorant'
    ' (case choix)',
    3,
    [V539_SONDAGE, V539_SEX_RATIO, V539_DEMI_VIE, V539_COMPARER],
    [spec('0,1', 0, '0,1', 'correct', {'d': 1}),
     spec('Erreur : δ non élevé au carré', 0, '0,005', 'incorrect', {'d': 1}),
     spec('Erreur : sans le 4', 0, '0,4', 'incorrect', {'d': 1}),
     spec('1/16', 1, '\\frac{1}{16}', 'correct', {'d': 2}),
     spec('Erreur : 1/(4d)', 1, '\\frac{1}{8}', 'incorrect', {'d': 2}),
     spec('Erreur : sans le 4', 1, '\\frac{1}{4}', 'incorrect', {'d': 2}),
     spec('10^{−12}', 2, '-12', 'correct', {'k': 6}),
     spec('Erreur : δ non élevé au carré', 2, '-18', 'incorrect', {'k': 6}),
     spec('Erreur : 1/4 oublié', 2, '-11', 'incorrect', {'k': 6})]
    + specs_choix(3, 'par 1 000', ['√1 000', '10⁶', 'ne change pas'])))
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
