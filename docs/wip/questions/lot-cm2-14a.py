"""Écrit les 6 modèles du lot 14a du CM2 (données lues) dans scripts/questions/cm2-14a/.

Phase 0 validée par David le 2026-11-19 (§ 21 et 21.2 du journal
`docs/archive/wip/questions-cm2-progress.md`, « je te suis ») : 6 modèles (CM2-107, 156, 123, 157, 124,
158) ; niveaux 6 et 7 (tableaux), 8 et 9 (barres), 1 et 2 (circulaires) ; diagrammes circulaires
sans fractions écrites sur les secteurs (`outils-manquants.md` n° 44) : moitiés et quarts à l'œil,
parts calculées sur les effectifs ; toute fraction égale juste (`reducedFractions: off`).

Bornes (`cycle3.json`) : entiers jusqu'à 999 999 999, décimaux jusqu'aux millièmes, pas de
pourcentages au cours moyen ; 124, diagramme circulaire avec légende, parts simples (1/5, 3/10, 2/5).

Patron : `lot-cm1-7.py` (jumeaux CM1 : tableaux, barres). Choix « le plus » : la donnée gagnante
est posée au rang k par un polynôme de Lagrange (`posee(...)`), la réponse attendue est `k`.

Pièges (relus dans le journal) : aucune `{{if}}` dans une réponse attendue ; `i` et `e` jamais
comme variables ; case « choix » `melanger: non` : réponse = rang affiché ; « de » + `{{if}}` ne
s'élide pas (noms à consonne initiale, compléments écrits élidés).

    python3 -I docs/wip/questions/lot-cm2-14a.py scripts/questions/cm2-14a
"""
import json
import os
import sys

DOSSIER = sys.argv[1]
ENTIERS = {'constraints': {'spacesFromFourDigits': True}}
DECIMAUX = {'constraints': {'spacesFromFourDigits': True, 'zeros': 'off'}}
SANS_SIMPLIFIER = {'constraints': {'reducedFractions': 'off'}}
VIRGULE_EXIGEE = {'pattern': 'a:number'}
MODELES = {}

# ---- Gabarits (comme lot-cm1-7.py) ----


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
            x = eval(expr[5:], {'__builtins__': {}, 'max': max, 'min': min, 'abs': abs}, dict(valeurs))
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


def nombre(x):
    """Réponse d'élève écrite comme le juge l'attend (espace dès 4 chiffres)."""
    s = str(abs(x))
    groupes = []
    while len(s) > 3:
        groupes.insert(0, s[-3:])
        s = s[:-3]
    groupes.insert(0, s)
    return ('-' if x < 0 else '') + ' '.join(groupes)


def virgule(x, places):
    """x entier en 10^-places, écrit avec une virgule, sans zéro final."""
    s = f'{x / 10 ** places:.{places}f}'.rstrip('0').rstrip('.')
    return s.replace('.', ',')


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


def posee(base, haut, j, n, k='k'):
    """La donnée de rang j : `base`, sauf au rang k où elle vaut `haut`."""
    return f'eval:({base})+(({haut})-({base}))*{lagrange(j, n, k)}'


def si(k, mots, depart=0):
    """Le mot de rang k (k = depart, depart + 1…), dans un énoncé ou un corrigé seulement."""
    s = mots[-1]
    for j in range(len(mots) - 2, -1, -1):
        s = '{{if:' + k + '==' + str(j + depart) + '|' + mots[j] + '|' + s + '}}'
    return s


def choix(items):
    return '```choix\nmelanger: non\n' + '\n'.join('- ' + it for it in items) + '\n```'


def col(x):
    return '\\textcolor{{{color:primary.0}}}{' + x + '}'


def evd(x):
    return '{{eval:' + x + ';d}}'


def decimal(x):
    return {'expectedAnswer': x, 'requiredForm': VIRGULE_EXIGEE}


def frac(n, d):
    return '\\frac{' + n + '}{' + d + '}'


def ecrire(nom, mod):
    MODELES[nom] = mod


# ============================================================================
# 14a-1 — CM2-107 : lire un tableau (tableaux, niveau 6)
# ============================================================================

PAYS = ['Valdorie', 'Morvanie', 'Brévanie', 'Talessie', 'Norlande']
VILLES = ['Brumeval', 'Castelroc', 'Pontaval', 'Mirelande', 'Sablonnière']
ANNEES = ['2023', '2024', '2025']
ANIMAUX = ['Lapin', 'Chat', 'Hérisson', 'Poule', "Cochon d'Inde"]
DU_ANIMAL = ['du lapin', 'du chat', 'du hérisson', 'de la poule', "du cochon d'Inde"]
# masses plausibles, en grammes (= millièmes de kg)
MASSES = ['1200..2500', '3000..5500', '600..1200', '1500..2900', '700..1200']


def tableau_pays(prefixe='p'):
    return ("| Pays | Nombre d'habitants |\n|---|---|\n"
            + '\n'.join(f'| {v} | ${{{{{prefixe}{j}}}}}$ |' for j, v in enumerate(PAYS, 1)))


