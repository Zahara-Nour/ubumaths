"""Ajoute les variations validées aux 9 modèles publiés exportés de prod dans
scripts/questions/idees-1re-second-degre-publies/ (chantier idees-1re-second-degre).

Phase 0 validée par David le 2026-11-22 (« je valide tes recos ») : F8 et F9 (604f83b7), F10
(b09c430a), F11 (9e1d084e, afe51ac4), F12 (aab8e41c, 87140df3), F13 (18e26873, 56b1803f), F14
(a9aece33). Les variations s'ajoutent À LA FIN (les réponses des élèves gardent l'indice de leur
variation) ; la migration de contenu est générée par scripts/questions/migration-contenu.ts.

Le script repart du contenu de prod (variations et specs d'origine, comptées dans ORIGINE) :
le relancer réécrit les ajouts sans les doubler.

Pièges : 18e26873 a `orderIndependent` (cases appariées librement) → aucune erreur prévue
permise ; 604f83b7 et b09c430a n'ont pas `cleanCoefficients`.

Usage : python3 docs/wip/questions/idees-1re-second-degre-publies.py scripts/questions/idees-1re-second-degre-publies
"""
import json
import os
import sys

DOSSIER = sys.argv[1]

PRIMAIRE = '\\textcolor{{{color:primary.0}}}'

# id court → (variations, specs) d'origine en prod (export du 2026-11-22)
ORIGINE = {'604f83b7': (3, 14), 'b09c430a': (4, 15), '9e1d084e': (9, 30), 'afe51ac4': (4, 12),
           'aab8e41c': (3, 9), '87140df3': (2, 27), '18e26873': (2, 10), '56b1803f': (3, 13),
           'a9aece33': (3, 13)}


def spec(desc, vi, variables_, status, answers, message=None):
    expected = {'status': status}
    if message is not None:
        expected['expectedErrorMessage'] = message
    return {'description': desc, 'variationIndex': vi,
            'variables': {k: str(v) for k, v in variables_.items()},
            'expected': expected, 'answers': answers}


def bloc(nom, *lignes):
    return '```' + nom + '\n' + '\n'.join(lignes) + '\n```'


def var(nom, expression):
    return {'name': nom, 'expression': expression}


def erreur(answer, message, label):
    return {'answer': answer, 'message': message, 'label': label}


def case(attendue, erreurs=None, kind=None, forme=None, extra=None):
    c = {'expectedAnswer': attendue}
    if kind:
        c['answerKind'] = kind
    if forme:
        c['requiredForm'] = forme
    if extra:
        c.update(extra)
    if erreurs:
        c['expectedErrors'] = erreurs
    return c


def variation(statement, variables, blanks, steps, hint, conditions=None):
    return {'statement': statement, 'variables': variables, 'conditions': conditions or [],
            'blanks': blanks, 'correction': {'steps': steps}, 'hint': hint}


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
        json.dump(m, f, ensure_ascii=False, indent=2)
        f.write('\n')
    print(f'{court} : {nv} + {len(variations)} variations, {ns} + {len(specs)} specs')


def ens(*vals):
    return '\\{' + ';'.join(vals) + '\\}'


X = var('x', 'x|x')
FACT = {'pattern': 'u*($x+v)*($x+w)'}
CARRE = {'pattern': 'u*($x+v)^2'}
CANO = {'pattern': 'u*($x+v)^2+w'}

# =============================================================================================
# 604f83b7 — Factoriser un trinôme (1SPE-253). F8 : racine double (par Δ), racines
# irrationnelles. F9 : identité remarquable (x − r)², x² − r², facteur commun kx(x + m).
# =============================================================================================

FACTORISE = 'Factorise le polynôme $P(x)={{eval:ax^2+bx+c}}$.\n\n$P(x)=?$'
v604 = []
s604 = []

ERR_DOUBLE_SIGNE = ('La racine double est $x_0=-\\dfrac{b}{2a}={{r}}$ : le facteur est '
                    '$(x{{eval:-r;+}})$, attention au signe.')
