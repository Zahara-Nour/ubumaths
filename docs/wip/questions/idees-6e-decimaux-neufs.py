"""Écrit les modèles neufs du chantier idees-6e-decimaux dans scripts/questions/idees-6e-decimaux-neufs/.

Phase 0 validée par David le 2026-11-22 (journal docs/wip/idees-6e-decimaux-progress.md) : F2, F3,
F5, F7, F8 (un seul modèle, sur le produit), F12a. On reprend l'idée de l'autre plateforme, pas sa
forme : une case qui se tape plutôt qu'un QCM, le dénominateur donné plutôt que « toute fraction
égale ».

Grades 6. Ni theme, ni domain, ni subdomain, ni id : le rangement (nœud du point + tag) se fera
par migration, après la création en brouillon. Points visés (pour la migration) : F2 → 6-106,
F3 → 6-101, F5 → 6-115, F7 et F8 → 6-118, F12a → 6-123.

Réglage commun : « Espaces dès 4 chiffres » (spacesFromFourDigits), règle de l'école en 6e
(1 000, 1 247) : `1000` tapé est juste mais remarqué.

Règles suivies (couvrir-un-niveau.md § 5) : erreurs prévues par case d'écriture ordinaire (de
vraies erreurs d'élèves, sans en inventer pour atteindre trois), chacune avec sa spec `incorrect`
qui nomme son message ; un coup de pouce par variation, qui ne donne jamais la réponse ; pas de
Oui / Non nu. L'opération posée (F7) et le QCM (F12a c) n'ont pas d'erreurs prévues : ce ne sont
pas des cases d'écriture ordinaire.

Usage : python3 docs/wip/questions/idees-6e-decimaux-neufs.py scripts/questions/idees-6e-decimaux-neufs
"""
import json
import os
import sys

DOSSIER = sys.argv[1]

PRIMAIRE = '\\textcolor{{{color:primary.0}}}'
SECOND = '\\textcolor{{{color:primary.1}}}'
OPTIONS = {'constraints': {'spacesFromFourDigits': True}}


def spec(desc, vi, variables_, status, answers, message=None):
    expected = {'status': status}
    if message is not None:
        expected['expectedErrorMessage'] = message
    if status == 'unoptimal_form':
        # Seule remarque de forme de ce lot : « Espaces dès 4 chiffres »
        expected['constraintViolations'] = ['spaces']
    return {'description': desc, 'variationIndex': vi, 'variables': variables_,
            'expected': expected, 'answers': answers}


def modele(title, description, level, delay, variations, specs):
    return {'title': title, 'description': description, 'grades': ['6'], 'level': level,
            'delay': delay, 'status': 'draft', 'options': OPTIONS,
            'variations': variations, 'testSpecs': specs}


def bloc(nom, *lignes):
    return '```' + nom + '\n' + '\n'.join(lignes) + '\n```'


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


def pluriel(v):
    return '{{if:' + v + '>1|s|}}'


# Rangs nommés par un indice j (0 = centaines … 5 = millièmes), valeur du rang = 2 − j
def nom_rang(j):
    return ('{{if:' + j + '==0|centaines|{{if:' + j + '==1|dizaines|{{if:' + j + '==2|unités|'
            '{{if:' + j + '==3|dixièmes|{{if:' + j + '==4|centièmes|millièmes}}}}}}}}}}')


# =============================================================================================
# F2 — 6-106 : fraction décimale ↔ écriture décimale. Numérateur à 3 chiffres (sans 0 final),
# dénominateur 10, 100 ou 1 000 (D = 10^p). Le dénominateur est donné : la case est un entier.
# =============================================================================================

X_F2 = '{{eval:N/10^p;d}}'

F2_A = variation(
    'Complète l\'égalité.\n\n'
    '{{if:cache==0|$$' + X_F2 + '=\\dfrac{?}{ {{D}} }$$|$$' + X_F2 + '=\\dfrac{ {{N}} }{?}$$}}',
    [var('p', '1..3'), var('N', '101..999'), var('D', 'eval:10^p'), var('cache', '0|1')],
    [case('{{if:cache==0|{{N}}|{{D}}}}', [
        erreur('{{if:cache==0|{{eval:N*10}}|{{eval:D*10}}}}',
               'Tu as mis un zéro de trop : $' + X_F2 + '$ a ${{p}}$ chiffre' + pluriel('p')
               + ' après la virgule, il faut ${{p}}$ zéro' + pluriel('p') + ' au dénominateur.',
               'Un rang de trop'),
        erreur('{{if:cache==0|' + X_F2 + '|{{eval:D/10}}}}',
               '{{if:cache==0|Le numérateur d\'une fraction décimale est un nombre entier : '
               'combien de {{if:p==1|dixièmes|{{if:p==2|centièmes|millièmes}}}} y a-t-il dans $'
               + X_F2 + '$ ?|Il manque un zéro : $' + X_F2 + '$ a ${{p}}$ chiffre' + pluriel('p')
               + ' après la virgule, il faut ${{p}}$ zéro' + pluriel('p')
               + ' au dénominateur.}}',
               'Virgule gardée ou zéro manquant'),
    ])],
    [
        '$' + X_F2 + '$ a ${{p}}$ chiffre' + pluriel('p') + ' après la virgule : c\'est '
        '${{N}}$ {{if:p==1|dixièmes|{{if:p==2|centièmes|millièmes}}}}.',
        '$$' + X_F2 + '=\\dfrac{ {{if:cache==0|' + PRIMAIRE + '{ {{N}} }|{{N}}}} }'
        '{ {{if:cache==1|' + PRIMAIRE + '{ {{D}} }|{{D}}}} }$$',
    ],
    'Compte les chiffres après la virgule : un chiffre, ce sont des dixièmes ; deux, des '
    'centièmes ; trois, des millièmes.',
    ['mod(N,10) != 0'],
)

