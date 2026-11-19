"""Écrit les 10 modèles du lot 6 du CM1 (problèmes) dans scripts/questions/cm1-6/.

Phase 0 validée par David le 2026-11-15 (§ 16 et 16 bis du journal
`docs/archive/wip/questions-cm1-progress.md`, « je te suis ») : un seul lot de 10 modèles ; un schéma en
barres (` ```schema-barres `) dans le **corrigé** de 6-1, 6-3 et 6-7, jamais dans l'énoncé.
Patrons : `lot-ce2-5.py` (énoncés, phrases-réponses, corrigés), champ numérique monté au CM1.

Bornes `cycle3.json`, CM1-054 à 060 et 134 : entiers jusqu'à 999 999, décimaux, fractions du
CM1 ; « plus la structure est complexe, plus le champ numérique est réduit » (BO) : trois étapes
→ nombres < 100 ; 056 s'appuie sur les tables (× 10, × 100 au plus) ; 057 « fois plus »,
« fois moins », une ou deux étapes ; 058 deux ou trois étapes, quatre opérations ; 059 tableau,
arbre ou liste (6 × 3 tenues, sommes de deux dés, dominos de 0 à 4) ; 060 bracelets.

Décisions et pièges :
- une case, la réponse suivie de son unité ; « Espaces dès 4 chiffres » (`spacesFromFourDigits`),
  donc les specs écrivent `342\\,320` (`esp()`), et `342320` est une forme à améliorer ;
- décimaux à virgule exigée (motif `a:number`, `decimal()`), tirés en centièmes entiers ; prix
  écrits à deux décimales (`euros()`, comme au CE2) et `zeros: off` (12,50 accepté) ;
- fractions : `reducedFractions: off`, toute fraction égale acceptée (patron CE2 `4f47f8d6`) ;
- aucune `{{if}}` dans une réponse attendue : une variation à deux questions (6-2 V3, 6-7 V4)
  calcule l'attendu par une indicatrice (`b+(1-t)*a`, `(k+1-2*t)*c`) ;
- schéma en barres : longueurs écrites ici, jamais calculées ; étiquettes = texte simple, donc
  les grands nombres y sont groupés à la main (`grp()`) et les décimaux écrits à virgule
  (`virgule()`) ; le schéma du corrigé porte « ? » pour l'inconnue (étape « comprendre ») ;
- corrigé en quatre temps : comprendre, calculer, répondre, vérifier la vraisemblance ;
- conditions : un reste jamais nul en 6-6, quotients toujours différents en 6-10 V1, somme
  jamais multiple de 5 en 6-10 V2 (au moins une pièce de chaque) ;
- niveaux à la suite de ceux en place par nœud (relevé du § 16) : parties-tout 23, 24 ;
  comparaison 4, 5 ; multiplicatifs 12, 13 ; en deux étapes ou plus 10, 11 ; produits
  cartésiens 2 ; optimisation 1.

    python3 docs/wip/questions/lot-cm1-6.py scripts/questions/cm1-6
"""
import json
import sys

DOSSIER = sys.argv[1]
ENTIERS = {'constraints': {'spacesFromFourDigits': True}}
DECIMAUX = {'constraints': {'spacesFromFourDigits': True, 'zeros': 'off'}}
DECIMAUX_FRACTIONS = {'constraints': {'spacesFromFourDigits': True, 'zeros': 'off',
                                      'reducedFractions': 'off'}}
VIRGULE_EXIGEE = {'pattern': 'a:number'}

# ---- Gabarits (comme lot-cm1-5d.py et lot-ce2-5.py) ----


def spec(desc, vi, variables, answers, status, violations=None):
    s = {'description': desc, 'variationIndex': vi,
         'variables': {k: str(x) for k, x in variables.items()},
         'answers': answers if isinstance(answers, list) else [answers],
         'expected': {'status': status}}
    if violations:
        s['expected']['constraintViolations'] = violations
    return s


def modele(title, description, level, variations, specs, options=ENTIERS, delay=90):
    # le rangement (sous-notion du point) est posé par la migration ; plus de quadruplet (ADR 0035)
    return {'title': title, 'description': description, 'grades': ['CM1'], 'level': level,
            'delay': delay, 'status': 'draft', 'options': options, 'variations': variations,
            'testSpecs': specs}


def var(nom, expression):
    return {'name': nom, 'expression': expression}


def probleme(texte, question, reponse, variables, conditions, etapes):
    """Un énoncé à une case ; `reponse` : l'attendu (`{{eval:…}}`) ou un dict de case."""
    v = {'statement': texte + '\n\n' + question, 'variables': variables}
    if conditions:
        v['conditions'] = conditions
    v['blanks'] = [reponse if isinstance(reponse, dict) else {'expectedAnswer': reponse}]
    v['correction'] = {'steps': etapes}
    return v


def decimal(x):
    return {'expectedAnswer': x, 'requiredForm': VIRGULE_EXIGEE}


def v(x):
    return '${{' + x + '}}$'


def ev(x):
    return '{{eval:' + x + '}}'


def evd(x):
    return '{{eval:' + x + ';d}}'


def col(x, k=0):
    return '\\textcolor{{{color:primary.' + str(k) + '}}}{' + x + '}'


def fr(n, d):
    return '\\frac{' + n + '}{' + d + '}'


def selon(k, textes, n=1):
    """`{{if:k==1|…|{{if:k==2|…|…}}}}` : le texte numéro k (à partir de 1)."""
    if len(textes) == 1:
        return textes[0]
    return '{{if:' + k + '==' + str(n) + '|' + textes[0] + '|' + selon(k, textes[1:], n + 1) + '}}'


def esp(n):
    """Réponse tapée avec les espaces de l'école : 342320 → 342\\,320."""
    return f'{n:,}'.replace(',', '\\,')


def grp(x):
    """Entier de 1 000 à 999 999 écrit en texte simple, groupé : « 245 300 » (étiquette d'un
    schéma en barres, que le moteur ne groupe pas)."""
    return (ev(f'floor(({x})/1000)') + ' ' + ev(f'floor(mod(({x}),1000)/100)')
            + ev(f'floor(mod(({x}),100)/10)') + ev(f'mod(({x}),10)'))


def virgule(c):
    """`c` centièmes écrits en texte simple à deux décimales : « 1,61 »."""
    return (ev(f'floor(({c})/100)') + ',' + ev(f'floor(mod(({c}),100)/10)') + ev(f'mod(({c}),10)'))


def euros(c):
    """Prix de `c` centimes, toujours à deux décimales (« 7.50 », affiché « 7,50 »)."""
    return ('{{eval:floor((' + c + ')/100)}}.{{eval:floor(mod(' + c + ',100)/10)}}{{eval:mod('
            + c + ',10)}}')


def prix(c):
    return '$' + euros(c) + '~\\unit{€}$'


def en_euros(c):
    """Attendu d'une case en euros : `c` centimes, écriture décimale à virgule."""
    return decimal('{{eval:(' + c + ')/100;d}}')


def prix_var(nom, bornes_euros, bornes_centimes='1..99'):
    """Les trois variables d'un prix : euros `nomE`, centimes `nomC`, total en centimes `nom`."""
    return [var(nom + 'E', bornes_euros), var(nom + 'C', bornes_centimes),
            var(nom, 'eval:100*' + nom + 'E+' + nom + 'C')]


def prix_spec(nom, euros_, centimes):
    return {nom + 'E': euros_, nom + 'C': centimes, nom: 100 * euros_ + centimes}


def schema(lignes):
    """Bloc schéma en barres, collé à la fin d'une étape du corrigé."""
    return '\n\n```schema-barres\n' + '\n'.join(lignes) + '\n```'


def repete(k, etiquette, kmax=10):
    """`k` segments identiques (k de 2 à kmax), séparés par « ; »."""
    return etiquette + ' ; ' + etiquette + ''.join(
        '{{if:' + k + '>' + str(j - 1) + '| ; ' + etiquette + '|}}' for j in range(3, kmax + 1))


EURO = '~\\text{€}'  # juste après une case : case de nombre
MODELES = {}

# =============== 6-1. CM1-054 : parties-tout, entiers jusqu'à 999 999 ===============

# t = 0 : deux parties ; t = 1 : trois parties (le troisième terme est multiplié par t)
PT_TOUT = probleme(
    'Un parc d\'attractions a reçu ' + v('a') + ' visiteurs en juillet et ' + v('b')
    + ' visiteurs en août{{if:t==1| ; en septembre, il en a reçu ${{c}}$|}}.',
    'Combien de visiteurs le parc a-t-il reçus en {{if:t==1|trois|deux}} mois ?\n\nLe parc a'
    ' reçu $?$ visiteurs.',
    ev('a+b+t*c'),
    [var('a', '15000..400000'), var('b', '15000..400000'), var('c', '15000..190000'),
     var('t', '0..1')],
    ['a + b + c <= 999999'],
    ['Chaque mois est une **partie** ; on cherche **le tout** : on ajoute les parties.'
     + schema(['Visiteurs : ' + grp('a') + ' (3) ; ' + grp('b') + ' (3){{if:t==1| ; ' + grp('c')
               + ' (2)|}} = ?']),
     '$${{a}} + {{b}}{{if:t==1| + {{c}}|}} = ' + col(ev('a+b+t*c')) + '$$',
     'Le parc a reçu $' + ev('a+b+t*c') + '$ visiteurs en {{if:t==1|trois|deux}} mois.',
     'Le tout est plus grand que chaque partie : $' + ev('a+b+t*c') + '$ est plus grand que '
     + v('a') + ' et que ' + v('b') + '. C\'est vraisemblable.'])