ERR_DOUBLE_A = 'N\'oublie pas le coefficient $a={{a}}$ devant le carré.'
v604.append(variation(
    FACTORISE,
    [X, var('a', '2|3|-2|-3'), var('r', '1..5;±'), var('b', 'eval:-2*a*r'), var('c', 'eval:a*r^2')],
    [case('{{a}}(x{{eval:-r;+}})^2', [
        erreur('{{a}}(x{{eval:r;+}})^2', ERR_DOUBLE_SIGNE, 'Signe de la racine'),
        erreur('(x{{eval:-r;+}})^2', ERR_DOUBLE_A, 'Coefficient a oublié'),
    ], forme=CARRE)],
    ['$\\Delta={{eval:b;()}}^2-4\\times{{eval:a;()}}\\times{{eval:c;()}}=0$ : une racine double, '
     '$x_0=-\\dfrac{b}{2a}={{r}}$.',
     'Donc $P(x)=a(x-x_0)^2=' + PRIMAIRE + '{ {{a}}(x{{eval:-r;+}})^2}$.'],
    'Calcule le discriminant : s\'il est nul, $P(x)=a(x-x_0)^2$ avec $x_0=-\\dfrac{b}{2a}$.'))
v = {'a': 2, 'r': -3, 'b': 12, 'c': 18}  # 2x² + 12x + 18 = 2(x + 3)²
s604 += [spec('2x² + 12x + 18', 0, v, 'correct', ['2(x+3)^2']),
         spec('Signe', 0, v, 'incorrect', ['2(x-3)^2'],
              'La racine double est $x_0=-\\dfrac{b}{2a}=-3$ : le facteur est $\\left( x + 3 \\right)$, attention au signe.'),
         spec('a oublié', 0, v, 'incorrect', ['(x+3)^2'], 'N\'oublie pas le coefficient $a = 2$ devant le carré.')]

ERR_IRR_SIGNE = ('Les racines sont ${{h}}\\pm\\sqrt{ {{k}} }$ ; le facteur s\'écrit $x$ moins la '
                 'racine : attention au signe.')
ERR_IRR_2 = ('$\\sqrt{\\Delta}=\\sqrt{ {{eval:4*k}} }=2\\sqrt{ {{k}} }$ se divise aussi par $2a=2$.')
v604.append(variation(
    FACTORISE + '\n\nÉcris les racines en valeur exacte.',
    [X, var('a', '1'), var('h', '1..5;±'), var('k', '2|3|5|6|7'), var('b', 'eval:-2*h'),
     var('c', 'eval:h^2-k')],
    [case('(x{{eval:-h;+}}-\\sqrt{ {{k}} })(x{{eval:-h;+}}+\\sqrt{ {{k}} })', [
        erreur('(x{{eval:h;+}}-\\sqrt{ {{k}} })(x{{eval:h;+}}+\\sqrt{ {{k}} })', ERR_IRR_SIGNE,
               'Signe des racines'),
        erreur('(x{{eval:-h;+}}-2\\sqrt{ {{k}} })(x{{eval:-h;+}}+2\\sqrt{ {{k}} })', ERR_IRR_2,
               'Racine de Δ non divisée'),
    ])],
    ['$\\Delta={{eval:b;()}}^2-4\\times{{eval:c;()}}={{eval:4*k}}>0$ et $\\sqrt{\\Delta}=2\\sqrt{ {{k}} }$ : '
     'les racines sont $x_1={{h}}-\\sqrt{ {{k}} }$ et $x_2={{h}}+\\sqrt{ {{k}} }$.',
     'Donc $P(x)=(x-x_1)(x-x_2)=' + PRIMAIRE
     + '{(x{{eval:-h;+}}+\\sqrt{ {{k}} })(x{{eval:-h;+}}-\\sqrt{ {{k}} })}$.'],
    'Calcule les racines avec le discriminant, puis écris $P(x)=a(x-x_1)(x-x_2)$.'))
v = {'a': 1, 'h': 2, 'k': 3, 'b': -4, 'c': 1}  # x² − 4x + 1
s604 += [spec('x² − 4x + 1', 1, v, 'correct', ['(x-2-\\sqrt{3})(x-2+\\sqrt{3})']),
         spec('Ordre inverse', 1, v, 'correct', ['(x-2+\\sqrt{3})(x-2-\\sqrt{3})']),
         spec('Signe', 1, v, 'incorrect', ['(x+2-\\sqrt{3})(x+2+\\sqrt{3})'],
              'Les racines sont $2\\pm\\sqrt{ 3 }$ ; le facteur s\'écrit $x$ moins la racine : attention au signe.'),
         spec('√Δ non divisé', 1, v, 'incorrect', ['(x-2-2\\sqrt{3})(x-2+2\\sqrt{3})'],
              '$\\sqrt{\\Delta}=\\sqrt{ 12 }=2\\sqrt{ 3 }$ se divise aussi par $2 a = 2$.')]

IDENT_HINT = ('Avant de calculer un discriminant, regarde si tu reconnais une identité '
              'remarquable ou un facteur commun.')
ERR_ID_SIGNE = ('$(x{{eval:r;+}})^2$ se développe en $x^2{{eval:2*r;+}}x+{{eval:r^2}}$ : le signe '
                'du terme en $x$ ne correspond pas.')
