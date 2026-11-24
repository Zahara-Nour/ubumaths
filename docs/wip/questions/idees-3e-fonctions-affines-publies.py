"""Ajoute les variations validées aux 3 modèles publiés exportés de prod dans
scripts/questions/idees-3e-fonctions-affines-publies/ (chantier idees-3e-fonctions-affines).

Phase 0 validée par David le 2026-11-24 (« je suis tes recos ») : fiches F1 à F3 du journal
(docs/archive/wip/idees-3e-fonctions-affines/idees-3e-fonctions-affines-progress.md, § Phase 0), et Q2 = oui (antécédent
fractionnaire en 3e). Les variations s'ajoutent À LA FIN (les réponses des élèves gardent
l'indice de leur variation) ; la migration de contenu est générée par
scripts/questions/migration-contenu.ts. Seuls `variations` et `testSpecs` changent : les
`options` des trois modèles jugent aussi les variations publiées, on n'y touche pas.

Le script repart du contenu de prod (variations et specs d'origine, comptées dans ORIGINE) :
le relancer réécrit les ajouts sans les doubler.

Décisions et pièges du lot :
- 15ddcc75 (F1) : erreurs prévues « b oublié » (a·c), « a + x au lieu de a × x » (a + c + b),
  « signe de b perdu » (a·c − b) ; la v3 (demis) ajoute « dénominateur oublié » (k·c + b),
  l'erreur propre à la fraction. L'erreur « ax oublié (b seul) » de la fiche n'est pas prise :
  ce n'est pas un calcul d'élève qu'on voit, et elle serait sa propre spec sans message utile.
  v3 : k impair (k/2 jamais entier), x = 2m pair : l'image k·m + b est entière ; l'erreur
  « a + x » y donne un demi-entier, jamais égal aux autres. Coefficient écrit
  `{{if:sg<0|-|}}\\dfrac{kk}{2}`, signe hors de la fraction.
- 7c7b7593 (F2) : v5 a(x + b) + c, antécédent s entier (k = a(s + b) + c). Les conditions
  comparent les erreurs prévues multipliées par a (entiers : pas d'égalité de flottants).
  v6 ax + b, antécédent (k − b)/a non entier : condition « a ne divise pas k − b » par `floor`.
  Le juge note déjà « forme non optimale » (`reducedFractions`) une fraction non simplifiée, sans
  `requiredForm` (comme la v4 d'origine, spec `\\frac{12}{3}`) : pas de `requiredForm` ajouté ;
  la consigne demande la fraction irréductible, et un décimal est refusé (`bad_form`, pas
  d'`acceptDecimal`), ce que la consigne dit aussi. |k − b| ≠ 1 : sinon « quotient inversé »
  a/(k − b) et « produit » a(k − b) auraient la même valeur.
- 45247528 (F3) : f(n) = a·n donné. v4 f(x) = ? (erreurs x/a, n·x, (a·n)·x) ; v5 f(m) = ?
  (m de ±2 à ±9, m ≠ n ; erreurs a·n + m, m/a, n·m) ; v6 antécédent de k = a·s (erreurs
  « image » a·k, « quotient inversé » 1/s, « raisonnement additif » n + k − a·n). Dans la v6,
  « multiplier au lieu de diviser » donne a·k, la même valeur que l'image : une seule erreur.
- Les messages d'erreur sont écrits sous leur forme réécrite par le moteur
  (`$f(x)=…$` → `$f\\left( x \\right) = …$`, `$ax$` → `$a x$`) : relus sur `question:specs`.

Usage : python3 docs/wip/questions/idees-3e-fonctions-affines-publies.py scripts/questions/idees-3e-fonctions-affines-publies
"""
import json
import os
import sys

DOSSIER = sys.argv[1]

P0 = '\\textcolor{{{color:primary.0}}}'

# id court → (variations, specs) d'origine en prod (export du 2026-11-24)
ORIGINE = {'15ddcc75': (1, 4), '7c7b7593': (5, 25), '45247528': (4, 10)}


def spec(desc, vi, variables_, status, answers, message=None, violations=None):
    expected = {'status': status}
    if violations:
        expected['constraintViolations'] = violations
    if message is not None:
        expected['expectedErrorMessage'] = message
    return {'description': desc, 'variationIndex': vi,
            'variables': {k: str(v) for k, v in variables_.items()},
            'expected': expected, 'answers': answers}


