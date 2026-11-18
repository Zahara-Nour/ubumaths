"""Écrit les 6 modèles du lot 2 « représentations graphiques : suites et affines » de la 1re
générale (enseignement scientifique, module spécifique) dans
scripts/questions/1gen-2-representations-graphiques/.

Phase 0 validée par David le 2026-11-17 (Q17 à Q19, journal docs/archive/wip/questions-1gen-progress.md
§ 15) :

| #  | Point    | Nœud (posé par la migration)                      | Niveau | Réponse            |
| R1 | 1GEN-016 | Suites › Généralités › représentation graphique   | 1 | ```associer + courbes |
| R2 | 1GEN-019 | Suites › Généralités › représentation graphique   | 1 | ```courbe + placer:   |
| R3 | 1GEN-041 | Suites › Généralités › représentation graphique   | 2 | ```courbe + placer:   |
| R4 | 1GEN-058 | Suites › Généralités › représentation graphique   | 2 | case (nombre, choix)  |
| R5 | 1GEN-020 | Fonctions › Fonctions affines › expression et droite | 1 | ```courbe + tracer: |
| R6 | 1GEN-051 | Fonctions › Fonctions affines › expression et droite | 1 | case (nombre, expr., choix) |

R2, R3, R4 sont communs avec la 1re techno (Q18) : écrits ici avec `grades` = ['1_GEN'] ; la
session questions-1techno ajoute `1_TECHNO` et ses tags (044, 117, 119) par sa migration.

Repère à placer : 6 points au plus, chacun sur un nœud de la grille. Suites géométriques (R3,
R4) : termes > 0, n = 0..3, grille verticale = plus petit terme (tous les termes en sont
multiples) :
- croissantes : (u₀ ; q) ∈ {(1 ; 2), (2 ; 2), (3 ; 2), (1 ; 3)} (u₀ ∈ 1..3, q ∈ 2|3, u₃ ⩽ 27) ;
- décroissantes : (16 ; 1/2), (32 ; 1/2), (27 ; 1/3), (81 ; 1/3) (q = 1/d, u₃ = t, u₀ = t·d³).

Pièges : jamais de variable `e` ni `i` ; case choix → `melanger: non`, réponse = rang ; une
variable `x|x` (ou `n|n`) garde la lettre dans un `eval` (`{{eval:(a)*x}}` → « 2x »).

    python3 docs/wip/questions/lot-1gen-2.py scripts/questions/1gen-2-representations-graphiques
"""
import json
import os
import sys

DOSSIER = sys.argv[1]


def spec(desc, vi, variables_, answers, status):
    if isinstance(answers, str):
        answers = [answers]
    return {'description': desc, 'variationIndex': vi, 'variables': variables_,
            'answers': answers, 'expected': {'status': status}}


def modele(title, description, level, delay, variations, specs, shared=None, options=None):
    # Ni theme, ni domain, ni subdomain (ADR 0035) ; nœud et tag posés par la migration.
    m = {'title': title, 'description': description, 'grades': ['1_GEN'], 'level': level,
         'delay': delay, 'status': 'draft', 'shared': shared or {}}
    if options:
        m['options'] = options
    m['variations'] = variations
    m['testSpecs'] = specs
    return m


def var(nom, expression):
    return {'name': nom, 'expression': expression}


def variation(statement, variables, reponses, steps, conditions=None):
    """reponses : None pour un geste (placer, tracer, associer : la case est posée par le bloc)."""
    v = {'statement': statement, 'variables': variables, 'conditions': conditions or []}
    if reponses is not None:
        if isinstance(reponses, str):
            reponses = [reponses]
        v['blanks'] = [{'expectedAnswer': r} for r in reponses]
    v['correction'] = {'steps': steps}
    return v


def col(x):
    return '\\textcolor{{{color:primary.0}}}{' + x + '}'


SENS = '\n\n```choix\nmelanger: non\n- croissante\n- décroissante\n```'

# --- R1, 1GEN-016 : associer nuages et suites arithmétiques ---------------------------------

# Premiers termes pris dans trois plages disjointes (distincts et non nuls sans condition) ;
# l'ordre des nuages ne trahit rien, les étiquettes étant mélangées au tirage.
R1_VARS = [var('n', 'n|n'), var('a1', '-3..-1'), var('r1', '1|2|3'), var('a2', '1..4'),
           var('r2', '-2|-1|1|2|3!r1'), var('a3', '5..8'), var('r3', '-2|-1|1|2|3')]
R1_COND = (['a{0}+4*r{0} >= -4'.format(j) for j in '123']
           + ['a{0}+4*r{0} <= 10'.format(j) for j in '123'] + ['r3 != r1', 'r3 != r2'])


def r1_nuage(j, etiquette):
    return ('- ```courbe\n'
            '  x: -1 ; 5\n'
            '  y: -5 ; 11\n'
            '  grille: 1 ; 1\n'
            '  u(n) = {{a' + j + '}}+({{r' + j + '}})*n pour n de 0 à 4   bleu\n'
            '  description: Nuage de 5 points : (0 ; {{a' + j + '}}), (1 ; {{eval:a' + j + '+r' + j
            + '}}), (2 ; {{eval:a' + j + '+2*r' + j + '}}), (3 ; {{eval:a' + j + '+3*r' + j
            + '}}), (4 ; {{eval:a' + j + '+4*r' + j + '}}).\n'
            '  ```\n'
            '  -> ' + etiquette + '\n')


def r1_explicite(j):
    return '$u_n={{eval:(r' + j + ')*n}}{{eval:a' + j + ';+}}$'


def r1_recurrence(j):
    return '$u_0={{a' + j + '}},\\ u_{n+1}=u_n{{r' + j + ';+}}$'


