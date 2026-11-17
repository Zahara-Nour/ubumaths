"""Écrit les 5 modèles du lot 12 b-1 « Égalité, représentants, milieu, somme » de la 2de dans
scripts/questions/2de-vecteurs-c1/.

Phase 0 validée par David le 2026-11-04 (§ 77 du journal `docs/wip/questions-2de-progress.md`).
Points : 2-287 (égalité de deux vecteurs), 2-433 (vecteur nul), 2-288 (représentants), 2-296
(caractérisation vectorielle du milieu), 2-297 (représenter la somme). Un point par modèle ; le nœud
et le tag sont posés par la migration de rangement, après le `--publier` de David.

Décisions et pièges :
- catégories relevées en prod le 2026-11-04 (tous niveaux) : Géométrie › Vecteurs du plan › Égalité
  (neuve) 1, 2, 3 ; › Milieu 2 (1 = 59f818c4) ; › Somme (neuve) 1 ;
- L12b-a : 2-297 au geste ` ```courbe tracer: vecteur … depuis A ` ; ` ```courbe ` n'a pas de flèche
  d'affichage : u⃗ = AB⃗ et v⃗ = AC⃗ sont donnés par les points A, B, C (`points:`) ; la figure du
  corrigé dessine le parallélogramme ;
- flèches à reconnaître : la bonne flèche change de place à chaque tirage. Rôle de la case s :
  r = (s + p) mod n, coordonnées par indicatrices (`eval` ne connaît ni `==` ni `>`) ; rang de la
  bonne réponse = (n − p) mod n = (n − p)·min(p, 1) ; les choix ne sont pas mélangés (noms dans
  l'ordre des cases) ;
- |a| ≠ |b|, a, b ≠ 0 : les flèches des rôles sont toutes différentes ;
- les variables sont substituées telles quelles dans les `eval` : toujours `(a)`, `-(a)` ;
- `col()` seulement dans `$…$` ; variables `e` et `i` interdites.

    python3 docs/wip/questions-2de/lot-vecteurs-c1-2de.py scripts/questions/2de-vecteurs-c1
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


def modele(nom, title, description, subdomain, level, variations, specs, delay=60):
    m = {'title': title, 'description': description, 'grades': ['2'], 'theme': 'Géométrie',
         'domain': 'Vecteurs du plan', 'subdomain': subdomain, 'level': level, 'delay': delay,
         'status': 'draft', 'shared': {'blankDefaults': {'acceptDecimal': True}},
         'variations': variations, 'testSpecs': specs}
    return nom, m


def var(nom, expression):
    return {'name': nom, 'expression': expression}


def variation(statement, variables, conditions, steps, blanks=None):
    v = {'statement': statement, 'variables': variables}
    if conditions:
        v['conditions'] = conditions
    if blanks is not None:
        v['blanks'] = blanks
    v['correction'] = {'steps': steps}
    return v


def case(attendu):
    return {'expectedAnswer': attendu}


def col(x, k=0):
    return '\\textcolor{{{color:primary.' + str(k) + '}}}{' + x + '}'


def vec(nom):
    return '\\overrightarrow{' + nom + '}'


def bloc(nom, *lignes):
    return '```' + nom + '\n' + '\n'.join(lignes) + '\n```'


def choix(question, options, melanger=True):
    tete = '' if melanger else 'melanger: non\n'
    return question + '\n\n```choix\n' + tete + ''.join('- ' + o + '\n' for o in options) + '```'


def figure(fenetre, description, *script, axes='non', grille='1'):
    return bloc('figure', 'fenetre: ' + fenetre, 'axes: ' + axes, 'grille: ' + grille,
                'taille: moyenne', 'description: ' + description, '---', *script)


def ind(r, k):
    """1 si l'entier r vaut k, 0 sinon (expression `eval`)"""
    return '(1-min(abs((' + r + ')-' + str(k) + '),1))'


def selon_role(r, valeurs):
    """Somme des valeurs pondérées par l'indicatrice du rôle r (expression `eval`)"""
    return '+'.join(ind(r, k) + '*(' + v + ')' for k, v in enumerate(valeurs))


