"""Écrit les 4 modèles du lot A5 (problèmes, CP) dans scripts/questions/cp-a5/."""
import json
import sys

DOSSIER = sys.argv[1]


def spec(desc, vi, variables, status, answers, violations=None):
    s = {'description': desc, 'variationIndex': vi, 'variables': variables,
         'expected': {'status': status}, 'answers': answers}
    if violations:
        s['expected']['constraintViolations'] = violations
    return s


def modele(title, description, subdomain, level, delay, variations, specs):
    # theme / domain / subdomain : anciennes colonnes, remplies pour create-questions ; le
    # rangement (sous-notion du point) est posé par la migration
    return {'title': title, 'description': description, 'grades': ['CP'], 'theme': 'Entiers',
            'domain': 'Problèmes', 'subdomain': subdomain, 'level': level, 'delay': delay,
            'status': 'draft', 'variations': variations, 'testSpecs': specs}


def probleme(texte, question, reponse, variables, conditions, etapes, conclusion):
    """Un énoncé à une case nombre. Toutes les données et la réponse valent au moins 2 (aucun
    « 1 oiseaux » ni dans l'énoncé, ni dans la phrase de réponse, ni dans le corrigé)."""
    return {'statement': texte + '\n\n' + question,
            'variables': [{'name': n, 'expression': x} for n, x in variables],
            'conditions': conditions,
            'blanks': [{'expectedAnswer': '{{eval:' + reponse + '}}'}],
            'correction': {'steps': etapes + [conclusion]}}


def v(x):
    return '${{' + x + '}}$'


def ev(x):
    return '{{eval:' + x + '}}'


# ---- 1. Parties-tout (CP-029) ----
# Le tout = la réunion des parties. Ajout et retrait sont traités comme parties-tout (BO) :
# l'état final d'un ajout est un tout, celui d'un retrait une partie.

def tout_deux(bas, haut, plafond):
    return probleme(
        'Dans un bouquet, il y a ' + v('a') + ' roses et ' + v('b') + ' tulipes.',
        'Combien y a-t-il de fleurs dans le bouquet ?\n\nIl y a $?$ fleurs.', 'a+b',
        [('a', f'{bas}..{haut}'), ('b', f'{bas}..{haut}')],
        [f'a + b <= {plafond}'] + ([f'a + b > 20'] if plafond > 20 else []),
        ['Les roses et les tulipes forment le bouquet : on cherche **le tout**, on ajoute'
         ' les parties.', '$${{a}}+{{b}}=' + ev('a+b') + '$$'],
        'Il y a $' + ev('a+b') + '$ fleurs dans le bouquet.')


def tout_trois(bas, haut, plafond):
    return probleme(
        'Un petit train a trois wagons. Il y a ' + v('a') + ' voyageurs dans le premier wagon, '
        + v('b') + ' dans le deuxième et ' + v('c') + ' dans le troisième.',
        'Combien y a-t-il de voyageurs dans le train ?\n\nIl y a $?$ voyageurs.', 'a+b+c',
        [('a', f'{bas}..{haut}'), ('b', f'{bas}..{haut}'), ('c', f'{bas}..{haut}')],
        [f'a + b + c <= {plafond}'] + ([f'a + b + c > 20'] if plafond > 20 else []),
        ['Les trois wagons forment le train : on cherche **le tout**, on ajoute les trois'
         ' parties.', '$${{a}}+{{b}}+{{c}}=' + ev('a+b+c') + '$$'],
        'Il y a $' + ev('a+b+c') + '$ voyageurs dans le train.')


def ajout(bas, haut, plafond):
    return probleme(
        'Il y a ' + v('a') + ' oiseaux sur un arbre. ' + v('b') + ' oiseaux arrivent.',
        'Combien y a-t-il d\'oiseaux sur l\'arbre maintenant ?\n\nIl y a $?$ oiseaux.', 'a+b',
        [('a', f'{bas}..{haut}'), ('b', f'{bas}..{haut}')],
        [f'a + b <= {plafond}'] + ([f'a + b > 20'] if plafond > 20 else []),
        ['Les oiseaux qui étaient là et ceux qui arrivent sont maintenant ensemble : on cherche'
         ' **le tout**, on ajoute.', '$${{a}}+{{b}}=' + ev('a+b') + '$$'],
        'Il y a maintenant $' + ev('a+b') + '$ oiseaux sur l\'arbre.')


