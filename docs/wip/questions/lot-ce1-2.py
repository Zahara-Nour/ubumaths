"""Écrit les 7 modèles du lot 2 du CE1 (numération) dans scripts/questions/ce1-2/.

Phase 0 validée par David le 2026-10-27 (« je te suis », § 7 du journal
`docs/wip/questions-ce1-progress.md`). Plages : bornes `cycle2.json`, CE1 (nombres ≤ 1 000 ;
unités non canoniques 63 d et 5 u, 5 u 5 c et 13 d, 2 c 27 d et 14 u ; ranger jusqu'à cinq nombres
comme 234, 243, 239, 300, 229 ; 391 < … < 396). Un point par modèle ; case seule, aucun QCM.
Niveaux : places libres des catégories, relevées en prod le 2026-10-27.

    python3 docs/wip/questions/lot-ce1-2.py scripts/questions/ce1-2
"""
import json
import sys

DOSSIER = sys.argv[1]
COMPLETE = 'Complète.\n\n'


def spec(desc, vi, variables, answers, status, violations=None):
    s = {'description': desc, 'variationIndex': vi, 'variables': variables,
         'answers': answers if isinstance(answers, list) else [answers],
         'expected': {'status': status}}
    if violations:
        s['expected']['constraintViolations'] = violations
    return s


def modele(title, description, subdomain, level, variations, specs, delay=20):
    # theme / domain / subdomain : anciennes colonnes, remplies pour create-questions ; le
    # rangement (nœud du point) est posé par la migration
    return {'title': title, 'description': description, 'grades': ['CE1'], 'theme': 'Entiers',
            'domain': 'Apprivoiser', 'subdomain': subdomain, 'level': level, 'delay': delay,
            'status': 'draft', 'variations': variations, 'testSpecs': specs}


def var(nom, expression):
    return {'name': nom, 'expression': expression}


def variation(statement, variables, blanks, steps, conditions=None):
    # Chaque `?` de l'énoncé est une case, dans l'ordre de `blanks`
    v = {'statement': statement, 'variables': variables}
    if conditions:
        v['conditions'] = conditions
    v['blanks'] = [b if isinstance(b, dict) else {'expectedAnswer': b} for b in blanks]
    v['correction'] = {'steps': steps}
    return v


def entre(mini, maxi, expected):
    # Toute réponse entière strictement comprise entre mini et maxi est juste
    return {'expectedAnswer': expected, 'rulesSuffice': True,
            'validationRules': [{'type': 'range', 'min': mini, 'max': maxi, 'inclusive': False},
                                {'type': 'predicate', 'predicate': 'isInteger'}]}


# --- 1. CE1-003 : unités, dizaines, centaines ----------------------------------------------

UDC = [
    variation('${{c}}$ centaines, c\'est $?$ dizaines.', [var('c', '2..9')], ['{{eval:10*c}}'],
              ['$1$ centaine, c\'est $10$ dizaines.',
               '${{c}}$ centaines, c\'est ${{c}}$ fois $10$ dizaines : ${{solution}}$ dizaines.']),
    variation('${{eval:10*c}}$ dizaines, c\'est $?$ centaines.', [var('c', '2..9')], ['{{c}}'],
              ['$10$ dizaines, c\'est $1$ centaine.',
               'Dans ${{eval:10*c}}$ dizaines, il y a ${{c}}$ paquets de $10$ dizaines :'
               ' ${{solution}}$ centaines.']),
    variation('${{c}}$ centaines, c\'est $?$ unités.', [var('c', '2..9')], ['{{eval:100*c}}'],
              ['$1$ centaine, c\'est $100$ unités.',
               '${{c}}$ centaines, c\'est ${{c}}$ fois $100$ unités : ${{solution}}$ unités.']),
    variation('Combien y a-t-il de dizaines en tout dans ${{n}}$ ?\n\nIl y a $?$ dizaines.',
              [var('a', '1..9'), var('b', '0..9'), var('u', '0..9'),
               var('n', 'eval:100*a+10*b+u')], ['{{eval:10*a+b}}'],
              ['${{n}}$, c\'est ${{a}}$ {{if:a==1|centaine|centaines}}, ${{b}}$ {{if:b<=1|dizaine'
               '|dizaines}} et ${{u}}$ {{if:u<=1|unité|unités}}.',
               '${{a}}$ {{if:a==1|centaine|centaines}}, c\'est ${{eval:10*a}}$ dizaines ; avec les'
               ' ${{b}}$ autres : ${{eval:10*a}}+{{b}}={{solution}}$ dizaines.']),
]

