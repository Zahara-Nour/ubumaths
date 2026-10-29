"""Écrit les 10 modèles du lot 4 du CE2 (fractions) dans scripts/questions/ce2-4/.

Phase 0 validée par David le 2026-10-29 (« tes recos ? » puis « ok », § 8 du journal
`docs/wip/questions-ce2-progress.md`). Bornes `cycle2.json`, CE2-011, 013, 014 et 089 : fractions
≤ 1 de dénominateur ≤ 12 ; comparer : strictement < 1, trois cas (même dénominateur, même
numérateur, un dénominateur multiple de l'autre) ; + et − : même dénominateur ou un multiple de
l'autre, résultat ≤ 1. Exemples du BO (p.20-21) : 6/8 = 3/4 ; ?/8 = 1/2 ; 5/12 et 7/12, 5/12 et
5/8, 7/12 et 5/6 ; 3/4 + 1/4 ; 3/4 − 1/4. Décisions :

1. La simplification n'est pas du CE2 : `reducedFractions` coupé partout (6/8 juste pour 3/4,
   4/4 comme 1), comme au CE1.
2. Case « choix » (en prod depuis v0.56.0) : comparer avec < = > non mélangé, comme au CE1 ; la
   fraction égale parmi quatre (03). « Lesquelles valent 1/2 ? » (plusieurs réponses) attend le
   lot à QCM.
3. Dénominateur multiple : d de 2 à 6, k de 2 à 6, d × k ≤ 12 (condition `d*k <= 12`).
4. Jamais de variable `e` ni `i` (Euler, unité imaginaire).

    python3 docs/wip/questions/lot-ce2-4.py scripts/questions/ce2-4
"""
import json
import sys

DOSSIER = sys.argv[1]

# ---- Mots ----

DENOMINATEURS = list(range(2, 13))
UNITES = ['', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf', 'dix',
          'onze', 'douze']
PARTS = {2: 'demi', 3: 'tiers', 4: 'quart'}


def part(d):
    """Nom d'une part : demi, tiers, quart, cinquième… douzième."""
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


def parts_de(d, n=None):
    """« quarts » selon la valeur du dénominateur `d` ; au singulier si la variable `n` vaut 1."""
    pluriel = par(d, DENOMINATEURS, parts)
    if n is None:
        return pluriel
    return '{{if:' + n + '==1|' + par(d, DENOMINATEURS, part) + '|' + pluriel + '}}'


# ---- Gabarits ----


def spec(desc, vi, variables, answers, status):
    return {'description': desc, 'variationIndex': vi, 'variables': variables,
            'answers': answers if isinstance(answers, list) else [answers],
            'expected': {'status': status}}


def modele(title, description, domain, subdomain, level, variations, specs, delay=45):
    # theme / domain / subdomain : anciennes colonnes, remplies pour create-questions ; le
    # rangement (sous-notion des fractions) est posé par la migration
    return {'title': title, 'description': description, 'grades': ['CE2'], 'theme': 'Fractions',
            'domain': domain, 'subdomain': subdomain, 'level': level, 'delay': delay,
            'status': 'draft', 'options': {'constraints': {'reducedFractions': 'off'}},
            'variations': variations, 'testSpecs': specs}


def var(nom, expression):
    return {'name': nom, 'expression': expression}


def variation(statement, variables, reponse, steps, conditions=None):
    # Une seule case : `?` dans l'énoncé, ou le bloc ```choix (réponse = indice d'origine)
    v = {'statement': statement, 'variables': variables}
    if conditions:
        v['conditions'] = conditions
    v['blanks'] = [{'expectedAnswer': reponse}]
    v['correction'] = {'steps': steps}
    return v


def choix(lignes, melanger=True):
    tete = '' if melanger else 'melanger: non\n'
    return '\n\n```choix\n' + tete + ''.join('- ' + c + '\n' for c in lignes) + '```'


# Fraction a/d et dénominateur multiple d × k (≤ 12)
MULTIPLE = [var('d', '2..6'), var('k', '2..6'), var('a', '1..{{eval:d-1}}')]
DK = 'd*k <= 12'

EGALITE_REGLE = ('On ne change pas une fraction quand on multiplie (ou qu\'on divise) son'
                 ' numérateur **et** son dénominateur par le même nombre.')

# ---- 1. Le numérateur manquant (CE2-011) ----

