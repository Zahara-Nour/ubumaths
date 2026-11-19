"""Écrit les modèles neufs du lot 6 « probabilités » de la 1re techno dans scripts/questions/1techno-6/.

Phase 0 validée par David le 2026-11-18 (« je suis tes recos », journal docs/archive/wip/questions-1techno-progress.md,
§ 30) :

- P1 cours : formule des probabilités totales → 1TECHNO-090 (partition {A, Ā} seulement, l1t-1) ;
- P2 cours : loi de Bernoulli → 1TECHNO-097 ;
- P3 espérance d'une loi de Bernoulli → 1TECHNO-136 (sans variance) ;
- P4 calculer P(X = a), P(X ⩽ a) → 1TECHNO-137, jumeau de 97b3a376 (ses v1-v2 reprises telles quelles ;
  P(X > a) par le contraire, l1t-6 ; jamais a ⩽ X ⩽ b) ;
- P5 tableau croisé d'après des données brutes → 1TECHNO-013 (12 individus, Q-L6a).

    python3 docs/wip/questions/lot-1techno-6.py scripts/questions/1techno-6
"""
import json
import os
import sys

DOSSIER = sys.argv[1]


def spec(desc, vi, answers, status, variables=None):
    return {'description': desc, 'variationIndex': vi,
            'variables': {k: str(v) for k, v in (variables or {}).items()},
            'answers': answers if isinstance(answers, list) else [answers],
            'expected': {'status': status}}


def var(nom, expression):
    return {'name': nom, 'expression': expression}


def modele(title, point, description, level, variations, specs, cours=False):
    m = {'title': title, 'description': description,
         'grades': ['1_TECHNO'], 'level': level, 'delay': 30 if cours else 60, 'status': 'draft'}
    if cours:
        m['options'] = {'courseQuestion': True}
    m.update({'shared': {'blankDefaults': {'acceptDecimal': True}},
              'variations': variations, 'testSpecs': specs, '_point': point})
    return m


def variation(statement, blanks, variables, steps, conditions=None):
    v = {'statement': statement, 'blanks': blanks, 'variables': variables,
         'correction': {'steps': steps}}
    if conditions:
        v['conditions'] = conditions
    return v


def choix(enonce, bonne, autres, steps, variables=None, conditions=None):
    """Case choix mélangée : la bonne réponse est écrite en premier (index 0)."""
    bloc = '\n\n```choix\n' + ''.join('- ' + l + '\n' for l in [bonne] + autres) + '```'
    return variation(enonce + bloc, [{'expectedAnswer': '0'}], variables or [], steps, conditions)


def vrai_faux(enonce, vrai, steps, variables=None):
    bloc = '\n\n```choix\nmelanger: non\n- Vrai\n- Faux\n```'
    return variation(enonce + bloc, [{'expectedAnswer': '0' if vrai else '1'}], variables or [], steps)


def case(attendue, **options):
    return {'expectedAnswer': attendue, **options}


def couleur(x):
    return '\\textcolor{{{color:primary.0}}}{' + x + '}'


FRACTION = 'Réponds par une fraction irréductible ou par un nombre décimal exact.'
PA = '\\overline{A}'

MODELES = []

# ---------------------------------------------------------------------------------------------
# P1 — cours : formule des probabilités totales, 1TECHNO-090
# ---------------------------------------------------------------------------------------------

ARBRE = ('```probtree\nA:0.{{a}}\n  B:0.{{b}}\n  \\overline{B}:0.{{eval:10-b}}\n\\overline{A}:0.{{eval:10-a}}\n'
         '  B:0.{{c}}\n  \\overline{B}:0.{{eval:10-c}}\n```')
VARS_ARBRE = [var('a', '2..8'), var('b', '1..9'), var('c', '1..9')]
PARTITION = ('$A$ et $' + PA + '$ forment une **partition** de l\'univers : la formule des probabilités totales'
             ' donne $P(B)=P(A\\cap B)+P(' + PA + '\\cap B)$.')

