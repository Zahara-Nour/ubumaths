"""Écrit les 4 modèles du lot 5d du CM1 (périmètres) dans scripts/questions/cm1-5d/.

Phase 0 validée par David le 2026-11-02 (§ 15 et 15 bis du journal
`docs/wip/questions-cm1-progress.md`). Bornes `cycle3.json`, CM1-073 à 075 :
- aucune formule de périmètre (BO c3 p.17) ; le périmètre, c'est la longueur du tour ;
- 074 : longueurs mesurées à la règle graduée ou fournies ;
- 075 : problèmes, « rectangle de côté 8 cm et de périmètre 27 cm » ; le quadruple du côté d'un
  carré peut être établi par l'élève.
Décisions : quatre modèles (075 coupé en « calculer » et « retrouver un côté ») ; règle dessinée
(côtés bout à bout, comme `ce1-10/01`) ; variation aire ≠ périmètre sur quadrillage ; réponse
numérique en case, l'unité après la case ; décimaux à virgule exigée (motif `a:number`) ; choix en
case « choix ». Corrigés : on fait le tour, jamais une formule.
Catégorie `Grandeurs · Périmètres · Périmètre d'un polygone` (neuve, aucun niveau pris) : 1 à 4.

    python3 docs/wip/questions/lot-cm1-5d.py scripts/questions/cm1-5d
"""
import json
import sys

DOSSIER = sys.argv[1]
OPTIONS = {'constraints': {'spacesFromFourDigits': True}}
VIRGULE_EXIGEE = {'pattern': 'a:number'}
SOUS_CATEGORIE = 'Périmètre d\'un polygone'

# ---- Gabarits (comme lot-cm1-5a.py) ----


def spec(desc, vi, variables, answers, status, violations=None):
    s = {'description': desc, 'variationIndex': vi,
         'variables': {k: str(x) for k, x in variables.items()},
         'answers': answers if isinstance(answers, list) else [answers],
         'expected': {'status': status}}
    if violations:
        s['expected']['constraintViolations'] = violations
    return s


def modele(title, description, level, variations, specs, delay=90):
    # theme / domain / subdomain : anciennes colonnes, remplies pour create-questions ; le
    # rangement (notion du point) est posé par la migration
    return {'title': title, 'description': description, 'grades': ['CM1'], 'theme': 'Grandeurs',
            'domain': 'Périmètres', 'subdomain': SOUS_CATEGORIE, 'level': level, 'delay': delay,
            'status': 'draft', 'options': OPTIONS, 'variations': variations,
            'testSpecs': specs}


def var(nom, expression):
    return {'name': nom, 'expression': expression}


def variation(statement, reponses, variables, etapes, conditions=None):
    v = {'statement': statement, 'variables': variables}
    if conditions:
        v['conditions'] = conditions
    v['blanks'] = [r if isinstance(r, dict) else {'expectedAnswer': r} for r in reponses]
    v['correction'] = {'steps': etapes}
    return v


def decimal(x):
    return {'expectedAnswer': x, 'requiredForm': VIRGULE_EXIGEE}


def choix(lignes, melanger=True):
    tete = '' if melanger else 'melanger: non\n'
    return '\n\n```choix\n' + tete + ''.join('- ' + c + '\n' for c in lignes) + '```'


def choix_dessins(figures):
    """Choix dont chaque option est une figure (bloc ouvert sur la ligne de l'item)."""
    items = []
    for lignes in figures:
        items.append('- ```figure\n' + ''.join('  ' + x + '\n' for x in lignes) + '  ```')
    return '\n\n````choix\n' + '\n'.join(items) + '\n````'


def selon(k, textes, n=1):
    """`{{if:k==1|…|{{if:k==2|…|…}}}}` : le texte numéro k (à partir de 1)."""
    textes = [str(t) for t in textes]
    if len(textes) == 1:
        return textes[0]
    return ('{{if:' + k + '==' + str(n) + '|' + textes[0] + '|' + selon(k, textes[1:], n + 1)
            + '}}')


def ev(x):
    return '{{eval:' + x + '}}'


def evd(x):
    return '{{eval:' + x + ';d}}'


def col(x, k=0):
    return '\\textcolor{{{color:primary.' + str(k) + '}}}{' + x + '}'


def U(n, u):
    return str(n) + '~\\unit{' + u + '}'


def case(unite):
    return '$?~\\text{' + unite + '}$'


def entete(fenetre, description, grille=False):
    lignes = ['fenetre: ' + fenetre]
    if grille:
        lignes.append('grille: 1')
    lignes += ['description: ' + description, '---']
    return lignes


def figure(lignes):
    return '\n\n```figure\n' + '\n'.join(lignes) + '\n```'


def points(nom, coords):
    """Sommets masqués nom1, nom2… ; rend la liste des noms."""
    noms = []
    lignes = []
    for i, (x, y) in enumerate(coords, 1):
        noms.append(f'{nom}{i}')
        lignes.append(f'{nom}{i} = point({x}, {y}, visible=faux)')
    return noms, lignes


