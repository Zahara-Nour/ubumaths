"""Écrit les 8 modèles du lot 9 du CE2 (longueurs, fraction de l'unité, masses) dans scripts/questions/ce2-9/.

Phase 0 validée par David le 2026-11-06 (§ 15 du journal `docs/wip/questions-ce2-progress.md`,
« tes recos ? » puis « ok »). Bornes `cycle2.json` : CE2-012 (règle en quarts et en dixièmes d'une
unité, huitièmes du livret ; « 2 u + 1/4 u », encadrer entre deux dixièmes), CE2-040 (longueurs de
référence : objets familiers et distances), CE2-041 (estimer), CE2-042 (le périmètre), CE2-044
(périmètre à la règle graduée, aucune formule), CE2-049 (masses de référence), CE2-050 (estimer une
masse : feuille, pomme, dictionnaire, seau d'eau, voiture ; en g ou kg). Décisions :

1. 044 : polygone « démonté », chaque côté posé sur sa règle dessinée.
2. 040 : repères qui ne dépendent pas de l'école (¼ h à pied, 1 h d'autoroute, la France).
3. 050 : g et kg seulement (voiture ≈ 1 000 kg) ; la tonne au 049.
4. 012 : « ? u + ? u », la fraction dans la seconde case ; simplification coupée (2/8 = 1/4).

Gabarits : `lot-ce1-5.py` (références, estimations), `lot-ce1-10.py` (règle graduée),
`lot-ce2-8.py` (figures). Variables à une lettre ; jamais `e` ni `i` ; points nommés `abcdfghj`.

    python3 docs/wip/questions/lot-ce2-9.py scripts/questions/ce2-9
"""
import json
import math
import sys

DOSSIER = sys.argv[1]
NOMS = 'abcdfghjkmn'  # noms internes des points (jamais e ni i)

# ---- Gabarits ----


def spec(desc, vi, variables, answers, status):
    return {'description': desc, 'variationIndex': vi,
            'variables': {k: str(x) for k, x in variables.items()},
            'answers': answers if isinstance(answers, list) else [answers],
            'expected': {'status': status}}


def modele(title, description, level, variations, specs, delay=60, fractions=False):
    # ni theme, ni domain, ni subdomain (ADR 0035) : le rangement est posé par la migration
    m = {'title': title, 'description': description, 'grades': ['CE2'], 'level': level,
         'delay': delay, 'status': 'draft'}
    if fractions:
        # la simplification n'est pas du CE2 : 2/8 juste pour 1/4 (comme au lot 4)
        m['options'] = {'constraints': {'reducedFractions': 'off'}}
    m['variations'] = variations
    m['testSpecs'] = specs
    return m


def var(nom, expression):
    return {'name': nom, 'expression': expression}


def variation(statement, reponses, variables, etapes, conditions=None):
    v = {'statement': statement, 'variables': variables}
    if conditions:
        v['conditions'] = conditions
    v['blanks'] = [{'expectedAnswer': r} for r in reponses]
    v['correction'] = {'steps': etapes}
    return v


def choix(lignes, melanger=True):
    tete = '' if melanger else 'melanger: non\n'
    return '\n\n```choix\n' + tete + ''.join('- ' + c + '\n' for c in lignes) + '```'


def choix_dessins(blocs):
    """Choix dont chaque option est une figure (clôture ```` autour)."""
    items = []
    for lignes in blocs:
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


def col(x, k=0):
    """Couleur DANS une formule (entre `$…$`)."""
    return '\\textcolor{{{color:primary.' + str(k) + '}}}{' + x + '}'


def colt(x, k=0):
    """Mots en couleur dans le texte : une formule à part."""
    return '$' + col('\\text{' + x + '}', k) + '$'


def fr(n, d):
    return '\\frac{' + str(n) + '}{' + str(d) + '}'


def nombre(x):
    x = round(x, 2)
    return str(int(x)) if x == int(x) else str(x)


def figure(description, lignes, fenetre, grille=False, taille=None):
    tete = f'fenetre: {fenetre}\n' + ('grille: oui\n' if grille else '') \
        + (f'taille: {taille}\n' if taille else '')
    return ('```figure\n' + tete + 'description: ' + description + '\n---\n' + '\n'.join(lignes)
            + '\n```')


def demi(base, a):
    """`base + a/2` écrit en décimal (`eval:` rendrait 9/2 en fraction LaTeX, refusée par une
    figure) : partie entière, point, puis 0 ou 5."""
    return ('{{eval:' + base + '+floor(' + a + '/2)}}.{{eval:5*(' + a + '-2*floor(' + a
            + '/2))}}')


U = '~\\text{u}'
MILLE = '1\\,000'

# ---- 01, 02. Mesurer avec une unité partagée (CE2-012) ----


def regle_u(nu, parts, w):
    """Règle de `nu` unités, chacune de largeur `w`, partagée en `parts` parts égales."""
    lignes = ['regle1 = point(-0.4, 0, visible=faux)',
              f'regle2 = point({nombre(nu * w + 0.4)}, 0, visible=faux)',
              f'regle3 = point({nombre(nu * w + 0.4)}, 1.4, visible=faux)',
              'regle4 = point(-0.4, 1.4, visible=faux)',
              'regle = polygone(regle1, regle2, regle3, regle4, couleur="noir")']
    for g in range(nu * parts + 1):
        x = nombre(g * w / parts)
        bas = 0.7 if g % parts == 0 else 1.0
        lignes += [f'g{g}a = point({x}, 1.4, visible=faux)',
                   f'g{g}b = point({x}, {bas}, visible=faux)',
                   f'segment(g{g}a, g{g}b, couleur="noir", epaisseur={2 if bas == 0.7 else 1})']
        if g % parts == 0:
            lignes.append(f'texte({x}, 0.35, "{g // parts}")')
    return lignes


def segment_au_dessus(debut, fin):
    return [f'M = point({debut}, 2, visible=faux)',
            f'N = point({fin}, 2, visible=faux)',
            's = segment(M, N, couleur="bleu", epaisseur=3)',
            f'Mt1 = point({debut}, 1.7, visible=faux)',
            f'Mt2 = point({debut}, 2.3, visible=faux)',
            'segment(Mt1, Mt2, couleur="bleu", epaisseur=3)',
            f'Nt1 = point({fin}, 1.7, visible=faux)',
            f'Nt2 = point({fin}, 2.3, visible=faux)',
            'segment(Nt1, Nt2, couleur="bleu", epaisseur=3)']


