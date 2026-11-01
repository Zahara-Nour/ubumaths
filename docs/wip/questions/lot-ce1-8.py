"""Écrit les 6 modèles du lot 8 du CE1 (monnaie) dans scripts/questions/ce1-8/.

Phase 0 validée par David le 2026-11-01 (§ 15 du journal `docs/wip/questions-ce1-progress.md`).
Bornes `cycle2.json`, CE1-054 à 057, 086 ; BO c2 p.28 : euros et centimes, centimes < 100, ou
écriture à virgule ; ordonner quatre prix quelles que soient leurs écritures (12 € > 60 centimes) ;
« pas de pièce de 1 € » (pièces de 10, 20, 50 c). Décisions :

1. Deux modèles pour 086 : rendu calculé en case, puis rendu posé (`construire:`), comme CP-071.
2. Prix au multiple de 10 c dans les gestes (`construire:`) ; multiples de 5 c dans les cases ;
   pièces de 1, 2, 5 c seulement à compter (`01`, variation 4).
3. `zeros: off` : 2,2 juste pour 2,20 € (règle du lot 5 bis) ; le corrigé écrit toujours 2,20 €.
4. Brouillons jusqu'au `deploy:prod` qui livre les centimes du bloc ```monnaie (#2127).
5. Catégories à la suite du CP : « Monnaie · Pièces et billets · 8 à 11 », « Monnaie · Rendre la
   monnaie · 3, 4 ».

Prix en centimes dans les variables ; `construire: {{p}}c` (le bloc lit `345c`) ; la case de la
construction attend `3,45` (`amountAnswer`). Variables à une lettre (les specs ne fixent que les
racines) ; jamais `e` ni `i`.

    python3 docs/wip/questions/lot-ce1-8.py scripts/questions/ce1-8
"""
import json
import sys

DOSSIER = sys.argv[1]
SANS_ZEROS = {'constraints': {'zeros': 'off'}}

# ---- Gabarits ----


def spec(desc, vi, variables, answers, status):
    return {'description': desc, 'variationIndex': vi,
            'variables': {k: str(x) for k, x in variables.items()},
            'answers': answers if isinstance(answers, list) else [answers],
            'expected': {'status': status}}


def modele(title, description, subdomain, level, variations, specs, delay=90):
    # theme / domain / subdomain : anciennes colonnes, remplies pour create-questions ; le
    # rangement (sous-notion du point) est posé par la migration
    return {'title': title, 'description': description, 'grades': ['CE1'], 'theme': 'Grandeurs',
            'domain': 'Monnaie', 'subdomain': subdomain, 'level': level, 'delay': delay,
            'status': 'draft', 'options': SANS_ZEROS, 'variations': variations,
            'testSpecs': specs}


def var(nom, expression):
    return {'name': nom, 'expression': expression}


def variation(statement, reponses, variables, etapes, conditions=None):
    v = {'statement': statement, 'variables': variables}
    if conditions:
        v['conditions'] = conditions
    v['blanks'] = [{'expectedAnswer': r} for r in reponses]
    v['correction'] = {'steps': etapes}
    return v


def bloc(nom, *lignes):
    return '\n\n```' + nom + '\n' + '\n'.join(lignes) + '\n```'


def choix(lignes, melanger=True):
    tete = '' if melanger else 'melanger: non\n'
    return '\n\n```choix\n' + tete + ''.join('- ' + c + '\n' for c in lignes) + '```'


def selon(k, textes, n=1):
    """`{{if:k==1|…|{{if:k==2|…|…}}}}` : le texte numéro k (à partir de 1)."""
    if len(textes) == 1:
        return textes[0]
    return ('{{if:' + k + '==' + str(n) + '|' + textes[0] + '|' + selon(k, textes[1:], n + 1)
            + '}}')


def ev(x):
    return '{{eval:' + x + '}}'


def col(x, k=0):
    return '\\textcolor{{{color:primary.' + str(k) + '}}}{' + x + '}'


def euros(c):
    """Prix de `c` centimes, toujours à deux décimales (« 7.50 », « 1.05 »)."""
    return ('{{eval:floor((' + c + ')/100)}}.{{eval:floor(mod(' + c + ',100)/10)}}{{eval:mod('
            + c + ',10)}}')


def prix(c, couleur=False):
    """Prix de `c` centimes en formule : $7.50~\\unit{€}$."""
    p = euros(c)
    return '$' + (col(p) if couleur else p) + '~\\unit{€}$'