FOIS = variation(
    'Complète.\n\n$$' + fr('{{a}}', '{{d}}') + ' = ' + fr('?', ev('d*k')) + '$$',
    MULTIPLE, ev('a*k'),
    [EGALITE_REGLE,
     '$' + ev('d*k') + ' = {{d}} \\times {{k}}$ : le dénominateur est multiplié par ${{k}}$, on'
     ' multiplie aussi le numérateur par ${{k}}$.',
     '$$' + fr('{{a}}', '{{d}}') + ' = ' + fr('{{a}} \\times {{k}}', '{{d}} \\times {{k}}') + ' = '
     + fr(col(ev('a*k')), ev('d*k')) + '$$'],
    conditions=[DK])

DIVISE = variation(
    'Complète.\n\n$$' + fr(ev('a*k'), ev('d*k')) + ' = ' + fr('?', '{{d}}') + '$$',
    MULTIPLE, '{{a}}',
    [EGALITE_REGLE,
     '$' + ev('d*k') + ' = {{d}} \\times {{k}}$ : le dénominateur est divisé par ${{k}}$, on'
     ' divise aussi le numérateur par ${{k}}$.',
     '$$' + fr(ev('a*k'), ev('d*k')) + ' = ' + fr(col('{{a}}'), '{{d}}') + '$$'],
    conditions=[DK])

UN = variation(
    'Complète.\n\n$$1 = ' + fr('?', '{{d}}') + '$$',
    [var('d', '2..12')], '{{d}}',
    ['$1$, c\'est le tout : le tout partagé en ${{d}}$ parts égales, c\'est ${{d}}$ '
     + parts_de('d') + '.',
     '$$1 = ' + fr(col('{{d}}'), '{{d}}') + '$$'])

SPECS_NUMERATEUR = [
    spec('BO : 1/2 = 4/8', 0, {'d': '2', 'k': '4', 'a': '1'}, '4', 'correct'),
    spec('Erreur : 1/2 = 7/8 (on ajoute 6 en haut comme en bas)', 0,
         {'d': '2', 'k': '4', 'a': '1'}, '7', 'incorrect'),
    spec('Erreur : 1/2 = 1/8 (numérateur recopié)', 0, {'d': '2', 'k': '4', 'a': '1'}, '1',
         'incorrect'),
    spec('2/3 = 8/12', 0, {'d': '3', 'k': '4', 'a': '2'}, '8', 'correct'),
    spec('borne : 5/6 = 10/12', 0, {'d': '6', 'k': '2', 'a': '5'}, '10', 'correct'),
    spec('BO : 6/8 = 3/4', 1, {'d': '4', 'k': '2', 'a': '3'}, '3', 'correct'),
    spec('Erreur : 6/8 = 2/4 (on enlève 4 en bas, 4 en haut)', 1,
         {'d': '4', 'k': '2', 'a': '3'}, '2', 'incorrect'),
    spec('4/12 = 1/3', 1, {'d': '3', 'k': '4', 'a': '1'}, '1', 'correct'),
    spec('1 = 8/8', 2, {'d': '8'}, '8', 'correct'),
    spec('Erreur : 1 = 1/8', 2, {'d': '8'}, '1', 'incorrect'),
    spec('borne : 1 = 12/12', 2, {'d': '12'}, '12', 'correct'),
]

# ---- 2. Le dénominateur manquant (CE2-011) ----

FOIS_DEN = variation(
    'Complète.\n\n$$' + fr('{{a}}', '{{d}}') + ' = ' + fr(ev('a*k'), '?') + '$$',
    MULTIPLE, ev('d*k'),
    [EGALITE_REGLE,
     '$' + ev('a*k') + ' = {{a}} \\times {{k}}$ : le numérateur est multiplié par ${{k}}$, on'
     ' multiplie aussi le dénominateur par ${{k}}$.',
     '$$' + fr('{{a}}', '{{d}}') + ' = ' + fr('{{a}} \\times {{k}}', '{{d}} \\times {{k}}') + ' = '
     + fr(ev('a*k'), col(ev('d*k'))) + '$$'],
    conditions=[DK])

DIVISE_DEN = variation(
    'Complète.\n\n$$' + fr(ev('a*k'), ev('d*k')) + ' = ' + fr('{{a}}', '?') + '$$',
    MULTIPLE, '{{d}}',
    [EGALITE_REGLE,
     '$' + ev('a*k') + ' = {{a}} \\times {{k}}$ : le numérateur est divisé par ${{k}}$, on'
     ' divise aussi le dénominateur par ${{k}}$.',
     '$$' + fr(ev('a*k'), ev('d*k')) + ' = ' + fr('{{a}}', col('{{d}}')) + '$$'],
    conditions=[DK, 'a >= 2'])

