"""Modèles neufs de la rubrique « Angles » de 6e (chantier idees-6e-angles).

Phase 0 du 2026-11-28 (« je te suis », journal docs/wip/idees-6e-angles-progress.md) :
- N1 « Les noms d'un même angle » (6-168, nœud Angles) : case choix à plusieurs bonnes réponses ;
- N2 « Calculer un angle sur une figure simple » (6-168, nœud Angles, Q1) : case nombre, ° après ;
- N5 « Estimer un angle sans rapporteur » (6-169, nœud mesure en degrés, Q2) : case nombre jugée à
  10° près (`precision` tolérance absolue de la case).

Une case choix ne porte pas d'erreurs prévues (questions.md) : N1 n'a que des specs.

Usage : python3 docs/wip/questions/idees-6e-angles-neufs.py scripts/questions/idees-6e-angles-neufs
"""
import json
import math
import re
import os
import sys

DOSSIER = sys.argv[1]

PRIMAIRE = '\\textcolor{{{color:primary.0}}}'
ANGLES = 'Grandeurs et mesures > Angles'
MESURE = 'Grandeurs et mesures > Angles > mesure en degrés'


def modele(title, description, level, delay, variations, specs, rangement):
    return {'rangement': rangement, 'title': title, 'description': description,
            'grades': ['6'], 'level': level, 'delay': delay, 'status': 'draft',
            'variations': variations, 'testSpecs': specs}


def var(nom, expression):
    return {'name': nom, 'expression': expression}


def erreur(answer, message, label):
    return {'answer': answer, 'message': message, 'label': label}


def case(attendue, erreurs=None, precision=None):
    c = {'expectedAnswer': attendue}
    if precision:
        c['precision'] = precision
    if erreurs:
        c['expectedErrors'] = erreurs
    return c


def variation(statement, variables, blanks, steps, hint, conditions=None):
    return {'statement': statement, 'variables': variables, 'conditions': conditions or [],
            'blanks': blanks, 'correction': {'steps': steps}, 'hint': hint}


def spec(desc, vi, variables_, status, answers, message=None):
    expected = {'status': status}
    if message is not None:
        expected['expectedErrorMessage'] = message
    return {'description': desc, 'variationIndex': vi, 'variables': variables_,
            'expected': expected, 'answers': answers}


def couleur(contenu):
    return PRIMAIRE + '{' + contenu + '}'


def selon(v, textes, k=0):
    """`{{if:v==0|…|{{if:v==1|…|…}}}}` : le texte numéro v."""
    if k == len(textes) - 1:
        return textes[k]
    return '{{if:' + v + '==' + str(k) + '|' + textes[k] + '|' + selon(v, textes, k + 1) + '}}'


def sel(v, valeurs):
    """Expression qui vaut valeurs[k] quand v == k (pour une variable `eval:`)."""
    return '+'.join(f'({x})*(1-min(abs({v}-{k}),1))' for k, x in enumerate(valeurs))


def bloc(nom, *lignes):
    texte = '\n'.join(lignes)
    if nom == 'figure':
        # Positions en écriture décimale : une fraction (`\dfrac`) ne se lit pas dans une figure
        texte = re.sub(r'\{\{eval:([^{}]*?)(;d)?\}\}', r'{{eval:\1;d}}', texte)
    return '```' + nom + '\n' + texte + '\n```'


def chap(*lettres):
    return '\\widehat{' + ''.join(lettres) + '}'


def ecrire(nom, m):
    os.makedirs(DOSSIER, exist_ok=True)
    chemin = os.path.join(DOSSIER, nom + '.json')
    # Garder l'id écrit en tête par create-questions --publier, s'il existe
    if os.path.exists(chemin):
        with open(chemin, encoding='utf-8') as f:
            ancien = json.load(f)
        if 'id' in ancien:
            m = {'id': ancien['id'], **m}
    with open(chemin, 'w', encoding='utf-8') as f:
        json.dump(m, f, ensure_ascii=False, indent=2)
        f.write('\n')


# =============================================================================================
# N1 — 6-168 : les noms d'un même angle. Triangle ABC, M sur [BA], N sur [BC], I = (AN) ∩ (CM).
# Trois jeux de lettres (k = 0..2) : A B C M N I / R S T U V K / E F G P Q H.
# =============================================================================================

JEUX = [list('ABCMNI'), list('RSTUVK'), list('EFGPQH')]


def L(i):
    """La lettre i (0 = A, 1 = B, 2 = C, 3 = M, 4 = N, 5 = I) du jeu tiré."""
    return selon('k', [j[i] for j in JEUX])


A_, B_, C_, M_, N_, I_ = (L(i) for i in range(6))

# Coordonnées fixes : B en bas à gauche, A en haut, C en bas à droite
PA, PB, PC = (2.5, 4.5), (0.0, 0.0), (7.0, 0.0)
PM = (PB[0] + 0.55 * (PA[0] - PB[0]), PB[1] + 0.55 * (PA[1] - PB[1]))
PN = (PB[0] + 0.5 * (PC[0] - PB[0]), PB[1])