PT_PARTIE = probleme(
    'La médiathèque de la ville possède ' + v('T') + ' livres. Parmi eux, ' + v('a')
    + ' sont des romans ; les autres sont des documentaires.',
    'Combien la médiathèque possède-t-elle de documentaires ?\n\nElle possède $?$ documentaires.',
    ev('T-a'), [var('T', '20000..600000'), var('a', '8000..500000')], ['T - a >= 5000'],
    ['Tous les livres, c\'est **le tout** ; les romans sont une partie, on cherche l\'autre'
     ' partie : on enlève.'
     + schema(['Tous les livres : ' + grp('T') + ' (8)',
               'Romans, documentaires : ' + grp('a') + ' (5) ; ? (3)']),
     '$${{T}} - {{a}} = ' + col(ev('T-a')) + '$$',
     'La médiathèque possède $' + ev('T-a') + '$ documentaires.',
     'On vérifie en remettant les deux parties ensemble : ${{a}} + ' + ev('T-a')
     + ' = {{T}}$, on retrouve bien le tout.'])

# BO : « il m'en reste » alors qu'il faut additionner
PT_DEPART = probleme(
    'Un grossiste avait des bouteilles d\'eau dans son entrepôt. Il en a vendu ' + v('a')
    + ' et il lui en reste ' + v('b') + '.',
    'Combien y avait-il de bouteilles dans l\'entrepôt avant la vente ?\n\nIl y avait $?$'
    ' bouteilles.',
    ev('a+b'), [var('a', '12000..500000'), var('b', '3000..400000')], ['a + b <= 999999', 'a != b'],
    ['Les bouteilles du début, c\'est **le tout** : celles qui sont vendues et celles qui'
     ' restent. « Il en reste » ne veut pas dire qu\'on enlève : on cherche le tout, on ajoute.'
     + schema(['Au début : ? (8)', 'Vendues, restantes : ' + grp('a') + ' (5) ; ' + grp('b')
               + ' (3)']),
     '$${{a}} + {{b}} = ' + col(ev('a+b')) + '$$',
     'Il y avait $' + ev('a+b') + '$ bouteilles dans l\'entrepôt.',
     'On vérifie : $' + ev('a+b') + ' - {{a}} = {{b}}$ ; après la vente, il en reste bien '
     + v('b') + '.'])

MODELES['01-parties-tout'] = modele(
    "Problèmes parties-tout (jusqu'à 999 999)",
    'Chercher le tout (deux ou trois parties), une partie, ou l\'état de départ (« il en a vendu'
    ' 125 400, il lui en reste 86 350 ») avec des nombres jusqu\'à 999 999 ; schéma en barres'
    ' dans le corrigé', 23, [PT_TOUT, PT_PARTIE, PT_DEPART],
    [spec('deux mois : 245 300 + 187 650 = 432 950', 0,
          {'a': 245300, 'b': 187650, 'c': 50000, 't': 0}, esp(432950), 'correct'),
     spec('Erreur : deux mois, soustraction (57 650)', 0,
          {'a': 245300, 'b': 187650, 'c': 50000, 't': 0}, esp(57650), 'incorrect'),
     spec('trois mois : 125 000 + 230 400 + 98 750 = 454 150', 0,
          {'a': 125000, 'b': 230400, 'c': 98750, 't': 1}, esp(454150), 'correct'),
     spec('Erreur : trois mois, le troisième oublié (355 400)', 0,
          {'a': 125000, 'b': 230400, 'c': 98750, 't': 1}, esp(355400), 'incorrect'),
     spec('Forme : sans les espaces (432950)', 0,
          {'a': 245300, 'b': 187650, 'c': 50000, 't': 0}, '432950', 'unoptimal_form',
          ['spaces']),
     spec('partie : 356 200 − 148 750 = 207 450', 1, {'T': 356200, 'a': 148750}, esp(207450),
          'correct'),
     spec('Erreur : partie, les deux ajoutés (504 950)', 1, {'T': 356200, 'a': 148750},
          esp(504950), 'incorrect'),
     spec('Erreur : partie, retenue oubliée (217 450)', 1, {'T': 356200, 'a': 148750},
          esp(217450), 'incorrect'),
     spec('départ : 125 400 vendues, 86 350 restent → 211 750', 2, {'a': 125400, 'b': 86350},
          esp(211750), 'correct'),
     spec('Erreur : départ, « il reste » lu soustraction (39 050)', 2, {'a': 125400, 'b': 86350},
          esp(39050), 'incorrect')])

# =============== 6-2. CM1-054 : parties-tout, décimaux et fractions ===============
# Longueurs tirées en centièmes (deux décimales voulues : mod(…,10) != 0)

PT_RELAIS = probleme(
    'Trois amis courent un relais. Lina parcourt $' + evd('a/100') + '~\\unit{km}$, Tom $'
    + evd('b/100') + '~\\unit{km}$ et Sami $' + evd('c/100') + '~\\unit{km}$.',
    'Quelle distance les trois amis ont-ils parcourue en tout ?\n\nIls ont parcouru'
    ' $?~\\text{km}$.',
    decimal(evd('(a+b+c)/100')),
    [var('a', '105..395'), var('b', '105..395'), var('c', '105..395')],
    ['mod(a,10) != 0', 'mod(b,10) != 0', 'mod(c,10) != 0'],
    ['Les trois distances sont les **parties** ; on cherche **le tout** : on ajoute, en'
     ' alignant les virgules (unités sous unités, dixièmes sous dixièmes, centièmes sous'
     ' centièmes).',
     '$$' + evd('a/100') + ' + ' + evd('b/100') + ' + ' + evd('c/100') + ' = '
     + col(evd('(a+b+c)/100')) + '$$',
     'Les trois amis ont parcouru $' + evd('(a+b+c)/100') + '~\\unit{km}$ en tout.',
     'Ordre de grandeur, en arrondissant chaque distance à l\'unité : $'
     + ev('floor(a/100+0.5)') + ' + ' + ev('floor(b/100+0.5)') + ' + ' + ev('floor(c/100+0.5)')
     + ' = ' + ev('floor(a/100+0.5)+floor(b/100+0.5)+floor(c/100+0.5)') + '$ ; le résultat en'
     ' est proche, il est vraisemblable.'])

PT_PRIX = probleme(
    'Lucas a payé ' + prix('a+b') + ' pour un sac et une casquette. Le sac coûte ' + prix('a')
    + '.',
    'Combien coûte la casquette ?\n\nLa casquette coûte $?' + EURO + '$.',
    en_euros('b'), prix_var('a', '15..60') + prix_var('b', '6..19'), [],
    ['Le sac et la casquette, c\'est **le tout** : ' + prix('a+b') + '. On cherche une partie,'
     ' le prix de la casquette : on enlève le prix du sac.',
     '$$' + euros('a+b') + ' - ' + euros('a') + ' = ' + col(euros('b')) + '$$',
     'La casquette coûte ' + prix('b') + '.',
     'On vérifie : $' + euros('a') + ' + ' + euros('b') + ' = ' + euros('a+b') + '$, on retrouve'
     ' bien ce que Lucas a payé.'])

# t = 0 : on donne les deux parties, on cherche le tout ; t = 1 : on donne le tout et une partie.
# Les fractions de l'énoncé et l'attendu passent par des indicatrices (aucune `{{if}}` autour
# d'une fraction).
PREMIERE = fr(ev('a+t*b'), '{{d}}')   # t = 0 : a/d (matin) ; t = 1 : (a+b)/d (journée)
SECONDE = fr(ev('b+t*(a-b)'), '{{d}}')  # t = 0 : b/d (après-midi) ; t = 1 : a/d (matin)
CHERCHEE = fr(ev('b+(1-t)*a'), '{{d}}')  # t = 0 : (a+b)/d ; t = 1 : b/d
PT_FRACTIONS = probleme(
    'Lou peint une fresque. {{if:t==0|Le matin, elle en peint|Dans la journée, elle en peint en'
    ' tout}} $' + PREMIERE + '$ ; {{if:t==0|l\'après-midi, elle en peint|le matin, elle en'
    ' avait peint}} $' + SECONDE + '$.',
    'Quelle fraction de la fresque Lou a-t-elle peinte {{if:t==0|dans toute la journée|'
    'l\'après-midi}} ?\n\nElle a peint $?$ de la fresque {{if:t==0|dans la journée|'
    'l\'après-midi}}.',
    fr(ev('b+(1-t)*a'), '{{d}}'),
    [var('d', '5..20'), var('a', '1..{{eval:d-2}}'), var('b', '1..{{eval:d-a-1}}'),
     var('t', '0..1')], [],
    ['{{if:t==0|Le matin et l\'après-midi sont les deux **parties** ; on cherche **le tout** :'
     ' on ajoute.|La journée, c\'est **le tout** ; le matin est une partie, on cherche l\'autre'
     ' : on enlève.}} Les parts sont de même taille : on calcule sur les numérateurs, le'
     ' dénominateur ' + v('d') + ' ne change pas.',
     '$$' + PREMIERE + ' {{if:t==0|+|-}} ' + SECONDE + ' = ' + col(CHERCHEE) + '$$',
     'Lou a peint $' + CHERCHEE + '$ de la fresque {{if:t==0|dans la journée|l\'après-midi}}.',
     'On vérifie : le matin $' + fr('{{a}}', '{{d}}') + '$ et l\'après-midi $'
     + fr('{{b}}', '{{d}}') + '$ font bien $' + fr(ev('a+b'), '{{d}}') + '$ ; c\'est moins que'
     ' la fresque entière, $' + fr('{{d}}', '{{d}}') + '$.'])

