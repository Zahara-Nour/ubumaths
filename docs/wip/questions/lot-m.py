"""Écrit les 6 modèles du lot M (monnaie, CP) dans scripts/questions/cp-m/."""
import json
import sys

DOSSIER = sys.argv[1]

# Décisions de David le 2026-10-26 (journal docs/wip/questions-progress.md § 4 quattuordecies).
# Affichage seul (bloc ```monnaie) : l'élève lit les pièces et les billets, il n'en déplace pas.
# Un {{if:…}} imbriqué n'est pas résolu dans correctChoiceIndex : la bonne réponse y est une
# variable (g), calculée dans les variables. Montants en `$n~\\unit{€}$` (notation-unites.md) : avec
# une espace, même insécable, « € » passait seul à la ligne au téléphone. Jamais « : »
# juste après un montant : il passait seul à la ligne, lui aussi.


def spec(desc, vi, variables_, status, choix=None, answers=None):
    s = {'description': desc, 'variationIndex': vi, 'variables': variables_,
         'expected': {'status': status}}
    if choix is not None:
        s['selectedChoices'] = [choix]
    if answers is not None:
        s['answers'] = answers
    return s


def modele(title, description, subdomain, level, delay, variations, specs, options=None):
    # theme / domain / subdomain : anciennes colonnes, remplies pour create-questions ; le
    # rangement (nœud du point) est posé par la migration
    m = {'title': title, 'description': description, 'grades': ['CP'], 'theme': 'Grandeurs',
         'domain': 'Monnaie', 'subdomain': subdomain, 'level': level, 'delay': delay,
         'status': 'draft', 'variations': variations, 'testSpecs': specs}
    if options:
        m['options'] = options
    return m


def monnaie(*lignes):
    return '```monnaie\n' + '\n'.join(lignes) + '\n```'


def var(nom, expression):
    return {'name': nom, 'expression': expression}


def pluriel(n, singulier, pluriel_):
    return '{{if:' + n + '==1|' + singulier + '|' + pluriel_ + '}}'


ORDRE_FIXE = {'shuffleChoices': False}

# --- M1, CP-043 : combien d'argent ? ------------------------------------------------------

ENONCE_COMBIEN = 'Combien d\'argent y a-t-il ?\n\n{bloc}\n\nIl y a [_] €.'


def combien(lignes, variables, conditions, billets, pieces, nb_billets='', nb_pieces='d+u'):
    """billets / pieces : expressions eval de la valeur des billets et des pièces ('' = aucun) ;
    nb_billets / nb_pieces : leur nombre (accord au singulier)."""
    total = '+'.join(x for x in (billets, pieces) if x)
    etapes = []
    if billets:
        etapes.append('On commence par {{if:' + nb_billets + '==1|le billet : il vaut'
                      '|les billets : ils valent}} ${{eval:' + billets + '}}~\\unit{€}$.')
        etapes.append('Puis {{if:' + nb_pieces + '==1|la pièce : elle vaut'
                      '|les pièces : elles valent}} ${{eval:' + pieces + '}}~\\unit{€}$.')
        etapes.append('En tout : ${{eval:' + billets + '}}+{{eval:' + pieces + '}}={{eval:'
                      + total + '}}~\\unit{€}$.')
        etapes.append('Ce n\'est pas le nombre de pièces et de billets qui compte, c\'est ce qui'
                      ' est écrit dessus.')
    else:
        etapes.append('On compte les pièces : elles valent ${{eval:' + pieces
                      + '}}~\\unit{€}$.')
        etapes.append('Ce n\'est pas le nombre de pièces qui compte, c\'est ce qui est écrit'
                      ' dessus.')
    return {
        'statement': ENONCE_COMBIEN.format(bloc=monnaie(*lignes)),
        'variables': variables,
        'conditions': conditions,
        'blanks': [{'expectedAnswer': '{{eval:' + total + '}}'}],
        'correction': {'steps': etapes},
    }


