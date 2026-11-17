"""Écrit les 6 modèles du lot 12 a-2 « Algèbre » de la 2de dans scripts/questions/2de-algebre-a2/.

Phase 0 validée par David le 2026-11-03 (§ 71 du journal `docs/wip/questions-2de-progress.md`).
Points : 2-269 (équation quotient), 2-273 (isoler une variable dans une formule), 2-274 (ax + by = c),
2-275 (choisir la forme), 2-278 (mettre en inéquation), 2-489 (calcul littéral multiplicatif). Un point
par modèle ; le nœud et le tag sont posés par la migration de rangement, après le `--publier` de David.

Décisions et pièges :
- L12a-b : 2-278 en case choix (aucun juge d'inéquation), puis la valeur entière ;
- L12a-c : 2-275 rangé sous Calcul littéral › factorisation (nœud) ; catégorie Transformation ›
  Factorisation niv. 13 ;
- niveaux relevés en prod le 2026-11-03 (index d'unicité par catégorie, tous niveaux scolaires) :
  Equations › Quotient égal à k (neuve) 1 ; Transformation › Isoler une variable (neuve) 1, 2 ;
  Transformation › Factorisation 1 à 12 pris → 13 ; Inéquations › Mettre en inéquation (neuve) 1 ;
  Transformation › Simplification d'écriture 1 à 4 pris → 5 ;
- ensemble des solutions : case `answerKind: 'intervalles'` posée case par case (la valeur interdite
  est un nombre) ;
- `eval` ne connaît ni `==` ni `>` : `floor` et indicatrices.

    python3 docs/wip/questions-2de/lot-algebre-a2-2de.py scripts/questions/2de-algebre-a2
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


def modele(nom, title, description, categorie, level, variations, specs, shared=None, delay=60, options=None):
    m = {'title': title, 'description': description, 'grades': ['2'], 'theme': categorie[0],
         'domain': categorie[1], 'subdomain': categorie[2], 'level': level, 'delay': delay,
         'status': 'draft'}
    if options:
        m['options'] = options
    m['shared'] = {'cleanCoefficients': True}
    if shared:
        m['shared'].update(shared)
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


def case(attendu, ensemble=False):
    c = {'expectedAnswer': attendu}
    if ensemble:
        c['answerKind'] = 'intervalles'
    return c


def col(x, k=0):
    return '\\textcolor{{{color:primary.' + str(k) + '}}}{' + x + '}'


def choix(question, options, melanger=True):
    tete = '' if melanger else 'melanger: non\n'
    return question + '\n\n```choix\n' + tete + ''.join('- ' + o + '\n' for o in options) + '```'


MODELES = []

# --- 1. 2-269 : équation quotient ------------------------------------------------------------

A_SUR_X = variation(
    'Résous dans $\\mathbb{R}\\setminus\\{0\\}$ l\'équation $\\dfrac{ {{a}} }{x}={{b}}$.\n\nL\'ensemble des'
    ' solutions est $S=?$.',
    [var('a', '1..9;±'), var('b', '2..9;±')],
    [case('\\{ {{eval:(a)/(b)}} \\}', ensemble=True)],
    ['Pour $x\\neq 0$, on multiplie les deux membres par $x$ :',
     '$$\\dfrac{ {{a}} }{x}={{b}}\\iff {{a}}={{b}}x\\iff x=\\dfrac{ {{a}} }{ {{b}} }$$',
     '$\\dfrac{ {{a}} }{ {{b}} }\\neq 0$ : c\'est bien une solution. $S=' + col('\\left\\{ {{eval:(a)/(b)}} \\right\\}') + '$.'],
    conditions=['gcd(abs(a),abs(b)) == 1'])

QUOTIENT = variation(
    'On veut résoudre l\'équation $\\dfrac{x{{eval:p;+}}}{x{{eval:q;+}}}={{k}}$.\n\nValeur interdite :'
    ' $x\\neq ?$\n\nL\'ensemble des solutions est $S=?$.',
    [var('p', '1..9;±'), var('q', '1..9;±!p'), var('k', '2..5;±'),
     var('s', 'eval:((k)*(q)-(p))/(1-(k))')],
    [case('{{eval:-(q)}}'), case('\\{ {{s}} \\}', ensemble=True)],
    ['**Valeur interdite** : le dénominateur ne doit pas s\'annuler, $x{{eval:q;+}}\\neq 0$, donc'
     ' $x\\neq ' + col('{{eval:-(q)}}') + '$.',
     'Pour $x\\neq {{eval:-(q)}}$, on multiplie par $x{{eval:q;+}}$ :',
     '$$x{{eval:p;+}}={{k}}(x{{eval:q;+}})\\iff x-{{k}}x={{eval:(k)*(q)}}{{eval:-(p);+}}\\iff'
     ' {{eval:1-(k)}}x={{eval:(k)*(q)-(p)}}\\iff x={{s}}$$',
     '${{s}}\\neq {{eval:-(q)}}$ : la solution est acceptée. $S=' + col('\\left\\{ {{s}} \\right\\}', 1) + '$.'],
    )

INTERDITE = variation(
    'On veut résoudre l\'équation $\\dfrac{ {{a}}x{{eval:(a)*(q);+}} }{x{{eval:q;+}}}={{k}}$.\n\nValeur'
    ' interdite : $x\\neq ?$\n\nL\'ensemble des solutions est $S=?$.',
    [var('a', '2..5'), var('q', '1..6;±'), var('k', '2..7!a')],
    [case('{{eval:-(q)}}'), case('\\varnothing', ensemble=True)],
    ['**Valeur interdite** : $x{{eval:q;+}}\\neq 0$, donc $x\\neq ' + col('{{eval:-(q)}}') + '$.',
     'Pour $x\\neq {{eval:-(q)}}$ :',
     '$${{a}}x{{eval:(a)*(q);+}}={{k}}(x{{eval:q;+}})\\iff {{eval:(a)-(k)}}x={{eval:((k)-(a))*(q)}}\\iff'
     ' x={{eval:-(q)}}$$',
     'Mais ${{eval:-(q)}}$ est la **valeur interdite** : elle n\'est pas solution. L\'équation n\'a aucune'
     ' solution, $S=' + col('\\varnothing', 1) + '$.'],
    conditions=['abs((a)-(k)) != 1'])

MODELES.append(modele(
    '01-equation-quotient', 'Résoudre une équation quotient',
    'a/x = b ; (x + p)/(x + q) = k avec sa valeur interdite ; un cas où la seule solution est la valeur'
    ' interdite (S = ∅)',
    ('Calcul littéral', 'Equations', 'Quotient égal à k'), 1,
    [A_SUR_X, QUOTIENT, INTERDITE],
    [spec('3/x = 4 : S = {3/4}', 0, {'a': 3, 'b': 4}, '\\{\\frac{3}{4}\\}', 'correct'),
     spec('Erreur : b/a', 0, {'a': 3, 'b': 4}, '\\{\\frac{4}{3}\\}', 'incorrect'),
     spec('(x − 4)/(x + 1) = −2 : x ≠ −1, S = {2/3}', 1, {'p': -4, 'q': 1, 'k': -2},
          ['-1', '\\{\\frac{2}{3}\\}'], 'correct'),
     spec('Erreur : valeur interdite de signe opposé', 1, {'p': -4, 'q': 1, 'k': -2},
          ['1', '\\{\\frac{2}{3}\\}'], 'incorrect'),
     spec('(2x + 6)/(x + 3) = 3 : x ≠ −3, S = ∅', 2, {'a': 2, 'q': 3, 'k': 3}, ['-3', '\\varnothing'],
          'correct'),
     spec('Erreur : valeur interdite gardée (S = {−3})', 2, {'a': 2, 'q': 3, 'k': 3}, ['-3', '\\{-3\\}'],
          'incorrect')],
    delay=90))

# --- 2. 2-273 : isoler une variable dans une formule -----------------------------------------

def formule(enonce, rappel, choix_var, attendus, etapes):
    return variation(
        'On donne la formule ' + enonce + '. Exprime ${{if:w==0|' + choix_var[0] + '|' + choix_var[1]
        + '}}$ en fonction des autres grandeurs (toutes non nulles).\n\n${{if:w==0|' + choix_var[0] + '|'
        + choix_var[1] + '}}=?$',
        [var('w', '0|1')],
        [case('{{if:w==0|' + attendus[0] + '|' + attendus[1] + '}}')],
        [rappel, '{{if:w==0|' + etapes[0] + '|' + etapes[1] + '}}'])


RAPPEL = 'On isole la grandeur cherchée en **divisant** (ou en multipliant) les deux membres par la même grandeur non nulle.'

OHM = formule('$U=RI$ (loi d\'Ohm)', RAPPEL, ('I', 'R'), ('\\frac{U}{R}', '\\frac{U}{I}'),
              ('$U=RI$ : on divise par $R$, $' + col('I=\\dfrac{U}{R}') + '$.',
               '$U=RI$ : on divise par $I$, $' + col('R=\\dfrac{U}{I}') + '$.'))
VITESSE = formule('$d=vt$ (distance, vitesse, durée)', RAPPEL, ('v', 't'), ('\\frac{d}{t}', '\\frac{d}{v}'),
                  ('$d=vt$ : on divise par $t$, $' + col('v=\\dfrac{d}{t}') + '$.',
                   '$d=vt$ : on divise par $v$, $' + col('t=\\dfrac{d}{v}') + '$.'))
MASSE = formule('$\\rho=\\dfrac{m}{V}$ (masse volumique)', RAPPEL, ('m', 'V'), ('\\rho V', '\\frac{m}{\\rho}'),
                ('$\\rho=\\dfrac{m}{V}$ : on multiplie par $V$, $' + col('m=\\rho V') + '$.',
                 '$\\rho=\\dfrac{m}{V}$ : on multiplie par $V$ ($\\rho V=m$), puis on divise par $\\rho$, $'
                 + col('V=\\dfrac{m}{\\rho}') + '$.'))

CYLINDRE = variation(
    'Le volume d\'un cylindre de rayon $r$ et de hauteur $h$ est $V=\\pi r^2h$. Exprime $h$ en fonction de'
    ' $V$ et $r$.\n\n$h=?$',
    [], [case('\\frac{V}{\\pi r^2}')],
    ['On divise les deux membres par $\\pi r^2$ (non nul) :', '$$' + col('h=\\dfrac{V}{\\pi r^2}') + '$$'])

DISQUE = variation(
    'L\'aire d\'un disque de rayon $r$ est $S=\\pi r^2$. Exprime $r$ en fonction de $S$.\n\n$r=?$',
    [], [case('\\sqrt{\\frac{S}{\\pi}}')],
    ['On divise par $\\pi$ : $r^2=\\dfrac{S}{\\pi}$.',
     'Un rayon est **positif** : $r$ est la racine carrée positive, $' + col('r=\\sqrt{\\dfrac{S}{\\pi}}') + '$.'])

MODELES.append(modele(
    '02-isoler-une-variable', 'Isoler une grandeur dans une formule',
    'U = RI, d = vt, ρ = m/V : exprimer l\'une des grandeurs ; V = πr²h → h ; S = πr² → r = √(S/π)',
    ('Calcul littéral', 'Transformation', 'Isoler une variable'), 1,
    [OHM, VITESSE, MASSE, CYLINDRE, DISQUE],
    [spec('I = U/R', 0, {'w': 0}, '\\frac{U}{R}', 'correct'),
     spec('Erreur : I = R/U', 0, {'w': 0}, '\\frac{R}{U}', 'incorrect'),
     spec('Erreur : I = UR', 0, {'w': 0}, 'UR', 'incorrect'),
     spec('t = d/v', 1, {'w': 1}, '\\frac{d}{v}', 'correct'),
     spec('Erreur : t = dv', 1, {'w': 1}, 'dv', 'incorrect'),
     spec('m = ρV', 2, {'w': 0}, '\\rho V', 'correct'),
     spec('V = m/ρ', 2, {'w': 1}, '\\frac{m}{\\rho}', 'correct'),
     spec('Erreur : V = ρ/m', 2, {'w': 1}, '\\frac{\\rho}{m}', 'incorrect'),
     spec('h = V/(πr²)', 3, {}, '\\frac{V}{\\pi r^2}', 'correct'),
     spec('Erreur : h = V/(πr)', 3, {}, '\\frac{V}{\\pi r}', 'incorrect'),
     spec('r = √(S/π)', 4, {}, '\\sqrt{\\frac{S}{\\pi}}', 'correct'),
     spec('Erreur : racine oubliée', 4, {}, '\\frac{S}{\\pi}', 'incorrect')]))

# --- 3. 2-274 : ax + by = c ------------------------------------------------------------------

Y_DE_X = variation(
    'Les nombres $x$ et $y$ vérifient ${{a}}x{{eval:b;+}}y={{c}}$. Exprime $y$ en fonction de $x$.\n\n$y=?$',
    [var('a', '2..9;±'), var('b', '2..6;±'), var('c', '1..12;±')],
    [case('{{eval:-(a)/(b)}}x{{eval:(c)/(b);+}}')],
    ['On isole le terme en $y$, puis on divise par ${{b}}$ :',
     '$${{eval:b}}y={{c}}{{eval:-(a);+}}x\\iff y=\\dfrac{ {{c}}{{eval:-(a);+}}x}{ {{b}} }$$',
     '$$' + col('y={{eval:-(a)/(b)}}x{{eval:(c)/(b);+}}') + '$$'])

X_DE_Y = variation(
    'Les nombres $x$ et $y$ vérifient ${{a}}x{{eval:b;+}}y={{c}}$. Exprime $x$ en fonction de $y$.\n\n$x=?$',
    [var('a', '2..6;±'), var('b', '2..9;±'), var('c', '1..12;±')],
    [case('{{eval:-(b)/(a)}}y{{eval:(c)/(a);+}}')],
    ['On isole le terme en $x$, puis on divise par ${{a}}$ :',
     '$${{a}}x={{c}}{{eval:-(b);+}}y\\iff x=\\dfrac{ {{c}}{{eval:-(b);+}}y}{ {{a}} }$$',
     '$$' + col('x={{eval:-(b)/(a)}}y{{eval:(c)/(a);+}}') + '$$'])

MODELES.append(modele(
    '03-ax-plus-by-egal-c', 'Exprimer une variable en fonction de l\'autre',
    'ax + by = c : y en fonction de x, x en fonction de y',
    ('Calcul littéral', 'Transformation', 'Isoler une variable'), 2,
    [Y_DE_X, X_DE_Y],
    [spec('2x + 3y = 6 : y = −(2/3)x + 2', 0, {'a': 2, 'b': 3, 'c': 6}, '-\\frac{2}{3}x+2', 'correct'),
     spec('Forme (6 − 2x)/3 : acceptée, forme réduite demandée', 0, {'a': 2, 'b': 3, 'c': 6}, '\\frac{6-2x}{3}', 'unoptimal_form', ['form']),
     spec('Erreur : signe de a gardé', 0, {'a': 2, 'b': 3, 'c': 6}, '\\frac{2}{3}x+2', 'incorrect'),
     spec('Erreur : c non divisé', 0, {'a': 2, 'b': 3, 'c': 6}, '-\\frac{2}{3}x+6', 'incorrect'),
     spec('4x − y = 8 : x = y/4 + 2', 1, {'a': 4, 'b': -1, 'c': 8}, '\\frac{1}{4}y+2', 'correct'),
     spec('Erreur : x = −y/4 + 2', 1, {'a': 4, 'b': -1, 'c': 8}, '-\\frac{1}{4}y+2', 'incorrect')],
    options={'constraints': {'form': 'warn'}}))

# --- 4. 2-275 : choisir la forme -------------------------------------------------------------

DONNEE = ('Pour tout réel $x$, $f(x)=(x{{eval:-(p);+}})(x{{eval:-(q);+}})$ (forme factorisée)'
          ' $=x^2{{eval:-(p)-(q);+}}x{{eval:(p)*(q);+}}$ (forme développée réduite).\n\n')
FORMES = ['la forme factorisée', 'la forme développée réduite']
VARS_PQ = [var('p', '1..9;±'), var('q', '1..9;±!p')]
COND_PQ = ['(p)+(q) != 0', '(p)*(q) != 0']

F_ZERO = variation(
    DONNEE + choix('Pour calculer $f(0)$, la forme la plus adaptée est :', FORMES, melanger=False)
    + '\n\n$f(0)=?$',
    VARS_PQ, [case('1'), case('{{eval:(p)*(q)}}')],
    ['Dans la **forme développée**, $f(0)$ est le **terme constant** : on le lit sans calcul.',
     '$$f(0)=' + col('{{eval:(p)*(q)}}') + '$$'],
    conditions=COND_PQ)

F_NUL = variation(
    DONNEE + choix('Pour résoudre $f(x)=0$, la forme la plus adaptée est :', FORMES, melanger=False)
    + '\n\nL\'ensemble des solutions de $f(x)=0$ est $S=?$.',
    VARS_PQ, [case('0'), case('\\{ {{p}} ; {{q}} \\}', ensemble=True)],
    ['Avec la **forme factorisée**, on reconnaît une **équation produit nul** :',
     '$$(x{{eval:-(p);+}})(x{{eval:-(q);+}})=0\\iff x={{p}}\\ \\text{ou}\\ x={{q}}$$',
     '$S=' + col('\\{ {{p}} ; {{q}} \\}') + '$.'],
    conditions=COND_PQ)

F_CONSTANTE = variation(
    DONNEE + choix('Pour résoudre $f(x)={{eval:(p)*(q)}}$, la forme la plus adaptée est :', FORMES,
                   melanger=False)
    + '\n\nL\'ensemble des solutions de $f(x)={{eval:(p)*(q)}}$ est $S=?$.',
    VARS_PQ, [case('1'), case('\\{ 0 ; {{eval:(p)+(q)}} \\}', ensemble=True)],
    ['Avec la **forme développée**, le terme constant ${{eval:(p)*(q)}}$ disparaît des deux membres :',
     '$$x^2{{eval:-(p)-(q);+}}x{{eval:(p)*(q);+}}={{eval:(p)*(q)}}\\iff x^2{{eval:-(p)-(q);+}}x=0\\iff'
     ' x(x{{eval:-(p)-(q);+}})=0$$',
     'Produit nul : $x=0$ ou $x={{eval:(p)+(q)}}$, $S=' + col('\\{ 0 ; {{eval:(p)+(q)}} \\}') + '$.'],
    conditions=COND_PQ)

SP_PQ = {'p': 1, 'q': -3}
MODELES.append(modele(
    '04-choisir-la-forme', 'Choisir la forme adaptée d\'une expression',
    'f(x) = (x − p)(x − q) = x² − (p + q)x + pq : quelle forme pour f(0), f(x) = 0, f(x) = pq ?',
    ('Calcul littéral', 'Transformation', 'Factorisation'), 13,
    [F_ZERO, F_NUL, F_CONSTANTE],
    [spec('f(0) = −3 par la forme développée', 0, SP_PQ, ['1', '-3'], 'correct'),
     spec('Erreur : forme factorisée choisie', 0, SP_PQ, ['0', '-3'], 'incorrect'),
     spec('f(x) = 0 : forme factorisée, S = {1 ; −3}', 1, SP_PQ, ['0', '\\{1;-3\\}'], 'correct'),
     spec('Erreur : solutions de signe opposé', 1, SP_PQ, ['0', '\\{-1;3\\}'], 'incorrect'),
     spec('f(x) = −3 : forme développée, S = {0 ; −2}', 2, SP_PQ, ['1', '\\{0;-2\\}'], 'correct'),
     spec('Erreur : forme factorisée choisie', 2, SP_PQ, ['0', '\\{0;-2\\}'], 'incorrect'),
     spec('Erreur : x = 0 oublié', 2, SP_PQ, ['1', '\\{-2\\}'], 'incorrect')],
    delay=90))

# --- 5. 2-278 : mettre en inéquation ---------------------------------------------------------

TAXI = variation(
    choix('Une course de taxi coûte ${{f}}~\\unit{€}$ de prise en charge, puis ${{a}}~\\unit{€}$ par'
          ' kilomètre. Léo dispose d\'**au plus** ${{m}}~\\unit{€}$. On note $x$ la distance parcourue, en km.'
          '\n\nQuelle inéquation traduit la situation ?',
          ['${{f}}+{{a}}x\\leqslant {{m}}$', '${{f}}+{{a}}x<{{m}}$', '${{f}}+{{a}}x\\geqslant {{m}}$',
           '${{a}}+{{f}}x\\leqslant {{m}}$'])
    + '\n\nQuelle distance entière maximale, en km, Léo peut-il parcourir ?\n\n$$?~\\unit{km}$$',
    [var('f', '3..8'), var('a', '2..4'), var('m', '25..60')],
    [case('0'), case('{{eval:floor(((m)-(f))/(a))}}')],
    ['« **Au plus** $m$ » se traduit par « $\\leqslant m$ » (l\'égalité est permise) ; le prix est'
     ' ${{f}}+{{a}}x$.',
     '$$' + col('{{f}}+{{a}}x\\leqslant {{m}}') + '\\iff {{a}}x\\leqslant {{eval:(m)-(f)}}\\iff x\\leqslant'
     ' \\dfrac{ {{eval:(m)-(f)}} }{ {{a}} }$$',
     'La plus grande distance entière est $' + col('{{eval:floor(((m)-(f))/(a))}}', 1) + '~\\unit{km}$.'],
    conditions=['f != a'])

RECETTE = variation(
    choix('Une association vend des billets à ${{a}}~\\unit{€}$ ; la salle lui coûte ${{f}}~\\unit{€}$. Elle'
          ' veut un bénéfice d\'**au moins** ${{m}}~\\unit{€}$. On note $x$ le nombre de billets vendus.'
          '\n\nQuelle inéquation traduit la situation ?',
          ['${{a}}x-{{f}}\\geqslant {{m}}$', '${{a}}x-{{f}}>{{m}}$', '${{a}}x-{{f}}\\leqslant {{m}}$',
           '${{a}}x+{{f}}\\geqslant {{m}}$'])
    + '\n\nCombien de billets doit-elle vendre au minimum ?\n\n$$?$$',
    [var('a', '4..12'), var('f', '50..200'), var('m', '100..400')],
    [case('0'), case('{{eval:-floor(-((m)+(f))/(a))}}')],
    ['Le bénéfice est la recette moins le coût : ${{a}}x-{{f}}$. « **Au moins** $m$ » se traduit par'
     ' « $\\geqslant m$ ».',
     '$$' + col('{{a}}x-{{f}}\\geqslant {{m}}') + '\\iff {{a}}x\\geqslant {{eval:(m)+(f)}}\\iff x\\geqslant'
     ' \\dfrac{ {{eval:(m)+(f)}} }{ {{a}} }$$',
     'Le plus petit nombre entier de billets est $' + col('{{eval:-floor(-((m)+(f))/(a))}}', 1) + '$.'],
    conditions=['mod((m)+(f), a) != 0'])

MODELES.append(modele(
    '05-mettre-en-inequation', 'Mettre un problème en inéquation',
    '« Au plus », « au moins » : choisir l\'inéquation qui traduit la situation, puis la valeur entière'
    ' extrême',
    ('Calcul littéral', 'Inéquations', 'Mettre en inéquation'), 1,
    [TAXI, RECETTE],
    [spec('5 + 3x ⩽ 40 : 11 km', 0, {'f': 5, 'a': 3, 'm': 40}, ['0', '11'], 'correct'),
     spec('Erreur : inégalité stricte', 0, {'f': 5, 'a': 3, 'm': 40}, ['1', '11'], 'incorrect'),
     spec('Erreur : arrondi au-dessus (12)', 0, {'f': 5, 'a': 3, 'm': 40}, ['0', '12'], 'incorrect'),
     spec('8x − 100 ⩾ 150 : 32 billets', 1, {'a': 8, 'f': 100, 'm': 150}, ['0', '32'], 'correct'),
     spec('Erreur : coût ajouté', 1, {'a': 8, 'f': 100, 'm': 150}, ['3', '32'], 'incorrect'),
     spec('Erreur : arrondi en dessous (31)', 1, {'a': 8, 'f': 100, 'm': 150}, ['0', '31'], 'incorrect')],
    delay=90))

# --- 6. 2-489 : calcul littéral multiplicatif ------------------------------------------------

INVERSE = variation(
    'Écris sous la forme d\'une fraction : $\\dfrac{1}{\\dfrac{ {{a}} }{ {{b}} }}=?$',
    [var('a', '2..9'), var('b', '2..9!a')],
    [case('\\frac{ {{b}} }{ {{a}} }')],
    ['$$\\dfrac{1}{\\dfrac{a}{b}}=\\dfrac{b}{a}$$', '$$\\dfrac{1}{\\dfrac{ {{a}} }{ {{b}} }}=' + col('\\dfrac{ {{b}} }{ {{a}} }') + '$$'],
    conditions=['gcd(a,b) == 1'])

FRACTION_DE_FRACTION = variation(
    'Écris sous la forme d\'une fraction irréductible : $\\dfrac{\\dfrac{ {{a}} }{ {{b}} }}{\\dfrac{ {{c}} }{ {{d}} }}=?$',
    [var('a', '1..9'), var('b', '2..9'), var('c', '1..9'), var('d', '2..9')],
    [case('{{eval:((a)*(d))/((b)*(c))}}')],
    ['Diviser par une fraction, c\'est multiplier par son inverse : $\\dfrac{\\dfrac{a}{b}}{\\dfrac{c}{d}}=\\dfrac{a}{b}\\times\\dfrac{d}{c}=\\dfrac{ad}{bc}$.',
     '$$\\dfrac{ {{a}} }{ {{b}} }\\times\\dfrac{ {{d}} }{ {{c}} }=\\dfrac{ {{eval:(a)*(d)}} }{ {{eval:(b)*(c)}} }='
     + col('{{eval:((a)*(d))/((b)*(c))}}') + '$$'],
    conditions=['gcd(a,b) == 1', 'gcd(c,d) == 1', '(a)*(d) != (b)*(c)'])

COEFFICIENT = variation(
    'Complète : $\\dfrac{ {{a}}x}{ {{b}} }=?\\times x$',
    [var('a', '2..9'), var('b', '2..9!a')],
    [case('{{eval:(a)/(b)}}')],
    ['$$\\dfrac{ab}{c}=\\dfrac{a}{c}\\times b$$', '$$\\dfrac{ {{a}}x}{ {{b}} }=' + col('{{eval:(a)/(b)}}') + '\\times x$$'])

MOINS_UN = variation(
    'Simplifie : $\\dfrac{ {{a}}x}{-1}=?$',
    [var('a', '2..9')],
    [case('-{{a}}x')],
    ['Diviser par $-1$, c\'est multiplier par $-1$ : $\\dfrac{a}{-1}=(-1)\\times a=-a$.',
     '$$\\dfrac{ {{a}}x}{-1}=' + col('-{{a}}x') + '$$'])

MODELES.append(modele(
    '06-calcul-litteral-multiplicatif', 'Calcul littéral multiplicatif',
    '1/(a/b) = b/a ; (a/b)/(c/d) = ad/(bc) ; ax/b = (a/b) × x ; a/(−1) = −a',
    ('Calcul littéral', 'Transformation', 'Simplification d\'écriture'), 5,
    [INVERSE, FRACTION_DE_FRACTION, COEFFICIENT, MOINS_UN],
    [spec('1/(3/5) = 5/3', 0, {'a': 3, 'b': 5}, '\\frac{5}{3}', 'correct'),
     spec('Erreur : 3/5', 0, {'a': 3, 'b': 5}, '\\frac{3}{5}', 'incorrect'),
     spec('(2/3)/(5/7) = 14/15', 1, {'a': 2, 'b': 3, 'c': 5, 'd': 7}, '\\frac{14}{15}', 'correct'),
     spec('Erreur : (2 × 5)/(3 × 7)', 1, {'a': 2, 'b': 3, 'c': 5, 'd': 7}, '\\frac{10}{21}', 'incorrect'),
     spec('3x/4 = (3/4) × x', 2, {'a': 3, 'b': 4}, '\\frac{3}{4}', 'correct'),
     spec('Erreur : 4/3', 2, {'a': 3, 'b': 4}, '\\frac{4}{3}', 'incorrect'),
     spec('5x/(−1) = −5x', 3, {'a': 5}, '-5x', 'correct'),
     spec('Erreur : 5x', 3, {'a': 5}, '5x', 'incorrect')],
    delay=45))

os.makedirs(DOSSIER, exist_ok=True)
for nom, m in MODELES:
    with open(os.path.join(DOSSIER, nom + '.json'), 'w', encoding='utf-8') as f:
        json.dump(m, f, ensure_ascii=False, indent='\t')
        f.write('\n')
# Mis en forme comme le pre-commit, pour que le script redonne les fichiers commités
subprocess.run(['pnpm', 'exec', 'prettier', '--write', DOSSIER], check=True,
               stdout=subprocess.DEVNULL)
print(f'{len(MODELES)} modèles écrits dans {DOSSIER}')
