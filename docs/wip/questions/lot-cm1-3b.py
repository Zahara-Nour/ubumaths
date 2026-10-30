"""Écrit les 8 modèles du lot 3b du CM1 (fractions décimales) dans scripts/questions/cm1-3b/.

Phase 0 du 2026-10-30 (§ 10 du journal `docs/wip/questions-cm1-progress.md`), suivie par David
(« je te suis ») : écriture à virgule refusée dans les cases « fraction décimale »
(`requiredForm: 'fraction'`) ; pour intercaler, toute fraction strictement entre les bornes est
juste (règle `range`) ; droite agrandie de 23/10 à 24/10 pour les centièmes.
Bornes : `cycle3.json`, CM1 (dénominateurs 10 ou 100 ; décomposition à numérateurs < 10 ;
ranger jusqu'à quatre nombres, dont un entier ; encadrer entre deux entiers consécutifs ;
intercaler en centièmes). Un point par modèle ; le nœud et le tag sont posés par la migration de
rangement, après le `--publier`.

Décisions et pièges :
- jumeau du lot 3a (`lot-cm1-3a.py`) ; `reducedFractions: off` partout (toute fraction égale
  juste) ;
- nombres en lettres : orthographe rectifiée (David, 2026-10-28, lot CE2 2) : traits d'union
  entre les mots du nombre, « deux-cent-trente-sept centièmes » ; numérateurs pris dans une liste
  (chaîne de {{if:…}}, comme `lot-ce2-2.py`) ;
- choix en case « choix » (bloc ```choix, ADR 0033), le juste écrit en premier ;
- droites graduées : 10 intervalles, jamais plus (vise au doigt sur un téléphone) ;
- niveaux : suite des niveaux de chaque catégorie, relevés en prod le 2026-10-30.

    python3 docs/wip/questions/lot-cm1-3b.py scripts/questions/cm1-3b
"""

import json
import os
import subprocess
import sys

DOSSIER = sys.argv[1]
SANS_SIMPLIFIER = {'constraints': {'reducedFractions': 'off'}}


def spec(desc, vi, variables, answers, status, violations=None):
    s = {'description': desc, 'variationIndex': vi,
         'variables': {k: str(v) for k, v in variables.items()},
         'answers': answers if isinstance(answers, list) else [answers],
         'expected': {'status': status}}
    if violations:
        s['expected']['constraintViolations'] = violations
    return s


def modele(nom, title, description, domain, subdomain, level, variations, specs, delay=30):
    # theme / domain / subdomain : anciennes colonnes, remplies pour create-questions ; le
    # rangement (nœud du point) est posé par la migration
    return nom, {'title': title, 'description': description, 'grades': ['CM1'],
                 'theme': 'Fractions', 'domain': domain, 'subdomain': subdomain,
                 'level': level, 'delay': delay, 'status': 'draft',
                 'options': SANS_SIMPLIFIER, 'variations': variations, 'testSpecs': specs}


def var(nom, expression):
    return {'name': nom, 'expression': expression}


def variation(statement, variables, answers, steps, conditions=None):
    # Chaque `?` de l'énoncé est une case, dans l'ordre de `answers` ; `answers=None` : la case
    # vient d'un bloc (droite à placer, ```ranger), sans `blanks[]`
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


def fraction_exigee(attendue):
    # L'écriture à virgule est refusée : le point travaillé est l'écriture en fraction
    return {'expectedAnswer': attendue, 'requiredForm': 'fraction'}


MODELES = []

# --- Nombres en lettres (orthographe rectifiée, comme `lot-ce2-2.py`) ----------------------

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


# --- 1. CM1-023 : lire et écrire une fraction décimale ------------------------------------
# Une variable `c` code le couple : c = n (dixièmes) ou c = 1000 + n (centièmes) ; le
# numérateur n'est jamais un multiple du dénominateur. Cas qui piègent : 70 à 99, zéros
# intérieurs (308, 105), « cents » / « cent ».

