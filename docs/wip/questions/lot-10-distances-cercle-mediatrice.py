"""Écrit les 8 modèles du lot 10 « Distances, cercle, médiatrice » de la 6e dans
scripts/questions/6-distances-cercle-mediatrice/.

Phase 0 validée par David le 2026-11-02 (§ 24 du journal `docs/wip/questions-6-progress.md`).
Bornes : `cycle3.json`, 6e (6-160 à 6-167 héritent de « general ») ; contenu calqué sur les
exemples de réussite 6e (p. 11-12). Un point par modèle ; le nœud et le tag sont posés par la
migration de rangement, après le `--publier` de David.

Décisions et pièges :
- longueurs écrites (on ne mesure pas à l'écran), figure fidèle : coordonnées calculées depuis les
  variables (`{{eval:…;d}}`) ; aucune construction (le compas reste à la figure à compléter) ;
- 163 sans figure (une figure fidèle donnerait la réponse) ;
- figures à plusieurs cas (161 v3, 165 v1) : une variable `k`, coordonnées par indicatrices de
  Lagrange, objets montrés ou non par `visible={{if:…}}` ;
- bonne réponse d'un choix calculée : toujours par une variable (piège du § 9) ;
- réponses multiples : liste d'indices `0;2` (indices répétés tolérés par le juge, cf. lot 9) ;
- niveaux : catégories neuves (« Figures planes » > « Distances », « Cercles et disques »,
  « Médiatrice d'un segment », titres du BO), niveaux dans l'ordre des points.

    python3 docs/wip/questions/lot-10-distances-cercle-mediatrice.py scripts/questions
"""
import json
import os
import subprocess
import sys

RACINE = sys.argv[1]
DOSSIER = os.path.join(RACINE, '6-distances-cercle-mediatrice')

THEME = 'Géométrie'
DOMAINE = 'Figures planes'


def spec(desc, vi, variables, answers, status):
    return {'description': desc, 'variationIndex': vi,
            'variables': {k: str(v) for k, v in variables.items()},
            'answers': answers if isinstance(answers, list) else [answers],
            'expected': {'status': status}}


def modele(nom, title, description, subdomain, level, variations, specs, delay=60):
    m = {'title': title, 'description': description, 'grades': ['6'], 'theme': THEME,
         'domain': DOMAINE, 'subdomain': subdomain, 'level': level, 'delay': delay,
         'status': 'draft', 'variations': variations, 'testSpecs': specs}
    return nom, m


def var(nom, expression):
    return {'name': nom, 'expression': expression}


def variation(statement, variables, answers, steps, conditions=None):
    v = {'statement': statement, 'variables': variables}
    if conditions:
        v['conditions'] = conditions
    v['blanks'] = [{'expectedAnswer': a} for a in answers]
    v['correction'] = {'steps': steps}
    return v


def col(x, k=0):
    return '\\textcolor{{{color:primary.' + str(k) + '}}}{' + x + '}'


def colt(x):
    """Mot coloré dans une phrase (hors des $…$)."""
    return '$' + col(x) + '$'


def choix(lignes, plusieurs=False, melanger=True):
    tete = ''
    if plusieurs:
        tete += 'plusieurs: oui\n'
    if not melanger:
        tete += 'melanger: non\n'
    return '\n\n```choix\n' + tete + ''.join('- ' + l + '\n' for l in lignes) + '```'


def si(cond, oui, non):
    return '{{if:' + cond + '|' + oui + '|' + non + '}}'


def si3(v, a, b, c):
    """Texte selon v ∈ {1, 2, 3}."""
    return si(v + '==1', a, si(v + '==2', b, c))


def lag(v, valeurs):
    """Expression qui vaut valeurs[i - 1] quand v == i (v ∈ 1..n), par indicatrices de Lagrange."""
    n = len(valeurs)
    termes = []
    for i in range(1, n + 1):
        if valeurs[i - 1] == 0:
            continue
        num = '*'.join('(' + v + '-' + str(j) + ')' for j in range(1, n + 1) if j != i)
        den = 1
        for j in range(1, n + 1):
            if j != i:
                den *= (i - j)
        termes.append('(' + str(valeurs[i - 1]) + ')*' + num + '/(' + str(den) + ')')
    return '+'.join(termes) if termes else '0'


def figure(fenetre, description, lignes, taille=None):
    tete = 'fenetre: ' + fenetre + '\n'
    if taille:
        tete += 'taille: ' + taille + '\n'
    return ('\n\n```figure\n' + tete + 'description: ' + description + '\n---\n'
            + '\n'.join(lignes) + '\n```\n\n')


def cm(x):
    return x + '~\\unit{cm}'


MODELES = []

# --- 1. 6-160 : distance entre deux points ------------------------------------------------------
# v1 : C sur [AB] (AB = AC + CB) ; v2 : C hors de [AB], triangle fidèle aux longueurs (AB dessiné
# à 0,75 de AC + CB) ; v3 : sans figure (elle donnerait la réponse).

FIG_160_1 = figure(
    '-0.8 ; {{eval:(p+q)/10+0.8;d}} ; -1.8 ; 1.8',
    'Un segment [AB] et un point C sur ce segment ; AC = {{eval:p/10;d}} cm et CB = {{eval:q/10;d}} cm.',
    ['A = point(0, 0, etiquette="bas")',
     'C = point({{eval:p/10;d}}, 0, etiquette="bas")',
     'B = point({{eval:(p+q)/10;d}}, 0, etiquette="bas")',
     'segment(A, B)',
     'texte({{eval:p/20;d}}, 0.5, "{{eval:p/10;d}} cm")',
     'texte({{eval:p/10+q/20;d}}, 0.5, "{{eval:q/10;d}} cm")'])

# Triangle ABC : A(0, 0), B(b, 0), C tel que AC = p/10, CB = q/10.
B160 = '0.75*(p+q)/10'
CX160 = '((p/10)^2-(q/10)^2+(' + B160 + ')^2)/(2*' + B160 + ')'
FIG_160_2 = figure(
    '-0.8 ; {{eval:' + B160 + '+0.8;d}} ; -0.8 ; {{eval:max(sqrt((p/10)^2-(' + CX160 + ')^2)+1,(' + B160 + '+1.6)/3-0.8);d}}',
    'Un triangle ABC : AC = {{eval:p/10;d}} cm et CB = {{eval:q/10;d}} cm ; le côté [AB] est en'
    ' pointillés.',
    ['A = point(0, 0, etiquette="bas")',
     'B = point({{eval:' + B160 + ';d}}, 0, etiquette="bas")',
     'C = point({{eval:' + CX160 + ';d}}, {{eval:sqrt((p/10)^2-(' + CX160 + ')^2);d}},'
     ' etiquette="haut")',
     'segment(A, C)', 'segment(C, B)', 'segment(A, B, trait="pointilles")',
     'texte({{eval:(' + CX160 + ')/2-0.5;d}}, {{eval:sqrt((p/10)^2-(' + CX160 + ')^2)/2+0.2;d}},'
     ' "{{eval:p/10;d}} cm")',
     'texte({{eval:(' + CX160 + '+' + B160 + ')/2+0.6;d}}, {{eval:sqrt((p/10)^2-(' + CX160
     + ')^2)/2+0.2;d}}, "{{eval:q/10;d}} cm")'])

