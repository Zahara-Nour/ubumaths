"""Écrit les 5 modèles du lot 2 « démonstrations : suites et limites » de la terminale spécialité
dans scripts/questions/tspe-demonstrations-2/.

Phase 0 validée par David le 2026-11-11 (« je suis tes recos », D1 du journal
« docs/wip/questions-tspe-demonstrations-progress.md », § 2), un point par modèle :

| # | Point     | Titre                                                              | Sous-notion du point (prod), niveau         |
| 1 | TSPE-388  | Démontrer qu'une suite croissante non majorée tend vers +∞         | Limites de suites › convergence monotone, 3 |
| 2 | TSPE-389  | Démontrer la limite de qⁿ pour q > 1 avec l'inégalité de Bernoulli | Limites de suites › suites géométriques, 3  |
| 3 | TSPE-390  | Démontrer qu'une suite minorée par une suite qui tend vers +∞ …    | Limites de suites › comparaison…, 3         |
| 4 | TSPE-391  | Démontrer les limites de l'exponentielle en +∞ et en −∞            | Limites de fonctions › croissances comp., 5 |
| 5 | TSPE-405  | Démontrer la croissance comparée de xⁿ et de l'exponentielle en +∞ | Limites de fonctions › croissances comp., 6 |

Forme (D1, Q2) : 3 variations à trous (case, ou case choix à 4 propositions) + une variation
« étapes à ranger » (` ```ranger `, `signe: aucun`). Valeurs tirées (Q3) : q pour 389 ; lettres
ailleurs.

Niveaux : après ceux déjà présents sur la sous-notion (relevé prod du 2026-11-11 : convergence
monotone 1-2, suites géométriques 1-2, comparaison et encadrement 1-2, croissances comparées 3-4 ;
405 après 391 sur la même sous-notion).

    python3 docs/wip/questions/lot-tspe-demonstrations-2.py scripts/questions/tspe-demonstrations-2
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

A_REEL = 'Soit $A$ un nombre réel.'
DEF_INFINI = ('tout intervalle $]A\\,;\\,+\\infty[$ contient tous les termes de la suite à partir d\'un'
              ' certain rang')

# --- 1. TSPE-388 : suite croissante non majorée → +∞ ----------------------------------------------

INTRO_388 = ('Soit $(u_n)$ une suite croissante et non majorée. On démontre que'
             ' $\\displaystyle\\lim_{n\\to+\\infty}u_n=+\\infty$, c\'est-à-dire que ' + DEF_INFINI
             + '.\n\n' + A_REEL + '\n\n')

V388_NON_MAJOREE = justification(
    INTRO_388 + 'Que permet d\'affirmer le fait que $(u_n)$ n\'est pas majorée ?',
    [],
    'Il existe un rang $N$ tel que $u_N>A$.',
    ['Pour tout entier $n$, $u_n>A$.',
     'Il existe un rang $N$ tel que $u_N<A$.',
     '$(u_n)$ tend vers $+\\infty$.'],
    ['« $(u_n)$ est majorée par $A$ » signifie : pour tout $n$, $u_n\\leqslant A$.',
     'Sa négation : $A$ n\'est pas un majorant, donc **il existe un rang $N$ tel que $u_N>A$**.',
     '« $(u_n)$ tend vers $+\\infty$ » est ce qu\'on veut démontrer : on ne peut pas s\'en servir.'])
V388_CROISSANTE = justification(
    INTRO_388 + 'Il existe un rang $N$ tel que $u_N>A$. Pourquoi a-t-on $u_n\\geqslant u_N$ pour'
    ' tout $n\\geqslant N$ ?',
    [],
    'Car la suite $(u_n)$ est croissante.',
    ['Car la suite $(u_n)$ n\'est pas majorée.',
     'Car $u_N>A$.',
     'Car les termes de la suite sont positifs.'],
    ['Une suite croissante vérifie $u_{n+1}\\geqslant u_n$ pour tout $n$.',
     'De proche en proche, pour tout $n\\geqslant N$, $' + col('u_n\\geqslant u_N') + '$.',
     'Le fait que la suite ne soit pas majorée a servi à trouver $N$, pas à comparer $u_n$ et'
     ' $u_N$.'])
V388_CONCLURE = justification(
    INTRO_388 + 'Pour tout $n\\geqslant N$, $u_n\\geqslant u_N>A$. Pourquoi peut-on conclure ?',
    [],
    'À partir du rang $N$, tous les termes sont dans $]A\\,;\\,+\\infty[$, et $A$ était un réel'
    ' quelconque.',
    ['Un terme $u_N$ dépasse $A$, cela suffit.',
     'La suite est minorée par $A$, donc elle tend vers $+\\infty$.',
     'La suite converge vers $A$.'],
    ['On a montré que l\'intervalle $]A\\,;\\,+\\infty[$ contient tous les termes à partir du rang'
     ' $N$.',
     'Comme $A$ est un réel quelconque, c\'est la définition de $' + col('\\displaystyle\\lim_{n\\to'
                                                                       '+\\infty}u_n=+\\infty') + '$.',
     'Un seul terme au-dessus de $A$ ne suffit pas : il faut tous les termes à partir d\'un rang.'])
V388_RANGER = ranger(
    'Soit $(u_n)$ une suite croissante et non majorée. On démontre que'
    ' $\\displaystyle\\lim_{n\\to+\\infty}u_n=+\\infty$.',
    ['Soit $A$ un nombre réel.',
     '$(u_n)$ n\'est pas majorée, donc $A$ n\'en est pas un majorant : il existe un rang $N$ tel'
     ' que $u_N>A$.',
     '$(u_n)$ est croissante, donc pour tout $n\\geqslant N$, $u_n\\geqslant u_N>A$.',
     'Tout intervalle $]A\\,;\\,+\\infty[$ contient donc tous les termes à partir d\'un certain'
     ' rang.'],
    ['On revient à la définition d\'une suite qui tend vers $+\\infty$.',
     'Conclusion : $' + col('\\displaystyle\\lim_{n\\to+\\infty}u_n=+\\infty') + '$.'])

MODELES.append(modele(
    '01-demontrer-suite-croissante-non-majoree',
    'Démontrer qu\'une suite croissante non majorée tend vers +∞',
    'Démonstration à trous : non majorée (choix), croissante (choix), conclusion par la définition'
    ' (choix) ; étapes à ranger',
    3,
    [V388_NON_MAJOREE, V388_CROISSANTE, V388_CONCLURE, V388_RANGER],
    specs_choix(0, 'il existe N tel que u_N > A', ['pour tout n', 'u_N < A', 'circulaire'])
    + specs_choix(1, 'croissante', ['non majorée', 'u_N > A', 'termes positifs'])
    + specs_choix(2, 'tous les termes à partir de N', ['un seul terme', 'minorée', 'converge'])
    + ['RANGER:3']))

# --- 2. TSPE-389 : inégalité de Bernoulli, puis limite de qⁿ (q tiré) ------------------------------

BERNOULLI = '(1+a)^n\\geqslant 1+na'
INTRO_389 = ('Soit $a$ un réel strictement positif. On démontre par récurrence que, pour tout entier'
             ' naturel $n$, $' + BERNOULLI + '$ (inégalité de Bernoulli).\n\n'
             'Initialisation : $(1+a)^0=1\\geqslant 1+0\\times a$.\n\n'
             'Hérédité : on suppose $' + BERNOULLI + '$ pour un entier $n$.\n\n')
V_Q = [var('q', '2..9')]
VQ = {'q': 3}

V389_DEVELOPPER = case(
    INTRO_389 + 'On en déduit $(1+a)^{n+1}\\geqslant(1+na)(1+a)$. Complète le développement.\n\n'
    '$(1+na)(1+a)=1+(n+1)a+?$',
    [], 'na^2',
    ['$(1+na)(1+a)=1+a+na+na^2$.',
     'Or $a+na=(n+1)a$, donc $(1+na)(1+a)=1+(n+1)a+' + col('na^2') + '$.',
     'Comme $na^2\\geqslant 0$, on obtient $(1+a)^{n+1}\\geqslant 1+(n+1)a$ : la propriété est'
     ' héréditaire.'])
V389_POSITIF = justification(
    INTRO_389 + 'On multiplie les deux membres de $' + BERNOULLI + '$ par $1+a$. Pourquoi le sens de'
    ' l\'inégalité est-il conservé ?',
    [],
    'Car $1+a>0$.',
    ['Car $(1+a)^n>0$.',
     'Car $n\\geqslant 0$.',
     'Car $a^2\\geqslant 0$.'],
    ['On multiplie les deux membres d\'une inégalité par un même nombre : le sens est conservé'
     ' si ce nombre est strictement positif.',
     'Ici on multiplie par $1+a$, et $' + col('1+a>0') + '$ car $a>0$.',
     'C\'est le signe du **multiplicateur** qui compte, pas celui des membres.'])
V389_LIMITE = case(
    'On sait que, pour tout réel $a>0$ et tout entier naturel $n$, $' + BERNOULLI + '$ (inégalité'
    ' de Bernoulli). On en déduit la limite de $(' + v('q') + '^n)$.\n\n'
    'On écrit $' + v('q') + '=1+a$. Complète l\'inégalité obtenue.\n\n'
    '$' + v('q') + '^n\\geqslant 1+?\\,n$',
    V_Q, v('eval:q-1'),
    ['$' + v('q') + '=1+a$ avec $a=' + v('q') + '-1=' + col(v('eval:q-1')) + '$, et $a>0$.',
     'Par l\'inégalité de Bernoulli, $' + v('q') + '^n\\geqslant 1+' + v('eval:q-1') + 'n$.',
     'Or $\\displaystyle\\lim_{n\\to+\\infty}(1+' + v('eval:q-1') + 'n)=+\\infty$ : par'
     ' comparaison, $\\displaystyle\\lim_{n\\to+\\infty}' + v('q') + '^n=+\\infty$.'])
V389_RANGER = ranger(
    'Soit $q>1$. On démontre que $\\displaystyle\\lim_{n\\to+\\infty}q^n=+\\infty$, après avoir'
    ' démontré par récurrence l\'inégalité de Bernoulli : pour tout réel $a>0$ et tout entier'
    ' naturel $n$, $' + BERNOULLI + '$.',
    ['Initialisation : $(1+a)^0=1\\geqslant 1+0\\times a$.',
     'Hérédité : si $' + BERNOULLI + '$, alors, comme $1+a>0$,'
     ' $(1+a)^{n+1}\\geqslant(1+na)(1+a)=1+(n+1)a+na^2\\geqslant 1+(n+1)a$.',
     'On pose $a=q-1>0$ : pour tout $n$, $q^n\\geqslant 1+n(q-1)$.',
     'Comme $q-1>0$, $\\displaystyle\\lim_{n\\to+\\infty}\\big(1+n(q-1)\\big)=+\\infty$ ; par'
     ' comparaison, $\\displaystyle\\lim_{n\\to+\\infty}q^n=+\\infty$.'],
    ['On démontre d\'abord l\'inégalité de Bernoulli, puis on l\'applique avec $a=q-1$.',
     'Conclusion : pour $q>1$, $' + col('\\displaystyle\\lim_{n\\to+\\infty}q^n=+\\infty') + '$.'])

MODELES.append(modele(
    '02-demontrer-limite-q-puissance-n',
    'Démontrer la limite de qⁿ pour q > 1 avec l\'inégalité de Bernoulli',
    'Démonstration à trous : développement de l\'hérédité, na² (case), 1 + a > 0 (choix), q = 1 + a'
    ' (case, q tiré) ; étapes à ranger',
    3,
    [V389_DEVELOPPER, V389_POSITIF, V389_LIMITE, V389_RANGER],
    [spec('na²', 0, 'na^2', 'correct'),
     spec('Écriture a²n', 0, 'a^2n', 'correct'),
     spec('Erreur : a²', 0, 'a^2', 'incorrect'),
     spec('Erreur : n²a²', 0, 'n^2a^2', 'incorrect'),
     spec('Erreur : 0', 0, '0', 'incorrect')]
    + specs_choix(1, '1 + a > 0', ['(1 + a)ⁿ > 0', 'n ⩾ 0', 'a² ⩾ 0'])
    + [spec('a = q − 1 = 2', 2, '2', 'correct', VQ),
       spec('Erreur : q, 3', 2, '3', 'incorrect', VQ),
       spec('Erreur : 1', 2, '1', 'incorrect', VQ),
       spec('Erreur : q + 1, 4', 2, '4', 'incorrect', VQ)]
    + ['RANGER:3']))

# --- 3. TSPE-390 : minorée par une suite qui tend vers +∞ --------------------------------------------

INTRO_390 = ('Soient $(u_n)$ et $(v_n)$ deux suites telles que $u_n\\geqslant v_n$ pour tout'
             ' $n\\geqslant n_0$, et $\\displaystyle\\lim_{n\\to+\\infty}v_n=+\\infty$. On démontre'
             ' que $\\displaystyle\\lim_{n\\to+\\infty}u_n=+\\infty$.\n\n' + A_REEL + '\n\n')

V390_TRADUIRE = justification(
    INTRO_390 + 'Que donne $\\displaystyle\\lim_{n\\to+\\infty}v_n=+\\infty$ ?',
    [],
    'Il existe un rang $N_1$ tel que, pour tout $n\\geqslant N_1$, $v_n>A$.',
    ['Il existe un rang $N_1$ tel que $v_{N_1}>A$.',
     'Pour tout entier $n$, $v_n>A$.',
     'La suite $(v_n)$ est croissante.'],
    ['Par définition, l\'intervalle $]A\\,;\\,+\\infty[$ contient tous les termes de $(v_n)$ à'
     ' partir d\'un certain rang.',
     'Donc **il existe $N_1$ tel que, pour tout $n\\geqslant N_1$, $v_n>A$**.',
     'Un seul terme au-dessus de $A$ ne suffit pas ; et une suite qui tend vers $+\\infty$ n\'est'
     ' pas forcément croissante.'])
V390_RANG = justification(
    INTRO_390 + 'Pour tout $n\\geqslant N_1$, $v_n>A$. À partir de quel rang $N$ a-t-on à la fois'
    ' $u_n\\geqslant v_n$ et $v_n>A$ ?',
    [],
    '$N$ est le plus grand des deux entiers $n_0$ et $N_1$.',
    ['$N$ est le plus petit des deux entiers $n_0$ et $N_1$.',
     '$N=n_0$.',
     '$N=N_1$.'],
    ['$u_n\\geqslant v_n$ vaut pour $n\\geqslant n_0$ ; $v_n>A$ vaut pour $n\\geqslant N_1$.',
     'Les deux valent dès que $n$ dépasse les deux rangs : $N=' + col('\\max(n_0\\,;\\,N_1)') + '$.',
     'Avec le plus petit des deux, l\'une des deux inégalités peut être fausse.'])
V390_CONCLURE = justification(
    INTRO_390 + 'Pour tout $n\\geqslant N$, $u_n\\geqslant v_n>A$. Pourquoi peut-on conclure ?',
    [],
    'L\'intervalle $]A\\,;\\,+\\infty[$ contient tous les $u_n$ à partir du rang $N$, et $A$ était'
    ' un réel quelconque.',
    ['La suite $(u_n)$ est minorée par $A$, donc elle tend vers $+\\infty$.',
     'La suite $(u_n)$ est croissante.',
     'Par le théorème des gendarmes.'],
    ['À partir du rang $N$, tous les termes de $(u_n)$ sont dans $]A\\,;\\,+\\infty[$.',
     'Comme $A$ est quelconque, c\'est la définition de $' + col('\\displaystyle\\lim_{n\\to'
                                                                 '+\\infty}u_n=+\\infty') + '$.',
     'Le théorème des gendarmes demande un encadrement par deux suites de même limite finie.'])
V390_RANGER = ranger(
    'Soient $(u_n)$ et $(v_n)$ deux suites telles que $u_n\\geqslant v_n$ pour tout'
    ' $n\\geqslant n_0$, et $\\displaystyle\\lim_{n\\to+\\infty}v_n=+\\infty$. On démontre que'
    ' $\\displaystyle\\lim_{n\\to+\\infty}u_n=+\\infty$.',
    ['Soit $A$ un nombre réel.',
     'Comme $(v_n)$ tend vers $+\\infty$, il existe $N_1$ tel que, pour tout $n\\geqslant N_1$,'
     ' $v_n>A$.',
     'Pour tout $n\\geqslant\\max(n_0\\,;\\,N_1)$, $u_n\\geqslant v_n>A$.',
     'Tout intervalle $]A\\,;\\,+\\infty[$ contient donc tous les $u_n$ à partir d\'un certain'
     ' rang.'],
    ['On revient à la définition d\'une suite qui tend vers $+\\infty$.',
     'Conclusion : $' + col('\\displaystyle\\lim_{n\\to+\\infty}u_n=+\\infty') + '$.'])

MODELES.append(modele(
    '03-demontrer-minoration-limite-infinie',
    'Démontrer qu\'une suite minorée par une suite qui tend vers +∞ tend vers +∞',
    'Démonstration à trous : définition de la limite de (vₙ) (choix), rang max(n₀ ; N₁) (choix),'
    ' conclusion (choix) ; étapes à ranger',
    3,
    [V390_TRADUIRE, V390_RANG, V390_CONCLURE, V390_RANGER],
    specs_choix(0, 'à partir d\'un rang', ['un seul terme', 'pour tout n', 'croissante'])
    + specs_choix(1, 'max', ['min', 'n₀', 'N₁'])
    + specs_choix(2, 'définition', ['minorée', 'croissante', 'gendarmes'])
    + ['RANGER:3']))

# --- 4. TSPE-391 : limites de exp en +∞ et en −∞ ---------------------------------------------------

INTRO_391 = ('On démontre que $\\displaystyle\\lim_{x\\to+\\infty}e^x=+\\infty$ et'
             ' $\\displaystyle\\lim_{x\\to-\\infty}e^x=0$.\n\n'
             'Pour la limite en $+\\infty$, on étudie la fonction $f$ définie sur $\\mathbb{R}$ par'
             ' $f(x)=e^x-x$.\n\n')

V391_DERIVEE = case(
    INTRO_391 + 'Complète.\n\n$f\'(x)=?$',
    [], 'e^{x}-1',
    ['La dérivée de $x\\mapsto e^x$ est $x\\mapsto e^x$, celle de $x\\mapsto x$ est $x\\mapsto 1$.',
     'Donc $f\'(x)=' + col('e^x-1') + '$, qui est négatif sur $]-\\infty\\,;\\,0]$ et positif sur'
     ' $[0\\,;\\,+\\infty[$.'])
V391_MINIMUM = justification(
    INTRO_391 + '$f\'(x)=e^x-1$ est négatif sur $]-\\infty\\,;\\,0]$ et positif sur'
    ' $[0\\,;\\,+\\infty[$. Pourquoi a-t-on $e^x>x$ pour tout réel $x$ ?',
    [],
    '$f$ a pour minimum $f(0)=1$, qui est strictement positif : $f(x)>0$ pour tout $x$.',
    ['$f$ est croissante sur $\\mathbb{R}$, donc $f(x)>f(0)$.',
     '$e^x>0$ pour tout réel $x$.',
     '$f(0)=1>0$ suffit, sans étudier les variations.'],
    ['D\'après le signe de $f\'$, $f$ est décroissante puis croissante : elle a un minimum en $0$.',
     'Ce minimum vaut $f(0)=e^0-0=1>0$, donc $f(x)>0$, c\'est-à-dire $' + col('e^x>x') + '$.',
     'Par comparaison, comme $\\displaystyle\\lim_{x\\to+\\infty}x=+\\infty$,'
     ' $\\displaystyle\\lim_{x\\to+\\infty}e^x=+\\infty$.'])
V391_MOINS_INFINI = justification(
    INTRO_391 + 'On a démontré que $\\displaystyle\\lim_{x\\to+\\infty}e^x=+\\infty$. Comment en'
    ' déduire la limite de $e^x$ en $-\\infty$ ?',
    [],
    '$e^x=\\dfrac{1}{e^{-x}}$ ; quand $x\\to-\\infty$, $-x\\to+\\infty$, donc $e^{-x}\\to+\\infty$'
    ' et $e^x\\to 0$.',
    ['$e^x>x$ et $\\displaystyle\\lim_{x\\to-\\infty}x=-\\infty$, donc par comparaison'
     ' $\\displaystyle\\lim_{x\\to-\\infty}e^x=-\\infty$.',
     '$e^x=-e^{-x}$, donc $\\displaystyle\\lim_{x\\to-\\infty}e^x=-\\infty$.',
     '$\\exp$ est croissante, donc $\\displaystyle\\lim_{x\\to-\\infty}e^x=-\\infty$.'],
    ['Pour tout réel $x$, $e^x\\times e^{-x}=e^0=1$, donc $e^x=\\dfrac{1}{e^{-x}}$.',
     'On pose $X=-x$ : quand $x\\to-\\infty$, $X\\to+\\infty$ et $e^X\\to+\\infty$, donc'
     ' $\\displaystyle\\lim_{x\\to-\\infty}e^x=' + col('0') + '$.',
     'La comparaison $e^x>x$ ne dit rien en $-\\infty$ : minorer par une fonction qui tend vers'
     ' $-\\infty$ ne donne aucune limite.'])
V391_RANGER = ranger(
    'On démontre que $\\displaystyle\\lim_{x\\to+\\infty}e^x=+\\infty$ et'
    ' $\\displaystyle\\lim_{x\\to-\\infty}e^x=0$.',
    ['On pose $f(x)=e^x-x$ sur $\\mathbb{R}$ ; $f\'(x)=e^x-1$.',
     '$f\'$ est négative sur $]-\\infty\\,;\\,0]$ et positive sur $[0\\,;\\,+\\infty[$ : $f$ a pour'
     ' minimum $f(0)=1>0$.',
     'Donc $e^x>x$ pour tout réel $x$ et, par comparaison,'
     ' $\\displaystyle\\lim_{x\\to+\\infty}e^x=+\\infty$.',
     'Enfin $e^x=\\dfrac{1}{e^{-x}}$ et $-x\\to+\\infty$ quand $x\\to-\\infty$, donc'
     ' $\\displaystyle\\lim_{x\\to-\\infty}e^x=0$.'],
    ['On compare $e^x$ à $x$ pour la limite en $+\\infty$, puis on passe à l\'inverse pour la'
     ' limite en $-\\infty$.',
     'Conclusion : $' + col('\\displaystyle\\lim_{x\\to+\\infty}e^x=+\\infty') + '$ et $'
     + col('\\displaystyle\\lim_{x\\to-\\infty}e^x=0', 1) + '$.'])

MODELES.append(modele(
    '04-demontrer-limites-exponentielle',
    'Démontrer les limites de la fonction exponentielle en +∞ et en −∞',
    'Démonstration à trous : dérivée de eˣ − x (case), minimum f(0) = 1 (choix), passage à'
    ' l\'inverse en −∞ (choix) ; étapes à ranger',
    5,
    [V391_DERIVEE, V391_MINIMUM, V391_MOINS_INFINI, V391_RANGER],
    [spec('eˣ − 1', 0, 'e^{x}-1', 'correct'),
     spec('Écriture −1 + eˣ', 0, '-1+e^{x}', 'correct'),
     spec('Erreur : eˣ', 0, 'e^{x}', 'incorrect'),
     spec('Erreur : eˣ − x', 0, 'e^{x}-x', 'incorrect'),
     spec('Erreur : xeˣ⁻¹ − 1', 0, 'xe^{x-1}-1', 'incorrect')]
    + specs_choix(1, 'minimum f(0) = 1', ['croissante', 'eˣ > 0', 'f(0) seul'])
    + specs_choix(2, 'inverse', ['comparaison en −∞', 'eˣ = −e⁻ˣ', 'croissante'])
    + ['RANGER:3']))

# --- 5. TSPE-405 : croissance comparée de xⁿ et exp en +∞ --------------------------------------------

INTRO_405 = ('Soit $n$ un entier naturel non nul. On démontre que'
             ' $\\displaystyle\\lim_{x\\to+\\infty}\\dfrac{e^x}{x^n}=+\\infty$.\n\n'
             'On admet que, pour tout réel $x\\geqslant 0$, $e^x\\geqslant\\dfrac{x^2}{2}$ (étude de'
             ' $x\\mapsto e^x-\\dfrac{x^2}{2}$).\n\n')
ECRITURE_405 = ('\\dfrac{e^x}{x^n}=\\dfrac{1}{n^n}\\left(\\dfrac{e^{X}}{X}\\right)^n')

V405_CAS_UN = justification(
    INTRO_405 + 'On commence par $n=1$. Pourquoi'
    ' $\\displaystyle\\lim_{x\\to+\\infty}\\dfrac{e^x}{x}=+\\infty$ ?',
    [],
    'Pour $x>0$, $\\dfrac{e^x}{x}\\geqslant\\dfrac{x}{2}$, et $\\dfrac{x}{2}$ tend vers $+\\infty$ :'
    ' on conclut par comparaison.',
    ['$e^x$ et $x$ tendent vers $+\\infty$, donc leur quotient aussi.',
     '$e^x>x$, donc $\\dfrac{e^x}{x}>1$, d\'où la limite $+\\infty$.',
     '$\\dfrac{e^x}{x}\\geqslant\\dfrac{x^2}{2}$, et $\\dfrac{x^2}{2}$ tend vers $+\\infty$.'],
    ['Pour $x>0$, on divise $e^x\\geqslant\\dfrac{x^2}{2}$ par $x>0$ :'
     ' $\\dfrac{e^x}{x}\\geqslant\\dfrac{x}{2}$.',
     'Comme $\\displaystyle\\lim_{x\\to+\\infty}\\dfrac{x}{2}=+\\infty$, par comparaison $'
     + col('\\displaystyle\\lim_{x\\to+\\infty}\\dfrac{e^x}{x}=+\\infty') + '$.',
     '« $\\dfrac{+\\infty}{+\\infty}$ » est une forme indéterminée ; et $\\dfrac{e^x}{x}>1$ ne'
     ' donne aucune limite.'])
V405_CHANGEMENT = case(
    INTRO_405 + 'On a démontré que $\\displaystyle\\lim_{x\\to+\\infty}\\dfrac{e^x}{x}=+\\infty$.'
    ' Pour $x>0$, on écrit $' + ECRITURE_405 + '$.\n\nComplète.\n\n$X=?$',
    [], '\\dfrac{x}{n}',
    ['$e^x=\\left(e^{x/n}\\right)^n$ et $x^n=n^n\\left(\\dfrac{x}{n}\\right)^n$.',
     'Donc $\\dfrac{e^x}{x^n}=\\dfrac{1}{n^n}\\left(\\dfrac{e^{x/n}}{x/n}\\right)^n$ :'
     ' $X=' + col('\\dfrac{x}{n}') + '$.'])
V405_CONCLURE = justification(
    INTRO_405 + 'Pour $x>0$, $' + ECRITURE_405 + '$ avec $X=\\dfrac{x}{n}$. Pourquoi'
    ' $\\displaystyle\\lim_{x\\to+\\infty}\\dfrac{e^x}{x^n}=+\\infty$ ?',
    [],
    '$X\\to+\\infty$, donc $\\dfrac{e^X}{X}\\to+\\infty$, sa puissance $n$-ième aussi, et'
    ' $\\dfrac{1}{n^n}$ est une constante strictement positive.',
    ['$\\dfrac{1}{n^n}$ tend vers $0$, donc la limite est $0$.',
     'C\'est une forme indéterminée « $0\\times\\infty$ » : on ne peut pas conclure.',
     '$\\dfrac{e^X}{X}$ tend vers $1$, donc la limite est $\\dfrac{1}{n^n}$.'],
    ['Quand $x\\to+\\infty$, $X=\\dfrac{x}{n}\\to+\\infty$ ($n$ est fixé), donc'
     ' $\\dfrac{e^X}{X}\\to+\\infty$ et $\\left(\\dfrac{e^X}{X}\\right)^n\\to+\\infty$.',
     '$n$ ne dépend pas de $x$ : $\\dfrac{1}{n^n}$ est une constante strictement positive, donc $'
     + col('\\displaystyle\\lim_{x\\to+\\infty}\\dfrac{e^x}{x^n}=+\\infty') + '$.',
     'Seul $x$ tend vers $+\\infty$ : $\\dfrac{1}{n^n}$ ne tend vers rien, il n\'y a pas de forme'
     ' indéterminée.'])
V405_RANGER = ranger(
    'Soit $n$ un entier naturel non nul. On démontre que'
    ' $\\displaystyle\\lim_{x\\to+\\infty}\\dfrac{e^x}{x^n}=+\\infty$, en admettant que'
    ' $e^x\\geqslant\\dfrac{x^2}{2}$ pour tout $x\\geqslant 0$.',
    ['Pour $x>0$, $\\dfrac{e^x}{x}\\geqslant\\dfrac{x}{2}$, donc par comparaison'
     ' $\\displaystyle\\lim_{x\\to+\\infty}\\dfrac{e^x}{x}=+\\infty$.',
     'Pour $x>0$, on écrit $\\dfrac{e^x}{x^n}=\\dfrac{1}{n^n}\\left(\\dfrac{e^{X}}{X}\\right)^n$'
     ' avec $X=\\dfrac{x}{n}$.',
     'Quand $x\\to+\\infty$, $X\\to+\\infty$, donc $\\left(\\dfrac{e^X}{X}\\right)^n\\to+\\infty$.',
     'Comme $\\dfrac{1}{n^n}>0$ est une constante,'
     ' $\\displaystyle\\lim_{x\\to+\\infty}\\dfrac{e^x}{x^n}=+\\infty$.'],
    ['On traite d\'abord $n=1$, puis on s\'y ramène par le changement de variable'
     ' $X=\\dfrac{x}{n}$.',
     'Conclusion : $' + col('\\displaystyle\\lim_{x\\to+\\infty}\\dfrac{e^x}{x^n}=+\\infty')
     + '$.'])

MODELES.append(modele(
    '05-demontrer-croissance-comparee-exp-puissance',
    'Démontrer la croissance comparée de xⁿ et de l\'exponentielle en +∞',
    'Démonstration à trous : cas n = 1 (choix), X = x/n (case), conclusion (choix) ; étapes à'
    ' ranger',
    6,
    [V405_CAS_UN, V405_CHANGEMENT, V405_CONCLURE, V405_RANGER],
    specs_choix(0, 'eˣ/x ⩾ x/2', ['∞/∞', 'eˣ/x > 1', 'eˣ/x ⩾ x²/2'])
    + [spec('x/n', 1, '\\dfrac{x}{n}', 'correct'),
       spec('Écriture \\frac (saisie MathLive)', 1, '\\frac{x}{n}', 'correct'),
       spec('Erreur : nx', 1, 'nx', 'incorrect'),
       spec('Erreur : x', 1, 'x', 'incorrect'),
       spec('Erreur : xⁿ', 1, 'x^n', 'incorrect')]
    + specs_choix(2, 'constante positive', ['1/nⁿ → 0', '0 × ∞', 'eˣ/X → 1'])
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
