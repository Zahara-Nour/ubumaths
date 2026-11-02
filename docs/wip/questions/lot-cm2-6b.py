"""Écrit les 6 modèles du lot 6b du CM2 (nombres décimaux) dans scripts/questions/cm2-6b/.

Phase 0 du 2026-11-01 (§ 11 du journal `docs/wip/questions-cm2-progress.md`), recommandations
suivies par David (§ 11.1) : 6b = décimaux (031, 033, 145, 034, 146, 147) ; ranger (#12) garde une
fraction décimale parmi les cinq nombres, comme l'exemple du BO ; intercaler (#13) accepte aussi
l'écriture fractionnaire (règle `range`, sans forme exigée).
Bornes : `cycle3.json`, CM2 (au plus trois décimales ; partie entière jusqu'à 999 ; ranger
jusqu'à cinq nombres, 12,082 ; 12 324/1 000 ; 14 ; 12,09 ; 12,6 ; intercaler 1,99 < … < 2).
Un point par modèle ; le nœud et le tag sont posés par la migration de rangement, après le
`--publier`.

Jumeau du lot 4 du CM1 (`lot-cm1-4.py`, dixièmes et centièmes) : les millièmes en plus.

Décisions et pièges :
- écriture à virgule exigée pour « écrire en chiffres » (motif `a:number`) ;
- nombres en lettres : orthographe rectifiée, comme `lot-cm2-6a.py` ; parties entières sans 21,
  31… (accord au féminin évité) ; jamais de millièmes multiples de 10 ;
- nombres construits en millièmes entiers (`xm`), puis `xm/1000` : pas de 3,4990000001 ;
- choix en case « choix » (bloc ```choix, ADR 0033), le juste écrit en premier ;
- niveaux : suite des niveaux de chaque catégorie (Décimaux / Apprivoiser), relevés en prod le
  2026-11-02 : Ecriture 12, Arrondir 5, Comparer 5, Encadrer 6.

    python3 docs/wip/questions/lot-cm2-6b.py scripts/questions/cm2-6b
"""

import json
import os
import subprocess
import sys

DOSSIER = sys.argv[1]
OPTIONS = {'constraints': {'spacesFromFourDigits': True}}
VIRGULE_EXIGEE = {'pattern': 'a:number'}


def spec(desc, vi, variables, answers, status, violations=None):
    s = {'description': desc, 'variationIndex': vi,
         'variables': {k: str(v) for k, v in variables.items()},
         'answers': answers if isinstance(answers, list) else [answers],
         'expected': {'status': status}}
    if violations:
        s['expected']['constraintViolations'] = violations
    return s


def modele(nom, title, description, subdomain, level, variations, specs, delay=30,
           options=OPTIONS):
    # theme / domain / subdomain : anciennes colonnes, remplies pour create-questions ; le
    # rangement (nœud du point) est posé par la migration
    return nom, {'title': title, 'description': description, 'grades': ['CM2'],
                 'theme': 'Décimaux', 'domain': 'Apprivoiser', 'subdomain': subdomain,
                 'level': level, 'delay': delay, 'status': 'draft', 'options': options,
                 'variations': variations, 'testSpecs': specs}


def var(nom, expression):
    return {'name': nom, 'expression': expression}


def variation(statement, variables, answers, steps, conditions=None):
    # Chaque `?` de l'énoncé est une case, dans l'ordre de `answers` ; `answers=None` : la case
    # vient d'un bloc (```ranger), sans `blanks[]`
    v = {'statement': statement, 'variables': variables}
    if conditions:
        v['conditions'] = conditions
    if answers is not None:
        v['blanks'] = [a if isinstance(a, dict) else {'expectedAnswer': a} for a in answers]
    v['correction'] = {'steps': steps}
    return v


def par(nom, valeurs, f):
    """f(valeur) selon la valeur tirée de `nom` : {{if:nom==v1|…|{{if:nom==v2|…|…}}}}."""
    valeurs = list(valeurs)
    texte = f(valeurs[-1])
    for x in reversed(valeurs[:-1]):
        texte = '{{if:' + nom + '==' + str(x) + '|' + f(x) + '|' + texte + '}}'
    return texte


def col(x, i=0):
    return '\\textcolor{{{color:primary.' + str(i) + '}}}{' + x + '}'


def choix(lignes, melanger=True):
    tete = '' if melanger else 'melanger: non\n'
    return '\n\n```choix\n' + tete + ''.join('- ' + l + '\n' for l in lignes) + '```'


def frac(n, d):
    return '\\frac{' + n + '}{' + d + '}'


def trois_decimales(m):
    """Le nombre de millièmes `m` écrit avec trois chiffres après la virgule : 4.710."""
    return ('{{eval:floor(' + m + '/1000)}}.{{eval:floor(mod(' + m + ',1000)/100)}}'
            '{{eval:floor(mod(' + m + ',100)/10)}}{{eval:mod(' + m + ',10)}}')


