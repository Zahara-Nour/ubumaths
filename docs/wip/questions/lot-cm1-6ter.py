"""Écrit les 8 modèles du lot 6 ter du CM1 (algèbre) dans scripts/questions/cm1-6ter/.

Phase 0 validée par David le 2026-11-16 (§ 18 et 18 bis du journal
`docs/archive/wip/questions-cm1-progress.md`, « je te suis » après mes cinq recommandations) : un lot de
8 modèles (CM1-062 à 066) ; schéma en barres de 6t-3 dans l'énoncé ET dans le corrigé ; « formuler
la règle » en case « choix » (6t-6, 6t-8) ; niveau 1 dans chaque nœud, sans renuméroter personne ;
065 rangé sous « suites de motifs », le nœud de son point.

Bornes (`cycle3.json`, exemples de réussite CM1 2025 p.13-14) : balances (k objets identiques
= M g ; 3 ciseaux + 140 g = 500 g) ; 3 × (2 + N) = 27 ; « en ajoutant 7 au triple du nombre de
Mia, on trouve 100 » sur un schéma en barres ; programmes d'au plus deux étapes, nombre de départ
entier ; les trois termes suivants de suites +4, ×3, +5 −2, +1 +4 ; le nombre d'éléments d'un motif
aux trois étapes suivantes, la règle dite à partir de l'étape précédente.

Pièges (relus dans le journal) : aucune `{{if}}` dans une réponse attendue ; `i` et `e` jamais
comme variables ; une plage négative ne se tire pas ; case « choix » : réponse = indice d'origine,
la bonne en premier, mélangée à l'affichage.

    python3 docs/wip/questions/lot-cm1-6ter.py scripts/questions/cm1-6ter
"""
import json
import sys

DOSSIER = sys.argv[1]
ENTIERS = {'constraints': {'spacesFromFourDigits': True}}
MODELES = {}

# ---- Gabarits (comme lot-cm1-6bis.py) ----


def spec(desc, vi, variables, answers, status):
    return {'description': desc, 'variationIndex': vi,
            'variables': {k: str(x) for k, x in variables.items()},
            'answers': answers if isinstance(answers, list) else [answers],
            'expected': {'status': status}}


def modele(title, description, variations, specs, delay=90):
    # niveau 1 dans chaque nœud (§ 18 bis) ; le rangement est posé par la migration (ADR 0035)
    return {'title': title, 'description': description, 'grades': ['CM1'], 'level': 1,
            'delay': delay, 'status': 'draft', 'options': ENTIERS, 'variations': variations,
            'testSpecs': specs}


def var(nom, expression):
    return {'name': nom, 'expression': expression}


def variation(enonce, variables, reponses, etapes, conditions=None):
    v = {'statement': enonce, 'variables': variables}
    if conditions:
        v['conditions'] = conditions
    v['blanks'] = [{'expectedAnswer': r} for r in reponses]
    v['correction'] = {'steps': etapes}
    return v


def ev(x):
    return '{{eval:' + x + '}}'


def m(x):
    return '$' + x + '$'


def col(x):
    return '\\textcolor{{{color:primary.0}}}{' + x + '}'


def choix(items):
    """Case « choix » : la bonne réponse en premier (indice 0), mélangée à l'affichage."""
    return '```choix\n' + '\n'.join('- ' + it for it in items) + '\n```'


def ecrire(nom, mod):
    MODELES[nom] = mod


# ============================================================================
# Figures : balance à l'équilibre, motifs
# ============================================================================


def boite(nom, x1, x2, etiquette):
    """Une masse marquée posée sur le fléau (y de 1,3 à 2,2), son étiquette au centre.

    `x1` vaut aussi 'apres-billes' : la masse se pose juste après les k billes (largeur 1,3).
    """
    if x1 == 'apres-billes':
        x1, x2, centre = '{{eval:0.6*k+0.45;d}}', '{{eval:0.6*k+1.75;d}}', '{{eval:0.6*k+1.1;d}}'
    else:
        centre = (x1 + x2) / 2
    return [
        f'{nom}1 = point({x1}, 1.3, visible=faux)',
        f'{nom}2 = point({x2}, 1.3, visible=faux)',
        f'{nom}3 = point({x2}, 2.2, visible=faux)',
        f'{nom}4 = point({x1}, 2.2, visible=faux)',
        f'{nom}P = polygone({nom}1, {nom}2, {nom}3, {nom}4, couleur="noir", remplissage="jaune",'
        ' opacite_fond=0.3)',
        f'texte({centre}, 1.75, "{etiquette}")',
    ]


def balance(description, boites_gauche, boites_droite):
    """Balance à l'équilibre : pied, fléau horizontal ; à gauche k billes (k ≤ 6, variable `k`)."""
    lignes = [
        '```figure',
        'fenetre: 0 ; 9 ; -0.4 ; 2.6',
        'description: ' + description,
        '---',
        'B1 = point(3.95, 0, visible=faux)',
        'B2 = point(5.05, 0, visible=faux)',
        'B3 = point(4.5, 1.15, visible=faux)',
        'BP = polygone(B1, B2, B3, couleur="noir", remplissage="gris", opacite_fond=1)',
        'F1 = point(0.3, 1.2, visible=faux)',
        'F2 = point(8.7, 1.2, visible=faux)',
        'segment(F1, F2, epaisseur=4)',
    ]
    for j in range(6):
        x = round(0.6 + 0.6 * j, 2)
        lignes.append(f'K{j} = point({x}, 1.5, visible=faux)')
        lignes.append(f'cercle(K{j}, rayon=0.27, couleur="bleu", remplissage="bleu", opacite_fond=1,'
                      ' visible={{if:' + str(j) + '<k|vrai|faux}})')
    for nom, x1, x2, etiquette in boites_gauche + boites_droite:
        lignes += boite(nom, x1, x2, etiquette)
    lignes.append('```')
    return '\n'.join(lignes)


def jeton(nom, x, y, couleur, visible=None):
    v = '' if visible is None else ', visible=' + visible
    return [f'{nom} = point({x}, {y}, visible=faux)',
            f'cercle({nom}, rayon=0.3, couleur="{couleur}", remplissage="{couleur}",'
            f' opacite_fond=1{v})']


ORIGINES = [0, 1.5, 4]  # abscisse de la 1re colonne des étapes 1, 2, 3 (colonnes espacées de 1)


