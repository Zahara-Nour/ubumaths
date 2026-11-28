"""Écrit les 6 modèles du lot 7 « deux variables » de la Terminale technologique (STMG)
dans scripts/questions/ttechno-7-deux-variables/.

Phase 0 validée par David le 2026-11-19 (journal docs/archive/wip/questions-ttechno-progress.md § 49,
Q32 à Q35 : « je te suis ») :

| #  | Point        | Nœud (posé par la migration)                        | Niveau | Réponse                  |
| D1 | TTECHNO-050  | Statistique à deux variables › changement de variable | 1 | case choix                |
| D2 | TTECHNO-052  | Statistique à deux variables › changement de variable | 1 | nombres ; placer          |
| D3 | TTECHNO-088  | Statistique à deux variables › changement de variable | 1 | nombres ; case choix      |
| D4 | TTECHNO-051  | Statistique à deux variables › changement de variable | 2 | nombres                   |
| D5 | TTECHNO-053  | Statistique à deux variables › ajustement affine      | 2 | nombre ; case choix       |
| D6 | TTECHNO-054  | Statistique à deux variables › ajustement affine      | 2 | case choix ; nombres      |

Bornes (BO Tle techno p.5, p.9, p.10 ; ttechno.md) : ajustements au jugé, droite de Mayer,
moindres carrés, sans connaissance théorique (051) ; changements de variable DONNÉS (u², 1/t,
log(y)) (052) ; Python ou tableur (053, 054) ; couples en nombre fini (054).
Q32 : log(y) en texte et en valeurs calculées (le bloc ```nuage ne connaît pas log : on lui donne
les valeurs de z, sans `ajustement:`) ; y = 10^k pour les calculs à la main. Q33 : droite de Mayer
calculée (D4, v3) ET donnée par la calculatrice (D4, v0 à v2). Q34 : une variation Python et une
tableur dans D5 et D6.

Pièges : jamais de variable `e` ni `i` ; case choix → `melanger: non`, réponse = rang ; eval ne
connaît ni `>` ni `==` dans une valeur (indicatrices par floor / min / max / abs) ; `log` d'eval
est le logarithme népérien : log décimal = log(y)/log(10), évité ici (y = 10^k).

    python3 docs/wip/questions/lot-ttechno-7.py scripts/questions/ttechno-7-deux-variables
"""
import json
import os
import sys

DOSSIER = sys.argv[1]


def spec(desc, vi, variables_, answers, status, violations=None):
    if isinstance(answers, str):
        answers = [answers]
    expected = {'status': status}
    if violations:
        expected['constraintViolations'] = violations
    return {'description': desc, 'variationIndex': vi, 'variables': variables_,
            'answers': answers, 'expected': expected}


def specs_choix(vi, variables_, bonne, erreurs):
    """erreurs : {rang: description} des propositions fausses."""
    out = [spec('choix : bonne réponse ' + str(bonne), vi, variables_, str(bonne), 'correct')]
    out += [spec('Erreur : ' + d, vi, variables_, str(j), 'incorrect')
            for j, d in sorted(erreurs.items())]
    return out


def modele(title, description, level, delay, variations, specs, shared=None):
    # Ni theme, ni domain, ni subdomain (ADR 0035) ; nœud et tag posés par la migration.
    return {'title': title, 'description': description, 'grades': ['T_TECHNO'], 'level': level,
            'delay': delay, 'status': 'draft', 'shared': shared or {}, 'variations': variations,
            'testSpecs': specs}


def var(nom, expression):
    return {'name': nom, 'expression': expression}


def case(reponse, **reglages):
    b = {'expectedAnswer': reponse}
    b.update(reglages)
    return b


def variation(statement, variables, reponses, steps, conditions=None):
    v = {'statement': statement, 'variables': variables, 'conditions': conditions or []}
    if reponses is not None:  # None : geste placer:, sans case
        if not isinstance(reponses, list):
            reponses = [reponses]
        v['blanks'] = [r if isinstance(r, dict) else {'expectedAnswer': r} for r in reponses]
    v['correction'] = {'steps': steps}
    return v


def col(x):
    return '\\textcolor{{{color:primary.0}}}{' + x + '}'


def colt(x):
    """Couleur hors d'une formule : entourée de $."""
    return '$' + col(x) + '$'


def choix(*options):
    return '\n\n```choix\nmelanger: non\n' + ''.join('- ' + o + '\n' for o in options) + '```'


def nuage(xs, ys, nomx, nomy, description, titre):
    """Nuage de points sans ajustement : les valeurs sont données (déjà transformées)."""
    return ('```nuage\n'
            'titre: ' + titre + '\n'
            'nom x: ' + nomx + '\n'
            'nom y: ' + nomy + '\n'
            'x: ' + ' ; '.join(xs) + '\n'
            'y: ' + ' ; '.join(ys) + '\n'
            'taille: petite\n'
            'description: ' + description + '\n'
            '```')


def tableau(lignes):
    """lignes : [(entête, [valeurs])] → tableau markdown à une ligne d'en-tête vide."""
    n = len(lignes[0][1])
    out = '| ' + lignes[0][0] + ' | ' + ' | '.join(lignes[0][1]) + ' |\n'
    out += '|' + '---|' * (n + 1) + '\n'
    for tete, vals in lignes[1:]:
        out += '| ' + tete + ' | ' + ' | '.join(vals) + ' |\n'
    return out


def m(x):
    return '$' + x + '$'


DECIMAL = {'blankDefaults': {'acceptDecimal': True}}

# --- D1, TTECHNO-050 : quel changement de variable redresse le nuage -----------------------

X16 = [str(k) for k in range(1, 7)]
X05 = [str(k) for k in range(0, 6)]
T16 = [str(k * k) for k in range(1, 7)]

