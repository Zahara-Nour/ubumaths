"""Écrit les modèles neufs N1, N2, N3 du chantier idees-6e-entiers-decimaux.

Sortie : scripts/questions/idees-6e-entiers-decimaux-neufs-a/. Phase 0 validée par David le
2026-11-23 (journal docs/wip/idees-6e-entiers-decimaux-progress.md, section « Modèles neufs ») :
idées reprises d'ailleurs, mises à la forme de notre format.

- N1 « Recomposer un nombre décimal » (6-101) : somme de produits dans le désordre, décomposition
  à trous (une case par chiffre non nul), groupements (« 23 dixièmes et 5 centièmes »), en mots
  avec un rang vide (« 3 unités et 7 centièmes »). Nombres de 3 à 6 chiffres, au plus 3 décimales.
- N2 « Écrire un nombre sans zéros inutiles » (6-101) : règle `zeros` réglée `strict` (garder un
  zéro inutile, c'est ne pas avoir fait ce qu'on demande : mauvaise forme), `spaces` laissée au
  défaut (`warn`, ½ point) comme dans tous les modèles de 6e réglés « Espaces dès 4 chiffres ».
  Le nombre à nettoyer est écrit chiffre par chiffre (variables u0, u1…) : un nombre calculé ne
  porte pas de zéro de tête.
- N3 « Le nombre mystère » (6-101) : une chaîne d'indices, chacun fixe un chiffre à partir du
  précédent (double, moitié, plus grand de k, plus petit de k, somme des deux précédents) ; le
  dernier indice donne un chiffre. Solution unique par construction. Le type d'indice tiré est
  tiré une seconde fois (double, moitié ou somme), puis remplacé par « plus grand / plus petit de k » quand il ne
  donne toujours pas un chiffre (double de 7) :
  sans ce repli, une instance sur 25 seulement passait les conditions (100 essais au plus).

Grades 6, niveau 1 (comme le gabarit idees-6e-decimaux-neufs.py). Ni theme, ni domain, ni
subdomain, ni id, ni rangement (fait plus tard par migration).

Pièges suivis (couvrir-un-niveau.md § 9) : réponses des specs espacées dès 4 chiffres
(`7\\,030,05`), décimaux tirés en entiers (millièmes, centièmes) puis écrits par `;d`, ni `e` ni `i`
comme variable, `eval` sans `==` (indicatrices `1-min(abs(x-c),1)`), réponses attendues calculées
par `eval` (pas de `{{if}}` imbriqué dans une réponse).

Usage : python3 docs/wip/questions/idees-6e-entiers-decimaux-neufs-a.py \
            scripts/questions/idees-6e-entiers-decimaux-neufs-a
"""
import json
import os
import sys

DOSSIER = sys.argv[1]

PRIMAIRE = '\\textcolor{{{color:primary.0}}}'
OPTIONS = {'constraints': {'spacesFromFourDigits': True}}
OPTIONS_N2 = {'constraints': {'spacesFromFourDigits': True, 'zeros': 'strict'}}


def spec(desc, vi, variables_, status, answers, message=None, violations=None):
    expected = {'status': status}
    if message is not None:
        expected['expectedErrorMessage'] = message
    if violations is not None:
        expected['constraintViolations'] = violations
    elif status == 'unoptimal_form':
        expected['constraintViolations'] = ['spaces']
    return {'description': desc, 'variationIndex': vi, 'variables': variables_,
            'expected': expected, 'answers': answers}


def modele(title, description, level, delay, variations, specs, options=None):
    return {'title': title, 'description': description, 'grades': ['6'], 'level': level,
            'delay': delay, 'status': 'draft', 'options': options or OPTIONS,
            'variations': variations, 'testSpecs': specs}


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


def ecrire(nom, m):
    os.makedirs(DOSSIER, exist_ok=True)
    chemin = os.path.join(DOSSIER, nom + '.json')
    # Garder l'id écrit en tête par create-questions --publier, s'il existe
    if os.path.exists(chemin):
        with open(chemin, encoding='utf-8') as f:
            ancien = json.load(f)
        if 'id' in ancien:
            m = {'id': ancien['id'], **m}
    with open(chemin, 'w', encoding='utf-8') as f:
        json.dump(m, f, ensure_ascii=False, indent=2)
        f.write('\n')


# Indicatrices pour eval (qui ne connaît ni == ni >) : entiers seulement
def eq(a, c):
    return '(1-min(abs((' + a + ')-(' + str(c) + ')),1))'


def ge(a, c):
    return 'min(max((' + a + ')-(' + str(c) + ')+1,0),1)'


def le(a, c):
    return 'min(max((' + str(c) + ')-(' + a + ')+1,0),1)'


def selon(v, valeurs):
    """{{if}} imbriqué : valeurs = [(c, texte), …], le dernier texte sert de défaut."""
    (c, texte), reste = valeurs[0], valeurs[1:]
    if not reste:
        return texte
    return '{{if:' + v + '==' + str(c) + '|' + texte + '|' + selon(v, reste) + '}}'


# Nom d'un rang (puissance de 10), au pluriel, de -3 (millièmes) à 4 (dizaines de mille)
NOMS_RANGS = {4: 'dizaines de mille', 3: 'milliers', 2: 'centaines', 1: 'dizaines', 0: 'unités',
              -1: 'dixièmes', -2: 'centièmes', -3: 'millièmes'}
SINGULIERS = {4: 'dizaine de mille', 3: 'millier', 2: 'centaine', 1: 'dizaine', 0: 'unité',
              -1: 'dixième', -2: 'centième', -3: 'millième'}


def nom_rang(v, rangs):
    """Nom pluriel du rang porté par la variable v, parmi les rangs donnés."""
    return selon(v, [(r, NOMS_RANGS[r]) for r in rangs])


def nom_compte(v, rangs, compte):
    """« 1 centième », « 7 centièmes » : nom du rang v accordé avec la variable compte."""
    return selon(v, [(r, '{{if:' + compte + '>1|' + NOMS_RANGS[r] + '|' + SINGULIERS[r] + '}}')
                     for r in rangs])


def puissance(r):
    # 10^r écrit en décimal : 1000, 100, 10, 1, 0.1, 0.01, 0.001
    return '{{eval:10^' + r + ';d}}'


# =============================================================================================
# N1 — 6-101 : recomposer un nombre décimal
# =============================================================================================

