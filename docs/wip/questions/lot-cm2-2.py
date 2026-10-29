"""Écrit les 5 modèles du lot 2 du CM2 (multiples et diviseurs) dans scripts/questions/cm2-2/.

Phase 0 validée par David le 2026-10-29 (§ 7 du journal `docs/wip/questions-cm2-progress.md`).
Bornes : `cycle3.json`, CM2 (CM2-130 diviseur de 2 à 10 ; CM2-009 nombre ≤ 100 ; CM2-010 et
CM2-011 nombres ≤ 30 ; CM2-012 deux nombres < 15, multiples communs ≤ 100). Un point par
modèle ; le nœud et le tag sont posés par la migration de rangement, après le `--publier` de
David. Catégorie `Entiers / Diviser / Multiples et diviseurs`, niveaux 4 à 8 (le 1 est un
modèle de 5e, les 2 et 3 sont pris par le lot 2 du CM1, « Est-ce un multiple ? » et « Est-ce un
diviseur ? » : titre distinct, `create-questions` reconnaît un modèle à son titre).

Décisions et pièges :
- « coche tous les… » : case « choix » à plusieurs réponses (`plusieurs: oui`) ; un bon choix
  oublié vaut la moitié des points (`unoptimal_form`, règle du moteur). La bonne
  réponse est calculée, choix par choix : `{{eval:i*indicatrice}}` rend l'indice i si le
  choix est bon, 0 sinon ; le 0 répété compte une fois. Le choix 0 doit donc toujours être
  bon : « 1 » dans les listes de diviseurs, un vrai multiple dans les listes mélangées ;
- indicatrice « k divise x » : `floor((k-mod(x,k))/k)` (1 si le reste est nul, 0 sinon) ;
- plusieurs cases « n'importe quel diviseur » prendraient trois fois la même réponse : pas de
  « trouve trois diviseurs » en cases libres ;
- tous les diviseurs (CM2-010) : une case par diviseur, ordre libre (`orderIndependent`, sur
  tout le modèle) ; le nombre de cases dit combien il y en a (décision de David) ;
- diviseurs communs : choix de 1 à 12 ; les deux nombres ont un pgcd ≤ 12, donc tous les
  diviseurs communs sont dans la liste.

    python3 docs/wip/questions/lot-cm2-2.py scripts/questions/cm2-2
"""

import json
import os
import subprocess
import sys

DOSSIER = sys.argv[1]
ECOLE = {'constraints': {'spacesFromFourDigits': True}}


def spec(desc, vi, variables, answers, status):
    return {'description': desc, 'variationIndex': vi,
            'variables': {k: str(v) for k, v in variables.items()},
            'answers': answers if isinstance(answers, list) else [answers],
            'expected': {'status': status}}


def modele(nom, title, description, level, variations, specs, options=None):
    # theme / domain / subdomain : anciennes colonnes, remplies pour create-questions ; le
    # rangement (nœud du point) est posé par la migration
    return nom, {'title': title, 'description': description, 'grades': ['CM2'],
                 'theme': 'Entiers', 'domain': 'Diviser',
                 'subdomain': 'Multiples et diviseurs', 'level': level, 'delay': 30,
                 'status': 'draft', 'options': options or ECOLE,
                 'variations': variations, 'testSpecs': specs}


def var(nom, expression):
    return {'name': nom, 'expression': expression}


def variation(statement, variables, answers, steps, conditions=None):
    v = {'statement': statement, 'variables': variables}
    if conditions:
        v['conditions'] = conditions
    v['blanks'] = [a if isinstance(a, dict) else {'expectedAnswer': a} for a in answers]
    v['correction'] = {'steps': steps}
    return v


def col(x, i=0):
    return '\\textcolor{{{color:primary.' + str(i) + '}}}{' + x + '}'