FRACTION_TOUT = {'d': 12, 'a': 5, 'b': 4, 't': 0}
FRACTION_PARTIE = {'d': 10, 'a': 3, 'b': 4, 't': 1}
MODELES['02-parties-tout-decimaux-fractions'] = modele(
    'Problèmes parties-tout : décimaux, fractions',
    'Le tout ou une partie avec des décimaux (1,25 km + 2,48 km + 1,36 km ; un prix à virgule'
    ' manquant) ou des fractions de même dénominateur (5/12 le matin, 4/12 l\'après-midi)', 24,
    [PT_RELAIS, PT_PRIX, PT_FRACTIONS],
    [spec('relais : 1,25 + 2,48 + 1,36 = 5,09', 0, {'a': 125, 'b': 248, 'c': 136}, '5,09',
          'correct'),
     spec('Erreur : relais, retenue des centièmes oubliée (4,09)', 0,
          {'a': 125, 'b': 248, 'c': 136}, '4,09', 'incorrect'),
     spec('Erreur : relais, un coureur oublié (3,73)', 0, {'a': 125, 'b': 248, 'c': 136}, '3,73',
          'incorrect'),
     spec('relais : 1,25 + 1,35 + 1,15 = 3,75', 0, {'a': 125, 'b': 135, 'c': 115}, '3,75',
          'correct'),
     spec('Forme : 509/100', 0, {'a': 125, 'b': 248, 'c': 136}, '\\frac{509}{100}', 'bad_form',
          ['form']),
     spec('prix : 47,35 − 34,75 = 12,60 €', 1, {**prix_spec('a', 34, 75), **prix_spec('b', 12, 60)},
          '12,6', 'correct'),
     spec('Zéro final accepté : 12,60 €', 1, {**prix_spec('a', 34, 75), **prix_spec('b', 12, 60)},
          '12,60', 'correct'),
     spec('Erreur : prix, les deux ajoutés (82,10 €)', 1,
          {**prix_spec('a', 34, 75), **prix_spec('b', 12, 60)}, '82,1', 'incorrect'),
     spec('Erreur : prix, centimes soustraits à l\'envers (13,40 €)', 1,
          {**prix_spec('a', 34, 75), **prix_spec('b', 12, 60)}, '13,4', 'incorrect'),
     spec('fractions, le tout : 5/12 + 4/12 = 9/12', 2, FRACTION_TOUT, '\\frac{9}{12}',
          'correct'),
     spec('fractions, le tout : 3/4, fraction égale', 2, FRACTION_TOUT, '\\frac{3}{4}', 'correct'),
     spec('Erreur : dénominateurs ajoutés (9/24)', 2, FRACTION_TOUT, '\\frac{9}{24}', 'incorrect'),
     spec('Erreur : dénominateur oublié (9)', 2, FRACTION_TOUT, '9', 'incorrect'),
     spec('fractions, une partie : 7/10 − 3/10 = 4/10', 2, FRACTION_PARTIE, '\\frac{4}{10}',
          'correct'),
     spec('fractions, une partie : 2/5, fraction égale', 2, FRACTION_PARTIE, '\\frac{2}{5}',
          'correct'),
     spec('Erreur : une partie, les deux ajoutés (10/10)', 2, FRACTION_PARTIE, '\\frac{10}{10}',
          'incorrect')],
    options=DECIMAUX_FRACTIONS)

# =============== 6-3. CM1-134 : comparaison additive ===============

CMP_PLUS_GRAND = probleme(
    'En 2025, la ville de Brévin comptait ' + v('a') + ' habitants. La ville de Corlay en'
    ' comptait ' + v('d') + ' de plus que Brévin.',
    'Combien d\'habitants la ville de Corlay comptait-elle ?\n\nCorlay comptait $?$ habitants.',
    ev('a+d'), [var('a', '15000..700000'), var('d', '1500..150000')], ['a + d <= 999999'],
    ['Corlay a autant d\'habitants que Brévin, et encore ' + v('d') + ' de plus : on ajoute'
     ' l\'écart.'
     + schema(['Brévin : ' + grp('a') + ' (5)', 'Corlay : ' + grp('a') + ' (5) ; ' + grp('d')
               + ' (2) = ?']),
     '$${{a}} + {{d}} = ' + col(ev('a+d')) + '$$',
     'Corlay comptait $' + ev('a+d') + '$ habitants.',
     'Corlay a plus d\'habitants que Brévin : $' + ev('a+d') + '$ est bien plus grand que '
     + v('a') + ', et $' + ev('a+d') + ' - {{a}} = {{d}}$.'])

# « combien de plus ? » : une soustraction
CMP_ECART = probleme(
    'Cette année, le festival de Lirac a accueilli ' + v('f') + ' spectateurs. L\'an dernier, il'
    ' en avait accueilli ' + v('g') + '.',
    'Combien de spectateurs de plus le festival a-t-il accueillis cette année ?\n\nIl en a'
    ' accueilli $?$ de plus.',
    ev('f-g'), [var('f', '12000..999999'), var('g', '10000..990000')],
    ['f - g >= 1000', 'f - g <= 200000'],
    ['On cherche **l\'écart** : ce qu\'il faut ajouter à ' + v('g') + ' pour arriver à ' + v('f')
     + '. C\'est une soustraction, même si la question dit « de plus ».'
     + schema(['L\'an dernier : ' + grp('g') + ' (5)', 'Cette année : ' + grp('g')
               + ' (5) ; ? (2) = ' + grp('f')]),
     '$${{f}} - {{g}} = ' + col(ev('f-g')) + '$$',
     'Le festival a accueilli $' + ev('f-g') + '$ spectateurs de plus cette année.',
     'On vérifie : ${{g}} + ' + ev('f-g') + ' = {{f}}$ ; l\'écart est plus petit que chacun'
     ' des deux nombres, c\'est vraisemblable.'])

# BO : « de plus » qui demande une soustraction
CMP_PLUS_PETIT = probleme(
    'Le stade de Marvel peut accueillir ' + v('a') + ' spectateurs. Il a ' + v('d') + ' places'
    ' de plus que le stade de Cimbres.',
    'Combien de places le stade de Cimbres a-t-il ?\n\nLe stade de Cimbres a $?$ places.',
    ev('a-d'), [var('a', '25000..99000'), var('d', '1200..20000')], ['a - d >= 5000'],
    ['Marvel a plus de places : c\'est Cimbres qui en a ' + v('d') + ' de **moins**. On enlève'
     ' l\'écart, même si l\'énoncé dit « de plus ».'
     + schema(['Marvel : ' + grp('a') + ' (7)', 'Cimbres : ? (5) ; -' + grp('d') + ' (2)']),
     '$${{a}} - {{d}} = ' + col(ev('a-d')) + '$$',
     'Le stade de Cimbres a $' + ev('a-d') + '$ places.',
     'On vérifie : $' + ev('a-d') + ' + {{d}} = {{a}}$ ; Marvel a bien ' + v('d') + ' places de'
     ' plus que Cimbres.'])

# BO : Alix 1,61 m, 13 cm de plus que Bruno ; taille d'Alix en centimètres (A)
CMP_DEUX_UNITES = probleme(
    'Alix mesure $' + evd('A/100') + '~\\unit{m}$. Elle mesure ${{d}}~\\unit{cm}$ de plus que'
    ' Bruno.',
    'Combien mesure Bruno ?\n\nBruno mesure $?~\\text{m}$.',
    decimal(evd('(A-d)/100')), [var('A', '132..175'), var('d', '5..25')],
    ['mod(A,10) != 0', 'mod(A-d,10) != 0'],
    ['Alix est plus grande : Bruno mesure ${{d}}~\\unit{cm}$ de **moins** qu\'Alix. On enlève'
     ' l\'écart, après avoir tout écrit dans la **même unité** : ${{d}}~\\unit{cm} = '
     + evd('d/100') + '~\\unit{m}$.'
     + schema(['Alix : ' + virgule('A') + ' m (6)', 'Bruno : ? (5) ; -{{d}} cm (1)']),
     '$$' + evd('A/100') + ' - ' + evd('d/100') + ' = ' + col(evd('(A-d)/100')) + '$$',
     'Bruno mesure $' + evd('(A-d)/100') + '~\\unit{m}$.',
     'Bruno est un peu plus petit qu\'Alix, de quelques centimètres seulement : $'
     + evd('(A-d)/100') + '~\\unit{m}$ est vraisemblable.'])

MODELES['03-comparaison'] = modele(
    'Problèmes de comparaison',
    'Le plus grand, l\'écart (« combien de plus ? »), le plus petit quand l\'énoncé dit « de'
    ' plus » ; décimaux et deux unités (Alix 1,61 m, 13 cm de plus que Bruno) ; schéma en'
    ' barres dans le corrigé', 4,
    [CMP_PLUS_GRAND, CMP_ECART, CMP_PLUS_PETIT, CMP_DEUX_UNITES],
    [spec('plus grand : 318 450 + 24 600 = 343 050', 0, {'a': 318450, 'd': 24600}, esp(343050),
          'correct'),
     spec('Erreur : plus grand, l\'écart enlevé (293 850)', 0, {'a': 318450, 'd': 24600},
          esp(293850), 'incorrect'),
     spec('écart : 152 300 − 128 750 = 23 550', 1, {'f': 152300, 'g': 128750}, esp(23550),
          'correct'),
     spec('Erreur : écart, « de plus » lu addition (281 050)', 1, {'f': 152300, 'g': 128750},
          esp(281050), 'incorrect'),
     spec('Erreur : écart, une valeur donnée pour l\'écart (152 300)', 1,
          {'f': 152300, 'g': 128750}, esp(152300), 'incorrect'),
     spec('plus petit : 48 500 − 6 250 = 42 250', 2, {'a': 48500, 'd': 6250}, esp(42250),
          'correct'),
     spec('Erreur : plus petit, « de plus » lu addition (54 750)', 2, {'a': 48500, 'd': 6250},
          esp(54750), 'incorrect'),
     spec('BO : 1,61 m − 13 cm = 1,48 m', 3, {'A': 161, 'd': 13}, '1,48', 'correct'),
     spec('Erreur : « de plus » lu addition (1,74 m)', 3, {'A': 161, 'd': 13}, '1,74',
          'incorrect'),
     spec('Erreur : la réponse en centimètres (148)', 3, {'A': 161, 'd': 13}, '148', 'incorrect'),
     spec('Erreur : 13 cm lus 1,3 m (0,31)', 3, {'A': 161, 'd': 13}, '0,31', 'incorrect')])

# =============== 6-4. CM1-055 : additifs en deux ou trois étapes ===============

