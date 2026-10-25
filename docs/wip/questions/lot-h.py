"""Écrit les 3 modèles du lot H (horloge et addition posée, CP) dans scripts/questions/cp-h/."""
import json
import sys

DOSSIER = sys.argv[1]

# Décisions de David le 2026-10-25 (journal docs/wip/questions-progress.md § 4 decies).


def horloge(heure):
    """Bloc ```horloge d'une seule heure, chiffres tous écrits (CP)."""
    return '```horloge\nheure: ' + heure + '\nchiffres: tous\n```'


def spec(desc, vi, variables_, status, choix=None, answers=None):
    s = {'description': desc, 'variationIndex': vi, 'variables': variables_,
         'expected': {'status': status}}
    if choix is not None:
        s['selectedChoices'] = [choix]
    if answers is not None:
        s['answers'] = answers
    return s


def modele(title, description, theme, domain, subdomain, level, delay, variations, specs):
    # theme / domain / subdomain : anciennes colonnes, remplies pour create-questions ; le
    # rangement (nœud du point) est posé par la migration
    return {'title': title, 'description': description, 'grades': ['CP'], 'theme': theme,
            'domain': domain, 'subdomain': subdomain, 'level': level, 'delay': delay,
            'status': 'draft', 'variations': variations, 'testSpecs': specs}


# --- CP-046 : lire l'heure entière -------------------------------------------------------

LIRE = {
    'statement': 'Quelle heure est-il ?\n\n' + horloge('{{n}} h') + '\n\nIl est [_] h.',
    'variables': [{'name': 'n', 'expression': '1..12'}],
    'conditions': [],
    'blanks': [{'expectedAnswer': '{{n}}'}],
    'correction': {'steps': [
        'La petite aiguille montre l\'heure : elle est sur le ${{n}}$.',
        '{{if:n==12|La grande aiguille est aussi sur le $12$ : c\'est une heure juste.'
        '|La grande aiguille est sur le $12$ : c\'est une heure juste.}}',
        'Il est ${{n}}$ {{if:n==1|heure|heures}}.',
    ]},
}

SPECS_LIRE = [
    spec('3 heures', 0, {'n': '3'}, 'correct', answers=['3']),
    spec('12 heures', 0, {'n': '12'}, 'correct', answers=['12']),
    spec('Erreur : aiguilles confondues, 12 au lieu de 3', 0, {'n': '3'}, 'incorrect',
         answers=['12']),
    spec('Erreur : heure voisine, 4 au lieu de 3', 0, {'n': '3'}, 'incorrect', answers=['4']),
    spec('Refusé : 15 pour 3 heures (cadran de 12)', 0, {'n': '3'}, 'incorrect',
         answers=['15']),
]

# --- CP-047 : positionner les aiguilles (QCM d'horloges) ---------------------------------

# Leurres : aiguilles inversées (petite sur 12, grande sur h : 12 h 5h ; pour h = 12, les
# deux sont sur 12, alors 6 h, haut et bas confondus) et heure voisine.
VARIABLES_LEURRES = [
    {'name': 'inv', 'expression': '{{if:n==12|6 h|12 h {{eval:5*n}}}}'},
    {'name': 'v', 'expression': '{{if:n==12|11|{{eval:n+1}}}}'},
]

CORRECTION_POSITIONNER = {'steps': [
    '{{if:n==12|Pour $12$ heures, les deux aiguilles sont sur le $12$.'
    '|Pour ${{n}}$ {{if:n==1|heure|heures}}, la petite aiguille est sur le ${{n}}$ et la grande'
    ' sur le $12$. Attention à ne pas les inverser : la grande sur le ${{n}}$, ce serait une autre'
    ' heure.}}',
]}


def choix_horloges():
    return [{'content': horloge('{{n}} h')}, {'content': horloge('{{inv}}')},
            {'content': horloge('{{v}} h')}]