def choix(lignes, melanger=True):
    tete = 'plusieurs: oui\n' + ('' if melanger else 'melanger: non\n')
    return '\n\n```choix\n' + tete + ''.join('- ' + l + '\n' for l in lignes) + '```'


def divise(k, x):
    """1 si k divise x, 0 sinon (k et x : nombres ou noms de variables)."""
    return f'floor(({k}-mod({x},{k}))/{k})'


def coches(n, bon):
    """Bonne réponse d'une case choix à n choix : `bon(i)` = indicatrice du choix i ; le
    choix 0 est toujours bon."""
    return ';'.join(['0'] + ['{{eval:' + str(i) + '*' + bon(i) + '}}' for i in range(1, n)])


def liste_diviseurs(x, jusqu_a=30):
    """« 1 ; 2 ; 3 ; 6 » : les diviseurs de la variable x (x ≤ jusqu_a)."""
    texte = '$1$'
    for k in range(2, jusqu_a + 1):
        texte += '{{if:mod(' + x + ',' + str(k) + ')==0 && ' + str(k) + '<=' + x + '| ; $' \
                 + str(k) + '$|}}'
    return texte


def EGALITE(n, d, q, r=None):
    reste = '' if r is None else ' + {{' + r + '}}'
    return '${{' + n + '}} = {{' + d + '}} \\times {{' + q + '}}' + reste + '$'


MODELES = []


# --- 1. CM2-130 : est-ce un multiple ? -----------------------------------------------------

OUI_NON = choix(['Oui', 'Non'], melanger=False).replace('plusieurs: oui\n', '')


def multiple_oui_non(q_plage, conditions):
    return variation(
        '${{n}}$ est-il un multiple de ${{d}}$ ?' + OUI_NON,
        [var('ok', '0..1'), var('d', '3..9'), var('q', q_plage), var('r', '1..{{eval:d-1}}'),
         var('n', 'eval:d*q+(1-ok)*r')],
        ['{{eval:1-ok}}'],
        ['**Multiple.** ${{n}}$ est un multiple de ${{d}}$ s\'il est dans la table de ${{d}}$ :'
         ' la division de ${{n}}$ par ${{d}}$ tombe juste.',
         '{{if:ok==1|' + EGALITE('n', 'd', 'q') + ' : la division tombe juste.|'
         '${{eval:d*q}} = {{d}} \\times {{q}}$ et ${{eval:d*q+d}} = {{d}} \\times'
         ' {{eval:q+1}}$ : ${{n}}$ est entre les deux. ' + EGALITE('n', 'd', 'q', 'r')
         + ' : il reste ${{r}}$.}}',
         '{{if:ok==1|$' + col('\\text{Oui}') + '$, ${{n}}$ est un multiple de ${{d}}$.|$'
         + col('\\text{Non}') + '$, ${{n}}$ n\'est pas un multiple de ${{d}}$.}}'],
        conditions)


def dans_la_table(x, d):
    """Ligne de correction : x est-il dans la table de d ?"""
    return ('{{if:mod(' + x + ',' + d + ')==0|${{' + x + '}} = {{' + d + '}} \\times {{eval:'
            + x + '/' + d + '}}$ : oui.|${{' + x + '}} = {{' + d + '}} \\times {{eval:floor('
            + x + '/' + d + ')}} + {{eval:mod(' + x + ',' + d + ')}}$ : non.}}')


