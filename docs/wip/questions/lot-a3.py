"""Écrit les 6 modèles du lot A3 (ordinaux, CP) dans scripts/questions/cp-a3/."""
import json
import sys

DOSSIER = sys.argv[1]

# Le moteur n'écrit pas les nombres en lettres : chaque mot ou texte qui dépend d'un tirage
# est calculé ici pour chaque valeur possible, puis choisi par une chaîne de {{if:…}}.

ORDINAUX = ['premier', 'deuxième', 'troisième', 'quatrième', 'cinquième', 'sixième',
            'septième', 'huitième', 'neuvième', 'dixième', 'onzième', 'douzième', 'treizième',
            'quatorzième', 'quinzième', 'seizième', 'dix-septième', 'dix-huitième',
            'dix-neuvième', 'vingtième']
CARDINAUX = ['un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf', 'dix',
             'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit',
             'dix-neuf', 'vingt']


def ordinal(i, genre='m'):
    """Le rang i (1 à 20) en lettres ; seul « premier » s'accorde."""
    return 'première' if (i == 1 and genre == 'f') else ORDINAUX[i - 1]


def cardinal(i, genre='m'):
    return 'une' if (i == 1 and genre == 'f') else CARDINAUX[i - 1]


def rang(i, genre='m'):
    """Le rang i en chiffres, en LaTeX (sans les $) : 1er / 1re, puis 2e, 3e…"""
    if i == 1:
        return '1^{\\text{' + ('re' if genre == 'f' else 'er') + '}}'
    return str(i) + '^{\\text{e}}'


def par(var, valeurs, f):
    """f(valeur) selon la valeur tirée de `var` : {{if:var==v1|…|{{if:var==v2|…|…}}}}."""
    valeurs = list(valeurs)
    expr = f(valeurs[-1])
    for x in reversed(valeurs[:-1]):
        expr = '{{if:' + var + '==' + str(x) + '|' + f(x) + '|' + expr + '}}'
    return expr


def voisins(i):
    """Les deux rangs voisins pris comme leurres (dans 1..20)."""
    if i == 1:
        return 2, 3
    if i == 20:
        return 18, 19
    return i - 1, i + 1


def spec(desc, vi, variables, status, choix=None, answers=None, violations=None):
    s = {'description': desc, 'variationIndex': vi, 'variables': variables,
         'expected': {'status': status}}
    if choix is not None:
        s['selectedChoices'] = [choix]
    if answers is not None:
        s['answers'] = answers
    if violations:
        s['expected']['constraintViolations'] = violations
    return s