ERR_ID_A2B2 = ('$(x{{eval:-r;+}})(x{{eval:r;+}})=x^2-{{eval:r^2}}$ : il manquerait le terme en $x$. '
               'Ici c\'est $(a-b)^2=a^2-2ab+b^2$.')
v604.append(variation(
    'Factorise le polynôme $P(x)={{eval:x^2-2*r*x+r^2}}$.\n\n$P(x)=?$',
    [X, var('r', '1..9;±')],
    [case('(x{{eval:-r;+}})^2', [
        erreur('(x{{eval:r;+}})^2', ERR_ID_SIGNE, 'Signe dans le carré'),
        erreur('(x{{eval:-r;+}})(x{{eval:r;+}})', ERR_ID_A2B2, 'Identités confondues'),
    ], forme=CARRE)],
    ['On reconnaît $a^2-2ab+b^2$ avec $a=x$ et $b={{eval:r;()}}$ : '
     '$x^2{{eval:-2*r;+}}x+{{eval:r^2}}=x^2-2\\times x\\times{{eval:r;()}}+{{eval:r;()}}^2$.',
     'Donc $P(x)=' + PRIMAIRE + '{(x{{eval:-r;+}})^2}$, sans discriminant.'],
    IDENT_HINT))
v = {'r': 4}
s604 += [spec('x² − 8x + 16', 2, v, 'correct', ['(x-4)^2']),
         spec('Signe', 2, v, 'incorrect', ['(x+4)^2'],
              '$\\left( x + 4 \\right)^2$ se développe en $x^2 + 8 x + 16$ : le signe du terme en $x$ ne correspond pas.'),
         spec('a² − b²', 2, v, 'incorrect', ['(x-4)(x+4)'],
              '$\\left( x - 4 \\right) \\left( x + 4 \\right) = x^2 - 16$ : il manquerait le terme en $x$. Ici c\'est $\\left( a - b \\right)^2 = a^2 - 2 a b + b^2$.')]

ERR_A2B2_CARRE = ('$(x{{eval:-r;+}})^2$ contient un terme en $x$, absent de $P(x)$ : ici c\'est '
                  '$a^2-b^2=(a-b)(a+b)$.')
ERR_A2B2_K = 'N\'oublie pas le facteur commun ${{k}}$.'
v604.append(variation(
    'Factorise le polynôme $P(x)={{eval:k*x^2-k*r^2}}$.\n\n$P(x)=?$',
    [X, var('k', '1..3'), var('r', '1..9')],
    [case('{{if:k==1||{{k}}}}(x{{eval:-r;+}})(x{{eval:r;+}})', [
        erreur('{{if:k==1||{{k}}}}(x{{eval:-r;+}})^2', ERR_A2B2_CARRE, 'Carré au lieu de a² − b²'),
        erreur('(x{{eval:-r;+}})(x{{eval:r;+}})', ERR_A2B2_K, 'Facteur commun oublié'),
    ], forme=FACT)],
    ['{{if:k==1|On reconnaît|On met ${{k}}$ en facteur : $P(x)={{k}}(x^2-{{eval:r^2}})$, et on reconnaît}} '
     '$a^2-b^2=(a-b)(a+b)$ avec $a=x$ et $b={{r}}$.',
     'Donc $P(x)=' + PRIMAIRE + '{ {{if:k==1||{{k}}}}(x{{eval:-r;+}})(x{{eval:r;+}})}$, sans discriminant.'],
    IDENT_HINT))
v = {'k': 3, 'r': 2}  # 3x² − 12
s604 += [spec('3x² − 12', 3, v, 'correct', ['3(x-2)(x+2)']),
         spec('Ordre des facteurs', 3, v, 'correct', ['3(x+2)(x-2)']),
         spec('Carré', 3, v, 'incorrect', ['3(x-2)^2'],
              '$\\left( x - 2 \\right)^2$ contient un terme en $x$, absent de $P \\left( x \\right)$ : ici c\'est $a^2 - b^2 = \\left( a - b \\right) \\left( a + b \\right)$.'),
         spec('Facteur oublié', 3, v, 'incorrect', ['(x-2)(x+2)'], 'N\'oublie pas le facteur commun $3$.')]

ERR_FC_K = 'N\'oublie pas le facteur ${{k}}$ : $P(x)={{k}}x^2{{eval:k*m;+}}x$.'
ERR_FC_SIGNE = ('$P(x)$ s\'annule en $0$ et en ${{eval:-m}}$ : le second facteur est '
                '$(x{{eval:m;+}})$.')