def tableau_animaux(prefixe='m'):
    return ("| Animal | Masse (kg) |\n|---|---|\n"
            + '\n'.join(f'| {a} | ${evd(f"{prefixe}{j}/1000")}$ |' for j, a in enumerate(ANIMAUX, 1)))


def tableau_pluie(prefixe='r'):
    lignes = '\n'.join(
        f'{v} = ' + ' ; '.join(f'{{{{{prefixe}{j}{c}}}}}' for c in range(3))
        for j, v in enumerate(VILLES, 1))
    return ("```tableau-croise\nlignes: " + ' ; '.join(VILLES) + "\ncolonnes: " + ' ; '.join(ANNEES)
            + "\n" + lignes + "\ncoin: Ville \\ Année\ntotaux: non\n```")


pays_vars = [var(f'p{j}', '1000000..999999999') for j in range(1, 6)]
v1 = variation(
    "Ce tableau donne le nombre d'habitants de cinq pays.\n\n" + tableau_pays()
    + f"\n\nQuel est le nombre d'habitants de la {si('k', PAYS)} ?\n\n$?$ habitants",
    pays_vars + [var('k', '0..4'), var('n', 'eval:' + selon([f'p{j}' for j in range(1, 6)]))],
    ['{{n}}'],
    [f"On cherche la ligne « {si('k', PAYS)} », puis on lit la case de la colonne « Nombre "
     "d'habitants ».",
     f"La {si('k', PAYS)} a $" + col('{{n}}') + "$ habitants."])
v2 = variation(
    "Ce tableau donne le nombre d'habitants de cinq pays.\n\n" + tableau_pays()
    + "\n\nQuel pays a ${{n}}$ habitants ?\n\n" + choix(PAYS),
    [var(f'h{j}', '100000000..999999999') for j in range(1, 6)]
    + [var('n', '100000000..999999999'), var('k', '0..4')]
    + [var(f'p{j}', posee(f'h{j}', 'n', j - 1, 5)) for j in range(1, 6)],
    ['{{k}}'],
    ["Tous les nombres ont neuf chiffres : on cherche ${{n}}$ classe par classe (millions, milliers, "
     "unités), puis on lit le pays sur la même ligne.",
     f"C'est la {si('k', PAYS)}."],
    conditions=[f'(h{j}-n)*(h{j}-n) > 0' for j in range(1, 6)])
v3 = variation(
    "Ce tableau donne la masse de cinq animaux.\n\n" + tableau_animaux()
    + f"\n\nQuelle est la masse {si('k', DU_ANIMAL)} ?\n\n$?$ kg",
    [var(f'm{j}', MASSES[j - 1]) for j in range(1, 6)]
    + [var('k', '0..4'), var('n', 'eval:' + selon([f'm{j}' for j in range(1, 6)]))],
    [decimal(evd('n/1000'))],
    [f"On cherche la ligne « {si('k', ANIMAUX)} », puis on lit la colonne « Masse (kg) ».",
     f"La masse {si('k', DU_ANIMAL)} : $" + col(evd('n/1000')) + "$ kg."])
pluie_vars = [var(f'r{j}{c}', '400..1200') for j in range(1, 6) for c in range(3)]
colonnes = [selon([f'r{j}{c}' for j in range(1, 6)]) for c in range(3)]
v4 = variation(
    "Ce tableau donne la hauteur de pluie tombée en un an (en mm) dans cinq villes, trois années "
    "de suite.\n\n" + tableau_pluie()
    + f"\n\nCombien de millimètres de pluie sont tombés à {si('k', VILLES)} en {si('q', ANNEES)} ?"
    + "\n\n$?$ mm",
    pluie_vars + [var('k', '0..4'), var('q', '0..2'),
                  var('n', 'eval:' + selon(colonnes, 'q'))],
    ['{{n}}'],
    [f"La ligne « {si('k', VILLES)} » et la colonne « {si('q', ANNEES)} » : la réponse est dans la "
     "case où elles se croisent.",
     "Cette case : $" + col('{{n}}') + "$ mm."])