def etiquettes_etapes(centres, y):
    return [f'texte({c}, {y}, "Étape {s + 1}")' for s, c in enumerate(centres)]


def motif_colonnes():
    """Étape s : s colonnes de k jetons (k de 2 à 4, variable `k`)."""
    lignes = ['```figure', 'fenetre: -0.7 ; 6.7 ; -1.6 ; {{eval:k-0.3;d}}',
              'description: Trois étapes d\'un motif de jetons : 1, 2 puis 3 colonnes de {{k}} jetons.',
              '---']
    for s in range(3):
        for c in range(s + 1):
            for r in range(4):
                lignes += jeton(f'J{s}{c}{r}', ORIGINES[s] + c, r, 'rouge',
                                '{{if:' + str(r) + '<k|vrai|faux}}')
    lignes += etiquettes_etapes([0, 2, 5], -1)
    lignes.append('```')
    return '\n'.join(lignes)


def motif_escalier():
    """Étape s : colonnes de hauteurs 1, 2, …, s (1, 3, 6 jetons)."""
    lignes = ['```figure', 'fenetre: -0.7 ; 6.7 ; -1.6 ; 2.7',
              'description: Trois étapes d\'un motif de jetons en escalier : 1 jeton, puis des '
              'colonnes de 1 et 2 jetons, puis des colonnes de 1, 2 et 3 jetons.',
              '---']
    for s in range(3):
        for c in range(s + 1):
            for r in range(c + 1):
                lignes += jeton(f'J{s}{c}{r}', ORIGINES[s] + c, r, 'bleu')
    lignes += etiquettes_etapes([0, 2, 5], -1)
    lignes.append('```')
    return '\n'.join(lignes)


def allumette(a, b):
    return f'segment({a}, {b}, couleur="marron", epaisseur=3)'


def motif_carres():
    """Étape s : s carrés d'allumettes accolés (4, 7, 10 allumettes)."""
    lignes = ['```figure', 'fenetre: -0.5 ; 9.5 ; -1.5 ; 1.5',
              'description: Trois étapes d\'un motif d\'allumettes : une rangée de 1, 2 puis 3 carrés '
              'accolés.',
              '---']
    debuts = [0, 2.5, 6]
    for s in range(3):
        n = s + 1
        for j in range(n + 1):
            x = debuts[s] + j
            lignes.append(f'C{s}B{j} = point({x}, 0, visible=faux)')
            lignes.append(f'C{s}H{j} = point({x}, 1, visible=faux)')
        for j in range(n):
            lignes.append(allumette(f'C{s}B{j}', f'C{s}B{j + 1}'))
            lignes.append(allumette(f'C{s}H{j}', f'C{s}H{j + 1}'))
        for j in range(n + 1):
            lignes.append(allumette(f'C{s}B{j}', f'C{s}H{j}'))
    lignes += etiquettes_etapes([0.5, 3.5, 7.5], -0.9)
    lignes.append('```')
    return '\n'.join(lignes)


def motif_triangles():
    """Étape s : bande de s triangles, pointe en haut puis en bas (3, 5, 7 allumettes)."""
    lignes = ['```figure', 'fenetre: -0.5 ; 7 ; -1.5 ; 1.4',
              'description: Trois étapes d\'un motif d\'allumettes : une bande de 1, 2 puis 3 '
              'triangles accolés.',
              '---']
    debuts = [0, 1.75, 4]
    h = 0.87
    for s in range(3):
        n = s + 1
        nb_bas = (n + 1) // 2 + 1  # sommets du bas
        nb_haut = n // 2 + 1       # sommets du haut
        for j in range(nb_bas):
            lignes.append(f'T{s}B{j} = point({debuts[s] + j}, 0, visible=faux)')
        for j in range(nb_haut):
            lignes.append(f'T{s}H{j} = point({debuts[s] + j + 0.5}, {h}, visible=faux)')
        for j in range(nb_bas - 1):
            lignes.append(allumette(f'T{s}B{j}', f'T{s}B{j + 1}'))
        for j in range(nb_haut - 1):
            lignes.append(allumette(f'T{s}H{j}', f'T{s}H{j + 1}'))
        # n + 1 côtés obliques : B0-H0, H0-B1, B1-H1, …
        sommets = []
        for j in range(nb_bas):
            sommets.append(f'T{s}B{j}')
            if j < nb_haut:
                sommets.append(f'T{s}H{j}')
        for j in range(n + 1):
            lignes.append(allumette(sommets[j], sommets[j + 1]))
    lignes += etiquettes_etapes([0.5, 2.75, 5.5], -0.9)
    lignes.append('```')
    return '\n'.join(lignes)


# ============================================================================
# 6t-1 — CM1-062 : balance, la masse d'un objet
# ============================================================================

QUESTION_BILLE = '\n\nCombien pèse une bille ?\n\nUne bille pèse $?$ g.'
INTRO_BILLES = 'Les ${{k}}$ billes sont identiques. La balance est en équilibre.\n\n'

BA_SEULES = variation(
    INTRO_BILLES + balance(
        'Une balance en équilibre : à gauche {{k}} billes identiques, à droite une masse de {{w}} g.',
        [], [('D', 5.3, 7.7, '{{w}} g')]) + QUESTION_BILLE,
    [var('k', '2..6'), var('p', '5..60'), var('w', 'eval:k*p')],
    ['{{p}}'],
    ['**Équilibre.** Les deux plateaux pèsent autant : les ${{k}}$ billes pèsent ${{w}}$ g en tout.',
     'On note $B$ la masse d\'une bille, en g : $${{k}} \\times B = {{w}}$$',
     '**Une bille.** $B = {{w}} \\div {{k}} = ' + col('{{p}}') + '$ : une bille pèse '
     + m(col('{{p}}')) + ' g.',
     '**Vérification.** ${{k}} \\times {{p}} = {{w}}$.'])

