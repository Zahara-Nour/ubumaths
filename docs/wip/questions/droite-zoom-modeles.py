"""Écrit le modèle neuf « Lire une abscisse grâce à des zooms » (chantier droite-zoom, PR 2).

Sortie : scripts/questions/droite-zoom-modeles/. Phase 0 validée par David le 2026-11-24 (journal
docs/wip/droite-zoom-progress.md, § PR 2) : idées 6N1H-3 et 6N1H-4 reprises d'ailleurs, mises à la
forme de notre format (bloc ```line avec `zoom:`, outil n° 54, #3052).

- Un seul modèle, six variations : v0 au dixième (1 zoom), v1 au centième (1 zoom), v2 au millième
  (2 zooms), v3 au millième sous trois écritures, v4 grand entier (2 zooms), v5 grand entier depuis
  les millions (3 zooms).
- Rien d'écrit sur les zooms dans l'énoncé (Q1) : l'élève retrouve leurs bouts ; le corrigé redessine
  les droites avec les bouts écrits.
- Chiffres tirés de 2 à 8 : le point n'est jamais sur une graduation de la droite du dessus ni au
  bord d'un zoom. En v3, le dernier chiffre est 3 ou 7 : les fractions sur 1 000 sont irréductibles
  (sinon la réponse attendue serait « à simplifier »).

Grades 6, niveau 1. Ni theme, ni domain, ni id ; `rangement` lu par migration-rangement.ts.

Usage : python3 docs/wip/questions/droite-zoom-modeles.py scripts/questions/droite-zoom-modeles
"""
import json
import os
import sys

DOSSIER = sys.argv[1]

PRIMAIRE = '\\textcolor{{{color:primary.0}}}'
OPTIONS = {'constraints': {'spacesFromFourDigits': True}}
CONSIGNE = 'Quel nombre repère le point $B$ ?'
HINT = ('Sur chaque droite agrandie, un petit intervalle vaut dix fois moins que sur la droite du '
        'dessus. Écris d\'abord les nombres des deux bouts de chaque droite agrandie.')
COMPTEES = ('Tu as compté les graduations, celle du bout gauche comprise : compte plutôt les bonds '
            'd\'une graduation à la suivante.')


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


def var(nom, expression):
    return {'name': nom, 'expression': expression}


def erreur(answer, message, label):
    return {'answer': answer, 'message': message, 'label': label}


def variation(statement, variables, blanks, steps, conditions=None):
    return {'statement': statement, 'variables': variables, 'conditions': conditions or [],
            'blanks': [{'expectedAnswer': b[0], **({'requiredForm': b[2]} if len(b) > 2 else {}),
                        'expectedErrors': b[1]} for b in blanks],
            'correction': {'steps': steps}, 'hint': HINT}


def ligne(*lignes):
    return '```line\n' + '\n'.join(lignes) + '\n```'


# ---------------------------------------------------------------------------------------------
# v0 : au dixième, un zoom. Droite de O à O + 9, de 1 en 1 ; zoom entre les deux entiers.
V0_VARS = [var('O', '5..10'), var('u', '1..5'), var('a', '2..8'),
           var('G', 'eval:O+u'), var('D', 'eval:O+u+1'),
           var('X', 'eval:(10*(O+u)+a)/10;d')]


def v0_droite(avec_labels):
    z = 'zoom: {{G}} ; {{D}} ; step 0.1'
    return ligne('start: {{O}}', 'end: {{eval:O+9}}', 'step: 1', 'labels: {{O}}, {{eval:O+9}}',
                 'points: B={{X}}', z + (' ; labels {{G}}, {{D}}' if avec_labels else ''))


