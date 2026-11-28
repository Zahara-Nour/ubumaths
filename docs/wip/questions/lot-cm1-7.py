"""Écrit les 13 modèles du lot 7 du CM1 (données) dans scripts/questions/cm1-7/.

Phase 0 validée par David le 2026-11-17 (§ 19 et 19 bis du journal
`docs/archive/wip/questions-cm1-progress.md`) : un lot de 13 modèles (CM1-120, 121, 122, 135 à 139, 169 à
172) ; villes inventées (7-2, 7-3) ; 7-8 dans les limites de `axe: à choisir` (1, 2, 5, 10 par
graduation, données ≤ 100) ; repère de 7-11 à axes donnés ; niveaux : celui qui suit le modèle CE2
de même geste dans le nœud (aux courbes, sans CE2 : celui du modèle de 5e de même geste), partagé,
sans renuméroter personne.

Bornes (`cycle3.json`) : 122, tableau simple ou double, barres, courbe, pas de diagramme circulaire ;
135, échelle adaptée aux données ; 136, points éventuellement reliés, échelle adaptée ; champ
numérique du CM1 (entiers jusqu'à 999 999).

Patrons : `scripts/questions/ce2-7c/` (CE2), `5-statistiques/09`, `10`, `5-reperage/08` (5e).

Choix « le plus » : la donnée gagnante est posée au rang k par un polynôme de Lagrange
(`posee(...)`), si bien que la réponse attendue est la variable `k` elle-même, sans `{{if}}` ni
condition d'unicité.

Pièges (relus dans le journal) : aucune `{{if}}` dans une réponse attendue ; `i` et `e` jamais
comme variables ; une plage négative ne se tire pas ; case « choix » : réponse = indice d'origine.

    python3 docs/wip/questions/lot-cm1-7.py scripts/questions/cm1-7
"""
import json
import os
import sys

DOSSIER = sys.argv[1]
ENTIERS = {'constraints': {'spacesFromFourDigits': True}}
MODELES = {}

# ---- Gabarits ----


def var(nom, expression):
    return {'name': nom, 'expression': expression}


def variation(enonce, variables, reponses, etapes, conditions=None):
    v = {'statement': enonce, 'variables': variables}
    if conditions:
        v['conditions'] = conditions
    v['blanks'] = [{'expectedAnswer': r} for r in reponses]
    v['correction'] = {'steps': etapes}
    return v


def modele(title, description, niveau, variations, specs, delay=90, options=ENTIERS):
    mod = {'title': title, 'description': description, 'grades': ['CM1'], 'level': niveau,
           'delay': delay, 'status': 'draft'}
    if options:
        mod['options'] = options
    mod['variations'] = variations
    mod['testSpecs'] = specs
    return mod


def calcule(variables, tirage):
    """Valeurs de toutes les variables d'une variation, à partir des tirages donnés.

    Les `eval:` sont évaluées comme le générateur le fait (opérations entières, parenthèses) : les
    specs ne recopient aucun nombre à la main.
    """
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


def nombre(x):
    """Réponse d'élève écrite comme le juge l'attend (espace dès 4 chiffres)."""
    s = str(abs(x))
    groupes = []
    while len(s) > 3:
        groupes.insert(0, s[-3:])
        s = s[:-3]
    groupes.insert(0, s)
    return ('-' if x < 0 else '') + ' '.join(groupes)


def spec(desc, vi, mod_variations, tirage, answers, status):
    valeurs = calcule(mod_variations[vi]['variables'], tirage)
    return {'description': desc, 'variationIndex': vi,
            'variables': {k: str(x) for k, x in valeurs.items()},
            'answers': answers, 'expected': {'status': status}}


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


def posee(base, haut, j, n, k='k'):
    """La donnée de rang j : `base`, sauf au rang k où elle vaut `haut`."""
    return f'eval:{base}+({haut}-{base})*{lagrange(j, n, k)}'


def si(k, mots, depart=0):
    """Le mot de rang k (k = depart, depart + 1…), dans un énoncé ou un corrigé seulement."""
    s = mots[-1]
    for j in range(len(mots) - 2, -1, -1):
        s = '{{if:' + k + '==' + str(j + depart) + '|' + mots[j] + '|' + s + '}}'
    return s


def choix(items, melanger=False):
    tete = '```choix\n' + ('' if melanger else 'melanger: non\n')
    return tete + '\n'.join('- ' + it for it in items) + '\n```'


def col(x):
    return '\\textcolor{{{color:primary.0}}}{' + x + '}'


def ecrire(nom, mod):
    MODELES[nom] = mod


# ============================================================================
# 7-1 — CM1-120 : ranger un relevé dans un tableau (tableaux, niveau 4)
# ============================================================================

PRENOMS = ['Léa', 'Tom', 'Inès', 'Noah', 'Jade', 'Adam', 'Lina', 'Hugo', 'Zoé', 'Rayan', 'Emma',
           'Sacha', 'Mila', 'Nolan', 'Chloé', 'Malo', 'Louna', 'Yanis', 'Rose', 'Ilyes', 'Anna',
           'Gabin', 'Alice', 'Timéo', 'Nina', 'Liam', 'Elsa', 'Axel']
FILLES = ['Léa', 'Inès', 'Jade', 'Lina', 'Zoé', 'Emma', 'Mila', 'Chloé', 'Louna', 'Rose']
GARCONS = ['Tom', 'Noah', 'Adam', 'Hugo', 'Rayan', 'Sacha', 'Nolan', 'Malo', 'Yanis', 'Ilyes']


def compte(prefixe, n, modalite, nb_modalites):
    """Nombre de réponses égales à `modalite` (1..nb) parmi prefixe1..prefixeN."""
    termes = []
    for s in range(1, n + 1):
        x = f'{prefixe}{s}'
        num = '*'.join(f'({x}-{m})' for m in range(1, nb_modalites + 1) if m != modalite)
        den = 1
        for m in range(1, nb_modalites + 1):
            if m != modalite:
                den *= (modalite - m)
        termes.append(f'{num}/({den})')
    return 'eval:' + '+'.join(termes)


SPORTS5 = ['football', 'danse', 'natation', 'judo', 'basket']
SPORTS5_MAJ = ['Football', 'Danse', 'Natation', 'Judo', 'Basket']
v1_vars = [var(f's{j}', '1..5') for j in range(1, 29)]
v1_vars += [var(f'n{c}', compte('s', 28, c, 5)) for c in range(1, 6)]
v1_liste = ' · '.join(f'{p} : {si(f"s{j}", SPORTS5, 1)}' for j, p in enumerate(PRENOMS, 1))
v1 = variation(
    "On a demandé aux $28$ élèves de la classe leur sport préféré.\n\n" + v1_liste
    + "\n\nCompte, puis complète le tableau.\n\n"
    + "| Sport préféré | Nombre d'élèves |\n|---|---|\n"
    + ''.join(f'| {s} | $?$ |\n' for s in SPORTS5_MAJ) + '| **Total** | $?$ |',
    v1_vars, [f'{{{{n{c}}}}}' for c in range(1, 6)] + ['28'],
    ["On compte chaque sport, en barrant les prénoms déjà comptés : "
     + ' ; '.join(f'{SPORTS5[c - 1]} ${{{{n{c}}}}}$' for c in range(1, 6)) + '.',
     "Le total : ${{n1}} + {{n2}} + {{n3}} + {{n4}} + {{n5}} = " + col('28') + "$, autant que "
     "d'élèves : aucun prénom n'est oublié ni compté deux fois."])

SPORTS3 = ['danse', 'football', 'natation']
SPORTS3_MAJ = ['Danse', 'Football', 'Natation']
v2_vars = [var(f'f{j}', '1..3') for j in range(1, 11)] + [var(f'g{j}', '1..3') for j in range(1, 11)]
v2_vars += [var(f'nf{c}', compte('f', 10, c, 3)) for c in range(1, 4)]
v2_vars += [var(f'ng{c}', compte('g', 10, c, 3)) for c in range(1, 4)]
v2_liste = ('Filles : ' + ' · '.join(f'{p} : {si(f"f{j}", SPORTS3, 1)}' for j, p in enumerate(FILLES, 1))
            + '\n\nGarçons : '
            + ' · '.join(f'{p} : {si(f"g{j}", SPORTS3, 1)}' for j, p in enumerate(GARCONS, 1)))