def figure_u(nu, parts, w, fin, description):
    largeur = nu * w
    return figure(description, regle_u(nu, parts, w) + segment_au_dessus('0', fin),
                  f'-0.8 ; {nombre(largeur + 0.8)} ; -0.6 ; 3')


def intro_u(parts_nom, parts):
    return ('Sur cette règle, l\'unité est **u**. Chaque unité est partagée en $' + str(parts)
            + '$ parts égales : chaque part est ' + parts_nom + '.\n\n')


QUARTS = variation(
    intro_u('un quart d\'unité, $' + fr(1, 4) + U + '$', 4)
    + 'Quelle est la longueur du segment bleu ?\n\n'
    + figure_u(3, 4, 4, ev('4*n+a'), 'Une règle de 3 unités, chaque unité partagée en 4 ; un'
               ' segment bleu part du 0 et finit sur une petite graduation.')
    + '\n\nLe segment mesure $?' + U + ' + ?' + U + '$.',
    ['{{n}}', fr('{{a}}', 4)], [var('n', '1..2'), var('a', '1..3')],
    ['Le segment part du $0$ et dépasse la graduation ${{n}}$ : il mesure ${{n}}' + U
     + '$, et encore un morceau.',
     'Après la graduation ${{n}}$, il compte ${{a}}$ {{if:a==1|part|parts}} : ${{a}}$'
     ' {{if:a==1|quart|quarts}} d\'unité, $' + fr('{{a}}', 4) + U + '$.',
     '$$' + col('{{n}}') + U + ' + ' + col(fr('{{a}}', 4)) + U + '$$'])

HUITIEMES = variation(
    intro_u('un huitième d\'unité, $' + fr(1, 8) + U + '$', 8)
    + 'Quelle est la longueur du segment bleu ?\n\n'
    + figure_u(3, 8, 4, demi('4*n', 'a'), 'Une règle de 3 unités, chaque unité partagée en 8 ; un'
               ' segment bleu part du 0 et finit sur une petite graduation.')
    + '\n\nLe segment mesure $?' + U + ' + ?' + U + '$.',
    ['{{n}}', fr('{{a}}', 8)], [var('n', '1..2'), var('a', '1..7')],
    ['Le segment part du $0$ et dépasse la graduation ${{n}}$ : il mesure ${{n}}' + U
     + '$, et encore un morceau.',
     'Après la graduation ${{n}}$, il compte ${{a}}$ {{if:a==1|part|parts}} : ${{a}}$'
     ' {{if:a==1|huitième|huitièmes}} d\'unité, $' + fr('{{a}}', 8) + U + '$.',
     '$$' + col('{{n}}') + U + ' + ' + col(fr('{{a}}', 8)) + U + '$$'])

MOINS_D_UNE = variation(
    intro_u('un huitième d\'unité, $' + fr(1, 8) + U + '$', 8)
    + 'Quelle est la longueur du segment bleu ?\n\n'
    + figure_u(2, 8, 4, demi('0', 'a'), 'Une règle de 2 unités, chaque unité partagée en 8 ; un'
               ' segment bleu part du 0 et finit avant la graduation 1.')
    + '\n\nLe segment mesure $?' + U + '$.',
    [fr('{{a}}', 8)], [var('a', '2..7')],
    ['Le segment ne va pas jusqu\'à la graduation $1$ : il mesure moins d\'une unité.',
     'Il compte ${{a}}$ parts : ${{a}}$ huitièmes d\'unité.',
     '$$' + col(fr('{{a}}', 8)) + U + '$$'])

SPECS_QUARTS = [
    spec('BO : 2 u + 1/4 u', 0, {'n': 2, 'a': 1}, ['2', '\\frac{1}{4}'], 'correct'),
    spec('1 u + 3/4 u', 0, {'n': 1, 'a': 3}, ['1', '\\frac{3}{4}'], 'correct'),
    spec('Erreur : graduations comptées (2/4 au lieu de 1/4)', 0, {'n': 2, 'a': 1},
         ['2', '\\frac{2}{4}'], 'incorrect'),
    spec('Erreur : toute la longueur en quarts dans la seconde case (9/4)', 0, {'n': 2, 'a': 1},
         ['2', '\\frac{9}{4}'], 'incorrect'),
    spec('Erreur : 1/2 au lieu de 1/4', 0, {'n': 2, 'a': 1}, ['2', '\\frac{1}{2}'], 'incorrect'),
    spec('Livret : 2 u + 5/8 u', 1, {'n': 2, 'a': 5}, ['2', '\\frac{5}{8}'], 'correct'),
    spec('2/8 juste pour 1/4 (simplification non exigée)', 1, {'n': 1, 'a': 2},
         ['1', '\\frac{2}{8}'], 'correct'),
    spec('1/4 = 2/8 aussi', 1, {'n': 1, 'a': 2}, ['1', '\\frac{1}{4}'], 'correct'),
    spec('Erreur : huitièmes lus en quarts (5/4)', 1, {'n': 2, 'a': 5}, ['2', '\\frac{5}{4}'],
         'incorrect'),
    spec('Erreur : 6/8 (graduations comptées)', 1, {'n': 2, 'a': 5}, ['2', '\\frac{6}{8}'],
         'incorrect'),
    spec('Livret : 7/8 u', 2, {'a': 7}, '\\frac{7}{8}', 'correct'),
    spec('Erreur : 7 (parts sans le dénominateur)', 2, {'a': 7}, '7', 'incorrect'),
    spec('Erreur : 7/16 (toute la règle prise pour l\'unité)', 2, {'a': 7}, '\\frac{7}{16}',
         'incorrect'),
    spec('4/8 = 1/2', 2, {'a': 4}, '\\frac{1}{2}', 'correct'),
]

DIXIEMES_INTRO = intro_u('un dixième d\'unité, $' + fr(1, 10) + U + '$', 10)

DIXIEMES = variation(
    DIXIEMES_INTRO + 'Quelle est la longueur du segment bleu ?\n\n'
    + figure_u(2, 10, 5, demi('5', 'a'), 'Une règle de 2 unités, chaque unité partagée en 10 ; un'
               ' segment bleu part du 0 et finit sur une petite graduation après le 1.')
    + '\n\nLe segment mesure $?' + U + ' + ?' + U + '$.',
    ['1', fr('{{a}}', 10)], [var('a', '1..9')],
    ['Le segment part du $0$ et dépasse la graduation $1$ : il mesure $1' + U
     + '$, et encore un morceau.',
     'Après la graduation $1$, il compte ${{a}}$ {{if:a==1|part|parts}} : ${{a}}$'
     ' {{if:a==1|dixième|dixièmes}} d\'unité.',
     '$$' + col('1') + U + ' + ' + col(fr('{{a}}', 10)) + U + '$$'])