V0 = variation(
    CONSIGNE + '\n\n' + v0_droite(False) + '\n\n$$B : ?$$',
    V0_VARS,
    [('{{X}}', [
        erreur('{{eval:O+u+a}}',
               'Sur la droite agrandie, un petit intervalle ne vaut plus $1$ : l\'unité de '
               '${{G}}$ à ${{D}}$ y est partagée en $10$, chaque petit intervalle vaut $0.1$.',
               'Pas de la droite du dessus gardé'),
        erreur('{{eval:(10*O+a)/10;d}}',
               'La droite agrandie ne commence pas à ${{O}}$ : regarde entre quelles graduations '
               'de la droite du dessus elle est tirée.',
               'Zoom lu depuis le début de la droite'),
        erreur('{{eval:(10*(O+u)+a+1)/10;d}}', COMPTEES,
               'Graduations comptées au lieu des intervalles'),
    ])],
    ['**Les bouts de la droite agrandie.** Sur la première droite, $B$ est entre ${{G}}$ et '
     '${{D}}$ : la droite agrandie va de ${{G}}$ à ${{D}}$.',
     '**Ce que vaut un petit intervalle.** De ${{G}}$ à ${{D}}$, l\'unité est partagée en $10$ : '
     'chaque petit intervalle vaut $0.1$.',
     '**Lire le point.** $B$ est à ${{a}}$ petits intervalles de ${{G}}$ : $B = ' + PRIMAIRE
     + '{{{X}}}$.\n\n' + v0_droite(True)])

V0_SPECS = [
    spec('v0 : juste, virgule', 0, {'O': '6', 'u': '2', 'a': '6'}, 'correct', ['8{,}6']),
    spec('v0 : juste, point', 0, {'O': '6', 'u': '2', 'a': '6'}, 'correct', ['8.6']),
    spec('v0 : pas de 1 gardé', 0, {'O': '6', 'u': '2', 'a': '6'}, 'incorrect', ['14'],
         'Sur la droite agrandie, un petit intervalle ne vaut plus $1$ : l\'unité de $8$ à $9$ y '
         'est partagée en $10$, chaque petit intervalle vaut $0.1$.'),
    spec('v0 : zoom lu depuis le début', 0, {'O': '6', 'u': '2', 'a': '6'}, 'incorrect',
         ['6{,}6'],
         'La droite agrandie ne commence pas à $6$ : regarde entre quelles graduations de la '
         'droite du dessus elle est tirée.'),
    spec('v0 : graduations comptées', 0, {'O': '6', 'u': '2', 'a': '6'}, 'incorrect', ['8{,}7'],
         COMPTEES),
    spec('v0 : un entier de plus', 0, {'O': '10', 'u': '5', 'a': '8'}, 'correct', ['15{,}8']),
]

# ---------------------------------------------------------------------------------------------
# v1 : au centième, un zoom. Droite de n à n + 1, de 0,1 en 0,1.
V1_VARS = [var('n', '1..15'), var('a', '2..8'), var('b', '2..8'),
           var('G', 'eval:(10*n+a)/10;d'), var('D', 'eval:(10*n+a+1)/10;d'),
           var('X', 'eval:(100*n+10*a+b)/100;d')]


def v1_droite(avec_labels):
    z = 'zoom: {{G}} ; {{D}} ; step 0.01'
    return ligne('start: {{n}}', 'end: {{eval:n+1}}', 'step: 0.1', 'labels: {{n}}, {{eval:n+1}}',
                 'points: B={{X}}', z + (' ; labels {{G}}, {{D}}' if avec_labels else ''))


V1 = variation(
    CONSIGNE + '\n\n' + v1_droite(False) + '\n\n$$B : ?$$',
    V1_VARS,
    [('{{X}}', [
        erreur('{{eval:(10*n+a+b)/10;d}}',
               'Sur la droite agrandie, un petit intervalle ne vaut plus $0.1$ : de ${{G}}$ à '
               '${{D}}$, le dixième est partagé en $10$, chaque petit intervalle vaut $0.01$.',
               'Pas de la droite du dessus gardé'),
        erreur('{{G}}',
               'Tu as lu le bout gauche de la droite agrandie : $B$ est plus loin, compte les '
               'petits intervalles qui l\'en séparent.',
               'Bout gauche du zoom'),
        erreur('{{eval:(100*n+10*a+b+1)/100;d}}', COMPTEES,
               'Graduations comptées au lieu des intervalles'),
    ])],
    ['**Les bouts de la droite agrandie.** Sur la première droite, chaque petit intervalle vaut '
     '$0.1$ : $B$ est entre ${{G}}$ et ${{D}}$, les bouts de la droite agrandie.',
     '**Ce que vaut un petit intervalle.** De ${{G}}$ à ${{D}}$, le dixième est partagé en $10$ : '
     'chaque petit intervalle vaut $0.01$.',
     '**Lire le point.** $B$ est à ${{b}}$ petits intervalles de ${{G}}$ : $B = ' + PRIMAIRE
     + '{{{X}}}$.\n\n' + v1_droite(True)])

