"""Écrit les 7 modèles du lot 9 « Tableaux et programmes » de la 6e dans
scripts/questions/6-tableaux-programmes/.

Phase 0 validée par David le 2026-11-02 (§ 22 du journal `docs/wip/questions-6-progress.md`).
Bornes : `cycle3.json`, 6e (6-192 : tableau avec nom et unité de chaque grandeur, pas de produit en
croix ; les autres héritent de « general »). Un point par modèle ; le nœud et le tag sont posés par
la migration de rangement, après le `--publier` de David.

Décisions et pièges :
- motifs (6-143) : sans lettre (lettres au cycle 4) ; jetons dessinés sur une grille maximale,
  chaque jeton visible ou non selon le tirage (`visible={{if:…}}`) ;
- comptes d'un relevé : indicatrices de Lagrange (`(s-2)(s-3)…/…`), comme `ce1-7/04` ;
- case choix à plusieurs réponses calculée : un indice toujours juste (la première ligne vérifie le
  critère, par condition) remplace les indices faux (`0;{{if:…|2|0}}`), comme le prévoit le juge ;
- bonne réponse d'un choix unique calculée : toujours par une variable (piège du § 9) ;
- 192 v3 : les trois tableaux A, B, C tournent (variable `k`), le bon n'est pas toujours A ;
- 196 v2 : répétitions accordées à l'angle (4 × 90°, 3 × 120°, 6 × 60°) ;
- niveaux : catégories neuves → 1 ; Statistiques / Représenter des données / Tableaux (1, 2 :
  CP, CE1) → 3.

    python3 docs/wip/questions/lot-9-tableaux-programmes.py scripts/questions
"""
import json
import os
import subprocess
import sys

RACINE = sys.argv[1]
DOSSIER = os.path.join(RACINE, '6-tableaux-programmes')


def spec(desc, vi, variables, answers, status):
    return {'description': desc, 'variationIndex': vi,
            'variables': {k: str(v) for k, v in variables.items()},
            'answers': answers if isinstance(answers, list) else [answers],
            'expected': {'status': status}}


def modele(nom, title, description, theme, domain, subdomain, level, variations, specs,
           delay=60):
    m = {'title': title, 'description': description, 'grades': ['6'], 'theme': theme,
         'domain': domain, 'subdomain': subdomain, 'level': level, 'delay': delay,
         'status': 'draft', 'variations': variations, 'testSpecs': specs}
    return nom, m


def var(nom, expression):
    return {'name': nom, 'expression': expression}


def variation(statement, variables, answers, steps, conditions=None):
    v = {'statement': statement, 'variables': variables}
    if conditions:
        v['conditions'] = conditions
    v['blanks'] = [{'expectedAnswer': a} for a in answers]
    v['correction'] = {'steps': steps}
    return v


def col(x, k=0):
    return '\\textcolor{{{color:primary.' + str(k) + '}}}{' + x + '}'


def choix(lignes, plusieurs=False, melanger=True):
    tete = ''
    if plusieurs:
        tete += 'plusieurs: oui\n'
    if not melanger:
        tete += 'melanger: non\n'
    return '\n\n```choix\n' + tete + ''.join('- ' + l + '\n' for l in lignes) + '```'


def scratch(lignes):
    return '\n\n```scratch\n' + '\n'.join(lignes) + '\n```'


def indicatrice(s, i, valeurs):
    """Expression qui vaut 1 si s == i, 0 pour les autres valeurs (Lagrange)."""
    num = '*'.join('(' + s + '-' + str(j) + ')' for j in valeurs if j != i)
    den = 1
    for j in valeurs:
        if j != i:
            den *= (i - j)
    return num + '/(' + str(den) + ')'


def compte(prefixe, n, i, valeurs):
    return 'eval:' + '+'.join(indicatrice(prefixe + str(k), i, valeurs) for k in range(1, n + 1))


def si(cond, oui, non):
    return '{{if:' + cond + '|' + oui + '|' + non + '}}'


MODELES = []

# --- 1. 6-143 : motif évolutif -----------------------------------------------------------------
# Allumettes : carrés en rangée (3n + 1), triangles en rangée (2n + 1). Jetons : rectangle de r
# lignes et n + c colonnes (r jetons de plus à chaque étape).

ALLUMETTE = 'couleur="marron", epaisseur=3'


def carres_allumettes():
    lignes, n_pt = [], 0
    x0 = 0
    for etape in (1, 2, 3):
        pts = {}
        for i in range(etape + 1):
            for j in (0, 1):
                n_pt += 1
                nom = 'Q' + str(n_pt)
                pts[(i, j)] = nom
                lignes.append(nom + ' = point(' + str(x0 + i) + ', ' + str(j) + ', visible=faux)')
        for i in range(etape):
            lignes.append('segment(' + pts[(i, 0)] + ', ' + pts[(i + 1, 0)] + ', ' + ALLUMETTE + ')')
            lignes.append('segment(' + pts[(i, 1)] + ', ' + pts[(i + 1, 1)] + ', ' + ALLUMETTE + ')')
        for i in range(etape + 1):
            lignes.append('segment(' + pts[(i, 0)] + ', ' + pts[(i, 1)] + ', ' + ALLUMETTE + ')')
        lignes.append('texte(' + str(x0 + etape / 2) + ', -0.9, "Étape ' + str(etape) + '")')
        x0 += etape + 1.5
    return ('```figure\nfenetre: -0.5 ; 9.5 ; -1.5 ; 1.5\ntaille: grande\ndescription: Trois'
            ' étapes d\'un motif d\'allumettes : une rangée de 1, 2 puis 3 carrés accolés, qui'
            ' comptent 4, 7 puis 10 allumettes.\n---\n' + '\n'.join(lignes) + '\n```')