v2 = variation(
    "Dix filles et dix garçons ont choisi une activité pour le mercredi.\n\n" + v2_liste
    + "\n\nCompte, puis complète le tableau à double entrée.\n\n"
    + "| Activité | Filles | Garçons |\n|---|---|---|\n"
    + ''.join(f'| {s} | $?$ | $?$ |\n' for s in SPORTS3_MAJ).rstrip('\n'),
    v2_vars,
    [x for c in range(1, 4) for x in (f'{{{{nf{c}}}}}', f'{{{{ng{c}}}}}')],
    ["Une case = une activité (la ligne) et un groupe (la colonne) : on compte les filles qui ont "
     "choisi chaque activité, puis les garçons.",
     "Filles : danse ${{nf1}}$, football ${{nf2}}$, natation ${{nf3}}$ ; garçons : danse ${{ng1}}$, "
     "football ${{ng2}}$, natation ${{ng3}}$.",
     "On vérifie : ${{nf1}} + {{nf2}} + {{nf3}} = 10$ filles et ${{ng1}} + {{ng2}} + {{ng3}} = 10$ "
     "garçons."])

vs = [v1, v2]
t1 = {f's{j}': x for j, x in enumerate([1, 2, 1, 3, 5, 1, 2, 4, 1, 3, 2, 1, 5, 4, 2, 1, 3, 1, 2, 4,
                                         1, 5, 2, 3, 1, 4, 2, 1], 1)}
c1 = valeurs_de(vs, 0, t1)
bons1 = [str(c1[f'n{c}']) for c in range(1, 6)] + ['28']
faux1 = list(bons1)
faux1[0] = str(c1['n1'] - 1)
t2 = {**{f'f{j}': x for j, x in enumerate([1, 1, 3, 2, 1, 3, 1, 2, 3, 1], 1)},
      **{f'g{j}': x for j, x in enumerate([2, 2, 3, 1, 2, 2, 3, 2, 1, 2], 1)}}
c2 = valeurs_de(vs, 1, t2)
bons2 = [str(c2[n]) for c in range(1, 4) for n in (f'nf{c}', f'ng{c}')]
inverse2 = [str(c2[n]) for c in range(1, 4) for n in (f'ng{c}', f'nf{c}')]
ecrire('01-ranger-un-releve-dans-un-tableau', modele(
    "Range un relevé dans un tableau",
    "Compter un relevé de 28 réponses (5 sports) et remplir les effectifs avec le total ; ou un "
    "relevé de deux caractères (filles / garçons, 3 activités) et remplir un tableau à double entrée",
    4, vs,
    [spec(f"28 réponses : {', '.join(bons1[:5])}, total 28", 0, vs, t1, bons1, 'correct'),
     spec("Erreur : un football oublié", 0, vs, t1, faux1, 'incorrect'),
     spec(f"Double entrée : {', '.join(bons2)}", 1, vs, t2, bons2, 'correct'),
     spec("Erreur : filles et garçons inversés", 1, vs, t2, inverse2, 'incorrect')],
    delay=240))

# ============================================================================
# 7-2 — CM1-121 : lire un tableau à simple entrée (tableaux, niveau 4)
# ============================================================================

VILLES = ['Brumeval', 'Castelroc', 'Pontaval', 'Mirelande', 'Sablonnière']
SOMMETS = ['le pic de l\'Aigle', 'le mont Blanchet', 'la dent du Loup', 'le puy Vert', 'la tête Grise']
SOMMETS_MAJ = ['Pic de l\'Aigle', 'Mont Blanchet', 'Dent du Loup', 'Puy Vert', 'Tête Grise']


def tableau_villes(prefixe='p'):
    return ("| Ville | Nombre d'habitants |\n|---|---|\n"
            + '\n'.join(f'| {v} | ${{{{{prefixe}{j}}}}}$ |' for j, v in enumerate(VILLES, 1)))


villes_vars = [var(f'p{j}', '10000..999999') for j in range(1, 6)]
v1 = variation(
    "Ce tableau donne le nombre d'habitants de cinq villes.\n\n" + tableau_villes()
    + f"\n\nQuel est le nombre d'habitants de {si('k', VILLES)} ?\n\n$?$ habitants",
    villes_vars + [var('k', '0..4'), var('n', 'eval:' + selon([f'p{j}' for j in range(1, 6)]))],
    ['{{n}}'],
    [f"On cherche la ligne « {si('k', VILLES)} », puis on lit la case de la colonne « Nombre "
     "d'habitants ».",
     f"{si('k', VILLES)} : $" + col('{{n}}') + "$ habitants."])
v2 = variation(
    "Ce tableau donne le nombre d'habitants de cinq villes.\n\n" + tableau_villes()
    + "\n\nQuelle ville a ${{n}}$ habitants ?\n\n" + choix(VILLES),
    villes_vars + [var('k', '0..4'), var('n', 'eval:' + selon([f'p{j}' for j in range(1, 6)]))],
    ['{{k}}'],
    ["On cherche ${{n}}$ dans la colonne « Nombre d'habitants », chiffre par chiffre, puis on lit la "
     "ville sur la même ligne.",
     f"C'est {si('k', VILLES)}."])
v3 = variation(
    "Ce tableau donne l'altitude de cinq sommets.\n\n| Sommet | Altitude (m) |\n|---|---|\n"
    + '\n'.join(f'| {s} | ${{{{a{j}}}}}$ |' for j, s in enumerate(SOMMETS_MAJ, 1))
    + f"\n\nQuelle est l'altitude de {si('k', SOMMETS)} ?\n\n$?$ m",
    [var(f'a{j}', '1000..4800') for j in range(1, 6)]
    + [var('k', '0..4'), var('n', 'eval:' + selon([f'a{j}' for j in range(1, 6)]))],
    ['{{n}}'],
    [f"On cherche la ligne de {si('k', SOMMETS)}, puis on lit la colonne « Altitude (m) ».",
     "Son altitude : $" + col('{{n}}') + "$ m."])
vs = [v1, v2, v3]
tv = {'p1': 245318, 'p2': 87650, 'p3': 512004, 'p4': 31872, 'p5': 698120}
ecrire('02-lire-un-tableau-simple', modele(
    "Lis un tableau à simple entrée",
    "Villes inventées : le nombre d'habitants d'une ville (10 000 à 999 999), la ville qui a un "
    "nombre d'habitants donné (case choix) ; l'altitude d'un sommet (1 000 à 4 800 m)",
    4, vs,
    [spec("Pontaval : 512 004", 0, vs, {**tv, 'k': 2}, ['512 004'], 'correct'),
     spec("Erreur : la ligne voisine (Castelroc)", 0, vs, {**tv, 'k': 2}, ['87 650'], 'incorrect'),
     spec("698 120 : Sablonnière", 1, vs, {**tv, 'k': 4}, ['4'], 'correct'),
     spec("Erreur : Pontaval", 1, vs, {**tv, 'k': 4}, ['2'], 'incorrect'),
     spec("Dent du Loup : 3 512 m", 2, vs,
          {'a1': 2845, 'a2': 1930, 'a3': 3512, 'a4': 4120, 'a5': 1205, 'k': 2}, ['3 512'], 'correct')]))

# ============================================================================
# 7-3 — CM1-169 : interpréter un tableau à simple entrée (tableaux, niveau 5)
# ============================================================================

v1 = variation(
    "Ce tableau donne le nombre d'habitants de cinq villes.\n\n" + tableau_villes()
    + "\n\nQuelle ville est la plus peuplée ?\n\n" + choix(VILLES),
    [var(f'b{j}', '10000..799999') for j in range(1, 6)]
    + [var('c', '800000..999999'), var('k', '0..4')]
    + [var(f'p{j}', posee(f'b{j}', 'c', j - 1, 5)) for j in range(1, 6)],
    ['{{k}}'],
    ["La plus peuplée a le plus grand nombre d'habitants : on compare les nombres, d'abord leur "
     "nombre de chiffres, puis chiffre par chiffre depuis la gauche.",
     f"Le plus grand : ${{{{c}}}}$, c'est {si('k', VILLES)}."])
v2 = variation(
    "Ce tableau donne le nombre d'habitants de cinq villes.\n\n" + tableau_villes()
    + "\n\nQuelle ville est la moins peuplée ?\n\n" + choix(VILLES),
    [var(f'b{j}', '200000..999999') for j in range(1, 6)]
    + [var('c', '10000..99999'), var('k', '0..4')]
    + [var(f'p{j}', posee(f'b{j}', 'c', j - 1, 5)) for j in range(1, 6)],
    ['{{k}}'],
    ["La moins peuplée a le plus petit nombre d'habitants : un nombre de 5 chiffres est plus petit "
     "qu'un nombre de 6 chiffres.",
     f"Le plus petit : ${{{{c}}}}$, c'est {si('k', VILLES)}."])
