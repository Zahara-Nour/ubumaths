"""Écrit les 7 modèles du lot 6b « Grandeurs et probabilités » de la 6e dans
scripts/questions/6-grandeurs/.

Phase 0 validée par David le 2026-10-29 (§ 13 du journal `docs/wip/questions-6-progress.md`, M7 à M13).
Bornes : `cycle3.json`, 6e (6-145 : rapport constant π, 3,14 au centième ; 6-146 : P = π × D,
P = 2 × π × R ; 6-147 : π ≈ 3,14 ; 6-153 : cm³ seulement, cube de 1 cm d'arête ; 6-156 : 365 ou
366 jours, 100 ans, 1 000 ans ; 6-158 : hérite de « general » ; 6-186 : probabilité entre 0 et 1,
impossible = 0, certain = 1). Un point par modèle ; le nœud et le tag sont posés par la migration de
rangement, après le `--publier` de David.

Décisions et pièges :
- choix en case choix (bloc ```choix, ADR 0033) ; le bon choix est le premier de la liste (indice 0) ;
- décimaux calculés en entiers (`314*d/100`) pour éviter les arrondis de flottants ;
- grandeurs en `\\unit{…}`, sauf juste après une case (`?~\\text{cm}` : case de nombre) ;
- horaires écrits « 7 h 05 » (minutes sur deux chiffres), durées « 1 h 40 min » ; réponse en deux
  cases h et min, comme les modèles de durées publiés ; horaires de jour (pas de passage à minuit) ;
- niveaux à la suite des niveaux publiés : Durées / Convertir (1 à 12 publiés) → 13 ;
  Probabilités / Apprivoiser / Probabilité simple (1 publié) → 2 ; catégories neuves : Périmètres /
  Périmètre d'un disque, Volumes / Unités, Durées / Problèmes.

    python3 docs/wip/questions/lot-6-grandeurs.py scripts/questions
"""
import json
import os
import subprocess
import sys

RACINE = sys.argv[1]
DOSSIER = os.path.join(RACINE, '6-grandeurs')


def spec(desc, vi, variables, answers, status, violations=None):
    s = {'description': desc, 'variationIndex': vi,
         'variables': {k: str(v) for k, v in variables.items()},
         'answers': answers if isinstance(answers, list) else [answers],
         'expected': {'status': status}}
    if violations:
        s['expected']['constraintViolations'] = violations
    return s


def modele(nom, title, description, theme, domain, subdomain, level, variations, specs,
           delay=30, options=None):
    m = {'title': title, 'description': description, 'grades': ['6'], 'theme': theme,
         'domain': domain, 'subdomain': subdomain, 'level': level, 'delay': delay,
         'status': 'draft'}
    if options:
        m['options'] = options
    m['variations'] = variations
    m['testSpecs'] = specs
    return nom, m


def var(nom, expression):
    return {'name': nom, 'expression': expression}


def variation(statement, variables, answers, steps, conditions=None):
    v = {'statement': statement, 'variables': variables}
    if conditions:
        v['conditions'] = conditions
    if answers is not None:
        v['blanks'] = [a if isinstance(a, dict) else {'expectedAnswer': a} for a in answers]
    v['correction'] = {'steps': steps}
    return v


def selon(nom, valeurs, debut=0):
    """`{{if:nom==debut|v0|{{if:nom==debut+1|v1|…}}}}` ; la dernière valeur est le « sinon »."""
    texte = valeurs[-1]
    for k in range(len(valeurs) - 2, -1, -1):
        texte = '{{if:' + nom + '==' + str(debut + k) + '|' + valeurs[k] + '|' + texte + '}}'
    return texte


def col(x, k=0):
    return '\\textcolor{{{color:primary.' + str(k) + '}}}{' + x + '}'


def choix(lignes, melanger=True):
    tete = '' if melanger else 'melanger: non\n'
    return '\n\n```choix\n' + tete + ''.join('- ' + l + '\n' for l in lignes) + '```'


def cm(x):
    return x + '~\\unit{cm}'


def horaire(h, m):
    """« 7 h 05 » : h et m sont des noms de variables, m entre 0 et 59."""
    return '{{' + h + '}}~\\text{h}~{{if:' + m + '<10|0{{' + m + '}}|{{' + m + '}}}}'


