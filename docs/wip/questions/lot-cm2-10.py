"""Écrit les 5 modèles du lot 10 du CM2 (heures et durées) dans scripts/questions/cm2-10/.

Phase 0 validée par David le 2026-11-18 (§ 16 et 16.1 du journal `docs/archive/wip/questions-cm2-progress.md`,
« je te suis ») : 5 modèles (CM2-082, 083, 153, 084, 085) ; trotteuse lue et posée sur un cadran à
12 chiffres puis `chiffres: quarts`, pas de cadran nu ; pas d'« affichage digital » ; conversions dans
les problèmes seulement ; niveaux après ceux pris : lire 9, placer 10 (lecture de l'heure) ; durée 9,
comparer 10, problèmes 11 (calcul de durées).

Bornes (`cycle3.json`) : heures, minutes, secondes ; 084 « de 8 h 52 min 27 s à 11 h 37 min 18 s » ;
085 une ou plusieurs étapes (trois admises), calcul mental, pas d'algorithme posé en base soixante,
unités jour, h, min, s.

Patron : `lot-cm1-8a.py` (mêmes gestes, à la minute). Les instants sont comptés en SECONDES depuis
0 h (`t0`, `tf`…) ; heures, minutes, secondes s'en déduisent (`floor(t/3600)`, `mod(floor(t/60),60)`,
`mod(t,60)`).

Pièges (relus) : `i` et `e` jamais comme variables ; une plage négative ne se tire pas (signe tiré à
part) ; `heure:` / `placer:` à secondes s'écrivent toujours `9 h 25 min 40 s` (le `min` est exigé) ;
la case choix répond par l'indice d'origine ; `{{if:}}` ne résout pas un `{{eval:}}` dans sa condition
(helper `brut`, ou une variable calculée) ; minutes et secondes sur deux chiffres → `zeros: off`.

    python3 docs/wip/questions/lot-cm2-10.py scripts/questions/cm2-10
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


# Minutes et secondes écrites sur deux chiffres (8 h 04 min 07 s) : « 07 » tapé dans une case est
# juste, pas une « forme non optimale » (règle de superflu `zeros` coupée, comme au CM1, lot 8a).
OPTIONS = {'constraints': {'zeros': 'off'}}


def modele(title, description, niveau, variations, specs, delay=150):
    return {'title': title, 'description': description, 'grades': ['CM2'], 'level': niveau,
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
    for c in vs[vi].get('conditions', []):
        assert eval(c.replace('&&', ' and ').replace('||', ' or '), FONCTIONS, dict(valeurs)), \
            ('condition fausse dans une spec', desc, c)
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


def deux(x):
    """Minutes ou secondes sur deux chiffres : 04, 15."""
    return '{{if:' + brut(x) + '<10|0' + x + '|' + x + '}}'


def hms(h, m, s):
    """Heure pour ```horloge (`heure:` ou `placer:`), toujours complète : `9 h 5 min 40 s`."""
    return h + ' h ' + m + ' min ' + s + ' s'


def dit(h, m, s):
    """Un instant écrit pour l'élève, en formule, sans les unités nulles de la fin :
    $9~\\text{h}$, $8~\\text{h}~53~\\text{min}$, $8~\\text{h}~52~\\text{min}~27~\\text{s}$."""
    H = h + '~\\text{h}'
    HM = H + '~' + deux(m) + '~\\text{min}'
    HMS = HM + '~' + deux(s) + '~\\text{s}'
    return ('{{if:' + brut(s) + '==0|{{if:' + brut(m) + '==0|$' + H + '$|$' + HM + '$}}|$' + HMS
            + '$}}')


def dit_t(t):
    """Un instant donné en secondes depuis 0 h (nom de variable ou expression)."""
    return dit(ev('floor(' + t + '/3600)'), ev('mod(floor(' + t + '/60),60)'), ev('mod(' + t + ',60)'))


def duree(h, m, s):
    """Une durée écrite sans ses unités nulles : $2~\\text{h}~44~\\text{min}~51~\\text{s}$, $35~\\text{s}$."""
    parts = [(h, '\\text{h}'), (m, '\\text{min}'), (s, '\\text{s}')]

    def branche(k, pris):
        if k == 3:
            if not pris:
                return '$0~\\text{s}$'
            return '$' + '~'.join(x + '~' + u for x, u in pris) + '$'
        x, u = parts[k]
        return ('{{if:' + brut(x) + '==0|' + branche(k + 1, pris) + '|'
                + branche(k + 1, pris + [(x, u)]) + '}}')

    return branche(0, [])


def duree_t(d):
    """Une durée donnée en secondes."""
    return duree(ev('floor(' + d + '/3600)'), ev('mod(floor(' + d + '/60),60)'), ev('mod(' + d + ',60)'))


def horloges(heures, chiffres='tous', legendes=None, cadran24=False):
    bloc = ('\n\n```horloge\nheure: ' + ' ; '.join(heures) + '\nchiffres: ' + chiffres
            + '\ngraduations: minutes\n')
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


def crans(h, m, s):
    """Réponse d'aiguilles bien posées : cran de la petite (vraie place), de la grande, trotteuse."""
    return f'{math.floor((h % 12) * 5 + m / 12 + 0.5) % 60} {m} {s}'


CASES_HMS = '$?~\\text{h}~?~\\text{min}~?~\\text{s}$'
CASES_MS = '$?~\\text{min}~?~\\text{s}$'

