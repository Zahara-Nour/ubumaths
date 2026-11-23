"""Écrit les 5 modèles du lot 1 « démonstrations : suites et second degré » de la 1re spé
dans scripts/questions/1spe-demonstrations-1/.

Phase 0 validée par David le 2026-11-03 (« je te suis » sur les recos, D1 du journal
« docs/archive/wip/questions-1spe-demonstrations-progress.md », § 3), un point par modèle :

| # | Point    | Titre                                        | Catégorie, niveau                                       |
| 1 | 1SPE-232 | Démontrer le terme général (arithmétique)    | Suites › Suites arithmétiques › Démonstrations, 1       |
| 2 | 1SPE-233 | Démontrer le terme général (géométrique)     | Suites › Suites géométriques › Démonstrations, 1        |
| 3 | 1SPE-234 | Démontrer la somme 1 + 2 + ⋯ + n             | Suites › Sommes › Démonstrations, 1                     |
| 4 | 1SPE-235 | Démontrer la somme 1 + q + ⋯ + qⁿ            | Suites › Sommes › Démonstrations, 2                     |
| 5 | 1SPE-255 | Démontrer la résolution du second degré      | Fonctions › Polynôme du second degré › Démonstrations, 1 |

Forme (D1, Q2 a) : la démonstration est écrite, l'élève complète l'étape clé (case) ou choisit la
justification (case choix à 4 propositions, la première est la bonne, l'affichage les mélange).
Une variation par étape clé (Q3) ; valeurs tirées pour 232 et 233 (u₀, r, q), lettres ailleurs.

Catégories « Démonstrations » neuves (relevé prod du 2026-11-03 : aucune catégorie de ce nom, tous
niveaux scolaires confondus). Nœuds des points (relevé du 2026-11-03) : Suites › Suites
arithmétiques › terme général (232), Suites › Suites géométriques › terme général (233), Suites ›
Suites arithmétiques › somme des termes (234), Suites › Suites géométriques › somme des termes
(235), Algèbre › Équations : second degré › discriminant (255) ; aucun point jumeau (même nœud,
même libellé) dans un autre programme.

Voisins à ne pas répéter : les modèles « Terme général » (223-225, forme explicite à écrire),
« Sommes » (somme des entiers, des termes), « Discriminant » et « Racines » : ils APPLIQUENT le
résultat, ceux-ci le DÉMONTRENT.

Bornes : « lycee/1spe.json » (ce qui est démontré : uₙ = u₀ + nr ; uₙ = u₀qⁿ ;
1 + 2 + ⋯ + n = n(n + 1)/2 ; 1 + q + ⋯ + qⁿ = (1 − qⁿ⁺¹)/(1 − q) pour q ≠ 1 ; résolution de
ax² + bx + c = 0 ; pas plus).

Pas de `cleanCoefficients` (raisons tirées de 2 à 9 : aucun coefficient 1 à nettoyer).

Pièges du lot : `2^3`, `n^2+n`, `(b/(2a))^2` refusés en `bad_form` sans forme libre →
`requiredForm: {pattern: 'u'}` sur ces cases ; `n\\times3` reste `unoptimal_form` (pas de spec) ;
couleur jamais sur du texte (`\\textcolor` hors `$`) → gras.

    python3 docs/wip/questions/lot-1spe-demonstrations-1.py scripts/questions/1spe-demonstrations-1
"""
import json
import os
import subprocess
import sys

DOSSIER = sys.argv[1]


def spec(desc, vi, answer, status, variables=None):
    return {'description': desc, 'variationIndex': vi,
            'variables': {k: str(v) for k, v in (variables or {}).items()},
            'answers': [answer], 'expected': {'status': status}}


