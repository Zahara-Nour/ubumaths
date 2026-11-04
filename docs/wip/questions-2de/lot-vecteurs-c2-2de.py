"""Écrit les 5 modèles du lot 12 b-2 « Produit, colinéarité, combinaison, base ; périmètre » de la 2de
dans scripts/questions/2de-vecteurs-c2/.

Phase 0 validée par David le 2026-11-04 (§ 77 du journal `docs/wip/questions-2de-progress.md`).
Points : 2-289 (produit par un réel), 2-290 (colinéarité, sur la figure), 2-291 (combinaison de deux
vecteurs non colinéaires), 2-292 (base orthonormée), 2-401 (périmètre d'un polygone). Un point par
modèle ; le nœud et le tag sont posés par la migration de rangement, après le `--publier` de David.

Décisions et pièges :
- catégories relevées en prod le 2026-11-04 (tous niveaux) : Géométrie › Vecteurs du plan › Produit
  par un réel (neuve) 1 ; › Colinéarité 5 (1-4 pris) ; › Combinaison (neuve) 1 ; › Coordonnées 7 (1-6
  pris) ; Grandeurs › Périmètres › Périmètre d'un polygone (neuve, nommée comme ses sœurs « Périmètre
  d'un carré », « … d'un rectangle », « … d'un disque ») 1 ;
- flèches à reconnaître (289, 290) : même mécanique que le 12 b-1 (décalage `p`, rôles par
  indicatrices, rang de la bonne réponse = (n − p)·min(p, 1), choix non mélangés) ;
- 291 : x, y ≠ 0 (le corrigé dessine x·i⃗ puis y·j⃗ : pas de flèche nulle) ;
- 292 : sur un quadrillage d'unité 1, les seuls vecteurs entiers de norme 1 sont sur les axes : une
  base orthonormée tirée est donc toujours « droite » ; une base orthogonale peut l'être aussi
  ((1 ; 0), (0 ; 2)), pour que l'élève ne réponde pas à l'allure ;
- les variables sont substituées telles quelles dans les `eval` : toujours `(a)`, `-(a)` ;
- `col()` seulement dans `$…$` ; variables `e` et `i` interdites.

    python3 docs/wip/questions-2de/lot-vecteurs-c2-2de.py scripts/questions/2de-vecteurs-c2
"""
import json
import os
import subprocess
import sys

DOSSIER = sys.argv[1]


def spec(desc, vi, variables, answers, status, violations=None):
    attendu = {'status': status}
    if violations is not None:
        attendu['constraintViolations'] = violations
    return {'description': desc, 'variationIndex': vi,
            'variables': {k: str(v) for k, v in variables.items()},
            'answers': answers if isinstance(answers, list) else [answers],
            'expected': attendu}