MODELES.append(('P1-cours-formule-des-probabilites-totales', modele(
    'Cours : formule des probabilités totales', '1TECHNO-090',
    'La formule des probabilités totales pour la partition {A, Ā} : écriture, chemins de l\'arbre, vrai ou faux',
    1,
    [choix('$A$ et $' + PA + '$ forment une partition de l\'univers, et $B$ est un évènement.\n\n'
           'D\'après la formule des probabilités totales, $P(B)=\\ldots$',
           '$P(A\\cap B)+P(' + PA + '\\cap B)$',
           ['$P_A(B)+P_{' + PA + '}(B)$', '$P(A)+P(' + PA + ')$', '$P(A\\cap B)\\times P(' + PA + '\\cap B)$'],
           [PARTITION,
            'On additionne les probabilités des **intersections** $A\\cap B$ et $' + PA + '\\cap B$, pas les'
            ' probabilités conditionnelles.']),
     choix('On considère l\'arbre pondéré ci-dessous.\n\n' + ARBRE
           + '\n\nPour calculer $P(B)$ avec la formule des probabilités totales, on additionne…',
           'les probabilités des deux chemins qui mènent à $B$',
           ['les probabilités des deux branches qui partent de la racine',
            'les probabilités de toutes les branches de l\'arbre',
            'la probabilité du seul chemin $A$ puis $B$'],
           [PARTITION,
            'La probabilité d\'un chemin est le **produit** des probabilités de ses branches : $P(A\\cap B)'
            '=0{,}{{a}}\\times0{,}{{b}}$ et $P(' + PA + '\\cap B)=0{,}{{eval:10-a}}\\times0{,}{{c}}$.',
            'On additionne donc les probabilités des **deux chemins qui mènent à $B$**.'],
           VARS_ARBRE),
     vrai_faux('$A$ et $' + PA + '$ forment une partition de l\'univers, avec $P(A)\\neq0$ et $P(' + PA
               + ')\\neq0$.\n\nVrai ou faux : $P(B)=P(A)\\times P_A(B)+P(' + PA + ')\\times P_{' + PA + '}(B)$.',
               True,
               [PARTITION,
                'Or $P(A\\cap B)=P(A)\\times P_A(B)$ et $P(' + PA + '\\cap B)=P(' + PA + ')\\times P_{' + PA
                + '}(B)$ : l\'égalité est $' + couleur('\\text{vraie}') + '$.']),
     vrai_faux('$A$ et $' + PA + '$ forment une partition de l\'univers, avec $P(A)\\neq0$ et $P(' + PA
               + ')\\neq0$.\n\nVrai ou faux : $P(B)=P_A(B)+P_{' + PA + '}(B)$.',
               False,
               [PARTITION,
                'Les probabilités conditionnelles doivent être **multipliées** par $P(A)$ et $P(' + PA
                + ')$ : $P(B)=P(A)\\times P_A(B)+P(' + PA + ')\\times P_{' + PA + '}(B)$. L\'égalité est '
                + '$' + couleur('\\text{fausse}') + '$.']),
     variation('$A$ et $' + PA + '$ forment une partition de l\'univers. On sait que $P(A\\cap B)={{eval:s/100;d}}$'
               ' et $P(' + PA + '\\cap B)={{eval:t/100;d}}$.\n\n' + FRACTION + '\n\n$P(B)=?$',
               [case('{{eval:(s+t)/100}}')],
               [var('s', '5..45'), var('t', '5..45')],
               [PARTITION,
                '$P(B)={{eval:s/100;d}}+{{eval:t/100;d}}=' + couleur('{{eval:(s+t)/100;d}}') + '$.'],
               ['s != t'])],
    [spec('Formule', 0, '0', 'correct'),
     spec('Erreur : conditionnelles', 0, '1', 'incorrect'),
     spec('Deux chemins', 1, '0', 'correct', {'a': 3, 'b': 4, 'c': 6}),
     spec('Erreur : branches de la racine', 1, '1', 'incorrect', {'a': 3, 'b': 4, 'c': 6}),
     spec('Vrai', 2, '0', 'correct'),
     spec('Erreur : faux', 2, '1', 'incorrect'),
     spec('Faux', 3, '1', 'correct'),
     spec('Erreur : vrai', 3, '0', 'incorrect'),
     spec('Somme', 4, '0,35', 'correct', {'s': 12, 't': 23}),
     spec('Somme en fraction', 4, '\\frac{7}{20}', 'correct', {'s': 12, 't': 23}),
     spec('Erreur : produit', 4, '0,0276', 'incorrect', {'s': 12, 't': 23})],
    cours=True)))