F2_B = variation(
    'Écris ce nombre en écriture décimale.\n\n$$\\dfrac{ {{N}} }{ {{D}} }=?$$',
    [var('p', '1..3'), var('N', '101..999'), var('D', 'eval:10^p')],
    [case(X_F2, [
        erreur('{{eval:N/10^(p+1);d}}',
               'Tu as décalé la virgule d\'un rang de trop : diviser par ${{D}}$, c\'est décaler '
               'la virgule de ${{p}}$ rang' + pluriel('p') + ' vers la gauche.',
               'Un rang de trop'),
        erreur('{{eval:N/10^(p-1);d}}',
               'Tu n\'as pas décalé la virgule assez loin : diviser par ${{D}}$, c\'est décaler '
               'la virgule de ${{p}}$ rang' + pluriel('p') + ' vers la gauche.',
               'Un rang de moins'),
    ])],
    [
        '$\\dfrac{ {{N}} }{ {{D}} }$, c\'est ${{N}}$ {{if:p==1|dixièmes|{{if:p==2|centièmes|'
        'millièmes}}}} : le chiffre des unités de ${{N}}$ devient le chiffre des '
        '{{if:p==1|dixièmes|{{if:p==2|centièmes|millièmes}}}}.',
        '$$\\dfrac{ {{N}} }{ {{D}} }=' + PRIMAIRE + '{' + X_F2 + '}$$',
    ],
    'Diviser par ${{D}}$, c\'est décaler la virgule vers la gauche d\'autant de rangs que '
    '${{D}}$ a de zéros.',
    ['mod(N,10) != 0'],
)

# Somme a + b/D + c/D, D = 10 ou 100, b et c d'un chiffre, toujours une retenue (b + c > 10)
SOMME = '{{eval:a+(b+c)/D;d}}'
UNITE = '{{if:p==1|dixièmes|centièmes}}'
F2_C = variation(
    'Écris ce nombre en écriture décimale.\n\n'
    '$${{a}}+\\dfrac{ {{b}} }{ {{D}} }+\\dfrac{ {{c}} }{ {{D}} }=?$$',
    [var('p', '1|2'), var('D', 'eval:10^p'), var('a', '1..20'), var('b', '2..9'),
     var('c', '2..9')],
    [case(SOMME, [
        erreur('{{eval:a+b/10+c/100;d}}',
               'Tu as écrit ${{b}}$ et ${{c}}$ l\'un après l\'autre : ce sont deux nombres de '
               + UNITE + ', il faut les additionner.', 'Chiffres juxtaposés'),
        erreur('{{eval:a+(b+c)/(2*D);d}}',
               'Tu as additionné les dénominateurs : ${{b}}$ ' + UNITE + ' et ${{c}}$ ' + UNITE
               + ', cela fait ${{eval:b+c}}$ ' + UNITE + '.', 'Dénominateurs additionnés'),
        erreur('{{eval:a+mod(b+c,10)/D;d}}',
               'Tu as oublié la retenue : ${{eval:b+c}}$ ' + UNITE + ', c\'est $1$ '
               '{{if:p==1|unité|dixième}} et ${{eval:mod(b+c,10)}}$ ' + UNITE + '.',
               'Retenue oubliée'),
    ])],
    [
        '$\\dfrac{ {{b}} }{ {{D}} }+\\dfrac{ {{c}} }{ {{D}} }=\\dfrac{ {{eval:b+c}} }{ {{D}} }$ : '
        '${{eval:b+c}}$ ' + UNITE + ', c\'est $1$ {{if:p==1|unité|dixième}} et '
        '${{eval:mod(b+c,10)}}$ ' + UNITE + '.',
        '$${{a}}+\\dfrac{ {{b}} }{ {{D}} }+\\dfrac{ {{c}} }{ {{D}} }={{a}}+\\dfrac{ {{eval:b+c}} }'
        '{ {{D}} }=' + PRIMAIRE + '{' + SOMME + '}$$',
    ],
    'Additionne d\'abord les deux fractions : elles ont le même dénominateur. Pense à la '
    'retenue : $10$ ' + UNITE + ' font $1$ {{if:p==1|unité|dixième}}.',
    ['b + c > 10'],
)

