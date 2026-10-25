"""Écrit les 9 modèles du lot A6 (grandeurs et lexique, CP) dans scripts/questions/cp-a6/."""
import json
import sys

DOSSIER = sys.argv[1]

# Le moteur n'écrit pas les nombres en lettres : chaque mot ou texte qui dépend d'un tirage
# est calculé ici pour chaque valeur possible, puis choisi par une chaîne de {{if:…}}.
# Orthographe rectifiée (décision de David, § 4 octies) : traits d'union partout.

UNITES = ['zéro', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf', 'dix',
          'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize']
DIZAINES = {2: 'vingt', 3: 'trente', 4: 'quarante', 5: 'cinquante', 6: 'soixante'}


def lettres(n):
    """n (0 à 99) en lettres, orthographe rectifiée : vingt-et-un, soixante-et-onze,
    quatre-vingts, quatre-vingt-un. Au-delà de 50, seulement pour les leurres."""
    if n <= 16:
        return UNITES[n]
    if n < 20:
        return 'dix-' + UNITES[n - 10]
    if n >= 80:
        return 'quatre-vingts' if n == 80 else 'quatre-vingt-' + lettres(n - 80)
    if n >= 70:
        return 'soixante-' + ('et-onze' if n == 71 else lettres(n - 60))
    d, u = divmod(n, 10)
    if u == 0:
        return DIZAINES[d]
    return DIZAINES[d] + ('-et-un' if u == 1 else '-' + UNITES[u])


def par(var, valeurs, f):
    """f(valeur) selon la valeur tirée de `var` : {{if:var==v1|…|{{if:var==v2|…|…}}}}."""
    valeurs = list(valeurs)
    expr = f(valeurs[-1])
    for x in reversed(valeurs[:-1]):
        expr = '{{if:' + var + '==' + str(x) + '|' + f(x) + '|' + expr + '}}'
    return expr


def spec(desc, vi, variables_, status, choix=None, answers=None, violations=None):
    s = {'description': desc, 'variationIndex': vi, 'variables': variables_,
         'expected': {'status': status}}
    if choix is not None:
        s['selectedChoices'] = [choix]
    if answers is not None:
        s['answers'] = answers
    if violations:
        s['expected']['constraintViolations'] = violations
    return s


def modele(title, description, theme, domain, subdomain, level, delay, variations, specs):
    # theme / domain / subdomain : anciennes colonnes, remplies pour create-questions ; le
    # rangement (nœud du point) est posé par la migration
    return {'title': title, 'description': description, 'grades': ['CP'], 'theme': theme,
            'domain': domain, 'subdomain': subdomain, 'level': level, 'delay': delay,
            'status': 'draft', 'variations': variations, 'testSpecs': specs}


def variables(*paires):
    return [{'name': n, 'expression': x} for n, x in paires]


def case(statement, vars_, conditions, reponse, etapes):
    return {'statement': statement, 'variables': vars_, 'conditions': conditions,
            'blanks': [{'expectedAnswer': reponse}], 'correction': {'steps': etapes}}


def qcm(statement, vars_, conditions, choices, bon, etapes):
    return {'statement': statement, 'variables': vars_, 'conditions': conditions,
            'choices': [{'content': c} for c in choices], 'correctChoiceIndex': [bon],
            'correction': {'steps': etapes}}


def grandeur(nombre, unite):
    """Une grandeur en LaTeX (avec les $) : $15~\\unit{cm}$."""
    return '$' + str(nombre) + '~\\unit{' + unite + '}$'


# ---- 1. Écrire un nombre en lettres (CP-004, QCM) ----
# Choix : 0 = le bon, 1 = chiffres inversés (n + 10 quand ils sont égaux : 11, 22, 33, 44),
# 2 et 3 = les voisins n − 1 et n + 1.

NOMBRES_QCM = range(11, 51)


def inverse(n):
    d, u = divmod(n, 10)
    return n + 10 if d == u else 10 * u + d


def explication(n):
    """Comment s'écrit n en lettres, en une phrase."""
    if n <= 16:
        return '$' + str(n) + '$ a un nom à lui : **' + lettres(n) + '**.'
    d, u = divmod(n, 10)
    if u == 0:
        return '$' + str(n) + '$, ce sont $' + str(d) + '$ dizaines : **' + lettres(n) + '**.'
    dizaine = 'dix' if d == 1 else DIZAINES[d]
    liaison = ' « et » puis « un »' if (u == 1 and d >= 2) else ' « ' + UNITES[u] + ' »'
    return ('$' + str(n) + '=' + str(10 * d) + '+' + str(u) + '$ : on écrit « ' + dizaine
            + ' », puis' + liaison + ', reliés par '
            + ('des traits' if (u == 1 and d >= 2) else 'un trait') + ' d\'union : **' + lettres(n)
            + '**.')


