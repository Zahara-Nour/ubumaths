"""Écrit les 9 premiers modèles Blockly de 4e et de 3e dans scripts/questions/blockly-4e-3e/.

Lot porté par le chantier `blockly` (journal docs/archive/wip/blockly-progress.md § PR C, validé par
David le 2026-11-16) ; un point par modèle (ADR 0020) ; l'élève ÉCRIT le programme en blocs (les
modèles déjà en prod sur ces points le font LIRE) :

| #  | Point | Titre | Niveau du bloc | Niveau |
| 01 | 4-065 | Écrire une condition | 4e | 1 |
| 02 | 4-066 | Programme avec « si … sinon » | 4e | 1 |
| 03 | 4-067 | Utiliser une variable | 4e | 2 |
| 04 | 4-068 | Écrire un programme pour résoudre un problème (4e) | 4e | 2 |
| 05 | 4-069 | Modifier un programme avec condition | 4e, départ | 2 |
| 06 | 3-047 | Plusieurs variables en blocs | 3e | 2 |
| 07 | 3-048 | Conditions composées en blocs | 3e | 2 |
| 08 | 3-049 | Boucle « répéter jusqu'à » en blocs | 3e | 2 |
| 09 | 3-051 | Écrire un programme pour résoudre un problème (3e) | 3e | 3 |

Règles du lot :
- le bloc ```calcul porte SA case (posée par le générateur) : ni `blanks` ni `?` ; la réponse
  d'une spec est le programme de l'élève en notation texte ;
- jugement par ce que le programme affiche sur les `essais:` : les specs `correct` montrent des
  écritures différentes de la référence ; la variable n'est pas imposée (décision (a) du lot 11) ;
- `essais:` toujours écrits : chaque branche de chaque « si » de la référence y est parcourue
  (refus à la publication sinon) ; jamais de nombre qui ferait tourner sans fin une boucle
  « répéter jusqu'à » de la référence ; entiers seulement ;
- nombres entiers ; variables du modèle : jamais `e` ni `i`.

    python3 docs/wip/questions/lot-blockly-4e-3e.py scripts/questions/blockly-4e-3e
"""
import json
import os
import sys

DOSSIER = sys.argv[1]


def spec(desc, vi, variables, answers, status):
    return {'description': desc, 'variationIndex': vi,
            'variables': {k: str(v) for k, v in variables.items()},
            'answers': answers if isinstance(answers, list) else [answers],
            'expected': {'status': status}}


def modele(nom, title, description, grade, level, variations, specs, delay=300):
    # Ni theme, ni domain, ni subdomain (ADR 0035) ; nœud et tag posés par la migration.
    return nom, {'title': title, 'description': description, 'grades': [grade], 'level': level,
                 'delay': delay, 'status': 'draft', 'variations': variations, 'testSpecs': specs}


def var(nom, expression):
    return {'name': nom, 'expression': expression}


def variation(statement, variables, steps, conditions=None):
    return {'statement': statement, 'variables': variables, 'conditions': conditions or [],
            'blanks': [], 'correction': {'steps': steps}}


def calcul(niveau, attendu, essais, depart=None):
    lignes = ['niveau: ' + niveau, 'attendu: ' + attendu, 'essais: ' + essais]
    if depart:
        lignes.append('départ: ' + depart)
    return '```calcul\n' + '\n'.join(lignes) + '\n```'


def remplir(texte, valeurs):
    for k, v in valeurs.items():
        texte = texte.replace('{{' + k + '}}', str(v))
    return texte


MODELES = []

# --- 01. 4-065 : écrire une condition ----------------------------------------------------------

C_MULTIPLE = 'si reste de nombre par {{a}} = 0 alors [ afficher nombre ] sinon [ afficher 0 ]'
C_AGE = 'si nombre ≥ {{a}} alors [ afficher 1 ] sinon [ afficher 0 ]'
C_GEL = 'si nombre < 0 alors [ afficher 1 ] sinon [ afficher 0 ]'

COND_MULTIPLE = variation(
    'Écris un programme qui affiche le nombre choisi s\'il est un **multiple de ${{a}}$**, et'
    ' qui affiche $0$ sinon.\n\n'
    + calcul('4e', C_MULTIPLE, '1 ; 2 ; 3 ; 4 ; 5 ; 6 ; 10 ; 12 ; 15 ; 20 ; 21 ; 30'),
    [var('a', '2..5')],
    ['Un nombre est un multiple de ${{a}}$ quand le **reste** de sa division par ${{a}}$ vaut'
     ' $0$.',
     'La condition s\'écrit donc : reste de nombre par ${{a}}$ $= 0$.',
     'Si elle est vraie, on affiche le nombre ; **sinon**, on affiche $0$ : il faut le bloc'
     ' « si … alors … sinon ».'])
COND_AGE = variation(
    'Un manège est autorisé à partir de ${{a}}$ ans. Le nombre choisi est l\'âge d\'un enfant.'
    '\n\nÉcris un programme qui affiche $1$ si l\'enfant peut monter, et $0$ sinon.\n\n'
    + calcul('4e', C_AGE, '{{b}} ; {{a}} ; {{c}} ; 3 ; 20'),
    [var('a', '8..12'), var('b', 'eval:a-1'), var('c', 'eval:a+1')],
    ['« À partir de ${{a}}$ ans » : un enfant de **${{a}}$ ans** peut monter.',
     'La condition est donc nombre $\\geq {{a}}$ (et non nombre $> {{a}}$, qui refuserait'
     ' l\'enfant de ${{a}}$ ans).',
     'Si elle est vraie, on affiche $1$ ; sinon, on affiche $0$.'])
COND_GEL = variation(
    'Le nombre choisi est une température en degrés. Il gèle quand la température est'
    ' **strictement inférieure** à $0$.\n\nÉcris un programme qui affiche $1$ s\'il gèle, et $0$'
    ' sinon.\n\n'
    + calcul('4e', C_GEL, '-5 ; -1 ; 0 ; 1 ; 12'),
    [],
    ['« Strictement inférieure à $0$ » : la condition est nombre $< 0$.',
     'À $0$ degré exactement, il ne gèle pas : la condition nombre $\\leq 0$ serait fausse'
     ' pour ce cas.',
     'Si la condition est vraie, on affiche $1$ ; sinon, on affiche $0$.'])