vs = [v1, v2, v3, v4]
tp = {'p1': 48273615, 'p2': 6120450, 'p3': 312004987, 'p4': 87650300, 'p5': 1538210}
th = {'h1': 482736150, 'h2': 612045012, 'h3': 312004987, 'h4': 876503004, 'h5': 153821075}
tm = {'m1': 1850, 'm2': 4125, 'm3': 875, 'm4': 2300, 'm5': 960}
tr = {f'r{j}{c}': 400 + 37 * j + 113 * c for j in range(1, 6) for c in range(3)}
c4 = valeurs_de(vs, 3, {**tr, 'k': 2, 'q': 1})
voisin4 = valeurs_de(vs, 3, {**tr, 'k': 2, 'q': 2})['n']
ecrire('01-lire-un-tableau', modele(
    "Lis un tableau (grands nombres, décimaux, double entrée)",
    "Pays inventés : le nombre d'habitants d'un pays (jusqu'à 999 999 999), le pays qui a un nombre "
    "d'habitants donné (case choix, neuf chiffres) ; la masse d'un animal en kg (millièmes) ; la pluie "
    "d'une ville une année (tableau à double entrée)",
    6, vs,
    [spec("Brévanie : 312 004 987", 0, vs, {**tp, 'k': 2}, nombre(312004987), 'correct'),
     spec("Erreur : la ligne voisine (Morvanie)", 0, vs, {**tp, 'k': 2}, nombre(6120450), 'incorrect'),
     spec("876 503 004 : Talessie", 1, vs, {**th, 'n': 876503004, 'k': 3}, '3', 'correct'),
     spec("Erreur : Morvanie", 1, vs, {**th, 'n': 876503004, 'k': 3}, '1', 'incorrect'),
     spec("Chat : 4,125 kg", 2, vs, {**tm, 'k': 1}, '4,125', 'correct'),
     spec("Erreur : les grammes (4 125)", 2, vs, {**tm, 'k': 1}, '4 125', 'incorrect'),
     spec("Hérisson : 0,875 kg", 2, vs, {**tm, 'k': 2}, '0,875', 'correct'),
     spec(f"Pontaval en 2024 : {c4['n']} mm", 3, vs, {**tr, 'k': 2, 'q': 1}, nombre(c4['n']),
          'correct'),
     spec("Erreur : la colonne voisine (2025)", 3, vs, {**tr, 'k': 2, 'q': 1}, nombre(voisin4),
          'incorrect')],
    delay=120, options=DECIMAUX))

# ============================================================================
# 14a-2 — CM2-156 : interpréter un tableau (tableaux, niveau 7)
# ============================================================================

COLIS = ['A', 'B', 'C', 'D', 'E']


def tableau_colis(prefixe, places):
    return ("| Colis | Masse (kg) |\n|---|---|\n"
            + '\n'.join(f'| {c} | ${evd(f"{prefixe}{j}/{10 ** places}")}$ |'
                        for j, c in enumerate(COLIS, 1)))


v1 = variation(
    "Ce tableau donne le nombre d'habitants de cinq pays.\n\n" + tableau_pays()
    + "\n\nQuel pays est le plus peuplé ?\n\n" + choix(PAYS),
    [var(f'b{j}', '800000000..949999999') for j in range(1, 6)]
    + [var('c', '950000000..999999999'), var('k', '0..4')]
    + [var(f'p{j}', posee(f'b{j}', 'c', j - 1, 5)) for j in range(1, 6)],
    ['{{k}}'],
    ["Tous les nombres ont neuf chiffres : on les compare chiffre par chiffre, depuis la gauche "
     "(centaines de millions, puis dizaines de millions…).",
     f"Le plus grand : ${{{{c}}}}$, c'est la {si('k', PAYS)}."])
# Colis en millièmes : quatre à 2,2…2,9 kg (dixièmes), le plus léger à 2,1xx kg (trois décimales)
v2 = variation(
    "Ce tableau donne la masse de cinq colis.\n\n" + tableau_colis('m', 3)
    + "\n\nQuel colis est le plus léger ?\n\n" + choix(['Le colis ' + c for c in COLIS]),
    [var(f'u{j}', '2..9') for j in range(1, 6)] + [var('c', '2101..2199'), var('k', '0..4')]
    + [var(f'm{j}', posee(f'2000+100*u{j}', 'c', j - 1, 5)) for j in range(1, 6)],
    ['{{k}}'],
    ["Le plus léger a la plus petite masse. Toutes commencent par $2$ unités : on compare les "
     "dixièmes. Un nombre qui a plus de chiffres après la virgule n'est pas plus grand pour autant.",
     f"${evd('c/1000')}$ n'a qu'$1$ dixième : c'est la plus petite masse, le colis "
     + si('k', COLIS) + "."],
    conditions=['mod(c,10) != 0'])
v3 = variation(
    "Ce tableau donne la hauteur de pluie tombée en un an (en mm) dans cinq villes, trois années "
    "de suite.\n\n" + tableau_pluie()
    + f"\n\nEn quelle année a-t-il le plus plu à {si('k', VILLES)} ?\n\n" + choix(ANNEES),
    [var(f'b{j}{c}', '400..1099') for j in range(1, 6) for c in range(3)]
    + [var('t', '1100..1200'), var('k', '0..4'), var('q', '0..2')]
    + [var(f'r{j}{c}', f'eval:b{j}{c}+(t-b{j}{c})*{lagrange(j - 1, 5, "k")}*{lagrange(c, 3, "q")}')
       for j in range(1, 6) for c in range(3)],
    ['{{q}}'],
    [f"On ne regarde que la ligne « {si('k', VILLES)} », et on y cherche le plus grand nombre.",
     f"Le plus grand : ${{{{t}}}}$ mm, en {si('q', ANNEES)}."])
