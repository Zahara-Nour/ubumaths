"""Ajoute les variations validées aux 10 modèles publiés exportés de prod dans
scripts/questions/idees-6e-decimaux-publies/ (chantier idees-6e-decimaux).

Phase 0 validée par David le 2026-11-22 : F1 (2c5bae8f), F4 (819df2a9, 590169c4), F6 (571ca739),
F9 (ddbce820), F10 (7deff4e0), F11 (32b7a9bc, 87cfa41b), F12b (3f4bacc6), Q1 (b586bdf8). Les
variations s'ajoutent À LA FIN (les réponses des élèves gardent l'indice de leur variation) ; la
migration de contenu est générée par scripts/questions/migration-contenu.ts. Seuls `variations` et
`testSpecs` changent : ni titre, ni niveaux, ni options (migration-contenu ne change que variations,
specs et description). La fiche F4 prévoyait d'ajouter la 6e aux niveaux de 590169c4 : hors de ce
script, à faire dans l'éditeur ou par une migration à part.

Le script repart du contenu de prod (variations et specs d'origine, comptées dans ORIGINE) :
le relancer réécrit les ajouts sans les doubler.

Pièges du lot :
- Fusion `shared` ⊕ variation : `conditions` est REMPLACÉ en bloc (une liste vide aussi) ; les
  variables de `shared` sont tirées pour toutes les variations. 819df2a9 réutilise les siennes
  (a, p, q, b) et recopie sa condition ; 571ca739 tire les siennes, inutilisées ici.
- 819df2a9, 571ca739, 2c5bae8f, ddbce820 : espaces exigées dès 4 chiffres (`1\\,000`, `0{,}108\\,1`).
- Une erreur prévue qui tombe sur la bonne réponse d'un tirage est ignorée ; deux erreurs prévues
  de même valeur sur un tirage se gênent : les conditions les écartent.
- Choix (jour de la semaine) : pas d'erreur prévue (réservées à l'écriture mathématique ordinaire).

Usage : python3 docs/wip/questions/idees-6e-decimaux-publies.py scripts/questions/idees-6e-decimaux-publies
"""
import json
import os
import sys

DOSSIER = sys.argv[1]

PRIMAIRE = '\\textcolor{{{color:primary.0}}}'
SECOND = '\\textcolor{{{color:primary.1}}}'

# id court → (variations, specs) d'origine en prod (export du 2026-11-22)
ORIGINE = {'2c5bae8f': (5, 11), '819df2a9': (2, 6), '590169c4': (1, 5), '571ca739': (2, 5),
           'ddbce820': (1, 4), '7deff4e0': (3, 6), '32b7a9bc': (3, 10), '87cfa41b': (3, 10),
           '3f4bacc6': (3, 9), 'b586bdf8': (2, 5)}


def spec(desc, vi, variables_, status, answers, message=None, violations=None):
    expected = {'status': status}
    if message is not None:
        # un décimal cité dans le message se résout avec un point (2.35)
        expected['expectedErrorMessage'] = message.replace('{,}', '.')
    if violations is not None:
        expected['constraintViolations'] = violations
    return {'description': desc, 'variationIndex': vi, 'variables': variables_,
            'expected': expected, 'answers': answers}


def var(nom, expression):
    return {'name': nom, 'expression': expression}


def erreur(answer, message, label):
    return {'answer': answer, 'message': message, 'label': label}


def case(attendue, erreurs=None):
    c = {'expectedAnswer': attendue}
    if erreurs:
        c['expectedErrors'] = erreurs
    return c


def variation(statement, variables, blanks, steps, hint, conditions=None):
    return {'statement': statement, 'variables': variables, 'conditions': conditions or [],
            'blanks': blanks, 'correction': {'steps': steps}, 'hint': hint}


def couleur(contenu, c=PRIMAIRE):
    return c + '{' + contenu + '}'


def prix(v):
    """Prix en centimes v → écriture à deux décimales (2.40, jamais 2.4)."""
    return ('{{eval:floor(' + v + '/100)}}.{{eval:floor(mod(' + v + ',100)/10)}}'
            '{{eval:mod(' + v + ',10)}}')


def un_sur(e):
    """1, ou 1/10^e (e ≥ 1), selon la valeur de la variable e."""
    return '{{if:' + e + '==0|1|\\frac{1}{{{eval:10^' + e + '}}}}}'


JOURS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche']


def jour(v):
    """Nom du jour d'indice v (0 = lundi)."""
    texte = JOURS[6]
    for i in range(5, -1, -1):
        texte = '{{if:' + v + '==' + str(i) + '|' + JOURS[i] + '|' + texte + '}}'
    return texte


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
# 2c5bae8f — 6-102, liens entre les unités de numération. F1 : les mêmes liens écrits avec des
# fractions décimales (le modèle les écrit en mots). s = 0 : 1/10^a = ? × 1/10^b ; s = 1 :
# 1/10^b = 1/10^a ÷ ?. Réponse 10^(b − a) : 10, 100 ou 1 000.
# =============================================================================================

F1_G = un_sur('a')
F1_P = '\\frac{1}{{{eval:10^b}}}'
F1 = variation(
    'Complète.\n\n$${{if:s==0|' + F1_G + ' = ? \\times ' + F1_P + '|' + F1_P + ' = ' + F1_G
    + ' \\div ?}}$$',
    [var('s', '0..1'), var('a', '0..2'), var('b', '1..3')],
    [case('{{eval:10^(b-a)}}', [
        erreur('{{eval:10^(a-b);d}}',
               '{{if:s==0|Il faut plusieurs fois $' + F1_P + '$ pour faire $' + F1_G + '$ : le '
               'nombre cherché est plus grand que $1$.|Diviser par un nombre plus petit que $1$ '
               'agrandit : ici, on partage $' + F1_G + '$ en parts égales.}}',
               'Rapport lu à l\'envers'),
        erreur('{{eval:10^b}}',
               'Tu as recopié le dénominateur : compte plutôt de combien de rangs on passe de $'
               + F1_G + '$ à $' + F1_P + '$.', 'Dénominateur recopié'),
    ])],
    [
        '**Unités de numération.** D\'un rang au rang juste à sa droite, on divise par $10$. '
        'Entre $' + F1_G + '$ et $' + F1_P + '$, il y a ${{eval:b-a}}$ rang{{if:b-a>1|s|}} : $'
        + F1_G + ' = {{eval:10^(b-a)}} \\times ' + F1_P + '${{if:s==1|, donc partager $' + F1_G
        + '$ en ${{eval:10^(b-a)}}$ parts égales donne $' + F1_P + '$|}}.',
        '$${{if:s==0|' + F1_G + ' = ' + couleur('{{solution}}') + ' \\times ' + F1_P + '|' + F1_P
        + ' = ' + F1_G + ' \\div ' + couleur('{{solution}}') + '}}$$',
    ],
    'Compte de combien de rangs on se déplace entre les deux nombres : chaque rang vers la droite, '
    'c\'est une division par $10$.',
    ['b>a'],
)