v604.append(variation(
    'Factorise le polynôme $P(x)={{eval:k*x^2+k*m*x}}$, sous la forme $a\\,x\\,(x-x_2)$.\n\n$P(x)=?$',
    [X, var('k', '2..5;±'), var('m', '1..6;±')],
    [case('{{k}}x(x{{eval:m;+}})', [
        erreur('x(x{{eval:m;+}})', ERR_FC_K, 'Coefficient oublié'),
        erreur('{{k}}x(x{{eval:-m;+}})', ERR_FC_SIGNE, 'Signe de la racine'),
    ])],
    ['$x$ est un facteur commun : $P(x)=x({{eval:k*x+k*m}})$, et ${{eval:k*x+k*m}}={{k}}(x{{eval:m;+}})$.',
     'Donc $P(x)=' + PRIMAIRE + '{ {{k}}x(x{{eval:m;+}})}$, sans discriminant.'],
    IDENT_HINT))
v = {'k': 2, 'm': -3}  # 2x² − 6x
s604 += [spec('2x² − 6x', 4, v, 'correct', ['2x(x-3)']),
         spec('Coefficient oublié', 4, v, 'incorrect', ['x(x-3)'],
              'N\'oublie pas le facteur $2$ : $P \\left( x \\right) = 2 x^2 - 6 x$.'),
         spec('Signe', 4, v, 'incorrect', ['2x(x+3)'],
              '$P \\left( x \\right)$ s\'annule en $0$ et en $3$ : le second facteur est $\\left( x - 3 \\right)$.')]

ajouter('604f83b7', v604, s604)

# =============================================================================================
# b09c430a — Discriminant (1SPE-248). F10 : coefficient de x² fractionnaire.
# =============================================================================================

ERR_FR_A = ('Ici $a=\\dfrac{1}{ {{d}} }$, pas $1$ : $4ac=4\\times\\dfrac{1}{ {{d}} }\\times{{eval:c;()}}$.')
ERR_FR_B2 = '$b^2$ est toujours positif : ${{eval:b;()}}^2={{eval:b^2}}$.'
vb = [variation(
    'Calcule le discriminant $\\Delta$ du polynôme $P(x)=\\dfrac{1}{ {{d}} }x^2{{eval:bx;+}}{{eval:c;+}}$.'
    '\n\n$\\Delta=?$',
    [X, var('d', '2|3'), var('b', '1..9;±'), var('c', '1..9;±')],
    [case('{{eval:b^2-4*c/d}}', [
        erreur('{{eval:b^2-4*c}}', ERR_FR_A, 'a = 1 au lieu de 1/d'),
        erreur('{{eval:-b^2-4*c/d}}', ERR_FR_B2, 'Carré de b négatif'),
    ])],
    ['Ici $a=\\dfrac{1}{ {{d}} }$, $b={{b}}$ et $c={{c}}$.',
     '$$\\begin{align}\\Delta &= b^2-4ac \\\\ &= {{eval:b;()}}^2-4\\times\\dfrac{1}{ {{d}} }\\times{{eval:c;()}} '
     '\\\\ &= ' + PRIMAIRE + '{ {{eval:b^2-4*c/d}} }\\end{align}$$'],
    'Repère bien $a$, $b$ et $c$ : le coefficient de $x^2$ est une fraction.')]
v = {'d': 2, 'b': 3, 'c': -4}  # ½x² + 3x − 4 : Δ = 9 + 8 = 17
sb = [spec('½x² + 3x − 4', 0, v, 'correct', ['17']),
      spec('a = 1', 0, v, 'incorrect', ['25'],
           'Ici $a = \\dfrac{1}{2}$, pas $1$ : $4ac=4\\times\\dfrac{1}{ 2 }\\times(-4)$.'),
      spec('b² négatif', 0, v, 'incorrect', ['-1'], '$b^2$ est toujours positif : $3^2 = 9$.')]
ajouter('b09c430a', vb, sb)

# =============================================================================================
# 9e1d084e — Inéquation du second degré (1SPE-250). F11 : termes des deux côtés.
# Différence (x − r)(x − s), de coefficient 1.
# =============================================================================================

ERR_INEQ_ENTRE = ('Après réduction, le trinôme a pour coefficient $1 > 0$ : il est positif à l\'extérieur des racines.')
ERR_INEQ_SIGNE = ('Réduis d\'abord en passant tout à gauche, et change le signe des termes que tu '
                  'déplaces : les racines sont ${{r}}$ et ${{s}}$.')
