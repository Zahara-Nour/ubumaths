"""Ajoute les variations validées à 4 modèles publiés exportés de prod dans
scripts/questions/idees-6e-algebre-publies/ (chantier idees-6e-algebre).

Phase 0 validée par David le 2026-11-28 (« je valide les modèles ») : F1 (a9c37578, +4), F4
(a06458ad, +1), F5 (4048d9c5, +2), F7 (39bafe0e, +3). Les variations s'ajoutent À LA FIN (les
réponses des élèves gardent l'indice de leur variation) ; la migration de contenu est générée par
scripts/questions/migration-contenu.ts. Seuls `variations` et `testSpecs` changent : ni titre,
ni niveaux, ni options, ni description.

Le script repart du contenu de prod (variations et specs d'origine, comptées dans ORIGINE) :
le relancer réécrit les ajouts sans les doubler.

Numéros des fiches : la fiche compte les variations à partir de la prod de la phase 0 ; F5 et F7
ont une variation de plus en prod que ne le laisse croire leur numéro (F5 v3, v4 = 4e et 5e
variations ; F7 v4, v5, v6 = 5e, 6e et 7e). Le contenu est celui de la fiche.

Choix d'écriture, à signaler à David :
- F1 : trois schémas par variation (la fiche dit trois ou quatre) ; longueurs des barres écrites
  dans le gabarit (le schéma ne les calcule jamais), la plus longue pour la plus grande quantité.
  v6 (nombre de parts) : le nombre de paquets est inconnu, la barre montre trois paquets et une
  partie en pointillés « … » ; au moins 4 paquets.
- F4 : masses des objets de 0,5 à 3 kg, au multiple de 50 g (1,25 kg, 0,8 kg) : la réponse en
  grammes (1 250) est alors une vraie tentation. Même dessin que la variation en dixièmes de
  gramme (étiquettes réécrites en kg).
- F5 v3 : nombre d'animaux à 2 pattes pair, pour que « pattes divisées par 4 » tombe juste
  (l'élève qui fait ce calcul trouve un entier et s'y fie). v4 : la fiche nomme les erreurs des
  pattes ; pour les pièces, les mêmes idées : nombres inversés, autant de pièces de chaque sorte,
  toutes des petites pièces (case 1) et l'argent en plus non partagé (case 2, comme la variation
  des billets).
- F7 v6 (à quelle étape N cubes) : deux erreurs prévues (la division oubliée, la tour de départ
  pas retirée) ; « 100 × l'étape 1 » et « étape suivante » n'ont pas d'équivalent dans ce sens.

Usage : python3 docs/wip/questions/idees-6e-algebre-publies.py scripts/questions/idees-6e-algebre-publies
"""
import json
import os
import re
import sys

DOSSIER = sys.argv[1]

PRIMAIRE = '\\textcolor{{{color:primary.0}}}'

# id court → (variations, specs) d'origine en prod (export du 2026-11-28)
ORIGINE = {'a9c37578': (2, 5), 'a06458ad': (3, 16), '4048d9c5': (3, 14), '39bafe0e': (4, 11)}


def spec(desc, vi, variables_, status, answers, message=None):
    expected = {'status': status}
    if message is not None:
        expected['expectedErrorMessage'] = message
    return {'description': desc, 'variationIndex': vi, 'variables': variables_,
            'expected': expected, 'answers': answers}


def var(nom, expression):
    return {'name': nom, 'expression': expression}


def erreur(answer, message, label):
    return {'answer': answer, 'message': message, 'label': label}


def case(attendue, erreurs=None):
    c = {'expectedAnswer': attendue}
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


def prix(centimes):
    """Prix en grandeur en euros, à partir d'un nombre de centimes : « 14,37 € », « 12 € »."""
    return '{{eval:((' + centimes + ')/100)[€]}}'


def prix_nu(centimes):
    """Prix sans unité écrit comme un prix (14,30 ; 12) : centimes entiers."""
    return ('{{if:mod(' + centimes + ',100)==0|{{eval:(' + centimes + ')/100;d}}|{{eval:('
            + centimes + ')/100;d2}}}}')


def repete(etiquette, n, mini, maxi):
    """`étiquette ; étiquette ; …` : n segments (n tiré de mini à maxi), pour un schéma en barres."""
    texte = ' ; '.join([etiquette] * mini)
    for k in range(mini, maxi):
        texte += '{{if:' + n + '>' + str(k) + '| ; ' + etiquette + '|}}'
    return texte


def schema(lignes):
    return '```schema-barres\n' + '\n'.join(lignes) + '\n```'


def choix(schemas):
    """Case choix de schémas en barres ; le premier est le bon (mélangé à l'affichage)."""
    items = []
    for lignes in schemas:
        items.append('- ```schema-barres\n' + ''.join('  ' + l + '\n' for l in lignes) + '  ```')
    return '````choix\n' + '\n'.join(items) + '\n````'


def ajouter(court, variations, specs):
    chemin = os.path.join(DOSSIER, court + '.json')
    with open(chemin, encoding='utf-8') as f:
        m = json.load(f)
    nv, ns = ORIGINE[court]
    m['variations'] = m['variations'][:nv] + variations
    for s in specs:
        s['variationIndex'] += nv
    m['testSpecs'] = m['testSpecs'][:ns] + specs
    with open(chemin, 'w', encoding='utf-8') as f:
        json.dump(m, f, ensure_ascii=False, indent='\t')
        f.write('\n')