SPECS_2C = [
    spec('F1 : 1/10 = 10 × 1/100', 0, {'s': '0', 'a': '1', 'b': '2'}, 'correct', ['10']),
    spec('F1 : rapport à l\'envers (0,1)', 0, {'s': '0', 'a': '1', 'b': '2'}, 'incorrect',
         ['0{,}1'],
         'Il faut plusieurs fois $\\frac{1}{100}$ pour faire $\\frac{1}{10}$ : le nombre cherché '
         'est plus grand que $1$.'),
    spec('F1 : dénominateur recopié (100)', 0, {'s': '0', 'a': '1', 'b': '2'}, 'incorrect',
         ['100'],
         'Tu as recopié le dénominateur : compte plutôt de combien de rangs on passe de '
         '$\\frac{1}{10}$ à $\\frac{1}{100}$.'),
    spec('F1 : 1 = 1 000 × 1/1 000', 0, {'s': '0', 'a': '0', 'b': '3'}, 'correct', ['1\\,000']),
    spec('F1 : 1000 sans espace', 0, {'s': '0', 'a': '0', 'b': '3'}, 'unoptimal_form', ['1000'],
         violations=['spaces']),
    spec('F1 : 1/1 000 = 1/100 ÷ 10', 0, {'s': '1', 'a': '2', 'b': '3'}, 'correct', ['10']),
    spec('F1 : division, rapport à l\'envers (0,1)', 0, {'s': '1', 'a': '2', 'b': '3'},
         'incorrect', ['0{,}1'],
         'Diviser par un nombre plus petit que $1$ agrandit : ici, on partage $\\frac{1}{100}$ en '
         'parts égales.'),
]


# =============================================================================================
# 819df2a9 — CM2-042, multiplier par 10, 100, 1 000. F4 : la puissance manquante, puis le
# facteur décimal manquant. Variables de `shared` : a (1..3), p, q (1..3 décimales), b.
# =============================================================================================

C_819 = ['mod(b*10^q,10)!=0']

F4_PUISSANCE = variation(
    'Complète avec $10$, $100$ ou $1\\,000$.\n\n$${{b}} \\times ? = {{P}}$$',
    [var('P', 'eval:b*10^a;d')],
    [case('{{eval:10^a}}', [
        erreur('{{eval:10^(-a);d}}',
               'Le produit est plus grand que ${{b}}$ : on a multiplié par un nombre plus grand '
               'que $1$.', 'Rapport inversé'),
    ])],
    [
        '**Multiplier par $10$, $100$, $1000$.** Multiplier par $10$ fait glisser chaque chiffre '
        'd\'un rang vers la gauche ; par $100$, de deux rangs ; par $1000$, de trois rangs.',
        'De ${{b}}$ à ${{P}}$, chaque chiffre a glissé de ${{a}}$ rang{{if:a>1|s|}} vers la '
        'gauche.',
        '$${{b}} \\times ' + couleur('{{solution}}') + ' = {{P}}$$',
    ],
    'Repère un chiffre de ${{b}}$ dans ${{P}}$ : de combien de rangs a-t-il glissé vers la gauche ?',
    C_819,
)

F4_FACTEUR = variation(
    'Complète.\n\n$$? \\times {{eval:10^a}} = {{P}}$$',
    [var('P', 'eval:b*10^a;d')],
    [case('{{eval:b;d}}', [
        erreur('{{eval:b*10^(2*a);d}}',
               'Tu as multiplié ${{P}}$ par ${{eval:10^a}}$ : le nombre cherché est '
               '${{eval:10^a}}$ fois plus petit que ${{P}}$.', 'Décalage dans le mauvais sens'),
    ])],
    [
        '**Multiplier par $10$, $100$, $1000$** fait glisser chaque chiffre vers la gauche. Pour '
        'retrouver le nombre de départ, on fait l\'inverse : on divise ${{P}}$ par '
        '${{eval:10^a}}$, chaque chiffre glisse de ${{a}}$ rang{{if:a>1|s|}} vers la droite.',
        '$${{P}} \\div {{eval:10^a}} = {{solution}}$$',
        '$$' + couleur('{{solution}}') + ' \\times {{eval:10^a}} = {{P}}$$',
    ],
    'Le nombre cherché, multiplié par ${{eval:10^a}}$, donne ${{P}}$ : quelle opération fait le '
    'chemin inverse ?',
    C_819,
)

SPECS_81 = [
    spec('F4 : 3,7 × 100 = 370', 0, {'a': '2', 'p': '1', 'q': '1', 'b': '3.7'}, 'correct', ['100']),
    spec('F4 : rapport inversé (0,01)', 0, {'a': '2', 'p': '1', 'q': '1', 'b': '3.7'}, 'incorrect',
         ['0{,}01'],
         'Le produit est plus grand que $3{,}7$ : on a multiplié par un nombre plus grand que $1$.'),
    spec('F4 : 10 au lieu de 100', 0, {'a': '2', 'p': '1', 'q': '1', 'b': '3.7'}, 'incorrect',
         ['10']),
    spec('F4 : 0,045 × 1 000 = 45', 0, {'a': '3', 'p': '0', 'q': '3', 'b': '0.045'}, 'correct',
         ['1\\,000']),
    spec('F4 : 1000 sans espace', 0, {'a': '3', 'p': '0', 'q': '3', 'b': '0.045'},
         'unoptimal_form', ['1000'], violations=['spaces']),
    spec('F4 : … × 1 000 = 45', 1, {'a': '3', 'p': '0', 'q': '3', 'b': '0.045'}, 'correct',
         ['0{,}045']),
    spec('F4 : point décimal accepté', 1, {'a': '3', 'p': '0', 'q': '3', 'b': '0.045'}, 'correct',
         ['0.045']),
    spec('F4 : décalage dans le mauvais sens', 1, {'a': '3', 'p': '0', 'q': '3', 'b': '0.045'},
         'incorrect', ['45\\,000'],
         'Tu as multiplié $45$ par $1000$ : le nombre cherché est $1000$ fois plus petit que $45$.'),
    spec('F4 : … × 10 = 46,83', 1, {'a': '1', 'p': '1', 'q': '3', 'b': '4.683'}, 'correct',
         ['4{,}683']),
    spec('F4 : un rang de trop (0,468 3)', 1, {'a': '1', 'p': '1', 'q': '3', 'b': '4.683'},
         'incorrect', ['0{,}468\\,3']),
]