POSITIONNER = {
    'statement': 'Quelle horloge indique ${{n}}$ {{if:n==1|heure|heures}} ?',
    'variables': [{'name': 'n', 'expression': '1..12'}] + VARIABLES_LEURRES,
    'conditions': [],
    'choices': choix_horloges(),
    'correctChoiceIndex': ['0'],
    'correction': CORRECTION_POSITIONNER,
}

MOMENTS = [(1, 8, 'Tu arrives à l\'école à $8$ heures du matin.'),
           (2, 12, 'Tu déjeunes à la cantine à midi.'),
           (3, 4, 'Tu prends ton goûter à $4$ heures de l\'après-midi.'),
           (4, 7, 'Tu dînes à $7$ heures du soir.')]


def par_k(f):
    expr = f(MOMENTS[-1])
    for m in reversed(MOMENTS[:-1]):
        expr = '{{if:k==' + str(m[0]) + '|' + f(m) + '|' + expr + '}}'
    return expr


POSITIONNER_MOMENT = {
    'statement': par_k(lambda m: m[2]) + ' Quelle horloge montre cette heure ?',
    'variables': [{'name': 'k', 'expression': '1..4'},
                  {'name': 'n', 'expression': par_k(lambda m: str(m[1]))}] + VARIABLES_LEURRES,
    'conditions': [],
    'choices': choix_horloges(),
    'correctChoiceIndex': ['0'],
    'correction': {'steps': [
        '{{if:k==2|Midi, c\'est $12$ heures.|{{if:k==1|On lit $8$ heures sur le cadran.'
        '|{{if:k==3|$4$ heures de l\'après-midi se lit $4$ heures sur le cadran.'
        '|$7$ heures du soir se lit $7$ heures sur le cadran.}}}}}}',
    ] + CORRECTION_POSITIONNER['steps']},
}

SPECS_POSITIONNER = [
    spec('4 heures : bonne horloge', 0, {'n': '4', 'inv': '12 h 20', 'v': '5'}, 'correct',
         choix=0),
    spec('Erreur : aiguilles inversées', 0, {'n': '4', 'inv': '12 h 20', 'v': '5'},
         'incorrect', choix=1),
    spec('Erreur : heure voisine', 0, {'n': '4', 'inv': '12 h 20', 'v': '5'}, 'incorrect',
         choix=2),
    spec('12 heures : bonne horloge', 0, {'n': '12', 'inv': '6 h', 'v': '11'}, 'correct',
         choix=0),
    spec('goûter : 4 heures', 1, {'k': '3', 'n': '4', 'inv': '12 h 20', 'v': '5'}, 'correct',
         choix=0),
    spec('midi : 12 heures', 1, {'k': '2', 'n': '12', 'inv': '6 h', 'v': '11'}, 'correct',
         choix=0),
    spec('Erreur : dîner, aiguilles inversées', 1, {'k': '4', 'n': '7', 'inv': '12 h 35',
                                                     'v': '8'}, 'incorrect', choix=1),
]

# --- CP-016 : addition posée (somme ≤ 99) -------------------------------------------------


def operation(calcul):
    return '```operation\ncalcul: ' + calcul + '\nretenues: oui\n```'


ENONCE_OPERATION = 'Pose et calcule.\n\n'

SANS_RETENUE = {
    'statement': ENONCE_OPERATION + operation('{{a}} + {{b}}'),
    'variables': [{'name': 'a1', 'expression': '1..8'}, {'name': 'a2', 'expression': '0..9'},
                  {'name': 'b1', 'expression': '1..8'}, {'name': 'b2', 'expression': '0..9'},
                  {'name': 'a', 'expression': 'eval:10*a1+a2'},
                  {'name': 'b', 'expression': 'eval:10*b1+b2'}],
    'conditions': ['a2 + b2 <= 9', 'a1 + b1 <= 9', 'a >= b'],
    'correction': {'steps': [
        'Les unités : ${{a2}}+{{b2}}={{eval:a2+b2}}$. On écrit ${{eval:a2+b2}}$ dans la colonne des'
        ' unités.',
        'Les dizaines : ${{a1}}+{{b1}}={{eval:a1+b1}}$. On écrit ${{eval:a1+b1}}$ dans la colonne'
        ' des dizaines.',
        '${{a}}+{{b}}={{eval:a+b}}$.',
    ]},
}

