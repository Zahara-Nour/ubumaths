"""Écrit les modèles neufs du lot 5 « graphiques et statistiques à deux variables » de la 1re techno
dans scripts/questions/1techno-5/.

Phase 0 validée par David le 2026-11-18 (journal docs/archive/wip/questions-1techno-progress.md, § 28).
Les points 082, 084, 085, 087 reçoivent des modèles communs de questions-1gen (migration) ; ici, trois
modèles neufs :

- N1 résoudre graphiquement f(x) = k → 1TECHNO-059 (jumeau en équation de 95ee57c8) ;
- N2 représenter une liste de termes d'une suite (Python) → 1TECHNO-121 ;
- N3 représenter les fréquences des 1 dans N échantillons (Python) → 1TECHNO-104 (nuage et instruction
  de tracé ; l'histogramme n'est pas relu, M3 le fait déjà, Q-L5a).

Bornes 1re techno : fonctions polynômes de degré ≤ 3 ; suites notées u(n), géométriques à termes
strictement positifs ; Python seulement (Q-L5b) ; N de plusieurs centaines.

    python3 docs/wip/questions/lot-1techno-5.py scripts/questions/1techno-5
"""
import json
import os
import sys

DOSSIER = sys.argv[1]


def spec(desc, vi, answers, status, variables=None):
    return {'description': desc, 'variationIndex': vi,
            'variables': {k: str(v) for k, v in (variables or {}).items()},
            'answers': answers if isinstance(answers, list) else [answers],
            'expected': {'status': status}}


def var(nom, expression):
    return {'name': nom, 'expression': expression}


def modele(title, point, description, level, variations, specs, grades=None):
    return {'title': title, 'description': description,
            'grades': grades or ['1_TECHNO'], 'level': level, 'delay': 90, 'status': 'draft',
            'shared': {'blankDefaults': {'acceptDecimal': True}},
            'variations': variations, 'testSpecs': specs, '_point': point}


def variation(statement, blanks, variables, steps, conditions=None):
    v = {'statement': statement, 'blanks': blanks, 'variables': variables,
         'correction': {'steps': steps}}
    if conditions:
        v['conditions'] = conditions
    return v


def choix(enonce, bonne, autres, steps, variables=None, conditions=None):
    """Case choix mélangée : la bonne réponse est écrite en premier (index 0)."""
    bloc = '\n\n```choix\n' + ''.join('- ' + l + '\n' for l in [bonne] + autres) + '```'
    return variation(enonce + bloc, [{'expectedAnswer': '0'}], variables or [], steps, conditions)


def case(attendue, **options):
    return {'expectedAnswer': attendue, **options}


def py(code):
    return '```python\n' + code + '\n```'


def couleur(x):
    return '\\textcolor{{{color:primary.0}}}{' + x + '}'


def indic_inf(x, seuil):
    """1 si x < seuil, 0 sinon (entiers, x ≠ seuil) : eval ne connaît pas les comparaisons."""
    return f'min(max({seuil}-{x},0),1)'


def indic_dans(x, lo, hi):
    """1 si lo < x < hi, 0 sinon (entiers, x ni égal à lo ni à hi)."""
    return f'min(max({x}-({lo}),0),1)*min(max(({hi})-{x},0),1)'


MODELES = []

# ---------------------------------------------------------------------------------------------
# N1 — résoudre graphiquement f(x) = k : 1TECHNO-059
# ---------------------------------------------------------------------------------------------


def ens(x):
    return case(x, answerKind='intervalles')


def courbe(f, domaine, extra=''):
    return ('```courbe\nx: -6 ; 6\ny: -8 ; 8\ngrille: 1 ; 1\nf(x) = ' + f + ' sur [' + domaine
            + ']   bleu   nom=C_f\n' + extra + 'taille: moyenne\ndescription: Courbe d\'une fonction f.\n```')


