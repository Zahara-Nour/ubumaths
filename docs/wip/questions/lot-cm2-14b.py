"""Écrit les 6 modèles du lot 14b du CM2 (courbes, construire, problèmes) dans scripts/questions/cm2-14b/.

Phase 0 validée par David le 2026-11-19 (§ 22 et 22.1 du journal
`docs/archive/wip/questions-cm2-progress.md`, « je te suis ») : 6 modèles (CM2-125, 159, 121, 122, 108 ×2) ;
niveaux 4, 5, 6 (courbes et repères), 10 (diagrammes en barres), 4 et 4 (notion « Représenter des
données ») ; 121 avec un relevé brut à compter (échelles 1, 2, 5, 10, effectifs ≤ 100) ; cocktail :
parts lues à l'œil (moitié, quart), le bloc n'écrit pas de fractions sur les secteurs.

Bornes (`cycle3.json`) : générales du CM2 ; 108, une ou deux étapes, tableau, barres, circulaire,
courbe ; 121, 122, échelle adaptée.

Patrons : `lot-cm2-14a.py` (gabarits), `lot-cm1-7.py` (jumeaux CM1 : courbes, repère, construire,
problèmes). Valeur de rang k : polynôme de Lagrange (`selon`).

Pièges (relus dans le journal) : aucune `{{if}}` dans une réponse attendue ; `i` et `e` jamais
comme variables ; « de » + `{{if}}` ne s'élide pas (le « de » va dans le mot) ; une spec qui
recalcule la donnée par la formule du modèle ne la vérifie pas : contrôler l'invariant à part.

    python3 -I docs/wip/questions/lot-cm2-14b.py scripts/questions/cm2-14b
"""
import json
import os
import sys

DOSSIER = sys.argv[1]
ENTIERS = {'constraints': {'spacesFromFourDigits': True}}
DECIMAUX = {'constraints': {'spacesFromFourDigits': True, 'zeros': 'off'}}
VIRGULE_EXIGEE = {'pattern': 'a:number'}
MODELES = {}

# ---- Gabarits (comme lot-cm2-14a.py) ----


def var(nom, expression):
    return {'name': nom, 'expression': expression}


def variation(enonce, variables, reponses, etapes, conditions=None):
    """`reponses` : attendus (texte) ou dicts de case, une par case."""
    v = {'statement': enonce, 'variables': variables}
    if conditions:
        v['conditions'] = conditions
    v['blanks'] = [r if isinstance(r, dict) else {'expectedAnswer': r} for r in reponses]
    v['correction'] = {'steps': etapes}
    return v


def modele(title, description, niveau, variations, specs, delay=90, options=ENTIERS):
    return {'title': title, 'description': description, 'grades': ['CM2'], 'level': niveau,
            'delay': delay, 'status': 'draft', 'options': options, 'variations': variations,
            'testSpecs': specs}


def calcule(variables, tirage):
    """Valeurs de toutes les variables d'une variation, à partir des tirages donnés."""
    valeurs = {}
    for v in variables:
        nom, expr = v['name'], v['expression']
        if expr.startswith('eval:'):
            x = eval(expr[5:], {'__builtins__': {}, 'max': max, 'min': min, 'abs': abs,
                                'mod': lambda a, b: a % b}, dict(valeurs))
            assert abs(x - round(x)) < 1e-9, (nom, x)
            valeurs[nom] = int(round(x))
        else:
            assert nom in tirage, ('tirage manquant', nom)
            valeurs[nom] = tirage[nom]
    return valeurs


def spec(desc, vi, mod_variations, tirage, answers, status):
    valeurs = calcule(mod_variations[vi]['variables'], tirage)
    return {'description': desc, 'variationIndex': vi,
            'variables': {k: str(x) for k, x in valeurs.items()},
            'answers': answers if isinstance(answers, list) else [answers],
            'expected': {'status': status}}


def valeurs_de(mod_variations, vi, tirage):
    return calcule(mod_variations[vi]['variables'], tirage)


def lagrange(j, n, k='k'):
    """Polynôme qui vaut 1 en k = j et 0 aux autres rangs 0..n-1."""
    num = '*'.join(f'({k}-{m})' for m in range(n) if m != j)
    den = 1
    for m in range(n):
        if m != j:
            den *= (j - m)
    return f'({num})/({den})' if num else '1'


def selon(exprs, k='k'):
    """La valeur de rang k parmi exprs (expression sans `eval:`)."""
    n = len(exprs)
    return '+'.join(f'({e})*{lagrange(j, n, k)}' for j, e in enumerate(exprs))


def si(k, mots, depart=0):
    """Le mot de rang k (k = depart, depart + 1…), dans un énoncé ou un corrigé seulement."""
    s = mots[-1]
    for j in range(len(mots) - 2, -1, -1):
        s = '{{if:' + k + '==' + str(j + depart) + '|' + mots[j] + '|' + s + '}}'
    return s


def col(x):
    return '\\textcolor{{{color:primary.0}}}{' + x + '}'


def evd(x):
    return '{{eval:' + x + ';d}}'


def decimal(x):
    return {'expectedAnswer': x, 'requiredForm': VIRGULE_EXIGEE}


def compte(prefixe, n, modalite, modalites):
    """Nombre de valeurs égales à `modalite` parmi prefixe1..prefixeN (valeurs dans `modalites`)."""
    termes = []
    for s in range(1, n + 1):
        x = f'{prefixe}{s}'
        num = '*'.join(f'({x}-{m})' for m in modalites if m != modalite)
        den = 1
        for m in modalites:
            if m != modalite:
                den *= (modalite - m)
        termes.append(f'{num}/({den})')
    return 'eval:' + '+'.join(termes)


def ecrire(nom, mod):
    MODELES[nom] = mod


def courbe(xs, ys, axes, ymax, pas_y, pas_x=1):
    """Courbe de données : abscisses xs, ordonnées ys (textes), une case de marge de chaque côté."""
    pts = ' ; '.join(f'({x} ; {y})' for x, y in zip(xs, ys))
    return (f"```courbe\nx: {xs[0] - pas_x} ; {xs[-1] + pas_x}\ny: 0 ; {ymax}\n"
            f"grille: {pas_x} ; {pas_y}\naxes: {axes}\ndonnées: {pts}\ntaille: moyenne\n```")