def polygone(nom, coords, style='couleur="noir"'):
    noms, lignes = points(nom, coords)
    return lignes + [f'{nom} = polygone({", ".join(noms)}, {style})']


FAIRE_LE_TOUR = 'Le périmètre d\'une figure, c\'est la longueur de son **tour** : on ajoute les' \
    ' longueurs de **tous** ses côtés.'

MODELES = {}

# =============== 1. CM1-073 : qu'est-ce que le périmètre ? ===============

DEFINITION = variation(
    'Le périmètre d\'une figure, c\'est…'
    + choix(['la longueur de son contour', 'la place qu\'elle occupe à l\'intérieur',
             'le nombre de ses côtés', 'la longueur de son plus grand côté']), ['0'],
    [],
    ['Le périmètre se mesure **en faisant le tour** de la figure : c\'est une **longueur**, la'
     ' longueur de son contour.',
     'La place occupée à l\'intérieur, c\'est l\'**aire** ; ce n\'est pas le périmètre.'])

# Quatre dessins d'une même figure : contour en couleur (le périmètre), intérieur colorié (l'aire),
# un seul côté, une diagonale
RECTANGLE_073 = [(0, 0), (4, 0), (4, 2.5), (0, 2.5)]
MAISON_073 = [(0, 0), (4, 0), (4, 2.5), (2, 4), (0, 2.5)]


def quatre_dessins(coords, nom_figure, fenetre):
    def tete(quoi):
        return entete(fenetre, nom_figure + ' ; ' + quoi + '.')
    contour = tete('tout son contour est en rouge') + polygone(
        'F', coords, 'couleur="rouge", epaisseur=4')
    interieur = tete('son intérieur est colorié en rouge') + polygone(
        'F', coords, 'couleur="noir", remplissage="rouge", opacite_fond=0.6')
    noms, lignes = points('F', coords)
    cote = (tete('un seul de ses côtés est en rouge') + lignes
            + [f'F = polygone({", ".join(noms)}, couleur="noir")',
               f'segment({noms[0]}, {noms[1]}, couleur="rouge", epaisseur=4)'])
    diagonale = (tete('un segment rouge la traverse d\'un coin à l\'autre') + lignes
                 + [f'F = polygone({", ".join(noms)}, couleur="noir")',
                    f'segment({noms[0]}, {noms[2]}, couleur="rouge", epaisseur=4)'])
    return choix_dessins([contour, interieur, cote, diagonale])


ETAPES_DESSINS = [
    'Le périmètre, c\'est la longueur du **tour** de la figure : il faut que **tout le contour**'
    ' soit en rouge.',
    'L\'intérieur colorié montre l\'**aire** ; un seul côté ou un trait qui traverse la figure ne'
    ' font pas le tour.']

DESSIN_RECTANGLE = variation(
    'Sur quel dessin le **périmètre** du rectangle est-il en rouge ?'
    + quatre_dessins(RECTANGLE_073, 'Un rectangle', '-0.5 ; 4.5 ; -0.5 ; 3'), ['0'], [],
    ETAPES_DESSINS)

DESSIN_MAISON = variation(
    'Sur quel dessin le **périmètre** de la figure est-il en rouge ?'
    + quatre_dessins(MAISON_073, 'Une figure à cinq côtés en forme de maison',
                     '-0.5 ; 4.5 ; -0.5 ; 4.5'), ['0'], [],
    ETAPES_DESSINS)

# Deux rectangles de même aire (même nombre de carreaux), de périmètres différents ; t = 1, 2 :
# A a le plus grand périmètre ; t = 3, 4, 5 : B
PAIRES = [((6, 1), (3, 2)), ((9, 1), (3, 3)), ((4, 2), (8, 1)), ((2, 2), (4, 1)),
          ((4, 3), (6, 2))]
WA = selon('t', [p[0][0] for p in PAIRES])
HA = selon('t', [p[0][1] for p in PAIRES])
WB = selon('t', [p[1][0] for p in PAIRES])
HB = selon('t', [p[1][1] for p in PAIRES])
XB = selon('t', [p[0][0] + 2 for p in PAIRES])  # B commence deux carreaux après A
PA = selon('t', [2 * sum(p[0]) for p in PAIRES])
PB = selon('t', [2 * sum(p[1]) for p in PAIRES])
AIRE = selon('t', [p[0][0] * p[0][1] for p in PAIRES])
XB_FIN = selon('t', [p[0][0] + 2 + p[1][0] for p in PAIRES])
XA_MILIEU = selon('t', [p[0][0] / 2 for p in PAIRES])
XB_MILIEU = selon('t', [p[0][0] + 2 + p[1][0] / 2 for p in PAIRES])
FENETRE_X = selon('t', [p[0][0] + 3 + p[1][0] for p in PAIRES])

A_OU_B = choix(['la figure A', 'la figure B', 'elles ont le même périmètre'], melanger=False)