v9e = [variation(
    'Résous dans $\\mathbb{R}$ l\'inéquation ${{eval:p*x^2+m*x+n}}>{{eval:q*x^2+u*x+w}}$.\n\n'
    'L\'ensemble des solutions est $S=?$.',
    [X, var('q', '1..3'), var('p', 'eval:q+1'), var('u', '-5..5'), var('w', '-6..6'),
     var('r', '-5..5'), var('s', '-5..5'), var('m', 'eval:u-(r+s)'), var('n', 'eval:w+r*s')],
    [case(']-\\infty;{{r}}[\\cup]{{s}};+\\infty[', [
        erreur(']{{r}};{{s}}[', ERR_INEQ_ENTRE, 'Intérieur des racines'),
        erreur(']-\\infty;{{eval:-s}}[\\cup]{{eval:-r}};+\\infty[', ERR_INEQ_SIGNE, 'Signes des racines'),
    ])],
    ['On passe tout à gauche : ${{eval:x^2-(r+s)*x+r*s}}>0$.',
     'Ce trinôme a pour racines ${{r}}$ et ${{s}}$ ; de coefficient $1>0$, il est positif à '
     'l\'extérieur des racines.',
     '$S=' + PRIMAIRE + '{\\left]-\\infty\\,;{{r}}\\right[\\cup\\left]{{s}}\\,;+\\infty\\right[}$.'],
    'Commence par tout passer dans un même membre pour comparer un trinôme à $0$.',
    ['r < s'])]
v = {'q': 1, 'p': 2, 'u': 3, 'w': -2, 'r': -1, 's': 4, 'm': 0, 'n': -6}  # 2x² − 6 > x² + 3x − 2
s9e = [spec('2x² − 6 > x² + 3x − 2', 0, v, 'correct', [']-\\infty;-1[\\cup]4;+\\infty[']),
       spec('Intérieur', 0, v, 'incorrect', [']-1;4['], ERR_INEQ_ENTRE),
       spec('Signes', 0, v, 'incorrect', [']-\\infty;-4[\\cup]1;+\\infty['],
            'Réduis d\'abord en passant tout à gauche, et change le signe des termes que tu déplaces : '
            'les racines sont $-1$ et $4$.')]
ajouter('9e1d084e', v9e, s9e)

# =============================================================================================
# afe51ac4 — Signe d'une forme factorisée (1SPE-251). F11 : facteurs non unitaires
# (px + q)(tx + w) ≤ 0, racines fractionnaires r1 = −q/p < r2 = −w/t.
# =============================================================================================

INT_SIGNE = '{{if:p*t>0|[{{eval:-q/p}};{{eval:-w/t}}]|]-\\infty;{{eval:-q/p}}]\\cup[{{eval:-w/t}};+\\infty[}}'
INT_INVERSE = '{{if:p*t>0|]-\\infty;{{eval:-q/p}}]\\cup[{{eval:-w/t}};+\\infty[|[{{eval:-q/p}};{{eval:-w/t}}]}}'
INT_OUVERT = '{{if:p*t>0|]{{eval:-q/p}};{{eval:-w/t}}[|]-\\infty;{{eval:-q/p}}[\\cup]{{eval:-w/t}};+\\infty[}}'
ERR_AF_SIGNE = ('Développé, $P(x)$ a pour coefficient de $x^2$ ${{p}}\\times{{eval:t;()}}={{eval:p*t}}$ : '
                'il est du signe de ce coefficient à l\'extérieur des racines.')
ERR_AF_LARGE = 'L\'inégalité est large : les deux racines sont des solutions.'
vaf = [variation(
    'Soit $P(x)=({{p}}x{{eval:q;+}})({{t}}x{{eval:w;+}})$.\n\nRésous l\'inéquation $P(x)\\leqslant0$.'
    '\n\n$S=?$',
    [var('p', '2..4;±'), var('q', '1..7;±'), var('t', '2..4;±'), var('w', '1..7;±')],
    [case(INT_SIGNE, [
        erreur(INT_INVERSE, ERR_AF_SIGNE, 'Signe du trinôme inversé'),
        erreur(INT_OUVERT, ERR_AF_LARGE, 'Racines exclues'),
    ], kind='intervalles')],
    ['Les facteurs s\'annulent en $-\\dfrac{ {{q}} }{ {{p}} }={{eval:-q/p}}$ et en '
     '$-\\dfrac{ {{w}} }{ {{t}} }={{eval:-w/t}}$.',
     'Le coefficient de $x^2$ vaut ${{p}}\\times{{eval:t;()}}={{eval:p*t}}$ : $P(x)$ est '
     '{{if:p*t>0|négatif entre les racines|négatif à l\'extérieur des racines}}, et nul en chacune.',
     '$S=' + PRIMAIRE + '{ ' + INT_SIGNE + ' }$.'],
    'Cherche où chaque facteur s\'annule, puis le signe du produit (un tableau de signes aide).',
    ['-q/p < -w/t', 'q % p != 0', 'w % t != 0'])]