SPECS_UDC = [
    spec('4 c = 40 d', 0, {'c': '4'}, '40', 'correct'),
    spec('Erreur : 4 c = 400 d', 0, {'c': '4'}, '400', 'incorrect'),
    spec('Erreur : 4 c = 4 d', 0, {'c': '4'}, '4', 'incorrect'),
    spec('30 d = 3 c', 1, {'c': '3'}, '3', 'correct'),
    spec('Erreur : 30 d = 300 c', 1, {'c': '3'}, '300', 'incorrect'),
    spec('7 c = 700 u', 2, {'c': '7'}, '700', 'correct'),
    spec('Erreur : 7 c = 70 u', 2, {'c': '7'}, '70', 'incorrect'),
    spec('347 : 34 dizaines', 3, {'a': '3', 'b': '4', 'u': '7', 'n': '347'}, '34', 'correct'),
    spec('Erreur : chiffre des dizaines (4)', 3, {'a': '3', 'b': '4', 'u': '7', 'n': '347'}, '4',
         'incorrect'),
    spec('borne : 905 : 90 dizaines', 3, {'a': '9', 'b': '0', 'u': '5', 'n': '905'}, '90',
         'correct'),
]

# --- 2. CE1-005 : unités de numération non canoniques ---------------------------------------

NON_CANONIQUES = [
    variation('${{d}}$ dizaines et ${{u}}$ unités, c\'est le nombre $?$.',
              [var('d', '11..99'), var('u', '0..9')], ['{{eval:10*d+u}}'],
              ['${{d}}$ dizaines, c\'est ${{eval:10*d}}$.',
               '$${{eval:10*d}}+{{u}}={{solution}}$$']),
    variation('${{u}}$ {{if:u==1|unité|unités}}, ${{c}}$ {{if:c==1|centaine|centaines}} et ${{d}}$ dizaines, c\'est le nombre $?$.',
              [var('c', '1..8'), var('d', '10..19'), var('u', '1..9')],
              ['{{eval:100*c+10*d+u}}'],
              ['On range dans l\'ordre : ${{c}}$ {{if:c==1|centaine|centaines}}, c\'est ${{eval:100*c}}$ ; ${{d}}$'
               ' dizaines, c\'est ${{eval:10*d}}$ ; ${{u}}$ {{if:u==1|unité|unités}}, c\'est'
               ' ${{u}}$.',
               '$${{eval:100*c}}+{{eval:10*d}}+{{u}}={{solution}}$$'],
              ['100*c + 10*d + u <= 999']),
    variation('${{c}}$ {{if:c==1|centaine|centaines}}, ${{d}}$ dizaines et ${{u}}$ unités, c\'est le nombre $?$.',
              [var('c', '1..6'), var('d', '10..29'), var('u', '10..19')],
              ['{{eval:100*c+10*d+u}}'],
              ['${{c}}$ {{if:c==1|centaine|centaines}}, c\'est ${{eval:100*c}}$ ; ${{d}}$ dizaines, c\'est'
               ' ${{eval:10*d}}$ ; ${{u}}$ unités, c\'est ${{u}}$.',
               '$${{eval:100*c}}+{{eval:10*d}}+{{u}}={{solution}}$$'],
              ['100*c + 10*d + u <= 999']),
]