v3 = variation(
    "Ce tableau donne le nombre d'habitants de cinq villes.\n\n" + tableau_villes()
    + f"\n\nCombien {si('k', VILLES)} a-t-elle d'habitants de plus que "
    + f"{si('k', VILLES[1:] + VILLES[:1])} ?\n\n$?$ habitants",
    villes_vars + [var('k', '0..4'),
                   var('x', 'eval:' + selon([f'p{j}' for j in range(1, 6)])),
                   var('y', 'eval:' + selon([f'p{j}' for j in [2, 3, 4, 5, 1]])),
                   var('d', 'eval:x-y')],
    ['{{d}}'],
    [f"On lit les deux nombres : {si('k', VILLES)} ${{{{x}}}}$, "
     f"{si('k', VILLES[1:] + VILLES[:1])} ${{{{y}}}}$.",
     "« Combien de plus » : on calcule l'écart, ${{x}} - {{y}} = " + col('{{d}}') + "$ habitants."],
    conditions=['x > y'])
vs = [v1, v2, v3]
tb = {'b1': 245318, 'b2': 87650, 'b3': 512004, 'b4': 31872, 'b5': 698120}
ecrire('03-interpreter-un-tableau-simple', modele(
    "Que dit le tableau des villes ?",
    "Villes inventées : la plus peuplée, la moins peuplée (case choix), combien d'habitants de plus "
    "qu'une autre ville",
    5, vs,
    [spec("La plus peuplée : Mirelande (rang 3)", 0, vs, {**tb, 'c': 905400, 'k': 3}, ['3'], 'correct'),
     spec("Erreur : la dernière ligne", 0, vs, {**tb, 'c': 905400, 'k': 3}, ['4'], 'incorrect'),
     spec("La moins peuplée : Brumeval", 1, vs,
          {'b1': 245318, 'b2': 870650, 'b3': 512004, 'b4': 310872, 'b5': 698120, 'c': 45200, 'k': 0},
          ['0'], 'correct'),
     spec("Pontaval − Mirelande : 512 004 − 31 872 = 480 132", 2, vs,
          {'p1': 245318, 'p2': 87650, 'p3': 512004, 'p4': 31872, 'p5': 698120, 'k': 2},
          ['480 132'], 'correct'),
     spec("Erreur : la somme", 2, vs,
          {'p1': 245318, 'p2': 87650, 'p3': 512004, 'p4': 31872, 'p5': 698120, 'k': 2},
          ['543 876'], 'incorrect')]))

# ============================================================================
# 7-4 — CM1-137 : lire un tableau à double entrée (niveau 6)
# ============================================================================

SPORTS_CLUB = ['Natation', 'Football', 'Danse', 'Judo', 'Tennis']
SPORTS_CLUB_MIN = ['la natation', 'le football', 'la danse', 'le judo', 'le tennis']


def tableau_club(totaux=False):
    lignes = '\n'.join(f'{s} = {{{{f{j}}}}} ; {{{{g{j}}}}}' for j, s in enumerate(SPORTS_CLUB, 1))
    return ("```tableau-croise\nlignes: " + ' ; '.join(SPORTS_CLUB) + "\ncolonnes: Filles ; Garçons\n"
            + lignes + "\ncoin: Sport \\ Élèves\n" + ("totaux: oui\n" if totaux else "totaux: non\n") + "```")


club_vars = ([var(f'f{j}', '15..240') for j in range(1, 6)]
             + [var(f'g{j}', '15..240') for j in range(1, 6)])
v1 = variation(
    "Ce tableau donne le nombre d'enfants inscrits dans les clubs de sport de la ville.\n\n"
    + tableau_club()
    + f"\n\nCombien de {si('q', ['filles', 'garçons'])} pratiquent {si('k', SPORTS_CLUB_MIN)} ?"
    + f"\n\n$?$ {si('q', ['filles', 'garçons'])}",
    club_vars + [var('k', '0..4'), var('q', '0..1'),
                 var('x', 'eval:' + selon([f'f{j}' for j in range(1, 6)])),
                 var('y', 'eval:' + selon([f'g{j}' for j in range(1, 6)])),
                 var('n', 'eval:x+(y-x)*q')],
    ['{{n}}'],
    [f"La ligne « {si('k', SPORTS_CLUB)} » et la colonne « {si('q', ['Filles', 'Garçons'])} » : "
     "la réponse est dans la case où elles se croisent.",
     "Cette case : $" + col('{{n}}') + "$."])
v2 = variation(
    "Ce tableau donne le nombre d'enfants inscrits dans les clubs de sport de la ville, avec les "
    "totaux.\n\n" + tableau_club(totaux=True)
    + f"\n\nCombien d'enfants, filles et garçons, pratiquent {si('k', SPORTS_CLUB_MIN)} ?"
    + "\n\n$?$ enfants",
    club_vars + [var('k', '0..4'),
                 var('n', 'eval:' + selon([f'f{j}+g{j}' for j in range(1, 6)]))],
    ['{{n}}'],
    [f"Filles et garçons ensemble : c'est la colonne « Total », sur la ligne « {si('k', SPORTS_CLUB)} ».",
     "On lit $" + col('{{n}}') + "$ enfants (c'est bien la somme des deux cases de la ligne)."])
v3 = variation(
    "Ce tableau donne le nombre d'enfants inscrits dans les clubs de sport de la ville.\n\n"
    + tableau_club()
    + "\n\nDans quel sport y a-t-il ${{n}}$ garçons ?\n\n" + choix(SPORTS_CLUB),
    [var(f'f{j}', '15..240') for j in range(1, 6)]
    + [var(f'h{j}', '15..240') for j in range(1, 6)]
    + [var('n', '15..240'), var('k', '0..4')]
    + [var(f'g{j}', posee(f'h{j}', 'n', j - 1, 5)) for j in range(1, 6)],
    ['{{k}}'],
    ["On cherche ${{n}}$ dans la colonne « Garçons » seulement, puis on lit le sport sur sa ligne.",
     f"C'est {si('k', SPORTS_CLUB_MIN)}."],
    conditions=[f'(h{j}-n)*(h{j}-n) > 0' for j in range(1, 6)]
    + [f'(f{j}-n)*(f{j}-n) > 0' for j in range(1, 6)])
vs = [v1, v2, v3]
tc = {'f1': 128, 'f2': 64, 'f3': 197, 'f4': 45, 'f5': 82, 'g1': 112, 'g2': 215, 'g3': 23, 'g4': 96,
      'g5': 77}
ecrire('04-lire-un-tableau-double-entree', modele(
    "Lis le tableau à double entrée (cinq lignes)",
    "Clubs de sport, filles et garçons : une case (« combien de garçons pratiquent la natation ? »), "
    "la case d'un total, le sport qui a un nombre de garçons donné (case choix) ; nombres ≤ 240",
    6, vs,
    [spec("Garçons en natation : 112", 0, vs, {**tc, 'k': 0, 'q': 1}, ['112'], 'correct'),
     spec("Erreur : la case des filles (128)", 0, vs, {**tc, 'k': 0, 'q': 1}, ['128'], 'incorrect'),
     spec("Filles en judo : 45", 0, vs, {**tc, 'k': 3, 'q': 0}, ['45'], 'correct'),
     spec("Total de la danse : 220", 1, vs, {**tc, 'k': 2}, ['220'], 'correct'),
     spec("Erreur : la case des filles seule", 1, vs, {**tc, 'k': 2}, ['197'], 'incorrect'),
     spec("96 garçons : le judo", 2, vs,
          {'f1': 128, 'f2': 64, 'f3': 197, 'f4': 45, 'f5': 82, 'h1': 112, 'h2': 215, 'h3': 23,
           'h4': 150, 'h5': 77, 'n': 96, 'k': 3}, ['3'], 'correct')]))

# ============================================================================
# 7-5 — CM1-170 : interpréter un tableau à double entrée (niveau 7)
# ============================================================================

v1 = variation(
    "Ce tableau donne le nombre d'enfants inscrits dans les clubs de sport de la ville.\n\n"
    + tableau_club() + "\n\nQuel sport attire le plus de filles ?\n\n" + choix(SPORTS_CLUB),
    [var(f'b{j}', '15..199') for j in range(1, 6)] + [var('c', '200..240'), var('k', '0..4')]
    + [var(f'f{j}', posee(f'b{j}', 'c', j - 1, 5)) for j in range(1, 6)]
    + [var(f'g{j}', '15..240') for j in range(1, 6)],
    ['{{k}}'],
    ["Les filles : on ne regarde que la colonne « Filles », et on y cherche le plus grand nombre.",
     f"Le plus grand : ${{{{c}}}}$, c'est {si('k', SPORTS_CLUB_MIN)}."])
