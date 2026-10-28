"""Écrit les 7 modèles du lot 2 bis du CE1 (ordinaux) dans scripts/questions/ce1-2bis/.

Phase 0 validée par David le 2026-10-28 (« je te suis », § 8 du journal
`docs/wip/questions-ce1-progress.md`). Bornes `cycle2.json`, CE1-011 à 015 : rangs jusqu'au
centième ; suites répétitives ET évolutives (exemples du BO p.11 : ABAB… 89e, △ ▢ ○ 60e,
△ ✕ ▢ ○ 80e, ABGF 17e, 1, 2, 4, 7, 11… 11e, 1, 2, 4, 8… 9e, △ ✕ △ ✕✕… 20e) ; 167 cyclistes,
combien avant le 48e. Décisions :

1. Choix écrits directement en case « choix » (bloc ```choix, réponse = indice d'origine).
2. Mots jusqu'à cent : le moteur n'écrit pas les nombres en lettres ; les rangs des modèles 1 et 2
   sont tirés dans une liste de cas qui piègent (« -et-un », 70 à 99, cent) et de cas simples.
   Orthographe rectifiée, celle du BO (« vingt-et-une », « trente-et-un ») : traits d'union
   partout.
3. Rangs des énoncés des modèles 3 à 7 en chiffres (89e).
4. « 1, 3, 5, 7, 9… » avec les suites évolutives (modèle 7), rangs jusqu'au 50e.

Niveaux : « Ordinaux » prend 1 à 6 au CP (relevé en prod le 2026-10-28) ; le CE1 prend 7 à 13.

    python3 docs/wip/questions/lot-ce1-2bis.py scripts/questions/ce1-2bis
"""
import json
import sys

DOSSIER = sys.argv[1]

# ---- Nombres et rangs en lettres (1 à 100) ----

UNITES = ['', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf', 'dix',
          'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize']
DIZAINES = {2: 'vingt', 3: 'trente', 4: 'quarante', 5: 'cinquante', 6: 'soixante'}


def cardinal(n):
    """n (1 à 100) en lettres, orthographe rectifiée (traits d'union partout)."""
    if n == 100:
        return 'cent'
    if n <= 16:
        return UNITES[n]
    if n < 20:
        return 'dix-' + UNITES[n - 10]
    if n == 80:
        return 'quatre-vingts'
    if n < 60 or (60 <= n < 70):
        d, u = divmod(n, 10)
        base = DIZAINES[d]
    elif n < 80:
        base, u = 'soixante', n - 60
    else:
        base, u = 'quatre-vingt', n - 80
    if u == 0:
        return base
    if u in (1, 11) and base != 'quatre-vingt':
        return base + '-et-' + UNITES[u]
    return base + '-' + (UNITES[u] if u <= 16 else 'dix-' + UNITES[u - 10])


def ordinal(n, genre='m'):
    """Le rang n en lettres : premier / première, puis deuxième… centième."""
    if n == 1:
        return 'première' if genre == 'f' else 'premier'
    mot = cardinal(n)
    if mot.endswith('quatre-vingts'):
        mot = mot[:-1]
    if mot.endswith('cinq'):
        return mot + 'uième'
    if mot.endswith('neuf'):
        return mot[:-1] + 'vième'
    if mot.endswith('e'):
        mot = mot[:-1]
    return mot + 'ième'


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


def r(var, valeurs, genre='m'):
    """Le rang tiré, en chiffres, prêt pour un énoncé : $48^{\\text{e}}$."""
    return '$' + par(var, valeurs, lambda i: rang(i, genre)) + '$'


# ---- Gabarits ----


def spec(desc, vi, variables, answers, status, violations=None):
    s = {'description': desc, 'variationIndex': vi, 'variables': variables,
         'answers': answers if isinstance(answers, list) else [answers],
         'expected': {'status': status}}
    if violations:
        s['expected']['constraintViolations'] = violations
    return s