def deux_figures(description, a_coords, b_coords, xa_label, xb_label, fenetre):
    return figure(entete(fenetre, description, grille=True)
                  + polygone('A', a_coords, 'couleur="bleu", epaisseur=3')
                  + polygone('B', b_coords, 'couleur="rouge", epaisseur=3')
                  + [f'texte({xa_label}, -0.6, "A")', f'texte({xb_label}, -0.6, "B")'])


MEME_AIRE = variation(
    'Laquelle de ces deux figures a le plus grand **périmètre** ?'
    + deux_figures('Deux rectangles dessinés sur un quadrillage, A en bleu et B en rouge ; ils'
                   ' couvrent le même nombre de carreaux.',
                   [(0, 0), (WA, 0), (WA, HA), (0, HA)],
                   [(XB, 0), (XB_FIN, 0), (XB_FIN, HB), (XB, HB)],
                   XA_MILIEU, XB_MILIEU, '-1 ; ' + FENETRE_X + ' ; -1.2 ; 4')
    + A_OU_B, ['{{r}}'],
    [var('t', '1..5'), var('r', 'eval:floor(t/3)')],
    ['Les deux figures couvrent ' + AIRE + ' carreaux : elles ont la même **aire**. Cela ne dit'
     ' rien de leur périmètre : il faut compter le **tour**.',
     'Tour de A : $' + WA + ' + ' + HA + ' + ' + WA + ' + ' + HA + ' = ' + PA + '$ côtés de carreau ;'
     ' tour de B : $' + WB + ' + ' + HB + ' + ' + WB + ' + ' + HB + ' = ' + PB + '$.',
     'La figure **{{if:r==0|A|B}}** a le plus grand périmètre.'])

# Un rectangle et la même figure à laquelle on a retiré un carreau au coin : le tour ne change
# pas. o = 1 : le rectangle est A ; o = 2 : il est B
XR = ev('(o-1)*(w+2)')


def coin_retire():
    x = '(2-o)*(w+2)'
    return [(ev(x), 0), (ev(x + '+w'), 0), (ev(x + '+w'), ev('h-1')),
            (ev(x + '+w-1'), ev('h-1')), (ev(x + '+w-1'), '{{h}}'), (ev(x), '{{h}}')]


MEME_TOUR = variation(
    'Laquelle de ces deux figures a le plus grand **périmètre** ?'
    + figure(entete('-1 ; ' + ev('2*w+3') + ' ; -1.2 ; ' + ev('h+1'),
                    'Sur un quadrillage, un rectangle et la même figure à laquelle on a retiré'
                    ' un carreau dans un coin.', grille=True)
             + polygone('R', [(XR, 0), (ev('(o-1)*(w+2)+w'), 0), (ev('(o-1)*(w+2)+w'), '{{h}}'),
                              (XR, '{{h}}')], 'couleur="{{if:o==1|bleu|rouge}}", epaisseur=3')
             + polygone('L', coin_retire(), 'couleur="{{if:o==1|rouge|bleu}}", epaisseur=3')
             + ['texte(' + evd('w/2') + ', -0.6, "A")', 'texte(' + evd('w+2+w/2') + ', -0.6, "B")'])
    + A_OU_B, ['2'],
    [var('w', '3..5'), var('h', '2..4'), var('o', '1..2')],
    ['La figure au coin retiré a un carreau de moins : son **aire** est plus petite. Mais son'
     ' **tour** ?',
     'Au coin, le contour rentre d\'un carreau puis ressort d\'un carreau : les deux petits côtés'
     ' remplacent exactement les deux morceaux du rectangle enlevés.',
     'Tour du rectangle : $' + ev('2*w+2*h') + '$ côtés de carreau ; tour de l\'autre figure :'
     ' $' + ev('2*w+2*h') + '$ aussi. Elles ont **le même périmètre**.'])

MODELES['01-qu-est-ce-que-le-perimetre'] = modele(
    'Qu\'est-ce que le périmètre ?',
    'Le périmètre est la longueur du contour ; le reconnaître sur un dessin ; ne pas le confondre'
    ' avec l\'aire (même aire, périmètres différents ; même périmètre, aires différentes)', 1,
    [DEFINITION, DESSIN_RECTANGLE, DESSIN_MAISON, MEME_AIRE, MEME_TOUR],
    [spec('définition : le contour', 0, {}, '0', 'correct'),
     spec('Erreur : l\'intérieur (l\'aire)', 0, {}, '1', 'incorrect'),
     spec('rectangle : le contour en rouge', 1, {}, '0', 'correct'),
     spec('Erreur : l\'intérieur colorié', 1, {}, '1', 'incorrect'),
     spec('maison : le contour en rouge', 2, {}, '0', 'correct'),
     spec('Erreur : un seul côté', 2, {}, '2', 'incorrect'),
     spec('6×1 (14) contre 3×2 (10) : A', 3, {'t': 1, 'r': 0}, '0', 'correct'),
     spec('Erreur : même aire donc même périmètre', 3, {'t': 1, 'r': 0}, '2', 'incorrect'),
     spec('4×2 (12) contre 8×1 (18) : B', 3, {'t': 3, 'r': 1}, '1', 'correct'),
     spec('Erreur : la plus haute, A', 3, {'t': 3, 'r': 1}, '0', 'incorrect'),
     spec('coin retiré : même périmètre', 4, {'w': 4, 'h': 3, 'o': 1}, '2', 'correct'),
     spec('Erreur : le rectangle, plus grand', 4, {'w': 4, 'h': 3, 'o': 1}, '0', 'incorrect')],
    delay=60)