SPECS_DENOMINATEUR = [
    spec('BO : 1/2 = 4/8', 0, {'d': '2', 'k': '4', 'a': '1'}, '8', 'correct'),
    spec('Erreur : 1/2 = 4/5 (on ajoute 3 en haut comme en bas)', 0,
         {'d': '2', 'k': '4', 'a': '1'}, '5', 'incorrect'),
    spec('3/4 = 9/12', 0, {'d': '4', 'k': '3', 'a': '3'}, '12', 'correct'),
    spec('Erreur : 3/4 = 9/10', 0, {'d': '4', 'k': '3', 'a': '3'}, '10', 'incorrect'),
    spec('BO : 6/8 = 3/4', 1, {'d': '4', 'k': '2', 'a': '3'}, '4', 'correct'),
    spec('Erreur : 6/8 = 3/5 (on enlève 3 en haut comme en bas)', 1,
         {'d': '4', 'k': '2', 'a': '3'}, '5', 'incorrect'),
    spec('borne : 10/12 = 5/6', 1, {'d': '6', 'k': '2', 'a': '5'}, '6', 'correct'),
]

# ---- 3. La fraction égale, parmi quatre (CE2-011) ----
# Leurres : le même nombre ajouté en haut et en bas, le dénominateur seul multiplié, 1 ajouté en
# haut et en bas. Toutes ≤ 1, dénominateurs ≤ 12 ; aucun leurre n'a la valeur de a/d (a < d,
# k ≥ 2).

LAQUELLE = variation(
    'Quelle fraction est égale à $' + fr('{{a}}', '{{d}}') + '$ ?'
    + choix(['$$' + fr(ev('a*k'), ev('d*k')) + '$$',
             '$$' + fr(ev('a+k'), ev('d+k')) + '$$',
             '$$' + fr('{{a}}', ev('d*k')) + '$$',
             '$$' + fr(ev('a+1'), ev('d+1')) + '$$']),
    MULTIPLE, '0',
    [EGALITE_REGLE,
     '$$' + fr('{{a}}', '{{d}}') + ' = ' + fr('{{a}} \\times {{k}}', '{{d}} \\times {{k}}') + ' = '
     + col(fr(ev('a*k'), ev('d*k'))) + '$$',
     'Ajouter le même nombre en haut et en bas ne donne pas une fraction égale.'],
    conditions=[DK])

SPECS_LAQUELLE = [
    spec('3/4 : 6/8', 0, {'d': '4', 'k': '2', 'a': '3'}, '0', 'correct'),
    spec('Erreur : 3/4, 5/6 (2 ajouté en haut et en bas)', 0, {'d': '4', 'k': '2', 'a': '3'}, '1',
         'incorrect'),
    spec('Erreur : 3/4, 3/8 (dénominateur seul multiplié)', 0, {'d': '4', 'k': '2', 'a': '3'}, '2',
         'incorrect'),
    spec('Erreur : 3/4, 4/5 (1 ajouté en haut et en bas)', 0, {'d': '4', 'k': '2', 'a': '3'}, '3',
         'incorrect'),
    spec('BO : 1/2, 3/6', 0, {'d': '2', 'k': '3', 'a': '1'}, '0', 'correct'),
    spec('borne : 5/6, 10/12', 0, {'d': '6', 'k': '2', 'a': '5'}, '0', 'correct'),
]

# ---- 4. à 6. Comparer (CE2-013) ----
# `r` = indice du signe (0 <, 1 =, 2 >) ; choix non mélangé, comme au CE1

SIGNES = ['<', '=', '>']


def comparer(gauche, droite):
    return ('Complète avec le symbole qui convient.\n\n$$' + gauche + ' \\ldots ' + droite + '$$'
            + choix(['$$<$$', '$$=$$', '$$>$$'], melanger=False))


def conclure(gauche, droite):
    return '$$' + gauche + ' ' + col(par('r', [0, 1, 2], lambda k: SIGNES[k])) + ' ' + droite + '$$'


MEME_DENOMINATEUR = variation(
    comparer(fr('{{a}}', '{{d}}'), fr('{{b}}', '{{d}}')),
    [var('d', '3..12'), var('a', '1..{{eval:d-1}}'), var('b', '1..{{eval:d-1}}'),
     var('r', 'eval:sign(a-b)+1')], '{{r}}',
    ['Les deux fractions partagent le tout en ${{d}}$ parts égales : les parts ont la même'
     ' taille. La plus grande fraction est celle qui prend **le plus de parts**.',
     conclure(fr('{{a}}', '{{d}}'), fr('{{b}}', '{{d}}'))])