def modele(title, description, level, variations, specs, delay=45):
    # theme / domain / subdomain : anciennes colonnes, remplies pour create-questions ; le
    # rangement (sous-notion « ordinaux et rangs ») est posé par la migration
    return {'title': title, 'description': description, 'grades': ['CE1'], 'theme': 'Entiers',
            'domain': 'Apprivoiser', 'subdomain': 'Ordinaux', 'level': level, 'delay': delay,
            'status': 'draft', 'variations': variations, 'testSpecs': specs}


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


def choix(*lignes):
    return '\n\n```choix\n' + '\n'.join('- ' + c for c in lignes) + '\n```'


# ---- 1. et 2. Le rang en lettres, le rang en chiffres (CE1-011) ----
# Rang `k` tiré dans la liste RANGS_LETTRES (variable en liste `21|30|…`). Jamais de variable `i`
# (lue comme l'unité imaginaire : une chaîne {{if:i==…}} retombe toujours sur sa dernière branche).

RANGS_LETTRES = [21, 30, 31, 41, 48, 52, 60, 61, 67, 70, 71, 72, 77, 80, 81, 85, 89, 90, 91, 97,
                 99, 100]
TIRAGE = [var('k', '|'.join(str(n) for n in RANGS_LETTRES))]


def voisins(n):
    return (98, 99) if n == 100 else (n - 1, n + 1)


def mot(f):
    return par('k', RANGS_LETTRES, f)


EN_LETTRES = variation(
    'Comment écrit-on ' + r('k', RANGS_LETTRES) + ' en lettres ?'
    + choix(mot(ordinal), mot(lambda n: ordinal(voisins(n)[0])),
            mot(lambda n: ordinal(voisins(n)[1])), mot(cardinal)),
    TIRAGE, '0',
    [r('k', RANGS_LETTRES) + ' se lit **' + mot(ordinal) + '** : c\'est la place numéro ${{k}}$.',
     'On dit « ' + mot(cardinal) + ' » pour le nombre, « ' + mot(ordinal) + ' » pour la place.'])


SPECS_LETTRES = [
    spec('48e : quarante-huitième', 0, {'k': '48'}, '0', 'correct'),
    spec('Erreur : 48e, quarante-septième', 0, {'k': '48'}, '1', 'incorrect'),
    spec('Erreur : 48e, quarante-neuvième', 0, {'k': '48'}, '2', 'incorrect'),
    spec('Erreur : 48e, le nombre « quarante-huit »', 0, {'k': '48'}, '3',
         'incorrect'),
    spec('borne : 21e, vingt-et-unième', 0, {'k': '21'}, '0', 'correct'),
    spec('borne : 100e, centième', 0, {'k': '100'}, '0', 'correct'),
    spec('Erreur : 100e, le nombre « cent »', 0, {'k': '100'}, '3', 'incorrect'),
]

EN_CHIFFRES = variation(
    '« **' + mot(ordinal) + '** », c\'est la place numéro $?$.',
    TIRAGE, '{{k}}',
    ['« ' + mot(ordinal) + ' » vient de « ' + mot(cardinal) + ' » : c\'est la place numéro'
     ' ${{k}}$, le ' + r('k', RANGS_LETTRES) + '.'])

SPECS_CHIFFRES = [
    spec('quatre-vingt-unième : 81', 0, {'k': '81'}, '81', 'correct'),
    spec('Erreur : quatre-vingt-unième, 4201 (mots juxtaposés)', 0, {'k': '81'},
         '4201', 'incorrect'),
    spec('Erreur : quatre-vingt-unième, 80', 0, {'k': '81'}, '80', 'incorrect'),
    spec('soixante-et-onzième : 71', 0, {'k': '71'}, '71', 'correct'),
    spec('Erreur : soixante-et-onzième, 611', 0, {'k': '71'}, '611', 'incorrect'),
    spec('borne : vingt-et-unième, 21', 0, {'k': '21'}, '21', 'correct'),
    spec('borne : centième, 100', 0, {'k': '100'}, '100', 'correct'),
    spec('Zéro inutile', 0, {'k': '48'}, '048', 'unoptimal_form',
         violations=['zeros']),
]

