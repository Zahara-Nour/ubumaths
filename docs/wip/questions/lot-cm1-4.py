"""Écrit les 8 modèles du lot 4 du CM1 (décimaux) dans scripts/questions/cm1-4/.

Phase 0 du 2026-11-01 (§ 12 du journal `docs/wip/questions-cm1-progress.md`), validée par David
(« go », § 12 bis) : 031, écriture à virgule exigée (motif `a:number` : 325/100 et 3 + 25/100
refusés) ; 156, un seul modèle « colorier » ; 157 et 032, modèles CM1 propres (10 intervalles) ;
160, toute réponse strictement entre les bornes est juste (règle `range`).
Bornes : `cycle3.json`, CM1 (au plus deux décimales ; zooms pour les centièmes ; 3,5 s'arrondit à
4 ; ranger jusqu'à trois nombres, l'un éventuellement en fraction décimale ; intercaler 1,9 < … < 2).
Un point par modèle ; le nœud et le tag sont posés par la migration de rangement, après le
`--publier`.

Décisions et pièges :
- patrons : `6-droite-ordre` (droites et ranger des décimaux, 6e), `6-nombres` (arrondir,
  intercaler), lots CM1 3b (lettres, choix) et 3c (```partage) ;
- nombres en lettres : orthographe rectifiée (traits d'union) ; parties entières sans 21, 31…
  (« vingt-et-une unités » : accord au féminin évité) ;
- choix en case « choix » (bloc ```choix, ADR 0033), le juste écrit en premier ;
- droites graduées : 10 intervalles, jamais plus (vise au doigt sur un téléphone) ;
- coloriage : 1,37 sur deux grilles = 137 rangs ; le test `answer-complexity-corpus` mesurait
  aussi les specs de coloriage (au plus 34 rangs) alors que la prod ne passe pas le coloriage par
  la garde : le test est aligné sur la prod dans la même PR ;
- niveaux : suite des niveaux de chaque catégorie (prod et lots écrits, relevés le 2026-11-01).

    python3 docs/wip/questions/lot-cm1-4.py scripts/questions/cm1-4
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


def modele(nom, title, description, subdomain, level, variations, specs, delay=30):
    # theme / domain / subdomain : anciennes colonnes, remplies pour create-questions ; le
    # rangement (nœud du point) est posé par la migration
    return nom, {'title': title, 'description': description, 'grades': ['CM1'],
                 'theme': 'Décimaux', 'domain': 'Apprivoiser', 'subdomain': subdomain,
                 'level': level, 'delay': delay, 'status': 'draft',
                 'options': OPTIONS, 'variations': variations, 'testSpecs': specs}


def var(nom, expression):
    return {'name': nom, 'expression': expression}


def variation(statement, variables, answers, steps, conditions=None):
    # Chaque `?` de l'énoncé est une case, dans l'ordre de `answers` ; `answers=None` : la case
    # vient d'un bloc (droite à placer, ```ranger, ```partage à colorier), sans `blanks[]`
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


def choix(lignes):
    return '\n\n```choix\n' + ''.join('- ' + l + '\n' for l in lignes) + '```'


def frac(n, d):
    return '\\frac{' + n + '}{' + d + '}'


def partage(*lignes):
    return '\n\n```partage\n' + ''.join(l + '\n' for l in lignes) + '```'


def rangs(n):
    return ', '.join(str(i) for i in range(1, n + 1))


MODELES = []

# --- Nombres en lettres (orthographe rectifiée, comme `lot-cm1-3b.py`) ---------------------

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
    """« une unité », « trois unités », « un dixième », « sept centièmes »."""
    if n == 1:
        return ('une ' if nom == 'unité' else 'un ') + nom
    return lettres(n) + ' ' + nom + 's'


# --- 1. CM1-031 : lire et écrire un nombre décimal -----------------------------------------
# Parties entières sans 21, 31… (accord au féminin) ; centièmes jamais multiples de 10 (3,30) ;
# 5 et 8 centièmes : le piège 4,05 / 4,5.

ENTIERS = [1, 2, 3, 4, 7, 8, 12, 15, 23, 36, 48, 57, 64, 75, 90]
CENTIEMES = [3, 5, 8, 12, 17, 25, 36, 44, 59, 63, 71, 82, 96]
ENTIERS_LIRE = list(range(1, 10))

SENS = ('**Les rangs après la virgule.** Le premier chiffre après la virgule compte les'
        ' **dixièmes**, le deuxième les **centièmes** : $1 = 10$ dixièmes $= 100$ centièmes.')

# k == 1 : « quatre et dix-sept centièmes » (sans le mot « unités », comme le BO)
ECRIRE_CENTIEMES = variation(
    'Écris en chiffres le nombre « **{{if:k==1|' + par('a', ENTIERS, lettres) + '|'
    + par('a', ENTIERS, lambda a: nombre_de(a, 'unité')) + '}} et '
    + par('c', CENTIEMES, lambda c: nombre_de(c, 'centième')) + '** ».\n\n$$?$$',
    [var('a', '|'.join(map(str, ENTIERS))), var('c', '|'.join(map(str, CENTIEMES))),
     var('k', '0..1'), var('x', 'eval:a+c/100;d')],
    [{'expectedAnswer': '{{x}}', 'requiredForm': VIRGULE_EXIGEE}],
    [SENS,
     '${{c}}$ centièmes, c\'est {{if:c<10|$0$ dixième et ${{c}}$ centièmes|'
     '${{eval:floor(c/10)}}$ dixièmes et ${{eval:mod(c,10)}}$ centièmes}} : on écrit'
     ' ${{if:c<10|0{{c}}|{{c}}}}$ après la virgule.',
     '$$' + col('{{x}}') + '$$'])

ECRIRE_RANGS = variation(
    'Écris en chiffres le nombre « **' + par('a', ENTIERS, lambda a: nombre_de(a, 'unité'))
    + '{{if:u==0| et |, }}' + par('t', range(1, 10), lambda t: nombre_de(t, 'dixième'))
    + '{{if:u==0|| et ' + par('u', range(1, 10), lambda u: nombre_de(u, 'centième')) + '}}'
    + '** ».\n\n$$?$$',
    [var('a', '|'.join(map(str, ENTIERS))), var('t', '1..9'), var('u', '0..9'),
     var('x', 'eval:a+t/10+u/100;d')],
    [{'expectedAnswer': '{{x}}', 'requiredForm': VIRGULE_EXIGEE}],
    [SENS,
     'Les unités avant la virgule, puis ${{t}}$ au rang des dixièmes{{if:u==0||, ${{u}}$ au'
     ' rang des centièmes}}.',
     '$$' + col('{{x}}') + '$$'])

BIEN_LU = (par('a', ENTIERS_LIRE, lambda a: nombre_de(a, 'unité')) + ' et '
           + par('c', CENTIEMES, lambda c: nombre_de(c, 'centième')))
LIRE = variation(
    'Comment lit-on le nombre ${{x}}$ ?'
    + choix([BIEN_LU,
             par('a', ENTIERS_LIRE, lambda a: nombre_de(a, 'unité')) + ' et '
             + par('c', CENTIEMES, lambda c: nombre_de(c, 'dixième')),
             # « trois-cent-vingt-cinq » : la virgule oubliée (c n'est jamais 0)
             par('a', ENTIERS_LIRE, lambda a: 'cent' if a == 1 else UNITES[a] + '-cent') + '-'
             + par('c', CENTIEMES, deux_chiffres),
             par('c', CENTIEMES, lambda c: nombre_de(c, 'unité')) + ' et '
             + par('a', ENTIERS_LIRE, lambda a: nombre_de(a, 'centième'))]),
    [var('a', '1..9'), var('c', '|'.join(map(str, CENTIEMES))), var('x', 'eval:a+c/100;d')],
    ['0'],
    [SENS,
     '${{x}}$ : ${{a}}$ avant la virgule, ${{if:c<10|0{{c}}|{{c}}}}$ après, sur deux rangs :'
     ' des centièmes. On lit **« ' + BIEN_LU + ' »**.'])

EX_325 = {'a': 3, 'c': 25, 'k': 0, 'x': '3.25'}
EX_405 = {'a': 4, 'c': 5, 'k': 1, 'x': '4.05'}
EX_RANGS = {'a': 4, 't': 1, 'u': 7, 'x': '4.17'}
EX_DIXIEMES = {'a': 2, 't': 7, 'u': 0, 'x': '2.7'}
EX_LIRE = {'a': 3, 'c': 25, 'x': '3.25'}
MODELES.append(modele(
    '01-lire-et-ecrire-un-nombre-decimal', 'Lire et écrire un nombre décimal',
    'Trois unités et vingt-cinq centièmes ↔ 3,25 : écrire avec une virgule un nombre donné en'
    ' lettres, le lire parmi quatre écritures ; au plus deux décimales',
    'Ecriture', 12, [ECRIRE_CENTIEMES, ECRIRE_RANGS, LIRE],
    [spec('trois unités et vingt-cinq centièmes : 3,25', 0, EX_325, '3,25', 'correct'),
     spec('Erreur : 3,025', 0, EX_325, '3,025', 'incorrect'),
     spec('Erreur : 325', 0, EX_325, '325', 'incorrect'),
     spec('Forme : 325/100 (fraction)', 0, EX_325, '\\frac{325}{100}', 'bad_form', ['form']),
     spec('Forme : 3 + 25/100', 0, EX_325, '3+\\frac{25}{100}', 'bad_form', ['form']),
     spec('quatre et cinq centièmes : 4,05', 0, EX_405, '4,05', 'correct'),
     spec('Erreur : 4,5 (cinq dixièmes)', 0, EX_405, '4,5', 'incorrect'),
     spec('quatre unités, un dixième et sept centièmes : 4,17', 1, EX_RANGS, '4,17', 'correct'),
     spec('Erreur : 4,71 (rangs échangés)', 1, EX_RANGS, '4,71', 'incorrect'),
     spec('deux unités et sept dixièmes : 2,7', 1, EX_DIXIEMES, '2,7', 'correct'),
     spec('Erreur : 2,07', 1, EX_DIXIEMES, '2,07', 'incorrect'),
     spec('3,25 : trois unités et vingt-cinq centièmes', 2, EX_LIRE, '0', 'correct'),
     spec('Erreur : vingt-cinq dixièmes', 2, EX_LIRE, '1', 'incorrect'),
     spec('Erreur : trois-cent-vingt-cinq', 2, EX_LIRE, '2', 'incorrect')]))


# --- 2. CM1-156 : colorier un nombre décimal -----------------------------------------------

COLORIE = 'Colorie ce qu\'il faut pour représenter le nombre ${{x}}$.'
COLORIER = [
    variation(
        COLORIE + ' La bande est l\'unité.'
        + partage('forme: bande 10', 'colorier: {{n}}/10'),
        [var('n', '1..9'), var('x', 'eval:n/10;d')], None,
        ['La bande est partagée en $10$ parts égales : une part, c\'est un dixième.',
         '${{x}}$, c\'est ${{n}}$ dixième{{if:n>1|s|}} : on colorie $' + col('{{n}}')
         + '$ part{{if:n>1|s|}}.']),
    variation(
        COLORIE + ' La grille est l\'unité.'
        + partage('forme: grille 10×10', 'colorier: {{n}}/100'),
        [var('n', '1..99'), var('x', 'eval:n/100;d')], None,
        ['La grille a $100$ cases : une case, c\'est un centième ; une ligne de $10$ cases,'
         ' un dixième.',
         '${{x}}$, c\'est ${{n}}$ centième{{if:n>1|s|}} : on colorie $' + col('{{n}}')
         + '$ case{{if:n>1|s|}}'
         + '{{if:n>=10| : ${{eval:floor(n/10)}}$ ligne{{if:n>=20|s|}} de $10$, puis'
           ' ${{eval:mod(n,10)}}$ case{{if:mod(n,10)>1|s|}}|}}.'],
        ['mod(n,10)!=0']),
    variation(
        COLORIE + ' Chaque bande est une unité.'
        + partage('forme: bande 10', 'unites: 2', 'colorier: {{eval:10+n}}/10'),
        [var('n', '1..9'), var('x', 'eval:1+n/10;d')], None,
        ['Chaque bande est une unité, partagée en $10$ parts égales : une part, c\'est un'
         ' dixième.',
         '${{x}} = 1 + ' + frac('{{n}}', '10') + '$ : on colorie $' + col('1') + '$ bande'
         ' entière, puis $' + col('{{n}}') + '$ part{{if:n>1|s|}} de la deuxième.']),
    variation(
        COLORIE + ' Chaque grille est une unité.'
        + partage('forme: grille 10×10', 'unites: 2', 'colorier: {{eval:100+n}}/100'),
        [var('n', '1..99'), var('x', 'eval:1+n/100;d')], None,
        ['Chaque grille est une unité de $100$ cases : une case, c\'est un centième.',
         '${{x}} = 1 + ' + frac('{{n}}', '100') + '$ : on colorie $' + col('1') + '$ grille'
         ' entière, puis $' + col('{{n}}') + '$ case{{if:n>1|s|}} de la deuxième.'],
        ['mod(n,10)!=0']),
]

MODELES.append(modele(
    '02-colorier-un-nombre-decimal', 'Colorier un nombre décimal',
    'Représenter un nombre décimal en coloriant une bande de 10 ou une grille 10 × 10 : 0,7 ;'
    ' 0,37 ; 1,3 ; 1,37 (une unité entière, puis une partie de la deuxième)',
    'Partage', 1, COLORIER,
    # 1,37 = 137 rangs : le test du corpus ne mesure plus les specs de coloriage (comme la prod,
    # qui juge le coloriage avant la garde de complexité)
    [spec('0,7 : 7 parts', 0, {'n': 7, 'x': '0.7'}, rangs(7), 'correct'),
     spec('Erreur : 3 parts', 0, {'n': 7, 'x': '0.7'}, rangs(3), 'incorrect'),
     spec('0,23 : 23 cases', 1, {'n': 23, 'x': '0.23'}, rangs(23), 'correct'),
     spec('Erreur : 2 cases (dixièmes lus comme des centièmes)', 1, {'n': 23, 'x': '0.23'},
          rangs(2), 'incorrect'),
     spec('1,3 : une bande et 3 parts', 2, {'n': 3, 'x': '1.3'}, rangs(13), 'correct'),
     spec('Erreur : 3 parts (unité oubliée)', 2, {'n': 3, 'x': '1.3'}, rangs(3), 'incorrect'),
     spec('1,37 : une grille et 37 cases', 3, {'n': 37, 'x': '1.37'}, rangs(137), 'correct'),
     spec('Erreur : 37 cases (unité oubliée)', 3, {'n': 37, 'x': '1.37'}, rangs(37),
          'incorrect')],
    delay=90))


# --- 3 et 4. CM1-157, CM1-032 : la demi-droite graduée -------------------------------------
# Dixièmes : de q à q + 1, dix intervalles, entiers étiquetés. Centièmes : morceau agrandi de
# a,b à a,(b+1), dix intervalles, les deux bouts étiquetés (339,1 à 339,2 pour 339,16).

DIXIEMES_VARS = [var('q', '0..20'), var('k', '1..9'), var('x', 'eval:q+k/10;d')]
CENTIEMES_VARS = [var('a', '1..999'), var('b', '0..9'), var('k', '1..9'),
                  var('lo', 'eval:a+b/10;d'), var('hi', 'eval:a+(b+1)/10;d'),
                  var('x', 'eval:a+b/10+k/100;d')]


def droite_dixiemes(ligne):
    return ('\n\n```line\nstart: {{q}}\nend: {{eval:q+1}}\nstep: 0.1\nmajor: 10\n' + ligne
            + '\n```')


def droite_centiemes(ligne):
    return ('\n\n```line\nstart: {{lo}}\nend: {{hi}}\nstep: 0.01\nmajor: 10\n'
            'labels: {{lo}}, {{hi}}\n' + ligne + '\n```')


UNITE_DIXIEMES = ('**Ce que vaut un petit intervalle.** De ${{q}}$ à ${{eval:q+1}}$, l\'unité'
                  ' est partagée en $10$ : chaque petit intervalle vaut $0.1$.')
UNITE_CENTIEMES = ('**Ce que vaut un petit intervalle.** De ${{lo}}$ à ${{hi}}$, il y a un'
                   ' dixième, partagé en $10$ : chaque petit intervalle vaut $0.01$.')

REPERER = [
    variation(
        'Quel nombre repère le point $A$ ?' + droite_dixiemes('points: A={{x}}')
        + '\n\n$$A : ?$$',
        DIXIEMES_VARS, ['{{x}}'],
        [UNITE_DIXIEMES,
         '$A$ est ${{k}}$ petit{{if:k>1|s|}} intervalle{{if:k>1|s|}} après ${{q}}$ : ${{q}} +'
         ' {{k}} \\times 0.1 = ' + col('{{x}}') + '$.']),
    variation(
        'Quel nombre repère le point $A$ ?' + droite_centiemes('points: A={{x}}')
        + '\n\n$$A : ?$$',
        CENTIEMES_VARS, ['{{x}}'],
        [UNITE_CENTIEMES,
         '$A$ est ${{k}}$ petit{{if:k>1|s|}} intervalle{{if:k>1|s|}} après ${{lo}}$ : ${{lo}} +'
         ' {{k}} \\times 0.01 = ' + col('{{x}}') + '$.']),
]

EX_D = {'q': 2, 'k': 8, 'x': '2.8'}
EX_C = {'a': 2, 'b': 3, 'k': 7, 'lo': '2.3', 'hi': '2.4', 'x': '2.37'}
EX_339 = {'a': 339, 'b': 1, 'k': 6, 'lo': '339.1', 'hi': '339.2', 'x': '339.16'}
MODELES.append(modele(
    '03-reperer-un-nombre-decimal', 'Repérer un point par un nombre décimal',
    'Lire le nombre décimal qui repère un point d\'une demi-droite graduée en dixièmes (2,8), ou'
    ' d\'un morceau agrandi gradué en centièmes (2,37 ; 339,16)',
    'Repérage', 3, REPERER,
    [spec('A repère 2,8', 0, EX_D, '2,8', 'correct'),
     spec('Erreur : 0,8 (unités oubliées)', 0, EX_D, '0,8', 'incorrect'),
     spec('Erreur : 2,08', 0, EX_D, '2,08', 'incorrect'),
     spec('A repère 2,37', 1, EX_C, '2,37', 'correct'),
     spec('Erreur : 2,7 (départ oublié)', 1, EX_C, '2,7', 'incorrect'),
     spec('Erreur : 2,307', 1, EX_C, '2,307', 'incorrect'),
     spec('Erreur : 2,4 (dixième suivant)', 1, EX_C, '2,4', 'incorrect'),
     spec('A repère 339,16', 1, EX_339, '339,16', 'correct')],
    delay=45))

PLACER = [
    variation(
        'Place le nombre ${{x}}$ sur la demi-droite graduée.' + droite_dixiemes('placer: {{x}}'),
        DIXIEMES_VARS, None,
        [UNITE_DIXIEMES,
         '${{x}} = {{q}} + {{k}} \\times 0.1$ : on part de ${{q}}$ et on avance de ${{k}}$'
         ' petit{{if:k>1|s|}} intervalle{{if:k>1|s|}}.']),
    variation(
        'Place le nombre ${{x}}$ sur la demi-droite graduée.'
        + droite_centiemes('placer: {{x}}'),
        CENTIEMES_VARS, None,
        [UNITE_CENTIEMES,
         '${{x}} = {{lo}} + {{k}} \\times 0.01$ : on part de ${{lo}}$ et on avance de ${{k}}$'
         ' petit{{if:k>1|s|}} intervalle{{if:k>1|s|}}.']),
]

MODELES.append(modele(
    '04-placer-un-nombre-decimal', 'Placer un nombre décimal sur une demi-droite graduée',
    'Placer un nombre décimal sur une demi-droite graduée en dixièmes (2,8), ou sur un morceau'
    ' agrandi gradué en centièmes (339,16), en touchant la droite',
    'Repérage', 4, PLACER,
    # La réponse de la droite est écrite par `placerAnswer` : décimal à point
    [spec('2,8 placé', 0, EX_D, '2.8', 'correct'),
     spec('Erreur : 2,2 (intervalles comptés depuis la fin)', 0, EX_D, '2.2', 'incorrect'),
     spec('Erreur : 2,7', 0, EX_D, '2.7', 'incorrect'),
     spec('339,16 placé', 1, EX_339, '339.16', 'correct'),
     spec('Erreur : 339,14 (intervalles comptés depuis la fin)', 1, EX_339, '339.14',
          'incorrect'),
     spec('Erreur : 339,2 (dixième suivant)', 1, EX_339, '339.2', 'incorrect')],
    delay=45))


# --- 5. CM1-033 : partie entière -----------------------------------------------------------

ENTIERE = ('**La partie entière**, c\'est le nombre d\'unités entières : ce qui est écrit avant'
           ' la virgule.')
PARTIE_ENTIERE = [
    variation(
        'Quelle est la partie entière de ${{x}}$ ?\n\n$$?$$',
        [var('a', '0..99'), var('t', '1..9'), var('x', 'eval:a+t/10;d')], ['{{a}}'],
        [ENTIERE, '${{x}} = ' + col('{{a}}') + ' + 0.{{t}}$']),
    variation(
        'Quelle est la partie entière de ${{x}}$ ?\n\n$$?$$',
        [var('a', '100..999'), var('D', '1..99'), var('x', 'eval:a+D/100;d')], ['{{a}}'],
        [ENTIERE, '${{x}} = ' + col('{{a}}') + ' + {{eval:D/100;d}}$'],
        ['mod(D,10)!=0']),
]

MODELES.append(modele(
    '05-partie-entiere-d-un-decimal', 'Donner la partie entière d\'un nombre décimal',
    'Donner la partie entière d\'un nombre décimal à une ou deux décimales (3,7 → 3 ;'
    ' 135,78 → 135)',
    'Arrondir', 4, PARTIE_ENTIERE,
    [spec('3,7 → 3', 0, {'a': 3, 't': 7, 'x': '3.7'}, '3', 'correct'),
     spec('Erreur : 4 (arrondi)', 0, {'a': 3, 't': 7, 'x': '3.7'}, '4', 'incorrect'),
     spec('Erreur : 7 (chiffre des dixièmes)', 0, {'a': 3, 't': 7, 'x': '3.7'}, '7',
          'incorrect'),
     spec('0,4 → 0', 0, {'a': 0, 't': 4, 'x': '0.4'}, '0', 'correct'),
     spec('135,78 → 135', 1, {'a': 135, 'D': 78, 'x': '135.78'}, '135', 'correct'),
     spec('Erreur : 136 (arrondi)', 1, {'a': 135, 'D': 78, 'x': '135.78'}, '136', 'incorrect'),
     spec('Erreur : 78', 1, {'a': 135, 'D': 78, 'x': '135.78'}, '78', 'incorrect')]))


# --- 6. CM1-158 : arrondir à l'unité -------------------------------------------------------

REGLE = ('**Arrondir à l\'unité**, c\'est donner l\'entier le plus proche. On regarde le chiffre'
         ' des dixièmes : $5$ ou plus, on prend l\'entier du dessus ; moins de $5$, on garde la'
         ' partie entière.')
ARRONDIR = [
    variation(
        'Donne l\'arrondi à l\'unité de ${{x}}$.\n\n$${{x}} \\approx ?$$',
        [var('a', '1..99'), var('t', '1..9'), var('x', 'eval:a+t/10;d'),
         var('v', 'eval:a+floor(t/5)')], ['{{v}}'],
        [REGLE,
         'Le chiffre des dixièmes est $' + col('{{t}}', 1) + '$ : {{if:t>=5|$5$ ou plus, on'
         ' prend l\'entier du dessus|moins de $5$, on garde la partie entière}}.',
         '$${{x}} \\approx ' + col('{{v}}') + '$$']),
    variation(
        'Donne l\'arrondi à l\'unité de ${{x}}$.\n\n$${{x}} \\approx ?$$',
        [var('a', '1..99'), var('D', '1..99'), var('x', 'eval:a+D/100;d'),
         var('h', 'eval:floor(D/10)'), var('v', 'eval:a+floor(D/50)')], ['{{v}}'],
        [REGLE,
         'Le chiffre des dixièmes est $' + col('{{h}}', 1) + '$ (les centièmes ne comptent'
         ' pas) : {{if:h>=5|$5$ ou plus, on prend l\'entier du dessus|moins de $5$, on garde'
         ' la partie entière}}.',
         '$${{x}} \\approx ' + col('{{v}}') + '$$'],
        ['mod(D,10)!=0']),
]

EX_37 = {'a': 3, 't': 7, 'x': '3.7', 'v': 4}
EX_35 = {'a': 3, 't': 5, 'x': '3.5', 'v': 4}
EX_32 = {'a': 3, 't': 2, 'x': '3.2', 'v': 3}
EX_578 = {'a': 5, 'D': 78, 'x': '5.78', 'h': 7, 'v': 6}
EX_549 = {'a': 5, 'D': 49, 'x': '5.49', 'h': 4, 'v': 5}
MODELES.append(modele(
    '06-arrondir-un-decimal-a-l-unite', 'Arrondir un nombre décimal à l\'unité',
    'Donner l\'arrondi à l\'unité d\'un nombre décimal à une ou deux décimales (3,7 → 4 ;'
    ' 3,5 → 4 ; 5,49 → 5)',
    'Arrondir', 5, ARRONDIR,
    [spec('3,7 → 4', 0, EX_37, '4', 'correct'),
     spec('Erreur : 3 (partie entière)', 0, EX_37, '3', 'incorrect'),
     spec('3,5 → 4', 0, EX_35, '4', 'correct'),
     spec('Erreur : 3 pour 3,5', 0, EX_35, '3', 'incorrect'),
     spec('3,2 → 3', 0, EX_32, '3', 'correct'),
     spec('5,78 → 6', 1, EX_578, '6', 'correct'),
     spec('Erreur : 5,8 (arrondi au dixième)', 1, EX_578, '5,8', 'incorrect'),
     spec('5,49 → 5', 1, EX_549, '5', 'correct'),
     spec('Erreur : 6 pour 5,49 (centièmes regardés)', 1, EX_549, '6', 'incorrect')]))


# --- 7. CM1-159 : ranger des nombres décimaux ----------------------------------------------
# Construits dans l'ordre : a,0d < a,pq < a,c (2,09 < 2,12 < 2,6) : le nombre au plus de
# chiffres n'est pas le plus grand, et 09 centièmes ne dépassent pas 6 dixièmes.

RANGER_VARS = [var('a', '1..9'), var('d', '1..9'), var('p', '1..5'), var('q', '1..9'),
               var('c', '{{eval:p+1}}..9'), var('x1', 'eval:a+d/100;d'),
               var('x2', 'eval:a+p/10+q/100;d'), var('x3', 'eval:a+c/10;d')]


def etiquettes(signe, ordre, fraction=False):
    formes = {'x1': ('$' + frac('{{eval:100*a+d}}', '100') + '$') if fraction else '${{x1}}$',
              'x2': '${{x2}}$', 'x3': '${{x3}}$'}
    return ('\n\n```ranger\nsigne: ' + signe + '\n'
            + ''.join('- ' + formes[x] + '\n' for x in ordre) + '```')


METHODE = ('**Comparer des décimaux.** Même partie entière ${{a}}$ : on compare les dixièmes,'
           ' puis les centièmes. Le nombre de chiffres après la virgule ne compte pas.')
DETAIL = ('Dixièmes : $0$ pour ${{x1}}$, ${{p}}$ pour ${{x2}}$, ${{c}}$ pour ${{x3}}$.')
CROISSANT = '$$' + col('{{x1}} < {{x2}} < {{x3}}') + '$$'
DECROISSANT = '$$' + col('{{x3}} > {{x2}} > {{x1}}') + '$$'

RANGER = [
    variation('Range ces nombres du plus petit au plus grand.'
              + etiquettes('<', ['x1', 'x2', 'x3']), RANGER_VARS, None,
              [METHODE, DETAIL, CROISSANT]),
    variation('Range ces nombres du plus grand au plus petit.'
              + etiquettes('>', ['x3', 'x2', 'x1']), RANGER_VARS, None,
              [METHODE, DETAIL, DECROISSANT]),
    variation('Range ces nombres du plus petit au plus grand.'
              + etiquettes('<', ['x1', 'x2', 'x3'], fraction=True), RANGER_VARS, None,
              ['**Tout à virgule.** $' + frac('{{eval:100*a+d}}', '100') + ' = {{x1}}$.',
               METHODE, DETAIL,
               '$$' + col(frac('{{eval:100*a+d}}', '100') + ' < {{x2}} < {{x3}}') + '$$']),
]

EX_RANGER = {'a': 2, 'd': 9, 'p': 1, 'q': 2, 'c': 6, 'x1': '2.09', 'x2': '2.12', 'x3': '2.6'}
MODELES.append(modele(
    '07-ranger-des-nombres-decimaux', 'Ranger des nombres décimaux',
    'Ranger dans l\'ordre croissant ou décroissant trois nombres décimaux de même partie entière'
    ' (2,09 ; 2,12 ; 2,6), l\'un parfois en fraction décimale (209/100)',
    'Comparer', 5, RANGER,
    # Réponses = positions AFFICHÉES des étiquettes (mélange des specs), relevées avec le
    # générateur (generateInstanceWithFixedVariables) ; affichées : croissant 2,12 ; 2,6 ; 2,09 —
    # décroissant 2,12 ; 2,09 ; 2,6 — fraction 2,12 ; 2,6 ; 209/100
    [spec('croissant : 2,09 < 2,12 < 2,6', 0, EX_RANGER, ['2', '0', '1'], 'correct'),
     spec('Erreur : 2,6 < 2,09 < 2,12 (après la virgule lu comme un entier)', 0, EX_RANGER,
          ['1', '2', '0'], 'incorrect'),
     spec('Erreur : ordre décroissant', 0, EX_RANGER, ['1', '0', '2'], 'incorrect'),
     spec('décroissant : 2,6 > 2,12 > 2,09', 1, EX_RANGER, ['2', '0', '1'], 'correct'),
     spec('Erreur : 2,12 > 2,09 > 2,6 (après la virgule lu comme un entier)', 1, EX_RANGER,
          ['0', '1', '2'], 'incorrect'),
     spec('croissant, 209/100 < 2,12 < 2,6', 2, EX_RANGER, ['2', '0', '1'], 'correct'),
     spec('Erreur : 209/100 le plus grand (numérateur lu)', 2, EX_RANGER, ['0', '1', '2'],
          'incorrect')],
    delay=60))


# --- 8. CM1-160 : intercaler un nombre décimal ---------------------------------------------

INTERCALER_VARS = [var('a', '0..20'), var('b', '0..8'), var('lo', 'eval:a+b/10;d'),
                   var('hi', 'eval:a+(b+1)/10;d')]
INTERCALER_ENTIER_VARS = [var('a', '0..20'), var('lo', 'eval:a+0.9;d'), var('hi', 'eval:a+1')]
METHODE_INTERCALER = ('**Intercaler.** On écrit les deux nombres avec un chiffre de plus après la'
                      ' virgule, en centièmes : il apparaît de la place entre eux.')


def intercaler(variables, attendue, detail):
    return variation(
        'Écris un nombre décimal compris entre ${{lo}}$ et ${{hi}}$.\n\n$${{lo}} < ? < {{hi}}$$',
        variables,
        [{'expectedAnswer': attendue, 'rulesSuffice': True,
          'validationRules': [{'type': 'range', 'min': '{{lo}}', 'max': '{{hi}}',
                               'inclusive': False}]}],
        [METHODE_INTERCALER, detail])


INTERCALER = [
    intercaler(INTERCALER_VARS, '{{eval:a+b/10+0.05;d}}',
               '${{lo}} = {{a}}.{{b}}0$ et ${{hi}} = {{a}}.{{eval:b+1}}0$ : par exemple $'
               + col('{{eval:a+b/10+0.05;d}}') + '$ (mais aussi ${{eval:a+b/10+0.01;d}}$,'
               ' ${{eval:a+b/10+0.08;d}}$…).'),
    intercaler(INTERCALER_ENTIER_VARS, '{{eval:a+0.95;d}}',
               '${{lo}} = {{a}}.90$ et ${{hi}} = {{hi}}.00$ : par exemple $'
               + col('{{eval:a+0.95;d}}') + '$ (mais aussi ${{eval:a+0.91;d}}$,'
               ' ${{eval:a+0.99;d}}$…).'),
]

EX_34 = {'a': 3, 'b': 4, 'lo': '3.4', 'hi': '3.5'}
EX_19 = {'a': 1, 'lo': '1.9', 'hi': '2'}
MODELES.append(modele(
    '08-intercaler-un-nombre-decimal', 'Intercaler un nombre décimal',
    'Écrire un nombre décimal compris entre deux dixièmes consécutifs (3,4 < 3,45 < 3,5), ou entre'
    ' un dixième et l\'entier suivant (1,9 < 1,95 < 2) ; toute réponse strictement entre est juste',
    'Encadrer', 6, INTERCALER,
    [spec('3,45', 0, EX_34, '3,45', 'correct'),
     spec('3,41', 0, EX_34, '3,41', 'correct'),
     spec('3,456 (trois décimales, juste)', 0, EX_34, '3,456', 'correct'),
     spec('Erreur : 3,5 (borne)', 0, EX_34, '3,5', 'incorrect'),
     spec('Erreur : 3,6', 0, EX_34, '3,6', 'incorrect'),
     spec('Erreur : 3,39', 0, EX_34, '3,39', 'incorrect'),
     spec('1,95', 1, EX_19, '1,95', 'correct'),
     spec('Erreur : 1,10 (« après 1,9 vient 1,10 »)', 1, EX_19, '1,10', 'incorrect'),
     spec('Erreur : 2', 1, EX_19, '2', 'incorrect')],
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