DE_STOCK = probleme(
    'Le matin, un entrepôt contient ' + v('a') + ' colis. Dans la journée, des camions en'
    ' apportent ' + v('b') + ', puis d\'autres en emportent ' + v('c') + '.',
    'Combien de colis l\'entrepôt contient-il le soir ?\n\nIl contient $?$ colis.',
    ev('a+b-c'), [var('a', '20000..600000'), var('b', '5000..300000'), var('c', '5000..400000')],
    ['a + b <= 999999', 'a + b - c >= 5000', 'b != c'],
    ['On calcule en deux étapes, dans l\'ordre de la journée : d\'abord l\'arrivée (on ajoute),'
     ' puis le départ (on enlève).',
     '$${{a}} + {{b}} = ' + ev('a+b') + '$$',
     '$$' + ev('a+b') + ' - {{c}} = ' + col(ev('a+b-c')) + '$$',
     'Le soir, l\'entrepôt contient $' + ev('a+b-c') + '$ colis.',
     'Il est arrivé {{if:b>c|plus|moins}} de colis qu\'il n\'en est parti : le soir, il y en a'
     ' {{if:b>c|plus|moins}} que le matin. C\'est cohérent.'])

DE_COMPARAISON = probleme(
    'En janvier, le musée de Vaulx a reçu ' + v('a') + ' visiteurs. En février, il en a reçu '
    + v('d') + ' de moins qu\'en janvier.',
    'Combien de visiteurs le musée a-t-il reçus en janvier et en février ensemble ?\n\nIl a reçu'
    ' $?$ visiteurs.',
    ev('2*a-d'), [var('a', '10000..450000'), var('d', '1000..90000')],
    ['a - d >= 5000', '2 * a - d <= 999999'],
    ['On calcule en deux étapes : d\'abord les visiteurs de février (il y en a moins : on enlève'
     ' l\'écart), puis les deux mois ensemble (on ajoute).',
     '$${{a}} - {{d}} = ' + ev('a-d') + '$$',
     '$${{a}} + ' + ev('a-d') + ' = ' + col(ev('2*a-d')) + '$$',
     'Le musée a reçu $' + ev('2*a-d') + '$ visiteurs en janvier et en février.',
     'Février a moins de visiteurs que janvier : le total est un peu plus petit que deux fois'
     ' janvier ($2 \\times {{a}} = ' + ev('2*a') + '$). C\'est vraisemblable.'])

DE_MONNAIE = probleme(
    'Au marché, Clara achète un panier de fruits à ' + prix('a') + ' et un fromage à ' + prix('b')
    + '. Elle paie avec un billet de ${{B}}~\\unit{€}$.',
    'Combien la marchande doit-elle lui rendre ?\n\nElle rend $?' + EURO + '$.',
    en_euros('100*B-a-b'), [var('B', '20|50')] + prix_var('a', '5..14') + prix_var('b', '2..9'),
    ['a + b <= 100 * B - 100'],
    ['On calcule en deux étapes : d\'abord le prix des deux achats (on ajoute), puis ce qui'
     ' manque pour aller jusqu\'à ${{B}}~\\unit{€}$ (on enlève).',
     '$$' + euros('a') + ' + ' + euros('b') + ' = ' + euros('a+b') + '$$',
     '$${{B}} - ' + euros('a+b') + ' = ' + col(euros('100*B-a-b')) + '$$',
     'La marchande rend ' + prix('100*B-a-b') + ' à Clara.',
     'On vérifie : $' + euros('a+b') + ' + ' + euros('100*B-a-b') + ' = {{B}}$, on retrouve le'
     ' billet.'])

# Trois étapes : champ réduit (nombres < 100)
DE_TROIS = probleme(
    'Un bus part du dépôt avec ' + v('a') + ' passagers. Au premier arrêt, ' + v('b') + ' passagers'
    ' descendent et ' + v('c') + ' montent. Au deuxième arrêt, ' + v('f') + ' passagers'
    ' descendent.',
    'Combien de passagers y a-t-il dans le bus après le deuxième arrêt ?\n\nIl y a $?$ passagers.',
    ev('a-b+c-f'),
    [var('a', '20..60'), var('b', '3..15'), var('c', '3..20'), var('f', '3..20')],
    ['a - b + c <= 90', 'a - b + c - f >= 5', 'b != c', 'c != b + f'],
    ['On calcule en trois étapes, dans l\'ordre du trajet : on enlève ceux qui descendent, on'
     ' ajoute ceux qui montent.',
     '$${{a}} - {{b}} = ' + ev('a-b') + '$$',
     '$$' + ev('a-b') + ' + {{c}} = ' + ev('a-b+c') + '$$',
     '$$' + ev('a-b+c') + ' - {{f}} = ' + col(ev('a-b+c-f')) + '$$',
     'Après le deuxième arrêt, il y a $' + ev('a-b+c-f') + '$ passagers dans le bus.',
     'En tout, ' + v('c') + ' passagers sont montés et $' + ev('b+f') + '$ sont descendus : il'
     ' y en a {{if:c>b+f|plus|moins}} qu\'au départ. C\'est cohérent.'])

MODELES['04-additifs-deux-ou-trois-etapes'] = modele(
    'Problèmes additifs en deux ou trois étapes',
    'Un stock, une arrivée, un départ ; « de moins » puis le total ; deux achats à virgule et la'
    ' monnaie sur un billet ; un bus et ses deux arrêts (trois étapes)', 10,
    [DE_STOCK, DE_COMPARAISON, DE_MONNAIE, DE_TROIS],
    [spec('stock : 240 000 + 85 500 − 120 300 = 205 200', 0,
          {'a': 240000, 'b': 85500, 'c': 120300}, esp(205200), 'correct'),
     spec('Erreur : stock, le départ oublié (325 500)', 0, {'a': 240000, 'b': 85500, 'c': 120300},
          esp(325500), 'incorrect'),
     spec('Erreur : stock, tout ajouté (445 800)', 0, {'a': 240000, 'b': 85500, 'c': 120300},
          esp(445800), 'incorrect'),
     spec('musée : 125 400 + (125 400 − 18 600) = 232 200', 1, {'a': 125400, 'd': 18600},
          esp(232200), 'correct'),
     spec('Erreur : musée, février seul (106 800)', 1, {'a': 125400, 'd': 18600}, esp(106800),
          'incorrect'),
     spec('Erreur : musée, janvier + l\'écart (144 000)', 1, {'a': 125400, 'd': 18600},
          esp(144000), 'incorrect'),
     spec('Erreur : musée, « de moins » lu « de plus » (269 400)', 1, {'a': 125400, 'd': 18600},
          esp(269400), 'incorrect'),
     spec('monnaie : 20 − (8,45 + 3,70) = 7,85 €', 2,
          {'B': 20, **prix_spec('a', 8, 45), **prix_spec('b', 3, 70)}, '7,85', 'correct'),
     spec('Erreur : monnaie, un seul achat retiré (11,55 €)', 2,
          {'B': 20, **prix_spec('a', 8, 45), **prix_spec('b', 3, 70)}, '11,55', 'incorrect'),
     spec('Erreur : monnaie, le prix des achats (12,15 €)', 2,
          {'B': 20, **prix_spec('a', 8, 45), **prix_spec('b', 3, 70)}, '12,15', 'incorrect'),
     spec('bus : 42 − 8 + 12 − 9 = 37', 3, {'a': 42, 'b': 8, 'c': 12, 'f': 9}, '37', 'correct'),
     spec('Erreur : bus, tout ajouté (71)', 3, {'a': 42, 'b': 8, 'c': 12, 'f': 9}, '71',
          'incorrect'),
     spec('Erreur : bus, le deuxième arrêt oublié (46)', 3, {'a': 42, 'b': 8, 'c': 12, 'f': 9},
          '46', 'incorrect'),
     spec('Erreur : bus, tout enlevé (13)', 3, {'a': 42, 'b': 8, 'c': 12, 'f': 9}, '13',
          'incorrect')],
    options=DECIMAUX, delay=120)

# =============== 6-5. CM1-056 : multiplicatifs, partage exact ===============
# p = q × m, q de 2 à 10 (les tables), m = 1, 10 ou 100 (z = 1, 2, 3)
FACTEUR = [var('q', '2..10'), var('z', '1..3'),
           var('m', 'eval:1+9*min(max(z-1,0),1)+90*min(max(z-2,0),1)'), var('p', 'eval:q*m')]


def table(g):
    """La ligne qui s'appuie sur la table de g, puis sur les dizaines ou les centaines."""
    base = 'Dans la table de ${{' + g + '}}$ : ${{' + g + '}} \\times {{q}} = ' + ev(g + '*q') + '$'
    return selon('z', [
        base + '.',
        base + ' ; avec des dizaines : ${{' + g + '}} \\times {{p}} = ' + ev(g + '*p') + '$ ('
        + ev(g + '*q') + ' dizaines).',
        base + ' ; avec des centaines : ${{' + g + '}} \\times {{p}} = ' + ev(g + '*p') + '$ ('
        + ev(g + '*q') + ' centaines).'])


MU_TOUT = probleme(
    'Une papeterie reçoit ' + v('g') + ' boîtes de ' + v('p') + ' trombones.',
    'Combien de trombones la papeterie reçoit-elle en tout ?\n\nElle reçoit $?$ trombones.',
    ev('g*p'), [var('g', '2..10')] + FACTEUR, [],
    [v('g') + ' boîtes de ' + v('p') + ' trombones, c\'est ' + v('g') + ' fois ' + v('p')
     + ' : on multiplie.',
     table('g'),
     '$${{g}} \\times {{p}} = ' + col(ev('g*p')) + '$$',
     'La papeterie reçoit $' + ev('g*p') + '$ trombones.',
     'On vérifie en partageant : $' + ev('g*p') + ' \\div {{g}} = {{p}}$ trombones par boîte.'])