# ---------------------------------------------------------------------------------------------
# P2 — cours : loi de Bernoulli, 1TECHNO-097
# ---------------------------------------------------------------------------------------------

DEF_BERNOULLI = ('$X$ suit la loi de Bernoulli de paramètre $p$ : $X$ vaut $1$ (succès) avec la probabilité $p$,'
                 ' et $0$ (échec) avec la probabilité $1-p$.')


def table_bernoulli(p0, p1):
    return ('| $x_k$ | $0$ | $1$ |\n|---|---|---|\n| $P(X=x_k)$ | $' + p0 + '$ | $' + p1 + '$ |')


MODELES.append(('P2-cours-loi-de-bernoulli', modele(
    'Cours : loi de Bernoulli', '1TECHNO-097',
    'Loi de Bernoulli (0, 1) de paramètre p : valeurs prises, P(X = 0), paramètre en contexte ou d\'après le'
    ' tableau de la loi', 1,
    [choix('La variable aléatoire $X$ suit la loi de Bernoulli de paramètre $p$.\n\n'
           'Quelles valeurs $X$ peut-elle prendre ?',
           '$0$ et $1$ seulement',
           ['$0$ et $p$ seulement', '$1$ et $p$ seulement', 'tous les nombres entre $0$ et $1$'],
           [DEF_BERNOULLI, 'Ses seules valeurs sont ' + '$' + couleur('0') + '$ et $' + couleur('1') + '$ ; $p$ est'
            ' une **probabilité**, pas une valeur de $X$.']),
     variation('La variable aléatoire $X$ suit la loi de Bernoulli de paramètre $p={{eval:a/100;d}}$.\n\n'
               + FRACTION + '\n\n$P(X=1)=?$\n\n$P(X=0)=?$',
               [case('{{eval:a/100}}'), case('{{eval:(100-a)/100}}')],
               [var('a', '5..95')],
               [DEF_BERNOULLI,
                '$P(X=1)=p=' + couleur('{{eval:a/100;d}}') + '$ et $P(X=0)=1-{{eval:a/100;d}}='
                + couleur('{{eval:(100-a)/100;d}}') + '$.'],
               ['a != 50']),
     choix('Un joueur de basket réussit un lancer franc avec une probabilité de ${{eval:t/100;d}}$. Il tente'
           ' un lancer franc ; $X$ vaut $1$ s\'il le réussit, $0$ sinon.\n\nQuelle est la loi de $X$ ?',
           'la loi de Bernoulli de paramètre ${{eval:t/100;d}}$',
           ['la loi de Bernoulli de paramètre ${{eval:1-t/100;d}}$', 'la loi de Bernoulli de paramètre $1$',
            'la loi de Bernoulli de paramètre $\\dfrac{1}{2}$'],
           ['$X$ ne prend que les valeurs $1$ (succès : le lancer est réussi) et $0$ (échec), pour **une seule**'
            ' épreuve.',
            'Le paramètre est la probabilité du **succès** : $X$ suit la loi de Bernoulli de paramètre $'
            + couleur('{{eval:t/100;d}}') + '$.'],
           [var('t', '55..95')], ['t != 50']),
     variation('La loi de probabilité d\'une variable aléatoire $X$ est donnée ci-dessous.\n\n'
               + table_bernoulli('{{eval:q/100;d}}', '{{eval:(100-q)/100;d}}')
               + '\n\n$X$ suit une loi de Bernoulli. ' + FRACTION + '\n\nSon paramètre est $p=?$',
               [case('{{eval:(100-q)/100}}')],
               [var('q', '5..95')],
               ['Le paramètre d\'une loi de Bernoulli est la probabilité que $X$ vaille $1$.',
                '$p=P(X=1)=' + couleur('{{eval:(100-q)/100;d}}') + '$.'],
               ['q != 50'])],
    [spec('0 et 1', 0, '0', 'correct'),
     spec('Erreur : 0 et p', 0, '1', 'incorrect'),
     spec('P(X=1) et P(X=0)', 1, ['0,3', '0,7'], 'correct', {'a': 30}),
     spec('Erreur : inversées', 1, ['0,7', '0,3'], 'incorrect', {'a': 30}),
     spec('Paramètre', 2, '0', 'correct', {'t': 72}),
     spec('Erreur : 1 − p', 2, '1', 'incorrect', {'t': 72}),
     spec('p = P(X = 1)', 3, '0,65', 'correct', {'q': 35}),
     spec('Erreur : P(X = 0)', 3, '0,35', 'incorrect', {'q': 35})],
    cours=True)))