def r1_enonce(etiquette):
    return ('Chaque nuage de points représente les premiers termes d\'une suite arithmétique'
            ' $(u_n)$ : le point d\'abscisse $n$ a pour ordonnée $u_n$.\n\n'
            'Relie chaque nuage à la suite qu\'il représente.\n\n'
            '````associer\n' + ''.join(r1_nuage(j, etiquette(j)) for j in '123') + '````')


def r1_corrige(etiquette):
    lignes = [
        'Pour une suite arithmétique, on ajoute toujours la même raison $r$ pour passer d\'un'
        ' terme au suivant : les points du nuage sont **alignés**. On lit $u_0$ sur le point'
        ' d\'abscisse $0$, et $r$ dans la montée (ou la descente) d\'un point au suivant.']
    for k, j in enumerate('123', 1):
        lignes.append(
            'Nuage ' + str(k) + ' : le premier point est $(0\\,;{{a' + j + '}})$, donc'
            ' $u_0={{a' + j + '}}$ ; d\'un point au suivant, on {{if:r' + j + '>0|monte|descend}}'
            ' de ${{eval:abs(r' + j + ')}}$, donc $r={{r' + j + '}}$. C\'est '
            + etiquette(j) + '.')
    return lignes


R1 = modele(
    'Associer un nuage de points à une suite arithmétique',
    'Trois nuages de points ↔ trois suites arithmétiques (forme explicite, puis récurrence)',
    1, 60,
    [
        variation(r1_enonce(r1_explicite), R1_VARS, None, r1_corrige(r1_explicite), R1_COND),
        variation(r1_enonce(r1_recurrence), R1_VARS, None, r1_corrige(r1_recurrence), R1_COND),
    ],
    # Réponses = rang affiché de l'étiquette de chaque nuage (étiquettes mélangées au tirage) :
    # le testeur tire avec la graine 0, d'où l'ordre 2, 0, 1 (relevé le 2026-11-17).
    [
        spec('Nuages bien reliés', 0,
             {'a1': '-2', 'r1': '3', 'a2': '2', 'r2': '1', 'a3': '8', 'r3': '-2'},
             ['2', '0', '1'], 'correct'),
        spec('Erreur : nuages 1 et 2 échangés', 0,
             {'a1': '-2', 'r1': '3', 'a2': '2', 'r2': '1', 'a3': '8', 'r3': '-2'},
             ['0', '2', '1'], 'incorrect'),
        spec('Récurrences bien reliées', 1,
             {'a1': '-1', 'r1': '2', 'a2': '4', 'r2': '-1', 'a3': '6', 'r3': '1'},
             ['2', '0', '1'], 'correct'),
        spec('Erreur : nuages 2 et 3 échangés', 1,
             {'a1': '-1', 'r1': '2', 'a2': '4', 'r2': '-1', 'a3': '6', 'r3': '1'},
             ['2', '1', '0'], 'incorrect'),
    ],
)

# --- R2, 1GEN-019 : placer les termes d'une suite arithmétique ------------------------------

LETTRES = 'ABCDE'


def placer_arith(n_max=4):
    return 'placer: ' + ' ; '.join(
        LETTRES[k] + '=(' + str(k) + ' ; {{eval:a+' + str(k) + '*r}})' for k in range(n_max + 1))


def termes_arith(n_max=4):
    return ', '.join(
        '$' + LETTRES[k] + col('(' + str(k) + '\\,;{{eval:a+' + str(k) + '*r}})') + '$'
        for k in range(n_max + 1))


R2_REPERE = ('```courbe\nx: -1 ; 5\ny: -6 ; 14\ngrille: 1 ; 1\n' + placer_arith()
             + '\ntaille: moyenne\ndescription: Repère gradué de 1 en 1 : n de −1 à 5 en abscisse,'
             ' de −6 à 14 en ordonnée.\n```')
R2_CONSIGNE = ('\n\nPlace les points $A$, $B$, $C$, $D$ et $E$ qui représentent $u_0$, $u_1$,'
               ' $u_2$, $u_3$ et $u_4$ : le point d\'abscisse $n$ a pour ordonnée $u_n$.\n\n')
R2_VARS = [var('n', 'n|n'), var('a', '-3..8'), var('r', '-3|-2|-1|1|2|3')]
R2_COND = ['a+4*r >= -5', 'a+4*r <= 13']
R2_FIN = ('On place chaque point $(n\\,;u_n)$ : ' + termes_arith() + '. Les points sont alignés :'
          ' la suite est arithmétique.')

