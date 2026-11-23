"""Écrit les 3 modèles du lot 5b « logarithme décimal : équations, inéquations, seuils » de la
Terminale technologique (STMG) dans scripts/questions/ttechno-5b-log-resolutions/.

Phase 0 validée par David le 2026-11-18 (journal docs/archive/wip/questions-ttechno-progress.md § 34,
Q24–Q25 : « je suis tes recos ») :

| #  | Point        | Nœud (posé par la migration)                   | Niveau | Réponse                          |
| L7 | TTECHNO-043  | Logarithmes › équations et inéquations         | 2 | valeur exacte en log, arrondis       |
| L8 | TTECHNO-084  | Logarithmes › équations et inéquations         | 3 | intervalle (valeur exacte en log)    |
| L9 | TTECHNO-085  | Logarithmes › équations et inéquations         | 2 | entier                               |

Q25 : valeur exacte quand l'énoncé est purement algébrique (2ˣ = 5 ⇒ x = log 5 / log 2), arrondi quand il
y a un contexte. Saisie de « log » au clavier réglée par #2839 (§ 36) : les modèles qui la demandent (L7,
L8) ne se publient qu'après le deploy:prod qui livre #2839.

Bornes (BO Tle techno p.8-9, ttechno.md, ltt-1) : log décimal seulement ; x réel admis dans les
résolutions (aˣ = b, aˣ < b, xᵃ = b) ; aⁿ < b d'inconnue n entière (annuités). Ni ln, ni base e.
Calques ln repris en idées, originaux intacts (Q3) : d3301f2d, 14036c68, f1963ef2.
`grades` = ['T_TECHNO'] seul.

Pièges : jamais de variable `e` ni `i` ; eval ne connaît ni `>` ni `==` ; `round(…, n)` refusé ;
{{var}} décimale calculée s'écrit en fraction → afficher par {{eval:var;d}}.

    python3 docs/wip/questions/lot-ttechno-5b.py scripts/questions/ttechno-5b-log-resolutions
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


DECIMAL = {'blankDefaults': {'acceptDecimal': True}}
INTERVALLES = {'blankDefaults': {'answerKind': 'intervalles'}}
DEF = 'Pour $b>0$, $10^x=b$ a une unique solution : $x=\\log(b)$.'
PREND_LOG = ('Les deux membres sont strictement positifs : on prend leur logarithme, qui garde l\'égalité'
             ' (ou le sens de l\'inégalité, car $\\log$ est strictement croissante), et on utilise'
             ' $\\log\\left(a^x\\right)=x\\log(a)$.')
SIGNE_LOG = 'Pour $a>1$, $\\log(a)>0$ ; pour $0<a<1$, $\\log(a)<0$ : diviser par $\\log(a)$ change alors le sens.'
NON_ENTIER = 'abs(x-round(x)) > 0.001'
# log(b)/log(a) pour l'énoncé algébrique : a et b tels que le quotient ne soit pas entier.
A_ENT = '2|3|5|7'
B_ENT = '3|5|6|10|11|12|15|20|50'
QUOT = '\\dfrac{\\log({{b}})}{\\log({{a}})}'

# --- L7, TTECHNO-043 : équations aˣ = b, xᵃ = b ---------------------------------------------

L7 = modele(
    'Résoudre une équation aˣ = b ou xᵃ = b avec log',
    '10ˣ = b ; aˣ = b en valeur exacte ; k·aˣ = b au centième ; capital doublé (durée réelle) ;'
    ' xᵃ = b, x > 0 ; taux d\'évolution annuel moyen',
    2, 90,
    [
        variation(
            'Résous l\'équation $10^x={{b}}$. Donne la valeur exacte.\n\n$x=?$',
            [var('b', '2|3|5|7|15|40|0.3')],
            '\\log({{b}})',
            [DEF, '$10^x={{eval:b;d}}\\iff x=' + col('\\log({{eval:b;d}})') + '$.'],
        ),
        variation(
            'Résous l\'équation ${{a}}^x={{b}}$. Donne la valeur exacte.\n\n$x=?$',
            [var('a', A_ENT), var('b', B_ENT), var('x', 'eval:log(b)/log(a)')],
            QUOT,
            [PREND_LOG,
             '${{a}}^x={{b}}\\iff x\\log({{a}})=\\log({{b}})\\iff x=' + col(QUOT) + '$'
             ' (environ ${{eval:round(100*x)/100;d}}$).'],
            [NON_ENTIER],
        ),
        variation(
            'Résous l\'équation ${{k}}\\times{{a}}^x={{b}}$. Donne une valeur approchée de la solution'
            ' au centième.\n\n$x\\approx ?$',
            [var('k', '2..5'), var('a', '2|3|5'), var('b', '30..90'),
             var('x', 'eval:log(b/k)/log(a)')],
            case('{{eval:round(100*x)/100;d}}', precision=arrondi(2)),
            ['On isole d\'abord la puissance : ${{a}}^x=\\dfrac{ {{b}} }{ {{k}} }$.',
             PREND_LOG,
             '$x=\\dfrac{\\log\\left(\\frac{ {{b}} }{ {{k}} }\\right)}{\\log({{a}})}\\approx'
             + col('{{eval:round(100*x)/100;d}}') + '$.'],
            [NON_ENTIER, 'abs(b/k-round(b/k)) > 0.001'],
        ),
        variation(
            'Un capital placé à intérêts composés au taux annuel de ${{t}}\\,\\%$ est multiplié par'
            ' ${{eval:1+t/100;d}}^x$ au bout de $x$ années.\n\nRésous l\'équation'
            ' ${{eval:1+t/100;d}}^x=2$ pour trouver la durée au bout de laquelle le capital a doublé.'
            ' Donne une valeur approchée au centième.\n\n$x\\approx ?$',
            [var('t', '2..8'), var('x', 'eval:log(2)/log(1+t/100)')],
            case('{{eval:round(100*x)/100;d}}', precision=arrondi(2)),
            [PREND_LOG,
             '$x=\\dfrac{\\log(2)}{\\log({{eval:1+t/100;d}})}\\approx' + col('{{eval:round(100*x)/100;d}}')
             + '$ : le capital double entre ${{eval:floor(x)}}$ et ${{eval:floor(x)+1}}$ ans.'],
            ['abs(x-round(x)) > 0.01'],
        ),
        variation(
            'Résous dans $\\left]0\\,;+\\infty\\right[$ l\'équation $x^{ {{a}} }={{b}}$. Donne une valeur'
            ' approchée de la solution au centième.\n\n$x\\approx ?$',
            [var('a', '3|4|5'), var('b', '10..90'), var('x', 'eval:10^(log(b)/a)')],
            case('{{eval:round(100*x)/100;d}}', precision=arrondi(2)),
            ['$x>0$ et ${{b}}>0$ : on prend le logarithme des deux membres.',
             '$\\log\\left(x^{ {{a}} }\\right)=\\log({{b}})\\iff {{a}}\\log(x)=\\log({{b}})\\iff'
             ' \\log(x)=\\dfrac{\\log({{b}})}{ {{a}} }$.',
             '$x=10^{\\frac{\\log({{b}})}{ {{a}} }}\\approx' + col('{{eval:round(100*x)/100;d}}') + '$'
             ' (c\'est aussi ${{b}}^{\\frac{1}{ {{a}} }}$).'],
            [NON_ENTIER],
        ),
        variation(
            'Le prix d\'un article a augmenté de ${{p}}\\,\\%$ en ${{n}}$ ans. On cherche le taux'
            ' d\'évolution annuel moyen $t$, tel que $(1+t)^{ {{n}} }={{eval:1+p/100;d}}$.\n\n'
            'Donne ce taux en pourcentage, arrondi au dixième.\n\n$t\\approx ?\\,\\%$',
            [var('p', '20|30|40|50|60|80'), var('n', '3..8'),
             var('x', 'eval:10^(log(1+p/100)/n)')],
            case('{{eval:round(1000*(x-1))/10;d}}', precision=arrondi(1)),
            ['On pose $X=1+t>0$ : $X^{ {{n}} }={{eval:1+p/100;d}}\\iff {{n}}\\log(X)='
             '\\log({{eval:1+p/100;d}})$.',
             '$X=10^{\\frac{\\log({{eval:1+p/100;d}})}{ {{n}} }}\\approx{{eval:round(10000*x)/10000;d}}$,'
             ' donc $t\\approx' + col('{{eval:round(1000*(x-1))/10;d}}') + '\\,\\%$ par an.',
             'Ce n\'est pas ${{p}}\\div{{n}}$ : les hausses successives se multiplient.'],
        ),
    ],
    [
        spec('10^x = 7 : x = log 7', 0, {'b': '7'}, '\\log(7)', 'correct'),
        spec('log 7 sans parenthèses', 0, {'b': '7'}, '\\log 7', 'correct'),
        spec('Erreur : 7/10', 0, {'b': '7'}, '\\dfrac{7}{10}', 'incorrect'),
        spec('2^x = 5 : log 5 / log 2', 1, {'a': '2', 'b': '5'}, '\\dfrac{\\log(5)}{\\log(2)}', 'correct'),
        spec('2^x = 5 : \\frac sans parenthèses', 1, {'a': '2', 'b': '5'}, '\\frac{\\log 5}{\\log 2}', 'correct'),
        spec('Erreur : valeur approchée 2,32 (exacte demandée)', 1, {'a': '2', 'b': '5'}, '2,32', 'incorrect'),
        spec('Erreur : log(5/2)', 1, {'a': '2', 'b': '5'}, '\\log\\left(\\dfrac{5}{2}\\right)', 'incorrect'),
        spec('Erreur : 5/2', 1, {'a': '2', 'b': '5'}, '\\dfrac{5}{2}', 'incorrect'),
        spec('3 × 2^x = 50 : 4,06', 2, {'k': '3', 'a': '2', 'b': '50'}, '4,06', 'correct'),
        spec('Erreur : log(50)/log(6) ≈ 2,18', 2, {'k': '3', 'a': '2', 'b': '50'}, '2,18', 'incorrect'),
        spec('1,04^x = 2 : 17,67', 3, {'t': '4'}, '17,67', 'correct'),
        spec('Erreur : 2/1,04 ≈ 1,92', 3, {'t': '4'}, '1,92', 'incorrect'),
        spec('x^3 = 20 : 2,71', 4, {'a': '3', 'b': '20'}, '2,71', 'correct'),
        spec('Erreur : 20/3 ≈ 6,67', 4, {'a': '3', 'b': '20'}, '6,67', 'incorrect'),
        spec('+50 % en 5 ans : 8,4 %', 5, {'p': '50', 'n': '5'}, '8,4', 'correct'),
        spec('Erreur : 50/5 = 10', 5, {'p': '50', 'n': '5'}, '10', 'incorrect'),
    ],
    shared=DECIMAL,
)

# --- L8, TTECHNO-084 : inéquations aˣ < b, xᵃ < b ----------------------------------------------

L8 = modele(
    'Résoudre une inéquation aˣ < b ou xᵃ < b avec log',
    'aˣ < b et aˣ ⩾ b pour a > 1 ; aˣ > b pour 0 < a < 1 (le sens change) ; xᵃ ⩽ b pour x > 0 ;'
    ' réponse en intervalle, bornes exactes',
    3, 120,
    [
        variation(
            'Résous l\'inéquation ${{a}}^x<{{b}}$. Donne l\'ensemble des solutions, bornes en valeur'
            ' exacte.\n\n$S=?$',
            [var('a', A_ENT), var('b', B_ENT), var('x', 'eval:log(b)/log(a)')],
            ']-\\infty;' + QUOT + '[',
            [PREND_LOG,
             '${{a}}^x<{{b}}\\iff x\\log({{a}})<\\log({{b}})\\iff x<' + QUOT + '$, car $\\log({{a}})>0$.',
             '$S=' + col('\\left]-\\infty\\,;' + QUOT + '\\right[') + '$.'],
            [NON_ENTIER],
        ),
        variation(
            'Résous l\'inéquation ${{a}}^x\\geqslant{{b}}$. Donne l\'ensemble des solutions, bornes en'
            ' valeur exacte.\n\n$S=?$',
            [var('a', A_ENT), var('b', B_ENT), var('x', 'eval:log(b)/log(a)')],
            '[' + QUOT + ';+\\infty[',
            [PREND_LOG,
             '${{a}}^x\\geqslant{{b}}\\iff x\\log({{a}})\\geqslant\\log({{b}})\\iff x\\geqslant'
             + QUOT + '$, car $\\log({{a}})>0$.',
             '$S=' + col('\\left[' + QUOT + '\\,;+\\infty\\right[') + '$.'],
            [NON_ENTIER],
        ),
        variation(
            'Résous l\'inéquation ${{eval:a;d}}^x>{{eval:b;d}}$. Donne l\'ensemble des solutions,'
            ' bornes en valeur exacte.\n\n$S=?$',
            [var('a', '0.2|0.5|0.8|0.9'), var('b', '0.1|0.3|0.05|0.01'),
             var('x', 'eval:log(b)/log(a)')],
            ']-\\infty;\\dfrac{\\log({{b}})}{\\log({{a}})}[',
            [PREND_LOG,
             '${{eval:a;d}}^x>{{eval:b;d}}\\iff x\\log({{eval:a;d}})>\\log({{eval:b;d}})$.',
             SIGNE_LOG + ' Ici $\\log({{eval:a;d}})<0$ : $x<\\dfrac{\\log({{eval:b;d}})}{\\log({{eval:a;d}})}$.',
             '$S=' + col('\\left]-\\infty\\,;\\dfrac{\\log({{eval:b;d}})}{\\log({{eval:a;d}})}\\right[')
             + '$ (borne environ ${{eval:round(100*x)/100;d}}$).'],
            [NON_ENTIER],
        ),
        variation(
            'Résous dans $\\left]0\\,;+\\infty\\right[$ l\'inéquation $x^{ {{a}} }\\leqslant{{eval:c^a}}$.'
            '\n\n$S=?$',
            [var('a', '2..4'), var('c', '2..5')],
            ']0;{{c}}]',
            ['$x>0$ : on prend le logarithme des deux membres, ce qui garde le sens.',
             '$x^{ {{a}} }\\leqslant{{eval:c^a}}\\iff {{a}}\\log(x)\\leqslant\\log({{eval:c^a}})'
             '\\iff\\log(x)\\leqslant\\dfrac{\\log({{eval:c^a}})}{ {{a}} }=\\log({{c}})$,'
             ' car ${{eval:c^a}}={{c}}^{ {{a}} }$.',
             '$\\log$ est strictement croissante : $x\\leqslant{{c}}$. Avec $x>0$ :'
             ' $S=' + col('\\left]0\\,;{{c}}\\right]') + '$.'],
        ),
    ],
    [
        spec('2^x < 5 : ]−∞ ; log 5/log 2[', 0, {'a': '2', 'b': '5'},
             ']-\\infty;\\dfrac{\\log(5)}{\\log(2)}[', 'correct'),
        spec('Erreur : sens changé', 0, {'a': '2', 'b': '5'},
             ']\\dfrac{\\log(5)}{\\log(2)};+\\infty[', 'incorrect'),
        spec('Erreur : borne approchée (exacte demandée)', 0, {'a': '2', 'b': '5'}, ']-\\infty;2,32[', 'incorrect'),
        spec('Erreur : borne fermée', 0, {'a': '2', 'b': '5'},
             ']-\\infty;\\dfrac{\\log(5)}{\\log(2)}]', 'incorrect'),
        spec('3^x ⩾ 20 : [log 20/log 3 ; +∞[', 1, {'a': '3', 'b': '20'},
             '[\\dfrac{\\log(20)}{\\log(3)};+\\infty[', 'correct'),
        spec('Erreur : log(20/3)', 1, {'a': '3', 'b': '20'},
             '[\\log(\\dfrac{20}{3});+\\infty[', 'incorrect'),
        spec('0,5^x > 0,1 : ]−∞ ; log 0,1/log 0,5[', 2, {'a': '0.5', 'b': '0.1'},
             ']-\\infty;\\dfrac{\\log(0.1)}{\\log(0.5)}[', 'correct'),
        spec('Erreur : sens non changé', 2, {'a': '0.5', 'b': '0.1'},
             ']\\dfrac{\\log(0.1)}{\\log(0.5)};+\\infty[', 'incorrect'),
        spec('x³ ⩽ 64 : ]0 ; 4]', 3, {'a': '3', 'c': '4'}, ']0;4]', 'correct'),
        spec('Erreur : x > 0 oublié', 3, {'a': '3', 'c': '4'}, ']-\\infty;4]', 'incorrect'),
        spec('Erreur : 64/3', 3, {'a': '3', 'c': '4'}, ']0;\\dfrac{64}{3}]', 'incorrect'),
    ],
    shared=INTERVALLES,
)

# --- L9, TTECHNO-085 : seuil aⁿ < b, n entier naturel ------------------------------------------

L9 = modele(
    'Seuil : plus petit entier n tel que aⁿ < b (logarithme décimal)',
    'qⁿ < 10⁻ᵗ ; capital qui double (nombre d\'années) ; dépréciation d\'une machine ; aⁿ > 10ᵏ ;'
    ' inconnue entière, résolution par log',
    2, 90,
    [
        variation(
            'Détermine le plus petit entier naturel $n$ tel que ${{eval:k/10;d}}^{n}<{{eval:10^(-t);d}}$.'
            '\n\n$n=?$',
            [var('k', '5..9'), var('t', '1..3'), var('x', 'eval:-t/log(k/10)')],
            '{{eval:floor(x)+1}}',
            [PREND_LOG,
             '$n\\log({{eval:k/10;d}})<-{{t}}$. ' + SIGNE_LOG
             + ' Ici $\\log({{eval:k/10;d}})<0$ : $n>\\dfrac{-{{t}}}{\\log({{eval:k/10;d}})}\\approx'
             '{{eval:round(100*x)/100;d}}$.',
             'Le plus petit entier qui convient : $n=' + col('{{eval:floor(x)+1}}') + '$.'],
            [NON_ENTIER],
        ),
        variation(
            'Un capital de ${{c}}~\\unit{€}$ est placé à intérêts composés au taux annuel de ${{t}}\\,\\%$ :'
            ' au bout de $n$ années, il vaut ${{c}}\\times{{eval:1+t/100;d}}^{n}$ euros.\n\n'
            'Au bout de combien d\'années entières le capital aura-t-il au moins doublé ?\n\n$n=?$',
            [var('c', '1000|2000|5000'), var('t', '2..8'), var('x', 'eval:log(2)/log(1+t/100)')],
            '{{eval:floor(x)+1}}',
            ['${{c}}\\times{{eval:1+t/100;d}}^{n}\\geqslant{{eval:2*c}}\\iff{{eval:1+t/100;d}}^{n}'
             '\\geqslant2$.',
             PREND_LOG,
             '$n\\geqslant\\dfrac{\\log(2)}{\\log({{eval:1+t/100;d}})}\\approx{{eval:round(100*x)/100;d}}$,'
             ' car $\\log({{eval:1+t/100;d}})>0$.',
             'Le capital a doublé au bout de $' + col('{{eval:floor(x)+1}}') + '$ ans.'],
            [NON_ENTIER],
        ),
        variation(
            'Une machine achetée ${{v}}~\\unit{€}$ perd ${{p}}\\,\\%$ de sa valeur chaque année : au bout de'
            ' $n$ années, elle vaut ${{v}}\\times{{eval:1-p/100;d}}^{n}$ euros.\n\n'
            'Au bout de combien d\'années entières sa valeur sera-t-elle inférieure à ${{s}}~\\unit{€}$ ?'
            '\n\n$n=?$',
            [var('v', '8000|9000|12000'), var('p', '10|15|20|25|30'), var('s', '1000|1500|2000'),
             var('x', 'eval:log(s/v)/log(1-p/100)')],
            '{{eval:floor(x)+1}}',
            ['${{v}}\\times{{eval:1-p/100;d}}^{n}<{{s}}\\iff{{eval:1-p/100;d}}^{n}<\\dfrac{ {{s}} }{ {{v}} }$.',
             PREND_LOG,
             SIGNE_LOG + ' Ici $\\log({{eval:1-p/100;d}})<0$ : $n>\\dfrac{\\log\\left(\\frac{ {{s}} }{ {{v}} }'
             '\\right)}{\\log({{eval:1-p/100;d}})}\\approx{{eval:round(100*x)/100;d}}$.',
             'Sa valeur passe sous ${{s}}~\\unit{€}$ au bout de $' + col('{{eval:floor(x)+1}}') + '$ ans.'],
            [NON_ENTIER],
        ),
        variation(
            'Détermine le plus petit entier naturel $n$ tel que ${{a}}^{n}>10^{ {{k}} }$.\n\n$n=?$',
            [var('a', '2|3|5|7'), var('k', '3..9'), var('x', 'eval:k/log(a)')],
            '{{eval:floor(x)+1}}',
            [PREND_LOG,
             '$n\\log({{a}})>{{k}}\\iff n>\\dfrac{ {{k}} }{\\log({{a}})}\\approx{{eval:round(100*x)/100;d}}$,'
             ' car $\\log({{a}})>0$.',
             'Le plus petit entier qui convient : $n=' + col('{{eval:floor(x)+1}}') + '$.'],
            [NON_ENTIER],
        ),
    ],
    [
        spec('0,8^n < 0,01 : 21', 0, {'k': '8', 't': '2'}, '21', 'correct'),
        spec('Erreur : partie entière sans + 1 (20)', 0, {'k': '8', 't': '2'}, '20', 'incorrect'),
        spec('Erreur : 22', 0, {'k': '8', 't': '2'}, '22', 'incorrect'),
        spec('Capital à 4 % : 18 ans', 1, {'c': '1000', 't': '4'}, '18', 'correct'),
        spec('Erreur : 17 (troncature)', 1, {'c': '1000', 't': '4'}, '17', 'incorrect'),
        spec('Machine 8000 €, −20 %, < 1000 € : 10 ans', 2, {'v': '8000', 'p': '20', 's': '1000'}, '10',
             'correct'),
        spec('Erreur : 9', 2, {'v': '8000', 'p': '20', 's': '1000'}, '9', 'incorrect'),
        spec('2^n > 10^3 : 10', 3, {'a': '2', 'k': '3'}, '10', 'correct'),
        spec('Erreur : 9', 3, {'a': '2', 'k': '3'}, '9', 'incorrect'),
    ],
)

MODELES = [('01-logarithme-equations', L7),
           ('02-logarithme-inequations', L8),
           ('03-logarithme-seuil-entier', L9)]

os.makedirs(DOSSIER, exist_ok=True)
for nom, m in MODELES:
    chemin = os.path.join(DOSSIER, nom + '.json')
    with open(chemin, 'w', encoding='utf-8') as f:
        json.dump(m, f, ensure_ascii=False, indent='\t')
        f.write('\n')
    print('écrit', chemin)
