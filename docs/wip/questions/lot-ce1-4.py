"""Écrit les 10 modèles du lot 4 du CE1 (problèmes) dans scripts/questions/ce1-4/.

Phase 0 validée par David le 2026-10-29 (§ 10 du journal `docs/wip/questions-ce1-progress.md`).
Bornes `cycle2.json`, CE1-036 à 040 : données entières ≤ 1 000 ; prix à virgule admis, en euros
seulement (décision c2-1). Exemples du BO (p.17-19) : coffres de 227 billes ; 56 images
distribuées, il en reste 217 ; album de 350 photos ; 1,20 € + 90 centimes + 12 € ; Léo 188, Lucie
75 de plus ; 111 garçons, 257 filles ; Elsa 15,30 €, 6 € de plus que Noé ; 83 + 18 − 27 ; 1,15 € +
95 centimes sur 5 € ; 8 paquets de 7 ; 10 paquets de 25 ; 60 élèves en équipes de 5 ; 189 photos à
10 par page ; 75 œufs par 6 ; 18 images pour 3 ; 200 élèves en 40 équipes ; 9,60 € pour 3 ; 7 L à
2 € sur 20 € ; 20 cahiers à 4 € et 20 protège-cahiers à 2 €. Décisions :

1. Rangement sur les sous-notions existantes de « Problèmes arithmétiques » (posé par la
   migration) ; catégories `Entiers · Problèmes`, niveaux libres après ceux du CP.
2. Lucie (3/10 en bleu, le reste en rouge, CE1-099) : modèle à part, Fractions · Calculer ·
   Addition et Soustraction · 17.
3. « Est-ce que ça tient ? » : case choix oui / non.
4. Partages avec reste : arrondi au-dessus (pages) et en dessous (boîtes pleines).
5. Prix : en centimes dans les variables, écrits à deux décimales (`euros()`) ; `zeros: off`
   (3,20 € et 3,2 € justes tous deux). Euros et centimes additionnés à part (méthode du CE1) : les
   données restent ≤ 1 000.
6. Toutes les quantités valent au moins 2 (aucun « 1 photos ») ; jamais de variable `e` ni `i`.

    python3 docs/wip/questions/lot-ce1-4.py scripts/questions/ce1-4
"""
import json
import sys

DOSSIER = sys.argv[1]
SANS_ZEROS = {'constraints': {'zeros': 'off'}}

# ---- Gabarits ----


def spec(desc, vi, variables, answers, status, violations=None):
    s = {'description': desc, 'variationIndex': vi,
         'variables': {k: str(x) for k, x in variables.items()},
         'answers': answers if isinstance(answers, list) else [answers],
         'expected': {'status': status}}
    if violations:
        s['expected']['constraintViolations'] = violations
    return s


def modele(title, description, subdomain, level, variations, specs, delay=90, options=None,
           theme='Entiers', domain='Problèmes'):
    # theme / domain / subdomain : anciennes colonnes, remplies pour create-questions ; le
    # rangement (sous-notion du point) est posé par la migration
    m = {'title': title, 'description': description, 'grades': ['CE1'], 'theme': theme,
         'domain': domain, 'subdomain': subdomain, 'level': level, 'delay': delay,
         'status': 'draft'}
    if options:
        m['options'] = options
    m['variations'] = variations
    m['testSpecs'] = specs
    return m


def var(nom, expression):
    return {'name': nom, 'expression': expression}


def probleme(texte, question, reponse, variables, conditions, etapes, conclusion):
    """Un énoncé à une case. `reponse` est l'attendu tel quel (`{{eval:…}}`, `{{r}}`)."""
    v = {'statement': texte + '\n\n' + question, 'variables': variables}
    if conditions:
        v['conditions'] = conditions
    v['blanks'] = [{'expectedAnswer': reponse}]
    v['correction'] = {'steps': etapes + [conclusion]}
    return v


def choix(lignes, melanger=True):
    tete = '' if melanger else 'melanger: non\n'
    return '\n\n```choix\n' + tete + ''.join('- ' + c + '\n' for c in lignes) + '```'


def v(x):
    return '${{' + x + '}}$'


def ev(x):
    return '{{eval:' + x + '}}'


def col(x, k=0):
    return '\\textcolor{{{color:primary.' + str(k) + '}}}{' + x + '}'


def euros(c):
    """Prix de `c` centimes, toujours à deux décimales (« 7.50 », « 1.05 »)."""
    return ('{{eval:floor((' + c + ')/100)}}.{{eval:floor(mod(' + c + ',100)/10)}}{{eval:mod('
            + c + ',10)}}')


def prix(c):
    """Prix de `c` centimes en formule : $7.50~\\unit{€}$."""
    return '$' + euros(c) + '~\\unit{€}$'


def en_euros(c):
    """Attendu d'une case en euros : `c` centimes, écriture décimale."""
    return '{{eval:(' + c + ')/100;d}}'


EURO = '~\\text{€}'  # juste après une case : case de nombre

# ---- 1. Parties-tout, entiers (CE1-036) ----
# Ajout et retrait sont traités comme parties-tout (BO) ; données et réponse ≤ 1 000.

PARTIE = probleme(
    'Dans mes deux coffres, j\'ai ' + v('t') + ' billes. J\'en ai ' + v('a')
    + ' dans mon coffre vert.',
    'Combien en ai-je dans mon coffre rouge ?\n\nIl y a $?$ billes dans le coffre rouge.',
    ev('t-a'), [var('t', '150..999'), var('a', '30..900')], ['t - a >= 30'],
    ['Les deux coffres ensemble, c\'est **le tout** : ' + v('t') + ' billes. On connaît une'
     ' partie, le coffre vert ; on cherche l\'autre partie : on enlève.',
     '$${{t}} - {{a}} = ' + col(ev('t-a')) + '$$'],
    'Il y a $' + ev('t-a') + '$ billes dans le coffre rouge.')

TOUT_DEUX = probleme(
    'À la bibliothèque, il y a ' + v('a') + ' romans et ' + v('b') + ' bandes dessinées.',
    'Combien y a-t-il de livres en tout ?\n\nIl y a $?$ livres.',
    ev('a+b'), [var('a', '100..700'), var('b', '100..700')], ['a + b <= 1000'],
    ['Les romans et les bandes dessinées sont les deux parties ; on cherche **le tout** : on'
     ' ajoute.', '$${{a}} + {{b}} = ' + col(ev('a+b')) + '$$'],
    'Il y a $' + ev('a+b') + '$ livres à la bibliothèque.')

