"""Ajoute les variations validées à 4 modèles publiés exportés de prod dans
scripts/questions/idees-6e-problemes-publies/ (chantier idees-6e-problemes).

Phase 0 validée par David le 2026-11-27 (« je suis tes recos ») : F1 (32b7a9bc, +3), F2 (399342ff,
+2), F3 (2af325bb, +1), F4 (7deff4e0, +2). Les variations s'ajoutent À LA FIN (les réponses des
élèves gardent l'indice de leur variation) ; la migration de contenu est générée par
scripts/questions/migration-contenu.ts. Seuls `variations` et `testSpecs` changent : ni titre,
ni niveaux, ni options, ni description.

Le script repart du contenu de prod (variations et specs d'origine, comptées dans ORIGINE) :
le relancer réécrit les ajouts sans les doubler.

Écarts à la fiche, à signaler à David :
- F1 (a + b) × p et (n − m) × p : la somme (ou la différence) des quantités vaut 10 ou 20, pour
  que le calcul reste de tête comme dans le reste du modèle (« calculs de tête ») : regrouper
  les quantités, c'est justement ce qui rend le calcul facile.
- F1 achat en grammes : 100, 200 ou 500 g (le dixième, le cinquième, la moitié d'un kilogramme,
  comme la variation 3 du modèle), prix au kilo multiples de 20 centimes : calcul de tête.
- F2, F3 : réponse en euros avec son unité (`unit.expected`) : le juge accepte « 12,5 € » comme
  « 12,50 € », sans toucher aux options du modèle (pas de `zeros: off` sur 399342ff et 2af325bb).
- F3 : n2 de 2 à 6 (et non 9) : le schéma garde au plus 7 parts lisibles sur téléphone.

Usage : python3 docs/wip/questions/idees-6e-problemes-publies.py scripts/questions/idees-6e-problemes-publies
"""
import json
import os
import sys

DOSSIER = sys.argv[1]

PRIMAIRE = '\\textcolor{{{color:primary.0}}}'

# id court → (variations, specs) d'origine en prod (export du 2026-11-27)
ORIGINE = {'32b7a9bc': (4, 15), '399342ff': (2, 5), '2af325bb': (2, 5), '7deff4e0': (4, 12)}


def spec(desc, vi, variables_, status, answers, message=None):
    expected = {'status': status}
    if message is not None:
        expected['expectedErrorMessage'] = message
    return {'description': desc, 'variationIndex': vi, 'variables': variables_,
            'expected': expected, 'answers': answers}


def var(nom, expression):
    return {'name': nom, 'expression': expression}


def erreur(answer, message, label):
    return {'answer': answer, 'message': message, 'label': label}


def case(attendue, erreurs=None, unite=False):
    c = {'expectedAnswer': attendue}
    if unite:
        c['unit'] = {'expected': True}
    if erreurs:
        c['expectedErrors'] = erreurs
    return c


def variation(statement, variables, blanks, steps, hint, conditions=None):
    return {'statement': statement, 'variables': variables, 'conditions': conditions or [],
            'blanks': blanks, 'correction': {'steps': steps}, 'hint': hint}


def couleur(contenu):
    return PRIMAIRE + '{' + contenu + '}'


def selon(v, textes, k=0):
    """`{{if:v==0|…|{{if:v==1|…|…}}}}` : le texte numéro v."""
    if k == len(textes) - 1:
        return textes[k]
    return '{{if:' + v + '==' + str(k) + '|' + textes[k] + '|' + selon(v, textes, k + 1) + '}}'


def d(expr):
    return '{{eval:' + expr + ';d}}'


def prix(centimes):
    """Prix en grandeur en euros, à partir d'un nombre de centimes : « 14,37 € », « 12 € »."""
    return '{{eval:((' + centimes + ')/100)[€]}}'


def prix_nu(centimes):
    """Prix sans unité écrit comme un prix (14,30 ; 12) : centimes entiers."""
    return ('{{if:mod(' + centimes + ',100)==0|{{eval:(' + centimes + ')/100;d}}|{{eval:('
            + centimes + ')/100;d2}}}}')


def lab_c(c):
    """Prix en centimes écrit en texte dans un schéma en barres (le schéma n'écrit pas les
    grandeurs) : « 13,20 € », « 2,05 € », « 12 € »."""
    return ('{{if:mod(' + c + ',100)==0|{{eval:(' + c + ')/100}} €|{{eval:floor((' + c
            + ')/100)}},{{if:mod(' + c + ',100)<10|0|}}{{eval:mod(' + c + ',100)}} €}}')