AIDE_TOUS = 'Les trois aiguilles : la petite montre les heures, la grande les minutes, la trotteuse (la plus fine) les secondes.'
AIDE_QUARTS = ('Seuls le $12$, le $3$, le $6$ et le $9$ sont écrits : les autres repères se retrouvent entre'
               ' eux. La petite aiguille montre les heures, la grande les minutes, la trotteuse (la plus'
               ' fine) les secondes.')

# Lecture d'une aiguille de minutes ou de secondes : q grands repères (de 5 en 5), r petites graduations


def repere(q):
    return '{{if:' + q + '==0|$12$|${{' + q + '}}$}}'


def lecture(nom, unite, x, q, r):
    """« La grande aiguille : elle a passé le repère du 7 (35), puis 2 petites graduations : 37 minutes. »"""
    return (nom + ' montre les ' + unite + 's. On compte les grands repères de $5$ en $5$ depuis le'
            ' $12$ : {{if:' + r + '>0|elle a passé le repère du ' + repere(q) + ' ($' + ev('5*' + q)
            + '$), puis elle avance de ${{' + r + '}}$ petite{{if:' + r + '>1|s|}} graduation{{if:'
            + r + '>1|s|}} : ${{' + x + '}}$ ' + unite + '{{if:' + x + '>1|s|}}.|elle est sur le repère'
            ' du ' + repere(q) + ' : ${{' + x + '}}$ ' + unite + '{{if:' + x + '>1|s|}}.}}')


def petite(h):
    return ('La petite aiguille montre les heures : {{if:m==0|elle est pile sur le repère du $' + h
            + '$.|elle a passé le repère du $' + h + '$ sans atteindre le suivant{{if:m>=45| (elle en'
            ' est tout près, mais cette heure n\'est pas encore passée)|}} : l\'heure est $' + h + '$.}}')


# =====================================================================================
# 01. Lire l'heure à la seconde (CM2-082)
# =====================================================================================

VARS_LIRE = [var('h', '1..12'), var('m', '0..59'), var('s', '1..59'), var('q', 'eval:floor(m/5)'),
             var('r', 'eval:mod(m,5)'), var('qs', 'eval:floor(s/5)'), var('rs', 'eval:mod(s,5)')]
GRANDE = lecture('La grande aiguille', 'minute', 'm', 'q', 'r')
TROTTEUSE = lecture('La trotteuse', 'seconde', 's', 'qs', 'rs')


def lire(chiffres, aide):
    return variation(
        'Quelle heure est-il ?' + horloges([hms('{{h}}', '{{m}}', '{{s}}')], chiffres)
        + '\n\nIl est ' + CASES_HMS + '.',
        VARS_LIRE, ['{{h}}', '{{m}}', '{{s}}'],
        [aide, petite('{{h}}'), GRANDE, TROTTEUSE,
         'Il est $' + col('{{h}}~\\text{h}~' + deux('{{m}}') + '~\\text{min}~' + deux('{{s}}')
                          + '~\\text{s}') + '$.'])


LIRE_APRES_MIDI = variation(
    'C\'est l\'après-midi. Quelle heure est-il ?' + horloges([hms('{{h}}', '{{m}}', '{{s}}')], 'quarts')
    + '\n\nIl est ' + CASES_HMS + '.',
    [var('h', '1..11')] + VARS_LIRE[1:],
    [{'expectedAnswer': ev('h+12'),
      'validationRules': [{'type': 'custom', 'expression': 'answer != {{h}}',
                           'description': 'L\'après-midi, on compte après midi : {{h}} heures de'
                           ' l\'après-midi, c\'est ' + ev('h+12') + ' h.'}]}, '{{m}}', '{{s}}'],
    [AIDE_QUARTS, petite('{{h}}'), GRANDE, TROTTEUSE,
     'L\'après-midi, on ajoute $12$ aux heures : ${{h}} + 12 = ' + ev('h+12') + '$.',
     'Il est $' + col(ev('h+12') + '~\\text{h}~' + deux('{{m}}') + '~\\text{min}~' + deux('{{s}}')
                      + '~\\text{s}') + '$.'])