PIECES_SEULES = combien(
    ['pièces: {{d}}×2 {{u}}×1'],
    [var('d', '1..4'), var('u', '0..2')], ['d + u >= 2'], '', '2*d+u')

DIX_ET_PIECES = combien(
    ['billets: {{b}}×10', 'pièces: {{d}}×2 {{u}}×1'],
    [var('b', '1..4'), var('d', '0..4'), var('u', '0..1')], ['d + u >= 1'], '10*b', '2*d+u',
    'b')

VARIABLES_MELANGE = [var('v', '0..2'), var('t', '0..2'), var('c', '0..1'), var('d', '0..3'),
                     var('u', '0..1')]
CONDITIONS_MELANGE = ['v + t + c >= 2', 'd + u >= 1']
LIGNES_MELANGE = ['billets: {{v}}×20 {{t}}×10 {{c}}×5', 'pièces: {{d}}×2 {{u}}×1']

BILLETS_ET_PIECES = combien(LIGNES_MELANGE, VARIABLES_MELANGE, CONDITIONS_MELANGE,
                            '20*v+10*t+5*c', '2*d+u', 'v+t+c')
EN_VRAC = combien(LIGNES_MELANGE + ['disposition: mélangé'], VARIABLES_MELANGE,
                  CONDITIONS_MELANGE, '20*v+10*t+5*c', '2*d+u', 'v+t+c')

SPECS_COMBIEN = [
    spec('3 pièces de 2 € et 1 de 1 € : 7', 0, {'d': '3', 'u': '1'}, 'correct', answers=['7']),
    spec('Erreur : compte les pièces (4)', 0, {'d': '3', 'u': '1'}, 'incorrect', answers=['4']),
    spec('3 billets de 10 €, 2 pièces de 2 €, 1 de 1 € : 35', 1, {'b': '3', 'd': '2', 'u': '1'},
         'correct', answers=['35']),
    spec('Erreur : chaque objet compté 1 € (6)', 1, {'b': '3', 'd': '2', 'u': '1'}, 'incorrect',
         answers=['6']),
    spec('20 + 10 + 10 + 5 + 2 + 2 + 1 = 50', 2,
         {'v': '1', 't': '2', 'c': '1', 'd': '2', 'u': '1'}, 'correct', answers=['50']),
    spec('Erreur : le 5 € oublié (45)', 2, {'v': '1', 't': '2', 'c': '1', 'd': '2', 'u': '1'},
         'incorrect', answers=['45']),
    spec('Mélangé : 20 + 20 + 10 + 2 = 52', 3, {'v': '2', 't': '1', 'c': '0', 'd': '1', 'u': '0'},
         'correct', answers=['52']),
]

# --- M2, CP-042 : qui a le plus d'argent ? ------------------------------------------------

CHOIX_QUI = [{'content': 'Léa'}, {'content': 'Tom'}, {'content': 'Ils ont autant d\'argent.'}]
# g : 0 Léa, 1 Tom, 2 autant ; la et to : sommes de Léa et de Tom


def g_de(la, to):
    return var('g', '{{if:' + la + '>' + to + '|0|{{if:' + la + '<' + to + '|1|2}}}}')


CORRECTION_QUI = [
    'Léa a ${{la}}~\\unit{€}$. Tom a ${{to}}~\\unit{€}$.',
    '{{if:g==0|Léa a le plus d\'argent.|{{if:g==1|Tom a le plus d\'argent.'
    '|Ils ont autant d\'argent.}}}}',
]
ATTENTION_NOMBRE = ('Ce n\'est pas celui qui a le plus de pièces et de billets qui a le plus'
                    ' d\'argent : on compte ce qui est écrit dessus.')


def qui(lignes, variables, conditions, etapes):
    return {
        'statement': 'Qui a le plus d\'argent ?\n\n' + monnaie(*lignes, 'légendes: Léa ; Tom'),
        'variables': variables,
        'conditions': conditions,
        'choices': CHOIX_QUI,
        'correctChoiceIndex': ['{{g}}'],
        'correction': {'steps': etapes},
    }