DIXIEMES = [3, 7, 9, 13, 17, 23, 31, 46, 58, 64, 71, 85, 92, 99]
CENTIEMES = [7, 9, 23, 45, 60, 81, 99, 105, 237, 308, 450, 512, 671, 796, 999]
CODES = DIXIEMES + [1000 + n for n in CENTIEMES]


def nom_decimal(c, nom_dixiemes='dixième', nom_centiemes='centième'):
    n, d = (c, 10) if c < 1000 else (c - 1000, 100)
    part = nom_dixiemes if d == 10 else nom_centiemes
    return lettres(n) + ' ' + part + ('s' if n > 1 else '')


ECRITURE_VARS = [var('c', '|'.join(str(c) for c in CODES)),
                 var('d', '{{if:c>1000|100|10}}'), var('n', 'eval:mod(c,1000)')]
FRAC = frac('{{n}}', '{{d}}')
SENS_DECIMAL = ('Un **dixième**, c\'est l\'unité partagée en $10$ parts égales : $'
                + frac('1', '10') + '$. Un **centième**, en $100$ parts égales : $'
                + frac('1', '100') + '$.')

ECRIRE = variation(
    'Écris en chiffres la fraction « **' + par('c', CODES, nom_decimal) + '** ».\n\n$$?$$',
    ECRITURE_VARS, [fraction_exigee('\\frac{{{n}}}{{{d}}}')],
    [SENS_DECIMAL,
     '« ' + par('c', CODES, nom_decimal) + ' » : le dénominateur est ${{d}}$, le numérateur'
     ' ${{n}}$.',
     '$$' + col(FRAC) + '$$'])


def leurre_unite(c):
    # « vingt-trois centaines » pour vingt-trois centièmes : unité de numération confondue
    return nom_decimal(c, 'dizaine', 'centaine')


def leurre_autre(c):
    return nom_decimal(c, 'centième', 'dixième')


def leurre_milliemes(c):
    return nom_decimal(c, 'millième', 'millième')


LIRE = variation(
    'Comment lit-on la fraction $' + FRAC + '$ ?'
    + choix([par('c', CODES, nom_decimal), par('c', CODES, leurre_autre),
             par('c', CODES, leurre_milliemes), par('c', CODES, leurre_unite)]),
    ECRITURE_VARS, ['0'],
    [SENS_DECIMAL,
     'Ici, le dénominateur est ${{d}}$ : on compte des '
     + '{{if:d==10|dixièmes|centièmes}}. $' + FRAC + '$ se lit **« '
     + par('c', CODES, nom_decimal) + ' »**.'])

EX_23 = {'c': 1023, 'd': 100, 'n': 23}
EX_237 = {'c': 1237, 'd': 100, 'n': 237}
EX_71 = {'c': 71, 'd': 10, 'n': 71}
MODELES.append(modele(
    '01-lire-et-ecrire-une-fraction-decimale', 'Lire et écrire une fraction décimale',
    'Vingt-trois centièmes ↔ 23/100 : écrire en chiffres une fraction décimale donnée en lettres,'
    ' la lire parmi quatre écritures ; dénominateur 10 ou 100',
    'Apprivoiser', 'Ecriture', 7, [ECRIRE, LIRE],
    [spec('vingt-trois centièmes : 23/100', 0, EX_23, '\\frac{23}{100}', 'correct'),
     spec('deux-cent-trente-sept centièmes : 237/100', 0, EX_237, '\\frac{237}{100}',
          'correct'),
     spec('soixante-et-onze dixièmes : 71/10', 0, EX_71, '\\frac{71}{10}', 'correct'),
     spec('Erreur : 23/10 (dixièmes)', 0, EX_23, '\\frac{23}{10}', 'incorrect'),
     spec('Erreur : 100/23 (inversée)', 0, EX_23, '\\frac{100}{23}', 'incorrect'),
     spec('Forme : 0,23 (écriture à virgule)', 0, EX_23, '0.23', 'bad_form', ['form']),
     spec('23/100 : vingt-trois centièmes', 1, EX_23, '0', 'correct'),
     spec('Erreur : vingt-trois dixièmes', 1, EX_23, '1', 'incorrect'),
     spec('Erreur : vingt-trois centaines', 1, EX_23, '3', 'incorrect')]))


