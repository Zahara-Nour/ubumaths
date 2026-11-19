"""Écrit les 3 modèles du lot 2b « Python » de la Terminale technologique (STMG)
dans scripts/questions/ttechno-2b-python/.

Phase 0 validée par David le 2026-11-17 (journal docs/archive/wip/questions-ttechno-progress.md § 12,
Q18 : lot 2a « suites », puis lot 2b « Python ») :

| #  | Point        | Contenu                                                           | Niveau |
| P1 | TTECHNO-030  | somme des n premiers carrés : accumulateur, range, valeur rendue  | 2 |
| P2 | TTECHNO-075  | somme des n premiers cubes : idem                                 | 2 |
| P3 | TTECHNO-076  | somme des n premiers inverses : idem, valeur exacte, piège 1/0    | 2 |

Bornes (BO Tle techno p.8) : « Écrire en langage Python une fonction qui calcule la somme des n
premiers carrés / cubes / inverses ». L'élève n'écrit pas de code dans l'appli : il complète la
ligne d'accumulation (choix), choisit les bornes de `range` (choix), fait tourner la fonction
(case). 077 (lien Σ ↔ algorithme) reste servi par e4eaaf16 (lot 0) : pas de Σ ici.

Pièges : jamais de variable `e` ni `i` ; case choix → `melanger: non`, réponse = rang de la bonne
proposition (rang varié d'une variation à l'autre) ; P1 / P2 : `range(n + 1)` est AUSSI juste
(0² = 0³ = 0) → jamais proposé comme distracteur ; P3 : `range(n + 1)` divise par 0 au premier
tour (ZeroDivisionError) → c'est le distracteur, et une variation porte sur l'erreur.

    python3 docs/wip/questions/lot-ttechno-2b.py scripts/questions/ttechno-2b-python
"""
import json
import os
import sys

DOSSIER = sys.argv[1]


def spec(desc, vi, variables_, answer, status, violations=None):
    expected = {'status': status}
    if violations:
        expected['constraintViolations'] = violations
    return {'description': desc, 'variationIndex': vi, 'variables': variables_,
            'answers': [answer], 'expected': expected}


def modele(title, description, level, delay, variations, specs):
    # Ni theme, ni domain, ni subdomain (ADR 0035) ; nœud et tag posés par la migration.
    return {'title': title, 'description': description, 'grades': ['T_TECHNO'], 'level': level,
            'delay': delay, 'status': 'draft', 'shared': {}, 'variations': variations,
            'testSpecs': specs}


def var(nom, expression):
    return {'name': nom, 'expression': expression}


def variation(statement, variables, reponse, steps):
    return {'statement': statement, 'variables': variables, 'conditions': [],
            'blanks': [{'expectedAnswer': reponse}], 'correction': {'steps': steps}}


def col(x):
    return '\\textcolor{{{color:primary.0}}}{' + x + '}'


def choix(*options):
    return '\n\n```choix\nmelanger: non\n' + '\n'.join('- ' + o for o in options) + '\n```'


def python(*lignes):
    return '\n\n```python\n' + '\n'.join(lignes) + '\n```\n\n'


def specs_choix(vi, variables_, bonne, n):
    out = [spec('choix : bonne réponse ' + str(bonne), vi, variables_, str(bonne), 'correct')]
    out += [spec('choix ' + str(j) + ' refusé', vi, variables_, str(j), 'incorrect')
            for j in range(n) if j != bonne]
    return out


ACCU = ('`s` sert d\'accumulateur : il part de $0$ et, à chaque tour de boucle, on lui ajoute'
        ' le terme du rang `k`.')
RANGE = ('`range(a, b)` donne les entiers de `a` à `b - 1` : il s\'arrête **juste avant** `b`.')


def fonction(nom, ligne, entete='for k in range(1, n + 1):'):
    return python('def ' + nom + '(n):', '    s = 0', '    ' + entete, '        ' + ligne,
                  '    return s')


