"""Écrit les 5 modèles du lot 12 du CM2 (suites et motifs) dans scripts/questions/cm2-12/.

Phase 0 validée par David le 2026-11-19 (§ 19 et 19.1 du journal
`docs/archive/wip/questions-cm2-progress.md`, « je te suis ») : 5 modèles (CM2-068, 069, 070), tous au
niveau 1 de « suites de motifs » ; 12-1 V2 avec des décimaux (deux chiffres après la virgule au
plus) ; 12-5 en case « choix », une seule réponse juste.

Bornes (`cycle3.json`, Exemples de réussite CM2 2025 p. 15-16) : 068, trois termes suivants et
terme de rang éloigné pour une suite à pas constant (« 100e terme de 5 ; 8 ; 11 ») ; 070, relation
avec l'étape précédente ou directement avec le rang.

Pièges (relus dans le journal) : aucune `{{if}}` dans une réponse attendue ; `i` et `e` jamais
comme variables ; case « choix » : réponse = indice d'origine, la bonne en premier, mélangée à
l'affichage ; « de » élidé devant une voyelle (« d'allumettes », § 19.1 e).

    python3 -I docs/wip/questions/lot-cm2-12.py scripts/questions/cm2-12
"""
import json
import os
import sys

DOSSIER = sys.argv[1]
ENTIERS = {'constraints': {'spacesFromFourDigits': True}}
DECIMAUX = {'constraints': {'spacesFromFourDigits': True, 'zeros': 'off'}}
VIRGULE_EXIGEE = {'pattern': 'a:number'}
MODELES = {}

# ---- Gabarits (comme lot-cm2-11b.py et lot-cm1-6ter.py) ----


def spec(desc, vi, variables, answers, status):
    return {'description': desc, 'variationIndex': vi,
            'variables': {k: str(x) for k, x in variables.items()},
            'answers': answers if isinstance(answers, list) else [answers],
            'expected': {'status': status}}


def modele(title, description, variations, specs, options=ENTIERS, delay=120):
    # niveau 1 de « suites de motifs » (§ 19.1 a) ; rangement et tag posés par la migration
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


def de(mot):
    """« de » élidé devant une voyelle ou un h : « d'allumettes », « de jetons »."""
    return ("d'" if mot[:1].lower() in 'aeiouyhéèêàâîôû' else 'de ') + mot


def suite(termes):
    return '$$' + ' \\ ;\\  '.join(termes) + ' \\ ;\\  \\ldots$$'


# ============================================================================
# Figures : motifs dessinés en trois étapes
# ============================================================================


def jeton(nom, x, y, couleur):
    return [f'{nom} = point({x}, {y}, visible=faux)',
            f'cercle({nom}, rayon=0.3, couleur="{couleur}", remplissage="{couleur}", opacite_fond=1)']


def allumette(a, b):
    return f'segment({a}, {b}, couleur="marron", epaisseur=3)'


def etiquettes(centres, y):
    return [f'texte({c}, {y}, "Étape {s + 1}")' for s, c in enumerate(centres)]


def figure(fenetre, description, lignes, taille=None):
    tete = ['```figure', 'fenetre: ' + fenetre]
    if taille:
        tete.append('taille: ' + taille)
    return '\n'.join(tete + ['description: ' + description, '---'] + lignes + ['```'])


def motif_croix():
    """Étape n : un jeton au centre et quatre bras de n jetons (5, 9, 13 jetons)."""
    lignes = []
    centres = [1, 6.5, 14]  # 1,5 d'écart entre deux croix
    for s, c in enumerate(centres):
        n = s + 1
        lignes += jeton(f'X{s}O', c, 0, 'rouge')
        for k in range(1, n + 1):
            for nom, dx, dy in (('D', k, 0), ('G', -k, 0), ('H', 0, k), ('B', 0, -k)):
                lignes += jeton(f'X{s}{nom}{k}', c + dx, dy, 'rouge')
    lignes += etiquettes(centres, -4)
    return figure('-0.7 ; 17.7 ; -4.6 ; 3.7',
                  'Trois étapes d\'un motif de jetons en croix : un jeton au centre et quatre bras de'
                  ' 1, 2 puis 3 jetons, soit 5, 9 puis 13 jetons.', lignes, 'grande')