def modele(title, description, level, delay, variations, specs):
    # theme / domain / subdomain : anciennes colonnes, remplies pour create-questions ; le
    # rangement (sous-notion « ordinaux et rangs ») est posé par la migration
    return {'title': title, 'description': description, 'grades': ['CP'], 'theme': 'Entiers',
            'domain': 'Apprivoiser', 'subdomain': 'Ordinaux', 'level': level, 'delay': delay,
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


RANGS = range(1, 21)

# Choix d'un QCM de mots : 0 = le bon rang, 1 et 2 = les rangs voisins, 3 = le nombre ordinaire
# (« sept » pour « septième »), la confusion la plus fréquente au CP.


def choix_mots(var, genre):
    return [par(var, RANGS, lambda i: ordinal(i, genre)),
            par(var, RANGS, lambda i: ordinal(voisins(i)[0], genre)),
            par(var, RANGS, lambda i: ordinal(voisins(i)[1], genre)),
            par(var, RANGS, lambda i: cardinal(i, genre))]


# ---- 1. Le rang en lettres (CP-009, QCM) ----

EN_LETTRES = qcm(
    'Comment écrit-on $' + par('k', RANGS, rang) + '$ en lettres ?',
    variables(('k', '1..20')), [], choix_mots('k', 'm'), '0',
    ['$' + par('k', RANGS, rang) + '$ se lit **' + par('k', RANGS, ordinal) + '**'
     + par('k', RANGS, lambda i: ' : c\'est la place numéro $1$, celle qui vient avant toutes les autres.' if i == 1 else
           ' : c\'est le rang numéro $' + str(i) + '$ (on dit « ' + cardinal(i)
           + ' », puis « ' + ordinal(i) + ' » pour une place).')])

SPECS_LETTRES = [
    spec('7e : septième', 0, {'k': '7'}, 'correct', choix=0),
    spec('Erreur : 7e, sixième', 0, {'k': '7'}, 'incorrect', choix=1),
    spec('Erreur : 7e, huitième', 0, {'k': '7'}, 'incorrect', choix=2),
    spec('Erreur : 7e, le nombre « sept »', 0, {'k': '7'}, 'incorrect', choix=3),
    spec('borne : 1er, premier', 0, {'k': '1'}, 'correct', choix=0),
    spec('borne : 20e, vingtième', 0, {'k': '20'}, 'correct', choix=0),
    spec('Erreur : 20e, le nombre « vingt »', 0, {'k': '20'}, 'incorrect', choix=3),
]

# ---- 2. Le rang en chiffres (CP-009, case) ----

EN_CHIFFRES = case(
    '« **' + par('k', RANGS, ordinal) + '** », c\'est la place numéro $?$.',
    variables(('k', '1..20')), [], '{{k}}',
    ['« ' + par('k', RANGS, ordinal) + ' » s\'écrit $' + par('k', RANGS, rang) + '$ : c\'est'
     ' la place numéro ${{k}}$.'])

SPECS_CHIFFRES = [
    spec('quatorzième : 14', 0, {'k': '14'}, 'correct', answers=['14']),
    spec('Erreur : quatorzième, 4', 0, {'k': '14'}, 'incorrect', answers=['4']),
    spec('Erreur : quatorzième, 40', 0, {'k': '14'}, 'incorrect', answers=['40']),
    spec('borne : premier, 1', 0, {'k': '1'}, 'correct', answers=['1']),
    spec('borne : vingtième, 20', 0, {'k': '20'}, 'correct', answers=['20']),
    spec('Zéro inutile', 0, {'k': '14'}, 'unoptimal_form', answers=['014'],
         violations=['zeros']),
]

# ---- Perles et file d'enfants (CP-010, CP-011) ----
# Un collier de n perles (5 à 20), la perle noire à la place k depuis la gauche.


# Entre deux perles, une espace : on la met en tête de chaque perle à partir de la 2e.
def collier_espace():
    perles = []
    for i in RANGS:
        sep = '' if i == 1 else ' '
        perles.append('{{if:k==' + str(i) + '|' + sep + '●|{{if:n>=' + str(i) + '|' + sep
                      + '○|}}}}')
    return ''.join(perles)


COLLIER = 'On enfile des perles sur un fil :\n\n' + collier_espace()

# File d'enfants, toujours dans le même ordre ; le genre de chaque enfant accorde « premier ».
ENFANTS = [('Léo', 'm'), ('Mia', 'f'), ('Sami', 'm'), ('Lina', 'f'), ('Tom', 'm'),
           ('Inès', 'f'), ('Noé', 'm'), ('Jade', 'f')]
PLACES_ENFANTS = range(1, 9)


def file_enfants():
    noms = ENFANTS[0][0] + ', ' + ', '.join(ENFANTS[i][0] for i in range(1, 4))
    for i in range(4, 8):
        noms += '{{if:n>=' + str(i + 1) + '|, ' + ENFANTS[i][0] + '|}}'
    return noms


def enfant(f):
    """f(nom, genre, place) pour l'enfant de la place k."""
    return par('k', PLACES_ENFANTS, lambda i: f(ENFANTS[i - 1][0], ENFANTS[i - 1][1], i))


# ---- 3. Dire la place (CP-010, QCM) ----

PERLE_PLACE = qcm(
    COLLIER + '\n\nEn comptant **à partir de la gauche**, la perle noire est la … perle.',
    variables(('n', '5..20'), ('k', '1..20')), ['k <= n'], choix_mots('k', 'f'), '0',
    ['On compte les perles **à partir de la gauche** jusqu\'à la perle noire : elle est à la'
     ' place ${{k}}$.',
     'La perle noire est la **' + par('k', RANGS, lambda i: ordinal(i, 'f')) + '** perle.'])


def choix_enfant():
    return [enfant(lambda nom, g, i: ordinal(i, g)),
            enfant(lambda nom, g, i: ordinal(voisins(i)[0], g)),
            enfant(lambda nom, g, i: ordinal(voisins(i)[1], g)),
            enfant(lambda nom, g, i: cardinal(i, g))]


ENFANT_PLACE = qcm(
    'Des enfants font la queue, **de gauche à droite** : ' + file_enfants() + '.\n\n'
    + enfant(lambda nom, g, i: nom + ' est ' + ('la' if g == 'f' else 'le')) + ' … de la file.',
    variables(('n', '5..8'), ('k', '1..8')), ['k <= n'], choix_enfant(), '0',
    ['On compte les enfants **à partir de la gauche** jusqu\'à '
     + enfant(lambda nom, g, i: nom) + ' : ' + enfant(
         lambda nom, g, i: ('il' if g == 'm' else 'elle') + ' est à la place $' + str(i)
         + '$.'),
     enfant(lambda nom, g, i: nom + ' est ' + ('la' if g == 'f' else 'le') + ' **'
            + ordinal(i, g) + '** de la file.')])

SPECS_PLACE = [
    spec('perle noire 4e sur 9 : quatrième', 0, {'n': '9', 'k': '4'}, 'correct', choix=0),
    spec('Erreur : perle 4e, troisième', 0, {'n': '9', 'k': '4'}, 'incorrect', choix=1),
    spec('Erreur : perle 4e, le nombre « quatre »', 0, {'n': '9', 'k': '4'}, 'incorrect',
         choix=3),
    spec('borne : perle 1re, première', 0, {'n': '5', 'k': '1'}, 'correct', choix=0),
    spec('borne : perle 20e sur 20, vingtième', 0, {'n': '20', 'k': '20'}, 'correct',
         choix=0),
    spec('Sami 3e : troisième', 1, {'n': '6', 'k': '3'}, 'correct', choix=0),
    spec('Erreur : Sami 3e, deuxième', 1, {'n': '6', 'k': '3'}, 'incorrect', choix=1),
    spec('borne : Léo 1er, premier', 1, {'n': '5', 'k': '1'}, 'correct', choix=0),
    spec('borne : Jade 8e sur 8, huitième', 1, {'n': '8', 'k': '8'}, 'correct', choix=0),
]

# ---- 4. Repérer un rang (CP-011, case) ----
# Listes de 5 nombres (exemple du BO : 2, 6, 10, 14, 18), puis le collier compté depuis la
# gauche ou depuis la droite (file orientée).

LISTE = ('Voici une liste de nombres, **de gauche à droite** :\n\n'
         '${{a}}$, ${{eval:a+d}}$, ${{eval:a+2*d}}$, ${{eval:a+3*d}}$, ${{eval:a+4*d}}$')
LISTE_VARIABLES = variables(('a', '1..9'), ('d', '2..5'), ('k', '1..5'))
ELEMENT = '{{eval:a+(k-1)*d}}'
NUMEROS_LISTE = ('On compte les places à partir de la gauche : ${{a}}$ est le $' + rang(1)
                 + '$, ${{eval:a+d}}$ le $' + rang(2) + '$, ${{eval:a+2*d}}$ le $' + rang(3)
                 + '$, ${{eval:a+3*d}}$ le $' + rang(4) + '$ et ${{eval:a+4*d}}$ le $'
                 + rang(5) + '$.')

NOMBRE_AU_RANG = case(
    LISTE + '\n\nQuel est le $' + par('k', range(1, 6), rang) + '$ nombre de la liste ?'
    '\n\nC\'est $?$.', LISTE_VARIABLES, [], ELEMENT,
    [NUMEROS_LISTE, 'Le $' + par('k', range(1, 6), rang) + '$ nombre est $' + ELEMENT + '$.'])

RANG_DU_NOMBRE = case(
    LISTE + '\n\nÀ quelle place est le nombre $' + ELEMENT + '$ ?\n\nIl est à la place numéro'
    ' $?$.', LISTE_VARIABLES, [], '{{k}}',
    [NUMEROS_LISTE, '$' + ELEMENT + '$ est à la place numéro ${{k}}$ : c\'est le $'
     + par('k', range(1, 6), rang) + '$ nombre.'])

PERLE_DEPUIS_DROITE = case(
    COLLIER + '\n\nEn comptant **à partir de la droite**, à quelle place est la perle noire ?'
    '\n\nElle est à la place numéro $?$.',
    variables(('n', '5..12'), ('k', '1..12')), ['k <= n', '2 * k != n + 1'], '{{eval:n-k+1}}',
    ['On part de la perle **la plus à droite** (place $1$) et on compte vers la gauche'
     ' jusqu\'à la perle noire.',
     'La perle noire est à la place numéro ${{eval:n-k+1}}$ en partant de la droite.'
     ' (En partant de la gauche, elle serait à la place ${{k}}$ : le sens compte.)'])

PERLE_DEPUIS_GAUCHE = case(
    COLLIER + '\n\nEn comptant **à partir de la gauche**, à quelle place est la perle noire ?'
    '\n\nElle est à la place numéro $?$.',
    variables(('n', '5..20'), ('k', '1..20')), ['k <= n'], '{{k}}',
    ['On part de la perle **la plus à gauche** (place $1$) et on compte vers la droite'
     ' jusqu\'à la perle noire.',
     'La perle noire est à la place numéro ${{k}}$ en partant de la gauche.'])

SPECS_REPERER = [
    spec('liste 2, 6, 10, 14, 18 : le 4e est 14', 0, {'a': '2', 'd': '4', 'k': '4'},
         'correct', answers=['14']),
    spec('Erreur : le 4e, le 3e (10)', 0, {'a': '2', 'd': '4', 'k': '4'}, 'incorrect',
         answers=['10']),
    spec('Erreur : le 4e, le 5e (18)', 0, {'a': '2', 'd': '4', 'k': '4'}, 'incorrect',
         answers=['18']),
    spec('borne : le 1er est 2', 0, {'a': '2', 'd': '4', 'k': '1'}, 'correct', answers=['2']),
    spec('liste 2, 6, 10, 14, 18 : 10 est à la place 3', 1, {'a': '2', 'd': '4', 'k': '3'},
         'correct', answers=['3']),
    spec('Erreur : place de 10, le nombre lui-même', 1, {'a': '2', 'd': '4', 'k': '3'},
         'incorrect', answers=['10']),
    spec('perle 3e depuis la gauche sur 8 : 6e depuis la droite', 2, {'n': '8', 'k': '3'},
         'correct', answers=['6']),
    spec('Erreur : compté depuis la gauche (3)', 2, {'n': '8', 'k': '3'}, 'incorrect',
         answers=['3']),
    spec('Erreur : une perle de trop (7)', 2, {'n': '8', 'k': '3'}, 'incorrect',
         answers=['7']),
    spec('borne : perle la plus à gauche sur 12 : 12e depuis la droite', 2,
         {'n': '12', 'k': '1'}, 'correct', answers=['12']),
    spec('perle 15e sur 20 depuis la gauche', 3, {'n': '20', 'k': '15'}, 'correct',
         answers=['15']),
    spec('Erreur : compté depuis la droite (6)', 3, {'n': '20', 'k': '15'}, 'incorrect',
         answers=['6']),
    spec('Zéro inutile', 3, {'n': '20', 'k': '15'}, 'unoptimal_form', answers=['015'],
         violations=['zeros']),
]

# ---- 5. Rang et nombre devant (CP-012, case) ----

DEVANT = case(
    'Des enfants font la queue à la cantine. Lina est la $' + par('k', RANGS,
                                                                    lambda i: rang(i, 'f'))
    + '$ de la file.\n\nCombien d\'enfants y a-t-il devant elle ?\n\nNombre d\'enfants devant'
    ' Lina : $?$.',
    variables(('k', '1..20')), [], '{{eval:k-1}}',
    [par('k', RANGS, lambda i: 'Lina est la première : personne n\'est devant elle.' if i == 1
         else 'Lina est à la place $' + str(i) + '$ : les enfants des places $1$ à $'
         + str(i - 1) + '$ sont devant elle.' if i > 2 else
         'Lina est à la place $2$ : seul l\'enfant de la place $1$ est devant elle.'),
     par('k', RANGS, lambda i: 'Il y a $0$ enfant devant Lina.' if i == 1 else
         'Il y a $1$ enfant devant Lina.' if i == 2 else
         '$$' + str(i) + '-1=' + str(i - 1) + '$$ Il y a $' + str(i - 1)
         + '$ enfants devant Lina.')])

RANG_APRES = case(
    'Dans la file de la cantine, il y a ${{d}}$ ' + par('d', range(1, 20),
                                                       lambda i: 'enfant' if i == 1
                                                       else 'enfants')
    + ' devant Tom.\n\nÀ quelle place est Tom ?\n\nTom est à la place numéro $?$.',
    variables(('d', '1..19')), [], '{{eval:d+1}}',
    [par('d', range(1, 20), lambda i: 'La première place est prise par l\'enfant' if i == 1
         else 'Les $' + str(i) + '$ premières places sont prises par les enfants')
     + ' devant Tom ; Tom est juste après.',
     '$${{d}}+1={{eval:d+1}}$$',
     'Tom est le $' + par('d', range(1, 20), lambda i: rang(i + 1)) + '$ de la file.'])

DERRIERE = case(
    'Il y a ${{n}}$ enfants dans la file. Sami est le $' + par('k', range(1, 20), rang)
    + '$.\n\nCombien d\'enfants y a-t-il derrière lui ?\n\nNombre d\'enfants derrière Sami :'
    ' $?$.',
    variables(('n', '4..20'), ('k', '1..19')), ['k < n'], '{{eval:n-k}}',
    ['Jusqu\'à la place de Sami, lui compris, il y a ${{k}}$ '
     + par('k', range(1, 20), lambda i: 'enfant' if i == 1 else 'enfants')
     + '. Les autres sont derrière lui.',
     '$${{n}}-{{k}}={{eval:n-k}}$$',
     'Il y a ${{eval:n-k}}$ {{if:n-k==1|enfant|enfants}} derrière Sami.'])

SPECS_DEVANT = [
    spec('Lina 3e : 2 devant', 0, {'k': '3'}, 'correct', answers=['2']),
    spec('Erreur : Lina 3e, le rang (3)', 0, {'k': '3'}, 'incorrect', answers=['3']),
    spec('borne : Lina 1re, 0 devant', 0, {'k': '1'}, 'correct', answers=['0']),
    spec('borne : Lina 20e, 19 devant', 0, {'k': '20'}, 'correct', answers=['19']),
    spec('4 devant Tom : 5e', 1, {'d': '4'}, 'correct', answers=['5']),
    spec('Erreur : 4 devant Tom, 4', 1, {'d': '4'}, 'incorrect', answers=['4']),
    spec('borne : 1 devant Tom, 2e', 1, {'d': '1'}, 'correct', answers=['2']),
    spec('borne : 19 devant Tom, 20e', 1, {'d': '19'}, 'correct', answers=['20']),
    spec('BO : 6 dans la file, Sami 3e, 3 derrière', 2, {'n': '6', 'k': '3'}, 'correct',
         answers=['3']),
    spec('Erreur : Sami compté avec ceux de derrière (4)', 2, {'n': '6', 'k': '3'},
         'incorrect', answers=['4']),
    spec('Erreur : ceux de devant (2)', 2, {'n': '6', 'k': '3'}, 'incorrect', answers=['2']),
    spec('borne : 20 dans la file, Sami 19e, 1 derrière', 2, {'n': '20', 'k': '19'},
         'correct', answers=['1']),
    spec('Zéro inutile', 0, {'k': '3'}, 'unoptimal_form', answers=['02'],
         violations=['zeros']),
]

# ---- 6. Suites qui se répètent (CP-013, QCM) ----
# Motif montré deux fois, place demandée au-delà (jusqu'à la 20e). Les choix sont les éléments
# DISTINCTS du motif ; `bon` = le numéro du bon choix, en formule de k (le bon choix d'un QCM
# n'accepte pas une chaîne de {{if:…}} imbriqués).


def suite(motif, choix, bon, question):
    p = len(motif)
    places = range(2 * p + 1, 21)
    montre = ' '.join(motif * 2) + ' …'

    def jusqua(k):
        elements = [motif[(j - 1) % p] for j in range(1, k + 1)]
        return ' '.join(elements[:-1] + ['**' + elements[-1] + '**'])

    return qcm(
        'Voici le début d\'une suite qui se répète :\n\n' + montre + '\n\n' + question + ' est à la $' + par('k', places, rang) + '$ place ?',
        variables(('k', f'{2 * p + 1}..20')), [], choix,
        '{{eval:' + bon + '}}',
        ['Le motif ' + ' '.join(motif) + ' se répète : il a $' + str(p) + '$ éléments.'
         ' On continue la suite jusqu\'à la $' + par('k', places, rang) + '$ place :',
         par('k', places, jusqua),
         'À la $' + par('k', places, rang) + '$ place, il y a '
         + par('k', places, lambda k: motif[(k - 1) % p]) + '.'])


FORME = 'Quelle forme'
LETTRE = 'Quelle lettre'
AB = suite(['●', '▲'], ['●', '▲'], 'mod(k-1,2)', FORME)
# ● ● ▲ : r = mod(k-1,3) vaut 0, 1, 2 ; r(r-1)/2 vaut 0, 0, 1 (●, ●, ▲)
AAB = suite(['●', '●', '▲'], ['●', '▲'], 'mod(k-1,3)*(mod(k-1,3)-1)/2', FORME)
ABC = suite(['■', '▲', '●'], ['■', '▲', '●'], 'mod(k-1,3)', FORME)
ABCD = suite(['A', 'B', 'C', 'D'], ['A', 'B', 'C', 'D'], 'mod(k-1,4)', LETTRE)

SPECS_SUITES = [
    spec('● ▲ : 9e place, ●', 0, {'k': '9'}, 'correct', choix=0),
    spec('Erreur : ● ▲, 9e place, ▲', 0, {'k': '9'}, 'incorrect', choix=1),
    spec('borne : ● ▲, 20e place, ▲', 0, {'k': '20'}, 'correct', choix=1),
    spec('● ● ▲ : 9e place, ▲', 1, {'k': '9'}, 'correct', choix=1),
    spec('● ● ▲ : 10e place, ●', 1, {'k': '10'}, 'correct', choix=0),
    spec('Erreur : ● ● ▲, 9e place, ●', 1, {'k': '9'}, 'incorrect', choix=0),
    spec('■ ▲ ● : 8e place, ▲', 2, {'k': '8'}, 'correct', choix=1),
    spec('Erreur : ■ ▲ ●, 8e place, ●', 2, {'k': '8'}, 'incorrect', choix=2),
    spec('A B C D : 11e place, C', 3, {'k': '11'}, 'correct', choix=2),
    spec('borne : A B C D, 20e place, D', 3, {'k': '20'}, 'correct', choix=3),
    spec('Erreur : A B C D, 11e place, B', 3, {'k': '11'}, 'incorrect', choix=1),
]

MODELES = {
    '01-rang-en-lettres': modele(
        'Le rang en lettres (jusqu\'à vingtième)',
        'Écrire un rang en lettres : 7e → septième (leurres : sixième, huitième, sept)',
        1, 30, [EN_LETTRES], SPECS_LETTRES),
    '02-rang-en-chiffres': modele(
        'Le rang en chiffres (jusqu\'à vingtième)',
        'Lire un rang écrit en lettres : quatorzième → place numéro 14',
        2, 30, [EN_CHIFFRES], SPECS_CHIFFRES),
    '03-dire-la-place': modele(
        'Dire la place (jusqu\'à vingtième)',
        'Dire en lettres la place d\'une perle ou d\'un enfant, de gauche à droite',
        3, 45, [PERLE_PLACE, ENFANT_PLACE], SPECS_PLACE),
    '04-reperer-un-rang': modele(
        'Repérer un rang dans une liste ou une file',
        'Le 4e nombre d\'une liste, la place d\'un nombre, une perle comptée depuis la gauche'
        ' ou depuis la droite',
        4, 60, [NOMBRE_AU_RANG, RANG_DU_NOMBRE, PERLE_DEPUIS_DROITE, PERLE_DEPUIS_GAUCHE],
        SPECS_REPERER),
    '05-rang-et-nombre-devant': modele(
        'Rang et nombre d\'enfants devant',
        'Je suis le 3e : combien devant moi ? 4 devant moi : quelle place ? Combien derrière ?',
        5, 60, [DEVANT, RANG_APRES, DERRIERE], SPECS_DEVANT),
    '06-suites-qui-se-repetent': modele(
        'Suites qui se répètent : quel élément à quelle place ?',
        'Motifs de 2 à 4 éléments (● ▲, ● ● ▲, ■ ▲ ●, A B C D) : l\'élément de la 9e place',
        6, 60, [AB, AAB, ABC, ABCD], SPECS_SUITES),
}

for nom, m in MODELES.items():
    with open(f'{DOSSIER}/{nom}.json', 'w') as f:
        json.dump(m, f, ensure_ascii=False, indent='\t')
        f.write('\n')
print(len(MODELES), 'modèles écrits')