MODELES.append(modele(
    '01-distance-entre-deux-points', 'Distance entre deux points',
    'La distance AB est la longueur du segment [AB] : l\'additionner quand C est sur [AB], la'
    ' comparer à AC + CB quand C n\'y est pas, dire si C est sur [AB] d\'après trois longueurs',
    'Distances', 1,
    [variation('Le point $C$ est sur le segment $[AB]$.' + FIG_160_1
               + 'Quelle est la distance $AB$ ?\n\n$AB = ' + cm('?') + '$',
               [var('p', '20..60'), var('q', '20..60')], ['{{eval:(p+q)/10;d}}'],
               ['**$C$ est sur le segment $[AB]$.** Pour aller de $A$ à $B$, on passe par $C$ :'
                ' $AB = AC + CB$.',
                '$AB = {{eval:p/10;d}} + {{eval:q/10;d}} = ' + col(cm('{{eval:(p+q)/10;d}}')) + '$.']),
     variation('Le point $C$ n\'est pas sur le segment $[AB]$.' + FIG_160_2
               + 'Que peut-on dire de la distance $AB$ ?'
               + choix(['$AB$ est plus petite que $' + cm('{{eval:(p+q)/10;d}}') + '$',
                        '$AB$ est égale à $' + cm('{{eval:(p+q)/10;d}}') + '$',
                        '$AB$ est plus grande que $' + cm('{{eval:(p+q)/10;d}}') + '$'],
                       melanger=False),
               [var('p', '25..50'), var('q', '25..50')], ['0'],
               ['**Le plus court chemin.** Le plus court chemin pour aller de $A$ à $B$ est le'
                ' segment $[AB]$. Passer par $C$, hors du segment, est plus long.',
                '$AC + CB = {{eval:p/10;d}} + {{eval:q/10;d}} = ' + cm('{{eval:(p+q)/10;d}}') + '$, donc'
                ' $AB$ est ' + colt('\\text{plus petite que } ' + cm('{{eval:(p+q)/10;d}}')) + '.']),
     variation('On sait que $AB = ' + cm('{{n}}') + '$, $AC = ' + cm('{{a}}') + '$ et $CB = '
               + cm('{{b}}') + '$.\n\nLe point $C$ est-il sur le segment $[AB]$ ?'
               + choix(['oui', 'non'], melanger=False),
               [var('k', '1..2'), var('n', '6..11'), var('a', '2..4'),
                var('b', 'eval:n-a+k-1'), var('j', 'eval:k-1')], ['{{j}}'],
               ['**On additionne.** $AC + CB = {{a}} + {{b}} = ' + cm('{{eval:a+b}}') + '$.',
                si('k==1', '$AC + CB = AB$ : passer par $C$ ne rallonge pas le chemin, $C$ est'
                   ' **sur** le segment $[AB]$ : ' + colt('\\text{oui}') + '.',
                   '$AC + CB$ est plus grand que $AB$ : passer par $C$ rallonge le chemin, $C$'
                   ' n\'est **pas** sur le segment $[AB]$ : ' + colt('\\text{non}') + '.')])],
    [spec('3,2 + 4,5 = 7,7', 0, {'p': 32, 'q': 45}, '7,7', 'correct'),
     spec('Erreur : 1,3 (différence)', 0, {'p': 32, 'q': 45}, '1,3', 'incorrect'),
     spec('Plus petite', 1, {'p': 32, 'q': 45}, '0', 'correct'),
     spec('Erreur : égale (comme si C était sur [AB])', 1, {'p': 32, 'q': 45}, '1', 'incorrect'),
     spec('7 = 3 + 4 : oui', 2, {'k': 1, 'n': 7, 'a': 3, 'b': 4, 'j': 0}, '0', 'correct'),
     spec('3 + 5 > 7 : non', 2, {'k': 2, 'n': 7, 'a': 3, 'b': 5, 'j': 1}, '1', 'correct'),
     spec('Erreur : oui quand AC + CB > AB', 2, {'k': 2, 'n': 7, 'a': 3, 'b': 5, 'j': 1}, '0',
          'incorrect')]))

# --- 2. 6-161 : milieu d'un segment -------------------------------------------------------------

FIG_161_1 = figure(
    '-0.8 ; {{eval:h/5+0.8;d}} ; -1.8 ; 1.8',
    'Un segment [AB] de {{eval:h/5;d}} cm et son milieu I, codé par deux traits égaux.',
    ['A = point(0, 0, etiquette="haut")',
     'I = point({{eval:h/10;d}}, 0, etiquette="haut")',
     'B = point({{eval:h/5;d}}, 0, etiquette="haut")',
     'segment(A, B)', 'marque_segment(A, I)', 'marque_segment(I, B)',
     'texte({{eval:h/10;d}}, -0.7, "AB = {{eval:h/5;d}} cm")'])

FIG_161_2 = figure(
    '-0.8 ; {{eval:a/5+0.8;d}} ; -1.8 ; 1.8',
    'Un segment [AB] et son milieu I, codé par deux traits égaux ; AI = {{eval:a/10;d}} cm.',
    ['A = point(0, 0, etiquette="bas")',
     'I = point({{eval:a/10;d}}, 0, etiquette="bas")',
     'B = point({{eval:a/5;d}}, 0, etiquette="bas")',
     'segment(A, B)', 'marque_segment(A, I)', 'marque_segment(I, B)',
     'texte({{eval:a/20;d}}, 0.5, "{{eval:a/10;d}} cm")'])

# v3 : AB = 8 ; k = 1 : I sur [AB], AI = 3, IB = 5 ; k = 2 : I à égale distance, hors de (AB) ;
# k = 3 : vrai milieu.
FIG_161_3 = figure(
    '-0.8 ; 8.8 ; -1 ; 3.3',
    'Un segment [AB] et un point I, avec ses longueurs ou ses codages.',
    ['A = point(0, 0, etiquette="bas")',
     'B = point(8, 0, etiquette="bas")',
     'I = point({{eval:' + lag('k', [3, 4, 4]) + ';d}}, {{eval:' + lag('k', [0, 2.5, 0])
     + ';d}}, etiquette="haut")',
     'segment(A, B)',
     'segment(A, I, visible=' + si('k==2', 'vrai', 'faux') + ')',
     'segment(I, B, visible=' + si('k==2', 'vrai', 'faux') + ')',
     'marque_segment(A, I, visible=' + si('k==1', 'faux', 'vrai') + ')',
     'marque_segment(I, B, visible=' + si('k==1', 'faux', 'vrai') + ')',
     'texte(1.5, -0.6, "3 cm", visible=' + si('k==1', 'vrai', 'faux') + ')',
     'texte(5.5, -0.6, "5 cm", visible=' + si('k==1', 'vrai', 'faux') + ')'])

