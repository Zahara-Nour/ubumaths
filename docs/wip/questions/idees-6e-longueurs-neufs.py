"""Écrit les modèles neufs du chantier idees-6e-longueurs dans scripts/questions/idees-6e-longueurs-neufs/.

Phase 0 du 2026-11-27 (journal docs/archive/wip/idees-6e-longueurs/idees-6e-longueurs-progress.md, § Modèles neufs) : David a
répondu « je te suis » aux fiches N1 à N5 et aux questions Q1, Q2. On reprend l'idée de l'autre
plateforme, pas sa forme ni son texte.

Ni theme, ni domain, ni subdomain, ni id : le rangement (nœud + tag) se fera par migration, après la
création en brouillon (champ `rangement`). Points : N1 → 6-144 (carré) et 6-199 (rectangle) ;
N2 → 6-148 ; N3 → 6-148 (Q1) ; N4 et N5 → modèles de 6e sans point (Q2), comme c31c9d95.
Le point d'un modèle est sur son nœud ou sur sa notion (`question_template_points_check_rules`) ;
relevé en prod le 2026-11-27 : 6-144 sur « Périmètres > carré », 6-199 sur « Périmètres > rectangle »,
6-148 sur la notion « Périmètres » (où est rangé 60f165a8). N4 et N5 vont sous « Unités et conversions
> unités simples », comme c31c9d95 et 7a90fc45 (sans point).
Niveaux relevés en prod le 2026-11-27 (à relever de nouveau avant la migration de rangement) :
« carré » 6e L1 ; « rectangle » 6e L1 ; notion « Périmètres » 6e L1 (60f165a8) ; « unités simples »
6e L1 à L4.

Choix d'écriture :
- une longueur demandée seule (N1 c) : case à unité (24 cm², l'aire, est une erreur prévue) ;
  une conversion ou un périmètre arrondi : case nombre, l'unité écrite après la case ;
- N1 (a) : saisie d'expression, `products: off` et `form: off` (4 × c, c × 4, c + c + c + c) ;
- N4 (c), (d) : fraction ou décimal acceptés, donc `form: off` sur N4 (ses autres cases sont des
  choix) ;
- N1 (b), N3, N4 (a), (b) : case choix ; les choix n'ont pas d'erreurs prévues (questions.md) : le
  message de l'erreur « autant » de N3 (b) passe dans le corrigé ;
- N2 : π ≈ 3,14 (bornes de 6-147), arrondi au dixième calculé en entiers (357 × r + 5, pas de
  flottant) ; figures : `arc` + segments, comme 60f165a8 (pas de secteur dans le bloc figure) ;
- N5 : trois erreurs prévues par case, le mauvais sens et un rang de trop ou de moins (× 10, ÷ 10).

Règles suivies (couvrir-un-niveau.md § 5) : erreurs prévues de vraies erreurs d'élèves, chacune avec
sa spec `incorrect` qui nomme son message ; un coup de pouce par variation, qui ne donne jamais la
réponse.

Usage : python3 docs/wip/questions/idees-6e-longueurs-neufs.py scripts/questions/idees-6e-longueurs-neufs
"""
import json
import math
import os
import sys

DOSSIER = sys.argv[1]

PRIMAIRE = '\\textcolor{{{color:primary.0}}}'
CARRE = {'noeud': 'Grandeurs et mesures > Périmètres > carré', 'point': '6-144'}
RECT = {'noeud': 'Grandeurs et mesures > Périmètres > rectangle', 'point': '6-199'}
PERIMETRES = {'noeud': 'Grandeurs et mesures > Périmètres', 'point': '6-148'}
UNITES = {'noeud': 'Grandeurs et mesures > Unités et conversions > unités simples', 'point': None}
DECIMAL = {'blankDefaults': {'acceptDecimal': True}}


def spec(desc, vi, variables_, status, answers, message=None):
    expected = {'status': status}
    if message is not None:
        expected['expectedErrorMessage'] = message
    return {'description': desc, 'variationIndex': vi, 'variables': variables_,
            'expected': expected, 'answers': answers}


def modele(title, description, level, delay, variations, specs, rangement, options=None,
           shared=None):
    m = {'rangement': rangement, 'title': title, 'description': description,
         'grades': ['6'], 'level': level, 'delay': delay, 'status': 'draft'}
    if options:
        m['options'] = options
    if shared:
        m['shared'] = shared
    m['variations'] = variations
    m['testSpecs'] = specs
    return m


def var(nom, expression):
    return {'name': nom, 'expression': expression}


def erreur(answer, message, label):
    return {'answer': answer, 'message': message, 'label': label}


def case(attendue, erreurs=None, unite=False):
    c = {'expectedAnswer': attendue}
    if unite:
        c['unit'] = {'expected': True}
    if erreurs:
        c['expectedErrors'] = erreurs
    return c


def variation(statement, variables, blanks, steps, hint, conditions=None):
    return {'statement': statement, 'variables': variables, 'conditions': conditions or [],
            'blanks': blanks, 'correction': {'steps': steps}, 'hint': hint}


def couleur(contenu):
    return PRIMAIRE + '{' + contenu + '}'


def selon(v, textes, k=0):
    """`{{if:v==0|…|{{if:v==1|…|…}}}}` : le texte numéro v."""
    if k == len(textes) - 1:
        return textes[k]
    return '{{if:' + v + '==' + str(k) + '|' + textes[k] + '|' + selon(v, textes, k + 1) + '}}'


def sel(v, valeurs):
    """Expression qui vaut valeurs[k] quand v == k (indicatrices, pour une variable `eval:`)."""
    return '+'.join(f'({x})*(1-min(abs({v}-{k}),1))' for k, x in enumerate(valeurs))


def choisir(v, textes, i):
    """Le texte numéro i (pour une spec) ou le `selon` du gabarit (i = None)."""
    return selon(v, textes) if i is None else textes[i]


def bloc(nom, *lignes):
    return '```' + nom + '\n' + '\n'.join(lignes) + '\n```'


def u(texte):
    """Unité en écriture LaTeX : `\\unit{cm}`."""
    return '\\unit{' + texte + '}'


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
# N1 — formules du périmètre du carré (6-144) et du rectangle (6-199).
# =============================================================================================

