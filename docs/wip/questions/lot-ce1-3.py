"""Écrit les 9 modèles du lot 3 du CE1 (fractions) dans scripts/questions/ce1-3/.

Phase 0 validée par David le 2026-10-28 (§ 9 du journal `docs/wip/questions-ce1-progress.md`).
Bornes `cycle2.json`, CE1-016 à 021 et 099 : fractions d'un tout, toutes ≤ 1, dénominateur dans
{2, 3, 4, 5, 6, 8, 10} ; somme et différence de même dénominateur, résultat ≤ 1. Exemples du BO
(p.12-13) : 3/8 = 1/8 + 1/8 + 1/8 ; 2/5 < 3/5 ; 1/5 < 1/3 ; 2/5 + 3/5 = 1 ; Lucie, 3/10 en bleu.
Décisions :

1. Texte seul ; 096 et 098 (partages dessinés) au lot « outils existants », après vérification
   du bloc `figure`.
2. Nouvelle catégorie « Fractions · Apprivoiser · Ecriture » (niveaux 1 à 5) ; « Comparer » 6 et
   7, « Addition et Soustraction » 13 et 14 (places libres relevées en prod le 2026-10-28).
3. La simplification est du CE2 : `reducedFractions` coupé (4/8 juste sans ambre ; 1/2 aussi,
   même valeur) ; une somme qui fait 1 accepte « 1 » et « 5/5 ».
4. Lire une fraction (02, 04) : case « choix » (bloc ```choix, réponse = indice d'origine) ;
   comparer (06, 07) : choix < = > non mélangé, comme « Comparer » des entiers du CE1, une
   égalité de temps en temps (tirages indépendants).
5. Jamais de variable `e` ni `i` (Euler, unité imaginaire).
6. Relecture du 2026-10-29 : le 03 perd « un huitième plus un huitième… » (doublon de la
   variation 3 du 08) ; le 09 perd Lucie, gardée pour le lot 4 (problèmes).

    python3 docs/wip/questions/lot-ce1-3.py scripts/questions/ce1-3
"""
import json
import sys

DOSSIER = sys.argv[1]

# ---- Mots ----

DENOMINATEURS = [2, 3, 4, 5, 6, 8, 10]
LISTE = '|'.join(str(d) for d in DENOMINATEURS)
LISTE_SANS_DEMI = '|'.join(str(d) for d in DENOMINATEURS if d != 2)