# ---- 3. Dire la place dans une liste (CE1-012) ----
# Listes écrites en entier (au plus 30 nombres) et l'alphabet : la place d'un élément.

ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'


def liste(debut, pas, n):
    return ', '.join('$' + str(debut + j * pas) + '$' for j in range(n))


def liste_de(debut, pas, n, k):
    return ('Voici des nombres rangés **dans l\'ordre**, de ' + str(pas) + ' en ' + str(pas)
            + ' :\n\n' + liste(debut, pas, n) + '\n\nÀ quelle place est le nombre $'
            + '{{eval:' + str(debut) + '+(' + k + '-1)*' + str(pas) + '}}$ ?\n\n'
            'Il est à la place numéro $?$.')


def place_correction(debut, pas):
    return ['On compte les nombres un par un à partir du premier : $' + str(debut)
            + '$ est le $' + rang(1) + '$, $' + str(debut + pas) + '$ le $' + rang(2) + '$, $'
            + str(debut + 2 * pas) + '$ le $' + rang(3) + '$…',
            'De $' + str(debut) + '$ jusqu\'à $' + '{{eval:' + str(debut) + '+(k-1)*' + str(pas)
            + '}}$ compris, on compte ${{k}}$ nombres : $' + '{{eval:' + str(debut) + '+(k-1)*'
            + str(pas) + '}}$ est à la place numéro ${{k}}$.']


PLACE_5 = variation(liste_de(5, 5, 20, 'k'), [var('k', '4..20')], '{{k}}',
                    place_correction(5, 5))
PLACE_2 = variation(liste_de(2, 2, 30, 'k'), [var('k', '8..30')], '{{k}}',
                    place_correction(2, 2))
PLACE_10 = variation(liste_de(100, 10, 25, 'k'), [var('k', '4..25')], '{{k}}',
                     place_correction(100, 10))
PLACE_LETTRE = variation(
    'Voici l\'alphabet :\n\n' + ' '.join(ALPHABET) + '\n\nÀ quelle place est la lettre **'
    + par('k', range(1, 27), lambda j: ALPHABET[j - 1]) + '** ?\n\nElle est à la place numéro $?$.',
    [var('k', '5..26')], '{{k}}',
    ['On compte les lettres à partir de A, la $' + rang(1, 'f') + '$ : B est la $' + rang(2)
     + '$, C la $' + rang(3) + '$…',
     'La lettre ' + par('k', range(1, 27), lambda j: ALPHABET[j - 1]) + ' est la '
     + r('k', range(1, 27)) + ' lettre de l\'alphabet.'])

SPECS_PLACE = [
    spec('5 en 5 : 60 est 12e', 0, {'k': '12'}, '12', 'correct'),
    spec('Erreur : le nombre lui-même (60)', 0, {'k': '12'}, '60', 'incorrect'),
    spec('Erreur : 60 / 10 (6)', 0, {'k': '12'}, '6', 'incorrect'),
    spec('borne : 100 est 20e', 0, {'k': '20'}, '20', 'correct'),
    spec('2 en 2 : 30 est 15e', 1, {'k': '15'}, '15', 'correct'),
    spec('Erreur : 2 en 2, le nombre (30)', 1, {'k': '15'}, '30', 'incorrect'),
    spec('borne : 60 est 30e', 1, {'k': '30'}, '30', 'correct'),
    spec('10 en 10 depuis 100 : 270 est 18e', 2, {'k': '18'}, '18', 'correct'),
    spec('Erreur : 10 en 10, 27 (dizaines de 270)', 2, {'k': '18'}, '27', 'incorrect'),
    spec('Erreur : 10 en 10, 17 (une de moins)', 2, {'k': '18'}, '17', 'incorrect'),
    spec('P est 16e', 3, {'k': '16'}, '16', 'correct'),
    spec('Erreur : P, 15', 3, {'k': '16'}, '15', 'incorrect'),
    spec('borne : Z est 26e', 3, {'k': '26'}, '26', 'correct'),
]