SPECS_F2 = [
    spec('a : 12,8 = …/10', 0, {'p': '1', 'N': '128', 'cache': '0'}, 'correct', ['128']),
    spec('a : un zéro de trop', 0, {'p': '1', 'N': '128', 'cache': '0'}, 'incorrect', ['1280'],
         'Tu as mis un zéro de trop : $12.8$ a $1$ chiffre après la virgule, il faut $1$ zéro '
         'au dénominateur.'),
    spec('a : virgule gardée', 0, {'p': '1', 'N': '128', 'cache': '0'}, 'incorrect', ['12,8'],
         'Le numérateur d\'une fraction décimale est un nombre entier : combien de dixièmes y '
         'a-t-il dans $12.8$ ?'),
    spec('a : 1,28 = 128/…', 0, {'p': '2', 'N': '128', 'cache': '1'}, 'correct', ['100']),
    spec('a : 0,347 = 347/… (1 000 espacé)', 0, {'p': '3', 'N': '347', 'cache': '1'}, 'correct',
         ['1\\,000']),
    spec('a : 1 000 sans espace', 0, {'p': '3', 'N': '347', 'cache': '1'}, 'unoptimal_form',
         ['1000']),
    spec('a : dénominateur, un zéro de trop', 0, {'p': '2', 'N': '128', 'cache': '1'},
         'incorrect', ['1\\,000'],
         'Tu as mis un zéro de trop : $1.28$ a $2$ chiffres après la virgule, il faut $2$ zéros '
         'au dénominateur.'),
    spec('a : dénominateur, un zéro manquant', 0, {'p': '2', 'N': '128', 'cache': '1'},
         'incorrect', ['10'],
         'Il manque un zéro : $1.28$ a $2$ chiffres après la virgule, il faut $2$ zéros au '
         'dénominateur.'),
    spec('b : 128/100 = 1,28', 1, {'p': '2', 'N': '128'}, 'correct', ['1,28']),
    spec('b : 128/100, point décimal', 1, {'p': '2', 'N': '128'}, 'correct', ['1.28']),
    spec('b : un rang de trop', 1, {'p': '2', 'N': '128'}, 'incorrect', ['0,128'],
         'Tu as décalé la virgule d\'un rang de trop : diviser par $100$, c\'est décaler la '
         'virgule de $2$ rangs vers la gauche.'),
    spec('b : un rang de moins', 1, {'p': '2', 'N': '128'}, 'incorrect', ['12,8'],
         'Tu n\'as pas décalé la virgule assez loin : diviser par $100$, c\'est décaler la '
         'virgule de $2$ rangs vers la gauche.'),
    spec('b : 347/1 000 = 0,347', 1, {'p': '3', 'N': '347'}, 'correct', ['0,347']),
    spec('c : 8 + 5/100 + 7/100 = 8,12', 2, {'p': '2', 'a': '8', 'b': '5', 'c': '7'}, 'correct',
         ['8,12']),
    spec('c : juxtaposés', 2, {'p': '2', 'a': '8', 'b': '5', 'c': '7'}, 'incorrect', ['8,57'],
         'Tu as écrit $5$ et $7$ l\'un après l\'autre : ce sont deux nombres de centièmes, il '
         'faut les additionner.'),
    spec('c : dénominateurs additionnés', 2, {'p': '2', 'a': '8', 'b': '5', 'c': '7'},
         'incorrect', ['8,06'],
         'Tu as additionné les dénominateurs : $5$ centièmes et $7$ centièmes, cela fait $12$ '
         'centièmes.'),
    spec('c : retenue oubliée', 2, {'p': '2', 'a': '8', 'b': '5', 'c': '7'}, 'incorrect',
         ['8,02'],
         'Tu as oublié la retenue : $12$ centièmes, c\'est $1$ dixième et $2$ centièmes.'),
    spec('c : 8 + 5/10 + 7/10 = 9,2', 2, {'p': '1', 'a': '8', 'b': '5', 'c': '7'}, 'correct',
         ['9,2']),
    spec('c : dixièmes, retenue oubliée', 2, {'p': '1', 'a': '8', 'b': '5', 'c': '7'},
         'incorrect', ['8,2'],
         'Tu as oublié la retenue : $12$ dixièmes, c\'est $1$ unité et $2$ dixièmes.'),
]

F2 = modele(
    'Fraction décimale et écriture décimale',
    'Passer d\'une fraction décimale (dénominateur 10, 100 ou 1 000) à l\'écriture décimale et '
    'inversement : numérateur ou dénominateur manquant, fraction → décimal, somme a + b/100 + '
    'c/100 (pièges : un zéro de trop, virgule gardée au numérateur, dénominateurs additionnés, '
    'retenue oubliée)',
    1, 45, [F2_A, F2_B, F2_C], SPECS_F2)


# =============================================================================================
# F3 — 6-101 : par combien multiplier ou diviser pour qu'un chiffre change de rang. Le verbe
# (multiplier / diviser) est dans l'énoncé ; la case est 10, 100 ou 1 000.
# =============================================================================================

ECART = '(abs(j1-j2))'
REP_F3 = '{{eval:10^' + ECART + '}}'
VERBE = '{{if:j1>j2|multiplier|diviser}}'

F3_A = variation(
    'Par combien faut-il ' + VERBE + ' un nombre pour que son chiffre des ' + nom_rang('j1')
    + ' devienne le chiffre des ' + nom_rang('j2') + ' ?\n\nIl faut le ' + VERBE + ' par $?$.',
    [var('j1', '0..5'), var('j2', '0..5')],
    [case(REP_F3, [
        erreur('{{eval:10^(' + ECART + '+1)}}',
               'Tu as compté un rang de trop : du chiffre des ' + nom_rang('j1')
               + ' au chiffre des ' + nom_rang('j2') + ', il y a ${{eval:' + ECART + '}}$ rang'
               '{{if:' + ECART + '>1|s|}}.', 'Un rang de trop'),
        erreur('{{eval:10^(' + ECART + '-1)}}',
               'Tu as compté un rang de moins : du chiffre des ' + nom_rang('j1')
               + ' au chiffre des ' + nom_rang('j2') + ', il y a ${{eval:' + ECART + '}}$ rang'
               '{{if:' + ECART + '>1|s|}}.', 'Un rang de moins'),
    ])],
    [
        'Dans l\'écriture d\'un nombre, chaque rang vaut $10$ fois celui qui est à sa droite. '
        'Du chiffre des ' + nom_rang('j1') + ' au chiffre des ' + nom_rang('j2') + ', on '
        '{{if:j1>j2|monte|descend}} de ${{eval:' + ECART + '}}$ rang{{if:' + ECART + '>1|s|}}.',
        'Il faut le ' + VERBE + ' par $' + PRIMAIRE + '{' + REP_F3 + '}$.',
    ],
    'Écris les rangs dans l\'ordre (centaines, dizaines, unités, dixièmes, centièmes, millièmes) '
    'et compte de combien de rangs le chiffre doit se déplacer.',
    ['j1 != j2', 'abs(j1-j2) <= 3', 'max(j1,j2) >= 3'],
)

# Nombre à 4 chiffres distincts non nuls, ne chiffres avant la virgule (4,567 ; 45,67 ; 456,7).
# Le chiffre désigné est le ic-ième (rang 2 − ji avec ji = 2 − ne + ic ; ni e ni i : constantes), le rang visé est j2.
VAL_F3 = '{{eval:M/10^(4-ne);d}}'
CHIFFRE = '{{eval:mod(floor(M/10^(4-ic)),10)}}'
ECART_B = '(abs(ji-j2))'
REP_F3B = '{{eval:10^' + ECART_B + '}}'
VERBE_B = '{{if:ji>j2|multiplier|diviser}}'

