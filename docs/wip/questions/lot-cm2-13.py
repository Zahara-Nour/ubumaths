"""Écrit les 5 modèles du lot 13 du CM2 (aires) dans scripts/questions/cm2-13/.

Phase 0 validée par David le 2026-11-19 (§ 20 et 20.1 du journal
`docs/archive/wip/questions-cm2-progress.md`, « je suis tes recos ») : 5 modèles (CM2-073, 074, 075, 120,
072), tous au niveau 1 de leur sous-notion ; rien de plus pour 071 ; 13-2 sans les deux sauts
m² ↔ cm² ; côtés en cm en V1 et V2, en m ou dm dans le problème (V3), nombres entiers.

Bornes (`cycle3.json`) : 073, cm², dm², m² seulement (BO) ; 074, conversions entre m², dm², cm²
(« 3,7 dm² en cm² ») ; 075 et 120, côtés entiers en cm, formule connue ; 072, carreaux entiers et
demi-carreaux, encadrement (seul l'encadrement manque aux modèles CM1 + CM2 `31d64c00`).

Pièges (relus dans le journal) : aucune `{{if}}` dans une réponse attendue ; `i` et `e` jamais
comme variables ; case « choix » : réponse = indice d'origine, la bonne en premier, mélangée à
l'affichage ; « de » élidé devant une voyelle.

    python3 -I docs/wip/questions/lot-cm2-13.py scripts/questions/cm2-13
"""
import json
import math
import os
import sys

DOSSIER = sys.argv[1]
ENTIERS = {'constraints': {'spacesFromFourDigits': True}}
DECIMAUX = {'constraints': {'spacesFromFourDigits': True, 'zeros': 'off'}}
VIRGULE_EXIGEE = {'pattern': 'a:number'}
MODELES = {}

# ---- Gabarits (comme lot-cm2-12.py) ----


def spec(desc, vi, variables, answers, status):
    return {'description': desc, 'variationIndex': vi,
            'variables': {k: str(x) for k, x in variables.items()},
            'answers': answers if isinstance(answers, list) else [answers],
            'expected': {'status': status}}


def modele(title, description, variations, specs, options=ENTIERS, delay=90):
    # niveau 1 de la sous-notion (§ 20.1 a) ; rangement et tag posés par la migration
    return {'title': title, 'description': description, 'grades': ['CM2'], 'level': 1,
            'delay': delay, 'status': 'draft', 'options': options, 'variations': variations,
            'testSpecs': specs}


def var(nom, expression):
    return {'name': nom, 'expression': expression}


def variation(enonce, variables, reponses, etapes, conditions=None):
    """`reponses` : attendus (`{{eval:…}}`) ou dicts de case, une par case."""
    v = {'statement': enonce, 'variables': variables}
    if conditions:
        v['conditions'] = conditions
    v['blanks'] = [r if isinstance(r, dict) else {'expectedAnswer': r} for r in reponses]
    v['correction'] = {'steps': etapes}
    return v


def ev(x):
    return '{{eval:' + x + '}}'


def evd(x):
    return '{{eval:' + x + ';d}}'


def decimal(x):
    return {'expectedAnswer': x, 'requiredForm': VIRGULE_EXIGEE}


def col(x):
    return '\\textcolor{{{color:primary.0}}}{' + x + '}'


def choix(items):
    """Case « choix » : la bonne réponse en premier (indice 0), mélangée à l'affichage."""
    return '```choix\n' + '\n'.join('- ' + it for it in items) + '\n```'


def selon(nom, valeurs):
    """Texte choisi par la variable `nom` (1, 2, …) : `{{if:j==1|…|{{if:j==2|…|…}}}}`."""
    texte = valeurs[-1]
    for k in range(len(valeurs) - 1, 0, -1):
        texte = '{{if:' + nom + '==' + str(k) + '|' + valeurs[k - 1] + '|' + texte + '}}'
    return texte


def u(unite):
    return '\\unit{' + unite + '}'


def aire_case(unite):
    return '$\\text{Aire} = ?~' + u(unite) + '$'


def figure(fenetre, description, lignes, grille=None):
    tete = ['```figure', 'fenetre: ' + fenetre]
    if grille:
        tete.append('grille: ' + grille)
    return '\n'.join(tete + ['description: ' + description, '---'] + lignes + ['```'])


