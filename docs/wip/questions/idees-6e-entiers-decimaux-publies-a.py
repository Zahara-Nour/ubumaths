"""Ajoute les variations validées à 6 des 13 modèles publiés exportés de prod dans
scripts/questions/idees-6e-entiers-decimaux-publies/ (chantier idees-6e-entiers-decimaux, partie a).

Phase 0 validée par David le 2026-11-23 : F1 (4bcbbaae), F2 (4d825d44), F3 (a2ae7206),
F4 (2c5bae8f), F5 (8d7edbde), F6 (d7781eed). Les 7 autres modèles du dossier sont écrits par
idees-6e-entiers-decimaux-publies-b.py. Les variations s'ajoutent À LA FIN (les réponses des élèves
gardent l'indice de leur variation) ; la migration de contenu est générée par
scripts/questions/migration-contenu.ts. Seuls `variations` et `testSpecs` changent : ni titre, ni
niveaux, ni options (migration-contenu ne change que variations, specs et description).

Le script repart du contenu de prod (variations et specs d'origine, comptées dans ORIGINE) :
le relancer réécrit les ajouts sans les doubler.

Pièges du lot :
- Aucun des 6 modèles n'a de `shared` : chaque variation porte ses variables et ses conditions.
- Les 6 modèles ont « Espaces dès 4 chiffres » : réponses des specs espacées dès 4 chiffres
  (`1\\,000`, `36\\,200\\,000`) ; l'affichage de la question groupe seul les nombres des formules.
- Une erreur prévue qui tombe sur la bonne réponse d'un tirage est ignorée (F3 v4 « partie
  entière oubliée » pour 0,0q ; F3 v6 « chiffres côte à côte » quand b ≥ 10) ; deux erreurs
  prévues de même valeur sur un tirage se gênent : les conditions les écartent (F1, F3 v5).
- F2 : case choix `plusieurs: oui` (pas d'erreur prévue sur une case choix) ; les choix 0 et 1
  sont justes, 4 et 5 sont des intrus, 2 et 3 justes ou intrus selon t2, t3 (2 à 4 justes). Une
  réponse calculée peut répéter l'indice 0 (`0;1;{{eval:2*t2}};{{eval:3*t3}}`).
- Décimaux tirés en entiers (millièmes, centièmes) puis affichés par `;d`.
- Fraction décimale exigée (F3 v4, v6 ; F6) : une case, motif
  `n:integer / w:eq(10)|eq(100)|eq(1000)`, toute fraction égale de cette forme est juste (28/100
  comme 280/1 000). La contrainte « Fractions irréductibles » noterait « à améliorer » toute
  fraction décimale simplifiable : elle est coupée (`reducedFractions: off`) dans les options de
  a2ae7206 et d7781eed SEULEMENT (décision de David du 2026-11-23 ; le générateur de migrations
  de contenu écrit les options). Les options sont la seule autre clé que le script change.
- Une variable ne porte pas de mot (« millions » est lu comme un nom de variable) : les noms de
  rangs s'écrivent dans le texte par `{{if:}}` ; un message est limité à 500 caractères (F5).

Usage : python3 docs/wip/questions/idees-6e-entiers-decimaux-publies-a.py scripts/questions/idees-6e-entiers-decimaux-publies
"""
import json
import os
import sys

DOSSIER = sys.argv[1]

PRIMAIRE = '\\textcolor{{{color:primary.0}}}'

FRACTION_DECIMALE = {'pattern': 'n:integer / w:eq(10)|eq(100)|eq(1000)'}
SANS_REDUCTION = {'reducedFractions': 'off'}

# id court → (variations, specs) d'origine en prod (export du 2026-11-23)
ORIGINE = {'4bcbbaae': (2, 6), '4d825d44': (2, 5), 'a2ae7206': (3, 19), '2c5bae8f': (6, 18),
           '8d7edbde': (2, 5), 'd7781eed': (4, 7)}


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


def case(attendue, erreurs=None, forme=None):
    c = {'expectedAnswer': attendue}
    if forme is not None:
        c['requiredForm'] = forme
    if erreurs:
        c['expectedErrors'] = erreurs
    return c


def variation(statement, variables, blanks, steps, hint, conditions=None):
    return {'statement': statement, 'variables': variables, 'conditions': conditions or [],
            'blanks': blanks, 'correction': {'steps': steps}, 'hint': hint}


def couleur(contenu):
    return PRIMAIRE + '{' + contenu + '}'


def selon(v, valeurs, debut=0):
    """{{if:…}} imbriqué : valeurs[i] quand la variable v vaut debut + i (la dernière sinon)."""
    texte = valeurs[-1]
    for i in range(len(valeurs) - 2, -1, -1):
        texte = '{{if:' + v + '==' + str(debut + i) + '|' + valeurs[i] + '|' + texte + '}}'
    return texte


def ajouter(court, variations, specs, contraintes=None):
    chemin = os.path.join(DOSSIER, court + '.json')
    with open(chemin, encoding='utf-8') as f:
        m = json.load(f)
    if contraintes:
        # réglages d'origine gardés (spacesFromFourDigits), contraintes ajoutées
        m['options']['constraints'].update(contraintes)
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
# 4bcbbaae — 6-101, le nombre de dizaines, de centièmes… F1 : (v2) nombre de dizaines, centaines
# ou milliers d'un décimal (4 ou 5 chiffres avant la virgule, 2 ou 3 après) ; (v3) nombre de
# milliers, de dizaines de mille ou de millions d'un grand entier de 7 à 10 chiffres.
# Les conditions écartent l'égalité « chiffre seul » = « un chiffre trop tôt » (réponse à deux
# chiffres égaux).
# =============================================================================================

F1_RANG = selon('k', ['dizaines', 'centaines', 'milliers'], 1)
F1_DESSUS = selon('k', ['centaines', 'milliers', 'dizaines de mille'], 1)
F1_VIRGULE = selon('k', ['dixièmes', 'centièmes', 'millièmes'], 1)
F1_TOUS = '{{if:k==3|tous|toutes}}'