V1_SPECS = [
    spec('v1 : juste', 1, {'n': '12', 'a': '4', 'b': '7'}, 'correct', ['12{,}47']),
    spec('v1 : juste, point', 1, {'n': '12', 'a': '4', 'b': '7'}, 'correct', ['12.47']),
    spec('v1 : pas de 0,1 gardé', 1, {'n': '12', 'a': '4', 'b': '7'}, 'incorrect', ['13{,}1'],
         'Sur la droite agrandie, un petit intervalle ne vaut plus $0.1$ : de $12.4$ à $12.5$, '
         'le dixième est partagé en $10$, chaque petit intervalle vaut $0.01$.'),
    spec('v1 : bout gauche', 1, {'n': '12', 'a': '4', 'b': '7'}, 'incorrect', ['12{,}4'],
         'Tu as lu le bout gauche de la droite agrandie : $B$ est plus loin, compte les petits '
         'intervalles qui l\'en séparent.'),
    spec('v1 : graduations comptées', 1, {'n': '12', 'a': '4', 'b': '7'}, 'incorrect',
         ['12{,}48'], COMPTEES),
    spec('v1 : zéro final accepté', 1, {'n': '3', 'a': '2', 'b': '8'}, 'correct', ['3{,}28']),
]

# ---------------------------------------------------------------------------------------------
# v2 et v3 : au millième, deux zooms.
V2_VARS = [var('n', '1..15'), var('a', '2..8'), var('b', '2..8'), var('c', '2..8'),
           var('G', 'eval:(10*n+a)/10;d'), var('D', 'eval:(10*n+a+1)/10;d'),
           var('H', 'eval:(100*n+10*a+b)/100;d'), var('K', 'eval:(100*n+10*a+b+1)/100;d'),
           var('X', 'eval:(1000*n+100*a+10*b+c)/1000;d')]


def v2_droite(avec_labels):
    z1 = 'zoom: {{G}} ; {{D}} ; step 0.01'
    z2 = 'zoom: {{H}} ; {{K}} ; step 0.001'
    if avec_labels:
        z1 += ' ; labels {{G}}, {{D}}'
        z2 += ' ; labels {{H}}, {{K}}'
    return ligne('start: {{n}}', 'end: {{eval:n+1}}', 'step: 0.1', 'labels: {{n}}, {{eval:n+1}}',
                 'points: B={{X}}', z1, z2)


V2_ERREURS = [
    erreur('{{H}}',
           'Tu t\'es arrêté au premier zoom : $B$ se lit sur la dernière droite agrandie, au '
           'millième.',
           'Arrêt au premier zoom'),
    erreur('{{eval:(100*n+10*a+b+c)/100;d}}',
           'Sur la dernière droite, un petit intervalle ne vaut plus $0.01$ : de ${{H}}$ à '
           '${{K}}$, le centième est partagé en $10$, chaque petit intervalle vaut $0.001$.',
           'Pas de la droite du dessus gardé'),
    erreur('{{eval:(1000*n+100*a+10*b+c+1)/1000;d}}', COMPTEES,
           'Graduations comptées au lieu des intervalles'),
]
V2_ETAPES = [
    '**Premier zoom.** Sur la première droite, chaque petit intervalle vaut $0.1$ : $B$ est entre '
    '${{G}}$ et ${{D}}$. Sur cette droite agrandie, chaque petit intervalle vaut $0.01$.',
    '**Deuxième zoom.** $B$ y est entre ${{H}}$ et ${{K}}$. Sur la dernière droite, chaque petit '
    'intervalle vaut $0.001$.',
]

V2 = variation(
    CONSIGNE + '\n\n' + v2_droite(False) + '\n\n$$B : ?$$',
    V2_VARS,
    [('{{X}}', V2_ERREURS)],
    V2_ETAPES + ['**Lire le point.** $B$ est à ${{c}}$ petits intervalles de ${{H}}$ : $B = '
                 + PRIMAIRE + '{{{X}}}$.\n\n' + v2_droite(True)])

