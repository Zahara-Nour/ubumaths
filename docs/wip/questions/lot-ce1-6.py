"""Écrit les 7 modèles du lot 6 du CE1 (calcul posé et heure) dans scripts/questions/ce1-6/.

Phase 0 validée par David le 2026-11-01 (§ 13 du journal `docs/wip/questions-ce1-progress.md`).
Bornes `cycle2.json`, CE1-022, 100, 059, 060, 063, 104 ; BO c2 p.13 et p.28-29 : 245 + 437 ;
218 + 48 ; 76 + 7 + 568 ; somme ≤ 1 000 ; soustraction « par cassage » ou « par compensation » ;
heures entières, demies, quarts (« 2 heures et quart » = 14 h 15) ; durées dans la même journée
(8 h 30 → 8 h 45 ; 15 h 45 → 16 h 15 ; midi → 20 h) ; 2 heures et 130 minutes. Décisions :

1. Deux modèles de soustraction posée, un par méthode (question 1 du § 13).
2. Après-midi sur le cadran de 12 : 14 h 15 attendu ; 2 h 15 refusé par une règle qui dit
   pourquoi (le juge n'a pas d'ambre pour une valeur fausse ; question 2 du § 13).
3. Catégorie neuve « Durées · Durée écoulée » (question 3) ; unité de la durée selon la
   variation (question 4).
4. Opérations : case sans `expectedAnswer` (le bloc calcule la réponse) ; chiffres en variables (`a1 a2 a3`), comme CP-H 03 ; le bloc calcule résultat et
   retenues. Indice de la bonne réponse d'une case choix : une variable `r` calculée. Jamais de
   variable `e` ni `i`.

    python3 docs/wip/questions/lot-ce1-6.py scripts/questions/ce1-6
"""
import json
import sys

DOSSIER = sys.argv[1]

# ---- Gabarits ----


def spec(desc, vi, variables, answers, status):
    return {'description': desc, 'variationIndex': vi,
            'variables': {k: str(x) for k, x in variables.items()},
            'answers': answers if isinstance(answers, list) else [answers],
            'expected': {'status': status}}


def modele(title, description, theme, domain, subdomain, level, variations, specs, delay=90):
    # theme / domain / subdomain : anciennes colonnes, remplies pour create-questions ; le
    # rangement (sous-notion du point) est posé par la migration
    return {'title': title, 'description': description, 'grades': ['CE1'], 'theme': theme,
            'domain': domain, 'subdomain': subdomain, 'level': level, 'delay': delay,
            'status': 'draft', 'variations': variations, 'testSpecs': specs}


def var(nom, expression):
    return {'name': nom, 'expression': expression}


def variation(statement, reponses, variables, etapes, conditions=None):
    v = {'statement': statement, 'variables': variables}
    if conditions:
        v['conditions'] = conditions
    v['blanks'] = [r if isinstance(r, dict) else {'expectedAnswer': r} for r in reponses]
    v['correction'] = {'steps': etapes}
    return v


def choix(lignes, melanger=True):
    tete = '' if melanger else 'melanger: non\n'
    return '\n\n```choix\n' + tete + ''.join('- ' + c + '\n' for c in lignes) + '```'


def ev(x):
    return '{{eval:' + x + '}}'


def col(x, k=0):
    return '\\textcolor{{{color:primary.' + str(k) + '}}}{' + x + '}'


def nombre(*chiffres):
    """`100*a1+10*a2+a3` : le nombre écrit avec ces chiffres (variables)."""
    n = len(chiffres)
    return '+'.join((f'{10 ** (n - 1 - k)}*' if k < n - 1 else '') + c
                    for k, c in enumerate(chiffres))


def pl(x, mot):
    """`mot` accordé au nombre `x` (expression) : « 1 dizaine », « 0 dizaine », « 3 dizaines »."""
    return mot + '{{if:' + x + '>1|s|}}'


def brut(m):
    """`{{eval:15*q}}` → `15*q` : une condition `{{if:}}` ne résout pas un `{{eval:}}` imbriqué."""
    return m[7:-2] if m.startswith('{{eval:') else m


def heure(h, m):
    """Texte d'une heure pour ```horloge, minutes en variable : `9 h 15`, `9 h` si m vaut 0.

    Pas dans `placer:` : la case lit le bloc avant de résoudre ce `{{if:}}` ; on y écrit
    `9 h 0` (accepté, minutes 0)."""
    return '{{if:' + brut(m) + '==0|' + h + ' h|' + h + ' h ' + m + '}}'


def dit(h, m):
    """L'heure écrite pour l'élève, en formule : $9~\\text{h}~15$, $9~\\text{h}$."""
    return '{{if:' + brut(m) + '==0|$' + h + '~\\text{h}$|$' + h + '~\\text{h}~' + m + '$}}'


def horloges(heures, legendes=None):
    bloc = '\n\n```horloge\nheure: ' + ' ; '.join(heures) + '\nchiffres: tous\n'
    if legendes:
        bloc += 'légendes: ' + ' ; '.join(legendes) + '\n'
    return bloc + '```'


# ---- 1. Addition posée (CE1-022) ----

POSE = 'Pose et calcule.\n\n```operation\ncalcul: '
ALIGNER = 'On aligne les chiffres : unités sous les unités, dizaines sous les dizaines.'


A3 = nombre('a1', 'a2', 'a3')
B3 = nombre('b1', 'b2', 'b3')
B2 = nombre('b2', 'b3')
# Retenues de l'addition à deux termes (chiffres en variables)
RU = 'floor((a3+b3)/10)'
RD = 'floor((a2+b2+' + RU + ')/10)'