def en_euros(c):
    """Attendu d'une case en euros : `c` centimes, écriture décimale."""
    return '{{eval:(' + c + ')/100;d}}'


def centimes(x):
    """« 1 centime », « 45 centimes » : accord au singulier quand x vaut 1."""
    return '{{if:' + x + '==1|centime|centimes}}'


def terme(n, valeur, unite):
    """« 3 × 20 = 60 centimes. » si n > 0, rien sinon."""
    if unite == 'c':
        fin = ev(str(valeur) + '*' + n) + '$ centimes. '
    else:
        fin = ev(str(valeur) + '*' + n) + '~\\unit{€}$. '
    return '{{if:' + n + '>0|${{' + n + '}} \\times ' + str(valeur) + ' = ' + fin + '|}}'


EURO = '~\\text{€}'  # juste après une case : case de nombre
CENT = '~\\text{centimes}'
RESERVE = 'réserve: 10 5 2 1 50c 20c 10c'
OBJETS = ['Le livre', 'Le ballon', 'Le jeu', 'La trousse', 'Le cahier', 'La gourde']


PETITS_OBJETS = ['La sucette', 'La gomme', 'Le crayon', 'Le bonbon', 'La carte postale',
                 'Le sachet de billes']


MOYENS_OBJETS = ['Le cahier', 'La trousse', 'Le stylo', 'Le magazine', 'La balle', 'La règle']


def objet(o, B=1000):
    """Un objet dont le prix va avec le billet donné (pas de livre à 0,30 €)."""
    return selon(o, PETITS_OBJETS if B <= 100 else MOYENS_OBJETS if B <= 500 else OBJETS)


# ---- 01. Combien d'argent ? (CE1-055) ----

QUESTION = 'Combien d\'argent y a-t-il ?'

C_SEULS = variation(
    QUESTION + bloc('monnaie', 'pièces: {{a}}×50c {{b}}×20c {{c}}×10c {{d}}×5c',
                    'disposition: mélangé')
    + '\n\n$?' + CENT + '$', ['{{t}}'],
    [var('a', '0..1'), var('b', '0..3'), var('c', '0..3'), var('d', '0..1'),
     var('t', 'eval:50*a+20*b+10*c+5*d')],
    ['On compte ce qui est écrit sur les pièces, en commençant par les plus grosses. '
     + terme('a', 50, 'c') + terme('b', 20, 'c') + terme('c', 10, 'c') + terme('d', 5, 'c'),
     'En tout : $' + col('{{t}}') + '$ centimes.'],
    ['t < 100', 'a + b + c + d >= 3'])

EUROS_ET_C = variation(
    QUESTION + bloc('monnaie', 'pièces: {{g}}×2 {{h}}×1 {{a}}×50c {{b}}×20c {{c}}×10c',
                    'disposition: mélangé')
    + '\n\n$?~\\text{€}~\\text{et}~?' + CENT + '$', ['{{u}}', '{{t}}'],
    [var('g', '0..3'), var('h', '0..2'), var('a', '0..1'), var('b', '0..2'), var('c', '0..3'),
     var('u', 'eval:2*g+h'), var('t', 'eval:50*a+20*b+10*c')],
    ['Les euros : ' + terme('g', 2, '€') + terme('h', 1, '€') + 'Cela fait ${{u}}~\\unit{€}$.',
     'Les centimes : ' + terme('a', 50, 'c') + terme('b', 20, 'c') + terme('c', 10, 'c')
     + 'Cela fait ${{t}}$ centimes.',
     'En tout : $' + col('{{u}}') + '~\\unit{€}$ et $' + col('{{t}}') + '$ centimes.'],
    ['u >= 1', 't >= 10', 't < 100'])

AVEC_BILLETS = variation(
    QUESTION + bloc('monnaie', 'billets: {{k}}×10 {{m}}×5',
                    'pièces: {{g}}×2 {{h}}×1 {{a}}×50c {{b}}×20c {{c}}×10c {{d}}×5c',
                    'disposition: mélangé')
    + '\n\n$?' + EURO + '$', [en_euros('100*u+t')],
    [var('k', '0..4'), var('m', '0..1'), var('g', '0..2'), var('h', '0..1'), var('a', '0..1'),
     var('b', '0..2'), var('c', '0..2'), var('d', '0..1'),
     var('u', 'eval:10*k+5*m+2*g+h'), var('t', 'eval:50*a+20*b+10*c+5*d')],
    ['Les billets et les pièces d\'euro : ' + terme('k', 10, '€') + terme('m', 5, '€')
     + terme('g', 2, '€') + terme('h', 1, '€') + 'Cela fait ${{u}}~\\unit{€}$.',
     'Les centimes : ' + terme('a', 50, 'c') + terme('b', 20, 'c') + terme('c', 10, 'c')
     + terme('d', 5, 'c') + 'Cela fait ${{t}}$ centimes.',
     '${{u}}~\\unit{€}$ et ${{t}}$ centimes s\'écrivent ' + prix('100*u+t', True)
     + ' : avant la virgule les euros, après la virgule les centimes, toujours deux chiffres.'],
    ['k + m >= 1', 'u < 100', 't >= 5', 't < 100'])

