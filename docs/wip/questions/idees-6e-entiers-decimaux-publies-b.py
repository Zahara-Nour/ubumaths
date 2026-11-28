"""Ajoute les variations validées (fiches F7 à F13) à 7 modèles publiés exportés de prod dans
scripts/questions/idees-6e-entiers-decimaux-publies/ (chantier idees-6e-entiers-decimaux).

Phase 0 validée par David le 2026-11-23 : F7 (8adac6d1), F8 (0ce253ea), F9 (a1b46489),
F10 (e75cb1a3), F11 (36991abb), F12 (2e982062), F13 (8fd459da). Les 6 autres modèles du dossier
sont écrits par publies-a.py. Les variations s'ajoutent À LA FIN (les réponses des élèves gardent
l'indice de leur variation) ; seuls `variations` et `testSpecs` changent (ni titre, ni niveaux, ni
options : migration-contenu ne change que variations, specs et description).

Le script repart du contenu de prod (variations et specs d'origine, comptées dans ORIGINE) : le
relancer réécrit les ajouts sans les doubler.

Pièges du lot :
- Aucun de ces modèles n'a de `shared` : chaque variation porte ses variables et ses conditions.
- Options : 8adac6d1, 0ce253ea et 8fd459da n'ont pas d'options (espaces dès 5 chiffres, BIPM) ;
  les quatre autres exigent les espaces dès 4 chiffres (`0{,}040\\,7` écrit à la main dans
  l'énoncé, réponses des specs groupées).
- 0ce253ea v5 (grand entier à placer) : le geste écrit la réponse sans espaces ; le modèle n'ayant
  pas d'options (seuil 5 chiffres), la spec dit ce que le juge en fait.
- Erreurs prévues : jamais sur un choix (a1b46489), un geste (0ce253ea) ni une case jugée par
  ses règles seules (2e982062, `rulesSuffice`). Une erreur prévue qui tombe sur la bonne réponse
  d'un tirage est ignorée (troncature quand le chiffre suivant est < 5, « pas lu 1 » quand le pas
  vaut 1…).
- e75cb1a3 juge les zéros inutiles : la variation à unité écarte les arrondis qui finissent par
  0 (`mod(R,10)!=0`), sinon « 2,40 m » serait une forme à améliorer.
- Décimaux tirés en entiers (millièmes, centimes) puis affichés par `;d`.

Usage : python3 docs/wip/questions/idees-6e-entiers-decimaux-publies-b.py scripts/questions/idees-6e-entiers-decimaux-publies
"""
import json
import os
import sys

DOSSIER = sys.argv[1]

PRIMAIRE = '\\textcolor{{{color:primary.0}}}'
SECOND = '\\textcolor{{{color:primary.1}}}'

# id court → (variations, specs) d'origine en prod (export du 2026-11-23)
ORIGINE = {'8adac6d1': (3, 12), '0ce253ea': (4, 10), 'a1b46489': (4, 11), 'e75cb1a3': (4, 9),
           '36991abb': (3, 6), '2e982062': (3, 10), '8fd459da': (1, 6)}


def spec(desc, vi, variables_, status, answers, message=None, violations=None):
    expected = {'status': status}
    if message is not None:
        expected['expectedErrorMessage'] = message
    if violations is not None:
        expected['constraintViolations'] = violations
    return {'description': desc, 'variationIndex': vi, 'variables': variables_,
            'expected': expected, 'answers': answers}


def var(nom, expression):
    return {'name': nom, 'expression': expression}


def erreur(answer, message, label):
    return {'answer': answer, 'message': message, 'label': label}


def case(attendue, erreurs=None, **autres):
    c = {'expectedAnswer': attendue}
    c.update(autres)
    if erreurs:
        c['expectedErrors'] = erreurs
    return c


def variation(statement, variables, blanks, steps, hint, conditions=None):
    v = {'statement': statement, 'variables': variables, 'conditions': conditions or []}
    if blanks is not None:
        v['blanks'] = blanks
    v['correction'] = {'steps': steps}
    v['hint'] = hint
    return v


def couleur(contenu, c=PRIMAIRE):
    return c + '{' + contenu + '}'


def droite(start, end, step, major, cle, valeur, labels=None):
    lignes = ['```line', 'start: ' + start, 'end: ' + end, 'step: ' + step, 'major: ' + major]
    if labels:
        lignes.append('labels: ' + labels)
    lignes.append(cle + ': ' + valeur)
    lignes.append('```')
    return '\n'.join(lignes)


def ajouter(court, variations, specs):
    chemin = os.path.join(DOSSIER, court + '.json')
    with open(chemin, encoding='utf-8') as f:
        m = json.load(f)
    nv, ns = ORIGINE[court]
    m['variations'] = m['variations'][:nv]
    m['testSpecs'] = m['testSpecs'][:ns]
    for s in specs:
        s['variationIndex'] += nv
    m['variations'] += variations
    m['testSpecs'] += specs
    with open(chemin, 'w', encoding='utf-8') as f:
        json.dump(m, f, ensure_ascii=False, indent='\t')
        f.write('\n')
    print(f'{court} : {nv} + {len(variations)} variations, {ns} + {len(specs)} specs')


# =============================================================================================
# 8adac6d1 — 6-108, repérer un nombre décimal. F7 : quatre variations.
# =============================================================================================

REPERER = 'Quel nombre repère le point $A$ ?\n\n'

# v3 — millièmes : pas 0,001, étiquettes au centième (L1, L2).
F7_MILLIEMES = variation(
    REPERER + droite('{{L1}}', '{{eval:(1000*a+10*B+15)/1000;d}}', '0.001', '10', 'points',
                     'A={{X}}', '{{L1}}, {{L2}}') + '\n\n$$A : ?$$',
    [var('a', '0..9'), var('B', '1..98'), var('k', '1..14'), var('L1', 'eval:(100*a+B)/100;d'),
     var('L2', 'eval:(100*a+B+1)/100;d'), var('X', 'eval:(1000*a+10*B+k)/1000;d')],
    [case('{{X}}', [
        erreur('{{eval:(100*a+B+k)/100;d}}',
               'Chaque petit intervalle vaut $0.001$ : entre ${{L1}}$ et ${{L2}}$, le centième est '
               'partagé en $10$.', 'Intervalle lu 0,01'),
        erreur('{{eval:(1000*a+10*B+k+1)/1000;d}}',
               'Tu as compté les graduations, celle de ${{L1}}$ comprise : compte plutôt les bonds '
               'd\'une graduation à la suivante.', 'Graduations comptées au lieu des intervalles'),
        erreur('{{eval:(10^(1+floor(k/10))*(100*a+B)+k)/10^(3+floor(k/10));d}}',
               'Tu as écrit le nombre de petits intervalles à la suite de ${{L1}}$ : ${{k}}$ '
               'millièmes, c\'est ${{k}} \\times 0.001 = {{eval:k/1000;d}}$.',
               'Nombre d\'intervalles écrit à la suite'),
    ])],
    [
        '**Ce que vaut un petit intervalle.** Entre ${{L1}}$ et ${{L2}}$, le centième est partagé '
        'en $10$ : chaque petit intervalle vaut $0.001$.',
        '${{X}}$, c\'est ${{k}}$ petit{{if:k>1|s|}} intervalle{{if:k>1|s|}} à partir de ${{L1}}$ : ${{L1}} + {{k}} \\times '
        '0.001 = ' + couleur('{{X}}') + '$.',
    ],
    'Commence par trouver ce que vaut un petit intervalle : entre ${{L1}}$ et ${{L2}}$, combien '
    'y a-t-il de bonds ?',
    ['k!=10'],
)