def etiquette(nom, ax, ay, dx, dy):
    """`texte` « nom⃗ » à gauche du milieu de la flèche (dx ; dy) d'origine (ax ; ay)"""
    n = 'sqrt((' + dx + ')^2+(' + dy + ')^2)'
    x = '{{eval:round(100*((' + ax + ')+(' + dx + ')/2-0.6*(' + dy + ')/' + n + '))/100;d}}'
    y = '{{eval:round(100*((' + ay + ')+(' + dy + ')/2+0.6*(' + dx + ')/' + n + '))/100;d}}'
    return 'texte(' + x + ', ' + y + ', "' + nom + '⃗")'


def roles(n, p):
    """Rôle de chaque case pour le décalage p (calcul des specs)"""
    return [(s + p) % n for s in range(n)]


MODELES = []
EGALITE = 'Égalité'
REGLE_EGAUX = ('**Deux vecteurs sont égaux** lorsqu\'ils ont **la même direction, le même sens et la même'
               ' longueur** : leurs flèches se superposent par glissement, sans tourner.')

# --- 1. 2-287 : égalité de deux vecteurs (Égalité, niveau 1) ----------------------------------

# Cinq cases autour de u⃗ ; rôles : 0 égal, 1 opposé, 2 coordonnées échangées, 3 symétrique
# (signe de la 2e coordonnée), 4 tourné d'un quart de tour (même longueur, autre direction).
NOMS5 = ['v', 'w', 's', 't', 'z']
CENTRES5 = [(9, 9), (15, 9), (3, 3), (9, 3), (15, 3)]
DX5 = ['(a)', '-(a)', '(b)', '(a)', '-(b)']
DY5 = ['(b)', '-(b)', '(a)', '-(b)', '(a)']


def fleches_cases(noms, centres, n, dxs, dys):
    variables = []
    script = []
    for s, (nom, (cx, cy)) in enumerate(zip(noms, centres)):
        variables.append(var('r' + str(s), 'eval:(' + str(s) + '+(p))-' + str(n) + '*floor((' + str(s)
                             + '+(p))/' + str(n) + ')'))
        variables.append(var('dx' + str(s), 'eval:' + selon_role('r' + str(s), dxs)))
        variables.append(var('dy' + str(s), 'eval:' + selon_role('r' + str(s), dys)))
        variables.append(var('ox' + str(s), 'eval:' + str(cx) + '-floor((dx' + str(s) + ')/2)'))
        variables.append(var('oy' + str(s), 'eval:' + str(cy) + '-floor((dy' + str(s) + ')/2)'))
        script.append('vecteur({{dx' + str(s) + '}}, {{dy' + str(s) + '}}, ancre=({{ox' + str(s)
                      + '}}, {{oy' + str(s) + '}}))')
        script.append(etiquette(nom, 'ox' + str(s), 'oy' + str(s), 'dx' + str(s), 'dy' + str(s)))
    return variables, script


VARS5, SCRIPT5 = fleches_cases(NOMS5, CENTRES5, 5, DX5, DY5)
COORDS = [var('a', '1..3;±'), var('b', '1..3;±')]
U_FIG = ['vecteur({{a}}, {{b}}, ancre=({{ux}}, {{uy}}))', etiquette('u', 'ux', 'uy', 'a', 'b')]
VARS_U = [var('ux', 'eval:3-floor((a)/2)'), var('uy', 'eval:9-floor((b)/2)')]

EGAL_FLECHES = variation(
    choix('Parmi les vecteurs représentés ci-dessous, lequel est égal à $\\vec{u}$ ?\n\n'
          + figure('0 ; 18 ; 0 ; 12',
                   'Quadrillage ; six flèches nommées u, v, w, s, t et z, chacune dans sa case.',
                   *(U_FIG + SCRIPT5)),
          ['$\\vec{' + nom + '}$' for nom in NOMS5], melanger=False),
    [var('p', '0..4')] + COORDS + VARS_U + VARS5 + [var('bon', 'eval:(5-(p))*min(p,1)')],
    ['abs(a) != abs(b)'],
    [REGLE_EGAUX,
     'On compte les carreaux : $\\vec{u}$ avance de ${{a}}$ horizontalement et de ${{b}}$ verticalement.'
     ' Une seule autre flèche fait exactement le même déplacement : c\'est la bonne réponse. L\'opposé'
     ' a la même direction et la même longueur, mais pas le même sens ; les autres n\'ont pas la même'
     ' direction.'],
    [case('{{bon}}')])