# --- 2. CM1-027 : fraction décimale > 1 = entier + fractions décimales ---------------------

DECOMPOSER_DIXIEMES = variation(
    'Écris cette fraction comme la somme d\'un nombre entier et d\'une fraction dont le'
    ' numérateur est inférieur à $10$.\n\n$$' + frac('{{a}}', '10') + ' = ? + \\frac{?}{10}$$',
    [var('q', '1..9'), var('t', '1..9'), var('a', 'eval:10*q+t')],
    ['{{q}}', '{{t}}'],
    ['**Une unité, c\'est $' + frac('10', '10') + '$.** Dans ${{a}}$ dixièmes, il y a ${{q}}$'
     ' fois $10$ dixièmes, et il en reste ${{t}}$.',
     '$$' + frac('{{a}}', '10') + ' = ' + frac('{{eval:10*q}}', '10') + ' + '
     + frac('{{t}}', '10') + ' = ' + col('{{q}}') + ' + ' + frac(col('{{t}}'), '10') + '$$'])

DECOMPOSER_CENTIEMES = variation(
    'Écris cette fraction comme la somme d\'un nombre entier et de fractions dont le'
    ' numérateur est inférieur à $10$.\n\n$$' + frac('{{a}}', '100')
    + ' = ? + \\frac{?}{10} + \\frac{?}{100}$$',
    [var('q', '1..9'), var('t', '1..9'), var('u', '1..9'), var('a', 'eval:100*q+10*t+u')],
    ['{{q}}', '{{t}}', '{{u}}'],
    ['**Une unité, c\'est $' + frac('100', '100') + '$ ; un dixième, c\'est $'
     + frac('10', '100') + '$.**',
     '$$' + frac('{{a}}', '100') + ' = ' + frac('{{eval:100*q}}', '100') + ' + '
     + frac('{{eval:10*t}}', '100') + ' + ' + frac('{{u}}', '100') + '$$',
     '$$' + frac('{{a}}', '100') + ' = ' + col('{{q}}') + ' + ' + frac(col('{{t}}'), '10')
     + ' + ' + frac(col('{{u}}'), '100') + '$$'])

EX_47 = {'q': 4, 't': 7, 'a': 47}
EX_347 = {'q': 3, 't': 4, 'u': 7, 'a': 347}
MODELES.append(modele(
    '02-decomposer-une-fraction-decimale', 'Décomposer une fraction décimale',
    'Écrire une fraction décimale supérieure à 1 comme un entier plus des fractions décimales de'
    ' numérateur inférieur à 10 (347/100 = 3 + 4/10 + 7/100)',
    'Apprivoiser', 'Décomposition', 6, [DECOMPOSER_DIXIEMES, DECOMPOSER_CENTIEMES],
    [spec('47/10 = 4 + 7/10', 0, EX_47, ['4', '7'], 'correct'),
     spec('Erreur : 7 et 4 échangés', 0, EX_47, ['7', '4'], 'incorrect'),
     spec('Erreur : 3 + 17/10 (numérateur pas inférieur à 10)', 0, EX_47, ['3', '17'],
          'incorrect'),
     spec('347/100 = 3 + 4/10 + 7/100', 1, EX_347, ['3', '4', '7'], 'correct'),
     spec('Erreur : 3 + 7/10 + 4/100 (rangs échangés)', 1, EX_347, ['3', '7', '4'],
          'incorrect'),
     spec('Erreur : 34 + 0/10 + 7/100', 1, EX_347, ['34', '0', '7'], 'incorrect')]))


# --- 3. CM1-028 : comparer deux fractions décimales ----------------------------------------
# Un dixième contre un centième ; s = 0 (une fois sur cinq) donne l'égalité (7/10 et 70/100) ;
# o échange les côtés. r = indice du signe juste dans < = >.