COCHER_MULTIPLES = variation(
    'Coche tous les multiples de ${{d}}$.'
    + choix(['${{a0}}$', '${{a1}}$', '${{b2}}$', '${{b3}}$', '${{x4}}$']),
    [var('d', '3..9'), var('q0', '2..10'), var('q1', '2..10'), var('q2', '2..9'),
     var('r2', '1..{{eval:d-1}}'), var('q3', '2..9'), var('r3', '1..{{eval:d-1}}'),
     var('x4', '11..99'), var('a0', 'eval:d*q0'), var('a1', 'eval:d*q1'),
     var('b2', 'eval:d*q2+r2'), var('b3', 'eval:d*q3+r3')],
    [coches(5, lambda i: '1' if i == 1 else ('0' if i < 4 else divise('d', 'x4')))],
    ['**Multiple de ${{d}}$** : un nombre de la table de ${{d}}$, la division par ${{d}}$'
     ' tombe juste.',
     EGALITE('a0', 'd', 'q0') + ' : oui.',
     EGALITE('a1', 'd', 'q1') + ' : oui.',
     EGALITE('b2', 'd', 'q2', 'r2') + ' : non.',
     EGALITE('b3', 'd', 'q3', 'r3') + ' : non.',
     dans_la_table('x4', 'd')],
    ['q0!=q1', 'b2!=b3', 'x4!=a0', 'x4!=a1', 'x4!=b2', 'x4!=b3', 'b2<=100', 'b3<=100'])

EX_OUI = {'ok': 1, 'd': 7, 'q': 8, 'r': 3, 'n': 56}
EX_NON = {'ok': 0, 'd': 7, 'q': 8, 'r': 1, 'n': 57}
EX_GRAND = {'ok': 1, 'd': 7, 'q': 36, 'r': 2, 'n': 252}
EX_GRAND_NON = {'ok': 0, 'd': 6, 'q': 42, 'r': 2, 'n': 254}
EX_COCHER = {'d': 7, 'q0': 8, 'q1': 3, 'q2': 6, 'r2': 1, 'q3': 9, 'r3': 4, 'x4': 35,
             'a0': 56, 'a1': 21, 'b2': 43, 'b3': 67}
MODELES.append(modele(
    '01-reconnaitre-les-multiples', 'Reconnaître les multiples d\'un nombre',
    'Dire si un entier est un multiple d\'un entier de 3 à 9 (56 est-il un multiple de 7 ?),'
    ' jusqu\'à 100 puis jusqu\'à 999 ; cocher les multiples dans une liste',
    4,
    [multiple_oui_non('2..10', ['n<=100']),
     multiple_oui_non('12..111', ['n>=100', 'n<=999']),
     COCHER_MULTIPLES],
    [spec('56 est un multiple de 7', 0, EX_OUI, '0', 'correct'),
     spec('Erreur : 56, non', 0, EX_OUI, '1', 'incorrect'),
     spec('57 n\'est pas un multiple de 7', 0, EX_NON, '1', 'correct'),
     spec('Erreur : 57, oui', 0, EX_NON, '0', 'incorrect'),
     spec('252 est un multiple de 7', 1, EX_GRAND, '0', 'correct'),
     spec('254 n\'est pas un multiple de 6', 1, EX_GRAND_NON, '1', 'correct'),
     spec('Erreur : 254, oui', 1, EX_GRAND_NON, '0', 'incorrect'),
     spec('Multiples de 7 : 56, 21, 35', 2, EX_COCHER, '0;1;4', 'correct'),
     spec('35 oublié : la moitié des points', 2, EX_COCHER, '0;1', 'unoptimal_form'),
     spec('Erreur : 43 coché (6 × 7 + 1)', 2, EX_COCHER, '0;1;2;4', 'incorrect')]))


# --- 2. CM2-009 : des diviseurs d'un nombre jusqu'à 100 ------------------------------------

def paires(n, jusqu_a):
    """« 72 = 1 × 72 ; 72 = 2 × 36 ; … » jusqu'à ce que les paires se croisent (k × k ≤ n)."""
    texte = '${{' + n + '}} = 1 \\times {{' + n + '}}$'
    for k in range(2, jusqu_a + 1):
        texte += '{{if:mod(' + n + ',' + str(k) + ')==0 && ' + str(k * k) + '<=' + n \
                 + '| ; ${{' + n + '}} = ' + str(k) \
                 + ' \\times {{eval:' + n + '/' + str(k) + '}}$|}}'
    return texte