SPECS_MEME_DENOMINATEUR = [
    spec('BO : 5/12 < 7/12', 0, {'d': '12', 'a': '5', 'b': '7', 'r': '0'}, '0', 'correct'),
    spec('Erreur : 5/12 > 7/12', 0, {'d': '12', 'a': '5', 'b': '7', 'r': '0'}, '2', 'incorrect'),
    spec('8/9 > 4/9', 0, {'d': '9', 'a': '8', 'b': '4', 'r': '2'}, '2', 'correct'),
    spec('égalité : 3/7 = 3/7', 0, {'d': '7', 'a': '3', 'b': '3', 'r': '1'}, '1', 'correct'),
    spec('Erreur : égalité, > choisi', 0, {'d': '7', 'a': '3', 'b': '3', 'r': '1'}, '2',
         'incorrect'),
]

MEME_NUMERATEUR = variation(
    comparer(fr('{{a}}', '{{p}}'), fr('{{a}}', '{{q}}')),
    [var('a', '2..10'), var('p', '{{eval:a+1}}..12'), var('q', '{{eval:a+1}}..12'),
     var('r', 'eval:sign(q-p)+1')], '{{r}}',
    ['Les deux fractions prennent ${{a}}$ parts. D\'un côté, le tout est partagé en ${{p}}$ parts'
     ' égales ; de l\'autre, en ${{q}}$. **Plus on fait de parts, plus chaque part est petite.**',
     conclure(fr('{{a}}', '{{p}}'), fr('{{a}}', '{{q}}'))])

SPECS_MEME_NUMERATEUR = [
    spec('BO : 5/12 < 5/8', 0, {'a': '5', 'p': '12', 'q': '8', 'r': '0'}, '0', 'correct'),
    spec('Erreur : 5/12 > 5/8 (car 12 > 8)', 0, {'a': '5', 'p': '12', 'q': '8', 'r': '0'}, '2',
         'incorrect'),
    spec('3/4 > 3/10', 0, {'a': '3', 'p': '4', 'q': '10', 'r': '2'}, '2', 'correct'),
    spec('Erreur : 3/4 < 3/10 (car 4 < 10)', 0, {'a': '3', 'p': '4', 'q': '10', 'r': '2'}, '0',
         'incorrect'),
    spec('égalité : 2/9 = 2/9', 0, {'a': '2', 'p': '9', 'q': '9', 'r': '1'}, '1', 'correct'),
    spec('borne : 10/11 > 10/12', 0, {'a': '10', 'p': '11', 'q': '12', 'r': '2'}, '2', 'correct'),
]

# Dénominateur multiple : la petite fraction a/d se réécrit en (a × k)/(d × k), puis même
# dénominateur. Deux variations : a/d à gauche, à droite.
MULTIPLE_COMPARE = MULTIPLE + [var('b', '1..{{eval:d*k-1}}')]
REECRIRE = ('$' + fr('{{a}}', '{{d}}') + ' = ' + fr('{{a}} \\times {{k}}', '{{d}} \\times {{k}}')
            + ' = ' + fr(ev('a*k'), ev('d*k')) + '$ : les deux fractions ont maintenant le même'
            ' dénominateur, la plus grande est celle qui prend **le plus de parts**.')

PETITE_A_GAUCHE = variation(
    comparer(fr('{{a}}', '{{d}}'), fr('{{b}}', ev('d*k'))),
    MULTIPLE_COMPARE + [var('r', 'eval:sign(a*k-b)+1')], '{{r}}',
    [REECRIRE, conclure(fr(ev('a*k'), ev('d*k')), fr('{{b}}', ev('d*k'))),
     'Donc :' + conclure(fr('{{a}}', '{{d}}'), fr('{{b}}', ev('d*k')))],
    conditions=[DK])

PETITE_A_DROITE = variation(
    comparer(fr('{{b}}', ev('d*k')), fr('{{a}}', '{{d}}')),
    MULTIPLE_COMPARE + [var('r', 'eval:sign(b-a*k)+1')], '{{r}}',
    [REECRIRE, conclure(fr('{{b}}', ev('d*k')), fr(ev('a*k'), ev('d*k'))),
     'Donc :' + conclure(fr('{{b}}', ev('d*k')), fr('{{a}}', '{{d}}'))],
    conditions=[DK])

