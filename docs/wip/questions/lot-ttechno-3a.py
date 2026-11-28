"""Écrit les 4 modèles du lot 3a « propriétés » de la Terminale technologique (STMG)
dans scripts/questions/ttechno-3a-proprietes/.

Phase 0 validée par David le 2026-11-18 (journal docs/archive/wip/questions-ttechno-progress.md § 22,
Q19, Q20 : « je suis tes recos »). Compléments à exposants NÉGATIFS du modèle commun E2
(60971c9a, exposants positifs, tagué 081) et de E1 (e4e65a69, x ⩾ 0, tagué 031) :

| #  | Point        | Nœud (posé par la migration)                              | Niveau | Réponse                     |
| C1 | TTECHNO-034  | Fonction exponentielle › propriétés algébriques            | 1 | une seule puissance ; nombre    |
| C2 | TTECHNO-078  | Fonction exponentielle › propriétés algébriques            | 1 | une seule puissance             |
| C3 | TTECHNO-079  | Fonction exponentielle › propriétés algébriques            | 2 | une seule puissance ; nombre    |
| C4 | TTECHNO-031  | Fonction exponentielle › fonctions x ↦ aˣ                  | 1 | nombre, fraction, arrondi       |

Bornes (BO Tle techno p.8) : a > 0 ; a⁻ˣ = 1/aˣ ; propriétés admises « par extension des
propriétés des puissances entières » ; 079 avec n entier relatif. Ni eˣ, ni ln, ni dérivée.
`grades` = ['T_TECHNO'] seul : les bornes 1GEN arrêtent x à 0.

Pièges : jamais de variable `e` ni `i` ; eval ne connaît ni `>` ni `==` ; `round(…, n)` refusé
→ round(100*x)/100 ; un exposant manquant se demande par une case nombre (« quel réel x … »),
jamais par une case dans l'exposant ; somme avec un négatif écrite entre parenthèses.

    python3 docs/wip/questions/lot-ttechno-3a.py scripts/questions/ttechno-3a-proprietes
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


def modele(title, description, level, delay, variations, specs, shared=None, options=None):
    # Ni theme, ni domain, ni subdomain (ADR 0035) ; nœud et tag posés par la migration.
    m = {'title': title, 'description': description, 'grades': ['T_TECHNO'], 'level': level,
         'delay': delay, 'status': 'draft', 'shared': shared or {}}
    if options:
        m['options'] = options
    m['variations'] = variations
    m['testSpecs'] = specs
    return m


def var(nom, expression):
    return {'name': nom, 'expression': expression}


def case(reponse, **reglages):
    b = {'expectedAnswer': reponse}
    b.update(reglages)
    return b


def variation(statement, variables, reponses, steps, conditions=None):
    v = {'statement': statement, 'variables': variables, 'conditions': conditions or []}
    if not isinstance(reponses, list):
        reponses = [reponses]
    v['blanks'] = [r if isinstance(r, dict) else {'expectedAnswer': r} for r in reponses]
    v['correction'] = {'steps': steps}
    return v


def col(x):
    return '\\textcolor{{{color:primary.0}}}{' + x + '}'


def arrondi(digits):
    return {'type': 'decimal', 'digits': digits}


POW = {'requiredForm': 'power'}
DECIMAL = {'blankDefaults': {'acceptDecimal': True}}
SEULE = 'Écris sous la forme d\'une seule puissance : '
REGLE_RELATIFS = ('Ces propriétés valent pour tous les réels $x$ et $y$, **positifs ou négatifs**,'
                  ' comme pour les puissances entières.')

# --- C1, TTECHNO-034 : produit, exposants relatifs ------------------------------------------

REGLE_PRODUIT = 'Pour $a>0$ et tous réels $x$ et $y$ : $a^x\\times a^y=a^{x+y}$. On **ajoute** les exposants.'

C1 = modele(
    'Produit de puissances (exposants relatifs)',
    'a^x × a^y = a^(x+y) avec des exposants négatifs ; exposant manquant',
    1, 45,
    [
        variation(
            SEULE + '${{a}}^{ {{m}} }\\times{{a}}^{ {{p}} }$.\n\n${{a}}^{ {{m}} }\\times{{a}}^{ {{p}} }=?$',
            [var('a', '2|3|5|1.5'), var('m', '-3|-2.5|-1.5|-0.5'), var('p', '0.5|1|1.5|2|2.5|3.5')],
            case('{{a}}^{ {{eval:m+p;d}} }', **POW),
            [REGLE_PRODUIT,
             '${{a}}^{ {{m}} }\\times{{a}}^{ {{p}} }={{a}}^{ {{m}}+{{p}} }='
             + col('{{a}}^{ {{eval:m+p;d}} }') + '$.'],
            ['m+p != 0', 'm+p != 1'],
        ),
        variation(
            SEULE + '${{a}}^{ {{m}} }\\times{{a}}^{ {{p}} }$.\n\n${{a}}^{ {{m}} }\\times{{a}}^{ {{p}} }=?$',
            [var('a', '2|3|5|1.5'), var('m', '-0.5|-1|-1.5|-2|-2.5'), var('p', '-0.5|-1|-1.5|-2')],
            case('{{a}}^{ {{eval:m+p;d}} }', **POW),
            [REGLE_PRODUIT + ' ' + REGLE_RELATIFS,
             '${{a}}^{ {{m}} }\\times{{a}}^{ {{p}} }={{a}}^{ {{m}}+({{p}}) }='
             + col('{{a}}^{ {{eval:m+p;d}} }') + '$.'],
            ['m != p'],
        ),
        variation(
            'Quel réel $x$ vérifie ${{a}}^{ {{m}} }\\times{{a}}^x={{a}}^{ {{r}} }$ ?\n\n$x=?$',
            [var('a', '2|3|5|1.5'), var('m', '1.5|2|2.5|3'), var('r', '-1|-0.5|0.5|1')],
            '{{eval:r-m;d}}',
            [REGLE_PRODUIT,
             '${{a}}^{ {{m}} }\\times{{a}}^x={{a}}^{ {{m}}+x }$ : il faut ${{m}}+x={{r}}$, donc'
             ' $x={{r}}-{{m}}=' + col('{{eval:r-m;d}}') + '$.'],
        ),
    ],
    [
        spec('2^-1,5 × 2^2 = 2^0,5', 0, {'a': '2', 'm': '-1.5', 'p': '2'}, '2^{0,5}', 'correct'),
        spec('3^-3 × 3^1 = 3^-2', 0, {'a': '3', 'm': '-3', 'p': '1'}, '3^{-2}', 'correct'),
        spec('Erreur : signe perdu (3^4)', 0, {'a': '3', 'm': '-3', 'p': '1'}, '3^{4}', 'incorrect'),
        spec('Erreur : exposants multipliés (3^-3)', 0, {'a': '3', 'm': '-3', 'p': '1'}, '3^{-3}',
             'incorrect'),
        spec('Forme : 1/9 au lieu d\'une puissance', 0, {'a': '3', 'm': '-3', 'p': '1'},
             '\\frac{1}{9}', 'bad_form', ['form']),
        spec('5^-0,5 × 5^-2 = 5^-2,5', 1, {'a': '5', 'm': '-0.5', 'p': '-2'}, '5^{-2,5}', 'correct'),
        spec('Erreur : 5^1,5 (soustraction)', 1, {'a': '5', 'm': '-0.5', 'p': '-2'}, '5^{1,5}',
             'incorrect'),
        spec('Erreur : 5^2,5 (signe perdu)', 1, {'a': '5', 'm': '-0.5', 'p': '-2'}, '5^{2,5}',
             'incorrect'),
        spec('2^2,5 × 2^x = 2^-1 : x = −3,5', 2, {'a': '2', 'm': '2.5', 'r': '-1'}, '-3,5',
             'correct'),
        spec('Erreur : −1 − (−2,5)… 1,5', 2, {'a': '2', 'm': '2.5', 'r': '-1'}, '1,5', 'incorrect'),
        spec('Erreur : 3,5 (signe)', 2, {'a': '2', 'm': '2.5', 'r': '-1'}, '3,5', 'incorrect'),
    ],
    shared=DECIMAL,
)

# --- C2, TTECHNO-078 : quotient, exposants relatifs -----------------------------------------

REGLE_QUOTIENT = ('Pour $a>0$ et tous réels $x$ et $y$ : $\\dfrac{a^x}{a^y}=a^{x-y}$. On'
                  ' **soustrait** les exposants (celui du numérateur moins celui du dénominateur).')

C2 = modele(
    'Quotient de puissances (exposants relatifs)',
    'a^x / a^y = a^(x−y) : exposant négatif au résultat, au dénominateur ; 1 / a^y',
    1, 45,
    [
        variation(
            SEULE + '$\\dfrac{ {{a}}^{ {{m}} } }{ {{a}}^{ {{p}} } }$.'
            '\n\n$\\dfrac{ {{a}}^{ {{m}} } }{ {{a}}^{ {{p}} } }=?$',
            [var('a', '2|3|5|1.5'), var('m', '0.5|1|1.5|2'), var('p', '2.5|3|3.5|4')],
            case('{{a}}^{ {{eval:m-p;d}} }', **POW),
            [REGLE_QUOTIENT,
             '$\\dfrac{ {{a}}^{ {{m}} } }{ {{a}}^{ {{p}} } }={{a}}^{ {{m}}-{{p}} }='
             + col('{{a}}^{ {{eval:m-p;d}} }') + '$ : l\'exposant est négatif, car le dénominateur'
             ' l\'emporte.'],
        ),
        variation(
            SEULE + '$\\dfrac{ {{a}}^{ {{m}} } }{ {{a}}^{ {{p}} } }$.'
            '\n\n$\\dfrac{ {{a}}^{ {{m}} } }{ {{a}}^{ {{p}} } }=?$',
            [var('a', '2|3|5|1.5'), var('m', '0.5|1|1.5|2|2.5'), var('p', '-0.5|-1|-1.5|-2')],
            case('{{a}}^{ {{eval:m-p;d}} }', **POW),
            [REGLE_QUOTIENT + ' ' + REGLE_RELATIFS,
             '$\\dfrac{ {{a}}^{ {{m}} } }{ {{a}}^{ {{p}} } }={{a}}^{ {{m}}-({{p}}) }='
             + col('{{a}}^{ {{eval:m-p;d}} }') + '$ : soustraire un nombre négatif revient à'
             ' ajouter son opposé.'],
            ['m-p != 1'],
        ),
        variation(
            SEULE + '$\\dfrac{1}{ {{a}}^{ {{p}} } }$.\n\n$\\dfrac{1}{ {{a}}^{ {{p}} } }=?$',
            [var('a', '2|3|5|1.5'), var('p', '0.5|1.5|2|2.5|3')],
            case('{{a}}^{ -{{p}} }', **POW),
            ['$1={{a}}^0$, donc $\\dfrac{1}{ {{a}}^{ {{p}} } }=\\dfrac{ {{a}}^0}{ {{a}}^{ {{p}} } }$.',
             REGLE_QUOTIENT,
             '$\\dfrac{1}{ {{a}}^{ {{p}} } }={{a}}^{0-{{p}} }=' + col('{{a}}^{ -{{p}} }')
             + '$. C\'est la définition : $a^{-x}=\\dfrac{1}{a^x}$.'],
        ),
    ],
    [
        spec('2^1 / 2^3 = 2^-2', 0, {'a': '2', 'm': '1', 'p': '3'}, '2^{-2}', 'correct'),
        spec('Erreur : 2^2 (ordre inversé)', 0, {'a': '2', 'm': '1', 'p': '3'}, '2^{2}', 'incorrect'),
        spec('Forme : 1/4 au lieu d\'une puissance', 0, {'a': '2', 'm': '1', 'p': '3'},
             '\\frac{1}{4}', 'bad_form', ['form']),
        spec('1,5^0,5 / 1,5^3,5 = 1,5^-3', 0, {'a': '1.5', 'm': '0.5', 'p': '3.5'}, '1,5^{-3}',
             'correct'),
        spec('3^1,5 / 3^-2 = 3^3,5', 1, {'a': '3', 'm': '1.5', 'p': '-2'}, '3^{3,5}', 'correct'),
        spec('Erreur : 3^-0,5 (on soustrait mal)', 1, {'a': '3', 'm': '1.5', 'p': '-2'}, '3^{-0,5}',
             'incorrect'),
        spec('Erreur : 3^-3 (exposants multipliés)', 1, {'a': '3', 'm': '1.5', 'p': '-2'}, '3^{-3}',
             'incorrect'),
        spec('1 / 5^2,5 = 5^-2,5', 2, {'a': '5', 'p': '2.5'}, '5^{-2,5}', 'correct'),
        spec('Erreur : 5^2,5', 2, {'a': '5', 'p': '2.5'}, '5^{2,5}', 'incorrect'),
        spec('Erreur : −5^2,5', 2, {'a': '5', 'p': '2.5'}, '-5^{2,5}', 'incorrect'),
    ],
    shared=DECIMAL,
)

# --- C3, TTECHNO-079 : (aˣ)ⁿ = a^(nx), n entier relatif --------------------------------------

REGLE_PUISSANCE = ('Pour $a>0$, tout réel $x$ et tout entier relatif $n$ :'
                   ' $\\left(a^x\\right)^n=a^{nx}$. On **multiplie** les exposants.')

C3 = modele(
    'Puissance d\'une puissance (n entier relatif)',
    '(a^x)^n = a^(nx) avec n négatif, x négatif ; retrouver x connaissant a^(nx)',
    2, 45,
    [
        variation(
            SEULE + '$\\left({{a}}^{ {{m}} }\\right)^{ {{n}} }$.'
            '\n\n$\\left({{a}}^{ {{m}} }\\right)^{ {{n}} }=?$',
            [var('a', '2|3|5|1.5'), var('m', '0.5|1.5|2|2.5'), var('n', '-3|-2|-1')],
            case('{{a}}^{ {{eval:m*n;d}} }', **POW),
            [REGLE_PUISSANCE,
             '$\\left({{a}}^{ {{m}} }\\right)^{ {{n}} }={{a}}^{ {{m}}\\times({{n}}) }='
             + col('{{a}}^{ {{eval:m*n;d}} }') + '$.'],
            ['m*n != m+n'],
        ),
        variation(
            SEULE + '$\\left({{a}}^{ {{m}} }\\right)^{ {{n}} }$.'
            '\n\n$\\left({{a}}^{ {{m}} }\\right)^{ {{n}} }=?$',
            [var('a', '2|3|5|1.5'), var('m', '-0.5|-1.5|-2.5|-1'), var('n', '-3|-2|2|3|4')],
            case('{{a}}^{ {{eval:m*n;d}} }', **POW),
            [REGLE_PUISSANCE + ' ' + REGLE_RELATIFS,
             '$\\left({{a}}^{ {{m}} }\\right)^{ {{n}} }={{a}}^{ ({{m}})\\times{{if:n<0|({{n}})|{{n}}}} }='
             + col('{{a}}^{ {{eval:m*n;d}} }') + '$ (règle des signes du produit).'],
            ['m*n != m+n', 'm*n != 1'],
        ),
        variation(
            'Quel réel $x$ vérifie $\\left({{a}}^x\\right)^{ {{n}} }={{a}}^{ {{eval:m*n;d}} }$ ?'
            '\n\n$x=?$',
            [var('a', '2|3|5|1.5'), var('m', '-1.5|-1|-0.5|0.5|1|1.5'), var('n', '-3|-2|2|3')],
            '{{m}}',
            [REGLE_PUISSANCE,
             '$\\left({{a}}^x\\right)^{ {{n}} }={{a}}^{ {{n}}x }$ : il faut ${{n}}x={{eval:m*n;d}}$,'
             ' donc $x={{eval:m*n;d}}\\div{{if:n<0|({{n}})|{{n}}}}=' + col('{{m}}') + '$.'],
        ),
    ],
    [
        spec('(2^1,5)^-2 = 2^-3', 0, {'a': '2', 'm': '1.5', 'n': '-2'}, '2^{-3}', 'correct'),
        spec('Erreur : 2^-0,5 (exposants ajoutés)', 0, {'a': '2', 'm': '1.5', 'n': '-2'},
             '2^{-0,5}', 'incorrect'),
        spec('Erreur : 2^3 (signe perdu)', 0, {'a': '2', 'm': '1.5', 'n': '-2'}, '2^{3}',
             'incorrect'),
        spec('Forme : 1/8 au lieu d\'une puissance', 0, {'a': '2', 'm': '1.5', 'n': '-2'},
             '\\frac{1}{8}', 'bad_form', ['form']),
        spec('(3^-1,5)^-2 = 3^3', 1, {'a': '3', 'm': '-1.5', 'n': '-2'}, '3^{3}', 'correct'),
        spec('Erreur : 3^-3 (règle des signes)', 1, {'a': '3', 'm': '-1.5', 'n': '-2'}, '3^{-3}',
             'incorrect'),
        spec('(5^-0,5)^4 = 5^-2', 1, {'a': '5', 'm': '-0.5', 'n': '4'}, '5^{-2}', 'correct'),
        spec('(2^x)^-2 = 2^3 : x = −1,5', 2, {'a': '2', 'm': '-1.5', 'n': '-2'}, '-1,5', 'correct'),
        spec('Erreur : 1,5 (signe)', 2, {'a': '2', 'm': '-1.5', 'n': '-2'}, '1,5', 'incorrect'),
        spec('Erreur : 5 (3 − (−2))', 2, {'a': '2', 'm': '-1.5', 'n': '-2'}, '5', 'incorrect'),
    ],
    shared=DECIMAL,
)

# --- C4, TTECHNO-031 : a⁻ˣ = 1/aˣ -------------------------------------------------------------

REGLE_DEF = 'Pour $a>0$ et tout réel $x$ : $a^{-x}=\\dfrac{1}{a^x}$.'

C4 = modele(
    'Puissance d\'exposant négatif : a^(-x) = 1/a^x',
    'a^(−x) = 1/a^x : exposant, valeur exacte, 0,5^(−n), calculatrice, valeur passée d\'un placement',
    1, 45,
    [
        variation(
            'On sait que ${{a}}^{ -{{x}} }=\\dfrac{1}{ {{a}}^y}$. Quelle est la valeur de $y$ ?'
            '\n\n$y=?$',
            [var('a', '2|3|5|1.5|0.8'), var('x', '0.5|1.5|2|2.5|3.2')],
            '{{x}}',
            [REGLE_DEF,
             'Donc ${{a}}^{ -{{x}} }=\\dfrac{1}{ {{a}}^{ {{x}} } }$ et $y=' + col('{{x}}')
             + '$ : l\'exposant négatif « passe au dénominateur » en changeant de signe.'],
        ),
        variation(
            'Donne la valeur exacte de ${{a}}^{ -{{n}} }$.\n\n${{a}}^{ -{{n}} }=?$',
            [var('a', '2|3|4|5|10'), var('n', '1|2|3')],
            '\\frac{1}{ {{eval:a^n}} }',
            [REGLE_DEF,
             '${{a}}^{ -{{n}} }=\\dfrac{1}{ {{a}}^{ {{n}} } }=' + col('\\dfrac{1}{ {{eval:a^n}} }')
             + '$. Un exposant négatif ne rend pas le nombre négatif.'],
            ['a^n <= 125'],
        ),
        variation(
            'Donne la valeur exacte de $0{,}5^{ -{{n}} }$.\n\n$0{,}5^{ -{{n}} }=?$',
            [var('n', '1..4')],
            '{{eval:2^n}}',
            [REGLE_DEF,
             '$0{,}5^{ -{{n}} }=\\dfrac{1}{0{,}5^{ {{n}} } }=\\dfrac{1}{ {{eval:0.5^n;d}} }='
             + col('{{eval:2^n}}') + '$. Ici $0<a<1$ : l\'exposant négatif donne un nombre plus'
             ' grand que $1$.'],
        ),
        variation(
            'Calcule ${{a}}^{ -{{x}} }$ à la calculatrice, arrondi au centième.'
            '\n\n${{a}}^{ -{{x}} }\\approx ?$',
            [var('a', '1.5|2|3|0.8'), var('x', '0.5|1.2|1.5|2.5')],
            case('{{eval:round(100*a^(-x))/100;d}}', precision=arrondi(2)),
            [REGLE_DEF + ' On peut taper directement l\'exposant négatif, entre parenthèses.',
             '${{a}}^{ -{{x}} }=\\dfrac{1}{ {{a}}^{ {{x}} } }\\approx'
             + col('{{eval:round(100*a^(-x))/100;d}}') + '$.'],
        ),
        variation(
            'Un capital placé à intérêts composés à ${{t}}~\\%$ par an vaut aujourd\'hui'
            ' ${{c}}~\\unit{€}$. Sa valeur, en euros, $x$ années après aujourd\'hui est'
            ' $V(x)={{c}}\\times{{eval:1+t/100;d}}^x$ ; pour une date passée, $x$ est négatif.\n\n'
            'Quelle était la valeur du capital il y a ${{y}}$ ans ? Arrondis au centime.\n\n'
            '$V(-{{y}})\\approx ?$',
            [var('c', '2000|5000|8000'), var('t', '2|3|4'), var('y', '2|3|1.5|2.5')],
            case('{{eval:round(100*c*(1+t/100)^(-y))/100;d}}', precision=arrondi(2)),
            ['Il y a ${{y}}$ ans : $x=-{{y}}$. $V(-{{y}})={{c}}\\times{{eval:1+t/100;d}}^{ -{{y}} }'
             '=\\dfrac{ {{c}} }{ {{eval:1+t/100;d}}^{ {{y}} } }$.',
             'À la calculatrice : $V(-{{y}})\\approx'
             + col('{{eval:round(100*c*(1+t/100)^(-y))/100;d}}') + '$ €. On divise par'
             ' ${{eval:1+t/100;d}}$ pour chaque année passée, on ne retire pas ${{t}}~\\%$.'],
        ),
    ],
    [
        spec('3^-2,5 = 1/3^y : y = 2,5', 0, {'a': '3', 'x': '2.5'}, '2,5', 'correct'),
        spec('Erreur : −2,5', 0, {'a': '3', 'x': '2.5'}, '-2,5', 'incorrect'),
        spec('2^-3 = 1/8', 1, {'a': '2', 'n': '3'}, '\\frac{1}{8}', 'correct'),
        spec('2^-3 = 0,125', 1, {'a': '2', 'n': '3'}, '0,125', 'correct'),
        spec('Erreur : −8', 1, {'a': '2', 'n': '3'}, '-8', 'incorrect'),
        spec('Erreur : −6', 1, {'a': '2', 'n': '3'}, '-6', 'incorrect'),
        spec('Erreur : 1/6', 1, {'a': '2', 'n': '3'}, '\\frac{1}{6}', 'incorrect'),
        spec('10^-2 = 1/100', 1, {'a': '10', 'n': '2'}, '\\frac{1}{100}', 'correct'),
        spec('0,5^-3 = 8', 2, {'n': '3'}, '8', 'correct'),
        spec('Erreur : 0,125', 2, {'n': '3'}, '0,125', 'incorrect'),
        spec('Erreur : −1,5', 2, {'n': '3'}, '-1,5', 'incorrect'),
        spec('2^-1,5 ≈ 0,35', 3, {'a': '2', 'x': '1.5'}, '0,35', 'correct'),
        spec('Erreur : −2,83', 3, {'a': '2', 'x': '1.5'}, '-2,83', 'incorrect'),
        spec('Erreur : −3', 3, {'a': '2', 'x': '1.5'}, '-3', 'incorrect'),
        spec('0,8^-2,5 ≈ 1,75', 3, {'a': '0.8', 'x': '2.5'}, '1,75', 'correct'),
        spec('5000 × 1,03^-2 ≈ 4712,98', 4, {'c': '5000', 't': '3', 'y': '2'}, '4712,98',
             'correct'),
        spec('Erreur : 5000 − 6 % = 4700', 4, {'c': '5000', 't': '3', 'y': '2'}, '4700',
             'incorrect'),
        spec('Erreur : 5000 × 1,03^2 ≈ 5304,50', 4, {'c': '5000', 't': '3', 'y': '2'}, '5304,5',
             'incorrect'),
    ],
    shared=DECIMAL,
)

MODELES = [('01-produit-puissances-exposants-relatifs', C1),
           ('02-quotient-puissances-exposants-relatifs', C2),
           ('03-puissance-puissance-n-relatif', C3),
           ('04-exposant-negatif-inverse', C4)]

os.makedirs(DOSSIER, exist_ok=True)
for nom, m in MODELES:
    chemin = os.path.join(DOSSIER, nom + '.json')
    with open(chemin, 'w', encoding='utf-8') as f:
        json.dump(m, f, ensure_ascii=False, indent='\t')
        f.write('\n')
    print('écrit', chemin)