def var(nom, expression):
    return {'name': nom, 'expression': expression}


def erreur(answer, message, label):
    return {'answer': answer, 'message': message, 'label': label}


def case(attendue, erreurs=None, kind=None):
    c = {}
    if kind:
        c['answerKind'] = kind
    c['expectedAnswer'] = attendue
    if erreurs:
        c['expectedErrors'] = erreurs
    return c


def variation(statement, variables, blanks, steps, hint, conditions=None):
    v = {'statement': statement, 'variables': variables}
    if conditions:
        v['conditions'] = conditions
    v.update({'blanks': blanks, 'correction': {'steps': steps}, 'hint': hint})
    return v


def couleur(contenu):
    return P0 + '{' + contenu + '}'


def tous_distincts(valeurs):
    return [f'{a} != {b}' for i, a in enumerate(valeurs) for b in valeurs[i + 1:]]


def ajouter(court, variations, specs):
    chemin = os.path.join(DOSSIER, court + '.json')
    with open(chemin, encoding='utf-8') as f:
        m = json.load(f)
    nv, ns = ORIGINE[court]
    m['variations'] = m['variations'][:nv]
    m['testSpecs'] = m['testSpecs'][:ns]
    for s in specs:
        s['variationIndex'] += nv
    m['variations'] += variations
    m['testSpecs'] += specs
    with open(chemin, 'w', encoding='utf-8') as f:
        json.dump(m, f, ensure_ascii=False, indent='\t')
        f.write('\n')
    print(f'{court} : {nv} + {len(variations)} variations, {ns} + {len(specs)} specs')


def sub(texte, **valeurs):
    """Message résolu pour une spec : {{nom}} → valeur."""
    for k, v in valeurs.items():
        texte = texte.replace('{{' + k + '}}', str(v))
    return texte


# =============================================================================================
# 15ddcc75 — 3-066, image par une fonction affine. F1 : (v1) f(x) = b + ax ;
# (v2) f : x ↦ ax + b ; (v3) f(x) = (k/2)x + b, x pair.
# =============================================================================================

E_F1_B = ('Tu as oublié le terme constant ${{b}}$ : après le produit, il faut encore '
          'l\'ajouter.')
E_F1_PLUS = ('${{a}} x$, c\'est ${{a}}\\times x$ : on **multiplie** ${{a}}$ par ${{c}}$, on ne '
             'les additionne pas.')
E_F1_SIGNE = 'Garde le signe du terme constant : on ajoute ${{b}}$ tel qu\'il est écrit.'
HINT_F1 = ('Remplace $x$ par ${{c}}$, entre parenthèses s\'il est négatif ; fais d\'abord la '
           'multiplication, puis l\'addition.')
VARS_F1 = [var('a', '2..9;±'), var('b', '1..9;±'), var('c', '-9..9')]
COND_F1 = ['c != 0'] + tous_distincts(['a*c+b', 'a*c', 'a+c+b', 'a*c-b'])


def erreurs_f1():
    return [
        erreur('{{eval:a*c}}', E_F1_B, 'Terme constant oublié'),
        erreur('{{eval:a+c+b}}', E_F1_PLUS, 'a + x au lieu de a × x'),
        erreur('{{eval:a*c-b}}', E_F1_SIGNE, 'Signe du terme constant perdu'),
    ]


F1_A = variation(
    'Quelle est l\'image de ${{c}}$ par la fonction affine :\n\n$$f(x)={{b}}{{a;+}}x$$\n\n'
    '$f({{c}})=?$',
    VARS_F1,
    [case('{{eval:a*c+b}}', erreurs_f1())],
    [
        'On remplace $x$ par ${{c}}$, puis on calcule le produit avant la somme :',
        '$f({{c}})={{b}}{{a;+}} \\times {{eval:c;()}}={{b}}{{eval:a*c;+}}='
        + couleur('{{eval:a*c+b}}') + '$.',
    ],
    HINT_F1,
    COND_F1,
)