# --- Carré ---
MSG_CC = 'Ça, c\'est l\'aire du carré. Le périmètre est le tour : on ajoute ses quatre côtés.'
MSG_2C = 'Le carré a quatre côtés de longueur $c$, pas deux.'
MSG_4PC = 'On ajoute **quatre fois** le côté : c\'est $4$ fois $c$, pas $4$ plus $c$.'
N1C_A = variation(
    'Un carré a des côtés de longueur $c$. Écris la formule de son périmètre $P$.\n\n$P = ?$',
    [],
    [case('4\\times c', [
        erreur('c\\times c', MSG_CC, 'Aire'),
        erreur('2\\times c', MSG_2C, 'Deux côtés'),
        erreur('4+c', MSG_4PC, '4 + c au lieu de 4 × c'),
    ])],
    ['Le périmètre est la longueur du tour : les quatre côtés du carré mesurent $c$.',
     '$P = c + c + c + c$, soit $$P = ' + couleur('4 \\times c') + '$$'],
    'Le périmètre est le tour de la figure : combien de côtés, et que mesure chacun ?',
)
N1C_B = variation(
    'Complète la phrase.\n\nLe périmètre d\'un carré est égal à … fois la longueur de son côté.\n\n'
    + bloc('choix', 'melanger: non', '- deux', '- trois', '- quatre', '- six'),
    [],
    [case('2')],
    ['Le tour du carré passe par ses quatre côtés, tous de même longueur.',
     'Le périmètre est égal à $' + couleur('\\text{quatre}') + '$ fois la longueur du côté : '
     '$P = 4 \\times c$.'],
    'Dessine un carré et suis son contour avec le doigt : combien de côtés parcours-tu ?',
)
N1C_C = variation(
    'Le périmètre d\'un carré de côté $c$ est $P = 4 \\times c$.\n\nCalcule $P$ pour $c = {{c}}$ cm.'
    '\n\n$P = ?$',
    [var('c', '2..12')],
    [case('{{eval:4*c}}' + u('cm'), [
        erreur('{{eval:c*c}}' + u('cm^2'), MSG_CC, 'Aire'),
        erreur('{{eval:2*c}}' + u('cm'), MSG_2C, 'Deux côtés'),
        erreur('{{eval:4+c}}' + u('cm'), MSG_4PC, '4 + c au lieu de 4 × c'),
    ], unite=True)],
    ['On remplace $c$ par ${{c}}$ cm :',
     '$$P = 4 \\times {{c}}~\\unit{cm} = ' + couleur('{{eval:4*c}}~\\unit{cm}') + '$$'],
    'Remplace la lettre $c$ par sa valeur dans la formule.',
)
SPECS_N1C = [
    spec('4 × c', 0, {}, 'correct', ['4\\times c']),
    spec('c × 4', 0, {}, 'correct', ['c\\times 4']),
    spec('c + c + c + c', 0, {}, 'correct', ['c+c+c+c']),
    spec('4c', 0, {}, 'correct', ['4c']),
    spec('c × c (aire)', 0, {}, 'incorrect', ['c\\times c'], MSG_CC),
    spec('2 × c', 0, {}, 'incorrect', ['2\\times c'], MSG_2C),
    spec('c + c', 0, {}, 'incorrect', ['c+c'], MSG_2C),
    spec('4 + c', 0, {}, 'incorrect', ['4+c'], MSG_4PC),
    spec('Quatre', 1, {}, 'correct', ['2']),
    spec('Deux refusé', 1, {}, 'incorrect', ['0']),
    spec('c = 7 : 28 cm', 2, {'c': '7'}, 'correct', ['28' + u('cm')]),
    spec('c = 7 : 280 mm', 2, {'c': '7'}, 'correct', ['280' + u('mm')]),
    spec('c = 7 : 49 cm²', 2, {'c': '7'}, 'incorrect', ['49' + u('cm^2')], MSG_CC),
    spec('c = 7 : 14 cm', 2, {'c': '7'}, 'incorrect', ['14' + u('cm')], MSG_2C),
    spec('c = 7 : 11 cm', 2, {'c': '7'}, 'incorrect', ['11' + u('cm')], MSG_4PC),
]
N1C = modele(
    'La formule du périmètre du carré',
    'Écrire la formule P = 4 × c, la dire en mots (quatre fois le côté), l\'utiliser pour une '
    'valeur de c ; pièges : c × c (l\'aire), 2 × c, 4 + c',
    2, 20, [N1C_A, N1C_B, N1C_C], SPECS_N1C, CARRE,
    {'constraints': {'products': 'off', 'form': 'off'}})

# --- Rectangle ---
MSG_LXL = 'Ça, c\'est l\'aire du rectangle. Le périmètre est le tour : on **ajoute** les côtés.'
MSG_LPL = 'Le tour compte deux longueurs **et** deux largeurs, pas une seule de chaque.'
MSG_2LPL = 'Il y a deux largeurs aussi : on double la somme de la longueur **et** de la largeur.'
N1R_A = variation(
    'Un rectangle a pour longueur $L$ et pour largeur $l$. Écris la formule de son périmètre $P$.'
    '\n\n$P = ?$',
    [],
    [case('2\\times(L+l)', [
        erreur('L\\times l', MSG_LXL, 'Aire'),
        erreur('L+l', MSG_LPL, 'Demi-périmètre'),
        erreur('2\\times L+l', MSG_2LPL, 'Une seule largeur'),
    ])],
    ['Le tour du rectangle passe par deux longueurs $L$ et deux largeurs $l$ :',
     '$P = L + l + L + l$, soit $$P = ' + couleur('2 \\times (L + l)') + '$$'],
    'Suis le contour du rectangle : combien de longueurs, combien de largeurs ?',
)
N1R_B = variation(
    'Complète la phrase.\n\nLe périmètre d\'un rectangle est égal au … de la somme de sa longueur et '
    'de sa largeur.\n\n' + bloc('choix', 'melanger: non', '- double', '- triple', '- produit',
                                '- carré'),
    [],
    [case('0')],
    ['Le tour passe par deux longueurs et deux largeurs : $P = L + l + L + l$.',
     'C\'est deux fois $L + l$ : le périmètre est égal au $' + couleur('\\text{double}')
     + '$ de la somme, $P = 2 \\times (L + l)$.'],
    'Pour un rectangle de $5$ cm sur $3$ cm, fais le tour : combien de fois retrouves-tu $5 + 3$ ?',
)
N1R_C = variation(
    'Le périmètre d\'un rectangle de longueur $L$ et de largeur $l$ est $P = 2 \\times (L + l)$.\n\n'
    'Calcule $P$ pour $L = {{L}}$ cm et $l = {{l}}$ cm.\n\n$P = ?$',
    [var('L', '4..12'), var('l', '2..9')],
    [case('{{eval:2*(L+l)}}' + u('cm'), [
        erreur('{{eval:L*l}}' + u('cm^2'), MSG_LXL, 'Aire'),
        erreur('{{eval:L+l}}' + u('cm'), MSG_LPL, 'Demi-périmètre'),
        erreur('{{eval:2*L+l}}' + u('cm'), MSG_2LPL, 'Une seule largeur'),
    ], unite=True)],
    ['On remplace $L$ par ${{L}}$ cm et $l$ par ${{l}}$ cm, et on calcule d\'abord la parenthèse :',
     '$$P = 2 \\times ({{L}} + {{l}}) = 2 \\times {{eval:L+l}} = '
     + couleur('{{eval:2*(L+l)}}~\\unit{cm}') + '$$'],
    'Remplace chaque lettre par sa valeur, puis commence par la parenthèse.',
    ['L>l'],
)
SPECS_N1R = [
    spec('2 × (L + l)', 0, {}, 'correct', ['2\\times(L+l)']),
    spec('2 × L + 2 × l', 0, {}, 'correct', ['2\\times L+2\\times l']),
    spec('L + l + L + l', 0, {}, 'correct', ['L+l+L+l']),
    spec('(L + l) × 2', 0, {}, 'correct', ['(L+l)\\times 2']),
    spec('L × l (aire)', 0, {}, 'incorrect', ['L\\times l'], MSG_LXL),
    spec('L + l', 0, {}, 'incorrect', ['L+l'], MSG_LPL),
    spec('2 × L + l', 0, {}, 'incorrect', ['2\\times L+l'], MSG_2LPL),
    spec('Le double', 1, {}, 'correct', ['0']),
    spec('Le produit refusé', 1, {}, 'incorrect', ['2']),
    spec('8 et 3 : 22 cm', 2, {'L': '8', 'l': '3'}, 'correct', ['22' + u('cm')]),
    spec('8 et 3 : 220 mm', 2, {'L': '8', 'l': '3'}, 'correct', ['220' + u('mm')]),
    spec('8 et 3 : 24 cm² (aire)', 2, {'L': '8', 'l': '3'}, 'incorrect', ['24' + u('cm^2')],
         MSG_LXL),
    spec('8 et 3 : 11 cm', 2, {'L': '8', 'l': '3'}, 'incorrect', ['11' + u('cm')], MSG_LPL),
    spec('8 et 3 : 19 cm', 2, {'L': '8', 'l': '3'}, 'incorrect', ['19' + u('cm')], MSG_2LPL),
]
N1R = modele(
    'La formule du périmètre du rectangle',
    'Écrire la formule P = 2 × (L + l), la dire en mots (le double de la somme), l\'utiliser pour '
    'des valeurs de L et l ; pièges : L × l (l\'aire), L + l, 2 × L + l',
    2, 20, [N1R_A, N1R_B, N1R_C], SPECS_N1R, RECT,
    {'constraints': {'products': 'off', 'form': 'off'}})


# =============================================================================================
# N2 — 6-148 : périmètre d'une portion de disque (quart, demi, trois-quarts), π ≈ 3,14, au dixième.
# Arrondis calculés en entiers : P = 3,57 × r → floor((357 × r + 5) / 10) / 10.
# =============================================================================================

PI_ARRONDI = 'On prend $\\pi \\approx 3{,}14$ ; donne le résultat arrondi au dixième.'


