"""Écrit les 5 modèles du lot 9 A « Arithmétique » de la 2de dans scripts/questions/2de-arithmetique-a/.

Phase 0 validée par David le 2026-11-03 (§ 66 du journal `docs/wip/questions-2de-progress.md`).
Points : 2-235 (ℕ et ℤ), 2-236 (multiple, a = kb), 2-418 (diviseur), 2-419 (pair, impair), 2-237
(problèmes). Un point par modèle ; le nœud et le tag sont posés par la migration de rangement, après le
`--publier` de David.

Décisions et pièges :
- L9-c : problèmes courts à réponse numérique, une seule notion chacun ; pas de démonstration (2-239,
  2-240 sont des points P, sans modèle voulu) ;
- déjà là, à ne pas refaire : 5b20321f (2-204, à quels ensembles appartient un nombre), faf57d3b (5e,
  multiple ou diviseur ≤ 100), 9adccef3 (tous les diviseurs, n ⩽ 39), 9a06de2e (4e, 2n et 2n + 1) ;
  ici des nombres plus grands, l'égalité a = kb écrite, et le calcul littéral de la parité ;
- niveaux relevés en prod le 2026-11-03 (index d'unicité par catégorie, tous niveaux scolaires) :
  Entiers › Diviser › Multiples et diviseurs 1 à 8 pris → 9, 10 ; Calcul littéral › Produire une
  formule › Pairs et impairs 1 pris → 2 ; Logique › Ensembles › Appartenance et inclusion 1, 2 pris
  → 3 ; Entiers › Diviser › Problèmes (neuve) → 1 ;
- `eval` ne connaît ni `%` ni `==` : la parité d'un coefficient est tirée (`c = 2u + s`) ;
- les lettres n et m de l'énoncé ne sont jamais des noms de variables du gabarit ;
- une case choix rend les indices d'origine cochés, triés, séparés par `;` ; les choix sont mélangés
  à l'affichage : le corrigé nomme la bonne réponse, jamais son rang.

    python3 docs/wip/questions-2de/lot-arithmetique-a-2de.py scripts/questions/2de-arithmetique-a
"""
import json
import os
import subprocess
import sys

DOSSIER = sys.argv[1]


def spec(desc, vi, variables, answers, status, violations=None):
    s = {'description': desc, 'variationIndex': vi,
         'variables': {k: str(v) for k, v in variables.items()},
         'answers': answers if isinstance(answers, list) else [answers],
         'expected': {'status': status}}
    if violations:
        s['expected']['constraintViolations'] = violations
    return s


def modele(nom, title, description, categorie, level, variations, specs, options=None, delay=60):
    m = {'title': title, 'description': description, 'grades': ['2'], 'theme': categorie[0],
         'domain': categorie[1], 'subdomain': categorie[2], 'level': level, 'delay': delay,
         'status': 'draft'}
    if options:
        m['options'] = options
    m['shared'] = {'cleanCoefficients': True}
    m['variations'] = variations
    m['testSpecs'] = specs
    return nom, m


def var(nom, expression):
    return {'name': nom, 'expression': expression}


def variation(statement, variables, blanks, steps, conditions=None):
    v = {'statement': statement, 'variables': variables}
    if conditions:
        v['conditions'] = conditions
    v['blanks'] = blanks
    v['correction'] = {'steps': steps}
    return v


def case(attendu):
    return {'expectedAnswer': attendu}


def col(x, k=0):
    return '\\textcolor{{{color:primary.' + str(k) + '}}}{' + x + '}'


def choix(question, options, plusieurs=False, melanger=True):
    tete = []
    if plusieurs:
        tete.append('plusieurs: oui')
    if not melanger:
        tete.append('melanger: non')
    return (question + '\n\n```choix\n' + ''.join(t + '\n' for t in tete)
            + ''.join('- ' + o + '\n' for o in options) + '```')


MODELES = []
DIVISER = ('Entiers', 'Diviser', 'Multiples et diviseurs')

# --- 1. 2-235 : notations ℕ et ℤ ------------------------------------------------------------

DEF_N_Z = ('$\\mathbb{N}$ est l\'ensemble des **entiers naturels** : $0$, $1$, $2$, $3$… ;'
           ' $\\mathbb{Z}$ est l\'ensemble des **entiers relatifs** : les entiers naturels et leurs'
           ' opposés, $\\ldots,-2,-1,0,1,2,\\ldots$')