ADD_3_3 = variation(
    POSE + '{{a}} + {{b}}\nretenues: oui\n```', [],
    [var('a1', '1..5'), var('a2', '0..9'), var('a3', '1..9'), var('b1', '1..4'),
     var('b2', '0..9'), var('b3', '1..9'), var('a', 'eval:' + A3), var('b', 'eval:' + B3)],
    [ALIGNER,
     'Unités : ${{a3}} + {{b3}} = ' + ev('a3+b3') + '${{if:a3+b3>=10| : on écrit $'
     + ev('a3+b3-10') + '$ et on retient $1$ aux dizaines.|.}}',
     'Dizaines : $' + ev(RU) + ' + {{a2}} + {{b2}} = ' + ev('a2+b2+' + RU) + '${{if:a2+b2+' + RU
     + '>=10| : on écrit $' + ev('a2+b2+' + RU + '-10') + '$ et on retient $1$ aux centaines.|.}}',
     'Centaines : $' + ev(RD) + ' + {{a1}} + {{b1}} = ' + ev('a1+b1+' + RD) + '$.',
     '$${{a}} + {{b}} = ' + col(ev('a+b')) + '$$'],
    ['a3 + b3 >= 10', 'a + b <= 1000'])

ADD_3_2 = variation(
    POSE + '{{a}} + {{b}}\nretenues: oui\n```', [],
    [var('a1', '1..9'), var('a2', '0..8'), var('a3', '1..9'), var('b2', '1..9'),
     var('b3', '1..9'), var('a', 'eval:' + A3), var('b', 'eval:' + B2)],
    [ALIGNER + ' Le nombre de deux chiffres se pose sous les dizaines et les unités, pas sous les'
     ' centaines.',
     'Unités : ${{a3}} + {{b3}} = ' + ev('a3+b3') + '${{if:a3+b3>=10| : on écrit $'
     + ev('a3+b3-10') + '$ et on retient $1$ aux dizaines.|.}}',
     'Dizaines : $' + ev(RU) + ' + {{a2}} + {{b2}} = ' + ev('a2+b2+' + RU)
     + '${{if:a2+b2+' + RU + '>=10| : on écrit $' + ev('a2+b2+' + RU + '-10')
     + '$ et on retient $1$ aux centaines.|.}}',
     'Centaines : $' + ev('floor((a2+b2+' + RU + ')/10)') + ' + {{a1}} = '
     + ev('a1+floor((a2+b2+' + RU + ')/10)') + '$.',
     '$${{a}} + {{b}} = ' + col(ev('a+b')) + '$$'],
    ['a3 + b3 >= 10', 'a + b <= 1000'])

# BO : 76 + 7 + 568 (deux chiffres, un chiffre, trois chiffres, dans cet ordre)
ADD_3_TERMES = variation(
    POSE + '{{a}} + {{b}} + {{c}}\nretenues: oui\n```', [],
    [var('a', '11..99'), var('b', '2..9'), var('c', '101..899')],
    [ALIGNER + ' Avec trois nombres, on additionne les trois chiffres de chaque colonne.',
     'Unités : $' + ev('mod(a,10)') + ' + {{b}} + ' + ev('mod(c,10)') + ' = '
     + ev('mod(a,10)+b+mod(c,10)') + '$ : on écrit $' + ev('mod(mod(a,10)+b+mod(c,10),10)')
     + '${{if:mod(a,10)+b+mod(c,10)>=10| et on retient $' + ev('floor((mod(a,10)+b+mod(c,10))/10)')
     + '$ aux dizaines|}}.',
     '$${{a}} + {{b}} + {{c}} = ' + col(ev('a+b+c')) + '$$'],
    ['mod(a,10) + b + mod(c,10) >= 10', 'a + b + c <= 1000'])

# Deux retenues : unités et dizaines
ADD_DEUX_RETENUES = variation(
    POSE + '{{a}} + {{b}}\nretenues: oui\n```', [],
    [var('a1', '1..6'), var('a2', '1..9'), var('a3', '1..9'), var('b1', '1..3'),
     var('b2', '1..9'), var('b3', '1..9'), var('a', 'eval:' + A3), var('b', 'eval:' + B3)],
    [ALIGNER,
     'Unités : ${{a3}} + {{b3}} = ' + ev('a3+b3') + '$ : on écrit $' + ev('a3+b3-10')
     + '$ et on retient $1$ aux dizaines.',
     'Dizaines : $1 + {{a2}} + {{b2}} = ' + ev('a2+b2+1') + '$ : on écrit $' + ev('a2+b2+1-10')
     + '$ et on retient $1$ aux centaines.',
     'Centaines : $1 + {{a1}} + {{b1}} = ' + ev('a1+b1+1') + '$.',
     '$${{a}} + {{b}} = ' + col(ev('a+b')) + '$$'],
    ['a3 + b3 >= 10', 'a2 + b2 + 1 >= 10', 'a + b <= 1000'])


