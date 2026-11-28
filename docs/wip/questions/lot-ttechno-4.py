"""Écrit les 2 modèles du lot 4 « fonctions aˣ » de la Terminale technologique (STMG)
dans scripts/questions/ttechno-4-fonctions/.

Phase 0 validée par David le 2026-11-18 (journal docs/archive/wip/questions-ttechno-progress.md § 29,
Q21–Q23 : « je te suis ») :

| #  | Point        | Nœud (posé par la migration)                       | Niveau | Réponse              |
| M1 | TTECHNO-037  | Fonction exponentielle › propriétés algébriques     | 1 | case choix               |
| M2 | TTECHNO-039  | Fonction exponentielle › fonctions x ↦ aˣ           | 2 | nombres ; case choix     |

Bornes (BO Tle techno p.8 et p.5) : propriétés admises par extension des puissances entières
(produit, quotient, puissance, a⁰, a⁻ˣ ; pas (ab)ˣ, Q21) ; intercaler un point par moyennes
arithmétique (abscisses) et géométrique (ordonnées), « Python ou tableur » (une variation de
chaque, Q22) ; pas de `placer:`, les coordonnées suffisent (Q23).

Pièges : jamais de variable `e` ni `i` ; case choix → `melanger: non`, réponse = rang (bonne
réponse à des rangs variés) ; exposants négatifs dans eval entre parenthèses (a^(x1)).

    python3 docs/wip/questions/lot-ttechno-4.py scripts/questions/ttechno-4-fonctions
"""
import json
import os
import sys

DOSSIER = sys.argv[1]


def spec(desc, vi, variables_, answers, status, violations=None):
    if isinstance(answers, str):
        answers = [answers]
    expected = {'status': status}
    if violations:
        expected['constraintViolations'] = violations
    return {'description': desc, 'variationIndex': vi, 'variables': variables_,
            'answers': answers, 'expected': expected}


def modele(title, description, level, delay, variations, specs, shared=None):
    # Ni theme, ni domain, ni subdomain (ADR 0035) ; nœud et tag posés par la migration.
    return {'title': title, 'description': description, 'grades': ['T_TECHNO'], 'level': level,
            'delay': delay, 'status': 'draft', 'shared': shared or {}, 'variations': variations,
            'testSpecs': specs}


def var(nom, expression):
    return {'name': nom, 'expression': expression}


def case(reponse, **reglages):
    b = {'expectedAnswer': reponse}
    b.update(reglages)
    return b


def variation(statement, variables, reponses, steps, conditions=None):
    """reponses : une chaîne, une case (dict) ou une liste."""
    if not isinstance(reponses, list):
        reponses = [reponses]
    return {'statement': statement, 'variables': variables, 'conditions': conditions or [],
            'blanks': [r if isinstance(r, dict) else {'expectedAnswer': r} for r in reponses],
            'correction': {'steps': steps}}


def col(x):
    return '\\textcolor{{{color:primary.0}}}{' + x + '}'


def choix(*options):
    return '\n\n```choix\nmelanger: non\n' + ''.join('- ' + o + '\n' for o in options) + '```'


def specs_choix(vi, variables_, bonne, erreurs):
    """erreurs : {rang: description} des propositions fausses."""
    out = [spec('choix : bonne réponse ' + str(bonne), vi, variables_, str(bonne), 'correct')]
    out += [spec('Erreur : ' + d, vi, variables_, str(j), 'incorrect')
            for j, d in sorted(erreurs.items())]
    return out


DECIMAL = {'blankDefaults': {'acceptDecimal': True}}

# --- M1, TTECHNO-037 : connaître les propriétés algébriques ---------------------------------

POUR_XY = 'Pour tout réel $a>0$ et tous réels $x$ et $y$, '
POUR_X = 'Pour tout réel $a>0$ et tout réel $x$, '
EXTENSION = ('Ces propriétés prolongent celles des puissances entières, par exemple'
             ' $2^3\\times2^2=2^5$ : on les admet pour tous les exposants réels.')