def enonce_n1(f, domaine, dom_tex):
    return ('La courbe $\\mathcal{C}_f$ ci-dessous représente une fonction $f$ définie sur $\\left['
            + dom_tex + '\\right]$.\n\n' + courbe(f, domaine)
            + '\n\nRésous graphiquement l\'équation $f(x)={{k}}$.\n\nL\'ensemble des solutions est $S=?$.')


def trace_k(f, domaine, points):
    extra = 'g(x) = {{k}}   rouge   pointillé\n' + (('points: ' + points + '\n') if points else '')
    return courbe(f, domaine, extra)


DEBUT_N1 = ('On trace la droite horizontale d\'équation $y={{k}}$ : les solutions sont les **abscisses** des'
            ' points où elle coupe $\\mathcal{C}_f$.')

# Une solution : courbe croissante ou décroissante, pente 1/2 au point de coupe (pas de palier)
F1 = '({{s}})*((x-({{z}}))^3/16+(x-({{z}}))/2)+({{k}})'
D1 = '{{eval:z-4}} ; {{eval:z+4}}'
# Deux solutions : parabole qui coupe y = k en r et s
F2 = '({{a}})*(x-({{r}}))*(x-({{s}}))/2+({{k}})'
D2 = '{{eval:r-1}} ; {{eval:s+1}}'
# Trois solutions : degré 3 (gabarit de 95ee57c8)
F3 = '({{a}})*(x-({{r}}))*(x-({{s}}))*(x-({{t}}))/4+({{k}})'
D3 = '{{eval:r-1}} ; {{eval:t+1}}'
# Aucune solution : sommet (m ; M), droite y = k du côté où la parabole ne va pas
F4 = '({{a}})*(x-({{m}}))^2/2+({{M}})'
D4 = '{{eval:m-3}} ; {{eval:m+3}}'