def comparer(petits):
    if petits:
        bornes = [var('a', '1..9'), var('w', '1..99')]
    else:
        bornes = [var('a', '11..99'), var('w', '101..999')]
    variables = bornes + [
        var('s', '0..4'), var('h', 'eval:{{if:s==0|10*a|w}}'), var('o', '0..1'),
        var('gn', 'eval:{{if:o==0|a|h}}'), var('gd', 'eval:{{if:o==0|10|100}}'),
        var('dn', 'eval:{{if:o==0|h|a}}'), var('dd', 'eval:{{if:o==0|100|10}}'),
        var('r', 'eval:sign(gn*100/gd-dn*100/dd)+1')]
    return variation(
        'Complète avec le symbole qui convient.\n\n$$' + frac('{{gn}}', '{{gd}}') + ' \\ldots '
        + frac('{{dn}}', '{{dd}}') + '$$' + choix(['$$<$$', '$$=$$', '$$>$$'], melanger=False),
        variables, ['{{r}}'],
        ['**Même dénominateur d\'abord.** Un dixième, c\'est dix centièmes : $'
         + frac('{{a}}', '10') + ' = ' + frac('{{eval:10*a}}', '100') + '$.',
         'On compare ${{eval:10*a}}$ centièmes et ${{h}}$ centièmes.',
         '$$' + frac('{{gn}}', '{{gd}}') + ' ' + col('{{if:r==0|<|{{if:r==1|=|>}}}}') + ' '
         + frac('{{dn}}', '{{dd}}') + '$$'],
        ['s==0 or h!=10*a'])


EX_CMP = {'a': 7, 'w': 65, 's': 1, 'h': 65, 'o': 0, 'gn': 7, 'gd': 10, 'dn': 65, 'dd': 100,
          'r': 2}
EX_EGAL = {'a': 7, 'w': 3, 's': 0, 'h': 70, 'o': 1, 'gn': 70, 'gd': 100, 'dn': 7, 'dd': 10,
           'r': 1}
EX_GRANDS = {'a': 67, 'w': 607, 's': 2, 'h': 607, 'o': 0, 'gn': 67, 'gd': 10, 'dn': 607,
             'dd': 100, 'r': 2}
MODELES.append(modele(
    '03-comparer-deux-fractions-decimales', 'Comparer deux fractions décimales',
    'Comparer un nombre de dixièmes et un nombre de centièmes avec <, = ou > (7/10 … 65/100 ;'
    ' 67/10 … 607/100)',
    'Apprivoiser', 'Comparer', 14, [comparer(True), comparer(False)],
    [spec('7/10 > 65/100', 0, EX_CMP, '2', 'correct'),
     spec('Erreur : 7/10 < 65/100 (numérateurs comparés)', 0, EX_CMP, '0', 'incorrect'),
     spec('70/100 = 7/10', 0, EX_EGAL, '1', 'correct'),
     spec('Erreur : 70/100 > 7/10', 0, EX_EGAL, '2', 'incorrect'),
     spec('67/10 > 607/100', 1, EX_GRANDS, '2', 'correct'),
     spec('Erreur : 67/10 < 607/100', 1, EX_GRANDS, '0', 'incorrect')]))


# --- 4. CM1-029 : ranger des fractions décimales -------------------------------------------
# Construites dans l'ordre : a/10 < k < b/100 < c/10 < m (= k + 1), comme 9/10 ; 120/100 ;
# 14/10 ; 2 : le centième au grand numérateur est plus petit qu'un dixième.

RANGER_VARS = [var('m', '2..5'), var('k', 'eval:m-1'),
               var('a', '{{eval:10*k-9}}..{{eval:10*k-1}}'),
               var('c', '{{eval:10*k+2}}..{{eval:10*m-1}}'),
               var('b', '{{eval:100*k+1}}..{{eval:10*c-1}}')]


def etiquettes(signe, ordre):
    formes = {'a': '$' + frac('{{a}}', '10') + '$', 'b': '$' + frac('{{b}}', '100') + '$',
              'c': '$' + frac('{{c}}', '10') + '$', 'm': '${{m}}$'}
    return ('\n\n```ranger\nsigne: ' + signe + '\n'
            + ''.join('- ' + formes[x] + '\n' for x in ordre) + '```')