EN_LETTRES = qcm(
    'Comment écrit-on le nombre ${{n}}$ en lettres ?',
    variables(('n', '11..50')), [],
    [par('n', NOMBRES_QCM, lettres),
     par('n', NOMBRES_QCM, lambda n: lettres(inverse(n))),
     par('n', NOMBRES_QCM, lambda n: lettres(n - 1)),
     par('n', NOMBRES_QCM, lambda n: lettres(n + 1))], '0',
    [par('n', NOMBRES_QCM, explication)])

SPECS_EN_LETTRES = [
    spec('37 : trente-sept', 0, {'n': '37'}, 'correct', choix=0),
    spec('Erreur : 37, chiffres inversés (soixante-treize)', 0, {'n': '37'},
         'incorrect', choix=1),
    spec('Erreur : 37, trente-six', 0, {'n': '37'}, 'incorrect', choix=2),
    spec('Erreur : 37, trente-huit', 0, {'n': '37'}, 'incorrect', choix=3),
    spec('21 : vingt-et-un', 0, {'n': '21'}, 'correct', choix=0),
    spec('borne : 11, onze', 0, {'n': '11'}, 'correct', choix=0),
    spec('borne : 50, cinquante', 0, {'n': '50'}, 'correct', choix=0),
    spec('Erreur : 50, cinq (chiffres inversés)', 0, {'n': '50'}, 'incorrect', choix=1),
]

# ---- 2. Lire un nombre écrit en lettres (CP-004, case) ----

NOMBRES_CASE = range(1, 51)

EN_CHIFFRES = case(
    'Écris en chiffres le nombre « **' + par('n', NOMBRES_CASE, lettres) + '** ».\n\n'
    'C\'est $?$.',
    variables(('n', '1..50')), [], '{{n}}',
    [par('n', NOMBRES_CASE, lambda n: explication(n) + ' En chiffres : $' + str(n) + '$.'
         if n >= 11 else '« ' + lettres(n) + ' », c\'est $' + str(n) + '$.')])

SPECS_EN_CHIFFRES = [
    spec('trente-sept : 37', 0, {'n': '37'}, 'correct', answers=['37']),
    spec('Erreur : trente-sept, 73', 0, {'n': '37'}, 'incorrect', answers=['73']),
    spec('Erreur : trente-sept, 307', 0, {'n': '37'}, 'incorrect', answers=['307']),
    spec('vingt-et-un : 21', 0, {'n': '21'}, 'correct', answers=['21']),
    spec('borne : un, 1', 0, {'n': '1'}, 'correct', answers=['1']),
    spec('borne : cinquante, 50', 0, {'n': '50'}, 'correct', answers=['50']),
    spec('Erreur : cinquante, 5', 0, {'n': '50'}, 'incorrect', answers=['5']),
    spec('Zéro inutile', 0, {'n': '37'}, 'unoptimal_form', answers=['037'],
         violations=['zeros']),
]

# ---- 3. Long, court, près, loin (CP-032, QCM) ----
# Choix 0 = le ruban rouge (a carreaux) / la boulangerie (a pas), choix 1 = l'autre.

RUBANS = ('Le ruban rouge mesure ${{a}}$ carreaux. Le ruban bleu mesure ${{b}}$ carreaux.\n\n')
RUBANS_CHOIX = ['le ruban rouge', 'le ruban bleu']
COMPARE_RUBANS = ('{{if:a>b|${{a}}>{{b}}$ : le ruban rouge est plus long que le ruban bleu.|'
                  '${{a}}<{{b}}$ : le ruban rouge est plus court que le ruban bleu.}}')

PLUS_LONG = qcm(
    RUBANS + 'Quel ruban est le plus **long** ?',
    variables(('a', '2..20'), ('b', '2..20')), ['abs(a - b) >= 3'], RUBANS_CHOIX,
    '{{if:a>b|0|1}}',
    [COMPARE_RUBANS, 'Le plus long est celui qui a le plus de carreaux : '
     '{{if:a>b|le ruban rouge|le ruban bleu}}.'])

PLUS_COURT = qcm(
    RUBANS + 'Quel ruban est le plus **court** ?',
    variables(('a', '2..20'), ('b', '2..20')), ['abs(a - b) >= 3'], RUBANS_CHOIX,
    '{{if:a<b|0|1}}',
    [COMPARE_RUBANS, 'Le plus court est celui qui a le moins de carreaux : '
     '{{if:a<b|le ruban rouge|le ruban bleu}}.'])

LIEUX = ('Depuis sa maison, Léa fait ${{a}}$ pas pour aller à la boulangerie et ${{b}}$ pas '
         'pour aller à la piscine.\n\n')
LIEUX_CHOIX = ['la boulangerie', 'la piscine']
COMPARE_PAS = '{{if:a>b|${{a}}>{{b}}$|${{a}}<{{b}}$}} : il faut moins de pas pour aller à ' \
              '{{if:a<b|la boulangerie|la piscine}}.'