MODELES.append(modele(
    '01-ecrire-une-condition', 'Écrire une condition',
    'Écrire en blocs la condition d\'un « si » : multiple d\'un nombre, âge minimum, gel.',
    '4', 1, [COND_MULTIPLE, COND_AGE, COND_GEL],
    [spec('Multiple de 3 : référence', 0, {'a': 3}, remplir(C_MULTIPLE, {'a': 3}), 'correct'),
     spec('Multiple de 3 : condition inversée, branches échangées', 0, {'a': 3},
          'si reste de nombre par 3 ≠ 0 alors [ afficher 0 ] sinon [ afficher nombre ]',
          'correct'),
     spec('Erreur : reste = 1 au lieu de 0', 0, {'a': 3},
          'si reste de nombre par 3 = 1 alors [ afficher nombre ] sinon [ afficher 0 ]',
          'incorrect'),
     spec('Erreur : pas de « sinon » (rien n\'est affiché)', 0, {'a': 3},
          'si reste de nombre par 3 = 0 alors [ afficher nombre ]', 'incorrect'),
     spec('Âge : référence', 1, {'a': 10, 'b': 9, 'c': 11}, remplir(C_AGE, {'a': 10}),
          'correct'),
     spec('Âge : nombre > 9 (entiers)', 1, {'a': 10, 'b': 9, 'c': 11},
          'si nombre > 9 alors [ afficher 1 ] sinon [ afficher 0 ]', 'correct'),
     spec('Erreur : strictement supérieur', 1, {'a': 10, 'b': 9, 'c': 11},
          'si nombre > 10 alors [ afficher 1 ] sinon [ afficher 0 ]', 'incorrect'),
     spec('Gel : référence', 2, {}, C_GEL, 'correct'),
     spec('Gel : 0 > nombre', 2, {}, 'si 0 > nombre alors [ afficher 1 ] sinon [ afficher 0 ]',
          'correct'),
     spec('Erreur : inférieur ou égal', 2, {},
          'si nombre ≤ 0 alors [ afficher 1 ] sinon [ afficher 0 ]', 'incorrect')]))

# --- 02. 4-066 : programme avec « si … sinon » -------------------------------------------------

S_TARIF = ('si nombre < {{s}} alors [ afficher nombre × {{p}} ] '
           'sinon [ afficher nombre × {{q}} ]')
S_DISTANCE = ('si nombre > {{a}} alors [ afficher nombre − {{a}} ] '
              'sinon [ afficher {{a}} − nombre ]')
S_IMPAIR = ('mettre valeur à nombre ; si reste de nombre par 2 = 1 alors [ ajouter {{a}} à valeur ]'
            ' ; afficher valeur')

SI_TARIF = variation(
    'Au cinéma, une place coûte ${{p}}$ € ; à partir de ${{s}}$ places achetées ensemble,'
    ' chaque place ne coûte plus que ${{q}}$ €.\n\nLe nombre choisi est le nombre de places.'
    ' Écris un programme qui affiche le prix à payer.\n\n'
    + calcul('4e', S_TARIF, '1 ; 2 ; {{t}} ; {{s}} ; {{u}}'),
    [var('p', '8..12'), var('d', '1..3'), var('q', 'eval:p-d'), var('s', '5..10'),
     var('t', 'eval:s-1'), var('u', 'eval:s+3')],
    ['Deux cas : moins de ${{s}}$ places, ou au moins ${{s}}$ places.',
     'Condition : nombre $< {{s}}$. Si elle est vraie, le prix est nombre $\\times {{p}}$.',
     '**Sinon** (${{s}}$ places ou plus), le prix est nombre $\\times {{q}}$.'])
SI_DISTANCE = variation(
    'Écris un programme qui suit ces règles :\n\n'
    '- si le nombre choisi est plus grand que ${{a}}$, il affiche nombre $-\\ {{a}}$ ;\n'
    '- sinon, il affiche ${{a}} -$ nombre.\n\n'
    + calcul('4e', S_DISTANCE, '0 ; 2 ; {{a}} ; {{b}} ; 20'),
    [var('a', '5..9'), var('b', 'eval:a+2')],
    ['La condition est nombre $> {{a}}$.',
     'Dans « alors » : afficher nombre $-\\ {{a}}$ ; dans « sinon » : afficher ${{a}} -$'
     ' nombre.',
     'Le programme affiche ainsi la **distance** entre le nombre choisi et ${{a}}$ : elle n\'est'
     ' jamais négative.'])
SI_IMPAIR = variation(
    'Écris un programme qui affiche le nombre choisi ; mais si ce nombre est **impair**, il lui'
    ' ajoute d\'abord ${{a}}$.\n\n'
    + calcul('4e', S_IMPAIR, '1 ; 2 ; 3 ; 4 ; 7 ; 10'),
    [var('a', '1..9')],
    ['Un nombre est impair quand le reste de sa division par $2$ vaut $1$.',
     'On range le nombre choisi dans une variable, on lui ajoute ${{a}}$ **seulement si** il'
     ' est impair (un « si » sans « sinon »), puis on affiche la variable.',
     'Autre écriture juste : si le nombre est pair, afficher nombre ; sinon, afficher nombre'
     ' $+\\ {{a}}$.'])

MODELES.append(modele(
    '02-programme-avec-si-sinon', 'Programme avec « si … sinon »',
    'Écrire en blocs un programme à deux cas : tarif de groupe, distance à un nombre, impair.',
    '4', 1, [SI_TARIF, SI_DISTANCE, SI_IMPAIR],
    [spec('Tarif : référence', 0, {'p': 9, 'd': 2, 'q': 7, 's': 6, 't': 5, 'u': 9},
          remplir(S_TARIF, {'s': 6, 'p': 9, 'q': 7}), 'correct'),
     spec('Tarif : condition ≥, branches échangées', 0,
          {'p': 9, 'd': 2, 'q': 7, 's': 6, 't': 5, 'u': 9},
          'si nombre ≥ 6 alors [ afficher nombre × 7 ] sinon [ afficher nombre × 9 ]', 'correct'),
     spec('Erreur : strictement plus de 6 places', 0,
          {'p': 9, 'd': 2, 'q': 7, 's': 6, 't': 5, 'u': 9},
          'si nombre > 6 alors [ afficher nombre × 7 ] sinon [ afficher nombre × 9 ]',
          'incorrect'),
     spec('Erreur : prix échangés', 0, {'p': 9, 'd': 2, 'q': 7, 's': 6, 't': 5, 'u': 9},
          'si nombre < 6 alors [ afficher nombre × 7 ] sinon [ afficher nombre × 9 ]',
          'incorrect'),
     spec('Distance : référence', 1, {'a': 7, 'b': 9}, remplir(S_DISTANCE, {'a': 7}),
          'correct'),
     spec('Distance : condition nombre < 7', 1, {'a': 7, 'b': 9},
          'si nombre < 7 alors [ afficher 7 − nombre ] sinon [ afficher nombre − 7 ]', 'correct'),
     spec('Erreur : un seul cas', 1, {'a': 7, 'b': 9}, 'afficher nombre − 7', 'incorrect'),
     spec('Impair : référence', 2, {'a': 4}, remplir(S_IMPAIR, {'a': 4}), 'correct'),
     spec('Impair : si … sinon', 2, {'a': 4},
          'si reste de nombre par 2 = 0 alors [ afficher nombre ] sinon [ afficher nombre + 4 ]',
          'correct'),
     spec('Erreur : ajoute toujours', 2, {'a': 4}, 'afficher nombre + 4', 'incorrect'),
     spec('Erreur : ajoute aux pairs', 2, {'a': 4},
          'mettre valeur à nombre ; si reste de nombre par 2 = 0 alors [ ajouter 4 à valeur ] ;'
          ' afficher valeur', 'incorrect')]))

