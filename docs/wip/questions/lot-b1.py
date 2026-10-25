"""Écrit les 3 modèles du lot B1 (tableaux, CP) dans scripts/questions/cp-b1/."""
import json
import sys
from itertools import product

DOSSIER = sys.argv[1]

# Décisions de David le 2026-10-25 (journal docs/wip/questions-progress.md § 4 undecies).
# Le moteur ne mélange pas une liste : chaque place tire sa forme (s1, s2…), et un compte est
# une somme d'indicatrices polynomiales (Lagrange), calculée par eval.
# Cases des tableaux en `$?$` (champ MathLive étroit) : un `[_]` (champ texte) déborde au téléphone.


def spec(desc, vi, variables_, status, answers):
    return {'description': desc, 'variationIndex': vi, 'variables': variables_,
            'expected': {'status': status}, 'answers': answers}


def modele(title, description, subdomain, variations, specs):
    # theme / domain / subdomain : anciennes colonnes, remplies pour create-questions ; le
    # rangement (nœud du point) est posé par la migration
    return {'title': title, 'description': description, 'grades': ['CP'],
            'theme': 'Statistiques', 'domain': 'Représenter des données',
            'subdomain': subdomain, 'level': 1, 'delay': 90, 'status': 'draft',
            'variations': variations, 'testSpecs': specs}


def indicatrice(var, k, valeurs):
    """Polynôme qui vaut 1 si var = k et 0 pour les autres valeurs (Lagrange)."""
    num = '*'.join(f'({var}-{j})' for j in valeurs if j != k)
    den = 1
    for j in valeurs:
        if j != k:
            den *= k - j
    return f'{num}/({den})'


def forme(var, symboles):
    """Le symbole tiré à cette place : {{if:s==1|●|{{if:s==2|▲|■}}}}."""
    texte = symboles[-1]
    for k in range(len(symboles) - 1, 0, -1):
        texte = f'{{{{if:{var}=={k}|{symboles[k - 1]}|{texte}}}}}'
    return texte


def tableau(lignes):
    entete, *corps = lignes
    sep = '|' + '|'.join('---' for _ in entete) + '|'
    rows = ['| ' + ' | '.join(entete) + ' |', sep]
    rows += ['| ' + ' | '.join(ligne) + ' |' for ligne in corps]
    return '\n'.join(rows)


# --- CP-068 : compter des formes et ranger les nombres dans un tableau ---------------------


def compter(nb_objets, symboles, noms):
    valeurs = list(range(1, len(symboles) + 1))
    places = [f's{i}' for i in range(1, nb_objets + 1)]
    variables = [{'name': p, 'expression': f'1..{len(symboles)}'} for p in places]
    for k, nom in zip(valeurs, noms):
        somme = '+'.join(indicatrice(p, k, valeurs) for p in places)
        variables.append({'name': nom, 'expression': f'eval:{somme}'})
    file = ' '.join(forme(p, symboles) for p in places)
    lignes = [['Forme', 'Nombre']] + [[s, '$?$'] for s in symboles]
    comptes = ', '.join(f'${{{{{n}}}}}$ {s}' for n, s in zip(noms, symboles))
    total = '+'.join(f'{{{{{n}}}}}' for n in noms)
    return {
        'statement': 'Compte chaque forme et écris le nombre dans le tableau.\n\n' + file
        + '\n\n' + tableau(lignes),
        'variables': variables,
        'conditions': [],
        'blanks': [{'expectedAnswer': f'{{{{{n}}}}}'} for n in noms],
        'correction': {'steps': [
            f'On compte chaque forme, une par une : {comptes}.',
            f'On vérifie qu\'on a compté tous les objets : ${total}={nb_objets}$.',
        ]},
    }


COMPTER_3 = compter(9, ['●', '▲', '■'], ['na', 'nb', 'nc'])
COMPTER_4 = compter(12, ['●', '▲', '■', '★'], ['na', 'nb', 'nc', 'nd'])