QUI_PIECES = qui(
    ['pièces: {{a}}×2 {{b}}×1 ; {{c}}×2 {{f}}×1'],
    [var('a', '0..4'), var('b', '0..4'), var('c', '0..4'), var('f', '0..4'),
     var('la', 'eval:2*a+b'), var('to', 'eval:2*c+f'), g_de('la', 'to')],
    ['a + b >= 2', 'c + f >= 2', 'abs(la - to) <= 2'],
    CORRECTION_QUI)

# Piège du BO : n pièces de 1 € contre un billet de k € (k = 5 ou 10, n = k - 1, k ou k + 1) ;
# s = 1 : Léa a les pièces, s = 2 : Tom les a.
QUI_PIEGE = qui(
    ['billets: {{if:s==1||1×{{k}}}} ; {{if:s==1|1×{{k}}|}}',
     'pièces: {{if:s==1|{{n}}×1|}} ; {{if:s==1||{{n}}×1}}'],
    [var('k', '5|10'), var('dn', '-1|0|0|1'), var('s', '1..2'), var('n', 'eval:k+dn'),
     var('la', '{{if:s==1|{{n}}|{{k}}}}'), var('to', '{{if:s==1|{{k}}|{{n}}}}'),
     g_de('la', 'to')],
    [],
    CORRECTION_QUI + [ATTENTION_NOMBRE])

# Moins d'objets mais (souvent) plus d'argent : billets de 5 € et pièces de 2 € contre un billet
# de 10 ou 20 € et au plus une pièce de 1 €.
QUI_MOINS_D_OBJETS = qui(
    ['billets: {{c}}×5 ; 1×{{w}}', 'pièces: {{d}}×2 ; {{u}}×1'],
    [var('c', '1..3'), var('d', '1..4'), var('w', '10|20'), var('u', '0..1'),
     var('la', 'eval:5*c+2*d'), var('to', 'eval:w+u'), g_de('la', 'to')],
    ['c + d >= 3', 'abs(la - to) <= 6'],
    CORRECTION_QUI + [ATTENTION_NOMBRE])

QUI_BILLETS_ET_PIECES = qui(
    ['billets: {{p}}×10 ; {{r}}×20 {{q}}×5', 'pièces: {{x}}×2 ; {{y}}×1'],
    [var('p', '1..4'), var('x', '0..4'), var('r', '1..2'), var('q', '0..1'), var('y', '0..4'),
     var('la', 'eval:10*p+2*x'), var('to', 'eval:20*r+5*q+y'), g_de('la', 'to')],
    ['abs(la - to) <= 6'],
    CORRECTION_QUI)

SPECS_QUI = [
    spec('Léa 2 + 2 + 1 = 5, Tom 2 + 1 + 1 = 4 : Léa', 0,
         {'a': '2', 'b': '1', 'c': '1', 'f': '2', 'la': '5', 'to': '4', 'g': '0'}, 'correct',
         choix=0),
    spec('Erreur : Tom, même nombre de pièces', 0,
         {'a': '2', 'b': '1', 'c': '1', 'f': '2', 'la': '5', 'to': '4', 'g': '0'}, 'incorrect',
         choix=1),
    spec('Piège : 10 pièces de 1 € contre un billet de 10 € → autant', 1,
         {'k': '10', 'dn': '0', 's': '1', 'n': '10', 'la': '10', 'to': '10', 'g': '2'},
         'correct', choix=2),
    spec('Erreur du piège : Léa, parce qu\'elle a plus d\'objets', 1,
         {'k': '10', 'dn': '0', 's': '1', 'n': '10', 'la': '10', 'to': '10', 'g': '2'},
         'incorrect', choix=0),
    spec('Tom a 6 pièces de 1 €, Léa un billet de 5 € : Tom', 1,
         {'k': '5', 'dn': '1', 's': '2', 'n': '6', 'la': '5', 'to': '6', 'g': '1'},
         'correct', choix=1),
    spec('Léa 5 + 5 + 2 + 2 = 14 (4 objets), Tom 20 (1 objet) : Tom', 2,
         {'c': '2', 'd': '2', 'w': '20', 'u': '0', 'la': '14', 'to': '20', 'g': '1'},
         'correct', choix=1),
    spec('Léa 10 + 10 + 2 = 22, Tom 20 + 1 = 21 : Léa', 3,
         {'p': '2', 'x': '1', 'r': '1', 'q': '0', 'y': '1', 'la': '22', 'to': '21', 'g': '0'},
         'correct', choix=0),
]