AXES_TEMP = 'x = Heure (h) ; y = Température (°C)'
AXES_RANDO = 'x = Heure (h) ; y = Distance parcourue (km)'
AXES_BEBE = 'x = Âge (mois) ; y = Masse (kg)'


def temperatures(n):
    return [f'{{{{t{j}}}}}' for j in range(n)]


# Le bébé, mois 1 à 6 : masses en demi-kilogrammes w1..w6 (3,5 à 4,5 kg à 1 mois, puis + 0,5 ou 1 kg)
BEBE_VARS = ([var('w1', '7..9')] + [var(f'g{j}', '1..2') for j in range(2, 7)]
             + [var(f'w{j}', f'eval:w{j - 1}+g{j}') for j in range(2, 7)])
BEBE = courbe(list(range(1, 7)), [evd(f'w{j}/2') for j in range(1, 7)], AXES_BEBE, 10, '0,5')
INTRO_BEBE = "On a pesé un bébé chaque mois, de $1$ à $6$ mois.\n\n"

# Le randonneur, de 9 h à 15 h : v1..v6 km par heure, arrêt de p à p + L (heures 9 + p à 9 + p + L)
def rando_vars(vmin, vmax):
    vs = [var(f'v{j}', f'{vmin}..{vmax}') for j in range(1, 7)] + [var('p', '1..4'), var('L', '1..2')]
    vs += [var(f'r{j}', f'eval:v{j}*(1-min(1,max(0,{j}-p))*min(1,max(0,p+L+1-{j})))')
           for j in range(1, 7)]
    vs += [var('t0', 'eval:0')] + [var(f't{j}', f'eval:t{j - 1}+r{j}') for j in range(1, 7)]
    return vs


RANDO = courbe(list(range(9, 16)), temperatures(7), AXES_RANDO, 30, 2)
INTRO_RANDO = ("Un randonneur part à $9$ h. La courbe donne la distance qu'il a parcourue depuis son "
               "départ, heure par heure.\n\n")

# ============================================================================
# 14b-1 — CM2-125 : lire une courbe (courbes et repères, niveau 4)
# ============================================================================

H11 = list(range(8, 19))
v1 = variation(
    "On a relevé la température toutes les heures, de $8$ h à $18$ h.\n\n"
    + courbe(H11, temperatures(11), AXES_TEMP, 30, 2)
    + "\n\nQuelle température faisait-il à ${{eval:8+k}}$ h ?\n\n$?$ °C",
    [var('t0', '5..9')] + [var(f'd{j}', '0..3') for j in range(1, 7)]
    + [var(f'd{j}', '0..2') for j in range(7, 11)]
    + [var(f't{j}', f'eval:t{j - 1}+d{j}') for j in range(1, 7)]
    + [var(f't{j}', f'eval:t{j - 1}-d{j}') for j in range(7, 11)]
    + [var('k', '0..10'), var('n', 'eval:' + selon([f't{j}' for j in range(11)]))],
    ['{{n}}'],
    ["On part de ${{eval:8+k}}$ h sur l'axe horizontal, on monte jusqu'au point de la courbe, puis "
     "on lit la température sur l'axe vertical : un carreau vaut $2$ °C.",
     "Le point tombe au milieu d'un carreau : la moitié de $2$, c'est $1$.",
     "À ${{eval:8+k}}$ h, il faisait $" + col('{{n}}') + "$ °C."],
    conditions=['mod(n,2) == 1', 't10 >= 1'])
v2 = variation(
    "On a relevé la température toutes les heures, de $8$ h à $14$ h.\n\n"
    + courbe(list(range(8, 15)), temperatures(7), AXES_TEMP, 30, 2)
    + "\n\nÀ quelle heure faisait-il ${{c}}$ °C ?\n\n$?$ h",
    [var('t0', '4..8')] + [var(f'd{j}', '1..3') for j in range(1, 7)]
    + [var(f't{j}', f'eval:t{j - 1}+d{j}') for j in range(1, 7)]
    + [var('k', '0..6'), var('c', 'eval:' + selon([f't{j}' for j in range(7)])),
       var('h', 'eval:8+k')],
    ['{{h}}'],
    ["On part de ${{c}}$ °C sur l'axe vertical, on suit la ligne horizontale jusqu'au point de la "
     "courbe, puis on descend lire l'heure.",
     "${{c}}$ °C : à $" + col('{{h}}') + "$ h."])
v3 = variation(
    INTRO_BEBE + BEBE + "\n\nQuelle était la masse du bébé à ${{eval:k+1}}$ mois ?\n\n$?$ kg",
    BEBE_VARS + [var('k', '0..5'), var('n', 'eval:' + selon([f'w{j}' for j in range(1, 7)]))],
    [decimal(evd('n/2'))],
    ["On part de ${{eval:k+1}}$ mois sur l'axe horizontal, on monte jusqu'au point, puis on lit "
     "l'axe vertical : il est gradué de $0{,}5$ en $0{,}5$ kg, deux carreaux font $1$ kg.",
     "À ${{eval:k+1}}$ mois, le bébé pesait $" + col(evd('n/2')) + "$ kg."])
v4 = variation(
    "Un randonneur part à $9$ h. La courbe donne la distance qu'il a parcourue depuis son départ, "
    "heure par heure.\n\n" + RANDO
    + "\n\nQuelle distance avait-il parcourue à ${{eval:9+k}}$ h ?\n\n$?$ km",
    [var(f'v{j}', '2..5') for j in range(1, 7)] + [var('t0', 'eval:0')]
    + [var(f't{j}', f'eval:t{j - 1}+v{j}') for j in range(1, 7)]
    + [var('k', '1..6'), var('n', 'eval:' + selon([f't{j}' for j in range(7)]))],
    ['{{n}}'],
    ["On part de ${{eval:9+k}}$ h sur l'axe horizontal, on monte jusqu'au point, puis on lit la "
     "distance sur l'axe vertical : un carreau vaut $2$ km.",
     "À ${{eval:9+k}}$ h, il avait parcouru $" + col('{{n}}') + "$ km."])
