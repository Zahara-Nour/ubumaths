"""Écrit les 4 modèles du lot 4b « Calcul littéral : transformer, mettre en équation » de la 5e
dans scripts/questions/5-litteral-b/.

Phase 0 validée par David le 2026-10-29 (« je te suis ») ; un point par modèle, thème « Calcul
littéral » :

| #  | Point | Titre | Variations | Réponse | Catégorie, niveau |
| 8  | 5-107 | Développer avec un facteur décimal | k(x + q), k(x − q) avec k décimal ;
|    |       | (x + q) × p, p(x − q) avec q décimal | case | Transformation › Développement, 2 |
| 9  | 5-038 | Factoriser ax + bx | entiers, décimaux, ax + x, x + ax, ax − bx, ax − x |
|    |       | 3 cases | Transformation › Factorisation, 3 |
| 10 | 5-044 | Quelle équation traduit le problème ? (x + b = c) | billes, planche, âge |
|    |       | choix parmi 4 | Equations › Mettre en équation, 1 |
| 11 | 5-125 | idem (ax = c) | cahiers, rectangle, sachets | choix parmi 4 |
|    |       | Equations › Mettre en équation, 2 |

Bornes : `cycle4.json`, 5e (5-107 et 5-038 : distributivité simple, facteur décimal positif,
attention au cas b = 1 ; 5-044 : x + b = c ; 5-125 : ax = c ; décimaux). Valeurs positives
partout (produit de relatifs : 4e). Modéliser seulement : résoudre est couvert par 5-045 / 5-126.

Les niveaux 2 (Développement) et 3 (Factorisation) sont pris par des modèles publiés : la
migration de rangement décale de +1 les niveaux qui suivent (décision de David, journal § 15),
et passe en 5e d4679e2d (→ 5-107), e66089e0 et 9231b54b (→ 5-038).

    python3 docs/wip/questions/lot-5-litteral-b.py scripts/questions/5-litteral-b
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


def modele(nom, title, description, domain, subdomain, level, variations, specs, delay=30,
           options=None):
    m = {'title': title, 'description': description, 'grades': ['5'], 'theme': 'Calcul littéral',
         'domain': domain, 'subdomain': subdomain, 'level': level, 'delay': delay,
         'status': 'draft', 'variations': variations, 'testSpecs': specs}
    if options:
        m['options'] = options
    return nom, m


def var(nom, expression):
    return {'name': nom, 'expression': expression}


def variation(statement, variables, answers, steps, conditions=None):
    v = {'statement': statement, 'variables': variables}
    if conditions:
        v['conditions'] = conditions
    v['blanks'] = [a if isinstance(a, dict) else {'expectedAnswer': a} for a in answers]
    v['correction'] = {'steps': steps}
    return v


def col(x, k=0):
    return '\\textcolor{{{color:primary.' + str(k) + '}}}{' + x + '}'


def m(x):
    return '$' + x + '$'


def choix(lignes, melanger=True):
    tete = '' if melanger else 'melanger: non\n'
    return '\n\n```choix\n' + tete + ''.join('- ' + l + '\n' for l in lignes) + '```'


def ev(x):
    return '{{eval:' + x + '}}'


def evd(x):
    """Valeur décimale écrite avec sa virgule."""
    return '{{eval:' + x + ';d}}'


MODELES = []

# --- 8. 5-107 : développer avec un facteur décimal -----------------------------------------
# Jamais de variable `e` ni `i` (constantes). Dixièmes non entiers : K ou Q hors de 10, 20.

DEV_DEF = ('**Développer.** On multiplie le facteur par **chaque terme** de la parenthèse :'
           ' $k(a + b) = k \\times a + k \\times b$ et $k(a - b) = k \\times a - k \\times b$.')
DEV_QUESTION = 'Développe et réduis.\n\n$$EXPR = ?$$'
K_DIXIEME = [var('K', '1..25'), var('k', 'eval:K/10;d'), var('q', '2..9')]
Q_DIXIEME = [var('Q', '1..25'), var('r', 'eval:Q/10;d'), var('p', '2..9')]
K_COND = ['K!=10', 'K!=20']
Q_COND = ['Q!=10', 'Q!=20']


def developper(expr, attendu, calcul, variables, conditions):
    return variation(DEV_QUESTION.replace('EXPR', expr), variables, [attendu],
                     [DEV_DEF, '$$' + expr + ' = ' + calcul + ' = ' + col(attendu) + '$$'],
                     conditions)


D_K_PLUS = developper('{{k}}(x + {{q}})', '{{k}}x + ' + evd('K*q/10'),
                      '{{k}} \\times x + {{k}} \\times {{q}}', K_DIXIEME, K_COND)
D_K_MOINS = developper('{{k}}(x - {{q}})', '{{k}}x - ' + evd('K*q/10'),
                       '{{k}} \\times x - {{k}} \\times {{q}}', K_DIXIEME, K_COND)
D_P_PLUS = developper('(x + {{r}}) \\times {{p}}', '{{p}}x + ' + evd('p*Q/10'),
                      'x \\times {{p}} + {{r}} \\times {{p}}', Q_DIXIEME, Q_COND)
D_P_MOINS = developper('{{p}}(x - {{r}})', '{{p}}x - ' + evd('p*Q/10'),
                       '{{p}} \\times x - {{p}} \\times {{r}}', Q_DIXIEME, Q_COND)

K5 = {'K': 5, 'k': '0.5', 'q': 4}
K12 = {'K': 12, 'k': '1.2', 'q': 3}
Q25 = {'Q': 25, 'r': '2.5', 'p': 4}
Q15 = {'Q': 15, 'r': '1.5', 'p': 3}
MODELES.append(modele(
    '08-developper-facteur-decimal', 'Développer avec un facteur décimal',
    'Développer et réduire k(x + q) ou k(x − q) avec un facteur ou un terme décimal :'
    ' 0,5(x + 4) = 0,5x + 2 ; (x + 2,5) × 4 = 4x + 10',
    'Transformation', 'Développement', 2,
    [D_K_PLUS, D_K_MOINS, D_P_PLUS, D_P_MOINS],
    [spec('0,5(x + 4) = 0,5x + 2', 0, K5, '0{,}5x+2', 'correct'),
     spec('0,5(x + 4) = 0,5x + 2 (virgule nue)', 0, K5, '0,5x+2', 'correct'),
     spec('0,5(x + 4) = 2 + 0,5x', 0, K5, '2+0{,}5x', 'correct'),
     spec('Erreur : 0,5x + 4 (second terme oublié)', 0, K5, '0{,}5x+4', 'incorrect'),
     spec('Erreur : 0,5x + 0,2 (0,5 × 4 mal calculé)', 0, K5, '0{,}5x+0{,}2', 'incorrect'),
     spec('Non réduit : 0,5x + 0,5 × 4', 0, K5, '0{,}5x+0{,}5\\times4', 'bad_form',
          ['form']),
     spec('1,2(x − 3) = 1,2x − 3,6', 1, K12, '1{,}2x-3{,}6', 'correct'),
     spec('Erreur : 1,2x − 3', 1, K12, '1{,}2x-3', 'incorrect'),
     spec('Erreur : 1,2x + 3,6 (signe)', 1, K12, '1{,}2x+3{,}6', 'incorrect'),
     spec('(x + 2,5) × 4 = 4x + 10', 2, Q25, '4x+10', 'correct'),
     spec('Erreur : 4x + 2,5', 2, Q25, '4x+2{,}5', 'incorrect'),
     spec('Erreur : x + 10', 2, Q25, 'x+10', 'incorrect'),
     spec('3(x − 1,5) = 3x − 4,5', 3, Q15, '3x-4{,}5', 'correct'),
     spec('Erreur : 3x − 1,5', 3, Q15, '3x-1{,}5', 'incorrect')],
    delay=60))

# --- 9. 5-038 : factoriser ax + bx ---------------------------------------------------------
# Trois cases : les deux coefficients dans l'ordre de l'énoncé, puis leur somme (ou différence).

FACT_DEF = ('**Factoriser.** $x$ est un facteur commun aux deux termes :'
            ' $a \\times x + b \\times x = (a + b) \\times x$.')
UN_DEF = '**Attention :** $x$ seul, c\'est $1 \\times x$ : son coefficient est $1$.'
FACT_QUESTION = 'Factorise par $x$, puis réduis.\n\n$$EXPR = (\\,?\\,OP\\,?\\,)\\,x = ?\\,x$$'
ENTIERS = [var('a', '2..9'), var('b', '2..9')]
DECIMAUX = [var('A', '11..49'), var('B', '11..49'), var('a', 'eval:A/10;d'),
            var('b', 'eval:B/10;d')]
UN_DECIMAL = [var('A', '11..49'), var('a', 'eval:A/10;d')]
DEC_COND = ['A%10!=0', 'B%10!=0']


def factoriser(expr, op, premier, second, total, variables, conditions, steps_avant=None):
    return variation(
        FACT_QUESTION.replace('EXPR', expr).replace('OP', op), variables,
        [premier, second, total],
        [FACT_DEF] + (steps_avant or [])
        + ['$$' + expr + ' = (' + premier + ' ' + op + ' ' + second + ')\\,x = '
           + col(total + 'x') + '$$'],
        conditions)


F_ENTIERS = factoriser('{{a}}x + {{b}}x', '+', '{{a}}', '{{b}}', ev('a+b'), ENTIERS, ['a!=b'])
F_DECIMAUX = factoriser('{{a}}x + {{b}}x', '+', '{{a}}', '{{b}}', evd('(A+B)/10'), DECIMAUX,
                        DEC_COND + ['A!=B'])
F_UN_FIN = factoriser('{{a}}x + x', '+', '{{a}}', '1', evd('(A+10)/10'), UN_DECIMAL,
                      ['A%10!=0'], [UN_DEF])
F_UN_TETE = factoriser('x + {{a}}x', '+', '1', '{{a}}', evd('(A+10)/10'), UN_DECIMAL,
                       ['A%10!=0'], [UN_DEF])
F_MOINS = factoriser('{{a}}x - {{b}}x', '-', '{{a}}', '{{b}}', evd('(A-B)/10'), DECIMAUX,
                     DEC_COND + ['A>B'])
F_MOINS_UN = factoriser('{{a}}x - x', '-', '{{a}}', '1', evd('(A-10)/10'), UN_DECIMAL,
                        ['A%10!=0'], [UN_DEF])

D_25_13 = {'A': 25, 'B': 13, 'a': '2.5', 'b': '1.3'}
D_25 = {'A': 25, 'a': '2.5'}
MODELES.append(modele(
    '09-factoriser-ax-plus-bx', 'Factoriser ax + bx',
    'Factoriser par x puis réduire une somme ax + bx, a et b entiers ou décimaux, avec le cas'
    ' du coefficient 1 : 2,5x + x = (2,5 + 1)x = 3,5x',
    'Transformation', 'Factorisation', 3,
    [F_ENTIERS, F_DECIMAUX, F_UN_FIN, F_UN_TETE, F_MOINS, F_MOINS_UN],
    [spec('3x + 5x = (3 + 5)x = 8x', 0, {'a': 3, 'b': 5}, ['3', '5', '8'], 'correct'),
     spec('Erreur : 15x (coefficients multipliés)', 0, {'a': 3, 'b': 5}, ['3', '5', '15'],
          'incorrect'),
     spec('2,5x + 1,3x = (2,5 + 1,3)x = 3,8x', 1, D_25_13, ['2,5', '1,3', '3,8'], 'correct'),
     spec('2,5x + x = (2,5 + 1)x = 3,5x', 2, D_25, ['2,5', '1', '3,5'], 'correct'),
     spec('Erreur : coefficient 0 pour x', 2, D_25, ['2,5', '0', '2,5'], 'incorrect'),
     spec('Erreur : 2,5x + x = 2,5x', 2, D_25, ['2,5', '1', '2,5'], 'incorrect'),
     spec('x + 2,5x = (1 + 2,5)x = 3,5x', 3, D_25, ['1', '2,5', '3,5'], 'correct'),
     spec('2,5x − 1,3x = (2,5 − 1,3)x = 1,2x', 4, D_25_13, ['2,5', '1,3', '1,2'], 'correct'),
     spec('Erreur : 3,8 (somme au lieu de différence)', 4, D_25_13, ['2,5', '1,3', '3,8'],
          'incorrect'),
     spec('2,5x − x = (2,5 − 1)x = 1,5x', 5, D_25, ['2,5', '1', '1,5'], 'correct'),
     spec('Erreur : 2,5x − x = 2,5x', 5, D_25, ['2,5', '0', '2,5'], 'incorrect')],
    delay=60))

# --- 10 et 11. 5-044 et 5-125 : mettre en équation ----------------------------------------
# La bonne équation est en tête (indice 0), les choix sont mélangés. Aucune autre équation
# juste parmi les choix (ni b + x = c, ni x = c − b).

EQ_QUESTION = '\n\nQuelle équation traduit ce problème ?'
EQ_DEF = ('**Mettre en équation.** On écrit, avec $x$, l\'égalité que dit l\'énoncé : on part de'
          ' $x$ et on fait les opérations dans l\'ordre du texte.')


def equation(enonce, bonne, fausses, variables, traduction, piege, conditions=None):
    return variation(
        enonce + EQ_QUESTION + choix(['$' + bonne + '$'] + ['$' + f + '$' for f in fausses]),
        variables, ['0'], [EQ_DEF, traduction, 'L\'équation est ' + col(bonne).join('$$')
                           + '. ' + piege], conditions)


CALCUL_PIEGE = ('L\'équation dit ce qui se passe ; elle n\'est pas le calcul qui donne $x$'
                ' (ce calcul vient ensuite, pour la résoudre).')

# x + b = c, c > b ; longueurs à une décimale
BILLES = equation(
    'Léa avait des billes. Elle en gagne ${{b}}$ et en a maintenant ${{c}}$. On note $x$ le'
    ' nombre de billes qu\'elle avait au départ.',
    'x + {{b}} = {{c}}', ['x = {{c}} + {{b}}', 'x - {{b}} = {{c}}', '{{b}}x = {{c}}'],
    [var('b', '3..15'), var('c', '20..40')],
    'Au départ $x$ billes, elle en **gagne** ${{b}}$ : $x + {{b}}$ ; elle en a alors ${{c}}$.',
    CALCUL_PIEGE)
PLANCHE = equation(
    'Une planche mesure ${{c}}$ m. On en scie un morceau de ${{b}}$ m. On note $x$ la longueur,'
    ' en mètres, du morceau qui reste.',
    'x + {{b}} = {{c}}', ['x = {{c}} + {{b}}', 'x - {{b}} = {{c}}', '{{b}}x = {{c}}'],
    [var('B', '3..15'), var('R', '5..20'), var('b', 'eval:B/10;d'), var('c', 'eval:(B+R)/10;d')],
    'Les deux morceaux mis bout à bout redonnent la planche : $x + {{b}}$ fait ${{c}}$ m.',
    CALCUL_PIEGE, ['B%10!=0', '(B+R)%10!=0'])
AGE = equation(
    'Dans ${{b}}$ ans, Tom aura ${{c}}$ ans. On note $x$ l\'âge de Tom aujourd\'hui.',
    'x + {{b}} = {{c}}', ['x = {{c}} + {{b}}', 'x - {{b}} = {{c}}', '{{b}}x = {{c}}'],
    [var('b', '2..9'), var('c', '12..20')],
    'Aujourd\'hui $x$ ans ; dans ${{b}}$ ans, il aura $x + {{b}}$ ans, c\'est-à-dire ${{c}}$.',
    CALCUL_PIEGE)

MODELES.append(modele(
    '10-mettre-en-equation-addition', 'Quelle équation traduit le problème ?',
    'Choisir, parmi quatre, l\'équation x + b = c qui traduit un problème d\'addition à trou'
    ' (billes gagnées, planche sciée, âge dans b ans) ; piège : x = c + b',
    'Equations', 'Mettre en équation', 1,
    [BILLES, PLANCHE, AGE],
    [spec('Billes : x + 7 = 23', 0, {'b': 7, 'c': 23}, '0', 'correct'),
     spec('Erreur : x = 23 + 7', 0, {'b': 7, 'c': 23}, '1', 'incorrect'),
     spec('Erreur : x − 7 = 23', 0, {'b': 7, 'c': 23}, '2', 'incorrect'),
     spec('Planche : x + 0,8 = 2,3', 1, {'B': 8, 'R': 15, 'b': '0.8', 'c': '2.3'}, '0', 'correct'),
     spec('Erreur : 0,8x = 2,3', 1, {'B': 8, 'R': 15, 'b': '0.8', 'c': '2.3'}, '3', 'incorrect'),
     spec('Âge : x + 5 = 14', 2, {'b': 5, 'c': 14}, '0', 'correct')],
    delay=45))

# ax = c, c = a × (prix ou longueur décimal)
CAHIERS = equation(
    '${{a}}$ cahiers identiques coûtent ${{c}}$ € en tout. On note $x$ le prix d\'un cahier, en'
    ' euros.',
    '{{a}}x = {{c}}', ['x + {{a}} = {{c}}', 'x = {{a}} \\times {{c}}', '{{c}}x = {{a}}'],
    [var('a', '3..8'), var('P', '5..40'), var('c', 'eval:a*P/10;d')],
    '${{a}}$ cahiers à $x$ € : ${{a}} \\times x$, qui s\'écrit ${{a}}x$ ; cela fait ${{c}}$ €.',
    CALCUL_PIEGE, ['P%10!=0'])
RECTANGLE = equation(
    'Un rectangle a une largeur de ${{a}}$ cm et une aire de ${{c}}$ cm². On note $x$ sa'
    ' longueur, en cm.',
    '{{a}}x = {{c}}', ['x + {{a}} = {{c}}', 'x = {{a}} \\times {{c}}', '{{c}}x = {{a}}'],
    [var('a', '2..9'), var('L', '3..12'), var('c', 'eval:a*L')],
    'L\'aire est largeur $\\times$ longueur : ${{a}} \\times x$, qui s\'écrit ${{a}}x$ ; elle'
    ' vaut ${{c}}$ cm².',
    CALCUL_PIEGE, ['L>a'])
SACHETS = equation(
    'Un paquet de ${{a}}$ sachets identiques pèse ${{c}}$ g. On note $x$ la masse d\'un sachet,'
    ' en grammes.',
    '{{a}}x = {{c}}', ['x + {{a}} = {{c}}', 'x = {{a}} \\times {{c}}', '{{c}}x = {{a}}'],
    [var('a', '4..12'), var('M', '15..60'), var('c', 'eval:a*M')],
    '${{a}}$ sachets de $x$ g : ${{a}}x$ g, qui font ${{c}}$ g.',
    CALCUL_PIEGE)

MODELES.append(modele(
    '11-mettre-en-equation-produit', 'Quelle équation traduit le problème ?',
    'Choisir, parmi quatre, l\'équation ax = c qui traduit un problème de multiplication à trou'
    ' (prix d\'un cahier, longueur d\'un rectangle, masse d\'un sachet) ; piège : x = a × c',
    'Equations', 'Mettre en équation', 2,
    [CAHIERS, RECTANGLE, SACHETS],
    [spec('Cahiers : 5x = 12,5', 0, {'a': 5, 'P': 25, 'c': '12.5'}, '0', 'correct'),
     spec('Erreur : x = 5 × 12,5', 0, {'a': 5, 'P': 25, 'c': '12.5'}, '2', 'incorrect'),
     spec('Erreur : x + 5 = 12,5', 0, {'a': 5, 'P': 25, 'c': '12.5'}, '1', 'incorrect'),
     spec('Rectangle : 4x = 28', 1, {'a': 4, 'L': 7, 'c': 28}, '0', 'correct'),
     spec('Erreur : 28x = 4', 1, {'a': 4, 'L': 7, 'c': 28}, '3', 'incorrect'),
     spec('Sachets : 6x = 150', 2, {'a': 6, 'M': 25, 'c': 150}, '0', 'correct')],
    delay=45))

os.makedirs(DOSSIER, exist_ok=True)
for nom, mod in MODELES:
    with open(os.path.join(DOSSIER, nom + '.json'), 'w', encoding='utf-8') as f:
        json.dump(mod, f, ensure_ascii=False, indent='\t')
        f.write('\n')
# Mis en forme comme le pre-commit, pour que le script redonne les fichiers commités
subprocess.run(['pnpm', 'exec', 'prettier', '--write', DOSSIER], check=True,
               stdout=subprocess.DEVNULL)
print(f'{len(MODELES)} modèles écrits dans {DOSSIER}')