# --- v0 : somme de produits « chiffre × puissance de 10 » dans le désordre, rangs vides ---
# Quatre chiffres a, b, c, d aux rangs r1 > r2 > r3 > r4 (écarts g de 1 ou 2, au moins un rang
# vide), r1 de 0 à 3, r4 de -1 à -3 : 5 ou 6 chiffres. N en millièmes.
N1_VARS0 = [
    var('h', '0..3'), var('g1', '1|2'), var('g2', '1|2'), var('g3', '1|2'),
    var('r1', 'eval:h'), var('r2', 'eval:h-g1'), var('r3', 'eval:h-g1-g2'),
    var('r4', 'eval:h-g1-g2-g3'),
    var('a', '1..9'), var('b', '1..9'), var('c', '1..9'), var('d', '1..9'), var('ordre', '0..2'),
    var('N', 'eval:a*10^(r1+3)+b*10^(r2+3)+c*10^(r3+3)+d*10^(r4+3)'),
    # Nombre de chiffres avant la virgule (rangs positifs ou nuls : r1 toujours, r4 jamais)
    var('m', 'eval:1+' + ge('r2', 0) + '+' + ge('r3', 0)),
    # Chiffres collés sans les zéros des rangs vides, partie entière Ic et partie décimale Dc
    var('Q', 'eval:1000*a+100*b+10*c+d'),
    var('Ic', 'eval:floor(Q/10^(4-m))'),
    var('Dc', 'eval:mod(Q,10^(4-m))'),
]
X0 = '{{eval:N/1000;d}}'
T = ['{{a}}\\times ' + puissance('r1'), '{{b}}\\times ' + puissance('r2'),
     '{{c}}\\times ' + puissance('r3'), '{{d}}\\times ' + puissance('r4')]
SOMME0 = selon('ordre', [(0, T[2] + '+' + T[0] + '+' + T[3] + '+' + T[1]),
                         (1, T[1] + '+' + T[3] + '+' + T[0] + '+' + T[2]),
                         (2, T[3] + '+' + T[1] + '+' + T[2] + '+' + T[0])])
RANGS = [3, 2, 1, 0, -1, -2, -3]

N1_V0 = variation(
    'Écris ce nombre en écriture décimale.\n\n$$' + SOMME0 + '=?$$',
    N1_VARS0,
    [case(X0, [
        erreur('{{eval:floor(N/1000)+Dc/10^(4-m);d}}',
               'Après la virgule, tu as oublié le zéro d\'un rang vide : chaque rang sans chiffre '
               's\'écrit $0$.', 'Zéro oublié après la virgule'),
        erreur('{{eval:Ic+mod(N,1000)/1000;d}}',
               'Avant la virgule, tu as oublié le zéro d\'un rang vide : chaque rang sans chiffre '
               's\'écrit $0$.', 'Zéro oublié avant la virgule'),
        erreur('{{eval:Ic+Dc/10^(4-m);d}}',
               'Tu as écrit les chiffres collés, sans les zéros des rangs vides : chaque rang sans '
               'chiffre s\'écrit $0$.', 'Zéros des rangs vides oubliés'),
    ])],
    [
        'Chaque produit place un chiffre à son rang : $' + T[0] + '$, c\'est ${{a}}$ '
        + nom_compte('r1', RANGS, 'a') + ' ; $' + T[1] + '$, ${{b}}$ '
        + nom_compte('r2', RANGS, 'b') + ' ; $' + T[2] + '$, ${{c}}$ '
        + nom_compte('r3', RANGS, 'c') + ' ; $' + T[3] + '$, ${{d}}$ '
        + nom_compte('r4', RANGS, 'd') + '.',
        'Les rangs sans chiffre s\'écrivent $0$ : $' + SOMME0 + '=' + PRIMAIRE + '{' + X0 + '}$.',
    ],
    'Range les produits du plus grand rang au plus petit : multiplier par $100$, c\'est le rang '
    'des centaines ; par $0{,}01$, celui des centièmes. Un rang sans chiffre s\'écrit $0$.',
    ['r4 >= -3', 'r4 <= -1', 'g1+g2+g3 >= 4', 'g1+g2+g3 <= 5'],
)

# --- v1 : décomposition à trous, une case par chiffre non nul ---
# Cinq chiffres, du rang h (1 à 3) au rang h - 4 ; un zéro à la place z (1 à 3, ni la première
# ni la dernière). Le k-ième chiffre non nul dk est à la place k - 1 (+ 1 après le zéro).
N1_VARS1 = [var('h', '1..3'), var('z', '1..3')]
for k in range(1, 5):
    N1_VARS1.append(var('d' + str(k), '1..9'))
for k in range(1, 5):
    N1_VARS1.append(var('R' + str(k), 'eval:h-(' + str(k - 1) + '+' + ge(str(k) + '-z', 1) + ')'))
N1_VARS1.append(var('N', 'eval:' + '+'.join('d' + str(k) + '*10^(R' + str(k) + '+3)'
                                             for k in range(1, 5))))
X1 = '{{eval:N/1000;d}}'
RANGS1 = [3, 2, 1, 0, -1, -2, -3]


def case_v1(k):
    rk = 'R' + str(k)
    return case('{{d' + str(k) + '}}', [
        # Le zéro sauté : on remplit la k-ième case avec le k-ième chiffre écrit
        erreur('{{eval:mod(floor(N/10^(h-' + str(k - 1) + '+3)),10)}}',
               'Ce n\'est pas le chiffre des ' + nom_rang(rk, RANGS1) + ' : le zéro de $' + X1
               + '$ occupe un rang, compte-le.', 'Rang décalé par le zéro'),
        # Dizaines et dixièmes confondus (rangs symétriques autour des unités)
        erreur('{{eval:mod(floor(N/10^(3-' + rk + ')),10)}}',
               'Tu as confondu les rangs de part et d\'autre des unités : multiplier par $'
               + puissance(rk) + '$, c\'est le rang des ' + nom_rang(rk, RANGS1) + '.',
               'Dizaines et dixièmes confondus'),
    ])