def ajouter(court, variations, specs):
    chemin = os.path.join(DOSSIER, court + '.json')
    with open(chemin, encoding='utf-8') as f:
        m = json.load(f)
    nv, ns = ORIGINE[court]
    m['variations'] = m['variations'][:nv] + variations
    for s in specs:
        s['variationIndex'] += nv
    m['testSpecs'] = m['testSpecs'][:ns] + specs
    with open(chemin, 'w', encoding='utf-8') as f:
        json.dump(m, f, ensure_ascii=False, indent=2)
        f.write('\n')


# =============================================================================================
# F1 — 32b7a9bc (6-120), options `zeros: off`, cases nombre suivies de « € ».
# =============================================================================================

# (a + b) × p : a de 3 à 9, b = s − a, s = 10 ou 20 ; prix P en centimes, de 10,01 à 29,99 €.
F1_GROUPER = variation(
    'Une place de cinéma coûte $' + prix('P') + '$. Léa achète ${{a}}$ places pour sa famille et '
    'son oncle en achète ${{b}}$ pour la sienne.\n\nCombien paient-ils à eux deux ?\n\n'
    '$$?~\\text{€}$$',
    [var('s', '10|20'), var('a', '3..9'), var('b', 'eval:s-a'), var('P', '1001..2999')],
    [case('{{eval:s*P/100;d}}', [
        erreur('{{eval:a*P/100;d}}', 'C\'est le prix des places de Léa : il faut aussi compter '
               'celles de son oncle.', 'Un seul achat compté'),
        erreur('{{eval:b*P/100;d}}', 'C\'est le prix des places de l\'oncle : il faut aussi '
               'compter celles de Léa.', 'Un seul achat compté'),
        erreur('{{eval:(100*s+P)/100;d}}', 'Tu as ajouté le nombre de places au prix : '
               'multiplie le prix d\'une place par le nombre de places.',
               'Nombre de places ajouté au prix'),
    ])],
    [
        '**Regrouper les quantités.** Toutes les places ont le même prix : on compte d\'abord '
        'les places, ${{a}} + {{b}} = {{s}}$.',
        '$${{s}} \\times ' + prix_nu('P') + ' = ' + couleur(prix_nu('s*P')) + '$$',
        'Ils paient $' + couleur(prix('s*P')) + '$ à eux deux.',
    ],
    'Combien de places achètent-ils en tout ?',
    ['b>=3', 'a!=b', 'mod(P,10)!=0'],
)

# (n − m) × p : m de 3 à 9, n = m + s, s = 10 ou 20.
F1_RETRANCHER = variation(
    'Inès achète ${{n}}$ boîtes de peinture à $' + prix('P') + '$ l\'une pour l\'atelier de son '
    'club. Sa voisine lui en reprend ${{m}}$ et lui rembourse leur prix.\n\nCombien Inès a-t-elle '
    'dépensé, une fois remboursée ?\n\n$$?~\\text{€}$$',
    [var('s', '10|20'), var('m', '3..9'), var('n', 'eval:m+s'), var('P', '1001..2999')],
    [case('{{eval:s*P/100;d}}', [
        erreur('{{eval:n*P/100;d}}', 'C\'est le prix des ${{n}}$ boîtes : la voisine en a '
               'remboursé ${{m}}$.', 'Remboursement oublié'),
        erreur('{{eval:m*P/100;d}}', 'C\'est ce que la voisine a remboursé, pas ce qu\'Inès a '
               'dépensé.', 'Remboursement seul'),
        erreur('{{eval:(n+m)*P/100;d}}', 'Tu as ajouté les boîtes reprises : la voisine les a '
               'remboursées, il faut les retirer.', 'Quantités additionnées'),
    ])],
    [
        '**Regrouper les quantités.** Inès garde ${{n}} - {{m}} = {{s}}$ boîtes : ce sont '
        'celles qu\'elle a vraiment payées.',
        '$${{s}} \\times ' + prix_nu('P') + ' = ' + couleur(prix_nu('s*P')) + '$$',
        'Inès a dépensé $' + couleur(prix('s*P')) + '$.',
    ],
    'Combien de boîtes Inès garde-t-elle ?',
    ['mod(P,10)!=0'],
)