v4 = variation(
    "Ce tableau donne la masse de cinq colis.\n\n" + tableau_colis('m', 2)
    + f"\n\nCombien de kilogrammes le colis {si('k', COLIS)} pèse-t-il de plus que le colis "
    + f"{si('k', COLIS[1:] + COLIS[:1])} ?\n\n$?$ kg",
    [var(f'm{j}', '105..995') for j in range(1, 6)]
    + [var('k', '0..4'),
       var('x', 'eval:' + selon([f'm{j}' for j in range(1, 6)])),
       var('y', 'eval:' + selon([f'm{j}' for j in [2, 3, 4, 5, 1]])),
       var('d', 'eval:x-y')],
    [decimal(evd('d/100'))],
    [f"On lit les deux masses : colis {si('k', COLIS)} ${evd('x/100')}$ kg, colis "
     f"{si('k', COLIS[1:] + COLIS[:1])} ${evd('y/100')}$ kg.",
     "« Combien de plus » : on calcule l'écart, $" + evd('x/100') + " - " + evd('y/100') + " = "
     + col(evd('d/100')) + "$ kg."],
    conditions=['x > y', 'mod(x-y,100) != 0'])
vs = [v1, v2, v3, v4]
tb = {'b1': 912345678, 'b2': 948120004, 'b3': 875300120, 'b4': 931002456, 'b5': 809870000}
tu = {'u1': 5, 'u2': 2, 'u3': 9, 'u4': 3, 'u5': 7}
tbr = {f'b{j}{c}': 400 + 41 * j + 97 * c for j in range(1, 6) for c in range(3)}
tc = {'m1': 745, 'm2': 380, 'm3': 912, 'm4': 256, 'm5': 503}
ecrire('02-interpreter-un-tableau', modele(
    "Que dit le tableau ? (grands nombres, décimaux, double entrée)",
    "Le pays le plus peuplé (neuf chiffres), le colis le plus léger (2,125 contre 2,3 : le plus long "
    "n'est pas le plus grand), l'année la plus pluvieuse d'une ville (double entrée), combien de kg "
    "de plus pèse un colis (centièmes)",
    7, vs,
    [spec("Le plus peuplé : Talessie (rang 3)", 0, vs, {**tb, 'c': 967000123, 'k': 3}, '3', 'correct'),
     spec("Erreur : Morvanie (948…)", 0, vs, {**tb, 'c': 967000123, 'k': 3}, '1', 'incorrect'),
     spec("Le plus léger : colis C (2,125 kg)", 1, vs, {**tu, 'c': 2125, 'k': 2}, '2', 'correct'),
     spec("Erreur : colis B (2,2 kg, le plus court)", 1, vs, {**tu, 'c': 2125, 'k': 2}, '1',
          'incorrect'),
     spec("Castelroc : 2025", 2, vs, {**tbr, 't': 1150, 'k': 1, 'q': 2}, '2', 'correct'),
     spec("Erreur : 2024", 2, vs, {**tbr, 't': 1150, 'k': 1, 'q': 2}, '1', 'incorrect'),
     spec("C − D : 9,12 − 2,56 = 6,56", 3, vs, {**tc, 'k': 2}, '6,56', 'correct'),
     spec("Erreur : la somme (11,68)", 3, vs, {**tc, 'k': 2}, '11,68', 'incorrect'),
     spec("A − B : 7,45 − 3,8 = 3,65", 3, vs, {**tc, 'k': 0}, '3,65', 'correct')],
    delay=120, options=DECIMAUX))

# ============================================================================
# 14a-3 — CM2-123 : lire un diagramme en barres (niveau 8)
# ============================================================================

MOIS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai']
MOIS_MIN = ['janvier', 'février', 'mars', 'avril', 'mai']
INTRO_MUSEE = "Ce diagramme donne le nombre de visiteurs d'un musée, chaque mois.\n\n"


def barres_musee(axe, prefixe='a'):
    return ("```barres\ntitre: Visiteurs du musée\naxes: Mois ; Visiteurs\n"
            + '\n'.join(f'{m} = {{{{{prefixe}{j}}}}}' for j, m in enumerate(MOIS, 1))
            + f"\naxe: {axe}\n```")


def lire_barres(pas, haut, decale, explication):
    variables = ([var(f'u{j}', f'{0 if decale else 1}..{haut}') for j in range(1, 6)]
                 + [var(f'a{j}', f'eval:{pas}*u{j}+{decale}') for j in range(1, 6)]
                 + [var('k', '0..4'), var('n', 'eval:' + selon([f'a{j}' for j in range(1, 6)]))])
    return variation(
        INTRO_MUSEE + barres_musee(f'0 à {pas * 10}, de {pas} en {pas}')
        + f"\n\nCombien de visiteurs le musée a-t-il reçus en {si('k', MOIS_MIN)} ?\n\n$?$ visiteurs",
        variables, ['{{n}}'],
        [f"On cherche la barre « {si('k', MOIS)} », puis on suit son haut jusqu'à l'axe vertical.",
         explication, f"En {si('k', MOIS_MIN)} : $" + col('{{n}}') + "$ visiteurs."])