vs = [lire('tous', AIDE_TOUS), lire('quarts', AIDE_QUARTS), LIRE_APRES_MIDI]
L = {'h': 8, 'm': 37, 's': 22}
L58 = {'h': 8, 'm': 58, 's': 40}
ecrire('01-quelle-heure-est-il-avec-les-secondes', modele(
    'Quelle heure est-il ? (avec les secondes)',
    'Lire l\'heure à la seconde près (trotteuse) sur un cadran à 12 chiffres, puis où seuls 12, 3, 6, 9'
    ' sont écrits ; l\'après-midi (15 h 22 min 40 s)',
    9, vs,
    [spec('8 h 37 min 22 s', 0, vs, L, ['8', '37', '22'], 'correct'),
     spec('Erreur : grande aiguille et trotteuse inversées, 8 h 22 min 37 s', 0, vs, L,
          ['8', '22', '37'], 'incorrect'),
     spec('Erreur : trotteuse lue au repère, 4 s', 0, vs, L, ['8', '37', '4'], 'incorrect'),
     spec('Erreur : petites graduations oubliées, 20 s', 0, vs, L, ['8', '37', '20'], 'incorrect'),
     spec('8 h 58 min 40 s, petite presque sur le 9', 0, vs, L58, ['8', '58', '40'], 'correct'),
     spec('Erreur : 8 h 58 min 40 s lu 9 h 58 min 40 s', 0, vs, L58, ['9', '58', '40'], 'incorrect'),
     spec('2 h 04 min 07 s écrit « 04 » et « 07 »', 0, vs, {'h': 2, 'm': 4, 's': 7},
          ['2', '04', '07'], 'correct'),
     spec('Chiffres 12-3-6-9 : 9 h 25 min 40 s', 1, vs, {'h': 9, 'm': 25, 's': 40},
          ['9', '25', '40'], 'correct'),
     spec('Erreur : 12-3-6-9, trotteuse comptée pour 8', 1, vs, {'h': 9, 'm': 25, 's': 40},
          ['9', '25', '8'], 'incorrect'),
     spec('Après-midi : 15 h 22 min 40 s', 2, vs, {'h': 3, 'm': 22, 's': 40}, ['15', '22', '40'],
          'correct'),
     spec('Erreur : 3 h 22 min 40 s l\'après-midi', 2, vs, {'h': 3, 'm': 22, 's': 40},
          ['3', '22', '40'], 'incorrect'),
     spec('Après-midi, minute 0 : 14 h 0 min 15 s', 2, vs, {'h': 2, 'm': 0, 's': 15},
          ['14', '0', '15'], 'correct')]))

# =====================================================================================
# 02. Placer les aiguilles à la seconde (CM2-083)
# =====================================================================================

PETITE_GRANDE = ('La grande aiguille montre les minutes, la petite l\'heure, la trotteuse les'
                 ' secondes.')


def placer_grande(nom, unite, x, q, r):
    return (nom + ' : ${{' + x + '}}$ ' + unite + '{{if:' + x + '>1|s|}}. On compte les grands repères'
            ' de $5$ en $5$ depuis le $12$ : {{if:' + r + '>0|elle passe le repère du ' + repere(q)
            + ' ($' + ev('5*' + q) + '$) et avance de ${{' + r + '}}$ petite{{if:' + r + '>1|s|}}'
            ' graduation{{if:' + r + '>1|s|}}.|elle va sur le repère du ' + repere(q) + '.}}')


def petite_sur(h):
    return ('{{if:m==0|La petite aiguille va pile sur le repère du $' + h + '$.|La petite'
            ' aiguille va entre le repère du $' + h + '$ et celui du $' + ev('mod(' + brut(h) + ',12)+1')
            + '$ : cette heure-là n\'est pas encore passée.}}')


ETAPES_PLACER = [placer_grande('La grande aiguille', 'minute', 'm', 'q', 'r'),
                 placer_grande('La trotteuse', 'seconde', 's', 'qs', 'rs'), petite_sur('{{h}}')]


def placer(chiffres, aide):
    return variation(
        'Place les aiguilles : il est ' + dit('{{h}}', '{{m}}', '{{s}}') + '.\n\n```horloge\nplacer: '
        + hms('{{h}}', '{{m}}', '{{s}}') + '\nchiffres: ' + chiffres + '\ngraduations: minutes\n```',
        VARS_LIRE, [], [aide] + ETAPES_PLACER)


PLACER_24 = variation(
    'Place les aiguilles : il est ' + dit('{{hh}}', '{{m}}', '{{s}}') + '.\n\n```horloge\nplacer: '
    + hms('{{hh}}', '{{m}}', '{{s}}') + '\nchiffres: tous\ngraduations: minutes\n```',
    [var('h', '1..11'), var('hh', 'eval:h+12')] + VARS_LIRE[1:],
    [],
    ['Sur le cadran, on retrouve l\'heure en enlevant $12$ : ${{hh}} - 12 = {{h}}$.', PETITE_GRANDE]
    + ETAPES_PLACER)

vs = [placer('tous', PETITE_GRANDE), placer('quarts', AIDE_QUARTS), PLACER_24]
P = {'h': 9, 'm': 25, 's': 40}
P15 = {'h': 3, 'm': 37, 's': 20}
ecrire('02-place-les-aiguilles-avec-les-secondes', modele(
    'Place les aiguilles (avec les secondes)',
    'Poser les trois aiguilles à la seconde près (9 h 25 min 40 s) sur un cadran à 12 chiffres, puis'
    ' où seuls 12, 3, 6, 9 sont écrits ; une heure de l\'après-midi (15 h 37 min 20 s)',
    10, vs,
    [spec('9 h 25 min 40 s', 0, vs, P, crans(9, 25, 40), 'correct'),
     spec('Erreur : grande aiguille et trotteuse inversées', 0, vs, P, crans(9, 40, 25), 'incorrect'),
     spec('Erreur : trotteuse sur le 8 (8 s)', 0, vs, P, crans(9, 25, 8), 'incorrect'),
     spec('Erreur : petite et grande inversées', 0, vs, P, '25 47 40', 'incorrect'),
     spec('Rien placé : case vide', 0, vs, P, '', 'empty'),
     spec('12-3-6-9 : 4 h 48 min 7 s', 1, vs, {'h': 4, 'm': 48, 's': 7}, crans(4, 48, 7), 'correct'),
     spec('Erreur : 12-3-6-9, 4 h 48 min 7 s placé 5 h 48 min 7 s', 1, vs, {'h': 4, 'm': 48, 's': 7},
          crans(5, 48, 7), 'incorrect'),
     spec('15 h 37 min 20 s', 2, vs, P15, crans(3, 37, 20), 'correct'),
     spec('Erreur : 15 h 37 min 20 s, grande sur 15', 2, vs, P15, f'{crans(3, 37, 20).split()[0]} 15 20',
          'incorrect')]))