V2_SPECS = [
    spec('v2 : juste', 2, {'n': '12', 'a': '4', 'b': '7', 'c': '3'}, 'correct', ['12{,}473']),
    spec('v2 : juste, point', 2, {'n': '12', 'a': '4', 'b': '7', 'c': '3'}, 'correct',
         ['12.473']),
    spec('v2 : arrêt au premier zoom', 2, {'n': '12', 'a': '4', 'b': '7', 'c': '3'}, 'incorrect',
         ['12{,}47'],
         'Tu t\'es arrêté au premier zoom : $B$ se lit sur la dernière droite agrandie, au '
         'millième.'),
    spec('v2 : pas de 0,01 gardé', 2, {'n': '12', 'a': '4', 'b': '7', 'c': '3'}, 'incorrect',
         ['12{,}5'],
         'Sur la dernière droite, un petit intervalle ne vaut plus $0.01$ : de $12.47$ à $12.48$, '
         'le centième est partagé en $10$, chaque petit intervalle vaut $0.001$.'),
    spec('v2 : graduations comptées', 2, {'n': '12', 'a': '4', 'b': '7', 'c': '3'}, 'incorrect',
         ['12{,}474'], COMPTEES),
    spec('v2 : autre tirage', 2, {'n': '5', 'a': '8', 'b': '2', 'c': '6'}, 'correct',
         ['5{,}826']),
]

V3_VARS = V2_VARS + [var('r', 'eval:100*a+10*b+c'), var('F', 'eval:1000*n+100*a+10*b+c')]
V3 = variation(
    'Le point $B$ repère un nombre. Écris ce nombre de trois façons.\n\n' + v2_droite(False)
    + '\n\nEn écriture décimale : $B = ?$\n\nAvec sa partie entière et une fraction décimale plus '
    'petite que $1$ : $B = ?$\n\nAvec une seule fraction décimale : $B = ?$',
    V3_VARS,
    [('{{X}}', V2_ERREURS),
     ('{{n}}+\\frac{{{r}}}{1000}', [
         erreur('{{n}}+\\frac{{{r}}}{100}',
                'La partie décimale, c\'est ${{r}}$ millièmes, pas ${{r}}$ centièmes.',
                'Millièmes écrits en centièmes'),
         erreur('\\frac{{{r}}}{1000}',
                'Tu as oublié la partie entière : $B$ est plus grand que ${{n}}$.',
                'Partie entière oubliée'),
         erreur('{{n}}+\\frac{{{c}}}{1000}',
                'Tu n\'as gardé que le chiffre lu sur le dernier zoom : la partie décimale, '
                'c\'est $0.{{a}}{{b}}{{c}}$, soit ${{r}}$ millièmes.',
                'Seul le dernier chiffre gardé'),
     ], {'pattern': '{{n}} + p:integer & gte(1) & lt(w) / w:integer & (eq(10) | eq(100) | '
                    'eq(1000))'}),
     ('\\frac{{{F}}}{1000}', [
         erreur('\\frac{{{F}}}{100}',
                '${{X}}$, ce sont ${{n}}\\,{{a}}{{b}}{{c}}$ millièmes : le dénominateur est $1\\,000$.',
                'Millièmes écrits en centièmes'),
         erreur('\\frac{{{eval:n+r}}}{1000}',
                'Tu as ajouté la partie entière au numérateur : ${{n}}$ unité{{if:n>1|s|}}, ce '
                'sont ${{n}}\\,000$ millièmes.',
                'Partie entière ajoutée au numérateur'),
         erreur('\\frac{{{r}}}{1000}',
                'Tu as oublié la partie entière : $B$ est plus grand que ${{n}}$.',
                'Partie entière oubliée'),
     ], {'pattern': 'u:integer / w:integer & (eq(10) | eq(100) | eq(1000))'})],
    V2_ETAPES + [
        '**Lire le point.** $B$ est à ${{c}}$ petits intervalles de ${{H}}$ : $B = ' + PRIMAIRE
        + '{{{X}}}$.\n\n' + v2_droite(True),
        '**Partie entière et partie décimale.** ${{X}} = {{n}} + 0.{{a}}{{b}}{{c}}$ et '
        '$0.{{a}}{{b}}{{c}} = \\frac{{{r}}}{1\\,000}$ : $B = ' + PRIMAIRE
        + '{{{n}} + \\frac{{{r}}}{1\\,000}}$.',
        '**Une seule fraction décimale.** ${{n}}$ unité{{if:n>1|s|}}, ce sont '
        '${{n}}\\,000$ millièmes ; avec ${{r}}$ millièmes de plus, ${{X}}$ fait ${{n}}\\,{{a}}{{b}}{{c}}$ '
        'millièmes : $B = ' + PRIMAIRE + '{\\frac{{{n}}\\,{{a}}{{b}}{{c}}}{1\\,000}}$.'],
    ['mod(c,2)==1', 'c!=5'])