M1 = modele(
    'Propriétés algébriques des fonctions exponentielles',
    'À savoir : aˣ × aʸ = aˣ⁺ʸ, aˣ ÷ aʸ = aˣ⁻ʸ, (aˣ)ʸ = aˣʸ, a⁰ = 1, a⁻ˣ = 1/aˣ, parmi des erreurs'
    ' typiques ; aˣ + aʸ n\'est pas aˣ⁺ʸ',
    1, 30,
    [
        variation(
            POUR_XY + '$a^x\\times a^y$ est égal à :'
            + choix('$a^{xy}$', '$a^{x+y}$', '$\\left(a^2\\right)^{x+y}$', '$2a^{x+y}$'),
            [], '1',
            ['À connaître : un produit de puissances de même base, c\'est la base à la **somme**'
             ' des exposants.',
             POUR_XY + '$a^x\\times a^y=' + col('a^{x+y}') + '$. ' + EXTENSION],
        ),
        variation(
            POUR_XY + '$\\dfrac{a^x}{a^y}$ est égal à :'
            + choix('$a^{y-x}$', '$a^{\\frac{x}{y}}$', '$a^{x-y}$', '$1^{x-y}$'),
            [], '2',
            ['À connaître : un quotient de puissances de même base, c\'est la base à la'
             ' **différence** des exposants, celui du numérateur moins celui du dénominateur.',
             POUR_XY + '$\\dfrac{a^x}{a^y}=' + col('a^{x-y}') + '$. Par exemple'
             ' $\\dfrac{2^5}{2^3}=2^2$.'],
        ),
        variation(
            POUR_XY + '$\\left(a^x\\right)^y$ est égal à :'
            + choix('$a^{xy}$', '$a^{x+y}$', '$a^{x^y}$', '$y\\,a^x$'),
            [], '0',
            ['À connaître : une puissance de puissance, c\'est la base au **produit** des'
             ' exposants.',
             POUR_XY + '$\\left(a^x\\right)^y=' + col('a^{xy}') + '$. Par exemple'
             ' $\\left(2^3\\right)^2=2^3\\times2^3=2^6$.'],
        ),
        variation(
            'Pour tout réel $a>0$, $a^0$ est égal à :'
            + choix('$0$', '$a$', '$1$', 'il n\'existe pas'),
            [], '2',
            ['À connaître : pour tout réel $a>0$, $a^0=' + col('1') + '$.',
             'Ainsi la courbe de toute fonction $x\\mapsto a^x$ passe par le point $(0\\,;1)$.'],
        ),
        variation(
            POUR_X + '$a^{-x}$ est égal à :'
            + choix('$-a^x$', '$\\dfrac{1}{a^x}$', '$(-a)^x$', '$-\\dfrac{1}{a^x}$'),
            [], '1',
            ['À connaître : pour tout réel $a>0$ et tout réel $x$, $a^{-x}='
             + col('\\dfrac{1}{a^x}') + '$.',
             'Un exposant négatif ne rend pas le nombre négatif : $a^{-x}$ est l\'inverse de'
             ' $a^x$, donc strictement positif. Par exemple $2^{-3}=\\dfrac{1}{2^3}=\\dfrac{1}{8}$.'],
        ),
        variation(
            'Vrai ou faux ? ' + POUR_XY + '$a^x+a^y=a^{x+y}$.'
            + choix('Vrai, pour tous réels $x$ et $y$.', 'Faux en général.'),
            [], '1',
            ['La propriété porte sur le **produit** : $a^x\\times a^y=a^{x+y}$. Il n\'y a pas de'
             ' propriété pour la somme $a^x+a^y$.',
             'Contre-exemple : $a=2$, $x=0$, $y=0$ : $2^0+2^0=1+1=2$, alors que $2^{0+0}=1$.',
             'L\'égalité est donc $' + col('\\text{fausse en général}') + '$.'],
        ),
    ],
    specs_choix(0, {}, 1, {0: 'a^(xy)', 2: '(a²)^(x+y)', 3: '2a^(x+y)'})
    + specs_choix(1, {}, 2, {0: 'a^(y−x)', 1: 'a^(x/y)', 3: '1^(x−y)'})
    + specs_choix(2, {}, 0, {1: 'a^(x+y)', 2: 'a^(x^y)', 3: 'y·a^x'})
    + specs_choix(3, {}, 2, {0: '0', 1: 'a', 3: 'n\'existe pas'})
    + specs_choix(4, {}, 1, {0: '−a^x', 2: '(−a)^x', 3: '−1/a^x'})
    + specs_choix(5, {}, 1, {0: 'vrai'}),
)