vs = [v1, v2, v3, v4]
t11 = {'t0': 7, 'd1': 2, 'd2': 3, 'd3': 1, 'd4': 2, 'd5': 3, 'd6': 0, 'd7': 1, 'd8': 2, 'd9': 1,
       'd10': 2}
t7 = {'t0': 5, 'd1': 2, 'd2': 1, 'd3': 3, 'd4': 2, 'd5': 3, 'd6': 1}
tb = {'w1': 8, 'g2': 2, 'g3': 1, 'g4': 2, 'g5': 1, 'g6': 1}
tr = {'v1': 4, 'v2': 3, 'v3': 5, 'v4': 2, 'v5': 4, 'v6': 3}
ecrire('01-lire-une-courbe', modele(
    "Lis la courbe (heure par heure, kg, km)",
    "La température heure par heure (axe de 2 en 2, valeur entre deux traits), l'heure d'une "
    "température donnée, la masse d'un bébé (axe de 0,5 en 0,5 kg), la distance d'un randonneur",
    4, vs,
    [spec("11 h : 13 °C, entre deux traits", 0, vs, {**t11, 'k': 3}, '13', 'correct'),
     spec("Erreur : le trait du dessous (12)", 0, vs, {**t11, 'k': 3}, '12', 'incorrect'),
     spec("13 °C : à 12 h", 1, vs, {**t7, 'k': 4}, '12', 'correct'),
     spec("Erreur : la température lue au lieu de l'heure (13)", 1, vs, {**t7, 'k': 4}, '13',
          'incorrect'),
     spec("3 mois : 5,5 kg", 2, vs, {**tb, 'k': 2}, '5,5', 'correct'),
     spec("Erreur : un carreau compté pour 1 kg (11)", 2, vs, {**tb, 'k': 2}, '11', 'incorrect'),
     spec("12 h : 12 km", 3, vs, {**tr, 'k': 3}, '12', 'correct'),
     spec("Erreur : l'heure d'avant (7)", 3, vs, {**tr, 'k': 3}, '7', 'incorrect')],
    delay=90, options=DECIMAUX))

# ============================================================================
# 14b-2 — CM2-159 : interpréter une courbe (courbes et repères, niveau 5)
# ============================================================================

# V1 : baisse jusqu'à 8 + p h, hausse jusqu'à 8 + q h, puis baisse
v1 = variation(
    "On a relevé la température toutes les heures, de $8$ h à $18$ h.\n\n"
    + courbe(H11, temperatures(11), AXES_TEMP, 30, 2)
    + "\n\nEntre quelles heures la température augmente-t-elle ?\n\nElle augmente de $?$ h à $?$ h.",
    [var('m', '4..8'), var('s1', '1..2'), var('s2', '2..3'), var('s3', '1..2'), var('p', '1..3'),
     var('L', '3..6'), var('q', 'eval:p+L')]
    + [var(f't{j}', f'eval:m+s1*max(0,p-{j})+s2*max(0,min({j},q)-p)-s3*max(0,{j}-q)')
       for j in range(11)]
    + [var('a', 'eval:8+p'), var('b', 'eval:8+q')],
    ['{{a}}', '{{b}}'],
    ["La température augmente quand la courbe monte, de gauche à droite.",
     "Elle descend jusqu'au point le plus bas, à ${{a}}$ h, puis monte jusqu'au point le plus haut, "
     "à ${{b}}$ h, puis redescend.",
     "Elle augmente de $" + col('{{a}}') + "$ h à $" + col('{{b}}') + "$ h."],
    conditions=['q <= 9', 't10 > m', 't0 < m+s2*L'])
# V2 : la plus forte hausse en une heure, au rang k
v2 = variation(
    "On a relevé la température toutes les heures, de $8$ h à $14$ h.\n\n"
    + courbe(list(range(8, 15)), temperatures(7), AXES_TEMP, 25, 1)
    + "\n\nEn quelle heure la température a-t-elle le plus monté ?\n\nDe $?$ h à $?$ h.",
    [var('t0', '4..8')] + [var(f'b{j}', '1..2') for j in range(1, 7)]
    + [var('g', '4..5'), var('k', '0..5')]
    + [var(f'd{j}', f'eval:b{j}+(g-b{j})*{lagrange(j - 1, 6)}') for j in range(1, 7)]
    + [var(f't{j}', f'eval:t{j - 1}+d{j}') for j in range(1, 7)]
    + [var('a', 'eval:8+k'), var('b', 'eval:9+k')],
    ['{{a}}', '{{b}}'],
    ["Chaque heure, on regarde de combien la courbe monte : la plus forte hausse, c'est le "
     "morceau de courbe le plus raide.",
     "De ${{a}}$ h à ${{b}}$ h, elle monte de ${{g}}$ °C ; les autres heures, de $1$ ou $2$ °C.",
     "De $" + col('{{a}}') + "$ h à $" + col('{{b}}') + "$ h."])
v3 = variation(
    INTRO_RANDO + RANDO
    + "\n\nLe randonneur s'est arrêté pour pique-niquer. De quelle heure à quelle heure ?"
    + "\n\nIl s'est arrêté de $?$ h à $?$ h.",
    rando_vars(3, 5) + [var('a', 'eval:9+p'), var('b', 'eval:9+p+L')],
    ['{{a}}', '{{b}}'],
    ["Quand il est arrêté, la distance parcourue ne change pas : la courbe est à plat.",
     "Elle reste à ${{eval:" + selon([f't{j}' for j in range(7)], 'p') + "}}$ km de ${{a}}$ h à "
     "${{b}}$ h.",
     "Il s'est arrêté de $" + col('{{a}}') + "$ h à $" + col('{{b}}') + "$ h."],
    conditions=['p+L <= 5'])