# ● ▲ ● ■ ▲ ● ■ ● ▲ : 4 ●, 3 ▲, 2 ■
V3 = {'s1': '1', 's2': '2', 's3': '1', 's4': '3', 's5': '2', 's6': '1', 's7': '3', 's8': '1',
      's9': '2'}
# ★ ● ▲ ★ ● ● ▲ ★ ● ▲ ● ★ : 5 ●, 3 ▲, 0 ■, 4 ★
V4 = {'s1': '4', 's2': '1', 's3': '2', 's4': '4', 's5': '1', 's6': '1', 's7': '2', 's8': '4',
      's9': '1', 's10': '2', 's11': '1', 's12': '4'}

SPECS_COMPTER = [
    spec('9 formes : 4 ●, 3 ▲, 2 ■', 0, V3, 'correct', ['4', '3', '2']),
    spec('Erreur : un ● oublié', 0, V3, 'incorrect', ['3', '3', '2']),
    spec('Erreur : nombres dans le désordre', 0, V3, 'incorrect', ['2', '3', '4']),
    spec('12 formes, aucun ■ : 0 attendu', 1, V4, 'correct', ['5', '3', '0', '4']),
    spec('Erreur : 1 ■ au lieu de 0', 1, V4, 'incorrect', ['5', '3', '1', '4']),
]

# --- CP-069 : compléter un tableau à double entrée ------------------------------------------

# Table d'addition 3 × 3, en-têtes croissants ; 4 cases en croix, les 5 autres remplies.
CROIX = {(0, 1), (1, 0), (1, 2), (2, 1)}


def addition():
    r, c = ['r1', 'r2', 'r3'], ['c1', 'c2', 'c3']
    lignes = [['$+$'] + [f'${{{{{x}}}}}$' for x in c]]
    blanks, etapes = [], []
    for i, ri in enumerate(r):
        ligne = [f'${{{{{ri}}}}}$']
        for j, cj in enumerate(c):
            if (i, j) in CROIX:
                ligne.append('$?$')
                blanks.append({'expectedAnswer': f'{{{{eval:{ri}+{cj}}}}}'})
                etapes.append(f'${{{{{ri}}}}}+{{{{{cj}}}}}={{{{eval:{ri}+{cj}}}}}$')
            else:
                ligne.append(f'${{{{eval:{ri}+{cj}}}}}$')
        lignes.append(ligne)
    return {
        'statement': 'Complète le tableau : dans chaque case, on écrit le nombre de la ligne'
        ' plus le nombre de la colonne.\n\n' + tableau(lignes),
        # en-têtes croissants par écarts de 1 à 3 (un tirage par rejet échoue trop souvent)
        'variables': [v for x in ('r', 'c') for v in (
            {'name': f'{x}1', 'expression': '1..3'},
            {'name': f'{x}d2', 'expression': '1..3'}, {'name': f'{x}d3', 'expression': '1..3'},
            {'name': f'{x}2', 'expression': f'eval:{x}1+{x}d2'},
            {'name': f'{x}3', 'expression': f'eval:{x}2+{x}d3'})],
        'conditions': [],
        'blanks': blanks,
        'correction': {'steps': [
            'Chaque case est la somme du nombre de sa ligne et du nombre de sa colonne.',
            'Les cases à compléter : ' + ' ; '.join(etapes) + '.',
        ]},
    }


# Formes pleines ou vides : f = forme (1 rond, 2 triangle, 3 carré), p = 1 plein, 2 vide.
FORMES = ['rond', 'triangle', 'carré']
PLEINES, VIDES = ['●', '▲', '■'], ['○', '△', '□']
DONNEES = {(0, 1), (2, 0)}  # cases déjà remplies : rond vide, carré plein