# v4 — subdivisions en q = 5 ou 8, pas principal p = 1 ou 2, origine o de 2 à 15.
F7_SUBDIVISIONS = variation(
    REPERER + droite('{{o}}', '{{eval:o+2*p}}', '{{S}}', '{{q}}', 'points', 'A={{X}}',
                     '{{o}}, {{eval:o+p}}') + '\n\n$$A : ?$$',
    [var('q', '5|8'), var('p', '1..2'), var('o', '2..15'), var('k', '1..{{eval:2*q-1}}'),
     var('S', 'eval:p/q;d'), var('X', 'eval:(o*q+k*p)/q;d')],
    [case('{{X}}', [
        erreur('{{eval:(10*o+k)/10;d}}',
               'Chaque petit intervalle ne vaut pas $0.1$ : entre ${{o}}$ et ${{eval:o+p}}$, il y a '
               '${{q}}$ petits intervalles.', 'Intervalle lu 0,1'),
        erreur('{{eval:(o*q+k)/q;d}}',
               'Entre ${{o}}$ et ${{eval:o+p}}$, l\'écart est de $2$, pas de $1$ : chaque petit '
               'intervalle vaut $2 \\div {{q}}$.', 'Écart entre les nombres écrits lu 1'),
        erreur('{{eval:(o*q+(k+1)*p)/q;d}}',
               'Tu as compté les graduations, celle de ${{o}}$ comprise : compte plutôt les bonds '
               'd\'une graduation à la suivante.', 'Graduations comptées au lieu des intervalles'),
    ])],
    [
        '**Ce que vaut un petit intervalle.** Entre ${{o}}$ et ${{eval:o+p}}$, l\'écart est de '
        '${{p}}$, partagé en ${{q}}$ petits intervalles : chacun vaut ${{p}} \\div {{q}} = {{S}}$.',
        '${{X}}$, c\'est ${{k}}$ petit{{if:k>1|s|}} intervalle{{if:k>1|s|}} à partir de ${{o}}$ : ${{o}} + {{k}} \\times '
        '{{S}} = ' + couleur('{{X}}') + '$.',
    ],
    'Calcule d\'abord ce que vaut un petit intervalle : l\'écart entre les deux nombres écrits, '
    'partagé en parts égales.',
    ['mod(k,q)!=0'],
)

# v5 — grand entier, pas de 10 000 (w = 4) ou de 100 000 (w = 5) ; jusqu'à 11 400 000 (6-103).
F7_GRAND = variation(
    REPERER + droite('{{L1}}', '{{eval:(10*m+15)*10^w}}', '{{eval:10^w}}', '10', 'points',
                     'A={{X}}', '{{L1}}, {{L2}}') + '\n\n$$A : ?$$',
    [var('w', '4..5'), var('m', '1..99'), var('k', '1..14'), var('L1', 'eval:m*10^(w+1)'),
     var('L2', 'eval:(m+1)*10^(w+1)'), var('X', 'eval:(10*m+k)*10^w')],
    [case('{{X}}', [
        erreur('{{eval:(100*m+k)*10^(w-1)}}',
               'Entre ${{L1}}$ et ${{L2}}$, il y a $10$ petits intervalles : chacun vaut '
               '${{eval:10^w}}$, pas ${{eval:10^(w-1)}}$.', 'Pas lu dix fois trop petit'),
        erreur('{{eval:(10*m+k+1)*10^w}}',
               'Tu as compté les graduations, celle de ${{L1}}$ comprise : compte plutôt les bonds '
               'd\'une graduation à la suivante.', 'Graduations comptées au lieu des intervalles'),
        erreur('{{eval:m*10^(w+1)+k}}',
               'Chaque petit intervalle vaut ${{eval:10^w}}$, pas $1$ : regarde l\'écart entre '
               '${{L1}}$ et ${{L2}}$.', 'Intervalle lu 1'),
    ])],
    [
        '**Ce que vaut un petit intervalle.** Entre ${{L1}}$ et ${{L2}}$, l\'écart est de '
        '${{eval:10^(w+1)}}$, partagé en $10$ : chaque petit intervalle vaut ${{eval:10^w}}$.',
        '${{X}}$, c\'est ${{k}}$ petit{{if:k>1|s|}} intervalle{{if:k>1|s|}} à partir de ${{L1}}$ : ${{L1}} + {{k}} \\times '
        '{{eval:10^w}} = ' + couleur('{{X}}') + '$.',
    ],
    'Calcule l\'écart entre les deux nombres écrits, puis partage-le entre les petits intervalles.',
    ['k!=10'],
)

# v6 — un point lu sous trois écritures (dixièmes) : décimal, N + r/10, F/10. Le modèle juge les
# fractions non simplifiées (« à améliorer ») : 24/10 serait jugé à simplifier en 12/5, qui n'est
# plus une fraction décimale. k impair et non multiple de 5 : r/10 et F/10 sont irréductibles.
FRACTION_DECIMALE = 'w:integer & (eq(10) | eq(100) | eq(1000))'
F7_TROIS = variation(
    'Le point $A$ repère un nombre. Écris ce nombre de trois façons.\n\n'
    + droite('{{n}}', '{{eval:(10*n+15)/10;d}}', '0.1', '10', 'points', 'A={{X}}')
    + '\n\nEn écriture décimale : $A = ?$\n\n'
    'Avec sa partie entière et une fraction décimale plus petite que $1$ : $A = ?$\n\n'
    'Avec une seule fraction décimale : $A = ?$',
    [var('n', '1..8'), var('k', '1..14'), var('N', 'eval:n+floor(k/10)'), var('r', 'eval:mod(k,10)'),
     var('X', 'eval:(10*n+k)/10;d'), var('F', 'eval:10*n+k')],
    [
        case('{{X}}', [
            erreur('{{eval:(100*n+k)/100;d}}',
                   'Chaque petit intervalle vaut $0.1$ : l\'unité est partagée en $10$, pas en '
                   '$100$.', 'Intervalle lu 0,01'),
            erreur('{{eval:(10*n+k+1)/10;d}}',
                   'Tu as compté les graduations, celle de ${{n}}$ comprise : compte plutôt les '
                   'bonds d\'une graduation à la suivante.',
                   'Graduations comptées au lieu des intervalles'),
            erreur('{{eval:n+k}}',
                   'Chaque petit intervalle vaut $0.1$, pas $1$ : il y en a $10$ entre deux '
                   'entiers.', 'Intervalle lu 1'),
        ]),
        case('{{N}}+\\frac{{{r}}}{10}', [
            erreur('{{N}}+\\frac{{{r}}}{100}',
                   'La partie décimale, c\'est ${{r}}$ dixième{{if:r>1|s|}}, pas ${{r}}$ '
                   'centième{{if:r>1|s|}}.',
                   'Dixièmes écrits en centièmes'),
            erreur('\\frac{{{r}}}{10}',
                   'Tu as oublié la partie entière : $A$ est plus grand que ${{N}}$.',
                   'Partie entière oubliée'),
            erreur('{{eval:(10*n+k+1)/10;d}}',
                   'Tu as compté les graduations, celle de ${{n}}$ comprise : compte plutôt les '
                   'bonds d\'une graduation à la suivante.',
                   'Graduations comptées au lieu des intervalles'),
        ], requiredForm={'pattern': '{{N}} + p:integer & gte(1) & lt(w) / ' + FRACTION_DECIMALE}),
        case('\\frac{{{F}}}{10}', [
            erreur('\\frac{{{F}}}{100}',
                   '${{X}}$, ce sont ${{F}}$ dixièmes : le dénominateur est $10$.',
                   'Dixièmes écrits en centièmes'),
            erreur('\\frac{{{eval:N+r}}}{10}',
                   'Tu as ajouté la partie entière au numérateur : ${{N}}$ unité{{if:N>1|s|}}, ce sont '
                   '${{eval:10*N}}$ dixièmes.', 'Partie entière ajoutée au numérateur'),
            erreur('\\frac{{{r}}}{10}',
                   'Tu as oublié la partie entière : $A$ est plus grand que ${{N}}$.',
                   'Partie entière oubliée'),
        ], requiredForm={'pattern': 'u:integer / ' + FRACTION_DECIMALE}),
    ],
    [
        '**Lire le point.** Chaque petit intervalle vaut $0.1$ : $A$ est à ${{k}}$ '
        'petit{{if:k>1|s|}} intervalle{{if:k>1|s|}} de ${{n}}$, donc $A = ' + couleur('{{X}}') + '$.',
        '**Partie entière et partie décimale.** ${{X}} = {{N}} + 0.{{r}}$ et $0.{{r}} = '
        '\\frac{{{r}}}{10}$ : $A = ' + couleur('{{N}} + \\frac{{{r}}}{10}') + '$.',
        '**Une seule fraction décimale.** ${{N}}$ unité{{if:N>1|s|}}, ce sont ${{eval:10*N}}$ '
        'dixièmes ; avec ${{r}}$ dixième{{if:r>1|s|}} de plus, ${{X}}$ fait ${{F}}$ dixièmes : $A = '
        + couleur('\\frac{{{F}}}{10}') + '$.',
    ],
    'Commence par l\'écriture décimale. Puis souviens-toi : $0.1 = \\frac{1}{10}$, et $10$ '
    'dixièmes font une unité.',
    ['mod(k,2)==1', 'mod(k,5)!=0'],
)

