"""Écrit les 6 modèles du lot 13 « approfondissements : convexité, dérivation, fonctions usuelles »
de la terminale spé dans scripts/questions/tspe-approfondissements-13/.

Phase 0 validée par David le 2026-11-13 (D3 du journal
« docs/wip/questions-tspe-demonstrations-progress.md », § 35), un point par modèle :

| # | Point    | Titre                                                  | Niv. | Nœud du modèle                                  |
| 1 | TSPE-422 | Courbe de Lorenz et indice de Gini                     | 4    | Convexité › caractérisations ¹                  |
| 2 | TSPE-423 | Dérivée n-ième d'une fonction                          | 8    | Dérivation › fonctions dérivées ¹               |
| 3 | TSPE-424 | Inégalité arithmético-géométrique                      | 5    | Convexité › inégalités de convexité             |
| 4 | TSPE-451 | Fonction x ↦ xᵃ : définition, valeurs, dérivée         | 4    | Logarithmes › propriétés algébriques ¹          |
| 5 | TSPE-452 | Démontrer que (1 + x/n)ⁿ tend vers eˣ                  | 9    | Fonction exponentielle › propriétés algébriques ¹ |
| 6 | TSPE-460 | Fonction tangente : propriétés, dérivée, tangente      | 5    | Fonctions trigonométriques › dérivées et variations ¹ |

¹ Point posé sur la notion ; le modèle va sur la sous-notion (D3, Q3). Niveaux au-dessus de ceux
de la prod (relevé MCP du 2026-11-14 : 3, 7, 4, 3, 8, 4 au plus).

Forme (D3, Q2) : 424 et 452 sont des preuves (cases, cases choix à 4 propositions dont la première
est la bonne, variation « étapes à ranger », positions calculées par le générateur, graine 0) ;
422, 423, 451, 460 des applications à valeurs tirées. Le résultat hors programme est donné dans
l'énoncé (définition de la courbe de Lorenz et de l'indice de Gini ; xᵃ = e^{a ln x}).

Pièges : pas de variable `e` ni `i` (lues comme le nombre d'Euler et l'imaginaire) ; un coefficient tiré dans un exposant
ne vaut jamais ±1 (`e^{1x}` ne serait pas nettoyé) ; le numérateur d'une fraction tirée reste
positif (signe sorti de la fraction).

    python3 docs/archive/wip/questions-tspe-demonstrations/lot-tspe-approfondissements-13.py scripts/questions/tspe-approfondissements-13
"""
import json
import os
import subprocess
import sys

DOSSIER = sys.argv[1]


def spec(desc, vi, answer, status, variables=None):
    expected = {'status': status}
    answers = answer if isinstance(answer, list) else [answer]
    return {'description': desc, 'variationIndex': vi,
            'variables': {k: str(v) for k, v in (variables or {}).items()},
            'answers': answers, 'expected': expected}


def modele(nom, title, description, level, variations, specs):
    return nom, {'title': title, 'description': description, 'grades': ['T_SPE'],
                 'level': level, 'delay': 120, 'status': 'draft',
                 'shared': {'cleanCoefficients': True},
                 'variations': variations, 'testSpecs': specs}


def var(nom, expression):
    return {'name': nom, 'expression': expression}


def ev(x):
    return '{{eval:' + x + '}}'


def cf(k):
    """Coefficient devant une lettre : 1 et −1 écrits sans chiffre (le nettoyage ne passe pas
    dans les formules en f(x) = …)."""
    return '{{if:' + k + '==1||{{if:' + k + '==-1|-|' + ev(k) + '}}}}'


def cfs(k):
    """Coefficient signé devant une lettre (+x, −x, +3x)."""
    return '{{if:' + k + '==1|+|{{if:' + k + '==-1|-|' + ev(k + ';+') + '}}}}'


def col(x, k=0):
    return '\\textcolor{{{color:primary.' + str(k) + '}}}{' + x + '}'


def choix(lignes):
    return '\n\n```choix\n' + ''.join('- ' + l + '\n' for l in lignes) + '```'


def case(statement, variables, attendus, steps, conditions=None):
    """Variation à une ou plusieurs cases ouvertes (`?` dans une formule de l'énoncé)."""
    attendus = attendus if isinstance(attendus, list) else [attendus]
    v = {'statement': statement, 'variables': variables,
         'blanks': [{'expectedAnswer': a} for a in attendus],
         'correction': {'steps': steps}}
    if conditions:
        v['conditions'] = conditions
    return v


def justification(statement, variables, bonne, autres, steps, conditions=None):
    """Variation à une case choix : la première proposition est la bonne (index 0)."""
    v = {'statement': statement + choix([bonne] + autres), 'variables': variables,
         'blanks': [{'expectedAnswer': '0'}], 'correction': {'steps': steps}}
    if conditions:
        v['conditions'] = conditions
    return v


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



def signe(k):
    """Signe d'une quantité tirée, à sortir d'une fraction : + ou −."""
    return '{{if:' + k + '>0|+|-}}'


def moins(k):
    """Signe d'une quantité tirée devant une expression : rien ou −."""
    return '{{if:' + k + '<0|-|}}'


def frac_signee(k, den):
    """± |k|/den, le signe sorti de la fraction."""
    return signe(k) + '\\dfrac{' + ev('abs(' + k + ')') + '}{' + den + '}'


LIM_N = '\\displaystyle\\lim_{n\\to+\\infty}'
INT01 = '\\displaystyle\\int_0^1'
MODELES = []

# --- 1. TSPE-422 : courbe de Lorenz -----------------------------------------------------------

RAPPEL_422 = (
    'On range la population d\'un pays par revenus croissants. Pour $x\\in[0;1]$, $L(x)$ est la part'
    ' du revenu total perçue par la proportion $x$ de la population aux revenus les plus faibles.'
    ' La courbe de $L$ est la **courbe de Lorenz** ; on admet que $L(0)=0$, $L(1)=1$, que $L$ est'
    ' croissante et convexe sur $[0;1]$, et que $L(x)\\leqslant x$. L\'**indice de Gini** est'
    ' $G=1-2' + INT01 + 'L(x)\\,\\mathrm{d}x$ : il vaut $0$ quand les revenus sont égaux.')