N1_V1 = variation(
    'Complète la décomposition de ce nombre.\n\n$$' + X1 + '=' + '+'.join(
        '(?\\times ' + puissance('R' + str(k)) + ')' for k in range(1, 5)) + '$$',
    N1_VARS1,
    [case_v1(k) for k in range(1, 5)],
    [
        'On écrit le rang de chaque chiffre de $' + X1 + '$ : le chiffre multiplié par $'
        + puissance('R1') + '$ est celui des ' + nom_rang('R1', RANGS1) + ', et ainsi de suite. '
        'Le zéro n\'apparaît pas dans la décomposition, mais il occupe un rang.',
        '$$' + X1 + '=' + '+'.join('(' + PRIMAIRE + '{ {{d' + str(k) + '}} }\\times '
                                   + puissance('R' + str(k)) + ')' for k in range(1, 5)) + '$$',
    ],
    'Écris sous chaque chiffre de $' + X1 + '$ son rang : multiplier par $10$, c\'est le rang des '
    'dizaines ; par $0{,}1$, celui des dixièmes.',
)

# --- v2 : groupements, « 23 dixièmes et 5 centièmes » ---
# A (11 à 999, sans 0 final) au rang -u1, B (1 à 9) au rang -u1-g. N en millièmes.
N1_VARS2 = [
    var('u1', '1|2'), var('g', '1|2'), var('A', '11..999'), var('B', '1..9'),
    var('ra', 'eval:-u1'), var('rb', 'eval:-u1-g'),
    var('nA', 'eval:2+' + ge('A', 100)),
    var('N', 'eval:A*10^(3-u1)+B*10^(3-u1-g)'),
]
X2 = '{{eval:N/1000;d}}'
UNITE_A = nom_rang('ra', [-1, -2])
UNITE_B = nom_compte('rb', [-2, -3], 'B')

N1_V2 = variation(
    'Quel nombre est égal à ${{A}}$ ' + UNITE_A + ' et ${{B}}$ ' + UNITE_B + ' ?\n\n$$?$$',
    N1_VARS2,
    [case(X2, [
        erreur('{{eval:A+B/10;d}}',
               'Tu as écrit ${{A}}$ et ${{B}}$ de part et d\'autre de la virgule : ${{A}}$ '
               + UNITE_A + ', ce n\'est pas ${{A}}$ unités.', 'Nombres juxtaposés'),
        erreur('{{eval:(A*10^(3-u1)+B*10^(2-u1))/1000;d}}',
               'Il manque un zéro : il n\'y a aucun centième, ce rang s\'écrit $0$.',
               'Rang vide oublié'),
        erreur('{{eval:(10*A+B)/10^(nA+1);d}}',
               'Tu as écrit ${{A}}$ juste après la virgule : ${{A}}$ ' + UNITE_A + ', c\'est '
               'plus d\'une unité.', 'Groupement écrit après la virgule'),
    ])],
    [
        '{{if:u1==1|$10$ dixièmes font $1$ unité : ${{A}}$ dixièmes, c\'est '
        '${{eval:A/10;d}}$.|$100$ centièmes font $1$ unité : ${{A}}$ centièmes, c\'est '
        '${{eval:A/100;d}}$.}} Et ${{B}}$ ' + UNITE_B + ', c\'est ${{eval:B*10^rb;d}}$.',
        '$${{eval:A*10^ra;d}}+{{eval:B*10^rb;d}}=' + PRIMAIRE + '{' + X2 + '}$$',
    ],
    'Convertis d\'abord le premier nombre : $10$ dixièmes font $1$ unité, $100$ centièmes font '
    '$1$ unité.',
    ['mod(A,10) != 0', 'u1+g <= 3'],
)

# --- v3 : en mots avec un rang vide, « 3 unités et 7 centièmes » ---
# a au rang rI (unités, dizaines, centaines) ; cas 0 : b centièmes ; cas 1 : b dixièmes et
# c millièmes ; cas 2 : b centièmes et c millièmes. N en millièmes.
N1_VARS3 = [
    var('a', '1..9'), var('rI', '0..2'), var('cas', '0..2'), var('b', '1..9'), var('c', '1..9'),
    var('rb', 'eval:-2+' + eq('cas', 1)), var('hc', 'eval:min(cas,1)'),
    var('N', 'eval:a*10^(rI+3)+b*10^(rb+3)+hc*c'),
]
X3 = '{{eval:N/1000;d}}'
NOM_A = nom_compte('rI', [0, 1, 2], 'a')
NOM_B = nom_compte('rb', [-1, -2], 'b')
NOM_C = '{{if:c>1|millièmes|millième}}'

N1_V3 = variation(
    'Quel nombre est égal à ${{a}}$ ' + NOM_A + '{{if:cas==0| et |, }}${{b}}$ ' + NOM_B
    + '{{if:cas==0|| et ${{c}}$ ' + NOM_C + '}} ?\n\n$$?$$',
    N1_VARS3,
    [case(X3, [
        erreur('{{eval:a*10^rI+b/10+hc*c/100;d}}',
               'Tu as oublié le zéro du rang vide après la virgule : '
               '{{if:cas==1|il n\'y a aucun centième|il n\'y a aucun dixième}}, ce rang s\'écrit '
               '$0$.', 'Zéro oublié après la virgule'),
        erreur('{{eval:a*10^rI+mod(N,1000)/10000;d}}',
               'Tu as écrit les chiffres trop loin après la virgule : les dixièmes sont au premier '
               'rang après la virgule, les centièmes au deuxième, les millièmes au troisième.',
               'Rangs décimaux décalés'),
        erreur('{{eval:a+mod(N,1000)/1000;d}}',
               '${{a}}$ ' + NOM_A + ', ce n\'est pas ${{a}}$ {{if:a>1|unités|unité}} : il manque '
               '{{if:rI==1|un zéro|deux zéros}} avant la virgule.', 'Zéros oubliés avant la virgule'),
    ])],
    [
        'On place chaque chiffre à son rang dans le tableau de numération : ${{a}}$ au rang des '
        + nom_rang('rI', [0, 1, 2]) + ', ${{b}}$ au rang des ' + nom_rang('rb', [-1, -2])
        + '{{if:cas==0||, ${{c}}$ au rang des millièmes}}.',
        'Les rangs vides s\'écrivent $0$ : le nombre est $' + PRIMAIRE + '{' + X3 + '}$.',
    ],
    'Place chaque chiffre dans un tableau de numération ; un rang sans chiffre s\'écrit $0$.',
)

SPECS_N1 = []
V0A = {'h': '2', 'g1': '2', 'g2': '1', 'g3': '2', 'a': '7', 'b': '3', 'c': '5', 'd': '4',
       'ordre': '0'}  # 7 × 100 + 3 × 1 + 5 × 0,1 + 4 × 0,001 = 703,504