F1_B = variation(
    'On considère la fonction affine $f : x \\mapsto {{a}}x{{eval:b;+}}$.\n\nQuelle est l\'image '
    'de ${{c}}$ par $f$ ?\n\n$f({{c}})=?$',
    VARS_F1,
    [case('{{eval:a*c+b}}', erreurs_f1())],
    [
        '$f : x \\mapsto {{a}}x{{eval:b;+}}$ veut dire $f(x)={{a}}x{{eval:b;+}}$ : l\'image de '
        '${{c}}$ est $f({{c}})$.',
        '$f({{c}})={{a}} \\times {{eval:c;()}}{{eval:b;+}}={{eval:a*c}}{{eval:b;+}}='
        + couleur('{{eval:a*c+b}}') + '$.',
    ],
    HINT_F1,
    COND_F1,
)

COEF_DEMI = '{{if:sg<0|-|}}\\dfrac{ {{kk}} }{2}'
E_F1_DEMI = ('Tu as multiplié par ${{kk}}$ sans diviser par $2$ : le coefficient est une '
             '**fraction**.')
E_F1_PLUS_DEMI = ('Le coefficient **multiplie** $x$ : on calcule $' + COEF_DEMI + ' \\times '
                  '{{eval:c;()}}$, on n\'additionne pas.')
F1_C = variation(
    'Quelle est l\'image de ${{c}}$ par la fonction affine :\n\n$$f(x)=' + COEF_DEMI
    + 'x{{eval:b;+}}$$\n\n$f({{c}})=?$',
    [var('sg', '1|-1'), var('kk', '1|3|5|7'), var('k', 'eval:sg*kk'), var('m', '1..4;±'),
     var('c', 'eval:2*m'), var('b', '1..9;±')],
    [case('{{eval:k*m+b}}', [
        erreur('{{eval:k*m}}', E_F1_B, 'Terme constant oublié'),
        erreur('{{eval:k/2+c+b}}', E_F1_PLUS_DEMI, 'a + x au lieu de a × x'),
        erreur('{{eval:k*m-b}}', E_F1_SIGNE, 'Signe du terme constant perdu'),
        erreur('{{eval:k*c+b}}', E_F1_DEMI, 'Dénominateur 2 oublié'),
    ])],
    [
        'Multiplier par $' + COEF_DEMI + '$, c\'est multiplier par ${{k}}$, puis diviser par $2$ :',
        '$' + COEF_DEMI + ' \\times {{eval:c;()}}=\\dfrac{ {{eval:k*c}} }{2}={{eval:k*m}}$',
        '$f({{c}})={{eval:k*m}}{{eval:b;+}}=' + couleur('{{eval:k*m+b}}') + '$.',
    ],
    'Pour multiplier ${{c}}$ par une fraction de dénominateur $2$, multiplie par son numérateur '
    'et divise par $2$ ; ajoute ensuite le terme constant.',
    tous_distincts(['k*m+b', 'k*m', 'k*m-b', 'k*c+b']),
)

V1 = {'a': -3, 'b': 4, 'c': -5}       # f(x) = 4 − 3x, f(−5) = 19
V2 = {'a': 6, 'b': -8, 'c': 3}        # f : x ↦ 6x − 8, f(3) = 10
V3 = {'sg': -1, 'kk': 3, 'm': 2, 'b': 5}   # f(x) = −3/2 x + 5, f(4) = −1

SPECS_15 = [
    spec('F1a : 4 − 3x, f(−5) = 19', 0, V1, 'correct', ['19']),
    spec('F1a : terme constant oublié', 0, V1, 'incorrect', ['15'], sub(E_F1_B, b=4)),
    spec('F1a : a + x', 0, V1, 'incorrect', ['-4'], sub(E_F1_PLUS, a=-3, c=-5)),
    spec('F1a : signe du terme constant', 0, V1, 'incorrect', ['11'], sub(E_F1_SIGNE, b=4)),
    spec('F1a : 7 − 2x, f(3) = 1', 0, {'a': -2, 'b': 7, 'c': 3}, 'correct', ['1']),
    spec('F1b : x ↦ 6x − 8, f(3) = 10', 1, V2, 'correct', ['10']),
    spec('F1b : terme constant oublié', 1, V2, 'incorrect', ['18'], sub(E_F1_B, b=-8)),
    spec('F1b : a + x', 1, V2, 'incorrect', ['1'], sub(E_F1_PLUS, a=6, c=3)),
    spec('F1b : signe du terme constant', 1, V2, 'incorrect', ['26'], sub(E_F1_SIGNE, b=-8)),
    spec('F1c : −3/2 x + 5, f(4) = −1', 2, V3, 'correct', ['-1']),
    spec('F1c : terme constant oublié', 2, V3, 'incorrect', ['-6'], sub(E_F1_B, b=5)),
    spec('F1c : signe du terme constant', 2, V3, 'incorrect', ['-11'], sub(E_F1_SIGNE, b=5)),
    spec('F1c : dénominateur oublié', 2, V3, 'incorrect', ['-7'], sub(E_F1_DEMI, kk=3)),
    spec('F1c : a + x', 2, V3, 'incorrect', ['\\frac{15}{2}'],
         'Le coefficient **multiplie** $x$ : on calcule $-\\dfrac{ 3 }{2} \\times 4$, on '
         'n\'additionne pas.'),
    spec('F1c : 5/2 x − 3, f(−6) = −18', 2, {'sg': 1, 'kk': 5, 'm': -3, 'b': -3}, 'correct',
         ['-18']),
]