v = {'p': 2, 'q': -3, 't': -3, 'w': 6}  # (2x − 3)(−3x + 6) : racines 3/2 et 2, coefficient −6
saf = [spec('(2x − 3)(−3x + 6) ≤ 0', 0, v, 'correct', [']-\\infty;\\frac{3}{2}]\\cup[2;+\\infty[']),
       spec('Région inverse', 0, v, 'incorrect', ['[\\frac{3}{2};2]'],
            'Développé, $P \\left( x \\right)$ a pour coefficient de $x^2$ $2\\times(-3)=-6$ : il est du signe de ce coefficient à l\'extérieur des racines.'),
       spec('Racines exclues', 0, v, 'incorrect', [']-\\infty;\\frac{3}{2}[\\cup]2;+\\infty['],
            ERR_AF_LARGE)]
ajouter('afe51ac4', vaf, saf)

# =============================================================================================
# aab8e41c — Polynôme s'annulant en deux réels (1SPE-252). F12 : racines + un point quelconque.
# =============================================================================================

ERR_PT_A = ('Il faut trouver $a$ : $P({{t}})={{y}}$ donne '
            '$a\\times({{t}}{{eval:-r;+}})({{t}}{{eval:-s;+}})={{y}}$.')
ERR_PT_SIGNE = 'Un polynôme qui s\'annule en ${{r}}$ a un facteur $(x{{eval:-r;+}})$ : attention aux signes.'
vaa = [variation(
    'Un polynôme du second degré $P$ s\'annule en ${{r}}$ et en ${{s}}$, et sa courbe passe par le point '
    '$A({{t}}\\,;{{y}})$.\n\nDonne $P(x)$ sous forme factorisée.\n\n$P(x)=?$',
    [X, var('a', '1..3;±'), var('r', '-4..3'), var('s', '-3..4'), var('t', '-5..5'),
     var('y', 'eval:a*(t-r)*(t-s)')],
    [case('{{eval:a*(x-r)*(x-s)}}', [
        erreur('{{eval:(x-r)*(x-s)}}', ERR_PT_A, 'Coefficient a non cherché'),
        erreur('{{eval:a*(x+r)*(x+s)}}', ERR_PT_SIGNE, 'Signes des racines'),
    ])],
    ['$P(x)=a(x{{eval:-r;+}})(x{{eval:-s;+}})$ pour un réel $a$ à trouver.',
     '$P({{t}})={{y}}$ : $a\\times{{eval:t-r;()}}\\times{{eval:t-s;()}}={{y}}$, donc $a={{a}}$.',
     'Donc $P(x)=' + PRIMAIRE + '{ {{eval:a*(x-r)*(x-s)}} }$.'],
    'Écris $P(x)=a(x-x_1)(x-x_2)$, puis utilise le point $A$ pour trouver $a$.',
    ['r < s', 't != r', 't != s', 't != 0'])]
v = {'a': 2, 'r': -1, 's': 3, 't': 1, 'y': -8}  # 2(x + 1)(x − 3), P(1) = −8
saa = [spec('2(x + 1)(x − 3)', 0, v, 'correct', ['2(x+1)(x-3)']),
       spec('a oublié', 0, v, 'incorrect', ['(x+1)(x-3)'],
            'Il faut trouver $a$ : $P \\left( 1 \\right) = -8$ donne $a\\times(1+1)(1-3)=-8$.'),
       spec('Signes', 0, v, 'incorrect', ['2(x-1)(x+3)'],
            'Un polynôme qui s\'annule en $-1$ a un facteur $\\left( x + 1 \\right)$ : attention aux signes.')]
ajouter('aab8e41c', vaa, saa)

# =============================================================================================
# 87140df3 — Forme canonique (1SPE-246). F12 : sommet et un point, sans courbe.
# =============================================================================================