# =============== 2. CM1-074 : calculer le périmètre d'un polygone ===============


def etiquette(x, y, texte):
    return f'texte({x}, {y}, "{texte}")'


RECTANGLE = variation(
    'Quel est le périmètre de ce rectangle ?'
    + figure(entete('-2 ; ' + ev('a+2') + ' ; -1.2 ; ' + ev('b+1.2'),
                    'Un rectangle ; ses côtés mesurent {{a}} cm et {{b}} cm.')
             + polygone('R', [(0, 0), ('{{a}}', 0), ('{{a}}', '{{b}}'), (0, '{{b}}')],
                        'couleur="bleu", epaisseur=2')
             + [etiquette(evd('a/2'), -0.6, '{{a}} cm'), etiquette(evd('a/2'), ev('b+0.6'), '{{a}} cm'),
                etiquette(-1, evd('b/2'), '{{b}} cm'), etiquette(ev('a+1'), evd('b/2'), '{{b}} cm')])
    + '\n\nLe périmètre du rectangle est ' + case('cm') + '.', [ev('2*a+2*b')],
    [var('a', '3..9'), var('b', '2..6')],
    [FAIRE_LE_TOUR,
     'Le rectangle a quatre côtés : deux de ${{a}}~\\unit{cm}$ et deux de ${{b}}~\\unit{cm}$.',
     '$${{a}} + {{b}} + {{a}} + {{b}} = ' + col(ev('2*a+2*b')) + '$$ Le périmètre est $'
     + ev('2*a+2*b') + '~\\unit{cm}$.'],
    conditions=['a != b'])

# Maison : base 6, murs h, toit de deux côtés de 5 (le sommet à 4 au-dessus des murs)
MAISON = variation(
    'Quel est le périmètre de cette figure ?'
    + figure(entete('-2 ; 8 ; -1.2 ; ' + ev('h+5'),
                    'Une figure à cinq côtés en forme de maison : le bas mesure 6 cm, les deux'
                    ' murs {{h}} cm, les deux côtés du toit 5 cm.')
             + polygone('M', [(0, 0), (6, 0), (6, '{{h}}'), (3, ev('h+4')), (0, '{{h}}')],
                        'couleur="bleu", epaisseur=2')
             + [etiquette(3, -0.6, '6 cm'), etiquette(-1, evd('h/2'), '{{h}} cm'),
                etiquette(7, evd('h/2'), '{{h}} cm'), etiquette(0.6, ev('h+2.4'), '5 cm'),
                etiquette(5.4, ev('h+2.4'), '5 cm')])
    + '\n\nLe périmètre de la figure est ' + case('cm') + '.', [ev('16+2*h')],
    [var('h', '2..5')],
    [FAIRE_LE_TOUR,
     'On fait le tour en partant du bas : $6~\\unit{cm}$, ${{h}}~\\unit{cm}$, $5~\\unit{cm}$,'
     ' $5~\\unit{cm}$, ${{h}}~\\unit{cm}$. Il y a **cinq** côtés.',
     '$$6 + {{h}} + 5 + 5 + {{h}} = ' + col(ev('16+2*h')) + '$$ Le périmètre est $'
     + ev('16+2*h') + '~\\unit{cm}$.'])

# Trapèze rectangle : bas a, haut a − 3, hauteur 4, côté penché 5
TRAPEZE = variation(
    'Quel est le périmètre de cette figure ?'
    + figure(entete('-2 ; ' + ev('a+2') + ' ; -1.2 ; 5.2',
                    'Une figure à quatre côtés : le bas mesure {{a}} cm, le haut ' + ev('a-3')
                    + ' cm, le côté gauche 4 cm et le côté penché 5 cm.')
             + polygone('T', [(0, 0), ('{{a}}', 0), (ev('a-3'), 4), (0, 4)],
                        'couleur="bleu", epaisseur=2')
             + [etiquette(evd('a/2'), -0.6, '{{a}} cm'), etiquette(evd('(a-3)/2'), 4.6, ev('a-3') + ' cm'),
                etiquette(-1, 2, '4 cm'), etiquette(ev('a-0.6'), 2.4, '5 cm')])
    + '\n\nLe périmètre de la figure est ' + case('cm') + '.', [ev('2*a+6')],
    [var('a', '5..9')],
    [FAIRE_LE_TOUR,
     'Les quatre côtés mesurent ${{a}}~\\unit{cm}$, $5~\\unit{cm}$, $' + ev('a-3')
     + '~\\unit{cm}$ et $4~\\unit{cm}$.',
     '$${{a}} + 5 + ' + ev('a-3') + ' + 4 = ' + col(ev('2*a+6')) + '$$ Le périmètre est $'
     + ev('2*a+6') + '~\\unit{cm}$.'])

