"""Écrit les 5 modèles du lot 15 du CM2 (probabilités) dans scripts/questions/cm2-15/.

Phase 0 validée par David le 2026-11-19 (§ 23 et 23.1 du journal
`docs/archive/wip/questions-cm2-progress.md`, « je valide ») : 5 modèles (CM2-110, 111, 112, 113, 114) ;
niveaux 3 et 4 (événements : 110, 114), 3 et 4 (probabilité simple : 111, 112), 3 (Expériences
aléatoires : 113) ; « 1 chance sur 3 » pour « 2 chances sur 6 » refusé (on compte toutes les issues) ;
114 : issues données dans un tableau (l'arbre impose des fractions sur ses branches, § 23.2), l'élève
compte.

Bornes (`cycle3.json`) : 110, « tirer un roi », « obtenir un multiple de 3 » ; 111, « a chances sur b »,
équiprobabilité, pas de fraction ; 112, comparer à « une chance sur deux » par la moitié de b, cas
simples ; 114, deux étapes (deux lancers de pièce ; roue à 4 secteurs deux fois → 16 issues).

Patrons : `lot-cm2-14b.py` (gabarits), `lot-cm1-9ab.py` (jumeaux CM1 : roue en ```partage, case
« choix »). Valeur de rang k : polynôme de Lagrange (`selon`).

Pièges : aucune `{{if}}` dans une réponse attendue (un choix multiple calculé répète un indice, qui
compte une fois) ; `i` et `e` jamais comme variables ; « de » + `{{if}}` ne s'élide pas.

    python3 -I docs/wip/questions/lot-cm2-15.py scripts/questions/cm2-15
"""
import json
import os
import sys

DOSSIER = sys.argv[1]
ENTIERS = {'constraints': {'spacesFromFourDigits': True}}
MODELES = {}

# ---- Gabarits (comme lot-cm2-14b.py) ----


def var(nom, expression):
    return {'name': nom, 'expression': expression}


def variation(enonce, variables, reponses, etapes, conditions=None):
    v = {'statement': enonce, 'variables': variables}
    if conditions:
        v['conditions'] = conditions
    v['blanks'] = [r if isinstance(r, dict) else {'expectedAnswer': r} for r in reponses]
    v['correction'] = {'steps': etapes}
    return v


def modele(title, description, niveau, variations, specs, delay=90):
    return {'title': title, 'description': description, 'grades': ['CM2'], 'level': niveau,
            'delay': delay, 'status': 'draft', 'options': ENTIERS, 'variations': variations,
            'testSpecs': specs}


def calcule(variables, tirage):
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


def lagrange(j, n, k='k'):
    num = '*'.join(f'({k}-{m})' for m in range(n) if m != j)
    den = 1
    for m in range(n):
        if m != j:
            den *= (j - m)
    return f'({num})/({den})' if num else '1'


def selon(exprs, k='k'):
    n = len(exprs)
    return '+'.join(f'({e})*{lagrange(j, n, k)}' for j, e in enumerate(exprs))


def si(k, mots, depart=0):
    s = mots[-1]
    for j in range(len(mots) - 2, -1, -1):
        s = '{{if:' + k + '==' + str(j + depart) + '|' + mots[j] + '|' + s + '}}'
    return s


def col(x):
    return '\\textcolor{{{color:primary.0}}}{' + x + '}'


def choix(options, plusieurs=False, melanger=False):
    tete = []
    if plusieurs:
        tete.append('plusieurs: oui')
    if not melanger:
        tete.append('melanger: non')
    return '```choix\n' + ''.join(t + '\n' for t in tete) + ''.join(f'- {o}\n' for o in options) + '```'


def roue(n, gris):
    return f'```partage\nforme: disque {n}\ngris: {gris}\n```'


def ecrire(nom, mod):
    MODELES[nom] = mod


DE = "On lance un dé à $6$ faces numérotées de $1$ à $6$."
FACES = [f'${f}$' for f in range(1, 7)]
CARTES = ("Un jeu de $52$ cartes a quatre familles : cœur et carreau (rouges), trèfle et pique (noirs). "
          "Chaque famille a $13$ cartes : l'as, les cartes de $2$ à $10$, le valet, la dame et le roi "
          "(le valet, la dame et le roi sont les **figures**).")
CARTES_EVTS = ['tirer un roi', 'tirer un cœur', 'tirer une figure', 'tirer un as rouge',
               'tirer une carte rouge']