SPECS_MULTIPLE = [
    spec('BO : 5/6 > 7/12', 0, {'d': '6', 'k': '2', 'a': '5', 'b': '7', 'r': '2'}, '2', 'correct'),
    spec('Erreur : 5/6 < 7/12 (car 6 < 12)', 0, {'d': '6', 'k': '2', 'a': '5', 'b': '7', 'r': '2'},
         '0', 'incorrect'),
    spec('égalité : 1/2 = 3/6', 0, {'d': '2', 'k': '3', 'a': '1', 'b': '3', 'r': '1'}, '1',
         'correct'),
    spec('1/3 < 5/9', 0, {'d': '3', 'k': '3', 'a': '1', 'b': '5', 'r': '0'}, '0', 'correct'),
    spec('BO : 7/12 < 5/6', 1, {'d': '6', 'k': '2', 'a': '5', 'b': '7', 'r': '0'}, '0', 'correct'),
    spec('Erreur : 7/12 > 5/6 (car 7 > 5)', 1, {'d': '6', 'k': '2', 'a': '5', 'b': '7', 'r': '0'},
         '2', 'incorrect'),
    spec('égalité : 6/8 = 3/4', 1, {'d': '4', 'k': '2', 'a': '3', 'b': '6', 'r': '1'}, '1',
         'correct'),
]

# ---- 7. Additionner, même dénominateur (CE2-014) ----

ADDITION_CORRECTION = ('On ajoute des parts de même taille : ${{a}}$ ' + parts_de('d', 'a')
                       + ' plus ${{b}}$ ' + parts_de('d', 'b') + ', cela fait ${{eval:a+b}}$ '
                       + parts_de('d') + '. **Le dénominateur ne change pas.**')

ADDITION = variation(
    'Calcule.\n\n$$' + fr('{{a}}', '{{d}}') + ' + ' + fr('{{b}}', '{{d}}') + ' = ?$$',
    [var('d', '3..12'), var('a', '1..{{eval:d-2}}'), var('b', '1..{{eval:d-1-a}}')],
    fr(ev('a+b'), '{{d}}'),
    [ADDITION_CORRECTION,
     '$$' + fr('{{a}}', '{{d}}') + ' + ' + fr('{{b}}', '{{d}}') + ' = '
     + col(fr(ev('a+b'), '{{d}}')) + '$$'])

LE_TOUT = variation(
    'Calcule.\n\n$$' + fr('{{a}}', '{{d}}') + ' + ' + fr('{{b}}', '{{d}}') + ' = ?$$',
    [var('d', '2..12'), var('a', '1..{{eval:d-1}}'), var('b', 'eval:d-a')], '1',
    [ADDITION_CORRECTION,
     '${{d}}$ ' + parts_de('d') + ', c\'est le tout partagé en ${{d}}$ parts égales : c\'est'
     ' **le tout**.',
     '$$' + fr('{{a}}', '{{d}}') + ' + ' + fr('{{b}}', '{{d}}') + ' = ' + fr('{{d}}', '{{d}}')
     + ' = ' + col('1') + '$$'])

SPECS_ADDITION = [
    spec('5/12 + 4/12 = 9/12', 0, {'d': '12', 'a': '5', 'b': '4'}, '\\frac{9}{12}', 'correct'),
    spec('5/12 + 4/12 = 3/4, même valeur', 0, {'d': '12', 'a': '5', 'b': '4'}, '\\frac{3}{4}',
         'correct'),
    spec('Erreur : 9/24 (dénominateurs ajoutés)', 0, {'d': '12', 'a': '5', 'b': '4'},
         '\\frac{9}{24}', 'incorrect'),
    spec('Erreur : 9 (dénominateur oublié)', 0, {'d': '12', 'a': '5', 'b': '4'}, '9', 'incorrect'),
    spec('borne : 1/3 + 1/3 = 2/3', 0, {'d': '3', 'a': '1', 'b': '1'}, '\\frac{2}{3}', 'correct'),
    spec('BO : 3/4 + 1/4 = 1', 1, {'d': '4', 'a': '3', 'b': '1'}, '1', 'correct'),
    spec('BO : 3/4 + 1/4 = 4/4', 1, {'d': '4', 'a': '3', 'b': '1'}, '\\frac{4}{4}', 'correct'),
    spec('Erreur : 4/8', 1, {'d': '4', 'a': '3', 'b': '1'}, '\\frac{4}{8}', 'incorrect'),
    spec('borne : 7/11 + 4/11 = 1', 1, {'d': '11', 'a': '7', 'b': '4'}, '1', 'correct'),
]

# ---- 8. Additionner, un dénominateur multiple de l'autre (CE2-014) ----
# a/d + b/(d × k), somme ≤ 1 ; deux variations : a/d en premier, en second

MULTIPLE_CALCUL = MULTIPLE + [var('b', '1..{{eval:d*k-1}}')]
REECRIRE_CALCUL = ('Les dénominateurs ne sont pas les mêmes : on écrit $' + fr('{{a}}', '{{d}}')
                   + '$ en ' + parts_de('n') + '. $' + fr('{{a}}', '{{d}}') + ' = '
                   + fr('{{a}} \\times {{k}}', '{{d}} \\times {{k}}') + ' = '
                   + fr(ev('a*k'), ev('d*k')) + '$.')