# v0 : y = a·x² + b → nuage (t ; y) aligné
Y_V0 = ['{{eval:a*' + str(k * k) + '+b;d}}' for k in range(1, 7)]
Z_V0 = ['{{eval:round(1000/(a*' + str(k * k) + '+b))/1000;d}}' for k in range(1, 7)]
# v1 : y = 100/(a·x + b) → nuage (x ; z = 1/y) aligné, z = (a·x + b)/100
Y_V1 = ['{{eval:round(10000/(a*' + str(k) + '+b))/100;d}}' for k in range(1, 7)]
Z_V1 = ['{{eval:(a*' + str(k) + '+b)/100;d}}' for k in range(1, 7)]
# v2 : log(y) = p·x + q → nuage (x ; z = log(y)) aligné
Y_V2 = ['{{eval:round(10^(p*' + str(k) + '+q))}}' for k in range(0, 6)]
Z_V2 = ['{{eval:p*' + str(k) + '+q;d}}' for k in range(0, 6)]
T_V2 = [str(k * k) for k in range(0, 6)]

QUESTION_D1 = ('Lequel des deux changements de variable donne un nuage de points presque alignés,'
               ' qui permet un ajustement affine ?')
ALIGNES = ('Un ajustement affine n\'a de sens que si les points du nuage sont presque alignés :'
           ' on regarde la forme de chaque nuage.')

D1 = modele(
    'Quel changement de variable redresse le nuage ?',
    'Nuage (x ; y) courbé et deux nuages obtenus par changement de variable (t = x², z = 1/y,'
    ' z = log(y)) : lequel donne des points alignés',
    1, 60,
    [
        variation(
            'On étudie une série statistique $(x_i\\,;y_i)$. Voici son nuage de points, puis'
            ' les nuages obtenus avec deux changements de variable.\n\n'
            + nuage(X16, Y_V0, 'x', 'y', 'Nuage (x ; y) : les points montent de plus en plus'
                    ' vite, le nuage est courbé.', 'Nuage (x ; y)') + '\n\n'
            + nuage(T16, Y_V0, 't', 'y', 'Nuage (t ; y) avec t = x².', 'Nuage (t ; y), t = x²')
            + '\n\n'
            + nuage(X16, Z_V0, 'x', 'z', 'Nuage (x ; z) avec z = 1/y.', 'Nuage (x ; z), z = 1/y')
            + '\n\n' + QUESTION_D1
            + choix('$t=x^2$ : le nuage $(t\\,;y)$', '$z=\\dfrac{1}{y}$ : le nuage $(x\\,;z)$',
                    'Aucun des deux'),
            [var('a', '0.5|2|3'), var('b', '1..5')], '0',
            [ALIGNES,
             'Le nuage $(t\\,;y)$ avec $t=x^2$ a ses points alignés : on peut conjecturer une'
             ' relation $y=at+b$, c\'est-à-dire $y=ax^2+b$. Réponse : '
             + colt('t=x^2') + '.',
             'Le nuage $(x\\,;z)$ avec $z=\\dfrac{1}{y}$ reste courbé : ce changement de variable'
             ' ne convient pas.'],
        ),
        variation(
            'On étudie une série statistique $(x_i\\,;y_i)$. Voici son nuage de points, puis'
            ' les nuages obtenus avec deux changements de variable.\n\n'
            + nuage(X16, Y_V1, 'x', 'y', 'Nuage (x ; y) : les points descendent de moins en'
                    ' moins vite, le nuage est courbé.', 'Nuage (x ; y)') + '\n\n'
            + nuage(T16, Y_V1, 't', 'y', 'Nuage (t ; y) avec t = x².', 'Nuage (t ; y), t = x²')
            + '\n\n'
            + nuage(X16, Z_V1, 'x', 'z', 'Nuage (x ; z) avec z = 1/y.', 'Nuage (x ; z), z = 1/y')
            + '\n\n' + QUESTION_D1
            + choix('$t=x^2$ : le nuage $(t\\,;y)$', '$z=\\dfrac{1}{y}$ : le nuage $(x\\,;z)$',
                    'Aucun des deux'),
            [var('a', '2|4|5'), var('b', '5|10|20')], '1',
            [ALIGNES,
             'Le nuage $(t\\,;y)$ avec $t=x^2$ reste courbé : ce changement de variable ne'
             ' convient pas.',
             'Le nuage $(x\\,;z)$ avec $z=\\dfrac{1}{y}$ a ses points alignés : on peut conjecturer'
             ' une relation $z=ax+b$, c\'est-à-dire $\\dfrac{1}{y}=ax+b$. Réponse : '
             + colt('z=\\dfrac{1}{y}') + '.'],
        ),
        variation(
            'On étudie une série statistique $(x_i\\,;y_i)$. Voici son nuage de points, puis'
            ' les nuages obtenus avec deux changements de variable.\n\n'
            + nuage(X05, Y_V2, 'x', 'y', 'Nuage (x ; y) : les points montent de plus en plus'
                    ' vite, le nuage est courbé.', 'Nuage (x ; y)') + '\n\n'
            + nuage(T_V2, Y_V2, 't', 'y', 'Nuage (t ; y) avec t = x².', 'Nuage (t ; y), t = x²')
            + '\n\n'
            + nuage(X05, Z_V2, 'x', 'z', 'Nuage (x ; z) avec z = log(y).',
                    'Nuage (x ; z), z = log(y)')
            + '\n\n' + QUESTION_D1
            + choix('$t=x^2$ : le nuage $(t\\,;y)$', '$z=\\log(y)$ : le nuage $(x\\,;z)$',
                    'Aucun des deux'),
            [var('p', '0.25|0.5'), var('q', '0.5|1')], '1',
            [ALIGNES,
             'Le nuage $(t\\,;y)$ avec $t=x^2$ reste courbé : ce changement de variable ne'
             ' convient pas.',
             'Le nuage $(x\\,;z)$ avec $z=\\log(y)$ a ses points alignés : on peut conjecturer'
             ' une relation $z=ax+b$, c\'est-à-dire $\\log(y)=ax+b$. Réponse : '
             + colt('z=\\log(y)') + '.'],
        ),
    ],
    specs_choix(0, {'a': '2', 'b': '3'}, 0, {1: 'z = 1/y', 2: 'aucun'})
    + specs_choix(1, {'a': '4', 'b': '10'}, 1, {0: 't = x²', 2: 'aucun'})
    + specs_choix(2, {'p': '0.5', 'q': '1'}, 1, {0: 't = x²', 2: 'aucun'}),
    shared=DECIMAL,
)