TOUT_TROIS = probleme(
    'Trois écoles vont au spectacle. Il y a ' + v('a') + ' élèves dans la première, ' + v('b')
    + ' dans la deuxième et ' + v('c') + ' dans la troisième.',
    'Combien d\'élèves vont au spectacle ?\n\n$?$ élèves vont au spectacle.',
    ev('a+b+c'), [var('a', '50..400'), var('b', '50..400'), var('c', '50..400')],
    ['a + b + c <= 1000'],
    ['Les trois écoles sont les parties ; on cherche **le tout** : on ajoute les trois'
     ' parties.', '$${{a}} + {{b}} + {{c}} = ' + col(ev('a+b+c')) + '$$'],
    '$' + ev('a+b+c') + '$ élèves vont au spectacle.')

# BO : « il m'en reste » alors qu'il faut additionner
DEPART_INCONNU = probleme(
    'Dans ma boîte, il y avait des images. J\'en ai distribué ' + v('a') + ' et il m\'en reste'
    ' encore ' + v('b') + '.',
    'Combien y avait-il d\'images dans ma boîte avant que j\'en distribue ?\n\nIl y avait $?$'
    ' images.',
    ev('a+b'), [var('a', '20..400'), var('b', '20..600')], ['a + b <= 1000'],
    ['Les images du début, c\'est **le tout** : les images distribuées et les images qui'
     ' restent. On cherche le tout : on ajoute les deux parties.',
     '$${{a}} + {{b}} = ' + col(ev('a+b')) + '$$'],
    'Il y avait $' + ev('a+b') + '$ images dans ma boîte.')

RETRAIT = probleme(
    'Un fermier a ' + v('t') + ' œufs. Il en vend ' + v('a') + ' au marché.',
    'Combien d\'œufs lui reste-t-il ?\n\nIl lui reste $?$ œufs.',
    ev('t-a'), [var('t', '200..999'), var('a', '30..900')], ['t - a >= 30'],
    ['Les ' + v('t') + ' œufs du début, c\'est **le tout** : les œufs vendus et les œufs qui'
     ' restent. On cherche une partie : on enlève.',
     '$${{t}} - {{a}} = ' + col(ev('t-a')) + '$$'],
    'Il reste $' + ev('t-a') + '$ œufs au fermier.')

# BO : « de plus » alors qu'il faut soustraire
COMBIEN_DE_PLUS = probleme(
    'Léo a ' + v('a') + ' timbres. Il voudrait en avoir ' + v('t') + '.',
    'Combien de timbres lui faut-il **de plus** ?\n\nIl lui faut $?$ timbres de plus.',
    ev('t-a'), [var('t', '150..999'), var('a', '30..900')], ['t - a >= 30'],
    ['Les ' + v('t') + ' timbres que Léo voudrait, c\'est **le tout** : les timbres qu\'il a et'
     ' ceux qui lui manquent. On cherche une partie : ce qu\'il faut ajouter à ' + v('a')
     + ' pour arriver à ' + v('t') + '.',
     '$${{a}} + ' + ev('t-a') + ' = {{t}}$$', 'C\'est une soustraction, même si l\'énoncé dit'
     ' « de plus » :', '$${{t}} - {{a}} = ' + col(ev('t-a')) + '$$'],
    'Il faut $' + ev('t-a') + '$ timbres de plus à Léo.')

SPECS_PARTIES_TOUT = [
    spec('BO : 227 billes, 113 dans le vert → 114', 0, {'t': 227, 'a': 113}, '114', 'correct'),
    spec('Erreur : coffres, les deux ajoutés (340)', 0, {'t': 227, 'a': 113}, '340',
         'incorrect'),
    spec('tout : 345 + 278 = 623', 1, {'a': 345, 'b': 278}, '623', 'correct'),
    spec('Erreur : tout, retenue oubliée (513)', 1, {'a': 345, 'b': 278}, '513', 'incorrect'),
    spec('trois parties : 125 + 240 + 318 = 683', 2, {'a': 125, 'b': 240, 'c': 318}, '683',
         'correct'),
    spec('Erreur : trois parties, la troisième oubliée (365)', 2,
         {'a': 125, 'b': 240, 'c': 318}, '365', 'incorrect'),
    spec('BO : 56 distribuées, 217 restent → 273', 3, {'a': 56, 'b': 217}, '273', 'correct'),
    spec('Erreur : départ inconnu, « reste » lu soustraction (161)', 3, {'a': 56, 'b': 217},
         '161', 'incorrect'),
    spec('retrait : 532 − 145 = 387', 4, {'t': 532, 'a': 145}, '387', 'correct'),
    spec('Erreur : retrait, les deux ajoutés (677)', 4, {'t': 532, 'a': 145}, '677',
         'incorrect'),
    spec('« de plus » : 250 − 184 = 66', 5, {'t': 250, 'a': 184}, '66', 'correct'),
    spec('Erreur : « de plus » lu addition (434)', 5, {'t': 250, 'a': 184}, '434', 'incorrect'),
    spec('borne : 700 + 300 = 1 000', 1, {'a': 700, 'b': 300}, '1000', 'correct'),
    spec('Zéro inutile', 0, {'t': 227, 'a': 113}, '0114', 'unoptimal_form', ['zeros']),
]

# ---- 2. Parties-tout, prix (CE1-036) ----
# Pain à 1,pc € (pc de 5 à 95, de 5 en 5), croissant à c centimes (50 à 95), gâteau à g € : on
# ajoute les euros, puis les centimes (retenue quand ils dépassent 100).

CENTIMES = ('Les centimes : ${{pc}} + {{c}} = ' + ev('pc+c') + '$ centimes{{if:pc+c>=100|, c\'est'
            ' $1~\\unit{€}$ et $' + ev('pc+c-100') + '$ centimes|}}.')

TROIS_ACHATS = probleme(
    'Lucie a acheté un pain à ' + prix('100+pc') + ', un croissant à ${{c}}$ centimes et un'
    ' gâteau à ${{g}}~\\unit{€}$.',
    'Combien Lucie a-t-elle dépensé ?\n\nElle a dépensé $?' + EURO + '$.',
    en_euros('100+pc+c+100*g'),
    [var('k', '1..19'), var('pc', 'eval:5*k'), var('m', '10..19'), var('c', 'eval:5*m'),
     var('g', '2..20')],
    ['pc + c != 100'],
    ['On cherche **le tout** : on ajoute les trois prix. On ajoute les euros, puis les'
     ' centimes ($1~\\unit{€} = 100$ centimes).',
     'Les euros : $1 + {{g}} = ' + ev('1+g') + '$ euros.', CENTIMES,
     '$$' + col(euros('100+pc+c+100*g') + '~\\unit{€}') + '$$'],
    'Lucie a dépensé ' + prix('100+pc+c+100*g') + '.')

