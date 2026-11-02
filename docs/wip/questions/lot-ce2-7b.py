"""Écrit les 9 modèles du lot 7b du CE2 (horloge et droite graduée) dans scripts/questions/ce2-7b/.

Phase 0 validée par David le 2026-11-02 (§ 12 du journal `docs/wip/questions-ce2-progress.md`,
« tes recos ? » puis « ok »). Bornes `cycle2.json` : CE2-057 (lire l'heure : huit heures et demie,
sept heures moins le quart, quatre heures moins vingt, quinze heures quarante-deux, midi),
CE2-058 (poser les aiguilles : cinq heures et quart, treize heures vingt, six heures dix-huit),
CE2-059 (durée entre deux cadrans, même journée : 8 h 30 → 8 h 50, 15 h 40 → 16 h 05 ; minutes
dans 2 h 20), CE2-094 (comparer deux durées lues sur des cadrans), CE2-010 (portion de demi-droite
graduée de 1 en 1, 10 en 10, 100 en 100, 1 000 en 1 000). Décisions :

1. Niveaux partagés : lecture de l'heure 5 à 8 (CP 1-2, CE1 2-4), calcul de durées 5 à 7 (CE2 3-4
   au lot 6b, 6e 1-8 : écart noté), droite graduée 2 et 3 (CE1 : 1). Les publiés ne bougent pas.
2. Horloge « digitale » : texte (« quinze heures quarante-deux ») et `cadran: 24`, pas de bloc.
3. 058 en deux modèles : poser les aiguilles (03), choisir la bonne horloge (04).
4. 094 : case choix (« la plus longue »), puis écart en minutes (case).
5. Un seul lot de 9 modèles.

Pièges : jamais de variable `e` ni `i` ; une minute à 0 s'écrit `9 h` dans `heure:` (helper
`heure`) et `9 h 0` dans `placer:` ; la case choix répond par l'indice d'origine (specs : `'0'`
= le premier choix de l'énoncé, mélange ou non) ; `{{if:}}` ne résout pas un `{{eval:}}`
imbriqué (helper `brut`).

    python3 docs/wip/questions/lot-ce2-7b.py scripts/questions/ce2-7b
"""
import json
import math
import sys

DOSSIER = sys.argv[1]

# ---- Gabarits ----


def spec(desc, vi, variables, answers, status):
    return {'description': desc, 'variationIndex': vi,
            'variables': {k: str(x) for k, x in variables.items()},
            'answers': answers if isinstance(answers, list) else [answers],
            'expected': {'status': status}}