# Sur quadrillage : rectangle w × h auquel on a retiré un rectangle c × d au coin en haut à droite
QUADRILLAGE = variation(
    'Chaque carreau du quadrillage mesure $1~\\unit{cm}$ de côté. Quel est le périmètre de cette'
    ' figure ?'
    + figure(entete('-1 ; ' + ev('w+1') + ' ; -1 ; ' + ev('h+1'),
                    'Sur un quadrillage, une figure à six côtés en forme de L.', grille=True)
             + polygone('L', [(0, 0), ('{{w}}', 0), ('{{w}}', ev('h-d')), (ev('w-c'), ev('h-d')),
                              (ev('w-c'), '{{h}}'), (0, '{{h}}')], 'couleur="bleu", epaisseur=3'))
    + '\n\nLe périmètre de la figure est ' + case('cm') + '.', [ev('2*w+2*h')],
    [var('w', '4..8'), var('h', '3..6'), var('c', '1..5'), var('d', '1..4')],
    [FAIRE_LE_TOUR + ' Ici, on compte les côtés de carreau sur le contour.',
     'En partant du coin en bas à gauche : $' + '{{w}} + ' + ev('h-d') + ' + {{c}} + {{d}} + '
     + ev('w-c') + ' + {{h}}$ côtés de carreau. Il y a **six** côtés.',
     '$${{w}} + ' + ev('h-d') + ' + {{c}} + {{d}} + ' + ev('w-c') + ' + {{h}} = '
     + col(ev('2*w+2*h')) + '$$ Le périmètre est $' + ev('2*w+2*h') + '~\\unit{cm}$.'],
    conditions=['c <= w-2', 'd <= h-2'])

# Rectangle a cm × b mm : le périmètre en cm (décimal)
CM_ET_MM = variation(
    'Quel est le périmètre de ce rectangle, en centimètres ?'
    + figure(entete('-2.2 ; ' + ev('a+2.2') + ' ; -1.2 ; ' + evd('b/10+1.2'),
                    'Un rectangle ; ses côtés mesurent {{a}} cm et {{b}} mm.')
             + polygone('R', [(0, 0), ('{{a}}', 0), ('{{a}}', evd('b/10')), (0, evd('b/10'))],
                        'couleur="bleu", epaisseur=2')
             + [etiquette(evd('a/2'), -0.6, '{{a}} cm'), etiquette(evd('a/2'), evd('b/10+0.6'), '{{a}} cm'),
                etiquette(-1.2, evd('b/20'), '{{b}} mm'), etiquette(ev('a+1.2'), evd('b/20'), '{{b}} mm')])
    + '\n\nLe périmètre du rectangle est ' + case('cm') + '.', [decimal(evd('2*a+b/5'))],
    [var('a', '3..8'), var('b', '15..65')],
    ['Avant d\'ajouter, toutes les longueurs doivent être dans la **même unité** :'
     ' $10~\\unit{mm} = 1~\\unit{cm}$, donc ${{b}}~\\unit{mm} = ' + evd('b/10') + '~\\unit{cm}$.',
     FAIRE_LE_TOUR,
     '$${{a}} + ' + evd('b/10') + ' + {{a}} + ' + evd('b/10') + ' = ' + col(evd('2*a+b/5'))
     + '$$ Le périmètre est $' + evd('2*a+b/5') + '~\\unit{cm}$.'],
    conditions=['mod(b,10) != 0', 'b/10 != a'])

# La règle : les trois côtés d'un triangle posés bout à bout à partir du 0
REGLE_MAX = 15


def regle():
    lignes = ['regle1 = point(-0.4, 0, visible=faux)',
              f'regle2 = point({REGLE_MAX + 0.4}, 0, visible=faux)',
              f'regle3 = point({REGLE_MAX + 0.4}, 1.4, visible=faux)',
              'regle4 = point(-0.4, 1.4, visible=faux)',
              'regle = polygone(regle1, regle2, regle3, regle4, couleur="noir")']
    for g in range(REGLE_MAX + 1):
        lignes += [f'g{g}a = point({g}, 1.4, visible=faux)',
                   f'g{g}b = point({g}, 0.9, visible=faux)',
                   f'segment(g{g}a, g{g}b, couleur="noir")',
                   f'texte({g}, 0.5, "{g}")']
    return lignes