# Le livre coûte un nombre entier d'euros : les centimes du total sont ceux du stylo
PRIX_MANQUANT = probleme(
    'Noé a payé ' + prix('100*l+100*s+10*k') + ' pour un livre et un stylo. Le livre coûte'
    ' ${{l}}~\\unit{€}$.',
    'Combien coûte le stylo ?\n\nLe stylo coûte $?' + EURO + '$.',
    en_euros('100*s+10*k'), [var('l', '5..15'), var('s', '2..4'), var('k', '1..9')], [],
    ['Le livre et le stylo, c\'est **le tout** : ' + prix('100*l+100*s+10*k') + '. On cherche'
     ' une partie, le prix du stylo : on enlève le prix du livre.',
     'Le livre coûte un nombre entier d\'euros : les centimes ne changent pas. Les euros :'
     ' $' + ev('l+s') + ' - {{l}} = {{s}}$.',
     '$$' + col(euros('100*s+10*k') + '~\\unit{€}') + '$$'],
    'Le stylo coûte ' + prix('100*s+10*k') + '.')

ACHATS_ENTIERS = probleme(
    'Un vélo coûte ${{a}}~\\unit{€}$ et un casque coûte ${{b}}~\\unit{€}$.',
    'Combien faut-il payer pour le vélo et le casque ?\n\nIl faut payer $?' + EURO + '$.',
    ev('a+b'), [var('a', '100..800'), var('b', '20..200')], ['a + b <= 1000'],
    ['On cherche **le tout** : on ajoute les deux prix.',
     '$${{a}} + {{b}} = ' + col(ev('a+b')) + '$$'],
    'Il faut payer $' + ev('a+b') + '~\\unit{€}$.')

SPECS_PRIX = [
    spec('BO : 1,20 € + 90 centimes + 12 € = 14,10 €', 0,
         {'k': 4, 'pc': 20, 'm': 18, 'c': 90, 'g': 12}, '14{,}1', 'correct'),
    spec('BO : 14,10 € avec le zéro', 0, {'k': 4, 'pc': 20, 'm': 18, 'c': 90, 'g': 12},
         '14{,}10', 'correct'),
    spec('Erreur : centimes sans retenue (13,10 €)', 0,
         {'k': 4, 'pc': 20, 'm': 18, 'c': 90, 'g': 12}, '13{,}1', 'incorrect'),
    spec('Erreur : croissant oublié (13,20 €)', 0, {'k': 4, 'pc': 20, 'm': 18, 'c': 90, 'g': 12},
         '13{,}2', 'incorrect'),
    spec('sans retenue : 1,15 + 0,50 + 5 = 6,65 €', 0,
         {'k': 3, 'pc': 15, 'm': 10, 'c': 50, 'g': 5}, '6{,}65', 'correct'),
    spec('prix manquant : 11,40 − 8 = 3,40 €', 1, {'l': 8, 's': 3, 'k': 4}, '3{,}4', 'correct'),
    spec('Erreur : prix manquant, les deux ajoutés (19,40 €)', 1, {'l': 8, 's': 3, 'k': 4},
         '19{,}4', 'incorrect'),
    spec('entiers : 459 + 85 = 544 €', 2, {'a': 459, 'b': 85}, '544', 'correct'),
    spec('Erreur : entiers, la différence (374)', 2, {'a': 459, 'b': 85}, '374', 'incorrect'),
]

# ---- 3. Est-ce que ça tient ? (CE1-036) ----
# Oui = indice 0, Non = indice 1 : r = 0 si a + b < C, 1 sinon (jamais égal, écart de 2 à 50).

OUI_NON = choix(['Oui', 'Non'], melanger=False)


def tient(texte, question, variables, conditions, tout, capacite, places, tiennent):
    return probleme(
        texte, question + OUI_NON, '{{r}}',
        variables + [var('r', 'eval:(sign(a+b-C)+1)/2')],
        ['a + b != C', 'abs(a + b - C) >= 2'] + conditions,
        ['On cherche d\'abord **le tout** : ' + tout + '.',
         '$${{a}} + {{b}} = ' + ev('a+b') + '$$',
         '{{if:r==0|$' + ev('a+b') + '$ est plus petit que ${{C}}$ : ' + tiennent + ', il'
         ' reste $' + ev('C-a-b') + '$ ' + places + '.|$' + ev('a+b') + '$ est plus grand que'
         ' ${{C}}$ : il manque $' + ev('a+b-C') + '$ ' + places + '.}}'],
        '{{if:r==0|**Oui**, ' + capacite + '.|**Non**, ' + capacite.replace('peut', 'ne peut pas')
        + '.}}')


ALBUM = tient(
    'Un album peut contenir ' + v('C') + ' photos. Lucie a ' + v('a') + ' photos et Léo en a '
    + v('b') + '.',
    'L\'album peut-il contenir toutes les photos de Lucie et de Léo ?',
    [var('C', '200|250|300|350|400|500'), var('a', '100..450'), var('b', '20..200')],
    ['abs(a + b - C) <= 50'], 'toutes les photos de Lucie et de Léo',
    'l\'album peut contenir toutes les photos', 'places', 'toutes les photos tiennent')

CAR = tient(
    'Un car a ' + v('C') + ' places. ' + v('a') + ' élèves et ' + v('b') + ' adultes partent en'
    ' sortie.',
    'Tout le monde peut-il s\'asseoir dans le car ?',
    [var('C', '40..90'), var('a', '20..80'), var('b', '2..15')], ['abs(a + b - C) <= 10'],
    'tous les élèves et tous les adultes', 'tout le monde peut s\'asseoir', 'places',
    'tout le monde a une place')

SPECS_TIENT = [
    spec('BO : 287 + 72 = 359 > 350, non', 0, {'C': 350, 'a': 287, 'b': 72, 'r': 1}, '1',
         'correct'),
    spec('Erreur : BO, oui', 0, {'C': 350, 'a': 287, 'b': 72, 'r': 1}, '0', 'incorrect'),
    spec('album : 215 + 120 = 335 < 350, oui', 0, {'C': 350, 'a': 215, 'b': 120, 'r': 0}, '0',
         'correct'),
    spec('Erreur : album qui suffit, non', 0, {'C': 350, 'a': 215, 'b': 120, 'r': 0}, '1',
         'incorrect'),
    spec('car : 48 + 5 = 53 < 55, oui', 1, {'C': 55, 'a': 48, 'b': 5, 'r': 0}, '0', 'correct'),
    spec('car : 52 + 6 = 58 > 55, non', 1, {'C': 55, 'a': 52, 'b': 6, 'r': 1}, '1', 'correct'),
]

# ---- 4. Comparaison (CE1-037) ----
# Deux des trois éléments (deux valeurs, écart) donnés, le troisième cherché (BO). Les mots
# « de plus » et « de moins » n'indiquent pas l'opération.

PLUS_GRAND = probleme(
    'Léo a ' + v('a') + ' billes. Lucie en a ' + v('d') + ' de plus que Léo.',
    'Combien Lucie a-t-elle de billes ?\n\nLucie a $?$ billes.',
    ev('a+d'), [var('a', '100..800'), var('d', '20..200')], ['a + d <= 1000'],
    ['Lucie a autant de billes que Léo, et encore ' + v('d') + ' de plus : elle en a plus que'
     ' Léo, on ajoute l\'écart.', '$${{a}} + {{d}} = ' + col(ev('a+d')) + '$$'],
    'Lucie a $' + ev('a+d') + '$ billes.')