def modele(nom, title, description, subdomain, level, variations, specs, delay=60,
           theme='Géométrie', domain='Vecteurs du plan'):
    m = {'title': title, 'description': description, 'grades': ['2'], 'theme': theme,
         'domain': domain, 'subdomain': subdomain, 'level': level, 'delay': delay,
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


def coef(v):
    """Coefficient devant un vecteur : rien pour 1, « - » pour −1"""
    return '{{if:' + v + '==1||{{if:' + v + '==-1|-|{{' + v + '}}}}}}'


def fleche(nom, dx, dy, cx, cy, prefixe):
    """Variables et script d'une flèche (dx ; dy) centrée sur (cx ; cy), nommée nom⃗"""
    ox, oy = 'ox' + prefixe, 'oy' + prefixe
    variables = [var(ox, 'eval:' + str(cx) + '-floor((' + dx + ')/2)'),
                 var(oy, 'eval:' + str(cy) + '-floor((' + dy + ')/2)')]
    script = ['vecteur({{' + dx + '}}, {{' + dy + '}}, ancre=({{' + ox + '}}, {{' + oy + '}}))',
              etiquette(nom, ox, oy, dx, dy)]
    return variables, script


def fleches_cases(noms, centres, n, dxs, dys):
    """Une flèche par case ; le rôle de la case s est (s + p) mod n"""
    variables = []
    script = []
    for s, (nom, (cx, cy)) in enumerate(zip(noms, centres)):
        variables.append(var('r' + str(s), 'eval:(' + str(s) + '+(p))-' + str(n) + '*floor((' + str(s)
                             + '+(p))/' + str(n) + ')'))
        variables.append(var('dx' + str(s), 'eval:' + selon_role('r' + str(s), dxs)))
        variables.append(var('dy' + str(s), 'eval:' + selon_role('r' + str(s), dys)))
        v, sc = fleche(nom, 'dx' + str(s), 'dy' + str(s), cx, cy, str(s))
        variables += v
        script += sc
    return variables, script


MODELES = []
NOMS4 = ['v', 'w', 's', 't']
CENTRES4 = [(10, 9), (17, 9), (10, 3), (17, 3)]
FEN4 = '0 ; 21 ; 0 ; 12'
VARS_U4, SCRIPT_U4 = fleche('u', 'a', 'b', 3, 6, 'u')
REGLE_PRODUIT = ('**Produit par un réel** : si $k>0$, $k\\vec{u}$ a **la même direction et le même sens** que'
                 ' $\\vec{u}$ ; si $k<0$, la même direction et le **sens contraire**. Sa longueur est celle'
                 ' de $\\vec{u}$ multipliée par $|k|$.')

# --- 6. 2-289 : produit d'un vecteur par un réel (Produit par un réel, niveau 1) ----------------

# Rôles : 0 k·u⃗ ; 1 −k·u⃗ (signe oublié) ; 2 (ka ; −kb) (symétrique) ; 3 (ka ; b) (une seule
# coordonnée multipliée). k ≠ ±1 : les quatre flèches sont différentes.
VARS_K, SCRIPT_K = fleches_cases(NOMS4, CENTRES4, 4, ['(k)*(a)', '-(k)*(a)', '(k)*(a)', '(k)*(a)'],
                                 ['(k)*(b)', '-(k)*(b)', '-(k)*(b)', '(b)'])

QUEL_KU = variation(
    choix('Parmi les vecteurs représentés ci-dessous, lequel est égal à ${{k}}\\vec{u}$ ?\n\n'
          + figure(FEN4, 'Quadrillage ; à gauche la flèche u ; à droite quatre flèches nommées v, w, s et t.',
                   *(SCRIPT_U4 + SCRIPT_K)),
          ['$\\vec{' + nom + '}$' for nom in NOMS4], melanger=False),
    [var('p', '0..3'), var('k', '2..3;±'), var('a', '1..2;±'), var('b', '1..2;±')] + VARS_U4 + VARS_K
    + [var('bon', 'eval:(4-(p))*min(p,1)')],
    ['abs((k)*(a)) <= 4', 'abs((k)*(b)) <= 4'],
    [REGLE_PRODUIT,
     '$\\vec{u}$ avance de ${{a}}$ horizontalement et de ${{b}}$ verticalement ; ${{k}}\\vec{u}$ avance'
     ' donc de ${{k}}\\times{{a;()}}=' + col('{{eval:(k)*(a)}}') + '$ et de ${{k}}\\times{{b;()}}='
     + col('{{eval:(k)*(b)}}', 1) + '$ : **les deux** déplacements sont multipliés par ${{k}}$.',
     '{{if:k>0|$k>0$ : la flèche garde le sens de $\\vec{u}$.|$k<0$ : la flèche est dans le sens'
     ' contraire de $\\vec{u}$.}}'],
    [case('{{bon}}')])

# u⃗ et v⃗ = k·u⃗ dessinés ; k ∈ {−3, −2, −½, ½, 2, 3}. t = 1 : u⃗ = 2(a ; b), v⃗ = ±(a ; b).
VARS_UK, SCRIPT_UK = fleche('u', 'ux', 'uy', 4, 6, 'u')
VARS_VK, SCRIPT_VK = fleche('v', 'vx', 'vy', 13, 6, 'v')
TROUVER_K = variation(
    'On a représenté les vecteurs $\\vec{u}$ et $\\vec{v}$.\n\n'
    + figure('0 ; 20 ; 0 ; 12', 'Quadrillage ; à gauche la flèche u, à droite la flèche v.',
             *(SCRIPT_UK + SCRIPT_VK))
    + '\n\nComplète l\'égalité.\n\n$$\\vec{v}=?\\,\\vec{u}$$',
    [var('t', '0..1'), var('n', '2..3'), var('sg', '-1..1'), var('a', '1..2;±'), var('b', '-2..2'),
     var('ux', 'eval:(1+(t))*(a)'), var('uy', 'eval:(1+(t))*(b)'),
     var('m', 'eval:(1-(t))*(n)+(t)'),
     var('vx', 'eval:(sg)*(m)*(a)'), var('vy', 'eval:(sg)*(m)*(b)')] + VARS_UK + VARS_VK,
    ['sg != 0', 'abs((m)*(a)) <= 6', 'abs((m)*(b)) <= 6'],
    [REGLE_PRODUIT,
     '**Longueur** : $\\vec{v}$ est {{if:t>0|deux fois plus court|${{n}}$ fois plus long}} que'
     ' $\\vec{u}$. **Sens** : {{if:sg>0|le même|contraire}}. Donc $\\vec{v}='
     + col('{{eval:(sg)*(m)/(1+(t))}}') + '\\,\\vec{u}$.',
     'Vérification sur une coordonnée : $\\vec{u}$ avance de ${{ux}}$ horizontalement, $\\vec{v}$ de'
     ' ${{vx}}$, et ${{eval:(sg)*(m)/(1+(t))}}\\times{{ux;()}}={{vx}}$.'],
    [case('{{eval:(sg)*(m)/(1+(t))}}')])

SP_K = {'p': 1, 'k': -2, 'a': 1, 'b': 2}  # rôles des cases : 1, 2, 3, 0 → bonne case 3
SP_T0 = {'t': 0, 'n': 3, 'sg': -1, 'a': 1, 'b': -1}   # v = −3u
SP_T1 = {'t': 1, 'n': 2, 'sg': 1, 'a': 2, 'b': 1}     # u = (4 ; 2), v = (2 ; 1) = ½u
MODELES.append(modele(
    '06-produit-par-un-reel', 'Produit d\'un vecteur par un réel',
    'Reconnaître la flèche de ku parmi d\'autres, puis lire k quand v = ku sont dessinés'
    ' (pièges : signe de k oublié, une seule coordonnée multipliée, k et 1/k échangés)',
    'Produit par un réel', 1, [QUEL_KU, TROUVER_K],
    [spec('−2u : bonne case 3', 0, SP_K, '3', 'correct'),
     spec('Erreur : signe oublié, 2u (case 0)', 0, SP_K, '0', 'incorrect'),
     spec('Erreur : une seule coordonnée (case 2)', 0, SP_K, '2', 'incorrect'),
     spec('Sans décalage : bonne case 0', 0, dict(SP_K, p=0), '0', 'correct'),
     spec('v = −3u', 1, SP_T0, '-3', 'correct'),
     spec('Erreur : signe oublié, 3', 1, SP_T0, '3', 'incorrect'),
     spec('Erreur : −1/3 (inverse)', 1, SP_T0, '-\\frac{1}{3}', 'incorrect'),
     spec('v = ½u', 1, SP_T1, '\\frac{1}{2}', 'correct'),
     spec('v = 0,5u (décimal)', 1, SP_T1, '0.5', 'correct'),
     spec('Erreur : 2 (inverse)', 1, SP_T1, '2', 'incorrect'),
     spec('v = −½u', 1, dict(SP_T1, sg=-1), '-\\frac{1}{2}', 'correct')],
    delay=90))

# --- 7. 2-290 : colinéarité, sur la figure (Colinéarité, niveau 5) ------------------------------

# Rôles : 0 c·u⃗ (colinéaire) ; 1 (b ; a) ; 2 (ca ; −cb) ; 3 (−b ; a) (perpendiculaire).
# |a| ≠ |b| et a, b ≠ 0 : aucun des rôles 1 à 3 n'est colinéaire à u⃗.
VARS_C, SCRIPT_C = fleches_cases(NOMS4, CENTRES4, 4, ['(c)*(a)', '(b)', '(c)*(a)', '-(b)'],
                                 ['(c)*(b)', '(a)', '-(c)*(b)', '(a)'])
REGLE_COL = ('**Deux vecteurs non nuls sont colinéaires** lorsqu\'ils ont **la même direction** (des flèches'
             ' parallèles), quels que soient leur sens et leur longueur : l\'un est un multiple de l\'autre,'
             ' $\\vec{v}=k\\vec{u}$.')

QUEL_COL = variation(
    choix('Parmi les vecteurs représentés ci-dessous, lequel est colinéaire à $\\vec{u}$ ?\n\n'
          + figure(FEN4, 'Quadrillage ; à gauche la flèche u ; à droite quatre flèches nommées v, w, s et t.',
                   *(SCRIPT_U4 + SCRIPT_C)),
          ['$\\vec{' + nom + '}$' for nom in NOMS4], melanger=False),
    [var('p', '0..3'), var('c', '-2..2'), var('a', '1..2;±'), var('b', '1..2;±')] + VARS_U4 + VARS_C
    + [var('bon', 'eval:(4-(p))*min(p,1)')],
    ['c != 0', 'c != 1', 'abs(a) != abs(b)'],
    [REGLE_COL,
     'Une seule flèche est parallèle à $\\vec{u}$ : celle qui avance de ${{eval:(c)*(a)}}$ horizontalement'
     ' et de ${{eval:(c)*(b)}}$ verticalement, c\'est-à-dire $' + col(coef('c')) + '\\vec{u}$'
     ' {{if:c>0|(même sens)|(sens contraire)}}.',
     'Les autres flèches ne sont pas parallèles à $\\vec{u}$ : pour elles, les deux déplacements ne sont'
     ' pas multipliés par le même nombre.'],
    [case('{{bon}}')])

COL_K = variation(
    choix('On sait que $\\vec{u}={{k}}\\vec{v}$ (avec $\\vec{v}\\neq\\vec{0}$). Les vecteurs $\\vec{u}$ et'
          ' $\\vec{v}$ sont :',
          ['colinéaires et de même sens', 'colinéaires et de sens contraires', 'non colinéaires',
           'on ne peut pas savoir sans figure']),
    [var('k', '2..4;±')],
    [],
    [REGLE_COL,
     '$\\vec{u}={{k}}\\vec{v}$ : $\\vec{u}$ est un multiple de $\\vec{v}$, ils sont **colinéaires**.'
     ' Le coefficient ${{k}}$ est {{if:k>0|positif : **même sens**|négatif : **sens contraires**}}.'],
    [case('{{if:k>0|0|1}}')])

SP_C = {'p': 2, 'c': -2, 'a': 2, 'b': -1}  # rôles des cases : 2, 3, 0, 1 → bonne case 2
MODELES.append(modele(
    '07-colinearite-sur-la-figure', 'Vecteurs colinéaires, sur la figure',
    'Reconnaître la flèche colinéaire à u parmi d\'autres, puis interpréter u = kv'
    ' (pièges : coordonnées échangées, perpendiculaire, sens contraire pris pour non colinéaire)',
    'Colinéarité', 5, [QUEL_COL, COL_K],
    [spec('−2u : bonne case 2', 0, SP_C, '2', 'correct'),
     spec('Erreur : coordonnées échangées (case 3)', 0, SP_C, '3', 'incorrect'),
     spec('Erreur : perpendiculaire (case 1)', 0, SP_C, '1', 'incorrect'),
     spec('Sans décalage : bonne case 0', 0, dict(SP_C, p=0), '0', 'correct'),
     spec('u = −3v : sens contraires', 1, {'k': -3}, '1', 'correct'),
     spec('Erreur : non colinéaires', 1, {'k': -3}, '2', 'incorrect'),
     spec('u = 2v : même sens', 1, {'k': 2}, '0', 'correct'),
     spec('Erreur : sens contraires', 1, {'k': 2}, '1', 'incorrect')]))

# --- 8. 2-291 : combinaison de deux vecteurs non colinéaires (Combinaison, niveau 1) -------------

VARS_I, SCRIPT_I = fleche('i', 'p', 'q', 2, 2, 'i')
VARS_J, SCRIPT_J = fleche('j', 'r', 's', 2, 7, 'j')
VARS_W, SCRIPT_W = fleche('w', 'wx', 'wy', 9, 5, 'w')
COMBI = variation(
    'Les vecteurs $\\vec{i}$ et $\\vec{j}$ ne sont pas colinéaires.\n\n'
    + figure('0 ; 13 ; 0 ; 10', 'Quadrillage ; à gauche les flèches i et j ; à droite la flèche w.',
             *(SCRIPT_I + SCRIPT_J + SCRIPT_W))
    + '\n\nÉcris $\\vec{w}$ en fonction de $\\vec{i}$ et $\\vec{j}$.\n\n$$\\vec{w}=?\\,\\vec{i}+?\\,\\vec{j}$$',
    [var('p', '1..2'), var('q', '-1..1'), var('r', '-1..1'), var('s', '1..2'),
     var('x', '1..3;±'), var('y', '1..3;±'),
     var('wx', 'eval:(x)*(p)+(y)*(r)'), var('wy', 'eval:(x)*(q)+(y)*(s)')] + VARS_I + VARS_J + VARS_W
    + [var('cx', 'eval:(x)*(p)'), var('cy', 'eval:(x)*(q)'),
       var('x0', 'eval:min(min(0,cx),wx)-1'), var('x1', 'eval:max(max(0,cx),wx)+1'),
       var('y0', 'eval:min(min(0,cy),wy)-1'), var('y1', 'eval:max(max(0,cy),wy)+1')],
    ['(p)*(s)-(q)*(r) != 0', 'abs(wx) <= 6', 'abs(wy) <= 6', 'abs(wx)+abs(wy) > 0'],
    ['On cherche combien de fois il faut mettre $\\vec{i}$ bout à bout, puis $\\vec{j}$, pour aller de'
     ' l\'origine de $\\vec{w}$ à son extrémité.',
     figure('{{x0}} ; {{x1}} ; {{y0}} ; {{y1}}',
            'La flèche w, et le chemin : x fois la flèche i, puis y fois la flèche j.',
            'vecteur({{wx}}, {{wy}}, ancre=(0, 0))',
            'vecteur({{cx}}, {{cy}}, ancre=(0, 0), couleur="bleu", trait="tirets")',
            'vecteur({{eval:(y)*(r)}}, {{eval:(y)*(s)}}, ancre=({{cx}}, {{cy}}), couleur="rouge",'
            ' trait="tirets")',
            etiquette(coef('x') + 'i', '0', '0', 'cx', 'cy'),
            etiquette(coef('y') + 'j', 'cx', 'cy', '(y)*(r)', '(y)*(s)')),
     '$$\\vec{w}=' + col(coef('x')) + '\\vec{i}{{if:y>0|+|}}' + col(coef('y'), 1) + '\\vec{j}$$',
     'Vérification en carreaux : ${{x}}\\times{{p;()}}{{if:y>0|+|}}{{y}}\\times{{r;()}}={{wx}}$'
     ' horizontalement et ${{x}}\\times{{q;()}}{{if:y>0|+|}}{{y}}\\times{{s;()}}={{wy}}$ verticalement.'],
    [case('{{x}}'), case('{{y}}')])

SP_W = {'p': 2, 'q': 1, 'r': -1, 's': 1, 'x': 2, 'y': -1}  # w = (5 ; 1)
MODELES.append(modele(
    '08-combinaison-de-deux-vecteurs', 'Écrire un vecteur avec deux vecteurs non colinéaires',
    'Lire sur un quadrillage w = x i + y j quand i et j ne sont pas colinéaires'
    ' (pièges : x et y échangés, signe, coordonnées lues dans le repère du quadrillage)',
    'Combinaison', 1, [COMBI],
    [spec('w = 2i − j', 0, SP_W, ['2', '-1'], 'correct'),
     spec('Erreur : x et y échangés', 0, SP_W, ['-1', '2'], 'incorrect'),
     spec('Erreur : signe de y', 0, SP_W, ['2', '1'], 'incorrect'),
     spec('Erreur : coordonnées du quadrillage (5 ; 1)', 0, SP_W, ['5', '1'], 'incorrect')],
    delay=120))

# --- 9. 2-292 : base orthonormée (Coordonnées, niveau 7) ----------------------------------------

# ty : 0 orthonormée, 1 orthogonale non normée, 2 ni l'une ni l'autre.
# ty 0 : i⃗ = σ(1 − h ; h), j⃗ = τ(−h ; 1 − h) (sur les axes) ;
# ty 1 : i⃗ = (a ; b), j⃗ = mτ(−b ; a), pas tous deux de longueur 1 ;
# ty 2 : i⃗ = (a ; b), j⃗ = (c ; d), ni colinéaires ni perpendiculaires.
OPTIONS_BASE = ['orthonormée', 'orthogonale, mais pas orthonormée', 'ni orthogonale, ni orthonormée']
REGLE_BASE = ('Une base $(\\vec{i},\\vec{j})$ est **orthogonale** si $\\vec{i}$ et $\\vec{j}$ ont des directions'
              ' **perpendiculaires** ; elle est **orthonormée** si de plus $\\|\\vec{i}\\|=\\|\\vec{j}\\|=1$.')
BASE_FIG = variation(
    choix('Le quadrillage est formé de carrés de côté $1$. On a représenté deux vecteurs $\\vec{i}$ et'
          ' $\\vec{j}$ de même origine $O$.\n\n'
          + figure('0 ; 8 ; 0 ; 8', 'Quadrillage ; deux flèches i et j partant du même point O.',
                   'O = point(4, 4, etiquette="bas-gauche")',
                   'vecteur({{ix}}, {{iy}}, ancre=(4, 4))', etiquette('i', '4', '4', 'ix', 'iy'),
                   'vecteur({{jx}}, {{jy}}, ancre=(4, 4))', etiquette('j', '4', '4', 'jx', 'jy'))
          + '\n\nLa base $(\\vec{i},\\vec{j})$ est :', OPTIONS_BASE),
    [var('ty', '0..2'), var('h', '0..1'), var('sg', '-1..1'), var('tau', '-1..1'), var('m', '1..2'),
     var('a', '-2..2'), var('b', '-2..2'), var('c', '-2..2'), var('d', '-2..2'),
     var('ix', 'eval:' + selon_role('ty', ['(sg)*(1-(h))', '(a)', '(a)'])),
     var('iy', 'eval:' + selon_role('ty', ['(sg)*(h)', '(b)', '(b)'])),
     var('jx', 'eval:' + selon_role('ty', ['-(tau)*(h)', '-(m)*(tau)*(b)', '(c)'])),
     var('jy', 'eval:' + selon_role('ty', ['(tau)*(1-(h))', '(m)*(tau)*(a)', '(d)'])),
     ],
    ['sg != 0', 'tau != 0', '(a)^2+(b)^2+(m) >= 3', '(a)*(c)+(b)*(d) != 0', '(a)*(d)-(b)*(c) != 0'],
    [REGLE_BASE,
     '{{if:ty==2|Les flèches $\\vec{i}$ et $\\vec{j}$ ne sont **pas perpendiculaires** : la base n\'est pas'
     ' orthogonale, donc pas orthonormée non plus.|Les flèches $\\vec{i}$ et $\\vec{j}$ sont'
     ' **perpendiculaires** : la base est orthogonale.}}',
     '{{if:ty==0|Chacune mesure **un carreau** : $\\|\\vec{i}\\|=\\|\\vec{j}\\|=1$, la base est'
     ' **orthonormée**.|{{if:ty==1|Mais au moins une des deux ne mesure pas un carreau :'
     ' $\\|\\vec{i}\\|={{eval:sqrt((ix)^2+(iy)^2)}}$ et $\\|\\vec{j}\\|={{eval:sqrt((jx)^2+(jy)^2)}}$.'
     ' La base est **orthogonale, mais pas orthonormée**.|La base n\'est **' + 'ni orthogonale, ni orthonormée**.}}}}'],
    [case('{{ty}}')])

BASE_TEXTE = variation(
    choix('Deux vecteurs $\\vec{i}$ et $\\vec{j}$ vérifient $\\|\\vec{i}\\|={{n1}}$, $\\|\\vec{j}\\|={{n2}}$, et'
          ' leurs directions forment un angle de ${{if:g==0|90|{{if:g==1|60|45}}}}^\\circ$.\n\nLa base'
          ' $(\\vec{i},\\vec{j})$ est :', OPTIONS_BASE),
    [var('g', '0..2'), var('n1', '1..2'), var('n2', '1..2'),
     var('ortho', 'eval:' + ind('g', 0)), var('norme', 'eval:' + ind('n1', 1) + '*' + ind('n2', 1)),
     var('bon', 'eval:(ortho)*(1-(norme))+2*(1-(ortho))')],
    [],
    [REGLE_BASE,
     '{{if:g==0|Angle droit : la base est orthogonale. {{if:norme>0|Et les deux normes valent $1$ : elle est'
     ' **orthonormée**.|Mais une norme au moins n\'est pas $1$ : elle est **' + 'orthogonale, mais pas orthonormée**.}}|L\'angle n\'est pas droit : la base n\'est **' + 'ni orthogonale, ni orthonormée**, même si les normes valent $1$.}}'],
    [case('{{bon}}')])

SP_B0 = {'ty': 0, 'h': 0, 'sg': 1, 'tau': 1, 'm': 1, 'a': 1, 'b': 1, 'c': 1, 'd': 0}
SP_B1 = dict(SP_B0, ty=1)              # i = (1 ; 1), j = (−1 ; 1)
SP_B2 = dict(SP_B0, ty=2)              # i = (1 ; 1), j = (1 ; 0)
MODELES.append(modele(
    '09-base-orthonormee', 'Base orthonormée',
    'Dire si une base (i, j) est orthonormée, orthogonale seulement, ou ni l\'une ni l\'autre, sur'
    ' quadrillage puis d\'après les normes et l\'angle (pièges : orthogonale lue orthonormée, normes 1'
    ' sans angle droit)',
    'Coordonnées', 7, [BASE_FIG, BASE_TEXTE],
    [spec('Sur les axes, un carreau : orthonormée', 0, SP_B0, '0', 'correct'),
     spec('Erreur : orthogonale seulement', 0, SP_B0, '1', 'incorrect'),
     spec('(1 ; 1), (−1 ; 1) : orthogonale', 0, SP_B1, '1', 'correct'),
     spec('Erreur : orthogonale lue orthonormée', 0, SP_B1, '0', 'incorrect'),
     spec('(1 ; 0), (0 ; 2) : orthogonale', 0, dict(SP_B1, a=1, b=0, m=2, c=1, d=1), '1', 'correct'),
     spec('(1 ; 1), (1 ; 0) : ni l\'une ni l\'autre', 0, SP_B2, '2', 'correct'),
     spec('90°, normes 1 : orthonormée', 1, {'g': 0, 'n1': 1, 'n2': 1}, '0', 'correct'),
     spec('90°, norme 2 : orthogonale', 1, {'g': 0, 'n1': 1, 'n2': 2}, '1', 'correct'),
     spec('Erreur : 90°, norme 2 lue orthonormée', 1, {'g': 0, 'n1': 2, 'n2': 1}, '0', 'incorrect'),
     spec('60°, normes 1 : ni l\'une ni l\'autre', 1, {'g': 1, 'n1': 1, 'n2': 1}, '2', 'correct'),
     spec('Erreur : 60°, normes 1 lue orthonormée', 1, {'g': 1, 'n1': 1, 'n2': 1}, '0', 'incorrect')]))

# --- 10. 2-401 : périmètre d'un polygone (Grandeurs › Périmètres, niveau 1) ----------------------

PAS_ECHELLE = '_La figure n\'est pas en vraie grandeur._'
REGLE_PERI = 'Le **périmètre** d\'un polygone est la **somme des longueurs de tous ses côtés**.'
CM = '?~\\text{cm}'


def longueurs(nombre):
    """Longueurs en dixièmes de cm (n1, n2, …) et leur écriture décimale (L1, L2, …)"""
    v = []
    for k in range(1, nombre + 1):
        v += [var('n' + str(k), '21..98'), var('L' + str(k), 'eval:(n' + str(k) + ')/10;d')]
    return v


def somme_n(nombre):
    return '+'.join('(n' + str(k) + ')' for k in range(1, nombre + 1))


def polygone_cote(nom_poly, sommets, cotes, description):
    """Figure d'un polygone fixe, la longueur de chaque côté écrite près de son milieu"""
    script = []
    for nom, (x, y, pos) in sommets.items():
        script.append(nom + ' = point(' + str(x) + ', ' + str(y) + ', etiquette="' + pos + '")')
    script.append('polygone(' + ', '.join(sommets) + ')')
    for k, (x, y) in enumerate(cotes, start=1):
        script.append('texte(' + str(x) + ', ' + str(y) + ', "{{L' + str(k) + '}} cm")')
    return figure('-1 ; 12 ; -1 ; 9', description, *script, grille='non')


def poly_variation(nom_poly, nombre, sommets, cotes):
    egalite = '+'.join('{{L' + str(k) + '}}' for k in range(1, nombre + 1))
    return variation(
        'Calcule le périmètre du ' + nom_poly + ' ci-dessous.\n\n'
        + polygone_cote(nom_poly, sommets, cotes,
                        'Un ' + nom_poly + ', la longueur de chaque côté écrite le long du côté.')
        + '\n\n' + PAS_ECHELLE + '\n\n$P=' + CM + '$',
        longueurs(nombre),
        [],
        [REGLE_PERI,
         '$$P=' + egalite + '=' + col('{{eval:(' + somme_n(nombre) + ')/10;d}}') + '~\\unit{cm}$$'],
        [case('{{eval:(' + somme_n(nombre) + ')/10;d}}')])


TRIANGLE = poly_variation(
    'triangle', 3,
    {'A': (1, 1, 'bas-gauche'), 'B': (10, 1, 'bas-droite'), 'C': (4, 7, 'haut')},
    [(5.5, 0.4), (7.6, 4.4), (1.3, 4.4)])
QUADRI = poly_variation(
    'quadrilatère', 4,
    {'A': (0, 1, 'bas-gauche'), 'B': (8, 0, 'bas-droite'), 'C': (10, 5, 'haut-droite'),
     'D': (3, 8, 'haut-gauche')},
    [(4, -0.2), (10.3, 2.3), (7.4, 7.3), (0.4, 5)])
PENTA = poly_variation(
    'pentagone', 5,
    {'A': (1, 0, 'bas-gauche'), 'B': (8, 1, 'bas-droite'), 'C': (10, 5, 'droite'), 'D': (6, 8, 'haut'),
     'E': (0, 4, 'gauche')},
    [(4.6, -0.2), (10.1, 2.6), (8.9, 7.1), (2.1, 6.8), (-0.3, 1.8)])

REGULIER = variation(
    'Un {{if:g==0|pentagone|{{if:g==1|hexagone|octogone}}}} **régulier** a des côtés de longueur'
    ' ${{L1}}~\\unit{cm}$.\n\nCalcule son périmètre.\n\n$P=' + CM + '$',
    [var('g', '0..2'), var('nc', 'eval:5+(g)+' + ind('g', 2)), var('n1', '15..95'),
     var('L1', 'eval:(n1)/10;d')],
    [],
    [REGLE_PERI,
     'Un polygone **régulier** a tous ses côtés de la même longueur. Un'
     ' {{if:g==0|pentagone|{{if:g==1|hexagone|octogone}}}} a ${{nc}}$ côtés :',
     '$$P={{nc}}\\times{{L1}}=' + col('{{eval:(nc)*(n1)/10;d}}') + '~\\unit{cm}$$'],
    [case('{{eval:(nc)*(n1)/10;d}}')])

UNITES = variation(
    'Les côtés d\'un triangle mesurent ${{L1}}~\\unit{cm}$, ${{L2}}~\\unit{cm}$ et ${{mm}}~\\unit{mm}$.\n\n'
    'Calcule son périmètre, en centimètres.\n\n$P=' + CM + '$',
    [var('n1', '21..98'), var('L1', 'eval:(n1)/10;d'), var('n2', '21..98'), var('L2', 'eval:(n2)/10;d'),
     var('mm', '25..95')],
    ['mm != 10*floor((mm)/10)'],
    [REGLE_PERI,
     'Avant d\'ajouter, on met **toutes les longueurs dans la même unité** : $10~\\unit{mm}=1~\\unit{cm}$,'
     ' donc ${{mm}}~\\unit{mm}=' + col('{{eval:(mm)/10;d}}', 1) + '~\\unit{cm}$.',
     '$$P={{L1}}+{{L2}}+' + col('{{eval:(mm)/10;d}}', 1) + '=' + col('{{eval:((n1)+(n2)+(mm))/10;d}}')
     + '~\\unit{cm}$$'],
    [case('{{eval:((n1)+(n2)+(mm))/10;d}}')])

SP_3 = {'n1': 34, 'n2': 52, 'n3': 47}       # 3,4 + 5,2 + 4,7 = 13,3
SP_5 = {'n1': 25, 'n2': 31, 'n3': 40, 'n4': 28, 'n5': 36}   # 16
MODELES.append(modele(
    '10-perimetre-d-un-polygone', 'Périmètre d\'un polygone',
    'Calculer le périmètre d\'un triangle, d\'un quadrilatère, d\'un pentagone, d\'un polygone régulier,'
    ' puis avec des longueurs en cm et en mm (pièges : un côté oublié, nombre de côtés, unités mêlées)',
    'Périmètre d\'un polygone', 1, [TRIANGLE, QUADRI, PENTA, REGULIER, UNITES],
    [spec('Triangle : 13,3', 0, SP_3, '13.3', 'correct'),
     spec('Triangle : 13,3 écrit 13,30 (forme non optimale)', 0, SP_3, '13.30', 'unoptimal_form',
          ['zeros']),
     spec('Erreur : un côté oublié', 0, SP_3, '8.6', 'incorrect'),
     spec('Quadrilatère : 15,7', 1, dict(SP_3, n4=24), '15.7', 'correct'),
     spec('Pentagone : 16', 2, SP_5, '16', 'correct'),
     spec('Erreur : pentagone, un côté oublié', 2, SP_5, '13.4', 'incorrect'),
     spec('Hexagone régulier de 2,5 : 15', 3, {'g': 1, 'n1': 25}, '15', 'correct'),
     spec('Erreur : hexagone compté à 5 côtés', 3, {'g': 1, 'n1': 25}, '12.5', 'incorrect'),
     spec('Octogone régulier de 1,5 : 12', 3, {'g': 2, 'n1': 15}, '12', 'correct'),
     spec('3,4 cm, 5,2 cm, 47 mm : 13,3', 4, {'n1': 34, 'n2': 52, 'mm': 47}, '13.3', 'correct'),
     spec('Erreur : mm ajoutés comme des cm', 4, {'n1': 34, 'n2': 52, 'mm': 47}, '55.6', 'incorrect')],
    theme='Grandeurs', domain='Périmètres'))

os.makedirs(DOSSIER, exist_ok=True)
for nom, m in MODELES:
    with open(os.path.join(DOSSIER, nom + '.json'), 'w', encoding='utf-8') as f:
        json.dump(m, f, ensure_ascii=False, indent='\t')
        f.write('\n')
# Mis en forme comme le pre-commit, pour que le script redonne les fichiers commités
subprocess.run(['pnpm', 'exec', 'prettier', '--write', DOSSIER], check=True,
               stdout=subprocess.DEVNULL)
print(f'{len(MODELES)} modèles écrits dans {DOSSIER}')