R2 = modele(
    'Placer les premiers termes d\'une suite arithmétique',
    'Représenter u₀ à u₄ par des points (n ; uₙ) : forme explicite, récurrence, épargne',
    1, 90,
    [
        variation(
            'La suite $(u_n)$ est définie, pour tout entier naturel $n$, par'
            ' $u_n={{eval:(r)*n}}{{eval:a;+}}$.' + R2_CONSIGNE + R2_REPERE,
            R2_VARS, None,
            ['On calcule chaque terme en remplaçant $n$ : $u_0={{a}}$, $u_1={{eval:a+r}}$,'
             ' $u_2={{eval:a+2*r}}$, $u_3={{eval:a+3*r}}$, $u_4={{eval:a+4*r}}$.', R2_FIN],
            R2_COND + ['a != 0'],
        ),
        variation(
            'La suite $(u_n)$ est définie par $u_0={{a}}$ et, pour tout entier naturel $n$,'
            ' $u_{n+1}=u_n{{r;+}}$.' + R2_CONSIGNE + R2_REPERE,
            R2_VARS[1:], None,
            ['On part de $u_0={{a}}$ et on ajoute ${{r;()}}$ à chaque rang : $u_1={{eval:a+r}}$,'
             ' $u_2={{eval:a+2*r}}$, $u_3={{eval:a+3*r}}$, $u_4={{eval:a+4*r}}$.', R2_FIN],
            R2_COND,
        ),
        variation(
            'Inès a ${{a}}~\\unit{€}$ d\'économies. Chaque semaine, elle en ajoute ${{r}}~\\unit{€}$.'
            ' On note $u_n$ ses économies, en euros, au bout de $n$ semaines.\n\n'
            'Place les points $A$, $B$, $C$, $D$ et $E$ qui représentent $u_0$, $u_1$, $u_2$, $u_3$'
            ' et $u_4$ : le point d\'abscisse $n$ a pour ordonnée $u_n$.\n\n'
            '```courbe\nx: -1 ; 5\ny: -1 ; 21\ngrille: 1 ; 1\naxes: x = Semaines ; y = Économies (€)\n'
            + placer_arith() + '\ntaille: moyenne\ndescription: Repère gradué de 1 en 1 : semaines'
            ' de −1 à 5 en abscisse, économies de −1 à 21 € en ordonnée.\n```',
            [var('a', '1..8'), var('r', '1..3')], None,
            ['Au départ, $u_0={{a}}$ ; chaque semaine, on ajoute ${{r}}$ : $u_1={{eval:a+r}}$,'
             ' $u_2={{eval:a+2*r}}$, $u_3={{eval:a+3*r}}$, $u_4={{eval:a+4*r}}$.', R2_FIN],
        ),
    ],
    [
        spec('u_n = 2n + 3 : les cinq points', 0, {'a': '3', 'r': '2'},
             ['0;3', '1;5', '2;7', '3;9', '4;11'], 'correct'),
        spec('Erreur : B avec abscisse et ordonnée échangées', 0, {'a': '3', 'r': '2'},
             ['0;3', '5;1', '2;7', '3;9', '4;11'], 'incorrect'),
        spec('Erreur : décalage d\'un rang (u₁ placé en 0)', 0, {'a': '3', 'r': '2'},
             ['0;5', '1;7', '2;9', '3;11', '4;13'], 'incorrect'),
        spec('u₀ = 6, u_{n+1} = u_n − 2', 1, {'a': '6', 'r': '-2'},
             ['0;6', '1;4', '2;2', '3;0', '4;-2'], 'correct'),
        spec('Erreur : raison prise positive', 1, {'a': '6', 'r': '-2'},
             ['0;6', '1;8', '2;10', '3;12', '4;14'], 'incorrect'),
        spec('Inès : 4 € puis 3 € par semaine', 2, {'a': '4', 'r': '3'},
             ['0;4', '1;7', '2;10', '3;13', '4;16'], 'correct'),
        spec('Erreur : u₀ oublié (commence à 7)', 2, {'a': '4', 'r': '3'},
             ['0;7', '1;10', '2;13', '3;16', '4;19'], 'incorrect'),
    ],
    shared={'cleanCoefficients': True},
)

# --- R3, 1GEN-041 : placer les termes d'une suite géométrique -------------------------------
# Croissante : u0 ∈ 1..3, q ∈ 2|3, u0·q³ ⩽ 27 ; grille verticale u0.
# Décroissante : q = 1/d, u3 = t, u0 = t·d³ ; grille verticale t.

CROIS_VARS = [var('u', '1..3'), var('q', '2|3')]
CROIS_COND = ['u*q^3 <= 27']
DECR_VARS = [var('d', '2|3'), var('m', '1|2'), var('t', 'eval:2*m-(d-2)'),
             var('u', 'eval:t*d^3')]


def placer_crois():
    return 'placer: ' + ' ; '.join(
        LETTRES[k] + '=(' + str(k) + ' ; {{eval:u*q^' + str(k) + '}})' for k in range(4))


def placer_decr():
    return 'placer: ' + ' ; '.join(
        LETTRES[k] + '=(' + str(k) + ' ; {{eval:u/d^' + str(k) + '}})' for k in range(4))


def repere(placer, grille, haut, axes=''):
    return ('```courbe\nx: -1 ; 4\ny: -{{' + grille + '}} ; {{eval:' + haut + '}}\n'
            'grille: 1 ; {{' + grille + '}}\n' + axes + placer + '\ntaille: moyenne\n'
            'description: Repère : n de −1 à 4 en abscisse, de 1 en 1 ; ordonnée graduée de {{'
            + grille + '}} en {{' + grille + '}}.\n```')


R3_CONSIGNE = ('\n\nPlace les points $A$, $B$, $C$ et $D$ qui représentent $u_0$, $u_1$, $u_2$ et'
               ' $u_3$ : le point d\'abscisse $n$ a pour ordonnée $u_n$.\n\n')
R3_REP_CROIS = repere(placer_crois(), 'u', 'u*q^3+u')
R3_REP_DECR = repere(placer_decr(), 't', 'u+t')
R3_TERMES_CROIS = ('$u_1={{u}}\\times{{q}}={{eval:u*q}}$, $u_2={{eval:u*q}}\\times{{q}}='
                   '{{eval:u*q^2}}$, $u_3={{eval:u*q^2}}\\times{{q}}={{eval:u*q^3}}$')
R3_TERMES_DECR = ('$u_1=\\dfrac{{{u}}}{{{d}}}={{eval:u/d}}$, $u_2=\\dfrac{{{eval:u/d}}}{{{d}}}='
                  '{{eval:u/d^2}}$, $u_3=\\dfrac{{{eval:u/d^2}}}{{{d}}}={{eval:u/d^3}}$')