ECART = probleme(
    'Dans l\'école, il y a ' + v('g') + ' garçons et ' + v('f') + ' filles.',
    'Combien de filles y a-t-il de plus que de garçons ?\n\nIl y a $?$ filles de plus que de'
    ' garçons.',
    ev('f-g'), [var('g', '100..400'), var('f', '120..600')], ['f - g >= 20'],
    ['On cherche **l\'écart** entre les filles et les garçons : ce qu\'il faut ajouter à'
     ' ' + v('g') + ' pour arriver à ' + v('f') + '. C\'est une soustraction, même si'
     ' l\'énoncé dit « de plus ».', '$${{f}} - {{g}} = ' + col(ev('f-g')) + '$$'],
    'Il y a $' + ev('f-g') + '$ filles de plus que de garçons.')

PLUS_PETIT = probleme(
    'Le chêne a ' + v('a') + ' ans. Il a ' + v('d') + ' ans de plus que le tilleul.',
    'Quel âge a le tilleul ?\n\nLe tilleul a $?$ ans.',
    ev('a-d'), [var('a', '100..900'), var('d', '20..300')], ['a - d >= 20'],
    ['Le chêne est plus vieux que le tilleul : le tilleul a ' + v('d') + ' ans de moins que le'
     ' chêne. On enlève l\'écart, même si l\'énoncé dit « de plus ».',
     '$${{a}} - {{d}} = ' + col(ev('a-d')) + '$$'],
    'Le tilleul a $' + ev('a-d') + '$ ans.')

DE_MOINS = probleme(
    'Tom a ' + v('a') + ' cartes. Il en a ' + v('d') + ' de moins que Sara.',
    'Combien Sara a-t-elle de cartes ?\n\nSara a $?$ cartes.',
    ev('a+d'), [var('a', '50..700'), var('d', '20..300')], ['a + d <= 1000'],
    ['Tom en a moins que Sara : Sara en a ' + v('d') + ' de plus que Tom. On ajoute l\'écart,'
     ' même si l\'énoncé dit « de moins ».', '$${{a}} + {{d}} = ' + col(ev('a+d')) + '$$'],
    'Sara a $' + ev('a+d') + '$ cartes.')

# BO : Elsa 15,30 €, 6 € de plus que Noé ; l'écart est un nombre entier d'euros
ELSA = probleme(
    'Elsa a ' + prix('100*x+10*k') + ' dans sa tirelire. Elle a ${{d}}~\\unit{€}$ de plus que'
    ' ce que son frère Noé a dans sa tirelire.',
    'Quelle somme d\'argent Noé a-t-il dans sa tirelire ?\n\nNoé a $?' + EURO + '$.',
    en_euros('100*(x-d)+10*k'), [var('x', '8..40'), var('k', '1..9'), var('d', '2..30')],
    ['x - d >= 2'],
    ['Elsa a plus d\'argent que Noé : Noé a ${{d}}~\\unit{€}$ de moins qu\'Elsa. On enlève'
     ' l\'écart, même si l\'énoncé dit « de plus ».',
     'L\'écart est un nombre entier d\'euros : les centimes ne changent pas. Les euros :'
     ' ${{x}} - {{d}} = ' + ev('x-d') + '$.',
     '$$' + col(euros('100*(x-d)+10*k') + '~\\unit{€}') + '$$'],
    'Noé a ' + prix('100*(x-d)+10*k') + ' dans sa tirelire.')

SPECS_COMPARAISON = [
    spec('BO : 188 + 75 = 263', 0, {'a': 188, 'd': 75}, '263', 'correct'),
    spec('Erreur : plus grand, l\'écart enlevé (113)', 0, {'a': 188, 'd': 75}, '113',
         'incorrect'),
    spec('BO : 257 − 111 = 146', 1, {'g': 111, 'f': 257}, '146', 'correct'),
    spec('Erreur : écart, « de plus » lu addition (368)', 1, {'g': 111, 'f': 257}, '368',
         'incorrect'),
    spec('plus petit : 350 − 125 = 225', 2, {'a': 350, 'd': 125}, '225', 'correct'),
    spec('Erreur : plus petit, « de plus » lu addition (475)', 2, {'a': 350, 'd': 125}, '475',
         'incorrect'),
    spec('« de moins » : 245 + 60 = 305', 3, {'a': 245, 'd': 60}, '305', 'correct'),
    spec('Erreur : « de moins » lu soustraction (185)', 3, {'a': 245, 'd': 60}, '185',
         'incorrect'),
    spec('BO : 15,30 − 6 = 9,30 €', 4, {'x': 15, 'k': 3, 'd': 6}, '9{,}3', 'correct'),
    spec('BO : 9,30 € avec le zéro', 4, {'x': 15, 'k': 3, 'd': 6}, '9{,}30', 'correct'),
    spec('Erreur : Elsa, « de plus » lu addition (21,30 €)', 4, {'x': 15, 'k': 3, 'd': 6},
         '21{,}3', 'incorrect'),
]

# ---- 5. Deux étapes additives (CE1-038) ----

BIBLIOTHEQUE = probleme(
    'Dans la bibliothèque de l\'école, il y a ' + v('a') + ' livres. Le professeur en apporte '
    + v('b') + ' de plus. Les élèves en empruntent ' + v('c') + '.',
    'Combien y a-t-il de livres dans la bibliothèque maintenant ?\n\nIl y a $?$ livres.',
    ev('a+b-c'), [var('a', '50..700'), var('b', '10..200'), var('c', '10..300')],
    ['a + b <= 1000', 'a + b - c >= 20'],
    ['On calcule en deux étapes. D\'abord, le professeur apporte des livres : on ajoute.',
     '$${{a}} + {{b}} = ' + ev('a+b') + '$$',
     'Puis les élèves en empruntent : on enlève.',
     '$$' + ev('a+b') + ' - {{c}} = ' + col(ev('a+b-c')) + '$$'],
    'Il y a maintenant $' + ev('a+b-c') + '$ livres dans la bibliothèque.')

BILLET_ENTIER = probleme(
    'À la pâtisserie, madame Martin achète une tarte à ${{p}}~\\unit{€}$ et un gâteau à'
    ' ${{q}}~\\unit{€}$. Elle donne un billet de ${{B}}~\\unit{€}$ à la vendeuse.',
    'Combien la vendeuse va-t-elle lui rendre ?\n\nLa vendeuse rend $?' + EURO + '$.',
    ev('B-p-q'), [var('B', '50|100'), var('p', '5..45'), var('q', '5..45')],
    ['p + q <= B - 2'],
    ['On calcule en deux étapes. D\'abord, le prix des deux achats : on ajoute.',
     '$${{p}} + {{q}} = ' + ev('p+q') + '$$',
     'Puis la vendeuse rend ce qui manque pour aller de $' + ev('p+q') + '~\\unit{€}$ à'
     ' ${{B}}~\\unit{€}$ : on enlève.', '$${{B}} - ' + ev('p+q') + ' = ' + col(ev('B-p-q'))
     + '$$'],
    'La vendeuse rend $' + ev('B-p-q') + '~\\unit{€}$ à madame Martin.')