def parmi(n, jusqu_a):
    """« 1 ; 2 ; 3 … » colorés : les diviseurs de n parmi 1 à jusqu_a."""
    texte = '$' + col('1') + '$'
    for k in range(2, jusqu_a + 1):
        texte += '{{if:mod(' + n + ',' + str(k) + ')==0| ; $' + col(str(k)) + '$|}}'
    return texte


COCHER_DIVISEURS = variation(
    'Coche tous les diviseurs de ${{N}}$.'
    + choix([f'${k}$' for k in range(1, 11)], melanger=False),
    [var('N', '24..100')],
    [coches(10, lambda i: divise(i + 1, 'N'))],
    ['**Diviseur.** Un nombre est un diviseur de ${{N}}$ si la division de ${{N}}$ par ce'
     ' nombre tombe juste : ${{N}}$ est dans sa table.',
     paires('N', 10) + '.',
     'Pour les autres nombres de la liste, la division ne tombe pas juste.',
     'Les diviseurs de ${{N}}$ de la liste : ' + parmi('N', 10) + '.'],
    [' + '.join(divise(k, 'N') for k in range(2, 11)) + '>=3'])

EQUIPES = variation(
    'Les ${{N}}$ élèves d\'une école forment des équipes qui ont toutes le même nombre'
    ' d\'élèves, sans qu\'il reste personne. Il y a au moins $2$ équipes et au moins $2$'
    ' élèves par équipe.\n\nPropose un nombre d\'équipes possible.\n\nIl peut y avoir $?$'
    ' équipes.',
    [var('a', '2..9'), var('b', '3..20'), var('N', 'eval:a*b')],
    [{'expectedAnswer': '{{a}}', 'rulesSuffice': True,
      'validationRules': [{'type': 'divisor', 'dividend': '{{N}}'},
                          {'type': 'range', 'min': '1', 'max': '{{N}}', 'inclusive': False},
                          {'type': 'predicate', 'predicate': 'isInteger'}]}],
    ['Les ${{N}}$ élèves se répartissent sans reste : le nombre d\'équipes est un diviseur de'
     ' ${{N}}$.',
     'Par exemple, ${{N}} = ' + col('{{a}}') + ' \\times {{b}}$ : $' + col('{{a}}')
     + '$ équipes de ${{b}}$ élèves.',
     'Tout diviseur de ${{N}}$ autre que $1$ et ${{N}}$ est juste.'],
    ['N>=24', 'N<=100'])

MODELES.append(modele(
    '02-des-diviseurs-d-un-nombre', 'Des diviseurs d\'un nombre',
    'Trouver des diviseurs d\'un entier de 24 à 100 : les cocher parmi 1 à 10, en proposer un'
    ' dans un problème de partage en équipes',
    5, [COCHER_DIVISEURS, EQUIPES],
    [spec('Diviseurs de 72 parmi 1 à 10 : 1, 2, 3, 4, 6, 8, 9', 0, {'N': 72},
          '0;1;2;3;5;7;8', 'correct'),
     spec('1 oublié : la moitié des points', 0, {'N': 72}, '1;2;3;5;7;8', 'unoptimal_form'),
     spec('Erreur : 7 coché', 0, {'N': 72}, '0;1;2;3;5;6;7;8', 'incorrect'),
     spec('9 oublié : la moitié des points', 0, {'N': 72}, '0;1;2;3;5;7', 'unoptimal_form'),
     spec('72 élèves : 8 équipes', 1, {'a': 8, 'b': 9, 'N': 72}, '8', 'correct'),
     spec('72 élèves : 6 équipes', 1, {'a': 8, 'b': 9, 'N': 72}, '6', 'correct'),
     spec('72 élèves : 36 équipes', 1, {'a': 8, 'b': 9, 'N': 72}, '36', 'correct'),
     spec('Erreur : 5 équipes', 1, {'a': 8, 'b': 9, 'N': 72}, '5', 'incorrect'),
     spec('Erreur : 72 équipes (une personne par équipe)', 1, {'a': 8, 'b': 9, 'N': 72}, '72',
          'incorrect'),
     spec('Erreur : 1 équipe', 1, {'a': 8, 'b': 9, 'N': 72}, '1', 'incorrect')]))