def cote_sur_regle(nom, debut, fin, couleur):
    return [f'{nom}1 = point({debut}, 2, visible=faux)',
            f'{nom}2 = point({fin}, 2, visible=faux)',
            f'segment({nom}1, {nom}2, couleur="{couleur}", epaisseur=3)',
            f'{nom}t1 = point({fin}, 1.7, visible=faux)',
            f'{nom}t2 = point({fin}, 2.3, visible=faux)',
            f'segment({nom}t1, {nom}t2, couleur="{couleur}", epaisseur=3)']


REGLE = variation(
    'Pour trouver le périmètre d\'un triangle, Inès a posé ses trois côtés **bout à bout** au-dessus'
    ' de sa règle, le premier au $0$.'
    + figure(entete('-0.8 ; 15.8 ; -0.5 ; 3.9',
                    'Une règle graduée en centimètres ; au-dessus, trois segments bout à bout'
                    ' (bleu, rouge, vert), le premier commence au 0.')
             + regle() + ['Dt1 = point(0, 1.7, visible=faux)', 'Dt2 = point(0, 2.3, visible=faux)',
                          'segment(Dt1, Dt2, couleur="bleu", epaisseur=3)']
             + cote_sur_regle('P', 0, '{{a}}', 'bleu')
             + cote_sur_regle('Q', '{{a}}', ev('a+b'), 'rouge')
             + cote_sur_regle('S', ev('a+b'), ev('a+b+c'), 'vert'))
    + '\n\nLe périmètre du triangle est ' + case('cm') + '.', [ev('a+b+c')],
    [var('a', '3..6'), var('b', '3..6'), var('c', '3..6')],
    ['Mis bout à bout, les trois côtés font **le tour** du triangle : leur longueur totale, c\'est'
     ' le périmètre.',
     'Le dernier côté s\'arrête à la graduation $' + ev('a+b+c') + '$ ; on peut vérifier :'
     ' $${{a}} + {{b}} + {{c}} = ' + col(ev('a+b+c')) + '$$',
     'Le périmètre du triangle est $' + ev('a+b+c') + '~\\unit{cm}$.'],
    conditions=['a+b+c <= 15'])

MODELES['02-calculer-le-perimetre-d-un-polygone'] = modele(
    'Calculer le périmètre d\'un polygone',
    'Longueurs écrites sur les côtés (rectangle, trapèze, maison), cm et mm mêlés ; compter sur un'
    ' quadrillage ; côtés posés bout à bout sur la règle', 2,
    [RECTANGLE, MAISON, TRAPEZE, QUADRILLAGE, CM_ET_MM, REGLE],
    [spec('rectangle 7 × 4 : 22', 0, {'a': 7, 'b': 4}, '22', 'correct'),
     spec('Erreur : deux côtés seulement (11)', 0, {'a': 7, 'b': 4}, '11', 'incorrect'),
     spec('Erreur : l\'aire (28)', 0, {'a': 7, 'b': 4}, '28', 'incorrect'),
     spec('maison h = 3 : 22', 1, {'h': 3}, '22', 'correct'),
     spec('Erreur : un seul mur (19)', 1, {'h': 3}, '19', 'incorrect'),
     spec('trapèze a = 7 : 20', 2, {'a': 7}, '20', 'correct'),
     spec('Erreur : côté penché oublié (15)', 2, {'a': 7}, '15', 'incorrect'),
     spec('L 6 × 5, coin 2 × 2 : 22', 3, {'w': 6, 'h': 5, 'c': 2, 'd': 2}, '22', 'correct'),
     spec('Erreur : les carreaux de l\'intérieur (26)', 3, {'w': 6, 'h': 5, 'c': 2, 'd': 2}, '26',
          'incorrect'),
     spec('Erreur : le coin compté une fois (20)', 3, {'w': 6, 'h': 5, 'c': 2, 'd': 2}, '20',
          'incorrect'),
     spec('4 cm et 35 mm : 15', 4, {'a': 4, 'b': 35}, '15', 'correct'),
     spec('Erreur : unités non converties (78)', 4, {'a': 4, 'b': 35}, '78', 'incorrect'),
     spec('5 cm et 23 mm : 14,6', 4, {'a': 5, 'b': 23}, '14,6', 'correct'),
     spec('Erreur : 23 mm lu 23 cm (56)', 4, {'a': 5, 'b': 23}, '56', 'incorrect'),
     spec('Forme : 73/5', 4, {'a': 5, 'b': 23}, '\\frac{73}{5}', 'bad_form', ['form']),
     spec('règle 4 + 5 + 3 : 12', 5, {'a': 4, 'b': 5, 'c': 3}, '12', 'correct'),
     spec('Erreur : le dernier côté seul (3)', 5, {'a': 4, 'b': 5, 'c': 3}, '3', 'incorrect')])

# =============== 3. CM1-075 : problèmes, calculer un périmètre ===============