def pleines_vides(nb_objets=10):
    places = range(1, nb_objets + 1)
    variables = []
    for i in places:
        variables += [{'name': f'f{i}', 'expression': '1..3'},
                      {'name': f'p{i}', 'expression': '1..2'}]
    noms = {}
    for (i, j) in product(range(3), range(2)):
        nom = f'n{i + 1}{j + 1}'
        noms[(i, j)] = nom
        somme = '+'.join(
            f'({indicatrice(f"f{k}", i + 1, [1, 2, 3])})*({indicatrice(f"p{k}", j + 1, [1, 2])})'
            for k in places)
        variables.append({'name': nom, 'expression': f'eval:{somme}'})
    file = ' '.join(
        f'{{{{if:p{k}==1|{forme(f"f{k}", PLEINES)}|{forme(f"f{k}", VIDES)}}}}}' for k in places)
    lignes = [['', 'plein', 'vide']]
    blanks = []
    for i, nom_forme in enumerate(FORMES):
        ligne = [nom_forme]
        for j in range(2):
            if (i, j) in DONNEES:
                ligne.append(f'${{{{{noms[(i, j)]}}}}}$')
            else:
                ligne.append('$?$')
                blanks.append({'expectedAnswer': f'{{{{{noms[(i, j)]}}}}}'})
        lignes.append(ligne)
    comptes = ' ; '.join(
        f'{FORMES[i]}s {"pleins" if j == 0 else "vides"} ({(PLEINES if j == 0 else VIDES)[i]}) :'
        f' ${{{{{noms[(i, j)]}}}}}$' for (i, j) in product(range(3), range(2))
        if (i, j) not in DONNEES)
    total = '+'.join(f'{{{{{noms[k]}}}}}' for k in sorted(noms))
    return {
        'statement': 'Complète le tableau : compte les formes pleines (● ▲ ■) et les formes vides'
        ' (○ △ □).\n\n' + file + '\n\n' + tableau(lignes),
        'variables': variables,
        'conditions': [],
        'blanks': blanks,
        'correction': {'steps': [
            'Une case du tableau compte les formes de sa ligne qui sont pleines ou vides, selon'
            ' sa colonne.',
            f'On compte : {comptes}.',
            f'On vérifie qu\'on a compté tous les objets : ${total}={nb_objets}$.',
        ]},
    }


ADDITION = addition()
PLEINES_VIDES = pleines_vides()

ADD = {'r1': '2', 'rd2': '2', 'rd3': '3', 'c1': '1', 'cd2': '2', 'cd3': '3'}  # 2 4 7 / 1 3 6
# ● ○ ▲ ■ △ ● □ ▲ ■ ○ : rond plein 2, rond vide 2, triangle plein 2, triangle vide 1,
# carré plein 2, carré vide 1
PV = {'f1': '1', 'p1': '1', 'f2': '1', 'p2': '2', 'f3': '2', 'p3': '1', 'f4': '3', 'p4': '1',
      'f5': '2', 'p5': '2', 'f6': '1', 'p6': '1', 'f7': '3', 'p7': '2', 'f8': '2', 'p8': '1',
      'f9': '3', 'p9': '1', 'f10': '1', 'p10': '2'}

SPECS_COMPLETER = [
    # cases : (r1, c2), (r2, c1), (r2, c3), (r3, c2)
    spec('Table d\'addition : 5, 5, 10, 10', 0, ADD, 'correct', ['5', '5', '10', '10']),
    spec('Erreur : 4 + 6 = 9', 0, ADD, 'incorrect', ['5', '5', '9', '10']),
    spec('Erreur : ligne et colonne multipliées', 0, ADD, 'incorrect', ['6', '4', '24', '21']),
    # cases : rond plein, triangle plein, triangle vide, carré vide
    spec('Formes : 2, 2, 1, 1', 1, PV, 'correct', ['2', '2', '1', '1']),
    spec('Erreur : triangles plein et vide inversés', 1, PV, 'incorrect', ['2', '1', '2', '1']),
    spec('Erreur : toutes les formes d\'une ligne comptées', 1, PV, 'incorrect',
         ['4', '3', '3', '3']),
]

# --- CP-084 : construire (remplir) un tableau à double entrée préparé ---------------------

PRENOMS = ['Léa', 'Tom', 'Lina', 'Sami', 'Jade', 'Hugo', 'Nour', 'Léo']


def prenom(var, decalage):
    # k = 1..4 choisit un groupe de prénoms ; le prénom de rang « decalage » dans ce groupe
    choix = [PRENOMS[(2 * (k - 1) + decalage) % len(PRENOMS)] for k in range(1, 5)]
    return forme(var, choix)


