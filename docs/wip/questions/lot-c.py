"""Écrit les 4 modèles du lot C (construire, CP) dans scripts/questions/cp-c/."""
import json
import sys

DOSSIER = sys.argv[1]

# Décisions de David le 2026-10-26 (journal docs/wip/questions-progress.md § 4 quindecies).
# L'élève construit : le bloc ```collection ou ```monnaie avec `construire:` porte SA case (posée
# par le générateur, réponse = valeur posée) ; ni `blanks` ni `[_]` à écrire. Montants en
# `$n~\\unit{€}$` (notation-unites.md), jamais « : » juste après un montant.


def spec(desc, vi, variables_, status, answers):
    return {'description': desc, 'variationIndex': vi, 'variables': variables_,
            'expected': {'status': status}, 'answers': answers}


def modele(title, description, theme, domain, subdomain, level, delay, variations, specs):
    # theme / domain / subdomain : anciennes colonnes, remplies pour create-questions ; le
    # rangement (nœud du point) est posé par la migration
    return {'title': title, 'description': description, 'grades': ['CP'], 'theme': theme,
            'domain': domain, 'subdomain': subdomain, 'level': level, 'delay': delay,
            'status': 'draft', 'variations': variations, 'testSpecs': specs}


def bloc(nom, *lignes):
    return '```' + nom + '\n' + '\n'.join(lignes) + '\n```'


def var(nom, expression):
    return {'name': nom, 'expression': expression}


def pluriel(n, singulier, pluriel_):
    return '{{if:' + n + '==1|' + singulier + '|' + pluriel_ + '}}'


def variation(statement, variables, steps, conditions=None):
    return {'statement': statement, 'variables': variables, 'conditions': conditions or [],
            'blanks': [], 'correction': {'steps': steps}}


# --- C1, CP-002 : construis le nombre -----------------------------------------------------


def construis(dizaines):
    return variation(
        'Construis ${{n}}$ avec des barres de dix et des cubes.\n\n'
        + bloc('collection', 'construire: {{n}}', 'dessin: barres'),
        [var('d', dizaines), var('u', '0..9'), var('n', 'eval:10*d+u')],
        [
            '${{n}}$, c\'est ${{d}}$ ' + pluriel('d', 'dizaine', 'dizaines')
            + '{{if:u==0|.| et ${{u}}$ ' + pluriel('u', 'unité', 'unités') + '.}}',
            'On pose ${{d}}$ ' + pluriel('d', 'barre', 'barres') + ' de dix'
            + '{{if:u==0|, sans cube.| et ${{u}}$ ' + pluriel('u', 'cube', 'cubes') + '.}}',
        ],
        # de 11 à 19 : au moins un cube (10 n'est pas dans la plage)
        ['u >= 1'] if dizaines == '1' else [],
    )


SPECS_CONSTRUIS = [
    spec('14 : une barre et 4 cubes', 0, {'d': '1', 'u': '4', 'n': '14'}, 'correct', ['14']),
    spec('34 : 3 barres et 4 cubes', 1, {'d': '3', 'u': '4', 'n': '34'}, 'correct', ['34']),
    spec('Erreur : chiffres inversés (43 pour 34)', 1, {'d': '3', 'u': '4', 'n': '34'},
         'incorrect', ['43']),
    spec('Erreur : une barre comptée pour 1 (7 pour 34)', 1, {'d': '3', 'u': '4', 'n': '34'},
         'incorrect', ['7']),
    spec('70 : 7 barres, sans cube', 2, {'d': '7', 'u': '0', 'n': '70'}, 'correct', ['70']),
]

# --- C2, CP-044 : pose la somme -----------------------------------------------------------


def pose(intro, somme, reserve):
    return variation(
        intro + 'Pose exactement ${{n}}~\\unit{€}$.\n\n'
        + bloc('monnaie', 'construire: {{n}}', 'réserve: ' + reserve),
        [var('n', somme)],
        ['Les pièces et les billets posés doivent valoir ${{n}}~\\unit{€}$ en tout.',
         'Ce n\'est pas le nombre de pièces et de billets qui compte, c\'est ce qui est écrit'
         ' dessus.'],
    )


SPECS_POSE = [
    spec('8 € avec des pièces', 0, {'n': '8'}, 'correct', ['8']),
    spec('Erreur : 7 € posés pour 8 €', 0, {'n': '8'}, 'incorrect', ['7']),
    spec('35 € avec billets et pièces', 1, {'n': '35'}, 'correct', ['35']),
    spec('Erreur : 53 € posés pour 35 €', 1, {'n': '35'}, 'incorrect', ['53']),
    spec('27 € sans pièce de 1 €', 2, {'n': '27'}, 'correct', ['27']),
]

# --- C3, CP-071 : rends la monnaie ---------------------------------------------------------

OBJETS = ['Le livre', 'Le ballon', 'Le jeu', 'La trousse']


def choix_objet(objets, nom):
    texte = objets[-1]
    for i in range(len(objets) - 1, 0, -1):
        texte = '{{if:' + nom + '==' + str(i) + '|' + objets[i - 1] + '|' + texte + '}}'
    return texte