v4 = variation(
    INTRO_BEBE + BEBE
    + "\n\nCombien de kilogrammes le bébé a-t-il pris entre ${{eval:a+1}}$ mois et ${{eval:b+1}}$ "
      "mois ?\n\n$?$ kg",
    BEBE_VARS + [var('a', '0..2'), var('b', '3..5'),
                 var('x', 'eval:' + selon([f'w{j}' for j in range(1, 7)], 'a')),
                 var('y', 'eval:' + selon([f'w{j}' for j in range(1, 7)], 'b')),
                 var('d', 'eval:y-x')],
    [decimal(evd('d/2'))],
    ["On lit les deux masses : à ${{eval:a+1}}$ mois, ${{eval:x/2;d}}$ kg ; à ${{eval:b+1}}$ mois, "
     "${{eval:y/2;d}}$ kg.",
     "Ce qu'il a pris : l'écart, ${{eval:y/2;d}} - {{eval:x/2;d}} = " + col(evd('d/2')) + "$ kg."])
vs = [v1, v2, v3, v4]
tv1 = {'m': 6, 's1': 1, 's2': 2, 's3': 1, 'p': 2, 'L': 5}
tv2 = {'t0': 5, 'b1': 1, 'b2': 2, 'b3': 1, 'b4': 2, 'b5': 1, 'b6': 1, 'g': 4, 'k': 2}
tv3 = {'v1': 4, 'v2': 3, 'v3': 5, 'v4': 4, 'v5': 3, 'v6': 5, 'p': 2, 'L': 2}
ecrire('02-interpreter-une-courbe', modele(
    "Que dit la courbe ? (montée, plus forte hausse, arrêt)",
    "Entre quelles heures la température augmente (deux cases), en quelle heure elle a le plus "
    "monté, de quelle heure à quelle heure un randonneur s'est arrêté (courbe à plat), combien de "
    "kg un bébé a pris (décimaux)",
    5, vs,
    [spec("Augmente de 10 h à 15 h", 0, vs, tv1, ['10', '15'], 'correct'),
     spec("Erreur : depuis 8 h", 0, vs, tv1, ['8', '15'], 'incorrect'),
     spec("Erreur : la descente (15 h à 18 h)", 0, vs, tv1, ['15', '18'], 'incorrect'),
     spec("Plus forte hausse : de 10 h à 11 h", 1, vs, tv2, ['10', '11'], 'correct'),
     spec("Erreur : la plus haute valeur (13 h à 14 h)", 1, vs, tv2, ['13', '14'], 'incorrect'),
     spec("Arrêt de 11 h à 13 h", 2, vs, tv3, ['11', '13'], 'correct'),
     spec("Erreur : la marche avant l'arrêt (9 h à 11 h)", 2, vs, tv3, ['9', '11'], 'incorrect'),
     spec("De 1 à 4 mois : 6,5 − 4 = 2,5 kg", 3, vs, {**tb, 'a': 0, 'b': 3}, '2,5', 'correct'),
     spec("Erreur : la masse à 4 mois (6,5)", 3, vs, {**tb, 'a': 0, 'b': 3}, '6,5', 'incorrect')],
    delay=120, options=DECIMAUX))

# ============================================================================
# 14b-3 — CM2-121 : compter, puis construire un diagramme en barres (niveau 10)
# ============================================================================


def releve(n, prefixe, modalites, titre, axes, axe, phrase):
    """Relevé brut de n valeurs : la liste dans l'énoncé, `données:` dans le bloc."""
    liste = ' · '.join(f'${{{{{prefixe}{j}}}}}$' for j in range(1, n + 1))
    bloc = ("```barres\ntitre: " + titre + "\naxes: " + axes + "\ndonnées: "
            + ' ; '.join(f'{{{{{prefixe}{j}}}}}' for j in range(1, n + 1))
            + f"\naxe: {axe}\nplacer: toutes\n```")
    variables = ([var(f'{prefixe}{j}', f'{modalites[0]}..{modalites[-1]}') for j in range(1, n + 1)]
                 + [var(f'n{m}', compte(prefixe, n, m, modalites)) for m in modalites]
                 + [var('M', 'eval:max(' + ', '.join(f'n{m}' for m in modalites) + ')')])
    return phrase + "\n\n" + liste, bloc, variables


FRATRIE = [0, 1, 2, 3, 4]
txt1, bloc1, vars1 = releve(
    24, 's', FRATRIE, 'Frères et sœurs', 'Frères et sœurs ; Élèves', '0 à 10, de 1 en 1',
    "On a demandé aux $24$ élèves de la classe combien ils ont de frères et sœurs. Voici leurs "
    "réponses :")
v1 = variation(
    txt1 + "\n\nCompte chaque réponse, puis construis le diagramme en barres.\n\n" + bloc1,
    vars1, [],
    ["On compte chaque réponse, en barrant celles déjà comptées : "
     + ' ; '.join(f'${m}$ : ${{{{n{m}}}}}$ élèves' for m in FRATRIE) + '.',
     "On vérifie : ${{n0}} + {{n1}} + {{n2}} + {{n3}} + {{n4}} = 24$, autant que d'élèves.",
     "Chaque barre monte jusqu'à son nombre d'élèves, l'axe est gradué de $1$ en $1$."],
    conditions=[f'n{m} >= 1' for m in FRATRIE] + ['M <= 10'])
MASCOTTES = ['Pixel', 'Filou', 'Caramel', 'Tornade']
v2 = variation(
    "Les élèves de l'école ont voté pour le nom de leur mascotte.\n\n"
    "| Nom | Nombre de voix |\n|---|---|\n"
    + '\n'.join(f'| {nm} | ${{{{{l}}}}}$ |' for nm, l in zip(MASCOTTES, 'abcd'))
    + "\n\nChoisis l'échelle de l'axe, puis construis le diagramme en barres.\n\n"
    "```barres\ntitre: Nom de la mascotte\naxes: Nom ; Voix\n"
    + '\n'.join(f'{nm} = {{{{{l}}}}}' for nm, l in zip(MASCOTTES, 'abcd'))
    + "\naxe: à choisir\nplacer: toutes\n```",
    [var(l, '15..100') for l in 'abcd'] + [var('M', 'eval:max(a, b, c, d)')],
    [],
    ["L'axe a $10$ graduations : on prend la plus petite échelle où la plus grande barre rentre.",
     "La plus grande barre : ${{M}}$ voix. Avec $5$ par graduation, l'axe s'arrêterait à $50$ : trop "
     "court. Avec $10$, il monte jusqu'à $100$ : tout rentre.",
     "Chaque barre monte jusqu'à son nombre de voix ; une barre peut s'arrêter entre deux traits."],
    conditions=['M > 50'])