# BO : baguette à 1,15 €, pain aux raisins à 95 centimes, billet de 5 €
BILLET_CENTIMES = probleme(
    'À la boulangerie, monsieur Milack achète une baguette à ' + prix('100+pc') + ' et un pain'
    ' aux raisins à ${{c}}$ centimes. Il donne un billet de $5~\\unit{€}$.',
    'Combien le vendeur va-t-il lui rendre ?\n\nLe vendeur rend $?' + EURO + '$.',
    en_euros('400-pc-c'),
    [var('k', '1..19'), var('pc', 'eval:5*k'), var('m', '10..19'), var('c', 'eval:5*m')],
    ['pc + c != 100'],
    ['On calcule en deux étapes. D\'abord, le prix des deux pains : on ajoute les euros, puis'
     ' les centimes ($1~\\unit{€} = 100$ centimes).',
     'Les euros : $1$ euro. ' + CENTIMES,
     '$$' + euros('100+pc+c') + '~\\unit{€}$$',
     'Puis le vendeur rend ce qui manque pour aller de ' + prix('100+pc+c') + ' à'
     ' $5~\\unit{€}$ : on complète jusqu\'à l\'euro suivant, puis jusqu\'à $5~\\unit{€}$.',
     'De ' + prix('100+pc+c') + ' à $' + ev('floor((100+pc+c)/100)+1') + '~\\unit{€}$ : $'
     + ev('100-mod(pc+c,100)') + '$ centimes. De $' + ev('floor((100+pc+c)/100)+1')
     + '~\\unit{€}$ à $5~\\unit{€}$ : $' + ev('4-floor((100+pc+c)/100)') + '~\\unit{€}$.',
     '$$' + col(euros('400-pc-c') + '~\\unit{€}') + '$$'],
    'Le vendeur rend ' + prix('400-pc-c') + ' à monsieur Milack.')

SPECS_DEUX_ETAPES = [
    spec('BO : 83 + 18 − 27 = 74', 0, {'a': 83, 'b': 18, 'c': 27}, '74', 'correct'),
    spec('Erreur : arrêt après la 1re étape (101)', 0, {'a': 83, 'b': 18, 'c': 27}, '101',
         'incorrect'),
    spec('Erreur : tout ajouté (128)', 0, {'a': 83, 'b': 18, 'c': 27}, '128', 'incorrect'),
    spec('BO : 50 − 17 − 26 = 7 €', 1, {'B': 50, 'p': 17, 'q': 26}, '7', 'correct'),
    spec('Erreur : le prix payé au lieu du rendu (43)', 1, {'B': 50, 'p': 17, 'q': 26}, '43',
         'incorrect'),
    spec('BO : 5 − (1,15 + 0,95) = 2,90 €', 2, {'k': 3, 'pc': 15, 'm': 19, 'c': 95}, '2{,}9',
         'correct'),
    spec('BO : 2,90 € avec le zéro', 2, {'k': 3, 'pc': 15, 'm': 19, 'c': 95}, '2{,}90',
         'correct'),
    spec('Erreur : le prix payé au lieu du rendu (2,10 €)', 2,
         {'k': 3, 'pc': 15, 'm': 19, 'c': 95}, '2{,}1', 'incorrect'),
    spec('Erreur : centimes sans retenue (3,90 €)', 2, {'k': 3, 'pc': 15, 'm': 19, 'c': 95},
         '3{,}9', 'incorrect'),
]

# ---- 6. Multiplicatifs : le tout (CE1-039) ----
# Facteurs dans les tables 2 à 5 (CE1-027), × 10 (CE1-030), dizaines entières. Unités écrites
# dans le calcul (BO : « 7 × 20 biscuits = 140 biscuits »).

PAQUETS = probleme(
    'Paul apporte ' + v('g') + ' paquets de biscuits. Il y a ' + v('n') + ' biscuits dans'
    ' chaque paquet.',
    'Combien y a-t-il de biscuits en tout ?\n\nIl y a $?$ biscuits.',
    ev('g*n'), [var('g', '2..9'), var('n', '2..5')], [],
    ['Il y a ' + v('g') + ' paquets de ' + v('n') + ' biscuits : c\'est ' + v('g') + ' fois '
     + v('n') + ' biscuits.',
     '$${{g}} \\times {{n}} \\text{ biscuits} = ' + col(ev('g*n')) + ' \\text{ biscuits}$$'],
    'Il y a $' + ev('g*n') + '$ biscuits en tout.')

DIX_PAQUETS = probleme(
    'Un client achète $10$ paquets de ' + v('n') + ' gâteaux.',
    'Combien a-t-il acheté de gâteaux ?\n\nIl a acheté $?$ gâteaux.',
    ev('10*n'), [var('n', '11..99')], [],
    ['C\'est $10$ fois ' + v('n') + ' gâteaux : ' + v('n') + ' dizaines de gâteaux.',
     '$$10 \\times {{n}} \\text{ gâteaux} = ' + col(ev('10*n')) + ' \\text{ gâteaux}$$'],
    'Il a acheté $' + ev('10*n') + '$ gâteaux.')

DIZAINES = probleme(
    'Jan a ' + v('g') + ' paquets de biscuits. Chaque paquet contient ' + v('d') + ' biscuits.',
    'Combien Jan a-t-il de biscuits ?\n\nJan a $?$ biscuits.',
    ev('g*d'), [var('g', '2..9'), var('D', '2..5'), var('d', 'eval:10*D')], ['g * d <= 500'],
    ['Jan a ' + v('g') + ' fois ' + v('d') + ' biscuits. ' + v('d') + ', c\'est ' + v('D')
     + ' dizaines : ' + v('g') + ' fois ' + v('D') + ' dizaines, c\'est $' + ev('g*D')
     + '$ dizaines.',
     '$${{g}} \\times {{d}} \\text{ biscuits} = ' + col(ev('g*d')) + ' \\text{ biscuits}$$'],
    'Jan a $' + ev('g*d') + '$ biscuits.')

