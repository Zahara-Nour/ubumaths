"""Écrit les 5 modèles du lot 6 « translations et volumes » de la 4e dans scripts/questions/4-lot-6/.

Phase 0 validée par David le 2026-10-31 (§ 28 du journal « docs/wip/questions-4-progress.md »), un
point par modèle :

| # | Point | Titre                              | Catégorie, niveau                                  |
| 1 | 4-029 | Volume d'une pyramide              | Grandeurs › Volumes › Pyramide et cône, 1           |
| 2 | 4-076 | Volume d'un cône                   | Grandeurs › Volumes › Pyramide et cône, 2           |
| 3 | 4-030 | Effet d'une translation            | Géométrie › Translations › Image d'une figure, 1    |
| 4 | 4-031 | Translation et parallélogramme     | Géométrie › Translations › Parallélogramme, 1       |
| 5 | 4-032 | Ce que conserve une translation    | Géométrie › Translations › Conservations, 1         |

Bornes : « cycle4.json », 4e (Exemples 2026 p. 27-28) : volume = aire de base × hauteur ÷ 3, lien
avec le pavé ou le cylindre de même base et de même hauteur ; translation : effet sur une figure,
frises, lien avec le parallélogramme, conservation des distances, des angles (et des aires) ; la
définition ponctuelle n'est PAS au programme de 4e (3e).

Décisions (David, 2026-10-31, « je suis tes recos ») :
- volumes dessinés avec le bloc ```solide (cotes en cm) : les 2 modèles attendent en brouillon le
  deploy:prod qui livre le bloc ;
- « la translation qui transforme A en B » et une flèche dessinée, jamais de vecteur noté ;
- 4-031 : « D image de C → ABDC parallélogramme » tenu pour le LIEN du programme de 4e.

Pièges :
- case choix : la bonne réponse est écrite en premier (indice 0), le bloc mélange ;
- π s'écrit « \\pi » dans un eval (« pi » nu est refusé) ;
- le DSL de figure refuse « A' » : l'image de ABC s'appelle DEF ; « polygone » ne prend que des
  points (sommets masqués, « visible=faux ») ;
- les figures du 4-030 sont placées par le script (cases tirées par c) : chaque cas est vérifié
  ici (dans la fenêtre, figures disjointes, flèche à part).

    python3 docs/wip/questions/lot-4-6.py scripts/questions/4-lot-6
"""
import json
import os
import subprocess
import sys

DOSSIER = sys.argv[1]


def spec(desc, vi, variables, answers, status, violations=None):
    expected = {'status': status}
    if violations:
        expected['constraintViolations'] = violations
    return {'description': desc, 'variationIndex': vi,
            'variables': {k: str(v) for k, v in variables.items()},
            'answers': answers if isinstance(answers, list) else [answers],
            'expected': expected}


def modele(nom, title, description, theme, domain, subdomain, level, variations, specs,
           delay=60, options=None):
    m = {'title': title, 'description': description, 'grades': ['4'], 'theme': theme,
         'domain': domain, 'subdomain': subdomain, 'level': level, 'delay': delay,
         'status': 'draft', 'variations': variations, 'testSpecs': specs}
    if options:
        m['options'] = options
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


def ev(x):
    return '{{eval:' + x + '}}'


def choix(lignes, plusieurs=False):
    tete = 'plusieurs: oui\n' if plusieurs else ''
    return '\n\n```choix\n' + tete + ''.join('- ' + l + '\n' for l in lignes) + '```'


def selon(nom, valeurs):
    """Texte ou nombre choisi par la variable nom ({{if}} mis bout à bout, jamais imbriqués)."""
    return ''.join('{{if:' + nom + '==' + str(j) + '|' + str(v) + '|}}' for j, v in enumerate(valeurs))


def multiple(x, n):
    return '(' + x + ') % ' + str(n) + ' == 0'


def loin(x):
    """x arrondi à l'unité sans ambiguïté : à plus de 0,1 d'un demi."""
    return 'abs((' + x + ') - round(' + x + ')) < 0.4'


X = '\\times'
DIV = '\\div'
CM = '~\\unit{cm}'
CM2 = '~\\unit{cm^2}'
CM3 = '~\\unit{cm^3}'
VOL = '\\mathcal{V}'
MODELES = []


def solide(forme, sommets, description_cotes=True):
    return ('\n\n```solide\nforme: ' + forme + '\nsommets: ' + sommets + '\n'
            + ('cotes: cm\n' if description_cotes else '') + '```')


# --- 1. 4-029 : volume d'une pyramide ----------------------------------------------------------

FORMULE_PYR = ('Volume d\'une pyramide : $$' + VOL + ' = \\dfrac{\\text{aire de la base} ' + X
               + ' \\text{hauteur}}{3}$$')

V29_CARREE = variation(
    'La pyramide $SABCD$ a pour base le carré $ABCD$ de côté ${{a}}' + CM + '$ ; sa hauteur mesure'
    ' ${{h}}' + CM + '$. Calcule son volume.'
    + solide('pyramide carree {{a}} {{h}}', 'S A B C D') + '\n\n$' + VOL + ' = ?' + CM3 + '$',
    [var('a', '2..12'), var('h', '3..15')], [ev('a^2*h/3')],
    [FORMULE_PYR,
     'Aire de la base (carré) : ${{a}} ' + X + ' {{a}} = ' + ev('a^2') + CM2 + '$.',
     '$$' + VOL + ' = \\dfrac{' + ev('a^2') + ' ' + X + ' {{h}}}{3} = \\dfrac{' + ev('a^2*h')
     + '}{3} = ' + col(ev('a^2*h/3') + CM3) + '$$'],
    [multiple('a^2*h', 3), 'h <= 10*a', 'a <= 10*h'])