PETITES = variation(
    QUESTION + bloc('monnaie', 'pièces: {{a}}×20c {{b}}×10c {{c}}×5c {{d}}×2c {{f}}×1c',
                    'disposition: mélangé')
    + '\n\n$?' + CENT + '$', ['{{t}}'],
    [var('a', '0..2'), var('b', '0..2'), var('c', '0..2'), var('d', '0..3'), var('f', '0..3'),
     var('t', 'eval:20*a+10*b+5*c+2*d+f')],
    ['On compte ce qui est écrit sur les pièces, en commençant par les plus grosses. '
     + terme('a', 20, 'c') + terme('b', 10, 'c') + terme('c', 5, 'c') + terme('d', 2, 'c')
     + terme('f', 1, 'c'),
     'En tout : $' + col('{{t}}') + '$ ' + centimes('t') + '.'],
    ['d + f >= 2', 'a + b + c + d + f >= 5', 't < 100'])

SPECS_COMBIEN = [
    spec('50 + 20 + 20 + 5 = 95 c', 0,
         {'a': 1, 'b': 2, 'c': 0, 'd': 1}, '95', 'correct'),
    spec('Erreur : nombre de pièces compté (4)', 0, {'a': 1, 'b': 2, 'c': 0, 'd': 1}, '4',
         'incorrect'),
    spec('2 × 2 € + 1 € et 50 + 20 c : 5 € et 70 c', 1,
         {'g': 2, 'h': 1, 'a': 1, 'b': 1, 'c': 0}, ['5', '70'], 'correct'),
    spec('Erreur : centimes comptés en euros (75)', 1, {'g': 2, 'h': 1, 'a': 1, 'b': 1, 'c': 0},
         ['75', '0'], 'incorrect'),
    spec('2 × 10 € + 5 € + 2 € et 50 + 5 c : 27,55 €', 2,
         {'k': 2, 'm': 1, 'g': 1, 'h': 0, 'a': 1, 'b': 0, 'c': 0, 'd': 1}, '27{,}55', 'correct'),
    spec('10 € + 1 € et 20 c : 11,2 accepté (zeros: off)', 2,
         {'k': 1, 'm': 0, 'g': 0, 'h': 1, 'a': 0, 'b': 1, 'c': 0, 'd': 0}, '11{,}2', 'correct'),
    spec('Erreur : 10 € + 1 € et 5 c écrit 11,5', 2,
         {'k': 1, 'm': 0, 'g': 0, 'h': 1, 'a': 0, 'b': 0, 'c': 0, 'd': 1}, '11{,}5', 'incorrect'),
    spec('Erreur : 27 € et 55 c écrit 2755', 2,
         {'k': 2, 'm': 1, 'g': 1, 'h': 0, 'a': 1, 'b': 0, 'c': 0, 'd': 1}, '2755', 'incorrect'),
    spec('20 + 10 + 5 + 2 + 2 + 1 = 40 c', 3, {'a': 1, 'b': 1, 'c': 1, 'd': 2, 'f': 1}, '40',
         'correct'),
    spec('Erreur : nombre de pièces compté (6)', 3, {'a': 1, 'b': 1, 'c': 1, 'd': 2, 'f': 1}, '6',
         'incorrect'),
]

# ---- 02. Qui a le plus d'argent ? (CE1-054) ----

QUI = choix(['Léa', 'Tom', 'Ils ont autant d\'argent.'], melanger=False)
GAGNANT = ('{{if:r==0|Léa a le plus d\'argent.|{{if:r==1|Tom a le plus d\'argent.'
           '|Ils ont autant d\'argent.}}}}')