v4 = variation(
    INTRO_MUSEE + barres_musee('0 à 1000, de 100 en 100')
    + "\n\nQuel mois le musée a-t-il reçu ${{n}}$ visiteurs ?\n\n" + choix(MOIS),
    [var(f'h{j}', '1..10') for j in range(1, 6)] + [var('w', '1..10'), var('k', '0..4')]
    + [var(f'a{j}', posee(f'100*h{j}', '100*w', j - 1, 5)) for j in range(1, 6)]
    + [var('n', 'eval:100*w')],
    ['{{k}}'],
    ["L'axe est gradué de $100$ en $100$ : ${{n}}$, c'est le trait n° ${{w}}$. On cherche la barre "
     "dont le haut arrive à ce trait.",
     f"C'est {si('k', MOIS_MIN)}."],
    conditions=[f'(h{j}-w)*(h{j}-w) > 0' for j in range(1, 6)])
vs = [lire_barres(100, 10, 0, "L'axe est gradué de $100$ en $100$ : chaque trait compte pour $100$ "
                  "visiteurs."),
      lire_barres(500, 10, 0, "L'axe est gradué de $500$ en $500$ : chaque trait compte pour $500$ "
                  "visiteurs."),
      lire_barres(200, 9, 100, "L'axe est gradué de $200$ en $200$ ; le haut de la barre tombe au "
                  "milieu, entre deux traits : la moitié de $200$, c'est $100$."),
      v4]
tu = {'u1': 4, 'u2': 7, 'u3': 9, 'u4': 3, 'u5': 6}
th = {'h1': 4, 'h2': 7, 'h3': 9, 'h4': 3, 'h5': 6}
ecrire('03-lire-un-diagramme-en-barres', modele(
    "Lis le diagramme en barres (axe de 100, 200 ou 500)",
    "Visiteurs d'un musée chaque mois : lire une barre sur un axe gradué de 100 en 100, de 500 en "
    "500, une barre entre deux traits (axe de 200 en 200), puis le mois d'une barre donnée (case choix)",
    8, vs,
    [spec("De 100 en 100 : mars, 900", 0, vs, {**tu, 'k': 2}, '900', 'correct'),
     spec("Erreur : les traits comptés (9)", 0, vs, {**tu, 'k': 2}, '9', 'incorrect'),
     spec("De 500 en 500 : février, 3 500", 1, vs, {**tu, 'k': 1}, '3 500', 'correct'),
     spec("Erreur : de 100 en 100 (700)", 1, vs, {**tu, 'k': 1}, '700', 'incorrect'),
     spec("Entre deux traits : janvier, 900", 2, vs, {**tu, 'k': 0}, '900', 'correct'),
     spec("Erreur : le trait du dessous (800)", 2, vs, {**tu, 'k': 0}, '800', 'incorrect'),
     spec("500 visiteurs : mai", 3, vs, {**th, 'w': 5, 'k': 4}, '4', 'correct'),
     spec("Erreur : avril", 3, vs, {**th, 'w': 5, 'k': 4}, '3', 'incorrect')],
    delay=90))

# ============================================================================
# 14a-4 — CM2-157 : interpréter un diagramme en barres (niveau 9)
# ============================================================================

MOIS6 = MOIS + ['Juin']
MOIS6_MIN = MOIS_MIN + ['juin']


def barres_musee6(axe):
    return ("```barres\ntitre: Visiteurs du musée\naxes: Mois ; Visiteurs\n"
            + '\n'.join(f'{m} = {{{{a{j}}}}}' for j, m in enumerate(MOIS6, 1))
            + f"\naxe: {axe}\n```")


v1 = variation(
    INTRO_MUSEE + barres_musee('0 à 2500, de 250 en 250')
    + f"\n\nCombien de visiteurs le musée a-t-il reçus de plus en {si('k', MOIS_MIN[1:])} qu'en "
      f"{si('k', MOIS_MIN[:4])} ?\n\n$?$ visiteurs de plus",
    [var(f'u{j}', '1..10') for j in range(1, 6)]
    + [var(f'a{j}', f'eval:250*u{j}') for j in range(1, 6)]
    + [var('k', '0..3'), var('x', 'eval:' + selon([f'a{j}' for j in range(1, 5)])),
       var('y', 'eval:' + selon([f'a{j}' for j in range(2, 6)])), var('d', 'eval:y-x')],
    ['{{d}}'],
    ["L'axe est gradué de $250$ en $250$.",
     f"On lit les deux barres : {si('k', MOIS_MIN[1:])} ${{{{y}}}}$ visiteurs, "
     f"{si('k', MOIS_MIN[:4])} ${{{{x}}}}$ visiteurs.",
     "« Combien de plus » : l'écart, ${{y}} - {{x}} = " + col('{{d}}') + "$ visiteurs."],
    conditions=['y > x'])
v2 = variation(
    INTRO_MUSEE + barres_musee('0 à 5000, de 500 en 500')
    + "\n\nQuel mois le musée a-t-il reçu le moins de visiteurs ?\n\n" + choix(MOIS),
    [var(f'u{j}', '3..10') for j in range(1, 6)] + [var('c', '1..2'), var('k', '0..4')]
    + [var(f'a{j}', posee(f'500*u{j}', '500*c', j - 1, 5)) for j in range(1, 6)],
    ['{{k}}'],
    ["Le moins de visiteurs : la barre la plus basse.",
     f"C'est {si('k', MOIS_MIN)}, avec ${{{{eval:500*c}}}}$ visiteurs."])