def intersection(p1, p2, p3, p4):
    """Point commun des droites (p1p2) et (p3p4)."""
    x1, y1 = p1
    x2, y2 = p2
    x3, y3 = p3
    x4, y4 = p4
    d = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4)
    t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / d
    return (x1 + t * (x2 - x1), y1 + t * (y2 - y1))


PI = intersection(PA, PN, PC, PM)


def pt(nom, p, etiquette):
    return f'{nom} = point({round(p[0], 4)}, {round(p[1], 4)}, etiquette="{etiquette}")'


def figure_n1(avec_n, marque):
    lignes = [
        'fenetre: -1 ; 8 ; -1 ; 5.5',
        'grille: non',
        'description: Un triangle aux sommets nommés, des points sur ses côtés ; un angle est '
        'marqué en rouge.',
        '---',
        pt(A_, PA, 'haut'), pt(B_, PB, 'bas-gauche'), pt(C_, PC, 'bas-droite'),
        pt(M_, PM, 'gauche'),
    ]
    if avec_n:
        lignes += [pt(N_, PN, 'bas'), pt(I_, PI, 'bas-gauche')]
    lignes += [f'polygone({A_}, {B_}, {C_}, couleur="noir", epaisseur=2)',
               f'segment({C_}, {M_}, epaisseur=2)']
    if avec_n:
        lignes.append(f'segment({A_}, {N_}, epaisseur=2)')
    lignes.append(marque)
    return bloc('figure', *lignes)


def choix(options):
    return bloc('choix', 'plusieurs: oui', *['- $' + o + '$' for o in options])


CONSIGNE_N1 = 'Coche **tous** les noms de l\'angle marqué en rouge.'
REGLE_NOM = ('**Nommer un angle** : la lettre du **sommet** au milieu, et de chaque côté la lettre '
             'd\'un point placé sur un côté de l\'angle (n\'importe lequel).')

# (a) M sur [BA] : angle de sommet B
OPT_A = [chap(A_, B_, C_), chap(C_, B_, A_), chap(M_, B_, C_), chap(C_, B_, M_), chap(B_, A_, C_),
         chap(B_, M_, C_), chap(A_, C_, B_)]
N1_A = variation(
    CONSIGNE_N1 + '\n\n' + figure_n1(False, f'angle({A_}, {B_}, {C_}, couleur="rouge")')
    + '\n\n' + choix(OPT_A),
    [var('k', '0..2')],
    [case('0;1;2;3')],
    [REGLE_NOM,
     'Le sommet est $' + B_ + '$. Sur un côté il y a $' + A_ + '$ et $' + M_ + '$, sur l\'autre $'
     + C_ + '$ : $' + couleur(chap(A_, B_, C_)) + '$, $' + couleur(chap(C_, B_, A_)) + '$, $'
     + couleur(chap(M_, B_, C_)) + '$ et $' + couleur(chap(C_, B_, M_)) + '$ sont le même angle.',
     '$' + chap(B_, A_, C_) + '$ et $' + chap(A_, C_, B_) + '$ ont un autre sommet ; $'
     + chap(B_, M_, C_) + '$ a pour sommet $' + M_ + '$.'],
    'Quelle lettre doit être au milieu ? Et quels points sont sur les côtés de cet angle ?',
)

# (b) M sur [BA], N sur [BC] : angle de sommet B, huit noms justes
OPT_B = [chap(A_, B_, C_), chap(M_, B_, N_), chap(B_, A_, C_), chap(N_, B_, A_), chap(B_, N_, M_),
         chap(C_, B_, M_)]
N1_B = variation(
    CONSIGNE_N1 + '\n\n' + figure_n1(True, f'angle({A_}, {B_}, {C_}, couleur="rouge")')
    + '\n\n' + choix(OPT_B),
    [var('k', '0..2')],
    [case('0;1;3;5')],
    [REGLE_NOM,
     'Le sommet est $' + B_ + '$. Sur un côté : $' + A_ + '$ ou $' + M_ + '$ ; sur l\'autre : $'
     + C_ + '$ ou $' + N_ + '$. Les noms justes : $' + couleur(chap(A_, B_, C_)) + '$, $'
     + couleur(chap(M_, B_, N_)) + '$, $' + couleur(chap(N_, B_, A_)) + '$, $'
     + couleur(chap(C_, B_, M_)) + '$.',
     '$' + chap(B_, A_, C_) + '$ a pour sommet $' + A_ + '$, $' + chap(B_, N_, M_) + '$ a pour '
     'sommet $' + N_ + '$.'],
    'La lettre du milieu est le sommet. Un côté de l\'angle porte deux points nommés : on peut '
    'prendre l\'un ou l\'autre.',
)