# ---------------------------------------------------------------------------------------------
# P3 — espérance d'une loi de Bernoulli, 1TECHNO-136
# ---------------------------------------------------------------------------------------------

ESP = 'Si $X$ suit la loi de Bernoulli de paramètre $p$, alors $E(X)=0\\times(1-p)+1\\times p=p$.'

MODELES.append(('P3-esperance-loi-de-bernoulli', modele(
    'Espérance d\'une loi de Bernoulli', '1TECHNO-136',
    'E(X) = p pour une loi de Bernoulli : formule, paramètre donné, en contexte, d\'après le tableau de la loi',
    1,
    [choix('La variable aléatoire $X$ suit la loi de Bernoulli de paramètre $p$.\n\nSon espérance est…',
           '$E(X)=p$',
           ['$E(X)=1-p$', '$E(X)=\\dfrac{1}{2}$', '$E(X)=1$'],
           [ESP, 'Donc $' + couleur('E(X)=p') + '$.']),
     variation('La variable aléatoire $X$ suit la loi de Bernoulli de paramètre $p={{eval:a/100;d}}$.\n\n'
               + FRACTION + '\n\n$E(X)=?$',
               [case('{{eval:a/100}}')],
               [var('a', '5..95')],
               [ESP, '$E(X)=' + couleur('{{eval:a/100;d}}') + '$.'],
               ['a != 50']),
     variation('Dans une production, ${{t}}\\,\\%$ des pièces sont défectueuses. On prélève une pièce au hasard ;'
               ' $X$ vaut $1$ si la pièce est défectueuse, $0$ sinon.\n\n' + FRACTION + '\n\n$E(X)=?$',
               [case('{{eval:t/100}}')],
               [var('t', '2..15')],
               ['$X$ suit la loi de Bernoulli de paramètre $p={{eval:t/100;d}}$ (probabilité que la pièce soit'
                ' défectueuse).', ESP, '$E(X)=' + couleur('{{eval:t/100;d}}') + '$.']),
     variation('La loi de probabilité d\'une variable aléatoire $X$ est donnée ci-dessous.\n\n'
               + table_bernoulli('{{eval:q/100;d}}', '{{eval:(100-q)/100;d}}')
               + '\n\n' + FRACTION + '\n\n$E(X)=?$',
               [case('{{eval:(100-q)/100}}')],
               [var('q', '5..95')],
               ['$E(X)=0\\times{{eval:q/100;d}}+1\\times{{eval:(100-q)/100;d}}='
                + couleur('{{eval:(100-q)/100;d}}') + '$.',
                'C\'est le paramètre $p=P(X=1)$ de cette loi de Bernoulli.'],
               ['q != 50'])],
    [spec('E(X) = p', 0, '0', 'correct'),
     spec('Erreur : 1 − p', 0, '1', 'incorrect'),
     spec('Paramètre donné', 1, '0,42', 'correct', {'a': 42}),
     spec('Erreur : 1 − p', 1, '0,58', 'incorrect', {'a': 42}),
     spec('Contexte', 2, '0,06', 'correct', {'t': 6}),
     spec('Erreur : pourcentage brut', 2, '6', 'incorrect', {'t': 6}),
     spec('Tableau', 3, '0,8', 'correct', {'q': 20}),
     spec('Erreur : P(X = 0)', 3, '0,2', 'incorrect', {'q': 20})])))

# ---------------------------------------------------------------------------------------------
# P4 — calculer P(X = a), P(X ⩽ a) : 1TECHNO-137, jumeau de 97b3a376
# ---------------------------------------------------------------------------------------------