PARAL = variation(
    choix('$ABCD$ est un parallélogramme.\n\n'
          + figure('-1 ; 11 ; -1 ; 10',
                   'Quadrillage ; le parallélogramme ABCD, sommets nommés dans l\'ordre.',
                   'A = point({{xa}}, {{ya}}, etiquette="bas")',
                   'B = point({{eval:(xa)+(p1)}}, {{eval:(ya)+(q1)}}, etiquette="bas")',
                   'C = point({{eval:(xa)+(p1)+(p2)}}, {{eval:(ya)+(q1)+(q2)}}, etiquette="haut")',
                   'D = point({{eval:(xa)+(p2)}}, {{eval:(ya)+(q2)}}, etiquette="haut")',
                   'polygone(A, B, C, D)')
          + '\n\nQuel vecteur est égal à $' + vec('{{if:w>0|AD|AB}}') + '$ ?',
          ['$' + vec('{{if:w>0|BC|DC}}') + '$', '$' + vec('{{if:w>0|CB|CD}}') + '$',
           '$' + vec('{{if:w>0|DC|BC}}') + '$', '$' + vec('{{if:w>0|AB|AD}}') + '$']),
    [var('w', '0..1'), var('xa', '1..3'), var('ya', '1..3'), var('p1', '3..5'), var('q1', '-1..2'),
     var('p2', '-1..2'), var('q2', '2..4')],
    [],
    ['**$ABCD$ est un parallélogramme si et seulement si $' + vec('AB') + '=' + vec('DC') + '$**'
     ' (et alors aussi $' + vec('AD') + '=' + vec('BC') + '$). Attention à l\'ordre des lettres :'
     ' le vecteur va de la première lettre à la seconde.',
     'Les côtés opposés $[{{if:w>0|AD|AB}}]$ et $[{{if:w>0|BC|DC}}]$ sont parallèles, de même longueur,'
     ' et parcourus dans le même sens : $' + vec('{{if:w>0|AD|AB}}') + '=' + col(vec('{{if:w>0|BC|DC}}'))
     + '$. $' + vec('{{if:w>0|CB|CD}}') + '$ est son opposé.'],
    [case('0')])

SP_E = {'p': 2, 'a': 2, 'b': -1}  # rôles des cases : 2, 3, 4, 0, 1 → bonne case 3
SP_P = {'w': 0, 'xa': 1, 'ya': 2, 'p1': 4, 'q1': 1, 'p2': 1, 'q2': 3}
SP_P1 = dict(SP_P, w=1)
MODELES.append(modele(
    '01-egalite-de-deux-vecteurs', 'Égalité de deux vecteurs',
    'Reconnaître le vecteur égal à u parmi des flèches, puis dans un parallélogramme'
    ' (pièges : l\'opposé, même longueur autre direction, ordre des lettres)',
    EGALITE, 1, [EGAL_FLECHES, PARAL],
    [spec('Bonne case (rôle 0 en case 3)', 0, SP_E, '3', 'correct'),
     spec('Erreur : l\'opposé (case 4)', 0, SP_E, '4', 'incorrect'),
     spec('Erreur : coordonnées échangées (case 0)', 0, SP_E, '0', 'incorrect'),
     spec('Erreur : quart de tour (case 2)', 0, SP_E, '2', 'incorrect'),
     spec('Sans décalage : bonne case 0', 0, dict(SP_E, p=0), '0', 'correct'),
     spec('AB = DC', 1, SP_P, '0', 'correct'),
     spec('Erreur : AB = CD (sens)', 1, SP_P, '1', 'incorrect'),
     spec('Erreur : AB = BC (côté voisin)', 1, SP_P, '2', 'incorrect'),
     spec('AD = BC', 1, SP_P1, '0', 'correct'),
     spec('Erreur : AD = CB', 1, SP_P1, '1', 'incorrect')],
    delay=90))

# --- 2. 2-433 : vecteur nul (Égalité, niveau 2) ------------------------------------------------

SOMME_NULLE = variation(
    choix('Le vecteur $' + vec('{{if:k>0|MN|AB}}') + '+' + vec('{{if:k>0|NM|BA}}') + '$ est égal à :',
          ['$\\vec{0}$', '$0$', '$2' + vec('{{if:k>0|MN|AB}}') + '$', '$' + vec('{{if:k>0|NM|BA}}') + '$']),
    [var('k', '0..1')],
    [],
    ['$' + vec('{{if:k>0|NM|BA}}') + '$ est l\'**opposé** de $' + vec('{{if:k>0|MN|AB}}')
     + '$ : même direction, même longueur, sens contraire. Leur somme est le **vecteur nul**.',
     'Avec la relation de Chasles : $' + vec('{{if:k>0|MN|AB}}') + '+' + vec('{{if:k>0|NM|BA}}') + '='
     + vec('{{if:k>0|MM|AA}}') + '=' + col('\\vec{0}') + '$.',
     'Le résultat est un **vecteur** ($\\vec{0}$), pas le nombre $0$.'],
    [case('0')])