# ---- 4. Repérer un rang (CE1-013) ----
# Le k-ième nombre d'une liste écrite en entier, depuis le début ou depuis la fin ; une file
# d'élèves comptée depuis la tête ou depuis la fin.

NOMBRE_AU_RANG = variation(
    'Voici des nombres rangés **dans l\'ordre**, de 5 en 5 :\n\n' + liste(5, 5, 20)
    + '\n\nQuel est le ' + r('k', range(4, 21)) + ' nombre ?\n\nC\'est $?$.',
    [var('k', '4..20')], '{{eval:5*k}}',
    ['On compte les nombres à partir du premier : $5$ est le $' + rang(1) + '$, $10$ le $'
     + rang(2) + '$, $15$ le $' + rang(3) + '$…',
     'Le ' + r('k', range(4, 21)) + ' nombre est ${{eval:5*k}}$.'])

DEPUIS_LA_FIN = variation(
    'Voici des nombres rangés **dans l\'ordre**, de 2 en 2 :\n\n' + liste(2, 2, 30)
    + '\n\nEn comptant **à partir de la fin**, quel est le ' + r('k', range(2, 26))
    + ' nombre ?\n\nC\'est $?$.',
    [var('k', '2..25')], '{{eval:62-2*k}}',
    ['On part du **dernier** nombre, $60$ : c\'est le $' + rang(1) + '$ en partant de la fin ;'
     ' $58$ est le $' + rang(2) + '$, $56$ le $' + rang(3) + '$…',
     'En partant de la fin, le ' + r('k', range(2, 26)) + ' nombre est ${{eval:62-2*k}}$.'])

FILE_RETOURNEE = variation(
    '${{n}}$ élèves sont en file pour entrer au gymnase. Inès est la ' + r('k', range(2, 40), 'f')
    + ' en partant **de la tête** de la file.\n\nÀ quelle place est-elle en partant **de la'
    ' fin** de la file ?\n\nElle est à la place numéro $?$.',
    [var('n', '20..40'), var('k', '2..39'), var('q', 'eval:n-k+1')], '{{q}}',
    ['Devant Inès, il y a ${{eval:k-1}}$ élèves ; derrière elle, il y en a'
     ' ${{n}}-{{k}}={{eval:n-k}}$.',
     'En partant de la fin, on compte les ${{eval:n-k}}$ élèves derrière elle, puis Inès :'
     ' ${{eval:n-k}}+1={{q}}$. Elle est la ' + r('q', range(2, 40), 'f') + '.'],
    ['k < n', '2 * k != n + 1'])

SPECS_REPERER = [
    spec('5 en 5 : le 12e est 60', 0, {'k': '12'}, '60', 'correct'),
    spec('Erreur : le 11e (55)', 0, {'k': '12'}, '55', 'incorrect'),
    spec('Erreur : le 13e (65)', 0, {'k': '12'}, '65', 'incorrect'),
    spec('borne : le 20e est 100', 0, {'k': '20'}, '100', 'correct'),
    spec('depuis la fin : le 3e est 56', 1, {'k': '3'}, '56', 'correct'),
    spec('Erreur : compté depuis le début (6)', 1, {'k': '3'}, '6', 'incorrect'),
    spec('borne : le 25e depuis la fin est 12', 1, {'k': '25'}, '12', 'correct'),
    spec('30 élèves, Inès 7e depuis la tête : 24e depuis la fin', 2, {'n': '30', 'k': '7', 'q': '24'}, '24',
         'correct'),
    spec('Erreur : n − k (23)', 2, {'n': '30', 'k': '7', 'q': '24'}, '23', 'incorrect'),
    spec('Erreur : le même rang (7)', 2, {'n': '30', 'k': '7', 'q': '24'}, '7', 'incorrect'),
    spec('borne : 40 élèves, Inès 39e : 2e depuis la fin', 2, {'n': '40', 'k': '39', 'q': '2'}, '2',
         'correct'),
]

# ---- 5. Rang et nombre devant (CE1-014) ----
# Exemple du BO : 167 cyclistes, combien sont arrivés avant le 48e.