COMPTER_N = variation(
    'Combien y a-t-il d\'entiers $x\\in\\mathbb{N}$ tels que $-{{a}}<x\\leqslant{{b}}$ ?\n\nIl y en a $?$.',
    [var('a', '2..6'), var('b', '3..8')],
    [case('{{eval:(b)+1}}')],
    [DEF_N_Z + '.',
     'Un entier **naturel** n\'est jamais négatif : les entiers cherchés vont de $0$ à ${{b}}$'
     ' ($-{{a}}<0$ ne retire rien, ${{b}}$ est compris).',
     '$$' + col('0\\ ;\\ 1\\ ;\\ \\ldots\\ ;\\ {{b}}') + '$$',
     'Il y en a $' + col('{{eval:(b)+1}}') + '$.'])

COMPTER_Z = variation(
    'Combien y a-t-il d\'entiers $x\\in\\mathbb{Z}$ tels que $-{{a}}<x\\leqslant{{b}}$ ?\n\nIl y en a $?$.',
    [var('a', '3..6'), var('b', '3..8')],
    [case('{{eval:(a)+(b)}}')],
    [DEF_N_Z + '.',
     'Les entiers **relatifs** cherchés vont de $-{{eval:(a)-1}}$ (car $-{{a}}$ est exclu) à ${{b}}$'
     ' (compris) :',
     '$$' + col('-{{eval:(a)-1}}\\ ;\\ \\ldots\\ ;\\ -1') + '\\ ;\\ ' + col('0\\ ;\\ \\ldots\\ ;\\ {{b}}', 1)
     + '$$',
     '$' + col('{{eval:(a)-1}}') + '$ entiers négatifs et $' + col('{{eval:(b)+1}}', 1)
     + '$ entiers de $0$ à ${{b}}$ : il y en a $\\textcolor{{{color:primary.2}}}{ {{eval:(a)+(b)}} }$.'])

VRAI_N_Z = variation(
    choix('Quelles affirmations sont vraies ?',
          ['$-{{a}}\\in\\mathbb{N}$',
           '$-{{a}}\\in\\mathbb{Z}$',
           '$0\\in\\mathbb{N}$',
           '$\\dfrac{ {{eval:(b)*(c)}} }{ {{c}} }\\in\\mathbb{N}$',
           '$\\dfrac{ {{eval:2*(d)+1}} }{2}\\in\\mathbb{Z}$',
           '$\\mathbb{Z}\\subset\\mathbb{N}$'], plusieurs=True),
    [var('a', '2..9'), var('b', '2..9'), var('c', '3..7'), var('d', '2..9')],
    [case('1;2;3')],
    [DEF_N_Z + '. Tout entier naturel est un entier relatif : $\\mathbb{N}\\subset\\mathbb{Z}$.',
     '**Vraies** : $' + col('-{{a}}\\in\\mathbb{Z}') + '$ ; $' + col('0\\in\\mathbb{N}')
     + '$ ($0$ est un entier naturel) ; $' + col('\\dfrac{ {{eval:(b)*(c)}} }{ {{c}} }={{b}}\\in\\mathbb{N}')
     + '$.',
     '**Fausses** : $-{{a}}\\notin\\mathbb{N}$ (négatif) ; $\\dfrac{ {{eval:2*(d)+1}} }{2}\\notin\\mathbb{Z}$'
     ' (${{eval:2*(d)+1}}$ est impair, le quotient n\'est pas entier) ; $\\mathbb{Z}\\not\\subset\\mathbb{N}$ (par exemple $-1\\in\\mathbb{Z}$'
     ' mais $-1\\notin\\mathbb{N}$).'])