CARTES_N = [4, 13, 12, 2, 26]
CARTES_POURQUOI = ['un roi par famille : $4$ rois', '$13$ cartes de cœur',
                   'trois figures par famille : $4 \\times 3 = 12$ figures',
                   "l'as de cœur et l'as de carreau : $2$ as rouges",
                   'deux familles rouges de $13$ cartes : $2 \\times 13 = 26$ cartes rouges']

# ============================================================================
# 15-1 — CM2-110 : les issues qui réalisent l'évènement (événements, 3)
# ============================================================================

v1 = variation(
    DE + " On s'intéresse à l'évènement « obtenir " + si('k', ['un nombre pair', 'un nombre impair',
                                                             'un multiple de $3$'])
    + " ».\n\nCoche **toutes** les issues qui réalisent cet évènement.\n\n" + choix(FACES, plusieurs=True),
    [var('k', '0..2'),
     var('u', 'eval:' + selon(['1', '0', '2'])), var('v', 'eval:' + selon(['3', '2', '5'])),
     var('w', 'eval:' + selon(['5', '4', '5']))],
    ['{{u}};{{v}};{{w}}'],
    ["Les issues possibles : $1$, $2$, $3$, $4$, $5$, $6$.",
     si('k', ["Les nombres pairs : $" + col('2, 4, 6') + "$.",
              "Les nombres impairs : $" + col('1, 3, 5') + "$.",
              "Les multiples de $3$ sont dans la table de $3$ : $" + col('3, 6') + "$ ($3 \\times 1$ et $3 \\times 2$)."])])
v2 = variation(
    DE + " On s'intéresse à l'évènement « obtenir un nombre plus grand que ${{N}}$ ».\n\n"
    "Coche **toutes** les issues qui réalisent cet évènement.\n\n" + choix(FACES, plusieurs=True),
    [var('N', '2..4'), var('v', 'eval:max(N,3)'), var('w', 'eval:max(N,4)')],
    ['{{N}};{{v}};{{w}};5'],
    ["Les issues possibles : $1$, $2$, $3$, $4$, $5$, $6$.",
     "${{N}}$ n'est pas plus grand que ${{N}}$ : il ne compte pas.",
     "Les nombres plus grands que ${{N}}$ : " + si('N', ['$' + col('3, 4, 5, 6') + '$',
                                                         '$' + col('4, 5, 6') + '$',
                                                         '$' + col('5, 6') + '$'], 2) + "."])
v3 = variation(
    CARTES + "\n\nOn tire une carte au hasard. Combien de cartes réalisent l'évènement « "
    + si('k', CARTES_EVTS) + " » ?\n\n$?$ cartes",
    [var('k', '0..4'), var('n', 'eval:' + selon([str(x) for x in CARTES_N]))],
    ['{{n}}'],
    ["Chaque carte est une issue : il y a $52$ issues.",
     "Celles qui réalisent l'évènement : " + si('k', CARTES_POURQUOI) + ".",
     "Réponse : $" + col('{{n}}') + "$ cartes."])
v4 = variation(
    "Un sac contient ${{M}}$ boules numérotées de $1$ à ${{M}}$. On tire une boule au hasard.\n\n"
    "Combien de boules réalisent l'évènement « tirer un multiple de ${{q}}$ » ?\n\n$?$ boules",
    [var('M', '12|15|20'), var('q', '3|4|5'), var('n', 'eval:(M-mod(M,q))/q'),
     var('t', 'eval:q*n')],
    ['{{n}}'],
    ["Les multiples de ${{q}}$ sont dans la table de ${{q}}$ : ${{q}}$, ${{eval:2*q}}$, … jusqu'à ${{t}}$ "
     "(${{q}} \\times {{n}} = {{t}}$, et ${{q}} \\times {{eval:n+1}} = {{eval:q*(n+1)}}$ dépasse ${{M}}$).",
     "Réponse : $" + col('{{n}}') + "$ boules."],
    conditions=['n >= 2'])
