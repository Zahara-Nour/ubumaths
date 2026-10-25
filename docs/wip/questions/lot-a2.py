"""Écrit les 7 modèles du lot A2 (suite et ordre, CP) dans scripts/questions/cp-a2/."""
import json
import sys

DOSSIER = sys.argv[1]

# Plafond technique de l'encadrement libre : une réponse vraie (150 > 47) n'est jamais refusée
PLAFOND = '1000000'


def spec(desc, vi, variables, answers, status, violations=None):
    s = {'description': desc, 'variationIndex': vi, 'variables': variables,
         'answers': answers, 'expected': {'status': status}}
    if violations:
        s['expected']['constraintViolations'] = violations
    return s


def modele(title, description, subdomain, level, variations, specs):
    return {'title': title, 'description': description, 'grades': ['CP'], 'theme': 'Entiers',
            'domain': 'Apprivoiser', 'subdomain': subdomain, 'level': level, 'delay': 20,
            'status': 'draft', 'variations': variations, 'testSpecs': specs}


def entier_strict(mini, maxi):
    """Règles d'une case `rulesSuffice` : entier strictement entre mini et maxi."""
    return [{'type': 'range', 'min': mini, 'max': maxi, 'inclusive': False},
            {'type': 'predicate', 'predicate': 'isInteger'}]


# Passage de la dizaine : expliqué quand le nombre se termine par 9 (suivant) ou 0 (précédent)
SUIVANT = {
    'statement': 'Écris le nombre qui suit ${{n}}$.\n\nLe nombre qui suit ${{n}}$ est $?$.',
    'variables': [{'name': 'n', 'expression': '0..99'}],
    'blanks': [{'expectedAnswer': '{{eval:n+1}}'}],
    'correction': {'steps': [
        'Le nombre qui suit, c\'est celui qu\'on dit juste après en comptant : on avance de $1$.',
        '{{if:mod(n,10)==9|${{n}}$ se termine par $9$ : on passe à la dizaine suivante,'
        ' le chiffre des unités revient à $0$.|Le chiffre des unités augmente de $1$.}}',
        '$${{n}} \\rightarrow {{solution}}$$']},
}
PRECEDENT = {
    'statement': 'Écris le nombre qui précède ${{n}}$.\n\nLe nombre qui précède ${{n}}$ est $?$.',
    'variables': [{'name': 'n', 'expression': '1..100'}],
    'blanks': [{'expectedAnswer': '{{eval:n-1}}'}],
    'correction': {'steps': [
        'Le nombre qui précède, c\'est celui qu\'on dit juste avant en comptant : on recule de $1$.',
        '{{if:mod(n,10)==0|${{n}}$ se termine par $0$ : on revient à la dizaine précédente,'
        ' le chiffre des unités devient $9$.|Le chiffre des unités diminue de $1$.}}',
        '$${{solution}} \\rightarrow {{n}}$$']},
}


def suite(conditions):
    v = {'statement': 'Complète la suite des nombres.\n\n'
                      '$${{s}} \\quad ; \\quad {{if:k==1|?|{{eval:s+1}}}} \\quad ; \\quad'
                      ' {{if:k==2|?|{{eval:s+2}}}} \\quad ; \\quad {{eval:s+3}}$$',
         'variables': [{'name': 's', 'expression': '0..97'}, {'name': 'k', 'expression': '1..2'}],
         'blanks': [{'expectedAnswer': '{{eval:s+k}}'}],
         'correction': {'steps': [
             'Dans la suite des nombres, on avance de $1$ à chaque fois.',
             'Après ${{eval:s+k-1}}$ vient ${{solution}}$'
             '{{if:mod(s+k,10)==0| : on passe à la dizaine suivante|}}.',
             '$${{s}} \\quad ; \\quad {{eval:s+1}} \\quad ; \\quad {{eval:s+2}}'
             ' \\quad ; \\quad {{eval:s+3}}$$']}}
    if conditions:
        v['conditions'] = conditions
    return v