# --- 03. 4-067 : utiliser une variable ---------------------------------------------------------

V_PRIX = 'mettre prix à nombre × {{a}} ; ajouter {{b}} à prix ; afficher prix'
V_TABLE = 'mettre total à 0 ; répéter nombre [ ajouter {{a}} à total ; afficher total ]'
V_COMPTE = ('mettre compte à nombre ; répéter {{n}} [ mettre compte à compte × 2 ] ;'
            ' afficher compte')

VAR_PRIX = variation(
    'Le nombre choisi est un nombre de cahiers à ${{a}}$ € l\'un ; la livraison coûte ${{b}}$ €.'
    '\n\nCrée une variable **prix**. Le programme met dans prix le prix des cahiers, ajoute la'
    ' livraison à prix, puis affiche prix.\n\n'
    + calcul('4e', V_PRIX, '1 ; 2 ; 5 ; 10'),
    [var('a', '2..6'), var('b', '3..9')],
    ['« Mettre prix à nombre $\\times {{a}}$ » : prix contient le prix des cahiers.',
     '« Ajouter ${{b}}$ à prix » : prix contient maintenant prix $+\\ {{b}}$ ; l\'ancienne valeur'
     ' est remplacée.',
     'On termine par « afficher prix ».'])
VAR_TABLE = variation(
    'Écris un programme qui affiche, l\'un après l\'autre, les premiers nombres de la table de'
    ' ${{a}}$ : ${{a}}$, ${{a2}}$, ${{a3}}$… Il en affiche autant que le nombre choisi'
    ' (pour $3$, il affiche ${{a}}$, ${{a2}}$ et ${{a3}}$).\n\n'
    'Utilise une variable **total** qui vaut $0$ au départ.\n\n'
    + calcul('4e', V_TABLE, '1 ; 3 ; 5'),
    [var('a', '3..9'), var('a2', 'eval:2*a'), var('a3', 'eval:3*a')],
    ['Au départ, total vaut $0$.',
     'À chaque tour, on **ajoute ${{a}}$ à total**, puis on affiche total : ${{a}}$, puis'
     ' ${{a2}}$, puis ${{a3}}$…',
     'On répète « nombre choisi » fois : le bloc répéter accepte le nombre choisi comme nombre'
     ' de tours.'])
VAR_COMPTE = variation(
    'Une bactérie se divise en deux toutes les heures. Le nombre choisi est le nombre de'
    ' bactéries au départ.\n\nAvec une variable **compte**, écris un programme qui affiche le'
    ' nombre de bactéries au bout de ${{n}}$ heures.\n\n'
    + calcul('4e', V_COMPTE, '1 ; 3 ; 10'),
    [var('n', '3..6')],
    ['Au départ, compte vaut le nombre choisi.',
     'Chaque heure, le nombre de bactéries double : on met compte à compte $\\times 2$.',
     'On répète ${{n}}$ fois, puis on affiche compte.'])

MODELES.append(modele(
    '03-utiliser-une-variable', 'Utiliser une variable',
    'Écrire en blocs un programme qui range, modifie et affiche une variable.', '4', 2,
    [VAR_PRIX, VAR_TABLE, VAR_COMPTE],
    [spec('Prix : référence', 0, {'a': 3, 'b': 5}, remplir(V_PRIX, {'a': 3, 'b': 5}),
          'correct'),
     spec('Prix : sans variable', 0, {'a': 3, 'b': 5}, 'afficher nombre × 3 + 5', 'correct'),
     spec('Erreur : affiche avant d\'ajouter', 0, {'a': 3, 'b': 5},
          'mettre prix à nombre × 3 ; afficher prix ; ajouter 5 à prix', 'incorrect'),
     spec('Table : référence', 1, {'a': 4, 'a2': 8, 'a3': 12}, remplir(V_TABLE, {'a': 4}),
          'correct'),
     spec('Table : avec un compteur', 1, {'a': 4, 'a2': 8, 'a3': 12},
          'mettre k à 0 ; répéter nombre [ ajouter 1 à k ; afficher k × 4 ]', 'correct'),
     spec('Erreur : affiche avant d\'ajouter (commence à 0)', 1, {'a': 4, 'a2': 8, 'a3': 12},
          'mettre total à 0 ; répéter nombre [ afficher total ; ajouter 4 à total ]',
          'incorrect'),
     spec('Erreur : affiche seulement le dernier', 1, {'a': 4, 'a2': 8, 'a3': 12},
          'mettre total à 0 ; répéter nombre [ ajouter 4 à total ] ; afficher total',
          'incorrect'),
     spec('Bactéries : référence', 2, {'n': 4}, remplir(V_COMPTE, {'n': 4}), 'correct'),
     spec('Bactéries : × 16', 2, {'n': 4}, 'afficher nombre × 16', 'correct'),
     spec('Erreur : ajoute 2 au lieu de doubler', 2, {'n': 4},
          'mettre compte à nombre ; répéter 4 [ ajouter 2 à compte ] ; afficher compte',
          'incorrect')]))

# --- 04. 4-068 : écrire un programme pour résoudre un problème ---------------------------------

P_COPIES = ('si nombre ≤ {{s}} alors [ afficher nombre × {{p}} ] '
            'sinon [ afficher {{s}} × {{p}} + (nombre − {{s}}) × {{q}} ]')
P_PORT = 'si nombre < {{s}} alors [ afficher nombre + {{f}} ] sinon [ afficher nombre ]'
P_SOMME = ('mettre somme à 0 ; mettre k à 0 ; répéter nombre [ ajouter 1 à k ; ajouter k à somme ]'
           ' ; afficher somme')