def carreau(nom, x, y):
    return [f'{nom}a = point({x}, {y}, visible=faux)',
            f'{nom}b = point({x + 1}, {y}, visible=faux)',
            f'{nom}c = point({x + 1}, {y + 1}, visible=faux)',
            f'{nom}d = point({x}, {y + 1}, visible=faux)',
            f'polygone({nom}a, {nom}b, {nom}c, {nom}d, couleur="noir", remplissage="jaune",'
            ' opacite_fond=0.6)']


def motif_l():
    """Étape n : un L de carreaux, colonne de n + 1 carreaux et n carreaux à droite (3, 5, 7)."""
    lignes = []
    debuts = [0, 3, 7]
    for s, x0 in enumerate(debuts):
        n = s + 1
        for r in range(n + 1):
            lignes += carreau(f'L{s}V{r}', x0, r)
        for k in range(1, n + 1):
            lignes += carreau(f'L{s}H{k}', x0 + k, 0)
    lignes += etiquettes([1, 4.5, 9], -0.9)
    return figure('-0.5 ; 11.5 ; -1.5 ; 4.5',
                  'Trois étapes d\'un motif de carreaux en forme de L : 3, 5 puis 7 carreaux.',
                  lignes)


def motif_rectangle():
    """Étape n : un rectangle de n lignes de n + 1 jetons (2, 6, 12 jetons)."""
    lignes = []
    debuts = [0, 2.5, 6]
    for s, x0 in enumerate(debuts):
        n = s + 1
        for r in range(n):
            for k in range(n + 1):
                lignes += jeton(f'R{s}{r}{k}', x0 + k, r, 'bleu')
    lignes += etiquettes([0.5, 3.5, 7.5], -1)
    return figure('-0.7 ; 9.7 ; -1.6 ; 2.7',
                  'Trois étapes d\'un motif de jetons en rectangle : 1 ligne de 2 jetons, 2 lignes'
                  ' de 3 jetons, puis 3 lignes de 4 jetons.', lignes)


def motif_carres():
    """Étape n : n carrés d'allumettes accolés en rangée (4, 7, 10 allumettes)."""
    lignes = []
    debuts = [0, 2.5, 6]
    for s, x0 in enumerate(debuts):
        n = s + 1
        for j in range(n + 1):
            lignes.append(f'C{s}B{j} = point({x0 + j}, 0, visible=faux)')
            lignes.append(f'C{s}H{j} = point({x0 + j}, 1, visible=faux)')
        for j in range(n):
            lignes.append(allumette(f'C{s}B{j}', f'C{s}B{j + 1}'))
            lignes.append(allumette(f'C{s}H{j}', f'C{s}H{j + 1}'))
        for j in range(n + 1):
            lignes.append(allumette(f'C{s}B{j}', f'C{s}H{j}'))
    lignes += etiquettes([0.5, 3.5, 7.5], -0.9)
    return figure('-0.5 ; 9.5 ; -1.5 ; 1.5',
                  'Trois étapes d\'un motif d\'allumettes : une rangée de 1, 2 puis 3 carrés accolés,'
                  ' soit 4, 7 puis 10 allumettes.', lignes)


def motif_etages():
    """Étape n : deux étages de n carrés d'allumettes (7, 12, 17 allumettes)."""
    lignes = []
    debuts = [0, 2.5, 6]
    for s, x0 in enumerate(debuts):
        n = s + 1
        for j in range(n + 1):
            for h in range(3):
                lignes.append(f'E{s}P{j}{h} = point({x0 + j}, {h}, visible=faux)')
        for h in range(3):
            for j in range(n):
                lignes.append(allumette(f'E{s}P{j}{h}', f'E{s}P{j + 1}{h}'))
        for j in range(n + 1):
            for h in range(2):
                lignes.append(allumette(f'E{s}P{j}{h}', f'E{s}P{j}{h + 1}'))
    lignes += etiquettes([0.5, 3.5, 7.5], -0.9)
    return figure('-0.5 ; 9.5 ; -1.5 ; 2.5',
                  'Trois étapes d\'un motif d\'allumettes : deux étages de 1, 2 puis 3 carrés'
                  ' accolés, soit 7, 12 puis 17 allumettes.', lignes)