ENCADRER = variation(
    DIXIEMES_INTRO + 'Le bout du segment bleu tombe entre deux graduations.\n\n'
    + figure_u(2, 10, 5, '{{eval:5+floor(a/2)}}.{{eval:50*(a-2*floor(a/2))+5*f}}', 'Une règle de 2 unités, chaque unité partagée en 10 ;'
               ' un segment bleu part du 0 et finit entre deux petites graduations après le 1.')
    + '\n\nLe segment mesure plus de $1' + U + ' + ?' + U + '$ et moins de $1' + U + ' + ?' + U
    + '$.',
    [fr('{{a}}', 10), fr(ev('a+1'), 10)], [var('a', '1..8'), var('f', '3..7')],
    ['Le segment dépasse la graduation $1$, puis ${{a}}$ dixièmes, sans arriver au suivant.',
     'Il mesure plus de $1' + U + ' + ' + col(fr('{{a}}', 10)) + U + '$ et moins de $1' + U
     + ' + ' + col(fr(ev('a+1'), 10)) + U + '$.'])

SPECS_DIXIEMES = [
    spec('1 u + 3/10 u', 0, {'a': 3}, ['1', '\\frac{3}{10}'], 'correct'),
    spec('Erreur : 13/10 dans la seconde case', 0, {'a': 3}, ['1', '\\frac{13}{10}'],
         'incorrect'),
    spec('Erreur : 4/10 (graduations comptées)', 0, {'a': 3}, ['1', '\\frac{4}{10}'], 'incorrect'),
    spec('Erreur : 0 u (unité oubliée)', 0, {'a': 3}, ['0', '\\frac{3}{10}'], 'incorrect'),
    spec('5/10 = 1/2', 0, {'a': 5}, ['1', '\\frac{1}{2}'], 'correct'),
    spec('Entre 1 u + 4/10 et 1 u + 5/10', 1, {'a': 4, 'f': 5},
         ['\\frac{4}{10}', '\\frac{5}{10}'], 'correct'),
    spec('Erreur : encadrement renversé', 1, {'a': 4, 'f': 5}, ['\\frac{5}{10}', '\\frac{4}{10}'],
         'incorrect'),
    spec('Erreur : à deux dixièmes près', 1, {'a': 4, 'f': 5}, ['\\frac{3}{10}', '\\frac{5}{10}'],
         'incorrect'),
    spec('Erreur : en quarts', 1, {'a': 4, 'f': 5}, ['\\frac{1}{4}', '\\frac{2}{4}'], 'incorrect'),
]

# ---- 03. Longueurs de référence (CE2-040) ----


def L(n, u):
    return '$' + str(n) + '~\\unit{' + u + '}$'


REFERENCES = ('Quelques longueurs à retenir : l\'épaisseur d\'une carte de cantine fait environ'
              ' $1~\\unit{mm}$, la largeur d\'un doigt environ $1~\\unit{cm}$, la largeur d\'une'
              ' main environ $1~\\unit{dm}$, un grand pas environ $1~\\unit{m}$ ; à pied, on fait'
              ' $1~\\unit{km}$ en un quart d\'heure ; en voiture sur l\'autoroute, environ'
              ' $100~\\unit{km}$ en une heure ; la France mesure environ $' + MILLE
              + '~\\unit{km}$ d\'un bout à l\'autre.')

# (longueur, juste, leurre, leurre) : la bonne réponse en premier, mélangée à l'affichage
QUOI = [
    (L(1, 'mm'), 'l\'épaisseur d\'une carte de cantine', 'la largeur d\'un doigt',
     'la largeur d\'une main'),
    (L(1, 'cm'), 'la largeur d\'un doigt', 'l\'épaisseur d\'une carte de cantine',
     'la longueur d\'une règle d\'écolier'),
    (L(1, 'dm'), 'la largeur d\'une main', 'la largeur d\'un doigt', 'un grand pas'),
    (L(1, 'm'), 'un grand pas', 'la largeur d\'une main', 'la longueur d\'un bus'),
    (L(2, 'm'), 'la hauteur d\'une porte', 'la longueur d\'un crayon', 'la longueur d\'un bus'),
    (L(1, 'km'), 'le chemin qu\'on fait à pied en un quart d\'heure', 'le tour de la classe',
     'le trajet d\'une heure sur l\'autoroute'),
    (L(100, 'km'), 'le trajet d\'une heure en voiture sur l\'autoroute',
     'le chemin qu\'on fait à pied en un quart d\'heure', 'la France d\'un bout à l\'autre'),
    ('$' + MILLE + '~\\unit{km}$', 'la France d\'un bout à l\'autre',
     'le trajet d\'une heure en voiture sur l\'autoroute', 'le tour de la cour de l\'école'),
]

QUI_MESURE = variation(
    'Qu\'est-ce qui mesure environ ' + selon('k', [q[0] for q in QUOI]) + ' ?'
    + choix([selon('k', [q[j] for q in QUOI]) for j in (1, 2, 3)]), ['0'],
    [var('k', '1..8')],
    [REFERENCES, 'C\'est ' + selon('k', [q[1] for q in QUOI]) + ' qui mesure environ '
     + selon('k', [q[0] for q in QUOI]) + '.'])

UNITES = ['mm', 'cm', 'dm', 'm', 'km']
# (objet, nombre, indice de l'unité)
ENVIRON = [('L\'épaisseur d\'une carte de cantine', 1, 0), ('La largeur d\'un doigt', 1, 1),
           ('La largeur d\'une main', 1, 2), ('Un grand pas', 1, 3),
           ('La hauteur d\'une porte', 2, 3),
           ('Le chemin qu\'on fait à pied en un quart d\'heure', 1, 4),
           ('Le trajet d\'une heure en voiture sur l\'autoroute', 100, 4)]
NOMBRE_K = selon('k', [str(n) for _, n, _ in ENVIRON])

MESURE_ENVIRON = variation(
    selon('k', [o for o, _, _ in ENVIRON]) + ' mesure environ…'
    + choix(['$' + NOMBRE_K + '~\\unit{' + u + '}$' for u in UNITES], melanger=False),
    ['{{r}}'], [var('k', '1..7'), var('r', selon('k', [r for _, _, r in ENVIRON]))],
    [REFERENCES, selon('k', [o + ' mesure environ ' + L(n, UNITES[r]) + '.'
                             for o, n, r in ENVIRON])])