vs = [v1, v2, v3, v4]
ecrire('01-les-issues-qui-realisent-l-evenement', modele(
    "Les issues qui réalisent l'évènement",
    "Cocher ou compter les issues qui réalisent un évènement : dé (pair, impair, multiple de 3, plus "
    "grand que N), jeu de 52 cartes (roi, cœur, figure, as rouge, carte rouge), boules numérotées "
    "(multiple de 3, 4 ou 5)",
    3, vs,
    [spec("Dé, pair : 2, 4, 6", 0, vs, {'k': 0}, '1;3;5', 'correct'),
     spec("Dé, impair : 1, 3, 5", 0, vs, {'k': 1}, '0;2;4', 'correct'),
     spec("Dé, multiple de 3 : 3, 6", 0, vs, {'k': 2}, '2;5', 'correct'),
     spec("Erreur : multiple de 3 sans le 6 (incomplet)", 0, vs, {'k': 2}, '2', 'unoptimal_form'),
     spec("Erreur : multiple de 3 avec le 1", 0, vs, {'k': 2}, '0;2;5', 'incorrect'),
     spec("Plus grand que 4 : 5, 6", 1, vs, {'N': 4}, '4;5', 'correct'),
     spec("Erreur : plus grand que 4 avec le 4", 1, vs, {'N': 4}, '3;4;5', 'incorrect'),
     spec("Plus grand que 2 : 3 à 6", 1, vs, {'N': 2}, '2;3;4;5', 'correct'),
     spec("Figures : 12", 2, vs, {'k': 2}, '12', 'correct'),
     spec("Erreur : les figures d'une famille (3)", 2, vs, {'k': 2}, '3', 'incorrect'),
     spec("Cartes rouges : 26", 2, vs, {'k': 4}, '26', 'correct'),
     spec("Erreur : une seule famille rouge (13)", 2, vs, {'k': 4}, '13', 'incorrect'),
     spec("20 boules, multiples de 3 : 6", 3, vs, {'M': 20, 'q': 3}, '6', 'correct'),
     spec("Erreur : 20 ÷ 3 arrondi (7)", 3, vs, {'M': 20, 'q': 3}, '7', 'incorrect')],
    delay=60))

# ============================================================================
# 15-2 — CM2-111 : … chances sur … (probabilité simple, 3)
# ============================================================================

COMPTE = ("Le premier nombre compte les issues qui réalisent l'évènement, le second **toutes** les issues "
          "(on ne simplifie pas : « $1$ chance sur $3$ » ne dit pas combien il y a d'issues).")
v1 = variation(
    DE + "\n\nComplète : on a $?$ chances sur $?$ d'obtenir "
    + si('k', ['un nombre pair', 'un multiple de $3$', 'un nombre plus grand que ${{N}}$']) + ".",
    [var('k', '0..2'), var('N', '2..4'), var('a', 'eval:' + selon(['3', '2', '6-N']))],
    ['{{a}}', '6'],
    ["Le dé a $6$ faces, qui ont autant de chances de sortir : $6$ issues.",
     "Celles qui réalisent l'évènement : " + si('k', ['$2$, $4$, $6$', '$3$, $6$',
                                                      'les nombres de ${{eval:N+1}}$ à $6$']) + ".",
     "On a $" + col('{{a}}') + "$ chances sur $" + col('6') + "$.", COMPTE])
v2 = variation(
    "Un sac contient ${{r}}$ boules rouges, ${{b}}$ boules bleues et ${{g}}$ boules vertes, toutes "
    "pareilles au toucher. On tire une boule sans regarder.\n\n"
    "Complète : on a $?$ chances sur $?$ de tirer une boule " + si('k', ['rouge', 'bleue', 'verte']) + ".",
    [var('r', '2..8'), var('b', '2..8'), var('g', '1..6'), var('k', '0..2'),
     var('a', 'eval:' + selon(['r', 'b', 'g'])), var('T', 'eval:r+b+g')],
    ['{{a}}', '{{T}}'],
    ["Chaque boule a autant de chances d'être tirée : il y a ${{r}} + {{b}} + {{g}} = {{T}}$ issues.",
     "Les boules " + si('k', ['rouges', 'bleues', 'vertes']) + " : ${{a}}$.",
     "On a $" + col('{{a}}') + "$ chances sur $" + col('{{T}}') + "$.", COMPTE],
    conditions=['T <= 20'])