METHODE_RANGER = ('**Tout en centièmes.** $' + frac('{{a}}', '10') + ' = '
                  + frac('{{eval:10*a}}', '100') + '$, ${{m}} = ' + frac('{{eval:100*m}}', '100')
                  + '$, $' + frac('{{c}}', '10') + ' = ' + frac('{{eval:10*c}}', '100')
                  + '$ : on compare les numérateurs ${{eval:10*a}}$, ${{b}}$, ${{eval:10*c}}$ et'
                  ' ${{eval:100*m}}$.')
CROISSANT = ('$$' + frac('{{a}}', '10') + ' < ' + frac('{{b}}', '100') + ' < '
             + frac('{{c}}', '10') + ' < {{m}}$$')
DECROISSANT = ('$${{m}} > ' + frac('{{c}}', '10') + ' > ' + frac('{{b}}', '100') + ' > '
               + frac('{{a}}', '10') + '$$')

RANGER = [
    variation('Range ces nombres du plus petit au plus grand.'
              + etiquettes('<', ['a', 'b', 'c', 'm']), RANGER_VARS, None,
              [METHODE_RANGER, CROISSANT]),
    variation('Range ces nombres du plus grand au plus petit.'
              + etiquettes('>', ['m', 'c', 'b', 'a']), RANGER_VARS, None,
              [METHODE_RANGER, DECROISSANT]),
]

EX_RANGER = {'m': 2, 'k': 1, 'a': 9, 'c': 14, 'b': 120}
MODELES.append(modele(
    '04-ranger-des-fractions-decimales', 'Ranger des fractions décimales',
    'Ranger dans l\'ordre croissant ou décroissant quatre nombres : un entier, des dixièmes et des'
    ' centièmes (9/10 ; 120/100 ; 14/10 ; 2)',
    'Apprivoiser', 'Ordonner', 3, RANGER,
    # Réponses = positions AFFICHÉES des étiquettes (mélange des specs, graine 0), relevées avec
    # le générateur
    # affichées : croissant 120/100, 14/10, 2, 9/10 ; décroissant 14/10, 120/100, 9/10, 2
    [spec('croissant : 9/10 < 120/100 < 14/10 < 2', 0, EX_RANGER, ['3', '0', '1', '2'],
          'correct'),
     spec('Erreur : rangés par numérateurs (2 ; 9/10 ; 14/10 ; 120/100)', 0, EX_RANGER,
          ['2', '3', '1', '0'], 'incorrect'),
     spec('Erreur : ordre décroissant', 0, EX_RANGER, ['2', '1', '0', '3'], 'incorrect'),
     spec('décroissant : 2 > 14/10 > 120/100 > 9/10', 1, EX_RANGER, ['3', '0', '1', '2'],
          'correct'),
     spec('Erreur : ordre croissant', 1, EX_RANGER, ['2', '1', '0', '3'], 'incorrect')],
    delay=60))


# --- 5 et 6. CM1-152, CM1-153 : encadrer, intercaler ---------------------------------------

ENCADRER_DIXIEMES = variation(
    'Encadre cette fraction par deux nombres entiers qui se suivent.\n\n$$? < '
    + frac('{{a}}', '10') + ' < ?$$',
    [var('q', '0..9'), var('r', '1..9'), var('a', 'eval:10*q+r')],
    ['{{q}}', '{{eval:q+1}}'],
    ['**Combien d\'unités ?** Une unité, c\'est $' + frac('10', '10') + '$ : ${{a}} = {{q}}'
     ' \\times 10 + {{r}}$.',
     '$$' + frac('{{a}}', '10') + ' = {{q}} + ' + frac('{{r}}', '10') + '$$',
     '$' + frac('{{r}}', '10') + '$ est entre $0$ et $1$, donc $' + col('{{q}}') + ' < '
     + frac('{{a}}', '10') + ' < ' + col('{{eval:q+1}}') + '$.'])