# ============================================================================
# 13-1 — CM2-073 : choisir l'unité d'aire (case « choix »)
# ============================================================================

UNITES = ['$' + u('cm^2') + '$', '$' + u('dm^2') + '$', '$' + u('m^2') + '$']
# objets (avec l'article), dans l'unité qui convient
OBJETS = {
    'cm^2': ['d\'un timbre', 'd\'une carte à jouer', 'd\'une gomme', 'd\'un ticket de bus'],
    'dm^2': ['d\'une feuille de cahier', 'de la couverture d\'un livre', 'd\'un set de table',
             'de l\'écran d\'un ordinateur portable'],
    'm^2': ['d\'une salle de classe', 'd\'une chambre', 'd\'un terrain de basket', 'du sol d\'un gymnase'],
}
POURQUOI = {
    'cm^2': 'C\'est un petit objet : il tient à peine quelques carrés de $1~' + u('cm') + '$ de côté.'
            ' Le $' + u('dm^2') + '$ et le $' + u('m^2') + '$ seraient bien trop grands.',
    'dm^2': 'Un carré de $1~' + u('dm') + '$ de côté ($10~' + u('cm') + '$) est de la taille d\'une'
            ' main : l\'objet en contient quelques-uns. En $' + u('cm^2') + '$, le nombre serait'
            ' très grand ; un $' + u('m^2') + '$ est bien plus grand que l\'objet.',
    'm^2': 'Un carré de $1~' + u('m') + '$ de côté tient plusieurs fois sur ce sol : on compte'
           ' en $' + u('m^2') + '$. En $' + u('cm^2') + '$ ou en $' + u('dm^2') + '$, les'
           ' nombres seraient énormes.',
}
ORDRE = {'cm^2': [0, 1, 2], 'dm^2': [1, 0, 2], 'm^2': [2, 1, 0]}  # la bonne en premier


def unite_objet(unite):
    objet = selon('j', OBJETS[unite])
    enonce = ('Dans quelle unité mesure-t-on le plus simplement l\'aire ' + objet + ' ?\n\n'
              + choix([UNITES[k] for k in ORDRE[unite]]))
    etapes = [POURQUOI[unite],
              'L\'aire ' + objet + ' se mesure en $' + col(u(unite)) + '$.']
    return variation(enonce, [var('j', '1..4')], ['0'], etapes)


# la mesure plausible : la bonne en premier
PLAUSIBLE = [
    ('d\'une feuille de cahier', '6', ['6~' + u('dm^2'), '6~' + u('cm^2'), '6~' + u('m^2')],
     'Une feuille de cahier mesure environ $3~' + u('dm') + '$ sur $2~' + u('dm') + '$ :'
     ' $3 \\times 2 = 6$.'),
    ('d\'une salle de classe', '60', ['60~' + u('m^2'), '60~' + u('dm^2'), '60~' + u('cm^2')],
     'Une salle de classe mesure environ $10~' + u('m') + '$ sur $6~' + u('m') + '$ :'
     ' $10 \\times 6 = 60$.'),
    ('d\'un timbre', '6', ['6~' + u('cm^2'), '6~' + u('dm^2'), '6~' + u('m^2')],
     'Un timbre mesure environ $3~' + u('cm') + '$ sur $2~' + u('cm') + '$ : $3 \\times 2 = 6$.'),
    ('d\'une porte', '2', ['2~' + u('m^2'), '2~' + u('dm^2'), '2~' + u('cm^2')],
     'Une porte mesure environ $2~' + u('m') + '$ de haut sur $1~' + u('m') + '$ de large :'
     ' $2 \\times 1 = 2$.'),
]


def mesure_plausible():
    objet = selon('j', [p[0] for p in PLAUSIBLE])
    items = [selon('j', [p[2][k] for p in PLAUSIBLE]) for k in range(3)]
    enonce = ('Quelle peut être l\'aire ' + objet + ' ?\n\n' + choix(['$' + it + '$' for it in items]))
    etapes = [selon('j', [p[3] for p in PLAUSIBLE]),
              'L\'aire est d\'environ $' + col(items[0]) + '$ ; les deux autres mesures sont'
              ' beaucoup trop petites ou beaucoup trop grandes.']
    return variation(enonce, [var('j', '1..4')], ['0'], etapes)