# =============================================================================================
# 590169c4 — CM2-043, diviser par 10, 100, 1 000. F4 : le dividende manquant, puis le diviseur
# manquant. a : m chiffres entiers, q décimale(s) ; quotient à 3 décimales au plus.
# =============================================================================================

V_590 = [var('k', '1..3'), var('m', '1..3'), var('q', '0..1'), var('a', 'digits:m.q'),
         var('Q', 'eval:a/10^k;d')]
C_590 = ['a!=0', 'mod(a*10^q,10)!=0', 'a>=10^(m-1)', 'q+k<=3']

F4_DIVIDENDE = variation(
    'Complète.\n\n$$? \\div {{eval:10^k}} = {{Q}}$$',
    V_590,
    [case('{{eval:a;d}}', [
        erreur('{{eval:a/10^(2*k);d}}',
               'Tu as divisé ${{Q}}$ par ${{eval:10^k}}$ : le nombre cherché est ${{eval:10^k}}$ '
               'fois plus grand que ${{Q}}$.', 'Décalage dans le mauvais sens'),
    ])],
    [
        '**Diviser par $10$, $100$, $1000$** fait glisser chaque chiffre vers la droite. Pour '
        'retrouver le nombre de départ, on fait l\'inverse : on multiplie ${{Q}}$ par '
        '${{eval:10^k}}$, chaque chiffre glisse de ${{k}}$ rang{{if:k>1|s|}} vers la gauche.',
        '$${{Q}} \\times {{eval:10^k}} = {{solution}}$$',
        '$$' + couleur('{{solution}}') + ' \\div {{eval:10^k}} = {{Q}}$$',
    ],
    'Le nombre cherché, divisé par ${{eval:10^k}}$, donne ${{Q}}$ : quelle opération fait le '
    'chemin inverse ?',
    C_590,
)

F4_DIVISEUR = variation(
    'Complète avec $10$, $100$ ou $1\\,000$.\n\n$${{a}} \\div ? = {{Q}}$$',
    V_590,
    [case('{{eval:10^k}}', [
        erreur('{{eval:10^(-k);d}}',
               'Le quotient est plus petit que ${{a}}$ : on a divisé par un nombre plus grand que '
               '$1$.', 'Rapport inversé'),
    ])],
    [
        '**Diviser par $10$, $100$, $1000$.** Diviser par $10$ fait glisser chaque chiffre d\'un '
        'rang vers la droite ; par $100$, de deux rangs ; par $1000$, de trois rangs.',
        'De ${{a}}$ à ${{Q}}$, chaque chiffre a glissé de ${{k}}$ rang{{if:k>1|s|}} vers la '
        'droite.',
        '$${{a}} \\div ' + couleur('{{solution}}') + ' = {{Q}}$$',
    ],
    'Repère un chiffre de ${{a}}$ dans ${{Q}}$ : de combien de rangs a-t-il glissé vers la droite ?',
    C_590,
)

SPECS_59 = [
    spec('F4 : … ÷ 100 = 0,52', 0, {'k': '2', 'm': '2', 'q': '0', 'a': '52'}, 'correct', ['52']),
    spec('F4 : décalage dans le mauvais sens', 0, {'k': '2', 'm': '2', 'q': '0', 'a': '52'},
         'incorrect', ['0{,}0052'],
         'Tu as divisé $0{,}52$ par $100$ : le nombre cherché est $100$ fois plus grand que '
         '$0{,}52$.'),
    spec('F4 : un rang de moins (5,2)', 0, {'k': '2', 'm': '2', 'q': '0', 'a': '52'}, 'incorrect',
         ['5{,}2']),
    spec('F4 : … ÷ 1 000 = 0,317', 0, {'k': '3', 'm': '3', 'q': '0', 'a': '317'}, 'correct',
         ['317']),
    spec('F4 : 6,4 ÷ 100 = 0,064', 1, {'k': '2', 'm': '1', 'q': '1', 'a': '6.4'}, 'correct',
         ['100']),
    spec('F4 : rapport inversé (0,01)', 1, {'k': '2', 'm': '1', 'q': '1', 'a': '6.4'},
         'incorrect', ['0{,}01'],
         'Le quotient est plus petit que $6{,}4$ : on a divisé par un nombre plus grand que $1$.'),
    spec('F4 : 10 au lieu de 100', 1, {'k': '2', 'm': '1', 'q': '1', 'a': '6.4'}, 'incorrect',
         ['10']),
    spec('F4 : 1000 au lieu de 100', 1, {'k': '2', 'm': '1', 'q': '1', 'a': '6.4'}, 'incorrect',
         ['1000']),
]


# =============================================================================================
# 571ca739 — 6-118, produit de deux décimaux à partir d'un produit d'entiers. F6 : les DEUX
# facteurs décalés (u, v = 1 ou 2 rangs). M = le plus grand des deux décalages.
# =============================================================================================

F6 = variation(
    'Sachant que ${{A}} \\times {{B}} = {{eval:A*B}}$, calcule :\n\n$${{x}} \\times {{y}} = ?$$',
    [var('A', '11..99'), var('B', '11..99'), var('u', '1..2'), var('v', '1..2'),
     var('x', 'eval:A/10^u;d'), var('y', 'eval:B/10^v;d'), var('M', '{{if:u>=v|{{u}}|{{v}}}}')],
    [case('{{eval:A*B/10^(u+v);d}}', [
        erreur('{{eval:A*B/10^M;d}}',
               'Tu n\'as compté les décimales que d\'un seul facteur : ${{x}}$ en a ${{u}}$ et '
               '${{y}}$ en a ${{v}}$.', 'Décimales d\'un seul facteur'),
        erreur('{{eval:A*B}}',
               'Les deux facteurs sont plus petits que ${{A}}$ et ${{B}}$ : le produit est plus '
               'petit que ${{eval:A*B}}$.', 'Produit des entiers recopié'),
    ])],
    [
        '${{x}}$ est ${{eval:10^u}}$ fois plus petit que ${{A}}$, et ${{y}}$ est '
        '${{eval:10^v}}$ fois plus petit que ${{B}}$.',
        'Donc ${{x}} \\times {{y}}$ est ${{eval:10^u}} \\times {{eval:10^v}} = {{eval:10^(u+v)}}$ '
        'fois plus petit que ${{A}} \\times {{B}}$ : $' + couleur('{{u}}+{{v}}={{eval:u+v}}'
        '\\text{ décimales}') + '$.',
        '$${{x}} \\times {{y}} = {{eval:A*B}} \\div {{eval:10^(u+v)}} = ' + couleur('{{solution}}')
        + '$$',
    ],
    'Compare chaque facteur à ${{A}}$ et à ${{B}}$ : combien de fois est-il plus petit ?',
    ['mod(A,10)!=0', 'mod(B,10)!=0', 'mod(A*B,10)!=0'],
)