ENCADRER_CENTIEMES = variation(
    'Encadre cette fraction par deux nombres entiers qui se suivent.\n\n$$? < '
    + frac('{{a}}', '100') + ' < ?$$',
    [var('q', '0..9'), var('r', '1..99'), var('a', 'eval:100*q+r')],
    ['{{q}}', '{{eval:q+1}}'],
    ['**Combien d\'unités ?** Une unité, c\'est $' + frac('100', '100') + '$ : ${{a}} = {{q}}'
     ' \\times 100 + {{r}}$.',
     '$$' + frac('{{a}}', '100') + ' = {{q}} + ' + frac('{{r}}', '100') + '$$',
     '$' + frac('{{r}}', '100') + '$ est entre $0$ et $1$, donc $' + col('{{q}}') + ' < '
     + frac('{{a}}', '100') + ' < ' + col('{{eval:q+1}}') + '$.'])

EX_ENC10 = {'q': 4, 'r': 7, 'a': 47}
EX_ENC100 = {'q': 2, 'r': 37, 'a': 237}
MODELES.append(modele(
    '05-encadrer-une-fraction-decimale', 'Encadrer une fraction décimale par deux entiers',
    'Encadrer une fraction décimale par deux entiers consécutifs (2 < 237/100 < 3) ; dénominateur'
    ' 10 ou 100',
    'Apprivoiser', 'Encadrer', 3, [ENCADRER_DIXIEMES, ENCADRER_CENTIEMES],
    [spec('4 < 47/10 < 5', 0, EX_ENC10, ['4', '5'], 'correct'),
     spec('Erreur : 47 et 48 (numérateur lu)', 0, EX_ENC10, ['47', '48'], 'incorrect'),
     spec('2 < 237/100 < 3', 1, EX_ENC100, ['2', '3'], 'correct'),
     spec('Erreur : 23 et 24 (dixièmes lus)', 1, EX_ENC100, ['23', '24'], 'incorrect'),
     spec('Erreur : 3 et 4', 1, EX_ENC100, ['3', '4'], 'incorrect'),
     spec('0 < 7/100 < 1', 1, {'q': 0, 'r': 7, 'a': 7}, ['0', '1'], 'correct')]))

INTERCALER = variation(
    'Écris une fraction décimale comprise entre ces deux fractions.\n\n$$'
    + frac('{{a}}', '10') + ' < ? < ' + frac('{{eval:a+1}}', '10') + '$$',
    [var('a', '1..49')],
    [{'expectedAnswer': '\\frac{{{eval:10*a+5}}}{100}', 'requiredForm': 'fraction',
      'rulesSuffice': True,
      'validationRules': [{'type': 'range', 'min': '{{eval:a/10;d}}',
                           'max': '{{eval:(a+1)/10;d}}', 'inclusive': False}]}],
    ['**En centièmes.** $' + frac('{{a}}', '10') + ' = ' + frac('{{eval:10*a}}', '100')
     + '$ et $' + frac('{{eval:a+1}}', '10') + ' = ' + frac('{{eval:10*a+10}}', '100') + '$.',
     'Entre les deux, il y a neuf centièmes : $' + frac('{{eval:10*a+1}}', '100') + '$, $'
     + frac('{{eval:10*a+2}}', '100') + '$… jusqu\'à $' + frac('{{eval:10*a+9}}', '100')
     + '$. Par exemple :',
     '$$' + frac('{{a}}', '10') + ' < ' + col(frac('{{eval:10*a+5}}', '100')) + ' < '
     + frac('{{eval:a+1}}', '10') + '$$'])