F1_DECIMAL = variation(
    'Quel est le nombre de ' + F1_RANG + ' dans ${{x}}$ ?\n\n$$?$$',
    [var('c', '4..5'), var('m', '2..3'), var('d', 'eval:c+m'), var('N', 'digits:d'),
     var('x', 'eval:N/10^m;d'), var('k', '1..3'),
     var('reste', 'eval:(N-floor(N/10^(m+k))*10^(m+k))/10^m;d')],
    [case('{{eval:floor(N/10^(m+k))}}', [
        erreur('{{eval:mod(floor(N/10^(m+k)),10)}}',
               'Tu as donné le chiffre des ' + F1_RANG + ' : le nombre de ' + F1_RANG + ' les '
               'compte ' + F1_TOUS + ', on garde tous les chiffres jusqu\'à ce rang.',
               'Le chiffre seul'),
        erreur('{{eval:floor(N/10^m)}}',
               'Tu as donné la partie entière, c\'est le nombre d\'unités : pour le nombre de '
               + F1_RANG + ', on s\'arrête au chiffre des ' + F1_RANG + '.',
               'La partie entière'),
        erreur('{{eval:floor(N/10^(m+k+1))}}',
               'Tu t\'es arrêté un chiffre trop tôt : c\'est le nombre de ' + F1_DESSUS
               + '. On garde aussi le chiffre des ' + F1_RANG + '.', 'Un rang de trop'),
        erreur('{{eval:floor(N/10^(m-k))}}',
               'Tu as compté les ' + F1_VIRGULE + ', qui sont après la virgule : les ' + F1_RANG
               + ' sont avant la virgule.', 'Dizaines lues comme dixièmes'),
    ])],
    [
        '**Chiffre ou nombre ?** Le chiffre des ' + F1_RANG + ' est un seul chiffre ; le nombre '
        'de ' + F1_RANG + ' les compte ' + F1_TOUS + ' : on garde tous les chiffres de la partie '
        'entière jusqu\'au rang des ' + F1_RANG + ', et pas ceux d\'après la virgule.',
        '$${{x}} = ' + couleur('{{solution}}') + ' \\times {{eval:10^k}} + {{reste}}$$',
        'Il y a $' + couleur('{{solution}}') + '$ ' + F1_RANG + ' dans ${{x}}$.',
    ],
    'Le nombre de ' + F1_RANG + ' compte ' + F1_TOUS + ' les ' + F1_RANG + ' : garde tous les '
    'chiffres jusqu\'au chiffre des ' + F1_RANG + ' compris. Les chiffres après la virgule ne '
    'comptent pas.',
    ['mod(N,10)!=0', 'c-k>=2',
     'mod(floor(N/10^(m+k+1)),10)!=mod(floor(N/10^(m+k)),10)'],
)

F1_GRANG = selon('s', ['milliers', 'dizaines de mille', 'millions'])
F1_GDESSUS = selon('s', ['dizaines de mille', 'centaines de mille', 'dizaines de millions'])
F1_GDESSOUS = selon('s', ['centaines', 'milliers', 'centaines de mille'])
F1_GTOUS = '{{if:s==1|toutes|tous}}'

F1_GRAND = variation(
    'Quel est le nombre de ' + F1_GRANG + ' dans ${{n}}$ ?\n\n$$?$$',
    [var('c', '7..10'), var('n', 'digits:c'), var('s', '0..2'),
     var('r', '{{if:s==0|3|{{if:s==1|4|6}}}}'), var('reste', 'eval:mod(n,10^r)')],
    [case('{{eval:floor(n/10^r)}}', [
        erreur('{{eval:mod(floor(n/10^r),10)}}',
               'Tu as donné le chiffre des ' + F1_GRANG + ' : le nombre de ' + F1_GRANG + ' les '
               'compte ' + F1_GTOUS + ', on garde tous les chiffres jusqu\'à ce rang.',
               'Le chiffre seul'),
        erreur('{{eval:floor(n/10^(r+1))}}',
               'Tu t\'es arrêté un chiffre trop tôt : c\'est le nombre de ' + F1_GDESSUS
               + '. On garde aussi le chiffre des ' + F1_GRANG + '.', 'Un chiffre trop tôt'),
        erreur('{{eval:floor(n/10^(r-1))}}',
               'Tu as gardé un chiffre de trop : c\'est le nombre de ' + F1_GDESSOUS + '. On '
               's\'arrête au chiffre des ' + F1_GRANG + '.', 'Un chiffre de trop'),
    ])],
    [
        '**Chiffre ou nombre ?** Le chiffre des ' + F1_GRANG + ' est un seul chiffre ; le nombre '
        'de ' + F1_GRANG + ' les compte ' + F1_GTOUS + ' : on garde tous les chiffres jusqu\'au '
        'rang des ' + F1_GRANG + '.',
        '$${{n}} = ' + couleur('{{solution}}') + ' \\times {{eval:10^r}}{{if:reste>0| + '
        '{{reste}}|}}$$',
        'Il y a $' + couleur('{{solution}}') + '$ ' + F1_GRANG + ' dans ${{n}}$.',
    ],
    'Repère le chiffre des ' + F1_GRANG + ', puis garde tous les chiffres à sa gauche, '
    'lui compris.',
    ['c-r>=2', 'mod(floor(n/10^(r+1)),10)!=mod(floor(n/10^r),10)'],
)

SPECS_4B = [
    spec('F1 v2 : 52 138,742, centaines : 521', 0,
         {'c': '5', 'm': '3', 'N': '52138742', 'k': '2'}, 'correct', ['521']),
    spec('F1 v2 : le chiffre des centaines (1)', 0,
         {'c': '5', 'm': '3', 'N': '52138742', 'k': '2'}, 'incorrect', ['1'],
         'Tu as donné le chiffre des centaines : le nombre de centaines les compte toutes, on '
         'garde tous les chiffres jusqu\'à ce rang.'),
    spec('F1 v2 : la partie entière (52 138)', 0,
         {'c': '5', 'm': '3', 'N': '52138742', 'k': '2'}, 'incorrect', ['52\\,138'],
         'Tu as donné la partie entière, c\'est le nombre d\'unités : pour le nombre de '
         'centaines, on s\'arrête au chiffre des centaines.'),
    spec('F1 v2 : un chiffre trop tôt (52)', 0,
         {'c': '5', 'm': '3', 'N': '52138742', 'k': '2'}, 'incorrect', ['52'],
         'Tu t\'es arrêté un chiffre trop tôt : c\'est le nombre de milliers. On garde aussi le '
         'chiffre des centaines.'),
    spec('F1 v2 : centièmes au lieu de centaines (5 213 874)', 0,
         {'c': '5', 'm': '3', 'N': '52138742', 'k': '2'}, 'incorrect', ['5\\,213\\,874'],
         'Tu as compté les centièmes, qui sont après la virgule : les centaines sont avant la '
         'virgule.'),
    spec('F1 v2 : 4 726,15, milliers : 4', 0,
         {'c': '4', 'm': '2', 'N': '472615', 'k': '1'}, 'correct', ['472']),
    spec('F1 v2 : 5 213 sans espace', 0,
         {'c': '5', 'm': '2', 'N': '5213874', 'k': '1'}, 'unoptimal_form', ['5213'],
         violations=['spaces']),
    spec('F1 v2 : 52 138,74, dizaines : 5 213', 0,
         {'c': '5', 'm': '2', 'N': '5213874', 'k': '1'}, 'correct', ['5\\,213']),
    spec('F1 v3 : 482 913 057, milliers : 482 913', 1,
         {'c': '9', 'n': '482913057', 's': '0'}, 'correct', ['482\\,913']),
    spec('F1 v3 : sans espace', 1, {'c': '9', 'n': '482913057', 's': '0'}, 'unoptimal_form',
         ['482913'], violations=['spaces']),
    spec('F1 v3 : le chiffre des milliers (3)', 1, {'c': '9', 'n': '482913057', 's': '0'},
         'incorrect', ['3'],
         'Tu as donné le chiffre des milliers : le nombre de milliers les compte tous, on garde '
         'tous les chiffres jusqu\'à ce rang.'),
    spec('F1 v3 : un chiffre trop tôt (48 291)', 1, {'c': '9', 'n': '482913057', 's': '0'},
         'incorrect', ['48\\,291'],
         'Tu t\'es arrêté un chiffre trop tôt : c\'est le nombre de dizaines de mille. On garde '
         'aussi le chiffre des milliers.'),
    spec('F1 v3 : un chiffre de trop (4 829 130)', 1, {'c': '9', 'n': '482913057', 's': '0'},
         'incorrect', ['4\\,829\\,130'],
         'Tu as gardé un chiffre de trop : c\'est le nombre de centaines. On s\'arrête au '
         'chiffre des milliers.'),
    spec('F1 v3 : 3 805 271 946, millions : 3 805', 1,
         {'c': '10', 'n': '3805271946', 's': '2'}, 'correct', ['3\\,805']),
    spec('F1 v3 : 3 805 271 946, dizaines de mille : 380 527', 1,
         {'c': '10', 'n': '3805271946', 's': '1'}, 'correct', ['380\\,527']),
]