JARDIN = variation(
    'Le jardin de Léo est un rectangle de ${{L}}~\\unit{m}$ de long et ${{l}}~\\unit{m}$ de'
    ' large. Il veut poser un grillage tout autour.\n\nIl lui faut ' + case('m')
    + ' de grillage.', [ev('2*L+2*l')],
    [var('L', '12..40'), var('l', '5..20')],
    ['Le grillage fait **le tour** du jardin : sa longueur est le périmètre du rectangle.',
     'Un rectangle a deux longueurs et deux largeurs :'
     ' $${{L}} + {{l}} + {{L}} + {{l}} = ' + col(ev('2*L+2*l')) + '$$',
     'Il lui faut $' + ev('2*L+2*l') + '~\\unit{m}$ de grillage.'],
    conditions=['l <= L-3'])

CHAMP = variation(
    'Un champ a cinq côtés, qui mesurent ${{a}}~\\unit{m}$, ${{b}}~\\unit{m}$, ${{c}}~\\unit{m}$,'
    ' ${{f}}~\\unit{m}$ et ${{g}}~\\unit{m}$. Quel est son périmètre ?\n\nLe périmètre du champ'
    ' est ' + case('m') + '.', [ev('a+b+c+f+g')],
    [var('a', '20..90'), var('b', '20..90'), var('c', '20..90'), var('f', '20..90'),
     var('g', '20..90')],
    [FAIRE_LE_TOUR,
     '$${{a}} + {{b}} + {{c}} + {{f}} + {{g}} = ' + col(ev('a+b+c+f+g')) + '$$',
     'Le périmètre du champ est $' + ev('a+b+c+f+g') + '~\\unit{m}$.'])

# Carré de côté n/2 cm (entier ou demi)
CARRE = variation(
    'Mia veut coller un ruban tout autour d\'un cadre carré de $' + evd('n/2')
    + '~\\unit{cm}$ de côté.\n\nIl lui faut ' + case('cm') + ' de ruban.', [ev('2*n')],
    [var('n', '13..49')],
    ['Le ruban fait **le tour** du cadre : sa longueur est le périmètre du carré.',
     'Un carré a **quatre** côtés de même longueur :'
     ' $$' + evd('n/2') + ' + ' + evd('n/2') + ' + ' + evd('n/2') + ' + ' + evd('n/2') + ' = '
     + col(ev('2*n')) + '$$',
     'Il lui faut $' + ev('2*n') + '~\\unit{cm}$ de ruban.'])

MODELES['03-problemes-calculer-un-perimetre'] = modele(
    'Problèmes : calculer un périmètre',
    'Grillage autour d\'un jardin rectangulaire, tour d\'un champ à cinq côtés, ruban autour d\'un'
    ' cadre carré ; sans formule', 3, [JARDIN, CHAMP, CARRE],
    [spec('jardin 25 × 12 : 74', 0, {'L': 25, 'l': 12}, '74', 'correct'),
     spec('Erreur : une longueur et une largeur (37)', 0, {'L': 25, 'l': 12}, '37', 'incorrect'),
     spec('Erreur : l\'aire (300)', 0, {'L': 25, 'l': 12}, '300', 'incorrect'),
     spec('champ : 230', 1, {'a': 40, 'b': 55, 'c': 35, 'f': 60, 'g': 40}, '230', 'correct'),
     spec('Erreur : un côté oublié (190)', 1, {'a': 40, 'b': 55, 'c': 35, 'f': 60, 'g': 40}, '190',
          'incorrect'),
     spec('carré de 12,5 : 50', 2, {'n': 25}, '50', 'correct'),
     spec('Erreur : deux côtés (25)', 2, {'n': 25}, '25', 'incorrect'),
     spec('carré de 9 : 36', 2, {'n': 18}, '36', 'correct')])

# =============== 4. CM1-075 : problèmes, retrouver un côté ===============

TRIANGLE = variation(
    'Le périmètre d\'un triangle est $' + ev('a+b+c') + '~\\unit{cm}$. Deux de ses côtés'
    ' mesurent ${{a}}~\\unit{cm}$ et ${{b}}~\\unit{cm}$.\n\nLe troisième côté mesure '
    + case('cm') + '.', ['{{c}}'],
    [var('a', '4..15'), var('b', '4..15'), var('c', '4..15')],
    ['Le périmètre, c\'est le tour : ${{a}} + {{b}} + \\text{le troisième côté} = '
     + ev('a+b+c') + '$.',
     'Les deux côtés connus font ${{a}} + {{b}} = ' + ev('a+b') + '~\\unit{cm}$. Il reste'
     ' $$' + ev('a+b+c') + ' - ' + ev('a+b') + ' = ' + col('{{c}}') + '$$',
     'Le troisième côté mesure ${{c}}~\\unit{cm}$.'],
    conditions=['c < a+b', 'a < b+c', 'b < a+c'])