SPECS_TOUT = [
    spec('paquets : 6 paquets de 4 = 24', 0, {'g': 6, 'n': 4}, '24', 'correct'),
    spec('Erreur : paquets, 6 + 4 (10)', 0, {'g': 6, 'n': 4}, '10', 'incorrect'),
    spec('Erreur : paquets, 64 juxtaposés', 0, {'g': 6, 'n': 4}, '64', 'incorrect'),
    spec('BO : 10 paquets de 25 = 250', 1, {'n': 25}, '250', 'correct'),
    spec('Erreur : 10 paquets de 25, 35', 1, {'n': 25}, '35', 'incorrect'),
    spec('BO : 7 paquets de 20 = 140', 2, {'g': 7, 'D': 2, 'd': 20}, '140', 'correct'),
    spec('Erreur : 7 × 2 sans la dizaine (14)', 2, {'g': 7, 'D': 2, 'd': 20}, '14',
         'incorrect'),
    spec('borne : 10 paquets de 99 = 990', 1, {'n': 99}, '990', 'correct'),
]

# ---- 7. Multiplicatifs : le nombre de parts (CE1-039) ----

EQUIPES = probleme(
    'Il y a $' + ev('g*n') + '$ élèves de CE1 dans l\'école. Pour un rallye, la directrice fait'
    ' des équipes de ' + v('n') + ' élèves.',
    'Combien y aura-t-il d\'équipes ?\n\nIl y aura $?$ équipes.',
    ev('g'), [var('n', '2|3|4|5|10'), var('g', '3..20')], ['g * n <= 100'],
    ['On cherche combien de fois il y a ' + v('n') + ' élèves dans $' + ev('g*n') + '$ élèves :'
     ' chaque groupe de ' + v('n') + ' est une équipe.',
     '$$' + col('{{g}}') + ' \\times {{n}} = ' + ev('g*n') + '$$'],
    'Il y aura ' + v('g') + ' équipes.')

# BO : 189 photos, 10 par page → 19 pages ; la page du reste compte
PAGES = probleme(
    'Je veux ranger mes $' + ev('10*q+r') + '$ photos dans un album. Je peux ranger $10$ photos'
    ' par page.',
    'Combien de pages me faut-il pour ranger **toutes** mes photos ?\n\nIl me faut $?$ pages.',
    ev('q+1'), [var('q', '3..60'), var('r', '2..9')], [],
    ['$' + ev('10*q+r') + '$, c\'est ' + v('q') + ' dizaines et ' + v('r') + ' unités : ' + v('q')
     + ' pages pleines de $10$ photos, et il reste ' + v('r') + ' photos.',
     'Ces ' + v('r') + ' photos doivent aussi être rangées : il faut une page de plus.',
     '$${{q}} + 1 = ' + col(ev('q+1')) + '$$'],
    'Il me faut $' + ev('q+1') + '$ pages.')

# BO : 75 œufs par boîtes de 6 → 12 boîtes ; le reste ne remplit pas une boîte
BOITES = probleme(
    'Un fermier a $' + ev('n*q+r') + '$ œufs à vendre au marché. Il les vend par boîtes de '
    + v('n') + ' œufs.',
    'Combien de boîtes pleines va-t-il pouvoir vendre ?\n\nIl va vendre $?$ boîtes.',
    ev('q'), [var('n', '3..6'), var('q', '3..15'), var('r', '2..{{eval:n-1}}')], [],
    ['On remplit des boîtes de ' + v('n') + ' œufs : ' + v('q') + ' boîtes, c\'est $'
     + ev('n*q') + '$ œufs.', '$${{q}} \\times {{n}} = ' + ev('n*q') + '$$',
     'Il reste $' + ev('n*q+r') + ' - ' + ev('n*q') + ' = {{r}}$ œufs : pas assez pour remplir'
     ' une boîte de plus.'],
    'Il va vendre $' + col('{{q}}') + '$ boîtes.')

SPECS_PARTS = [
    spec('BO : 60 élèves en équipes de 5 = 12', 0, {'n': 5, 'g': 12}, '12', 'correct'),
    spec('Erreur : 60 − 5 (55)', 0, {'n': 5, 'g': 12}, '55', 'incorrect'),
    spec('Erreur : la taille d\'une équipe (5)', 0, {'n': 5, 'g': 12}, '5', 'incorrect'),
    spec('BO : 189 photos → 19 pages', 1, {'q': 18, 'r': 9}, '19', 'correct'),
    spec('Erreur : pages, le reste oublié (18)', 1, {'q': 18, 'r': 9}, '18', 'incorrect'),
    spec('BO : 75 œufs par 6 → 12 boîtes', 2, {'n': 6, 'q': 12, 'r': 3}, '12', 'correct'),
    spec('Erreur : boîtes, une de trop (13)', 2, {'n': 6, 'q': 12, 'r': 3}, '13', 'incorrect'),
    spec('borne : 609 photos → 61 pages', 1, {'q': 60, 'r': 9}, '61', 'correct'),
]

# ---- 8. Multiplicatifs : la valeur d'une part (CE1-039) ----

IMAGES = probleme(
    v('g') + ' enfants se partagent $' + ev('g*n') + '$ images. Chaque enfant doit avoir le'
    ' même nombre d\'images.',
    'Combien d\'images aura chaque enfant ?\n\nChaque enfant aura $?$ images.',
    ev('n'), [var('g', '2..5'), var('n', '2..10')], [],
    ['On distribue les images une à une, chacun son tour. On cherche le nombre qui, ' + v('g')
     + ' fois, fait $' + ev('g*n') + '$.', '$${{g}} \\times ' + col('{{n}}') + ' = '
     + ev('g*n') + '$$'],
    'Chaque enfant aura ' + v('n') + ' images.')

# BO : 200 élèves en 40 équipes → 5
PAR_EQUIPE = probleme(
    'Dans l\'école, il y a $' + ev('10*K*n') + '$ élèves. Les professeurs veulent faire $'
    + ev('10*K') + '$ équipes qui ont toutes le même nombre d\'élèves.',
    'Combien y aura-t-il d\'élèves par équipe ?\n\nIl y aura $?$ élèves par équipe.',
    ev('n'), [var('K', '2..5'), var('n', '2..9')], ['K * n <= 45'],
    ['On répartit les élèves un à un dans les $' + ev('10*K') + '$ équipes. On cherche le'
     ' nombre d\'élèves qui, $' + ev('10*K') + '$ fois, fait $' + ev('10*K*n') + '$.',
     '$$' + ev('10*K') + ' \\times ' + col('{{n}}') + ' = ' + ev('10*K*n') + '$$'],
    'Il y aura ' + v('n') + ' élèves par équipe.')

