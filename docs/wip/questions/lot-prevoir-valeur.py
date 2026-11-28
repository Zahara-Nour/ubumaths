"""Écrit les 3 modèles du lot « prévoir la valeur » dans scripts/questions/blockly-prevoir-valeur/.

Lot porté par le chantier `blockly` (journal docs/archive/wip/blockly-progress.md § Prévoir la valeur,
David le 2026-11-15 : « je te suis ») ; un point par modèle (ADR 0020) :

| #  | Point   | Titre                               | Niveau scolaire | Niveau |
| 01 | CM2-067 | Exécuter un programme de calcul     | CM2             | 1      |
| 02 | 5-104   | Prévoir la valeur d'une expression  | 5e              | 1      |
| 03 | 5-101   | Entrées et sorties d'un programme   | 5e              | 1      |

Le programme est montré dans l'énoncé par un bloc ```scratch (chantier `bloc-scratch`, #2122,
en prod) ou écrit en mots (BO CM2 : « jusqu'à trois instructions », exemple en liste) ; la
réponse est une case ordinaire (nombre) ou une case choix. Gabarit : le modèle de la 6e
« Exécuter un programme pour un nombre de départ » (lot-9-tableaux-programmes.py, 6-195).

Règles du lot :
- syntaxe des `scratchblocks` en FRANÇAIS ; la profondeur des parenthèses d'un bloc dit l'ordre
  des calculs (le bloc le plus intérieur d'abord) ;
- 5e : nombres négatifs seulement dans des additions et soustractions (le produit de relatifs
  est au programme de 4e) ; résultats entiers ;
- choix : la bonne réponse écrite en premier (indice 0), le bloc mélange ; le corrigé nomme la
  bonne réponse, jamais son rang ;
- variables : jamais `e` ni `i`.

    python3 docs/wip/questions/lot-prevoir-valeur.py scripts/questions/blockly-prevoir-valeur
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


def modele(nom, title, description, grade, level, variations, specs, delay=90):
    # Ni theme, ni domain, ni subdomain (ADR 0035) ; nœud et tag posés par la migration.
    return nom, {'title': title, 'description': description, 'grades': [grade], 'level': level,
                 'delay': delay, 'status': 'draft', 'variations': variations, 'testSpecs': specs}


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


def ev(x):
    return '{{eval:' + x + '}}'


def scratch(lignes):
    return '\n\n```scratch\n' + '\n'.join(lignes) + '\n```'


def choix(options):
    return '\n\n````choix\n' + ''.join('- ' + o + '\n' for o in options) + '````'


DRAPEAU = 'quand le drapeau vert pressé'
MODELES = []

# --- 01. CM2-067 : exécuter un programme de calcul --------------------------------------------

V_TROIS = variation(
    'Voici un programme de calcul :\n\n- choisir un nombre entier ;\n- ajouter ${{a}}$ au nombre'
    ' choisi ;\n- multiplier le résultat trouvé à l\'étape précédente par ${{b}}$ ;\n- retirer'
    ' ${{c}}$ au nombre obtenu à l\'étape précédente ;\n- écrire le nombre obtenu.\n\nOn choisit'
    ' le nombre ${{n}}$. Quel nombre le programme écrit-il ?\n\n$?$',
    [var('n', '2..10'), var('a', '1..9'), var('b', '2..5'), var('c', '1..9')],
    [ev('(n+a)*b-c')],
    ['**Dans l\'ordre.** Chaque étape s\'applique au résultat de la précédente.',
     '${{n}} + {{a}} = ' + ev('n+a') + '$',
     '$' + ev('n+a') + ' \\times {{b}} = ' + ev('(n+a)*b') + '$',
     '$' + ev('(n+a)*b') + ' - {{c}} = ' + col(ev('(n+a)*b-c')) + '$ : le programme écrit $'
     + col(ev('(n+a)*b-c')) + '$.'])

V_DEUX = variation(
    'Voici un programme de calcul :\n\n- choisir un nombre ;\n- le multiplier par ${{a}}$ ;\n-'
    ' ajouter ${{b}}$ au résultat ;\n- écrire le nombre obtenu.\n\nOn choisit le nombre ${{n}}$.'
    ' Quel nombre le programme écrit-il ?\n\n$?$',
    [var('n', '2..12'), var('a', '2..9'), var('b', '1..20')], [ev('a*n+b')],
    ['**Dans l\'ordre.** On multiplie d\'abord, puis on ajoute.',
     '${{n}} \\times {{a}} = ' + ev('a*n') + '$',
     '$' + ev('a*n') + ' + {{b}} = ' + col(ev('a*n+b')) + '$ : le programme écrit $'
     + col(ev('a*n+b')) + '$.'])

V_SCRATCH = variation(
    'Voici un programme de calcul écrit avec Scratch.' + scratch([
        DRAPEAU, 'demander [Choisis un nombre.] et attendre',
        'mettre [nombre v] à ((réponse) * ({{a}}))', 'mettre [nombre v] à ((nombre) - ({{b}}))',
        'dire (nombre)'])
    + '\n\nOn tape ${{n}}$. Quel nombre le lutin dit-il ?\n\n$?$',
    [var('n', '2..10'), var('a', '2..5'), var('b', '1..9')], [ev('a*n-b')],
    ['**Une instruction après l\'autre.** La variable « nombre » garde le dernier résultat.',
     'On tape ${{n}}$ : « nombre » prend la valeur ${{n}} \\times {{a}} = ' + ev('a*n') + '$.',
     'Puis « nombre » prend la valeur $' + ev('a*n') + ' - {{b}} = ' + col(ev('a*n-b'))
     + '$ : le lutin dit $' + col(ev('a*n-b')) + '$.'],
    ['a*n>b'])

MODELES.append(modele(
    '01-executer-un-programme-de-calcul', 'Exécuter un programme de calcul',
    'Appliquer à un nombre entier un programme de calcul de deux ou trois instructions, écrit en'
    ' mots ou avec Scratch.', 'CM2', 1,
    [V_TROIS, V_DEUX, V_SCRATCH],
    [spec('(4 + 3) × 2 − 5 = 9', 0, {'n': 4, 'a': 3, 'b': 2, 'c': 5}, '9', 'correct'),
     spec('Erreur : 4 + 3 × 2 − 5 = 5 (ordre des étapes)', 0, {'n': 4, 'a': 3, 'b': 2, 'c': 5},
          '5', 'incorrect'),
     spec('Erreur : dernière étape oubliée (14)', 0, {'n': 4, 'a': 3, 'b': 2, 'c': 5}, '14',
          'incorrect'),
     spec('7 × 3 + 8 = 29', 1, {'n': 7, 'a': 3, 'b': 8}, '29', 'correct'),
     spec('Erreur : (7 + 8) × 3 = 45 (ordre inversé)', 1, {'n': 7, 'a': 3, 'b': 8}, '45',
          'incorrect'),
     spec('6 × 4 − 5 = 19', 2, {'n': 6, 'a': 4, 'b': 5}, '19', 'correct'),
     spec('Erreur : 6 − 5 = 1 (multiplication oubliée)', 2, {'n': 6, 'a': 4, 'b': 5}, '1',
          'incorrect'),
     spec('Erreur : soustraction oubliée (24)', 2, {'n': 6, 'a': 4, 'b': 5}, '24',
          'incorrect')]))

# --- 02. 5-104 : prévoir la valeur d'une expression -------------------------------------------

INTERIEUR = ('**Le bloc le plus intérieur se calcule en premier** : un bloc vert ne donne sa'
             ' valeur qu\'une fois connues celles des blocs posés dedans.')
PREVOIR = '\n\nSans lancer le programme, prévois le nombre que dit le lutin.\n\n$?$'

V_PAREN = variation(
    'Voici un programme.' + scratch([DRAPEAU, 'mettre [x v] à ({{n}})',
                                     'dire (((x) + ({{a}})) * ({{b}}))']) + PREVOIR,
    [var('n', '2..12'), var('a', '1..9'), var('b', '2..6')], [ev('(n+a)*b')],
    [INTERIEUR,
     'Le bloc intérieur : $x + {{a}} = {{n}} + {{a}} = ' + ev('n+a') + '$.',
     'Puis le bloc extérieur : $' + ev('n+a') + ' \\times {{b}} = ' + col(ev('(n+a)*b'))
     + '$ : le lutin dit $' + col(ev('(n+a)*b')) + '$.',
     'Écrite en une ligne, l\'expression est $(x + {{a}}) \\times {{b}}$ : les parenthèses'
     ' viennent du bloc posé dedans.'])

V_REUTILISE = variation(
    'Voici un programme.' + scratch([DRAPEAU, 'mettre [x v] à ({{n}})',
                                     'dire ((x) + ((x) * ({{a}})))']) + PREVOIR,
    [var('n', '2..12'), var('a', '2..9')], [ev('n+n*a')],
    [INTERIEUR,
     'Le bloc intérieur : $x \\times {{a}} = {{n}} \\times {{a}} = ' + ev('n*a') + '$.',
     'Puis le bloc extérieur : $x + ' + ev('n*a') + ' = {{n}} + ' + ev('n*a') + ' = '
     + col(ev('n+n*a')) + '$ : le lutin dit $' + col(ev('n+n*a')) + '$.',
     'Écrite en une ligne, l\'expression est $x + x \\times {{a}}$ : la multiplication passe'
     ' avant l\'addition, comme en calcul.'])

V_RELATIFS = variation(
    'Voici un programme.' + scratch([DRAPEAU, 'mettre [x v] à ({{n}})',
                                     'dire (((x) - ({{a}})) + ({{b}}))']) + PREVOIR,
    [var('n', '2..9'), var('da', '1..8'), var('a', 'eval:n+da'), var('b', '1..12')],
    [ev('n-a+b')],
    [INTERIEUR,
     'Le bloc intérieur : $x - {{a}} = {{n}} - {{a}} = ' + ev('n-a') + '$ (on retire plus que'
     ' $x$ : le résultat est négatif).',
     'Puis le bloc extérieur : $' + ev('n-a') + ' + {{b}} = ' + col(ev('n-a+b'))
     + '$ : le lutin dit $' + col(ev('n-a+b')) + '$.'],
    ['b!=da'])

MODELES.append(modele(
    '02-prevoir-la-valeur-d-une-expression', 'Prévoir la valeur d\'une expression',
    'Prévoir, sans l\'exécuter, la valeur d\'une expression en blocs Scratch imbriqués :'
    ' parenthèses données par l\'imbrication, variable réutilisée, résultat intermédiaire'
    ' négatif.', '5', 1,
    [V_PAREN, V_REUTILISE, V_RELATIFS],
    [spec('(5 + 3) × 4 = 32', 0, {'n': 5, 'a': 3, 'b': 4}, '32', 'correct'),
     spec('Erreur : 5 + 3 × 4 = 17 (imbrication ignorée)', 0, {'n': 5, 'a': 3, 'b': 4}, '17',
          'incorrect'),
     spec('6 + 6 × 3 = 24', 1, {'n': 6, 'a': 3}, '24', 'correct'),
     spec('Erreur : (6 + 6) × 3 = 36', 1, {'n': 6, 'a': 3}, '36', 'incorrect'),
     spec('Erreur : 6 × 3 = 18 (x oublié)', 1, {'n': 6, 'a': 3}, '18', 'incorrect'),
     spec('4 − 9 + 2 = −3', 2, {'n': 4, 'da': 5, 'a': 9, 'b': 2}, '-3', 'correct'),
     spec('Erreur : signe perdu (3)', 2, {'n': 4, 'da': 5, 'a': 9, 'b': 2}, '3', 'incorrect'),
     spec('Erreur : 9 − 4 + 2 = 7 (soustraction à l\'envers)', 2,
          {'n': 4, 'da': 5, 'a': 9, 'b': 2}, '7', 'incorrect'),
     spec('3 − 5 + 8 = 6', 2, {'n': 3, 'da': 2, 'a': 5, 'b': 8}, '6', 'correct')]))

# --- 03. 5-101 : entrées et sorties d'un programme --------------------------------------------

PROG_UNE = scratch([DRAPEAU, 'demander [Choisis un nombre.] et attendre',
                    'mettre [résultat v] à ((réponse) * ({{a}}))',
                    'mettre [résultat v] à ((résultat) + ({{b}}))', 'dire (résultat)'])
ENTREE_SORTIE = ('Une **entrée** est une donnée que le programme reçoit pendant qu\'il tourne'
                 ' (ici, ce qu\'on tape au clavier) ; une **sortie** est ce qu\'il communique à'
                 ' la fin (ici, ce que dit le lutin).')

V_ENTREE = variation(
    'Voici un programme.' + PROG_UNE + '\n\nQuelle est l\'**entrée** de ce programme ?'
    + choix(['le nombre tapé au clavier, en réponse à la question',
             'le nombre que dit le lutin à la fin',
             'le nombre ${{a}}$, écrit dans le programme']),
    [var('a', '2..9'), var('b', '1..9')], ['0'],
    [ENTREE_SORTIE,
     'Le bloc « demander » attend que l\'utilisateur tape un nombre : c\'est l\'entrée.',
     'Le nombre ${{a}}$ est écrit dans le programme : il est le même à chaque exécution, ce n\'est'
     ' pas une entrée.',
     'L\'entrée est **le nombre tapé au clavier**.'])

V_SORTIE = variation(
    'Voici un programme.' + PROG_UNE + '\n\nQuelle est la **sortie** de ce programme ?'
    + choix(['le nombre que dit le lutin à la fin',
             'le nombre tapé au clavier, en réponse à la question',
             'le nombre ${{b}}$, écrit dans le programme']),
    [var('a', '2..9'), var('b', '1..9')], ['0'],
    [ENTREE_SORTIE,
     'Le bloc « dire » montre le contenu de la variable « résultat » : c\'est la sortie.',
     'La sortie est **le nombre que dit le lutin**.'])

V_DEUX_SORTIES = variation(
    'Voici un programme qui travaille sur un rectangle.' + scratch([
        DRAPEAU, 'demander [Longueur ?] et attendre', 'mettre [longueur v] à (réponse)',
        'demander [Largeur ?] et attendre', 'mettre [largeur v] à (réponse)',
        'dire ((2) * ((longueur) + (largeur))) pendant (2) secondes',
        'dire ((longueur) * (largeur))'])
    + '\n\nCe programme a deux entrées et deux sorties. On tape ${{p}}$, puis ${{q}}$.'
    ' Quelles sont ses deux sorties, dans l\'ordre ?\n\nPremière sortie : $?$\n\nSeconde sortie'
    ' : $?$',
    [var('p', '3..12'), var('q', '2..9')], [ev('2*(p+q)'), ev('p*q')],
    ['Les deux **entrées** sont les nombres tapés : *longueur* $= {{p}}$ et *largeur*'
     ' $= {{q}}$.',
     'Première sortie : $2 \\times ({{p}} + {{q}}) = ' + col(ev('2*(p+q)')) + '$ (le'
     ' périmètre).',
     'Seconde sortie : ${{p}} \\times {{q}} = ' + col(ev('p*q'), 1) + '$ (l\'aire).'],
    ['p>q'])

MODELES.append(modele(
    '03-entrees-et-sorties-d-un-programme', 'Entrées et sorties d\'un programme',
    'Reconnaître l\'entrée et la sortie d\'un programme Scratch, et calculer les sorties d\'un'
    ' programme à deux entrées.', '5', 1,
    [V_ENTREE, V_SORTIE, V_DEUX_SORTIES],
    [spec('Entrée : le nombre tapé', 0, {'a': 3, 'b': 4}, '0', 'correct'),
     spec('Erreur : la sortie prise pour l\'entrée', 0, {'a': 3, 'b': 4}, '1', 'incorrect'),
     spec('Erreur : la constante prise pour l\'entrée', 0, {'a': 3, 'b': 4}, '2', 'incorrect'),
     spec('Sortie : le nombre dit', 1, {'a': 3, 'b': 4}, '0', 'correct'),
     spec('Erreur : l\'entrée prise pour la sortie', 1, {'a': 3, 'b': 4}, '1', 'incorrect'),
     spec('7 et 4 : 22 puis 28', 2, {'p': 7, 'q': 4}, ['22', '28'], 'correct'),
     spec('Erreur : sorties inversées', 2, {'p': 7, 'q': 4}, ['28', '22'], 'incorrect'),
     spec('Erreur : demi-périmètre (11)', 2, {'p': 7, 'q': 4}, ['11', '28'], 'incorrect')]))

os.makedirs(DOSSIER, exist_ok=True)
for nom, m in MODELES:
    chemin = os.path.join(DOSSIER, nom + '.json')
    with open(chemin, 'w', encoding='utf-8') as f:
        json.dump(m, f, ensure_ascii=False, indent=2)
        f.write('\n')
    print(chemin)
