"""Écrit les 5 modèles du lot 8a du CM1 (heures et durées) dans scripts/questions/cm1-8a/.

Phase 0 validée par David le 2026-11-17 (§ 21 du journal `docs/archive/wip/questions-cm1-progress.md`,
« je te suis ») : 5 modèles (CM1-092, 093, 094, 166, 095) ; cadran nu (`chiffres: quarts` puis
`aucun`) pour lire et placer ; une variation « jours et heures » (095) ; 166 en case « choix » à trois
issues ; niveaux : celui qui suit le modèle CE2 de même geste dans le nœud, partagé, sans renuméroter.

Bornes (`cycle3.json`) : heures et minutes, pas de secondes ; 094 « de 8 h 52 min à 11 h 37 min » ;
095 une ou deux étapes, instants intermédiaires, pas de calcul posé en base soixante, unités jour,
heure, minute.

Patrons : `lot-ce2-7b.py` (horloges : lire, placer, durée, comparer), `lot-ce2-6b.py` (problèmes).

Pièges (relus dans le journal) : `i` et `e` jamais comme variables ; une plage négative ne se tire
pas (signe tiré à part) ; une minute à 0 s'écrit `9 h` dans `heure:` (helper `heure`) et `9 h 0`
dans `placer:` ; la case choix répond par l'indice d'origine ; `{{if:}}` ne résout pas un
`{{eval:}}` dans sa condition (helper `brut`, ou une variable calculée).

    python3 docs/wip/questions/lot-cm1-8a.py scripts/questions/cm1-8a
"""
import json
import math
import os
import sys

DOSSIER = sys.argv[1]
MODELES = {}

# ---- Gabarits ----


def var(nom, expression):
    return {'name': nom, 'expression': expression}


def variation(enonce, variables, reponses, etapes, conditions=None):
    v = {'statement': enonce, 'variables': variables}
    if conditions:
        v['conditions'] = conditions
    v['blanks'] = [r if isinstance(r, dict) else {'expectedAnswer': r} for r in reponses]
    v['correction'] = {'steps': etapes}
    return v


# Les minutes s'écrivent sur deux chiffres (8 h 04) : « 04 » tapé dans une case est juste, pas
# une « forme non optimale » (règle de superflu `zeros` coupée, comme `ce1-4/02`).
OPTIONS = {'constraints': {'zeros': 'off'}}


def modele(title, description, niveau, variations, specs, delay=120):
    return {'title': title, 'description': description, 'grades': ['CM1'], 'level': niveau,
            'delay': delay, 'status': 'draft', 'options': OPTIONS, 'variations': variations,
            'testSpecs': specs}


def ecrire(nom, mod):
    MODELES[nom] = mod


FONCTIONS = {'__builtins__': {}, 'floor': math.floor, 'mod': lambda a, b: a % b, 'abs': abs,
             'max': max, 'min': min}


def calcule(variables, tirage):
    """Valeurs de toutes les variables, à partir des tirages donnés (les `eval:` sont évaluées
    comme le générateur le fait ; une variable écrite en `{{if:…}}` est donnée dans le tirage)."""
    valeurs = {}
    for v in variables:
        nom, expr = v['name'], v['expression']
        if expr.startswith('eval:') and nom not in tirage:
            x = eval(expr[5:], FONCTIONS, dict(valeurs))
            assert abs(x - round(x)) < 1e-9, (nom, x)
            valeurs[nom] = int(round(x))
        else:
            assert nom in tirage, ('tirage manquant', nom)
            valeurs[nom] = tirage[nom]
    return valeurs


def spec(desc, vi, vs, tirage, answers, status):
    valeurs = calcule(vs[vi]['variables'], tirage)
    return {'description': desc, 'variationIndex': vi,
            'variables': {k: str(x) for k, x in valeurs.items()},
            'answers': answers if isinstance(answers, list) else [answers],
            'expected': {'status': status}}


def ev(x):
    return '{{eval:' + x + '}}'


def col(x, k=0):
    return '\\textcolor{{{color:primary.' + str(k) + '}}}{' + x + '}'


def brut(m):
    """`{{eval:5*q}}` → `5*q`, `{{a}}` → `a` : la condition d'un `{{if:}}` veut l'expression nue."""
    if m.startswith('{{eval:'):
        return m[7:-2]
    if m.startswith('{{') and m.endswith('}}'):
        return m[2:-2]
    return m


def heure(h, m):
    """Heure pour ```horloge `heure:` : `9 h 15`, `9 h` si les minutes valent 0."""
    return '{{if:' + brut(m) + '==0|' + h + ' h|' + h + ' h ' + m + '}}'


def mm(m):
    """Minutes d'une heure écrite sur deux chiffres : 04, 15 (comme le modèle 6e `6-grandeurs/12`)."""
    return '{{if:' + brut(m) + '<10|0' + m + '|' + m + '}}'


def dit(h, m):
    """L'heure écrite pour l'élève, en formule : $9~\\text{h}~05$, $9~\\text{h}$."""
    return '{{if:' + brut(m) + '==0|$' + h + '~\\text{h}$|$' + h + '~\\text{h}~' + mm(m) + '$}}'