def dizaines_unites(statement):
    return {'statement': statement,
            'variables': [{'name': 'd', 'expression': '1..9'}, {'name': 'u', 'expression': '0..9'}],
            'blanks': [{'expectedAnswer': '{{eval:10*d+u}}'}],
            'correction': {'steps': [
                'On range dans le tableau de numération : ${{d}}$ au rang des dizaines,'
                ' ${{u}}$ au rang des unités.'
                ' $$\\begin{array}{|c|c|} \\text{dizaines} & \\text{unités} \\\\'
                ' \\textcolor{{{color:primary.0}}}{{{d}}} & \\textcolor{{{color:primary.1}}}{{{u}}}'
                ' \\end{array}$$',
                'Le nombre est ${{solution}}$.']}}


DIZ = '{{if:d==1|dizaine|dizaines}}'
UNI = '{{if:u<=1|unité|unités}}'

# Rangement : 4 nombres tirés déjà rangés (s1 < s2 < s3 < s4), affichés selon une
# permutation o parmi 4 (aucune n'est l'ordre croissant ni le décroissant)
PERMUTATIONS = [(3, 1, 4, 2), (2, 4, 1, 3), (4, 2, 3, 1), (3, 4, 1, 2)]


def affiche(position):
    expr = 's{}'.format(PERMUTATIONS[3][position])
    for o in (3, 2, 1):
        expr = '{{{{if:o=={}|s{}|{}}}}}'.format(o, PERMUTATIONS[o - 1][position], expr)
    return 'eval:' + expr


RANGER_VARIABLES = (
    [{'name': 's1', 'expression': '0..60'},
     {'name': 's2', 'expression': '{{eval:s1+1}}..75'},
     {'name': 's3', 'expression': '{{eval:s2+1}}..90'},
     {'name': 's4', 'expression': '{{eval:s3+1}}..100'},
     {'name': 'o', 'expression': '1..4'}]
    + [{'name': f'x{i + 1}', 'expression': affiche(i)} for i in range(4)])

RANGER_ETAPES = [
    'Pour comparer deux nombres, on regarde d\'abord le chiffre des dizaines'
    ' (un nombre à un chiffre a $0$ dizaine) ; si c\'est le même, on regarde le chiffre des unités.',
]


def ranger(consigne, signe, ordre):
    cases = signe.join('?' for _ in range(4))
    rangee = f' {signe} '.join('{{' + f's{i}' + '}}' for i in ordre)
    return {'statement': consigne + '\n\n${{x1}} \\quad ; \\quad {{x2}} \\quad ; \\quad {{x3}}'
                                    ' \\quad ; \\quad {{x4}}$\n\n$${{expression1}}$$',
            'variables': RANGER_VARIABLES + [{'name': 'expression1', 'expression': cases}],
            'blanks': [{'expectedAnswer': '{{' + f's{i}' + '}}'} for i in ordre],
            'correction': {'steps': RANGER_ETAPES + [f'$${rangee}$$']}}