def rends(billet, prix):
    return variation(
        choix_objet(OBJETS, 'o') + ' coûte ${{p}}~\\unit{€}$. Léo paie avec ce billet :\n\n'
        + bloc('monnaie', 'billets: 1×' + billet)
        + '\n\nTu es le marchand. Rends la monnaie à Léo.\n\n'
        + bloc('monnaie', 'construire: {{r}}', 'réserve: 1 2 5 10'),
        [var('o', '1..4'), var('p', prix), var('r', 'eval:' + billet + '-p')],
        ['On part du prix et on avance jusqu\'à $' + billet + '~\\unit{€}$, soit ${{p}}+{{r}}='
         + billet + '$.',
         'Le marchand rend ${{r}}~\\unit{€}$.'],
    )


SPECS_RENDS = [
    spec('7 € payé avec 10 € : rend 3 €', 0, {'o': '1', 'p': '7', 'r': '3'}, 'correct', ['3']),
    spec('Erreur : rend le prix (7 €)', 0, {'o': '1', 'p': '7', 'r': '3'}, 'incorrect', ['7']),
    spec('13 € payé avec 20 € : rend 7 €', 1, {'o': '2', 'p': '13', 'r': '7'}, 'correct',
         ['7']),
    spec('35 € payé avec 50 € : rend 15 €', 2, {'o': '3', 'p': '35', 'r': '15'}, 'correct',
         ['15']),
    spec('Erreur : rend 25 € (calcul faux)', 2, {'o': '3', 'p': '35', 'r': '15'}, 'incorrect',
         ['25']),
]

# --- C4, CP-045 : paie tes achats ----------------------------------------------------------

PAIE_UN = variation(
    choix_objet(OBJETS, 'o') + ' coûte ${{p}}~\\unit{€}$. Paie-le.\n\n'
    + bloc('monnaie', 'construire: {{p}}'),
    [var('o', '1..4'), var('p', '5..50')],
    ['Pour payer, on pose exactement le prix : ${{p}}~\\unit{€}$.'],
)

PAIE_DEUX = variation(
    'Lina achète ' + choix_objet(['un livre', 'un ballon', 'un jeu'], 'o')
    + ' à ${{a}}~\\unit{€}$ et ' + choix_objet(['un stylo', 'une gomme', 'un cahier'], 'k')
    + ' à ${{b}}~\\unit{€}$. Paie ses achats.\n\n' + bloc('monnaie', 'construire: {{s}}'),
    [var('o', '1..3'), var('k', '1..3'), var('a', '10..30'), var('b', '2..9'),
     var('s', 'eval:a+b')],
    ['On additionne les deux prix : ${{a}}+{{b}}={{s}}$.',
     'Lina paie ${{s}}~\\unit{€}$.'],
)

SPECS_PAIE = [
    spec('Ballon à 23 € : 23', 0, {'o': '2', 'p': '23'}, 'correct', ['23']),
    spec('Erreur : 32 € posés pour 23 €', 0, {'o': '2', 'p': '23'}, 'incorrect', ['32']),
    spec('Livre 12 € + stylo 3 € : 15', 1,
         {'o': '1', 'k': '1', 'a': '12', 'b': '3', 's': '15'}, 'correct', ['15']),
    spec('Erreur : ne paie que le livre (12 €)', 1,
         {'o': '1', 'k': '1', 'a': '12', 'b': '3', 's': '15'}, 'incorrect', ['12']),
]

MODELES = {
    '01-construis-le-nombre': modele(
        'Construis le nombre',
        'Construire un nombre de 11 à 99 avec des barres de dix et des cubes',
        'Entiers', 'Apprivoiser', 'Dénombrer', 1, 90,
        [construis('1'), construis('2..5'), construis('6..9')], SPECS_CONSTRUIS),
    '02-pose-la-somme': modele(
        'Pose la somme',
        'Constituer une somme donnée avec des pièces et des billets ; variation sans pièce'
        ' de 1 €',
        'Grandeurs', 'Monnaie', 'Pièces et billets', 6, 90,
        [pose('', '3..10', '1 2 5'), pose('', '11..50', '1 2 5 10 20'),
         pose('Tu n\'as pas de pièce de $1~\\unit{€}$. ', '11..49', '2 5 10 20')],
        SPECS_POSE),
    '03-rends-la-monnaie': modele(
        'Rends la monnaie',
        'Rendre la monnaie sur un billet de 10, 20 ou 50 € en posant les pièces et les billets'
        ' (rendu ≤ 20 €)',
        'Grandeurs', 'Monnaie', 'Rendre la monnaie', 2, 90,
        [rends('10', '1..9'), rends('20', '11..19'), rends('50', '30..49')], SPECS_RENDS),
    '04-paie-tes-achats': modele(
        'Paie tes achats',
        'Payer un objet, puis deux objets (additionner les prix), en posant pièces et billets',
        'Grandeurs', 'Monnaie', 'Pièces et billets', 7, 90, [PAIE_UN, PAIE_DEUX], SPECS_PAIE),
}

for nom, m in MODELES.items():
    with open(f'{DOSSIER}/{nom}.json', 'w') as f:
        json.dump(m, f, ensure_ascii=False, indent='\t')
        f.write('\n')
print(len(MODELES), 'modèles écrits')
