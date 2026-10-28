"""Écrit les 9 modèles du lot 2 du CE2 (numération) dans scripts/questions/ce2-2/.

Phase 0 validée par David le 2026-10-28 (« je valide », § 6 du journal
`docs/wip/questions-ce2-progress.md`). Plages : bornes `cycle2.json`, CE2 (nombres ≤ 10 000 ;
groupes de dix, cent, mille ; 1 235 filtres par lots de 100 ; 3 d et 46 c et 5 u ;
17 u, 8 d, 32 c et 2 milliers ; (4 × 1 000) + (6 × 100) + … ; 4 000 + 600 + 30 + 5 ; ranger
6 234, 6 243, 6 239, 6 300, 5 229 ; … < 6 239 < … ; 2 393 < … < 2 396 ; bande 2 391 … 2 398).
Un point par modèle ; case seule, aucun QCM. Corrigés : une étape par ligne. Niveaux : places
libres des catégories, relevées en prod le 2026-10-28.

    python3 docs/wip/questions/lot-ce2-2.py scripts/questions/ce2-2
"""
import json
import sys

DOSSIER = sys.argv[1]

# Le moteur n'écrit pas les nombres en lettres : le texte de chaque nombre de la liste est
# calculé ici, puis choisi par une chaîne de {{if:…}}. Orthographe rectifiée (David,
# 2026-10-28) : traits d'union partout, « mille » invariable.

UNITES = ['zéro', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf', 'dix',
          'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize']
DIZAINES = {2: 'vingt', 3: 'trente', 4: 'quarante', 5: 'cinquante', 6: 'soixante'}


def deux_chiffres(n, final=True):
    """n (1 à 99) en lettres ; « quatre-vingts » ne prend son s qu'en fin de nombre."""
    if n <= 16:
        return UNITES[n]
    if n < 20:
        return 'dix-' + UNITES[n - 10]
    if n >= 80:
        return 'quatre-vingts' if n == 80 else 'quatre-vingt-' + deux_chiffres(n - 80)
    if n >= 70:
        return 'soixante-' + ('et-onze' if n == 71 else deux_chiffres(n - 60))
    d, u = divmod(n, 10)
    if u == 0:
        return DIZAINES[d]
    return DIZAINES[d] + ('-et-un' if u == 1 else '-' + UNITES[u])


def lettres(n):
    """n (1 à 9 999) en lettres : deux-mille-trois-cent-sept, quatre-mille-cinquante,
    deux-cents, deux-cent-trois."""
    m, reste = divmod(n, 1000)
    c, r = divmod(reste, 100)
    mots = []
    if m:
        mots.append('mille' if m == 1 else UNITES[m] + '-mille')
    if c:
        cent = 'cent' if c == 1 else UNITES[c] + '-cent'
        mots.append(cent + ('s' if c > 1 and r == 0 else ''))
    if r:
        mots.append(deux_chiffres(r))
    return '-'.join(mots)


def par(var, valeurs, f):
    """f(valeur) selon la valeur tirée de `var` : {{if:var==v1|…|{{if:var==v2|…|…}}}}."""
    valeurs = list(valeurs)
    expr = f(valeurs[-1])
    for x in reversed(valeurs[:-1]):
        expr = '{{if:' + var + '==' + str(x) + '|' + f(x) + '|' + expr + '}}'
    return expr


# Règle de l'école en numération : espaces de groupement exigées (et affichées) dès 4 chiffres
ECOLE = {'constraints': {'spacesFromFourDigits': True}}


def groupe(reponse):
    """4635 → 4\\,635 : les réponses des specs s'écrivent comme l'élève doit les écrire."""
    if not reponse.isdigit() or len(reponse) < 4:
        return reponse
    tranches = []
    while len(reponse) > 3:
        tranches.insert(0, reponse[-3:])
        reponse = reponse[:-3]
    return '\\,'.join([reponse] + tranches)


def spec(desc, vi, variables, answers, status, violations=None, brut=False):
    # brut : réponse gardée telle quelle (espace oubliée)
    answers = answers if isinstance(answers, list) else [answers]
    s = {'description': desc, 'variationIndex': vi, 'variables': variables,
         'answers': answers if brut else [groupe(a) for a in answers],
         'expected': {'status': status}}
    if violations:
        s['expected']['constraintViolations'] = violations
    return s


def modele(title, description, subdomain, level, variations, specs, delay=20):
    # theme / domain / subdomain : anciennes colonnes, remplies pour create-questions ; le
    # rangement (nœud du point) est posé par la migration
    return {'title': title, 'description': description, 'grades': ['CE2'], 'theme': 'Entiers',
            'domain': 'Apprivoiser', 'subdomain': subdomain, 'level': level, 'delay': delay,
            'status': 'draft', 'options': ECOLE, 'variations': variations, 'testSpecs': specs}


def var(nom, expression):
    return {'name': nom, 'expression': expression}


def variation(statement, variables, blanks, steps, conditions=None):
    # Chaque `?` de l'énoncé est une case, dans l'ordre de `blanks`
    v = {'statement': statement, 'variables': variables}
    if conditions:
        v['conditions'] = conditions
    v['blanks'] = [b if isinstance(b, dict) else {'expectedAnswer': b} for b in blanks]
    v['correction'] = {'steps': steps}
    return v


def entre(mini, maxi, expected):
    # Toute réponse entière strictement comprise entre mini et maxi est juste
    return {'expectedAnswer': expected, 'rulesSuffice': True,
            'validationRules': [{'type': 'range', 'min': mini, 'max': maxi, 'inclusive': False},
                                {'type': 'predicate', 'predicate': 'isInteger'}]}