# =====================================================================================
# 03. Durée entre deux horloges, à la seconde (CM2-084)
# =====================================================================================
# Début t0 = 3600·h + 60·a + x, durée d (s), fin tf = t0 + d. Instants intermédiaires : t1 = la
# minute pleine qui suit t0 (t0 lui-même si x = 0), t2 = l'heure pleine qui suit t1, t3 = l'heure
# pleine de la fin, t4 = la minute pleine de la fin. Toujours t0 ≤ t1 ≤ t2 ≤ t3 ≤ t4 ≤ tf : la durée
# passe une heure pleine (condition des variations).

DEBUT_FIN = ['Début', 'Fin']
ACTIVITE = ('{{if:k==1|La course|{{if:k==2|La séance de cinéma|{{if:k==3|Le match'
            '|La randonnée}}}}}}')
ACT_FINI = (ACTIVITE + ' commence et finit aux heures montrées. Combien de temps a-t-'
            '{{if:k==3|il|elle}} duré ?')

VARS_INSTANTS = [
    var('t0', 'eval:3600*h+60*a+x'), var('tf', 'eval:t0+d'),
    var('hf', 'eval:floor(tf/3600)'), var('mf', 'eval:mod(floor(tf/60),60)'), var('sf', 'eval:mod(tf,60)'),
    var('t1', 'eval:60*floor((t0+59)/60)'), var('t2', 'eval:3600*floor((t1+3599)/3600)'),
    var('t3', 'eval:3600*hf'), var('t4', 'eval:t3+60*mf'),
    var('s1', 'eval:t1-t0'), var('m1', 'eval:(t2-t1)/60'), var('hp', 'eval:(t3-t2)/3600'),
    var('ss', 'eval:s1+sf'), var('mm', 'eval:m1+mf+floor(ss/60)'),
    var('dh', 'eval:floor(d/3600)'), var('dm', 'eval:mod(floor(d/60),60)'), var('ds', 'eval:mod(d,60)')]

ETAPES_AXE = [
    'On avance d\'instant en instant, sans poser de soustraction.',
    '{{if:s1>0|De ' + dit_t('t0') + ' à ' + dit_t('t1') + ' : ${{s1}}~\\text{s}$. |}}'
    '{{if:m1>0|De ' + dit_t('t1') + ' à ' + dit_t('t2') + ' : ${{m1}}~\\text{min}$.|}}',
    '{{if:hp>0|De ' + dit_t('t2') + ' à ' + dit_t('t3') + ' : ${{hp}}~\\text{h}$. |}}'
    '{{if:mf>0|De ' + dit_t('t3') + ' à ' + dit_t('t4') + ' : ${{mf}}~\\text{min}$. |}}'
    '{{if:sf>0|De ' + dit_t('t4') + ' à ' + dit_t('tf') + ' : ${{sf}}~\\text{s}$.|}}',
    'Les secondes : ${{s1}} + {{sf}} = {{ss}}$'
    '{{if:ss>=60|, soit $1~\\text{min}~' + ev('ss-60') + '~\\text{s}$|}}. Les minutes : ${{m1}} + {{mf}}'
    '{{if:ss>=60| + 1|}} = {{mm}}${{if:mm>=60|, soit $1~\\text{h}~' + ev('mm-60') + '~\\text{min}$|}}.'
    '{{if:mm>=60| Les heures : ${{hp}} + 1 = {{dh}}$.|{{if:dh>0| Les heures : ${{dh}}~\\text{h}$.|}}}}',
    'En tout : $' + col('{{dh}}~\\text{h}~{{dm}}~\\text{min}~{{ds}}~\\text{s}') + '$.']

FIN_AU_DELA = ['floor(tf/3600)>h']


def entre_horloges(hmin, hmax, dvar, cases, reponses, cadran24=False, fin=None):
    return variation(
        ACT_FINI + horloges([hms('{{h}}', '{{a}}', '{{x}}'), hms('{{hf}}', '{{mf}}', '{{sf}}')], 'tous',
                            DEBUT_FIN, cadran24=cadran24)
        + '\n\nDurée : ' + cases + '.',
        [var('k', '1..4'), var('h', f'{hmin}..{hmax}'), var('a', '0..59'), var('x', '0..59')] + dvar
        + VARS_INSTANTS,
        reponses,
        ['Début : ' + dit_t('t0') + '. Fin : ' + dit_t('tf') + '.'] + (fin or ETAPES_AXE),
        FIN_AU_DELA)


# V1 : moins d'une heure, à cheval sur l'heure (9 h 52 min 40 s → 10 h 07 min 15 s : 14 min 35 s)
ETAPES_COURTE = ETAPES_AXE[:-1] + ['En tout : $' + col('{{dm}}~\\text{min}~{{ds}}~\\text{s}') + '$.']
COURTE = entre_horloges(
    1, 11, [var('c', '8..44'), var('y', '0..59'), var('d', 'eval:60*c+y')], CASES_MS,
    ['{{dm}}', '{{ds}}'], fin=ETAPES_COURTE)