SP_CN = {'a': 3, 'b': 5}
SP_VZ = {'a': 4, 'b': 3, 'c': 5, 'd': 3}
MODELES.append(modele(
    '01-entiers-naturels-et-relatifs', 'Entiers naturels, entiers relatifs',
    'Compter les x de ℕ, puis de ℤ, tels que −a < x ⩽ b ; vrai ou faux : −a ∈ ℕ, 0 ∈ ℕ, 15/5 ∈ ℕ, 7/2 ∈ ℤ,'
    ' ℤ ⊂ ℕ',
    ('Logique', 'Ensembles', 'Appartenance et inclusion'), 3,
    [COMPTER_N, COMPTER_Z, VRAI_N_Z],
    [spec('ℕ, −3 < x ⩽ 5 : 0 à 5, six entiers', 0, SP_CN, '6', 'correct'),
     spec('Erreur : 0 oublié (5)', 0, SP_CN, '5', 'incorrect'),
     spec('Erreur : négatifs comptés comme dans ℤ (8)', 0, SP_CN, '8', 'incorrect'),
     spec('ℤ, −3 < x ⩽ 5 : −2 à 5, huit entiers', 1, SP_CN, '8', 'correct'),
     spec('Erreur : −3 compté (9)', 1, SP_CN, '9', 'incorrect'),
     spec('Erreur : 0 oublié (7)', 1, SP_CN, '7', 'incorrect'),
     spec('Vraies : −4 ∈ ℤ, 0 ∈ ℕ, 15/5 ∈ ℕ', 2, SP_VZ, '1;2;3', 'correct'),
     spec('Erreur : 0 ∉ ℕ (une vraie oubliée, ½)', 2, SP_VZ, '1;3', 'unoptimal_form'),
     spec('Erreur : ℤ ⊂ ℕ coché', 2, SP_VZ, '1;2;3;5', 'incorrect')]))

# --- 2. 2-236 : multiple, a = kb --------------------------------------------------------------

DEF_MULTIPLE = ('**Définition** : $a$ est un **multiple** de $b$ s\'il existe un **entier** $k$ tel que'
                ' $a=k\\times b$.')

TROUVER_K = variation(
    'Trouve l\'entier $k$ tel que ${{eval:(k)*(b)}}=k\\times{{b}}$.\n\n$$k=?$$',
    [var('b', '11..19'), var('k', '12..45')],
    [case('{{k}}')],
    [DEF_MULTIPLE,
     '$$k=\\dfrac{ {{eval:(k)*(b)}} }{ {{b}} }=' + col('{{k}}') + '$$',
     '$k$ est un entier : ${{eval:(k)*(b)}}={{k}}\\times{{b}}$ est un multiple de ${{b}}$.'],
    ['k*b <= 800'])

EST_MULTIPLE = variation(
    choix('${{eval:(k)*(b)+(w)*(r)}}$ est-il un multiple de ${{b}}$ ?', ['Oui', 'Non'], melanger=False),
    [var('b', '11..19'), var('k', '12..45'), var('w', '0|1'), var('r', '1..10')],
    [case('{{w}}')],
    [DEF_MULTIPLE,
     'On divise : ${{eval:(k)*(b)+(w)*(r)}}={{k}}\\times{{b}}{{if:w==1|+{{r}}}}$.',
     '{{if:w==0|Le reste est nul : $k={{k}}$ est entier, **oui**, $' + col(
         '{{eval:(k)*(b)}}={{k}}\\times{{b}}') + '$ est un multiple de ${{b}}$.|Le reste vaut ${{r}}\\neq0$ :'
     ' le quotient $\\dfrac{ {{eval:(k)*(b)+(r)}} }{ {{b}} }$ n\'est pas entier, **non**, ce n\'est pas un'
     ' multiple de ${{b}}$.}}'],
    ['k*b <= 800', 'r < b'])

FACTORISER = variation(
    '$n$ désigne un entier. Complète pour montrer que ${{eval:(d)*(p)}}n+{{eval:(d)*(q)}}$ est un multiple'
    ' de ${{d}}$.\n\n$${{eval:(d)*(p)}}n+{{eval:(d)*(q)}}={{d}}\\times\\left(?\\right)$$',
    [var('d', '2..9'), var('p', '2..5'), var('q', '1..9')],
    [case('{{p}}n+{{q}}')],
    [DEF_MULTIPLE + ' On met ${{d}}$ en facteur :',
     '$${{eval:(d)*(p)}}n+{{eval:(d)*(q)}}={{d}}\\times{{p}}n+{{d}}\\times{{q}}={{d}}\\times'
     + col('\\left({{p}}n+{{q}}\\right)') + '$$',
     '$k=' + col('{{p}}n+{{q}}') + '$ est un entier (produit et somme d\'entiers) : le nombre est un'
     ' multiple de ${{d}}$.'],
    ['gcd(p,q) == 1'])