# seuil sur un trait ; aucune barre sur le seuil ; compte = somme de min(1, max(0, u - s))
v3 = variation(
    INTRO_MUSEE.replace('chaque mois', 'de janvier à juin') + barres_musee6('0 à 1000, de 100 en 100')
    + "\n\nPendant combien de mois le musée a-t-il reçu plus de ${{eval:100*s}}$ visiteurs ?"
    + "\n\n$?$ mois",
    [var(f'u{j}', '1..10') for j in range(1, 7)] + [var('s', '3..7')]
    + [var(f'a{j}', f'eval:100*u{j}') for j in range(1, 7)]
    + [var('n', 'eval:' + '+'.join(f'min(1,max(0,u{j}-s))' for j in range(1, 7)))],
    ['{{n}}'],
    ["On repère le trait ${{eval:100*s}}$ sur l'axe, et on compte les barres qui le dépassent.",
     "Il y en a $" + col('{{n}}') + "$."],
    conditions=[f'(u{j}-s)*(u{j}-s) > 0' for j in range(1, 7)] + ['n > 0', 'n < 6'])
vs = [v1, v2, v3]
ecrire('04-interpreter-un-diagramme-en-barres', modele(
    "Que dit le diagramme en barres ? (visiteurs du musée)",
    "Combien de visiteurs de plus un mois que le précédent (axe de 250), le mois du plus petit nombre "
    "de visiteurs (case choix, axe de 500), pendant combien de mois le musée a dépassé un seuil",
    9, vs,
    [spec("Mars − février : 2 250 − 1 750 = 500", 0, vs,
          {'u1': 4, 'u2': 7, 'u3': 9, 'u4': 3, 'u5': 6, 'k': 1}, '500', 'correct'),
     spec("Erreur : la somme (4 000)", 0, vs, {'u1': 4, 'u2': 7, 'u3': 9, 'u4': 3, 'u5': 6, 'k': 1},
          '4 000', 'incorrect'),
     spec("Le moins : avril (1 000)", 1, vs,
          {'u1': 4, 'u2': 7, 'u3': 8, 'u4': 3, 'u5': 6, 'c': 2, 'k': 3}, '3', 'correct'),
     spec("Erreur : janvier", 1, vs, {'u1': 4, 'u2': 7, 'u3': 8, 'u4': 3, 'u5': 6, 'c': 2, 'k': 3},
          '0', 'incorrect'),
     spec("Plus de 500 : 6, 8, 9, 7 → 4 mois", 2, vs,
          {'u1': 6, 'u2': 3, 'u3': 8, 'u4': 9, 'u5': 2, 'u6': 7, 's': 5}, '4', 'correct'),
     spec("Erreur : les mois en dessous (2)", 2, vs,
          {'u1': 6, 'u2': 3, 'u3': 8, 'u4': 9, 'u5': 2, 'u6': 7, 's': 5}, '2', 'incorrect')],
    delay=120))

# ============================================================================
# 14a-5 — CM2-124 : lire un diagramme circulaire (diagrammes circulaires, niveau 1)
# ============================================================================

MOYENS3 = ['À pied', 'Vélo', 'Bus']
MOYENS3_TXT = ['à pied', 'à vélo', 'en bus']
MOYENS4 = ['À pied', 'Vélo', 'Bus', 'Voiture']
MOYENS4_TXT = ['à pied', 'à vélo', 'en bus', 'en voiture']


def circulaire(titre, noms, valeurs, etiquettes):
    return ("```circulaire\ntitre: " + titre + "\n"
            + '\n'.join(f'{n} = {{{{{v}}}}}' for n, v in zip(noms, valeurs))
            + f"\nétiquettes: {etiquettes}\n```")


# V1 : moitié et quarts ; la part de rang k vaut q_k quarts
v1 = variation(
    "Ce diagramme montre comment les élèves de l'école viennent le matin.\n\n"
    + circulaire('Venir à l\'école', MOYENS3, ['a', 'b', 'c'], 'aucune')
    + f"\n\nQuelle fraction des élèves vient {si('k', MOYENS3_TXT)} ?\n\n$?$",
    [var('k', '0..2'), var('h', '0..2'), var('m', '20..40')]
    + [var(f'q{j}', f'eval:1+{lagrange(j, 3, "h")}') for j in range(3)]
    + [var(v, f'eval:m*q{j}') for j, v in enumerate(['a', 'b', 'c'])]
    + [var('r', 'eval:' + selon(['q0', 'q1', 'q2']))],
    [{'expectedAnswer': frac('{{r}}', '4'), 'requiredForm': 'fraction'}],
    ["Le plus grand secteur occupe la moitié du disque ; les deux autres se partagent l'autre "
     "moitié, chacun un quart.",
     f"« {si('k', MOYENS3)} » occupe ${{{{r}}}}$ quart(s) du disque : "
     "{{if:r==2|$\\frac{2}{4}$, soit $" + col('\\frac{1}{2}') + "$ des élèves.|$"
     + col('\\frac{1}{4}') + "$ des élèves.}}"])