SPECS_REFERENCES = [
    spec('environ 1 mm : la carte', 0, {'k': 1}, '0', 'correct'),
    spec('Erreur : 1 mm, le doigt', 0, {'k': 1}, '1', 'incorrect'),
    spec('environ 1 dm : la main', 0, {'k': 3}, '0', 'correct'),
    spec('Erreur : 1 dm, un grand pas', 0, {'k': 3}, '2', 'incorrect'),
    spec('environ 100 km : une heure d\'autoroute', 0, {'k': 7}, '0', 'correct'),
    spec('Erreur : 100 km à pied en un quart d\'heure', 0, {'k': 7}, '1', 'incorrect'),
    spec('environ 1 000 km : la France', 0, {'k': 8}, '0', 'correct'),
    spec('main : 1 dm', 1, {'k': 3, 'r': 2}, '2', 'correct'),
    spec('Erreur : main de 1 cm', 1, {'k': 3, 'r': 2}, '1', 'incorrect'),
    spec('porte : 2 m', 1, {'k': 5, 'r': 3}, '3', 'correct'),
    spec('autoroute : 100 km', 1, {'k': 7, 'r': 4}, '4', 'correct'),
    spec('Erreur : 100 m en une heure d\'autoroute', 1, {'k': 7, 'r': 4}, '3', 'incorrect'),
]

# ---- 04. Estimer une longueur (CE2-041) ----
# Trois réponses de plus en plus grandes, même chiffre ; (objet, petite, moyenne, grande, r)
ESTIMER = [
    ('Une fourmi', L(5, 'mm'), L(5, 'cm'), L(5, 'dm'), 0),
    ('Un timbre', L(3, 'cm'), L(3, 'dm'), L(3, 'm'), 0),
    ('L\'épaisseur d\'une pièce de monnaie', L(2, 'mm'), L(2, 'cm'), L(2, 'dm'), 0),
    ('Un crayon neuf', L(18, 'mm'), L(18, 'cm'), L(18, 'm'), 1),
    ('La largeur d\'une feuille de cahier', L(2, 'cm'), L(2, 'dm'), L(2, 'm'), 1),
    ('La cour de l\'école', L(30, 'cm'), L(30, 'm'), L(30, 'km'), 1),
    ('Un bus', L(12, 'cm'), L(12, 'm'), L(12, 'km'), 1),
    ('L\'épaisseur d\'un livre', L(2, 'mm'), L(2, 'cm'), L(2, 'dm'), 1),
    ('La hauteur de la classe', L(3, 'mm'), L(3, 'cm'), L(3, 'm'), 2),
    ('Un lit', L(2, 'cm'), L(2, 'dm'), L(2, 'm'), 2),
    ('Une randonnée d\'une journée', L(20, 'm'), L(200, 'm'), L(20, 'km'), 2),
    ('La route d\'une ville à la ville voisine', L(15, 'm'), L(150, 'm'), L(15, 'km'), 2),
]

PLUTOT = variation(
    selon('k', [o[0] for o in ESTIMER]) + ' mesure plutôt…'
    + choix([selon('k', [o[j] for o in ESTIMER]) for j in (1, 2, 3)], melanger=False),
    ['{{r}}'], [var('k', '1..12'), var('r', selon('k', [o[4] for o in ESTIMER]))],
    ['On compare avec des longueurs connues : une carte de cantine a environ $1~\\unit{mm}$'
     ' d\'épaisseur, un doigt environ $1~\\unit{cm}$ de large, une main $1~\\unit{dm}$, un grand'
     ' pas $1~\\unit{m}$ ; à pied, on fait $1~\\unit{km}$ en un quart d\'heure.',
     selon('k', [o[0] + ' mesure plutôt ' + o[1 + o[4]] + '.' for o in ESTIMER])])

SPECS_ESTIMER = [
    spec('fourmi : 5 mm', 0, {'k': 1, 'r': 0}, '0', 'correct'),
    spec('Erreur : fourmi de 5 cm', 0, {'k': 1, 'r': 0}, '1', 'incorrect'),
    spec('crayon : 18 cm', 0, {'k': 4, 'r': 1}, '1', 'correct'),
    spec('Erreur : crayon de 18 mm', 0, {'k': 4, 'r': 1}, '0', 'incorrect'),
    spec('feuille : 2 dm', 0, {'k': 5, 'r': 1}, '1', 'correct'),
    spec('cour : 30 m', 0, {'k': 6, 'r': 1}, '1', 'correct'),
    spec('Erreur : cour de 30 km', 0, {'k': 6, 'r': 1}, '2', 'incorrect'),
    spec('classe : 3 m de haut', 0, {'k': 9, 'r': 2}, '2', 'correct'),
    spec('route vers la ville voisine : 15 km', 0, {'k': 12, 'r': 2}, '2', 'correct'),
    spec('Erreur : 150 m', 0, {'k': 12, 'r': 2}, '1', 'incorrect'),
]

# ---- 05. Qu'est-ce que le périmètre ? (CE2-042) ----

DEFINITION = variation(
    '{{if:k==1|Le périmètre d\'une figure, c\'est…|Pour poser une clôture tout autour d\'un'
    ' jardin, il faut connaître…}}'
    + choix(['{{if:k==1|la longueur de son tour.|le périmètre du jardin.}}',
             '{{if:k==1|la place qu\'elle occupe à l\'intérieur.|la place qu\'il y a dans le'
             ' jardin.}}',
             '{{if:k==1|la longueur de son plus grand côté.|la longueur du plus grand côté du'
             ' jardin.}}',
             '{{if:k==1|le nombre de ses côtés.|le nombre de côtés du jardin.}}']),
    ['0'], [var('k', '1..2')],
    ['Le ' + colt('périmètre') + ' d\'une figure est la **longueur de son tour** : on fait le tour'
     ' de la figure et on additionne les longueurs de tous ses côtés.',
     '{{if:k==2|La clôture fait le tour du jardin : il faut connaître son périmètre.|La place à'
     ' l\'intérieur, ce n\'est pas le périmètre.}}'])

# Trois formes à 4 sommets (k) ; trois dessins : le tour en couleur (juste), l'intérieur
# colorié, un seul côté en couleur.
FORMES = [[(0, 0), (5, 0), (5, 3), (0, 3)], [(0, 0), (6, 0), (4.5, 3), (1, 3)],
          [(0, 0), (5, 0.8), (4, 3.4), (0.6, 2.6)]]