VARS_LONGUE = [var('n', '1..3'), var('c', '0..59'), var('y', '1..59'), var('d', 'eval:3600*n+60*c+y')]
vs = [COURTE,
      entre_horloges(7, 14, VARS_LONGUE, CASES_HMS, ['{{dh}}', '{{dm}}', '{{ds}}']),
      entre_horloges(13, 19, [var('n', '1..2')] + VARS_LONGUE[1:], CASES_HMS,
                     ['{{dh}}', '{{dm}}', '{{ds}}'], cadran24=True)]

C1 = {'k': 1, 'h': 9, 'a': 52, 'x': 40, 'c': 14, 'y': 35}           # → 10 h 07 min 15 s
BO = {'k': 2, 'h': 8, 'a': 52, 'x': 27, 'n': 2, 'c': 44, 'y': 51}   # → 11 h 37 min 18 s
ecrire('03-duree-entre-deux-horloges-avec-les-secondes', modele(
    'Combien de temps a-t-il duré ? (avec les secondes)',
    'Durée entre deux horloges à trotteuse, à la seconde près : moins d\'une heure ; de 8 h 52 min 27 s'
    ' à 11 h 37 min 18 s ; l\'après-midi sur un cadran de 24 h',
    9, vs,
    [spec('9 h 52 min 40 s → 10 h 07 min 15 s = 14 min 35 s', 0, vs, C1, ['14', '35'], 'correct'),
     spec('Erreur : 52 − 7 = 45 min, 40 − 15 = 25 s', 0, vs, C1, ['45', '25'], 'incorrect'),
     spec('Erreur : 100 s dans une minute, 15 min 75 s', 0, vs, C1, ['15', '75'], 'incorrect'),
     spec('Erreur : minute entamée comptée, 15 min 35 s', 0, vs, C1, ['15', '35'], 'incorrect'),
     spec('BO : 8 h 52 min 27 s → 11 h 37 min 18 s = 2 h 44 min 51 s', 1, vs, BO, ['2', '44', '51'],
          'correct'),
     spec('Erreur : soustraction chiffre à chiffre, 3 h 15 min 9 s', 1, vs, BO, ['3', '15', '9'],
          'incorrect'),
     spec('Erreur : retenues décimales, 2 h 84 min 91 s', 1, vs, BO, ['2', '84', '91'], 'incorrect'),
     spec('Erreur : heure entamée comptée, 3 h 44 min 51 s', 1, vs, BO, ['3', '44', '51'], 'incorrect'),
     spec('Début à l\'heure pile : 9 h 0 min 0 s → 10 h 15 min 30 s', 1, vs,
          {'k': 4, 'h': 9, 'a': 0, 'x': 0, 'n': 1, 'c': 15, 'y': 30}, ['1', '15', '30'], 'correct'),
     spec('Écrit « 05 » : 1 h 05 min 08 s', 1, vs,
          {'k': 3, 'h': 10, 'a': 20, 'x': 10, 'n': 1, 'c': 5, 'y': 8}, ['1', '05', '08'], 'correct'),
     spec('Cadran de 24 h : 15 h 40 min 50 s → 17 h 06 min 20 s = 1 h 25 min 30 s', 2, vs,
          {'k': 3, 'h': 15, 'a': 40, 'x': 50, 'n': 1, 'c': 25, 'y': 30}, ['1', '25', '30'], 'correct'),
     spec('Erreur : 24 h, 1706 − 1540 = 1 h 66 min', 2, vs,
          {'k': 3, 'h': 15, 'a': 40, 'x': 50, 'n': 1, 'c': 25, 'y': 30}, ['1', '66', '30'],
          'incorrect')]))

# =====================================================================================
# 04. Quelle durée est la plus longue ? (CM2-153)
# =====================================================================================
# Course 1 : de t0 = 3600·h1 + 60·p + x, durée f (s) ; course 2 : de t2 (l'heure pleine qui suit la
# fin de la 1re, plus q min y s), durée g = f + w. Écart w = ±u secondes, signe tiré à part.

VARS_FM = [var('h1', '8..10'), var('p', '0..59'), var('x', '0..59'), var('fm', '20..95'),
           var('fs', '0..59'), var('f', 'eval:60*fm+fs'),
           var('t0', 'eval:3600*h1+60*p+x'), var('t1', 'eval:t0+f'),
           var('q', '0..59'), var('y', '0..59'), var('t2', 'eval:3600*(floor(t1/3600)+1)+60*q+y'),
           var('g', 'eval:f+w'), var('t3', 'eval:t2+g')]


def h_de(t):
    return hms(ev('floor(' + t + '/3600)'), ev('mod(floor(' + t + '/60),60)'), ev('mod(' + t + ',60)'))


HORLOGES_4 = horloges([h_de('t0'), h_de('t1'), h_de('t2'), h_de('t3')], 'tous',
                      ['Début du film', 'Fin du film', 'Début du match', 'Fin du match'])
ETAPES_FM = [
    'On calcule chaque durée d\'instant en instant (minute pleine, heure pleine…).',
    'Le film : de ' + dit_t('t0') + ' à ' + dit_t('t1') + '. Il a duré ' + duree_t('f') + '.',
    'Le match : de ' + dit_t('t2') + ' à ' + dit_t('t3') + '. Il a duré ' + duree_t('g') + '.',
    '{{if:w<0|Le **film** a duré le plus longtemps, de $' + ev('-w') + '$ seconde{{if:w<-1|s|}}.|'
    '{{if:w>0|Le **match** a duré le plus longtemps, de ${{w}}$ seconde{{if:w>1|s|}}.|'
    'Ils ont duré **autant**.}}}}']