# =============================================================================================
# 4d825d44 — 6-101, le chiffre d'un rang. F2 (idée du labyrinthe) : « Coche les nombres dont le
# chiffre des centièmes est g ». Choix 0, 1 justes ; 2 juste si t2 = 1, sinon g aux unités ;
# 3 juste si t3 = 1, sinon g aux dixièmes ; 4 : g aux dixièmes ; 5 : g aux millièmes. Chaque
# nombre est tiré en millièmes (W) : partie entière u, dixièmes a, centièmes c (≠ g pour un
# intrus), millièmes b (0 : le nombre n'a que deux décimales).
# =============================================================================================

F2_VARS = [var('g', '2..9'), var('t2', '0..1'), var('t3', '0..1')]
for i in range(6):
    F2_VARS += [var(f'u{i}', '1..99'), var(f'a{i}', '0..9'), var(f'b{i}', '0..9')]
for i in range(2, 6):
    F2_VARS.append(var(f'c{i}', '0..9'))
F2_VARS += [
    var('W0', 'eval:1000*u0+100*a0+10*g+b0'),
    var('W1', 'eval:1000*u1+100*a1+10*g+b1'),
    var('W2', 'eval:t2*(1000*u2+100*a2+10*g+b2)+(1-t2)*(1000*(10*floor(u2/10)+g)+100*a2+10*c2'
              '+b2)'),
    var('W3', 'eval:t3*(1000*u3+100*a3+10*g+b3)+(1-t3)*(1000*u3+100*g+10*c3+b3)'),
    var('W4', 'eval:1000*u4+100*g+10*c4+b4'),
    var('W5', 'eval:1000*u5+100*a5+10*c5+g'),
]
for i in range(6):
    F2_VARS.append(var(f'X{i}', f'eval:W{i}/1000;d'))

F2 = variation(
    'Coche tous les nombres dont le chiffre des centièmes est ${{g}}$.\n\n```choix\n'
    'plusieurs: oui\n' + ''.join('- ${{X' + str(i) + '}}$\n' for i in range(6)) + '```',
    F2_VARS,
    [case('0;1;{{eval:2*t2}};{{eval:3*t3}}')],
    [
        '**Le rang des centièmes.** Le chiffre des centièmes est le deuxième chiffre après la '
        'virgule ; le premier est celui des dixièmes. Attention à ne pas le confondre avec le '
        'chiffre des centaines.',
        'À cocher : ${{X0}}$, ${{X1}}${{if:t2==1|, ${{X2}}$|}}{{if:t3==1|, ${{X3}}$|}} : leur '
        'chiffre des centièmes est $' + couleur('{{g}}') + '$.',
        'Pas les autres : dans {{if:t2==0|${{X2}}$ (chiffre des unités), |}}{{if:t3==0|${{X3}}$ '
        '(chiffre des dixièmes), |}}${{X4}}$ (chiffre des dixièmes) et ${{X5}}$ (chiffre des '
        'millièmes), le ${{g}}$ n\'est pas au rang des centièmes.',
    ],
    'Le chiffre des centièmes est le deuxième chiffre après la virgule. Ne le confonds pas avec '
    'celui des centaines !',
    ['c2!=g', 'c3!=g', 'c4!=g', 'c5!=g'],
)

F2_EX = {'g': '7', 't2': '1', 't3': '0',
         'u0': '12', 'a0': '4', 'b0': '0', 'u1': '3', 'a1': '0', 'b1': '5',
         'u2': '45', 'a2': '1', 'b2': '2', 'u3': '8', 'a3': '6', 'b3': '3',
         'u4': '21', 'a4': '0', 'b4': '0', 'u5': '6', 'a5': '3', 'b5': '0',
         'c2': '0', 'c3': '1', 'c4': '5', 'c5': '2'}
F2_EX4 = dict(F2_EX, t3='1')

SPECS_4D = [
    # 12,47 ; 3,075 ; 45,172 ; 87,213 (7 aux unités) ; 21,75 (7 aux dixièmes) ; 6,327 (millièmes)
    spec('F2 : trois justes (12,47 ; 3,075 ; 45,172)', 0, F2_EX, 'correct', ['0;1;2']),
    spec('F2 : un juste oublié : moitié des points', 0, F2_EX, 'unoptimal_form', ['0;1']),
    spec('F2 : 7 aux dixièmes coché (21,75)', 0, F2_EX, 'incorrect', ['0;1;2;4']),
    spec('F2 : 7 aux millièmes coché (6,327)', 0, F2_EX, 'incorrect', ['0;1;2;5']),
    spec('F2 : 7 aux unités coché (87,213)', 0, F2_EX, 'incorrect', ['0;1;2;3']),
    spec('F2 : quatre justes', 0, F2_EX4, 'correct', ['0;1;2;3']),
]


# =============================================================================================
# a2ae7206 — 6-106, fraction décimale et écriture décimale. F3 : (v3) somme à dénominateurs
# différents avec un rang vide (BO : 4 + 1/10 + 7/1 000 = 4,107 ; s = 1 : 4 + 1/100 + 7/1 000
# = 4,017), termes dans l'ordre ou non ; (v4) décimal à zéro intérieur → fraction décimale ;
# (v5) a + b/D − c/D avec emprunt ; (v6) a + b/100 → une seule fraction décimale.
# =============================================================================================

F3_U = '{{if:s==0|dixième|centième}}{{if:b>1|s|}}'
F3_MIL = 'millième{{if:c>1|s|}}'
F3_VIDE = '{{if:s==0|centièmes|dixièmes}}'
F3_B = '\\dfrac{ {{b}} }{ {{D1}} }'
F3_C = '\\dfrac{ {{c}} }{1000}'
F3_SOMME = '{{a}}+{{if:o==0|' + F3_B + '+' + F3_C + '|' + F3_C + '+' + F3_B + '}}'