ajouter('15ddcc75', [F1_A, F1_B, F1_C], SPECS_15)

# =============================================================================================
# 7c7b7593 — 3-040, antécédent par le calcul. F2 : (v5) a(x + b) + c, antécédent entier ;
# (v6) ax + b, antécédent fractionnaire non entier, fraction irréductible.
# =============================================================================================

X = var('x', 'x|x')
HINT_ANTE = ('L\'antécédent est le nombre $x$ tel que $f(x)={{k}}$ : écris l\'équation, puis '
             'isole $x$ étape par étape.')
E_IMAGE = ('Tu as calculé l\'image de ${{k}}$ : on cherche l\'antécédent, le nombre $x$ tel que '
           '$f\\left( x \\right) = {{k}}$.')
E_CONST = ('Attention au terme constant : pour isoler le terme en $x$, on fait l\'opération '
           'inverse sur les deux membres de l\'équation.')
E_F2_DISTRI = ('Le facteur ${{a}}$ multiplie **toute** la parenthèse, le nombre ${{b}}$ '
               'compris : développe, ou divise d\'abord par ${{a}}$.')
E_F2_SIGNE_B = ('Attention au nombre ${{b}}$ de la parenthèse : pour isoler $x$, on fait '
                'l\'opération inverse sur les deux membres de l\'équation.')

# Valeurs × a (entiers) : bonne réponse, distributivité oubliée, signe de b, signe de c, image.
A_F2A = ['a*s', 'k-b-c', 'k-c+a*b', 'k+c-a*b', 'a*(a*(k+b)+c)']
F2_A = variation(
    'On considère la fonction $f$ définie par $f(x)={{a}}(x{{b;+}}){{c;+}}$.\n\nCalcule '
    'l\'antécédent de ${{k}}$ par $f$.\n\nL\'antécédent de ${{k}}$ est $?$.',
    [X, var('a', '2..5;±'), var('b', '1..6;±'), var('c', '1..9;±'), var('s', '1..9;±'),
     var('k', 'eval:a*(s+b)+c')],
    [case('{{s}}', [
        erreur('{{eval:(k-b-c)/a}}', E_F2_DISTRI, 'Distributivité oubliée'),
        erreur('{{eval:(k-c)/a+b}}', E_F2_SIGNE_B, 'Signe du nombre de la parenthèse'),
        erreur('{{eval:(k+c)/a-b}}', E_CONST, 'Terme constant du mauvais côté'),
        erreur('{{eval:a*(k+b)+c}}', E_IMAGE, 'Image au lieu de l\'antécédent'),
    ])],
    [
        'On cherche le nombre $x$ tel que $f(x)={{k}}$. On isole d\'abord la parenthèse :',
        '$$\\begin{align}{{a}}(x{{b;+}}){{c;+}}&={{k}}\\\\{{a}}(x{{b;+}})&={{k}}{{eval:-c;+}}\\\\'
        '{{a}}(x{{b;+}})&={{eval:k-c}}\\\\x{{b;+}}&=\\frac{ {{eval:k-c}} }{ {{a}} }\\\\'
        'x{{b;+}}&={{eval:s+b}}\\\\x&={{eval:s+b}}{{eval:-b;+}}\\\\x&=' + couleur('{{s}}')
        + '\\end{align}$$',
        'Vérification : $f({{s}})={{a}}\\times({{s}}{{b;+}}){{c;+}}={{k}}$.',
    ],
    HINT_ANTE + ' Commence par ce qui est le plus à l\'extérieur : le terme constant, puis le '
    'facteur ${{a}}$.',
    ['s != k', 's+b != 0'] + tous_distincts(A_F2A),
)