MODELES['01-choisir-l-unite-d-aire'] = modele(
    'Choisir l\'unité d\'aire',
    'Choisir entre cm², dm² et m² l\'unité qui convient pour l\'aire d\'un objet, ou la mesure'
    ' plausible de son aire',
    [unite_objet('cm^2'), unite_objet('dm^2'), unite_objet('m^2'), mesure_plausible()],
    [spec('Timbre : cm²', 0, {'j': 1}, '0', 'correct'),
     spec('Erreur : m² pour un timbre', 0, {'j': 1}, '2', 'incorrect'),
     spec('Feuille de cahier : dm²', 1, {'j': 1}, '0', 'correct'),
     spec('Erreur : m² pour une feuille', 1, {'j': 1}, '2', 'incorrect'),
     spec('Salle de classe : m²', 2, {'j': 1}, '0', 'correct'),
     spec('Erreur : cm² pour une salle', 2, {'j': 1}, '2', 'incorrect'),
     spec('Feuille : 6 dm²', 3, {'j': 1}, '0', 'correct'),
     spec('Erreur : 6 m² pour une feuille', 3, {'j': 1}, '2', 'incorrect')],
    delay=60)

# ============================================================================
# 13-2 — CM2-074 : convertir des aires (un saut à la fois, § 20.1 c)
# ============================================================================

GRANDE = ['m^2', 'dm^2']    # j = 1 : m² ↔ dm² ; j = 2 : dm² ↔ cm²
PETITE = ['dm^2', 'cm^2']


def u_selon(liste):
    return '\\unit{' + selon('j', liste) + '}'


def regle(sens):
    base = ('$1~' + u_selon(GRANDE) + ' = 100~' + u_selon(PETITE) + '$ : un carré de'
            + ' $1~' + u_selon(['m', 'dm']) + '$ de côté contient $10$ rangées de $10$ carrés de $1~'
            + u_selon(['dm', 'cm']) + '$ de côté.')
    if sens == 'petite':
        return base + ' Vers l\'unité plus petite, on **multiplie par $100$**.'
    return base + ' Vers l\'unité plus grande, on **divise par $100$**.'


def vers_petite(nombre, valeur_resultat, variables, conditions=None, reponse=None):
    enonce = ('Convertis.\n\n$$' + nombre + '~' + u_selon(GRANDE) + ' = ?~' + u_selon(PETITE) + '$$')
    etapes = [regle('petite'),
              '$$' + nombre + ' \\times 100 = ' + col(valeur_resultat) + '$$',
              '$' + nombre + '~' + u_selon(GRANDE) + ' = ' + col(valeur_resultat) + '~'
              + u_selon(PETITE) + '$.']
    return variation(enonce, variables, [reponse], etapes, conditions)


def vers_grande():
    enonce = ('Convertis.\n\n$$' + ev('a') + '~' + u_selon(PETITE) + ' = ?~' + u_selon(GRANDE) + '$$')
    etapes = [regle('grande'),
              '$$' + ev('a') + ' \\div 100 = ' + col(evd('a/100')) + '$$',
              '$' + ev('a') + '~' + u_selon(PETITE) + ' = ' + col(evd('a/100')) + '~'
              + u_selon(GRANDE) + '$.']
    return variation(enonce, [var('j', '1..2'), var('a', '120..9999')],
                     [decimal(evd('a/100'))], etapes, ['mod(a,10) != 0'])