def duree(h, m):
    return '{{' + h + '}}~\\unit{h}~{{' + m + '}}~\\unit{min}'


HMIN = '$$?~\\text{h}~?~\\text{min}$$'
MODELES = []

# --- 7-9. 6-145, 6-146, 6-147 : périmètre d'un disque -------------------------------------

PROPORTIONNEL = ('**Périmètre d\'un disque.** Le périmètre d\'un disque est proportionnel à son'
                 ' diamètre : on l\'obtient en multipliant le diamètre par le nombre $\\pi$, qui'
                 ' vaut environ $3.14$.')
OBJETS = ['d\'une roue', 'd\'une assiette', 'd\'un disque']

DISQUE_AGRANDI = variation(
    'Le périmètre ' + selon('c', OBJETS) + ' de diamètre $' + cm('{{d}}') + '$ vaut environ $'
    + cm('{{eval:314*d/100;d}}') + '$.\n\nQuel est, environ, le périmètre '
    + selon('c', OBJETS) + ' de diamètre $' + cm('{{eval:k*d}}') + '$ ?\n\n$$?~\\text{cm}$$',
    [var('c', '0..2'), var('d', '1..5'), var('k', '2..4')],
    ['{{eval:314*d*k/100;d}}'],
    [PROPORTIONNEL,
     'Le diamètre est multiplié par ${{k}}$ (${{d}} \\times {{k}} = {{eval:k*d}}$) : le périmètre'
     ' aussi.',
     '$${{eval:314*d/100;d}} \\times {{k}} = ' + col('{{solution}}') + '$$'])

DIAMETRE_MULTIPLIE = variation(
    'Quand le diamètre d\'un disque est multiplié par ${{k}}$, son périmètre est :'
    + choix(['multiplié par ${{k}}$', 'multiplié par ${{eval:k*k}}$', 'augmenté de ${{k}}$',
             'le même']),
    [var('k', '2..4')],
    ['0'],
    [PROPORTIONNEL,
     'Le périmètre est $' + col('\\text{multiplié par } {{k}}') + '$, comme le diamètre.'])

RAPPORT = variation(
    'On mesure ' + selon('c', ['une roue', 'une assiette', 'un disque']) + ' : son diamètre vaut'
    ' $' + cm('{{d}}') + '$ et son périmètre environ $' + cm('{{eval:314*d/100;d}}') + '$.\n\n'
    'Combien vaut, environ, le périmètre divisé par le diamètre ?\n\n$$?$$',
    [var('c', '0..2'), var('d', '2..9')],
    ['3.14'],
    [PROPORTIONNEL,
     '$${{eval:314*d/100;d}} \\div {{d}} = ' + col('3.14') + '$$',
     'Pour tous les disques, on trouve le même nombre : $\\pi$, environ $3.14$.'])

MODELES.append(modele(
    '07-le-perimetre-du-disque-est-proportionnel-au-diametre',
    'Le périmètre d\'un disque est proportionnel à son diamètre',
    'Utiliser la proportionnalité entre périmètre et diamètre : diamètre multiplié par 2, périmètre'
    ' multiplié par 2 ; le périmètre divisé par le diamètre vaut toujours environ 3,14',
    'Grandeurs', 'Périmètres', 'Périmètre d\'un disque', 1,
    [DISQUE_AGRANDI, DIAMETRE_MULTIPLIE, RAPPORT],
    [spec('Diamètre 3 → 6 : 18,84', 0, {'c': 0, 'd': 3, 'k': 2}, '18,84', 'correct'),
     spec('Erreur : 12,42 (9,42 + 3)', 0, {'c': 0, 'd': 3, 'k': 2}, '12,42', 'incorrect'),
     spec('Diamètre 5 → 20 : 62,8', 0, {'c': 2, 'd': 5, 'k': 4}, '62,8', 'correct'),
     spec('Diamètre × 2 : périmètre × 2', 1, {'k': 2}, '0', 'correct'),
     spec('Erreur : × 4', 1, {'k': 2}, '1', 'incorrect'),
     spec('Erreur : augmenté de 2', 1, {'k': 2}, '2', 'incorrect'),
     spec('Rapport : 3,14', 2, {'c': 1, 'd': 7}, '3,14', 'correct'),
     spec('Erreur : 3,1', 2, {'c': 1, 'd': 7}, '3,1', 'incorrect')]))