def lire(court):
    with open(os.path.join(DOSSIER, court + '.json'), encoding='utf-8') as f:
        return json.load(f)


# =============================================================================================
# F1 — a9c37578 (6-142) : choisir le schéma d'un énoncé. Case choix, bon schéma = 0.
# =============================================================================================

F1_HINT = 'Cherche d\'abord ce qu\'on connaît : le tout, ou une des parts ?'

# v3 : une partie cherchée. T élèves dont f filles ; la plus longue barre pour le plus grand nombre.
LF = '{{if:2*f>T|3|2}}'
LG = '{{if:2*f>T|2|3}}'
F1_PARTIE_BON = ['Filles : {{f}} (' + LF + ')', 'Garçons : ? (' + LG + ')', 'total : {{T}}']
F1_PARTIE = variation(
    'Au cross du collège, ${{T}}$ élèves ont couru, dont ${{f}}$ filles. Combien de garçons ont '
    'couru ?\n\nQuel schéma traduit cet énoncé ?\n\n' + choix([
        F1_PARTIE_BON,
        ['Filles : {{f}} (' + LF + ')', 'Garçons : {{T}} (' + LG + ')', 'total : ?'],
        ['Filles : {{f}} (' + LF + ')', 'Garçons : ? (' + LG + ') = {{T}}'],
    ]),
    [var('T', '20..99'), var('f', '10..89')],
    [case('0')],
    [
        '**Le tout.** Les ${{T}}$ élèves, ce sont les filles et les garçons ensemble : l\'accolade, '
        'à droite, embrasse les deux barres.',
        '**La partie cherchée.** On connaît les filles, ${{f}}$ ; le ? est sur la barre des '
        'garçons.\n\n' + schema(F1_PARTIE_BON) + '\n\nOn cherche une partie du tout : ${{T}} - '
        '{{f}} = ' + couleur('{{eval:T-f}}') + '$ garçons.',
    ],
    F1_HINT,
    ['f<T', 'T-f>=10', '2*f!=T'],
)

# v4 : « n fois plus ». Tom a a billes, Léa n fois plus (n de 3 à 9).
F1_FOIS_BON = ['Tom : {{a}}', 'Léa : ' + repete('{{a}}', 'n', 3, 9) + ' = ?']
F1_FOIS = variation(
    'Tom a ${{a}}$ billes. Léa en a ${{n}}$ fois plus que Tom. Combien Léa a-t-elle de billes ?'
    '\n\nQuel schéma traduit cet énoncé ?\n\n' + choix([
        F1_FOIS_BON,
        ['Tom : {{a}}', 'Léa : {{a}} ; {{n}} (0,5) = ?'],
        ['Tom : ' + repete('?', 'n', 3, 9), 'Léa : {{a}}'],
    ]),
    [var('n', '3..9'), var('a', '10..99')],
    [case('0')],
    [
        '**« ${{n}}$ fois plus ».** La barre de Léa est faite de ${{n}}$ barres comme celle de Tom : '
        'on ne lui ajoute pas ${{n}}$ billes.\n\n' + schema(F1_FOIS_BON),
        '**Le calcul.** ${{n}} \\times {{a}} = ' + couleur('{{eval:n*a}}') + '$ billes pour Léa.',
    ],
    F1_HINT,
    ['a!=n'],
)

# v5 : valeur d'une part. T gommes partagées entre n amis (n de 3 à 9), T de 10 à 99.
F1_PART_BON = ['Gommes : ' + repete('?', 'n', 3, 9) + ' = {{T}}']
F1_PART = variation(
    '${{T}}$ gommes sont partagées équitablement entre ${{n}}$ amis. Combien de gommes chaque ami '
    'reçoit-il ?\n\nQuel schéma traduit cet énoncé ?\n\n' + choix([
        F1_PART_BON,
        ['Gommes : ' + repete('{{T}}', 'n', 3, 9) + ' = ?'],
        ['Gommes : {{T}} (3) ; {{n}} (0,5) = ?'],
    ]),
    [var('n', '3..9'), var('q', '2..33'), var('T', 'eval:n*q')],
    [case('0')],
    [
        '**Ce qu\'on connaît.** Le tout, ${{T}}$ gommes, et le nombre de parts égales, ${{n}}$ : '
        'on cherche la valeur d\'une part.\n\n' + schema(F1_PART_BON),
        '**Le calcul.** ${{T}} \\div {{n}} = ' + couleur('{{q}}') + '$ gommes pour chaque ami.',
    ],
    F1_HINT,
    ['T>=10', 'T<=99', 'q!=n'],
)