def billes(nb_enfants):
    enfants = [f'q{i}' for i in range(1, nb_enfants + 1)]
    variables = [{'name': 'k', 'expression': '1..4'}]
    # un prénom rangé dans une variable serait relu comme un nom de variable : écrit dans le texte
    noms = {q: prenom('k', i) for i, q in enumerate(enfants)}
    phrases, lignes, blanks, etapes = [], [['', 'billes rouges', 'billes bleues']], [], []
    for i, q in enumerate(enfants, 1):
        rouge, bleu = f'r{i}', f'b{i}'
        variables += [{'name': rouge, 'expression': '1..9'}, {'name': bleu, 'expression': '1..9'}]
        phrases.append(
            f'{noms[q]} a ${{{{{rouge}}}}}$ {{{{if:{rouge}==1|bille rouge|billes rouges}}}}'
            f' et ${{{{{bleu}}}}}$ {{{{if:{bleu}==1|bille bleue|billes bleues}}}}.')
        lignes.append([noms[q], '$?$', '$?$'])
        blanks += [{'expectedAnswer': f'{{{{{rouge}}}}}'}, {'expectedAnswer': f'{{{{{bleu}}}}}'}]
        etapes.append(f'la ligne de {noms[q]} : ${{{{{rouge}}}}}$ dans la colonne des billes'
                      f' rouges, ${{{{{bleu}}}}}$ dans celle des billes bleues')
    return {
        'statement': 'Lis et remplis le tableau.\n\n' + '\n\n'.join(phrases) + '\n\n'
        + tableau(lignes),
        'variables': variables,
        'conditions': [],
        'blanks': blanks,
        'correction': {'steps': [
            'Chaque ligne est un enfant, chaque colonne une couleur de billes.',
            'On remplit ' + ' ; '.join(etapes) + '.',
        ]},
    }


BILLES_2 = billes(2)
BILLES_3 = billes(3)

B2 = {'k': '1', 'r1': '3', 'b1': '2', 'r2': '1', 'b2': '4'}
B3 = {'k': '2', 'r1': '5', 'b1': '1', 'r2': '2', 'b2': '7', 'r3': '6', 'b3': '3'}

SPECS_CONSTRUIRE = [
    spec('Léa 3 et 2, Tom 1 et 4', 0, B2, 'correct', ['3', '2', '1', '4']),
    spec('Erreur : colonnes inversées', 0, B2, 'incorrect', ['2', '3', '4', '1']),
    spec('Erreur : lignes inversées', 0, B2, 'incorrect', ['1', '4', '3', '2']),
    spec('3 enfants', 1, B3, 'correct', ['5', '1', '2', '7', '6', '3']),
    spec('Erreur : dernière ligne inversée', 1, B3, 'incorrect', ['5', '1', '2', '7', '3', '6']),
]

MODELES = {
    '01-compter-et-ranger': modele(
        'Compte et range dans un tableau',
        'Compter des formes mélangées (9 ou 12, 3 ou 4 formes) et écrire chaque nombre dans un'
        ' tableau',
        'Tableaux', [COMPTER_3, COMPTER_4], SPECS_COMPTER),
    '02-completer-double-entree': modele(
        'Complète le tableau à double entrée',
        'Compléter un tableau à double entrée en partie rempli : table d\'addition 3 × 3, formes'
        ' pleines ou vides',
        'Tableau à double entrée', [ADDITION, PLEINES_VIDES], SPECS_COMPLETER),
    '03-remplir-double-entree': modele(
        'Remplis le tableau à double entrée',
        'Remplir un tableau à double entrée vide (enfants × couleurs) à partir de phrases'
        ' (2 ou 3 enfants)',
        'Tableau à double entrée', [BILLES_2, BILLES_3], SPECS_CONSTRUIRE),
}

for nom, m in MODELES.items():
    with open(f'{DOSSIER}/{nom}.json', 'w') as f:
        json.dump(m, f, ensure_ascii=False, indent='\t')
        f.write('\n')
print(len(MODELES), 'modèles écrits')