SPECS_NON_CANONIQUES = [
    spec('63 d et 5 u = 635', 0, {'d': '63', 'u': '5'}, '635', 'correct'),
    spec('Erreur : 63 + 5 (68)', 0, {'d': '63', 'u': '5'}, '68', 'incorrect'),
    spec('5 u, 5 c et 13 d = 635', 1, {'c': '5', 'd': '13', 'u': '5'}, '635', 'correct'),
    spec('Erreur : chiffres recopiés dans l\'ordre (5513)', 1, {'c': '5', 'd': '13', 'u': '5'},
         '5513', 'incorrect'),
    spec('Erreur : dizaines sans retenue (535)', 1, {'c': '5', 'd': '13', 'u': '5'}, '535',
         'incorrect'),
    spec('2 c, 27 d et 14 u = 484', 2, {'c': '2', 'd': '27', 'u': '14'}, '484', 'correct'),
    spec('Erreur : chiffres recopiés (22714)', 2, {'c': '2', 'd': '27', 'u': '14'}, '22714',
         'incorrect'),
    spec('Erreur : retenue des unités oubliée (474)', 2, {'c': '2', 'd': '27', 'u': '14'}, '474',
         'incorrect'),
]

# --- 3. CE1-004 : la suite des nombres jusqu'à 1 000 ---------------------------------------

SUIT = ['Le nombre qui suit, c\'est celui qu\'on dit juste après en comptant : on avance de $1$.']
PRECEDE = ['Le nombre qui précède, c\'est celui qu\'on dit juste avant en comptant : on recule de'
           ' $1$.']

SUITE = [
    variation('Le nombre qui suit ${{n}}$ est $?$.', [var('n', '100..998')], ['{{eval:n+1}}'],
              SUIT + ['$${{n}} \\rightarrow {{solution}}$$'], ['mod(n,10) <= 8']),
    variation('Le nombre qui suit ${{n}}$ est $?$.',
              [var('a', '1..9'), var('b', '0..9'), var('n', 'eval:100*a+10*b+9')],
              ['{{eval:n+1}}'],
              SUIT + ['{{if:b==9|${{n}}$ se termine par $99$ : on passe à la centaine suivante,'
                      ' les dizaines et les unités reviennent à $0$.|${{n}}$ se termine par $9$ :'
                      ' on passe à la dizaine suivante, le chiffre des unités revient à $0$.}}',
                      '$${{n}} \\rightarrow {{solution}}$$']),
    variation('Le nombre qui précède ${{n}}$ est $?$.',
              [var('a', '1..10'), var('b', '0..9'), var('n', 'eval:100*a+10*b')],
              ['{{eval:n-1}}'],
              PRECEDE + ['{{if:b==0|${{n}}$ se termine par $00$ : on revient à la centaine'
                         ' précédente, les dizaines et les unités deviennent $9$.|${{n}}$ se'
                         ' termine par $0$ : on revient à la dizaine précédente, le chiffre des'
                         ' unités devient $9$.}}',
                         '$${{solution}} \\rightarrow {{n}}$$'],
              ['100*a + 10*b <= 1000']),
]

SPECS_SUITE = [
    spec('suit 456 : 457', 0, {'n': '456'}, '457', 'correct'),
    spec('suit 349 : 350', 1, {'a': '3', 'b': '4', 'n': '349'}, '350', 'correct'),
    spec('Erreur : 3410', 1, {'a': '3', 'b': '4', 'n': '349'}, '3410', 'incorrect'),
    spec('suit 299 : 300', 1, {'a': '2', 'b': '9', 'n': '299'}, '300', 'correct'),
    spec('Erreur : suit 299 : 2100', 1, {'a': '2', 'b': '9', 'n': '299'}, '2100', 'incorrect'),
    spec('borne : suit 999 : 1000', 1, {'a': '9', 'b': '9', 'n': '999'}, '1000', 'correct'),
    spec('précède 300 : 299', 2, {'a': '3', 'b': '0', 'n': '300'}, '299', 'correct'),
    spec('Erreur : précède 300 : 309', 2, {'a': '3', 'b': '0', 'n': '300'}, '309', 'incorrect'),
    spec('précède 450 : 449', 2, {'a': '4', 'b': '5', 'n': '450'}, '449', 'correct'),
    spec('borne : précède 1000 : 999', 2, {'a': '10', 'b': '0', 'n': '1000'}, '999', 'correct'),
]

