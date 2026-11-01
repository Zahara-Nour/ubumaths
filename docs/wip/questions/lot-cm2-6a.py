"""Écrit les 7 modèles du lot 6a du CM2 (fractions décimales) dans scripts/questions/cm2-6a/.

Phase 0 du 2026-11-01 (§ 11 du journal `docs/wip/questions-cm2-progress.md`), recommandations
suivies par David (« tes recos ? » puis « je valide ») : découpage 6a (fractions décimales : 023,
024, 027, 028, 139, 140, 029) / 6b (décimaux) ; pour intercaler (#6), une fraction décimale est
exigée (`requiredForm: 'fraction'`, l'écriture à virgule reçoit un message de forme).
Bornes : `cycle3.json`, CM2 (dénominateurs 10, 100, 1 000 ; décomposition à numérateurs < 10,
4 + 1/10 + 7/1 000 ; 67/100 et 607/1 000 ; 7 103/1 000 entre deux entiers ; 43/100 < … < 44/100,
réponse en millièmes ; ranger jusqu'à quatre nombres, 2 ; 140/100 ; 1 200/1 000 ; 9/10).
Un point par modèle ; le nœud et le tag sont posés par la migration de rangement, après le
`--publier`.

Jumeau du lot 3b du CM1 (`lot-cm1-3b.py`, dixièmes et centièmes) : les millièmes en plus.

Décisions et pièges :
- `reducedFractions: off` partout (toute fraction égale juste) ; « écrire en chiffres » : jamais
  un numérateur multiple de 10 avec un dénominateur 100 ou 1 000 (45/100 passerait pour
  « quatre-cent-cinquante millièmes ») ;
- nombres en lettres : orthographe rectifiée (traits d'union partout, « mille » invariable) ;
  numérateurs pris dans une liste (chaîne de {{if:…}}) ;
- #2 (CM2-024) est rangé dans le thème Décimaux (catégorie de « Liens entre les unités de
  numération », 6e) ;
- niveaux : suite des niveaux de chaque catégorie, relevés en prod le 2026-11-01.

    python3 docs/wip/questions/lot-cm2-6a.py scripts/questions/cm2-6a
"""

import json
import os
import subprocess
import sys

DOSSIER = sys.argv[1]
OPTIONS = {'constraints': {'reducedFractions': 'off', 'spacesFromFourDigits': True}}


def spec(desc, vi, variables, answers, status, violations=None):
    s = {'description': desc, 'variationIndex': vi,
         'variables': {k: str(v) for k, v in variables.items()},
         'answers': answers if isinstance(answers, list) else [answers],
         'expected': {'status': status}}
    if violations:
        s['expected']['constraintViolations'] = violations
    return s