SP_TK = {'b': 13, 'k': 27}
SP_EM = {'b': 17, 'k': 23, 'w': 0, 'r': 5}
SP_EN = {'b': 17, 'k': 23, 'w': 1, 'r': 5}
SP_FA = {'d': 3, 'p': 2, 'q': 5}
MODELES.append(modele(
    '02-multiple-a-egal-kb', 'Multiple : a = k × b',
    'Trouver k dans 351 = k × 13 ; dire si 391 est un multiple de 17 (nombres ⩽ 800) ; écrire 6n + 15'
    ' = 3 × (2n + 5)',
    DIVISER, 9,
    [TROUVER_K, EST_MULTIPLE, FACTORISER],
    [spec('351 = k × 13 : k = 27', 0, SP_TK, '27', 'correct'),
     spec('Erreur : 13 × 27 (4563)', 0, SP_TK, '4563', 'incorrect'),
     spec('391 = 23 × 17 : oui', 1, SP_EM, '0', 'correct'),
     spec('Erreur : non', 1, SP_EM, '1', 'incorrect'),
     spec('396 = 23 × 17 + 5 : non', 1, SP_EN, '1', 'correct'),
     spec('6n + 15 = 3(2n + 5)', 2, SP_FA, '2n+5', 'correct'),
     spec('Erreur : constante non divisée (2n + 15)', 2, SP_FA, '2n+15', 'incorrect'),
     spec('Erreur : coefficient non divisé (6n + 5)', 2, SP_FA, '6n+5', 'incorrect')]))

# --- 3. 2-418 : diviseurs ---------------------------------------------------------------------

DEF_DIVISEUR = ('**Définition** : $b$ est un **diviseur** de $a$ (« $b$ divise $a$ ») si $a$ est un multiple'
                ' de $b$, c\'est-à-dire s\'il existe un entier $k$ tel que $a=k\\times b$. Les diviseurs vont'
                ' **par paires** : $a=b\\times k$ donne les deux diviseurs $b$ et $k$.')

SIX_DIVISEURS = variation(
    'Écris tous les diviseurs positifs de ${{eval:(p)*(q)^2}}$. Il y en a $6$.\n\n'
    '$?$ ; $?$ ; $?$ ; $?$ ; $?$ ; $?$',
    [var('p', '2|3|5|7'), var('q', '3|5|7')],
    [case('1'), case('{{p}}'), case('{{q}}'), case('{{eval:(p)*(q)}}'), case('{{eval:(q)^2}}'),
     case('{{eval:(p)*(q)^2}}')],
    [DEF_DIVISEUR,
     'On cherche les produits égaux à ${{eval:(p)*(q)^2}}$ :',
     '$${{eval:(p)*(q)^2}}=1\\times{{eval:(p)*(q)^2}}={{p}}\\times{{eval:(q)^2}}={{q}}\\times{{eval:(p)*(q)}}$$',
     'Chaque produit donne deux diviseurs : les $6$ diviseurs de ${{eval:(p)*(q)^2}}$ sont les $'
     + col('6') + '$ facteurs de ces produits.'],
    ['p != q', 'p*q^2 <= 250'])

NEUF_DIVISEURS = variation(
    'Écris tous les diviseurs positifs de ${{eval:(p)^2*(q)^2}}$. Il y en a $9$.\n\n'
    '$?$ ; $?$ ; $?$ ; $?$ ; $?$ ; $?$ ; $?$ ; $?$ ; $?$',
    [var('p', '2|3'), var('q', '3|5|7')],
    [case('1'), case('{{p}}'), case('{{q}}'), case('{{eval:(p)^2}}'), case('{{eval:(p)*(q)}}'),
     case('{{eval:(q)^2}}'), case('{{eval:(p)^2*(q)}}'), case('{{eval:(p)*(q)^2}}'),
     case('{{eval:(p)^2*(q)^2}}')],
    [DEF_DIVISEUR,
     'On cherche les produits égaux à ${{eval:(p)^2*(q)^2}}$, jusqu\'à ce que les paires se croisent :',
     '$${{eval:(p)^2*(q)^2}}=1\\times{{eval:(p)^2*(q)^2}}={{p}}\\times{{eval:(p)*(q)^2}}={{q}}\\times'
     '{{eval:(p)^2*(q)}}={{eval:(p)^2}}\\times{{eval:(q)^2}}={{eval:(p)*(q)}}\\times{{eval:(p)*(q)}}$$',
     '${{eval:(p)*(q)}}\\times{{eval:(p)*(q)}}$ ne donne qu\'**un** diviseur : leur nombre est impair.',
     'Les $9$ diviseurs de ${{eval:(p)^2*(q)^2}}$ sont les $' + col('9') + '$ facteurs de ces produits.'],
    ['p != q', 'p^2*q^2 <= 225'])