CHOIX_FM = choix(['Le film', 'Le match', 'Ils ont duré autant.'], melanger=False)
R_FM = var('r', '{{if:w<0|0|{{if:w>0|1|2}}}}')


def comparer(umin, umax):
    return variation(
        'Tom a regardé un film, puis un match.' + HORLOGES_4
        + '\n\nLequel a duré le plus longtemps ?' + CHOIX_FM,
        [var('u', f'{umin}..{umax}'), var('sg', '0..1'), var('w', 'eval:(2*sg-1)*u')] + VARS_FM
        + [R_FM], ['{{r}}'], ETAPES_FM)


vs = [comparer(1, 59), comparer(0, 9)]


def fm(f, w, h1=8, p=0, x=0, q=0, y=0):
    return {'u': abs(w), 'sg': 1 if w > 0 else 0, 'h1': h1, 'p': p, 'x': x, 'fm': f // 60,
            'fs': f % 60, 'q': q, 'y': y, 'r': 0 if w < 0 else (1 if w > 0 else 2)}


ecrire('04-quelle-duree-est-la-plus-longue-a-la-seconde', modele(
    'Quelle durée est la plus longue ? (à la seconde)',
    'Comparer deux durées lues sur quatre horloges à trotteuse, en heures, minutes et secondes, à'
    ' quelques secondes près',
    10, vs,
    [spec('Film 1 h 47 min 20 s, match 27 s de moins : le film', 0, vs,
          fm(6440, -27, 8, 52, 15, 15, 40), '0', 'correct'),
     spec('Erreur : le match (il finit plus tard)', 0, vs, fm(6440, -27, 8, 52, 15, 15, 40), '1',
          'incorrect'),
     spec('Erreur : film plus long de 27 s, « autant » (minutes seules)', 0, vs,
          fm(6440, -27, 8, 52, 15, 15, 40), '2', 'incorrect'),
     spec('Match plus long de 8 s : le match', 0, vs, fm(5735, 8, 9, 38, 50, 4, 5), '1', 'correct'),
     spec('Même durée : autant', 1, vs, fm(4820, 0, 10, 47, 33, 21, 9), '2', 'correct'),
     spec('Erreur : même durée, le film', 1, vs, fm(4820, 0, 10, 47, 33, 21, 9), '0', 'incorrect'),
     spec('Écart de 1 s : le film', 1, vs, fm(7200, -1, 8, 5, 0, 50, 30), '0', 'correct')]))

# =====================================================================================
# 05. Problèmes de durées (CM2-085)
# =====================================================================================

QUI = selon('k', ['Léa', 'Karim', 'Inès', 'Hugo'])
IL = selon('k', ['elle', 'il', 'elle', 'il'])
IL_M = selon('k', ['Elle', 'Il', 'Elle', 'Il'])

# V1 : une étape, chronomètre. Départ h h a min x s, course c min y s.
CHRONO = variation(
    QUI + ' prend le départ d\'une course à ' + dit('{{h}}', '{{a}}', '{{x}}') + '. ' + IL_M
    + ' court pendant ' + duree('0', '{{c}}', '{{y}}') + '. À quelle heure franchit-' + IL
    + ' la ligne d\'arrivée ?\n\n' + IL_M + ' arrive à ' + CASES_HMS + '.',
    [var('k', '1..4'), var('h', '8..16'), var('a', '0..59'), var('x', '0..59'), var('c', '5..59'),
     var('y', '1..59'), var('xy', 'eval:x+y'), var('ac', 'eval:a+c+floor(xy/60)'),
     var('tf', 'eval:3600*h+60*a+x+60*c+y'),
     var('hf', 'eval:floor(tf/3600)'), var('mf', 'eval:mod(floor(tf/60),60)'), var('sf', 'eval:mod(tf,60)')],
    ['{{hf}}', '{{mf}}', '{{sf}}'],
    ['D\'abord les secondes : ${{x}} + {{y}} = {{xy}}$'
     '{{if:xy>=60|, soit $1~\\text{min}~' + ev('xy-60') + '~\\text{s}$ : on garde $' + ev('xy-60')
     + '~\\text{s}$ et on ajoute $1~\\text{min}$|}}.',
     'Puis les minutes : ${{a}} + {{c}}{{if:xy>=60| + 1|}} = {{ac}}$'
     '{{if:ac>=60|, soit $1~\\text{h}~' + ev('ac-60') + '~\\text{min}$ : on passe à $' + ev('h+1')
     + '~\\text{h}$|}}.',
     IL_M + ' arrive à $' + col('{{hf}}~\\text{h}~' + deux('{{mf}}') + '~\\text{min}~' + deux('{{sf}}')
                                 + '~\\text{s}') + '$.'])