V29_RECT = variation(
    'La pyramide $SABCD$ a pour base le rectangle $ABCD$ de longueur ${{l}}' + CM + '$ et de largeur'
    ' ${{p}}' + CM + '$ ; sa hauteur mesure ${{h}}' + CM + '$. Calcule son volume.'
    + solide('pyramide rectangle {{l}} {{p}} {{h}}', 'S A B C D') + '\n\n$' + VOL + ' = ?' + CM3
    + '$',
    [var('l', '4..12'), var('p', '2..8'), var('h', '3..15')], [ev('l*p*h/3')],
    [FORMULE_PYR,
     'Aire de la base (rectangle) : ${{l}} ' + X + ' {{p}} = ' + ev('l*p') + CM2 + '$.',
     '$$' + VOL + ' = \\dfrac{' + ev('l*p') + ' ' + X + ' {{h}}}{3} = \\dfrac{' + ev('l*p*h')
     + '}{3} = ' + col(ev('l*p*h/3') + CM3) + '$$'],
    [multiple('l*p*h', 3), 'p < l', 'h <= 10*p'])
V29_AIRE = variation(
    'Une pyramide a une base d\'aire ${{b}}' + CM2 + '$ et une hauteur de ${{h}}' + CM + '$.'
    ' Calcule son volume.\n\n$' + VOL + ' = ?' + CM3 + '$',
    [var('b', '10..80'), var('h', '3..15')], [ev('b*h/3')],
    [FORMULE_PYR,
     '$$' + VOL + ' = \\dfrac{{{b}} ' + X + ' {{h}}}{3} = \\dfrac{' + ev('b*h') + '}{3} = '
     + col(ev('b*h/3') + CM3) + '$$'],
    [multiple('b*h', 3)])
V29_TRIANGLE = variation(
    'Une pyramide a pour base un triangle rectangle dont les côtés de l\'angle droit mesurent'
    ' ${{a}}' + CM + '$ et ${{c}}' + CM + '$ ; sa hauteur mesure ${{h}}' + CM + '$. Calcule son'
    ' volume.\n\n$' + VOL + ' = ?' + CM3 + '$',
    [var('a', '2..10'), var('c', '2..10'), var('h', '3..15')], [ev('a*c*h/6')],
    [FORMULE_PYR,
     'Aire de la base (triangle rectangle) : $\\dfrac{{{a}} ' + X + ' {{c}}}{2} = ' + ev('a*c/2')
     + CM2 + '$.',
     '$$' + VOL + ' = \\dfrac{' + ev('a*c/2') + ' ' + X + ' {{h}}}{3} = \\dfrac{' + ev('a*c*h/2')
     + '}{3} = ' + col(ev('a*c*h/6') + CM3) + '$$'],
    [multiple('a*c*h', 6), 'a != c'])
V29_PAVE = variation(
    'Un pavé droit et une pyramide ont la même base et la même hauteur. Le volume du pavé est'
    ' ${{w}}' + CM3 + '$. Quel est le volume de la pyramide ?\n\n$' + VOL + ' = ?' + CM3 + '$',
    [var('m', '4..90'), var('w', 'eval:3*m')], ['{{m}}'],
    ['Volume du pavé : aire de la base × hauteur. Volume de la pyramide : le **tiers** de ce'
     ' produit (il faut trois pyramides pour remplir le pavé).',
     '$$' + VOL + ' = \\dfrac{{{w}}}{3} = ' + col('{{m}}' + CM3) + '$$'])
V29_FORMULE = variation(
    'Quelle formule donne le volume d\'une pyramide ?'
    + choix(['$' + VOL + ' = \\text{aire de la base} ' + X + ' \\text{hauteur} ' + DIV + ' 3$',
             '$' + VOL + ' = \\text{aire de la base} ' + X + ' \\text{hauteur}$',
             '$' + VOL + ' = \\text{aire de la base} ' + X + ' \\text{hauteur} ' + DIV + ' 2$',
             '$' + VOL + ' = (\\text{aire de la base} + \\text{hauteur}) ' + DIV + ' 3$']),
    [], ['0'],
    [FORMULE_PYR,
     'Aire de la base × hauteur donne le volume du **pavé** (ou du prisme) de même base et de même'
     ' hauteur : la pyramide en est le tiers.'])

S_C = {'a': 3, 'h': 4}
MODELES.append(modele(
    '01-volume-pyramide', 'Volume d\'une pyramide',
    'Calculer le volume d\'une pyramide (aire de la base × hauteur ÷ 3) : base carrée,'
    ' rectangulaire, triangulaire ou d\'aire donnée, lien avec le pavé, formule à choisir',
    'Grandeurs', 'Volumes', 'Pyramide et cône', 1,
    [V29_FORMULE, V29_CARREE, V29_RECT, V29_AIRE, V29_TRIANGLE, V29_PAVE],
    [spec('Formule aire de la base × hauteur ÷ 3', 0, {}, '0', 'correct'),
     spec('Erreur : sans ÷ 3', 0, {}, '1', 'incorrect'),
     spec('Erreur : ÷ 2', 0, {}, '2', 'incorrect'),
     spec('Carré de côté 3, hauteur 4 : 12', 1, S_C, '12', 'correct'),
     spec('Erreur : sans ÷ 3, 36', 1, S_C, '36', 'incorrect'),
     spec('Erreur : ÷ 2, 18', 1, S_C, '18', 'incorrect'),
     spec('Erreur : côté au lieu de l\'aire, 4', 1, S_C, '4', 'incorrect'),
     spec('Rectangle 6 × 4, hauteur 5 : 40', 2, {'l': 6, 'p': 4, 'h': 5}, '40', 'correct'),
     spec('Erreur : sans ÷ 3, 120', 2, {'l': 6, 'p': 4, 'h': 5}, '120', 'incorrect'),
     spec('Base 30 cm², hauteur 7 : 70', 3, {'b': 30, 'h': 7}, '70', 'correct'),
     spec('Erreur : sans ÷ 3, 210', 3, {'b': 30, 'h': 7}, '210', 'incorrect'),
     spec('Triangle 3 et 4, hauteur 5 : 10', 4, {'a': 3, 'c': 4, 'h': 5}, '10', 'correct'),
     spec('Erreur : aire du triangle sans ÷ 2, 20', 4, {'a': 3, 'c': 4, 'h': 5}, '20',
          'incorrect'),
     spec('Pavé de 75 cm³ : 25', 5, {'m': 25, 'w': 75}, '25', 'correct'),
     spec('Erreur : même volume, 75', 5, {'m': 25, 'w': 75}, '75', 'incorrect')],
    delay=120))