def vars_add(a, b, nb=3):
    v = {'a1': a // 100, 'a2': a // 10 % 10, 'a3': a % 10}
    if nb == 3:
        v.update({'b1': b // 100})
    v.update({'b2': b // 10 % 10, 'b3': b % 10, 'a': a, 'b': b})
    return v


def sans_retenue(*termes):
    """L'erreur « retenue oubliée » : chaque colonne réduite à son chiffre des unités."""
    res, rang = 0, 1
    while any(t // rang for t in termes):
        res += sum(t // rang % 10 for t in termes) % 10 * rang
        rang *= 10
    return res


SPECS_ADDITION = [
    spec('BO : 245 + 437 = 682', 0, vars_add(245, 437), '682', 'correct'),
    spec('Erreur : retenue oubliée, 245 + 437 = 672', 0, vars_add(245, 437),
         str(sans_retenue(245, 437)), 'incorrect'),
    spec('BO : 218 + 48 = 266', 1, vars_add(218, 48, 2), '266', 'correct'),
    spec('Erreur : 48 posé sous les centaines, 218 + 480 = 698', 1, vars_add(218, 48, 2), '698',
         'incorrect'),
    spec('Erreur : retenue oubliée, 218 + 48 = 256', 1, vars_add(218, 48, 2),
         str(sans_retenue(218, 48)), 'incorrect'),
    spec('BO : 76 + 7 + 568 = 651', 2, {'a': 76, 'b': 7, 'c': 568}, '651', 'correct'),
    spec('Erreur : retenue oubliée, 76 + 7 + 568 = 531', 2, {'a': 76, 'b': 7, 'c': 568},
         str(sans_retenue(76, 7, 568)), 'incorrect'),
    spec('Deux retenues : 367 + 285 = 652', 3, vars_add(367, 285), '652', 'correct'),
    spec('Erreur : retenues oubliées, 367 + 285 = 542', 3, vars_add(367, 285),
         str(sans_retenue(367, 285)), 'incorrect'),
    spec('Somme 1 000 : 625 + 375', 3, vars_add(625, 375), '1000', 'correct'),
]

# ---- 2 et 3. Soustraction posée (CE1-100), cassage et compensation ----


def soustraction(methode):
    tete = POSE + '{{a}} − {{b}}\nméthode: ' + methode + '\n```'
    cassage = methode == 'cassage'

    def unites(haut_d):
        """Étape des unités : un échange, en haut (cassage) ou des deux côtés (compensation)."""
        if cassage:
            return ('Unités : on ne peut pas ôter ${{b3}}$ de ${{a3}}$. On casse une dizaine : '
                    + haut_d + ', et on a maintenant $' + ev('a3+10') + '$ unités. Puis $'
                    + ev('a3+10') + ' - {{b3}} = ' + ev('a3+10-b3') + '$.')
        return ('Unités : on ne peut pas ôter ${{b3}}$ de ${{a3}}$. On ajoute $10$ unités en haut'
                ' ($' + ev('a3+10') + '$) et $1$ dizaine en bas. Puis $' + ev('a3+10')
                + ' - {{b3}} = ' + ev('a3+10-b3') + '$.')

    # « les 5 dizaines deviennent 4 », « la dizaine devient 0 »
    DIZ_CASSEE = ('{{if:a2==1|la dizaine devient $0$|les ${{a2}}$ dizaines deviennent $'
                  + ev('a2-1') + '$}}')

    un_echange = variation(
        tete, [],
        [var('a1', '1..9'), var('a2', '1..9'), var('a3', '0..8'), var('b2', '0..8'),
         var('b3', '1..9'), var('a', 'eval:' + A3), var('b', 'eval:' + B2)],
        [ALIGNER,
         unites(DIZ_CASSEE),
         ('Dizaines : $' + ev('a2-1') + ' - {{b2}} = ' + ev('a2-1-b2') + '$.') if cassage else
         ('Dizaines : en bas, ${{b2}} + 1 = ' + ev('b2+1') + '$ ; puis ${{a2}} - ' + ev('b2+1')
          + ' = ' + ev('a2-b2-1') + '$.'),
         'Centaines : ${{a1}}$ (rien à ôter).',
         '$${{a}} - {{b}} = ' + col(ev('a-b')) + '$$'],
        ['b3 > a3', 'a2 > b2', 'b >= 10'])

    deux_echanges = variation(
        tete, [],
        [var('a1', '2..9'), var('a2', '1..8'), var('a3', '0..8'), var('b1', '1..8'),
         var('b2', '1..9'), var('b3', '1..9'), var('a', 'eval:' + A3), var('b', 'eval:' + B3)],
        [ALIGNER,
         unites(DIZ_CASSEE),
         ('Dizaines : on ne peut pas ôter ${{b2}}$ de $' + ev('a2-1')
          + '$. On casse une centaine : il reste $' + ev('a1-1') + '$ ' + pl('a1-1', 'centaine')
          + ', et $'
          + ev('a2-1+10') + ' - {{b2}} = ' + ev('a2+9-b2') + '$.') if cassage else
         ('Dizaines : en bas, ${{b2}} + 1 = ' + ev('b2+1') + '$, qu\'on ne peut pas ôter de'
          ' ${{a2}}$. On ajoute $10$ dizaines en haut et $1$ centaine en bas : $'
          + ev('a2+10') + ' - ' + ev('b2+1') + ' = ' + ev('a2+9-b2') + '$.'),
         ('Centaines : $' + ev('a1-1') + ' - {{b1}} = ' + ev('a1-1-b1') + '$.') if cassage else
         ('Centaines : en bas, ${{b1}} + 1 = ' + ev('b1+1') + '$ ; puis ${{a1}} - '
          + ev('b1+1') + ' = ' + ev('a1-b1-1') + '$.'),
         '$${{a}} - {{b}} = ' + col(ev('a-b')) + '$$'],
        ['b3 > a3', 'b2 + 1 > a2', 'a1 > b1 + 1'])

    # BO c2 : le zéro au milieu, piège de l'échange (504 − 37)
    zero = variation(
        tete, [],
        [var('a1', '2..9'), var('a3', '0..8'), var('b2', '1..9'), var('b3', '1..9'),
         var('a', 'eval:100*a1+a3'), var('b', 'eval:' + B2)],
        [ALIGNER,
         ('Unités : on ne peut pas ôter ${{b3}}$ de ${{a3}}$, et il n\'y a aucune dizaine à'
          ' casser. On casse une centaine en $10$ dizaines (il reste $' + ev('a1-1')
          + '$ ' + pl('a1-1', 'centaine') + '), puis une de ces dizaines (il en reste $9$) : $' + ev('a3+10')
          + ' - {{b3}} = ' + ev('a3+10-b3') + '$.') if cassage else unites(''),
         ('Dizaines : $9 - {{b2}} = ' + ev('9-b2') + '$.') if cassage else
         ('Dizaines : en bas, ${{b2}} + 1 = ' + ev('b2+1') + '$, qu\'on ne peut pas ôter de $0$.'
          ' On ajoute $10$ dizaines en haut et $1$ centaine en bas : $10 - ' + ev('b2+1') + ' = '
          + ev('9-b2') + '$.'),
         ('Centaines : $' + ev('a1-1') + '$.') if cassage else
         ('Centaines : ${{a1}} - 1 = ' + ev('a1-1') + '$.'),
         '$${{a}} - {{b}} = ' + col(ev('a-b')) + '$$'],
        ['b3 > a3'])
    return [un_echange, deux_echanges, zero]


def ecart(a, b):
    """L'erreur « plus petit ôté du plus grand » dans chaque colonne."""
    res, rang = 0, 1
    while a // rang or b // rang:
        res += abs(a // rang % 10 - b // rang % 10) * rang
        rang *= 10
    return res


def vars_sous(a, b, nb):
    v = {'a1': a // 100, 'a3': a % 10, 'b2': b // 10 % 10, 'b3': b % 10, 'a': a, 'b': b}
    if nb != 0:
        v['a2'] = a // 10 % 10
    if nb == 3:
        v['b1'] = b // 100
    return v


SPECS_SOUSTRACTION = [
    spec('352 − 27 = 325', 0, vars_sous(352, 27, 2), '325', 'correct'),
    spec('Erreur : plus petit ôté du plus grand, 352 − 27 = 335', 0, vars_sous(352, 27, 2),
         str(ecart(352, 27)), 'incorrect'),
    spec('532 − 178 = 354', 1, vars_sous(532, 178, 3), '354', 'correct'),
    spec('Erreur : plus petit ôté du plus grand, 532 − 178 = 446', 1, vars_sous(532, 178, 3),
         str(ecart(532, 178)), 'incorrect'),
    spec('Une seule dizaine : 612 − 245 = 367', 1, vars_sous(612, 245, 3), '367', 'correct'),
    spec('BO : 504 − 37 = 467', 2, vars_sous(504, 37, 0), '467', 'correct'),
    spec('Erreur : zéro mal échangé, 504 − 37 = 577', 2, vars_sous(504, 37, 0), '577',
         'incorrect'),
    spec('Erreur : centaine non cassée, 504 − 37 = 567', 2, vars_sous(504, 37, 0), '567',
         'incorrect'),
]

# ---- 4. Lire l'heure (CE1-059) ----

MIN_Q = ev('15*q')
QUART = '{{if:q==1|et quart|{{if:q==2|et demie|moins le quart}}}}'
LIRE_ETAPES = [
    'La grande aiguille montre les minutes : sur le {{if:q==1|$3$, c\'est $15$|{{if:q==2|$6$,'
    ' c\'est $30$|$9$, c\'est $45$}}}} minutes.',
    'La petite aiguille montre l\'heure : elle a quitté le ${{h}}${{if:q==3| et elle est'
    ' presque sur le $' + ev('mod(h,12)+1') + '$, mais l\'heure n\'est pas encore'
    ' passée|}}.']

LIRE = variation(
    'Quelle heure est-il ?' + horloges(['{{h}} h ' + MIN_Q]) + '\n\nIl est $?~\\text{h}~?$.',
    ['{{h}}', MIN_Q], [var('h', '1..12'), var('q', '1..3')],
    LIRE_ETAPES + ['Il est $' + col('{{h}}~\\text{h}~' + MIN_Q) + '$.'])

APRES_MIDI = variation(
    'C\'est l\'après-midi. Quelle heure est-il ?' + horloges(['{{h}} h ' + MIN_Q])
    + '\n\nIl est $?~\\text{h}~?$.',
    [{'expectedAnswer': ev('h+12'),
      'validationRules': [{'type': 'custom', 'expression': 'answer != {{h}}',
                           'description': 'L\'après-midi, on compte après midi : {{h}} heures de'
                           ' l\'après-midi, c\'est ' + ev('h+12') + ' h.'}]},
     MIN_Q], [var('h', '1..5'), var('q', '1..3')],
    LIRE_ETAPES + ['Le cadran montre ${{h}}~\\text{h}~' + MIN_Q + '$. L\'après-midi, on ajoute'
                   ' $12$ : ${{h}} + 12 = ' + ev('h+12') + '$.',
                   'Il est $' + col(ev('h+12') + '~\\text{h}~' + MIN_Q) + '$.'])

SPECS_LIRE = [
    spec('BO : 8 h 30', 0, {'h': 8, 'q': 2}, ['8', '30'], 'correct'),
    spec('3 h 15', 0, {'h': 3, 'q': 1}, ['3', '15'], 'correct'),
    spec('Erreur : aiguilles inversées, 3 h 15 lu 3 h 3', 0, {'h': 3, 'q': 1}, ['3', '3'],
         'incorrect'),
    spec('8 h 45', 0, {'h': 8, 'q': 3}, ['8', '45'], 'correct'),
    spec('Erreur : 8 h 45 lu 9 h 45 (petite aiguille presque sur le 9)', 0, {'h': 8, 'q': 3},
         ['9', '45'], 'incorrect'),
    spec('Erreur : 8 h 45 lu 8 h 9 (le chiffre sous la grande aiguille)', 0, {'h': 8, 'q': 3},
         ['8', '9'], 'incorrect'),
    spec('BO : deux heures et quart l\'après-midi = 14 h 15', 1, {'h': 2, 'q': 1}, ['14', '15'],
         'correct'),
    spec('Erreur : 2 h 15 l\'après-midi', 1, {'h': 2, 'q': 1}, ['2', '15'], 'incorrect'),
    spec('16 h 30', 1, {'h': 4, 'q': 2}, ['16', '30'], 'correct'),
]

# ---- 5. Placer les aiguilles (CE1-060) ----

PETITE_GRANDE = ('La grande aiguille montre les minutes, la petite montre l\'heure.')
GRANDE_SUR = ('La grande aiguille va sur le {{if:q==0|$12$|{{if:q==1|$3$|{{if:q==2|$6$|$9$}}}}}}'
              ' ({{if:q==0|heure juste|' + ev('15*q') + ' minutes}}).')


def petite_sur(h):
    return ('{{if:q==0|La petite aiguille va pile sur le $' + h + '$.|{{if:q==3|La petite'
            ' aiguille va presque sur le $' + ev('mod(' + h + ',12)+1') + '$ : l\'heure n\'est'
            ' pas encore passée.|La petite aiguille va entre le $' + h + '$ et le $'
            + ev('mod(' + h + ',12)+1') + '$.}}}}')


PLACER_CHIFFRES = variation(
    'Place les aiguilles : il est ' + dit('{{h}}', MIN_Q)
    + '.\n\n```horloge\nplacer: {{h}} h ' + MIN_Q + '\nchiffres: tous\n```', [],
    [var('h', '1..12'), var('q', '0..3')],
    [PETITE_GRANDE, GRANDE_SUR, petite_sur('{{h}}')])

# BO : « et quart », « et demie », « moins le quart » ; n = l'heure dite (moins le quart : n = h+1)
DITE = ('{{if:q==0|{{h}} ' + pl('h', 'heure') + ' pile|{{if:q==3|' + ev('mod(h,12)+1')
        + ' heures moins le quart|{{h}} ' + pl('h', 'heure') + ' ' + QUART + '}}}}')

PLACER_MOTS = variation(
    'Place les aiguilles : il est ' + DITE + '.\n\n```horloge\nplacer: {{h}} h ' + MIN_Q
    + '\nchiffres: tous\n```', [], [var('h', '1..11'), var('q', '0..3')],
    ['{{if:q==3|' + ev('mod(h,12)+1') + ' heures moins le quart, c\'est un quart d\'heure avant '
     + ev('mod(h,12)+1') + ' heures : ${{h}}~\\text{h}~45$.|' + DITE + ', c\'est '
     + dit('{{h}}', MIN_Q) + '.}}', GRANDE_SUR, petite_sur('{{h}}')])

PLACER_APRES_MIDI = variation(
    'Place les aiguilles : il est ' + dit(ev('h+12'), MIN_Q)
    + '.\n\n```horloge\nplacer: ' + ev('h+12') + ' h ' + MIN_Q + '\nchiffres: tous\n```', [],
    [var('h', '1..6'), var('q', '0..3')],
    ['L\'après-midi, on enlève $12$ pour trouver le chiffre du cadran : $' + ev('h+12')
     + ' - 12 = {{h}}$.', GRANDE_SUR, petite_sur('{{h}}')])


def crans(h, m):
    """Réponse d'aiguilles bien posées : cran de la petite (vraie place), cran de la grande."""
    import math
    return f'{math.floor((h % 12) * 5 + m / 12 + 0.5) % 60} {m}'


SPECS_PLACER = [
    spec('BO : 8 h 30', 0, {'h': 8, 'q': 2}, crans(8, 30), 'correct'),
    spec('8 h 30, petite entre le 8 et le 9 (pas à sa vraie place)', 0, {'h': 8, 'q': 2},
         '41 30', 'correct'),
    spec('Erreur : 8 h 30, petite pile sur le 8', 0, {'h': 8, 'q': 2}, '40 30', 'incorrect'),
    spec('9 h', 0, {'h': 9, 'q': 0}, '45 0', 'correct'),
    spec('Erreur : 9 h, aiguilles inversées', 0, {'h': 9, 'q': 0}, '0 45', 'incorrect'),
    spec('Rien placé : case vide', 0, {'h': 9, 'q': 0}, '', 'empty'),
    spec('8 heures moins le quart = 7 h 45', 1, {'h': 7, 'q': 3}, crans(7, 45), 'correct'),
    spec('Erreur : 8 heures moins le quart placé 8 h 45', 1, {'h': 7, 'q': 3}, crans(8, 45),
         'incorrect'),
    spec('3 heures et quart', 1, {'h': 3, 'q': 1}, crans(3, 15), 'correct'),
    spec('15 h 30 sur le 3', 2, {'h': 3, 'q': 2}, crans(3, 30), 'correct'),
    spec('Erreur : 15 h 30 placé 5 h 30', 2, {'h': 3, 'q': 2}, crans(5, 30), 'incorrect'),
]

# ---- 6. Durée écoulée (CE1-063) ----

DEBUT_FIN = ['Début', 'Fin']
ACTIVITE = ('{{if:k==1|La récréation|{{if:k==2|La séance de piscine|{{if:k==3|La séance de'
            ' cinéma|La promenade}}}}}}')


def minutes_de(total):
    return ev('mod(' + total + ',60)')


def heures_de(total):
    return ev('floor((' + total + ')/60)')


# Même heure : de h h 15·p à h h 15·q
MEME_HEURE = variation(
    ACTIVITE + ' commence et finit aux heures montrées. Combien de temps a-t-elle duré ?'
    + horloges([heure('{{h}}', ev('15*p')), heure('{{h}}', MIN_Q)], DEBUT_FIN)
    + '\n\nElle a duré $?~\\text{min}$.', [ev('15*(q-p)')],
    [var('k', '1..4'), var('h', '1..12'), var('p', '0..2'), var('q', '1..3')],
    ['Début : ' + dit('{{h}}', ev('15*p')) + '. Fin : ' + dit('{{h}}', MIN_Q) + '.',
     'La grande aiguille a avancé de ' + ev('q-p') + ' {{if:q-p==1|quart|quarts}} de tour : $'
     + ev('15*(q-p)') + '$ minutes.',
     'Elle a duré $' + col(ev('15*(q-p)')) + '~\\text{min}$.'],
    ['q > p'])

# BO : 15 h 45 → 16 h 15 (on passe l'heure)
PASSE_L_HEURE = variation(
    ACTIVITE + ' commence et finit aux heures montrées. Combien de temps a-t-elle duré ?'
    + horloges([heure('{{h}}', ev('15*p')), heure(ev('mod(h,12)+1'), MIN_Q)], DEBUT_FIN)
    + '\n\nElle a duré $?~\\text{min}$.', [ev('60-15*p+15*q')],
    [var('k', '1..4'), var('h', '1..12'), var('p', '1..3'), var('q', '0..2')],
    ['Début : ' + dit('{{h}}', ev('15*p')) + '. Fin : ' + dit(ev('mod(h,12)+1'), MIN_Q) + '.',
     'De ' + dit('{{h}}', ev('15*p')) + ' à $' + ev('mod(h,12)+1') + '~\\text{h}$ : $'
     + ev('60-15*p') + '$ minutes.{{if:q>0| Puis de $' + ev('mod(h,12)+1')
     + '~\\text{h}$ à ' + dit(ev('mod(h,12)+1'), MIN_Q) + ' : $' + MIN_Q + '$ minutes.|}}',
     '{{if:q>0|$' + ev('60-15*p') + ' + ' + MIN_Q + ' = ' + ev('60-15*p+15*q') + '$. |}}'
     'Elle a duré $' + col(ev('60-15*p+15*q')) + '~\\text{min}$.'],
    ['q < p'])

# BO : midi → 20 h ; heures justes, le matin ou l'après-midi (cadran sans ambiguïté)
MOMENT = '{{if:s==0|ce matin|cet après-midi}}'
HEURES_JUSTES = variation(
    'La fête a eu lieu ' + MOMENT + '. Combien de temps a-t-elle duré ?'
    + horloges([heure('{{h}}', '0'), heure(ev('h+d'), '0')], DEBUT_FIN)
    + '\n\nElle a duré $?~\\text{h}$.', ['{{d}}'],
    [var('s', '0..1'), var('t', '1..3'), var('h', 'eval:t+6*(1-s)'), var('d', '2..4')],
    ['Les deux grandes aiguilles sont sur le $12$ : ce sont des heures justes.',
     'De $' + '{{h}}' + '~\\text{h}$ à $' + ev('h+d') + '~\\text{h}$ : $' + ev('h+d')
     + ' - {{h}} = {{d}}$.',
     'Elle a duré $' + col('{{d}}') + '~\\text{h}$.'],
    ['h + d <= 12'])

# BO : 9 h 15 → 11 h 45 ; heures et minutes
HEURES_ET_MINUTES = variation(
    'Le voyage a duré de l\'heure du début à l\'heure de la fin. Combien de temps ?'
    + horloges([heure('{{h}}', ev('15*p')), heure(ev('h+d'), MIN_Q)], DEBUT_FIN)
    + '\n\nIl a duré $?~\\text{h}~?~\\text{min}$.', ['{{d}}', ev('15*(q-p)')],
    [var('h', '6..9'), var('d', '1..2'), var('p', '0..2'), var('q', '1..3')],
    ['Début : ' + dit('{{h}}', ev('15*p')) + '. Fin : ' + dit(ev('h+d'), MIN_Q) + '.',
     'De ' + dit('{{h}}', ev('15*p')) + ' à ' + dit(ev('h+d'), ev('15*p')) + ' : ${{d}}$'
     ' {{if:d==1|heure|heures}}.',
     'Puis de ' + dit(ev('h+d'), ev('15*p')) + ' à ' + dit(ev('h+d'), MIN_Q) + ' : $'
     + ev('15*(q-p)') + '$ minutes.',
     'Il a duré $' + col('{{d}}~\\text{h}~' + ev('15*(q-p)') + '~\\text{min}') + '$.'],
    ['q > p'])

SPECS_DUREE = [
    spec('BO : 8 h 30 → 8 h 45 = 15 min', 0, {'k': 1, 'h': 8, 'p': 2, 'q': 3}, '15', 'correct'),
    spec('Erreur : 8 h 30 → 8 h 45 = 45', 0, {'k': 1, 'h': 8, 'p': 2, 'q': 3}, '45',
         'incorrect'),
    spec('BO : 15 h 45 → 16 h 15 = 30 min (cadran : 3 h 45 → 4 h 15)', 1,
         {'k': 2, 'h': 3, 'p': 3, 'q': 1}, '30', 'correct'),
    spec('Erreur : soustraction décimale, 1615 − 1545 = 70', 1, {'k': 2, 'h': 3, 'p': 3, 'q': 1},
         '70', 'incorrect'),
    spec('9 h 30 → 10 h = 30 min', 1, {'k': 3, 'h': 9, 'p': 2, 'q': 0}, '30', 'correct'),
    spec('Après-midi : 1 h → 4 h = 3 h', 2, {'s': 1, 't': 1, 'h': 1, 'd': 3},
         '3', 'correct'),
    spec('8 h → 11 h = 3 h', 2, {'s': 0, 't': 2, 'h': 8, 'd': 3}, '3', 'correct'),
    spec('Erreur : 8 h → 11 h = 19', 2, {'s': 0, 't': 2, 'h': 8, 'd': 3}, '19', 'incorrect'),
    spec('BO : 9 h 15 → 11 h 45 = 2 h 30 min', 3, {'h': 9, 'd': 2, 'p': 1, 'q': 3},
         ['2', '30'], 'correct'),
    spec('Erreur : 9 h 15 → 11 h 45 = 2 h 3', 3, {'h': 9, 'd': 2, 'p': 1, 'q': 3}, ['2', '3'],
         'incorrect'),
    spec('Erreur : 9 h 15 → 11 h 45 = 3 h 30', 3, {'h': 9, 'd': 2, 'p': 1, 'q': 3}, ['3', '30'],
         'incorrect'),
]

# ---- 7. Comparer des durées (CE1-104) ----

# Film : de 60·h1 + 15·p à + 15·f ; match : de 60·h2 + 15·q à + 15·g (minutes depuis minuit)
F0 = '(60*h1+15*p)'
F1 = '(60*h1+15*p+15*f)'
M0 = '(60*h2+15*q)'
M1 = '(60*h2+15*q+15*g)'


def h_de(t):
    return heure(heures_de(t), minutes_de(t))


def duree_dite(n):
    """Durée de `n` quarts d'heure, en mots : « 1 h 30 min », « 45 min », « 2 h »."""
    return ('{{if:' + n + '<4|$' + ev('15*' + n) + '~\\text{min}$|{{if:mod(' + n + ',4)==0|$'
            + ev('floor(' + n + '/4)') + '~\\text{h}$|$' + ev('floor(' + n + '/4)')
            + '~\\text{h}~' + ev('15*mod(' + n + ',4)') + '~\\text{min}$}}}}')


FILM_MATCH = variation(
    'Tom a regardé un film, puis un match.' + horloges(
        [h_de(F0), h_de(F1), h_de(M0), h_de(M1)],
        ['Début du film', 'Fin du film', 'Début du match', 'Fin du match'])
    + '\n\nLequel a duré le plus longtemps ?'
    + choix(['Le film', 'Le match', 'Ils ont duré autant.'], melanger=False),
    ['{{r}}'],
    [var('h1', '7..8'), var('p', '0..3'), var('f', '2..8'), var('g', '2..8'),
     var('h2', 'eval:floor((60*h1+15*p+15*f)/60)+1'), var('q', '0..3'),
     var('r', '{{if:f>g|0|{{if:f<g|1|2}}}}')],
    ['Le film : de ' + dit(heures_de(F0), minutes_de(F0)) + ' à '
     + dit(heures_de(F1), minutes_de(F1)) + ', il a duré ' + duree_dite('f') + '.',
     'Le match : de ' + dit(heures_de(M0), minutes_de(M0)) + ' à '
     + dit(heures_de(M1), minutes_de(M1)) + ', il a duré ' + duree_dite('g') + '.',
     '{{if:r==0|Le **film** a duré le plus longtemps.|{{if:r==1|Le **match** a duré le plus'
     ' longtemps.|Ils ont duré **autant**.}}}}'],
    ['(60*h2+15*q+15*g) <= 720'])

# BO : 2 heures et 130 minutes ; b = 60·a + 10·s minutes
LONGUE = choix(['${{a}}~\\text{h}$', '${{b}}~\\text{min}$', 'Elles sont égales.'],
               melanger=False)
H_OU_MIN = variation(
    'Quelle durée est la plus longue ?' + LONGUE, ['{{r}}'],
    [var('a', '1..3'), var('s', '-3..3'), var('b', 'eval:60*a+10*s'),
     var('r', '{{if:s<0|0|{{if:s>0|1|2}}}}')],
    ['$1~\\text{h} = 60~\\text{min}${{if:a>1| : ${{a}}~\\text{h} = ' + ev('60*a')
     + '~\\text{min}$|}}.',
     'On compare $' + ev('60*a') + '~\\text{min}$ et ${{b}}~\\text{min}$.',
     '{{if:r==0|${{a}}~\\text{h}$ est la plus longue.|{{if:r==1|${{b}}~\\text{min}$ est la plus'
     ' longue.|Elles sont égales.}}}}'])

LONGUE_HM = choix(['${{a}}~\\text{h}~{{c}}~\\text{min}$', '${{b}}~\\text{min}$',
                   'Elles sont égales.'], melanger=False)
HM_OU_MIN = variation(
    'Quelle durée est la plus longue ?' + LONGUE_HM, ['{{r}}'],
    [var('a', '1..2'), var('t', '1..3'), var('c', 'eval:15*t'), var('s', '-2..2'),
     var('b', 'eval:60*a+c+10*s'), var('r', '{{if:s<0|0|{{if:s>0|1|2}}}}')],
    ['${{a}}~\\text{h} = ' + ev('60*a') + '~\\text{min}$, donc ${{a}}~\\text{h}~{{c}}~'
     '\\text{min} = ' + ev('60*a') + ' + {{c}} = ' + ev('60*a+c') + '~\\text{min}$.',
     'On compare $' + ev('60*a+c') + '~\\text{min}$ et ${{b}}~\\text{min}$.',
     '{{if:r==0|${{a}}~\\text{h}~{{c}}~\\text{min}$ est la plus longue.|{{if:r==1|${{b}}~'
     '\\text{min}$ est la plus longue.|Elles sont égales.}}}}'])

SPECS_COMPARER = [
    spec('Film 1 h 30, match 1 h : le film', 0,
         {'h1': 8, 'p': 0, 'f': 6, 'g': 4, 'h2': 10, 'q': 0, 'r': 0}, '0', 'correct'),
    spec('Erreur : le match (il finit plus tard)', 0,
         {'h1': 8, 'p': 0, 'f': 6, 'g': 4, 'h2': 10, 'q': 0, 'r': 0}, '1', 'incorrect'),
    spec('Même durée : autant', 0, {'h1': 8, 'p': 1, 'f': 3, 'g': 3, 'h2': 10, 'q': 2, 'r': 2},
         '2', 'correct'),
    spec('BO : 2 h et 130 min : 130 min', 1, {'a': 2, 's': 1, 'b': 130, 'r': 1}, '1',
         'correct'),
    spec('Erreur : 2 h et 130 min, 2 h', 1, {'a': 2, 's': 1, 'b': 130, 'r': 1}, '0',
         'incorrect'),
    spec('1 h et 50 min : 1 h', 1, {'a': 1, 's': -1, 'b': 50, 'r': 0}, '0', 'correct'),
    spec('Erreur : 1 h et 50 min, 50 min (1 < 50)', 1, {'a': 1, 's': -1, 'b': 50, 'r': 0}, '1',
         'incorrect'),
    spec('1 h 30 min et 90 min : égales', 2, {'a': 1, 't': 2, 'c': 30, 's': 0, 'b': 90, 'r': 2},
         '2', 'correct'),
    spec('Erreur : 1 h 30 min et 90 min, 90 min', 2,
         {'a': 1, 't': 2, 'c': 30, 's': 0, 'b': 90, 'r': 2}, '1', 'incorrect'),
]

MODELES = {
    '01-addition-posee': modele(
        'Pose et calcule une addition',
        'Addition posée en colonnes, deux ou trois termes, avec retenues, somme ≤ 1 000 (245 + 437 ;'
        ' 218 + 48 ; 76 + 7 + 568)', 'Nombres', 'Addition', 'Calcul posé', 2,
        [ADD_3_3, ADD_3_2, ADD_3_TERMES, ADD_DEUX_RETENUES], SPECS_ADDITION, delay=180),
    '02-soustraction-posee-cassage': modele(
        'Pose et calcule une soustraction (par cassage)',
        'Soustraction posée, méthode par cassage : un échange, deux échanges, zéro au milieu'
        ' (504 − 37)', 'Nombres', 'Soustraction', 'Calcul posé', 1, soustraction('cassage'),
        SPECS_SOUSTRACTION, delay=180),
    '03-soustraction-posee-compensation': modele(
        'Pose et calcule une soustraction (par compensation)',
        'Soustraction posée, méthode par compensation : un échange, deux échanges, zéro au'
        ' milieu (504 − 37)', 'Nombres', 'Soustraction', 'Calcul posé', 2,
        soustraction('compensation'), SPECS_SOUSTRACTION, delay=180),
    '04-lire-l-heure': modele(
        'Quelle heure est-il ? (quarts et demies)',
        'Lire 8 h 30, 3 h 15, 8 h 45 sur une horloge à aiguilles ; l\'après-midi, 14 h 15',
        'Grandeurs', 'Durées', 'Lire l\'heure', 3, [LIRE, APRES_MIDI], SPECS_LIRE),
    '05-placer-les-aiguilles': modele(
        'Place les aiguilles',
        'Poser les aiguilles : heure juste, et quart, et demie, moins le quart ; 15 h 30 sur le 3',
        'Grandeurs', 'Durées', 'Lire l\'heure', 4,
        [PLACER_CHIFFRES, PLACER_MOTS, PLACER_APRES_MIDI], SPECS_PLACER),
    '06-duree-ecoulee': modele(
        'Combien de temps a-t-il duré ?',
        'Durée entre deux horloges : 8 h 30 → 8 h 45 ; 15 h 45 → 16 h 15 ; heures justes ;'
        ' 9 h 15 → 11 h 45', 'Grandeurs', 'Durées', 'Durée écoulée', 1,
        [MEME_HEURE, PASSE_L_HEURE, HEURES_JUSTES, HEURES_ET_MINUTES], SPECS_DUREE, delay=120),
    '07-comparer-des-durees': modele(
        'Quelle durée est la plus longue ?',
        'Le film ou le match, lu sur quatre horloges ; 2 h ou 130 min ; 1 h 30 min ou 90 min',
        'Grandeurs', 'Durées', 'Durée écoulée', 2, [FILM_MATCH, H_OU_MIN, HM_OU_MIN],
        SPECS_COMPARER, delay=120),
}

for nom, m in MODELES.items():
    with open(f'{DOSSIER}/{nom}.json', 'w') as f:
        json.dump(m, f, ensure_ascii=False, indent='\t')
        f.write('\n')
print(len(MODELES), 'modèles écrits')