def coords(k, presets):
    n = len(presets[0])
    return [(selon(k, [nombre(p[s][0]) for p in presets]),
             selon(k, [nombre(p[s][1]) for p in presets])) for s in range(n)]


def points(k, presets):
    return [f'{nom} = point({x}, {y}, visible=faux)'
            for nom, (x, y) in zip(NOMS, coords(k, presets))]


FEN_FORMES = 'fenetre: -0.5 ; 6.5 ; -0.5 ; 3.9'
DESSIN_TOUR = [FEN_FORMES, 'description: Le tour de la figure, tracé en couleur et en gras.',
               '---'] + points('k', FORMES) + [
    'q = polygone(a, b, c, d, couleur="rouge", epaisseur=5)']
DESSIN_DEDANS = [FEN_FORMES, 'description: L\'intérieur de la figure, colorié.', '---'] \
    + points('k', FORMES) + [
    'q = polygone(a, b, c, d, couleur="noir", remplissage="rouge", opacite_fond=0.5)']
DESSIN_COTE = [FEN_FORMES, 'description: Un seul côté de la figure, en couleur et en gras.',
               '---'] + points('k', FORMES) + [
    'q = polygone(a, b, c, d, couleur="noir")', 's = segment(a, b, couleur="rouge", epaisseur=5)']

MONTRE = variation(
    'Sur quel dessin voit-on le **périmètre** de la figure ?'
    + choix_dessins([DESSIN_TOUR, DESSIN_DEDANS, DESSIN_COTE]),
    ['0'], [var('k', '1..3')],
    ['Le périmètre est la longueur du **tour** de la figure : c\'est le dessin où tout le tour est'
     ' en couleur.',
     'L\'intérieur colorié, ce n\'est pas le périmètre ; un seul côté non plus.'])

# Deux rectangles sur quadrillage : (largeur A, hauteur A, largeur B, hauteur B, r)
# r : 0 = A, 1 = B, 2 = même périmètre ; le plus « gros » n'a pas toujours le plus long tour
PAIRES = [(3, 3, 1, 6, 1), (2, 5, 3, 3, 0), (4, 2, 3, 3, 2), (4, 4, 2, 7, 1), (1, 5, 2, 3, 0),
          (2, 6, 4, 4, 2)]
for a, b, c, d, r in PAIRES:
    pa, pb = 2 * (a + b), 2 * (c + d)
    assert r == (0 if pa > pb else 1 if pb > pa else 2), (a, b, c, d)


def rect_lignes(nom, x0, y0, w, h, couleur):
    p = [(x0, y0), (f'eval:{x0}+{w}', y0), (f'eval:{x0}+{w}', f'eval:{y0}+{h}'),
         (x0, f'eval:{y0}+{h}')]
    out = []
    for j, (x, y) in enumerate(p):
        fx = '{{' + x + '}}' if str(x).startswith('eval') else x
        fy = '{{' + y + '}}' if str(y).startswith('eval') else y
        out.append(f'{nom}{j} = point({fx}, {fy}, visible=faux)')
    out.append(f'{nom} = polygone({nom}0, {nom}1, {nom}2, {nom}3, couleur="{couleur}",'
               ' epaisseur=3)')
    return out


QUADRILLAGE = variation(
    'Sur ce quadrillage, quelle figure a le plus grand périmètre ?\n\n'
    + figure('Deux rectangles A et B tracés sur un quadrillage.',
             rect_lignes('ra', 1, 1, 'a', 'b', 'bleu')
             + rect_lignes('rb', 8, 1, 'c', 'd', 'orange')
             + ['texte(1.5, {{eval:1+b}}.5, "A")', 'texte(8.5, {{eval:1+d}}.5, "B")'],
             '0 ; 14 ; 0 ; 9', grille=True)
    + choix(['la figure A', 'la figure B', 'elles ont le même périmètre'], melanger=False),
    ['{{r}}'],
    [var('k', '1..6'), var('a', selon('k', [p[0] for p in PAIRES])),
     var('b', selon('k', [p[1] for p in PAIRES])), var('c', selon('k', [p[2] for p in PAIRES])),
     var('d', selon('k', [p[3] for p in PAIRES])), var('r', selon('k', [p[4] for p in PAIRES]))],
    ['On compte les côtés de carreaux tout autour de chaque figure.',
     'Tour de A : ${{a}} + {{b}} + {{a}} + {{b}} = ' + ev('2*(a+b)') + '$.',
     'Tour de B : ${{c}} + {{d}} + {{c}} + {{d}} = ' + ev('2*(c+d)') + '$.',
     '{{if:r==0|' + colt('A') + ' a le plus grand périmètre.|{{if:r==1|' + colt('B')
     + ' a le plus grand périmètre.|' + colt('Elles ont le même périmètre.') + '}}}}',
     'Attention : la figure qui prend le plus de place n\'a pas toujours le plus long tour.'])

SPECS_PERIMETRE = [
    spec('la longueur du tour', 0, {'k': 1}, '0', 'correct'),
    spec('Erreur : l\'intérieur', 0, {'k': 1}, '1', 'incorrect'),
    spec('clôture : le périmètre', 0, {'k': 2}, '0', 'correct'),
    spec('Erreur : le plus grand côté', 0, {'k': 2}, '2', 'incorrect'),
    spec('le tour en couleur', 1, {'k': 2}, '0', 'correct'),
    spec('Erreur : l\'intérieur colorié', 1, {'k': 2}, '1', 'incorrect'),
    spec('Erreur : un seul côté', 1, {'k': 3}, '2', 'incorrect'),
    spec('3×3 (12) contre 1×6 (14) : B', 2, {'k': 1, 'a': 3, 'b': 3, 'c': 1, 'd': 6, 'r': 1},
         '1', 'correct'),
    spec('Erreur : A, qui prend plus de place', 2,
         {'k': 1, 'a': 3, 'b': 3, 'c': 1, 'd': 6, 'r': 1}, '0', 'incorrect'),
    spec('4×2 et 3×3 : même périmètre', 2, {'k': 3, 'a': 4, 'b': 2, 'c': 3, 'd': 3, 'r': 2}, '2',
         'correct'),
    spec('Erreur : 3×3 plus grand', 2, {'k': 3, 'a': 4, 'b': 2, 'c': 3, 'd': 3, 'r': 2}, '1',
         'incorrect'),
]

# ---- 06. Périmètre à la règle (CE2-044) ----
# Le polygone est dessiné en petit ; chacun de ses côtés est posé sur sa propre règle (cm).