BA_AVEC_MASSE = variation(
    INTRO_BILLES + balance(
        'Une balance en équilibre : à gauche {{k}} billes identiques et une masse de {{a}} g, à '
        'droite une masse de {{w}} g.',
        [('G', 'apres-billes', None, '{{a}} g')], [('D', 5.3, 7.7, '{{w}} g')]) + QUESTION_BILLE,
    [var('k', '2..4'), var('p', '20..150'), var('x', '2..30'), var('a', 'eval:10*x'),
     var('w', 'eval:k*p+a')],
    ['{{p}}'],
    ['On note $B$ la masse d\'une bille, en g : $${{k}} \\times B + {{a}} = {{w}}$$',
     '**On retire ${{a}}$ g de chaque plateau.** L\'équilibre reste : ${{k}} \\times B = {{w}} - {{a}}'
     ' = ' + ev('k*p') + '$.',
     '**Une bille.** $B = ' + ev('k*p') + ' \\div {{k}} = ' + col('{{p}}') + '$ : une bille pèse '
     + m(col('{{p}}')) + ' g.',
     '**Vérification.** ${{k}} \\times {{p}} + {{a}} = ' + ev('k*p') + ' + {{a}} = {{w}}$.'])

BA_DEUX_MASSES = variation(
    INTRO_BILLES + balance(
        'Une balance en équilibre : à gauche {{k}} billes identiques, à droite deux masses de {{a}} g '
        'et de {{b}} g.',
        [], [('D', 4.95, 6.65, '{{a}} g'), ('E', 6.9, 8.6, '{{b}} g')]) + QUESTION_BILLE,
    [var('k', '2..5'), var('p', '10..100'), var('x', '1..40'), var('a', 'eval:10*x'),
     var('b', 'eval:k*p-a')],
    ['{{p}}'],
    ['**Équilibre.** Les ${{k}}$ billes pèsent autant que les deux masses : ${{a}} + {{b}} = '
     + ev('k*p') + '$ g.',
     'On note $B$ la masse d\'une bille, en g : $${{k}} \\times B = ' + ev('k*p') + '$$',
     '**Une bille.** $B = ' + ev('k*p') + ' \\div {{k}} = ' + col('{{p}}') + '$ : une bille pèse '
     + m(col('{{p}}')) + ' g.',
     '**Vérification.** ${{k}} \\times {{p}} = ' + ev('k*p') + '$.'],
    ['b>=10'])

ecrire('01-balance-masse-d-un-objet', modele(
    'Balance : la masse d\'un objet',
    'Balance à l\'équilibre dessinée : des billes identiques seules, avec une masse, ou face à deux '
    'masses ; trouver la masse d\'une bille (nombre inconnu noté B dans le corrigé)',
    [BA_SEULES, BA_AVEC_MASSE, BA_DEUX_MASSES],
    [spec('5 billes = 250 g : 50 g', 0, {'k': 5, 'p': 50, 'w': 250}, '50', 'correct'),
     spec('Erreur : 250 (pas divisé)', 0, {'k': 5, 'p': 50, 'w': 250}, '250', 'incorrect'),
     spec('3 billes + 140 g = 500 g : 120 g', 1, {'k': 3, 'p': 120, 'x': 14, 'a': 140, 'w': 500},
          '120', 'correct'),
     spec('Erreur : 360 (pas divisé)', 1, {'k': 3, 'p': 120, 'x': 14, 'a': 140, 'w': 500}, '360',
          'incorrect'),
     spec('Erreur : 166 (masse de gauche oubliée)', 1,
          {'k': 3, 'p': 120, 'x': 14, 'a': 140, 'w': 500}, '166', 'incorrect'),
     spec('4 billes = 200 g + 120 g : 80 g', 2, {'k': 4, 'p': 80, 'x': 20, 'a': 200, 'b': 120}, '80',
          'correct'),
     spec('Erreur : 320 (pas divisé)', 2, {'k': 4, 'p': 80, 'x': 20, 'a': 200, 'b': 120}, '320',
          'incorrect')]))

# ============================================================================
# 6t-2 — CM1-062 : trouver le nombre choisi
# ============================================================================

NC_PARENTHESES = variation(
    'Rose a choisi un nombre, noté $N$. Elle a calculé $${{k}} \\times ({{a}} + N)$$ et elle a '
    'trouvé ${{r}}$.\n\nQuel nombre Rose a-t-elle choisi ?\n\n$N = ?$',
    [var('k', '2..5'), var('a', '1..9'), var('n', '2..20'), var('r', 'eval:k*(a+n)')],
    ['{{n}}'],
    ['**Le nombre entre parenthèses.** ${{k}} \\times ({{a}} + N) = {{r}}$, donc $({{a}} + N) = '
     '{{r}} \\div {{k}} = ' + ev('a+n') + '$.',
     '**Le nombre choisi.** ${{a}} + N = ' + ev('a+n') + '$, donc $N = ' + ev('a+n') + ' - {{a}} = '
     + col('{{n}}') + '$.',
     '**Vérification.** ${{k}} \\times ({{a}} + {{n}}) = {{k}} \\times ' + ev('a+n') + ' = {{r}}$.'])

NC_PRODUIT = variation(
    'Léo a choisi un nombre, noté $N$. Il a calculé $$N \\times {{k}} + {{a}}$$ et il a trouvé '
    '${{r}}$.\n\nQuel nombre Léo a-t-il choisi ?\n\n$N = ?$',
    [var('k', '2..9'), var('a', '1..20'), var('n', '2..30'), var('r', 'eval:n*k+a')],
    ['{{n}}'],
    ['**On défait la dernière étape.** $N \\times {{k}} + {{a}} = {{r}}$, donc $N \\times {{k}} = '
     '{{r}} - {{a}} = ' + ev('n*k') + '$.',
     '**Puis la première.** $N = ' + ev('n*k') + ' \\div {{k}} = ' + col('{{n}}') + '$.',
     '**Vérification.** ${{n}} \\times {{k}} + {{a}} = ' + ev('n*k') + ' + {{a}} = {{r}}$.'])

CARRES = '{\\square} + {\\square}{{if:k>2| + {\\square}|}}{{if:k>3| + {\\square}|}}'