# --- P1, TTECHNO-030 : somme des n premiers carrés -------------------------------------------

P1_BUT = 'La fonction `somme_carres` doit renvoyer $1^2+2^2+\\cdots+n^2$.'

P1 = modele(
    'Fonction Python : somme des n premiers carrés',
    'Compléter l\'accumulateur et les bornes de la boucle d\'une fonction Python qui calcule la'
    ' somme des n premiers carrés, puis la faire tourner',
    2, 60,
    [
        variation(
            P1_BUT + fonction('somme_carres', '...')
            + 'Que faut-il écrire à la place des points de suspension ?'
            + choix('`s = k ** 2`', '`s = s + k ** 2`', '`s = s + k`', '`s = s * k ** 2`'),
            [], '1',
            [ACCU, 'Le terme du rang `k` est $k^2$, qui s\'écrit `k ** 2` en Python.',
             'Avec `s = k ** 2`, `s` ne garderait que le dernier carré ; avec `s = s + k`, on'
             ' sommerait les entiers ; avec `s = s * k ** 2`, `s` resterait égal à $0$.',
             'La ligne est donc ' + '`s = s + k ** 2`' + '.'],
        ),
        variation(
            P1_BUT + fonction('somme_carres', 's = s + k ** 2', 'for k in range(...):')
            + 'Que faut-il écrire entre les parenthèses de `range` ?'
            + choix('`n`', '`1, n`', '`1, n + 1`', '`2, n + 1`'),
            [], '2',
            [RANGE, '`k` doit prendre les valeurs $1$, $2$, …, $n$ : on écrit `range(1, n + 1)`.',
             '`range(n)` et `range(1, n)` s\'arrêtent à $n-1$ : ils oublient $n^2$.'
             ' `range(2, n + 1)` oublie $1^2$.'],
        ),
        variation(
            P1_BUT + fonction('somme_carres', 's = s + k ** 2')
            + 'Que renvoie `somme_carres({{n}})` ?\n\n$?$',
            [var('n', '3..6')], '{{eval:n*(n+1)*(2*n+1)/6}}',
            ['`k` prend les valeurs $1$, $2$, …, ${{n}}$.',
             '$1^2+2^2+3^2{{if:n>=4|+4^2|}}{{if:n>=5|+5^2|}}{{if:n>=6|+6^2|}}=1+4+9'
             '{{if:n>=4|+16|}}{{if:n>=5|+25|}}{{if:n>=6|+36|}}='
             + col('{{eval:n*(n+1)*(2*n+1)/6}}') + '$.'],
        ),
    ],
    specs_choix(0, {}, 1, 4) + specs_choix(1, {}, 2, 4) + [
        spec('n = 4 : 30', 2, {'n': '4'}, '30', 'correct'),
        spec('Erreur : sans le carré (10)', 2, {'n': '4'}, '10', 'incorrect'),
        spec('Erreur : dernier terme (16)', 2, {'n': '4'}, '16', 'incorrect'),
        spec('Erreur : 4² oublié (14)', 2, {'n': '4'}, '14', 'incorrect'),
        spec('n = 6 : 91', 2, {'n': '6'}, '91', 'correct'),
    ],
)

# --- P2, TTECHNO-075 : somme des n premiers cubes --------------------------------------------

P2_BUT = 'La fonction `somme_cubes` doit renvoyer $1^3+2^3+\\cdots+n^3$.'

