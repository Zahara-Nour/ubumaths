"""Écrit les modèles neufs du chantier idees-6e-algebre dans scripts/questions/idees-6e-algebre-neufs/.

Phase 0 validée par David le 2026-11-28 (« je valide les modèles », journal
docs/archive/wip/idees-6e-algebre/idees-6e-algebre-progress.md, section « Fiches validées ») : F2, F3, F6, F8. On reprend
l'idée de l'autre plateforme, pas sa forme ni son texte : choisir le calcul d'un problème à une
étape, compléter un énoncé d'après un schéma en barres, motif répétitif (frise), appartenance à
une suite à pas constant.

Ni theme, ni domain, ni subdomain, ni id : le rangement (nœud + tag) se fera par migration, après
la création en brouillon (champ `rangement`). Nœuds relevés en prod le 2026-11-28 : a9c37578 sur
« Algèbre > Premiers pas algébriques > nombre inconnu » (6-142 y est) ; 39bafe0e sur « Algèbre >
Premiers pas algébriques > suites de motifs » (6-143 y est). F2, F3 → 6-142 ; F6, F8 → 6-143 (Q2).

Choix d'écriture :
- F2 : la case choix montre les quatre opérations avec les deux nombres de l'énoncé, dans cet
  ordre d'origine (0 +, 1 −, 2 ×, 3 ÷), mélangées à l'affichage ; la bonne réponse est une
  variable (`r`), jamais un `{{if}}`. v4 a un cinquième choix, la division par k + 1 : sans lui,
  le piège « entre lui et ses k amis » (÷ (k + 1)) n'aurait pas sa bonne réponse parmi les
  choix (le nombre de choix ne peut pas dépendre du tirage).
- F3 : les longueurs des barres sont choisies (pas proportionnelles aux nombres) pour que les
  étiquettes tiennent ; les grands nombres des étiquettes sont groupés à la main (`mille()`),
  le schéma écrit son texte tel quel.
- F6 : formes liées à une couleur (rond rouge, carré bleu, triangle vert, étoile orange) : la
  forme seule suffit à les distinguer. Frise dessinée par une macro de figure `forme(k, x, y)` ;
  le motif est tiré dans un catalogue (`c`) écrit ici, blocs sans période plus courte. v1 montre
  3 blocs si le bloc a 2 à 4 formes, 2 blocs s'il en a 5 ou 6 (au plus 12 formes, une rangée).
  v2 : blocs de 4 à 6 formes qui contiennent les quatre formes, pour que la case choix (les
  quatre formes) montre exactement les formes du bloc. v3 : 60 premières formes, comme la
  fiche ; 60 est un multiple de 2 à 6, il n'y a jamais de bloc entamé.
- F8 : pas de 3 à 8 en v1 et v2 (avec un pas de 2, les trois intrus seraient tous décalés de 1 :
  une question de parité) ; les intrus sont décalés de 1, de pas − 1 et de la moitié du pas (arrondie en dessous),
  chacun à partir d'un terme différent : ils ne sont jamais dans la suite.

Règles suivies (couvrir-un-niveau.md § 5) : erreurs prévues par case d'écriture ordinaire, chacune
avec sa spec `incorrect` qui nomme son message ; un coup de pouce par variation, qui ne donne
jamais la réponse. Les choix n'ont pas d'erreurs prévues.

Usage : python3 docs/wip/questions/idees-6e-algebre-neufs.py scripts/questions/idees-6e-algebre-neufs
"""
import json
import os
import sys

DOSSIER = sys.argv[1]

PRIMAIRE = '\\textcolor{{{color:primary.0}}}'
ESPACES = {'constraints': {'spacesFromFourDigits': True}}
INCONNU = {'noeud': 'Algèbre > Premiers pas algébriques > nombre inconnu', 'point': '6-142'}
MOTIFS = {'noeud': 'Algèbre > Premiers pas algébriques > suites de motifs', 'point': '6-143'}


def spec(desc, vi, variables_, status, answers, message=None):
    expected = {'status': status}
    if message is not None:
        expected['expectedErrorMessage'] = message
    return {'description': desc, 'variationIndex': vi, 'variables': variables_,
            'expected': expected, 'answers': answers}


def modele(title, description, level, delay, variations, specs, options=None, grades=None,
           rangement=None):
    m = {'rangement': rangement, 'title': title, 'description': description,
         'grades': grades or ['6'], 'level': level, 'delay': delay, 'status': 'draft'}
    if options:
        m['options'] = options
    m['variations'] = variations
    m['testSpecs'] = specs
    return m


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


def selon(v, textes, debut=0, k=0):
    """`{{if:v==debut|…|{{if:v==debut+1|…|…}}}}` : le texte numéro v (v de debut à …)."""
    if k == len(textes) - 1:
        return textes[k]
    return ('{{if:' + v + '==' + str(debut + k) + '|' + textes[k] + '|'
            + selon(v, textes, debut, k + 1) + '}}')


def ind(v, k):
    """Indicatrice v == k, pour une variable `eval:`."""
    return f'(1-min(abs({v}-{k}),1))'


def sel(v, valeurs):
    """Expression qui vaut valeurs[k] quand v == k."""
    return '+'.join(f'{x}*{ind(v, k)}' for k, x in enumerate(valeurs))


def bloc(nom, *lignes):
    return '```' + nom + '\n' + '\n'.join(lignes) + '\n```'


def mille(x):
    """Nombre (expression entière, < 1 000 000) écrit en texte avec l'espace des milliers."""
    return ('{{if:' + x + '>=1000|{{eval:floor((' + x + ')/1000)}} {{eval:floor(mod(' + x
            + ',1000)/100)}}{{eval:floor(mod(' + x + ',100)/10)}}{{eval:mod(' + x + ',10)}}|'
            '{{eval:' + x + '}}}}')


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
# F2 — 6-142 : choisir le calcul qui résout un problème à une étape (sans le faire).
# Choix d'origine : 0 N + k, 1 N − k, 2 N × k, 3 N ÷ k (v4 : 4 N ÷ (k + 1)).
# =============================================================================================

F2_HINT = 'Dessine le schéma : cherches-tu le tout, une partie ou une part ?'
F2_QUESTION = ('\n\nQuel calcul permet de répondre ? Ne fais pas le calcul : choisis-le '
               'seulement.\n\n')


def f2_choix(cinq=False):
    lignes = ['- ${{N}} + {{k}}$', '- ${{N}} - {{k}}$', '- ${{N}} \\times {{k}}$',
              '- ${{N}} \\div {{k}}$']
    if cinq:
        lignes.append('- ${{N}} \\div {{eval:k+1}}$')
    return bloc('choix', *lignes)


def schema(*lignes):
    return '\n\n' + bloc('schema-barres', *lignes) + '\n\n'


# v1 : tout ou partie. t = 0 : on ajoute (le tout) ; t = 1, 2 : on retire (une partie).
F2_TOUT_ENONCES = [
    'Léa a ${{N}}$ billes. À la récréation, elle en gagne ${{k}}$. Combien de billes a-t-elle '
    'maintenant ?',
    'Dans un bus, il y a ${{N}}$ passagers. À l\'arrêt, ${{k}}$ passagers descendent et personne '
    'ne monte. Combien de passagers reste-t-il dans le bus ?',
    'Une classe compte ${{N}}$ élèves, dont ${{k}}$ portent des lunettes. Combien d\'élèves ne '
    'portent pas de lunettes ?',
]
F2_TOUT_SCHEMAS = [
    schema('Billes : {{N}} (4) ; {{k}} (1) = ?'),
    schema('Passagers : ? (4) ; {{k}} (1) = {{N}}'),
    schema('Élèves : ? (4) ; {{k}} (1) = {{N}}'),
]
F2_TOUT_RAISONS = [
    '**Ce qu\'on cherche.** Les billes d\'avant et celles gagnées sont les deux parties ; on '
    'cherche le tout : on ajoute les parties, $' + couleur('{{N}} + {{k}}') + '$.',
    '**Ce qu\'on cherche.** Le tout, ce sont les ${{N}}$ passagers ; ceux qui restent sont une '
    'partie : on retire l\'autre partie, $' + couleur('{{N}} - {{k}}') + '$.',
    '**Ce qu\'on cherche.** Le tout, ce sont les ${{N}}$ élèves ; ceux sans lunettes sont une '
    'partie : on retire l\'autre partie, $' + couleur('{{N}} - {{k}}') + '$.',
]
F2_VARS = [var('N', '15..50'), var('k', '5..9')]