MODELES.append(modele(
    '06-intercaler-une-fraction-decimale', 'Intercaler une fraction décimale',
    'Écrire une fraction comprise entre deux dixièmes consécutifs (14/10 < 145/100 < 15/10) ;'
    ' toute fraction strictement entre les deux est juste',
    'Apprivoiser', 'Encadrer', 4, [INTERCALER],
    [spec('14/10 < 145/100 < 15/10', 0, {'a': 14}, '\\frac{145}{100}', 'correct'),
     spec('14/10 < 141/100 < 15/10', 0, {'a': 14}, '\\frac{141}{100}', 'correct'),
     spec('14/10 < 1450/1000 < 15/10', 0, {'a': 14}, '\\frac{1450}{1000}', 'correct'),
     spec('14/10 < 29/20 < 15/10 (pas décimale, juste)', 0, {'a': 14}, '\\frac{29}{20}',
          'correct'),
     spec('Erreur : 15/10 (borne)', 0, {'a': 14}, '\\frac{15}{10}', 'incorrect'),
     spec('Erreur : 145/10', 0, {'a': 14}, '\\frac{145}{10}', 'incorrect'),
     spec('Forme : 1,45 (écriture à virgule)', 0, {'a': 14}, '1.45', 'bad_form', ['form'])],
    delay=45))


# --- 7 et 8. CM1-151, CM1-025 : la demi-droite graduée -------------------------------------
# Dixièmes : de q à q + 1, dix intervalles, entiers étiquetés. Centièmes : morceau agrandi de
# t/10 à (t + 1)/10, dix intervalles, les deux bouts étiquetés en fractions (jamais 2,3).

DROITE_DIXIEMES_VARS = [var('q', '0..4'), var('r', '1..9'), var('n', 'eval:10*q+r')]
DROITE_CENTIEMES_VARS = [var('t', '1..49'), var('r', '1..9'), var('n', 'eval:10*t+r')]


def droite_dixiemes(ligne):
    return ('\n\n```line\nstart: {{q}}\nend: {{eval:q+1}}\nstep: 1/10\nmajor: 10\n' + ligne
            + '\n```')


def droite_centiemes(ligne):
    return ('\n\n```line\nstart: {{t}}/10\nend: {{eval:t+1}}/10\nstep: 1/100\nmajor: 10\n'
            'labels: {{t}}/10, {{eval:t+1}}/10\n' + ligne + '\n```')


UNITE_DIXIEMES = ('**L\'unité.** De ${{q}}$ à ${{eval:q+1}}$, l\'unité est partagée en $10$'
                  ' parts égales : chaque petit intervalle vaut $' + frac('1', '10') + '$.')
UNITE_CENTIEMES = ('**Le dixième.** De $' + frac('{{t}}', '10') + '$ à $'
                   + frac('{{eval:t+1}}', '10') + '$, il y a un dixième, partagé en $10$ parts'
                   ' égales : chaque petit intervalle vaut $' + frac('1', '100') + '$.')

REPERER = [
    variation(
        'Quel nombre repère le point $A$ ? Écris-le sous la forme d\'une fraction décimale.'
        + droite_dixiemes('points: A={{n}}/10') + '\n\n$$A : ?$$',
        DROITE_DIXIEMES_VARS, [fraction_exigee('\\frac{{{n}}}{10}')],
        [UNITE_DIXIEMES,
         '${{q}} = ' + frac('{{eval:10*q}}', '10') + '$ ; le point $A$ est ${{r}}$ petit'
         '{{if:r>1|s|}} intervalle{{if:r>1|s|}} plus loin : il repère $'
         + col(frac('{{n}}', '10')) + '$.']),
    variation(
        'Quel nombre repère le point $A$ ? Écris-le sous la forme d\'une fraction décimale.'
        + droite_centiemes('points: A={{n}}/100') + '\n\n$$A : ?$$',
        DROITE_CENTIEMES_VARS, [fraction_exigee('\\frac{{{n}}}{100}')],
        [UNITE_CENTIEMES,
         '$' + frac('{{t}}', '10') + ' = ' + frac('{{eval:10*t}}', '100') + '$ ; le point $A$'
         ' est ${{r}}$ petit{{if:r>1|s|}} intervalle{{if:r>1|s|}} plus loin : il repère $'
         + col(frac('{{n}}', '100')) + '$.'],
        ['mod(t,10)!=0']),
]