UNITES = ['', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf', 'dix']
PARTS = {2: 'demi', 3: 'tiers', 4: 'quart'}


def part(d):
    """Nom d'une part : demi, tiers, quart, cinquième… dixième."""
    if d in PARTS:
        return PARTS[d]
    mot = UNITES[d]
    if mot.endswith('cinq'):
        return mot + 'uième'
    if mot.endswith('neuf'):
        return mot[:-1] + 'vième'
    if mot.endswith('e'):
        mot = mot[:-1]
    return mot + 'ième'


def parts(d):
    """Au pluriel : demis, tiers, quarts, cinquièmes…"""
    return part(d) if part(d).endswith('s') else part(d) + 's'


def en_lettres(n, d):
    return 'un ' + part(d) if n == 1 else UNITES[n] + ' ' + parts(d)


def par(var, valeurs, f):
    """f(valeur) selon la valeur tirée de `var` : {{if:var==v1|…|{{if:var==v2|…|…}}}}."""
    valeurs = list(valeurs)
    expr = f(valeurs[-1])
    for x in reversed(valeurs[:-1]):
        expr = '{{if:' + var + '==' + str(x) + '|' + f(x) + '|' + expr + '}}'
    return expr


def fr(n, d):
    """Fraction de deux expressions de gabarit (`{{a}}`, `{{eval:…}}`)."""
    return '\\frac{' + n + '}{' + d + '}'


def ev(x):
    return '{{eval:' + x + '}}'


def col(x, k=0):
    return '\\textcolor{{{color:primary.' + str(k) + '}}}{' + x + '}'


# Fraction tirée (n, d) en lettres, morceau par morceau
NUMERATEUR_MOT = par('n', range(1, 11), lambda n: UNITES[n])
PARTS_MOT = par('d', DENOMINATEURS, parts)
PART_MOT = par('d', DENOMINATEURS, part)


def parts_de(var):
    """« quart » si la variable vaut 1, « quarts » sinon."""
    return '{{if:' + var + '==1|' + PART_MOT + '|' + PARTS_MOT + '}}'

# ---- Gabarits ----


def spec(desc, vi, variables, answers, status, violations=None):
    s = {'description': desc, 'variationIndex': vi, 'variables': variables,
         'answers': answers if isinstance(answers, list) else [answers],
         'expected': {'status': status}}
    if violations:
        s['expected']['constraintViolations'] = violations
    return s


def modele(title, description, domain, subdomain, level, variations, specs, delay=45):
    # theme / domain / subdomain : anciennes colonnes, remplies pour create-questions ; le
    # rangement (sous-notion des fractions) est posé par la migration
    return {'title': title, 'description': description, 'grades': ['CE1'], 'theme': 'Fractions',
            'domain': domain, 'subdomain': subdomain, 'level': level, 'delay': delay,
            'status': 'draft', 'options': {'constraints': {'reducedFractions': 'off'}},
            'variations': variations, 'testSpecs': specs}


def var(nom, expression):
    return {'name': nom, 'expression': expression}


def variation(statement, variables, reponse, steps, conditions=None):
    # Une seule case : `$?$` dans l'énoncé, ou le bloc ```choix (réponse = indice d'origine)
    v = {'statement': statement, 'variables': variables}
    if conditions:
        v['conditions'] = conditions
    v['blanks'] = [{'expectedAnswer': reponse}]
    v['correction'] = {'steps': steps}
    return v


def choix(lignes, melanger=True):
    tete = '' if melanger else 'melanger: non\n'
    return '\n\n```choix\n' + tete + ''.join('- ' + c + '\n' for c in lignes) + '```'


SENS = ('Le **dénominateur** (en bas) dit en combien de parts égales on partage le tout ; le'
        ' **numérateur** (en haut) dit combien de parts on prend.')

# ---- 1. et 2. Fractions unitaires : écrire, lire (CE1-016) ----

UNITAIRE_EN_CHIFFRES = variation(
    'Écris en chiffres la fraction « **un ' + PART_MOT + '** ».\n\n$$?$$',
    [var('d', LISTE)], fr('1', '{{d}}'),
    ['« Un ' + PART_MOT + ' » : on partage le tout en ${{d}}$ parts égales et on en prend $1$.',
     '$$' + col(fr('1', '{{d}}')) + '$$'])

SPECS_UNITAIRE_CHIFFRES = [
    spec('un quart : 1/4', 0, {'d': '4'}, '\\frac{1}{4}', 'correct'),
    spec('Erreur : un quart, 4/1', 0, {'d': '4'}, '\\frac{4}{1}', 'incorrect'),
    spec('Erreur : un quart, 4', 0, {'d': '4'}, '4', 'incorrect'),
    spec('un tiers : 1/3', 0, {'d': '3'}, '\\frac{1}{3}', 'correct'),
    spec('Erreur : un tiers, 1/4 (tiers ≠ quart)', 0, {'d': '3'}, '\\frac{1}{4}', 'incorrect'),
    spec('borne : un demi, 1/2', 0, {'d': '2'}, '\\frac{1}{2}', 'correct'),
    spec('borne : un dixième, 1/10', 0, {'d': '10'}, '\\frac{1}{10}', 'correct'),
]


def autres(d):
    """Deux dénominateurs voisins de d dans la liste."""
    k = DENOMINATEURS.index(d)
    if k == 0:
        return DENOMINATEURS[1], DENOMINATEURS[2]
    if k == len(DENOMINATEURS) - 1:
        return DENOMINATEURS[-2], DENOMINATEURS[-3]
    return DENOMINATEURS[k - 1], DENOMINATEURS[k + 1]


# Leurre « un deuxième / un troisième / un quatrième » là où le mot est irrégulier
FAUX_ORDINAL = {2: 'un deuxième', 3: 'un troisième', 4: 'un quatrième'}

LIRE_UNITAIRE = variation(
    'Comment lit-on la fraction $' + fr('1', '{{d}}') + '$ ?'
    + choix([par('d', DENOMINATEURS, lambda d: 'un ' + part(d)),
             par('d', DENOMINATEURS, lambda d: 'un ' + UNITES[d]),
             par('d', DENOMINATEURS, lambda d: 'un ' + part(autres(d)[0])),
             par('d', DENOMINATEURS,
                 lambda d: FAUX_ORDINAL.get(d, 'un ' + part(autres(d)[1])))]),
    [var('d', LISTE)], '0',
    ['$' + fr('1', '{{d}}') + '$ : le tout est partagé en ${{d}}$ parts égales, on en prend $1$.',
     'On lit « **un ' + PART_MOT + '** ».'])

SPECS_LIRE_UNITAIRE = [
    spec('1/4 : un quart', 0, {'d': '4'}, '0', 'correct'),
    spec('Erreur : 1/4, « un quatre »', 0, {'d': '4'}, '1', 'incorrect'),
    spec('Erreur : 1/4, « un tiers »', 0, {'d': '4'}, '2', 'incorrect'),
    spec('Erreur : 1/4, « un quatrième »', 0, {'d': '4'}, '3', 'incorrect'),
    spec('1/3 : un tiers', 0, {'d': '3'}, '0', 'correct'),
    spec('borne : 1/2, un demi', 0, {'d': '2'}, '0', 'correct'),
    spec('borne : 1/10, un dixième', 0, {'d': '10'}, '0', 'correct'),
]

# ---- 3. et 4. Fractions ≤ 1 : écrire, lire (CE1-017) ----
# n de 2 à d − 1 (non unitaire, jamais le tout : 5/5 est vu en addition)

NON_UNITAIRE = [var('d', LISTE_SANS_DEMI), var('n', '2..{{eval:d-1}}')]

EN_CHIFFRES = variation(
    'Écris en chiffres la fraction « **' + NUMERATEUR_MOT + ' ' + PARTS_MOT + '** ».\n\n$$?$$',
    NON_UNITAIRE, fr('{{n}}', '{{d}}'),
    ['« ' + NUMERATEUR_MOT + ' ' + PARTS_MOT + ' » : on partage le tout en ${{d}}$ parts égales'
     ' et on en prend ${{n}}$.', SENS, '$$' + col(fr('{{n}}', '{{d}}')) + '$$'])


SPECS_CHIFFRES = [
    spec('trois huitièmes : 3/8', 0, {'d': '8', 'n': '3'}, '\\frac{3}{8}', 'correct'),
    spec('Erreur : trois huitièmes, 8/3', 0, {'d': '8', 'n': '3'}, '\\frac{8}{3}', 'incorrect'),
    spec('Erreur : trois huitièmes, 38', 0, {'d': '8', 'n': '3'}, '38', 'incorrect'),
    spec('deux quarts : 2/4', 0, {'d': '4', 'n': '2'}, '\\frac{2}{4}', 'correct'),
    spec('deux quarts : 1/2, même valeur', 0, {'d': '4', 'n': '2'}, '\\frac{1}{2}', 'correct'),
    spec('borne : neuf dixièmes, 9/10', 0, {'d': '10', 'n': '9'}, '\\frac{9}{10}', 'correct'),
    spec('borne : deux tiers, 2/3', 0, {'d': '3', 'n': '2'}, '\\frac{2}{3}', 'correct'),
]


def lire_choix(f):
    """Un choix qui dépend de (n, d) : if sur d, puis sur n."""
    return par('d', DENOMINATEURS[1:],
               lambda d: par('n', range(2, d), lambda n: f(n, d)))


def numerateur_voisin(n, d):
    return n - 1 if n > 2 else n + 1


LIRE = variation(
    'Comment lit-on la fraction $' + fr('{{n}}', '{{d}}') + '$ ?'
    + choix([lire_choix(en_lettres),
             lire_choix(lambda n, d: UNITES[d] + ' ' + parts(n)),
             lire_choix(lambda n, d: UNITES[n] + ' ' + UNITES[d]),
             lire_choix(lambda n, d: en_lettres(numerateur_voisin(n, d), d))]),
    NON_UNITAIRE, '0',
    ['$' + fr('{{n}}', '{{d}}') + '$ : le tout est partagé en ${{d}}$ parts égales (des '
     + PARTS_MOT + '), on en prend ${{n}}$.',
     'On lit « **' + NUMERATEUR_MOT + ' ' + PARTS_MOT + '** ».'])

SPECS_LIRE = [
    spec('BO : 3/8, trois huitièmes', 0, {'d': '8', 'n': '3'}, '0', 'correct'),
    spec('Erreur : 3/8, « huit tiers » (inversé)', 0, {'d': '8', 'n': '3'}, '1', 'incorrect'),
    spec('Erreur : 3/8, « trois huit »', 0, {'d': '8', 'n': '3'}, '2', 'incorrect'),
    spec('Erreur : 3/8, « deux huitièmes »', 0, {'d': '8', 'n': '3'}, '3', 'incorrect'),
    spec('borne : 2/3, deux tiers', 0, {'d': '3', 'n': '2'}, '0', 'correct'),
    spec('borne : 9/10, neuf dixièmes', 0, {'d': '10', 'n': '9'}, '0', 'correct'),
]

# ---- 5. Numérateur et dénominateur (CE1-018) ----

FRACTION_TIREE = [var('d', LISTE), var('n', '1..{{eval:d-1}}')]

NUMERATEUR = variation(
    'Dans la fraction $' + fr('{{n}}', '{{d}}') + '$, quel est le **numérateur** ?\n\n'
    'Le numérateur est $?$.',
    FRACTION_TIREE, '{{n}}',
    [SENS, 'Dans $' + fr('{{n}}', '{{d}}') + '$, le numérateur est $' + col('{{n}}') + '$.'])

DENOMINATEUR = variation(
    'Dans la fraction $' + fr('{{n}}', '{{d}}') + '$, quel est le **dénominateur** ?\n\n'
    'Le dénominateur est $?$.',
    FRACTION_TIREE, '{{d}}',
    [SENS, 'Dans $' + fr('{{n}}', '{{d}}') + '$, le dénominateur est $' + col('{{d}}') + '$.'])

MOT_DEMANDE = par('t', [0, 1], lambda t: 'numérateur' if t == 0 else 'dénominateur')

PARTAGE = variation(
    'On partage une bande de papier en ${{d}}$ parts égales et on en colorie ${{n}}$.\n\n'
    'Quel est le **' + MOT_DEMANDE + '** de la fraction coloriée ?\n\nC\'est $?$.',
    FRACTION_TIREE + [var('t', '0..1'), var('r', 'eval:(1-t)*n+t*d')], '{{r}}',
    [SENS, 'La partie coloriée est $' + fr('{{n}}', '{{d}}') + '$ de la bande : son '
     + MOT_DEMANDE + ' est $' + col('{{r}}') + '$.'])

SPECS_MOTS = [
    spec('3/8 : numérateur 3', 0, {'d': '8', 'n': '3'}, '3', 'correct'),
    spec('Erreur : numérateur de 3/8, 8', 0, {'d': '8', 'n': '3'}, '8', 'incorrect'),
    spec('borne : 1/2, numérateur 1', 0, {'d': '2', 'n': '1'}, '1', 'correct'),
    spec('3/8 : dénominateur 8', 1, {'d': '8', 'n': '3'}, '8', 'correct'),
    spec('Erreur : dénominateur de 3/8, 3', 1, {'d': '8', 'n': '3'}, '3', 'incorrect'),
    spec('BO : 2 parts sur 5, numérateur 2', 2, {'d': '5', 'n': '2', 't': '0', 'r': '2'}, '2',
         'correct'),
    spec('Erreur : numérateur, 5 (le nombre de parts)', 2,
         {'d': '5', 'n': '2', 't': '0', 'r': '2'}, '5', 'incorrect'),
    spec('2 parts sur 5, dénominateur 5', 2, {'d': '5', 'n': '2', 't': '1', 'r': '5'}, '5',
         'correct'),
    spec('Erreur : dénominateur, 2 (les parts coloriées)', 2,
         {'d': '5', 'n': '2', 't': '1', 'r': '5'}, '2', 'incorrect'),
]

# ---- 6. et 7. Comparer (CE1-019, CE1-020) ----
# `r` = indice du signe (0 <, 1 =, 2 >) ; tirages indépendants : une égalité de temps en temps

SIGNES = ['<', '=', '>']


def comparer(gauche, droite):
    return ('Complète avec le symbole qui convient.\n\n$$' + gauche + ' \\ldots ' + droite + '$$'
            + choix(['$$<$$', '$$=$$', '$$>$$'], melanger=False))


def conclure(gauche, droite):
    return '$$' + gauche + ' ' + col(par('r', [0, 1, 2], lambda k: SIGNES[k])) + ' ' + droite + '$$'


MEME_DENOMINATEUR = variation(
    comparer(fr('{{a}}', '{{d}}'), fr('{{b}}', '{{d}}')),
    [var('d', LISTE_SANS_DEMI), var('a', '1..{{d}}'), var('b', '1..{{d}}'),
     var('r', 'eval:sign(a-b)+1')], '{{r}}',
    ['Les deux fractions partagent le tout en ${{d}}$ parts égales : les parts ont la même'
     ' taille. La plus grande fraction est celle qui prend **le plus de parts**.',
     conclure(fr('{{a}}', '{{d}}'), fr('{{b}}', '{{d}}'))])

SPECS_MEME_DENOMINATEUR = [
    spec('BO : 2/5 < 3/5', 0, {'d': '5', 'a': '2', 'b': '3', 'r': '0'}, '0', 'correct'),
    spec('Erreur : 2/5 > 3/5', 0, {'d': '5', 'a': '2', 'b': '3', 'r': '0'}, '2', 'incorrect'),
    spec('7/8 > 3/8', 0, {'d': '8', 'a': '7', 'b': '3', 'r': '2'}, '2', 'correct'),
    spec('égalité : 4/6 = 4/6', 0, {'d': '6', 'a': '4', 'b': '4', 'r': '1'}, '1', 'correct'),
    spec('Erreur : égalité, < choisi', 0, {'d': '6', 'a': '4', 'b': '4', 'r': '1'}, '0',
         'incorrect'),
    spec('borne : 10/10 > 9/10', 0, {'d': '10', 'a': '10', 'b': '9', 'r': '2'}, '2', 'correct'),
]

NUMERATEUR_UN = variation(
    comparer(fr('1', '{{p}}'), fr('1', '{{q}}')),
    [var('p', LISTE), var('q', LISTE), var('r', 'eval:sign(q-p)+1')], '{{r}}',
    ['D\'un côté, le tout est partagé en ${{p}}$ parts égales ; de l\'autre, en ${{q}}$ parts'
     ' égales. **Plus on fait de parts, plus chaque part est petite.**',
     conclure(fr('1', '{{p}}'), fr('1', '{{q}}'))])

SPECS_NUMERATEUR_UN = [
    spec('BO : 1/5 < 1/3', 0, {'p': '5', 'q': '3', 'r': '0'}, '0', 'correct'),
    spec('Erreur : 1/5 > 1/3 (car 5 > 3)', 0, {'p': '5', 'q': '3', 'r': '0'}, '2', 'incorrect'),
    spec('1/3 > 1/6', 0, {'p': '3', 'q': '6', 'r': '2'}, '2', 'correct'),
    spec('Erreur : 1/3 < 1/6 (car 3 < 6)', 0, {'p': '3', 'q': '6', 'r': '2'}, '0', 'incorrect'),
    spec('égalité : 1/4 = 1/4', 0, {'p': '4', 'q': '4', 'r': '1'}, '1', 'correct'),
    spec('borne : 1/2 > 1/10', 0, {'p': '2', 'q': '10', 'r': '2'}, '2', 'correct'),
]

# ---- 8. Additionner (CE1-021) ----

ADDITION_CORRECTION = ('On ajoute des parts de même taille : ${{a}}$ ' + parts_de('a') + ' plus ${{b}}$ '
                       + parts_de('b') + ', cela fait ${{eval:a+b}}$ ' + PARTS_MOT + '. **Le'
                       ' dénominateur ne change pas.**')

ADDITION = variation(
    'Calcule.\n\n$$' + fr('{{a}}', '{{d}}') + ' + ' + fr('{{b}}', '{{d}}') + ' = ?$$',
    [var('d', LISTE_SANS_DEMI), var('a', '1..{{eval:d-2}}'), var('b', '1..{{eval:d-1-a}}')],
    fr(ev('a+b'), '{{d}}'),
    [ADDITION_CORRECTION,
     '$$' + fr('{{a}}', '{{d}}') + ' + ' + fr('{{b}}', '{{d}}') + ' = '
     + col(fr(ev('a+b'), '{{d}}')) + '$$'])

LE_TOUT = variation(
    'Calcule.\n\n$$' + fr('{{a}}', '{{d}}') + ' + ' + fr('{{b}}', '{{d}}') + ' = ?$$',
    [var('d', LISTE), var('a', '1..{{eval:d-1}}'), var('b', 'eval:d-a')], '1',
    [ADDITION_CORRECTION,
     '${{d}}$ ' + PARTS_MOT + ', c\'est le tout partagé en ${{d}}$ parts égales : c\'est **le'
     ' tout**.',
     '$$' + fr('{{a}}', '{{d}}') + ' + ' + fr('{{b}}', '{{d}}') + ' = ' + fr('{{d}}', '{{d}}')
     + ' = ' + col('1') + '$$'])

TROIS_FOIS = variation(
    'Calcule.\n\n$$' + fr('1', '{{d}}') + ' + ' + fr('1', '{{d}}') + ' + ' + fr('1', '{{d}}')
    + ' = ?$$',
    [var('d', '4|5|6|8|10')], fr('3', '{{d}}'),
    ['Un ' + PART_MOT + ' plus un ' + PART_MOT + ' plus un ' + PART_MOT + ', c\'est trois fois'
     ' un ' + PART_MOT + ' : trois ' + PARTS_MOT + '.',
     '$$' + fr('1', '{{d}}') + ' + ' + fr('1', '{{d}}') + ' + ' + fr('1', '{{d}}') + ' = '
     + col(fr('3', '{{d}}')) + '$$'])

SPECS_ADDITION = [
    spec('BO : 1/5 + 2/5 = 3/5', 0, {'d': '5', 'a': '1', 'b': '2'}, '\\frac{3}{5}', 'correct'),
    spec('Erreur : 3/10 (dénominateurs ajoutés)', 0, {'d': '5', 'a': '1', 'b': '2'},
         '\\frac{3}{10}', 'incorrect'),
    spec('Erreur : 3 (dénominateur oublié)', 0, {'d': '5', 'a': '1', 'b': '2'}, '3', 'incorrect'),
    spec('3/8 + 1/8 = 4/8, non simplifiée juste', 0, {'d': '8', 'a': '3', 'b': '1'},
         '\\frac{4}{8}', 'correct'),
    spec('3/8 + 1/8 = 1/2, même valeur', 0, {'d': '8', 'a': '3', 'b': '1'}, '\\frac{1}{2}',
         'correct'),
    spec('borne : 1/3 + 1/3 = 2/3', 0, {'d': '3', 'a': '1', 'b': '1'}, '\\frac{2}{3}', 'correct'),
    spec('BO : 2/5 + 3/5 = 1', 1, {'d': '5', 'a': '2', 'b': '3'}, '1', 'correct'),
    spec('2/5 + 3/5 = 5/5', 1, {'d': '5', 'a': '2', 'b': '3'}, '\\frac{5}{5}', 'correct'),
    spec('Erreur : 5/10', 1, {'d': '5', 'a': '2', 'b': '3'}, '\\frac{5}{10}', 'incorrect'),
    spec('borne : 1/2 + 1/2 = 1', 1, {'d': '2', 'a': '1', 'b': '1'}, '1', 'correct'),
    spec('BO : 1/8 + 1/8 + 1/8 = 3/8', 2, {'d': '8'}, '\\frac{3}{8}', 'correct'),
    spec('Erreur : 3/24', 2, {'d': '8'}, '\\frac{3}{24}', 'incorrect'),
    spec('borne : 1/4 × 3 = 3/4', 2, {'d': '4'}, '\\frac{3}{4}', 'correct'),
]

# ---- 9. Soustraire (CE1-099) ----

SOUSTRACTION = variation(
    'Calcule.\n\n$$' + fr('{{a}}', '{{d}}') + ' - ' + fr('{{b}}', '{{d}}') + ' = ?$$',
    [var('d', LISTE_SANS_DEMI), var('a', '2..{{d}}'), var('b', '1..{{eval:a-1}}'),
     var('s', 'eval:a-b')],
    fr('{{s}}', '{{d}}'),
    ['On enlève des parts de même taille : ${{a}}$ ' + PARTS_MOT + ' moins ${{b}}$ ' + parts_de('b')
     + ', il reste ${{s}}$ ' + parts_de('s') + '. **Le dénominateur ne change pas.**',
     '$$' + fr('{{a}}', '{{d}}') + ' - ' + fr('{{b}}', '{{d}}') + ' = '
     + col(fr('{{s}}', '{{d}}')) + '$$'])

COMPLEMENT_CORRECTION = ['Le tout, c\'est ${{d}}$ ' + PARTS_MOT + ' : $1 = ' + fr('{{d}}', '{{d}}')
                         + '$.',
                         '$$1 - ' + fr('{{a}}', '{{d}}') + ' = ' + fr('{{d}}', '{{d}}') + ' - '
                         + fr('{{a}}', '{{d}}') + ' = ' + col(fr(ev('d-a'), '{{d}}')) + '$$']

UN_MOINS = variation(
    'Calcule.\n\n$$1 - ' + fr('{{a}}', '{{d}}') + ' = ?$$',
    [var('d', LISTE), var('a', '1..{{eval:d-1}}')], fr(ev('d-a'), '{{d}}'),
    COMPLEMENT_CORRECTION)

# Lucie (exemple du BO) : un problème, pas un calcul → retirée du 09 à la relecture du
# 2026-10-29, gardée pour le lot 4 (problèmes). N'entre dans aucun modèle de ce lot.
LUCIE = variation(
    'Lucie a colorié {{if:a==1|le|les}} $' + fr('{{a}}', '{{d}}') + '$ d\'une figure en bleu et le reste en'
    ' rouge.\n\nQuelle fraction de la figure est coloriée en rouge ?\n\n$$?$$',
    [var('d', LISTE_SANS_DEMI), var('a', '1..{{eval:d-1}}')], fr(ev('d-a'), '{{d}}'),
    ['La figure entière, c\'est le tout : la partie rouge est ce qui manque à la partie bleue'
     ' pour faire le tout.'] + COMPLEMENT_CORRECTION)

SPECS_SOUSTRACTION = [
    spec('BO : 4/5 − 1/5 = 3/5', 0, {'d': '5', 'a': '4', 'b': '1', 's': '3'}, '\\frac{3}{5}', 'correct'),
    spec('Erreur : 3/0 (dénominateurs soustraits)', 0, {'d': '5', 'a': '4', 'b': '1', 's': '3'},
         '\\frac{3}{0}', 'incorrect'),
    spec('Erreur : 3 (dénominateur oublié)', 0, {'d': '5', 'a': '4', 'b': '1', 's': '3'}, '3', 'incorrect'),
    spec('BO : 2/3 − 1/3 = 1/3', 0, {'d': '3', 'a': '2', 'b': '1', 's': '1'}, '\\frac{1}{3}', 'correct'),
    spec('6/8 − 2/8 = 4/8, non simplifiée juste', 0, {'d': '8', 'a': '6', 'b': '2', 's': '4'},
         '\\frac{4}{8}', 'correct'),
    spec('borne : 10/10 − 9/10 = 1/10', 0, {'d': '10', 'a': '10', 'b': '9', 's': '1'}, '\\frac{1}{10}',
         'correct'),
    spec('1 − 3/10 = 7/10', 1, {'d': '10', 'a': '3'}, '\\frac{7}{10}', 'correct'),
    spec('Erreur : 1 − 3/10, 2/10 (1 − 3 lu 3 − 1)', 1, {'d': '10', 'a': '3'}, '\\frac{2}{10}',
         'incorrect'),
    spec('Erreur : 1 − 3/10, 3/10 recopié', 1, {'d': '10', 'a': '3'}, '\\frac{3}{10}',
         'incorrect'),
    spec('borne : 1 − 1/2 = 1/2', 1, {'d': '2', 'a': '1'}, '\\frac{1}{2}', 'correct'),
]

# Pour le lot 4 : variationIndex à recaler sur la place de LUCIE dans son modèle.
SPECS_LUCIE = [
    spec('BO : Lucie, 3/10 bleu, 7/10 rouge', 2, {'d': '10', 'a': '3'}, '\\frac{7}{10}',
         'correct'),
    spec('Erreur : Lucie, la partie bleue (3/10)', 2, {'d': '10', 'a': '3'}, '\\frac{3}{10}',
         'incorrect'),
    spec('Erreur : Lucie, 7 (dénominateur oublié)', 2, {'d': '10', 'a': '3'}, '7', 'incorrect'),
]

MODELES = {
    '01-ecrire-une-fraction-unitaire': modele(
        'Écrire en chiffres une fraction unitaire',
        'Écrire en chiffres un demi, un tiers, un quart… un dixième : un quart → 1/4',
        'Apprivoiser', 'Ecriture', 1, [UNITAIRE_EN_CHIFFRES], SPECS_UNITAIRE_CHIFFRES, 30),
    '02-lire-une-fraction-unitaire': modele(
        'Lire une fraction unitaire',
        'Lire 1/4 : un quart (leurres : « un quatre », une autre part, « un quatrième »)',
        'Apprivoiser', 'Ecriture', 2, [LIRE_UNITAIRE], SPECS_LIRE_UNITAIRE, 30),
    '03-ecrire-une-fraction': modele(
        'Écrire en chiffres une fraction',
        'Trois huitièmes → 3/8',
        'Apprivoiser', 'Ecriture', 3, [EN_CHIFFRES], SPECS_CHIFFRES, 30),
    '04-lire-une-fraction': modele(
        'Lire une fraction',
        'Lire 3/8 : trois huitièmes (leurres : « huit tiers », « trois huit », un numérateur'
        ' voisin)', 'Apprivoiser', 'Ecriture', 4, [LIRE], SPECS_LIRE, 30),
    '05-numerateur-et-denominateur': modele(
        'Numérateur et dénominateur',
        'Le numérateur, le dénominateur de 3/8 ; d\'une bande partagée en 5 parts dont 2 coloriées',
        'Apprivoiser', 'Ecriture', 5, [NUMERATEUR, DENOMINATEUR, PARTAGE], SPECS_MOTS, 30),
    '06-comparer-meme-denominateur': modele(
        'Comparer des fractions de même dénominateur',
        'Comparer 2/5 et 3/5 : le symbole <, = ou >',
        'Apprivoiser', 'Comparer', 6, [MEME_DENOMINATEUR], SPECS_MEME_DENOMINATEUR, 30),
    '07-comparer-numerateur-un': modele(
        'Comparer des fractions de numérateur 1',
        'Comparer 1/5 et 1/3 : plus on fait de parts, plus chaque part est petite',
        'Apprivoiser', 'Comparer', 7, [NUMERATEUR_UN], SPECS_NUMERATEUR_UN, 30),
    '08-additionner-meme-denominateur': modele(
        'Additionner des fractions de même dénominateur',
        '1/5 + 2/5 ; une somme qui fait le tout (2/5 + 3/5 = 1) ; 1/8 + 1/8 + 1/8',
        'Calculer', 'Addition et Soustraction', 13, [ADDITION, LE_TOUT, TROIS_FOIS],
        SPECS_ADDITION),
    '09-soustraire-meme-denominateur': modele(
        'Soustraire des fractions de même dénominateur',
        '4/5 − 1/5 ; 1 − 3/10 (exemples du BO)',
        'Calculer', 'Addition et Soustraction', 14, [SOUSTRACTION, UN_MOINS],
        SPECS_SOUSTRACTION, 60),
}

for nom, m in MODELES.items():
    with open(f'{DOSSIER}/{nom}.json', 'w') as f:
        json.dump(m, f, ensure_ascii=False, indent='\t')
        f.write('\n')
print(len(MODELES), 'modèles écrits')