F2_TOUT = variation(
    selon('t', F2_TOUT_ENONCES) + F2_QUESTION + f2_choix(),
    [var('t', '0..2'), *F2_VARS, var('r', 'eval:min(t,1)')],
    [case('{{r}}')],
    [
        '**Le schéma.**' + selon('t', F2_TOUT_SCHEMAS),
        selon('t', F2_TOUT_RAISONS),
    ],
    F2_HINT,
)

# v2 : comparaison. t = 0 « de plus » (+), t = 1 « de moins » (−), t = 2 « de moins », mais on
# cherche le plus grand (+).
F2_COMP_ENONCES = [
    'Inès a ${{N}}$ ans. Son frère Hugo a ${{k}}$ ans de plus qu\'elle. Quel âge a Hugo ?',
    'Inès a ${{N}}$ ans. Sa sœur Zoé a ${{k}}$ ans de moins qu\'elle. Quel âge a Zoé ?',
    'Hugo a ${{N}}$ ans. Il a ${{k}}$ ans de moins que sa sœur Inès. Quel âge a Inès ?',
]
F2_COMP_SCHEMAS = [
    schema('Inès : {{N}} (4)', 'Hugo : {{N}} (4) ; {{k}} (1) = ?'),
    schema('Inès : {{N}} (4) ; {{k}} (1)', 'Zoé : ? (4) ; -{{k}} (1)'),
    schema('Hugo : {{N}} (4)', 'Inès : {{N}} (4) ; {{k}} (1) = ?'),
]
F2_COMP_RAISONS = [
    '**Ce qu\'on cherche.** Hugo est le plus âgé : sa barre, c\'est celle d\'Inès et ${{k}}$ ans '
    'de plus, $' + couleur('{{N}} + {{k}}') + '$.',
    '**Ce qu\'on cherche.** Zoé est la plus jeune : sa barre, c\'est celle d\'Inès moins '
    '${{k}}$ ans, $' + couleur('{{N}} - {{k}}') + '$.',
    '**Ce qu\'on cherche.** « Hugo a ${{k}}$ ans de moins qu\'Inès », c\'est « Inès a ${{k}}$ ans '
    'de plus que Hugo » : on ajoute, $' + couleur('{{N}} + {{k}}') + '$. Le mot « moins » ne '
    'veut pas toujours dire qu\'on soustrait.',
]
F2_COMP = variation(
    selon('t', F2_COMP_ENONCES) + F2_QUESTION + f2_choix(),
    [var('t', '0..2'), *F2_VARS, var('r', 'eval:' + ind('t', 1))],
    [case('{{r}}')],
    [
        '**Le schéma.** On compare deux âges : une barre par personne.' + selon('t', F2_COMP_SCHEMAS),
        selon('t', F2_COMP_RAISONS),
    ],
    F2_HINT,
)


def segments(valeur, n):
    return ' ; '.join([valeur] * n)


# v3 : produit (k parts égales de N, on cherche le tout).
F2_PROD_ENONCES = [
    'Un magasin reçoit ${{k}}$ paquets de ${{N}}$ cartes. Combien de cartes reçoit-il en tout ?',
    'Dans une salle, il y a ${{k}}$ rangées de ${{N}}$ chaises. Combien y a-t-il de chaises ?',
    'Tom met ${{N}}~\\unit{€}$ de côté chaque mois, pendant ${{k}}$ mois. Combien d\'argent '
    'a-t-il mis de côté ?',
]
F2_PROD = variation(
    selon('t', F2_PROD_ENONCES) + F2_QUESTION + f2_choix(),
    [var('t', '0..2'), *F2_VARS],
    [case('2')],
    [
        '**Le schéma.** ${{k}}$ parts égales de ${{N}}$ ; on cherche le tout.'
        + selon('k', [schema(': ' + segments('{{N}}', n) + ' = ?') for n in range(5, 10)], 5),
        '**Ce qu\'on cherche.** Le tout fait ${{k}}$ fois ${{N}}$ : $'
        + couleur('{{N}} \\times {{k}}') + '$.',
    ],
    F2_HINT,
)

# v4 : partage. t = 0, 2 : entre k (÷ k) ; t = 1 : le piège « entre lui et ses k amis » (÷ (k + 1)).
F2_PART_ENONCES = [
    'Léo partage ${{N}}$ gommes entre ses ${{k}}$ amis ; chacun en reçoit autant. Combien de '
    'gommes chaque ami reçoit-il ?',
    'Léo partage ${{N}}$ gommes entre lui et ses ${{k}}$ amis ; chacun en reçoit autant. Combien '
    'de gommes chacun reçoit-il ?',
    '${{N}}$ élèves forment ${{k}}$ équipes, toutes de la même taille. Combien d\'élèves y a-t-il '
    'dans chaque équipe ?',
]
F2_PART_RAISONS = [
    '**Ce qu\'on cherche.** Les ${{N}}$ gommes sont partagées en ${{k}}$ parts égales ; on '
    'cherche une part : $' + couleur('{{N}} \\div {{k}}') + '$.',
    '**Ce qu\'on cherche.** Léo garde aussi sa part : on partage entre ${{k}} + 1 = {{dv}}$ '
    'personnes, et on cherche une part : $' + couleur('{{N}} \\div {{dv}}') + '$.',
    '**Ce qu\'on cherche.** Les ${{N}}$ élèves sont partagés en ${{k}}$ équipes égales ; on '
    'cherche une part : $' + couleur('{{N}} \\div {{k}}') + '$.',
]
F2_PART = variation(
    selon('t', F2_PART_ENONCES) + F2_QUESTION + f2_choix(True),
    [var('t', '0..2'), *F2_VARS, var('dv', 'eval:k+' + ind('t', 1)),
     var('r', 'eval:3+' + ind('t', 1))],
    [case('{{r}}')],
    [
        '**Le schéma.** Un tout de ${{N}}$, partagé en ${{dv}}$ parts égales.'
        + selon('dv', [schema(': ' + segments('?', n) + ' = {{N}}') for n in range(5, 11)], 5),
        selon('t', F2_PART_RAISONS),
    ],
    F2_HINT,
    ['mod(N,dv)==0', 'dv<=9'],
)