SP_6 = {'p': 2, 'q': 5}
SP_9 = {'p': 2, 'q': 3}
MODELES.append(modele(
    '03-diviseurs', 'Tous les diviseurs d\'un nombre, par paires',
    'Écrire les 6 diviseurs de p × q² (50, 75, 98, 147…), puis les 9 diviseurs de p² × q² (36, 100, 196,'
    ' 225)',
    DIVISER, 10,
    [SIX_DIVISEURS, NEUF_DIVISEURS],
    [spec('Diviseurs de 50', 0, SP_6, ['1', '2', '5', '10', '25', '50'], 'correct'),
     spec('Diviseurs de 50, dans le désordre', 0, SP_6, ['50', '1', '25', '2', '10', '5'], 'correct'),
     spec('Erreur : 1 oublié, 100 ajouté', 0, SP_6, ['2', '5', '10', '25', '50', '100'], 'incorrect'),
     spec('Diviseurs de 36', 1, SP_9, ['1', '2', '3', '4', '6', '9', '12', '18', '36'], 'correct'),
     spec('Erreur : 6 écrit deux fois, 8 au lieu de 9', 1, SP_9,
          ['1', '2', '3', '4', '6', '6', '12', '18', '36'], 'incorrect'),
     spec('Erreur : 8 au lieu de 9', 1, SP_9, ['1', '2', '3', '4', '6', '8', '12', '18', '36'], 'incorrect')],
    options={'orderIndependent': True}))

# --- 4. 2-419 : pair, impair ------------------------------------------------------------------

DEF_PAIR = ('Un entier est **pair** s\'il s\'écrit $2k$, **impair** s\'il s\'écrit $2k+1$, avec $k$'
            ' **entier**.')

PAIR_OU_IMPAIR = variation(
    '$n$ désigne un entier.\n\n'
    + choix('Le nombre $A={{eval:2*(u)+(s)}}n+{{eval:2*(v)+(t)}}$ est…',
            ['toujours pair', 'toujours impair', 'pair ou impair, selon $n$'], melanger=False),
    [var('u', '1..4'), var('s', '0|1'), var('v', '0..4'), var('t', '0|1')],
    [case('{{eval:2*(s)+(1-(s))*(t)}}')],
    [DEF_PAIR,
     '{{if:s==0|$A=2\\times{{u}}n+{{eval:2*(v)+(t)}}$ : $' + col('2\\times{{u}}n') + '$ est pair quel que'
     ' soit $n$, donc $A$ a la parité de ${{eval:2*(v)+(t)}}$ : $A$ est **{{if:t==0|toujours pair|toujours'
     ' impair}}**.|Le coefficient de $n$, ${{eval:2*(u)+1}}$, est impair : ${{eval:2*(u)+1}}n$ a la parité de'
     ' $n$. Pour $n=0$, $A={{eval:2*(v)+(t)}}$ ; pour $n=1$, $A={{eval:2*(u)+1+2*(v)+(t)}}$ : l\'un est pair,'
     ' l\'autre impair. $A$ est **pair ou impair, selon $n$**.}}'])

SOMME_IMPAIRS = variation(
    '$n$ et $m$ désignent des entiers. Complète pour montrer que la somme est paire.\n\n'
    '$$(2n+{{a}})+(2m+{{b}})=2\\times\\left(?\\right)$$',
    [var('a', '1|3|5|7'), var('b', '1|3|5|7')],
    [case('n+m+{{eval:((a)+(b))/2}}')],
    [DEF_PAIR,
     '$$(2n+{{a}})+(2m+{{b}})=2n+2m+{{eval:(a)+(b)}}=2\\times' + col('\\left(n+m+{{eval:((a)+(b))/2}}\\right)')
     + '$$',
     '$k=' + col('n+m+{{eval:((a)+(b))/2}}') + '$ est un entier : la somme de deux impairs est **paire**.'])