SPECS_57 = [
    spec('F6 : 2,3 × 0,47 = 1,081', 0, {'A': '23', 'B': '47', 'u': '1', 'v': '2'}, 'correct',
         ['1{,}081']),
    spec('F6 : point décimal accepté', 0, {'A': '23', 'B': '47', 'u': '1', 'v': '2'}, 'correct',
         ['1.081']),
    spec('F6 : décimales d\'un seul facteur', 0, {'A': '23', 'B': '47', 'u': '1', 'v': '2'},
         'incorrect', ['10{,}81'],
         'Tu n\'as compté les décimales que d\'un seul facteur : $2{,}3$ en a $1$ et $0{,}47$ en '
         'a $2$.'),
    spec('F6 : produit des entiers recopié', 0, {'A': '23', 'B': '47', 'u': '1', 'v': '2'},
         'incorrect', ['1\\,081'],
         'Les deux facteurs sont plus petits que $23$ et $47$ : le produit est plus petit que '
         '$1081$.'),
    spec('F6 : 0,23 × 0,47 = 0,108 1', 0, {'A': '23', 'B': '47', 'u': '2', 'v': '2'}, 'correct',
         ['0{,}108\\,1']),
    spec('F6 : 0,1081 sans espace', 0, {'A': '23', 'B': '47', 'u': '2', 'v': '2'},
         'unoptimal_form', ['0{,}1081'], violations=['spaces']),
    spec('F6 : 0,23 × 0,47, une seule fois deux décimales', 0,
         {'A': '23', 'B': '47', 'u': '2', 'v': '2'}, 'incorrect', ['10{,}81'],
         'Tu n\'as compté les décimales que d\'un seul facteur : $0{,}23$ en a $2$ et $0{,}47$ en '
         'a $2$.'),
]


# =============================================================================================
# ddbce820 — 6-118, produit de deux décimaux. F9 : somme ET produit des deux mêmes nombres,
# deux cases. a) deux décimaux à une décimale ; b) l'un à une décimale, l'autre à deux.
# =============================================================================================

F9_ENONCE = ('On considère les nombres ${{x}}$ et ${{y}}$.\n\nLeur somme : $?$\n\n'
             'Leur produit : $?$')

F9_A = variation(
    F9_ENONCE,
    [var('a', '2..9'), var('c', '2..9'), var('x', 'eval:a/10;d'), var('y', 'eval:c/10;d')],
    [
        case('{{eval:(a+c)/10;d}}', [
            erreur('{{eval:a*c/100;d}}',
                   'Tu as calculé le produit : la somme, c\'est ${{x}} + {{y}}$.',
                   'Produit au lieu de somme'),
            erreur('{{eval:(a+c)/100;d}}',
                   'Une somme de dixièmes s\'écrit en dixièmes : le résultat n\'a qu\'une '
                   'décimale.', 'Dixièmes écrits en centièmes'),
        ]),
        case('{{eval:a*c/100;d}}', [
            erreur('{{eval:a*c/10;d}}',
                   'Tu as gardé une seule décimale : dans un produit, on additionne les nombres '
                   'de décimales des deux facteurs.', 'Décimales mal comptées'),
            erreur('{{eval:(a+c)/10;d}}',
                   'Tu as calculé la somme : le produit, c\'est ${{x}} \\times {{y}}$.',
                   'Somme au lieu de produit'),
        ]),
    ],
    [
        '**Somme** : on additionne les dixièmes, ${{a}}$ dixièmes $+ {{c}}$ dixièmes $= '
        '{{eval:a+c}}$ dixièmes : ${{x}} + {{y}} = ' + couleur('{{eval:(a+c)/10;d}}') + '$.',
        '**Produit** : ${{a}} \\times {{c}} = {{eval:a*c}}$, et le produit a $1 + 1 = 2$ '
        'décimales : ${{x}} \\times {{y}} = ' + couleur('{{eval:a*c/100;d}}') + '$.',
    ],
    'La somme, c\'est le résultat d\'une addition ; le produit, celui d\'une multiplication. '
    'Compte bien les décimales dans chaque cas.',
    ['a*c != a+c'],
)

F9_B = variation(
    F9_ENONCE,
    [var('a', '2..9'), var('C', '11..99'), var('x', 'eval:a/10;d'), var('y', 'eval:C/100;d')],
    [
        case('{{eval:(10*a+C)/100;d}}', [
            erreur('{{eval:a*C/1000;d}}',
                   'Tu as calculé le produit : la somme, c\'est ${{x}} + {{y}}$.',
                   'Produit au lieu de somme'),
            erreur('{{eval:(a+C)/100;d}}',
                   'Tu as aligné les derniers chiffres : on aligne les virgules, dixièmes sous '
                   'dixièmes.', 'Chiffres alignés à droite'),
        ]),
        case('{{eval:a*C/1000;d}}', [
            erreur('{{eval:a*C/100;d}}',
                   'Dans un produit, on additionne les nombres de décimales des deux facteurs : '
                   '${{x}}$ en a une, ${{y}}$ en a deux.', 'Décimales mal comptées'),
            erreur('{{eval:(10*a+C)/100;d}}',
                   'Tu as calculé la somme : le produit, c\'est ${{x}} \\times {{y}}$.',
                   'Somme au lieu de produit'),
        ]),
    ],
    [
        '**Somme** : on aligne les virgules, ${{x}} = {{x}}0$, donc ${{x}} + {{y}} = {{x}}0 + {{y}} '
        '= ' + couleur('{{eval:(10*a+C)/100;d}}') + '$.',
        '**Produit** : ${{a}} \\times {{C}} = {{eval:a*C}}$, et le produit a $1 + 2 = 3$ '
        'décimales : ${{x}} \\times {{y}} = ' + couleur('{{eval:a*C/1000;d}}') + '$.',
    ],
    'La somme, c\'est le résultat d\'une addition ; le produit, celui d\'une multiplication. '
    'Compte bien les décimales dans chaque cas.',
    ['mod(C,10)!=0', 'mod(a*C,10)!=0', 'a*C != 10*a+C'],
)