NUL_CONFONDUS = variation(
    choix('On sait que $' + vec('{{if:k>0|RS|AB}}') + '=\\vec{0}$. Que peut-on dire des points'
          ' ${{if:k>0|R|A}}$ et ${{if:k>0|S|B}}$ ?',
          ['Ils sont confondus.', 'Ils sont symétriques par rapport à l\'origine du repère.',
           'La droite $({{if:k>0|RS|AB}})$ passe par l\'origine du repère.', 'On ne peut rien en dire.']),
    [var('k', '0..1')],
    [],
    ['$\\vec{0}$ est le seul vecteur de longueur nulle : $' + vec('{{if:k>0|RS|AB}}') + '=\\vec{0}$'
     ' signifie que ${{if:k>0|R|A}}{{if:k>0|S|B}}=0$, donc que **${{if:k>0|R|A}}$ et ${{if:k>0|S|B}}$'
     ' sont confondus**. Réciproquement, $' + vec('{{if:k>0|RR|AA}}') + '=\\vec{0}$.'],
    [case('0')])

MODELES.append(modele(
    '02-vecteur-nul', 'Le vecteur nul',
    'Reconnaître le vecteur nul (somme de deux vecteurs opposés) et ce que signifie AB = 0⃗'
    ' (pièges : le nombre 0, 2AB, l\'opposé)',
    EGALITE, 2, [SOMME_NULLE, NUL_CONFONDUS],
    [spec('AB + BA = 0⃗', 0, {'k': 0}, '0', 'correct'),
     spec('Erreur : le nombre 0', 0, {'k': 0}, '1', 'incorrect'),
     spec('Erreur : 2AB', 0, {'k': 0}, '2', 'incorrect'),
     spec('MN + NM = 0⃗', 0, {'k': 1}, '0', 'correct'),
     spec('AB = 0⃗ : confondus', 1, {'k': 0}, '0', 'correct'),
     spec('Erreur : symétriques', 1, {'k': 0}, '1', 'incorrect'),
     spec('Erreur : rien', 1, {'k': 1}, '3', 'incorrect')]))

# --- 3. 2-288 : représentants (Égalité, niveau 3) -----------------------------------------------

NOMS4 = ['P', 'Q', 'R', 'S']


def points_candidats(dxs, dys):
    variables = [var('xc', '9..10'), var('yc', '4..6')]
    script = ['K = point({{xc}}, {{yc}}, etiquette="bas")']
    for s, nom in enumerate(NOMS4):
        variables.append(var('r' + str(s), 'eval:(' + str(s) + '+(p))-4*floor((' + str(s) + '+(p))/4)'))
        variables.append(var('px' + str(s), 'eval:(xc)+' + selon_role('r' + str(s), dxs)))
        variables.append(var('py' + str(s), 'eval:(yc)+' + selon_role('r' + str(s), dys)))
        script.append(nom + ' = point({{px' + str(s) + '}}, {{py' + str(s) + '}}, etiquette="haut")')
    return variables, script


U_REP = ['vecteur({{a}}, {{b}}, ancre=({{ux}}, {{uy}}))', etiquette('u', 'ux', 'uy', 'a', 'b')]
VARS_UREP = [var('ux', 'eval:3-floor((a)/2)'), var('uy', 'eval:5-floor((b)/2)')]
FEN_REP = '0 ; 14 ; 0 ; 10'
DESC_REP = 'Quadrillage ; à gauche la flèche u ; à droite le point K et quatre points P, Q, R, S.'