E_F2_INV = ('Tu as divisé dans le mauvais sens : de $A x = B$, on tire $x = \\dfrac{B}{A}$.')
E_F2_PROD = ('${{a}} x$, c\'est ${{a}}\\times x$ : pour retrouver $x$, on divise par ${{a}}$, on '
             'ne multiplie pas.')
F2_B = variation(
    'On considère la fonction $f$ définie par $f(x)={{eval:a*x+b}}$.\n\nCalcule l\'antécédent de '
    '${{k}}$ par $f$. Donne-le sous forme d\'une fraction irréductible.\n\nL\'antécédent de '
    '${{k}}$ est $?$.',
    [X, var('a', '2..9;±'), var('b', '1..9;±'), var('k', '1..15;±')],
    [case('{{eval:(k-b)/a}}', [
        erreur('{{eval:a/(k-b)}}', E_F2_INV, 'Quotient inversé'),
        erreur('{{eval:a*(k-b)}}', E_F2_PROD, 'Produit au lieu du quotient'),
        erreur('{{eval:(k+b)/a}}', E_CONST, 'Terme constant du mauvais côté'),
        erreur('{{eval:a*k+b}}', E_IMAGE, 'Image au lieu de l\'antécédent'),
    ])],
    [
        'On cherche le nombre $x$ tel que $f(x)={{k}}$ :',
        '$$\\begin{align}{{eval:a*x+b}}&={{k}}\\\\{{eval:a*x}}&={{k}}{{eval:-b;+}}\\\\'
        '{{eval:a*x}}&={{eval:k-b}}\\\\x&=\\frac{ {{eval:k-b}} }{ {{a}} }\\\\x&='
        + couleur('{{eval:(k-b)/a}}') + '\\end{align}$$',
        'La division ne tombe pas juste : l\'antécédent s\'écrit en fraction, simplifiée autant '
        'que possible.',
    ],
    HINT_ANTE + ' Si la division ne tombe pas juste, garde le résultat en fraction.',
    ['k-b-a*floor((k-b)/a) != 0', '(k-b)*(k-b) != 1', 'a*a != (k+b)*(k-b)',
     'a != (a*k+b)*(k-b)', 'a*a*(k-b) != k+b', 'k+b != a*(a*k+b)'],
)

V5 = {'a': 3, 'b': -2, 'c': 4, 's': 5}     # 3(x − 2) + 4 = 13 → x = 5
V6 = {'a': 4, 'b': -3, 'k': 7}             # 4x − 3 = 7 → x = 5/2

SPECS_7C = [
    spec('F2a : 3(x − 2) + 4, antécédent de 13 = 5', 0, {**V5, 'k': 13}, 'correct', ['5']),
    spec('F2a : distributivité oubliée (3x − 2 + 4 = 13)', 0, {**V5, 'k': 13}, 'incorrect',
         ['\\frac{11}{3}'], sub(E_F2_DISTRI, a=3, b=-2)),
    spec('F2a : signe de b', 0, {**V5, 'k': 13}, 'incorrect', ['1'], sub(E_F2_SIGNE_B, b=-2)),
    spec('F2a : signe de c', 0, {**V5, 'k': 13}, 'incorrect', ['\\frac{23}{3}'], E_CONST),
    spec('F2a : image', 0, {**V5, 'k': 13}, 'incorrect', ['37'], sub(E_IMAGE, k=13)),
    spec('F2a : −2(x + 5) − 3, antécédent de −11 = −1', 0,
         {'a': -2, 'b': 5, 'c': -3, 's': -1, 'k': -11}, 'correct', ['-1']),
    spec('F2b : 4x − 3, antécédent de 7 = 5/2', 1, V6, 'correct', ['\\frac{5}{2}']),
    spec('F2b : fraction non simplifiée', 1, V6, 'unoptimal_form', ['\\frac{10}{4}'],
         violations=['reducedFractions']),
    spec('F2b : écriture décimale', 1, V6, 'bad_form', ['2{,}5'], violations=['form']),
    spec('F2b : quotient inversé', 1, V6, 'incorrect', ['\\frac{2}{5}'], E_F2_INV),
    spec('F2b : produit au lieu du quotient', 1, V6, 'incorrect', ['40'], sub(E_F2_PROD, a=4)),
    spec('F2b : signe non changé', 1, V6, 'incorrect', ['1'], E_CONST),
    spec('F2b : image', 1, V6, 'incorrect', ['25'], sub(E_IMAGE, k=7)),
    spec('F2b : −3x + 2, antécédent de −5 = 7/3', 1, {'a': -3, 'b': 2, 'k': -5}, 'correct',
         ['\\frac{7}{3}']),
    spec('F2b : antécédent négatif −7/6', 1, {'a': 6, 'b': 1, 'k': -6}, 'correct',
         ['-\\frac{7}{6}']),
]