V422_LAQUELLE = justification(
    RAPPEL_422 + '\n\nLaquelle de ces fonctions, définies sur $[0;1]$, peut être une fonction de'
    ' Lorenz ?',
    [var('k', '2|4|6')],
    '$L(x)=x^{' + ev('k') + '}$',
    ['$L(x)=\\sqrt{x}$', '$L(x)=\\dfrac{x}{2}$', '$L(x)=2x-x^2$'],
    ['$x\\mapsto\\dfrac{x}{2}$ ne convient pas : $L(1)$ doit valoir $1$.',
     '$x\\mapsto\\sqrt{x}$ et $x\\mapsto 2x-x^2$ sont concaves, et leur courbe passe au-dessus de la'
     ' droite $y=x$ : elles donneraient aux plus pauvres plus que leur part.',
     '$x\\mapsto x^{' + ev('k') + '}$ vaut $0$ en $0$, $1$ en $1$, est croissante, convexe (dérivée'
     ' seconde positive) et $x^{' + ev('k') + '}\\leqslant x$ sur $[0;1]$ : $'
     + col('L(x)=x^{' + ev('k') + '}') + '$ convient.'])

V422_PUISSANCE = case(
    RAPPEL_422 + '\n\nDans un pays, $L(x)=x^{' + ev('k') + '}$. Calcule son indice de Gini.'
    '\n\n$G=?$',
    [var('k', '2|4|6')], ev('(k-1)/(k+1)'),
    ['$' + INT01 + 'x^{' + ev('k') + '}\\,\\mathrm{d}x=\\left[\\dfrac{x^{' + ev('k+1') + '}}{'
     + ev('k+1') + '}\\right]_0^1=\\dfrac{1}{' + ev('k+1') + '}$.',
     '$G=1-\\dfrac{2}{' + ev('k+1') + '}=\\dfrac{' + ev('k-1') + '}{' + ev('k+1') + '}$.',
     'Donc $' + col('G=\\dfrac{' + ev('k-1') + '}{' + ev('k+1') + '}') + '$.'])

V422_MELANGE = case(
    RAPPEL_422 + '\n\nDans un pays, $L(x)=\\dfrac{' + ev('p') + '}{' + ev('q') + '}x^2+\\dfrac{'
    + ev('q-p') + '}{' + ev('q') + '}x$. Calcule son indice de Gini.\n\n$G=?$',
    [var('q', '2..5'), var('p', '1..{{eval:q-1}}')], ev('p/(3*q)'),
    ['$' + INT01 + 'L(x)\\,\\mathrm{d}x=\\dfrac{' + ev('p') + '}{' + ev('q') + '}\\times\\dfrac{1}{3}'
     '+\\dfrac{' + ev('q-p') + '}{' + ev('q') + '}\\times\\dfrac{1}{2}$.',
     '$G=1-\\dfrac{2\\times' + ev('p') + '}{3\\times' + ev('q') + '}-\\dfrac{' + ev('q-p') + '}{'
     + ev('q') + '}=\\dfrac{' + ev('p') + '}{' + ev('q') + '}-\\dfrac{2\\times' + ev('p')
     + '}{3\\times' + ev('q') + '}$.',
     'Donc $' + col('G=\\dfrac{' + ev('p') + '}{3\\times' + ev('q') + '}=' + ev('p/(3*q)')) + '$.'],
    ['gcd(p,q) == 1'])

V422_LECTURE = justification(
    RAPPEL_422 + '\n\nDans un pays, $L(0{,}2)=0{,}05$. Que signifie cette égalité ?',
    [],
    'Les $20\\,\\%$ de la population aux revenus les plus faibles perçoivent $5\\,\\%$ du revenu'
    ' total',
    ['Les $5\\,\\%$ de la population aux revenus les plus faibles perçoivent $20\\,\\%$ du revenu'
     ' total',
     'Les $20\\,\\%$ de la population aux revenus les plus élevés perçoivent $5\\,\\%$ du revenu'
     ' total',
     'Le revenu des $20\\,\\%$ les plus pauvres a augmenté de $5\\,\\%$'],
    ['$x=0{,}2$ est une **proportion de la population**, prise parmi les revenus les plus faibles.',
     '$L(0{,}2)=0{,}05$ est la **part du revenu total** qu\'elle perçoit.',
     'Donc $' + col('20\\,\\%') + '$ des habitants, les moins riches, perçoivent $'
     + col('5\\,\\%') + '$ du revenu total.'])

MODELES.append(modele(
    '01-courbe-de-lorenz', 'Courbe de Lorenz et indice de Gini',
    'Définition de la courbe de Lorenz et de l\'indice de Gini donnée : fonction qui peut être une'
    ' fonction de Lorenz (case choix), indice de Gini pour L(x) = x^k (case), pour L(x) = ax² +'
    ' (1 − a)x (case), lecture de L(0,2) = 0,05 (case choix)',
    4,
    [V422_LAQUELLE, V422_PUISSANCE, V422_MELANGE, V422_LECTURE],
    specs_choix(0, 'x^k', ['racine (concave)', 'x/2 (L(1) ≠ 1)', '2x − x² (concave)'], {'k': 4})
    + [spec('G = 3/5', 1, '\\frac{3}{5}', 'correct', {'k': 4}),
       spec('Erreur : intégrale seule', 1, '\\frac{1}{5}', 'incorrect', {'k': 4}),
       spec('Erreur : 1 − intégrale', 1, '\\frac{4}{5}', 'incorrect', {'k': 4}),
       spec('G = 1/6', 2, '\\frac{1}{6}', 'correct', {'q': 4, 'p': 2}),
       spec('G = 1/4', 2, '\\frac{1}{4}', 'correct', {'q': 4, 'p': 3}),
       spec('Erreur : p/q', 2, '\\frac{3}{4}', 'incorrect', {'q': 4, 'p': 3}),
       spec('Erreur : intégrale', 2, '\\frac{3}{8}', 'incorrect', {'q': 4, 'p': 3})]
    + specs_choix(3, '20 % les plus pauvres, 5 %', ['inversé', 'les plus riches', 'augmentation'])))

