"""Écrit les 8 modèles du lot 2 « Relatifs » de la 5e dans scripts/questions/5-relatifs/.

Phase 0 validée par David le 2026-10-28 (« je te suis ») ; un point par modèle, thème « Relatifs » :

| # | Point | Titre | Variations | Réponse | Catégorie, niveau |
| 1 | 5-120 | Donner la valeur absolue d'un nombre | entier négatif ; entier positif ; décimal relatif
|   |       | (une décimale) — en mots, « (sa distance à zéro) », jamais |a| | case |
|   |       | Apprivoiser › Valeur absolue, 1 |
| 2 | 5-014 | Positif, négatif, strictement ? | négatif ; positif ; zéro | choix à plusieurs réponses
|   |       | (½ si incomplet) | Apprivoiser › La définition d'un nombre négatif, 4 (1 à 3 pris) |
| 3 | 5-015 | Traduire une situation par un nombre relatif | température ; altitude (sous ou
|   |       | au-dessus du niveau de la mer) ; date avant J.-C. ; étage en sous-sol | case |
|   |       | Apprivoiser › Grandeurs négatives, 1 |
| 4 | 5-019 | Additionner plusieurs nombres relatifs | trois entiers ; quatre entiers dont deux
|   |       | opposés | case | Additionner et soustraire › Sommes de plusieurs nombres, 1 |
| 5 | 5-019 | idem, décimaux à une décimale | idem | case | idem, 2 |
| 6 | 5-024 | Variation de température ou d'altitude | monte en passant 0 ; baisse en passant 0 ;
|   |       | sous-marin qui remonte ; qui descend | case, unité après la case |
|   |       | Additionner et soustraire › Problèmes, 1 |
| 7 | 5-024 | Calculer un écart | entre −a °C et b °C ; entre deux négatives ; décimaux | case |
|   |       | idem, 2 |
| 8 | 5-021 | Les parenthèses sont-elles indispensables ? | a + (−b), (−a) + b, −(−a), −(a + b),
|   |       | −(a − b), (−a) seul | choix Oui / Non | Additionner et soustraire › Sommes algébriques, 5
|   |       | (1 à 4 pris) |

Bornes : `cycle4.json`, 5e (5-120 : valeur absolue en mots, ni barres ni calcul ; 5-019 et 5-024 :
décimaux relatifs, une ou deux décimales ; 5-021 : écritures (−2), −(−2), −(2 + 3), 3 + (−2),
−(2 − 3)). Le nœud et le tag sont posés par la migration de rangement, après le `--publier` de David.

Décisions et pièges :
- décimaux tirés en dixièmes entiers (`X/10;d`), calculés en entiers ; séparés des entiers
  (niveau 2), sauf pour la valeur absolue (même idée) ;
- les signes sont fixés par variation (pas de `;±`) : l'écriture avec parenthèses reste lisible ;
- unité écrite après la case (`$?~\\unit{°C}$`) : la réponse attendue est le nombre seul ;
- choix : indice d'origine, `melanger: non` pour Oui / Non et pour les quatre mots ;
- variables `e` et `i` interdites dans les `eval`.

    python3 docs/wip/questions/lot-5-relatifs.py scripts/questions/5-relatifs
"""
import json
import os
import subprocess
import sys