FORME_IMPAIRE = variation(
    '$n$ désigne un entier. Complète pour montrer que ce nombre est impair.\n\n'
    '$${{eval:2*(c)}}n+{{eval:2*(d)+1}}=2\\times\\left(?\\right)+1$$',
    [var('c', '2..5'), var('d', '1..6')],
    [case('{{c}}n+{{d}}')],
    [DEF_PAIR,
     '$$\\begin{aligned}{{eval:2*(c)}}n+{{eval:2*(d)+1}}&={{eval:2*(c)}}n+{{eval:2*(d)}}+1\\\\'
     '&=2\\times' + col('\\left({{c}}n+{{d}}\\right)') + '+1\\end{aligned}$$',
     '$k=' + col('{{c}}n+{{d}}') + '$ est un entier : le nombre est **impair**.'])

PRODUIT_PAIR = variation(
    '$n$ et $m$ désignent des entiers. Complète pour montrer que le produit est pair.\n\n'
    '$$2n\\times(2m+{{a}})=2\\times\\left(?\\right)$$',
    [var('a', '3|5')],
    [case('2nm+{{a}}n')],
    [DEF_PAIR,
     '$$2n\\times(2m+{{a}})=2\\times' + col('n(2m+{{a}})') + '=2\\times' + col('\\left(2nm+{{a}}n\\right)')
     + '$$',
     '$k=' + col('2nm+{{a}}n') + '$ est un entier : le produit d\'un pair par un entier est **pair**.'])

SP_PI = {'u': 2, 's': 0, 'v': 1, 't': 1}
SP_PP = {'u': 1, 's': 0, 'v': 2, 't': 0}
SP_PS = {'u': 1, 's': 1, 'v': 1, 't': 0}
SP_SI = {'a': 1, 'b': 3}
SP_FI = {'c': 2, 'd': 1}
SP_PR = {'a': 3}
MODELES.append(modele(
    '04-pair-ou-impair', 'Pair ou impair : écrire 2k ou 2k + 1',
    'Parité de an + b selon les coefficients ; (2n + 1) + (2m + 3) = 2(n + m + 2) ; 4n + 3 = 2(2n + 1) + 1 ;'
    ' 2n(2m + 3) = 2(2nm + 3n)',
    ('Calcul littéral', 'Produire une formule', 'Pairs et impairs'), 2,
    [PAIR_OU_IMPAIR, SOMME_IMPAIRS, FORME_IMPAIRE, PRODUIT_PAIR],
    [spec('4n + 3 : toujours impair', 0, SP_PI, '1', 'correct'),
     spec('Erreur : 4n + 3 pair', 0, SP_PI, '0', 'incorrect'),
     spec('2n + 4 : toujours pair', 0, SP_PP, '0', 'correct'),
     spec('3n + 2 : selon n', 0, SP_PS, '2', 'correct'),
     spec('Erreur : 3n + 2 toujours pair', 0, SP_PS, '0', 'incorrect'),
     spec('(2n + 1) + (2m + 3) = 2(n + m + 2)', 1, SP_SI, 'n+m+2', 'correct'),
     spec('Même somme, écrite autrement', 1, SP_SI, 'm+n+2', 'correct'),
     spec('Erreur : 4 non divisé (n + m + 4)', 1, SP_SI, 'n+m+4', 'incorrect'),
     spec('4n + 3 = 2(2n + 1) + 1', 2, SP_FI, '2n+1', 'correct'),
     spec('Erreur : 1 de trop (2n + 3/2)', 2, SP_FI, '2n+\\frac{3}{2}', 'incorrect'),
     spec('2n(2m + 3) = 2(2nm + 3n)', 3, SP_PR, '2nm+3n', 'correct'),
     spec('Forme factorisée, acceptée', 3, SP_PR, 'n(2m+3)', 'correct'),
     spec('Erreur : 2 laissé dedans (4nm + 6n)', 3, SP_PR, '4nm+6n', 'incorrect')],
    # tout entier k convient pour prouver la parité : n(2m + 3) aussi bien que 2nm + 3n
    options={'constraints': {'form': 'off'}}))

# --- 5. 2-237 : problèmes ---------------------------------------------------------------------