F3_RANG_VIDE = variation(
    'Écris ce nombre en écriture décimale.\n\n$$' + F3_SOMME + '=?$$',
    [var('s', '0..1'), var('o', '0..1'), var('a', '1..20'), var('b', '1..9'), var('c', '1..9'),
     var('D1', '{{if:s==0|10|100}}')],
    [case('{{eval:a+b/D1+c/1000;d}}', [
        erreur('{{eval:a+b/10+c/100;d}}',
               'Tu as écrit ${{b}}$ et ${{c}}$ côte à côte : ${{c}}$ ' + F3_MIL + ' s\'écrit au '
               'troisième rang après la virgule, et le rang des ' + F3_VIDE + ' reste vide : '
               'on y écrit $0$.', 'Rang vide oublié'),
        erreur('{{eval:a+(b+c)/1000;d}}',
               'Tu as additionné les numérateurs : les dénominateurs sont différents, ${{b}}$ '
               + F3_U + ' et ${{c}}$ ' + F3_MIL + ' ne s\'ajoutent pas directement.',
               'Numérateurs additionnés'),
        erreur('{{eval:a+b/(10*D1)+c/10000;d}}',
               'Tu as mis un zéro de trop : ${{b}}$ ' + F3_U + ' s\'écrit au '
               '{{if:s==0|premier|deuxième}} rang après la virgule, ${{c}}$ ' + F3_MIL + ' au '
               'troisième.', 'Un zéro de trop'),
    ])],
    [
        '$' + F3_B + '$, ce sont ${{b}}$ ' + F3_U + ' ; $' + F3_C + '$, ce sont ${{c}}$ '
        + F3_MIL + '. Il n\'y a pas de ' + F3_VIDE + ' : on écrit $0$ à ce rang.',
        '$$' + F3_SOMME + '=' + couleur('{{solution}}') + '$$',
    ],
    'Place chaque chiffre à son rang : $\\dfrac{1}{10} = 0{,}1$, $\\dfrac{1}{100} = 0{,}01$, '
    '$\\dfrac{1}{1000} = 0{,}001$. Un rang sans chiffre s\'écrit $0$.',
)

F3_PLURIEL = '{{if:p==2|centième|millième}}{{if:N>1|s|}}'

F3_VERS_FRACTION = variation(
    'Écris ce nombre sous la forme d\'une fraction décimale : numérateur entier, dénominateur '
    '$10$, $100$ ou $1000$ (pas d\'écriture à virgule).\n\n$${{x}}=?$$',
    [var('k', '0..2'), var('a', '1..30'), var('b', '1..9'), var('q', '1..9'),
     var('z0', 'eval:1-min(k,1)'), var('z2', 'eval:max(k-1,0)'), var('z1', 'eval:1-z0-z2'),
     var('p', 'eval:2+z2'),
     var('N', 'eval:z0*q+z1*(100*a+q)+z2*(1000*a+100*b+q)'),
     var('M', 'eval:z0*q+z1*(10*a+q)+z2*(100*a+10*b+q)'),
     var('F', 'eval:z0*q+z1*q+z2*(100*b+q)'),
     var('x', 'eval:N/10^p;d')],
    [case('\\frac{ {{N}} }{ {{eval:10^p}} }', [
        erreur('\\frac{ {{M}} }{ {{eval:10^(p-1)}} }',
               'Tu as oublié le zéro de ${{x}}$ : il a ${{p}}$ chiffres après la virgule, zéro '
               'compris, c\'est ${{N}}$ ' + F3_PLURIEL + '.', 'Zéro intérieur oublié'),
        erreur('\\frac{ {{N}} }{ {{eval:10^(p+1)}} }',
               'Tu as mis un zéro de trop au dénominateur : ${{x}}$ a ${{p}}$ chiffres après la '
               'virgule, il faut ${{p}}$ zéros.', 'Un zéro de trop'),
        erreur('\\frac{ {{F}} }{ {{eval:10^p}} }',
               'Tu as oublié la partie entière : ${{x}}$, c\'est ${{N}}$ ' + F3_PLURIEL + ', pas '
               'seulement ${{F}}$.', 'Partie entière oubliée'),
    ], FRACTION_DECIMALE)],
    [
        '${{x}}$ a ${{p}}$ chiffres après la virgule (le zéro compte) : c\'est ${{N}}$ '
        + F3_PLURIEL + '.',
        '$${{x}}=' + couleur('\\dfrac{ {{N}} }{ {{eval:10^p}} }') + '$$',
    ],
    'Compte les chiffres après la virgule, zéros compris : deux chiffres, ce sont des '
    'centièmes ; trois, des millièmes.',
)

F3_V = '{{if:p==1|dixièmes|centièmes}}'
F3_VB = '{{if:p==1|dixième|centième}}{{if:b>1|s|}}'

F3_DIFFERENCE = variation(
    'Écris ce nombre en écriture décimale.\n\n'
    '$${{a}}+\\dfrac{ {{b}} }{ {{D}} }-\\dfrac{ {{c}} }{ {{D}} }=?$$',
    [var('p', '1|2'), var('D', 'eval:10^p'), var('a', '2..20'), var('b', '1..8'),
     var('c', '2..9')],
    [case('{{eval:a+(b-c)/D;d}}', [
        erreur('{{eval:a+(c-b)/D;d}}',
               'Tu as calculé ${{c}} - {{b}}$ : il faut enlever ${{c}}$ ' + F3_V + ' à ${{b}}$ '
               + F3_VB + ', il n\'y en a pas assez, on prend sur les unités.',
               'Soustraction à l\'envers'),
        erreur('{{eval:a+(b+c)/D;d}}',
               'Tu as additionné les deux fractions : la deuxième est soustraite.',
               'Addition au lieu de soustraction'),
        erreur('{{eval:a+(D+b-c)/D;d}}',
               'Tu as pris $1$ unité pour faire ${{eval:D+b}} - {{c}}$, mais tu ne l\'as pas '
               'enlevée à ${{a}}$.', 'Emprunt oublié'),
    ])],
    [
        'On ne peut pas enlever ${{c}}$ ' + F3_V + ' à ${{b}}$ ' + F3_VB + ' : on prend $1$ '
        'unité, c\'est-à-dire ${{D}}$ ' + F3_V + '.',
        '$${{a}}+\\dfrac{ {{b}} }{ {{D}} }-\\dfrac{ {{c}} }{ {{D}} }={{eval:a-1}}+\\dfrac{ '
        '{{eval:D+b}} }{ {{D}} }-\\dfrac{ {{c}} }{ {{D}} }={{eval:a-1}}+\\dfrac{ {{eval:D+b-c}} '
        '}{ {{D}} }=' + couleur('{{solution}}') + '$$',
    ],
    'Il y a moins de ' + F3_V + ' dans la première fraction que dans la deuxième : change '
    'd\'abord $1$ unité en ${{D}}$ ' + F3_V + '.',
    ['c>b', 'D!=2*(c-b)', 'D!=2*c'],
)

F3_UNE_FRACTION = variation(
    'Écris ce nombre sous la forme d\'une seule fraction décimale : numérateur entier, '
    'dénominateur $10$, $100$ ou $1000$.\n\n$${{a}}+\\dfrac{ {{b}} }{100}=?$$',
    [var('a', '1..20'), var('b', '1..99'), var('J', 'eval:a*10^(1+min(floor(b/10),1))+b')],
    [case('\\frac{ {{eval:100*a+b}} }{100}', [
        erreur('\\frac{ {{eval:a+b}} }{100}',
               'Tu as ajouté ${{a}}$ au numérateur comme si c\'étaient des centièmes : ${{a}}$ '
               'unités, ce sont ${{eval:100*a}}$ centièmes.', 'Unités comptées en centièmes'),
        erreur('\\frac{ {{J}} }{100}',
               'Tu as écrit ${{a}}$ et ${{b}}$ côte à côte : ${{b}}$ centièmes s\'écrit avec deux '
               'chiffres après la virgule, et ${{a}}$ unités, ce sont ${{eval:100*a}}$ '
               'centièmes.', 'Chiffres côte à côte'),
        erreur('\\frac{ {{eval:a+b}} }{101}',
               'Tu as additionné les numérateurs et les dénominateurs : on n\'additionne que des '
               'fractions de même dénominateur. Écris d\'abord ${{a}}$ en centièmes.',
               'Numérateurs et dénominateurs additionnés'),
    ], FRACTION_DECIMALE)],
    [
        '${{a}}$ unités, ce sont ${{eval:100*a}}$ centièmes : ${{a}}=\\dfrac{ {{eval:100*a}} '
        '}{100}$.',
        '$${{a}}+\\dfrac{ {{b}} }{100}=\\dfrac{ {{eval:100*a}} }{100}+\\dfrac{ {{b}} }{100}='
        + couleur('\\dfrac{ {{eval:100*a+b}} }{100}') + '$$',
    ],
    'Écris d\'abord ${{a}}$ sous la forme d\'une fraction de dénominateur $100$ : combien de '
    'centièmes y a-t-il dans une unité ?',
    ['mod(b,10)!=0'],
)