# --- M3, CP-044 : quel porte-monnaie contient exactement n € ? -----------------------------

# V1 : le bon porte-monnaie a le moins d'objets (a×20 b×10 c×5, d×2 u×1). Leurres : une pièce
# oubliée (la pièce de 1 €, sinon une de 2 €) ; le même nombre d'objets (1 € changé en 2 €,
# sinon 2 € changé en 1 €). do = d - 1 + u ; ds = d - 1 + 2u ; us = 1 - u.
BILLETS_V1 = 'billets: {{a}}×20 {{b}}×10 {{c}}×5'

EXACT = {
    'statement': 'Quel porte-monnaie contient exactement ${{n}}~\\unit{€}$ ?',
    'variables': [var('a', '0..2'), var('b', '0..1'), var('c', '0..1'), var('d', '0..2'),
                  var('u', '0..1'), var('n', 'eval:20*a+10*b+5*c+2*d+u'),
                  var('do', 'eval:d-1+u'), var('ds', 'eval:d-1+2*u'), var('us', 'eval:1-u')],
    'conditions': ['a + b + c >= 1', 'd + u >= 1'],
    'choices': [
        {'content': monnaie(BILLETS_V1, 'pièces: {{d}}×2 {{u}}×1')},
        {'content': monnaie(BILLETS_V1, 'pièces: {{do}}×2')},
        {'content': monnaie(BILLETS_V1, 'pièces: {{ds}}×2 {{us}}×1')},
    ],
    'correctChoiceIndex': ['0'],
    'correction': {'steps': [
        'On compte l\'argent de chaque porte-monnaie, billets d\'abord.',
        'Le bon porte-monnaie : ${{eval:20*a+10*b+5*c}}~\\unit{€}$ de billets et ${{eval:2*d+u}}~\\unit{€}$ de'
        ' pièces, ${{n}}~\\unit{€}$ en tout.',
        'Les deux autres contiennent {{if:u==1|${{eval:n-1}}~\\unit{€}$ et ${{eval:n+1}}~\\unit{€}$'
        '|${{eval:n-2}}~\\unit{€}$ et ${{eval:n-1}}~\\unit{€}$}}, et non ${{n}}~\\unit{€}$.',
        'Attention : avoir autant de pièces et de billets ne veut pas dire avoir autant d\'argent.',
    ]},
}

# V2 (contrainte du BO) : trois porte-monnaie de n € = 10b + 5 + 2d, un seul sans pièce de 1 €.
# Leurres : une pièce de 2 € changée en deux de 1 € ; le billet de 5 € changé en 2 + 2 + 1.
SANS_UN = {
    'statement': 'Quel porte-monnaie contient exactement ${{n}}~\\unit{€}$, **sans pièce de $1~\\unit{€}$** ?',
    'variables': [var('b', '1..3'), var('d', '1..3'), var('n', 'eval:10*b+5+2*d')],
    'conditions': [],
    'choices': [
        {'content': monnaie('billets: {{b}}×10 1×5', 'pièces: {{d}}×2')},
        {'content': monnaie('billets: {{b}}×10 1×5', 'pièces: {{eval:d-1}}×2 2×1')},
        {'content': monnaie('billets: {{b}}×10', 'pièces: {{eval:d+2}}×2 1×1')},
    ],
    'correctChoiceIndex': ['0'],
    'correction': {'steps': [
        'Les trois porte-monnaie contiennent ${{n}}~\\unit{€}$.',
        'Un seul n\'a aucune pièce de $1~\\unit{€}$. Les deux autres en ont.',
    ]},
}