R3_FIN_CROIS = ('On place $A' + col('(0\\,;{{u}})') + '$, $B' + col('(1\\,;{{eval:u*q}})') + '$, $C'
                + col('(2\\,;{{eval:u*q^2}})') + '$, $D' + col('(3\\,;{{eval:u*q^3}})') + '$. Les'
                ' points ne sont **pas alignés** : les écarts grandissent, car on multiplie par'
                ' ${{q}}$ à chaque rang.')
R3_FIN_DECR = ('On place $A' + col('(0\\,;{{u}})') + '$, $B' + col('(1\\,;{{eval:u/d}})') + '$, $C'
               + col('(2\\,;{{eval:u/d^2}})') + '$, $D' + col('(3\\,;{{eval:u/d^3}})') + '$. Les'
               ' points ne sont **pas alignés** : les écarts rétrécissent, car on divise par'
               ' ${{d}}$ à chaque rang.')

R3 = modele(
    'Placer les premiers termes d\'une suite géométrique',
    'Représenter u₀ à u₃ (termes positifs) par des points (n ; uₙ) : forme explicite,'
    ' récurrence, bactéries',
    2, 90,
    [
        variation(
            'La suite $(u_n)$ est définie, pour tout entier naturel $n$, par'
            ' $u_n={{u}}\\times{{q}}^n$.' + R3_CONSIGNE + R3_REP_CROIS,
            CROIS_VARS, None,
            ['On remplace $n$ par $0$, $1$, $2$, $3$ : $u_0={{u}}\\times{{q}}^0={{u}}$, puis on'
             ' multiplie par ${{q}}$ à chaque rang : ' + R3_TERMES_CROIS + '.', R3_FIN_CROIS],
            CROIS_COND,
        ),
        variation(
            'La suite $(u_n)$ est définie, pour tout entier naturel $n$, par'
            ' $u_n={{u}}\\times\\left(\\dfrac{1}{{{d}}}\\right)^n$.' + R3_CONSIGNE + R3_REP_DECR,
            DECR_VARS, None,
            ['On remplace $n$ par $0$, $1$, $2$, $3$ : $u_0={{u}}$, puis multiplier par'
             ' $\\dfrac{1}{{{d}}}$, c\'est diviser par ${{d}}$ : ' + R3_TERMES_DECR + '.',
             R3_FIN_DECR],
        ),
        variation(
            'La suite $(u_n)$ est définie par $u_0={{u}}$ et, pour tout entier naturel $n$,'
            ' $u_{n+1}={{q}}\\times u_n$.' + R3_CONSIGNE + R3_REP_CROIS,
            CROIS_VARS, None,
            ['On part de $u_0={{u}}$ et on multiplie par ${{q}}$ à chaque rang : '
             + R3_TERMES_CROIS + '.', R3_FIN_CROIS],
            CROIS_COND,
        ),
        variation(
            'La suite $(u_n)$ est définie par $u_0={{u}}$ et, pour tout entier naturel $n$,'
            ' $u_{n+1}=\\dfrac{u_n}{{{d}}}$.' + R3_CONSIGNE + R3_REP_DECR,
            DECR_VARS, None,
            ['On part de $u_0={{u}}$ et on divise par ${{d}}$ à chaque rang : ' + R3_TERMES_DECR
             + '.', R3_FIN_DECR],
        ),
        variation(
            'Une culture compte ${{u}}$ milliers de bactéries ; leur nombre double chaque heure.'
            ' On note $u_n$ le nombre de bactéries, en milliers, au bout de $n$ heures.'
            + R3_CONSIGNE
            + repere(placer_crois(), 'u', 'u*q^3+u', 'axes: x = Heures ; y = Milliers\n'),
            [var('u', '1..3'), var('q', '2')], None,
            ['Doubler, c\'est multiplier par $2$ : $(u_n)$ est géométrique de raison $2$ et'
             ' $u_0={{u}}$. ' + R3_TERMES_CROIS + '.', R3_FIN_CROIS],
        ),
    ],
    [
        spec('u_n = 1 × 3ⁿ : 1, 3, 9, 27', 0, {'u': '1', 'q': '3'},
             ['0;1', '1;3', '2;9', '3;27'], 'correct'),
        spec('Erreur : on ajoute la raison (1, 4, 7, 10)', 0, {'u': '1', 'q': '3'},
             ['0;1', '1;4', '2;7', '3;10'], 'incorrect'),
        spec('Erreur : u_n = 3n (0, 3, 6, 9)', 0, {'u': '1', 'q': '3'},
             ['0;0', '1;3', '2;6', '3;9'], 'incorrect'),
        spec('u_n = 32 × (1/2)ⁿ : 32, 16, 8, 4', 1, {'d': '2', 'm': '2', 't': '4', 'u': '32'},
             ['0;32', '1;16', '2;8', '3;4'], 'correct'),
        spec('Erreur : C avec abscisse et ordonnée échangées', 1,
             {'d': '2', 'm': '2', 't': '4', 'u': '32'}, ['0;32', '1;16', '8;2', '3;4'],
             'incorrect'),
        spec('u₀ = 3, ×2 : 3, 6, 12, 24', 2, {'u': '3', 'q': '2'},
             ['0;3', '1;6', '2;12', '3;24'], 'correct'),
        spec('Erreur : +2 (3, 5, 7, 9)', 2, {'u': '3', 'q': '2'},
             ['0;3', '1;5', '2;7', '3;9'], 'incorrect'),
        spec('u₀ = 27, ÷3 : 27, 9, 3, 1', 3, {'d': '3', 'm': '1', 't': '1', 'u': '27'},
             ['0;27', '1;9', '2;3', '3;1'], 'correct'),
        spec('Erreur : on retire 3 (27, 24, 21, 18)', 3, {'d': '3', 'm': '1', 't': '1', 'u': '27'},
             ['0;27', '1;24', '2;21', '3;18'], 'incorrect'),
        spec('Bactéries : 2, 4, 8, 16', 4, {'u': '2', 'q': '2'},
             ['0;2', '1;4', '2;8', '3;16'], 'correct'),
        spec('Erreur : décalage (4, 8, 16, 32)', 4, {'u': '2', 'q': '2'},
             ['0;4', '1;8', '2;16', '3;32'], 'incorrect'),
    ],
)