NC_SYMBOLES = variation(
    'Chaque symbole cache un nombre ; un même symbole cache toujours le même nombre.\n\n'
    '$$' + CARRES + ' = {{s}}$$\n\n$${\\square} + {\\triangle} = {{t}}$$\n\n'
    'Quel nombre cache $\\triangle$ ?\n\n$\\triangle = ?$',
    [var('k', '2..4'), var('c', '2..30'), var('d', '1..40'), var('s', 'eval:k*c'),
     var('t', 'eval:c+d')],
    ['{{d}}'],
    ['**D\'abord $\\square$.** ${{k}}$ fois le même nombre font ${{s}}$ : $\\square = {{s}} \\div '
     '{{k}} = {{c}}$.',
     '**Puis $\\triangle$.** ${{c}} + \\triangle = {{t}}$, donc $\\triangle = {{t}} - {{c}} = '
     + col('{{d}}') + '$.',
     '**Vérification.** ${{c}} + {{d}} = {{t}}$.'],
    ['c!=d'])

ecrire('02-trouver-le-nombre-choisi', modele(
    'Trouver le nombre choisi',
    'Un nombre inconnu noté par une lettre ou un symbole : k × (a + N) = r, N × k + a = r, deux '
    'égalités à symboles enchaînées',
    [NC_PARENTHESES, NC_PRODUIT, NC_SYMBOLES],
    [spec('3 × (2 + N) = 27 : N = 7', 0, {'k': 3, 'a': 2, 'n': 7, 'r': 27}, '7', 'correct'),
     spec('Erreur : 9 (le 2 oublié)', 0, {'k': 3, 'a': 2, 'n': 7, 'r': 27}, '9', 'incorrect'),
     spec('N × 4 + 5 = 53 : N = 12', 1, {'k': 4, 'a': 5, 'n': 12, 'r': 53}, '12', 'correct'),
     spec('Erreur : 48 (pas divisé)', 1, {'k': 4, 'a': 5, 'n': 12, 'r': 53}, '48', 'incorrect'),
     spec('□ + □ + □ = 36, □ + △ = 20 : △ = 8', 2, {'k': 3, 'c': 12, 'd': 8, 's': 36, 't': 20}, '8',
          'correct'),
     spec('Erreur : 12 (le carré rendu)', 2, {'k': 3, 'c': 12, 'd': 8, 's': 36, 't': 20}, '12',
          'incorrect')]))

# ============================================================================
# 6t-3 — CM1-063 : schéma en barres, le nombre choisi
# ============================================================================


def parts(etiquette, longueur='2'):
    """k parts égales (k de 2 à 5, variable `k`) dans une barre."""
    p = etiquette + ' (' + longueur + ')'
    return (p + ' ; ' + p + '{{if:k>2| ; ' + p + '|}}{{if:k>3| ; ' + p + '|}}{{if:k>4| ; ' + p
            + '|}}')


def barres(*lignes):
    return '```schema-barres\n' + '\n'.join(lignes) + '\n```'


SB_PLUS = variation(
    'Mia a choisi un nombre. Elle le multiplie par ${{k}}$, puis elle ajoute ${{b}}$ : elle trouve '
    '${{r}}$.\n\n' + barres('Mia : ' + parts('?') + ' ; {{b}} (1) = {{r}}')
    + '\n\nQuel nombre Mia a-t-elle choisi ?\n\nMia a choisi $?$.',
    [var('k', '2..5'), var('n', '5..40'), var('b', '1..30'), var('r', 'eval:k*n+b')],
    ['{{n}}'],
    ['**On enlève ${{b}}$.** Il reste ${{k}}$ parts égales : ${{r}} - {{b}} = ' + ev('k*n') + '$.',
     '**Une part.** $' + ev('k*n') + ' \\div {{k}} = ' + col('{{n}}') + '$ : Mia a choisi '
     + m(col('{{n}}')) + '.\n\n' + barres('Mia : ' + parts('{{n}}') + ' ; {{b}} (1) = {{r}}') + '\n\n',
     '**Vérification.** ${{n}} \\times {{k}} + {{b}} = ' + ev('k*n') + ' + {{b}} = {{r}}$.'],
    ['r<=200'])

SB_MOINS = variation(
    'Tom a choisi un nombre. Il le multiplie par ${{k}}$, puis il retire ${{b}}$ : il trouve '
    '${{r}}$.\n\n' + barres('Tom : ' + parts('?'), ' : {{r}} (' + ev('2*k-1') + ') ; -{{b}} (1)')
    + '\n\nQuel nombre Tom a-t-il choisi ?\n\nTom a choisi $?$.',
    [var('k', '2..5'), var('n', '6..40'), var('b', '1..20'), var('r', 'eval:k*n-b')],
    ['{{n}}'],
    ['**On rajoute ${{b}}$.** Les ${{k}}$ parts égales font ${{r}} + {{b}} = ' + ev('k*n') + '$.',
     '**Une part.** $' + ev('k*n') + ' \\div {{k}} = ' + col('{{n}}') + '$ : Tom a choisi '
     + m(col('{{n}}')) + '.\n\n'
     + barres('Tom : ' + parts('{{n}}'), ' : {{r}} (' + ev('2*k-1') + ') ; -{{b}} (1)') + '\n\n',
     '**Vérification.** ${{n}} \\times {{k}} - {{b}} = ' + ev('k*n') + ' - {{b}} = {{r}}$.'],
    ['r<=200', 'r>=5'])

SB_FOIS_PLUS = variation(
    'Léo et Zoé ont ${{t}}$ billes à eux deux. Zoé en a ${{k}}$ fois plus que Léo.\n\n'
    + barres('Léo : ?', 'Zoé : ' + parts('?', '1'), 'total : {{t}}')
    + '\n\nCombien de billes chacun a-t-il ?\n\nLéo : $?$ billes\n\nZoé : $?$ billes',
    [var('k', '2..5'), var('n', '3..40'), var('t', 'eval:(k+1)*n')],
    ['{{n}}', '{{eval:k*n}}'],
    ['**Des parts égales.** Léo a $1$ part, Zoé ${{k}}$ parts : $' + ev('k+1') + '$ parts en tout.',
     '**Une part.** ${{t}} \\div ' + ev('k+1') + ' = ' + col('{{n}}') + '$ : Léo a '
     + m(col('{{n}}')) + ' billes.',
     '**Zoé.** ${{n}} \\times {{k}} = ' + col(ev('k*n')) + '$ : Zoé a ' + m(col(ev('k*n')))
     + ' billes.\n\n' + barres('Léo : {{n}}', 'Zoé : ' + parts('{{n}}', '1'), 'total : {{t}}')
     + '\n\n',
     '**Vérification.** ${{n}} + ' + ev('k*n') + ' = {{t}}$.'],
    ['t<=200'])

