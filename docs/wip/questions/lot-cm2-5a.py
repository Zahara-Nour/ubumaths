"""Écrit les 5 modèles du lot 5a du CM2 (fractions : sens et écritures) dans scripts/questions/cm2-5a/.

Phase 0 du 2026-11-01 (§ 10 du journal `docs/wip/questions-cm2-progress.md`), recommandations
suivies par David (« tes recos ? » puis « go ») : découpage 5a (sens : 013, 015, 016, 019) / 5b
(calculs) ; toute fraction égale acceptée (`reducedFractions: off`, le CM2 ne simplifie pas).
Bornes : `cycle3.json`, CM2 (dénominateurs au plus 60 ; 58/7 = 8 + 2/7 ; 43/8 entre 5 et 6 ;
17/12 et 17/8 ; 7/4 et 17/10, 13/2 et 20/3 : multiple commun au plus 60, cas simples). Un point
par modèle ; le nœud et le tag sont posés par la migration de rangement, après le `--publier`.

Jumeau du lot 3a du CM1 (`lot-cm1-3a.py`, dénominateurs au plus 20) et des comparaisons de 6e
(`lot-6-fractions.py`, signe en case « choix »).

Décisions et pièges :
- nombres en lettres jusqu'à 60 et noms de parts jusqu'aux soixantièmes, par `{{if:}}` imbriqués
  (tirés par Python, pas écrits à la main) ; numérateur au plus 60 ;
- « écrire en chiffres » : fraction irréductible seulement (`reducedFractions: off` accepte toute
  fraction égale : 9/2 passerait pour « cinquante-quatre douzièmes », 2 pour « vingt-quatre
  douzièmes », mesuré le 2026-11-01) ;
- comparaison à dénominateurs différents (V2) : partie entière w de 0 à 9 tirée d'abord, la même pour les deux (13/2 et 20/3), sinon la comparaison
  se fait sans changer de dénominateur ;
- niveaux : suite des niveaux de chaque catégorie, relevés en prod le 2026-11-01.

    python3 docs/wip/questions/lot-cm2-5a.py scripts/questions/cm2-5a
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
                 'theme': 'Fractions', 'domain': 'Apprivoiser', 'subdomain': subdomain,
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


# --- 1. CM2-013 : lire et écrire une fraction ----------------------------------------------

ECRIRE = variation(
    'Écris en chiffres la fraction « **' + nom_fraction('n', 'd') + '** ».\n\n$$?$$',
    [var('d', '2..60'), var('n', '1..60')],
    ['\\frac{{{n}}}{{{d}}}'],
    ['« ' + nom_fraction('n', 'd') + ' » : on partage l\'unité en ${{d}}$ parts égales et on en'
     ' prend ${{n}}$.', SENS, '$$' + col(FRAC) + '$$'],
    ['gcd(n,d)==1'])

LIRE = variation(
    'Comment lit-on la fraction $' + FRAC + '$ ?'
    + choix([nom_fraction('n', 'd'), lettres('d') + ' ' + selon('n', PARTS, 2),
             lettres('n') + ' ' + lettres('d'), nom_fraction('p', 'd')]),
    [var('d', '2..60'), var('n', '2..59'), var('p', 'eval:n+1')],
    ['0'],
    [SENS, 'Ici, l\'unité est partagée en ${{d}}$ parts égales (des ' + selon('d', PARTS, 2)
     + ') et on en prend ${{n}}$ : $' + FRAC + '$ se lit **« ' + nom_fraction('n', 'd')
     + ' »**.'],
    ['mod(n,d)!=0', 'p!=d'])

MODELES.append(modele(
    '01-lire-et-ecrire-une-fraction', 'Lire et écrire une fraction',
    'Cinquante-trois douzièmes ↔ 53/12 : écrire en chiffres une fraction donnée en lettres, la'
    ' lire parmi quatre écritures ; dénominateur au plus 60',
    'Ecriture', 8, [ECRIRE, LIRE],
    [spec('cinquante-trois douzièmes : 53/12', 0, {'d': 12, 'n': 53}, '\\frac{53}{12}',
          'correct'),
     spec('Erreur : 12/53 (inversée)', 0, {'d': 12, 'n': 53}, '\\frac{12}{53}', 'incorrect'),
     spec('Erreur : 5312', 0, {'d': 12, 'n': 53}, '5312', 'incorrect'),
     spec('vingt et un quarante et unièmes : 21/41', 0, {'d': 41, 'n': 21}, '\\frac{21}{41}',
          'correct'),
     spec('un tiers : 1/3', 0, {'d': 3, 'n': 1}, '\\frac{1}{3}', 'correct'),
     spec('29/35 : vingt-neuf trente-cinquièmes', 1, {'d': 35, 'n': 29, 'p': 30}, '0',
          'correct'),
     spec('Erreur : trente-cinq vingt-neuvièmes', 1, {'d': 35, 'n': 29, 'p': 30}, '1',
          'incorrect'),
     spec('Erreur : vingt-neuf trente-cinq', 1, {'d': 35, 'n': 29, 'p': 30}, '2',
          'incorrect')]))


# --- 2. CM2-015 : entier + fraction inférieure à 1 en une seule fraction -------------------

def regrouper(denominateurs, q, cases):
    """cases : 'numerateur' (q + r/d = ?/d) ou 'fraction' (q + r/d = ?)."""
    variables = [var('d', denominateurs), var('q', q), var('dm', 'eval:d-1'),
                 var('r', '1..{{dm}}'), var('a', 'eval:q*d+r')]
    somme = '{{q}} + ' + frac('{{r}}', '{{d}}')
    if cases == 'numerateur':
        enonce, reponse = somme + ' = \\frac{?}{{{d}}}', '{{a}}'
    else:
        enonce, reponse = somme + ' = ?', '\\frac{{{a}}}{{{d}}}'
    return variation(
        'Écris cette somme sous la forme d\'une seule fraction.\n\n$$' + enonce + '$$',
        variables, [reponse],
        ['**Une unité, c\'est $' + frac('{{d}}', '{{d}}') + '$.** Donc ${{q}}$ unités, c\'est'
         ' ${{q}} \\times {{d}} = {{eval:q*d}}$ ' + selon('d', PARTS, 2) + ' : ${{q}} = '
         + frac('{{eval:q*d}}', '{{d}}') + '$.',
         '$$' + somme + ' = ' + frac('{{eval:q*d}}', '{{d}}') + ' + ' + frac('{{r}}', '{{d}}')
         + ' = ' + col(frac('{{a}}', '{{d}}')) + '$$'],
        ['gcd(r,d)==1'])


EX_TABLE = {'d': 4, 'q': 5, 'dm': 3, 'r': 3, 'a': 23}
EX_GRAND = {'d': 25, 'q': 3, 'dm': 24, 'r': 7, 'a': 82}
MODELES.append(modele(
    '02-entier-plus-fraction-en-une-fraction', 'Écrire un entier plus une fraction comme une'
    ' fraction',
    'Écrire la somme d\'un entier et d\'une fraction inférieure à 1 comme une seule fraction'
    ' (5 + 3/4 = 23/4 ; 3 + 7/25 = 82/25) ; dénominateur au plus 60',
    'Décomposition', 7,
    [regrouper('2..10', '2..9', 'numerateur'),
     regrouper('12|15|20|25|30|40|50|60', '1..4', 'fraction')],
    [spec('5 + 3/4 = 23/4', 0, EX_TABLE, '23', 'correct'),
     spec('Erreur : 8 (5 + 3)', 0, EX_TABLE, '8', 'incorrect'),
     spec('Erreur : 20 (fraction oubliée)', 0, EX_TABLE, '20', 'incorrect'),
     spec('Erreur : 19 (5 × 3 + 4)', 0, EX_TABLE, '19', 'incorrect'),
     spec('3 + 7/25 = 82/25', 1, EX_GRAND, '\\frac{82}{25}', 'correct'),
     spec('Erreur : 10/25 (3 + 7)', 1, EX_GRAND, '\\frac{10}{25}', 'incorrect'),
     spec('Erreur : 3,28 (écriture décimale)', 1, EX_GRAND, '3,28', 'bad_form', ['form']),
     spec('Erreur : 3 + 7/25 recopiée', 1, EX_GRAND, '3+\\frac{7}{25}', 'bad_form', ['form']),
     spec('164/50 : fraction égale, acceptée', 1, EX_GRAND, '\\frac{164}{50}', 'correct'),
     spec('Erreur : 22/25 (3 × 5 + 7)', 1, EX_GRAND, '\\frac{22}{25}', 'incorrect')]))


# --- 3. CM2-016 : encadrer une fraction entre deux entiers consécutifs ---------------------

def encadrer(denominateurs, q, conditions=None):
    return variation(
        'Encadre cette fraction par deux nombres entiers qui se suivent.\n\n$$? < '
        + frac('{{a}}', '{{d}}') + ' < ?$$',
        [var('d', denominateurs), var('q', q), var('dm', 'eval:d-1'), var('r', '1..{{dm}}'),
         var('a', 'eval:q*d+r')],
        ['{{q}}', '{{eval:q+1}}'],
        ['**Combien d\'unités ?** Une unité, c\'est $' + frac('{{d}}', '{{d}}') + '$. On cherche'
         ' le multiple de ${{d}}$ juste avant ${{a}}$ : ${{a}} = {{q}} \\times {{d}} + {{r}}$.',
         '$$' + frac('{{a}}', '{{d}}') + ' = ' + frac('{{eval:q*d}}', '{{d}}') + ' + '
         + frac('{{r}}', '{{d}}') + ' = {{q}} + ' + frac('{{r}}', '{{d}}') + '$$',
         '$' + frac('{{r}}', '{{d}}') + '$ est entre $0$ et $1$, donc $' + col('{{q}}') + ' < '
         + frac('{{a}}', '{{d}}') + ' < ' + col('{{eval:q+1}}') + '$.'],
        conditions)


EX_ENC = {'d': 8, 'q': 5, 'dm': 7, 'r': 3, 'a': 43}
EX_ENC_GRAND = {'d': 25, 'q': 3, 'dm': 24, 'r': 11, 'a': 86}
MODELES.append(modele(
    '03-encadrer-une-fraction', 'Encadrer une fraction entre deux entiers consécutifs',
    'Encadrer une fraction par deux entiers consécutifs à l\'aide des tables (5 < 43/8 < 6) ou'
    ' des multiples de 12, 15, 20, 25, 50, 60 (3 < 86/25 < 4)',
    'Encadrer', 5,
    [encadrer('2..10', '3..9'), encadrer('12|15|20|25|50|60', '1..5', ['a<=200'])],
    [spec('5 < 43/8 < 6', 0, EX_ENC, ['5', '6'], 'correct'),
     spec('Erreur : 8 et 43 (dénominateur et numérateur)', 0, EX_ENC, ['8', '43'], 'incorrect'),
     spec('Erreur : 4 et 5 (décalé d\'un)', 0, EX_ENC, ['4', '5'], 'incorrect'),
     spec('Erreur : 5 et 7 (pas consécutifs)', 0, EX_ENC, ['5', '7'], 'incorrect'),
     spec('3 < 86/25 < 4', 1, EX_ENC_GRAND, ['3', '4'], 'correct'),
     spec('Erreur : 4 et 5', 1, EX_ENC_GRAND, ['4', '5'], 'incorrect')]))


# --- 4. et 5. CM2-019 : comparer des fractions ---------------------------------------------
# a/b et c/d tirés ; `s` échange l'ordre d'affichage ; `r` = indice du signe (0 <, 1 =, 2 >)

SIGNES = ['<', '=', '>']
COMPARE = ('Complète avec le signe qui convient.\n\n$$' + frac('{{gn}}', '{{gd}}') + ' \\ldots '
           + frac('{{dn}}', '{{dd}}') + '$$' + choix(['$<$', '$=$', '$>$'], melanger=False))
CONCLURE = ('$$' + frac('{{gn}}', '{{gd}}') + ' ' + col(selon('r', SIGNES)) + ' '
            + frac('{{dn}}', '{{dd}}') + '$$')
AFFICHAGE = [var('s', '0..1'), var('gn', 'eval:(1-s)*a+s*c'), var('gd', 'eval:(1-s)*b+s*d'),
             var('dn', 'eval:(1-s)*c+s*a'), var('dd', 'eval:(1-s)*d+s*b'),
             var('r', 'eval:sign(gn*dd-dn*gd)+1')]


def compare(variables, steps, conditions):
    return variation(COMPARE, variables + AFFICHAGE, ['{{r}}'], steps + [CONCLURE], conditions)


MEME_DENOMINATEUR = compare(
    [var('b', '10..60'), var('a', '1..{{eval:2*b-1}}'), var('c', '1..{{eval:2*b-1}}'),
     var('d', 'eval:b')],
    ['**Même dénominateur.** Les deux fractions comptent des parts de même taille, des '
     + selon('b', PARTS, 2) + ' : la plus grande est celle qui a le plus grand numérateur.'],
    ['a!=c', 'abs(a-c)<=9', 'mod(a,b)!=0', 'mod(c,b)!=0'])

MEME_NUMERATEUR = compare(
    [var('a', '2..30'), var('b', '2..29'), var('d', '{{eval:b+1}}..30'), var('c', 'eval:a')],
    ['**Même numérateur.** Partager l\'unité en ${{d}}$ donne des parts plus petites qu\'en'
     ' ${{b}}$ : $' + frac('1', '{{d}}') + ' < ' + frac('1', '{{b}}') + '$. Avec ${{a}}$ parts de'
     ' chaque côté, $' + frac('{{a}}', '{{d}}') + ' < ' + frac('{{a}}', '{{b}}') + '$.'],
    ['mod(a,b)!=0', 'mod(a,d)!=0'])

SPEC_DEN = {'b': 40, 'a': 23, 'c': 31, 'd': 40, 's': 0, 'gn': 23, 'gd': 40, 'dn': 31, 'dd': 40,
            'r': 0}
SPEC_NUM = {'a': 17, 'b': 8, 'd': 12, 'c': 17, 's': 1, 'gn': 17, 'gd': 12, 'dn': 17, 'dd': 8,
            'r': 0}
MODELES.append(modele(
    '04-comparer-meme-numerateur-ou-denominateur', 'Comparer deux fractions de même numérateur'
    ' ou de même dénominateur',
    'Comparer deux fractions de même dénominateur (23/40 et 31/40) ou de même numérateur'
    ' (17/12 et 17/8) ; dénominateur au plus 60',
    'Comparer', 15, [MEME_DENOMINATEUR, MEME_NUMERATEUR],
    [spec('23/40 < 31/40', 0, SPEC_DEN, '0', 'correct'),
     spec('Erreur : 23/40 > 31/40', 0, SPEC_DEN, '2', 'incorrect'),
     spec('17/12 < 17/8', 1, SPEC_NUM, '0', 'correct'),
     spec('Erreur : 17/12 > 17/8 (« 12 > 8 »)', 1, SPEC_NUM, '2', 'incorrect')]))

MULTIPLE = compare(
    [var('b', '2..10'), var('m', '2..5'), var('d', 'eval:b*m'), var('a', '1..{{eval:3*b-1}}'),
     var('c', '1..{{eval:3*d-1}}')],
    ['**Même dénominateur.** ${{d}} = {{b}} \\times {{m}}$ : on écrit $' + frac('{{a}}', '{{b}}')
     + '$ avec le dénominateur ${{d}}$, en multipliant numérateur et dénominateur par ${{m}}$.',
     '$' + frac('{{a}}', '{{b}}') + ' = ' + frac('{{a}} \\times {{m}}', '{{b}} \\times {{m}}')
     + ' = ' + frac('{{eval:a*m}}', '{{d}}') + '$ : on compare ${{eval:a*m}}$ et ${{c}}$.'],
    ['d<=60', 'gcd(a,b)==1', 'mod(a,b)!=0', 'mod(c,d)!=0', 'abs(c-a*m)<=3'])

# Dénominateurs dont aucun n'est multiple de l'autre, multiple commun au plus 40
PAIRES = [(2, 3), (2, 5), (3, 4), (3, 5), (4, 5), (4, 6), (4, 10), (6, 8), (6, 9), (6, 10),
          (8, 10)]
COMMUN = compare(
    [var('k', '0..' + str(len(PAIRES) - 1)), var('b', selon('k', [str(p[0]) for p in PAIRES])),
     var('d', selon('k', [str(p[1]) for p in PAIRES])), var('L', 'eval:b*d/gcd(b,d)'),
     var('w', '0..9'), var('ra', '1..{{eval:b-1}}'), var('rc', '1..{{eval:d-1}}'),
     var('a', 'eval:w*b+ra'), var('c', 'eval:w*d+rc')],
    ['**Même dénominateur.** ${{L}}$ est un multiple de ${{b}}$ et de ${{d}}$ : on écrit les deux'
     ' fractions avec le dénominateur ${{L}}$.',
     '$' + frac('{{a}}', '{{b}}') + ' = ' + frac('{{eval:a*L/b}}', '{{L}}') + '$ et $'
     + frac('{{c}}', '{{d}}') + ' = ' + frac('{{eval:c*L/d}}', '{{L}}') + '$ : on compare $'
     + '{{eval:a*L/b}}$ et ${{eval:c*L/d}}$.'],
    ['gcd(ra,b)==1', 'gcd(rc,d)==1'])

SPEC_MUL = {'b': 4, 'm': 3, 'd': 12, 'a': 7, 'c': 20, 's': 0, 'gn': 7, 'gd': 4, 'dn': 20,
            'dd': 12, 'r': 2}
SPEC_EGAL = {'b': 3, 'm': 2, 'd': 6, 'a': 8, 'c': 16, 's': 0, 'gn': 8, 'gd': 3, 'dn': 16,
             'dd': 6, 'r': 1}
SPEC_COM = {'k': 6, 'b': 4, 'd': 10, 'L': 20, 'w': 1, 'ra': 3, 'rc': 7, 'a': 7, 'c': 17, 's': 0, 'gn': 7, 'gd': 4,
            'dn': 17, 'dd': 10, 'r': 2}
SPEC_COM2 = {'k': 0, 'b': 2, 'd': 3, 'L': 6, 'w': 6, 'ra': 1, 'rc': 2, 'a': 13, 'c': 20, 's': 0, 'gn': 13, 'gd': 2,
             'dn': 20, 'dd': 3, 'r': 0}
MODELES.append(modele(
    '05-comparer-denominateurs-differents', 'Comparer deux fractions de dénominateurs'
    ' différents',
    'Écrire deux fractions avec le même dénominateur pour les comparer : l\'un multiple de'
    ' l\'autre (7/4 et 20/12), ou un multiple commun (7/4 et 17/10 ; 13/2 et 20/3)',
    'Comparer', 16, [MULTIPLE, COMMUN],
    [spec('7/4 > 20/12', 0, SPEC_MUL, '2', 'correct'),
     spec('Erreur : 7/4 < 20/12 (« 20 > 7 »)', 0, SPEC_MUL, '0', 'incorrect'),
     spec('8/3 = 16/6', 0, SPEC_EGAL, '1', 'correct'),
     spec('Erreur : 8/3 < 16/6', 0, SPEC_EGAL, '0', 'incorrect'),
     spec('7/4 > 17/10', 1, SPEC_COM, '2', 'correct'),
     spec('Erreur : 7/4 < 17/10', 1, SPEC_COM, '0', 'incorrect'),
     spec('13/2 < 20/3', 1, SPEC_COM2, '0', 'correct'),
     spec('Erreur : 13/2 > 20/3', 1, SPEC_COM2, '2', 'incorrect')]))


os.makedirs(DOSSIER, exist_ok=True)
for nom, m in MODELES:
    with open(os.path.join(DOSSIER, nom + '.json'), 'w', encoding='utf-8') as f:
        json.dump(m, f, ensure_ascii=False, indent='\t')
        f.write('\n')
# Mis en forme comme le pre-commit, pour que le script redonne les fichiers commités
subprocess.run(['pnpm', 'exec', 'prettier', '--write', DOSSIER], check=True,
               stdout=subprocess.DEVNULL)