# --- 4. CE1-008 : ranger cinq nombres ------------------------------------------------------
# Comme l'exemple du programme (229, 234, 239, 243, 300) : quatre nombres de la même centaine,
# dont deux aux chiffres échangés (234 / 243), et la centaine suivante.

RANG = [var('c', '1..9'), var('t', '1..7'), var('u', '{{eval:t+1}}..8'),
        var('s1', 'eval:100*c+10*(t-1)+9'), var('s2', 'eval:100*c+10*t+u'),
        var('s3', 'eval:100*c+10*t+9'), var('s4', 'eval:100*c+10*u+t'),
        var('s5', 'eval:100*(c+1)'), var('o', '1..4')]
# Ordre d'affichage : une permutation par valeur de o
ORDRES = [['s3', 's1', 's5', 's2', 's4'], ['s2', 's5', 's4', 's1', 's3'],
          ['s4', 's2', 's1', 's5', 's3'], ['s5', 's3', 's2', 's4', 's1']]
AFFICHE = [var(f'x{i + 1}', 'eval:{{if:o==1|' + ORDRES[0][i] + '|{{if:o==2|' + ORDRES[1][i]
               + '|{{if:o==3|' + ORDRES[2][i] + '|' + ORDRES[3][i] + '}}}}}}')
           for i in range(5)]
LISTE = '${{x1}} \\quad ; \\quad {{x2}} \\quad ; \\quad {{x3}} \\quad ; \\quad {{x4}} \\quad ; \\quad {{x5}}$'
COMPARER = ('On compare d\'abord les centaines : ${{s5}}$ a ${{eval:c+1}}$ centaines, les autres en'
            ' ont ${{c}}$. Pour les nombres de la même centaine, on compare les dizaines, puis les'
            ' unités.')

RANGER = [
    variation('Range ces nombres du plus petit au plus grand.\n\n' + LISTE + '\n\n$$?<?<?<?<?$$',
              RANG + AFFICHE, ['{{s1}}', '{{s2}}', '{{s3}}', '{{s4}}', '{{s5}}'],
              [COMPARER, '$${{s1}} < {{s2}} < {{s3}} < {{s4}} < {{s5}}$$']),
    variation('Range ces nombres du plus grand au plus petit.\n\n' + LISTE + '\n\n$$?>?>?>?>?$$',
              RANG + AFFICHE, ['{{s5}}', '{{s4}}', '{{s3}}', '{{s2}}', '{{s1}}'],
              [COMPARER, '$${{s5}} > {{s4}} > {{s3}} > {{s2}} > {{s1}}$$']),
]

EX = {'c': '2', 't': '3', 'u': '4', 's1': '229', 's2': '234', 's3': '239', 's4': '243',
      's5': '300', 'o': '1'}
SPECS_RANGER = [
    spec('croissant : 229 < 234 < 239 < 243 < 300', 0, EX, ['229', '234', '239', '243', '300'],
         'correct'),
    spec('Erreur : 243 avant 239 (unités lues d\'abord)', 0, EX,
         ['229', '234', '243', '239', '300'], 'incorrect'),
    spec('Erreur : ordre décroissant', 0, EX, ['300', '243', '239', '234', '229'], 'incorrect'),
    spec('décroissant : 300 > 243 > 239 > 234 > 229', 1, EX,
         ['300', '243', '239', '234', '229'], 'correct'),
    spec('borne : 909 < 912 < 919 < 921 < 1000', 0,
         {'c': '9', 't': '1', 'u': '2', 's1': '909', 's2': '912', 's3': '919', 's4': '921',
          's5': '1000', 'o': '4'}, ['909', '912', '919', '921', '1000'], 'correct'),
]

# --- 5. CE1-009 : « supérieur à », « inférieur à », « compris entre » -------------------------