SB_ECART = variation(
    'Hugo et Nina ont ${{t}}$ cartes à eux deux. Nina en a ${{d}}$ de plus que Hugo.\n\n'
    + barres('Hugo : ? (3)', 'Nina : ? (3) ; {{d}} (1,5)', 'total : {{t}}')
    + '\n\nCombien de cartes chacun a-t-il ?\n\nHugo : $?$ cartes\n\nNina : $?$ cartes',
    [var('p', '5..90'), var('d', '2..60'), var('t', 'eval:2*p+d')],
    ['{{p}}', '{{eval:p+d}}'],
    ['**Deux parts égales.** On enlève l\'écart du total : ${{t}} - {{d}} = ' + ev('2*p')
     + '$. Il reste deux barres égales.',
     '**Hugo.** $' + ev('2*p') + ' \\div 2 = ' + col('{{p}}') + '$.',
     '**Nina.** ${{p}} + {{d}} = ' + col(ev('p+d')) + '$.\n\n'
     + barres('Hugo : {{p}} (3)', 'Nina : {{p}} (3) ; {{d}} (1,5)', 'total : {{t}}') + '\n\n',
     '**Vérification.** ${{p}} + ' + ev('p+d') + ' = {{t}}$.'],
    ['t<=200', 'p>=d', 'd*4>=p'])

ecrire('03-schema-en-barres-le-nombre-choisi', modele(
    'Schéma en barres : le nombre choisi',
    'Problèmes algébriques appuyés sur un schéma en barres donné : k fois un nombre plus ou moins b, '
    '« k fois plus », somme et écart (nombres ≤ 200)',
    [SB_PLUS, SB_MOINS, SB_FOIS_PLUS, SB_ECART],
    [spec('3 × N + 7 = 100 : 31', 0, {'k': 3, 'n': 31, 'b': 7, 'r': 100}, '31', 'correct'),
     spec('Erreur : 93 (pas divisé)', 0, {'k': 3, 'n': 31, 'b': 7, 'r': 100}, '93', 'incorrect'),
     spec('Erreur : 33 (le 7 oublié)', 0, {'k': 3, 'n': 31, 'b': 7, 'r': 100}, '33', 'incorrect'),
     spec('3 × N − 6 = 54 : 20', 1, {'k': 3, 'n': 20, 'b': 6, 'r': 54}, '20', 'correct'),
     spec('Erreur : 16 (6 retiré au lieu d\'ajouté)', 1, {'k': 3, 'n': 20, 'b': 6, 'r': 54}, '16',
          'incorrect'),
     spec('84 billes, 3 fois plus : 21 et 63', 2, {'k': 3, 'n': 21, 't': 84}, ['21', '63'],
          'correct'),
     spec('Erreur : 28 et 84 (divisé par 3)', 2, {'k': 3, 'n': 21, 't': 84}, ['28', '84'],
          'incorrect'),
     spec('84 cartes, écart 12 : 36 et 48', 3, {'p': 36, 'd': 12, 't': 84}, ['36', '48'], 'correct'),
     spec('Erreur : 42 et 54 (moitié du total)', 3, {'p': 36, 'd': 12, 't': 84}, ['42', '54'],
          'incorrect')],
    delay=120))

# ============================================================================
# 6t-4 — CM1-064 : exécuter un programme de calcul (deux étapes)
# ============================================================================

QUESTION_PROG = '\n\nOn choisit le nombre ${{n}}$. Quel nombre le programme écrit-il ?\n\n$?$'


def programme(etape1, etape2):
    return ('Voici un programme de calcul :\n\n- choisir un nombre entier ;\n- ' + etape1 + ' ;\n- '
            + etape2 + ' ;\n- écrire le nombre obtenu.' + QUESTION_PROG)


ORDRE = '**Dans l\'ordre.** La deuxième étape s\'applique au résultat de la première.'

PR_AJOUTER_MULTIPLIER = variation(
    programme('ajouter ${{a}}$ au nombre choisi', 'multiplier le résultat par ${{b}}$'),
    [var('n', '2..20'), var('a', '1..9'), var('b', '2..9')],
    ['{{eval:(n+a)*b}}'],
    [ORDRE, '${{n}} + {{a}} = ' + ev('n+a') + '$',
     '$' + ev('n+a') + ' \\times {{b}} = ' + col(ev('(n+a)*b')) + '$ : le programme écrit '
     + m(col(ev('(n+a)*b'))) + '.'])

PR_MULTIPLIER_AJOUTER = variation(
    programme('multiplier le nombre choisi par ${{a}}$', 'ajouter ${{b}}$ au résultat'),
    [var('n', '2..20'), var('a', '2..9'), var('b', '1..30')],
    ['{{eval:n*a+b}}'],
    [ORDRE, '${{n}} \\times {{a}} = ' + ev('n*a') + '$',
     '$' + ev('n*a') + ' + {{b}} = ' + col(ev('n*a+b')) + '$ : le programme écrit '
     + m(col(ev('n*a+b'))) + '.'])

PR_MULTIPLIER_RETIRER = variation(
    programme('multiplier le nombre choisi par ${{a}}$', 'retirer ${{b}}$ au résultat'),
    [var('n', '2..20'), var('a', '2..9'), var('b', '1..20')],
    ['{{eval:n*a-b}}'],
    [ORDRE, '${{n}} \\times {{a}} = ' + ev('n*a') + '$',
     '$' + ev('n*a') + ' - {{b}} = ' + col(ev('n*a-b')) + '$ : le programme écrit '
     + m(col(ev('n*a-b'))) + '.'],
    ['n*a>b', 'n>b'])

PR_SCRATCH = variation(
    'Voici un programme de calcul écrit avec Scratch.\n\n```scratch\nquand le drapeau vert pressé\n'
    'demander [Choisis un nombre.] et attendre\nmettre [nombre v] à ((réponse) + ({{a}}))\n'
    'mettre [nombre v] à ((nombre) * ({{b}}))\ndire (nombre)\n```\n\nOn tape ${{n}}$. Quel nombre '
    'le lutin dit-il ?\n\n$?$',
    [var('n', '2..20'), var('a', '1..9'), var('b', '2..9')],
    ['{{eval:(n+a)*b}}'],
    ['**Une instruction après l\'autre.** La variable « nombre » prend d\'abord la réponse plus '
     '${{a}}$, puis cette valeur multipliée par ${{b}}$.',
     '${{n}} + {{a}} = ' + ev('n+a') + '$',
     '$' + ev('n+a') + ' \\times {{b}} = ' + col(ev('(n+a)*b')) + '$ : le lutin dit '
     + m(col(ev('(n+a)*b'))) + '.'])