SPECS_8A = [
    # v3 — millièmes
    spec('F7 millièmes : 2,315', 0, {'a': '2', 'B': '31', 'k': '5'}, 'correct', ['2{,}315']),
    spec('F7 millièmes : point décimal', 0, {'a': '2', 'B': '31', 'k': '5'}, 'correct', ['2.315']),
    spec('F7 millièmes : intervalle lu 0,01', 0, {'a': '2', 'B': '31', 'k': '5'}, 'incorrect',
         ['2{,}36'],
         'Chaque petit intervalle vaut $0.001$ : entre $2.31$ et $2.32$, le centième est partagé '
         'en $10$.'),
    spec('F7 millièmes : graduations comptées', 0, {'a': '2', 'B': '31', 'k': '5'}, 'incorrect',
         ['2{,}316'],
         'Tu as compté les graduations, celle de $2.31$ comprise : compte plutôt les bonds d\'une '
         'graduation à la suivante.'),
    spec('F7 millièmes : après 2,32, 2,322', 0, {'a': '2', 'B': '31', 'k': '12'}, 'correct',
         ['2{,}322']),
    spec('F7 millièmes : 12 écrit à la suite', 0, {'a': '2', 'B': '31', 'k': '12'}, 'incorrect',
         ['2{,}3112'],
         'Tu as écrit le nombre de petits intervalles à la suite de $2.31$ : $12$ millièmes, '
         'c\'est $12 \\times 0.001 = 0.012$.'),
    # v4 — subdivisions
    spec('F7 cinquièmes : 7,6', 1, {'q': '5', 'p': '1', 'o': '7', 'k': '3'}, 'correct', ['7{,}6']),
    spec('F7 cinquièmes : intervalle lu 0,1', 1, {'q': '5', 'p': '1', 'o': '7', 'k': '3'},
         'incorrect', ['7{,}3'],
         'Chaque petit intervalle ne vaut pas $0.1$ : entre $7$ et $8$, il y a $5$ petits '
         'intervalles.'),
    spec('F7 cinquièmes : graduations comptées', 1, {'q': '5', 'p': '1', 'o': '7', 'k': '3'},
         'incorrect', ['7{,}8'],
         'Tu as compté les graduations, celle de $7$ comprise : compte plutôt les bonds d\'une '
         'graduation à la suivante.'),
    spec('F7 pas 2 en 8 : 10,75', 1, {'q': '8', 'p': '2', 'o': '10', 'k': '3'}, 'correct',
         ['10{,}75']),
    spec('F7 pas 2 en 8 : écart lu 1', 1, {'q': '8', 'p': '2', 'o': '10', 'k': '3'}, 'incorrect',
         ['10{,}375'],
         'Entre $10$ et $12$, l\'écart est de $2$, pas de $1$ : chaque petit intervalle vaut '
         '$2 \\div 8$.'),
    spec('F7 huitièmes : 3,625', 1, {'q': '8', 'p': '1', 'o': '3', 'k': '5'}, 'correct',
         ['3{,}625']),
    spec('F7 pas 2 en 5 : 14,8 après 14', 1, {'q': '5', 'p': '2', 'o': '12', 'k': '7'}, 'correct',
         ['14{,}8']),
    # v5 — grand entier
    spec('F7 grand : 3 730 000', 2, {'w': '4', 'm': '37', 'k': '3'}, 'correct',
         ['3\\,730\\,000']),
    spec('F7 grand : sans espace', 2, {'w': '4', 'm': '37', 'k': '3'}, 'unoptimal_form',
         ['3730000'], violations=['spaces']),
    spec('F7 grand : pas lu 1 000', 2, {'w': '4', 'm': '37', 'k': '3'}, 'incorrect',
         ['3\\,703\\,000'],
         'Entre $3700000$ et $3800000$, il y a $10$ petits intervalles : chacun vaut $10000$, pas '
         '$1000$.'),
    spec('F7 grand : graduations comptées', 2, {'w': '4', 'm': '37', 'k': '3'}, 'incorrect',
         ['3\\,740\\,000'],
         'Tu as compté les graduations, celle de $3700000$ comprise : compte plutôt les bonds '
         'd\'une graduation à la suivante.'),
    spec('F7 grand : intervalle lu 1', 2, {'w': '4', 'm': '37', 'k': '3'}, 'incorrect',
         ['3\\,700\\,003'],
         'Chaque petit intervalle vaut $10000$, pas $1$ : regarde l\'écart entre $3700000$ et '
         '$3800000$.'),
    spec('F7 grand : pas 100 000, 1 300 000', 2, {'w': '5', 'm': '1', 'k': '3'}, 'correct',
         ['1\\,300\\,000']),
    # v6 — trois écritures
    spec('F7 trois écritures : 2,3', 3, {'n': '2', 'k': '3'}, 'correct',
         ['2{,}3', '2+\\frac{3}{10}', '\\frac{23}{10}']),
    spec('F7 trois écritures : point décimal', 3, {'n': '2', 'k': '3'}, 'correct',
         ['2.3', '2+\\frac{3}{10}', '\\frac{23}{10}']),
    spec('F7 trois écritures : 230/100, à simplifier', 3, {'n': '2', 'k': '3'}, 'unoptimal_form',
         ['2{,}3', '2+\\frac{3}{10}', '\\frac{230}{100}'], violations=['reducedFractions']),
    spec('F7 trois écritures : 2 + 6/20 refusé (pas décimale)', 3, {'n': '2', 'k': '3'},
         'bad_form', ['2{,}3', '2+\\frac{6}{20}', '\\frac{23}{10}'],
         violations=['form']),
    spec('F7 trois écritures : 46/20 refusé (pas décimale)', 3, {'n': '2', 'k': '3'}, 'bad_form',
         ['2{,}3', '2+\\frac{3}{10}', '\\frac{46}{20}'], violations=['form']),
    spec('F7 trois écritures : intervalle lu 0,01', 3, {'n': '2', 'k': '3'}, 'incorrect',
         ['2{,}03', '2+\\frac{3}{10}', '\\frac{23}{10}'],
         'Chaque petit intervalle vaut $0.1$ : l\'unité est partagée en $10$, pas en $100$.'),
    spec('F7 trois écritures : intervalle lu 1', 3, {'n': '2', 'k': '3'}, 'incorrect',
         ['5', '2+\\frac{3}{10}', '\\frac{23}{10}'],
         'Chaque petit intervalle vaut $0.1$, pas $1$ : il y en a $10$ entre deux entiers.'),
    spec('F7 trois écritures : centièmes', 3, {'n': '2', 'k': '3'}, 'incorrect',
         ['2{,}3', '2+\\frac{3}{100}', '\\frac{23}{10}'],
         'La partie décimale, c\'est $3$ dixièmes, pas $3$ centièmes.'),
    spec('F7 trois écritures : partie entière oubliée', 3, {'n': '2', 'k': '3'}, 'incorrect',
         ['2{,}3', '\\frac{3}{10}', '\\frac{23}{10}'],
         'Tu as oublié la partie entière : $A$ est plus grand que $2$.'),
    spec('F7 trois écritures : fraction sur 100', 3, {'n': '2', 'k': '3'}, 'incorrect',
         ['2{,}3', '2+\\frac{3}{10}', '\\frac{23}{100}'],
         '$2.3$, ce sont $23$ dixièmes : le dénominateur est $10$.'),
    spec('F7 trois écritures : partie entière au numérateur', 3, {'n': '2', 'k': '3'}, 'incorrect',
         ['2{,}3', '2+\\frac{3}{10}', '\\frac{5}{10}'],
         'Tu as ajouté la partie entière au numérateur : $2$ unités, ce sont $20$ dixièmes.'),
    spec('F7 trois écritures : décimal dans la 3e case', 3, {'n': '2', 'k': '3'}, 'bad_form',
         ['2{,}3', '2+\\frac{3}{10}', '2{,}3'], violations=['form']),
    spec('F7 trois écritures : fraction plus grande que 1', 3, {'n': '2', 'k': '13'}, 'bad_form',
         ['3{,}3', '2+\\frac{13}{10}', '\\frac{33}{10}'], violations=['form']),
    spec('F7 trois écritures : après 3, 3,3', 3, {'n': '2', 'k': '13'}, 'correct',
         ['3{,}3', '3+\\frac{3}{10}', '\\frac{33}{10}']),
    spec('F7 trois écritures : 13 écrit à la suite', 3, {'n': '2', 'k': '13'}, 'incorrect',
         ['2{,}13', '3+\\frac{3}{10}', '\\frac{33}{10}'],
         'Chaque petit intervalle vaut $0.1$ : l\'unité est partagée en $10$, pas en $100$.'),
]