def unites_retenue(somme):
    return ('Les unités : $' + somme + '={{su}}$. On écrit ${{eval:su-10}}$ dans la colonne des'
            ' unités et on retient $1$ dizaine, écrite en haut de la colonne des dizaines.')

AVEC_RETENUE = {
    'statement': ENONCE_OPERATION + operation('{{a}} + {{b}}'),
    'variables': [{'name': 'a1', 'expression': '1..8'}, {'name': 'a2', 'expression': '1..9'},
                  {'name': 'b1', 'expression': '1..8'}, {'name': 'b2', 'expression': '1..9'},
                  {'name': 'a', 'expression': 'eval:10*a1+a2'},
                  {'name': 'b', 'expression': 'eval:10*b1+b2'},
                  {'name': 'su', 'expression': 'eval:a2+b2'}],
    'conditions': ['a2 + b2 >= 10', 'a1 + b1 <= 8', 'a >= b'],
    'correction': {'steps': [
        unites_retenue('{{a2}}+{{b2}}'),
        'Les dizaines : $1+{{a1}}+{{b1}}={{eval:1+a1+b1}}$. On écrit ${{eval:1+a1+b1}}$ dans la'
        ' colonne des dizaines.',
        '${{a}}+{{b}}={{eval:a+b}}$.',
    ]},
}

DEUX_ET_UN_CHIFFRE = {
    'statement': ENONCE_OPERATION + operation('{{a}} + {{b}}'),
    'variables': [{'name': 'a1', 'expression': '1..8'}, {'name': 'a2', 'expression': '1..9'},
                  {'name': 'b', 'expression': '2..9'},
                  {'name': 'a', 'expression': 'eval:10*a1+a2'},
                  {'name': 'su', 'expression': 'eval:a2+b'}],
    'conditions': ['a2 + b >= 10'],
    'correction': {'steps': [
        unites_retenue('{{a2}}+{{b}}'),
        'Les dizaines : $1+{{a1}}={{eval:1+a1}}$. On écrit ${{eval:1+a1}}$ dans la colonne des'
        ' dizaines.',
        '${{a}}+{{b}}={{eval:a+b}}$.',
    ]},
}

# Trois termes : le bloc veut le plus grand en premier (56 + 28 + 8 pour l'exemple du BO).
TROIS_TERMES = {
    'statement': ENONCE_OPERATION + operation('{{a}} + {{b}} + {{c}}'),
    'variables': [{'name': 'a1', 'expression': '1..7'}, {'name': 'a2', 'expression': '0..9'},
                  {'name': 'b1', 'expression': '1..7'}, {'name': 'b2', 'expression': '0..9'},
                  {'name': 'c', 'expression': '2..9'},
                  {'name': 'a', 'expression': 'eval:10*a1+a2'},
                  {'name': 'b', 'expression': 'eval:10*b1+b2'},
                  {'name': 'su', 'expression': 'eval:a2+b2+c'},
                  {'name': 'r', 'expression': 'eval:floor(su/10)'}],
    'conditions': ['a >= b', 'a + b + c <= 99', 'a2 + b2 + c >= 10'],
    'correction': {'steps': [
        'Les unités : ${{a2}}+{{b2}}+{{c}}={{su}}$.'
        '{{if:r==0| On écrit ${{su}}$ dans la colonne des unités.'
        '| On écrit ${{eval:su-10*r}}$ dans la colonne des unités et on retient ${{r}}$'
        ' {{if:r==1|dizaine|dizaines}}, écrite en haut de la colonne des dizaines.}}',
        'Les dizaines : ${{if:r==0||{{r}}+}}{{a1}}+{{b1}}={{eval:r+a1+b1}}$. On écrit'
        ' ${{eval:r+a1+b1}}$ dans la colonne des dizaines.',
        '${{a}}+{{b}}+{{c}}={{eval:a+b+c}}$.',
    ]},
}