# --- 2. 4-076 : volume d'un cône ---------------------------------------------------------------

FORMULE_CONE = ('Volume d\'un cône de révolution : $$' + VOL + ' = \\dfrac{\\text{aire de la base} '
                + X + ' \\text{hauteur}}{3} = \\dfrac{\\pi ' + X + ' r^2 ' + X + ' h}{3}$$')
CONE_SOLIDE = solide('cone {{r}} {{h}}', 'S O')
CONE_COND = ['2*h > r', 'h <= 10*r']


def cone_calcul(rayon, fin):
    return ['Aire de la base (disque de rayon ' + rayon + '$' + CM + '$) : $\\pi ' + X + ' ' + rayon
            + '^2 = ' + ev(rayon + '^2') + '\\pi' + CM2 + '$.'] + fin


V76_EXACT = variation(
    'Le cône de révolution de sommet $S$ a une base de centre $O$ et de rayon ${{r}}' + CM + '$ ;'
    ' sa hauteur mesure ${{h}}' + CM + '$. Calcule la valeur **exacte** de son volume.' + CONE_SOLIDE
    + '\n\n$' + VOL + ' = ?' + CM3 + '$',
    [var('r', '2..9'), var('h', '3..15')], [ev('r^2*h/3') + '\\pi'],
    [FORMULE_CONE,
     '$$' + VOL + ' = \\dfrac{\\pi ' + X + ' {{r}}^2 ' + X + ' {{h}}}{3} = \\dfrac{' + ev('r^2*h')
     + '\\pi}{3} = ' + col(ev('r^2*h/3') + '\\pi' + CM3) + '$$',
     'Valeur exacte : on garde $\\pi$ (environ ' + ev('round(r^2*h/3*\\pi)') + CM3 + ').'],
    [multiple('r^2*h', 3)] + CONE_COND)
V76_ARRONDI = variation(
    'Le cône de révolution de sommet $S$ a une base de centre $O$ et de rayon ${{r}}' + CM + '$ ;'
    ' sa hauteur mesure ${{h}}' + CM + '$. Calcule son volume, arrondi au $\\unit{cm^3}$.'
    + CONE_SOLIDE + '\n\n$' + VOL + ' \\approx ?' + CM3 + '$',
    [var('r', '2..9'), var('h', '3..15')], [ev('round(r^2*h*\\pi/3)')],
    [FORMULE_CONE,
     '$$' + VOL + ' = \\dfrac{\\pi ' + X + ' {{r}}^2 ' + X + ' {{h}}}{3} = \\dfrac{' + ev('r^2*h')
     + '\\pi}{3} \\approx ' + col(ev('round(r^2*h*\\pi/3)') + CM3) + '$$'
     + ' (à la calculatrice, arrondi à l\'unité).'],
    [loin('r^2*h*\\pi/3')] + CONE_COND)
V76_DIAMETRE = variation(
    'Un cône de révolution a pour hauteur ${{h}}' + CM + '$ ; sa base est un disque de **diamètre**'
    ' ${{d}}' + CM + '$. Calcule la valeur exacte de son volume.\n\n$' + VOL + ' = ?' + CM3 + '$',
    [var('r', '2..9'), var('d', 'eval:2*r'), var('h', '3..15')], [ev('r^2*h/3') + '\\pi'],
    ['Le rayon est la moitié du diamètre : $r = {{d}} ' + DIV + ' 2 = {{r}}' + CM + '$.',
     FORMULE_CONE,
     '$$' + VOL + ' = \\dfrac{\\pi ' + X + ' {{r}}^2 ' + X + ' {{h}}}{3} = \\dfrac{' + ev('r^2*h')
     + '\\pi}{3} = ' + col(ev('r^2*h/3') + '\\pi' + CM3) + '$$'],
    [multiple('r^2*h', 3)])
V76_CYLINDRE = variation(
    'Un cylindre de révolution et un cône de révolution ont la même base et la même hauteur. Le'
    ' volume du cylindre est ${{w}}' + CM3 + '$. Quel est le volume du cône ?\n\n$' + VOL + ' = ?'
    + CM3 + '$',
    [var('m', '4..90'), var('w', 'eval:3*m')], ['{{m}}'],
    ['Volume du cylindre : aire de la base × hauteur. Volume du cône : le **tiers** de ce produit'
     ' (il faut trois cônes pour remplir le cylindre).',
     '$$' + VOL + ' = \\dfrac{{{w}}}{3} = ' + col('{{m}}' + CM3) + '$$'])
V76_FORMULE = variation(
    'Un cône de révolution a une base de rayon $r$ et une hauteur $h$. Quelle formule donne son'
    ' volume ?'
    + choix(['$' + VOL + ' = \\dfrac{\\pi ' + X + ' r^2 ' + X + ' h}{3}$',
             '$' + VOL + ' = \\pi ' + X + ' r^2 ' + X + ' h$',
             '$' + VOL + ' = \\dfrac{\\pi ' + X + ' r ' + X + ' h}{3}$',
             '$' + VOL + ' = \\dfrac{2 ' + X + ' \\pi ' + X + ' r ' + X + ' h}{3}$']),
    [], ['0'],
    [FORMULE_CONE,
     '$\\pi ' + X + ' r^2 ' + X + ' h$ est le volume du **cylindre** de même base et de même'
     ' hauteur : le cône en est le tiers. $2 ' + X + ' \\pi ' + X + ' r$ est le périmètre du'
     ' cercle, pas l\'aire du disque.'])