SPECS_EXACT = [
    spec('48 € = 20 + 20 + 5 + 2 + 1', 0,
         {'a': '2', 'b': '0', 'c': '1', 'd': '1', 'u': '1', 'n': '48', 'do': '1', 'ds': '2',
          'us': '0'}, 'correct', choix=0),
    spec('Erreur : la pièce de 1 € oubliée (47 €)', 0,
         {'a': '2', 'b': '0', 'c': '1', 'd': '1', 'u': '1', 'n': '48', 'do': '1', 'ds': '2',
          'us': '0'}, 'incorrect', choix=1),
    spec('Erreur : même nombre d\'objets (49 €)', 0,
         {'a': '2', 'b': '0', 'c': '1', 'd': '1', 'u': '1', 'n': '48', 'do': '1', 'ds': '2',
          'us': '0'}, 'incorrect', choix=2),
    spec('Sans pièce de 1 € : 29 € = 10 + 10 + 5 + 2 + 2', 1, {'b': '2', 'd': '2', 'n': '29'},
         'correct', choix=0),
    spec('Erreur : 29 € mais avec deux pièces de 1 €', 1, {'b': '2', 'd': '2', 'n': '29'},
         'incorrect', choix=1),
]

# --- M4, CP-044 : combien de pièces (ou de billets) faut-il ajouter ? ----------------------

AJOUTER_DEUX = {
    'statement': 'Léa a cet argent :\n\n'
    + monnaie('billets: {{b}}×10 {{c}}×5', 'pièces: {{u}}×1')
    + '\n\nIl lui faut exactement ${{n}}~\\unit{€}$. Combien de pièces de $2~\\unit{€}$ doit-elle ajouter ?'
    '\n\nNombre de pièces à ajouter : [_]',
    'variables': [var('b', '1..3'), var('c', '0..1'), var('u', '0..1'), var('k', '1..4'),
                  var('s', 'eval:10*b+5*c+u'), var('n', 'eval:s+2*k')],
    'conditions': [],
    'blanks': [{'expectedAnswer': '{{k}}'}],
    'correction': {'steps': [
        'Léa a ${{s}}~\\unit{€}$. Il lui manque ${{n}}-{{s}}={{eval:2*k}}~\\unit{€}$.',
        '${{eval:2*k}}~\\unit{€}$, c\'est ${{k}}$ ' + pluriel('k', 'pièce', 'pièces') + ' de $2~\\unit{€}$.',
    ]},
}

AJOUTER_DIX = {
    'statement': 'Tom a cet argent :\n\n' + monnaie('pièces: {{d}}×2 {{u}}×1')
    + '\n\nIl lui faut exactement ${{n}}~\\unit{€}$. Combien de billets de $10~\\unit{€}$ doit-il ajouter ?'
    '\n\nNombre de billets à ajouter : [_]',
    'variables': [var('d', '1..4'), var('u', '0..1'), var('k', '1..4'),
                  var('s', 'eval:2*d+u'), var('n', 'eval:s+10*k')],
    'conditions': [],
    'blanks': [{'expectedAnswer': '{{k}}'}],
    'correction': {'steps': [
        'Tom a ${{s}}~\\unit{€}$. Il lui manque ${{n}}-{{s}}={{eval:10*k}}~\\unit{€}$.',
        '${{eval:10*k}}~\\unit{€}$, c\'est ${{k}}$ ' + pluriel('k', 'billet', 'billets') + ' de $10~\\unit{€}$.',
    ]},
}

SPECS_AJOUTER = [
    spec('Léa a 25 €, il lui faut 31 € : 3 pièces', 0,
         {'b': '2', 'c': '1', 'u': '0', 'k': '3', 's': '25', 'n': '31'}, 'correct',
         answers=['3']),
    spec('Erreur : répond en euros (6)', 0,
         {'b': '2', 'c': '1', 'u': '0', 'k': '3', 's': '25', 'n': '31'}, 'incorrect',
         answers=['6']),
    spec('Tom a 7 €, il lui faut 27 € : 2 billets', 1,
         {'d': '3', 'u': '1', 'k': '2', 's': '7', 'n': '27'}, 'correct', answers=['2']),
    spec('Erreur : répond en euros (20)', 1, {'d': '3', 'u': '1', 'k': '2', 's': '7', 'n': '27'},
         'incorrect', answers=['20']),
]