MU_PART = probleme(
    'Madame Lemoine partage $' + ev('g*p') + '~\\unit{€}$ en parts égales entre ses ' + v('g')
    + ' petits-enfants.',
    'Combien chacun reçoit-il ?\n\nChacun reçoit $?' + EURO + '$.',
    ev('p'), [var('g', '2..10')] + FACTEUR, [],
    ['On partage $' + ev('g*p') + '$ en ' + v('g') + ' parts égales : on cherche le nombre qui, '
     + v('g') + ' fois, fait $' + ev('g*p') + '$. On divise.',
     table('g'),
     '$$' + ev('g*p') + ' \\div {{g}} = ' + col('{{p}}') + '$$',
     'Chacun reçoit ${{p}}~\\unit{€}$.',
     'On vérifie : ${{g}} \\times {{p}} = ' + ev('g*p') + '$, on retrouve la somme partagée.'])

MU_PARTS = probleme(
    'On découpe un ruban de $' + ev('g*p') + '~\\unit{cm}$ en morceaux de ${{p}}~\\unit{cm}$.',
    'Combien de morceaux obtient-on ?\n\nOn obtient $?$ morceaux.',
    ev('g'), [var('g', '2..10')] + FACTEUR, [],
    ['On cherche combien de fois il y a ${{p}}~\\unit{cm}$ dans $' + ev('g*p') + '~\\unit{cm}$ :'
     ' on divise.',
     selon('z', [
         'Dans la table de ${{q}}$ : $' + ev('g') + ' \\times {{q}} = ' + ev('g*q') + '$.',
         'Dans la table de ${{q}}$ : ${{g}} \\times {{q}} = ' + ev('g*q') + '$ ; avec des'
         ' dizaines : ${{g}} \\times {{p}} = ' + ev('g*p') + '$.',
         'Dans la table de ${{q}}$ : ${{g}} \\times {{q}} = ' + ev('g*q') + '$ ; avec des'
         ' centaines : ${{g}} \\times {{p}} = ' + ev('g*p') + '$.']),
     '$$' + ev('g*p') + ' \\div {{p}} = ' + col('{{g}}') + '$$',
     'On obtient ' + v('g') + ' morceaux.',
     'On vérifie : ' + v('g') + ' morceaux de ${{p}}~\\unit{cm}$ font ${{g}} \\times {{p}} = '
     + ev('g*p') + '~\\unit{cm}$, tout le ruban.'])

MODELES['05-multiplicatifs-partage-exact'] = modele(
    'Problèmes multiplicatifs : partage exact',
    'Le tout (7 boîtes de 80 trombones), la valeur d\'une part (560 € entre 7), le nombre de'
    ' parts (un ruban de 560 cm en morceaux de 80 cm), appuyés sur les tables', 12,
    [MU_TOUT, MU_PART, MU_PARTS],
    [spec('tout : 7 boîtes de 80 = 560', 0, {'g': 7, 'q': 8, 'z': 2, 'm': 10, 'p': 80}, '560',
          'correct'),
     spec('Erreur : tout, 7 + 80 (87)', 0, {'g': 7, 'q': 8, 'z': 2, 'm': 10, 'p': 80}, '87',
          'incorrect'),
     spec('Erreur : tout, le zéro oublié (56)', 0, {'g': 7, 'q': 8, 'z': 2, 'm': 10, 'p': 80},
          '56', 'incorrect'),
     spec('tout : 6 boîtes de 400 = 2 400', 0, {'g': 6, 'q': 4, 'z': 3, 'm': 100, 'p': 400},
          esp(2400), 'correct'),
     spec('part : 560 € entre 7 = 80 €', 1, {'g': 7, 'q': 8, 'z': 2, 'm': 10, 'p': 80}, '80',
          'correct'),
     spec('Erreur : part, 560 − 7 (553)', 1, {'g': 7, 'q': 8, 'z': 2, 'm': 10, 'p': 80}, '553',
          'incorrect'),
     spec('Erreur : part, le zéro oublié (8)', 1, {'g': 7, 'q': 8, 'z': 2, 'm': 10, 'p': 80}, '8',
          'incorrect'),
     spec('part : 54 € entre 9 = 6 €', 1, {'g': 9, 'q': 6, 'z': 1, 'm': 1, 'p': 6}, '6', 'correct'),
     spec('parts : 560 cm en morceaux de 80 = 7', 2, {'g': 7, 'q': 8, 'z': 2, 'm': 10, 'p': 80},
          '7', 'correct'),
     spec('Erreur : parts, la longueur d\'un morceau (80)', 2,
          {'g': 7, 'q': 8, 'z': 2, 'm': 10, 'p': 80}, '80', 'incorrect'),
     spec('Erreur : parts, 560 − 80 (480)', 2, {'g': 7, 'q': 8, 'z': 2, 'm': 10, 'p': 80}, '480',
          'incorrect')])

# =============== 6-6. CM1-056 : partage avec un reste ===============
# N = n × q + r, n de 2 à 9, reste r jamais nul, N ≤ 99
RESTE = [var('n', '2..9'), var('q', '2..{{eval:floor(98/n)}}'), var('r', '1..{{eval:n-1}}')]
RESTE_CONDITIONS = ['n * q + r <= 99']
DIVISION = '$$' + ev('n*q+r') + ' = {{n}} \\times {{q}} + {{r}}, \\quad {{r}} < {{n}}$$'

RE_PLEINES = probleme(
    'Un apiculteur a $' + ev('n*q+r') + '$ pots de miel. Il les range dans des cartons de '
    + v('n') + ' pots.',
    'Combien de cartons pleins peut-il remplir ?\n\nIl peut remplir $?$ cartons pleins.',
    ev('q'), RESTE, RESTE_CONDITIONS,
    ['On fait des paquets de ' + v('n') + ' pots : combien de fois ' + v('n') + ' dans $'
     + ev('n*q+r') + '$ ?',
     DIVISION,
     'Il peut remplir $' + col('{{q}}') + '$ cartons pleins ; il reste ' + v('r') + ' {{if:r==1|'
     'pot|pots}}, pas assez pour un carton de plus.',
     'On vérifie : ${{q}}$ cartons demandent $' + ev('n*q') + '$ pots, et un carton de plus en'
     ' demanderait $' + ev('n*q+n') + '$, plus que les $' + ev('n*q+r') + '$ pots.'])

RE_TOUT_RANGER = probleme(
    '$' + ev('n*q+r') + '$ enfants doivent traverser le lac en barque. Chaque barque peut porter '
    + v('n') + ' enfants.',
    'Combien faut-il de barques, au minimum, pour que **tous** les enfants traversent en même'
    ' temps ?\n\nIl faut $?$ barques.',
    ev('q+1'), RESTE, RESTE_CONDITIONS,
    ['On fait des groupes de ' + v('n') + ' enfants : combien de fois ' + v('n') + ' dans $'
     + ev('n*q+r') + '$ ?',
     DIVISION,
     v('q') + ' barques sont pleines, et il reste ' + v('r') + ' {{if:r==1|enfant|enfants}} : il'
     ' faut **une barque de plus** pour {{if:r==1|lui|eux}}. $${{q}} + 1 = ' + col(ev('q+1'))
     + '$$',
     'Il faut $' + ev('q+1') + '$ barques.',
     'On vérifie : ${{q}}$ barques ne portent que $' + ev('n*q') + '$ enfants, moins que $'
     + ev('n*q+r') + '$ ; $' + ev('q+1') + '$ barques peuvent en porter $' + ev('n*q+n') + '$.'])

RE_RESTE = probleme(
    'Hugo a $' + ev('n*q+r') + '$ billes. Il les partage entre ses ' + v('n') + ' amis : chacun'
    ' reçoit le même nombre de billes, le plus possible.',
    'Combien de billes reste-t-il à Hugo ?\n\nIl lui reste $?$ billes.',
    ev('r'), RESTE, RESTE_CONDITIONS,
    ['On partage $' + ev('n*q+r') + '$ en ' + v('n') + ' parts égales, les plus grandes'
     ' possible : on cherche ce qui reste.',
     DIVISION,
     'Chaque ami reçoit ' + v('q') + ' billes, et il reste $' + col('{{r}}') + '$ {{if:r==1|bille|'
     'billes}}.',
     'Il reste ' + v('r') + ' {{if:r==1|bille|billes}} à Hugo.',
     'On vérifie : le reste est plus petit que ' + v('n') + ' (sinon, on pourrait donner une bille'
     ' de plus à chacun) et ${{n}} \\times {{q}} + {{r}} = ' + ev('n*q+r') + '$.'])

MODELES['06-partage-avec-reste'] = modele(
    'Problèmes de partage avec un reste',
    'Combien de boîtes pleines (le quotient), combien de boîtes pour tout ranger (le quotient'
    ' + 1), combien en reste-t-il (le reste) : 59 pots par cartons de 8, 45 enfants en barques'
    ' de 6', 13, [RE_PLEINES, RE_TOUT_RANGER, RE_RESTE],
    [spec('pleines : 59 pots par 8 → 7', 0, {'n': 8, 'q': 7, 'r': 3}, '7', 'correct'),
     spec('Erreur : pleines, une de trop (8)', 0, {'n': 8, 'q': 7, 'r': 3}, '8', 'incorrect'),
     spec('Erreur : pleines, le reste (3)', 0, {'n': 8, 'q': 7, 'r': 3}, '3', 'incorrect'),
     spec('tout ranger : 45 enfants par 6 → 8', 1, {'n': 6, 'q': 7, 'r': 3}, '8', 'correct'),
     spec('Erreur : tout ranger, le + 1 oublié (7)', 1, {'n': 6, 'q': 7, 'r': 3}, '7',
          'incorrect'),
     spec('reste : 38 billes entre 5 → 3', 2, {'n': 5, 'q': 7, 'r': 3}, '3', 'correct'),
     spec('Erreur : reste, le quotient (7)', 2, {'n': 5, 'q': 7, 'r': 3}, '7', 'incorrect'),
     spec('borne : 99 = 2 × 49 + 1, le reste 1', 2, {'n': 2, 'q': 49, 'r': 1}, '1', 'correct')])