# --- M2, TTECHNO-039 : intercaler un point sur la courbe de aˣ ------------------------------
# A(x1 ; a^x1) et B(x1 + 2 ; a^(x1+2)) : le milieu des abscisses est entier et la moyenne
# géométrique des ordonnées vaut a^(x1+1), exacte. La seconde intercalation (entre A et C)
# donne a^(x1 + 0,5), une racine : arrondi au centième.

YA = '{{eval:a^(x1);d}}'
YB = '{{eval:a^(x1+2);d}}'
YC = '{{eval:a^(x1+1);d}}'
XB = '{{eval:x1+2}}'
XC = '{{eval:x1+1}}'
A_M2 = var('a', '2|3|4|5|0.5')
X1_M2 = var('x1', '-1|0|1|2')
POINTS = ('Les points $A({{x1}}\\,;' + YA + ')$ et $B(' + XB + '\\,;' + YB + ')$ sont sur la'
          ' courbe de la fonction $f$ définie sur $\\mathbb{R}$ par $f(x)={{a}}^x$.')
MOYENNES = ('La moyenne arithmétique de deux nombres $u$ et $v$ est $\\dfrac{u+v}{2}$ ; la'
            ' moyenne géométrique de deux nombres positifs $u$ et $v$ est $\\sqrt{uv}$.')
CALCUL_C = ('$x_C=\\dfrac{ {{x1}}+' + XB + '}{2}=' + XC + '$ et $y_C=\\sqrt{' + YA + '\\times'
            + YB + '}=\\sqrt{ {{eval:a^(2*x1+2);d}} }=' + YC + '$.')
SUR_COURBE = ('$f(' + XC + ')={{a}}^{ ' + XC + ' }=' + YC + '=y_C$ : le point $C$ est **sur la'
              ' courbe**. C\'est vrai pour tous points $A$ et $B$ de la courbe, car'
              ' $\\sqrt{a^{x_A}\\times a^{x_B}}=a^{\\frac{x_A+x_B}{2}}$.')
CONSTRUCTION = ('On construit le point $C$ qui a pour abscisse la moyenne **arithmétique** des'
                ' abscisses de $A$ et $B$, et pour ordonnée la moyenne **géométrique** de leurs'
                ' ordonnées.')