def motif_triangles():
    """Étape n : bande de n triangles, pointe en haut puis en bas (3, 5, 7 allumettes)."""
    lignes = []
    debuts = [0, 1.75, 4]
    h = 0.87
    for s, x0 in enumerate(debuts):
        n = s + 1
        nb_bas = (n + 1) // 2 + 1
        nb_haut = n // 2 + 1
        for j in range(nb_bas):
            lignes.append(f'T{s}B{j} = point({x0 + j}, 0, visible=faux)')
        for j in range(nb_haut):
            lignes.append(f'T{s}H{j} = point({x0 + j + 0.5}, {h}, visible=faux)')
        for j in range(nb_bas - 1):
            lignes.append(allumette(f'T{s}B{j}', f'T{s}B{j + 1}'))
        for j in range(nb_haut - 1):
            lignes.append(allumette(f'T{s}H{j}', f'T{s}H{j + 1}'))
        sommets = []
        for j in range(nb_bas):
            sommets.append(f'T{s}B{j}')
            if j < nb_haut:
                sommets.append(f'T{s}H{j}')
        for j in range(n + 1):
            lignes.append(allumette(sommets[j], sommets[j + 1]))
    lignes += etiquettes([0.5, 2.75, 5.5], -0.9)
    return figure('-0.5 ; 7 ; -1.5 ; 1.4',
                  'Trois étapes d\'un motif d\'allumettes : une bande de 1, 2 puis 3 triangles'
                  ' accolés, soit 3, 5 puis 7 allumettes.', lignes)


# nom : (figure, objets, nombre à l'étape n (fonction de n en Python et en texte),
#        règle d'une étape à la suivante, pourquoi, lecture par le rang)
MOTIFS = {
    'croix': (motif_croix(), 'jetons', lambda n: 4 * n + 1, '4*{n}+1',
              'À chaque étape, on ajoute $4$ jetons.',
              'chaque bras gagne un jeton',
              '$1$ jeton au centre, puis $4$ bras de {n} jetons'),
    'l': (motif_l(), 'carreaux', lambda n: 2 * n + 1, '2*{n}+1',
          'À chaque étape, on ajoute $2$ carreaux.',
          'un carreau en haut de la colonne et un au bout de la ligne',
          '$1$ carreau dans le coin, puis $2$ branches de {n} carreaux'),
    'rectangle': (motif_rectangle(), 'jetons', lambda n: n * (n + 1), '{n}*({n}+1)',
                  'À chaque étape, on ajoute $2$ jetons de plus qu\'à l\'étape d\'avant.',
                  'l\'étape $n$ a $n$ lignes de $n + 1$ jetons',
                  '{n} lignes de {n1} jetons'),
    'carres': (motif_carres(), 'allumettes', lambda n: 3 * n + 1, '3*{n}+1',
               'À chaque étape, on ajoute $3$ allumettes.',
               'un carré de plus ne demande que $3$ allumettes : il prend un côté au carré d\'avant',
               '$1$ allumette au départ, puis $3$ allumettes par carré'),
    'etages': (motif_etages(), 'allumettes', lambda n: 5 * n + 2, '5*{n}+2',
               'À chaque étape, on ajoute $5$ allumettes.',
               'une colonne de deux carrés de plus demande $3$ allumettes couchées et $2$ debout',
               '$2$ allumettes debout au départ, puis $5$ allumettes par colonne'),
    'triangles': (motif_triangles(), 'allumettes', lambda n: 2 * n + 1, '2*{n}+1',
                  'À chaque étape, on ajoute $2$ allumettes.',
                  'un triangle de plus ne demande que $2$ allumettes : il prend un côté au triangle'
                  ' d\'avant',
                  '$1$ allumette au départ, puis $2$ allumettes par triangle'),
}


def nb(nom, n):
    """Nombre d'éléments à l'étape n (n entier) ; texte."""
    return str(MOTIFS[nom][2](n))


def nb_expr(nom, n):
    """Expression du nombre d'éléments à l'étape `n` (nom de variable) : « 3*s+1 »."""
    return MOTIFS[nom][3].format(n=n)