# --- 3. CM2-010 : tous les diviseurs d'un nombre jusqu'à 30 --------------------------------

def tous(combien, attendus, variables, paires_texte, conditions=None):
    cases = ' ; '.join(['$?$'] * combien)
    return variation(
        'Écris tous les diviseurs de ${{n}}$. Il y en a $' + str(combien) + '$.\n\n' + cases,
        variables, attendus,
        ['**Diviseurs par paires.** On cherche les produits égaux à ${{n}}$, en partant de'
         ' $1 \\times {{n}}$ et en essayant $2$, $3$, $4$… jusqu\'à ce que les paires se'
         ' croisent.',
         paires_texte,
         'Les ' + str(combien) + ' diviseurs de ${{n}}$ : $'
         + col(' \\ ; \\ '.join(attendus)) + '$.'],
        conditions)


QUATRE = tous(
    4, ['1', '{{p}}', '{{q}}', '{{n}}'],
    [var('p', '2|3'), var('q', '3|5|7|11|13'), var('n', 'eval:p*q')],
    '$${{n}} = 1 \\times {{n}} = {{p}} \\times {{q}}$$',
    ['q>p', 'n<=30'])

SIX = tous(
    6, ['1', '{{p}}', '{{eval:p*p}}', '{{q}}', '{{eval:p*q}}', '{{n}}'],
    [var('p', '2|3'), var('q', '2|3|5|7'), var('n', 'eval:p*p*q')],
    '{{if:p==2|$${{n}} = 1 \\times {{n}} = 2 \\times {{eval:2*q}} = {{eval:min(4,q)}} \\times'
    ' {{eval:max(4,q)}}$$|$$18 = 1 \\times 18 = 2 \\times 9 = 3 \\times 6$$}}',
    ['q!=p', 'n<=30'])

HUIT = tous(
    8, ['1', '2', '3', '{{eval:4+t}}', '6', '{{eval:8+2*t}}', '{{eval:12+3*t}}', '{{n}}'],
    [var('t', '0..1'), var('n', 'eval:24+6*t')],
    '$${{n}} = 1 \\times {{n}} = 2 \\times {{eval:12+3*t}} = 3 \\times {{eval:8+2*t}} ='
    ' {{eval:4+t}} \\times 6$$')

MODELES.append(modele(
    '03-tous-les-diviseurs', 'Tous les diviseurs d\'un nombre',
    'Écrire tous les diviseurs d\'un entier jusqu\'à 30 (4, 6 ou 8 diviseurs, leur nombre est'
    ' donné), dans n\'importe quel ordre',
    6, [QUATRE, SIX, HUIT],
    [spec('Diviseurs de 14', 0, {'p': 2, 'q': 7, 'n': 14}, ['1', '2', '7', '14'], 'correct'),
     spec('Diviseurs de 14, dans le désordre', 0, {'p': 2, 'q': 7, 'n': 14},
          ['14', '7', '2', '1'], 'correct'),
     spec('Erreur : 1 oublié, 28 ajouté', 0, {'p': 2, 'q': 7, 'n': 14},
          ['2', '7', '14', '28'], 'incorrect'),
     spec('Erreur : 7 deux fois', 0, {'p': 2, 'q': 7, 'n': 14}, ['1', '2', '7', '7'],
          'incorrect'),
     spec('Diviseurs de 28', 1, {'p': 2, 'q': 7, 'n': 28},
          ['1', '2', '4', '7', '14', '28'], 'correct'),
     spec('Diviseurs de 18, dans le désordre', 1, {'p': 3, 'q': 2, 'n': 18},
          ['18', '1', '9', '2', '6', '3'], 'correct'),
     spec('Erreur : 3 au lieu de 4 (28)', 1, {'p': 2, 'q': 7, 'n': 28},
          ['1', '2', '3', '7', '14', '28'], 'incorrect'),
     spec('Erreur : 14 deux fois (28)', 1, {'p': 2, 'q': 7, 'n': 28},
          ['1', '2', '4', '7', '14', '14'], 'incorrect'),
     spec('Diviseurs de 24', 2, {'t': 0, 'n': 24},
          ['1', '2', '3', '4', '6', '8', '12', '24'], 'correct'),
     spec('Diviseurs de 30', 2, {'t': 1, 'n': 30},
          ['30', '15', '10', '6', '5', '3', '2', '1'], 'correct'),
     spec('Erreur : 4 parmi les diviseurs de 30', 2, {'t': 1, 'n': 30},
          ['1', '2', '3', '4', '6', '10', '15', '30'], 'incorrect')],
    options={**ECOLE, 'orderIndependent': True}))