# v1 et v2 de 97b3a376 (prod, lues le 2026-11-18), reprises telles quelles : urne et dé
REPRISES_97B3A376 = json.loads(r'''
[{"blanks": [{"expectedAnswer": "{{eval:n/(r+q+n)}}"}, {"expectedAnswer": "{{eval:(r+q)/(r+q+n)}}"}], "statement": "Une urne contient ${{r}}$ boules rouges, ${{q}}$ boules bleues et ${{n}}$ boules vertes, indiscernables au toucher. Un joueur tire une boule au hasard. Il gagne ${{g}}$ euros si elle est rouge, ${{h}}$ euros si elle est bleue, et il perd ${{m}}$ euros si elle est verte. On note $X$ le gain algébrique du joueur, en euros.\n\nRéponds par une fraction irréductible ou par un nombre décimal exact.\n\n$P(X=-{{m}})=?$\n\n$P(X>0)=?$", "variables": [{"name": "r", "expression": "2..8"}, {"name": "q", "expression": "2..8"}, {"name": "n", "expression": "2..8"}, {"name": "g", "expression": "2..10"}, {"name": "h", "expression": "1..5"}, {"name": "m", "expression": "2..6"}], "conditions": ["g > h", "r != q"], "correction": {"steps": ["L'urne contient ${{r}}+{{q}}+{{n}}={{eval:r+q+n}}$ boules, toutes ont la même probabilité d'être tirées.", "$\\{X=-{{m}}\\}$ : le joueur perd ${{m}}$ euros, donc la boule est verte. $P(X=-{{m}})={{if:gcd(n,r+q+n) > 1|\\dfrac{ {{n}} }{ {{eval:r+q+n}} }=}}\\textcolor{{{color:primary.0}}}{ {{eval:n/(r+q+n)}} }$.", "$\\{X>0\\}$ : le joueur gagne de l'argent, donc la boule est rouge ou bleue. $P(X>0)=P(X={{g}})+P(X={{h}})=\\dfrac{ {{r}} }{ {{eval:r+q+n}} }+\\dfrac{ {{q}} }{ {{eval:r+q+n}} }=\\textcolor{{{color:primary.0}}}{ {{eval:(r+q)/(r+q+n)}} }$."]}}, {"blanks": [{"expectedAnswer": "{{eval:k/f}}"}, {"expectedAnswer": "{{eval:(f-k)/f}}"}], "statement": "On lance un dé équilibré à ${{f}}$ faces, numérotées de $1$ à ${{f}}$. Si le numéro obtenu est inférieur ou égal à ${{k}}$, on gagne ${{g}}$ euros ; sinon, on perd ${{m}}$ euros. On note $X$ le gain algébrique, en euros.\n\nRéponds par une fraction irréductible ou par un nombre décimal exact.\n\n$P(X={{g}})=?$\n\n$P(X=-{{m}})=?$", "variables": [{"name": "f", "expression": "8|10|12|20"}, {"name": "k", "expression": "2..18"}, {"name": "g", "expression": "2..10"}, {"name": "m", "expression": "2..5"}], "conditions": ["k <= f-2", "2*k != f"], "correction": {"steps": ["Le dé est équilibré : chacune des ${{f}}$ faces a la probabilité $\\dfrac{1}{ {{f}} }$ d'apparaître.", "$\\{X={{g}}\\}$ : le numéro est l'un des ${{k}}$ numéros de $1$ à ${{k}}$. $P(X={{g}})={{if:gcd(k,f) > 1|\\dfrac{ {{k}} }{ {{f}} }=}}\\textcolor{{{color:primary.0}}}{ {{eval:k/f}} }$.", "$\\{X=-{{m}}\\}$ : le numéro est l'un des ${{f}}-{{k}}={{eval:f-k}}$ autres. $P(X=-{{m}})={{if:gcd(f-k,f) > 1|\\dfrac{ {{eval:f-k}} }{ {{f}} }=}}\\textcolor{{{color:primary.0}}}{ {{eval:(f-k)/f}} }$ (ou $1-P(X={{g}})$)."]}}]
''')