# Deux achats au poids : x kg (1,5 ; 2 ; 2,5 ; 3 kg) à 20u centimes le kg, g g (100, 200, 500)
# à 20w centimes le kg. Total en centimes : 10·x2·u + g·w/50.
F1_TOTAL = '10*x2*u+g*w/50'
F1_GRAMMES = variation(
    'Au marché, Malik achète $' + d('x2/2') + '~\\unit{kg}$ de ' + selon('f', ['pommes', 'poires',
                                                                         'carottes'])
    + ' à $' + prix('20*u') + '$ le kilogramme et ${{g}}~\\unit{g}$ de ' + selon('f', ['fromage',
                                                                                 'jambon', 'noix'])
    + ' à $' + prix('20*w') + '$ le kilogramme.\n\nCombien paie-t-il en tout ?\n\n$$?~\\text{€}$$',
    [var('f', '0..2'), var('x2', '3..6'), var('u', '6..20'), var('g', '100|200|500'),
     var('w', '40..124')],
    [case('{{eval:(' + F1_TOTAL + ')/100;d}}', [
        erreur('{{eval:(10*x2*u+20*g*w)/100;d}}', 'Tu as multiplié par ${{g}}$ comme si c\'était '
               'des kilogrammes : ${{g}}~\\unit{g} = ' + d('g/1000') + '~\\unit{kg}$.',
               'Grammes non convertis'),
        erreur('{{eval:(10*x2*u+g*w/5)/100;d}}', 'Vérifie la conversion : $1~\\unit{kg} = '
               '1\\,000~\\unit{g}$, donc ${{g}}~\\unit{g} = ' + d('g/1000') + '~\\unit{kg}$.',
               'Conversion décalée d\'un rang'),
        erreur('{{eval:x2*u/10;d}}', 'C\'est le prix du premier achat seulement : ajoute celui du '
               'second.', 'Un seul achat compté'),
    ])],
    [
        '**Convertir.** Le prix est donné au kilogramme : ${{g}}~\\unit{g} = ' + d('g/1000')
        + '~\\unit{kg}$.',
        '**Chaque achat.** $' + d('x2/2') + ' \\times ' + prix_nu('20*u') + ' = '
        + prix_nu('10*x2*u') + '$ et $' + d('g/1000') + ' \\times ' + prix_nu('20*w') + ' = '
        + prix_nu('g*w/50') + '$.',
        '**En tout.** $' + prix_nu('10*x2*u') + ' + ' + prix_nu('g*w/50') + ' = '
        + couleur(prix_nu(F1_TOTAL)) + '$ : Malik paie $' + couleur(prix(F1_TOTAL)) + '$.',
    ],
    'Le second prix est donné pour un kilogramme : combien de kilogrammes font ${{g}}~\\unit{g}$ ?',
    ['mod(u,5)!=0', 'mod(w,5)!=0'],
)

V_G = {'s': '10', 'a': '4', 'b': '6', 'P': '1437'}
V_R = {'s': '10', 'm': '4', 'n': '14', 'P': '1259'}
V_K = {'f': '0', 'x2': '3', 'u': '12', 'g': '500', 'w': '92'}
SPECS_F1 = [
    spec('F1 grouper : (4 + 6) × 14,37 = 143,70', 0, V_G, 'correct', ['143{,}7']),
    spec('F1 grouper : 143,70 accepté', 0, V_G, 'correct', ['143{,}70']),
    spec('F1 grouper : places de Léa seules (57,48)', 0, V_G, 'incorrect', ['57{,}48'],
         'C\'est le prix des places de Léa : il faut aussi compter celles de son oncle.'),
    spec('F1 grouper : places de l\'oncle seules (86,22)', 0, V_G, 'incorrect', ['86{,}22'],
         'C\'est le prix des places de l\'oncle : il faut aussi compter celles de Léa.'),
    spec('F1 grouper : 10 + 14,37 (24,37)', 0, V_G, 'incorrect', ['24{,}37'],
         'Tu as ajouté le nombre de places au prix : multiplie le prix d\'une place par le '
         'nombre de places.'),
    spec('F1 grouper : (7 + 13) × 21,05 = 421', 0, {'s': '20', 'a': '7', 'b': '13', 'P': '2105'},
         'correct', ['421']),
    spec('F1 retrancher : (14 − 4) × 12,59 = 125,90', 1, V_R, 'correct', ['125{,}9']),
    spec('F1 retrancher : remboursement oublié (176,26)', 1, V_R, 'incorrect', ['176{,}26'],
         'C\'est le prix des $14$ boîtes : la voisine en a remboursé $4$.'),
    spec('F1 retrancher : remboursement seul (50,36)', 1, V_R, 'incorrect', ['50{,}36'],
         'C\'est ce que la voisine a remboursé, pas ce qu\'Inès a dépensé.'),
    spec('F1 retrancher : boîtes ajoutées (226,62)', 1, V_R, 'incorrect', ['226{,}62'],
         'Tu as ajouté les boîtes reprises : la voisine les a remboursées, il faut les retirer.'),
    spec('F1 grammes : 1,5 × 2,40 + 0,5 × 18,40 = 12,80', 2, V_K, 'correct', ['12{,}8']),
    spec('F1 grammes : 12,80 accepté', 2, V_K, 'correct', ['12{,}80']),
    spec('F1 grammes : 500 × 18,40 (9 203,6)', 2, V_K, 'incorrect', ['9203{,}6'],
         'Tu as multiplié par $500$ comme si c\'était des kilogrammes : $500~\\unit{g} = '
         '0.5~\\unit{kg}$.'),
    spec('F1 grammes : 5 kg au lieu de 0,5 kg (95,6)', 2, V_K, 'incorrect', ['95{,}6'],
         'Vérifie la conversion : $1~\\unit{kg} = 1\\,000~\\unit{g}$, donc $500~\\unit{g} = '
         '0.5~\\unit{kg}$.'),
    spec('F1 grammes : premier achat seul (3,6)', 2, V_K, 'incorrect', ['3{,}6'],
         'C\'est le prix du premier achat seulement : ajoute celui du second.'),
]


