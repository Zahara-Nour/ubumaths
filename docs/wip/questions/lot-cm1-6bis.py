"""Écrit les 7 modèles du lot 6 bis du CM1 (rattrapage) dans scripts/questions/cm1-6bis/.

Phase 0 validée par David le 2026-11-16 (§ 17 et 17 bis du journal
`docs/archive/wip/questions-cm1-progress.md`, « go » après mes trois recommandations) : un modèle par
point (CM1-001, 002, 131, 143, 010, 024, 048), outils en prod seulement.

Bornes `cycle3.json` : entiers jusqu'à 999 999 ; le bloc `collection` s'arrête à 9 999 (milliers
≤ 9, centaines ≤ 40, dizaines ≤ 30, unités ≤ 100), au-delà les groupements s'écrivent en texte
(exemple du BO : « 17 unités, 8 dizaines, 31 centaines et 2 milliers ») ; droite graduée de 1 en
1 à 100 000 en 100 000 ; unités, dixièmes, centièmes (pas de millièmes) ; estimer par arrondi à
la dizaine ou à la centaine, symbole ≈.

Décisions et pièges :
- « Espaces dès 4 chiffres » : les specs écrivent `5\\,197` (`esp()`) ;
- aucune `{{if}}` dans une réponse attendue (choix : indicatrice `sign(…)+1`, indices d'origine) ;
- case « choix » : réponse = indice d'origine ; `melanger: non` pour A / autant / B (ordre
  logique), mélange par défaut pour les estimations (la bonne valeur écrite en premier) ;
- droite graduée : deux graduations écrites, cinq intervalles entre elles, le pas à déduire ;
  la fin de la demi-droite reste ≤ 999 999 (V2 : `b` borné selon le pas) ;
- niveaux à la suite de ceux en place (relevé du 2026-11-16) : dénombrement 15, 16 ; ordre 15 ;
  droite graduée 4, 5 (le CM2 reste à 2 et 3, écart connu) ; décomposition 9 ; arrondis et
  ordres de grandeur 9 (rangement du point CM1-048, décidé au § 17 bis).

    python3 docs/wip/questions/lot-cm1-6bis.py scripts/questions/cm1-6bis
"""
import json
import sys

DOSSIER = sys.argv[1]
ENTIERS = {'constraints': {'spacesFromFourDigits': True}}
SANS_ESPACES = {'constraints': {'spaces': 'off'}}
MODELES = {}

# ---- Gabarits (comme lot-cm1-6.py) ----


def spec(desc, vi, variables, answers, status, violations=None):
    s = {'description': desc, 'variationIndex': vi,
         'variables': {k: str(x) for k, x in variables.items()},
         'answers': answers if isinstance(answers, list) else [answers],
         'expected': {'status': status}}
    if violations:
        s['expected']['constraintViolations'] = violations
    return s


def modele(title, description, level, variations, specs, options=ENTIERS, delay=90):
    # le rangement (sous-notion du point) est posé par la migration ; plus de quadruplet (ADR 0035)
    return {'title': title, 'description': description, 'grades': ['CM1'], 'level': level,
            'delay': delay, 'status': 'draft', 'options': options, 'variations': variations,
            'testSpecs': specs}


def var(nom, expression):
    return {'name': nom, 'expression': expression}


def variation(enonce, variables, reponses, etapes, conditions=None):
    v = {'statement': enonce, 'variables': variables}
    if conditions:
        v['conditions'] = conditions
    if reponses is not None:
        v['blanks'] = [{'expectedAnswer': r} for r in reponses]
    v['correction'] = {'steps': etapes}
    return v


def ev(x):
    return '{{eval:' + x + '}}'


def m(x):
    return '$' + x + '$'


def col(x):
    return '\\textcolor{{{color:primary.0}}}{' + x + '}'


def pl(x, sing, plur):
    """Accord : « 1 plaque », « 3 plaques » (0 n'est jamais tiré)."""
    return '{{if:' + x + '<=1|' + sing + '|' + plur + '}}'


def esp(n):
    """Réponse tapée avec les espaces de l'école : 342320 → 342\\,320."""
    return f'{n:,}'.replace(',', '\\,')


def evd(x):
    return '{{eval:' + x + ';d}}'


# ============================================================================
# 6b-1 — CM1-001 : dénombrer des collections organisées
# ============================================================================