MODELES.append(('N1-resoudre-graphiquement-f-x-egal-k', modele(
    'Résoudre graphiquement une équation f(x) = k', '1TECHNO-059',
    'Équation f(x) = k lue sur une courbe : une, deux, trois solutions, aucune ; ne pas confondre avec'
    ' l\'image de k', 1,
    [variation(enonce_n1(F1, D1, '{{eval:z-4}}\\,;{{eval:z+4}}'),
               [ens('\\{ {{z}} \\}')],
               [var('s', '1|-1'), var('z', '-2..2'), var('k', '-2..2!0')],
               [DEBUT_N1, trace_k(F1, D1, 'A({{z}} ; {{k}}), A\'({{z}} ; 0)'),
                'La droite coupe la courbe en un seul point, d\'abscisse ${{z}}$. $S='
                + couleur('\\{ {{z}} \\}') + '$.']),
     variation(enonce_n1(F2, D2, '{{eval:r-1}}\\,;{{eval:s+1}}'),
               [ens('\\{ {{r}} ; {{s}} \\}')],
               [var('a', '1|-1'), var('r', '-4..0'), var('d', '2..4'), var('s', 'eval:r+d'),
                var('k', '-3..3!0')],
               [DEBUT_N1, trace_k(F2, D2, 'A({{r}} ; {{k}}), B({{s}} ; {{k}}), A\'({{r}} ; 0), B\'({{s}} ; 0)'),
                'La droite coupe la courbe en deux points, d\'abscisses ${{r}}$ et ${{s}}$. $S='
                + couleur('\\{ {{r}} ; {{s}} \\}') + '$.'],
               ['s <= 4']),
     variation(enonce_n1(F3, D3, '{{eval:r-1}}\\,;{{eval:t+1}}'),
               [ens('\\{ {{r}} ; {{s}} ; {{t}} \\}')],
               [var('a', '1|-1'), var('r', '-4..0'), var('d', '2|3'), var('g', '2|3'), var('s', 'eval:r+d'),
                var('t', 'eval:s+g'), var('k', '-3..3!0')],
               [DEBUT_N1, trace_k(F3, D3, 'A({{r}} ; {{k}}), B({{s}} ; {{k}}), C({{t}} ; {{k}})'),
                'La droite coupe la courbe en trois points, d\'abscisses ${{r}}$, ${{s}}$ et ${{t}}$. $S='
                + couleur('\\{ {{r}} ; {{s}} ; {{t}} \\}') + '$.'],
               ['d + g <= 5', 't <= 4', 'abs(k) + 2.25*(d+g) <= 12.25']),
     variation(enonce_n1(F4, D4, '{{eval:m-3}}\\,;{{eval:m+3}}'),
               [ens('\\varnothing')],
               [var('a', '1|-1'), var('m', '-2..2'), var('M', '-2..2'), var('h', '1..3'),
                var('k', 'eval:M-(a)*(h)')],
               ['On trace la droite horizontale d\'équation $y={{k}}$.', trace_k(F4, D4, ''),
                'La courbe reste {{if:a>0|au-dessus|au-dessous}} de cette droite : elle ne la coupe pas.'
                ' L\'équation n\'a aucune solution, $S=' + couleur('\\varnothing') + '$.']),
     choix('La courbe $\\mathcal{C}_f$ ci-dessous représente une fonction $f$ définie sur $\\left['
           '{{eval:r-1}}\\,;{{eval:s+1}}\\right]$.\n\n' + courbe(F2, D2)
           + '\n\nPour résoudre graphiquement l\'équation $f(x)={{k}}$, on cherche :',
           'les abscisses des points de $\\mathcal{C}_f$ dont l\'ordonnée vaut ${{k}}$',
           ['l\'ordonnée du point de $\\mathcal{C}_f$ d\'abscisse ${{k}}$',
            'les points où $\\mathcal{C}_f$ coupe l\'axe des abscisses',
            'le point où $\\mathcal{C}_f$ coupe l\'axe des ordonnées'],
           ['$f(x)={{k}}$ : on connaît l\'**image**, ${{k}}$, et on cherche les **antécédents** $x$.',
            'Sur la courbe, ce sont les abscisses des points d\'ordonnée ${{k}}$, où la droite $y={{k}}$ coupe'
            ' $\\mathcal{C}_f$. L\'ordonnée du point d\'abscisse ${{k}}$, elle, serait l\'image $f({{k}})$.'],
           [var('a', '1|-1'), var('r', '-4..0'), var('d', '2..4'), var('s', 'eval:r+d'),
            var('k', '-3..3!0')],
           ['s <= 4'])],
    [spec('Une solution', 0, '\\{1\\}', 'correct', {'s': 1, 'z': 1, 'k': 2}),
     spec('Erreur : image f(k) lue', 0, '\\{2\\}', 'incorrect', {'s': 1, 'z': 1, 'k': 2}),
     spec('Deux solutions', 1, '\\{-3;0\\}', 'correct', {'a': 1, 'r': -3, 'd': 3, 's': -3 + 3, 'k': 2}),
     spec('Erreur : une seule', 1, '\\{0\\}', 'incorrect', {'a': 1, 'r': -3, 'd': 3, 's': 0, 'k': 2}),
     spec('Trois solutions', 2, '\\{-2;0;3\\}', 'correct',
          {'a': 1, 'r': -2, 'd': 2, 'g': 3, 's': 0, 't': 3, 'k': 1}),
     spec('Erreur : il en manque une', 2, '\\{-2;3\\}', 'incorrect',
          {'a': 1, 'r': -2, 'd': 2, 'g': 3, 's': 0, 't': 3, 'k': 1}),
     spec('Aucune solution', 3, '\\varnothing', 'correct', {'a': 1, 'm': 0, 'M': 1, 'h': 2, 'k': -1}),
     spec('Erreur : le sommet', 3, '\\{0\\}', 'incorrect', {'a': 1, 'm': 0, 'M': 1, 'h': 2, 'k': -1}),
     spec('Antécédents', 4, '0', 'correct', {'a': 1, 'r': -3, 'd': 3, 's': 0, 'k': 2}),
     spec('Erreur : image', 4, '1', 'incorrect', {'a': 1, 'r': -3, 'd': 3, 's': 0, 'k': 2})])))