# =============================================================================================
# F2 — 399342ff (6-142) : une part et l'écart donnés, total cherché. Réponse en euros avec unité.
# s = 0 : « de plus », s = 1 : « de moins ». Montants en dixièmes d'euro (X, D).
# =============================================================================================

def total_dixiemes(signe):
    """Total en dixièmes : 2X − D quand l'autre a moins, 2X + D quand il a plus."""
    return '2*X' + signe + 'D'


# Nina a X ; « de plus » → Hugo = X − D, total 2X − D ; « de moins » → Hugo = X + D, total 2X + D.
F2_TOTAL = '(2*X+(2*s-1)*D)'
F2_HUGO = '(X+(2*s-1)*D)'
F2_RETOURNE = '(2*X-(2*s-1)*D)'


def euros_dix(expr):
    return '{{eval:((' + expr + ')/10)[€]}}'


def lab(expr):
    """Montant en dixièmes d'euro écrit en texte dans un schéma en barres (le schéma n'écrit pas
    les grandeurs) : « 52 € », « 26,90 € »."""
    return ('{{if:mod(' + expr + ',10)==0|{{eval:(' + expr + ')/10}} €|{{eval:floor((' + expr
            + ')/10)}},{{eval:mod(' + expr + ',10)}}0 €}}')


def d2(expr):
    """Montant en dixièmes d'euro écrit comme un prix dans une formule : 26,90."""
    return '{{eval:(' + expr + ')/10;d2}}'


F2_SCHEMA_PLUS = ('```schema-barres\nHugo : ? (3)\nNina : ? (3) ; ' + lab('D')
                  + ' (1,5) = ' + lab('X') + '\ntotal : ?\n```')
F2_SCHEMA_MOINS = ('```schema-barres\nHugo : ? (3) ; ' + lab('D') + ' (1,5)\nNina : ? (3)'
                   ' = ' + lab('X') + '\ntotal : ?\n```')
F2_SCHEMA_PLUS_C = ('```schema-barres\nHugo : ' + lab('X-D') + ' (3)\nNina : '
                    + lab('X-D') + ' (3) ; ' + lab('D') + ' (1,5) = ' + lab('X')
                    + '\ntotal : ' + lab('2*X-D') + '\n```')
F2_SCHEMA_MOINS_C = ('```schema-barres\nHugo : ' + lab('X') + ' (3) ; ' + lab('D')
                     + ' (1,5)\nNina : ' + lab('X') + ' (3) = ' + lab('X')
                     + '\ntotal : ' + lab('2*X+D') + '\n```')


def f2_erreurs(qui_autre, qui_donne):
    return [
        erreur(euros_dix(F2_HUGO), 'C\'est ce qu\'a ' + qui_autre + ' : il reste à ajouter ce '
               'qu\'a ' + qui_donne + '.', 'Une seule part'),
        erreur(euros_dix(F2_RETOURNE), 'Relis la phrase : qui a le plus d\'argent ? Le schéma '
               'montre quelle barre est la plus longue.', 'Écart dans le mauvais sens'),
        erreur(euros_dix('2*X'), 'Tu as compté deux fois ce qu\'a ' + qui_donne + ' : '
               + qui_autre + ' n\'a pas autant.', 'Deux parts égales'),
    ]