# ============================================================================
# 12-1 — CM2-068 : suite de nombres, les trois termes suivants
# ============================================================================

# nom : (termes 0 à 7 (expressions), nombre donné, variables, conditions, décimal ?)
SUITES = {
    'moins': ([f'u-{j}*a' for j in range(8)], 5,
              [var('u', '1000..9999'), var('a', '11..99')], None, False),
    'decimal': ([f'(25*s+{j}*p)/100' for j in range(8)], 5,
                [var('s', '4..40'), var('p', '25|50|75|150|250')], None, True),
    'ecart': ([f'u+{j * (j + 1) // 2}*a' for j in range(8)], 5,
              [var('u', '1..50'), var('a', '1..3')], None, False),
    'double': (['u', '2*u', '2*u+c', '4*u+2*c', '4*u+3*c', '8*u+6*c', '8*u+7*c', '16*u+14*c'], 5,
               [var('u', '5..20'), var('c', '1..9')], ['c != u'], False),
}

REGLE_SUITE = {
    'moins': 'On retire ${{a}}$ à chaque fois.',
    'decimal': 'On ajoute $' + evd('p/100') + '$ à chaque fois.',
    'ecart': 'L\'écart grandit : on ajoute ${{a}}$, puis $' + ev('2*a') + '$, puis $' + ev('3*a')
             + '$, et ainsi de suite.',
    'double': 'On multiplie par $2$, puis on ajoute ${{c}}$, et ainsi de suite.',
}


def terme(nom, j):
    termes, _, _, _, dec = SUITES[nom]
    return evd(termes[j]) if dec else ev(termes[j])


def pas(nom, j):
    """Le calcul qui mène du terme j au terme j + 1 : « 9 912 − 47 = »."""
    t = terme(nom, j)
    if nom == 'moins':
        return t + ' - {{a}} = '
    if nom == 'decimal':
        return t + ' + ' + evd('p/100') + ' = '
    if nom == 'ecart':
        return t + ' + ' + ev(f'{j + 1}*a') + ' = '
    return t + (' \\times 2 = ' if j % 2 == 0 else ' + {{c}} = ')


def suivants(nom):
    termes, donnes, variables, conditions, dec = SUITES[nom]
    enonce = ('Voici le début d\'une suite de nombres :\n\n'
              + suite([terme(nom, j) for j in range(donnes)])
              + '\n\nTrouve la règle, puis écris les trois nombres suivants.\n\n'
              + '\n\n'.join(str(r) + 'e nombre : $?$' for r in range(donnes + 1, donnes + 4)))
    etapes = ['**La règle.** ' + REGLE_SUITE[nom] + ' On le vérifie sur les nombres donnés : $'
              + pas(nom, 0) + terme(nom, 1) + '$, $' + pas(nom, 1) + terme(nom, 2) + '$.',
              '**Les trois suivants.** '
              + ' ; '.join('$' + pas(nom, j) + col(terme(nom, j + 1)) + '$'
                           for j in range(donnes - 1, donnes + 2)) + '.']
    reponses = [decimal(evd(termes[j])) if dec else ev(termes[j])
                for j in range(donnes, donnes + 3)]
    return variation(enonce, variables, reponses, etapes, conditions)