def accord(nom, v):
    # « 1 centaine », « 0 dizaine », « 3 unités »
    return '{{if:' + v + '<=1|' + nom + '|' + nom + 's}}'


# --- 1. CE2-003 : milliers, centaines, dizaines ---------------------------------------------

MCD = [
    variation('${{m}}$ milliers, c\'est $?$ centaines.', [var('m', '2..9')], ['{{eval:10*m}}'],
              ['$1$ millier, c\'est $10$ centaines.',
               '${{m}}$ milliers, c\'est ${{m}}$ fois $10$ centaines.',
               '${{m}}$ milliers, c\'est ${{solution}}$ centaines.']),
    variation('${{eval:10*m}}$ centaines, c\'est $?$ milliers.', [var('m', '2..9')], ['{{m}}'],
              ['$10$ centaines, c\'est $1$ millier.',
               'Dans ${{eval:10*m}}$ centaines, il y a ${{m}}$ paquets de $10$ centaines.',
               '${{eval:10*m}}$ centaines, c\'est ${{solution}}$ milliers.']),
    variation('${{m}}$ milliers, c\'est $?$ dizaines.', [var('m', '2..9')], ['{{eval:100*m}}'],
              ['$1$ millier, c\'est $100$ dizaines.',
               '${{m}}$ milliers, c\'est ${{m}}$ fois $100$ dizaines.',
               '${{m}}$ milliers, c\'est ${{solution}}$ dizaines.']),
    variation('Combien y a-t-il de centaines en tout dans ${{n}}$ ?\n\nIl y a $?$ centaines.',
              [var('a', '1..9'), var('b', '0..9'), var('d', '0..9'), var('u', '0..9'),
               var('n', 'eval:1000*a+100*b+10*d+u')], ['{{eval:10*a+b}}'],
              ['${{n}}$, c\'est ${{a}}$ ' + accord('millier', 'a') + ', ${{b}}$ '
               + accord('centaine', 'b') + ', ${{d}}$ ' + accord('dizaine', 'd') + ' et ${{u}}$ '
               + accord('unité', 'u') + '.',
               '${{a}}$ ' + accord('millier', 'a') + ', c\'est ${{eval:10*a}}$ centaines.',
               'Avec les ${{b}}$ autres : ${{eval:10*a}}+{{b}}={{solution}}$ centaines.']),
]

SPECS_MCD = [
    spec('4 milliers = 40 centaines', 0, {'m': '4'}, '40', 'correct'),
    spec('Erreur : 4 milliers = 400 centaines', 0, {'m': '4'}, '400', 'incorrect'),
    spec('Erreur : 4 milliers = 4 centaines', 0, {'m': '4'}, '4', 'incorrect'),
    spec('60 centaines = 6 milliers', 1, {'m': '6'}, '6', 'correct'),
    spec('Erreur : 60 centaines = 600 milliers', 1, {'m': '6'}, '600', 'incorrect'),
    spec('3 milliers = 300 dizaines', 2, {'m': '3'}, '300', 'correct'),
    spec('Erreur : 3 milliers = 30 dizaines', 2, {'m': '3'}, '30', 'incorrect'),
    spec('4 357 : 43 centaines', 3, {'a': '4', 'b': '3', 'd': '5', 'u': '7', 'n': '4357'}, '43',
         'correct'),
    spec('Erreur : chiffre des centaines (3)', 3,
         {'a': '4', 'b': '3', 'd': '5', 'u': '7', 'n': '4357'}, '3', 'incorrect'),
    spec('borne : 9 052 : 90 centaines', 3, {'a': '9', 'b': '0', 'd': '5', 'u': '2', 'n': '9052'},
         '90', 'correct'),
]

# --- 2. CE2-003 : ranger par lots de 100 (ou de 10) -----------------------------------------
# Exemple du programme : 1 235 filtres par lots de 100 → 13 lots (le dernier n'est pas plein)

LOTS = [
    variation('Un magasin reçoit ${{n}}$ filtres. Il les range par lots de $100$.\n\n'
              'Combien de lots faut-il pour ranger tous les filtres ?\n\nIl faut $?$ lots.',
              [var('q', '10..98'), var('r', '1..99'), var('n', 'eval:100*q+r')],
              ['{{eval:q+1}}'],
              ['${{n}}$, c\'est ${{q}}$ centaines et ${{r}}$ ' + accord('unité', 'r') + '.',
               '${{q}}$ lots de $100$ rangent ${{eval:100*q}}$ filtres : il en reste ${{r}}$.',
               'Pour ranger les ${{r}}$ derniers, il faut un lot de plus : ${{q}}+1={{solution}}$'
               ' lots.']),
    variation('Une maîtresse a ${{n}}$ crayons. Elle les range dans des boîtes de $10$.\n\n'
              'Combien de boîtes faut-il pour ranger tous les crayons ?\n\nIl faut $?$ boîtes.',
              [var('q', '10..98'), var('r', '1..9'), var('n', 'eval:10*q+r')],
              ['{{eval:q+1}}'],
              ['${{n}}$, c\'est ${{q}}$ dizaines et ${{r}}$ ' + accord('unité', 'r') + '.',
               '${{q}}$ boîtes de $10$ rangent ${{eval:10*q}}$ crayons : il en reste ${{r}}$.',
               'Pour ranger les ${{r}}$ derniers, il faut une boîte de plus :'
               ' ${{q}}+1={{solution}}$ boîtes.']),
]