F2_ENTIERS = variation(
    'Nina dit à Hugo : « J\'ai $' + euros_dix('X') + '$, soit $' + euros_dix('D') + '$ de '
    + selon('s', ['plus', 'moins']) + ' que toi. »\n\n'
    + selon('s', [F2_SCHEMA_PLUS, F2_SCHEMA_MOINS]) + '\n\nCombien d\'argent ont-ils à eux deux ? '
    'Écris l\'unité dans ta réponse.\n\nÀ eux deux, ils ont $?$.',
    [var('s', '0..1'), var('k', '40..70'), var('j', '10..30'), var('X', 'eval:10*k'),
     var('D', 'eval:10*j')],
    [case(euros_dix(F2_TOTAL), f2_erreurs('Hugo', 'Nina'), unite=True)],
    [
        selon('s', [
            '**Ce qu\'a Hugo.** Nina a $' + euros_dix('D') + '$ de plus que Hugo, donc Hugo a $'
            + euros_dix('D') + '$ de moins qu\'elle : ${{k}} - {{j}} = {{eval:k-j}}$.',
            '**Ce qu\'a Hugo.** Nina a $' + euros_dix('D') + '$ de moins que Hugo, donc Hugo a $'
            + euros_dix('D') + '$ de plus qu\'elle : ${{k}} + {{j}} = {{eval:k+j}}$.',
        ]),
        '**À eux deux.** ' + selon('s', [
            '${{k}} + {{eval:k-j}} = ' + couleur(euros_dix('2*X-D')) + '$.',
            '${{k}} + {{eval:k+j}} = ' + couleur(euros_dix('2*X+D')) + '$.',
        ]) + '\n\n' + selon('s', [F2_SCHEMA_PLUS_C, F2_SCHEMA_MOINS_C]),
    ],
    'Commence par trouver ce qu\'a Hugo : a-t-il plus ou moins que Nina ?',
)

# La phrase retournée : « Tu as X €, et moi j'ai D € de moins (plus) que toi. » Valeurs au
# dixième d'euro (X de 20,50 à 49,50 €, D de 1,50 à 9,50 €), jamais entières.
F2_SCHEMA_R_MOINS = ('```schema-barres\nLéo : ? (3)\nInès : ? (3) ; ' + lab('D')
                     + ' (1,5) = ' + lab('X') + '\ntotal : ?\n```')
F2_SCHEMA_R_PLUS = ('```schema-barres\nLéo : ? (3) ; ' + lab('D') + ' (1,5)\nInès : ? (3)'
                    ' = ' + lab('X') + '\ntotal : ?\n```')
F2_RETOURNEE = variation(
    'Léo dit à Inès : « Tu as $' + euros_dix('X') + '$, et moi j\'ai $' + euros_dix('D') + '$ de '
    + selon('s', ['moins', 'plus']) + ' que toi. »\n\n'
    + selon('s', [F2_SCHEMA_R_MOINS, F2_SCHEMA_R_PLUS]) + '\n\nCombien d\'argent ont-ils à eux '
    'deux ? Écris l\'unité dans ta réponse.\n\nÀ eux deux, ils ont $?$.',
    [var('s', '0..1'), var('X', '205..495'), var('D', '15..95')],
    [case(euros_dix(F2_TOTAL), [
        erreur(euros_dix(F2_HUGO), 'C\'est ce qu\'a Léo : il reste à ajouter ce qu\'a Inès.',
               'Une seule part'),
        erreur(euros_dix(F2_RETOURNE), '« J\'ai ' + selon('s', ['moins', 'plus']) + ' que toi » '
               ': c\'est Léo, celui qui parle, qui a ' + selon('s', ['moins', 'plus'])
               + '. Le schéma montre quelle barre est la plus longue.',
               'Écart dans le mauvais sens'),
        erreur(euros_dix('2*X'), 'Tu as compté deux fois ce qu\'a Inès : Léo n\'a pas autant.',
               'Deux parts égales'),
    ], unite=True)],
    [
        '**Qui parle ?** C\'est Léo : « moi », c\'est Léo, et « toi », c\'est Inès, qui a $'
        + euros_dix('X') + '$.',
        '**Ce qu\'a Léo.** ' + selon('s', [
            '$' + d2('X') + ' - ' + d2('D') + ' = ' + d2('X-D') + '$.',
            '$' + d2('X') + ' + ' + d2('D') + ' = ' + d2('X+D') + '$.',
        ]),
        '**À eux deux.** ' + selon('s', [
            '$' + d2('X') + ' + ' + d2('X-D') + ' = ' + couleur(euros_dix('2*X-D')) + '$.',
            '$' + d2('X') + ' + ' + d2('X+D') + ' = ' + couleur(euros_dix('2*X+D')) + '$.',
        ]),
    ],
    'Qui est « moi » dans la phrase de Léo, et qui est « toi » ? Trouve d\'abord ce qu\'a Léo.',
    ['mod(X,10)!=0', 'mod(D,10)!=0', 'D*4<X'],
)