# --- R4, 1GEN-058 : lire sur le nuage d'une suite géométrique -------------------------------


def nuage(formule, grille, haut):
    return ('```courbe\nx: -1 ; 4\ny: -{{' + grille + '}} ; {{eval:' + haut + '}}\n'
            'grille: 1 ; {{' + grille + '}}\nu(n) = ' + formule + ' pour n de 0 à 3   bleu   nom=u_n\n'
            'taille: moyenne\ndescription: Nuage de 4 points représentant les premiers termes'
            ' d\'une suite géométrique, un point par rang n ; ordonnée graduée de {{' + grille
            + '}} en {{' + grille + '}}.\n```')


R4_INTRO = ('La suite géométrique $(u_n)$ est représentée ci-dessous par un nuage de points : le'
            ' point d\'abscisse $n$ a pour ordonnée $u_n$.\n\n')
R4_NUAGE_CROIS = nuage('{{u}}*{{q}}^n', 'u', 'u*q^3+u')
R4_NUAGE_DECR = nuage('{{u}}/{{d}}^n', 't', 'u+t')
R4_LECTURE_CROIS = ('On lit les ordonnées des points : $u_0={{u}}$, $u_1={{eval:u*q}}$,'
                    ' $u_2={{eval:u*q^2}}$, $u_3={{eval:u*q^3}}$.')
R4_LECTURE_DECR = ('On lit les ordonnées des points : $u_0={{u}}$, $u_1={{eval:u/d}}$,'
                   ' $u_2={{eval:u/d^2}}$, $u_3={{eval:u/d^3}}$.')
R4_RANG = ('Attention, le premier point est celui de rang $0$ : le point d\'abscisse $n$ représente'
           ' $u_n$.')

R4 = modele(
    'Lire sur le nuage de points d\'une suite géométrique',
    'Termes positifs : lire u₀ et la raison, un terme, le sens de variation, un premier rang',
    2, 45,
    [
        variation(
            R4_INTRO + R4_NUAGE_CROIS + '\n\nLis son premier terme $u_0$ et sa raison $q$.\n\n'
            '$u_0=?$ et $q=?$',
            CROIS_VARS, ['{{u}}', '{{q}}'],
            ['Le premier terme $u_0$ est l\'ordonnée du point d\'abscisse $0$ : $u_0='
             + col('{{u}}') + '$.',
             'Pour une suite géométrique, on passe d\'un terme au suivant en **multipliant** par'
             ' la raison : $q=\\dfrac{u_1}{u_0}$.',
             'On lit $u_1={{eval:u*q}}$, donc $q=\\dfrac{{{eval:u*q}}}{{{u}}}=' + col('{{q}}')
             + '$. (La différence $u_1-u_0={{eval:u*q-u}}$ n\'est pas la raison : c\'est celle'
             ' d\'une suite arithmétique.)'],
            CROIS_COND,
        ),
        variation(
            R4_INTRO + R4_NUAGE_DECR + '\n\nLis le terme $u_{{k}}$.\n\n$u_{{k}}=?$',
            DECR_VARS + [var('k', '1..3')], '{{eval:u/d^k}}',
            [R4_RANG, 'Le point d\'abscisse ${{k}}$ a pour ordonnée ${{eval:u/d^k}}$ : $u_{{k}}='
             + col('{{eval:u/d^k}}') + '$.'],
        ),
        variation(
            R4_INTRO + R4_NUAGE_CROIS + '\n\nQuel est le sens de variation de la suite $(u_n)$ ?'
            + SENS,
            CROIS_VARS, '0',
            [R4_LECTURE_CROIS, 'Les points montent d\'un rang au suivant : chaque terme est plus'
             ' grand que le précédent, la suite est **croissante** (sa raison ${{q}}$ est'
             ' supérieure à $1$).'],
            CROIS_COND,
        ),
        variation(
            R4_INTRO + R4_NUAGE_DECR + '\n\nQuel est le sens de variation de la suite $(u_n)$ ?'
            + SENS,
            DECR_VARS, '1',
            [R4_LECTURE_DECR, 'Les points descendent d\'un rang au suivant : chaque terme est plus'
             ' petit que le précédent, la suite est **décroissante** (sa raison'
             ' $\\dfrac{1}{{{d}}}$ est comprise entre $0$ et $1$).'],
        ),
        variation(
            R4_INTRO + R4_NUAGE_CROIS + '\n\nÀ partir de quel rang $n$ a-t-on $u_n>{{s}}$ ?'
            '\n\n$n=?$',
            CROIS_VARS + [var('k', '2..3'), var('s', 'eval:u*q^(k-1)*(1+q)/2')], '{{k}}',
            [R4_LECTURE_CROIS, 'On cherche le premier point au-dessus de la hauteur ${{s}}$ :'
             ' $u_{{eval:k-1}}={{eval:u*q^(k-1)}}\\leqslant{{s}}$ et $u_{{k}}={{eval:u*q^k}}>{{s}}$.',
             'La suite est croissante : à partir du rang $n=' + col('{{k}}') + '$, tous les'
             ' termes dépassent ${{s}}$. ' + R4_RANG],
            CROIS_COND,
        ),
        variation(
            R4_INTRO + R4_NUAGE_DECR + '\n\nÀ partir de quel rang $n$ a-t-on $u_n<{{s}}$ ?'
            '\n\n$n=?$',
            DECR_VARS + [var('k', '2..3'), var('s', 'eval:u/d^(k-1)*(1+1/d)/2')], '{{k}}',
            [R4_LECTURE_DECR, 'On cherche le premier point au-dessous de la hauteur ${{s}}$ :'
             ' $u_{{eval:k-1}}={{eval:u/d^(k-1)}}\\geqslant{{s}}$ et $u_{{k}}={{eval:u/d^k}}<{{s}}$.',
             'La suite est décroissante : à partir du rang $n=' + col('{{k}}') + '$, tous les'
             ' termes sont inférieurs à ${{s}}$. ' + R4_RANG],
        ),
    ],
    [
        spec('u₀ = 3, q = 2', 0, {'u': '3', 'q': '2'}, ['3', '2'], 'correct'),
        spec('Erreur : q = u₁ − u₀ (3)', 0, {'u': '3', 'q': '2'}, ['3', '3'], 'incorrect'),
        spec('Erreur : u₁ lu pour u₀', 0, {'u': '3', 'q': '2'}, ['6', '2'], 'incorrect'),
        spec('81, 27, 9, 3 : u₂ = 9', 1, {'d': '3', 'm': '2', 't': '3', 'u': '81', 'k': '2'}, '9',
             'correct'),
        spec('Erreur : rang décalé (u₁ = 27)', 1,
             {'d': '3', 'm': '2', 't': '3', 'u': '81', 'k': '2'}, '27', 'incorrect'),
        spec('Croissante', 2, {'u': '1', 'q': '3'}, '0', 'correct'),
        spec('Erreur : décroissante', 2, {'u': '1', 'q': '3'}, '1', 'incorrect'),
        spec('Décroissante', 3, {'d': '2', 'm': '1', 't': '2', 'u': '16'}, '1', 'correct'),
        spec('Erreur : croissante', 3, {'d': '2', 'm': '1', 't': '2', 'u': '16'}, '0', 'incorrect'),
        spec('2, 4, 8, 16 : u_n > 6 dès n = 2', 4, {'u': '2', 'q': '2', 'k': '2', 's': '6'}, '2',
             'correct'),
        spec('Erreur : rang décalé (1)', 4, {'u': '2', 'q': '2', 'k': '2', 's': '6'}, '1',
             'incorrect'),
        spec('Erreur : la valeur du terme (8)', 4, {'u': '2', 'q': '2', 'k': '2', 's': '6'}, '8',
             'incorrect'),
        spec('32, 16, 8, 4 : u_n < 6 dès n = 3', 5,
             {'d': '2', 'm': '2', 't': '4', 'u': '32', 'k': '3', 's': '6'}, '3', 'correct'),
        spec('Erreur : rang décalé (4)', 5,
             {'d': '2', 'm': '2', 't': '4', 'u': '32', 'k': '3', 's': '6'}, '4', 'incorrect'),
    ],
)

