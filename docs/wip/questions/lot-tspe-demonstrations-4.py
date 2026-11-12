"""Écrit les 5 modèles du lot 4 « démonstrations : intégration et loi binomiale » de la terminale
spécialité dans scripts/questions/tspe-demonstrations-4/.

Phase 0 validée par David le 2026-11-11 (« je suis tes recos », D1 du journal
« docs/wip/questions-tspe-demonstrations-progress.md », § 2), un point par modèle :

| # | Point     | Titre                                                              | Nœud du point (prod), niveau                    |
| 1 | TSPE-494  | Démontrer que la fonction intégrale est une primitive              | Fonction intégrale › dérivée d'une f. int., 4   |
| 2 | TSPE-495  | Démontrer la formule d'intégration par parties                     | Calcul d'intégrales › intégration par parties, 4 |
| 3 | TSPE-512  | Démontrer l'expression de la probabilité de k succès               | Loi binomiale › expression de la loi, 7         |
| 4 | TSPE-528  | Démontrer l'espérance de la loi binomiale                          | Loi binomiale › espérance et variance, 3        |
| 5 | TSPE-623  | Démontrer la variance de la loi binomiale                          | Loi binomiale › espérance et variance, 4        |

Forme (D1, Q2) : 3 variations à trous (case, ou case choix à 4 propositions) + une variation
« étapes à ranger » (` ```ranger `, `signe: aucun`). Valeurs tirées (Q3) : n et k pour 512, n et p
pour 528 et 623 (variation d'exemple) ; lettres ailleurs.

Niveaux : après ceux déjà présents sur le nœud (relevé prod du 2026-11-12 : dérivée d'une fonction
intégrale 2-3, intégration par parties 1-3, expression de la loi 1-6, espérance et variance 1-2 ;
623 après 528).

    python3 docs/wip/questions/lot-tspe-demonstrations-4.py scripts/questions/tspe-demonstrations-4
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

# --- 1. TSPE-494 : x ↦ ∫ₐˣ f est une primitive de f (f positive croissante) ------------------------

INTEGRALE_F = '\\displaystyle\\int_a^x f(t)\\,\\mathrm{d}t'
INTRO_494 = ('Soit $f$ une fonction continue, positive et croissante sur $[a\\,;\\,b]$, et $F$ la'
             ' fonction définie sur $[a\\,;\\,b]$ par $F(x)=' + INTEGRALE_F + '$. On démontre que $F$'
             ' est une primitive de $f$, puis que $\\displaystyle\\int_a^b f(x)\\,\\mathrm{d}x='
             'G(b)-G(a)$ pour toute primitive $G$ de $f$.\n\n')
ACCROISSEMENT = ('Soit $x$ dans $[a\\,;\\,b[$ et $h>0$ tel que $x+h\\leqslant b$ (le cas $h<0$ se'
                 ' traite de même). $F(x+h)-F(x)=\\displaystyle\\int_x^{x+h}f(t)\\,\\mathrm{d}t$ est'
                 ' l\'aire sous la courbe de $f$ entre $x$ et $x+h$.\n\n')

V494_ENCADRER = justification(
    INTRO_494 + ACCROISSEMENT + 'Pourquoi a-t-on $h\\,f(x)\\leqslant F(x+h)-F(x)\\leqslant'
    ' h\\,f(x+h)$ ?',
    [],
    'Car $f$ est croissante : pour $t$ entre $x$ et $x+h$, $f(x)\\leqslant f(t)\\leqslant f(x+h)$.',
    ['Car $f$ est positive sur $[a\\,;\\,b]$.',
     'Car $F$ est croissante sur $[a\\,;\\,b]$.',
     'Car $f$ est continue en $x$.'],
    ['$f$ est croissante : pour $t$ entre $x$ et $x+h$, $f(x)\\leqslant f(t)\\leqslant f(x+h)$.',
     'L\'aire sous la courbe entre $x$ et $x+h$ est donc comprise entre celles de deux rectangles'
     ' de largeur $h$ : $' + col('h\\,f(x)\\leqslant F(x+h)-F(x)\\leqslant h\\,f(x+h)') + '$.',
     'La positivité de $f$ sert à lire l\'intégrale comme une aire ; c\'est la croissance qui'
     ' donne l\'encadrement.'])
V494_LIMITE = case(
    INTRO_494 + ACCROISSEMENT + 'On a $h\\,f(x)\\leqslant F(x+h)-F(x)\\leqslant h\\,f(x+h)$, donc,'
    ' en divisant par $h>0$, $f(x)\\leqslant\\dfrac{F(x+h)-F(x)}{h}\\leqslant f(x+h)$. Comme $f$'
    ' est continue, complète.\n\n$\\displaystyle\\lim_{h\\to 0^+}\\dfrac{F(x+h)-F(x)}{h}=?$',
    [], 'f(x)',
    ['$f$ est continue en $x$ : $\\displaystyle\\lim_{h\\to 0^+}f(x+h)=f(x)$.',
     'Le quotient est encadré par $f(x)$ et $f(x+h)$, qui tendent tous deux vers $f(x)$ : par'
     ' encadrement, sa limite est $' + col('f(x)') + '$.',
     'Ainsi $F$ est dérivable et $F\'=f$ : $F$ est une primitive de $f$.'])
V494_VALEUR = case(
    INTRO_494 + '$F$ est une primitive de $f$. Soit $G$ une primitive de $f$ : il existe un réel'
    ' $c$ tel que $G=F+c$, donc $G(b)-G(a)=F(b)-F(a)$. Complète.\n\n$F(a)=?$',
    [], '0',
    ['$F(a)=\\displaystyle\\int_a^a f(t)\\,\\mathrm{d}t$ : l\'aire d\'une bande de largeur nulle.',
     'Donc $F(a)=' + col('0') + '$, et $G(b)-G(a)=F(b)=\\displaystyle\\int_a^b f(x)\\,'
     '\\mathrm{d}x$.'])
V494_RANGER = ranger(
    'Soit $f$ une fonction continue, positive et croissante sur $[a\\,;\\,b]$, et $F(x)='
    + INTEGRALE_F + '$. On démontre que $F$ est une primitive de $f$, puis que'
    ' $\\displaystyle\\int_a^b f(x)\\,\\mathrm{d}x=G(b)-G(a)$ pour toute primitive $G$ de $f$.',
    ['Pour $h>0$, $f$ étant croissante : $h\\,f(x)\\leqslant F(x+h)-F(x)\\leqslant h\\,f(x+h)$.',
     'On divise par $h$ ; par continuité de $f$ et encadrement, le quotient tend vers $f(x)$ :'
     ' $F\'(x)=f(x)$.',
     'Si $G$ est une primitive de $f$, alors $G=F+c$ avec $c$ réel, et $F(a)=0$.',
     'Donc $G(b)-G(a)=F(b)-F(a)=\\displaystyle\\int_a^b f(x)\\,\\mathrm{d}x$.'],
    ['On encadre le taux d\'accroissement de $F$, puis on compare $F$ à une primitive quelconque.',
     'Conclusion : $' + col('\\displaystyle\\int_a^b f(x)\\,\\mathrm{d}x=G(b)-G(a)') + '$.'])

MODELES.append(modele(
    '01-demontrer-fonction-integrale-primitive',
    'Démontrer que la fonction intégrale d\'une fonction positive croissante est une primitive',
    'Démonstration à trous : encadrement par croissance (choix), limite du taux f(x) (case),'
    ' F(a) = 0 (case) ; étapes à ranger',
    4,
    [V494_ENCADRER, V494_LIMITE, V494_VALEUR, V494_RANGER],
    specs_choix(0, 'f croissante', ['f positive', 'F croissante', 'f continue'])
    + [spec('f(x)', 1, 'f(x)', 'correct'),
       spec('Erreur : f(x + h)', 1, 'f(x+h)', 'incorrect'),
       spec('Erreur : 0', 1, '0', 'incorrect'),
       spec('Erreur : f(h)', 1, 'f(h)', 'incorrect')]
    + [spec('0', 2, '0', 'correct'),
       spec('Erreur : f(a)', 2, 'f(a)', 'incorrect'),
       spec('Erreur : 1', 2, '1', 'incorrect'),
       spec('Erreur : a', 2, 'a', 'incorrect')]
    + ['RANGER:3']))

# --- 2. TSPE-495 : intégration par parties ----------------------------------------------------------

IPP = ('\\displaystyle\\int_a^b u(x)v\'(x)\\,\\mathrm{d}x=\\big[u(x)v(x)\\big]_a^b-\\int_a^b'
       ' u\'(x)v(x)\\,\\mathrm{d}x')
INTRO_495 = ('Soit $u$ et $v$ deux fonctions dérivables sur $[a\\,;\\,b]$, de dérivées $u\'$ et $v\'$'
             ' continues. On démontre la formule d\'intégration par parties :\n\n$' + IPP + '$.\n\n')

V495_DERIVEE = justification(
    INTRO_495 + 'On part de la dérivée du produit $uv$. Pour tout $x$ de $[a\\,;\\,b]$, que vaut'
    ' $(uv)\'(x)$ ?',
    [],
    '$u\'(x)v(x)+u(x)v\'(x)$',
    ['$u\'(x)v\'(x)$',
     '$u\'(x)v(x)-u(x)v\'(x)$',
     '$u\'(x)+v\'(x)$'],
    ['La dérivée d\'un produit est $(uv)\'=u\'v+uv\'$.',
     'Donc $(uv)\'(x)=' + col('u\'(x)v(x)+u(x)v\'(x)') + '$.',
     'La dérivée d\'un produit n\'est pas le produit des dérivées.'])
V495_PRIMITIVE = justification(
    INTRO_495 + 'Pour tout $x$, $(uv)\'(x)=u\'(x)v(x)+u(x)v\'(x)$. Pourquoi'
    ' $\\displaystyle\\int_a^b (uv)\'(x)\\,\\mathrm{d}x=u(b)v(b)-u(a)v(a)$ ?',
    [],
    'Car $uv$ est une primitive de $(uv)\'$ sur $[a\\,;\\,b]$.',
    ['Car $u$ et $v$ sont continues sur $[a\\,;\\,b]$.',
     'Car l\'intégrale d\'un produit est le produit des intégrales.',
     'Car $u(a)v(a)=0$.'],
    ['$(uv)\'$ est continue et $uv$ en est une primitive sur $[a\\,;\\,b]$.',
     'Donc $\\displaystyle\\int_a^b (uv)\'(x)\\,\\mathrm{d}x=' + col('\\big[u(x)v(x)\\big]_a^b')
     + '=u(b)v(b)-u(a)v(a)$.',
     'L\'intégrale d\'un produit n\'est pas le produit des intégrales : c\'est justement ce que la'
     ' formule contourne.'])
V495_CONCLURE = justification(
    INTRO_495 + 'Par linéarité, $\\displaystyle\\int_a^b u\'(x)v(x)\\,\\mathrm{d}x+\\int_a^b'
    ' u(x)v\'(x)\\,\\mathrm{d}x=\\big[u(x)v(x)\\big]_a^b$. Que vaut alors'
    ' $\\displaystyle\\int_a^b u(x)v\'(x)\\,\\mathrm{d}x$ ?',
    [],
    '$\\big[u(x)v(x)\\big]_a^b-\\int_a^b u\'(x)v(x)\\,\\mathrm{d}x$',
    ['$\\big[u(x)v(x)\\big]_a^b+\\int_a^b u\'(x)v(x)\\,\\mathrm{d}x$',
     '$\\big[u(x)v(x)\\big]_a^b-\\int_a^b u\'(x)v\'(x)\\,\\mathrm{d}x$',
     '$\\big[u(x)v(x)\\big]_a^b\\times\\int_a^b u\'(x)v(x)\\,\\mathrm{d}x$'],
    ['On isole $\\displaystyle\\int_a^b u(x)v\'(x)\\,\\mathrm{d}x$ en retranchant'
     ' $\\displaystyle\\int_a^b u\'(x)v(x)\\,\\mathrm{d}x$ aux deux membres.',
     'On obtient $' + col(IPP) + '$.',
     'Le terme déplacé change de signe : c\'est une soustraction, pas une addition.'])
V495_RANGER = ranger(
    'Soit $u$ et $v$ deux fonctions dérivables sur $[a\\,;\\,b]$, de dérivées continues. On démontre'
    ' la formule d\'intégration par parties.',
    ['Pour tout $x$ de $[a\\,;\\,b]$, $(uv)\'(x)=u\'(x)v(x)+u(x)v\'(x)$.',
     '$uv$ est une primitive de $(uv)\'$ : $\\displaystyle\\int_a^b (uv)\'(x)\\,\\mathrm{d}x='
     '\\big[u(x)v(x)\\big]_a^b$.',
     'Par linéarité, $\\displaystyle\\int_a^b u\'(x)v(x)\\,\\mathrm{d}x+\\int_a^b u(x)v\'(x)\\,'
     '\\mathrm{d}x=\\big[u(x)v(x)\\big]_a^b$.',
     'Donc $' + IPP + '$.'],
    ['On intègre la formule de dérivation d\'un produit.',
     'Conclusion : $' + col(IPP) + '$.'])

MODELES.append(modele(
    '02-demontrer-integration-par-parties',
    'Démontrer la formule d\'intégration par parties',
    'Démonstration à trous : dérivée de uv (choix), uv primitive de (uv)′ (choix), formule isolée'
    ' (choix) ; étapes à ranger',
    4,
    [V495_DERIVEE, V495_PRIMITIVE, V495_CONCLURE, V495_RANGER],
    specs_choix(0, 'u′v + uv′', ['u′v′', 'u′v − uv′', 'u′ + v′'])
    + specs_choix(1, 'uv primitive', ['continuité', 'produit des intégrales', 'u(a)v(a) = 0'])
    + specs_choix(2, 'formule', ['signe +', 'u′v′', 'produit'])
    + ['RANGER:3']))

# --- 3. TSPE-512 : probabilité de k succès (n et k tirés dans une variation) ------------------------

INTRO_512 = ('On répète $n$ fois, de façon indépendante, une épreuve de Bernoulli de probabilité de'
             ' succès $p$ ; $X$ est le nombre de succès. On démontre que, pour tout entier $k$ de'
             ' $0$ à $n$, $P(X=k)=\\dbinom{n}{k}p^k(1-p)^{n-k}$.\n\n'
             'On représente l\'expérience par un arbre à $n$ niveaux.\n\n')
V_NK = [var('n', '3..6'), var('k', '1..{{eval:n-1}}')]
NK = {'n': 5, 'k': 2}

V512_CHEMIN = justification(
    INTRO_512 + 'Un chemin de l\'arbre comporte exactement $k$ succès et $n-k$ échecs. Pourquoi sa'
    ' probabilité est-elle $p^k(1-p)^{n-k}$ ?',
    [],
    'Les épreuves sont indépendantes : on multiplie les probabilités le long du chemin, $k$ fois'
    ' $p$ et $n-k$ fois $1-p$.',
    ['On additionne les probabilités le long du chemin.',
     'Chaque succès a la probabilité $p$, donc le chemin a la probabilité $kp$.',
     'Il y a $\\dbinom{n}{k}$ chemins de ce type.'],
    ['La probabilité d\'un chemin est le produit des probabilités de ses branches.',
     '$k$ branches valent $p$ et $n-k$ valent $1-p$ : $' + col('p^k(1-p)^{n-k}') + '$.',
     'Le nombre de chemins sert à l\'étape suivante, pas à la probabilité d\'un seul chemin.'])
V512_COMPTER = case(
    INTRO_512 + 'On compte les chemins qui comportent exactement $k$ succès. Exemple : pour $n='
    + v('n') + '$, combien de chemins comportent exactement $' + v('k') + '$ succès ?\n\n'
    'Il y en a $?$.',
    V_NK, '{{eval:binom(n,k)}}',
    ['Un tel chemin est déterminé par les positions de ses $' + v('k') + '$ succès parmi les $'
     + v('n') + '$ épreuves.',
     'Il y en a donc $\\dbinom{' + v('n') + '}{' + v('k') + '}=' + col('{{eval:binom(n,k)}}')
     + '$.'])
V512_CONCLURE = justification(
    INTRO_512 + 'Il y a $\\dbinom{n}{k}$ chemins à $k$ succès, chacun de probabilité'
    ' $p^k(1-p)^{n-k}$. Pourquoi $P(X=k)=\\dbinom{n}{k}p^k(1-p)^{n-k}$ ?',
    [],
    'L\'événement $\\{X=k\\}$ est la réunion de ces chemins, deux à deux incompatibles : on'
    ' additionne leurs probabilités, toutes égales.',
    ['On multiplie les probabilités de ces chemins.',
     'Ces chemins sont indépendants, donc on additionne leurs probabilités.',
     'On ne garde que le chemin le plus probable.'],
    ['Deux chemins différents correspondent à deux issues différentes : ils sont incompatibles.',
     'On additionne $\\dbinom{n}{k}$ fois $p^k(1-p)^{n-k}$ : $'
     + col('P(X=k)=\\dbinom{n}{k}p^k(1-p)^{n-k}') + '$.',
     'Incompatibles et indépendants, ce n\'est pas la même chose : c\'est l\'incompatibilité qui'
     ' permet d\'additionner.'])
V512_RANGER = ranger(
    'On répète $n$ fois, de façon indépendante, une épreuve de Bernoulli de probabilité de succès'
    ' $p$ ; $X$ est le nombre de succès. On démontre que $P(X=k)=\\dbinom{n}{k}p^k(1-p)^{n-k}$.',
    ['On représente l\'expérience par un arbre à $n$ niveaux.',
     'Un chemin à $k$ succès et $n-k$ échecs a pour probabilité $p^k(1-p)^{n-k}$, par'
     ' indépendance.',
     'Il y a $\\dbinom{n}{k}$ chemins de ce type : on choisit les positions des $k$ succès.',
     'Ces chemins sont incompatibles : $P(X=k)=\\dbinom{n}{k}p^k(1-p)^{n-k}$.'],
    ['On calcule la probabilité d\'un chemin, puis on compte les chemins.',
     'Conclusion : $' + col('P(X=k)=\\dbinom{n}{k}p^k(1-p)^{n-k}') + '$.'])

MODELES.append(modele(
    '03-demontrer-loi-binomiale',
    'Démontrer l\'expression de la probabilité de k succès dans un schéma de Bernoulli',
    'Démonstration à trous : probabilité d\'un chemin (choix), nombre de chemins (case, n et k'
    ' tirés), incompatibilité (choix) ; étapes à ranger',
    7,
    [V512_CHEMIN, V512_COMPTER, V512_CONCLURE, V512_RANGER],
    specs_choix(0, 'produit, indépendance', ['somme', 'kp', 'nombre de chemins'])
    + [spec('C(5, 2) = 10', 1, '10', 'correct', NK),
       spec('Erreur : 5 × 4 = 20, ordre compté', 1, '20', 'incorrect', NK),
       spec('Erreur : 2⁵ = 32, tous les chemins', 1, '32', 'incorrect', NK),
       spec('Erreur : 5', 1, '5', 'incorrect', NK)]
    + specs_choix(2, 'incompatibilité', ['produit', 'indépendants', 'le plus probable'])
    + ['RANGER:3']))

# --- 4. TSPE-528 : espérance de la loi binomiale (n et p tirés dans une variation) -----------------

DECOMPOSITION = ('On écrit $X=X_1+X_2+\\cdots+X_n$, où $X_i$ vaut $1$ si la $i$-ième épreuve est un'
                 ' succès et $0$ sinon : chaque $X_i$ suit la loi de Bernoulli de paramètre $p$.\n\n')
INTRO_528 = ('Soit $X$ une variable aléatoire de loi binomiale $\\mathcal{B}(n\\,;p)$. On démontre que'
             ' $E(X)=np$.\n\n' + DECOMPOSITION)
V_NT = [var('n', '2..20'), var('t', '1..9')]
NT = {'n': 10, 't': 3}
P_DEC = '{{eval:t/10;d}}'

V528_BERNOULLI = case(
    INTRO_528 + 'Complète.\n\n$E(X_i)=1\\times p+0\\times(1-p)=?$',
    [], 'p',
    ['$X_i$ vaut $1$ avec la probabilité $p$ et $0$ avec la probabilité $1-p$.',
     'Donc $E(X_i)=1\\times p+0\\times(1-p)=' + col('p') + '$.'])
V528_LINEARITE = justification(
    INTRO_528 + 'Pourquoi $E(X)=E(X_1)+E(X_2)+\\cdots+E(X_n)$ ?',
    [],
    'Par linéarité de l\'espérance.',
    ['Parce que les $X_i$ sont indépendantes : sans indépendance, ce serait faux.',
     'Parce que $X=nX_1$.',
     'Parce que les $X_i$ ne prennent que les valeurs $0$ et $1$.'],
    ['L\'espérance d\'une somme de variables aléatoires est la somme de leurs espérances.',
     'Donc $' + col('E(X)=E(X_1)+\\cdots+E(X_n)') + '$.',
     'La linéarité de l\'espérance ne demande pas l\'indépendance (c\'est la variance qui la'
     ' demande).'])
V528_EXEMPLE = case(
    INTRO_528 + 'Exemple : pour $n=' + v('n') + '$ et $p=' + P_DEC + '$, chaque $E(X_i)$ vaut $'
    + P_DEC + '$. Calcule $E(X)$ (nombre entier ou décimal).\n\n$E(X)=?$',
    V_NT, '{{eval:n*t/10;d}}',
    ['$E(X)=E(X_1)+\\cdots+E(X_{' + v('n') + '})$ : $' + v('n') + '$ termes égaux à $' + P_DEC
     + '$.',
     '$E(X)=' + v('n') + '\\times' + P_DEC + '=' + col('{{eval:n*t/10;d}}') + '$.'])
V528_RANGER = ranger(
    'Soit $X$ une variable aléatoire de loi binomiale $\\mathcal{B}(n\\,;p)$. On démontre que'
    ' $E(X)=np$.',
    ['On écrit $X=X_1+\\cdots+X_n$, où les $X_i$ suivent la loi de Bernoulli de paramètre $p$.',
     'Pour chaque $i$, $E(X_i)=1\\times p+0\\times(1-p)=p$.',
     'Par linéarité, $E(X)=E(X_1)+\\cdots+E(X_n)=p+\\cdots+p$.',
     'Donc $E(X)=np$.'],
    ['On décompose $X$ en somme de variables de Bernoulli.',
     'Conclusion : $' + col('E(X)=np') + '$.'])

MODELES.append(modele(
    '04-demontrer-esperance-loi-binomiale',
    'Démontrer l\'espérance de la loi binomiale',
    'Démonstration à trous : E(Xᵢ) = p (case), linéarité (choix), exemple (case, n et p tirés) ;'
    ' étapes à ranger',
    3,
    [V528_BERNOULLI, V528_LINEARITE, V528_EXEMPLE, V528_RANGER],
    [spec('p', 0, 'p', 'correct'),
     spec('Erreur : 1', 0, '1', 'incorrect'),
     spec('Erreur : 1 − p', 0, '1-p', 'incorrect'),
     spec('Erreur : p(1 − p)', 0, 'p(1-p)', 'incorrect')]
    + specs_choix(1, 'linéarité', ['indépendance', 'X = nX₁', 'valeurs 0 et 1'])
    + [spec('n = 10, p = 0,3 → 3', 2, '3', 'correct', NT),
       spec('Erreur : variance 2,1', 2, '2,1', 'incorrect', NT),
       spec('Erreur : p = 0,3', 2, '0,3', 'incorrect', NT),
       spec('Erreur : n + p = 10,3', 2, '10,3', 'incorrect', NT),
       spec('n = 8, p = 0,3 → 2,4', 2, '2,4', 'correct', {'n': 8, 't': 3})]
    + ['RANGER:3']))

# --- 5. TSPE-623 : variance de la loi binomiale (n et p tirés dans une variation) ------------------

INTRO_623 = ('Soit $X$ une variable aléatoire de loi binomiale $\\mathcal{B}(n\\,;p)$. On démontre que'
             ' $V(X)=np(1-p)$.\n\n' + DECOMPOSITION.replace(
                 'paramètre $p$.', 'paramètre $p$, et les $X_i$ sont indépendantes (les épreuves'
                 ' le sont).'))

V623_BERNOULLI = case(
    INTRO_623 + '$E(X_i)=p$. Complète le calcul de la variance de $X_i$.\n\n'
    '$V(X_i)=(1-p)^2\\times p+(0-p)^2\\times ?$',
    [], '1-p',
    ['$X_i$ vaut $1$ avec la probabilité $p$ et $0$ avec la probabilité $' + col('1-p') + '$.',
     'Donc $V(X_i)=(1-p)^2p+p^2(1-p)=p(1-p)\\big((1-p)+p\\big)=p(1-p)$.'])
V623_INDEPENDANCE = justification(
    INTRO_623 + 'On sait que $V(X_i)=p(1-p)$. Pourquoi $V(X)=V(X_1)+V(X_2)+\\cdots+V(X_n)$ ?',
    [],
    'Car $X_1$, …, $X_n$ sont indépendantes : la variance d\'une somme de variables indépendantes'
    ' est la somme de leurs variances.',
    ['Par linéarité, toujours vraie pour la variance.',
     'Car $V(X)=E(X^2)-E(X)^2$.',
     'Car $X=nX_1$, donc $V(X)=nV(X_1)$.'],
    ['Les épreuves sont indépendantes, donc les $X_i$ aussi.',
     'Pour des variables indépendantes, $' + col('V(X)=V(X_1)+\\cdots+V(X_n)') + '$.',
     'Sans indépendance, la variance d\'une somme n\'est pas, en général, la somme des'
     ' variances.'])
V623_EXEMPLE = case(
    INTRO_623 + 'Exemple : pour $n=' + v('n') + '$ et $p=' + P_DEC + '$, calcule $V(X)$ (nombre'
    ' entier ou décimal).\n\n$V(X)=?$',
    V_NT, '{{eval:n*t*(10-t)/100;d}}',
    ['Chaque $V(X_i)$ vaut $' + P_DEC + '\\times{{eval:(10-t)/10;d}}={{eval:t*(10-t)/100;d}}$.',
     '$V(X)=' + v('n') + '\\times{{eval:t*(10-t)/100;d}}=' + col('{{eval:n*t*(10-t)/100;d}}')
     + '$.'])
V623_RANGER = ranger(
    'Soit $X$ une variable aléatoire de loi binomiale $\\mathcal{B}(n\\,;p)$. On démontre que'
    ' $V(X)=np(1-p)$.',
    ['On écrit $X=X_1+\\cdots+X_n$, où les $X_i$ sont des variables de Bernoulli de paramètre $p$,'
     ' indépendantes.',
     'Pour chaque $i$, $V(X_i)=(1-p)^2p+p^2(1-p)=p(1-p)$.',
     'Les $X_i$ étant indépendantes, $V(X)=V(X_1)+\\cdots+V(X_n)=p(1-p)+\\cdots+p(1-p)$.',
     'Donc $V(X)=np(1-p)$.'],
    ['On décompose $X$ en somme de variables de Bernoulli indépendantes.',
     'Conclusion : $' + col('V(X)=np(1-p)') + '$.'])

MODELES.append(modele(
    '05-demontrer-variance-loi-binomiale',
    'Démontrer la variance de la loi binomiale',
    'Démonstration à trous : V(Xᵢ), facteur 1 − p (case), indépendance (choix), exemple (case, n et'
    ' p tirés) ; étapes à ranger',
    4,
    [V623_BERNOULLI, V623_INDEPENDANCE, V623_EXEMPLE, V623_RANGER],
    [spec('1 − p', 0, '1-p', 'correct'),
     spec('Erreur : p', 0, 'p', 'incorrect'),
     spec('Erreur : 1', 0, '1', 'incorrect'),
     spec('Erreur : p − 1', 0, 'p-1', 'incorrect')]
    + specs_choix(1, 'indépendance', ['linéarité', 'König-Huygens', 'X = nX₁'])
    + [spec('n = 10, p = 0,3 → 2,1', 2, '2,1', 'correct', NT),
       spec('Erreur : espérance 3', 2, '3', 'incorrect', NT),
       spec('Erreur : V(Xᵢ) = 0,21', 2, '0,21', 'incorrect', NT),
       spec('Erreur : np² = 0,9', 2, '0,9', 'incorrect', NT)]
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