V3_T = {'n': '12', 'a': '4', 'b': '7', 'c': '3'}
V3_JUSTE = ['12{,}473', '12+\\frac{473}{1\\,000}', '\\frac{12\\,473}{1\\,000}']
V3_SPECS = [
    spec('v3 : juste', 3, V3_T, 'correct', V3_JUSTE),
    spec('v3 : fraction sans espace', 3, V3_T, 'unoptimal_form',
         ['12{,}473', '12+\\frac{473}{1\\,000}', '\\frac{12473}{1\\,000}']),
    spec('v3 : arrêt au premier zoom', 3, V3_T, 'incorrect',
         ['12{,}47', V3_JUSTE[1], V3_JUSTE[2]],
         'Tu t\'es arrêté au premier zoom : $B$ se lit sur la dernière droite agrandie, au '
         'millième.'),
    spec('v3 : millièmes en centièmes', 3, V3_T, 'incorrect',
         [V3_JUSTE[0], '12+\\frac{473}{100}', V3_JUSTE[2]],
         'La partie décimale, c\'est $473$ millièmes, pas $473$ centièmes.'),
    spec('v3 : partie entière oubliée', 3, V3_T, 'incorrect',
         [V3_JUSTE[0], '\\frac{473}{1\\,000}', V3_JUSTE[2]],
         'Tu as oublié la partie entière : $B$ est plus grand que $12$.'),
    spec('v3 : seul le dernier chiffre', 3, V3_T, 'incorrect',
         [V3_JUSTE[0], '12+\\frac{3}{1\\,000}', V3_JUSTE[2]],
         'Tu n\'as gardé que le chiffre lu sur le dernier zoom : la partie décimale, c\'est '
         '$0.473$, soit $473$ millièmes.'),
    spec('v3 : fraction sur 100', 3, V3_T, 'incorrect',
         [V3_JUSTE[0], V3_JUSTE[1], '\\frac{12\\,473}{100}'],
         '$12.473$, ce sont $12\\,473$ millièmes : le dénominateur est $1\\,000$.'),
    spec('v3 : partie entière au numérateur', 3, V3_T, 'incorrect',
         [V3_JUSTE[0], V3_JUSTE[1], '\\frac{485}{1\\,000}'],
         'Tu as ajouté la partie entière au numérateur : $12$ unités, ce sont $12\\,000$ '
         'millièmes.'),
    spec('v3 : décimal dans la 3e case', 3, V3_T, 'bad_form',
         [V3_JUSTE[0], V3_JUSTE[1], '12{,}473'], violations=['form']),
    spec('v3 : somme dans la 3e case', 3, V3_T, 'bad_form',
         [V3_JUSTE[0], V3_JUSTE[1], V3_JUSTE[1]], violations=['form']),
    spec('v3 : une unité', 3, {'n': '1', 'a': '2', 'b': '8', 'c': '7'}, 'correct',
         ['1{,}287', '1+\\frac{287}{1\\,000}', '\\frac{1\\,287}{1\\,000}']),
]

# ---------------------------------------------------------------------------------------------
# v4 et v5 : grands entiers. Droite de L = m × 10^(w+1) à L + 10^(w+1), de 10^w en 10^w ; chaque zoom
# divise le pas par 10. w est fixé par variation : la formule `${{X}}$` ne groupe pas les chiffres,
# les nombres du texte (messages, corrigé) sont donc écrits chiffre par chiffre, groupés à la main.
CHIFFRES = ['a', 'b', 'c', 'd']