# v6 : nombre de parts. T gommes rangées par paquets de q (q de 3 à 9) : k paquets, au moins 4.
F1_PAQUETS_BON = ['Gommes : {{q}} ; {{q}} ; -… (2) ; {{q}} = {{T}}']
F1_PAQUETS = variation(
    '${{T}}$ gommes sont rangées par paquets de ${{q}}$. Combien de paquets peut-on faire ?\n\n'
    'Quel schéma traduit cet énoncé ?\n\n' + choix([
        F1_PAQUETS_BON,
        ['Gommes : ' + repete('?', 'q', 3, 9) + ' = {{T}}'],
        ['Gommes : {{q}} ; {{q}} ; -… (2) ; {{q}} = ?'],
    ]),
    [var('q', '3..9'), var('k', '4..33'), var('T', 'eval:q*k')],
    [case('0')],
    [
        '**Ce qu\'on connaît.** Le tout, ${{T}}$ gommes, et la valeur d\'une part, ${{q}}$ gommes '
        'par paquet : on cherche le nombre de parts. Les pointillés disent qu\'on ne sait pas '
        'encore combien il y a de paquets.\n\n' + schema(F1_PAQUETS_BON),
        '**Le calcul.** ${{T}} \\div {{q}} = ' + couleur('{{k}}') + '$ paquets.',
    ],
    F1_HINT,
    ['T<=99', 'k!=q'],
)

V_PA = {'T': '45', 'f': '27'}
V_FO = {'n': '4', 'a': '12'}
V_PT = {'n': '8', 'q': '7', 'T': '56'}
V_PQ = {'q': '8', 'k': '7', 'T': '56'}
SPECS_F1 = [
    spec('Partie : bon schéma', 0, V_PA, 'correct', ['0']),
    spec('Partie : le total cherché', 0, V_PA, 'incorrect', ['1']),
    spec('Partie : total sous la seule barre des garçons', 0, V_PA, 'incorrect', ['2']),
    spec('Partie : plus de garçons que de filles, bon schéma', 0, {'T': '61', 'f': '24'},
         'correct', ['0']),
    spec('Fois plus : bon schéma', 1, V_FO, 'correct', ['0']),
    spec('Fois plus : addition au lieu de « 4 fois plus »', 1, V_FO, 'incorrect', ['1']),
    spec('Fois plus : Tom et Léa inversés', 1, V_FO, 'incorrect', ['2']),
    spec('Fois plus : 9 fois, bon schéma', 1, {'n': '9', 'a': '35'}, 'correct', ['0']),
    spec('Une part : bon schéma', 2, V_PT, 'correct', ['0']),
    spec('Une part : multiplication', 2, V_PT, 'incorrect', ['1']),
    spec('Une part : addition', 2, V_PT, 'incorrect', ['2']),
    spec('Nombre de parts : bon schéma', 3, V_PQ, 'correct', ['0']),
    spec('Nombre de parts : 8 parts inconnues', 3, V_PQ, 'incorrect', ['1']),
    spec('Nombre de parts : total cherché', 3, V_PQ, 'incorrect', ['2']),
]


# =============================================================================================
# F4 — a06458ad (6-142) : balances, pesées en kg. Même dessin que la variation 3 (dixièmes de
# gramme), étiquettes réécrites en kg. Masses en centièmes de kg, multiples de 5 (50 g).
# =============================================================================================

def lab_kg(x):
    """Masse en centièmes de kg (multiple de 5) écrite en texte dans une figure : « 4,55 kg »,
    « 1,5 kg », « 2 kg » (la figure n'écrit pas les grandeurs)."""
    return ('{{if:mod(' + x + ',100)==0|{{eval:(' + x + ')/100}} kg|{{if:mod(' + x
            + ',10)==0|{{eval:floor((' + x + ')/100)}},{{eval:mod(' + x + ',100)/10}} kg|'
            '{{eval:floor((' + x + ')/100)}},{{if:mod(' + x + ',100)<10|0|}}{{eval:mod(' + x
            + ',100)}} kg}}}}')


# Étiquette en dixièmes de gramme de la variation 3 : {{if:mod(X,10)==0|{{eval:(X)/10}} g|…}}
LAB_G = re.compile(r'\{\{if:mod\(([^,]+),10\)==0\|\{\{eval:\(\1\)/10\}\} g\|\{\{eval:floor\(\('
                   r'\1\)/10\)\}\},\{\{eval:mod\(\1,10\)\}\} g\}\}')


def enonce_kg():
    source = lire('a06458ad')['variations'][2]['statement']
    texte, n = LAB_G.subn(lambda m: lab_kg(m.group(1)), source)
    assert n == 8, n  # 3 dessins de la première pesée + la deuxième, description et étiquette
    fin = 'Une boule pèse $?$ g.\n\nUne étoile pèse $?$ g.'
    assert texte.endswith(fin)
    return texte[:-len(fin)] + 'Une boule pèse $?$ kg.\n\nUne étoile pèse $?$ kg.'


def kg(expr):
    return '{{eval:(' + expr + ')/100;d}}'