v2 = variation(
    "Ce tableau donne le nombre d'enfants inscrits dans les clubs de sport de la ville.\n\n"
    + tableau_club()
    + f"\n\nDans le club de {si('k', ['natation', 'football', 'danse', 'judo', 'tennis'])}, combien "
      "y a-t-il de garçons de plus que de filles ?\n\n$?$ garçons de plus",
    club_vars + [var('k', '0..4'),
                 var('x', 'eval:' + selon([f'f{j}' for j in range(1, 6)])),
                 var('y', 'eval:' + selon([f'g{j}' for j in range(1, 6)])),
                 var('d', 'eval:y-x')],
    ['{{d}}'],
    [f"Sur la ligne « {si('k', SPORTS_CLUB)} » : ${{{{y}}}}$ garçons et ${{{{x}}}}$ filles.",
     "« Combien de plus » : l'écart, ${{y}} - {{x}} = " + col('{{d}}') + "$."],
    conditions=['y > x'])
v3 = variation(
    "Ce tableau donne le nombre d'enfants inscrits dans les clubs de sport de la ville.\n\n"
    + tableau_club() + "\n\nCombien d'enfants sont inscrits dans un club de sport, en tout ?"
    "\n\n$?$ enfants",
    [var(f'f{j}', '15..95') for j in range(1, 6)] + [var(f'g{j}', '15..95') for j in range(1, 6)]
    + [var('sf', 'eval:f1+f2+f3+f4+f5'), var('sg', 'eval:g1+g2+g3+g4+g5'), var('n', 'eval:sf+sg')],
    ['{{n}}'],
    ["On additionne la colonne des filles : ${{f1}} + {{f2}} + {{f3}} + {{f4}} + {{f5}} = {{sf}}$.",
     "Puis celle des garçons : ${{g1}} + {{g2}} + {{g3}} + {{g4}} + {{g5}} = {{sg}}$.",
     "En tout : ${{sf}} + {{sg}} = " + col('{{n}}') + "$ enfants."])
v4 = variation(
    "Ce tableau donne le nombre d'enfants inscrits dans les clubs de sport de la ville.\n\n"
    + tableau_club() + "\n\nQuel sport attire le plus d'enfants, filles et garçons ensemble ?\n\n"
    + choix(SPORTS_CLUB),
    [var(f'f{j}', '20..95') for j in range(1, 6)] + [var(f'h{j}', '20..95') for j in range(1, 6)]
    + [var('c', '200..230'), var('k', '0..4'),
       var('fk', 'eval:' + selon([f'f{j}' for j in range(1, 6)]))]
    + [var(f'g{j}', posee(f'h{j}', 'c-fk', j - 1, 5)) for j in range(1, 6)],
    ['{{k}}'],
    ["Filles et garçons ensemble : on additionne les deux cases de chaque ligne, puis on compare les "
     "cinq totaux.",
     f"Le plus grand total : ${{{{c}}}}$, c'est {si('k', SPORTS_CLUB_MIN)}."])
vs = [v1, v2, v3, v4]
tg = {'g1': 112, 'g2': 215, 'g3': 23, 'g4': 96, 'g5': 77}
ecrire('05-interpreter-un-tableau-double-entree', modele(
    "Que dit le tableau à double entrée ? (cinq lignes)",
    "Clubs de sport : le sport qui attire le plus de filles (case choix), combien de garçons de plus "
    "que de filles, le total général, le sport qui attire le plus d'enfants (case choix)",
    7, vs,
    [spec("Le plus de filles : la danse", 0, vs,
          {'b1': 128, 'b2': 64, 'b3': 150, 'b4': 45, 'b5': 82, 'c': 212, 'k': 2, **tg}, ['2'], 'correct'),
     spec("Erreur : le plus de garçons (football)", 0, vs,
          {'b1': 128, 'b2': 64, 'b3': 150, 'b4': 45, 'b5': 82, 'c': 212, 'k': 2, **tg}, ['1'],
          'incorrect'),
     spec("Football : 215 − 64 = 151", 1, vs, {**tc, 'k': 1}, ['151'], 'correct'),
     spec("Erreur : le nombre de garçons", 1, vs, {**tc, 'k': 1}, ['215'], 'incorrect'),
     spec("Total général : 315 + 312 = 627", 2, vs,
          {'f1': 68, 'f2': 54, 'f3': 87, 'f4': 45, 'f5': 61, 'g1': 72, 'g2': 85, 'g3': 23, 'g4': 56,
           'g5': 76}, ['627'], 'correct'),
     spec("Erreur : les filles seulement", 2, vs,
          {'f1': 68, 'f2': 54, 'f3': 87, 'f4': 45, 'f5': 61, 'g1': 72, 'g2': 85, 'g3': 23, 'g4': 56,
           'g5': 76}, ['315'], 'incorrect'),
     spec("Le plus d'enfants : le tennis (220)", 3, vs,
          {'f1': 90, 'f2': 54, 'f3': 87, 'f4': 45, 'f5': 61, 'h1': 92, 'h2': 85, 'h3': 23, 'h4': 56,
           'h5': 76, 'c': 220, 'k': 4}, ['4'], 'correct'),
     spec("Erreur : le plus de filles (natation)", 3, vs,
          {'f1': 90, 'f2': 54, 'f3': 87, 'f4': 45, 'f5': 61, 'h1': 92, 'h2': 85, 'h3': 23, 'h4': 56,
           'h5': 76, 'c': 220, 'k': 4}, ['0'], 'incorrect')],
    delay=150))

# ============================================================================
# 7-6 — CM1-138 : lire un diagramme en barres (niveau 5)
# ============================================================================

MOIS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai']
MOIS_MIN = ['janvier', 'février', 'mars', 'avril', 'mai']


def barres_livres(axe, prefixe='a'):
    return ("```barres\ntitre: Livres prêtés\naxes: Mois ; Livres\n"
            + '\n'.join(f'{m} = {{{{{prefixe}{j}}}}}' for j, m in enumerate(MOIS, 1))
            + f"\naxe: {axe}\n```")


def lire_barres(pas, haut, mult, decale, explication):
    variables = ([var(f'u{j}', f'1..{haut}') for j in range(1, 6)]
                 + [var(f'a{j}', f'eval:{mult}*u{j}+{decale}') for j in range(1, 6)]
                 + [var('k', '0..4'), var('n', 'eval:' + selon([f'a{j}' for j in range(1, 6)]))])
    return variation(
        "Ce diagramme donne le nombre de livres prêtés par la bibliothèque, chaque mois.\n\n"
        + barres_livres(f'0 à {pas * 10}, de {pas} en {pas}')
        + f"\n\nCombien de livres ont été prêtés en {si('k', MOIS_MIN)} ?\n\n$?$ livres",
        variables, ['{{n}}'],
        [f"On cherche la barre « {si('k', MOIS)} », puis on suit son haut jusqu'à l'axe vertical.",
         explication, f"En {si('k', MOIS_MIN)} : $" + col('{{n}}') + "$ livres."])


vs = [lire_barres(10, 10, 10, 0, "L'axe est gradué de $10$ en $10$ : chaque trait compte pour $10$ livres."),
      lire_barres(25, 10, 25, 0, "L'axe est gradué de $25$ en $25$ : chaque trait compte pour $25$ livres."),
      lire_barres(50, 10, 50, 0, "L'axe est gradué de $50$ en $50$ : chaque trait compte pour $50$ livres."),
      lire_barres(20, 9, 20, 10, "L'axe est gradué de $20$ en $20$ ; le haut de la barre tombe au milieu, "
                  "entre deux traits : la moitié de $20$, c'est $10$.")]
tu = {'u1': 4, 'u2': 7, 'u3': 9, 'u4': 3, 'u5': 6}
ecrire('06-lire-un-diagramme-en-barres', modele(
    "Lis le diagramme en barres (axe de 10, 20, 25 ou 50)",
    "Livres prêtés chaque mois : lire une barre sur un axe gradué de 10 en 10, de 25 en 25, de 50 en "
    "50, puis une barre entre deux traits (axe de 20 en 20)",
    5, vs,
    [spec("De 10 en 10 : mars, 90", 0, vs, {**tu, 'k': 2}, ['90'], 'correct'),
     spec("Erreur : les traits comptés (9)", 0, vs, {**tu, 'k': 2}, ['9'], 'incorrect'),
     spec("De 25 en 25 : février, 175", 1, vs, {**tu, 'k': 1}, ['175'], 'correct'),
     spec("Erreur : traits comptés de 10 en 10 (70)", 1, vs, {**tu, 'k': 1}, ['70'], 'incorrect'),
     spec("De 50 en 50 : mai, 300", 2, vs, {**tu, 'k': 4}, ['300'], 'correct'),
     spec("Entre deux traits : janvier, 90", 3, vs, {**tu, 'k': 0}, ['90'], 'correct'),
     spec("Erreur : le trait du dessous (80)", 3, vs, {**tu, 'k': 0}, ['80'], 'incorrect')]))

# ============================================================================
# 7-7 — CM1-171 : interpréter un diagramme en barres (niveau 6)
# ============================================================================