# V2 : effectifs, total 10t ; la part de rang k vaut p_k dixièmes
v2 = variation(
    "Les ${{eval:10*t}}$ élèves de l'école ont dit comment ils viennent le matin.\n\n"
    + circulaire('Venir à l\'école', MOYENS3, ['a', 'b', 'c'], 'effectifs')
    + f"\n\nQuelle fraction des élèves vient {si('k', MOYENS3_TXT)} ?\n\n$?$",
    [var('t', '2..5'), var('p0', '1..7'), var('p1', '1..7'), var('k', '0..2'),
     var('p2', 'eval:10-p0-p1'), var('a', 'eval:p0*t'), var('b', 'eval:p1*t'),
     var('c', 'eval:p2*t'), var('n', 'eval:' + selon(['a', 'b', 'c'])),
     var('p', 'eval:' + selon(['p0', 'p1', 'p2']))],
    [{'expectedAnswer': frac('{{n}}', '{{eval:10*t}}'), 'requiredForm': 'fraction'}],
    [f"La légende donne ${{{{n}}}}$ élèves {si('k', MOYENS3_TXT)}, sur ${{{{eval:10*t}}}}$ élèves en "
     "tout : $" + frac('{{n}}', '{{eval:10*t}}') + "$ des élèves.",
     "On peut simplifier : $" + frac('{{n}}', '{{eval:10*t}}') + " = " + frac('{{p}}', '10')
     + "{{if:mod(p,2)==0| = " + col(frac('{{eval:p/2}}', '5')) + "|}}$."],
    conditions=['p2 >= 1'])
# V3 : la moitié, à reconnaître (case choix)
v3 = variation(
    "Ce diagramme montre comment les élèves de l'école viennent le matin.\n\n"
    + circulaire('Venir à l\'école', MOYENS3, ['a', 'b', 'c'], 'aucune')
    + "\n\nQuel moyen de transport la moitié des élèves utilise-t-elle ?\n\n" + choix(MOYENS3),
    [var('k', '0..2'), var('m', '20..40')]
    + [var(v, f'eval:m*(1+{lagrange(j, 3, "k")})') for j, v in enumerate(['a', 'b', 'c'])],
    ['{{k}}'],
    ["La moitié du disque : le secteur qui fait un demi-disque (les deux autres font un quart chacun).",
     f"C'est « {si('k', MOYENS3)} »."])
vs = [v1, v2, v3]
ecrire('05-lire-un-diagramme-circulaire', modele(
    "Lis le diagramme circulaire",
    "Moyens de transport des élèves : la fraction d'un secteur d'une moitié ou d'un quart (sans "
    "nombres), la fraction lue sur les effectifs de la légende (total de 20 à 50, cinquièmes et "
    "dixièmes ; toute fraction égale juste), le moyen qui concerne la moitié des élèves (case choix)",
    1, vs,
    [spec("Vélo, un quart : 1/4", 0, vs, {'k': 1, 'h': 0, 'm': 30}, '\\frac{1}{4}', 'correct'),
     spec("À pied, la moitié : 1/2", 0, vs, {'k': 0, 'h': 0, 'm': 30}, '\\frac{1}{2}', 'correct'),
     spec("À pied, 2/4 : juste aussi", 0, vs, {'k': 0, 'h': 0, 'm': 30}, '\\frac{2}{4}', 'correct'),
     spec("Erreur : 1/3 (trois secteurs)", 0, vs, {'k': 1, 'h': 0, 'm': 30}, '\\frac{1}{3}',
          'incorrect'),
     spec("Bus 12 sur 30 : 2/5", 1, vs, {'t': 3, 'p0': 3, 'p1': 3, 'k': 2}, '\\frac{2}{5}', 'correct'),
     spec("Bus 12 sur 30 : 12/30 juste aussi", 1, vs, {'t': 3, 'p0': 3, 'p1': 3, 'k': 2},
          '\\frac{12}{30}', 'correct'),
     spec("Erreur : l'effectif seul (12)", 1, vs, {'t': 3, 'p0': 3, 'p1': 3, 'k': 2}, '12',
          'incorrect'),
     spec("Erreur : sur le total d'un autre secteur (12/9)", 1, vs, {'t': 3, 'p0': 3, 'p1': 3, 'k': 2},
          '\\frac{12}{9}', 'incorrect'),
     spec("La moitié : le bus", 2, vs, {'k': 2, 'm': 25}, '2', 'correct'),
     spec("Erreur : à pied", 2, vs, {'k': 2, 'm': 25}, '0', 'incorrect')],
    delay=90, options=SANS_SIMPLIFIER))

# ============================================================================
# 14a-6 — CM2-158 : interpréter un diagramme circulaire (niveau 2)
# ============================================================================

QUATRE = ['a', 'b', 'c', 'd']
v1 = variation(
    "Ce diagramme montre comment les élèves de l'école viennent le matin.\n\n"
    + circulaire('Venir à l\'école', MOYENS4, QUATRE, 'aucune')
    + "\n\nQuel moyen de transport est le plus utilisé ?\n\n" + choix(MOYENS4),
    [var(f'w{j}', '2..5') for j in range(4)] + [var('t', '9..12'), var('k', '0..3')]
    + [var(v, posee(f'w{j}', 't', j, 4)) for j, v in enumerate(QUATRE)],
    ['{{k}}'],
    ["Le plus utilisé : le plus grand secteur.",
     f"C'est « {si('k', MOYENS4)} »."])