# --- M5, CP-071 : combien le marchand rend-il ? -------------------------------------------

OBJETS = ['Le livre', 'Le ballon', 'Le jeu', 'La trousse']


def objet():
    texte = OBJETS[-1]
    for i in range(len(OBJETS) - 1, 0, -1):
        texte = '{{if:o==' + str(i) + '|' + OBJETS[i - 1] + '|' + texte + '}}'
    return texte


def rendre(billet, prix):
    return {
        'statement': objet() + ' coûte ${{p}}~\\unit{€}$. Léo paie avec ce billet :\n\n'
        + monnaie('billets: 1×' + billet)
        + '\n\nCombien le marchand lui rend-il ?\n\nLe marchand rend [_] €.',
        'variables': [var('o', '1..4'), var('p', prix), var('r', 'eval:' + billet + '-p')],
        'conditions': [],
        'blanks': [{'expectedAnswer': '{{r}}'}],
        'correction': {'steps': [
            'On part du prix et on avance jusqu\'à $' + billet + '~\\unit{€}$, soit ${{p}}+{{r}}='
            + billet + '$.',
            'Le marchand rend ${{r}}~\\unit{€}$, par exemple :\n\n' + monnaie('montant: {{r}}'),
        ]},
    }


SPECS_RENDRE = [
    spec('7 € payé avec 10 € : 3', 0, {'o': '1', 'p': '7', 'r': '3'}, 'correct', answers=['3']),
    spec('Erreur : répond le prix (7)', 0, {'o': '1', 'p': '7', 'r': '3'}, 'incorrect',
         answers=['7']),
    spec('13 € payé avec 20 € : 7', 1, {'o': '2', 'p': '13', 'r': '7'}, 'correct',
         answers=['7']),
    spec('Erreur : 13 + 20 (33)', 1, {'o': '2', 'p': '13', 'r': '7'}, 'incorrect',
         answers=['33']),
    spec('35 € payé avec 50 € : 15', 2, {'o': '3', 'p': '35', 'r': '15'}, 'correct',
         answers=['15']),
]

# --- M6, CP-045 : peut-il acheter ? -------------------------------------------------------

CHOIX_OUI_NON = [{'content': 'Oui'}, {'content': 'Non'}]


def acheter(enonce_prix, variables_prix):
    return {
        'statement': 'Tom a cet argent :\n\n'
        + monnaie('billets: {{t}}×10 {{c}}×5', 'pièces: {{d}}×2 {{u}}×1')
        + '\n\n' + enonce_prix + ' Peut-il l\'acheter ?',
        'variables': [var('t', '0..3'), var('c', '0..1'), var('d', '0..3'), var('u', '0..1'),
                      var('s', 'eval:10*t+5*c+2*d+u')] + variables_prix
        + [var('g', '{{if:s>=p|0|1}}')],
        'conditions': ['t + c >= 1', 'd + u >= 1'],
        'choices': CHOIX_OUI_NON,
        'correctChoiceIndex': ['{{g}}'],
        'correction': {'steps': [
            'Tom a ${{s}}~\\unit{€}$. Le ballon coûte ${{p}}~\\unit{€}$.',
            '{{if:s>p|Tom a plus d\'argent que le prix : il peut l\'acheter.'
            '|{{if:s==p|Tom a juste assez d\'argent : il peut l\'acheter.'
            '|Il ne peut pas l\'acheter : il lui manque ${{eval:p-s}}~\\unit{€}$.}}}}',
        ]},
    }


ACHETER = acheter('Il veut acheter un ballon à ${{p}}~\\unit{€}$.',
                  [var('dp', '-3|-2|-1|1|2|3'), var('p', 'eval:s+dp')])