def arrondi(coef_centiemes, x):
    """`{{eval:…}}` de coef × x arrondi au dixième, coef en centièmes (357 pour 3,57)."""
    return '{{eval:floor((' + str(coef_centiemes) + '*' + x + '+5)/10)/10;d}}'


def arrondi_milliemes(coef_milliemes, x):
    return '{{eval:floor((' + str(coef_milliemes) + '*' + x + '+50)/100)/10;d}}'


def arr(c, x, base=100):
    """Même arrondi, en Python, pour les specs (c en centièmes ou en millièmes)."""
    demi = base // 20
    return f'{((c * x + demi) // (base // 10)) / 10:.1f}'.replace('.', '{,}')


MSG_ARC_SEUL = ('Tu n\'as compté que l\'arc : le contour passe aussi par '
                + '{{if:t==1|le diamètre|les deux rayons}}.')
MSG_CERCLE = 'Ça, c\'est le périmètre du disque entier ; ici, il n\'y a qu\'une portion de cercle.'

# (a) quart de disque de rayon r.
MSG_A_DIAM = ('Le rayon mesure ${{r}}$ cm : le cercle entier mesure $3{,}14 \\times 2 \\times '
              '{{r}}$, car son diamètre est le double du rayon.')
N2_A = variation(
    'Calcule le périmètre de ce quart de disque de rayon ${{r}}$ cm. ' + PI_ARRONDI + '\n\n'
    + bloc('figure', 'fenetre: -1.5 ; {{eval:r+1.5}} ; -1.5 ; {{eval:r+1.5}}',
           'description: Un quart de disque : deux rayons de {{r}} cm qui forment un angle droit, et '
           'l\'arc qui les relie.', '---',
           'O = point(0, 0, visible=faux)', 'A = point({{r}}, 0, visible=faux)',
           'B = point(0, {{r}}, visible=faux)',
           'segment(O, A, couleur="noir", epaisseur=2)', 'segment(O, B, couleur="noir", epaisseur=2)',
           'arc(O, rayon={{r}}, debut=0, fin=90, couleur="noir", epaisseur=2)',
           'angle(A, O, B, marque="carre")',
           'texte({{eval:r/2;d}}, -0.6, "{{r}} cm")')
    + '\n\nPérimètre $\\approx ?~\\unit{cm}$',
    [var('r', '2..10')],
    [case(arrondi(357, 'r'), [
        erreur(arrondi(157, 'r'), MSG_ARC_SEUL.replace('{{if:t==1|le diamètre|les deux rayons}}',
                                                       'les deux rayons'), 'Arc seul'),
        erreur(arrondi(628, 'r'), MSG_CERCLE, 'Cercle entier'),
        erreur(arrondi_milliemes(2785, 'r'), MSG_A_DIAM, 'Rayon pris pour le diamètre'),
    ])],
    ['**Le contour** : deux rayons de ${{r}}~\\unit{cm}$ et un **quart de cercle** de rayon '
     '${{r}}~\\unit{cm}$.',
     'Cercle entier : $3{,}14 \\times 2 \\times {{r}} = {{eval:6.28*r;d}}$ ; un quart : '
     '${{eval:6.28*r;d}} \\div 4 = {{eval:1.57*r;d}}$.',
     'Périmètre : ${{r}} + {{r}} + {{eval:1.57*r;d}} = {{eval:3.57*r;d}}$, soit environ $'
     + couleur(arrondi(357, 'r') + '~\\unit{cm}') + '$.'],
    'Suis le contour avec le doigt : il y a des segments et un morceau de cercle. Quelle part du '
    'cercle entier ?',
)

# (b) demi-disque de diamètre d.
MSG_B_DIAM = ('${{d}}$ cm, c\'est le diamètre : le cercle entier mesure $3{,}14 \\times {{d}}$, '
              'pas $3{,}14 \\times 2 \\times {{d}}$.')
N2_B = variation(
    'Calcule le périmètre de ce demi-disque de diamètre ${{d}}$ cm. ' + PI_ARRONDI + '\n\n'
    + bloc('figure', 'fenetre: {{eval:-d/2-1;d}} ; {{eval:d/2+1;d}} ; -1.5 ; {{eval:d/2+1;d}}',
           'description: Un demi-disque : un diamètre de {{d}} cm et le demi-cercle qui le borde.',
           '---',
           'O = point(0, 0, visible=faux)', 'A = point({{eval:-d/2;d}}, 0, visible=faux)',
           'B = point({{eval:d/2;d}}, 0, visible=faux)',
           'segment(A, B, couleur="noir", epaisseur=2)',
           'arc(O, rayon={{eval:d/2;d}}, debut=0, fin=180, couleur="noir", epaisseur=2)',
           'texte(0, -0.6, "{{d}} cm")')
    + '\n\nPérimètre $\\approx ?~\\unit{cm}$',
    [var('d', '2..10')],
    [case(arrondi(257, 'd'), [
        erreur(arrondi(157, 'd'), MSG_ARC_SEUL.replace('{{if:t==1|le diamètre|les deux rayons}}',
                                                       'le diamètre'), 'Arc seul'),
        erreur(arrondi(314, 'd'), MSG_CERCLE, 'Cercle entier'),
        erreur(arrondi(414, 'd'), MSG_B_DIAM, 'Diamètre pris pour le rayon'),
    ])],
    ['**Le contour** : le diamètre de ${{d}}~\\unit{cm}$ et un **demi-cercle** de diamètre '
     '${{d}}~\\unit{cm}$.',
     'Cercle entier : $3{,}14 \\times {{d}} = {{eval:3.14*d;d}}$ ; la moitié : '
     '${{eval:3.14*d;d}} \\div 2 = {{eval:1.57*d;d}}$.',
     'Périmètre : ${{d}} + {{eval:1.57*d;d}} = {{eval:2.57*d;d}}$, soit environ $'
     + couleur(arrondi(257, 'd') + '~\\unit{cm}') + '$.'],
    'Le contour, c\'est un morceau de cercle **et** un segment. Le nombre donné est-il un rayon ou '
    'un diamètre ?',
)

# (c) trois-quarts de disque de rayon r.
N2_C = variation(
    'Calcule le périmètre de ces trois quarts de disque de rayon ${{r}}$ cm. ' + PI_ARRONDI + '\n\n'
    + bloc('figure', 'fenetre: {{eval:-r-1.5}} ; {{eval:r+1.5}} ; {{eval:-r-1.5}} ; {{eval:r+1.5}}',
           'description: Trois quarts de disque : deux rayons de {{r}} cm qui forment un angle droit, '
           'et l\'arc qui fait les trois quarts du tour.', '---',
           'O = point(0, 0, visible=faux)', 'A = point({{r}}, 0, visible=faux)',
           'B = point(0, {{r}}, visible=faux)',
           'segment(O, A, couleur="noir", epaisseur=2)', 'segment(O, B, couleur="noir", epaisseur=2)',
           'arc(O, rayon={{r}}, debut=90, fin=360, couleur="noir", epaisseur=2)',
           'texte({{eval:r/2;d}}, -0.6, "{{r}} cm")')
    + '\n\nPérimètre $\\approx ?~\\unit{cm}$',
    [var('r', '2..10')],
    [case(arrondi(671, 'r'), [
        erreur(arrondi(471, 'r'), MSG_ARC_SEUL.replace('{{if:t==1|le diamètre|les deux rayons}}',
                                                       'les deux rayons'), 'Arc seul'),
        erreur(arrondi(628, 'r'), MSG_CERCLE, 'Cercle entier'),
        erreur(arrondi_milliemes(4355, 'r'), MSG_A_DIAM, 'Rayon pris pour le diamètre'),
    ])],
    ['**Le contour** : deux rayons de ${{r}}~\\unit{cm}$ et **trois quarts de cercle** de rayon '
     '${{r}}~\\unit{cm}$.',
     'Cercle entier : $3{,}14 \\times 2 \\times {{r}} = {{eval:6.28*r;d}}$ ; un quart : '
     '${{eval:1.57*r;d}}$ ; trois quarts : $3 \\times {{eval:1.57*r;d}} = {{eval:4.71*r;d}}$.',
     'Périmètre : ${{r}} + {{r}} + {{eval:4.71*r;d}} = {{eval:6.71*r;d}}$, soit environ $'
     + couleur(arrondi(671, 'r') + '~\\unit{cm}') + '$.'],
    'Suis le contour avec le doigt : des segments, et un morceau de cercle. Quelle part du cercle '
    'entier ?',
)