v2 = variation(
    "Ce diagramme montre comment les élèves de l'école viennent le matin.\n\n"
    + circulaire('Venir à l\'école', MOYENS4, QUATRE, 'aucune')
    + "\n\nQuel moyen de transport est le moins utilisé ?\n\n" + choix(MOYENS4),
    [var(f'w{j}', '5..9') for j in range(4)] + [var('t', '1..2'), var('k', '0..3')]
    + [var(v, posee(f'w{j}', 't', j, 4)) for j, v in enumerate(QUATRE)],
    ['{{k}}'],
    ["Le moins utilisé : le plus petit secteur.",
     f"C'est « {si('k', MOYENS4)} »."])
v3 = variation(
    "Ce diagramme montre comment les élèves de l'école viennent le matin.\n\n"
    + circulaire('Venir à l\'école', MOYENS4, QUATRE, 'effectifs')
    + "\n\nCombien d'élèves de plus viennent en bus qu'à pied ?\n\n$?$ élèves de plus",
    [var('a', '8..40'), var('b', '5..30'), var('c', '20..60'), var('d', '5..30'),
     var('n', 'eval:c-a')],
    ['{{n}}'],
    ["La légende donne les effectifs : en bus ${{c}}$ élèves, à pied ${{a}}$ élèves.",
     "« Combien de plus » : l'écart, ${{c}} - {{a}} = " + col('{{n}}') + "$ élèves."],
    conditions=['c > a'])
# V4 : le bus fait nettement plus (13 à 15 sur 20) ou nettement moins (5 à 8 sur 20) que la moitié
v4 = variation(
    "Ce diagramme montre comment les élèves de l'école viennent le matin.\n\n"
    + circulaire('Venir à l\'école', MOYENS4, QUATRE, 'aucune')
    + "\n\nPlus de la moitié des élèves viennent-ils en bus ?\n\n" + choix(['Oui', 'Non']),
    [var('q', '0..1'), var('o', '13..15'), var('l', '5..8'), var('a', '1..6'), var('b', '1..6'),
     var('c', 'eval:o*(1-q)+l*q'), var('d', 'eval:20-a-b-c')],
    ['{{q}}'],
    ["La moitié du disque, c'est un demi-disque : on regarde si le secteur « Bus » dépasse un "
     "demi-disque.",
     "{{if:q==0|Le secteur « Bus » fait plus d'un demi-disque : $" + col('\\text{oui}')
     + "$.|Le secteur « Bus » fait moins d'un demi-disque : $" + col('\\text{non}') + "$.}}"],
    conditions=['d >= 1'])
vs = [v1, v2, v3, v4]
ecrire('06-interpreter-un-diagramme-circulaire', modele(
    "Que dit le diagramme circulaire ?",
    "Moyens de transport des élèves : le plus utilisé, le moins utilisé (case choix, secteurs bien "
    "distincts), combien d'élèves de plus en bus qu'à pied (effectifs de la légende), plus de la "
    "moitié des élèves en bus ? (oui / non, à l'œil)",
    2, vs,
    [spec("Le plus utilisé : le bus", 0, vs, {'w0': 3, 'w1': 5, 'w2': 2, 'w3': 4, 't': 10, 'k': 2}, '2',
          'correct'),
     spec("Erreur : le vélo", 0, vs, {'w0': 3, 'w1': 5, 'w2': 2, 'w3': 4, 't': 10, 'k': 2}, '1',
          'incorrect'),
     spec("Le moins utilisé : la voiture", 1, vs,
          {'w0': 6, 'w1': 8, 'w2': 5, 'w3': 7, 't': 1, 'k': 3}, '3', 'correct'),
     spec("Bus 34, à pied 19 : 15", 2, vs, {'a': 19, 'b': 12, 'c': 34, 'd': 9}, '15', 'correct'),
     spec("Erreur : la somme (53)", 2, vs, {'a': 19, 'b': 12, 'c': 34, 'd': 9}, '53', 'incorrect'),
     spec("Bus 14 sur 20 : oui", 3, vs, {'q': 0, 'o': 14, 'l': 6, 'a': 2, 'b': 3}, '0', 'correct'),
     spec("Bus 6 sur 20 : non", 3, vs, {'q': 1, 'o': 14, 'l': 6, 'a': 2, 'b': 3}, '1', 'correct'),
     spec("Erreur : oui avec 6 sur 20", 3, vs, {'q': 1, 'o': 14, 'l': 6, 'a': 2, 'b': 3}, '0',
          'incorrect')],
    delay=90))

# ============================================================================

os.makedirs(DOSSIER, exist_ok=True)
for nom, mod in MODELES.items():
    with open(os.path.join(DOSSIER, nom + '.json'), 'w', encoding='utf-8') as f:
        json.dump(mod, f, ensure_ascii=False, indent='\t')
        f.write('\n')
print(f'{len(MODELES)} modèles écrits dans {DOSSIER}')