MODELES = {
    '01-nombre-qui-suit-ou-precede': modele(
        'Le nombre qui suit, le nombre qui précède', 'Suite écrite des nombres jusqu\'à 100',
        'Ecriture', 11, [SUIVANT, PRECEDENT],
        [spec('suit 46 : 47', 0, {'n': '46'}, ['47'], 'correct'),
         spec('borne : suit 99 : 100', 0, {'n': '99'}, ['100'], 'correct'),
         spec('passage de la dizaine : suit 39 : 40', 0, {'n': '39'}, ['40'], 'correct'),
         spec('borne : suit 0 : 1', 0, {'n': '0'}, ['1'], 'correct'),
         spec('Erreur : dizaine non passée (310)', 0, {'n': '39'}, ['310'], 'incorrect'),
         spec('Erreur : le nombre qui précède (45)', 0, {'n': '46'}, ['45'], 'incorrect'),
         spec('Zéro inutile 047', 0, {'n': '46'}, ['047'], 'unoptimal_form', ['zeros']),
         spec('précède 46 : 45', 1, {'n': '46'}, ['45'], 'correct'),
         spec('borne : précède 100 : 99', 1, {'n': '100'}, ['99'], 'correct'),
         spec('passage de la dizaine : précède 40 : 39', 1, {'n': '40'}, ['39'], 'correct'),
         spec('borne : précède 1 : 0', 1, {'n': '1'}, ['0'], 'correct'),
         spec('Erreur : dizaine non reculée (49)', 1, {'n': '40'}, ['49'], 'incorrect'),
         spec('Erreur : le nombre qui suit (47)', 1, {'n': '46'}, ['47'], 'incorrect')]),
    '02-completer-la-suite': modele(
        'Compléter la suite des nombres', 'Quatre nombres qui se suivent, un manque',
        'Ecriture', 12, [suite([]), suite(['mod(s,10) >= 7'])],
        [spec('37 ; 38 ; ? ; 40 : 39', 0, {'s': '37', 'k': '2'}, ['39'], 'correct'),
         spec('47 ; ? ; 49 ; 50 : 48', 0, {'s': '47', 'k': '1'}, ['48'], 'correct'),
         spec('borne : 97 ; 98 ; ? ; 100 : 99', 0, {'s': '97', 'k': '2'}, ['99'], 'correct'),
         spec('borne : 0 ; ? ; 2 ; 3 : 1', 0, {'s': '0', 'k': '1'}, ['1'], 'correct'),
         spec('passage de la dizaine : 38 ; 39 ; ? ; 41 : 40', 1, {'s': '38', 'k': '2'}, ['40'],
              'correct'),
         spec('Erreur : dizaine non passée (310)', 1, {'s': '38', 'k': '2'}, ['310'], 'incorrect'),
         spec('Erreur : dizaine sautée (50)', 1, {'s': '38', 'k': '2'}, ['50'], 'incorrect'),
         spec('Zéro inutile 040', 1, {'s': '38', 'k': '2'}, ['040'], 'unoptimal_form', ['zeros'])]),
    '03-dizaines-et-unites': modele(
        'Dizaines et unités : écrire le nombre', 'De « 7 dizaines et 4 unités » à 74',
        'Décomposition', 12,
        [dizaines_unites(f'Écris le nombre en chiffres.\n\n${{{{d}}}}$ {DIZ} et ${{{{u}}}}$ {UNI},'
                         ' c\'est $?$.'),
         {**dizaines_unites(f'Écris le nombre en chiffres.\n\n${{{{u}}}}$ {UNI} et ${{{{d}}}}$ {DIZ},'
                            ' c\'est $?$.'),
          'conditions': ['u != 0', 'u != d']}],
        [spec('7 dizaines et 4 unités : 74', 0, {'d': '7', 'u': '4'}, ['74'], 'correct'),
         spec('borne : 9 dizaines et 0 unité : 90', 0, {'d': '9', 'u': '0'}, ['90'], 'correct'),
         spec('1 dizaine et 1 unité : 11', 0, {'d': '1', 'u': '1'}, ['11'], 'correct'),
         spec('Erreur : chiffres inversés (47)', 0, {'d': '7', 'u': '4'}, ['47'], 'incorrect'),
         spec('Erreur : 70 et 4 juxtaposés (704)', 0, {'d': '7', 'u': '4'}, ['704'], 'incorrect'),
         spec('Zéro inutile 074', 0, {'d': '7', 'u': '4'}, ['074'], 'unoptimal_form', ['zeros']),
         spec('ordre inversé : 4 unités et 7 dizaines : 74', 1, {'d': '7', 'u': '4'}, ['74'],
              'correct'),
         spec('Erreur : ordre de l\'énoncé recopié (47)', 1, {'d': '7', 'u': '4'}, ['47'],
              'incorrect')]),
    '04-ranger-des-nombres': modele(
        'Ranger des nombres', 'Quatre nombres jusqu\'à 100, ordre croissant ou décroissant',
        'Comparer', 5,
        [ranger('Range ces nombres du plus petit au plus grand.', '<', (1, 2, 3, 4)),
         ranger('Range ces nombres du plus grand au plus petit.', '>', (4, 3, 2, 1))],
        [spec('croissant : 9 < 25 < 47 < 52', 0,
              {'s1': '9', 's2': '25', 's3': '47', 's4': '52', 'o': '1'},
              ['9', '25', '47', '52'], 'correct'),
         spec('même dizaine et chiffres inversés : 34 < 38 < 43 < 48', 0,
              {'s1': '34', 's2': '38', 's3': '43', 's4': '48', 'o': '2'},
              ['34', '38', '43', '48'], 'correct'),
         spec('bornes : 0 < 1 < 99 < 100', 0,
              {'s1': '0', 's2': '1', 's3': '99', 's4': '100', 'o': '3'},
              ['0', '1', '99', '100'], 'correct'),
         spec('Erreur : ordre décroissant', 0,
              {'s1': '9', 's2': '25', 's3': '47', 's4': '52', 'o': '1'},
              ['52', '47', '25', '9'], 'incorrect'),
         spec('Erreur : ordre d\'affichage recopié', 0,
              {'s1': '9', 's2': '25', 's3': '47', 's4': '52', 'o': '1'},
              ['47', '9', '52', '25'], 'incorrect'),
         spec('Erreur : unités avant dizaines (43 < 34)', 0,
              {'s1': '34', 's2': '38', 's3': '43', 's4': '48', 'o': '2'},
              ['43', '34', '48', '38'], 'incorrect'),
         spec('décroissant : 52 > 47 > 25 > 9', 1,
              {'s1': '9', 's2': '25', 's3': '47', 's4': '52', 'o': '4'},
              ['52', '47', '25', '9'], 'correct'),
         spec('Erreur : ordre croissant', 1,
              {'s1': '9', 's2': '25', 's3': '47', 's4': '52', 'o': '4'},
              ['9', '25', '47', '52'], 'incorrect')]),
    '05-juste-avant-juste-apres': modele(
        'Le nombre juste avant, le nombre juste après', 'Encadrer par les deux voisins : 46 < 47 < 48',
        'Encadrer', 4,
        [{'statement': 'Écris le nombre juste avant et le nombre juste après.\n\n$${{expression1}}$$',
          'variables': [{'name': 'n', 'expression': '1..99'},
                        {'name': 'expression1', 'expression': '?<{{n}}<?'}],
          'blanks': [{'expectedAnswer': '{{eval:n-1}}'}, {'expectedAnswer': '{{eval:n+1}}'}],
          'correction': {'steps': [
              'Le nombre juste avant ${{n}}$ est celui qu\'on dit en reculant de $1$ ;'
              ' le nombre juste après, celui qu\'on dit en avançant de $1$.',
              '$${{eval:n-1}} < {{n}} < {{eval:n+1}}$$']}}],
        [spec('46 < 47 < 48', 0, {'n': '47'}, ['46', '48'], 'correct'),
         spec('passage de la dizaine : 39 < 40 < 41', 0, {'n': '40'}, ['39', '41'], 'correct'),
         spec('bornes : 98 < 99 < 100', 0, {'n': '99'}, ['98', '100'], 'correct'),
         spec('bornes : 0 < 1 < 2', 0, {'n': '1'}, ['0', '2'], 'correct'),
         spec('Erreur : voisins inversés', 0, {'n': '47'}, ['48', '46'], 'incorrect'),
         spec('Erreur : pas les voisins (45, 49)', 0, {'n': '47'}, ['45', '49'], 'incorrect'),
         spec('Erreur : dizaine non reculée (49 < 40)', 0, {'n': '40'}, ['49', '41'], 'incorrect')]),
    '06-encadrer': modele(
        'Encadrer un nombre', 'Un nombre plus petit, un nombre plus grand : … < 47 < …',
        'Encadrer', 5,
        [{'statement': 'Écris un nombre plus petit que ${{n}}$ et un nombre plus grand que ${{n}}$.'
                       '\n\n$${{expression1}}$$',
          'variables': [{'name': 'n', 'expression': '1..99'},
                        {'name': 'expression1', 'expression': '?<{{n}}<?'}],
          'blanks': [{'expectedAnswer': '{{eval:n-1}}', 'rulesSuffice': True,
                      'validationRules': entier_strict('-1', '{{n}}')},
                     {'expectedAnswer': '{{eval:n+1}}', 'rulesSuffice': True,
                      'validationRules': entier_strict('{{n}}', PLAFOND)}],
          'correction': {'steps': [
              'Un nombre plus petit que ${{n}}$ vient avant lui dans la suite des nombres ;'
              ' un nombre plus grand vient après.',
              'Plusieurs réponses sont possibles. Par exemple :'
              ' $${{eval:n-1}} < {{n}} < {{eval:n+1}}$$']}}],
        [spec('30 < 47 < 80', 0, {'n': '47'}, ['30', '80'], 'correct'),
         spec('les voisins : 46 < 47 < 48', 0, {'n': '47'}, ['46', '48'], 'correct'),
         spec('bornes : 0 < 47 < 100', 0, {'n': '47'}, ['0', '100'], 'correct'),
         spec('au-delà de 100 : 3 < 47 < 150', 0, {'n': '47'}, ['3', '150'], 'correct'),
         spec('borne : 0 < 1 < 2', 0, {'n': '1'}, ['0', '2'], 'correct'),
         spec('Erreur : le nombre lui-même (47 < 47)', 0, {'n': '47'}, ['47', '80'], 'incorrect'),
         spec('Erreur : plus grand à gauche (50 < 47)', 0, {'n': '47'}, ['50', '80'], 'incorrect'),
         spec('Erreur : bornes inversées', 0, {'n': '47'}, ['80', '30'], 'incorrect')]),
    '07-intercaler': modele(
        'Intercaler un nombre', 'Un nombre entre deux nombres donnés : 47 < … < 52',
        'Encadrer', 6,
        [{'statement': 'Écris un nombre compris entre ${{a}}$ et ${{b}}$.\n\n$${{expression1}}$$',
          'variables': [{'name': 'a', 'expression': '0..90'},
                        {'name': 'k', 'expression': '2..10'},
                        {'name': 'b', 'expression': 'eval:a+k'},
                        {'name': 'expression1', 'expression': '{{a}}<?<{{b}}'}],
          'blanks': [{'expectedAnswer': '{{eval:a+1}}', 'rulesSuffice': True,
                      'validationRules': entier_strict('{{a}}', '{{b}}')}],
          'correction': {'steps': [
              'Un nombre compris entre ${{a}}$ et ${{b}}$ vient après ${{a}}$ et avant ${{b}}$'
              ' dans la suite des nombres.',
              '{{if:k==2|Il n\'y en a qu\'un : ${{eval:a+1}}$.|{{if:k==3|'
              'Il y en a deux : ${{eval:a+1}}$ ou ${{eval:a+2}}$.|'
              'Ce sont les nombres de ${{eval:a+1}}$ à ${{eval:b-1}}$ : n\'importe lequel convient.}}}}']}}],
        [spec('47 < 50 < 52', 0, {'a': '47', 'k': '5'}, ['50'], 'correct'),
         spec('bornes : 47 < 48 < 52', 0, {'a': '47', 'k': '5'}, ['48'], 'correct'),
         spec('bornes : 47 < 51 < 52', 0, {'a': '47', 'k': '5'}, ['51'], 'correct'),
         spec('réponse unique : 47 < 48 < 49', 0, {'a': '47', 'k': '2'}, ['48'], 'correct'),
         spec('passage de la dizaine : 38 < 40 < 42', 0, {'a': '38', 'k': '4'}, ['40'], 'correct'),
         spec('borne haute : 90 < 95 < 100', 0, {'a': '90', 'k': '10'}, ['95'], 'correct'),
         spec('Erreur : borne de gauche (47)', 0, {'a': '47', 'k': '5'}, ['47'], 'incorrect'),
         spec('Erreur : borne de droite (52)', 0, {'a': '47', 'k': '5'}, ['52'], 'incorrect'),
         spec('Erreur : hors de l\'intervalle (53)', 0, {'a': '47', 'k': '5'}, ['53'], 'incorrect')]),
}

for nom, m in MODELES.items():
    with open(f'{DOSSIER}/{nom}.json', 'w') as f:
        json.dump(m, f, ensure_ascii=False, indent='\t')
        f.write('\n')
print(len(MODELES), 'modèles écrits')