# ---------------------------------------------------------------------------------------------
# N2 — représenter une liste de termes d'une suite (Python) : 1TECHNO-121
# ---------------------------------------------------------------------------------------------


def prog_n2(maj, n, trace='plt.plot(rangs, termes, \'o\')'):
    return py('import matplotlib.pyplot as plt\n\nrangs = []\ntermes = []\nu = {{a}}\nfor n in range('
              + n + '):\n    rangs.append(n)\n    termes.append(u)\n    ' + maj + '\n' + trace + '\nplt.show()')


def nuage(xs, ys, desc):
    return ('```nuage\nx: ' + ' ; '.join(xs) + '\ny: ' + ' ; '.join(ys) + '\nnom x: n\nnom y: u(n)\n'
            'description: ' + desc + '\n```')


def choix_blocs(enonce, bonne, autres, steps, variables, conditions=None):
    """Case choix dont les choix sont des blocs : clôture ````, bonne réponse en premier."""
    def item(bloc):
        lignes = bloc.split('\n')
        return '- ' + lignes[0] + '\n' + ''.join('  ' + l + '\n' for l in lignes[1:])
    bloc = '\n\n````choix\n' + ''.join(item(b) for b in [bonne] + autres) + '````'
    return variation(enonce + bloc, [{'expectedAnswer': '0'}], variables, steps, conditions)


def ev(x):
    return '{{eval:' + x + '}}'


RANGS = ['0', '1', '2', '3', '4']
ARITH_N2 = [ev('a+' + str(i) + '*r') for i in range(5)]
ARITH_N2_DECALE = [ev('a+' + str(i + 1) + '*r') for i in range(5)]
ARITH_N2_RAISON = [ev('a+' + str(2 * i) + '*r') for i in range(5)]
GEO_N2 = [ev('a*q^' + str(i)) for i in range(5)]
GEO_N2_DECALE = [ev('a*q^' + str(i + 1)) for i in range(5)]
GEO_N2_ARITH = [ev('a+' + str(i) + '*q') for i in range(5)]