MOINS = {'u': 2000, 'a': 47}           # 2000 ; 1953 ; 1906 ; 1859 ; 1812 → 1765 ; 1718 ; 1671
DEC = {'s': 8, 'p': 25}                # 2 ; 2,25 ; 2,5 ; 2,75 ; 3 → 3,25 ; 3,5 ; 3,75
ECART = {'u': 4, 'a': 2}               # 4 ; 6 ; 10 ; 16 ; 24 → 34 ; 46 ; 60
DOUBLE = {'u': 6, 'c': 3}              # 6 ; 12 ; 15 ; 30 ; 33 → 66 ; 69 ; 138
MODELES['01-suite-trouver-la-regle-et-continuer'] = modele(
    'Suite de nombres : trouver la règle et continuer',
    'Trouver la règle d\'une suite (on retire un nombre, on ajoute un décimal, un écart qui grandit,'
    ' × 2 puis + c en alternance) et écrire les trois termes suivants',
    [suivants('moins'), suivants('decimal'), suivants('ecart'), suivants('double')],
    [spec('− 47 : 1 765 ; 1 718 ; 1 671', 0, MOINS, ['1\\,765', '1\\,718', '1\\,671'], 'correct'),
     spec('Erreur : + 47 (sens de la suite)', 0, MOINS, ['1\\,859', '1\\,906', '1\\,953'],
          'incorrect'),
     spec('+ 0,25 : 3,25 ; 3,5 ; 3,75', 1, DEC, ['3,25', '3,5', '3,75'], 'correct'),
     spec('Erreur : 3,30 ; 3,55 ; 3,80 (3 + 0,25 = 3,30)', 1, DEC, ['3,3', '3,55', '3,8'],
          'incorrect'),
     spec('écart + 2, + 4… : 34 ; 46 ; 60', 2, ECART, ['34', '46', '60'], 'correct'),
     spec('Erreur : + 8 à chaque fois', 2, ECART, ['32', '40', '48'], 'incorrect'),
     spec('× 2 puis + 3 : 66 ; 69 ; 138', 3, DOUBLE, ['66', '69', '138'], 'correct'),
     spec('Erreur : × 2 à chaque fois', 3, DOUBLE, ['66', '132', '264'], 'incorrect')],
    options=DECIMAUX, delay=150)

# ============================================================================
# 12-2 — CM2-068 : suite à pas constant, un terme éloigné
# ============================================================================

DEBUT_PAS = ('Voici le début d\'une suite de nombres. On ajoute toujours le même nombre pour passer'
             ' d\'un nombre au suivant.\n\n'
             + suite([ev(f'u+{j}*a') for j in range(4)]))
VARS_PAS = [var('u', '1..20'), var('a', '2..12')]
REGLE_PAS = ('**La règle.** On ajoute ${{a}}$ à chaque fois : ${{u}} + {{a}} = ' + ev('u+a')
             + '$, $' + ev('u+a') + ' + {{a}} = ' + ev('u+2*a') + '$.')


def rang_eloigne(rang, var_rang=None):
    """Le nombre de rang `rang` (texte : « 100 » ou « {{r}} ») ; `var_rang` : ajout aux variables."""
    r = rang if var_rang is None else 'r'
    enonce = (DEBUT_PAS + '\n\nQuel est le ' + rang + 'e nombre de cette suite ?\n\n$?$')
    etapes = [REGLE_PAS,
              '**Jusqu\'au ' + rang + 'e nombre.** Du 1er au ' + rang + 'e nombre, on avance de $'
              + ev(f'{r}-1') + '$ pas de ${{a}}$ : $' + ev(f'{r}-1') + ' \\times {{a}} = '
              + ev(f'({r}-1)*a') + '$.',
              '$${{u}} + ' + ev(f'({r}-1)*a') + ' = ' + col(ev(f'u+({r}-1)*a')) + '$$']
    variables = VARS_PAS + ([var_rang] if var_rang else [])
    return variation(enonce, variables, [ev(f'u+({r}-1)*a')], etapes)


def quel_rang():
    enonce = (DEBUT_PAS + '\n\nÀ quel rang trouve-t-on le nombre $' + ev('u+(r-1)*a')
              + '$ dans cette suite ?\n\nC\'est le $?$e nombre.')
    etapes = [REGLE_PAS,
              '**Combien de pas depuis le 1er nombre ?** $' + ev('u+(r-1)*a') + ' - {{u}} = '
              + ev('(r-1)*a') + '$, et $' + ev('(r-1)*a') + ' \\div {{a}} = ' + ev('r-1')
              + '$ : on a avancé de $' + ev('r-1') + '$ pas.',
              'Le 1er nombre, plus $' + ev('r-1') + '$ pas : c\'est le $' + col('{{r}}')
              + '$e nombre.']
    return variation(enonce, VARS_PAS + [var('r', '15..60')], ['{{r}}'], etapes)