# =============================================================================================
# 0ce253ea — 6-107, placer un nombre décimal. F8 : millièmes, grand entier. Geste `placer:`.
# =============================================================================================

PLACER = 'Place le nombre ${{X}}$ sur la demi-droite graduée.\n\n'

F8_MILLIEMES = variation(
    PLACER + droite('{{L1}}', '{{eval:(1000*a+10*B+15)/1000;d}}', '0.001', '10', 'placer',
                    '{{X}}', '{{L1}}, {{L2}}'),
    [var('a', '0..9'), var('B', '1..98'), var('k', '1..14'), var('L1', 'eval:(100*a+B)/100;d'),
     var('L2', 'eval:(100*a+B+1)/100;d'), var('X', 'eval:(1000*a+10*B+k)/1000;d')],
    None,
    [
        '**Ce que vaut un petit intervalle.** Entre ${{L1}}$ et ${{L2}}$, le centième est partagé '
        'en $10$ : chaque petit intervalle vaut $0.001$.',
        '${{X}}$, c\'est ${{k}}$ petit{{if:k>1|s|}} intervalle{{if:k>1|s|}} à partir de ${{L1}}$ : ${{L1}} + {{k}} \\times '
        '0.001 = ' + couleur('{{X}}') + '$.',
    ],
    'Commence par trouver ce que vaut un petit intervalle : entre ${{L1}}$ et ${{L2}}$, combien '
    'y a-t-il de bonds ?',
    ['k!=10'],
)

F8_GRAND = variation(
    PLACER + droite('{{L1}}', '{{eval:(10*m+15)*10^w}}', '{{eval:10^w}}', '10', 'placer', '{{X}}',
                    '{{L1}}, {{L2}}'),
    [var('w', '4..5'), var('m', '1..99'), var('k', '1..14'), var('L1', 'eval:m*10^(w+1)'),
     var('L2', 'eval:(m+1)*10^(w+1)'), var('X', 'eval:(10*m+k)*10^w')],
    None,
    [
        '**Ce que vaut un petit intervalle.** Entre ${{L1}}$ et ${{L2}}$, l\'écart est de '
        '${{eval:10^(w+1)}}$, partagé en $10$ : chaque petit intervalle vaut ${{eval:10^w}}$.',
        '${{X}}$, c\'est ${{k}}$ petit{{if:k>1|s|}} intervalle{{if:k>1|s|}} à partir de ${{L1}}$ : ${{L1}} + {{k}} \\times '
        '{{eval:10^w}} = ' + couleur('{{X}}') + '$.',
    ],
    'Calcule l\'écart entre les deux nombres écrits, puis partage-le entre les petits intervalles.',
    ['k!=10'],
)

SPECS_0C = [
    spec('F8 millièmes : 2,315 placé', 0, {'a': '2', 'B': '31', 'k': '5'}, 'correct', ['2.315']),
    spec('F8 millièmes : 2,36 (intervalle lu 0,01)', 0, {'a': '2', 'B': '31', 'k': '5'},
         'incorrect', ['2.316']),
    spec('F8 millièmes : 2,322 placé (après 2,32)', 0, {'a': '2', 'B': '31', 'k': '12'}, 'correct',
         ['2.322']),
    spec('F8 millièmes : 2,312 (compté depuis 2,31 au lieu de 2,32)', 0,
         {'a': '2', 'B': '31', 'k': '12'}, 'incorrect', ['2.312']),
    spec('F8 grand : 3 730 000 placé', 1, {'w': '4', 'm': '37', 'k': '3'}, 'correct',
         ['3730000']),
    spec('F8 grand : 3 740 000 (graduations comptées)', 1, {'w': '4', 'm': '37', 'k': '3'},
         'incorrect', ['3740000']),
    spec('F8 grand : pas 100 000, 1 300 000 placé', 1, {'w': '5', 'm': '1', 'k': '3'}, 'correct',
         ['1300000']),
]


# =============================================================================================
# a1b46489 — 6-109, comparer deux décimaux. F9 : deux variations, case choix <, =, >.
# =============================================================================================

CHOIX_SIGNES = '\n\n```choix\nmelanger: non\n- $<$\n- $=$\n- $>$\n```'
REGLE_COMPARER = ('**Comparer deux décimaux.** On compare d\'abord les parties entières ; si elles '
                  'sont égales, on compare les chiffres des dixièmes, puis des centièmes, et '
                  'ainsi de suite.')
