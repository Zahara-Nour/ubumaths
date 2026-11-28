"""Écrit les 6 modèles du lot 5a « logarithme décimal : définition, variations, propriétés » de la
Terminale technologique (STMG) dans scripts/questions/ttechno-5a-logarithme/.

Phase 0 validée par David le 2026-11-18 (journal docs/archive/wip/questions-ttechno-progress.md § 34,
Q24–Q26 : « je suis tes recos ») :

| #  | Point        | Nœud (posé par la migration)                   | Niveau | Réponse                       |
| L1 | TTECHNO-040  | Logarithmes › logarithme décimal               | 1 | nombre, choix, arrondi            |
| L2 | TTECHNO-041  | Logarithmes › logarithme décimal               | 1 | choix, deux nombres, courbes      |
| L3 | TTECHNO-042  | Logarithmes › propriétés algébriques           | 1 | choix, nombre                     |
| L4 | TTECHNO-082  | Logarithmes › propriétés algébriques           | 1 | choix, nombre                     |
| L5 | TTECHNO-083  | Logarithmes › propriétés algébriques           | 1 | choix, nombre, expression         |
| L6 | TTECHNO-044  | Logarithmes › logarithme décimal               | 2 | nombres                           |

Bornes (BO Tle techno p.8, ttechno.md, ltt-1) : log décimal seulement, défini comme l'unique
solution de 10ˣ = b (b > 0) ; log(aⁿ) = n·log(a) pour n ENTIER NATUREL dans les transformations
(082, 044) ; ni ln, ni base e, ni log_a, ni dérivée de log. Commentaire du BO : log N donne l'ordre
de grandeur et le nombre de chiffres d'un entier (Q26). Calques ln repris en idées, originaux
intacts (Q3) : 7c8b341b, ffd5c051, 86c59a05, 74b103a8.
`grades` = ['T_TECHNO'] seul : aucun autre programme n'a le logarithme décimal.

Moteur : `log` sans base = décimal (mathAST/eval/evaluate.ts, eval/compile.ts : le bloc courbe
aussi). Pièges : jamais de variable `e` ni `i` ; eval ne connaît ni `>` ni `==` (indicatrices par
floor / min / max) ; `round(…, n)` refusé → round(1000*x)/1000 ; case choix mélangée : réponse =
rang dans la SOURCE ; `melanger: non` pour les choix ordonnés (signe, comparaison).

    python3 docs/wip/questions/lot-ttechno-5a.py scripts/questions/ttechno-5a-logarithme
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


def choix(*options, melanger=True):
    tete = '' if melanger else 'melanger: non\n'
    return '\n\n```choix\n' + tete + ''.join('- ' + o + '\n' for o in options) + '```'


DECIMAL = {'blankDefaults': {'acceptDecimal': True}}
DEF = ('Pour $b>0$, $\\log(b)$ est l\'unique réel $x$ tel que $10^x=b$. En particulier,'
       ' $\\log\\left(10^n\\right)=n$ et $10^{\\log(b)}=b$.')
SENS = ('La fonction $\\log$ est définie et **strictement croissante** sur $\\left]0\\,;+\\infty\\right[$ :'
        ' elle range les images dans le même ordre que les nombres.')
PRODUIT = 'Pour $a>0$ et $b>0$ : $\\log(ab)=\\log(a)+\\log(b)$.'
PUISSANCE = 'Pour $a>0$ et $n$ entier naturel : $\\log\\left(a^n\\right)=n\\log(a)$.'
QUOTIENT = ('Pour $a>0$ et $b>0$ : $\\log\\left(\\dfrac{a}{b}\\right)=\\log(a)-\\log(b)$ ; en particulier'
            ' $\\log\\left(\\dfrac{1}{b}\\right)=-\\log(b)$.')
# log a arrondi au millième, pour a dans {2 ; 3 ; 5 ; 7} : 0,301 ; 0,477 ; 0,699 ; 0,845. Affiché par
# {{eval:la;d}} : {{la}} seul s'écrit en fraction (301/1000).
L_A = 'eval:round(1000*log(a))/1000'

# --- L1, TTECHNO-040 : définition --------------------------------------------------------------

L1 = modele(
    'Logarithme décimal : définition',
    'log(10ⁿ) = n ; log de 100, 0,01… sans calculatrice ; 10ˣ = b donne x = log(b) ; 10^(log b) = b ;'
    ' calculatrice ; nombre de chiffres d\'un entier',
    1, 45,
    [
        variation(
            'Sans calculatrice, donne la valeur de $\\log\\left(10^{ {{n}} }\\right)$.'
            '\n\n$\\log\\left(10^{ {{n}} }\\right)=?$',
            [var('n', '-5|-4|-3|-2|2|3|4|5|6|7')],
            '{{n}}',
            [DEF,
             '$\\log\\left(10^{ {{n}} }\\right)$ est le réel $x$ tel que $10^x=10^{ {{n}} }$, donc'
             ' $\\log\\left(10^{ {{n}} }\\right)=' + col('{{n}}') + '$.'],
        ),
        variation(
            'Sans calculatrice, donne la valeur de $\\log({{eval:10^n;d}})$.'
            '\n\n$\\log({{eval:10^n;d}})=?$',
            [var('n', '-3|-2|-1|1|2|3')],
            '{{n}}',
            [DEF,
             '${{eval:10^n;d}}=10^{ {{n}} }$, donc $\\log({{eval:10^n;d}})=' + col('{{n}}') + '$.'
             '{{if:n<0| Un logarithme négatif : le nombre est compris entre $0$ et $1$.|}}'],
        ),
        # Choix, pas de saisie : au clavier, MathLive change « log » en \log_{#?} (case de base),
        # que le moteur juge faux (journal § 35). À rouvrir quand la saisie de log sera réglée.
        variation(
            'Quel est le réel $x$ tel que $10^x={{b}}$ ?'
            + choix('$x=\\log({{b}})$', '$x=\\dfrac{ {{b}} }{10}$', '$x=10^{ {{b}} }$',
                    '$x=\\sqrt[10]{ {{b}} }$'),
            [var('b', '2|3|5|6|7|15|20|50')],
            '0',
            [DEF,
             '$10^x={{b}}$ a une unique solution : $x=' + col('\\log({{b}})') + '$'
             ' (environ ${{eval:round(100*log(b))/100;d}}$ à la calculatrice).'],
        ),
        variation(
            'Sans calculatrice, donne la valeur de $10^{\\log({{b}})}$.\n\n$10^{\\log({{b}})}=?$',
            [var('b', '3|7|12|25|0.5|2.4|45')],
            '{{b}}',
            [DEF,
             '$\\log({{b}})$ est l\'exposant qu\'il faut donner à $10$ pour obtenir ${{b}}$ :'
             ' $10^{\\log({{b}})}=' + col('{{b}}') + '$.'],
        ),
        variation(
            'À la calculatrice, donne une valeur approchée de $\\log({{b}})$ au centième.'
            '\n\n$\\log({{b}})\\approx ?$',
            [var('b', '2|3|7|15|42|250|0.4|0.06')],
            case('{{eval:round(100*log(b))/100;d}}', precision=arrondi(2)),
            ['La touche $\\log$ de la calculatrice donne le logarithme décimal.',
             '$\\log({{b}})\\approx' + col('{{eval:round(100*log(b))/100;d}}') + '$ : on vérifie'
             ' que $10^{ {{eval:round(100*log(b))/100;d}} }$ est proche de ${{b}}$.'],
        ),
        variation(
            'Un entier naturel $N$ vérifie $\\log(N)\\approx{{eval:k+f;d}}$.\n\n'
            'Combien de chiffres a l\'écriture décimale de $N$ ?\n\n$?$ chiffres',
            [var('k', '2..9'), var('f', '0.12|0.35|0.48|0.71|0.86')],
            '{{eval:k+1}}',
            [SENS,
             '${{k}}\\leqslant\\log(N)<{{eval:k+1}}$, donc $10^{ {{k}} }\\leqslant N<10^{ {{eval:k+1}} }$.',
             '$10^{ {{k}} }$ s\'écrit avec ${{eval:k+1}}$ chiffres (un $1$ suivi de ${{k}}$ zéros) et'
             ' $10^{ {{eval:k+1}} }$ est le premier entier à ${{eval:k+2}}$ chiffres : $N$ a $'
             + col('{{eval:k+1}}') + '$ chiffres.'],
        ),
    ],
    [
        spec('log(10^3) = 3', 0, {'n': '3'}, '3', 'correct'),
        spec('Erreur : 1000', 0, {'n': '3'}, '1000', 'incorrect'),
        spec('log(10^-4) = −4', 0, {'n': '-4'}, '-4', 'correct'),
        spec('Erreur : 4 (signe)', 0, {'n': '-4'}, '4', 'incorrect'),
        spec('log(100) = 2', 1, {'n': '2'}, '2', 'correct'),
        spec('Erreur : 10', 1, {'n': '2'}, '10', 'incorrect'),
        spec('log(0,01) = −2', 1, {'n': '-2'}, '-2', 'correct'),
        spec('Erreur : 2 (signe)', 1, {'n': '-2'}, '2', 'incorrect'),
        spec('10^x = 5 : x = log(5)', 2, {'b': '5'}, '0', 'correct'),
        spec('Erreur : x = 5/10', 2, {'b': '5'}, '1', 'incorrect'),
        spec('Erreur : x = 10^5', 2, {'b': '5'}, '2', 'incorrect'),
        spec('10^(log 7) = 7', 3, {'b': '7'}, '7', 'correct'),
        spec('Erreur : 10^7', 3, {'b': '7'}, '10000000', 'incorrect'),
        spec('log(42) ≈ 1,62', 4, {'b': '42'}, '1,62', 'correct'),
        spec('Erreur : ln(42) ≈ 3,74', 4, {'b': '42'}, '3,74', 'incorrect'),
        spec('log(0,4) ≈ −0,4', 4, {'b': '0.4'}, '-0,4', 'correct'),
        spec('log N ≈ 5,35 : 6 chiffres', 5, {'k': '5', 'f': '0.35'}, '6', 'correct'),
        spec('Erreur : 5 (partie entière)', 5, {'k': '5', 'f': '0.35'}, '5', 'incorrect'),
    ],
    shared=DECIMAL,
)

# --- L2, TTECHNO-041 : sens de variation -------------------------------------------------------


def l2_courbe(f, description):
    return ('- ```courbe\n'
            '  x: -1 ; 11\n'
            '  y: -2.5 ; 2.5\n'
            '  grille: 1 ; 0.5\n'
            '  f(x) = ' + f + '   bleu\n'
            '  taille: petite\n'
            '  description: ' + description + '\n'
            '  ```\n')


L2_COURBES = ('Laquelle de ces courbes représente la fonction $\\log$ ?\n\n'
              '````choix\n'
              + l2_courbe('log(x)', 'Courbe croissante définie pour x > 0, qui passe par (1 ; 0) et'
                          ' par (10 ; 1).')
              + l2_courbe('-log(x)', 'Courbe décroissante définie pour x > 0, qui passe par (1 ; 0)'
                          ' et par (10 ; −1).')
              + l2_courbe('log(x) + 1', 'Courbe croissante définie pour x > 0, qui passe par (1 ; 1)'
                          ' et par (10 ; 2).')
              + l2_courbe('log(x + 1)', 'Courbe croissante définie pour x > −1, qui passe par'
                          ' l\'origine (0 ; 0).')
              + '````')

L2 = modele(
    'Sens de variation de la fonction logarithme décimal',
    'Sens de variation ; comparer deux logarithmes sans calcul ; signe de log x ; encadrer log x entre'
    ' deux entiers ; reconnaître la courbe',
    1, 30,
    [
        variation(
            'Quel est le sens de variation de la fonction logarithme décimal $\\log$ ?'
            + choix('$\\log$ est strictement croissante sur $\\left]0\\,;+\\infty\\right[$',
                    '$\\log$ est strictement décroissante sur $\\left]0\\,;+\\infty\\right[$',
                    '$\\log$ est strictement croissante sur $\\mathbb{R}$',
                    '$\\log$ est décroissante sur $\\left]0\\,;1\\right]$ et croissante sur'
                    ' $\\left[1\\,;+\\infty\\right[$'),
            [], '0',
            [SENS,
             '$\\log(x)$ est négatif pour $0<x<1$, mais il augmente quand même : le signe et le sens'
             ' de variation sont deux choses différentes.'],
        ),
        variation(
            'Sans calculatrice, compare $\\log({{eval:p/10;d}})$ et $\\log({{eval:q/10;d}})$.'
            + choix('$\\log({{eval:p/10;d}})<\\log({{eval:q/10;d}})$',
                    '$\\log({{eval:p/10;d}})>\\log({{eval:q/10;d}})$', melanger=False),
            [var('p', '2..40'), var('q', '2..40')],
            '{{eval:min(max(p-q,0),1)}}',
            [SENS,
             '${{eval:p/10;d}}{{if:p<q|<|>}}{{eval:q/10;d}}$, donc $'
             + col('\\log({{eval:p/10;d}}){{if:p<q|<|>}}\\log({{eval:q/10;d}})') + '$.'],
            ['p != q', 'p != 10', 'q != 10'],
        ),
        variation(
            'Quel est le signe de $\\log({{eval:p/10;d}})$ ?'
            + choix('strictement négatif', 'nul', 'strictement positif', melanger=False),
            [var('p', '2|3|5|7|9|12|15|25|40|85')],
            '{{eval:2*min(max(p-10,0),1)}}',
            [SENS + ' Et $\\log(1)=0$, car $10^0=1$.',
             'Donc $\\log(x)<0$ pour $0<x<1$ et $\\log(x)>0$ pour $x>1$.',
             '${{eval:p/10;d}}{{if:p<10|<|>}}1$ : $\\log({{eval:p/10;d}})$ est $'
             + col('\\text{strictement {{if:p<10|négatif|positif}}}') + '$.'],
        ),
        variation(
            'Le réel $x$ vérifie ${{eval:10^n;d}}<x<{{eval:10^(n+1);d}}$. Encadre $\\log(x)$ entre'
            ' deux entiers consécutifs.\n\n$?<\\log(x)<?$',
            [var('n', '-3|-2|-1|1|2|3')],
            ['{{n}}', '{{eval:n+1}}'],
            [SENS,
             '${{eval:10^n;d}}=10^{ {{n}} }$ et ${{eval:10^(n+1);d}}=10^{ {{eval:n+1}} }$ : la'
             ' fonction $\\log$ conserve l\'ordre, donc $' + col('{{n}}<\\log(x)<{{eval:n+1}}') + '$.'],
        ),
        variation(
            L2_COURBES, [], '0',
            ['La courbe de $\\log$ passe par $(1\\,;0)$, car $\\log(1)=0$, et par $(10\\,;1)$, car'
             ' $\\log(10)=1$.',
             'Elle n\'existe que pour $x>0$ et elle monte : c\'est la courbe $'
             + col('\\text{croissante passant par }(1\\,;0)\\text{ et }(10\\,;1)') + '$.'],
        ),
    ],
    [
        spec('Strictement croissante sur ]0 ; +∞[', 0, {}, '0', 'correct'),
        spec('Erreur : décroissante puis croissante (confusion avec le signe)', 0, {}, '3',
             'incorrect'),
        spec('log 0,7 < log 1,3', 1, {'p': '7', 'q': '13'}, '0', 'correct'),
        spec('Erreur : log 0,7 > log 1,3', 1, {'p': '7', 'q': '13'}, '1', 'incorrect'),
        spec('log 3,5 > log 0,5', 1, {'p': '35', 'q': '5'}, '1', 'correct'),
        spec('log 0,3 négatif', 2, {'p': '3'}, '0', 'correct'),
        spec('Erreur : log 0,3 positif', 2, {'p': '3'}, '2', 'incorrect'),
        spec('log 1,5 positif', 2, {'p': '15'}, '2', 'correct'),
        spec('100 < x < 1000 : 2 < log x < 3', 3, {'n': '2'}, ['2', '3'], 'correct'),
        spec('Erreur : 100 et 1000 recopiés', 3, {'n': '2'}, ['100', '1000'], 'incorrect'),
        spec('0,01 < x < 0,1 : −2 < log x < −1', 3, {'n': '-2'}, ['-2', '-1'], 'correct'),
        spec('Courbe de log', 4, {}, '0', 'correct'),
        spec('Erreur : log(x) + 1', 4, {}, '2', 'incorrect'),
    ],
    shared=DECIMAL,
)

# --- L3, TTECHNO-042 : log(ab) = log a + log b ---------------------------------------------------

L3 = modele(
    'Logarithme d\'un produit',
    'log(ab) = log a + log b : formule ; log a + log b sans calculatrice (produit puissance de 10) ;'
    ' regrouper en log(n) ; log(a × 10^k) ; valeurs approchées',
    1, 30,
    [
        variation(
            'Pour tous réels $a>0$ et $b>0$, $\\log(ab)$ est égal à :'
            + choix('$\\log(a)+\\log(b)$', '$\\log(a)\\times\\log(b)$', '$\\log(a+b)$',
                    '$a\\log(b)$'),
            [], '0',
            ['À connaître : le logarithme transforme un produit en somme.',
             PRODUIT.replace('\\log(a)+\\log(b)', col('\\log(a)+\\log(b)'))],
        ),
        variation(
            'Sans calculatrice, calcule $\\log({{a}})+\\log({{eval:b;d}})$.'
            '\n\n$\\log({{a}})+\\log({{eval:b;d}})=?$',
            [var('a', '2|4|5|8|20|25'), var('k', '1..3'), var('b', 'eval:10^k/a')],
            '{{k}}',
            [PRODUIT,
             '$\\log({{a}})+\\log({{eval:b;d}})=\\log({{a}}\\times{{eval:b;d}})=\\log({{eval:10^k}})='
             + col('{{k}}') + '$.'],
            ['10^k > a'],
        ),
        variation(
            'Écris sous la forme $\\log(n)$, avec $n$ entier : $\\log({{a}})+\\log({{b}})$.'
            '\n\n$\\log({{a}})+\\log({{b}})=\\log(?)$',
            [var('a', '2..9'), var('b', '2..9')],
            '{{eval:a*b}}',
            [PRODUIT,
             '$\\log({{a}})+\\log({{b}})=\\log({{a}}\\times{{b}})=\\log(' + col('{{eval:a*b}}') + ')$.'],
            ['a != b', 'a+b != a*b'],
        ),
        variation(
            'Complète sans calculatrice.\n\n$\\log({{eval:a*10^k}})=\\log({{a}})+?$',
            [var('a', '2..9'), var('k', '1..3')],
            '{{k}}',
            [PRODUIT,
             '${{eval:a*10^k}}={{a}}\\times{{eval:10^k}}$, donc $\\log({{eval:a*10^k}})=\\log({{a}})'
             '+\\log({{eval:10^k}})=\\log({{a}})+' + col('{{k}}') + '$.'],
        ),
        variation(
            'On donne $\\log({{a}})\\approx{{eval:la;d}}$ et $\\log({{b}})\\approx{{eval:lb;d}}$. Déduis-en une valeur'
            ' approchée de $\\log({{eval:a*b}})$.\n\n$\\log({{eval:a*b}})\\approx ?$',
            [var('a', '2|3'), var('b', '5|7'), var('la', L_A),
             var('lb', 'eval:round(1000*log(b))/1000')],
            '{{eval:la+lb;d}}',
            [PRODUIT,
             '$\\log({{eval:a*b}})=\\log({{a}})+\\log({{b}})\\approx{{eval:la;d}}+{{eval:lb;d}}\\approx'
             + col('{{eval:la+lb;d}}') + '$.'],
            ['a*b != 10'],
        ),
    ],
    [
        spec('log(ab) = log a + log b', 0, {}, '0', 'correct'),
        spec('Erreur : log a × log b', 0, {}, '1', 'incorrect'),
        spec('log 4 + log 25 = 2', 1, {'a': '4', 'k': '2', 'b': '25'}, '2', 'correct'),
        spec('Erreur : log 4 + log 25 = 100', 1, {'a': '4', 'k': '2', 'b': '25'}, '100',
             'incorrect'),
        spec('log 2 + log 5 = 1', 1, {'a': '2', 'k': '1', 'b': '5'}, '1', 'correct'),
        spec('log 3 + log 7 = log 21', 2, {'a': '3', 'b': '7'}, '21', 'correct'),
        spec('Erreur : log 10 (somme)', 2, {'a': '3', 'b': '7'}, '10', 'incorrect'),
        spec('log 300 = log 3 + 2', 3, {'a': '3', 'k': '2'}, '2', 'correct'),
        spec('Erreur : 100', 3, {'a': '3', 'k': '2'}, '100', 'incorrect'),
        spec('log 6 ≈ 0,301 + 0,477 = 0,778', 4, {'a': '2', 'b': '3', 'la': '0.301', 'lb': '0.477'},
             '0,778', 'correct'),
        spec('log 14 ≈ 0,301 + 0,845 = 1,146', 4,
             {'a': '2', 'b': '7', 'la': '0.301', 'lb': '0.845'}, '1,146', 'correct'),
        spec('Erreur : produit 0,301 × 0,845 ≈ 0,254', 4,
             {'a': '2', 'b': '7', 'la': '0.301', 'lb': '0.845'}, '0,254', 'incorrect'),
    ],
    shared=DECIMAL,
)

# --- L4, TTECHNO-082 : log(aⁿ) = n log a ---------------------------------------------------------

L4 = modele(
    'Logarithme d\'une puissance',
    'log(aⁿ) = n log a (n entier naturel) : formule ; compléter ; log 8 en fonction de log 2 ; valeur'
    ' approchée ; nombre de chiffres de 2ⁿ',
    1, 30,
    [
        variation(
            'Pour tout réel $a>0$ et tout entier naturel $n$, $\\log\\left(a^n\\right)$ est égal à :'
            + choix('$n\\log(a)$', '$\\left(\\log(a)\\right)^n$', '$\\log(a)+n$', '$a\\log(n)$'),
            [], '0',
            [PUISSANCE.replace('n\\log(a)$.', col('n\\log(a)') + '$.'),
             'C\'est la propriété du produit répétée : $\\log(a\\times a\\times\\cdots\\times a)='
             '\\log(a)+\\log(a)+\\cdots+\\log(a)$.'],
        ),
        variation(
            'Complète.\n\n$\\log\\left({{a}}^{ {{n}} }\\right)=?\\times\\log({{a}})$',
            [var('a', '2..9'), var('n', '2..12')],
            '{{n}}',
            [PUISSANCE,
             '$\\log\\left({{a}}^{ {{n}} }\\right)=' + col('{{n}}') + '\\times\\log({{a}})$.'],
        ),
        variation(
            'Écris $\\log({{eval:a^n}})$ en fonction de $\\log({{a}})$.'
            '\n\n$\\log({{eval:a^n}})=?\\log({{a}})$',
            [var('a', '2|3|5|7'), var('n', '2..6')],
            '{{n}}',
            [PUISSANCE,
             '${{eval:a^n}}={{a}}^{ {{n}} }$, donc $\\log({{eval:a^n}})=' + col('{{n}}')
             + '\\log({{a}})$.'],
            ['a^n <= 729', 'a^n/a != n'],
        ),
        variation(
            'On donne $\\log({{a}})\\approx{{eval:la;d}}$. Déduis-en une valeur approchée de'
            ' $\\log\\left({{a}}^{ {{n}} }\\right)$.\n\n$\\log\\left({{a}}^{ {{n}} }\\right)\\approx ?$',
            [var('a', '2|3|5|7'), var('n', '2..9'), var('la', L_A)],
            '{{eval:n*la;d}}',
            [PUISSANCE,
             '$\\log\\left({{a}}^{ {{n}} }\\right)={{n}}\\log({{a}})\\approx{{n}}\\times{{eval:la;d}}\\approx'
             + col('{{eval:n*la;d}}') + '$.'],
        ),
        variation(
            'On donne $\\log(2)\\approx0{,}30103$. Combien de chiffres a l\'écriture décimale de'
            ' $2^{ {{n}} }$ ?\n\n$?$ chiffres',
            [var('n', '20|30|40|50|64|100')],
            '{{eval:floor(n*0.30103)+1}}',
            [PUISSANCE,
             '$\\log\\left(2^{ {{n}} }\\right)={{n}}\\log(2)\\approx{{eval:n*0.30103;d}}$, donc'
             ' $10^{ {{eval:floor(n*0.30103)}} }\\leqslant2^{ {{n}} }<10^{ {{eval:floor(n*0.30103)+1}} }$.',
             'Un entier compris entre $10^k$ et $10^{k+1}$ (exclu) a $k+1$ chiffres : $2^{ {{n}} }$ a $'
             + col('{{eval:floor(n*0.30103)+1}}') + '$ chiffres.'],
        ),
    ],
    [
        spec('log(a^n) = n log a', 0, {}, '0', 'correct'),
        spec('Erreur : (log a)^n', 0, {}, '1', 'incorrect'),
        spec('log(3^7) = 7 × log 3', 1, {'a': '3', 'n': '7'}, '7', 'correct'),
        spec('Erreur : 3', 1, {'a': '3', 'n': '7'}, '3', 'incorrect'),
        spec('log 8 = 3 log 2', 2, {'a': '2', 'n': '3'}, '3', 'correct'),
        spec('Erreur : 4 (8 ÷ 2)', 2, {'a': '2', 'n': '3'}, '4', 'incorrect'),
        spec('log 125 = 3 log 5', 2, {'a': '5', 'n': '3'}, '3', 'correct'),
        spec('log(2^5) ≈ 5 × 0,301 = 1,505', 3, {'a': '2', 'n': '5', 'la': '0.301'}, '1,505',
             'correct'),
        spec('Erreur : 0,301 + 5', 3, {'a': '2', 'n': '5', 'la': '0.301'}, '5,301', 'incorrect'),
        spec('2^50 a 16 chiffres', 4, {'n': '50'}, '16', 'correct'),
        spec('Erreur : 15 (partie entière)', 4, {'n': '50'}, '15', 'incorrect'),
        spec('2^64 a 20 chiffres', 4, {'n': '64'}, '20', 'correct'),
    ],
    shared=DECIMAL,
)

# --- L5, TTECHNO-083 : log(a/b) = log a − log b --------------------------------------------------

L5 = modele(
    'Logarithme d\'un quotient',
    'log(a/b) = log a − log b : formule ; log(1/a) = −log a ; regrouper en log(n) ; valeurs'
    ' approchées de log(1/a) et log(10ᵏ/a)',
    1, 30,
    [
        variation(
            'Pour tous réels $a>0$ et $b>0$, $\\log\\left(\\dfrac{a}{b}\\right)$ est égal à :'
            + choix('$\\log(a)-\\log(b)$', '$\\dfrac{\\log(a)}{\\log(b)}$', '$\\log(a-b)$',
                    '$\\log(b)-\\log(a)$'),
            [], '0',
            ['À connaître : le logarithme transforme un quotient en différence.', QUOTIENT],
        ),
        variation(
            'Complète.\n\n$\\log\\left(\\dfrac{1}{ {{a}} }\\right)=?\\log({{a}})$',
            [var('a', '2|3|5|7|11|13')],
            '-1',
            [QUOTIENT,
             '$\\log\\left(\\dfrac{1}{ {{a}} }\\right)=\\log(1)-\\log({{a}})=0-\\log({{a}})='
             + col('-') + '\\log({{a}})$ : le coefficient est $' + col('-1') + '$.'],
        ),
        variation(
            'Écris sous la forme $\\log(n)$, avec $n$ entier : $\\log({{eval:b*m}})-\\log({{b}})$.'
            '\n\n$\\log({{eval:b*m}})-\\log({{b}})=\\log(?)$',
            [var('b', '2..6'), var('m', '2..9')],
            '{{m}}',
            [QUOTIENT,
             '$\\log({{eval:b*m}})-\\log({{b}})=\\log\\left(\\dfrac{ {{eval:b*m}} }{ {{b}} }\\right)=\\log('
             + col('{{m}}') + ')$.'],
            ['b*m-b != m'],
        ),
        variation(
            'On donne $\\log({{a}})\\approx{{eval:la;d}}$. Déduis-en une valeur approchée de'
            ' $\\log\\left(\\dfrac{1}{ {{a}} }\\right)$.\n\n$\\log\\left(\\dfrac{1}{ {{a}} }\\right)\\approx ?$',
            [var('a', '2|3|5|7'), var('la', L_A)],
            '{{eval:-la;d}}',
            [QUOTIENT,
             '$\\log\\left(\\dfrac{1}{ {{a}} }\\right)=-\\log({{a}})\\approx' + col('{{eval:-la;d}}') + '$.'],
        ),
        variation(
            'On donne $\\log({{a}})\\approx{{eval:la;d}}$. Déduis-en une valeur approchée de'
            ' $\\log({{eval:10^k/a;d}})$.\n\n$\\log({{eval:10^k/a;d}})\\approx ?$',
            [var('a', '2|4|5|8'), var('k', '1..2'),
             var('la', 'eval:round(1000*log(a))/1000')],
            '{{eval:k-la;d}}',
            [QUOTIENT,
             '${{eval:10^k/a;d}}=\\dfrac{ {{eval:10^k}} }{ {{a}} }$, donc $\\log({{eval:10^k/a;d}})='
             '\\log({{eval:10^k}})-\\log({{a}})\\approx{{k}}-{{eval:la;d}}\\approx' + col('{{eval:k-la;d}}')
             + '$.'],
        ),
    ],
    [
        spec('log(a/b) = log a − log b', 0, {}, '0', 'correct'),
        spec('Erreur : log a / log b', 0, {}, '1', 'incorrect'),
        spec('log(1/3) = −1 × log 3', 1, {'a': '3'}, '-1', 'correct'),
        spec('Erreur : 1', 1, {'a': '3'}, '1', 'incorrect'),
        spec('log 24 − log 4 = log 6', 2, {'b': '4', 'm': '6'}, '6', 'correct'),
        spec('Erreur : log 20 (différence)', 2, {'b': '4', 'm': '6'}, '20', 'incorrect'),
        spec('log(1/2) ≈ −0,301', 3, {'a': '2', 'la': '0.301'}, '-0,301', 'correct'),
        spec('Erreur : 1/0,301 ≈ 3,322', 3, {'a': '2', 'la': '0.301'}, '3,322', 'incorrect'),
        spec('log 5 = log(10/2) ≈ 0,699', 4, {'a': '2', 'k': '1', 'la': '0.301'}, '0,699',
             'correct'),
        spec('Erreur : 0,301 − 1', 4, {'a': '2', 'k': '1', 'la': '0.301'}, '-0,699', 'incorrect'),
        spec('log 12,5 = log(100/8) ≈ 1,097', 4, {'a': '8', 'k': '2', 'la': '0.903'}, '1,097',
             'correct'),
    ],
    shared=DECIMAL,
)

# --- L6, TTECHNO-044 : transformer des expressions ---------------------------------------------

L6 = modele(
    'Transformer des expressions avec le logarithme décimal',
    'log(2ᵖ3^q) en fonction de log 2 et log 3 ; log a + log b − log c = log n ; expressions'
    ' littérales : log(10ᵏx), log(xⁿ) + log(xᵐ), log(10ᵏ/xⁿ)',
    2, 60,
    [
        variation(
            'Écris $\\log({{eval:2^p*3^q}})$ en fonction de $\\log(2)$ et $\\log(3)$.'
            '\n\n$\\log({{eval:2^p*3^q}})=?\\log(2)+?\\log(3)$',
            [var('p', '1..4'), var('q', '1..3')],
            ['{{p}}', '{{q}}'],
            [PRODUIT + ' ' + PUISSANCE,
             '${{eval:2^p*3^q}}={{if:p==1|2|2^{ {{p}} }}}\\times{{if:q==1|3|3^{ {{q}} }}}$, donc'
             ' $\\log({{eval:2^p*3^q}})=\\log\\left({{if:p==1|2|2^{ {{p}} }}}\\right)+\\log\\left('
             '{{if:q==1|3|3^{ {{q}} }}}\\right)=' + col('{{p}}') + '\\log(2)+' + col('{{q}}')
             + '\\log(3)$.'],
            ['p+q >= 3'],
        ),
        variation(
            'Écris $A=\\log({{a}})+\\log({{b}})-\\log({{c}})$ sous la forme $\\log(n)$, avec $n$'
            ' entier.\n\n$A=\\log(?)$',
            [var('c', '2..5'), var('m', '2..5'), var('a', '{{eval:c*m}}'), var('b', '2..9')],
            '{{eval:m*b}}',
            [PRODUIT + ' ' + QUOTIENT,
             '$A=\\log\\left(\\dfrac{ {{a}}\\times{{b}} }{ {{c}} }\\right)=\\log('
             + col('{{eval:m*b}}') + ')$.'],
            ['m*b != a+b-c'],
        ),
        variation(
            'Pour tout réel $x>0$, complète.\n\n$\\log({{eval:10^k}}x)=?+\\log(x)$',
            [var('k', '1..4')],
            '{{k}}',
            [PRODUIT,
             '$\\log({{eval:10^k}}x)=\\log({{eval:10^k}})+\\log(x)=' + col('{{k}}') + '+\\log(x)$.'],
        ),
        variation(
            'Pour tout réel $x>0$, écris $\\log\\left(x^{ {{n}} }\\right)+\\log\\left(x^{ {{m}} }\\right)$'
            ' sous la forme $k\\log(x)$.\n\n$\\log\\left(x^{ {{n}} }\\right)+\\log\\left(x^{ {{m}} }\\right)'
            '=?\\log(x)$',
            [var('n', '2..5'), var('m', '2..5')],
            '{{eval:n+m}}',
            [PUISSANCE,
             '$\\log\\left(x^{ {{n}} }\\right)+\\log\\left(x^{ {{m}} }\\right)={{n}}\\log(x)+{{m}}\\log(x)='
             + col('{{eval:n+m}}') + '\\log(x)$.'],
            ['n*m != n+m'],
        ),
        variation(
            'Pour tout réel $x>0$, complète.\n\n$\\log\\left(\\dfrac{ {{eval:10^k}} }{x^{ {{n}} }}\\right)'
            '=?-?\\log(x)$',
            [var('k', '1..3'), var('n', '2..4')],
            ['{{k}}', '{{n}}'],
            [QUOTIENT + ' ' + PUISSANCE,
             '$\\log\\left(\\dfrac{ {{eval:10^k}} }{x^{ {{n}} }}\\right)=\\log({{eval:10^k}})-'
             '\\log\\left(x^{ {{n}} }\\right)=' + col('{{k}}') + '-' + col('{{n}}') + '\\log(x)$.'],
            ['k != n'],
        ),
    ],
    [
        spec('log 72 = 3 log 2 + 2 log 3', 0, {'p': '3', 'q': '2'}, ['3', '2'], 'correct'),
        spec('Erreur : cases échangées', 0, {'p': '3', 'q': '2'}, ['2', '3'], 'incorrect'),
        spec('log 15 + log 4 − log 5 = log 12', 1, {'c': '5', 'm': '3', 'a': '15', 'b': '4'}, '12',
             'correct'),
        spec('Erreur : log 14 (somme et différence)', 1, {'c': '5', 'm': '3', 'a': '15', 'b': '4'},
             '14', 'incorrect'),
        spec('log(100x) = 2 + log x', 2, {'k': '2'}, '2', 'correct'),
        spec('Erreur : 100', 2, {'k': '2'}, '100', 'incorrect'),
        spec('log x² + log x³ = 5 log x', 3, {'n': '2', 'm': '3'}, '5', 'correct'),
        spec('Erreur : 6 (exposants multipliés)', 3, {'n': '2', 'm': '3'}, '6', 'incorrect'),
        spec('log(1000/x²) = 3 − 2 log x', 4, {'k': '3', 'n': '2'}, ['3', '2'], 'correct'),
        spec('Erreur : 1000 et 2', 4, {'k': '3', 'n': '2'}, ['1000', '2'], 'incorrect'),
    ],
    shared=DECIMAL,
)

MODELES = [('01-logarithme-decimal-definition', L1),
           ('02-logarithme-decimal-sens-de-variation', L2),
           ('03-logarithme-produit', L3),
           ('04-logarithme-puissance', L4),
           ('05-logarithme-quotient', L5),
           ('06-logarithme-transformer-expressions', L6)]

os.makedirs(DOSSIER, exist_ok=True)
for nom, m in MODELES:
    chemin = os.path.join(DOSSIER, nom + '.json')
    with open(chemin, 'w', encoding='utf-8') as f:
        json.dump(m, f, ensure_ascii=False, indent='\t')
        f.write('\n')
    print('écrit', chemin)