SPECS_OPERATION = [
    spec('34 + 25 = 59', 0, {'a1': '3', 'a2': '4', 'b1': '2', 'b2': '5', 'a': '34', 'b': '25'},
         'correct', answers=['59']),
    spec('Erreur : 34 + 25, 69', 0, {'a1': '3', 'a2': '4', 'b1': '2', 'b2': '5', 'a': '34',
                                     'b': '25'}, 'incorrect', answers=['69']),
    spec('45 + 37 = 82', 1, {'a1': '4', 'a2': '5', 'b1': '3', 'b2': '7', 'a': '45', 'b': '37',
                             'su': '12'}, 'correct', answers=['82']),
    spec('Erreur : retenue oubliée, 45 + 37 = 72', 1,
         {'a1': '4', 'a2': '5', 'b1': '3', 'b2': '7', 'a': '45', 'b': '37', 'su': '12'}, 'incorrect', answers=['72']),
    spec('Erreur : 12 écrit en entier, 45 + 37 = 712', 1,
         {'a1': '4', 'a2': '5', 'b1': '3', 'b2': '7', 'a': '45', 'b': '37', 'su': '12'}, 'incorrect', answers=['712']),
    spec('28 + 8 = 36', 2, {'a1': '2', 'a2': '8', 'b': '8', 'a': '28', 'su': '16'},
         'correct', answers=['36']),
    spec('Erreur : retenue oubliée, 28 + 8 = 26', 2,
         {'a1': '2', 'a2': '8', 'b': '8', 'a': '28', 'su': '16'}, 'incorrect',
         answers=['26']),
    spec('56 + 28 + 8 = 92', 3, {'a1': '5', 'a2': '6', 'b1': '2', 'b2': '8', 'c': '8', 'a': '56',
                                 'b': '28', 'su': '22', 'r': '2'}, 'correct', answers=['92']),
    spec('Erreur : retenue de 1 au lieu de 2, 56 + 28 + 8 = 82', 3,
         {'a1': '5', 'a2': '6', 'b1': '2', 'b2': '8', 'c': '8', 'a': '56', 'b': '28', 'su': '22',
          'r': '2'}, 'incorrect', answers=['82']),
]

MODELES = {
    '01-lire-l-heure': modele(
        'Quelle heure est-il ? (heures entières)',
        'Lire une heure entière sur une horloge à aiguilles (1 à 12 heures)',
        'Grandeurs', 'Durées', 'Lire l\'heure', 1, 30, [LIRE], SPECS_LIRE),
    '02-placer-les-aiguilles': modele(
        'Quelle horloge indique… ? (heures entières)',
        'Reconnaître l\'horloge qui montre une heure entière ≤ 12 ; leurres : aiguilles'
        ' inversées, heure voisine',
        'Grandeurs', 'Durées', 'Lire l\'heure', 1, 30, [POSITIONNER, POSITIONNER_MOMENT],
        SPECS_POSITIONNER),
    '03-addition-posee': modele(
        'Pose et calcule une addition',
        'Addition posée en colonnes, sans ou avec retenue, deux ou trois termes, somme ≤ 99',
        'Nombres', 'Addition', 'Calcul posé', 1, 120,
        [SANS_RETENUE, AVEC_RETENUE, DEUX_ET_UN_CHIFFRE, TROIS_TERMES], SPECS_OPERATION),
}

for nom, m in MODELES.items():
    with open(f'{DOSSIER}/{nom}.json', 'w') as f:
        json.dump(m, f, ensure_ascii=False, indent='\t')
        f.write('\n')
print(len(MODELES), 'modèles écrits')