INTRO_N2 = 'On exécute le programme Python suivant.\n\n'
MODELES.append(('N2-representer-une-liste-de-termes', modele(
    'Représenter une liste de termes d\'une suite en Python', '1TECHNO-121',
    'Programme Python qui place les points (n ; u(n)) : nuage obtenu (arithmétique, géométrique), nombre de'
    ' points, instruction de tracé', 2,
    [choix_blocs(INTRO_N2 + prog_n2('u = u + {{r}}', '5') + '\n\nQuel nuage de points obtient-on ?',
                 nuage(RANGS, ARITH_N2, 'Cinq points alignés, de (0 ; u(0)) à (4 ; u(4)).'),
                 [nuage(RANGS, ARITH_N2_DECALE, 'Cinq points alignés, le premier plus haut.'),
                  nuage(RANGS, ARITH_N2_RAISON, 'Cinq points alignés, plus pentus.'),
                  nuage(ARITH_N2, RANGS, 'Cinq points alignés, peu pentus.')],
                 ['Le programme place les points $(n\\,;u(n))$ pour $n$ de $0$ à $4$ : `u` vaut d\'abord'
                  ' $u(0)={{a}}$ et augmente de ${{r}}$ à chaque tour.',
                  'Les points sont $(0\\,;{{a}})$, $(1\\,;' + ARITH_N2[1] + ')$, … , $(4\\,;' + ARITH_N2[4]
                  + ')$ : cinq points alignés, puisque la suite est arithmétique.'],
                 [var('a', '1..5'), var('r', '2..4')]),
     choix_blocs(INTRO_N2 + prog_n2('u = {{q}} * u', '5') + '\n\nQuel nuage de points obtient-on ?',
                 nuage(RANGS, GEO_N2, 'Cinq points sur une courbe qui monte de plus en plus vite.'),
                 [nuage(RANGS, GEO_N2_DECALE, 'Cinq points, le premier déjà multiplié.'),
                  nuage(RANGS, GEO_N2_ARITH, 'Cinq points alignés.')],
                 ['Le programme place les points $(n\\,;u(n))$ pour $n$ de $0$ à $4$ : `u` vaut d\'abord'
                  ' $u(0)={{a}}$ et il est multiplié par ${{q}}$ à chaque tour.',
                  'Les points sont $(0\\,;{{a}})$, $(1\\,;' + GEO_N2[1] + ')$, $(2\\,;' + GEO_N2[2] + ')$, … :'
                  ' ils ne sont pas alignés, ils montent de plus en plus vite.'],
                 [var('a', '1..3'), var('q', '2|3')]),
     variation(INTRO_N2 + prog_n2('u = u + {{r}}', '{{N}}')
               + '\n\nCombien de points sont placés sur le graphique ?\n\n$?$',
               [case('{{N}}')], [var('a', '1..9'), var('r', '2..7'), var('N', '6..12')],
               ['`range({{N}})` donne à `n` les valeurs $0$, $1$, … , ${{eval:N-1}}$ : la boucle tourne'
                ' ${{N}}$ fois.',
                'Chaque tour ajoute un rang et un terme : $' + couleur('{{N}}') + '$ points sont placés, de'
                ' $(0\\,;u(0))$ à $({{eval:N-1}}\\,;u({{eval:N-1}}))$.']),
     choix('On veut placer les points de coordonnées $(n\\,;u(n))$. On complète la dernière ligne utile du'
           ' programme suivant.\n\n' + prog_n2('u = u + {{r}}', '{{N}}', '# ligne à compléter')
           + '\n\nQuelle instruction faut-il écrire ?',
           '`plt.plot(rangs, termes, \'o\')`',
           ['`plt.plot(termes, rangs, \'o\')`', '`plt.plot(rangs, u, \'o\')`', '`plt.plot(n, termes, \'o\')`'],
           ['`plt.plot(X, Y, \'o\')` place les points dont les abscisses sont dans la liste `X` et les'
            ' ordonnées dans la liste `Y`.',
            'Les abscisses sont les rangs $n$ (liste `rangs`), les ordonnées les termes $u(n)$ (liste'
            ' `termes`) : `plt.plot(rangs, termes, \'o\')`.'],
           [var('a', '1..9'), var('r', '2..7'), var('N', '6..12')])],
    [spec('Bon nuage (arithmétique)', 0, '0', 'correct', {'a': 2, 'r': 3}),
     spec('Erreur : commence à u(1)', 0, '1', 'incorrect', {'a': 2, 'r': 3}),
     spec('Bon nuage (géométrique)', 1, '0', 'correct', {'a': 2, 'q': 2}),
     spec('Erreur : arithmétique', 1, '2', 'incorrect', {'a': 2, 'q': 2}),
     spec('range(8) : 8 points', 2, '8', 'correct', {'a': 3, 'r': 2, 'N': 8}),
     spec('Erreur : 9 points', 2, '9', 'incorrect', {'a': 3, 'r': 2, 'N': 8}),
     spec('plot(rangs, termes)', 3, '0', 'correct', {'a': 3, 'r': 2, 'N': 8}),
     spec('Erreur : axes inversés', 3, '1', 'incorrect', {'a': 3, 'r': 2, 'N': 8})])))

# ---------------------------------------------------------------------------------------------
# N3 — représenter les fréquences des 1 dans N échantillons : 1TECHNO-104
# ---------------------------------------------------------------------------------------------