REGLE_MAX = 12


def regle_cm():
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


def cote_sur_regle(nom, depart, longueur):
    """Figure : le côté `nom` posé sur la règle, de `depart` à `depart + longueur`."""
    fin = '{{eval:' + depart + '+' + longueur + '}}'
    debut = '{{' + depart + '}}' if not depart.isdigit() else depart
    milieu = demi(depart, longueur)
    return figure(f'Le côté {nom} du polygone posé au-dessus d\'une règle graduée en centimètres.',
                  regle_cm() + segment_au_dessus(debut, fin) + [f'texte({milieu}, 2.75, "{nom}")'],
                  f'-0.8 ; {REGLE_MAX + 0.8} ; -0.4 ; 3.2')


def ajuste(pts, W=10, H=6):
    """Met le polygone à l'échelle de la fenêtre 0..W × 0..H, centré, avec une marge."""
    xs, ys = [p[0] for p in pts], [p[1] for p in pts]
    s = min((W - 2) / (max(xs) - min(xs)), (H - 2) / (max(ys) - min(ys)))
    cx, cy = (min(xs) + max(xs)) / 2, (min(ys) + max(ys)) / 2
    return [(round(W / 2 + s * (x - cx), 2), round(H / 2 + s * (y - cy), 2)) for x, y in pts]


def triangle(a, b, c):
    """AB = a, BC = b, CA = c."""
    x = (a * a + c * c - b * b) / (2 * a)
    return [(0, 0), (a, 0), (x, math.sqrt(c * c - x * x))]


def maison(w, h, r):
    """Base w, murs h, pans du toit r."""
    return [(0, 0), (w, 0), (w, h), (w / 2, h + math.sqrt(r * r - w * w / 4)), (0, h)]


def cotes(pts):
    n = len(pts)
    return [round(math.dist(pts[j], pts[(j + 1) % n]), 6) for j in range(n)]


TRIANGLES = [(6, 8, 10), (5, 5, 6), (4, 6, 7), (7, 7, 7), (5, 7, 9), (8, 8, 4)]
QUADRIS = [[(0, 0), (8, 0), (8, 3), (0, 3)], [(0, 0), (5, 0), (5, 5), (0, 5)],
           [(0, 0), (10, 0), (7, 4), (3, 4)], [(0, 0), (8, 0), (5, 4), (0, 4)],
           [(0, 0), (5, 0), (8, 4), (3, 4)], [(0, 0), (9, 0), (9, 4), (3, 4)]]
MAISONS = [(6, 4, 5), (4, 3, 3), (8, 3, 5), (6, 6, 5)]

POLY_T = [triangle(*t) for t in TRIANGLES]
POLY_M = [maison(*m) for m in MAISONS]
for jeu in (POLY_T, QUADRIS, POLY_M):
    for p in jeu:
        for x in cotes(p):
            assert abs(x - round(x)) < 1e-6 and 2 <= x <= 10, (p, x)

LETTRES = 'ABCDE'
OFFSETS = 'pqstv'  # départs sur la règle (jamais e ni i)
LONGUEURS = 'abcdf'


def etiquettes(k, presets, ecart=0.45):
    lignes = []
    for s in range(len(presets[0])):
        xs, ys = [], []
        for p in presets:
            gx, gy = sum(q[0] for q in p) / len(p), sum(q[1] for q in p) / len(p)
            x, y = p[s]
            n = math.hypot(x - gx, y - gy)
            xs.append(nombre(x + ecart * (x - gx) / n))
            ys.append(nombre(y + ecart * (y - gy) / n - 0.15))
        lignes.append(f'texte({selon(k, xs)}, {selon(k, ys)}, "{LETTRES[s]}")')
    return lignes


def perimetre(polys, departs, intro):
    n = len(polys[0])
    dessins = [ajuste(p) for p in polys]
    noms = [LETTRES[j] + LETTRES[(j + 1) % n] for j in range(n)]
    longueurs = [[int(round(x)) for x in cotes(p)] for p in polys]
    variables = [var('k', f'1..{len(polys)}')]
    variables += [var(LONGUEURS[j], selon('k', [lg[j] for lg in longueurs])) for j in range(n)]
    variables += [var(OFFSETS[j], departs) for j in range(n)]
    variables.append(var('z', 'eval:' + '+'.join(LONGUEURS[:n])))
    poly = figure('Un polygone à ' + str(n) + ' sommets nommés ' + ', '.join(LETTRES[:n])
                  + ', dessiné en petit.',
                  points('k', dessins)
                  + [f'q = polygone({", ".join(NOMS[:n])}, couleur="bleu", epaisseur=2)']
                  + etiquettes('k', dessins), '0 ; 10 ; 0 ; 6')
    regles = '\n\n'.join(cote_sur_regle(noms[j], OFFSETS[j], LONGUEURS[j]) for j in range(n))
    cases = ' ; '.join('$' + noms[j] + ' = ?~\\text{cm}$' for j in range(n))
    statement = (intro + '\n\n' + poly + '\n\nOn a posé chacun de ses côtés sur une règle.\n\n'
                 + regles + '\n\nMesure chaque côté, puis trouve le périmètre du polygone.\n\n'
                 + cases + '\n\nPérimètre : $?~\\text{cm}$')
    reponses = ['{{' + LONGUEURS[j] + '}}' for j in range(n)] + ['{{z}}']
    etapes = []
    for j in range(n):
        o, lg = OFFSETS[j], LONGUEURS[j]
        etapes.append('{{if:' + o + '==0|' + noms[j] + ' part du $0$ et va jusqu\'au ${{' + lg
                      + '}}$ : $' + noms[j] + ' = {{' + lg + '}}~\\unit{cm}$.|' + noms[j]
                      + ' va du ${{' + o + '}}$ au $' + ev(o + '+' + lg) + '$ : $' + ev(o + '+' + lg)
                      + ' - {{' + o + '}} = {{' + lg + '}}$, donc $' + noms[j] + ' = {{' + lg
                      + '}}~\\unit{cm}$.}}')
    etapes.append('Le périmètre est la longueur du tour : on additionne les ' + str(n)
                  + ' côtés.')
    etapes.append('$$' + ' + '.join('{{' + LONGUEURS[j] + '}}' for j in range(n)) + ' = '
                  + col('{{z}}') + '~\\unit{cm}$$')
    return variation(statement, reponses, variables, etapes)