VALEURS = ['{{u}}', '{{eval:u+s}}', '{{eval:u+s+t}}', '{{eval:u+s+t+w}}']
PROBAS = ['{{eval:a/20;d}}', '{{eval:b/20;d}}', '{{eval:c/20;d}}', '{{eval:d/20;d}}']
TABLE_LOI = ('| $x_k$ | ' + ' | '.join('$' + v + '$' for v in VALEURS) + ' |\n|---|---|---|---|---|\n'
             '| $P(X=x_k)$ | ' + ' | '.join('$' + p + '$' for p in PROBAS) + ' |')
VARS_LOI = [var('u', '-3..2'), var('s', '1..3'), var('t', '1..3'), var('w', '1..3'),
            var('a', '1..8'), var('b', '1..8'), var('c', '1..8'), var('d', 'eval:20-a-b-c')]
COND_LOI = ['d >= 1']
INTRO_LOI = 'La loi de probabilité d\'une variable aléatoire $X$ est donnée dans le tableau ci-dessous.\n\n'

MODELES.append(('P4-calculer-p-x-egal-a-p-x-inferieur-a', modele(
    'Calculer P(X = a) et P(X ⩽ a)', '1TECHNO-137',
    'P(X = a), P(X ⩽ a) et P(X > a) par le contraire, d\'après le tableau de la loi ou un énoncé (urne, dé)',
    2,
    [variation(INTRO_LOI + TABLE_LOI + '\n\n' + FRACTION + '\n\n$P(X={{eval:u+s+t}})=?$\n\n'
               '$P(X\\leqslant {{eval:u+s}})=?$',
               [case('{{eval:c/20}}'), case('{{eval:(a+b)/20}}')],
               VARS_LOI,
               ['$P(X={{eval:u+s+t}})$ se lit sous la valeur ${{eval:u+s+t}}$ : $P(X={{eval:u+s+t}})='
                + couleur('{{eval:c/20;d}}') + '$.',
                '$\\{X\\leqslant {{eval:u+s}}\\}$ regroupe les valeurs ${{u}}$ et ${{eval:u+s}}$ : '
                '$P(X\\leqslant {{eval:u+s}})={{eval:a/20;d}}+{{eval:b/20;d}}=' + couleur('{{eval:(a+b)/20;d}}')
                + '$.'],
               COND_LOI),
     variation(INTRO_LOI + TABLE_LOI + '\n\n' + FRACTION + '\n\n$P(X\\leqslant {{eval:u+s+t}})=?$\n\n'
               '$P(X>{{eval:u+s+t}})=?$',
               [case('{{eval:(a+b+c)/20}}'), case('{{eval:d/20}}')],
               VARS_LOI,
               ['$P(X\\leqslant {{eval:u+s+t}})={{eval:a/20;d}}+{{eval:b/20;d}}+{{eval:c/20;d}}='
                + couleur('{{eval:(a+b+c)/20;d}}') + '$.',
                '$\\{X>{{eval:u+s+t}}\\}$ est l\'évènement **contraire** de $\\{X\\leqslant {{eval:u+s+t}}\\}$ : '
                '$P(X>{{eval:u+s+t}})=1-{{eval:(a+b+c)/20;d}}=' + couleur('{{eval:d/20;d}}') + '$.'],
               COND_LOI),
     variation(INTRO_LOI + TABLE_LOI + '\n\n' + FRACTION + '\n\n$P(X>{{u}})=?$',
               [case('{{eval:(b+c+d)/20}}')],
               VARS_LOI,
               ['$\\{X>{{u}}\\}$ est l\'évènement **contraire** de $\\{X\\leqslant {{u}}\\}=\\{X={{u}}\\}$.',
                '$P(X>{{u}})=1-P(X={{u}})=1-{{eval:a/20;d}}=' + couleur('{{eval:(b+c+d)/20;d}}') + '$.'],
               COND_LOI)] + REPRISES_97B3A376,
    [spec('P(X = x3), P(X ⩽ x2)', 0, ['0,25', '0,45'], 'correct',
          {'u': 0, 's': 1, 't': 1, 'w': 1, 'a': 4, 'b': 5, 'c': 5}),
     spec('Erreur : P(X ⩽ x2) = P(X = x2)', 0, ['0,25', '0,25'], 'incorrect',
          {'u': 0, 's': 1, 't': 1, 'w': 1, 'a': 4, 'b': 5, 'c': 5}),
     spec('P(X ⩽ x3), P(X > x3)', 1, ['0,7', '0,3'], 'correct',
          {'u': 1, 's': 2, 't': 1, 'w': 3, 'a': 3, 'b': 6, 'c': 5}),
     spec('Erreur : P(X > x3) oublie la dernière', 1, ['0,7', '0'], 'incorrect',
          {'u': 1, 's': 2, 't': 1, 'w': 3, 'a': 3, 'b': 6, 'c': 5}),
     spec('Contraire', 2, '0,85', 'correct', {'u': -2, 's': 1, 't': 2, 'w': 1, 'a': 3, 'b': 6, 'c': 5}),
     spec('Erreur : P(X = u)', 2, '0,15', 'incorrect', {'u': -2, 's': 1, 't': 2, 'w': 1, 'a': 3, 'b': 6, 'c': 5}),
     spec('Urne', 3, ['\\frac{1}{4}', '\\frac{3}{4}'], 'correct', {'r': 4, 'q': 2, 'n': 2, 'g': 5, 'h': 2, 'm': 3}),
     spec('Erreur urne', 3, ['\\frac{1}{2}', '\\frac{3}{4}'], 'incorrect',
          {'r': 4, 'q': 2, 'n': 2, 'g': 5, 'h': 2, 'm': 3}),
     spec('Dé', 4, ['0,3', '0,7'], 'correct', {'f': 10, 'k': 3, 'g': 4, 'm': 2}),
     spec('Erreur dé', 4, ['0,7', '0,3'], 'incorrect', {'f': 10, 'k': 3, 'g': 4, 'm': 2})])))