PB_COPIES = variation(
    'Un magasin fait des photocopies : chacune des ${{s}}$ premières coûte ${{p}}$ centimes ;'
    ' les suivantes ne coûtent que ${{q}}$ centimes chacune.\n\nLe nombre choisi est le nombre de'
    ' photocopies. Écris un programme qui affiche le prix à payer, en centimes.\n\n'
    + calcul('4e', P_COPIES, '1 ; 5 ; {{s}} ; {{t}} ; 100'),
    [var('s', '10..30'), var('p', '15..25'), var('d', '5..10'), var('q', 'eval:p-d'),
     var('t', 'eval:s+1')],
    ['Jusqu\'à ${{s}}$ photocopies, toutes coûtent ${{p}}$ centimes : nombre $\\times {{p}}$.',
     'Au-delà, les ${{s}}$ premières coûtent ${{s}} \\times {{p}}$ centimes, et les'
     ' nombre $-\\ {{s}}$ suivantes ${{q}}$ centimes chacune.',
     'Programme : si nombre $\\leq {{s}}$, afficher nombre $\\times {{p}}$ ; sinon, afficher'
     ' ${{s}} \\times {{p}} + ($nombre $-\\ {{s}}) \\times {{q}}$.'])
PB_PORT = variation(
    'Sur un site, la livraison coûte ${{f}}$ € pour une commande de moins de ${{s}}$ € ; elle est'
    ' gratuite à partir de ${{s}}$ €.\n\nLe nombre choisi est le montant de la commande, en euros.'
    ' Écris un programme qui affiche le prix total à payer.\n\n'
    + calcul('4e', P_PORT, '10 ; {{t}} ; {{s}} ; 100'),
    [var('f', '3..8'), var('s', '30..60'), var('t', 'eval:s-1')],
    ['Moins de ${{s}}$ € : on paie la commande **et** la livraison, nombre $+\\ {{f}}$.',
     'À partir de ${{s}}$ € : on ne paie que la commande.',
     'Condition : nombre $< {{s}}$, avec un bloc « si … alors … sinon ».'])
PB_SOMME = variation(
    'Écris un programme qui affiche la somme de tous les entiers de $1$ jusqu\'au nombre choisi'
    ' : pour $4$, il affiche $1 + 2 + 3 + 4 = 10$.\n\n'
    + calcul('4e', P_SOMME, '1 ; 2 ; 4 ; 10 ; 20'),
    [],
    ['Une variable **somme** vaut $0$ au départ ; une variable **k** compte $1$, $2$, $3$…',
     'À chaque tour : on ajoute $1$ à k, puis on ajoute k à somme.',
     'On répète « nombre choisi » fois, puis on affiche somme.'])

MODELES.append(modele(
    '04-ecrire-un-programme-pour-un-probleme-4e',
    'Écrire un programme pour résoudre un problème (4e)',
    'Écrire en blocs le programme d\'une situation : photocopies, livraison, somme des entiers.',
    '4', 2, [PB_COPIES, PB_PORT, PB_SOMME],
    [spec('Copies : référence', 0, {'s': 20, 'p': 20, 'd': 8, 'q': 12, 't': 21},
          remplir(P_COPIES, {'s': 20, 'p': 20, 'q': 12}), 'correct'),
     spec('Copies : avec une variable', 0, {'s': 20, 'p': 20, 'd': 8, 'q': 12, 't': 21},
          'mettre prix à nombre × 20 ; si nombre > 20 alors [ mettre prix à 400 + (nombre − 20)'
          ' × 12 ] ; afficher prix', 'correct'),
     spec('Erreur : toutes les copies au tarif réduit', 0,
          {'s': 20, 'p': 20, 'd': 8, 'q': 12, 't': 21},
          'si nombre ≤ 20 alors [ afficher nombre × 20 ] sinon [ afficher nombre × 12 ]',
          'incorrect'),
     spec('Livraison : référence', 1, {'f': 5, 's': 40, 't': 39},
          remplir(P_PORT, {'s': 40, 'f': 5}), 'correct'),
     spec('Livraison : avec une variable', 1, {'f': 5, 's': 40, 't': 39},
          'mettre total à nombre ; si nombre < 40 alors [ ajouter 5 à total ] ; afficher total',
          'correct'),
     spec('Erreur : livraison offerte au-dessus de 40 seulement', 1,
          {'f': 5, 's': 40, 't': 39},
          'si nombre ≤ 40 alors [ afficher nombre + 5 ] sinon [ afficher nombre ]', 'incorrect'),
     spec('Somme : référence', 2, {}, P_SOMME, 'correct'),
     spec('Somme : formule', 2, {}, 'afficher nombre × (nombre + 1) ÷ 2', 'correct'),
     spec('Erreur : ajoute k avant de l\'augmenter (oublie le dernier)', 2, {},
          'mettre somme à 0 ; mettre k à 0 ; répéter nombre [ ajouter k à somme ; ajouter 1 à k ]'
          ' ; afficher somme', 'incorrect')]))

# --- 05. 4-069 : modifier un programme avec condition (départ) ---------------------------------

MO_SEUIL = 'si nombre > {{a}} alors [ afficher nombre − {{a}} ] sinon [ afficher 0 ]'
MO_EGAL_DEPART = 'si nombre > {{a}} alors [ afficher 1 ] sinon [ afficher 0 ]'
MO_EGAL = 'si nombre ≥ {{a}} alors [ afficher 1 ] sinon [ afficher 0 ]'
MO_SINON_DEPART = 'si nombre < 0 alors [ afficher 0 − nombre ]'
MO_SINON = 'si nombre < 0 alors [ afficher 0 − nombre ] sinon [ afficher nombre ]'

MOD_SEUIL = variation(
    'Le programme posé dans l\'espace de travail affiche de combien le nombre choisi dépasse'
    ' ${{p}}$ (et $0$ s\'il ne le dépasse pas).\n\nModifie-le pour qu\'il affiche de combien le'
    ' nombre choisi dépasse ${{a}}$.\n\n'
    + calcul('4e', MO_SEUIL, '3 ; {{p}} ; {{a}} ; {{b}} ; 30',
             depart=MO_SEUIL.replace('{{a}}', '{{p}}')),
    [var('p', '5..8'), var('a', '10..14'), var('b', 'eval:a+3')],
    ['Le nombre ${{p}}$ apparaît **deux fois** : dans la condition et dans le calcul.',
     'Il faut changer les deux : nombre $> {{a}}$, puis afficher nombre $-\\ {{a}}$.',
     'Le « sinon » ne change pas : il affiche toujours $0$.'])
MOD_EGAL = variation(
    'Le programme posé dans l\'espace de travail affiche $1$ quand le nombre choisi est'
    ' **strictement** supérieur à ${{a}}$, et $0$ sinon.\n\nModifie-le pour qu\'il affiche aussi'
    ' $1$ quand le nombre choisi est **égal** à ${{a}}$.\n\n'
    + calcul('4e', MO_EGAL, '{{b}} ; {{a}} ; {{c}}', depart=MO_EGAL_DEPART),
    [var('a', '5..15'), var('b', 'eval:a-1'), var('c', 'eval:a+1')],
    ['Seul le cas nombre $= {{a}}$ doit changer.',
     'On remplace la comparaison $>$ par $\\geq$ (« supérieur ou égal ») : nombre'
     ' $\\geq {{a}}$.',
     'Les deux branches, $1$ et $0$, ne changent pas.'])