S_R = {'r': 3, 'h': 4}
MODELES.append(modele(
    '02-volume-cone', 'Volume d\'un cône',
    'Calculer le volume d\'un cône de révolution (π × r² × h ÷ 3) : valeur exacte, valeur arrondie,'
    ' diamètre donné, lien avec le cylindre, formule à choisir',
    'Grandeurs', 'Volumes', 'Pyramide et cône', 2,
    [V76_FORMULE, V76_EXACT, V76_ARRONDI, V76_DIAMETRE, V76_CYLINDRE],
    [spec('Formule π r² h ÷ 3', 0, {}, '0', 'correct'),
     spec('Erreur : volume du cylindre', 0, {}, '1', 'incorrect'),
     spec('Erreur : r au lieu de r²', 0, {}, '2', 'incorrect'),
     spec('r = 3, h = 4 : 12π', 1, S_R, '12\\pi', 'correct'),
     spec('Forme à simplifier : π × 12', 1, S_R, '\\pi\\times12', 'unoptimal_form',
          ['products']),
     spec('Valeur approchée 37,7 au lieu de la valeur exacte', 1, S_R, '37{,}7', 'incorrect'),
     spec('Erreur : sans ÷ 3, 36π', 1, S_R, '36\\pi', 'incorrect'),
     spec('Erreur : r au lieu de r², 4π', 1, S_R, '4\\pi', 'incorrect'),
     spec('r = 3, h = 5 : 47', 2, {'r': 3, 'h': 5}, '47', 'correct'),
     spec('Erreur : sans ÷ 3, 141', 2, {'r': 3, 'h': 5}, '141', 'incorrect'),
     spec('Diamètre 6, h = 4 : 12π', 3, {'r': 3, 'd': 6, 'h': 4}, '12\\pi', 'correct'),
     spec('Erreur : diamètre pris pour rayon, 48π', 3, {'r': 3, 'd': 6, 'h': 4}, '48\\pi',
          'incorrect'),
     spec('Cylindre de 60 cm³ : 20', 4, {'m': 20, 'w': 60}, '20', 'correct'),
     spec('Erreur : même volume, 60', 4, {'m': 20, 'w': 60}, '60', 'incorrect')],
    delay=120))

# --- Figures sur quadrillage (4-030) -----------------------------------------------------------
# Figure F : un « L » de 2 × 3 carreaux, sommets relatifs ci-dessous. Une copie est posée par son
# coin bas-gauche (x, y) et son retournement (sx, sy) : sx = -1 symétrie d'axe vertical,
# sx = sy = -1 demi-tour. Les cas sont choisis ici, et vérifiés (fenêtre, figures disjointes).

L_SOMMETS = [(0, 0), (2, 0), (2, 1), (1, 1), (1, 3), (0, 3)]
L_L, L_H = 2, 3
LARG, HAUT = 18, 11


def sommets(x, y, sx=1, sy=1):
    return [(x + (L_L - u if sx < 0 else u), y + (L_H - w if sy < 0 else w)) for u, w in L_SOMMETS]


def boite(x, y, l=L_L, h=L_H):
    return (x, y, x + l, y + h)


def disjointes(boites, marge=1):
    for i, a in enumerate(boites):
        for b in boites[i + 1:]:
            if not (a[2] + marge <= b[0] or b[2] + marge <= a[0] or a[3] + marge <= b[1]
                    or b[3] + marge <= a[1]):
                return False
    return True


def dedans(b):
    return b[0] >= 0.5 and b[1] >= 0.5 and b[2] <= LARG - 0.5 and b[3] <= HAUT - 0.5


def fleche_boite(ax, ay, dx, dy):
    return (min(ax, ax + dx) - 0.5, min(ay, ay + dy) - 0.5, max(ax, ax + dx) + 0.5,
            max(ay, ay + dy) + 0.5)


def chercher(f, v, w):
    """Un cas : F en f, image juste en f + v, copie fausse en f + w, retournées, flèche."""
    fx, fy = f
    dx, dy = v
    juste = (fx + dx, fy + dy)
    faux = (fx + w[0], fy + w[1])
    fixes = [boite(fx, fy), boite(*juste), boite(*faux)]
    if not all(dedans(b) for b in fixes) or not disjointes(fixes):
        return None
    for mx in range(1, LARG):
        miroir = (mx, fy)  # même hauteur : vraie symétrie d'axe vertical
        b_m = boite(*miroir)
        if not dedans(b_m) or not disjointes(fixes + [b_m]):
            continue
        for rx in range(1, LARG):
            for ry in range(1, HAUT):
                b_r = boite(rx, ry)
                if not dedans(b_r) or not disjointes(fixes + [b_m, b_r]):
                    continue
                for ax in range(1, LARG):
                    for ay in range(1, HAUT):
                        b_a = fleche_boite(ax, ay, dx, dy)
                        if dedans(b_a) and disjointes(fixes + [b_m, b_r, b_a], marge=0.5):
                            return {'fx': fx, 'fy': fy, 'dx': dx, 'dy': dy, 'tx': juste[0],
                                    'ty': juste[1], 'wx': faux[0], 'wy': faux[1], 'mx': miroir[0],
                                    'my': miroir[1], 'rx': rx, 'ry': ry, 'ax': ax, 'ay': ay}
    return None


def cas_liste(fleches):
    """Pour chaque flèche v : la copie fausse w (sens contraire, puis composantes échangées…) et
    la place de F, premier cas qui tient."""
    cas = []
    for dx, dy in fleches:
        trouve = None
        for w in [(-dx, -dy), (dy, dx), (dx, -dy), (-dx, dy)]:
            if w == (dx, dy):
                continue
            for fy in range(1, HAUT):
                for fx in range(1, LARG):
                    trouve = chercher((fx, fy), (dx, dy), w)
                    if trouve:
                        break
                if trouve:
                    break
            if trouve:
                break
        assert trouve, ('cas impossible', dx, dy)
        cas.append(trouve)
    return cas


# Flèche horizontale ou verticale (variation 1), oblique (variation 2) ; copie fausse : le sens
# contraire, à défaut les composantes échangées.
CAS_DROITS = cas_liste([(6, 0), (-5, 0), (0, 4), (0, -5)])
CAS_OBLIQUES = cas_liste([(6, 3), (5, -2), (-4, 3), (7, 2)])