# --- 4. CM2-011 : diviseurs communs ---------------------------------------------------------

def communs_parmi(jusqu_a):
    texte = '$' + col('1') + '$'
    for k in range(2, jusqu_a + 1):
        texte += '{{if:mod(a,' + str(k) + ')==0 && mod(b,' + str(k) + ')==0| ; $' \
                 + col(str(k)) + '$|}}'
    return texte


def communs(variables, conditions):
    return variation(
        'Coche tous les diviseurs communs à ${{a}}$ et ${{b}}$.'
        + choix([f'${k}$' for k in range(1, 13)], melanger=False),
        variables,
        [coches(12, lambda i: divise(i + 1, 'a') + '*' + divise(i + 1, 'b'))],
        ['**Diviseurs communs** : les nombres qui divisent ${{a}}$ **et** ${{b}}$.',
         'Diviseurs de ${{a}}$ : ' + liste_diviseurs('a') + '.',
         'Diviseurs de ${{b}}$ : ' + liste_diviseurs('b') + '.',
         'Ceux qui sont dans les deux listes : ' + communs_parmi(12) + '.'],
        conditions)


COMMUNS_MULTIPLE = communs(
    [var('a', '3..12'), var('k', '2..10'), var('b', 'eval:a*k')], ['b<=30'])
COMMUNS_AUTRES = communs(
    # a = g × u, b = g × v, u et v premiers entre eux : g est le plus grand diviseur commun
    [var('g', '4..10'), var('u', '2..6'), var('v', '3..7'), var('a', 'eval:g*u'),
     var('b', 'eval:g*v')],
    ['u<v', 'gcd(u,v)==1', 'b<=30'])

EX_12_18 = {'g': 6, 'u': 2, 'v': 3, 'a': 12, 'b': 18}
MODELES.append(modele(
    '04-diviseurs-communs', 'Diviseurs communs à deux nombres',
    'Cocher, parmi 1 à 12, tous les diviseurs communs à deux entiers jusqu\'à 30 (6 et 18 ;'
    ' 12 et 18)',
    7, [COMMUNS_MULTIPLE, COMMUNS_AUTRES],
    [spec('6 et 18 : 1, 2, 3, 6', 0, {'a': 6, 'k': 3, 'b': 18}, '0;1;2;5', 'correct'),
     spec('6 oublié : la moitié des points', 0, {'a': 6, 'k': 3, 'b': 18}, '0;1;2',
          'unoptimal_form'),
     spec('Erreur : 9 coché (diviseur de 18 seulement)', 0, {'a': 6, 'k': 3, 'b': 18},
          '0;1;2;5;8', 'incorrect'),
     spec('12 et 18 : 1, 2, 3, 6', 1, {'g': 6, 'u': 2, 'v': 3, 'a': 12, 'b': 18}, '0;1;2;5', 'correct'),
     spec('Erreur : 4 coché (diviseur de 12 seulement)', 1, EX_12_18,
          '0;1;2;3;5', 'incorrect'),
     spec('1 oublié : la moitié des points', 1, EX_12_18, '1;2;5', 'unoptimal_form'),
     spec('20 et 30 : 1, 2, 5, 10', 1, {'g': 10, 'u': 2, 'v': 3, 'a': 20, 'b': 30}, '0;1;4;9', 'correct')]))