D_MATERIEL = variation(
    'Combien de petits cubes y a-t-il en tout ?\n\n```collection\nmilliers: {{m}}\n'
    'centaines: {{c}}\ndizaines: {{d}}\nunités: {{u}}\n```\n\nIl y a $?$ cubes en tout.',
    [var('m', '1..5'), var('c', '11..19'), var('d', '1..9'), var('u', '11..19')],
    ['{{eval:1000*m+100*c+10*d+u}}'],
    ['Un gros cube vaut $1\\,000$ cubes, une plaque $100$, une barre $10$, **même quand il y en '
     'a plus de dix**.',
     m('{{m}}') + ' ' + pl('m', 'gros cube', 'gros cubes') + ' : ' + m(ev('1000*m'))
     + ' ; ' + m('{{c}}') + ' plaques : ' + m(ev('100*c')) + ' ; ' + m('{{d}}') + ' '
     + pl('d', 'barre', 'barres') + ' : ' + m(ev('10*d')) + ' ; ' + m('{{u}}')
     + ' petits cubes : ' + m('{{u}}') + '.',
     '$$' + ev('1000*m') + '+' + ev('100*c') + '+' + ev('10*d') + '+{{u}}='
     + col('{{solution}}') + '$$'])

D_TEXTE = variation(
    'Une collection est organisée ainsi : ${{u}}$ unités, ${{d}}$ dizaines, ${{c}}$ centaines '
    'et ${{m}}$ ' + pl('m', 'millier', 'milliers') + '.\n\nCombien d\'objets compte-t-elle ?'
    '\n\nElle compte $?$ objets.',
    [var('u', '10..29'), var('d', '11..19'), var('c', '11..39'), var('m', '1..9')],
    ['{{eval:1000*m+100*c+10*d+u}}'],
    ['On écrit la valeur de chaque groupement, puis on ajoute.',
     m('{{u}}') + ' unités : ' + m('{{u}}') + ' ; ' + m('{{d}}') + ' dizaines : '
     + m(ev('10*d')) + ' ; ' + m('{{c}}') + ' centaines : ' + m(ev('100*c')) + ' ; '
     + m('{{m}}') + ' ' + pl('m', 'millier', 'milliers') + ' : ' + m(ev('1000*m')) + '.',
     '$$' + '{{u}}+' + ev('10*d') + '+' + ev('100*c') + '+' + ev('1000*m') + '='
     + col('{{solution}}') + '$$'])

D_GRANDS = variation(
    'Une collection est organisée ainsi : ${{a}}$ '
    + pl('a', 'centaine de milliers', 'centaines de milliers')
    + ', ${{b}}$ milliers et ${{c}}$ dizaines.\n\nCombien d\'objets compte-t-elle ?'
    '\n\nElle compte $?$ objets.',
    [var('a', '1..8'), var('b', '11..49'), var('c', '11..99')],
    ['{{eval:100000*a+1000*b+10*c}}'],
    ['On écrit la valeur de chaque groupement, puis on ajoute.',
     m('{{a}}') + ' ' + pl('a', 'centaine de milliers', 'centaines de milliers') + ' : '
     + m(ev('100000*a')) + ' ; ' + m('{{b}}') + ' milliers : ' + m(ev('1000*b')) + ' ; '
     + m('{{c}}') + ' dizaines : ' + m(ev('10*c')) + '.',
     '$$' + ev('100000*a') + '+' + ev('1000*b') + '+' + ev('10*c') + '='
     + col('{{solution}}') + '$$'])

MODELES['01-denombrer-des-groupements'] = modele(
    'Dénombrer une collection organisée en groupements',
    'Matériel à gros cubes avec plus de dix plaques et de dix petits cubes ; groupements écrits en'
    ' unités de numération, jusqu\'à 999 999', 15,
    [D_MATERIEL, D_TEXTE, D_GRANDS],
    [spec('matériel : 3 gros cubes, 14 plaques, 5 barres, 12 cubes → 4 462', 0,
          {'m': 3, 'c': 14, 'd': 5, 'u': 12}, esp(4462), 'correct'),
     spec('Erreur : plaques au-delà de dix oubliées (3 462)', 0,
          {'m': 3, 'c': 14, 'd': 5, 'u': 12}, esp(3462), 'incorrect'),
     spec('Sans espaces : forme à améliorer', 0, {'m': 3, 'c': 14, 'd': 5, 'u': 12}, '4462',
          'unoptimal_form', ['spaces']),
     spec('BO : 17 unités, 18 dizaines, 31 centaines, 2 milliers → 5 297', 1,
          {'u': 17, 'd': 18, 'c': 31, 'm': 2}, esp(5297), 'correct'),
     spec('Erreur : chiffres recopiés dans l\'ordre (2 311)', 1,
          {'u': 17, 'd': 18, 'c': 31, 'm': 2}, esp(2311), 'incorrect'),
     spec('4 centaines de milliers, 15 milliers, 32 dizaines → 415 320', 2,
          {'a': 4, 'b': 15, 'c': 32}, esp(415320), 'correct'),
     spec('Erreur : 15 milliers lus 15 dizaines de milliers (550 320)', 2,
          {'a': 4, 'b': 15, 'c': 32}, esp(550320), 'incorrect')])

# ============================================================================
# 6b-2 — CM1-002 : construire une collection de cardinal donné
# ============================================================================