F4_KG = variation(
    enonce_kg(),
    [var('a', '2..4'), var('u', '10..60'), var('w', '10..60'), var('B', 'eval:5*u'),
     var('E', 'eval:5*w')],
    [
        case(kg('B'), [
            erreur(kg('(a-1)*B'), 'C\'est la masse de ${{eval:a-1}}$ boules : partage-la entre '
                   'elles.', 'Différence non partagée'),
            erreur('{{eval:(a*B+E)/100/(a+1);d}}', 'Les objets n\'ont pas tous la même masse : on '
                   'ne peut pas partager la première pesée en parts égales.',
                   'Pesée partagée entre tous les objets'),
            erreur('{{eval:10*B}}', 'C\'est la masse en grammes : la réponse s\'écrit en '
                   'kilogrammes.', 'Réponse en grammes'),
        ]),
        case(kg('E'), [
            erreur('{{eval:(B+E)/200;d}}', 'Une boule et une étoile n\'ont pas la même masse : on '
                   'ne peut pas partager la deuxième pesée en deux.',
                   'Deuxième pesée partagée en deux'),
            erreur(kg('E-(a-2)*B'), 'Tu as retiré la masse de ${{eval:a-1}}$ boules : sur la '
                   'deuxième pesée, il n\'y a qu\'une boule.', 'Différence non partagée retirée'),
            erreur('{{eval:10*E}}', 'C\'est la masse en grammes : la réponse s\'écrit en '
                   'kilogrammes.', 'Réponse en grammes'),
        ]),
    ],
    [
        '**Comparer les pesées.** La première a ${{eval:a-1}}$ boule{{if:a>2|s|}} de plus que la '
        'deuxième ; tout le reste est pareil. La différence des masses, c\'est donc ${{eval:a-1}}$ '
        'boule{{if:a>2|s|}} : $' + kg('a*B+E') + ' - ' + kg('B+E') + ' = ' + kg('(a-1)*B')
        + '$ kg.',
        '**Une boule.** {{if:a>2|$' + kg('(a-1)*B') + ' \\div {{eval:a-1}} = ' + couleur(kg('B'))
        + '$ kg.|Une boule pèse $' + couleur(kg('B')) + '$ kg.}}',
        '**Une étoile.** Deuxième pesée : $' + kg('B+E') + ' - ' + kg('B') + ' = '
        + couleur(kg('E')) + '$ kg.',
        '**Vérification.** Première pesée : ${{a}} \\times ' + kg('B') + ' + ' + kg('E') + ' = '
        + kg('a*B+E') + '$ kg.',
    ],
    'Compare les deux pesées : qu\'y a-t-il en plus sur la première balance ?',
    ['B!=E'],
)

V_KG = {'a': '3', 'u': '25', 'w': '16', 'B': '125', 'E': '80'}
SPECS_F4 = [
    spec('Kg : 3 × 1,25 + 0,8 = 4,55 ; 1,25 + 0,8 = 2,05', 0, V_KG, 'correct',
         ['1{,}25', '0{,}8']),
    spec('Kg : 0,80 accepté', 0, V_KG, 'correct', ['1{,}25', '0{,}80']),
    spec('Kg : différence non partagée (2,5)', 0, V_KG, 'incorrect', ['2{,}5', '0{,}8'],
         'C\'est la masse de $2$ boules : partage-la entre elles.'),
    spec('Kg : première pesée partagée en 4 (1,1375)', 0, V_KG, 'incorrect',
         ['1{,}1375', '0{,}8'],
         'Les objets n\'ont pas tous la même masse : on ne peut pas partager la première pesée en '
         'parts égales.'),
    spec('Kg : boule en grammes (1 250)', 0, V_KG, 'incorrect', ['1\\,250', '0{,}8'],
         'C\'est la masse en grammes : la réponse s\'écrit en kilogrammes.'),
    spec('Kg : deuxième pesée en deux (1,025)', 0, V_KG, 'incorrect', ['1{,}25', '1{,}025'],
         'Une boule et une étoile n\'ont pas la même masse : on ne peut pas partager la deuxième '
         'pesée en deux.'),
    spec('Kg : 2,5 kg retirés (−0,45)', 0, V_KG, 'incorrect', ['1{,}25', '-0{,}45'],
         'Tu as retiré la masse de $2$ boules : sur la deuxième pesée, il n\'y a qu\'une boule.'),
    spec('Kg : étoile en grammes (800)', 0, V_KG, 'incorrect', ['1{,}25', '800'],
         'C\'est la masse en grammes : la réponse s\'écrit en kilogrammes.'),
    spec('Kg : 2 × 2,35 + 0,5 = 5,2 ; 2,35 + 0,5 = 2,85', 0,
         {'a': '2', 'u': '47', 'w': '10', 'B': '235', 'E': '50'}, 'correct', ['2{,}35', '0{,}5']),
]


# =============================================================================================
# F5 — 4048d9c5 (6-142) : deux nombres inconnus, essai puis ajustement.
# =============================================================================================

# v3 : têtes et pattes. t = 0 lapins / poules, 1 chats / oiseaux, 2 voitures / motos (roues).
# x à 4 pattes, y à 2 pattes, de 2 à 10 ; y pair (« pattes ÷ 4 » tombe juste), y ≠ 2x.
QUATRE = ['lapins', 'chats', 'voitures']
QUATRE_MAJ = ['Lapins', 'Chats', 'Voitures']
QUATRE_UN = ['lapin', 'chat', 'voiture']
DEUX = ['poules', 'oiseaux', 'motos']
DEUX_MAJ = ['Poules', 'Oiseaux', 'Motos']
DEUX_UNE = ['d\'une poule', 'd\'un oiseau', 'd\'une moto']
TETES = ['têtes', 'têtes', 'véhicules']
PATTES = ['pattes', 'pattes', 'roues']
LIEU = ['Dans une ferme', 'Chez Inès', 'Sur un parking']