AVANT = variation(
    '${{n}}$ cyclistes terminent une étape du Tour de France. Combien de cyclistes sont'
    ' arrivés **avant** le ' + r('k', range(2, 101)) + ' ?\n\n$?$ cyclistes sont arrivés avant'
    ' lui.',
    [var('n', '100..200'), var('k', '2..100')], '{{eval:k-1}}',
    ['Les cyclistes arrivés avant le ' + r('k', range(2, 101)) + ' sont ceux des places $1$ à'
     ' ${{eval:k-1}}$ : il ne faut pas le compter, lui.',
     '$${{k}}-1={{eval:k-1}}$$ ${{eval:k-1}}$ cyclistes sont arrivés avant lui.'])

RANG_APRES = variation(
    'À l\'arrivée d\'une course, ${{d}}$ coureurs ont franchi la ligne avant Lina.\n\n'
    'Quelle est la place de Lina ?\n\nLina est à la place numéro $?$.',
    [var('d', '10..99'), var('p', 'eval:d+1')], '{{p}}',
    ['Les ${{d}}$ premières places sont prises par les coureurs arrivés avant Lina ; Lina'
     ' arrive juste après.',
     '$${{d}}+1={{p}}$$ Lina est la ' + r('p', range(11, 101), 'f') + '.'])

APRES = variation(
    '${{n}}$ coureurs participent à une course. Noé arrive ' + r('k', range(10, 100))
    + '.\n\nCombien de coureurs arrivent **après** lui ?\n\n$?$ coureurs arrivent après Noé.',
    [var('n', '40..100'), var('k', '10..99')], '{{eval:n-k}}',
    ['Jusqu\'à Noé, lui compris, ${{k}}$ coureurs sont arrivés. Les autres arrivent après lui.',
     '$${{n}}-{{k}}={{eval:n-k}}$$ ${{eval:n-k}}$ coureurs arrivent après Noé.'],
    ['k < n'])

SPECS_DEVANT = [
    spec('BO : 167 cyclistes, avant le 48e : 47', 0, {'n': '167', 'k': '48'}, '47', 'correct'),
    spec('Erreur : le rang (48)', 0, {'n': '167', 'k': '48'}, '48', 'incorrect'),
    spec('Erreur : ceux d\'après (119)', 0, {'n': '167', 'k': '48'}, '119', 'incorrect'),
    spec('borne : avant le 2e : 1', 0, {'n': '100', 'k': '2'}, '1', 'correct'),
    spec('borne : avant le 100e : 99', 0, {'n': '200', 'k': '100'}, '99', 'correct'),
    spec('35 avant Lina : 36e', 1, {'d': '35', 'p': '36'}, '36', 'correct'),
    spec('Erreur : 35 avant Lina, 35', 1, {'d': '35', 'p': '36'}, '35', 'incorrect'),
    spec('borne : 99 avant Lina : 100e', 1, {'d': '99', 'p': '100'}, '100', 'correct'),
    spec('60 coureurs, Noé 25e : 35 après', 2, {'n': '60', 'k': '25'}, '35', 'correct'),
    spec('Erreur : Noé compté (36)', 2, {'n': '60', 'k': '25'}, '36', 'incorrect'),
    spec('Erreur : ceux d\'avant (24)', 2, {'n': '60', 'k': '25'}, '24', 'incorrect'),
    spec('borne : 100 coureurs, Noé 99e : 1 après', 2, {'n': '100', 'k': '99'}, '1', 'correct'),
]

# ---- 6. Suites qui se répètent (CE1-015, case choix) ----
# Motifs du BO, élément à la k-ième place jusqu'à la 100e. Les choix sont les éléments du motif
# (tous distincts) ; la bonne réponse = mod(k-1,p). Correction : on compte de p en p jusqu'à la
# dernière place qui finit un motif (m), puis on avance de k − m.