FORMULE = ('**Périmètre d\'un disque.** Avec le diamètre $D$ : $P = \\pi \\times D$. Avec le rayon'
           ' $R$ (la moitié du diamètre) : $P = 2 \\times \\pi \\times R$.')

FORMULE_DIAMETRE = variation(
    'On note $D$ le diamètre ' + selon('c', OBJETS) + '.\n\nQuelle formule donne son périmètre'
    ' $P$ ?'
    + choix(['$P = \\pi \\times D$', '$P = \\pi \\times R$', '$P = 2 \\times \\pi \\times D$',
             '$P = \\pi \\times D \\times D$']),
    [var('c', '0..2')],
    ['0'],
    [FORMULE, 'Avec le diamètre : $' + col('P = \\pi \\times D') + '$.'])

FORMULE_RAYON = variation(
    'On note $R$ le rayon ' + selon('c', OBJETS) + '.\n\nQuelle formule donne son périmètre $P$ ?'
    + choix(['$P = 2 \\times \\pi \\times R$', '$P = \\pi \\times R$',
             '$P = 2 \\times \\pi \\times D$', '$P = \\pi \\times R \\times R$']),
    [var('c', '0..2')],
    ['0'],
    [FORMULE, 'Avec le rayon : $' + col('P = 2 \\times \\pi \\times R') + '$ (le diamètre vaut'
     ' $2 \\times R$).'])

MODELES.append(modele(
    '08-connaitre-la-formule-du-perimetre-d-un-disque',
    'Connaître la formule du périmètre d\'un disque',
    'Choisir la formule du périmètre : P = π × D avec le diamètre, P = 2 × π × R avec le rayon',
    'Grandeurs', 'Périmètres', 'Périmètre d\'un disque', 2,
    [FORMULE_DIAMETRE, FORMULE_RAYON],
    [spec('Diamètre : π × D', 0, {'c': 0}, '0', 'correct'),
     spec('Erreur : π × R', 0, {'c': 0}, '1', 'incorrect'),
     spec('Erreur : 2 × π × D', 0, {'c': 0}, '2', 'incorrect'),
     spec('Rayon : 2 × π × R', 1, {'c': 1}, '0', 'correct'),
     spec('Erreur : π × R', 1, {'c': 1}, '1', 'incorrect'),
     spec('Erreur : π × R × R', 1, {'c': 1}, '3', 'incorrect')]))

PI_314 = 'On prend $3.14$ pour $\\pi$.'

CALCUL_DIAMETRE = variation(
    PI_314 + '\n\nCalcule le périmètre ' + selon('c', OBJETS) + ' de diamètre $' + cm('{{d}}')
    + '$.\n\n$$?~\\text{cm}$$',
    [var('c', '0..2'), var('d', '1..20')],
    ['{{eval:314*d/100;d}}'],
    [FORMULE,
     '$$P = 3.14 \\times {{d}} = ' + col('{{solution}}') + '$$',
     'Le périmètre vaut environ $' + cm('{{solution}}') + '$.'])

CALCUL_RAYON = variation(
    PI_314 + '\n\nCalcule le périmètre ' + selon('c', OBJETS) + ' de rayon $' + cm('{{r}}')
    + '$.\n\n$$?~\\text{cm}$$',
    [var('c', '0..2'), var('r', '1..10')],
    ['{{eval:628*r/100;d}}'],
    [FORMULE,
     '$$P = 2 \\times 3.14 \\times {{r}} = 6.28 \\times {{r}} = ' + col('{{solution}}') + '$$',
     'Le périmètre vaut environ $' + cm('{{solution}}') + '$.'])