def s_(liste):
    return selon('t', liste)


F5_PATTES = variation(
    s_(LIEU) + ', il n\'y a que des ' + s_(QUATRE) + ' et des ' + s_(DEUX) + '. On compte ${{h}}$ '
    + s_(TETES) + ' et ${{m}}$ ' + s_(PATTES) + '.\n\nCombien y a-t-il de ' + s_(QUATRE)
    + ' ? Combien de ' + s_(DEUX) + ' ?\n\n' + s_(QUATRE_MAJ) + ' : $?$\n\n' + s_(DEUX_MAJ)
    + ' : $?$',
    [var('t', '0..2'), var('x', '2..10'), var('y', '2..10'), var('h', 'eval:x+y'),
     var('m', 'eval:4*x+2*y')],
    [
        case('{{x}}', [
            erreur('{{y}}', 'C\'est le nombre de ' + s_(DEUX) + ' : vérifie l\'ordre des cases.',
                   'Nombres inversés'),
            erreur('{{eval:h/2}}', 'Avec autant de ' + s_(QUATRE) + ' que de ' + s_(DEUX)
                   + ', il y aurait ${{eval:3*h}}$ ' + s_(PATTES) + ', pas ${{m}}$.',
                   'Total partagé en deux'),
            erreur('{{eval:m/4}}', 'En divisant les ${{m}}$ ' + s_(PATTES) + ' par $4$, tu fais '
                   'comme s\'il n\'y avait que des ' + s_(QUATRE) + ' : les ' + s_(DEUX)
                   + ' n\'en ont que $2$.', s_(PATTES) + ' divisées par 4'),
        ]),
        case('{{y}}', [
            erreur('{{x}}', 'C\'est le nombre de ' + s_(QUATRE) + ' : vérifie l\'ordre des '
                   'cases.', 'Nombres inversés'),
            erreur('{{eval:h/2}}', 'Il n\'y a pas autant de ' + s_(DEUX) + ' que de '
                   + s_(QUATRE) + ' : on aurait alors ${{eval:3*h}}$ ' + s_(PATTES) + ', pas '
                   '${{m}}$.', 'Total partagé en deux'),
            erreur('{{eval:h-m/4}}', '${{m}} \\div 4 = {{eval:m/4}}$ n\'est pas le nombre de '
                   + s_(QUATRE) + ' : les ' + s_(DEUX) + ' n\'ont que $2$ ' + s_(PATTES) + '.',
                   s_(PATTES) + ' divisées par 4'),
        ]),
    ],
    [
        '**Et s\'il n\'y avait que des ' + s_(DEUX) + ' ?** Il y aurait ${{h}} \\times 2 = '
        '{{eval:2*h}}$ ' + s_(PATTES) + '.',
        '**L\'ajustement.** Il y a ${{m}} - {{eval:2*h}} = {{eval:m-2*h}}$ ' + s_(PATTES)
        + ' de plus. Chaque ' + s_(QUATRE_UN) + ' à la place ' + s_(DEUX_UNE)
        + ' en ajoute $2$ : ${{eval:m-2*h}} \\div 2 = ' + couleur('{{x}}') + '$ ' + s_(QUATRE)
        + '.',
        '**Les ' + s_(DEUX) + '.** ${{h}} - {{x}} = ' + couleur('{{y}}') + '$.',
        '**Vérification.** ${{x}} \\times 4 + {{y}} \\times 2 = {{eval:4*x}} + {{eval:2*y}} = '
        '{{m}}$.',
    ],
    'Et s\'il n\'y avait que des ' + s_(DEUX) + ' ?',
    ['x!=y', 'mod(y,2)==0', 'y!=2*x'],
)

# v4 : pièces. c = 0 : 20 centimes et 2 € ; c = 1 : 50 centimes et 1 €. y petites, x grandes,
# de 2 à 10 ; somme s en centimes.
PETITE = ['$20$ centimes', '$50$ centimes']
GRANDE = ['$2~\\unit{€}$', '$1~\\unit{€}$']


def c_(liste):
    return selon('c', liste)