v3 = variation(
    "Une roue est partagée en ${{N}}$ parts égales. On la fait tourner : quand elle s'arrête, la flèche "
    "montre une part au hasard.\n\n" + roue('{{N}}', '{{g}}')
    + "\n\nComplète : on a $?$ chances sur $?$ que la flèche montre une part coloriée.",
    [var('N', '6|8|10|12'), var('g', '1..{{eval:N-1}}')],
    ['{{g}}', '{{N}}'],
    ["Les ${{N}}$ parts sont égales : elles ont autant de chances d'être montrées, il y a ${{N}}$ issues.",
     "Les parts coloriées : ${{g}}$.",
     "On a $" + col('{{g}}') + "$ chances sur $" + col('{{N}}') + "$.", COMPTE])
v4 = variation(
    CARTES + "\n\nOn tire une carte au hasard. Complète : on a $?$ chances sur $?$ de "
    + si('k', CARTES_EVTS) + ".",
    [var('k', '0..4'), var('a', 'eval:' + selon([str(x) for x in CARTES_N]))],
    ['{{a}}', '52'],
    ["Chaque carte a autant de chances d'être tirée : $52$ issues.",
     "Celles qui réalisent l'évènement : " + si('k', CARTES_POURQUOI) + ".",
     "On a $" + col('{{a}}') + "$ chances sur $" + col('52') + "$.", COMPTE])
vs = [v1, v2, v3, v4]
ecrire('02-chances-sur', modele(
    "… chances sur …",
    "Écrire la probabilité d'un évènement sous la forme « a chances sur b » (a issues qui le "
    "réalisent, b issues en tout, sans simplifier) : dé, sac de boules, roue, jeu de 52 cartes",
    3, vs,
    [spec("Dé, pair : 3 sur 6", 0, vs, {'k': 0, 'N': 2}, ['3', '6'], 'correct'),
     spec("Erreur : simplifié en 1 sur 2", 0, vs, {'k': 0, 'N': 2}, ['1', '2'], 'incorrect'),
     spec("Dé, multiple de 3 : 2 sur 6", 0, vs, {'k': 1, 'N': 2}, ['2', '6'], 'correct'),
     spec("Erreur : simplifié en 1 sur 3", 0, vs, {'k': 1, 'N': 2}, ['1', '3'], 'incorrect'),
     spec("Dé, plus grand que 2 : 4 sur 6", 0, vs, {'k': 2, 'N': 2}, ['4', '6'], 'correct'),
     spec("Erreur : les issues qui ne le réalisent pas (2 sur 6)", 0, vs, {'k': 2, 'N': 2}, ['2', '6'],
          'incorrect'),
     spec("Sac 5 R, 3 B, 2 V, rouge : 5 sur 10", 1, vs, {'r': 5, 'b': 3, 'g': 2, 'k': 0}, ['5', '10'],
          'correct'),
     spec("Erreur : le nombre de couleurs pour le total (5 sur 3)", 1, vs,
          {'r': 5, 'b': 3, 'g': 2, 'k': 0}, ['5', '3'], 'incorrect'),
     spec("Roue de 8, 3 coloriées : 3 sur 8", 2, vs, {'N': 8, 'g': 3}, ['3', '8'], 'correct'),
     spec("Erreur : les parts blanches (5 sur 8)", 2, vs, {'N': 8, 'g': 3}, ['5', '8'], 'incorrect'),
     spec("Un roi : 4 sur 52", 3, vs, {'k': 0}, ['4', '52'], 'correct'),
     spec("Erreur : 4 sur 13 (une famille)", 3, vs, {'k': 0}, ['4', '13'], 'incorrect')]))

# ============================================================================
# 15-3 — CM2-112 : qu'est-ce qui est le plus probable ? (probabilité simple, 4)
# ============================================================================

v1 = variation(
    "Deux sacs contiennent chacun ${{T}}$ boules, rouges ou bleues. Le sac A a ${{x}}$ boules rouges, le "
    "sac B en a ${{y}}$. On tire une boule sans regarder.\n\n"
    "Dans quel sac a-t-on le plus de chances de tirer une boule rouge ?\n\n"
    + choix(['dans le sac A', 'dans le sac B', 'autant dans les deux sacs']),
    [var('T', '8..12'), var('x', '1..{{eval:T-1}}'), var('y', '1..{{eval:T-1}}'),
     var('r', 'eval:(1-max(min(x-y,1),-1))/2')],
    ['{{r}}'],
    ["Sac A : ${{x}}$ chances sur ${{T}}$ ; sac B : ${{y}}$ chances sur ${{T}}$.",
     "Même nombre de boules dans les deux sacs : on compare les boules rouges, ${{x}}$ et ${{y}}$.",
     "Réponse : $" + col('\\text{dans le sac {{if:r==0|A|B}}}') + "$."],
    conditions=['x != y'])