SIGNE = couleur('{{if:R==2|>|<}}')

# v4 — parties entières différentes, plus de décimales du côté du plus petit.
F9_GRAND = '{{A}}.{{B}}'
F9_PETIT = '{{eval:A-t}}.{{d1}}{{d2}}{{d3}}{{if:w==4|\\,{{d4}}|}}'
F9_G = '{{if:s==0|' + F9_GRAND + '|' + F9_PETIT + '}}'
F9_D = '{{if:s==0|' + F9_PETIT + '|' + F9_GRAND + '}}'
F9_ENTIERS = variation(
    'Complète avec le signe qui convient.\n\n$$' + F9_G + ' \\ldots ' + F9_D + '$$' + CHOIX_SIGNES,
    [var('s', '0..1'), var('A', '3..30'), var('t', '1..3'), var('B', '11..99'), var('w', '3..4'),
     var('d1', '2..9'), var('d2', '0..9'), var('d3', '1..9'), var('d4', '1..9'),
     var('R', 'eval:2*(1-s)')],
    [case('{{R}}')],
    [
        REGLE_COMPARER,
        'Les parties entières sont différentes : ${{A}} > {{eval:A-t}}$. On n\'a pas besoin des '
        'chiffres après la virgule : avoir plus de décimales ne rend pas un nombre plus grand.',
        '$$' + F9_G + ' ' + SIGNE + ' ' + F9_D + '$$',
    ],
    'Commence par comparer les parties entières, avant de regarder les chiffres après la virgule.',
    ['mod(B,10)!=0', 'd1>floor(B/10)'],
)

# v5 — zéros intercalés : z = 0, 0,0ab contre 0,0a0b ; z = 1, 0,a0b contre 0,b0a.
F9_X = '0.0{{a}}{{b}}'
F9_Y = '0.0{{a}}0\\,{{b}}'
F9_ZG = '{{if:z==0|{{if:s==0|' + F9_X + '|' + F9_Y + '}}|0.{{a}}0{{b}}}}'
F9_ZD = '{{if:z==0|{{if:s==0|' + F9_Y + '|' + F9_X + '}}|0.{{b}}0{{a}}}}'
F9_ZEROS = variation(
    'Complète avec le signe qui convient.\n\n$$' + F9_ZG + ' \\ldots ' + F9_ZD + '$$' + CHOIX_SIGNES,
    [var('z', '0..1'), var('s', '0..1'), var('a', '1..9'), var('b', '1..9'),
     var('R', 'eval:(1-z)*2*(1-s)+z*2*min(max(a-b,0),1)')],
    [case('{{R}}')],
    [
        REGLE_COMPARER,
        '{{if:z==0|Les deux nombres ont le même chiffre des dixièmes ($0$) et le même chiffre des '
        'centièmes (${{a}}$). Au rang des millièmes : ${{b}}$ contre $0$, donc $' + F9_X + ' > '
        + F9_Y + '$.|Les parties entières sont égales ($0$). Au rang des dixièmes : ${{a}}$ contre '
        '${{b}}$. Le zéro placé ensuite ne change rien à cette comparaison.}}',
        '$$' + F9_ZG + ' ' + SIGNE + ' ' + F9_ZD + '$$',
    ],
    'Compare les chiffres rang par rang, en partant des dixièmes : un zéro placé entre deux '
    'chiffres compte.',
    ['a!=b'],
)

SPECS_A1 = [
    spec('F9 entiers : 12,45 > 11,987 6', 0,
         {'s': '0', 'A': '12', 't': '1', 'B': '45', 'w': '4', 'd1': '9', 'd2': '8', 'd3': '7',
          'd4': '6'}, 'correct', ['2']),
    spec('F9 entiers : plus de décimales lu plus grand', 0,
         {'s': '0', 'A': '12', 't': '1', 'B': '45', 'w': '4', 'd1': '9', 'd2': '8', 'd3': '7',
          'd4': '6'}, 'incorrect', ['0']),
    spec('F9 entiers : 9,876 < 11,35', 0,
         {'s': '1', 'A': '11', 't': '2', 'B': '35', 'w': '3', 'd1': '8', 'd2': '7', 'd3': '6',
          'd4': '1'}, 'correct', ['0']),
    spec('F9 entiers : 9,876 > 11,35', 0,
         {'s': '1', 'A': '11', 't': '2', 'B': '35', 'w': '3', 'd1': '8', 'd2': '7', 'd3': '6',
          'd4': '1'}, 'incorrect', ['2']),
    spec('F9 zéros : 0,047 > 0,040 7', 1, {'z': '0', 's': '0', 'a': '4', 'b': '7'}, 'correct',
         ['2']),
    spec('F9 zéros : 0,047 < 0,040 7 (plus de chiffres)', 1,
         {'z': '0', 's': '0', 'a': '4', 'b': '7'}, 'incorrect', ['0']),
    spec('F9 zéros : 0,040 7 < 0,047', 1, {'z': '0', 's': '1', 'a': '4', 'b': '7'}, 'correct',
         ['0']),
    spec('F9 zéros : 0,305 < 0,503', 1, {'z': '1', 's': '0', 'a': '3', 'b': '5'}, 'correct',
         ['0']),
    spec('F9 zéros : 0,305 = 0,503 (mêmes chiffres)', 1, {'z': '1', 's': '0', 'a': '3', 'b': '5'},
         'incorrect', ['1']),
    spec('F9 zéros : 0,806 > 0,608', 1, {'z': '1', 's': '1', 'a': '8', 'b': '6'}, 'correct',
         ['2']),
]


# =============================================================================================
# e75cb1a3 — 6-111, arrondir. F10 : arrondir une grandeur, case avec unité.
# g = 0 : longueur en m au cm ; g = 1 : masse en kg à la centaine de grammes ; g = 2 : prix à
# l'euro. x = M / 10^dec (dec = 3, 3, 2) ; arrondi au rang 10^-rg (rg = 2, 1, 0).
# =============================================================================================

UNITE = '{{if:g==0|m|{{if:g==1|kg|€}}}}'
F10_RANG = '{{if:g==0|au centimètre|{{if:g==1|à la centaine de grammes|à l\'euro}}}}'
F10_GROS = '{{if:g==0|au dixième de mètre|{{if:g==1|au kilogramme|à la dizaine d\'euros}}}}'
F10_CHIFFRE = '{{if:g==0|des millièmes|{{if:g==1|des centièmes|des dixièmes}}}}'
F10_RANG_CHIFFRE = '{{if:g==0|des centièmes|{{if:g==1|des dixièmes|des unités}}}}'