P2 = modele(
    'Fonction Python : somme des n premiers cubes',
    'Compléter l\'accumulateur et les bornes de la boucle d\'une fonction Python qui calcule la'
    ' somme des n premiers cubes, puis la faire tourner',
    2, 60,
    [
        variation(
            P2_BUT + fonction('somme_cubes', '...')
            + 'Que faut-il écrire à la place des points de suspension ?'
            + choix('`s = s + k * 3`', '`s = k ** 3`', '`s = s + k ** 3`', '`s = s + n ** 3`'),
            [], '2',
            [ACCU, 'Le terme du rang `k` est $k^3$, qui s\'écrit `k ** 3` en Python.',
             '`k * 3` est le triple de `k`, pas son cube ; avec `s = k ** 3`, `s` ne garderait'
             ' que le dernier cube ; `n ** 3` ajouterait $n$ fois le même nombre.',
             'La ligne est donc `s = s + k ** 3`.'],
        ),
        variation(
            P2_BUT + fonction('somme_cubes', 's = s + k ** 3', 'for k in range(...):')
            + 'Que faut-il écrire entre les parenthèses de `range` ?'
            + choix('`1, n + 1`', '`1, n`', '`n`', '`n + 1, 1`'),
            [], '0',
            [RANGE, '`k` doit prendre les valeurs $1$, $2$, …, $n$ : on écrit `range(1, n + 1)`.',
             '`range(1, n)` et `range(n)` s\'arrêtent à $n-1$ : ils oublient $n^3$.'
             ' `range(n + 1, 1)` ne donne aucun entier : la fonction renverrait $0$.'],
        ),
        variation(
            P2_BUT + fonction('somme_cubes', 's = s + k ** 3')
            + 'Que renvoie `somme_cubes({{n}})` ?\n\n$?$',
            [var('n', '3..5')], '{{eval:(n*(n+1)/2)^2}}',
            ['`k` prend les valeurs $1$, $2$, …, ${{n}}$.',
             '$1^3+2^3+3^3{{if:n>=4|+4^3|}}{{if:n>=5|+5^3|}}=1+8+27'
             '{{if:n>=4|+64|}}{{if:n>=5|+125|}}=' + col('{{eval:(n*(n+1)/2)^2}}') + '$.'],
        ),
    ],
    specs_choix(0, {}, 2, 4) + specs_choix(1, {}, 0, 4) + [
        spec('n = 3 : 36', 2, {'n': '3'}, '36', 'correct'),
        spec('Erreur : triples (18)', 2, {'n': '3'}, '18', 'incorrect'),
        spec('Erreur : dernier terme (27)', 2, {'n': '3'}, '27', 'incorrect'),
        spec('Erreur : 3³ oublié (9)', 2, {'n': '3'}, '9', 'incorrect'),
        spec('n = 5 : 225', 2, {'n': '5'}, '225', 'correct'),
    ],
)

# --- P3, TTECHNO-076 : somme des n premiers inverses -----------------------------------------

P3_BUT = 'La fonction `somme_inverses` doit renvoyer $1+\\dfrac{1}{2}+\\cdots+\\dfrac{1}{n}$.'
P3_VALEUR = '{{eval:{{if:n==2|3/2|{{if:n==3|11/6|25/12}}}}}}'
P3_SOMME = ('{{if:n==2|1+\\dfrac{1}{2}|{{if:n==3|1+\\dfrac{1}{2}+\\dfrac{1}{3}|1+\\dfrac{1}{2}'
            '+\\dfrac{1}{3}+\\dfrac{1}{4}}}}}')