MODELES.append(modele(
    '02-milieu-d-un-segment', 'Milieu d\'un segment',
    'Le milieu I de [AB] est le point du segment à égale distance de A et de B : calculer AI ou AB,'
    ' puis dire si un point est le milieu (sur le segment ET à égale distance)',
    'Distances', 2,
    [variation('Le point $I$ est le milieu du segment $[AB]$.' + FIG_161_1
               + 'Quelle est la longueur $AI$ ?\n\n$AI = ' + cm('?') + '$',
               [var('h', '20..60')], ['{{eval:h/10;d}}'],
               ['**Le milieu.** $I$ est sur $[AB]$, à la même distance de $A$ et de $B$ : il coupe'
                ' le segment en deux longueurs égales.',
                '$AI = {{eval:h/5;d}} \\div 2 = ' + col(cm('{{eval:h/10;d}}')) + '$.']),
     variation('Le point $I$ est le milieu du segment $[AB]$.' + FIG_161_2
               + 'Quelle est la longueur $AB$ ?\n\n$AB = ' + cm('?') + '$',
               [var('a', '20..60')], ['{{eval:a/5;d}}'],
               ['**Le milieu.** $I$ est le milieu de $[AB]$ : $IB = AI = ' + cm('{{eval:a/10;d}}')
                + '$.',
                '$AB = AI + IB = {{eval:a/10;d}} + {{eval:a/10;d}} = ' + col(cm('{{eval:a/5;d}}'))
                + '$.']),
     variation('Le point $I$ est-il le milieu du segment $[AB]$ ?' + FIG_161_3
               + choix(['oui',
                        'non : $I$ n\'est pas à la même distance de $A$ et de $B$',
                        'non : $I$ n\'est pas sur le segment $[AB]$'], melanger=False),
               [var('k', '1..3'), var('j', 'eval:' + lag('k', [1, 2, 0]))], ['{{j}}'],
               ['**Le milieu de $[AB]$** est le point **du segment** $[AB]$ qui est à **la même'
                ' distance** de $A$ et de $B$ : il faut les deux.',
                si3('k', '$I$ est sur $[AB]$, mais $AI = ' + cm('3') + '$ et $IB = ' + cm('5')
                    + '$ : ' + colt('\\text{non}') + ', ce n\'est pas le milieu.',
                    '$AI = IB$ (codage), mais $I$ n\'est pas sur le segment $[AB]$ : '
                    + colt('\\text{non}') + ', ce n\'est pas le milieu.',
                    '$I$ est sur $[AB]$ et $AI = IB$ (codage) : ' + colt('\\text{oui}')
                    + ', c\'est le milieu.')])],
    [spec('AB = 9 : AI = 4,5', 0, {'h': 45}, '4,5', 'correct'),
     spec('Erreur : 9 (AB recopié)', 0, {'h': 45}, '9', 'incorrect'),
     spec('Erreur : 18 (doublé)', 0, {'h': 45}, '18', 'incorrect'),
     spec('AI = 3,7 : AB = 7,4', 1, {'a': 37}, '7,4', 'correct'),
     spec('Erreur : 1,85 (divisé)', 1, {'a': 37}, '1,85', 'incorrect'),
     spec('Sur le segment, pas à égale distance', 2, {'k': 1, 'j': 1}, '1', 'correct'),
     spec('Erreur : oui pour I hors de [AB]', 2, {'k': 2, 'j': 2}, '0', 'incorrect'),
     spec('Hors du segment', 2, {'k': 2, 'j': 2}, '2', 'correct'),
     spec('Vrai milieu', 2, {'k': 3, 'j': 0}, '0', 'correct')]))

# --- 3. 6-162 : cercle, disque, rayon, diamètre, corde -----------------------------------------
# Cercle de centre O, rayon 3 : rayon [OA], diamètre [BC], corde [DE].

FIG_162_1 = figure(
    '-4 ; 4 ; -3.8 ; 3.8',
    'Un cercle de centre O ; trois segments tracés : [OA], [BC] qui passe par O, et [DE].',
    ['O = point(0, 0, etiquette="bas-droite")',
     'cercle(O, rayon=3)',
     'A = point(2.6, 1.5, etiquette="haut-droite")',
     'B = point(-2.12, 2.12, etiquette="haut-gauche")',
     'C = point(2.12, -2.12, etiquette="bas-droite")',
     'D = point(-2.82, -1.03, etiquette="gauche")',
     'E = point(0.52, -2.95, etiquette="bas")',
     'segment(O, A, couleur="bleu")', 'segment(B, C, couleur="bleu")',
     'segment(D, E, couleur="bleu")'])

FIG_162_3 = figure(
    '-3 ; 3 ; -2.8 ; 2.8',
    'Une figure bleue : ' + si('k==1', 'un cercle (la ligne seule)', 'un disque (la surface coloriée'
                                                                    ' et son bord)') + '.',
    ['O = point(0, 0, etiquette="bas-droite")',
     'cercle(O, rayon=2.2, couleur="bleu", epaisseur=2, remplissage="bleu", opacite_fond='
     + si('k==1', '0', '0.45') + ')'])