def retrait(plafond):
    return probleme(
        'Léo a ' + v('t') + ' billes. Il en perd ' + v('a') + '.',
        'Combien de billes lui reste-t-il ?\n\nIl lui reste $?$ billes.', 't-a',
        [('t', f'5..{plafond}'), ('a', f'2..{plafond - 2}')],
        ['t - a >= 2'] + (['t > 20'] if plafond > 20 else []),
        ['Les ' + v('t') + ' billes du début, c\'est **le tout** : les billes perdues et les'
         ' billes qui restent. On cherche une partie : on enlève ' + v('a') + ' à ' + v('t')
         + '.', '$${{t}}-{{a}}=' + ev('t-a') + '$$'],
        'Il reste $' + ev('t-a') + '$ billes à Léo.')


def partie(plafond):
    return probleme(
        'Dans la classe, il y a ' + v('t') + ' élèves. ' + v('a') + ' sont des filles.',
        'Combien y a-t-il de garçons ?\n\nIl y a $?$ garçons.', 't-a',
        [('t', f'5..{plafond}'), ('a', f'2..{plafond - 2}')],
        ['t - a >= 2'] + (['t > 20'] if plafond > 20 else []),
        ['Les filles et les garçons forment la classe : les ' + v('t') + ' élèves, c\'est'
         ' **le tout**. On cherche une partie : on enlève les filles.',
         '$${{t}}-{{a}}=' + ev('t-a') + '$$'],
        'Il y a $' + ev('t-a') + '$ garçons.')


def ajout_inconnu(plafond):
    return probleme(
        'Léa avait ' + v('a') + ' images. Elle en gagne à la récréation.'
        ' Maintenant, elle a ' + v('t') + ' images.',
        'Combien d\'images Léa a-t-elle gagnées ?\n\nElle a gagné $?$ images.', 't-a',
        [('t', f'5..{plafond}'), ('a', f'2..{plafond - 2}')],
        ['t - a >= 2'] + (['t > 20'] if plafond > 20 else []),
        ['Les ' + v('t') + ' images de maintenant, c\'est **le tout** : les ' + v('a')
         + ' images du début et les images gagnées. On cherche une partie : ce qu\'il faut'
         ' ajouter à ' + v('a') + ' pour arriver à ' + v('t') + '.',
         '$${{a}}+' + ev('t-a') + '={{t}}$$', 'C\'est aussi une soustraction :',
         '$${{t}}-{{a}}=' + ev('t-a') + '$$'],
        'Léa a gagné $' + ev('t-a') + '$ images.')


def parties_tout(bas, haut, plafond, plafond_partie):
    return [tout_deux(bas, haut, plafond), tout_trois(bas, haut, plafond),
            ajout(bas, haut, plafond), retrait(plafond_partie), partie(plafond_partie),
            ajout_inconnu(plafond_partie)]


def specs_parties_tout(exemples, limites):
    """exemples : par variation, (variables, bonne réponse, l'autre opération)."""
    noms = ['tout (deux parties)', 'tout (trois parties)', 'ajout', 'retrait', 'partie',
            'ajout inconnu']
    specs = []
    for vi, (variables, bonne, autre) in enumerate(exemples):
        specs += [spec(f'{noms[vi]} : {bonne}', vi, variables, 'correct', [bonne]),
                  spec(f'Erreur : {noms[vi]}, l\'autre opération ({autre})', vi, variables,
                       'incorrect', [autre])]
    specs += limites
    specs.append(spec('Zéro inutile', 0, exemples[0][0], 'unoptimal_form',
                      ['0' + exemples[0][1]], ['zeros']))
    return specs


SPECS_20 = specs_parties_tout(
    [({'a': '8', 'b': '5'}, '13', '3'), ({'a': '4', 'b': '6', 'c': '5'}, '15', '5'),
     ({'a': '9', 'b': '4'}, '13', '5'), ({'t': '15', 'a': '6'}, '9', '21'),
     ({'t': '18', 'a': '11'}, '7', '29'), ({'t': '13', 'a': '8'}, '5', '21')],
    [spec('borne : 18 + 2 = 20', 0, {'a': '18', 'b': '2'}, 'correct', ['20']),
     spec('borne : 20 − 18 = 2', 3, {'t': '20', 'a': '18'}, 'correct', ['2'])])