P5 = {'u': 5, 'a': 3}                  # 5 ; 8 ; 11 (l'exemple du BO) : 100e = 302
MODELES['02-suite-a-pas-constant-un-terme-eloigne'] = modele(
    'Suite à pas constant : un terme éloigné',
    'Suite où l\'on ajoute toujours le même nombre : le 100e nombre, le 20e, 30e ou 50e, ou le rang'
    ' d\'un nombre donné',
    [rang_eloigne('100'), rang_eloigne('{{r}}', var('r', '20|30|50')), quel_rang()],
    [spec('100e de 5 ; 8 ; 11 : 302', 0, P5, '302', 'correct'),
     spec('Erreur : 100 pas au lieu de 99 (305)', 0, P5, '305', 'incorrect'),
     spec('Erreur : 100 × 3 (300)', 0, P5, '300', 'incorrect'),
     spec('30e de 5 ; 8 ; 11 : 92', 1, {**P5, 'r': 30}, '92', 'correct'),
     spec('Erreur : 30 pas au lieu de 29 (95)', 1, {**P5, 'r': 30}, '95', 'incorrect'),
     spec('rang de 62 dans 5 ; 8 ; 11 : 20', 2, {**P5, 'r': 20}, '20', 'correct'),
     spec('Erreur : le nombre de pas (19)', 2, {**P5, 'r': 20}, '19', 'incorrect')],
    delay=150)

# ============================================================================
# 12-3 — CM2-069 : motif évolutif, les étapes suivantes
# ============================================================================


def ajout(nom, s):
    """Ce qu'on ajoute pour passer à l'étape s."""
    return str(MOTIFS[nom][2](s) - MOTIFS[nom][2](s - 1))


def etapes_suivantes(nom):
    fig, objets, _, _, regle, pourquoi, _ = MOTIFS[nom]
    enonce = ('Voici les trois premières étapes d\'un motif ' + de(objets) + '.\n\n' + fig
              + '\n\nCombien ' + de(objets) + ' y aura-t-il aux trois étapes suivantes ?\n\n'
              + '\n\n'.join('Étape ' + str(s) + ' : $?$ ' + objets for s in (4, 5, 6)))
    etapes = ['**On compte.** Étape 1 : $' + nb(nom, 1) + '$ ; étape 2 : $' + nb(nom, 2)
              + '$ ; étape 3 : $' + nb(nom, 3) + '$.',
              '**La règle.** ' + regle + ' Pourquoi : ' + pourquoi + '.',
              '**Les trois suivantes.** '
              + ' ; '.join('étape ' + str(s) + ' : $' + nb(nom, s - 1) + ' + ' + ajout(nom, s)
                           + ' = ' + col(nb(nom, s)) + '$' for s in (4, 5, 6)) + '.']
    return variation(enonce, [], [nb(nom, s) for s in (4, 5, 6)], etapes)


MODELES['03-motif-les-etapes-suivantes'] = modele(
    'Motif évolutif : les étapes suivantes',
    'Motif dessiné en trois étapes, qui grandit dans plusieurs sens (croix de jetons, L de'
    ' carreaux, rectangle de jetons, deux étages de carrés d\'allumettes) : le nombre d\'éléments'
    ' aux étapes 4, 5 et 6',
    [etapes_suivantes('croix'), etapes_suivantes('l'), etapes_suivantes('rectangle'),
     etapes_suivantes('etages')],
    [spec('Croix : 17 ; 21 ; 25', 0, {}, ['17', '21', '25'], 'correct'),
     spec('Erreur : + 1 par étape (14 ; 15 ; 16)', 0, {}, ['14', '15', '16'], 'incorrect'),
     spec('L : 9 ; 11 ; 13', 1, {}, ['9', '11', '13'], 'correct'),
     spec('Erreur : + 1 par étape (8 ; 9 ; 10)', 1, {}, ['8', '9', '10'], 'incorrect'),
     spec('Rectangle : 20 ; 30 ; 42', 2, {}, ['20', '30', '42'], 'correct'),
     spec('Erreur : + 6 à chaque fois (18 ; 24 ; 30)', 2, {}, ['18', '24', '30'], 'incorrect'),
     spec('Deux étages : 22 ; 27 ; 32', 3, {}, ['22', '27', '32'], 'correct'),
     spec('Erreur : 7 par colonne (24 ; 31 ; 38)', 3, {}, ['24', '31', '38'], 'incorrect')],
    delay=180)