# (c) angle de sommet I, entre [IA) et [IC)
OPT_C = [chap(A_, I_, C_), chap(N_, I_, M_), chap(C_, I_, A_), chap(I_, C_, A_), chap(A_, I_, M_)]
N1_C = variation(
    CONSIGNE_N1 + '\n\n' + figure_n1(True, f'angle({C_}, {I_}, {A_}, couleur="rouge")')
    + '\n\n' + choix(OPT_C),
    [var('k', '0..2')],
    [case('0;2')],
    [REGLE_NOM,
     'Le sommet est $' + I_ + '$, les côtés sont $[' + I_ + A_ + ')$ et $[' + I_ + C_ + ')$ : $'
     + couleur(chap(A_, I_, C_)) + '$ ou $' + couleur(chap(C_, I_, A_)) + '$.',
     '$' + chap(N_, I_, M_) + '$ est l\'angle **opposé par le sommet** : un autre angle, de l\'autre '
     'côté de $' + I_ + '$. $' + chap(A_, I_, M_) + '$ est un angle voisin, et $' + chap(I_, C_, A_)
     + '$ a pour sommet $' + C_ + '$.'],
    'Repère le sommet de l\'angle rouge, puis un point sur chacun de ses deux côtés.',
)

V_K1 = {'k': '0'}
V_K2 = {'k': '1'}
SPECS_N1 = [
    spec('Les quatre noms justes', 0, V_K1, 'correct', ['0;1;2;3']),
    spec('Deux noms seulement (partiel)', 0, V_K1, 'unoptimal_form', ['0;1']),
    spec('Sommet pas au milieu (BAC)', 0, V_K1, 'incorrect', ['0;1;2;3;4']),
    spec('Angle de sommet M (BMC)', 0, V_K2, 'incorrect', ['0;5']),
    spec('Les quatre noms justes (b)', 1, V_K1, 'correct', ['0;1;3;5']),
    spec('Oubli des noms avec M et N (partiel)', 1, V_K1, 'unoptimal_form', ['0']),
    spec('Sommet en N (BNM)', 1, V_K2, 'incorrect', ['0;1;3;4;5']),
    spec('Les deux noms justes (c)', 2, V_K1, 'correct', ['0;2']),
    spec('Opposé par le sommet (NIM)', 2, V_K1, 'incorrect', ['0;1;2']),
    spec('Angle voisin (AIM)', 2, V_K2, 'incorrect', ['4']),
]

N1 = modele(
    'Les noms d\'un même angle',
    'Reconnaître tous les noms d\'un angle quand ses côtés portent plusieurs points (sommet au '
    'milieu, n\'importe quel point de chaque côté) ; pièges : sommet mal placé, angle voisin, '
    'angle opposé par le sommet',
    3, 60, [N1_A, N1_B, N1_C], SPECS_N1, {'noeud': ANGLES, 'point': '6-168'})


# =============================================================================================
# N2 — 6-168 : calculer un angle sur une figure simple. Sommet A en (0 ; 0).
# =============================================================================================

DEG = '^\\circ'


def p_dir(nom, longueur, angle, etiquette=None, visible=True):
    opts = f'longueur={longueur}, angle={angle}'
    if not visible:
        opts += ', visible=faux'
    elif etiquette:
        opts += f', etiquette="{etiquette}"'
    return f'{nom} = point(A, {opts})'


def etiquette_angle(nom, rayon, angle, texte):
    """Texte d'une mesure posé dans l'angle, à `rayon` du sommet, dans la direction `angle`."""
    return [f'{nom} = point(A, longueur={rayon}, angle={angle}, visible=faux)',
            f'texte({nom}, "{texte}")']


TETE = 'A = point(0, 0, etiquette="bas")'

# (a) angle droit codé partagé par [AD) : BAD = x affiché, DAC ?
FIG_A = bloc(
    'figure', 'fenetre: -2.5 ; 5.5 ; -1.5 ; 5.5', 'grille: non',
    'description: Un angle droit BAC codé ; la demi-droite [AD) le partage ; l\'angle BAD porte sa '
    'mesure, l\'angle DAC un point d\'interrogation.',
    '---', TETE,
    p_dir('B', 4.5, '{{t}}', 'bas'), p_dir('C', 4.5, '{{eval:t+90}}', 'gauche'),
    p_dir('D', 4.5, '{{eval:t+x}}', 'droite'),
    'demidroite(A, B)', 'demidroite(A, C)', 'demidroite(A, D)',
    'angle(B, A, C, marque="carre")',
    'angle(B, A, D, couleur="bleu", arcRadiusPx=45)', 'angle(D, A, C, couleur="rouge", arcRadiusPx=45)',
    *etiquette_angle('T1', 1.3, '{{eval:t+x/2}}', '{{x}}°'),
    *etiquette_angle('T2', 1.3, '{{eval:t+(90+x)/2}}', '?'),
)
MSG_A_SOMME = 'Les deux angles se partagent l\'angle droit : on **retire** $x$ de $90^\\circ$, on ne l\'ajoute pas.'
MSG_A_PLAT = 'L\'angle $\\widehat{BAC}$ est **droit** (le petit carré) : il mesure $90^\\circ$, pas $180^\\circ$.'
N2_A = variation(
    'L\'angle $\\widehat{BAC}$ est droit et $\\widehat{BAD} = {{x}}' + DEG + '$.\n\n' + FIG_A
    + '\n\nCombien mesure l\'angle $\\widehat{DAC}$ ?\n\n$\\widehat{DAC} = ?' + DEG + '$',
    [var('x', '25..65'), var('t', '0..25')],
    [case('{{eval:90-x}}', [
        erreur('{{eval:90+x}}', MSG_A_SOMME, 'Somme au lieu de la différence'),
        erreur('{{eval:180-x}}', MSG_A_PLAT, 'Angle plat au lieu de droit'),
        erreur('{{x}}', 'Ça, c\'est la mesure de $\\widehat{BAD}$ ; on demande l\'autre partie de l\'angle droit.', 'Angle recopié'),
    ])],
    ['L\'angle droit $\\widehat{BAC}$ mesure $90' + DEG + '$ ; il est partagé en $\\widehat{BAD}$ et $\\widehat{DAC}$.',
     '$\\widehat{DAC} = 90' + DEG + ' - {{x}}' + DEG + ' = ' + couleur('{{eval:90-x}}' + DEG) + '$.'],
    'Que mesure un angle droit ? Les deux angles colorés le remplissent ensemble.',
    ['x!=45'],
)