SPECS_100 = specs_parties_tout(
    [({'a': '34', 'b': '25'}, '59', '9'), ({'a': '25', 'b': '32', 'c': '18'}, '75', '39'),
     ({'a': '46', 'b': '30'}, '76', '16'), ({'t': '27', 'a': '9'}, '18', '36'),
     ({'t': '25', 'a': '12'}, '13', '37'), ({'t': '23', 'a': '15'}, '8', '38')],
    [spec('borne : 60 + 40 = 100', 0, {'a': '60', 'b': '40'}, 'correct', ['100']),
     spec('borne : 30 − 28 = 2', 4, {'t': '30', 'a': '28'}, 'correct', ['2'])])


# ---- 2. Deux étapes (CP-030) ----
# Champ ≤ 30 : données, résultat intermédiaire et résultat final entre 2 et 30.

def deux_etapes(texte, question, etape1, etape2, inter, final, conditions, conclusion,
                variables=(('a', '5..29'), ('b', '2..27'), ('c', '2..27'))):
    return probleme(texte, question, final, list(variables),
                    [f'{inter} >= 2', f'{inter} <= 30', f'{final} >= 2', f'{final} <= 30']
                    + conditions,
                    ['On calcule en deux étapes. ' + etape1[0], '$$' + etape1[1] + '=' + ev(inter)
                     + '$$', etape2[0], '$$' + ev(inter) + etape2[1] + '=' + ev(final) + '$$'],
                    conclusion.replace('R', ev(final)))


BUS = deux_etapes(
    'Dans un bus, il y a ' + v('a') + ' passagers. À l\'arrêt, ' + v('b')
    + ' passagers descendent, puis ' + v('c') + ' passagers montent.',
    'Combien y a-t-il de passagers dans le bus maintenant ?\n\nIl y a $?$ passagers.',
    ('D\'abord, des passagers descendent : on enlève.', '{{a}}-{{b}}'),
    ('Puis des passagers montent : on ajoute.', '+{{c}}'), 'a-b', 'a-b+c', [],
    'Il y a maintenant $R$ passagers dans le bus.')
DEUX_RETRAITS = deux_etapes(
    'Sami a ' + v('a') + ' bonbons. Il en mange ' + v('b') + ' le matin et ' + v('c')
    + ' l\'après-midi.',
    'Combien de bonbons lui reste-t-il le soir ?\n\nIl lui reste $?$ bonbons.',
    ('Le matin, Sami mange des bonbons : on enlève.', '{{a}}-{{b}}'),
    ('L\'après-midi, il en mange encore : on enlève encore.', '-{{c}}'), 'a-b', 'a-b-c', [],
    'Il reste $R$ bonbons à Sami le soir.')
DEUX_AJOUTS = deux_etapes(
    'Lina a ' + v('a') + ' perles. Sa mamie lui en donne ' + v('b') + ', puis son frère lui en'
    ' donne ' + v('c') + '.',
    'Combien de perles Lina a-t-elle maintenant ?\n\nElle a $?$ perles.',
    ('Sa mamie lui donne des perles : on ajoute.', '{{a}}+{{b}}'),
    ('Son frère lui en donne aussi : on ajoute encore.', '+{{c}}'), 'a+b', 'a+b+c', [],
    'Lina a maintenant $R$ perles.',
    variables=(('a', '2..26'), ('b', '2..26'), ('c', '2..26')))
REUNION_RETRAIT = deux_etapes(
    'Zoé a ' + v('a') + ' billes rouges et ' + v('b') + ' billes bleues. Elle donne ' + v('c')
    + ' billes à son amie.',
    'Combien de billes reste-t-il à Zoé ?\n\nIl lui reste $?$ billes.',
    ('D\'abord, on cherche combien Zoé a de billes en tout : on ajoute les rouges et les'
     ' bleues.', '{{a}}+{{b}}'),
    ('Puis elle en donne : on enlève.', '-{{c}}'), 'a+b', 'a+b-c', [],
    'Il reste $R$ billes à Zoé.',
    variables=(('a', '2..26'), ('b', '2..26'), ('c', '2..27')))

