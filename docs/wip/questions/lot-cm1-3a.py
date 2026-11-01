"""Écrit les 10 modèles du lot 3a du CM1 (fractions) dans scripts/questions/cm1-3a/.

Phase 0 du 2026-10-30 (§ 9 du journal `docs/wip/questions-cm1-progress.md`), suivie par David
(« je te suis ») : CM1-147 en deux cases, sous-notion « Repérage » neuve, découpage 3a / 3b / 3c.
Bornes : `cycle3.json`, CM1 (dénominateurs au plus 20, fractions éventuellement supérieures à 1 ;
fraction d'une quantité UNITAIRE, résultat éventuellement décimal ; soustraction de même
dénominateur, ou l'un multiple connu de l'autre). Un point par modèle ; le nœud et le tag sont
posés par la migration de rangement, après le `--publier`.

Décisions et pièges :
- jumeau des modèles du CE1 (`lot-ce1-3.py`) pour lire et écrire une fraction ;
- `reducedFractions: off` partout : le CM1 ne simplifie pas, toute fraction égale est juste
  (comme `acfdddb3`, l'addition du CM1) ;
- choix en case « choix » (bloc ```choix, ADR 0033), le juste écrit en premier ;
- droites graduées : au plus 12 intervalles, pour que la droite à placer se vise au doigt sur un
  téléphone (`phoneGapWarning` : 20 graduations y font 12 px) ;
- niveaux : suite des niveaux de chaque catégorie, relevés en prod le 2026-10-30.

    python3 docs/wip/questions/lot-cm1-3a.py scripts/questions/cm1-3a
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
    # vient d'un bloc (droite à placer), sans `blanks[]`
    v = {'statement': statement, 'variables': variables}
    if conditions:
        v['conditions'] = conditions
    if answers is not None:
        v['blanks'] = [a if isinstance(a, dict) else {'expectedAnswer': a} for a in answers]
    v['correction'] = {'steps': steps}
    return v


def selon(nom, valeurs, debut=0):
    """`{{if:nom==debut|v0|{{if:nom==debut+1|v1|…}}}}` ; la dernière valeur est le « sinon »."""
    texte = valeurs[-1]
    for i in range(len(valeurs) - 2, -1, -1):
        texte = '{{if:' + nom + '==' + str(debut + i) + '|' + valeurs[i] + '|' + texte + '}}'
    return texte


def col(x, i=0):
    return '\\textcolor{{{color:primary.' + str(i) + '}}}{' + x + '}'


def choix(lignes):
    return '\n\n```choix\n' + ''.join('- ' + l + '\n' for l in lignes) + '```'


def frac(n, d):
    return '\\frac{' + n + '}{' + d + '}'


FRAC = frac('{{n}}', '{{d}}')

MODELES = []

# Nombres en lettres, de 0 à 30 (rang = le nombre)
LETTRES = ['zéro', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf', 'dix',
           'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit',
           'dix-neuf', 'vingt', 'vingt et un', 'vingt-deux', 'vingt-trois', 'vingt-quatre',
           'vingt-cinq', 'vingt-six', 'vingt-sept', 'vingt-huit', 'vingt-neuf', 'trente']
# Noms des parts, du dénominateur 2 au dénominateur 20
PART = ['demi', 'tiers', 'quart', 'cinquième', 'sixième', 'septième', 'huitième', 'neuvième',
        'dixième', 'onzième', 'douzième', 'treizième', 'quatorzième', 'quinzième', 'seizième',
        'dix-septième', 'dix-huitième', 'dix-neuvième', 'vingtième']
PARTS = ['demis', 'tiers', 'quarts'] + [p + 's' for p in PART[3:]]


def lettres(n):
    return selon(n, LETTRES)


def nom_fraction(n, d):
    """« cinq tiers », « un quart » : `n` parts de dénominateur `d` (deux variables)."""
    return (lettres(n) + ' {{if:' + n + '==1|' + selon(d, PART, 2) + '|' + selon(d, PARTS, 2)
            + '}}')


SENS = ('Le **dénominateur** (en bas) dit en combien de parts égales on partage l\'unité ; le'
        ' **numérateur** (en haut) dit combien de parts on prend.')


# --- 1. CM1-014 : lire et écrire une fraction ----------------------------------------------

ECRIRE = variation(
    'Écris en chiffres la fraction « **' + nom_fraction('n', 'd') + '** ».\n\n$$?$$',
    [var('d', '2..20'), var('m', 'eval:min(3*d,30)'), var('n', '1..{{m}}')],
    ['\\frac{{{n}}}{{{d}}}'],
    ['« ' + nom_fraction('n', 'd') + ' » : on partage l\'unité en ${{d}}$ parts égales et on en'
     ' prend ${{n}}$.', SENS, '$$' + col(FRAC) + '$$'],
    ['n!=d'])

LIRE = variation(
    'Comment lit-on la fraction $' + FRAC + '$ ?'
    + choix([nom_fraction('n', 'd'), lettres('d') + ' ' + selon('n', PARTS, 2),
             lettres('n') + ' ' + lettres('d'), nom_fraction('p', 'd')]),
    [var('d', '2..20'), var('m', 'eval:min(3*d,20)'), var('n', '2..{{m}}'),
     var('p', 'eval:n+1')],
    ['0'],
    [SENS, 'Ici, l\'unité est partagée en ${{d}}$ parts égales (des ' + selon('d', PARTS, 2)
     + ') et on en prend ${{n}}$ : $' + FRAC + '$ se lit **« ' + nom_fraction('n', 'd')
     + ' »**.'],
    ['n!=d', 'p!=d'])

MODELES.append(modele(
    '01-lire-et-ecrire-une-fraction', 'Lire et écrire une fraction',
    'Cinq tiers ↔ 5/3 : écrire en chiffres une fraction donnée en lettres, la lire parmi quatre'
    ' écritures ; dénominateur au plus 20, fractions éventuellement supérieures à 1',
    'Apprivoiser', 'Ecriture', 6, [ECRIRE, LIRE],
    [spec('cinq tiers : 5/3', 0, {'d': 3, 'm': 9, 'n': 5}, '\\frac{5}{3}', 'correct'),
     spec('Erreur : 3/5 (inversée)', 0, {'d': 3, 'm': 9, 'n': 5}, '\\frac{3}{5}', 'incorrect'),
     spec('Erreur : 53', 0, {'d': 3, 'm': 9, 'n': 5}, '53', 'incorrect'),
     spec('douze vingtièmes : 12/20', 0, {'d': 20, 'm': 30, 'n': 12}, '\\frac{12}{20}',
          'correct'),
     spec('un quart : 1/4', 0, {'d': 4, 'm': 12, 'n': 1}, '\\frac{1}{4}', 'correct'),
     spec('7/4 : sept quarts', 1, {'d': 4, 'm': 12, 'n': 7, 'p': 8}, '0', 'correct'),
     spec('Erreur : quatre septièmes', 1, {'d': 4, 'm': 12, 'n': 7, 'p': 8}, '1', 'incorrect'),
     spec('Erreur : sept quatre', 1, {'d': 4, 'm': 12, 'n': 7, 'p': 8}, '2', 'incorrect')]))


# --- 2 et 3. CM1-015, CM1-016 : entier + fraction inférieure à 1 ---------------------------

DENOMS = '2|3|4|5|6|7|8|9|10|12|15|20'
MIXTE_VARS = [var('d', DENOMS), var('q', '1..5'), var('dm', 'eval:d-1'), var('r', '1..{{dm}}'),
              var('a', 'eval:q*d+r')]
MIXTE_ETAPES = [
    '**Combien d\'unités ?** Une unité, c\'est $' + frac('{{d}}', '{{d}}') + '$. On cherche'
    ' combien de fois ${{d}}$ dans ${{a}}$ : ${{a}} = {{q}} \\times {{d}} + {{r}}$.',
    '$$' + frac('{{a}}', '{{d}}') + ' = ' + frac('{{eval:q*d}}', '{{d}}') + ' + '
    + frac('{{r}}', '{{d}}') + ' = {{q}} + ' + frac('{{r}}', '{{d}}') + '$$']

DECOMPOSER = variation(
    'Écris cette fraction comme la somme d\'un nombre entier et d\'une fraction inférieure à'
    ' $1$.\n\n$$' + frac('{{a}}', '{{d}}') + ' = ? + \\frac{?}{{{d}}}$$',
    MIXTE_VARS, ['{{q}}', '{{r}}'],
    MIXTE_ETAPES + ['$' + frac('{{r}}', '{{d}}') + '$ est inférieure à $1$ : $'
                    + frac('{{a}}', '{{d}}') + ' = ' + col('{{q}}') + ' + '
                    + frac(col('{{r}}'), '{{d}}') + '$.'])

EX_MIXTE = {'d': 8, 'q': 2, 'dm': 7, 'r': 5, 'a': 21}
MODELES.append(modele(
    '02-fraction-en-entier-plus-fraction', 'Écrire une fraction comme un entier plus une fraction',
    'Écrire une fraction supérieure à 1 comme la somme d\'un entier et d\'une fraction inférieure'
    ' à 1 (21/8 = 2 + 5/8) ; dénominateur au plus 20',
    'Apprivoiser', 'Décomposition', 4, [DECOMPOSER],
    [spec('21/8 = 2 + 5/8', 0, EX_MIXTE, ['2', '5'], 'correct'),
     spec('Erreur : 1 + 13/8 (fraction pas inférieure à 1)', 0, EX_MIXTE, ['1', '13'],
          'incorrect'),
     spec('Erreur : 5 et 2 échangés', 0, EX_MIXTE, ['5', '2'], 'incorrect'),
     spec('Erreur : 3 + 5/8', 0, EX_MIXTE, ['3', '5'], 'incorrect'),
     spec('7/4 = 1 + 3/4', 0, {'d': 4, 'q': 1, 'dm': 3, 'r': 3, 'a': 7}, ['1', '3'],
          'correct')]))

REGROUPER = variation(
    'Écris cette somme sous la forme d\'une seule fraction.\n\n$${{q}} + '
    + frac('{{r}}', '{{d}}') + ' = \\frac{?}{{{d}}}$$',
    MIXTE_VARS, ['{{a}}'],
    ['**Une unité, c\'est $' + frac('{{d}}', '{{d}}') + '$.** Donc ${{q}}$ unités, c\'est ${{q}}'
     ' \\times {{d}} = {{eval:q*d}}$ ' + selon('d', PARTS, 2) + ' : ${{q}} = '
     + frac('{{eval:q*d}}', '{{d}}') + '$.',
     '$${{q}} + ' + frac('{{r}}', '{{d}}') + ' = ' + frac('{{eval:q*d}}', '{{d}}') + ' + '
     + frac('{{r}}', '{{d}}') + ' = ' + frac(col('{{a}}'), '{{d}}') + '$$'])

EX_REGROUPER = {'d': 3, 'q': 2, 'dm': 2, 'r': 2, 'a': 8}
MODELES.append(modele(
    '03-entier-plus-fraction-en-une-fraction', 'Écrire un entier plus une fraction comme une fraction',
    'Écrire la somme d\'un entier et d\'une fraction inférieure à 1 comme une seule fraction'
    ' (2 + 2/3 = 8/3) ; dénominateur au plus 20',
    'Apprivoiser', 'Décomposition', 5, [REGROUPER],
    [spec('2 + 2/3 = 8/3', 0, EX_REGROUPER, '8', 'correct'),
     spec('Erreur : 4 (2 + 2)', 0, EX_REGROUPER, '4', 'incorrect'),
     spec('Erreur : 6 (fraction oubliée)', 0, EX_REGROUPER, '6', 'incorrect'),
     spec('Erreur : 7 (2 × 3 + 1)', 0, EX_REGROUPER, '7', 'incorrect')]))


# --- 4. CM1-017 : encadrer une fraction par deux entiers consécutifs -----------------------

ENCADRER = variation(
    'Encadre cette fraction par deux nombres entiers qui se suivent.\n\n$$? < '
    + frac('{{a}}', '{{d}}') + ' < ?$$',
    [var('d', '2..10'), var('q', '0..9'), var('dm', 'eval:d-1'), var('r', '1..{{dm}}'),
     var('a', 'eval:q*d+r')],
    ['{{q}}', '{{eval:q+1}}'],
    ['**Combien d\'unités ?** On cherche le multiple de ${{d}}$ juste avant ${{a}}$, dans la'
     ' table de ${{d}}$ : ${{a}} = {{q}} \\times {{d}} + {{r}}$.',
     '$$' + frac('{{a}}', '{{d}}') + ' = {{q}} + ' + frac('{{r}}', '{{d}}') + '$$',
     '$' + frac('{{r}}', '{{d}}') + '$ est entre $0$ et $1$, donc $' + col('{{q}}') + ' < '
     + frac('{{a}}', '{{d}}') + ' < ' + col('{{eval:q+1}}') + '$.'])

EX_ENC = {'d': 8, 'q': 2, 'dm': 7, 'r': 5, 'a': 21}
MODELES.append(modele(
    '04-encadrer-une-fraction', 'Encadrer une fraction par deux entiers',
    'Encadrer une fraction par deux entiers consécutifs à l\'aide des tables (2 < 21/8 < 3 ;'
    ' 5 < 16/3 < 6) ; dénominateur au plus 10',
    'Apprivoiser', 'Encadrer', 2, [ENCADRER],
    [spec('2 < 21/8 < 3', 0, EX_ENC, ['2', '3'], 'correct'),
     spec('Erreur : 8 et 21 (dénominateur et numérateur)', 0, EX_ENC, ['8', '21'], 'incorrect'),
     spec('Erreur : 1 et 3 (pas consécutifs)', 0, EX_ENC, ['1', '3'], 'incorrect'),
     spec('Erreur : 3 et 4', 0, EX_ENC, ['3', '4'], 'incorrect'),
     spec('0 < 2/5 < 1', 0, {'d': 5, 'q': 0, 'dm': 4, 'r': 2, 'a': 2}, ['0', '1'], 'correct')]))


# --- 5. CM1-148 : soustraire des fractions -------------------------------------------------

MEME_DENOMINATEUR = variation(
    'Calcule.\n\n$$' + frac('{{a}}', '{{d}}') + ' - ' + frac('{{c}}', '{{d}}') + ' = ?$$',
    [var('d', '2..12'), var('am', 'eval:2*d'), var('a', '2..{{am}}'), var('cm', 'eval:a-1'),
     var('c', '1..{{cm}}')],
    ['\\frac{{{eval:a-c}}}{{{d}}}'],
    ['**Même dénominateur.** On enlève des parts de même taille : ${{a}}$ '
     + selon('d', PARTS, 2) + ' moins ${{c}}$ {{if:c==1|' + selon('d', PART, 2) + '|'
     + selon('d', PARTS, 2) + '}}. **Le dénominateur ne change pas.**',
     '$$' + frac('{{a}}', '{{d}}') + ' - ' + frac('{{c}}', '{{d}}') + ' = '
     + frac('{{a}} - {{c}}', '{{d}}') + ' = ' + col(frac('{{eval:a-c}}', '{{d}}')) + '$$'])

MULTIPLE = variation(
    'Calcule.\n\n$$' + frac('{{a}}', '{{b}}') + ' - ' + frac('{{c}}', '{{d}}') + ' = ?$$',
    [var('b', '2..6'), var('k', '2..5'), var('d', 'eval:b*k'), var('am', 'eval:3*b'),
     var('a', '1..{{am}}'), var('ak', 'eval:a*k'), var('cm', 'eval:ak-1'),
     var('c', '1..{{cm}}')],
    ['\\frac{{{eval:ak-c}}}{{{d}}}'],
    ['**Même dénominateur d\'abord.** ${{d}} = {{b}} \\times {{k}}$ : on écrit $'
     + frac('{{a}}', '{{b}}') + '$ en ' + selon('d', PARTS, 2) + ', en multipliant le numérateur'
     ' et le dénominateur par ${{k}}$.',
     '$$' + frac('{{a}}', '{{b}}') + ' = ' + frac('{{a}} \\times {{k}}', '{{b}} \\times {{k}}')
     + ' = ' + frac('{{ak}}', '{{d}}') + '$$',
     '$$' + frac('{{a}}', '{{b}}') + ' - ' + frac('{{c}}', '{{d}}') + ' = '
     + frac('{{ak}}', '{{d}}') + ' - ' + frac('{{c}}', '{{d}}') + ' = '
     + col(frac('{{eval:ak-c}}', '{{d}}')) + '$$'],
    ['d<=20', 'mod(a,b)!=0', 'mod(c,k)!=0'])

EX_MEME = {'d': 10, 'am': 20, 'a': 8, 'cm': 7, 'c': 5}
EX_MULT = {'b': 6, 'k': 2, 'd': 12, 'am': 18, 'a': 5, 'ak': 10, 'cm': 9, 'c': 1}
MODELES.append(modele(
    '05-soustraire-des-fractions', 'Soustraire des fractions',
    'Différence de deux fractions de même dénominateur (8/10 − 5/10), ou dont un dénominateur est'
    ' multiple de l\'autre (5/6 − 1/12) ; dénominateurs au plus 20, toute fraction égale juste',
    'Calculer', 'Addition et Soustraction', 18, [MEME_DENOMINATEUR, MULTIPLE],
    [spec('8/10 − 5/10 = 3/10', 0, EX_MEME, '\\frac{3}{10}', 'correct'),
     spec('Erreur : 3 (dénominateur oublié)', 0, EX_MEME, '3', 'incorrect'),
     spec('Erreur : 13/10 (numérateurs ajoutés)', 0, EX_MEME, '\\frac{13}{10}', 'incorrect'),
     spec('5/6 − 1/12 = 9/12', 1, EX_MULT, '\\frac{9}{12}', 'correct'),
     spec('5/6 − 1/12 = 3/4, même valeur', 1, EX_MULT, '\\frac{3}{4}', 'correct'),
     spec('Erreur : 4/6 (numérateurs ôtés, premier dénominateur)', 1, EX_MULT, '\\frac{4}{6}',
          'incorrect'),
     spec('Erreur : 4/12 (5/6 pas converti)', 1, EX_MULT, '\\frac{4}{12}', 'incorrect')]))


# --- 6. CM1-022 : fraction d'une quantité --------------------------------------------------

# « la moitié », puis « un tiers »… « un dixième » (k = 2 à 10)
UNE_PART = ['la moitié'] + ['un ' + p for p in PART[1:9]]
UNE_PART_MAJ = ['La moitié'] + ['Un ' + p for p in PART[1:9]]
OBJETS = ['billes', 'bonbons', 'images', 'élèves', 'timbres']
GRANDEURS = ['mètres', 'kilogrammes', 'litres', 'euros']

QUANTITE_ENTIERE = variation(
    'Calcule ' + selon('k', UNE_PART, 2) + ' de ${{n}}$ ' + selon('o', OBJETS) + '.\n\n'
    + selon('k', UNE_PART_MAJ, 2) + ' de ${{n}}$ ' + selon('o', OBJETS) + ', c\'est $?$ '
    + selon('o', OBJETS) + '.',
    [var('k', '2..10'), var('p', '2..12'), var('n', 'eval:k*p'), var('o', '0..4')],
    ['{{p}}'],
    ['**Fraction d\'une quantité.** Prendre ' + selon('k', UNE_PART, 2) + ', c\'est partager en'
     ' ${{k}}$ parts égales et prendre une part.',
     '$${{n}} \\div {{k}} = ' + col('{{p}}') + '$$ car ${{k}} \\times {{p}} = {{n}}$.'])

QUANTITE_DECIMALE = variation(
    'Calcule ' + selon('k', UNE_PART, 2) + ' de ${{n}}$ ' + selon('g', GRANDEURS) + '.\n\n'
    + selon('k', UNE_PART_MAJ, 2) + ' de ${{n}}$ ' + selon('g', GRANDEURS) + ', c\'est $?$ '
    + selon('g', GRANDEURS) + '.',
    [var('k', '2|4|5|10'), var('n', '3..30'), var('g', '0..3')],
    ['{{eval:n/k;d}}'],
    ['**Fraction d\'une quantité.** Prendre ' + selon('k', UNE_PART, 2) + ', c\'est partager en'
     ' ${{k}}$ parts égales et prendre une part.',
     '${{n}}$ n\'est pas dans la table de ${{k}}$ : le partage ne tombe pas juste, le résultat'
     ' a une virgule.',
     '$${{n}} \\div {{k}} = ' + col('{{eval:n/k;d}}') + '$$ car ${{k}} \\times {{eval:n/k;d}} ='
     ' {{n}}$.'],
    ['mod(n,k)!=0'])

MODELES.append(modele(
    '06-fraction-d-une-quantite', 'Fraction d\'une quantité',
    'Un tiers de 12 billes, un quart de 10 m (2,5 m) : fractions de numérateur 1 seulement,'
    ' résultat entier ou décimal',
    'Calculer', 'Fraction d\'une quantité', 6, [QUANTITE_ENTIERE, QUANTITE_DECIMALE],
    [spec('un tiers de 12 billes : 4', 0, {'k': 3, 'p': 4, 'n': 12, 'o': 0}, '4', 'correct'),
     spec('Erreur : 36 (multiplié)', 0, {'k': 3, 'p': 4, 'n': 12, 'o': 0}, '36', 'incorrect'),
     spec('Erreur : 9 (12 − 3)', 0, {'k': 3, 'p': 4, 'n': 12, 'o': 0}, '9', 'incorrect'),
     spec('un quart de 10 m : 2,5', 1, {'k': 4, 'n': 10, 'g': 0}, '2.5', 'correct'),
     spec('Erreur : 2 (reste oublié)', 1, {'k': 4, 'n': 10, 'g': 0}, '2', 'incorrect'),
     spec('Erreur : 2,2 (2 reste 2)', 1, {'k': 4, 'n': 10, 'g': 0}, '2.2', 'incorrect'),
     spec('un cinquième de 7 kg : 1,4', 1, {'k': 5, 'n': 7, 'g': 1}, '1.4', 'correct')]))


# --- 7 à 10. CM1-019, 147, 018, 146 : la demi-droite graduée -------------------------------
# Unité partagée en d parts ; u unités (jamais `e`, le nombre d'Euler), au plus 12 intervalles en tout. Seuls les entiers sont
# écrits (major: d).

FIN = 'eval:min(4,floor(12/d))'
DROITE_VARS = [var('d', '2|3|4|5|6|8|10'), var('u', FIN), var('nm', 'eval:u*d-1')]
# Pour « entier + fraction » : au moins deux unités, donc d de 2 à 6
DROITE_VARS_MIXTE = [var('d', '2|3|4|5|6'), var('u', FIN), var('qm', 'eval:u-1'),
                     var('q', '1..{{qm}}'), var('dm', 'eval:d-1'), var('r', '1..{{dm}}'),
                     var('n', 'eval:q*d+r')]


def droite(*lignes):
    return ('\n\n```line\nstart: 0\nend: {{u}}\nstep: 1/{{d}}\nmajor: {{d}}\n'
            + ''.join(l + '\n' for l in lignes) + '```')


UNITE_PARTAGEE = ('**L\'unité.** De $0$ à $1$, l\'unité est partagée en ${{d}}$ parts égales :'
                  ' chaque petit intervalle vaut $' + frac('1', '{{d}}') + '$.')

REPERER = variation(
    'Quel nombre repère le point $A$ ? Écris-le sous la forme d\'une fraction.'
    + droite('points: A={{n}}/{{d}}') + '\n\n$$A : ?$$',
    DROITE_VARS + [var('n', '1..{{nm}}')],
    ['\\frac{{{n}}}{{{d}}}'],
    [UNITE_PARTAGEE,
     'Le point $A$ est à ${{n}}$ petits intervalles de $0$ : il repère $' + col(FRAC) + '$.'],
    ['mod(n,d)!=0'])

MODELES.append(modele(
    '07-reperer-par-une-fraction', 'Repérer un point par une fraction',
    'Lire le nombre qui repère un point d\'une demi-droite graduée, sous la forme d\'une fraction'
    ' (A repère 3/4) ; unité partagée en 2 à 10 parts',
    'Apprivoiser', 'Repérage', 1, [REPERER],
    [spec('A repère 3/4', 0, {'d': 4, 'u': 3, 'nm': 11, 'n': 3}, '\\frac{3}{4}', 'correct'),
     spec('A repère 7/4', 0, {'d': 4, 'u': 3, 'nm': 11, 'n': 7}, '\\frac{7}{4}', 'correct'),
     spec('Erreur : 3/12 (toute la droite comptée)', 0, {'d': 4, 'u': 3, 'nm': 11, 'n': 3},
          '\\frac{3}{12}', 'incorrect'),
     spec('Erreur : 3 (graduations comptées)', 0, {'d': 4, 'u': 3, 'nm': 11, 'n': 3}, '3',
          'incorrect'),
     spec('Erreur : 4/4 (traits comptés depuis 0 inclus)', 0, {'d': 4, 'u': 3, 'nm': 11, 'n': 3},
          '\\frac{4}{4}', 'incorrect')],
    delay=45))

REPERER_MIXTE = variation(
    'Le point $A$ repère la somme d\'un nombre entier et d\'une fraction inférieure à $1$.'
    ' Complète.' + droite('points: A={{n}}/{{d}}') + '\n\n$$A : ? + \\frac{?}{{{d}}}$$',
    DROITE_VARS_MIXTE, ['{{q}}', '{{r}}'],
    [UNITE_PARTAGEE,
     'Le point $A$ est après la graduation ${{q}}$, à ${{r}}$ petit{{if:r>1|s|}} intervalle'
     '{{if:r>1|s|}} plus loin : il repère $' + col('{{q}}') + ' + ' + frac(col('{{r}}'), '{{d}}')
     + '$, c\'est-à-dire $' + FRAC + '$.'])

EX_MIXTE_D = {'d': 4, 'u': 3, 'qm': 2, 'q': 2, 'dm': 3, 'r': 1, 'n': 9}
MODELES.append(modele(
    '08-reperer-par-entier-plus-fraction', 'Repérer un point par un entier plus une fraction',
    'Lire le nombre qui repère un point d\'une demi-droite graduée, sous la forme d\'un entier'
    ' plus une fraction inférieure à 1 (B repère 2 + 1/4) ; unité partagée en 2 à 6 parts',
    'Apprivoiser', 'Repérage', 2, [REPERER_MIXTE],
    [spec('A repère 2 + 1/4', 0, EX_MIXTE_D, ['2', '1'], 'correct'),
     spec('Erreur : 3 + 1/4 (graduation suivante)', 0, EX_MIXTE_D, ['3', '1'], 'incorrect'),
     spec('Erreur : 0 + 9/4 (fraction pas inférieure à 1)', 0, EX_MIXTE_D, ['0', '9'],
          'incorrect'),
     spec('Erreur : 2 + 3/4 (compté depuis 3)', 0, EX_MIXTE_D, ['2', '3'], 'incorrect')],
    delay=45))

PLACER = variation(
    'Place le nombre $' + FRAC + '$ sur la demi-droite graduée.' + droite('placer: {{n}}/{{d}}'),
    DROITE_VARS + [var('n', '1..{{nm}}')],
    None,
    [UNITE_PARTAGEE,
     '$' + FRAC + '$, c\'est ${{n}}$ petits intervalles à partir de $0$.'],
    ['mod(n,d)!=0'])

MODELES.append(modele(
    '09-placer-une-fraction', 'Placer une fraction sur une demi-droite graduée',
    'Placer une fraction sur une demi-droite graduée (place 3/4) en touchant la droite ; unité'
    ' partagée en 2 à 10 parts',
    'Apprivoiser', 'Repérage', 3, [PLACER],
    # La réponse de la droite est écrite par `placerAnswer` : décimal à point quand le
    # dénominateur le permet (3/4 → 0.75), sinon fraction LaTeX
    [spec('3/4 placé', 0, {'d': 4, 'u': 3, 'nm': 11, 'n': 3}, '0.75', 'correct'),
     spec('Erreur : 1/4 de trop (1)', 0, {'d': 4, 'u': 3, 'nm': 11, 'n': 3}, '1', 'incorrect'),
     spec('Erreur : 3 (graduation de l\'unité 3)', 0, {'d': 4, 'u': 3, 'nm': 11, 'n': 3}, '3',
          'incorrect'),
     spec('2/3 placé', 0, {'d': 3, 'u': 4, 'nm': 11, 'n': 2}, '\\frac{2}{3}', 'correct'),
     spec('Erreur : 1/3', 0, {'d': 3, 'u': 4, 'nm': 11, 'n': 2}, '\\frac{1}{3}', 'incorrect')],
    delay=45))

PLACER_MIXTE = variation(
    'Place le nombre ${{q}} + ' + frac('{{r}}', '{{d}}') + '$ sur la demi-droite graduée.'
    + droite('placer: {{n}}/{{d}}'),
    DROITE_VARS_MIXTE, None,
    [UNITE_PARTAGEE,
     '${{q}} + ' + frac('{{r}}', '{{d}}') + '$ : on va jusqu\'à la graduation ${{q}}$, puis'
     ' ${{r}}$ petit{{if:r>1|s|}} intervalle{{if:r>1|s|}} plus loin.'])

MODELES.append(modele(
    '10-placer-entier-plus-fraction', 'Placer un entier plus une fraction sur une demi-droite',
    'Placer la somme d\'un entier et d\'une fraction inférieure à 1 sur une demi-droite graduée'
    ' (place 2 + 1/4) ; unité partagée en 2 à 6 parts',
    'Apprivoiser', 'Repérage', 4, [PLACER_MIXTE],
    [spec('2 + 1/4 placé', 0, EX_MIXTE_D, '2.25', 'correct'),
     spec('Erreur : 1/4 (entier oublié)', 0, EX_MIXTE_D, '0.25', 'incorrect'),
     spec('Erreur : 2 + 4/4 (3)', 0, EX_MIXTE_D, '3', 'incorrect'),
     spec('1 + 2/3 placé', 0, {'d': 3, 'u': 4, 'qm': 3, 'q': 1, 'dm': 2, 'r': 2, 'n': 5},
          '\\frac{5}{3}', 'correct')],
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