SPECS_DD = [
    spec('F9a : 0,4 et 0,5', 0, {'a': '4', 'c': '5'}, 'correct', ['0{,}9', '0{,}2']),
    spec('F9a : 0,20 accepté pour le produit', 0, {'a': '4', 'c': '5'}, 'unoptimal_form',
         ['0{,}9', '0{,}20'], violations=['zeros']),
    spec('F9a : produit 2', 0, {'a': '4', 'c': '5'}, 'incorrect', ['0{,}9', '2'],
         'Tu as gardé une seule décimale : dans un produit, on additionne les nombres de décimales '
         'des deux facteurs.'),
    spec('F9a : produit à la place de la somme', 0, {'a': '4', 'c': '5'}, 'incorrect',
         ['0{,}2', '0{,}2'],
         'Tu as calculé le produit : la somme, c\'est $0{,}4 + 0{,}5$.'),
    spec('F9a : 0,7 + 0,8 = 1,5', 0, {'a': '7', 'c': '8'}, 'correct', ['1{,}5', '0{,}56']),
    spec('F9a : 0,7 + 0,8 = 0,15', 0, {'a': '7', 'c': '8'}, 'incorrect', ['0{,}15', '0{,}56'],
         'Une somme de dixièmes s\'écrit en dixièmes : le résultat n\'a qu\'une décimale.'),
    spec('F9b : 0,3 et 0,25', 1, {'a': '3', 'C': '25'}, 'correct', ['0{,}55', '0{,}075']),
    spec('F9b : alignés à droite', 1, {'a': '3', 'C': '25'}, 'incorrect', ['0{,}28', '0{,}075'],
         'Tu as aligné les derniers chiffres : on aligne les virgules, dixièmes sous dixièmes.'),
    spec('F9b : produit 0,75', 1, {'a': '3', 'C': '25'}, 'incorrect', ['0{,}55', '0{,}75'],
         'Dans un produit, on additionne les nombres de décimales des deux facteurs : $0{,}3$ en a '
         'une, $0{,}25$ en a deux.'),
    spec('F9b : somme au lieu de produit', 1, {'a': '3', 'C': '25'}, 'incorrect',
         ['0{,}55', '0{,}55'],
         'Tu as calculé la somme : le produit, c\'est $0{,}3 \\times 0{,}25$.'),
]


# =============================================================================================
# 7deff4e0 — 6-119, ordre de grandeur. F10 : arrondir chaque facteur (x à la dizaine, y à
# l'unité), puis l'ordre de grandeur du produit, trois cases. x = (100p + dl)/10, y = (10q + e)/10.
# =============================================================================================

F10 = variation(
    'On cherche un ordre de grandeur de ${{x}} \\times {{y}}$.\n\n'
    'Arrondi de ${{x}}$ à la dizaine : $?$\n\n'
    'Arrondi de ${{y}}$ à l\'unité : $?$\n\n'
    'Ordre de grandeur du produit : $?$',
    [var('p', '1..9'), var('dl', '-29..29'), var('x', 'eval:(100*p+dl)/10;d'),
     var('q', '2..9'), var('t', '-4..4'), var('y', 'eval:(10*q+t)/10;d')],
    [
        case('{{eval:10*p}}', [
            erreur('{{eval:10*floor((100*p+dl)/100)}}',
                   'Tu as gardé le chiffre des dizaines sans regarder le chiffre des unités : '
                   '${{x}}$ est plus près de la dizaine supérieure.', 'Troncature'),
            erreur('{{eval:round((100*p+dl)/10)}}',
                   'Tu as arrondi à l\'unité : on demande l\'arrondi à la dizaine.',
                   'Arrondi à l\'unité'),
        ]),
        case('{{q}}', [
            erreur('{{eval:floor((10*q+t)/10)}}',
                   'Tu as gardé la partie entière sans regarder le chiffre des dixièmes : '
                   '${{y}}$ est plus près de l\'unité supérieure.', 'Troncature'),
        ]),
        case('{{eval:10*p*q}}', [
            erreur('{{eval:round((100*p+dl)*(10*q+t)/100)}}',
                   'Tu as arrondi le produit exact : l\'ordre de grandeur se calcule avec les '
                   'arrondis des deux facteurs.', 'Produit exact arrondi'),
        ]),
    ],
    [
        '**Ordre de grandeur.** On remplace chaque facteur par un nombre proche, simple à '
        'calculer de tête.',
        '${{x}} \\approx ' + couleur('{{eval:10*p}}') + '$ (à la dizaine) et ${{y}} \\approx '
        + couleur('{{q}}') + '$ (à l\'unité).',
        '${{x}} \\times {{y}} \\approx {{eval:10*p}} \\times {{q}} = ' + couleur('{{eval:10*p*q}}')
        + '$.',
    ],
    'Pour arrondir à la dizaine, regarde le chiffre des unités ; à l\'unité, le chiffre des '
    'dixièmes. Puis multiplie les deux arrondis.',
    ['mod(dl,10)!=0', 't!=0'],
)

SPECS_7D = [
    spec('F10 : 19,8 × 5,1', 0, {'p': '2', 'dl': '-2', 'q': '5', 't': '1'}, 'correct',
         ['20', '5', '100']),
    spec('F10 : produit exact arrondi', 0, {'p': '2', 'dl': '-2', 'q': '5', 't': '1'},
         'incorrect', ['20', '5', '101'],
         'Tu as arrondi le produit exact : l\'ordre de grandeur se calcule avec les arrondis des '
         'deux facteurs.'),
    spec('F10 : troncature de 19,8', 0, {'p': '2', 'dl': '-2', 'q': '5', 't': '1'}, 'incorrect',
         ['10', '5', '100'],
         'Tu as gardé le chiffre des dizaines sans regarder le chiffre des unités : $19{,}8$ est '
         'plus près de la dizaine supérieure.'),
    spec('F10 : 31,7 × 4,8', 0, {'p': '3', 'dl': '17', 'q': '5', 't': '-2'}, 'correct',
         ['30', '5', '150']),
    spec('F10 : arrondi à l\'unité (32)', 0, {'p': '3', 'dl': '17', 'q': '5', 't': '-2'},
         'incorrect', ['32', '5', '150'],
         'Tu as arrondi à l\'unité : on demande l\'arrondi à la dizaine.'),
    spec('F10 : troncature de 4,8', 0, {'p': '3', 'dl': '17', 'q': '5', 't': '-2'}, 'incorrect',
         ['30', '4', '150'],
         'Tu as gardé la partie entière sans regarder le chiffre des dixièmes : $4{,}8$ est plus '
         'près de l\'unité supérieure.'),
]


# =============================================================================================
# 32b7a9bc — 6-120, problèmes de produits décimaux. F11a : prix au kilogramme, coût de 10 kg puis
# de 100 kg, une case par étape. P = prix d'un kilogramme en centimes.
# =============================================================================================