v2 = variation(
    "Un sac contient ${{T}}$ boules : ${{a}}$ rouges, les autres bleues. On tire une boule sans "
    "regarder.\n\nA-t-on plus d'une chance sur deux de tirer une boule rouge ?\n\n"
    + choix(["plus d'une chance sur deux", 'exactement une chance sur deux',
             "moins d'une chance sur deux"]),
    [var('h', '4..10'), var('T', 'eval:2*h'), var('a', '1..{{eval:T-1}}'),
     var('s', 'eval:max(min(a-h,1),-1)'), var('r', 'eval:1-s')],
    ['{{r}}'],
    ["On a ${{a}}$ chances sur ${{T}}$ de tirer une boule rouge.",
     "Une chance sur deux, ce serait la moitié des boules : ${{T}} \\div 2 = {{h}}$ boules rouges.",
     "${{a}}$ {{if:s==1|est plus grand que|{{if:s==0|est égal à|est plus petit que}}}} ${{h}}$ : $"
     + col("\\text{{{if:s==1|plus d'une chance sur deux|{{if:s==0|exactement une chance sur deux|moins "
           "d'une chance sur deux}}}}}") + "$."])
v3 = variation(
    "Le sac A contient ${{x}}$ boules rouges et ${{a}}$ boules bleues. Le sac B contient ${{x}}$ boules "
    "rouges et ${{b}}$ boules bleues. On tire une boule sans regarder.\n\n"
    "Dans quel sac a-t-on le plus de chances de tirer une boule rouge ?\n\n"
    + choix(['dans le sac A', 'dans le sac B', 'autant dans les deux sacs']),
    [var('x', '2..6'), var('a', '1..8'), var('b', '1..8'), var('r', 'eval:(1-max(min(b-a,1),-1))/2')],
    ['{{r}}'],
    ["Sac A : ${{x}}$ chances sur ${{eval:x+a}}$ ; sac B : ${{x}}$ chances sur ${{eval:x+b}}$.",
     "Autant de boules rouges dans les deux sacs : celui qui a le moins de boules bleues donne le plus de "
     "chances.",
     "Réponse : $" + col('\\text{dans le sac {{if:r==0|A|B}}}') + "$."],
    conditions=['a != b'])
v4 = variation(
    "Deux roues sont partagées en parts égales : la roue A en $4$ parts, la roue B en $8$ parts.\n\n"
    "Roue A :\n\n" + roue(4, '{{g}}') + "\n\nRoue B :\n\n" + roue(8, '{{h}}')
    + "\n\nAvec quelle roue a-t-on le plus de chances que la flèche montre une part coloriée ?\n\n"
    + choix(['avec la roue A', 'avec la roue B', 'autant avec les deux roues']),
    [var('g', '1..3'), var('h', '1..7'), var('s', 'eval:max(min(2*g-h,1),-1)'),
     var('r', 'eval:s*s*(1-s)/2+(1-s*s)*2')],
    ['{{r}}'],
    ["Roue A : ${{g}}$ chance{{if:g>1|s}} sur $4$ ; roue B : ${{h}}$ chance{{if:h>1|s}} sur $8$.",
     "Une part de la roue A vaut deux parts de la roue B : ${{g}}$ chance{{if:g>1|s}} sur $4$, c'est "
     "${{eval:2*g}}$ chances sur $8$.",
     "On compare ${{eval:2*g}}$ et ${{h}}$ : $"
     + col('\\text{{{if:r==0|avec la roue A|{{if:r==1|avec la roue B|autant avec les deux roues}}}}}') + "$."])
v5 = variation(
    DE + "\n\nQu'est-ce qui a le plus de chances d'arriver ?\n\n"
    + choix(['obtenir un nombre pair', 'obtenir un nombre plus grand que ${{N}}$',
             'les deux ont autant de chances']),
    [var('N', '1..4'), var('s', 'eval:max(min(N-3,1),-1)'),
     var('r', 'eval:s*s*(1-s)/2+(1-s*s)*2')],
    ['{{r}}'],
    ["Un nombre pair : $2$, $4$, $6$, soit $3$ chances sur $6$.",
     "Un nombre plus grand que ${{N}}$ : de ${{eval:N+1}}$ à $6$, soit ${{eval:6-N}}$ chances sur $6$.",
     "On compare $3$ et ${{eval:6-N}}$ : $"
     + col("\\text{{{if:r==0|obtenir un nombre pair|{{if:r==1|obtenir un nombre plus grand que {{N}}|"
           "les deux ont autant de chances}}}}}") + "$."])