PLUS_PRES = qcm(
    LIEUX + 'Qu\'est-ce qui est le plus **près** de chez Léa ?',
    variables(('a', '10..90'), ('b', '10..90')), ['abs(a - b) >= 10'], LIEUX_CHOIX,
    '{{if:a<b|0|1}}',
    [COMPARE_PAS, 'Le plus près, c\'est {{if:a<b|la boulangerie|la piscine}}.'])

PLUS_LOIN = qcm(
    LIEUX + 'Qu\'est-ce qui est le plus **loin** de chez Léa ?',
    variables(('a', '10..90'), ('b', '10..90')), ['abs(a - b) >= 10'], LIEUX_CHOIX,
    '{{if:a>b|0|1}}',
    [COMPARE_PAS, 'Le plus loin, c\'est {{if:a>b|la boulangerie|la piscine}} : il faut plus '
     'de pas pour y aller.'])

# Choix : court, long, loin, près ; le mot w (long, court, près, loin) a pour contraire le choix w.
MOTS_LONGUEUR = ['long', 'court', 'près', 'loin']
CONTRAIRES_LONGUEUR = ['court', 'long', 'loin', 'près']

CONTRAIRE_LONGUEUR = qcm(
    'Quel est le contraire de « **' + par('w', range(4), lambda w: MOTS_LONGUEUR[w]) + '** » ?',
    variables(('w', '0..3')), [], CONTRAIRES_LONGUEUR, '{{w}}',
    [par('w', range(4), lambda w: 'Le contraire de « ' + MOTS_LONGUEUR[w] + ' » est « **'
         + CONTRAIRES_LONGUEUR[w] + '** »'
         + (' : une corde longue, une corde courte.' if w < 2 else
            ' : l\'école est près, la mer est loin.'))])

SPECS_LONGUEUR = [
    spec('rouge 12, bleu 5 : le plus long est le rouge', 0, {'a': '12', 'b': '5'}, 'correct',
         choix=0),
    spec('Erreur : rouge 12, bleu 5, le bleu', 0, {'a': '12', 'b': '5'}, 'incorrect', choix=1),
    spec('rouge 4, bleu 9 : le plus long est le bleu', 0, {'a': '4', 'b': '9'}, 'correct',
         choix=1),
    spec('rouge 12, bleu 5 : le plus court est le bleu', 1, {'a': '12', 'b': '5'}, 'correct',
         choix=1),
    spec('Erreur : le plus court, le plus long (rouge)', 1, {'a': '12', 'b': '5'},
         'incorrect', choix=0),
    spec('boulangerie 30, piscine 80 : le plus près est la boulangerie', 2,
         {'a': '30', 'b': '80'}, 'correct', choix=0),
    spec('Erreur : le plus près, la piscine', 2, {'a': '30', 'b': '80'}, 'incorrect',
         choix=1),
    spec('boulangerie 30, piscine 80 : le plus loin est la piscine', 3,
         {'a': '30', 'b': '80'}, 'correct', choix=1),
    spec('boulangerie 70, piscine 20 : le plus loin est la boulangerie', 3,
         {'a': '70', 'b': '20'}, 'correct', choix=0),
    spec('contraire de long : court', 4, {'w': '0'}, 'correct', choix=0),
    spec('Erreur : contraire de long, long', 4, {'w': '0'}, 'incorrect', choix=1),
    spec('contraire de près : loin', 4, {'w': '2'}, 'correct', choix=2),
    spec('Erreur : contraire de près, court', 4, {'w': '2'}, 'incorrect', choix=0),
    spec('contraire de loin : près', 4, {'w': '3'}, 'correct', choix=3),
]

# ---- 4. Mètre ou centimètre ? (CP-036, QCM) ----
# Objets 1 à 5 mesurés en cm, 6 à 10 en m. Choix : 0 = cm, 1 = m.

OBJETS_UNITE = [('Un crayon', 15, 'cm'), ('Une gomme', 4, 'cm'), ('Un livre', 25, 'cm'),
                ('Une cuillère', 18, 'cm'), ('Une feuille de cahier', 30, 'cm'),
                ('La classe', 8, 'm'), ('Un bus', 12, 'm'), ('Une piscine', 25, 'm'),
                ('Le couloir de l\'école', 30, 'm'), ('Un arbre de la cour', 10, 'm')]
K_UNITE = range(1, len(OBJETS_UNITE) + 1)


def objet_unite(f):
    return par('k', K_UNITE, lambda k: f(*OBJETS_UNITE[k - 1]))


UNITE_ADAPTEE = qcm(
    objet_unite(lambda nom, n, u: nom + ' mesure $' + str(n) + '$ …') + '\n\nQuelle unité '
    'convient ?',
    variables(('k', '1..10')), [], ['cm', 'm'], '{{if:k<=5|0|1}}',
    [objet_unite(lambda nom, n, u: nom + ' mesure ' + grandeur(n, u) + ' ('
                 + lettres(n) + (' centimètres' if u == 'cm' else ' mètres') + ')'
                 + (' : c\'est petit, on mesure en **centimètres**.' if u == 'cm' else
                    ' : c\'est grand, on mesure en **mètres**.'))])