EXPRESSIONS = [
    variation('Écris un nombre supérieur à ${{n}}$.\n\nUn nombre supérieur à ${{n}}$ : $?$.',
              [var('n', '100..900')], [entre('{{n}}', '1000000', '{{eval:n+1}}')],
              ['Un nombre supérieur à ${{n}}$ est plus grand que ${{n}}$ : il vient après dans la'
               ' suite des nombres.',
               'Par exemple ${{eval:n+1}}$ ou ${{eval:n+10}}$ : $${{eval:n+1}} > {{n}}$$']),
    variation('Écris un nombre inférieur à ${{n}}$.\n\nUn nombre inférieur à ${{n}}$ : $?$.',
              [var('n', '100..900')], [entre('-1', '{{n}}', '{{eval:n-1}}')],
              ['Un nombre inférieur à ${{n}}$ est plus petit que ${{n}}$ : il vient avant dans la'
               ' suite des nombres.',
               'Par exemple ${{eval:n-1}}$ ou ${{eval:n-10}}$ : $${{eval:n-1}} < {{n}}$$']),
    variation('Écris un nombre compris entre ${{a}}$ et ${{eval:a+10}}$.\n\n'
              'Un nombre compris entre ${{a}}$ et ${{eval:a+10}}$ : $?$.',
              [var('m', '10..98'), var('a', 'eval:10*m')], [entre('{{a}}', '{{eval:a+10}}',
                                                                  '{{eval:a+5}}')],
              ['Un nombre compris entre ${{a}}$ et ${{eval:a+10}}$ est plus grand que ${{a}}$ et'
               ' plus petit que ${{eval:a+10}}$.',
               'Ce sont les nombres de ${{eval:a+1}}$ à ${{eval:a+9}}$ : n\'importe lequel convient.'
               ' $${{a}} < {{eval:a+5}} < {{eval:a+10}}$$']),
    variation('Écris un nombre supérieur à ${{a}}$ et inférieur à ${{b}}$.\n\n'
              'Un nombre supérieur à ${{a}}$ et inférieur à ${{b}}$ : $?$.',
              [var('a', '100..980'), var('k', '3..20'), var('b', 'eval:a+k')],
              [entre('{{a}}', '{{b}}', '{{eval:a+1}}')],
              ['Le nombre doit être plus grand que ${{a}}$ et plus petit que ${{b}}$.',
               'Ce sont les nombres de ${{eval:a+1}}$ à ${{eval:b-1}}$ : n\'importe lequel convient.'
               ' $${{a}} < {{eval:a+1}} < {{b}}$$']),
]

SPECS_EXPRESSIONS = [
    spec('supérieur à 457 : 458', 0, {'n': '457'}, '458', 'correct'),
    spec('supérieur à 457 : 900', 0, {'n': '457'}, '900', 'correct'),
    spec('Erreur : 457 lui-même', 0, {'n': '457'}, '457', 'incorrect'),
    spec('Erreur : inférieur (400)', 0, {'n': '457'}, '400', 'incorrect'),
    spec('inférieur à 457 : 456', 1, {'n': '457'}, '456', 'correct'),
    spec('inférieur à 457 : 0', 1, {'n': '457'}, '0', 'correct'),
    spec('Erreur : supérieur (500)', 1, {'n': '457'}, '500', 'incorrect'),
    spec('compris entre 340 et 350 : 345', 2, {'m': '34', 'a': '340'}, '345', 'correct'),
    spec('compris entre 340 et 350 : 341', 2, {'m': '34', 'a': '340'}, '341', 'correct'),
    spec('Erreur : borne 350', 2, {'m': '34', 'a': '340'}, '350', 'incorrect'),
    spec('Erreur : 3450 (« entre » recopié)', 2, {'m': '34', 'a': '340'}, '3450', 'incorrect'),
    spec('supérieur à 528 et inférieur à 533 : 530', 3, {'a': '528', 'k': '5', 'b': '533'}, '530',
         'correct'),
    spec('Erreur : 528 lui-même', 3, {'a': '528', 'k': '5', 'b': '533'}, '528', 'incorrect'),
]

# --- 6. CE1-093 : encadrer un nombre -------------------------------------------------------

NOMBRE = [var('a', '1..9'), var('b', '0..9'), var('u', '1..9'), var('n', 'eval:100*a+10*b+u')]