MSG_ARC_RAYONS = MSG_ARC_SEUL.replace('{{if:t==1|le diamètre|les deux rayons}}', 'les deux rayons')
MSG_ARC_DIAM = MSG_ARC_SEUL.replace('{{if:t==1|le diamètre|les deux rayons}}', 'le diamètre')
SPECS_N2 = [
    spec('Quart, r = 4 : 14,3', 0, {'r': '4'}, 'correct', ['14{,}3']),
    spec('Quart, r = 4 : 14,3 (point)', 0, {'r': '4'}, 'correct', ['14.3']),
    spec('Quart, r = 4 : arc seul 6,3', 0, {'r': '4'}, 'incorrect', [arr(157, 4)], MSG_ARC_RAYONS),
    spec('Quart, r = 4 : cercle 25,1', 0, {'r': '4'}, 'incorrect', [arr(628, 4)], MSG_CERCLE),
    spec('Quart, r = 4 : rayon pris pour le diamètre 11,1', 0, {'r': '4'}, 'incorrect',
         [arr(2785, 4, 1000)],
         'Le rayon mesure $4$ cm : le cercle entier mesure $3{,}14 \\times 2 \\times 4$, car son '
         'diamètre est le double du rayon.'),
    spec('Quart, r = 5 : 17,9 (arrondi au-dessus)', 0, {'r': '5'}, 'correct', ['17{,}9']),
    spec('Quart, r = 4 : non arrondi 14,28 refusé', 0, {'r': '4'}, 'incorrect', ['14{,}28']),
    spec('Demi, d = 6 : 15,4', 1, {'d': '6'}, 'correct', [arr(257, 6)]),
    spec('Demi, d = 6 : arc seul 9,4', 1, {'d': '6'}, 'incorrect', [arr(157, 6)], MSG_ARC_DIAM),
    spec('Demi, d = 6 : cercle 18,8', 1, {'d': '6'}, 'incorrect', [arr(314, 6)], MSG_CERCLE),
    spec('Demi, d = 6 : diamètre pris pour le rayon 24,8', 1, {'d': '6'}, 'incorrect',
         [arr(414, 6)],
         '$6$ cm, c\'est le diamètre : le cercle entier mesure $3{,}14 \\times 6$, pas '
         '$3{,}14 \\times 2 \\times 6$.'),
    spec('Demi, d = 5 : 12,9', 1, {'d': '5'}, 'correct', [arr(257, 5)]),
    spec('Trois quarts, r = 3 : 20,1', 2, {'r': '3'}, 'correct', [arr(671, 3)]),
    spec('Trois quarts, r = 3 : arc seul 14,1', 2, {'r': '3'}, 'incorrect', [arr(471, 3)],
         MSG_ARC_RAYONS),
    spec('Trois quarts, r = 3 : cercle 18,8', 2, {'r': '3'}, 'incorrect', [arr(628, 3)],
         MSG_CERCLE),
    spec('Trois quarts, r = 3 : rayon pris pour le diamètre 13,1', 2, {'r': '3'}, 'incorrect',
         [arr(4355, 3, 1000)],
         'Le rayon mesure $3$ cm : le cercle entier mesure $3{,}14 \\times 2 \\times 3$, car son '
         'diamètre est le double du rayon.'),
]
N2 = modele(
    'Périmètre d\'une portion de disque',
    'Périmètre d\'un quart, d\'un demi et de trois quarts de disque dessinés et cotés, π ≈ 3,14, '
    'arrondi au dixième ; pièges : l\'arc seul, le cercle entier, rayon et diamètre confondus',
    3, 60, [N2_A, N2_B, N2_C], SPECS_N2, PERIMETRES, shared=DECIMAL)


# =============================================================================================
# N3 — 6-148 (Q1) : comparer des périmètres sans mesurer. Rectangle de référence 6 × 4 en tirets,
# superposé à une figure colorée. Réponses : 0 = le rectangle, 1 = la figure colorée, 2 = le même.
# =============================================================================================

CHOIX_N3 = bloc('choix', 'melanger: non', '- Le rectangle en pointillés a le plus grand périmètre.',
                '- La figure colorée a le plus grand périmètre.', '- Ils ont le même périmètre.')


def figure_n3(desc, lignes, fen='-1.5 ; 7.5 ; -2 ; 6.5'):
    return bloc(
        'figure', 'fenetre: ' + fen, 'description: ' + desc, '---',
        *lignes,
        'R1 = point(0, 0, visible=faux)', 'R2 = point(6, 0, visible=faux)',
        'R3 = point(6, 4, visible=faux)', 'R4 = point(0, 4, visible=faux)',
        'polygone(R1, R2, R3, R4, couleur="noir", trait="tirets", epaisseur=2)',
    )


def poly(nom, pts, couleur_='orange'):
    lignes = [f'{nom}{i + 1} = point({x}, {y}, visible=faux)' for i, (x, y) in enumerate(pts)]
    noms = ', '.join(f'{nom}{i + 1}' for i in range(len(pts)))
    lignes.append(f'polygone({noms}, couleur="{couleur_}", epaisseur=2, remplissage="{couleur_}", '
                  'opacite_fond=0.35)')
    return lignes


def selon_lignes(v, figures):
    """Une figure par valeur de v : même découpage que `selon`, sur des blocs de lignes."""
    return [selon(v, ['\n'.join(figures[i]) for i in sorted(figures)])]


ENONCE_N3 = ('Le rectangle en pointillés et la figure colorée sont posés l\'un sur l\'autre. '
             'Sans mesurer, lequel a le plus grand périmètre ?\n\n')

# Demi-cercle de rayon 1 centré en (p + 1, 4) : 9 points, de droite à gauche, au-dessus (bosse) ou
# en dessous (creux) du bord du haut (le bloc figure n'a pas de secteur rempli).
BOSSE = [('{{eval:p+1+' + f'{math.cos(math.pi * i / 8):.3f}' + '}}',
          '{{eval:4+' + f'{math.sin(math.pi * i / 8):.3f}' + '}}') for i in range(9)]
CREUX = [('{{eval:p+1+' + f'{math.cos(math.pi * i / 8):.3f}' + '}}',
          '{{eval:4-' + f'{math.sin(math.pi * i / 8):.3f}' + '}}') for i in range(9)]

# (a) une bosse ou un creux sur le bord du haut. t = 0 : triangle en bosse ; 1 : triangle en creux ;
# 2 : demi-disque en bosse ; 3 : demi-disque en creux. Toujours : la figure a le plus grand
# périmètre (le piège : « creux = plus petit »).
FIG_A = {
    0: poly('F', [(0, 0), (6, 0), (6, 4), ('{{eval:p+2}}', 4), ('{{eval:p+1}}', '{{eval:4+k}}'),
                  ('{{p}}', 4), (0, 4)]),
    1: poly('F', [(0, 0), (6, 0), (6, 4), ('{{eval:p+2}}', 4), ('{{eval:p+1}}', '{{eval:4-k}}'),
                  ('{{p}}', 4), (0, 4)]),
    2: poly('F', [(0, 0), (6, 0), (6, 4)] + BOSSE + [(0, 4)]),
    3: poly('F', [(0, 0), (6, 0), (6, 4)] + CREUX + [(0, 4)]),
}
N3_A = variation(
    ENONCE_N3 + figure_n3('Un rectangle en pointillés et une figure colorée posée dessus, avec une '
                          'bosse ou un creux sur le bord du haut.', selon_lignes('t', FIG_A))
    + '\n\n' + CHOIX_N3,
    [var('t', '0..3'), var('p', '1..3'), var('k', '1..2')],
    [case('1')],
    [
        selon('t', [
            'Sur le bord du haut, la figure colorée remplace un segment par les deux côtés d\'un '
            'triangle qui **dépasse**.',
            'Sur le bord du haut, la figure colorée remplace un segment par les deux côtés d\'un '
            'triangle **creusé**.',
            'Sur le bord du haut, la figure colorée remplace un segment par un demi-cercle qui '
            '**dépasse**.',
            'Sur le bord du haut, la figure colorée remplace un segment par un demi-cercle '
            '**creusé**.',
        ]),
        'Ce détour est plus long que le segment qu\'il remplace, qu\'il aille vers l\'extérieur ou '
        'vers l\'intérieur ; le reste du contour est le même.',
        '$' + couleur('\\text{La figure colorée}') + '$ a le plus grand périmètre.',
    ],
    'Compare seulement les morceaux de contour qui diffèrent : le chemin le plus court entre deux '
    'points, c\'est la ligne droite.',
)