def duree(h, m):
    """Une durée écrite : $2~\\text{h}~45~\\text{min}$ (sans « 0 h » ni « 0 min »)."""
    return ('{{if:' + brut(h) + '==0|$' + m + '~\\text{min}$|{{if:' + brut(m) + '==0|$' + h
            + '~\\text{h}$|$' + h + '~\\text{h}~' + m + '~\\text{min}$}}}}')


def horloges(heures, chiffres='tous', legendes=None, cadran24=False, graduations='minutes'):
    bloc = ('\n\n```horloge\nheure: ' + ' ; '.join(heures) + '\nchiffres: ' + chiffres
            + '\ngraduations: ' + graduations + '\n')
    if cadran24:
        bloc += 'cadran: 24\n'
    if legendes:
        bloc += 'légendes: ' + ' ; '.join(legendes) + '\n'
    return bloc + '```'


def choix(lignes, melanger=True):
    tete = '' if melanger else 'melanger: non\n'
    return '\n\n```choix\n' + tete + ''.join('- ' + c + '\n' for c in lignes) + '```'


def selon(k, textes, n=1):
    """`{{if:k==1|…|{{if:k==2|…|…}}}}` : le texte numéro `n` pour k == n, etc."""
    if len(textes) == 1:
        return textes[0]
    return ('{{if:' + k + '==' + str(n) + '|' + textes[0] + '|' + selon(k, textes[1:], n + 1)
            + '}}')


def crans(h, m):
    """Réponse d'aiguilles bien posées : cran de la petite (vraie place), cran de la grande."""
    return f'{math.floor((h % 12) * 5 + m / 12 + 0.5) % 60} {m}'


# Repères d'un cadran nu : 12, 3, 6, 9 écrits (`quarts`) ou aucun chiffre
REPERE = '{{if:q==0|$12$|${{q}}$}}'

# =====================================================================================
# 01. Lire l'heure sur un cadran nu (CM1-092)
# =====================================================================================

Q_PRESQUE = ('{{if:m>=45| (elle est presque sur le repère du $' + ev('mod(h,12)+1')
             + '$, mais cette heure n\'est pas encore passée)|}}')
PETITE_NU = ('La petite aiguille montre les heures : elle a passé le repère du ${{h}}$ sans'
             ' atteindre le suivant' + Q_PRESQUE + '. On compte les grands repères depuis le $12$'
             ' : l\'heure est ${{h}}$.')
GRANDE_NU = ('La grande aiguille montre les minutes. On compte les grands repères de $5$ en $5$'
             ' depuis le $12$ : elle a passé le repère du ' + REPERE + ', soit $' + ev('5*q')
             + '$ minutes{{if:r>0|, puis elle avance de ${{r}}$ petite{{if:r>1|s|}} graduation'
             '{{if:r>1|s|}} : $' + ev('5*q') + ' + {{r}} = {{m}}$|}}.')
VARS_LIRE = [var('h', '1..12'), var('q', '0..11'), var('r', '1..4'), var('m', 'eval:5*q+r')]


def lire_nu(chiffres, aide):
    return variation(
        'Quelle heure est-il ?' + horloges(['{{h}} h {{m}}'], chiffres)
        + '\n\nIl est $?~\\text{h}~?$.',
        VARS_LIRE, ['{{h}}', '{{m}}'],
        [aide, PETITE_NU, GRANDE_NU, 'Il est $' + col('{{h}}~\\text{h}~' + mm('{{m}}')) + '$.'])


AIDE_QUARTS = 'Seuls le $12$, le $3$, le $6$ et le $9$ sont écrits : les autres repères se retrouvent entre eux.'
AIDE_AUCUN = ('Aucun chiffre n\'est écrit : le $12$ est en haut, le $3$ à droite, le $6$ en bas,'
              ' le $9$ à gauche.')

LIRE_APRES_MIDI = variation(
    'C\'est l\'après-midi. Quelle heure est-il ?' + horloges([heure('{{h}}', '{{m}}')], 'quarts')
    + '\n\nIl est $?~\\text{h}~?$.',
    [var('h', '1..11'), var('q', '0..11'), var('r', '0..4'), var('m', 'eval:5*q+r')],
    [{'expectedAnswer': ev('h+12'),
      'validationRules': [{'type': 'custom', 'expression': 'answer != {{h}}',
                           'description': 'L\'après-midi, on compte après midi : {{h}} heures de'
                           ' l\'après-midi, c\'est ' + ev('h+12') + ' h.'}]}, '{{m}}'],
    [AIDE_QUARTS, PETITE_NU, GRANDE_NU,
     'Le cadran montre ' + dit('{{h}}', '{{m}}') + '. L\'après-midi, on ajoute $12$ aux heures : ${{h}}'
     ' + 12 = ' + ev('h+12') + '$.',
     'Il est $' + col(ev('h+12') + '~\\text{h}~' + mm('{{m}}')) + '$.'])