V_EXT, S_EXT = points_candidats(['(a)', '-(a)', '(b)', '(a)'], ['(b)', '-(b)', '(a)', '-(b)'])
EXTREMITE = variation(
    choix('On a représenté le vecteur $\\vec{u}$ et des points.\n\n'
          + figure(FEN_REP, DESC_REP, *(U_REP + S_EXT))
          + '\n\nLe point $L$ tel que $' + vec('KL') + '=\\vec{u}$ est :',
          ['$' + n + '$' for n in NOMS4], melanger=False),
    [var('p', '0..3')] + COORDS + VARS_UREP + V_EXT + [var('bon', 'eval:(4-(p))*min(p,1)')],
    ['abs(a) != abs(b)'],
    ['$' + vec('KL') + '=\\vec{u}$ : la flèche **qui part de $K$** et fait le même déplacement que'
     ' $\\vec{u}$ (${{a}}$ horizontalement, ${{b}}$ verticalement) arrive en $L$. C\'est un'
     ' **représentant** de $\\vec{u}$ d\'origine $K$.',
     'Le point qui donnerait $' + vec('LK') + '=\\vec{u}$ (sens inversé) n\'est pas la réponse.'],
    [case('{{bon}}')])

V_ORI, S_ORI = points_candidats(['-(a)', '(a)', '-(b)', '-(a)'], ['-(b)', '(b)', '-(a)', '(b)'])
ORIGINE = variation(
    choix('On a représenté le vecteur $\\vec{u}$ et des points.\n\n'
          + figure(FEN_REP, DESC_REP, *(U_REP + S_ORI))
          + '\n\nLe point $M$ tel que $' + vec('MK') + '=\\vec{u}$ est :',
          ['$' + n + '$' for n in NOMS4], melanger=False),
    [var('p', '0..3')] + COORDS + VARS_UREP + V_ORI + [var('bon', 'eval:(4-(p))*min(p,1)')],
    ['abs(a) != abs(b)'],
    ['$' + vec('MK') + '=\\vec{u}$ : cette fois $K$ est l\'**extrémité**. On part de $K$ et on fait le'
     ' déplacement **inverse** de $\\vec{u}$ (${{eval:-(a)}}$ horizontalement, ${{eval:-(b)}}$'
     ' verticalement) pour trouver l\'origine $M$.',
     'Vérification : de $M$ à $K$, on retrouve bien le déplacement de $\\vec{u}$.'],
    [case('{{bon}}')])

SP_R = {'p': 1, 'a': 2, 'b': -3}  # rôles des cases : 1, 2, 3, 0 → bonne case 3
MODELES.append(modele(
    '03-representants-d-un-vecteur', 'Représentants d\'un vecteur',
    'Trouver le point L tel que KL = u, puis l\'origine M telle que MK = u, sur quadrillage'
    ' (pièges : sens inversé, coordonnées échangées, signe)',
    EGALITE, 3, [EXTREMITE, ORIGINE],
    [spec('KL = u : bonne case 3', 0, SP_R, '3', 'correct'),
     spec('Erreur : LK = u (case 0)', 0, SP_R, '0', 'incorrect'),
     spec('Erreur : coordonnées échangées (case 1)', 0, SP_R, '1', 'incorrect'),
     spec('MK = u : bonne case 3', 1, SP_R, '3', 'correct'),
     spec('Erreur : KM = u (case 0)', 1, SP_R, '0', 'incorrect'),
     spec('Sans décalage : bonne case 0', 1, dict(SP_R, p=0), '0', 'correct')],
    delay=90))

# --- 4. 2-296 : caractérisation vectorielle du milieu (Milieu, niveau 2) ----------------------

SEGMENT = figure('0 ; 10 ; 0 ; 4', 'Le segment [AB] et son milieu I, les deux moitiés codées.',
                 'A = point(1, 1, etiquette="bas")', 'B = point(9, 3, etiquette="bas")',
                 'I = point(5, 2, etiquette="haut")', 'segment(A, B)',
                 'marque_segment(A, I)', 'marque_segment(I, B)', grille='non')

CARACT = variation(
    choix('$I$ est le milieu du segment $[AB]$ si et seulement si :',
          ['$' + vec('AI') + '=' + vec('IB') + '$', '$' + vec('AI') + '=' + vec('BI') + '$',
           '$' + vec('IA') + '=' + vec('IB') + '$', '$' + vec('AB') + '=' + vec('AI') + '$']),
    [],
    [],
    ['**$I$ est le milieu de $[AB]$ si et seulement si $' + vec('AI') + '=' + vec('IB') + '$** :'
     ' pour aller de $A$ à $I$ puis de $I$ à $B$, on fait deux fois le même déplacement.',
     '$' + vec('IA') + '$ et $' + vec('IB') + '$ ont la même longueur mais des sens contraires : ils sont'
     ' **opposés**, pas égaux.'],
    [case('0')])