F3_B = variation(
    'Par combien faut-il ' + VERBE_B + ' $' + VAL_F3 + '$ pour que le chiffre $' + CHIFFRE
    + '$ devienne le chiffre des ' + nom_rang('j2') + ' ?\n\nIl faut le ' + VERBE_B
    + ' par $?$.',
    [var('g1', '1..9'), var('g2', '1..9'), var('g3', '1..9'), var('g4', '1..9'),
     var('M', 'eval:1000*g1+100*g2+10*g3+g4'), var('ne', '1..3'), var('ic', '1..4'),
     var('ji', 'eval:2-ne+ic'), var('j2', '1..4')],
    [case(REP_F3B, [
        erreur('{{eval:10^(' + ECART_B + '+1)}}',
               'Tu as compté un rang de trop : dans $' + VAL_F3 + '$, $' + CHIFFRE + '$ est le '
               'chiffre des ' + nom_rang('ji') + ', à ${{eval:' + ECART_B + '}}$ rang'
               '{{if:' + ECART_B + '>1|s|}} des ' + nom_rang('j2') + '.', 'Un rang de trop'),
        erreur('{{eval:10^(' + ECART_B + '-1)}}',
               'Tu as compté un rang de moins : dans $' + VAL_F3 + '$, $' + CHIFFRE + '$ est le '
               'chiffre des ' + nom_rang('ji') + ', à ${{eval:' + ECART_B + '}}$ rang'
               '{{if:' + ECART_B + '>1|s|}} des ' + nom_rang('j2') + '.', 'Un rang de moins'),
    ])],
    [
        'Dans $' + VAL_F3 + '$, $' + CHIFFRE + '$ est le chiffre des ' + nom_rang('ji') + '.',
        'Des ' + nom_rang('ji') + ' aux ' + nom_rang('j2') + ', on {{if:ji>j2|monte|descend}} de '
        '${{eval:' + ECART_B + '}}$ rang{{if:' + ECART_B + '>1|s|}} : il faut ' + VERBE_B
        + ' par $' + PRIMAIRE + '{' + REP_F3B + '}$.',
        '$' + VAL_F3 + '{{if:ji>j2|\\times|\\div}}' + REP_F3B + '={{if:ji>j2|{{eval:M/10^(4-ne)*10^'
        + ECART_B + ';d}}|{{eval:M/10^(4-ne)/10^' + ECART_B + ';d}}}}$.',
    ],
    'Cherche d\'abord le rang du chiffre $' + CHIFFRE + '$ dans $' + VAL_F3 + '$, puis compte '
    'de combien de rangs il doit se déplacer.',
    ['g1 != g2', 'g1 != g3', 'g1 != g4', 'g2 != g3', 'g2 != g4', 'g3 != g4', 'ji != j2',
     'abs(ji-j2) <= 3', 'ne-4+ji-j2 >= -3'],
)

SPECS_F3 = [
    spec('a : unités → centièmes, diviser par 100', 0, {'j1': '2', 'j2': '4'}, 'correct', ['100']),
    spec('a : un rang de trop', 0, {'j1': '2', 'j2': '4'}, 'incorrect', ['1\\,000'],
         'Tu as compté un rang de trop : du chiffre des unités au chiffre des centièmes, il y a '
         '$2$ rangs.'),
    spec('a : un rang de moins', 0, {'j1': '2', 'j2': '4'}, 'incorrect', ['10'],
         'Tu as compté un rang de moins : du chiffre des unités au chiffre des centièmes, il y a '
         '$2$ rangs.'),
    spec('a : millièmes → unités, multiplier par 1 000', 0, {'j1': '5', 'j2': '2'}, 'correct',
         ['1\\,000']),
    spec('a : 1000 sans espace', 0, {'j1': '5', 'j2': '2'}, 'unoptimal_form', ['1000']),
    spec('a : dizaines → dixièmes', 0, {'j1': '1', 'j2': '3'}, 'correct', ['100']),
    spec('b : 4,567, le 6 aux unités → × 100', 1,
         {'g1': '4', 'g2': '5', 'g3': '6', 'g4': '7', 'ne': '1', 'ic': '3', 'j2': '2'}, 'correct',
         ['100']),
    spec('b : 4,567, un rang de moins', 1,
         {'g1': '4', 'g2': '5', 'g3': '6', 'g4': '7', 'ne': '1', 'ic': '3', 'j2': '2'}, 'incorrect',
         ['10'],
         'Tu as compté un rang de moins : dans $4.567$, $6$ est le chiffre des centièmes, à $2$ '
         'rangs des unités.'),
    spec('b : 4,567, un rang de trop', 1,
         {'g1': '4', 'g2': '5', 'g3': '6', 'g4': '7', 'ne': '1', 'ic': '3', 'j2': '2'}, 'incorrect',
         ['1\\,000'],
         'Tu as compté un rang de trop : dans $4.567$, $6$ est le chiffre des centièmes, à $2$ '
         'rangs des unités.'),
    spec('b : 382,9, le 3 aux dixièmes → ÷ 1 000', 1,
         {'g1': '3', 'g2': '8', 'g3': '2', 'g4': '9', 'ne': '3', 'ic': '1', 'j2': '3'}, 'correct',
         ['1\\,000']),
]

F3 = modele(
    'Par combien multiplier ou diviser pour changer le rang d\'un chiffre',
    'Trouver le nombre (10, 100 ou 1 000) par lequel multiplier ou diviser pour qu\'un chiffre '
    'passe d\'un rang à un autre, en général ou dans un nombre décimal donné (4,567 : le 6 '
    'devient le chiffre des unités) (pièges : un rang de trop ou de moins)',
    1, 40, [F3_A, F3_B], SPECS_F3)


# =============================================================================================
# F5 — 6-115 : multiplication par 0,1 ; 0,01 ; 0,001 à compléter. Le nombre n = N/10^q
# (entier ou décimal à un chiffre après la virgule), le coefficient 10^(−k).
# =============================================================================================

N_F5 = '{{eval:N/10^q;d}}'
C_F5 = '{{eval:10^(-k);d}}'
P_F5 = '{{eval:N/10^(q+k);d}}'
VARS_F5 = [var('N', '11..999'), var('q', '0|1'), var('k', '1..3')]
COND_F5 = ['mod(N,10) != 0', 'q + k <= 3']