SPECS_F2 = [
    spec('Tout : billes gagnées → N + k', 0, {'t': '0', 'N': '32', 'k': '7', 'r': '0'},
         'correct', ['0']),
    spec('Tout : soustraction refusée', 0, {'t': '0', 'N': '32', 'k': '7', 'r': '0'},
         'incorrect', ['1']),
    spec('Partie : passagers descendus → N − k', 0, {'t': '1', 'N': '32', 'k': '7', 'r': '1'},
         'correct', ['1']),
    spec('Partie : addition refusée', 0, {'t': '1', 'N': '32', 'k': '7', 'r': '1'},
         'incorrect', ['0']),
    spec('Partie : élèves sans lunettes → N − k', 0, {'t': '2', 'N': '27', 'k': '8', 'r': '1'},
         'correct', ['1']),
    spec('Partie : division refusée', 0, {'t': '2', 'N': '27', 'k': '8', 'r': '1'},
         'incorrect', ['3']),
    spec('Comparaison : de plus → N + k', 1, {'t': '0', 'N': '32', 'k': '6', 'r': '0'},
         'correct', ['0']),
    spec('Comparaison : de moins → N − k', 1, {'t': '1', 'N': '32', 'k': '6', 'r': '1'},
         'correct', ['1']),
    spec('Comparaison : de moins, mot « moins » pris au pied de la lettre', 1,
         {'t': '2', 'N': '32', 'k': '6', 'r': '0'}, 'incorrect', ['1']),
    spec('Comparaison : de moins, on cherche le plus grand → N + k', 1,
         {'t': '2', 'N': '32', 'k': '6', 'r': '0'}, 'correct', ['0']),
    spec('Produit : paquets → N × k', 2, {'t': '0', 'N': '32', 'k': '7'}, 'correct', ['2']),
    spec('Produit : addition refusée', 2, {'t': '0', 'N': '32', 'k': '7'}, 'incorrect', ['0']),
    spec('Produit : division refusée', 2, {'t': '2', 'N': '45', 'k': '9'}, 'incorrect', ['3']),
    spec('Partage : entre ses 7 amis → N ÷ k', 3,
         {'t': '0', 'N': '42', 'k': '7', 'dv': '7', 'r': '3'}, 'correct', ['3']),
    spec('Partage : multiplication refusée', 3,
         {'t': '0', 'N': '42', 'k': '7', 'dv': '7', 'r': '3'}, 'incorrect', ['2']),
    spec('Partage : avec mes 7 amis → N ÷ 8', 3,
         {'t': '1', 'N': '48', 'k': '7', 'dv': '8', 'r': '4'}, 'correct', ['4']),
    spec('Partage : avec mes 7 amis, Léo oublié (÷ 7)', 3,
         {'t': '1', 'N': '48', 'k': '7', 'dv': '8', 'r': '4'}, 'incorrect', ['3']),
    spec('Partage : équipes → N ÷ k', 3,
         {'t': '2', 'N': '30', 'k': '6', 'dv': '6', 'r': '3'}, 'correct', ['3']),
]

F2 = modele(
    'Choisir le calcul qui résout le problème',
    'Problème à une étape : choisir, sans le faire, le calcul qui y répond parmi les quatre '
    'opérations sur les deux nombres de l\'énoncé ; tout ou partie, comparaison (« de moins » '
    'qui fait ajouter), produit, partage (piège « entre lui et ses amis ») ; corrigé par un '
    'schéma en barres',
    2, 60, [F2_TOUT, F2_COMP, F2_PROD, F2_PART], SPECS_F2, rangement=INCONNU)


# =============================================================================================
# F3 — 6-142 : un schéma en barres donné, compléter l'énoncé qui lui correspond.
# =============================================================================================

F3_HINT = 'Chaque barre porte un nom : trouve-le dans l\'énoncé.'
F3_CONSIGNE = '\n\nComplète l\'énoncé pour qu\'il corresponde au schéma.\n\n'


def autre(valeur, nom, case_nom, label):
    return erreur(valeur, 'C\'est ' + nom + ' : cette case parle ' + case_nom + '.', label)


# v1 : trois achats et leur total. Énoncé dans l'ordre cahier, stylo, livre (le schéma :
# livre, cahier, stylo).
F3_ACHATS = variation(
    'Ce schéma en barres représente les achats de Zoé.'
    + schema('Livre : {{L}} € (5)', 'Cahier : {{C}} € (2.5)', 'Stylo : {{S}} € (1.5)',
             'total : {{eval:L+C+S}} €')
    + F3_CONSIGNE.strip() + '\n\nZoé achète un cahier à $?$ euros, un stylo à $?$ euros et un '
    'livre à $?$ euros. Elle paie en tout $?$ euros.',
    [var('L', '8..25'), var('C', '2..7'), var('S', '1..6')],
    [
        case('{{C}}', [
            autre('{{S}}', 'le prix du stylo', 'du cahier', 'Deux nombres inversés'),
            autre('{{L}}', 'le prix du livre', 'du cahier', 'Deux nombres inversés'),
            autre('{{eval:L+C+S}}', 'le prix total', 'du cahier seul',
                  'Total à la place d\'une partie'),
        ]),
        case('{{S}}', [
            autre('{{C}}', 'le prix du cahier', 'du stylo', 'Deux nombres inversés'),
            autre('{{L}}', 'le prix du livre', 'du stylo', 'Deux nombres inversés'),
            autre('{{eval:L+C+S}}', 'le prix total', 'du stylo seul',
                  'Total à la place d\'une partie'),
        ]),
        case('{{L}}', [
            autre('{{C}}', 'le prix du cahier', 'du livre', 'Deux nombres inversés'),
            autre('{{S}}', 'le prix du stylo', 'du livre', 'Deux nombres inversés'),
            autre('{{eval:L+C+S}}', 'le prix total', 'du livre seul',
                  'Total à la place d\'une partie'),
        ]),
        case('{{eval:L+C+S}}', [
            erreur('{{L}}', 'C\'est le prix du livre seul : le total regroupe les trois barres, '
                   'il est au bout de l\'accolade.', 'Une partie à la place du total'),
        ]),
    ],
    [
        '**Lire le schéma.** Chaque barre porte le nom d\'un achat et son prix : le livre coûte '
        '${{L}}~\\unit{€}$, le cahier ${{C}}~\\unit{€}$, le stylo ${{S}}~\\unit{€}$. L\'accolade '
        'regroupe les trois barres : c\'est le prix total, ${{eval:L+C+S}}~\\unit{€}$.',
        '**Compléter.** L\'énoncé ne cite pas les achats dans l\'ordre du schéma : Zoé achète un '
        'cahier à $' + couleur('{{C}}') + '$ euros, un stylo à $' + couleur('{{S}}') + '$ euros '
        'et un livre à $' + couleur('{{L}}') + '$ euros ; elle paie en tout $'
        + couleur('{{eval:L+C+S}}') + '$ euros.',
    ],
    F3_HINT,
    ['L>C', 'C>S'],
)

# v2 : triathlon. Natation n (50 à 1 500 m par pas de 50), vélo 15 n, course 5 n.
F3_TRI = variation(
    'Ce schéma en barres représente les trois épreuves d\'un triathlon.'
    + schema('Natation : ' + mille('n') + ' m (2)', 'Vélo : ' + mille('15*n') + ' m (9)',
             'Course : ' + mille('5*n') + ' m (4.5)', 'total : ' + mille('21*n') + ' m')
    + F3_CONSIGNE.strip() + '\n\nLe triathlon commence par $?$ mètres de natation. Le parcours à '
    'vélo, $?$ mètres, est $15$ fois plus long que la natation, et la course à pied $5$ fois plus '
    'longue que la natation. Le triathlon fait en tout $?$ mètres.',
    [var('q', '4..30'), var('n', 'eval:50*q')],
    [
        case('{{n}}', [
            autre('{{eval:15*n}}', 'la longueur du parcours à vélo', 'de la natation',
                  'Deux nombres inversés'),
            autre('{{eval:5*n}}', 'la longueur de la course à pied', 'de la natation',
                  'Deux nombres inversés'),
            autre('{{eval:21*n}}', 'la longueur de tout le triathlon', 'de la natation seule',
                  'Total à la place d\'une partie'),
        ]),
        case('{{eval:15*n}}', [
            autre('{{eval:5*n}}', 'la longueur de la course à pied', 'du parcours à vélo',
                  'Deux nombres inversés'),
            autre('{{n}}', 'la longueur de la natation', 'du parcours à vélo',
                  'Deux nombres inversés'),
            autre('{{eval:21*n}}', 'la longueur de tout le triathlon', 'du vélo seul',
                  'Total à la place d\'une partie'),
        ]),
        case('{{eval:21*n}}', [
            erreur('{{eval:15*n}}', 'C\'est la longueur du parcours à vélo : le total regroupe '
                   'les trois barres, il est au bout de l\'accolade.',
                   'Une partie à la place du total'),
        ]),
    ],
    [
        '**Lire le schéma.** Natation ${{n}}~\\unit{m}$, vélo ${{eval:15*n}}~\\unit{m}$, course '
        '${{eval:5*n}}~\\unit{m}$ ; l\'accolade regroupe les trois : ${{eval:21*n}}~\\unit{m}$.',
        '**Vérifier les « fois plus ».** ${{n}} \\times 15 = {{eval:15*n}}$ et ${{n}} \\times 5 = '
        '{{eval:5*n}}$ : le schéma va bien avec l\'énoncé.',
        '**Compléter.** $' + couleur('{{n}}') + '$ mètres de natation, $' + couleur('{{eval:15*n}}')
        + '$ mètres à vélo, $' + couleur('{{eval:21*n}}') + '$ mètres en tout.',
    ],
    F3_HINT,
)