def suite(motif, question):
    p = len(motif)
    places = range(2 * p + 1, 101)
    return variation(
        'Voici le début d\'une suite qui se répète :\n\n' + ' '.join(motif * 2) + ' …\n\n'
        + question + ' est à la ' + r('k', places, 'f') + ' place ?' + choix(*motif),
        [var('k', f'{2 * p + 1}..100'), var('m', f'eval:{p}*floor(k/{p})')],
        '{{eval:mod(k-1,' + str(p) + ')}}',
        ['Le motif ' + ' '.join(motif) + ' a $' + str(p) + '$ éléments : il se termine aux places'
         ' $' + str(p) + '$, $' + str(2 * p) + '$, $' + str(3 * p) + '$… On compte de ' + str(p)
         + ' en ' + str(p) + ' jusqu\'à ${{m}}$.',
         '{{if:k==m|La ' + r('k', places, 'f') + ' place termine un motif : c\'est le dernier'
         ' élément, ' + motif[-1] + '.|La place ${{m}}$ termine un motif ; on avance encore de'
         ' ${{eval:k-m}}$ : ' + par('k-m', range(1, p), lambda j: 'c\'est le $' + rang(j)
                                    + '$ élément du motif, ' + motif[j - 1]) + '.}}',
         'À la ' + r('k', places, 'f') + ' place, il y a '
         + par('k', places, lambda k: motif[(k - 1) % p]) + '.'])


FORME = 'Quel symbole'
LETTRE = 'Quelle lettre'
AB = suite(['A', 'B'], LETTRE)
TRIANGLE_CARRE_ROND = suite(['△', '▢', '○'], FORME)
QUATRE_SYMBOLES = suite(['△', '✕', '▢', '○'], FORME)
ABGF = suite(['A', 'B', 'G', 'F'], LETTRE)

SPECS_SUITES = [
    spec('BO : ABAB…, 89e lettre, A', 0, {'k': '89', 'm': '88'}, '0', 'correct'),
    spec('Erreur : ABAB…, 89e, B', 0, {'k': '89', 'm': '88'}, '1', 'incorrect'),
    spec('borne : ABAB…, 100e, B', 0, {'k': '100', 'm': '100'}, '1', 'correct'),
    spec('BO : △ ▢ ○, 60e, ○', 1, {'k': '60', 'm': '60'}, '2', 'correct'),
    spec('Erreur : △ ▢ ○, 60e, △', 1, {'k': '60', 'm': '60'}, '0', 'incorrect'),
    spec('△ ▢ ○, 59e, ▢', 1, {'k': '59', 'm': '57'}, '1', 'correct'),
    spec('BO : △ ✕ ▢ ○, 80e, ○', 2, {'k': '80', 'm': '80'}, '3', 'correct'),
    spec('△ ✕ ▢ ○, 82e, ✕', 2, {'k': '82', 'm': '80'}, '1', 'correct'),
    spec('Erreur : △ ✕ ▢ ○, 82e, ▢', 2, {'k': '82', 'm': '80'}, '2', 'incorrect'),
    spec('BO : ABGF, 17e lettre, A', 3, {'k': '17', 'm': '16'}, '0', 'correct'),
    spec('Erreur : ABGF, 17e, F', 3, {'k': '17', 'm': '16'}, '3', 'incorrect'),
    spec('ABGF, 99e, G', 3, {'k': '99', 'm': '96'}, '2', 'correct'),
]

# ---- 7. Suites évolutives (CE1-015) ----
# Exemples du BO : 1, 2, 4, 7, 11, 16… (on ajoute 1, 2, 3…) ; 1, 2, 4, 8, 16… (on double ;
# jusqu'au 10e, 512) ; 1, 3, 5, 7, 9… (on ajoute 2, jusqu'au 50e) ; △ ✕ △ ✕✕ △ ✕✕✕… (case choix ;
# △ aux places 1, 3, 6, 10, 15, 21, 28).


def termes_ajout(k):
    t = [1]
    for j in range(1, k):
        t.append(t[-1] + j)
    return t


def termes_double(k):
    return [2 ** j for j in range(k)]