def modele(title, description, theme, domain, subdomain, level, variations, specs, delay=120):
    # theme / domain / subdomain : anciennes colonnes, remplies pour create-questions ; le
    # rangement (sous-notion du point) est posé par la migration
    return {'title': title, 'description': description, 'grades': ['CE2'], 'theme': theme,
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


def choix_horloges(heures):
    """Case choix dont chaque choix est une horloge (quatre accents graves : blocs imbriqués)."""
    return ('\n\n````choix\n'
            + ''.join('- ```horloge\n  heure: ' + h + '\n  chiffres: tous\n  ```\n'
                      for h in heures)
            + '````')


def selon(k, textes, n=1):
    """`{{if:k==1|…|{{if:k==2|…|…}}}}` : le texte numéro `n` pour k == n, etc."""
    if len(textes) == 1:
        return textes[0]
    return ('{{if:' + k + '==' + str(n) + '|' + textes[0] + '|' + selon(k, textes[1:], n + 1)
            + '}}')


def ev(x):
    return '{{eval:' + x + '}}'


def col(x, k=0):
    return '\\textcolor{{{color:primary.' + str(k) + '}}}{' + x + '}'


def pl(x, mot):
    """`mot` accordé au nombre `x` (expression) : « 1 heure », « 3 heures »."""
    return mot + '{{if:' + x + '>1|s|}}'


def brut(m):
    """`{{eval:5*q}}` → `5*q` : une condition `{{if:}}` ne résout pas un `{{eval:}}` imbriqué."""
    return m[7:-2] if m.startswith('{{eval:') else m


def heure(h, m):
    """Texte d'une heure pour ```horloge, minutes en `{{eval:…}}` : `9 h 15`, `9 h` si m vaut 0.

    Pas dans `placer:` : la case lit le bloc avant de résoudre ce `{{if:}}` ; on y écrit
    `9 h 0` (accepté, minutes 0)."""
    return '{{if:' + brut(m) + '==0|' + h + ' h|' + h + ' h ' + m + '}}'


def dit(h, m):
    """L'heure écrite pour l'élève, en formule : $9~\\text{h}~15$, $9~\\text{h}$."""
    return '{{if:' + brut(m) + '==0|$' + h + '~\\text{h}$|$' + h + '~\\text{h}~' + m + '$}}'


def horloges(heures, legendes=None, cadran24=False):
    bloc = '\n\n```horloge\nheure: ' + ' ; '.join(heures) + '\nchiffres: tous\n'
    if cadran24:
        bloc += 'cadran: 24\n'
    if legendes:
        bloc += 'légendes: ' + ' ; '.join(legendes) + '\n'
    return bloc + '```'


def crans(h, m):
    """Réponse d'aiguilles bien posées : cran de la petite (vraie place), cran de la grande."""
    return f'{math.floor((h % 12) * 5 + m / 12 + 0.5) % 60} {m}'


# =====================================================================================
# 01. Lire l'heure, minutes (CE2-057)
# =====================================================================================

Q_PRESQUE = ('{{if:m>=45| (elle est presque sur le $' + ev('mod(h,12)+1')
             + '$, mais l\'heure n\'est pas encore passée)|}}')
PETITE = ('La petite aiguille montre les heures : elle a passé le ${{h}}$ sans atteindre le suivant'
          + Q_PRESQUE + '. L\'heure est donc ${{h}}$.')

# 5 min près : la grande aiguille sur un chiffre, on compte de 5 en 5
LIRE_5 = variation(
    'Quelle heure est-il ?' + horloges(['{{h}} h ' + ev('5*q')]).replace(
        'chiffres: tous\n', 'chiffres: tous\ngraduations: minutes\n')
    + '\n\nIl est $?~\\text{h}~?$.',
    ['{{h}}', ev('5*q')], [var('h', '1..12'), var('q', '1..11'), var('m', 'eval:5*q')],
    [PETITE,
     'La grande aiguille montre les minutes. Elle est sur le ${{q}}$ : on compte de $5$ en $5$,'
     ' ${{q}} \\times 5 = ' + ev('5*q') + '$ minutes.',
     'Il est $' + col('{{h}}~\\text{h}~' + ev('5*q')) + '$.'])

# à la minute près : q chiffres passés, plus r petites graduations
RELIRE_MIN = ('La grande aiguille a passé {{if:q==0|le $12$ ($0$ minute)|le ${{q}}$ ($' + ev('5*q')
              + '$ minutes)}}, puis elle avance de ${{r}}$ petite{{if:r>1|s|}} graduation'
              '{{if:r>1|s|}} : $' + ev('5*q') + ' + {{r}} = ' + ev('5*q+r') + '$ minutes.')

LIRE_MIN = variation(
    'Quelle heure est-il ?' + horloges(['{{h}} h ' + ev('5*q+r')]).replace(
        'chiffres: tous\n', 'chiffres: tous\ngraduations: minutes\n')
    + '\n\nIl est $?~\\text{h}~?$.',
    ['{{h}}', '{{m}}'],
    [var('h', '1..12'), var('q', '0..11'), var('r', '1..4'), var('m', 'eval:5*q+r')],
    [PETITE, RELIRE_MIN, 'Il est $' + col('{{h}}~\\text{h}~{{m}}') + '$.'])

# après-midi : la bonne réponse compte après midi
LIRE_APRES_MIDI = variation(
    'C\'est l\'après-midi. Quelle heure est-il ?' + horloges([heure('{{h}}', ev('m'))]).replace(
        'chiffres: tous\n', 'chiffres: tous\ngraduations: minutes\n')
    + '\n\nIl est $?~\\text{h}~?$.',
    [{'expectedAnswer': ev('h+12'),
      'validationRules': [{'type': 'custom', 'expression': 'answer != {{h}}',
                           'description': 'L\'après-midi, on compte après midi : {{h}} heures de'
                           ' l\'après-midi, c\'est ' + ev('h+12') + ' h.'}]}, '{{m}}'],
    [var('h', '1..11'), var('q', '0..11'), var('r', '0..4'), var('m', 'eval:5*q+r')],
    [PETITE,
     '{{if:r>0|La grande aiguille a passé {{if:q==0|le $12$|le ${{q}}$}} ($' + ev('5*q')
     + '$ minutes), puis elle avance de ${{r}}$ graduation{{if:r>1|s|}} : $' + ev('5*q')
     + ' + {{r}} = {{m}}$ minutes.|La grande aiguille est sur le {{if:q==0|$12$|${{q}}$}} : '
     '{{m}} minute{{if:m>1|s|}}.}}',
     'Le cadran montre ${{h}}~\\text{h}~{{m}}$. L\'après-midi, on ajoute $12$ aux heures : ${{h}}'
     ' + 12 = ' + ev('h+12') + '$.',
     'Il est $' + col(ev('h+12') + '~\\text{h}~{{m}}') + '$.'])


def v_lire(h, q, r=None):
    d = {'h': h, 'q': q, 'm': 5 * q + (r or 0)}
    if r is not None:
        d['r'] = r
    return d


SPECS_LIRE_MIN = [
    spec('8 h 35', 0, v_lire(8, 7), ['8', '35'], 'correct'),
    spec('Erreur : 8 h 35 lu 8 h 7 (le chiffre du cadran)', 0, v_lire(8, 7), ['8', '7'],
         'incorrect'),
    spec('Erreur : 8 h 35 lu 7 h 35 (petite aiguille entre le 8 et le 9)', 0, v_lire(8, 7),
         ['7', '35'], 'incorrect'),
    spec('Erreur : aiguilles inversées, 8 h 35 lu 7 h 40', 0, v_lire(8, 7), ['7', '40'],
         'incorrect'),
    spec('8 h 55, petite presque sur le 9', 0, v_lire(8, 11), ['8', '55'], 'correct'),
    spec('Erreur : 8 h 55 lu 9 h 55', 0, v_lire(8, 11), ['9', '55'], 'incorrect'),
    spec('BO : 6 h 18', 1, v_lire(6, 3, 3), ['6', '18'], 'correct'),
    spec('Erreur : 6 h 18 lu 6 h 15 (graduations oubliées)', 1, v_lire(6, 3, 3), ['6', '15'],
         'incorrect'),
    spec('Erreur : 6 h 18 lu 6 h 3 (le chiffre du cadran)', 1, v_lire(6, 3, 3), ['6', '3'],
         'incorrect'),
    spec('2 h 04 : passé le 12 de 4 graduations', 1, v_lire(2, 0, 4), ['2', '4'], 'correct'),
    spec('BO : 15 h 22 l\'après-midi', 2, v_lire(3, 4, 2), ['15', '22'], 'correct'),
    spec('Erreur : 3 h 22 l\'après-midi', 2, v_lire(3, 4, 2), ['3', '22'], 'incorrect'),
    spec('Après-midi, minute 0 : 14 h', 2, v_lire(2, 0, 0), ['14', '0'], 'correct'),
]

# =====================================================================================
# 02. Lire l'heure, en mots et sur le cadran de 24 h (CE2-057)
# =====================================================================================

MOTS_MOINS = ['le quart', 'dix', 'cinq', 'vingt']  # indexés par t : voir ordre ci-dessous
# t = 1..4 -> 5, 10, 15, 20 minutes : cinq, dix, le quart, vingt
MOINS_TXT = selon('t', ['cinq', 'dix', 'le quart', 'vingt'])
PLUS_TXT = selon('t', ['cinq', 'dix', 'et quart', 'vingt', 'vingt-cinq', 'et demie'])

MOTS_MOINS_V = variation(
    'Écris l\'heure en chiffres : **{{n}} heures moins ' + MOINS_TXT + '**.\n\n'
    'Il est $?~\\text{h}~?$.',
    [ev('n-1'), ev('60-5*t')],
    [var('n', '2..12'), var('t', '1..4')],
    ['« Moins ' + MOINS_TXT + ' », c\'est avant {{n}} heures : il manque $' + ev('5*t')
     + '$ minutes pour arriver à ${{n}}~\\text{h}$.',
     'On est donc dans l\'heure d\'avant, ${{n}} - 1 = ' + ev('n-1') + '$, et il s\'est écoulé $60 - '
     + ev('5*t') + ' = ' + ev('60-5*t') + '$ minutes.',
     'Il est $' + col(ev('n-1') + '~\\text{h}~' + ev('60-5*t')) + '$.'])

MOTS_PLUS_V = variation(
    'Écris l\'heure en chiffres : **{{if:n==1|une|{{n}}}} ' + pl('n', 'heure') + ' ' + PLUS_TXT + '**.\n\n'
    'Il est $?~\\text{h}~?$.',
    ['{{n}}', ev('5*t')],
    [var('n', '1..12'), var('t', '1..6')],
    ['Les heures sont dites en premier : ${{n}}$ ' + pl('n', 'heure') + '.',
     '« ' + PLUS_TXT + ' » : ' + '{{if:t==3|un quart d\'heure, c\'est $15$ minutes|{{if:t==6|'
     'une demi-heure, c\'est $30$ minutes|$' + ev('5*t') + '$ minutes}}}}.',
     'Il est $' + col('{{n}}~\\text{h}~' + ev('5*t')) + '$.'])

CADRAN_24 = variation(
    'C\'est l\'après-midi. Quelle heure est-il ? Écris-la sur $24$ heures.'
    + horloges([heure('{{h}}', ev('m'))], cadran24=True) + '\n\nIl est $?~\\text{h}~?$.',
    ['{{h}}', '{{m}}'],
    [var('h', '13..23'), var('q', '0..11'), var('r', '0..4'), var('m', 'eval:5*q+r')],
    ['La petite aiguille est sur le $' + ev('h-12') + '$ de la couronne du dehors. Sur la couronne'
     ' du dedans, au même endroit, on lit ${{h}}$ : c\'est l\'heure de l\'après-midi.',
     'La grande aiguille donne les minutes : {{m}} minute{{if:m>1|s|}}.',
     'Il est $' + col('{{h}}~\\text{h}~{{m}}') + '$.'])

# midi : k = 1..4
MIDI_TXT = selon('k', ['midi et quart', 'midi et demi', 'midi moins le quart',
                       'midi moins dix'])
MIDI = variation(
    'Écris l\'heure en chiffres : **' + MIDI_TXT + '**.\n\nIl est $?~\\text{h}~?$.',
    ['{{hh}}', '{{mm}}'],
    [var('k', '1..4'), var('hh', '{{if:k<3|12|11}}'),
     var('mm', '{{if:k==1|15|{{if:k==2|30|{{if:k==3|45|50}}}}}}')],
    ['Midi, c\'est $12~\\text{h}$.',
     '{{if:k<3|Après midi : $12~\\text{h}$ et $' + '{{mm}}' + '$ minutes.|Avant midi : on est dans'
     ' l\'heure d\'avant, $11~\\text{h}$, et il s\'est écoulé {{mm}} minutes.}}',
     'Il est $' + col('{{hh}}~\\text{h}~{{mm}}') + '$.'])

SPECS_MOTS = [
    spec('BO : sept heures moins le quart = 6 h 45', 0, {'n': 7, 't': 3}, ['6', '45'],
         'correct'),
    spec('Erreur : moins le quart lu 7 h 45', 0, {'n': 7, 't': 3}, ['7', '45'], 'incorrect'),
    spec('Erreur : moins le quart lu 6 h 15', 0, {'n': 7, 't': 3}, ['6', '15'], 'incorrect'),
    spec('BO : quatre heures moins vingt = 3 h 40', 0, {'n': 4, 't': 4}, ['3', '40'],
         'correct'),
    spec('Erreur : quatre heures moins vingt lu 3 h 20', 0, {'n': 4, 't': 4}, ['3', '20'],
         'incorrect'),
    spec('BO : huit heures et demie', 1, {'n': 8, 't': 6}, ['8', '30'], 'correct'),
    spec('Cinq heures et quart', 1, {'n': 5, 't': 3}, ['5', '15'], 'correct'),
    spec('Erreur : cinq heures et quart lu 5 h 45', 1, {'n': 5, 't': 3}, ['5', '45'],
         'incorrect'),
    spec('Sept heures vingt', 1, {'n': 7, 't': 4}, ['7', '20'], 'correct'),
    spec('Erreur : sept heures vingt lu 8 h 20', 1, {'n': 7, 't': 4}, ['8', '20'],
         'incorrect'),
    spec('BO : quinze heures quarante-deux', 2, {'h': 15, 'q': 8, 'r': 2, 'm': 42},
         ['15', '42'], 'correct'),
    spec('Erreur : 15 h 42 lu 3 h 42 (cadran de 24 h)', 2, {'h': 15, 'q': 8, 'r': 2, 'm': 42},
         ['3', '42'], 'incorrect'),
    spec('Midi et quart', 3, {'k': 1, 'hh': 12, 'mm': 15}, ['12', '15'], 'correct'),
    spec('Midi moins le quart = 11 h 45', 3, {'k': 3, 'hh': 11, 'mm': 45}, ['11', '45'],
         'correct'),
    spec('Erreur : midi moins le quart lu 12 h 45', 3, {'k': 3, 'hh': 11, 'mm': 45},
         ['12', '45'], 'incorrect'),
]

# =====================================================================================
# 03. Placer les aiguilles, minutes (CE2-058)
# =====================================================================================

PETITE_GRANDE = 'La grande aiguille montre les minutes, la petite montre l\'heure.'
GRANDE_5 = ('La grande aiguille va sur le {{if:q==0|$12$|${{q}}$}} : $' + ev('5*q')
            + '$ minutes, on compte de $5$ en $5$.')
GRANDE_MIN = ('La grande aiguille passe le {{if:q==0|$12$|${{q}}$}} ($' + ev('5*q')
              + '$ minutes) et avance de ${{r}}$ petite{{if:r>1|s|}} graduation'
              '{{if:r>1|s|}} : $' + ev('5*q+r') + '$ minutes.')


def petite_sur(h, apres):
    """La petite aiguille : pile sur l'heure, ou entre l'heure et la suivante (m > 0)."""
    return ('{{if:' + apres + '==0|La petite aiguille va pile sur le $' + h + '$.|La petite'
            ' aiguille va entre le $' + h + '$ et le $' + ev('mod(' + h + ',12)+1')
            + '$ : l\'heure n\'est pas encore passée.}}')


PLACER_5 = variation(
    'Place les aiguilles : il est ' + dit('{{h}}', ev('5*q')) + '.\n\n```horloge\nplacer: {{h}} h '
    + ev('5*q') + '\nchiffres: tous\ngraduations: minutes\n```', [],
    [var('h', '1..12'), var('q', '0..11')],
    [PETITE_GRANDE, GRANDE_5, petite_sur('{{h}}', 'q')])

PLACER_MIN = variation(
    'Place les aiguilles : il est ' + dit('{{h}}', ev('m')) + '.\n\n```horloge\nplacer: {{h}} h '
    '{{m}}\nchiffres: tous\ngraduations: minutes\n```', [],
    [var('h', '1..12'), var('q', '0..11'), var('r', '1..4'), var('m', 'eval:5*q+r')],
    [PETITE_GRANDE, GRANDE_MIN, petite_sur('{{h}}', 'm')])

# en mots : t = 1..6 « h heures + mot » ; t = 7..11 « h+1 heures moins mot »
PLUS_MOTS = selon('t', ['cinq', 'dix', 'et quart', 'vingt', 'vingt-cinq', 'et demie'])
MOINS_MOTS = selon('t', ['vingt-cinq', 'vingt', 'le quart', 'dix', 'cinq'], 7)
DITE = ('{{if:t<7|{{if:h==1|une|{{h}}}} ' + pl('h', 'heure') + ' ' + PLUS_MOTS + '|' + ev('h+1')
        + ' heures moins ' + MOINS_MOTS + '}}')

PLACER_MOTS = variation(
    'Place les aiguilles : il est ' + DITE + '.\n\n```horloge\nplacer: {{h}} h ' + ev('5*t')
    + '\nchiffres: tous\ngraduations: minutes\n```', [],
    [var('h', '1..11'), var('t', '1..11')],
    ['{{if:t<7|' + DITE + ', c\'est ' + dit('{{h}}', ev('5*t')) + '.|' + DITE
     + ', c\'est un peu avant ' + ev('h+1') + ' heures : ${{h}}~\\text{h}~' + ev('5*t')
     + '$.}}',
     'La grande aiguille va sur le ${{t}}$ ($' + ev('5*t') + '$ minutes).',
     'La petite aiguille va entre le ${{h}}$ et le $' + ev('h+1')
     + '$ : l\'heure n\'est pas encore passée.'])

PLACER_24 = variation(
    'Place les aiguilles : il est ' + dit(ev('h+12'), ev('m')) + '.\n\n```horloge\nplacer: '
    + ev('h+12') + ' h {{m}}\nchiffres: tous\ngraduations: minutes\n```', [],
    [var('h', '1..11'), var('q', '0..11'), var('r', '0..4'), var('m', 'eval:5*q+r')],
    ['Sur le cadran, on retrouve l\'heure en enlevant $12$ : $' + ev('h+12') + ' - 12 = {{h}}$.',
     PETITE_GRANDE,
     'La grande aiguille va sur {{m}} minute{{if:m>1|s|}} : {{if:r>0|elle passe {{if:q==0|le $12$|'
     'le ${{q}}$}} et avance de ${{r}}$ graduation{{if:r>1|s|}}.|elle est sur {{if:q==0|le $12$|'
     'le ${{q}}$}}.}}',
     petite_sur('{{h}}', 'm')])


def sp_placer(desc, vi, vs, h, m, statut, autre=None):
    return spec(desc, vi, vs, autre if autre is not None else crans(h, m), statut)


def petite_cran(h, m):
    return crans(h, m).split()[0]


SPECS_PLACER = [
    sp_placer('8 h 35', 0, {'h': 8, 'q': 7}, 8, 35, 'correct'),
    spec('Erreur : 8 h 35, aiguilles inversées', 0, {'h': 8, 'q': 7},
         f'35 {40}', 'incorrect'),
    spec('Erreur : 8 h 35, grande sur le 5', 0, {'h': 8, 'q': 7},
         f'{petite_cran(8, 35)} 25', 'incorrect'),
    sp_placer('9 h juste', 0, {'h': 9, 'q': 0}, 9, 0, 'correct'),
    spec('Rien placé : case vide', 0, {'h': 9, 'q': 0}, '', 'empty'),
    sp_placer('BO : 6 h 18', 1, {'h': 6, 'q': 3, 'r': 3, 'm': 18}, 6, 18, 'correct'),
    spec('Erreur : 6 h 18, grande sur le 3 (15 min)', 1, {'h': 6, 'q': 3, 'r': 3, 'm': 18},
         f'{petite_cran(6, 18)} 15', 'incorrect'),
    spec('Erreur : 6 h 18, grande sur le 18', 1, {'h': 6, 'q': 3, 'r': 3, 'm': 18},
         f'{petite_cran(6, 18)} 90', 'incorrect'),
    sp_placer('BO : cinq heures et quart', 2, {'h': 5, 't': 3}, 5, 15, 'correct'),
    sp_placer('Sept heures moins le quart = 6 h 45', 2, {'h': 6, 't': 9}, 6, 45, 'correct'),
    sp_placer('Quatre heures moins vingt = 3 h 40', 2, {'h': 3, 't': 8}, 3, 40, 'correct'),
    spec('Erreur : quatre heures moins vingt placé 4 h 40', 2, {'h': 3, 't': 8}, crans(4, 40),
         'incorrect'),
    spec('Erreur : sept heures moins le quart placé 7 h 15', 2, {'h': 6, 't': 9}, crans(7, 15),
         'incorrect'),
    sp_placer('BO : treize heures vingt', 3, {'h': 1, 'q': 4, 'r': 0, 'm': 20}, 1, 20,
              'correct'),
    spec('Erreur : 13 h 20, grande sur le 13', 3, {'h': 1, 'q': 4, 'r': 0, 'm': 20},
         f'{petite_cran(1, 20)} 65', 'incorrect'),
]

# =====================================================================================
# 04. Quelle horloge indique… ? (CE2-058, case choix)
# =====================================================================================

# Leurres : aiguilles inversées (petite sur le chiffre des minutes, grande sur 5×heure),
# heure d'après, minutes symétriques (20 / 40). h < 12 pour que l'inversion n'écrive pas « 0 ».
CONDITIONS_HORLOGE = ['h != q', 'q != 6']
V_LEURRES = [var('inv', '{{q}} h ' + ev('mod(5*h,60)')),
             var('suiv', ev('h+1') + ' h ' + ev('5*q')),
             var('sym', '{{h}} h ' + ev('60-5*q'))]

ETAPES_LEURRES = [
    'La petite aiguille montre l\'heure, la grande montre les minutes : attention à ne pas les'
    ' inverser.',
    'Pour ${{h}}~\\text{h}~' + ev('5*q') + '$ : la grande aiguille sur le ${{q}}$ ($'
    + ev('5*q') + '$ minutes), la petite entre le ${{h}}$ et le $' + ev('h+1') + '$.']

HORLOGE_5 = variation(
    'Quelle horloge indique ${{h}}~\\text{h}~' + ev('5*q') + '$ ?'
    + choix_horloges(['{{h}} h ' + ev('5*q'), '{{inv}}', '{{suiv}}', '{{sym}}']),
    ['0'], [var('h', '1..11'), var('q', '1..11')] + V_LEURRES, ETAPES_LEURRES,
    CONDITIONS_HORLOGE)

HORLOGE_24 = variation(
    'Quelle horloge indique ${{hh}}~\\text{h}~' + ev('5*q') + '$ ?'
    + choix_horloges(['{{h}} h ' + ev('5*q'), '{{inv}}', '{{suiv}}', '{{sym}}']),
    ['0'], [var('h', '1..11'), var('hh', 'eval:h+12'), var('q', '1..11')] + V_LEURRES,
    ['Sur un cadran de $12$ heures, on enlève $12$ : $' + ev('hh') + ' - 12 = {{h}}$.']
    + ETAPES_LEURRES[1:], CONDITIONS_HORLOGE)

# En mots : k = 1..4 ; n heures (2..12) + mot ; bonne heure puis trois leurres
MOTS_K = selon('k', ['et quart', 'et demie', 'moins le quart', 'moins vingt'])
BONNE = selon('k', ['{{n}} h 15', '{{n}} h 30', ev('n-1') + ' h 45', ev('n-1') + ' h 40'])
L1 = selon('k', ['{{n}} h 45', '{{n}} h 15', '{{n}} h 45', '{{n}} h 40'])
L2 = selon('k', [ev('mod(n,12)+1') + ' h 15', ev('mod(n,12)+1') + ' h 30', '{{n}} h 15',
                 '{{n}} h 20'])
L3 = selon('k', ['{{n}} h 30', '{{n}} h 45', ev('n-1') + ' h 15', ev('n-1') + ' h 20'])

HORLOGE_MOTS = variation(
    'Quelle horloge indique **{{n}} heures ' + MOTS_K + '** ?'
    + choix_horloges(['{{b}}', '{{l1}}', '{{l2}}', '{{l3}}']),
    ['0'], [var('n', '2..12'), var('k', '1..4'), var('b', BONNE), var('l1', L1),
            var('l2', L2), var('l3', L3)],
    ['« {{n}} heures ' + MOTS_K + ' » : {{if:k<3|on est après {{n}} heures, dans l\'heure'
     ' ${{n}}$.|on est avant {{n}} heures, dans l\'heure ' + ev('n-1') + '.}}',
     '{{if:k==1|Un quart d\'heure, c\'est $15$ minutes : la grande aiguille est sur le $3$.|'
     '{{if:k==2|Une demi-heure, c\'est $30$ minutes : la grande aiguille est sur le $6$.|'
     '{{if:k==3|Il manque un quart d\'heure : $60 - 15 = 45$ minutes, la grande aiguille est sur'
     ' le $9$.|Il manque vingt minutes : $60 - 20 = 40$ minutes, la grande aiguille est sur le'
     ' $8$.}}}}}}'])


def sp_hor(desc, vi, vs, i, statut):
    return spec(desc, vi, vs, str(i), statut)


V5 = {'h': 8, 'q': 7, 'inv': '7 h 40', 'suiv': '9 h 35', 'sym': '8 h 25'}
VMOTS = {'n': 7, 'k': 3, 'b': '6 h 45', 'l1': '7 h 45', 'l2': '7 h 15', 'l3': '6 h 15'}
SPECS_HORLOGE = [
    sp_hor('8 h 35 : bonne horloge', 0, V5, 0, 'correct'),
    sp_hor('Erreur : aiguilles inversées', 0, V5, 1, 'incorrect'),
    sp_hor('Erreur : heure d\'après', 0, V5, 2, 'incorrect'),
    sp_hor('Erreur : 35 lu 25 (minutes symétriques)', 0, V5, 3, 'incorrect'),
    sp_hor('13 h 20 : bonne horloge', 1,
           {'h': 1, 'hh': 13, 'q': 4, 'inv': '4 h 5', 'suiv': '2 h 20', 'sym': '1 h 40'}, 0,
           'correct'),
    sp_hor('Erreur : 13 h 20, heure d\'après', 1,
           {'h': 1, 'hh': 13, 'q': 4, 'inv': '4 h 5', 'suiv': '2 h 20', 'sym': '1 h 40'}, 2,
           'incorrect'),
    sp_hor('Sept heures moins le quart : bonne horloge', 2, VMOTS, 0, 'correct'),
    sp_hor('Erreur : sept heures moins le quart pris pour 7 h 45', 2, VMOTS, 1, 'incorrect'),
    sp_hor('Erreur : sept heures moins le quart pris pour 7 h 15', 2, VMOTS, 2, 'incorrect'),
    sp_hor('Erreur : sept heures moins le quart pris pour 6 h 15', 2, VMOTS, 3, 'incorrect'),
]

# =====================================================================================
# 05. Durée entre deux horloges (CE2-059)
# =====================================================================================

DEBUT_FIN = ['Début', 'Fin']
ACTIVITE = ('{{if:k==1|La récréation|{{if:k==2|La séance de piscine|{{if:k==3|Le film'
            '|La promenade}}}}}}')
QUESTION = ' commence et finit aux heures montrées. Combien de temps dure-t-' + 'il' + ' ?'
ACT_FINI = (ACTIVITE + ' commence et finit aux heures montrées. Combien de temps a-t-'
            '{{if:k==3|il|elle}} duré ?')

# même heure : de h h 5p à h h 5(p+n)
MEME_HEURE = variation(
    ACT_FINI + horloges([heure('{{h}}', ev('5*p')), heure('{{h}}', ev('5*(p+n)'))], DEBUT_FIN)
    + '\n\nDurée : $?~\\text{min}$.', [ev('5*n')],
    [var('k', '1..4'), var('h', '1..12'), var('p', '0..10'), var('n', '1..6')],
    ['Début : ' + dit('{{h}}', ev('5*p')) + '. Fin : ' + dit('{{h}}', ev('5*(p+n)')) + '.',
     'L\'heure ne change pas, on compte les minutes : la grande aiguille passe du ${{p}}$ au'
     ' $' + ev('p+n') + '$, soit {{n}} intervalle{{if:n>1|s|}} de $5$ minutes.',
     'Cela fait $' + col(ev('5*n')) + '~\\text{min}$.'],
    ['p + n <= 11'])

# passage de l'heure : de h h 5p à (h+1) h 5q avec q < p (15 h 40 → 16 h 05)
PASSE = variation(
    ACT_FINI + horloges([heure('{{h}}', ev('5*p')), heure(ev('mod(h,12)+1'), ev('5*q'))],
                        DEBUT_FIN) + '\n\nDurée : $?~\\text{min}$.', [ev('60-5*p+5*q')],
    [var('k', '1..4'), var('h', '1..12'), var('p', '1..11'), var('q', '0..10')],
    ['Début : ' + dit('{{h}}', ev('5*p')) + '. Fin : ' + dit(ev('mod(h,12)+1'), ev('5*q'))
     + '.',
     'De ' + dit('{{h}}', ev('5*p')) + ' à $' + ev('mod(h,12)+1') + '~\\text{h}$ : $60 - '
     + ev('5*p') + ' = ' + ev('60-5*p') + '$ minutes.{{if:q>0| Puis de $' + ev('mod(h,12)+1')
     + '~\\text{h}$ à ' + dit(ev('mod(h,12)+1'), ev('5*q')) + ' : $' + ev('5*q')
     + '$ minutes.|}}',
     '{{if:q>0|$' + ev('60-5*p') + ' + ' + ev('5*q') + ' = ' + ev('60-5*p+5*q') + '$. |}}'
     'Cela fait $' + col(ev('60-5*p+5*q')) + '~\\text{min}$.'],
    ['q < p'])

# même chose sur le cadran de 24 h (15 h 40 → 16 h 05)
PASSE_24 = variation(
    ACT_FINI + horloges([heure('{{h}}', ev('5*p')), heure(ev('h+1'), ev('5*q'))], DEBUT_FIN,
                        cadran24=True) + '\n\nDurée : $?~\\text{min}$.', [ev('60-5*p+5*q')],
    [var('k', '1..4'), var('h', '13..22'), var('p', '1..11'), var('q', '0..10')],
    ['Début : ' + dit('{{h}}', ev('5*p')) + '. Fin : ' + dit(ev('h+1'), ev('5*q')) + '.',
     'De ' + dit('{{h}}', ev('5*p')) + ' à $' + ev('h+1') + '~\\text{h}$ : $60 - ' + ev('5*p')
     + ' = ' + ev('60-5*p') + '$ minutes.{{if:q>0| Puis de $' + ev('h+1') + '~\\text{h}$ à '
     + dit(ev('h+1'), ev('5*q')) + ' : $' + ev('5*q') + '$ minutes.|}}',
     '{{if:q>0|$' + ev('60-5*p') + ' + ' + ev('5*q') + ' = ' + ev('60-5*p+5*q') + '$. |}}'
     'Cela fait $' + col(ev('60-5*p+5*q')) + '~\\text{min}$.'],
    ['q < p'])

# heures et minutes : début, puis n × 5 minutes plus tard (1 h à 2 h 30) ; minutes ≠ 0
FIN_H = ev('floor((60*h+5*p+5*n)/60)')
FIN_M = ev('mod(60*h+5*p+5*n,60)')
H_ET_MIN = variation(
    ACT_FINI + horloges([heure('{{h}}', ev('5*p')), heure(FIN_H, FIN_M)], DEBUT_FIN)
    + '\n\nDurée : $?~\\text{h}~?~\\text{min}$.',
    [ev('floor(5*n/60)'), ev('mod(5*n,60)')],
    [var('k', '1..4'), var('h', '7..17'), var('p', '0..11'), var('n', '12..30')],
    ['Début : ' + dit('{{h}}', ev('5*p')) + '. Fin : ' + dit(FIN_H, FIN_M) + '.',
     'D\'abord les heures : de ' + dit('{{h}}', ev('5*p')) + ' à ' + dit(ev('h+floor(5*n/60)'),
                                                                            ev('5*p'))
     + ', il y a $' + ev('floor(5*n/60)') + '~\\text{h}$.',
     'Puis les minutes : de ' + dit(ev('h+floor(5*n/60)'), ev('5*p')) + ' à ' + dit(FIN_H, FIN_M)
     + ', il y a $' + ev('mod(5*n,60)') + '~\\text{min}$.',
     'Cela fait $' + col(ev('floor(5*n/60)') + '~\\text{h}~' + ev('mod(5*n,60)')
                         + '~\\text{min}') + '$.'],
    ['mod(n,12) != 0'])

SPECS_DUREE = [
    spec('BO : 8 h 30 → 8 h 50 = 20 min', 0, {'k': 1, 'h': 8, 'p': 6, 'n': 4}, '20',
         'correct'),
    spec('Erreur : 8 h 30 → 8 h 50 = 50', 0, {'k': 1, 'h': 8, 'p': 6, 'n': 4}, '50',
         'incorrect'),
    spec('Erreur : 6 → 10 sur le cadran = 4', 0, {'k': 1, 'h': 8, 'p': 6, 'n': 4}, '4',
         'incorrect'),
    spec('BO : 15 h 40 → 16 h 05 = 25 min (cadran : 3 h 40 → 4 h 05)', 1,
         {'k': 3, 'h': 3, 'p': 8, 'q': 1}, '25', 'correct'),
    spec('Erreur : 1605 − 1540 = 65', 1, {'k': 3, 'h': 3, 'p': 8, 'q': 1}, '65', 'incorrect'),
    spec('Erreur : 40 − 5 = 35', 1, {'k': 3, 'h': 3, 'p': 8, 'q': 1}, '35', 'incorrect'),
    spec('9 h 55 → 10 h = 5 min', 1, {'k': 2, 'h': 9, 'p': 11, 'q': 0}, '5', 'correct'),
    spec('BO : cadran de 24 h, 15 h 40 → 16 h 05 = 25 min', 2,
         {'k': 3, 'h': 15, 'p': 8, 'q': 1}, '25', 'correct'),
    spec('Erreur : cadran de 24 h, 65', 2, {'k': 3, 'h': 15, 'p': 8, 'q': 1}, '65',
         'incorrect'),
    spec('9 h 15 → 10 h 30 = 1 h 15 min', 3, {'k': 1, 'h': 9, 'p': 3, 'n': 15},
         ['1', '15'], 'correct'),
    spec('Erreur : 9 h 15 → 10 h 30 = 1 h 30 min (minutes de la fin)', 3,
         {'k': 1, 'h': 9, 'p': 3, 'n': 15}, ['1', '30'], 'incorrect'),
    spec('Erreur : 9 h 15 → 10 h 30 = 1 h 75 min', 3, {'k': 1, 'h': 9, 'p': 3, 'n': 15},
         ['1', '75'], 'incorrect'),
    spec('8 h 40 → 10 h 25 = 1 h 45 min', 3, {'k': 2, 'h': 8, 'p': 8, 'n': 21}, ['1', '45'],
         'correct'),
]

# =====================================================================================
# 06. Minutes dans une durée (CE2-059)
# =====================================================================================

# durée en heures et minutes -> minutes
H_VERS_MIN = variation(
    '{{if:k==1|Un film|{{if:k==2|Un spectacle|{{if:k==3|Un match|Un voyage}}}}}} dure '
    '$' + '{{a}}~\\text{h}~' + ev('5*t') + '~\\text{min}$. Combien cela fait-il de minutes ?'
    '\n\nCela fait $?~\\text{min}$.', [ev('60*a+5*t')],
    [var('k', '1..4'), var('a', '1..4'), var('t', '1..11')],
    ['$1~\\text{h} = 60~\\text{min}$, donc ${{a}}~\\text{h} = ' + ev('60*a') + '~\\text{min}$.',
     '$' + ev('60*a') + ' + ' + ev('5*t') + ' = ' + ev('60*a+5*t') + '$.',
     'Cela fait $' + col(ev('60*a+5*t')) + '~\\text{min}$.'])

# minutes -> heures et minutes
MIN_VERS_H = variation(
    '{{if:k==1|Un film|{{if:k==2|Un spectacle|{{if:k==3|Un match|Un voyage}}}}}} dure '
    '$' + ev('60*a+5*t') + '~\\text{min}$. Écris cette durée en heures et en minutes.'
    '\n\nCela fait $?~\\text{h}~?~\\text{min}$.', ['{{a}}', ev('5*t')],
    [var('k', '1..4'), var('a', '1..3'), var('t', '1..11')],
    ['$60~\\text{min} = 1~\\text{h}$ : on cherche combien de fois $60$ minutes tiennent dans $'
     + ev('60*a+5*t') + '$.',
     '$' + ev('60*a+5*t') + ' = ' + ev('60*a') + ' + ' + ev('5*t') + '$, et $' + ev('60*a')
     + '~\\text{min} = {{a}}~\\text{h}$.',
     'Cela fait $' + col('{{a}}~\\text{h}~' + ev('5*t') + '~\\text{min}') + '$.'])

# lue sur deux cadrans, en minutes
CADRANS_MIN = variation(
    ACT_FINI + horloges([heure('{{h}}', ev('5*p')), heure(FIN_H, FIN_M)], DEBUT_FIN)
    + '\n\nDurée : $?~\\text{min}$.', [ev('5*n')],
    [var('k', '1..4'), var('h', '7..17'), var('p', '0..11'), var('n', '12..30')],
    ['Début : ' + dit('{{h}}', ev('5*p')) + '. Fin : ' + dit(FIN_H, FIN_M) + '.',
     'D\'abord les heures : de ' + dit('{{h}}', ev('5*p')) + ' à ' + dit(ev('h+floor(5*n/60)'),
                                                                            ev('5*p'))
     + ', il y a $' + ev('floor(5*n/60)') + '~\\text{h} = ' + ev('60*floor(5*n/60)')
     + '~\\text{min}$.',
     'Puis les minutes : $' + ev('mod(5*n,60)') + '~\\text{min}$.',
     '$' + ev('60*floor(5*n/60)') + ' + ' + ev('mod(5*n,60)') + ' = ' + ev('5*n') + '$.',
     'Cela fait $' + col(ev('5*n')) + '~\\text{min}$.'])

SPECS_MINUTES = [
    spec('BO : 2 h 20 = 140 min', 0, {'k': 1, 'a': 2, 't': 4}, '140', 'correct'),
    spec('Erreur : 2 h 20 lu 220 min', 0, {'k': 1, 'a': 2, 't': 4}, '220', 'incorrect'),
    spec('Erreur : 2 h 20 lu 120 min (minutes oubliées)', 0, {'k': 1, 'a': 2, 't': 4}, '120',
         'incorrect'),
    spec('Erreur : 2 h 20 lu 80 min (1 h = 30 min)', 0, {'k': 1, 'a': 2, 't': 4}, '80',
         'incorrect'),
    spec('1 h 45 = 105 min', 0, {'k': 2, 'a': 1, 't': 9}, '105', 'correct'),
    spec('140 min = 2 h 20 min', 1, {'k': 1, 'a': 2, 't': 4}, ['2', '20'], 'correct'),
    spec('Erreur : 140 min = 1 h 40 min', 1, {'k': 1, 'a': 2, 't': 4}, ['1', '40'],
         'incorrect'),
    spec('Erreur : 140 min = 2 h 40 min', 1, {'k': 1, 'a': 2, 't': 4}, ['2', '40'],
         'incorrect'),
    spec('95 min = 1 h 35 min', 1, {'k': 3, 'a': 1, 't': 7}, ['1', '35'], 'correct'),
    spec('9 h 15 → 10 h 30 = 75 min', 2, {'k': 1, 'h': 9, 'p': 3, 'n': 15}, '75', 'correct'),
    spec('Erreur : 9 h 15 → 10 h 30 lu 115 min', 2, {'k': 1, 'h': 9, 'p': 3, 'n': 15}, '115',
         'incorrect'),
]

# =====================================================================================
# 07. Comparer deux durées lues sur des horloges (CE2-094)
# =====================================================================================

# Film : de 60·h1 + 5p, durée 5f minutes ; match : de 60·h2 + 5q (après le film), durée 5g
F0 = '(60*h1+5*p)'
F1 = '(60*h1+5*p+5*f)'
M0 = '(60*h2+5*q)'
M1 = '(60*h2+5*q+5*g)'


def h_de(t):
    return heure(ev('floor(' + t + '/60)'), ev('mod(' + t + ',60)'))


def d_de(t):
    return dit(ev('floor(' + t + '/60)'), ev('mod(' + t + ',60)'))


HORLOGES_4 = horloges([h_de(F0), h_de(F1), h_de(M0), h_de(M1)],
                      ['Début du film', 'Fin du film', 'Début du match', 'Fin du match'])
VARS_FM = [var('h1', '7..9'), var('p', '0..11'), var('f', '8..24'),
           var('h2', 'eval:floor((60*h1+5*p+5*f)/60)+1'), var('q', '0..11'), var('g', 'eval:f+s')]
ETAPES_FM = [
    'Le film : de ' + d_de(F0) + ' à ' + d_de(F1) + '. Il a duré $' + ev('5*f')
    + '~\\text{min}$ ({{f}} intervalles de $5$ minutes).',
    'Le match : de ' + d_de(M0) + ' à ' + d_de(M1) + '. Il a duré $' + ev('5*g')
    + '~\\text{min}$ ({{g}} intervalles de $5$ minutes).']

FILM_OU_MATCH = variation(
    'Tom a regardé un film, puis un match.' + HORLOGES_4
    + '\n\nLequel a duré le plus longtemps ?'
    + choix(['Le film', 'Le match', 'Ils ont duré autant.'], melanger=False), ['{{r}}'],
    [var('s', '-4..4')] + VARS_FM[:5] + [VARS_FM[5], var('r', '{{if:s<0|0|{{if:s>0|1|2}}}}')],
    ETAPES_FM + ['{{if:s<0|Le **film** a duré le plus longtemps.|{{if:s>0|Le **match** a duré le'
                 ' plus longtemps.|Ils ont duré **autant**.}}}}'])
# `g` dépend de `s` : `s` doit être tiré avant lui (ordre ci-dessus)

ECART = variation(
    'Tom a regardé un film, puis un match.' + HORLOGES_4
    + '\n\nCombien de minutes le film a-t-il duré de plus que le match ?'
    '\n\nLe film a duré $?~\\text{min}$ de plus.', [ev('5*s')],
    [var('s', '1..4')] + VARS_FM[:5] + [var('g', 'eval:f-s')],
    ETAPES_FM + ['$' + ev('5*f') + ' - ' + ev('5*g') + ' = ' + ev('5*s') + '$.',
                 'Le film a duré $' + col(ev('5*s')) + '~\\text{min}$ de plus.'])


def fm(f, g, h1=8, p=0, q=0):
    s = g - f
    h2 = (60 * h1 + 5 * p + 5 * f) // 60 + 1
    return {'s': s, 'h1': h1, 'p': p, 'f': f, 'h2': h2, 'q': q, 'g': g,
            'r': 0 if s < 0 else (1 if s > 0 else 2)}


def fm_ecart(f, s, h1=8, p=0, q=0):
    h2 = (60 * h1 + 5 * p + 5 * f) // 60 + 1
    return {'s': s, 'h1': h1, 'p': p, 'f': f, 'h2': h2, 'q': q, 'g': f - s}


SPECS_COMPARER = [
    spec('Film 1 h, match 40 min : le film', 0, fm(12, 8), '0', 'correct'),
    spec('Erreur : le match (il finit plus tard)', 0, fm(12, 8), '1', 'incorrect'),
    spec('Match plus long : le match', 0, fm(8, 12, p=3, q=2), '1', 'correct'),
    spec('Erreur : match plus long, le film', 0, fm(8, 12, p=3, q=2), '0', 'incorrect'),
    spec('Même durée : autant', 0, fm(10, 10, p=5, q=7), '2', 'correct'),
    spec('Erreur : même durée, le film', 0, fm(10, 10, p=5, q=7), '0', 'incorrect'),
    spec('Écart : 60 min contre 40 min = 20', 1, fm_ecart(12, 4), '20', 'correct'),
    spec('Erreur : écart donné en intervalles (4)', 1, fm_ecart(12, 4), '4', 'incorrect'),
    spec('Erreur : écart = durée du film (60)', 1, fm_ecart(12, 4), '60', 'incorrect'),
    spec('Écart : 90 min contre 85 min = 5', 1, fm_ecart(18, 1, p=3, q=1), '5', 'correct'),
]

# =====================================================================================
# 08 et 09. Droite graduée (CE2-010)
# =====================================================================================

# pas p : 1, 10, 100, 1 000 ; une portion de dix intervalles ; lo = début de la portion.
# Le point A est k intervalles après lo (k = 1..9).


def droite(lo, hi, pas, major=5, labels=None, extra=''):
    lab = 'labels: ' + (labels or (lo + ', ' + hi)) + '\n'
    return ('```line\nstart: ' + lo + '\nend: ' + hi + '\nstep: ' + pas + '\nmajor: ' + str(major)
            + '\n' + lab + extra + '```')


def lire(lo, hi, pas, vars_, etape_pas, consigne='Quel nombre repère le point $A$ ?'):
    return variation(
        consigne + '\n\n' + droite(lo, hi, pas, extra='points: A={{x}}\n') + '\n\n$$A : ?$$',
        ['{{x}}'], vars_,
        ['**Ce que vaut un petit intervalle.** De ${{lo}}$ à ${{hi}}$, il y a $10$ intervalles'
         ' égaux : ' + etape_pas,
         '$A$ est ${{k}}$ intervalle{{if:k>1|s|}} après ${{lo}}$ : ${{lo}} + {{k}} \\times {{p}}'
         ' = ' + col('{{x}}') + '$.'])


def v_droite(plage_lo, p, extra=None):
    """Variables d'une portion de dix intervalles de pas p."""
    return [var('p', str(p)), var('a', plage_lo), var('k', '1..9'),
            var('lo', 'eval:' + str(10 * p) + '*a'), var('hi', 'eval:lo+' + str(10 * p)),
            var('x', 'eval:lo+k*p')]


PAS_TXT = {1: 'chaque intervalle vaut $1$ (on avance de $1$ en $1$).',
           10: 'chaque intervalle vaut $10$ (on avance de $10$ en $10$).',
           100: 'chaque intervalle vaut $100$ (on avance de $100$ en $100$).',
           1000: 'chaque intervalle vaut $1\\,000$ (on avance de $1\\,000$ en $1\\,000$).'}

LIRE_1 = lire('{{lo}}', '{{hi}}', '1', v_droite('0..99', 1), PAS_TXT[1])
LIRE_10 = lire('{{lo}}', '{{hi}}', '10', v_droite('0..99', 10), PAS_TXT[10])
LIRE_100 = lire('{{lo}}', '{{hi}}', '100', v_droite('0..8', 100), PAS_TXT[100])
LIRE_1000 = lire('0', '10000', '1000',
                 [var('p', '1000'), var('k', '1..9'), var('lo', '0'), var('hi', '10000'),
                  var('x', 'eval:k*p')], PAS_TXT[1000])
# portion qui ne commence pas à un multiple rond : lo = p × (10a + b), b = 1..9
LIRE_PORTION = lire('{{lo}}', '{{hi}}', '{{p}}',
                    [var('p', '10|100'), var('a', '0..9'), var('b', '1..9'), var('k', '1..9'),
                     var('lo', 'eval:p*(10*a+b)'), var('hi', 'eval:lo+10*p'),
                     var('x', 'eval:lo+k*p')],
                    '$' + '{{hi}} - {{lo}} = {{eval:hi-lo}}$ ; en $10$ intervalles, chacun vaut ${{p}}$.')

# placer : un ou plusieurs points


def placer_un(lo, hi, pas, vars_, etape_pas):
    return variation(
        'Place le nombre ${{x}}$ sur la demi-droite graduée.\n\n' + droite(
            lo, hi, pas, extra='placer: {{x}}\n'), [], vars_,
        ['**Ce que vaut un petit intervalle.** De ${{lo}}$ à ${{hi}}$, il y a $10$ intervalles'
         ' égaux : ' + etape_pas,
         '${{x}} = {{lo}} + {{k}} \\times {{p}}$ : on se place à ${{k}}$ intervalle{{if:k>1|s|}}'
         ' après ${{lo}}$.'])


def placer_plusieurs(lo, hi, pas, vars_, etape_pas):
    return variation(
        'Place $A$ sur ${{x}}$ et $B$ sur ${{y}}$ sur la demi-droite graduée.\n\n' + droite(
            lo, hi, pas, extra='placer: A={{x}} ; B={{y}}\n'), [], vars_,
        ['**Ce que vaut un petit intervalle.** De ${{lo}}$ à ${{hi}}$, il y a $10$ intervalles'
         ' égaux : ' + etape_pas,
         '$A$ : ${{x}} = {{lo}} + {{k}} \\times {{p}}$, à ${{k}}$ intervalle{{if:k>1|s|}} après'
         ' ${{lo}}$.',
         '$B$ : ${{y}} = {{lo}} + {{l}} \\times {{p}}$, à ${{l}}$ intervalle{{if:l>1|s|}} après'
         ' ${{lo}}$.'], ['k != l'])


def v_plusieurs(p, plage):
    return [var('p', str(p)), var('a', plage), var('k', '1..9'), var('l', '1..9'),
            var('lo', 'eval:' + str(10 * p) + '*a'), var('hi', 'eval:lo+' + str(10 * p)),
            var('x', 'eval:lo+k*p'), var('y', 'eval:lo+l*p')]


PLACER_1 = placer_un('{{lo}}', '{{hi}}', '{{p}}',
                     [var('p', '1|10|100'), var('a', '0..9'), var('k', '1..9'),
                      var('lo', 'eval:10*p*a'), var('hi', 'eval:lo+10*p'),
                      var('x', 'eval:lo+k*p')],
                     'chaque intervalle vaut ${{p}}$.')
PLACER_1000 = placer_un('0', '10000', '1000',
                        [var('p', '1000'), var('k', '1..9'), var('lo', '0'), var('hi', '10000'),
                         var('x', 'eval:k*p')], PAS_TXT[1000])
PLACER_2 = placer_plusieurs('{{lo}}', '{{hi}}', '{{p}}',
                            [var('p', '10|100'), var('a', '0..9'), var('k', '1..9'),
                             var('l', '1..9'), var('lo', 'eval:10*p*a'),
                             var('hi', 'eval:lo+10*p'), var('x', 'eval:lo+k*p'),
                             var('y', 'eval:lo+l*p')],
                            'chaque intervalle vaut ${{p}}$.')
PLACER_PORTION = placer_un('{{lo}}', '{{hi}}', '{{p}}',
                           [var('p', '10|100'), var('a', '0..9'), var('b', '1..9'),
                            var('k', '1..9'), var('lo', 'eval:p*(10*a+b)'),
                            var('hi', 'eval:lo+10*p'), var('x', 'eval:lo+k*p')],
                           'chaque intervalle vaut ${{p}}$.')


def vd(p, a, k):
    lo = 10 * p * a
    return {'p': p, 'a': a, 'k': k, 'lo': lo, 'hi': lo + 10 * p, 'x': lo + k * p}


SPECS_LIRE_DROITE = [
    spec('De 1 en 1 : 230 + 4 = 234', 0, vd(1, 23, 4), '234', 'correct'),
    spec('Erreur : pas de 1 lu comme un pas de 10 (270)', 0, vd(1, 23, 4), '270', 'incorrect'),
    spec('De 10 en 10 : 2 300 + 40 = 2 340', 1, vd(10, 23, 4), '2340', 'correct'),
    spec('Erreur : pas de 10 lu comme un pas de 1 (2 304)', 1, vd(10, 23, 4), '2304',
         'incorrect'),
    spec('De 100 en 100 : 3 000 + 700 = 3 700', 2, vd(100, 3, 7), '3700', 'correct'),
    spec('Erreur : pas de 100 lu comme un pas de 10 (3 070)', 2, vd(100, 3, 7), '3070',
         'incorrect'),
    spec('De 1 000 en 1 000 : 6 000', 3, {'p': 1000, 'k': 6, 'lo': 0, 'hi': 10000, 'x': 6000},
         '6000', 'correct'),
    spec('Erreur : 6 000 lu 600', 3, {'p': 1000, 'k': 6, 'lo': 0, 'hi': 10000, 'x': 6000},
         '600', 'incorrect'),
    spec('Portion : de 2 350 à 2 450, A à 2 380', 4,
         {'p': 10, 'a': 23, 'b': 5, 'k': 3, 'lo': 2350, 'hi': 2450, 'x': 2380}, '2380',
         'correct'),
    spec('Erreur : portion, A lu 2 303 (départ oublié)', 4,
         {'p': 10, 'a': 23, 'b': 5, 'k': 3, 'lo': 2350, 'hi': 2450, 'x': 2380}, '2303',
         'incorrect'),
]

SPECS_PLACER_DROITE = [
    spec('Placer 340 sur la droite de 300 à 400', 0,
         {'p': 10, 'a': 30, 'k': 4, 'lo': 300, 'hi': 400, 'x': 340}, '340', 'correct'),
    spec('Erreur : 340 placé sur 330', 0,
         {'p': 10, 'a': 30, 'k': 4, 'lo': 300, 'hi': 400, 'x': 340}, '330', 'incorrect'),
    spec('Rien placé : case vide', 0,
         {'p': 10, 'a': 30, 'k': 4, 'lo': 300, 'hi': 400, 'x': 340}, '', 'empty'),
    spec('Placer 3 000 de 1 000 en 1 000', 1, {'p': 1000, 'k': 3, 'lo': 0, 'hi': 10000, 'x': 3000},
         '3000', 'correct'),
    spec('Deux points : A sur 120 et B sur 150', 2,
         {'p': 10, 'a': 10, 'k': 2, 'l': 5, 'lo': 100, 'hi': 200, 'x': 120, 'y': 150},
         ['120', '150'], 'correct'),
    spec('Erreur : A et B échangés', 2,
         {'p': 10, 'a': 10, 'k': 2, 'l': 5, 'lo': 100, 'hi': 200, 'x': 120, 'y': 150},
         ['150', '120'], 'incorrect'),
    spec('Portion : 2 380 sur la droite de 2 350 à 2 450', 3,
         {'p': 10, 'a': 23, 'b': 5, 'k': 3, 'lo': 2350, 'hi': 2450, 'x': 2380}, '2380',
         'correct'),
    spec('Erreur : portion, 2 380 placé à la 3e graduation depuis 2 300', 3,
         {'p': 10, 'a': 23, 'b': 5, 'k': 3, 'lo': 2350, 'hi': 2450, 'x': 2380}, '2330',
         'incorrect'),
]

# =====================================================================================

MODELES = {
    '01-lire-l-heure-minutes': modele(
        'Quelle heure est-il ? (heures et minutes)',
        'Lire l\'heure à la minute près sur une horloge à aiguilles (8 h 35, 6 h 18) ; l\'après-midi,'
        ' 15 h 22', 'Grandeurs', 'Durées', 'Lire l\'heure', 5,
        [LIRE_5, LIRE_MIN, LIRE_APRES_MIDI], SPECS_LIRE_MIN),
    '02-lire-l-heure-en-mots': modele(
        'Dire l\'heure et l\'écrire en chiffres',
        'Sept heures moins le quart = 6 h 45 ; huit heures et demie ; midi moins dix ; cadran de'
        ' 24 h : quinze heures quarante-deux', 'Grandeurs', 'Durées', 'Lire l\'heure', 6,
        [MOTS_MOINS_V, MOTS_PLUS_V, CADRAN_24, MIDI], SPECS_MOTS),
    '03-place-les-aiguilles-minutes': modele(
        'Place les aiguilles (heures et minutes)',
        'Poser les aiguilles : 8 h 35, 6 h 18 ; cinq heures et quart, quatre heures moins vingt ;'
        ' treize heures vingt', 'Grandeurs', 'Durées', 'Lire l\'heure', 7,
        [PLACER_5, PLACER_MIN, PLACER_MOTS, PLACER_24], SPECS_PLACER),
    '04-quelle-horloge-indique': modele(
        'Quelle horloge indique… ? (heures et minutes)',
        'Reconnaître l\'horloge qui montre 8 h 35, 13 h 20, « sept heures moins le quart » ; leurres :'
        ' aiguilles inversées, heure d\'après, minutes symétriques', 'Grandeurs', 'Durées',
        'Lire l\'heure', 8, [HORLOGE_5, HORLOGE_24, HORLOGE_MOTS], SPECS_HORLOGE, delay=90),
    '05-duree-entre-deux-horloges': modele(
        'Combien de temps a-t-il duré ? (deux horloges)',
        'Durée entre deux horloges : 8 h 30 → 8 h 50 ; 15 h 40 → 16 h 05 ; 9 h 15 → 10 h 30',
        'Grandeurs', 'Durées', 'Durée écoulée', 5, [MEME_HEURE, PASSE, PASSE_24, H_ET_MIN],
        SPECS_DUREE),
    '06-minutes-dans-une-duree': modele(
        'Convertir une durée en minutes',
        'Minutes dans 2 h 20 ; 140 minutes en heures et minutes ; durée lue sur deux horloges,'
        ' en minutes', 'Grandeurs', 'Durées', 'Durée écoulée', 6,
        [H_VERS_MIN, MIN_VERS_H, CADRANS_MIN], SPECS_MINUTES),
    '07-comparer-deux-durees': modele(
        'Quelle durée est la plus longue ? (deux horloges)',
        'Le film ou le match, lu sur quatre horloges ; de combien de minutes l\'un dure-t-il plus'
        ' longtemps que l\'autre', 'Grandeurs', 'Durées', 'Durée écoulée', 7,
        [FILM_OU_MATCH, ECART], SPECS_COMPARER),
    '08-lire-sur-la-droite-graduee': modele(
        'Repérer un point sur une droite graduée (de 1 en 1 à 1 000 en 1 000)',
        'Lire le nombre qui repère un point d\'une portion de demi-droite graduée : de 1 en 1, de 10'
        ' en 10, de 100 en 100, de 1 000 en 1 000', 'Nombres', 'Entiers', 'Repérage', 2,
        [LIRE_1, LIRE_10, LIRE_100, LIRE_1000, LIRE_PORTION], SPECS_LIRE_DROITE),
    '09-place-sur-la-droite-graduee': modele(
        'Placer des nombres sur une droite graduée (de 1 en 1 à 1 000 en 1 000)',
        'Placer un nombre ou deux sur une portion de demi-droite graduée : de 1 en 1, de 10 en 10,'
        ' de 100 en 100, de 1 000 en 1 000', 'Nombres', 'Entiers', 'Repérage', 3,
        [PLACER_1, PLACER_1000, PLACER_2, PLACER_PORTION], SPECS_PLACER_DROITE),
}

for nom, m in MODELES.items():
    with open(f'{DOSSIER}/{nom}.json', 'w') as f:
        json.dump(m, f, ensure_ascii=False, indent='\t')
        f.write('\n')
print(len(MODELES), 'modèles écrits')