# ---------------------------------------------------------------------------------------------
# P5 — tableau croisé d'après des données brutes, 1TECHNO-013
# ---------------------------------------------------------------------------------------------

N_IND = 12


def p5(contexte, col1, crit1, oui1, non1, crit2, oui2, non2, masques, cases, bonnes):
    """Données brutes : chaque individu i a x_i = 1 (oui1) ou 0 (non1) et y_i = 1 (oui2) ou 0 (non2)."""
    vars_ = []
    for i in range(1, N_IND + 1):
        vars_ += [var(f'x{i}', '0|1'), var(f'y{i}', '0|1')]
    somme = lambda f: '+'.join(f(i) for i in range(1, N_IND + 1))
    vars_ += [var('oo', 'eval:' + somme(lambda i: f'x{i}*y{i}')),
              var('on', 'eval:' + somme(lambda i: f'x{i}*(1-y{i})')),
              var('no', 'eval:' + somme(lambda i: f'(1-x{i})*y{i}')),
              var('nn', 'eval:' + somme(lambda i: f'(1-x{i})*(1-y{i})'))]
    lignes = ''.join(f'| {i} | {{{{if:x{i} == 1|{oui1}|{non1}}}}} | {{{{if:y{i} == 1|{oui2}|{non2}}}}} |\n'
                     for i in range(1, N_IND + 1))
    brut = f'| {col1} | {crit1} | {crit2} |\n|---|---|---|\n' + lignes
    tableau = ('```tableau-croise\nlignes: ' + oui1 + ' ; ' + non1 + '\ncolonnes: ' + oui2 + ' ; ' + non2 + '\n'
               + oui1 + ' = {{oo}} ; {{on}}\n' + non1 + ' = {{no}} ; {{nn}}\ncoin: ' + crit1 + ' \\ ' + crit2
               + '\n')
    enonce = (contexte + '\n\n' + brut + '\nOn range ces données dans le tableau croisé ci-dessous.\n\n'
              + tableau + 'masquer: ' + masques + '\n```\n\nComplète les cases cachées.\n\n'
              + '\n\n'.join(c + ' : $?$' for c, _ in cases))
    steps = ['On compte, ligne par ligne des données, les individus de chaque case ; chaque total est la **somme**'
             ' de sa ligne ou de sa colonne.',
             ' ; '.join(c + ' : $' + couleur(v) + '$' for c, v in cases) + '.',
             tableau + '```']
    return variation(enonce, [case(v) for _, v in cases], vars_, steps,
                     ['oo >= 1', 'on >= 1', 'no >= 1', 'nn >= 1']), bonnes