LIVRES = [1, 2, 3, 4, 5]
txt3, bloc3, vars3 = releve(
    36, 'l', LIVRES, 'Livres empruntés', 'Livres ; Élèves', 'à choisir',
    "On a demandé aux $36$ élèves de deux classes combien de livres ils ont empruntés à la "
    "bibliothèque ce mois-ci. Voici leurs réponses :")
v3 = variation(
    txt3 + "\n\nCompte chaque réponse, choisis l'échelle de l'axe, puis construis le diagramme en "
    "barres.\n\n" + bloc3,
    vars3, [],
    ["On compte chaque réponse, en barrant celles déjà comptées : "
     + ' ; '.join(f'${m}$ livre{"s" if m > 1 else ""} : ${{{{n{m}}}}}$ élèves' for m in LIVRES) + '.',
     "On vérifie : ${{n1}} + {{n2}} + {{n3}} + {{n4}} + {{n5}} = 36$, autant que d'élèves.",
     "La plus grande barre : ${{M}}$ élèves. Avec $1$ par graduation, l'axe s'arrêterait à $10$ : "
     "trop court. Avec $2$, il monte jusqu'à $20$ : tout rentre."],
    conditions=[f'n{m} >= 1' for m in LIVRES] + ['M > 10', 'M <= 20'])
vs = [v1, v2, v3]
ts1 = {f's{j}': x for j, x in enumerate([2, 0, 1, 1, 3, 2, 1, 0, 4, 1, 2, 2, 1, 3, 0, 1, 2, 1, 4,
                                          1, 2, 3, 1, 2], 1)}
c1 = valeurs_de(vs, 0, ts1)
bons1 = [str(c1[f'n{m}']) for m in FRATRIE]
faux1 = list(bons1)
faux1[1] = str(c1['n1'] - 1)
ts3 = {f'l{j}': x for j, x in enumerate([2, 1, 3, 2, 2, 5, 1, 2, 4, 3, 2, 1, 2, 3, 2, 4, 2, 1, 2,
                                          3, 5, 2, 1, 2, 3, 2, 4, 1, 2, 3, 2, 1, 2, 4, 3, 2], 1)}
c3 = valeurs_de(vs, 2, ts3)
bons3 = ['2'] + [str(c3[f'n{m}']) for m in LIVRES]
ecrire('03-construire-un-diagramme-en-barres', modele(
    "Compte, puis construis le diagramme en barres",
    "Relevé brut à compter (24 réponses, axe de 1 en 1 ; 36 réponses, échelle à choisir), ou "
    "tableau de voix jusqu'à 100 (échelle à choisir, 10 par graduation) : monter toutes les barres",
    10, vs,
    [spec("Frères et sœurs : " + ', '.join(bons1), 0, vs, ts1, bons1, 'correct'),
     spec("Erreur : une réponse « 1 » oubliée", 0, vs, ts1, faux1, 'incorrect'),
     spec("Voix jusqu'à 87 : échelle 10", 1, vs, {'a': 87, 'b': 54, 'c': 23, 'd': 66},
          ['10', '87', '54', '23', '66'], 'correct'),
     spec("Erreur : échelle 5 (87 ne rentre pas)", 1, vs, {'a': 87, 'b': 54, 'c': 23, 'd': 66},
          ['5', '87', '54', '23', '66'], 'incorrect'),
     spec("Livres : échelle 2, " + ', '.join(bons3[1:]), 2, vs, ts3, bons3, 'correct'),
     spec("Erreur : échelle 1 (la plus grande barre ne rentre pas)", 2, vs, ts3,
          ['1'] + bons3[1:], 'incorrect')],
    delay=300, options=None))

# ============================================================================
# 14b-4 — CM2-122 : placer les points d'un relevé dans un repère (niveau 6)
# ============================================================================


def placer_releve(intro, tetes, xs, ys, axes, ymax, pas_x, pas_y, description, variables, consigne,
                  conditions=None):
    noms = 'ABCDEF'[:len(xs)]
    pts = ' ; '.join(f'{n}=({x} ; {y})' for n, x, y in zip(noms, xs, ys))
    # Une ligne par point : six colonnes ne tiennent pas dans un téléphone (390 px)
    tableau = (f'| Point | {tetes[0]} | {tetes[1]} |\n|---|---|---|\n'
               + '\n'.join(f'| {n} | ${x}$ | ${y}$ |' for n, x, y in zip(noms, xs, ys)))
    bloc = (f"```courbe\nx: {xs[0] - pas_x} ; {xs[-1] + pas_x}\ny: 0 ; {ymax}\n"
            f"grille: {pas_x} ; {pas_y}\naxes: {axes}\nplacer: {pts}\ntaille: moyenne\n"
            f"description: {description}\n```")
    return variation(
        intro + "\n\n" + tableau + "\n\n" + consigne + "\n\n" + bloc, variables, [],
        ["Chaque colonne du tableau donne un point : on part de la valeur sur l'axe horizontal, puis "
         f"on monte jusqu'à la valeur sur l'axe vertical (un carreau vaut ${pas_y.replace(',', '{,}')}$).",
         ' ; '.join(f'${n}' + col(f'({x} ; {y})') + '$' for n, x, y in zip(noms, xs, ys)) + '.'],
        conditions=conditions)


JOURS5 = [1, 2, 3, 4, 5]
v1 = placer_releve(
    "On a compté les visiteurs d'un parc pendant cinq jours.",
    ('Jour', 'Visiteurs'), JOURS5, [f'{{{{eval:100*u{j}}}}}' for j in range(1, 6)],
    'x = Jour ; y = Visiteurs', 1000, 1, '100',
    "Repère : jour en abscisse, de 1 en 1 ; visiteurs en ordonnée, de 0 à 1 000, de 100 en 100.",
    [var(f'u{j}', '1..10') for j in range(1, 6)],
    "Place les points A, B, C, D et E : le jour sur l'axe horizontal, le nombre de visiteurs sur "
    "l'axe vertical.")