SPECS_LOTS = [
    spec('1 235 filtres : 13 lots', 0, {'q': '12', 'r': '35', 'n': '1235'}, '13', 'correct'),
    spec('Erreur : lots pleins seulement (12)', 0, {'q': '12', 'r': '35', 'n': '1235'}, '12',
         'incorrect'),
    spec('Erreur : 12,35', 0, {'q': '12', 'r': '35', 'n': '1235'}, '12,35', 'incorrect'),
    spec('borne : 9 899 filtres : 99 lots', 0, {'q': '98', 'r': '99', 'n': '9899'}, '99',
         'correct'),
    spec('347 crayons : 35 boîtes', 1, {'q': '34', 'r': '7', 'n': '347'}, '35', 'correct'),
    spec('Erreur : boîtes pleines seulement (34)', 1, {'q': '34', 'r': '7', 'n': '347'}, '34',
         'incorrect'),
]

# --- 3. CE2-005 : unités non canoniques et décompositions -----------------------------------

NON_CANONIQUES = [
    variation('${{d}}$ ' + accord('dizaine', 'd') + ', ${{c}}$ centaines et ${{u}}$ '
              + accord('unité', 'u') + ', c\'est le nombre $?$.',
              [var('c', '11..59'), var('d', '1..9'), var('u', '1..9')],
              ['{{eval:100*c+10*d+u}}'],
              ['On range dans l\'ordre : ${{c}}$ centaines, c\'est ${{eval:100*c}}$.',
               '${{d}}$ ' + accord('dizaine', 'd') + ', c\'est ${{eval:10*d}}$.',
               '${{u}}$ ' + accord('unité', 'u') + ', c\'est ${{u}}$.',
               '$${{eval:100*c}}+{{eval:10*d}}+{{u}}={{solution}}$$']),
    variation('${{u}}$ unités, ${{d}}$ ' + accord('dizaine', 'd') + ', ${{c}}$ centaines et ${{m}}$ '
              + accord('millier', 'm') + ', c\'est le nombre $?$.',
              [var('m', '1..5'), var('c', '10..39'), var('d', '1..9'), var('u', '10..19')],
              ['{{eval:1000*m+100*c+10*d+u}}'],
              ['On range dans l\'ordre : ${{m}}$ ' + accord('millier', 'm') + ', c\'est'
               ' ${{eval:1000*m}}$.',
               '${{c}}$ centaines, c\'est ${{eval:100*c}}$.',
               '${{d}}$ ' + accord('dizaine', 'd') + ', c\'est ${{eval:10*d}}$.',
               '${{u}}$ unités, c\'est ${{u}}$.',
               '$${{eval:1000*m}}+{{eval:100*c}}+{{eval:10*d}}+{{u}}={{solution}}$$']),
    variation('Complète.\n\n$$({{m}}\\times 1\\,000)+({{c}}\\times 100)+({{d}}\\times 10)+{{u}}=?$$',
              [var('m', '1..9'), var('c', '1..9'), var('d', '1..9'), var('u', '1..9')],
              ['{{eval:1000*m+100*c+10*d+u}}'],
              ['${{m}}\\times 1\\,000={{eval:1000*m}}$ ; ${{c}}\\times 100={{eval:100*c}}$ ;'
               ' ${{d}}\\times 10={{eval:10*d}}$.',
               '$${{eval:1000*m}}+{{eval:100*c}}+{{eval:10*d}}+{{u}}={{solution}}$$']),
    variation('Décompose le nombre.\n\n$${{n}}=?+?+?+?$$',
              [var('m', '1..9'), var('c', '1..9'), var('d', '1..9'), var('u', '1..9'),
               var('n', 'eval:1000*m+100*c+10*d+u')],
              ['{{eval:1000*m}}', '{{eval:100*c}}', '{{eval:10*d}}', '{{u}}'],
              ['${{n}}$, c\'est ${{m}}$ ' + accord('millier', 'm') + ', ${{c}}$ '
               + accord('centaine', 'c') + ', ${{d}}$ ' + accord('dizaine', 'd') + ' et ${{u}}$ '
               + accord('unité', 'u') + '.',
               '$${{n}}={{eval:1000*m}}+{{eval:100*c}}+{{eval:10*d}}+{{u}}$$']),
]

SPECS_NON_CANONIQUES = [
    spec('3 d, 46 c et 5 u = 4 635', 0, {'c': '46', 'd': '3', 'u': '5'}, '4635', 'correct'),
    spec('Erreur : chiffres recopiés (3465)', 0, {'c': '46', 'd': '3', 'u': '5'}, '3465',
         'incorrect'),
    spec('Erreur : 46 c lues 46 (465)', 0, {'c': '46', 'd': '3', 'u': '5'}, '465', 'incorrect'),
    spec('17 u, 8 d, 32 c et 2 milliers = 5 297', 1, {'m': '2', 'c': '32', 'd': '8', 'u': '17'},
         '5297', 'correct'),
    spec('Erreur : retenue des unités oubliée (5 287)', 1,
         {'m': '2', 'c': '32', 'd': '8', 'u': '17'}, '5287', 'incorrect'),
    spec('Erreur : centaines non converties (2 397)', 1,
         {'m': '2', 'c': '32', 'd': '8', 'u': '17'}, '2397', 'incorrect'),
    spec('(4 × 1 000) + (6 × 100) + (3 × 10) + 5 = 4 635', 2,
         {'m': '4', 'c': '6', 'd': '3', 'u': '5'}, '4635', 'correct'),
    spec('Erreur : somme des chiffres (18)', 2, {'m': '4', 'c': '6', 'd': '3', 'u': '5'}, '18',
         'incorrect'),
    spec('4 635 = 4 000 + 600 + 30 + 5', 3,
         {'m': '4', 'c': '6', 'd': '3', 'u': '5', 'n': '4635'}, ['4000', '600', '30', '5'],
         'correct'),
    spec('Erreur : chiffres seuls (4 + 6 + 3 + 5)', 3,
         {'m': '4', 'c': '6', 'd': '3', 'u': '5', 'n': '4635'}, ['4', '6', '3', '5'],
         'incorrect'),
]