# `n` = d × k, pour nommer les parts (« douzièmes »)
N = var('n', 'eval:d*k')

SOMME_1 = variation(
    'Calcule.\n\n$$' + fr('{{a}}', '{{d}}') + ' + ' + fr('{{b}}', '{{n}}') + ' = ?$$',
    MULTIPLE_CALCUL + [N], fr(ev('a*k+b'), '{{n}}'),
    [REECRIRE_CALCUL,
     '$$' + fr('{{a}}', '{{d}}') + ' + ' + fr('{{b}}', '{{n}}') + ' = ' + fr(ev('a*k'), '{{n}}')
     + ' + ' + fr('{{b}}', '{{n}}') + ' = ' + col(fr(ev('a*k+b'), '{{n}}')) + '$$'],
    conditions=[DK, 'a*k + b <= d*k'])

SOMME_2 = variation(
    'Calcule.\n\n$$' + fr('{{b}}', '{{n}}') + ' + ' + fr('{{a}}', '{{d}}') + ' = ?$$',
    MULTIPLE_CALCUL + [N], fr(ev('a*k+b'), '{{n}}'),
    [REECRIRE_CALCUL,
     '$$' + fr('{{b}}', '{{n}}') + ' + ' + fr('{{a}}', '{{d}}') + ' = ' + fr('{{b}}', '{{n}}')
     + ' + ' + fr(ev('a*k'), '{{n}}') + ' = ' + col(fr(ev('a*k+b'), '{{n}}')) + '$$'],
    conditions=[DK, 'a*k + b <= d*k'])

V_1_2_1_4 = {'d': '2', 'k': '2', 'a': '1', 'b': '1', 'n': '4'}
V_1_3_1_6 = {'d': '3', 'k': '2', 'a': '1', 'b': '1', 'n': '6'}

SPECS_SOMME_MULTIPLE = [
    spec('1/2 + 1/4 = 3/4', 0, V_1_2_1_4, '\\frac{3}{4}', 'correct'),
    spec('Erreur : 2/6 (numérateurs et dénominateurs ajoutés)', 0, V_1_2_1_4, '\\frac{2}{6}',
         'incorrect'),
    spec('Erreur : 2/4 (numérateurs ajoutés, sans réécrire 1/2)', 0, V_1_2_1_4, '\\frac{2}{4}',
         'incorrect'),
    spec('1/3 + 1/6 = 3/6', 0, V_1_3_1_6, '\\frac{3}{6}', 'correct'),
    spec('1/3 + 1/6 = 1/2, même valeur', 0, V_1_3_1_6, '\\frac{1}{2}', 'correct'),
    spec('le tout : 1/2 + 2/4 = 1', 0, {'d': '2', 'k': '2', 'a': '1', 'b': '2', 'n': '4'}, '1',
         'correct'),
    spec('le tout : 1/2 + 2/4 = 4/4', 0, {'d': '2', 'k': '2', 'a': '1', 'b': '2', 'n': '4'},
         '\\frac{4}{4}', 'correct'),
    spec('1/4 + 1/2 = 3/4', 1, V_1_2_1_4, '\\frac{3}{4}', 'correct'),
    spec('borne : 5/12 + 1/2 = 11/12', 1, {'d': '2', 'k': '6', 'a': '1', 'b': '5', 'n': '12'},
         '\\frac{11}{12}', 'correct'),
    spec('Erreur : 6/14', 1, {'d': '2', 'k': '6', 'a': '1', 'b': '5', 'n': '12'},
         '\\frac{6}{14}', 'incorrect'),
]

# ---- 9. Soustraire, même dénominateur (CE2-089) ----

SOUSTRACTION = variation(
    'Calcule.\n\n$$' + fr('{{a}}', '{{d}}') + ' - ' + fr('{{b}}', '{{d}}') + ' = ?$$',
    [var('d', '3..12'), var('a', '2..{{d}}'), var('b', '1..{{eval:a-1}}'),
     var('s', 'eval:a-b')],
    fr('{{s}}', '{{d}}'),
    ['On enlève des parts de même taille : ${{a}}$ ' + parts_de('d') + ' moins ${{b}}$ '
     + parts_de('d', 'b') + ', il reste ${{s}}$ ' + parts_de('d', 's') + '. **Le dénominateur ne'
     ' change pas.**',
     '$$' + fr('{{a}}', '{{d}}') + ' - ' + fr('{{b}}', '{{d}}') + ' = '
     + col(fr('{{s}}', '{{d}}')) + '$$'])