# --- R5, 1GEN-020 : tracer la droite d'une fonction affine ----------------------------------

R5_METHODE = ('La représentation graphique de $f:x\\mapsto ax+b$ est la droite d\'équation'
              ' $y=ax+b$. Pour la tracer, on place deux de ses points : $(0\\,;b)$ sur l\'axe des'
              ' ordonnées, puis un deuxième en avançant en abscisse.')

R5 = modele(
    'Tracer la représentation graphique d\'une fonction affine',
    'Placer deux points de la droite y = ax + b : coefficient entier, puis fractionnaire, puis'
    ' coût fixe + coût par séance',
    1, 60,
    [
        variation(
            'On considère la fonction affine $f$ définie par $f(x)={{a}}x{{b;+}}$.\n\n'
            'Trace sa représentation graphique : place deux de ses points.\n\n'
            '```courbe\nx: -6 ; 6\ny: -6 ; 6\ngrille: 1 ; 1\ntracer: y = {{a}}x + {{b}}\n'
            'taille: moyenne\ndescription: Repère gradué de 1 en 1, de −6 à 6 sur les deux axes.\n```',
            [var('a', '1..3;±'), var('b', '-4..4')], None,
            [R5_METHODE,
             '```courbe\nx: -6 ; 6\ny: -6 ; 6\ngrille: 1 ; 1\nf(x) = ({{a}})*x+({{b}})   bleu'
             '   nom=\\mathcal{C}_f\npoints: A(0 ; {{b}}), B(1 ; {{eval:(a)+(b)}})\ntaille: moyenne\n'
             'description: Droite représentant f et deux de ses points, A et B, d\'abscisses 0 et'
             ' 1.\n```',
             'Ici $f(0)={{b}}$ donne $A(0\\,;{{b}})$, et $f(1)={{eval:(a)+(b)}}$ donne'
             ' $B(1\\,;{{eval:(a)+(b)}})$ : en avançant de $1$, on {{if:a>0|monte|descend}} de'
             ' ${{eval:abs(a)}}$.'],
            ['abs((a)+(b)) <= 6', 'abs((b)-(a)) <= 6'],
        ),
        variation(
            'On considère la fonction affine $f$ définie par'
            ' $f(x)={{if:n<0|-}}\\dfrac{ {{eval:abs(n)}} }{ {{q}} }x{{b;+}}$.\n\n'
            'Trace sa représentation graphique : place deux de ses points.\n\n'
            '```courbe\nx: -6 ; 6\ny: -6 ; 6\ngrille: 1 ; 1\ntracer: y = {{n}}/{{q}}x + {{b}}\n'
            'taille: moyenne\ndescription: Repère gradué de 1 en 1, de −6 à 6 sur les deux axes.\n```',
            [var('q', '2|3'), var('n', '1..2;±'), var('b', '-4..4')], None,
            [R5_METHODE,
             '```courbe\nx: -6 ; 6\ny: -6 ; 6\ngrille: 1 ; 1\nf(x) = ({{n}})/({{q}})*x+({{b}})   bleu'
             '   nom=\\mathcal{C}_f\npoints: A(0 ; {{b}}), B({{q}} ; {{eval:(b)+(n)}})\n'
             'taille: moyenne\ndescription: Droite représentant f et deux de ses points, A et B,'
             ' d\'abscisses 0 et {{q}}.\n```',
             'Le coefficient directeur est ${{if:n<0|-}}\\dfrac{ {{eval:abs(n)}} }{ {{q}} }$ : en'
             ' avançant de ${{q}}$, on {{if:n>0|monte|descend}} de ${{eval:abs(n)}}$, de'
             ' $A(0\\,;{{b}})$ à $B({{q}}\\,;{{eval:(b)+(n)}})$ ; les deux points tombent sur la'
             ' grille.'],
            ['mod(n, q) != 0', 'abs((b)+(n)) <= 6', 'abs((b)-(n)) <= 6'],
        ),
        variation(
            'Une salle d\'escalade demande ${{b}}~\\unit{€}$ d\'inscription, puis ${{a}}~\\unit{€}$'
            ' par séance. Le coût, en euros, de $x$ séances est $f(x)={{a}}x+{{b}}$.\n\n'
            'Trace la représentation graphique de $f$ : place deux de ses points.\n\n'
            '```courbe\nx: -1 ; 8\ny: -5 ; 100\ngrille: 1 ; 5\naxes: x = Séances ; y = Coût (€)\n'
            'tracer: y = {{a}}x + {{b}}\ntaille: moyenne\ndescription: Repère : séances de −1 à 8'
            ' en abscisse, de 1 en 1 ; coût de −5 à 100 € en ordonnée, de 5 en 5.\n```',
            [var('a', '5|10'), var('b', '10|15|20')], None,
            ['Le coût est une fonction affine du nombre de séances : sa représentation graphique'
             ' est la droite d\'équation $y={{a}}x+{{b}}$. On place deux de ses points.',
             '```courbe\nx: -1 ; 8\ny: -5 ; 100\ngrille: 1 ; 5\naxes: x = Séances ; y = Coût (€)\n'
             'f(x) = {{a}}*x+{{b}}   bleu   nom=\\mathcal{C}_f\npoints: A(0 ; {{b}}), B(2 ;'
             ' {{eval:2*a+b}})\ntaille: moyenne\ndescription: Droite représentant f et deux de ses'
             ' points, A et B, d\'abscisses 0 et 2.\n```',
             'Sans séance, on paie l\'inscription : $f(0)={{b}}$, d\'où $A(0\\,;{{b}})$. Pour'
             ' $2$ séances : $f(2)={{a}}\\times2+{{b}}={{eval:2*a+b}}$, d\'où'
             ' $B(2\\,;{{eval:2*a+b}})$.'],
        ),
    ],
    [
        spec('f(x) = 2x − 1 : (0 ; −1) et (1 ; 1)', 0, {'a': '2', 'b': '-1'}, '0;-1/1;1',
             'correct'),
        spec('f(x) = 2x − 1 : deux autres points', 0, {'a': '2', 'b': '-1'}, '2;3/-1;-3',
             'correct'),
        spec('Erreur : coefficient directeur opposé', 0, {'a': '2', 'b': '-1'}, '0;-1/1;-3',
             'incorrect'),
        spec('Erreur : a et b échangés', 0, {'a': '2', 'b': '-1'}, '0;2/1;1', 'incorrect'),
        spec('f(x) = −2/3 x + 1 : (0 ; 1) et (3 ; −1)', 1, {'q': '3', 'n': '-2', 'b': '1'},
             '0;1/3;-1', 'correct'),
        spec('Erreur : pente inversée (−3/2)', 1, {'q': '3', 'n': '-2', 'b': '1'}, '0;1/2;-2',
             'incorrect'),
        spec('Escalade 10 € + 5 €/séance : (0 ; 10) et (2 ; 20)', 2, {'a': '5', 'b': '10'},
             '0;10/2;20', 'correct'),
        spec('Erreur : a et b échangés (0 ; 5)', 2, {'a': '5', 'b': '10'}, '0;5/1;15',
             'incorrect'),
    ],
    shared={'cleanCoefficients': True},
)