vs = [lire_nu('quarts', AIDE_QUARTS), lire_nu('aucun', AIDE_AUCUN), LIRE_APRES_MIDI]
L = {'h': 8, 'q': 7, 'r': 2}          # 8 h 37
L55 = {'h': 8, 'q': 11, 'r': 3}       # 8 h 58
ecrire('01-quelle-heure-est-il-cadran-nu', modele(
    'Quelle heure est-il ? (cadran nu)',
    'Lire l\'heure à la minute près sur un cadran où seuls 12, 3, 6, 9 sont écrits, puis sans'
    ' chiffre ; l\'après-midi (15 h 22)',
    6, vs,
    [spec('8 h 37, chiffres 12-3-6-9', 0, vs, L, ['8', '37'], 'correct'),
     spec('Erreur : 8 h 37 lu 8 h 7 (repère compté pour 1)', 0, vs, L, ['8', '7'], 'incorrect'),
     spec('Erreur : 8 h 37 lu 8 h 35 (petites graduations oubliées)', 0, vs, L, ['8', '35'],
          'incorrect'),
     spec('Erreur : aiguilles inversées, lu 7 h 40', 0, vs, L, ['7', '40'], 'incorrect'),
     spec('8 h 58, petite presque sur le 9', 0, vs, L55, ['8', '58'], 'correct'),
     spec('Erreur : 8 h 58 lu 9 h 58', 0, vs, L55, ['9', '58'], 'incorrect'),
     spec('BO : 9 h 25… sans chiffre, 9 h 26', 1, vs, {'h': 9, 'q': 5, 'r': 1}, ['9', '26'],
          'correct'),
     spec('Erreur : sans chiffre, 9 h 26 lu 9 h 5', 1, vs, {'h': 9, 'q': 5, 'r': 1},
          ['9', '5'], 'incorrect'),
     spec('2 h 04 : passé le 12 de 4 graduations', 1, vs, {'h': 2, 'q': 0, 'r': 4},
          ['2', '4'], 'correct'),
     spec('BO : 15 h 22 l\'après-midi', 2, vs, {'h': 3, 'q': 4, 'r': 2}, ['15', '22'],
          'correct'),
     spec('Erreur : 3 h 22 l\'après-midi', 2, vs, {'h': 3, 'q': 4, 'r': 2}, ['3', '22'],
          'incorrect'),
     spec('Après-midi, minute 0 : 14 h', 2, vs, {'h': 2, 'q': 0, 'r': 0}, ['14', '0'],
          'correct')]))

# =====================================================================================
# 02. Placer les aiguilles sur un cadran nu (CM1-093)
# =====================================================================================

PETITE_GRANDE = 'La grande aiguille montre les minutes, la petite montre l\'heure.'
GRANDE_PLACER = ('La grande aiguille : {{m}} minute{{if:m>1|s|}}. On compte les grands repères de'
                 ' $5$ en $5$ depuis le $12$ : {{if:r>0|elle passe le repère du ' + REPERE
                 + ' ($' + ev('5*q') + '$ minutes) et avance de ${{r}}$ petite{{if:r>1|s|}}'
                 ' graduation{{if:r>1|s|}}.|elle va sur le repère du ' + REPERE + '.}}')


def petite_sur(h):
    return ('{{if:m==0|La petite aiguille va pile sur le repère du $' + h + '$.|La petite'
            ' aiguille va entre le repère du $' + h + '$ et celui du $' + ev('mod(' + brut(h)
                                                                             + ',12)+1')
            + '$ : cette heure-là n\'est pas encore passée.}}')


def placer_nu(chiffres, aide, rmin):
    return variation(
        'Place les aiguilles : il est ' + dit('{{h}}', '{{m}}') + '.\n\n```horloge\nplacer: {{h}} h'
        ' {{m}}\nchiffres: ' + chiffres + '\ngraduations: minutes\n```',
        [var('h', '1..12'), var('q', '0..11'), var('r', rmin + '..4'), var('m', 'eval:5*q+r')],
        [], [aide, PETITE_GRANDE, GRANDE_PLACER, petite_sur('{{h}}')])


PLACER_24 = variation(
    'Place les aiguilles : il est ' + dit('{{hh}}', '{{m}}') + '.\n\n```horloge\nplacer: {{hh}} h'
    ' {{m}}\nchiffres: quarts\ngraduations: minutes\n```',
    [var('h', '1..11'), var('hh', 'eval:h+12'), var('q', '0..11'), var('r', '0..4'),
     var('m', 'eval:5*q+r')],
    [],
    ['Sur le cadran, on retrouve l\'heure en enlevant $12$ : ${{hh}} - 12 = {{h}}$.',
     PETITE_GRANDE, GRANDE_PLACER, petite_sur('{{h}}')])

vs = [placer_nu('quarts', AIDE_QUARTS, '1'), PLACER_24, placer_nu('aucun', AIDE_AUCUN, '0')]


def petite_cran(h, m):
    return crans(h, m).split()[0]