ERR_SP_SIGNE = 'Le sommet $S({{al}}\\,;{{be}})$ donne le facteur $(x{{eval:-al;+}})^2$ : attention au signe.'
ERR_SP_A = ('Il faut trouver $a$ avec le point $A$ : $a\\times{{eval:d;()}}^2+{{eval:be;()}}={{eval:be+a*d^2}}$.')
v87 = [variation(
    'Une parabole a pour sommet $S({{al}}\\,;{{be}})$ et passe par le point '
    '$A({{eval:al+d}}\\,;{{eval:be+a*d^2}})$.\n\nDétermine la forme canonique du polynôme qu\'elle '
    'représente.\n\nLa forme canonique est $?$.',
    [X, var('a', '1..3;±'), var('al', '-4..4'), var('be', '-6..6'), var('d', '1..3;±')],
    [case('{{eval:a*(x-al)^2+be}}', [
        erreur('{{eval:a*(x+al)^2+be}}', ERR_SP_SIGNE, 'Signe de α'),
        erreur('{{eval:(x-al)^2+be}}', ERR_SP_A, 'Coefficient a non cherché'),
    ], forme={'pattern': 'u*($x+v)^2+w', 'acceptable': 'u*($x-(-v))^2+w'})],
    ['Le sommet donne $f(x)=a(x{{eval:-al;+}})^2{{eval:be;+}}$.',
     'Le point $A$ donne $a\\times{{eval:d;()}}^2{{eval:be;+}}={{eval:be+a*d^2}}$, donc $a={{a}}$.',
     'La forme canonique est $' + PRIMAIRE + '{ {{eval:a*(x-al)^2+be}} }$.'],
    'Le sommet donne $\\alpha$ et $\\beta$ ; il reste $a$, que le point $A$ permet de trouver.',
    ['al != 0'])]
v = {'a': 2, 'al': 1, 'be': -3, 'd': 2}  # S(1 ; −3), A(3 ; 5)
s87 = [spec('S(1 ; −3), A(3 ; 5)', 0, v, 'correct', ['2(x-1)^2-3']),
       spec('Signe', 0, v, 'incorrect', ['2(x+1)^2-3'],
            'Le sommet $S(1\\,;-3)$ donne le facteur $\\left( x - 1 \\right)^2$ : attention au signe.'),
       spec('a oublié', 0, v, 'incorrect', ['(x-1)^2-3'],
            'Il faut trouver $a$ avec le point $A$ : $a\\times2^2+(-3)=5$.')]
ajouter('87140df3', v87, s87)

# =============================================================================================
# 18e26873 — Racines (1SPE-244). F13 : racines lues sur une parabole. orderIndependent : pas
# d'erreur prévue.
# =============================================================================================

v18 = [variation(
    'La parabole ci-dessous représente un polynôme du second degré $P$.\n\n'
    + bloc('courbe', 'x: -7 ; 7', 'y: -10 ; 10', 'grille: 1 ; 1',
           'f(x) = {{a}}*(x-{{r}})*(x-{{s}})   bleu   nom=C_P', 'taille: moyenne',
           'description: Parabole qui coupe l\'axe des abscisses en deux points à coordonnées entières.')
    + '\n\nLis ses racines sur le graphique.\n\nLes racines sont $?$ et $?$.',
    [var('a', '1|-1'), var('r', '-5..3'), var('s', '-3..5')],
    [case('{{r}}'), case('{{s}}')],
    ['Les racines de $P$ sont les abscisses des points où la parabole coupe l\'axe des abscisses.',
     'On lit $' + PRIMAIRE + '{ {{r}} }$ et $' + PRIMAIRE + '{ {{s}} }$.'],
    'Cherche les points où la courbe coupe l\'axe horizontal : leurs abscisses sont les racines.',
    ['r < s', 's - r >= 2', 's - r <= 6'])]
v = {'a': 1, 'r': -2, 's': 3}
s18 = [spec('Racines −2 et 3', 0, v, 'correct', ['-2', '3']),
       spec('Ordre inverse', 0, v, 'correct', ['3', '-2']),
       spec('Ordonnée à l\'origine', 0, v, 'incorrect', ['-6', '3'])]
ajouter('18e26873', v18, s18)

# =============================================================================================
# 56b1803f — Sommet (1SPE-247). F13 : sommet lu sur une parabole.
# =============================================================================================