# (b) une partie découpée et recollée de l'autre côté : même aire, périmètre plus grand.
# s = 0 : triangle du haut recollé en bas ; s = 1 : triangle de gauche recollé à droite.
FIG_B = {
    0: poly('F', [(0, 0), ('{{q}}', 0), ('{{eval:q+1}}', '{{eval:-k}}'), ('{{eval:q+2}}', 0), (6, 0),
                  (6, 4), ('{{eval:p+2}}', 4), ('{{eval:p+1}}', '{{eval:4-k}}'), ('{{p}}', 4),
                  (0, 4)]),
    1: poly('F', [(0, 0), (6, 0), (6, 1), ('{{eval:6+k}}', 2), (6, 3), (6, 4), (0, 4), (0, 3),
                  ('{{k}}', 2), (0, 1)]),
}
N3_B = variation(
    ENONCE_N3 + figure_n3('Un rectangle en pointillés et une figure colorée posée dessus : un '
                          'triangle découpé d\'un côté dépasse de l\'autre.', selon_lignes('s', FIG_B))
    + '\n\n' + CHOIX_N3,
    [var('s', '0..1'), var('p', '1..3'), var('q', '1..3'), var('k', '1..2')],
    [case('1')],
    [
        selon('s', ['On a découpé un triangle en haut du rectangle et on l\'a recollé en bas.',
                    'On a découpé un triangle à gauche du rectangle et on l\'a recollé à droite.']),
        'L\'aire n\'a pas changé, mais le contour est plus long : à deux endroits, un segment est '
        'remplacé par les deux côtés d\'un triangle.',
        '$' + couleur('\\text{La figure colorée}') + '$ a le plus grand périmètre.',
    ],
    'Ne regarde pas la surface, regarde le tour : le contour de la figure colorée suit-il les mêmes '
    'segments que le rectangle ?',
)

# (c) s = 0 : quadrilatère inscrit (un sommet sur chaque côté) ; s = 1 : hexagone qui contient le
# rectangle. Une figure convexe à l'intérieur d'une autre a un périmètre plus petit.
FIG_C = {
    0: poly('F', [('{{a}}', 0), (6, '{{b}}'), ('{{eval:6-a}}', 4), (0, '{{eval:4-b}}')]),
    1: poly('F', [(-1, '{{eval:-0.5*b}}'), (3, '{{eval:-1-0.5*b}}'), (7, '{{eval:-0.5*b}}'),
                  (7, '{{eval:4+0.5*b}}'), (3, '{{eval:5+0.5*b}}'), (-1, '{{eval:4+0.5*b}}')]),
}
N3_C = variation(
    ENONCE_N3 + figure_n3('Un rectangle en pointillés et une figure colorée : l\'une est '
                          'entièrement à l\'intérieur de l\'autre.', selon_lignes('s', FIG_C),
                          '-2 ; 8 ; -3 ; 7.5')
    + '\n\n' + CHOIX_N3,
    [var('s', '0..1'), var('a', '1..4'), var('b', '1..3')],
    [case(selon('s', ['0', '1']))],
    [
        selon('s', ['La figure colorée est tout entière à l\'intérieur du rectangle : chacun de ses '
                    'côtés coupe au plus court un coin du rectangle.',
                    'Le rectangle est tout entier à l\'intérieur de la figure colorée : chacun de ses '
                    'côtés coupe au plus court un coin de la figure.']),
        selon('s', ['$' + couleur('\\text{Le rectangle}') + '$ a le plus grand périmètre.',
                    '$' + couleur('\\text{La figure colorée}') + '$ a le plus grand périmètre.']),
    ],
    'L\'une des deux figures est-elle tout entière à l\'intérieur de l\'autre ? Laquelle fait le '
    'plus grand tour ?',
)

SPECS_N3 = [
    spec('Triangle en bosse : la figure', 0, {'t': '0', 'p': '2', 'k': '1'}, 'correct', ['1']),
    spec('Triangle en creux : la figure', 0, {'t': '1', 'p': '2', 'k': '2'}, 'correct', ['1']),
    spec('Triangle en creux : le rectangle refusé', 0, {'t': '1', 'p': '2', 'k': '2'}, 'incorrect',
         ['0']),
    spec('Demi-disque en bosse : la figure', 0, {'t': '2', 'p': '1', 'k': '1'}, 'correct', ['1']),
    spec('Demi-disque en creux : la figure', 0, {'t': '3', 'p': '3', 'k': '1'}, 'correct', ['1']),
    spec('Demi-disque en creux : le même refusé', 0, {'t': '3', 'p': '3', 'k': '1'}, 'incorrect',
         ['2']),
    spec('Découpé et recollé : la figure', 1, {'s': '0', 'p': '1', 'q': '3', 'k': '1'}, 'correct',
         ['1']),
    spec('Découpé et recollé : « le même » refusé', 1, {'s': '1', 'p': '1', 'q': '1', 'k': '2'},
         'incorrect', ['2']),
    spec('Quadrilatère inscrit : le rectangle', 2, {'s': '0', 'a': '2', 'b': '1'}, 'correct', ['0']),
    spec('Quadrilatère inscrit : la figure refusée', 2, {'s': '0', 'a': '2', 'b': '1'}, 'incorrect',
         ['1']),
    spec('Rectangle inscrit : la figure', 2, {'s': '1', 'a': '2', 'b': '2'}, 'correct', ['1']),
]
N3 = modele(
    'Comparer des périmètres sans mesurer',
    'Comparer le périmètre d\'un rectangle et d\'une figure posée dessus, sans mesurer : bosse ou '
    'creux (le détour allonge le contour), partie découpée et recollée (même aire, plus grand '
    'périmètre), figure inscrite',
    2, 30, [N3_A, N3_B, N3_C], SPECS_N3, PERIMETRES)


# =============================================================================================
# N4 — 6e sans point (Q2) : le sens des préfixes.
# =============================================================================================

PREFIXES = ['kilo', 'hecto', 'déca', 'déci', 'centi', 'milli']
SENS = ['mille', 'cent', 'dix', 'un dixième', 'un centième', 'un millième']
N4_A = variation(
    'Dans le mot « ' + selon('p', [x + 'mètre' for x in PREFIXES]) + ' », que veut dire le préfixe '
    '« ' + selon('p', PREFIXES) + ' » ?\n\n'
    + bloc('choix', 'melanger: non', *['- ' + x for x in SENS]),
    [var('p', '0..5')],
    [case('{{p}}')],
    [
        '$1~' + u(selon('p', ['km', 'hm', 'dam', 'dm', 'cm', 'mm'])) + ' = '
        + selon('p', ['1\\,000~\\unit{m}', '100~\\unit{m}', '10~\\unit{m}', '\\frac{1}{10}~\\unit{m}',
                      '\\frac{1}{100}~\\unit{m}', '\\frac{1}{1\\,000}~\\unit{m}']) + '$.',
        '« ' + selon('p', PREFIXES) + ' » veut dire $' + couleur('\\text{' + selon('p', SENS) + '}')
        + '$.',
    ],
    'Kilo, hecto et déca désignent des unités plus grandes que le mètre ; déci, centi et milli des '
    'unités plus petites.',
)