ajouter('7c7b7593', [F2_A, F2_B], SPECS_7C)

# =============================================================================================
# 45247528 — 3-043, fonction linéaire et proportionnalité. F3 : f(n) = a·n donné ;
# (v4) expression de f(x) ; (v5) f(m) ; (v6) antécédent de k = a·s.
# =============================================================================================

DONNEE = '$f$ est une fonction linéaire telle que $f({{n}})={{eval:(a)*(n)}}$.\n\n'
LINEAIRE = ('$f$ est linéaire : $f(x)=ax$, donc $f(x)$ est **proportionnel** à $x$ et $a$ est le '
            'coefficient de proportionnalité, $a=\\dfrac{f(x)}{x}$.')
CALCUL_A = '$$a = \\dfrac{f({{n}})}{ {{n}} } = \\dfrac{{{eval:(a)*(n)}}}{ {{n}} } = {{a}}$$'
HINT_A = 'Commence par trouver le coefficient $a$ de $f$ à partir de $f({{n}})$.'

E_F3_INV = ('Tu as renversé le rapport : le coefficient est $a=\\dfrac{f(x)}{x}$, l\'image '
            'divisée par le nombre.')
E_F3_N = ('${{n}}$ est le nombre dont on connaît l\'image, pas le coefficient : '
          'calcule $a=\\dfrac{f({{n}})}{ {{n}} }$.')
E_F3_Y = ('${{eval:(a)*(n)}}$ est l\'image de ${{n}}$, pas le coefficient : '
          'divise-la par ${{n}}$.')
F3_A = variation(
    DONNEE + 'Donne l\'expression de $f(x)$.\n\n$f(x)=?$',
    [var('a', '2..9;±'), var('n', '2..6')],
    [case('{{a}}x', [
        erreur('\\frac{x}{ {{a}} }', E_F3_INV, 'Rapport renversé'),
        erreur('{{n}}x', E_F3_N, 'Coefficient pris égal à n'),
        erreur('{{eval:(a)*(n)}}x', E_F3_Y, 'Coefficient pris égal à f(n)'),
    ])],
    [LINEAIRE, CALCUL_A, '$$f(x) = ' + couleur('{{a}}x') + '$$'],
    HINT_A + ' Une fonction linéaire s\'écrit $f(x)=ax$.',
    ['abs(a) != n'],
)

E_F3_ADD = ('$f$ est linéaire : les images sont **proportionnelles** aux nombres, on multiplie '
            'par le coefficient, on n\'ajoute pas.')
E_F3_INV_M = ('Tu as divisé par le coefficient : l\'image s\'obtient en **multipliant** par '
              '$a=\\dfrac{f({{n}})}{ {{n}} }$.')
F3_B = variation(
    DONNEE + 'Calcule $f({{m}})$.\n\n$f({{m}})=?$',
    [var('a', '2..9;±'), var('n', '2..6'), var('m', '2..9;±')],
    [case('{{eval:a*m}}', [
        erreur('{{eval:a*n+m}}', E_F3_ADD, 'f(m) = f(n) + m'),
        erreur('{{eval:m/a}}', E_F3_INV_M, 'Rapport renversé'),
        erreur('{{eval:n*m}}', E_F3_N, 'Coefficient pris égal à n'),
    ])],
    [LINEAIRE, CALCUL_A, '$$f({{m}}) = {{a}} \\times {{eval:m;()}} = ' + couleur('{{eval:a*m}}')
     + '$$'],
    HINT_A,
    ['abs(a) != n', 'm != n', 'a*(m-n) != m', 'a*(a*n+m) != m', 'a*n+m != n*m'],
)