# --- 2. TSPE-423 : dérivée n-ième -------------------------------------------------------------

RAPPEL_423 = (
    'Pour une fonction $f$ dérivable autant de fois qu\'il le faut, on note $f^{(1)}=f\'$ et, pour'
    ' tout entier $n\\geqslant 1$, $f^{(n+1)}=\\left(f^{(n)}\\right)\'$ : $f^{(n)}$ est la **dérivée'
    ' $n$-ième** de $f$.')

V423_EXP = case(
    RAPPEL_423 + '\n\nLa fonction $f$ est définie sur $\\mathbb{R}$ par $f(x)=e^{' + ev('a') + 'x}$.'
    '\n\nComplète.\n\n$f^{(' + ev('N') + ')}(x)=?\\,e^{' + ev('a') + 'x}$',
    [var('a', '2..3;±'), var('N', '3..5')], ev('a^N'),
    ['$f\'(x)=' + ev('a') + 'e^{' + ev('a') + 'x}$ et $f\'\'(x)=' + ev('a^2') + 'e^{' + ev('a')
     + 'x}$ : chaque dérivation multiplie par $' + ev('a') + '$.',
     'Par récurrence, $f^{(n)}(x)=' + ev('a;()') + '^n\\,e^{' + ev('a') + 'x}$ pour tout'
     ' $n\\geqslant 1$.',
     'Donc $' + col('f^{(' + ev('N') + ')}(x)=' + ev('a^N') + 'e^{' + ev('a') + 'x}') + '$.'])

V423_XEXP = case(
    RAPPEL_423 + '\n\nLa fonction $f$ est définie sur $\\mathbb{R}$ par $f(x)=(x' + ev('b;+')
    + ')e^{x}$.\n\nCalcule les premières dérivées, conjecture une formule, puis complète.\n\n'
    '$f^{(' + ev('N') + ')}(x)=(x+?)e^{x}$',
    [var('b', '1..5;±'), var('N', '4..9')], ev('b+N'),
    ['$f\'(x)=e^{x}+(x' + ev('b;+') + ')e^{x}=(x' + ev('b+1;+') + ')e^{x}$ : dériver ajoute $1$'
     ' dans la parenthèse.',
     'Par récurrence, $f^{(n)}(x)=(x' + ev('b;+') + '+n)e^{x}$ : si c\'est vrai au rang $n$,'
     ' $f^{(n+1)}(x)=e^{x}+(x' + ev('b;+') + '+n)e^{x}=(x' + ev('b;+') + '+n+1)e^{x}$.',
     'Donc $' + col('f^{(' + ev('N') + ')}(x)=(x' + ev('b+N;+') + ')e^{x}') + '$.'],
    ['b + N != 0'])

V423_INVERSE = case(
    RAPPEL_423 + '\n\nLa fonction $f$ est définie sur $]0;+\\infty[$ par $f(x)=\\dfrac{1}{x}$.\n\n'
    'Complète.\n\n$f^{(' + ev('N') + ')}(x)=\\dfrac{?}{x^{?}}$',
    [var('N', '2..5')], [ev('(-1)^N*factorial(N)'), ev('N+1')],
    ['$f\'(x)=-\\dfrac{1}{x^2}$, $f\'\'(x)=\\dfrac{2}{x^3}$, $f^{(3)}(x)=-\\dfrac{6}{x^4}$ :'
     ' chaque dérivation multiplie par $-(\\text{exposant})$ et augmente l\'exposant de $1$.',
     'Par récurrence, $f^{(n)}(x)=\\dfrac{(-1)^n\\,n!}{x^{n+1}}$.',
     'Donc $' + col('f^{(' + ev('N') + ')}(x)=' + moins('(-1)^N') + '\\dfrac{'
                   + ev('factorial(N)') + '}{x^{' + ev('N+1') + '}}') + '$.'])

V423_SINUS = justification(
    RAPPEL_423 + '\n\nLa fonction $f$ est définie sur $\\mathbb{R}$ par $f(x)=\\sin(x)$.\n\n'
    'Que vaut $f^{(' + ev('N') + ')}(x)$ ?',
    [var('k', '10..30'), var('N', 'eval:4*k+3')],
    '$-\\cos(x)$',
    ['$\\cos(x)$', '$\\sin(x)$', '$-\\sin(x)$'],
    ['$f\'=\\cos$, $f\'\'=-\\sin$, $f^{(3)}=-\\cos$, $f^{(4)}=\\sin$ : les dérivées se répètent'
     ' tous les $4$ rangs.',
     '$' + ev('N') + '=4\\times' + ev('k') + '+3$, donc $f^{(' + ev('N') + ')}=f^{(3)}$.',
     'Donc $' + col('f^{(' + ev('N') + ')}(x)=-\\cos(x)') + '$.'])