# --- D2, TTECHNO-052 : représenter le nuage transformé --------------------------------------

XC = ['{{c}}', '{{eval:c+1}}', '{{eval:c+2}}', '{{eval:c+3}}']
TC = ['{{eval:c^2}}', '{{eval:(c+1)^2}}', '{{eval:(c+2)^2}}', '{{eval:(c+3)^2}}']
YC = ['{{eval:3*c^2+d}}', '{{eval:3*(c+1)^2+d}}', '{{eval:3*(c+2)^2+d}}',
      '{{eval:3*(c+3)^2+d}}']
Y_INV = ['{{y1}}', '{{y2}}', '{{y3}}', '{{y4}}']
Z_INV = ['{{eval:1/y1;d}}', '{{eval:1/y2;d}}', '{{eval:1/y3;d}}', '{{eval:1/y4;d}}']
Y_LOG = ['{{eval:10^k1;d}}', '{{eval:10^k2;d}}', '{{eval:10^k3;d}}', '{{eval:10^k4;d}}']
# v3 : placer les points (t ; y), t = x² pour x = 1..4, y = t + b + (1, −1, 0, 1)
Y_PL = ['{{eval:b+2}}', '{{eval:b+3}}', '{{eval:b+9}}', '{{eval:b+17}}']

D2 = modele(
    'Effectuer un changement de variable et représenter le nuage',
    'Tableau de valeurs transformées à compléter (t = x², z = 1/y, z = log(y)) ; points'
    ' (t ; y) à placer dans un repère',
    1, 60,
    [
        variation(
            'On étudie la série statistique suivante.\n\n'
            + tableau([('$x_i$', [m(v) for v in XC]), ('$y_i$', [m(v) for v in YC])])
            + '\nOn pose $t=x^2$. Complète le tableau des valeurs de $t_i$.\n\n'
            + tableau([('$x_i$', [m(v) for v in XC]), ('$t_i$', ['$?$'] * 4)]),
            [var('c', '1..5'), var('d', '-2..2')], TC,
            ['On élève chaque $x_i$ au carré : $t_i=x_i^2$.',
             '$t_1=' + col(TC[0]) + '$, $t_2=' + col(TC[1]) + '$, $t_3=' + col(TC[2])
             + '$, $t_4=' + col(TC[3]) + '$.',
             'Les $y_i$ ne changent pas : le nouveau nuage est formé des points $(t_i\\,;y_i)$.'],
        ),
        variation(
            'On étudie la série statistique suivante.\n\n'
            + tableau([('$x_i$', ['$1$', '$2$', '$3$', '$4$']), ('$y_i$', [m(v) for v in Y_INV])])
            + '\nOn pose $z=\\dfrac{1}{y}$. Complète le tableau des valeurs de $z_i$, en écriture'
            ' décimale.\n\n'
            + tableau([('$x_i$', ['$1$', '$2$', '$3$', '$4$']), ('$z_i$', ['$?$'] * 4)]),
            [var('y1', '2|4|5|8'), var('y2', '10|20|25'), var('y3', '40|50'),
             var('y4', '80|100|125')], Z_INV,
            ['On prend l\'inverse de chaque $y_i$ : $z_i=\\dfrac{1}{y_i}$.',
             '$z_1=\\dfrac{1}{ {{y1}} }=' + col(Z_INV[0]) + '$, $z_2=\\dfrac{1}{ {{y2}} }='
             + col(Z_INV[1]) + '$, $z_3=\\dfrac{1}{ {{y3}} }=' + col(Z_INV[2])
             + '$, $z_4=\\dfrac{1}{ {{y4}} }=' + col(Z_INV[3]) + '$.',
             'Les $x_i$ ne changent pas : le nouveau nuage est formé des points $(x_i\\,;z_i)$.'],
        ),
        variation(
            'On étudie la série statistique suivante.\n\n'
            + tableau([('$x_i$', ['$0$', '$1$', '$2$', '$3$']), ('$y_i$', [m(v) for v in Y_LOG])])
            + '\nOn pose $z=\\log(y)$. Complète le tableau des valeurs de $z_i$.\n\n'
            + tableau([('$x_i$', ['$0$', '$1$', '$2$', '$3$']), ('$z_i$', ['$?$'] * 4)]),
            [var('k1', '-1|0'), var('k2', '1'), var('k3', '2'), var('k4', '3|4')],
            ['{{k1}}', '{{k2}}', '{{k3}}', '{{k4}}'],
            ['Pour tout entier $n$, $\\log(10^n)=n$.',
             '$z_1=\\log(' + Y_LOG[0] + ')=' + col('{{k1}}') + '$, $z_2=\\log(' + Y_LOG[1] + ')='
             + col('{{k2}}') + '$, $z_3=\\log(' + Y_LOG[2] + ')=' + col('{{k3}}')
             + '$, $z_4=\\log(' + Y_LOG[3] + ')=' + col('{{k4}}') + '$.',
             'Les $x_i$ ne changent pas : le nouveau nuage est formé des points $(x_i\\,;z_i)$.'],
        ),
        variation(
            'On étudie la série statistique suivante.\n\n'
            + tableau([('$x_i$', ['$1$', '$2$', '$3$', '$4$']), ('$y_i$', [m(v) for v in Y_PL])])
            + '\nOn pose $t=x^2$. Place les points $A$, $B$, $C$ et $D$ de coordonnées'
            ' $(t_i\\,;y_i)$.\n\n'
            '```courbe\nx: -1 ; 17\ny: {{eval:b-1}} ; {{eval:b+19}}\ngrille: 1 ; 1\n'
            'axes: x = t ; y = y\n'
            'placer: A=(1 ; {{eval:b+2}}) ; B=(4 ; {{eval:b+3}}) ; C=(9 ; {{eval:b+9}}) ;'
            ' D=(16 ; {{eval:b+17}})\n'
            'taille: moyenne\n'
            'description: Repère : t de −1 à 17, y de {{eval:b-1}} à {{eval:b+19}}, de 1 en 1.\n'
            '```',
            [var('b', '0..3')], None,
            ['On calcule $t_i=x_i^2$ : $t_1=1$, $t_2=4$, $t_3=9$, $t_4=16$.',
             'Les points sont $A(1\\,;{{eval:b+2}})$, $B(4\\,;{{eval:b+3}})$,'
             ' $C(9\\,;{{eval:b+9}})$ et $D(16\\,;{{eval:b+17}})$.',
             '```courbe\nx: -1 ; 17\ny: {{eval:b-1}} ; {{eval:b+19}}\ngrille: 1 ; 1\n'
             'axes: x = t ; y = y\n'
             'points: A(1 ; {{eval:b+2}}), B(4 ; {{eval:b+3}}), C(9 ; {{eval:b+9}}),'
             ' D(16 ; {{eval:b+17}})\n'
             'taille: moyenne\n'
             'description: Les quatre points (t ; y) placés : ils sont presque alignés.\n```',
             'Les points $(t_i\\,;y_i)$ sont presque alignés : un ajustement affine de $y$ en'
             ' $t$ est possible.'],
        ),
    ],
    [
        spec('c = 2 : 4, 9, 16, 25', 0, {'c': '2', 'd': '1'}, ['4', '9', '16', '25'], 'correct'),
        spec('Erreur : 2x au lieu de x² (4, 6, 8, 10)', 0, {'c': '2', 'd': '1'},
             ['4', '6', '8', '10'], 'incorrect'),
        spec('c = 5 : 25, 36, 49, 64', 0, {'c': '5', 'd': '0'}, ['25', '36', '49', '64'],
             'correct'),
        spec('1/y : 0,25 ; 0,05 ; 0,02 ; 0,01', 1, {'y1': '4', 'y2': '20', 'y3': '50', 'y4': '100'},
             ['0,25', '0,05', '0,02', '0,01'], 'correct'),
        spec('Erreur : y/10 au lieu de 1/y', 1, {'y1': '4', 'y2': '20', 'y3': '50', 'y4': '100'},
             ['0,4', '2', '5', '10'], 'incorrect'),
        spec('1/8 = 0,125 ; 1/125 = 0,008', 1, {'y1': '8', 'y2': '10', 'y3': '40', 'y4': '125'},
             ['0,125', '0,1', '0,025', '0,008'], 'correct'),
        spec('log : −1, 1, 2, 3', 2, {'k1': '-1', 'k2': '1', 'k3': '2', 'k4': '3'},
             ['-1', '1', '2', '3'], 'correct'),
        spec('Erreur : log(0,1) = 0,1', 2, {'k1': '-1', 'k2': '1', 'k3': '2', 'k4': '3'},
             ['0,1', '1', '2', '3'], 'incorrect'),
        spec('log : 0, 1, 2, 4', 2, {'k1': '0', 'k2': '1', 'k3': '2', 'k4': '4'},
             ['0', '1', '2', '4'], 'correct'),
        spec('b = 1 : A(1;3) B(4;4) C(9;10) D(16;18)', 3, {'b': '1'},
             ['1;3', '4;4', '9;10', '16;18'], 'correct'),
        spec('Erreur : x au lieu de t (1, 2, 3, 4)', 3, {'b': '1'},
             ['1;3', '2;4', '3;10', '4;18'], 'incorrect'),
        spec('b = 0 : A(1;2) B(4;3) C(9;9) D(16;17)', 3, {'b': '0'},
             ['1;2', '4;3', '9;9', '16;17'], 'correct'),
    ],
    shared=DECIMAL,
)