F5_PIECES = variation(
    'Dans son porte-monnaie, Malik n\'a que des pièces de ' + c_(PETITE) + ' et des pièces de '
    + c_(GRANDE) + '. Il a ${{h}}$ pièces en tout, pour $' + prix('s') + '$.\n\nCombien a-t-il '
    'de pièces de chaque sorte ?\n\nPièces de ' + c_(PETITE) + ' : $?$\n\nPièces de '
    + c_(GRANDE) + ' : $?$',
    [var('c', '0..1'), var('p', 'eval:20+30*c'), var('g', 'eval:200-100*c'), var('x', '2..10'),
     var('y', '2..10'), var('h', 'eval:x+y'), var('s', 'eval:g*x+p*y')],
    [
        case('{{y}}', [
            erreur('{{x}}', 'C\'est le nombre de pièces de ' + c_(GRANDE) + ' : vérifie l\'ordre '
                   'des cases.', 'Nombres inversés'),
            erreur('{{eval:h/2}}', 'Il n\'y a pas autant de pièces de chaque sorte : on aurait '
                   'alors $' + prix('h*(p+g)/2') + '$, pas $' + prix('s') + '$.',
                   'Total partagé en deux'),
            erreur('{{eval:s/p}}', 'Il n\'y a pas que des pièces de ' + c_(PETITE) + ' : avec '
                   '${{eval:s/p}}$ pièces, on dépasserait les ${{h}}$ pièces du porte-monnaie.',
                   'Toutes des petites pièces'),
        ]),
        case('{{x}}', [
            erreur('{{y}}', 'C\'est le nombre de pièces de ' + c_(PETITE) + ' : vérifie l\'ordre '
                   'des cases.', 'Nombres inversés'),
            erreur('{{eval:h/2}}', 'Il n\'y a pas autant de pièces de chaque sorte : on aurait '
                   'alors $' + prix('h*(p+g)/2') + '$, pas $' + prix('s') + '$.',
                   'Total partagé en deux'),
            erreur('{{eval:(g-p)*x/100;d}}', 'C\'est l\'argent en plus, en euros : chaque pièce '
                   'de ' + c_(GRANDE) + ' n\'apporte que $' + prix('g-p') + '$ de plus qu\'une '
                   'pièce de ' + c_(PETITE) + '.', 'Argent en plus non partagé'),
        ]),
    ],
    [
        '**Et s\'il n\'y avait que des pièces de ' + c_(PETITE) + ' ?** Malik aurait ${{h}} '
        '\\times ' + prix_nu('p') + ' = ' + prix_nu('h*p') + '~\\unit{€}$.',
        '**L\'ajustement.** Il a $' + prix_nu('s') + ' - ' + prix_nu('h*p') + ' = '
        + prix_nu('s-h*p') + '~\\unit{€}$ de plus. Chaque pièce de ' + c_(GRANDE) + ' à la place '
        'd\'une pièce de ' + c_(PETITE) + ' ajoute $' + prix('g-p') + '$ : $' + prix_nu('g-p')
        + ' \\times ' + couleur('{{x}}') + ' = ' + prix_nu('s-h*p') + '$ : il y a $'
        + couleur('{{x}}') + '$ pièces de ' + c_(GRANDE) + '.',
        '**Les pièces de ' + c_(PETITE) + '.** ${{h}} - {{x}} = ' + couleur('{{y}}') + '$.',
        '**Vérification.** ${{y}} \\times ' + prix_nu('p') + ' + {{x}} \\times ' + prix_nu('g')
        + ' = ' + prix_nu('p*y') + ' + ' + prix_nu('g*x') + ' = ' + prix_nu('s') + '$.',
    ],
    'Et s\'il n\'y avait que des pièces de ' + c_(PETITE) + ' ?',
    ['x!=y'],
)

V_PAT = {'t': '0', 'x': '6', 'y': '4', 'h': '10', 'm': '32'}
V_PIE = {'c': '0', 'p': '20', 'g': '200', 'x': '5', 'y': '7', 'h': '12', 's': '1140'}
SPECS_F5 = [
    spec('Pattes : 10 têtes, 32 pattes → 6 lapins, 4 poules', 0, V_PAT, 'correct', ['6', '4']),
    spec('Pattes : lapins et poules inversés (case 1)', 0, V_PAT, 'incorrect', ['4', '4'],
         'C\'est le nombre de poules : vérifie l\'ordre des cases.'),
    spec('Pattes : 10 ÷ 2 lapins (5)', 0, V_PAT, 'incorrect', ['5', '4'],
         'Avec autant de lapins que de poules, il y aurait $30$ pattes, pas $32$.'),
    spec('Pattes : 32 ÷ 4 lapins (8)', 0, V_PAT, 'incorrect', ['8', '4'],
         'En divisant les $32$ pattes par $4$, tu fais comme s\'il n\'y avait que des lapins : '
         'les poules n\'en ont que $2$.'),
    spec('Pattes : lapins et poules inversés (case 2)', 0, V_PAT, 'incorrect', ['6', '6'],
         'C\'est le nombre de lapins : vérifie l\'ordre des cases.'),
    spec('Pattes : 10 ÷ 2 poules (5)', 0, V_PAT, 'incorrect', ['6', '5'],
         'Il n\'y a pas autant de poules que de lapins : on aurait alors $30$ pattes, pas $32$.'),
    spec('Pattes : 10 − 32 ÷ 4 poules (2)', 0, V_PAT, 'incorrect', ['6', '2'],
         '$32 \\div 4 = 8$ n\'est pas le nombre de lapins : les poules n\'ont que $2$ pattes.'),
    spec('Roues : 13 véhicules, 44 roues → 9 voitures, 4 motos', 0,
         {'t': '2', 'x': '9', 'y': '4', 'h': '13', 'm': '44'}, 'correct', ['9', '4']),
    spec('Pièces : 12 pièces, 11,40 € → 7 de 20 c, 5 de 2 €', 1, V_PIE, 'correct', ['7', '5']),
    spec('Pièces : inversés (case 1)', 1, V_PIE, 'incorrect', ['5', '5'],
         'C\'est le nombre de pièces de $2~\\unit{€}$ : vérifie l\'ordre des cases.'),
    spec('Pièces : 12 ÷ 2 (case 1)', 1, V_PIE, 'incorrect', ['6', '5'],
         'Il n\'y a pas autant de pièces de chaque sorte : on aurait alors $13.20~\\unit{€}$, '
         'pas $11.40~\\unit{€}$.'),
    spec('Pièces : toutes de 20 c (57)', 1, V_PIE, 'incorrect', ['57', '5'],
         'Il n\'y a pas que des pièces de $20$ centimes : avec $57$ pièces, on dépasserait les '
         '$12$ pièces du porte-monnaie.'),
    spec('Pièces : inversés (case 2)', 1, V_PIE, 'incorrect', ['7', '7'],
         'C\'est le nombre de pièces de $20$ centimes : vérifie l\'ordre des cases.'),
    spec('Pièces : 9 € en plus non partagés', 1, V_PIE, 'incorrect', ['7', '9'],
         'C\'est l\'argent en plus, en euros : chaque pièce de $2~\\unit{€}$ n\'apporte que '
         '$1.80~\\unit{€}$ de plus qu\'une pièce de $20$ centimes.'),
    spec('Pièces : 50 c et 1 €, 3 et 8 → 7 €', 1,
         {'c': '1', 'p': '50', 'g': '100', 'x': '3', 'y': '8', 'h': '11', 's': '700'},
         'correct', ['8', '3']),
]