def deroule(termes):
    return ', '.join('$' + str(x) + '$' for x in termes[:-1]) + ', **$' + str(termes[-1]) + '$**'


AJOUT = variation(
    'Voici le début d\'une suite :\n\n$1$, $2$, $4$, $7$, $11$, $16$, …\n\nQuel est le '
    + r('k', range(7, 16)) + ' nombre ?\n\nC\'est $?$.',
    [var('k', '7..15')], '{{eval:1+k*(k-1)/2}}',
    ['De $1$ à $2$, on ajoute $1$ ; de $2$ à $4$, on ajoute $2$ ; de $4$ à $7$, on ajoute $3$…'
     ' On ajoute à chaque fois $1$ de plus.',
     'On continue jusqu\'au ' + r('k', range(7, 16)) + ' nombre : '
     + par('k', range(7, 16), lambda k: deroule(termes_ajout(k))) + '.'])

DOUBLE = variation(
    'Voici le début d\'une suite :\n\n$1$, $2$, $4$, $8$, $16$, …\n\nQuel est le '
    + r('k', range(6, 11)) + ' nombre ?\n\nC\'est $?$.',
    [var('k', '6..10')], '{{eval:2^(k-1)}}',
    ['Chaque nombre est le **double** du précédent.',
     'On continue jusqu\'au ' + r('k', range(6, 11)) + ' nombre : '
     + par('k', range(6, 11), lambda k: deroule(termes_double(k))) + '.'])

IMPAIRS = variation(
    'Voici le début d\'une suite :\n\n$1$, $3$, $5$, $7$, $9$, …\n\nQuel est le '
    + r('k', range(10, 51)) + ' nombre ?\n\nC\'est $?$.',
    [var('k', '10..50')], '{{eval:2*k-1}}',
    ['On ajoute $2$ à chaque fois. Le $' + rang(1) + '$ est $1$, le $' + rang(2) + '$ est $3$,'
     ' le $' + rang(3) + '$ est $5$ : chaque nombre est le **double de sa place, moins 1**.',
     '$$2\\times {{k}}-1={{eval:2*k-1}}$$ Le ' + r('k', range(10, 51)) + ' nombre est'
     ' ${{eval:2*k-1}}$.'])

TRIANGULAIRES = [1, 3, 6, 10, 15, 21, 28]


def symboles(k):
    s = ['△' if j in TRIANGULAIRES else '✕' for j in range(1, k + 1)]
    return ' '.join(s[:-1] + ['**' + s[-1] + '**'])


TRIANGLE_CROIX = variation(
    'Voici le début d\'une suite :\n\n△ ✕ △ ✕ ✕ △ ✕ ✕ ✕ △ …\n\nQuel symbole est à la '
    + r('k', range(11, 31), 'f') + ' place ?' + choix('△', '✕'),
    [var('k', '11..30'), var('s', par('k', range(11, 31),
                                      lambda k: '0' if k in TRIANGULAIRES else '1'))],
    '{{s}}',
    ['Après chaque △, il y a un ✕ de plus : △ ✕, puis △ ✕ ✕, puis △ ✕ ✕ ✕…',
     'On continue jusqu\'à la ' + r('k', range(11, 31), 'f') + ' place : '
     + par('k', range(11, 31), symboles) + '.',
     'À la ' + r('k', range(11, 31), 'f') + ' place, il y a '
     + par('k', range(11, 31), lambda k: '△' if k in TRIANGULAIRES else '✕') + '.'])