MODELES.append(modele(
    '02-derivee-n-ieme', 'Dérivée n-ième d\'une fonction',
    'Définition de f^(n) donnée : dérivée n-ième de e^{ax} (case), de (x + b)e^x par conjecture'
    ' (case), de 1/x (deux cases), de sin par périodicité des dérivées (case choix)',
    8,
    [V423_EXP, V423_XEXP, V423_INVERSE, V423_SINUS],
    [spec('(−2)^5 = −32', 0, '-32', 'correct', {'a': -2, 'N': 5}),
     spec('Erreur : 2^5', 0, '32', 'incorrect', {'a': -2, 'N': 5}),
     spec('Erreur : a × N', 0, '-10', 'incorrect', {'a': -2, 'N': 5}),
     spec('x + 4', 1, '4', 'correct', {'b': -3, 'N': 7}),
     spec('Erreur : b', 1, '-3', 'incorrect', {'b': -3, 'N': 7}),
     spec('Erreur : N', 1, '7', 'incorrect', {'b': -3, 'N': 7}),
     spec('24/x⁵', 2, ['24', '5'], 'correct', {'N': 4}),
     spec('−6/x⁴', 2, ['-6', '4'], 'correct', {'N': 3}),
     spec('Erreur : signe', 2, ['6', '4'], 'incorrect', {'N': 3}),
     spec('Erreur : exposant N', 2, ['-6', '3'], 'incorrect', {'N': 3})]
    + specs_choix(3, '−cos', ['cos', 'sin', '−sin'], {'k': 12, 'N': 51})))

# --- 3. TSPE-424 : inégalité arithmético-géométrique ------------------------------------------

V424_CONCAVITE = justification(
    'La fonction $\\ln$ est concave sur $]0;+\\infty[$ : sa courbe est au-dessus de ses cordes.'
    ' Soit $a$ et $b$ deux réels strictement positifs.\n\nQuelle inégalité obtient-on en'
    ' comparant la courbe et la corde au point d\'abscisse $\\dfrac{a+b}{2}$ ?',
    [],
    '$\\ln\\left(\\dfrac{a+b}{2}\\right)\\geqslant\\dfrac{\\ln(a)+\\ln(b)}{2}$',
    ['$\\ln\\left(\\dfrac{a+b}{2}\\right)\\leqslant\\dfrac{\\ln(a)+\\ln(b)}{2}$',
     '$\\ln\\left(\\dfrac{a+b}{2}\\right)\\geqslant\\ln(a)+\\ln(b)$',
     '$\\ln(a+b)\\geqslant\\ln(a)+\\ln(b)$'],
    ['La corde joint les points d\'abscisses $a$ et $b$ ; en son milieu, d\'abscisse'
     ' $\\dfrac{a+b}{2}$, son ordonnée est $\\dfrac{\\ln(a)+\\ln(b)}{2}$.',
     'La courbe d\'une fonction concave est au-dessus de ses cordes.',
     'Donc $' + col('\\ln\\left(\\dfrac{a+b}{2}\\right)\\geqslant\\dfrac{\\ln(a)+\\ln(b)}{2}')
     + '$.'])

V424_CONCLURE = justification(
    'Soit $a$ et $b$ deux réels strictement positifs. On a montré que'
    ' $\\ln\\left(\\dfrac{a+b}{2}\\right)\\geqslant\\dfrac{\\ln(a)+\\ln(b)}{2}$.\n\nPourquoi en'
    ' déduit-on que $\\dfrac{a+b}{2}\\geqslant\\sqrt{ab}$ ?',
    [],
    '$\\dfrac{\\ln(a)+\\ln(b)}{2}=\\ln\\left(\\sqrt{ab}\\right)$ et la fonction exponentielle est'
    ' croissante',
    ['La fonction $\\ln$ est concave',
     '$\\dfrac{a+b}{2}$ et $\\sqrt{ab}$ sont positifs',
     'La fonction racine carrée est croissante'],
    ['$\\dfrac{\\ln(a)+\\ln(b)}{2}=\\dfrac{1}{2}\\ln(ab)=\\ln\\left(\\sqrt{ab}\\right)$.',
     'L\'inégalité s\'écrit $\\ln\\left(\\dfrac{a+b}{2}\\right)\\geqslant\\ln\\left(\\sqrt{ab}'
     '\\right)$ ; on compose par la fonction exponentielle, croissante.',
     'Donc $' + col('\\dfrac{a+b}{2}\\geqslant\\sqrt{ab}') + '$ : la moyenne arithmétique dépasse'
     ' la moyenne géométrique.'])

V424_MINIMUM = case(
    'On admet l\'inégalité arithmético-géométrique : pour tous réels $a>0$ et $b>0$,'
    ' $\\dfrac{a+b}{2}\\geqslant\\sqrt{ab}$, avec égalité si et seulement si $a=b$.\n\nLa fonction'
    ' $f$ est définie sur $]0;+\\infty[$ par $f(x)=x+\\dfrac{' + ev('m^2') + '}{x}$.\n\nComplète :'
    ' pour tout $x>0$, $f(x)\\geqslant ?$, avec égalité pour $x=?$',
    [var('m', '2..9')], [ev('2*m'), ev('m')],
    ['Avec $a=x$ et $b=\\dfrac{' + ev('m^2') + '}{x}$ : $\\dfrac{f(x)}{2}\\geqslant\\sqrt{x\\times'
     '\\dfrac{' + ev('m^2') + '}{x}}=\\sqrt{' + ev('m^2') + '}=' + ev('m') + '$.',
     'Égalité si et seulement si $x=\\dfrac{' + ev('m^2') + '}{x}$, soit $x^2=' + ev('m^2')
     + '$ et $x=' + ev('m') + '$ (car $x>0$).',
     'Donc $' + col('f(x)\\geqslant ' + ev('2*m')) + '$, avec égalité pour $' + col('x=' + ev('m'))
     + '$ : le minimum de $f$ est $' + ev('2*m') + '$.'])