TRI_0 = perimetre(POLY_T, '0', 'Voici un triangle ABC.')
QUADRI = perimetre(QUADRIS, '1..2', 'Voici un quadrilatère ABCD. Attention : les côtés ne sont'
                   ' pas posés au $0$ de la règle.')
MAISON = perimetre(POLY_M, '0..2', 'Voici un polygone ABCDE en forme de maison.')


def sp(desc, vi, k, polys, departs, answers, status):
    lg = [int(round(x)) for x in cotes(polys[k - 1])]
    v = {'k': k}
    for j, x in enumerate(lg):
        v[LONGUEURS[j]] = x
        v[OFFSETS[j]] = departs[j]
    v['z'] = sum(lg)
    return spec(desc, vi, v, [str(a) for a in answers], status)


SPECS_REGLE = [
    sp('Triangle 6, 8, 10 : 24 cm', 0, 1, POLY_T, [0, 0, 0], [6, 8, 10, 24], 'correct'),
    sp('Erreur : côté oublié (14)', 0, 1, POLY_T, [0, 0, 0], [6, 8, 10, 14], 'incorrect'),
    sp('Erreur : côté compté deux fois (34)', 0, 1, POLY_T, [0, 0, 0], [6, 8, 10, 34],
       'incorrect'),
    sp('Triangle 5, 5, 6 : 16 cm', 0, 2, POLY_T, [0, 0, 0], [5, 5, 6, 16], 'correct'),
    sp('Rectangle 8 × 3, départs au 1 et au 2 : 22 cm', 1, 1, QUADRIS, [1, 2, 1, 2],
       [8, 3, 8, 3, 22], 'correct'),
    sp('Erreur : départ non retiré (9, 5, 9, 5)', 1, 1, QUADRIS, [1, 2, 1, 2], [9, 5, 9, 5, 28],
       'incorrect'),
    sp('Erreur : deux côtés seulement (11)', 1, 1, QUADRIS, [1, 2, 1, 2], [8, 3, 8, 3, 11],
       'incorrect'),
    sp('Carré de 5 : 20 cm, sans formule', 1, 2, QUADRIS, [2, 1, 1, 2], [5, 5, 5, 5, 20],
       'correct'),
    sp('Trapèze 10, 5, 4, 5 : 24 cm', 1, 3, QUADRIS, [1, 1, 2, 2], [10, 5, 4, 5, 24], 'correct'),
    sp('Maison 6, 4, 5, 5, 4 : 24 cm', 2, 1, POLY_M, [0, 1, 2, 0, 1], [6, 4, 5, 5, 4, 24],
       'correct'),
    sp('Erreur : toit oublié (14)', 2, 1, POLY_M, [0, 1, 2, 0, 1], [6, 4, 5, 5, 4, 14],
       'incorrect'),
    sp('Erreur : bouts lus sans retirer le départ', 2, 1, POLY_M, [0, 1, 2, 0, 1],
       [6, 5, 7, 5, 5, 28], 'incorrect'),
]

# ---- 07. Masses de référence (CE2-049) ----


def M(n, u):
    return '$' + str(n) + '~\\unit{' + u + '}$'


REF_MASSES = ('Quelques masses à retenir : un trombone pèse environ $1~\\unit{g}$, une tablette de'
              ' chocolat $100~\\unit{g}$, une bouteille d\'eau d\'un litre $1~\\unit{kg}$, un seau'
              ' d\'eau plein $10~\\unit{kg}$, une voiture $1~\\unit{t}$ (une tonne, c\'est $' + MILLE
              + '~\\unit{kg}$).')

PESE_QUOI = [
    (M(1, 'g'), 'un trombone', 'une pomme', 'un dictionnaire'),
    (M(100, 'g'), 'une tablette de chocolat', 'un trombone', 'un seau d\'eau plein'),
    (M(1, 'kg'), 'une bouteille d\'eau d\'un litre', 'une tablette de chocolat', 'une voiture'),
    (M(10, 'kg'), 'un seau d\'eau plein', 'une bouteille d\'eau d\'un litre', 'un trombone'),
    (M(1, 't'), 'une voiture', 'un seau d\'eau plein', 'un vélo'),
]

QUI_PESE = variation(
    'Qu\'est-ce qui pèse environ ' + selon('k', [q[0] for q in PESE_QUOI]) + ' ?'
    + choix([selon('k', [q[j] for q in PESE_QUOI]) for j in (1, 2, 3)]), ['0'],
    [var('k', '1..5')],
    [REF_MASSES, 'C\'est ' + selon('k', [q[1] for q in PESE_QUOI]) + ' qui pèse environ '
     + selon('k', [q[0] for q in PESE_QUOI]) + '.'])

UNITES_M = ['g', 'kg', 't']
PESE_ENV = [('Un trombone', 1, 0), ('Une tablette de chocolat', 100, 0),
            ('Une bouteille d\'eau d\'un litre', 1, 1), ('Un seau d\'eau plein', 10, 1),
            ('Une voiture', 1, 2)]

PESE_ENVIRON = variation(
    selon('k', [o for o, _, _ in PESE_ENV]) + ' pèse environ…'
    + choix(['$' + selon('k', [str(n) for _, n, _ in PESE_ENV]) + '~\\unit{' + u + '}$'
             for u in UNITES_M], melanger=False),
    ['{{r}}'], [var('k', '1..5'), var('r', selon('k', [r for _, _, r in PESE_ENV]))],
    [REF_MASSES, selon('k', [o + ' pèse environ ' + M(n, UNITES_M[r]) + '.'
                             for o, n, r in PESE_ENV])])

SPECS_MASSES_REF = [
    spec('environ 1 g : le trombone', 0, {'k': 1}, '0', 'correct'),
    spec('Erreur : 1 g, le dictionnaire', 0, {'k': 1}, '2', 'incorrect'),
    spec('environ 1 kg : la bouteille d\'un litre', 0, {'k': 3}, '0', 'correct'),
    spec('environ 1 t : la voiture', 0, {'k': 5}, '0', 'correct'),
    spec('Erreur : 1 t, le seau d\'eau', 0, {'k': 5}, '1', 'incorrect'),
    spec('tablette : 100 g', 1, {'k': 2, 'r': 0}, '0', 'correct'),
    spec('Erreur : tablette de 100 kg', 1, {'k': 2, 'r': 0}, '1', 'incorrect'),
    spec('voiture : 1 t', 1, {'k': 5, 'r': 2}, '2', 'correct'),
    spec('Erreur : voiture de 1 kg', 1, {'k': 5, 'r': 2}, '1', 'incorrect'),
]