DEUX_PORTE_MONNAIE = variation(
    'Qui a le plus d\'argent ?'
    + bloc('monnaie', 'pièces: {{a}}×2 {{b}}×1 {{c}}×50c {{d}}×20c {{f}}×10c ; '
           '{{g}}×2 {{h}}×1 {{k}}×50c {{m}}×20c {{n}}×10c', 'légendes: Léa ; Tom')
    + QUI, ['{{r}}'],
    [var('a', '0..2'), var('b', '0..2'), var('c', '0..2'), var('d', '0..2'), var('f', '0..2'),
     var('g', '0..2'), var('h', '0..2'), var('k', '0..2'), var('m', '0..2'), var('n', '0..2'),
     var('x', 'eval:200*a+100*b+50*c+20*d+10*f'), var('y', 'eval:200*g+100*h+50*k+20*m+10*n'),
     var('r', '{{if:x>y|0|{{if:x<y|1|2}}}}')],
    ['Léa a ' + prix('x') + '. Tom a ' + prix('y') + '.',
     'On compare d\'abord les euros, puis les centimes.', GAGNANT],
    ['abs(x - y) <= 50', 'a + b + c + d + f >= 3', 'g + h + k + m + n >= 3',
     'mod(x,100) != 0', 'mod(y,100) != 0'])

# La grosse coupure (s == 1 : Léa) contre beaucoup de petites pièces de centimes
GROSSE = '{{if:k==5|1×5|}}'
GROSSE_P = '{{if:k==2|1×2|}}'
PETITES_P = '{{n}}×50c {{m}}×20c {{q}}×10c'

GROSSE_OU_PETITES = variation(
    'Qui a le plus d\'argent ?'
    + bloc('monnaie',
           'billets: {{if:s==1|' + GROSSE + '|}} ; {{if:s==1||' + GROSSE + '}}',
           'pièces: {{if:s==1|' + GROSSE_P + '|' + PETITES_P + '}} ; {{if:s==1|' + PETITES_P
           + '|' + GROSSE_P + '}}', 'légendes: Léa ; Tom')
    + QUI, ['{{r}}'],
    [var('k', '2|5'), var('s', '1..2'), var('n', '0..10'), var('m', '0..5'), var('q', '0..5'),
     var('t', 'eval:50*n+20*m+10*q'), var('x', '{{if:s==1|{{eval:100*k}}|{{t}}}}'),
     var('y', '{{if:s==1|{{t}}|{{eval:100*k}}}}'),
     var('r', '{{if:x>y|0|{{if:x<y|1|2}}}}')],
    ['Léa a ' + prix('x') + '. Tom a ' + prix('y') + '.', GAGNANT,
     '{{if:t<100*k|Ce n\'est pas celui qui a le plus de pièces qui a le plus d\'argent : on'
     ' compte ce qui est écrit dessus.|On ne compte pas les pièces : on compte ce qui est écrit'
     ' dessus.}}'],
    ['abs(t - 100*k) <= 50', 'n + m + q >= 5'])

# Quatre prix, quatre écritures (BO : 12 € > 60 centimes)
PRIX_ECRITS = ['${{a}}~\\unit{€}$', '${{c}}$ centimes',
               '${{f}}~\\unit{€}$ et ${{g}}$ centimes', prix('v')]

QUATRE_PRIX = variation(
    'Quel est le prix le {{if:k==1|plus cher|moins cher}} ?' + choix(PRIX_ECRITS), ['{{r}}'],
    [var('k', '1..2'), var('a', '1..9'), var('b', '3..45'), var('c', 'eval:10*b'),
     var('f', '1..9'), var('h', '1..19'), var('g', 'eval:5*h'), var('u', '1..9'),
     var('w', '1..19'), var('v', 'eval:100*u+5*w'),
     var('p', 'eval:100*a'), var('q', 'eval:100*f+g'),
     var('z', '{{if:k==1|{{eval:max(p,c,q,v)}}|{{eval:min(p,c,q,v)}}}}'),
     var('r', '{{if:p==z|0|{{if:c==z|1|{{if:q==z|2|3}}}}}}')],
    ['On écrit les quatre prix de la même façon, avec la virgule :',
     '${{a}}~\\unit{€} = ' + euros('p') + '~\\unit{€}$ ; ${{c}}$ centimes $= ' + euros('c')
     + '~\\unit{€}$ ; ${{f}}~\\unit{€}$ et ${{g}}$ centimes $= ' + euros('q')
     + '~\\unit{€}$ ; ' + prix('v') + '.',
     'On compare d\'abord les euros, puis les centimes. Le {{if:k==1|plus cher|moins cher}} : '
     + prix('z', True) + '.'],
    ['p != c', 'p != q', 'p != v', 'c != q', 'c != v', 'q != v'])