# Étiquettes 1 à 4 des copies (juste, fausse, miroir, demi-tour), permutées par p.
PERMS = [(1, 2, 3, 4), (3, 1, 4, 2), (2, 4, 1, 3), (4, 3, 2, 1)]


def cas_vars(cas):
    noms = ['fx', 'fy', 'dx', 'dy', 'tx', 'ty', 'wx', 'wy', 'mx', 'my', 'rx', 'ry', 'ax', 'ay']
    return [var('c', '0..' + str(len(cas) - 1))] + [var(n, selon('c', [k[n] for k in cas]))
                                                     for n in noms]


def poly_dsl(nom, x, y, sx=1, sy=1, etiquette=None):
    """Polygone en L posé en (x, y) (noms de variables), sommets masqués ; étiquette au centre du
    carreau du pied."""
    lignes = []
    for j, (u, w) in enumerate(L_SOMMETS):
        px = x + ' + ' + str(u) if sx > 0 else x + ' + ' + str(L_L - u)
        py = y + ' + ' + str(w) if sy > 0 else y + ' + ' + str(L_H - w)
        lignes.append(nom + str(j) + ' = point(' + ev(px) + ', ' + ev(py) + ', visible=faux)')
    lignes.append(nom + ' = polygone(' + ', '.join(nom + str(j) for j in range(6))
                  + ', remplissage="bleu")')
    if etiquette:
        cx = x + ' + 0.5' if sx > 0 else x + ' + 1.5'
        cy = y + ' + 0.5' if sy > 0 else y + ' + 2.5'
        lignes.append('texte(' + ev(cx) + ', ' + ev(cy) + ', "' + etiquette + '")')
    return '\n'.join(lignes) + '\n'


def fleche_dsl(ax='ax', ay='ay', dx='dx', dy='dy', nom_a='A', nom_b='B'):
    return (nom_a + ' = point(' + ev(ax) + ', ' + ev(ay) + ', etiquette="gauche")\n' + nom_b
            + ' = point(' + ev(ax + ' + ' + dx) + ', ' + ev(ay + ' + ' + dy) + ', etiquette="droite")\n'
            + 'vecteur(' + nom_a + ', ' + nom_b + ')\n')


def quadrillage(description, corps, largeur=LARG, hauteur=HAUT):
    return ('\n\n```figure\nfenetre: 0 ; ' + str(largeur) + ' ; 0 ; ' + str(hauteur)
            + '\ngrille: 1\ndescription: ' + description + '\n---\n' + corps + '```')


def etiq(slot):
    return selon('p', [perm[slot] for perm in PERMS])


FIG_IMAGES = quadrillage(
    'Quadrillage : une flèche de A vers B, la figure F et quatre figures numérotées.',
    fleche_dsl() + poly_dsl('F', 'fx', 'fy', etiquette='F')
    + poly_dsl('G', 'tx', 'ty', etiquette=etiq(0)) + poly_dsl('H', 'wx', 'wy', etiquette=etiq(1))
    + poly_dsl('K', 'mx', 'my', sx=-1, etiquette=etiq(2))
    + poly_dsl('M', 'rx', 'ry', sx=-1, sy=-1, etiquette=etiq(3)))


def deplacement(dx, dy):
    """« 6 carreaux vers la droite et 3 vers le haut » à partir des nombres du cas."""
    parties = []
    if dx:
        parties.append(str(abs(dx)) + ' carreaux vers la ' + ('droite' if dx > 0 else 'gauche'))
    if dy:
        parties.append(str(abs(dy)) + ' carreaux vers le ' + ('haut' if dy > 0 else 'bas'))
    return ' et '.join(parties)


def image_figure(cas):
    return variation(
        'La translation qui transforme $A$ en $B$ transforme la figure F en l\'une des figures'
        ' numérotées. Laquelle ?' + FIG_IMAGES
        + choix(['la figure ' + etiq(k) for k in range(4)]),
        cas_vars(cas) + [var('p', '0..3')], ['0'],
        ['La translation qui transforme $A$ en $B$ fait **glisser** toute la figure comme la'
         ' flèche : ' + selon('c', [deplacement(k['dx'], k['dy']) for k in cas]) + '.',
         'La figure F glisse sans tourner ni se retourner : son image est '
         + col('\\text{la figure ' + etiq(0) + '}') + '.',
         'La figure ' + etiq(1) + ' a glissé dans une autre direction ; la figure ' + etiq(2)
         + ' est retournée (symétrie axiale) ; la figure ' + etiq(3) + ' a fait un demi-tour.'])


V30_DROIT = image_figure(CAS_DROITS)
V30_OBLIQUE = image_figure(CAS_OBLIQUES)

# Image d'un point : C et quatre points nommés ; juste C + v, faux C − v, composantes échangées,
# une composante oubliée.
CAS_POINTS = []


def cas_point(dx, dy):
    """C et la flèche placés pour que les cinq points et la flèche tiennent sans se toucher."""
    for cy in range(1, HAUT):
        for cx in range(1, LARG):
            pts = [(cx + dx, cy + dy), (cx - dx, cy - dy), (cx + dy, cy + dx), (cx + dx, cy)]
            tous = pts + [(cx, cy)]
            if len(set(tous)) < 5 or not all(1 <= x <= LARG - 1 and 1 <= y <= HAUT - 1
                                               for x, y in tous):
                continue
            for ay in range(1, HAUT):
                for ax in range(1, LARG):
                    b_a = fleche_boite(ax, ay, dx, dy)
                    if dedans(b_a) and all(not (b_a[0] - 0.5 <= x <= b_a[2] + 0.5
                                                and b_a[1] - 0.5 <= y <= b_a[3] + 0.5)
                                           for x, y in tous):
                        return {'cx': cx, 'cy': cy, 'dx': dx, 'dy': dy, 'ax': ax, 'ay': ay,
                                **{n + str(k): v for k, pt_ in enumerate(pts)
                                   for n, v in zip('xy', pt_)}}
    raise AssertionError(('cas impossible', dx, dy))