MODELES['02-convertir-des-aires'] = modele(
    'Convertir des aires',
    'Convertir entre m² et dm², ou entre dm² et cm² (× 100 ou : 100), un nombre entier ou décimal',
    [vers_petite('{{a}}', ev('a*100'), [var('j', '1..2'), var('a', '2..99')],
                 reponse=ev('a*100')),
     vers_grande(),
     vers_petite(evd('d/10'), ev('d*10'), [var('j', '1..2'), var('d', '11..99')],
                 ['mod(d,10) != 0'], reponse=ev('d*10'))],
    [spec('7 m² = 700 dm²', 0, {'j': 1, 'a': 7}, '700', 'correct'),
     spec('Erreur : × 10 (70)', 0, {'j': 1, 'a': 7}, '70', 'incorrect'),
     spec('2 345 cm² = 23,45 dm²', 1, {'j': 2, 'a': 2345}, '23,45', 'correct'),
     spec('Erreur : : 10 (234,5)', 1, {'j': 2, 'a': 2345}, '234,5', 'incorrect'),
     spec('Erreur : × 100 (234 500)', 1, {'j': 2, 'a': 2345}, '234\\,500', 'incorrect'),
     spec('3,7 dm² = 370 cm²', 2, {'j': 2, 'd': 37}, '370', 'correct'),
     spec('Erreur : × 10 (37)', 2, {'j': 2, 'd': 37}, '37', 'incorrect')],
    options=DECIMAUX, delay=90)

# ============================================================================
# 13-3 et 13-4 — CM2-075 et 120 : aire d'un carré, d'un rectangle
# ============================================================================


def rectangle_dessine(L, l, nom, description):
    """Rectangle (ou carré) de L × l unités, dessiné à l'échelle, côtés cotés en cm."""
    lignes = ['A = point(0, 0, visible=faux)',
              'B = point(' + L + ', 0, visible=faux)',
              'C = point(' + L + ', ' + l + ', visible=faux)',
              'D = point(0, ' + l + ', visible=faux)',
              'polygone(A, B, C, D, couleur="noir", epaisseur=2, remplissage="bleu",'
              ' opacite_fond=0.2)',
              'M = milieu(A, B, visible=faux)',
              'N = milieu(B, C, visible=faux)',
              'texte(M, "{{' + nom[0] + '}} cm", dy=-0.4, ancre="haut")',
              'texte(N, "{{' + nom[1] + '}} cm", dx=0.3, ancre="gauche")']
    # fenêtre à la taille de la figure, bornes entières (une moitié s'écrirait en fraction)
    return figure('-1 ; ' + ev(L.strip('{}') + '+3') + ' ; -2 ; ' + ev(l.strip('{}') + '+1'),
                  description, lignes)


def carre_texte():
    enonce = ('Quelle est l\'aire d\'un carré de ${{c}}~' + u('cm') + '$ de côté ?\n\n'
              + aire_case('cm^2'))
    etapes = ['Aire d\'un carré : **côté × côté**.',
              '$${{c}} \\times {{c}} = ' + col(ev('c*c')) + '$$',
              'L\'aire du carré est $' + col(ev('c*c')) + '~' + u('cm^2') + '$.']
    return variation(enonce, [var('c', '2..12')], [ev('c*c')], etapes)


def carre_dessine():
    fig = rectangle_dessine('{{c}}', '{{c}}', 'cc',
                            'Un carré dont les côtés mesurent {{c}} cm.')
    enonce = ('Ce carré a des côtés de ${{c}}~' + u('cm') + '$. Quelle est son aire ?\n\n' + fig
              + '\n\n' + aire_case('cm^2'))
    etapes = ['Aire d\'un carré : **côté × côté**.',
              '$${{c}} \\times {{c}} = ' + col(ev('c*c')) + '$$',
              'L\'aire du carré est $' + col(ev('c*c')) + '~' + u('cm^2') + '$.']
    return variation(enonce, [var('c', '2..9')], [ev('c*c')], etapes)


def carre_probleme():
    objet = selon('j', ['Le sol d\'une chambre carrée a des côtés de ${{c}}~' + u('m') + '$.',
                        'Un carreau de faïence carré a des côtés de ${{c}}~' + u('dm') + '$.'])
    unite = selon('j', ['m^2', 'dm^2'])
    enonce = objet + ' Quelle est son aire ?\n\n$\\text{Aire} = ?~\\unit{' + unite + '}$'
    etapes = ['Aire d\'un carré : **côté × côté**.',
              '$${{c}} \\times {{c}} = ' + col(ev('c*c')) + '$$',
              'L\'aire est $' + col(ev('c*c')) + '~\\unit{' + unite + '}$ : les côtés sont en $'
              + selon('j', [u('m'), u('dm')]) + '$, l\'aire est en $\\unit{' + unite + '}$.']
    return variation(enonce, [var('j', '1..2'), var('c', '2..9')], [ev('c*c')], etapes)