SPECS_QUI = [
    spec('Léa 3,40 € contre Tom 3,20 € : Léa', 0,
         {'a': 1, 'b': 1, 'c': 0, 'd': 2, 'f': 0, 'g': 1, 'h': 1, 'k': 0, 'm': 1, 'n': 0}, '0',
         'correct'),
    spec('Erreur : Tom', 0,
         {'a': 1, 'b': 1, 'c': 0, 'd': 2, 'f': 0, 'g': 1, 'h': 1, 'k': 0, 'm': 1, 'n': 0}, '1',
         'incorrect'),
    spec('Léa 5 € (billet), Tom 9 pièces pour 4,70 € : Léa', 1,
         {'k': 5, 's': 1, 'n': 8, 'm': 3, 'q': 1}, '0', 'correct'),
    spec('Erreur : Tom, qui a le plus de pièces', 1, {'k': 5, 's': 1, 'n': 8, 'm': 3, 'q': 1},
         '1', 'incorrect'),
    spec('Léa 2,10 € en pièces, Tom une pièce de 2 € : Léa', 1,
         {'k': 2, 's': 2, 'n': 3, 'm': 3, 'q': 0}, '0', 'correct'),
    spec('Le plus cher : 4 € contre 120 c, 3 € 45 c, 2,05 € → 4 €', 2,
         {'k': 1, 'a': 4, 'b': 12, 'f': 3, 'h': 9, 'u': 2, 'w': 1}, '0', 'correct'),
    spec('Erreur : 120 centimes (le plus grand nombre écrit)', 2,
         {'k': 1, 'a': 4, 'b': 12, 'f': 3, 'h': 9, 'u': 2, 'w': 1}, '1', 'incorrect'),
    spec('Le moins cher : 120 centimes', 2,
         {'k': 2, 'a': 4, 'b': 12, 'f': 3, 'h': 9, 'u': 2, 'w': 1}, '1', 'correct'),
]

# ---- 03. Pose la somme (CE1-056) ----

POSE = 'Pose '

POSE_C = variation(
    POSE + '${{p}}$ centimes.' + bloc('monnaie', 'construire: {{p}}c', RESERVE), [],
    [var('k', '3..9'), var('p', 'eval:10*k')],
    ['Par exemple : {{if:p>=50|une pièce de $50$ centimes, |}}puis des pièces de $20$ et de'
     ' $10$ centimes, jusqu\'à ${{p}}$ centimes.',
     'Il y a d\'autres façons justes : ce qui compte, c\'est la somme posée.'])

POSE_VIRGULE = variation(
    POSE + prix('p') + '.' + bloc('monnaie', 'construire: {{p}}c', RESERVE), [],
    [var('k', '11..99'), var('p', 'eval:10*k')],
    [prix('p') + ', c\'est ${{eval:floor(p/100)}}~\\unit{€}$ et ${{eval:mod(p,100)}}$'
     ' centimes.',
     'On pose d\'abord les euros, puis les centimes.'],
    ['mod(p,100) != 0'])

POSE_EUROS_ET_C = variation(
    POSE + '${{a}}~\\unit{€}$ et ${{b}}$ centimes.' + bloc('monnaie', 'construire: {{p}}c',
                                                          RESERVE), [],
    [var('a', '1..9'), var('k', '1..9'), var('b', 'eval:10*k'), var('p', 'eval:100*a+b')],
    ['On pose d\'abord ${{a}}~\\unit{€}$, puis ${{b}}$ centimes.',
     'Il y a d\'autres façons justes : ce qui compte, c\'est la somme posée.'])

SANS_UN_EURO = variation(
    POSE + prix('p') + ' sans pièce de $1~\\unit{€}$.'
    + bloc('monnaie', 'construire: {{p}}c', 'réserve: 50c 20c 10c'), [],
    [var('k', '6..19'), var('p', 'eval:10*k')],
    ['$1~\\unit{€}$, c\'est $100$ centimes : deux pièces de $50$ centimes, ou cinq pièces de'
     ' $20$ centimes.',
     prix('p') + ', c\'est ${{p}}$ centimes : on les pose avec des pièces de $50$, $20$ et'
     ' $10$ centimes.'],
    ['mod(p,100) != 0'])