MODELES = []

# --- Nombres en lettres (orthographe rectifiée, comme `lot-cm2-6a.py`) ----------------------

UNITES = ['', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf', 'dix',
          'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize']
DIZAINES = ['', 'dix', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante']


def deux_chiffres(n):
    if n <= 16:
        return UNITES[n]
    if n < 20:
        return 'dix-' + UNITES[n - 10]
    if n >= 80:
        return 'quatre-vingts' if n == 80 else 'quatre-vingt-' + deux_chiffres(n - 80)
    if n >= 70:
        return 'soixante-' + ('et-onze' if n == 71 else deux_chiffres(n - 60))
    d, u = divmod(n, 10)
    if u == 0:
        return DIZAINES[d]
    return DIZAINES[d] + ('-et-un' if u == 1 else '-' + UNITES[u])


def lettres(n):
    """n (1 à 999) en lettres : deux-cent-trente-sept, trois-cent-huit, quatre-cents."""
    c, r = divmod(n, 100)
    mots = []
    if c:
        cent = 'cent' if c == 1 else UNITES[c] + '-cent'
        mots.append(cent + ('s' if c > 1 and r == 0 else ''))
    if r:
        mots.append(deux_chiffres(r))
    return '-'.join(mots)


def nombre_de(n, nom):
    """« une unité », « trois unités », « un dixième », « cent-sept millièmes »."""
    if n == 1:
        return ('une ' if nom == 'unité' else 'un ') + nom
    return lettres(n) + ' ' + nom + 's'


assert lettres(107) == 'cent-sept'
assert lettres(240) == 'deux-cent-quarante'
assert lettres(71) == 'soixante-et-onze'

SENS = ('**Les rangs après la virgule.** Le premier chiffre après la virgule compte les'
        ' **dixièmes**, le deuxième les **centièmes**, le troisième les **millièmes** :'
        ' $1 = 10$ dixièmes $= 100$ centièmes $= 1\\,000$ millièmes.')


# --- 8. CM2-031 : lire et écrire un nombre décimal ----------------------------------------
# `c` code la partie décimale : c = 10 000 × p + n, n parts de 1/10^p (n < 10^p, jamais un
# multiple de 10). Pièges : 4,007 / 4,7 ; 4,107 / 4,17 ; rang vide (3 unités, 2 dixièmes et
# 5 millièmes = 3,205).

ENTIERS = [1, 2, 3, 4, 7, 8, 12, 15, 23, 36, 48, 57, 64, 75, 90, 105, 240, 307]
DIXIEMES = [3, 7, 9]
CENTIEMES = [5, 8, 23, 47, 81]
MILLIEMES = [7, 23, 65, 107, 205, 451, 607, 999]
CODES = ([10000 + n for n in DIXIEMES] + [20000 + n for n in CENTIEMES]
         + [30000 + n for n in MILLIEMES])
NOM_PART = {1: 'dixième', 2: 'centième', 3: 'millième'}


def partie_decimale(c):
    p, n = divmod(c, 10000)
    return nombre_de(n, NOM_PART[p])


ECRIRE_VARS = [var('a', '|'.join(map(str, ENTIERS))), var('c', '|'.join(map(str, CODES))),
               var('p', '{{if:c>30000|3|{{if:c>20000|2|1}}}}'), var('d', 'eval:10^p'),
               var('n', 'eval:mod(c,10000)'), var('x', 'eval:a+n/d;d')]
# n écrit sur p chiffres : 7 millièmes → 007
N_SUR_P = ('{{if:p==3|{{if:n<10|00|{{if:n<100|0|}}}}|{{if:p==2|{{if:n<10|0|}}|}}}}{{n}}')

ECRIRE = variation(
    'Écris en chiffres le nombre « **' + par('a', ENTIERS, lambda a: nombre_de(a, 'unité'))
    + ' et ' + par('c', CODES, partie_decimale) + '** ».\n\n$$?$$',
    ECRIRE_VARS,
    [{'expectedAnswer': '{{x}}', 'requiredForm': VIRGULE_EXIGEE}],
    [SENS,
     '« ' + par('c', CODES, partie_decimale) + ' » : des '
     + '{{if:p==1|dixièmes|{{if:p==2|centièmes|millièmes}}}}, donc ${{p}}$ chiffre{{if:p>1|s|}}'
     ' après la virgule : on écrit $' + N_SUR_P + '$.',
     '$$' + col('{{x}}') + '$$'])

# Un rang vide parmi les dixièmes et les centièmes : l'élève doit écrire le 0
ECRIRE_RANGS = variation(
    'Écris en chiffres le nombre « **' + par('a', ENTIERS, lambda a: nombre_de(a, 'unité'))
    + ', {{if:t==0|' + par('u', range(1, 10), lambda u: nombre_de(u, 'centième')) + '|'
    + par('t', range(1, 10), lambda t: nombre_de(t, 'dixième')) + '}} et '
    + par('v', range(1, 10), lambda v: nombre_de(v, 'millième')) + '** ».\n\n$$?$$',
    [var('a', '|'.join(map(str, ENTIERS))), var('t', '0..9'), var('u', '0..9'),
     var('v', '1..9'), var('x', 'eval:(1000*a+100*t+10*u+v)/1000;d')],
    [{'expectedAnswer': '{{x}}', 'requiredForm': VIRGULE_EXIGEE}],
    [SENS,
     'Les unités avant la virgule, puis ${{t}}$ au rang des dixièmes, ${{u}}$ au rang des'
     ' centièmes, ${{v}}$ au rang des millièmes : le rang vide reçoit un $0$.',
     '$$' + col('{{x}}') + '$$'],
    ['t*u==0', 't+u>0'])

LIRE_MILLIEMES = [7, 23, 65, 107, 205, 451, 607, 999]
BIEN_LU = (par('a', range(1, 10), lambda a: nombre_de(a, 'unité')) + ' et '
           + par('n', LIRE_MILLIEMES, lambda n: nombre_de(n, 'millième')))
LIRE = variation(
    'Comment lit-on le nombre ${{x}}$ ?'
    + choix([BIEN_LU,
             par('a', range(1, 10), lambda a: nombre_de(a, 'unité')) + ' et '
             + par('n', LIRE_MILLIEMES, lambda n: nombre_de(n, 'centième')),
             # « quatre-mille-cent-sept » : la virgule oubliée
             par('a', range(1, 10), lambda a: 'mille' if a == 1 else UNITES[a] + '-mille')
             + '-' + par('n', LIRE_MILLIEMES, lettres),
             par('n', LIRE_MILLIEMES, lambda n: nombre_de(n, 'unité')) + ' et '
             + par('a', range(1, 10), lambda a: nombre_de(a, 'millième'))]),
    [var('a', '1..9'), var('n', '|'.join(map(str, LIRE_MILLIEMES))),
     var('x', 'eval:(1000*a+n)/1000;d')],
    ['0'],
    [SENS,
     '${{x}}$ : ${{a}}$ avant la virgule, $' + '{{if:n<10|00|{{if:n<100|0|}}}}{{n}}'
     + '$ après, sur trois rangs : des millièmes. On lit **« ' + BIEN_LU + ' »**.'],
    ['a!=n'])

EX_4107 = {'a': 4, 'c': 30107, 'p': 3, 'd': 1000, 'n': 107, 'x': '4.107'}
EX_4007 = {'a': 4, 'c': 30007, 'p': 3, 'd': 1000, 'n': 7, 'x': '4.007'}
EX_1523 = {'a': 15, 'c': 20023, 'p': 2, 'd': 100, 'n': 23, 'x': '15.23'}
EX_3205 = {'a': 3, 't': 2, 'u': 0, 'v': 5, 'x': '3.205'}
EX_3045 = {'a': 3, 't': 0, 'u': 4, 'v': 5, 'x': '3.045'}
EX_LIRE = {'a': 4, 'n': 107, 'x': '4.107'}
MODELES.append(modele(
    '01-lire-et-ecrire-un-nombre-decimal', 'Lire et écrire un nombre décimal',
    'Quatre unités et cent-sept millièmes ↔ 4,107 : écrire avec une virgule un nombre donné en'
    ' lettres (un rang parfois vide : 3,205), le lire parmi quatre écritures ; au plus trois'
    ' décimales',
    'Ecriture', 13, [ECRIRE, ECRIRE_RANGS, LIRE],
    [spec('quatre unités et cent-sept millièmes : 4,107', 0, EX_4107, '4,107', 'correct'),
     spec('Erreur : 4,17 (zéro oublié)', 0, EX_4107, '4,17', 'incorrect'),
     spec('Erreur : 4,1007', 0, EX_4107, '4,1007', 'incorrect'),
     spec('Forme : 4107/1000 (fraction)', 0, EX_4107, '\\frac{4\\,107}{1\\,000}', 'bad_form',
          ['form']),
     spec('Forme : 4 + 107/1000', 0, EX_4107, '4+\\frac{107}{1\\,000}', 'bad_form', ['form']),
     spec('quatre unités et sept millièmes : 4,007', 0, EX_4007, '4,007', 'correct'),
     spec('Erreur : 4,7', 0, EX_4007, '4,7', 'incorrect'),
     spec('Erreur : 4,07', 0, EX_4007, '4,07', 'incorrect'),
     spec('quinze unités et vingt-trois centièmes : 15,23', 0, EX_1523, '15,23', 'correct'),
     spec('Erreur : 15,023 (millièmes lus)', 0, EX_1523, '15,023', 'incorrect'),
     spec('3 unités, 2 dixièmes et 5 millièmes : 3,205', 1, EX_3205, '3,205', 'correct'),
     spec('Erreur : 3,25 (rang vide oublié)', 1, EX_3205, '3,25', 'incorrect'),
     spec('3 unités, 4 centièmes et 5 millièmes : 3,045', 1, EX_3045, '3,045', 'correct'),
     spec('Erreur : 3,45', 1, EX_3045, '3,45', 'incorrect'),
     spec('4,107 : quatre unités et cent-sept millièmes', 2, EX_LIRE, '0', 'correct'),
     spec('Erreur : cent-sept centièmes', 2, EX_LIRE, '1', 'incorrect'),
     spec('Erreur : quatre-mille-cent-sept', 2, EX_LIRE, '2', 'incorrect'),
     spec('Erreur : unités et millièmes échangés', 2, EX_LIRE, '3', 'incorrect')]))


# --- 9. CM2-033 : partie entière -----------------------------------------------------------
# Une à trois décimales (k), dernier chiffre jamais 0.

ENTIERE = ('**La partie entière**, c\'est le nombre d\'unités entières : ce qui est écrit avant'
           ' la virgule.')


def partie_entiere(a):
    return variation(
        'Quelle est la partie entière de ${{x}}$ ?\n\n$$?$$',
        [var('a', a), var('k', '1..3'), var('D', '1..{{eval:10^k-1}}'),
         var('x', 'eval:(10^k*a+D)/10^k;d')], ['{{a}}'],
        [ENTIERE, '${{x}} = ' + col('{{a}}') + ' + {{eval:D/10^k;d}}$'],
        ['mod(D,10)!=0'])


EX_37 = {'a': 3, 'k': 1, 'D': 7, 'x': '3.7'}
EX_0045 = {'a': 0, 'k': 3, 'D': 45, 'x': '0.045'}
EX_10578 = {'a': 105, 'k': 2, 'D': 78, 'x': '105.78'}
EX_999 = {'a': 999, 'k': 3, 'D': 999, 'x': '999.999'}
MODELES.append(modele(
    '02-partie-entiere-d-un-decimal', 'Donner la partie entière d\'un nombre décimal',
    'Donner la partie entière d\'un nombre décimal à une, deux ou trois décimales (3,7 → 3 ;'
    ' 105,78 → 105 ; 0,045 → 0)',
    'Arrondir', 6, [partie_entiere('0..99'), partie_entiere('100..999')],
    [spec('3,7 → 3', 0, EX_37, '3', 'correct'),
     spec('Erreur : 4 (arrondi)', 0, EX_37, '4', 'incorrect'),
     spec('Erreur : 7 (chiffre des dixièmes)', 0, EX_37, '7', 'incorrect'),
     spec('0,045 → 0', 0, EX_0045, '0', 'correct'),
     spec('Erreur : 45', 0, EX_0045, '45', 'incorrect'),
     spec('105,78 → 105', 1, EX_10578, '105', 'correct'),
     spec('Erreur : 106 (arrondi)', 1, EX_10578, '106', 'incorrect'),
     spec('Erreur : 78', 1, EX_10578, '78', 'incorrect'),
     spec('999,999 → 999', 1, EX_999, '999', 'correct'),
     spec('Erreur : 1000 (arrondi)', 1, EX_999, '1\\,000', 'incorrect')]))


# --- 10. CM2-145 : arrondir à l'unité -------------------------------------------------------
# V1 cas francs : chiffre des dixièmes ni 4 ni 5, partie entière qui ne finit pas par 9.
# V2 cas pièges (g) : 0 → a,5 (on monte) ; 1 → a,49 ou a,499 (on garde) ; 2 → 9,7 → 10.

REGLE = ('**Arrondir à l\'unité**, c\'est donner l\'entier le plus proche. On regarde le chiffre'
         ' des dixièmes : $5$ ou plus, on prend l\'entier du dessus ; moins de $5$, on garde la'
         ' partie entière.')

FRANC = variation(
    'Donne l\'arrondi à l\'unité de ${{x}}$.\n\n$${{x}} \\approx ?$$',
    [var('a', '0..98'), var('k', '1..3'), var('D', '1..{{eval:10^k-1}}'),
     var('x', 'eval:(10^k*a+D)/10^k;d'), var('h', 'eval:floor(D/10^(k-1))'),
     var('v', 'eval:a+floor(h/5)')], ['{{v}}'],
    [REGLE,
     'Le chiffre des dixièmes est $' + col('{{h}}', 1) + '${{if:k>1| (les chiffres suivants ne'
     ' comptent pas)|}} : {{if:h>=5|$5$ ou plus, on prend l\'entier du dessus|moins de $5$, on'
     ' garde la partie entière}}.',
     '$${{x}} \\approx ' + col('{{v}}') + '$$'],
    ['mod(D,10)!=0', 'h!=4', 'h!=5', 'mod(a,10)!=9'])

PIEGE = variation(
    'Donne l\'arrondi à l\'unité de ${{x}}$.\n\n$${{x}} \\approx ?$$',
    [var('g', '0..2'), var('b', '1..98'), var('j', '0..1'), var('t', '6..9'),
     var('a', 'eval:{{if:g==2|10*floor(b/10)+9|b}}'),
     var('xm', 'eval:{{if:g==0|1000*a+500|{{if:g==1|1000*a+490+9*j|1000*a+100*t}}}}'),
     var('x', 'eval:xm/1000;d'), var('h', 'eval:floor(mod(xm,1000)/100)'),
     var('v', 'eval:{{if:g==1|a|a+1}}')], ['{{v}}'],
    [REGLE,
     'Le chiffre des dixièmes est $' + col('{{h}}', 1) + '$ : '
     '{{if:g==0|c\'est $5$, on prend l\'entier du dessus.'
     '|{{if:g==1|moins de $5$, on garde la partie entière ; les $9$ qui suivent ne comptent'
     ' pas, ${{x}}$ est plus près de ${{a}}$ que de ${{eval:a+1}}$.'
     '|$5$ ou plus, on prend l\'entier du dessus : après ${{a}}$ vient ${{eval:a+1}}$.}}}}',
     '$${{x}} \\approx ' + col('{{v}}') + '$$'])

EX_F37 = {'a': 3, 'k': 1, 'D': 7, 'x': '3.7', 'h': 7, 'v': 4}
EX_F32 = {'a': 3, 'k': 1, 'D': 2, 'x': '3.2', 'h': 2, 'v': 3}
EX_F5781 = {'a': 5, 'k': 3, 'D': 781, 'x': '5.781', 'h': 7, 'v': 6}
EX_35 = {'g': 0, 'b': 3, 'j': 0, 't': 6, 'a': 3, 'xm': 3500, 'x': '3.5', 'h': 5, 'v': 4}
EX_349 = {'g': 1, 'b': 3, 'j': 0, 't': 6, 'a': 3, 'xm': 3490, 'x': '3.49', 'h': 4, 'v': 3}
EX_3499 = {'g': 1, 'b': 3, 'j': 1, 't': 6, 'a': 3, 'xm': 3499, 'x': '3.499', 'h': 4, 'v': 3}
EX_97 = {'g': 2, 'b': 5, 'j': 0, 't': 7, 'a': 9, 'xm': 9700, 'x': '9.7', 'h': 7, 'v': 10}
EX_996 = {'g': 2, 'b': 95, 'j': 0, 't': 6, 'a': 99, 'xm': 99600, 'x': '99.6', 'h': 6,
          'v': 100}
MODELES.append(modele(
    '03-arrondir-un-decimal-a-l-unite', 'Arrondir un nombre décimal à l\'unité',
    'Donner l\'arrondi à l\'unité d\'un nombre décimal à une, deux ou trois décimales : cas'
    ' francs (3,7 → 4 ; 5,781 → 6), puis cas pièges (3,5 → 4 ; 3,49 → 3 ; 9,7 → 10)',
    'Arrondir', 7, [FRANC, PIEGE],
    [spec('3,7 → 4', 0, EX_F37, '4', 'correct'),
     spec('Erreur : 3 (partie entière)', 0, EX_F37, '3', 'incorrect'),
     spec('3,2 → 3', 0, EX_F32, '3', 'correct'),
     spec('5,781 → 6', 0, EX_F5781, '6', 'correct'),
     spec('Erreur : 5,8 (arrondi au dixième)', 0, EX_F5781, '5,8', 'incorrect'),
     spec('3,5 → 4', 1, EX_35, '4', 'correct'),
     spec('Erreur : 3 pour 3,5', 1, EX_35, '3', 'incorrect'),
     spec('3,49 → 3', 1, EX_349, '3', 'correct'),
     spec('Erreur : 4 pour 3,49 (le 9 regardé)', 1, EX_349, '4', 'incorrect'),
     spec('3,499 → 3', 1, EX_3499, '3', 'correct'),
     spec('9,7 → 10', 1, EX_97, '10', 'correct'),
     spec('Erreur : 9 (partie entière)', 1, EX_97, '9', 'incorrect'),
     spec('99,6 → 100', 1, EX_996, '100', 'correct'),
     spec('Erreur : 910', 1, EX_996, '910', 'incorrect')]))


# --- 11. CM2-034 : comparer deux nombres décimaux -----------------------------------------
# Nombres en millièmes entiers xm (gauche ou droite selon o). g : 0 → a,sq contre a,tu avec
# s < t (4,592 < 4,71 : plus de chiffres, plus petit) ; 1 → a,t contre a,t0 (« = ») ;
# 2 → a,tuv contre a,tw (même dixième) ; 3 → a,tuv contre (a + 1),s.

X_AFF = '{{x}}'
Y_AFF = '{{if:g==1|{{x}}0|{{y}}}}'
GAUCHE = '{{if:o==0|' + X_AFF + '|' + Y_AFF + '}}'
DROITE = '{{if:o==0|' + Y_AFF + '|' + X_AFF + '}}'

COMPARER = variation(
    'Complète avec le symbole qui convient.\n\n$$' + GAUCHE + ' \\ldots ' + DROITE + '$$'
    + choix(['$$<$$', '$$=$$', '$$>$$'], melanger=False),
    [var('g', '0..3'), var('o', '0..1'), var('a', '1..98'), var('t', '2..9'),
     var('s', '1..{{eval:t-1}}'), var('u', '1..9'), var('v', '1..9'), var('w', '1..9'),
     var('q', '11..99'),
     var('xm', 'eval:{{if:g==0|1000*a+100*s+q|{{if:g==1|1000*a+100*t|1000*a+100*t+10*u+v}}}}'),
     var('ym', 'eval:{{if:g==0|1000*a+100*t+10*u|{{if:g==1|xm|{{if:g==2|1000*a+100*t+10*w'
         '|1000*a+1000+100*s}}}}}}'),
     var('x', 'eval:xm/1000;d'), var('y', 'eval:ym/1000;d'),
     var('gm', 'eval:{{if:o==0|xm|ym}}'), var('dm', 'eval:{{if:o==0|ym|xm}}'),
     var('r', 'eval:sign(gm-dm)+1')],
    ['{{r}}'],
    ['**Comparer deux décimaux.** On compare d\'abord les parties entières. Si elles sont'
     ' égales, on écrit les deux nombres avec autant de chiffres après la virgule, puis on'
     ' compare rang par rang : le nombre de chiffres ne dit pas qui est le plus grand.',
     '{{if:g==3|Les parties entières sont différentes : ${{a}}$ et ${{eval:a+1}}$.'
     '|Même partie entière ${{a}}$. Avec trois chiffres après la virgule : $'
     + trois_decimales('gm') + '$ et $' + trois_decimales('dm') + '$.}}',
     '$$' + GAUCHE + ' ' + col('{{if:r==0|<|{{if:r==1|=|>}}}}') + ' ' + DROITE + '$$'],
    ['mod(q,10)!=0', 'g!=2 or w!=u'])

BASE = {'a': 4, 't': 7, 's': 5, 'u': 1, 'v': 3, 'w': 1, 'q': 92}
EX_PIEGE = dict(BASE, g=0, o=0, xm=4592, ym=4710, x='4.592', y='4.71', gm=4592, dm=4710, r=0)
EX_PIEGE_O = dict(BASE, g=0, o=1, xm=4592, ym=4710, x='4.592', y='4.71', gm=4710, dm=4592,
                  r=2)
EX_EGAL = dict(BASE, a=3, g=1, o=0, xm=3700, ym=3700, x='3.7', y='3.7', gm=3700, dm=3700, r=1)
EX_CENT = dict(BASE, g=2, o=0, u=5, w=2, v=8, xm=4758, ym=4720, x='4.758', y='4.72', gm=4758,
               dm=4720, r=2)
EX_ENTIER = dict(BASE, g=3, o=1, t=8, s=2, u=7, v=6, xm=4876, ym=5200, x='4.876', y='5.2',
                 gm=5200, dm=4876, r=2)
MODELES.append(modele(
    '04-comparer-deux-nombres-decimaux', 'Comparer deux nombres décimaux',
    'Comparer deux nombres décimaux avec <, = ou > : 4,592 … 4,71 (plus de chiffres ne veut pas'
    ' dire plus grand) ; 3,7 … 3,70 ; 4,758 … 4,72 ; 5,2 … 4,876',
    'Comparer', 6, [COMPARER],
    [spec('4,592 < 4,71', 0, EX_PIEGE, '0', 'correct'),
     spec('Erreur : 4,592 > 4,71 (plus de chiffres)', 0, EX_PIEGE, '2', 'incorrect'),
     spec('4,71 > 4,592', 0, EX_PIEGE_O, '2', 'correct'),
     spec('3,7 = 3,70', 0, EX_EGAL, '1', 'correct'),
     spec('Erreur : 3,7 < 3,70', 0, EX_EGAL, '0', 'incorrect'),
     spec('4,758 > 4,72', 0, EX_CENT, '2', 'correct'),
     spec('5,2 > 4,876', 0, EX_ENTIER, '2', 'correct'),
     spec('Erreur : 5,2 < 4,876', 0, EX_ENTIER, '0', 'incorrect')]))


# --- 12. CM2-146 : ranger cinq nombres ----------------------------------------------------
# Construits dans l'ordre, comme l'exemple du BO (12,082 < 12,09 < 12 324/1 000 < 12,6 < 14) :
# x1 = a,0pq < x2 = a,0c (c > p) < x3 = (1 000a + b)/1 000 (b de 101 à 499) < x4 = a,t < x5 = a + n.

RANGER_VARS = [var('a', '2..20'), var('n', '1..2'), var('p', '1..8'), var('q', '1..9'),
               var('c', '{{eval:p+1}}..9'), var('b', '101..499'),
               var('t', '{{eval:floor(b/100)+1}}..9'), var('f', 'eval:1000*a+b'),
               var('x1', 'eval:(1000*a+10*p+q)/1000;d'), var('x2', 'eval:(100*a+c)/100;d'),
               var('x3', 'eval:f/1000;d'), var('x4', 'eval:(10*a+t)/10;d'),
               var('x5', 'eval:a+n')]
FORMES = {'x1': '${{x1}}$', 'x2': '${{x2}}$', 'x3': '$' + frac('{{f}}', '1000') + '$',
          'x4': '${{x4}}$', 'x5': '${{x5}}$'}


def etiquettes(signe, ordre):
    return ('\n\n```ranger\nsigne: ' + signe + '\n'
            + ''.join('- ' + FORMES[x] + '\n' for x in ordre) + '```')


METHODE_RANGER = [
    '**Tout à virgule.** $' + frac('{{f}}', '1000') + ' = {{x3}}$.',
    '${{x5}}$ est le seul à avoir ${{x5}}$ unités : c\'est le plus grand. Les quatre autres ont'
    ' ${{a}}$ unités : on compare leurs dixièmes ($0$, $0$, ${{eval:floor(b/100)}}$ et ${{t}}$),'
    ' puis, pour ${{x1}}$ et ${{x2}}$, leurs centièmes (${{p}}$ et ${{c}}$).']
CROISSANT = ('$$' + col('{{x1}} < {{x2}} < ' + frac('{{f}}', '1000') + ' < {{x4}} < {{x5}}')
             + '$$')
DECROISSANT = ('$$' + col('{{x5}} > {{x4}} > ' + frac('{{f}}', '1000') + ' > {{x2}} > {{x1}}')
               + '$$')

RANGER = [
    variation('Range ces nombres du plus petit au plus grand.'
              + etiquettes('<', ['x1', 'x2', 'x3', 'x4', 'x5']), RANGER_VARS, None,
              METHODE_RANGER + [CROISSANT], ['mod(b,10)!=0']),
    variation('Range ces nombres du plus grand au plus petit.'
              + etiquettes('>', ['x5', 'x4', 'x3', 'x2', 'x1']), RANGER_VARS, None,
              METHODE_RANGER + [DECROISSANT], ['mod(b,10)!=0']),
]

EX_RANGER = {'a': 12, 'n': 2, 'p': 8, 'q': 2, 'c': 9, 'b': 324, 't': 6, 'f': 12324,
             'x1': '12.082', 'x2': '12.09', 'x3': '12.324', 'x4': '12.6', 'x5': 14}


def positions(affichees, ordre):
    return [str(affichees.index(x)) for x in ordre]


# Positions AFFICHÉES des étiquettes (mélange des specs), relevées pour EX_RANGER avec
# `generateInstanceWithFixedVariables` : croissant 12,09 ; 12 324/1 000 ; 12,6 ; 14 ; 12,082 —
# décroissant 12,6 ; 12 324/1 000 ; 12,09 ; 12,082 ; 14
AFFICHE_CROISSANT = ['x2', 'x3', 'x4', 'x5', 'x1']
AFFICHE_DECROISSANT = ['x4', 'x3', 'x2', 'x1', 'x5']
CROISSANT_JUSTE = ['x1', 'x2', 'x3', 'x4', 'x5']
MODELES.append(modele(
    '05-ranger-des-nombres-decimaux', 'Ranger des nombres décimaux',
    'Ranger dans l\'ordre croissant ou décroissant cinq nombres : un entier, trois décimaux de'
    ' même partie entière et une fraction décimale (12,082 ; 12,09 ; 12 324/1 000 ; 12,6 ; 14)',
    'Comparer', 7, RANGER,
    [spec('croissant : 12,082 < 12,09 < 12324/1000 < 12,6 < 14', 0, EX_RANGER,
          positions(AFFICHE_CROISSANT, CROISSANT_JUSTE), 'correct'),
     spec('Erreur : 12,6 < 12,09 < 12,082 (après la virgule lu comme un entier)', 0, EX_RANGER,
          positions(AFFICHE_CROISSANT, ['x4', 'x2', 'x1', 'x5', 'x3']), 'incorrect'),
     spec('Erreur : 12,09 avant 12,082', 0, EX_RANGER,
          positions(AFFICHE_CROISSANT, ['x2', 'x1', 'x3', 'x4', 'x5']), 'incorrect'),
     spec('Erreur : ordre décroissant', 0, EX_RANGER,
          positions(AFFICHE_CROISSANT, list(reversed(CROISSANT_JUSTE))), 'incorrect'),
     spec('décroissant : 14 > 12,6 > 12324/1000 > 12,09 > 12,082', 1, EX_RANGER,
          positions(AFFICHE_DECROISSANT, list(reversed(CROISSANT_JUSTE))), 'correct'),
     spec('Erreur : 12324/1000 le plus grand (numérateur lu)', 1, EX_RANGER,
          positions(AFFICHE_DECROISSANT, ['x3', 'x5', 'x4', 'x2', 'x1']), 'incorrect'),
     spec('Erreur : ordre croissant', 1, EX_RANGER,
          positions(AFFICHE_DECROISSANT, CROISSANT_JUSTE), 'incorrect')],
    delay=60))


# --- 13. CM2-147 : intercaler un nombre décimal -------------------------------------------
# Toute réponse strictement entre est juste (règle `range`), fraction décimale comprise.

METHODE_INTERCALER = ('**Intercaler.** On écrit les deux nombres avec un chiffre de plus après la'
                      ' virgule : il apparaît de la place entre eux.')


def intercaler(variables, attendue, detail):
    return variation(
        'Écris un nombre décimal compris entre ${{lo}}$ et ${{hi}}$.\n\n$${{lo}} < ? < {{hi}}$$',
        variables,
        [{'expectedAnswer': attendue, 'rulesSuffice': True,
          'validationRules': [{'type': 'range', 'min': '{{lo}}', 'max': '{{hi}}',
                               'inclusive': False}]}],
        [METHODE_INTERCALER, detail])


INTERCALER = [
    intercaler([var('a', '0..20'), var('b', '0..8'), var('lo', 'eval:(10*a+b)/10;d'),
                var('hi', 'eval:(10*a+b+1)/10;d')],
               '{{eval:(100*a+10*b+5)/100;d}}',
               '${{lo}} = {{a}}.{{b}}0$ et ${{hi}} = {{a}}.{{eval:b+1}}0$ : par exemple $'
               + col('{{eval:(100*a+10*b+5)/100;d}}') + '$ (mais aussi'
               ' ${{eval:(100*a+10*b+1)/100;d}}$, ${{eval:(1000*a+100*b+25)/1000;d}}$…).'),
    intercaler([var('a', '0..20'), var('lo', 'eval:(100*a+99)/100;d'), var('hi', 'eval:a+1')],
               '{{eval:(1000*a+995)/1000;d}}',
               '${{lo}} = {{a}}.990$ et ${{hi}} = {{hi}}.000$ : par exemple $'
               + col('{{eval:(1000*a+995)/1000;d}}') + '$ (mais aussi'
               ' ${{eval:(1000*a+991)/1000;d}}$, ${{eval:(1000*a+999)/1000;d}}$…).'),
]

EX_34 = {'a': 3, 'b': 4, 'lo': '3.4', 'hi': '3.5'}
EX_199 = {'a': 1, 'lo': '1.99', 'hi': '2'}
MODELES.append(modele(
    '06-intercaler-un-nombre-decimal', 'Intercaler un nombre décimal',
    'Écrire un nombre décimal compris entre deux dixièmes consécutifs (3,4 < 3,45 < 3,5), ou entre'
    ' un centième et l\'entier suivant (1,99 < 1,995 < 2) ; toute réponse strictement entre est'
    ' juste, fraction décimale comprise',
    'Encadrer', 7, INTERCALER,
    [spec('3,45', 0, EX_34, '3,45', 'correct'),
     spec('3,456 (trois décimales)', 0, EX_34, '3,456', 'correct'),
     spec('3456/1000 (fraction décimale)', 0, EX_34, '\\frac{3\\,456}{1\\,000}', 'correct'),
     spec('Erreur : 3,5 (borne)', 0, EX_34, '3,5', 'incorrect'),
     spec('Erreur : 3,39', 0, EX_34, '3,39', 'incorrect'),
     spec('1,995', 1, EX_199, '1,995', 'correct'),
     spec('1,991', 1, EX_199, '1,991', 'correct'),
     spec('1995/1000 (fraction décimale)', 1, EX_199, '\\frac{1\\,995}{1\\,000}', 'correct'),
     spec('Erreur : 1,100 (« après 1,99 vient 1,100 »)', 1, EX_199, '1,100', 'incorrect'),
     spec('Erreur : 1,99 (borne)', 1, EX_199, '1,99', 'incorrect'),
     spec('Erreur : 2', 1, EX_199, '2', 'incorrect')],
    # 3 456/1 000 juste telle quelle (décision c), sans simplification exigée
    delay=45,
    options={'constraints': {'reducedFractions': 'off', 'spacesFromFourDigits': True}}))


os.makedirs(DOSSIER, exist_ok=True)
for nom, m in MODELES:
    with open(os.path.join(DOSSIER, nom + '.json'), 'w', encoding='utf-8') as f:
        json.dump(m, f, ensure_ascii=False, indent='\t')
        f.write('\n')
# Mis en forme comme le pre-commit, pour que le script redonne les fichiers commités
subprocess.run(['pnpm', 'exec', 'prettier', '--write', DOSSIER], check=True,
               stdout=subprocess.DEVNULL)
print(f'{len(MODELES)} modèles écrits dans {DOSSIER}')