SPECS_N1 += [
    spec('v0 : 703,504', 0, V0A, 'correct', ['703,504']),
    spec('v0 : zéro oublié après la virgule', 0, V0A, 'incorrect', ['703,54'],
         'Après la virgule, tu as oublié le zéro d\'un rang vide : chaque rang sans chiffre '
         's\'écrit $0$.'),
    spec('v0 : zéro oublié avant la virgule', 0, V0A, 'incorrect', ['73,504'],
         'Avant la virgule, tu as oublié le zéro d\'un rang vide : chaque rang sans chiffre '
         's\'écrit $0$.'),
    spec('v0 : tous les zéros oubliés', 0, V0A, 'incorrect', ['73,54'],
         'Tu as écrit les chiffres collés, sans les zéros des rangs vides : chaque rang sans '
         'chiffre s\'écrit $0$.'),
    spec('v0 : 7 030,05 (milliers, espacé)', 0,
         {'h': '3', 'g1': '2', 'g2': '1', 'g3': '2', 'a': '7', 'b': '3', 'c': '1', 'd': '5',
          'ordre': '2'}, 'correct', ['7\\,031,05']),
    spec('v0 : 7031,05 sans espace', 0,
         {'h': '3', 'g1': '2', 'g2': '1', 'g3': '2', 'a': '7', 'b': '3', 'c': '1', 'd': '5',
          'ordre': '2'}, 'unoptimal_form', ['7031,05']),
]
V1A = {'h': '3', 'z': '1', 'd1': '3', 'd2': '5', 'd3': '4', 'd4': '7'}  # 3 054,7
SPECS_N1 += [
    spec('v1 : 3 054,7 = 3 × 1 000 + 5 × 10 + 4 × 1 + 7 × 0,1', 1, V1A, 'correct',
         ['3', '5', '4', '7']),
    spec('v1 : zéro sauté (case 2 : 0)', 1, V1A, 'incorrect', ['3', '0', '4', '7'],
         'Ce n\'est pas le chiffre des dizaines : le zéro de $3054.7$ occupe un rang, compte-le.'),
    spec('v1 : dizaines et dixièmes confondus (case 2 : 7)', 1, V1A, 'incorrect',
         ['3', '7', '4', '7'],
         'Tu as confondu les rangs de part et d\'autre des unités : multiplier par $10$, c\'est le '
         'rang des dizaines.'),
    spec('v1 : 21,604 (h = 1)', 1, {'h': '1', 'z': '3', 'd1': '2', 'd2': '1', 'd3': '6', 'd4': '4'},
         'correct', ['2', '1', '6', '4']),
]
V2A = {'u1': '1', 'g': '1', 'A': '23', 'B': '5'}  # 2,35
V2B = {'u1': '1', 'g': '2', 'A': '23', 'B': '5'}  # 2,305
SPECS_N1 += [
    spec('v2 : 23 dixièmes et 5 centièmes = 2,35', 2, V2A, 'correct', ['2,35']),
    spec('v2 : juxtaposés (23,5)', 2, V2A, 'incorrect', ['23,5'],
         'Tu as écrit $23$ et $5$ de part et d\'autre de la virgule : $23$ dixièmes, ce n\'est pas '
         '$23$ unités.'),
    spec('v2 : après la virgule (0,235)', 2, V2A, 'incorrect', ['0,235'],
         'Tu as écrit $23$ juste après la virgule : $23$ dixièmes, c\'est plus d\'une unité.'),
    spec('v2 : 23 dixièmes et 5 millièmes = 2,305', 2, V2B, 'correct', ['2,305']),
    spec('v2 : rang vide oublié (2,35)', 2, V2B, 'incorrect', ['2,35'],
         'Il manque un zéro : il n\'y a aucun centième, ce rang s\'écrit $0$.'),
    spec('v2 : 347 centièmes et 1 millième = 3,471', 2, {'u1': '2', 'g': '1', 'A': '347', 'B': '1'},
         'correct', ['3,471']),
]
V3A = {'a': '3', 'rI': '0', 'cas': '0', 'b': '7', 'c': '2'}  # 3,07
V3B = {'a': '4', 'rI': '1', 'cas': '1', 'b': '2', 'c': '6'}  # 40,206
SPECS_N1 += [
    spec('v3 : 3 unités et 7 centièmes = 3,07', 3, V3A, 'correct', ['3,07']),
    spec('v3 : zéro oublié (3,7)', 3, V3A, 'incorrect', ['3,7'],
         'Tu as oublié le zéro du rang vide après la virgule : il n\'y a aucun dixième, ce rang '
         's\'écrit $0$.'),
    spec('v3 : trop loin (3,007)', 3, V3A, 'incorrect', ['3,007'],
         'Tu as écrit les chiffres trop loin après la virgule : les dixièmes sont au premier rang '
         'après la virgule, les centièmes au deuxième, les millièmes au troisième.'),
    spec('v3 : 4 dizaines, 2 dixièmes et 6 millièmes = 40,206', 3, V3B, 'correct', ['40,206']),
    spec('v3 : zéro des centièmes oublié (40,26)', 3, V3B, 'incorrect', ['40,26'],
         'Tu as oublié le zéro du rang vide après la virgule : il n\'y a aucun centième, ce rang '
         's\'écrit $0$.'),
    spec('v3 : dizaines prises pour des unités (4,206)', 3, V3B, 'incorrect', ['4,206'],
         '$4$ dizaines, ce n\'est pas $4$ unités : il manque un zéro avant la virgule.'),
]

N1 = modele(
    'Recomposer un nombre décimal',
    'Écrire un nombre décimal donné par une somme de produits dans le désordre (7 × 100 + 3 × 1 + '
    '5 × 0,01), compléter sa décomposition, le retrouver à partir de groupements (23 dixièmes et '
    '5 centièmes) ou en mots (3 unités et 7 centièmes) (pièges : zéros des rangs vides oubliés, '
    'groupement juxtaposé, dizaines et dixièmes confondus)',
    1, 60, [N1_V0, N1_V1, N1_V2, N1_V3], SPECS_N1)


# =============================================================================================
# N2 — 6-101 : écrire un nombre sans zéros inutiles
# =============================================================================================