CONSECUTIFS = variation(
    'Trois entiers consécutifs ont pour somme ${{eval:3*(n)+3}}$. Quel est le plus petit des trois ?\n\nLe plus petit est $?$.',
    [var('n', '12..95')],
    [case('{{n}}')],
    ['On appelle $x$ le plus petit : les trois entiers sont $x$, $x+1$ et $x+2$.',
     '$$x+(x+1)+(x+2)=3x+3=3\\times(x+1)$$',
     'La somme est un **multiple de $3$** : $3(x+1)={{eval:3*(n)+3}}$, donc $x+1={{eval:(n)+1}}$ et $x='
     + col('{{n}}') + '$.',
     'Vérification : ${{n}}+{{eval:(n)+1}}+{{eval:(n)+2}}={{eval:3*(n)+3}}$.'])

PAIRS_CONSECUTIFS = variation(
    'Deux entiers **pairs** consécutifs ont pour somme ${{eval:4*(k)+2}}$. Quel est le plus grand des deux ?\n\nLe plus grand est $?$.',
    [var('k', '8..45')],
    [case('{{eval:2*(k)+2}}')],
    ['Deux pairs consécutifs s\'écrivent $2x$ et $2x+2$, avec $x$ entier.',
     '$$2x+(2x+2)=4x+2={{eval:4*(k)+2}}$$',
     'Donc $4x={{eval:4*(k)}}$, $x={{k}}$ : les deux pairs sont ${{eval:2*(k)}}$ et $' + col('{{eval:2*(k)+2}}')
     + '$.',
     'Vérification : ${{eval:2*(k)}}+{{eval:2*(k)+2}}={{eval:4*(k)+2}}$.'])

ESCALIER = variation(
    'Léa monte un escalier $2$ marches par $2$ et arrive exactement en haut. Tom le monte $3$ marches par $3$'
    ' et arrive, lui aussi, exactement en haut. L\'escalier a entre ${{eval:6*(k)-3}}$ et ${{eval:6*(k)+2}}$'
    ' marches.\n\nCombien de marches a-t-il ?\n\nIl a $?$ marches.',
    [var('k', '3..9')],
    [case('{{eval:6*(k)}}')],
    ['Le nombre de marches est un **multiple de $2$** (Léa) et un **multiple de $3$** (Tom) : c\'est un'
     ' multiple de $6$.',
     'Les multiples de $6$ voisins : ${{eval:6*(k)-6}}$, ${{eval:6*(k)}}$, ${{eval:6*(k)+6}}$. Un seul est'
     ' entre ${{eval:6*(k)-3}}$ et ${{eval:6*(k)+2}}$ : l\'escalier a $' + col('{{eval:6*(k)}}') + '$ marches.'])

SP_C3 = {'n': 41}
SP_P2 = {'k': 17}
SP_ES = {'k': 5}
MODELES.append(modele(
    '05-problemes-multiples-parite', 'Problèmes : multiples et parité',
    'Trois entiers consécutifs de somme 126 ; deux pairs consécutifs de somme 70 ; un escalier monté 2 par 2'
    ' et 3 par 3 (multiple de 6 dans un intervalle)',
    ('Entiers', 'Diviser', 'Problèmes'), 1,
    [CONSECUTIFS, PAIRS_CONSECUTIFS, ESCALIER],
    [spec('Somme 126 : 41, 42, 43', 0, SP_C3, '41', 'correct'),
     spec('Erreur : le milieu (42)', 0, SP_C3, '42', 'incorrect'),
     spec('Erreur : 126 ÷ 3 − 1 mal fait (40)', 0, SP_C3, '40', 'incorrect'),
     spec('Somme 70 : 34 et 36', 1, SP_P2, '36', 'correct'),
     spec('Erreur : le plus petit (34)', 1, SP_P2, '34', 'incorrect'),
     spec('Erreur : 70 ÷ 2 (35)', 1, SP_P2, '35', 'incorrect'),
     spec('Entre 27 et 32 : 30 marches', 2, SP_ES, '30', 'correct'),
     spec('Erreur : multiple de 2 seulement (28)', 2, SP_ES, '28', 'incorrect')],
    delay=90))

os.makedirs(DOSSIER, exist_ok=True)
for nom, m in MODELES:
    with open(os.path.join(DOSSIER, nom + '.json'), 'w', encoding='utf-8') as f:
        json.dump(m, f, ensure_ascii=False, indent='\t')
        f.write('\n')
# Mis en forme comme le pre-commit, pour que le script redonne les fichiers commités
subprocess.run(['pnpm', 'exec', 'prettier', '--write', DOSSIER], check=True,
               stdout=subprocess.DEVNULL)
print(f'{len(MODELES)} modèles écrits dans {DOSSIER}')