MODELES.append(modele(
    '03-cercle-disque-rayon-diametre-corde', 'Cercle, disque, rayon, diamètre, corde',
    'Reconnaître un rayon, un diamètre, une corde ; passer du rayon au diamètre ; distinguer un'
    ' cercle d\'un disque ; savoir que le diamètre est la plus longue corde',
    'Cercles et disques', 1,
    [variation('Voici un cercle de centre $O$.' + FIG_162_1 + 'Que représente le segment '
               + si3('k', '$[OA]$', '$[BC]$', '$[DE]$') + ' pour ce cercle ?'
               + choix(['un rayon', 'un diamètre', 'une corde'], melanger=False),
               [var('k', '1..3'), var('j', 'eval:k-1')], ['{{j}}'],
               [si3('k', '**Un rayon** joint le centre $O$ à un point du cercle : $[OA]$ est '
                    + colt('\\text{un rayon}') + '.',
                    '**Un diamètre** joint deux points du cercle en passant par le centre $O$ :'
                    ' $[BC]$ est ' + colt('\\text{un diamètre}') + '.',
                    '**Une corde** joint deux points du cercle ; elle ne passe pas forcément par'
                    ' le centre : $[DE]$ est ' + colt('\\text{une corde}') + '.')]),
     variation(si('k==1', 'Le rayon d\'un cercle mesure $' + cm('{{eval:r/10;d}}') + '$. Quel est son'
                  ' diamètre ?\n\nDiamètre : $' + cm('?') + '$',
                  'Le diamètre d\'un cercle mesure $' + cm('{{eval:r/5;d}}') + '$. Quel est son'
                  ' rayon ?\n\nRayon : $' + cm('?') + '$'),
               [var('k', '1..2'), var('r', '15..60')], ['{{eval:(3-k)*r/10;d}}'],
               ['**Le diamètre est le double du rayon** (il traverse le cercle en passant par le'
                ' centre : deux rayons bout à bout).',
                si('k==1', '$2 \\times {{eval:r/10;d}} = ' + col(cm('{{eval:r/5;d}}')) + '$.',
                   '$' + '{{eval:r/5;d}} \\div 2 = ' + col(cm('{{eval:r/10;d}}')) + '$.')]),
     variation('La figure bleue est-elle un cercle ou un disque ?' + FIG_162_3
               + choix(['un cercle', 'un disque'], melanger=False),
               [var('k', '1..2'), var('j', 'eval:k-1')], ['{{j}}'],
               ['**Le cercle** est la ligne : les points à la même distance du centre. **Le'
                ' disque** est la surface : le cercle et tout l\'intérieur.',
                si('k==1', 'Seule la ligne est tracée : c\'est ' + colt('\\text{un cercle}') + '.',
                   'La surface est coloriée : c\'est ' + colt('\\text{un disque}') + '.')]),
     variation('Dans un cercle de rayon $' + cm('{{r}}') + '$, une corde peut-elle mesurer $'
               + cm('{{c}}') + '$ ?' + choix(['oui', 'non'], melanger=False),
               [var('k', '1..2'), var('r', '3..6'), var('c', 'eval:2*r+2*k-3'),
                var('j', 'eval:k-1')], ['{{j}}'],
               ['**La plus longue corde est le diamètre** : $2 \\times {{r}} = '
                + cm('{{eval:2*r}}') + '$. Toutes les cordes mesurent au plus $'
                + cm('{{eval:2*r}}') + '$.',
                si('k==1', '$' + cm('{{c}}') + '$, c\'est moins que le diamètre : '
                   + colt('\\text{oui}') + '.',
                   '$' + cm('{{c}}') + '$, c\'est plus que le diamètre : ' + colt('\\text{non}')
                   + '.')])],
    [spec('[OA] : rayon', 0, {'k': 1, 'j': 0}, '0', 'correct'),
     spec('[BC] : diamètre', 0, {'k': 2, 'j': 1}, '1', 'correct'),
     spec('Erreur : [DE] pris pour un diamètre', 0, {'k': 3, 'j': 2}, '1', 'incorrect'),
     spec('[DE] : corde', 0, {'k': 3, 'j': 2}, '2', 'correct'),
     spec('Rayon 3,5 : diamètre 7', 1, {'k': 1, 'r': 35}, '7', 'correct'),
     spec('Erreur : 1,75 (divisé au lieu de doublé)', 1, {'k': 1, 'r': 35}, '1,75', 'incorrect'),
     spec('Diamètre 7 : rayon 3,5', 1, {'k': 2, 'r': 35}, '3,5', 'correct'),
     spec('Erreur : 14 (doublé au lieu de divisé)', 1, {'k': 2, 'r': 35}, '14', 'incorrect'),
     spec('Ligne seule : cercle', 2, {'k': 1, 'j': 0}, '0', 'correct'),
     spec('Surface : disque', 2, {'k': 2, 'j': 1}, '1', 'correct'),
     spec('Erreur : cercle pour la surface', 2, {'k': 2, 'j': 1}, '0', 'incorrect'),
     spec('Rayon 4, corde 7 : oui', 3, {'k': 1, 'r': 4, 'c': 7, 'j': 0}, '0', 'correct'),
     spec('Rayon 4, corde 9 : non', 3, {'k': 2, 'r': 4, 'c': 9, 'j': 1}, '1', 'correct'),
     spec('Erreur : oui pour 9 (plus long que le diamètre)', 3, {'k': 2, 'r': 4, 'c': 9, 'j': 1}, '0',
          'incorrect')]))

# --- 4. 6-163 : cercle et disque comme ensembles de points (sans figure) ------------------------
# Quatre points A, B, C, D ; OX = r + écart, écarts selon k : 0, −x (dans le disque), +y (dehors).

ECARTS = {  # lettre → écart pour k = 1, 2, 3 (0 = sur le cercle, 'x' = dedans, 'y' = dehors)
    'A': ['0', '-x', '0'],
    'B': ['-x', '0', 'y'],
    'C': ['0', 'y', '-x'],
    'D': ['y', '0', '0'],
}


def distance_163(lettre):
    termes = []
    for i, ec in enumerate(ECARTS[lettre], start=1):
        if ec == '0':
            continue
        autres = [j for j in (1, 2, 3) if j != i]
        num = '*'.join('(k-' + str(j) + ')' for j in autres)
        den = (i - autres[0]) * (i - autres[1])
        termes.append('(' + ec + ')/10*' + num + '/(' + str(den) + ')')
    return 'eval:r+' + '+'.join(termes)


DONNEES_163 = ('Le cercle $\\mathcal{C}$ a pour centre $O$ et pour rayon $' + cm('{{r}}')
               + '$. On connaît les distances de quatre points au centre $O$ :\n\n$OA = '
               + cm('{{eval:dA;d}}') + '$ ; $OB = ' + cm('{{eval:dB;d}}') + '$ ; $OC = ' + cm('{{eval:dC;d}}')
               + '$ ; $OD = ' + cm('{{eval:dD;d}}') + '$.\n\n')
VARS_163 = ([var('k', '1..3'), var('r', '2..5'), var('x', '3..9'), var('y', '3..9')]
            + [var('d' + l, distance_163(l)) for l in 'ABCD'])
POINTS = ['$A$', '$B$', '$C$', '$D$']


def lecture_163(dans_disque):
    morceaux = []
    for l in 'ABCD':
        sur = si('d' + l + '==r', ' : sur le cercle', si('d' + l + '<r', ' : à l\'intérieur',
                                                         ' : à l\'extérieur'))
        morceaux.append('$O' + l + ' = {{eval:d' + l + ';d}}$' + sur)
    return ' ; '.join(morceaux) + '.'


EX_163 = {'k': 1, 'r': 3, 'x': 6, 'y': 5, 'dA': 3, 'dB': 2.4, 'dC': 3, 'dD': 3.5}

