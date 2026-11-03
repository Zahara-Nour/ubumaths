"""Écrit les 2 modèles du lot « vecteur-tracer » de la 2de dans scripts/questions/2de-vecteur-tracer/ :
2-299 (lire les coordonnées d'un vecteur sur un repère) et 2-298 (représenter un vecteur dont on
connaît les coordonnées, geste ```courbe tracer: vecteur, #2274).

Phase 0 validée par David le 2026-11-03 (§ 65 du journal `docs/wip/questions-2de-progress.md`).
Aucun modèle n'existait pour ces deux points (le § 61 parlait à tort d'une réécriture). Un point par
modèle ; le nœud (Géométrie › Vecteurs › coordonnées) et le tag sont posés par la migration de
rangement, après le `--publier` de David.

Décisions et pièges :
- rangement : Géométrie › Vecteurs du plan › Coordonnées, après les niveaux 1 à 4 publiés :
  lire (2-299) au niveau 5, tracer (2-298) au niveau 6 ;
- deux variations par modèle : 2-299 = flèche AB entre deux points nommés, puis vecteur u seul ;
  2-298 = origine libre, puis origine imposée (`depuis A`) ;
- coordonnées 1..4 avec signe, |a| ≠ |b| : coordonnées échangées, sens inversé et signe d'une
  coordonnée donnent des flèches toutes différentes ; aucune coordonnée nulle (flèche horizontale ou
  verticale tracée sans réfléchir) ;
- repère −6..6 gradué de 1 (comme 2-316 / 2-445) ; les points restent dans −5..5 ;
- réponse du geste vecteur : `x1;y1/x2;y2` (origine/extrémité) ; `depuis A` : l'origine doit être A ;
- les variables sont substituées telles quelles dans les `eval` : toujours `(a)`, `-(a)` ;
- `col()` seulement dans `$…$` ; variables `e` et `i` interdites.

    python3 docs/wip/questions-2de/lot-vecteur-tracer-2de.py scripts/questions/2de-vecteur-tracer
"""
import json
import os
import subprocess
import sys

DOSSIER = sys.argv[1]


def spec(desc, vi, variables, answers, status):
    return {'description': desc, 'variationIndex': vi,
            'variables': {k: str(v) for k, v in variables.items()},
            'answers': answers if isinstance(answers, list) else [answers],
            'expected': {'status': status}}


def modele(nom, title, description, level, variations, specs, delay):
    m = {'title': title, 'description': description, 'grades': ['2'], 'theme': 'Géométrie',
         'domain': 'Vecteurs du plan', 'subdomain': 'Coordonnées', 'level': level, 'delay': delay,
         'status': 'draft', 'shared': {'blankDefaults': {'acceptDecimal': True}},
         'variations': variations, 'testSpecs': specs}
    return nom, m


def var(nom, expression):
    return {'name': nom, 'expression': expression}


def variation(statement, variables, conditions, steps, blanks=None):
    v = {'statement': statement, 'variables': variables, 'conditions': conditions}
    if blanks is not None:
        v['blanks'] = blanks
    v['correction'] = {'steps': steps}
    return v


def case(attendu):
    return {'expectedAnswer': attendu}


def col(x, k=0):
    return '\\textcolor{{{color:primary.' + str(k) + '}}}{' + x + '}'


def colonne(x, y):
    return '\\begin{pmatrix}' + x + '\\\\' + y + '\\end{pmatrix}'


def bloc(nom, *lignes):
    return '```' + nom + '\n' + '\n'.join(lignes) + '\n```'


def figure(description, *script):
    return bloc('figure', 'fenetre: -6 ; 6 ; -6 ; 6', 'axes: oui', 'grille: 1', 'taille: moyenne',
                'description: ' + description, '---', *script)


def etiquette_u(ax, ay):
    """`texte` « u⃗ » à côté du milieu de la flèche (a ; b) d'origine (ax ; ay), du côté gauche."""
    n = 'sqrt((a)^2+(b)^2)'
    x = '{{eval:round(100*((' + ax + ')+(a)/2-0.6*(b)/' + n + '))/100;d}}'
    y = '{{eval:round(100*((' + ay + ')+(b)/2+0.6*(a)/' + n + '))/100;d}}'
    return 'texte(' + x + ', ' + y + ', "u⃗")'


def deplacement():
    """« on avance de 3 vers la droite et on descend de 2 » (a, b ≠ 0)"""
    return ('on se déplace de ${{eval:abs(a)}}$ vers la {{if:a>0|droite|gauche}} et de'
            ' ${{eval:abs(b)}}$ vers le {{if:b>0|haut|bas}}')


