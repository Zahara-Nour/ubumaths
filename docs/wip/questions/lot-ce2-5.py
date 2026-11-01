"""Écrit les 12 modèles du lot 5 du CE2 (problèmes) dans scripts/questions/ce2-5/.

Phase 0 validée par David le 2026-11-01 (§ 9 du journal `docs/wip/questions-ce2-progress.md`).
Bornes `cycle2.json`, CE2-029 à 034 et 079 : entiers jusqu'à 10 000 (réponses sous 10 000 : « 10000 » sans espace serait jugé non optimal), prix à virgule, fractions de même
dénominateur ; plus de deux étapes : nombres < 100 ; nombre de parts : quantité totale ≤ 1 000 ;
valeur d'une part : appui sur les tables ; « fois plus » distingué de « de plus ». Exemples du BO
(CE2-nombres.md, p.23-25) : 188 billes + 75 de plus ; 72 € pour 6 dictionnaires ; 4 tables de 6 et
7 tables de 4 ; trottinette 4 fois plus chère qu'un casque à 32 € ; 3 pantalons × 7 tee-shirts ;
2 chapeaux × 3 tee-shirts × 2 pantalons. Décisions :

1. Rangement sur les sous-notions existantes de « Problèmes arithmétiques » (posé par la
   migration) ; catégories `Entiers · Problèmes`, niveaux libres après ceux du CE1.
2. Produit cartésien : on demande le nombre de façons ; le raisonnement (tableau, arbre) est dans
   la correction, en phrases (la taille du tableau change à chaque tirage).
3. « Fois plus » rangé dans « comparaison » (niveau 3) ; mêlé à « de plus » pour que l'élève ne
   choisisse pas l'opération d'après le mot.
4. Régulation (« cela peut-il être vrai ? ») en case choix dans 01 et 05.
5. Prix : en centimes dans les variables, écrits à deux décimales (`euros()`) ; `zeros: off`.
6. Fractions : `reducedFractions` coupé (6/8 juste pour 3/4), comme aux lots 4 du CE1 et du CE2.
7. Toutes les quantités valent au moins 2 ; jamais de variable `e` ni `i`.

    python3 docs/wip/questions/lot-ce2-5.py scripts/questions/ce2-5
"""
import json
import sys