C_MATERIEL = variation(
    'Construis ${{m}}\\,{{c}}{{d}}{{u}}$ avec le matériel.\n\n```collection\nconstruire: {{n}}\n'
    '```',
    [var('m', '1..9'), var('t', '0..1'), var('x', '1..9'), var('u', '1..9'),
     var('c', 'eval:t*x'), var('d', 'eval:(1-t)*x'), var('n', 'eval:1000*m+100*c+10*d+u')],
    None,
    ['${{m}}\\,{{c}}{{d}}{{u}}$, c\'est ${{m}}$ ' + pl('m', 'millier', 'milliers')
     + ', ${{c}}$ centaine{{if:c>1|s|}}, ${{d}}$ dizaine{{if:d>1|s|}} et ${{u}}$ '
     + pl('u', 'unité', 'unités') + ' : le zéro dit qu\'il n\'y a **rien** à ce rang.',
     'On pose ${{m}}$ ' + pl('m', 'gros cube', 'gros cubes')
     + ', ${{c}}$ plaque{{if:c>1|s|}}, ${{d}}$ barre{{if:d>1|s|}} et ${{u}}$ '
     + pl('u', 'petit cube', 'petits cubes') + '.'])

C_CARNETS = variation(
    'On veut ranger ${{n}}$ timbres en carnets de $1\\,000$, de $100$ et de $10$ timbres, avec le '
    'moins de carnets possible.\n\nIl faut $?$ carnets de $1\\,000$, $?$ carnets de $100$ et $?$ '
    'carnets de $10$.',
    [var('a', '11..99'), var('c', '0..9'), var('d', '1..9'),
     var('n', 'eval:1000*a+100*c+10*d')],
    ['{{a}}', '{{c}}', '{{d}}'],
    ['Le moins de carnets possible : on prend d\'abord le plus de carnets de $1\\,000$.',
     '$$' + '{{n}}=' + col('{{a}}') + '\\times 1\\,000+' + col('{{c}}') + '\\times 100+'
     + col('{{d}}') + '\\times 10$$',
     'Dans ${{n}}$, il y a ${{a}}$ milliers, pas seulement ' + m(ev('mod(a,10)'))
     + ' : le chiffre des milliers ne suffit pas.'],
    ['mod(a,10)!=0'])

C_CENTAINES = variation(
    'Combien faut-il de carnets de $100$ timbres pour avoir ${{n}}$ timbres ?\n\n'
    'Il faut $?$ carnets.',
    [var('k', '101..2999'), var('n', 'eval:100*k')],
    ['{{k}}'],
    ['On cherche le **nombre de centaines** de ${{n}}$, pas le chiffre des centaines.',
     '$$' + '{{n}}=' + col('{{k}}') + '\\times 100$$'],
    ['mod(k,10)!=0'])

MODELES['02-construire-avec-des-paquets'] = modele(
    'Construire une quantité avec des paquets',
    'Construire au matériel un nombre à zéro intercalé ; ranger en carnets de 1 000, 100 et 10'
    ' avec le moins de carnets ; nombre de carnets de 100', 16,
    [C_MATERIEL, C_CARNETS, C_CENTAINES],
    [spec('3 045 construit', 0, {'m': 3, 't': 0, 'x': 4, 'u': 5, 'c': 0, 'd': 4, 'n': 3045},
          '3045', 'correct'),
     spec('Erreur : 3 450 construit (zéro mal placé)', 0,
          {'m': 3, 't': 0, 'x': 4, 'u': 5, 'c': 0, 'd': 4, 'n': 3045}, '3450', 'incorrect'),
     spec('34 560 : 34, 5, 6', 1, {'a': 34, 'c': 5, 'd': 6, 'n': 34560}, ['34', '5', '6'],
          'correct'),
     spec('Erreur : 4 carnets de 1 000 (le chiffre des milliers)', 1,
          {'a': 34, 'c': 5, 'd': 6, 'n': 34560}, ['4', '5', '6'], 'incorrect'),
     spec('34 500 : 345 carnets', 2, {'k': 345, 'n': 34500}, '345', 'correct'),
     spec('Erreur : 5 (le chiffre des centaines)', 2, {'k': 345, 'n': 34500}, '5', 'incorrect'),
     spec('2 345 carnets, avec espace', 2, {'k': 2345, 'n': 234500}, esp(2345), 'correct')],
    delay=120)

# ============================================================================
# 6b-3 — CM1-131 : comparer des collections en les organisant
# ============================================================================

CHOIX_AB = '```choix\nmelanger: non\n- La collection A\n- Elles en ont autant\n- La collection B\n```'