E307 = {'k': '1', 'a': '3', 'b': '1', 'q': '7'}

SPECS_A2 = [
    # v3 : rang vide
    spec('F3 v3 : 4 + 1/10 + 7/1 000 = 4,107 (BO)', 0,
         {'s': '0', 'o': '0', 'a': '4', 'b': '1', 'c': '7'}, 'correct', ['4{,}107']),
    spec('F3 v3 : point décimal accepté', 0,
         {'s': '0', 'o': '0', 'a': '4', 'b': '1', 'c': '7'}, 'correct', ['4.107']),
    spec('F3 v3 : rang vide oublié (4,17)', 0,
         {'s': '0', 'o': '0', 'a': '4', 'b': '1', 'c': '7'}, 'incorrect', ['4{,}17'],
         'Tu as écrit $1$ et $7$ côte à côte : $7$ millièmes s\'écrit au troisième rang après la '
         'virgule, et le rang des centièmes reste vide : on y écrit $0$.'),
    spec('F3 v3 : numérateurs additionnés (4,008)', 0,
         {'s': '0', 'o': '0', 'a': '4', 'b': '1', 'c': '7'}, 'incorrect', ['4{,}008'],
         'Tu as additionné les numérateurs : les dénominateurs sont différents, $1$ dixième et '
         '$7$ millièmes ne s\'ajoutent pas directement.'),
    spec('F3 v3 : un zéro de trop (4,010 7)', 0,
         {'s': '0', 'o': '0', 'a': '4', 'b': '1', 'c': '7'}, 'incorrect', ['4{,}010\\,7'],
         'Tu as mis un zéro de trop : $1$ dixième s\'écrit au premier rang après la virgule, $7$ '
         'millièmes au troisième.'),
    spec('F3 v3 : dans le désordre, 12 + 3/1 000 + 5/100 = 12,053', 0,
         {'s': '1', 'o': '1', 'a': '12', 'b': '5', 'c': '3'}, 'correct', ['12{,}053']),
    spec('F3 v3 : dans le désordre, rang vide oublié (12,53)', 0,
         {'s': '1', 'o': '1', 'a': '12', 'b': '5', 'c': '3'}, 'incorrect', ['12{,}53'],
         'Tu as écrit $5$ et $3$ côte à côte : $3$ millièmes s\'écrit au troisième rang après la '
         'virgule, et le rang des dixièmes reste vide : on y écrit $0$.'),
    # v4 : décimal → fraction décimale (une case)
    spec('F3 v4 : 3,07 = 307/100', 1, E307, 'correct', ['\\frac{307}{100}']),
    spec('F3 v4 : 3 070/1 000, juste aussi', 1, E307, 'correct', ['\\frac{3\\,070}{1\\,000}']),
    spec('F3 v4 : 3,07 en écriture décimale refusé', 1, E307, 'bad_form', ['3{,}07'],
         violations=['form']),
    spec('F3 v4 : entier + fraction refusé', 1, E307, 'bad_form', ['3+\\frac{7}{100}'],
         violations=['form']),
    spec('F3 v4 : dénominateur non décimal refusé (307/100 = 614/200)', 1, E307, 'bad_form',
         ['\\frac{614}{200}'], violations=['form']),
    spec('F3 v4 : zéro intérieur oublié (37/10)', 1, E307, 'incorrect', ['\\frac{37}{10}'],
         'Tu as oublié le zéro de $3.07$ : il a $2$ chiffres après la virgule, zéro compris, '
         'c\'est $307$ centièmes.'),
    spec('F3 v4 : un zéro de trop (307/1 000)', 1, E307, 'incorrect', ['\\frac{307}{1\\,000}'],
         'Tu as mis un zéro de trop au dénominateur : $3.07$ a $2$ chiffres après la virgule, il '
         'faut $2$ zéros.'),
    spec('F3 v4 : partie entière oubliée (7/100)', 1, E307, 'incorrect', ['\\frac{7}{100}'],
         'Tu as oublié la partie entière : $3.07$, c\'est $307$ centièmes, pas seulement $7$.'),
    spec('F3 v4 : 0,07 = 7/100', 1, {'k': '0', 'a': '3', 'b': '1', 'q': '7'}, 'correct',
         ['\\frac{7}{100}']),
    spec('F3 v4 : 0,07, zéro oublié (7/10)', 1, {'k': '0', 'a': '3', 'b': '1', 'q': '7'},
         'incorrect', ['\\frac{7}{10}'],
         'Tu as oublié le zéro de $0.07$ : il a $2$ chiffres après la virgule, zéro compris, '
         'c\'est $7$ centièmes.'),
    spec('F3 v4 : 3,04 = 304/100, simplifiable mais juste', 1,
         {'k': '1', 'a': '3', 'b': '1', 'q': '4'}, 'correct', ['\\frac{304}{100}']),
    spec('F3 v4 : 12,405 = 12 405/1 000', 1, {'k': '2', 'a': '12', 'b': '4', 'q': '5'},
         'correct', ['\\frac{12\\,405}{1\\,000}']),
    spec('F3 v4 : 12405 sans espace', 1, {'k': '2', 'a': '12', 'b': '4', 'q': '5'},
         'unoptimal_form', ['\\frac{12405}{1\\,000}'], violations=['spaces']),
    spec('F3 v4 : 12,405, zéro oublié (1 245/100)', 1, {'k': '2', 'a': '12', 'b': '4', 'q': '5'},
         'incorrect', ['\\frac{1\\,245}{100}'],
         'Tu as oublié le zéro de $12.405$ : il a $3$ chiffres après la virgule, zéro compris, '
         'c\'est $12405$ millièmes.'),
    # v5 : différence avec emprunt
    spec('F3 v5 : 5 + 3/10 − 7/10 = 4,6', 2, {'p': '1', 'a': '5', 'b': '3', 'c': '7'}, 'correct',
         ['4{,}6']),
    spec('F3 v5 : soustraction à l\'envers (5,4)', 2, {'p': '1', 'a': '5', 'b': '3', 'c': '7'},
         'incorrect', ['5{,}4'],
         'Tu as calculé $7 - 3$ : il faut enlever $7$ dixièmes à $3$ dixièmes, il n\'y en a pas '
         'assez, on prend sur les unités.'),
    spec('F3 v5 : addition (6)', 2, {'p': '1', 'a': '5', 'b': '3', 'c': '7'}, 'incorrect', ['6'],
         'Tu as additionné les deux fractions : la deuxième est soustraite.'),
    spec('F3 v5 : emprunt oublié (5,6)', 2, {'p': '1', 'a': '5', 'b': '3', 'c': '7'},
         'incorrect', ['5{,}6'],
         'Tu as pris $1$ unité pour faire $13 - 7$, mais tu ne l\'as pas enlevée à $5$.'),
    spec('F3 v5 : 12 + 4/100 − 9/100 = 11,95', 2, {'p': '2', 'a': '12', 'b': '4', 'c': '9'},
         'correct', ['11{,}95']),
    spec('F3 v5 : centièmes, emprunt oublié (12,95)', 2,
         {'p': '2', 'a': '12', 'b': '4', 'c': '9'}, 'incorrect', ['12{,}95'],
         'Tu as pris $1$ unité pour faire $104 - 9$, mais tu ne l\'as pas enlevée à $12$.'),
    # v6 : une seule fraction décimale (une case)
    spec('F3 v6 : 4 + 37/100 = 437/100', 3, {'a': '4', 'b': '37'}, 'correct',
         ['\\frac{437}{100}']),
    spec('F3 v6 : 4 370/1 000, juste aussi', 3, {'a': '4', 'b': '37'}, 'correct',
         ['\\frac{4\\,370}{1\\,000}']),
    spec('F3 v6 : écriture décimale refusée', 3, {'a': '4', 'b': '37'}, 'bad_form', ['4{,}37'],
         violations=['form']),
    spec('F3 v6 : somme recopiée refusée', 3, {'a': '4', 'b': '37'}, 'bad_form',
         ['4+\\frac{37}{100}'], violations=['form']),
    spec('F3 v6 : unités comptées en centièmes (41/100)', 3, {'a': '4', 'b': '37'}, 'incorrect',
         ['\\frac{41}{100}'],
         'Tu as ajouté $4$ au numérateur comme si c\'étaient des centièmes : $4$ unités, ce sont '
         '$400$ centièmes.'),
    spec('F3 v6 : numérateurs et dénominateurs additionnés (41/101)', 3, {'a': '4', 'b': '37'},
         'incorrect', ['\\frac{41}{101}'],
         'Tu as additionné les numérateurs et les dénominateurs : on n\'additionne que des '
         'fractions de même dénominateur. Écris d\'abord $4$ en centièmes.'),
    spec('F3 v6 : 6 + 7/100 = 607/100', 3, {'a': '6', 'b': '7'}, 'correct',
         ['\\frac{607}{100}']),
    spec('F3 v6 : chiffres côte à côte (67/100)', 3, {'a': '6', 'b': '7'}, 'incorrect',
         ['\\frac{67}{100}'],
         'Tu as écrit $6$ et $7$ côte à côte : $7$ centièmes s\'écrit avec deux chiffres après la '
         'virgule, et $6$ unités, ce sont $600$ centièmes.'),
    spec('F3 v6 : 18 + 6/100 = 1 806/100, simplifiable mais juste', 3, {'a': '18', 'b': '6'},
         'correct', ['\\frac{1\\,806}{100}']),
]