MODELES = []
COORDS = [var('a', '1..4;±'), var('b', '1..4;±')]
COND_AB = ['abs(a) != abs(b)']
TROUS = '\\begin{pmatrix}?\\\\?\\end{pmatrix}'
REGLE_LIRE = ('Les coordonnées d\'un vecteur se lisent en allant de l\'origine à l\'extrémité de la'
              ' flèche : l\'abscisse est le déplacement horizontal (positif vers la droite), l\'ordonnée'
              ' le déplacement vertical (positif vers le haut).')

# --- 1. 2-299 : lire les coordonnées d'un vecteur (niveau 5) --------------------------------

LIRE_AB = variation(
    'Le vecteur $\\overrightarrow{AB}$ est représenté dans le repère ci-dessous.\n\n'
    + figure('Repère gradué de 1 en 1, de −6 à 6 ; les points A et B et la flèche de A vers B.',
             'A = point({{xa}}, {{ya}}, etiquette="bas")',
             'B = point({{eval:(xa)+(a)}}, {{eval:(ya)+(b)}}, etiquette="haut")',
             'vecteur(A, B)')
    + '\n\nDonne ses coordonnées.\n\n$$\\overrightarrow{AB}' + TROUS + '$$',
    [var('xa', '-4..4'), var('ya', '-4..4')] + COORDS,
    COND_AB + ['abs((xa)+(a)) <= 5', 'abs((ya)+(b)) <= 5'],
    [REGLE_LIRE,
     'De $A$ à $B$, ' + deplacement() + ' : $\\overrightarrow{AB}'
     + colonne(col('{{a}}'), col('{{b}}', 1)) + '$.'],
    [case('{{a}}'), case('{{b}}')])

LIRE_U = variation(
    'Le vecteur $\\vec{u}$ est représenté dans le repère ci-dessous.\n\n'
    + figure('Repère gradué de 1 en 1, de −6 à 6, et une flèche qui représente le vecteur u.',
             'vecteur({{a}}, {{b}}, ancre=({{xa}}, {{ya}}))', etiquette_u('xa', 'ya'))
    + '\n\nDonne ses coordonnées.\n\n$$\\vec{u}' + TROUS + '$$',
    [var('xa', '-4..4'), var('ya', '-4..4')] + COORDS,
    COND_AB + ['abs((xa)+(a)) <= 5', 'abs((ya)+(b)) <= 5'],
    [REGLE_LIRE,
     'De l\'origine à l\'extrémité de la flèche, ' + deplacement() + ' : $\\vec{u}'
     + colonne(col('{{a}}'), col('{{b}}', 1)) + '$.'],
    [case('{{a}}'), case('{{b}}')])

SP_L = {'xa': -2, 'ya': 1, 'a': 3, 'b': -2}
SP_L2 = {'xa': 1, 'ya': -3, 'a': -4, 'b': 1}
MODELES.append(modele(
    '01-lire-les-coordonnees-d-un-vecteur', 'Lire les coordonnées d\'un vecteur sur un repère',
    'Lire les coordonnées d\'un vecteur représenté par une flèche (AB puis u seul)'
    ' (pièges : coordonnées échangées, sens inversé, coordonnées de B, signe)',
    5, [LIRE_AB, LIRE_U],
    [spec('A(−2 ; 1), B(1 ; −1) → (3 ; −2)', 0, SP_L, ['3', '-2'], 'correct'),
     spec('Erreur : coordonnées échangées', 0, SP_L, ['-2', '3'], 'incorrect'),
     spec('Erreur : sens inversé (A − B)', 0, SP_L, ['-3', '2'], 'incorrect'),
     spec('Erreur : coordonnées de B', 0, SP_L, ['1', '-1'], 'incorrect'),
     spec('Erreur : signe de l\'ordonnée', 0, SP_L, ['3', '2'], 'incorrect'),
     spec('u depuis (1 ; −3) → (−4 ; 1)', 1, SP_L2, ['-4', '1'], 'correct'),
     spec('Erreur : signe de l\'abscisse', 1, SP_L2, ['4', '1'], 'incorrect'),
     spec('Erreur : coordonnées de l\'extrémité', 1, SP_L2, ['-3', '-2'], 'incorrect')],
    delay=90))

# --- 2. 2-298 : représenter un vecteur dont on connaît les coordonnées (niveau 6) ------------


def repere_tracer(*lignes):
    return bloc('courbe', 'x: -6 ; 6', 'y: -6 ; 6', 'grille: 1 ; 1', *lignes, 'taille: moyenne',
                'description: Repère gradué de 1 en 1, de −6 à 6 sur les deux axes.')


REGLE_TRACER = ('Pour représenter $\\vec{u}' + colonne('{{a}}', '{{b}}') + '$ : depuis l\'origine choisie, '
                + deplacement() + ' ; on arrive à l\'extrémité, et la flèche va de l\'origine à l\'extrémité.')