V424_PREUVE = ranger(
    'Soit $a$ et $b$ deux réels strictement positifs. On démontre l\'inégalité'
    ' arithmético-géométrique $\\dfrac{a+b}{2}\\geqslant\\sqrt{ab}$.',
    ['Pour $x>0$, $\\ln\'\'(x)=-\\dfrac{1}{x^2}<0$ : $\\ln$ est concave sur $]0;+\\infty[$.',
     'Sa courbe est au-dessus de ses cordes : $\\ln\\left(\\dfrac{a+b}{2}\\right)\\geqslant'
     '\\dfrac{\\ln(a)+\\ln(b)}{2}$.',
     'Or $\\dfrac{\\ln(a)+\\ln(b)}{2}=\\ln\\left(\\sqrt{ab}\\right)$, donc'
     ' $\\ln\\left(\\dfrac{a+b}{2}\\right)\\geqslant\\ln\\left(\\sqrt{ab}\\right)$.',
     'La fonction exponentielle est croissante : on compose les deux membres par elle.',
     'Donc $\\dfrac{a+b}{2}\\geqslant\\sqrt{ab}$.'],
    ['La concavité de $\\ln$ compare le logarithme de la moyenne à la moyenne des logarithmes.',
     'La croissance de l\'exponentielle ramène aux nombres eux-mêmes : $'
     + col('\\dfrac{a+b}{2}\\geqslant\\sqrt{ab}') + '$.'])

MODELES.append(modele(
    '03-inegalite-arithmetico-geometrique', 'Inégalité arithmético-géométrique',
    'Inégalité donnée par la concavité de ln (case choix), passage à la moyenne géométrique par'
    ' l\'exponentielle (case choix), minimum de x + m²/x (deux cases), démonstration (étapes à'
    ' ranger)',
    5,
    [V424_CONCAVITE, V424_CONCLURE, V424_MINIMUM, V424_PREUVE],
    specs_choix(0, 'au-dessus de la corde', ['sens inversé', 'somme des ln', 'ln(a + b)'])
    + specs_choix(1, 'ln√(ab) et exp croissante', ['concavité', 'positivité', 'racine croissante'])
    + [spec('min 10 en 5', 2, ['10', '5'], 'correct', {'m': 5}),
       spec('Erreur : m au lieu de 2m', 2, ['5', '5'], 'incorrect', {'m': 5}),
       spec('Erreur : x = m²', 2, ['10', '25'], 'incorrect', {'m': 5})]
    + ['RANGER:3']))

# --- 4. TSPE-451 : x ↦ x^a ----------------------------------------------------------------------

DEF_451 = ('Pour tout réel $x>0$ et tout réel $a$, on définit $x^a=e^{a\\ln(x)}$.')


def puiss(p, q):
    return '\\frac{' + ev(p) + '}{' + ev(q) + '}'


V451_VALEUR = case(
    DEF_451 + '\n\nDétermine la valeur exacte du nombre suivant.\n\n$' + ev('m^q') + '^{'
    + puiss('p', 'q') + '}=?$',
    [var('q', '2..3'), var('m', '2..3'), var('p', '1..4')], ev('m^p'),
    ['Par définition, $' + ev('m^q') + '^{' + puiss('p', 'q') + '}=e^{' + puiss('p', 'q') + '\\ln('
     + ev('m^q') + ')}$, et $\\ln(' + ev('m^q') + ')=\\ln(' + ev('m') + '^{' + ev('q') + '})='
     + ev('q') + '\\ln(' + ev('m') + ')$.',
     'Donc $' + ev('m^q') + '^{' + puiss('p', 'q') + '}=e^{' + ev('p') + '\\ln(' + ev('m')
     + ')}=' + ev('m') + '^{' + ev('p') + '}$.',
     'Donc $' + col(ev('m^q') + '^{' + puiss('p', 'q') + '}=' + ev('m^p')) + '$.'],
    ['gcd(p,q) == 1'])

EXP_451 = '{{if:p<q|-|}}\\frac{' + ev('abs(p-q)') + '}{' + ev('q') + '}'

V451_DERIVEE = case(
    DEF_451 + '\n\nLa fonction $f$ est définie sur $]0;+\\infty[$ par $f(x)=x^{' + puiss('p', 'q')
    + '}$.\n\nComplète.\n\n$f\'(x)=?\\,x^{?}$',
    [var('q', '2..4'), var('p', '1..7')], [ev('p/q'), ev('(p-q)/q')],
    ['$f(x)=e^{' + puiss('p', 'q') + '\\ln(x)}$, donc $f\'(x)=' + puiss('p', 'q')
     + '\\times\\dfrac{1}{x}\\times e^{' + puiss('p', 'q') + '\\ln(x)}=' + puiss('p', 'q')
     + '\\times\\dfrac{x^{' + puiss('p', 'q') + '}}{x}$.',
     'Or $\\dfrac{x^{' + puiss('p', 'q') + '}}{x}=e^{' + puiss('p', 'q') + '\\ln(x)-\\ln(x)}=x^{'
     + puiss('p', 'q') + '-1}$.',
     'Donc $' + col('f\'(x)=' + puiss('p', 'q') + 'x^{' + EXP_451 + '}') + '$ : la formule'
     ' $(x^n)\'=nx^{n-1}$ reste vraie pour un exposant réel.'],
    ['gcd(p,q) == 1'])

V451_VARIATIONS = justification(
    DEF_451 + '\n\nLa fonction $f$ est définie sur $]0;+\\infty[$ par $f(x)=x^{-' + puiss('p', 'q')
    + '}$.\n\nQuelle phrase la décrit ?',
    [var('q', '2..4'), var('p', '1..7')],
    '$f$ est strictement décroissante, de limite $0$ en $+\\infty$',
    ['$f$ est strictement croissante, de limite $+\\infty$ en $+\\infty$',
     '$f$ est strictement décroissante, de limite $-\\infty$ en $+\\infty$',
     '$f$ est strictement décroissante, de limite $1$ en $+\\infty$'],
    ['$f(x)=e^{-' + puiss('p', 'q') + '\\ln(x)}$ et $f\'(x)=-' + puiss('p', 'q') + '\\times'
     '\\dfrac{1}{x}\\,e^{-' + puiss('p', 'q') + '\\ln(x)}<0$ : $f$ est strictement décroissante.',
     'Quand $x\\to+\\infty$, $-' + puiss('p', 'q') + '\\ln(x)\\to-\\infty$, et $e^{X}\\to 0$'
     ' quand $X\\to-\\infty$.',
     'Donc $' + col('f\\text{ est strictement décroissante, de limite }0') + '$ en $+\\infty$.'],
    ['gcd(p,q) == 1'])