# v3 : randonnée en trois étapes ; la deuxième manque, le total est donné.
F3_RANDO = variation(
    'Ce schéma en barres représente une randonnée en trois étapes.'
    + schema('Étape 1 : {{a}} km ({{a}})', 'Étape 2 : ? ({{b}})', 'Étape 3 : {{c}} km ({{c}})',
             'total : {{eval:a+b+c}} km')
    + 'Complète l\'énoncé pour qu\'il corresponde au schéma, puis réponds à la question.\n\n'
    'Une randonnée de $?$ kilomètres se fait en trois étapes. La première étape fait $?$ '
    'kilomètres et la troisième ${{c}}$ kilomètres. Combien de kilomètres fait la deuxième '
    'étape ?\n\nLa deuxième étape fait $?$ kilomètres.',
    [var('a', '8..20'), var('b', '8..20'), var('c', '8..20')],
    [
        case('{{eval:a+b+c}}', [
            erreur('{{a}}', 'C\'est la longueur de la première étape : le total est au bout de '
                   'l\'accolade, il regroupe les trois barres.', 'Une partie à la place du total'),
            erreur('{{c}}', 'C\'est la longueur de la troisième étape : le total est au bout de '
                   'l\'accolade, il regroupe les trois barres.', 'Une partie à la place du total'),
        ]),
        case('{{a}}', [
            autre('{{eval:a+b+c}}', 'la longueur de toute la randonnée', 'de la première étape',
                  'Total à la place d\'une partie'),
            autre('{{c}}', 'la longueur de la troisième étape', 'de la première',
                  'Deux nombres inversés'),
        ]),
        case('{{b}}', [
            erreur('{{eval:b+c}}', 'Tu n\'as retiré que la première étape : retire aussi la '
                   'troisième.', 'Une seule étape retirée'),
            erreur('{{eval:a+c}}', 'C\'est la longueur des deux étapes connues : retire-la du '
                   'total.', 'Somme des parties connues'),
            erreur('{{eval:a+b+c}}', 'C\'est la longueur de toute la randonnée : la deuxième '
                   'étape n\'en est qu\'une partie.', 'Total à la place d\'une partie'),
        ]),
    ],
    [
        '**Lire le schéma.** L\'accolade regroupe les trois étapes : la randonnée fait $'
        + couleur('{{eval:a+b+c}}') + '$ kilomètres. La barre « Étape 1 » porte $'
        + couleur('{{a}}') + '$ kilomètres.',
        '**La partie cherchée.** Les deux étapes connues font ${{a}} + {{c}} = {{eval:a+c}}$ '
        'kilomètres ; la deuxième fait ${{eval:a+b+c}} - {{eval:a+c}} = ' + couleur('{{b}}')
        + '$ kilomètres.',
    ],
    F3_HINT,
    ['a!=c', 'a!=b', 'b!=c', 'b+c!=a+c'],
)

# v4 : partage avec reste. N = k × q + r gâteaux entre k amis.
F3_RESTE = variation(
    'Léo partage ${{eval:k*q+r}}$ gâteaux entre ${{k}}$ amis : chacun en reçoit autant, le plus '
    'possible. Ce schéma en barres représente le partage.'
    + selon('k', [schema('Amis : ' + segments('{{q}}', n), 'Reste : {{r}} (0.6)',
                         'total : {{eval:k*q+r}} gâteaux') for n in range(4, 10)], 4)
    + F3_CONSIGNE.strip() + '\n\nChaque ami reçoit $?$ gâteaux, et il reste $?$ gâteaux.',
    [var('k', '4..9'), var('q', '2..9'), var('r0', '1..8'), var('r', 'eval:r0')],
    [
        case('{{q}}', [
            autre('{{r}}', 'le nombre de gâteaux qui restent', 'de la part d\'un ami',
                  'Deux nombres inversés'),
            autre('{{eval:k*q+r}}', 'le nombre de gâteaux en tout', 'de la part d\'un seul ami',
                  'Total à la place d\'une partie'),
        ]),
        case('{{r}}', [
            erreur('0', 'Il reste des gâteaux : regarde la barre « Reste ».', 'Reste oublié'),
            autre('{{q}}', 'la part d\'un ami', 'des gâteaux qui restent', 'Deux nombres inversés'),
            erreur('{{eval:k*q}}', 'C\'est le nombre de gâteaux distribués : le reste, ce sont '
                   'ceux qui ne sont pas partagés.', 'Gâteaux distribués à la place du reste'),
        ]),
    ],
    [
        '**Lire le schéma.** La barre « Amis » a ${{k}}$ parts égales de ${{q}}$ : chaque ami '
        'reçoit $' + couleur('{{q}}') + '$ gâteaux. La barre « Reste » porte $' + couleur('{{r}}')
        + '$ : il reste $' + couleur('{{r}}') + '$ gâteau{{if:r>1|x|}}.',
        '**Vérifier.** ${{k}} \\times {{q}} + {{r}} = {{eval:k*q}} + {{r}} = {{eval:k*q+r}}$, et le '
        'reste ${{r}}$ est plus petit que ${{k}}$ : on ne peut plus donner un gâteau à chacun.',
    ],
    F3_HINT,
    ['r0<k', 'q!=r'],
)