MINUS = ['dm', 'cm', 'mm']
PARTS = ['un dixième', 'un centième', 'un millième']
N4_B = variation(
    'Complète la phrase.\n\n$1~' + u(selon('u', MINUS)) + '$ est … de mètre.\n\n'
    + bloc('choix', 'melanger: non', '- un dixième', '- un centième', '- un millième',
           '- une centaine'),
    [var('u', '0..2')],
    [case('{{u}}')],
    [
        'Il faut ' + selon('u', ['$10$', '$100$', '$1\\,000$']) + ' ' + selon('u', MINUS)
        + ' pour faire $1~\\unit{m}$.',
        '$1~' + u(selon('u', MINUS)) + '$ est $' + couleur('\\text{' + selon('u', PARTS) + '}')
        + '$ de mètre.',
    ],
    'Combien de ' + selon('u', MINUS) + ' faut-il pour faire $1$ mètre ? Un seul en est quelle part ?',
)


def msg_n4c_inv(i=None):
    x = choisir('u', MINUS, i)
    return ('Le ' + x + ' est plus petit que le mètre : $1~\\unit{' + x + '}$ n\'est qu\'une petite '
            'partie de $1~\\unit{m}$.')


def msg_rangs(unite, nombre):
    return ('Compte les rangs entre le ' + unite + ' et le mètre dans le tableau de conversion : il y '
            'en a ' + nombre + '.')


def msg_n4c_rang(i=None):
    return msg_rangs(choisir('u', MINUS, i), choisir('u', ['un', 'deux', 'trois'], i))


DIX = ['10', '100', '1\\,000']
N4_C = variation(
    'Complète, en écriture fractionnaire ou décimale.\n\n$1~' + u(selon('u', MINUS))
    + ' = ?~\\unit{m}$',
    [var('u', '0..2')],
    [case('\\frac{1}{' + selon('u', DIX) + '}', [
        erreur(selon('u', DIX), msg_n4c_inv(), 'Sens inversé'),
        erreur(selon('u', ['0{,}01', '0{,}001', '0{,}0001']), msg_n4c_rang(), 'Un rang de trop'),
        erreur(selon('u', ['1', '0{,}1', '0{,}01']), msg_n4c_rang(), 'Un rang de moins'),
    ])],
    [
        '$1~\\unit{m} = ' + selon('u', DIX) + '~' + u(selon('u', MINUS)) + '$ : il faut $'
        + selon('u', DIX) + '$ ' + selon('u', MINUS) + ' pour faire $1$ mètre.',
        'Donc $1~' + u(selon('u', MINUS)) + ' = ' + couleur('\\frac{1}{' + selon('u', DIX)
                                                            + '}~\\unit{m}') + ' = '
        + selon('u', ['0{,}1', '0{,}01', '0{,}001']) + '~\\unit{m}$.',
    ],
    'Combien de ' + selon('u', MINUS) + ' faut-il pour faire $1$ mètre ? Un seul en est quelle part ?',
)

MAJUS = ['dam', 'hm', 'km']


def msg_n4d_inv(i=None):
    x = choisir('u', MAJUS, i)
    return ('Le ' + x + ' est plus grand que le mètre : $1~\\unit{m}$ n\'est qu\'une petite partie '
            'de $1~\\unit{' + x + '}$.')


def msg_n4d_rang(i=None):
    return msg_rangs(choisir('u', MAJUS, i), choisir('u', ['un', 'deux', 'trois'], i))


N4_D = variation(
    'Complète, en écriture fractionnaire ou décimale.\n\n$1~\\unit{m} = ?~' + u(selon('u', MAJUS))
    + '$',
    [var('u', '0..2')],
    [case('\\frac{1}{' + selon('u', DIX) + '}', [
        erreur(selon('u', DIX), msg_n4d_inv(), 'Sens inversé'),
        erreur(selon('u', ['0{,}01', '0{,}001', '0{,}0001']), msg_n4d_rang(), 'Un rang de trop'),
        erreur(selon('u', ['1', '0{,}1', '0{,}01']), msg_n4d_rang(), 'Un rang de moins'),
    ])],
    [
        '$1~' + u(selon('u', MAJUS)) + ' = ' + selon('u', DIX) + '~\\unit{m}$ : il faut $'
        + selon('u', DIX) + '$ mètres pour faire $1$ ' + selon('u', MAJUS) + '.',
        'Donc $1~\\unit{m} = ' + couleur('\\frac{1}{' + selon('u', DIX) + '}~'
                                         + u(selon('u', MAJUS))) + ' = '
        + selon('u', ['0{,}1', '0{,}01', '0{,}001']) + '~' + u(selon('u', MAJUS)) + '$.',
    ],
    'Combien de mètres faut-il pour faire $1$ ' + selon('u', MAJUS) + ' ? Un seul mètre en est '
    'quelle part ?',
)

SPECS_N4 = [
    spec('Kilo : mille', 0, {'p': '0'}, 'correct', ['0']),
    spec('Kilo : cent refusé', 0, {'p': '0'}, 'incorrect', ['1']),
    spec('Déci : un dixième', 0, {'p': '3'}, 'correct', ['3']),
    spec('Milli : un millième', 0, {'p': '5'}, 'correct', ['5']),
    spec('Milli : un centième refusé', 0, {'p': '5'}, 'incorrect', ['4']),
    spec('1 cm : un centième', 1, {'u': '1'}, 'correct', ['1']),
    spec('1 cm : une centaine refusée', 1, {'u': '1'}, 'incorrect', ['3']),
    spec('1 mm : un millième', 1, {'u': '2'}, 'correct', ['2']),
    spec('1 mm = 1/1 000 m', 2, {'u': '2'}, 'correct', ['\\frac{1}{1\\,000}']),
    spec('1 mm = 0,001 m', 2, {'u': '2'}, 'correct', ['0{,}001']),
    spec('1 dm = 0,1 m', 2, {'u': '0'}, 'correct', ['0{,}1']),
    spec('1 cm = 1/100 m', 2, {'u': '1'}, 'correct', ['\\frac{1}{100}']),
    spec('1 mm : 1 000', 2, {'u': '2'}, 'incorrect', ['1\\,000'], msg_n4c_inv(2)),
    spec('1 mm : 0,0001', 2, {'u': '2'}, 'incorrect', ['0{,}0001'], msg_n4c_rang(2)),
    spec('1 mm : 0,01', 2, {'u': '2'}, 'incorrect', ['0{,}01'], msg_n4c_rang(2)),
    spec('1 cm : 0,1', 2, {'u': '1'}, 'incorrect', ['0{,}1'], msg_n4c_rang(1)),
    spec('1 m = 1/1 000 km', 3, {'u': '2'}, 'correct', ['\\frac{1}{1\\,000}']),
    spec('1 m = 0,001 km', 3, {'u': '2'}, 'correct', ['0{,}001']),
    spec('1 m = 0,01 hm', 3, {'u': '1'}, 'correct', ['0{,}01']),
    spec('1 m = 0,1 dam', 3, {'u': '0'}, 'correct', ['0{,}1']),
    spec('1 m : 1 000 km', 3, {'u': '2'}, 'incorrect', ['1\\,000'], msg_n4d_inv(2)),
    spec('1 m : 0,01 km', 3, {'u': '2'}, 'incorrect', ['0{,}01'], msg_n4d_rang(2)),
    spec('1 m : 0,0001 km', 3, {'u': '2'}, 'incorrect', ['0{,}0001'], msg_n4d_rang(2)),
    spec('1 m : 10 dam', 3, {'u': '0'}, 'incorrect', ['10'], msg_n4d_inv(0)),
]
N4 = modele(
    'Le sens des préfixes',
    'Kilo, hecto, déca, déci, centi, milli : mille, cent, dix, un dixième, un centième, un '
    'millième ; 1 cm est un centième de mètre ; 1 mm = 1/1 000 m ; 1 m = 1/1 000 km ; pièges : '
    'kilo = cent, le sens inversé, un rang de trop',
    5, 15, [N4_A, N4_B, N4_C, N4_D], SPECS_N4, UNITES, {'constraints': {'form': 'off'}})


# =============================================================================================
# N5 — 6e sans point (Q2) : convertir en mètre, et du mètre vers une autre unité.
# Nombre a : g = 0 : 10..90 (dizaines) ; 1 : 100..900 (centaines) ; 2 : 11..99 ; (c) g = 3 : 1..9.
# Erreurs prévues : le mauvais sens, un rang de trop, un rang de moins (× 10, ÷ 10).
# =============================================================================================