QUADRILATERE = variation(
    'Le périmètre d\'un quadrilatère est $' + ev('a+b+c+f') + '~\\unit{cm}$. Trois de ses côtés'
    ' mesurent ${{a}}~\\unit{cm}$, ${{b}}~\\unit{cm}$ et ${{c}}~\\unit{cm}$.\n\nLe quatrième côté'
    ' mesure ' + case('cm') + '.', ['{{f}}'],
    [var('a', '3..15'), var('b', '3..15'), var('c', '3..15'), var('f', '3..15')],
    ['Le périmètre, c\'est le tour : on ajoute les quatre côtés.',
     'Les trois côtés connus font ${{a}} + {{b}} + {{c}} = ' + ev('a+b+c') + '~\\unit{cm}$. Il'
     ' reste $$' + ev('a+b+c+f') + ' - ' + ev('a+b+c') + ' = ' + col('{{f}}') + '$$',
     'Le quatrième côté mesure ${{f}}~\\unit{cm}$.'],
    conditions=['f < a+b+c'])

# Rectangle : un côté a, l'autre n/2 ; périmètre 2a + n (BO : 8 cm et 27 cm → 5,5 cm)
RECTANGLE_COTE = variation(
    'Un rectangle a un côté de ${{a}}~\\unit{cm}$ et un périmètre de $' + ev('2*a+n')
    + '~\\unit{cm}$.\n\nSon autre côté mesure ' + case('cm') + '.', [decimal(evd('n/2'))],
    [var('a', '3..12'), var('n', '5..30')],
    ['Un rectangle a **deux** côtés de ${{a}}~\\unit{cm}$ : ensemble, ils font $${{a}} + {{a}} = '
     + ev('2*a') + '~\\unit{cm}$$',
     'Il reste $' + ev('2*a+n') + ' - ' + ev('2*a') + ' = {{n}}~\\unit{cm}$ pour les **deux'
     ' autres** côtés, qui ont la même longueur.',
     'Chacun mesure la moitié : $${{n}} : 2 = ' + col(evd('n/2')) + '$$ L\'autre côté mesure $'
     + evd('n/2') + '~\\unit{cm}$.'],
    conditions=['n != 2*a'])

CARRE_COTE = variation(
    'Le périmètre d\'un carré est $' + ev('2*n') + '~\\unit{cm}$.\n\nSon côté mesure '
    + case('cm') + '.', [decimal(evd('n/2'))],
    [var('n', '6..40')],
    ['Un carré a **quatre** côtés de même longueur : le périmètre, c\'est quatre fois le côté.',
     'On partage le périmètre en quatre : $$' + ev('2*n') + ' : 4 = ' + col(evd('n/2')) + '$$',
     'Vérification : $' + evd('n/2') + ' + ' + evd('n/2') + ' + ' + evd('n/2') + ' + '
     + evd('n/2') + ' = ' + ev('2*n') + '$. Le côté mesure $' + evd('n/2') + '~\\unit{cm}$.'])

MODELES['04-problemes-retrouver-un-cote'] = modele(
    'Problèmes : retrouver un côté connaissant le périmètre',
    'Triangle ou quadrilatère : tous les côtés sauf un ; rectangle : un côté et le périmètre'
    ' (8 cm et 27 cm → 5,5 cm) ; carré : le périmètre', 4,
    [TRIANGLE, QUADRILATERE, RECTANGLE_COTE, CARRE_COTE],
    [spec('triangle 7 + 9 + ? = 22 : 6', 0, {'a': 7, 'b': 9, 'c': 6}, '6', 'correct'),
     spec('Erreur : le périmètre ajouté (38)', 0, {'a': 7, 'b': 9, 'c': 6}, '38', 'incorrect'),
     spec('quadrilatère 5 + 8 + 6 + ? = 26 : 7', 1, {'a': 5, 'b': 8, 'c': 6, 'f': 7}, '7',
          'correct'),
     spec('Erreur : un côté retiré seulement (21)', 1, {'a': 5, 'b': 8, 'c': 6, 'f': 7}, '21',
          'incorrect'),
     spec('BO : 8 cm et 27 cm → 5,5', 2, {'a': 8, 'n': 11}, '5,5', 'correct'),
     spec('Erreur : 27 − 8 = 19', 2, {'a': 8, 'n': 11}, '19', 'incorrect'),
     spec('Erreur : non partagé (11)', 2, {'a': 8, 'n': 11}, '11', 'incorrect'),
     spec('Forme : 11/2', 2, {'a': 8, 'n': 11}, '\\frac{11}{2}', 'bad_form', ['form']),
     spec('rectangle 6 cm, périmètre 26 : 7', 2, {'a': 6, 'n': 14}, '7', 'correct'),
     spec('carré de périmètre 34 : 8,5', 3, {'n': 17}, '8,5', 'correct'),
     spec('Erreur : partagé en deux (17)', 3, {'n': 17}, '17', 'incorrect'),
     spec('carré de périmètre 36 : 9', 3, {'n': 18}, '9', 'correct')])

for nom, m in MODELES.items():
    with open(f'{DOSSIER}/{nom}.json', 'w') as fh:
        json.dump(m, fh, ensure_ascii=False, indent='\t')
        fh.write('\n')
print(len(MODELES), 'modèles écrits')