F5_A = variation(
    'Complète l\'égalité.\n\n$$?\\times ' + C_F5 + '=' + P_F5 + '$$',
    VARS_F5,
    [case(N_F5, [
        erreur('{{eval:N/10^(q+2*k);d}}',
               'Tu as encore multiplié $' + P_F5 + '$ par $' + C_F5 + '$ : cherche le nombre '
               'qui, multiplié par $' + C_F5 + '$, donne $' + P_F5 + '$.',
               'Multiplié au lieu de chercher le facteur'),
        erreur('{{eval:N/10^(q-1);d}}',
               'Tu as décalé d\'un rang de trop : multiplier par $' + C_F5 + '$ fait reculer '
               'chaque chiffre de ${{k}}$ rang' + pluriel('k') + ', pas plus.', 'Un rang de trop'),
        erreur('{{eval:N/10^(q+1);d}}',
               'Tu as décalé d\'un rang de moins : multiplier par $' + C_F5 + '$ fait reculer '
               'chaque chiffre de ${{k}}$ rang' + pluriel('k') + '.', 'Un rang de moins'),
    ])],
    [
        'Multiplier par $' + C_F5 + '$, c\'est diviser par ${{eval:10^k}}$ : chaque chiffre '
        'recule de ${{k}}$ rang' + pluriel('k') + ' vers la droite.',
        'Le nombre cherché est donc ${{eval:10^k}}$ fois plus grand que $' + P_F5 + '$ : $'
        + PRIMAIRE + '{' + N_F5 + '}\\times ' + C_F5 + '=' + P_F5 + '$.',
    ],
    'Multiplier par $' + C_F5 + '$, c\'est diviser par ${{eval:10^k}}$ : le nombre cherché est '
    'donc plus grand que $' + P_F5 + '$.',
    COND_F5,
)

F5_B = variation(
    'Complète l\'égalité avec $0.1$, $0.01$ ou $0.001$.\n\n$$' + N_F5 + '\\times ?=' + P_F5
    + '$$',
    VARS_F5,
    [case(C_F5, [
        erreur('{{eval:10^k}}',
               'Multiplier par ${{eval:10^k}}$ rend le nombre plus grand : ici, $' + P_F5
               + '$ est plus petit que $' + N_F5 + '$.', 'Multiplier par 10, 100 ou 1 000'),
        erreur('{{if:k==1|0.01|{{eval:10^(1-k);d}}}}',
               'Compte les rangs : de $' + N_F5 + '$ à $' + P_F5 + '$, chaque chiffre recule de '
               '${{k}}$ rang' + pluriel('k') + ' vers la droite.', 'Rangs mal comptés'),
    ])],
    [
        'De $' + N_F5 + '$ à $' + P_F5 + '$, chaque chiffre recule de ${{k}}$ rang' + pluriel('k')
        + ' vers la droite : on a divisé par ${{eval:10^k}}$.',
        'Diviser par ${{eval:10^k}}$, c\'est multiplier par $' + C_F5 + '$ : $' + N_F5
        + '\\times ' + PRIMAIRE + '{' + C_F5 + '}=' + P_F5 + '$.',
    ],
    'Compare le rang d\'un même chiffre dans $' + N_F5 + '$ et dans $' + P_F5 + '$ : de '
    'combien de rangs a-t-il reculé ?',
    COND_F5,
)

SPECS_F5 = [
    spec('a : … × 0,01 = 0,47', 0, {'N': '47', 'q': '0', 'k': '2'}, 'correct', ['47']),
    spec('a : multiplié encore', 0, {'N': '47', 'q': '0', 'k': '2'}, 'incorrect', ['0,0047'],
         'Tu as encore multiplié $0.47$ par $0.01$ : cherche le nombre qui, multiplié par '
         '$0.01$, donne $0.47$.'),
    spec('a : un rang de trop', 0, {'N': '47', 'q': '0', 'k': '2'}, 'incorrect', ['470'],
         'Tu as décalé d\'un rang de trop : multiplier par $0.01$ fait reculer chaque chiffre '
         'de $2$ rangs, pas plus.'),
    spec('a : un rang de moins', 0, {'N': '47', 'q': '0', 'k': '2'}, 'incorrect', ['4,7'],
         'Tu as décalé d\'un rang de moins : multiplier par $0.01$ fait reculer chaque chiffre '
         'de $2$ rangs.'),
    spec('a : … × 0,1 = 0,52 → 5,2', 0, {'N': '52', 'q': '1', 'k': '1'}, 'correct', ['5,2']),
    spec('a : … × 0,001 = 0,365 → 365', 0, {'N': '365', 'q': '0', 'k': '3'}, 'correct',
         ['365']),
    spec('b : 36 × … = 0,036', 1, {'N': '36', 'q': '0', 'k': '3'}, 'correct', ['0,001']),
    spec('b : 1 000 au lieu de 0,001', 1, {'N': '36', 'q': '0', 'k': '3'}, 'incorrect',
         ['1\\,000'],
         'Multiplier par $1000$ rend le nombre plus grand : ici, $0.036$ est plus petit que '
         '$36$.'),
    spec('b : rangs mal comptés', 1, {'N': '36', 'q': '0', 'k': '3'}, 'incorrect', ['0,01'],
         'Compte les rangs : de $36$ à $0.036$, chaque chiffre recule de $3$ rangs vers la '
         'droite.'),
    spec('b : 5,2 × … = 0,52', 1, {'N': '52', 'q': '1', 'k': '1'}, 'correct', ['0,1']),
    spec('b : 5,2, rangs mal comptés', 1, {'N': '52', 'q': '1', 'k': '1'}, 'incorrect', ['0,01'],
         'Compte les rangs : de $5.2$ à $0.52$, chaque chiffre recule de $1$ rang vers la '
         'droite.'),
]

F5 = modele(
    'Compléter une multiplication par 0,1, 0,01 ou 0,001',
    'Égalité à trou : le facteur manquant (… × 0,01 = 0,47) ou le coefficient manquant '
    '(36 × … = 0,036) (pièges : multiplier encore au lieu de chercher le facteur, 1 000 au lieu '
    'de 0,001, un rang de trop ou de moins)',
    1, 40, [F5_A, F5_B], SPECS_F5)