# =============================================================================================
# 2c5bae8f — 6-102, liens entre les unités de numération. F4 : (v6) vers une unité plus grande,
# « 1 centième = ? dixième » → 0,1 (écart d'un ou deux rangs) ; (v7) « 347 centièmes = ? unités »
# → 3,47. Rangs : 0 millième, 1 centième, 2 dixième, 3 unité, 4 dizaine, 5 centaine, 6 millier.
# =============================================================================================

NOMS = ['millième', 'centième', 'dixième', 'unité', 'dizaine', 'centaine', 'millier']


def nom(v, pluriel=False):
    return selon(v, [n + ('s' if pluriel else '') for n in NOMS])


F4_PLUS_GRANDE = variation(
    'Complète.\n\n$$1~\\text{' + nom('u') + '} = ?~\\text{' + nom('w') + '}$$',
    [var('u', '0..5'), var('w', '1..6'), var('p', 'eval:w-u')],
    [case('{{eval:10^(-p);d}}', [
        erreur('{{eval:10^p}}',
               'C\'est l\'inverse : il faut ${{eval:10^p}}$ ' + nom('u', True) + ' pour faire $1$ '
               + nom('w') + ', le nombre cherché est plus petit que $1$.', 'Rapport à l\'envers'),
        erreur('{{eval:10^(-p-1);d}}',
               'Tu as compté un rang de trop : des ' + nom('u', True) + ' aux ' + nom('w', True)
               + ', on monte de ${{p}}$ rang{{if:p>1|s|}}.', 'Un rang de trop'),
    ])],
    [
        '**Unités de numération.** D\'un rang au rang juste à sa gauche, on multiplie par $10$. '
        'Des ' + nom('u', True) + ' aux ' + nom('w', True) + ', on monte de ${{p}}$ '
        'rang{{if:p>1|s|}} : $1$ ' + nom('w') + ' $= {{eval:10^p}}$ ' + nom('u', True) + '.',
        'Donc $1$ ' + nom('u') + ', c\'est ${{eval:10^p}}$ fois moins : $1 \\div {{eval:10^p}} = '
        '{{solution}}$.',
        '$$1~\\text{' + nom('u') + '} = ' + couleur('{{solution}}') + '~\\text{' + nom('w')
        + '}$$',
    ],
    'Combien de ' + nom('u', True) + ' faut-il pour faire $1$ ' + nom('w') + ' ? $1$ '
    + nom('u') + ' n\'en est qu\'une partie.',
    ['p>=1', 'p<=2'],
)

F4_GRAND = '{{if:big==1|unités|unité}}'

F4_VERS_UNITES = variation(
    'Complète.\n\n$${{N}}~\\text{' + nom('u', True) + '} = ?~\\text{' + F4_GRAND + '}$$',
    [var('n', '2..4'), var('N', 'digits:n'), var('u', '0..2'), var('p', 'eval:3-u'),
     var('big', 'eval:min(floor(N/(2*10^p)),1)')],
    [case('{{eval:N/10^p;d}}', [
        erreur('{{eval:N*10^p}}',
               'C\'est l\'inverse : il faut ${{eval:10^p}}$ ' + nom('u', True) + ' pour faire $1$ '
               'unité, il y a donc moins d\'unités que de ' + nom('u', True) + '.',
               'Rapport à l\'envers'),
        erreur('{{eval:N/10^(p+1);d}}',
               'Tu as décalé la virgule d\'un rang de trop : $1$ unité $= {{eval:10^p}}$ '
               + nom('u', True) + ', on divise par ${{eval:10^p}}$.', 'Un rang de trop'),
        erreur('{{eval:N/10^(p-1);d}}',
               '{{if:p==1|Tu as recopié le nombre de dixièmes : $10$ dixièmes font $1$ unité, il '
               'faut diviser par $10$.|Tu n\'as pas décalé la virgule assez loin : $1$ unité $= '
               '{{eval:10^p}}$ ' + nom('u', True) + ', on divise par ${{eval:10^p}}$.}}',
               'Un rang de moins'),
    ])],
    [
        '$1$ unité $= {{eval:10^p}}$ ' + nom('u', True) + ' : on cherche combien de fois '
        '${{eval:10^p}}$ dans ${{N}}$, on divise par ${{eval:10^p}}$. Le chiffre des unités de '
        '${{N}}$ devient le chiffre des ' + nom('u', True) + '.',
        '$${{N}} \\div {{eval:10^p}} = ' + couleur('{{solution}}') + '$$',
    ],
    'Combien de ' + nom('u', True) + ' faut-il pour faire $1$ unité ? Divise par ce nombre.',
    ['mod(N,10)!=0'],
)