F11_PRIX = variation(
    'Au marché, les {{if:f==0|pommes|{{if:f==1|tomates|oranges}}}} coûtent $' + prix('P')
    + '~\\unit{€}$ le kilogramme.\n\n'
    'Combien coûtent $10~\\unit{kg}$ ? $?~\\text{€}$\n\n'
    'Combien coûtent $100~\\unit{kg}$ ? $?~\\text{€}$',
    [var('f', '0..2'), var('P', '101..599')],
    [
        case('{{eval:P/10;d}}', [
            erreur('{{eval:P/100;d}}',
                   'Écrire un $0$ à la fin de $' + prix('P') + '$ ne change pas sa valeur : '
                   'multiplier par $10$ fait glisser chaque chiffre d\'un rang vers la gauche.',
                   'Zéro ajouté à la fin'),
            erreur('{{eval:P/1000;d}}',
                   'Tu as divisé par $10$ : $10~\\unit{kg}$ coûtent plus cher qu\'$1~\\unit{kg}$.',
                   'Division au lieu de multiplication'),
        ]),
        case('{{P}}', [
            erreur('{{eval:P/100;d}}',
                   'Écrire des $0$ à la fin de $' + prix('P') + '$ ne change pas sa valeur : '
                   'multiplier par $100$ fait glisser chaque chiffre de deux rangs vers la gauche.',
                   'Zéros ajoutés à la fin'),
            erreur('{{eval:P/10000;d}}',
                   'Tu as divisé par $100$ : $100~\\unit{kg}$ coûtent plus cher qu\'$1~\\unit{kg}$.',
                   'Division au lieu de multiplication'),
        ]),
    ],
    [
        '**Prix à payer** $=$ masse $\\times$ prix d\'un kilogramme.',
        '$$10 \\times ' + prix('P') + ' = ' + couleur('{{eval:P/10;d}}') + '$$',
        '$$100 \\times ' + prix('P') + ' = ' + couleur('{{P}}') + '$$',
    ],
    'Multiplier par $10$ ou par $100$ fait glisser les chiffres vers la gauche dans le tableau de '
    'numération.',
    ['mod(P,10)!=0'],
)

SPECS_32 = [
    spec('F11a : 2,35 € le kg', 0, {'f': '0', 'P': '235'}, 'correct', ['23{,}5', '235']),
    spec('F11a : 23,50 accepté', 0, {'f': '0', 'P': '235'}, 'correct', ['23{,}50', '235']),
    spec('F11a : zéro ajouté à la fin', 0, {'f': '0', 'P': '235'}, 'incorrect',
         ['2{,}350', '235'],
         'Écrire un $0$ à la fin de $2{,}35$ ne change pas sa valeur : multiplier par $10$ fait '
         'glisser chaque chiffre d\'un rang vers la gauche.'),
    spec('F11a : division par 100', 0, {'f': '0', 'P': '235'}, 'incorrect', ['23{,}5', '0{,}0235'],
         'Tu as divisé par $100$ : $100~\\unit{kg}$ coûtent plus cher qu\'$1~\\unit{kg}$.'),
    spec('F11a : 100 kg à 23,5', 0, {'f': '0', 'P': '235'}, 'incorrect', ['23{,}5', '2\\,350']),
]


# =============================================================================================
# 87cfa41b — 6-122, problèmes de partage décimal. F11b : jus partagé en cL, arrondi au cL ;
# part en euros au centime par excès.
# =============================================================================================

F11_JUS = variation(
    'On partage ${{eval:Lt/10;d}}~\\unit{L}$ de jus de fruits entre ${{n}}$ verres, de façon '
    'égale. Combien de centilitres y a-t-il dans chaque verre, arrondi au centilitre ?\n\n'
    '$$?~\\text{cL}$$',
    [var('Lt', '10..25'), var('n', '6..12')],
    [case('{{eval:round(10*Lt/n)}}', [
        erreur('{{eval:floor(10*Lt/n)}}',
               'Tu as gardé la partie entière : pour arrondir au centilitre, regarde le chiffre '
               'des dixièmes.', 'Troncature'),
        erreur('{{eval:round(10*Lt/n)/100;d}}',
               'Tu as donné la réponse en litres : on la demande en centilitres.',
               'Réponse en litres'),
        erreur('{{eval:round(Lt/n)}}',
               '$1~\\unit{L} = 100~\\unit{cL}$ : convertis d\'abord la quantité de jus en '
               'centilitres.', 'Conversion fausse'),
    ])],
    [
        '**Partager en parts égales**, c\'est diviser. On convertit d\'abord : '
        '${{eval:Lt/10;d}}~\\unit{L} = {{eval:10*Lt}}~\\unit{cL}$.',
        '${{eval:10*Lt}} \\div {{n}} \\approx {{eval:floor(100*Lt/n)/10;d}}$ : le chiffre des '
        'dixièmes est ${{eval:mod(floor(100*Lt/n),10)}}$, on arrondit '
        '{{if:mod(floor(100*Lt/n),10)>=5|à l\'unité supérieure|à l\'unité inférieure}}.',
        'Chaque verre contient environ $' + couleur('{{solution}}') + '~\\unit{cL}$.',
    ],
    'Convertis d\'abord la quantité de jus en centilitres, puis partage. Pour arrondir à l\'unité, '
    'regarde le chiffre des dixièmes.',
    ['mod(20*Lt,n)!=0'],
)

F11_EXCES = variation(
    '${{n}}$ amis partagent ${{S}}~\\unit{€}$ en parts égales. Quelle est la part de chacun, '
    'arrondie au centime **par excès** ?\n\n$$?~\\text{€}$$',
    [var('S', '10..99'), var('n', '3..9')],
    [case('{{eval:ceil(100*S/n)/100;d}}', [
        erreur('{{eval:floor(100*S/n)/100;d}}',
               'Tu as arrondi par défaut : par excès, on prend le centime au-dessus.',
               'Arrondi par défaut'),
        erreur('{{eval:floor(S/n)+mod(S,n)/10;d}}',
               'Le reste de la division euclidienne n\'est pas la partie décimale : continue la '
               'division après la virgule.', 'Reste écrit après la virgule'),
        erreur('{{eval:floor(S/n)}}',
               'Tu as gardé la partie entière : continue la division jusqu\'aux centimes.',
               'Partie entière seulement'),
    ])],
    [
        '**Partager en parts égales**, c\'est diviser : part $=$ somme $\\div$ nombre de parts.',
        '${{S}} \\div {{n}} = {{eval:floor(1000*S/n)/1000;d}}\\ldots$ : la division ne tombe pas '
        'juste.',
        'Par excès, on prend le centime au-dessus : chacun reçoit $' + couleur('{{solution}}')
        + '~\\unit{€}$.',
    ],
    'Pose la division jusqu\'aux millièmes, puis arrondis au centime supérieur.',
    ['mod(100*S,n)!=0', 'S>=n'],
)