COEF_AB = variation(
    '$I$ est le milieu du segment $[AB]$.\n\n' + SEGMENT
    + '\n\nComplète l\'égalité.\n\n$$' + vec('{{if:t>0|AI|AB}}') + '=?\\,' + vec('{{if:t>0|AB|AI}}') + '$$',
    [var('t', '0..1')],
    [],
    ['$I$ est au milieu : $' + vec('AB') + '$ fait deux fois $' + vec('AI') + '$ (même direction, même'
     ' sens, longueur double).',
     '$$' + vec('{{if:t>0|AI|AB}}') + '=' + col('{{eval:2^(1-2*(t))}}') + '\\,'
     + vec('{{if:t>0|AB|AI}}') + '$$'],
    [case('{{eval:2^(1-2*(t))}}')])

COEF_IA = variation(
    '$I$ est le milieu du segment $[AB]$.\n\n' + SEGMENT
    + '\n\nComplète l\'égalité.\n\n$$' + vec('{{if:t>0|BA|IA}}') + '=?\\,' + vec('{{if:t>0|IA|IB}}') + '$$',
    [var('t', '0..1')],
    [],
    ['On compare les deux vecteurs : direction (la droite $(AB)$ pour les deux), sens et longueur.'
     ' {{if:t>0|Tous deux vont vers A, et BA est le double de IA.|Même longueur, sens contraires : ils sont'
     ' opposés.}}',
     '$$' + vec('{{if:t>0|BA|IA}}') + '=' + col('{{if:t>0|2|-1}}') + '\\,' + vec('{{if:t>0|IA|IB}}') + '$$'],
    [case('{{if:t>0|2|-1}}')])

SOMME_MILIEU = variation(
    choix('$I$ est le milieu du segment $[AB]$. Le vecteur $' + vec('IA') + '+' + vec('IB') + '$ est égal à :',
          ['$\\vec{0}$', '$' + vec('AB') + '$', '$2' + vec('IA') + '$', '$0$']),
    [],
    [],
    ['$' + vec('IA') + '$ et $' + vec('IB') + '$ sont **opposés** ($I$ est au milieu) :'
     ' $' + vec('IA') + '+' + vec('IB') + '=' + col('\\vec{0}') + '$.',
     'C\'est une autre façon de dire que $I$ est le milieu de $[AB]$.'],
    [case('0')])

MODELES.append(modele(
    '04-milieu-et-vecteurs', 'Milieu d\'un segment et vecteurs',
    'Caractériser le milieu I de [AB] par des vecteurs : AI = IB, AB = 2AI, IA = −IB, IA + IB = 0⃗'
    ' (pièges : AI = BI, IA = IB, 1/2 et 2 échangés, le nombre 0)',
    'Milieu', 2, [CARACT, COEF_AB, COEF_IA, SOMME_MILIEU],
    [spec('AI = IB', 0, {}, '0', 'correct'),
     spec('Erreur : AI = BI', 0, {}, '1', 'incorrect'),
     spec('Erreur : IA = IB', 0, {}, '2', 'incorrect'),
     spec('AB = 2 AI', 1, {'t': 0}, '2', 'correct'),
     spec('Erreur : AB = ½ AI', 1, {'t': 0}, '\\frac{1}{2}', 'incorrect'),
     spec('AI = ½ AB', 1, {'t': 1}, '\\frac{1}{2}', 'correct'),
     spec('AI = 0,5 AB (décimal)', 1, {'t': 1}, '0.5', 'correct'),
     spec('Erreur : AI = 2 AB', 1, {'t': 1}, '2', 'incorrect'),
     spec('IA = −IB', 2, {'t': 0}, '-1', 'correct'),
     spec('Erreur : IA = IB', 2, {'t': 0}, '1', 'incorrect'),
     spec('BA = 2 IA', 2, {'t': 1}, '2', 'correct'),
     spec('Erreur : BA = −2 IA', 2, {'t': 1}, '-2', 'incorrect'),
     spec('IA + IB = 0⃗', 3, {}, '0', 'correct'),
     spec('Erreur : le nombre 0', 3, {}, '3', 'incorrect')]))

# --- 5. 2-297 : représenter la somme (Somme, niveau 1) -----------------------------------------