# (b) B, A, C alignés (angle plat) : BAD = x, DAC ?
FIG_B = bloc(
    'figure', 'fenetre: -5 ; 5 ; -1.2 ; 4.5', 'grille: non',
    'description: Trois points B, A, C alignés ; la demi-droite [AD) ; l\'angle BAD porte sa mesure, '
    'l\'angle DAC un point d\'interrogation.',
    '---', TETE,
    'B = point(-4.5, 0, etiquette="bas")', 'C = point(4.5, 0, etiquette="bas")',
    p_dir('D', 4, '{{eval:180-x}}', 'droite'),
    'demidroite(A, B)', 'demidroite(A, C)', 'demidroite(A, D)',
    'angle(D, A, B, couleur="bleu", arcRadiusPx=45)', 'angle(C, A, D, couleur="rouge", arcRadiusPx=45)',
    *etiquette_angle('T1', 1.3, '{{eval:180-x/2}}', '{{x}}°'),
    *etiquette_angle('T2', 1.3, '{{eval:(180-x)/2}}', '?'),
)
N2_B = variation(
    'Les points $B$, $A$ et $C$ sont alignés, et $\\widehat{BAD} = {{x}}' + DEG + '$.\n\n' + FIG_B
    + '\n\nCombien mesure l\'angle $\\widehat{DAC}$ ?\n\n$\\widehat{DAC} = ?' + DEG + '$',
    [var('x', '25..155')],
    [case('{{eval:180-x}}', [
        erreur('{{eval:abs(90-x)}}', 'Les points $B$, $A$, $C$ sont alignés : l\'angle $\\widehat{BAC}$ est **plat**, il mesure $180^\\circ$, pas $90^\\circ$.', 'Angle droit au lieu de plat'),
        erreur('{{eval:180+x}}', 'Les deux angles se partagent l\'angle plat : on **retire** ${{x}}^\\circ$ de $180^\\circ$.', 'Somme au lieu de la différence'),
        erreur('{{x}}', 'Ça, c\'est la mesure de $\\widehat{BAD}$ ; on demande l\'autre angle.', 'Angle recopié'),
    ])],
    ['$B$, $A$, $C$ alignés : l\'angle $\\widehat{BAC}$ est **plat**, il mesure $180' + DEG + '$. '
     'Les angles $\\widehat{BAD}$ et $\\widehat{DAC}$ sont **supplémentaires** : leur somme fait $180' + DEG + '$.',
     '$\\widehat{DAC} = 180' + DEG + ' - {{x}}' + DEG + ' = ' + couleur('{{eval:180-x}}' + DEG) + '$.'],
    'Trois points alignés forment un angle plat : combien mesure-t-il ?',
    ['x!=90'],
)

# (c) BAC = y donné, BAD = x : DAC ?
FIG_C = bloc(
    'figure', 'fenetre: -5 ; 5 ; -1.2 ; 5', 'grille: non',
    'description: Un angle BAC et une demi-droite [AD) à l\'intérieur ; l\'angle BAD porte sa '
    'mesure, l\'angle DAC un point d\'interrogation.',
    '---', TETE,
    'B = point(4.5, 0, etiquette="bas")',
    p_dir('C', 4.5, '{{y}}', 'gauche'), p_dir('D', 4.5, '{{x}}', 'droite'),
    'demidroite(A, B)', 'demidroite(A, C)', 'demidroite(A, D)',
    'angle(B, A, D, couleur="bleu", arcRadiusPx=45)', 'angle(D, A, C, couleur="rouge", arcRadiusPx=45)',
    *etiquette_angle('T1', 1.3, '{{eval:x/2}}', '{{x}}°'),
    *etiquette_angle('T2', 1.3, '{{eval:(x+y)/2}}', '?'),
)
N2_C = variation(
    '$\\widehat{BAC} = {{y}}' + DEG + '$ et $\\widehat{BAD} = {{x}}' + DEG + '$.\n\n' + FIG_C
    + '\n\nCombien mesure l\'angle $\\widehat{DAC}$ ?\n\n$\\widehat{DAC} = ?' + DEG + '$',
    [var('y', '51..179'), var('x', '25..154')],
    [case('{{eval:y-x}}', [
        erreur('{{eval:y+x}}', 'L\'angle $\\widehat{BAC}$ est partagé en deux : on **retire** $\\widehat{BAD}$ de $\\widehat{BAC}$.', 'Somme au lieu de la différence'),
        erreur('{{eval:180-x}}', 'L\'angle $\\widehat{BAC}$ n\'est pas plat : il mesure ${{y}}^\\circ$, c\'est de lui qu\'on retire ${{x}}^\\circ$.', 'Pris pour un angle plat'),
        erreur('{{eval:90-x}}', 'L\'angle $\\widehat{BAC}$ n\'est pas droit : il mesure ${{y}}^\\circ$, c\'est de lui qu\'on retire ${{x}}^\\circ$.', 'Pris pour un angle droit'),
    ])],
    ['$[AD)$ partage l\'angle $\\widehat{BAC}$ en $\\widehat{BAD}$ et $\\widehat{DAC}$ : $\\widehat{BAD} + \\widehat{DAC} = \\widehat{BAC}$.',
     '$\\widehat{DAC} = {{y}}' + DEG + ' - {{x}}' + DEG + ' = ' + couleur('{{eval:y-x}}' + DEG) + '$.'],
    'Les deux angles colorés remplissent ensemble l\'angle $\\widehat{BAC}$.',
    ['x<=y-25', 'y!=90', 'y-x!=90'],
)

