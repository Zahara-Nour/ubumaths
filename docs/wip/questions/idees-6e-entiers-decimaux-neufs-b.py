"""Écrit les modèles neufs N4, N5, N6 du chantier idees-6e-entiers-decimaux.

Sortie : scripts/questions/idees-6e-entiers-decimaux-neufs-b/. Phase 0 validée par David le
2026-11-23 (journal docs/wip/idees-6e-entiers-decimaux-progress.md, section « Modèles neufs ») ;
idées reprises d'ailleurs, forme de chez nous.

- N4 (6-101) « Lire et écrire un nombre décimal » de 6e. Q1 tranchée : modèle neuf, à part du
  CM2 (bc2cc245, jusqu'à 57 unités). Ici jusqu'à 999 999,999. (v0) lettres → chiffres avec
  « virgule » ; (v1) lettres → chiffres, « … unités et … millièmes » ; (v2) chiffres → lettres,
  mots à glisser (bloc ```trous, comme e76ab26f) : une saisie libre en lettres a trop
  d'écritures justes. Orthographe de 1990 : traits d'union partout ; « mille » invariable ;
  « vingt » et « cent » au pluriel seulement multipliés et en fin de nombre.
- N5 (6-106) « Compléter un tableau d'écritures » (titre gardé, en base). Quatre nombres, une
  égalité par nombre (décimal = fraction = pourcentage), une écriture donnée par ligne à une
  place fixe (décimal, fraction, pourcentage, fraction) : le nombre de cases et leur ordre
  doivent être les mêmes à chaque tirage. D'abord écrit en tableau ; décision de David du
  2026-11-23 : une égalité par ligne, le tableau débordant sur un téléphone (390 px). Le signe
  % est écrit après la case : la réponse est le nombre seul.
- N6 (6-106) « Nombre mixte et écriture décimale » : (v0) décimal → entier + fraction décimale
  < 1 ; (v1) nombre mixte → une seule fraction décimale ; (v2) fraction décimale > 1 → nombre
  mixte ; (v3) exemple du BO 6/5 = 1 + 1/5 = 1,2 (dénominateurs 2, 4, 5) ; (v4) décimal < 1 →
  pourcentage (0,125 = 12,5 %). Pas de pourcentage au-delà de 100 % (bornes de 6-105).

Grades 6. Ni theme, ni domain, ni subdomain, ni id, ni rangement (fait plus tard par
migration). Points visés : N4 → 6-101, N5 et N6 → 6-106.

Réglage commun : « Espaces dès 4 chiffres » (spacesFromFourDigits).

Règles suivies (couvrir-un-niveau.md § 5) : erreurs prévues sur chaque case d'écriture
ordinaire (vraies erreurs d'élèves, sans en inventer pour atteindre trois), chacune avec sa spec
`incorrect` qui nomme son message ; un coup de pouce par variation, qui ne donne jamais la
réponse ; la consigne dit la forme exigée, et une forme juste mais autre est refusée par
`requiredForm` (spec `bad_form`). Le texte à trous (N4 v2) n'a pas d'erreurs prévues : ce n'est
pas une case d'écriture ordinaire.

Usage : python3 docs/wip/questions/idees-6e-entiers-decimaux-neufs-b.py \
            scripts/questions/idees-6e-entiers-decimaux-neufs-b
"""
import json
import os
import sys

DOSSIER = sys.argv[1]

PRIMAIRE = '\\textcolor{{{color:primary.0}}}'
OPTIONS = {'constraints': {'spacesFromFourDigits': True}}
# N5 et N6 : une fraction décimale non simplifiée (5/10, 82/100) est la forme demandée
OPTIONS_FRACTIONS = {'constraints': {'spacesFromFourDigits': True, 'reducedFractions': 'off'}}
# N5 : de plus, un décimal (0,25) dans une case de pourcentage est refusé, pas seulement remarqué
OPTIONS_N5 = {'constraints': {'spacesFromFourDigits': True, 'reducedFractions': 'off',
                              'percent': 'strict'}}

# Formes exigées
DECIMALE = {'pattern': 'a:number'}
# Entier + fraction décimale plus petite que 1 (dénominateur 10, 100 ou 1 000)
MIXTE_DECIMAL = {'pattern': 'a:integer + p:integer & gte(0) & lt(w) / w:(eq(10) | eq(100) | eq(1000))'}
# Entier + fraction plus petite que 1, dénominateur quelconque (exemple du BO, 6/5 = 1 + 1/5)
MIXTE = {'pattern': 'a:integer + p:integer & gte(0) & lt(w) / w:integer'}
# Une seule fraction décimale
FRACTION_DECIMALE = {'pattern': 'n:integer / w:(eq(10) | eq(100) | eq(1000))'}
FRACTION = {'pattern': 'n:integer / w:integer'}
FRACTION_100 = {'pattern': 'n:integer / 100'}


def spec(desc, vi, variables_, status, answers, message=None, violations=None):
    expected = {'status': status}
    if message is not None:
        expected['expectedErrorMessage'] = message
    if violations is not None:
        expected['constraintViolations'] = violations
    elif status == 'unoptimal_form':
        expected['constraintViolations'] = ['spaces']
    elif status == 'bad_form':
        expected['constraintViolations'] = ['form']
    return {'description': desc, 'variationIndex': vi, 'variables': variables_,
            'expected': expected, 'answers': answers}


def modele(title, description, level, delay, variations, specs, options=OPTIONS):
    return {'title': title, 'description': description, 'grades': ['6'], 'level': level,
            'delay': delay, 'status': 'draft', 'options': options,
            'variations': variations, 'testSpecs': specs}


def var(nom, expression):
    return {'name': nom, 'expression': expression}


def erreur(answer, message, label):
    return {'answer': answer, 'message': message, 'label': label}


def case(attendue, erreurs=None, forme=None):
    c = {'expectedAnswer': attendue}
    if forme is not None:
        c['requiredForm'] = forme
    if erreurs:
        c['expectedErrors'] = erreurs
    return c


def variation(statement, variables, blanks, steps, hint, conditions=None):
    return {'statement': statement, 'variables': variables, 'conditions': conditions or [],
            'blanks': blanks, 'correction': {'steps': steps}, 'hint': hint}


def ecrire(nom, m):
    os.makedirs(DOSSIER, exist_ok=True)
    chemin = os.path.join(DOSSIER, nom + '.json')
    # Garder l'id écrit en tête par create-questions --publier, s'il existe
    if os.path.exists(chemin):
        with open(chemin, encoding='utf-8') as f:
            ancien = json.load(f)
        if 'id' in ancien:
            m = {'id': ancien['id'], **m}
    with open(chemin, 'w', encoding='utf-8') as f:
        json.dump(m, f, ensure_ascii=False, indent=2)
        f.write('\n')


def selon(v, paires):
    """{{if:v==a|texte_a|{{if:v==b|texte_b|…texte_dernier}}}} : le dernier cas sans test"""
    *debut, (_, dernier) = paires
    texte = dernier
    for valeur, t in reversed(debut):
        texte = '{{if:' + v + '==' + str(valeur) + '|' + t + '|' + texte + '}}'
    return texte


# Nombre de chiffres d'un entier de 0 à 999, dans un eval (0 compte un chiffre)
def chiffres(x):
    return '(1+min(floor(' + x + '/10),1)+min(floor(' + x + '/100),1))'


# Zéros à écrire devant n pour qu'il occupe p chiffres (n < 10^p)
def zeros_devant(n, p):
    return ('{{if:' + p + '==3|{{if:' + n + '<10|00|{{if:' + n + '<100|0|}}}}|{{if:' + p
            + '==2|{{if:' + n + '<10|0|}}|}}}}')


# =============================================================================================
# Nombres en lettres (orthographe de 1990 : traits d'union partout)
# =============================================================================================

UNITES = ['zéro', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf', 'dix',
          'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize']