ACHETER_PILE = acheter('Il veut acheter un ballon à ${{p}}~\\unit{€}$.', [var('p', 'eval:s')])

SPECS_ACHETER = [
    spec('Tom a 17 €, ballon à 15 € : oui', 0,
         {'t': '1', 'c': '1', 'd': '1', 'u': '0', 's': '17', 'dp': '-2', 'p': '15', 'g': '0'},
         'correct', choix=0),
    spec('Tom a 17 €, ballon à 19 € : non', 0,
         {'t': '1', 'c': '1', 'd': '1', 'u': '0', 's': '17', 'dp': '2', 'p': '19', 'g': '1'},
         'correct', choix=1),
    spec('Erreur : oui alors qu\'il manque 2 €', 0,
         {'t': '1', 'c': '1', 'd': '1', 'u': '0', 's': '17', 'dp': '2', 'p': '19', 'g': '1'},
         'incorrect', choix=0),
    spec('Pile au prix (23 €) : oui', 1,
         {'t': '2', 'c': '0', 'd': '1', 'u': '1', 's': '23', 'p': '23', 'g': '0'},
         'correct', choix=0),
    spec('Erreur : non alors qu\'il a juste assez', 1,
         {'t': '2', 'c': '0', 'd': '1', 'u': '1', 's': '23', 'p': '23', 'g': '0'},
         'incorrect', choix=1),
]

MODELES = {
    '01-combien-d-argent': modele(
        'Combien d\'argent y a-t-il ?',
        'Trouver la valeur en euros de pièces et de billets (≤ 100 €), rangés ou en vrac',
        'Pièces et billets', 1, 60,
        [PIECES_SEULES, DIX_ET_PIECES, BILLETS_ET_PIECES, EN_VRAC], SPECS_COMBIEN),
    '02-qui-a-le-plus': modele(
        'Qui a le plus d\'argent ?',
        'Comparer deux ensembles de pièces et de billets ; piège : plus d\'objets ne veut pas'
        ' dire plus d\'argent',
        'Pièces et billets', 2, 60,
        [QUI_PIECES, QUI_PIEGE, QUI_MOINS_D_OBJETS, QUI_BILLETS_ET_PIECES], SPECS_QUI,
        ORDRE_FIXE),
    '03-porte-monnaie-exact': modele(
        'Quel porte-monnaie contient exactement… ?',
        'Reconnaître le porte-monnaie qui contient une somme donnée ; leurres : pièce oubliée,'
        ' même nombre d\'objets ; contrainte « sans pièce de 1 € »',
        'Pièces et billets', 3, 90, [EXACT, SANS_UN], SPECS_EXACT),
    '04-combien-ajouter': modele(
        'Combien de pièces ou de billets faut-il ajouter ?',
        'Compléter une somme d\'argent avec des pièces de 2 € ou des billets de 10 €',
        'Pièces et billets', 4, 90, [AJOUTER_DEUX, AJOUTER_DIX], SPECS_AJOUTER),
    '05-rendre-la-monnaie': modele(
        'Combien le marchand rend-il ?',
        'Rendre la monnaie sur un billet de 10, 20 ou 50 € (rendu ≤ 20 €)',
        'Rendre la monnaie', 1, 60,
        [rendre('10', '1..9'), rendre('20', '11..19'), rendre('50', '30..49')], SPECS_RENDRE),
    '06-peut-il-acheter': modele(
        'Peut-il acheter ?',
        'Comparer l\'argent qu\'on a au prix d\'un objet ; une variation tombe pile sur le prix',
        'Pièces et billets', 5, 45, [ACHETER, ACHETER_PILE], SPECS_ACHETER, ORDRE_FIXE),
}

for nom, m in MODELES.items():
    with open(f'{DOSSIER}/{nom}.json', 'w') as f:
        json.dump(m, f, ensure_ascii=False, indent='\t')
        f.write('\n')
print(len(MODELES), 'modèles écrits')