UN_MOINS = variation(
    'Calcule.\n\n$$1 - ' + fr('{{a}}', '{{d}}') + ' = ?$$',
    [var('d', '2..12'), var('a', '1..{{eval:d-1}}')], fr(ev('d-a'), '{{d}}'),
    ['Le tout, c\'est ${{d}}$ ' + parts_de('d') + ' : $1 = ' + fr('{{d}}', '{{d}}') + '$.',
     '$$1 - ' + fr('{{a}}', '{{d}}') + ' = ' + fr('{{d}}', '{{d}}') + ' - '
     + fr('{{a}}', '{{d}}') + ' = ' + col(fr(ev('d-a'), '{{d}}')) + '$$'])

SPECS_SOUSTRACTION = [
    spec('BO : 3/4 − 1/4 = 2/4', 0, {'d': '4', 'a': '3', 'b': '1', 's': '2'}, '\\frac{2}{4}',
         'correct'),
    spec('BO : 3/4 − 1/4 = 1/2, même valeur', 0, {'d': '4', 'a': '3', 'b': '1', 's': '2'},
         '\\frac{1}{2}', 'correct'),
    spec('Erreur : 2/0 (dénominateurs soustraits)', 0, {'d': '4', 'a': '3', 'b': '1', 's': '2'},
         '\\frac{2}{0}', 'incorrect'),
    spec('Erreur : 2 (dénominateur oublié)', 0, {'d': '4', 'a': '3', 'b': '1', 's': '2'}, '2',
         'incorrect'),
    spec('borne : 12/12 − 11/12 = 1/12', 0, {'d': '12', 'a': '12', 'b': '11', 's': '1'},
         '\\frac{1}{12}', 'correct'),
    spec('1 − 5/9 = 4/9', 1, {'d': '9', 'a': '5'}, '\\frac{4}{9}', 'correct'),
    spec('Erreur : 1 − 5/9, 5/9 recopié', 1, {'d': '9', 'a': '5'}, '\\frac{5}{9}', 'incorrect'),
    spec('Erreur : 1 − 5/9, 4/8 (1 retiré en haut et en bas)', 1, {'d': '9', 'a': '5'},
         '\\frac{4}{8}', 'incorrect'),
    spec('borne : 1 − 1/2 = 1/2', 1, {'d': '2', 'a': '1'}, '\\frac{1}{2}', 'correct'),
]

# ---- 10. Soustraire, un dénominateur multiple de l'autre (CE2-089) ----

DIFF_1 = variation(
    'Calcule.\n\n$$' + fr('{{a}}', '{{d}}') + ' - ' + fr('{{b}}', '{{n}}') + ' = ?$$',
    MULTIPLE_CALCUL + [N], fr(ev('a*k-b'), '{{n}}'),
    [REECRIRE_CALCUL,
     '$$' + fr('{{a}}', '{{d}}') + ' - ' + fr('{{b}}', '{{n}}') + ' = ' + fr(ev('a*k'), '{{n}}')
     + ' - ' + fr('{{b}}', '{{n}}') + ' = ' + col(fr(ev('a*k-b'), '{{n}}')) + '$$'],
    conditions=[DK, 'b < a*k'])

DIFF_2 = variation(
    'Calcule.\n\n$$' + fr('{{b}}', '{{n}}') + ' - ' + fr('{{a}}', '{{d}}') + ' = ?$$',
    MULTIPLE_CALCUL + [N], fr(ev('b-a*k'), '{{n}}'),
    [REECRIRE_CALCUL,
     '$$' + fr('{{b}}', '{{n}}') + ' - ' + fr('{{a}}', '{{d}}') + ' = ' + fr('{{b}}', '{{n}}')
     + ' - ' + fr(ev('a*k'), '{{n}}') + ' = ' + col(fr(ev('b-a*k'), '{{n}}')) + '$$'],
    conditions=[DK, 'b > a*k'])

V_3_4_1_2 = {'d': '2', 'k': '2', 'a': '1', 'b': '3', 'n': '4'}