A_N5 = 'eval:' + sel('g', ['10*n1', '100*n1', 'n2'])
A_N5C = 'eval:' + sel('g', ['10*n1', '100*n1', 'n2', 'n0'])
FOIS = ['10', '100', '1\\,000']
NB_RANGS = ['un rang', 'deux rangs', 'trois rangs']


def msg_rang_n5(unites, i=None):
    return ('Entre le ' + choisir('u', unites, i) + ' et le mètre, il y a '
            + choisir('u', NB_RANGS, i) + ' dans le tableau de conversion : pas un de plus, pas un '
            'de moins.')


def msg_sens(cas, unites, i=None):
    x = choisir('u', unites, i)
    if cas == 'vers_m_grand':
        return ('Le ' + x + ' est plus grand que le mètre : il faut **plus** de mètres que de ' + x
                + ', le nombre doit grandir.')
    if cas == 'vers_m_petit':
        return ('Le ' + x + ' est plus petit que le mètre : il faut **moins** de mètres que de ' + x
                + ', le nombre doit diminuer.')
    return ('Le ' + x + ' est plus grand que le mètre : il faut **moins** de ' + x + ' que de '
            'mètres, le nombre doit diminuer.')


def conversion(enonce, unites, depart_m, cas, vars_a, attendue, err_plus, err_moins, err_sens,
               operation, hint):
    """Une variation de N5 : a unités → m (depart_m faux) ou a m → unités (depart_m vrai)."""
    ux = u(selon('u', unites))
    if depart_m:
        egalite = '${{a}}~\\unit{m} = ?~' + ux + '$'
        rappel = ('$1~' + ux + ' = ' + selon('u', FOIS) + '~\\unit{m}$ : on divise par $'
                  + selon('u', FOIS) + '$.')
        calcul = ('${{a}} \\div ' + selon('u', FOIS) + ' = ' + attendue + '$, donc ${{a}}~\\unit{m} = '
                  + couleur(attendue + '~' + ux) + '$.')
    else:
        egalite = '${{a}}~' + ux + ' = ?~\\unit{m}$'
        rappel = ('$1~' + ux + ' = ' + selon('u', ['0{,}1', '0{,}01', '0{,}001'] if cas ==
                                                 'vers_m_petit' else FOIS) + '~\\unit{m}$ : on '
                  + operation + ' par $' + selon('u', FOIS) + '$.')
        signe = '\\div' if cas == 'vers_m_petit' else '\\times'
        calcul = ('${{a}} ' + signe + ' ' + selon('u', FOIS) + ' = ' + attendue + '$, donc ${{a}}~' + ux
                  + ' = ' + couleur(attendue + '~\\unit{m}') + '$.')
    return variation(
        enonce + '\n\n' + egalite,
        [var('u', '0..2'), var('k', 'eval:u+1')] + vars_a,
        [case(attendue, [
            erreur(err_plus, msg_rang_n5(unites), 'Un rang de trop'),
            erreur(err_moins, msg_rang_n5(unites), 'Un rang de moins'),
            erreur(err_sens, msg_sens(cas, unites), 'Mauvais sens'),
        ])],
        [rappel, calcul],
        hint,
    )


VARS_A = [var('g', '0..2'), var('n1', '1..9'), var('n2', '11..99'), var('a', A_N5)]
VARS_AC = [var('g', '0..3'), var('n0', '1..9'), var('n1', '1..9'), var('n2', '11..99'),
           var('a', A_N5C)]

N5_A = conversion(
    'Convertis en mètres.', MAJUS, False, 'vers_m_grand', VARS_A,
    '{{eval:a*10^k}}', '{{eval:a*10^(k+1)}}', '{{eval:a*10^(k-1)}}', '{{eval:a/10^k;d}}',
    'multiplie',
    'Combien de mètres dans $1$ ' + selon('u', MAJUS) + ' ? Le nombre de mètres sera-t-il plus grand '
    'ou plus petit ?')
N5_B = conversion(
    'Convertis en mètres.', MINUS, False, 'vers_m_petit', VARS_A,
    '{{eval:a/10^k;d}}', '{{eval:a/10^(k+1);d}}', '{{eval:a/10^(k-1);d}}', '{{eval:a*10^k}}',
    'divise',
    'Combien de ' + selon('u', MINUS) + ' faut-il pour faire $1$ mètre ? Le nombre de mètres '
    'sera-t-il plus grand ou plus petit ?')
N5_C = conversion(
    'Convertis dans l\'unité demandée.', MAJUS, True, 'depuis_m', VARS_AC,
    '{{eval:a/10^k;d}}', '{{eval:a/10^(k+1);d}}', '{{eval:a/10^(k-1);d}}', '{{eval:a*10^k}}',
    'divise',
    'Combien de mètres dans $1$ ' + selon('u', MAJUS) + ' ? Le nombre de ' + selon('u', MAJUS)
    + ' sera-t-il plus grand ou plus petit que le nombre de mètres ?')

# (d) décimaux vers le mètre. s = 0 : km, hm, dam ; s = 1 : dm, cm (alors g = 0 ; pas de mm).
# Nombre N / D : g = 0 : X,X (11..99 / 10, chiffre des dixièmes non nul) ; 1 : 0,0X ; 2 : XX,X.
# E = puissance de 10 de l'unité (3 pour km … −3 pour mm) ; réponse N × 10^(E+3) / (1000 × D).
TOUTES = ['km', 'hm', 'dam', 'dm', 'cm', 'mm']
FACTEURS = ['1\\,000', '100', '10', '0{,}1', '0{,}01', '0{,}001']
OPERATIONS = ['\\times 1\\,000', '\\times 100', '\\times 10', '\\div 10', '\\div 100',
              '\\div 1\\,000']
VARS_D = [var('s', '0..1'), var('w', '0..2'), var('g0', '0..2'), var('g', 'eval:(1-s)*g0'),
          var('q1', '1..9'), var('q2', '10..99'), var('q0', '1..9'),
          var('N', 'eval:' + sel('g', ['10*q1+q0', 'q0', '10*q2+q0'])),
          var('D', 'eval:' + sel('g', ['10', '100', '10'])),
          var('u', 'eval:3*s+w'), var('E', 'eval:(1-s)*(3-w)-s*(w+1)'),
          var('R', 'eval:(1-s)*(3-w)+s*(w+1)'), var('r0', 'eval:R-1')]


def msg_d_rang(i=None, r=None):
    return ('Entre le ' + choisir('u', TOUTES, i) + ' et le mètre, il y a '
            + choisir('r0', NB_RANGS, r) + ' dans le tableau de conversion : pas un de plus, pas un '
            'de moins.')


def msg_d_sens(i=None):
    if i is None:
        return '{{if:s==0|' + msg_sens('vers_m_grand', ['km', 'hm', 'dam'], None).replace(
            "{{if:u==", "{{if:w==") + '|' + msg_sens('vers_m_petit', MINUS, None).replace(
            "{{if:u==", "{{if:w==") + '}}'
    if i < 3:
        return msg_sens('vers_m_grand', ['km', 'hm', 'dam'], i)
    return msg_sens('vers_m_petit', MINUS, i - 3)


REP_D = '{{eval:N*10^(E+3)/(1000*D);d}}'
N5_D = variation(
    'Convertis en mètres.\n\n${{eval:N/D;d}}~' + u(selon('u', TOUTES)) + ' = ?~\\unit{m}$',
    VARS_D,
    [case(REP_D, [
        erreur('{{eval:N*10^(E+4)/(1000*D);d}}', msg_d_rang(), 'Un rang de trop (× 10)'),
        erreur('{{eval:N*10^(E+2)/(1000*D);d}}', msg_d_rang(), 'Un rang de moins (÷ 10)'),
        erreur('{{eval:N*10^(3-E)/(1000*D);d}}', msg_d_sens(), 'Mauvais sens'),
    ])],
    [
        '$1~' + u(selon('u', TOUTES)) + ' = ' + selon('u', FACTEURS) + '~\\unit{m}$.',
        '${{eval:N/D;d}} ' + selon('u', OPERATIONS) + ' = ' + REP_D + '$, donc ${{eval:N/D;d}}~'
        + u(selon('u', TOUTES)) + ' = ' + couleur(REP_D + '~\\unit{m}') + '$ : on déplace la virgule de '
        + selon('r0', NB_RANGS) + ' vers la ' + selon('s', ['droite', 'gauche']) + '.',
    ],
    'Le ' + selon('u', TOUTES) + ' est-il plus grand ou plus petit que le mètre ? De combien de '
    'rangs faut-il déplacer la virgule ?',
    # Pas de décimal en mm : 4,6 mm = 0,0046 m (quatre décimales) dépasse la fiche.
    conditions=['u!=5'],
)