vs = [v1, v2, v3, v4, v5]
ecrire('03-qu-est-ce-qui-est-le-plus-probable', modele(
    "Qu'est-ce qui est le plus probable ?",
    "Comparer des probabilités dans des cas simples : deux sacs de même total, à « une chance sur "
    "deux » par la moitié, deux sacs de même nombre de rouges, une roue de 4 parts et une de 8, deux "
    "évènements d'un dé",
    4, vs,
    [spec("10 boules, A 3 rouges, B 7 : B", 0, vs, {'T': 10, 'x': 3, 'y': 7}, '1', 'correct'),
     spec("Erreur : A", 0, vs, {'T': 10, 'x': 3, 'y': 7}, '0', 'incorrect'),
     spec("7 rouges sur 12 : plus", 1, vs, {'h': 6, 'a': 7}, '0', 'correct'),
     spec("6 rouges sur 12 : exactement", 1, vs, {'h': 6, 'a': 6}, '1', 'correct'),
     spec("Erreur : 5 sur 12, une chance sur deux", 1, vs, {'h': 6, 'a': 5}, '1', 'incorrect'),
     spec("3 R + 2 B contre 3 R + 6 B : A", 2, vs, {'x': 3, 'a': 2, 'b': 6}, '0', 'correct'),
     spec("Erreur : B, le sac le plus plein", 2, vs, {'x': 3, 'a': 2, 'b': 6}, '1', 'incorrect'),
     spec("Erreur : autant, même nombre de rouges", 2, vs, {'x': 3, 'a': 2, 'b': 6}, '2', 'incorrect'),
     spec("1 sur 4 contre 3 sur 8 : B", 3, vs, {'g': 1, 'h': 3}, '1', 'correct'),
     spec("Erreur : 3 sur 8 pris pour moins (1 sur 4 a la plus grande part)", 3, vs, {'g': 1, 'h': 3},
          '0', 'incorrect'),
     spec("2 sur 4 contre 4 sur 8 : autant", 3, vs, {'g': 2, 'h': 4}, '2', 'correct'),
     spec("3 sur 4 contre 5 sur 8 : A", 3, vs, {'g': 3, 'h': 5}, '0', 'correct'),
     spec("Pair contre plus grand que 4 : pair", 4, vs, {'N': 4}, '0', 'correct'),
     spec("Pair contre plus grand que 3 : autant", 4, vs, {'N': 3}, '2', 'correct'),
     spec("Pair contre plus grand que 1 : le second", 4, vs, {'N': 1}, '1', 'correct')],
    delay=60))

# ============================================================================
# 15-4 — CM2-113 : le hasard n'a pas de mémoire (Expériences aléatoires, 3)
# ============================================================================

v1 = variation(
    "Léo lance une pièce de monnaie bien équilibrée. Elle vient de tomber ${{N}}$ fois de suite sur "
    + si('k', ['pile', 'face']) + ".\n\nAu lancer suivant :\n\n"
    + choix(['pile a plus de chances que face', 'face a plus de chances que pile',
             'pile et face ont autant de chances']),
    [var('N', '3..6'), var('k', '0..1')],
    ['2'],
    ["La pièce ne se souvient pas des lancers d'avant : chaque lancer recommence la même expérience.",
     "À chaque lancer, on a une chance sur deux d'obtenir pile, une chance sur deux d'obtenir face.",
     "Réponse : $" + col('\\text{pile et face ont autant de chances}') + "$."])
v2 = variation(
    "Lina lance un dé à $6$ faces bien équilibré. Le ${{f}}$ n'est pas sorti depuis ${{N}}$ lancers.\n\n"
    "Au lancer suivant, le ${{f}}$ a :\n\n"
    + choix(['plus de chances de sortir que les autres faces',
             'moins de chances de sortir que les autres faces',
             'autant de chances de sortir que les autres faces']),
    [var('f', '1..6'), var('N', '8..15')],
    ['2'],
    ["Le dé ne se souvient pas des lancers d'avant : le ${{f}}$ n'est pas « en retard ».",
     "À chaque lancer, chaque face a $1$ chance sur $6$.",
     "Réponse : $" + col('\\text{autant de chances que les autres faces}') + "$."])