# =============================================================================================
# F7 — 6-118 : poser la multiplication de deux décimaux (bloc operation, vérifié dans
# src/lib/ubumark/parser/operation-parser.ts : deux facteurs décimaux acceptés, 6 chiffres en
# haut, 3 en bas, 3 décimales par facteur ; operation-scene.ts additionne leurs décimales).
# Deux formes : 3,46 × 2,7 (forme 0) et 34,6 × 0,27 (forme 1) ; trois décimales au produit,
# pas de zéro final. Pas d'erreurs prévues : la réponse est l'opération posée.
# =============================================================================================

XA = '{{eval:T/10^(2-forme);d}}'
XB = '{{eval:B/10^(1+forme);d}}'
PROD = '{{eval:T*B/1000;d}}'

F7_A = variation(
    'Pose et calcule.\n\n' + bloc('operation', 'calcul: ' + XA + ' × ' + XB),
    [var('forme', '0|1'), var('T', '101..999'), var('B', '12..99')],
    [],
    [
        'On pose la multiplication comme avec des nombres entiers, sans s\'occuper des virgules : '
        '${{T}}\\times {{B}}={{eval:T*B}}$.',
        '$' + XA + '$ a ${{eval:2-forme}}$ chiffre{{if:forme==0|s|}} après la virgule, $' + XB
        + '$ en a ${{eval:1+forme}}$ : le produit en a $' + SECOND + '{3}$.',
        '$$' + XA + '\\times ' + XB + '=' + PRIMAIRE + '{' + PROD + '}$$',
    ],
    'Calcule d\'abord comme si les nombres étaient entiers, puis compte les chiffres après la '
    'virgule dans les deux facteurs.',
    ['mod(T,10) != 0', 'mod(B,10) != 0', 'mod(T*B,10) != 0'],
)

SPECS_F7 = [
    spec('3,46 × 2,7 = 9,342', 0, {'forme': '0', 'T': '346', 'B': '27'}, 'correct', ['9,342']),
    spec('virgule oubliée : 9 342', 0, {'forme': '0', 'T': '346', 'B': '27'}, 'incorrect',
         ['9\\,342']),
    spec('virgule comme pour une addition : 93,42', 0, {'forme': '0', 'T': '346', 'B': '27'},
         'incorrect', ['93,42']),
    spec('34,6 × 0,27 = 9,342', 0, {'forme': '1', 'T': '346', 'B': '27'}, 'correct', ['9,342']),
    spec('34,6 × 0,27 : une décimale seulement', 0, {'forme': '1', 'T': '346', 'B': '27'},
         'incorrect', ['934,2']),
]

F7 = modele(
    'Poser la multiplication de deux nombres décimaux',
    'Multiplication posée de deux décimaux, trois décimales au produit : 3,46 × 2,7 ; 34,6 × 0,27 '
    '(pièges : virgule oubliée, virgule placée comme pour une addition)',
    1, 180, [F7_A], SPECS_F7)


# =============================================================================================
# F8 — 6-118 : sans calculer le produit, son dernier chiffre (non nul) ou son nombre de
# décimales (phase 0, Q1 : un seul modèle, sur le produit). Style de b9677e1f.
# x = X/10^a, y = Y/10^b, derniers chiffres ux et uy, ux × uy sans 0 final.
# =============================================================================================

X8 = '{{eval:X/10^a;d}}'
Y8 = '{{eval:Y/10^b;d}}'
VARS_F8 = [var('X', '2..99'), var('a', '1|2'), var('Y', '2..99'), var('b', '1|2'),
           var('ux', 'eval:mod(X,10)'), var('uy', 'eval:mod(Y,10)'), var('f', 'eval:ux*uy'),
           var('g', 'eval:mod(f,10)')]
COND_F8 = ['mod(X,10) != 0', 'mod(Y,10) != 0', 'mod(ux*uy,10) != 0']
VERIF = '**Vérification.** $' + X8 + '\\times ' + Y8 + '={{eval:X*Y/10^(a+b);d}}$.'

F8_A = variation(
    'Sans calculer le produit, trouve son dernier chiffre.\n\n$$' + X8 + '\\times ' + Y8 + '$$\n\n'
    'Le dernier chiffre du produit est $?$.',
    VARS_F8,
    [case('{{g}}', [
        erreur('{{f}}',
               '${{f}}$ n\'est pas un chiffre : le dernier chiffre du produit est celui de '
               '${{f}}$.', 'Produit des derniers chiffres non réduit'),
        erreur('{{eval:mod(ux+uy,10)}}',
               'Tu as additionné les derniers chiffres : ici, on multiplie ${{ux}}$ par ${{uy}}$.',
               'Derniers chiffres additionnés'),
    ])],
    [
        'Le dernier chiffre du produit ne dépend que des derniers chiffres des deux facteurs : '
        '{{if:f>=10|${{ux}}\\times {{uy}}={{eval:(f-g)/10}}' + PRIMAIRE + '{ {{g}} }$.|${{ux}}'
        '\\times {{uy}}=' + PRIMAIRE + '{ {{g}} }$.}}',
        VERIF,
    ],
    'Le dernier chiffre du produit ne dépend que des derniers chiffres des deux nombres.',
    COND_F8,
)

F8_B = variation(
    'Sans calculer le produit, trouve combien il a de chiffres après la virgule.\n\n$$' + X8
    + '\\times ' + Y8 + '$$\n\nLe produit a $?$ chiffres après la virgule.',
    VARS_F8,
    [case('{{eval:a+b}}', [
        erreur('{{eval:max(a,b)}}',
               'Tu as fait comme pour une addition : dans un produit, on compte les chiffres après '
               'la virgule des deux facteurs réunis.', 'Comme pour une addition'),
    ])],
    [
        '$' + X8 + '$ a ${{a}}$ chiffre' + pluriel('a') + ' après la virgule, $' + Y8 + '$ en a '
        '${{b}}$ ; ${{ux}}\\times {{uy}}={{f}}$ ne finit pas par $0$.',
        'Le produit a donc ${{a}}+{{b}}=' + PRIMAIRE + '{ {{eval:a+b}} }$ chiffres après la '
        'virgule.',
        VERIF,
    ],
    'Dans un produit de deux décimaux, compte les chiffres après la virgule de chacun des deux '
    'facteurs.',
    COND_F8,
)