# V2 : une conversion dans un problème, secondes → minutes et secondes
CONV_S = variation(
    'Au chronomètre, ' + QUI + ' a fait le tour du stade en ${{t}}$ secondes. Combien de minutes'
    ' et de secondes cela fait-il ?\n\nCela fait ' + CASES_MS + '.',
    [var('k', '1..4'), var('n', '1..4'), var('y', '1..59'), var('t', 'eval:60*n+y')],
    ['{{n}}', '{{y}}'],
    ['Une minute, c\'est $60$ secondes.',
     'Dans ${{t}}$ secondes, il y a ${{n}}$ fois $60$ secondes : ${{n}} \\times 60 = ' + ev('60*n')
     + '$, et il reste ${{t}} - ' + ev('60*n') + ' = {{y}}$ secondes.',
     'Cela fait $' + col('{{n}}~\\text{min}~{{y}}~\\text{s}') + '$.'])

# V3 : trois étapes, course de relais. Départ h h a min (pile), trois relais de c_j min y_j s.
VARS_RELAIS = [var('h', '9..16'), var('a', '0..59'),
               var('c1', '3..6'), var('y1', '0..59'), var('c2', '3..6'), var('y2', '0..59'),
               var('c3', '3..6'), var('y3', '0..59'),
               var('t0', 'eval:3600*h+60*a'), var('u1', 'eval:t0+60*c1+y1'),
               var('u2', 'eval:u1+60*c2+y2'), var('u3', 'eval:u2+60*c3+y3'),
               var('hf', 'eval:floor(u3/3600)'), var('mf', 'eval:mod(floor(u3/60),60)'),
               var('sf', 'eval:mod(u3,60)')]
def relais(qui, avant, apres, c, y):
    """« Le deuxième : 9 h 42 min 32 s + 6 min 58 s (secondes : 32 + 58 = 90, soit 1 min 30 s) → … »"""
    sec = 'mod(' + avant + ',60)+' + y
    return (qui + ' : ' + dit_t(avant) + ' plus ' + duree('0', '{{' + c + '}}', '{{' + y + '}}')
            + '{{if:' + sec + '>=60| (secondes : $' + ev('mod(' + avant + ',60)') + ' + {{' + y + '}} = '
            + ev(sec) + '$, soit $1~\\text{min}~' + ev(sec + '-60') + '~\\text{s}$)|}} → arrivée à '
            + dit_t(apres) + '.')


RELAIS = variation(
    'Une course de relais part à ' + dit('{{h}}', '{{a}}', '0') + '. Les trois coureurs de l\'équipe'
    ' mettent ' + duree('0', '{{c1}}', '{{y1}}') + ', puis ' + duree('0', '{{c2}}', '{{y2}}')
    + ', puis ' + duree('0', '{{c3}}', '{{y3}}') + '. À quelle heure l\'équipe arrive-t-elle ?'
    '\n\nElle arrive à ' + CASES_HMS + '.',
    VARS_RELAIS, ['{{hf}}', '{{mf}}', '{{sf}}'],
    ['On avance d\'instant en instant, coureur après coureur.',
     relais('Le premier coureur', 't0', 'u1', 'c1', 'y1'),
     relais('Le deuxième', 'u1', 'u2', 'c2', 'y2'),
     relais('Le troisième', 'u2', 'u3', 'c3', 'y3'),
     'L\'équipe arrive à $' + col('{{hf}}~\\text{h}~' + deux('{{mf}}') + '~\\text{min}~' + deux('{{sf}}')
                                  + '~\\text{s}') + '$.'])

# V4 : voyage sur plusieurs jours. Départ le jour jd à hd h a, trajet n h c min.
JOURS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche']
J0 = selon('jd', JOURS[0:5])
J1 = selon('jd', JOURS[1:6])
J2 = selon('jd', JOURS[2:7])
VOYAGE = variation(
    'Un bateau quitte le port le **' + J0 + '** à ' + dit('{{hd}}', '{{a}}', '0') + '. La traversée dure '
    + duree('{{n}}', '{{c}}', '0') + '.\n\nÀ quelle heure arrive-t-il ?\n\nIl arrive à $?~\\text{h}~?'
    '~\\text{min}$.\n\nQuel jour arrive-t-il ?' + choix(['le ' + J0, 'le ' + J1, 'le ' + J2], melanger=False),
    [var('jd', '1..5'), var('hd', '14..23'), var('z', '0..11'), var('a', 'eval:5*z'),
     var('n', '15..40'), var('yc', '0..11'), var('c', 'eval:5*yc'), var('ac', 'eval:a+c'),
     var('tt', 'eval:60*hd+a+60*n+c'), var('th', 'eval:floor(tt/60)'), var('mf', 'eval:mod(tt,60)'),
     var('hf', 'eval:mod(th,24)'), var('jr', 'eval:floor(th/24)')],
    ['{{hf}}', '{{mf}}', '{{jr}}'],
    ['On compte les heures depuis le ' + J0 + ' à $0~\\text{h}$.',
     'Départ : ${{hd}}~\\text{h}~' + deux('{{a}}') + '~\\text{min}$. On ajoute ${{n}}~\\text{h}$, puis'
     ' ${{c}}~\\text{min}${{if:ac>=60| (${{a}} + {{c}} = {{ac}}$, soit $1~\\text{h}~' + ev('ac-60')
     + '~\\text{min}$)|}} : on arrive à ${{th}}~\\text{h}~' + deux('{{mf}}') + '~\\text{min}$ après le '
     + J0 + ' $0~\\text{h}$.',
     'Un jour, c\'est $24~\\text{h}$. {{if:jr==1|${{th}} - 24 = {{hf}}$ : c\'est le lendemain.|'
     '${{th}} - 24 - 24 = {{hf}}$ : c\'est le surlendemain.}}',
     'Le bateau arrive le ' + selon('jr', ['**' + J1 + '**', '**' + J2 + '**']) + ' à $'
     + col('{{hf}}~\\text{h}~' + deux('{{mf}}') + '~\\text{min}') + '$.'])