ecrire('02-place-les-aiguilles-cadran-nu', modele(
    'Place les aiguilles (cadran nu)',
    'Poser les aiguilles à la minute près (9 h 25 min) sur un cadran où seuls 12, 3, 6, 9 sont'
    ' écrits, puis sans chiffre ; une heure de l\'après-midi (15 h 37)',
    8, vs,
    [spec('BO : 9 h 26', 0, vs, {'h': 9, 'q': 5, 'r': 1}, crans(9, 26), 'correct'),
     spec('Erreur : 9 h 26, aiguilles inversées', 0, vs, {'h': 9, 'q': 5, 'r': 1}, '26 45',
          'incorrect'),
     spec('Erreur : 9 h 26, grande sur le 5 (25)', 0, vs, {'h': 9, 'q': 5, 'r': 1},
          f'{petite_cran(9, 26)} 25', 'incorrect'),
     spec('Erreur : 9 h 26, petite sur le 10', 0, vs, {'h': 9, 'q': 5, 'r': 1}, '50 26',
          'incorrect'),
     spec('Rien placé : case vide', 0, vs, {'h': 9, 'q': 5, 'r': 1}, '', 'empty'),
     spec('15 h 37', 1, vs, {'h': 3, 'q': 7, 'r': 2}, crans(3, 37), 'correct'),
     spec('Erreur : 15 h 37, petite pile sur le 3', 1, vs,
          {'h': 3, 'q': 7, 'r': 2}, '15 37', 'incorrect'),
     spec('Erreur : 15 h 37, grande sur 15', 1, vs, {'h': 3, 'q': 7, 'r': 2},
          f'{petite_cran(3, 37)} 15', 'incorrect'),
     spec('Sans chiffre, 7 h juste', 2, vs, {'h': 7, 'q': 0, 'r': 0}, crans(7, 0), 'correct'),
     spec('Sans chiffre, 4 h 48', 2, vs, {'h': 4, 'q': 9, 'r': 3}, crans(4, 48), 'correct'),
     spec('Erreur : 4 h 48 placé 5 h 48', 2, vs, {'h': 4, 'q': 9, 'r': 3}, crans(5, 48),
          'incorrect')]))

# =====================================================================================
# 03. Durée entre deux horloges, à la minute (CM1-094)
# =====================================================================================
# Début h h a, fin t1 (en minutes depuis 0 h) ; hf, mf : la fin ; m1 = 60 − a ; hp : heures
# pleines entre (h + 1) h et hf h ; s = m1 + mf ; la durée vaut hp h + s min (s peut dépasser 60).

DEBUT_FIN = ['Début', 'Fin']
ACTIVITE = ('{{if:k==1|La sortie au musée|{{if:k==2|La séance de cinéma|{{if:k==3|Le match'
            '|La randonnée}}}}}}')
ACT_FINI = (ACTIVITE + ' commence et finit aux heures montrées. Combien de temps a-t-'
            '{{if:k==3|il|elle}} duré ?')

VARS_FIN = [var('t1', 'eval:60*h+a+d'), var('hf', 'eval:floor(t1/60)'), var('mf', 'eval:mod(t1,60)'),
            var('m1', 'eval:60-a'), var('hp', 'eval:hf-h-1'), var('s', 'eval:m1+mf')]

ETAPES_AXE = [
    'On avance d\'instant en instant, sans poser de soustraction.',
    'De ' + dit('{{h}}', '{{a}}') + ' à $' + ev('h+1') + '~\\text{h}$ : $60 - {{a}} = {{m1}}$'
    ' minutes.',
    '{{if:hp>0|De $' + ev('h+1') + '~\\text{h}$ à ${{hf}}~\\text{h}$ : ${{hp}}~\\text{h}$.|}}'
    '{{if:mf>0| De ${{hf}}~\\text{h}$ à ' + dit('{{hf}}', '{{mf}}') + ' : ${{mf}}$ minutes.|}}',
    '{{if:s>=60|Les minutes : ${{m1}} + {{mf}} = {{s}}$, soit $1~\\text{h}~' + ev('s-60')
    + '~\\text{min}$. |}}En tout : $' + col('{{dh}}~\\text{h}~{{dm}}~\\text{min}') + '$.']

# V1 : moins d'une heure, à cheval sur l'heure (8 h 52 → 9 h 17)
COURTE = variation(
    ACT_FINI + horloges([heure('{{h}}', '{{a}}'), heure(ev('h+1'), '{{b}}')], 'tous', DEBUT_FIN)
    + '\n\nDurée : $?~\\text{min}$.',
    [var('k', '1..4'), var('h', '1..11'), var('a', '31..59'), var('b', '1..29'),
     var('m1', 'eval:60-a'), var('d', 'eval:60-a+b')],
    ['{{d}}'],
    ['Début : ' + dit('{{h}}', '{{a}}') + '. Fin : ' + dit(ev('h+1'), '{{b}}') + '.',
     'De ' + dit('{{h}}', '{{a}}') + ' à $' + ev('h+1') + '~\\text{h}$ : $60 - {{a}} = {{m1}}$'
     ' minutes. Puis de $' + ev('h+1') + '~\\text{h}$ à ' + dit(ev('h+1'), '{{b}}')
     + ' : ${{b}}$ minutes.',
     '${{m1}} + {{b}} = {{d}}$ : cela fait $' + col('{{d}}~\\text{min}') + '$.'])