DIZAINES = ['', '', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante']


def lettres99(n, final=True):
    if n < 17:
        return UNITES[n]
    if n < 20:
        return 'dix-' + UNITES[n - 10]
    if n < 70:
        d, u = divmod(n, 10)
        if u == 0:
            return DIZAINES[d]
        if u == 1:
            return DIZAINES[d] + '-et-un'
        return DIZAINES[d] + '-' + UNITES[u]
    if n < 80:
        return 'soixante-et-onze' if n == 71 else 'soixante-' + lettres99(n - 60)
    if n == 80:
        return 'quatre-vingts' if final else 'quatre-vingt'
    return 'quatre-vingt-' + lettres99(n - 80)


def lettres999(n, final=True):
    h, r = divmod(n, 100)
    if h == 0:
        return lettres99(r, final)
    tete = 'cent' if h == 1 else UNITES[h] + '-cent' + ('s' if r == 0 and final else '')
    return tete + ('-' + lettres99(r, final) if r else '')


def lettres(n):
    m, c = divmod(n, 1000)
    if m == 0:
        return lettres999(c)
    tete = 'mille' if m == 1 else lettres999(m, final=False) + '-mille'
    return tete + ('-' + lettres999(c) if c else '')


# Vérifications de l'orthographe sur des cas connus
assert lettres(80) == 'quatre-vingts'
assert lettres(80000) == 'quatre-vingt-mille'
assert lettres(200) == 'deux-cents'
assert lettres(200080) == 'deux-cent-mille-quatre-vingts'
assert lettres(71081) == 'soixante-et-onze-mille-quatre-vingt-un'
assert lettres(1200) == 'mille-deux-cents'
assert lettres(21000) == 'vingt-et-un-mille'
assert lettres(999999) == 'neuf-cent-quatre-vingt-dix-neuf-mille-neuf-cent-quatre-vingt-dix-neuf'

RANGS = {1: 'dixième', 2: 'centième', 3: 'millième'}


# =============================================================================================
# N4 — 6-101 : lire et écrire un nombre décimal (6e : jusqu'à 999 999,999)
# =============================================================================================

# Milliers m (avant « mille ») et unités c (après) : des zéros intérieurs (c < 100) pour
# l'erreur « zéros oubliés », des 80 et 200 pour l'accord de vingt et cent.
MILLIERS = [1, 2, 7, 15, 21, 40, 80, 96, 105, 200, 312, 480, 700, 999]
UNITES_C = [0, 5, 18, 70, 80, 91, 100, 204, 380, 500, 671, 999]


def mots_milliers(m):
    return 'mille' if m == 1 else lettres999(m, final=False) + '-mille'


ENTIER_LETTRES = (selon('m', [(m, mots_milliers(m)) for m in MILLIERS])
                  + selon('c', [(c, ('-' + lettres999(c)) if c else '') for c in UNITES_C]))

# Partie décimale codée p * 1000 + n (n sur p chiffres après la virgule)
DEC_V0 = [1003, 1008, 2005, 2016, 2047, 2071, 3007, 3025, 3108, 3802, 3999]
DEC_V1 = [1003, 1009, 2005, 2023, 2047, 2081, 3007, 3023, 3065, 3108, 3205, 3999]


def virgule_lettres(code):
    p, n = divmod(code, 1000)
    zeros = p - len(str(n))
    return ' '.join(['zéro'] * zeros + [lettres(n)])


def unites_et_lettres(code):
    p, n = divmod(code, 1000)
    return lettres(n) + ' ' + RANGS[p] + ('s' if n > 1 else '')


VARS_N4 = lambda codes: [  # noqa: E731
    var('m', '|'.join(str(v) for v in MILLIERS)),
    var('c', '|'.join(str(v) for v in UNITES_C)),
    var('k', '|'.join(str(v) for v in codes)),
    var('p', 'eval:floor(k/1000)'),
    var('n', 'eval:mod(k,1000)'),
    var('x', 'eval:1000*m+c+n/10^p;d'),
]

# Écriture groupée à la main (la formule ne groupe pas les chiffres)
ENTIER_CHIFFRES = '{{m}}\\,' + zeros_devant('c', '3') + '{{c}}'
DECIMALES = zeros_devant('n', 'p') + '{{n}}'
NOMBRE_N4 = ENTIER_CHIFFRES + '{,}' + DECIMALES

# Erreurs prévues communes
ERR_ZEROS_ENTIER = erreur(
    '{{eval:m*10^' + chiffres('c') + '+c+n/10^p;d}}',
    'Il manque des zéros dans la partie entière : après « mille », il faut toujours trois '
    'chiffres (centaines, dizaines, unités).',
    'Zéros de la partie entière oubliés')
ERR_MILLE_000 = erreur(
    '{{eval:m*10^(3+' + chiffres('c') + ')+c+n/10^p;d}}',
    'Tu as écrit « mille » avec ses trois zéros, puis la suite à côté : ce qui suit « mille » '
    'prend la place de ces trois zéros.',
    '« mille » écrit 000, suite collée')
ERR_ZEROS_DEC = erreur(
    '{{eval:1000*m+c+n/10^' + chiffres('n') + ';d}}',
    'Il manque un zéro après la virgule : un « zéro » qui se dit s\'écrit aussi.',
    'Zéro de la partie décimale oublié')

ETAPE_ENTIER = ('**La partie entière.** « ' + ENTIER_LETTRES + ' » : ${{m}}$ millier'
                '{{if:m>1|s|}}{{if:c>0| et ${{c}}$ unité{{if:c>1|s|}}|}} ; après « mille », trois chiffres '
                '(centaines, dizaines, unités) : $' + ENTIER_CHIFFRES + '$.')

N4_A = variation(
    'Écris en chiffres le nombre « **' + ENTIER_LETTRES + ' virgule '
    + selon('k', [(k, virgule_lettres(k)) for k in DEC_V0]) + '** ».\n\n$$?$$',
    VARS_N4(DEC_V0),
    [case('{{x}}', [ERR_ZEROS_ENTIER, ERR_MILLE_000, ERR_ZEROS_DEC], DECIMALE)],
    [
        ETAPE_ENTIER,
        '**Après la virgule.** « ' + selon('k', [(k, virgule_lettres(k)) for k in DEC_V0])
        + ' » : on écrit $' + DECIMALES + '$ après la virgule (un « zéro » qui se dit s\'écrit '
        'aussi).',
        '$$' + PRIMAIRE + '{' + NOMBRE_N4 + '}$$',
    ],
    'Coupe le nom au mot « mille » : ce qui est avant donne les milliers, ce qui suit remplit '
    'les trois chiffres des centaines, des dizaines et des unités. Après la virgule, écris les '
    'chiffres dans l\'ordre où on les dit.',
)

N4_B = variation(
    'Écris en chiffres le nombre « **' + ENTIER_LETTRES + ' unités et '
    + selon('k', [(k, unites_et_lettres(k)) for k in DEC_V1]) + '** ».\n\n$$?$$',
    VARS_N4(DEC_V1),
    [case('{{x}}', [
        erreur('{{eval:1000*m+c+n/10^' + chiffres('n') + ';d}}',
               'Ce sont des {{if:p==1|dixièmes|{{if:p==2|centièmes|millièmes}}}} : il faut '
               '${{p}}$ chiffre{{if:p>1|s|}} après la virgule, complète avec des zéros.',
               'Zéros après la virgule oubliés'),
        erreur('{{eval:1000*m+c+n/10^(p+1);d}}',
               'Tu as mis un chiffre de trop après la virgule : des '
               '{{if:p==1|dixièmes|{{if:p==2|centièmes|millièmes}}}}, c\'est ${{p}}$ chiffre'
               '{{if:p>1|s|}} après la virgule.',
               'Un rang de trop'),
        ERR_ZEROS_ENTIER,
    ], DECIMALE)],
    [
        ETAPE_ENTIER,
        '**Après la virgule.** Des {{if:p==1|dixièmes|{{if:p==2|centièmes|millièmes}}}} : '
        '${{p}}$ chiffre{{if:p>1|s|}} après la virgule (dixièmes, centièmes, millièmes) ; '
        '${{n}}$ {{if:p==1|dixième|{{if:p==2|centième|millième}}}}{{if:n>1|s|}} sur ${{p}}$ '
        'chiffre{{if:p>1|s|}} : $' + DECIMALES + '$.',
        '$$' + PRIMAIRE + '{' + NOMBRE_N4 + '}$$',
    ],
    'Coupe le nom au mot « mille » pour la partie entière. Après la virgule, des dixièmes '
    'prennent un chiffre, des centièmes deux, des millièmes trois : complète avec des zéros si '
    'besoin.',
)

# (v2) chiffres → lettres : cas écrits à la main, trous sur les mots qui posent problème
# (mille, cent(s), vingt(s), et, le rang de la partie décimale).
CAS_N4C = [
    ('2\\,080{,}5', 'deux-[mille]-quatre-[vingts] unités et cinq [dixièmes]',
     'milles ; vingt ; centièmes', 'deux-mille-quatre-vingts unités et cinq dixièmes'),
    ('300\\,400{,}07', 'trois-[cent]-[mille]-quatre-[cents] unités et sept [centièmes]',
     'milles ; dixièmes ; millièmes', 'trois-cent-mille-quatre-cents unités et sept centièmes'),
    ('80\\,000{,}045', 'quatre-[vingt]-[mille] unités et quarante-cinq [millièmes]',
     'vingts ; milles ; centièmes', 'quatre-vingt-mille unités et quarante-cinq millièmes'),
    ('1\\,200{,}3', '[mille]-deux-[cents] unités et trois [dixièmes]',
     'milles ; cent ; centièmes', 'mille-deux-cents unités et trois dixièmes'),
    ('71\\,081{,}61', 'soixante-[et]-onze-mille-quatre-[vingt]-un unités et soixante-[et]-un '
     '[centièmes]', 'vingts ; dixièmes ; millièmes',
     'soixante-et-onze-mille-quatre-vingt-un unités et soixante-et-un centièmes'),
    ('500\\,200{,}009', 'cinq-[cent]-[mille]-deux-[cents] unités et neuf [millièmes]',
     'milles ; centièmes ; dixièmes', 'cinq-cent-mille-deux-cents unités et neuf millièmes'),
    ('40\\,280{,}08', 'quarante-[mille]-deux-[cent]-quatre-[vingts] unités et huit [centièmes]',
     'milles ; cents ; vingt ; dixièmes',
     'quarante-mille-deux-cent-quatre-vingts unités et huit centièmes'),
    ('6\\,100{,}25', 'six-[mille]-[cent] unités et vingt-cinq [centièmes]',
     'milles ; cents ; millièmes', 'six-mille-cent unités et vingt-cinq centièmes'),
    ('200\\,080{,}3', 'deux-[cent]-[mille]-quatre-[vingts] unités et trois [dixièmes]',
     'cents ; milles ; vingt ; centièmes',
     'deux-cent-mille-quatre-vingts unités et trois dixièmes'),
    ('21\\,300{,}006', 'vingt-[et]-un-[mille]-trois-[cents] unités et six [millièmes]',
     'milles ; cent ; centièmes', 'vingt-et-un-mille-trois-cents unités et six millièmes'),
]

N4_C = variation(
    'Complète l\'écriture en lettres de ce nombre avec les étiquettes.\n\n```trous\n'
    + selon('t', [(j, '$' + nb + '$ se lit ' + texte + '.') for j, (nb, texte, _, _) in
                  enumerate(CAS_N4C)]) + '\n'
    + selon('t', [(j, 'intrus: ' + intrus) for j, (_, _, intrus, _) in enumerate(CAS_N4C)])
    + '\n```',
    [var('t', '0..' + str(len(CAS_N4C) - 1))],
    [],
    [
        '**La règle.** Tous les mots sont reliés par des traits d\'union ; « mille » ne prend '
        'jamais de s ; « vingt » et « cent » prennent un s seulement quand ils sont multipliés '
        'et terminent le nombre (quatre-vingts, deux-cents, mais quatre-vingt-un, '
        'deux-cent-mille) ; « et » s\'écrit dans 21, 31, 41, 51, 61 et 71. Après la virgule, '
        'le dernier chiffre donne le rang : un chiffre, des dixièmes ; deux, des centièmes ; '
        'trois, des millièmes.',
        'On écrit : **' + selon('t', [(j, ecrit) for j, (_, _, _, ecrit) in enumerate(CAS_N4C)])
        + '**.',
    ],
    '« vingt » et « cent » ne prennent un s que s\'ils sont multipliés et terminent le nombre ; '
    '« mille » ne prend jamais de s. Compte les chiffres après la virgule pour trouver le rang.',
)


def vn4(m, c, k):
    p, n = divmod(k, 1000)
    x = (1000 * m * 10 ** p + c * 10 ** p + n) / 10 ** p
    return {'m': str(m), 'c': str(c), 'k': str(k), 'p': str(p), 'n': str(n),
            'x': repr(x) if p else str(int(x))}


V4A = vn4(305, 80, 2005)  # 305 080,05 — « … virgule zéro cinq »
V4A2 = vn4(2, 5, 1003)    # 2 005,3
V4B = vn4(40, 18, 3007)   # 40 018,007 — « … unités et sept millièmes »
V4B2 = vn4(999, 999, 3999)
V4B3 = vn4(15, 671, 2023)  # 15 671,23

MSG_ZEROS_ENTIER = ERR_ZEROS_ENTIER['message']
MSG_MILLE = ERR_MILLE_000['message']
MSG_ZEROS_DEC = ERR_ZEROS_DEC['message']

SPECS_N4 = [
    spec('v0 : 305 080,05', 0, V4A, 'correct', ['305\\,080{,}05']),
    spec('v0 : virgule simple', 0, V4A, 'correct', ['305\\,080,05']),
    spec('v0 : sans espace', 0, V4A, 'unoptimal_form', ['305080,05']),
    spec('v0 : zéros de la partie entière oubliés (30 580,05)', 0, V4A, 'incorrect',
         ['30\\,580,05'], MSG_ZEROS_ENTIER),
    spec('v0 : « mille » écrit 000 (30 500 080,05)', 0, V4A, 'incorrect',
         ['30\\,500\\,080,05'], MSG_MILLE),
    spec('v0 : zéro décimal oublié (305 080,5)', 0, V4A, 'incorrect', ['305\\,080,5'],
         MSG_ZEROS_DEC),
    spec('v0 : fraction refusée', 0, V4A, 'bad_form', ['\\frac{30\\,508\\,005}{100}']),
    spec('v0 : 2 005,3', 0, V4A2, 'correct', ['2\\,005,3']),
    spec('v0 : 2 005,3 zéros oubliés (25,3)', 0, V4A2, 'incorrect', ['25,3'], MSG_ZEROS_ENTIER),
    spec('v1 : 40 018,007', 1, V4B, 'correct', ['40\\,018,007']),
    spec('v1 : zéros décimaux oubliés (40 018,7)', 1, V4B, 'incorrect', ['40\\,018,7'],
         'Ce sont des millièmes : il faut $3$ chiffres après la virgule, complète avec des '
         'zéros.'),
    spec('v1 : un rang de trop (40 018,000 7)', 1, V4B, 'incorrect', ['40\\,018,0007'],
         'Tu as mis un chiffre de trop après la virgule : des millièmes, c\'est $3$ chiffres '
         'après la virgule.'),
    spec('v1 : zéros de la partie entière oubliés (4 018,007)', 1, V4B, 'incorrect',
         ['4\\,018,007'], MSG_ZEROS_ENTIER),
    spec('v1 : 999 999,999', 1, V4B2, 'correct', ['999\\,999,999']),
    spec('v1 : 15 671,23', 1, V4B3, 'correct', ['15\\,671,23']),
    spec('v1 : 15 671,023', 1, V4B3, 'incorrect', ['15\\,671,023'],
         'Tu as mis un chiffre de trop après la virgule : des centièmes, c\'est $2$ chiffres '
         'après la virgule.'),
]

# Les réponses d'un texte à trous sont les positions AFFICHÉES des étiquettes (mélange de
# l'instance) : relevées sur l'instance de la spec (graine 0, generateInstanceWithFixedVariables).
TROUS_N4 = [['5', '4', '1'], ['6', '5', '1', '2'], ['5', '4', '1'], ['5', '4', '1'],
            ['5', '4', '5', '1'], ['6', '5', '1', '2'], ['7', '6', '4', '1'], ['5', '4', '1'],
            ['7', '6', '4', '1'], ['6', '5', '1', '2']]
for _t, _rep in enumerate(TROUS_N4):
    SPECS_N4.append(spec('v2 : ' + CAS_N4C[_t][3], 2, {'t': str(_t)}, 'correct', _rep))
# Deux étiquettes échangées : faux
SPECS_N4.append(spec('v2 : mille et vingts échangés', 2, {'t': '0'}, 'incorrect', ['4', '5', '1']))
SPECS_N4.append(spec('v2 : cent et cents échangés', 2, {'t': '1'}, 'incorrect',
                     ['1', '5', '6', '2']))


N4 = modele(
    'Lire et écrire un nombre décimal (jusqu\'à 999 999,999)',
    'Écrire en chiffres un décimal donné en lettres, avec « virgule » ou « … unités et … '
    'millièmes », jusqu\'à 999 999,999 ; compléter son écriture en lettres avec des étiquettes '
    '(pièges : zéros oubliés après « mille » ou après la virgule, « mille » écrit 000, un rang de '
    'trop, accord de vingt et cent)',
    2, 60, [N4_A, N4_B, N4_C], SPECS_N4)


# =============================================================================================
# N5 — 6-106 : compléter des écritures (décimal, fraction, pourcentage), une égalité par ligne
# =============================================================================================
# Quatre lignes j = 1..4, chacune un nombre n_j / d_j. Case donnée : ligne 1 le décimal,
# ligne 2 la fraction, ligne 3 le pourcentage, ligne 4 la fraction. Ordre des cases (ligne par
# ligne) : F1, P1, D2, P2, D3, F3, D4, P4.

# (v0) fractions usuelles, code 100 * n + d : 1/4, 1/2, 3/4, 1/5, k/10
POOL_V0 = [104, 102, 304, 105, 110, 310, 710, 910]


def m_(j):
    return '(100*n' + j + '/d' + j + ')'


def dec(j):
    return '{{eval:n' + j + '/d' + j + ';d}}'


def frac(j):
    return '\\dfrac{ {{n' + j + '}} }{ {{d' + j + '}} }'


def pct(j):
    return '{{eval:' + m_(j) + '}}'


def ev(expr):
    return '{{eval:' + expr + ';d}}'


# Messages des erreurs prévues (sans nombre : les mêmes pour toutes les lignes)
M_D_RECOPIE = ('Tu as recopié le nombre du pourcentage : un pourcentage compte des centièmes, '
               'divise-le par $100$.')
M_D_TROP = ('Tu as décalé la virgule d\'un rang de trop : diviser par $100$, c\'est décaler la '
            'virgule de deux rangs vers la gauche.')
M_D_MOINS = ('Tu n\'as pas décalé la virgule assez loin : diviser par $100$, c\'est décaler la '
             'virgule de deux rangs vers la gauche.')
M_D_JUXT = ('Le trait de fraction n\'est pas une virgule : une fraction, c\'est le numérateur '
            'divisé par le dénominateur.')
M_F_PETIT = 'Ta fraction est $10$ fois trop grande : il manque un zéro au dénominateur.'
M_F_GRAND = 'Ta fraction est $10$ fois trop petite : il y a un zéro de trop au dénominateur.'
M_F_UN = ('Les chiffres après la virgule vont au numérateur, et le dénominateur dit leur rang '
          '($10$ pour des dixièmes, $100$ pour des centièmes).')
M_P_MOINS = ('Tu n\'as pas décalé la virgule assez loin : pour un pourcentage, multiplie par '
             '$100$, c\'est-à-dire deux rangs vers la droite.')
M_P_OUBLI = 'Tu as oublié de multiplier par $100$ : un pourcentage compte des centièmes.'
M_P_TROP = ('Tu as décalé la virgule d\'un rang de trop : pour un pourcentage, multiplie par '
            '$100$, c\'est-à-dire deux rangs vers la droite, pas trois.')
M_P_DEN = ('Le pourcentage n\'est pas le dénominateur : écris d\'abord la fraction avec le '
           'dénominateur $100$.')
M_P_JUXT = ('On ne colle pas le numérateur et le dénominateur : écris d\'abord la fraction avec '
            'le dénominateur $100$.')


def chiffres_d(j):
    return '(1+min(floor(d' + j + '/10),1)+min(floor(d' + j + '/100),1))'


# « Chiffres après la virgule » lus comme un entier (0,5 → 5 ; 0,25 → 25) : pour 0,5 = 1/5
def chiffres_apres(j):
    return '(' + m_(j) + '/10^(1-min(mod(' + m_(j) + ',10),1)))'


def err_d_depuis_f(j, usuelles):
    if usuelles:
        return [
            erreur(ev('n' + j + '+d' + j + '/10^' + chiffres_d(j)), M_D_JUXT,
                   'Numérateur virgule dénominateur'),
            erreur(ev(m_(j)), M_D_RECOPIE, 'Pourcentage recopié'),
            erreur(ev(m_(j) + '/1000'), M_D_TROP, 'Un rang de trop'),
        ]
    return err_d_depuis_p(j)


def err_d_depuis_p(j):
    return [
        erreur(ev(m_(j)), M_D_RECOPIE, 'Pourcentage recopié'),
        erreur(ev(m_(j) + '/1000'), M_D_TROP, 'Un rang de trop'),
        erreur(ev(m_(j) + '/10'), M_D_MOINS, 'Un rang de moins'),
    ]


def err_f(j, depuis_decimal):
    erreurs = [
        erreur(ev('10*n' + j + '/d' + j), M_F_PETIT, 'Un zéro de moins au dénominateur'),
        erreur(ev('n' + j + '/(10*d' + j + ')'), M_F_GRAND, 'Un zéro de trop au dénominateur'),
    ]
    if depuis_decimal:
        # Sans « ;d » : 1/37 n'a pas d'écriture décimale finie
        erreurs.append(erreur('{{eval:1/' + chiffres_apres(j) + '}}', M_F_UN,
                              'Chiffres après la virgule au dénominateur'))
    return erreurs


def err_p(j, depuis_fraction, usuelles):
    # L'élève écrit le signe % lui-même : chaque erreur prévue porte le signe, sauf la première
    if depuis_fraction and usuelles:
        erreurs = [
            erreur(ev('d' + j) + '\\%', M_P_DEN, 'Dénominateur pris pour le pourcentage'),
            erreur(ev('n' + j + '*10^' + chiffres_d(j) + '+d' + j) + '\\%', M_P_JUXT,
                   'Numérateur et dénominateur collés'),
            erreur(ev(m_(j) + '/10') + '\\%', M_P_MOINS, 'Un rang de moins'),
        ]
    else:
        erreurs = [
            erreur(ev(m_(j) + '/10') + '\\%', M_P_MOINS, 'Un rang de moins'),
            erreur(ev('n' + j + '/d' + j) + '\\%', M_P_OUBLI, 'Multiplication par 100 oubliée'),
            erreur(ev('10*' + m_(j)) + '\\%', M_P_TROP, 'Un rang de trop'),
        ]
    # Cas réel : le nombre sans le signe (« 25 » vaut 25, pas 25 %)
    sans_signe = erreur(pct(j), 'N\'oublie pas le signe $\\%$ : $' + pct(j) + '$ tout seul, ce '
                        'n\'est pas $' + pct(j) + '~\\%$.', 'Signe % oublié')
    return [sans_signe] + erreurs


def egalites_n5():
    """Une égalité par nombre (décimal = fraction = pourcentage), une case donnée par ligne.

    Décision de David du 2026-11-23 : le tableau à trois colonnes de cases débordait sur un
    téléphone (390 px, colonne « Pourcentage » coupée). L'élève écrit le signe % lui-même :
    une case suivie de « % » jugeait faux « 25 % » tapé, sans message (essai du 2026-11-23).
    """
    return ('$$' + dec('1') + '=?=?$$\n\n'
            '$$?=' + frac('2') + '=?$$\n\n'
            '$$?=?=' + pct('3') + '~\\%$$\n\n'
            '$$?=' + frac('4') + '=?$$')


def cases_n5(usuelles):
    forme_f = FRACTION if usuelles else FRACTION_100

    def f_attendue(j):
        return '\\frac{ {{n' + j + '}} }{ {{d' + j + '}} }'

    def p_attendu(j):
        return pct(j) + '\\%'

    return [
        case(f_attendue('1'), err_f('1', True), forme_f),
        case(p_attendu('1'), err_p('1', False, usuelles)),
        case(dec('2'), err_d_depuis_f('2', usuelles), DECIMALE),
        case(p_attendu('2'), err_p('2', True, usuelles)),
        case(dec('3'), err_d_depuis_p('3'), DECIMALE),
        case(f_attendue('3'), err_f('3', False), forme_f),
        case(dec('4'), err_d_depuis_f('4', usuelles), DECIMALE),
        case(p_attendu('4'), err_p('4', True, usuelles)),
    ]


def ligne_corrigee(j, usuelles):
    if usuelles:
        return ('$$' + dec(j) + '=' + frac(j) + '=\\dfrac{ ' + pct(j) + ' }{100}=' + pct(j)
                + '\\,\\%$$')
    return '$$' + dec(j) + '=' + frac(j) + '=' + pct(j) + '\\,\\%$$'


def vars_n5(usuelles):
    vs = []
    for j in '1234':
        if usuelles:
            vs += [var('c' + j, '|'.join(str(c) for c in POOL_V0)),
                   var('n' + j, 'eval:floor(c' + j + '/100)'),
                   var('d' + j, 'eval:mod(c' + j + ',100)')]
        else:
            vs += [var('n' + j, '1..99'), var('d' + j, '100')]
    return vs


def conditions_n5(usuelles):
    nom = 'c' if usuelles else 'n'
    conds = [nom + a + ' != ' + nom + b for a, b in
             [('1', '2'), ('1', '3'), ('1', '4'), ('2', '3'), ('2', '4'), ('3', '4')]]
    if not usuelles:
        conds += ['mod(n' + j + ',10) != 0' for j in '1234']
        # Au moins un nombre de centièmes à zéro intérieur (0,05 = 5 %)
        conds.append('min(n1,n2,n3,n4) < 10')
    return conds


N5_A = variation(
    'Complète les égalités : sur chaque ligne, l\'écriture décimale, la fraction et le '
    'pourcentage désignent le même nombre. Au milieu, écris une fraction (toute fraction égale '
    'convient) ; à droite, écris le pourcentage avec le signe $\\%$.\n\n' + egalites_n5(),
    vars_n5(True),
    cases_n5(True),
    [
        'Un pourcentage est une fraction de dénominateur $100$ : on passe d\'une écriture à '
        'l\'autre par la fraction de dénominateur $100$.',
        ligne_corrigee('1', True) + '\n\n' + ligne_corrigee('2', True),
        ligne_corrigee('3', True) + '\n\n' + ligne_corrigee('4', True),
    ],
    'Pour chaque ligne, cherche d\'abord la fraction de dénominateur $100$ : le pourcentage est '
    'son numérateur, et diviser par $100$ donne l\'écriture décimale.',
    conditions_n5(True),
)

N5_B = variation(
    'Complète les égalités : sur chaque ligne, l\'écriture décimale, la fraction et le '
    'pourcentage désignent le même nombre. Au milieu, écris une fraction de dénominateur $100$ ; '
    'à droite, écris le pourcentage avec le signe $\\%$.\n\n' + egalites_n5(),
    vars_n5(False),
    cases_n5(False),
    [
        'Des centièmes : $a\\,\\%=\\dfrac{a}{100}$, et diviser par $100$, c\'est décaler la '
        'virgule de deux rangs vers la gauche.',
        ligne_corrigee('1', False) + '\n\n' + ligne_corrigee('2', False),
        ligne_corrigee('3', False) + '\n\n' + ligne_corrigee('4', False),
    ],
    'Le deuxième chiffre après la virgule est celui des centièmes : le nombre de centièmes est le '
    'numérateur de la fraction sur $100$, et aussi le pourcentage.',
    conditions_n5(False),
)


def vn5(codes):
    v = {}
    for j, c in zip('1234', codes):
        v['c' + j] = str(c)
        v['n' + j] = str(c // 100)
        v['d' + j] = str(c % 100)
    return v


def vn5b(ns):
    v = {}
    for j, n in zip('1234', ns):
        v['n' + j] = str(n)
        v['d' + j] = '100'
    return v


# v0 : 0,25 | 1/2 | 75 % | 3/10 → F1 P1 D2 P2 D3 F3 D4 P4
V5A = vn5([104, 102, 304, 310])
JUSTE_5A = ['\\frac{1}{4}', '25\\%', '0,5', '50\\%', '0,75', '\\frac{3}{4}', '0,3', '30\\%']
# v1 : 0,37 | 5/100 | 82 % | 41/100
V5B = vn5b([37, 5, 82, 41])
JUSTE_5B = ['\\frac{37}{100}', '37\\%', '0,05', '5\\%', '0,82', '\\frac{82}{100}', '0,41',
            '41\\%']


def remplace(liste, k, valeur):
    r = list(liste)
    r[k] = valeur
    return r


SPECS_N5 = [
    spec('v0 : tout juste', 0, V5A, 'correct', JUSTE_5A),
    spec('v0 : fraction égale non simplifiée acceptée (25/100)', 0, V5A, 'correct',
         remplace(JUSTE_5A, 0, '\\frac{25}{100}')),
    spec('v0 : décimal dans la case fraction refusé', 0, V5A, 'bad_form',
         remplace(JUSTE_5A, 0, '0,25')),
    spec('v0 : F1 = 25/10', 0, V5A, 'incorrect', remplace(JUSTE_5A, 0, '\\frac{25}{10}'),
         M_F_PETIT),
    spec('v0 : F1 = 25/1 000', 0, V5A, 'incorrect',
         remplace(JUSTE_5A, 0, '\\frac{25}{1\\,000}'), M_F_GRAND),
    spec('v0 : F1 = 1/25', 0, V5A, 'incorrect', remplace(JUSTE_5A, 0, '\\frac{1}{25}'), M_F_UN),
    spec('v0 : P1 = 25 sans le signe', 0, V5A, 'incorrect', remplace(JUSTE_5A, 1, '25'),
         'N\'oublie pas le signe $\\%$ : $25$ tout seul, ce n\'est pas $25~\\%$.'),
    spec('v0 : P1 = 0,25 refusé', 0, V5A, 'bad_form', remplace(JUSTE_5A, 1, '0{,}25'),
         violations=['percent', 'form']),
    spec('v0 : P2 = 50 sans le signe', 0, V5A, 'incorrect', remplace(JUSTE_5A, 3, '50'),
         'N\'oublie pas le signe $\\%$ : $50$ tout seul, ce n\'est pas $50~\\%$.'),
    spec('v0 : P1 = 2,5 %', 0, V5A, 'incorrect', remplace(JUSTE_5A, 1, '2,5\\%'), M_P_MOINS),
    spec('v0 : P1 = 0,25 %', 0, V5A, 'incorrect', remplace(JUSTE_5A, 1, '0,25\\%'), M_P_OUBLI),
    spec('v0 : P1 = 250 %', 0, V5A, 'incorrect', remplace(JUSTE_5A, 1, '250\\%'), M_P_TROP),
    spec('v0 : D2 = 1,2', 0, V5A, 'incorrect', remplace(JUSTE_5A, 2, '1,2'), M_D_JUXT),
    spec('v0 : D2 = 50', 0, V5A, 'incorrect', remplace(JUSTE_5A, 2, '50'), M_D_RECOPIE),
    spec('v0 : D2 = 0,05', 0, V5A, 'incorrect', remplace(JUSTE_5A, 2, '0,05'), M_D_TROP),
    spec('v0 : D2 en fraction refusé', 0, V5A, 'bad_form', remplace(JUSTE_5A, 2, '\\frac{1}{2}')),
    spec('v0 : P2 = 2 %', 0, V5A, 'incorrect', remplace(JUSTE_5A, 3, '2\\%'), M_P_DEN),
    spec('v0 : P2 = 12 %', 0, V5A, 'incorrect', remplace(JUSTE_5A, 3, '12\\%'), M_P_JUXT),
    spec('v0 : P2 = 5 %', 0, V5A, 'incorrect', remplace(JUSTE_5A, 3, '5\\%'), M_P_MOINS),
    spec('v0 : D3 = 75', 0, V5A, 'incorrect', remplace(JUSTE_5A, 4, '75'), M_D_RECOPIE),
    spec('v0 : D3 = 0,075', 0, V5A, 'incorrect', remplace(JUSTE_5A, 4, '0,075'), M_D_TROP),
    spec('v0 : D3 = 7,5', 0, V5A, 'incorrect', remplace(JUSTE_5A, 4, '7,5'), M_D_MOINS),
    spec('v0 : F3 = 75/10', 0, V5A, 'incorrect', remplace(JUSTE_5A, 5, '\\frac{75}{10}'),
         M_F_PETIT),
    spec('v0 : F3 = 75/1 000', 0, V5A, 'incorrect',
         remplace(JUSTE_5A, 5, '\\frac{75}{1\\,000}'), M_F_GRAND),
    spec('v0 : D4 = 3,1', 0, V5A, 'incorrect', remplace(JUSTE_5A, 6, '3,1'), M_D_JUXT),
    spec('v0 : P4 = 3 %', 0, V5A, 'incorrect', remplace(JUSTE_5A, 7, '3\\%'), M_P_MOINS),
    spec('v0 : P4 = 10 %', 0, V5A, 'incorrect', remplace(JUSTE_5A, 7, '10\\%'), M_P_DEN),
    spec('v1 : tout juste', 1, V5B, 'correct', JUSTE_5B),
    spec('v1 : fraction sur 1 000 refusée', 1, V5B, 'bad_form',
         remplace(JUSTE_5B, 0, '\\frac{370}{1\\,000}')),
    spec('v1 : F1 = 37/10', 1, V5B, 'incorrect', remplace(JUSTE_5B, 0, '\\frac{37}{10}'),
         M_F_PETIT),
    spec('v1 : F1 = 1/37', 1, V5B, 'incorrect', remplace(JUSTE_5B, 0, '\\frac{1}{37}'), M_F_UN),
    spec('v1 : P1 = 37 sans le signe', 1, V5B, 'incorrect', remplace(JUSTE_5B, 1, '37'),
         'N\'oublie pas le signe $\\%$ : $37$ tout seul, ce n\'est pas $37~\\%$.'),
    spec('v1 : P4 = 0,41 refusé', 1, V5B, 'bad_form', remplace(JUSTE_5B, 7, '0{,}41'),
         violations=['percent', 'form']),
    spec('v1 : P1 = 0,37 %', 1, V5B, 'incorrect', remplace(JUSTE_5B, 1, '0,37\\%'), M_P_OUBLI),
    spec('v1 : D2 = 0,5 (zéro oublié)', 1, V5B, 'incorrect', remplace(JUSTE_5B, 2, '0,5'),
         M_D_MOINS),
    spec('v1 : D2 = 5', 1, V5B, 'incorrect', remplace(JUSTE_5B, 2, '5'), M_D_RECOPIE),
    spec('v1 : D2 = 0,005', 1, V5B, 'incorrect', remplace(JUSTE_5B, 2, '0,005'), M_D_TROP),
    spec('v1 : P2 = 50 % (zéro oublié)', 1, V5B, 'incorrect', remplace(JUSTE_5B, 3, '50\\%'),
         M_P_TROP),
    spec('v1 : P2 = 0,5 %', 1, V5B, 'incorrect', remplace(JUSTE_5B, 3, '0,5\\%'), M_P_MOINS),
    spec('v1 : D3 = 8,2', 1, V5B, 'incorrect', remplace(JUSTE_5B, 4, '8,2'), M_D_MOINS),
    spec('v1 : F3 = 82/1 000', 1, V5B, 'incorrect',
         remplace(JUSTE_5B, 5, '\\frac{82}{1\\,000}'), M_F_GRAND),
]

N5 = modele(
    'Compléter un tableau d\'écritures : décimal, fraction, pourcentage',
    'Égalités à compléter, une écriture donnée par ligne : écriture décimale, fraction, '
    'pourcentage (0,25 = 1/4 = 25 %) ; fractions usuelles (toute fraction égale acceptée) ou '
    'centièmes (fraction sur 100 exigée) (pièges : pourcentage recopié, un rang de trop ou de '
    'moins, trait de fraction lu comme une virgule, 0,5 = 1/5)',
    2, 90, [N5_A, N5_B], SPECS_N5, OPTIONS_N5)


# =============================================================================================
# N6 — 6-106 : nombre mixte et écriture décimale
# =============================================================================================

X6 = '{{eval:a+b/D;d}}'
FR6 = '\\dfrac{ {{b}} }{ {{D}} }'
# b tiré entre 1 et D − 1, non multiple de 10 (sinon un zéro inutile dans le décimal)
VARS_6 = [var('p', '1..3'), var('D', 'eval:10^p'), var('a', '1..30'), var('b', '1..999')]
CONDS_6 = ['b < D', 'mod(b,10) != 0']
NOM_RANG6 = '{{if:p==1|dixièmes|{{if:p==2|centièmes|millièmes}}}}'

M6_PETIT = ('Ton dénominateur a un zéro de moins qu\'il ne faut : il y a ${{p}}$ chiffre'
            '{{if:p>1|s|}} après la virgule, donc des ' + NOM_RANG6 + '.')
M6_GRAND = ('Ton dénominateur a un zéro de trop : il y a ${{p}}$ chiffre{{if:p>1|s|}} après la '
            'virgule, donc des ' + NOM_RANG6 + '.')
M6_ZEROS = ('Tu as oublié le zéro après la virgule : il y a ${{p}}$ chiffre{{if:p>1|s|}} après '
            'la virgule, donc des ' + NOM_RANG6 + '.')

N6_A = variation(
    'Écris ce nombre sous la forme d\'un nombre entier plus une fraction décimale plus petite '
    'que $1$ (dénominateur $10$, $100$ ou $1\\,000$).\n\n$$' + X6 + '=?$$',
    VARS_6,
    [case('{{a}}+\\frac{ {{b}} }{ {{D}} }', [
        erreur(ev('a+10*b/D'), M6_PETIT, 'Un zéro de moins au dénominateur'),
        erreur(ev('a+b/(10*D)'), M6_GRAND, 'Un zéro de trop au dénominateur'),
        erreur(ev('a+b/10^' + chiffres('b')), M6_ZEROS, 'Zéro après la virgule oublié'),
    ], MIXTE_DECIMAL)],
    [
        'La partie entière est ${{a}}$ ; après la virgule, ${{p}}$ chiffre{{if:p>1|s|}} : '
        '${{b}}$ ' + NOM_RANG6 + '.',
        '$$' + X6 + '=' + PRIMAIRE + '{ {{a}}+' + FR6 + '}$$',
    ],
    'Sépare la partie entière de ce qui est après la virgule. Le dernier chiffre après la '
    'virgule dit le dénominateur : dixièmes, centièmes ou millièmes.',
    CONDS_6,
)

N6_B = variation(
    'Écris ce nombre sous la forme d\'une seule fraction décimale.\n\n$${{a}}+' + FR6 + '=?$$',
    VARS_6 + [var('N', 'eval:a*D+b')],
    [case('\\frac{ {{N}} }{ {{D}} }', [
        erreur(ev('(a+b)/D'), 'Tu as ajouté ${{a}}$ au numérateur : ${{a}}$, c\'est ${{eval:a*D}}$ '
               + NOM_RANG6 + ', pas ${{a}}$.', 'Entier ajouté au numérateur'),
        erreur(ev('(a*10^' + chiffres('b') + '+b)/D'),
               'Tu as collé ${{a}}$ et ${{b}}$ : il manque un zéro, car ${{a}}$, c\'est '
               '${{eval:a*D}}$ ' + NOM_RANG6 + '.', 'Chiffres collés, zéro oublié'),
        erreur(ev('(a*D+b)/(10*D)'), 'Le dénominateur ne change pas : ce sont toujours des '
               + NOM_RANG6 + '.', 'Dénominateur changé'),
    ], FRACTION_DECIMALE)],
    [
        '${{a}}={{a}}\\times{{D}}$ ' + NOM_RANG6 + ' $={{eval:a*D}}$ ' + NOM_RANG6 + ', '
        'soit $\\dfrac{ {{eval:a*D}} }{ {{D}} }$.',
        '$${{a}}+' + FR6 + '=\\dfrac{ {{eval:a*D}} }{ {{D}} }+' + FR6 + '=' + PRIMAIRE
        + '{\\dfrac{ {{N}} }{ {{D}} }}$$',
    ],
    'Écris d\'abord le nombre entier sous la forme d\'une fraction de même dénominateur, puis '
    'additionne les numérateurs.',
    CONDS_6,
)

VARS_6C = [var('p', '2|3'), var('D', 'eval:10^p'), var('a', '1..30'), var('b', '1..999'),
           var('N', 'eval:a*D+b')]

N6_C = variation(
    'Écris cette fraction sous la forme d\'un nombre entier plus une fraction décimale plus '
    'petite que $1$.\n\n$$\\dfrac{ {{N}} }{ {{D}} }=?$$',
    VARS_6C,
    [case('{{a}}+\\frac{ {{b}} }{ {{D}} }', [
        erreur(ev('floor(N/(D/10))+mod(N,D/10)/D'),
               'Tu n\'as pas coupé au bon endroit : ${{D}}$ ' + NOM_RANG6 + ' font une unité, '
               'il faut prendre ${{p}}$ chiffre{{if:p>1|s|}} pour la fraction.',
               'Coupé au mauvais rang'),
        erreur(ev('a+10*b/D'), 'Le dénominateur ne change pas : ce sont toujours des '
               + NOM_RANG6 + '.', 'Un zéro de moins au dénominateur'),
        erreur(ev('a+b/(10*D)'), 'Le dénominateur ne change pas : ce sont toujours des '
               + NOM_RANG6 + ', pas un zéro de plus.', 'Un zéro de trop au dénominateur'),
    ], MIXTE_DECIMAL)],
    [
        '${{D}}$ ' + NOM_RANG6 + ' font une unité : dans ${{N}}$ ' + NOM_RANG6 + ', il y a '
        '${{a}}$ unité{{if:a>1|s|}} et ${{b}}$ ' + NOM_RANG6 + ' de reste.',
        '$$\\dfrac{ {{N}} }{ {{D}} }=\\dfrac{ {{eval:a*D}} }{ {{D}} }+' + FR6 + '=' + PRIMAIRE
        + '{ {{a}}+' + FR6 + '}$$',
    ],
    'Combien d\'unités entières dans cette fraction ? Une unité, c\'est ${{D}}$ ' + NOM_RANG6
    + '.',
    CONDS_6,
)

# (v3) exemple du BO : N/d = q + r/d = décimal, d = 2, 4 ou 5
VARS_6D = [var('d', '2|4|5'), var('q', '1..9'), var('r', '1..4'), var('N', 'eval:q*d+r')]

N6_D = variation(
    'Écris cette fraction sous la forme d\'un nombre entier plus une fraction plus petite que '
    '$1$, puis en écriture décimale.\n\n$$\\dfrac{ {{N}} }{ {{d}} }=?=?$$',
    VARS_6D,
    [
        case('{{q}}+\\frac{ {{r}} }{ {{d}} }', [
            erreur(ev('q+N/d'), 'Tu as gardé tout le numérateur dans la fraction : elle doit '
                   'être plus petite que $1$, retire les unités entières.',
                   'Numérateur gardé'),
            erreur(ev('r+q/d'), 'Tu as échangé : le nombre d\'unités est le quotient de '
                   '${{N}}$ par ${{d}}$, le numérateur est le reste.',
                   'Quotient et reste échangés'),
        ], MIXTE),
        case('{{eval:N/d;d}}', [
            erreur(ev('N+d/10'), 'Le trait de fraction n\'est pas une virgule : '
                   '$\\dfrac{ {{N}} }{ {{d}} }$, c\'est ${{N}}$ divisé par ${{d}}$.',
                   'Numérateur virgule dénominateur'),
            erreur(ev('q+r/10'), 'Tu as écrit le numérateur après la virgule : '
                   '$\\dfrac{ {{r}} }{ {{d}} }$ n\'est pas ${{r}}$ dixièmes.',
                   'Numérateur après la virgule'),
            erreur(ev('q+d/10'), 'Tu as écrit le dénominateur après la virgule : cherche une '
                   'fraction égale à $\\dfrac{ {{r}} }{ {{d}} }$ de dénominateur $10$ ou $100$.',
                   'Dénominateur après la virgule'),
        ], DECIMALE),
    ],
    [
        '${{N}}={{q}}\\times{{d}}+{{r}}$ : $\\dfrac{ {{N}} }{ {{d}} }=' + PRIMAIRE
        + '{ {{q}}+\\dfrac{ {{r}} }{ {{d}} }}$.',
        '$\\dfrac{ {{r}} }{ {{d}} }=\\dfrac{ {{eval:r*100/d}} }{100}={{eval:r/d;d}}$, donc '
        '$\\dfrac{ {{N}} }{ {{d}} }=' + PRIMAIRE + '{ {{eval:N/d;d}} }$.',
    ],
    'Combien de fois ${{d}}$ dans ${{N}}$ ? Le reste reste dans la fraction. Pour l\'écriture '
    'décimale, écris cette fraction avec le dénominateur $10$ ou $100$.',
    ['r < d'],
)

# (v4) décimal < 1 → pourcentage
VARS_6E = [var('p', '1..3'), var('n', '1..999'), var('x', 'eval:n/10^p;d')]

N6_E = variation(
    'Écris ce nombre sous forme de pourcentage.\n\n$${{x}}=?$$',
    VARS_6E,
    [case('{{eval:100*n/10^p;d}}\\%', [
        erreur('{{x}}\\%', M_P_OUBLI, 'Multiplication par 100 oubliée'),
        erreur(ev('10*n/10^p') + '\\%', M_P_MOINS, 'Un rang de moins'),
        erreur(ev('1000*n/10^p') + '\\%', M_P_TROP, 'Un rang de trop'),
    ])],
    [
        'Un pourcentage compte des centièmes : on multiplie par $100$, c\'est-à-dire qu\'on '
        'décale la virgule de deux rangs vers la droite.',
        '$${{x}}=\\dfrac{ {{eval:100*n/10^p;d}} }{100}=' + PRIMAIRE
        + '{ {{eval:100*n/10^p;d}}\\,\\%}$$',
    ],
    'Combien de centièmes dans ce nombre ? Le pourcentage, c\'est ce nombre de centièmes.',
    ['n < 10^p', 'mod(n,10) != 0'],
)


def v6(p, a, b):
    D = 10 ** p
    return {'p': str(p), 'D': str(D), 'a': str(a), 'b': str(b)}


V6A = v6(2, 3, 47)   # 3,47
V6A2 = v6(2, 3, 7)   # 3,07
V6A3 = v6(1, 3, 5)   # 3,5
V6B = {**v6(2, 3, 7), 'N': '307'}    # 3 + 7/100 = 307/100
V6B2 = {**v6(3, 12, 405), 'N': '12405'}
V6C = {**v6(2, 3, 47), 'N': '347'}
V6C2 = {**v6(3, 2, 347), 'N': '2347'}
V6D = {'d': '5', 'q': '1', 'r': '1', 'N': '6'}  # 6/5
V6D2 = {'d': '4', 'q': '1', 'r': '3', 'N': '7'}  # 7/4
V6E = {'p': '3', 'n': '125', 'x': '0.125'}
V6E2 = {'p': '1', 'n': '4', 'x': '0.4'}

SPECS_N6 = [
    spec('v0 : 3,47 = 3 + 47/100', 0, V6A, 'correct', ['3+\\frac{47}{100}']),
    spec('v0 : fraction égale 470/1 000 acceptée', 0, V6A, 'correct',
         ['3+\\frac{470}{1\\,000}']),
    spec('v0 : une seule fraction refusée', 0, V6A, 'bad_form', ['\\frac{347}{100}']),
    spec('v0 : écriture décimale refusée', 0, V6A, 'bad_form', ['3,47']),
    spec('v0 : 3 + 47/10', 0, V6A, 'incorrect', ['3+\\frac{47}{10}'],
         'Ton dénominateur a un zéro de moins qu\'il ne faut : il y a $2$ chiffres après la '
         'virgule, donc des centièmes.'),
    spec('v0 : 3 + 47/1 000', 0, V6A, 'incorrect', ['3+\\frac{47}{1\\,000}'],
         'Ton dénominateur a un zéro de trop : il y a $2$ chiffres après la virgule, donc des '
         'centièmes.'),
    spec('v0 : 3,07 = 3 + 7/100', 0, V6A2, 'correct', ['3+\\frac{7}{100}']),
    spec('v0 : 3,07 → 3 + 7/10', 0, V6A2, 'incorrect', ['3+\\frac{7}{10}'],
         'Ton dénominateur a un zéro de moins qu\'il ne faut : il y a $2$ chiffres après la '
         'virgule, donc des centièmes.'),
    spec('v0 : 3,5 = 3 + 5/10', 0, V6A3, 'correct', ['3+\\frac{5}{10}']),
    spec('v0 : 3,5 = 3 + 1/2 refusé (pas décimale)', 0, V6A3, 'bad_form', ['3+\\frac{1}{2}']),
    spec('v1 : 3 + 7/100 = 307/100', 1, V6B, 'correct', ['\\frac{307}{100}']),
    spec('v1 : 3 + 7/100 → 10/100', 1, V6B, 'incorrect', ['\\frac{10}{100}'],
         'Tu as ajouté $3$ au numérateur : $3$, c\'est $300$ centièmes, pas $3$.'),
    spec('v1 : 3 + 7/100 → 37/100', 1, V6B, 'incorrect', ['\\frac{37}{100}'],
         'Tu as collé $3$ et $7$ : il manque un zéro, car $3$, c\'est $300$ centièmes.'),
    spec('v1 : 3 + 7/100 → 307/1 000', 1, V6B, 'incorrect', ['\\frac{307}{1\\,000}'],
         'Le dénominateur ne change pas : ce sont toujours des centièmes.'),
    spec('v1 : écriture décimale refusée', 1, V6B, 'bad_form', ['3,07']),
    spec('v1 : 12 + 405/1 000', 1, V6B2, 'correct', ['\\frac{12\\,405}{1\\,000}']),
    spec('v2 : 347/100 = 3 + 47/100', 2, V6C, 'correct', ['3+\\frac{47}{100}']),
    spec('v2 : 34 + 7/100', 2, V6C, 'incorrect', ['34+\\frac{7}{100}'],
         'Tu n\'as pas coupé au bon endroit : $100$ centièmes font une unité, il faut prendre '
         '$2$ chiffres pour la fraction.'),
    spec('v2 : 3 + 47/10', 2, V6C, 'incorrect', ['3+\\frac{47}{10}'],
         'Le dénominateur ne change pas : ce sont toujours des centièmes.'),
    spec('v2 : 3 + 47/1 000', 2, V6C, 'incorrect', ['3+\\frac{47}{1\\,000}'],
         'Le dénominateur ne change pas : ce sont toujours des centièmes, pas un zéro de plus.'),
    spec('v2 : fraction recopiée refusée', 2, V6C, 'bad_form', ['\\frac{347}{100}']),
    spec('v2 : 2 347/1 000 = 2 + 347/1 000', 2, V6C2, 'correct', ['2+\\frac{347}{1\\,000}']),
    spec('v3 : 6/5 = 1 + 1/5 = 1,2', 3, V6D, 'correct', ['1+\\frac{1}{5}', '1,2']),
    spec('v3 : 6/5 → 6,5', 3, V6D, 'incorrect', ['1+\\frac{1}{5}', '6,5'],
         'Le trait de fraction n\'est pas une virgule : $\\dfrac{6}{5}$, c\'est $6$ divisé par '
         '$5$.'),
    spec('v3 : 6/5 → 1,1', 3, V6D, 'incorrect', ['1+\\frac{1}{5}', '1,1'],
         'Tu as écrit le numérateur après la virgule : $\\dfrac{1}{5}$ n\'est pas $1$ dixièmes.'),
    spec('v3 : 6/5 → 1,5', 3, V6D, 'incorrect', ['1+\\frac{1}{5}', '1,5'],
         'Tu as écrit le dénominateur après la virgule : cherche une fraction égale à '
         '$\\dfrac{1}{5}$ de dénominateur $10$ ou $100$.'),
    spec('v3 : 6/5 → 1 + 6/5', 3, V6D, 'incorrect', ['1+\\frac{6}{5}', '1,2'],
         'Tu as gardé tout le numérateur dans la fraction : elle doit être plus petite que $1$, '
         'retire les unités entières.'),
    spec('v3 : 7/4 → 3 + 1/4', 3, V6D2, 'incorrect', ['3+\\frac{1}{4}', '1,75'],
         'Tu as échangé : le nombre d\'unités est le quotient de $7$ par $4$, le numérateur est '
         'le reste.'),
    spec('v3 : 7/4 = 1 + 3/4 = 1,75', 3, V6D2, 'correct', ['1+\\frac{3}{4}', '1,75']),
    spec('v3 : 7/4, décimal dans la première case refusé', 3, V6D2, 'bad_form',
         ['1,75', '1,75']),
    spec('v3 : 7/4, fraction dans la seconde case refusée', 3, V6D2, 'bad_form',
         ['1+\\frac{3}{4}', '\\frac{7}{4}']),
    spec('v4 : 0,125 = 12,5 %', 4, V6E, 'correct', ['12,5\\%']),
    spec('v4 : 0,125 %', 4, V6E, 'incorrect', ['0,125\\%'], M_P_OUBLI),
    spec('v4 : 1,25 %', 4, V6E, 'incorrect', ['1,25\\%'], M_P_MOINS),
    spec('v4 : 125 %', 4, V6E, 'incorrect', ['125\\%'], M_P_TROP),
    spec('v4 : 0,4 = 40 %', 4, V6E2, 'correct', ['40\\%']),
    spec('v4 : 0,4 → 4 %', 4, V6E2, 'incorrect', ['4\\%'], M_P_MOINS),
]

N6 = modele(
    'Nombre mixte et écriture décimale',
    'Passer d\'une écriture à l\'autre : 3,47 = 3 + 47/100 = 347/100 ; 6/5 = 1 + 1/5 = 1,2 ; '
    '0,125 = 12,5 % (pièges : un zéro de trop ou de moins au dénominateur, zéro oublié, entier '
    'ajouté au numérateur, trait de fraction lu comme une virgule, multiplication par 100 '
    'oubliée)',
    2, 60, [N6_A, N6_B, N6_C, N6_D, N6_E], SPECS_N6, OPTIONS_FRACTIONS)


ecrire('n4-lire-ecrire-nombre-decimal-6e', N4)
ecrire('n5-tableau-ecritures-decimal-fraction-pourcentage', N5)
ecrire('n6-nombre-mixte-ecriture-decimale', N6)
print('3 modèles écrits dans', DOSSIER)