# BO : Enzo partage 9,60 € avec ses deux sœurs (trois parts) ; euros et centimes se partagent à
# part, sans reste
ENZO = probleme(
    'Enzo veut partager ' + prix('300*x+30*k') + ' avec ses deux sœurs, de façon que chacun des'
    ' trois enfants ait la même somme.',
    'Combien doit-il donner à chacune de ses sœurs ?\n\nIl donne $?' + EURO + '$ à chacune.',
    en_euros('100*x+10*k'), [var('x', '2..9'), var('k', '1..3')], [],
    ['Enzo et ses deux sœurs : la somme est partagée en **trois** parts égales.',
     'Les euros : $' + ev('3*x') + '$ euros partagés en $3$, c\'est ${{x}}$ euros chacun ($3'
     ' \\times {{x}} = ' + ev('3*x') + '$).',
     'Les centimes : $' + ev('30*k') + '$ centimes partagés en $3$, c\'est $' + ev('10*k')
     + '$ centimes chacun ($3 \\times ' + ev('10*k') + ' = ' + ev('30*k') + '$).',
     '$$' + col(euros('100*x+10*k') + '~\\unit{€}') + '$$'],
    'Enzo donne ' + prix('100*x+10*k') + ' à chacune de ses sœurs.')

SPECS_PART = [
    spec('BO : 18 images pour 3 = 6', 0, {'g': 3, 'n': 6}, '6', 'correct'),
    spec('Erreur : 18 − 3 (15)', 0, {'g': 3, 'n': 6}, '15', 'incorrect'),
    spec('Erreur : le nombre d\'enfants (3)', 0, {'g': 3, 'n': 6}, '3', 'incorrect'),
    spec('BO : 200 élèves en 40 équipes = 5', 1, {'K': 4, 'n': 5}, '5', 'correct'),
    spec('Erreur : 200 − 40 (160)', 1, {'K': 4, 'n': 5}, '160', 'incorrect'),
    spec('BO : 9,60 € pour 3 = 3,20 €', 2, {'x': 3, 'k': 2}, '3{,}2', 'correct'),
    spec('BO : 3,20 € avec le zéro', 2, {'x': 3, 'k': 2}, '3{,}20', 'correct'),
    spec('Erreur : partagé en 2, pour les deux sœurs (4,80 €)', 2, {'x': 3, 'k': 2}, '4{,}8',
         'incorrect'),
]

# ---- 9. Problèmes mixtes (CE1-040) ----
# Une étape multiplicative et une étape additive.

HUILE = probleme(
    'Abi achète ' + v('q') + ' litres d\'huile à ${{p}}~\\unit{€}$ le litre. Elle donne'
    ' ${{B}}~\\unit{€}$ au vendeur.',
    'Combien le vendeur va-t-il lui rendre ?\n\nLe vendeur rend $?' + EURO + '$.',
    ev('B-q*p'), [var('B', '20|50'), var('q', '2..9'), var('p', '2..5')], ['q * p <= B - 2'],
    ['On calcule en deux étapes. D\'abord, le prix de l\'huile : ' + v('q') + ' fois'
     ' ${{p}}~\\unit{€}$.', '$${{q}} \\times {{p}} = ' + ev('q*p') + '$$',
     'Puis le vendeur rend ce qui manque pour aller de $' + ev('q*p') + '~\\unit{€}$ à'
     ' ${{B}}~\\unit{€}$ : on enlève.', '$${{B}} - ' + ev('q*p') + ' = ' + col(ev('B-q*p'))
     + '$$'],
    'Le vendeur rend $' + ev('B-q*p') + '~\\unit{€}$ à Abi.')

CAHIERS = probleme(
    'Un cahier coûte ${{a}}~\\unit{€}$ et un protège-cahier ${{b}}~\\unit{€}$. Jérôme doit'
    ' acheter ' + v('n') + ' cahiers et autant de protège-cahiers.',
    'Quel sera le montant de la facture ?\n\nLa facture sera de $?' + EURO + '$.',
    ev('n*(a+b)'), [var('n', '2|3|4|5|10|20'), var('a', '2..5'), var('b', '2..3')], [],
    ['On calcule en deux étapes. Les cahiers : ' + v('n') + ' fois ${{a}}~\\unit{€}$.',
     '$${{n}} \\times {{a}} = ' + ev('n*a') + '$$',
     'Les protège-cahiers : ' + v('n') + ' fois ${{b}}~\\unit{€}$.',
     '$${{n}} \\times {{b}} = ' + ev('n*b') + '$$', 'Puis on ajoute les deux.',
     '$$' + ev('n*a') + ' + ' + ev('n*b') + ' = ' + col(ev('n*(a+b)')) + '$$'],
    'La facture sera de $' + ev('n*(a+b)') + '~\\unit{€}$.')

PLACES_LIBRES = probleme(
    'Un car a ' + v('C') + ' places. ' + v('g') + ' classes de ' + v('n') + ' élèves montent'
    ' dans le car.',
    'Combien de places restent libres ?\n\nIl reste $?$ places libres.',
    ev('C-g*n'), [var('g', '2..3'), var('n', '20..29'), var('C', '60..90')],
    ['C - g * n >= 2'],
    ['On calcule en deux étapes. D\'abord, le nombre d\'élèves : ' + v('g') + ' fois ' + v('n')
     + ' élèves.', '$${{g}} \\times {{n}} = ' + ev('g*n') + '$$',
     'Puis les places libres : on enlève les élèves des places du car.',
     '$${{C}} - ' + ev('g*n') + ' = ' + col(ev('C-g*n')) + '$$'],
    'Il reste $' + ev('C-g*n') + '$ places libres.')

SPECS_MIXTES = [
    spec('BO : 20 − 7 × 2 = 6 €', 0, {'B': 20, 'q': 7, 'p': 2}, '6', 'correct'),
    spec('Erreur : le prix de l\'huile au lieu du rendu (14)', 0, {'B': 20, 'q': 7, 'p': 2}, '14',
         'incorrect'),
    spec('Erreur : 20 − 7 − 2 (11)', 0, {'B': 20, 'q': 7, 'p': 2}, '11', 'incorrect'),
    spec('BO : 20 × 4 + 20 × 2 = 120 €', 1, {'n': 20, 'a': 4, 'b': 2}, '120', 'correct'),
    spec('Erreur : protège-cahiers comptés une fois (82)', 1, {'n': 20, 'a': 4, 'b': 2}, '82',
         'incorrect'),
    spec('Erreur : un cahier et un protège-cahier (6)', 1, {'n': 20, 'a': 4, 'b': 2}, '6',
         'incorrect'),
    spec('car : 60 − 2 × 27 = 6', 2, {'g': 2, 'n': 27, 'C': 60}, '6', 'correct'),
    spec('Erreur : car, le nombre d\'élèves (54)', 2, {'g': 2, 'n': 27, 'C': 60}, '54',
         'incorrect'),
]

# ---- 10. La part qui reste (CE1-099) ----
# Lucie, retirée du 09 du lot 3 (un problème, pas un calcul) ; reprise de `lot-ce1-3.py`.