# ============================================================================
# 12-4 — CM2-070 : motif évolutif, une étape lointaine
# ============================================================================


def par_le_rang(nom, n):
    """Lecture par le rang à l'étape `n` (variable) : « 1 jeton au centre, puis 4 bras de s jetons »."""
    return MOTIFS[nom][6].format(n='${{' + n + '}}$', n1='$' + ev(n + '+1') + '$')


CALCUL = {
    'carres': ('3 \\times {n} + 1', '3*{n}+1'),
    'croix': ('4 \\times {n} + 1', '4*{n}+1'),
    'triangles': ('2 \\times {n} + 1', '2*{n}+1'),
    'etages': ('5 \\times {n} + 2', '5*{n}+2'),
}


def etape_lointaine(nom):
    fig, objets, _, _, regle, pourquoi, _ = MOTIFS[nom]
    texte, expr = CALCUL[nom]
    enonce = ('Voici les trois premières étapes d\'un motif ' + de(objets) + '.\n\n' + fig
              + '\n\nCombien ' + de(objets) + ' y aura-t-il à l\'étape ${{s}}$ ?\n\n$?$ ' + objets)
    etapes = ['**La règle.** $' + nb(nom, 1) + '$, puis $' + nb(nom, 2) + '$, puis $' + nb(nom, 3)
              + '$ : ' + regle[0].lower() + regle[1:] + ' Pourquoi : ' + pourquoi + '.',
              '**Directement par le numéro de l\'étape.** À l\'étape ${{s}}$ : '
              + par_le_rang(nom, 's') + '.',
              '$$' + texte.format(n='{{s}}') + ' = ' + col(ev(expr.format(n='s'))) + '$$',
              'On vérifie à l\'étape $3$ : $' + texte.format(n='3') + ' = ' + nb(nom, 3) + '$.']
    return variation(enonce, [var('s', '10..60')], [ev(nb_expr(nom, 's'))], etapes)


def quelle_etape():
    nom = 'carres'
    fig, objets, _, _, regle, pourquoi, _ = MOTIFS[nom]
    enonce = ('Voici les trois premières étapes d\'un motif ' + de(objets) + '.\n\n' + fig
              + '\n\nÀ quelle étape faut-il $' + ev('3*s+1') + '$ allumettes ?\n\nÉtape $?$')
    etapes = ['**La règle.** ' + regle + ' Pourquoi : ' + pourquoi + '.',
              '**Par le numéro de l\'étape.** À l\'étape $n$, il faut $3 \\times n + 1$ allumettes.',
              'On enlève l\'allumette du départ : $' + ev('3*s+1') + ' - 1 = ' + ev('3*s')
              + '$ ; puis $' + ev('3*s') + ' \\div 3 = ' + col('{{s}}') + '$ carrés.',
              'C\'est l\'étape $' + col('{{s}}') + '$. On vérifie : $3 \\times {{s}} + 1 = '
              + ev('3*s+1') + '$.']
    return variation(enonce, [var('s', '10..60')], ['{{s}}'], etapes)


MODELES['04-motif-une-etape-lointaine'] = modele(
    'Motif évolutif : une étape lointaine',
    'Motif dessiné en trois étapes (carrés ou triangles d\'allumettes accolés, croix de jetons) :'
    ' le nombre d\'éléments à une étape lointaine, ou l\'étape qui demande un nombre donné'
    ' d\'allumettes',
    [etape_lointaine('carres'), etape_lointaine('croix'), etape_lointaine('triangles'),
     quelle_etape()],
    [spec('Carrés, étape 25 : 76', 0, {'s': 25}, '76', 'correct'),
     spec('Erreur : 3 × 25 sans le + 1 (75)', 0, {'s': 25}, '75', 'incorrect'),
     spec('Erreur : 4 × 25 (100)', 0, {'s': 25}, '100', 'incorrect'),
     spec('Croix, étape 30 : 121', 1, {'s': 30}, '121', 'correct'),
     spec('Erreur : 4 × 30 sans le centre (120)', 1, {'s': 30}, '120', 'incorrect'),
     spec('Triangles, étape 40 : 81', 2, {'s': 40}, '81', 'correct'),
     spec('Erreur : 3 × 40 (120)', 2, {'s': 40}, '120', 'incorrect'),
     spec('Quelle étape pour 61 allumettes : 20', 3, {'s': 20}, '20', 'correct'),
     spec('Erreur : 61 ÷ 3 arrondi (21)', 3, {'s': 20}, '21', 'incorrect')],
    delay=180)