def vars_d(s, w, g0, q1, q2, q0):
    g = (1 - s) * g0
    N = [10 * q1 + q0, q0, 10 * q2 + q0][g]
    D = [10, 100, 10][g]
    E = (1 - s) * (3 - w) - s * (w + 1)
    R = (1 - s) * (3 - w) + s * (w + 1)
    return {'s': str(s), 'w': str(w), 'g0': str(g0), 'g': str(g), 'q1': str(q1), 'q2': str(q2),
            'q0': str(q0), 'N': str(N), 'D': str(D), 'u': str(3 * s + w), 'E': str(E),
            'R': str(R), 'r0': str(R - 1)}


def va(g, n1=1, n2=11, n0=None):
    a = [10 * n1, 100 * n1, n2, n0][g]
    d = {'g': str(g), 'n1': str(n1), 'n2': str(n2), 'a': str(a)}
    if n0 is not None:
        d['n0'] = str(n0)
    return d


SPECS_N5 = [
    # (a) 45 hm = 4 500 m
    spec('45 hm = 4 500 m', 0, {'u': '1', 'k': '2', **va(2, n2=45)}, 'correct', ['4\\,500']),
    spec('45 hm : 45 000', 0, {'u': '1', 'k': '2', **va(2, n2=45)}, 'incorrect', ['45\\,000'],
         msg_rang_n5(MAJUS, 1)),
    spec('45 hm : 450', 0, {'u': '1', 'k': '2', **va(2, n2=45)}, 'incorrect', ['450'],
         msg_rang_n5(MAJUS, 1)),
    spec('45 hm : 0,45', 0, {'u': '1', 'k': '2', **va(2, n2=45)}, 'incorrect', ['0{,}45'],
         msg_sens('vers_m_grand', MAJUS, 1)),
    spec('300 km = 300 000 m', 0, {'u': '2', 'k': '3', **va(1, n1=3)}, 'correct', ['300\\,000']),
    spec('70 dam = 700 m', 0, {'u': '0', 'k': '1', **va(0, n1=7)}, 'correct', ['700']),
    # (b) 320 cm = 3,2 m ; 45 mm = 0,045 m
    spec('32 cm = 0,32 m', 1, {'u': '1', 'k': '2', **va(2, n2=32)}, 'correct', ['0{,}32']),
    spec('30 cm = 0,3 m', 1, {'u': '1', 'k': '2', **va(0, n1=3)}, 'correct', ['0{,}3']),
    spec('300 cm = 3 m', 1, {'u': '1', 'k': '2', **va(1, n1=3)}, 'correct', ['3']),
    spec('45 mm = 0,045 m', 1, {'u': '2', 'k': '3', **va(2, n2=45)}, 'correct', ['0{,}045']),
    spec('45 mm : 0,45 m', 1, {'u': '2', 'k': '3', **va(2, n2=45)}, 'incorrect', ['0{,}45'],
         msg_rang_n5(MINUS, 2)),
    spec('45 mm : 0,0045 m', 1, {'u': '2', 'k': '3', **va(2, n2=45)}, 'incorrect', ['0{,}0045'],
         msg_rang_n5(MINUS, 2)),
    spec('45 mm : 45 000 m', 1, {'u': '2', 'k': '3', **va(2, n2=45)}, 'incorrect', ['45\\,000'],
         msg_sens('vers_m_petit', MINUS, 2)),
    spec('60 dm = 6 m', 1, {'u': '0', 'k': '1', **va(0, n1=6)}, 'correct', ['6']),
    # (c) 450 m = 0,45 km ; 7 m = 0,007 km
    spec('400 m = 0,4 km', 2, {'u': '2', 'k': '3', **va(1, n1=4, n0=1)}, 'correct', ['0{,}4']),
    spec('400 m : 4 km', 2, {'u': '2', 'k': '3', **va(1, n1=4, n0=1)}, 'incorrect', ['4'],
         msg_rang_n5(MAJUS, 2)),
    spec('7 m = 0,007 km', 2, {'u': '2', 'k': '3', **va(3, n0=7)}, 'correct', ['0{,}007']),
    spec('7 m : 7 000 km', 2, {'u': '2', 'k': '3', **va(3, n0=7)}, 'incorrect', ['7\\,000'],
         msg_sens('depuis_m', MAJUS, 2)),
    spec('7 m : 0,07 km', 2, {'u': '2', 'k': '3', **va(3, n0=7)}, 'incorrect', ['0{,}07'],
         msg_rang_n5(MAJUS, 2)),
    spec('7 m : 0,0007 km', 2, {'u': '2', 'k': '3', **va(3, n0=7)}, 'incorrect', ['0{,}0007'],
         msg_rang_n5(MAJUS, 2)),
    spec('45 m = 0,45 hm', 2, {'u': '1', 'k': '2', **va(2, n2=45, n0=1)}, 'correct', ['0{,}45']),
    spec('45 m = 0.45 hm (point)', 2, {'u': '1', 'k': '2', **va(2, n2=45, n0=1)}, 'correct',
         ['0.45']),
    # (d) 3,7 dm = 0,37 m ; 0,05 km = 50 m ; 12,4 hm = 1 240 m
    spec('3,7 dm = 0,37 m', 3, vars_d(1, 0, 0, 3, 10, 7), 'correct', ['0{,}37']),
    spec('3,7 dm : 37 m', 3, vars_d(1, 0, 0, 3, 10, 7), 'incorrect', ['37'],
         msg_sens('vers_m_petit', MINUS, 0)),
    spec('3,7 dm : 0,037 m', 3, vars_d(1, 0, 0, 3, 10, 7), 'incorrect', ['0{,}037'],
         msg_d_rang(3, 0)),
    spec('0,05 km = 50 m', 3, vars_d(0, 0, 1, 1, 10, 5), 'correct', ['50']),
    spec('0,05 km : 500 m', 3, vars_d(0, 0, 1, 1, 10, 5), 'incorrect', ['500'], msg_d_rang(0, 2)),
    spec('0,05 km : 0,000 05 m', 3, vars_d(0, 0, 1, 1, 10, 5), 'incorrect', ['0{,}00005'],
         msg_sens('vers_m_grand', ['km', 'hm', 'dam'], 0)),
    spec('12,4 hm = 1 240 m', 3, vars_d(0, 1, 2, 1, 12, 4), 'correct', ['1\\,240']),
    spec('12,4 hm : 124 m', 3, vars_d(0, 1, 2, 1, 12, 4), 'incorrect', ['124'], msg_d_rang(1, 1)),
    spec('4,6 cm = 0,046 m', 3, vars_d(1, 1, 2, 4, 10, 6), 'correct', ['0{,}046']),
]
N5 = modele(
    'Convertir en mètre, et du mètre vers une autre unité',
    'a dam, hm, km → m et a dm, cm, mm → m (a de 10 à 90, de 100 à 900, de 11 à 99) ; a m → dam, '
    'hm, km (a de 1 à 9 compris) ; décimaux vers le mètre ; pièges : le mauvais sens, un rang de '
    'trop ou de moins',
    6, 30, [N5_A, N5_B, N5_C, N5_D], SPECS_N5, UNITES, {'constraints': {'form': 'off'}}, DECIMAL)


ecrire('n1-formule-perimetre-carre', N1C)
ecrire('n1-formule-perimetre-rectangle', N1R)
ecrire('n2-perimetre-portion-disque', N2)
ecrire('n3-comparer-perimetres-sans-mesurer', N3)
ecrire('n4-sens-des-prefixes', N4)
ecrire('n5-convertir-en-metre', N5)
print('6 modèles écrits dans', DOSSIER)