# X : p milliers et q plaques (q ≥ 13) ; Y : p + 1 milliers et q − 10 + écart plaques ; Y − X = 100 écart
# (jamais `e`, qui vaut Euler).
# s échange les deux collections (A = X si s = 0) ; réponse : sign(B − A) + 1.
CMP_VARIABLES = [var('p', '1..7'), var('q', '13..19'), var('k', '0..4'), var('ecart', 'eval:k-2'),
                 var('s', '0..1'), var('r', '1..9'), var('u', '1..9'),
                 var('mA', 'eval:p+s'), var('cA', 'eval:q+s*(ecart-10)'),
                 var('mB', 'eval:p+1-s'), var('cB', 'eval:q+(1-s)*(ecart-10)')]

CMP_MATERIEL = variation(
    'Quelle collection a le plus de petits cubes ?\n\n```collection\n'
    'milliers: {{mA}} ; {{mB}}\ncentaines: {{cA}} ; {{cB}}\ndizaines: {{r}} ; {{r}}\n'
    'unités: {{u}} ; {{u}}\ndessin: barres\nlégendes: A ; B\n```\n\n' + CHOIX_AB,
    CMP_VARIABLES + [var('vA', 'eval:1000*mA+100*cA+10*r+u'),
                     var('vB', 'eval:1000*mB+100*cB+10*r+u'),
                     var('z', 'eval:sign(vB-vA)+1')],
    ['{{z}}'],
    ['Dix plaques font un gros cube : on **regroupe** avant de comparer.',
     'A : ${{mA}}$ ' + pl('mA', 'gros cube', 'gros cubes') + ' et ${{cA}}$ '
     + pl('cA', 'plaque', 'plaques') + ', c\'est ${{vA}}$ cubes.',
     'B : ${{mB}}$ ' + pl('mB', 'gros cube', 'gros cubes') + ' et ${{cB}}$ '
     + pl('cB', 'plaque', 'plaques') + ', c\'est ${{vB}}$ cubes.',
     '{{if:z==0|' + '$' + col('\\text{A}') + '$' + ' a le plus de cubes.|{{if:z==1|' + '$' + col('\\text{Elles en ont autant}') + '$'
     + '.|' + '$' + col('\\text{B}') + '$' + ' a le plus de cubes.}}}}'])

CMP_TEXTE = variation(
    'Deux collections de timbres sont rangées en paquets.\n\n'
    '- Collection A : ${{mA}}$ ' + pl('mA', 'paquet', 'paquets') + ' de $100\\,000$, ${{cA}}$ '
    + pl('cA', 'paquet', 'paquets') + ' de $10\\,000$ et ${{r}}$ '
    + pl('r', 'paquet', 'paquets') + ' de $1\\,000$.\n'
    '- Collection B : ${{mB}}$ ' + pl('mB', 'paquet', 'paquets') + ' de $100\\,000$, ${{cB}}$ '
    + pl('cB', 'paquet', 'paquets') + ' de $10\\,000$ et ${{r}}$ '
    + pl('r', 'paquet', 'paquets') + ' de $1\\,000$.\n\n'
    'Quelle collection a le plus de timbres ?\n\n' + CHOIX_AB,
    CMP_VARIABLES + [var('vA', 'eval:100000*mA+10000*cA+1000*r'),
                     var('vB', 'eval:100000*mB+10000*cB+1000*r'),
                     var('z', 'eval:sign(vB-vA)+1')],
    ['{{z}}'],
    ['Dix paquets de $10\\,000$ font un paquet de $100\\,000$ : on **regroupe** avant de comparer.',
     'A : ${{vA}}$ timbres ; B : ${{vB}}$ timbres.',
     '{{if:z==0|' + '$' + col('\\text{A}') + '$' + ' a le plus de timbres.|{{if:z==1|' + '$' + col('\\text{Elles en ont autant}') + '$'
     + '.|' + '$' + col('\\text{B}') + '$' + ' a le plus de timbres.}}}}'])


def cmp_vars(p, q, k, s, r, u, grands=False):
    e = k - 2
    mA, cA, mB, cB = p + s, q + s * (e - 10), p + 1 - s, q + (1 - s) * (e - 10)
    f = (100000, 10000, 1000, 0) if grands else (1000, 100, 10, 1)
    vA = f[0] * mA + f[1] * cA + f[2] * r + f[3] * u
    vB = f[0] * mB + f[1] * cB + f[2] * r + f[3] * u
    z = (vB > vA) - (vB < vA) + 1
    return {'p': p, 'q': q, 'k': k, 'ecart': e, 's': s, 'r': r, 'u': u, 'mA': mA, 'cA': cA,
            'mB': mB, 'cB': cB, 'vA': vA, 'vB': vB, 'z': z}


X1, X2, X3 = cmp_vars(2, 15, 1, 0, 3, 4), cmp_vars(2, 15, 2, 0, 3, 4), cmp_vars(2, 15, 3, 0, 3, 4)
T1, T2 = cmp_vars(3, 16, 0, 1, 5, 0, True), cmp_vars(4, 18, 0, 0, 2, 0, True)
assert (X1['z'], X2['z'], X3['z'], T1['z'], T2['z']) == (0, 1, 2, 2, 0)