ecrire('04-programme-de-calcul-deux-etapes', modele(
    'Exécuter un programme de calcul (deux étapes)',
    'Appliquer à un nombre entier un programme de deux étapes, écrit en mots ou avec Scratch',
    [PR_AJOUTER_MULTIPLIER, PR_MULTIPLIER_AJOUTER, PR_MULTIPLIER_RETIRER, PR_SCRATCH],
    [spec('5 : + 2 puis × 4 = 28', 0, {'n': 5, 'a': 2, 'b': 4}, '28', 'correct'),
     spec('Erreur : 13 (5 + 2 × 4)', 0, {'n': 5, 'a': 2, 'b': 4}, '13', 'incorrect'),
     spec('7 : × 3 puis + 10 = 31', 1, {'n': 7, 'a': 3, 'b': 10}, '31', 'correct'),
     spec('Erreur : 51 (ajouté d\'abord)', 1, {'n': 7, 'a': 3, 'b': 10}, '51', 'incorrect'),
     spec('9 : × 4 puis − 5 = 31', 2, {'n': 9, 'a': 4, 'b': 5}, '31', 'correct'),
     spec('Erreur : 16 (retiré d\'abord)', 2, {'n': 9, 'a': 4, 'b': 5}, '16', 'incorrect'),
     spec('Scratch, 6 : + 3 puis × 5 = 45', 3, {'n': 6, 'a': 3, 'b': 5}, '45', 'correct'),
     spec('Erreur : 21 (6 + 3 × 5)', 3, {'n': 6, 'a': 3, 'b': 5}, '21', 'incorrect')]))

# ============================================================================
# 6t-5, 6t-6 — CM1-065 : suites de nombres
# ============================================================================

SEP = ' \\ ;\\  '


def suite(termes):
    return '$$' + SEP.join(termes) + SEP + '\\ldots$$'


# Termes (expressions) de chaque suite ; les trois derniers sont à trouver.
T_PLUS = ['u+' + str(j) + '*a' for j in range(8)]
T_FOIS = ['u*k^' + str(j) for j in range(7)]
T_PLUS_MOINS = ['u', 'u+a', 'u+a-b', 'u+2*a-b', 'u+2*a-2*b', 'u+3*a-2*b', 'u+3*a-3*b', 'u+4*a-3*b',
                'u+4*a-4*b']
T_PLUS_PLUS = ['u', 'u+a', 'u+a+b', 'u+2*a+b', 'u+2*a+2*b', 'u+3*a+2*b', 'u+3*a+3*b', 'u+4*a+3*b',
               'u+4*a+4*b']

SUITES = {
    'plus': (T_PLUS, 5, [var('u', '1..50'), var('a', '2..12')], []),
    'fois': (T_FOIS, 4, [var('u', '1..5'), var('k', '2..3')], ['u*(k-1)!=k']),
    'plus_moins': (T_PLUS_MOINS, 6, [var('u', '10..80'), var('a', '3..9'), var('b', '1..8')],
                   ['b<a']),
    'plus_plus': (T_PLUS_PLUS, 6, [var('u', '1..20'), var('a', '1..9'), var('b', '1..9')],
                  ['a!=b']),
}

REGLE_SUITE = {
    'plus': 'On ajoute ${{a}}$ à chaque fois.',
    'fois': 'On multiplie par ${{k}}$ à chaque fois.',
    'plus_moins': 'On ajoute ${{a}}$, puis on retire ${{b}}$, et ainsi de suite.',
    'plus_plus': 'On ajoute ${{a}}$, puis on ajoute ${{b}}$, et ainsi de suite.',
}


def pas(nom, j):
    """Le passage du terme j au terme j + 1, écrit en ligne : « 15 + 4 = 19 »."""
    termes = SUITES[nom][0]
    if nom == 'plus':
        op = ' + {{a}}'
    elif nom == 'fois':
        op = ' \\times {{k}}'
    elif nom == 'plus_moins':
        op = ' + {{a}}' if j % 2 == 0 else ' - {{b}}'
    else:
        op = ' + {{a}}' if j % 2 == 0 else ' + {{b}}'
    return ev(termes[j]) + op + ' = '


def suivants(nom, vi):
    termes, donnes, variables, conditions = SUITES[nom]
    enonce = ('Voici le début d\'une suite de nombres :\n\n' + suite([ev(t) for t in termes[:donnes]])
              + '\n\nTrouve la règle, puis écris les trois nombres suivants.\n\n'
              + '\n\n'.join(str(r) + 'e nombre : $?$' for r in range(donnes + 1, donnes + 4)))
    etapes = ['**La règle.** ' + REGLE_SUITE[nom] + ' On le vérifie sur les nombres donnés : $'
              + pas(nom, 0) + ev(termes[1]) + '$, $' + pas(nom, 1) + ev(termes[2]) + '$.']
    if nom == 'plus_moins':
        etapes.append('On peut aussi dire : on ajoute $' + ev('a-b') + '$ pour aller deux rangs plus '
                      'loin.')
    if nom == 'plus_plus':
        etapes.append('On peut aussi dire : on ajoute $' + ev('a+b') + '$ pour aller deux rangs plus '
                      'loin.')
    etapes.append('**Les trois suivants.** '
                  + ' ; '.join('$' + pas(nom, j) + col(ev(termes[j + 1])) + '$'
                               for j in range(donnes - 1, donnes + 2)) + '.')
    return variation(enonce, variables, [ev(t) for t in termes[donnes:donnes + 3]], etapes,
                     conditions)