V_A = {'L': '12', 'C': '4', 'S': '2'}
V_T = {'q': '8', 'n': '400'}
V_R = {'a': '12', 'b': '9', 'c': '15'}
V_P = {'k': '5', 'q': '6', 'r0': '3', 'r': '3'}
SPECS_F3 = [
    spec('Achats : cahier 4, stylo 2, livre 12, total 18', 0, V_A, 'correct',
         ['4', '2', '12', '18']),
    spec('Achats : cahier et stylo inversés', 0, V_A, 'incorrect', ['2', '2', '12', '18'],
         'C\'est le prix du stylo : cette case parle du cahier.'),
    spec('Achats : livre dans la case du stylo', 0, V_A, 'incorrect', ['4', '12', '12', '18'],
         'C\'est le prix du livre : cette case parle du stylo.'),
    spec('Achats : total dans la case du livre', 0, V_A, 'incorrect', ['4', '2', '18', '18'],
         'C\'est le prix total : cette case parle du livre seul.'),
    spec('Achats : livre à la place du total', 0, V_A, 'incorrect', ['4', '2', '12', '12'],
         'C\'est le prix du livre seul : le total regroupe les trois barres, il est au bout de '
         'l\'accolade.'),
    spec('Triathlon : 400 m, 6 000 m, 8 400 m', 1, V_T, 'correct',
         ['400', '6\\,000', '8\\,400']),
    {**spec('Triathlon : 6000 sans espace, juste mais mal espacé', 1, V_T, 'unoptimal_form',
            ['400', '6000', '8\\,400']),
     'expected': {'status': 'unoptimal_form', 'constraintViolations': ['spaces']}},
    spec('Triathlon : natation 1 500 m, total 31 500 m', 1, {'q': '30', 'n': '1500'}, 'correct',
         ['1\\,500', '22\\,500', '31\\,500']),
    spec('Triathlon : course dans la case du vélo', 1, V_T, 'incorrect',
         ['400', '2\\,000', '8\\,400'],
         'C\'est la longueur de la course à pied : cette case parle du parcours à vélo.'),
    spec('Triathlon : vélo dans la case de la natation', 1, V_T, 'incorrect',
         ['6\\,000', '6\\,000', '8\\,400'],
         'C\'est la longueur du parcours à vélo : cette case parle de la natation.'),
    spec('Triathlon : total dans la case de la natation', 1, V_T, 'incorrect',
         ['8\\,400', '6\\,000', '8\\,400'],
         'C\'est la longueur de tout le triathlon : cette case parle de la natation seule.'),
    spec('Triathlon : vélo à la place du total', 1, V_T, 'incorrect',
         ['400', '6\\,000', '6\\,000'],
         'C\'est la longueur du parcours à vélo : le total regroupe les trois barres, il est au '
         'bout de l\'accolade.'),
    spec('Randonnée : 36, 12, 9', 2, V_R, 'correct', ['36', '12', '9']),
    spec('Randonnée : première étape à la place du total', 2, V_R, 'incorrect',
         ['12', '12', '9'],
         'C\'est la longueur de la première étape : le total est au bout de l\'accolade, il '
         'regroupe les trois barres.'),
    spec('Randonnée : total dans la case de la première étape', 2, V_R, 'incorrect',
         ['36', '36', '9'],
         'C\'est la longueur de toute la randonnée : cette case parle de la première étape.'),
    spec('Randonnée : troisième étape à la place de la première', 2, V_R, 'incorrect',
         ['36', '15', '9'],
         'C\'est la longueur de la troisième étape : cette case parle de la première.'),
    spec('Randonnée : 36 − 12 = 24', 2, V_R, 'incorrect', ['36', '12', '24'],
         'Tu n\'as retiré que la première étape : retire aussi la troisième.'),
    spec('Randonnée : 12 + 15 = 27', 2, V_R, 'incorrect', ['36', '12', '27'],
         'C\'est la longueur des deux étapes connues : retire-la du total.'),
    spec('Randonnée : total à la place de la deuxième étape', 2, V_R, 'incorrect',
         ['36', '12', '36'],
         'C\'est la longueur de toute la randonnée : la deuxième étape n\'en est qu\'une partie.'),
    spec('Reste : 33 gâteaux entre 5 → 6, reste 3', 3, V_P, 'correct', ['6', '3']),
    spec('Reste : nombres inversés', 3, V_P, 'incorrect', ['3', '6'],
         'C\'est le nombre de gâteaux qui restent : cette case parle de la part d\'un ami.'),
    spec('Reste : total à la place de la part', 3, V_P, 'incorrect', ['33', '3'],
         'C\'est le nombre de gâteaux en tout : cette case parle de la part d\'un seul ami.'),
    spec('Reste : reste oublié (0)', 3, V_P, 'incorrect', ['6', '0'],
         'Il reste des gâteaux : regarde la barre « Reste ».'),
    spec('Reste : gâteaux distribués (30)', 3, V_P, 'incorrect', ['6', '30'],
         'C\'est le nombre de gâteaux distribués : le reste, ce sont ceux qui ne sont pas '
         'partagés.'),
    spec('Reste : 9 amis, 59 gâteaux → 6, reste 5', 3, {'k': '9', 'q': '6', 'r0': '5', 'r': '5'},
         'correct', ['6', '5']),
]

F3 = modele(
    'Schéma en barres : compléter l\'énoncé',
    'Un schéma en barres donné (nombres et noms des barres) : compléter l\'énoncé qui lui '
    'correspond ; trois achats et leur total, triathlon (15 fois et 5 fois plus), randonnée dont '
    'une étape manque, partage avec reste ; pièges : deux nombres inversés, total à la place '
    'd\'une partie, reste oublié',
    2, 120, [F3_ACHATS, F3_TRI, F3_RANDO, F3_RESTE], SPECS_F3, ESPACES, rangement=INCONNU)


# =============================================================================================
# F6 — 6-143 : motif répétitif (frise de formes). Formes : 0 rond rouge, 1 carré bleu,
# 2 triangle vert, 3 étoile orange.
# =============================================================================================

NOMS = ['rond rouge', 'carré bleu', 'triangle vert', 'étoile orange']
LE_NOM = ['le rond rouge', 'le carré bleu', 'le triangle vert', 'l\'étoile orange']
UN_NOM = ['un rond rouge', 'un carré bleu', 'un triangle vert', 'une étoile orange']

MACRO_FORME = [
    'macro forme(k, x, y):',
    '    si k == 0:',
    '        cercle(point(x, y, visible=faux), rayon=0.36, couleur="rouge", remplissage="rouge", '
    'opacite_fond=1)',
    '    si k == 1:',
    '        polygone(point(x - 0.32, y - 0.32, visible=faux), point(x + 0.32, y - 0.32, '
    'visible=faux), point(x + 0.32, y + 0.32, visible=faux), point(x - 0.32, y + 0.32, '
    'visible=faux), couleur="bleu", remplissage="bleu", opacite_fond=1)',
    '    si k == 2:',
    '        polygone(point(x - 0.38, y - 0.32, visible=faux), point(x + 0.38, y - 0.32, '
    'visible=faux), point(x, y + 0.36, visible=faux), couleur="vert", remplissage="vert", '
    'opacite_fond=1)',
    '    si k == 3:',
    '        polygone(' + ', '.join(
        'point(x + {:.3f}, y + {:.3f}, visible=faux)'.format(*p) for p in [
            (0.0, 0.4), (0.094, 0.129), (0.38, 0.124), (0.152, -0.049), (0.235, -0.324),
            (0.0, -0.16), (-0.235, -0.324), (-0.152, -0.049), (-0.38, 0.124), (-0.094, 0.129)])
    + ', couleur="orange", remplissage="orange", opacite_fond=1)',
]

# Catalogue des blocs (aucun n'a de période plus courte que sa longueur ; tous ont un rond).
F6_BLOCS = [
    [0, 1], [2, 0], [0, 3],
    [0, 0, 1], [0, 2, 3], [1, 0, 2],
    [0, 1, 1, 2], [0, 2, 0, 3], [3, 0, 1, 2],
    [0, 1, 2, 2, 3], [0, 0, 1, 2, 1], [2, 0, 3, 0, 1],
    [0, 1, 2, 3, 2, 1], [0, 0, 1, 1, 2, 3], [1, 0, 2, 0, 3, 3],
]
# Blocs de 4 à 6 formes qui ont les quatre formes (v2).
F6_BLOCS_4 = [
    [3, 0, 1, 2], [0, 2, 1, 3], [1, 3, 2, 0],
    [0, 1, 2, 2, 3], [2, 0, 3, 0, 1], [3, 1, 0, 2, 1],
    [0, 1, 2, 3, 2, 1], [0, 0, 1, 1, 2, 3], [1, 0, 2, 0, 3, 3],
]