MODELES['03-comparer-deux-collections'] = modele(
    'Comparer deux collections organisées',
    'Deux collections au matériel, l\'une avec plus de dix plaques ; deux collections de timbres'
    ' en paquets de 100 000, 10 000 et 1 000 ; A, B ou autant', 15,
    [CMP_MATERIEL, CMP_TEXTE],
    [spec(f'A {X1["vA"]} > B {X1["vB"]} : A', 0, X1, '0', 'correct'),
     spec('Erreur : B choisi parce qu\'il a plus de gros cubes', 0, X1, '2', 'incorrect'),
     spec(f'A {X3["vA"]} < B {X3["vB"]} : B', 0, X3, '2', 'correct'),
     spec(f'autant : A {X2["vA"]}, B {X2["vB"]}', 0, X2, '1', 'correct'),
     spec('Erreur : autant, B choisi (plus de gros cubes)', 0, X2, '2', 'incorrect'),
     spec(f'timbres, échangés : A {T1["vA"]} < B {T1["vB"]} : B', 1, T1, '2', 'correct'),
     spec('Erreur : timbres, A choisi (plus de gros paquets)', 1, T1, '0', 'incorrect'),
     spec(f'timbres : A {T2["vA"]} > B {T2["vB"]} : A', 1, T2, '0', 'correct')],
    delay=60)

# ============================================================================
# 6b-4 et 6b-5 — CM1-143 et 010 : lire, placer sur une demi-droite graduée
# ============================================================================

LIGNE = ('```line\nstart: {{a}}\nend: {{fin}}\nstep: {{s}}\nmajor: 5\nlabels: {{a}}, {{l}}\n'
         '{{placement}}\n```')


def droite_variables(pas, grands=False, origine=False):
    if origine:
        vs = [var('s', '100000'), var('a', '0'), var('l', '500000'), var('fin', '900000')]
    elif grands:
        # fin = 10 s (b + 1) ≤ 990 000 : b ≤ 98 pour un pas de 1 000, b ≤ 8 pour 10 000
        vs = [var('s', pas), var('b2', '1..98'), var('b', 'eval:1+mod(b2,floor(100000/s)-2)'),
              var('a', 'eval:10*s*b'), var('l', 'eval:a+5*s'), var('fin', 'eval:a+10*s')]
    else:
        vs = [var('s', pas), var('b', '1..99'), var('a', 'eval:10*s*b'),
              var('l', 'eval:a+5*s'), var('fin', 'eval:a+10*s')]
    return vs + [var('k', '1..9'), var('x', 'eval:a+k*s')]


PAS = '**Le pas.** De ${{a}}$ à ${{l}}$, il y a $5$ intervalles : un intervalle vaut $({{l}} - {{a}}) \\div 5 = {{s}}$.'


def lire(variables):
    return variation(
        'Quel nombre repère le point $A$ ?\n\n'
        + LIGNE.replace('{{placement}}', 'points: A={{x}}') + '\n\n$$A : ?$$',
        variables, ['{{x}}'],
        [PAS, 'Le point $A$ est à ${{k}}$ intervalle{{if:k>1|s|}} de ${{a}}$ : il repère '
         '${{a}} + {{k}} \\times {{s}} = ' + col('{{x}}') + '$.'],
        ['k!=5'])


def placer(variables):
    return variation(
        'Place le nombre ${{x}}$ sur la demi-droite graduée.\n\n'
        + LIGNE.replace('{{placement}}', 'placer: {{x}}'),
        variables, None,
        [PAS, '${{x}} = {{a}} + {{k}} \\times {{s}}$ : on part de ${{a}}$ et on avance de '
         '${{k}}$ intervalle{{if:k>1|s|}}.'],
        ['k!=5'])


V_PETITS = droite_variables('1|10|100')
V_GRANDS = droite_variables('1000|10000', grands=True)
V_ORIGINE = droite_variables(None, origine=True)


def dv(s, b, k, b2=None, origine=False):
    if origine:
        d = {'s': 100000, 'a': 0, 'l': 500000, 'fin': 900000}
    else:
        d = {'s': s, 'b': b, 'a': 10 * s * b, 'l': 10 * s * b + 5 * s, 'fin': 10 * s * b + 10 * s}
        if b2 is not None:
            d['b2'] = b2
    d['k'] = k
    d['x'] = d['a'] + k * d['s']
    return d


