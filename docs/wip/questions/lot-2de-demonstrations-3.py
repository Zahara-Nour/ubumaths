"""Écrit les 4 modèles du lot 3 « démonstrations : fonctions » de la seconde dans
scripts/questions/2de-demonstrations-3/.

Phase 0 validée par David le 2026-11-06 (« je valide », D1 du journal
« docs/wip/questions-2de-demonstrations-progress.md », § 2), un point par modèle :

| # | Point | Titre                                                  | Sous-notion du point (prod), niveau         |
| 1 | 2-357 | Démontrer le sens de variation d'une fonction affine   | Fonctions affines › variations et signe, 5  |
| 2 | 2-358 | Démontrer la position de y = x et y = x² pour x ≥ 0    | Fonction carré › définition et courbe, 3    |
| 3 | 2-359 | Démontrer le sens de variation de la fonction carré    | Fonction carré › variations, 2              |
| 4 | 2-360 | Démontrer le sens de variation de la fonction inverse  | Fonction inverse › variations, 1            |

Forme (D1, Q2) : comme les lots 1 et 2. Valeurs tirées (Q3) : m et p pour 357 ; lettres ailleurs.

Niveaux : après ceux déjà présents sur la sous-notion, tous niveaux scolaires (relevé prod du
2026-11-08 : variations et signe 1-4, définition et courbe 1-2, carré › variations 1,
inverse › variations aucun).

    python3 docs/wip/questions/lot-2de-demonstrations-3.py scripts/questions/2de-demonstrations-3
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


def colonne(a, b):
    return '\\begin{pmatrix}' + a + '\\\\' + b + '\\end{pmatrix}'


MODELES = []

# --- 1. 2-357 : variations des fonctions affines (m et p tirés) ---------------------------------

M, P = v('m'), v('p')
V_MP = [var('m', '2..9'), var('p', '1..9')]
V_MN = [var('m', '-9..-2'), var('p', '-9..-1')]
VMP = {'m': 3, 'p': 2}
VMN = {'m': -3, 'p': -5}


def intro_357(fin):
    return ('Soit $f$ la fonction affine définie sur $\\mathbb{R}$ par $f(x)=' + M + 'x' + v('p;+')
            + '$. On démontre ' + fin + '.\n\nSoient $a$ et $b$ deux réels tels que $a<b$.\n\n')


V357_FACTORISER = case(
    intro_357('le sens de variation de $f$') + 'Complète.\n\n'
    '$f(b)-f(a)=(' + M + 'b' + v('p;+') + ')-(' + M + 'a' + v('p;+') + ')=' + M + '(?)$',
    V_MP, 'b-a',
    ['Le terme constant $' + P + '$ s\'élimine : $f(b)-f(a)=' + M + 'b-' + M + 'a$.',
     'On factorise par $' + M + '$ : $f(b)-f(a)=' + M + '(' + col('b-a') + ')$.'])
V357_SIGNE = justification(
    intro_357('que $f$ est croissante sur $\\mathbb{R}$') + 'On a $f(b)-f(a)=' + M + '(b-a)$.'
    ' Pourquoi $f(b)-f(a)>0$ ?',
    V_MP,
    'Car $' + M + '>0$ et $b-a>0$ : le produit de deux nombres positifs est positif.',
    ['Car $a<b$, donc $f(a)<f(b)$ pour toute fonction.',
     'Car $b-a<0$ et $' + M + '>0$.',
     'Car $f(b)$ et $f(a)$ sont positifs.'],
    ['$a<b$, donc $b-a>0$ ; et le coefficient directeur $' + M + '$ est positif.',
     'Donc $f(b)-f(a)=' + M + '(b-a)>0$, soit $' + col('f(a)<f(b)') + '$ :'
     ' $f$ est **croissante** sur $\\mathbb{R}$.',
     '« $a<b$ donc $f(a)<f(b)$ » n\'est vrai que pour une fonction croissante : c\'est ce qu\'on'
     ' démontre.'])
V357_CONCLURE = justification(
    intro_357('le sens de variation de $f$') + 'On a $f(b)-f(a)=' + v('m') + '(b-a)$, avec'
    ' $b-a>0$. Que peut-on conclure ?',
    V_MN,
    '$f(b)-f(a)<0$, donc $f(a)>f(b)$ : $f$ est décroissante sur $\\mathbb{R}$.',
    ['$f(b)-f(a)<0$, donc $f(a)>f(b)$ : $f$ est croissante sur $\\mathbb{R}$.',
     '$f(b)-f(a)>0$, donc $f(a)<f(b)$ : $f$ est croissante sur $\\mathbb{R}$.',
     'On ne peut pas conclure : le signe dépend aussi de l\'ordonnée à l\'origine $' + P + '$.'],
    ['$' + M + '<0$ et $b-a>0$ : le produit $' + M + '(b-a)$ est négatif.',
     'Donc $f(b)<f(a)$ : de $a<b$ on tire $' + col('f(a)>f(b)') + '$, $f$ est **décroissante**'
     ' sur $\\mathbb{R}$.',
     'L\'ordonnée à l\'origine $' + P + '$ s\'élimine : elle ne joue aucun rôle dans les'
     ' variations.'])
V357_RANGER = ranger(
    'Soit $f$ la fonction affine définie sur $\\mathbb{R}$ par $f(x)=mx+p$. On démontre que $f$'
    ' est croissante si $m>0$ et décroissante si $m<0$.',
    ['Soient $a$ et $b$ deux réels tels que $a<b$.',
     '$f(b)-f(a)=(mb+p)-(ma+p)=m(b-a)$.',
     'Comme $a<b$, on a $b-a>0$ : $f(b)-f(a)$ a le signe de $m$.',
     'Si $m>0$, alors $f(b)-f(a)>0$, soit $f(a)<f(b)$ : $f$ est croissante sur $\\mathbb{R}$.',
     'Si $m<0$, alors $f(b)-f(a)<0$, soit $f(a)>f(b)$ : $f$ est décroissante sur $\\mathbb{R}$.'],
    ['On compare $f(a)$ et $f(b)$ par le signe de leur différence.',
     'Conclusion : le sens de variation de $f$ est donné par le signe de $' + col('m') + '$.'])

MODELES.append(modele(
    '01-demontrer-variations-fonction-affine',
    'Démontrer le sens de variation d\'une fonction affine',
    'Démonstration à trous (m et p tirés) : f(b) − f(a) = m(b − a) (case), signe si m > 0'
    ' (choix), conclusion si m < 0 (choix) ; étapes à ranger',
    5,
    [V357_FACTORISER, V357_SIGNE, V357_CONCLURE, V357_RANGER],
    [spec('b − a', 0, 'b-a', 'correct', VMP),
     spec('Écriture −a + b', 0, '-a+b', 'correct', VMP),
     spec('Erreur : a − b', 0, 'a-b', 'incorrect', VMP),
     spec('Erreur : b + a', 0, 'b+a', 'incorrect', VMP),
     spec('Erreur : b', 0, 'b', 'incorrect', VMP)]
    + specs_choix(1, 'produit de deux positifs', ['a < b suffit', 'b − a < 0', 'f(a), f(b) > 0'],
                  VMP)
    + specs_choix(2, 'décroissante', ['croissante (mauvais sens)', 'signe positif', 'dépend de p'],
                  VMN)
    + ['RANGER:3']))

# --- 2. 2-358 : position relative de y = x et y = x² pour x ≥ 0 ---------------------------------

INTRO_358 = ('On démontre la position relative de la droite $\\mathcal{D}$ d\'équation $y=x$ et de'
             ' la courbe $\\mathcal{C}$ d\'équation $y=x^2$, pour $x\\geqslant 0$. Pour cela, on'
             ' étudie le signe de la différence $x^2-x$.\n\n')
FACTO_358 = 'On a factorisé : $x^2-x=x(x-1)$.\n\n'

V358_FACTORISER = case(
    INTRO_358 + 'Complète la factorisation.\n\n$x^2-x=x(?)$',
    [], 'x-1',
    ['$x$ est un facteur commun : $x^2-x=x\\times x-x\\times 1$.',
     'Donc $x^2-x=x(' + col('x-1') + ')$.'])
V358_ENTRE_0_ET_1 = justification(
    INTRO_358 + FACTO_358 + 'Pour $0\\leqslant x\\leqslant 1$, quelle est la position de'
    ' $\\mathcal{C}$ par rapport à $\\mathcal{D}$ ?',
    [],
    '$x\\geqslant 0$ et $x-1\\leqslant 0$, donc $x^2-x\\leqslant 0$ : $\\mathcal{C}$ est en'
    ' dessous de $\\mathcal{D}$.',
    ['$x\\geqslant 0$ et $x-1\\leqslant 0$, donc $x^2-x\\leqslant 0$ : $\\mathcal{C}$ est'
     ' au-dessus de $\\mathcal{D}$.',
     'Un carré est toujours positif, donc $x^2-x\\geqslant 0$ : $\\mathcal{C}$ est au-dessus de'
     ' $\\mathcal{D}$.',
     '$x\\geqslant 0$, donc $x^2-x\\geqslant 0$ : $\\mathcal{C}$ est au-dessus de'
     ' $\\mathcal{D}$.'],
    ['Pour $0\\leqslant x\\leqslant 1$ : $x\\geqslant 0$ et $x-1\\leqslant 0$, donc le produit'
     ' $x(x-1)$ est négatif ou nul.',
     'Donc $x^2\\leqslant x$ : $' + col('\\mathcal{C}') + '$ est **en dessous** de'
     ' $\\mathcal{D}$ sur $[0\\,;\\,1]$.',
     '$x^2$ est positif, mais c\'est le signe de la **différence** $x^2-x$ qui compte.'])
V358_APRES_1 = justification(
    INTRO_358 + FACTO_358 + 'Pour $x\\geqslant 1$, quelle est la position de $\\mathcal{C}$ par'
    ' rapport à $\\mathcal{D}$ ?',
    [],
    '$x\\geqslant 0$ et $x-1\\geqslant 0$, donc $x^2-x\\geqslant 0$ : $\\mathcal{C}$ est'
    ' au-dessus de $\\mathcal{D}$.',
    ['$x\\geqslant 0$ et $x-1\\geqslant 0$, donc $x^2-x\\geqslant 0$ : $\\mathcal{C}$ est en'
     ' dessous de $\\mathcal{D}$.',
     '$x\\geqslant 1$ et $x-1\\leqslant 0$, donc $x^2-x\\leqslant 0$ : $\\mathcal{C}$ est en'
     ' dessous de $\\mathcal{D}$.',
     '$\\mathcal{C}$ et $\\mathcal{D}$ sont confondues, car elles passent toutes deux par le'
     ' point de coordonnées $(1\\,;\\,1)$.'],
    ['Pour $x\\geqslant 1$ : $x\\geqslant 0$ et $x-1\\geqslant 0$, donc le produit $x(x-1)$ est'
     ' positif ou nul.',
     'Donc $x^2\\geqslant x$ : $' + col('\\mathcal{C}') + '$ est **au-dessus** de $\\mathcal{D}$'
     ' sur $[1\\,;\\,+\\infty[$.',
     '$\\mathcal{C}$ et $\\mathcal{D}$ se coupent en $(0\\,;\\,0)$ et $(1\\,;\\,1)$ : un point'
     ' commun ne les rend pas confondues.'])
V358_RANGER = ranger(
    'On démontre la position relative de la droite $\\mathcal{D}$ d\'équation $y=x$ et de la'
    ' courbe $\\mathcal{C}$ d\'équation $y=x^2$, pour $x\\geqslant 0$.',
    ['On étudie le signe de la différence $x^2-x$.',
     'On factorise : $x^2-x=x(x-1)$.',
     'Pour $0\\leqslant x\\leqslant 1$ : $x\\geqslant 0$ et $x-1\\leqslant 0$, donc'
     ' $x^2-x\\leqslant 0$.',
     'Pour $x\\geqslant 1$ : $x\\geqslant 0$ et $x-1\\geqslant 0$, donc $x^2-x\\geqslant 0$.',
     'Donc $\\mathcal{C}$ est en dessous de $\\mathcal{D}$ sur $[0\\,;\\,1]$ et au-dessus sur'
     ' $[1\\,;\\,+\\infty[$.'],
    ['Comparer deux courbes, c\'est étudier le signe de la différence de leurs équations.',
     'Conclusion : $x^2\\leqslant x$ sur $[0\\,;\\,1]$ et $' + col('x^2\\geqslant x') + '$ sur'
     ' $[1\\,;\\,+\\infty[$ ; les courbes se coupent en $x=0$ et $x=1$.'])

MODELES.append(modele(
    '02-demontrer-position-droite-et-parabole',
    'Démontrer la position relative des courbes d\'équation y = x et y = x² pour x ≥ 0',
    'Démonstration à trous : factorisation x² − x = x(x − 1) (case), position sur [0 ; 1]'
    ' (choix), position pour x ≥ 1 (choix) ; étapes à ranger',
    3,
    [V358_FACTORISER, V358_ENTRE_0_ET_1, V358_APRES_1, V358_RANGER],
    [spec('x − 1', 0, 'x-1', 'correct'),
     spec('Écriture −1 + x', 0, '-1+x', 'correct'),
     spec('Erreur : 1 − x', 0, '1-x', 'incorrect'),
     spec('Erreur : x', 0, 'x', 'incorrect'),
     spec('Erreur : x + 1', 0, 'x+1', 'incorrect')]
    + specs_choix(1, 'en dessous', ['au-dessus (mauvaise lecture)', 'carré positif',
                                    'x ≥ 0 suffit'])
    + specs_choix(2, 'au-dessus', ['en dessous (mauvaise lecture)', 'x − 1 ≤ 0', 'confondues'])
    + ['RANGER:3']))

# --- 3. 2-359 : variations de la fonction carré -------------------------------------------------

INTRO_359 = ('Soit $f$ la fonction carré, définie sur $\\mathbb{R}$ par $f(x)=x^2$. On démontre'
             ' son sens de variation.\n\n')
DIFF_359 = 'On a $f(b)-f(a)=b^2-a^2=(b-a)(b+a)$.\n\n'

V359_FACTORISER = case(
    INTRO_359 + 'Soient $a$ et $b$ deux réels tels que $0\\leqslant a<b$. Complète.\n\n'
    '$f(b)-f(a)=b^2-a^2=(b-a)(?)$',
    [], 'b+a',
    ['On reconnaît l\'identité remarquable $b^2-a^2=(b-a)(b+a)$.',
     'Donc $f(b)-f(a)=(b-a)(' + col('b+a') + ')$.'])
V359_POSITIFS = justification(
    INTRO_359 + 'Soient $a$ et $b$ deux réels tels que $0\\leqslant a<b$. ' + DIFF_359
    + 'Pourquoi $f(b)-f(a)>0$ ?',
    [],
    'Car $b-a>0$ et $b+a>0$ : le produit de deux nombres positifs est positif.',
    ['Car $b-a>0$ et $b+a<0$.',
     'Car $a<b$, donc $a^2<b^2$ pour tous réels $a$ et $b$.',
     'Car $b^2-a^2=(b-a)^2$ et un carré est positif.'],
    ['$a<b$, donc $b-a>0$ ; $a\\geqslant 0$ et $b>0$, donc $b+a>0$.',
     'Donc $f(b)-f(a)>0$, soit $' + col('f(a)<f(b)') + '$ : $f$ est **croissante** sur'
     ' $[0\\,;\\,+\\infty[$.',
     '« $a<b$ donc $a^2<b^2$ » est faux pour des négatifs : $-3<-1$ mais $9>1$.'])
V359_NEGATIFS = justification(
    INTRO_359 + 'Soient $a$ et $b$ deux réels tels que $a<b\\leqslant 0$. ' + DIFF_359
    + 'Que peut-on conclure ?',
    [],
    '$b-a>0$ et $b+a<0$, donc $f(b)-f(a)<0$ : $f$ est décroissante sur $]-\\infty\\,;\\,0]$.',
    ['$b-a>0$ et $b+a<0$, donc $f(b)-f(a)<0$ : $f$ est croissante sur $]-\\infty\\,;\\,0]$.',
     '$b-a>0$ et $b+a>0$, donc $f(b)-f(a)>0$ : $f$ est croissante sur $]-\\infty\\,;\\,0]$.',
     '$b-a<0$ et $b+a<0$, donc $f(b)-f(a)>0$ : $f$ est croissante sur $]-\\infty\\,;\\,0]$.'],
    ['$a<b$, donc $b-a>0$ ; $a<0$ et $b\\leqslant 0$, donc $b+a<0$.',
     'Le produit est négatif : $f(b)<f(a)$. De $a<b$ on tire $' + col('f(a)>f(b)') + '$ : $f$'
     ' est **décroissante** sur $]-\\infty\\,;\\,0]$.',
     'Seul le facteur $b+a$ change de signe par rapport au cas $0\\leqslant a<b$.'])
V359_RANGER = ranger(
    'Soit $f$ la fonction carré, définie sur $\\mathbb{R}$ par $f(x)=x^2$. On démontre que $f$'
    ' est croissante sur $[0\\,;\\,+\\infty[$.',
    ['Soient $a$ et $b$ deux réels tels que $0\\leqslant a<b$.',
     '$f(b)-f(a)=b^2-a^2=(b-a)(b+a)$.',
     '$a<b$, donc $b-a>0$ ; $a\\geqslant 0$ et $b>0$, donc $b+a>0$.',
     'Donc $f(b)-f(a)>0$, soit $f(a)<f(b)$.',
     'Donc $f$ est croissante sur $[0\\,;\\,+\\infty[$.'],
    ['On compare $f(a)$ et $f(b)$ par le signe de leur différence, factorisée.',
     'Conclusion : $f$ est **croissante** sur $' + col('[0\\,;\\,+\\infty[') + '$ ; de même,'
     ' elle est décroissante sur $]-\\infty\\,;\\,0]$.'])

MODELES.append(modele(
    '03-demontrer-variations-fonction-carre',
    'Démontrer le sens de variation de la fonction carré',
    'Démonstration à trous : b² − a² = (b − a)(b + a) (case), signe pour 0 ≤ a < b (choix),'
    ' conclusion pour a < b ≤ 0 (choix) ; étapes à ranger',
    2,
    [V359_FACTORISER, V359_POSITIFS, V359_NEGATIFS, V359_RANGER],
    [spec('b + a', 0, 'b+a', 'correct'),
     spec('Écriture a + b', 0, 'a+b', 'correct'),
     spec('Erreur : b − a', 0, 'b-a', 'incorrect'),
     spec('Erreur : a − b', 0, 'a-b', 'incorrect'),
     spec('Erreur : ab', 0, 'ab', 'incorrect')]
    + specs_choix(1, 'produit de deux positifs', ['b + a < 0', 'a < b suffit', '(b − a)²'])
    + specs_choix(2, 'décroissante', ['croissante (mauvais sens)', 'b + a > 0', 'b − a < 0'])
    + ['RANGER:3']))

# --- 4. 2-360 : variations de la fonction inverse -----------------------------------------------

INTRO_360 = ('Soit $f$ la fonction inverse, définie sur $\\mathbb{R}^*$ par'
             ' $f(x)=\\dfrac{1}{x}$. On démontre son sens de variation.\n\n')
DIFF_360 = 'On a $f(b)-f(a)=\\dfrac{1}{b}-\\dfrac{1}{a}=\\dfrac{a-b}{ab}$.\n\n'

V360_REDUIRE = case(
    INTRO_360 + 'Soient $a$ et $b$ deux réels tels que $0<a<b$. On réduit au même dénominateur.'
    ' Complète.\n\n$f(b)-f(a)=\\dfrac{1}{b}-\\dfrac{1}{a}=\\dfrac{?}{ab}$',
    [], 'a-b',
    ['Au dénominateur commun $ab$ : $\\dfrac{1}{b}=\\dfrac{a}{ab}$ et'
     ' $\\dfrac{1}{a}=\\dfrac{b}{ab}$.',
     'Donc $f(b)-f(a)=\\dfrac{' + col('a-b') + '}{ab}$.'])
V360_POSITIFS = justification(
    INTRO_360 + 'Soient $a$ et $b$ deux réels tels que $0<a<b$. ' + DIFF_360
    + 'Pourquoi $f(b)-f(a)<0$ ?',
    [],
    'Car $a-b<0$ et $ab>0$ : le quotient d\'un négatif par un positif est négatif.',
    ['Car $a$ et $b$ sont positifs, donc $\\dfrac{1}{a}$ et $\\dfrac{1}{b}$ aussi.',
     'Car $a-b<0$ et $ab<0$.',
     'Car $a<b$, donc $f(b)<f(a)$ pour toute fonction.'],
    ['$a<b$, donc $a-b<0$ ; $a>0$ et $b>0$, donc $ab>0$.',
     'Donc $f(b)-f(a)<0$, soit $' + col('f(a)>f(b)') + '$ : $f$ est **décroissante** sur'
     ' $]0\\,;\\,+\\infty[$.',
     'Le signe de $\\dfrac{1}{a}$ et de $\\dfrac{1}{b}$ ne dit rien de leur différence.'])
V360_NEGATIFS = justification(
    INTRO_360 + 'Soient $a$ et $b$ deux réels tels que $a<b<0$. ' + DIFF_360
    + 'On a $a-b<0$. Pourquoi a-t-on encore $ab>0$ ?',
    [],
    'Car $a$ et $b$ sont tous deux négatifs : leur produit est positif.',
    ['Car $a<b$, donc $ab>0$.',
     'Car $a-b<0$, donc $ab>0$.',
     'Car un produit de deux réels non nuls est toujours positif.'],
    ['$a<0$ et $b<0$ : le produit de deux nombres négatifs est positif, donc $' + col('ab>0')
     + '$.',
     'Donc $f(b)-f(a)=\\dfrac{a-b}{ab}<0$ : $f$ est aussi **décroissante** sur'
     ' $]-\\infty\\,;\\,0[$.',
     'Attention : $f$ n\'est pas décroissante sur $\\mathbb{R}^*$ tout entier : $-1<1$ et'
     ' $f(-1)<f(1)$.'])
V360_RANGER = ranger(
    'Soit $f$ la fonction inverse, définie sur $\\mathbb{R}^*$ par $f(x)=\\dfrac{1}{x}$. On'
    ' démontre que $f$ est décroissante sur $]0\\,;\\,+\\infty[$.',
    ['Soient $a$ et $b$ deux réels tels que $0<a<b$.',
     '$f(b)-f(a)=\\dfrac{1}{b}-\\dfrac{1}{a}=\\dfrac{a-b}{ab}$.',
     '$a<b$, donc $a-b<0$ ; $a>0$ et $b>0$, donc $ab>0$.',
     'Donc $f(b)-f(a)<0$, soit $f(a)>f(b)$.',
     'Donc $f$ est décroissante sur $]0\\,;\\,+\\infty[$.'],
    ['On compare $f(a)$ et $f(b)$ par le signe de leur différence, réduite au même'
     ' dénominateur.',
     'Conclusion : $f$ est **décroissante** sur $' + col(']0\\,;\\,+\\infty[') + '$ ; de même,'
     ' elle est décroissante sur $]-\\infty\\,;\\,0[$.'])

MODELES.append(modele(
    '04-demontrer-variations-fonction-inverse',
    'Démontrer le sens de variation de la fonction inverse',
    'Démonstration à trous : 1/b − 1/a = (a − b)/(ab) (case), signe pour 0 < a < b (choix),'
    ' ab > 0 pour a < b < 0 (choix) ; étapes à ranger',
    1,
    [V360_REDUIRE, V360_POSITIFS, V360_NEGATIFS, V360_RANGER],
    [spec('a − b', 0, 'a-b', 'correct'),
     spec('Écriture −b + a', 0, '-b+a', 'correct'),
     spec('Erreur : b − a', 0, 'b-a', 'incorrect'),
     spec('Erreur : 1', 0, '1', 'incorrect'),
     spec('Erreur : a + b', 0, 'a+b', 'incorrect')]
    + specs_choix(1, 'négatif sur positif', ['1/a, 1/b positifs', 'ab < 0', 'a < b suffit'])
    + specs_choix(2, 'deux négatifs', ['a < b', 'a − b < 0', 'tout produit positif'])
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