MODELES.append(modele(
    '09-calculer-le-perimetre-d-un-disque', 'Calculer le périmètre d\'un disque',
    'Calculer le périmètre d\'un disque avec 3,14 pour π : 3,14 × D avec le diamètre,'
    ' 2 × 3,14 × R avec le rayon',
    'Grandeurs', 'Périmètres', 'Périmètre d\'un disque', 3,
    [CALCUL_DIAMETRE, CALCUL_RAYON],
    [spec('Diamètre 5 : 15,7', 0, {'c': 0, 'd': 5}, '15,7', 'correct'),
     spec('Erreur : 78,5 (3,14 × 5 × 5)', 0, {'c': 0, 'd': 5}, '78,5', 'incorrect'),
     spec('Diamètre 12 : 37,68', 0, {'c': 1, 'd': 12}, '37,68', 'correct'),
     spec('Rayon 3 : 18,84', 1, {'c': 2, 'r': 3}, '18,84', 'correct'),
     spec('Erreur : 9,42 (rayon pris pour diamètre)', 1, {'c': 2, 'r': 3}, '9,42', 'incorrect'),
     spec('Erreur : 28,26 (3,14 × 3 × 3)', 1, {'c': 2, 'r': 3}, '28,26', 'incorrect')]))

# --- 10. 6-153 : le centimètre cube ---------------------------------------------------------

CM3 = ('**Centimètre cube.** Un cube de $1~\\unit{cm}$ d\'arête a un volume de $1~\\unit{cm^3}$'
       ' (un centimètre cube). Un volume se mesure en unités « cube » : $\\unit{cm^3}$.')

CUBE_UNITE = variation(
    'Quel est le volume d\'un cube de $1~\\unit{cm}$ d\'arête ?'
    + choix(['$1~\\unit{cm^3}$', '$1~\\unit{cm}$', '$1~\\unit{cm^2}$', '$1~\\unit{dm^3}$']),
    [],
    ['0'],
    [CM3, 'Son volume est $' + col('1~\\unit{cm^3}') + '$.'])

PAVE_CUBES = variation(
    'Un ' + selon('c', ['pavé', 'bloc', 'mur']) + ' est formé de ${{n}}$ cubes de $1~\\unit{cm}$'
    ' d\'arête, sans trou.\n\nQuel est son volume ?\n\n$$?~\\text{cm}^3$$',
    [var('c', '0..2'), var('n', '8..60')],
    ['{{n}}'],
    [CM3,
     'Chaque cube a un volume de $1~\\unit{cm^3}$ : ${{n}}$ cubes font $'
     + col('{{n}}~\\unit{cm^3}') + '$.'])

QUELLE_UNITE = variation(
    'Quelle unité choisir pour exprimer le volume ' + selon('c', ['d\'une boîte à chaussures',
                                                                 'd\'un dé à jouer',
                                                                 'd\'une brique de lait']) + ' ?'
    + choix(['$\\unit{cm^3}$', '$\\unit{cm}$', '$\\unit{cm^2}$']),
    [var('c', '0..2')],
    ['0'],
    [CM3, 'Un volume s\'exprime en $' + col('\\unit{cm^3}') + '$ ; $\\unit{cm}$ mesure une'
     ' longueur, $\\unit{cm^2}$ une aire.'])

MODELES.append(modele(
    '10-connaitre-le-centimetre-cube', 'Connaître le centimètre cube',
    'Savoir qu\'un cube de 1 cm d\'arête a un volume de 1 cm³, compter les cubes d\'un pavé pour'
    ' trouver son volume, distinguer cm, cm² et cm³',
    'Grandeurs', 'Volumes', 'Unités', 1,
    [CUBE_UNITE, PAVE_CUBES, QUELLE_UNITE],
    [spec('Cube de 1 cm : 1 cm³', 0, {'c': 0}, '0', 'correct'),
     spec('Erreur : 1 cm²', 0, {'c': 0}, '2', 'incorrect'),
     spec('24 cubes : 24 cm³', 1, {'c': 0, 'n': 24}, '24', 'correct'),
     spec('Erreur : 6 (arête comptée)', 1, {'c': 0, 'n': 24}, '6', 'incorrect'),
     spec('Volume d\'une boîte : cm³', 2, {'c': 0}, '0', 'correct'),
     spec('Erreur : cm²', 2, {'c': 0}, '2', 'incorrect')]))

# --- 11. 6-156 : années, siècles, millénaires ----------------------------------------------

CALENDRIER = ('**Calendrier.** Une année compte $365$ jours, ou $366$ jours si elle est'
              ' bissextile. Un siècle dure $100$ ans ; un millénaire, $1\\,000$ ans,'
              ' c\'est-à-dire $10$ siècles.')