MOD_SINON = variation(
    'Le programme posé dans l\'espace de travail affiche l\'opposé du nombre choisi quand il est'
    ' négatif, mais n\'affiche **rien** sinon.\n\nModifie-le pour qu\'il affiche le nombre'
    ' lui-même quand il n\'est pas négatif.\n\n'
    + calcul('4e', MO_SINON, '-7 ; -2 ; 0 ; 3 ; 12', depart=MO_SINON_DEPART),
    [],
    ['Il manque un cas : quand la condition nombre $< 0$ est fausse.',
     'On remplace le bloc « si … alors » par le bloc « si … alors … sinon » (on y glisse la'
     ' condition et l\'instruction déjà écrites).',
     'Dans « sinon » : afficher nombre. Le programme affiche ainsi la distance du nombre à $0$.'])

MODELES.append(modele(
    '05-modifier-un-programme-avec-condition', 'Modifier un programme avec condition',
    'Changer le seuil ou la comparaison d\'un « si », ou lui ajouter un « sinon ».', '4', 2,
    [MOD_SEUIL, MOD_EGAL, MOD_SINON],
    [spec('Seuil : référence', 0, {'p': 6, 'a': 12, 'b': 15}, remplir(MO_SEUIL, {'a': 12}),
          'correct'),
     spec('Erreur : seuil changé dans la condition seulement', 0, {'p': 6, 'a': 12, 'b': 15},
          'si nombre > 12 alors [ afficher nombre − 6 ] sinon [ afficher 0 ]', 'incorrect'),
     spec('Erreur : programme de départ', 0, {'p': 6, 'a': 12, 'b': 15},
          remplir(MO_SEUIL, {'a': 6}), 'incorrect'),
     spec('Égal : référence', 1, {'a': 9, 'b': 8, 'c': 10}, remplir(MO_EGAL, {'a': 9}),
          'correct'),
     spec('Égal : nombre > 8 (entiers)', 1, {'a': 9, 'b': 8, 'c': 10},
          'si nombre > 8 alors [ afficher 1 ] sinon [ afficher 0 ]', 'correct'),
     spec('Erreur : = au lieu de ≥', 1, {'a': 9, 'b': 8, 'c': 10},
          'si nombre = 9 alors [ afficher 1 ] sinon [ afficher 0 ]', 'incorrect'),
     spec('Sinon : référence', 2, {}, MO_SINON, 'correct'),
     spec('Sinon : autre écriture', 2, {},
          'si nombre ≥ 0 alors [ afficher nombre ] sinon [ afficher −1 × nombre ]', 'correct'),
     spec('Erreur : « sinon » qui affiche 0', 2, {},
          'si nombre < 0 alors [ afficher 0 − nombre ] sinon [ afficher 0 ]', 'incorrect')]))

# --- 06. 3-047 : plusieurs variables -----------------------------------------------------------

D_ECHANGE = ('mettre a à nombre ; mettre b à nombre + {{k}} ; mettre c à a ; mettre a à b ;'
             ' mettre b à c ; afficher a ; afficher b')
D_SUITE = ('mettre a à 1 ; mettre b à nombre ; répéter {{n}} [ mettre c à a + b ; mettre a à b ;'
           ' mettre b à c ; afficher b ]')
D_MAX = ('mettre x à nombre × {{a}} − {{b}} ; mettre y à nombre + {{c}} ;'
         ' si x > y alors [ afficher x ] sinon [ afficher y ]')

DEUX_ECHANGE = variation(
    'Le programme crée deux variables : **a** vaut le nombre choisi et **b** vaut le nombre'
    ' choisi $+\\ {{k}}$.\n\nÉcris-le, puis ajoute ce qu\'il faut pour **échanger** les valeurs'
    ' de a et de b. Termine en affichant a, puis b.\n\n'
    + calcul('3e', D_ECHANGE, '0 ; 3 ; 10'),
    [var('k', '2..9')],
    ['« Mettre a à b » efface l\'ancienne valeur de a : on la perd si on ne l\'a pas rangée.',
     'On utilise une troisième variable **c** : mettre c à a, puis a à b, puis b à c.',
     'Pour le nombre $3$ : a vaut $3$ et b vaut ${{k}} + 3$ au départ ; à la fin, a et b ont'
     ' échangé leurs valeurs.'])
DEUX_SUITE = variation(
    'On écrit une suite de nombres : le premier vaut $1$, le deuxième est le nombre choisi, et'
    ' chaque nombre suivant est la **somme des deux précédents**.\n\nAvec deux variables, écris'
    ' un programme qui affiche les ${{n}}$ nombres qui suivent les deux premiers.\n\n'
    + calcul('3e', D_SUITE, '1 ; 2 ; 5'),
    [var('n', '4..6')],
    ['Deux variables gardent les deux derniers nombres : **a** (l\'avant-dernier) et **b** (le'
     ' dernier). Au départ, a vaut $1$ et b le nombre choisi.',
     'À chaque tour : c prend la valeur a $+$ b, puis a prend l\'ancienne valeur de b, et b'
     ' prend c. On affiche b.',
     'Pour $1$, la suite est $1, 1, 2, 3, 5, 8, 13$… : le programme affiche $2, 3, 5, 8$…'])
DEUX_MAX = variation(
    'Écris un programme qui calcule les deux nombres nombre $\\times {{a}} - {{b}}$ et nombre'
    ' $+\\ {{c}}$, puis qui affiche **le plus grand** des deux.\n\n'
    + calcul('3e', D_MAX, '-3 ; 0 ; 5 ; 20'),
    [var('a', '2..4'), var('b', '1..9'), var('c', '1..9')],
    ['On range les deux calculs dans deux variables, **x** et **y**.',
     'On les compare : si x $>$ y, on affiche x ; sinon, on affiche y.',
     'Selon le nombre choisi, c\'est tantôt l\'un, tantôt l\'autre qui est le plus grand.'])