DOSSIER = sys.argv[1]
SANS_ZEROS = {'constraints': {'zeros': 'off'}}
FRACTIONS_NON_REDUITES = {'constraints': {'zeros': 'off', 'reducedFractions': 'off'}}

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
    m = {'title': title, 'description': description, 'grades': ['CE2'], 'theme': theme,
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


def prix_var(nom, bornes_euros, bornes_centimes='1..99'):
    """Les trois variables d'un prix : euros `nomE`, centimes `nomC`, total en centimes `nom`."""
    return [var(nom + 'E', bornes_euros), var(nom + 'C', bornes_centimes),
            var(nom, 'eval:100*' + nom + 'E+' + nom + 'C')]


def prix_spec(nom, euros_, centimes):
    """Les trois valeurs d'un prix pour une spec."""
    return {nom + 'E': euros_, nom + 'C': centimes, nom: 100 * euros_ + centimes}


def fr(n, d):
    return '\\frac{' + n + '}{' + d + '}'


EURO = '~\\text{€}'  # juste après une case : case de nombre
OUI_NON = choix(['Oui', 'Non'], melanger=False)

# ---- 1. Parties-tout, entiers jusqu'à 10 000 (CE2-029) ----

PARTIE = probleme(
    "Dans mes deux cartons, j'ai " + v('t') + ' billes. J\'en ai ' + v('a')
    + ' dans le carton vert.',
    'Combien en ai-je dans le carton rouge ?\n\nIl y a $?$ billes dans le carton rouge.',
    ev('t-a'), [var('t', '1500..9990'), var('a', '300..9000')], ['t - a >= 300'],
    ['Les deux cartons ensemble, c\'est **le tout** : ' + v('t') + ' billes. On connaît une'
     ' partie, le carton vert ; on cherche l\'autre partie : on enlève.',
     '$${{t}} - {{a}} = ' + col(ev('t-a')) + '$$'],
    'Il y a $' + ev('t-a') + '$ billes dans le carton rouge.')

TOUT_DEUX = probleme(
    'Une ville compte ' + v('a') + ' habitants dans le centre et ' + v('b')
    + ' habitants dans les quartiers autour.',
    'Combien d\'habitants cette ville compte-t-elle en tout ?\n\nElle compte $?$ habitants.',
    ev('a+b'), [var('a', '1100..7900'), var('b', '1100..7900')], ['a + b < 10000'],
    ['Le centre et les quartiers sont les deux parties ; on cherche **le tout** : on ajoute.',
     '$${{a}} + {{b}} = ' + col(ev('a+b')) + '$$'],
    'La ville compte $' + ev('a+b') + '$ habitants.')

TOUT_TROIS = probleme(
    'Trois classes vont visiter le château. Il y a ' + v('a') + ' élèves dans la première, '
    + v('b') + ' dans la deuxième et ' + v('c') + ' dans la troisième.',
    'Combien d\'élèves vont visiter le château ?\n\n$?$ élèves vont visiter le château.',
    ev('a+b+c'), [var('a', '500..3300'), var('b', '500..3300'), var('c', '500..3300')],
    ['a + b + c < 10000'],
    ['Les trois classes sont les parties ; on cherche **le tout** : on ajoute les trois'
     ' parties.', '$${{a}} + {{b}} + {{c}} = ' + col(ev('a+b+c')) + '$$'],
    '$' + ev('a+b+c') + '$ élèves vont visiter le château.')

# BO : « il m'en reste » alors qu'il faut additionner
DEPART_INCONNU = probleme(
    "Dans mon stock, il y avait des timbres. J'en ai vendu " + v('a') + ' et il m\'en reste'
    ' encore ' + v('b') + '.',
    'Combien y avait-il de timbres dans mon stock avant la vente ?\n\nIl y avait $?$ timbres.',
    ev('a+b'), [var('a', '1200..5000'), var('b', '800..5000')], ['a + b < 10000'],
    ['Les timbres du début, c\'est **le tout** : les timbres vendus et les timbres qui restent.'
     ' On cherche le tout : on ajoute les deux parties.',
     '$${{a}} + {{b}} = ' + col(ev('a+b')) + '$$'],
    'Il y avait $' + ev('a+b') + '$ timbres dans mon stock.')

RETRAIT = probleme(
    'Un stade peut accueillir ' + v('t') + ' spectateurs. Il y en a déjà ' + v('a') + ' dans les'
    ' gradins.',
    'Combien de places libres reste-t-il ?\n\nIl reste $?$ places libres.',
    ev('t-a'), [var('t', '2000..9990'), var('a', '400..9000')], ['t - a >= 300'],
    ['Les ' + v('t') + ' places du stade, c\'est **le tout** : les places occupées et les places'
     ' libres. On cherche une partie : on enlève.',
     '$${{t}} - {{a}} = ' + col(ev('t-a')) + '$$'],
    'Il reste $' + ev('t-a') + '$ places libres.')

# BO : « de plus » alors qu'il faut soustraire
COMBIEN_DE_PLUS = probleme(
    'Léo a ' + v('a') + ' cartes. Il voudrait en avoir ' + v('t') + ' pour finir sa collection.',
    'Combien de cartes lui faut-il **de plus** ?\n\nIl lui faut $?$ cartes de plus.',
    ev('t-a'), [var('t', '1500..9990'), var('a', '300..9000')], ['t - a >= 300'],
    ['Les ' + v('t') + ' cartes que Léo voudrait, c\'est **le tout** : les cartes qu\'il a et'
     ' celles qui lui manquent. On cherche une partie : ce qu\'il faut ajouter à ' + v('a')
     + ' pour arriver à ' + v('t') + '.',
     '$${{a}} + ' + ev('t-a') + ' = {{t}}$$', 'C\'est une soustraction, même si l\'énoncé dit'
     ' « de plus » :', '$${{t}} - {{a}} = ' + col(ev('t-a')) + '$$'],
    'Il faut $' + ev('t-a') + '$ cartes de plus à Léo.')

# Régulation (BO) : une partie ne peut pas dépasser le tout. Oui = indice 0, Non = indice 1.
REGULATION_PARTIE = probleme(
    'Dans un sac de ' + v('t') + ' billes, certaines sont rouges et les autres sont bleues. Léo dit'
    ' qu\'il y a ' + v('r') + ' billes rouges.',
    'Léo peut-il avoir raison ?' + OUI_NON, '{{z}}',
    [var('t', '500..9000'), var('r', '100..9999'), var('z', 'eval:(sign(r-t)+1)/2')],
    ['abs(r - t) >= 50'],
    ['Les billes rouges sont **une partie** des ' + v('t') + ' billes ; le sac est **le tout**.'
     ' Une partie ne peut pas être plus grande que le tout.',
     '{{if:z==0|' + v('r') + ' est plus petit que ' + v('t') + ' : c\'est possible.|' + v('r')
     + ' est plus grand que ' + v('t') + ' : c\'est impossible.}}'],
    '{{if:z==0|**Oui**, Léo peut avoir raison.|**Non**, Léo se trompe : il ne peut pas y avoir'
    ' plus de billes rouges que de billes dans le sac.}}')

SPECS_PARTIES_TOUT = [
    spec('1 800 billes, 1 250 dans le vert → 550', 0, {'t': 1800, 'a': 1250}, '550', 'correct'),
    spec('Erreur : cartons, les deux ajoutés (3050)', 0, {'t': 1800, 'a': 1250}, '3050',
         'incorrect'),
    spec('tout : 4 365 + 2 578 = 6 943', 1, {'a': 4365, 'b': 2578}, '6943', 'correct'),
    spec('Erreur : tout, retenue oubliée (6 833)', 1, {'a': 4365, 'b': 2578}, '6833',
         'incorrect'),
    spec('trois parties : 1 250 + 2 400 + 3 180 = 6 830', 2, {'a': 1250, 'b': 2400, 'c': 3180},
         '6830', 'correct'),
    spec('Erreur : trois parties, la troisième oubliée (3 650)', 2,
         {'a': 1250, 'b': 2400, 'c': 3180}, '3650', 'incorrect'),
    spec('départ : 2 560 vendus, 1 740 restent → 4 300', 3, {'a': 2560, 'b': 1740}, '4300',
         'correct'),
    spec('Erreur : départ inconnu, « reste » lu soustraction (820)', 3, {'a': 2560, 'b': 1740},
         '820', 'incorrect'),
    spec('retrait : 7 320 − 4 590 = 2 730', 4, {'t': 7320, 'a': 4590}, '2730', 'correct'),
    spec('Erreur : retrait, les deux ajoutés (11 910)', 4, {'t': 7320, 'a': 4590}, '11910',
         'incorrect'),
    spec('« de plus » : 5 000 − 3 480 = 1 520', 5, {'t': 5000, 'a': 3480}, '1520', 'correct'),
    spec('Erreur : « de plus » lu addition (8 480)', 5, {'t': 5000, 'a': 3480}, '8480',
         'incorrect'),
    spec('régulation : 4 200 billes, 3 100 rouges, oui', 6, {'t': 4200, 'r': 3100, 'z': 0}, '0',
         'correct'),
    spec('régulation : 4 200 billes, 5 100 rouges, non', 6, {'t': 4200, 'r': 5100, 'z': 1}, '1',
         'correct'),
    spec('Erreur : régulation, une partie plus grande que le tout acceptée', 6,
         {'t': 4200, 'r': 5100, 'z': 1}, '0', 'incorrect'),
    spec('borne : 4 000 + 5 999 = 9 999', 1, {'a': 4000, 'b': 5999}, '9999', 'correct'),
    spec('Zéro inutile', 0, {'t': 1800, 'a': 1250}, '0550', 'unoptimal_form', ['zeros']),
]

# ---- 2. Parties-tout, prix (CE2-029) ----
# Prix à virgule : p euros et c centimes (c de 1 à 99), totaux sous 1 000 €.

TROIS_ACHATS = probleme(
    'Pour la rentrée, Léa achète un manteau à ' + prix('a') + ', un pull à ' + prix('b')
    + ' et une écharpe à ' + prix('d') + '.',
    'Combien Léa a-t-elle dépensé ?\n\nElle a dépensé $?' + EURO + '$.',
    en_euros('a+b+d'),
    prix_var('a', '40..99') + prix_var('b', '15..49') + prix_var('d', '5..19'), [],
    ['On cherche **le tout** : on ajoute les trois prix. On ajoute les euros, puis les centimes'
     ' ($1~\\unit{€} = 100$ centimes).',
     'Les euros : $' + ev('aE+bE+dE') + '$ euros.',
     'Les centimes : ${{aC}} + {{bC}} + {{dC}} = ' + ev('aC+bC+dC') + '$ centimes{{if:aC+bC+dC>=100|'
     ', c\'est $' + ev('floor((aC+bC+dC)/100)') + '~\\unit{€}$ et $' + ev('mod(aC+bC+dC,100)')
     + '$ centimes.|.}}',
     '$$' + col(euros('a+b+d') + '~\\unit{€}') + '$$'],
    'Léa a dépensé ' + prix('a+b+d') + '.')

# Le livre coûte un prix à virgule : on retire ses euros, puis ses centimes en passant par les centimes
PRIX_MANQUANT = probleme(
    'Noé a payé ' + prix('a+b') + ' pour un livre et un stylo. Le livre coûte ' + prix('a')
    + '.',
    'Combien coûte le stylo ?\n\nLe stylo coûte $?' + EURO + '$.',
    en_euros('b'), prix_var('a', '8..40') + prix_var('b', '2..9'), [],
    ['Le livre et le stylo, c\'est **le tout** : ' + prix('a+b') + '. On cherche une partie, le'
     ' prix du stylo : on enlève le prix du livre.',
     '$$' + euros('a+b') + ' - ' + euros('a') + ' = ' + col(euros('b')) + '$$'],
    'Le stylo coûte ' + prix('b') + '.')

TIRELIRE = probleme(
    'Elsa a ' + prix('t') + ' dans sa tirelire. Elle achète un jeu à ' + prix('a') + '.',
    'Combien d\'argent lui reste-t-il ?\n\nIl lui reste $?' + EURO + '$.',
    en_euros('t-a'), prix_var('t', '30..99') + prix_var('a', '5..29'), ['t > a + 100'],
    ['Les ' + prix('t') + ' d\'Elsa, c\'est **le tout** : le prix du jeu et ce qui reste. On'
     ' cherche une partie : on enlève.',
     '$$' + euros('t') + ' - ' + euros('a') + ' = ' + col(euros('t-a')) + '$$'],
    'Il reste ' + prix('t-a') + ' à Elsa.')

SPECS_PRIX = [
    spec('manteau 59,90 + pull 24,50 + écharpe 9,75 = 94,15 €', 0,
         {**prix_spec('a', 59, 90), **prix_spec('b', 24, 50), **prix_spec('d', 9, 75)},
         '94{,}15', 'correct'),
    spec('Erreur : trois achats, centimes sans retenue (93,15 €)', 0,
         {**prix_spec('a', 59, 90), **prix_spec('b', 24, 50), **prix_spec('d', 9, 75)},
         '93{,}15', 'incorrect'),
    spec('sans retenue : 40,10 + 15,20 + 5,30 = 60,60 €', 0,
         {**prix_spec('a', 40, 10), **prix_spec('b', 15, 20), **prix_spec('d', 5, 30)},
         '60{,}6', 'correct'),
    spec('Zéro final accepté : 60,60 €', 0,
         {**prix_spec('a', 40, 10), **prix_spec('b', 15, 20), **prix_spec('d', 5, 30)},
         '60{,}60', 'correct'),
    spec('prix manquant : 24,40 − 15,10 = 9,30 €', 1,
         {**prix_spec('a', 15, 10), **prix_spec('b', 9, 30)}, '9{,}3', 'correct'),
    spec('Erreur : prix manquant, les deux ajoutés (39,50 €)', 1,
         {**prix_spec('a', 15, 10), **prix_spec('b', 9, 30)}, '39{,}5', 'incorrect'),
    spec('tirelire : 52,40 − 17,85 = 34,55 €', 2,
         {**prix_spec('t', 52, 40), **prix_spec('a', 17, 85)}, '34{,}55', 'correct'),
    spec('Erreur : tirelire, centimes soustraits à l\'envers (35,55 €)', 2,
         {**prix_spec('t', 52, 40), **prix_spec('a', 17, 85)}, '35{,}55', 'incorrect'),
]

# ---- 3. Parties-tout, fractions de même dénominateur (CE2-029) ----

TABLETTE = probleme(
    'Léa a mangé $' + fr('{{a}}', '{{d}}') + '$ d\'une tablette de chocolat.',
    'Quelle fraction de la tablette reste-t-il ?\n\n$$?$$',
    fr(ev('d-a'), '{{d}}'), [var('d', '3..12'), var('a', '1..{{eval:d-1}}')], [],
    ['La tablette entière, c\'est **le tout** : ce qui reste est ce qui manque à la partie mangée'
     ' pour faire le tout.',
     'Le tout, c\'est $1 = ' + fr('{{d}}', '{{d}}') + '$.',
     '$$1 - ' + fr('{{a}}', '{{d}}') + ' = ' + fr('{{d}}', '{{d}}') + ' - ' + fr('{{a}}', '{{d}}')
     + ' = ' + col(fr(ev('d-a'), '{{d}}')) + '$$'],
    'Il reste $' + fr(ev('d-a'), '{{d}}') + '$ de la tablette.')

LIVRE = probleme(
    'Samedi, Paul a lu $' + fr('{{a}}', '{{d}}') + '$ d\'un livre. Dimanche, il en a lu $'
    + fr('{{b}}', '{{d}}') + '$.',
    'Quelle fraction du livre Paul a-t-il lue en tout ?\n\n$$?$$',
    fr(ev('a+b'), '{{d}}'), [var('d', '4..12'), var('a', '1..{{eval:d-2}}'),
                             var('b', '1..{{eval:d-a}}')], [],
    ['Ce que Paul a lu samedi et dimanche, ce sont **deux parties** ; on cherche **le tout** lu :'
     ' on ajoute. Les parts sont de même taille : on ajoute les numérateurs et le'
     ' dénominateur ' + v('d') + ' ne change pas.',
     '$$' + fr('{{a}}', '{{d}}') + ' + ' + fr('{{b}}', '{{d}}') + ' = ' + col(fr(ev('a+b'), '{{d}}'))
     + '$$'],
    'Paul a lu $' + fr(ev('a+b'), '{{d}}') + '$ du livre.')

LIVRE_MANQUANT = probleme(
    'Paul a lu $' + fr('{{t}}', '{{d}}') + '$ d\'un livre en deux jours. Le premier jour, il en'
    ' a lu $' + fr('{{a}}', '{{d}}') + '$.',
    'Quelle fraction du livre a-t-il lue le deuxième jour ?\n\n$$?$$',
    fr(ev('t-a'), '{{d}}'), [var('d', '4..12'), var('t', '3..{{eval:d}}'),
                             var('a', '1..{{eval:t-1}}')], [],
    ['Ce que Paul a lu en deux jours, c\'est **le tout** ; le premier jour est une partie. On'
     ' cherche l\'autre partie : on enlève. Les parts sont de même taille : on enlève les'
     ' numérateurs et le dénominateur ' + v('d') + ' ne change pas.',
     '$$' + fr('{{t}}', '{{d}}') + ' - ' + fr('{{a}}', '{{d}}') + ' = ' + col(fr(ev('t-a'), '{{d}}'))
     + '$$'],
    'Paul a lu $' + fr(ev('t-a'), '{{d}}') + '$ du livre le deuxième jour.')

SPECS_FRACTIONS = [
    spec('tablette : 3/8 mangés, 5/8 restent', 0, {'d': 8, 'a': 3}, '\\frac{5}{8}', 'correct'),
    spec('Erreur : tablette, la partie mangée (3/8)', 0, {'d': 8, 'a': 3}, '\\frac{3}{8}',
         'incorrect'),
    spec('Erreur : tablette, 5 (dénominateur oublié)', 0, {'d': 8, 'a': 3}, '5', 'incorrect'),
    spec('tablette : 6/8 non simplifiée juste', 0, {'d': 8, 'a': 2}, '\\frac{6}{8}', 'correct'),
    spec('livre : 3/10 + 4/10 = 7/10', 1, {'d': 10, 'a': 3, 'b': 4}, '\\frac{7}{10}', 'correct'),
    spec('Erreur : livre, dénominateurs ajoutés (7/20)', 1, {'d': 10, 'a': 3, 'b': 4},
         '\\frac{7}{20}', 'incorrect'),
    spec('livre : somme égale au tout, 8/8', 1, {'d': 8, 'a': 5, 'b': 3}, '\\frac{8}{8}',
         'correct'),
    spec('livre manquant : 9/12 − 4/12 = 5/12', 2, {'d': 12, 't': 9, 'a': 4}, '\\frac{5}{12}',
         'correct'),
    spec('Erreur : livre manquant, les deux ajoutés (13/12)', 2, {'d': 12, 't': 9, 'a': 4},
         '\\frac{13}{12}', 'incorrect'),
]

# ---- 4. Comparaison additive (CE2-079) ----
# Deux des trois éléments (deux valeurs, écart) donnés, le troisième cherché. Les mots
# « de plus » et « de moins » n'indiquent pas l'opération.

PLUS_GRAND = probleme(
    'Léo a ' + v('a') + ' billes. Lucie en a ' + v('d') + ' de plus que Léo.',
    'Combien Lucie a-t-elle de billes ?\n\nLucie a $?$ billes.',
    ev('a+d'), [var('a', '1000..8000'), var('d', '200..2000')], ['a + d < 10000'],
    ['Lucie a autant de billes que Léo, et encore ' + v('d') + ' de plus : elle en a plus que'
     ' Léo, on ajoute l\'écart.', '$${{a}} + {{d}} = ' + col(ev('a+d')) + '$$'],
    'Lucie a $' + ev('a+d') + '$ billes.')

ECART = probleme(
    'Dans la ville, il y a ' + v('g') + ' garçons et ' + v('f') + ' filles qui vont à l\'école.',
    'Combien de filles y a-t-il de plus que de garçons ?\n\nIl y a $?$ filles de plus que de'
    ' garçons.',
    ev('f-g'), [var('g', '1000..4000'), var('f', '1200..6000')], ['f - g >= 200'],
    ['On cherche **l\'écart** entre les filles et les garçons : ce qu\'il faut ajouter à'
     ' ' + v('g') + ' pour arriver à ' + v('f') + '. C\'est une soustraction, même si'
     ' l\'énoncé dit « de plus ».', '$${{f}} - {{g}} = ' + col(ev('f-g')) + '$$'],
    'Il y a $' + ev('f-g') + '$ filles de plus que de garçons.')

PLUS_PETIT = probleme(
    'Le chêne a ' + v('a') + ' ans. Il a ' + v('d') + ' ans de plus que le tilleul.',
    'Quel âge a le tilleul ?\n\nLe tilleul a $?$ ans.',
    ev('a-d'), [var('a', '1000..4000'), var('d', '200..900')], ['a - d >= 200'],
    ['Le chêne est plus vieux que le tilleul : le tilleul a ' + v('d') + ' ans de moins que le'
     ' chêne. On enlève l\'écart, même si l\'énoncé dit « de plus ».',
     '$${{a}} - {{d}} = ' + col(ev('a-d')) + '$$'],
    'Le tilleul a $' + ev('a-d') + '$ ans.')

DE_MOINS = probleme(
    'Tom a ' + v('a') + ' cartes. Il en a ' + v('d') + ' de moins que Sara.',
    'Combien Sara a-t-elle de cartes ?\n\nSara a $?$ cartes.',
    ev('a+d'), [var('a', '1000..8000'), var('d', '200..1500')], ['a + d < 10000'],
    ['Tom en a moins que Sara : Sara en a ' + v('d') + ' de plus que Tom. On ajoute l\'écart,'
     ' même si l\'énoncé dit « de moins ».', '$${{a}} + {{d}} = ' + col(ev('a+d')) + '$$'],
    'Sara a $' + ev('a+d') + '$ cartes.')

# Prix à virgule : l'écart est un prix à virgule
VELO = probleme(
    'Un vélo coûte ' + prix('a') + '. Un casque coûte ' + prix('b') + '.',
    'Combien le vélo coûte-t-il de plus que le casque ?\n\nLe vélo coûte $?' + EURO
    + '$ de plus.',
    en_euros('a-b'), prix_var('a', '150..400') + prix_var('b', '20..99'), [],
    ['On cherche **l\'écart** entre le prix du vélo et celui du casque : on enlève le plus petit'
     ' prix au plus grand.',
     '$$' + euros('a') + ' - ' + euros('b') + ' = ' + col(euros('a-b')) + '$$'],
    'Le vélo coûte ' + prix('a-b') + ' de plus que le casque.')

SPECS_COMPARAISON = [
    spec('3 188 + 2 075 = 5 263', 0, {'a': 3188, 'd': 2075}, '5263', 'correct'),
    spec('Erreur : plus grand, l\'écart enlevé (1 113)', 0,
         {'a': 3188, 'd': 2075}, '1113', 'incorrect'),
    spec('écart : 5 257 − 2 111 = 3 146', 1, {'g': 2111, 'f': 5257}, '3146', 'correct'),
    spec('Erreur : écart, « de plus » lu addition (7 368)', 1, {'g': 2111, 'f': 5257}, '7368',
         'incorrect'),
    spec('plus petit : 3 500 − 1 250 = 2 250', 2, {'a': 3500, 'd': 1250}, '2250', 'correct'),
    spec('Erreur : plus petit, « de plus » lu addition (4 750)', 2, {'a': 3500, 'd': 1250},
         '4750', 'incorrect'),
    spec('« de moins » : 2 450 + 600 = 3 050', 3, {'a': 2450, 'd': 600}, '3050', 'correct'),
    spec('Erreur : « de moins » lu soustraction (1 850)', 3, {'a': 2450, 'd': 600}, '1850',
         'incorrect'),
    spec('prix : 249,90 − 35,40 = 214,50 €', 4,
         {**prix_spec('a', 249, 90), **prix_spec('b', 35, 40)}, '214{,}5', 'correct'),
    spec('Erreur : prix, les deux ajoutés (285,30 €)', 4,
         {**prix_spec('a', 249, 90), **prix_spec('b', 35, 40)}, '285{,}3', 'incorrect'),
]

# ---- 5. Deux étapes additives jusqu'à 10 000 (CE2-030) ----

BIBLIOTHEQUE = probleme(
    'Dans la médiathèque, il y a ' + v('a') + ' livres. La mairie en apporte ' + v('b')
    + ' de plus. Les lecteurs en empruntent ' + v('c') + '.',
    'Combien y a-t-il de livres dans la médiathèque maintenant ?\n\nIl y a $?$ livres.',
    ev('a+b-c'), [var('a', '1000..7000'), var('b', '300..2500'), var('c', '300..3000')],
    ['a + b < 10000', 'a + b - c >= 300'],
    ['On calcule en deux étapes. D\'abord, la mairie apporte des livres : on ajoute.',
     '$${{a}} + {{b}} = ' + ev('a+b') + '$$',
     'Puis les lecteurs en empruntent : on enlève.',
     '$$' + ev('a+b') + ' - {{c}} = ' + col(ev('a+b-c')) + '$$'],
    'Il y a maintenant $' + ev('a+b-c') + '$ livres dans la médiathèque.')

BILLET_ENTIER = probleme(
    'Au magasin de sport, monsieur Martin achète un sac à ${{p}}~\\unit{€}$ et des chaussures à'
    ' ${{q}}~\\unit{€}$. Il donne un billet de ${{B}}~\\unit{€}$ au vendeur.',
    'Combien le vendeur va-t-il lui rendre ?\n\nLe vendeur rend $?' + EURO + '$.',
    ev('B-p-q'), [var('B', '200|500'), var('p', '40..180'), var('q', '40..180')],
    ['p + q <= B - 10'],
    ['On calcule en deux étapes. D\'abord, le prix des deux achats : on ajoute.',
     '$${{p}} + {{q}} = ' + ev('p+q') + '$$',
     'Puis le vendeur rend ce qui manque pour aller de $' + ev('p+q') + '~\\unit{€}$ à'
     ' ${{B}}~\\unit{€}$ : on enlève.', '$${{B}} - ' + ev('p+q') + ' = ' + col(ev('B-p-q'))
     + '$$'],
    'Le vendeur rend $' + ev('B-p-q') + '~\\unit{€}$ à monsieur Martin.')

COURSES = probleme(
    'À la boulangerie, madame Milack achète une tarte à ' + prix('a') + ' et un pain aux'
    ' raisins à ' + prix('b') + '. Elle donne un billet de ${{B}}~\\unit{€}$.',
    'Combien la vendeuse va-t-elle lui rendre ?\n\nLa vendeuse rend $?' + EURO + '$.',
    en_euros('100*B-a-b'), [var('B', '10|20')] + prix_var('a', '3..8') + prix_var('b', '1..4'),
    ['a + b <= 100 * B - 50'],
    ['On calcule en deux étapes. D\'abord, le prix des deux achats : on ajoute.',
     '$$' + euros('a') + ' + ' + euros('b') + ' = ' + euros('a+b') + '$$',
     'Puis la vendeuse rend ce qui manque pour aller de ' + prix('a+b') + ' à'
     ' ${{B}}~\\unit{€}$ : on enlève.',
     '$${{B}} - ' + euros('a+b') + ' = ' + col(euros('100*B-a-b')) + '$$'],
    'La vendeuse rend ' + prix('100*B-a-b') + ' à madame Milack.')

# Régulation (BO) : après un ajout puis un retrait, on ne peut pas dépasser ce qu'il y avait après
# l'ajout. Oui = indice 0, Non = indice 1.
REGULATION_ETAPES = probleme(
    'Dans la médiathèque, il y a ' + v('a') + ' livres. La mairie en apporte ' + v('b') + ' de'
    ' plus. Ensuite, des lecteurs en empruntent. Léo dit qu\'il y a maintenant ' + v('x')
    + ' livres.',
    'Peut-on être sûr, sans calculer, que Léo s\'est trompé ?' + OUI_NON, '{{z}}',
    [var('a', '1000..6000'), var('b', '300..2500'), var('x', '1000..10000'),
     var('z', 'eval:(1-sign(x-a-b))/2')],
    ['abs(x - a - b) >= 100', 'a + b < 10000'],
    ['Quand la mairie a apporté des livres, il y en avait $' + ev('a+b') + '$. Ensuite, on en a'
     ' seulement enlevé : il y en a au plus $' + ev('a+b') + '$.',
     '{{if:z==0|' + v('x') + ' est plus grand que $' + ev('a+b') + '$ : c\'est impossible.|'
     + v('x') + ' est plus petit que $' + ev('a+b') + '$ : on ne peut pas savoir sans connaître'
     ' le nombre de livres empruntés.}}'],
    '{{if:z==0|**Oui**, Léo s\'est trompé.|**Non**, on ne peut pas en être sûr sans calculer.}}')

SPECS_DEUX_ETAPES = [
    spec('médiathèque : 4 200 + 1 300 − 900 = 4 600', 0, {'a': 4200, 'b': 1300, 'c': 900},
         '4600', 'correct'),
    spec('Erreur : médiathèque, retrait oublié (5 500)', 0, {'a': 4200, 'b': 1300, 'c': 900},
         '5500', 'incorrect'),
    spec('Erreur : médiathèque, tout ajouté (6 400)', 0, {'a': 4200, 'b': 1300, 'c': 900},
         '6400', 'incorrect'),
    spec('billet : 500 − (120 + 85) = 295', 1, {'B': 500, 'p': 120, 'q': 85}, '295', 'correct'),
    spec('Erreur : billet, un seul achat retiré (380)', 1, {'B': 500, 'p': 120, 'q': 85}, '380',
         'incorrect'),
    spec('courses : 20 − (5,40 + 2,15) = 12,45 €', 2,
         {'B': 20, **prix_spec('a', 5, 40), **prix_spec('b', 2, 15)}, '12{,}45', 'correct'),
    spec('Erreur : courses, un seul achat retiré (14,60 €)', 2,
         {'B': 20, **prix_spec('a', 5, 40), **prix_spec('b', 2, 15)}, '14{,}6', 'incorrect'),
    spec('régulation : 5 500 livres au plus, Léo dit 7 000 → sûr, oui', 3,
         {'a': 4200, 'b': 1300, 'x': 7000, 'z': 0}, '0', 'correct'),
    spec('régulation : Léo dit 4 000 → pas sûr, non', 3,
         {'a': 4200, 'b': 1300, 'x': 4000, 'z': 1}, '1', 'correct'),
    spec('Erreur : régulation, « oui » quand 4 000 < 5 500', 3,
         {'a': 4200, 'b': 1300, 'x': 4000, 'z': 1}, '0', 'incorrect'),
]

# ---- 6. Comparaison en deux étapes (CE2-030) ----
# BO : Léo a 188 billes, Lucie en a 75 de plus, combien en tout ? On cherche d'abord l'autre
# valeur, puis le tout.

LEO_LUCIE = probleme(
    'Léo a ' + v('a') + ' billes. Lucie en a ' + v('d') + ' de plus que Léo.',
    'Combien les deux enfants ont-ils de billes en tout ?\n\nIls ont $?$ billes en tout.',
    ev('2*a+d'), [var('a', '100..4000'), var('d', '20..1500')], ['2 * a + d < 10000'],
    ['On calcule en deux étapes. D\'abord le nombre de billes de Lucie : elle en a plus que Léo,'
     ' on ajoute l\'écart.', '$${{a}} + {{d}} = ' + ev('a+d') + '$$',
     'Puis le nombre de billes **en tout** : on ajoute celles de Léo et celles de Lucie.',
     '$${{a}} + ' + ev('a+d') + ' = ' + col(ev('2*a+d')) + '$$'],
    'Léo et Lucie ont $' + ev('2*a+d') + '$ billes en tout.')

SARA_TOM = probleme(
    'Sara a ' + v('s') + ' cartes. Tom en a ' + v('d') + ' de moins que Sara.',
    'Combien les deux enfants ont-ils de cartes en tout ?\n\nIls ont $?$ cartes en tout.',
    ev('2*s-d'), [var('s', '1000..5000'), var('d', '200..900')], ['2 * s - d < 10000'],
    ['On calcule en deux étapes. D\'abord le nombre de cartes de Tom : il en a moins que Sara,'
     ' on enlève l\'écart.', '$${{s}} - {{d}} = ' + ev('s-d') + '$$',
     'Puis le nombre de cartes **en tout** : on ajoute celles de Sara et celles de Tom.',
     '$${{s}} + ' + ev('s-d') + ' = ' + col(ev('2*s-d')) + '$$'],
    'Sara et Tom ont $' + ev('2*s-d') + '$ cartes en tout.')

PULL_PANTALON = probleme(
    'Un pull coûte ' + prix('a') + '. Un pantalon coûte ${{d}}~\\unit{€}$ de plus que le pull.',
    'Combien coûtent le pull et le pantalon ensemble ?\n\nIls coûtent $?' + EURO + '$ ensemble.',
    en_euros('2*a+100*d'), prix_var('a', '10..45') + [var('d', '5..30')], [],
    ['On calcule en deux étapes. D\'abord le prix du pantalon : il coûte plus cher que le pull,'
     ' on ajoute l\'écart ($' + ev('d') + '$ euros, les centimes ne changent pas).',
     '$$' + euros('a') + ' + {{d}} = ' + euros('a+100*d') + '$$',
     'Puis le prix **des deux ensemble** : on ajoute le prix du pull et celui du pantalon.',
     '$$' + euros('a') + ' + ' + euros('a+100*d') + ' = ' + col(euros('2*a+100*d')) + '$$'],
    'Le pull et le pantalon coûtent ' + prix('2*a+100*d') + ' ensemble.')

SPECS_COMPARAISON_DEUX = [
    spec('BO : 188 + 75 = 263, puis 188 + 263 = 451', 0, {'a': 188, 'd': 75}, '451', 'correct'),
    spec('Erreur : BO, seulement Lucie (263)', 0, {'a': 188, 'd': 75}, '263', 'incorrect'),
    spec('Erreur : BO, Léo + l\'écart (263 + 75 = 338)', 0, {'a': 188, 'd': 75}, '338',
         'incorrect'),
    spec('moins : Sara 3 200, Tom −400 = 2 800, total 6 000', 1, {'s': 3200, 'd': 400}, '6000',
         'correct'),
    spec('Erreur : Tom oublié (3 200)', 1, {'s': 3200, 'd': 400}, '3200', 'incorrect'),
    spec('Erreur : « de moins » lu addition (6 800)', 1, {'s': 3200, 'd': 400}, '6800',
         'incorrect'),
    spec('prix : 24,50 + (24,50 + 12) = 61 €', 2, {**prix_spec('a', 24, 50), 'd': 12}, '61',
         'correct'),
    spec('Erreur : prix, le pantalon seul (36,50 €)', 2, {**prix_spec('a', 24, 50), 'd': 12},
         '36{,}5', 'incorrect'),
]

# ---- 7. Multiplicatifs : la valeur du tout (CE2-031) ----
# Champ étendu : facteur d'un ou deux chiffres, l'autre jusqu'à trois chiffres (produit ≤ 10 000).

PAQUETS = probleme(
    'Paul achète ' + v('g') + ' paquets de feuilles. Il y a ' + v('n') + ' feuilles dans chaque'
    ' paquet.',
    'Combien Paul a-t-il de feuilles en tout ?\n\nPaul a $?$ feuilles.',
    ev('g*n'), [var('g', '3..9'), var('n', '110..999')], ['g * n <= 9000'],
    ['Il y a ' + v('g') + ' paquets de ' + v('n') + ' feuilles : c\'est ' + v('g') + ' fois '
     + v('n') + ' feuilles. On peut décomposer ' + v('n') + ' (centaines, dizaines, unités).',
     '$${{g}} \\times {{n}} \\text{ feuilles} = ' + col(ev('g*n')) + ' \\text{ feuilles}$$'],
    'Paul a $' + ev('g*n') + '$ feuilles.')

PRIX_UNITE = probleme(
    'Un stylo coûte ' + prix('u') + '. Maëlle en achète ' + v('g') + '.',
    'Combien Maëlle va-t-elle payer ?\n\nElle va payer $?' + EURO + '$.',
    en_euros('g*u'), [var('g', '3..9'), var('k', '3..19'), var('u', 'eval:50*k')], [],
    ['Maëlle achète ' + v('g') + ' stylos à ' + prix('u') + ' : c\'est ' + v('g') + ' fois '
     + prix('u') + '.', '$${{g}} \\times ' + euros('u') + ' = ' + col(euros('g*u')) + '$$'],
    'Maëlle va payer ' + prix('g*u') + '.')

DIX_PAQUETS = probleme(
    'Un client achète $10$ paquets de ' + v('n') + ' gâteaux.',
    'Combien a-t-il acheté de gâteaux ?\n\nIl a acheté $?$ gâteaux.',
    ev('10*n'), [var('n', '110..999')], [],
    ['C\'est $10$ fois ' + v('n') + ' gâteaux : ' + v('n') + ' dizaines de gâteaux.',
     '$$10 \\times {{n}} \\text{ gâteaux} = ' + col(ev('10*n')) + ' \\text{ gâteaux}$$'],
    'Il a acheté $' + ev('10*n') + '$ gâteaux.')

CENT_PAQUETS = probleme(
    'Une usine remplit $100$ cartons de ' + v('n') + ' boîtes.',
    'Combien de boîtes y a-t-il en tout ?\n\nIl y a $?$ boîtes.',
    ev('100*n'), [var('n', '11..99')], [],
    ['C\'est $100$ fois ' + v('n') + ' boîtes : ' + v('n') + ' centaines de boîtes.',
     '$$100 \\times {{n}} \\text{ boîtes} = ' + col(ev('100*n')) + ' \\text{ boîtes}$$'],
    'Il y a $' + ev('100*n') + '$ boîtes en tout.')

DIZAINES = probleme(
    'Jan a ' + v('g') + ' paquets de biscuits. Chaque paquet contient ' + v('d') + ' biscuits.',
    'Combien Jan a-t-il de biscuits ?\n\nJan a $?$ biscuits.',
    ev('g*d'), [var('g', '3..9'), var('D', '2..9'), var('d', 'eval:10*D')], ['g * d >= 100'],
    ['Jan a ' + v('g') + ' fois ' + v('d') + ' biscuits. ' + v('d') + ', c\'est ' + v('D')
     + ' dizaines : ' + v('g') + ' fois ' + v('D') + ' dizaines, c\'est $' + ev('g*D')
     + '$ dizaines.',
     '$${{g}} \\times {{d}} \\text{ biscuits} = ' + col(ev('g*d')) + ' \\text{ biscuits}$$'],
    'Jan a $' + ev('g*d') + '$ biscuits.')

SPECS_TOUT = [
    spec('paquets : 6 paquets de 145 = 870', 0, {'g': 6, 'n': 145}, '870', 'correct'),
    spec('Erreur : paquets, 6 + 145 (151)', 0, {'g': 6, 'n': 145}, '151', 'incorrect'),
    spec('Erreur : paquets, retenue des dizaines oubliée (830)', 0, {'g': 6, 'n': 145}, '830',
         'incorrect'),
    spec('prix : 6 stylos à 2,50 € = 15 €', 1, {'g': 6, 'k': 5, 'u': 250}, '15', 'correct'),
    spec('prix : 7 stylos à 1,50 € = 10,50 €', 1, {'g': 7, 'k': 3, 'u': 150}, '10{,}5',
         'correct'),
    spec('Erreur : prix, 7 + 1,50 (8,50 €)', 1, {'g': 7, 'k': 3, 'u': 150}, '8{,}5', 'incorrect'),
    spec('10 paquets de 125 = 1 250', 2, {'n': 125}, '1250', 'correct'),
    spec('Erreur : 10 paquets de 125, 135', 2, {'n': 125}, '135', 'incorrect'),
    spec('100 cartons de 37 = 3 700', 3, {'n': 37}, '3700', 'correct'),
    spec('Erreur : 100 cartons, un zéro oublié (370)', 3, {'n': 37}, '370', 'incorrect'),
    spec('dizaines : 7 paquets de 80 = 560', 4, {'g': 7, 'D': 8, 'd': 80}, '560', 'correct'),
    spec('Erreur : 7 × 8 sans la dizaine (56)', 4, {'g': 7, 'D': 8, 'd': 80}, '56', 'incorrect'),
]

# ---- 8. Multiplicatifs : le nombre de parts (CE2-031) ----
# Quantité totale ≤ 1 000 (champ du CE1, décision c2-9).

EQUIPES = probleme(
    'Il y a $' + ev('g*n') + '$ élèves de CE2 dans la ville. Pour un tournoi, on fait des équipes'
    ' de ' + v('n') + ' élèves.',
    'Combien y aura-t-il d\'équipes ?\n\nIl y aura $?$ équipes.',
    ev('g'), [var('n', '2..9'), var('g', '11..100')], ['g * n <= 1000'],
    ['On cherche combien de fois il y a ' + v('n') + ' élèves dans $' + ev('g*n') + '$ élèves :'
     ' chaque groupe de ' + v('n') + ' est une équipe.',
     '$$' + col('{{g}}') + ' \\times {{n}} = ' + ev('g*n') + '$$'],
    'Il y aura ' + v('g') + ' équipes.')

# La page du reste compte : on arrondit au-dessus
PAGES = probleme(
    'Je veux ranger mes $' + ev('p*q+r') + '$ photos dans un album. Je peux ranger ' + v('p')
    + ' photos par page.',
    'Combien de pages me faut-il pour ranger **toutes** mes photos ?\n\nIl me faut $?$ pages.',
    ev('q+1'), [var('p', '4|6|8|10'), var('q', '10..100'), var('r', '1..{{eval:p-1}}')],
    ['p * q + r <= 1000'],
    ['$' + ev('p*q+r') + '$ photos par ' + v('p') + ' : ' + v('q') + ' pages pleines de ' + v('p')
     + ' photos, et il reste ' + v('r') + ' {{if:r==1|photo|photos}}.',
     'Le reste doit aussi être rangé : il faut une page de plus.',
     '$${{q}} + 1 = ' + col(ev('q+1')) + '$$'],
    'Il me faut $' + ev('q+1') + '$ pages.')

# Le reste ne remplit pas une boîte : on arrondit en dessous
BOITES = probleme(
    'Un fermier a $' + ev('n*q+r') + '$ œufs à vendre au marché. Il les vend par boîtes de '
    + v('n') + ' œufs.',
    'Combien de boîtes pleines va-t-il pouvoir vendre ?\n\nIl va vendre $?$ boîtes.',
    ev('q'), [var('n', '6|8|9|12'), var('q', '10..80'), var('r', '1..{{eval:n-1}}')],
    ['n * q + r <= 1000'],
    ['On remplit des boîtes de ' + v('n') + ' œufs : ' + v('q') + ' boîtes, c\'est $'
     + ev('n*q') + '$ œufs.', '$${{q}} \\times {{n}} = ' + ev('n*q') + '$$',
     'Il reste $' + ev('n*q+r') + ' - ' + ev('n*q') + ' = {{r}}$ {{if:r==1|œuf|œufs}} : pas assez pour remplir'
     ' une boîte de plus.'],
    'Il va vendre $' + col('{{q}}') + '$ boîtes.')

SPECS_PARTS = [
    spec('équipes : 360 élèves par 8 = 45', 0, {'n': 8, 'g': 45}, '45', 'correct'),
    spec('Erreur : 360 − 8 (352)', 0, {'n': 8, 'g': 45}, '352', 'incorrect'),
    spec('Erreur : la taille d\'une équipe (8)', 0, {'n': 8, 'g': 45}, '8', 'incorrect'),
    spec('pages : 6 × 31 + 5 = 191 photos → 32 pages', 1, {'p': 6, 'q': 31, 'r': 5}, '32',
         'correct'),
    spec('Erreur : pages, le reste oublié (31)', 1, {'p': 6, 'q': 31, 'r': 5}, '31',
         'incorrect'),
    spec('boîtes : 9 × 25 + 4 = 229 œufs → 25 boîtes', 2, {'n': 9, 'q': 25, 'r': 4}, '25',
         'correct'),
    spec('Erreur : boîtes, une de trop (26)', 2, {'n': 9, 'q': 25, 'r': 4}, '26', 'incorrect'),
    spec('borne : 10 × 99 + 9... pages, 10 par page (p = 10, q = 99, r = 9 : 999 photos)', 1,
         {'p': 10, 'q': 99, 'r': 9}, '100', 'correct'),
]

# ---- 9. Multiplicatifs : la valeur d'une part (CE2-031) ----
# Appui sur les tables : g parts de n, le produit est donné.

DICTIONNAIRES = probleme(
    'La maîtresse de CE2 a acheté ' + v('g') + ' dictionnaires pour la classe. Elle a payé $'
    + ev('g*n') + '~\\unit{€}$.',
    'Quel est le prix d\'un dictionnaire ?\n\nUn dictionnaire coûte $?' + EURO + '$.',
    ev('n'), [var('g', '3..9'), var('n', '6..40')], [],
    ['Les ' + v('g') + ' dictionnaires coûtent le même prix. On cherche le nombre qui, ' + v('g')
     + ' fois, fait $' + ev('g*n') + '$ : c\'est dans la table de ' + v('g') + '.',
     '$${{g}} \\times ' + col('{{n}}') + ' = ' + ev('g*n') + '$$'],
    'Un dictionnaire coûte ${{n}}~\\unit{€}$.')

BOUQUETS = probleme(
    'Une fleuriste répartit $' + ev('g*n') + '$ roses dans ' + v('g') + ' bouquets. Tous les'
    ' bouquets ont le même nombre de roses.',
    'Combien de roses y a-t-il dans chaque bouquet ?\n\nIl y a $?$ roses dans chaque bouquet.',
    ev('n'), [var('g', '3..9'), var('n', '11..99')], ['g * n <= 900'],
    ['On répartit les roses dans les ' + v('g') + ' bouquets. On cherche le nombre qui, ' + v('g')
     + ' fois, fait $' + ev('g*n') + '$.', '$${{g}} \\times ' + col('{{n}}') + ' = ' + ev('g*n')
     + '$$'],
    'Il y a ' + v('n') + ' roses dans chaque bouquet.')

# Prix à virgule : les euros et les centimes se partagent à part, sans reste
CHEMISES = probleme(
    'On achète ' + v('g') + ' chemises identiques. Elles coûtent ' + prix('g*u') + ' en tout.',
    'Combien coûte une chemise ?\n\nUne chemise coûte $?' + EURO + '$.',
    en_euros('u'), [var('g', '2..9'), var('x', '5..30'), var('k', '1..9'), var('u', 'eval:100*x+10*k')],
    [],
    ['Les ' + v('g') + ' chemises coûtent le même prix. On cherche le prix qui, ' + v('g')
     + ' fois, fait ' + prix('g*u') + '.',
     '$${{g}} \\times ' + col(euros('u') + '~\\unit{€}') + ' = ' + euros('g*u') + '~\\unit{€}$$'],
    'Une chemise coûte ' + prix('u') + '.')

SPECS_PART = [
    spec('BO : 72 € pour 6 dictionnaires = 12 €', 0, {'g': 6, 'n': 12}, '12', 'correct'),
    spec('Erreur : 72 − 6 (66)', 0, {'g': 6, 'n': 12}, '66', 'incorrect'),
    spec('Erreur : 72 ÷ 8 (9)', 0, {'g': 6, 'n': 12}, '9', 'incorrect'),
    spec('bouquets : 7 bouquets, 357 roses → 51', 1, {'g': 7, 'n': 51}, '51', 'correct'),
    spec('Erreur : bouquets, 357 − 7 (350)', 1, {'g': 7, 'n': 51}, '350', 'incorrect'),
    spec('chemises : 4 pour 79,60 € → 19,90 €', 2, {'g': 4, 'x': 19, 'k': 9, 'u': 1990},
         '19{,}9', 'correct'),
    spec('Zéro final accepté : 19,90 €', 2, {'g': 4, 'x': 19, 'k': 9, 'u': 1990}, '19{,}90',
         'correct'),
    spec('Erreur : chemises, le total (79,60 €)', 2, {'g': 4, 'x': 19, 'k': 9, 'u': 1990},
         '79{,}6', 'incorrect'),
]

# ---- 10. « Fois plus », « fois moins » (CE2-033) ----

TROTTINETTE = probleme(
    'Une trottinette coûte ' + v('k') + ' fois plus cher qu\'un casque. Le casque coûte $'
    + ev('c') + '~\\unit{€}$.',
    'Combien coûte la trottinette ?\n\nLa trottinette coûte $?' + EURO + '$.',
    ev('k*c'), [var('k', '2..9'), var('c', '12..99')], [],
    ['« ' + v('k') + ' fois plus cher » : la trottinette coûte ' + v('k') + ' fois le prix du'
     ' casque. On multiplie (ce n\'est pas « de plus », qui voudrait dire qu\'on ajoute un'
     ' écart).', '$${{k}} \\times {{c}} = ' + col(ev('k*c')) + '$$'],
    'La trottinette coûte $' + ev('k*c') + '~\\unit{€}$.')

CASQUE = probleme(
    'Un casque coûte ' + v('k') + ' fois moins cher qu\'une trottinette. La trottinette coûte $'
    + ev('k*c') + '~\\unit{€}$.',
    'Combien coûte le casque ?\n\nLe casque coûte $?' + EURO + '$.',
    ev('c'), [var('k', '2..9'), var('c', '12..99')], [],
    ['« ' + v('k') + ' fois moins cher » : la trottinette coûte ' + v('k') + ' fois le prix du'
     ' casque. On cherche le nombre qui, ' + v('k') + ' fois, fait $' + ev('k*c') + '$. On'
     ' divise (ce n\'est pas « de moins », qui voudrait dire qu\'on enlève un écart).',
     '$${{k}} \\times ' + col('{{c}}') + ' = ' + ev('k*c') + '$$'],
    'Le casque coûte ${{c}}~\\unit{€}$.')

# Les deux mots côte à côte : le piège est de prendre l'un pour l'autre
STYLO_CAHIER = (
    'Un stylo coûte ${{c}}~\\unit{€}$. Un cahier coûte ' + v('k') + ' fois plus cher que le'
    ' stylo. Un classeur coûte ${{d}}~\\unit{€}$ de plus que le stylo.')
STYLO_VARIABLES = [var('k', '2..9'), var('c', '3..25'), var('d', '2..20')]

CAHIER = probleme(
    STYLO_CAHIER, 'Combien coûte le cahier ?\n\nLe cahier coûte $?' + EURO + '$.',
    ev('k*c'), STYLO_VARIABLES, ['d != k * c - c'],
    ['« ' + v('k') + ' fois plus cher » : le cahier coûte ' + v('k') + ' fois le prix du stylo.'
     ' On multiplie. (L\'autre phrase, « de plus », parle du classeur.)',
     '$${{k}} \\times {{c}} = ' + col(ev('k*c')) + '$$'],
    'Le cahier coûte $' + ev('k*c') + '~\\unit{€}$.')

CLASSEUR = probleme(
    STYLO_CAHIER, 'Combien coûte le classeur ?\n\nLe classeur coûte $?' + EURO + '$.',
    ev('c+d'), STYLO_VARIABLES, ['d != k * c - c'],
    ['« ${{d}}~\\unit{€}$ **de plus** » : le classeur coûte le prix du stylo et encore ' + v('d')
     + ' euros. On ajoute l\'écart. (L\'autre phrase, « fois plus », parle du cahier.)',
     '$${{c}} + {{d}} = ' + col(ev('c+d')) + '$$'],
    'Le classeur coûte $' + ev('c+d') + '~\\unit{€}$.')

FILLES = probleme(
    'Dans une école, il y a ' + v('k') + ' fois plus de filles que de garçons. Il y a ' + v('g')
    + ' garçons.',
    'Combien y a-t-il de filles ?\n\nIl y a $?$ filles.',
    ev('k*g'), [var('k', '2..9'), var('g', '20..99')], [],
    ['« ' + v('k') + ' fois plus de filles » : on multiplie le nombre de garçons par ' + v('k')
     + '.', '$${{k}} \\times {{g}} = ' + col(ev('k*g')) + '$$'],
    'Il y a $' + ev('k*g') + '$ filles.')

SPECS_FOIS = [
    spec('BO : trottinette 4 fois plus chère que 32 € = 128 €', 0, {'k': 4, 'c': 32}, '128',
         'correct'),
    spec('Erreur : « fois plus » lu addition (36)', 0, {'k': 4, 'c': 32}, '36', 'incorrect'),
    spec('casque : 4 fois moins, 128 € → 32 €', 1, {'k': 4, 'c': 32}, '32', 'correct'),
    spec('Erreur : « fois moins » lu multiplication (512)', 1, {'k': 4, 'c': 32}, '512',
         'incorrect'),
    spec('Erreur : « fois moins » lu soustraction (124)', 1, {'k': 4, 'c': 32}, '124',
         'incorrect'),
    spec('cahier : 5 × 6 = 30 €', 2, {'k': 5, 'c': 6, 'd': 4}, '30', 'correct'),
    spec('Erreur : cahier, « de plus » pris pour l\'opération (10)', 2, {'k': 5, 'c': 6, 'd': 4},
         '10', 'incorrect'),
    spec('classeur : 6 + 4 = 10 €', 3, {'k': 5, 'c': 6, 'd': 4}, '10', 'correct'),
    spec('Erreur : classeur, « fois plus » pris pour l\'opération (30)', 3,
         {'k': 5, 'c': 6, 'd': 4}, '30', 'incorrect'),
    spec('filles : 6 fois plus que 45 = 270', 4, {'k': 6, 'g': 45}, '270', 'correct'),
    spec('Erreur : filles, 6 + 45 (51)', 4, {'k': 6, 'g': 45}, '51', 'incorrect'),
]

# ---- 11. Problèmes mixtes en deux ou trois étapes (CE2-032) ----
# Plus de deux étapes : champ numérique < 100 (BO).

RESTAURANT = probleme(
    'Dans un restaurant, il y a ' + v('g') + ' tables de ' + v('n') + ' personnes et ' + v('h')
    + ' tables de ' + v('m') + ' personnes.',
    'Combien ce restaurant peut-il recevoir de clients ?\n\nIl peut recevoir $?$ clients.',
    ev('g*n+h*m'),
    [var('g', '2..9'), var('n', '2..9'), var('h', '2..9'), var('m', '2..9')],
    ['g * n + h * m < 100', 'n != m'],
    ['On calcule en trois étapes. Les tables de ' + v('n') + ' personnes :'
     ' $' + '{{g}} \\times {{n}} = ' + ev('g*n') + '$.',
     'Les tables de ' + v('m') + ' personnes : $' + '{{h}} \\times {{m}} = ' + ev('h*m') + '$.',
     'Puis on ajoute les deux : $' + ev('g*n') + ' + ' + ev('h*m') + ' = '
     + col(ev('g*n+h*m')) + '$.'],
    'Le restaurant peut recevoir $' + ev('g*n+h*m') + '$ clients.')

BILLET_CAHIERS = probleme(
    'Max achète ' + v('g') + ' cahiers à ${{p}}~\\unit{€}$ chacun. Il paie avec un billet de'
    ' ${{B}}~\\unit{€}$.',
    'Combien le vendeur doit-il lui rendre ?\n\nLe vendeur rend $?' + EURO + '$.',
    ev('B-g*p'), [var('g', '3..9'), var('p', '2..9'), var('B', '50|100')],
    ['g * p <= B - 5'],
    ['On calcule en deux étapes. D\'abord le prix des ' + v('g') + ' cahiers : ' + v('g')
     + ' fois ${{p}}~\\unit{€}$.', '$${{g}} \\times {{p}} = ' + ev('g*p') + '$$',
     'Puis le vendeur rend ce qui manque pour aller de $' + ev('g*p') + '~\\unit{€}$ à'
     ' ${{B}}~\\unit{€}$ : on enlève.', '$${{B}} - ' + ev('g*p') + ' = ' + col(ev('B-g*p'))
     + '$$'],
    'Le vendeur rend $' + ev('B-g*p') + '~\\unit{€}$ à Max.')

CINEMA = probleme(
    'Une salle de cinéma a ' + v('g') + ' rangées de ' + v('n') + ' places et un balcon de ' + v('h')
    + ' rangées de ' + v('m') + ' places. ' + v('r') + ' places sont déjà réservées.',
    'Combien de places reste-t-il à vendre ?\n\nIl reste $?$ places à vendre.',
    ev('g*n+h*m-r'),
    [var('g', '2..8'), var('n', '2..9'), var('h', '2..5'), var('m', '2..9'), var('r', '5..40')],
    ['g * n + h * m < 100', 'g * n + h * m - r >= 5', 'n != m'],
    ['On calcule en trois étapes. Les places de la salle : $' + '{{g}} \\times {{n}} = '
     + ev('g*n') + '$ ; celles du balcon : $' + '{{h}} \\times {{m}} = ' + ev('h*m') + '$.',
     'Toutes les places : $' + ev('g*n') + ' + ' + ev('h*m') + ' = ' + ev('g*n+h*m') + '$.',
     'Puis on enlève les places réservées : $' + ev('g*n+h*m') + ' - {{r}} = '
     + col(ev('g*n+h*m-r')) + '$.'],
    'Il reste $' + ev('g*n+h*m-r') + '$ places à vendre.')

SPECS_MIXTES = [
    spec('BO : 4 tables de 6 et 7 tables de 4 = 52', 0, {'g': 4, 'n': 6, 'h': 7, 'm': 4}, '52',
         'correct'),
    spec('Erreur : BO, une seule multiplication (28)', 0, {'g': 4, 'n': 6, 'h': 7, 'm': 4}, '28',
         'incorrect'),
    spec('Erreur : BO, tables comptées (11)', 0, {'g': 4, 'n': 6, 'h': 7, 'm': 4}, '11',
         'incorrect'),
    spec('cahiers : 50 − 6 × 4 = 26', 1, {'g': 6, 'p': 4, 'B': 50}, '26', 'correct'),
    spec('Erreur : cahiers, 50 − 6 − 4 (40)', 1, {'g': 6, 'p': 4, 'B': 50}, '40', 'incorrect'),
    spec('cinéma : 4 × 8 + 3 × 6 − 12 = 38', 2, {'g': 4, 'n': 8, 'h': 3, 'm': 6, 'r': 12}, '38',
         'correct'),
    spec('Erreur : cinéma, réservées non retirées (50)', 2,
         {'g': 4, 'n': 8, 'h': 3, 'm': 6, 'r': 12}, '50', 'incorrect'),
]

# ---- 12. Produits cartésiens (CE2-034) ----
# Le raisonnement (tableau, arbre) est dans la correction, en phrases.

POUPEE = probleme(
    'Une poupée est livrée avec ' + v('p') + ' pantalons et ' + v('t') + ' tee-shirts.',
    'De combien de façons est-il possible d\'habiller la poupée avec un pantalon et un tee-shirt ?'
    '\n\nIl y a $?$ façons de l\'habiller.',
    ev('p*t'), [var('p', '2..6'), var('t', '2..9')], ['p != t'],
    ['Avec **un** pantalon, on peut mettre n\'importe lequel des ' + v('t') + ' tee-shirts.'
     ' Dans un tableau, il y aurait ' + v('p') + ' lignes (les pantalons) et ' + v('t')
     + ' colonnes (les tee-shirts) : chaque case est une façon de l\'habiller.',
     'On compte les cases : $' + '{{p}} \\times {{t}} = ' + col(ev('p*t')) + '$.'],
    'Il y a $' + ev('p*t') + '$ façons d\'habiller la poupée.')

GLACES = probleme(
    'Un glacier propose ' + v('p') + ' parfums de glace et ' + v('t') + ' sortes de cornets.',
    'Combien de glaces différentes (un parfum, un cornet) peut-on composer ?\n\nOn peut composer'
    ' $?$ glaces différentes.',
    ev('p*t'), [var('p', '3..9'), var('t', '2..4')], [],
    ['Chaque parfum peut être mis dans chacun des ' + v('t') + ' cornets. Dans un tableau, les'
     ' parfums seraient les lignes et les cornets les colonnes.',
     '$${{p}} \\times {{t}} = ' + col(ev('p*t')) + '$$'],
    'On peut composer $' + ev('p*t') + '$ glaces différentes.')

CLOWN = probleme(
    'Pour se déguiser, un clown dispose de ' + v('a') + ' chapeaux, de ' + v('b') + ' tee-shirts'
    ' et de ' + v('c') + ' pantalons.',
    'Combien de costumes complets différents (un chapeau, un tee-shirt, un pantalon) le clown'
    ' peut-il faire ?\n\nIl peut faire $?$ costumes.',
    ev('a*b*c'), [var('a', '2..3'), var('b', '2..4'), var('c', '2..3')], [],
    ['On construit un arbre. On part des chapeaux : ' + v('a') + ' branches. Au bout de chaque'
     ' branche, on met les tee-shirts : ' + v('b') + ' branches de plus. Puis les pantalons : '
     + v('c') + ' branches au bout de chacune.',
     'Le nombre de costumes est le nombre de bouts de branches : $' + '{{a}} \\times {{b}}'
     ' \\times {{c}} = ' + col(ev('a*b*c')) + '$.'],
    'Le clown peut faire $' + ev('a*b*c') + '$ costumes.')

MENU = probleme(
    'Un restaurant propose un menu : ' + v('a') + ' entrées, ' + v('b') + ' plats et ' + v('c')
    + ' desserts. On choisit une entrée, un plat et un dessert.',
    'Combien de menus différents peut-on composer ?\n\nOn peut composer $?$ menus différents.',
    ev('a*b*c'), [var('a', '2..4'), var('b', '2..4'), var('c', '2..3')], [],
    ['On construit un arbre : ' + v('a') + ' branches pour les entrées ; au bout de chacune,'
     ' ' + v('b') + ' branches pour les plats ; au bout de chacune, ' + v('c') + ' branches pour'
     ' les desserts.',
     'Chaque chemin de l\'arbre est un menu : $' + '{{a}} \\times {{b}} \\times {{c}} = '
     + col(ev('a*b*c')) + '$.'],
    'On peut composer $' + ev('a*b*c') + '$ menus différents.')

SPECS_CARTESIEN = [
    spec('BO : 3 pantalons, 7 tee-shirts = 21', 0, {'p': 3, 't': 7}, '21', 'correct'),
    spec('Erreur : poupée, 3 + 7 (10)', 0, {'p': 3, 't': 7}, '10', 'incorrect'),
    spec('glaces : 8 parfums, 3 cornets = 24', 1, {'p': 8, 't': 3}, '24', 'correct'),
    spec('Erreur : glaces, 8 + 3 (11)', 1, {'p': 8, 't': 3}, '11', 'incorrect'),
    spec('BO : 2 chapeaux, 3 tee-shirts, 2 pantalons = 12', 2, {'a': 2, 'b': 3, 'c': 2}, '12',
         'correct'),
    spec('Erreur : clown, 2 + 3 + 2 (7)', 2, {'a': 2, 'b': 3, 'c': 2}, '7', 'incorrect'),
    spec('Erreur : clown, deux ensembles seulement (6)', 2, {'a': 2, 'b': 3, 'c': 2}, '6',
         'incorrect'),
    spec('menu : 3 entrées, 4 plats, 3 desserts = 36', 3, {'a': 3, 'b': 4, 'c': 3}, '36',
         'correct'),
    spec('Erreur : menu, 3 × 4 (12)', 3, {'a': 3, 'b': 4, 'c': 3}, '12', 'incorrect'),
]

MODELES = {
    '01-parties-tout': modele(
        "Problèmes parties-tout (jusqu'à 10 000)",
        'Chercher le tout ou une partie avec des nombres jusqu\'à 10 000 : 1 800 billes dont 1 250'
        ' dans le carton vert ; « de plus » qui se calcule par une soustraction ; une partie'
        ' ne peut pas dépasser le tout',
        'Parties-tout', 7,
        [PARTIE, TOUT_DEUX, TOUT_TROIS, DEPART_INCONNU, RETRAIT, COMBIEN_DE_PLUS,
         REGULATION_PARTIE],
        SPECS_PARTIES_TOUT),
    '02-parties-tout-prix': modele(
        'Problèmes parties-tout avec des prix à virgule',
        'Des achats en euros et centimes : 59,90 € + 24,50 € + 9,75 € ; un prix manquant ;'
        ' l\'argent qui reste',
        'Parties-tout', 8, [TROIS_ACHATS, PRIX_MANQUANT, TIRELIRE], SPECS_PRIX,
        options=SANS_ZEROS),
    '03-parties-tout-fractions': modele(
        'Problèmes parties-tout avec des fractions',
        'Des parts de même taille : 3/8 d\'une tablette mangés, quelle fraction reste ? ; 3/10 +'
        ' 4/10 d\'un livre lu ; 9/12 en deux jours dont 4/12 le premier',
        'Addition et Soustraction', 22, [TABLETTE, LIVRE, LIVRE_MANQUANT], SPECS_FRACTIONS,
        options=FRACTIONS_NON_REDUITES, theme='Fractions', domain='Calculer'),
    '04-comparaison': modele(
        'Problèmes de comparaison (jusqu\'à 10 000)',
        'Le plus grand, le plus petit ou l\'écart : Léo 1 188 billes, Lucie 2 075 de plus ; un vélo'
        ' à 249,90 € et un casque à 35,40 €',
        'Comparaison', 2, [PLUS_GRAND, ECART, PLUS_PETIT, DE_MOINS, VELO], SPECS_COMPARAISON,
        options=SANS_ZEROS),
    '05-deux-etapes': modele(
        'Problèmes en deux étapes (jusqu\'à 10 000)',
        'Ajouts et retraits enchaînés : 4 200 + 1 300 − 900 ; deux achats et la monnaie rendue'
        ' sur un billet ; sûr de se tromper ?',
        'Deux étapes', 7, [BIBLIOTHEQUE, BILLET_ENTIER, COURSES, REGULATION_ETAPES],
        SPECS_DEUX_ETAPES, delay=120, options=SANS_ZEROS),
    '06-comparaison-deux-etapes': modele(
        'Problèmes de comparaison en deux étapes',
        'Trouver l\'autre valeur, puis le tout : Léo 188 billes, Lucie 75 de plus, combien en'
        ' tout ? ; Tom a moins de cartes que Sara ; un pull et un pantalon plus cher',
        'Deux étapes', 8, [LEO_LUCIE, SARA_TOM, PULL_PANTALON], SPECS_COMPARAISON_DEUX,
        delay=120, options=SANS_ZEROS),
    '07-multiplicatifs-tout': modele(
        'Problèmes multiplicatifs : le tout',
        'n paquets de p : 6 paquets de 145 feuilles, 7 stylos à 1,50 €, 10 paquets de 125, 100'
        ' cartons de 37, 7 paquets de 80',
        'Multiplicatifs', 9, [PAQUETS, PRIX_UNITE, DIX_PAQUETS, CENT_PAQUETS, DIZAINES],
        SPECS_TOUT, options=SANS_ZEROS),
    '08-nombre-de-parts': modele(
        'Problèmes de partage : le nombre de parts',
        'Combien d\'équipes, de pages, de boîtes : 360 élèves par 8 ; 191 photos à 6 par page (32'
        ' pages) ; 229 œufs par 9 (25 boîtes pleines)',
        'Multiplicatifs', 10, [EQUIPES, PAGES, BOITES], SPECS_PARTS),
    '09-valeur-d-une-part': modele(
        'Problèmes de partage : la valeur d\'une part',
        'Combien chacun : 72 € pour 6 dictionnaires ; 357 roses en 7 bouquets ; 79,60 € pour 4'
        ' chemises',
        'Multiplicatifs', 11, [DICTIONNAIRES, BOUQUETS, CHEMISES], SPECS_PART,
        options=SANS_ZEROS),
    '10-fois-plus-fois-moins': modele(
        'Comparaison multiplicative : fois plus, fois moins',
        'Une trottinette 4 fois plus chère qu\'un casque à 32 € ; 4 fois moins cher ; « fois plus »'
        ' et « de plus » dans le même énoncé',
        'Comparaison', 3, [TROTTINETTE, CASQUE, CAHIER, CLASSEUR, FILLES], SPECS_FOIS),
    '11-problemes-mixtes': modele(
        'Problèmes mixtes en deux ou trois étapes',
        'Multiplications, additions et soustractions : 4 tables de 6 et 7 tables de 4 ; 6 cahiers'
        ' à 4 € sur un billet de 50 € ; un cinéma avec balcon et places réservées',
        'Deux étapes', 9, [RESTAURANT, BILLET_CAHIERS, CINEMA], SPECS_MIXTES, delay=120),
    '12-produit-cartesien': modele(
        'Produits cartésiens : combien de façons ?',
        'Deux ensembles : 3 pantalons × 7 tee-shirts = 21 ; trois ensembles : 2 chapeaux × 3'
        ' tee-shirts × 2 pantalons = 12',
        'Produits cartésiens', 1, [POUPEE, GLACES, CLOWN, MENU], SPECS_CARTESIEN, delay=60),
}

for nom, m in MODELES.items():
    with open(f'{DOSSIER}/{nom}.json', 'w') as f:
        json.dump(m, f, ensure_ascii=False, indent='\t')
        f.write('\n')
print(len(MODELES), 'modèles écrits')