SPECS_87 = [
    spec('F11b : 1,5 L entre 8 verres', 0, {'Lt': '15', 'n': '8'}, 'correct', ['19']),
    spec('F11b : troncature (18)', 0, {'Lt': '15', 'n': '8'}, 'incorrect', ['18'],
         'Tu as gardé la partie entière : pour arrondir au centilitre, regarde le chiffre des '
         'dixièmes.'),
    spec('F11b : en litres (0,19)', 0, {'Lt': '15', 'n': '8'}, 'incorrect', ['0{,}19'],
         'Tu as donné la réponse en litres : on la demande en centilitres.'),
    spec('F11b : 1 L = 10 cL (2)', 0, {'Lt': '15', 'n': '8'}, 'incorrect', ['2'],
         '$1~\\unit{L} = 100~\\unit{cL}$ : convertis d\'abord la quantité de jus en centilitres.'),
    spec('F11b : 25 € entre 3', 1, {'S': '25', 'n': '3'}, 'correct', ['8{,}34']),
    spec('F11b : par défaut (8,33)', 1, {'S': '25', 'n': '3'}, 'incorrect', ['8{,}33'],
         'Tu as arrondi par défaut : par excès, on prend le centime au-dessus.'),
    spec('F11b : reste après la virgule (8,1)', 1, {'S': '25', 'n': '3'}, 'incorrect', ['8{,}1'],
         'Le reste de la division euclidienne n\'est pas la partie décimale : continue la division '
         'après la virgule.'),
    spec('F11b : partie entière (8)', 1, {'S': '25', 'n': '3'}, 'incorrect', ['8'],
         'Tu as gardé la partie entière : continue la division jusqu\'aux centimes.'),
    spec('F11b : 50 € entre 6, 8,34', 1, {'S': '50', 'n': '6'}, 'correct', ['8{,}34']),
]


# =============================================================================================
# 3f4bacc6 — 6-124, problèmes de division euclidienne. F12b : « combien pour un de plus »,
# colliers (quotient et reste), jour de la semaine dans N jours (choix parmi les 7 jours).
# =============================================================================================

F12_UN_DE_PLUS = variation(
    'Zoé a ${{N}}$ perles. Elle fait des colliers de ${{d}}$ perles chacun. Combien de perles lui '
    'manque-t-il pour faire un collier de plus ?\n\n$$?~\\text{perles}$$',
    [var('d', '8..15'), var('q', '3..12'), var('r', '1..{{eval:d-1}}'), var('N', 'eval:d*q+r')],
    [case('{{eval:d-r}}', [
        erreur('{{r}}',
               'Tu as donné le reste : ce sont les perles qui restent, pas celles qui manquent.',
               'Reste au lieu du complément'),
        erreur('{{eval:q+1}}',
               'Tu as compté des colliers : on demande un nombre de perles.',
               'Nombre de colliers'),
        erreur('{{d}}',
               'Un collier entier demande ${{d}}$ perles, mais il en reste déjà quelques-unes '
               'après les colliers complets.', 'Collier entier'),
    ])],
    [
        '**Division euclidienne.** Diviser $N$ par $d$, c\'est trouver le quotient $q$ et le reste '
        '$r$ tels que $N = (d \\times q) + r$, avec un reste plus petit que $d$.',
        '$${{N}} = ({{d}} \\times {{q}}) + ' + couleur('{{r}}', SECOND) + '$$',
        'Zoé fait ${{q}}$ colliers et il lui reste ${{r}}$ perle{{if:r>1|s|}}. Pour un collier de '
        'plus, il lui manque ${{d}} - {{r}} = ' + couleur('{{solution}}') + '$ perle{{if:d-r>1|s|}}.',
    ],
    'Cherche d\'abord combien de colliers complets Zoé peut faire et combien de perles il lui '
    'reste.',
    ['d != 2*r', 'q+1 != d-r', 'r != q+1', 'd != q+1'],
)

F12_COLLIERS = variation(
    'Avec ${{N}}$ perles, Zoé fait des colliers de ${{d}}$ perles chacun. Combien de colliers '
    'complets peut-elle faire ? Combien de perles lui reste-t-il ?\n\n'
    '$$?~\\text{colliers et}~?~\\text{perles restantes}$$',
    [var('d', '8..15'), var('q', '3..12'), var('r', '1..{{eval:d-1}}'), var('N', 'eval:d*q+r')],
    [
        case('{{q}}', [
            erreur('{{eval:q+1}}',
                   'Le dernier collier n\'est pas complet : il lui manque des perles.',
                   'Collier incomplet compté'),
            erreur('{{r}}',
                   'Tu as donné le reste : le nombre de colliers, c\'est le quotient.',
                   'Quotient et reste échangés'),
        ]),
        case('{{r}}', [
            erreur('{{eval:d-r}}',
                   'Tu as compté les perles qui manquent pour un collier de plus : on demande '
                   'celles qui restent.', 'Complément au lieu du reste'),
            erreur('{{q}}',
                   'Tu as donné le nombre de colliers : le nombre de perles restantes, c\'est le '
                   'reste.', 'Quotient et reste échangés'),
        ]),
    ],
    [
        '**Division euclidienne.** Diviser $N$ par $d$, c\'est trouver le quotient $q$ et le reste '
        '$r$ tels que $N = (d \\times q) + r$, avec un reste plus petit que $d$.',
        '$${{N}} = ({{d}} \\times ' + couleur('{{q}}') + ') + ' + couleur('{{r}}', SECOND) + '$$',
        'Zoé fait $' + couleur('{{q}}') + '$ colliers et il lui reste $' + couleur('{{r}}', SECOND)
        + '$ perle{{if:r>1|s|}}.',
    ],
    'Cherche combien de fois ${{d}}$ perles tiennent dans ${{N}}$ perles.',
    ['d != 2*r', 'r != q+1', 'r != q', 'q != d-r'],
)

F12_JOUR = variation(
    'Aujourd\'hui, nous sommes ' + jour('j') + '. Quel jour serons-nous dans ${{N}}$ jours ?\n\n'
    '```choix\nmelanger: non\n' + '\n'.join('- ' + j for j in JOURS) + '\n```',
    [var('j', '0..6'), var('N', '50..150'), var('q', 'eval:floor(N/7)'), var('r', 'eval:mod(N,7)'),
     var('k', 'eval:mod(j+N,7)')],
    [case('{{k}}')],
    [
        'Une semaine compte $7$ jours : on fait la division euclidienne de ${{N}}$ par $7$.',
        '$${{N}} = (7 \\times {{q}}) + ' + couleur('{{r}}', SECOND) + '$$',
        'Dans ${{eval:7*q}}$ jours, soit ${{q}}$ semaines, nous serons encore ' + jour('j')
        + ' ; ${{r}}$ jour{{if:r>1|s|}} plus tard, nous serons $' + couleur('\\text{' + jour('k')
        + '}') + '$.',
    ],
    'Les jours reviennent dans le même ordre toutes les semaines, c\'est-à-dire tous les $7$ jours.',
    ['r != 0'],
)