MODELES['03-aire-d-un-carre'] = modele(
    'Aire d\'un carré',
    'Calculer l\'aire d\'un carré de côté entier (côté × côté) : en cm, sur un dessin, ou dans un'
    ' petit problème en m ou en dm',
    [carre_texte(), carre_dessine(), carre_probleme()],
    [spec('côté 7 cm : 49', 0, {'c': 7}, '49', 'correct'),
     spec('Erreur : 4 × 7 (le périmètre, 28)', 0, {'c': 7}, '28', 'incorrect'),
     spec('Erreur : 7 + 7 (14)', 0, {'c': 7}, '14', 'incorrect'),
     spec('dessin, côté 6 cm : 36', 1, {'c': 6}, '36', 'correct'),
     spec('Erreur : 4 × 6 (24)', 1, {'c': 6}, '24', 'incorrect'),
     spec('chambre de 4 m : 16', 2, {'j': 1, 'c': 4}, '16', 'correct'),
     spec('Erreur : 4 + 4 (8)', 2, {'j': 1, 'c': 4}, '8', 'incorrect')],
    delay=60)


def rect_texte():
    enonce = ('Quelle est l\'aire d\'un rectangle de longueur ${{L}}~' + u('cm') + '$ et de largeur'
              ' ${{l}}~' + u('cm') + '$ ?\n\n' + aire_case('cm^2'))
    etapes = ['Aire d\'un rectangle : **longueur × largeur**.',
              '$${{L}} \\times {{l}} = ' + col(ev('L*l')) + '$$',
              'L\'aire du rectangle est $' + col(ev('L*l')) + '~' + u('cm^2') + '$.']
    return variation(enonce, [var('L', '3..15'), var('l', '2..9')], [ev('L*l')], etapes, ['l < L'])


def rect_dessine():
    fig = rectangle_dessine('{{L}}', '{{l}}', 'Ll',
                            'Un rectangle de {{L}} cm de longueur et {{l}} cm de largeur.')
    enonce = ('Ce rectangle mesure ${{L}}~' + u('cm') + '$ sur ${{l}}~' + u('cm')
              + '$. Quelle est son aire ?\n\n' + fig + '\n\n' + aire_case('cm^2'))
    etapes = ['Aire d\'un rectangle : **longueur × largeur**.',
              '$${{L}} \\times {{l}} = ' + col(ev('L*l')) + '$$',
              'L\'aire du rectangle est $' + col(ev('L*l')) + '~' + u('cm^2') + '$.']
    return variation(enonce, [var('L', '3..14'), var('l', '2..8')], [ev('L*l')], etapes, ['l < L'])


def rect_probleme():
    objet = selon('j', ['Un potager rectangulaire mesure ${{L}}~' + u('m') + '$ sur ${{l}}~'
                        + u('m') + '$.',
                        'Une affiche rectangulaire mesure ${{L}}~' + u('dm') + '$ sur ${{l}}~'
                        + u('dm') + '$.'])
    unite = selon('j', ['m^2', 'dm^2'])
    enonce = objet + ' Quelle est son aire ?\n\n$\\text{Aire} = ?~\\unit{' + unite + '}$'
    etapes = ['Aire d\'un rectangle : **longueur × largeur**.',
              '$${{L}} \\times {{l}} = ' + col(ev('L*l')) + '$$',
              'L\'aire est $' + col(ev('L*l')) + '~\\unit{' + unite + '}$.']
    return variation(enonce, [var('j', '1..2'), var('L', '4..12'), var('l', '2..9')], [ev('L*l')],
                     etapes, ['l < L'])