SPECS_EVOLUTIVES = [
    spec('BO : 1, 2, 4, 7…, 11e : 56', 0, {'k': '11'}, '56', 'correct'),
    spec('Erreur : 11e, 46 (le 10e)', 0, {'k': '11'}, '46', 'incorrect'),
    spec('Erreur : on ajoute toujours 5 (36)', 0, {'k': '11'}, '36', 'incorrect'),
    spec('borne : 15e, 106', 0, {'k': '15'}, '106', 'correct'),
    spec('BO : 1, 2, 4, 8…, 9e : 256', 1, {'k': '9'}, '256', 'correct'),
    spec('Erreur : 9e, 512 (le 10e)', 1, {'k': '9'}, '512', 'incorrect'),
    spec('Erreur : 9e, 18 (2 × 9)', 1, {'k': '9'}, '18', 'incorrect'),
    spec('borne : 10e, 512', 1, {'k': '10'}, '512', 'correct'),
    spec('BO : 1, 3, 5…, 17e : 33', 2, {'k': '17'}, '33', 'correct'),
    spec('Erreur : 17e, 34 (2 × 17)', 2, {'k': '17'}, '34', 'incorrect'),
    spec('Erreur : 17e, 35 (le 18e)', 2, {'k': '17'}, '35', 'incorrect'),
    spec('borne : 50e, 99', 2, {'k': '50'}, '99', 'correct'),
    spec('BO : △ ✕ △ ✕✕…, 20e : ✕', 3, {'k': '20', 's': '1'}, '1', 'correct'),
    spec('Erreur : 20e, △', 3, {'k': '20', 's': '1'}, '0', 'incorrect'),
    spec('21e : △', 3, {'k': '21', 's': '0'}, '0', 'correct'),
    spec('borne : 28e : △', 3, {'k': '28', 's': '0'}, '0', 'correct'),
]

MODELES = {
    '01-rang-en-lettres-jusqu-a-cent': modele(
        'Le rang en lettres (jusqu\'à centième)',
        'Écrire un rang en lettres : 48e → quarante-huitième (leurres : rangs voisins, le nombre'
        ' quarante-huit)', 7, [EN_LETTRES], SPECS_LETTRES, 30),
    '02-rang-en-chiffres-jusqu-a-cent': modele(
        'Le rang en chiffres (jusqu\'à centième)',
        'Lire un rang écrit en lettres : quatre-vingt-unième → place numéro 81',
        8, [EN_CHIFFRES], SPECS_CHIFFRES, 30),
    '03-place-dans-une-liste': modele(
        'La place d\'un nombre ou d\'une lettre dans une liste',
        'Listes de 5 en 5, de 2 en 2, de 10 en 10, l\'alphabet : à quelle place est 60 ? P ?',
        9, [PLACE_5, PLACE_2, PLACE_10, PLACE_LETTRE], SPECS_PLACE),
    '04-reperer-un-rang-jusqu-a-cent': modele(
        'Repérer un rang, depuis le début ou depuis la fin',
        'Le 12e nombre d\'une liste, le 3e en partant de la fin, la place dans une file retournée',
        10, [NOMBRE_AU_RANG, DEPUIS_LA_FIN, FILE_RETOURNEE], SPECS_REPERER, 60),
    '05-rang-et-nombre-avant': modele(
        'Rang et nombre de coureurs avant ou après',
        '167 cyclistes : combien avant le 48e ? 35 avant moi : quelle place ? Combien après ?',
        11, [AVANT, RANG_APRES, APRES], SPECS_DEVANT, 60),
    '06-suites-repetitives-jusqu-a-cent': modele(
        'Suites qui se répètent : quel élément à la 89e place ?',
        'Motifs du BO (A B, △ ▢ ○, △ ✕ ▢ ○, A B G F), place jusqu\'à la 100e',
        12, [AB, TRIANGLE_CARRE_ROND, QUATRE_SYMBOLES, ABGF], SPECS_SUITES, 60),
    '07-suites-evolutives': modele(
        'Suites qui grandissent : quel élément à telle place ?',
        '1, 2, 4, 7, 11… ; 1, 2, 4, 8… ; 1, 3, 5, 7… ; △ ✕ △ ✕ ✕ △… (exemples du BO)',
        13, [AJOUT, DOUBLE, IMPAIRS, TRIANGLE_CROIX], SPECS_EVOLUTIVES, 60),
}

for nom, m in MODELES.items():
    with open(f'{DOSSIER}/{nom}.json', 'w') as f:
        json.dump(m, f, ensure_ascii=False, indent='\t')
        f.write('\n')
print(len(MODELES), 'modèles écrits')