E_F3_ANTE_IMG = ('Tu as calculé l\'image de ${{k}}$ : on cherche le nombre $x$ tel que '
                 '$f\\left( x \\right) = {{k}}$.')
E_F3_ANTE_ADD = ('$f$ est linéaire : les images sont **proportionnelles** aux nombres. On ne '
                 'raisonne pas par différence, on divise par le coefficient.')
F3_C = variation(
    DONNEE + 'Quel nombre a pour image ${{k}}$ par $f$ ?\n\n$x=?$',
    [var('a', '2..9;±'), var('n', '2..6'), var('s', '2..9;±'), var('k', 'eval:a*s')],
    [case('{{s}}', [
        erreur('{{eval:a*k}}', E_F3_ANTE_IMG, 'Image au lieu de l\'antécédent'),
        erreur('{{eval:1/s}}', E_F2_INV, 'Quotient inversé'),
        erreur('{{eval:n+k-a*n}}', E_F3_ANTE_ADD, 'Raisonnement additif'),
    ])],
    [LINEAIRE, CALCUL_A,
     'On cherche le nombre $x$ tel que $f(x)={{k}}$ :',
     '$$\\begin{align}{{a}}x&={{k}}\\\\x&=\\frac{ {{k}} }{ {{a}} }\\\\x&=' + couleur('{{s}}')
     + '\\end{align}$$'],
    HINT_A + ' Cherche ensuite le nombre $x$ tel que $f(x)={{k}}$.',
    ['abs(a) != n', 's != n', 'a*a*s != n+a*s-a*n'],
)

V_F3 = {'a': -3, 'n': 4}      # f(4) = −12, f(x) = −3x

SPECS_45 = [
    spec('F3a : f(4) = −12 → f(x) = −3x', 0, V_F3, 'correct', ['-3x']),
    spec('F3a : −3 × x, forme à améliorer', 0, V_F3, 'unoptimal_form', ['-3\\times x'],
         violations=['products']),
    spec('F3a : rapport renversé x/(−3)', 0, V_F3, 'incorrect', ['-\\frac{x}{3}'], E_F3_INV),
    spec('F3a : coefficient n', 0, V_F3, 'incorrect', ['4x'], sub(E_F3_N, n=4)),
    spec('F3a : coefficient f(n)', 0, V_F3, 'incorrect', ['-12x'], sub(E_F3_Y, n=4).replace('{{eval:(a)*(n)}}', '-12')),
    spec('F3a : f(5) = 35 → 7x', 0, {'a': 7, 'n': 5}, 'correct', ['7x']),
    spec('F3b : f(4) = −12, f(6) = −18', 1, {**V_F3, 'm': 6}, 'correct', ['-18']),
    spec('F3b : f(n) + m', 1, {**V_F3, 'm': 6}, 'incorrect', ['-6'], E_F3_ADD),
    spec('F3b : rapport renversé', 1, {**V_F3, 'm': 6}, 'incorrect', ['-2'], sub(E_F3_INV_M, n=4)),
    spec('F3b : coefficient n', 1, {**V_F3, 'm': 6}, 'incorrect', ['24'], sub(E_F3_N, n=4)),
    spec('F3b : f(2) = 10, f(−7) = −35', 1, {'a': 5, 'n': 2, 'm': -7}, 'correct', ['-35']),
    spec('F3c : f(4) = −12, antécédent de 15 = −5', 2, {**V_F3, 's': -5}, 'correct', ['-5']),
    spec('F3c : image', 2, {**V_F3, 's': -5}, 'incorrect', ['-45'], sub(E_F3_ANTE_IMG, k=15)),
    spec('F3c : quotient inversé', 2, {**V_F3, 's': -5}, 'incorrect', ['-\\frac{1}{5}'],
         E_F2_INV),
    spec('F3c : raisonnement additif', 2, {**V_F3, 's': -5}, 'incorrect', ['31'], E_F3_ANTE_ADD),
    spec('F3c : f(3) = 6, antécédent de 18 = 9', 2, {'a': 2, 'n': 3, 's': 9}, 'correct', ['9']),
]

ajouter('45247528', [F3_A, F3_B, F3_C], SPECS_45)