V1, _ = p5('Voici le sexe et le régime de $12$ élèves d\'une classe.', 'Élève', 'Sexe', 'Fille', 'Garçon',
           'Régime', 'Externe', 'Demi-pensionnaire',
           'Fille/Externe ; Fille/Demi-pensionnaire ; Garçon/Externe ; Garçon/Demi-pensionnaire',
           [('Filles externes', '{{oo}}'), ('Filles demi-pensionnaires', '{{on}}'),
            ('Garçons externes', '{{no}}'), ('Garçons demi-pensionnaires', '{{nn}}')], None)
V2, _ = p5('Dans un club, on a relevé pour $12$ adhérents s\'ils sont majeurs et s\'ils pratiquent la'
           ' compétition.', 'Adhérent', 'Âge', 'Majeur', 'Mineur', 'Compétition', 'Oui', 'Non',
           'Majeur/Oui ; Mineur/Non ; Total/Oui ; Majeur/Total',
           [('Majeurs en compétition', '{{oo}}'), ('Mineurs hors compétition', '{{nn}}'),
            ('Total des adhérents en compétition', '{{eval:oo+no}}'), ('Total des majeurs', '{{eval:oo+on}}')],
           None)
V3, _ = p5('Un magasin a interrogé $12$ clients : ont-ils payé par carte, et ont-ils acheté un article en'
           ' promotion ?', 'Client', 'Paiement', 'Carte', 'Espèces', 'Promotion', 'Oui', 'Non',
           'Carte/Non ; Espèces/Oui ; Total/Non ; Espèces/Total',
           [('Carte, sans promotion', '{{on}}'), ('Espèces, avec promotion', '{{no}}'),
            ('Total sans promotion', '{{eval:on+nn}}'), ('Total en espèces', '{{eval:no+nn}}')], None)

# Données de spec : 12 individus fixés (x, y) → oo = 4, on = 3, no = 2, nn = 3
XY = [(1, 1), (1, 0), (0, 1), (1, 1), (0, 0), (1, 0), (1, 1), (0, 0), (0, 1), (1, 1), (1, 0), (0, 0)]
FIXE = {}
for i, (x, y) in enumerate(XY, start=1):
    FIXE[f'x{i}'] = x
    FIXE[f'y{i}'] = y

MODELES.append(('P5-tableau-croise-donnees-brutes', modele(
    'Tableau croisé d\'après des données brutes', '1TECHNO-013',
    'Compter 12 individus selon deux critères et compléter le tableau croisé (cases et totaux)', 2,
    [V1, V2, V3],
    [spec('Quatre cases', 0, ['4', '3', '2', '3'], 'correct', FIXE),
     spec('Erreur : deux cases échangées', 0, ['3', '4', '2', '3'], 'incorrect', FIXE),
     spec('Cases et totaux', 1, ['4', '3', '6', '7'], 'correct', FIXE),
     spec('Erreur : total de ligne au lieu de colonne', 1, ['4', '3', '7', '7'], 'incorrect', FIXE),
     spec('Cases et totaux', 2, ['3', '2', '6', '5'], 'correct', FIXE),
     spec('Erreur', 2, ['2', '3', '6', '5'], 'incorrect', FIXE)])))

# ---------------------------------------------------------------------------------------------
# Écriture
# ---------------------------------------------------------------------------------------------

os.makedirs(DOSSIER, exist_ok=True)
for nom, m in MODELES:
    m = dict(m)
    m.pop('_point')
    chemin = os.path.join(DOSSIER, nom + '.json')
    ancien_id = None
    if os.path.exists(chemin):
        with open(chemin, encoding='utf-8') as f:
            ancien_id = json.load(f).get('id')
    if ancien_id:
        m = {'id': ancien_id, **m}
    with open(chemin, 'w', encoding='utf-8') as f:
        json.dump(m, f, ensure_ascii=False, indent=1)
        f.write('\n')
print(len(MODELES), 'modèles écrits dans', DOSSIER)
for nom, m in MODELES:
    print(' ', m['_point'], nom)