MODELES.append(modele(
    '04-cercle-et-disque-ensembles-de-points', 'Cercle et disque : des ensembles de points',
    'Interpréter des égalités et inégalités de distances au centre : quels points sont sur le'
    ' cercle (à la distance du rayon), lesquels appartiennent au disque (à au plus cette distance)',
    'Cercles et disques', 2,
    [variation(DONNEES_163 + 'Quels points sont **sur le cercle** $\\mathcal{C}$ ?'
               + choix(POINTS, plusieurs=True, melanger=False),
               VARS_163, [si3('k', '0;2', '1;3', '0;3')],
               ['**Le cercle** de centre $O$ et de rayon $' + cm('{{r}}') + '$ est l\'ensemble des'
                ' points situés **exactement** à $' + cm('{{r}}') + '$ de $O$.',
                lecture_163(False),
                'Sur le cercle : ' + colt(si3('k', 'A \\text{ et } C', 'B \\text{ et } D',
                                             'A \\text{ et } D')) + '.']),
     variation(DONNEES_163 + 'Quels points appartiennent au **disque** de centre $O$ et de rayon $'
               + cm('{{r}}') + '$ ?' + choix(POINTS, plusieurs=True, melanger=False),
               VARS_163, [si3('k', '0;1;2', '0;1;3', '0;2;3')],
               ['**Le disque** de centre $O$ et de rayon $' + cm('{{r}}') + '$ est l\'ensemble des'
                ' points situés à **au plus** $' + cm('{{r}}') + '$ de $O$ : le cercle compris.',
                lecture_163(True),
                'Dans le disque : ' + colt(si3('k', 'A, B \\text{ et } C', 'A, B \\text{ et } D',
                                              'A, C \\text{ et } D')) + '.']),
     variation('Le cercle $\\mathcal{C}$ a pour centre $O$ et pour rayon $' + cm('{{r}}')
               + '$. Un point $M$ est tel que $OM = ' + cm('{{eval:dM;d}}') + '$.\n\nOù est le point $M$ ?'
               + choix(['sur le cercle $\\mathcal{C}$',
                        'à l\'intérieur du disque, pas sur le cercle',
                        'hors du disque'], melanger=False),
               [var('k', '1..3'), var('r', '2..5'), var('u', '2..8'),
                var('dM', 'eval:r+u/10*' + lag('k', [0, -1, 1])),
                var('j', 'eval:k-1')], ['{{j}}'],
               ['On compare $OM = ' + cm('{{eval:dM;d}}') + '$ au rayon $' + cm('{{r}}') + '$.',
                si3('k', '$OM$ est égal au rayon : $M$ est ' + colt('\\text{sur le cercle}') + '.',
                    '$OM$ est plus petit que le rayon : $M$ n\'est pas sur le cercle, il est '
                    + colt('\\text{à l\'intérieur du disque}') + '.',
                    '$OM$ est plus grand que le rayon : $M$ n\'est ni sur le cercle ni dans le'
                    ' disque, il est ' + colt('\\text{hors du disque}') + '.')])],
    [spec('Sur le cercle : A et C', 0, EX_163, '0;2', 'correct'),
     spec('Erreur : A, B, C (disque au lieu du cercle)', 0, EX_163, '0;1;2', 'incorrect'),
     spec('Disque : A, B, C', 1, EX_163, '0;1;2', 'correct'),
     spec('Incomplet : B seul (le cercle oublié)', 1, EX_163, '1', 'unoptimal_form'),
     spec('Incomplet : A et C (le dedans oublié)', 1, EX_163, '0;2', 'unoptimal_form'),
     spec('OM = r : sur le cercle', 2, {'k': 1, 'r': 3, 'u': 4, 'dM': 3, 'j': 0}, '0', 'correct'),
     spec('OM < r : dedans', 2, {'k': 2, 'r': 3, 'u': 4, 'dM': 2.6, 'j': 1}, '1', 'correct'),
     spec('OM > r : dehors', 2, {'k': 3, 'r': 3, 'u': 4, 'dM': 3.4, 'j': 2}, '2', 'correct'),
     spec('Erreur : dedans pour OM > r', 2, {'k': 3, 'r': 3, 'u': 4, 'dM': 3.4, 'j': 2}, '1',
          'incorrect')]))

# --- 5. 6-164 : problèmes de distances à un point ----------------------------------------------

MAISONS = ['la maison A', 'la maison B', 'la maison C', 'la maison D']
TABLEAU_164 = ('| Maison | Distance à la gare (km) | Distance à l\'usine (km) |\n|---|---|---|\n'
               + ''.join('| ' + l + ' | ${{eval:g' + str(i) + '/10;d}}$ | ${{eval:u' + str(i)
                         + '/10;d}}$ |\n' for i, l in enumerate('ABCD', start=1)))


def ok_164(i):
    return 'g' + str(i) + '<30 && u' + str(i) + '>20'


VARS_164 = ([var('g1', '10..28'), var('u1', '22..60')]
            + [var(c + str(i), '5..60') for i in (2, 3, 4) for c in ('g', 'u')])
COND_164 = (['g' + str(i) + '!=30' for i in (2, 3, 4)] + ['u' + str(i) + '!=20' for i in (2, 3, 4)]
            + ['!(' + ok_164(2) + ') || !(' + ok_164(3) + ') || !(' + ok_164(4) + ')',
               '(' + ok_164(2) + ') || (' + ok_164(3) + ') || (' + ok_164(4) + ')'])
EX_164 = {'g1': 25, 'u1': 40, 'g2': 35, 'u2': 30, 'g3': 12, 'u3': 15, 'g4': 20, 'u4': 50}

FIG_164_3 = figure(
    '-1.2 ; {{eval:n+1.2;d}} ; -1.8 ; 1.8',
    'Deux points A et B, à {{n}} cm l\'un de l\'autre.',
    ['A = point(0, 0, etiquette="bas")', 'B = point({{n}}, 0, etiquette="bas")',
     'segment(A, B)', 'texte({{eval:n/2;d}}, 0.5, "{{n}} cm")'])