# =============== 6-7. CM1-057 : comparaison multiplicative ===============
# k de 2 à 10 ; le schéma répète la part k fois (au plus 10 segments, 12 permis)

FM_PLUS = probleme(
    'Le chien de Malo pèse ${{c}}~\\unit{kg}$. Son poney est ' + v('k') + ' fois plus lourd que'
    ' le chien.',
    'Combien pèse le poney ?\n\nLe poney pèse $?~\\text{kg}$.',
    ev('k*c'), [var('k', '2..10'), var('c', '6..40')], ['k * c <= 400'],
    ['« ' + v('k') + ' fois plus lourd » : le poney pèse ' + v('k') + ' fois le poids du chien.'
     ' On multiplie (ce n\'est pas « de plus », qui ajouterait un écart).'
     + schema(['Chien : {{c}}', 'Poney : ' + repete('k', '{{c}}') + ' = ?']),
     '$${{k}} \\times {{c}} = ' + col(ev('k*c')) + '$$',
     'Le poney pèse $' + ev('k*c') + '~\\unit{kg}$.',
     'Le poney est bien plus lourd que le chien, et $' + ev('k*c') + ' \\div {{k}} = {{c}}$.'])

FM_MOINS = probleme(
    'Une console coûte $' + ev('k*c') + '~\\unit{€}$. Un jeu coûte ' + v('k') + ' fois moins cher'
    ' que la console.',
    'Combien coûte le jeu ?\n\nLe jeu coûte $?' + EURO + '$.',
    ev('c'), [var('k', '2..10'), var('c', '8..90')], ['k * c <= 900'],
    ['« ' + v('k') + ' fois moins cher » : la console coûte ' + v('k') + ' fois le prix du jeu.'
     ' On partage le prix de la console en ' + v('k') + ' parts égales : on divise.'
     + schema(['Console : ' + repete('k', '?') + ' = ' + ev('k*c') + ' €', 'Jeu : ?']),
     '$$' + ev('k*c') + ' \\div {{k}} = ' + col('{{c}}') + '$$',
     'Le jeu coûte ${{c}}~\\unit{€}$.',
     'On vérifie : ${{k}} \\times {{c}} = ' + ev('k*c') + '$ ; le jeu coûte bien moins cher que la'
     ' console.'])

# Piège : « fois plus » alors qu'on cherche le plus petit
FM_PIEGE = probleme(
    'Le livre de Zoé a $' + ev('k*c') + '$ pages. Il a ' + v('k') + ' fois plus de pages que le'
    ' livre de Hugo.',
    'Combien de pages le livre de Hugo a-t-il ?\n\nLe livre de Hugo a $?$ pages.',
    ev('c'), [var('k', '2..10'), var('c', '20..99')], ['k * c <= 999'],
    ['Le livre de Zoé a ' + v('k') + ' fois plus de pages : c\'est celui de **Hugo** qui en a '
     + v('k') + ' fois moins. On divise, même si l\'énoncé dit « fois plus ».'
     + schema(['Zoé : ' + repete('k', '?') + ' = ' + ev('k*c'), 'Hugo : ?']),
     '$$' + ev('k*c') + ' \\div {{k}} = ' + col('{{c}}') + '$$',
     'Le livre de Hugo a ' + v('c') + ' pages.',
     'On vérifie : ${{k}} \\times {{c}} = ' + ev('k*c') + '$ ; le livre de Hugo est le plus'
     ' court, c\'est cohérent.'])

# t = 0 : « combien en tout ? » ((k + 1) parts) ; t = 1 : « combien de plus ? » ((k − 1) parts)
FM_DEUX_ETAPES = probleme(
    'Nour a ' + v('c') + ' images. Sacha en a ' + v('k') + ' fois plus que Nour.',
    '{{if:t==0|Combien d\'images ont-ils à eux deux ?|Combien d\'images Sacha a-t-il de plus que'
    ' Nour ?}}\n\n{{if:t==0|À eux deux, ils ont|Sacha a}} $?$ images{{if:t==0|.| de plus que'
    ' Nour.}}',
    ev('(k+1-2*t)*c'), [var('k', '2..10'), var('c', '3..90'), var('t', '0..1')],
    ['(k + 1) * c <= 999'],
    ['On calcule en deux étapes : d\'abord les images de Sacha (' + v('k') + ' fois celles de'
     ' Nour), puis {{if:t==0|le total|l\'écart}}.'
     + schema(['Nour : {{c}}', 'Sacha : ' + repete('k', '{{c}}')]),
     '$${{k}} \\times {{c}} = ' + ev('k*c') + '$$',
     '$${{if:t==0|{{c}} + ' + ev('k*c') + '|' + ev('k*c') + ' - {{c}}}} = '
     + col(ev('(k+1-2*t)*c')) + '$$',
     '{{if:t==0|Nour et Sacha ont|Sacha a}} $' + ev('(k+1-2*t)*c') + '$ images{{if:t==0| à eux'
     ' deux.| de plus que Nour.}}',
     'On vérifie avec les parts : Nour a $1$ part, Sacha en a ' + v('k') + ' ; {{if:t==0|en tout,'
     ' cela fait|l\'écart est de}} $' + ev('k+1-2*t') + '$ parts, et $' + ev('k+1-2*t')
     + ' \\times {{c}} = ' + ev('(k+1-2*t)*c') + '$.'])

MODELES['07-comparaison-multiplicative'] = modele(
    'Comparaison multiplicative',
    '« k fois plus » et « k fois moins » : un poney 8 fois plus lourd qu\'un chien de 25 kg ;'
    ' une console 6 fois plus chère ; le plus petit quand l\'énoncé dit « fois plus » ; en deux'
    ' étapes, combien en tout, combien de plus ; schéma en barres dans le corrigé', 5,
    [FM_PLUS, FM_MOINS, FM_PIEGE, FM_DEUX_ETAPES],
    [spec('fois plus : 8 × 25 = 200 kg', 0, {'k': 8, 'c': 25}, '200', 'correct'),
     spec('Erreur : « fois plus » lu addition (33)', 0, {'k': 8, 'c': 25}, '33', 'incorrect'),
     spec('fois moins : 360 € ÷ 6 = 60 €', 1, {'k': 6, 'c': 60}, '60', 'correct'),
     spec('Erreur : « fois moins » lu multiplication (2 160)', 1, {'k': 6, 'c': 60}, esp(2160),
          'incorrect'),
     spec('Erreur : « fois moins » lu soustraction (354)', 1, {'k': 6, 'c': 60}, '354',
          'incorrect'),
     spec('piège : 252 pages, 4 fois plus → 63', 2, {'k': 4, 'c': 63}, '63', 'correct'),
     spec('Erreur : piège, « fois plus » lu multiplication (1 008)', 2, {'k': 4, 'c': 63},
          esp(1008), 'incorrect'),
     spec('deux étapes, en tout : 12 + 4 × 12 = 60', 3, {'k': 4, 'c': 12, 't': 0}, '60',
          'correct'),
     spec('Erreur : en tout, une seule étape (48)', 3, {'k': 4, 'c': 12, 't': 0}, '48',
          'incorrect'),
     spec('Erreur : en tout, 12 + 4 (16)', 3, {'k': 4, 'c': 12, 't': 0}, '16', 'incorrect'),
     spec('deux étapes, de plus : 4 × 12 − 12 = 36', 3, {'k': 4, 'c': 12, 't': 1}, '36',
          'correct'),
     spec('Erreur : de plus, les images de Sacha (48)', 3, {'k': 4, 'c': 12, 't': 1}, '48',
          'incorrect'),
     spec('Erreur : de plus, le total (60)', 3, {'k': 4, 'c': 12, 't': 1}, '60', 'incorrect')])

# =============== 6-8. CM1-058 : mixtes en deux ou trois étapes ===============

MX_GROUPES = probleme(
    'Pour la fête de l\'école, on installe ' + v('g') + ' tables de ' + v('n') + ' places et '
    + v('h') + ' tables de ' + v('m') + ' places.',
    'Combien de personnes peuvent s\'asseoir ?\n\n$?$ personnes peuvent s\'asseoir.',
    ev('g*n+h*m'),
    [var('g', '3..25'), var('n', '4..12'), var('h', '3..25'), var('m', '4..12')],
    ['g * n + h * m <= 999', 'n != m', 'g != h'],
    ['On calcule en trois étapes : les places des tables de ' + v('n') + ', celles des tables de '
     + v('m') + ', puis on ajoute.',
     '$${{g}} \\times {{n}} = ' + ev('g*n') + '$$',
     '$${{h}} \\times {{m}} = ' + ev('h*m') + '$$',
     '$$' + ev('g*n') + ' + ' + ev('h*m') + ' = ' + col(ev('g*n+h*m')) + '$$',
     '$' + ev('g*n+h*m') + '$ personnes peuvent s\'asseoir.',
     'Ordre de grandeur : il y a $' + ev('g+h') + '$ tables de ' + v('n') + ' ou ' + v('m')
     + ' places, donc entre $' + ev('(g+h)*min(n,m)') + '$ et $' + ev('(g+h)*max(n,m)')
     + '$ places : c\'est vraisemblable.'])

MX_ACHATS = probleme(
    'Zoé achète ' + v('g') + ' cahiers à ' + prix('p') + ' l\'un. Elle paie avec un billet de'
    ' ${{B}}~\\unit{€}$.',
    'Combien le vendeur doit-il lui rendre ?\n\nIl rend $?' + EURO + '$.',
    en_euros('100*B-g*p'), [var('g', '2..9'), var('B', '20|50')] + prix_var('p', '1..9'),
    ['g * p <= 100 * B - 100', 'mod(pC,10) != 0'],
    ['On calcule en deux étapes : d\'abord le prix des ' + v('g') + ' cahiers (' + v('g')
     + ' fois le même prix : on multiplie), puis la monnaie (on enlève).',
     '$${{g}} \\times ' + euros('p') + ' = ' + euros('g*p') + '$$',
     '$${{B}} - ' + euros('g*p') + ' = ' + col(euros('100*B-g*p')) + '$$',
     'Le vendeur rend ' + prix('100*B-g*p') + ' à Zoé.',
     'On vérifie : $' + euros('g*p') + ' + ' + euros('100*B-g*p') + ' = {{B}}$, on retrouve le'
     ' billet.'])