def longue(hmin, hmax, nmax, cadran24):
    return variation(
        ACT_FINI + horloges([heure('{{h}}', '{{a}}'), heure('{{hf}}', '{{mf}}')], 'tous',
                            DEBUT_FIN, cadran24=cadran24)
        + '\n\nDurée : $?~\\text{h}~?~\\text{min}$.',
        [var('k', '1..4'), var('h', f'{hmin}..{hmax}'), var('a', '1..59'), var('n', f'1..{nmax}'),
         var('c', '1..59'), var('d', 'eval:60*n+c')] + VARS_FIN
        + [var('dh', 'eval:hp+floor(s/60)'), var('dm', 'eval:mod(s,60)')],
        ['{{n}}', '{{c}}'],
        ['Début : ' + dit('{{h}}', '{{a}}') + '. Fin : ' + dit('{{hf}}', '{{mf}}') + '.']
        + ETAPES_AXE)


vs = [COURTE, longue(7, 14, 3, False), longue(13, 19, 2, True)]
ecrire('03-duree-entre-deux-horloges-heures-et-minutes', modele(
    'Combien de temps a-t-il duré ? (heures et minutes)',
    'Durée entre deux horloges à la minute près : 8 h 52 → 9 h 17 ; 8 h 52 → 11 h 37 ;'
    ' l\'après-midi sur un cadran de 24 h',
    6, vs,
    [spec('8 h 52 → 9 h 17 = 25 min', 0, vs, {'k': 1, 'h': 8, 'a': 52, 'b': 17}, '25', 'correct'),
     spec('Erreur : 917 − 852 = 65', 0, vs, {'k': 1, 'h': 8, 'a': 52, 'b': 17}, '65',
          'incorrect'),
     spec('Erreur : 52 − 17 = 35', 0, vs, {'k': 1, 'h': 8, 'a': 52, 'b': 17}, '35', 'incorrect'),
     spec('8 h 57 → 9 h 05 = 8 min, écrit « 08 »', 0, vs, {'k': 2, 'h': 8, 'a': 57, 'b': 5}, '08',
          'correct'),
     spec('BO : 8 h 52 → 11 h 37 = 2 h 45 min', 1, vs,
          {'k': 2, 'h': 8, 'a': 52, 'n': 2, 'c': 45}, ['2', '45'], 'correct'),
     spec('Erreur : soustraction décimale, 2 h 85', 1, vs,
          {'k': 2, 'h': 8, 'a': 52, 'n': 2, 'c': 45}, ['2', '85'], 'incorrect'),
     spec('Erreur : 11 − 8 = 3 h, 52 − 37 = 15 min', 1, vs,
          {'k': 2, 'h': 8, 'a': 52, 'n': 2, 'c': 45}, ['3', '15'], 'incorrect'),
     spec('Erreur : 3 h 45 (heure entamée comptée)', 1, vs,
          {'k': 2, 'h': 8, 'a': 52, 'n': 2, 'c': 45}, ['3', '45'], 'incorrect'),
     spec('9 h 10 → 10 h 25 = 1 h 15 min (sans passer l\'heure en minutes)', 1, vs,
          {'k': 4, 'h': 9, 'a': 10, 'n': 1, 'c': 15}, ['1', '15'], 'correct'),
     spec('Cadran de 24 h : 15 h 40 → 17 h 05 = 1 h 25 min', 2, vs,
          {'k': 3, 'h': 15, 'a': 40, 'n': 1, 'c': 25}, ['1', '25'], 'correct'),
     spec('Erreur : 1705 − 1540 = 1 h 65', 2, vs, {'k': 3, 'h': 15, 'a': 40, 'n': 1, 'c': 25},
          ['1', '65'], 'incorrect')]))

# =====================================================================================
# 04. Quelle durée est la plus longue ? (CM1-166)
# =====================================================================================
# Film : de t0 = 60·h1 + p, durée f ; match : de t2 (l'heure pleine qui suit la fin du film,
# plus q), durée g = f + s. Signe tiré à part (pas de plage négative).

VARS_FM = [var('h1', '8..10'), var('p', '0..59'), var('f', '65..140'),
           var('t0', 'eval:60*h1+p'), var('t1', 'eval:t0+f'),
           var('q', '0..59'), var('t2', 'eval:60*(floor(t1/60)+1)+q'), var('g', 'eval:f+s'),
           var('t3', 'eval:t2+g')]


def h_de(t):
    return heure(ev('floor(' + t + '/60)'), ev('mod(' + t + ',60)'))


def d_de(t):
    return dit(ev('floor(' + t + '/60)'), ev('mod(' + t + ',60)'))