P3 = modele(
    'Fonction Python : somme des n premiers inverses',
    'Compléter l\'accumulateur et les bornes de la boucle d\'une fonction Python qui calcule la'
    ' somme des n premiers inverses, la faire tourner, repérer la division par zéro',
    2, 60,
    [
        variation(
            P3_BUT + fonction('somme_inverses', '...')
            + 'Que faut-il écrire à la place des points de suspension ?'
            + choix('`s = s + 1 / n`', '`s = s + k`', '`s = 1 / k`', '`s = s + 1 / k`'),
            [], '3',
            [ACCU, 'Le terme du rang `k` est $\\dfrac{1}{k}$, qui s\'écrit `1 / k` en Python.',
             '`1 / n` ajouterait $n$ fois le même nombre ; `s + k` sommerait les entiers ; avec'
             ' `s = 1 / k`, `s` ne garderait que le dernier inverse.',
             'La ligne est donc `s = s + 1 / k`.'],
        ),
        variation(
            P3_BUT + fonction('somme_inverses', 's = s + 1 / k', 'for k in range(...):')
            + 'Que faut-il écrire entre les parenthèses de `range` ?'
            + choix('`n + 1`', '`1, n + 1`', '`n`', '`1, n`'),
            [], '1',
            [RANGE, '`k` doit prendre les valeurs $1$, $2$, …, $n$ : on écrit `range(1, n + 1)`.',
             '`range(n + 1)` et `range(n)` commencent à $0$ : au premier tour, Python calcule'
             ' `1 / 0` et s\'arrête sur une erreur. `range(1, n)` oublie $\\dfrac{1}{n}$.'],
        ),
        variation(
            P3_BUT + fonction('somme_inverses', 's = s + 1 / k')
            + 'Quelle est la valeur exacte du nombre que `somme_inverses({{n}})` calcule ?'
            ' Donne-la sous forme de fraction.\n\n$?$',
            [var('n', '2|3|4')], P3_VALEUR,
            ['`k` prend les valeurs entières de $1$ à ${{n}}$ : la fonction calcule $' + P3_SOMME + '$.',
             'Python l\'affiche sous forme décimale (valeur approchée) ; sa valeur exacte est $'
             + P3_SOMME + '=' + col(P3_VALEUR) + '$.'],
        ),
        variation(
            'Lucas a écrit cette fonction pour calculer $1+\\dfrac{1}{2}+\\cdots+\\dfrac{1}{n}$.'
            + fonction('somme_inverses', 's = s + 1 / k', 'for k in range(n + 1):')
            + 'Que se passe-t-il quand on appelle `somme_inverses({{n}})` ?'
            + choix('elle renvoie la bonne somme',
                    'elle renvoie la somme avec un terme de trop',
                    'Python s\'arrête sur une erreur : division par zéro',
                    'elle renvoie $0$'),
            [var('n', '5..10')], '2',
            ['`range(n + 1)` commence à $0$ : au premier tour, `k` vaut $0$.',
             'Python doit alors calculer `1 / 0` : la division par zéro est impossible, le'
             ' programme **s\'arrête sur une erreur** (`ZeroDivisionError`).',
             'Il faut écrire `range(1, n + 1)`.'],
        ),
    ],
    specs_choix(0, {}, 3, 4) + specs_choix(1, {}, 1, 4) + [
        spec('n = 3 : 11/6', 2, {'n': '3'}, '\\frac{11}{6}', 'correct'),
        spec('Erreur : 3/6', 2, {'n': '3'}, '\\frac{3}{6}', 'incorrect'),
        spec('Erreur : 1/6', 2, {'n': '3'}, '\\frac{1}{6}', 'incorrect'),
        spec('Erreur : 1/2 + 1/3 sans le 1 (5/6)', 2, {'n': '3'}, '\\frac{5}{6}', 'incorrect'),
        spec('n = 4 : 25/12', 2, {'n': '4'}, '\\frac{25}{12}', 'correct'),
        spec('n = 2 : 3/2', 2, {'n': '2'}, '\\frac{3}{2}', 'correct'),
    ] + specs_choix(3, {'n': '6'}, 2, 4),
)

MODELES = [('01-somme-carres-python', P1), ('02-somme-cubes-python', P2),
           ('03-somme-inverses-python', P3)]

os.makedirs(DOSSIER, exist_ok=True)
for nom, m in MODELES:
    chemin = os.path.join(DOSSIER, nom + '.json')
    with open(chemin, 'w', encoding='utf-8') as f:
        json.dump(m, f, ensure_ascii=False, indent='\t')
        f.write('\n')
    print('écrit', chemin)