# =============================================================================================
# F7 — 39bafe0e (6-143) : motif évolutif a × n + b.
# =============================================================================================

F7_HINT = 'Que garde-t-on d\'une étape à l\'autre, et qu\'ajoute-t-on ?'


def croix():
    """Trois étapes d'un motif de jetons en croix : un centre et quatre branches de n jetons."""
    lignes = ['fenetre: -0.7 ; 15.7 ; -1.6 ; 6.7', 'taille: grande',
              'description: Trois étapes d\'un motif de jetons en croix : un jeton au centre et '
              'quatre branches de 1, 2 puis 3 jetons, soit 5, 9 puis 13 jetons.', '---']
    centres = {1: 1, 2: 5.5, 3: 12}
    for n, cx in centres.items():
        jetons = [(cx, 3)]
        for k in range(1, n + 1):
            jetons += [(cx - k, 3), (cx + k, 3), (cx, 3 - k), (cx, 3 + k)]
        for i, (x, y) in enumerate(jetons):
            nom = 'J' + str(n) + 'k' + str(i)
            lignes.append(nom + ' = point(' + str(x) + ', ' + str(y) + ', visible=faux)')
            lignes.append('cercle(' + nom + ', rayon=0.3, couleur="bleu", remplissage="bleu", '
                          'opacite_fond=1)')
        lignes.append('texte(' + str(cx) + ', -1, "Étape ' + str(n) + '")')
    return '```figure\n' + '\n'.join(lignes) + '\n```'


F7_CROIX = variation(
    'Voici les trois premières étapes d\'un motif de jetons.\n\n' + croix() + '\n\nCombien de '
    'jetons faut-il pour l\'étape $100$ ?\n\n$?$',
    [],
    [case('401', [
        erreur('500', 'Tu as pris $100$ fois l\'étape $1$ : le jeton du centre n\'est pas répété, '
               'seules les branches s\'allongent.', '100 fois l\'étape 1'),
        erreur('400', 'Ce sont les $4$ branches de $100$ jetons : n\'oublie pas le jeton du '
               'centre.', 'Jeton du centre oublié'),
        erreur('17', '$17$, c\'est l\'étape $4$ : on demande l\'étape $100$.',
               'Étape suivante seulement'),
    ])],
    [
        '**La régularité.** $5$, puis $9$, puis $13$ : on garde le jeton du centre et on ajoute '
        '$4$ jetons à chaque étape, un au bout de chaque branche.',
        '**L\'étape $100$.** Chaque branche a $100$ jetons, et il y a le centre : $4 \\times 100 + '
        '1 = ' + couleur('401') + '$ jetons.',
    ],
    F7_HINT,
)


def cubes(n):
    """Étape n du motif : la tour de départ (b cubes) et n tours de a cubes, collées."""
    return '```cubes\nhauteurs: {{b}}' + ' {{a}}' * n + '\n```'


F7_CUBES_ENONCE = ('Voici les trois premières étapes d\'un motif de cubes.\n\nÉtape $1$ :\n\n'
                   + cubes(1) + '\n\nÉtape $2$ :\n\n' + cubes(2) + '\n\nÉtape $3$ :\n\n'
                   + cubes(3))
F7_REGULARITE = ('**La régularité.** Étape $1$ : ${{eval:a+b}}$ cubes ; étape $2$ : '
                 '${{eval:2*a+b}}$ ; étape $3$ : ${{eval:3*a+b}}$. On garde la tour de départ de '
                 '${{b}}$ cube{{if:b>1|s|}} et on ajoute une tour de ${{a}}$ cubes à chaque étape.')