V_P = {'s': '0', 'k': '52', 'j': '15', 'X': '520', 'D': '150'}
V_M = {'s': '1', 'k': '52', 'j': '15', 'X': '520', 'D': '150'}
V_RM = {'s': '0', 'X': '235', 'D': '45'}
SPECS_F2 = [
    spec('F2 de plus : 52 € et 15 € de plus → 89 €', 0, V_P, 'correct', ['89\\,€']),
    spec('F2 de plus : sans unité refusé', 0, V_P, 'incorrect', ['89']),
    spec('F2 de plus : Hugo seul (37 €)', 0, V_P, 'incorrect', ['37\\,€'],
         'C\'est ce qu\'a Hugo : il reste à ajouter ce qu\'a Nina.'),
    spec('F2 de plus : sens retourné (119 €)', 0, V_P, 'incorrect', ['119\\,€'],
         'Relis la phrase : qui a le plus d\'argent ? Le schéma montre quelle barre est la plus '
         'longue.'),
    spec('F2 de plus : 2 × 52 (104 €)', 0, V_P, 'incorrect', ['104\\,€'],
         'Tu as compté deux fois ce qu\'a Nina : Hugo n\'a pas autant.'),
    spec('F2 de moins : 52 € et 15 € de moins → 119 €', 0, V_M, 'correct', ['119\\,€']),
    spec('F2 de moins : sens retourné (89 €)', 0, V_M, 'incorrect', ['89\\,€'],
         'Relis la phrase : qui a le plus d\'argent ? Le schéma montre quelle barre est la plus '
         'longue.'),
    spec('F2 retournée : 23,50 € et 4,50 € de moins → 42,50 €', 1, V_RM, 'correct',
         ['42{,}5\\,€']),
    spec('F2 retournée : 42,50 € accepté', 1, V_RM, 'correct', ['42{,}50\\,€']),
    spec('F2 retournée : sens retourné (51,50 €)', 1, V_RM, 'incorrect', ['51{,}5\\,€'],
         '« J\'ai moins que toi » : c\'est Léo, celui qui parle, qui a moins. Le schéma montre '
         'quelle barre est la plus longue.'),
    spec('F2 retournée : Léo seul (19 €)', 1, V_RM, 'incorrect', ['19\\,€'],
         'C\'est ce qu\'a Léo : il reste à ajouter ce qu\'a Inès.'),
    spec('F2 retournée : de plus, 23,50 € + 28 € = 51,50 €', 1, {'s': '1', 'X': '235', 'D': '45'},
         'correct', ['51{,}5\\,€']),
]


# =============================================================================================
# F3 — 2af325bb (6-142) : n1 pains à p1 et n2 tartelettes identiques coûtent T ; prix d'une
# tartelette. Prix en centimes ; n1·p1 multiple de n2 (l'erreur « T ÷ n2 » reste exacte).
# =============================================================================================

F3_T = '(n1*p1+n2*p2)'
F3_PARTS = ' ; ?{{if:n2>2| ; ?|}}{{if:n2>3| ; ?|}}{{if:n2>4| ; ?|}}{{if:n2>5| ; ?|}}'
F3_PARTS_C = (' ; X ; X{{if:n2>2| ; X|}}{{if:n2>3| ; X|}}{{if:n2>4| ; X|}}{{if:n2>5| ; X|}}'
              .replace('X', lab_c('p2')))
F3_LOT = variation(
    '${{n1}}$ pains à $' + prix('p1') + '$ l\'un et ${{n2}}$ tartelettes identiques coûtent $'
    + prix(F3_T) + '$ en tout.\n\n```schema-barres\n: {{n1}} pains (2) ; ?' + F3_PARTS + ' = '
    + lab_c(F3_T) + '\n```\n\nQuel est le prix d\'une tartelette ? Écris l\'unité dans ta '
    'réponse.\n\nUne tartelette coûte $?$.',
    [var('n1', '2..5'), var('n2', '2..6'), var('q', '2..19'), var('p1', 'eval:5*n2*q'),
     var('r', '21..59'), var('p2', 'eval:5*r')],
    [case(prix('p2'), [
        erreur(prix(F3_T + '/n2'), 'Tu as partagé tout le prix entre les tartelettes : retire '
               'd\'abord le prix des pains.', 'Pains non retirés'),
        erreur(prix('n2*p2'), 'C\'est le prix des ${{n2}}$ tartelettes : partage-le entre '
               'elles.', 'Prix des tartelettes non partagé'),
        erreur(prix('n1*p1'), 'C\'est le prix des ${{n1}}$ pains, que l\'on retire du total.',
               'Prix des pains'),
    ], unite=True)],
    [
        '**Le prix des pains.** ${{n1}} \\times ' + prix_nu('p1') + ' = ' + prix_nu('n1*p1') + '$.',
        '**Les parts égales.** On enlève le prix des pains : $' + prix_nu(F3_T) + ' - '
        + prix_nu('n1*p1') + ' = ' + prix_nu('n2*p2') + '$.',
        '**Une part.** $' + prix_nu('n2*p2') + ' \\div {{n2}} = ' + couleur(prix_nu('p2'))
        + '$ : une tartelette coûte $' + couleur(prix('p2')) + '$.\n\n```schema-barres\n: {{n1}}'
        ' pains (2)' + F3_PARTS_C + ' = ' + lab_c(F3_T) + '\n```',
    ],
    'Que représente la première partie du schéma ? Combien coûte-t-elle ?',
    ['p1>=50', 'p1<=195', 'n1*p1!=p2', 'n1*p1!=n2*p2'],
)