SPECS_DIFF_MULTIPLE = [
    spec('2/3 − 1/6 = 3/6', 0,
         {'d': '3', 'k': '2', 'a': '2', 'b': '1', 'n': '6'}, '\\frac{3}{6}', 'correct'),
    spec('2/3 − 1/6 = 1/2, même valeur', 0, {'d': '3', 'k': '2', 'a': '2', 'b': '1', 'n': '6'},
         '\\frac{1}{2}', 'correct'),
    spec('Erreur : 1/3 (numérateurs soustraits, sans réécrire 2/3)', 0,
         {'d': '3', 'k': '2', 'a': '2', 'b': '1', 'n': '6'}, '\\frac{1}{3}', 'incorrect'),
    spec('BO : 3/4 − 1/2 = 1/4', 1, V_3_4_1_2, '\\frac{1}{4}', 'correct'),
    spec('Erreur : 2/2 (numérateurs et dénominateurs soustraits)', 1, V_3_4_1_2, '\\frac{2}{2}',
         'incorrect'),
    spec('Erreur : 2/4 (numérateurs soustraits, sans réécrire 1/2)', 1, V_3_4_1_2,
         '\\frac{2}{4}', 'incorrect'),
    spec('5/6 − 1/3 = 3/6', 1, {'d': '3', 'k': '2', 'a': '1', 'b': '5', 'n': '6'},
         '\\frac{3}{6}', 'correct'),
    spec('borne : 11/12 − 1/2 = 5/12', 1, {'d': '2', 'k': '6', 'a': '1', 'b': '11', 'n': '12'},
         '\\frac{5}{12}', 'correct'),
]

MODELES = {
    '01-numerateur-manquant': modele(
        'Égalité de fractions : le numérateur manquant',
        '1/2 = ?/8 ; 6/8 = ?/4 ; 1 = ?/8 (exemples du BO)',
        'Apprivoiser', 'Egalité de fractions', 6, [FOIS, DIVISE, UN], SPECS_NUMERATEUR),
    '02-denominateur-manquant': modele(
        'Égalité de fractions : le dénominateur manquant',
        '1/2 = 4/? ; 6/8 = 3/?',
        'Apprivoiser', 'Egalité de fractions', 7, [FOIS_DEN, DIVISE_DEN], SPECS_DENOMINATEUR),
    '03-fraction-egale': modele(
        'Trouver la fraction égale',
        'Parmi quatre, la fraction égale à 3/4 (leurres : même nombre ajouté en haut et en bas,'
        ' dénominateur seul multiplié)',
        'Apprivoiser', 'Egalité de fractions', 8, [LAQUELLE], SPECS_LAQUELLE, 30),
    '04-comparer-meme-denominateur': modele(
        'Comparer des fractions de même dénominateur',
        'Comparer 5/12 et 7/12 : le symbole <, = ou >',
        'Apprivoiser', 'Comparer', 11, [MEME_DENOMINATEUR], SPECS_MEME_DENOMINATEUR, 30),
    '05-comparer-meme-numerateur': modele(
        'Comparer des fractions de même numérateur',
        'Comparer 5/12 et 5/8 : plus on fait de parts, plus chaque part est petite',
        'Apprivoiser', 'Comparer', 12, [MEME_NUMERATEUR], SPECS_MEME_NUMERATEUR, 30),
    '06-comparer-denominateur-multiple': modele(
        'Comparer des fractions dont un dénominateur est multiple de l\'autre',
        'Comparer 7/12 et 5/6 : on écrit 5/6 en douzièmes',
        'Apprivoiser', 'Comparer', 13, [PETITE_A_GAUCHE, PETITE_A_DROITE], SPECS_MULTIPLE),
    '07-additionner-meme-denominateur': modele(
        'Additionner des fractions de même dénominateur',
        '5/12 + 4/12 ; une somme qui fait le tout (3/4 + 1/4 = 1)',
        'Calculer', 'Addition et Soustraction', 14, [ADDITION, LE_TOUT], SPECS_ADDITION),
    '08-additionner-denominateur-multiple': modele(
        'Additionner des fractions dont un dénominateur est multiple de l\'autre',
        '1/2 + 1/4 ; 1/3 + 1/6 : on écrit les deux fractions avec le même dénominateur',
        'Calculer', 'Addition et Soustraction', 18, [SOMME_1, SOMME_2], SPECS_SOMME_MULTIPLE, 60),
    '09-soustraire-meme-denominateur': modele(
        'Soustraire des fractions de même dénominateur',
        '3/4 − 1/4 (exemple du BO) ; 1 − 5/9',
        'Calculer', 'Addition et Soustraction', 19, [SOUSTRACTION, UN_MOINS], SPECS_SOUSTRACTION),
    '10-soustraire-denominateur-multiple': modele(
        'Soustraire des fractions dont un dénominateur est multiple de l\'autre',
        '3/4 − 1/2 ; 2/3 − 1/6 : on écrit les deux fractions avec le même dénominateur',
        'Calculer', 'Addition et Soustraction', 20, [DIFF_1, DIFF_2], SPECS_DIFF_MULTIPLE, 60),
}

for nom, m in MODELES.items():
    with open(f'{DOSSIER}/{nom}.json', 'w') as f:
        json.dump(m, f, ensure_ascii=False, indent='\t')
        f.write('\n')
print(len(MODELES), 'modèles écrits')