TRACER_LIBRE = variation(
    'Dans le repère ci-dessous, trace un représentant du vecteur $\\vec{u}' + colonne('{{a}}', '{{b}}')
    + '$ : place son origine où tu veux, puis son extrémité.\n\n'
    + repere_tracer('tracer: vecteur u = ({{a}} ; {{b}})'),
    COORDS, COND_AB,
    [REGLE_TRACER,
     figure('Repère : la flèche de O vers le point de coordonnées (a ; b), qui représente u.',
            'O = point(0, 0, etiquette="bas")',
            'vecteur({{a}}, {{b}}, ancre=(0, 0))', etiquette_u('0', '0')),
     'Par exemple depuis $O(0\\,;\\,0)$, l\'extrémité est le point $(' + col('{{a}}')
     + '\\,;\\,' + col('{{b}}', 1) + ')$. Toute flèche de même direction, même sens et même longueur'
     ' représente aussi $\\vec{u}$.'])

TRACER_A = variation(
    'Dans le repère ci-dessous, trace le représentant du vecteur $\\vec{u}' + colonne('{{a}}', '{{b}}')
    + '$ d\'origine $A$ : place son extrémité.\n\n'
    + repere_tracer('points: A({{xa}} ; {{ya}})', 'tracer: vecteur u = ({{a}} ; {{b}}) depuis A'),
    [var('xa', '-4..4'), var('ya', '-4..4')] + COORDS,
    COND_AB + ['abs((xa)+(a)) <= 5', 'abs((ya)+(b)) <= 5'],
    [REGLE_TRACER,
     figure('Repère : le point A et la flèche de A qui représente u.',
            'A = point({{xa}}, {{ya}}, etiquette="bas")',
            'vecteur({{a}}, {{b}}, ancre=({{xa}}, {{ya}}))', etiquette_u('xa', 'ya')),
     'Depuis $A({{xa}}\\,;\\,{{ya}})$, l\'extrémité est le point $(' + col('{{eval:(xa)+(a)}}')
     + '\\,;\\,' + col('{{eval:(ya)+(b)}}', 1) + ')$.'])

SP_T = {'a': 3, 'b': -2}
SP_TA = {'xa': -1, 'ya': 2, 'a': -2, 'b': 3}
MODELES.append(modele(
    '02-representer-un-vecteur', 'Représenter un vecteur dont on connaît les coordonnées',
    'Tracer un représentant de u (a ; b) dans un repère, origine libre puis imposée'
    ' (pièges : sens inversé, coordonnées échangées, signe, mauvaise origine)',
    6, [TRACER_LIBRE, TRACER_A],
    [spec('u(3 ; −2) depuis O', 0, SP_T, '0;0/3;-2', 'correct'),
     spec('u(3 ; −2) depuis (−4 ; 3)', 0, SP_T, '-4;3/-1;1', 'correct'),
     spec('Erreur : sens inversé', 0, SP_T, '3;-2/0;0', 'incorrect'),
     spec('Erreur : coordonnées échangées', 0, SP_T, '0;0/-2;3', 'incorrect'),
     spec('Erreur : signe de l\'ordonnée', 0, SP_T, '0;0/3;2', 'incorrect'),
     spec('Erreur : origine seule', 0, SP_T, '0;0/', 'incorrect'),
     spec('Erreur : origine et extrémité confondues', 0, SP_T, '1;1/1;1', 'incorrect'),
     spec('u(−2 ; 3) depuis A(−1 ; 2) → (−3 ; 5)', 1, SP_TA, '-1;2/-3;5', 'correct'),
     spec('Erreur : bon vecteur, autre origine que A', 1, SP_TA, '0;0/-2;3', 'incorrect'),
     spec('Erreur : extrémité au point (a ; b)', 1, SP_TA, '-1;2/-2;3', 'incorrect'),
     spec('Erreur : coordonnées échangées depuis A', 1, SP_TA, '-1;2/2;0', 'incorrect'),
     spec('Erreur : extrémité non posée', 1, SP_TA, '-1;2/', 'incorrect')],
    delay=120))

os.makedirs(DOSSIER, exist_ok=True)
for nom, m in MODELES:
    with open(os.path.join(DOSSIER, nom + '.json'), 'w', encoding='utf-8') as f:
        json.dump(m, f, ensure_ascii=False, indent='\t')
        f.write('\n')
# Mis en forme comme le pre-commit, pour que le script redonne les fichiers commités
subprocess.run(['pnpm', 'exec', 'prettier', '--write', DOSSIER], check=True,
               stdout=subprocess.DEVNULL)
print(f'{len(MODELES)} modèles écrits dans {DOSSIER}')