M2 = modele(
    'Intercaler un point sur la courbe de x ↦ a^x',
    'Point intercalé entre deux points de la courbe de aˣ : moyenne arithmétique des abscisses,'
    ' moyenne géométrique des ordonnées ; position du point des moyennes arithmétiques ;'
    ' compléter une fonction Python et une formule de tableur ; deux intercalations',
    2, 60,
    [
        variation(
            POINTS + '\n\n' + CONSTRUCTION + '\n\nDonne les coordonnées de $C$.\n\n$x_C=?$\n\n'
            '$y_C=?$',
            [A_M2, X1_M2], [XC, YC],
            [MOYENNES, CALCUL_C,
             'Donc $C' + col('(' + XC + '\\,;' + YC + ')') + '$.', SUR_COURBE],
        ),
        variation(
            POINTS + '\n\nOn construit le point $M$ qui a pour abscisse la moyenne arithmétique'
            ' des abscisses de $A$ et $B$, et pour ordonnée la moyenne **arithmétique** de leurs'
            ' ordonnées.\n\nOù est le point $M$ ?'
            + choix('sur la courbe de $f$', 'au-dessus de la courbe de $f$',
                    'en dessous de la courbe de $f$'),
            [A_M2, X1_M2], '1',
            ['$x_M=\\dfrac{ {{x1}}+' + XB + '}{2}=' + XC + '$ et $y_M=\\dfrac{' + YA + '+' + YB
             + '}{2}={{eval:(a^(x1)+a^(x1+2))/2;d}}$.',
             'Le point de la courbe d\'abscisse $' + XC + '$ a pour ordonnée $f(' + XC + ')={{a}}^{ '
             + XC + ' }=' + YC + '$.',
             '${{eval:(a^(x1)+a^(x1+2))/2;d}}>' + YC + '$ : $M$ est $'
             + col('\\text{au-dessus de la courbe}') + '$. Pour rester sur la courbe de'
             ' $x\\mapsto a^x$, il faut la moyenne **géométrique** des ordonnées.'],
        ),
        variation(
            'La fonction Python `intercaler` reçoit les coordonnées de deux points $A$ et $B$ de'
            ' la courbe d\'une fonction $x\\mapsto a^x$. Elle doit renvoyer celles du point $C$'
            ' intercalé : moyenne arithmétique des abscisses, moyenne géométrique des ordonnées.'
            '\n\n```python\nfrom math import sqrt\n\ndef intercaler(xA, yA, xB, yB):\n'
            '    xC = (xA + xB) / 2\n    yC = ...\n    return xC, yC\n```\n\n'
            'Que faut-il écrire à la place des points de suspension ?'
            + choix('`(yA + yB) / 2`', '`sqrt(yA * yB)`', '`sqrt(yA + yB)`', '`yA * yB / 2`'),
            [], '1',
            [MOYENNES, '`sqrt` calcule la racine carrée (on l\'importe du module `math`) et `*`'
             ' est la multiplication : la moyenne géométrique de `yA` et `yB` s\'écrit'
             ' `sqrt(yA * yB)`.',
             '`(yA + yB) / 2` est la moyenne arithmétique : le point ne serait pas sur la'
             ' courbe.',
             'La ligne est donc `yC = sqrt(yA * yB)`.'],
        ),
        variation(
            'Une feuille de calcul contient les coordonnées de deux points $A$ et $B$ de la courbe'
            ' de $x\\mapsto{{a}}^x$. On veut en ligne 4 le point $C$ intercalé : moyenne'
            ' arithmétique des abscisses, moyenne géométrique des ordonnées.\n\n'
            '|   | A | B |\n|---|---|---|\n| 1 | x | y |\n| 2 | ${{x1}}$ | $' + YA + '$ |\n'
            '| 3 | $' + XB + '$ | $' + YB + '$ |\n| 4 | =(A2+A3)/2 |   |\n\n'
            'Quelle formule écrire dans la cellule B4 ?'
            + choix('=(B2+B3)/2', '=B2*B3/2', '=RACINE(B2*B3)', '=RACINE(B2+B3)'),
            [A_M2, X1_M2], '2',
            [MOYENNES, '**Tableur.** La fonction RACINE calcule la racine carrée et `*` est la'
             ' multiplication : la moyenne géométrique de B2 et B3 s\'écrit « =RACINE(B2*B3) ».',
             'Ici le tableur affiche $\\sqrt{' + YA + '\\times' + YB + '}=' + YC + '$ : c\'est'
             ' bien ${{a}}^{ ' + XC + ' }$, le point est sur la courbe. « =RACINE(B2*B3) »'
             ' est $' + col('\\text{la bonne formule}') + '$.',
             '« =(B2+B3)/2 » donne la moyenne arithmétique ; « =B2*B3/2 » et « =RACINE(B2+B3) »'
             ' ne sont pas des moyennes.'],
        ),
        variation(
            'Les points $A({{x1}}\\,;' + YA + ')$ et $B({{eval:x1+2}}\\,;' + YB + ')$ sont sur la'
            ' courbe de la fonction $f$ définie sur $\\mathbb{R}$ par $f(x)={{a}}^x$.\n\n'
            + CONSTRUCTION + ' Puis on recommence entre $A$ et $C$ : on obtient le point $D$.\n\n'
            'Donne l\'abscisse de $D$, puis son ordonnée arrondie au centième.\n\n$x_D=?$\n\n'
            '$y_D\\approx?$',
            [var('a', '2|3|5|0.5'), var('x1', '0|1|2')],
            ['{{eval:x1+0.5;d}}',
             case('{{eval:round(100*a^(x1+0.5))/100;d}}',
                  precision={'type': 'decimal', 'digits': 2})],
            [MOYENNES,
             'Première intercalation : ' + CALCUL_C,
             'Seconde, entre $A({{x1}}\\,;' + YA + ')$ et $C(' + XC + '\\,;' + YC + ')$ :'
             ' $x_D=\\dfrac{ {{x1}}+' + XC + '}{2}=' + col('{{eval:x1+0.5;d}}') + '$ et'
             ' $y_D=\\sqrt{' + YA + '\\times' + YC + '}=\\sqrt{ {{eval:a^(2*x1+1);d}} }\\approx'
             + col('{{eval:round(100*a^(x1+0.5))/100;d}}') + '$.',
             'Le point $D$ est encore sur la courbe : $y_D={{a}}^{ {{eval:x1+0.5;d}} }$. En'
             ' recommençant, on place autant de points de la courbe qu\'on veut.'],
        ),
    ],
    [
        spec('a = 2, x1 = 1 : C(2 ; 4)', 0, {'a': '2', 'x1': '1'}, ['2', '4'], 'correct'),
        spec('Erreur : moyenne arithmétique des ordonnées (5)', 0, {'a': '2', 'x1': '1'},
             ['2', '5'], 'incorrect'),
        spec('a = 0,5, x1 = 1 : C(2 ; 0,25)', 0, {'a': '0.5', 'x1': '1'}, ['2', '0,25'],
             'correct'),
        spec('a = 3, x1 = −1 : C(0 ; 1)', 0, {'a': '3', 'x1': '-1'}, ['0', '1'], 'correct'),
        spec('Erreur : C(0 ; 3) (ordonnée de B divisée)', 0, {'a': '3', 'x1': '-1'},
             ['0', '3'], 'incorrect'),
        spec('a = 2, x1 = 1 : M au-dessus', 1, {'a': '2', 'x1': '1'}, '1', 'correct'),
        spec('Erreur : sur la courbe', 1, {'a': '2', 'x1': '1'}, '0', 'incorrect'),
        spec('Erreur : en dessous', 1, {'a': '2', 'x1': '1'}, '2', 'incorrect'),
        spec('a = 0,5 : M au-dessus aussi', 1, {'a': '0.5', 'x1': '-1'}, '1', 'correct'),
    ]
    + specs_choix(2, {}, 1, {0: 'moyenne arithmétique', 2: 'racine de la somme',
                             3: 'demi-produit'})
    + specs_choix(3, {'a': '3', 'x1': '0'}, 2, {0: 'moyenne arithmétique',
                                                1: 'demi-produit', 3: 'racine de la somme'})
    + [
        spec('a = 2, x1 = 0 : D(0,5 ; 1,41)', 4, {'a': '2', 'x1': '0'}, ['0,5', '1,41'],
             'correct'),
        spec('Erreur : ordonnée arrondie au dixième (1,4)', 4, {'a': '2', 'x1': '0'},
             ['0,5', '1,4'], 'incorrect'),
        spec('Erreur : moyenne arithmétique (1,5)', 4, {'a': '2', 'x1': '0'}, ['0,5', '1,5'],
             'incorrect'),
        spec('a = 3, x1 = 1 : D(1,5 ; 5,2)', 4, {'a': '3', 'x1': '1'}, ['1,5', '5,2'],
             'correct'),
        spec('a = 3, x1 = 1 : 5,20 (zéro final) en forme à améliorer', 4,
             {'a': '3', 'x1': '1'}, ['1,5', '5,20'], 'unoptimal_form', ['zeros']),
        spec('a = 0,5, x1 = 2 : D(2,5 ; 0,18)', 4, {'a': '0.5', 'x1': '2'}, ['2,5', '0,18'],
             'correct'),
    ],
    shared=DECIMAL,
)

MODELES = [('01-proprietes-algebriques-exponentielles', M1),
           ('02-intercaler-un-point-courbe-a-puissance-x', M2)]

os.makedirs(DOSSIER, exist_ok=True)
for nom, m in MODELES:
    chemin = os.path.join(DOSSIER, nom + '.json')
    with open(chemin, 'w', encoding='utf-8') as f:
        json.dump(m, f, ensure_ascii=False, indent='\t')
        f.write('\n')
    print('écrit', chemin)