MODELES['04-lire-sur-une-demi-droite-graduee'] = modele(
    'Lire un nombre sur une demi-droite graduée',
    'Pas de 1 à 100 000, à déduire de deux graduations écrites ; nombres jusqu\'à 999 999', 4,
    [lire(V_PETITS), lire(V_GRANDS), lire(V_ORIGINE)],
    [spec('A repère 34 300', 0, dv(100, 34, 3), esp(34300), 'correct'),
     spec('Erreur : 34 003 (intervalle compté pour 1)', 0, dv(100, 34, 3), esp(34003), 'incorrect'),
     spec('Erreur : 34 200 (graduation voisine)', 0, dv(100, 34, 3), esp(34200), 'incorrect'),
     spec('Sans espaces : forme à améliorer', 0, dv(100, 34, 3), '34300', 'unoptimal_form',
          ['spaces']),
     spec('A repère 347 000', 1, dv(1000, 34, 7, b2=33), esp(347000), 'correct'),
     spec('Erreur : 340 700 (pas de 100)', 1, dv(1000, 34, 7, b2=33), esp(340700), 'incorrect'),
     spec('A repère 300 000', 2, dv(None, None, 3, origine=True), esp(300000), 'correct'),
     spec('Erreur : 3 (intervalle compté pour 1)', 2, dv(None, None, 3, origine=True), '3',
          'incorrect')],
    delay=45)

MODELES['05-placer-sur-une-demi-droite-graduee'] = modele(
    'Placer un nombre sur une demi-droite graduée',
    'Pas de 1 à 100 000, à déduire de deux graduations écrites ; nombres jusqu\'à 999 999', 5,
    [placer(V_PETITS), placer(V_GRANDS), placer(V_ORIGINE)],
    [spec('34 300 placé', 0, dv(100, 34, 3), '34300', 'correct'),
     spec('Erreur : 34 200 (graduation voisine)', 0, dv(100, 34, 3), '34200', 'incorrect'),
     spec('860 000 placé', 1, dv(10000, 8, 6, b2=7), '860000', 'correct'),
     spec('Erreur : 806 000 (pas de 1 000)', 1, dv(10000, 8, 6, b2=7), '806000', 'incorrect'),
     spec('700 000 placé', 2, dv(None, None, 7, origine=True), '700000', 'correct'),
     spec('Erreur : 600 000 (graduation voisine)', 2, dv(None, None, 7, origine=True), '600000',
          'incorrect')],
    options=SANS_ESPACES, delay=45)

# ============================================================================
# 6b-6 — CM1-024 : unités, dixièmes, centièmes
# ============================================================================

# rangs : 1 centième, 2 dixième, 3 unité


def rang(x, pluriel=True):
    if pluriel:
        return '{{if:' + x + '==1|centièmes|{{if:' + x + '==2|dixièmes|unités}}}}'
    return '{{if:' + x + '==1|centième|{{if:' + x + '==2|dixième|unité}}}}'


REGLE = ('**D\'un rang au rang juste à sa droite, on multiplie par $10$** : $1$ unité $= 10$ '
         'dixièmes, $1$ dixième $= 10$ centièmes.')
RANGS = [var('u', '2..3'), var('w', '1..2'), var('p', 'eval:u-w')]

U_UN = variation(
    'Complète.\n\n$$1~\\text{' + rang('u', False) + '} = ?~\\text{' + rang('w') + '}$$',
    RANGS, ['{{eval:10^p}}'],
    [REGLE, 'Des ' + rang('u') + ' aux ' + rang('w') + ', on descend de ${{p}}$ '
     'rang{{if:p>1|s|}} : $1~\\text{' + rang('u', False) + '} = ' + col('{{eval:10^p}}')
     + '~\\text{' + rang('w') + '}$.'],
    ['p>=1'])

U_K = variation(
    'Complète.\n\n$${{k}}~\\text{' + rang('u') + '} = ?~\\text{' + rang('w') + '}$$',
    [var('k', '2..9')] + RANGS, ['{{eval:k*10^p}}'],
    [REGLE, '$1~\\text{' + rang('u', False) + '} = {{eval:10^p}}~\\text{' + rang('w')
     + '}$, donc ${{k}}~\\text{' + rang('u') + '} = {{k}} \\times {{eval:10^p}} = '
     + col('{{eval:k*10^p}}') + '~\\text{' + rang('w') + '}$.'],
    ['p>=1'])

U_INVERSE = variation(
    'Complète.\n\n$${{eval:k*10^p}}~\\text{' + rang('w') + '} = ?~\\text{' + rang('u') + '}$$',
    [var('k', '2..9')] + RANGS, ['{{k}}'],
    [REGLE, '$1~\\text{' + rang('u', False) + '} = {{eval:10^p}}~\\text{' + rang('w')
     + '}$ : dans ${{eval:k*10^p}}$ ' + rang('w') + ', il y a ${{eval:k*10^p}} \\div '
     '{{eval:10^p}} = ' + col('{{k}}') + '$ ' + rang('u') + '.'],
    ['p>=1'])