# w = 0 : centimètre (cm), w = 1 : mètre (m) ; choix cm, m, ct, mt.
SYMBOLE = qcm(
    'Comment écrit-on « **{{if:w==0|centimètre|mètre}}** » en abrégé ?',
    variables(('w', '0..1')), [], ['cm', 'm', 'ct', 'mt'], '{{w}}',
    ['{{if:w==0|« centimètre » s\'écrit **cm**|« mètre » s\'écrit **m**}} : '
     'on écrit $2~\\unit{m}$ pour deux mètres, $2~\\unit{cm}$ pour deux centimètres.'])

# u = 0 : cm, u = 1 : m ; choix « … centimètres », « … mètres ».
LONGUEURS_LUES = range(2, 51)
GRANDEUR_LUE = '{{if:u==0|${{n}}~\\unit{cm}$|${{n}}~\\unit{m}$}}'
LECTURE = qcm(
    'Comment lit-on ' + GRANDEUR_LUE + ' ?',
    variables(('n', '2..50'), ('u', '0..1')), [],
    [par('n', LONGUEURS_LUES, lettres) + ' centimètres',
     par('n', LONGUEURS_LUES, lettres) + ' mètres'], '{{u}}',
    ['« {{if:u==0|cm|m}} » veut dire « {{if:u==0|centimètre|mètre}} » : ' + GRANDEUR_LUE
     + ' se lit **' + par('n', LONGUEURS_LUES, lettres)
     + ' {{if:u==0|centimètres|mètres}}**.'])

SPECS_UNITE = [
    spec('un crayon : 15 cm', 0, {'k': '1'}, 'correct', choix=0),
    spec('Erreur : un crayon, 15 m', 0, {'k': '1'}, 'incorrect', choix=1),
    spec('la classe : 8 m', 0, {'k': '6'}, 'correct', choix=1),
    spec('Erreur : la classe, 8 cm', 0, {'k': '6'}, 'incorrect', choix=0),
    spec('borne : une feuille, 30 cm', 0, {'k': '5'}, 'correct', choix=0),
    spec('borne : un arbre, 10 m', 0, {'k': '10'}, 'correct', choix=1),
    spec('centimètre : cm', 1, {'w': '0'}, 'correct', choix=0),
    spec('Erreur : centimètre, ct', 1, {'w': '0'}, 'incorrect', choix=2),
    spec('mètre : m', 1, {'w': '1'}, 'correct', choix=1),
    spec('Erreur : mètre, cm', 1, {'w': '1'}, 'incorrect', choix=0),
    spec('15 cm : quinze centimètres', 2, {'n': '15', 'u': '0'}, 'correct', choix=0),
    spec('Erreur : 15 cm, quinze mètres', 2, {'n': '15', 'u': '0'}, 'incorrect', choix=1),
    spec('3 m : trois mètres', 2, {'n': '3', 'u': '1'}, 'correct', choix=1),
]

# ---- 5. Quelle longueur ? (CP-037, QCM) ----
# (début de phrase, bonne longueur, deux leurres) ; exemple du BO : trousse 2 cm / 20 cm / 1 m.

REFERENCES = [
    ('Une trousse mesure environ', (20, 'cm'), (2, 'cm'), (1, 'm')),
    ('Un crayon mesure environ', (15, 'cm'), (1, 'cm'), (15, 'm')),
    ('Une gomme mesure environ', (4, 'cm'), (40, 'cm'), (4, 'm')),
    ('La largeur d\'un doigt est environ', (1, 'cm'), (10, 'cm'), (1, 'm')),
    ('Une règle d\'écolier mesure environ', (20, 'cm'), (2, 'cm'), (2, 'm')),
    ('La hauteur d\'une porte est environ', (2, 'm'), (2, 'cm'), (20, 'm')),
    ('Un lit mesure environ', (2, 'm'), (20, 'cm'), (20, 'm')),
    ('La largeur de la classe est environ', (8, 'm'), (8, 'cm'), (80, 'm')),
    ('Le couloir de l\'école mesure environ', (30, 'm'), (30, 'cm'), (3, 'cm')),
    ('Un bus mesure environ', (12, 'm'), (12, 'cm'), (1, 'm')),
]
K_REF = range(1, len(REFERENCES) + 1)


def reference(i):
    return par('k', K_REF, lambda k: grandeur(*REFERENCES[k - 1][i]))


def en_cm(longueur):
    n, u = longueur
    return n * 100 if u == 'm' else n


def trop(ref):
    """« beaucoup trop petit », « … trop grand » ou les deux, selon les leurres."""
    bon = en_cm(ref[1])
    sens = {'petit' if en_cm(l) < bon else 'grand' for l in ref[2:]}
    if sens == {'petit'}:
        return 'c\'est beaucoup trop petit.'
    if sens == {'grand'}:
        return 'c\'est beaucoup trop grand.'
    return 'l\'une est beaucoup trop petite, l\'autre beaucoup trop grande.'