V451_RACINE = justification(
    DEF_451 + '\n\nPourquoi a-t-on $x^{\\frac{1}{2}}=\\sqrt{x}$ pour tout $x>0$ ?',
    [],
    '$x^{\\frac{1}{2}}=e^{\\frac{1}{2}\\ln(x)}$ est positif et son carré vaut $e^{\\ln(x)}=x$',
    ['Parce que $\\dfrac{1}{2}\\ln(x)=\\ln\\left(\\dfrac{x}{2}\\right)$',
     'Parce que $x^{\\frac{1}{2}}=\\dfrac{x}{2}$',
     'Parce que $e^{\\ln(x)}=x$ suffit'],
    ['$x^{\\frac{1}{2}}=e^{\\frac{1}{2}\\ln(x)}>0$, comme toute exponentielle.',
     '$\\left(e^{\\frac{1}{2}\\ln(x)}\\right)^2=e^{2\\times\\frac{1}{2}\\ln(x)}=e^{\\ln(x)}=x$.',
     '$\\sqrt{x}$ est le seul réel positif de carré $x$ : $' + col('x^{\\frac{1}{2}}=\\sqrt{x}')
     + '$.'])

MODELES.append(modele(
    '04-fonction-puissance-reelle', 'Fonction x ↦ xᵃ : définition, valeurs, dérivée',
    'Définition x^a = e^{a ln x} donnée : valeur exacte de m^{q·p/q} (case), dérivée de x^{p/q}'
    ' (deux cases), variations et limite de x^{−p/q} (case choix), x^{1/2} = √x (case choix)',
    4,
    [V451_VALEUR, V451_DERIVEE, V451_VARIATIONS, V451_RACINE],
    [spec('8^{2/3} = 4', 0, '4', 'correct', {'q': 3, 'm': 2, 'p': 2}),
     spec('Erreur : 8 × 2/3', 0, '\\frac{16}{3}', 'incorrect', {'q': 3, 'm': 2, 'p': 2}),
     spec('Erreur : m', 0, '2', 'incorrect', {'q': 3, 'm': 2, 'p': 2}),
     spec('3/2 x^{1/2}', 1, ['\\frac{3}{2}', '\\frac{1}{2}'], 'correct', {'q': 2, 'p': 3}),
     spec('1/3 x^{−2/3}', 1, ['\\frac{1}{3}', '-\\frac{2}{3}'], 'correct', {'q': 3, 'p': 1}),
     spec('Erreur : exposant non diminué', 1, ['\\frac{3}{2}', '\\frac{3}{2}'], 'incorrect',
          {'q': 2, 'p': 3}),
     spec('Erreur : exposant + 1', 1, ['\\frac{3}{2}', '\\frac{5}{2}'], 'incorrect',
          {'q': 2, 'p': 3})]
    + specs_choix(2, 'décroissante, limite 0', ['croissante', 'limite −∞', 'limite 1'],
                  {'q': 2, 'p': 3})
    + specs_choix(3, 'positif, carré x', ['ln(x/2)', 'x/2', 'e^{ln x} seul'])))

# --- 5. TSPE-452 : limite de (1 + x/n)^n --------------------------------------------------------

UN_PLUS = '1' + frac_signee('a', 'n')
H_452 = moins('a') + '\\dfrac{' + ev('abs(a)') + '}{n}'

V452_POSER = case(
    'On étudie la suite définie, pour $n>' + ev('abs(a)') + '$, par $u_n=\\left(' + UN_PLUS
    + '\\right)^n=e^{n\\ln\\left(' + UN_PLUS + '\\right)}$. On pose $h=' + H_452 + '$.\n\n'
    'Complète.\n\n$n\\ln\\left(' + UN_PLUS + '\\right)=?\\times\\dfrac{\\ln(1+h)}{h}$',
    [var('a', '2..5;±')], ev('a'),
    ['$h=' + H_452 + '$, donc $n=' + moins('a') + '\\dfrac{' + ev('abs(a)') + '}{h}$.',
     '$n\\ln(1+h)=' + moins('a') + '\\dfrac{' + ev('abs(a)') + '}{h}\\ln(1+h)=' + ev('a')
     + '\\times\\dfrac{\\ln(1+h)}{h}$.',
     'Donc $n\\ln\\left(' + UN_PLUS + '\\right)=' + col(ev('a')) + '\\times\\dfrac{\\ln(1+h)}{h}$.'])

V452_TAUX = justification(
    'Pourquoi a-t-on $\\displaystyle\\lim_{h\\to 0}\\dfrac{\\ln(1+h)}{h}=1$ ?',
    [],
    '$\\dfrac{\\ln(1+h)-\\ln(1)}{h}$ est un taux de variation de $\\ln$ en $1$, qui tend vers'
    ' $\\ln\'(1)=1$',
    ['$\\ln(1+h)$ et $h$ tendent tous deux vers $0$',
     '$\\ln(1+h)=h$ pour tout réel $h>-1$',
     'La fonction $\\ln$ est croissante'],
    ['$\\ln(1)=0$, donc $\\dfrac{\\ln(1+h)}{h}=\\dfrac{\\ln(1+h)-\\ln(1)}{(1+h)-1}$ : c\'est le taux'
     ' de variation de $\\ln$ entre $1$ et $1+h$.',
     '$\\ln$ est dérivable en $1$ et $\\ln\'(1)=\\dfrac{1}{1}=1$.',
     'Donc $' + col('\\displaystyle\\lim_{h\\to 0}\\dfrac{\\ln(1+h)}{h}=1') + '$. Deux quantités'
     ' qui tendent vers $0$ ne suffisent pas à conclure : c\'est une forme indéterminée.'])