U_ECHANGE = variation(
    'Complète : ${{n}}$ ' + rang('w') + ', c\'est…\n\n$$?~\\text{' + rang('h') + '}\\text{ et } '
    '?~\\text{' + rang('w') + '}$$',
    [var('w', '1..2'), var('h', 'eval:w+1'), var('t', '1..9'), var('r', '1..9'),
     var('n', 'eval:10*t+r')],
    ['{{t}}', '{{r}}'],
    [REGLE, '$10~\\text{' + rang('w') + '} = 1~\\text{' + rang('h', False) + '}$ : dans ${{n}}$ '
     + rang('w') + ', il y a ${{t}}$ fois $10$ ' + rang('w') + ', et il en reste ${{r}}$.',
     '$${{n}}~\\text{' + rang('w') + '} = ' + col('{{t}}') + '~\\text{{{if:t<=1|'
     + rang('h', False) + '|' + rang('h') + '}}}\\text{ et } ' + col('{{r}}')
     + '~\\text{{{if:r<=1|' + rang('w', False) + '|' + rang('w') + '}}}$$'])

U_DECIMAL = variation(
    'Complète.\n\n$$' + evd('n/100') + ' = ?~\\text{centièmes}$$',
    [var('n', '101..999')], ['{{n}}'],
    ['$1$ unité $= 100$ centièmes et $1$ dixième $= 10$ centièmes.',
     '$' + evd('n/100') + '$, c\'est ' + m(ev('floor(n/100)')) + ' unité{{if:n>=200|s|}}, '
     + m(ev('floor(mod(n,100)/10)')) + ' dixième{{if:mod(n,100)>=20|s|}} et '
     + m(ev('mod(n,10)')) + ' centième{{if:mod(n,10)>1|s|}} : $' + ev('100*floor(n/100)')
     + '+' + ev('10*floor(mod(n,100)/10)') + '+' + ev('mod(n,10)') + '=' + col('{{n}}')
     + '$ centièmes.'],
    ['mod(n,10)!=0', 'mod(n,100)>=10'])

MODELES['06-unites-dixiemes-centiemes'] = modele(
    'Unités, dixièmes, centièmes',
    'Relations entre unités, dixièmes et centièmes, dans les deux sens ; échanges ; un nombre'
    ' décimal écrit en centièmes (pas de millièmes)', 9,
    [U_UN, U_K, U_INVERSE, U_ECHANGE, U_DECIMAL],
    [spec('1 unité = 100 centièmes', 0, {'u': 3, 'w': 1, 'p': 2}, '100', 'correct'),
     spec('Erreur : 1 unité = 10 centièmes', 0, {'u': 3, 'w': 1, 'p': 2}, '10', 'incorrect'),
     spec('4 dixièmes = 40 centièmes', 1, {'k': 4, 'u': 2, 'w': 1, 'p': 1}, '40', 'correct'),
     spec('Erreur : 400', 1, {'k': 4, 'u': 2, 'w': 1, 'p': 1}, '400', 'incorrect'),
     spec('300 centièmes = 3 unités', 2, {'k': 3, 'u': 3, 'w': 1, 'p': 2}, '3', 'correct'),
     spec('Erreur : 30 unités', 2, {'k': 3, 'u': 3, 'w': 1, 'p': 2}, '30', 'incorrect'),
     spec('35 centièmes = 3 dixièmes et 5 centièmes', 3,
          {'w': 1, 'h': 2, 't': 3, 'r': 5, 'n': 35}, ['3', '5'], 'correct'),
     spec('Erreur : 5 et 3 (échangés)', 3, {'w': 1, 'h': 2, 't': 3, 'r': 5, 'n': 35},
          ['5', '3'], 'incorrect'),
     spec('2,35 = 235 centièmes', 4, {'n': 235}, '235', 'correct'),
     spec('Erreur : 35 centièmes (unités oubliées)', 4, {'n': 235}, '35', 'incorrect')],
    delay=45)

# ============================================================================
# 6b-7 — CM1-048 : estimer le résultat d'une opération
# ============================================================================


def estimation(enonce, variables, juste, conditions, etapes, erreur):
    """Quatre valeurs, la juste en premier (indice 0), mélangées à l'affichage."""
    return variation(
        enonce + '\n\n```choix\n- $' + ev(juste) + '$\n- $' + ev('10*(' + juste + ')')
        + '$\n- $' + ev('(' + juste + ')/10') + '$\n- $' + ev(erreur) + '$\n```',
        variables, ['0'], etapes, conditions)