SIECLES = variation(
    'Complète.\n\n$${{k}}~\\text{siècles} = ?~\\text{ans}$$',
    [var('k', '2..9')],
    ['{{eval:100*k}}'],
    [CALENDRIER, '$${{k}} \\times 100 = ' + col('{{solution}}') + '$$',
     '${{k}}$ siècles durent ${{solution}}$ ans.'])

MILLENAIRES = variation(
    'Complète.\n\n$${{k}}~\\text{millénaires} = ?~\\text{' + selon('u', ['ans', 'siècles'])
    + '}$$',
    [var('u', '0..1'), var('k', '2..9')],
    ['{{if:u==0|{{eval:1000*k}}|{{eval:10*k}}}}'],
    [CALENDRIER,
     '$${{k}} \\times ' + selon('u', ['1\\,000', '10']) + ' = ' + col('{{solution}}') + '$$',
     '${{k}}$ millénaires durent ${{solution}}$ ' + selon('u', ['ans', 'siècles']) + '.'])

JOURS = variation(
    'Combien de jours compte' + selon('b', [' une année bissextile', ' une année non bissextile',
                                           'nt deux années non bissextiles'])
    + ' ?\n\n$$?~\\text{jours}$$',
    [var('b', '0..2')],
    ['{{if:b==0|366|{{if:b==1|365|730}}}}'],
    [CALENDRIER,
     selon('b', ['Une année bissextile compte $' + col('366') + '$ jours.',
                 'Une année non bissextile compte $' + col('365') + '$ jours.',
                 '$$365 \\times 2 = ' + col('730') + '$$'])])

MODELES.append(modele(
    '11-annees-siecles-millenaires', 'Années, siècles et millénaires',
    'Connaître les durées du calendrier : 365 ou 366 jours dans une année, 100 ans dans un siècle,'
    ' 1 000 ans (10 siècles) dans un millénaire',
    'Grandeurs', 'Durées', 'Convertir', 13,
    [SIECLES, MILLENAIRES, JOURS],
    [spec('3 siècles : 300 ans', 0, {'k': 3}, '300', 'correct'),
     spec('Erreur : 30', 0, {'k': 3}, '30', 'incorrect'),
     spec('2 millénaires : 2 000 ans', 1, {'u': 0, 'k': 2}, '2000', 'correct'),
     spec('Erreur : 200 ans', 1, {'u': 0, 'k': 2}, '200', 'incorrect'),
     spec('4 millénaires : 40 siècles', 1, {'u': 1, 'k': 4}, '40', 'correct'),
     spec('Erreur : 4 000 siècles', 1, {'u': 1, 'k': 4}, '4000', 'incorrect'),
     spec('Bissextile : 366', 2, {'b': 0}, '366', 'correct'),
     spec('Erreur : 365 en bissextile', 2, {'b': 0}, '365', 'incorrect'),
     spec('Non bissextile : 365', 2, {'b': 1}, '365', 'correct'),
     spec('Deux années : 730', 2, {'b': 2}, '730', 'correct')]))

# --- 12. 6-158 : problèmes d'horaires et de durées -----------------------------------------

METHODE = ('**Horaires et durées.** On calcule étape par étape, en minutes si besoin, puis on'
           ' convertit : $60~\\unit{min} = 1~\\unit{h}$.')
MINUTES = '5|10|15|20|25|30|35|40|45|50|55'
ACTIVITES = ['séances de natation', 'cours de musique', 'entraînements de foot']

SEANCES = variation(
    'Cette semaine, ' + selon('p', ['Inès', 'Hugo', 'Malik']) + ' a ${{n}}$ '
    + selon('a', ACTIVITES) + ' de ${{d}}~\\unit{min}$ chacun' + selon('a', ['e', '', '']) + '.\n\n'
    'Quelle est la durée totale ?\n\n' + HMIN,
    [var('p', '0..2'), var('a', '0..2'), var('n', '2..4'), var('d', '30|40|45|50'),
     var('t', 'eval:n*d'), var('q', 'eval:floor(t/60)'), var('m', 'eval:t-60*q')],
    ['{{q}}', '{{m}}'],
    [METHODE,
     '$${{n}} \\times {{d}}~\\unit{min} = {{t}}~\\unit{min}$$',
     '$${{t}}~\\unit{min} = {{q}} \\times 60~\\unit{min} + {{m}}~\\unit{min} = '
     + col(duree('q', 'm')) + '$$'],
    ['t>60', 'm>0'])  # pas de « 3 h 0 min » (David, 2026-10-30)