v1 = variation(
    "Ce diagramme donne le nombre de livres prêtés par la bibliothèque, chaque mois.\n\n"
    + barres_livres('0 à 120, de 10 en 10')
    + f"\n\nCombien de livres a-t-on prêtés de plus en {si('k', MOIS_MIN[1:])} qu'en "
      f"{si('k', MOIS_MIN[:4])} ?\n\n$?$ livres de plus",
    [var(f'u{j}', '1..12') for j in range(1, 6)]
    + [var(f'a{j}', f'eval:10*u{j}') for j in range(1, 6)]
    + [var('k', '0..3'), var('x', 'eval:' + selon([f'a{j}' for j in range(1, 5)])),
       var('y', 'eval:' + selon([f'a{j}' for j in range(2, 6)])), var('d', 'eval:y-x')],
    ['{{d}}'],
    [f"On lit les deux barres : {si('k', MOIS_MIN[1:])} ${{{{y}}}}$ livres, "
     f"{si('k', MOIS_MIN[:4])} ${{{{x}}}}$ livres.",
     "« Combien de plus » : l'écart, ${{y}} - {{x}} = " + col('{{d}}') + "$ livres."],
    conditions=['y > x'])
v2 = variation(
    "Ce diagramme donne le nombre de livres prêtés par la bibliothèque, chaque mois.\n\n"
    + barres_livres('0 à 250, de 25 en 25')
    + "\n\nQuel mois a-t-on prêté le plus de livres ?\n\n" + choix(MOIS),
    [var(f'u{j}', '1..8') for j in range(1, 6)] + [var('c', '9..10'), var('k', '0..4')]
    + [var(f'a{j}', posee(f'25*u{j}', '25*c', j - 1, 5)) for j in range(1, 6)],
    ['{{k}}'],
    ["Le plus de livres : la barre la plus haute.",
     f"C'est {si('k', MOIS_MIN)}, avec ${{{{eval:25*c}}}}$ livres."])
v3 = variation(
    "Ce diagramme donne le nombre de livres prêtés par la bibliothèque, chaque mois.\n\n"
    + barres_livres('0 à 500, de 50 en 50')
    + "\n\nCombien de livres a-t-on prêtés en tout de janvier à mars ?\n\n$?$ livres",
    [var(f'u{j}', '1..10') for j in range(1, 6)]
    + [var(f'a{j}', f'eval:50*u{j}') for j in range(1, 6)] + [var('n', 'eval:a1+a2+a3')],
    ['{{n}}'],
    ["De janvier à mars : trois barres, janvier, février et mars (l'axe compte de $50$ en $50$).",
     "On les additionne : ${{a1}} + {{a2}} + {{a3}} = " + col('{{n}}') + "$ livres."])
vs = [v1, v2, v3]
ecrire('07-interpreter-un-diagramme-en-barres', modele(
    "Que dit le diagramme en barres ? (livres prêtés)",
    "Combien de livres de plus un mois que le précédent (BO : mars et février), le mois du plus "
    "grand nombre de prêts (case choix), combien en tout de janvier à mars ; axes de 10, 25, 50",
    6, vs,
    [spec("Mars − février : 90 − 70 = 20", 0, vs, {'u1': 4, 'u2': 7, 'u3': 9, 'u4': 3, 'u5': 6, 'k': 1},
          ['20'], 'correct'),
     spec("Erreur : la barre de mars (90)", 0, vs, {'u1': 4, 'u2': 7, 'u3': 9, 'u4': 3, 'u5': 6, 'k': 1},
          ['90'], 'incorrect'),
     spec("Le plus : avril (250)", 1, vs, {'u1': 4, 'u2': 7, 'u3': 8, 'u4': 3, 'u5': 6, 'c': 10, 'k': 3},
          ['3'], 'correct'),
     spec("Janvier à mars : 200 + 350 + 450 = 1 000", 2, vs,
          {'u1': 4, 'u2': 7, 'u3': 9, 'u4': 3, 'u5': 6}, ['1 000'], 'correct'),
     spec("Erreur : les cinq mois", 2, vs, {'u1': 4, 'u2': 7, 'u3': 9, 'u4': 3, 'u5': 6},
          ['1 450'], 'incorrect')],
    delay=120))

# ============================================================================
# 7-8 — CM1-135 : construire un diagramme en barres, échelle à choisir (niveau 7)
# ============================================================================

ANIMAUX = ['Chat', 'Chien', 'Lapin', 'Poisson', 'Cheval']


def construire(intro, objet, noms, bas, haut, seuil, max_ok):
    n = len(noms)
    lettres = 'abcdg'[:n]
    tableau = (f"| {objet} | Nombre d'élèves |\n|---|---|\n"
               + '\n'.join(f'| {nm} | ${{{{{l}}}}}$ |' for nm, l in zip(noms, lettres)))
    barres = ('```barres\ntitre: ' + intro[1] + '\naxes: ' + objet + ' ; Élèves\n'
              + '\n'.join(f'{nm} = {{{{{l}}}}}' for nm, l in zip(noms, lettres))
              + '\naxe: à choisir\nplacer: toutes\n```')
    return variation(
        intro[0] + "\n\n" + tableau
        + "\n\nChoisis l'échelle de l'axe, puis construis le diagramme en barres.\n\n" + barres,
        [var(l, f'{bas}..{haut}') for l in lettres] + [var('m', f'eval:max({", ".join(lettres)})')],
        [],
        ["L'axe a $10$ graduations : on prend la plus petite échelle où la plus grande barre rentre.",
         f"La plus grande barre : ${{{{m}}}}$ élèves. Avec {max_ok}",
         "Chaque barre monte jusqu'à son nombre d'élèves ; une barre peut s'arrêter entre deux traits."],
        conditions=[f'm > {seuil}'])


vs = [construire(("Les élèves de la classe ont dit leur animal préféré.", 'Animal préféré'),
                 'Animal', ANIMAUX[:4], 3, 20, 10,
                 "$1$ par graduation, l'axe s'arrêterait à $10$ : trop court. Avec $2$, il monte "
                 "jusqu'à $20$ : tout rentre."),
      construire(("Les élèves de l'école ont choisi leur sport préféré.", 'Sport préféré'),
                 'Sport', ['Football', 'Danse', 'Judo', 'Basket'], 8, 50, 20,
                 "$2$ par graduation, l'axe s'arrêterait à $20$ : trop court. Avec $5$, il monte "
                 "jusqu'à $50$ : tout rentre."),
      construire(("Les élèves de l'école ont choisi un atelier.", 'Atelier choisi'),
                 'Atelier', ['Théâtre', 'Chorale', 'Échecs', 'Jardin', 'Dessin'], 12, 100, 50,
                 "$5$ par graduation, l'axe s'arrêterait à $50$ : trop court. Avec $10$, il monte "
                 "jusqu'à $100$ : tout rentre.")]
ecrire('08-construire-un-diagramme-en-barres', modele(
    "Choisis l'échelle et construis le diagramme (nombres quelconques)",
    "Tableau des effectifs donné, nombres qui ne tombent pas tous sur un trait : choisir l'échelle "
    "(2, 5 ou 10 par graduation) puis monter toutes les barres",
    7, vs,
    [spec("Animaux jusqu'à 17 : échelle 2", 0, vs, {'a': 17, 'b': 9, 'c': 4, 'd': 12},
          ['2', '17', '9', '4', '12'], 'correct'),
     spec("Erreur : échelle 5 (rentre, mais moins lisible)", 0, vs, {'a': 17, 'b': 9, 'c': 4, 'd': 12},
          ['5', '17', '9', '4', '12'], 'incorrect'),
     spec("Erreur : une barre au trait du dessous (16)", 0, vs, {'a': 17, 'b': 9, 'c': 4, 'd': 12},
          ['2', '16', '9', '4', '12'], 'incorrect'),
     spec("Sports jusqu'à 43 : échelle 5", 1, vs, {'a': 43, 'b': 27, 'c': 12, 'd': 31},
          ['5', '43', '27', '12', '31'], 'correct'),
     spec("Ateliers jusqu'à 87 : échelle 10", 2, vs, {'a': 87, 'b': 54, 'c': 23, 'd': 66, 'g': 41},
          ['10', '87', '54', '23', '66', '41'], 'correct'),
     spec("Erreur : échelle 5 (87 ne rentre pas)", 2, vs, {'a': 87, 'b': 54, 'c': 23, 'd': 66, 'g': 41},
          ['5', '87', '54', '23', '66', '41'], 'incorrect')],
    delay=300, options=None))

# ============================================================================
# 7-9 — CM1-139 : lire une courbe (courbes et repères, niveau 1)
# ============================================================================

HEURES6 = [8, 10, 12, 14, 16, 18]