MODELES.append(modele(
    '05-problemes-de-distances-a-un-point', 'Problèmes de distances à un point',
    'Les points à au plus L d\'un point forment un disque : la chèvre attachée par une corde, les'
    ' maisons à moins de 3 km de la gare et à plus de 2 km de l\'usine, les points à des distances'
    ' données de deux points',
    'Cercles et disques', 3,
    [variation('Une chèvre est attachée au piquet $P$ par une corde de ${{L}}~\\unit{m}$.'
               ' Une touffe d\'herbe pousse à ${{d}}~\\unit{m}$ du piquet.\n\nLa'
               ' chèvre peut-elle la brouter ?' + choix(['oui', 'non'], melanger=False),
               [var('k', '1..3'), var('L', '5..10'), var('w', '1..3'),
                var('d', 'eval:L+w*(k-2)'), var('j', 'eval:' + lag('k', [0, 0, 1]))], ['{{j}}'],
               ['**La zone de la chèvre.** Corde tendue, la chèvre va jusqu\'à ${{L}}~\\unit{m}$'
                ' de $P$ : elle broute tout le **disque** de centre $P$ et de rayon'
                ' ${{L}}~\\unit{m}$, son bord compris.',
                si3('k', '${{d}}~\\unit{m}$, c\'est moins que ${{L}}~\\unit{m}$ : la touffe est'
                    ' dans le disque, ' + colt('\\text{oui}') + '.',
                    '${{d}}~\\unit{m}$, c\'est juste la longueur de la corde : la touffe est sur'
                    ' le bord du disque, ' + colt('\\text{oui}') + ' (corde tendue).',
                    '${{d}}~\\unit{m}$, c\'est plus que ${{L}}~\\unit{m}$ : la touffe est hors du'
                    ' disque, ' + colt('\\text{non}') + '.')]),
     variation('Une famille cherche une maison à **moins de $3~\\unit{km}$ de la gare** et à'
               ' **plus de $2~\\unit{km}$ de l\'usine**.\n\n' + TABLEAU_164
               + '\nQuelles maisons conviennent ?' + choix(MAISONS, plusieurs=True,
                                                           melanger=False),
               VARS_164,
               ['0;' + ';'.join(si(ok_164(i), str(i - 1), '0') for i in (2, 3, 4))],
               ['**Les deux conditions.** Distance à la gare plus petite que $3$ **et** distance'
                ' à l\'usine plus grande que $2$ : dans le disque de centre la gare, hors du'
                ' disque de centre l\'usine.',
                ' ; '.join('L' + m[1:] + ' : ' + si(ok_164(i), 'oui', 'non')
                           for i, m in enumerate(MAISONS, start=1)) + '.'],
               COND_164),
     variation('Les points $A$ et $B$ sont à $' + cm('{{n}}') + '$ l\'un de l\'autre.'
               + FIG_164_3 + 'Combien de points sont à la fois à $' + cm('{{a}}') + '$ de $A$ et'
               ' à $' + cm('{{b}}') + '$ de $B$ ?\n\n$?$',
               [var('k', '1..3'), var('n', '7..11'),
                var('a', 'eval:n-(' + lag('k', [2, 3, 5]) + ')'),
                var('b', 'eval:' + lag('k', [4, 3, 2])), var('nb', 'eval:3-k')], ['{{nb}}'],
               ['**Deux cercles.** Les points à $' + cm('{{a}}') + '$ de $A$ forment le cercle de'
                ' centre $A$ et de rayon $' + cm('{{a}}') + '$ ; ceux à $' + cm('{{b}}')
                + '$ de $B$, le cercle de centre $B$ et de rayon $' + cm('{{b}}') + '$.',
                '$' + '{{a}} + {{b}} = {{eval:a+b}}$ et $AB = {{n}}$ : '
                + si3('k', 'les deux rayons dépassent $AB$, les cercles se coupent en $'
                      + col('2') + '$ points.',
                      'les deux rayons font juste $AB$, les cercles se touchent en $' + col('1')
                      + '$ point, sur le segment $[AB]$.',
                      'les deux rayons ne suffisent pas à couvrir $AB$, les cercles ne se'
                      ' touchent pas : $' + col('0') + '$ point.')])],
    [spec('Corde 8, touffe à 7 : oui', 0, {'k': 1, 'L': 8, 'w': 1, 'd': 7, 'j': 0}, '0',
          'correct'),
     spec('Corde 8, touffe à 8 : oui', 0, {'k': 2, 'L': 8, 'w': 1, 'd': 8, 'j': 0}, '0',
          'correct'),
     spec('Erreur : non au bout de la corde', 0, {'k': 2, 'L': 8, 'w': 1, 'd': 8, 'j': 0}, '1',
          'incorrect'),
     spec('Corde 8, touffe à 9 : non', 0, {'k': 3, 'L': 8, 'w': 1, 'd': 9, 'j': 1}, '1',
          'correct'),
     spec('Maisons A et D', 1, EX_164, '0;3', 'correct'),
     spec('Erreur : B en plus (trop loin de la gare)', 1, EX_164, '0;1;3', 'incorrect'),
     spec('Erreur : une condition seulement (gare)', 1, EX_164, '0;2;3', 'incorrect'),
     spec('AB = 8, 6 et 4 : 2 points', 2, {'k': 1, 'n': 8, 'a': 6, 'b': 4, 'nb': 2}, '2',
          'correct'),
     spec('Erreur : 1 point (sur le segment)', 2, {'k': 1, 'n': 8, 'a': 6, 'b': 4, 'nb': 2}, '1',
          'incorrect'),
     spec('AB = 8, 5 et 3 : 1 point', 2, {'k': 2, 'n': 8, 'a': 5, 'b': 3, 'nb': 1}, '1',
          'correct'),
     spec('AB = 8, 3 et 2 : 0 point', 2, {'k': 3, 'n': 8, 'a': 3, 'b': 2, 'nb': 0}, '0',
          'correct')],
    delay=90))

# --- 6. 6-165 : définition de la médiatrice ----------------------------------------------------
# [AB] de 6 cm ; d passe par H : k = 1 perpendiculaire en H (AH = 2), k = 2 par le milieu sans angle
# droit, k = 3 médiatrice.

FIG_165_1 = figure(
    '-0.8 ; 6.8 ; -2.6 ; 2.8',
    'Un segment [AB] et une droite d qui le coupe en H, avec ses codages.',
    ['A = point(0, 0, etiquette="bas-gauche")', 'B = point(6, 0, etiquette="bas-droite")',
     'H = point({{eval:' + lag('k', [2, 3, 3]) + ';d}}, 0, etiquette="bas-droite")',
     'K = point({{eval:' + lag('k', [2, 4.2, 3]) + ';d}}, 2, visible=faux)',
     'L = point({{eval:' + lag('k', [2, 1.8, 3]) + ';d}}, -2, visible=faux)',
     'segment(A, B)',
     'd = droite(K, L, couleur="bleu")',
     'texte({{eval:' + lag('k', [2.25, 4.5, 3.25]) + ';d}}, 2.4, "d")',
     'angle(B, H, K, marque="carre", visible=' + si('k==2', 'faux', 'vrai') + ')',
     'marque_segment(A, H, visible=' + si('k==1', 'faux', 'vrai') + ')',
     'marque_segment(H, B, visible=' + si('k==1', 'faux', 'vrai') + ')',
     'texte(1, -0.6, "2 cm", visible=' + si('k==1', 'vrai', 'faux') + ')',
     'texte(4, -0.6, "4 cm", visible=' + si('k==1', 'vrai', 'faux') + ')'])

MODELES.append(modele(
    '06-definition-de-la-mediatrice', 'Définition de la médiatrice d\'un segment',
    'La médiatrice d\'un segment est la droite perpendiculaire au segment qui passe par son milieu :'
    ' la reconnaître sur une figure codée, choisir sa définition',
    'Médiatrice d\'un segment', 1,
    [variation('La droite $d$ est-elle la médiatrice du segment $[AB]$ ?' + FIG_165_1
               + choix(['oui', 'non : $d$ n\'est pas perpendiculaire à $[AB]$',
                        'non : $d$ ne passe pas par le milieu de $[AB]$'], melanger=False),
               [var('k', '1..3'), var('j', 'eval:3-k')], ['{{j}}'],
               ['**La médiatrice** de $[AB]$ est la droite **perpendiculaire** à $[AB]$ qui passe'
                ' par son **milieu** : il faut les deux.',
                si3('k', '$d$ est perpendiculaire à $[AB]$ (angle droit), mais $AH = ' + cm('2')
                    + '$ et $HB = ' + cm('4') + '$ : $H$ n\'est pas le milieu, '
                    + colt('\\text{non}') + '.',
                    '$d$ passe par le milieu $H$ (codage), mais aucun angle droit : '
                    + colt('\\text{non}') + '.',
                    '$d$ passe par le milieu $H$ (codage) et coupe $[AB]$ à angle droit : '
                    + colt('\\text{oui}') + '.')]),
     variation('Qu\'est-ce que la médiatrice d\'un segment ?'
               + choix(['la droite perpendiculaire au segment qui passe par son milieu',
                        'la droite qui passe par le milieu du segment',
                        'la droite perpendiculaire au segment',
                        'la droite parallèle au segment qui passe par son milieu']),
               [], ['0'],
               ['**La médiatrice** d\'un segment est la droite **perpendiculaire** au segment qui'
                ' passe par son **milieu**.',
                'Une droite qui passe par le milieu sans être perpendiculaire, ou perpendiculaire'
                ' ailleurs qu\'au milieu, n\'est pas la médiatrice.'])],
    [spec('Perpendiculaire hors du milieu', 0, {'k': 1, 'j': 2}, '2', 'correct'),
     spec('Erreur : oui (angle droit seul)', 0, {'k': 1, 'j': 2}, '0', 'incorrect'),
     spec('Milieu sans angle droit', 0, {'k': 2, 'j': 1}, '1', 'correct'),
     spec('Erreur : oui (milieu seul)', 0, {'k': 2, 'j': 1}, '0', 'incorrect'),
     spec('Médiatrice', 0, {'k': 3, 'j': 0}, '0', 'correct'),
     spec('Définition', 1, {}, '0', 'correct'),
     spec('Erreur : par le milieu seulement', 1, {}, '1', 'incorrect')]))