# (d) angle droit partagé en n parts égales : une part ? n = 2, 3, 5, 6, 9 (j = 0..4)
NS_D = [2, 3, 5, 6]


def rayons(nombre, total, max_n, etiq_fin, premiere=True, rayon=None):
    """Demi-droites qui partagent un angle de `total` degrés en n parts (n ⩽ max_n) : P1…P(n−1)
    conditionnels, et les marques d'angles égaux de chaque part."""
    r = f', arcRadiusPx={rayon}' if rayon else ''
    lignes = []
    for i in range(1, max_n):
        lignes.append('{{if:n>' + str(i) + '|' + f'P{i} = point(A, longueur=4, angle={{{{eval:t+{total}*{i}/n}}}}, visible=faux)\n'
                      + f'demidroite(A, P{i})' + '|}}')
    # parts : de B à P1, Pi à Pi+1, P(n−1) à C
    if premiere:
        lignes.append('angle(B, A, P1, marque="arcs2"' + r + ')')
    for i in range(1, max_n - 1):
        lignes.append('{{if:n>' + str(i + 1) + '|' + f'angle(P{i}, A, P{i + 1}, marque="arcs2"{r})' + '|}}')
    for i in range(1, max_n):
        lignes.append('{{if:n==' + str(i + 1) + '|' + f'angle(P{i}, A, {etiq_fin}, marque="arcs2"{r})' + '|}}')
    return lignes


FIG_D = bloc(
    'figure', 'fenetre: -2.5 ; 5.5 ; -1.5 ; 5.5', 'grille: non',
    'description: Un angle droit BAC codé, partagé en angles égaux codés de la même façon ; une '
    'part en rouge.',
    '---', TETE,
    p_dir('B', 4.5, '{{t}}', 'bas'), p_dir('C', 4.5, '{{eval:t+90}}', 'gauche'),
    'demidroite(A, B)', 'demidroite(A, C)',
    'angle(B, A, C, marque="carre")',
    *rayons('n', 90, 6, 'C', premiere=False, rayon=55),
    'angle(B, A, P1, couleur="rouge", marque="arcs2", arcRadiusPx=55)',
)
N2_D = variation(
    'L\'angle droit $\\widehat{BAC}$ est partagé en ${{n}}$ angles égaux.\n\n' + FIG_D
    + '\n\nCombien mesure chacun de ces angles ?\n\nChaque angle mesure $?' + DEG + '$.',
    [var('j', '0..3'), var('n', 'eval:' + sel('j', NS_D)), var('t', '0..20')],
    [case('{{eval:90/n}}', [
        erreur('{{eval:180/n}}', 'L\'angle partagé est **droit** (le petit carré) : il mesure $90^\\circ$, pas $180^\\circ$.', 'Angle plat au lieu de droit'),
        erreur('{{eval:90*n}}', 'On **partage** l\'angle droit : chaque part est plus petite que $90^\\circ$. On divise par ${{n}}$.', 'Multiplication au lieu de la division'),
        erreur('{{eval:90-n}}', 'Partager en ${{n}}$ angles égaux, c\'est **diviser** $90^\\circ$ par ${{n}}$, pas retirer ${{n}}$.', 'Soustraction'),
    ])],
    ['L\'angle droit mesure $90' + DEG + '$ ; les ${{n}}$ angles égaux se le partagent.',
     '$90' + DEG + ' \\div {{n}} = ' + couleur('{{eval:90/n}}' + DEG) + '$.'],
    'Que mesure l\'angle droit ? Partage cette mesure en parts égales.',
)