def modele(nom, title, description, domain, subdomain_level, variations, specs, theme='Suites'):
    return nom, {'title': title, 'description': description, 'grades': ['1_SPE'],
                 'theme': theme, 'domain': domain, 'subdomain': 'Démonstrations',
                 'level': subdomain_level, 'delay': 90, 'status': 'draft',
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


def specs_choix(vi, juste, erreurs, variables=None):
    out = [spec(juste, vi, '0', 'correct', variables)]
    for k, erreur in enumerate(erreurs, start=1):
        out.append(spec('Erreur : ' + erreur, vi, str(k), 'incorrect', variables))
    return out


MODELES = []

# --- 1. 1SPE-232 : uₙ = u₀ + nr ---------------------------------------------------------------

V_ARITH = [var('a', '1..9'), var('r', '2..9')]
INTRO_232 = ('Soit $(u_n)$ la suite arithmétique de premier terme $u_0=' + ev('a')
             + '$ et de raison $' + ev('r') + '$. On cherche l\'expression de $u_n$ en fonction'
             ' de $n$, pour tout entier naturel $n$ non nul.\n\n'
             'Pour tout entier naturel $k$, $u_{k+1}-u_k=' + ev('r') + '$. On écrit cette égalité'
             ' pour $k=0$, $k=1$, …, $k=n-1$, puis on additionne membre à membre :\n\n'
             '$$(u_1-u_0)+(u_2-u_1)+\\cdots+(u_n-u_{n-1})=' + ev('r') + '+' + ev('r')
             + '+\\cdots+' + ev('r') + '$$\n\n')
TELESCOPE_232 = ('Dans le membre de gauche, chacun des termes $u_1$, …, $u_{n-1}$ apparaît une'
                 ' fois avec le signe $+$ et une fois avec le signe $-$ : il ne reste que'
                 ' $u_n-u_0$.')

V232_SOMME = case(
    INTRO_232 + 'Les termes $u_1$, …, $u_{n-1}$ se simplifient. Complète.\n\n$u_n-u_0=?$',
    V_ARITH, ev('r') + 'n',
    [TELESCOPE_232,
     'Le membre de droite compte $n$ termes (un par valeur de $k$, de $0$ à $n-1$), tous égaux'
     ' à $' + ev('r') + '$.',
     'Donc $u_n-u_0=' + col(ev('r') + 'n') + '$, soit $u_n=' + ev('a') + '+' + ev('r')
     + 'n$.'])
V232_NOMBRE = case(
    INTRO_232 + 'Combien de termes la somme $' + ev('r') + '+' + ev('r') + '+\\cdots+' + ev('r')
    + '$ du membre de droite compte-t-elle ?\n\n$?$',
    V_ARITH, 'n',
    ['On a écrit une égalité pour chaque valeur de $k$ de $0$ à $n-1$ : il y en a $n$.',
     'Le membre de droite compte donc ' + '$' + col('n') + '$ termes égaux à $' + ev('r')
     + '$ : $u_n-u_0=' + ev('r') + 'n$.',
     'Attention : de $0$ à $n-1$, il y a $n$ entiers, pas $n-1$ ni $n+1$.'])
V232_TELESCOPE = justification(
    INTRO_232 + 'Le membre de gauche est égal à $u_n-u_0$. Pourquoi ?',
    V_ARITH,
    'Chacun des termes $u_1$, …, $u_{n-1}$ apparaît une fois avec le signe $+$ et une fois avec'
    ' le signe $-$.',
    ['Les termes $u_1$, …, $u_{n-1}$ sont tous égaux à $0$.',
     'Les termes $u_1$, …, $u_{n-1}$ sont tous égaux à $' + ev('r') + '$.',
     'La suite $(u_n)$ est constante.'],
    ['$' + col('u_1') + '$ apparaît dans $(u_1-u_0)$ avec le signe $+$ et dans $(u_2-u_1)$ avec'
     ' le signe $-$ ; de même pour $u_2$, …, $u_{n-1}$.',
     'Ces termes se compensent deux à deux : il ne reste que $u_n-u_0$.',
     'Les termes de la suite ne sont ni nuls ni égaux à la raison : la suite augmente de $'
     + ev('r') + '$ à chaque rang.'])

VARS_232 = {'a': 4, 'r': 3}
MODELES.append(modele(
    '01-demontrer-terme-general-arithmetique', 'Démontrer le terme général d\'une suite arithmétique',
    'Démonstration à trous de uₙ = u₀ + nr (somme télescopique des n égalités uₖ₊₁ − uₖ = r) :'
    ' uₙ − u₀ à compléter, nombre de termes de la somme, justification du télescopage',
    'Suites arithmétiques', 1,
    [V232_SOMME, V232_NOMBRE, V232_TELESCOPE],
    [spec('3n', 0, '3n', 'correct', VARS_232),
     spec('Erreur : 3(n + 1)', 0, '3(n+1)', 'incorrect', VARS_232),
     spec('Erreur : 4 + 3n (uₙ au lieu de uₙ − u₀)', 0, '4+3n', 'incorrect', VARS_232),
     spec('Erreur : 3(n − 1)', 0, '3(n-1)', 'incorrect', VARS_232),
     spec('n', 1, 'n', 'correct', VARS_232),
     spec('Erreur : n − 1', 1, 'n-1', 'incorrect', VARS_232),
     spec('Erreur : n + 1', 1, 'n+1', 'incorrect', VARS_232)]
    + specs_choix(2, 'télescopage', ['termes nuls', 'termes égaux à r', 'suite constante'],
                  VARS_232)))

# --- 2. 1SPE-233 : uₙ = u₀qⁿ -------------------------------------------------------------------

V_GEO = [var('a', '1..9'), var('q', '2..5')]
INTRO_233 = ('Soit $(u_n)$ la suite géométrique de premier terme $u_0=' + ev('a')
             + '$ et de raison $' + ev('q') + '$. On cherche l\'expression de $u_n$ en fonction'
             ' de $n$, pour tout entier naturel $n$ non nul.\n\n'
             'Pour tout entier naturel $k$, $u_{k+1}=' + ev('q') + '\\times u_k$. ')
QUOTIENTS_233 = ('Comme $u_0\\neq 0$ et $' + ev('q') + '\\neq 0$, aucun terme de la suite n\'est'
                 ' nul, et pour tout $k$, $\\dfrac{u_{k+1}}{u_k}=' + ev('q') + '$. On écrit cette'
                 ' égalité pour $k=0$, …, $k=n-1$, puis on multiplie membre à membre :\n\n'
                 '$$\\dfrac{u_1}{u_0}\\times\\dfrac{u_2}{u_1}\\times\\cdots\\times'
                 '\\dfrac{u_n}{u_{n-1}}=' + ev('q') + '\\times' + ev('q') + '\\times\\cdots\\times'
                 + ev('q') + '$$\n\n')

V233_PRODUIT = case(
    INTRO_233 + QUOTIENTS_233 + 'Les termes $u_1$, …, $u_{n-1}$ se simplifient. Complète.\n\n'
    '$\\dfrac{u_n}{u_0}=?$',
    V_GEO, ev('q') + '^n',
    ['Dans le membre de gauche, chaque terme $u_1$, …, $u_{n-1}$ est une fois au numérateur et'
     ' une fois au dénominateur : il reste $\\dfrac{u_n}{u_0}$.',
     'Le membre de droite est le produit de $n$ facteurs égaux à $' + ev('q') + '$.',
     'Donc $\\dfrac{u_n}{u_0}=' + col(ev('q') + '^n') + '$, soit $u_n=' + ev('a') + '\\times'
     + ev('q') + '^n$.'])
V233_PROCHE = case(
    INTRO_233 + 'On calcule les premiers termes de proche en proche :\n\n'
    '$$u_1=' + ev('q') + '\\times u_0,\\qquad u_2=' + ev('q') + '\\times u_1=' + ev('q')
    + '^2\\times u_0$$\n\nComplète.\n\n$u_3=' + ev('q') + '\\times u_2=?\\times u_0$',
    V_GEO, {'expectedAnswer': ev('q^3'), 'requiredForm': {'pattern': 'u'}},
    ['$u_3=' + ev('q') + '\\times u_2=' + ev('q') + '\\times' + ev('q') + '^2\\times u_0='
     + ev('q') + '^3\\times u_0$.',
     'Donc $u_3=' + col(ev('q^3')) + '\\times u_0$ : à chaque rang, on multiplie une fois de plus'
     ' par la raison.',
     'De même, $u_n=' + ev('q') + '^n\\times u_0$ : il y a $n$ multiplications par $' + ev('q')
     + '$ de $u_0$ à $u_n$.'])
V233_NON_NUL = justification(
    INTRO_233 + 'Pour démontrer l\'expression de $u_n$, on veut écrire les quotients'
    ' $\\dfrac{u_{k+1}}{u_k}$. Pourquoi ces quotients existent-ils ?',
    V_GEO,
    'Car $u_0\\neq 0$ et la raison est non nulle : aucun terme de la suite n\'est nul.',
    ['Car la suite $(u_n)$ est arithmétique.',
     'Car on peut toujours diviser par un terme d\'une suite.',
     'Car $u_{k+1}-u_k$ est constant.'],
    ['Un quotient $\\dfrac{u_{k+1}}{u_k}$ n\'existe que si $u_k\\neq 0$.',
     'Ici $u_0=' + ev('a') + '\\neq 0$ et $u_{k+1}=' + ev('q') + '\\times u_k$ avec $' + ev('q')
     + '\\neq 0$ : de proche en proche, ' + '**aucun terme n\'est nul**' + '.',
     'La suite est géométrique, pas arithmétique : c\'est le quotient de deux termes consécutifs'
     ' qui est constant, pas leur différence.'])

VARS_233 = {'a': 5, 'q': 2}
MODELES.append(modele(
    '02-demontrer-terme-general-geometrique', 'Démontrer le terme général d\'une suite géométrique',
    'Démonstration à trous de uₙ = u₀qⁿ : produit télescopique des n quotients uₖ₊₁/uₖ = q,'
    ' calcul de proche en proche jusqu\'à u₃, justification de l\'existence des quotients',
    'Suites géométriques', 1,
    [V233_PRODUIT, V233_PROCHE, V233_NON_NUL],
    [spec('2ⁿ', 0, '2^n', 'correct', VARS_233),
     spec('Erreur : 2n (raisonnement arithmétique)', 0, '2n', 'incorrect', VARS_233),
     spec('Erreur : 2ⁿ⁺¹', 0, '2^{n+1}', 'incorrect', VARS_233),
     spec('Erreur : 5 × 2ⁿ (uₙ au lieu du quotient)', 0, '5\\times2^n', 'incorrect', VARS_233),
     spec('8', 1, '8', 'correct', VARS_233),
     spec('Écriture 2³', 1, '2^3', 'correct', VARS_233),
     spec('Erreur : 6 (3 × 2)', 1, '6', 'incorrect', VARS_233),
     spec('Erreur : 4 (2²)', 1, '4', 'incorrect', VARS_233)]
    + specs_choix(2, 'aucun terme nul', ['arithmétique', 'toujours possible', 'différence'],
                  VARS_233)))

# --- 3. 1SPE-234 : 1 + 2 + ⋯ + n = n(n + 1)/2 ---------------------------------------------------

INTRO_234 = ('Soit $n$ un entier naturel non nul et $S=1+2+\\cdots+n$. On écrit $S$ deux fois, la'
             ' seconde dans l\'ordre inverse :\n\n'
             '$$S=1+2+\\cdots+(n-1)+n$$\n\n$$S=n+(n-1)+\\cdots+2+1$$\n\n'
             'puis on additionne ces deux égalités terme à terme (le premier terme avec le premier,'
             ' le deuxième avec le deuxième, etc.).\n\n')

V234_COLONNE = case(
    INTRO_234 + 'Les sommes $1+n$, $2+(n-1)$, …, $n+1$ sont toutes égales. Complète.\n\n'
    'Chacune vaut $?$',
    [], 'n+1',
    ['$1+n=n+1$, $2+(n-1)=n+1$, … : quand on avance d\'un rang, le terme du haut augmente de $1$'
     ' et celui du bas diminue de $1$.',
     'Chaque somme vaut donc $' + col('n+1') + '$.'])
V234_DOUBLE = case(
    INTRO_234 + 'Chacune des sommes $1+n$, $2+(n-1)$, …, $n+1$ vaut $n+1$. Complète.\n\n$2S=?$',
    [], {'expectedAnswer': 'n(n+1)', 'requiredForm': {'pattern': 'u'}},
    ['Il y a $n$ sommes (une par terme de $S$), chacune égale à $n+1$.',
     'Donc $2S=' + col('n(n+1)') + '$, et $S=\\dfrac{n(n+1)}{2}$.'])
V234_POURQUOI = justification(
    INTRO_234 + 'On obtient $2S=n(n+1)$. Pourquoi ?',
    [],
    'Il y a $n$ sommes de deux termes, et chacune vaut $n+1$.',
    ['Il y a $n+1$ sommes de deux termes, et chacune vaut $n$.',
     'Il y a $n$ sommes de deux termes, et chacune vaut $n$.',
     'Il y a $\\dfrac{n}{2}$ sommes de deux termes, et chacune vaut $n+1$.'],
    ['$S$ compte $n$ termes : en les additionnant deux à deux, on obtient $' + col('n')
     + '$ sommes.',
     'Chacune vaut $' + col('n+1', 1) + '$ : $1+n$, $2+(n-1)$, …, $n+1$.',
     'Donc $2S=n(n+1)$ et $S=\\dfrac{n(n+1)}{2}$. Les $\\dfrac{n}{2}$ sommes donneraient $S$,'
     ' pas $2S$, et seulement si $n$ est pair.'])

MODELES.append(modele(
    '03-demontrer-somme-des-entiers', 'Démontrer la somme 1 + 2 + ⋯ + n',
    'Démonstration à trous de 1 + 2 + ⋯ + n = n(n + 1)/2 (S écrite deux fois, à l\'envers) :'
    ' somme d\'une colonne, 2S, justification du produit n(n + 1)',
    'Sommes', 1,
    [V234_COLONNE, V234_DOUBLE, V234_POURQUOI],
    [spec('n + 1', 0, 'n+1', 'correct'),
     spec('Erreur : n', 0, 'n', 'incorrect'),
     spec('Erreur : n − 1', 0, 'n-1', 'incorrect'),
     spec('n(n + 1)', 1, 'n(n+1)', 'correct'),
     spec('Écriture n² + n', 1, 'n^2+n', 'correct'),
     spec('Erreur : n(n + 1)/2 (S au lieu de 2S)', 1, '\\frac{n(n+1)}{2}', 'incorrect'),
     spec('Erreur : (n + 1)²', 1, '(n+1)^2', 'incorrect'),
     spec('Erreur : n²', 1, 'n^2', 'incorrect')]
    + specs_choix(2, 'n sommes de n + 1', ['n + 1 sommes de n', 'n sommes de n',
                                             'n/2 sommes'])))

# --- 4. 1SPE-235 : 1 + q + ⋯ + qⁿ = (1 − qⁿ⁺¹)/(1 − q) ------------------------------------------

INTRO_235 = ('Soit $q$ un réel différent de $1$, $n$ un entier naturel et'
             ' $S=1+q+q^2+\\cdots+q^n$.\n\n')
QS_235 = ('On multiplie $S$ par $q$ :\n\n$$qS=q+q^2+\\cdots+q^n+q^{n+1}$$\n\n'
          'puis on soustrait membre à membre : $S-qS=1-q^{n+1}$, soit $S(1-q)=1-q^{n+1}$.\n\n')

V235_QS = case(
    INTRO_235 + 'On multiplie chaque terme de $S$ par $q$. Complète.\n\n'
    '$qS=q+q^2+\\cdots+q^n+?$',
    [], 'q^{n+1}',
    ['Multiplier par $q$ ajoute $1$ à chaque exposant : $1$ devient $q$, $q$ devient $q^2$, …,'
     ' $q^n$ devient $q^{n+1}$.',
     'Donc $qS=q+q^2+\\cdots+q^n+' + col('q^{n+1}') + '$.'])
V235_DIFFERENCE = case(
    INTRO_235 + 'On multiplie $S$ par $q$ :\n\n$$qS=q+q^2+\\cdots+q^n+q^{n+1}$$\n\n'
    'puis on soustrait membre à membre. Les termes $q$, $q^2$, …, $q^n$ se simplifient.'
    ' Complète.\n\n$S-qS=?$',
    [], {'expectedAnswer': '1-q^{n+1}'},
    ['Les termes $q$, …, $q^n$ sont à la fois dans $S$ et dans $qS$ : ils disparaissent.',
     'Il reste le premier terme de $S$, $1$, et le dernier terme de $qS$, $q^{n+1}$, avec le'
     ' signe $-$.',
     'Donc $S-qS=' + col('1-q^{n+1}') + '$.'])
V235_DIVISION = justification(
    INTRO_235 + QS_235 + 'On en déduit $S=\\dfrac{1-q^{n+1}}{1-q}$ en divisant par $1-q$.'
    ' Pourquoi cette division est-elle permise ?',
    [],
    'Car $q\\neq 1$, donc $1-q\\neq 0$.',
    ['Car $q\\neq 0$.', 'Car $q>0$.', 'Car $n\\neq 0$.'],
    ['On ne peut diviser que par un nombre non nul.',
     'Ici $q\\neq 1$, donc $' + col('1-q\\neq 0') + '$ : $S=\\dfrac{1-q^{n+1}}{1-q}$.',
     'Si $q=1$, la formule ne s\'applique pas : $S=1+1+\\cdots+1=n+1$.'])

MODELES.append(modele(
    '04-demontrer-somme-geometrique', 'Démontrer la somme 1 + q + ⋯ + qⁿ',
    'Démonstration à trous de 1 + q + ⋯ + qⁿ = (1 − qⁿ⁺¹)/(1 − q), q ≠ 1 : qS à compléter,'
    ' S − qS, justification de la division par 1 − q',
    'Sommes', 2,
    [V235_QS, V235_DIFFERENCE, V235_DIVISION],
    [spec('qⁿ⁺¹', 0, 'q^{n+1}', 'correct'),
     spec('Erreur : qⁿ', 0, 'q^n', 'incorrect'),
     spec('Erreur : nq', 0, 'nq', 'incorrect'),
     spec('1 − qⁿ⁺¹', 1, '1-q^{n+1}', 'correct'),
     spec('Écriture −qⁿ⁺¹ + 1', 1, '-q^{n+1}+1', 'correct'),
     spec('Erreur : 1 − qⁿ', 1, '1-q^n', 'incorrect'),
     spec('Erreur : 1 + qⁿ⁺¹', 1, '1+q^{n+1}', 'incorrect'),
     spec('Erreur : qⁿ⁺¹ − 1 (sens inversé)', 1, 'q^{n+1}-1', 'incorrect')]
    + specs_choix(2, 'q ≠ 1', ['q ≠ 0', 'q > 0', 'n ≠ 0'])))

# --- 5. 1SPE-255 : résolution de ax² + bx + c = 0 -----------------------------------------------

INTRO_255 = ('Soit $a$, $b$ et $c$ trois réels, avec $a\\neq 0$. On résout l\'équation'
             ' $ax^2+bx+c=0$.\n\nComme $a\\neq 0$, elle équivaut à'
             ' $x^2+\\dfrac{b}{a}x+\\dfrac{c}{a}=0$.\n\n')
CANONIQUE_255 = ('Comme $x^2+\\dfrac{b}{a}x=\\left(x+\\dfrac{b}{2a}\\right)^2-\\dfrac{b^2}{4a^2}$,'
                 ' l\'équation équivaut à\n\n'
                 '$$\\left(x+\\dfrac{b}{2a}\\right)^2=\\dfrac{b^2}{4a^2}-\\dfrac{c}{a}'
                 '=\\dfrac{b^2-4ac}{4a^2}$$\n\n')

V255_CARRE = case(
    INTRO_255 + 'On fait apparaître le début du carré $\\left(x+\\dfrac{b}{2a}\\right)^2$.'
    ' Complète.\n\n'
    '$x^2+\\dfrac{b}{a}x=\\left(x+\\dfrac{b}{2a}\\right)^2-?$',
    [], {'expectedAnswer': '\\frac{b^2}{4a^2}', 'requiredForm': {'pattern': 'u'}},
    ['On développe : $\\left(x+\\dfrac{b}{2a}\\right)^2=x^2+2\\times x\\times\\dfrac{b}{2a}+'
     '\\left(\\dfrac{b}{2a}\\right)^2=x^2+\\dfrac{b}{a}x+\\dfrac{b^2}{4a^2}$.',
     'Pour retrouver $x^2+\\dfrac{b}{a}x$, on retranche $' + col('\\dfrac{b^2}{4a^2}') + '$.'])
V255_DELTA = case(
    INTRO_255 + 'Comme $x^2+\\dfrac{b}{a}x=\\left(x+\\dfrac{b}{2a}\\right)^2-\\dfrac{b^2}{4a^2}$,'
    ' l\'équation équivaut à'
    ' $\\left(x+\\dfrac{b}{2a}\\right)^2=\\dfrac{b^2}{4a^2}-\\dfrac{c}{a}$.\n\n'
    'On réduit au même dénominateur. Complète.\n\n'
    '$\\dfrac{b^2}{4a^2}-\\dfrac{c}{a}=\\dfrac{?}{4a^2}$',
    [], 'b^2-4ac',
    ['$\\dfrac{c}{a}=\\dfrac{4ac}{4a^2}$ (on multiplie le numérateur et le dénominateur par $4a$).',
     'Donc $\\dfrac{b^2}{4a^2}-\\dfrac{c}{a}=\\dfrac{' + col('b^2-4ac') + '}{4a^2}$ : son'
     ' numérateur est le discriminant $\\Delta=b^2-4ac$.'])
V255_NEGATIF = justification(
    INTRO_255 + CANONIQUE_255 + 'On pose $\\Delta=b^2-4ac$. Si $\\Delta<0$, l\'équation n\'a'
    ' aucune solution réelle. Pourquoi ?',
    [],
    'Car un carré serait égal à $\\dfrac{\\Delta}{4a^2}$, qui est strictement négatif.',
    ['Car $a\\neq 0$.',
     'Car on ne peut pas diviser par $\\Delta$.',
     'Car $4a^2$ est strictement négatif.'],
    ['$4a^2>0$ car $a\\neq 0$ ; si $\\Delta<0$, alors $\\dfrac{\\Delta}{4a^2}<0$.',
     'Or un carré est toujours positif ou nul : $\\left(x+\\dfrac{b}{2a}\\right)^2$ ne peut pas'
     ' être égal à ' + '**un nombre strictement négatif**' + '.',
     'Aucun réel $x$ ne vérifie donc l\'équation.'])

MODELES.append(modele(
    '05-demontrer-resolution-second-degre', 'Démontrer la résolution de l\'équation du second degré',
    'Démonstration à trous de la résolution de ax² + bx + c = 0 par la forme canonique : terme'
    ' b²/(4a²) du carré, numérateur b² − 4ac, justification du cas Δ < 0',
    'Polynôme du second degré', 1,
    [V255_CARRE, V255_DELTA, V255_NEGATIF],
    [spec('b²/(4a²)', 0, '\\frac{b^2}{4a^2}', 'correct'),
     spec('Écriture (b/(2a))²', 0, '\\left(\\frac{b}{2a}\\right)^2', 'correct'),
     spec('Erreur : b/(2a)', 0, '\\frac{b}{2a}', 'incorrect'),
     spec('Erreur : b²/(2a)', 0, '\\frac{b^2}{2a}', 'incorrect'),
     spec('Erreur : b²/a²', 0, '\\frac{b^2}{a^2}', 'incorrect'),
     spec('b² − 4ac', 1, 'b^2-4ac', 'correct'),
     spec('Erreur : b² − ac', 1, 'b^2-ac', 'incorrect'),
     spec('Erreur : b² + 4ac', 1, 'b^2+4ac', 'incorrect'),
     spec('Erreur : b² − 4c', 1, 'b^2-4c', 'incorrect')]
    + specs_choix(2, 'carré négatif', ['a ≠ 0', 'division par Δ', '4a² négatif']),
    theme='Fonctions'))

os.makedirs(DOSSIER, exist_ok=True)
for nom, m in MODELES:
    with open(os.path.join(DOSSIER, nom + '.json'), 'w', encoding='utf-8') as f:
        json.dump(m, f, ensure_ascii=False, indent='\t')
        f.write('\n')
# Mis en forme comme le pre-commit, pour que le script redonne les fichiers commités
subprocess.run(['pnpm', 'exec', 'prettier', '--write', DOSSIER], check=True,
               stdout=subprocess.DEVNULL)
print(f'{len(MODELES)} modèles écrits dans {DOSSIER}')