# ============================================================================
# 12-5 — CM2-070 : motif évolutif, le calcul pour l'étape n (case « choix »)
# ============================================================================

# la bonne en premier ; les leurres sont les erreurs typiques, jamais égaux au bon pour s ≥ 2
CHOIX_CALCUL = {
    'carres': ['3 \\times {{s}} + 1', '4 \\times {{s}}', '3 \\times {{s}}', '{{s}} + 3'],
    'croix': ['4 \\times {{s}} + 1', '4 \\times {{s}}', '5 \\times {{s}}', '{{s}} + 4'],
    'triangles': ['2 \\times {{s}} + 1', '3 \\times {{s}}', '2 \\times {{s}}', '{{s}} + 2'],
    'etages': ['5 \\times {{s}} + 2', '7 \\times {{s}}', '5 \\times {{s}}', '{{s}} + 5'],
}


def choisir_calcul(nom):
    fig, objets, _, _, regle, pourquoi, _ = MOTIFS[nom]
    texte, expr = CALCUL[nom]
    enonce = ('Voici les trois premières étapes d\'un motif ' + de(objets) + '.\n\n' + fig
              + '\n\nQuel calcul donne le nombre ' + de(objets) + ' à l\'étape ${{s}}$ ?\n\n'
              + choix(['$' + c + '$' for c in CHOIX_CALCUL[nom]]))
    etapes = ['**La règle.** ' + regle + ' Pourquoi : ' + pourquoi + '.',
              '**Par le numéro de l\'étape.** À l\'étape ${{s}}$ : ' + par_le_rang(nom, 's')
              + ', soit $' + col(CHOIX_CALCUL[nom][0]) + ' = ' + ev(expr.format(n='s')) + '$.',
              'On vérifie à l\'étape $3$ : $' + texte.format(n='3') + ' = ' + nb(nom, 3)
              + '$, le nombre compté sur le dessin.']
    return variation(enonce, [var('s', '20..60')], ['0'], etapes)


MODELES['05-motif-le-calcul-pour-une-etape'] = modele(
    'Motif évolutif : le calcul pour l\'étape n',
    'Motif dessiné en trois étapes : choisir, parmi quatre, le calcul qui donne le nombre'
    ' d\'éléments à une étape lointaine (carrés, triangles, deux étages d\'allumettes, croix de'
    ' jetons)',
    [choisir_calcul('carres'), choisir_calcul('croix'), choisir_calcul('triangles'),
     choisir_calcul('etages')],
    [spec('Carrés : 3 × s + 1', 0, {'s': 50}, '0', 'correct'),
     spec('Erreur : 3 × s (le + 1 oublié)', 0, {'s': 50}, '2', 'incorrect'),
     spec('Croix : 4 × s + 1', 1, {'s': 50}, '0', 'correct'),
     spec('Erreur : 4 × s (le centre oublié)', 1, {'s': 50}, '1', 'incorrect'),
     spec('Triangles : 2 × s + 1', 2, {'s': 50}, '0', 'correct'),
     spec('Erreur : 3 × s (3 allumettes par triangle)', 2, {'s': 50}, '1', 'incorrect'),
     spec('Deux étages : 5 × s + 2', 3, {'s': 50}, '0', 'correct'),
     spec('Erreur : 7 × s (7 allumettes par colonne)', 3, {'s': 50}, '1', 'incorrect')],
    delay=120)

os.makedirs(DOSSIER, exist_ok=True)
for nom, mod in MODELES.items():
    with open(f'{DOSSIER}/{nom}.json', 'w') as fh:
        json.dump(mod, fh, ensure_ascii=False, indent='\t')
        fh.write('\n')
print(len(MODELES), 'modèles écrits')