# --- 7. 6-166 : propriété caractéristique de la médiatrice -------------------------------------
# v1 : A(−3, 0), B(3, 0), M(0, y) avec MA = a/10.

Y166 = 'sqrt((a/10)^2-9)'
FIG_166_1 = figure(
    '-3.8 ; 3.8 ; -1.4 ; {{eval:' + Y166 + '+1;d}}',
    'Un segment [AB], sa médiatrice d (codée) et un point M de d ; MA = {{eval:a/10;d}} cm.',
    ['A = point(-3, 0, etiquette="bas-gauche")', 'B = point(3, 0, etiquette="bas-droite")',
     'I = point(0, 0, visible=faux)',
     'M = point(0, {{eval:' + Y166 + ';d}}, etiquette="droite")',
     'segment(A, B)', 'd = mediatrice(A, B, couleur="bleu")',
     'texte(0.3, -1, "d")',
     'marque_segment(A, I)', 'marque_segment(I, B)', 'angle(B, I, M, marque="carre")',
     'segment(M, A, trait="tirets")', 'segment(M, B, trait="tirets")',
     'texte({{eval:-1.5-0.9;d}}, {{eval:' + Y166 + '/2;d}}, "{{eval:a/10;d}} cm")'])

ECARTS_166 = {'E': ['0', 'w', '0'], 'F': ['w', '0', '-w'], 'G': ['0', '-w', 'w'],
              'H': ['-w', '0', '0']}


def ecart_166(l):
    termes = []
    for i, ec in enumerate(ECARTS_166[l], start=1):
        if ec == '0':
            continue
        autres = [j for j in (1, 2, 3) if j != i]
        num = '*'.join('(k-' + str(j) + ')' for j in autres)
        den = (i - autres[0]) * (i - autres[1])
        termes.append('(' + ec + ')*' + num + '/(' + str(den) + ')')
    return 'eval:(p' + l + '+' + '+'.join(termes) + ')/10'


TABLEAU_166 = ('| Point | Distance à $A$ (cm) | Distance à $B$ (cm) |\n|---|---|---|\n'
               + ''.join('| $' + l + '$ | ${{eval:p' + l + '/10;d}}$ | ${{eval:q' + l + ';d}}$ |\n'
                         for l in 'EFGH'))
VARS_166_3 = ([var('k', '1..3'), var('w', '2..9')] + [var('p' + l, '20..60') for l in 'EFGH']
              + [var('q' + l, ecart_166(l)) for l in 'EFGH'])
EX_166_3 = {'k': 1, 'w': 5, 'pE': 34, 'pF': 41, 'pG': 28, 'pH': 50, 'qE': 3.4, 'qF': 4.6,
            'qG': 2.8, 'qH': 4.5}

MODELES.append(modele(
    '07-propriete-de-la-mediatrice', 'Propriété caractéristique de la médiatrice',
    'La médiatrice d\'un segment est l\'ensemble des points à égale distance de ses extrémités :'
    ' trouver MB quand M est sur la médiatrice, dire si un point y est d\'après MA et MB',
    'Médiatrice d\'un segment', 2,
    [variation('La droite $d$ est la médiatrice du segment $[AB]$, et le point $M$ est sur $d$.'
               + FIG_166_1 + 'Quelle est la longueur $MB$ ?\n\n$MB = ' + cm('?') + '$',
               [var('a', '35..70')], ['{{eval:a/10;d}}'],
               ['**La propriété de la médiatrice.** Tout point de la médiatrice de $[AB]$ est à la'
                ' même distance de $A$ et de $B$.',
                '$M$ est sur $d$ : $MB = MA = ' + col(cm('{{eval:a/10;d}}')) + '$.']),
     variation('Le point $M$ est tel que $MA = ' + cm('{{eval:a/10;d}}') + '$ et $MB = '
               + cm('{{eval:b/10;d}}') + '$.\n\n$M$ est-il sur la médiatrice du segment $[AB]$ ?'
               + choix(['oui', 'non : $M$ est plus près de $A$', 'non : $M$ est plus près de $B$'],
                       melanger=False),
               [var('k', '1..3'), var('a', '30..60'), var('w', '3..15'),
                var('b', 'eval:a+w*(' + lag('k', [0, 1, -1]) + ')'), var('j', 'eval:k-1')],
               ['{{j}}'],
               ['**La médiatrice** de $[AB]$ est l\'ensemble des points **à égale distance** de $A$'
                ' et de $B$.',
                si3('k', '$MA = MB$ : $M$ est ' + colt('\\text{sur la médiatrice}') + '.',
                    '$MA < MB$ : $M$ n\'est pas sur la médiatrice, il est '
                    + colt('\\text{plus près de } A') + '.',
                    '$MA > MB$ : $M$ n\'est pas sur la médiatrice, il est '
                    + colt('\\text{plus près de } B') + '.')]),
     variation('Voici les distances de quatre points aux extrémités du segment $[AB]$.\n\n'
               + TABLEAU_166 + '\nQuels points sont sur la médiatrice de $[AB]$ ?'
               + choix(['$E$', '$F$', '$G$', '$H$'], plusieurs=True, melanger=False),
               VARS_166_3, [si3('k', '0;2', '1;3', '0;3')],
               ['**La médiatrice** de $[AB]$ est l\'ensemble des points **à égale distance** de $A$'
                ' et de $B$ : on cherche les lignes où les deux distances sont égales.',
                'Sur la médiatrice : ' + colt(si3('k', 'E \\text{ et } G', 'F \\text{ et } H',
                                                 'E \\text{ et } H')) + '.'])],
    [spec('MA = 4,2 : MB = 4,2', 0, {'a': 42}, '4,2', 'correct'),
     spec('Erreur : 8,4 (doublé)', 0, {'a': 42}, '8,4', 'incorrect'),
     spec('MA = MB : oui', 1, {'k': 1, 'a': 40, 'w': 5, 'b': 40, 'j': 0}, '0', 'correct'),
     spec('MA < MB : plus près de A', 1, {'k': 2, 'a': 40, 'w': 5, 'b': 45, 'j': 1}, '1',
          'correct'),
     spec('Erreur : plus près de B quand MA < MB', 1, {'k': 2, 'a': 40, 'w': 5, 'b': 45, 'j': 1},
          '2', 'incorrect'),
     spec('MA > MB : plus près de B', 1, {'k': 3, 'a': 40, 'w': 5, 'b': 35, 'j': 2}, '2',
          'correct'),
     spec('E et G', 2, EX_166_3, '0;2', 'correct'),
     spec('Erreur : tous', 2, EX_166_3, '0;1;2;3', 'incorrect')]))