MODELES['04-aire-d-un-rectangle'] = modele(
    'Aire d\'un rectangle',
    'Calculer l\'aire d\'un rectangle de côtés entiers (longueur × largeur) : en cm, sur un dessin,'
    ' ou dans un petit problème en m ou en dm',
    [rect_texte(), rect_dessine(), rect_probleme()],
    [spec('8 cm sur 5 cm : 40', 0, {'L': 8, 'l': 5}, '40', 'correct'),
     spec('Erreur : 2 × (8 + 5) (le périmètre, 26)', 0, {'L': 8, 'l': 5}, '26', 'incorrect'),
     spec('Erreur : 8 + 5 (13)', 0, {'L': 8, 'l': 5}, '13', 'incorrect'),
     spec('dessin 7 sur 4 : 28', 1, {'L': 7, 'l': 4}, '28', 'correct'),
     spec('Erreur : 2 × (7 + 4) (22)', 1, {'L': 7, 'l': 4}, '22', 'incorrect'),
     spec('potager 9 m sur 6 m : 54', 2, {'j': 1, 'L': 9, 'l': 6}, '54', 'correct'),
     spec('Erreur : 9 + 6 (15)', 2, {'j': 1, 'L': 9, 'l': 6}, '15', 'incorrect')],
    delay=60)

# ============================================================================
# 13-5 — CM2-072 : encadrer l'aire d'une figure courbe sur quadrillage
# ============================================================================

FENETRE = (0, 10, 0, 8)


def compte(dedans, echant=24):
    """(carreaux entièrement dedans, carreaux touchés) ; `dedans(x, y)` : point dans la figure.

    Un carreau touché a au moins un point intérieur dans la figure ; entièrement dedans, tous.
    Échantillonnage fin, plus une marge vérifiée par `marge_ok` (pas de figure tangente).
    """
    plein, touche = 0, 0
    for cx in range(FENETRE[0], FENETRE[1]):
        for cy in range(FENETRE[2], FENETRE[3]):
            pts = [(cx + (a + 0.5) / echant, cy + (b + 0.5) / echant)
                   for a in range(echant) for b in range(echant)]
            dans = [dedans(x, y) for x, y in pts]
            if all(dans):
                plein += 1
            if any(dans):
                touche += 1
    return plein, touche


def disque(x0, y0, r):
    return lambda x, y: (x - x0) ** 2 + (y - y0) ** 2 < r * r


def ovale(x0, y0, a, b):
    """Dans le polygone réellement dessiné (`ovale_points`), pas dans l'ellipse exacte."""
    poly = ovale_points(x0, y0, a, b)

    def dedans(x, y):
        res = False
        for k in range(len(poly)):
            (x1, y1), (x2, y2) = poly[k], poly[(k + 1) % len(poly)]
            if (y1 > y) != (y2 > y) and x < x1 + (y - y1) * (x2 - x1) / (y2 - y1):
                res = not res
        return res
    return dedans


def marge_disque(x0, y0, r):
    """Le cercle ne passe ni par un nœud du quadrillage, ni tangent à une ligne (marge 0,08)."""
    for gx in range(FENETRE[0], FENETRE[1] + 1):
        if abs(abs(gx - x0) - r) < 0.08:
            return False
    for gy in range(FENETRE[2], FENETRE[3] + 1):
        if abs(abs(gy - y0) - r) < 0.08:
            return False
    for gx in range(FENETRE[0], FENETRE[1] + 1):
        for gy in range(FENETRE[2], FENETRE[3] + 1):
            if abs(math.hypot(gx - x0, gy - y0) - r) < 0.08:
                return False
    return True


DISQUES = [(5, 4, 2.6), (4.5, 4.5, 3.1), (5.5, 4, 2.3), (5, 3.5, 2.85)]
OVALES = [(5, 4, 3.4, 1.6), (4.5, 4, 2.2, 3.4), (5, 4.5, 3.4, 2.2)]
for d in DISQUES:
    assert marge_disque(*d), d


def ovale_points(x0, y0, a, b, n=48):
    return [(round(x0 + a * math.cos(2 * math.pi * k / n), 3),
             round(y0 + b * math.sin(2 * math.pi * k / n), 3)) for k in range(n)]


def lignes_disque(x0, y0, r):
    return ['O = point(' + str(x0) + ', ' + str(y0) + ', visible=faux)',
            'cercle(O, rayon=' + str(r) + ', couleur="noir", epaisseur=2, remplissage="vert",'
            ' opacite_fond=0.35)']