ORDRE_DE_GRANDEUR = qcm(
    par('k', K_REF, lambda k: REFERENCES[k - 1][0]) + ' …',
    variables(('k', '1..10')), [], [reference(1), reference(2), reference(3)], '0',
    [par('k', K_REF, lambda k: REFERENCES[k - 1][0] + ' ' + grandeur(*REFERENCES[k - 1][1])
         + '. ' + grandeur(*REFERENCES[k - 1][2]) + ' et ' + grandeur(*REFERENCES[k - 1][3])
         + ' ne sont pas possibles : ' + trop(REFERENCES[k - 1]))])

SPECS_REFERENCE = [
    spec('BO : trousse, 20 cm', 0, {'k': '1'}, 'correct', choix=0),
    spec('Erreur : trousse, 2 cm', 0, {'k': '1'}, 'incorrect', choix=1),
    spec('Erreur : trousse, 1 m', 0, {'k': '1'}, 'incorrect', choix=2),
    spec('porte : 2 m', 0, {'k': '6'}, 'correct', choix=0),
    spec('Erreur : porte, 2 cm', 0, {'k': '6'}, 'incorrect', choix=1),
    spec('borne : bus, 12 m', 0, {'k': '10'}, 'correct', choix=0),
]

# ---- 6. Un mètre, c'est 100 centimètres (CP-038, QCM) ----

M_EN_CM = qcm(
    'Complète : $1~\\unit{m}=\\ldots~\\unit{cm}$', [], [], ['$100$', '$10$', '$1$', '$50$'], '0',
    ['Dans un mètre, il y a cent centimètres : $1~\\unit{m}=100~\\unit{cm}$.'])

CM_EN_M = qcm(
    'Complète : $100~\\unit{cm}=\\ldots~\\unit{m}$', [], [], ['$1$', '$10$', '$100$', '$0$'],
    '0', ['Cent centimètres font un mètre : $100~\\unit{cm}=1~\\unit{m}$.'])

# Ficelle de 10 t cm (30 à 100) ; choix : le ruban, la ficelle, la même longueur.
COMPARER_M_CM = qcm(
    'Le ruban mesure $1~\\unit{m}$. La ficelle mesure ${{eval:10*t}}~\\unit{cm}$.\n\n'
    'Lequel est le plus long ?',
    variables(('t', '3..10')), [], ['le ruban', 'la ficelle', 'ils ont la même longueur'],
    '{{if:t==10|2|0}}',
    ['$1~\\unit{m}=100~\\unit{cm}$ : le ruban mesure $100~\\unit{cm}$.',
     '{{if:t==10|Le ruban et la ficelle mesurent tous les deux $100~\\unit{cm}$ : ils ont la '
     'même longueur.|${{eval:10*t}}<100$ : le ruban est le plus long.}}'])

SPECS_METRE = [
    spec('1 m = 100 cm', 0, {}, 'correct', choix=0),
    spec('Erreur : 1 m = 10 cm', 0, {}, 'incorrect', choix=1),
    spec('100 cm = 1 m', 1, {}, 'correct', choix=0),
    spec('Erreur : 100 cm = 100 m', 1, {}, 'incorrect', choix=2),
    spec('ruban 1 m, ficelle 60 cm : le ruban', 2, {'t': '6'}, 'correct', choix=0),
    spec('Erreur : ficelle 60 cm plus longue (60 > 1)', 2, {'t': '6'}, 'incorrect', choix=1),
    spec('borne : ficelle 90 cm, le ruban', 2, {'t': '9'}, 'correct', choix=0),
    spec('borne : ficelle 100 cm, même longueur', 2, {'t': '10'}, 'correct', choix=2),
    spec('Erreur : ficelle 100 cm, la ficelle', 2, {'t': '10'}, 'incorrect', choix=1),
]

# ---- 7. Lourd ou léger ? (CP-039, QCM) ----
# Paires (lourd, léger) très différentes ; s = 0 : le lourd est le choix 0, s = 1 : le choix 1.

PAIRES_MASSE = [('une pastèque', 'une cerise'), ('un cartable plein', 'une plume'),
                ('un éléphant', 'une souris'), ('une brique', 'une éponge'),
                ('un dictionnaire', 'une feuille de papier'), ('une voiture', 'un vélo')]
K_MASSE = range(1, len(PAIRES_MASSE) + 1)


def paire(i):
    return par('k', K_MASSE, lambda k: PAIRES_MASSE[k - 1][i])