TRAJET = variation(
    'Un car part à $' + horaire('h', 'm') + '$. Le trajet dure $' + duree('a', 'b') + '$, plus un'
    ' arrêt de ${{s}}~\\unit{min}$ en route.\n\nÀ quelle heure arrive-t-il ?\n\n' + HMIN,
    [var('h', '6..9'), var('m', MINUTES), var('a', '1..3'), var('b', MINUTES),
     var('s', '10|15|20|30'),
     var('t', 'eval:60*h+m+60*a+b+s'), var('H', 'eval:floor(t/60)'), var('M', 'eval:t-60*H')],
    ['{{H}}', '{{M}}'],
    [METHODE,
     'Durée en route : $' + duree('a', 'b') + ' + {{s}}~\\unit{min} = '
     '{{eval:floor((60*a+b+s)/60)}}~\\unit{h}~{{eval:60*a+b+s-60*floor((60*a+b+s)/60)}}'
     '~\\unit{min}$.',
     '$$' + horaire('h', 'm') + ' + {{eval:floor((60*a+b+s)/60)}}~\\unit{h}~'
     '{{eval:60*a+b+s-60*floor((60*a+b+s)/60)}}~\\unit{min} = ' + col(horaire('H', 'M')) + '$$'])

FILM = variation(
    'La séance de cinéma commence à $' + horaire('h', 'm') + '$ par ${{p}}~\\unit{min}$ de'
    ' publicités, puis le film. Elle se termine à $' + horaire('H', 'M') + '$.\n\n'
    'Combien de temps dure le film ?\n\n' + HMIN,
    [var('h', '14..19'), var('m', MINUTES), var('p', '10|15|20'), var('a', '1..2'),
     var('b', MINUTES),
     var('t', 'eval:60*h+m+p+60*a+b'), var('H', 'eval:floor(t/60)'), var('M', 'eval:t-60*H')],
    ['{{a}}', '{{b}}'],
    [METHODE,
     'Le film commence après les publicités : $' + horaire('h', 'm') + ' + {{p}}~\\unit{min} = '
     + horaire('X', 'Y') + '$.',
     'De $' + horaire('X', 'Y') + '$ à $' + horaire('Z', 'Y') + '$ : ${{a}}~\\unit{h}$ ; de $'
     + horaire('Z', 'Y') + '$ à $' + horaire('H', 'M') + '$ : ${{b}}~\\unit{min}$.',
     'Le film dure $' + col(duree('a', 'b')) + '$.'])
FILM['variables'] += [var('X', 'eval:floor((60*h+m+p)/60)'), var('Y', 'eval:60*h+m+p-60*X'),
                      var('Z', 'eval:X+a')]

MODELES.append(modele(
    '12-resoudre-un-probleme-d-horaires-et-de-durees',
    'Résoudre un problème d\'horaires et de durées',
    'Problèmes à deux étapes : durée totale de plusieurs séances, horaire d\'arrivée avec un'
    ' arrêt, durée d\'un film précédé de publicités',
    'Grandeurs', 'Durées', 'Problèmes', 1,
    [SEANCES, TRAJET, FILM],
    [spec('3 × 45 min : 2 h 15', 0, {'p': 0, 'a': 0, 'n': 3, 'd': 45, 't': 135, 'q': 2, 'm': 15},
          ['2', '15'], 'correct'),
     spec('Erreur : 1 h 35 (135 lu en h)', 0,
          {'p': 0, 'a': 0, 'n': 3, 'd': 45, 't': 135, 'q': 2, 'm': 15}, ['1', '35'], 'incorrect'),
     spec('7 h 50 + 2 h 25 + 15 min : 10 h 30', 1,
          {'h': 7, 'm': 50, 'a': 2, 'b': 25, 's': 15, 't': 630, 'H': 10, 'M': 30},
          ['10', '30'], 'correct'),
     spec('Erreur : 10 h 15 (arrêt oublié)', 1,
          {'h': 7, 'm': 50, 'a': 2, 'b': 25, 's': 15, 't': 630, 'H': 10, 'M': 30},
          ['10', '15'], 'incorrect'),
     spec('20 h 45 → 22 h 35, 10 min de pub : 1 h 40', 2,
          {'h': 20, 'm': 45, 'p': 10, 'a': 1, 'b': 40, 't': 1355, 'H': 22, 'M': 35, 'X': 20,
           'Y': 55, 'Z': 21}, ['1', '40'], 'correct'),
     spec('Erreur : 1 h 50 (publicités oubliées)', 2,
          {'h': 20, 'm': 45, 'p': 10, 'a': 1, 'b': 40, 't': 1355, 'H': 22, 'M': 35, 'X': 20,
           'Y': 55, 'Z': 21}, ['1', '50'], 'incorrect')]))

