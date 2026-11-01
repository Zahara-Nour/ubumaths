"""Écrit les 6 modèles du lot 5b du CM2 (fractions : calculs) dans scripts/questions/cm2-5b/.

Phase 0 du 2026-11-01 (§ 10 du journal `docs/wip/questions-cm2-progress.md`, modèles 6 à 11),
recommandations suivies par David : CM2-021 → modèle neuf à côté de `e320755f` / `8fa3108c`,
corrigé par l'addition itérée ; toute fraction égale acceptée (`reducedFractions: off`).
Bornes : `cycle3.json`, CM2 (dénominateurs au plus 60 ; 3/2 + 7/8, 5/6 − 1/12, 11/40 − 1/8 :
l'un multiple de l'autre, tables ; 3 × 5/4 = 5/4 + 5/4 + 5/4 ; 2/3 de 12 œufs, 3/10 de 500 g,
2/5 de 60 kg). Un point par modèle ; le nœud et le tag sont posés par la migration de rangement,
après le `--publier`.

Jumeau du lot 5a (`lot-cm2-5a.py`, mêmes outils) et du lot 3a du CM1 (`lot-cm1-3a.py` :
soustraction, fraction unitaire d'une quantité).

Décisions et pièges :
- niveaux : suite des niveaux de chaque catégorie, relevés en prod le 2026-11-01 (Addition et
  Soustraction 22, Multiplication 9, Fraction d'une quantité 6) ;
- différences toujours positives ; un dénominateur multiple de l'autre, multiple au plus 60.

    python3 docs/wip/questions/lot-cm2-5b.py scripts/questions/cm2-5b
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


def modele(nom, title, description, subdomain, level, variations, specs):
    # theme / domain / subdomain : anciennes colonnes, remplies pour create-questions ; le
    # rangement (nœud du point) est posé par la migration
    return nom, {'title': title, 'description': description, 'grades': ['CM2'],
                 'theme': 'Fractions', 'domain': 'Calculer', 'subdomain': subdomain,
                 'level': level, 'delay': 30, 'status': 'draft', 'options': OPTIONS,
                 'variations': variations, 'testSpecs': specs}


def var(nom, expression):
    return {'name': nom, 'expression': expression}


def variation(statement, variables, answers, steps, conditions=None):
    # Chaque `?` de l'énoncé est une case, dans l'ordre de `answers`
    v = {'statement': statement, 'variables': variables}
    if conditions:
        v['conditions'] = conditions
    v['blanks'] = [{'expectedAnswer': a} for a in answers]
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


def choix(lignes, melanger=True):
    tete = '' if melanger else 'melanger: non\n'
    return '\n\n```choix\n' + tete + ''.join('- ' + l + '\n' for l in lignes) + '```'


def frac(n, d):
    return '\\frac{' + n + '}{' + d + '}'


# --- Nombres en lettres (0 à 60) et noms des parts (2 à 60) --------------------------------

UNITES = ['zéro', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf', 'dix',
          'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize']
DIZAINES = {2: 'vingt', 3: 'trente', 4: 'quarante', 5: 'cinquante', 6: 'soixante'}


def en_lettres(n):
    if n <= 16:
        return UNITES[n]
    if n < 20:
        return 'dix-' + UNITES[n - 10]
    t, u = divmod(n, 10)
    if u == 0:
        return DIZAINES[t]
    return DIZAINES[t] + (' et un' if u == 1 else '-' + UNITES[u])


def part(n):
    """Nom d'une part de l'unité partagée en n : demi, tiers, quart, cinquième… soixantième."""
    if n <= 4:
        return ['demi', 'tiers', 'quart'][n - 2]
    w = en_lettres(n)
    if w.endswith('cinq'):
        return w + 'uième'
    if w.endswith('neuf'):
        return w[:-1] + 'vième'
    if w.endswith('e'):
        return w[:-1] + 'ième'
    return w + 'ième'


LETTRES = [en_lettres(n) for n in range(61)]
PART = [part(n) for n in range(2, 61)]
PARTS = [p if p == 'tiers' else p + 's' for p in PART]


def lettres(n):
    return selon(n, LETTRES)


def nom_fraction(n, d):
    """« cinq tiers », « un quart » : `n` parts de dénominateur `d` (deux variables)."""
    return (lettres(n) + ' {{if:' + n + '==1|' + selon(d, PART, 2) + '|' + selon(d, PARTS, 2)
            + '}}')


FRAC = frac('{{n}}', '{{d}}')
SENS = ('Le **dénominateur** (en bas) dit en combien de parts égales on partage l\'unité ; le'
        ' **numérateur** (en haut) dit combien de parts on prend.')
MODELES = []


def nb_parts(n, d):
    """« 3 quarts », « 1 tiers » : n en chiffres, nom de la part selon d."""
    return '${{' + n + '}}$ {{if:' + n + '==1|' + selon(d, PART, 2) + '|' + selon(d, PARTS, 2) + '}}'


ADD_SOUS = 'Addition et Soustraction'


# --- 6. CM2-020 : additionner des fractions de même dénominateur ---------------------------

DEUX = variation(
    'Calcule.\n\n$$' + frac('{{a}}', '{{d}}') + ' + ' + frac('{{c}}', '{{d}}') + ' = ?$$',
    [var('d', '3..60'), var('a', '1..{{d}}'), var('c', '1..{{d}}')],
    ['\\frac{{{eval:a+c}}}{{{d}}}'],
    ['**Même dénominateur.** On ajoute des parts de même taille : ' + nb_parts('a', 'd')
     + ' plus ' + nb_parts('c', 'd') + '. **Le dénominateur ne change pas.**',
     '$$' + frac('{{a}}', '{{d}}') + ' + ' + frac('{{c}}', '{{d}}') + ' = '
     + frac('{{a}} + {{c}}', '{{d}}') + ' = ' + col(frac('{{eval:a+c}}', '{{d}}')) + '$$'],
    ['mod(a,d)!=0', 'mod(c,d)!=0', 'a+c<=99'])

TROIS = variation(
    'Calcule.\n\n$$' + frac('{{a}}', '{{d}}') + ' + ' + frac('{{b}}', '{{d}}') + ' + '
    + frac('{{c}}', '{{d}}') + ' = ?$$',
    [var('d', '3..60'), var('a', '1..{{d}}'), var('b', '1..{{d}}'), var('c', '1..{{d}}')],
    ['\\frac{{{eval:a+b+c}}}{{{d}}}'],
    ['**Même dénominateur.** On compte les ' + selon('d', PARTS, 2) + ' : ${{a}} + {{b}} + {{c}}'
     ' = {{eval:a+b+c}}$. **Le dénominateur ne change pas.**',
     '$$' + frac('{{a}}', '{{d}}') + ' + ' + frac('{{b}}', '{{d}}') + ' + '
     + frac('{{c}}', '{{d}}') + ' = ' + col(frac('{{eval:a+b+c}}', '{{d}}')) + '$$'],
    ['mod(a,d)!=0', 'mod(b,d)!=0', 'mod(c,d)!=0', 'a+b+c<=99'])

EX_DEUX = {'d': 12, 'a': 7, 'c': 8}
EX_TROIS = {'d': 25, 'a': 4, 'b': 13, 'c': 9}
MODELES.append(modele(
    '01-additionner-meme-denominateur', 'Additionner des fractions de même dénominateur',
    'Somme de deux ou trois fractions de même dénominateur (7/12 + 8/12 = 15/12) ; dénominateur'
    ' au plus 60, toute fraction égale juste',
    ADD_SOUS, 23, [DEUX, TROIS],
    [spec('7/12 + 8/12 = 15/12', 0, EX_DEUX, '\\frac{15}{12}', 'correct'),
     spec('7/12 + 8/12 = 5/4, même valeur', 0, EX_DEUX, '\\frac{5}{4}', 'correct'),
     spec('Erreur : 15/24 (dénominateurs ajoutés)', 0, EX_DEUX, '\\frac{15}{24}', 'incorrect'),
     spec('Erreur : 15 (dénominateur oublié)', 0, EX_DEUX, '15', 'incorrect'),
     spec('4/25 + 13/25 + 9/25 = 26/25', 1, EX_TROIS, '\\frac{26}{25}', 'correct'),
     spec('Erreur : 26/75 (dénominateurs ajoutés)', 1, EX_TROIS, '\\frac{26}{75}', 'incorrect'),
     spec('Erreur : 17/25 (un terme oublié)', 1, EX_TROIS, '\\frac{17}{25}', 'incorrect')]))


# --- 7. CM2-020 : additionner des fractions de dénominateurs multiples ---------------------
# a/b (petit dénominateur) et c/d avec d = b × k ; `s` échange l'ordre d'affichage

def convertir(a, b, k, ak, d):
    return ('$' + frac(a, b) + ' = ' + frac(a + ' \\times ' + k, b + ' \\times ' + k) + ' = '
            + frac(ak, d) + '$')


MULT_DEUX = variation(
    'Calcule.\n\n$$' + frac('{{gn}}', '{{gd}}') + ' + ' + frac('{{dn}}', '{{dd}}') + ' = ?$$',
    [var('b', '2..10'), var('k', '2..6'), var('d', 'eval:b*k'), var('a', '1..{{eval:2*b}}'),
     var('c', '1..{{eval:2*d}}'), var('ak', 'eval:a*k'), var('s', '0..1'),
     var('gn', 'eval:(1-s)*a+s*c'), var('gd', 'eval:(1-s)*b+s*d'),
     var('dn', 'eval:(1-s)*c+s*a'), var('dd', 'eval:(1-s)*d+s*b')],
    ['\\frac{{{eval:ak+c}}}{{{d}}}'],
    ['**Même dénominateur d\'abord.** ${{d}} = {{b}} \\times {{k}}$ : on écrit $'
     + frac('{{a}}', '{{b}}') + '$ en ' + selon('d', PARTS, 2) + ', en multipliant le numérateur'
     ' et le dénominateur par ${{k}}$.',
     convertir('{{a}}', '{{b}}', '{{k}}', '{{ak}}', '{{d}}') + '.',
     '$$' + frac('{{ak}}', '{{d}}') + ' + ' + frac('{{c}}', '{{d}}') + ' = '
     + col(frac('{{eval:ak+c}}', '{{d}}')) + '$$'],
    ['d<=60', 'mod(a,b)!=0', 'mod(c,d)!=0', 'ak+c<=99'])

# 1/12 + 1/6 + 1/3 : dp | dp × m | dp × m × n (jamais `e`, le nombre d'Euler)
MULT_TROIS = variation(
    'Calcule.\n\n$$' + frac('{{c}}', '{{dg}}') + ' + ' + frac('{{b}}', '{{dm}}') + ' + '
    + frac('{{a}}', '{{dp}}') + ' = ?$$',
    [var('dp', '2..5'), var('m', '2..3'), var('n', '2..3'), var('dm', 'eval:dp*m'),
     var('dg', 'eval:dp*m*n'), var('a', '1..{{eval:dp-1}}'), var('b', '1..{{eval:dm-1}}'),
     var('c', '1..{{eval:dg-1}}'), var('an', 'eval:a*m*n'), var('bn', 'eval:b*n')],
    ['\\frac{{{eval:an+bn+c}}}{{{dg}}}'],
    ['**Même dénominateur d\'abord.** ${{dg}}$ est un multiple de ${{dm}}$ et de ${{dp}}$ : on écrit'
     ' les trois fractions en ' + selon('dg', PARTS, 2) + '.',
     convertir('{{b}}', '{{dm}}', '{{n}}', '{{bn}}', '{{dg}}') + ' et $' + frac('{{a}}', '{{dp}}')
     + ' = ' + frac('{{a}} \\times {{eval:m*n}}', '{{dp}} \\times {{eval:m*n}}') + ' = '
     + frac('{{an}}', '{{dg}}') + '$.',
     '$$' + frac('{{c}}', '{{dg}}') + ' + ' + frac('{{bn}}', '{{dg}}') + ' + '
     + frac('{{an}}', '{{dg}}') + ' = ' + col(frac('{{eval:an+bn+c}}', '{{dg}}')) + '$$'],
    ['dg<=60', 'gcd(a,dp)==1', 'gcd(b,dm)==1', 'gcd(c,dg)==1'])

EX_MD = {'b': 2, 'k': 4, 'd': 8, 'a': 3, 'c': 7, 'ak': 12, 's': 0, 'gn': 3, 'gd': 2, 'dn': 7,
         'dd': 8}
EX_MT = {'dp': 3, 'm': 2, 'n': 2, 'dm': 6, 'dg': 12, 'a': 1, 'b': 1, 'c': 1, 'an': 4, 'bn': 2}
MODELES.append(modele(
    '02-additionner-denominateurs-multiples', 'Additionner des fractions de dénominateurs'
    ' multiples',
    'Somme de fractions dont un dénominateur est multiple des autres : 3/2 + 7/8 = 19/8 ;'
    ' 1/12 + 1/6 + 1/3 = 7/12 ; dénominateurs au plus 60, toute fraction égale juste',
    ADD_SOUS, 24, [MULT_DEUX, MULT_TROIS],
    [spec('3/2 + 7/8 = 19/8', 0, EX_MD, '\\frac{19}{8}', 'correct'),
     spec('Erreur : 10/10 (numérateurs et dénominateurs ajoutés)', 0, EX_MD, '\\frac{10}{10}',
          'incorrect'),
     spec('Erreur : 10/8 (3/2 pas converti)', 0, EX_MD, '\\frac{10}{8}', 'incorrect'),
     spec('Erreur : 19/16 (dénominateur aussi multiplié)', 0, EX_MD, '\\frac{19}{16}',
          'incorrect'),
     spec('1/12 + 1/6 + 1/3 = 7/12', 1, EX_MT, '\\frac{7}{12}', 'correct'),
     spec('Erreur : 3/21 (tout ajouté)', 1, EX_MT, '\\frac{3}{21}', 'incorrect'),
     spec('Erreur : 3/12 (rien converti)', 1, EX_MT, '\\frac{3}{12}', 'incorrect'),
     spec('14/24 : fraction égale, acceptée', 1, EX_MT, '\\frac{14}{24}', 'correct')]))


# --- 8. CM2-135 : soustraire des fractions de même dénominateur ----------------------------

SOUS_MEME = variation(
    'Calcule.\n\n$$' + frac('{{a}}', '{{d}}') + ' - ' + frac('{{c}}', '{{d}}') + ' = ?$$',
    [var('d', '3..60'), var('a', '2..{{eval:2*d}}'), var('c', '1..{{eval:a-1}}')],
    ['\\frac{{{eval:a-c}}}{{{d}}}'],
    ['**Même dénominateur.** On enlève des parts de même taille : ' + nb_parts('a', 'd')
     + ' moins ' + nb_parts('c', 'd') + '. **Le dénominateur ne change pas.**',
     '$$' + frac('{{a}}', '{{d}}') + ' - ' + frac('{{c}}', '{{d}}') + ' = '
     + frac('{{a}} - {{c}}', '{{d}}') + ' = ' + col(frac('{{eval:a-c}}', '{{d}}')) + '$$'],
    ['a<=99', 'mod(a,d)!=0', 'mod(c,d)!=0'])

EX_SM = {'d': 40, 'a': 37, 'c': 12}
MODELES.append(modele(
    '03-soustraire-meme-denominateur', 'Soustraire des fractions de même dénominateur',
    'Différence de deux fractions de même dénominateur (37/40 − 12/40 = 25/40) ; dénominateur au'
    ' plus 60, toute fraction égale juste',
    ADD_SOUS, 25, [SOUS_MEME],
    [spec('37/40 − 12/40 = 25/40', 0, EX_SM, '\\frac{25}{40}', 'correct'),
     spec('37/40 − 12/40 = 5/8, même valeur', 0, EX_SM, '\\frac{5}{8}', 'correct'),
     spec('Erreur : 25/0 (dénominateurs ôtés)', 0, EX_SM, '\\frac{25}{0}', 'incorrect'),
     spec('Erreur : 25 (dénominateur oublié)', 0, EX_SM, '25', 'incorrect'),
     spec('Erreur : 49/40 (ajouté)', 0, EX_SM, '\\frac{49}{40}', 'incorrect')]))


# --- 9. CM2-135 : soustraire des fractions de dénominateurs multiples ----------------------
# d = b × k. V1 : a/b − c/d (5/6 − 1/12, on convertit le premier) ; V2 : c/d − a/b
# (11/40 − 1/8, on convertit le second)

VARS_MULT = [var('b', '2..10'), var('k', '2..6'), var('d', 'eval:b*k'),
             var('a', '1..{{eval:2*b}}'), var('c', '1..{{eval:2*d}}'), var('ak', 'eval:a*k')]
ETAPE_MULT = ('**Même dénominateur d\'abord.** ${{d}} = {{b}} \\times {{k}}$ : on écrit $'
              + frac('{{a}}', '{{b}}') + '$ en ' + selon('d', PARTS, 2) + ', en multipliant le'
              ' numérateur et le dénominateur par ${{k}}$ : '
              + convertir('{{a}}', '{{b}}', '{{k}}', '{{ak}}', '{{d}}') + '.')

PREMIER = variation(
    'Calcule.\n\n$$' + frac('{{a}}', '{{b}}') + ' - ' + frac('{{c}}', '{{d}}') + ' = ?$$',
    VARS_MULT, ['\\frac{{{eval:ak-c}}}{{{d}}}'],
    [ETAPE_MULT, '$$' + frac('{{ak}}', '{{d}}') + ' - ' + frac('{{c}}', '{{d}}') + ' = '
     + col(frac('{{eval:ak-c}}', '{{d}}')) + '$$'],
    ['d<=60', 'mod(a,b)!=0', 'mod(c,d)!=0', 'ak>c', 'ak<=99'])

SECOND = variation(
    'Calcule.\n\n$$' + frac('{{c}}', '{{d}}') + ' - ' + frac('{{a}}', '{{b}}') + ' = ?$$',
    VARS_MULT, ['\\frac{{{eval:c-ak}}}{{{d}}}'],
    [ETAPE_MULT, '$$' + frac('{{c}}', '{{d}}') + ' - ' + frac('{{ak}}', '{{d}}') + ' = '
     + col(frac('{{eval:c-ak}}', '{{d}}')) + '$$'],
    ['d<=60', 'mod(a,b)!=0', 'mod(c,d)!=0', 'c>ak', 'c<=99'])

EX_P = {'b': 6, 'k': 2, 'd': 12, 'a': 5, 'c': 1, 'ak': 10}
EX_S = {'b': 8, 'k': 5, 'd': 40, 'a': 1, 'c': 11, 'ak': 5}
MODELES.append(modele(
    '04-soustraire-denominateurs-multiples', 'Soustraire des fractions de dénominateurs'
    ' multiples',
    'Différence de deux fractions dont un dénominateur est multiple de l\'autre : 5/6 − 1/12 ;'
    ' 11/40 − 1/8 ; dénominateurs au plus 60, toute fraction égale juste',
    ADD_SOUS, 26, [PREMIER, SECOND],
    [spec('5/6 − 1/12 = 9/12', 0, EX_P, '\\frac{9}{12}', 'correct'),
     spec('5/6 − 1/12 = 3/4, même valeur', 0, EX_P, '\\frac{3}{4}', 'correct'),
     spec('Erreur : 4/6 (numérateurs ôtés, premier dénominateur)', 0, EX_P, '\\frac{4}{6}',
          'incorrect'),
     spec('Erreur : 4/12 (5/6 pas converti)', 0, EX_P, '\\frac{4}{12}', 'incorrect'),
     spec('11/40 − 1/8 = 6/40', 1, EX_S, '\\frac{6}{40}', 'correct'),
     spec('Erreur : 10/40 (1/8 pas converti)', 1, EX_S, '\\frac{10}{40}', 'incorrect'),
     spec('Erreur : 10/32 (dénominateurs ôtés)', 1, EX_S, '\\frac{10}{32}', 'incorrect')]))


# --- 10. CM2-021 : multiplier une fraction par un entier (addition itérée) -----------------

def repetee(n_max):
    """« a/d + a/d + a/d » selon n (2 à n_max) ; au-delà de 5 termes, « a/d + a/d + ⋯ + a/d »
    sous une accolade « n fois » (lisible sur un téléphone)."""
    def somme(k):
        if k <= 5:
            return ' + '.join([FRAC_A] * k)
        # espaces avant les accolades fermantes : jamais « }} » collé, lu comme fin de {{if:}}
        return ('\\underbrace{ ' + FRAC_A + ' + ' + FRAC_A + ' + \\cdots + ' + FRAC_A
                + ' }_{ ' + str(k) + ' \\text{ fois} }')
    return selon('n', [somme(k) for k in range(2, n_max + 1)], 2)


FRAC_A = frac('{{a}}', '{{d}}')
PRODUIT = variation(
    'Calcule.\n\n$${{n}} \\times ' + FRAC_A + ' = ?$$',
    [var('n', '2..9'), var('d', '2..60'), var('a', '1..{{eval:2*d}}')],
    ['\\frac{{{eval:n*a}}}{{{d}}}'],
    ['**Multiplier par ${{n}}$, c\'est ajouter ${{n}}$ fois.**',
     '$${{n}} \\times ' + FRAC_A + ' = ' + repetee(9) + '$$',
     nb_parts('a', 'd') + ', ${{n}}$ fois, c\'est ${{eval:n*a}}$ ' + selon('d', PARTS, 2)
     + ' : **le dénominateur ne change pas.**',
     '$${{n}} \\times ' + FRAC_A + ' = ' + col(frac('{{eval:n*a}}', '{{d}}')) + '$$'],
    ['mod(a,d)!=0', 'n*a<=99'])

EX_PROD = {'n': 3, 'd': 4, 'a': 5}
MODELES.append(modele(
    '05-multiplier-une-fraction-par-un-entier', 'Multiplier une fraction par un entier',
    '3 × 5/4 = 5/4 + 5/4 + 5/4 = 15/4 : produit d\'un entier (2 à 9) par une fraction, vu comme'
    ' une addition itérée ; dénominateur au plus 60, toute fraction égale juste',
    'Multiplication', 10, [PRODUIT],
    [spec('3 × 5/4 = 15/4', 0, EX_PROD, '\\frac{15}{4}', 'correct'),
     spec('Erreur : 15/12 (dénominateur aussi multiplié)', 0, EX_PROD, '\\frac{15}{12}',
          'incorrect'),
     spec('Erreur : 8/4 (3 + 5)', 0, EX_PROD, '\\frac{8}{4}', 'incorrect'),
     spec('Erreur : 5/12 (seul le dénominateur multiplié)', 0, EX_PROD, '\\frac{5}{12}',
          'incorrect'),
     spec('Erreur : 3,75 (écriture décimale)', 0, EX_PROD, '3,75', 'bad_form', ['form'])]))


# --- 11. CM2-022 : fraction d'une quantité (numérateur au moins 2) -------------------------
# m/k de n, n = k × p ; une part, c'est p ; m parts, c'est m × p

OBJETS = ['œufs', 'billes', 'élèves', 'images', 'timbres']
UNITES_G = ['g', 'kg', 'L', 'm', '€']
QUANTITE_ETAPES = [
    '**Fraction d\'une quantité.** $' + frac('1', '{{k}}') + '$ de ${{n}}$, c\'est partager en'
    ' ${{k}}$ parts égales : ${{n}} \\div {{k}} = {{p}}$.',
    '$' + frac('{{m}}', '{{k}}') + '$, c\'est ${{m}}$ parts : ${{m}} \\times {{p}} = '
    + col('{{eval:m*p}}') + '$.']

QUANTITE = variation(
    'Calcule $' + frac('{{m}}', '{{k}}') + '$ de ${{n}}$ ' + selon('o', OBJETS) + '.\n\n$'
    + frac('{{m}}', '{{k}}') + '$ de ${{n}}$ ' + selon('o', OBJETS) + ', c\'est $?$ '
    + selon('o', OBJETS) + '.',
    [var('k', '3..10'), var('m', '2..{{eval:k-1}}'), var('p', '2..10'), var('n', 'eval:k*p'),
     var('o', '0..4')],
    ['{{eval:m*p}}'], QUANTITE_ETAPES, ['gcd(m,k)==1'])

GRANDEUR = variation(
    'Calcule $' + frac('{{m}}', '{{k}}') + '$ de ${{n}}$ ' + selon('u', UNITES_G) + '.\n\n$'
    + frac('{{m}}', '{{k}}') + '$ de ${{n}}$ ' + selon('u', UNITES_G) + ', c\'est $?$ '
    + selon('u', UNITES_G) + '.',
    [var('k', '3|4|5|10'), var('m', '2..{{eval:k-1}}'), var('p', '5|10|12|15|20|25|50|100'),
     var('n', 'eval:k*p'), var('u', '0..4')],
    ['{{eval:m*p}}'], QUANTITE_ETAPES, ['gcd(m,k)==1'])

EX_Q = {'k': 3, 'm': 2, 'p': 4, 'n': 12, 'o': 0}
EX_G = {'k': 10, 'm': 3, 'p': 50, 'n': 500, 'u': 0}
EX_G2 = {'k': 5, 'm': 2, 'p': 12, 'n': 60, 'u': 1}
MODELES.append(modele(
    '06-fraction-d-une-quantite', 'Calculer une fraction d\'une quantité',
    'Deux tiers de 12 œufs, trois dixièmes de 500 g : fraction de numérateur au moins 2 d\'une'
    ' quantité ou d\'une grandeur, résultat entier',
    'Fraction d\'une quantité', 7, [QUANTITE, GRANDEUR],
    [spec('2/3 de 12 œufs : 8', 0, EX_Q, '8', 'correct'),
     spec('Erreur : 4 (une part seulement)', 0, EX_Q, '4', 'incorrect'),
     spec('Erreur : 6 (12 ÷ 2)', 0, EX_Q, '6', 'incorrect'),
     spec('Erreur : 24 (12 × 2)', 0, EX_Q, '24', 'incorrect'),
     spec('3/10 de 500 g : 150', 1, EX_G, '150', 'correct'),
     spec('Erreur : 50 (une part seulement)', 1, EX_G, '50', 'incorrect'),
     spec('2/5 de 60 kg : 24', 1, EX_G2, '24', 'correct'),
     spec('Erreur : 30 (60 ÷ 2)', 1, EX_G2, '30', 'incorrect')]))
os.makedirs(DOSSIER, exist_ok=True)
for nom, m in MODELES:
    with open(os.path.join(DOSSIER, nom + '.json'), 'w', encoding='utf-8') as f:
        json.dump(m, f, ensure_ascii=False, indent='\t')
        f.write('\n')
# Mis en forme comme le pre-commit, pour que le script redonne les fichiers commités
subprocess.run(['pnpm', 'exec', 'prettier', '--write', DOSSIER], check=True,
               stdout=subprocess.DEVNULL)