LOURD_PREMIER = '{{if:s==0|' + paire(0) + '|' + paire(1) + '}}'
LOURD_SECOND = '{{if:s==0|' + paire(1) + '|' + paire(0) + '}}'
MASSE_VARIABLES = variables(('k', '1..6'), ('s', '0..1'))
MASSE_CORRIGE = 'On soupèse dans sa tête : ' + paire(0) + ' est bien plus lourd' \
                + par('k', K_MASSE, lambda k: 'e' if PAIRES_MASSE[k - 1][0].startswith('une ')
                      else '') + ' ' + par('k', K_MASSE, lambda k: 'qu\'' + PAIRES_MASSE[k - 1][1]
                                           if PAIRES_MASSE[k - 1][1].startswith('un')
                                           else 'que ' + PAIRES_MASSE[k - 1][1]) + '.'

PLUS_LOURD = qcm(
    'Qu\'est-ce qui est le plus **lourd** : ' + LOURD_PREMIER + ' ou ' + LOURD_SECOND + ' ?',
    MASSE_VARIABLES, [], [LOURD_PREMIER, LOURD_SECOND], '{{s}}',
    [MASSE_CORRIGE, 'Le plus lourd, c\'est ' + paire(0) + '.'])

PLUS_LEGER = qcm(
    'Qu\'est-ce qui est le plus **léger** : ' + LOURD_PREMIER + ' ou ' + LOURD_SECOND + ' ?',
    MASSE_VARIABLES, [], [LOURD_PREMIER, LOURD_SECOND], '{{eval:1-s}}',
    [MASSE_CORRIGE, 'Le plus léger, c\'est ' + paire(1) + '.'])

# w = 0 : lourd → léger (choix 0), w = 1 : léger → lourd (choix 1) ; « court » en leurre.
CONTRAIRE_MASSE = qcm(
    'Quel est le contraire de « **{{if:w==0|lourd|léger}}** » ?',
    variables(('w', '0..1')), [], ['léger', 'lourd', 'court'], '{{w}}',
    ['Le contraire de « {{if:w==0|lourd|léger}} » est « **{{if:w==0|léger|lourd}}** » : une '
     'brique est lourde, une plume est légère.'])

SPECS_MASSE = [
    spec('pastèque ou cerise : la pastèque', 0, {'k': '1', 's': '0'}, 'correct', choix=0),
    spec('Erreur : la cerise', 0, {'k': '1', 's': '0'}, 'incorrect', choix=1),
    spec('cerise ou pastèque : la pastèque (2e choix)', 0, {'k': '1', 's': '1'}, 'correct',
         choix=1),
    spec('plus léger : plume ou cartable, la plume', 1, {'k': '2', 's': '1'}, 'correct',
         choix=0),
    spec('Erreur : plus léger, le cartable', 1, {'k': '2', 's': '1'}, 'incorrect', choix=1),
    spec('borne : voiture ou vélo, le vélo est le plus léger', 1, {'k': '6', 's': '0'},
         'correct', choix=1),
    spec('contraire de lourd : léger', 2, {'w': '0'}, 'correct', choix=0),
    spec('Erreur : contraire de lourd, court', 2, {'w': '0'}, 'incorrect', choix=2),
    spec('contraire de léger : lourd', 2, {'w': '1'}, 'correct', choix=1),
]

# ---- 8. Les mots de la monnaie (CP-041, QCM) ----

PRIX = 'Un livre coûte ${{a}}~\\unit{€}$. Un ballon coûte ${{b}}~\\unit{€}$.\n\n'
PRIX_VARIABLES = variables(('a', '2..100'), ('b', '2..100'))
PRIX_COMPARE = '{{if:a>b|${{a}}>{{b}}$|${{a}}<{{b}}$}}'

PLUS_CHER = qcm(
    PRIX + 'Lequel est le plus **cher** ?', PRIX_VARIABLES, ['abs(a - b) >= 3'],
    ['le livre', 'le ballon'], '{{if:a>b|0|1}}',
    [PRIX_COMPARE + ' : le plus cher est celui qui coûte le plus d\'euros, '
     '{{if:a>b|le livre|le ballon}}.'])

MOINS_CHER = qcm(
    PRIX + 'Lequel est le **moins cher** ?', PRIX_VARIABLES, ['abs(a - b) >= 3'],
    ['le livre', 'le ballon'], '{{if:a<b|0|1}}',
    [PRIX_COMPARE + ' : le moins cher est celui qui coûte le moins d\'euros, '
     '{{if:a<b|le livre|le ballon}}.'])

VALEURS = [1, 2, 5, 10, 20, 50]
K_VALEUR = range(1, len(VALEURS) + 1)
PIECE_OU_BILLET = qcm(
    'Est-ce que ' + par('k', K_VALEUR, lambda k: grandeur(VALEURS[k - 1], '€'))
    + ' est une pièce ou un billet ?',
    variables(('k', '1..6')), [], ['une pièce', 'un billet'], '{{if:k<=2|0|1}}',
    ['Les **pièces** valent $1~\\unit{€}$ ou $2~\\unit{€}$ ; les **billets** valent '
     '$5~\\unit{€}$, $10~\\unit{€}$, $20~\\unit{€}$, $50~\\unit{€}$ ou plus.',
     par('k', K_VALEUR, lambda k: grandeur(VALEURS[k - 1], '€') + ', c\'est '
         + ('une pièce.' if k <= 2 else 'un billet.'))])