# --- v0 : décimal « 004 012,500 » → 4 012,5 ---
# Partie entière I de nI chiffres (3 à 5), un seul zéro, intérieur (rang kz, 1 à nI - 2) ; lz zéros
# de tête. Partie décimale Dm (millièmes) de nD chiffres (dernier non nul), un zéro juste après la
# virgule si dz = 1 ; tz zéros de fin.
N2_VARS0 = [var('nI', '3..5'), var('kz', '1..3')]
for k in range(5):
    N2_VARS0.append(var('g' + str(k), '1..9'))
N2_VARS0.append(var('I', 'eval:' + '+'.join(
    'g' + str(k) + '*10^' + str(k) + '*' + ge('nI', k + 1) + '*min(abs(kz-' + str(k) + '),1)'
    for k in range(5))))
N2_VARS0 += [var('lz', '1|2'), var('T', 'eval:nI+lz'),
             var('nD', '1..3'), var('dz', '0|1'), var('h1', '1..9'), var('h2', '1..9'),
             var('h3', '1..9'),
             var('Dm', 'eval:100*h1*(1-dz)+10*h2*' + ge('nD', 2) + '+h3*' + ge('nD', 3)),
             var('tz', '1|2'), var('TD', 'eval:nD+tz'),
             # Partie entière sans son zéro intérieur
             var('Ir', 'eval:floor(I/10^(kz+1))*10^kz+mod(I,10^kz)')]
for k in range(6):
    N2_VARS0.append(var('u' + str(k), 'eval:mod(floor(I/10^' + str(k) + '),10)'))
for j in range(1, 4):
    N2_VARS0.append(var('q' + str(j), 'eval:mod(floor(Dm/10^' + str(3 - j) + '),10)'))


def entier_affiche(nb_places, separateurs):
    """Chiffres u_{n-1} … u0 affichés s'ils sont dans les T places, espace fine aux classes."""
    morceaux = []
    for k in range(nb_places - 1, -1, -1):
        if k in separateurs:
            morceaux.append('{{if:T>' + str(k) + '|{{u' + str(k) + '}}\\,|}}')
        elif k == 0:
            morceaux.append('{{u0}}')
        else:
            morceaux.append('{{if:T>' + str(k) + '|{{u' + str(k) + '}}|}}')
    return ''.join(morceaux)


# Espace fine après les chiffres de rang 3, 6, 9
AFFICHE0 = (entier_affiche(6, {3}) + '{,}{{q1}}{{if:TD>1|{{q2}}|}}{{if:TD>2|{{q3}}|}}'
            '{{if:TD>3|\\,0|}}')
X_N2 = '{{eval:I+Dm/1000;d}}'

N2_V0 = variation(
    'Écris ce nombre sans les zéros inutiles.\n\n$$' + AFFICHE0 + '=?$$',
    N2_VARS0,
    [case(X_N2, [
        erreur('{{eval:Ir+Dm/1000;d}}',
               'Tu as retiré un zéro utile : un zéro placé entre deux chiffres de la partie '
               'entière garde le rang des autres chiffres.', 'Zéro intérieur retiré'),
        erreur('{{eval:I+Dm/100;d}}',
               'Tu as retiré un zéro utile : le zéro juste après la virgule dit qu\'il n\'y a '
               'aucun dixième.', 'Zéro des dixièmes retiré'),
        erreur('{{eval:Ir+Dm*(1+9*dz)/1000;d}}',
               'Tu as retiré tous les zéros : seuls les zéros au début de la partie entière et à '
               'la fin de la partie décimale sont inutiles.', 'Tous les zéros retirés'),
    ])],
    [
        'Les zéros écrits au début de la partie entière et ceux de la fin de la partie décimale '
        'ne changent pas la valeur du nombre : on les retire. Les autres zéros gardent le rang des '
        'chiffres : on les garde.',
        '$$' + AFFICHE0 + '=' + PRIMAIRE + '{' + X_N2 + '}$$',
    ],
    'Un zéro au début de la partie entière ou à la fin de la partie décimale ne change pas la '
    'valeur du nombre ; un zéro placé entre deux chiffres, ou juste après la virgule, si.',
    ['kz <= nI-2', 'T <= 6', 'nD >= 1+dz', 'TD <= 4'],
)

# --- v1 : grand entier « 000 012 004 300 » → 12 004 300 ---
# N = A × 10^6 + B × 10^3 + C : A de nA chiffres non nuls (1 à 4), B de 1 à 99 (classe « 0bb »
# ou « 00b »), C = cH × 100 + cT × 10 (au moins un zéro de fin) ; lz zéros de tête, 12 places
# au plus.
N2_VARS1 = [var('nA', '1..4')]
for k in range(1, 5):
    N2_VARS1.append(var('a' + str(k), '1..9'))
N2_VARS1.append(var('A', 'eval:' + '+'.join(
    'a' + str(k) + '*10^' + str(k - 1) + '*' + ge('nA', k) for k in range(1, 5))))
N2_VARS1 += [var('B', '1..99'), var('cH', '1..9'), var('cT', '0..9'),
             var('C', 'eval:100*cH+10*cT'), var('N', 'eval:A*10^6+B*1000+C'),
             var('lz', '1..3'), var('T', 'eval:nA+6+lz'),
             var('nB', 'eval:1+' + ge('B', 10)),
             # Zéros de fin : 1 ou 2 ; C sans eux, Cn, de nC chiffres
             var('tz', 'eval:2-min(cT,1)'), var('Cn', 'eval:C/10^tz'), var('nC', 'eval:3-tz')]
for k in range(12):
    N2_VARS1.append(var('u' + str(k), 'eval:mod(floor(N/10^' + str(k) + '),10)'))
AFFICHE1 = entier_affiche(12, {9, 6, 3})

N2_V1 = variation(
    'Écris ce nombre sans les zéros inutiles.\n\n$$' + AFFICHE1 + '=?$$',
    N2_VARS1,
    [case('{{N}}', [
        erreur('{{eval:(A*10^nB+B)*1000+C}}',
               'Tu as retiré des zéros utiles au milieu du nombre : après la première classe, '
               'chaque classe garde ses trois chiffres.', 'Zéros du milieu retirés'),
        erreur('{{eval:N/10^tz}}',
               'Tu as retiré les zéros de la fin : dans un nombre entier, ils sont utiles, ils '
               'donnent leur rang aux autres chiffres.', 'Zéros de fin retirés'),
        erreur('{{eval:(A*10^nB+B)*10^nC+Cn}}',
               'Tu as retiré tous les zéros : dans un nombre entier, seuls les zéros écrits au '
               'début sont inutiles.', 'Tous les zéros retirés'),
    ])],
    [
        'Dans un nombre entier, seuls les zéros écrits au début (à gauche) ne changent pas sa '
        'valeur : on les retire. Les zéros du milieu et de la fin gardent le rang des autres '
        'chiffres.',
        '$$' + AFFICHE1 + '=' + PRIMAIRE + '{ {{N}} }$$',
    ],
    'Dans un nombre entier, seuls les zéros écrits au début sont inutiles. Garde des classes de '
    'trois chiffres, sauf la première.',
    ['mod(B,10) != 0', 'T <= 12'],
)