# --- 8. 6-167 : problèmes avec la médiatrice ---------------------------------------------------

FIG_167_1 = figure(
    '-3.8 ; 3.8 ; -3.6 ; 3.6',
    'Un cercle de centre O et une corde [AB] qui ne passe pas par O.',
    ['O = point(0, 0, etiquette="haut")', 'cercle(O, rayon=3)',
     'A = point(-2.82, -1.03, etiquette="gauche")', 'B = point(2.3, -1.93, etiquette="droite")',
     'segment(A, B, couleur="bleu")',
     'segment(O, A, trait="tirets")', 'segment(O, B, trait="tirets")'])

# Puits : A(1, 4), B(5, 2) ; médiatrice de [AB] : par (3, 3), direction (1, 2) ; elle coupe la
# route (y = 0) en (1,5 ; 0). Deux leurres sur la route : (4 ; 0) et (5,8 ; 0).
LETTRES = ['P', 'Q', 'R']


def lettre_167(pos):
    # pos 0 = le bon point ; la lettre tourne avec k.
    return si3('k', LETTRES[pos], LETTRES[(pos + 1) % 3], LETTRES[(pos + 2) % 3])


FIG_167_3 = figure(
    '-1 ; 7 ; -1.2 ; 5.2',
    'Deux maisons A et B, une route droite en bas, la médiatrice de [AB] en tirets, et trois points'
    ' P, Q, R sur la route.',
    ['A = point(1, 4, etiquette="haut")', 'B = point(5, 2, etiquette="droite")',
     'segment(A, B, trait="pointilles")',
     'mediatrice(A, B, couleur="bleu", trait="tirets")',
     'G = point(-1, 0, visible=faux)', 'D = point(7, 0, visible=faux)',
     'droite(G, D, couleur="gris", epaisseur=3)', 'texte(6.5, 0.4, "route")',
     'X1 = point(1.5, 0, etiquette="aucune")', 'X2 = point(4, 0, etiquette="aucune")',
     'X3 = point(5.8, 0, etiquette="aucune")',
     'texte(1.5, -0.6, "' + lettre_167(0) + '")', 'texte(4, -0.6, "' + lettre_167(1) + '")',
     'texte(5.8, -0.6, "' + lettre_167(2) + '")'])

MODELES.append(modele(
    '08-problemes-avec-la-mediatrice', 'Problèmes avec la médiatrice',
    'S\'appuyer sur la propriété de la médiatrice : le centre d\'un cercle est sur la médiatrice de'
    ' chaque corde, le centre d\'un cercle passant par A et B est sur la médiatrice de [AB], un'
    ' point à égale distance de deux maisons',
    'Médiatrice d\'un segment', 3,
    [variation('Voici un cercle de centre $O$ et une corde $[AB]$.' + FIG_167_1
               + 'Pourquoi le centre $O$ est-il sur la médiatrice de la corde $[AB]$ ?'
               + choix(['parce que $OA = OB$ : ce sont deux rayons du cercle',
                        'parce que $O$ est le milieu de $[AB]$',
                        'parce que $[AB]$ est un diamètre du cercle',
                        'parce que $(OA)$ est perpendiculaire à $(AB)$']),
               [], ['0'],
               ['**La propriété de la médiatrice.** Un point à égale distance de $A$ et de $B$ est'
                ' sur la médiatrice de $[AB]$.',
                '$A$ et $B$ sont sur le cercle : $OA$ et $OB$ sont deux rayons, donc $OA = OB$. Le'
                ' centre $O$ est sur la médiatrice ' + colt('\\text{parce que } OA = OB') + '.']),
     variation('Un cercle passe par les points $A$ et $B$. Où se trouve forcément son centre ?'
               + choix(['sur la médiatrice de $[AB]$', 'au milieu de $[AB]$',
                        'sur le segment $[AB]$', 'sur la droite $(AB)$']),
               [], ['0'],
               ['**Le centre** $O$ est à la même distance de $A$ et de $B$ (deux rayons :'
                ' $OA = OB$).',
                'Les points à égale distance de $A$ et de $B$ forment la médiatrice de $[AB]$ : le'
                ' centre est ' + colt('\\text{sur la médiatrice de } [AB]') + '. Il n\'est au milieu'
                ' de $[AB]$ que si $[AB]$ est un diamètre.']),
     variation('On veut creuser un puits **au bord de la route**, **à la même distance** des'
               ' maisons $A$ et $B$. La droite en tirets est la médiatrice du segment $[AB]$.'
               + FIG_167_3 + 'Où faut-il creuser le puits ?'
               + choix(['au point $P$', 'au point $Q$', 'au point $R$'], melanger=False),
               [var('k', '1..3'), var('j', 'eval:k-1')], ['{{j}}'],
               ['**À la même distance de $A$ et de $B$** : le puits est sur la médiatrice de'
                ' $[AB]$. **Au bord de la route** : il est sur la route.',
                'C\'est le point où la médiatrice coupe la route : le point $'
                + col(si3('k', 'P', 'Q', 'R')) + '$.'])],
    [spec('OA = OB', 0, {}, '0', 'correct'),
     spec('Erreur : O milieu de [AB]', 0, {}, '1', 'incorrect'),
     spec('Sur la médiatrice', 1, {}, '0', 'correct'),
     spec('Erreur : au milieu de [AB]', 1, {}, '1', 'incorrect'),
     spec('Puits en P', 2, {'k': 1, 'j': 0}, '0', 'correct'),
     spec('Puits en R', 2, {'k': 3, 'j': 2}, '2', 'correct'),
     spec('Erreur : le point le plus proche de B', 2, {'k': 1, 'j': 0}, '2', 'incorrect')],
    delay=90))

os.makedirs(DOSSIER, exist_ok=True)
for nom, m in MODELES:
    with open(os.path.join(DOSSIER, nom + '.json'), 'w', encoding='utf-8') as f:
        json.dump(m, f, ensure_ascii=False, indent='\t')
        f.write('\n')
subprocess.run(['pnpm', 'exec', 'prettier', '--write', DOSSIER], check=True,
               stdout=subprocess.DEVNULL)
print(f'{len(MODELES)} modèles écrits dans {DOSSIER}')