RENDRE_MONNAIE = qcm(
    'Tom achète une glace à ${{p}}~\\unit{€}$. Il donne un billet de $10~\\unit{€}$. '
    'Le marchand lui **rend la monnaie**.\n\nQue veut dire « rendre la monnaie » ?',
    variables(('p', '2..8')), [],
    ['Le marchand donne de l\'argent à Tom.', 'Tom donne encore de l\'argent au marchand.',
     'Le marchand donne une autre glace à Tom.'], '0',
    ['Tom a donné plus d\'argent que le prix de la glace : le marchand lui rend ce qui est en '
     'trop. **Rendre la monnaie**, c\'est donner de l\'argent à celui qui a payé.'])

SPECS_MONNAIE = [
    spec('livre 12 €, ballon 8 € : le livre est le plus cher', 0, {'a': '12', 'b': '8'},
         'correct', choix=0),
    spec('Erreur : le ballon', 0, {'a': '12', 'b': '8'}, 'incorrect', choix=1),
    spec('livre 5 €, ballon 40 € : le ballon est le plus cher', 0, {'a': '5', 'b': '40'},
         'correct', choix=1),
    spec('livre 12 €, ballon 8 € : le ballon est le moins cher', 1, {'a': '12', 'b': '8'},
         'correct', choix=1),
    spec('Erreur : moins cher, le livre', 1, {'a': '12', 'b': '8'}, 'incorrect', choix=0),
    spec('borne : livre 100 €, ballon 2 €', 1, {'a': '100', 'b': '2'}, 'correct', choix=1),
    spec('2 € : une pièce', 2, {'k': '2'}, 'correct', choix=0),
    spec('Erreur : 2 €, un billet', 2, {'k': '2'}, 'incorrect', choix=1),
    spec('5 € : un billet', 2, {'k': '3'}, 'correct', choix=1),
    spec('borne : 50 €, un billet', 2, {'k': '6'}, 'correct', choix=1),
    spec('rendre la monnaie : le marchand donne', 3, {'p': '3'}, 'correct', choix=0),
    spec('Erreur : Tom donne encore', 3, {'p': '3'}, 'incorrect', choix=1),
]

# ---- 9. Quelle heure pour… ? (CP-048, QCM) ----
# Heures entières, sur 12 heures, avec le moment de la journée (décision de David).
# (activité, bonne heure, deux leurres)

MOMENTS = [
    ('Tu te lèves pour aller à l\'école vers…', '$7$ heures du matin',
     '$2$ heures de l\'après-midi', '$10$ heures du soir'),
    ('Tu arrives à l\'école vers…', '$8$ heures du matin', '$8$ heures du soir', 'midi'),
    ('Tu déjeunes à la cantine vers…', 'midi', '$8$ heures du matin', '$8$ heures du soir'),
    ('Tu prends ton goûter vers…', '$4$ heures de l\'après-midi', '$4$ heures du matin',
     'midi'),
    ('Tu dînes avec ta famille vers…', '$7$ heures du soir', '$7$ heures du matin', 'midi'),
    ('Tu dors dans ton lit à…', '$11$ heures du soir', '$11$ heures du matin',
     '$4$ heures de l\'après-midi'),
]
K_MOMENT = range(1, len(MOMENTS) + 1)


def moment(i):
    return par('k', K_MOMENT, lambda k: MOMENTS[k - 1][i])


HEURE_DE = qcm(
    moment(0), variables(('k', '1..6')), [], [moment(1), moment(2), moment(3)], '0',
    [par('k', K_MOMENT, lambda k: MOMENTS[k - 1][0].replace('…', ' ').rstrip() + ' '
         + MOMENTS[k - 1][1] + '. ' + MOMENTS[k - 1][2][0].upper() + MOMENTS[k - 1][2][1:]
         + ' et ' + MOMENTS[k - 1][3] + ' ne conviennent pas.')])

# Activité à une heure ; les leurres sont les activités de deux autres moments.
ACTIVITES = [('$7$ heures du matin', 'te lever pour aller à l\'école',
              'tu te lèves pour aller à l\'école'),
             ('midi', 'déjeuner à la cantine', 'tu déjeunes à la cantine'),
             ('$4$ heures de l\'après-midi', 'prendre ton goûter', 'tu prends ton goûter'),
             ('$11$ heures du soir', 'dormir dans ton lit', 'tu dors dans ton lit')]
K_ACTIVITE = range(1, len(ACTIVITES) + 1)


def activite(decalage):
    return par('k', K_ACTIVITE,
               lambda k: ACTIVITES[(k - 1 + decalage) % len(ACTIVITES)][1].capitalize())