SPECS_3F = [
    spec('F12b : 87 perles, colliers de 12', 0, {'d': '12', 'q': '7', 'r': '3', 'N': '87'},
         'correct', ['9']),
    spec('F12b : le reste (3)', 0, {'d': '12', 'q': '7', 'r': '3', 'N': '87'}, 'incorrect', ['3'],
         'Tu as donné le reste : ce sont les perles qui restent, pas celles qui manquent.'),
    spec('F12b : nombre de colliers (8)', 0, {'d': '12', 'q': '7', 'r': '3', 'N': '87'},
         'incorrect', ['8'], 'Tu as compté des colliers : on demande un nombre de perles.'),
    spec('F12b : collier entier (12)', 0, {'d': '12', 'q': '7', 'r': '3', 'N': '87'}, 'incorrect',
         ['12'],
         'Un collier entier demande $12$ perles, mais il en reste déjà quelques-unes après les '
         'colliers complets.'),
    spec('F12b : 87 perles, 7 colliers et 3 perles', 1, {'d': '12', 'q': '7', 'r': '3', 'N': '87'},
         'correct', ['7', '3']),
    spec('F12b : collier incomplet compté', 1, {'d': '12', 'q': '7', 'r': '3', 'N': '87'},
         'incorrect', ['8', '3'],
         'Le dernier collier n\'est pas complet : il lui manque des perles.'),
    spec('F12b : complément au lieu du reste', 1, {'d': '12', 'q': '7', 'r': '3', 'N': '87'},
         'incorrect', ['7', '9'],
         'Tu as compté les perles qui manquent pour un collier de plus : on demande celles qui '
         'restent.'),
    spec('F12b : quotient décimal', 1, {'d': '12', 'q': '7', 'r': '3', 'N': '87'}, 'incorrect',
         ['7{,}25', '3']),
    spec('F12b : mardi + 100 jours = jeudi', 2, {'j': '1', 'N': '100'}, 'correct', ['3']),
    spec('F12b : mardi + 100 jours, même jour', 2, {'j': '1', 'N': '100'}, 'incorrect', ['1']),
    spec('F12b : mardi + 100 jours, un jour de moins', 2, {'j': '1', 'N': '100'},
         'incorrect', ['2']),
    spec('F12b : dimanche + 60 jours = jeudi', 2, {'j': '6', 'N': '60'}, 'correct', ['3']),
]


# =============================================================================================
# b586bdf8 — 6-114, additionner des décimaux. Q1 : 3 ou 4 termes, un entier et des décimaux,
# retenue vers les unités garantie. w = 1 : quatrième terme z.
# =============================================================================================

Q1_DEC = 'mod(A,10)*10+mod(B,100)+w*mod(D,100)'
Q1 = variation(
    'Calcule. Pose l\'opération sur ton brouillon si besoin.\n\n'
    '$${{n}} + {{x}} + {{y}}{{if:w==1| + {{z}}|}} = ?$$',
    [var('w', '0..1'), var('n', '12..499'), var('A', '11..999'), var('B', '101..9999'),
     var('D', '11..999'), var('x', 'eval:A/10;d'), var('y', 'eval:B/100;d'),
     var('z', 'eval:D/100;d'), var('S', 'eval:100*n+10*A+B+w*D')],
    [case('{{eval:S/100;d}}', [
        erreur('{{eval:(S-100*floor((' + Q1_DEC + ')/100))/100;d}}',
               'Tu as oublié la retenue : les chiffres après la virgule donnent plus d\'une '
               'unité, elle s\'ajoute aux unités.', 'Retenue oubliée'),
        erreur('{{eval:(S-100*n+n)/100;d}}',
               '${{n}}$ est un entier : ses chiffres se placent à gauche de la virgule.',
               'Entier aligné à droite'),
    ])],
    [
        '**Additionner des décimaux.** On écrit tous les nombres avec autant de chiffres après la '
        'virgule (ici deux), on aligne les virgules, puis on additionne colonne par colonne, de '
        'droite à gauche, en reportant les retenues.',
        '${{n}} = {{n}}.00$ et ${{x}} = {{x}}0$.',
        '$${{n}} + {{x}} + {{y}}{{if:w==1| + {{z}}|}} = ' + couleur('{{solution}}') + '$$',
    ],
    'Écris tous les nombres avec deux chiffres après la virgule, puis aligne les virgules en '
    'colonnes.',
    ['mod(A,10)!=0', 'mod(B,10)!=0', 'mod(D,10)!=0', 'mod(B+w*D,10)!=0', Q1_DEC + '>=100'],
)

SPECS_B5 = [
    spec('Q1 : 345 + 78,4 + 56,78 + 2,35', 0,
         {'w': '1', 'n': '345', 'A': '784', 'B': '5678', 'D': '235'}, 'correct', ['482{,}53']),
    spec('Q1 : retenue oubliée', 0, {'w': '1', 'n': '345', 'A': '784', 'B': '5678', 'D': '235'},
         'incorrect', ['481{,}53'],
         'Tu as oublié la retenue : les chiffres après la virgule donnent plus d\'une unité, elle '
         's\'ajoute aux unités.'),
    spec('Q1 : entier aligné à droite', 0,
         {'w': '1', 'n': '345', 'A': '784', 'B': '5678', 'D': '235'}, 'incorrect', ['140{,}98'],
         '$345$ est un entier : ses chiffres se placent à gauche de la virgule.'),
    spec('Q1 : 3 termes, 128 + 47,6 + 9,85', 0,
         {'w': '0', 'n': '128', 'A': '476', 'B': '985', 'D': '11'}, 'correct', ['185{,}45']),
    spec('Q1 : 3 termes, point décimal', 0,
         {'w': '0', 'n': '128', 'A': '476', 'B': '985', 'D': '11'}, 'correct', ['185.45']),
]


ajouter('2c5bae8f', [F1], SPECS_2C)
ajouter('819df2a9', [F4_PUISSANCE, F4_FACTEUR], SPECS_81)
ajouter('590169c4', [F4_DIVIDENDE, F4_DIVISEUR], SPECS_59)
ajouter('571ca739', [F6], SPECS_57)
ajouter('ddbce820', [F9_A, F9_B], SPECS_DD)
ajouter('7deff4e0', [F10], SPECS_7D)
ajouter('32b7a9bc', [F11_PRIX], SPECS_32)
ajouter('87cfa41b', [F11_JUS, F11_EXCES], SPECS_87)
ajouter('3f4bacc6', [F12_UN_DE_PLUS, F12_COLLIERS, F12_JOUR], SPECS_3F)
ajouter('b586bdf8', [Q1], SPECS_B5)