DENOMINATEURS = [3, 4, 5, 6, 8, 10]
UNITES = ['', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf', 'dix']
NOMS_PARTS = {3: 'tiers', 4: 'quarts', 5: 'cinquièmes', 6: 'sixièmes', 8: 'huitièmes',
              10: 'dixièmes'}


def par(nom, valeurs, f):
    """f(valeur) selon la valeur tirée de `nom` : {{if:nom==v1|…|{{if:nom==v2|…|…}}}}."""
    valeurs = list(valeurs)
    expr = f(valeurs[-1])
    for x in reversed(valeurs[:-1]):
        expr = '{{if:' + nom + '==' + str(x) + '|' + f(x) + '|' + expr + '}}'
    return expr


def fr(n, d):
    return '\\frac{' + n + '}{' + d + '}'


PARTS_MOT = par('d', DENOMINATEURS, lambda d: NOMS_PARTS[d])

LUCIE = probleme(
    'Lucie a colorié {{if:a==1|le|les}} $' + fr('{{a}}', '{{d}}') + '$ d\'une figure en bleu et'
    ' le reste en rouge.',
    'Quelle fraction de la figure est coloriée en rouge ?\n\n$$?$$',
    fr(ev('d-a'), '{{d}}'),
    [var('d', '|'.join(str(d) for d in DENOMINATEURS)), var('a', '1..{{eval:d-1}}')], [],
    ['La figure entière, c\'est le tout : la partie rouge est ce qui manque à la partie bleue'
     ' pour faire le tout.',
     'Le tout, c\'est ${{d}}$ ' + PARTS_MOT + ' : $1 = ' + fr('{{d}}', '{{d}}') + '$.'],
    '$$1 - ' + fr('{{a}}', '{{d}}') + ' = ' + fr('{{d}}', '{{d}}') + ' - ' + fr('{{a}}', '{{d}}')
    + ' = ' + col(fr(ev('d-a'), '{{d}}')) + '$$')

SPECS_LUCIE = [
    spec('BO : Lucie, 3/10 bleu, 7/10 rouge', 0, {'d': 10, 'a': 3}, '\\frac{7}{10}', 'correct'),
    spec('Erreur : Lucie, la partie bleue (3/10)', 0, {'d': 10, 'a': 3}, '\\frac{3}{10}',
         'incorrect'),
    spec('Erreur : Lucie, 7 (dénominateur oublié)', 0, {'d': 10, 'a': 3}, '7', 'incorrect'),
    spec('le 1/4 bleu : 3/4 rouge', 0, {'d': 4, 'a': 1}, '\\frac{3}{4}', 'correct'),
    spec('6/8 rouge, non simplifiée juste', 0, {'d': 8, 'a': 2}, '\\frac{6}{8}', 'correct'),
    spec('borne : 2/3 bleu, 1/3 rouge', 0, {'d': 3, 'a': 2}, '\\frac{1}{3}', 'correct'),
]

MODELES = {
    '01-parties-tout': modele(
        'Problèmes parties-tout (jusqu\'à 1 000)',
        'Chercher le tout ou une partie : 227 billes dont 113 dans le coffre vert ; 56 images'
        ' distribuées, il en reste 217 ; « de plus » qui se calcule par une soustraction',
        'Parties-tout', 4,
        [PARTIE, TOUT_DEUX, TOUT_TROIS, DEPART_INCONNU, RETRAIT, COMBIEN_DE_PLUS],
        SPECS_PARTIES_TOUT),
    '02-parties-tout-prix': modele(
        'Problèmes parties-tout avec des prix',
        'Des achats en euros et centimes : 1,20 € + 90 centimes + 12 € ; un prix manquant',
        'Parties-tout', 5, [TROIS_ACHATS, PRIX_MANQUANT, ACHATS_ENTIERS], SPECS_PRIX,
        options=SANS_ZEROS),
    '03-est-ce-que-ca-tient': modele(
        'Est-ce que ça tient ?',
        'Calculer le tout pour répondre oui ou non : un album de 350 photos, Lucie en a 287 et'
        ' Léo 72', 'Parties-tout', 6, [ALBUM, CAR], SPECS_TIENT, delay=60),
    '04-comparaison': modele(
        'Problèmes de comparaison',
        'Le plus grand, le plus petit ou l\'écart : Léo 188 billes, Lucie 75 de plus ; 111'
        ' garçons, 257 filles ; Elsa 15,30 €, 6 € de plus que Noé',
        'Comparaison', 1, [PLUS_GRAND, ECART, PLUS_PETIT, DE_MOINS, ELSA], SPECS_COMPARAISON,
        options=SANS_ZEROS),
    '05-deux-etapes': modele(
        'Problèmes en deux étapes (jusqu\'à 1 000)',
        'Ajouts et retraits enchaînés : 83 + 18 − 27 ; deux achats et la monnaie rendue sur un'
        ' billet', 'Deux étapes', 5, [BIBLIOTHEQUE, BILLET_ENTIER, BILLET_CENTIMES],
        SPECS_DEUX_ETAPES, delay=120, options=SANS_ZEROS),
    '06-multiplicatifs-tout': modele(
        'Problèmes multiplicatifs : le tout',
        'n paquets de p : 6 paquets de 4 biscuits, 10 paquets de 25 gâteaux, 7 paquets de 20',
        'Multiplicatifs', 6, [PAQUETS, DIX_PAQUETS, DIZAINES], SPECS_TOUT),
    '07-nombre-de-parts': modele(
        'Problèmes de partage : le nombre de parts',
        'Combien d\'équipes, de pages, de boîtes : 60 élèves par 5 ; 189 photos à 10 par page'
        ' (19 pages) ; 75 œufs par 6 (12 boîtes pleines)',
        'Multiplicatifs', 7, [EQUIPES, PAGES, BOITES], SPECS_PARTS),
    '08-valeur-d-une-part': modele(
        'Problèmes de partage : la valeur d\'une part',
        'Combien chacun : 18 images pour 3 enfants ; 200 élèves en 40 équipes ; 9,60 € pour 3',
        'Multiplicatifs', 8, [IMAGES, PAR_EQUIPE, ENZO], SPECS_PART, options=SANS_ZEROS),
    '09-problemes-mixtes': modele(
        'Problèmes mixtes en deux étapes',
        'Une multiplication et une addition ou une soustraction : 7 L à 2 €, billet de 20 € ;'
        ' 20 cahiers à 4 € et 20 protège-cahiers à 2 €', 'Deux étapes', 6,
        [HUILE, CAHIERS, PLACES_LIBRES], SPECS_MIXTES, delay=120),
    '10-la-part-qui-reste': modele(
        'La part qui reste',
        'Lucie colorie 3/10 d\'une figure en bleu et le reste en rouge : quelle fraction est'
        ' rouge ?', 'Addition et Soustraction', 17, [LUCIE], SPECS_LUCIE, delay=60,
        options={'constraints': {'reducedFractions': 'off'}}, theme='Fractions',
        domain='Calculer'),
}

for nom, m in MODELES.items():
    with open(f'{DOSSIER}/{nom}.json', 'w') as f:
        json.dump(m, f, ensure_ascii=False, indent='\t')
        f.write('\n')
print(len(MODELES), 'modèles écrits')