# Écarts (en centièmes) de 100 fréquences simulées pour n = 100, p = 0,4 (graine fixe) ; on les
# reporte autour de 0,pt (écart type voisin pour p = 0,3, 0,4, 0,6).
ECARTS = [6, -1, 1, -2, 6, 2, -1, -5, 1, -5, -1, -6, 1, 0, 0, -1, -3, -3, 2, 8, -2, 5, -1, 6, -1, 4, 6, 5, -2,
          0, 0, 1, 2, 0, 3, 9, -2, 6, -4, 3, 8, -9, 8, 2, -7, 3, 5, 3, 2, 5, -5, -10, -2, 6, -3, -11, 3, -2, -7,
          6, -3, 0, 1, 2, 1, 1, -4, 1, -4, 5, -9, -5, 2, 10, -1, -2, 3, 4, 9, -2, 0, 5, 3, 3, 9, -6, -2, 8, 4,
          -7, -1, 7, 2, 1, -2, 3, 2, -3, -3, -1]


def prog_n3(n, trace):
    return py('from random import random\nimport matplotlib.pyplot as plt\n\ndef frequence(n, p):\n'
              '    c = 0\n    for k in range(n):\n        if random() < p:\n            c = c + 1\n'
              '    return c / n\n\nN = 500\nfreqs = [frequence(' + n + ', 0.{{pt}}) for j in range(N)]\n'
              + trace + '\nplt.show()')


NUAGE_N3 = ('```nuage\nx: ' + ' ; '.join(str(i) for i in range(1, 101)) + '\ny: '
            + ' ; '.join('0,{{eval:10*pt' + ('+' if e >= 0 else '') + str(e) + '}}' for e in ECARTS)
            + '\nnom x: Échantillon\nnom y: Fréquence des 1\ndescription: Nuage de 100 points : en abscisse le'
              ' numéro de l\'échantillon, en ordonnée la fréquence des 1 observée.\n```')
SCATTER = 'plt.scatter(range(N), freqs)'
VARS_N3 = [var('pt', '3|4|6')]


def borne(j):
    decalage = 5 * j - 15
    return '0,{{eval:10*pt' + (f'+{decalage}' if decalage > 0 else f'{decalage}' if decalage else '') + '}}'


EFFECTIFS = ['6', '62', '166', '186', '70', '10']
HISTO = ('```histogramme\naxes: Fréquence des 1 ; Nombre d\'échantillons\n'
         + ''.join(f'[{borne(j)} ; {borne(j + 1)}[ = {EFFECTIFS[j]}\n' for j in range(6))
         + 'description: Histogramme des fréquences des 1 dans 500 échantillons, six classes d\'amplitude'
           ' 0,05.\n```')
INTRO_N3 = ('On simule $500$ échantillons de taille $100$ d\'une loi de Bernoulli avec le programme suivant.\n\n')