v2 = placer_releve(
    "On a mesuré la hauteur d'une plante chaque semaine.",
    ('Semaine', 'Hauteur (cm)'), [1, 2, 3, 4, 5, 6], [evd(f'h{j}/2') for j in range(1, 7)],
    'x = Semaine ; y = Hauteur (cm)', 8, 1, '0,5',
    "Repère : semaine en abscisse, de 1 en 1 ; hauteur en ordonnée, de 0 à 8 cm, de 0,5 en 0,5.",
    [var('h1', '2..4')] + [var(f'g{j}', '1..2') for j in range(2, 7)]
    + [var(f'h{j}', f'eval:h{j - 1}+g{j}') for j in range(2, 7)],
    "Place les points A, B, C, D, E et F : la semaine sur l'axe horizontal, la hauteur sur l'axe "
    "vertical.")
v3 = placer_releve(
    "On a relevé la température toutes les deux heures, de $8$ h à $18$ h.",
    ('Heure (h)', 'Température (°C)'), [8, 10, 12, 14, 16, 18],
    [f'{{{{eval:5*w{j}}}}}' for j in range(1, 7)], AXES_TEMP, 40, 2, '5',
    "Repère : heure en abscisse, de 2 en 2 ; température en ordonnée, de 0 à 40 °C, de 5 en 5.",
    [var('w1', '1..2'), var('g2', '0..2'), var('g3', '0..2'), var('g4', '0..2'), var('g5', '0..1'),
     var('g6', '0..1'), var('w2', 'eval:w1+g2'), var('w3', 'eval:w2+g3'), var('w4', 'eval:w3+g4'),
     var('w5', 'eval:w4-g5'), var('w6', 'eval:w5-g6')],
    "Place les points A, B, C, D, E et F : l'heure sur l'axe horizontal, la température sur l'axe "
    "vertical.", conditions=['w6 >= 1'])
vs = [v1, v2, v3]
tu = {'u1': 4, 'u2': 7, 'u3': 9, 'u4': 3, 'u5': 6}
bons_u = [f'{x};{100 * tu[f"u{j}"]}' for j, x in enumerate(JOURS5, 1)]
carreaux_u = [f'{x};{tu[f"u{j}"]}' for j, x in enumerate(JOURS5, 1)]
th = {'h1': 3, 'g2': 2, 'g3': 1, 'g4': 2, 'g5': 1, 'g6': 2}
ch = valeurs_de(vs, 1, th)
bons_h = [f'{x};{ch[f"h{x}"] / 2:g}' for x in range(1, 7)]
carreaux_h = [f'{x};{ch[f"h{x}"]}' for x in range(1, 7)]
tw = {'w1': 2, 'g2': 2, 'g3': 1, 'g4': 2, 'g5': 1, 'g6': 1}
cw = valeurs_de(vs, 2, tw)
bons_w = [f'{x};{5 * cw[f"w{j}"]}' for j, x in enumerate([8, 10, 12, 14, 16, 18], 1)]
echange_w = [f'{5 * cw["w1"]};8'] + bons_w[1:]
ecrire('04-placer-les-points-d-un-releve', modele(
    "Place les points d'un relevé (axes de 100, de 0,5, de 5)",
    "Relevé de 5 ou 6 valeurs, axes et graduations donnés : visiteurs d'un parc (de 100 en 100), "
    "hauteur d'une plante (de 0,5 en 0,5 cm), température toutes les deux heures (de 5 en 5 °C)",
    6, vs,
    [spec("Parc : " + ', '.join(bons_u), 0, vs, tu, bons_u, 'correct'),
     spec("Erreur : un carreau compté pour 1 visiteur", 0, vs, tu, carreaux_u, 'incorrect'),
     spec("Plante : " + ', '.join(bons_h), 1, vs, th, bons_h, 'correct'),
     spec("Erreur : un carreau compté pour 1 cm", 1, vs, th, carreaux_h, 'incorrect'),
     spec("Température : " + ', '.join(bons_w), 2, vs, tw, bons_w, 'correct'),
     spec("Erreur : A avec heure et température échangées", 2, vs, tw, echange_w, 'incorrect')],
    delay=240, options=None))

# ============================================================================
# 14b-5 — CM2-108 : problèmes avec un tableau ou des barres (notion, niveau 4)
# ============================================================================

v1 = variation(
    "Voici les prix de la cantine.\n\n| | Prix |\n|---|---|\n"
    "| Repas de midi | $" + evd('a/100') + "$ € |\n| Goûter | $" + evd('b/100') + "$ € |\n\n"
    "Cette semaine, Léo mange ${{r}}$ fois à la cantine à midi et prend ${{g}}$ goûter{{if:g>1|s|}}. "
    "Combien paie-t-il pour la semaine ?\n\n$?$ €",
    [var('ua', '30..44'), var('ub', '8..14'), var('r', '3..4'), var('g', '1..3'),
     var('a', 'eval:10*ua+5'), var('b', 'eval:10*ub+5'),
     var('pa', 'eval:r*a'), var('pb', 'eval:g*b'), var('n', 'eval:pa+pb')],
    [decimal(evd('n/100'))],
    ["Les repas : ${{r}} \\times " + evd('a/100') + " = " + evd('pa/100') + "$ €.",
     "Les goûters : ${{g}} \\times " + evd('b/100') + " = " + evd('pb/100') + "$ €.",
     "En tout : $" + evd('pa/100') + " + " + evd('pb/100') + " = " + col(evd('n/100')) + "$ €."])
V4 = ['Brumeval', 'Castelroc', 'Pontaval', 'Mirelande']
D = {(1, 2): 'd12', (1, 3): 'd13', (1, 4): 'd14', (2, 3): 'd23', (2, 4): 'd24', (3, 4): 'd34'}