ENCADRER = [
    variation('Écris le nombre juste avant et le nombre juste après ${{n}}$.\n\n$$?<{{n}}<?$$',
              [var('n', '101..998')], ['{{eval:n-1}}', '{{eval:n+1}}'],
              ['Le nombre juste avant, c\'est celui qui précède ; le nombre juste après, celui qui'
               ' suit.',
               '$${{eval:n-1}} < {{n}} < {{eval:n+1}}$$']),
    variation('Encadre ${{n}}$ entre deux dizaines entières qui se suivent.\n\n$$?<{{n}}<?$$',
              NOMBRE, ['{{eval:100*a+10*b}}', '{{eval:100*a+10*b+10}}'],
              ['${{n}}$, c\'est ${{eval:10*a+b}}$ dizaines et ${{u}}$ {{if:u==1|unité|unités}} :'
               ' il est entre ${{eval:10*a+b}}$ dizaines et ${{eval:10*a+b+1}}$ dizaines.',
               '$${{eval:100*a+10*b}} < {{n}} < {{eval:100*a+10*b+10}}$$']),
    variation('Encadre ${{n}}$ entre deux centaines entières qui se suivent.\n\n$$?<{{n}}<?$$',
              NOMBRE, ['{{eval:100*a}}', '{{eval:100*a+100}}'],
              ['${{n}}$ a ${{a}}$ {{if:a==1|centaine|centaines}} : il est entre ${{a}}$'
               ' {{if:a==1|centaine|centaines}} et ${{eval:a+1}}$ centaines.',
               '$${{eval:100*a}} < {{n}} < {{eval:100*a+100}}$$']),
]

EX_N = {'a': '2', 'b': '3', 'u': '9', 'n': '239'}
SPECS_ENCADRER = [
    spec('238 < 239 < 240', 0, {'n': '239'}, ['238', '240'], 'correct'),
    spec('Erreur : 230 < 239 < 240', 0, {'n': '239'}, ['230', '240'], 'incorrect'),
    spec('230 < 239 < 240', 1, EX_N, ['230', '240'], 'correct'),
    spec('Erreur : 220 < 239 < 240', 1, EX_N, ['220', '240'], 'incorrect'),
    spec('Erreur : 238 < 239 < 240', 1, EX_N, ['238', '240'], 'incorrect'),
    spec('borne : 990 < 991 < 1000', 1, {'a': '9', 'b': '9', 'u': '1', 'n': '991'},
         ['990', '1000'], 'correct'),
    spec('200 < 239 < 300', 2, EX_N, ['200', '300'], 'correct'),
    spec('Erreur : dizaines (230 < 239 < 240)', 2, EX_N, ['230', '240'], 'incorrect'),
    spec('borne : 900 < 905 < 1000', 2, {'a': '9', 'b': '0', 'u': '5', 'n': '905'},
         ['900', '1000'], 'correct'),
]

# --- 7. CE1-094 : intercaler un nombre -----------------------------------------------------

INTERCALER = [
    variation('Complète avec un nombre.\n\n$${{a}}<?<{{b}}$$',
              [var('a', '100..990'), var('k', '2..10'), var('b', 'eval:a+k')],
              [entre('{{a}}', '{{b}}', '{{eval:a+1}}')],
              ['Le nombre cherché est plus grand que ${{a}}$ et plus petit que ${{b}}$.',
               '{{if:k==2|Il n\'y en a qu\'un : ${{eval:a+1}}$.|Ce sont les nombres de'
               ' ${{eval:a+1}}$ à ${{eval:b-1}}$ : n\'importe lequel convient.}}']),
    variation('Complète la suite des nombres.\n\n$${{s}} \\quad ; \\quad {{eval:s+1}} \\quad ;'
              ' \\quad ? \\quad ; \\quad ? \\quad ; \\quad {{eval:s+4}}$$',
              [var('a', '1..9'), var('b', '0..9'), var('u', '7..8'),
               var('s', 'eval:100*a+10*b+u')],
              ['{{eval:s+2}}', '{{eval:s+3}}'],
              ['Dans la suite des nombres, on avance de $1$ à chaque fois.',
               '{{if:b==9|On passe à la centaine suivante.|On passe à la dizaine suivante.}}',
               '$${{s}} \\quad ; \\quad {{eval:s+1}} \\quad ; \\quad {{eval:s+2}} \\quad ; \\quad'
               ' {{eval:s+3}} \\quad ; \\quad {{eval:s+4}}$$'],
              ['100*a + 10*b + u <= 996']),
]