# --- 4. CE2-004 : la suite des nombres jusqu'à 10 000 ---------------------------------------

SUIT = ['Le nombre qui suit, c\'est celui qu\'on dit juste après en comptant : on avance de $1$.']
PRECEDE = ['Le nombre qui précède, c\'est celui qu\'on dit juste avant en comptant : on recule de'
           ' $1$.']

SUITE = [
    variation('Le nombre qui suit ${{n}}$ est $?$.', [var('n', '1000..9998')], ['{{eval:n+1}}'],
              SUIT + ['$${{n}} \\rightarrow {{solution}}$$'], ['mod(n,10) <= 8']),
    variation('Le nombre qui suit ${{n}}$ est $?$.',
              [var('a', '1..9'), var('b', '0..9'), var('c', '0..8'),
               var('n', 'eval:1000*a+100*b+10*c+9')], ['{{eval:n+1}}'],
              SUIT + ['${{n}}$ se termine par $9$ : on passe à la dizaine suivante, le chiffre'
                      ' des unités revient à $0$.',
                      '$${{n}} \\rightarrow {{solution}}$$']),
    variation('Le nombre qui suit ${{n}}$ est $?$.',
              [var('a', '1..9'), var('b', '0..9'), var('n', 'eval:1000*a+100*b+99')],
              ['{{eval:n+1}}'],
              SUIT + ['{{if:b==9|${{n}}$ se termine par $999$ : on passe au millier suivant, les'
                      ' centaines, les dizaines et les unités reviennent à $0$.|${{n}}$ se'
                      ' termine par $99$ : on passe à la centaine suivante, les dizaines et les'
                      ' unités reviennent à $0$.}}',
                      '$${{n}} \\rightarrow {{solution}}$$']),
    variation('Le nombre qui précède ${{n}}$ est $?$.',
              [var('a', '1..10'), var('b', '0..9'), var('c', '0..9'),
               var('n', 'eval:1000*a+100*b+10*c')], ['{{eval:n-1}}'],
              PRECEDE + ['{{if:c>0|${{n}}$ se termine par $0$ : on revient à la dizaine'
                         ' précédente, le chiffre des unités devient $9$.|{{if:b>0|${{n}}$ se'
                         ' termine par $00$ : on revient à la centaine précédente, les dizaines'
                         ' et les unités deviennent $9$.|${{n}}$ se termine par $000$ : on'
                         ' revient au millier précédent, les centaines, les dizaines et les'
                         ' unités deviennent $9$.}}}}',
                         '$${{solution}} \\rightarrow {{n}}$$'],
              ['1000*a + 100*b + 10*c <= 10000']),
]

SPECS_SUITE = [
    spec('suit 4 526 : 4 527', 0, {'n': '4526'}, '4527', 'correct'),
    spec('Forme : 4527 sans espace', 0, {'n': '4526'}, '4527', 'unoptimal_form',
         ['spaces'], brut=True),
    spec('suit 3 459 : 3 460', 1, {'a': '3', 'b': '4', 'c': '5', 'n': '3459'}, '3460', 'correct'),
    spec('Erreur : 34 510', 1, {'a': '3', 'b': '4', 'c': '5', 'n': '3459'}, '34510', 'incorrect'),
    spec('suit 2 399 : 2 400', 2, {'a': '2', 'b': '3', 'n': '2399'}, '2400', 'correct'),
    spec('Erreur : 23 100', 2, {'a': '2', 'b': '3', 'n': '2399'}, '23100', 'incorrect'),
    spec('Erreur : 2 310 (dizaine seule)', 2, {'a': '2', 'b': '3', 'n': '2399'}, '2310',
         'incorrect'),
    spec('suit 5 999 : 6 000', 2, {'a': '5', 'b': '9', 'n': '5999'}, '6000', 'correct'),
    spec('borne : suit 9 999 : 10 000', 2, {'a': '9', 'b': '9', 'n': '9999'}, '10000',
         'correct'),
    spec('précède 4 520 : 4 519', 3, {'a': '4', 'b': '5', 'c': '2', 'n': '4520'}, '4519',
         'correct'),
    spec('précède 3 400 : 3 399', 3, {'a': '3', 'b': '4', 'c': '0', 'n': '3400'}, '3399',
         'correct'),
    spec('Erreur : précède 3 400 : 3 309', 3, {'a': '3', 'b': '4', 'c': '0', 'n': '3400'}, '3309',
         'incorrect'),
    spec('précède 7 000 : 6 999', 3, {'a': '7', 'b': '0', 'c': '0', 'n': '7000'}, '6999',
         'correct'),
    spec('Erreur : précède 7 000 : 6 099', 3, {'a': '7', 'b': '0', 'c': '0', 'n': '7000'}, '6099',
         'incorrect'),
    spec('borne : précède 10 000 : 9 999', 3, {'a': '10', 'b': '0', 'c': '0', 'n': '10000'},
         '9999', 'correct'),
]

# --- 5. CE2-004 : lire un nombre écrit en lettres --------------------------------------------
# Cas qui piègent : zéros intérieurs, 70 à 99, « mille » sans s, cents / cent, et-un

EN_LETTRES = [2307, 4050, 1999, 7080, 3071, 6094, 9015, 1200, 5600, 2081, 8770, 4999, 1001,
              3460, 7203, 9090, 6312, 2500, 8016, 5170, 3008, 1780]