def triangles_allumettes():
    # Triangles alternés pointe en haut, pointe en bas : étape n = n triangles, 2n + 1 allumettes
    lignes, n_pt = [], 0
    x0 = 0
    h = 0.87
    for etape in (1, 2, 3):
        # Sommets en zigzag : bas0, haut0, bas1, haut1… (n + 2 sommets, n + 1 côtés obliques)
        bas, haut = [], []
        nb_bas = (etape + 1) // 2 + 1
        nb_haut = etape // 2 + 1
        for i in range(nb_bas):
            n_pt += 1
            bas.append('T' + str(n_pt))
            lignes.append(bas[-1] + ' = point(' + str(x0 + i) + ', 0, visible=faux)')
        for i in range(nb_haut):
            n_pt += 1
            haut.append('T' + str(n_pt))
            lignes.append(haut[-1] + ' = point(' + str(x0 + i + 0.5) + ', ' + str(h)
                          + ', visible=faux)')
        for i in range(nb_bas - 1):
            lignes.append('segment(' + bas[i] + ', ' + bas[i + 1] + ', ' + ALLUMETTE + ')')
        for i in range(nb_haut - 1):
            lignes.append('segment(' + haut[i] + ', ' + haut[i + 1] + ', ' + ALLUMETTE + ')')
        zigzag = [bas[i // 2] if i % 2 == 0 else haut[i // 2] for i in range(etape + 2)]
        for u, w in zip(zigzag, zigzag[1:]):
            lignes.append('segment(' + u + ', ' + w + ', ' + ALLUMETTE + ')')
        largeur = max(nb_bas - 1, nb_haut - 0.5)
        lignes.append('texte(' + str(round(x0 + largeur / 2, 2)) + ', -0.9, "Étape '
                      + str(etape) + '")')
        x0 += largeur + 1.5
    return ('```figure\nfenetre: -0.5 ; 8 ; -1.5 ; 1.5\ntaille: grande\ndescription: Trois'
            ' étapes d\'un motif d\'allumettes : une rangée de 1, 2 puis 3 triangles accolés, qui'
            ' comptent 3, 5 puis 7 allumettes.\n---\n' + '\n'.join(lignes) + '\n```')


def jetons():
    # Grille maximale : étape i a au plus i + 2 colonnes et 4 lignes ; jeton visible si sa
    # colonne j < i + c et sa ligne l < r. Décalage horizontal de l'étape i : somme des largeurs
    # des étapes précédentes (i' + c colonnes) + 1,5 d'écart.
    lignes = []
    for etape in (1, 2, 3):
        x0 = '+'.join(['0'] + ['(' + str(p) + '+c+1.5)' for p in range(1, etape)])
        for j in range(etape + 2):
            for l in range(4):
                nom = 'J' + str(etape) + str(j) + str(l)
                lignes.append(nom + ' = point({{eval:' + x0 + '+' + str(j) + ';d}}, ' + str(l)
                              + ', visible=faux)')
                lignes.append('cercle(' + nom + ', rayon=0.3, couleur="bleu", remplissage="bleu",'
                              ' opacite_fond=1, visible='
                              + si(str(j) + '<' + str(etape) + '+c && ' + str(l) + '<r', 'vrai',
                                   'faux') + ')')
        lignes.append('texte({{eval:' + x0 + '+(' + str(etape) + '+c-1)/2;d}}, -1, "Étape '
                      + str(etape) + '")')
    return ('```figure\nfenetre: -0.7 ; {{eval:6+3*c+3+0.7;d}} ; -1.6 ; {{eval:max(r-0.3,(10.4+3*c)/4-1.5);d}}\ntaille: grande\n'
            'description: Trois étapes d\'un motif de jetons : des rectangles de {{r}} lignes et'
            ' {{eval:1+c}}, {{eval:2+c}} puis {{eval:3+c}} colonnes.\n---\n' + '\n'.join(lignes)
            + '\n```')


JETONS_VARS = [var('r', '2..4'), var('c', '0..2')]

MODELES.append(modele(
    '01-motif-evolutif', 'Motif évolutif : trouver la régularité',
    'Motif dessiné en trois étapes (carrés ou triangles d\'allumettes, rectangle de jetons) :'
    ' compter l\'étape suivante, ce qu\'on ajoute à chaque étape, une étape lointaine, l\'étape qui'
    ' compte un nombre donné',
    'Calcul littéral', 'Pensée algébrique', 'Motifs évolutifs', 1,
    [variation('Voici les trois premières étapes d\'un motif d\'allumettes.\n\n' + carres_allumettes()
               + '\n\nCombien d\'allumettes faut-il pour l\'étape ${{s}}$ ?\n\n$?$',
               [var('s', '4..5')], ['{{eval:3*s+1}}'],
               ['**La régularité.** $4$, puis $7$, puis $10$ : on ajoute $3$ allumettes à chaque'
                ' étape (un carré de plus, qui partage un côté avec le précédent).',
                si('s==4', '$10 + 3 = ' + col('13') + '$.',
                   '$10 + 3 = 13$ pour l\'étape $4$, puis $13 + 3 = ' + col('16') + '$.')]),
     variation('Voici les trois premières étapes d\'un motif de jetons.\n\n' + jetons()
               + '\n\nCombien de jetons ajoute-t-on d\'une étape à la suivante ?\n\n$?$',
               JETONS_VARS, ['{{r}}'],
               ['**On compte chaque étape.** Étape $1$ : ${{eval:r*(1+c)}}$ ; étape $2$ :'
                ' ${{eval:r*(2+c)}}$ ; étape $3$ : ${{eval:r*(3+c)}}$.',
                '**La régularité.** À chaque étape, on ajoute une colonne de ${{r}}$ jetons : $'
                + col('{{r}}') + '$ jetons de plus.']),
     variation('Voici les trois premières étapes d\'un motif d\'allumettes.\n\n'
               + triangles_allumettes() + '\n\nCombien d\'allumettes faut-il pour l\'étape'
               ' ${{s}}$ ?\n\n$?$',
               [var('s', '8..20')], ['{{eval:2*s+1}}'],
               ['**La régularité.** $3$, puis $5$, puis $7$ : on ajoute $2$ allumettes à chaque'
                ' étape (un triangle de plus, qui partage un côté avec le précédent).',
                '**Jusqu\'à l\'étape ${{s}}$.** On part des $3$ allumettes de l\'étape $1$ et on'
                ' ajoute $2$ allumettes ${{eval:s-1}}$ fois : $3 + 2 \\times {{eval:s-1}} = '
                + col('{{eval:2*s+1}}') + '$.']),
     variation('Voici les trois premières étapes d\'un motif de jetons.\n\n' + jetons()
               + '\n\nÀ quelle étape le motif compte-t-il ${{eval:r*(s+c)}}$ jetons ?\n\n'
               'Étape $?$',
               JETONS_VARS + [var('s', '6..12')], ['{{s}}'],
               ['**La régularité.** Chaque étape a ${{r}}$ lignes ; l\'étape $1$ a ${{eval:1+c}}$'
                ' colonne' + si('c==0', '', 's') + ', et on ajoute une colonne à chaque étape.',
                '${{eval:r*(s+c)}} \\div {{r}} = {{eval:s+c}}$ colonnes, soit l\'étape $'
                + col('{{s}}') + '$.'])],
    [spec('Étape 4 : 13', 0, {'s': 4}, '13', 'correct'),
     spec('Erreur : 16 (4 × 4, carrés séparés)', 0, {'s': 4}, '16', 'incorrect'),
     spec('Étape 5 : 16', 0, {'s': 5}, '16', 'correct'),
     spec('Erreur : 13 (une étape de moins)', 0, {'s': 5}, '13', 'incorrect'),
     spec('3 jetons de plus', 1, {'r': 3, 'c': 1}, '3', 'correct'),
     spec('Erreur : 6 (nombre de jetons de l\'étape 1)', 1, {'r': 3, 'c': 1}, '6', 'incorrect'),
     spec('Étape 10 : 21', 2, {'s': 10}, '21', 'correct'),
     spec('Erreur : 30 (3 × 10, triangles séparés)', 2, {'s': 10}, '30', 'incorrect'),
     spec('Erreur : 20 (2 × 10)', 2, {'s': 10}, '20', 'incorrect'),
     spec('24 jetons = étape 7', 3, {'r': 3, 'c': 1, 's': 7}, '7', 'correct'),
     spec('Erreur : 8 (colonnes)', 3, {'r': 3, 'c': 1, 's': 7}, '8', 'incorrect')]))

# --- 2. 6-184 : construire un tableau simple ---------------------------------------------------

ELEVES = ['Léa', 'Tom', 'Inès', 'Noah', 'Jade', 'Adam', 'Lina', 'Hugo', 'Zoé', 'Rayan', 'Emma',
          'Sacha', 'Nina', 'Malo', 'Chloé', 'Yanis', 'Lou', 'Enzo']
SPORTS = ['football', 'natation', 'danse', 'basket']
N_ELEVES = 18


def nom_sport(k):
    return si('s' + str(k) + '==1', SPORTS[0],
              si('s' + str(k) + '==2', SPORTS[1], si('s' + str(k) + '==3', SPORTS[2], SPORTS[3])))


RELEVE = ' · '.join(ELEVES[k - 1] + ' : ' + nom_sport(k) for k in range(1, N_ELEVES + 1))
SPORT_VARS = ([var('s' + str(k), '1..4') for k in range(1, N_ELEVES + 1)]
              + [var('n' + str(i), compte('s', N_ELEVES, i, [1, 2, 3, 4])) for i in (1, 2, 3, 4)])
SPORT_COND = ['n1 >= 2', 'n2 >= 2', 'n3 >= 2', 'n4 >= 2']
TABLEAU_SPORTS = ('| Sport | Nombre d\'élèves |\n|---|---|\n'
                  + ''.join('| ' + s.capitalize() + ' | $?$ |\n' for s in SPORTS))
COMPTE_SPORTS = ('On compte chaque sport : football ${{n1}}$ ; natation ${{n2}}$ ; danse ${{n3}}$ ;'
                 ' basket ${{n4}}$.')
EX_SPORTS = {'s' + str(k): (k % 4) + 1 for k in range(1, N_ELEVES + 1)}
# 18 élèves en 1, 2, 3, 4, 1, 2… : 2, 3, 4, 1, 2, 3… → sports 2,3,4,1 : n1 = 4, n2 = 5, n3 = 5, n4 = 4
EX_SPORTS.update({'n1': 4, 'n2': 5, 'n3': 5, 'n4': 4})

JOURS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi']
ORDRE_PHRASES = [3, 0, 4, 1, 2]


def phrase_pluie(i):
    j = JOURS[i]
    return si('p' + str(i + 1) + '==0', j.capitalize() + ', il n\'a pas plu.',
              j.capitalize() + ', il est tombé ${{p' + str(i + 1) + '}}~\\unit{mm}$ de pluie.')


MODELES.append(modele(
    '02-construire-un-tableau-simple', 'Construire un tableau pour présenter des données',
    'Ranger un relevé brut dans un tableau : effectifs de quatre catégories, avec la ligne Total,'
    ' observations datées (pluie de la semaine)',
    'Statistiques', 'Représenter des données', 'Tableaux', 3,
    [variation('On a demandé à ${{eval:' + str(N_ELEVES) + '}}$ élèves leur sport préféré.\n\n'
               + RELEVE + '\n\nCompte et complète le tableau.\n\n' + TABLEAU_SPORTS,
               SPORT_VARS, ['{{n1}}', '{{n2}}', '{{n3}}', '{{n4}}'],
               [COMPTE_SPORTS, 'On vérifie : ${{n1}} + {{n2}} + {{n3}} + {{n4}} = '
                + col(str(N_ELEVES)) + '$, autant que d\'élèves.'], SPORT_COND),
     variation('Voici le sport préféré des élèves d\'une classe.\n\n' + RELEVE
               + '\n\nCompte et complète le tableau.\n\n' + TABLEAU_SPORTS + '| Total | $?$ |\n',
               SPORT_VARS, ['{{n1}}', '{{n2}}', '{{n3}}', '{{n4}}', str(N_ELEVES)],
               [COMPTE_SPORTS, '**Total.** ${{n1}} + {{n2}} + {{n3}} + {{n4}} = '
                + col(str(N_ELEVES)) + '$ : c\'est le nombre d\'élèves de la classe.'],
               SPORT_COND),
     variation('Léo a relevé la pluie tombée chaque jour de la semaine.\n\n'
               + ' '.join(phrase_pluie(i) for i in ORDRE_PHRASES)
               + '\n\nComplète le tableau.\n\n| Jour | Pluie (mm) |\n|---|---|\n'
               + ''.join('| ' + j.capitalize() + ' | $?$ |\n' for j in JOURS),
               [var('p' + str(i), '0..25') for i in range(1, 6)],
               ['{{p1}}', '{{p2}}', '{{p3}}', '{{p4}}', '{{p5}}'],
               ['**Dans l\'ordre des jours.** Les phrases ne sont pas dans l\'ordre de la semaine :'
                ' on cherche chaque jour dans le texte.',
                'Lundi $' + col('{{p1}}') + '$ ; mardi $' + col('{{p2}}') + '$ ; mercredi $'
                + col('{{p3}}') + '$ ; jeudi $' + col('{{p4}}') + '$ ; vendredi $'
                + col('{{p5}}') + '$ (« il n\'a pas plu » : $0$).'],
               ['p1+p2+p3+p4+p5 >= 15', '(p1-p4)*(p1-p4) > 0'])],
    [spec('Comptes justes', 0, EX_SPORTS, ['4', '5', '5', '4'], 'correct'),
     spec('Erreur : un élève oublié', 0, EX_SPORTS, ['4', '5', '4', '4'], 'incorrect'),
     spec('Avec Total', 1, EX_SPORTS, ['4', '5', '5', '4', '18'], 'correct'),
     spec('Erreur : Total = 4 (nombre de sports)', 1, EX_SPORTS, ['4', '5', '5', '4', '4'],
          'incorrect'),
     spec('Pluie dans l\'ordre des jours', 2, {'p1': 12, 'p2': 0, 'p3': 5, 'p4': 8, 'p5': 3},
          ['12', '0', '5', '8', '3'], 'correct'),
     spec('Erreur : valeurs dans l\'ordre des phrases', 2,
          {'p1': 12, 'p2': 0, 'p3': 5, 'p4': 8, 'p5': 3}, ['8', '12', '3', '0', '5'],
          'incorrect')],
    delay=120))

# --- 3. 6-185 : filtrer un tableau -------------------------------------------------------------

VILLES = ['Brest', 'Lyon', 'Marseille', 'Lille', 'Toulouse']
VILLES_VARS = ([var('t' + str(i), '14..28') for i in range(1, 6)]
               + [var('p' + str(i), '10..95') for i in range(1, 6)])
TABLEAU_VILLES = ('| Ville | Température moyenne (°C) | Pluie du mois (mm) |\n|---|---|---|\n'
                  + ''.join('| ' + v + ' | ${{t' + str(i + 1) + '}}$ | ${{p' + str(i + 1) + '}}$ |\n'
                            for i, v in enumerate(VILLES)))
INTRO_VILLES = 'Ce tableau donne des relevés du mois de juillet dans cinq villes.\n\n'

FORFAITS = ['A', 'B', 'C', 'D', 'E']
FORFAIT_VARS = ([var('x' + str(i), '5..35') for i in range(1, 6)]
                + [var('g' + str(i), '1..15') for i in range(1, 6)]
                + [var('b', '15|20|25'), var('h', '50|60|80')]
                + [var('c' + str(i), si('x' + str(i) + '<b && 10*g' + str(i) + '>=h', '1', '0'))
                   for i in range(1, 6)]
                + [var('j', si('c1==1', '0', si('c2==1', '1', si('c3==1', '2',
                                                                  si('c4==1', '3', '4')))))])
FORFAIT_COND = ['c1+c2+c3+c4+c5 == 1',
                # un leurre bon marché trop petit, un leurre assez grand trop cher
                '(x1<b && 10*g1<h) || (x2<b && 10*g2<h) || (x3<b && 10*g3<h) || (x4<b && 10*g4<h)'
                ' || (x5<b && 10*g5<h)',
                '(x1>=b && 10*g1>=h) || (x2>=b && 10*g2>=h) || (x3>=b && 10*g3>=h)'
                ' || (x4>=b && 10*g4>=h) || (x5>=b && 10*g5>=h)']
TABLEAU_FORFAITS = ('| Forfait | Prix par mois (€) | Données (Go) |\n|---|---|---|\n'
                    + ''.join('| ' + f + ' | ${{x' + str(i + 1) + '}}$ | ${{eval:10*g' + str(i + 1)
                              + '}}$ |\n' for i, f in enumerate(FORFAITS)))
EX_FORFAITS = {'x1': 12, 'x2': 18, 'x3': 30, 'x4': 9, 'x5': 22, 'g1': 3, 'g2': 6, 'g3': 10,
               'g4': 2, 'g5': 8, 'b': 20, 'h': 50, 'c1': 0, 'c2': 1, 'c3': 0, 'c4': 0, 'c5': 0,
               'j': 1}

MODELES.append(modele(
    '03-filtrer-les-donnees-d-un-tableau', 'Filtrer les données d\'un tableau',
    'Choisir les lignes d\'un tableau qui vérifient un critère (pluie, température), les compter,'
    ' puis choisir un forfait avec deux critères à la fois',
    'Statistiques', 'Exploiter des données', 'Filtrer un tableau', 1,
    [variation(INTRO_VILLES + TABLEAU_VILLES + '\nDans quelles villes est-il tombé plus de'
               ' ${{q}}~\\unit{mm}$ de pluie ?'
               + choix(VILLES, plusieurs=True, melanger=False),
               VILLES_VARS + [var('q', '30|40|50|60')],
               ['0;' + ';'.join(si('p' + str(i + 1) + '>q', str(i), '0') for i in range(1, 5))],
               ['**Le critère.** On lit la colonne « Pluie du mois » et on garde les villes où le'
                ' nombre dépasse ${{q}}$.',
                ' ; '.join(v + ' ${{p' + str(i + 1) + '}}$' + si('p' + str(i + 1) + '>q',
                                                                    ' (oui)', ' (non)')
                           for i, v in enumerate(VILLES)) + '.'],
               ['p1 > q'] + ['p' + str(i) + ' != q' for i in range(2, 6)]
               + ['p2<q || p3<q || p4<q || p5<q']),
     variation(INTRO_VILLES + TABLEAU_VILLES + '\nDans combien de villes la température moyenne'
               ' est-elle d\'au moins ${{u}}~\\unit{°C}$ ?\n\n$?$',
               VILLES_VARS + [var('u', '18..24')]
               + [var('a' + str(i), si('t' + str(i) + '>=u', '1', '0')) for i in range(1, 6)],
               ['{{eval:a1+a2+a3+a4+a5}}'],
               ['**Le critère.** « Au moins ${{u}}$ » : ${{u}}$ compte, comme tout nombre plus'
                ' grand.',
                ' ; '.join(v + ' ${{t' + str(i + 1) + '}}$' + si('a' + str(i + 1) + '==1',
                                                                    ' (oui)', ' (non)')
                           for i, v in enumerate(VILLES)) + ' : $'
                + col('{{eval:a1+a2+a3+a4+a5}}') + '$ villes.'],
               ['a1+a2+a3+a4+a5 >= 1', 'a1+a2+a3+a4+a5 <= 4',
                't1==u || t2==u || t3==u || t4==u || t5==u']),
     variation('Ce tableau présente cinq forfaits de téléphone.\n\n' + TABLEAU_FORFAITS
               + '\nSami veut payer moins de ${{b}}~\\unit{€}$ par mois **et** avoir au moins'
               ' ${{h}}~\\unit{Go}$ de données. Quel forfait peut-il choisir ?'
               + choix(['le forfait ' + f for f in FORFAITS], melanger=False),
               FORFAIT_VARS, ['{{j}}'],
               ['**Les deux critères à la fois.** Un forfait convient s\'il coûte moins de'
                ' ${{b}}~\\unit{€}$ **et** s\'il donne au moins ${{h}}~\\unit{Go}$.',
                ' ; '.join(f + ' : ' + si('x' + str(i + 1) + '<b', 'prix oui', 'prix non') + ', '
                           + si('10*g' + str(i + 1) + '>=h', 'données oui', 'données non')
                           for i, f in enumerate(FORFAITS))
                + '. Seul le forfait ' + si('j==0', 'A', si('j==1', 'B', si('j==2', 'C',
                                                                           si('j==3', 'D', 'E'))))
                + ' vérifie les deux.'],
               FORFAIT_COND)],
    [spec('Pluie > 40 : Brest, Lille', 0,
          {'t1': 18, 't2': 22, 't3': 26, 't4': 19, 't5': 25, 'p1': 75, 'p2': 35, 'p3': 12,
           'p4': 60, 'p5': 40, 'q': 40}, '0;3', 'correct'),
     spec('Erreur : Toulouse (40 n\'est pas plus de 40)', 0,
          {'t1': 18, 't2': 22, 't3': 26, 't4': 19, 't5': 25, 'p1': 75, 'p2': 35, 'p3': 12,
           'p4': 60, 'p5': 40, 'q': 40}, '0;3;4', 'incorrect'),
     spec('Oubli de Lille : partiel', 0,
          {'t1': 18, 't2': 22, 't3': 26, 't4': 19, 't5': 25, 'p1': 75, 'p2': 35, 'p3': 12,
           'p4': 60, 'p5': 40, 'q': 40}, '0', 'unoptimal_form'),
     spec('Au moins 22 °C : 3 villes', 1,
          {'t1': 18, 't2': 22, 't3': 26, 't4': 19, 't5': 25, 'p1': 75, 'p2': 35, 'p3': 12,
           'p4': 60, 'p5': 40, 'u': 22, 'a1': 0, 'a2': 1, 'a3': 1, 'a4': 0, 'a5': 1}, '3',
          'correct'),
     spec('Erreur : 2 (22 exclu)', 1,
          {'t1': 18, 't2': 22, 't3': 26, 't4': 19, 't5': 25, 'p1': 75, 'p2': 35, 'p3': 12,
           'p4': 60, 'p5': 40, 'u': 22, 'a1': 0, 'a2': 1, 'a3': 1, 'a4': 0, 'a5': 1}, '2',
          'incorrect'),
     spec('Forfait B', 2, EX_FORFAITS, '1', 'correct'),
     spec('Erreur : D (le moins cher)', 2, EX_FORFAITS, '3', 'incorrect'),
     spec('Erreur : C (le plus de données)', 2, EX_FORFAITS, '2', 'incorrect')],
    delay=90))

# --- 4. 6-192 : représenter la proportionnalité par un tableau ---------------------------------

OBJETS = 'cahiers'

V3_TYPES = {
    # 0 : le bon tableau ; 1 : valeurs non proportionnelles ; 2 : proportionnel, autre prix
    'q': ['1', '2', '3'],
    0: ['{{p}}', '{{eval:2*p}}', '{{eval:3*p}}'],
    1: ['{{p}}', '{{eval:2*p}}', '{{eval:4*p}}'],
    2: ['{{eval:p+1}}', '{{eval:2*p+2}}', '{{eval:3*p+3}}'],
}


def tableau_v3(position):
    # Le tableau affiché en `position` (0 = A) est du type mod(position + k, 3)
    t = 'mod(' + str(position) + '+k,3)'
    cases = [si(t + '==0', V3_TYPES[0][i], si(t + '==1', V3_TYPES[1][i], V3_TYPES[2][i]))
             for i in range(3)]
    return ('**Tableau ' + 'ABC'[position] + '**\n\n| Masse de pommes (kg) | $1$ | $2$ | $3$ |\n'
            '|---|---|---|---|\n| Prix (€) | ' + ' | '.join('$' + c + '$' for c in cases)
            + ' |\n')


MODELES.append(modele(
    '04-representer-la-proportionnalite-par-un-tableau',
    'Représenter une situation de proportionnalité par un tableau',
    'Ranger les données d\'un énoncé dans un tableau de proportionnalité (nom et unité de chaque'
    ' grandeur), écrire le nombre qui fait passer d\'une ligne à l\'autre, reconnaître le tableau'
    ' qui représente la situation',
    'Proportionnalité', 'Tableaux de proportionnalité', 'Représenter', 1,
    [variation('À la papeterie, tous les cahiers ont le même prix. ${{q2}}$ cahiers coûtent'
               ' ${{eval:q2*p}}~\\unit{€}$, ${{q3}}$ cahiers coûtent ${{eval:q3*p}}~\\unit{€}$ et'
               ' ${{q1}}$ cahiers coûtent ${{eval:q1*p}}~\\unit{€}$.\n\nComplète le tableau avec'
               ' les prix de l\'énoncé.\n\n| Nombre de cahiers | Prix (€) |\n|---|---|\n'
               '| ${{q1}}$ | $?$ |\n| ${{q2}}$ | $?$ |\n| ${{q3}}$ | $?$ |\n',
               [var('p', '2..6'), var('q1', '2..4'), var('q2', '5..7'), var('q3', '8..10')],
               ['{{eval:q1*p}}', '{{eval:q2*p}}', '{{eval:q3*p}}'],
               ['**Une ligne par achat.** Chaque prix va à côté de son nombre de cahiers : le'
                ' tableau garde les couples de l\'énoncé.',
                '${{q1}}$ cahiers : $' + col('{{eval:q1*p}}') + '~\\unit{€}$ ; ${{q2}}$ cahiers'
                ' : $' + col('{{eval:q2*p}}') + '~\\unit{€}$ ; ${{q3}}$ cahiers : $'
                + col('{{eval:q3*p}}') + '~\\unit{€}$.',
                'C\'est bien un tableau de proportionnalité : chaque prix est ${{p}}$ fois le'
                ' nombre de cahiers (un cahier coûte ${{p}}~\\unit{€}$).']),
     variation('Au marché, les pommes sont vendues au même prix par kilogramme.\n\n'
               '| Masse de pommes (kg) | ${{m1}}$ | ${{m2}}$ | ${{m3}}$ |\n|---|---|---|---|\n'
               '| Prix (€) | ${{eval:m1*p}}$ | ${{eval:m2*p}}$ | ${{eval:m3*p}}$ |\n\n'
               'Par quel nombre multiplie-t-on la masse pour obtenir le prix ?\n\n$\\times ?$',
               [var('p', '2..9'), var('m1', '1..3'), var('m2', '4..6'), var('m3', '7..10')],
               ['{{p}}'],
               ['**D\'une ligne à l\'autre.** ${{eval:m1*p}} \\div {{m1}} = {{p}}$, ${{eval:m2*p}}'
                ' \\div {{m2}} = {{p}}$, ${{eval:m3*p}} \\div {{m3}} = {{p}}$ : toujours le même'
                ' nombre.',
                'On multiplie par $' + col('{{p}}') + '$ : c\'est le prix d\'un kilogramme, ${{p}}'
                '~\\unit{€}$ le kilo.'],
               ['m1 != 1 || p >= 3']),
     variation('Les pommes coûtent ${{p}}~\\unit{€}$ le kilogramme.\n\n' + tableau_v3(0) + '\n'
               + tableau_v3(1) + '\n' + tableau_v3(2) + '\nQuel tableau représente cette'
               ' situation ?' + choix(['le tableau A', 'le tableau B', 'le tableau C'],
                                      melanger=False),
               [var('p', '2..5'), var('k', '0..2'), var('j', 'eval:mod(3-k,3)')], ['{{j}}'],
               ['**Le bon tableau.** Un kilogramme coûte ${{p}}~\\unit{€}$ : $1~\\unit{kg}$ →'
                ' ${{p}}~\\unit{€}$, $2~\\unit{kg}$ → ${{eval:2*p}}~\\unit{€}$, $3~\\unit{kg}$ →'
                ' ${{eval:3*p}}~\\unit{€}$ : c\'est le tableau $' + col(si('j==0', 'A', si('j==1',
                                                                                         'B', 'C')))
                + '$.',
                '**Les deux autres.** Celui où $3~\\unit{kg}$ coûtent ${{eval:4*p}}~\\unit{€}$'
                ' n\'est pas proportionnel ($3$ fois la masse, mais pas $3$ fois le prix). Celui'
                ' qui commence à ${{eval:p+1}}~\\unit{€}$ est proportionnel, mais à ${{eval:p+1}}'
                '~\\unit{€}$ le kilo : ce n\'est pas cette situation.'])],
    [spec('Prix à leur place', 0, {'p': 3, 'q1': 2, 'q2': 5, 'q3': 8}, ['6', '15', '24'],
          'correct'),
     spec('Erreur : prix dans l\'ordre de l\'énoncé', 0, {'p': 3, 'q1': 2, 'q2': 5, 'q3': 8},
          ['15', '24', '6'], 'incorrect'),
     spec('× 4', 1, {'p': 4, 'm1': 2, 'm2': 5, 'm3': 8}, '4', 'correct'),
     spec('Erreur : + 6 (additif)', 1, {'p': 4, 'm1': 2, 'm2': 5, 'm3': 8}, '6', 'incorrect'),
     spec('k = 0 : tableau A', 2, {'p': 3, 'k': 0, 'j': 0}, '0', 'correct'),
     spec('k = 1 : tableau C', 2, {'p': 3, 'k': 1, 'j': 2}, '2', 'correct'),
     spec('Erreur k = 1 : le tableau non proportionnel', 2, {'p': 3, 'k': 1, 'j': 2}, '0',
          'incorrect'),
     spec('Erreur k = 1 : proportionnel, autre prix', 2, {'p': 3, 'k': 1, 'j': 2}, '1',
          'incorrect')],
    delay=90))

# --- 5. 6-194 : identifier une instruction, une séquence ---------------------------------------

PROG_SEQUENCE = scratch(['quand le drapeau vert pressé', 'dire [Bonjour !] pendant (2) secondes',
                         'avancer de ({{a}}) pas', 'tourner ↻ de (90) degrés',
                         'avancer de ({{b}}) pas', 'dire [J\'ai fini !]'])
APRES = ['« dire Bonjour ! pendant 2 secondes »', '« avancer de {{a}} pas »',
         '« tourner ↻ de 90 degrés »']

PROG_ENTREE = scratch(['quand le drapeau vert pressé', 'demander [Choisis un nombre.] et attendre',
                       'mettre [nombre v] à ((réponse) * ({{a}}))', 'dire (nombre)'])

MODELES.append(modele(
    '05-identifier-une-instruction', 'Identifier une instruction dans un programme',
    'Programme Scratch court : l\'instruction exécutée juste après une autre, le nombre de fois'
    ' qu\'une instruction est exécutée dans une boucle « répéter », l\'instruction d\'entrée et celle'
    ' de sortie',
    'Algorithmique', 'Variables et instructions', 'Séquence d\'instructions', 1,
    [variation('Voici un programme.' + PROG_SEQUENCE + '\n\nQuelle instruction le lutin'
               ' exécute-t-il juste après ' + si('k==1', APRES[0], si('k==2', APRES[1], APRES[2]))
               + ' ?' + choix(['« avancer de {{a}} pas »', '« tourner ↻ de 90 degrés »',
                               '« avancer de {{b}} pas »', '« dire J\'ai fini ! »']),
               [var('a', '20|30|40|50'), var('b', '60|70|80|100'), var('k', '1..3'),
                var('j', 'eval:k-1')], ['{{j}}'],
               ['**Une séquence d\'instructions.** Le lutin exécute les instructions une par une,'
                ' de haut en bas.',
                'Juste après ' + si('k==1', APRES[0], si('k==2', APRES[1], APRES[2])) + ' vient '
                + si('k==1', '« avancer de {{a}} pas »', si('k==2', '« tourner ↻ de 90 degrés »',
                                                            '« avancer de {{b}} pas »')) + '.']),
     variation('Voici un programme.' + scratch([
         'quand le drapeau vert pressé', 'avancer de (10) pas', 'répéter ({{n}}) fois',
         'avancer de (10) pas', 'tourner ↻ de (15) degrés', 'fin', 'avancer de (10) pas'])
               + '\n\nCombien de fois l\'instruction « avancer de 10 pas » est-elle exécutée ?'
               '\n\n$?$',
               [var('n', '3..9')], ['{{eval:n+2}}'],
               ['**Dans la boucle.** Les instructions entre « répéter {{n}} fois » et « fin » sont'
                ' exécutées ${{n}}$ fois : « avancer de 10 pas » ${{n}}$ fois.',
                '**Hors de la boucle.** Une fois avant, une fois après : ${{n}} + 2 = '
                + col('{{eval:n+2}}') + '$.']),
     variation('Voici un programme.' + PROG_ENTREE + '\n\n' + si(
         'k==1', 'Quelle instruction permet à l\'utilisateur de donner un nombre au programme ?',
         'Quelle instruction affiche le résultat ?')
               + choix(['« quand le drapeau vert pressé »',
                        '« demander Choisis un nombre. et attendre »',
                        '« mettre nombre à réponse × {{a}} »', '« dire nombre »']),
               [var('a', '2..9'), var('k', '1..2'), var('j', si('k==1', '1', '3'))], ['{{j}}'],
               [si('k==1', '**L\'entrée.** « demander … et attendre » pose la question et attend'
                   ' que l\'utilisateur tape un nombre : la réponse entre dans le programme.',
                   '**La sortie.** « dire » affiche une bulle : c\'est le résultat que voit'
                   ' l\'utilisateur.'),
                '« mettre … » calcule sans rien afficher ; « quand le drapeau vert pressé » lance'
                ' le programme.'])],
    [spec('Après « dire Bonjour » : avancer de a', 0, {'a': 30, 'b': 80, 'k': 1, 'j': 0}, '0',
          'correct'),
     spec('Après « tourner » : avancer de b', 0, {'a': 30, 'b': 80, 'k': 3, 'j': 2}, '2',
          'correct'),
     spec('Erreur : l\'instruction d\'avant', 0, {'a': 30, 'b': 80, 'k': 3, 'j': 2}, '0',
          'incorrect'),
     spec('n = 5 : 7 fois', 1, {'n': 5}, '7', 'correct'),
     spec('Erreur : 5 (la boucle seule)', 1, {'n': 5}, '5', 'incorrect'),
     spec('Erreur : 3 (lignes écrites)', 1, {'n': 5}, '3', 'incorrect'),
     spec('Entrée : demander', 2, {'a': 3, 'k': 1, 'j': 1}, '1', 'correct'),
     spec('Erreur : mettre', 2, {'a': 3, 'k': 1, 'j': 1}, '2', 'incorrect'),
     spec('Sortie : dire', 2, {'a': 3, 'k': 2, 'j': 3}, '3', 'correct')]))

# --- 6. 6-195 : exécuter un programme pour un nombre de départ ---------------------------------

MODELES.append(modele(
    '06-executer-un-programme', 'Exécuter un programme pour un nombre de départ',
    'Appliquer un programme de calcul à un nombre donné : écrit en liste, en Scratch (demander,'
    ' mettre, dire), avec un nombre de départ décimal',
    'Algorithmique', 'Variables et instructions', 'Exécuter un programme', 1,
    [variation('Voici un programme de calcul :\n\n- choisir un nombre ;\n- le multiplier par'
               ' ${{a}}$ ;\n- ajouter ${{b}}$ ;\n- multiplier le résultat par ${{c}}$.\n\nApplique'
               ' ce programme au nombre ${{n}}$.\n\nRésultat : $?$',
               [var('n', '2..12'), var('a', '2..5'), var('b', '1..9'), var('c', '2..4')],
               ['{{eval:c*(a*n+b)}}'],
               ['**Dans l\'ordre.** On applique chaque étape au résultat de la précédente.',
                '${{n}} \\times {{a}} = {{eval:a*n}}$', '${{eval:a*n}} + {{b}} = {{eval:a*n+b}}$',
                '${{eval:a*n+b}} \\times {{c}} = ' + col('{{eval:c*(a*n+b)}}') + '$']),
     variation('Voici un programme.' + scratch([
         'quand le drapeau vert pressé', 'demander [Choisis un nombre.] et attendre',
         'mettre [nombre v] à ((réponse) + ({{a}}))', 'mettre [nombre v] à ((nombre) * ({{b}}))',
         'mettre [nombre v] à ((nombre) - ({{c}}))', 'dire (nombre)'])
               + '\n\nOn tape ${{n}}$. Quel nombre le lutin dit-il ?\n\n$?$',
               [var('n', '2..15'), var('a', '1..9'), var('b', '2..5'), var('c', '1..9')],
               ['{{eval:(n+a)*b-c}}'],
               ['**Une instruction après l\'autre.** La variable « nombre » garde le dernier'
                ' résultat.',
                '${{n}} + {{a}} = {{eval:n+a}}$', '${{eval:n+a}} \\times {{b}} = {{eval:(n+a)*b}}$',
                '${{eval:(n+a)*b}} - {{c}} = ' + col('{{eval:(n+a)*b-c}}') + '$ : le lutin dit $'
                + col('{{eval:(n+a)*b-c}}') + '$.']),
     variation('Voici un programme de calcul :\n\n- choisir un nombre ;\n- le multiplier par'
               ' $10$ ;\n- ajouter ${{b}}$ ;\n- diviser le résultat par $2$.\n\nApplique ce'
               ' programme au nombre ${{eval:m/10;d}}$.\n\nRésultat : $?$',
               [var('m', '11..99'), var('b', '1..9')], ['{{eval:(m+b)/2;d}}'],
               ['**Dans l\'ordre.** On applique chaque étape au résultat de la précédente.',
                '${{eval:m/10;d}} \\times 10 = {{m}}$', '${{m}} + {{b}} = {{eval:m+b}}$',
                '${{eval:m+b}} \\div 2 = ' + col('{{eval:(m+b)/2;d}}') + '$'],
               ['mod(m,10) != 0', 'mod(m+b,2) == 0'])],
    [spec('3 × 4 + 5, × 2 = 34', 0, {'n': 3, 'a': 4, 'b': 5, 'c': 2}, '34', 'correct'),
     spec('Erreur : 3 × 4 + 5 × 2 = 22 (priorités)', 0, {'n': 3, 'a': 4, 'b': 5, 'c': 2}, '22',
          'incorrect'),
     spec('Erreur : dernière étape oubliée', 0, {'n': 3, 'a': 4, 'b': 5, 'c': 2}, '17',
          'incorrect'),
     spec('(7 + 3) × 4 − 5 = 35', 1, {'n': 7, 'a': 3, 'b': 4, 'c': 5}, '35', 'correct'),
     spec('Erreur : 7 + 3 × 4 − 5 = 14', 1, {'n': 7, 'a': 3, 'b': 4, 'c': 5}, '14', 'incorrect'),
     spec('3,7 → 37 + 5 = 42 → 21', 2, {'m': 37, 'b': 5}, '21', 'correct'),
     spec('Erreur : 10 oublié, (3,7 + 5) ÷ 2 = 4,35', 2, {'m': 37, 'b': 5}, '4,35', 'incorrect'),
     spec('2,4 → 24 + 7 = 31 → 15,5', 2, {'m': 24, 'b': 7}, '15,5', 'correct')]))

# --- 7. 6-196 : répéter à la main une séquence -------------------------------------------------
# v1 : robot. Motif m : 1 « → → ↑ » (2, 1) ; 2 « → ↑ ↑ » (1, 2) ; 3 « ↑ → → » (2, 1).
# Trois points A, B, C : bonne arrivée (r passages), un seul passage, arrivée aux coordonnées
# échangées ; le point affiché en position i est du type mod(i + l, 3).

DX = si('m==2', '1', '2')
DY = si('m==2', '2', '1')
FLECHES = si('m==1', '$\\rightarrow\\ \\rightarrow\\ \\uparrow$',
             si('m==2', '$\\rightarrow\\ \\uparrow\\ \\uparrow$',
                '$\\uparrow\\ \\rightarrow\\ \\rightarrow$'))


def type_xy(t):
    # t = expression du type (0 bon, 1 un passage, 2 échangé)
    x = si(t + '==0', '{{eval:r*dx}}', si(t + '==1', '{{dx}}', '{{eval:r*dy}}'))
    y = si(t + '==0', '{{eval:r*dy}}', si(t + '==1', '{{dy}}', '{{eval:r*dx}}'))
    return x, y


def points_robot():
    lignes = ['dep1 = point(-0.2, -0.2, visible=faux)', 'dep2 = point(0.2, -0.2, visible=faux)',
              'dep3 = point(0.2, 0.2, visible=faux)', 'dep4 = point(-0.2, 0.2, visible=faux)',
              'dep = polygone(dep1, dep2, dep3, dep4, couleur="noir", remplissage="rouge",'
              ' opacite_fond=1)', 'texte(0, -0.55, "départ")']
    for i, nom in enumerate('ABC'):
        x, y = type_xy('mod(' + str(i) + '+l,3)')
        lignes.append(nom + ' = point(' + x + ', ' + y + ', couleur="noir")')
    return ('```figure\nfenetre: -0.8 ; 7.5 ; -0.9 ; 7.5\ndescription: Un quadrillage, la case de'
            ' départ du robot et trois points A, B et C.\ngrille: oui\n---\n' + '\n'.join(lignes)
            + '\n```')


ROBOT_VARS = [var('m', '1..3'), var('r', '2..3'), var('l', '0..2'), var('dx', DX), var('dy', DY),
              var('j', 'eval:mod(3-l,3)')]

FIGURES = ['un carré', 'un triangle équilatéral', 'un hexagone régulier', 'un rectangle']

MODELES.append(modele(
    '07-repeter-une-sequence-a-la-main', 'Répéter à la main une séquence d\'instructions',
    'Suivre une boucle « répéter » à la main : où arrive un robot sur un quadrillage, quelle'
    ' figure trace le lutin, combien de répétitions pour une distance imposée',
    'Algorithmique', 'Boucles', 'Boucle bornée', 1,
    [variation('Le robot part de la case rouge. Chaque flèche le fait avancer d\'un carreau.\n\n'
               'Programme : **répéter ${{r}}$ fois** ' + FLECHES + '\n\n' + points_robot()
               + '\n\nOù arrive le robot ?' + choix(['au point A', 'au point B', 'au point C'],
                                                    melanger=False),
               ROBOT_VARS, ['{{j}}'],
               ['**Un passage.** ' + FLECHES + ' : le robot avance de ${{dx}}$ carreau'
                + si('dx==1', '', 'x') + ' vers la droite et de ${{dy}}$ vers le haut.',
                '**${{r}}$ passages.** ${{eval:r*dx}}$ carreaux vers la droite, ${{eval:r*dy}}$'
                ' vers le haut : le point $' + col(si('j==0', 'A', si('j==1', 'B', 'C'))) + '$.'],
               ),
     variation('Le lutin a le stylo posé : il dessine en avançant.' + scratch([
         'quand le drapeau vert pressé', 'stylo en position d\'écriture',
         'répéter (' + si('k==1', '4', si('k==2', '3', '6')) + ') fois',
         'avancer de ({{c}}) pas', 'tourner ↻ de (' + si('k==1', '90', si('k==2', '120', '60'))
         + ') degrés', 'fin'])
               + '\n\nQuelle figure le lutin trace-t-il ?' + choix(FIGURES),
               [var('k', '1..3'), var('c', '50|80|100'), var('j', 'eval:k-1')], ['{{j}}'],
               ['**Les côtés.** Le lutin avance ' + si('k==1', '$4$', si('k==2', '$3$', '$6$'))
                + ' fois de ${{c}}$ pas : ' + si('k==1', '$4$', si('k==2', '$3$', '$6$'))
                + ' côtés de même longueur.',
                '**Les angles.** Il tourne de ' + si('k==1', '$90°$', si('k==2', '$120°$', '$60°$'))
                + ' : l\'angle de la figure est $180° - '
                + si('k==1', '90° = 90°', si('k==2', '120° = 60°', '60° = 120°'))
                + '$. C\'est **' + si('k==1', 'un carré', si('k==2', 'un triangle équilatéral',
                                                             'un hexagone régulier')) + '**.']),
     variation('Le lutin doit avancer de ${{eval:c*n}}$ pas en tout.' + scratch([
         'quand le drapeau vert pressé', 'répéter (n) fois', 'avancer de ({{c}}) pas', 'fin'])
               + '\n\nQuel nombre faut-il mettre à la place de $n$ ?\n\n$?$',
               [var('c', '10|20|25|50'), var('n', '3..12')], ['{{n}}'],
               ['**Une répétition.** À chaque passage dans la boucle, le lutin avance de ${{c}}$'
                ' pas.',
                '${{eval:c*n}} \\div {{c}} = ' + col('{{n}}') + '$ répétitions : ${{n}} \\times'
                ' {{c}} = {{eval:c*n}}$.'])],
    [spec('m = 1, r = 2, l = 0 : A', 0, {'m': 1, 'r': 2, 'l': 0, 'dx': 2, 'dy': 1, 'j': 0}, '0',
          'correct'),
     spec('Erreur : un seul passage', 0, {'m': 1, 'r': 2, 'l': 0, 'dx': 2, 'dy': 1, 'j': 0}, '2',
          'incorrect'),
     spec('m = 2, r = 3, l = 1 : C', 0, {'m': 2, 'r': 3, 'l': 1, 'dx': 1, 'dy': 2, 'j': 2}, '2',
          'correct'),
     spec('Carré', 1, {'k': 1, 'c': 80, 'j': 0}, '0', 'correct'),
     spec('Triangle équilatéral (tourner de 120°)', 1, {'k': 2, 'c': 80, 'j': 1}, '1', 'correct'),
     spec('Erreur : hexagone pour 120°', 1, {'k': 2, 'c': 80, 'j': 1}, '2', 'incorrect'),
     spec('Erreur : rectangle', 1, {'k': 1, 'c': 80, 'j': 0}, '3', 'incorrect'),
     spec('200 pas, 25 par passage : 8', 2, {'c': 25, 'n': 8}, '8', 'correct'),
     spec('Erreur : 175 (soustraction)', 2, {'c': 25, 'n': 8}, '175', 'incorrect')]))

os.makedirs(DOSSIER, exist_ok=True)
for nom, m in MODELES:
    with open(os.path.join(DOSSIER, nom + '.json'), 'w', encoding='utf-8') as f:
        json.dump(m, f, ensure_ascii=False, indent='\t')
        f.write('\n')
subprocess.run(['pnpm', 'exec', 'prettier', '--write', DOSSIER], check=True,
               stdout=subprocess.DEVNULL)
print(f'{len(MODELES)} modèles écrits dans {DOSSIER}')