MX_TROIS = probleme(
    'Un cinéma a ' + v('g') + ' rangées de ' + v('n') + ' places. Pour la séance du soir, ' + v('r')
    + ' places sont réservées sur Internet et ' + v('s') + ' places sont vendues au guichet.',
    'Combien de places restent libres ?\n\nIl reste $?$ places libres.',
    ev('g*n-r-s'),
    [var('g', '8..25'), var('n', '10..30'), var('r', '20..200'), var('s', '20..200')],
    ['g * n <= 750', 'g * n - r - s >= 10'],
    ['On calcule en trois étapes : toutes les places (on multiplie), les places prises (on'
     ' ajoute), puis les places libres (on enlève).',
     '$${{g}} \\times {{n}} = ' + ev('g*n') + '$$',
     '$${{r}} + {{s}} = ' + ev('r+s') + '$$',
     '$$' + ev('g*n') + ' - ' + ev('r+s') + ' = ' + col(ev('g*n-r-s')) + '$$',
     'Il reste $' + ev('g*n-r-s') + '$ places libres.',
     'On vérifie : $' + ev('g*n-r-s') + ' + ' + ev('r+s') + ' = ' + ev('g*n') + '$, toutes les'
     ' places du cinéma.'])

MX_PARTAGE = probleme(
    'Madame Roux partage $' + ev('g*p') + '~\\unit{€}$ en parts égales entre ses ' + v('g')
    + ' petits-enfants. Lila, l\'une d\'eux, avait déjà ${{a}}~\\unit{€}$ dans sa tirelire.',
    'Combien Lila a-t-elle maintenant ?\n\nLila a $?' + EURO + '$.',
    ev('p+a'), [var('g', '2..9'), var('p', '10..90'), var('a', '5..60')], [],
    ['On calcule en deux étapes : d\'abord la part de Lila (on partage, on divise), puis ce'
     ' qu\'elle a en tout (on ajoute).',
     '$$' + ev('g*p') + ' \\div {{g}} = {{p}}$$',
     '$${{p}} + {{a}} = ' + col(ev('p+a')) + '$$',
     'Lila a maintenant $' + ev('p+a') + '~\\unit{€}$.',
     'On vérifie : ${{g}} \\times {{p}} = ' + ev('g*p') + '$ ; Lila a plus qu\'avant, mais moins'
     ' que toute la somme partagée.'])

MODELES['08-mixtes-deux-ou-trois-etapes'] = modele(
    'Problèmes mixtes : les quatre opérations',
    'Les quatre opérations enchaînées : 12 tables de 8 et 9 tables de 6 ; 4 cahiers à 2,35 € sur'
    ' un billet de 20 € ; un cinéma, ses places réservées et vendues ; un partage puis une'
    ' addition', 11,
    [MX_GROUPES, MX_ACHATS, MX_TROIS, MX_PARTAGE],
    [spec('tables : 12 × 8 + 9 × 6 = 150', 0, {'g': 12, 'n': 8, 'h': 9, 'm': 6}, '150', 'correct'),
     spec('Erreur : tables comptées (21)', 0, {'g': 12, 'n': 8, 'h': 9, 'm': 6}, '21', 'incorrect'),
     spec('Erreur : une seule sorte de tables (96)', 0, {'g': 12, 'n': 8, 'h': 9, 'm': 6}, '96',
          'incorrect'),
     spec('cahiers : 20 − 4 × 2,35 = 10,60 €', 1, {'g': 4, 'B': 20, **prix_spec('p', 2, 35)},
          '10,6', 'correct'),
     spec('Erreur : cahiers, un seul retiré (17,65 €)', 1,
          {'g': 4, 'B': 20, **prix_spec('p', 2, 35)}, '17,65', 'incorrect'),
     spec('Erreur : cahiers, le prix payé (9,40 €)', 1, {'g': 4, 'B': 20, **prix_spec('p', 2, 35)},
          '9,4', 'incorrect'),
     spec('cinéma : 15 × 24 − 85 − 120 = 155', 2, {'g': 15, 'n': 24, 'r': 85, 's': 120}, '155',
          'correct'),
     spec('Erreur : cinéma, le guichet oublié (275)', 2, {'g': 15, 'n': 24, 'r': 85, 's': 120},
          '275', 'incorrect'),
     spec('Erreur : cinéma, rien retiré (360)', 2, {'g': 15, 'n': 24, 'r': 85, 's': 120}, '360',
          'incorrect'),
     spec('partage : 180 € entre 6, plus 25 € = 55 €', 3, {'g': 6, 'p': 30, 'a': 25}, '55',
          'correct'),
     spec('Erreur : partage, la part seule (30)', 3, {'g': 6, 'p': 30, 'a': 25}, '30', 'incorrect'),
     spec('Erreur : partage oublié (205)', 3, {'g': 6, 'p': 30, 'a': 25}, '205', 'incorrect')],
    options=DECIMAUX, delay=120)

# =============== 6-9. CM1-059 : dénombrement ===============

DN_TENUES = probleme(
    'Pour la photo de classe, Maëlle hésite entre ' + v('h') + ' hauts et ' + v('b') + ' bas'
    ' (jupes et pantalons).',
    'Combien de tenues différentes (un haut et un bas) peut-elle composer ?\n\nElle peut'
    ' composer $?$ tenues.',
    ev('h*b'), [var('h', '3..8'), var('b', '2..5')], ['h != b'],
    ['Avec **un** haut, Maëlle peut mettre chacun des ' + v('b') + ' bas : ' + v('b')
     + ' tenues. Dans un tableau, il y aurait ' + v('h') + ' lignes (les hauts) et ' + v('b')
     + ' colonnes (les bas) : chaque case est une tenue.',
     'On compte les cases : $${{h}} \\times {{b}} = ' + col(ev('h*b')) + '$$',
     'Maëlle peut composer $' + ev('h*b') + '$ tenues.',
     'On vérifie : ' + v('b') + ' tenues pour chacun des ' + v('h') + ' hauts, c\'est bien plus'
     ' que les $' + ev('h+b') + '$ vêtements.'])

DN_MENUS = probleme(
    'À la cantine, le menu propose ' + v('a') + ' entrées, ' + v('b') + ' plats et ' + v('c')
    + ' desserts. On choisit une entrée, un plat et un dessert.',
    'Combien de repas différents peut-on composer ?\n\nOn peut composer $?$ repas.',
    ev('a*b*c'), [var('a', '2..5'), var('b', '2..5'), var('c', '2..4')], [],
    ['On construit un arbre : ' + v('a') + ' branches pour les entrées ; au bout de chacune, '
     + v('b') + ' branches pour les plats ; au bout de chacune, ' + v('c') + ' branches pour les'
     ' desserts.',
     'Chaque chemin de l\'arbre est un repas : $${{a}} \\times {{b}} \\times {{c}} = '
     + col(ev('a*b*c')) + '$$',
     'On peut composer $' + ev('a*b*c') + '$ repas différents.',
     'On vérifie : avec une seule entrée, il y a déjà ${{b}} \\times {{c}} = ' + ev('b*c')
     + '$ repas ; ' + v('a') + ' entrées en donnent ' + v('a') + ' fois plus.'])

# Deux dés : la façon (rouge ; bleu) existe si le bleu vaut s − r entre 1 et 6 ; vr = 1 alors
DES = [var('s', '3..11'), var('w', 'eval:6-abs(s-7)')] + [
    var(f'v{r}', f'eval:min(max(s-{r},0),1)*min(max({r + 7}-s,0),1)') for r in range(1, 7)]
LISTE_DES = ''.join('{{if:v' + str(r) + '==1|$(' + str(r) + '\\,;\\,' + ev(f's-{r}')
                    + ')$ |}}' for r in range(1, 7))

DN_DES = probleme(
    'On lance deux dés à six faces, un rouge et un bleu, et on ajoute les deux nombres obtenus.'
    ' Un $1$ sur le dé rouge et un $2$ sur le dé bleu, ce n\'est pas la même façon qu\'un $2$ sur'
    ' le dé rouge et un $1$ sur le dé bleu.',
    'De combien de façons différentes peut-on obtenir une somme de ' + v('s') + ' ?\n\nOn peut'
    ' l\'obtenir de $?$ façons.',
    '{{w}}', DES, [],
    ['On note chaque façon (dé rouge ; dé bleu) et on liste les valeurs du dé rouge de $1$ à'
     ' $6$ : le dé bleu doit compléter jusqu\'à ' + v('s') + ', avec un nombre de $1$ à $6$.',
     'Les façons : ' + LISTE_DES,
     'On peut obtenir ' + v('s') + ' de $' + col('{{w}}') + '$ façons.',
     'On vérifie : $(a\\,;\\,b)$ et $(b\\,;\\,a)$ comptent pour deux façons quand les deux'
     ' nombres sont différents ; la somme $7$ est celle qui a le plus de façons ($6$).'])

# Dominos de 0 à n, doubles compris : (n + 1) + n + … + 1
DOMINOS_SOMME = ('{{if:n>5|7 + |}}{{if:n>4|6 + |}}{{if:n>3|5 + |}}4 + 3 + 2 + 1')
DN_DOMINOS = probleme(
    'Un jeu contient tous les dominos différents que l\'on peut faire avec les nombres de $0$ à '
    + v('n') + '. Un domino porte deux nombres ; un double (comme $2$-$2$) compte. Les dominos'
    ' $1$-$3$ et $3$-$1$ sont le même domino.',
    'Combien de dominos ce jeu contient-il ?\n\nIl contient $?$ dominos.',
    '{{w}}', [var('n', '3..6'), var('w', 'eval:(n+1)*(n+2)/2')], [],
    ['On range les dominos par leur plus petit nombre, pour compter chaque domino une seule'
     ' fois.',
     'Avec $0$ : $0$-$0$, $0$-$1$, …, $0$-' + v('n') + ', soit $' + ev('n+1') + '$ dominos ; avec'
     ' $1$ comme plus petit nombre : $1$-$1$ à $1$-' + v('n') + ', soit ' + v('n') + ' dominos ;'
     ' et ainsi de suite jusqu\'à ' + v('n') + '-' + v('n') + ', un seul domino.',
     '$$' + DOMINOS_SOMME + ' = ' + col('{{w}}') + '$$',
     'Le jeu contient ' + v('w') + ' dominos.',
     'On vérifie : chaque double n\'est compté qu\'une fois, et $1$-$3$ n\'est pas recompté en'
     ' $3$-$1$.'])