# --- D3, TTECHNO-088 : conjecturer une relation de linéarité --------------------------------

X15 = ['1', '2', '3', '4', '5']
T15 = ['1', '4', '9', '16', '25']
Y_PROP = ['{{eval:a*' + t + ';d}}' for t in T15]
X04 = ['0', '1', '2', '3', '4']
Z_AFF = ['{{eval:p*' + x + '+q;d}}' for x in X04]
# v2 : log(y) presque affine en x : z = 0,5x + 1 + bruit
BRUIT = ['0.03', '-0.04', '0.02', '-0.03', '0.04', '-0.02']
X_LOG = ['0', '1', '2', '3', '4', '5']
Z_LOG = ['{{eval:0.5*' + x + '+q+(' + b + ');d}}' for x, b in zip(X_LOG, BRUIT)]

D3 = modele(
    'Conjecturer une relation linéaire entre de nouvelles variables',
    'Après un changement de variable : y proportionnel à t = x² (coefficient), z = 1/y affine en x'
    ' (coefficients), log(y) affine en x (choix de la conjecture)',
    1, 60,
    [
        variation(
            'On étudie la série statistique suivante et on pose $t=x^2$.\n\n'
            + tableau([('$x_i$', [m(v) for v in X15]), ('$t_i$', [m(v) for v in T15]),
                       ('$y_i$', [m(v) for v in Y_PROP])])
            + '\n' + nuage(T15, Y_PROP, 't', 'y', 'Nuage (t ; y) : les points sont alignés avec'
                           ' l\'origine du repère.', 'Nuage (t ; y), t = x²')
            + '\n\nLes points $(t_i\\,;y_i)$ semblent alignés avec l\'origine : on conjecture'
            ' une relation de la forme $y=kt$. Donne $k$.\n\n$k=?$',
            [var('a', '0.5|1.5|2|3|4')], '{{a}}',
            ['Si $y=kt$, alors $k=\\dfrac{y}{t}$ pour chaque point.',
             '$\\dfrac{y_1}{t_1}=\\dfrac{' + Y_PROP[0] + '}{1}=' + Y_PROP[0] + '$, $\\dfrac{y_2}{t_2}'
             '=\\dfrac{' + Y_PROP[1] + '}{4}=' + Y_PROP[0] + '$ : le quotient est le même pour'
             ' tous les points.',
             '$k=' + col('{{a}}') + '$ : on conjecture $y={{a}}t$, c\'est-à-dire $y={{a}}x^2$.'],
        ),
        variation(
            'On étudie une série statistique $(x_i\\,;y_i)$ et on pose $z=\\dfrac{1}{y}$.\n\n'
            + tableau([('$x_i$', [m(v) for v in X04]), ('$z_i$', [m(v) for v in Z_AFF])])
            + '\n' + nuage(X04, Z_AFF, 'x', 'z', 'Nuage (x ; z) : les points sont alignés.',
                           'Nuage (x ; z), z = 1/y')
            + '\n\nLes points $(x_i\\,;z_i)$ semblent alignés : on conjecture une relation de la'
            ' forme $z=ax+b$. Donne $a$ et $b$.\n\n$a=?$\n\n$b=?$',
            [var('p', '0.05|0.1|0.2'), var('q', '0.1|0.3|0.5')], ['{{p}}', '{{q}}'],
            ['$b$ est la valeur de $z$ pour $x=0$ : $b=' + col('{{q}}') + '$.',
             'Quand $x$ augmente de $1$, $z$ augmente toujours de ${{p}}$ : $a=' + col('{{p}}')
             + '$.',
             'On conjecture $z={{p}}x+{{q}}$, c\'est-à-dire'
             ' $\\dfrac{1}{y}={{p}}x+{{q}}$.'],
        ),
        variation(
            'On étudie une série statistique $(x_i\\,;y_i)$ et on pose $z=\\log(y)$. Voici le'
            ' nuage des points $(x_i\\,;z_i)$.\n\n'
            + nuage(X_LOG, Z_LOG, 'x', 'z', 'Nuage (x ; z) : les points sont presque alignés'
                    ' sur une droite qui monte.', 'Nuage (x ; z), z = log(y)')
            + '\n\nQuelle conjecture peut-on faire ?'
            + choix('$y$ semble être une fonction affine de $x$',
                    '$\\log(y)$ semble être une fonction affine de $x$',
                    '$y$ semble proportionnel à $\\log(x)$',
                    'On ne peut rien conjecturer'),
            [var('q', '0.5|1|1.5')], '1',
            ['Les points $(x_i\\,;z_i)$ sont presque alignés : $z$ semble être une fonction'
             ' affine de $x$.',
             'Comme $z=\\log(y)$, c\'est ' + colt('\\log(y)') + ' qui semble être une fonction'
             ' affine de $x$ : $\\log(y)\\approx ax+b$.',
             'Le nuage $(x\\,;y)$ lui-même n\'est pas forcément aligné : on ne peut rien dire de'
             ' $y$ directement.'],
        ),
    ],
    [
        spec('a = 3 : k = 3', 0, {'a': '3'}, '3', 'correct'),
        spec('Erreur : y/x au lieu de y/t (k = 3x)', 0, {'a': '3'}, '6', 'incorrect'),
        spec('a = 0,5 : k = 0,5', 0, {'a': '0.5'}, '0,5', 'correct'),
        spec('p = 0,1, q = 0,3', 1, {'p': '0.1', 'q': '0.3'}, ['0,1', '0,3'], 'correct'),
        spec('Erreur : a et b inversés', 1, {'p': '0.1', 'q': '0.3'}, ['0,3', '0,1'],
             'incorrect'),
        spec('p = 0,05, q = 0,5', 1, {'p': '0.05', 'q': '0.5'}, ['0,05', '0,5'], 'correct'),
    ]
    + specs_choix(2, {'q': '1'}, 1, {0: 'y affine en x', 2: 'y proportionnel à log(x)',
                                     3: 'rien'}),
    shared=DECIMAL,
)