# (e) angle plat partagé en n parts égales (n = 3, 4, 5, 6, 9 ; j = 0..4) : l'angle de k parts ?
NS_E = [3, 4, 5, 6, 9]
FIG_E = bloc(
    'figure', 'fenetre: -5 ; 5 ; -1.2 ; 5', 'grille: non',
    'description: Trois points B, A, C alignés ; l\'angle plat est partagé en angles égaux codés de '
    'la même façon ; l\'angle BAD, fait de plusieurs parts, en rouge.',
    '---', TETE,
    'B = point(4.5, 0, etiquette="bas")', 'C = point(-4.5, 0, etiquette="bas")',
    'demidroite(A, B)', 'demidroite(A, C)',
    *rayons('n', 180, 9, 'C'),
    'D = point(A, longueur=4.6, angle={{eval:180*k/n}}, etiquette="droite")',
    'angle(B, A, D, couleur="rouge", arcRadiusPx=80)',
)
FIG_E = FIG_E.replace('angle={{eval:t+180*', 'angle={{eval:180*')
N2_E = variation(
    'Les points $B$, $A$ et $C$ sont alignés. L\'angle plat $\\widehat{BAC}$ est partagé en ${{n}}$ '
    'angles égaux.\n\n' + FIG_E
    + '\n\nCombien mesure l\'angle $\\widehat{BAD}$, en rouge ?\n\n$\\widehat{BAD} = ?' + DEG + '$',
    [var('j', '0..4'), var('n', 'eval:' + sel('j', NS_E)), var('k', '2..8')],
    [case('{{eval:180*k/n}}', [
        erreur('{{eval:180/n}}', 'Ça, c\'est **une** part. L\'angle rouge en contient ${{k}}$.', 'Une seule part'),
        erreur('{{eval:180-180*k/n}}', 'Ça, c\'est l\'autre angle, du côté de $C$. L\'angle rouge part de $[AB)$.', 'L\'autre côté'),
        erreur('{{eval:180*(k+1)/n}}', 'Compte les **angles** entre $[AB)$ et $[AD)$, pas les demi-droites : il y en a ${{k}}$.', 'Demi-droites comptées'),
    ])],
    ['L\'angle plat mesure $180' + DEG + '$ ; chaque part mesure $180' + DEG + ' \\div {{n}} = {{eval:180/n}}' + DEG + '$.',
     'L\'angle $\\widehat{BAD}$ contient ${{k}}$ parts : ${{k}} \\times {{eval:180/n}}' + DEG + ' = '
     + couleur('{{eval:180*k/n}}' + DEG) + '$.'],
    'Combien mesure une part ? Puis compte les parts dans l\'angle rouge.',
    ['k<n', '180*k!=90*n'],
)

# (f) deux ou trois angles consécutifs affichés : leur somme. s = 0 : BAE ; 1 : DAF ; 2 : BAF.
FIG_F = bloc(
    'figure', 'fenetre: -5 ; 5 ; -1.2 ; 5', 'grille: non',
    'description: Quatre demi-droites [AB), [AD), [AE), [AF) ; les trois angles entre elles portent '
    'leur mesure.',
    '---', TETE,
    'B = point(4.5, 0, etiquette="bas")',
    p_dir('D', 4.5, '{{p}}', 'droite'), p_dir('E', 4.5, '{{eval:p+q}}', 'haut'),
    p_dir('F', 4.5, '{{eval:p+q+r}}', 'gauche'),
    'demidroite(A, B)', 'demidroite(A, D)', 'demidroite(A, E)', 'demidroite(A, F)',
    'angle(B, A, D)', 'angle(D, A, E)', 'angle(E, A, F)',
    *etiquette_angle('T1', 2, '{{eval:p/2}}', '{{p}}°'),
    *etiquette_angle('T2', 2, '{{eval:p+q/2}}', '{{q}}°'),
    *etiquette_angle('T3', 2, '{{eval:p+q+r/2}}', '{{r}}°'),
)
NOM_F = selon('s', ['\\widehat{BAE}', '\\widehat{DAF}', '\\widehat{BAF}'])
N2_F = variation(
    FIG_F + '\n\nCombien mesure l\'angle $' + NOM_F + '$ ?\n\n$' + NOM_F + ' = ?' + DEG + '$',
    [var('p', '25..55'), var('q', '25..55'), var('r', '25..55'), var('s', '0..2'),
     var('v', 'eval:' + sel('s', ['p+q', 'q+r', 'p+q+r']))],
    [case('{{v}}', [
        erreur('{{eval:' + sel('s', ['p', 'q', 'p']) + '}}', 'Ça, c\'est un seul des angles. L\'angle $' + NOM_F + '$ en contient plusieurs : ajoute-les.', 'Un seul angle'),
        erreur('{{eval:' + sel('s', ['p+q+r', 'p+q+r', 'p+q']) + '}}', 'Regarde bien entre quelles demi-droites est l\'angle $' + NOM_F + '$ : compte les angles qui sont **dedans**, et seulement eux.', 'Mauvais nombre d\'angles'),
        erreur('{{eval:180-v}}', 'On ne retire rien de $180^\\circ$ : l\'angle $' + NOM_F + '$ est fait des angles affichés **dedans**, on les ajoute.', 'Complément à 180°'),
    ])],
    ['L\'angle $' + NOM_F + '$ est fait des angles qui sont entre ses deux côtés.',
     '$' + NOM_F + ' = ' + selon('s', ['{{p}}' + DEG + ' + {{q}}' + DEG, '{{q}}' + DEG + ' + {{r}}' + DEG,
                                        '{{p}}' + DEG + ' + {{q}}' + DEG + ' + {{r}}' + DEG])
     + ' = ' + couleur('{{v}}' + DEG) + '$.'],
    'Repère les deux côtés de l\'angle demandé : quels angles affichés sont entre eux ?',
)