SPECS_POSE = [
    spec('70 centimes posés', 0, {'k': 7}, '0{,}7', 'correct'),
    spec('Erreur : 7 € posés pour 70 centimes', 0, {'k': 7}, '7', 'incorrect'),
    spec('3,40 € posés', 1, {'k': 34}, '3{,}4', 'correct'),
    spec('Erreur : 3,04 € posés pour 3,40 €', 1, {'k': 34}, '3{,}04', 'incorrect'),
    spec('2 € et 30 centimes posés', 2, {'a': 2, 'k': 3}, '2{,}3', 'correct'),
    spec('Erreur : 2,03 € posés (30 c lus 3 c)', 2, {'a': 2, 'k': 3}, '2{,}03', 'incorrect'),
    spec('1,40 € sans pièce de 1 €', 3, {'k': 14}, '1{,}4', 'correct'),
    spec('Erreur : 1,20 € posés pour 1,40 €', 3, {'k': 14}, '1{,}2', 'incorrect'),
]

# ---- 04. Paie tes achats (CE1-057) ----

UN_ACHAT = variation(
    objet('o', 500) + ' coûte ' + prix('p') + '. Paie-le.' + bloc('monnaie', 'construire: {{p}}c',
                                                             RESERVE), [],
    [var('o', '1..6'), var('k', '12..98'), var('p', 'eval:10*k')],
    ['Pour payer, on pose exactement le prix : ' + prix('p') + ', c\'est'
     ' ${{eval:floor(p/100)}}~\\unit{€}$ et ${{eval:mod(p,100)}}$ centimes.'],
    ['mod(p,100) != 0'])

ARTICLES = ['un livre', 'un ballon', 'un jeu']
PETITS = ['un stylo', 'une gomme', 'un cahier']

DEUX_ACHATS = variation(
    'Lina achète ' + selon('o', ARTICLES) + ' à ' + prix('a') + ' et ' + selon('h', PETITS)
    + ' à ' + prix('b') + '. Paie ses achats.' + bloc('monnaie', 'construire: {{s}}c', RESERVE),
    [],
    [var('o', '1..3'), var('h', '1..3'), var('m', '20..69'), var('n', '5..39'),
     var('a', 'eval:10*m'), var('b', 'eval:10*n'), var('s', 'eval:a+b')],
    ['On additionne les deux prix : les euros ensemble, les centimes ensemble.',
     '$' + euros('a') + '~\\unit{€} + ' + euros('b') + '~\\unit{€} = ' + col(euros('s'))
     + '~\\unit{€}$',
     'Lina paie ' + prix('s') + '.'],
    ['mod(a,100) != 0', 'mod(b,100) != 0', 's < 1000'])

PEUT_ACHETER = variation(
    'Voici l\'argent de Léa.' + bloc('monnaie', 'billets: {{k}}×5',
                                     'pièces: {{g}}×2 {{h}}×1 {{a}}×50c {{b}}×20c {{c}}×10c')
    + '\n\n' + objet('o', 500) + ' coûte ' + prix('p') + '. Léa peut-elle l\'acheter ?'
    + choix(['Oui', 'Non'], melanger=False), ['{{r}}'],
    [var('o', '1..6'), var('k', '0..1'), var('g', '0..2'), var('h', '0..2'), var('a', '0..1'),
     var('b', '0..2'), var('c', '0..2'), var('x', 'eval:500*k+200*g+100*h+50*a+20*b+10*c'),
     var('d', '-5..5'), var('p', 'eval:x+10*d'), var('r', '{{if:x>=p|0|1}}')],
    ['Léa a ' + prix('x') + '.',
     '{{if:r==0|' + prix('x') + ', c\'est plus que ' + prix('p')
     + ' : oui, elle peut l\'acheter.|' + prix('x') + ', c\'est moins que ' + prix('p')
     + ' : non, il lui manque ' + prix('p-x') + '.}}'],
    ['d != 0', 'x >= 200', 'mod(p,100) != 0', 'mod(x,100) != 0'])