def distance(i, j):
    if i == j:
        return '—'
    return f'${{{{{D[(min(i, j), max(i, j))]}}}}}$'


v2 = variation(
    "Ce tableau donne les distances par la route, en kilomètres, entre quatre villes.\n\n"
    "| | " + ' | '.join(V4) + " |\n|---|" + '---|' * 4 + '\n'
    + '\n'.join(f'| **{V4[i - 1]}** | ' + ' | '.join(distance(i, j) for j in range(1, 5)) + ' |'
                for i in range(1, 5))
    + "\n\nOn va de Brumeval à Pontaval. Combien de kilomètres de plus fait-on en passant par "
      "Castelroc, plutôt qu'en y allant directement ?\n\n$?$ km de plus",
    [var('d12', '15..60'), var('d23', '15..60'), var('d13', '20..90'), var('d14', '15..90'),
     var('d24', '15..90'), var('d34', '15..90'), var('s', 'eval:d12+d23'), var('n', 'eval:s-d13')],
    ['{{n}}'],
    ["Par Castelroc : Brumeval → Castelroc ${{d12}}$ km, puis Castelroc → Pontaval ${{d23}}$ km, "
     "soit ${{d12}} + {{d23}} = {{s}}$ km.",
     "Directement : Brumeval → Pontaval, ${{d13}}$ km.",
     "La différence : ${{s}} - {{d13}} = " + col('{{n}}') + "$ km de plus."],
    conditions=['n >= 5', 'd13 > abs(d12-d23)'])
MOIS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai']
v3 = variation(
    "Ce diagramme donne le nombre de visiteurs d'un musée, chaque mois.\n\n"
    "```barres\ntitre: Visiteurs du musée\naxes: Mois ; Visiteurs\n"
    + '\n'.join(f'{m} = {{{{a{j}}}}}' for j, m in enumerate(MOIS, 1))
    + "\naxe: 0 à 1000, de 100 en 100\n```\n\n"
      "Le musée espérait ${{T}}$ visiteurs de janvier à mars. Combien de visiteurs lui a-t-il "
      "manqué ?\n\n$?$ visiteurs",
    [var(f'u{j}', '1..10') for j in range(1, 6)] + [var(f'a{j}', f'eval:100*u{j}') for j in range(1, 6)]
    + [var('w', '1..9'), var('s', 'eval:a1+a2+a3'), var('n', 'eval:50*w'), var('T', 'eval:s+n')],
    ['{{n}}'],
    ["De janvier à mars : ${{a1}} + {{a2}} + {{a3}} = {{s}}$ visiteurs.",
     "Ce qui manque pour aller à ${{T}}$ : ${{T}} - {{s}} = " + col('{{n}}') + "$ visiteurs."])
vs = [v1, v2, v3]
ecrire('05-problemes-avec-un-tableau-ou-des-barres', modele(
    "Résous un problème avec un tableau ou un diagramme en barres",
    "En une ou deux étapes : le prix d'une semaine de cantine (repas et goûters, décimaux), le "
    "détour par une ville (tableau des distances), les visiteurs qui manquent à un musée (barres de "
    "100 en 100)",
    4, vs,
    [spec("4 × 3,85 + 2 × 1,25 = 17,9", 0, vs, {'ua': 38, 'ub': 12, 'r': 4, 'g': 2}, '17,9', 'correct'),
     spec("Erreur : les repas seuls (15,4)", 0, vs, {'ua': 38, 'ub': 12, 'r': 4, 'g': 2}, '15,4',
          'incorrect'),
     spec("34 + 41 − 52 = 23", 1, vs,
          {'d12': 34, 'd23': 41, 'd13': 52, 'd14': 70, 'd24': 28, 'd34': 45}, '23', 'correct'),
     spec("Erreur : le trajet par Castelroc (75)", 1, vs,
          {'d12': 34, 'd23': 41, 'd13': 52, 'd14': 70, 'd24': 28, 'd34': 45}, '75', 'incorrect'),
     spec("2 250 − 2 000 = 250", 2, vs, {'u1': 4, 'u2': 7, 'u3': 9, 'u4': 3, 'u5': 6, 'w': 5}, '250',
          'correct'),
     spec("Erreur : mars oublié (1 150)", 2, vs, {'u1': 4, 'u2': 7, 'u3': 9, 'u4': 3, 'u5': 6, 'w': 5},
          '1 150', 'incorrect')],
    delay=180, options=DECIMAUX))

# ============================================================================
# 14b-6 — CM2-108 : problèmes avec un diagramme circulaire ou une courbe (notion, niveau 4)
# ============================================================================

FRUITS = ['Orange', 'Ananas', 'Mangue']
DE_FRUIT = ["d'orange", "d'ananas", 'de mangue']
v1 = variation(
    "Ce diagramme montre la recette d'un cocktail de fruits.\n\n"
    "```circulaire\ntitre: Cocktail de fruits\n"
    + '\n'.join(f'{f} = {{{{c{j}}}}}' for j, f in enumerate(FRUITS))
    + "\nétiquettes: aucune\n```\n\n"
    + f"On prépare ${{{{N}}}}$ L de cocktail. Combien de centilitres de jus {si('k', DE_FRUIT)} "
      "faut-il ?\n\n$?$ cL",
    [var('h', '0..2'), var('k', '0..2'), var('N', '1..3'), var('m', '20..40')]
    + [var(f'q{j}', f'eval:1+{lagrange(j, 3, "h")}') for j in range(3)]
    + [var(f'c{j}', f'eval:m*q{j}') for j in range(3)]
    + [var('r', 'eval:' + selon(['q0', 'q1', 'q2'])), var('n', 'eval:25*N*r')],
    ['{{n}}'],
    ["Le plus grand secteur occupe la moitié du disque ; les deux autres se partagent l'autre "
     "moitié, un quart chacun.",
     f"${{{{N}}}}$ L, c'est ${{{{eval:100*N}}}}$ cL. Le jus {si('k', DE_FRUIT)} en occupe "
     "{{if:r==2|la moitié : $" + col('{{n}}') + "$ cL (la moitié de ${{eval:100*N}}$).|"
     "un quart : $" + col('{{n}}') + "$ cL (le quart de ${{eval:100*N}}$).}}"])