LIRE = [
    variation('Écris ce nombre en chiffres.\n\n' + par('n', EN_LETTRES, lettres)
              + '\n\nEn chiffres : $?$.',
              [var('n', '|'.join(str(n) for n in EN_LETTRES))], ['{{n}}'],
              ['On lit le nombre morceau par morceau : d\'abord les milliers, puis les centaines,'
               ' puis le reste.',
               'Un rang qui n\'est pas dit s\'écrit avec un $0$.',
               'En chiffres : ${{n}}$.']),
]

SPECS_LIRE = [
    spec('deux-mille-trois-cent-sept = 2 307', 0, {'n': '2307'}, '2307', 'correct'),
    spec('Erreur : 2 000 300 7 (morceaux accolés)', 0, {'n': '2307'}, '20003007', 'incorrect'),
    spec('Erreur : zéro oublié (237)', 0, {'n': '2307'}, '237', 'incorrect'),
    spec('quatre-mille-cinquante = 4 050', 0, {'n': '4050'}, '4050', 'correct'),
    spec('Erreur : 4 500', 0, {'n': '4050'}, '4500', 'incorrect'),
    spec('trois-mille-soixante-et-onze = 3 071', 0, {'n': '3071'}, '3071', 'correct'),
    spec('Erreur : soixante-et-onze écrit 6011 (36 011)', 0, {'n': '3071'}, '36011', 'incorrect'),
    spec('six-mille-quatre-vingt-quatorze = 6 094', 0, {'n': '6094'}, '6094', 'correct'),
    spec('Erreur : quatre-vingt-quatorze lu 814 (6 814)', 0, {'n': '6094'}, '6814', 'incorrect'),
]

# --- 6. CE2-008 : ranger cinq nombres ------------------------------------------------------
# Comme l'exemple du programme (6 234, 6 243, 6 239, 6 300, 5 229) : trois nombres de la même
# centaine, dont deux aux chiffres échangés (6 234 / 6 243), la centaine suivante, et un nombre
# du millier précédent qui finit comme les autres.

RANG = [var('m', '2..9'), var('c', '1..8'), var('t', '1..7'), var('u', '{{eval:t+1}}..8'),
        var('s1', 'eval:1000*(m-1)+100*c+10*(t-1)+9'), var('s2', 'eval:1000*m+100*c+10*t+u'),
        var('s3', 'eval:1000*m+100*c+10*t+9'), var('s4', 'eval:1000*m+100*c+10*u+t'),
        var('s5', 'eval:1000*m+100*(c+1)'), var('o', '1..4')]
# Ordre d'affichage : une permutation par valeur de o
ORDRES = [['s3', 's1', 's5', 's2', 's4'], ['s2', 's5', 's4', 's1', 's3'],
          ['s4', 's2', 's1', 's5', 's3'], ['s5', 's3', 's2', 's4', 's1']]
AFFICHE = [var(f'x{i + 1}', 'eval:{{if:o==1|' + ORDRES[0][i] + '|{{if:o==2|' + ORDRES[1][i]
               + '|{{if:o==3|' + ORDRES[2][i] + '|' + ORDRES[3][i] + '}}}}}}')
           for i in range(5)]
LISTE = '${{x1}} \\quad ; \\quad {{x2}} \\quad ; \\quad {{x3}} \\quad ; \\quad {{x4}} \\quad ; \\quad {{x5}}$'
COMPARER = ['On compare d\'abord les milliers : ${{s1}}$ a ${{eval:m-1}}$ {{if:m<=2|millier|milliers}},'
            ' les autres en'
            ' ont ${{m}}$.',
            'Parmi les nombres de ${{m}}$ milliers, ${{s5}}$ a le plus grand chiffre des centaines'
            ' : ${{eval:c+1}}$, les trois autres ont ${{c}}$.',
            'Pour les nombres de la même centaine, on compare les dizaines, puis les unités.']

RANGER = [
    variation('Range ces nombres du plus petit au plus grand.\n\n' + LISTE + '\n\n$$?<?<?<?<?$$',
              RANG + AFFICHE, ['{{s1}}', '{{s2}}', '{{s3}}', '{{s4}}', '{{s5}}'],
              COMPARER + ['$${{s1}} < {{s2}} < {{s3}} < {{s4}} < {{s5}}$$']),
    variation('Range ces nombres du plus grand au plus petit.\n\n' + LISTE + '\n\n$$?>?>?>?>?$$',
              RANG + AFFICHE, ['{{s5}}', '{{s4}}', '{{s3}}', '{{s2}}', '{{s1}}'],
              COMPARER + ['$${{s5}} > {{s4}} > {{s3}} > {{s2}} > {{s1}}$$']),
]

EX = {'m': '6', 'c': '2', 't': '3', 'u': '4', 's1': '5229', 's2': '6234', 's3': '6239',
      's4': '6243', 's5': '6300', 'o': '1'}
SPECS_RANGER = [
    spec('croissant : 5 229 < 6 234 < 6 239 < 6 243 < 6 300', 0, EX,
         ['5229', '6234', '6239', '6243', '6300'], 'correct'),
    spec('Erreur : 6 243 avant 6 239 (unités lues d\'abord)', 0, EX,
         ['5229', '6234', '6243', '6239', '6300'], 'incorrect'),
    spec('Erreur : 5 229 après 6 234 (centaines lues d\'abord)', 0, EX,
         ['6234', '5229', '6239', '6243', '6300'], 'incorrect'),
    spec('Erreur : ordre décroissant', 0, EX, ['6300', '6243', '6239', '6234', '5229'],
         'incorrect'),
    spec('décroissant : 6 300 > 6 243 > 6 239 > 6 234 > 5 229', 1, EX,
         ['6300', '6243', '6239', '6234', '5229'], 'correct'),
    spec('borne : 8 809 < 9 812 < 9 819 < 9 821 < 9 900', 0,
         {'m': '9', 'c': '8', 't': '1', 'u': '2', 's1': '8809', 's2': '9812', 's3': '9819',
          's4': '9821', 's5': '9900', 'o': '4'}, ['8809', '9812', '9819', '9821', '9900'],
         'correct'),
]