SPECS_N2 = [
    spec('90 − 35 = 55', 0, {'x': '35', 't': '10'}, 'correct', ['55']),
    spec('Somme 125', 0, {'x': '35', 't': '10'}, 'incorrect', ['125'], MSG_A_SOMME),
    spec('Angle plat 145', 0, {'x': '35', 't': '10'}, 'incorrect', ['145'], MSG_A_PLAT),
    spec('180 − 50 = 130', 1, {'x': '50'}, 'correct', ['130']),
    spec('Angle droit 40', 1, {'x': '50'}, 'incorrect', ['40'],
         'Les points $B$, $A$, $C$ sont alignés : l\'angle $\\widehat{BAC}$ est **plat**, il mesure $180^\\circ$, pas $90^\\circ$.'),
    spec('180 − 140 = 40', 1, {'x': '140'}, 'correct', ['40']),
    spec('Angle recopié 140', 1, {'x': '140'}, 'incorrect', ['140'],
         'Ça, c\'est la mesure de $\\widehat{BAD}$ ; on demande l\'autre angle.'),
    spec('130 − 48 = 82', 2, {'y': '130', 'x': '48'}, 'correct', ['82']),
    spec('Somme 178', 2, {'y': '130', 'x': '48'}, 'incorrect', ['178'],
         'L\'angle $\\widehat{BAC}$ est partagé en deux : on **retire** $\\widehat{BAD}$ de $\\widehat{BAC}$.'),
    spec('90 ÷ 3 = 30', 3, {'j': '1', 'n': '3', 't': '5'}, 'correct', ['30']),
    spec('180 ÷ 3 = 60', 3, {'j': '1', 'n': '3', 't': '5'}, 'incorrect', ['60'],
         'L\'angle partagé est **droit** (le petit carré) : il mesure $90^\\circ$, pas $180^\\circ$.'),
    spec('90 ÷ 6 = 15', 3, {'j': '3', 'n': '6', 't': '0'}, 'correct', ['15']),
    spec('3 parts de 180 ÷ 5 = 108', 4, {'j': '2', 'n': '5', 'k': '3'}, 'correct', ['108']),
    spec('Une part 36', 4, {'j': '2', 'n': '5', 'k': '3'}, 'incorrect', ['36'],
         'Ça, c\'est **une** part. L\'angle rouge en contient $3$.'),
    spec('Demi-droites comptées 144', 4, {'j': '2', 'n': '5', 'k': '3'}, 'incorrect', ['144'],
         'Compte les **angles** entre $[AB)$ et $[AD)$, pas les demi-droites : il y en a $3$.'),
    spec('2 parts de 60 = 120', 4, {'j': '0', 'n': '3', 'k': '2'}, 'correct', ['120']),
    spec('BAE = 30 + 40 = 70', 5, {'p': '30', 'q': '40', 'r': '50', 's': '0', 'v': '70'}, 'correct', ['70']),
    spec('BAE : les trois, 120', 5, {'p': '30', 'q': '40', 'r': '50', 's': '0', 'v': '70'}, 'incorrect', ['120'],
         'Regarde bien entre quelles demi-droites est l\'angle $\\widehat{BAE}$ : compte les angles qui sont **dedans**, et seulement eux.'),
    spec('BAF = 30 + 40 + 50 = 120', 5, {'p': '30', 'q': '40', 'r': '50', 's': '2', 'v': '120'}, 'correct', ['120']),
    spec('DAF = 40 + 50 = 90', 5, {'p': '30', 'q': '40', 'r': '50', 's': '1', 'v': '90'}, 'correct', ['90']),
]

N2 = modele(
    'Calculer un angle sur une figure simple',
    'Calculer un angle sur une figure : partie d\'un angle droit ou plat (angles supplémentaires), '
    'partie d\'un angle donné, angle droit ou plat partagé en angles égaux, somme d\'angles '
    'consécutifs ; pièges : ajouter au lieu de retirer, angle droit et angle plat confondus, une '
    'seule part',
    4, 90, [N2_A, N2_B, N2_C, N2_D, N2_E, N2_F], SPECS_N2, {'noeud': ANGLES, 'point': '6-168'})


# =============================================================================================
# N5 — 6-169 : estimer un angle sans rapporteur, réponse jugée à 10° près.
# =============================================================================================

TOL = {'type': 'tolerance', 'tolerance': 10, 'mode': 'absolute'}


def figure_n5(base):
    return bloc(
        'figure', 'fenetre: -5 ; 5 ; -5 ; 5', 'grille: non',
        'description: Un angle AOB marqué d\'un arc, sans mesure ni rapporteur.',
        '---',
        'O = point(0, 0, etiquette="bas")',
        f'A = point(O, longueur=4.2, angle={base}, etiquette="bas")',
        f'B = point(O, longueur=4.2, angle={{{{eval:{base}+a}}}}, etiquette="haut")',
        'demidroite(O, A)', 'demidroite(O, B)', 'angle(A, O, B, couleur="rouge")',
    )