SPECS_INTERCALER = [
    spec('391 < 393 < 396', 0, {'a': '391', 'k': '5', 'b': '396'}, '393', 'correct'),
    spec('bornes : 391 < 395 < 396', 0, {'a': '391', 'k': '5', 'b': '396'}, '395', 'correct'),
    spec('Erreur : borne 396', 0, {'a': '391', 'k': '5', 'b': '396'}, '396', 'incorrect'),
    spec('Erreur : borne 391', 0, {'a': '391', 'k': '5', 'b': '396'}, '391', 'incorrect'),
    spec('passage : 387 ; 388 ; 389 ; 390 ; 391', 1,
         {'a': '3', 'b': '8', 'u': '7', 's': '387'}, ['389', '390'], 'correct'),
    spec('Erreur : 389 ; 3810', 1, {'a': '3', 'b': '8', 'u': '7', 's': '387'}, ['389', '3810'],
         'incorrect'),
    spec('centaine : 498 ; 499 ; 500 ; 501 ; 502', 1,
         {'a': '4', 'b': '9', 'u': '8', 's': '498'}, ['500', '501'], 'correct'),
    spec('Erreur : 4100', 1, {'a': '4', 'b': '9', 'u': '8', 's': '498'}, ['4100', '4101'],
         'incorrect'),
]

MODELES = {
    '01-unites-dizaines-centaines': modele(
        'Unités, dizaines et centaines', '1 c = 10 d = 100 u ; nombre de dizaines dans 347',
        'Décomposition', 13, UDC, SPECS_UDC),
    '02-unites-non-canoniques': modele(
        'Écrire un nombre donné en unités non canoniques',
        '63 d et 5 u ; 5 u, 5 c et 13 d ; 2 c, 27 d et 14 u', 'Décomposition', 14,
        NON_CANONIQUES, SPECS_NON_CANONIQUES),
    '03-suite-jusqu-a-1000': modele(
        'Le nombre qui suit, le nombre qui précède (jusqu\'à $1\\,000$)',
        'Avec passage de la dizaine, de la centaine, et 999 → 1 000', 'Ecriture', 10, SUITE,
        SPECS_SUITE),
    '04-ranger-cinq-nombres': modele(
        'Ranger cinq nombres', 'Nombres proches jusqu\'à 1 000 : 234, 243, 239, 300, 229',
        'Comparer', 6, RANGER, SPECS_RANGER, delay=40),
    '05-superieur-inferieur-compris': modele(
        'Supérieur à, inférieur à, compris entre',
        'Écrire un nombre qui respecte la phrase (toute réponse juste acceptée)', 'Comparer', 7,
        EXPRESSIONS, SPECS_EXPRESSIONS),
    '06-encadrer-dizaine-centaine': modele(
        'Encadrer un nombre (unité, dizaine, centaine)',
        '238 < 239 < 240 ; 230 < 239 < 240 ; 200 < 239 < 300', 'Encadrer', 7, ENCADRER,
        SPECS_ENCADRER),
    '07-intercaler-jusqu-a-1000': modele(
        'Intercaler un nombre (jusqu\'à $1\\,000$)', '391 < … < 396 ; suite à trous 387 ; 388 ; … ; … ; 391',
        'Encadrer', 8, INTERCALER, SPECS_INTERCALER),
}

for nom, m in MODELES.items():
    with open(f'{DOSSIER}/{nom}.json', 'w') as f:
        json.dump(m, f, ensure_ascii=False, indent='\t')
        f.write('\n')
print(len(MODELES), 'modèles écrits')