CAS_POINTS = [cas_point(dx, dy) for dx, dy in [(5, 3), (6, -2), (-4, 3), (3, -4)]]
NOMS_POINTS = ['R', 'S', 'T', 'U']


def nom_point(slot):
    return selon('p', [NOMS_POINTS[perm[slot] - 1] for perm in PERMS])


V30_POINT = variation(
    'Quel point est l\'image du point $C$ par la translation qui transforme $A$ en $B$ ?'
    + quadrillage(
        'Quadrillage : une flèche de A vers B, le point C et quatre points nommés.',
        fleche_dsl() + 'C = point(' + ev('cx') + ', ' + ev('cy') + ', etiquette="haut-gauche")\n'
        + ''.join(nom_point(k) + ' = point(' + ev('x' + str(k)) + ', ' + ev('y' + str(k))
                  + ', etiquette="haut-droite")\n' for k in range(4)))
    + choix(['le point $' + nom_point(k) + '$' for k in range(4)]),
    [var('c', '0..3')] + [var(n, selon('c', [k[n] for k in CAS_POINTS]))
                          for n in ['cx', 'cy', 'dx', 'dy', 'ax', 'ay', 'x0', 'y0', 'x1', 'y1',
                                    'x2', 'y2', 'x3', 'y3']]
    + [var('p', '0..3')], ['0'],
    ['On fait glisser $C$ comme la flèche de $A$ vers $B$ : '
     + selon('c', [deplacement(k['dx'], k['dy']) for k in CAS_POINTS]) + '.',
     'L\'image de $C$ est ' + col('\\text{le point }' + nom_point(0)) + '.'])

# Transformation qui fait passer de F à G : w = 0 translation, 1 symétrie axiale, 2 demi-tour.
TRANSFORMATIONS = ['une translation', 'une symétrie axiale', 'un demi-tour']
FIG_FG = quadrillage(
    'Quadrillage : la figure F et la figure G.',
    poly_dsl('F', '2', 'fy', etiquette='F')
    + '\n'.join(selon('w', [l0, l1, l2]) for l0, l1, l2 in zip(
        poly_dsl('G', 'gx', 'gy', etiquette='G').split('\n'),
        poly_dsl('G', 'gx', 'fy', sx=-1, etiquette='G').split('\n'),
        poly_dsl('G', 'gx', 'gy', sx=-1, sy=-1, etiquette='G').split('\n'))))
V30_QUELLE = variation(
    'Par quelle transformation passe-t-on de la figure F à la figure G ?' + FIG_FG
    + choix([selon('w', TRANSFORMATIONS),
             selon('w', [TRANSFORMATIONS[(j + 1) % 3] for j in range(3)]),
             selon('w', [TRANSFORMATIONS[(j + 2) % 3] for j in range(3)])]),
    [var('w', '0..2'), var('fy', '1..6'), var('gx', '8..12'), var('gy', '1..6')], ['0'],
    [selon('w', ['G est F qui a **glissé**, sans tourner ni se retourner : c\'est',
                 'G est F **retournée**, comme dans un miroir vertical : c\'est',
                 'G est F qui a **tourné d\'un demi-tour** (la tête en bas) : c\'est'])
     + ' ' + col('\\text{' + selon('w', TRANSFORMATIONS) + '}') + '.'])

MODELES.append(modele(
    '03-effet-translation', 'Effet d\'une translation',
    'Reconnaître l\'image d\'une figure ou d\'un point par la translation qui transforme A en B'
    ' (flèche sur quadrillage), et distinguer translation, symétrie axiale et demi-tour',
    'Géométrie', 'Translations', 'Image d\'une figure', 1,
    [V30_DROIT, V30_OBLIQUE, V30_POINT, V30_QUELLE],
    [spec('Figure juste (droite)', 0, {**{n['name']: CAS_DROITS[0].get(n['name'], 0)
                                          for n in cas_vars(CAS_DROITS)}, 'c': 0, 'p': 0}, '0',
          'correct'),
     spec('Erreur : la figure retournée', 0, {**{n['name']: CAS_DROITS[0].get(n['name'], 0)
                                                 for n in cas_vars(CAS_DROITS)}, 'c': 0, 'p': 0},
          '2', 'incorrect'),
     spec('Figure juste (oblique)', 1, {**{n['name']: CAS_OBLIQUES[1].get(n['name'], 0)
                                           for n in cas_vars(CAS_OBLIQUES)}, 'c': 1, 'p': 2}, '0',
          'correct'),
     spec('Point juste', 2, {**CAS_POINTS[0], 'c': 0, 'p': 0}, '0', 'correct'),
     spec('Erreur : sens contraire', 2, {**CAS_POINTS[0], 'c': 0, 'p': 0}, '1', 'incorrect'),
     spec('Translation', 3, {'w': 0, 'fy': 2, 'gx': 9, 'gy': 4}, '0', 'correct'),
     spec('Symétrie axiale', 3, {'w': 1, 'fy': 2, 'gx': 9, 'gy': 4}, '0', 'correct'),
     spec('Erreur : demi-tour pris pour une translation', 3, {'w': 2, 'fy': 2, 'gx': 9, 'gy': 4},
          '1', 'incorrect')]))

# --- 4. 4-031 : translation et parallélogramme -------------------------------------------------
# Cas de A, B (flèche) et C, D = C + (B − A) : jamais alignés.

CAS_PARA = []
for a, b, c in [((1, 1), (7, 2), (3, 5)), ((2, 5), (8, 4), (1, 2)), ((1, 2), (6, 5), (6, 1)),
                ((3, 1), (9, 1), (1, 5))]:
    d = (c[0] + b[0] - a[0], c[1] + b[1] - a[1])
    det = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])
    assert det != 0, ('alignés', a, b, c)
    assert all(0 < x < 13 and 0 < y < 8 for x, y in (a, b, c, d)), ('hors fenêtre', a, b, c, d)
    CAS_PARA.append({'xa': a[0], 'ya': a[1], 'xb': b[0], 'yb': b[1], 'xc': c[0], 'yc': c[1],
                     'xd': d[0], 'yd': d[1]})