MODELES.append(modele(
    '06-plusieurs-variables-en-blocs', 'Plusieurs variables en blocs',
    'Écrire en blocs un programme à plusieurs variables : échange, suite, plus grand de deux.',
    '3', 2, [DEUX_ECHANGE, DEUX_SUITE, DEUX_MAX],
    [spec('Échange : référence', 0, {'k': 4}, remplir(D_ECHANGE, {'k': 4}), 'correct'),
     spec('Échange : par différence', 0, {'k': 4},
          'mettre a à nombre ; mettre b à nombre + 4 ; mettre a à a + b ; mettre b à a − b ;'
          ' mettre a à a − b ; afficher a ; afficher b', 'correct'),
     spec('Erreur : échange sans variable de plus', 0, {'k': 4},
          'mettre a à nombre ; mettre b à nombre + 4 ; mettre a à b ; mettre b à a ; afficher a ;'
          ' afficher b', 'incorrect'),
     spec('Suite : référence', 1, {'n': 4}, remplir(D_SUITE, {'n': 4}), 'correct'),
     spec('Suite : sans troisième variable', 1, {'n': 4},
          'mettre a à 1 ; mettre b à nombre ; répéter 4 [ mettre b à a + b ; mettre a à b − a ;'
          ' afficher b ]', 'correct'),
     spec('Erreur : a mis à jour trop tôt', 1, {'n': 4},
          'mettre a à 1 ; mettre b à nombre ; répéter 4 [ mettre a à b ; mettre b à a + b ;'
          ' afficher b ]', 'incorrect'),
     spec('Plus grand : référence', 2, {'a': 3, 'b': 5, 'c': 4},
          remplir(D_MAX, {'a': 3, 'b': 5, 'c': 4}), 'correct'),
     spec('Plus grand : comparaison directe', 2, {'a': 3, 'b': 5, 'c': 4},
          'si nombre × 3 − 5 < nombre + 4 alors [ afficher nombre + 4 ] sinon'
          ' [ afficher nombre × 3 − 5 ]', 'correct'),
     spec('Erreur : affiche le plus petit', 2, {'a': 3, 'b': 5, 'c': 4},
          'mettre x à nombre × 3 − 5 ; mettre y à nombre + 4 ; si x < y alors [ afficher x ]'
          ' sinon [ afficher y ]', 'incorrect')]))

# --- 07. 3-048 : conditions composées ----------------------------------------------------------

K_ENTRE = 'si nombre ≥ {{a}} et nombre ≤ {{b}} alors [ afficher 1 ] sinon [ afficher 0 ]'
K_MULTIPLE = ('si reste de nombre par 3 = 0 ou reste de nombre par 5 = 0 alors [ afficher nombre ]'
              ' sinon [ afficher 0 ]')
K_PAIR = ('si reste de nombre par 2 = 0 et nombre > {{a}} alors [ afficher 1 ]'
          ' sinon [ afficher 0 ]')
K_NI = ('si non (reste de nombre par 2 = 0 ou reste de nombre par 3 = 0) alors [ afficher 1 ]'
        ' sinon [ afficher 0 ]')

COMP_ENTRE = variation(
    'Écris un programme qui affiche $1$ si le nombre choisi est **entre ${{a}}$ et ${{b}}$**'
    ' (${{a}}$ et ${{b}}$ compris), et $0$ sinon.\n\n'
    + calcul('3e', K_ENTRE, '{{c}} ; {{a}} ; {{m}} ; {{b}} ; {{d}}'),
    [var('a', '2..10'), var('l', '5..10'), var('b', 'eval:a+l'), var('c', 'eval:a-1'),
     var('d', 'eval:b+1'), var('m', 'eval:a+2')],
    ['« Entre ${{a}}$ et ${{b}}$ » : le nombre doit être $\\geq {{a}}$ **et** $\\leq {{b}}$.',
     'Les deux conditions doivent être vraies en même temps : on les relie par le bloc **et**.',
     'Avec **ou**, tous les nombres conviendraient (chacun est $\\geq {{a}}$ ou $\\leq {{b}}$).'])
COMP_MULTIPLE = variation(
    'Écris un programme qui affiche le nombre choisi s\'il est un multiple de $3$ **ou** un'
    ' multiple de $5$, et $0$ sinon.\n\n'
    + calcul('3e', K_MULTIPLE, '1 ; 3 ; 5 ; 7 ; 9 ; 10 ; 14 ; 15'),
    [],
    ['Multiple de $3$ : reste de nombre par $3$ $= 0$. Multiple de $5$ : reste de nombre par'
     ' $5$ $= 0$.',
     'Il suffit que **l\'une** des deux conditions soit vraie : on les relie par **ou**.',
     '$15$ est multiple des deux : la condition « ou » est vraie aussi.'])
COMP_PAIR = variation(
    'Écris un programme qui affiche $1$ si le nombre choisi est **pair et** plus grand que'
    ' ${{a}}$, et $0$ sinon.\n\n'
    + calcul('3e', K_PAIR, '{{b}} ; {{a}} ; {{c}} ; {{d}} ; 1 ; 2'),
    [var('a', '6..14'), var('b', 'eval:a-2'), var('c', 'eval:a+1'), var('d', 'eval:a+2')],
    ['Pair : reste de nombre par $2$ $= 0$. Plus grand que ${{a}}$ : nombre $> {{a}}$.',
     'Les deux doivent être vraies : on les relie par **et**.',
     'Un nombre pair plus petit, ou un nombre impair plus grand, donne $0$.'])
COMP_NI = variation(
    'Écris un programme qui affiche $1$ si le nombre choisi n\'est **ni** un multiple de $2$,'
    ' **ni** un multiple de $3$, et $0$ sinon.\n\n'
    + calcul('3e', K_NI, '1 ; 2 ; 3 ; 5 ; 6 ; 7 ; 9 ; 25'),
    [],
    ['« Ni multiple de $2$, ni multiple de $3$ », c\'est le contraire de « multiple de $2$ **ou**'
     ' multiple de $3$ » : on utilise le bloc **non**.',
     'Autre écriture : reste par $2$ $\\neq 0$ **et** reste par $3$ $\\neq 0$.',
     'Exemples : $5$ et $7$ donnent $1$ ; $6$, $9$ et $2$ donnent $0$.'])