F10 = variation(
    '{{if:g==0|Une planche mesure ${{x}}~\\unit{m}$. Donne sa longueur arrondie au centimètre.'
    '|{{if:g==1|Un colis pèse ${{x}}~\\unit{kg}$. Donne sa masse arrondie à la centaine de '
    'grammes.|Un livre coûte ${{x}}~\\unit{€}$. Donne son prix arrondi à l\'euro.}}}}\n\n'
    '$${{x}}~\\unit{' + UNITE + '} \\approx ?$$',
    [var('g', '0..2'), var('M', '1001..9999'), var('dec', 'eval:3-floor(g/2)'),
     var('rg', 'eval:2-g'), var('x', 'eval:M/10^dec;d'), var('R', 'eval:round(M/10^(dec-rg))'),
     var('v', 'eval:R/10^rg;d'), var('H', 'eval:mod(floor(M/10^(dec-rg-1)),10)'),
    ],
    [case('{{v}}\\unit{' + UNITE + '}', [
        erreur('{{eval:floor(M/10^(dec-rg))/10^rg;d}}\\unit{' + UNITE + '}',
               'Le chiffre ' + F10_CHIFFRE + ' est ${{H}}$ : $5$ ou plus, on arrondit au-dessus.',
               'Troncature'),
        erreur('{{eval:round(M/10^(dec-rg+1))/10^(rg-1);d}}\\unit{' + UNITE + '}',
               'Tu as arrondi ' + F10_GROS + ' : on demande l\'arrondi ' + F10_RANG + '.',
               'Arrondi au rang au-dessus'),
        erreur('{{eval:round(M/10^(dec-rg-1))/10^(rg+1);d}}\\unit{' + UNITE + '}',
               'Ta réponse est trop précise : on demande l\'arrondi ' + F10_RANG + '.',
               'Arrondi trop précis'),
    ], unit={'expected': True})],
    [
        '**Arrondir une grandeur.** {{if:g==0|$1~\\unit{cm} = 0.01~\\unit{m}$ : arrondir au '
        'centimètre, c\'est arrondir au centième de mètre.|{{if:g==1|$100~\\unit{g} = '
        '0.1~\\unit{kg}$ : arrondir à la centaine de grammes, c\'est arrondir au dixième de '
        'kilogramme.|Arrondir à l\'euro, c\'est arrondir à l\'unité.}}}}',
        'Le chiffre qui suit celui ' + F10_RANG_CHIFFRE + ' est le chiffre ' + F10_CHIFFRE
        + ' ; il vaut $' + couleur('{{H}}', SECOND) + '$ : {{if:H>=5|$5$ ou plus, on '
        'arrondit au-dessus|moins de $5$, on garde le chiffre}}.',
        '$${{x}}~\\unit{' + UNITE + '} \\approx ' + couleur('{{v}}~\\unit{' + UNITE + '}')
        + '$$',
    ],
    'Repère le rang demandé ({{if:g==0|un centimètre, c\'est un centième de mètre|{{if:g==1|cent '
    'grammes, c\'est un dixième de kilogramme|l\'euro, c\'est l\'unité}}}}), puis regarde le '
    'chiffre juste après.',
    ['mod(M,10)!=0', 'mod(R,10)!=0', 'mod(M,10^(dec-rg))!=0'],
)

SPECS_E7 = [
    spec('F10 longueur : 2,437 m → 2,44 m', 0, {'g': '0', 'M': '2437'}, 'correct',
         ['2{,}44\\,\\mathrm{m}']),
    spec('F10 longueur : en centimètres', 0, {'g': '0', 'M': '2437'}, 'correct',
         ['244\\,\\mathrm{cm}']),
    spec('F10 longueur : troncature', 0, {'g': '0', 'M': '2437'}, 'incorrect',
         ['2{,}43\\,\\mathrm{m}'],
         'Le chiffre des millièmes est $7$ : $5$ ou plus, on arrondit au-dessus.'),
    spec('F10 longueur : arrondi au dixième', 0, {'g': '0', 'M': '2437'}, 'incorrect',
         ['2{,}4\\,\\mathrm{m}'],
         'Tu as arrondi au dixième de mètre : on demande l\'arrondi au centimètre.'),
    spec('F10 longueur : recopiée', 0, {'g': '0', 'M': '2437'}, 'incorrect',
         ['2{,}437\\,\\mathrm{m}'],
         'Ta réponse est trop précise : on demande l\'arrondi au centimètre.'),
    spec('F10 masse : 3,462 kg → 3,5 kg', 0, {'g': '1', 'M': '3462'}, 'correct',
         ['3{,}5\\,\\mathrm{kg}']),
    spec('F10 masse : en grammes', 0, {'g': '1', 'M': '3462'}, 'correct',
         ['3\\,500\\,\\mathrm{g}']),
    spec('F10 masse : troncature', 0, {'g': '1', 'M': '3462'}, 'incorrect',
         ['3{,}4\\,\\mathrm{kg}'],
         'Le chiffre des centièmes est $6$ : $5$ ou plus, on arrondit au-dessus.'),
    spec('F10 masse : arrondi au kilogramme', 0, {'g': '1', 'M': '3462'}, 'incorrect',
         ['3\\,\\mathrm{kg}'],
         'Tu as arrondi au kilogramme : on demande l\'arrondi à la centaine de grammes.'),
    spec('F10 masse : trop précis', 0, {'g': '1', 'M': '3462'}, 'incorrect',
         ['3{,}46\\,\\mathrm{kg}'],
         'Ta réponse est trop précise : on demande l\'arrondi à la centaine de grammes.'),
    spec('F10 prix : 24,68 € → 25 €', 0, {'g': '2', 'M': '2468'}, 'correct', ['25\\,\\text{€}']),
    spec('F10 prix : troncature', 0, {'g': '2', 'M': '2468'}, 'incorrect', ['24\\,\\text{€}'],
         'Le chiffre des dixièmes est $6$ : $5$ ou plus, on arrondit au-dessus.'),
    spec('F10 prix : arrondi à la dizaine', 0, {'g': '2', 'M': '2468'}, 'incorrect', ['20\\,\\text{€}'],
         'Tu as arrondi à la dizaine d\'euros : on demande l\'arrondi à l\'euro.'),
    spec('F10 prix : trop précis', 0, {'g': '2', 'M': '2468'}, 'incorrect', ['24{,}7\\,\\text{€}'],
         'Ta réponse est trop précise : on demande l\'arrondi à l\'euro.'),
    spec('F10 longueur : 5,123 m → 5,12 m', 0, {'g': '0', 'M': '5123'}, 'correct',
         ['5{,}12\\,\\mathrm{m}']),
]


# =============================================================================================
# 36991abb — 6-112, arrondir un quotient. F11 : l'affichage d'une calculatrice, a ÷ d avec
# d = 7, 11 ou 13, arrondi à l'unité, au dixième ou au centième (k = 0, 1, 2).
# =============================================================================================

F11_RANG = '{{if:k==0|à l\'unité|{{if:k==1|au dixième|au centième}}}}'
F11_SUIVANT = '{{if:k==0|des dixièmes|{{if:k==1|des centièmes|des millièmes}}}}'
F11_FIN = '{{if:k==0|au dixième|{{if:k==1|au centième|au millième}}}}'
F11_AFFICHE = ('{{I}}.{{c1}}{{c2}}{{c3}}\\,{{c4}}{{c5}}{{c6}}\\,{{c7}}\\ldots')