V20 = {'nI': '4', 'kz': '2', 'g0': '2', 'g1': '1', 'g2': '5', 'g3': '4', 'g4': '9', 'lz': '2',
       'nD': '1', 'dz': '0', 'h1': '5', 'h2': '3', 'h3': '8', 'tz': '2'}  # 004 012,500 → 4 012,5
V21 = {'nI': '3', 'kz': '1', 'g0': '8', 'g1': '1', 'g2': '6', 'g3': '4', 'g4': '9', 'lz': '1',
       'nD': '2', 'dz': '1', 'h1': '5', 'h2': '3', 'h3': '8', 'tz': '1'}  # 0 608,030 → 608,03
V22 = {'nA': '2', 'a1': '2', 'a2': '1', 'a3': '5', 'a4': '5', 'B': '4', 'cH': '3', 'cT': '0',
       'lz': '3'}  # 000 012 004 300 → 12 004 300
SPECS_N2 = [
    spec('v0 : 004 012,500 → 4 012,5', 0, V20, 'correct', ['4\\,012,5']),
    spec('v0 : sans espace', 0, V20, 'unoptimal_form', ['4012,5']),
    spec('v0 : zéros de fin gardés', 0, V20, 'bad_form', ['4\\,012,500'], violations=['zeros', 'form']),
    spec('v0 : zéros de tête gardés', 0, V20, 'bad_form', ['004\\,012,5'], violations=['zeros', 'form']),
    spec('v0 : zéro intérieur retiré (412,5)', 0, V20, 'incorrect', ['412,5'],
         'Tu as retiré un zéro utile : un zéro placé entre deux chiffres de la partie entière '
         'garde le rang des autres chiffres.'),
    spec('v0 : 0 608,030 → 608,03', 0, V21, 'correct', ['608,03']),
    spec('v0 : zéro des dixièmes retiré (608,3)', 0, V21, 'incorrect', ['608,3'],
         'Tu as retiré un zéro utile : le zéro juste après la virgule dit qu\'il n\'y a aucun '
         'dixième.'),
    spec('v0 : tous les zéros retirés (68,3)', 0, V21, 'incorrect', ['68,3'],
         'Tu as retiré tous les zéros : seuls les zéros au début de la partie entière et à la fin '
         'de la partie décimale sont inutiles.'),
    spec('v1 : 000 012 004 300 → 12 004 300', 1, V22, 'correct', ['12\\,004\\,300']),
    spec('v1 : sans espaces', 1, V22, 'unoptimal_form', ['12004300']),
    spec('v1 : zéros de tête gardés', 1, V22, 'bad_form', ['012\\,004\\,300'],
         violations=['zeros', 'form']),
    spec('v1 : zéros du milieu retirés (124 300)', 1, V22, 'incorrect', ['124\\,300'],
         'Tu as retiré des zéros utiles au milieu du nombre : après la première classe, chaque '
         'classe garde ses trois chiffres.'),
    spec('v1 : zéros de fin retirés (120 043)', 1, V22, 'incorrect', ['120\\,043'],
         'Tu as retiré les zéros de la fin : dans un nombre entier, ils sont utiles, ils donnent '
         'leur rang aux autres chiffres.'),
    spec('v1 : tous les zéros retirés (1 243)', 1, V22, 'incorrect', ['1\\,243'],
         'Tu as retiré tous les zéros : dans un nombre entier, seuls les zéros écrits au début '
         'sont inutiles.'),
]

N2 = modele(
    'Écrire un nombre sans zéros inutiles',
    'Réécrire un nombre décimal (004 012,500) ou un grand entier (000 012 004 300) sans ses zéros '
    'inutiles, classes séparées (pièges : zéro utile retiré au milieu, après la virgule ou à la fin '
    'd\'un entier)',
    1, 45, [N2_V0, N2_V1], SPECS_N2, OPTIONS_N2)


# =============================================================================================
# N3 — 6-101 : le nombre mystère
# =============================================================================================
# Chaîne D0 (donné), D1 … D4 ; Dj se déduit de x = D(j-1) (et z = D(j-2) pour la somme) par le
# type tj : 0 double, 1 moitié, 2 plus grand de kj, 3 plus petit de kj, 4 somme x + z. Le type tiré
# pj est gardé s'il donne un chiffre, sinon un second tirage qj parmi double, moitié, somme, sinon
# 3 (x ≥ 5) ou 2 (x ≤ 4). Rang de Dj :
# Rj = j (sens 0, on part des unités) ou n - 1 - j (sens 1, on part du premier chiffre).
# v0 : entier de n chiffres ; v1 : décimal, rangs décalés de -2 (deux chiffres après la virgule).
# Erreurs prévues : chiffres dans l'ordre inverse ; « plus grand / plus petit » pris à l'envers ;
# « double / moitié » pris à l'envers. Une chaîne fausse qui ne donne pas des chiffres est
# remplacée par la bonne réponse (erreur ignorée sur ce tirage).


def lien(t, x, z, k):
    return ('(' + eq(t, 0) + '*2*(' + x + ')+' + eq(t, 1) + '*(' + x + ')/2+' + eq(t, 2) + '*(('
            + x + ')+' + k + ')+' + eq(t, 3) + '*((' + x + ')-' + k + ')+' + eq(t, 4) + '*(('
            + x + ')+(' + z + ')))')


def chiffre_ok(v):
    # 1 si v est un entier de 0 à 9, sinon 0
    return '(1-ceil((' + v + ')-floor(' + v + ')))*' + ge(v, 0) + '*' + le(v, 9)