PARA_VARS = [var('c', '0..3')] + [var(n, selon('c', [k[n] for k in CAS_PARA]))
                                  for n in ['xa', 'ya', 'xb', 'yb', 'xc', 'yc', 'xd', 'yd']]


def pt(nom, etiquette):
    return (nom + ' = point(' + ev('x' + nom.lower()) + ', ' + ev('y' + nom.lower())
            + ', etiquette="' + etiquette + '")\n')


V31_NATURE = variation(
    'Le point $D$ est l\'image du point $C$ par la translation qui transforme $A$ en $B$. Quelle'
    ' est la nature du quadrilatère $ABDC$ ?'
    + quadrillage('Quadrillage : les points A, B, C, D et les flèches de A vers B et de C vers D.',
                  pt('A', 'bas-gauche') + pt('B', 'bas-droite') + pt('C', 'haut-gauche')
                  + pt('D', 'haut-droite') + 'vecteur(A, B)\nvecteur(C, D, trait="tirets")\n',
                  largeur=13, hauteur=8)
    + choix(['un parallélogramme', 'un trapèze qui n\'est pas un parallélogramme',
             'on ne peut pas savoir']),
    PARA_VARS, ['0'],
    ['$C$ glisse comme $A$ glisse vers $B$ : $(CD)$ est parallèle à $(AB)$, et $CD = AB$.',
     'Si $D$ est l\'image de $C$ par la translation qui transforme $A$ en $B$, alors $ABDC$ est '
     + col('\\text{un parallélogramme}') + ' (attention à l\'ordre des lettres : $A$, $B$, puis'
     ' $D$, $C$).'])
V31_IMAGE = variation(
    'Le quadrilatère $ABDC$ est un parallélogramme. '
    + selon('q', ['Quelle est l\'image du point $C$ par la translation qui transforme $A$ en $B$ ?',
                  'Quelle est l\'image du point $A$ par la translation qui transforme $C$ en $D$ ?'])
    + '\n\n```figure\nfenetre: 0 ; 13 ; 0 ; 8\ndescription: Parallélogramme ABDC.\n---\n'
    + pt('A', 'bas-gauche') + pt('B', 'bas-droite') + pt('C', 'haut-gauche') + pt('D', 'haut-droite')
    + 'polygone(A, B, D, C)\n```'
    + choix(['le point $' + selon('q', ['D', 'B']) + '$', 'le point $' + selon('q', ['B', 'D']) + '$',
             'le point $' + selon('q', ['A', 'C']) + '$']),
    PARA_VARS + [var('q', '0..1')], ['0'],
    ['$ABDC$ est un parallélogramme : ' + selon('q', ['$C$ glisse vers $D$ comme $A$ glisse vers $B$',
                                                      '$A$ glisse vers $B$ comme $C$ glisse vers $D$'])
     + ' (côtés opposés $[AB]$ et $[CD]$ parallèles et de même longueur).',
     'L\'image est ' + col('\\text{le point }' + selon('q', ['D', 'B'])) + '.'])

# Frise : cinq parallélogrammes numérotés, espacés de 3 carreaux ; la flèche vaut k espacements.
FRISE = ''.join(
    ''.join('Q' + str(n) + str(j) + ' = point(' + str(1 + 3 * n + u) + ', ' + str(1 + w)
            + ', visible=faux)\n' for j, (u, w) in enumerate([(0, 0), (2, 0), (3, 2), (1, 2)]))
    + 'polygone(' + ', '.join('Q' + str(n) + str(j) for j in range(4)) + ', remplissage="bleu")\n'
    + 'texte(' + str(2.5 + 3 * n) + ', 2, "' + str(n + 1) + '")\n' for n in range(5))
AUTRES = {k: [x for x in (2, 3, 4, 5) if x != 1 + k] for k in (1, 2, 3)}
V31_FRISE = variation(
    'Quelle est l\'image de la figure 1 par la translation qui transforme $A$ en $B$ ?'
    + quadrillage('Quadrillage : une frise de cinq parallélogrammes numérotés et une flèche de A'
                  ' vers B.',
                  FRISE + 'A = point(1, 5, etiquette="gauche")\nB = point(' + ev('1 + 3*k')
                  + ', 5, etiquette="droite")\nvecteur(A, B)\n', largeur=17, hauteur=7)
    + choix(['la figure ' + ev('1 + k')]
            + ['la figure ' + selon('k', [''] + [AUTRES[k][j] for k in (1, 2, 3)])
               for j in range(3)]),
    [var('k', '1..3')], ['0'],
    ['La flèche mesure ' + ev('3*k') + ' carreaux vers la droite : la figure 1 glisse de '
     + ev('3*k') + ' carreaux.',
     'Son image est ' + col('\\text{la figure }' + ev('1 + k')) + '.'])

S_PARA = {**CAS_PARA[0], 'c': 0}
MODELES.append(modele(
    '04-translation-parallelogramme', 'Translation et parallélogramme',
    'Faire le lien entre la translation qui transforme A en B et le parallélogramme ABDC : nature'
    ' du quadrilatère, image d\'un point, frise de parallélogrammes',
    'Géométrie', 'Translations', 'Parallélogramme', 1,
    [V31_NATURE, V31_IMAGE, V31_FRISE],
    [spec('ABDC parallélogramme', 0, S_PARA, '0', 'correct'),
     spec('Erreur : on ne peut pas savoir', 0, S_PARA, '2', 'incorrect'),
     spec('Image de C : D', 1, {**S_PARA, 'q': 0}, '0', 'correct'),
     spec('Erreur : B', 1, {**S_PARA, 'q': 0}, '1', 'incorrect'),
     spec('Image de A : B', 1, {**S_PARA, 'q': 1}, '0', 'correct'),
     spec('Frise k = 2 : figure 3', 2, {'k': 2}, '0', 'correct'),
     spec('Erreur : figure voisine', 2, {'k': 2}, '1', 'incorrect')]))