V452_LIMITE = case(
    'On admet que, pour tout réel $x$, $' + LIM_N + '\\left(1+\\dfrac{x}{n}\\right)^n=e^{x}$.\n\n'
    'Complète.\n\n$' + LIM_N + '\\left(' + UN_PLUS + '\\right)^{' + ev('b') + 'n}=e^{?}$',
    [var('a', '2..5;±'), var('b', '2..4')], ev('a*b'),
    ['$\\left(' + UN_PLUS + '\\right)^{' + ev('b') + 'n}=\\left(\\left(' + UN_PLUS
     + '\\right)^n\\right)^{' + ev('b') + '}$.',
     'Avec $x=' + ev('a') + '$, $\\left(' + UN_PLUS + '\\right)^n$ tend vers $e^{' + ev('a')
     + '}$ ; la fonction $X\\mapsto X^{' + ev('b') + '}$ est continue.',
     'Donc la limite vaut $\\left(e^{' + ev('a') + '}\\right)^{' + ev('b') + '}=' + col('e^{'
                                                                                      + ev('a*b') + '}') + '$.'])

V452_PREUVE = ranger(
    'Soit $x$ un réel non nul. On démontre que $' + LIM_N + '\\left(1+\\dfrac{x}{n}\\right)^n=e^{x}$.',
    ['Pour $n>|x|$, $1+\\dfrac{x}{n}>0$ et $\\left(1+\\dfrac{x}{n}\\right)^n=e^{n\\ln\\left(1+'
     '\\frac{x}{n}\\right)}$.',
     'On pose $h=\\dfrac{x}{n}$ : $n\\ln\\left(1+\\dfrac{x}{n}\\right)=x\\times\\dfrac{\\ln(1+h)}{h}$.',
     'Quand $n\\to+\\infty$, $h\\to 0$ et $\\dfrac{\\ln(1+h)}{h}\\to\\ln\'(1)=1$.',
     'Donc $n\\ln\\left(1+\\dfrac{x}{n}\\right)$ tend vers $x$.',
     'Par continuité de la fonction exponentielle en $x$, $\\left(1+\\dfrac{x}{n}\\right)^n$ tend'
     ' vers $e^{x}$.'],
    ['On écrit la puissance sous forme exponentielle et l\'on reconnaît un nombre dérivé de $\\ln$'
     ' en $1$.',
     'La continuité de l\'exponentielle conclut : $' + col(LIM_N + '\\left(1+\\dfrac{x}{n}\\right)^n'
                                                           '=e^{x}') + '$.'])

MODELES.append(modele(
    '05-limite-un-plus-x-sur-n-puissance-n', 'Démontrer que (1 + x/n)ⁿ tend vers eˣ',
    'Écriture de n ln(1 + a/n) avec h = a/n (case), limite de ln(1 + h)/h par le nombre dérivé'
    ' (case choix), limite de (1 + a/n)^{bn} (case), démonstration (étapes à ranger)',
    9,
    [V452_POSER, V452_TAUX, V452_LIMITE, V452_PREUVE],
    [spec('−3', 0, '-3', 'correct', {'a': -3}),
     spec('Erreur : n', 0, 'n', 'incorrect', {'a': -3}),
     spec('Erreur : 3', 0, '3', 'incorrect', {'a': -3})]
    + specs_choix(1, 'nombre dérivé de ln en 1', ['les deux tendent vers 0', 'ln(1 + h) = h',
                                                  'ln croissante'])
    + [spec('e^{−6}', 2, '-6', 'correct', {'a': -3, 'b': 2}),
       spec('Erreur : a seul', 2, '-3', 'incorrect', {'a': -3, 'b': 2}),
       spec('Erreur : a + b', 2, '-1', 'incorrect', {'a': -3, 'b': 2})]
    + ['RANGER:3']))

# --- 6. TSPE-460 : fonction tangente ------------------------------------------------------------

DEF_460 = ('La fonction **tangente** est définie par $\\tan(x)=\\dfrac{\\sin(x)}{\\cos(x)}$ pour'
           ' tout réel $x$ tel que $\\cos(x)\\neq 0$, c\'est-à-dire $x\\neq\\dfrac{\\pi}{2}+k\\pi$,'
           ' $k\\in\\mathbb{Z}$.')

V460_PROPRIETES = justification(
    DEF_460 + '\n\nQuelle phrase est vraie ?',
    [],
    'La fonction tangente est impaire et $\\pi$-périodique',
    ['La fonction tangente est paire et $\\pi$-périodique',
     'La fonction tangente est définie sur $\\mathbb{R}$ et impaire',
     'La fonction tangente est bornée et $\\pi$-périodique'],
    ['$\\tan(-x)=\\dfrac{\\sin(-x)}{\\cos(-x)}=\\dfrac{-\\sin(x)}{\\cos(x)}=-\\tan(x)$ : elle est'
     ' impaire.',
     '$\\sin(x+\\pi)=-\\sin(x)$ et $\\cos(x+\\pi)=-\\cos(x)$, donc $\\tan(x+\\pi)=\\tan(x)$.',
     'Elle n\'est ni définie sur $\\mathbb{R}$ ni bornée (limites infinies en $\\dfrac{\\pi}{2}$) :'
     ' $' + col('\\text{impaire et }\\pi\\text{-périodique}') + '$.'])

V460_DERIVEE = case(
    DEF_460 + '\n\nOn dérive $\\tan$ comme un quotient. Complète.\n\n$\\tan\'(x)=\\dfrac{?}'
    '{\\cos^2(x)}$',
    [], '1',
    ['$\\tan\'(x)=\\dfrac{\\cos(x)\\times\\cos(x)-\\sin(x)\\times(-\\sin(x))}{\\cos^2(x)}'
     '=\\dfrac{\\cos^2(x)+\\sin^2(x)}{\\cos^2(x)}$.',
     'Or $\\cos^2(x)+\\sin^2(x)=1$.',
     'Donc $' + col('\\tan\'(x)=\\dfrac{1}{\\cos^2(x)}') + '=1+\\tan^2(x)$.'])