V8 = {'X': '3', 'a': '1', 'Y': '7', 'b': '1'}
V8b = {'X': '46', 'a': '2', 'Y': '7', 'b': '1'}
SPECS_F8 = [
    spec('a : 0,3 × 0,7 = 0,21 → 1', 0, V8, 'correct', ['1']),
    spec('a : 21 non réduit', 0, V8, 'incorrect', ['21'],
         '$21$ n\'est pas un chiffre : le dernier chiffre du produit est celui de $21$.'),
    spec('a : additionnés', 0, V8, 'incorrect', ['0'],
         'Tu as additionné les derniers chiffres : ici, on multiplie $3$ par $7$.'),
    spec('a : 0,46 × 0,7 = 0,322 → 2', 0, V8b, 'correct', ['2']),
    spec('b : 0,3 × 0,7 → 2 décimales', 1, V8, 'correct', ['2']),
    spec('b : 0,46 × 0,7 → 3 décimales', 1, V8b, 'correct', ['3']),
    spec('b : comme une addition', 1, V8b, 'incorrect', ['2'],
         'Tu as fait comme pour une addition : dans un produit, on compte les chiffres après la '
         'virgule des deux facteurs réunis.'),
]

F8 = modele(
    'Dernier chiffre et décimales d\'un produit de décimaux',
    'Sans calculer le produit de deux décimaux : son dernier chiffre (0,3 × 0,7 → 1) ou son '
    'nombre de chiffres après la virgule (pièges : produit des derniers chiffres non réduit, '
    'chiffres additionnés, décimales comptées comme pour une addition)',
    1, 30, [F8_A, F8_B], SPECS_F8)


# =============================================================================================
# F12a — 6-123 : l'égalité de la division euclidienne (dividende ≤ 9 999, diviseur < 100).
# =============================================================================================

RAPPEL = ('**Division euclidienne.** Diviser $N$ par $d$, c\'est trouver le quotient $q$ et le '
          'reste $r$ tels que $N = (d \\times q) + r$, avec un reste plus petit que $d$.')

F12_A = variation(
    'Complète l\'égalité de la division euclidienne de ${{N}}$ par ${{d}}$.\n\n'
    '$${{N}}=({{d}}\\times ?)+?$$',
    [var('d', '2..99'), var('q', '2..999'), var('r', '0..{{eval:d-1}}'), var('N', 'eval:d*q+r')],
    [
        case('{{q}}', [
            erreur('{{eval:q-1}}',
                   'Avec ${{eval:q-1}}$, le reste serait ${{eval:r+d}}$, plus grand que ${{d}}$ : '
                   'on peut encore mettre ${{d}}$ une fois de plus.', 'Quotient trop petit'),
        ]),
        case('{{r}}', [
            erreur('{{eval:r+d}}',
                   'Le reste ${{eval:r+d}}$ est plus grand que le diviseur ${{d}}$ : on peut encore '
                   'enlever ${{d}}$.', 'Reste plus grand que le diviseur'),
        ]),
    ],
    [
        RAPPEL,
        'On cherche le plus grand multiple de ${{d}}$ qui ne dépasse pas ${{N}}$ : ${{d}}\\times '
        '{{q}}={{eval:d*q}}$, et ${{N}}-{{eval:d*q}}={{r}}$, plus petit que ${{d}}$.',
        '$${{N}}=({{d}}\\times ' + PRIMAIRE + '{ {{q}} })+' + SECOND + '{ {{r}} }$$',
    ],
    'Cherche combien de fois ${{d}}$ tient dans ${{N}}$ ; ce qui reste doit être plus petit que '
    '${{d}}$.',
    ['N >= 100', 'N <= 9999', 'mod(d,10) != 0'],
)

# L'égalité affichée est juste, mais son reste dépasse le diviseur : q' = q − m, r' = r + m·d
QF = '{{eval:q-m}}'
RF = '{{eval:r+m*d}}'
F12_B = variation(
    'L\'égalité $${{N}}=({{d}}\\times ' + QF + ')+' + RF + '$$ est juste, mais ce n\'est pas celle '
    'de la division euclidienne de ${{N}}$ par ${{d}}$. Écris la bonne.\n\n'
    '$${{N}}=({{d}}\\times ?)+?$$',
    [var('d', '3..99'), var('q', '3..999'), var('r', '0..{{eval:d-1}}'), var('m', '1|2'),
     var('N', 'eval:d*q+r')],
    [
        case('{{q}}', [
            erreur(QF,
                   'Le reste $' + RF + '$ est plus grand que ${{d}}$ : le quotient doit être '
                   'plus grand.', 'Quotient recopié'),
            erreur('{{eval:q-m+1}}',
                   'Avec ce quotient, le reste serait encore ${{eval:r+d}}$, plus grand que '
                   '${{d}}$ : on peut encore mettre ${{d}}$ une fois de plus.',
                   'Diviseur enlevé une seule fois'),
        ]),
        case('{{r}}', [
            erreur(RF,
                   'Le reste $' + RF + '$ est plus grand que le diviseur ${{d}}$ : ce n\'est pas '
                   'celui de la division euclidienne.', 'Reste recopié'),
            erreur('{{eval:r+(m-1)*d}}',
                   'Le reste ${{eval:r+d}}$ est encore plus grand que ${{d}}$ : enlève encore '
                   '${{d}}$.', 'Diviseur enlevé une seule fois'),
        ]),
    ],
    [
        'Le reste $' + RF + '$ est plus grand que le diviseur ${{d}}$ : on peut encore enlever '
        '${{d}}$ {{if:m==1|une fois|deux fois}}, et le quotient augmente d\'autant.',
        '$' + RF + '{{if:m==1|-{{d}}|-2\\times {{d}}}}={{r}}$ et $' + QF + '+{{m}}={{q}}$.',
        '$${{N}}=({{d}}\\times ' + PRIMAIRE + '{ {{q}} })+' + SECOND + '{ {{r}} }$$',
    ],
    'Dans une division euclidienne, le reste est plus petit que le diviseur : compare $' + RF
    + '$ à ${{d}}$.',
    ['N >= 100', 'N <= 9999', 'mod(d,10) != 0'],
)