HORLOGES_4 = horloges([h_de('t0'), h_de('t1'), h_de('t2'), h_de('t3')], 'tous',
                      ['Début du film', 'Fin du film', 'Début du match', 'Fin du match'])
ETAPES_FM = [
    'Le film : de ' + d_de('t0') + ' à ' + d_de('t1') + '. Il a duré '
    + duree(ev('floor(f/60)'), ev('mod(f,60)')) + ' ($' + ev('f') + '$ minutes).',
    'Le match : de ' + d_de('t2') + ' à ' + d_de('t3') + '. Il a duré '
    + duree(ev('floor(g/60)'), ev('mod(g,60)')) + ' ($' + ev('g') + '$ minutes).',
    '{{if:s<0|Le **film** a duré le plus longtemps, de $' + ev('-s') + '$ minute{{if:s<-1|s|}}.|'
    '{{if:s>0|Le **match** a duré le plus longtemps, de ${{s}}$ minute{{if:s>1|s|}}.|'
    'Ils ont duré **autant**.}}}}']
CHOIX_FM = choix(['Le film', 'Le match', 'Ils ont duré autant.'], melanger=False)
R_FM = var('r', '{{if:s<0|0|{{if:s>0|1|2}}}}')


def comparer(umin, umax):
    return variation(
        'Tom a regardé un film, puis un match.' + HORLOGES_4
        + '\n\nLequel a duré le plus longtemps ?' + CHOIX_FM,
        [var('u', f'{umin}..{umax}'), var('sg', '0..1'), var('s', 'eval:(2*sg-1)*u')] + VARS_FM
        + [R_FM], ['{{r}}'], ETAPES_FM)


vs = [comparer(1, 9), comparer(0, 3)]


def fm(f, s, h1=8, p=0, q=0):
    return {'u': abs(s), 'sg': 1 if s > 0 else 0, 'h1': h1, 'p': p, 'f': f, 'q': q,
            'r': 0 if s < 0 else (1 if s > 0 else 2)}


ecrire('04-quelle-duree-est-la-plus-longue-a-la-minute', modele(
    'Quelle durée est la plus longue ? (à la minute)',
    'Comparer deux durées lues sur quatre horloges, en heures et minutes, à quelques minutes près',
    8, vs,
    [spec('Film 1 h 47 (8 h 52 → 10 h 39), match 1 h 42 : le film', 0, vs,
          fm(107, -5, 8, 52, 15), '0', 'correct'),
     spec('Erreur : le match (il finit plus tard)', 0, vs, fm(107, -5, 8, 52, 15), '1',
          'incorrect'),
     spec('Match plus long de 3 min : le match', 0, vs, fm(95, 3, 9, 38, 4), '1', 'correct'),
     spec('Erreur : match plus long, le film', 0, vs, fm(95, 3, 9, 38, 4), '0', 'incorrect'),
     spec('Même durée : autant', 1, vs, fm(80, 0, 10, 47, 21), '2', 'correct'),
     spec('Erreur : même durée, le film', 1, vs, fm(80, 0, 10, 47, 21), '0', 'incorrect'),
     spec('Écart de 1 min : le film', 1, vs, fm(120, -1, 8, 5, 50), '0', 'correct')]))

# =====================================================================================
# 05. Problèmes de durées (CM1-095)
# =====================================================================================

QUI = selon('k', ['Léa', 'Karim', 'Inès', 'Hugo'])
IL = selon('k', ['elle', 'il', 'elle', 'il'])
IL_M = selon('k', ['Elle', 'Il', 'Elle', 'Il'])

# V1 : heure d'arrivée. Départ h h a, trajet n h c min (n peut valoir 0).
VARS_ARR = [var('k', '1..4'), var('h', '6..15'), var('a', '0..59'), var('n', '0..2'),
            var('c', '1..59'), var('hn', 'eval:h+n'), var('t1', 'eval:60*h+a+60*n+c'),
            var('hf', 'eval:floor(t1/60)'), var('mf', 'eval:mod(t1,60)'), var('m1', 'eval:60-a'),
            var('ac', 'eval:a+c')]

ETAPES_ARR = [
    '{{if:n>0|D\'abord les heures : ' + dit('{{h}}', '{{a}}') + ' $+ {{n}}~\\text{h}$ → '
    + dit('{{hn}}', '{{a}}') + '.|Le trajet dure moins d\'une heure.}}',
    '{{if:ac>=60|Puis les minutes, en passant par l\'heure pleine : de ' + dit('{{hn}}', '{{a}}')
    + ' à $' + ev('hn+1') + '~\\text{h}$, il y a ${{m1}}$ minutes ; il en reste ${{c}} - {{m1}} = '
    '{{mf}}$.|Puis les minutes : ${{a}} + {{c}} = {{mf}}$.}}',
    IL_M + ' arrive à $' + col('{{hf}}~\\text{h}~' + mm('{{mf}}')) + '$.']