CONSIGNE_N5 = ('**Sans rapporteur**, estime la mesure de l\'angle $\\widehat{AOB}$. Une estimation '
               'à $10' + DEG + '$ près est acceptée.')
STEPS_N5 = [
    'Compare à l\'angle droit ($90' + DEG + '$) : l\'angle est {{if:a<90|**aigu**, plus petit qu\'un angle droit|**obtus**, plus grand qu\'un angle droit}}.',
    '{{if:a<45|Il est plus petit que la moitié d\'un angle droit ($45^\\circ$).|{{if:a<90|Il est plus grand que la moitié d\'un angle droit ($45^\\circ$).|{{if:a<135|Il dépasse l\'angle droit de moins d\'une moitié d\'angle droit.|Il est presque plat ($180^\\circ$).}}}}}}',
    'Il mesure $' + couleur('{{a}}' + DEG) + '$ : une réponse entre ${{eval:a-10}}' + DEG + '$ et ${{eval:a+10}}' + DEG + '$ est juste.',
]
MSG_N5_INV = ('Ton angle est-il **aigu** (plus petit qu\'un angle droit) ou **obtus** (plus grand) ? '
              'Compare-le d\'abord à un coin de feuille.')
HINT_N5 = 'Compare l\'angle à un angle droit (un coin de feuille), puis à la moitié d\'un angle droit.'

N5_A = variation(
    CONSIGNE_N5 + '\n\n' + figure_n5('{{t}}') + '\n\n$\\widehat{AOB} \\approx ?' + DEG + '$',
    [var('r', '2..8'), var('a', 'eval:10*r'), var('t', '0..15')],
    [case('{{a}}', [erreur('{{eval:180-a}}', MSG_N5_INV, 'Aigu pris pour obtus')], TOL)],
    STEPS_N5, HINT_N5, ['a!=90'],
)
N5_B = variation(
    CONSIGNE_N5 + '\n\n' + figure_n5('{{t}}') + '\n\n$\\widehat{AOB} \\approx ?' + DEG + '$',
    [var('r', '10..16'), var('a', 'eval:10*r'), var('t', '0..15')],
    [case('{{a}}', [erreur('{{eval:180-a}}', MSG_N5_INV, 'Obtus pris pour aigu')], TOL)],
    STEPS_N5, HINT_N5,
)
N5_C = variation(
    CONSIGNE_N5 + '\n\n' + figure_n5('{{t}}') + '\n\n$\\widehat{AOB} \\approx ?' + DEG + '$',
    [var('r', '2..16'), var('a', 'eval:10*r'), var('t', '20..340')],
    [case('{{a}}', [erreur('{{eval:180-a}}', MSG_N5_INV, 'Aigu et obtus confondus')], TOL)],
    STEPS_N5, HINT_N5, ['a!=90', 'abs(a-90)>=30'],
)

SPECS_N5 = [
    spec('60 exact', 0, {'r': '6', 'a': '60', 't': '5'}, 'correct', ['60']),
    spec('Estimation 55', 0, {'r': '6', 'a': '60', 't': '5'}, 'correct', ['55']),
    spec('Estimation 68', 0, {'r': '6', 'a': '60', 't': '5'}, 'correct', ['68']),
    spec('Trop loin : 45', 0, {'r': '6', 'a': '60', 't': '5'}, 'incorrect', ['45']),
    spec('Aigu pris pour obtus : 120', 0, {'r': '6', 'a': '60', 't': '5'}, 'incorrect', ['120'], MSG_N5_INV),
    spec('130 exact', 1, {'r': '13', 'a': '130', 't': '0'}, 'correct', ['130']),
    spec('Estimation 135', 1, {'r': '13', 'a': '130', 't': '0'}, 'correct', ['135']),
    spec('Obtus pris pour aigu : 50', 1, {'r': '13', 'a': '130', 't': '0'}, 'incorrect', ['50'], MSG_N5_INV),
    spec('Tourné : 150 estimé 145', 2, {'r': '15', 'a': '150', 't': '200'}, 'correct', ['145']),
    spec('Tourné : 30 pris pour 150', 2, {'r': '3', 'a': '30', 't': '100'}, 'incorrect', ['150'], MSG_N5_INV),
]

N5 = modele(
    'Estimer un angle sans rapporteur',
    'Estimer à 10° près la mesure d\'un angle dessiné, sans instrument, en le comparant à l\'angle '
    'droit et à sa moitié ; pièges : angle aigu pris pour obtus (180 − a)',
    3, 45, [N5_A, N5_B, N5_C], SPECS_N5, {'noeud': MESURE, 'point': '6-169'})


ecrire('n1-noms-d-un-meme-angle', N1)
ecrire('n2-calculer-un-angle-figure', N2)
ecrire('n5-estimer-un-angle', N5)
print('3 modèles écrits dans', DOSSIER)