# --- R6, 1GEN-051 : lire sur la droite d'une fonction affine --------------------------------

R6_DROITE = ('```courbe\nx: -6 ; 6\ny: -6 ; 6\ngrille: 1 ; 1\nf(x) = ({{a}})*x+({{b}})   bleu'
             '   nom=\\mathcal{C}_f\ntaille: moyenne\ndescription: Droite représentant la'
             ' fonction affine f dans un repère gradué de 1 en 1, de −6 à 6 sur les deux axes ; elle'
             ' passe par (0 ; {{b}}) et (1 ; {{eval:(a)+(b)}}).\n```')
R6_INTRO = 'La droite $\\mathcal{C}_f$ ci-dessous représente une fonction affine $f$.\n\n'
R6_VARS = [var('a', '1..3;±'), var('b', '-4..4')]
R6_COND = ['abs((a)+(b)) <= 5', 'abs((b)-(a)) <= 5']

R6 = modele(
    'Lire sur la représentation graphique d\'une fonction affine',
    'Lire une image, un antécédent, l\'expression f(x) = ax + b, le sens de variation',
    1, 30,
    [
        variation(
            R6_INTRO + R6_DROITE + '\n\nLis l\'image de ${{c}}$ par $f$.\n\n$f({{c}})=?$',
            R6_VARS + [var('c', '-3..3;!0')], '{{eval:(a)*(c)+(b)}}',
            ['L\'image de ${{c}}$ est l\'ordonnée du point de $\\mathcal{C}_f$ d\'abscisse'
             ' ${{c}}$.',
             'Ce point est $({{c}}\\,;{{eval:(a)*(c)+(b)}})$, donc $f({{c}})='
             + col('{{eval:(a)*(c)+(b)}}') + '$.'],
            R6_COND + ['abs((a)*(c)+(b)) <= 5'],
        ),
        variation(
            R6_INTRO + R6_DROITE + '\n\nLis l\'antécédent de ${{eval:(a)*(c)+(b)}}$ par $f$.'
            '\n\nL\'antécédent est $?$.',
            R6_VARS + [var('c', '-3..3')], '{{c}}',
            ['Un antécédent de ${{eval:(a)*(c)+(b)}}$ est l\'abscisse d\'un point de'
             ' $\\mathcal{C}_f$ d\'ordonnée ${{eval:(a)*(c)+(b)}}$.',
             'Ce point est $({{c}}\\,;{{eval:(a)*(c)+(b)}})$ : l\'antécédent est $'
             + col('{{c}}') + '$.'],
            R6_COND + ['abs((a)*(c)+(b)) <= 5', '(a)*(c)+(b) != c'],
        ),
        variation(
            R6_INTRO + R6_DROITE + '\n\nLis l\'ordonnée à l\'origine et le coefficient directeur'
            ' de $\\mathcal{C}_f$, puis écris $f(x)$.\n\n$f(x)=?$',
            [var('x', 'x|x')] + R6_VARS, '{{eval:(a)*x+(b)}}',
            ['$f(x)=ax+b$ : $b$ est l\'**ordonnée à l\'origine**, là où la droite coupe l\'axe des'
             ' ordonnées ; $a$ est le **coefficient directeur**, le taux d\'accroissement'
             ' $\\dfrac{f(x_2)-f(x_1)}{x_2-x_1}$, le même entre deux points quelconques.',
             'La droite coupe l\'axe des ordonnées en $(0\\,;{{b}})$ : $b={{b}}$.',
             'De $(0\\,;{{b}})$ à $(1\\,;{{eval:(a)+(b)}})$, elle {{if:a>0|monte|descend}} de'
             ' ${{eval:abs(a)}}$ quand $x$ augmente de $1$ : $a=\\dfrac{{{eval:(a)+(b)}}-{{b;()}}}'
             '{1-0}={{a}}$.',
             'Donc $f(x)=' + col('{{eval:(a)*x+(b)}}') + '$.'],
            R6_COND + ['b != 0', 'abs(a) != abs(b)'],
        ),
        variation(
            R6_INTRO + R6_DROITE + '\n\nQuel est le sens de variation de $f$ ?' + SENS,
            R6_VARS, '{{eval:(1-a/abs(a))/2}}',
            ['Une fonction affine $x\\mapsto ax+b$ est croissante si $a>0$, décroissante si'
             ' $a<0$.',
             'Ici la droite {{if:a>0|monte|descend}} quand $x$ augmente : $a={{a}}$ est'
             ' {{if:a>0|positif|négatif}}, $f$ est **{{if:a>0|croissante|décroissante}}**.'],
            R6_COND,
        ),
    ],
    [
        spec('f(x) = 2x − 1 : f(2) = 3', 0, {'a': '2', 'b': '-1', 'c': '2'}, '3', 'correct'),
        spec('Erreur : antécédent lu (1,5)', 0, {'a': '2', 'b': '-1', 'c': '2'}, '1,5',
             'incorrect'),
        spec('f(x) = 2x − 1 : antécédent de 3 = 2', 1, {'a': '2', 'b': '-1', 'c': '2'}, '2',
             'correct'),
        spec('Erreur : image lue (f(3) = 5)', 1, {'a': '2', 'b': '-1', 'c': '2'}, '5',
             'incorrect'),
        spec('f(x) = −2x + 3', 2, {'a': '-2', 'b': '3'}, '-2x+3', 'correct'),
        spec('f(x) = 3 − 2x accepté', 2, {'a': '-2', 'b': '3'}, '3-2x', 'correct'),
        spec('Erreur : a et b échangés', 2, {'a': '-2', 'b': '3'}, '3x-2', 'incorrect'),
        spec('Erreur : signe de a', 2, {'a': '-2', 'b': '3'}, '2x+3', 'incorrect'),
        spec('a = 2 : croissante', 3, {'a': '2', 'b': '-1'}, '0', 'correct'),
        spec('Erreur : décroissante', 3, {'a': '2', 'b': '-1'}, '1', 'incorrect'),
        spec('a = −1 : décroissante', 3, {'a': '-1', 'b': '2'}, '1', 'correct'),
    ],
    shared={'cleanCoefficients': True, 'blankDefaults': {'acceptDecimal': True}},
)

MODELES = [('01-associer-nuage-suite-arithmetique', R1),
           ('02-placer-termes-suite-arithmetique', R2),
           ('03-placer-termes-suite-geometrique', R3),
           ('04-lire-nuage-suite-geometrique', R4),
           ('05-tracer-droite-fonction-affine', R5),
           ('06-lire-droite-fonction-affine', R6)]

os.makedirs(DOSSIER, exist_ok=True)
for nom, m in MODELES:
    chemin = os.path.join(DOSSIER, nom + '.json')
    with open(chemin, 'w', encoding='utf-8') as f:
        json.dump(m, f, ensure_ascii=False, indent='\t')
        f.write('\n')
    print('écrit', chemin)