MODELES.append(('N3-representer-les-frequences-de-n-echantillons', modele(
    'Représenter les fréquences des 1 dans N échantillons', '1TECHNO-104',
    'Nuage (j ; fréquence) de 500 échantillons de Bernoulli : valeur autour de laquelle les points se'
    ' concentrent, instruction qui donne le nuage ou l\'histogramme, effet d\'une taille plus grande', 3,
    [choix(INTRO_N3 + prog_n3('100', SCATTER) + '\n\nVoici les $100$ premiers points du nuage obtenu.\n\n'
           + NUAGE_N3 + '\n\nAutour de quelle valeur les points se concentrent-ils ?',
           '$0{,}{{pt}}$', ['$0{,}{{eval:10-pt}}$', '$0{,}5$', '$0{,}{{eval:pt+2}}$'],
           ['Chaque point a pour ordonnée la fréquence des $1$ dans un échantillon de taille $100$ : ces'
            ' fréquences fluctuent autour de la probabilité $p$ du programme.',
            'Ici `frequence(100, 0.{{pt}})` : les points se concentrent autour de $' + couleur('0{,}{{pt}}')
            + '$, la plupart à moins de $0{,}1$ de cette valeur.'],
           VARS_N3),
     choix(INTRO_N3 + prog_n3('100', '# instruction de tracé') + '\n\nLe programme affiche le nuage'
           ' ci-dessous (on n\'a gardé que les $100$ premiers points).\n\n' + NUAGE_N3
           + '\n\nQuelle instruction de tracé a-t-on écrite ?',
           '`plt.scatter(range(N), freqs)`',
           ['`plt.hist(freqs)`', '`plt.scatter(freqs, range(N))`'],
           ['Le graphique est un **nuage** : chaque échantillon donne un point, son numéro en abscisse et sa'
            ' fréquence en ordonnée.',
            '`plt.scatter(X, Y)` place les points d\'abscisses `X` et d\'ordonnées `Y` : il faut'
            ' `plt.scatter(range(N), freqs)`. `plt.hist(freqs)` donnerait un histogramme.'],
           VARS_N3),
     choix(INTRO_N3 + prog_n3('100', '# instruction de tracé') + '\n\nLe programme affiche le graphique'
           ' ci-dessous.\n\n' + HISTO + '\n\nQuelle instruction de tracé a-t-on écrite ?',
           '`plt.hist(freqs)`',
           ['`plt.scatter(range(N), freqs)`', '`plt.hist(range(N))`'],
           ['Le graphique est un **histogramme** : il compte combien des $500$ fréquences tombent dans'
            ' chaque classe.',
            '`plt.hist(L)` trace l\'histogramme des valeurs de la liste `L` : ici `plt.hist(freqs)`.'
            ' `plt.scatter` donnerait un nuage de points.'],
           VARS_N3),
     choix(INTRO_N3 + prog_n3('100', SCATTER) + '\n\nOn remplace `frequence(100, 0.{{pt}})` par'
           ' `frequence(1000, 0.{{pt}})`. Comment le nuage change-t-il ?',
           'les points se resserrent autour de $0{,}{{pt}}$',
           ['les points s\'écartent davantage de $0{,}{{pt}}$',
            'les points se concentrent autour d\'une autre valeur',
            'le nuage compte $1000$ points'],
           ['Le nombre de points reste $N=500$ : seule la **taille** de chaque échantillon passe de $100$ à'
            ' $1000$.',
            'Plus l\'échantillon est grand, moins sa fréquence fluctue : les points se resserrent autour de'
            ' $' + couleur('0{,}{{pt}}') + '$.'],
           VARS_N3)],
    [spec('Autour de p', 0, '0', 'correct', {'pt': 3}),
     spec('Erreur : 1 − p', 0, '1', 'incorrect', {'pt': 3}),
     spec('scatter(range(N), freqs)', 1, '0', 'correct', {'pt': 4}),
     spec('Erreur : hist', 1, '1', 'incorrect', {'pt': 4}),
     spec('hist(freqs)', 2, '0', 'correct', {'pt': 6}),
     spec('Erreur : scatter', 2, '1', 'incorrect', {'pt': 6}),
     spec('Plus resserré', 3, '0', 'correct', {'pt': 4}),
     spec('Erreur : 1000 points', 3, '3', 'incorrect', {'pt': 4})])))

# ---------------------------------------------------------------------------------------------
# Écriture
# ---------------------------------------------------------------------------------------------

os.makedirs(DOSSIER, exist_ok=True)
for nom, m in MODELES:
    m = dict(m)
    m.pop('_point')
    chemin = os.path.join(DOSSIER, nom + '.json')
    ancien_id = None
    if os.path.exists(chemin):
        with open(chemin, encoding='utf-8') as f:
            ancien_id = json.load(f).get('id')
    if ancien_id:
        m = {'id': ancien_id, **m}
    with open(chemin, 'w', encoding='utf-8') as f:
        json.dump(m, f, ensure_ascii=False, indent=1)
        f.write('\n')
print(len(MODELES), 'modèles écrits dans', DOSSIER)
for nom, m in MODELES:
    print(' ', m['_point'], nom)