ERR_SO_X = 'Tu as donné l\'ordonnée : l\'abscisse du sommet se lit sur l\'axe horizontal.'
ERR_SO_Y = 'Tu as donné l\'abscisse : l\'ordonnée du sommet se lit sur l\'axe vertical.'
v56 = [variation(
    'La parabole ci-dessous représente une fonction $f$ du second degré.\n\n'
    + bloc('courbe', 'x: -7 ; 7', 'y: -8 ; 8', 'grille: 1 ; 1',
           'f(x) = {{a}}*(x-{{h}})^2+{{k}}   bleu   nom=C_f', 'taille: moyenne',
           'description: Parabole dont le sommet a des coordonnées entières.')
    + '\n\nLis les coordonnées de son sommet $S$.\n\n$S\\left( \\, ? \\, ; \\, ? \\, \\right)$',
    [var('a', '1|-1'), var('h', '-4..4'), var('k', '-5..5')],
    [case('{{h}}', [erreur('{{k}}', ERR_SO_X, 'Coordonnées échangées')], extra={'acceptDecimal': True}),
     case('{{k}}', [erreur('{{h}}', ERR_SO_Y, 'Coordonnées échangées')], extra={'acceptDecimal': True})],
    ['Le sommet est le point le plus {{if:a>0|bas|haut}} de la parabole.',
     'On lit $S\\left(' + PRIMAIRE + '{ {{h}} }\\,;' + PRIMAIRE + '{ {{k}} }\\right)$.'],
    'Le sommet est le point où la parabole change de sens : le plus bas ou le plus haut.',
    ['h != k'])]
v = {'a': -1, 'h': 2, 'k': 3}
s56 = [spec('Sommet (2 ; 3)', 0, v, 'correct', ['2', '3']),
       spec('Échangées', 0, v, 'incorrect', ['3', '2'], ERR_SO_X)]
ajouter('56b1803f', v56, s56)

# =============================================================================================
# a9aece33 — Forme canonique (1SPE-246). F14 : depuis la forme factorisée.
# =============================================================================================

ERR_FF_BETA = ('$\\beta=f(\\alpha)$ : calcule $f({{al}})={{a}}\\times{{eval:al-x1;()}}\\times'
               '{{eval:al-x2;()}}$ ; attention au signe.')
ERR_FF_A = 'Tu as oublié le facteur ${{a}}$ en calculant $\\beta=f({{al}})$.'
ERR_FF_AL = ('$\\alpha$ est le milieu des racines : $\\dfrac{ {{x1}}{{eval:x2;+}} }{2}={{al}}$ ; '
             'attention au signe dans $(x-\\alpha)^2$.')
va9 = [variation(
    'Détermine la forme canonique du polynôme $P(x)={{a}}(x{{eval:-x1;+}})(x{{eval:-x2;+}})$.\n\n$P(x)=?$',
    [X, var('a', '2..4;±'), var('x1', '-5..3'), var('k', '1..4'), var('x2', 'eval:x1+2*k'),
     var('al', 'eval:x1+k'), var('be', 'eval:-a*k^2')],
    [case('{{a}}(x{{eval:-al;+}})^2{{eval:be;+}}', [
        erreur('{{a}}(x{{eval:-al;+}})^2{{eval:-be;+}}', ERR_FF_BETA, 'Signe de β'),
        erreur('{{a}}(x{{eval:-al;+}})^2{{eval:-k^2;+}}', ERR_FF_A, 'Facteur a oublié dans β'),
        erreur('{{a}}(x{{eval:al;+}})^2{{eval:be;+}}', ERR_FF_AL, 'Signe de α'),
    ], forme=CANO)],
    ['L\'axe de symétrie passe par le milieu des racines : $\\alpha=\\dfrac{ {{x1}}{{eval:x2;+}} }{2}={{al}}$.',
     '$\\beta=P({{al}})={{a}}\\times{{eval:al-x1;()}}\\times{{eval:al-x2;()}}={{be}}$.',
     'Donc $P(x)=' + PRIMAIRE + '{ {{a}}(x{{eval:-al;+}})^2{{eval:be;+}}}$.'],
    'L\'abscisse du sommet est le milieu des deux racines ; l\'ordonnée est l\'image de ce milieu.',
    ['x1 != 0', 'x2 != 0', 'al != 0'])]
v = {'a': 2, 'x1': -1, 'k': 2, 'x2': 3, 'al': 1, 'be': -8}  # 2(x + 1)(x − 3) = 2(x − 1)² − 8
sa9 = [spec('2(x + 1)(x − 3)', 0, v, 'correct', ['2(x-1)^2-8']),
       spec('Signe de β', 0, v, 'incorrect', ['2(x-1)^2+8'],
            '$\\beta = f\\left( \\alpha \\right)$ : calcule $f(1)=2\\times2\\times(-2)$ ; attention au signe.'),
       spec('a oublié dans β', 0, v, 'incorrect', ['2(x-1)^2-4'],
            'Tu as oublié le facteur $2$ en calculant $\\beta = f\\left( 1 \\right)$.'),
       spec('Signe de α', 0, v, 'incorrect', ['2(x+1)^2-8'],
            '$\\alpha$ est le milieu des racines : $\\dfrac{ -1+3 }{2}=1$ ; attention au signe dans $\\left( x - \\alpha \\right)^2$.')]
ajouter('a9aece33', va9, sa9)
