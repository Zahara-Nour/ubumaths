"""Écrit les modèles neufs du chantier idees-6e-problemes dans scripts/questions/idees-6e-problemes-neufs/.

Phase 0 validée par David le 2026-11-27 (« je suis tes recos », journal
docs/wip/idees-6e-problemes-progress.md) : N1 à N5. On reprend l'idée de l'autre plateforme, pas
sa forme ni son texte : balances à deux pesées, deux nombres inconnus (billets, devinettes avec le
produit), problèmes à plusieurs étapes avec des décimaux, trier les informations d'un énoncé,
résoudre un problème qui a des données inutiles.

Ni theme, ni domain, ni subdomain, ni id : le rangement (nœud + tag) se fera par migration, après
la création en brouillon. Points : N1, N2 → 6-142 (modèles pré-algébriques) ; N3 → 6-120
(problèmes de multiplications de décimaux) ; N4, N5 → 5-001 (Q1 : « additionner, soustraire,
multiplier et diviser pour résoudre des problèmes », point de 5e, niveaux 6e et 5e). Q3 : le
Oui / Non (régime, surcharge) devient le nombre qui le tranche, tiré pour être toujours positif.

Choix d'écriture :
- N1 : figure de balance de d962df2c (fléau, socle, boîtes étiquetées), objets rangés par lignes
  de quatre ; la masse est écrite à la main avec sa virgule (texte de figure, pas une formule) ;
- N1 v2 : les deux objets multipliés, (a, b) parmi (2, 3), (2, 4), (3, 4) : on multiplie la
  seconde pesée par a, on soustrait, on divise par b − a ;
- N2 : les essais organisés ou « si tous les billets étaient des billets de 5 € », sans lettre ;
  le plus petit nombre dans la première case (la consigne le dit) ;
- N3 : une case par variation, unité attendue pour les kilogrammes et les euros ; les calories
  sont écrites après la case (« calories » n'est pas une unité du juge) ;
- N4 : les informations dans l'ordre de l'énoncé (`melanger: non`, sinon « Aucune » tomberait
  au milieu), « Aucune » en dernier (choix 5) ; la bonne réponse dépend de la situation t ;
- prix tirés en centimes (entiers), écrits en grandeur (`{{eval:(…)[€]}}`) dans le texte et
  comme un prix (14,30) dans les formules du corrigé ;
- variables d'une lettre ou de lettres sans sens pour le juge : `ec` serait lu e × c (`e` est
  Euler).

Règles suivies (couvrir-un-niveau.md § 5) : erreurs prévues par case d'écriture ordinaire (de
vraies erreurs d'élèves, sans en inventer pour atteindre trois), chacune avec sa spec `incorrect`
qui nomme son message ; un coup de pouce par variation, qui ne donne jamais la réponse. Les choix
n'ont pas d'erreurs prévues.

Usage : python3 docs/wip/questions/idees-6e-problemes-neufs.py scripts/questions/idees-6e-problemes-neufs
"""
import json
import os
import sys

DOSSIER = sys.argv[1]

PRIMAIRE = '\\textcolor{{{color:primary.0}}}'
ZEROS_LIBRES = {'constraints': {'zeros': 'off', 'spacesFromFourDigits': True}}
ESPACES = {'constraints': {'spacesFromFourDigits': True}}
INCONNU = {'noeud': 'Algèbre > Premiers pas algébriques > nombre inconnu', 'point': '6-142'}
MULTIPLICATION = {'noeud': 'Nombres et calculs > Décimaux : calculs > multiplication',
                  'point': '6-120'}
PROBLEMES = {'noeud': 'Nombres et calculs > Décimaux : calculs', 'point': '5-001'}


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
    return '+'.join(f'{x}*(1-min(abs({v}-{k}),1))' for k, x in enumerate(valeurs))


def d(expr):
    return '{{eval:' + expr + ';d}}'


def prix(c):
    """Prix en grandeur en euros, à partir d'un nombre de centimes : « 14,37 € », « 12 € »."""
    return '{{eval:((' + c + ')/100)[€]}}'


def prix_nu(c):
    """Prix (centimes) sans unité écrit comme un prix dans une formule : 14,30 ; 12."""
    return ('{{if:mod(' + c + ',100)==0|{{eval:(' + c + ')/100;d}}|{{eval:(' + c
            + ')/100;d2}}}}')


def bloc(nom, *lignes):
    return '```' + nom + '\n' + '\n'.join(lignes) + '\n```'


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
# N1 — 6-142 : balances en équilibre, la masse de deux objets (boules B, étoiles E).
# =============================================================================================