SPECS_DEUX = [
    spec('bus : 29 − 12 + 7 = 24', 0, {'a': '29', 'b': '12', 'c': '7'}, 'correct', ['24']),
    spec('Erreur : bus, arrêt après la 1re étape (17)', 0, {'a': '29', 'b': '12', 'c': '7'},
         'incorrect', ['17']),
    spec('Erreur : bus, tout ajouté (48)', 0, {'a': '29', 'b': '12', 'c': '7'}, 'incorrect',
         ['48']),
    spec('deux retraits : 24 − 7 − 6 = 11', 1, {'a': '24', 'b': '7', 'c': '6'}, 'correct',
         ['11']),
    spec('Erreur : deux retraits, arrêt après la 1re étape (17)', 1,
         {'a': '24', 'b': '7', 'c': '6'}, 'incorrect', ['17']),
    spec('Erreur : deux retraits, le second ajouté (23)', 1, {'a': '24', 'b': '7', 'c': '6'},
         'incorrect', ['23']),
    spec('deux ajouts : 9 + 6 + 8 = 23', 2, {'a': '9', 'b': '6', 'c': '8'}, 'correct', ['23']),
    spec('Erreur : deux ajouts, arrêt après la 1re étape (15)', 2,
         {'a': '9', 'b': '6', 'c': '8'}, 'incorrect', ['15']),
    spec('réunion puis retrait : 12 + 9 − 5 = 16', 3, {'a': '12', 'b': '9', 'c': '5'},
         'correct', ['16']),
    spec('Erreur : réunion puis retrait, tout ajouté (26)', 3, {'a': '12', 'b': '9', 'c': '5'},
         'incorrect', ['26']),
    spec('borne : 15 + 10 + 5 = 30', 2, {'a': '15', 'b': '10', 'c': '5'}, 'correct', ['30']),
    spec('borne : 30 − 26 − 2 = 2', 1, {'a': '30', 'b': '26', 'c': '2'}, 'correct', ['2']),
    spec('Zéro inutile', 0, {'a': '29', 'b': '12', 'c': '7'}, 'unoptimal_form', ['024'],
         ['zeros']),
]


# ---- 3. Multiplicatifs (CP-031) ----
# g groupes de n, g de 2 à 6, n de 2 à 10, g × n ≤ 30 : jamais de reste. Sans le signe × (comme
# CP-017) : le corrigé passe par l'addition répétée.

def repete(terme):
    """`terme` répété g fois, en LaTeX : terme+terme+…, pour g de 2 à 6."""
    expr = '+'.join([terme] * 6)
    for k in (5, 4, 3, 2):
        expr = '{{if:g==' + str(k) + '|' + '+'.join([terme] * k) + '|' + expr + '}}'
    return expr


ADDITION_REPETEE = '$$' + repete('{{n}}') + '=' + ev('g*n') + '$$'
MULTI_VARIABLES = [('g', '2..6'), ('n', '2..10')]
MULTI_CONDITIONS = ['g * n <= 30']

VALEUR_TOUT = probleme(
    'Il y a ' + v('g') + ' paquets. Dans chaque paquet, il y a ' + v('n') + ' images.',
    'Combien y a-t-il d\'images en tout ?\n\nIl y a $?$ images.', 'g*n',
    MULTI_VARIABLES, MULTI_CONDITIONS,
    ['Chaque paquet contient ' + v('n') + ' images, et il y a ' + v('g') + ' paquets : on'
     ' ajoute ' + v('n') + ' autant de fois qu\'il y a de paquets, ' + v('g') + ' fois.',
     ADDITION_REPETEE],
    'Il y a $' + ev('g*n') + '$ images en tout.')
NOMBRE_PARTS = probleme(
    'Il y a $' + ev('g*n') + '$ élèves dans la cour. On fait des équipes de ' + v('n')
    + ' élèves.',
    'Combien d\'équipes peut-on faire ?\n\nOn peut faire $?$ équipes.', 'g',
    MULTI_VARIABLES, MULTI_CONDITIONS,
    ['On forme des équipes de ' + v('n') + ' élèves jusqu\'à ce que tous les élèves soient'
     ' dans une équipe : on ajoute ' + v('n') + ' jusqu\'à arriver à $' + ev('g*n') + '$.',
     ADDITION_REPETEE, 'Chaque ' + v('n') + ' de ce calcul est une équipe : il y en a '
     + v('g') + '.'],
    'On peut faire ' + v('g') + ' équipes.')