ARRIVEE = variation(
    QUI + ' part à ' + dit('{{h}}', '{{a}}') + '. Son trajet dure ' + duree('{{n}}', '{{c}}')
    + '. À quelle heure arrive-t-' + IL + ' ?\n\n' + IL_M + ' arrive à $?~\\text{h}~?$.',
    VARS_ARR, ['{{hf}}', '{{mf}}'], ETAPES_ARR)

# V2 : heure de départ. Même tirage ; l'arrivée est donnée, on recule.
VARS_DEP = VARS_ARR + [var('hr', 'eval:hf-n')]
DEPART = variation(
    QUI + ' arrive à ' + dit('{{hf}}', '{{mf}}') + '. Son trajet a duré ' + duree('{{n}}', '{{c}}')
    + '. À quelle heure est-' + IL + ' parti{{if:k==1|e|{{if:k==3|e|}}}} ?\n\n' + IL_M
    + ' est parti{{if:k==1|e|{{if:k==3|e|}}}} à $?~\\text{h}~?$.',
    VARS_DEP, ['{{h}}', '{{a}}'],
    ['On part de l\'arrivée et on recule.',
     '{{if:n>0|D\'abord les heures : ' + dit('{{hf}}', '{{mf}}') + ' $- {{n}}~\\text{h}$ → '
     + dit('{{hr}}', '{{mf}}') + '.|Le trajet a duré moins d\'une heure.}}',
     '{{if:ac>=60|Puis les minutes, en passant par l\'heure pleine : de ' + dit('{{hr}}', '{{mf}}')
     + ' on recule de ${{mf}}$ minutes jusqu\'à ${{hr}}~\\text{h}$ ; il reste ${{c}} - {{mf}} = '
     + ev('c-mf') + '$ minutes à enlever : $60 - ' + ev('c-mf') + ' = {{a}}$.|Puis les minutes :'
     ' ${{mf}} - {{c}} = {{a}}$.}}',
     IL_M + ' est parti{{if:k==1|e|{{if:k==3|e|}}}} à $' + col('{{h}}~\\text{h}~' + mm('{{a}}')) + '$.'])

# V3 : deux étapes, trajet c1, arrêt w, trajet c2 : instants intermédiaires.


def passe(t, u):
    """« (… jusqu'à 13 h, puis … min) » quand on passe une heure pleine entre les instants t et u."""
    return ('{{if:floor(' + u + '/60)>floor(' + t + '/60)| ($' + ev('60-mod(' + t + ',60)')
            + '$ min jusqu\'à $' + ev('floor(' + u + '/60)') + '~\\text{h}$, puis $'
            + ev('mod(' + u + ',60)') + '$ min)|}}')


DEUX_ETAPES = variation(
    QUI + ' part à vélo à ' + dit('{{h}}', '{{a}}') + '. ' + IL_M + ' roule ${{c1}}$ minutes,'
    ' s\'arrête ${{w}}$ minutes pour goûter, puis roule encore ${{c2}}$ minutes. À quelle heure'
    ' arrive-t-' + IL + ' ?\n\n' + IL_M + ' arrive à $?~\\text{h}~?$.',
    [var('k', '1..4'), var('h', '8..16'), var('a', '0..59'), var('c1', '25..55'),
     var('z', '2..9'), var('w', 'eval:5*z'), var('c2', '20..59'),
     var('t0', 'eval:60*h+a'), var('t1', 'eval:t0+c1'), var('t2', 'eval:t1+w'), var('t3', 'eval:t2+c2'),
     var('hf', 'eval:floor(t3/60)'), var('mf', 'eval:mod(t3,60)')],
    ['{{hf}}', '{{mf}}'],
    ['On avance d\'instant en instant, en passant par l\'heure pleine quand il le faut.',
     'Après ${{c1}}$ minutes de route : ' + d_de('t1') + passe('t0', 't1') + '.',
     'Après ${{w}}$ minutes d\'arrêt : ' + d_de('t2') + passe('t1', 't2') + '.',
     'Après ${{c2}}$ minutes de route : ' + d_de('t3') + passe('t2', 't3') + '.',
     IL_M + ' arrive à $' + col('{{hf}}~\\text{h}~' + mm('{{mf}}')) + '$.'])