def balance(objets, masse, description):
    """Figure d'une balance en équilibre : `objets` (lettres) sur le plateau de gauche, rangés
    par lignes de quatre ; `masse` (texte) sur le plateau de droite."""
    lignes = (len(objets) + 3) // 4
    haut = 2.6 + 1.0 * (lignes - 1)
    l = [
        'fenetre: 0 ; 9 ; -0.4 ; ' + str(round(haut, 1)),
        'description: ' + description,
        '---',
        'S1 = point(3.95, 0, visible=faux)',
        'S2 = point(5.05, 0, visible=faux)',
        'S3 = point(4.5, 1.15, visible=faux)',
        'polygone(S1, S2, S3, couleur="noir", remplissage="gris", opacite_fond=1)',
        'F1 = point(0.3, 1.2, visible=faux)',
        'F2 = point(8.7, 1.2, visible=faux)',
        'segment(F1, F2, epaisseur=4)',
    ]
    for i, lettre in enumerate(objets):
        x0 = 0.4 + (i % 4) * 0.9
        y0 = 1.3 + (i // 4) * 1.0
        x1, y1 = x0 + 0.8, y0 + 0.9
        n = f'O{i}'
        l += [
            f'{n}a = point({x0:.1f}, {y0:.1f}, visible=faux)',
            f'{n}b = point({x1:.1f}, {y0:.1f}, visible=faux)',
            f'{n}c = point({x1:.1f}, {y1:.1f}, visible=faux)',
            f'{n}d = point({x0:.1f}, {y1:.1f}, visible=faux)',
            f'polygone({n}a, {n}b, {n}c, {n}d, couleur="noir", remplissage="jaune", '
            'opacite_fond=0.3)',
            f'texte({x0 + 0.4:.1f}, {y0 + 0.45:.2f}, "{lettre}")',
        ]
    l += [
        'D1 = point(5.3, 1.3, visible=faux)',
        'D2 = point(7.9, 1.3, visible=faux)',
        'D3 = point(7.9, 2.2, visible=faux)',
        'D4 = point(5.3, 2.2, visible=faux)',
        'polygone(D1, D2, D3, D4, couleur="noir", remplissage="jaune", opacite_fond=0.3)',
        'texte(6.6, 1.75, "' + masse + '")',
    ]
    return bloc('figure', *l)


def objets_texte(nb, nom_sing, nom_pl):
    return (str(nb) + ' ' + (nom_sing if nb == 1 else nom_pl))


def pesee(nb_b, nb_e, masse, numero):
    objets = ['B'] * nb_b + ['E'] * nb_e
    desc = (numero + ' pesée : à gauche ' + objets_texte(nb_b, 'boule B', 'boules B') + ' et '
            + objets_texte(nb_e, 'étoile E', 'étoiles E') + ', à droite une masse de ' + masse
            + '.')
    return balance(objets, masse, desc)


def masse_txt(expr, decimale):
    """Masse en grammes écrite en texte : entière, ou au dixième avec sa virgule (expr en
    dixièmes de gramme)."""
    if not decimale:
        return '{{eval:' + expr + '}} g'
    return ('{{if:mod(' + expr + ',10)==0|{{eval:(' + expr + ')/10}} g|{{eval:floor((' + expr
            + ')/10)}},{{eval:mod(' + expr + ',10)}} g}}')


N1_INTRO = ('Les boules (B) sont toutes identiques, les étoiles (E) aussi. Voici deux pesées : '
            'chaque fois, la balance est en équilibre.\n\n')
N1_QUESTION = ('\n\nQuelle est la masse d\'une boule ? Quelle est la masse d\'une étoile ?\n\n'
               'Une boule pèse $?$ g.\n\nUne étoile pèse $?$ g.')


def n1_un_objet(decimale):
    """Première pesée : a boules et une étoile ; seconde : une boule et une étoile.
    Masses B et E en grammes (entiers) ou en dixièmes de gramme (decimale)."""
    m2 = 'B+E'
    # la figure dépend de a (2, 3 ou 4 boules) : une figure par valeur
    premiere = {k: pesee(k, 1, masse_txt(f'{k}*B+E', decimale), 'Première') for k in (2, 3, 4)}
    fig1 = ('{{if:a==2|' + premiere[2] + '|{{if:a==3|' + premiere[3] + '|' + premiere[4]
            + '}}}}')
    fig2 = pesee(1, 1, masse_txt(m2, decimale), 'Deuxième')
    if decimale:
        vb = [var('a', '2..4'), var('B', '201..499'), var('E', '201..499')]
        cond = ['B!=E', 'mod(B,10)!=0', 'mod(E,10)!=0']
        n = d
        div = '/10'
    else:
        vb = [var('a', '2..4'), var('B', '20..50'), var('E', '20..50')]
        cond = ['B!=E']
        n = lambda x: '{{eval:' + x + '}}'
        div = ''
    M1 = n('(a*B+E)' + div)
    M2 = n('(B+E)' + div)
    DIFF = n('((a-1)*B)' + div)
    return variation(
        N1_INTRO + fig1 + '\n\n' + fig2 + N1_QUESTION,
        vb,
        [
            case(n('B' + div), [
                erreur(n('((a-1)*B)' + div), 'C\'est la masse de ${{eval:a-1}}$ boules : '
                       'partage-la entre elles.', 'Différence non partagée'),
                erreur(n('(a*B+E)' + div + '/(a+1)'), 'Les objets n\'ont pas tous la même '
                       'masse : on ne peut pas partager la première pesée en parts égales.',
                       'Pesée partagée entre tous les objets'),
                erreur(n('E' + div), 'C\'est la masse d\'une étoile : vérifie quelle case est '
                       'celle de la boule.', 'Boule et étoile échangées'),
            ]),
            case(n('E' + div), [
                erreur(n('(B+E)' + div + '/2'), 'Une boule et une étoile n\'ont pas la même '
                       'masse : on ne peut pas partager la deuxième pesée en deux.',
                       'Deuxième pesée partagée en deux'),
                erreur(n('(E-(a-2)*B)' + div), 'Tu as retiré la masse de ${{eval:a-1}}$ boules : '
                       'sur la deuxième pesée, il n\'y a qu\'une boule.',
                       'Différence non partagée retirée'),
                erreur(n('B' + div), 'C\'est la masse d\'une boule : vérifie quelle case est '
                       'celle de l\'étoile.', 'Boule et étoile échangées'),
            ]),
        ],
        [
            '**Comparer les pesées.** La première a ${{eval:a-1}}$ boule{{if:a>2|s|}} de plus '
            'que la deuxième ; tout le reste est pareil. La différence des masses, c\'est donc '
            '${{eval:a-1}}$ boule{{if:a>2|s|}} : $' + M1 + ' - ' + M2 + ' = ' + DIFF + '$.',
            '**Une boule.** {{if:a>2|$' + DIFF + ' \\div {{eval:a-1}} = ' + couleur(n('B' + div))
            + '$ g.|Une boule pèse $' + couleur(n('B' + div)) + '$ g.}}',
            '**Une étoile.** Deuxième pesée : $' + M2 + ' - ' + n('B' + div) + ' = '
            + couleur(n('E' + div)) + '$ g.',
            '**Vérification.** Première pesée : ${{a}} \\times ' + n('B' + div) + ' + '
            + n('E' + div) + ' = ' + M1 + '$.',
        ],
        'Compare les deux pesées : qu\'y a-t-il en plus sur la première balance ?',
        cond,
    )


N1_UN = n1_un_objet(False)
N1_DIXIEMES = n1_un_objet(True)

# v2 : première pesée a boules et b étoiles, seconde une boule et une étoile ; (a, b) parmi
# (2, 3), (2, 4), (3, 4) selon c.
N1_PAIRES = [(2, 3), (2, 4), (3, 4)]
premieres = [pesee(a, b, masse_txt(f'{a}*B+{b}*E', False), 'Première') for a, b in N1_PAIRES]
N1_FIG_DEUX = ('{{if:c==0|' + premieres[0] + '|{{if:c==1|' + premieres[1] + '|' + premieres[2]
               + '}}}}')
N1_DEUX = variation(
    N1_INTRO + N1_FIG_DEUX + '\n\n' + pesee(1, 1, masse_txt('B+E', False), 'Deuxième')
    + N1_QUESTION,
    [var('c', '0..2'), var('a', 'eval:' + sel('c', [2, 2, 3])),
     var('b', 'eval:' + sel('c', [3, 4, 4])), var('B', '20..50'), var('E', '20..50')],
    [
        case('{{B}}', [
            erreur('{{eval:(a*B+b*E)-(B+E)}}', 'On ne peut pas soustraire les pesées telles '
                   'quelles : il resterait des boules et des étoiles. Imagine d\'abord ${{a}}$ '
                   'fois la deuxième pesée.', 'Pesées soustraites telles quelles'),
            erreur('{{eval:(B+E)/2}}', 'Une boule et une étoile n\'ont pas la même masse : on ne '
                   'peut pas partager la deuxième pesée en deux.',
                   'Deuxième pesée partagée en deux'),
            erreur('{{E}}', 'C\'est la masse d\'une étoile : vérifie quelle case est celle de la '
                   'boule.', 'Boule et étoile échangées'),
        ]),
        case('{{E}}', [
            erreur('{{eval:(b-a)*E}}', 'C\'est la masse de ${{eval:b-a}}$ étoiles : partage-la '
                   'entre elles.', 'Différence non partagée'),
            erreur('{{eval:(a*B+b*E)/(a+b)}}', 'Les objets n\'ont pas tous la même masse : on ne '
                   'peut pas partager la première pesée en parts égales.',
                   'Pesée partagée entre tous les objets'),
            erreur('{{B}}', 'C\'est la masse d\'une boule : vérifie quelle case est celle de '
                   'l\'étoile.', 'Boule et étoile échangées'),
        ]),
    ],
    [
        '**Une pesée imaginée.** Avec ${{a}}$ fois la deuxième pesée, on aurait ${{a}}$ boules et '
        '${{a}}$ étoiles, de masse ${{a}} \\times {{eval:B+E}} = {{eval:a*(B+E)}}$ g.',
        '**Comparer.** La première pesée a autant de boules, et ${{eval:b-a}}$ étoile'
        '{{if:b-a>1|s|}} de plus : ${{eval:a*B+b*E}} - {{eval:a*(B+E)}} = {{eval:(b-a)*E}}$ g.',
        '**Une étoile.** {{if:b-a>1|${{eval:(b-a)*E}} \\div {{eval:b-a}} = ' + couleur('{{E}}')
        + '$ g.|Une étoile pèse $' + couleur('{{E}}') + '$ g.}}',
        '**Une boule.** Deuxième pesée : ${{eval:B+E}} - {{E}} = ' + couleur('{{B}}') + '$ g.',
    ],
    'Imagine ${{a}}$ fois la deuxième pesée : combien pèserait-elle ? Compare-la à la première.',
    ['B!=E'],
)

V_N1 = {'a': '3', 'B': '40', 'E': '25'}
V_N1d = {'a': '3', 'B': '234', 'E': '417'}
V_N1b = {'c': '0', 'a': '2', 'b': '3', 'B': '35', 'E': '24'}
SPECS_N1 = [
    spec('Un objet : 3B + E = 145, B + E = 65 → 40 et 25', 0, V_N1, 'correct', ['40', '25']),
    spec('Un objet : différence non partagée (80)', 0, V_N1, 'incorrect', ['80', '25'],
         'C\'est la masse de $2$ boules : partage-la entre elles.'),
    spec('Un objet : boule et étoile échangées', 0, V_N1, 'incorrect', ['25', '40'],
         'C\'est la masse d\'une étoile : vérifie quelle case est celle de la boule.'),
    spec('Un objet : deuxième pesée en deux (32,5)', 0, V_N1, 'incorrect', ['40', '32{,}5'],
         'Une boule et une étoile n\'ont pas la même masse : on ne peut pas partager la deuxième '
         'pesée en deux.'),
    spec('Un objet : 80 g retirés (−15)', 0, V_N1, 'incorrect', ['40', '-15'],
         'Tu as retiré la masse de $2$ boules : sur la deuxième pesée, il n\'y a qu\'une boule.'),
    spec('Un objet : 4B + E = 180, partagé en 5 (36)', 0, {'a': '4', 'B': '40', 'E': '20'},
         'incorrect', ['36', '20'],
         'Les objets n\'ont pas tous la même masse : on ne peut pas partager la première pesée en '
         'parts égales.'),
    spec('Un objet : 2B + E = 84, B + E = 54 → 30 et 24', 0,
         {'a': '2', 'B': '30', 'E': '24'}, 'correct', ['30', '24']),
    spec('Deux objets : 2B + 3E = 142, B + E = 59 → 35 et 24', 1, V_N1b, 'correct', ['35', '24']),
    spec('Deux objets : pesées soustraites (83)', 1, V_N1b, 'incorrect', ['83', '24'],
         'On ne peut pas soustraire les pesées telles quelles : il resterait des boules et des '
         'étoiles. Imagine d\'abord $2$ fois la deuxième pesée.'),
    spec('Deux objets : échangés', 1, V_N1b, 'incorrect', ['24', '35'],
         'C\'est la masse d\'une étoile : vérifie quelle case est celle de la boule.'),
    spec('Deux objets : 2B + 4E, différence non partagée (60)', 1,
         {'c': '1', 'a': '2', 'b': '4', 'B': '35', 'E': '30'}, 'incorrect', ['35', '60'],
         'C\'est la masse de $2$ étoiles : partage-la entre elles.'),
    spec('Deux objets : 3B + 4E = 220, B + E = 60 → 40 et 20', 1,
         {'c': '2', 'a': '3', 'b': '4', 'B': '40', 'E': '25'}, 'correct', ['40', '25']),
    spec('Deux objets : 3B + 4E = 246 partagé en 7 (31,4…) : 2 étoiles non partagées', 1,
         {'c': '2', 'a': '3', 'b': '4', 'B': '42', 'E': '30'}, 'correct', ['42', '30']),
    spec('Dixièmes : 3 × 23,4 + 41,7 = 111,9 ; 23,4 + 41,7 = 65,1', 2, V_N1d, 'correct',
         ['23{,}4', '41{,}7']),
    spec('Dixièmes : différence non partagée (46,8)', 2, V_N1d, 'incorrect', ['46{,}8', '41{,}7'],
         'C\'est la masse de $2$ boules : partage-la entre elles.'),
    spec('Dixièmes : échangées', 2, V_N1d, 'incorrect', ['41{,}7', '23{,}4'],
         'C\'est la masse d\'une étoile : vérifie quelle case est celle de la boule.'),
]

N1 = modele(
    'Balances : la masse de deux objets',
    'Deux pesées en équilibre (boules et étoiles) : trouver la masse de chaque objet ; un seul '
    'objet multiplié (× 2 à × 4) puis soustraire et partager, les deux objets multipliés '
    '(imaginer un multiple de la seconde pesée), masses au dixième de gramme ; pièges : '
    'différence non partagée, pesée partagée entre tous les objets',
    3, 120, [N1_UN, N1_DEUX, N1_DIXIEMES], SPECS_N1, ZEROS_LIBRES, rangement=INCONNU)


# =============================================================================================
# N2 — 6-142 : deux nombres inconnus. Billets de 5 € et de 10 € ; deux entiers dont on donne la
# somme et le produit, ou la différence et le produit.
# =============================================================================================

N2_BILLETS = variation(
    'Dans sa tirelire, Zoé n\'a que des billets de $5~\\unit{€}$ et de $10~\\unit{€}$. Elle a '
    '${{N}}$ billets en tout, pour $' + prix('100*S') + '$.\n\nCombien a-t-elle de billets de '
    'chaque sorte ?\n\nBillets de $5~\\unit{€}$ : $?$\n\nBillets de $10~\\unit{€}$ : $?$',
    [var('N', '20..40'), var('y', '3..37'), var('x', 'eval:N-y'), var('S', 'eval:5*x+10*y')],
    [
        case('{{x}}', [
            erreur('{{eval:S/5}}', 'Il n\'y a pas que des billets de $5~\\unit{€}$ : avec '
                   '${{eval:S/5}}$ billets, on dépasserait les ${{N}}$ billets de la tirelire.',
                   'Tous les billets de 5 €'),
            erreur('{{eval:N-(S-5*N)}}', 'Tu as retiré ${{eval:S-5*N}}$ billets : '
                   '${{eval:S-5*N}}$, ce sont des euros. Chaque billet de $10~\\unit{€}$ apporte '
                   '$5~\\unit{€}$ de plus qu\'un billet de $5~\\unit{€}$.',
                   'Euros en trop pris pour des billets'),
            erreur('{{y}}', 'C\'est le nombre de billets de $10~\\unit{€}$ : vérifie l\'ordre des '
                   'cases.', 'Cases échangées'),
        ]),
        case('{{y}}', [
            erreur('{{eval:S-5*N}}', 'C\'est l\'argent en trop, en euros : chaque billet de '
                   '$10~\\unit{€}$ apporte $5~\\unit{€}$ de plus qu\'un billet de $5~\\unit{€}$.',
                   'Euros en trop non partagés'),
            erreur('{{eval:S/10}}', 'Il n\'y a pas que des billets de $10~\\unit{€}$ : il y a '
                   'aussi des billets de $5~\\unit{€}$.', 'Tous les billets de 10 €'),
            erreur('{{x}}', 'C\'est le nombre de billets de $5~\\unit{€}$ : vérifie l\'ordre des '
                   'cases.', 'Cases échangées'),
        ]),
    ],
    [
        '**Si tous les billets étaient des billets de $5~\\unit{€}$**, Zoé aurait ${{N}} \\times 5 '
        '= {{eval:5*N}}~\\unit{€}$.',
        '**Ce qui manque.** Elle a ${{S}} - {{eval:5*N}} = {{eval:S-5*N}}~\\unit{€}$ de plus. '
        'Chaque billet de $10~\\unit{€}$ apporte $5~\\unit{€}$ de plus qu\'un billet de '
        '$5~\\unit{€}$ : ${{eval:S-5*N}} \\div 5 = ' + couleur('{{y}}') + '$ billets de '
        '$10~\\unit{€}$.',
        '**Les billets de $5~\\unit{€}$.** ${{N}} - {{y}} = ' + couleur('{{x}}') + '$.',
        '**Vérification.** ${{x}} \\times 5 + {{y}} \\times 10 = {{eval:5*x}} + {{eval:10*y}} = '
        '{{S}}$.',
    ],
    'Si tous les billets étaient des billets de $5~\\unit{€}$, combien d\'argent y aurait-il dans '
    'la tirelire ?',
    ['x>=3', 'x!=y'],
)

N2_DEVINETTE_INTRO = 'Je pense à deux nombres entiers. '
N2_CASES = ('\n\nQuels sont ces deux nombres ? Écris le plus petit dans la première case.\n\n'
            'Le plus petit : $?$\n\nLe plus grand : $?$')


def n2_echange(autre):
    return erreur('{{' + autre + '}}', 'C\'est le plus ' + ('grand' if autre == 'y' else 'petit')
                  + ' des deux nombres : le plus petit va dans la première case.',
                  'Nombres échangés')


N2_SOMME = variation(
    N2_DEVINETTE_INTRO + 'Leur somme est ${{eval:x+y}}$ et leur produit est ${{eval:x*y}}$.'
    + N2_CASES,
    [var('x', '2..11'), var('y', '3..12')],
    [
        case('{{x}}', [n2_echange('y'), erreur('{{eval:(x+y)/2}}', '${{eval:(x+y)/2}} + '
                       '{{eval:(x+y)/2}} = {{eval:x+y}}$, mais ${{eval:(x+y)/2}} \\times '
                       '{{eval:(x+y)/2}} = {{eval:(x+y)*(x+y)/4}}$, pas ${{eval:x*y}}$.',
                       'Somme partagée en deux')]),
        case('{{y}}', [n2_echange('x'), erreur('{{eval:(x+y)/2}}', 'Les deux nombres ne sont '
                       'pas égaux : leur produit serait ${{eval:(x+y)*(x+y)/4}}$, pas '
                       '${{eval:x*y}}$.', 'Somme partagée en deux')]),
    ],
    [
        '**Essais organisés.** On cherche deux nombres dont le produit vaut ${{eval:x*y}}$ : il y '
        'en a peu, on les essaie un à un et on calcule leur somme.',
        '${{x}} \\times {{y}} = {{eval:x*y}}$ et ${{x}} + {{y}} = {{eval:x+y}}$ : les deux nombres '
        'sont $' + couleur('{{x}}') + '$ et $' + couleur('{{y}}') + '$.',
    ],
    'Écris ${{eval:x*y}}$ comme le produit de deux nombres, de toutes les façons possibles : '
    'laquelle a la bonne somme ?',
    ['x<y', 'mod(x+y,2)==0'],
)

N2_DIFF = variation(
    N2_DEVINETTE_INTRO + 'Le plus grand dépasse le plus petit de ${{eval:y-x}}$, et leur produit '
    'est ${{eval:x*y}}$.' + N2_CASES,
    [var('x', '2..11'), var('y', '3..12')],
    [
        case('{{x}}', [n2_echange('y'), erreur('{{eval:y-x}}', '${{eval:y-x}}$, c\'est l\'écart '
                       'entre les deux nombres, pas l\'un d\'eux.', 'Écart pris pour un nombre')]),
        case('{{y}}', [n2_echange('x'), erreur('{{eval:x*y}}', '${{eval:x*y}}$ est le produit des '
                       'deux nombres, pas l\'un d\'eux.', 'Produit pris pour un nombre')]),
    ],
    [
        '**Essais organisés.** On cherche deux nombres dont le produit vaut ${{eval:x*y}}$ : il y '
        'en a peu, on les essaie un à un et on calcule leur écart.',
        '${{x}} \\times {{y}} = {{eval:x*y}}$ et ${{y}} - {{x}} = {{eval:y-x}}$ : les deux nombres '
        'sont $' + couleur('{{x}}') + '$ et $' + couleur('{{y}}') + '$.',
    ],
    'Écris ${{eval:x*y}}$ comme le produit de deux nombres, de toutes les façons possibles : '
    'laquelle a le bon écart ?',
    ['x<y', 'y-x!=x'],
)

V_N2 = {'N': '30', 'y': '12', 'x': '18', 'S': '210'}
SPECS_N2 = [
    spec('Billets : 30 billets, 210 € → 18 de 5 €, 12 de 10 €', 0, V_N2, 'correct', ['18', '12']),
    spec('Billets : cases échangées', 0, V_N2, 'incorrect', ['12', '18'],
         'C\'est le nombre de billets de $10~\\unit{€}$ : vérifie l\'ordre des cases.'),
    spec('Billets : 60 € en trop non partagés', 0, V_N2, 'incorrect', ['18', '60'],
         'C\'est l\'argent en trop, en euros : chaque billet de $10~\\unit{€}$ apporte '
         '$5~\\unit{€}$ de plus qu\'un billet de $5~\\unit{€}$.'),
    spec('Billets : 210 ÷ 10 (21)', 0, V_N2, 'incorrect', ['18', '21'],
         'Il n\'y a pas que des billets de $10~\\unit{€}$ : il y a aussi des billets de '
         '$5~\\unit{€}$.'),
    spec('Billets : 210 ÷ 5 (42)', 0, V_N2, 'incorrect', ['42', '12'],
         'Il n\'y a pas que des billets de $5~\\unit{€}$ : avec $42$ billets, on dépasserait les '
         '$30$ billets de la tirelire.'),
    spec('Billets : 30 − 60 (−30)', 0, V_N2, 'incorrect', ['-30', '12'],
         'Tu as retiré $60$ billets : $60$, ce sont des euros. Chaque billet de $10~\\unit{€}$ '
         'apporte $5~\\unit{€}$ de plus qu\'un billet de $5~\\unit{€}$.'),
    spec('Somme : 14 et 48 → 6 et 8', 1, {'x': '6', 'y': '8'},
         'correct', ['6', '8']),
    spec('Somme : échangés', 1, {'x': '6', 'y': '8'}, 'incorrect', ['8', '6'],
         'C\'est le plus grand des deux nombres : le plus petit va dans la première case.'),
    spec('Somme : 7 et 7', 1, {'x': '6', 'y': '8'}, 'incorrect', ['7', '7'],
         '$7 + 7 = 14$, mais $7 \\times 7 = 49$, pas $48$.'),
    spec('Somme : 3 et 11 (somme 14, produit 33)', 1, {'x': '3', 'y': '11'}, 'correct',
         ['3', '11']),
    spec('Écart : écart 5, produit 36 → 4 et 9', 2, {'x': '4', 'y': '9'}, 'correct', ['4', '9']),
    spec('Écart : échangés', 2, {'x': '4', 'y': '9'}, 'incorrect', ['9', '4'],
         'C\'est le plus grand des deux nombres : le plus petit va dans la première case.'),
    spec('Écart : l\'écart écrit (5)', 2, {'x': '4', 'y': '9'}, 'incorrect', ['5', '9'],
         '$5$, c\'est l\'écart entre les deux nombres, pas l\'un d\'eux.'),
    spec('Écart : le produit écrit (36)', 2, {'x': '4', 'y': '9'}, 'incorrect', ['4', '36'],
         '$36$ est le produit des deux nombres, pas l\'un d\'eux.'),
]

N2 = modele(
    'Deux nombres inconnus : billets et devinettes',
    'Trouver deux nombres sans lettre : billets de 5 € et de 10 € (nombre de billets et somme '
    'donnés, « si tous étaient des billets de 5 € ») ; deux entiers de 2 à 12 dont on donne la '
    'somme et le produit, ou l\'écart et le produit (essais organisés) ; pièges : euros pris pour '
    'des billets, somme partagée en deux',
    4, 120, [N2_BILLETS, N2_SOMME, N2_DIFF], SPECS_N2, ESPACES, rangement=INCONNU)


# =============================================================================================
# N3 — 6-120 : problèmes à plusieurs étapes avec des décimaux (régime, fromages, cagettes,
# barquettes). Une case par variation.
# =============================================================================================

# Régime : masses 5k g (120 à 155 g), calories par gramme en dixièmes.
N3_T = '(m1*c1+m2*c2+m3*c3)/10'
N3_REGIME = variation(
    'Pour son déjeuner, Tom ne veut pas dépasser $700$ calories. Il mange ${{m1}}~\\unit{g}$ de '
    'poulet, ${{m2}}~\\unit{g}$ de riz et ${{m3}}~\\unit{g}$ de haricots verts.\n\n'
    '| Aliment | poulet | riz | haricots verts |\n|---|---|---|---|\n'
    '| Calories dans $1~\\unit{g}$ | $' + d('c1/10') + '$ | $' + d('c2/10') + '$ | $' + d('c3/10')
    + '$ |\n\nCombien de calories lui reste-t-il avant d\'atteindre $700$ ?\n\n'
    'Il lui reste $?$ calories.',
    [var('k1', '24..31'), var('k2', '24..31'), var('k3', '24..31'), var('m1', 'eval:5*k1'),
     var('m2', 'eval:5*k2'), var('m3', 'eval:5*k3'), var('c1', '15..24'), var('c2', '11..14'),
     var('c3', '2..4')],
    [case(d('700-' + N3_T), [
        erreur(d(N3_T), 'C\'est ce que Tom a mangé : la question demande ce qu\'il lui reste '
               'avant $700$.', 'Soustraction oubliée'),
        erreur(d('700-(m1*c1+m2*c2)/10'), 'Tu as oublié les haricots verts : compte les '
               'calories des trois aliments.', 'Un aliment oublié'),
        erreur('{{eval:700-m1-m2-m3}}', 'Tu as retiré les masses en grammes : il faut retirer '
               'les calories, masse $\\times$ calories dans $1~\\unit{g}$.',
               'Masses retirées au lieu des calories'),
    ])],
    [
        '**Les calories de chaque aliment** (masse $\\times$ calories dans $1~\\unit{g}$) : '
        'poulet ${{m1}} \\times ' + d('c1/10') + ' = ' + d('m1*c1/10') + '$, riz ${{m2}} \\times '
        + d('c2/10') + ' = ' + d('m2*c2/10') + '$, haricots ${{m3}} \\times ' + d('c3/10') + ' = '
        + d('m3*c3/10') + '$.',
        '**En tout.** $' + d('m1*c1/10') + ' + ' + d('m2*c2/10') + ' + ' + d('m3*c3/10') + ' = '
        + d(N3_T) + '$ calories.',
        '**Ce qui reste.** $700 - ' + d(N3_T) + ' = ' + couleur(d('700-' + N3_T))
        + '$ calories : Tom reste sous les $700$ calories.',
    ],
    'Combien de calories y a-t-il dans les ${{m1}}~\\unit{g}$ de poulet ? Fais de même pour les '
    'autres aliments.',
)

N3_FROMAGES = variation(
    'Un fromager livre ${{a}}$ fromages de $2.3~\\unit{kg}$ et ${{b}}$ fromages de '
    '$3.1~\\unit{kg}$. Sa camionnette ne doit pas transporter plus de $700~\\unit{kg}$.\n\n'
    'De combien de kilogrammes dépasse-t-il cette limite ? Écris l\'unité dans ta réponse.\n\n'
    'Il dépasse de $?$.',
    [var('a', '130..139'), var('b', '120..129')],
    [case('{{eval:((23*a+31*b-7000)/10)[kg]}}', [
        erreur('{{eval:((23*a+31*b)/10)[kg]}}', 'C\'est la masse de tous les fromages : '
               'compare-la à $700~\\unit{kg}$.', 'Comparaison oubliée'),
        erreur('{{eval:((31*a+23*b-7000)/10)[kg]}}', 'Tu as échangé les masses : les ${{a}}$ '
               'fromages pèsent $2.3~\\unit{kg}$ chacun.', 'Masses échangées'),
    ], unite=True)],
    [
        '**Chaque lot.** ${{a}} \\times 2.3 = ' + d('23*a/10') + '$ et ${{b}} \\times 3.1 = '
        + d('31*b/10') + '$.',
        '**En tout.** $' + d('23*a/10') + ' + ' + d('31*b/10') + ' = ' + d('(23*a+31*b)/10')
        + '~\\unit{kg}$ : c\'est plus que $700~\\unit{kg}$.',
        '**Le dépassement.** $' + d('(23*a+31*b)/10') + ' - 700 = '
        + couleur(d('(23*a+31*b-7000)/10') + '~\\unit{kg}') + '$.',
    ],
    'Quelle est la masse des ${{a}}$ fromages de $2.3~\\unit{kg}$ ? Et celle des autres ?',
    ['23*a+31*b>7000', '31*a+23*b!=23*a+31*b'],
)

# Cagettes : n cagettes de M/10 kg achetées P centimes, oranges revendues r/10 € le kg.
N3_BEN = 'n*(M*r-P)'
N3_CAGETTES = variation(
    'Un marchand achète ${{n}}$ cagettes d\'oranges à $' + prix('P') + '$ la cagette. Chaque '
    'cagette contient $' + d('M/10') + '~\\unit{kg}$ d\'oranges. Il revend toutes les oranges $'
    + prix('10*r') + '$ le kilogramme.\n\nQuel est son bénéfice (ce que la vente rapporte, moins '
    'ce que les cagettes ont coûté) ? Écris l\'unité dans ta réponse.\n\nSon bénéfice est de $?$.',
    [var('n', '2..5'), var('M', '52..55'), var('P', '620..699'), var('r', '15..19')],
    [case(prix(N3_BEN), [
        erreur(prix('n*M*r'), 'C\'est ce que rapporte la vente : retire ce que les cagettes ont '
               'coûté.', 'Achat non retiré'),
        erreur(prix('n*M*r-P'), 'Tu n\'as retiré le prix que d\'une cagette : il en a acheté '
               '${{n}}$.', 'Une seule cagette payée'),
        erreur(prix('M*r-P'), 'C\'est le bénéfice sur une cagette : il en a ${{n}}$.',
               'Une seule cagette'),
    ], unite=True)],
    [
        '**Les oranges.** ${{n}} \\times ' + d('M/10') + ' = ' + d('n*M/10') + '~\\unit{kg}$.',
        '**La vente.** $' + d('n*M/10') + ' \\times ' + prix_nu('10*r') + ' = '
        + prix_nu('n*M*r') + '~\\unit{€}$.',
        '**L\'achat.** ${{n}} \\times ' + prix_nu('P') + ' = ' + prix_nu('n*P') + '~\\unit{€}$.',
        '**Le bénéfice.** $' + prix_nu('n*M*r') + ' - ' + prix_nu('n*P') + ' = '
        + couleur(prix(N3_BEN)) + '$.',
    ],
    'Combien de kilogrammes d\'oranges le marchand revend-il en tout ?',
    ['mod(P,10)!=0', 'mod(r,5)!=0'],
)

# Barquettes : a de fraises de g1 g, b de myrtilles de g2 g ; prix au kg 20·u centimes.
N3_REC = 'a*g1*u1/50+b*g2*u2/50'
N3_BARQUETTES = variation(
    'Un primeur vend ${{a}}$ barquettes de fraises de ${{g1}}~\\unit{g}$, à $' + prix('20*u1')
    + '$ le kilogramme, et ${{b}}$ barquettes de myrtilles de ${{g2}}~\\unit{g}$, à $'
    + prix('20*u2') + '$ le kilogramme.\n\nCombien la vente de toutes les barquettes lui '
    'rapporte-t-elle ? Écris l\'unité dans ta réponse.\n\nElle lui rapporte $?$.',
    [var('a', '20..30'), var('b', '20..30'), var('g1', '250|500'), var('g2', '250|500'),
     var('u1', '36..42'), var('u2', '36..42')],
    [case(prix(N3_REC), [
        erreur(prix('(a*g1*u1/50+b*g2*u2/50)*1000'), 'Les prix sont donnés au kilogramme : '
               'convertis d\'abord les grammes en kilogrammes.', 'Grammes non convertis'),
        erreur(prix('(a*g1*u1/50+b*g2*u2/50)*10'), 'Vérifie la conversion : '
               '$1~\\unit{kg} = 1\\,000~\\unit{g}$.', 'Conversion décalée d\'un rang'),
        erreur(prix('a*g1*u1/50'), 'C\'est la vente des fraises seulement : ajoute celle des '
               'myrtilles.', 'Un seul fruit compté'),
    ], unite=True)],
    [
        '**Les masses vendues.** Fraises : ${{a}} \\times {{g1}} = {{eval:a*g1}}~\\unit{g}$, soit $'
        + d('a*g1/1000') + '~\\unit{kg}$ ; myrtilles : ${{b}} \\times {{g2}} = {{eval:b*g2}}~'
        '\\unit{g}$, soit $' + d('b*g2/1000') + '~\\unit{kg}$.',
        '**Chaque fruit.** $' + d('a*g1/1000') + ' \\times ' + prix_nu('20*u1') + ' = '
        + prix_nu('a*g1*u1/50') + '$ et $' + d('b*g2/1000') + ' \\times ' + prix_nu('20*u2')
        + ' = ' + prix_nu('b*g2*u2/50') + '$.',
        '**En tout.** $' + prix_nu('a*g1*u1/50') + ' + ' + prix_nu('b*g2*u2/50') + ' = '
        + couleur(prix(N3_REC)) + '$.',
    ],
    'Les prix sont donnés pour un kilogramme : combien de kilogrammes de fraises le primeur '
    'vend-il ?',
    ['mod(u1,5)!=0', 'mod(u2,5)!=0'],
)

V_R = {'k1': '30', 'k2': '28', 'k3': '26', 'm1': '150', 'm2': '140', 'm3': '130', 'c1': '20',
       'c2': '13', 'c3': '3'}
V_C = {'n': '3', 'M': '53', 'P': '645', 'r': '17'}
V_B = {'a': '24', 'b': '20', 'g1': '500', 'g2': '250', 'u1': '38', 'u2': '41'}
SPECS_N3 = [
    spec('Régime : 300 + 182 + 39 = 521 → 179', 0, V_R, 'correct', ['179']),
    spec('Régime : soustraction oubliée (521)', 0, V_R, 'incorrect', ['521'],
         'C\'est ce que Tom a mangé : la question demande ce qu\'il lui reste avant $700$.'),
    spec('Régime : haricots oubliés (218)', 0, V_R, 'incorrect', ['218'],
         'Tu as oublié les haricots verts : compte les calories des trois aliments.'),
    spec('Régime : masses retirées (280)', 0, V_R, 'incorrect', ['280'],
         'Tu as retiré les masses en grammes : il faut retirer les calories, masse $\\times$ '
         'calories dans $1~\\unit{g}$.'),
    spec('Fromages : 139 × 2,3 + 129 × 3,1 = 719,6 → 19,6 kg',
         1, {'a': '139', 'b': '129'}, 'correct', ['19{,}6\\,\\mathrm{kg}']),
    spec('Fromages : 19 600 g accepté', 1, {'a': '139', 'b': '129'}, 'correct',
         ['19\\,600\\,\\mathrm{g}']),
    spec('Fromages : sans unité refusé', 1, {'a': '139', 'b': '129'}, 'incorrect', ['19{,}6']),
    spec('Fromages : masse totale (719,6 kg)', 1, {'a': '139', 'b': '129'}, 'incorrect',
         ['719{,}6\\,\\mathrm{kg}'],
         'C\'est la masse de tous les fromages : compare-la à $700~\\unit{kg}$.'),
    spec('Fromages : masses échangées (727,6 kg − 700)', 1, {'a': '139', 'b': '129'},
         'incorrect', ['27{,}6\\,\\mathrm{kg}'],
         'Tu as échangé les masses : les $139$ fromages pèsent $2.3~\\unit{kg}$ chacun.'),
    spec('Cagettes : 3 × 5,3 × 1,70 − 3 × 6,45 = 7,68 €', 2, V_C, 'correct', ['7{,}68\\,€']),
    spec('Cagettes : vente seule (27,03 €)', 2, V_C, 'incorrect', ['27{,}03\\,€'],
         'C\'est ce que rapporte la vente : retire ce que les cagettes ont coûté.'),
    spec('Cagettes : une cagette payée (20,58 €)', 2, V_C, 'incorrect', ['20{,}58\\,€'],
         'Tu n\'as retiré le prix que d\'une cagette : il en a acheté $3$.'),
    spec('Cagettes : une cagette (2,56 €)', 2, V_C, 'incorrect', ['2{,}56\\,€'],
         'C\'est le bénéfice sur une cagette : il en a $3$.'),
    spec('Barquettes : 12 × 7,60 + 5 × 8,20 = 132,20 €', 3, V_B, 'correct', ['132{,}2\\,€']),
    spec('Barquettes : 132,20 € accepté', 3, V_B, 'correct', ['132{,}20\\,€']),
    spec('Barquettes : fraises seules (91,20 €)', 3, V_B, 'incorrect', ['91{,}2\\,€'],
         'C\'est la vente des fraises seulement : ajoute celle des myrtilles.'),
    spec('Barquettes : × 10 (1 322 €)', 3, V_B, 'incorrect', ['1\\,322\\,€'],
         'Vérifie la conversion : $1~\\unit{kg} = 1\\,000~\\unit{g}$.'),
]

N3 = modele(
    'Problèmes à plusieurs étapes avec des décimaux',
    'Enchaîner plusieurs calculs sur des décimaux, une seule réponse : calories restantes '
    'sous 700 (masse × calories par gramme), dépassement de la charge d\'une camionnette, '
    'bénéfice d\'un marchand d\'oranges, recette de barquettes vendues au kilogramme (grammes '
    'convertis) ; pièges : dernière étape oubliée, une partie oubliée, conversion',
    10, 180, [N3_REGIME, N3_FROMAGES, N3_CAGETTES, N3_BARQUETTES], SPECS_N3, ZEROS_LIBRES,
    rangement=MULTIPLICATION)


# =============================================================================================
# N4 — 5-001 : quelles informations servent ? Les choix d'origine 0 et 1 sont les informations
# utiles (mélangées à l'affichage), 2 à 4 les inutiles, 5 « Aucune ».
# =============================================================================================

N4_ENONCES = [
    'Dans la classe de 6e B, il y a ${{E}}$ élèves de $11$ ans. Chaque élève a ${{L}}$ livres '
    'dans son sac, et un livre pèse ${{G}}~\\unit{g}$. La récréation dure $15$ minutes.',
    'Au marché, Inès arrive à $9$ h. Elle achète ${{K}}~\\unit{kg}$ de pommes à $'
    + prix('P') + '$ le kilogramme. Le marché compte ${{E}}$ étals et ferme à $13$ h.',
    'Léo part à vélo à $14$ h. Il roule pendant ${{H}}$ heures et parcourt ${{V}}~\\unit{km}$ '
    'chaque heure. Son vélo pèse ${{L}}~\\unit{kg}$, et Léo a $3$ frères.',
    'Un livreur part à $8$ h avec ${{E}}$ colis. Il en dépose ${{L}}$ au premier arrêt, puis '
    'roule ${{V}}~\\unit{km}$ jusqu\'au second arrêt, où il dépose tous les autres. Son camion a '
    '$5$ ans.',
]
N4_QUESTIONS = [
    'Quelle masse de livres chaque élève porte-t-il ?',
    'Combien Inès paie-t-elle ses pommes ?',
    'Quelle distance Léo parcourt-il ?',
    'Combien de colis dépose-t-il au second arrêt ?',
]
N4_INSOLUBLES = [
    'Combien pèse un sac vide ?',
    'Combien de pommes Inès a-t-elle achetées ?',
    'Combien pèse Léo ?',
    'Combien pèse le colis le plus lourd ?',
]
# Les cinq informations dans l'ordre de l'énoncé (choix non mélangés, « Aucune » en dernier) ;
# N4_UTILES_IDX / N4_INUTILES_IDX : leurs numéros pour N4_QUESTIONS.
N4_INFOS = [
    ['${{E}}$ élèves', '$11$ ans', '${{L}}$ livres par élève', '${{G}}~\\unit{g}$ par livre',
     '$15$ minutes de récréation'],
    ['l\'arrivée à $9$ h', '${{K}}~\\unit{kg}$ de pommes', '$' + prix('P') + '$ le kilogramme',
     '${{E}}$ étals', 'la fermeture à $13$ h'],
    ['le départ à $14$ h', '${{H}}$ heures de route', '${{V}}~\\unit{km}$ chaque heure',
     'un vélo de ${{W}}~\\unit{kg}$', '$3$ frères'],
    ['le départ à $8$ h', '${{E}}$ colis au départ', '${{L}}$ colis au premier arrêt',
     '${{V}}~\\unit{km}$ de route', 'un camion de $5$ ans'],
]
N4_UTILES_IDX = ['2;3', '1;2', '1;2', '1;2']
N4_INUTILES_IDX = ['0;1;4', '0;3;4', '0;3;4', '0;3;4']
N4_CALCUL = [
    'Chaque élève porte ${{L}}$ livres de ${{G}}~\\unit{g}$ : ${{L}} \\times {{G}}$.',
    'Inès paie ${{K}}$ kilogrammes au prix d\'un kilogramme : ${{K}} \\times ' + prix_nu('P')
    + '$.',
    'Léo roule ${{H}}$ heures et parcourt ${{V}}~\\unit{km}$ chaque heure : ${{H}} \\times {{V}}$.',
    'Il reste les colis qu\'il n\'a pas déposés au premier arrêt : ${{E}} - {{L}}$.',
]
N4_VARS = [var('t', '0..3'), var('E', '21..32'), var('L', '3..9'), var('G', '200|250|300|350|400'),
           var('K', '2..5'), var('P', '120..390'), var('H', '2..4'), var('V', '12..18'), var('W', '9..15')]
N4_CONDS = ['mod(P,10)==0', 'mod(P,100)!=0']
N4_AUCUNE = '- Aucune : on ne peut pas répondre à cette question avec ces informations'


def n4_choix(aucune):
    return bloc('choix', 'plusieurs: oui', 'melanger: non',
                *['- ' + selon('t', [ctx[i] for ctx in N4_INFOS]) for i in range(5)], aucune)


N4_UTILES = variation(
    selon('t', N4_ENONCES) + '\n\n**Question :** ' + selon('t', N4_QUESTIONS) + '\n\nQuelles '
    'informations servent à répondre à cette question ? Coche-les toutes (sans faire le calcul).'
    '\n\n' + n4_choix(N4_AUCUNE),
    N4_VARS,
    [case(selon('t', N4_UTILES_IDX))],
    [
        '**Trier les informations.** On cherche ce que demande la question, puis le calcul qui y '
        'répond : seules les informations de ce calcul servent.',
        selon('t', N4_CALCUL) + ' Les informations utiles sont ' + selon('t', [
            '$' + couleur('\\text{le nombre de livres et la masse d\'un livre}') + '$',
            '$' + couleur('\\text{la masse de pommes et le prix d\'un kilogramme}') + '$',
            '$' + couleur('\\text{la durée et la distance parcourue chaque heure}') + '$',
            '$' + couleur('\\text{les colis au départ et ceux du premier arrêt}') + '$',
        ]) + ' ; les autres ne servent pas.',
    ],
    'Quel calcul répond à la question ? Les informations qui n\'y entrent pas ne servent pas.',
    N4_CONDS,
)

N4_INUTILES = variation(
    selon('t', N4_ENONCES) + '\n\n**Question :** ' + selon('t', N4_QUESTIONS) + '\n\nQuelles '
    'informations ne servent PAS à répondre à cette question ? Coche-les toutes.\n\n'
    + n4_choix('- Aucune : elles servent toutes'),
    N4_VARS,
    [case(selon('t', N4_INUTILES_IDX))],
    [
        '**Trier les informations.** On cherche le calcul qui répond à la question : les '
        'informations qui n\'y entrent pas ne servent pas.',
        selon('t', N4_CALCUL) + ' Tout le reste est $' + couleur('\\text{inutile}') + '$ : '
        + selon('t', [
            'le nombre d\'élèves, leur âge et la durée de la récréation.',
            'l\'heure d\'arrivée, le nombre d\'étals et l\'heure de fermeture.',
            'l\'heure de départ, la masse du vélo et le nombre de frères.',
            'l\'heure de départ, la distance entre les arrêts et l\'âge du camion.',
        ]),
    ],
    'Quel calcul répond à la question ? Coche les informations qui n\'y entrent pas.',
    N4_CONDS,
)

N4_IMPOSSIBLE = variation(
    selon('t', N4_ENONCES) + '\n\n**Question :** ' + selon('t', N4_INSOLUBLES) + '\n\nQuelles '
    'informations servent à répondre à cette question ? Coche-les toutes.\n\n'
    + n4_choix(N4_AUCUNE),
    N4_VARS,
    [case('5')],
    [
        '**Trier les informations.** On cherche le calcul qui répond à la question.',
        selon('t', [
            'L\'énoncé donne la masse des livres, jamais celle du sac.',
            'L\'énoncé donne la masse des pommes, pas leur nombre : il faudrait connaître la '
            'masse d\'une pomme.',
            'L\'énoncé donne la masse du vélo, jamais celle de Léo.',
            'L\'énoncé donne le nombre de colis, jamais leur masse.',
        ]) + ' Aucune information ne permet de répondre : ' + '$'
        + couleur('\\text{on ne peut pas répondre}') + '$.',
    ],
    'Cherche dans l\'énoncé une information qui parle de ce que demande la question.',
    N4_CONDS,
)

SPECS_N4 = [
    spec('Utiles : livres, nombre et masse', 0, {'t': '0'}, 'correct', ['2;3']),
    spec('Utiles : le nombre d\'élèves coché en plus', 0, {'t': '0'}, 'incorrect', ['0;2;3']),
    spec('Utiles : une seule (partiel)', 0, {'t': '0'}, 'unoptimal_form', ['2']),
    spec('Utiles : « Aucune » refusé', 0, {'t': '1'}, 'incorrect', ['5']),
    spec('Utiles : marché, masse et prix', 0, {'t': '1'}, 'correct', ['1;2']),
    spec('Utiles : livreur', 0, {'t': '3'}, 'correct', ['1;2']),
    spec('Inutiles : vélo, les trois autres', 1, {'t': '2'}, 'correct', ['0;3;4']),
    spec('Inutiles : une utile cochée', 1, {'t': '2'}, 'incorrect', ['0;1;3;4']),
    spec('Inutiles : classe', 1, {'t': '0'}, 'correct', ['0;1;4']),
    spec('Inutiles : « Aucune » refusé', 1, {'t': '0'}, 'incorrect', ['5']),
    spec('Impossible : « Aucune »', 2, {'t': '1'}, 'correct', ['5']),
    spec('Impossible : masse et prix cochés', 2, {'t': '1'}, 'incorrect', ['1;2']),
    spec('Impossible : vélo, la masse du vélo cochée', 2, {'t': '2'}, 'incorrect', ['3']),
]

N4 = modele(
    'Quelles informations servent ?',
    'Dans un énoncé à cinq informations chiffrées (classe, marché, vélo, livreur), cocher celles '
    'qui servent à répondre, puis celles qui ne servent pas ; question à laquelle on ne peut pas '
    'répondre (« Aucune »)',
    2, 60, [N4_UTILES, N4_INUTILES, N4_IMPOSSIBLE], SPECS_N4, grades=['6', '5'],
    rangement=PROBLEMES)


# =============================================================================================
# N5 — 5-001 : résoudre un problème qui a des données inutiles.
# =============================================================================================

N5_LIVRES = variation(
    'Dans la classe de 6e A, il y a ${{E}}$ élèves de $11$ ans. Chaque élève porte ${{L}}$ livres '
    'dans son sac, et chaque livre pèse ${{G}}~\\unit{g}$.\n\nQuelle masse de livres chaque élève '
    'porte-t-il ? Écris l\'unité dans ta réponse.\n\nChaque élève porte $?$ de livres.',
    [var('E', '17..35'), var('L', '3..10'), var('q', '4..12'), var('G', 'eval:50*q')],
    [case('{{eval:(L*G)[g]}}', [
        erreur('{{eval:(E*G)[g]}}', 'Tu as pris le nombre d\'élèves : chaque élève porte '
               '${{L}}$ livres.', 'Nombre d\'élèves au lieu du nombre de livres'),
        erreur('{{eval:(E*L*G)[g]}}', 'C\'est la masse des livres de toute la classe : la '
               'question parle d\'un seul élève.', 'Toute la classe'),
        erreur('{{eval:(G)[g]}}', 'C\'est la masse d\'un seul livre : chaque élève en porte '
               '${{L}}$.', 'Un seul livre'),
    ], unite=True)],
    [
        '**Ce qui sert.** La question parle d\'un élève : le nombre d\'élèves et leur âge ne '
        'servent pas.',
        '${{L}} \\times {{G}} = ' + couleur('{{eval:L*G}}~\\unit{g}') + '$.',
    ],
    'La question parle d\'un seul élève : quelles informations faut-il ?',
    ['E!=L'],
)

N5_MANGA = variation(
    'Un manga de ${{N}}$ pages a ${{C}}$ cases par page. Il coûte $' + prix('P') + '$. Inès le '
    'paie avec un billet de ${{B}}~\\unit{€}$.\n\nCombien lui rend-on ? Écris l\'unité dans ta '
    'réponse.\n\nOn lui rend $?$.',
    [var('N', '48..96'), var('C', '5..9'), var('P', '500..999'), var('B', '10|20')],
    [case(prix('100*B-P'), [
        erreur(prix('P'), 'C\'est le prix du manga : on demande ce qu\'on lui rend.',
               'Prix du manga'),
        erreur(prix('100*B+P'), 'Tu as ajouté le prix au billet : la marchande garde le prix '
               'du manga, elle rend le reste.', 'Addition au lieu de soustraction'),
    ], unite=True)],
    [
        '**Ce qui sert.** Le nombre de pages et de cases ne change rien au prix : seuls le prix et '
        'le billet servent.',
        '${{B}} - ' + prix_nu('P') + ' = ' + couleur(prix('100*B-P')) + '$.',
    ],
    'Quelles informations parlent d\'argent ?',
    ['mod(P,5)==0'],
)

N5_CARGO = variation(
    'Un cargo de ${{Lm}}~\\unit{m}$ de long transporte $3$ grands conteneurs et ${{K}}$ petits '
    'conteneurs identiques. Les petits conteneurs pèsent $' + d('K*q/20') + '~\\unit{t}$ en '
    'tout.\n\nQuelle est la masse d\'un petit conteneur, en kilogrammes ? Écris l\'unité dans ta '
    'réponse.\n\nUn petit conteneur pèse $?$.',
    [var('Lm', '85..153'), var('K', '8..25'), var('q', '10..18')],
    [case('{{eval:(50*q)[kg]}}', [
        erreur('{{eval:(50*q/1000)[kg]}}', 'Tu as gardé des tonnes en écrivant des kilogrammes : '
               '$1~\\unit{t} = 1\\,000~\\unit{kg}$.', 'Tonnes non converties'),
        erreur('{{eval:(50*q*K)[kg]}}', 'C\'est la masse de tous les petits conteneurs : '
               'partage-la entre les ${{K}}$.', 'Masse non partagée'),
    ], unite=True)],
    [
        '**Ce qui sert.** La longueur du cargo et les grands conteneurs ne servent pas : la masse '
        'donnée est celle des ${{K}}$ petits.',
        '**Convertir.** $' + d('K*q/20') + '~\\unit{t} = {{eval:50*q*K}}~\\unit{kg}$.',
        '**Partager.** ${{eval:50*q*K}} \\div {{K}} = ' + couleur('{{eval:50*q}}~\\unit{kg}')
        + '$.',
    ],
    'Combien de kilogrammes font $' + d('K*q/20') + '~\\unit{t}$ ? Entre combien de conteneurs '
    'les partager ?',
    ['K*q>=280', 'K*q<=420', 'mod(K*q,2)==0'],
)

N5_LIVREUR = variation(
    'Un livreur part à $8$ h avec ${{C}}$ colis. Il roule ${{d1}}~\\unit{km}$ jusqu\'au premier '
    'arrêt, où il dépose ${{D}}$ colis. Puis il roule ${{d2}}~\\unit{km}$ jusqu\'au second arrêt, '
    'où il dépose tous les autres.\n\nCombien de colis dépose-t-il au second arrêt ?\n\n'
    'Il dépose $?$ colis.',
    [var('C', '21..39'), var('D', '7..18'), var('d1', '7..15'), var('d2', '3..9')],
    [case('{{eval:C-D}}', [
        erreur('{{eval:C+D}}', 'Tu as ajouté : au premier arrêt, les colis déposés quittent le '
               'camion.', 'Addition au lieu de soustraction'),
        erreur('{{D}}', 'C\'est ce qu\'il dépose au premier arrêt : au second, il dépose tous '
               'les autres.', 'Colis du premier arrêt'),
        erreur('{{eval:C-D-d1}}', 'Tu as retiré des kilomètres à des colis : les distances ne '
               'servent pas ici.', 'Distance utilisée'),
    ])],
    [
        '**Ce qui sert.** L\'heure de départ et les distances ne servent pas : on compte des '
        'colis.',
        '${{C}} - {{D}} = ' + couleur('{{eval:C-D}}') + '$ colis.',
    ],
    'La question compte des colis : quelles informations parlent de colis ?',
    ['C-D>=5', 'C-D!=D', 'C-D-d1>0', 'd1!=D'],
)

SPECS_N5 = [
    spec('Livres : 6 × 350 g = 2 100 g', 0, {'E': '24', 'L': '6', 'q': '7', 'G': '350'}, 'correct',
         ['2\\,100\\,\\mathrm{g}']),
    spec('Livres : 2,1 kg accepté', 0, {'E': '24', 'L': '6', 'q': '7', 'G': '350'}, 'correct',
         ['2{,}1\\,\\mathrm{kg}']),
    spec('Livres : sans unité refusé', 0, {'E': '24', 'L': '6', 'q': '7', 'G': '350'},
         'incorrect', ['2100']),
    spec('Livres : élèves × masse (8 400 g)', 0, {'E': '24', 'L': '6', 'q': '7', 'G': '350'},
         'incorrect', ['8\\,400\\,\\mathrm{g}'],
         'Tu as pris le nombre d\'élèves : chaque élève porte $6$ livres.'),
    spec('Livres : toute la classe (50 400 g)', 0, {'E': '24', 'L': '6', 'q': '7', 'G': '350'},
         'incorrect', ['50\\,400\\,\\mathrm{g}'],
         'C\'est la masse des livres de toute la classe : la question parle d\'un seul élève.'),
    spec('Livres : un livre (350 g)', 0, {'E': '24', 'L': '6', 'q': '7', 'G': '350'}, 'incorrect',
         ['350\\,\\mathrm{g}'], 'C\'est la masse d\'un seul livre : chaque élève en porte $6$.'),
    spec('Manga : 20 − 7,85 = 12,15 €', 1, {'N': '64', 'C': '6', 'P': '785', 'B': '20'},
         'correct', ['12{,}15\\,€']),
    spec('Manga : prix (7,85 €)', 1, {'N': '64', 'C': '6', 'P': '785', 'B': '20'}, 'incorrect',
         ['7{,}85\\,€'], 'C\'est le prix du manga : on demande ce qu\'on lui rend.'),
    spec('Manga : 27,85 €', 1, {'N': '64', 'C': '6', 'P': '785', 'B': '20'}, 'incorrect',
         ['27{,}85\\,€'],
         'Tu as ajouté le prix au billet : la marchande garde le prix du manga, elle rend le '
         'reste.'),
    spec('Cargo : 20 conteneurs, 15 t → 750 kg', 2, {'Lm': '120', 'K': '20', 'q': '15'},
         'correct', ['750\\,\\mathrm{kg}']),
    spec('Cargo : 0,75 t accepté', 2, {'Lm': '120', 'K': '20', 'q': '15'}, 'correct',
         ['0{,}75\\,\\mathrm{t}']),
    spec('Cargo : tonnes gardées (0,75 kg)', 2, {'Lm': '120', 'K': '20', 'q': '15'}, 'incorrect',
         ['0{,}75\\,\\mathrm{kg}'],
         'Tu as gardé des tonnes en écrivant des kilogrammes : $1~\\unit{t} = 1\\,000~'
         '\\unit{kg}$.'),
    spec('Cargo : non partagé (15 000 kg)', 2, {'Lm': '120', 'K': '20', 'q': '15'}, 'incorrect',
         ['15\\,000\\,\\mathrm{kg}'],
         'C\'est la masse de tous les petits conteneurs : partage-la entre les $20$.'),
    spec('Livreur : 32 − 11 = 21', 3, {'C': '32', 'D': '11', 'd1': '9', 'd2': '5'}, 'correct',
         ['21']),
    spec('Livreur : addition (43)', 3, {'C': '32', 'D': '11', 'd1': '9', 'd2': '5'}, 'incorrect',
         ['43'], 'Tu as ajouté : au premier arrêt, les colis déposés quittent le camion.'),
    spec('Livreur : premier arrêt (11)', 3, {'C': '32', 'D': '11', 'd1': '9', 'd2': '5'},
         'incorrect', ['11'],
         'C\'est ce qu\'il dépose au premier arrêt : au second, il dépose tous les autres.'),
    spec('Livreur : km retirés (12)', 3, {'C': '32', 'D': '11', 'd1': '9', 'd2': '5'},
         'incorrect', ['12'],
         'Tu as retiré des kilomètres à des colis : les distances ne servent pas ici.'),
]

N5 = modele(
    'Problèmes avec des données inutiles',
    'Résoudre un problème dont l\'énoncé donne aussi des informations qui ne servent pas : masse '
    'des livres d\'un élève, monnaie rendue sur un manga, masse d\'un conteneur (tonnes en '
    'kilogrammes), colis du second arrêt ; pièges : calcul fait avec une donnée inutile, '
    'conversion oubliée',
    3, 90, [N5_LIVRES, N5_MANGA, N5_CARGO, N5_LIVREUR], SPECS_N5, ZEROS_LIBRES,
    grades=['6', '5'], rangement=PROBLEMES)


ecrire('n1-balances-deux-objets', N1)
ecrire('n2-deux-nombres-inconnus', N2)
ecrire('n3-problemes-plusieurs-etapes-decimaux', N3)
ecrire('n4-quelles-informations-servent', N4)
ecrire('n5-problemes-donnees-inutiles', N5)
print('5 modèles écrits dans', DOSSIER)