V_F3 = {'n1': '3', 'n2': '4', 'q': '4', 'p1': '80', 'r': '47', 'p2': '235'}
SPECS_F3 = [
    spec('F3 : 3 × 0,80 + 4 × ? = 11,80 → 2,35 €', 0, V_F3, 'correct', ['2{,}35\\,€']),
    spec('F3 : sans unité refusé', 0, V_F3, 'incorrect', ['2{,}35']),
    spec('F3 : 11,80 ÷ 4 (2,95 €)', 0, V_F3, 'incorrect', ['2{,}95\\,€'],
         'Tu as partagé tout le prix entre les tartelettes : retire d\'abord le prix des pains.'),
    spec('F3 : non partagé (9,40 €)', 0, V_F3, 'incorrect', ['9{,}4\\,€'],
         'C\'est le prix des $4$ tartelettes : partage-le entre elles.'),
    spec('F3 : prix des pains (2,40 €)', 0, V_F3, 'incorrect', ['2{,}4\\,€'],
         'C\'est le prix des $3$ pains, que l\'on retire du total.'),
]


# =============================================================================================
# F4 — 7deff4e0 (6-119) : ordre de grandeur dans une situation, case choix (bonne réponse : 0,
# mélangée à l'affichage).
# =============================================================================================

# t = 0 : verger (R rangées de A arbres) ; t = 1 : carrelage (salle de L/10 m sur l/10 m).
# r1, r2 : les arrondis (dizaine pour le verger, unité pour la salle).
F4_SITUATION = variation(
    selon('t', [
        'Un verger compte ${{R}}$ rangées de ${{A}}$ arbres. Sans poser le calcul, environ '
        'combien d\'arbres y a-t-il dans ce verger ?',
        'Une salle rectangulaire mesure $' + d('L/10') + '~\\unit{m}$ sur $' + d('l/10')
        + '~\\unit{m}$. On la couvre de carreaux de $1~\\unit{m^2}$. Sans poser le calcul, '
        'environ combien de carreaux faut-il ?',
    ]) + '\n\n```choix\n- environ ${{eval:r1*r2}}$\n- environ ${{eval:r1+r2}}$\n- environ '
    '${{eval:10*r1*r2}}$\n- environ ${{z}}$\n```',
    [var('t', '0..1'), var('R', '16..30'), var('A', '18..39'), var('L', '81..149'),
     var('l', '61..139'),
     var('r1', 'eval:(1-t)*10*round(R/10)+t*round(L/10)'),
     var('r2', 'eval:(1-t)*10*round(A/10)+t*round(l/10)'),
     var('z', 'eval:(1-t)*r1*r2/10+t*2*(r1+r2)')],
    [case('0')],
    [
        '**Quelle opération ?** ' + selon('t', [
            'Il y a ${{R}}$ rangées de ${{A}}$ arbres : on multiplie, ${{R}} \\times {{A}}$.',
            'Le nombre de carreaux de $1~\\unit{m^2}$, c\'est l\'aire de la salle : longueur '
            '$\\times$ largeur (le périmètre ne compte que le tour).',
        ]),
        '**Ordre de grandeur.** ' + selon('t', [
            '${{R}} \\approx {{r1}}$ et ${{A}} \\approx {{r2}}$, donc ${{R}} \\times {{A}} '
            '\\approx {{r1}} \\times {{r2}} = ' + couleur('{{eval:r1*r2}}') + '$.',
            '$' + d('L/10') + ' \\approx {{r1}}$ et $' + d('l/10') + ' \\approx {{r2}}$, donc '
            'il faut environ ${{r1}} \\times {{r2}} = ' + couleur('{{eval:r1*r2}}')
            + '$ carreaux.',
        ]),
    ],
    'Quelle opération faut-il faire ? Remplace ensuite chaque nombre par un nombre rond proche.',
    ['mod(R,10)!=5', 'mod(A,10)!=5', 'mod(R,10)!=0', 'mod(A,10)!=0', 'mod(L,10)!=5', 'mod(l,10)!=5', 'L>l',
     'r1*r2!=r1+r2', 'z!=r1+r2', 'z!=r1*r2'],
)