# --- D4, TTECHNO-051 : ajustement par changement de variable --------------------------------

# v3 : droite de Mayer sur (x ; z), x = 1..6, z = m·x + p + ε, ε = (1, −1, 0, 0, 1, −1)
EPS = [1, -1, 0, 0, 1, -1]
Z_MAYER = ['{{eval:m*' + str(k) + '+p' + ('+' + str(e) if e > 0 else (str(e) if e < 0 else ''))
           + '}}' for k, e in zip(range(1, 7), EPS)]

D4 = modele(
    'Ajustement affine après un changement de variable',
    'Droite donnée par la calculatrice après z = 1/y, t = x² ou z = log(y) : estimer y ; droite de'
    ' Mayer calculée par les deux points moyens',
    2, 120,
    [
        variation(
            'Pour une série statistique $(x_i\\,;y_i)$, on a posé $z=\\dfrac{1}{y}$. La'
            ' calculatrice donne l\'ajustement affine $z={{a}}x+{{b}}$.\n\n'
            'Estime $y$ pour $x={{x0}}$. Donne la valeur arrondie au centième.\n\n$y\\approx?$',
            [var('a', '0.02|0.04|0.05'), var('b', '0.1|0.2|0.3'), var('x0', '10..20')],
            case('{{eval:round(100/(a*x0+b))/100;d}}', precision={'type': 'decimal',
                                                                  'digits': 2}),
            ['Pour $x={{x0}}$ : $z={{a}}\\times{{x0}}+{{b}}={{eval:a*x0+b;d}}$.',
             'Comme $z=\\dfrac{1}{y}$, $y=\\dfrac{1}{z}=\\dfrac{1}{ {{eval:a*x0+b;d}} }\\approx'
             + col('{{eval:round(100/(a*x0+b))/100;d}}') + '$.'],
            ['abs(100/(a*x0+b)-floor(100/(a*x0+b))-0.5) > 0.05'],
        ),
        variation(
            'Pour une série statistique $(x_i\\,;y_i)$, on a posé $t=x^2$. La calculatrice donne'
            ' l\'ajustement affine $y={{a}}t+{{b}}$.\n\n'
            'Estime $y$ pour $x={{x0}}$.\n\n$y\\approx?$',
            [var('a', '0.5|1.5|2.5'), var('b', '2..10'), var('x0', '8..12')],
            '{{eval:a*x0^2+b;d}}',
            ['Pour $x={{x0}}$ : $t={{x0}}^2={{eval:x0^2}}$.',
             '$y\\approx{{a}}\\times{{eval:x0^2}}+{{b}}=' + col('{{eval:a*x0^2+b;d}}') + '$.'],
        ),
        variation(
            'Pour une série statistique $(x_i\\,;y_i)$, on a posé $z=\\log(y)$. La calculatrice'
            ' donne l\'ajustement affine $z=0{,}5x+{{b}}$.\n\n'
            'Estime $z$ puis $y$ pour $x={{x0}}$.\n\n$z\\approx?$\n\n$y\\approx?$',
            [var('b', '0.5|1|1.5'), var('x0', '1..7')],
            ['{{eval:0.5*x0+b}}', '{{eval:10^(0.5*x0+b)}}'],
            ['Pour $x={{x0}}$ : $z=0{,}5\\times{{x0}}+{{b}}=' + col('{{eval:0.5*x0+b}}') + '$.',
             'Comme $z=\\log(y)$, $y=10^z=10^{ {{eval:0.5*x0+b}} }='
             + col('{{eval:10^(0.5*x0+b)}}') + '$.'],
            ['mod(x0+2*b, 2) < 0.5'],
        ),
        variation(
            'On a effectué un changement de variable et obtenu la série $(x_i\\,;z_i)$'
            ' suivante.\n\n'
            + tableau([('$x_i$', [str(k) for k in range(1, 7)]),
                       ('$z_i$', [m(v) for v in Z_MAYER])])
            + '\nLa droite de Mayer passe par le point moyen $G_1$ des trois premiers points et'
            ' le point moyen $G_2$ des trois derniers. Son équation s\'écrit $z=ax+b$.'
            ' Donne $a$ et $b$.\n\n$a=?$\n\n$b=?$',
            [var('m', '2..4'), var('p', '1..6')], ['{{m}}', '{{p}}'],
            ['$G_1$ : $x=\\dfrac{1+2+3}{3}=2$ et $z=\\dfrac{' + '+'.join(Z_MAYER[:3])
             + '}{3}={{eval:2*m+p}}$, donc $G_1(2\\,;{{eval:2*m+p}})$.',
             '$G_2$ : $x=\\dfrac{4+5+6}{3}=5$ et $z=\\dfrac{' + '+'.join(Z_MAYER[3:])
             + '}{3}={{eval:5*m+p}}$, donc $G_2(5\\,;{{eval:5*m+p}})$.',
             '$a=\\dfrac{ {{eval:5*m+p}}-{{eval:2*m+p}} }{5-2}=\\dfrac{ {{eval:3*m}} }{3}='
             + col('{{m}}') + '$.',
             '$G_1$ est sur la droite : ${{eval:2*m+p}}={{m}}\\times2+b$, donc $b=' + col('{{p}}')
             + '$. La droite de Mayer a pour équation $z={{m}}x+{{p}}$.'],
        ),
    ],
    [
        spec('a = 0,04, b = 0,2, x0 = 12 : 1/0,68 ≈ 1,47', 0,
             {'a': '0.04', 'b': '0.2', 'x0': '12'}, '1,47', 'correct'),
        spec('Erreur : z au lieu de y (0,68)', 0, {'a': '0.04', 'b': '0.2', 'x0': '12'}, '0,68',
             'incorrect'),
        spec('Erreur : arrondi au dixième', 0, {'a': '0.04', 'b': '0.2', 'x0': '12'}, '1,5',
             'incorrect'),
        spec('a = 1,5, b = 4, x0 = 10 : 154', 1, {'a': '1.5', 'b': '4', 'x0': '10'}, '154',
             'correct'),
        spec('Erreur : t oublié (1,5 × 10 + 4 = 19)', 1, {'a': '1.5', 'b': '4', 'x0': '10'}, '19',
             'incorrect'),
        spec('b = 1, x0 = 4 : z = 3, y = 1 000', 2, {'b': '1', 'x0': '4'}, ['3', '1000'],
             'correct'),
        spec('Erreur : y = z', 2, {'b': '1', 'x0': '4'}, ['3', '3'], 'incorrect'),
        spec('Erreur : y = 10z (30)', 2, {'b': '1', 'x0': '4'}, ['3', '30'], 'incorrect'),
        spec('b = 0,5, x0 = 3 : z = 2, y = 100', 2, {'b': '0.5', 'x0': '3'}, ['2', '100'],
             'correct'),
        spec('m = 3, p = 2 : a = 3, b = 2', 3, {'m': '3', 'p': '2'}, ['3', '2'], 'correct'),
        spec('Erreur : a et b inversés', 3, {'m': '3', 'p': '2'}, ['2', '3'], 'incorrect'),
        spec('Erreur : b lu à G1 (8)', 3, {'m': '3', 'p': '2'}, ['3', '8'], 'incorrect'),
    ],
    shared=DECIMAL,
)