def modele(nom, title, description, theme, subdomain, level, variations, specs, delay=30):
    # theme / domain / subdomain : anciennes colonnes, remplies pour create-questions ; le
    # rangement (nœud du point) est posé par la migration
    return nom, {'title': title, 'description': description, 'grades': ['CM2'],
                 'theme': theme, 'domain': 'Apprivoiser', 'subdomain': subdomain,
                 'level': level, 'delay': delay, 'status': 'draft', 'options': OPTIONS,
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


def selon(nom, valeurs, debut=0):
    """`{{if:nom==debut|v0|{{if:nom==debut+1|v1|…}}}}` ; la dernière valeur est le « sinon »."""
    texte = valeurs[-1]
    for i in range(len(valeurs) - 2, -1, -1):
        texte = '{{if:' + nom + '==' + str(debut + i) + '|' + valeurs[i] + '|' + texte + '}}'
    return texte


def col(x, i=0):
    return '\\textcolor{{{color:primary.' + str(i) + '}}}{' + x + '}'


def choix(lignes, melanger=True):
    tete = '' if melanger else 'melanger: non\n'
    return '\n\n```choix\n' + tete + ''.join('- ' + l + '\n' for l in lignes) + '```'


def frac(n, d):
    return '\\frac{' + n + '}{' + d + '}'


def fraction_exigee(attendue):
    # L'écriture à virgule est refusée : le point travaillé est l'écriture en fraction
    return {'expectedAnswer': attendue, 'requiredForm': 'fraction'}


MODELES = []

# --- Nombres en lettres (orthographe rectifiée, comme `lot-cm1-3b.py`) ----------------------

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


def trois_chiffres(n):
    c, r = divmod(n, 100)
    mots = []
    if c:
        cent = 'cent' if c == 1 else UNITES[c] + '-cent'
        mots.append(cent + ('s' if c > 1 and r == 0 else ''))
    if r:
        mots.append(deux_chiffres(r))
    return '-'.join(mots)


def lettres(n):
    """n (1 à 9 999) en lettres : deux-cent-sept, mille-trois, quatre-mille-cent-sept."""
    m, r = divmod(n, 1000)
    mots = []
    if m:
        mots.append('mille' if m == 1 else UNITES[m] + '-mille')
    if r:
        mots.append(trois_chiffres(r))
    return '-'.join(mots)


assert lettres(4107) == 'quatre-mille-cent-sept'
assert lettres(207) == 'deux-cent-sept'
assert lettres(1080) == 'mille-quatre-vingts'
assert lettres(71) == 'soixante-et-onze'

RANGS = ['millième', 'centième', 'dixième', 'unité']  # rang 0 à 3, de droite à gauche
RANGS_PLURIEL = [r + 's' for r in RANGS]


# --- 1. CM2-023 : lire et écrire une fraction décimale ------------------------------------
# `c` code le couple : c = 10 000 × p + n, avec d = 10^p ; le numérateur n'est jamais un
# multiple de 10 quand d vaut 100 ou 1 000. Cas qui piègent : zéros intérieurs (207, 4 107),
# 70 à 99, « mille » invariable.

DIXIEMES = [3, 9, 23, 47, 71, 85, 99, 125]
CENTIEMES = [7, 23, 81, 99, 105, 237, 308, 671, 1003, 2375]
MILLIEMES = [7, 23, 65, 207, 451, 607, 999, 1003, 2375, 4107, 7103, 9081]
CODES = ([10000 + n for n in DIXIEMES] + [20000 + n for n in CENTIEMES]
         + [30000 + n for n in MILLIEMES])
NOM_PART = {1: 'dixième', 2: 'centième', 3: 'millième'}


def nom_decimal(c, decalage=0, parts=None):
    """« deux-cent-sept millièmes » ; `decalage` change le rang (leurres) ; `parts` remplace le
    nom des parts (« milliers » pour « millièmes »)."""
    p, n = divmod(c, 10000)
    noms = parts or NOM_PART
    part = noms[(p - 1 + decalage) % 3 + 1]
    return lettres(n) + ' ' + part + ('s' if n > 1 else '')


ENTIERES = {1: 'dizaine', 2: 'centaine', 3: 'millier'}
ECRITURE_VARS = [var('c', '|'.join(str(c) for c in CODES)), var('p', '{{if:c>30000|3|{{if:c>20000|2|1}}}}'),
                 var('d', 'eval:10^p'), var('n', 'eval:mod(c,10000)')]
FRAC = frac('{{n}}', '{{d}}')
SENS_DECIMAL = ('Un **dixième**, c\'est l\'unité partagée en $10$ parts égales ; un'
                ' **centième**, en $100$ ; un **millième**, en $1\\,000$.')

ECRIRE = variation(
    'Écris en chiffres la fraction « **' + par('c', CODES, nom_decimal) + '** ».\n\n$$?$$',
    ECRITURE_VARS, [fraction_exigee('\\frac{{{n}}}{{{d}}}')],
    [SENS_DECIMAL,
     '« ' + par('c', CODES, nom_decimal) + ' » : le dénominateur est ${{d}}$, le numérateur'
     ' ${{n}}$.',
     '$$' + col(FRAC) + '$$'])

LIRE = variation(
    'Comment lit-on la fraction $' + FRAC + '$ ?'
    + choix([par('c', CODES, nom_decimal), par('c', CODES, lambda c: nom_decimal(c, 1)),
             par('c', CODES, lambda c: nom_decimal(c, 2)),
             par('c', CODES, lambda c: nom_decimal(c, 0, ENTIERES))]),
    ECRITURE_VARS, ['0'],
    [SENS_DECIMAL,
     'Ici, le dénominateur est ${{d}}$ : on compte des '
     + '{{if:p==1|dixièmes|{{if:p==2|centièmes|millièmes}}}}. $' + FRAC + '$ se lit **« '
     + par('c', CODES, nom_decimal) + ' »**.'])

EX_207 = {'c': 30207, 'p': 3, 'd': 1000, 'n': 207}
EX_4107 = {'c': 34107, 'p': 3, 'd': 1000, 'n': 4107}
EX_23 = {'c': 20023, 'p': 2, 'd': 100, 'n': 23}
MODELES.append(modele(
    '01-lire-et-ecrire-une-fraction-decimale', 'Lire et écrire une fraction décimale',
    'Deux-cent-sept millièmes ↔ 207/1 000 : écrire en chiffres une fraction décimale donnée en'
    ' lettres, la lire parmi quatre écritures ; dénominateur 10, 100 ou 1 000',
    'Fractions', 'Ecriture', 9, [ECRIRE, LIRE],
    [spec('deux-cent-sept millièmes : 207/1000', 0, EX_207, '\\frac{207}{1\\,000}', 'correct'),
     spec('quatre-mille-cent-sept millièmes : 4107/1000', 0, EX_4107, '\\frac{4\\,107}{1\\,000}',
          'correct'),
     spec('vingt-trois centièmes : 23/100', 0, EX_23, '\\frac{23}{100}', 'correct'),
     spec('Erreur : 207/100 (centièmes)', 0, EX_207, '\\frac{207}{100}', 'incorrect'),
     spec('Erreur : 417/1000 (zéro oublié)', 0, EX_4107, '\\frac{417}{1\\,000}', 'incorrect'),
     spec('Erreur : 1000/207 (inversée)', 0, EX_207, '\\frac{1\\,000}{207}', 'incorrect'),
     spec('Forme : 0,207 (écriture à virgule)', 0, EX_207, '0.207', 'bad_form', ['form']),
     spec('207/1000 : deux-cent-sept millièmes', 1, EX_207, '0', 'correct'),
     spec('Erreur : deux-cent-sept dixièmes', 1, EX_207, '1', 'incorrect'),
     spec('Erreur : deux-cent-sept milliers', 1, EX_207, '3', 'incorrect')]))


# --- 2. CM2-024 : unités, dixièmes, centièmes, millièmes ----------------------------------
# Rangs 0 (millième) à 3 (unité) ; u au-dessus de w, p = u − w rangs d'écart.

def rang(nom, pluriel=False):
    return selon(nom, RANGS_PLURIEL if pluriel else RANGS)


def texte(x):
    return '~\\text{' + x + '}'


ECART = ('**D\'un rang au rang juste à sa droite, on multiplie par $10$** : $1$ unité $= 10$'
         ' dixièmes, $1$ dixième $= 10$ centièmes, $1$ centième $= 10$ millièmes.')
RANGS_VARS = [var('u', '1..3'), var('w', '0..2'), var('p', 'eval:u-w')]

UN_EN = variation(
    'Complète.\n\n$$1' + texte(rang('u')) + ' = ?' + texte(rang('w', True)) + '$$',
    RANGS_VARS, ['{{eval:10^p}}'],
    [ECART, 'Des ' + rang('u', True) + ' aux ' + rang('w', True) + ', on descend de ${{p}}$'
     ' rang{{if:p>1|s|}} : $1' + texte(rang('u')) + ' = ' + col('{{eval:10^p}}')
     + texte(rang('w', True)) + '$.'],
    ['p>=1'])

K_EN = variation(
    'Complète.\n\n$${{k}}' + texte(rang('u', True)) + ' = ?' + texte(rang('w', True)) + '$$',
    [var('k', '2..9')] + RANGS_VARS, ['{{eval:k*10^p}}'],
    [ECART, '$1' + texte(rang('u')) + ' = {{eval:10^p}}' + texte(rang('w', True)) + '$, donc'
     ' ${{k}}' + texte(rang('u', True)) + ' = {{k}} \\times {{eval:10^p}} = '
     + col('{{eval:k*10^p}}') + texte(rang('w', True)) + '$.'],
    ['p>=1'])

INVERSE = variation(
    'Complète.\n\n$${{eval:k*10^p}}' + texte(rang('w', True)) + ' = ?' + texte(rang('u', True))
    + '$$',
    [var('k', '2..9')] + RANGS_VARS, ['{{k}}'],
    [ECART, '$1' + texte(rang('u')) + ' = {{eval:10^p}}' + texte(rang('w', True)) + '$ : dans'
     ' ${{eval:k*10^p}}$ ' + rang('w', True) + ', il y a ${{eval:k*10^p}} \\div {{eval:10^p}} = '
     + col('{{k}}') + '$ ' + rang('u', True) + '.'],
    ['p>=1'])

# « 35 centièmes = 3 dixièmes et 5 centièmes » : w rang du bas, w + 1 rang du haut
REGROUPER = variation(
    # « {{n}} … » hors du champ : à 390 px, la ligne entière déborde du champ (jeu local)
    'Complète : ${{n}}$ ' + rang('w', True) + ', c\'est…\n\n$$?' + texte(rang('h', True))
    + '\\text{ et } ?' + texte(rang('w', True)) + '$$',
    [var('w', '0..2'), var('h', 'eval:w+1'), var('t', '1..9'), var('r', '1..9'),
     var('n', 'eval:10*t+r')],
    ['{{t}}', '{{r}}'],
    [ECART, '$10' + texte(rang('w', True)) + ' = 1' + texte(rang('h')) + '$ : dans ${{n}}$ '
     + rang('w', True) + ', il y a ${{t}}$ fois $10$ ' + rang('w', True) + ', et il en reste'
     ' ${{r}}$.',
     '$${{n}}' + texte(rang('w', True)) + ' = ' + col('{{t}}') + texte(rang('h', True))
     + '\\text{ et } ' + col('{{r}}') + texte(rang('w', True)) + '$$'])

EX_UN = {'u': 3, 'w': 0, 'p': 3}
EX_K = {'k': 4, 'u': 2, 'w': 1, 'p': 1}
EX_INV = {'k': 3, 'u': 2, 'w': 0, 'p': 2}
EX_REG = {'w': 1, 'h': 2, 't': 3, 'r': 5, 'n': 35}
MODELES.append(modele(
    '02-unites-dixiemes-centiemes-milliemes', 'Unités, dixièmes, centièmes, millièmes',
    'Relations entre unité, dixième, centième et millième : 1 unité = 1 000 millièmes ;'
    ' 4 dixièmes = 40 centièmes ; 300 millièmes = 3 dixièmes ; 35 centièmes = 3 dixièmes et'
    ' 5 centièmes',
    'Décimaux', 'Décomposition', 8, [UN_EN, K_EN, INVERSE, REGROUPER],
    [spec('1 unité = 1000 millièmes', 0, EX_UN, '1\\,000', 'correct'),
     spec('Erreur : 100 (un rang de moins)', 0, EX_UN, '100', 'incorrect'),
     spec('4 dixièmes = 40 centièmes', 1, EX_K, '40', 'correct'),
     spec('Erreur : 400', 1, EX_K, '400', 'incorrect'),
     spec('300 millièmes = 3 dixièmes', 2, EX_INV, '3', 'correct'),
     spec('Erreur : 30', 2, EX_INV, '30', 'incorrect'),
     spec('35 centièmes = 3 dixièmes et 5 centièmes', 3, EX_REG, ['3', '5'], 'correct'),
     spec('Erreur : 5 et 3 (échangés)', 3, EX_REG, ['5', '3'], 'incorrect'),
     spec('Erreur : 35 et 0', 3, EX_REG, ['35', '0'], 'incorrect')]))


# --- 3. CM2-027 : fraction décimale = entier + fractions de numérateur < 10 ---------------

DECOMPOSER = variation(
    'Écris cette fraction comme la somme d\'un nombre entier et de fractions dont le'
    ' numérateur est inférieur à $10$.\n\n$$' + frac('{{a}}', '1000')
    + ' = ? + \\frac{?}{10} + \\frac{?}{100} + \\frac{?}{1000}$$',
    [var('q', '1..9'), var('t', '0..9'), var('u', '0..9'), var('v', '1..9'),
     var('a', 'eval:1000*q+100*t+10*u+v')],
    ['{{q}}', '{{t}}', '{{u}}', '{{v}}'],
    ['**Une unité, c\'est $' + frac('1000', '1000') + '$ ; un dixième, $' + frac('100', '1000')
     + '$ ; un centième, $' + frac('10', '1000') + '$.**',
     '$$' + frac('{{a}}', '1000') + ' = ' + frac('{{eval:1000*q}}', '1000') + ' + '
     + frac('{{eval:100*t}}', '1000') + ' + ' + frac('{{eval:10*u}}', '1000') + ' + '
     + frac('{{v}}', '1000') + '$$',
     '$$' + frac('{{a}}', '1000') + ' = ' + col('{{q}}') + ' + ' + frac(col('{{t}}'), '10')
     + ' + ' + frac(col('{{u}}'), '100') + ' + ' + frac(col('{{v}}'), '1000') + '$$'])

# 4 + 1/10 + 7/1 000 : pas de centièmes ; l'élève doit écrire le 0
RECOMPOSER = variation(
    'Écris cette somme sous la forme d\'une seule fraction décimale.\n\n$${{q}} + '
    + frac('{{t}}', '10') + ' + ' + frac('{{v}}', '1000') + ' = \\frac{?}{1000}$$',
    [var('q', '1..9'), var('t', '1..9'), var('v', '1..9'), var('a', 'eval:1000*q+100*t+v')],
    ['{{a}}'],
    ['**Tout en millièmes.** ${{q}} = ' + frac('{{eval:1000*q}}', '1000') + '$ et $'
     + frac('{{t}}', '10') + ' = ' + frac('{{eval:100*t}}', '1000') + '$ ; il n\'y a aucun'
     ' centième.',
     '$${{q}} + ' + frac('{{t}}', '10') + ' + ' + frac('{{v}}', '1000') + ' = '
     + frac('{{eval:1000*q}}', '1000') + ' + ' + frac('{{eval:100*t}}', '1000') + ' + '
     + frac('{{v}}', '1000') + ' = ' + col(frac('{{a}}', '1000')) + '$$'])

EX_DEC = {'q': 4, 't': 1, 'u': 0, 'v': 7, 'a': 4107}
EX_REC = {'q': 4, 't': 1, 'v': 7, 'a': 4107}
MODELES.append(modele(
    '03-decomposer-une-fraction-decimale', 'Décomposer une fraction décimale',
    'Écrire une fraction décimale comme un entier plus des fractions décimales de numérateur'
    ' inférieur à 10, et l\'inverse (4 107/1 000 = 4 + 1/10 + 0/100 + 7/1 000)',
    'Fractions', 'Décomposition', 8, [DECOMPOSER, RECOMPOSER],
    [spec('4107/1000 = 4 + 1/10 + 0/100 + 7/1000', 0, EX_DEC, ['4', '1', '0', '7'], 'correct'),
     spec('Erreur : 4 + 1/10 + 7/100 + 0/1000 (zéro mal placé)', 0, EX_DEC,
          ['4', '1', '7', '0'], 'incorrect'),
     spec('Erreur : 41 + 0/10 + 0/100 + 7/1000', 0, EX_DEC, ['41', '0', '0', '7'],
          'incorrect'),
     spec('4 + 1/10 + 7/1000 = 4107/1000', 1, EX_REC, '4\\,107', 'correct'),
     spec('Erreur : 417 (zéro oublié)', 1, EX_REC, '417', 'incorrect'),
     spec('Erreur : 4170', 1, EX_REC, '4\\,170', 'incorrect'),
     spec('Erreur : 12 (4 + 1 + 7)', 1, EX_REC, '12', 'incorrect')]))


# --- 4. CM2-028 : comparer deux fractions décimales ---------------------------------------
# a/D1 contre h/D2, D2 = m × D1 (paires 10-100, 100-1 000, 10-1 000) ; h tiré autour de a × m,
# pas multiple de m (le piège : plus grand numérateur, nombre plus petit) ; s = 0 (une fois sur
# cinq) donne l'égalité ; o échange les côtés ; r = indice du signe juste dans < = >.

COMPARER = variation(
    'Complète avec le symbole qui convient.\n\n$$' + frac('{{gn}}', '{{gd}}') + ' \\ldots '
    + frac('{{dn}}', '{{dd}}') + '$$' + choix(['$$<$$', '$$=$$', '$$>$$'], melanger=False),
    [var('k', '0..2'), var('D1', '{{if:k==1|100|10}}'), var('D2', '{{if:k==0|100|1000}}'),
     var('m', 'eval:D2/D1'), var('a', '1..99'),
     var('w', '{{eval:7*a*m/10}}..{{eval:13*a*m/10}}'), var('s', '0..4'),
     var('h', 'eval:{{if:s==0|a*m|w}}'), var('o', '0..1'),
     var('gn', 'eval:{{if:o==0|a|h}}'), var('gd', 'eval:{{if:o==0|D1|D2}}'),
     var('dn', 'eval:{{if:o==0|h|a}}'), var('dd', 'eval:{{if:o==0|D2|D1}}'),
     var('r', 'eval:sign(gn*1000/gd-dn*1000/dd)+1')],
    ['{{r}}'],
    ['**Même dénominateur d\'abord.** $' + frac('1', '{{D1}}') + ' = ' + frac('{{m}}', '{{D2}}')
     + '$, donc $' + frac('{{a}}', '{{D1}}') + ' = ' + frac('{{eval:a*m}}', '{{D2}}') + '$.',
     'On compare ${{eval:a*m}}$ et ${{h}}$ : le plus grand numérateur n\'était pas forcément'
     ' le plus grand nombre.',
     '$$' + frac('{{gn}}', '{{gd}}') + ' ' + col('{{if:r==0|<|{{if:r==1|=|>}}}}') + ' '
     + frac('{{dn}}', '{{dd}}') + '$$'],
    ['s==0 or mod(w,m)!=0', 'mod(a,10)!=0'])

EX_CMP = {'k': 1, 'D1': 100, 'D2': 1000, 'm': 10, 'a': 67, 'w': 607, 's': 1, 'h': 607,
          'o': 0, 'gn': 67, 'gd': 100, 'dn': 607, 'dd': 1000, 'r': 2}
EX_CMP10 = {'k': 0, 'D1': 10, 'D2': 100, 'm': 10, 'a': 7, 'w': 65, 's': 2, 'h': 65, 'o': 0,
            'gn': 7, 'gd': 10, 'dn': 65, 'dd': 100, 'r': 2}
EX_EGAL = {'k': 2, 'D1': 10, 'D2': 1000, 'm': 100, 'a': 3, 'w': 250, 's': 0, 'h': 300,
           'o': 1, 'gn': 300, 'gd': 1000, 'dn': 3, 'dd': 10, 'r': 1}
EX_PLUS_PETIT = {'k': 0, 'D1': 10, 'D2': 100, 'm': 10, 'a': 7, 'w': 83, 's': 3, 'h': 83,
                 'o': 0, 'gn': 7, 'gd': 10, 'dn': 83, 'dd': 100, 'r': 0}
MODELES.append(modele(
    '04-comparer-deux-fractions-decimales', 'Comparer deux fractions décimales',
    'Comparer deux fractions décimales de dénominateurs différents avec <, = ou >'
    ' (7/10 … 65/100 ; 67/100 … 607/1 000 ; 3/10 = 300/1 000)',
    'Fractions', 'Comparer', 17, [COMPARER],
    [spec('67/100 > 607/1000', 0, EX_CMP, '2', 'correct'),
     spec('Erreur : 67/100 < 607/1000 (numérateurs comparés)', 0, EX_CMP, '0', 'incorrect'),
     spec('7/10 > 65/100', 0, EX_CMP10, '2', 'correct'),
     spec('7/10 < 83/100', 0, EX_PLUS_PETIT, '0', 'correct'),
     spec('300/1000 = 3/10', 0, EX_EGAL, '1', 'correct'),
     spec('Erreur : 300/1000 > 3/10', 0, EX_EGAL, '2', 'incorrect')]))


# --- 5. et 6. CM2-139, CM2-140 : encadrer, intercaler -------------------------------------

def encadrer(d, q, r):
    return variation(
        'Encadre cette fraction par deux nombres entiers qui se suivent.\n\n$$? < '
        + frac('{{a}}', d) + ' < ?$$',
        [var('q', q), var('r', r), var('a', 'eval:' + d + '*q+r')],
        ['{{q}}', '{{eval:q+1}}'],
        ['**Combien d\'unités ?** Une unité, c\'est $' + frac(d, d) + '$ : ${{a}} = {{q}}'
         ' \\times ' + d + ' + {{r}}$.',
         '$$' + frac('{{a}}', d) + ' = {{q}} + ' + frac('{{r}}', d) + '$$',
         '$' + frac('{{r}}', d) + '$ est entre $0$ et $1$, donc $' + col('{{q}}') + ' < '
         + frac('{{a}}', d) + ' < ' + col('{{eval:q+1}}') + '$.'])


EX_ENC100 = {'q': 2, 'r': 37, 'a': 237}
EX_ENC1000 = {'q': 7, 'r': 103, 'a': 7103}
MODELES.append(modele(
    '05-encadrer-une-fraction-decimale', 'Encadrer une fraction décimale entre deux entiers'
    ' consécutifs',
    'Encadrer une fraction décimale par deux entiers consécutifs (2 < 237/100 < 3 ;'
    ' 7 < 7 103/1 000 < 8) ; dénominateur 100 ou 1 000',
    'Fractions', 'Encadrer', 6,
    [encadrer('100', '1..30', '1..99'), encadrer('1000', '0..9', '1..999')],
    [spec('2 < 237/100 < 3', 0, EX_ENC100, ['2', '3'], 'correct'),
     spec('Erreur : 23 et 24 (dixièmes lus)', 0, EX_ENC100, ['23', '24'], 'incorrect'),
     spec('7 < 7103/1000 < 8', 1, EX_ENC1000, ['7', '8'], 'correct'),
     spec('Erreur : 71 et 72', 1, EX_ENC1000, ['71', '72'], 'incorrect'),
     spec('Erreur : 710 et 711', 1, EX_ENC1000, ['710', '711'], 'incorrect'),
     spec('Erreur : 6 et 7', 1, EX_ENC1000, ['6', '7'], 'incorrect'),
     spec('0 < 45/1000 < 1', 1, {'q': 0, 'r': 45, 'a': 45}, ['0', '1'], 'correct')]))


def intercaler(d, a):
    """Entre a/d et (a + 1)/d : la réponse s'écrit avec un dénominateur dix fois plus grand."""
    D = str(int(d) * 10)
    return variation(
        'Écris une fraction décimale comprise entre ces deux fractions.\n\n$$'
        + frac('{{a}}', d) + ' < ? < ' + frac('{{eval:a+1}}', d) + '$$',
        [var('a', a)],
        [{'expectedAnswer': '\\frac{{{eval:10*a+5}}}{' + D + '}', 'requiredForm': 'fraction',
          'rulesSuffice': True,
          'validationRules': [{'type': 'range', 'min': '{{eval:a/' + d + ';d}}',
                               'max': '{{eval:(a+1)/' + d + ';d}}', 'inclusive': False}]}],
        ['**Un rang plus loin.** $' + frac('{{a}}', d) + ' = ' + frac('{{eval:10*a}}', D)
         + '$ et $' + frac('{{eval:a+1}}', d) + ' = ' + frac('{{eval:10*a+10}}', D) + '$.',
         'Entre les deux, il y a $' + frac('{{eval:10*a+1}}', D) + '$, $'
         + frac('{{eval:10*a+2}}', D) + '$… jusqu\'à $' + frac('{{eval:10*a+9}}', D)
         + '$. Par exemple :',
         '$$' + frac('{{a}}', d) + ' < ' + col(frac('{{eval:10*a+5}}', D)) + ' < '
         + frac('{{eval:a+1}}', d) + '$$'],
        ['mod(a,10)!=0'] if d == '100' else None)


MODELES.append(modele(
    '06-intercaler-une-fraction-decimale', 'Intercaler une fraction décimale',
    'Écrire une fraction décimale comprise entre deux autres (3/10 < 35/100 < 4/10 ;'
    ' 43/100 < 435/1 000 < 44/100) ; toute fraction strictement entre les deux est juste',
    'Fractions', 'Encadrer', 7, [intercaler('10', '1..49'), intercaler('100', '1..299')],
    [spec('3/10 < 35/100 < 4/10', 0, {'a': 3}, '\\frac{35}{100}', 'correct'),
     spec('3/10 < 301/1000 < 4/10', 0, {'a': 3}, '\\frac{301}{1\\,000}', 'correct'),
     spec('Erreur : 4/10 (borne)', 0, {'a': 3}, '\\frac{4}{10}', 'incorrect'),
     spec('Erreur : 35/10', 0, {'a': 3}, '\\frac{35}{10}', 'incorrect'),
     spec('43/100 < 435/1000 < 44/100', 1, {'a': 43}, '\\frac{435}{1\\,000}', 'correct'),
     spec('43/100 < 431/1000 < 44/100', 1, {'a': 43}, '\\frac{431}{1\\,000}', 'correct'),
     spec('Erreur : 435/100', 1, {'a': 43}, '\\frac{435}{100}', 'incorrect'),
     spec('Erreur : 44/100 (borne)', 1, {'a': 43}, '\\frac{44}{100}', 'incorrect'),
     spec('Forme : 0,435 (écriture à virgule)', 1, {'a': 43}, '0.435', 'bad_form', ['form'])],
    delay=45))


# --- 7. CM2-029 : ranger quatre fractions décimales ---------------------------------------
# Construites dans l'ordre : a/10 < k < b/1 000 < c/100 < m (= k + 1), comme 9/10 ;
# 1 200/1 000 ; 140/100 ; 2 : le plus grand numérateur n'est pas le plus grand nombre.

RANGER_VARS = [var('m', '2..5'), var('k', 'eval:m-1'),
               var('a', '{{eval:10*k-9}}..{{eval:10*k-1}}'),
               var('c', '{{eval:100*k+11}}..{{eval:100*m-1}}'),
               var('b', '{{eval:1000*k+1}}..{{eval:10*c-1}}')]


def etiquettes(signe, ordre):
    formes = {'a': '$' + frac('{{a}}', '10') + '$', 'b': '$' + frac('{{b}}', '1000') + '$',
              'c': '$' + frac('{{c}}', '100') + '$', 'm': '${{m}}$'}
    return ('\n\n```ranger\nsigne: ' + signe + '\n'
            + ''.join('- ' + formes[x] + '\n' for x in ordre) + '```')


METHODE_RANGER = ('**Tout en millièmes.** $' + frac('{{a}}', '10') + ' = '
                  + frac('{{eval:100*a}}', '1000') + '$, $' + frac('{{c}}', '100') + ' = '
                  + frac('{{eval:10*c}}', '1000') + '$, ${{m}} = '
                  + frac('{{eval:1000*m}}', '1000') + '$ : on compare les numérateurs'
                  ' ${{eval:100*a}}$, ${{b}}$, ${{eval:10*c}}$ et ${{eval:1000*m}}$.')
CROISSANT = ('$$' + frac('{{a}}', '10') + ' < ' + frac('{{b}}', '1000') + ' < '
             + frac('{{c}}', '100') + ' < {{m}}$$')
DECROISSANT = ('$${{m}} > ' + frac('{{c}}', '100') + ' > ' + frac('{{b}}', '1000') + ' > '
               + frac('{{a}}', '10') + '$$')

RANGER = [
    variation('Range ces nombres du plus petit au plus grand.'
              + etiquettes('<', ['a', 'b', 'c', 'm']), RANGER_VARS, None,
              [METHODE_RANGER, CROISSANT], ['mod(b,10)!=0']),
    variation('Range ces nombres du plus grand au plus petit.'
              + etiquettes('>', ['m', 'c', 'b', 'a']), RANGER_VARS, None,
              [METHODE_RANGER, DECROISSANT], ['mod(b,10)!=0']),
]

EX_RANGER = {'m': 2, 'k': 1, 'a': 9, 'c': 140, 'b': 1201}
MODELES.append(modele(
    '07-ranger-des-fractions-decimales', 'Ranger des fractions décimales',
    'Ranger dans l\'ordre croissant ou décroissant quatre nombres : un entier, des dixièmes, des'
    ' centièmes et des millièmes (9/10 ; 1 201/1 000 ; 140/100 ; 2)',
    'Fractions', 'Ordonner', 4, RANGER,
    # Réponses = positions AFFICHÉES des étiquettes (mélange des specs), relevées avec le
    # générateur (24 permutations essayées) : croissant 1201/1000, 140/100, 2, 9/10 ;
    # décroissant 140/100, 1201/1000, 9/10, 2
    [spec('croissant : 9/10 < 1201/1000 < 140/100 < 2', 0, EX_RANGER, ['3', '0', '1', '2'],
          'correct'),
     spec('Erreur : rangés par numérateurs (2 ; 9/10 ; 140/100 ; 1201/1000)', 0, EX_RANGER,
          ['2', '3', '1', '0'], 'incorrect'),
     spec('Erreur : ordre décroissant', 0, EX_RANGER, ['2', '1', '0', '3'], 'incorrect'),
     spec('décroissant : 2 > 140/100 > 1201/1000 > 9/10', 1, EX_RANGER, ['3', '0', '1', '2'],
          'correct'),
     spec('Erreur : rangés par numérateurs (1201/1000 ; 140/100 ; 9/10 ; 2)', 1, EX_RANGER,
          ['1', '0', '2', '3'], 'incorrect'),
     spec('Erreur : ordre croissant', 1, EX_RANGER, ['2', '1', '0', '3'], 'incorrect')],
    delay=60))


os.makedirs(DOSSIER, exist_ok=True)
for nom, m in MODELES:
    with open(os.path.join(DOSSIER, nom + '.json'), 'w', encoding='utf-8') as f:
        json.dump(m, f, ensure_ascii=False, indent='\t')
        f.write('\n')
# Mis en forme comme le pre-commit, pour que le script redonne les fichiers commités
subprocess.run(['pnpm', 'exec', 'prettier', '--write', DOSSIER], check=True,
               stdout=subprocess.DEVNULL)