ACTIVITE_A = qcm(
    'Un jour d\'école, que fais-tu le plus souvent à '
    + par('k', K_ACTIVITE, lambda k: ACTIVITES[k - 1][0]) + ' ?',
    variables(('k', '1..4')), [], [activite(0), activite(1), activite(2)], '0',
    [par('k', K_ACTIVITE, lambda k: 'Un jour d\'école, à ' + ACTIVITES[k - 1][0] + ', '
         + ACTIVITES[k - 1][2] + '.')])

SPECS_MOMENT = [
    spec('se lever : 7 heures du matin', 0, {'k': '1'}, 'correct', choix=0),
    spec('Erreur : se lever, 10 heures du soir', 0, {'k': '1'}, 'incorrect', choix=2),
    spec('cantine : midi', 0, {'k': '3'}, 'correct', choix=0),
    spec('Erreur : goûter, 4 heures du matin', 0, {'k': '4'}, 'incorrect', choix=1),
    spec('borne : dormir, 11 heures du soir', 0, {'k': '6'}, 'correct', choix=0),
    spec('midi : déjeuner', 1, {'k': '2'}, 'correct', choix=0),
    spec('Erreur : midi, goûter', 1, {'k': '2'}, 'incorrect', choix=1),
    spec('11 heures du soir : dormir', 1, {'k': '4'}, 'correct', choix=0),
]

MODELES = {
    '01-ecrire-en-lettres': modele(
        'Écrire un nombre en lettres (jusqu\'à cinquante)',
        'Choisir l\'écriture en lettres d\'un nombre de 11 à 50 (leurres : chiffres inversés,'
        ' voisins) ; orthographe rectifiée',
        'Entiers', 'Apprivoiser', 'Ecriture', 13, 30, [EN_LETTRES], SPECS_EN_LETTRES),
    '02-lire-en-lettres': modele(
        'Lire un nombre écrit en lettres (jusqu\'à cinquante)',
        'Écrire en chiffres un nombre donné en lettres : trente-sept → 37',
        'Entiers', 'Apprivoiser', 'Ecriture', 14, 30, [EN_CHIFFRES], SPECS_EN_CHIFFRES),
    '03-long-court-pres-loin': modele(
        'Long, court, près, loin',
        'Le plus long ou le plus court de deux rubans, le plus près ou le plus loin en pas,'
        ' les contraires',
        'Grandeurs', 'Longueurs', 'Lexique', 1, 30,
        [PLUS_LONG, PLUS_COURT, PLUS_PRES, PLUS_LOIN, CONTRAIRE_LONGUEUR], SPECS_LONGUEUR),
    '04-metre-ou-centimetre': modele(
        'Mètre ou centimètre ?',
        'L\'unité qui convient (un crayon mesure 15 cm, la classe 8 m), le symbole, la lecture',
        'Grandeurs', 'Longueurs', 'Unités', 2, 30, [UNITE_ADAPTEE, SYMBOLE, LECTURE],
        SPECS_UNITE),
    '05-quelle-longueur': modele(
        'Quelle longueur ? (longueurs de référence)',
        'Choisir la longueur possible d\'un objet familier : une trousse mesure 2 cm, 20 cm'
        ' ou 1 m ?',
        'Grandeurs', 'Longueurs', 'Ordres de grandeur', 3, 30, [ORDRE_DE_GRANDEUR],
        SPECS_REFERENCE),
    '06-un-metre-cent-centimetres': modele(
        'Un mètre, c\'est 100 centimètres',
        '1 m = 100 cm dans les deux sens ; comparer 1 m et une longueur en cm (30 à 100 cm)',
        'Grandeurs', 'Longueurs', 'Unités', 4, 30, [M_EN_CM, CM_EN_M, COMPARER_M_CM],
        SPECS_METRE),
    '07-lourd-ou-leger': modele(
        'Lourd ou léger ?',
        'Le plus lourd ou le plus léger de deux objets familiers très différents, le contraire',
        'Grandeurs', 'Masses', 'Lexique', 1, 30, [PLUS_LOURD, PLUS_LEGER, CONTRAIRE_MASSE],
        SPECS_MASSE),
    '08-mots-de-la-monnaie': modele(
        'Les mots de la monnaie',
        'Plus cher, moins cher, pièce ou billet, rendre la monnaie (euros entiers)',
        'Grandeurs', 'Monnaie', 'Lexique', 1, 30,
        [PLUS_CHER, MOINS_CHER, PIECE_OU_BILLET, RENDRE_MONNAIE], SPECS_MONNAIE),
    '09-heure-et-moment': modele(
        'Quelle heure pour… ? (moments de la journée)',
        'Associer une heure entière à un moment de la journée : se lever, cantine, goûter,'
        ' dîner, dormir',
        'Grandeurs', 'Durées', 'Moments de la journée', 1, 30, [HEURE_DE, ACTIVITE_A],
        SPECS_MOMENT),
}

for nom, m in MODELES.items():
    with open(f'{DOSSIER}/{nom}.json', 'w') as f:
        json.dump(m, f, ensure_ascii=False, indent='\t')
        f.write('\n')
print(len(MODELES), 'modèles écrits')