# --- 5. 4-032 : ce que conserve une translation ------------------------------------------------

TRIANGLES = (
    '\n\n```figure\nfenetre: 0 ; 12 ; 0 ; 7.5\ndescription: Le triangle ABC et son image, le'
    ' triangle DEF. Figure qui n\'est pas à l\'échelle.\n---\n'
    'A = point(1, 1, etiquette="bas-gauche")\nB = point(5, 1.5, etiquette="bas-droite")\n'
    'C = point(2.5, 4, etiquette="haut")\nD = point(6.5, 3.5, etiquette="bas-gauche")\n'
    'E = point(10.5, 4, etiquette="bas-droite")\nF = point(8, 6.5, etiquette="haut")\n'
    'polygone(A, B, C)\npolygone(D, E, F)\n```')
IMAGE = ('Le triangle $DEF$ est l\'image du triangle $ABC$ par la translation qui transforme $A$ en'
         ' $D$ (figure qui n\'est pas à l\'échelle).')
CONSERVE = 'Une translation fait glisser la figure sans la déformer : elle **conserve** '

V32_LONGUEUR = variation(
    IMAGE + ' On donne $AB = {{ab}}' + CM + '$ et $AD = {{ad}}' + CM + '$. Combien mesure $[DE]$ ?'
    + TRIANGLES + '\n\n$DE = ?' + CM + '$',
    [var('ab', '3..12'), var('ad', '5..15')], ['{{ab}}'],
    [CONSERVE + 'les longueurs.',
     '$[DE]$ est l\'image de $[AB]$ : $DE = AB = ' + col('{{ab}}' + CM) + '$. La longueur $AD$'
     ' de la flèche ne sert pas.'],
    ['ad != ab'])
V32_ANGLE = variation(
    IMAGE + ' On donne $\\widehat{ABC} = {{ang}}^\\circ$. Combien mesure $\\widehat{DEF}$ ?'
    + TRIANGLES + '\n\n$\\widehat{DEF} = ?^\\circ$',
    [var('ang', '25..80')], ['{{ang}}'],
    [CONSERVE + 'les angles.',
     '$\\widehat{DEF}$ est l\'image de $\\widehat{ABC}$ : $\\widehat{DEF} = \\widehat{ABC} = '
     + col('{{ang}}^\\circ') + '$.'])
V32_AIRE = variation(
    IMAGE + ' L\'aire du triangle $ABC$ est ${{air}}' + CM2 + '$. Quelle est l\'aire du triangle'
    ' $DEF$ ?' + TRIANGLES + '\n\n$\\text{Aire} = ?' + CM2 + '$',
    [var('air', '6..40')], ['{{air}}'],
    [CONSERVE + 'les longueurs et les angles, donc les aires.',
     'Aire de $DEF$ = aire de $ABC$ = ' + '$' + col('{{air}}' + CM2) + '$.'])
V32_DROITE = variation(
    'Par une translation, une droite $(d)$ a pour image une droite $(d\')$. Que peut-on dire de'
    ' $(d\')$ ?'
    + choix(['$(d\')$ est parallèle à $(d)$', '$(d\')$ est perpendiculaire à $(d)$',
             '$(d\')$ coupe $(d)$ en un seul point']),
    [], ['0'],
    [CONSERVE + 'la direction des droites.',
     'L\'image d\'une droite par une translation est ' + col('\\text{une droite parallèle}')
     + ' (parfois confondue avec elle, si la flèche suit la droite).'])
V32_LISTE = variation(
    'Qu\'est-ce qu\'une translation conserve ? Coche toutes les bonnes réponses.'
    + choix(['les longueurs', 'les angles', 'les aires', 'la position de chaque point'],
            plusieurs=True),
    [], ['0;1;2'],
    [CONSERVE + 'les longueurs, les angles et les aires : $' + col('\\text{les trois}') + '$.',
     'Elle déplace en revanche chaque point : la position change.'])

MODELES.append(modele(
    '05-conservations-translation', 'Ce que conserve une translation',
    'Utiliser les propriétés de conservation d\'une translation : longueur, angle, aire d\'une'
    ' figure image, image d\'une droite',
    'Géométrie', 'Translations', 'Conservations', 1,
    [V32_LISTE, V32_LONGUEUR, V32_ANGLE, V32_AIRE, V32_DROITE],
    [spec('Longueurs, angles, aires', 0, {}, '0;1;2', 'correct'),
     spec('Erreur : la position aussi', 0, {}, '0;1;2;3', 'incorrect'),
     spec('AB = 5 : DE = 5', 1, {'ab': 5, 'ad': 9}, '5', 'correct'),
     spec('Erreur : AB + AD, 14', 1, {'ab': 5, 'ad': 9}, '14', 'incorrect'),
     spec('Erreur : AD, 9', 1, {'ab': 5, 'ad': 9}, '9', 'incorrect'),
     spec('Angle 47° : 47', 2, {'ang': 47}, '47', 'correct'),
     spec('Erreur : 180 − 47, 133', 2, {'ang': 47}, '133', 'incorrect'),
     spec('Aire 18 : 18', 3, {'air': 18}, '18', 'correct'),
     spec('Erreur : aire doublée, 36', 3, {'air': 18}, '36', 'incorrect'),
     spec('Parallèle', 4, {}, '0', 'correct'),
     spec('Erreur : perpendiculaire', 4, {}, '1', 'incorrect')]))

os.makedirs(DOSSIER, exist_ok=True)
for nom, m in MODELES:
    with open(os.path.join(DOSSIER, nom + '.json'), 'w', encoding='utf-8') as f:
        json.dump(m, f, ensure_ascii=False, indent='\t')
        f.write('\n')
# Mis en forme comme le pre-commit, pour que le script redonne les fichiers commités
subprocess.run(['pnpm', 'exec', 'prettier', '--write', DOSSIER], check=True,
               stdout=subprocess.DEVNULL)
print(f'{len(MODELES)} modèles écrits dans {DOSSIER}')