MODELES.append(modele(
    '07-conditions-composees-en-blocs', 'Conditions composées en blocs',
    'Écrire en blocs des conditions avec et, ou, non : intervalle, multiples, pair et grand.',
    '3', 2, [COMP_ENTRE, COMP_MULTIPLE, COMP_PAIR, COMP_NI],
    [spec('Entre : référence', 0, {'a': 4, 'l': 6, 'b': 10, 'c': 3, 'd': 11, 'm': 6},
          remplir(K_ENTRE, {'a': 4, 'b': 10}), 'correct'),
     spec('Entre : par non', 0, {'a': 4, 'l': 6, 'b': 10, 'c': 3, 'd': 11, 'm': 6},
          'si non (nombre < 4 ou nombre > 10) alors [ afficher 1 ] sinon [ afficher 0 ]',
          'correct'),
     spec('Erreur : ou au lieu de et', 0, {'a': 4, 'l': 6, 'b': 10, 'c': 3, 'd': 11, 'm': 6},
          'si nombre ≥ 4 ou nombre ≤ 10 alors [ afficher 1 ] sinon [ afficher 0 ]', 'incorrect'),
     spec('Erreur : bornes exclues', 0, {'a': 4, 'l': 6, 'b': 10, 'c': 3, 'd': 11, 'm': 6},
          'si nombre > 4 et nombre < 10 alors [ afficher 1 ] sinon [ afficher 0 ]', 'incorrect'),
     spec('Multiples : référence', 1, {}, K_MULTIPLE, 'correct'),
     spec('Multiples : deux « si » imbriqués', 1, {},
          'si reste de nombre par 3 = 0 alors [ afficher nombre ] sinon [ si reste de nombre'
          ' par 5 = 0 alors [ afficher nombre ] sinon [ afficher 0 ] ]', 'correct'),
     spec('Erreur : et au lieu de ou', 1, {},
          'si reste de nombre par 3 = 0 et reste de nombre par 5 = 0 alors [ afficher nombre ]'
          ' sinon [ afficher 0 ]', 'incorrect'),
     spec('Pair et grand : référence', 2, {'a': 10, 'b': 8, 'c': 11, 'd': 12},
          remplir(K_PAIR, {'a': 10}), 'correct'),
     spec('Erreur : ou au lieu de et', 2, {'a': 10, 'b': 8, 'c': 11, 'd': 12},
          'si reste de nombre par 2 = 0 ou nombre > 10 alors [ afficher 1 ] sinon [ afficher 0 ]',
          'incorrect'),
     spec('Ni … ni : référence', 3, {}, K_NI, 'correct'),
     spec('Ni … ni : deux ≠ reliés par et', 3, {},
          'si reste de nombre par 2 ≠ 0 et reste de nombre par 3 ≠ 0 alors [ afficher 1 ]'
          ' sinon [ afficher 0 ]', 'correct'),
     spec('Erreur : non porté sur la première condition seulement', 3, {},
          'si non (reste de nombre par 2 = 0) ou reste de nombre par 3 = 0 alors [ afficher 1 ]'
          ' sinon [ afficher 0 ]', 'incorrect')]))

# --- 08. 3-049 : boucle « répéter jusqu'à » ----------------------------------------------------

J_RESTE = 'mettre r à nombre ; répéter jusqu’à r < {{d}} [ mettre r à r − {{d}} ] ; afficher r'
J_DOUBLE = ('mettre x à nombre ; mettre compteur à 0 ; répéter jusqu’à x > {{s}}'
            ' [ mettre x à x × 2 ; ajouter 1 à compteur ] ; afficher compteur')
J_MULTIPLE = 'mettre m à 0 ; répéter jusqu’à m > nombre [ ajouter {{a}} à m ] ; afficher m'

JUSQUA_RESTE = variation(
    'Sans utiliser le bloc « reste », écris un programme qui affiche le reste de la division'
    ' du nombre choisi (un entier positif) par ${{d}}$ : on retire ${{d}}$ **jusqu\'à ce que**'
    ' ce soit impossible.\n\n'
    + calcul('3e', J_RESTE, '0 ; 3 ; 7 ; 20 ; 45 ; 100'),
    [var('d', '3..9')],
    ['Une variable **r** vaut d\'abord le nombre choisi.',
     'On répète « mettre r à r $-\\ {{d}}$ » **jusqu\'à ce que** r $< {{d}}$ : on ne peut plus'
     ' retirer ${{d}}$.',
     'Ce qui reste dans r est le reste de la division par ${{d}}$ ; on l\'affiche.'])
JUSQUA_DOUBLE = variation(
    'On double un nombre entier positif, puis on double le résultat, et ainsi de suite.\n\n'
    'Écris un programme qui affiche **combien de fois** il faut doubler le nombre choisi pour'
    ' dépasser ${{s}}$ (strictement).\n\n'
    + calcul('3e', J_DOUBLE, '1 ; 3 ; 7 ; 25 ; 60 ; 1000'),
    [var('k', '1..5'), var('s', 'eval:100*k')],
    ['Deux variables : **x**, le nombre que l\'on double, et **compteur**, qui vaut $0$ au'
     ' départ.',
     'On répète « x prend la valeur x $\\times 2$ ; ajouter $1$ à compteur » **jusqu\'à ce que**'
     ' x $> {{s}}$.',
     'Si le nombre choisi dépasse déjà ${{s}}$, la boucle ne tourne pas : le programme'
     ' affiche $0$.'])
JUSQUA_MULTIPLE = variation(
    'Écris un programme qui affiche le plus petit multiple de ${{a}}$ **strictement supérieur**'
    ' au nombre choisi (un entier positif). Pars de $0$ et ajoute ${{a}}$ autant de fois qu\'il'
    ' le faut.\n\n'
    + calcul('3e', J_MULTIPLE, '0 ; 1 ; {{a}} ; 12 ; 30'),
    [var('a', '3..9')],
    ['Une variable **m** vaut $0$ au départ : c\'est un multiple de ${{a}}$.',
     'On lui ajoute ${{a}}$ **jusqu\'à ce que** m $>$ nombre : m reste un multiple de ${{a}}$.',
     'Le premier m qui dépasse le nombre choisi est le plus petit : on l\'affiche.'])

MODELES.append(modele(
    '08-boucle-repeter-jusqua-en-blocs', 'Boucle « répéter jusqu\'à » en blocs',
    'Écrire en blocs une boucle conditionnelle : reste par soustractions, doublements, multiple.',
    '3', 2, [JUSQUA_RESTE, JUSQUA_DOUBLE, JUSQUA_MULTIPLE],
    [spec('Reste : référence', 0, {'d': 7}, remplir(J_RESTE, {'d': 7}), 'correct'),
     spec('Reste : avec le bloc reste (juste aussi)', 0, {'d': 7}, 'afficher reste de nombre'
          ' par 7', 'correct'),
     spec('Erreur : condition r ≤ 7 (retire une fois de trop)', 0, {'d': 7},
          'mettre r à nombre ; répéter jusqu’à r ≤ 7 [ mettre r à r − 7 ] ; afficher r',
          'incorrect'),
     spec('Doublements : référence', 1, {'k': 1, 's': 100}, remplir(J_DOUBLE, {'s': 100}),
          'correct'),
     spec('Erreur : jusqu\'à x ≥ 100', 1, {'k': 1, 's': 100},
          'mettre x à nombre ; mettre compteur à 0 ; répéter jusqu’à x ≥ 100 [ mettre x à x × 2 ;'
          ' ajouter 1 à compteur ] ; afficher compteur', 'incorrect'),
     spec('Erreur : affiche x au lieu du compteur', 1, {'k': 1, 's': 100},
          'mettre x à nombre ; mettre compteur à 0 ; répéter jusqu’à x > 100 [ mettre x à x × 2 ;'
          ' ajouter 1 à compteur ] ; afficher x', 'incorrect'),
     spec('Multiple : référence', 2, {'a': 4}, remplir(J_MULTIPLE, {'a': 4}), 'correct'),
     spec('Multiple : par le reste', 2, {'a': 4},
          'afficher nombre − reste de nombre par 4 + 4', 'correct'),
     spec('Erreur : supérieur ou égal', 2, {'a': 4},
          'mettre m à 0 ; répéter jusqu’à m ≥ nombre [ ajouter 4 à m ] ; afficher m',
          'incorrect')]))