v3 = variation(
    "Un sac contient ${{r}}$ boules rouges et ${{b}}$ boules bleues. On tire une boule, on note sa couleur "
    "et on la **remet** dans le sac. On vient de tirer $3$ boules rouges de suite.\n\n"
    "Complète : au tirage suivant, on a $?$ chances sur $?$ de tirer une boule rouge.",
    [var('r', '3..8'), var('b', '2..8'), var('T', 'eval:r+b')],
    ['{{r}}', '{{T}}'],
    ["Chaque boule est remise : avant chaque tirage, le sac est le même, ${{r}}$ rouges et ${{b}}$ "
     "bleues.",
     "Les tirages d'avant ne changent rien : on a $" + col('{{r}}') + "$ chances sur $" + col('{{T}}')
     + "$."])
vs = [v1, v2, v3]
ecrire('04-le-hasard-n-a-pas-de-memoire', modele(
    "Le hasard n'a pas de mémoire",
    "Comprendre que la répétition d'une expérience ne change pas les chances : pièce tombée N fois "
    "sur pile, face d'un dé qui ne sort pas, tirage avec remise (« a chances sur b » inchangé)",
    3, vs,
    [spec("Pièce : autant", 0, vs, {'N': 5, 'k': 0}, '2', 'correct'),
     spec("Erreur : « face, c'est son tour »", 0, vs, {'N': 5, 'k': 0}, '1', 'incorrect'),
     spec("Erreur : pile est « en série »", 0, vs, {'N': 5, 'k': 0}, '0', 'incorrect'),
     spec("Dé : autant", 1, vs, {'f': 6, 'N': 10}, '2', 'correct'),
     spec("Erreur : le 6 est en retard", 1, vs, {'f': 6, 'N': 10}, '0', 'incorrect'),
     spec("5 R, 4 B, remise : 5 sur 9", 2, vs, {'r': 5, 'b': 4}, ['5', '9'], 'correct'),
     spec("Erreur : comme sans remise (2 sur 6)", 2, vs, {'r': 5, 'b': 4}, ['2', '6'], 'incorrect')],
    delay=60))

# ============================================================================
# 15-5 — CM2-114 : deux étapes, le tableau des issues (événements, 4)
# ============================================================================

PIECES = ("On lance deux fois une pièce de monnaie bien équilibrée. Le tableau donne toutes les issues "
          "(P pour pile, F pour face ; la première lettre est celle du premier lancer).\n\n"
          "| 1er lancer ↓, 2e lancer → | Pile | Face |\n| --- | --- | --- |\n"
          "| Pile | PP | PF |\n| Face | FP | FF |")
EVT_PIECES = ['deux fois pile', 'un pile et un face', 'au moins un face']
v1 = variation(
    PIECES + "\n\nCombien y a-t-il d'issues ?\n\n$?$ issues\n\nComplète : on a $?$ chances sur $?$ "
    "d'obtenir " + si('k', EVT_PIECES) + ".",
    [var('k', '0..2'), var('a', 'eval:' + selon(['1', '2', '3']))],
    ['4', '{{a}}', '4'],
    ["Le tableau a $2 \\times 2 = " + col('4') + "$ cases : $4$ issues, qui ont autant de chances.",
     si('k', ["Deux fois pile : PP, une seule case.", "Un pile et un face : PF et FP, deux cases.",
              "Au moins un face : PF, FP et FF, trois cases."]),
     "On a $" + col('{{a}}') + "$ chance{{if:a>1|s}} sur $" + col('4') + "$."])
SOMMES = ("Une roue a $4$ secteurs égaux, numérotés de $1$ à $4$. On la fait tourner deux fois et on "
          "ajoute les deux nombres. Le tableau donne la somme pour chaque issue.\n\n"
          "| 1er tour ↓, 2e tour → | $1$ | $2$ | $3$ | $4$ |\n| --- | --- | --- | --- | --- |\n"
          + ''.join(f"| ${x}$ | " + ' | '.join(f'${x + y}$' for y in range(1, 5)) + ' |\n'
                    for x in range(1, 5)))