# V4 : jours et heures. Départ le jour jd (lundi … vendredi) à H h a, trajet n h c min.
JOURS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche']
J0 = selon('jd', JOURS[0:5])
J1 = selon('jd', JOURS[1:6])
J2 = selon('jd', JOURS[2:7])
JOURS_V4 = variation(
    'Un car part le **' + J0 + '** à ' + dit('{{hd}}', '{{a}}') + '. Le voyage dure '
    + duree('{{n}}', '{{c}}') + '.\n\nÀ quelle heure arrive-t-il ?\n\nIl arrive à $?~\\text{h}~?$.'
    '\n\nQuel jour arrive-t-il ?' + choix(['le ' + J0, 'le ' + J1, 'le ' + J2], melanger=False),
    [var('jd', '1..5'), var('hd', '14..23'), var('z', '0..11'), var('a', 'eval:5*z'),
     var('n', '3..14'), var('y', '0..11'), var('c', 'eval:5*y'),
     var('tt', 'eval:60*hd+a+60*n+c'), var('th', 'eval:floor(tt/60)'), var('mf', 'eval:mod(tt,60)'),
     var('hf', 'eval:mod(th,24)'), var('jr', 'eval:floor(th/24)')],
    ['{{hf}}', '{{mf}}', '{{jr}}'],
    ['On ajoute les heures, puis les minutes : ' + dit('{{hd}}', '{{a}}') + ' + '
     + duree('{{n}}', '{{c}}') + ' → ' + dit('{{th}}', '{{mf}}') + '.',
     '{{if:th>=24|Un jour, c\'est $24~\\text{h}$ : passé minuit, on recommence à $0~\\text{h}$.'
     ' ${{th}} - 24 = {{hf}}$ : c\'est le lendemain.|On ne passe pas minuit : c\'est le même'
     ' jour.}}',
     'Le car arrive le ' + selon('jr', ['**' + J0 + '**', '**' + J1 + '**'], 0) + ' à $'
     + col('{{hf}}~\\text{h}~' + mm('{{mf}}')) + '$.'])

vs = [ARRIVEE, DEPART, DEUX_ETAPES, JOURS_V4]
ARR = {'k': 1, 'h': 7, 'a': 45, 'n': 1, 'c': 30}      # 7 h 45 + 1 h 30 = 9 h 15
ecrire('05-problemes-de-durees', modele(
    'Problèmes de durées',
    'Une ou deux étapes, à la minute, par instants intermédiaires : heure d\'arrivée, heure de'
    ' départ, trajet avec un arrêt, voyage qui passe minuit (jour et heure)',
    5, vs,
    [spec('7 h 45 + 1 h 30 = 9 h 15', 0, vs, ARR, ['9', '15'], 'correct'),
     spec('Erreur : 8 h 75', 0, vs, ARR, ['8', '75'], 'incorrect'),
     spec('Erreur : heure pleine oubliée, 8 h 15', 0, vs, ARR, ['8', '15'], 'incorrect'),
     spec('9 h 10 + 25 min = 9 h 35', 0, vs, {'k': 2, 'h': 9, 'a': 10, 'n': 0, 'c': 25},
          ['9', '35'], 'correct'),
     spec('7 h 50 + 14 min = 8 h 04, écrit « 04 »', 0, vs,
          {'k': 4, 'h': 7, 'a': 50, 'n': 0, 'c': 14}, ['8', '04'], 'correct'),
     spec('7 h 50 + 14 min = 8 h 04, écrit « 4 »', 0, vs,
          {'k': 4, 'h': 7, 'a': 50, 'n': 0, 'c': 14}, ['8', '4'], 'correct'),
     spec('Départ : 9 h 15 − 1 h 30 = 7 h 45', 1, vs, ARR, ['7', '45'], 'correct'),
     spec('Erreur : 8 h 45 (heure pleine oubliée en reculant)', 1, vs, ARR, ['8', '45'],
          'incorrect'),
     spec('Erreur : addition au lieu de soustraction, 10 h 45', 1, vs, ARR, ['10', '45'],
          'incorrect'),
     spec('14 h 50 + 35 + 20 + 40 = 16 h 25', 2, vs,
          {'k': 3, 'h': 14, 'a': 50, 'c1': 35, 'z': 4, 'c2': 40}, ['16', '25'], 'correct'),
     spec('Erreur : arrêt oublié, 16 h 5', 2, vs,
          {'k': 3, 'h': 14, 'a': 50, 'c1': 35, 'z': 4, 'c2': 40}, ['16', '5'], 'incorrect'),
     spec('Lundi 21 h 15 + 14 h 30 = mardi 11 h 45', 3, vs,
          {'jd': 1, 'hd': 21, 'z': 3, 'n': 14, 'y': 6}, ['11', '45', '1'], 'correct'),
     spec('Erreur : 35 h 45 (minuit non passé)', 3, vs, {'jd': 1, 'hd': 21, 'z': 3, 'n': 14, 'y': 6},
          ['35', '45', '1'], 'incorrect'),
     spec('Erreur : bonne heure, mauvais jour (lundi)', 3, vs,
          {'jd': 1, 'hd': 21, 'z': 3, 'n': 14, 'y': 6}, ['11', '45', '0'], 'incorrect'),
     spec('Jeudi 14 h + 5 h = jeudi 19 h', 3, vs, {'jd': 4, 'hd': 14, 'z': 0, 'n': 5, 'y': 0},
          ['19', '0', '0'], 'correct')],
    delay=180))

# ============================================================================

os.makedirs(DOSSIER, exist_ok=True)
for nom, mod in MODELES.items():
    with open(os.path.join(DOSSIER, nom + '.json'), 'w', encoding='utf-8') as f:
        json.dump(mod, f, ensure_ascii=False, indent='\t')
        f.write('\n')
print(f'{len(MODELES)} modèles écrits dans {DOSSIER}')