MOYENS = ['À pied', 'Vélo', 'Car', 'Voiture']
v2 = variation(
    "Ce diagramme montre comment les élèves de l'école viennent le matin.\n\n"
    "```circulaire\ntitre: Venir à l'école\n"
    + '\n'.join(f'{nm} = {{{{{l}}}}}' for nm, l in zip(MOYENS, 'abcd'))
    + "\nétiquettes: effectifs\n```\n\n"
      "Combien d'élèves de plus viennent en car ou à vélo qu'à pied ?\n\n$?$ élèves de plus",
    [var('a', '20..60'), var('b', '5..30'), var('c', '20..60'), var('d', '5..30'),
     var('s', 'eval:b+c'), var('n', 'eval:s-a')],
    ['{{n}}'],
    ["En car ou à vélo : ${{c}} + {{b}} = {{s}}$ élèves.",
     "À pied : ${{a}}$ élèves. L'écart : ${{s}} - {{a}} = " + col('{{n}}') + "$ élèves de plus."],
    conditions=['n > 0'])
JOURS6 = [1, 2, 3, 4, 5, 6]
v3 = variation(
    "Une cuve recueille l'eau de pluie. La courbe donne la quantité d'eau dans la cuve chaque matin. "
    "Il n'a pas plu, et l'eau n'a servi qu'à remplir des arrosoirs de $10$ L.\n\n"
    + courbe(JOURS6, [f'{{{{eval:20*w{j}}}}}' for j in range(1, 7)], 'x = Jour ; y = Eau (L)', 300,
             20)
    + "\n\nCombien d'arrosoirs a-t-on remplis entre le jour $1$ et le jour ${{eval:k+1}}$ ?"
    + "\n\n$?$ arrosoirs",
    [var('w1', '12..15')] + [var(f'g{j}', '1..3') for j in range(2, 7)]
    + [var(f'w{j}', f'eval:w{j - 1}-g{j}') for j in range(2, 7)]
    + [var('k', '3..5'), var('x', 'eval:20*w1'),
       var('y', 'eval:20*(' + selon([f'w{j}' for j in range(1, 7)]) + ')'),
       var('u', 'eval:x-y'), var('n', 'eval:u/10')],
    ['{{n}}'],
    ["On lit la courbe (un carreau vaut $20$ L) : jour $1$, ${{x}}$ L ; jour ${{eval:k+1}}$, ${{y}}$ L.",
     "L'eau utilisée : ${{x}} - {{y}} = {{u}}$ L.",
     "Un arrosoir contient $10$ L : ${{u}} \\div 10 = " + col('{{n}}') + "$ arrosoirs."],
    conditions=['w6 >= 1'])
v4 = variation(
    INTRO_RANDO + RANDO
    + "\n\nSa randonnée fait ${{N}}$ km. Il s'est arrêté pour pique-niquer : combien de kilomètres "
      "lui restait-il à parcourir pendant son pique-nique ?\n\n$?$ km",
    rando_vars(3, 5) + [var('z', '2..9'), var('N', 'eval:t6+z'),
                        var('x', 'eval:' + selon([f't{j}' for j in range(7)], 'p')),
                        var('n', 'eval:N-x')],
    ['{{n}}'],
    ["Pendant le pique-nique, la courbe est à plat : il avait parcouru ${{x}}$ km.",
     "Il lui restait ${{N}} - {{x}} = " + col('{{n}}') + "$ km."],
    conditions=['p+L <= 5'])
vs = [v1, v2, v3, v4]
tc = {'h': 0, 'm': 30}
tw3 = {'w1': 14, 'g2': 2, 'g3': 1, 'g4': 3, 'g5': 2, 'g6': 1}
tr4 = {**tv3, 'z': 3}
ecrire('06-problemes-avec-un-diagramme-circulaire-ou-une-courbe', modele(
    "Résous un problème avec un diagramme circulaire ou une courbe",
    "En une ou deux étapes : les cL d'un jus pour N L de cocktail (moitié, quart à l'œil), les élèves "
    "en car ou à vélo de plus qu'à pied (effectifs), les arrosoirs remplis avec l'eau d'une cuve "
    "(courbe de 20 en 20 L), les km qui restent au randonneur pendant sa pause",
    4, vs,
    [spec("2 L, ananas (un quart) : 50 cL", 0, vs, {**tc, 'k': 1, 'N': 2}, '50', 'correct'),
     spec("Erreur : le quart de 1 L (25)", 0, vs, {**tc, 'k': 1, 'N': 2}, '25', 'incorrect'),
     spec("3 L, orange (la moitié) : 150 cL", 0, vs, {**tc, 'k': 0, 'N': 3}, '150', 'correct'),
     spec("Erreur : le tiers de 3 L (100)", 0, vs, {**tc, 'k': 1, 'N': 3}, '100', 'incorrect'),
     spec("40 + 12 − 31 = 21", 1, vs, {'a': 31, 'b': 12, 'c': 40, 'd': 9}, '21', 'correct'),
     spec("Erreur : le car seul (9)", 1, vs, {'a': 31, 'b': 12, 'c': 40, 'd': 9}, '9', 'incorrect'),
     spec("280 − 160 = 120 L : 12 arrosoirs", 2, vs, {**tw3, 'k': 3}, '12', 'correct'),
     spec("Erreur : les litres (120)", 2, vs, {**tw3, 'k': 3}, '120', 'incorrect'),
     spec("18 − 7 = 11 km", 3, vs, tr4, '11', 'correct'),
     spec("Erreur : ce qui reste à 15 h (3)", 3, vs, tr4, '3', 'incorrect')],
    delay=180))

# ============================================================================

os.makedirs(DOSSIER, exist_ok=True)
for nom, mod in MODELES.items():
    with open(os.path.join(DOSSIER, nom + '.json'), 'w', encoding='utf-8') as f:
        json.dump(mod, f, ensure_ascii=False, indent='\t')
        f.write('\n')
print(f'{len(MODELES)} modèles écrits dans {DOSSIER}')