VALEUR_PART = probleme(
    'On partage $' + ev('g*n') + '$ images entre ' + v('g') + ' enfants. Chaque enfant reçoit'
    ' le même nombre d\'images.',
    'Combien d\'images chaque enfant reçoit-il ?\n\nChaque enfant reçoit $?$ images.', 'n',
    MULTI_VARIABLES, MULTI_CONDITIONS,
    ['Les ' + v('g') + ' enfants reçoivent le même nombre d\'images : on cherche le nombre qui,'
     ' ajouté ' + v('g') + ' fois, fait $' + ev('g*n') + '$.', ADDITION_REPETEE],
    'Chaque enfant reçoit ' + v('n') + ' images.')

SPECS_MULTI = [
    spec('valeur du tout : 3 paquets de 7 = 21', 0, {'g': '3', 'n': '7'}, 'correct', ['21']),
    spec('Erreur : valeur du tout, 3 + 7 (10)', 0, {'g': '3', 'n': '7'}, 'incorrect', ['10']),
    spec('Erreur : valeur du tout, 37 juxtaposés', 0, {'g': '3', 'n': '7'}, 'incorrect',
         ['37']),
    spec('nombre de parts : 24 élèves en équipes de 4 = 6', 1, {'g': '6', 'n': '4'}, 'correct',
         ['6']),
    spec('Erreur : nombre de parts, 24 − 4 (20)', 1, {'g': '6', 'n': '4'}, 'incorrect', ['20']),
    spec('Erreur : nombre de parts, 24 + 4 (28)', 1, {'g': '6', 'n': '4'}, 'incorrect', ['28']),
    spec('valeur d\'une part : 18 images pour 3 = 6', 2, {'g': '3', 'n': '6'}, 'correct', ['6']),
    spec('Erreur : valeur d\'une part, 18 − 3 (15)', 2, {'g': '3', 'n': '6'}, 'incorrect',
         ['15']),
    spec('Erreur : valeur d\'une part, le nombre d\'enfants (3)', 2, {'g': '3', 'n': '6'},
         'incorrect', ['3']),
    spec('borne : 3 paquets de 10 = 30', 0, {'g': '3', 'n': '10'}, 'correct', ['30']),
    spec('borne : 30 élèves en équipes de 5 = 6', 1, {'g': '6', 'n': '5'}, 'correct', ['6']),
    spec('borne : 4 images pour 2 = 2', 2, {'g': '2', 'n': '2'}, 'correct', ['2']),
    spec('Zéro inutile', 0, {'g': '3', 'n': '7'}, 'unoptimal_form', ['021'], ['zeros']),
]


MODELES = {
    '01-parties-tout-20': modele(
        'Problèmes parties-tout (jusqu\'à 20)',
        'Chercher le tout ou une partie : réunion, ajout, retrait (8 oiseaux, 5 arrivent)',
        'Parties-tout', 1, 60, parties_tout(2, 18, 20, 20), SPECS_20),
    '02-parties-tout-100': modele(
        'Problèmes parties-tout (jusqu\'à 100)',
        'Chercher le tout jusqu\'à 100 (25 + 32 + 18), une partie jusqu\'à 30',
        'Parties-tout', 3, 60, parties_tout(10, 60, 100, 30), SPECS_100),
    '03-deux-etapes': modele(
        'Problèmes en deux étapes (jusqu\'à 30)',
        'Ajouts et retraits enchaînés : 29 − 12 + 7, 24 − 7 − 6',
        'Deux étapes', 4, 90, [BUS, DEUX_RETRAITS, DEUX_AJOUTS, REUNION_RETRAIT], SPECS_DEUX),
    '04-multiplicatifs': modele(
        'Problèmes multiplicatifs (jusqu\'à 30)',
        'Valeur du tout, nombre de parts, valeur d\'une part (sans reste, sans le signe ×)',
        'Multiplicatifs', 5, 90, [VALEUR_TOUT, NOMBRE_PARTS, VALEUR_PART], SPECS_MULTI),
}

for nom, m in MODELES.items():
    with open(f'{DOSSIER}/{nom}.json', 'w') as f:
        json.dump(m, f, ensure_ascii=False, indent='\t')
        f.write('\n')
print(len(MODELES), 'modèles écrits')