def courbe_temperatures(heures, prefixe='t', ymax=30, pas_y=2):
    pts = ' ; '.join(f'({h} ; {{{{{prefixe}{j}}}}})' for j, h in enumerate(heures))
    pas_x = heures[1] - heures[0]
    return ("```courbe\nx: " + f"{heures[0] - pas_x} ; {heures[-1] + pas_x}" + f"\ny: 0 ; {ymax}\n"
            + f"grille: {pas_x} ; {pas_y}\naxes: x = Heure (h) ; y = Température (°C)\n"
            + f"données: {pts}\ntaille: moyenne\n```")


montee = [var('u0', '2..5'), var('d1', '1..3'), var('d2', '1..3'), var('d3', '0..2'),
          var('d4', '1..2'), var('d5', '1..2'),
          var('t0', 'eval:2*u0'), var('t1', 'eval:t0+2*d1'), var('t2', 'eval:t1+2*d2'),
          var('t3', 'eval:t2+2*d3'), var('t4', 'eval:t3-2*d4'), var('t5', 'eval:t4-2*d5')]
v1 = variation(
    "On a relevé la température toutes les deux heures, de $8$ h à $18$ h.\n\n"
    + courbe_temperatures(HEURES6)
    + "\n\nQuelle température faisait-il à ${{eval:8+2*k}}$ h ?\n\n$?$ °C",
    montee + [var('k', '0..5'), var('n', 'eval:' + selon([f't{j}' for j in range(6)]))],
    ['{{n}}'],
    ["On part de ${{eval:8+2*k}}$ h sur l'axe horizontal, on monte jusqu'au point de la courbe, "
     "puis on lit la température sur l'axe vertical (de $2$ en $2$ °C).",
     "À ${{eval:8+2*k}}$ h, il faisait $" + col('{{n}}') + "$ °C."])
HEURES11 = list(range(8, 19))
v2 = variation(
    "On a relevé la température toutes les heures, de $8$ h à $18$ h.\n\n"
    + courbe_temperatures(HEURES11, ymax=22, pas_y=1)
    + "\n\nQuelle température faisait-il à ${{eval:8+k}}$ h ?\n\n$?$ °C",
    [var('t0', '5..9')] + [var(f'd{j}', '0..2') for j in range(1, 7)]
    + [var(f'd{j}', '0..1') for j in range(7, 11)]
    + [var(f't{j}', f'eval:t{j - 1}+d{j}') for j in range(1, 7)]
    + [var(f't{j}', f'eval:t{j - 1}-d{j}') for j in range(7, 11)]
    + [var('k', '1..10'), var('n', 'eval:' + selon([f't{j}' for j in range(11)]))],
    ['{{n}}'],
    ["On part de ${{eval:8+k}}$ h sur l'axe horizontal, on monte jusqu'au point de la courbe, puis "
     "on lit la température sur l'axe vertical (de $1$ en $1$ °C).",
     "À ${{eval:8+k}}$ h, il faisait $" + col('{{n}}') + "$ °C."])
v3 = variation(
    "On a relevé la température toutes les deux heures, de $8$ h à $18$ h. Chaque point de la "
    "courbe est un relevé.\n\n" + courbe_temperatures(HEURES6)
    + "\n\nÀ quelle heure le relevé indique-t-il ${{c}}$\u00a0°C ?\n\n$?$ h",
    [var('u0', '1..4')] + [var(f'd{j}', '1..2') for j in range(1, 6)]
    + [var('t0', 'eval:2*u0')] + [var(f't{j}', f'eval:t{j - 1}+2*d{j}') for j in range(1, 6)]
    + [var('k', '0..5'), var('c', 'eval:' + selon([f't{j}' for j in range(6)])),
       var('h', 'eval:8+2*k')],
    ['{{h}}'],
    ["On part de ${{c}}$ °C sur l'axe vertical, on suit la ligne horizontale jusqu'au point de la "
     "courbe, puis on descend lire l'heure.",
     "Le relevé de ${{c}}$ °C : à $" + col('{{h}}') + "$ h."])
vs = [v1, v2, v3]
tm = {'u0': 3, 'd1': 2, 'd2': 3, 'd3': 1, 'd4': 2, 'd5': 1}
ecrire('09-lire-une-courbe', modele(
    "Lis la courbe des températures",
    "Relevé de la journée : la température à une heure donnée (BO : à 14 h), toutes les deux heures "
    "ou toutes les heures ; l'heure du relevé qui indique une température donnée",
    1, vs,
    [spec("14 h : 18 °C", 0, vs, {**tm, 'k': 3}, ['18'], 'correct'),
     spec("Erreur : le relevé de 12 h (16)", 0, vs, {**tm, 'k': 3}, ['16'], 'incorrect'),
     spec("Toutes les heures, 15 h : 16 °C", 1, vs,
          {'t0': 7, 'd1': 1, 'd2': 2, 'd3': 2, 'd4': 1, 'd5': 2, 'd6': 2, 'd7': 1, 'd8': 0, 'd9': 1,
           'd10': 1, 'k': 7}, ['16'], 'correct'),
     spec("Erreur : le relevé de 14 h (17)", 1, vs,
          {'t0': 7, 'd1': 1, 'd2': 2, 'd3': 2, 'd4': 1, 'd5': 2, 'd6': 2, 'd7': 1, 'd8': 0, 'd9': 1,
           'd10': 1, 'k': 7}, ['17'], 'incorrect'),
     spec("14 °C : à 12 h", 2, vs, {'u0': 2, 'd1': 2, 'd2': 1, 'd3': 2, 'd4': 1, 'd5': 2, 'k': 2},
          ['12'], 'correct'),
     spec("Erreur : la température lue à la place de l'heure", 2, vs,
          {'u0': 2, 'd1': 2, 'd2': 1, 'd3': 2, 'd4': 1, 'd5': 2, 'k': 2}, ['14'], 'incorrect')]))

# ============================================================================
# 7-10 — CM1-172 : interpréter une courbe (courbes et repères, niveau 2)
# ============================================================================

v1 = variation(
    "On a relevé la température toutes les deux heures, de $8$ h à $18$ h.\n\n"
    + courbe_temperatures(HEURES6)
    + "\n\nÀ quelle heure la température est-elle la plus haute ?\n\n$?$ h",
    [var('w', '12..14'), var('s', '1..2'), var('k', '0..5')]
    + [var(f't{j}', f'eval:2*(w-s*abs({j}-k))') for j in range(6)] + [var('h', 'eval:8+2*k')],
    ['{{h}}'],
    ["La température la plus haute : le point le plus haut de la courbe.",
     "Il est à ${{eval:2*w}}$ °C ; on descend lire l'heure : $" + col('{{h}}') + "$ h."])
v2 = variation(
    "On a relevé la température toutes les deux heures, de $8$ h à $18$ h.\n\n"
    + courbe_temperatures(HEURES6)
    + "\n\nÀ quelle heure la température est-elle la plus basse ?\n\n$?$ h",
    [var('w', '1..3'), var('s', '1..2'), var('k', '0..5')]
    + [var(f't{j}', f'eval:2*(w+s*abs({j}-k))') for j in range(6)] + [var('h', 'eval:8+2*k')],
    ['{{h}}'],
    ["La température la plus basse : le point le plus bas de la courbe.",
     "Il est à ${{eval:2*w}}$ °C ; on descend lire l'heure : $" + col('{{h}}') + "$ h."])
v3 = variation(
    "On a relevé la température toutes les deux heures, de $8$ h à $18$ h.\n\n"
    + courbe_temperatures(HEURES6)
    + "\n\nDe combien de degrés la température a-t-elle monté entre $8$ h et $14$ h ?\n\n$?$ °C",
    montee + [var('n', 'eval:t3-t0')],
    ['{{n}}'],
    ["On lit les deux relevés : $8$ h, ${{t0}}$ °C ; $14$ h, ${{t3}}$ °C.",
     "La hausse : l'écart, ${{t3}} - {{t0}} = " + col('{{n}}') + "$ °C."])
vs = [v1, v2, v3]
ecrire('10-interpreter-une-courbe', modele(
    "Que dit la courbe des températures ?",
    "Relevé de la journée : l'heure de la température la plus haute (BO), la plus basse, la hausse "
    "entre 8 h et 14 h",
    2, vs,
    [spec("La plus haute à 16 h (26 °C)", 0, vs, {'w': 13, 's': 2, 'k': 4}, ['16'], 'correct'),
     spec("Erreur : la température au lieu de l'heure", 0, vs, {'w': 13, 's': 2, 'k': 4}, ['26'],
          'incorrect'),
     spec("La plus basse à 8 h (4 °C)", 1, vs, {'w': 2, 's': 1, 'k': 0}, ['8'], 'correct'),
     spec("Erreur : l'heure la plus chaude (18 h)", 1, vs, {'w': 2, 's': 1, 'k': 0}, ['18'],
          'incorrect'),
     spec("Hausse de 8 h à 14 h : 18 − 6 = 12", 2, vs, tm, ['12'], 'correct'),
     spec("Erreur : la température de 14 h", 2, vs, tm, ['18'], 'incorrect')],
    delay=120))