E_SOMME = estimation(
    'Sans poser l\'opération, choisis la meilleure estimation.\n\n$${{a}} + {{b}} + {{c}} \\approx '
    '\\ldots$$',
    [var('x', '2..9'), var('y', '2..9'), var('z', '2..9'), var('ea0', '0..24'), var('ea', 'eval:ea0-12'),
     var('eb0', '0..24'), var('eb', 'eval:eb0-12'), var('ec0', '0..24'), var('ec', 'eval:ec0-12'), var('a', 'eval:100*x+ea'),
     var('b', 'eval:100*y+eb'), var('c', 'eval:100*z+ec')],
    '100*(x+y+z)', ['ea!=0', 'eb!=0', 'ec!=0'],
    ['On arrondit chaque nombre à la centaine la plus proche : ${{a}} \\approx {{eval:100*x}}$, '
     '${{b}} \\approx {{eval:100*y}}$, ${{c}} \\approx {{eval:100*z}}$.',
     '$${{a}} + {{b}} + {{c}} \\approx {{eval:100*x}} + {{eval:100*y}} + {{eval:100*z}} = '
     + col('{{eval:100*(x+y+z)}}') + '$$'],
    '100*(x+y+z)+200')

E_PRODUIT = estimation(
    'Sans poser l\'opération, choisis la meilleure estimation.\n\n$${{a}} \\times {{b}} \\approx '
    '\\ldots$$',
    [var('x', '2..9'), var('y', '2..9'), var('ea0', '0..8'), var('ea', 'eval:ea0-4'), var('eb0', '0..8'), var('eb', 'eval:eb0-4'),
     var('a', 'eval:10*x+ea'), var('b', 'eval:10*y+eb')],
    '100*x*y', ['ea!=0', 'eb!=0'],
    ['On arrondit chaque nombre à la dizaine la plus proche : ${{a}} \\approx {{eval:10*x}}$ et '
     '${{b}} \\approx {{eval:10*y}}$.',
     '$${{a}} \\times {{b}} \\approx {{eval:10*x}} \\times {{eval:10*y}} = '
     + col('{{eval:100*x*y}}') + '$$'],
    '100*x*y+100*x')

E_QUOTIENT = estimation(
    'Sans poser l\'opération, choisis la meilleure estimation.\n\n$${{n}} \\div {{d}} \\approx '
    '\\ldots$$',
    [var('d', '2..5'), var('q', '1..4'), var('ea0', '0..12'), var('ea', 'eval:ea0-6'), var('n', 'eval:100*d*q+ea')],
    '100*q', ['ea!=0', 'd*q<=9', 'd*q>=2'],
    ['On remplace ${{n}}$ par un nombre proche facile à diviser par ${{d}}$ : '
     '${{n}} \\approx {{eval:100*d*q}}$.',
     '$${{n}} \\div {{d}} \\approx {{eval:100*d*q}} \\div {{d}} = ' + col('{{eval:100*q}}')
     + '$$'],
    '100*d*q')

MODELES['07-estimer-le-resultat-d-une-operation'] = modele(
    'Estimer le résultat d\'une opération',
    'Somme de trois nombres proches de centaines, produit de deux nombres proches de dizaines,'
    ' quotient d\'un nombre proche d\'un multiple de 100 ; choisir parmi quatre valeurs', 9,
    [E_SOMME, E_PRODUIT, E_QUOTIENT],
    [spec('212 + 298 + 496 ≈ 1 000', 0,
          {'x': 2, 'y': 3, 'z': 5, 'ea0': 24, 'eb0': 10, 'ec0': 8, 'ea': 12, 'eb': -2, 'ec': -4, 'a': 212, 'b': 298, 'c': 496}, '0',
          'correct'),
     spec('Erreur : 10 000 (un zéro de trop)', 0,
          {'x': 2, 'y': 3, 'z': 5, 'ea0': 24, 'eb0': 10, 'ec0': 8, 'ea': 12, 'eb': -2, 'ec': -4, 'a': 212, 'b': 298, 'c': 496}, '1',
          'incorrect'),
     spec('52 × 37 ≈ 2 000', 1, {'x': 5, 'y': 4, 'ea0': 6, 'eb0': 1, 'ea': 2, 'eb': -3, 'a': 52, 'b': 37}, '0',
          'correct'),
     spec('Erreur : 200', 1, {'x': 5, 'y': 4, 'ea0': 6, 'eb0': 1, 'ea': 2, 'eb': -3, 'a': 52, 'b': 37}, '2',
          'incorrect'),
     spec('597 ÷ 2 ≈ 300', 2, {'d': 2, 'q': 3, 'ea0': 3, 'ea': -3, 'n': 597}, '0', 'correct'),
     spec('Erreur : 600 (pas divisé)', 2, {'d': 2, 'q': 3, 'ea0': 3, 'ea': -3, 'n': 597}, '3', 'incorrect')],
    delay=60)

for nom, mod in MODELES.items():
    with open(f'{DOSSIER}/{nom}.json', 'w') as fh:
        json.dump(mod, fh, ensure_ascii=False, indent='\t')
        fh.write('\n')
print(len(MODELES), 'modèles écrits')