ecrire('05-suite-les-trois-termes-suivants', modele(
    'Suite de nombres : les trois termes suivants',
    'Trouver la règle d\'une suite (+ a, × k, + a − b et + a + b en alternance) et écrire les trois '
    'termes suivants',
    [suivants('plus', 0), suivants('fois', 1), suivants('plus_moins', 2), suivants('plus_plus', 3)],
    [spec('3 ; 7 ; 11 ; 15 ; 19 → 23 ; 27 ; 31', 0, {'u': 3, 'a': 4}, ['23', '27', '31'], 'correct'),
     spec('Erreur : 20 ; 21 ; 22 (+ 1)', 0, {'u': 3, 'a': 4}, ['20', '21', '22'], 'incorrect'),
     spec('4 ; 12 ; 36 ; 108 → 324 ; 972 ; 2 916', 1, {'u': 4, 'k': 3}, ['324', '972', '2\\,916'],
          'correct'),
     spec('Erreur : + 72 à chaque fois', 1, {'u': 4, 'k': 3}, ['180', '252', '324'], 'incorrect'),
     spec('80 ; 85 ; 83 ; 88 ; 86 ; 91 → 89 ; 94 ; 92', 2, {'u': 80, 'a': 5, 'b': 2},
          ['89', '94', '92'], 'correct'),
     spec('Erreur : + 5 à chaque fois', 2, {'u': 80, 'a': 5, 'b': 2}, ['96', '101', '106'],
          'incorrect'),
     spec('1 ; 2 ; 6 ; 7 ; 11 ; 12 → 16 ; 17 ; 21', 3, {'u': 1, 'a': 1, 'b': 4},
          ['16', '17', '21'], 'correct'),
     spec('Erreur : 13 ; 17 ; 18 (alternance décalée)', 3, {'u': 1, 'a': 1, 'b': 4},
          ['13', '17', '18'], 'incorrect')]))

LEURRES_SUITE = {
    'plus': ['On ajoute $' + ev('a+1') + '$ à chaque fois.',
             'On ajoute $' + ev('2*a') + '$ à chaque fois.',
             'On multiplie par $2$ à chaque fois.'],
    'fois': ['On ajoute $' + ev('u*(k-1)') + '$ à chaque fois.',
             'On multiplie par $' + ev('k+1') + '$ à chaque fois.',
             'On ajoute ${{k}}$ à chaque fois.'],
    'plus_moins': ['On ajoute $' + ev('a-b') + '$ à chaque fois.',
                   'On retire ${{b}}$, puis on ajoute ${{a}}$, et ainsi de suite.',
                   'On ajoute ${{a}}$ à chaque fois.'],
    'plus_plus': ['On ajoute $' + ev('a+b') + '$ à chaque fois.',
                  'On ajoute ${{b}}$, puis on ajoute ${{a}}$, et ainsi de suite.',
                  'On ajoute ${{a}}$ à chaque fois.'],
}


def regle_suite(nom):
    termes, donnes, variables, conditions = SUITES[nom]
    enonce = ('Voici le début d\'une suite de nombres :\n\n' + suite([ev(t) for t in termes[:donnes]])
              + '\n\nQuelle règle permet de construire cette suite ?\n\n'
              + choix([REGLE_SUITE[nom]] + LEURRES_SUITE[nom]))
    etapes = ['**La règle.** ' + REGLE_SUITE[nom],
              'Elle marche pour tous les nombres donnés : '
              + ' ; '.join('$' + pas(nom, j) + ev(termes[j + 1]) + '$' for j in range(donnes - 1))
              + '.']
    return variation(enonce, variables, ['0'], etapes, conditions)


ecrire('06-suite-choisir-la-regle', modele(
    'Suite de nombres : choisir la règle',
    'Reconnaître la règle d\'une suite (+ a, × k, + a − b et + a + b en alternance) parmi quatre '
    'phrases',
    [regle_suite('plus'), regle_suite('fois'), regle_suite('plus_moins'), regle_suite('plus_plus')],
    [spec('+ 4 : la bonne règle', 0, {'u': 3, 'a': 4}, '0', 'correct'),
     spec('Erreur : + 8', 0, {'u': 3, 'a': 4}, '2', 'incorrect'),
     spec('× 3 : la bonne règle', 1, {'u': 4, 'k': 3}, '0', 'correct'),
     spec('Erreur : + 8 (vrai au premier pas seulement)', 1, {'u': 4, 'k': 3}, '1', 'incorrect'),
     spec('+ 5 − 2 : la bonne règle', 2, {'u': 80, 'a': 5, 'b': 2}, '0', 'correct'),
     spec('Erreur : + 3 à chaque fois', 2, {'u': 80, 'a': 5, 'b': 2}, '1', 'incorrect'),
     spec('+ 1 + 4 : la bonne règle', 3, {'u': 1, 'a': 1, 'b': 4}, '0', 'correct'),
     spec('Erreur : + 4 puis + 1', 3, {'u': 1, 'a': 1, 'b': 4}, '2', 'incorrect')],
    delay=60))

# ============================================================================
# 6t-7, 6t-8 — CM1-066 : motifs évolutifs
# ============================================================================

MOTIFS = {
    # nom : (figure, objets, variables, valeurs des étapes 1 à 6 (expressions), règle, corrigé)
    'colonnes': (motif_colonnes(), 'jetons', [var('k', '2..4')],
                 [str(s) + '*k' for s in range(1, 7)],
                 'À chaque étape, on ajoute ${{k}}$ jetons.',
                 'on ajoute une colonne de ${{k}}$ jetons'),
    'escalier': (motif_escalier(), 'jetons', [],
                 ['1', '3', '6', '10', '15', '21'],
                 'À chaque étape, on ajoute autant de jetons que le numéro de la nouvelle étape.',
                 'la nouvelle colonne a autant de jetons que le numéro de l\'étape'),
    'carres': (motif_carres(), 'allumettes', [],
               ['4', '7', '10', '13', '16', '19'],
               'À chaque étape, on ajoute $3$ allumettes.',
               'un carré de plus ne demande que $3$ allumettes : il prend un côté au carré d\'avant'),
    'triangles': (motif_triangles(), 'allumettes', [],
                  ['3', '5', '7', '9', '11', '13'],
                  'À chaque étape, on ajoute $2$ allumettes.',
                  'un triangle de plus ne demande que $2$ allumettes : il prend un côté au triangle '
                  'd\'avant'),
}


def de(mot):
    """« de » élidé devant une voyelle ou un h : « d'allumettes », « de jetons »."""
    return ("d'" if mot[:1].lower() in 'aeiouyhéèêàâîôû' else 'de ') + mot