# ============================================================================
# 7-11 — CM1-136 : placer les points d'un relevé dans un repère (niveau 3)
# ============================================================================


def placer_releve(intro, tableau_tete, xs, prefixe, axes, ymax, pas_y, description, variables,
                  consigne):
    noms = 'ABCDE'
    pts = ' ; '.join(f'{n}=({x} ; {{{{{prefixe}{j}}}}})' for j, (n, x) in enumerate(zip(noms, xs), 1))
    tableau = ('| Point | ' + ' | '.join(noms) + ' |\n|---|' + '---|' * 5 + '\n'
               + f'| {tableau_tete[0]} | ' + ' | '.join(f'${x}$' for x in xs) + ' |\n'
               + f'| {tableau_tete[1]} | ' + ' | '.join(f'${{{{{prefixe}{j}}}}}$' for j in range(1, 6)) + ' |')
    pas_x = xs[1] - xs[0]
    bloc = (f"```courbe\nx: {xs[0] - pas_x} ; {xs[-1] + pas_x}\ny: 0 ; {ymax}\ngrille: {pas_x} ; {pas_y}\n"
            f"axes: {axes}\nplacer: {pts}\ntaille: moyenne\ndescription: {description}\n```")
    return variation(
        intro + "\n\n" + tableau + "\n\n" + consigne + "\n\n" + bloc, variables, [],
        ["Chaque colonne du tableau donne un point : on part de la valeur sur l'axe horizontal, puis on "
         f"monte jusqu'à la valeur sur l'axe vertical (un carreau vaut ${pas_y}$).",
         ' ; '.join(f'${n}' + col(f'({x} ; {{{{{prefixe}{j}}}}})') + '$'
                    for j, (n, x) in enumerate(zip(noms, xs), 1)) + '.'])


v1 = placer_releve(
    "On a mesuré la hauteur d'une plante chaque semaine.",
    ('Semaine', 'Hauteur (cm)'), [1, 2, 3, 4, 5], 'h', 'x = Semaine ; y = Hauteur (cm)', 30, 2,
    "Repère : semaine en abscisse, de 1 en 1 ; hauteur en ordonnée, de 0 à 30 cm, de 2 en 2.",
    [var('a', '1..3'), var('d1', '1..3'), var('d2', '1..3'), var('d3', '1..3'), var('d4', '1..3'),
     var('h1', 'eval:2*a'), var('h2', 'eval:h1+2*d1'), var('h3', 'eval:h2+2*d2'),
     var('h4', 'eval:h3+2*d3'), var('h5', 'eval:h4+2*d4')],
    "Place les points A, B, C, D et E : la semaine sur l'axe horizontal, la hauteur sur l'axe "
    "vertical.")
v2 = placer_releve(
    "On a relevé la température toutes les heures, un matin.",
    ('Heure (h)', 'Température (°C)'), [8, 9, 10, 11, 12], 't', 'x = Heure (h) ; y = Température (°C)',
    20, 1, "Repère : heure en abscisse, de 1 en 1 ; température en ordonnée, de 0 à 20 °C, de 1 en 1.",
    [var('a', '3..6'), var('d1', '0..3'), var('d2', '1..3'), var('d3', '0..3'), var('d4', '1..3'),
     var('t1', 'eval:a'), var('t2', 'eval:t1+d1'), var('t3', 'eval:t2+d2'), var('t4', 'eval:t3+d3'),
     var('t5', 'eval:t4+d4')],
    "Place les points A, B, C, D et E : l'heure sur l'axe horizontal, la température sur l'axe "
    "vertical.")
v3 = placer_releve(
    "On a relevé chaque mois la hauteur d'eau d'un bassin.",
    ('Mois', 'Hauteur (cm)'), [1, 2, 3, 4, 5], 'b', 'x = Mois ; y = Hauteur d\'eau (cm)', 60, 5,
    "Repère : mois en abscisse, de 1 en 1 ; hauteur en ordonnée, de 0 à 60 cm, de 5 en 5.",
    [var(f'w{j}', '2..12') for j in range(1, 6)] + [var(f'b{j}', f'eval:5*w{j}') for j in range(1, 6)],
    "Place les points A, B, C, D et E : le mois sur l'axe horizontal, la hauteur sur l'axe vertical.")
vs = [v1, v2, v3]
th = {'a': 2, 'd1': 1, 'd2': 3, 'd3': 2, 'd4': 2}
ch = valeurs_de(vs, 0, th)
bons = [f"{x};{ch[f'h{j}']}" for j, x in enumerate([1, 2, 3, 4, 5], 1)]
echange = [f"{ch['h1']};1"] + bons[1:]
tt = {'a': 4, 'd1': 2, 'd2': 3, 'd3': 0, 'd4': 2}
ct = valeurs_de(vs, 1, tt)
bons_t = [f"{x};{ct[f't{j}']}" for j, x in enumerate([8, 9, 10, 11, 12], 1)]
tw = {'w1': 4, 'w2': 7, 'w3': 9, 'w4': 6, 'w5': 11}
cw = valeurs_de(vs, 2, tw)
bons_w = [f"{x};{cw[f'b{j}']}" for j, x in enumerate([1, 2, 3, 4, 5], 1)]
carreaux = [f"{x};{tw[f'w{j}']}" for j, x in enumerate([1, 2, 3, 4, 5], 1)]
ecrire('11-placer-les-points-d-un-releve', modele(
    "Place les points d'un relevé dans un repère",
    "Relevé de cinq valeurs (plante semaine par semaine, température heure par heure, hauteur d'eau "
    "mois par mois) : placer les points, axes et graduations donnés (de 2, 1 ou 5)",
    3, vs,
    [spec("Plante : " + ', '.join(bons), 0, vs, th, bons, 'correct'),
     spec("Erreur : A avec semaine et hauteur échangées", 0, vs, th, echange, 'incorrect'),
     spec("Température : " + ', '.join(bons_t), 1, vs, tt, bons_t, 'correct'),
     spec("Bassin : " + ', '.join(bons_w), 2, vs, tw, bons_w, 'correct'),
     spec("Erreur : un carreau compté pour 1 cm", 2, vs, tw, carreaux, 'incorrect')],
    delay=240, options=None))

# ============================================================================
# 7-12 — CM1-122 : problèmes avec un tableau (Représenter des données, niveau 3)
# ============================================================================

v1 = variation(
    "Voici les prix d'entrée au cinéma.\n\n| | Adulte | Enfant |\n|---|---|---|\n"
    "| Prix d'une entrée | ${{A}}$ € | ${{E}}$ € |\n\n"
    "Une famille de ${{a}}$ adulte{{if:a>1|s|}} et ${{b}}$ enfants va au cinéma. Combien paie-t-elle "
    "en tout ?\n\n$?$ €",
    [var('A', '8..14'), var('E', '4..7'), var('a', '1..2'), var('b', '2..4'),
     var('pa', 'eval:a*A'), var('pb', 'eval:b*E'), var('n', 'eval:pa+pb')],
    ['{{n}}'],
    ["Les adultes : ${{a}} \\times {{A}} = {{pa}}$ €.",
     "Les enfants : ${{b}} \\times {{E}} = {{pb}}$ €.",
     "En tout : ${{pa}} + {{pb}} = " + col('{{n}}') + "$ €."])
JOURS = ['Lundi', 'Mardi', 'Jeudi', 'Vendredi']
v2 = variation(
    "Ce tableau donne le nombre de repas servis à la cantine.\n\n"
    "```tableau-croise\nlignes: Filles ; Garçons\ncolonnes: " + ' ; '.join(JOURS)
    + "\nFilles = {{f1}} ; {{f2}} ; {{f3}} ; {{f4}}\nGarçons = {{g1}} ; {{g2}} ; {{g3}} ; {{g4}}\n"
      "coin: Élèves \\ Jour\ntotaux: non\n```\n\n"
      "Combien de repas a-t-on servis de plus le lundi que le mardi ?\n\n$?$ repas de plus",
    [var(f'f{j}', '40..150') for j in range(1, 5)] + [var(f'g{j}', '40..150') for j in range(1, 5)]
    + [var('x', 'eval:f1+g1'), var('y', 'eval:f2+g2'), var('d', 'eval:x-y')],
    ['{{d}}'],
    ["Le lundi : ${{f1}} + {{g1}} = {{x}}$ repas.",
     "Le mardi : ${{f2}} + {{g2}} = {{y}}$ repas.",
     "L'écart : ${{x}} - {{y}} = " + col('{{d}}') + "$ repas de plus le lundi."],
    conditions=['x > y'])