# ---- 08. Estimer une masse (CE2-050) ----
# g et kg seulement (BO) ; (objet, petite, moyenne, grande, r)
MASSES = [
    ('Une feuille de papier', M(5, 'g'), M(50, 'g'), M(5, 'kg'), 0),
    ('Une pièce de 1 euro', M(7, 'g'), M(70, 'g'), M(7, 'kg'), 0),
    ('Un morceau de sucre', M(5, 'g'), M(50, 'g'), M(5, 'kg'), 0),
    ('Une pomme', M(15, 'g'), M(150, 'g'), M(15, 'kg'), 1),
    ('Un œuf', M(6, 'g'), M(60, 'g'), M(6, 'kg'), 1),
    ('Une baguette de pain', M(25, 'g'), M(250, 'g'), M(25, 'kg'), 1),
    ('Un enfant de CE2', M(3, 'kg'), M(30, 'kg'), M(300, 'kg'), 1),
    ('Un dictionnaire', M(2, 'g'), M(20, 'g'), M(2, 'kg'), 2),
    ('Un seau d\'eau plein', M(10, 'g'), M(100, 'g'), M(10, 'kg'), 2),
    ('Une voiture', M(10, 'kg'), M(100, 'kg'), '$' + MILLE + '~\\unit{kg}$', 2),
    ('Un chat', M(4, 'g'), M(40, 'g'), M(4, 'kg'), 2),
    ('Un cartable plein', M(4, 'g'), M(400, 'g'), M(4, 'kg'), 2),
]

PESE_PLUTOT = variation(
    selon('k', [o[0] for o in MASSES]) + ' pèse plutôt…'
    + choix([selon('k', [o[j] for o in MASSES]) for j in (1, 2, 3)], melanger=False),
    ['{{r}}'], [var('k', '1..12'), var('r', selon('k', [o[4] for o in MASSES]))],
    ['On compare avec des masses connues : un trombone pèse environ $1~\\unit{g}$, une tablette de'
     ' chocolat $100~\\unit{g}$, une bouteille d\'eau d\'un litre $1~\\unit{kg}$.',
     selon('k', [o[0] + ' pèse plutôt ' + o[1 + o[4]] + '.' for o in MASSES])])

SPECS_ESTIMER_M = [
    spec('BO : feuille, 5 g', 0, {'k': 1, 'r': 0}, '0', 'correct'),
    spec('Erreur : feuille de 50 g', 0, {'k': 1, 'r': 0}, '1', 'incorrect'),
    spec('BO : pomme, 150 g', 0, {'k': 4, 'r': 1}, '1', 'correct'),
    spec('Erreur : pomme de 15 kg', 0, {'k': 4, 'r': 1}, '2', 'incorrect'),
    spec('BO : dictionnaire, 2 kg', 0, {'k': 8, 'r': 2}, '2', 'correct'),
    spec('Erreur : dictionnaire de 20 g', 0, {'k': 8, 'r': 2}, '1', 'incorrect'),
    spec('BO : seau d\'eau, 10 kg', 0, {'k': 9, 'r': 2}, '2', 'correct'),
    spec('BO : voiture, 1 000 kg', 0, {'k': 10, 'r': 2}, '2', 'correct'),
    spec('Erreur : voiture de 100 kg', 0, {'k': 10, 'r': 2}, '1', 'incorrect'),
]

MODELES = {
    '01-regle-en-quarts': modele(
        'Mesurer avec une unité partagée en quarts ou en huitièmes',
        'Règle d\'unité u partagée en 4 ou en 8 : 2 u + 1/4 u ; 1 u + 5/8 u ; 7/8 u',
        1, [QUARTS, HUITIEMES, MOINS_D_UNE], SPECS_QUARTS, delay=90, fractions=True),
    '02-regle-en-dixiemes': modele(
        'Mesurer avec une unité partagée en dixièmes',
        'Règle d\'unité u partagée en 10 : 1 u + 3/10 u ; encadrer entre deux dixièmes',
        2, [DIXIEMES, ENCADRER], SPECS_DIXIEMES, delay=90, fractions=True),
    '03-longueurs-de-reference': modele(
        'Des longueurs de référence, du millimètre au kilomètre',
        'Carte 1 mm, doigt 1 cm, main 1 dm, grand pas 1 m, porte 2 m, 1 km à pied en un quart'
        ' d\'heure, 100 km en une heure d\'autoroute, la France 1 000 km',
        5, [QUI_MESURE, MESURE_ENVIRON], SPECS_REFERENCES, delay=45),
    '04-estimer-une-longueur': modele(
        'Estimer une longueur ou une distance',
        'Une fourmi mesure plutôt 5 mm, 5 cm ou 5 dm ? La cour : 30 cm, 30 m ou 30 km ?',
        6, [PLUTOT], SPECS_ESTIMER, delay=45),
    '05-qu-est-ce-que-le-perimetre': modele(
        'Qu\'est-ce que le périmètre ?',
        'Le périmètre est la longueur du tour ; le dessin qui le montre ; le plus grand périmètre'
        ' sur quadrillage',
        1, [DEFINITION, MONTRE, QUADRILLAGE], SPECS_PERIMETRE, delay=60),
    '06-perimetre-a-la-regle': modele(
        'Le périmètre d\'un polygone, mesuré à la règle',
        'Chaque côté posé sur une règle (au 0 ou non), puis la somme des côtés ; triangle,'
        ' quadrilatère, maison à 5 côtés',
        2, [TRI_0, QUADRI, MAISON], SPECS_REGLE, delay=150),
    '07-masses-de-reference': modele(
        'Des masses de référence, du gramme à la tonne',
        'Trombone 1 g, tablette de chocolat 100 g, bouteille d\'un litre 1 kg, seau d\'eau 10 kg,'
        ' voiture 1 t',
        4, [QUI_PESE, PESE_ENVIRON], SPECS_MASSES_REF, delay=45),
    '08-estimer-une-masse': modele(
        'Estimer une masse',
        'Une pomme pèse plutôt 15 g, 150 g ou 15 kg ? Feuille, dictionnaire, seau d\'eau,'
        ' voiture (1 000 kg)',
        5, [PESE_PLUTOT], SPECS_ESTIMER_M, delay=45),
}

for nom, m in MODELES.items():
    with open(f'{DOSSIER}/{nom}.json', 'w') as f:
        json.dump(m, f, ensure_ascii=False, indent='\t')
        f.write('\n')
print(len(MODELES), 'modèles écrits')