def ajout(nom, s):
    """Ce qu'on ajoute pour passer à l'étape s (de 2 à 6)."""
    return {'colonnes': '{{k}}', 'escalier': str(s), 'carres': '3', 'triangles': '2'}[nom]


def motif_suivantes(nom):
    figure, objets, variables, valeurs, regle, pourquoi = MOTIFS[nom]
    enonce = ('Voici les trois premières étapes d\'un motif ' + de(objets) + '.\n\n' + figure
              + '\n\nCombien ' + de(objets) + ' y aura-t-il aux trois étapes suivantes ?\n\n'
              + '\n\n'.join('Étape ' + str(s) + ' : $?$ ' + objets for s in (4, 5, 6)))
    etapes = ['**On compte.** Étape 1 : $' + ev(valeurs[0]) + '$ ; étape 2 : $' + ev(valeurs[1])
              + '$ ; étape 3 : $' + ev(valeurs[2]) + '$.',
              '**La règle.** ' + regle + ' Pourquoi : ' + pourquoi + '.',
              '**Les trois suivantes.** '
              + ' ; '.join('étape ' + str(s) + ' : $' + ev(valeurs[s - 2]) + ' + ' + ajout(nom, s)
                           + ' = ' + col(ev(valeurs[s - 1])) + '$' for s in (4, 5, 6)) + '.']
    return variation(enonce, variables, [ev(v) for v in valeurs[3:6]], etapes)


ecrire('07-motif-les-trois-etapes-suivantes', modele(
    'Motif évolutif : les trois étapes suivantes',
    'Motif dessiné en trois étapes (colonnes de jetons, escalier, carrés ou triangles d\'allumettes) : '
    'le nombre d\'éléments aux étapes 4, 5 et 6',
    [motif_suivantes('colonnes'), motif_suivantes('escalier'), motif_suivantes('carres'),
     motif_suivantes('triangles')],
    [spec('Colonnes de 3 : 12 ; 15 ; 18', 0, {'k': 3}, ['12', '15', '18'], 'correct'),
     spec('Erreur : 10 ; 11 ; 12 (+ 1)', 0, {'k': 3}, ['10', '11', '12'], 'incorrect'),
     spec('Escalier : 10 ; 15 ; 21', 1, {}, ['10', '15', '21'], 'correct'),
     spec('Erreur : 9 ; 12 ; 15 (+ 3)', 1, {}, ['9', '12', '15'], 'incorrect'),
     spec('Carrés : 13 ; 16 ; 19', 2, {}, ['13', '16', '19'], 'correct'),
     spec('Erreur : 14 ; 18 ; 22 (4 par carré)', 2, {}, ['14', '18', '22'], 'incorrect'),
     spec('Triangles : 9 ; 11 ; 13', 3, {}, ['9', '11', '13'], 'correct'),
     spec('Erreur : 10 ; 13 ; 16 (3 par triangle)', 3, {}, ['10', '13', '16'], 'incorrect')],
    delay=120))

LEURRES_MOTIF = {
    'colonnes': ['À chaque étape, on ajoute $' + ev('k+1') + '$ jetons.',
                 'À chaque étape, on double le nombre de jetons.',
                 'À chaque étape, on ajoute autant de jetons que le numéro de la nouvelle étape.'],
    'escalier': ['À chaque étape, on ajoute $2$ jetons.',
                 'À chaque étape, on double le nombre de jetons.',
                 'À chaque étape, on ajoute $3$ jetons.'],
    'carres': ['À chaque étape, on ajoute $4$ allumettes.',
               'À chaque étape, on double le nombre d\'allumettes.',
               'À chaque étape, on ajoute autant d\'allumettes que le numéro de la nouvelle étape.'],
    'triangles': ['À chaque étape, on ajoute $3$ allumettes.',
                  'À chaque étape, on double le nombre d\'allumettes.',
                  'À chaque étape, on ajoute $1$ allumette.'],
}


def motif_regle(nom):
    figure, objets, variables, valeurs, regle, pourquoi = MOTIFS[nom]
    enonce = ('Voici les trois premières étapes d\'un motif ' + de(objets) + '.\n\n' + figure
              + '\n\nQuelle phrase dit comment on passe d\'une étape à la suivante ?\n\n'
              + choix([regle] + LEURRES_MOTIF[nom]))
    etapes = ['**On compte.** Étape 1 : $' + ev(valeurs[0]) + '$ ; étape 2 : $' + ev(valeurs[1])
              + '$ ; étape 3 : $' + ev(valeurs[2]) + '$.',
              '**La règle.** ' + regle + ' Pourquoi : ' + pourquoi + '. Elle marche pour chaque '
              'passage : $' + ev(valeurs[0]) + ' + ' + ajout(nom, 2) + ' = ' + ev(valeurs[1])
              + '$ et $' + ev(valeurs[1]) + ' + ' + ajout(nom, 3) + ' = ' + ev(valeurs[2]) + '$.']
    return variation(enonce, variables, ['0'], etapes)


ecrire('08-motif-choisir-la-regle', modele(
    'Motif évolutif : choisir la règle',
    'Motif dessiné en trois étapes : reconnaître, parmi quatre phrases, comment on passe d\'une '
    'étape à la suivante',
    [motif_regle('colonnes'), motif_regle('escalier'), motif_regle('carres'),
     motif_regle('triangles')],
    [spec('Colonnes de 3 : on ajoute 3', 0, {'k': 3}, '0', 'correct'),
     spec('Erreur : on double', 0, {'k': 3}, '2', 'incorrect'),
     spec('Escalier : le numéro de l\'étape', 1, {}, '0', 'correct'),
     spec('Erreur : on ajoute 2 (vrai au premier passage seulement)', 1, {}, '1', 'incorrect'),
     spec('Carrés : on ajoute 3', 2, {}, '0', 'correct'),
     spec('Erreur : on ajoute 4', 2, {}, '1', 'incorrect'),
     spec('Triangles : on ajoute 2', 3, {}, '0', 'correct'),
     spec('Erreur : on ajoute 3', 3, {}, '1', 'incorrect')],
    delay=60))

for nom, mod in MODELES.items():
    with open(f'{DOSSIER}/{nom}.json', 'w') as fh:
        json.dump(mod, fh, ensure_ascii=False, indent='\t')
        fh.write('\n')
print(len(MODELES), 'modèles écrits')