CLASSES = ['CP', 'CE1', 'CE2', 'CM1', 'CM2']
v3 = variation(
    "Ce tableau donne le nombre d'élèves de l'école.\n\n"
    "```tableau-croise\nlignes: " + ' ; '.join(CLASSES) + "\ncolonnes: Filles ; Garçons\n"
    + '\n'.join(f'{c} = {{{{f{j}}}}} ; {{{{g{j}}}}}' for j, c in enumerate(CLASSES, 1))
    + "\ncoin: Classe \\ Élèves\ntotaux: non\n```\n\n"
      "Pour la fête de l'école, chaque fille reçoit ${{p}}$ rubans. Combien de rubans faut-il en "
      "tout ?\n\n$?$ rubans",
    [var(f'f{j}', '8..16') for j in range(1, 6)] + [var(f'g{j}', '8..16') for j in range(1, 6)]
    + [var('p', '2..5'), var('s', 'eval:f1+f2+f3+f4+f5'), var('n', 'eval:s*p')],
    ['{{n}}'],
    ["D'abord le nombre de filles : la colonne « Filles », ${{f1}} + {{f2}} + {{f3}} + {{f4}} + "
     "{{f5}} = {{s}}$.",
     "Chaque fille reçoit ${{p}}$ rubans : ${{s}} \\times {{p}} = " + col('{{n}}') + "$ rubans."])
vs = [v1, v2, v3]
ecrire('12-problemes-avec-un-tableau', modele(
    "Résous un problème avec un tableau",
    "En deux étapes : le prix d'une famille au cinéma (tableau des prix), combien de repas de plus "
    "un jour que l'autre (double entrée), le nombre de rubans pour toutes les filles de l'école",
    3, vs,
    [spec("2 × 12 + 3 × 6 = 42", 0, vs, {'A': 12, 'E': 6, 'a': 2, 'b': 3}, ['42'], 'correct'),
     spec("Erreur : un adulte et un enfant (18)", 0, vs, {'A': 12, 'E': 6, 'a': 2, 'b': 3}, ['18'],
          'incorrect'),
     spec("Lundi 215 − mardi 187 = 28", 1, vs,
          {'f1': 112, 'f2': 98, 'f3': 125, 'f4': 87, 'g1': 103, 'g2': 89, 'g3': 96, 'g4': 119},
          ['28'], 'correct'),
     spec("Erreur : les filles seulement (14)", 1, vs,
          {'f1': 112, 'f2': 98, 'f3': 125, 'f4': 87, 'g1': 103, 'g2': 89, 'g3': 96, 'g4': 119},
          ['14'], 'incorrect'),
     spec("60 filles × 3 = 180", 2, vs,
          {'f1': 12, 'f2': 10, 'f3': 14, 'f4': 11, 'f5': 13, 'g1': 9, 'g2': 15, 'g3': 12, 'g4': 10,
           'g5': 14, 'p': 3}, ['180'], 'correct'),
     spec("Erreur : tous les élèves × 3", 2, vs,
          {'f1': 12, 'f2': 10, 'f3': 14, 'f4': 11, 'f5': 13, 'g1': 9, 'g2': 15, 'g3': 12, 'g4': 10,
           'g5': 14, 'p': 3}, ['360'], 'incorrect')],
    delay=180))

# ============================================================================
# 7-13 — CM1-122 : problèmes avec un diagramme ou une courbe (niveau 3)
# ============================================================================

JOURS_K = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi']
v1 = variation(
    "Ce diagramme donne le nombre de billets de tombola vendus chaque jour de la semaine.\n\n"
    "```barres\ntitre: Billets vendus\naxes: Jour ; Billets\n"
    + '\n'.join(f'{j} = {{{{a{n}}}}}' for n, j in enumerate(JOURS_K, 1))
    + "\naxe: 0 à 100, de 10 en 10\n```\n\n"
      "Un billet coûte ${{p}}$ €. Combien d'euros ont rapporté les billets du jeudi et du vendredi ?"
      "\n\n$?$ €",
    [var(f'u{n}', '1..10') for n in range(1, 6)] + [var(f'a{n}', f'eval:10*u{n}') for n in range(1, 6)]
    + [var('p', '2..5'), var('s', 'eval:a4+a5'), var('n', 'eval:s*p')],
    ['{{n}}'],
    ["Les billets du jeudi et du vendredi : ${{a4}} + {{a5}} = {{s}}$ billets.",
     "Chaque billet rapporte ${{p}}$ € : ${{s}} \\times {{p}} = " + col('{{n}}') + "$ €."])
v2 = variation(
    "Le club a vendu ${{T}}$ places de spectacle en quatre mois. Le diagramme montre les trois "
    "premiers mois seulement.\n\n"
    "```barres\ntitre: Places vendues\naxes: Mois ; Places\nJanvier = {{a}}\nFévrier = {{b}}\n"
    "Mars = {{c}}\naxe: 0 à 200, de 20 en 20\n```\n\n"
    "Combien de places a-t-on vendues en avril ?\n\n$?$ places",
    [var('ua', '2..10'), var('ub', '2..10'), var('uc', '2..10'), var('d', '15..190'),
     var('a', 'eval:20*ua'), var('b', 'eval:20*ub'), var('c', 'eval:20*uc'),
     var('s', 'eval:a+b+c'), var('T', 'eval:s+d')],
    ['{{d}}'],
    ["Les trois mois du diagramme : ${{a}} + {{b}} + {{c}} = {{s}}$ places.",
     "Avril : ce qui manque pour aller à ${{T}}$, ${{T}} - {{s}} = " + col('{{d}}') + "$ places."])
v3 = variation(
    "On a relevé la température à $8$ h, $10$ h et $12$ h.\n\n"
    + courbe_temperatures([8, 10, 12])
    + "\n\nEntre $8$ h et $12$ h, la température a monté. Si elle monte encore d'autant entre $12$ h "
      "et $16$ h, quelle température fera-t-il à $16$ h ?\n\n$?$ °C",
    [var('u0', '1..5'), var('d1', '1..3'), var('d2', '1..3'),
     var('t0', 'eval:2*u0'), var('t1', 'eval:t0+2*d1'), var('t2', 'eval:t1+2*d2'),
     var('m', 'eval:t2-t0'), var('n', 'eval:t2+m')],
    ['{{n}}'],
    ["On lit : $8$ h, ${{t0}}$ °C ; $12$ h, ${{t2}}$ °C. La hausse : ${{t2}} - {{t0}} = {{m}}$ °C.",
     "Encore ${{m}}$ °C de plus : ${{t2}} + {{m}} = " + col('{{n}}') + "$ °C à $16$ h."])
vs = [v1, v2, v3]
ecrire('13-problemes-avec-un-diagramme-ou-une-courbe', modele(
    "Résous un problème avec un diagramme ou une courbe",
    "En deux étapes : la recette de deux jours de tombola (barres), le mois qui manque au diagramme "
    "par le total (barres), la température prévue si la hausse continue (courbe)",
    3, vs,
    [spec("(70 + 40) × 3 = 330", 0, vs, {'u1': 5, 'u2': 8, 'u3': 6, 'u4': 7, 'u5': 4, 'p': 3}, ['330'],
          'correct'),
     spec("Erreur : jeudi seulement (210)", 0, vs, {'u1': 5, 'u2': 8, 'u3': 6, 'u4': 7, 'u5': 4, 'p': 3},
          ['210'], 'incorrect'),
     spec("Avril : 475 − 360 = 115", 1, vs, {'ua': 6, 'ub': 8, 'uc': 4, 'd': 115}, ['115'], 'correct'),
     spec("Erreur : le total", 1, vs, {'ua': 6, 'ub': 8, 'uc': 4, 'd': 115}, ['475'], 'incorrect'),
     spec("8 h 6 °C, 12 h 14 °C : 14 + 8 = 22", 2, vs, {'u0': 3, 'd1': 2, 'd2': 2}, ['22'], 'correct'),
     spec("Erreur : la hausse seule (8)", 2, vs, {'u0': 3, 'd1': 2, 'd2': 2}, ['8'], 'incorrect')],
    delay=180))

# ============================================================================

os.makedirs(DOSSIER, exist_ok=True)
for nom, mod in MODELES.items():
    with open(os.path.join(DOSSIER, nom + '.json'), 'w', encoding='utf-8') as f:
        json.dump(mod, f, ensure_ascii=False, indent='\t')
        f.write('\n')
print(f'{len(MODELES)} modèles écrits dans {DOSSIER}')