F11 = variation(
    'La calculatrice affiche :\n\n$${{a}} \\div {{d}} = ' + F11_AFFICHE + '$$\n\n'
    'Donne la valeur arrondie ' + F11_RANG + ' de ${{a}} \\div {{d}}$.\n\n'
    '$${{a}} \\div {{d}} \\approx ?$$',
    [var('d', '7|11|13'), var('a', '10..99'), var('k', '0..2'), var('I', 'eval:floor(a/d)')]
    + [var('c' + str(j), 'eval:mod(floor(a*10^' + str(j) + '/d),10)') for j in range(1, 8)]
    + [var('v', 'eval:round(a*10^k/d)/10^k;d'), var('H', 'eval:mod(floor(a*10^(k+1)/d),10)')],
    [case('{{v}}', [
        erreur('{{eval:floor(a*10^k/d)/10^k;d}}',
               'Le chiffre ' + F11_SUIVANT + ' est ${{H}}$ : $5$ ou plus, on arrondit au-dessus.',
               'Troncature'),
        erreur('{{eval:round(a*10^(k+1)/d)/10^(k+1);d}}',
               'Tu as arrondi ' + F11_FIN + ' : on demande l\'arrondi ' + F11_RANG + '.',
               'Arrondi un rang trop loin'),
        erreur('{{eval:round(a*10^(max(k-1,0))/d)/10^(max(k-1,0));d}}',
               'Tu as arrondi {{if:k==2|au dixième|à l\'unité}} : on demande l\'arrondi '
               + F11_RANG + '.', 'Arrondi un rang trop tôt'),
    ])],
    [
        'La division ne s\'arrête pas : on regarde le chiffre juste après le rang demandé, celui '
        + F11_SUIVANT + '.',
        'Le chiffre ' + F11_SUIVANT + ' est $' + couleur('{{H}}', SECOND) + '$ : {{if:H>=5|$5$ '
        'ou plus, on arrondit au-dessus|moins de $5$, on garde le chiffre}}.',
        '$${{a}} \\div {{d}} \\approx ' + couleur('{{solution}}') + '$$',
    ],
    'Repère le chiffre juste après le rang demandé : c\'est lui qui décide si on arrondit '
    'au-dessus ou non.',
    ['mod(a,d)!=0', 'mod(round(a*10^k/d),10)!=0'],
)

SPECS_36 = [
    spec('F11 : 20 ÷ 7 au dixième, 2,9', 0, {'d': '7', 'a': '20', 'k': '1'}, 'correct', ['2{,}9']),
    spec('F11 : point décimal', 0, {'d': '7', 'a': '20', 'k': '1'}, 'correct', ['2.9']),
    spec('F11 : troncature (2,8)', 0, {'d': '7', 'a': '20', 'k': '1'}, 'incorrect', ['2{,}8'],
         'Le chiffre des centièmes est $5$ : $5$ ou plus, on arrondit au-dessus.'),
    spec('F11 : arrondi au centième (2,86)', 0, {'d': '7', 'a': '20', 'k': '1'}, 'incorrect',
         ['2{,}86'], 'Tu as arrondi au centième : on demande l\'arrondi au dixième.'),
    spec('F11 : arrondi à l\'unité (3)', 0, {'d': '7', 'a': '20', 'k': '1'}, 'incorrect', ['3'],
         'Tu as arrondi à l\'unité : on demande l\'arrondi au dixième.'),
    spec('F11 : 40 ÷ 13 au centième, 3,08', 0, {'d': '13', 'a': '40', 'k': '2'}, 'correct',
         ['3{,}08']),
    spec('F11 : 40 ÷ 13, troncature (3,07)', 0, {'d': '13', 'a': '40', 'k': '2'}, 'incorrect',
         ['3{,}07'], 'Le chiffre des millièmes est $6$ : $5$ ou plus, on arrondit au-dessus.'),
    spec('F11 : 40 ÷ 13, au dixième (3,1)', 0, {'d': '13', 'a': '40', 'k': '2'}, 'incorrect',
         ['3{,}1'], 'Tu as arrondi au dixième : on demande l\'arrondi au centième.'),
    spec('F11 : 22 ÷ 7 à l\'unité, 3', 0, {'d': '7', 'a': '22', 'k': '0'}, 'correct', ['3']),
    spec('F11 : 22 ÷ 7 à l\'unité, au dixième (3,1)', 0, {'d': '7', 'a': '22', 'k': '0'},
         'incorrect', ['3{,}1'], 'Tu as arrondi au dixième : on demande l\'arrondi à l\'unité.'),
    spec('F11 : 50 ÷ 11 à l\'unité, 5', 0, {'d': '11', 'a': '50', 'k': '0'}, 'correct', ['5']),
]


# =============================================================================================
# 2e982062 — 6-202, intercaler. F12 : trois cas tirés (t), même règle « dans l'intervalle »
# que les variations publiées. Bornes en millièmes : LO, HI.
#   t = 0 : a,99 < … < a + 1 ; t = 1 : a < … < a,1 ; t = 2 : a,bcd < … < a,(b + 1).
# =============================================================================================

T0 = '(1-min(t,1))'
T1 = '(1-min(abs(t-1),1))'
T2 = 'min(max(t-1,0),1)'
F12 = variation(
    'Écris un nombre décimal compris entre ${{lo}}$ et ${{hi}}$.\n\n$${{lo}} < ? < {{hi}}$$',
    [var('t', '0..2'), var('a', '0..20'), var('b', '0..8'), var('c', '0..9'), var('d', '1..9'),
     var('LO', 'eval:1000*a+' + T0 + '*990+' + T2 + '*(100*b+10*c+d)'),
     var('HI', 'eval:1000*a+' + T0 + '*1000+' + T1 + '*100+' + T2 + '*100*(b+1)'),
     var('lo', 'eval:LO/1000;d'), var('hi', 'eval:HI/1000;d'),
     var('EX', 'eval:(LO+' + T0 + '*5+' + T1 + '*50+' + T2 + '*(HI-LO-1))/1000;d')],
    [{'rulesSuffice': True, 'expectedAnswer': '{{EX}}',
      'validationRules': [{'max': '{{hi}}', 'min': '{{lo}}', 'type': 'range',
                           'inclusive': False}]}],
    [
        '**Intercaler.** On écrit les deux nombres avec autant de chiffres après la virgule, puis '
        'on en ajoute un : il apparaît de la place entre eux.',
        '{{if:t==0|${{lo}} = {{a}}.990$ et ${{hi}} = {{hi}}.000$ : tout nombre de millièmes entre '
        '$990$ et $1000$ convient après ${{a}}$, par exemple $' + couleur('{{solution}}')
        + '$ (mais aussi ${{a}}.991$, ${{a}}.999$…).|{{if:t==1|${{lo}} = {{a}}.00$ et ${{hi}} = '
        '{{a}}.10$ : tout nombre de centièmes entre $0$ et $10$ convient, par exemple $'
        + couleur('{{solution}}') + '$ (mais aussi ${{a}}.01$, ${{a}}.09$…).|${{hi}} = '
        '{{a}}.{{eval:b+1}}00$ : il suffit d\'un nombre de millièmes entre ${{b}}{{c}}{{d}}$ et '
        '${{eval:b+1}}00$, par exemple $' + couleur('{{solution}}') + '$ (mais aussi '
        '${{eval:(HI-10)/1000;d}}$…).}}}}',
    ],
    'Écris les deux nombres avec le même nombre de chiffres après la virgule, puis ajoute un '
    'chiffre : de la place apparaît entre eux.',
    ['10*c+d<89'],
)