def groupe(tetes):
    """Nombre écrit chiffre par chiffre, groupé par trois : `tetes` = jetons du rang le plus haut au
    rang 0 (le premier peut avoir deux chiffres, comme {{eval:m+1}} = 10)."""
    haut = len(tetes) - 1
    morceaux = []
    for i, jeton in enumerate(tetes):
        rang = haut - i
        if i > 0 and (rang + 1) % 3 == 0:
            morceaux.append('\\,')
        morceaux.append(jeton)
    return ''.join(morceaux)


def nombre(w, connus, plus_un=False):
    """Texte de L + les `connus` premiers chiffres (zéros ensuite) ; `plus_un` : dernier chiffre + 1."""
    tetes = ['{{m}}'] + ['0'] * (w + 1)
    for i in range(connus):
        tetes[1 + i] = '{{' + CHIFFRES[i] + '}}'
    if plus_un:
        if connus == 0:
            tetes[0] = '{{eval:m+1}}'
        else:
            tetes[connus] = '{{eval:' + CHIFFRES[connus - 1] + '+1}}'
    return groupe(tetes)


def puissance(k):
    return groupe(['1'] + ['0'] * k)


def grand(nb_zooms, w):
    chiffres = CHIFFRES[:nb_zooms + 1]
    vs = [var('m', '1..9')] + [var(ch, '2..8') for ch in chiffres]
    vs.append(var('L', f'eval:m*10^{w + 1}'))
    bouts = []
    for j in range(1, nb_zooms + 1):
        somme = '+'.join(f'{chiffres[i]}*10^{w - i}' for i in range(j))
        vs.append(var(f'G{j}', f'eval:L+{somme}'))
        vs.append(var(f'D{j}', f'eval:L+{somme}+10^{w - j + 1}'))
        bouts.append((f'G{j}', f'D{j}', j))
    somme = '+'.join(f'{chiffres[i]}*10^{w - i}' for i in range(nb_zooms + 1))
    vs.append(var('X', f'eval:L+{somme}'))
    dernier = chiffres[-1]
    gd = f'G{nb_zooms}'
    x_texte = nombre(w, nb_zooms + 1)

    def droite(avec_labels):
        zs = []
        for g, d, j in bouts:
            z = f'zoom: {{{{{g}}}}} ; {{{{{d}}}}} ; step {10 ** (w - j)}'
            if avec_labels:
                z += f' ; labels {{{{{g}}}}}, {{{{{d}}}}}'
            zs.append(z)
        return ligne('start: {{L}}', f'end: {{{{eval:(m+1)*10^{w + 1}}}}}', f'step: {10 ** w}',
                     f'labels: {{{{L}}}}, {{{{eval:(m+1)*10^{w + 1}}}}}', 'points: B={{X}}', *zs)

    erreurs = [
        erreur(f'{{{{{gd}}}}}',
               'Tu t\'es arrêté au bout gauche de la dernière droite agrandie : $B$ est plus '
               'loin, compte les petits intervalles qui l\'en séparent.',
               'Bout gauche du dernier zoom'),
        erreur(f'{{{{eval:{gd}+{dernier}*10^{w - nb_zooms + 1}}}}}',
               f'Sur la dernière droite, un petit intervalle ne vaut plus ${puissance(w - nb_zooms + 1)}$ '
               f': de ${nombre(w, nb_zooms)}$ à ${nombre(w, nb_zooms, True)}$, il est partagé en '
               f'$10$, chaque petit intervalle vaut ${puissance(w - nb_zooms)}$.',
               'Pas de la droite du dessus gardé'),
        erreur(f'{{{{eval:X+10^{w - nb_zooms}}}}}', COMPTEES,
               'Graduations comptées au lieu des intervalles'),
    ]
    etapes = [f'**Ce que vaut un petit intervalle.** Sur la première droite, de ${nombre(w, 0)}$ à '
              f'${nombre(w, 0, True)}$, chaque petit intervalle vaut ${puissance(w)}$ ; sur chaque '
              'droite agrandie, il vaut dix fois moins que sur la droite du dessus.']
    for g, d, j in bouts:
        etapes.append(f'**Zoom {j}.** $B$ est entre ${nombre(w, j)}$ et ${nombre(w, j, True)}$ : '
                      f'sur cette droite agrandie, chaque petit intervalle vaut '
                      f'${puissance(w - j)}$.')
    etapes.append(f'**Lire le point.** $B$ est à ${{{{{dernier}}}}}$ petits intervalles de '
                  f'${nombre(w, nb_zooms)}$ : $B = ' + PRIMAIRE + '{' + x_texte + '}$.\n\n'
                  + droite(True))
    return variation(CONSIGNE + '\n\n' + droite(False) + '\n\n$$B : ?$$', vs,
                     [('{{X}}', erreurs)], etapes)