SPECS_2C = [
    spec('F4 v6 : 1 centième = 0,1 dixième', 0, {'u': '1', 'w': '2'}, 'correct', ['0{,}1']),
    spec('F4 v6 : point décimal accepté', 0, {'u': '1', 'w': '2'}, 'correct', ['0.1']),
    spec('F4 v6 : rapport à l\'envers (10)', 0, {'u': '1', 'w': '2'}, 'incorrect', ['10'],
         'C\'est l\'inverse : il faut $10$ centièmes pour faire $1$ dixième, le nombre cherché '
         'est plus petit que $1$.'),
    spec('F4 v6 : un rang de trop (0,01)', 0, {'u': '1', 'w': '2'}, 'incorrect', ['0{,}01'],
         'Tu as compté un rang de trop : des centièmes aux dixièmes, on monte de $1$ rang.'),
    spec('F4 v6 : 1 dizaine = 0,01 millier', 0, {'u': '4', 'w': '6'}, 'correct', ['0{,}01']),
    spec('F4 v6 : dizaine → millier, rapport à l\'envers (100)', 0, {'u': '4', 'w': '6'},
         'incorrect', ['100'],
         'C\'est l\'inverse : il faut $100$ dizaines pour faire $1$ millier, le nombre cherché est '
         'plus petit que $1$.'),
    spec('F4 v6 : un rang de moins (0,1)', 0, {'u': '4', 'w': '6'}, 'incorrect', ['0{,}1']),
    spec('F4 v7 : 347 centièmes = 3,47 unités', 1, {'n': '3', 'N': '347', 'u': '1'}, 'correct',
         ['3{,}47']),
    spec('F4 v7 : rapport à l\'envers (34 700)', 1, {'n': '3', 'N': '347', 'u': '1'},
         'incorrect', ['34\\,700'],
         'C\'est l\'inverse : il faut $100$ centièmes pour faire $1$ unité, il y a donc moins '
         'd\'unités que de centièmes.'),
    spec('F4 v7 : un rang de trop (0,347)', 1, {'n': '3', 'N': '347', 'u': '1'}, 'incorrect',
         ['0{,}347'],
         'Tu as décalé la virgule d\'un rang de trop : $1$ unité $= 100$ centièmes, on divise par '
         '$100$.'),
    spec('F4 v7 : un rang de moins (34,7)', 1, {'n': '3', 'N': '347', 'u': '1'}, 'incorrect',
         ['34{,}7'],
         'Tu n\'as pas décalé la virgule assez loin : $1$ unité $= 100$ centièmes, on divise par '
         '$100$.'),
    spec('F4 v7 : 47 millièmes = 0,047 unité', 1, {'n': '2', 'N': '47', 'u': '0'}, 'correct',
         ['0{,}047']),
    spec('F4 v7 : 2 358 dixièmes = 235,8 unités', 1, {'n': '4', 'N': '2358', 'u': '2'},
         'correct', ['235{,}8']),
    spec('F4 v7 : dixièmes recopiés (2 358)', 1, {'n': '4', 'N': '2358', 'u': '2'}, 'incorrect',
         ['2\\,358'],
         'Tu as recopié le nombre de dixièmes : $10$ dixièmes font $1$ unité, il faut diviser par '
         '$10$.'),
]


# =============================================================================================
# 8d7edbde — 6-103, grands nombres jusqu'aux milliards. F5 : deux unités de numération qui se
# chevauchent, « 35 millions et 12 centaines de mille » = 36 200 000. Rang R de la grande unité
# (4 dizaines de mille … 9 milliards), la petite au rang R − 1 ; k2 ≥ 11 déborde toujours.
# =============================================================================================

GRANDS = ['', '', '', 'millier', 'dizaine de mille', 'centaine de mille', 'million',
          'dizaine de millions', 'centaine de millions', 'milliard']
GRANDS_PL = ['', '', '', 'milliers', 'dizaines de mille', 'centaines de mille', 'millions',
             'dizaines de millions', 'centaines de millions', 'milliards']


def grand(v, decalage, pluriel):
    """Nom du rang (v + decalage), v de 4 à 9."""
    noms = GRANDS_PL if pluriel else GRANDS
    return selon(v, [noms[i + decalage] for i in range(4, 10)], 4)


# Noms des rangs au pluriel seulement (une variable ne porte pas de texte, et un message est
# limité à 500 caractères) : les messages parlent en chiffres, pas en « 1 million ».
F5_BIG = grand('R', 0, True)
F5_SMALL = grand('R', -1, True)

F5 = variation(
    'Écris ce nombre en chiffres.\n\n$${{k1}}~\\text{' + F5_BIG + ' et }{{k2}}~\\text{'
    + F5_SMALL + '} = ?$$',
    [var('k1', '2..99'), var('k2', '11..99'), var('R', '4..9'), var('tq', 'eval:floor(k2/10)'),
     var('uq', 'eval:mod(k2,10)')],
    [case('{{eval:k1*10^R+k2*10^(R-1)}}', [
        erreur('{{eval:(100*k1+k2)*10^(R-1)}}',
               'Tu as écrit ${{k1}}$ et ${{k2}}$ l\'un après l\'autre : il faut additionner '
               '${{k1}}$ ' + F5_BIG + ' et ${{k2}}$ ' + F5_SMALL + '.', 'Nombres juxtaposés'),
        erreur('{{eval:(10*k1+uq)*10^(R-1)}}',
               'Tu as oublié la retenue : ${{k2}}$ ' + F5_SMALL + ' $= {{eval:k2*10^(R-1)}}$, '
               'cela ajoute ${{tq}}$ au rang des ' + F5_BIG + '.', 'Retenue oubliée'),
        erreur('{{eval:(k1+k2)*10^R}}',
               'Tu as additionné ${{k1}}$ et ${{k2}}$ comme si c\'étaient des ' + F5_BIG + ' : '
               '${{k2}}$ ' + F5_SMALL + ', ce n\'est que ${{eval:k2*10^(R-1)}}$.',
               'Tout compté dans la grande unité'),
    ])],
    [
        '${{k1}}$ ' + F5_BIG + ' $= {{eval:k1*10^R}}$ et ${{k2}}$ ' + F5_SMALL + ' $= {{k2}} '
        '\\times {{eval:10^(R-1)}} = {{eval:k2*10^(R-1)}}$.',
        'On additionne : les ${{k2}}$ ' + F5_SMALL + ' ajoutent ${{tq}}$ au rang des ' + F5_BIG
        + '.',
        '$${{eval:k1*10^R}} + {{eval:k2*10^(R-1)}} = ' + couleur('{{solution}}') + '$$',
    ],
    'Écris chaque partie en chiffres, puis additionne-les. Attention à la retenue !',
    ['mod(k2,10)!=0'],
)