# --- 7. CE2-009 : « supérieur à », « inférieur à », « compris entre » -------------------------

EXPRESSIONS = [
    variation('Écris un nombre supérieur à ${{n}}$.\n\nUn nombre supérieur à ${{n}}$ : $?$.',
              [var('n', '1000..9900')], [entre('{{n}}', '1000000', '{{eval:n+1}}')],
              ['Un nombre supérieur à ${{n}}$ est plus grand que ${{n}}$ : il vient après dans la'
               ' suite des nombres.',
               'Par exemple ${{eval:n+1}}$ ou ${{eval:n+10}}$ : $${{eval:n+1}} > {{n}}$$']),
    variation('Écris un nombre inférieur à ${{n}}$.\n\nUn nombre inférieur à ${{n}}$ : $?$.',
              [var('n', '1000..9900')], [entre('-1', '{{n}}', '{{eval:n-1}}')],
              ['Un nombre inférieur à ${{n}}$ est plus petit que ${{n}}$ : il vient avant dans la'
               ' suite des nombres.',
               'Par exemple ${{eval:n-1}}$ ou ${{eval:n-10}}$ : $${{eval:n-1}} < {{n}}$$']),
    variation('Écris un nombre compris entre ${{a}}$ et ${{eval:a+10}}$.\n\n'
              'Un nombre compris entre ${{a}}$ et ${{eval:a+10}}$ : $?$.',
              [var('m', '100..998'), var('a', 'eval:10*m')],
              [entre('{{a}}', '{{eval:a+10}}', '{{eval:a+5}}')],
              ['Un nombre compris entre ${{a}}$ et ${{eval:a+10}}$ est plus grand que ${{a}}$ et'
               ' plus petit que ${{eval:a+10}}$.',
               'Ce sont les nombres de ${{eval:a+1}}$ à ${{eval:a+9}}$ : n\'importe lequel convient.',
               '$${{a}} < {{eval:a+5}} < {{eval:a+10}}$$']),
    variation('Écris un nombre supérieur à ${{a}}$ et inférieur à ${{b}}$.\n\n'
              'Un nombre supérieur à ${{a}}$ et inférieur à ${{b}}$ : $?$.',
              [var('a', '1000..9980'), var('k', '3..20'), var('b', 'eval:a+k')],
              [entre('{{a}}', '{{b}}', '{{eval:a+1}}')],
              ['Le nombre doit être plus grand que ${{a}}$ et plus petit que ${{b}}$.',
               'Ce sont les nombres de ${{eval:a+1}}$ à ${{eval:b-1}}$ : n\'importe lequel convient.',
               '$${{a}} < {{eval:a+1}} < {{b}}$$']),
]

SPECS_EXPRESSIONS = [
    spec('supérieur à 4 572 : 4 573', 0, {'n': '4572'}, '4573', 'correct'),
    spec('supérieur à 4 572 : 9 000', 0, {'n': '4572'}, '9000', 'correct'),
    spec('Erreur : 4 572 lui-même', 0, {'n': '4572'}, '4572', 'incorrect'),
    spec('Erreur : inférieur (4 000)', 0, {'n': '4572'}, '4000', 'incorrect'),
    spec('inférieur à 4 572 : 4 571', 1, {'n': '4572'}, '4571', 'correct'),
    spec('inférieur à 4 572 : 0', 1, {'n': '4572'}, '0', 'correct'),
    spec('Erreur : supérieur (5 000)', 1, {'n': '4572'}, '5000', 'incorrect'),
    spec('compris entre 3 470 et 3 480 : 3 475', 2, {'m': '347', 'a': '3470'}, '3475', 'correct'),
    spec('Erreur : borne 3 480', 2, {'m': '347', 'a': '3470'}, '3480', 'incorrect'),
    spec('Erreur : 3 470 lui-même', 2, {'m': '347', 'a': '3470'}, '3470', 'incorrect'),
    spec('supérieur à 5 286 et inférieur à 5 291 : 5 290', 3,
         {'a': '5286', 'k': '5', 'b': '5291'}, '5290', 'correct'),
    spec('Erreur : 5 291 lui-même', 3, {'a': '5286', 'k': '5', 'b': '5291'}, '5291', 'incorrect'),
]

# --- 8. CE2-087 : encadrer un nombre -------------------------------------------------------

NOMBRE = [var('a', '1..9'), var('b', '0..9'), var('d', '0..9'), var('u', '1..9'),
          var('n', 'eval:1000*a+100*b+10*d+u')]