# --- 5. CM2-012 : multiples communs ---------------------------------------------------------

def table_jusqu_a(x, borne):
    """« 8 ; 16 ; 24 » : la table de x jusqu'à la variable borne (au plus 14 termes)."""
    texte = '${{' + x + '}}$'
    for k in range(2, 15):
        terme = '{{eval:' + str(k) + '*' + x + '}}'
        texte += '{{if:' + str(k) + '*' + x + '<=' + borne + '| ; $' + terme + '$|}}'
    return texte


# a = g × u, b = g × v, u et v premiers entre eux (u ≥ 2 : a ne divise pas b ; g ≥ 2 : le
# produit a × b n'est pas le plus petit multiple commun)
VARS_AB = [var('g', '2..4'), var('u', '2..6'), var('v', '3..7'), var('a', 'eval:g*u'),
           var('b', 'eval:g*v'), var('m', 'eval:g*u*v')]
COND_AB = ['u<v', 'gcd(u,v)==1', 'b<=14', 'm<100']

PLUS_PETIT = variation(
    'Quel est le plus petit multiple commun à ${{a}}$ et ${{b}}$, autre que $0$ ?\n\n$$?$$',
    VARS_AB, ['{{m}}'],
    ['**Multiple commun** : un nombre qui est dans la table de ${{a}}$ **et** dans celle de'
     ' ${{b}}$.',
     'Table de ${{b}}$ : ' + table_jusqu_a('b', 'm') + '…',
     'On cherche chacun dans la table de ${{a}}$ : le premier qui y est, c\'est $' + col('{{m}}')
     + ' = {{a}} \\times {{eval:m/a}} = {{b}} \\times {{eval:m/b}}$.',
     '${{a}} \\times {{b}} = {{eval:a*b}}$ est aussi un multiple commun, mais pas le plus'
     ' petit.'],
    COND_AB)

UN_MULTIPLE = variation(
    'Trouve un multiple commun à ${{a}}$ et ${{b}}$, autre que $0$ et plus petit que $100$.'
    '\n\n$$?$$',
    VARS_AB,
    [{'expectedAnswer': '{{m}}', 'rulesSuffice': True,
      'validationRules': [{'type': 'multiple', 'base': '{{a}}'},
                          {'type': 'multiple', 'base': '{{b}}'},
                          {'type': 'range', 'min': '0', 'max': '100', 'inclusive': False},
                          {'type': 'predicate', 'predicate': 'isInteger'}]}],
    ['**Multiple commun** : un nombre qui est dans la table de ${{a}}$ **et** dans celle de'
     ' ${{b}}$.',
     'Table de ${{b}}$ : ' + table_jusqu_a('b', 'm') + '…',
     '$' + col('{{m}}') + ' = {{a}} \\times {{eval:m/a}} = {{b}} \\times {{eval:m/b}}$ est'
     ' dans les deux tables.',
     '{{if:2*m<100|${{eval:2*m}}${{if:3*m<100|, ${{eval:3*m}}$|}}{{if:4*m<100|, ${{eval:4*m}}$|}}'
     ' conviennent aussi.|Le multiple commun suivant, ${{eval:2*m}}$, dépasse $100$.}}'],
    COND_AB)