# --- D5, TTECHNO-053 : somme des carrés des écarts ------------------------------------------

Y_ECARTS = ['{{eval:a+b+d1}}', '{{eval:2*a+b+d2}}', '{{eval:3*a+b+d3}}']

D5 = modele(
    'Somme des carrés des écarts à une droite',
    'Calculer Σ(yᵢ − (axᵢ + b))² sur trois points ; ligne d\'une fonction Python ; formule de'
    ' tableur à recopier vers le bas',
    2, 90,
    [
        variation(
            'On considère la série statistique suivante et la droite d\'équation'
            ' $y={{a}}x+{{b}}$.\n\n'
            + tableau([('$x_i$', ['$1$', '$2$', '$3$']), ('$y_i$', [m(v) for v in Y_ECARTS])])
            + '\nCalcule la somme des carrés des écarts'
            ' $S=\\sum_i\\left(y_i-({{a}}x_i+{{b}})\\right)^2$.\n\n$S=?$',
            [var('a', '2..4'), var('b', '1..5'), var('d1', '-2..2'), var('d2', '-2..2'),
             var('d3', '-2..2')], '{{eval:d1^2+d2^2+d3^2}}',
            ['Pour chaque point, on calcule l\'écart $y_i-({{a}}x_i+{{b}})$ :'
             ' ${{eval:a+b+d1}}-{{eval:a+b}}={{d1}}$, ${{eval:2*a+b+d2}}-{{eval:2*a+b}}={{d2}}$'
             ' et ${{eval:3*a+b+d3}}-{{eval:3*a+b}}={{d3}}$.',
             'On élève chaque écart au carré, puis on ajoute :'
             ' $S=({{d1}})^2+({{d2}})^2+({{d3}})^2=' + col('{{eval:d1^2+d2^2+d3^2}}') + '$.'],
            ['d1^2+d2^2+d3^2 > 1', 'abs(d1)+abs(d2)+abs(d3) > abs(d1+d2+d3)'],
        ),
        variation(
            'La fonction Python `S` reçoit les listes `X` et `Y` des valeurs d\'une série'
            ' statistique, et les nombres `a` et `b`. Elle doit renvoyer la somme des carrés des'
            ' écarts $\\sum_i\\left(y_i-(ax_i+b)\\right)^2$.'
            '\n\n```python\ndef S(X, Y, a, b):\n    s = 0\n    for i in range(len(X)):\n'
            '        s = s + ...\n    return s\n```\n\n'
            'Que faut-il écrire à la place des points de suspension ?'
            + choix('`Y[i] - (a*X[i] + b)**2`', '`(Y[i] - a*X[i] + b)**2`',
                    '`(Y[i] - (a*X[i] + b))**2`', '`(Y[i] - (a*X[i] + b))*2`'),
            [], '2',
            ['À chaque tour de boucle, on ajoute à `s` le carré de l\'écart du point numéro `i` :'
             ' l\'écart est `Y[i] - (a*X[i] + b)`, et `**2` élève au carré.',
             'Les parenthèses comptent : la ligne est `s = s + (Y[i] - (a*X[i] + b))**2`,'
             ' la ' + colt('\\text{troisième}') + ' proposition.',
             '`Y[i] - (a*X[i] + b)**2` n\'élève au carré que `a*X[i] + b` ;'
             ' `(Y[i] - a*X[i] + b)**2` change le signe de `b` ; `*2` multiplie par 2 au lieu'
             ' d\'élever au carré.'],
        ),
        variation(
            'Dans une feuille de calcul, les valeurs $x_i$ sont en colonne A, les valeurs $y_i$ en'
            ' colonne B (lignes 2 à 7), $a$ est dans la cellule F1 et $b$ dans la cellule F2.\n\n'
            '|   | A | B | C |\n|---|---|---|---|\n| 1 | x | y | carré de l\'écart |\n'
            '| 2 | 1 | 4,1 |   |\n| 3 | 2 | 5,8 |   |\n\n'
            'On veut écrire en C2 une formule, puis la recopier vers le bas jusqu\'en C7, pour'
            ' obtenir le carré de l\'écart $\\left(y_i-(ax_i+b)\\right)^2$ de chaque ligne.'
            ' Quelle formule écrire en C2 ?'
            + choix('=(B2-(F1*A2+F2))^2', '=(B2-(\\$F\\$1*A2+\\$F\\$2))^2', '=B2-(\\$F\\$1*A2+\\$F\\$2)^2',
                    '=(B2-\\$F\\$1*A2+\\$F\\$2)^2'),
            [], '1',
            ['L\'écart de la ligne 2 est B2 − (F1 × A2 + F2) ; « ^2 » élève au carré, avec des'
             ' parenthèses autour de tout l\'écart.',
             'En recopiant vers le bas, A2 et B2 deviennent A3 et B3 (c\'est voulu), mais F1 et F2'
             ' deviendraient F2 et F3 : il faut les bloquer avec des « \\$ » : \\$F\\$1 et \\$F\\$2.',
             'La bonne formule est « =(B2-(\\$F\\$1*A2+\\$F\\$2))^2 », la '
             + colt('\\text{deuxième}') + '. La somme s\'obtient ensuite par'
             ' « =SOMME(C2:C7) ».'],
        ),
    ],
    [
        spec('a = 2, b = 1, écarts 1, −1, 2 : S = 6', 0,
             {'a': '2', 'b': '1', 'd1': '1', 'd2': '-1', 'd3': '2'}, '6', 'correct'),
        spec('Erreur : somme des écarts sans carré (2)', 0,
             {'a': '2', 'b': '1', 'd1': '1', 'd2': '-1', 'd3': '2'}, '2', 'incorrect'),
        spec('Erreur : somme des valeurs absolues (4)', 0,
             {'a': '2', 'b': '1', 'd1': '1', 'd2': '-1', 'd3': '2'}, '4', 'incorrect'),
        spec('écarts 0, −2, 1 : S = 5', 0,
             {'a': '3', 'b': '4', 'd1': '0', 'd2': '-2', 'd3': '1'}, '5', 'correct'),
    ]
    + specs_choix(1, {}, 2, {0: 'carré de la droite seule', 1: 'signe de b',
                             3: 'fois 2'})
    + specs_choix(2, {}, 1, {0: 'sans $', 2: 'carré mal placé', 3: 'signe de b'}),
    shared=DECIMAL,
)