ENCADRER = [
    variation('Écris le nombre juste avant et le nombre juste après ${{n}}$.\n\n$$?<{{n}}<?$$',
              [var('n', '1001..9998')], ['{{eval:n-1}}', '{{eval:n+1}}'],
              ['Le nombre juste avant, c\'est celui qui précède ; le nombre juste après, celui qui'
               ' suit.',
               '$${{eval:n-1}} < {{n}} < {{eval:n+1}}$$']),
    variation('Encadre ${{n}}$ entre deux dizaines entières qui se suivent.\n\n$$?<{{n}}<?$$',
              NOMBRE, ['{{eval:1000*a+100*b+10*d}}', '{{eval:1000*a+100*b+10*d+10}}'],
              ['${{n}}$, c\'est ${{eval:100*a+10*b+d}}$ dizaines et ${{u}}$ ' + accord('unité', 'u')
               + '.',
               'Il est entre ${{eval:100*a+10*b+d}}$ dizaines et ${{eval:100*a+10*b+d+1}}$'
               ' dizaines.',
               '$${{eval:1000*a+100*b+10*d}} < {{n}} < {{eval:1000*a+100*b+10*d+10}}$$']),
    variation('Encadre ${{n}}$ entre deux centaines entières qui se suivent.\n\n$$?<{{n}}<?$$',
              NOMBRE, ['{{eval:1000*a+100*b}}', '{{eval:1000*a+100*b+100}}'],
              ['${{n}}$, c\'est ${{eval:10*a+b}}$ centaines et ${{eval:10*d+u}}$ unités.',
               'Il est entre ${{eval:10*a+b}}$ centaines et ${{eval:10*a+b+1}}$ centaines.',
               '$${{eval:1000*a+100*b}} < {{n}} < {{eval:1000*a+100*b+100}}$$']),
    variation('Encadre ${{n}}$ entre deux milliers entiers qui se suivent.\n\n$$?<{{n}}<?$$',
              NOMBRE, ['{{eval:1000*a}}', '{{eval:1000*a+1000}}'],
              ['${{n}}$ a ${{a}}$ ' + accord('millier', 'a') + '.',
               'Il est entre ${{a}}$ ' + accord('millier', 'a') + ' et ${{eval:a+1}}$ milliers.',
               '$${{eval:1000*a}} < {{n}} < {{eval:1000*a+1000}}$$']),
]

EX_N = {'a': '6', 'b': '2', 'd': '3', 'u': '9', 'n': '6239'}
SPECS_ENCADRER = [
    spec('6 238 < 6 239 < 6 240', 0, {'n': '6239'}, ['6238', '6240'], 'correct'),
    spec('Erreur : 6 230 < 6 239 < 6 240', 0, {'n': '6239'}, ['6230', '6240'], 'incorrect'),
    spec('6 230 < 6 239 < 6 240', 1, EX_N, ['6230', '6240'], 'correct'),
    spec('Erreur : 6 238 < 6 239 < 6 240', 1, EX_N, ['6238', '6240'], 'incorrect'),
    spec('borne : 9 990 < 9 991 < 10 000', 1, {'a': '9', 'b': '9', 'd': '9', 'u': '1', 'n': '9991'},
         ['9990', '10000'], 'correct'),
    spec('6 200 < 6 239 < 6 300', 2, EX_N, ['6200', '6300'], 'correct'),
    spec('Erreur : dizaines (6 230 < 6 239 < 6 240)', 2, EX_N, ['6230', '6240'], 'incorrect'),
    spec('borne : 9 900 < 9 905 < 10 000', 2, {'a': '9', 'b': '9', 'd': '0', 'u': '5', 'n': '9905'},
         ['9900', '10000'], 'correct'),
    spec('6 000 < 6 239 < 7 000', 3, EX_N, ['6000', '7000'], 'correct'),
    spec('Erreur : centaines (6 200 < 6 239 < 6 300)', 3, EX_N, ['6200', '6300'], 'incorrect'),
    spec('borne : 9 000 < 9 405 < 10 000', 3,
         {'a': '9', 'b': '4', 'd': '0', 'u': '5', 'n': '9405'}, ['9000', '10000'], 'correct'),
]

# --- 9. CE2-088 : intercaler un nombre -----------------------------------------------------

BANDE = ('Complète la suite des nombres.\n\n$${{s}} \\quad ; \\quad {{eval:s+1}} \\quad ;'
         ' \\quad ? \\quad ; \\quad ? \\quad ; \\quad {{eval:s+4}}$$')
BANDE_CORRIGEE = ('$${{s}} \\quad ; \\quad {{eval:s+1}} \\quad ; \\quad {{eval:s+2}} \\quad ;'
                  ' \\quad {{eval:s+3}} \\quad ; \\quad {{eval:s+4}}$$')

INTERCALER = [
    variation('Complète avec un nombre.\n\n$${{a}}<?<{{b}}$$',
              [var('a', '1000..9990'), var('k', '2..10'), var('b', 'eval:a+k')],
              [entre('{{a}}', '{{b}}', '{{eval:a+1}}')],
              ['Le nombre cherché est plus grand que ${{a}}$ et plus petit que ${{b}}$.',
               '{{if:k==2|Il n\'y en a qu\'un : ${{eval:a+1}}$.|Ce sont les nombres de'
               ' ${{eval:a+1}}$ à ${{eval:b-1}}$ : n\'importe lequel convient.}}']),
    variation(BANDE,
              [var('a', '1..9'), var('b', '0..9'), var('d', '0..9'), var('u', '7..8'),
               var('s', 'eval:1000*a+100*b+10*d+u')],
              ['{{eval:s+2}}', '{{eval:s+3}}'],
              ['Dans la suite des nombres, on avance de $1$ à chaque fois.',
               '{{if:d==9|{{if:b==9|On passe au millier suivant.|On passe à la centaine'
               ' suivante.}}|On passe à la dizaine suivante.}}',
               BANDE_CORRIGEE],
              ['1000*a + 100*b + 10*d + u <= 9996']),
    variation(BANDE,
              [var('a', '1..8'), var('u', '7..8'), var('s', 'eval:1000*a+990+u')],
              ['{{eval:s+2}}', '{{eval:s+3}}'],
              ['Dans la suite des nombres, on avance de $1$ à chaque fois.',
               'Après ${{eval:1000*a+999}}$, on passe au millier suivant : ${{eval:1000*a+1000}}$.',
               BANDE_CORRIGEE]),
]