# Packs : n packs (5 à 10) de b bouteilles (4 à 8) de v litres (0,5 ; 0,75 ; 1,5).
# Volume exact n·b·v ; ordre de grandeur o = son arrondi à l'unité.
F4_PACKS = variation(
    'Pour une fête, on achète ${{n}}$ packs de ${{b}}$ bouteilles. Chaque bouteille contient $'
    + d('v') + '~\\unit{L}$. Sans poser le calcul, quel volume de boisson a-t-on acheté, '
    'environ ?\n\n```choix\n- environ ${{o}}~\\unit{L}$\n- environ ${{eval:10*o}}~\\unit{L}$\n'
    '- environ $' + d('o/10') + '~\\unit{L}$\n- environ ${{eval:round(n+b+v)}}~\\unit{L}$\n```',
    [var('n', '5..10'), var('b', '4..8'), var('cv', '0..2'),
     var('v', 'eval:0.5*(1-min(abs(cv-0),1))+0.75*(1-min(abs(cv-1),1))+1.5*(1-min(abs(cv-2),1));d'),
     var('o', 'eval:round(n*b*v)')],
    [case('0')],
    [
        '**Quelle opération ?** Il y a ${{n}} \\times {{b}} = {{eval:n*b}}$ bouteilles, de $'
        + d('v') + '~\\unit{L}$ chacune : on multiplie encore par $' + d('v') + '$.',
        '**Ordre de grandeur.** ' + selon('cv', [
            '$0.5~\\unit{L}$, c\'est la moitié d\'un litre : la moitié de ${{eval:n*b}}$, '
            'environ $' + couleur('{{o}}~\\unit{L}') + '$.',
            '$0.75~\\unit{L}$, c\'est un peu moins d\'un litre : ${{eval:n*b}} \\times 0.75 '
            '\\approx ' + couleur('{{o}}~\\unit{L}') + '$, un peu moins que ${{eval:n*b}}~'
            '\\unit{L}$.',
            '$1.5~\\unit{L}$, c\'est un litre et demi : ${{eval:n*b}} + {{eval:n*b/2;d}} '
            '\\approx ' + couleur('{{o}}~\\unit{L}') + '$.',
        ]),
    ],
    'Combien y a-t-il de bouteilles ? Une bouteille contient-elle plus ou moins d\'un litre ?',
    ['round(n+b+v)!=o', 'round(n+b+v)!=round(o/10)'],
)

V_V = {'t': '0', 'R': '23', 'A': '38', 'L': '100', 'l': '80', 'r1': '20', 'r2': '40', 'z': '80'}
V_C = {'t': '1', 'R': '20', 'A': '20', 'L': '124', 'l': '98', 'r1': '12', 'r2': '10', 'z': '44'}
V_PK = {'n': '6', 'b': '6', 'cv': '1', 'v': '0.75', 'o': '27'}
SPECS_F4 = [
    spec('F4 verger : 23 × 38 ≈ 800', 0, V_V, 'correct', ['0']),
    spec('F4 verger : somme (60) refusée', 0, V_V, 'incorrect', ['1']),
    spec('F4 verger : × 10 (8 000) refusé', 0, V_V, 'incorrect', ['2']),
    spec('F4 verger : ÷ 10 (80) refusé', 0, V_V, 'incorrect', ['3']),
    spec('F4 carrelage : 12,4 × 9,8 ≈ 120', 0, V_C, 'correct', ['0']),
    spec('F4 carrelage : périmètre (44) refusé', 0, V_C, 'incorrect', ['3']),
    spec('F4 packs : 6 × 6 × 0,75 ≈ 27 L', 1, V_PK, 'correct', ['0']),
    spec('F4 packs : × 10 refusé', 1, V_PK, 'incorrect', ['1']),
    spec('F4 packs : somme refusée', 1, V_PK, 'incorrect', ['3']),
]


ajouter('32b7a9bc', [F1_GROUPER, F1_RETRANCHER, F1_GRAMMES], SPECS_F1)
ajouter('399342ff', [F2_ENTIERS, F2_RETOURNEE], SPECS_F2)
ajouter('2af325bb', [F3_LOT], SPECS_F3)
ajouter('7deff4e0', [F4_SITUATION, F4_PACKS], SPECS_F4)
print('8 variations ajoutées à 4 modèles dans', DOSSIER)