ALPHA = '{{if:r==0|\\dfrac{\\pi}{6}|{{if:r==1|\\dfrac{\\pi}{4}|\\dfrac{\\pi}{3}}}}}'
COS_ALPHA = '{{if:r==0|\\dfrac{\\sqrt{3}}{2}|{{if:r==1|\\dfrac{\\sqrt{2}}{2}|\\dfrac{1}{2}}}}}'
COS2_ALPHA = '{{if:r==0|\\dfrac{3}{4}|{{if:r==1|\\dfrac{1}{2}|\\dfrac{1}{4}}}}}'
DER_ALPHA = '{{if:r==0|\\frac{4}{3}|{{if:r==1|2|4}}}}'

V460_VALEUR = case(
    DEF_460 + ' On admet que $\\tan\'(x)=\\dfrac{1}{\\cos^2(x)}$.\n\nCalcule le nombre dérivé'
    ' suivant.\n\n$\\tan\'\\left(' + ALPHA + '\\right)=?$',
    [var('r', '0..2')], DER_ALPHA,
    ['$\\cos\\left(' + ALPHA + '\\right)=' + COS_ALPHA + '$, donc $\\cos^2\\left(' + ALPHA
     + '\\right)=' + COS2_ALPHA + '$.',
     '$\\tan\'\\left(' + ALPHA + '\\right)=\\dfrac{1}{' + COS2_ALPHA + '}$.',
     'Donc $' + col('\\tan\'\\left(' + ALPHA + '\\right)=' + DER_ALPHA) + '$.'])

V460_TANGENTE = case(
    DEF_460 + ' On admet que $\\tan\'(x)=\\dfrac{1}{\\cos^2(x)}$.\n\nDonne l\'équation de la'
    ' tangente à la courbe de $\\tan$ au point d\'abscisse $\\dfrac{\\pi}{4}$.\n\n$y=?x+?$',
    [], ['2', '1-\\frac{\\pi}{2}'],
    ['$\\tan\\left(\\dfrac{\\pi}{4}\\right)=1$ et $\\tan\'\\left(\\dfrac{\\pi}{4}\\right)='
     '\\dfrac{1}{\\left(\\frac{\\sqrt{2}}{2}\\right)^2}=2$.',
     'La tangente a pour équation $y=2\\left(x-\\dfrac{\\pi}{4}\\right)+1$.',
     'Donc $' + col('y=2x+1-\\dfrac{\\pi}{2}') + '$.'])

V460_VARIATIONS = justification(
    DEF_460 + '\n\nQuelle phrase décrit la fonction tangente sur'
    ' $\\left]-\\dfrac{\\pi}{2};\\dfrac{\\pi}{2}\\right[$ ?',
    [],
    'Elle est strictement croissante, de limite $+\\infty$ en $\\dfrac{\\pi}{2}$ à gauche',
    ['Elle est strictement décroissante, de limite $-\\infty$ en $\\dfrac{\\pi}{2}$ à gauche',
     'Elle est strictement croissante, de limite $1$ en $\\dfrac{\\pi}{2}$ à gauche',
     'Elle admet un maximum en $0$'],
    ['$\\tan\'(x)=\\dfrac{1}{\\cos^2(x)}>0$ : la fonction est strictement croissante.',
     'Quand $x\\to\\dfrac{\\pi}{2}$ à gauche, $\\sin(x)\\to 1$ et $\\cos(x)\\to 0$ en restant'
     ' positif : le quotient tend vers $+\\infty$.',
     'Donc elle est $' + col('\\text{strictement croissante, de limite }+\\infty') + '$ en'
     ' $\\dfrac{\\pi}{2}$ à gauche.'])

MODELES.append(modele(
    '06-fonction-tangente', 'Fonction tangente : propriétés, dérivée, tangente',
    'Définition donnée : parité et périodicité (case choix), dérivée par le quotient (case),'
    ' nombre dérivé en π/6, π/4 ou π/3 (case), tangente en π/4 (deux cases), variations sur'
    ' ]−π/2 ; π/2[ (case choix)',
    5,
    [V460_PROPRIETES, V460_DERIVEE, V460_VALEUR, V460_TANGENTE, V460_VARIATIONS],
    specs_choix(0, 'impaire, π-périodique', ['paire', 'définie sur R', 'bornée'])
    + [spec('1', 1, '1', 'correct'),
       spec('Erreur : sin² − cos²', 1, '\\sin^2(x)-\\cos^2(x)', 'incorrect'),
       spec('tan′(π/3) = 4', 2, '4', 'correct', {'r': 2}),
       spec('tan′(π/6) = 4/3', 2, '\\frac{4}{3}', 'correct', {'r': 0}),
       spec('Erreur : cos² au lieu de 1/cos²', 2, '\\frac{1}{4}', 'incorrect', {'r': 2}),
       spec('Erreur : 1/cos', 2, '2', 'incorrect', {'r': 2}),
       spec('y = 2x + 1 − π/2', 3, ['2', '1-\\frac{\\pi}{2}'], 'correct'),
       spec('Erreur : ordonnée à l\'origine 1', 3, ['2', '1'], 'incorrect'),
       spec('Erreur : pente 1', 3, ['1', '1-\\frac{\\pi}{4}'], 'incorrect')]
    + specs_choix(4, 'croissante, +∞', ['décroissante', 'limite 1', 'maximum en 0'])))

# --- Specs « ranger » : positions affichées calculées par le générateur (graine 0) -------------

def positions(chemin, vi):
    out = subprocess.run(['pnpm', 'exec', 'tsx', 'docs/wip/questions/positions-ranger.ts', chemin,
                          str(vi)],
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