# Vocabulaire : q < r < d, ainsi l'égalité ne se lit que comme la division de N par d
# (si r était aussi plus petit que q, ce serait aussi celle de N par q : ambigu).
ROLE = '{{if:k==0|{{N}}|{{if:k==1|{{d}}|{{if:k==2|{{q}}|{{r}}}}}}}}'
PRODUIT = '{{if:ordre==0|{{d}}\\times {{q}}|{{q}}\\times {{d}}}}'
F12_C = variation(
    'L\'égalité ci-dessous est celle d\'une division euclidienne.\n\n'
    '$${{N}}=(' + PRODUIT + ')+{{r}}$$\n\nQue représente le nombre $' + ROLE + '$ ?\n\n' + bloc('choix', '- le dividende', '- le diviseur', '- le quotient', '- le reste'),
    [var('d', '12..99'), var('q', '2..{{eval:d-2}}'), var('r', '{{eval:q+1}}..{{eval:d-1}}'),
     var('N', 'eval:d*q+r'), var('k', '0..3'), var('ordre', '0|1')],
    [case('{{k}}')],
    [
        'Le reste est toujours plus petit que le diviseur. Ici, ${{r}}$ est plus petit que '
        '${{d}}$ mais pas que ${{q}}$ : le diviseur est ${{d}}$, le quotient ${{q}}$.',
        '${{N}}$ est le dividende, ${{d}}$ le diviseur, ${{q}}$ le quotient et ${{r}}$ le reste : '
        'le nombre $' + ROLE + '$ est **{{if:k==0|le dividende|{{if:k==1|le diviseur|'
        '{{if:k==2|le quotient|le reste}}}}}}**.',
    ],
    'Le nombre seul à gauche du signe $=$ est celui qu\'on divise ; le reste est toujours plus '
    'petit que le diviseur.',
    ['N <= 9999'],
)

V12 = {'d': '23', 'q': '54', 'r': '5'}
V12b = {'d': '9', 'q': '27', 'r': '4', 'm': '1'}
V12c = {'d': '9', 'q': '27', 'r': '4', 'm': '2'}
V12v = {'d': '23', 'q': '7', 'r': '15', 'ordre': '0'}
SPECS_F12 = [
    spec('a : 1 247 = (23 × 54) + 5', 0, V12, 'correct', ['54', '5']),
    spec('a : quotient trop petit', 0, V12, 'incorrect', ['53', '28'],
         'Avec $53$, le reste serait $28$, plus grand que $23$ : on peut encore mettre $23$ une '
         'fois de plus.'),
    spec('a : reste trop grand', 0, V12, 'incorrect', ['54', '28'],
         'Le reste $28$ est plus grand que le diviseur $23$ : on peut encore enlever $23$.'),
    spec('b : 247 = 9 × 26 + 13 → 27 et 4', 1, V12b, 'correct', ['27', '4']),
    spec('b : quotient recopié', 1, V12b, 'incorrect', ['26', '4'],
         'Le reste $13$ est plus grand que $9$ : le quotient doit être plus grand.'),
    spec('b : reste recopié', 1, V12b, 'incorrect', ['27', '13'],
         'Le reste $13$ est plus grand que le diviseur $9$ : ce n\'est pas celui de la division '
         'euclidienne.'),
    spec('b : m = 2, 247 = 9 × 25 + 22 → 27 et 4', 1, V12c, 'correct', ['27', '4']),
    spec('b : m = 2, diviseur enlevé une fois (quotient)', 1, V12c, 'incorrect', ['26', '4'],
         'Avec ce quotient, le reste serait encore $13$, plus grand que $9$ : on peut encore '
         'mettre $9$ une fois de plus.'),
    spec('b : m = 2, diviseur enlevé une fois (reste)', 1, V12c, 'incorrect', ['27', '13'],
         'Le reste $13$ est encore plus grand que $9$ : enlève encore $9$.'),
    spec('c : 176 = (23 × 7) + 15, 23 est le diviseur', 2, {**V12v, 'k': '1'}, 'correct', ['1']),
    spec('c : 23 pris pour le quotient', 2, {**V12v, 'k': '1'}, 'incorrect', ['2']),
    spec('c : 7 est le quotient (ordre inversé)', 2, {**V12v, 'k': '2', 'ordre': '1'}, 'correct',
         ['2']),
    spec('c : 15 est le reste', 2, {**V12v, 'k': '3'}, 'correct', ['3']),
    spec('c : 176 est le dividende', 2, {**V12v, 'k': '0'}, 'correct', ['0']),
]

F12 = modele(
    'L\'égalité de la division euclidienne',
    'Compléter l\'égalité N = (d × q) + r, corriger une égalité juste dont le reste dépasse le '
    'diviseur (247 = 9 × 26 + 13), nommer dividende, diviseur, quotient et reste (pièges : reste '
    'plus grand que le diviseur, quotient ou reste recopiés)',
    1, 60, [F12_A, F12_B, F12_C], SPECS_F12)


ecrire('f02-fraction-decimale-ecriture-decimale', F2)
ecrire('f03-multiplier-diviser-changer-de-rang', F3)
ecrire('f05-completer-multiplication-par-0-1', F5)
ecrire('f07-poser-multiplication-deux-decimaux', F7)
ecrire('f08-dernier-chiffre-produit-decimaux', F8)
ecrire('f12a-egalite-division-euclidienne', F12)
print('6 modèles écrits dans', DOSSIER)