DOSSIER = sys.argv[1]


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
    m = {'title': title, 'description': description, 'grades': ['5'], 'theme': theme,
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


def col(x, k=0):
    return '\\textcolor{{{color:primary.' + str(k) + '}}}{' + x + '}'


def choix(lignes, melanger=True, plusieurs=False):
    tete = ('plusieurs: oui\n' if plusieurs else '') + ('' if melanger else 'melanger: non\n')
    return '\n\n```choix\n' + tete + ''.join('- ' + l + '\n' for l in lignes) + '```'


def ev(x):
    return '{{eval:' + x + '}}'


def deg(x):
    return x + '~\\unit{°C}'


def metres(x):
    return x + '~\\unit{m}'


R = 'Relatifs'
APPRIVOISER = 'Apprivoiser'
ADD_SOUS = 'Additionner et soustraire'
MODELES = []

# Dixième non entier : un décimal à une décimale, pas un entier déguisé
DIXIEMES = [var('X', '11..99'), var('x', 'eval:X/10;d')]

# --- 1. 5-120 : valeur absolue -------------------------------------------------------------

VA_QUESTION = 'Quelle est la valeur absolue de $NB$ (sa distance à zéro) ?\n\n$?$'
VA_DEF = ('**Valeur absolue.** La valeur absolue d\'un nombre est sa **distance à zéro** sur la'
          ' droite graduée : c\'est le nombre sans son signe.')

VA_NEGATIF = variation(
    VA_QUESTION.replace('NB', '-{{a}}'), [var('a', '1..50')], ['{{a}}'],
    [VA_DEF,
     '$-{{a}}$ est à ${{a}}$ unités de zéro : sa valeur absolue est ' + col('{{a}}').join('$$')
     + '.'])
VA_POSITIF = variation(
    VA_QUESTION.replace('NB', '{{a}}'), [var('a', '1..50')], ['{{a}}'],
    [VA_DEF,
     '${{a}}$ est positif : il est déjà à ${{a}}$ unités de zéro. Sa valeur absolue est '
     + col('{{a}}').join('$$') + '.'])
VA_DECIMAL = variation(
    VA_QUESTION.replace('NB', '-{{x}}'), DIXIEMES, ['{{x}}'],
    [VA_DEF,
     '$-{{x}}$ est à ${{x}}$ unités de zéro : sa valeur absolue est ' + col('{{x}}').join('$$')
     + '.'],
    ['mod(X,10)!=0'])

MODELES.append(modele(
    '01-valeur-absolue', 'Donner la valeur absolue d\'un nombre',
    'Donner la valeur absolue (la distance à zéro) d\'un nombre relatif : celle de −7 est 7,'
    ' celle de 12 est 12, celle de −4,5 est 4,5',
    R, APPRIVOISER, 'Valeur absolue', 1,
    [VA_NEGATIF, VA_POSITIF, VA_DECIMAL],
    [spec('Valeur absolue de −7 : 7', 0, {'a': 7}, '7', 'correct'),
     spec('Erreur : −7 (le nombre recopié)', 0, {'a': 7}, '-7', 'incorrect'),
     spec('Valeur absolue de 12 : 12', 1, {'a': 12}, '12', 'correct'),
     spec('Erreur : −12 (l\'opposé)', 1, {'a': 12}, '-12', 'incorrect'),
     spec('Valeur absolue de −4,5 : 4,5', 2, {'X': 45, 'x': '4.5'}, '4,5', 'correct'),
     spec('Erreur : −4,5', 2, {'X': 45, 'x': '4.5'}, '-4,5', 'incorrect')],
    delay=20))

# --- 2. 5-014 : positif, négatif, strictement ----------------------------------------------
# Choix dans l'ordre écrit : 0 positif, 1 strictement positif, 2 négatif, 3 strictement négatif.

MOTS = choix(['positif', 'strictement positif', 'négatif', 'strictement négatif'],
             melanger=False, plusieurs=True)
SIGNE_DEF = ('**Vocabulaire.** Un nombre **positif** est supérieur ou égal à $0$ ; **strictement**'
             ' positif, il est supérieur à $0$ (et différent de $0$). De même pour **négatif** et'
             ' **strictement négatif**.')
SIGNE_QUESTION = 'Le nombre $NB$ est :' + MOTS
NOMBRE_DIXIEMES = [var('X', '1..150'), var('x', 'eval:X/10;d')]

SIGNE_NEGATIF = variation(
    SIGNE_QUESTION.replace('NB', '-{{x}}'), NOMBRE_DIXIEMES, ['2;3'],
    [SIGNE_DEF,
     '$-{{x}}$ est inférieur à $0$ et différent de $0$ : il est ' + col('\\text{négatif}').join('$$')
     + ' et ' + col('\\text{strictement négatif}').join('$$') + '.'])
SIGNE_POSITIF = variation(
    SIGNE_QUESTION.replace('NB', '{{x}}'), NOMBRE_DIXIEMES, ['0;1'],
    [SIGNE_DEF,
     '${{x}}$ est supérieur à $0$ et différent de $0$ : il est ' + col('\\text{positif}').join('$$')
     + ' et ' + col('\\text{strictement positif}').join('$$') + '.'])
SIGNE_ZERO = variation(
    SIGNE_QUESTION.replace('NB', '0'), [], ['0;2'],
    [SIGNE_DEF,
     '$0$ est supérieur ou égal à $0$, et inférieur ou égal à $0$ : il est à la fois '
     + col('\\text{positif}').join('$$') + ' et ' + col('\\text{négatif}').join('$$') + '.',
     'Il n\'est ni strictement positif, ni strictement négatif.'])

MODELES.append(modele(
    '02-positif-negatif-strictement', 'Positif, négatif, strictement ?',
    'Dire si un nombre est positif, strictement positif, négatif, strictement négatif : −3,5 est'
    ' négatif et strictement négatif ; 0 est positif et négatif',
    R, APPRIVOISER, 'La définition d\'un nombre négatif', 4,
    [SIGNE_NEGATIF, SIGNE_POSITIF, SIGNE_ZERO],
    [spec('−3,5 : négatif et strictement négatif', 0, {'X': 35, 'x': '3.5'}, '2;3', 'correct'),
     spec('« strictement négatif » seul (½)', 0, {'X': 35, 'x': '3.5'}, '3', 'unoptimal_form'),
     spec('Erreur : positif coché', 0, {'X': 35, 'x': '3.5'}, '0;2;3', 'incorrect'),
     spec('7 : positif et strictement positif', 1, {'X': 70, 'x': '7'}, '0;1', 'correct'),
     spec('Erreur : négatif', 1, {'X': 70, 'x': '7'}, '2', 'incorrect'),
     spec('0 : positif et négatif', 2, {}, '0;2', 'correct'),
     spec('« positif » seul (½)', 2, {}, '0', 'unoptimal_form'),
     spec('Erreur : strictement positif', 2, {}, '0;1', 'incorrect')],
    options={'constraints': {'spaces': 'off'}}))

# --- 3. 5-015 : traduire une situation par un nombre relatif -------------------------------

SITUATION_DEF = ('**Nombres relatifs.** On repère par un nombre **négatif** ce qui est en dessous'
                 ' (ou avant) le repère $0$ ; par un nombre **positif** ce qui est au-dessus (ou'
                 ' après).')

TEMPERATURE = variation(
    'Le thermomètre indique ${{a}}$ degrés au-dessous de zéro.\n\nQuelle température'
    ' indique-t-il ?\n\n$' + deg('?') + '$',
    [var('a', '1..20')], ['-{{a}}'],
    [SITUATION_DEF,
     'Au-dessous de zéro, la température est négative : ' + col(deg('-{{a}}')).join('$$') + '.'])
ALTITUDE = variation(
    '{{if:s==0|Un plongeur se trouve à ${{a}}$ mètres sous le niveau de la mer.|Un randonneur'
    ' se trouve à ${{a}}$ mètres au-dessus du niveau de la mer.}}\n\nQuelle est son altitude'
    ' ?\n\n$' + metres('?') + '$',
    [var('s', '0..1'), var('a', '2..900'), var('alt', 'eval:(2*s-1)*a')], ['{{alt}}'],
    ['**Altitude.** Le niveau de la mer est l\'altitude $0$ : en dessous, l\'altitude est'
     ' négative ; au-dessus, elle est positive.',
     '{{if:s==0|Sous le niveau de la mer|Au-dessus du niveau de la mer}} : l\'altitude est '
     + col(metres('{{alt}}')).join('$$') + '.'],
    ['s==1 || a<=60'])
DATE = variation(
    'Sur une frise chronologique, l\'an $1$ est repéré par le nombre $1$, et les années avant'
    ' Jésus-Christ par des nombres négatifs.\n\nQuel nombre repère l\'an ${{a}}$ avant'
    ' J.-C. ?\n\n$?$',
    [var('a', '20..800')], ['-{{a}}'],
    [SITUATION_DEF,
     'Avant J.-C., l\'année est repérée par un nombre négatif : ' + col('-{{a}}').join('$$') + '.'])
ETAGE = variation(
    'Dans un immeuble, le rez-de-chaussée est l\'étage $0$. L\'ascenseur s\'arrête au'
    ' {{if:a==1|premier|{{if:a==2|deuxième|troisième}}}} sous-sol.\n\nQuel est le numéro de'
    ' cet étage ?\n\n$?$',
    [var('a', '1..3')], ['-{{a}}'],
    [SITUATION_DEF,
     'Les sous-sols sont sous le rez-de-chaussée : leurs numéros sont négatifs. Le numéro est '
     + col('-{{a}}').join('$$') + '.'])

MODELES.append(modele(
    '03-traduire-par-un-relatif', 'Traduire une situation par un nombre relatif',
    'Repérer par un nombre relatif une température (4 degrés au-dessous de zéro : −4 °C), une'
    ' altitude, une date avant J.-C., un étage en sous-sol',
    R, APPRIVOISER, 'Grandeurs négatives', 1,
    [TEMPERATURE, ALTITUDE, DATE, ETAGE],
    [spec('4 degrés au-dessous de zéro : −4', 0, {'a': 4}, '-4', 'correct'),
     spec('Erreur : 4 (signe oublié)', 0, {'a': 4}, '4', 'incorrect'),
     spec('Plongeur à 15 m sous la mer : −15', 1, {'s': 0, 'a': 15, 'alt': -15}, '-15', 'correct'),
     spec('Erreur : 15', 1, {'s': 0, 'a': 15, 'alt': -15}, '15', 'incorrect'),
     spec('Randonneur à 450 m : 450', 1, {'s': 1, 'a': 450, 'alt': 450}, '450', 'correct'),
     spec('Erreur : −450', 1, {'s': 1, 'a': 450, 'alt': 450}, '-450', 'incorrect'),
     spec('An 52 avant J.-C. : −52', 2, {'a': 52}, '-52', 'correct'),
     spec('Erreur : 52', 2, {'a': 52}, '52', 'incorrect'),
     spec('2e sous-sol : −2', 3, {'a': 2}, '-2', 'correct'),
     spec('Erreur : 2', 3, {'a': 2}, '2', 'incorrect')],
    delay=45))

# --- 4 et 5. 5-019 : additionner plusieurs nombres relatifs --------------------------------

PLUSIEURS_DEF = ('**Plusieurs termes.** On peut additionner dans l\'ordre que l\'on veut : on'
                 ' regroupe les nombres positifs, puis les nombres négatifs, puis on conclut.')
OPPOSES_DEF = ('**Opposés.** La somme de deux nombres opposés est nulle : on commence par les'
               ' regrouper.')
CALCULE = 'Calcule.\n\n$$CALCUL = ?$$'


def trois(a, b, c, va, vb, vc, somme_neg, resultat):
    """(−a) + b + (−c) : `va`… sont les écritures, `somme_neg` la somme des distances a + c."""
    return variation(
        CALCULE.replace('CALCUL', '(-' + a + ') + ' + b + ' + (-' + c + ')'), va + vb + vc,
        [resultat],
        [PLUSIEURS_DEF,
         'Les nombres négatifs : $(-' + a + ') + (-' + c + ') = ' + col('-' + somme_neg, 1) + '$.',
         '$$(-' + a + ') + ' + b + ' + (-' + c + ') = ' + col('-' + somme_neg, 1) + ' + ' + b
         + ' = ' + col('{{solution}}') + '$$'])


def quatre(a, b, c, va, vb, vc, resultat):
    """(−a) + b + a + (−c) : −a et a s'annulent."""
    return variation(
        CALCULE.replace('CALCUL', '(-' + a + ') + ' + b + ' + ' + a + ' + (-' + c + ')'),
        va + vb + vc, [resultat],
        [OPPOSES_DEF,
         '$' + col('(-' + a + ')', 1) + '$ et $' + col(a, 1) + '$ sont opposés : leur somme est'
         ' $0$.',
         '$$(-' + a + ') + ' + b + ' + ' + a + ' + (-' + c + ') = ' + b + ' + (-' + c + ') = '
         + col('{{solution}}') + '$$'])


ENTIERS = [var('a', '2..9')], [var('b', '2..9')], [var('c', '2..9')]
TROIS_ENTIERS = trois('{{a}}', '{{b}}', '{{c}}', *ENTIERS, ev('a+c'), '{{eval:-a+b-c}}')
QUATRE_ENTIERS = quatre('{{a}}', '{{b}}', '{{c}}', *ENTIERS, '{{eval:b-c}}')
QUATRE_ENTIERS['conditions'] = ['b!=c', 'a!=b', 'a!=c']

DECIMAUX = ([var('A', '11..99'), var('x', 'eval:A/10;d')], [var('B', '11..99'),
            var('y', 'eval:B/10;d')], [var('C', '11..99'), var('z', 'eval:C/10;d')])
NON_ENTIERS = ['mod(A,10)!=0', 'mod(B,10)!=0', 'mod(C,10)!=0']
TROIS_DECIMAUX = trois('{{x}}', '{{y}}', '{{z}}', *DECIMAUX, ev('(A+C)/10;d'),
                       '{{eval:(-A+B-C)/10;d}}')
TROIS_DECIMAUX['conditions'] = NON_ENTIERS
QUATRE_DECIMAUX = quatre('{{x}}', '{{y}}', '{{z}}', *DECIMAUX, '{{eval:(B-C)/10;d}}')
QUATRE_DECIMAUX['conditions'] = NON_ENTIERS + ['B!=C', 'A!=B', 'A!=C']

ABC = {'a': 7, 'b': 4, 'c': 2}
MODELES.append(modele(
    '04-additionner-plusieurs-relatifs', 'Additionner plusieurs nombres relatifs',
    'Additionner trois ou quatre entiers relatifs en regroupant les positifs, les négatifs et les'
    ' opposés : (−7) + 4 + (−2) ; (−7) + 4 + 7 + (−2)',
    R, ADD_SOUS, 'Sommes de plusieurs nombres', 1,
    [TROIS_ENTIERS, QUATRE_ENTIERS],
    [spec('(−7) + 4 + (−2) = −5', 0, ABC, '-5', 'correct'),
     spec('Erreur : signe perdu (5)', 0, ABC, '5', 'incorrect'),
     spec('Erreur : tout ajouté sans les signes (13)', 0, ABC, '13', 'incorrect'),
     spec('(−7) + 4 + 7 + (−2) = 2', 1, ABC, '2', 'correct'),
     spec('Erreur : −2 (les opposés oubliés, puis 4 retiré)', 1, ABC, '-2', 'incorrect'),
     spec('Erreur : 16 (signes ignorés)', 1, ABC, '16', 'incorrect')],
    delay=45))

XYZ = {'A': 35, 'x': '3.5', 'B': 12, 'y': '1.2', 'C': 24, 'z': '2.4'}
MODELES.append(modele(
    '05-additionner-plusieurs-relatifs-decimaux', 'Additionner plusieurs nombres relatifs',
    'Additionner trois ou quatre décimaux relatifs (une décimale) en regroupant les positifs, les'
    ' négatifs et les opposés : (−3,5) + 1,2 + (−2,4) ; (−3,5) + 1,2 + 3,5 + (−2,4)',
    R, ADD_SOUS, 'Sommes de plusieurs nombres', 2,
    [TROIS_DECIMAUX, QUATRE_DECIMAUX],
    [spec('(−3,5) + 1,2 + (−2,4) = −4,7', 0, XYZ, '-4,7', 'correct'),
     spec('Erreur : signe perdu (4,7)', 0, XYZ, '4,7', 'incorrect'),
     spec('(−3,5) + 1,2 + 3,5 + (−2,4) = −1,2', 1, XYZ, '-1,2', 'correct'),
     spec('Erreur : 1,2 (−2,4 oublié)', 1, XYZ, '1,2', 'incorrect')],
    delay=60))

# --- 6. 5-024 : variation de température ou d'altitude -------------------------------------

MONTE = variation(
    'Ce matin, le thermomètre indiquait $' + deg('-{{a}}') + '$. Dans la journée, la température'
    ' a monté de $' + deg('{{b}}') + '$.\n\nQuelle température indique-t-il maintenant'
    ' ?\n\n$' + deg('?') + '$',
    [var('a', '2..12'), var('b', '3..20')], ['{{eval:b-a}}'],
    ['**Monter**, c\'est ajouter : on calcule $-{{a}} + {{b}}$.',
     '$$-{{a}} + {{b}} = ' + col('{{solution}}') + '$$',
     'Le thermomètre indique $' + col(deg('{{solution}}')) + '$.'],
    ['b>a'])
BAISSE = variation(
    'À midi, le thermomètre indiquait $' + deg('{{a}}') + '$. Dans la nuit, la température a'
    ' baissé de $' + deg('{{b}}') + '$.\n\nQuelle température indique-t-il maintenant'
    ' ?\n\n$' + deg('?') + '$',
    [var('a', '2..12'), var('b', '3..20')], ['{{eval:a-b}}'],
    ['**Baisser**, c\'est soustraire : on calcule ${{a}} - {{b}}$.',
     '$${{a}} - {{b}} = ' + col('{{solution}}') + '$$',
     'Le thermomètre indique $' + col(deg('{{solution}}')) + '$.'],
    ['b>a'])
REMONTE = variation(
    'Un sous-marin est à l\'altitude $' + metres('-{{a}}') + '$. Il remonte de $'
    + metres('{{b}}') + '$.\n\nQuelle est sa nouvelle altitude ?\n\n$' + metres('?') + '$',
    [var('A', '5..30'), var('B', '1..20'), var('a', 'eval:10*A'), var('b', 'eval:10*B')], ['{{eval:b-a}}'],
    ['**Remonter**, c\'est ajouter : on calcule $-{{a}} + {{b}}$.',
     '$$-{{a}} + {{b}} = ' + col('{{solution}}') + '$$',
     'Le sous-marin est à l\'altitude $' + col(metres('{{solution}}')) + '$.'],
    ['B<A'])
DESCEND = variation(
    'Un sous-marin est à l\'altitude $' + metres('-{{a}}') + '$. Il descend de $'
    + metres('{{b}}') + '$.\n\nQuelle est sa nouvelle altitude ?\n\n$' + metres('?') + '$',
    [var('A', '5..30'), var('B', '1..20'), var('a', 'eval:10*A'), var('b', 'eval:10*B')], ['{{eval:-a-b}}'],
    ['**Descendre**, c\'est soustraire : on calcule $-{{a}} - {{b}}$.',
     '$$-{{a}} - {{b}} = ' + col('{{solution}}') + '$$',
     'Le sous-marin est à l\'altitude $' + col(metres('{{solution}}')) + '$.'],
    )

MODELES.append(modele(
    '06-variation-temperature-altitude', 'Variation de température ou d\'altitude',
    'Calculer une température qui monte ou baisse en passant par 0 (−5 °C, puis +8 °C), une'
    ' altitude de sous-marin qui remonte ou descend',
    R, ADD_SOUS, 'Problèmes', 1,
    [MONTE, BAISSE, REMONTE, DESCEND],
    [spec('−5 °C, monte de 8 : 3', 0, {'a': 5, 'b': 8}, '3', 'correct'),
     spec('Erreur : −13 (la hausse retirée)', 0, {'a': 5, 'b': 8}, '-13', 'incorrect'),
     spec('Erreur : −3 (signe de −5 gardé)', 0, {'a': 5, 'b': 8}, '-3', 'incorrect'),
     spec('4 °C, baisse de 9 : −5', 1, {'a': 4, 'b': 9}, '-5', 'correct'),
     spec('Erreur : 5 (signe oublié)', 1, {'a': 4, 'b': 9}, '5', 'incorrect'),
     spec('−120 m, remonte de 50 : −70', 2, {'A': 12, 'B': 5, 'a': 120, 'b': 50}, '-70', 'correct'),
     spec('Erreur : −170', 2, {'A': 12, 'B': 5, 'a': 120, 'b': 50}, '-170', 'incorrect'),
     spec('−120 m, descend de 50 : −170', 3, {'A': 12, 'B': 5, 'a': 120, 'b': 50}, '-170', 'correct'),
     spec('Erreur : −70', 3, {'A': 12, 'B': 5, 'a': 120, 'b': 50}, '-70', 'incorrect')],
    delay=60))

# --- 7. 5-024 : calculer un écart ----------------------------------------------------------

ECART_DEF = ('**Écart.** L\'écart entre deux températures est la plus grande moins la plus petite'
             ' : on calcule une différence.')
ECART_FIN = ('Quel est l\'écart entre ces deux températures ?\n\n$' + deg('?') + '$')

ECART_SIGNES = variation(
    'La nuit, il a fait $' + deg('-{{a}}') + '$ ; l\'après-midi, $' + deg('{{b}}') + '$.\n\n'
    + ECART_FIN,
    [var('a', '2..15'), var('b', '2..15')], ['{{eval:a+b}}'],
    [ECART_DEF,
     '$$' + col('{{b}}', 1) + ' - (' + col('-{{a}}', 1) + ') = {{b}} + {{a}} = '
     + col('{{solution}}') + '$$',
     'L\'écart est de $' + col(deg('{{solution}}')) + '$.'])
ECART_NEGATIFS = variation(
    'Lundi, il a fait $' + deg('-{{a}}') + '$ ; mardi, $' + deg('-{{b}}') + '$.\n\n' + ECART_FIN,
    [var('a', '3..20'), var('b', '1..19')], ['{{eval:a-b}}'],
    [ECART_DEF,
     '$-{{b}}$ est plus grand que $-{{a}}$ (plus près de zéro).',
     '$$' + col('-{{b}}', 1) + ' - (' + col('-{{a}}', 1) + ') = -{{b}} + {{a}} = '
     + col('{{solution}}') + '$$',
     'L\'écart est de $' + col(deg('{{solution}}')) + '$.'],
    ['b<a'])
ECART_DECIMAUX = variation(
    'La nuit, il a fait $' + deg('-{{x}}') + '$ ; l\'après-midi, $' + deg('{{y}}') + '$.\n\n'
    + ECART_FIN,
    [var('A', '11..99'), var('x', 'eval:A/10;d'), var('B', '11..199'), var('y', 'eval:B/10;d')],
    ['{{eval:(A+B)/10;d}}'],
    [ECART_DEF,
     '$$' + col('{{y}}', 1) + ' - (' + col('-{{x}}', 1) + ') = {{y}} + {{x}} = '
     + col('{{solution}}') + '$$',
     'L\'écart est de $' + col(deg('{{solution}}')) + '$.'],
    ['mod(A,10)!=0', 'mod(B,10)!=0'])

MODELES.append(modele(
    '07-calculer-un-ecart', 'Calculer un écart',
    'Calculer l\'écart entre deux températures : −3 °C et 4 °C (7 °C) ; −9 °C et −2 °C (7 °C) ;'
    ' avec des décimaux (−2,5 °C et 6,3 °C)',
    R, ADD_SOUS, 'Problèmes', 2,
    [ECART_SIGNES, ECART_NEGATIFS, ECART_DECIMAUX],
    [spec('−3 °C et 4 °C : 7', 0, {'a': 3, 'b': 4}, '7', 'correct'),
     spec('Erreur : 1 (4 − 3)', 0, {'a': 3, 'b': 4}, '1', 'incorrect'),
     spec('−9 °C et −2 °C : 7', 1, {'a': 9, 'b': 2}, '7', 'correct'),
     spec('Erreur : 11 (9 + 2)', 1, {'a': 9, 'b': 2}, '11', 'incorrect'),
     spec('Erreur : −7', 1, {'a': 9, 'b': 2}, '-7', 'incorrect'),
     spec('−2,5 °C et 6,3 °C : 8,8', 2, {'A': 25, 'x': '2.5', 'B': 63, 'y': '6.3'}, '8,8',
          'correct'),
     spec('Erreur : 3,8 (6,3 − 2,5)', 2, {'A': 25, 'x': '2.5', 'B': 63, 'y': '6.3'}, '3,8',
          'incorrect')],
    delay=60))

# --- 8. 5-021 : parenthèses indispensables -------------------------------------------------
# Choix dans l'ordre écrit : 0 Oui, 1 Non.

OUI_NON = choix(['Oui', 'Non'], melanger=False)
PAR_QUESTION = ('Dans l\'écriture $ECR$, les parenthèses sont-elles indispensables ?' + OUI_NON)
PAR_DEF = ('**Parenthèses.** Elles sont indispensables quand, sans elles, l\'écriture n\'est plus'
           ' correcte (deux signes qui se suivent) ou ne veut plus dire la même chose.')
OUI = col('\\text{Oui}').join('$$')
NON = col('\\text{Non}').join('$$')
AB = [var('a', '2..9'), var('b', '2..9')]


def parentheses(ecriture, reponse, explication):
    # a ≠ b : pas de −(9 + 9), et −(a − b) jamais nul
    return variation(PAR_QUESTION.replace('ECR', ecriture), AB, [reponse],
                     [PAR_DEF, explication], ['a!=b'])


PAR_SOMME = parentheses(
    '{{a}} + (-{{b}})', '0',
    OUI + ' : sans elles, on écrirait $+$ et $-$ côte à côte (${{a}} + -{{b}}$), ce qui'
    ' n\'est pas correct.')
PAR_TETE = parentheses(
    '(-{{a}}) + {{b}}', '1',
    NON + ' : le signe $-$ est en tête, on peut écrire $-{{a}} + {{b}}$ ; cela veut dire la'
    ' même chose.')
PAR_OPPOSE = parentheses(
    '-(-{{a}})', '0',
    OUI + ' : sans elles, deux signes $-$ se suivraient. $-(-{{a}})$ est l\'opposé de $-{{a}}$,'
    ' c\'est-à-dire ${{a}}$.')
PAR_OPPOSE_SOMME = parentheses(
    '-({{a}} + {{b}})', '0',
    OUI + ' : $-({{a}} + {{b}}) = -' + ev('a+b') + '$, alors que $-{{a}} + {{b}} = '
    + ev('-a+b') + '$. Sans parenthèses, le sens change.')
PAR_OPPOSE_DIFF = parentheses(
    '-({{a}} - {{b}})', '0',
    OUI + ' : $-({{a}} - {{b}}) = ' + ev('-(a-b)') + '$, alors que $-{{a}} - {{b}} = '
    + ev('-a-b') + '$. Sans parenthèses, le sens change.')
PAR_SEUL = parentheses(
    '(-{{a}})', '1',
    NON + ' : $(-{{a}})$ et $-{{a}}$ désignent le même nombre.')

MODELES.append(modele(
    '08-parentheses-indispensables', 'Les parenthèses sont-elles indispensables ?',
    'Dire si les parenthèses sont indispensables au sens d\'une écriture : oui dans 3 + (−2),'
    ' −(−2), −(2 + 3), −(2 − 3) ; non dans (−2) + 5 et (−2)',
    R, ADD_SOUS, 'Sommes algébriques', 5,
    [PAR_SOMME, PAR_TETE, PAR_OPPOSE, PAR_OPPOSE_SOMME, PAR_OPPOSE_DIFF, PAR_SEUL],
    [spec('3 + (−2) : oui', 0, {'a': 3, 'b': 2}, '0', 'correct'),
     spec('Erreur : non', 0, {'a': 3, 'b': 2}, '1', 'incorrect'),
     spec('(−2) + 5 : non', 1, {'a': 2, 'b': 5}, '1', 'correct'),
     spec('Erreur : oui', 1, {'a': 2, 'b': 5}, '0', 'incorrect'),
     spec('−(−2) : oui', 2, {'a': 2, 'b': 3}, '0', 'correct'),
     spec('Erreur : non', 2, {'a': 2, 'b': 3}, '1', 'incorrect'),
     spec('−(2 + 3) : oui', 3, {'a': 2, 'b': 3}, '0', 'correct'),
     spec('Erreur : non', 3, {'a': 2, 'b': 3}, '1', 'incorrect'),
     spec('−(2 − 3) : oui', 4, {'a': 2, 'b': 3}, '0', 'correct'),
     spec('Erreur : non', 4, {'a': 2, 'b': 3}, '1', 'incorrect'),
     spec('(−2) : non', 5, {'a': 2, 'b': 3}, '1', 'correct'),
     spec('Erreur : oui', 5, {'a': 2, 'b': 3}, '0', 'incorrect')]))

os.makedirs(DOSSIER, exist_ok=True)
for nom, m in MODELES:
    with open(os.path.join(DOSSIER, nom + '.json'), 'w', encoding='utf-8') as f:
        json.dump(m, f, ensure_ascii=False, indent='\t')
        f.write('\n')
# Mis en forme comme le pre-commit, pour que le script redonne les fichiers commités
subprocess.run(['pnpm', 'exec', 'prettier', '--write', DOSSIER], check=True,
               stdout=subprocess.DEVNULL)
print(f'{len(MODELES)} modèles écrits dans {DOSSIER}')