# --- 13. 6-186 : une probabilité est comprise entre 0 et 1 ---------------------------------

ENTRE_0_ET_1 = ('**Probabilité.** La probabilité d\'un évènement est un nombre compris entre $0$ et'
                ' $1$ : $0$ pour un évènement impossible, $1$ pour un évènement certain.')
HORS = ['$1.2$', '$\\dfrac{3}{2}$', '$120\\,\\%$']

PAS_UNE_PROBABILITE = variation(
    'Lequel de ces nombres ne peut pas être une probabilité ?'
    + choix([selon('l', HORS), '$0.5$', '$1$', '$0$']),
    [var('l', '0..2')],
    ['0'],
    [ENTRE_0_ET_1,
     '$0$, $0.5$ et $1$ sont compris entre $0$ et $1$ ; ' + selon('l', HORS)
     + ' est plus grand que $1$ : ce n\'est pas une probabilité.'])

SAC_ROUGE = variation(
    'Un sac contient ${{n}}$ boules, toutes rouges. On tire une boule au hasard.\n\nQuelle est la'
    ' probabilité de tirer une boule ' + selon('c', ['rouge', 'verte']) + ' ?\n\n$$?$$',
    [var('c', '0..1'), var('n', '3..12')],
    ['{{if:c==0|1|0}}'],
    [ENTRE_0_ET_1,
     selon('c', ['Toutes les boules sont rouges : tirer une boule rouge est certain. La'
                 ' probabilité est $' + col('1') + '$.',
                 'Aucune boule n\'est verte : tirer une boule verte est impossible. La'
                 ' probabilité est $' + col('0') + '$.'])])

MODELES.append(modele(
    '13-une-probabilite-est-comprise-entre-0-et-1',
    'Une probabilité est comprise entre 0 et 1',
    'Savoir qu\'une probabilité est un nombre entre 0 et 1 : écarter 1,2 ou 120 % ; un évènement'
    ' certain a pour probabilité 1, un évènement impossible 0',
    'Probabilités', 'Apprivoiser', 'Probabilité simple', 2,
    [PAS_UNE_PROBABILITE, SAC_ROUGE],
    [spec('1,2 n\'est pas une probabilité', 0, {'l': 0}, '0', 'correct'),
     spec('Erreur : 1', 0, {'l': 0}, '2', 'incorrect'),
     spec('Erreur : 0', 0, {'l': 2}, '3', 'incorrect'),
     spec('Toutes rouges : rouge certain, 1', 1, {'c': 0, 'n': 5}, '1', 'correct'),
     spec('Erreur : 100', 1, {'c': 0, 'n': 5}, '100', 'incorrect'),
     spec('Erreur : 5 (nombre de boules)', 1, {'c': 0, 'n': 5}, '5', 'incorrect'),
     spec('Verte impossible : 0', 1, {'c': 1, 'n': 5}, '0', 'correct'),
     spec('Erreur : 1 pour la verte', 1, {'c': 1, 'n': 5}, '1', 'incorrect')]))

os.makedirs(DOSSIER, exist_ok=True)
for nom, m in MODELES:
    with open(os.path.join(DOSSIER, nom + '.json'), 'w', encoding='utf-8') as f:
        json.dump(m, f, ensure_ascii=False, indent='\t')
        f.write('\n')
# Mis en forme comme le pre-commit, pour que le script redonne les fichiers commités
subprocess.run(['pnpm', 'exec', 'prettier', '--write', DOSSIER], check=True,
               stdout=subprocess.DEVNULL)
print(f'{len(MODELES)} modèles écrits dans {DOSSIER}')