EX_REP10 = {'q': 2, 'r': 3, 'n': 23}
EX_REP100 = {'t': 23, 'r': 7, 'n': 237}
MODELES.append(modele(
    '07-reperer-par-une-fraction-decimale', 'Repérer un point par une fraction décimale',
    'Lire le nombre qui repère un point d\'une demi-droite graduée en dixièmes (A repère 23/10),'
    ' ou d\'un morceau de droite gradué en centièmes (A repère 237/100)',
    'Apprivoiser', 'Repérage', 5, REPERER,
    [spec('A repère 23/10', 0, EX_REP10, '\\frac{23}{10}', 'correct'),
     spec('A repère 230/100, même valeur', 0, EX_REP10, '\\frac{230}{100}', 'correct'),
     spec('Erreur : 3/10 (unités oubliées)', 0, EX_REP10, '\\frac{3}{10}', 'incorrect'),
     spec('Forme : 2,3 (écriture à virgule)', 0, EX_REP10, '2.3', 'bad_form', ['form']),
     spec('A repère 237/100', 1, EX_REP100, '\\frac{237}{100}', 'correct'),
     spec('Erreur : 7/100 (départ oublié)', 1, EX_REP100, '\\frac{7}{100}', 'incorrect'),
     spec('Erreur : 30/10 (dixième suivant)', 1, EX_REP100, '\\frac{30}{10}', 'incorrect'),
     spec('Erreur : 27/10 (centièmes lus comme des dixièmes)', 1, EX_REP100, '\\frac{27}{10}',
          'incorrect'),
     spec('Forme : 2,37 (écriture à virgule)', 1, EX_REP100, '2.37', 'bad_form', ['form'])],
    delay=45))

PLACER = [
    variation(
        'Place le nombre $' + frac('{{n}}', '10') + '$ sur la demi-droite graduée.'
        + droite_dixiemes('placer: {{n}}/10'),
        DROITE_DIXIEMES_VARS, None,
        [UNITE_DIXIEMES,
         '$' + frac('{{n}}', '10') + ' = {{q}} + ' + frac('{{r}}', '10') + '$ : on part de la'
         ' graduation ${{q}}$ et on avance de ${{r}}$ petit{{if:r>1|s|}}'
         ' intervalle{{if:r>1|s|}}.']),
    variation(
        'Place le nombre $' + frac('{{n}}', '100') + '$ sur la demi-droite graduée.'
        + droite_centiemes('placer: {{n}}/100'),
        DROITE_CENTIEMES_VARS, None,
        [UNITE_CENTIEMES,
         '$' + frac('{{n}}', '100') + ' = ' + frac('{{eval:10*t}}', '100') + ' + '
         + frac('{{r}}', '100') + '$ : on part de $' + frac('{{t}}', '10') + '$ et on avance de'
         ' ${{r}}$ petit{{if:r>1|s|}} intervalle{{if:r>1|s|}}.'],
        ['mod(t,10)!=0']),
]

MODELES.append(modele(
    '08-placer-une-fraction-decimale', 'Placer une fraction décimale sur une demi-droite graduée',
    'Placer une fraction décimale sur une demi-droite graduée en dixièmes (place 23/10), ou sur un'
    ' morceau de droite gradué en centièmes (place 237/100), en touchant la droite',
    'Apprivoiser', 'Repérage', 6, PLACER,
    # La réponse de la droite est écrite par `placerAnswer` : décimal à point (23/10 → 2.3)
    [spec('23/10 placé', 0, EX_REP10, '2.3', 'correct'),
     spec('Erreur : 3/10 (unités oubliées)', 0, EX_REP10, '0.3', 'incorrect'),
     spec('Erreur : 2,4', 0, EX_REP10, '2.4', 'incorrect'),
     spec('237/100 placé', 1, EX_REP100, '2.37', 'correct'),
     spec('Erreur : 2,33 (intervalles comptés depuis la fin)', 1, EX_REP100, '2.33', 'incorrect'),
     spec('Erreur : 2,4 (dixième suivant)', 1, EX_REP100, '2.4', 'incorrect')],
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