SPECS_PAIE = [
    spec('Trousse à 4,30 € : 4,3', 0, {'o': 2, 'k': 43}, '4{,}3', 'correct'),
    spec('Erreur : 3,40 € posés pour 4,30 €', 0, {'o': 2, 'k': 43}, '3{,}4', 'incorrect'),
    spec('Livre 2,30 € + stylo 1,40 € : 3,7', 1, {'o': 1, 'h': 1, 'm': 23, 'n': 14}, '3{,}7',
         'correct'),
    spec('Erreur : ne paie que le livre (2,30 €)', 1, {'o': 1, 'h': 1, 'm': 23, 'n': 14},
         '2{,}3', 'incorrect'),
    spec('Retenue : 4,60 € + 2,70 € = 7,30 €', 1, {'o': 2, 'h': 2, 'm': 46, 'n': 27}, '7{,}3',
         'correct'),
    spec('Erreur : 6,130 → 6,13 (retenue oubliée)', 1, {'o': 2, 'h': 2, 'm': 46, 'n': 27},
         '6{,}13', 'incorrect'),
    spec('Léa 3,70 €, prix 3,40 € : oui', 2,
         {'o': 1, 'k': 0, 'g': 1, 'h': 1, 'a': 1, 'b': 1, 'c': 0, 'd': -3}, '0', 'correct'),
    spec('Léa 3,70 €, prix 4,10 € : non', 2,
         {'o': 1, 'k': 0, 'g': 1, 'h': 1, 'a': 1, 'b': 1, 'c': 0, 'd': 4}, '1', 'correct'),
    spec('Erreur : oui à 4,10 € avec 3,70 €', 2,
         {'o': 1, 'k': 0, 'g': 1, 'h': 1, 'a': 1, 'b': 1, 'c': 0, 'd': 4}, '0', 'incorrect'),
]

# ---- 05. Combien le marchand rend-il ? (CE1-086) et 06. Rends la monnaie ----

# Billet (ou pièce) donné, plage du prix en centimes
PAIEMENTS = [
    ('cette pièce', 'pièces: 1×1', 100),
    ('ce billet', 'billets: 1×5', 500),
    ('ce billet', 'billets: 1×10', 1000),
    ('ce billet', 'billets: 1×20', 2000),
]