def lignes_ovale(x0, y0, a, b):
    pts = ovale_points(x0, y0, a, b)
    lignes = [f'P{k} = point({x}, {y}, visible=faux)' for k, (x, y) in enumerate(pts)]
    lignes.append('polygone(' + ', '.join(f'P{k}' for k in range(len(pts)))
                  + ', couleur="noir", epaisseur=2, remplissage="vert", opacite_fond=0.35)')
    return lignes


def quadrillage():
    """Lignes du quadrillage tracées PAR-DESSUS la figure : la grille de fond, pâle, se perd sous
    le remplissage, et l'élève doit pouvoir compter les carreaux (aperçu à 390 px, 2026-11-19)."""
    x0, x1, y0, y1 = FENETRE
    lignes = []
    for x in range(x0, x1 + 1):
        lignes += [f'QV{x}a = point({x}, {y0}, visible=faux)', f'QV{x}b = point({x}, {y1}, visible=faux)',
                   f'segment(QV{x}a, QV{x}b, couleur="gris", epaisseur=1)']
    for y in range(y0, y1 + 1):
        lignes += [f'QH{y}a = point({x0}, {y}, visible=faux)', f'QH{y}b = point({x1}, {y}, visible=faux)',
                   f'segment(QH{y}a, QH{y}b, couleur="gris", epaisseur=1)']
    return lignes


def encadrer(forme, nom_forme, lignes_de, dedans_de):
    """Une variation par figure : attendus fixes, sans `{{if}}`."""
    p, t = compte(dedans_de(*forme))
    assert (p, t) == compte(dedans_de(*forme), echant=64), forme  # comptes stables
    assert 0 < p < t, (p, t)
    fig = figure('0 ; 10 ; 0 ; 8', 'Une figure à bord arrondi (' + nom_forme
                 + ') coloriée sur un quadrillage.', lignes_de(*forme) + quadrillage(), grille='1')
    enonce = ('L\'unité d\'aire est le carreau. On ne peut pas compter exactement les carreaux de'
              ' cette figure : encadre son aire.\n\n' + fig
              + '\n\nAu moins $?$ carreaux (les carreaux **entièrement** dans la figure).\n\n'
              'Au plus $?$ carreaux (les carreaux que la figure **touche**, même un peu).')
    etapes = ['**Au moins.** Les carreaux entièrement coloriés sont tous dans la figure : il y en a $'
              + col(str(p)) + '$. L\'aire de la figure est donc plus grande que $' + str(p)
              + '$ carreaux.',
              '**Au plus.** La figure tient dans les carreaux qu\'elle touche : il y en a $'
              + col(str(t)) + '$. L\'aire de la figure est donc plus petite que $' + str(t)
              + '$ carreaux.',
              'L\'aire est comprise entre $' + str(p) + '$ et $' + str(t) + '$ carreaux.']
    return variation(enonce, [], [str(p), str(t)], etapes), (p, t)


FORMES = ([(d, 'un disque', lignes_disque, disque) for d in DISQUES]
          + [(o, 'un ovale', lignes_ovale, ovale) for o in OVALES])
VARIATIONS_5, SPECS_5 = [], []
for vi, (forme, nom_forme, lignes_de, dedans_de) in enumerate(FORMES):
    v, (p, t) = encadrer(forme, nom_forme, lignes_de, dedans_de)
    VARIATIONS_5.append(v)
    SPECS_5 += [spec(f'{nom_forme} {forme} : {p} et {t}', vi, {}, [str(p), str(t)], 'correct'),
                spec('Erreur : cases inversées', vi, {}, [str(t), str(p)], 'incorrect')]
    print(nom_forme, forme, p, t)
MODELES['05-encadrer-l-aire-d-une-figure-arrondie'] = modele(
    'Encadrer l\'aire d\'une figure arrondie',
    'Figure à bord arrondi (disque, ovale) sur un quadrillage : encadrer son aire entre les'
    ' carreaux entièrement dedans et les carreaux touchés',
    VARIATIONS_5, SPECS_5, delay=150)

os.makedirs(DOSSIER, exist_ok=True)
for nom, mod in MODELES.items():
    with open(f'{DOSSIER}/{nom}.json', 'w') as fh:
        json.dump(mod, fh, ensure_ascii=False, indent='\t')
        fh.write('\n')
print(len(MODELES), 'modèles écrits')