V4 = grand(2, 3)
V4_T = {'m': '4', 'a': '6', 'b': '3', 'c': '7'}
V4_SPECS = [
    spec('v4 : juste', 4, V4_T, 'correct', ['46\\,370']),
    spec('v4 : sans espace', 4, V4_T, 'unoptimal_form', ['46370']),
    spec('v4 : bout gauche du dernier zoom', 4, V4_T, 'incorrect', ['46\\,300'],
         'Tu t\'es arrêté au bout gauche de la dernière droite agrandie : $B$ est plus loin, '
         'compte les petits intervalles qui l\'en séparent.'),
    spec('v4 : pas de 100 gardé', 4, V4_T, 'incorrect', ['47\\,000'],
         'Sur la dernière droite, un petit intervalle ne vaut plus $100$ : de $46\\,300$ à '
         '$46\\,400$, il est partagé en $10$, chaque petit intervalle vaut $10$.'),
    spec('v4 : graduations comptées', 4, V4_T, 'incorrect', ['46\\,380'], COMPTEES),
    spec('v4 : jusqu\'à 100 000', 4, {'m': '9', 'a': '8', 'b': '2', 'c': '5'}, 'correct',
         ['98\\,250']),
]

V5 = grand(3, 5)
V5_T = {'m': '3', 'a': '5', 'b': '2', 'c': '7', 'd': '4'}
V5_SPECS = [
    spec('v5 : juste', 5, V5_T, 'correct', ['3\\,527\\,400']),
    spec('v5 : sans espace', 5, V5_T, 'unoptimal_form', ['3527400']),
    spec('v5 : bout gauche du dernier zoom', 5, V5_T, 'incorrect', ['3\\,527\\,000'],
         'Tu t\'es arrêté au bout gauche de la dernière droite agrandie : $B$ est plus loin, '
         'compte les petits intervalles qui l\'en séparent.'),
    spec('v5 : pas de 1 000 gardé', 5, V5_T, 'incorrect', ['3\\,531\\,000'],
         'Sur la dernière droite, un petit intervalle ne vaut plus $1\\,000$ : de $3\\,527\\,000$ à '
         '$3\\,528\\,000$, il est partagé en $10$, chaque petit intervalle vaut $100$.'),
    spec('v5 : graduations comptées', 5, V5_T, 'incorrect', ['3\\,527\\,500'], COMPTEES),
    spec('v5 : autre tirage', 5, {'m': '9', 'a': '2', 'b': '8', 'c': '3', 'd': '6'}, 'correct',
         ['9\\,283\\,600']),
]

MODELE = {
    'title': 'Lire une abscisse grâce à des zooms',
    'description': ('Lire l\'abscisse d\'un point sur une droite graduée suivie de droites '
                    'agrandies : au dixième, au centième, au millième (aussi en fractions '
                    'décimales), et des grands nombres (dizaines de milliers, millions)'),
    'grades': ['6'], 'level': 1, 'delay': 90, 'status': 'draft', 'options': OPTIONS,
    'variations': [V0, V1, V2, V3, V4, V5],
    'testSpecs': V0_SPECS + V1_SPECS + V2_SPECS + V3_SPECS + V4_SPECS + V5_SPECS,
    # Même nœud que 8adac6d1 « Repérer un nombre décimal » (relevé en prod le 2026-11-24)
    'rangement': {'noeud': 'Nombres et calculs > Décimaux : numération > droite graduée',
                  'point': '6-108'},
}

os.makedirs(DOSSIER, exist_ok=True)
with open(os.path.join(DOSSIER, '01-lire-une-abscisse-grace-a-des-zooms.json'), 'w') as f:
    json.dump(MODELE, f, ensure_ascii=False, indent='\t')
    f.write('\n')
print('1 modèle écrit dans', DOSSIER)