SPECS_INTERCALER = [
    spec('2 393 < 2 394 < 2 396', 0, {'a': '2393', 'k': '3', 'b': '2396'}, '2394', 'correct'),
    spec('2 393 < 2 395 < 2 396', 0, {'a': '2393', 'k': '3', 'b': '2396'}, '2395', 'correct'),
    spec('Erreur : borne 2 396', 0, {'a': '2393', 'k': '3', 'b': '2396'}, '2396', 'incorrect'),
    spec('Erreur : borne 2 393', 0, {'a': '2393', 'k': '3', 'b': '2396'}, '2393', 'incorrect'),
    spec('dizaine : 2 387 ; 2 388 ; 2 389 ; 2 390 ; 2 391', 1,
         {'a': '2', 'b': '3', 'd': '8', 'u': '7', 's': '2387'}, ['2389', '2390'], 'correct'),
    spec('Erreur : 2 389 ; 23 810', 1, {'a': '2', 'b': '3', 'd': '8', 'u': '7', 's': '2387'},
         ['2389', '23810'], 'incorrect'),
    spec('centaine : 4 598 ; 4 599 ; 4 600 ; 4 601 ; 4 602', 1,
         {'a': '4', 'b': '5', 'd': '9', 'u': '8', 's': '4598'}, ['4600', '4601'], 'correct'),
    spec('Erreur : 45 100', 1, {'a': '4', 'b': '5', 'd': '9', 'u': '8', 's': '4598'},
         ['45100', '45101'], 'incorrect'),
    spec('millier : 2 997 ; 2 998 ; 2 999 ; 3 000 ; 3 001', 2, {'a': '2', 'u': '7', 's': '2997'},
         ['2999', '3000'], 'correct'),
    spec('Erreur : 2 999 ; 2 1000', 2, {'a': '2', 'u': '7', 's': '2997'}, ['2999', '21000'],
         'incorrect'),
    spec('Erreur : 2 999 ; 2 900', 2, {'a': '2', 'u': '7', 's': '2997'}, ['2999', '2900'],
         'incorrect'),
]

MODELES = {
    '01-milliers-centaines-dizaines': modele(
        'Milliers, centaines et dizaines',
        '1 millier = 10 centaines = 100 dizaines ; nombre de centaines dans 4 357',
        'Décomposition', 18, MCD, SPECS_MCD),
    '02-lots-de-100': modele(
        'Ranger par lots de $100$ ou de $10$',
        '1 235 filtres par lots de 100 : 13 lots (le dernier n\'est pas plein)',
        'Décomposition', 20, LOTS, SPECS_LOTS, delay=40),
    '03-unites-non-canoniques': modele(
        'Unités non canoniques et décompositions (jusqu\'à $10\\,000$)',
        '3 d, 46 c et 5 u ; 17 u, 8 d, 32 c et 2 milliers ; (4 × 1 000) + … ;'
        ' 4 635 = 4 000 + 600 + 30 + 5', 'Décomposition', 19, NON_CANONIQUES,
        SPECS_NON_CANONIQUES, delay=30),
    '04-suite-jusqu-a-10000': modele(
        'Le nombre qui suit, le nombre qui précède (jusqu\'à $10\\,000$)',
        'Avec passage de la dizaine, de la centaine, du millier, et 9 999 → 10 000', 'Ecriture',
        17, SUITE, SPECS_SUITE),
    '05-lire-un-nombre-en-lettres': modele(
        'Écrire en chiffres un nombre écrit en lettres (jusqu\'à $10\\,000$)',
        'deux-mille-trois-cent-sept → 2 307 ; zéros intérieurs, 70 à 99, « mille » invariable',
        'Ecriture', 18, LIRE, SPECS_LIRE, delay=30),
    '06-ranger-cinq-nombres': modele(
        'Ranger cinq nombres (jusqu\'à $10\\,000$)',
        'Nombres proches : 6 234, 6 243, 6 239, 6 300, 5 229', 'Comparer', 10, RANGER,
        SPECS_RANGER, delay=40),
    '07-superieur-inferieur-compris': modele(
        'Supérieur à, inférieur à, compris entre (jusqu\'à $10\\,000$)',
        'Écrire un nombre qui respecte la phrase (toute réponse juste acceptée)', 'Comparer', 11,
        EXPRESSIONS, SPECS_EXPRESSIONS),
    '08-encadrer-dizaine-centaine-millier': modele(
        'Encadrer un nombre (unité, dizaine, centaine, millier)',
        '6 238 < 6 239 < 6 240 ; 6 230 < 6 239 < 6 240 ; 6 200 < … < 6 300 ; 6 000 < … < 7 000',
        'Encadrer', 11, ENCADRER, SPECS_ENCADRER),
    '09-intercaler-jusqu-a-10000': modele(
        'Intercaler un nombre (jusqu\'à $10\\,000$)',
        '2 393 < … < 2 396 ; suite à trous avec passage de la dizaine, de la centaine, du millier',
        'Encadrer', 12, INTERCALER, SPECS_INTERCALER),
}

for nom, m in MODELES.items():
    with open(f'{DOSSIER}/{nom}.json', 'w') as f:
        json.dump(m, f, ensure_ascii=False, indent='\t')
        f.write('\n')
print(len(MODELES), 'modèles écrits')