def complement(B):
    """Rendu par complément : du prix à l'euro suivant, puis jusqu'au billet donné."""
    haut = '(p + 100 - mod(p,100))'
    vers_euro = ('De ' + prix('p') + ' à $' + ev(haut + '/100') + '~\\unit{€}$, il faut $'
                 + ev('100 - mod(p,100)') + '$ centimes.')
    if B == 100:
        return [vers_euro]
    # une seule étape : une étape vide resterait affichée quand le prix est à moins d'un euro
    return [vers_euro
            + '{{if:' + str(B) + ' - ' + haut + ' > 0| Puis de $' + ev(haut + '/100') + '~\\unit{€}$ à $'
            + str(B // 100) + '~\\unit{€}$, il faut $' + ev('(' + str(B) + ' - ' + haut + ')/100')
            + '~\\unit{€}$.|}}']


def rendu_case(n):
    phrase, ligne, B = PAIEMENTS[n]
    plage = ['1..19', '21..99', '110..190', '246..394'][n]
    stmt = (objet('o', B) + ' coûte ' + prix('p') + '. Léo paie avec ' + phrase + ' :'
            + bloc('monnaie', ligne) + '\n\nCombien le marchand lui rend-il ?\n\n')
    if B == 100:
        stmt += '$?' + CENT + '$'
        attendu = ev(str(B) + '-p')
        fin = 'Le marchand rend $' + col(ev(str(B) + '-p')) + '$ centimes.'
    else:
        stmt += '$?' + EURO + '$'
        attendu = en_euros(str(B) + '-p')
        fin = 'Le marchand rend ' + prix(str(B) + '-p', True) + '.'
    return variation(stmt, [attendu],
                     [var('o', '1..6'), var('k', plage), var('p', 'eval:5*k')],
                     complement(B) + [fin], ['mod(p,100) != 0'])


def rendu_geste(n):
    phrase, ligne, B = PAIEMENTS[n]
    plage = ['1..9', '11..49', '55..95', '123..197'][n]
    stmt = (objet('o', B) + ' coûte ' + prix('p') + '. Léo paie avec ' + phrase + ' :'
            + bloc('monnaie', ligne) + '\n\nTu es le marchand. Rends la monnaie à Léo.'
            + bloc('monnaie', 'construire: {{r}}c', RESERVE))
    return variation(stmt, [],
                     [var('o', '1..6'), var('k', plage), var('p', 'eval:10*k'),
                      var('r', 'eval:' + str(B) + '-p')],
                     complement(B) + ['Le marchand rend ' + prix('r') + '.'],
                     ['mod(p,100) != 0'])


SPECS_RENDU = [
    spec('0,35 € payé avec 1 € : 65 c', 0, {'o': 1, 'k': 7}, '65', 'correct'),
    spec('Erreur : rend le prix (35)', 0, {'o': 1, 'k': 7}, '35', 'incorrect'),
    spec('3,45 € payé avec 5 € : 1,55 €', 1, {'o': 2, 'k': 69}, '1{,}55', 'correct'),
    spec('Erreur : 2,65 (5 − 3,45 sans retenue)', 1, {'o': 2, 'k': 69}, '2{,}65', 'incorrect'),
    spec('Erreur : 1,55 lu 155 €', 1, {'o': 2, 'k': 69}, '155', 'incorrect'),
    spec('7,50 € payé avec 10 € : 2,5 accepté', 2, {'o': 3, 'k': 150}, '2{,}5', 'correct'),
    spec('Erreur : prix et billet additionnés (17,50)', 2, {'o': 3, 'k': 150}, '17{,}5',
         'incorrect'),
    spec('15,35 € payé avec 20 € : 4,65 €', 3, {'o': 4, 'k': 307}, '4{,}65', 'correct'),
    spec('Erreur : 5,65 € (euro de trop)', 3, {'o': 4, 'k': 307}, '5{,}65', 'incorrect'),
]

SPECS_REND = [
    spec('0,40 € payé avec 1 € : 60 c posés', 0, {'o': 1, 'k': 4}, '0{,}6', 'correct'),
    spec('Erreur : rend le prix (40 c)', 0, {'o': 1, 'k': 4}, '0{,}4', 'incorrect'),
    spec('3,20 € payé avec 5 € : 1,80 €', 1, {'o': 2, 'k': 32}, '1{,}8', 'correct'),
    spec('Erreur : 2,80 € (euro de trop)', 1, {'o': 2, 'k': 32}, '2{,}8', 'incorrect'),
    spec('6,70 € payé avec 10 € : 3,30 €', 2, {'o': 3, 'k': 67}, '3{,}3', 'correct'),
    spec('14,60 € payé avec 20 € : 5,40 €', 3, {'o': 4, 'k': 146}, '5{,}4', 'correct'),
    spec('Erreur : 4,60 € (euro oublié)', 3, {'o': 4, 'k': 146}, '4{,}6',
         'incorrect'),
]

# ---- Fichiers ----

MODELES = {
    '01-combien-d-argent': modele(
        'Combien d\'argent ? Euros et centimes',
        'Compter des pièces de centimes, des euros et des centimes, des billets et des pièces ;'
        ' réponse en centimes, en euros et centimes, ou à virgule', 'Pièces et billets', 8,
        [C_SEULS, EUROS_ET_C, AVEC_BILLETS, PETITES], SPECS_COMBIEN),
    '02-qui-a-le-plus': modele(
        'Qui a le plus d\'argent ? Euros et centimes',
        'Comparer deux porte-monnaie en euros et centimes ; une grosse coupure contre beaucoup'
        ' de petites pièces ; le plus cher et le moins cher de quatre prix écrits autrement',
        'Pièces et billets', 9, [DEUX_PORTE_MONNAIE, GROSSE_OU_PETITES, QUATRE_PRIX],
        SPECS_QUI),
    '03-pose-la-somme': modele(
        'Pose la somme en euros et centimes',
        'Poser des centimes, une somme à virgule, des euros et des centimes ; sans pièce de 1 €',
        'Pièces et billets', 10, [POSE_C, POSE_VIRGULE, POSE_EUROS_ET_C, SANS_UN_EURO],
        SPECS_POSE, delay=120),
    '04-paie-tes-achats': modele(
        'Paie tes achats en euros et centimes',
        'Payer un article, deux articles ; dire si l\'argent montré suffit',
        'Pièces et billets', 11, [UN_ACHAT, DEUX_ACHATS, PEUT_ACHETER], SPECS_PAIE, delay=120),
    '05-combien-le-marchand-rend': modele(
        'Combien le marchand rend-il ? Euros et centimes',
        'Rendu sur 1 €, 5 €, 10 € et 20 €, par complément, réponse en centimes ou à virgule',
        'Rendre la monnaie', 3, [rendu_case(n) for n in range(4)], SPECS_RENDU, delay=120),
    '06-rends-la-monnaie': modele(
        'Rends la monnaie en euros et centimes',
        'Poser le rendu sur 1 €, 5 €, 10 € et 20 € avec des pièces et des billets',
        'Rendre la monnaie', 4, [rendu_geste(n) for n in range(4)], SPECS_REND, delay=120),
}

for nom, m in MODELES.items():
    with open(f'{DOSSIER}/{nom}.json', 'w') as f:
        json.dump(m, f, ensure_ascii=False, indent='\t')
        f.write('\n')
print(len(MODELES), 'modèles écrits')