# --- D6, TTECHNO-054 : chercher le couple (a ; b) qui minimise -------------------------------

COUPLES = ['(1{,}5\\,;2)', '(2\\,;1)', '(2\\,;1{,}5)', '(2{,}5\\,;0{,}5)']
S_V0 = ['{{eval:s1/10;d}}', '{{eval:s2/10;d}}', '{{eval:s3/10;d}}', '{{eval:s4/10;d}}']
Y_D6 = ['{{eval:3+d1}}', '{{eval:5+d2}}', '{{eval:7+d3}}']

D6 = modele(
    'Chercher le couple (a ; b) qui minimise la somme des carrés',
    'Parmi des couples (a ; b), garder celui de plus petite somme des carrés des écarts :'
    ' lecture d\'un tableau, calcul pour deux couples, balayage Python, formule de tableur',
    2, 90,
    [
        variation(
            'Pour ajuster une série statistique par une droite $y=ax+b$, on a calculé la somme'
            ' des carrés des écarts $S=\\sum_i\\left(y_i-(ax_i+b)\\right)^2$ pour quatre couples'
            ' $(a\\,;b)$.\n\n'
            + tableau([('$(a\\,;b)$', [m(c) for c in COUPLES]), ('$S$', [m(s) for s in S_V0])])
            + '\nQuel couple faut-il garder ?'
            + choix(*[m(c) for c in COUPLES]),
            [var('s1', '30..90'), var('s2', '30..90'), var('s3', '10..40'), var('s4', '30..90')],
            '2',
            ['La meilleure droite parmi celles essayées est celle dont les points sont le plus'
             ' près : celle de **plus petite** somme $S$.',
             'Ici la plus petite somme est $' + S_V0[2] + '$ : on garde le couple '
             + colt(COUPLES[2]) + '.'],
            ['s3 < s1', 's3 < s2', 's3 < s4'],
        ),
        variation(
            'On considère la série statistique suivante.\n\n'
            + tableau([('$x_i$', ['$1$', '$2$', '$3$']), ('$y_i$', [m(v) for v in Y_D6])])
            + '\nOn hésite entre deux droites : $y=2x+1$ et $y=3x-1$. Calcule la somme des carrés'
            ' des écarts $S_1$ pour la première et $S_2$ pour la seconde.\n\n$S_1=?$\n\n$S_2=?$',
            [var('d1', '-1..1'), var('d2', '-1..1'), var('d3', '-1..1')],
            ['{{eval:d1^2+d2^2+d3^2}}', '{{eval:(1+d1)^2+d2^2+(d3-1)^2}}'],
            ['Pour $y=2x+1$, les valeurs de la droite sont $3$, $5$, $7$ : les écarts sont'
             ' ${{d1}}$, ${{d2}}$, ${{d3}}$ et $S_1=' + col('{{eval:d1^2+d2^2+d3^2}}') + '$.',
             'Pour $y=3x-1$, les valeurs de la droite sont $2$, $5$, $8$ : les écarts sont'
             ' ${{eval:1+d1}}$, ${{d2}}$, ${{eval:d3-1}}$ et $S_2='
             + col('{{eval:(1+d1)^2+d2^2+(d3-1)^2}}') + '$.',
             'On garde la droite de plus petite somme.'],
            ['abs((d1^2+d2^2+d3^2)-((1+d1)^2+d2^2+(d3-1)^2)) > 0'],
        ),
        variation(
            'La fonction `S(X, Y, a, b)` renvoie la somme des carrés des écarts d\'une série à la'
            ' droite $y=ax+b$. Le programme suivant essaie plusieurs couples $(a\\,;b)$ et garde'
            ' le meilleur.'
            '\n\n```python\nmeilleur = (0, 0)\nsmin = S(X, Y, 0, 0)\n'
            'for a in [1, 1.5, 2, 2.5, 3]:\n    for b in [0, 0.5, 1, 1.5]:\n'
            '        s = S(X, Y, a, b)\n        if ...:\n            smin = s\n'
            '            meilleur = (a, b)\nprint(meilleur)\n```\n\n'
            'Que faut-il écrire à la place des points de suspension ?'
            + choix('`s > smin`', '`s == smin`', '`a < b`', '`s < smin`'),
            [], '3',
            ['Le programme parcourt tous les couples (c\'est un balayage). `smin` garde la plus'
             ' petite somme trouvée jusqu\'ici.',
             'On remplace `smin` et `meilleur` seulement quand la nouvelle somme est plus petite :'
             ' la condition est `s < smin`, la ' + colt('\\text{quatrième}') + ' proposition.',
             'Avec `s > smin`, le programme garderait la plus mauvaise droite.'],
        ),
        variation(
            'Dans une feuille de calcul, on a calculé en B2:E5 la somme des carrés des écarts'
            ' pour des valeurs de $a$ (ligne 1) et de $b$ (colonne A).\n\n'
            '|   | A | B | C | D | E |\n|---|---|---|---|---|---|\n'
            '| 1 | b ↓, a → | 1 | 1,5 | 2 | 2,5 |\n| 2 | 0 | … | … | … | … |\n'
            '| 3 | 0,5 | … | … | … | … |\n| 4 | 1 | … | … | … | … |\n'
            '| 5 | 1,5 | … | … | … | … |\n\n'
            'Quelle formule donne la plus petite de ces sommes ?'
            + choix('=SOMME(B2:E5)', '=MIN(B2:E5)', '=MAX(B2:E5)', '=MOYENNE(B2:E5)'),
            [], '1',
            ['On cherche le couple $(a\\,;b)$ dont la somme des carrés est **la plus petite**.',
             'La fonction MIN donne la plus petite valeur d\'une plage : « =MIN(B2:E5) », la '
             + colt('\\text{deuxième}') + ' proposition. On lit ensuite $a$ en haut de sa'
             ' colonne et $b$ au début de sa ligne.'],
        ),
    ],
    specs_choix(0, {'s1': '52', 's2': '47', 's3': '21', 's4': '64'}, 2,
                {0: 'premier couple', 1: 'deuxième couple', 3: 'quatrième couple'})
    + [
        spec('écarts 1, 0, −1 : S1 = 2, S2 = 8', 1, {'d1': '1', 'd2': '0', 'd3': '-1'},
             ['2', '8'], 'correct'),
        spec('Erreur : S1 et S2 inversés', 1, {'d1': '1', 'd2': '0', 'd3': '-1'}, ['8', '2'],
             'incorrect'),
        spec('Erreur : écarts sans carré (0, 0)', 1, {'d1': '1', 'd2': '0', 'd3': '-1'},
             ['0', '0'], 'incorrect'),
        spec('écarts −1, 1, 1 : S1 = 3, S2 = 1', 1, {'d1': '-1', 'd2': '1', 'd3': '1'},
             ['3', '1'], 'correct'),
    ]
    + specs_choix(2, {}, 3, {0: 'plus grande', 1: 'égale', 2: 'a < b'})
    + specs_choix(3, {}, 1, {0: 'SOMME', 2: 'MAX', 3: 'MOYENNE'}),
    shared=DECIMAL,
)

MODELES = [('01-changement-de-variable-redresser', D1),
           ('02-representer-nuage-transforme', D2),
           ('03-conjecturer-relation-lineaire', D3),
           ('04-ajustement-apres-changement', D4),
           ('05-somme-carres-ecarts', D5),
           ('06-couple-minimisant', D6)]

os.makedirs(DOSSIER, exist_ok=True)
for nom, mod in MODELES:
    chemin = os.path.join(DOSSIER, nom + '.json')
    with open(chemin, 'w', encoding='utf-8') as f:
        json.dump(mod, f, ensure_ascii=False, indent='\t')
        f.write('\n')
    print('écrit', chemin)