v2 = variation(
    SOMMES + "\nCombien y a-t-il d'issues ?\n\n$?$ issues\n\nComplète : on a $?$ chances sur $?$ "
    "d'obtenir une somme égale à ${{S}}$.",
    [var('S', '2..8'), var('a', 'eval:4-abs(S-5)')],
    ['16', '{{a}}', '16'],
    ["Le tableau a $4 \\times 4 = " + col('16') + "$ cases : $16$ issues, qui ont autant de chances.",
     "On compte les cases où est écrit ${{S}}$ : ${{a}}$.",
     "On a $" + col('{{a}}') + "$ chance{{if:a>1|s}} sur $" + col('16') + "$."])
PIECE_DE = ("On lance une pièce de monnaie, puis un dé à $6$ faces, tous deux bien équilibrés. Le tableau "
            "donne toutes les issues.\n\n"
            "| Dé ↓, pièce → | Pile | Face |\n| --- | --- | --- |\n"
            + ''.join(f"| ${d}$ | P{d} | F{d} |\n" for d in range(1, 7)))
EVT_PD = ['face et un nombre pair', 'pile et un nombre plus grand que $4$', 'un $6$']
v3 = variation(
    PIECE_DE + "\nCombien y a-t-il d'issues ?\n\n$?$ issues\n\nComplète : on a $?$ chances sur $?$ "
    "d'obtenir " + si('k', EVT_PD) + ".",
    [var('k', '0..2'), var('a', 'eval:' + selon(['3', '2', '2']))],
    ['12', '{{a}}', '12'],
    ["Le tableau a $6 \\times 2 = " + col('12') + "$ cases : $12$ issues, qui ont autant de chances.",
     si('k', ["Face et un nombre pair : F2, F4, F6.", "Pile et plus grand que $4$ : P5, P6.",
              "Un $6$, avec pile ou avec face : P6, F6."]),
     "On a $" + col('{{a}}') + "$ chances sur $" + col('12') + "$."])
vs = [v1, v2, v3]
ecrire('05-deux-etapes-le-tableau-des-issues', modele(
    "Deux étapes : le tableau des issues",
    "Expérience en deux étapes, issues données dans un tableau à double entrée : deux lancers de pièce "
    "(4 issues), roue de 4 secteurs tournée deux fois (16 issues, sommes), une pièce puis un dé "
    "(12 issues) ; nombre d'issues puis « a chances sur b »",
    4, vs,
    [spec("Deux pièces, deux fois pile : 4 ; 1 sur 4", 0, vs, {'k': 0}, ['4', '1', '4'], 'correct'),
     spec("Un pile et un face : 2 sur 4", 0, vs, {'k': 1}, ['4', '2', '4'], 'correct'),
     spec("Erreur : PF et FP confondus (3 issues, 1 sur 3)", 0, vs, {'k': 1}, ['3', '1', '3'],
          'incorrect'),
     spec("Au moins un face : 3 sur 4", 0, vs, {'k': 2}, ['4', '3', '4'], 'correct'),
     spec("Somme 5 : 16 ; 4 sur 16", 1, vs, {'S': 5}, ['16', '4', '16'], 'correct'),
     spec("Erreur : 8 issues (4 + 4)", 1, vs, {'S': 5}, ['8', '4', '8'], 'incorrect'),
     spec("Erreur : les 7 sommes pour issues (1 sur 7)", 1, vs, {'S': 5}, ['7', '1', '7'], 'incorrect'),
     spec("Somme 2 : 1 sur 16", 1, vs, {'S': 2}, ['16', '1', '16'], 'correct'),
     spec("Face et pair : 12 ; 3 sur 12", 2, vs, {'k': 0}, ['12', '3', '12'], 'correct'),
     spec("Un 6 : 2 sur 12", 2, vs, {'k': 2}, ['12', '2', '12'], 'correct'),
     spec("Erreur : un 6, 1 sur 6 (le dé seul)", 2, vs, {'k': 2}, ['12', '1', '6'], 'incorrect')],
    delay=120))

# ============================================================================

os.makedirs(DOSSIER, exist_ok=True)
for nom, mod in MODELES.items():
    with open(os.path.join(DOSSIER, nom + '.json'), 'w', encoding='utf-8') as f:
        json.dump(mod, f, ensure_ascii=False, indent='\t')
        f.write('\n')
print(f'{len(MODELES)} modèles écrits dans {DOSSIER}')