def periode(b):
    for p in range(1, len(b)):
        if len(b) % p == 0 and b == b[:p] * (len(b) // p):
            return p
    return len(b)


for b_ in F6_BLOCS + F6_BLOCS_4:
    assert periode(b_) == len(b_), b_
for b_ in F6_BLOCS_4:
    assert set(b_) == {0, 1, 2, 3}, b_


def nb_blocs(b):
    return 3 if len(b) <= 4 else 2


def frise(b, n_blocs):
    """Lignes d'appel de la macro : n_blocs fois le bloc b, une rangée, formes espacées de 1."""
    formes = b * n_blocs
    return [f'forme({k}, {0.6 + j:.1f}, 0)' for j, k in enumerate(formes)]


def description_frise(b, n_blocs):
    formes = b * n_blocs
    return ('Une frise de ' + str(len(formes)) + ' formes, de gauche à droite : '
            + ', '.join(NOMS[k] for k in formes) + '.')


def fenetre_frise(n):
    """Fenêtre d'une rangée de n formes (centres en 0,6 ; 1,6 ; …) : hauteur ≥ largeur / 4."""
    largeur = n + 0.2
    demi = max(largeur / 4 + 0.05, 1.2) / 2
    return f'fenetre: 0 ; {largeur:.1f} ; {-demi:.2f} ; {demi:.2f}'


def figure_frise(blocs, var_c, n_blocs_de):
    """Bloc figure dont le contenu dépend du motif tiré (var_c indexe `blocs`)."""
    lignes = [
        selon(var_c, [fenetre_frise(len(b) * n_blocs_de(b)) for b in blocs]),
        'taille: grande',
        'description: ' + selon(var_c, [description_frise(b, n_blocs_de(b)) for b in blocs]),
        '---',
        *MACRO_FORME,
        selon(var_c, ['\n'.join(frise(b, n_blocs_de(b))) for b in blocs]),
    ]
    return bloc('figure', *lignes)


def figure_une_forme(k):
    lignes = ['fenetre: -0.6 ; 0.6 ; -0.6 ; 0.6', 'taille: petite',
              'description: ' + UN_NOM[k][0].upper() + UN_NOM[k][1:] + '.', '---', *MACRO_FORME,
              f'forme({k}, 0, 0)']
    return lignes


def choix_formes():
    lignes = ['````choix']
    for k in range(4):
        fig = ['```figure', *figure_une_forme(k), '```']
        lignes.append('- ' + fig[0])
        lignes += ['  ' + x for x in fig[1:]]
    lignes.append('````')
    return '\n'.join(lignes)


F6_HINT = 'Combien de blocs entiers avant cette forme ?'
F6_INTRO = 'Dans cette frise, un même bloc de formes revient toujours dans le même ordre.\n\n'


def noms_bloc(b):
    return ', '.join(NOMS[k] for k in b)


# v1 : longueur du bloc.
F6_LONGUEUR = variation(
    F6_INTRO + figure_frise(F6_BLOCS, 'c', nb_blocs) + '\n\nCombien de formes le bloc qui se '
    'répète compte-t-il ?\n\nLe bloc compte $?$ formes.',
    [var('c', '0..14'), var('L', 'eval:' + sel('c', [len(b) for b in F6_BLOCS])),
     var('nb', 'eval:' + sel('c', [nb_blocs(b) for b in F6_BLOCS])),
     var('dif', 'eval:' + sel('c', [len(set(b)) for b in F6_BLOCS]))],
    [case('{{L}}', [
        erreur('{{eval:nb*L}}', 'C\'est le nombre de formes dessinées : cherche le plus petit '
               'groupe de formes qui revient.', 'Toutes les formes comptées'),
        erreur('{{dif}}', 'C\'est le nombre de formes différentes : le bloc peut contenir '
               'deux fois la même forme.', 'Formes différentes comptées'),
    ])],
    [
        '**Trouver le bloc.** ' + selon('c', [
            'La frise commence par : ' + noms_bloc(b) + ' ; puis ces formes reviennent dans le '
            'même ordre.' for b in F6_BLOCS]),
        '**Le compter.** Le bloc compte $' + couleur('{{L}}') + '$ formes ; la frise en montre '
        '${{nb}}$ fois, soit ${{nb}} \\times {{L}} = {{eval:nb*L}}$ formes.',
    ],
    'Repère la première forme : où la frise recommence-t-elle avec les mêmes formes, dans le '
    'même ordre ?',
)

# v2 : forme d'un rang lointain (30 à 100) ; choix d'origine = numéro de la forme.
F6_RANG_VARS = [
    var('c', '0..8'), var('R', '30..100'),
    var('L', 'eval:' + sel('c', [len(b) for b in F6_BLOCS_4])),
    var('q', 'eval:floor(R/L)'), var('rr', 'eval:mod(R,L)'),
]
for j in range(6):
    F6_RANG_VARS.append(var(f'f{j}', 'eval:' + sel('c', [b[j] if j < len(b) else 0
                                                        for b in F6_BLOCS_4])))
# position dans le bloc (1 à L) de la forme n° R : rr, ou L si rr = 0
F6_RANG_VARS.append(var('pos', 'eval:rr+L*' + ind('rr', 0)))
F6_RANG_VARS.append(var('ans', 'eval:' + '+'.join(f'f{j}*{ind("pos", j + 1)}' for j in range(6))))

NOM_ANS = selon('ans', LE_NOM)
F6_RANG = variation(
    F6_INTRO + figure_frise(F6_BLOCS_4, 'c', lambda b: 2) + '\n\nLa frise continue ainsi. '
    'Quelle est la forme n° ${{R}}$ ?\n\n' + choix_formes(),
    F6_RANG_VARS,
    [case('{{ans}}')],
    [
        '**Le bloc.** ' + selon('c', [
            'Il compte ' + str(len(b)) + ' formes : ' + noms_bloc(b) + '.' for b in F6_BLOCS_4]),
        '**Les blocs entiers.** ${{R}} = {{L}} \\times {{q}} + {{rr}}$. {{if:rr==0|La forme n° '
        '${{R}}$ termine le ${{q}}$-ième bloc : c\'est la dernière forme du bloc.|Après ${{q}}$ '
        'blocs entiers (${{eval:L*q}}$ formes), il reste ${{rr}}$ forme{{if:rr>1|s|}} : la '
        'forme n° ${{R}}$ est la forme n° ${{rr}}$ du bloc.}}',
        '**La forme.** La forme n° ${{R}}$ est $' + couleur('\\text{' + NOM_ANS + '}') + '$.',
    ],
    F6_HINT,
)

# v3 : combien de ronds parmi les 60 premières formes.
F6_RONDS = variation(
    F6_INTRO + figure_frise(F6_BLOCS, 'c', lambda b: 2) + '\n\nLa frise continue ainsi. '
    'Combien y a-t-il de ronds rouges parmi les $60$ premières formes ?\n\n'
    'Il y a $?$ ronds rouges.',
    [var('c', '0..14'), var('L', 'eval:' + sel('c', [len(b) for b in F6_BLOCS])),
     var('kr', 'eval:' + sel('c', [b.count(0) for b in F6_BLOCS])),
     var('q', 'eval:60/L')],
    [case('{{eval:q*kr}}', [
        erreur('{{q}}', 'C\'est le nombre de blocs : compte les ronds rouges de chaque bloc.',
               'Nombre de blocs'),
        erreur('{{eval:(q+1)*kr}}', 'Tu as compté un bloc de trop : $60$ formes font '
               'exactement ${{q}}$ blocs.', 'Un bloc de trop'),
        erreur('{{eval:60*kr}}', 'Tu as multiplié $60$ par le nombre de ronds d\'un bloc : $60$ '
               'compte des formes, pas des blocs.', 'Formes prises pour des blocs'),
    ])],
    [
        '**Le bloc.** ' + selon('c', [
            'Il compte ' + str(len(b)) + ' formes : ' + noms_bloc(b) + ', dont '
            + str(b.count(0)) + ' rond' + ('s' if b.count(0) > 1 else '') + ' rouge'
            + ('s' if b.count(0) > 1 else '') + '.' for b in F6_BLOCS]),
        '**Les blocs entiers.** $60 \\div {{L}} = {{q}}$ : les $60$ premières formes font '
        'exactement ${{q}}$ blocs.',
        '**Les ronds.** ${{q}} \\times {{kr}} = ' + couleur('{{eval:q*kr}}') + '$ ronds rouges.',
    ],
    F6_HINT,
)

SPECS_F6 = [
    spec('Longueur : bloc rond, carré → 2', 0, {'c': '0', 'L': '2', 'nb': '3', 'dif': '2'},
         'correct', ['2']),
    spec('Longueur : bloc rond, rond, carré → 3', 0, {'c': '3', 'L': '3', 'nb': '3', 'dif': '2'},
         'correct', ['3']),
    spec('Longueur : 9 formes dessinées', 0, {'c': '3', 'L': '3', 'nb': '3', 'dif': '2'},
         'incorrect', ['9'],
         'C\'est le nombre de formes dessinées : cherche le plus petit groupe de formes qui '
         'revient.'),
    spec('Longueur : 2 formes différentes', 0, {'c': '3', 'L': '3', 'nb': '3', 'dif': '2'},
         'incorrect', ['2'],
         'C\'est le nombre de formes différentes : le bloc peut contenir deux fois la même '
         'forme.'),
    spec('Longueur : bloc de 6 → 6', 0, {'c': '13', 'L': '6', 'nb': '2', 'dif': '4'},
         'correct', ['6']),
    spec('Longueur : bloc de 6, 12 formes dessinées', 0,
         {'c': '13', 'L': '6', 'nb': '2', 'dif': '4'}, 'incorrect', ['12'],
         'C\'est le nombre de formes dessinées : cherche le plus petit groupe de formes qui '
         'revient.'),
    # bloc 3, 0, 1, 2 (étoile, rond, carré, triangle) ; 42 = 4 × 10 + 2 → rond
    spec('Rang : n° 42, bloc de 4 → la 2e forme, le rond', 1,
         {'c': '0', 'R': '42', 'L': '4', 'q': '10', 'rr': '2', 'f0': '3', 'f1': '0', 'f2': '1',
          'f3': '2', 'f4': '0', 'f5': '0', 'pos': '2', 'ans': '0'}, 'correct', ['0']),
    spec('Rang : n° 42, reste pris pour la forme suivante (carré)', 1,
         {'c': '0', 'R': '42', 'L': '4', 'q': '10', 'rr': '2', 'f0': '3', 'f1': '0', 'f2': '1',
          'f3': '2', 'f4': '0', 'f5': '0', 'pos': '2', 'ans': '0'}, 'incorrect', ['1']),
    spec('Rang : n° 40, bloc de 4 → la dernière forme, le triangle', 1,
         {'c': '0', 'R': '40', 'L': '4', 'q': '10', 'rr': '0', 'f0': '3', 'f1': '0', 'f2': '1',
          'f3': '2', 'f4': '0', 'f5': '0', 'pos': '4', 'ans': '2'}, 'correct', ['2']),
    spec('Rang : n° 40, compte qui commence à 0 (étoile)', 1,
         {'c': '0', 'R': '40', 'L': '4', 'q': '10', 'rr': '0', 'f0': '3', 'f1': '0', 'f2': '1',
          'f3': '2', 'f4': '0', 'f5': '0', 'pos': '4', 'ans': '2'}, 'incorrect', ['3']),
    # bloc 1, 0, 2, 0, 3, 3 ; 75 = 6 × 12 + 3 → triangle
    spec('Rang : n° 75, bloc de 6 → triangle', 1,
         {'c': '8', 'R': '75', 'L': '6', 'q': '12', 'rr': '3', 'f0': '1', 'f1': '0', 'f2': '2',
          'f3': '0', 'f4': '3', 'f5': '3', 'pos': '3', 'ans': '2'}, 'correct', ['2']),
    spec('Ronds : bloc rond, rond, carré → 20 × 2 = 40', 2,
         {'c': '3', 'L': '3', 'kr': '2', 'q': '20'}, 'correct', ['40']),
    spec('Ronds : nombre de blocs (20)', 2, {'c': '3', 'L': '3', 'kr': '2', 'q': '20'},
         'incorrect', ['20'], 'C\'est le nombre de blocs : compte les ronds rouges de chaque bloc.'),
    spec('Ronds : un bloc de trop (42)', 2, {'c': '3', 'L': '3', 'kr': '2', 'q': '20'},
         'incorrect', ['42'], 'Tu as compté un bloc de trop : $60$ formes font exactement $20$ '
         'blocs.'),
    spec('Ronds : 60 × 2 (120)', 2, {'c': '3', 'L': '3', 'kr': '2', 'q': '20'},
         'incorrect', ['120'], 'Tu as multiplié $60$ par le nombre de ronds d\'un bloc : $60$ '
         'compte des formes, pas des blocs.'),
    spec('Ronds : bloc de 5 à un rond → 12', 2, {'c': '9', 'L': '5', 'kr': '1', 'q': '12'},
         'correct', ['12']),
]

F6 = modele(
    'Motif répétitif : la forme d\'un rang lointain',
    'Frise de formes (rond, carré, triangle, étoile) dont un bloc revient toujours : longueur du '
    'bloc, forme d\'un rang lointain (30 à 100) par les blocs entiers et le reste, nombre de ronds '
    'parmi les 60 premières formes ; pièges : toutes les formes comptées, un bloc de trop',
    3, 90, [F6_LONGUEUR, F6_RANG, F6_RONDS], SPECS_F6, rangement=MOTIFS)


# =============================================================================================
# F8 — 6-143 : ce nombre est-il dans la suite ? Suite à pas constant a (2 à 8), départ u (2 à 9).
# =============================================================================================

F8_HINT = 'Combien faut-il ajouter au premier terme pour arriver à ce nombre ?'
F8_REGLE = 'On passe d\'un nombre au suivant en ajoutant toujours le même nombre.'


def terme(depart, x):
    """Le terme de la suite (départ `depart`, pas a) juste en dessous de x (expression)."""
    return f'{depart}+a*floor(({x}-{depart})/a)'


def f8_vars(depart, lo, hi):
    """Quatre nombres : y0 dans la suite, y1 = terme + 1, y2 = terme + a − 1, y3 = terme +
    moitié du pas (arrondie en dessous), chacun à partir d'un terme différent."""
    return [
        var('x0', f'{lo}..{hi}'), var('x1', f'{lo}..{hi}'), var('x2', f'{lo}..{hi}'),
        var('x3', f'{lo}..{hi}'),
        var('y0', 'eval:' + terme(depart, 'x0')),
        var('y1', 'eval:' + terme(depart, 'x1') + '+1'),
        var('y2', 'eval:' + terme(depart, 'x2') + '+a-1'),
        var('y3', 'eval:' + terme(depart, 'x3') + '+floor(a/2)'),
    ]


F8_DISTINCTS = ['y0!=y1', 'y0!=y2', 'y0!=y3', 'y1!=y2', 'y1!=y3', 'y2!=y3']
F8_CHOIX = bloc('choix', '- ${{y0}}$', '- ${{y1}}$', '- ${{y2}}$', '- ${{y3}}$')


def f8_examen(depart, nom_depart):
    """Le corrigé : chaque nombre moins le départ, divisé par le pas."""
    lignes = []
    for j in range(4):
        y = f'y{j}'
        qj = f'floor(({y}-{depart})/a)'
        rj = f'mod({y}-{depart},a)'
        if j == 0:
            fin = ' : c\'est un nombre entier de pas, $' + couleur('{{y0}}') + '$ est dans la suite.'
        else:
            fin = (' : il reste ${{eval:' + rj + '}}$, ${{' + y + '}}$ n\'est pas dans la suite.')
        lignes.append('- ${{' + y + '}} - ' + nom_depart + ' = {{eval:' + y + '-' + depart
                      + '}} = {{a}} \\times {{eval:' + qj + '}}' + ('' if j == 0 else ' + {{eval:'
                      + rj + '}}') + '$' + fin)
    return '\n'.join(lignes)


# v1 : suite depuis le début, nombres de 100 à 1 000.
F8_DEBUT = variation(
    'Voici le début d\'une suite de nombres : ${{u}}$, ${{eval:u+a}}$, ${{eval:u+2*a}}$, '
    '${{eval:u+3*a}}$, ${{eval:u+4*a}}$… ' + F8_REGLE + '\n\nUn seul de ces nombres est dans la '
    'suite. Lequel ?\n\n' + F8_CHOIX,
    [var('a', '3..8'), var('u', '2..9'), *f8_vars('u', 110, 990)],
    [case('0')],
    [
        '**La règle.** On part de ${{u}}$ et on ajoute ${{a}}$ à chaque fois : un nombre est dans '
        'la suite quand, en lui retirant ${{u}}$, on trouve un multiple de ${{a}}$.',
        '**Chaque nombre.**\n\n' + f8_examen('u', '{{u}}'),
    ],
    F8_HINT,
    F8_DISTINCTS,
)

# v2 : suite montrée à partir d'un terme lointain s (1 000 à 2 000), nombres de 2 100 à 10 000.
F8_LOIN = variation(
    'Voici quelques nombres qui se suivent dans une suite (ce ne sont pas les premiers) : '
    '…, ${{s}}$, ${{eval:s+a}}$, ${{eval:s+2*a}}$, ${{eval:s+3*a}}$, ${{eval:s+4*a}}$… '
    + F8_REGLE + '\n\nUn seul de ces nombres est dans la suite. Lequel ?\n\n' + F8_CHOIX,
    [var('a', '3..8'), var('u', '2..9'), var('m', '1000..2000'),
     var('s', 'eval:' + terme('u', 'm')), *f8_vars('s', 2100, 9990)],
    [case('0')],
    [
        '**La règle.** À partir de ${{s}}$, on ajoute ${{a}}$ à chaque fois : un nombre plus '
        'grand est dans la suite quand, en lui retirant ${{s}}$, on trouve un multiple de '
        '${{a}}$.',
        '**Chaque nombre.**\n\n' + f8_examen('s', '{{s}}'),
    ],
    'Combien faut-il ajouter au premier terme écrit pour arriver à ce nombre ?',
    F8_DISTINCTS + ['s>=1000'],
)

# v3 : le plus grand terme inférieur ou égal à N (saisie).
F8_T = 'u+a*floor((N-u)/a)'
F8_PLUS_GRAND = variation(
    'Voici le début d\'une suite de nombres : ${{u}}$, ${{eval:u+a}}$, ${{eval:u+2*a}}$, '
    '${{eval:u+3*a}}$, ${{eval:u+4*a}}$… ' + F8_REGLE + '\n\nQuel est le plus grand nombre de '
    'cette suite qui est inférieur ou égal à ${{N}}$ ?\n\n$?$',
    [var('a', '2..8'), var('u', '2..9'), var('N', '100..1000')],
    [case('{{eval:' + F8_T + '}}', [
        erreur('{{N}}', '${{N}}$ n\'est pas dans la suite : retire-lui ${{u}}$, tu ne trouves '
               'pas un multiple de ${{a}}$.', 'Le nombre lui-même'),
        erreur('{{eval:' + F8_T + '+a}}', 'Ce nombre est dans la suite, mais il est plus grand '
               'que ${{N}}$ : prends celui d\'avant.', 'Le terme d\'après'),
        erreur('{{eval:a*floor(N/a)}}', 'C\'est un multiple de ${{a}}$, mais la suite part de '
               '${{u}}$ : ses nombres sont ${{u}}$ plus des multiples de ${{a}}$.',
               'Multiple du pas sans le départ'),
    ])],
    [
        '**Retirer le départ.** ${{N}} - {{u}} = {{eval:N-u}}$.',
        '**Les pas entiers.** ${{eval:N-u}} = {{a}} \\times {{eval:floor((N-u)/a)}} + '
        '{{eval:mod(N-u,a)}}$ : on peut faire ${{eval:floor((N-u)/a)}}$ pas de ${{a}}$ sans '
        'dépasser ${{N}}$.',
        '**Le terme.** ${{u}} + {{a}} \\times {{eval:floor((N-u)/a)}} = ' + couleur('{{eval:'
                                                                                   + F8_T + '}}')
        + '$ ; le suivant, ${{eval:' + F8_T + '+a}}$, dépasse ${{N}}$.',
    ],
    F8_HINT,
    ['mod(N-u,a)!=0', 'mod(u,a)!=0', 'mod(N,a)!=0'],
)


def v8(a, u, xs):
    """Variables d'une spec F8 v1 : x0..x3 tirés, y calculés comme le modèle."""
    d = {'a': str(a), 'u': str(u)}
    off = [0, 1, a - 1, a // 2]
    for j, x in enumerate(xs):
        d[f'x{j}'] = str(x)
        d[f'y{j}'] = str(u + a * ((x - u) // a) + off[j])
    return d


V8a = v8(7, 3, [500, 300, 700, 900])   # y : 500, 298+1, 696+6, 899+3
V8b = {**v8(5, 1504, [3000, 4000, 5000, 7000]), 'u': '4', 'm': '1505', 's': '1504'}
SPECS_F8 = [
    spec('Début : le terme de la suite', 0, V8a, 'correct', ['0']),
    spec('Début : décalé de 1', 0, V8a, 'incorrect', ['1']),
    spec('Début : décalé de pas − 1', 0, V8a, 'incorrect', ['2']),
    spec('Début : décalé de la moitié du pas', 0, V8a, 'incorrect', ['3']),
    spec('Loin : le terme de la suite', 1, V8b, 'correct', ['0']),
    spec('Loin : décalé de 1', 1, V8b, 'incorrect', ['1']),
    spec('Plus grand : pas 7 depuis 3, N = 510 → 507', 2, {'a': '7', 'u': '3', 'N': '510'},
         'correct', ['507']),
    spec('Plus grand : N lui-même', 2, {'a': '7', 'u': '3', 'N': '510'}, 'incorrect', ['510'],
         '$510$ n\'est pas dans la suite : retire-lui $3$, tu ne trouves pas un multiple de $7$.'),
    spec('Plus grand : le terme d\'après (514)', 2, {'a': '7', 'u': '3', 'N': '510'},
         'incorrect', ['514'],
         'Ce nombre est dans la suite, mais il est plus grand que $510$ : prends celui d\'avant.'),
    spec('Plus grand : multiple de 7 sans le départ (504)', 2, {'a': '7', 'u': '3', 'N': '510'},
         'incorrect', ['504'],
         'C\'est un multiple de $7$, mais la suite part de $3$ : ses nombres sont $3$ plus des '
         'multiples de $7$.'),
    spec('Plus grand : N = 600 → 598', 2, {'a': '7', 'u': '3', 'N': '600'}, 'correct', ['598']),
    spec('Plus grand : pas 4 depuis 9, N = 999 → 997', 2, {'a': '4', 'u': '9', 'N': '999'},
         'correct', ['997']),
]

F8 = modele(
    'Ce nombre est-il dans la suite ?',
    'Suite à pas constant (pas 2 à 8, départ 2 à 9) : reconnaître, parmi quatre grands nombres, '
    'le seul qui est dans la suite (écart au premier terme multiple du pas), suite montrée '
    'depuis le début ou à partir d\'un terme lointain ; plus grand terme inférieur ou égal à un '
    'nombre ; pièges : le nombre lui-même, le terme d\'après, un multiple du pas sans le départ',
    4, 120, [F8_DEBUT, F8_LOIN, F8_PLUS_GRAND], SPECS_F8, ESPACES, rangement=MOTIFS)


ecrire('f2-choisir-le-calcul', F2)
ecrire('f3-schema-completer-l-enonce', F3)
ecrire('f6-motif-repetitif', F6)
ecrire('f8-nombre-dans-la-suite', F8)
print('4 modèles écrits dans', DOSSIER)