SPECS_2E = [
    spec('F12 a,99 : 3,995', 0, {'t': '0', 'a': '3', 'b': '0', 'c': '0', 'd': '1'}, 'correct',
         ['3{,}995']),
    spec('F12 a,99 : 3,991', 0, {'t': '0', 'a': '3', 'b': '0', 'c': '0', 'd': '1'}, 'correct',
         ['3{,}991']),
    spec('F12 a,99 : 3,100 (plus petit que 3,99)', 0,
         {'t': '0', 'a': '3', 'b': '0', 'c': '0', 'd': '1'}, 'incorrect', ['3{,}100']),
    spec('F12 a,99 : la borne 4', 0, {'t': '0', 'a': '3', 'b': '0', 'c': '0', 'd': '1'},
         'incorrect', ['4']),
    spec('F12 a,1 : 5,05', 0, {'t': '1', 'a': '5', 'b': '0', 'c': '0', 'd': '1'}, 'correct',
         ['5{,}05']),
    spec('F12 a,1 : 5,001', 0, {'t': '1', 'a': '5', 'b': '0', 'c': '0', 'd': '1'}, 'correct',
         ['5{,}001']),
    spec('F12 a,1 : 5,11 (plus grand que 5,1)', 0,
         {'t': '1', 'a': '5', 'b': '0', 'c': '0', 'd': '1'}, 'incorrect', ['5{,}11']),
    spec('F12 a,bcd : 3,46 entre 3,457 et 3,5', 0,
         {'t': '2', 'a': '3', 'b': '4', 'c': '5', 'd': '7'}, 'correct', ['3{,}46']),
    spec('F12 a,bcd : 3,499', 0, {'t': '2', 'a': '3', 'b': '4', 'c': '5', 'd': '7'}, 'correct',
         ['3{,}499']),
    spec('F12 a,bcd : 3,457 1 (espace)', 0, {'t': '2', 'a': '3', 'b': '4', 'c': '5', 'd': '7'},
         'correct', ['3{,}457\\,1']),
    spec('F12 a,bcd : 3,456 (plus petit)', 0, {'t': '2', 'a': '3', 'b': '4', 'c': '5', 'd': '7'},
         'incorrect', ['3{,}456']),
    spec('F12 a,bcd : 3,6 (plus grand)', 0, {'t': '2', 'a': '3', 'b': '4', 'c': '5', 'd': '7'},
         'incorrect', ['3{,}6']),
]


# =============================================================================================
# 8fd459da — 6-105, définition d'un pourcentage. F13 : n/d = ?/100 = ? %, deux cases.
# =============================================================================================

F13 = variation(
    'Complète.\n\n$$\\frac{{{n}}}{{{d}}} = \\frac{?}{100} = ?$$',
    [var('d', '2|4|5|10|20|25|50'), var('n', '1..{{eval:d-1}}'), var('N', 'eval:n*100/d')],
    [
        case('{{N}}', [
            erreur('{{eval:n+100-d}}',
                   'Tu as ajouté ${{eval:100-d}}$ au numérateur et au dénominateur : ça change la '
                   'fraction. Il faut multiplier les deux par le même nombre.',
                   'Même nombre ajouté en haut et en bas'),
            erreur('{{eval:100/d}}',
                   'Tu as écrit le nombre par lequel on multiplie ${{d}}$ : multiplie aussi le '
                   'numérateur ${{n}}$ par ce nombre.', 'Facteur écrit au lieu du numérateur'),
            erreur('{{eval:n*d}}',
                   'Tu as multiplié ${{n}}$ par ${{d}}$ : il faut multiplier ${{n}}$ par le nombre '
                   'qui fait passer de ${{d}}$ à $100$.', 'Numérateur multiplié par le dénominateur'),
        ]),
        case('{{N}}%', [
            erreur('{{n}}%',
                   'Tu as recopié le numérateur : ${{n}}\\,\\%$, c\'est $\\frac{{{n}}}{100}$, pas '
                   '$\\frac{{{n}}}{{{d}}}$.', 'Numérateur recopié'),
            erreur('{{eval:n+100-d}}%',
                   'Tu as ajouté ${{eval:100-d}}$ au numérateur et au dénominateur : ça change la '
                   'fraction. Il faut multiplier les deux par le même nombre.',
                   'Même nombre ajouté en haut et en bas'),
            erreur('{{eval:n/d;d}}%',
                   '$\\frac{{{n}}}{{{d}}} = {{eval:n/d;d}}$, mais ${{eval:n/d;d}}\\,\\%$ est cent '
                   'fois plus petit : un pourcentage, c\'est un nombre de centièmes.',
                   'Écriture décimale suivie de %'),
        ]),
    ],
    [
        '**Fraction de dénominateur $100$.** $100 = {{d}} \\times {{eval:100/d}}$ : on multiplie '
        'le numérateur et le dénominateur par ${{eval:100/d}}$.',
        '$$\\frac{{{n}}}{{{d}}} = \\frac{{{n}} \\times {{eval:100/d}}}{{{d}} \\times '
        '{{eval:100/d}}} = \\frac{' + couleur('{{N}}') + '}{100}$$',
        '**Pourcentage.** $\\frac{p}{100} = p\\,\\%$, donc $\\frac{{{N}}}{100} = '
        + couleur('{{N}}\\,\\%') + '$.',
    ],
    'Par quel nombre faut-il multiplier ${{d}}$ pour obtenir $100$ ? Fais de même avec le '
    'numérateur.',
    # n/d irréductible : n impair si d est pair, n non multiple de 5 si d l'est
    ['mod(n,2)+mod(d,2)>=1', 'min(mod(n,5),1)+min(mod(d,5),1)>=1'],
)

SPECS_8F = [
    spec('F13 : 3/20 = 15/100 = 15 %', 0, {'d': '20', 'n': '3'}, 'correct', ['15', '15\\%']),
    spec('F13 : 3/20, même nombre ajouté', 0, {'d': '20', 'n': '3'}, 'incorrect', ['83', '15\\%'],
         'Tu as ajouté $80$ au numérateur et au dénominateur : ça change la fraction. Il faut '
         'multiplier les deux par le même nombre.'),
    spec('F13 : 3/20, facteur écrit', 0, {'d': '20', 'n': '3'}, 'incorrect', ['5', '15\\%'],
         'Tu as écrit le nombre par lequel on multiplie $20$ : multiplie aussi le numérateur $3$ '
         'par ce nombre.'),
    spec('F13 : 3/20, numérateur × dénominateur', 0, {'d': '20', 'n': '3'}, 'incorrect',
         ['60', '15\\%'],
         'Tu as multiplié $3$ par $20$ : il faut multiplier $3$ par le nombre qui fait passer de '
         '$20$ à $100$.'),
    spec('F13 : 3/20, numérateur recopié', 0, {'d': '20', 'n': '3'}, 'incorrect', ['15', '3\\%'],
         'Tu as recopié le numérateur : $3\\,\\%$, c\'est $\\frac{3}{100}$, pas $\\frac{3}{20}$.'),
    spec('F13 : 3/20, 0,15 %', 0, {'d': '20', 'n': '3'}, 'incorrect', ['15', '0{,}15\\%'],
         '$\\frac{3}{20} = 0.15$, mais $0.15\\,\\%$ est cent fois plus petit : un pourcentage, '
         'c\'est un nombre de centièmes.'),
    spec('F13 : 3/20, symbole % oublié', 0, {'d': '20', 'n': '3'}, 'incorrect', ['15', '15']),
    spec('F13 : 3/20, décimal 0,15 perfectible', 0, {'d': '20', 'n': '3'}, 'unoptimal_form',
         ['15', '0{,}15'], violations=['percent']),
    spec('F13 : 1/2 = 50 %', 0, {'d': '2', 'n': '1'}, 'correct', ['50', '50\\%']),
    spec('F13 : 49/50 = 98 %', 0, {'d': '50', 'n': '49'}, 'correct', ['98', '98\\%']),
]


ajouter('8adac6d1', [F7_MILLIEMES, F7_SUBDIVISIONS, F7_GRAND, F7_TROIS], SPECS_8A)
ajouter('0ce253ea', [F8_MILLIEMES, F8_GRAND], SPECS_0C)
ajouter('a1b46489', [F9_ENTIERS, F9_ZEROS], SPECS_A1)
ajouter('e75cb1a3', [F10], SPECS_E7)
ajouter('36991abb', [F11], SPECS_36)
ajouter('2e982062', [F12], SPECS_2E)
ajouter('8fd459da', [F13], SPECS_8F)