# --- 09. 3-051 : écrire un programme pour résoudre un problème ---------------------------------

Q_CHIFFRES = ('mettre x à nombre ; mettre chiffres à 1 ; répéter jusqu’à x < 10'
              ' [ mettre x à (x − reste de x par 10) ÷ 10 ; ajouter 1 à chiffres ] ;'
              ' afficher chiffres')
Q_MOITIES = ('mettre x à nombre ; mettre fois à 0 ; répéter jusqu’à reste de x par 2 ≠ 0'
             ' [ mettre x à x ÷ 2 ; ajouter 1 à fois ] ; afficher fois')
Q_EPARGNE = ('mettre tirelire à {{d}} ; mettre mois à 0 ; répéter jusqu’à tirelire ≥ nombre'
             ' [ ajouter {{m}} à tirelire ; ajouter 1 à mois ] ; afficher mois')

PROB_CHIFFRES = variation(
    'Écris un programme qui affiche le **nombre de chiffres** du nombre choisi (un entier'
    ' positif) : pour $2026$, il affiche $4$.\n\n'
    + calcul('3e', Q_CHIFFRES, '0 ; 7 ; 10 ; 99 ; 100 ; 2026 ; 12345'),
    [],
    ['Retirer le dernier chiffre d\'un nombre, c\'est lui retirer son chiffre des unités (le'
     ' reste de sa division par $10$) puis diviser par $10$ : $2026 \\to 202$.',
     'On compte les chiffres dans une variable qui vaut $1$ au départ, et on retire un chiffre'
     ' **jusqu\'à ce qu\'**il n\'en reste qu\'un (x $< 10$).',
     'Pour $2026$ : $2026 \\to 202 \\to 20 \\to 2$, trois chiffres retirés, plus le dernier :'
     ' $4$.'])
PROB_MOITIES = variation(
    'Écris un programme qui affiche combien de fois on peut diviser le nombre choisi (un entier'
    ' positif non nul) par $2$ en obtenant à chaque fois un **nombre entier** : pour $12$, il'
    ' affiche $2$ ($12 \\to 6 \\to 3$).\n\n'
    + calcul('3e', Q_MOITIES, '1 ; 6 ; 7 ; 8 ; 12 ; 40 ; 96'),
    [],
    ['On peut diviser par $2$ en restant entier tant que le nombre est **pair**.',
     'On divise donc par $2$ **jusqu\'à ce que** le nombre soit impair (reste par $2$'
     ' $\\neq 0$), en comptant les divisions.',
     'Pour un nombre impair, la boucle ne tourne pas : le programme affiche $0$.'])
PROB_EPARGNE = variation(
    'Une tirelire contient ${{d}}$ € ; chaque mois, on y ajoute ${{m}}$ €.\n\nLe nombre choisi'
    ' est un montant en euros. Écris un programme qui affiche au bout de **combien de mois** la'
    ' tirelire contiendra au moins ce montant.\n\n'
    + calcul('3e', Q_EPARGNE, '5 ; {{d}} ; {{f}} ; 100 ; 250'),
    [var('d', '10..50'), var('m', '5..20'), var('f', 'eval:d+m')],
    ['Deux variables : **tirelire** (${{d}}$ € au départ) et **mois** ($0$ au départ).',
     'Chaque mois : ajouter ${{m}}$ à tirelire et $1$ à mois.',
     'On répète **jusqu\'à ce que** tirelire $\\geq$ nombre, puis on affiche mois.'])

MODELES.append(modele(
    '09-ecrire-un-programme-pour-un-probleme-3e',
    'Écrire un programme pour résoudre un problème (3e)',
    'Écrire en blocs un programme avec boucle conditionnelle : chiffres, moitiés, épargne.',
    '3', 3, [PROB_CHIFFRES, PROB_MOITIES, PROB_EPARGNE],
    [spec('Chiffres : référence', 0, {}, Q_CHIFFRES, 'correct'),
     spec('Chiffres : en divisant par 10 sans arrondir', 0, {},
          'mettre x à nombre ; mettre chiffres à 1 ; répéter jusqu’à x < 10 [ mettre x à x ÷ 10 ;'
          ' ajouter 1 à chiffres ] ; afficher chiffres', 'correct'),
     spec('Erreur : compteur à 0 au départ', 0, {},
          'mettre x à nombre ; mettre chiffres à 0 ; répéter jusqu’à x < 10 [ mettre x à x ÷ 10 ;'
          ' ajouter 1 à chiffres ] ; afficher chiffres', 'incorrect'),
     spec('Moitiés : référence', 1, {}, Q_MOITIES, 'correct'),
     spec('Moitiés : jusqu\'à reste = 1', 1, {},
          'mettre x à nombre ; mettre fois à 0 ; répéter jusqu’à reste de x par 2 = 1'
          ' [ mettre x à x ÷ 2 ; ajouter 1 à fois ] ; afficher fois', 'correct'),
     spec('Erreur : affiche x', 1, {},
          'mettre x à nombre ; mettre fois à 0 ; répéter jusqu’à reste de x par 2 ≠ 0'
          ' [ mettre x à x ÷ 2 ; ajouter 1 à fois ] ; afficher x', 'incorrect'),
     spec('Épargne : référence', 2, {'d': 20, 'm': 15, 'f': 35},
          remplir(Q_EPARGNE, {'d': 20, 'm': 15}), 'correct'),
     spec('Erreur : strictement plus que le montant', 2, {'d': 20, 'm': 15, 'f': 35},
          'mettre tirelire à 20 ; mettre mois à 0 ; répéter jusqu’à tirelire > nombre'
          ' [ ajouter 15 à tirelire ; ajouter 1 à mois ] ; afficher mois', 'incorrect'),
     spec('Erreur : tirelire vide au départ', 2, {'d': 20, 'm': 15, 'f': 35},
          'mettre tirelire à 0 ; mettre mois à 0 ; répéter jusqu’à tirelire ≥ nombre'
          ' [ ajouter 15 à tirelire ; ajouter 1 à mois ] ; afficher mois', 'incorrect')],
    delay=600))

os.makedirs(DOSSIER, exist_ok=True)
for nom, m in MODELES:
    chemin = os.path.join(DOSSIER, nom + '.json')
    with open(chemin, 'w', encoding='utf-8') as f:
        json.dump(m, f, ensure_ascii=False, indent=2)
        f.write('\n')
    print(chemin)