F7_CUBES = variation(
    F7_CUBES_ENONCE + '\n\nCombien de cubes faut-il pour l\'étape ${{s}}$ ?\n\n$?$',
    [var('a', '2..4'), var('b', '1..6'), var('s', '10|20')],
    [case('{{eval:a*s+b}}', [
        erreur('{{eval:s*(a+b)}}', 'Tu as pris ${{s}}$ fois l\'étape $1$ : la tour de départ '
               'n\'est pas répétée, seules les tours de ${{a}}$ cubes s\'ajoutent.',
               'Étape 1 multipliée'),
        erreur('{{eval:a*s}}', 'Tu as oublié la tour de départ : ajoute ses ${{b}}$ '
               'cube{{if:b>1|s|}}.', 'Tour de départ oubliée'),
        erreur('{{eval:4*a+b}}', '${{eval:4*a+b}}$, c\'est l\'étape $4$ : on demande l\'étape '
               '${{s}}$.', 'Étape suivante seulement'),
    ])],
    [
        F7_REGULARITE,
        '**L\'étape ${{s}}$.** Elle a ${{s}}$ tours de ${{a}}$ cubes et la tour de départ : '
        '${{s}} \\times {{a}} + {{b}} = ' + couleur('{{eval:a*s+b}}') + '$ cubes.',
    ],
    F7_HINT,
    ['b!=a'],
)

F7_ETAPE = variation(
    F7_CUBES_ENONCE + '\n\nÀ quelle étape le motif compte-t-il ${{N}}$ cubes ?\n\nÉtape $?$',
    [var('a', '2..4'), var('b', '1..6'), var('s', '15..60'), var('N', 'eval:a*s+b')],
    [case('{{s}}', [
        erreur('{{eval:N-b}}', 'C\'est le nombre de cubes des tours de ${{a}}$ : il reste à '
               'chercher combien il y a de ces tours.', 'Division oubliée'),
        erreur('{{eval:N/a}}', 'Tu as partagé les ${{N}}$ cubes en tours de ${{a}}$ sans retirer '
               'd\'abord la tour de départ.', 'Tour de départ pas retirée'),
    ])],
    [
        F7_REGULARITE,
        '**Sans la tour de départ.** ${{N}} - {{b}} = {{eval:N-b}}$ cubes, rangés en tours de '
        '${{a}}$ : ${{eval:N-b}} \\div {{a}} = {{s}}$ tours, c\'est l\'étape $'
        + couleur('{{s}}') + '$.',
    ],
    F7_HINT,
    ['b!=a'],
)

V_CU = {'a': '3', 'b': '5', 's': '10'}
V_ET = {'a': '2', 'b': '4', 's': '20', 'N': '44'}
SPECS_F7 = [
    spec('Croix : étape 100 → 401', 0, {}, 'correct', ['401']),
    spec('Croix : 100 × 5 (500)', 0, {}, 'incorrect', ['500'],
         'Tu as pris $100$ fois l\'étape $1$ : le jeton du centre n\'est pas répété, seules les '
         'branches s\'allongent.'),
    spec('Croix : centre oublié (400)', 0, {}, 'incorrect', ['400'],
         'Ce sont les $4$ branches de $100$ jetons : n\'oublie pas le jeton du centre.'),
    spec('Croix : étape 4 (17)', 0, {}, 'incorrect', ['17'],
         '$17$, c\'est l\'étape $4$ : on demande l\'étape $100$.'),
    spec('Cubes : 3 × 10 + 5 = 35', 1, V_CU, 'correct', ['35']),
    spec('Cubes : 10 × 8 (80)', 1, V_CU, 'incorrect', ['80'],
         'Tu as pris $10$ fois l\'étape $1$ : la tour de départ n\'est pas répétée, seules les '
         'tours de $3$ cubes s\'ajoutent.'),
    spec('Cubes : tour de départ oubliée (30)', 1, V_CU, 'incorrect', ['30'],
         'Tu as oublié la tour de départ : ajoute ses $5$ cubes.'),
    spec('Cubes : étape 4 (17)', 1, V_CU, 'incorrect', ['17'],
         '$17$, c\'est l\'étape $4$ : on demande l\'étape $10$.'),
    spec('Cubes : 4 × 20 + 1 = 81', 1, {'a': '4', 'b': '1', 's': '20'}, 'correct', ['81']),
    spec('Étape : 44 cubes = 2 × 20 + 4 → étape 20', 2, V_ET, 'correct', ['20']),
    spec('Étape : division oubliée (40)', 2, V_ET, 'incorrect', ['40'],
         'C\'est le nombre de cubes des tours de $2$ : il reste à chercher combien il y a de ces '
         'tours.'),
    spec('Étape : 44 ÷ 2 (22)', 2, V_ET, 'incorrect', ['22'],
         'Tu as partagé les $44$ cubes en tours de $2$ sans retirer d\'abord la tour de départ.'),
    spec('Étape : 56 cubes = 3 × 17 + 5 → étape 17', 2, {'a': '3', 'b': '5', 's': '17', 'N': '56'},
         'correct', ['17']),
]


ajouter('a9c37578', [F1_PARTIE, F1_FOIS, F1_PART, F1_PAQUETS], SPECS_F1)
ajouter('a06458ad', [F4_KG], SPECS_F4)
ajouter('4048d9c5', [F5_PATTES, F5_PIECES], SPECS_F5)
ajouter('39bafe0e', [F7_CROIX, F7_CUBES, F7_ETAPE], SPECS_F7)
print('10 variations ajoutées à 4 modèles dans', DOSSIER)