def des_spec(s):
    vs = {f'v{r}': 1 if 1 <= s - r <= 6 else 0 for r in range(1, 7)}
    return {'s': s, 'w': 6 - abs(s - 7), **vs}


def dominos_spec(n):
    return {'n': n, 'w': (n + 1) * (n + 2) // 2}


MODELES['09-denombrement'] = modele(
    'Problèmes de dénombrement',
    'Compter par un tableau, un arbre ou une liste : 6 hauts × 3 bas ; entrée, plat, dessert ;'
    ' les façons d\'obtenir une somme avec deux dés ; les dominos de 0 à 4', 2,
    [DN_TENUES, DN_MENUS, DN_DES, DN_DOMINOS],
    [spec('BO : 6 hauts × 3 bas = 18', 0, {'h': 6, 'b': 3}, '18', 'correct'),
     spec('Erreur : tenues, 6 + 3 (9)', 0, {'h': 6, 'b': 3}, '9', 'incorrect'),
     spec('repas : 3 × 4 × 2 = 24', 1, {'a': 3, 'b': 4, 'c': 2}, '24', 'correct'),
     spec('Erreur : repas, 3 + 4 + 2 (9)', 1, {'a': 3, 'b': 4, 'c': 2}, '9', 'incorrect'),
     spec('Erreur : repas, les desserts oubliés (12)', 1, {'a': 3, 'b': 4, 'c': 2}, '12',
          'incorrect'),
     spec('dés : la somme 7, 6 façons', 2, des_spec(7), '6', 'correct'),
     spec('Erreur : la somme 7, (3 ; 4) et (4 ; 3) comptés une fois (3)', 2, des_spec(7), '3',
          'incorrect'),
     spec('dés : la somme 4, 3 façons', 2, des_spec(4), '3', 'correct'),
     spec('Erreur : la somme 4, (1 ; 3) et (3 ; 1) comptés une fois (2)', 2, des_spec(4), '2',
          'incorrect'),
     spec('dés : la somme 10, 3 façons', 2, des_spec(10), '3', 'correct'),
     spec('BO : dominos de 0 à 4 = 15', 3, dominos_spec(4), '15', 'correct'),
     spec('Erreur : dominos, les doubles oubliés (10)', 3, dominos_spec(4), '10', 'incorrect'),
     spec('Erreur : dominos, 1-3 et 3-1 comptés deux fois (25)', 3, dominos_spec(4), '25',
          'incorrect'),
     spec('Erreur : dominos, les doubles comptés deux fois (20)', 3, dominos_spec(4), '20',
          'incorrect'),
     spec('dominos de 0 à 6 = 28', 3, dominos_spec(6), '28', 'correct')])

# =============== 6-10. CM1-060 : optimisation ===============

BRACELETS = [var('a', '2..6'), var('b', '2..6'), var('R', '12..80'), var('B', '12..80'),
             var('qr', 'eval:floor(R/a)'), var('qb', 'eval:floor(B/b)'),
             var('w', 'eval:min(qr,qb)')]

OP_BRACELETS = probleme(
    'Pour fabriquer un bracelet, Inès enfile ' + v('a') + ' perles rouges et ' + v('b')
    + ' perles bleues. Elle a ' + v('R') + ' perles rouges et ' + v('B') + ' perles bleues.',
    'Combien de bracelets peut-elle fabriquer, au maximum ?\n\nElle peut fabriquer $?$'
    ' bracelets.',
    '{{w}}', BRACELETS, ['qr != qb'],
    ['Chaque bracelet demande ' + v('a') + ' perles rouges **et** ' + v('b') + ' perles bleues :'
     ' il faut que les deux couleurs suffisent.',
     'Les rouges : ${{R}} = {{a}} \\times {{qr}} + ' + ev('R-a*qr') + '$, assez pour ' + v('qr')
     + ' bracelets. Les bleues : ${{B}} = {{b}} \\times {{qb}} + ' + ev('B-b*qb') + '$, assez'
     ' pour ' + v('qb') + ' bracelets.',
     'La couleur qui manque la première décide : le plus petit des deux nombres, $'
     + col('{{w}}') + '$.',
     'Inès peut fabriquer ' + v('w') + ' bracelets.',
     'On vérifie : un bracelet de plus demanderait {{if:qr<qb|$' + ev('a*(w+1)')
     + '$ perles rouges, plus que les ${{R}}$|$' + ev('b*(w+1)') + '$ perles bleues, plus que les'
     ' ${{B}}$}} qu\'elle a.'])

# Le plus de pièces de 5 € possible, à condition que le reste soit pair ; S jamais multiple de 5
PIECES = [var('S', '11..49'), var('q', 'eval:floor(S/5)'), var('k', 'eval:q-mod(S-5*q,2)'),
          var('t', 'eval:(S-5*k)/2'), var('w', 'eval:k+t')]

OP_PIECES = probleme(
    'Kenzo doit payer exactement ${{S}}~\\unit{€}$. Il n\'a que des pièces de $2~\\unit{€}$ et'
    ' de $5~\\unit{€}$ (autant qu\'il en veut), et on ne lui rend pas la monnaie.',
    'Combien de pièces doit-il donner, au minimum ?\n\nIl doit donner $?$ pièces.',
    '{{w}}', PIECES, ['mod(S,5) != 0'],
    ['Pour donner le moins de pièces possible, on prend le plus de pièces de $5~\\unit{€}$'
     ' possible ; mais le reste doit se payer en pièces de $2~\\unit{€}$ : il doit être **pair**.',
     v('q') + ' pièces de $5~\\unit{€}$ font $' + ev('5*q') + '~\\unit{€}$ ; il reste $'
     + ev('S-5*q') + '~\\unit{€}${{if:k<q|, un nombre impair : impossible en pièces de'
     ' $2~\\unit{€}$. Avec une pièce de $5~\\unit{€}$ de moins, il reste $' + ev('S-5*k')
     + '~\\unit{€}$|}}, soit ' + v('t') + ' {{if:t==1|pièce|pièces}} de $2~\\unit{€}$.',
     '$${{k}} + {{t}} = ' + col('{{w}}') + '$$',
     'Kenzo doit donner ' + v('w') + ' pièces : ' + v('k') + ' {{if:k==1|pièce|pièces}} de'
     ' $5~\\unit{€}$ et ' + v('t') + ' {{if:t==1|pièce|pièces}} de $2~\\unit{€}$.',
     'On vérifie : $5 \\times {{k}} + 2 \\times {{t}} = {{S}}$ ; avec plus de pièces de'
     ' $5~\\unit{€}$, le reste ne se paierait plus en pièces de $2~\\unit{€}$.'])


def bracelets_spec(a, b, R, B):
    return {'a': a, 'b': b, 'R': R, 'B': B, 'qr': R // a, 'qb': B // b, 'w': min(R // a, B // b)}


def pieces_spec(S):
    q = S // 5
    k = q - (S - 5 * q) % 2
    t = (S - 5 * k) // 2
    return {'S': S, 'q': q, 'k': k, 't': t, 'w': k + t}


MODELES['10-optimisation'] = modele(
    'Problèmes d\'optimisation',
    'Le plus de bracelets possible avec des perles de deux couleurs (le plus petit des deux'
    ' quotients) ; payer une somme exacte avec le moins de pièces de 2 € et de 5 €', 1,
    [OP_BRACELETS, OP_PIECES],
    [spec('bracelets : 3 rouges et 2 bleues, 20 et 18 → 6', 0, bracelets_spec(3, 2, 20, 18), '6',
          'correct'),
     spec('Erreur : bracelets, le plus grand quotient (9)', 0, bracelets_spec(3, 2, 20, 18), '9',
          'incorrect'),
     spec('Erreur : bracelets, toutes les perles ensemble (38 ÷ 5 → 7)', 0,
          bracelets_spec(3, 2, 20, 18), '7', 'incorrect'),
     spec('bracelets : les bleues manquent d\'abord (2, 5, 40, 22 → 4)', 0,
          bracelets_spec(2, 5, 40, 22), '4', 'correct'),
     spec('Erreur : bracelets, les rouges seules (20)', 0, bracelets_spec(2, 5, 40, 22), '20',
          'incorrect'),
     spec('pièces : 16 € = 2 × 5 + 3 × 2 → 5', 1, pieces_spec(16), '5', 'correct'),
     spec('Erreur : pièces, que des pièces de 2 € (8)', 1, pieces_spec(16), '8', 'incorrect'),
     spec('Erreur : pièces, 3 pièces de 5 € et un reste de 1 € (4)', 1, pieces_spec(16), '4',
          'incorrect'),
     spec('pièces : 13 € = 5 + 4 × 2 → 5', 1, pieces_spec(13), '5', 'correct'),
     spec('pièces : 22 € = 4 × 5 + 2 → 5', 1, pieces_spec(22), '5', 'correct'),
     spec('Erreur : pièces, 22 € en pièces de 2 € (11)', 1, pieces_spec(22), '11', 'incorrect')],
    delay=120)

for nom, m in MODELES.items():
    with open(f'{DOSSIER}/{nom}.json', 'w') as fh:
        json.dump(m, fh, ensure_ascii=False, indent='\t')
        fh.write('\n')
print(len(MODELES), 'modèles écrits')