SPECS_8D = [
    spec('F5 : 35 millions et 12 centaines de mille = 36 200 000', 0,
         {'k1': '35', 'k2': '12', 'R': '6'}, 'correct', ['36\\,200\\,000']),
    spec('F5 : sans espaces', 0, {'k1': '35', 'k2': '12', 'R': '6'}, 'unoptimal_form',
         ['36200000'], violations=['spaces']),
    spec('F5 : juxtaposés (351 200 000)', 0, {'k1': '35', 'k2': '12', 'R': '6'}, 'incorrect',
         ['351\\,200\\,000'],
         'Tu as écrit $35$ et $12$ l\'un après l\'autre : il faut additionner $35$ millions et '
         '$12$ centaines de mille.'),
    spec('F5 : retenue oubliée (35 200 000)', 0, {'k1': '35', 'k2': '12', 'R': '6'},
         'incorrect', ['35\\,200\\,000'],
         'Tu as oublié la retenue : $12$ centaines de mille $= 1200000$, cela ajoute $1$ au rang '
         'des millions.'),
    spec('F5 : tout en millions (47 000 000)', 0, {'k1': '35', 'k2': '12', 'R': '6'},
         'incorrect', ['47\\,000\\,000'],
         'Tu as additionné $35$ et $12$ comme si c\'étaient des millions : $12$ centaines de '
         'mille, ce n\'est que $1200000$.'),
    spec('F5 : 7 milliards et 45 centaines de millions = 11 500 000 000', 0,
         {'k1': '7', 'k2': '45', 'R': '9'}, 'correct', ['11\\,500\\,000\\,000']),
    spec('F5 : 23 dizaines de mille et 68 milliers = 298 000', 0,
         {'k1': '23', 'k2': '68', 'R': '4'}, 'correct', ['298\\,000']),
]


# =============================================================================================
# d7781eed — 6-104, reconnaître un nombre décimal. F6 : « Montre que a/b est un nombre décimal »,
# b parmi 2, 4, 5, 20, 25, 50, 200, 250, 500 ; a premier avec 10 (fraction irréductible).
# D = plus petit dénominateur 10, 100 ou 1 000 multiple de b, f = D/b ; toute fraction égale de
# dénominateur 10, 100 ou 1 000 est juste. nd = nombre de chiffres de b.
# =============================================================================================

F6 = variation(
    'Montre que $\\dfrac{ {{a}} }{ {{b}} }$ est un nombre décimal : écris-le sous la forme d\'une '
    'fraction de numérateur entier et de dénominateur $10$, $100$ ou $1000$.\n\n'
    '$$\\dfrac{ {{a}} }{ {{b}} }=?$$',
    [var('b', '2|4|5|20|25|50|200|250|500'), var('a', '1..49'),
     var('q', 'eval:1+min(mod(10,b),1)+min(mod(100,b),1)'), var('D', 'eval:10^q'),
     var('f', 'eval:D/b'), var('nd', 'eval:1+min(floor(b/10),1)+min(floor(b/100),1)')],
    [case('\\frac{ {{eval:a*f}} }{ {{D}} }', [
        erreur('\\frac{ {{eval:a+D-b}} }{ {{D}} }',
               'Tu as ajouté le même nombre en haut et en bas : cela change la fraction. Il faut '
               'multiplier le numérateur et le dénominateur par le même nombre.',
               'Même nombre ajouté'),
        erreur('\\frac{ {{a}} }{ {{D}} }',
               'Tu as changé le dénominateur sans changer le numérateur : si tu multiplies '
               '${{b}}$ par ${{f}}$, multiplie aussi ${{a}}$ par ${{f}}$.',
               'Numérateur inchangé'),
        erreur('{{eval:a+b/10^nd;d}}',
               'Une fraction n\'est pas un nombre à virgule : $\\dfrac{ {{a}} }{ {{b}} }$, c\'est '
               '${{a}} \\div {{b}}$.', 'Barre de fraction lue comme une virgule'),
    ], FRACTION_DECIMALE)],
    [
        '${{b}} \\times {{f}} = {{D}}$ : on multiplie le numérateur et le dénominateur par '
        '${{f}}$.',
        '$$\\dfrac{ {{a}} }{ {{b}} }=\\dfrac{ {{a}} \\times {{f}} }{ {{b}} \\times {{f}} }='
        + couleur('\\dfrac{ {{eval:a*f}} }{ {{D}} }') + '$$',
        'C\'est une fraction décimale : $\\dfrac{ {{a}} }{ {{b}} } = {{eval:a/b;d}}$ est un nombre '
        'décimal.',
    ],
    'Par quel nombre faut-il multiplier ${{b}}$ pour obtenir $10$, $100$ ou $1000$ ?',
    ['mod(a,2)!=0', 'mod(a,5)!=0'],
)

SPECS_D7 = [
    spec('F6 : 7/25 = 28/100', 0, {'b': '25', 'a': '7'}, 'correct', ['\\frac{28}{100}']),
    spec('F6 : 7/25 = 280/1 000, juste aussi', 0, {'b': '25', 'a': '7'}, 'correct',
         ['\\frac{280}{1\\,000}']),
    spec('F6 : 7/25 recopié refusé (dénominateur non décimal)', 0, {'b': '25', 'a': '7'},
         'bad_form', ['\\frac{7}{25}'], violations=['form']),
    spec('F6 : écriture décimale refusée', 0, {'b': '25', 'a': '7'}, 'bad_form', ['0{,}28'],
         violations=['form']),
    spec('F6 : même nombre ajouté (82/100)', 0, {'b': '25', 'a': '7'}, 'incorrect',
         ['\\frac{82}{100}'],
         'Tu as ajouté le même nombre en haut et en bas : cela change la fraction. Il faut '
         'multiplier le numérateur et le dénominateur par le même nombre.'),
    spec('F6 : numérateur inchangé (7/100)', 0, {'b': '25', 'a': '7'}, 'incorrect',
         ['\\frac{7}{100}'],
         'Tu as changé le dénominateur sans changer le numérateur : si tu multiplies $25$ par '
         '$4$, multiplie aussi $7$ par $4$.'),
    spec('F6 : barre lue comme une virgule (7,25)', 0, {'b': '25', 'a': '7'}, 'incorrect',
         ['7{,}25'],
         'Une fraction n\'est pas un nombre à virgule : $\\dfrac{7}{25}$, c\'est $7 \\div 25$.'),
    spec('F6 : 3/2 = 15/10', 0, {'b': '2', 'a': '3'}, 'correct', ['\\frac{15}{10}']),
    spec('F6 : 9/250 = 36/1 000', 0, {'b': '250', 'a': '9'}, 'correct',
         ['\\frac{36}{1\\,000}']),
    spec('F6 : 1000 sans espace', 0, {'b': '250', 'a': '9'}, 'unoptimal_form',
         ['\\frac{36}{1000}'], violations=['spaces']),
]


ajouter('4bcbbaae', [F1_DECIMAL, F1_GRAND], SPECS_4B)
ajouter('4d825d44', [F2], SPECS_4D)
ajouter('a2ae7206', [F3_RANG_VIDE, F3_VERS_FRACTION, F3_DIFFERENCE, F3_UNE_FRACTION], SPECS_A2,
        SANS_REDUCTION)
ajouter('2c5bae8f', [F4_PLUS_GRANDE, F4_VERS_UNITES], SPECS_2C)
ajouter('8d7edbde', [F5], SPECS_8D)
ajouter('d7781eed', [F6], SPECS_D7, SANS_REDUCTION)