def vars_n3():
    vs = [var('n', '4|5'), var('sens', '0|1'), var('D0', '1..9')]
    for j in range(1, 5):
        x = 'D' + str(j - 1)
        z = 'D' + str(j - 2) if j >= 2 else '0'
        sj = str(j)
        vs.append(var('p' + sj, '0..3' if j == 1 else '0..4'))
        vs.append(var('w' + sj, '0..59'))
        valides = [ge(x, 1) + '*' + le(x, 4),
                   eq('mod(' + x + ',2)', 0) + '*' + ge(x, 2),
                   le(x, 8),
                   ge(x, 1),
                   le(x + '+' + z, 9) + '*' + ge(z, 1)]
        vs.append(var('q' + sj, '0|1' if j == 1 else '0|1|4'))
        vs.append(var('ok' + sj, 'eval:' + '+'.join(eq('p' + sj, c) + '*' + v
                                                    for c, v in enumerate(valides))))
        vs.append(var('oq' + sj, 'eval:' + '+'.join(eq('q' + sj, c) + '*' + v
                                                    for c, v in enumerate(valides))))
        vs.append(var('t' + sj, 'eval:ok' + sj + '*p' + sj + '+(1-ok' + sj + ')*(oq' + sj
                      + '*q' + sj + '+(1-oq' + sj + ')*(2+' + ge(x, 5) + '))'))
        vs.append(var('k' + sj, 'eval:1+mod(w' + sj + ',' + eq('t' + sj, 2) + '*(9-' + x + ')+'
                      + eq('t' + sj, 3) + '*' + x + '+1-' + eq('t' + sj, 2) + '-'
                      + eq('t' + sj, 3) + ')'))
        vs.append(var('D' + sj, 'eval:' + lien('t' + sj, x, z, 'k' + sj)))
    for j in range(5):
        vs.append(var('R' + str(j), 'eval:' + str(j) + '+sens*(n-1-' + str(2 * j) + ')'))
    # Chaînes fausses : E (plus grand / plus petit échangés), F (double / moitié échangés)
    for lettre, echange in (('E', (2, 3)), ('F', (0, 1))):
        a_, b_ = echange
        vs.append(var(lettre + '0', 'eval:D0'))
        for j in range(1, 5):
            sj = str(j)
            t = 't' + sj
            tt = ('(' + t + '+' + eq(t, a_) + '*' + str(b_ - a_) + '+' + eq(t, b_) + '*'
                  + str(a_ - b_) + ')')
            x = lettre + str(j - 1)
            z = lettre + str(j - 2) if j >= 2 else '0'
            vs.append(var(lettre + sj, 'eval:' + lien(tt, x, z, 'k' + sj)))
        vs.append(var('ok' + lettre, 'eval:' + '*'.join(
            [chiffre_ok(lettre + str(j)) for j in range(4)]
            + ['(1-(n-4)*(1-' + chiffre_ok(lettre + '4') + '))'])))
    return vs


def valeur(prefixe, rang):
    """Somme des Dj × 10^(rang j) sur les n chiffres."""
    return '+'.join(prefixe + str(j) + '*10^(' + rang(j) + ')' + ('*(n-4)' if j == 4 else '')
                    for j in range(5))


def conditions_n3(decimal):
    cs = []
    for a_ in range(5):
        for b_ in range(a_ + 1, 5):
            if b_ == 4:
                cs.append('abs(D' + str(a_) + '-D4)+(5-n) >= 1')
            else:
                cs.append('abs(D' + str(a_) + '-D' + str(b_) + ') >= 1')
    for j in range(1, 5):
        cs.append('D' + str(j) + ' >= 0')
        cs.append('D' + str(j) + ' <= 9')
    # Premier chiffre non nul ; en décimal, chiffre des centièmes non nul
    cs.append('(1-sens)*((5-n)*D3+(n-4)*D4)+sens*D0 >= 1')
    if decimal:
        cs.append('(1-sens)*D0+sens*((5-n)*D3+(n-4)*D4) >= 1')
    return cs


def n3(decimal):
    base = -2 if decimal else 0
    rangs = list(range(base, base + 5))
    div = '/100' if decimal else ''

    def nom(j):
        return nom_rang('R' + str(j) if base == 0 else 'R' + str(j) + 'b', rangs)

    variables = vars_n3()
    if decimal:
        for j in range(5):
            variables.append(var('R' + str(j) + 'b', 'eval:R' + str(j) + '-2'))
    variables += [
        var('V', 'eval:' + valeur('D', lambda j: 'R' + str(j))),
        var('Vr', 'eval:' + valeur('D', lambda j: 'n-1-R' + str(j))),
        var('VE', 'eval:okE*(' + valeur('E', lambda j: 'R' + str(j)) + ')+(1-okE)*V'),
        var('VF', 'eval:okF*(' + valeur('F', lambda j: 'R' + str(j)) + ')+(1-okF)*V'),
    ]
    x_ = '{{eval:V' + div + ';d}}'

    def indice(j):
        sj = str(j)
        avant = nom(j - 1)
        phrase = selon('t' + sj, [
            (0, 'le double de mon chiffre des ' + avant),
            (1, 'la moitié de mon chiffre des ' + avant),
            (2, 'plus grand de ${{k' + sj + '}}$ que mon chiffre des ' + avant),
            (3, 'plus petit de ${{k' + sj + '}}$ que mon chiffre des ' + avant),
            (4, 'la somme de mes chiffres des ' + avant + ' et des ' + (nom(j - 2) if j >= 2 else '')),
        ])
        return 'Mon chiffre des ' + nom(j) + ' est ' + phrase + '.'

    def deduction(j):
        sj = str(j)
        x = '{{D' + str(j - 1) + '}}'
        calcul = selon('t' + sj, [
            (0, 'le double de $' + x + '$'),
            (1, 'la moitié de $' + x + '$'),
            (2, '$' + x + '+{{k' + sj + '}}$'),
            (3, '$' + x + '-{{k' + sj + '}}$'),
            (4, '$' + x + '+{{D' + str(max(j - 2, 0)) + '}}$'),
        ])
        return ('- Chiffre des ' + nom(j) + ' : ' + calcul + ', soit $' + PRIMAIRE
                + '{ {{D' + sj + '}} }$.')

    presentation = ('Je suis un nombre {{if:n==5|entier de $5$ chiffres|entier de $4$ chiffres}}, '
                    'tous différents.' if not decimal else
                    'Je suis un nombre décimal de {{if:n==5|$5$|$4$}} chiffres, tous différents, '
                    'dont deux après la virgule.')
    lignes = ['- ' + indice(j) for j in range(1, 4)]
    lignes[-1] += '{{if:n==5|\n- ' + indice(4) + '|}}'
    lignes.append('- Mon chiffre des ' + nom(0) + ' est ${{D0}}$.')
    statement = presentation + '\n\n' + '\n'.join(lignes) + '\n\nQui suis-je ?\n\n$$?$$'

    deductions = [deduction(j) for j in range(1, 4)]
    deductions[-1] += '{{if:n==5|\n' + deduction(4) + '|}}'
    premier = ('{{if:n==5|dizaines de mille|milliers}}' if not decimal
               else '{{if:n==5|centaines|dizaines}}')
    return variation(
        statement,
        variables,
        [case(x_, [
            erreur('{{eval:Vr' + div + ';d}}',
                   'Tu as trouvé les bons chiffres, mais tu les as écrits dans l\'ordre inverse : '
                   'le chiffre des ' + premier + ' s\'écrit en premier, à gauche.',
                   'Chiffres dans l\'ordre inverse'),
            erreur('{{eval:VE' + div + ';d}}',
                   'Relis les indices « plus grand » et « plus petit » : tu les as pris à l\'envers.',
                   'Plus grand et plus petit inversés'),
            erreur('{{eval:VF' + div + ';d}}',
                   'Relis les indices « double » et « moitié » : tu les as pris à l\'envers. Le '
                   'double d\'un chiffre est plus grand que lui.', 'Double et moitié inversés'),
        ])],
        [
            'Le dernier indice donne directement un chiffre : le chiffre des ' + nom(0)
            + ' est ${{D0}}$. On s\'en sert pour trouver les autres, un par un, en remontant les '
            'indices.',
            '\n'.join(deductions),
            'Le nombre mystère est $' + PRIMAIRE + '{' + x_ + '}$.',
        ],
        'Commence par l\'indice qui donne un chiffre directement, puis sers-toi de ce chiffre pour '
        'trouver les autres, un par un.',
        conditions_n3(decimal),
    )