# V5 : une conversion dans un problème, heures → jours et heures
CONV_H = variation(
    'Un voilier fait le tour d\'une île en ${{t}}$ heures. Combien de jours et d\'heures cela'
    ' fait-il ?\n\nCela fait $?$ jour(s) et $?~\\text{h}$.',
    [var('dj', '1..3'), var('rh', '1..23'), var('t', 'eval:24*dj+rh')],
    ['{{dj}}', '{{rh}}'],
    ['Un jour, c\'est $24$ heures.',
     'Dans ${{t}}$ heures, il y a ${{dj}}$ fois $24$ heures : ${{dj}} \\times 24 = ' + ev('24*dj')
     + '$, et il reste ${{t}} - ' + ev('24*dj') + ' = {{rh}}$ heures.',
     'Cela fait $' + col('{{dj}}') + '$ jour{{if:dj>1|s|}} et $' + col('{{rh}}~\\text{h}') + '$.'])

vs = [CHRONO, CONV_S, RELAIS, VOYAGE, CONV_H]
CH = {'k': 1, 'h': 10, 'a': 15, 'x': 40, 'c': 25, 'y': 35}      # 10 h 15 min 40 s + 25 min 35 s
RL = {'h': 14, 'a': 50, 'c1': 4, 'y1': 35, 'c2': 5, 'y2': 12, 'c3': 4, 'y3': 58}
VY = {'jd': 1, 'hd': 21, 'z': 8, 'n': 27, 'yc': 7}               # lundi 21 h 40 + 27 h 35 min
ecrire('05-problemes-de-durees-avec-les-secondes', modele(
    'Problèmes de durées (h, min, s, jours)',
    'Une ou plusieurs étapes, par instants intermédiaires : heure d\'arrivée d\'une course à la seconde,'
    ' secondes en minutes, relais en trois étapes, traversée sur plusieurs jours, heures en jours',
    11, vs,
    [spec('10 h 15 min 40 s + 25 min 35 s = 10 h 41 min 15 s', 0, vs, CH, ['10', '41', '15'], 'correct'),
     spec('Erreur : 100 s dans une minute, 10 h 40 min 75 s', 0, vs, CH, ['10', '40', '75'], 'incorrect'),
     spec('Erreur : retenue oubliée, 10 h 40 min 15 s', 0, vs, CH, ['10', '40', '15'], 'incorrect'),
     spec('Passe l\'heure : 9 h 50 min 30 s + 12 min 45 s = 10 h 03 min 15 s, « 03 »', 0, vs,
          {'k': 2, 'h': 9, 'a': 50, 'x': 30, 'c': 12, 'y': 45}, ['10', '03', '15'], 'correct'),
     spec('Erreur : 9 h 63 min 15 s', 0, vs, {'k': 2, 'h': 9, 'a': 50, 'x': 30, 'c': 12, 'y': 45},
          ['9', '63', '15'], 'incorrect'),
     spec('135 s = 2 min 15 s', 1, vs, {'k': 3, 'n': 2, 'y': 15}, ['2', '15'], 'correct'),
     spec('Erreur : 100 s dans une minute, 1 min 35 s', 1, vs, {'k': 3, 'n': 2, 'y': 15}, ['1', '35'],
          'incorrect'),
     spec('Relais : 14 h 50 + 4 min 35 s + 5 min 12 s + 4 min 58 s = 15 h 04 min 45 s', 2, vs, RL,
          ['15', '04', '45'], 'correct'),
     spec('Erreur : relais, 14 h 63 min 105 s', 2, vs, RL, ['14', '63', '105'], 'incorrect'),
     spec('Erreur : relais, dernier coureur oublié, 14 h 59 min 47 s', 2, vs, RL,
          ['14', '59', '47'], 'incorrect'),
     spec('Lundi 21 h 40 + 27 h 35 min = mercredi 1 h 15', 3, vs, VY, ['1', '15', '2'], 'correct'),
     spec('Erreur : 49 h 15 (minuit non passé)', 3, vs, VY, ['49', '15', '2'], 'incorrect'),
     spec('Erreur : bonne heure, le mardi', 3, vs, VY, ['1', '15', '1'], 'incorrect'),
     spec('Mardi 14 h + 15 h = mercredi 5 h', 3, vs, {'jd': 2, 'hd': 14, 'z': 0, 'n': 15, 'yc': 0},
          ['5', '0', '1'], 'correct'),
     spec('50 h = 2 jours 2 h', 4, vs, {'dj': 2, 'rh': 2}, ['2', '2'], 'correct'),
     spec('Erreur : 50 h lues comme 5 jours 0 h', 4, vs, {'dj': 2, 'rh': 2}, ['5', '0'], 'incorrect')],
    delay=180))

# ============================================================================

os.makedirs(DOSSIER, exist_ok=True)
for nom, mod in MODELES.items():
    with open(os.path.join(DOSSIER, nom + '.json'), 'w', encoding='utf-8') as f:
        json.dump(mod, f, ensure_ascii=False, indent='\t')
        f.write('\n')
print(f'{len(MODELES)} modèles écrits dans {DOSSIER}')