def deux_tables(x):
    return ('${{' + x + '}}$ : {{if:mod(' + x + ',a)==0|dans la table de ${{a}}$|pas dans la'
            ' table de ${{a}}$}}, {{if:mod(' + x + ',b)==0|dans celle de ${{b}}$|pas dans celle'
            ' de ${{b}}$}}.')


COCHER_COMMUNS = variation(
    'Coche tous les multiples communs à ${{a}}$ et ${{b}}$.'
    + choix(['${{m}}$', '${{c1}}$', '${{c2}}$', '${{x3}}$', '${{x4}}$']),
    VARS_AB + [var('s', '2..{{eval:floor(100/a)}}'), var('t', '2..{{eval:floor(100/b)}}'), var('c1', 'eval:a*s'),
               var('c2', 'eval:b*t'), var('x3', 'eval:2*m'), var('x4', '10..99')],
    [coches(5, lambda i: '0' if i < 3 else divise('m', 'x' + str(i)))],
    ['**Multiple commun** : un nombre qui est dans la table de ${{a}}$ **et** dans celle de'
     ' ${{b}}$.'] + [deux_tables(x) for x in ['m', 'c1', 'c2', 'x3', 'x4']],
    # Deux bons choix au moins : m et 2m ; x4 au hasard
    COND_AB + ['2*m<100', 'mod(c1,b)!=0', 'mod(c2,a)!=0', 'c1!=c2', 'x3!=x4']
    + [f'{x}!={y}' for x in ['x3', 'x4'] for y in ['m', 'c1', 'c2']])

EX_68 = {'g': 2, 'u': 3, 'v': 4, 'a': 6, 'b': 8, 'm': 24}
EX_COCHER_68 = {**EX_68, 's': 3, 't': 2, 'c1': 18, 'c2': 16, 'x3': 48, 'x4': 50}
MODELES.append(modele(
    '05-multiples-communs', 'Multiples communs à deux nombres',
    'Multiples communs à deux entiers inférieurs à 15 (6 et 8) : le plus petit, un multiple'
    ' commun inférieur à 100, les cocher dans une liste',
    8, [PLUS_PETIT, UN_MULTIPLE, COCHER_COMMUNS],
    [spec('6 et 8 : 24', 0, EX_68, '24', 'correct'),
     spec('Erreur : le produit 48', 0, EX_68, '48', 'incorrect'),
     spec('Erreur : 8', 0, EX_68, '8', 'incorrect'),
     spec('Erreur : 0', 0, EX_68, '0', 'incorrect'),
     spec('6 et 8 : 24', 1, EX_68, '24', 'correct'),
     spec('6 et 8 : 72', 1, EX_68, '72', 'correct'),
     spec('6 et 8 : 96', 1, EX_68, '96', 'correct'),
     spec('Erreur : 0', 1, EX_68, '0', 'incorrect'),
     spec('Erreur : 30 (table de 6 seulement)', 1, EX_68, '30', 'incorrect'),
     spec('Erreur : 120 (plus grand que 100)', 1, EX_68, '120', 'incorrect'),
     spec('Multiples communs : 24 et 48', 2, EX_COCHER_68, '0;3', 'correct'),
     spec('48 oublié : la moitié des points', 2, EX_COCHER_68, '0', 'unoptimal_form'),
     spec('Erreur : 18 coché (table de 6 seulement)', 2, EX_COCHER_68, '0;1;3',
          'incorrect')]))


os.makedirs(DOSSIER, exist_ok=True)
for nom, m in MODELES:
    with open(os.path.join(DOSSIER, nom + '.json'), 'w', encoding='utf-8') as f:
        json.dump(m, f, ensure_ascii=False, indent='\t')
        f.write('\n')
# Mis en forme comme le pre-commit, pour que le script redonne les fichiers commités
subprocess.run(['pnpm', 'exec', 'prettier', '--write', DOSSIER], check=True,
               stdout=subprocess.DEVNULL)
print(f'{len(MODELES)} modèles écrits dans {DOSSIER}')