N3_V0 = n3(False)
N3_V1 = n3(True)

# Specs : on fixe tous les tirages (types pj gardés car valides)
# v0 : n = 4, sens 0, D0 = 3 (unités) ; p1 = 0 double → 6 (dizaines) ; p2 = 3 plus petit de k
# (w2 = 1, room = 6, k = 2) → 4 (centaines) ; p3 = 4 somme 4 + 6 = 10 ✗ → repli plus petit (x = 4
# < 5 → plus grand) : on choisit plutôt p3 = 1 moitié de 4 → 2 (milliers) ; nombre 2 463.
S30 = {'n': '4', 'sens': '0', 'D0': '3', 'p1': '0', 'w1': '0', 'p2': '3', 'w2': '1', 'p3': '1',
       'w3': '0', 'p4': '2', 'w4': '0',
       'q1': '0', 'q2': '0', 'q3': '0', 'q4': '0'}
# v0 bis : n = 5, sens 1, D0 = 2 (dizaines de mille) ; p1 = 0 double → 4 (milliers) ; p2 = 2 plus
# grand (w2 = 4, room 5, k = 5) → 9 (centaines) ; p3 = 3 plus petit (w3 = 1, room 9, k = 2) → 7
# (dizaines) ; p4 = 3 plus petit (w4 = 0, k = 1) → 6 (unités) ; nombre 24 976. Chaîne « double /
# moitié inversés » : 2, 1, 6, 4, 3 → 21 643.
S31 = {'n': '5', 'sens': '1', 'D0': '2', 'p1': '0', 'w1': '0', 'p2': '2', 'w2': '4', 'p3': '3',
       'w3': '1', 'p4': '3', 'w4': '0',
       'q1': '0', 'q2': '0', 'q3': '0', 'q4': '0'}
# v1 : n = 4, sens 0, D0 = 5 (centièmes) ; p1 = 2 plus grand (w1 = 1, room 4, k = 2) → 7
# (dixièmes) ; p2 = 3 plus petit (w2 = 3, room 7, k = 4) → 3 (unités) ; p3 = 0 double de 3 → 6
# (dizaines) ; nombre 63,75.
S32 = {'n': '4', 'sens': '0', 'D0': '5', 'p1': '2', 'w1': '1', 'p2': '3', 'w2': '3', 'p3': '0',
       'w3': '0', 'p4': '0', 'w4': '0',
       'q1': '0', 'q2': '0', 'q3': '0', 'q4': '0'}
SPECS_N3 = [
    spec('v0 : 2 463', 0, S30, 'correct', ['2\\,463']),
    spec('v0 : ordre inverse (3 642)', 0, S30, 'incorrect', ['3\\,642'],
         'Tu as trouvé les bons chiffres, mais tu les as écrits dans l\'ordre inverse : le chiffre '
         'des milliers s\'écrit en premier, à gauche.'),
    spec('v0 : plus petit pris pour plus grand (4 863)', 0, S30, 'incorrect', ['4\\,863'],
         'Relis les indices « plus grand » et « plus petit » : tu les as pris à l\'envers.'),
    spec('v0 : 24 976', 0, S31, 'correct', ['24\\,976']),
    spec('v0 : double et moitié inversés (21 643)', 0, S31, 'incorrect', ['21\\,643'],
         'Relis les indices « double » et « moitié » : tu les as pris à l\'envers. Le double d\'un '
         'chiffre est plus grand que lui.'),
    spec('v1 : 63,75', 1, S32, 'correct', ['63,75']),
    spec('v1 : ordre inverse (57,36)', 1, S32, 'incorrect', ['57,36'],
         'Tu as trouvé les bons chiffres, mais tu les as écrits dans l\'ordre inverse : le chiffre '
         'des dizaines s\'écrit en premier, à gauche.'),
]

N3 = modele(
    'Le nombre mystère',
    'Trouver un nombre entier (4 ou 5 chiffres) ou décimal (deux chiffres après la virgule) à '
    'partir d\'indices sur ses chiffres : un chiffre donné, double, moitié, plus grand ou plus '
    'petit de k, somme (pièges : chiffres écrits dans l\'ordre inverse, indices pris à l\'envers)',
    1, 90, [N3_V0, N3_V1], SPECS_N3)


ecrire('n1-recomposer-nombre-decimal', N1)
ecrire('n2-ecrire-sans-zeros-inutiles', N2)
ecrire('n3-nombre-mystere', N3)
print('3 modèles écrits dans', DOSSIER)