SOMME = variation(
    'Dans le repère ci-dessous, on note $\\vec{u}=' + vec('AB') + '$ et $\\vec{v}=' + vec('AC') + '$.\n\n'
    'Trace le représentant d\'origine $A$ du vecteur $\\vec{u}+\\vec{v}$ : place son extrémité.\n\n'
    + bloc('courbe', 'x: -6 ; 6', 'y: -6 ; 6', 'grille: 1 ; 1',
           'points: A({{xa}} ; {{ya}}), B({{eval:(xa)+(a)}} ; {{eval:(ya)+(b)}}),'
           ' C({{eval:(xa)+(c)}} ; {{eval:(ya)+(d)}})',
           'tracer: vecteur ({{eval:(a)+(c)}} ; {{eval:(b)+(d)}}) depuis A', 'taille: moyenne',
           'description: Repère gradué de 1 en 1, de −6 à 6 ; les points A, B et C.'),
    [var('xa', '-3..3'), var('ya', '-3..3'), var('a', '1..3;±'), var('b', '-3..3'),
     var('c', '-3..3'), var('d', '1..3;±')],
    ['(a)*(d)-(b)*(c) != 0', 'abs((xa)+(a)) <= 5', 'abs((ya)+(b)) <= 5', 'abs((xa)+(c)) <= 5',
     'abs((ya)+(d)) <= 5', 'abs((xa)+(a)+(c)) <= 5', 'abs((ya)+(b)+(d)) <= 5'],
    ['**Règle du parallélogramme** : $\\vec{u}$ et $\\vec{v}$ ont la même origine $A$ ; on construit le'
     ' parallélogramme $ABDC$. Alors $' + vec('AB') + '+' + vec('AC') + '=' + vec('AD') + '$ : la somme'
     ' est la **diagonale** issue de $A$.',
     figure('-6 ; 6 ; -6 ; 6', 'Repère : le parallélogramme ABDC, les flèches AB, AC et la diagonale AD.',
            'A = point({{xa}}, {{ya}}, etiquette="bas")',
            'B = point({{eval:(xa)+(a)}}, {{eval:(ya)+(b)}}, etiquette="droite")',
            'C = point({{eval:(xa)+(c)}}, {{eval:(ya)+(d)}}, etiquette="gauche")',
            'D = point({{eval:(xa)+(a)+(c)}}, {{eval:(ya)+(b)+(d)}}, etiquette="haut")',
            'vecteur(A, B)', 'vecteur(A, C)', 'segment(B, D, trait="tirets")',
            'segment(C, D, trait="tirets")', 'vecteur(A, D, couleur="rouge")',
            axes='oui'),
     'En coordonnées, on ajoute les déplacements : $\\vec{u}+\\vec{v}$ avance de ${{a}}{{eval:c;+}}='
     + col('{{eval:(a)+(c)}}') + '$ horizontalement et de ${{b}}{{eval:d;+}}=' + col('{{eval:(b)+(d)}}', 1)
     + '$ verticalement : $D(' + col('{{eval:(xa)+(a)+(c)}}') + '\\,;\\,' + col('{{eval:(ya)+(b)+(d)}}', 1)
     + ')$.'])

SP_S = {'xa': -2, 'ya': -1, 'a': 3, 'b': 1, 'c': 1, 'd': 3}  # A(−2 ; −1), B(1 ; 0), C(−1 ; 2), D(2 ; 3)
MODELES.append(modele(
    '05-representer-la-somme', 'Représenter la somme de deux vecteurs',
    'Tracer u + v depuis A quand u = AB et v = AC ont la même origine (règle du parallélogramme)'
    ' (pièges : u − v, v − u, u seul, la diagonale BC)',
    'Somme', 1, [SOMME],
    [spec('AD, D(2 ; 3)', 0, SP_S, '-2;-1/2;3', 'correct'),
     spec('Erreur : u − v, extrémité (0 ; −3)', 0, SP_S, '-2;-1/0;-3', 'incorrect'),
     spec('Erreur : v − u, extrémité (−4 ; 1)', 0, SP_S, '-2;-1/-4;1', 'incorrect'),
     spec('Erreur : u seul, extrémité B', 0, SP_S, '-2;-1/1;0', 'incorrect'),
     spec('Erreur : milieu de [BC]', 0, SP_S, '-2;-1/0;1', 'incorrect'),
     spec('Erreur : extrémité non posée', 0, SP_S, '-2;-1/', 'incorrect')],
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
