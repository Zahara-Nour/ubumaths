"""Écrit les 7 modèles du lot 5a du CM1 (longueurs) dans scripts/questions/cm1-5a/.

Phase 0 validée par David le 2026-11-02 (§ 14 et 14 bis du journal
`docs/wip/questions-cm1-progress.md`). Bornes `cycle3.json`, CM1-067 à 072 :
- 067 : unités du millimètre au kilomètre (mm, cm, dm, m, dam, hm, km) et leurs symboles ;
- 068 : relations entre unités successives, sans tableau (1 cm = 1/10 dm = 0,1 dm ;
  215 cm = 2,15 m ; 1/2 km = 500 m ; 3/4 m = 75 cm) ;
- 069 : choisir l'unité adaptée ; 070 : ranger jusqu'à quatre longueurs d'unités différentes,
  somme ou différence de deux longueurs d'unités différentes ; 071 : longueurs de référence ;
  072 : estimer.
Décisions : réponse numérique en case, l'unité écrite après la case ; décimaux à virgule exigée
(motif `a:number`, comme CM1-031) ; fractions dans l'énoncé seulement ; choix en case « choix » ;
corrigés par les relations entre unités successives, jamais par le tableau de conversion.
Catégories `Grandeurs · Longueurs · …` (celles du CP au CE2) ; niveaux relevés au MCP le
2026-11-02 : Unités 2, 4-11 pris → 12 à 15 ; Comparaison et mesure 1-4 → 5 ; Ordres de grandeur
3-5 → 6, 7.

    python3 docs/wip/questions/lot-cm1-5a.py scripts/questions/cm1-5a
"""
import json
import sys

DOSSIER = sys.argv[1]
OPTIONS = {'constraints': {'spacesFromFourDigits': True}}
VIRGULE_EXIGEE = {'pattern': 'a:number'}

# ---- Gabarits ----


def spec(desc, vi, variables, answers, status, violations=None):
    s = {'description': desc, 'variationIndex': vi,
         'variables': {k: str(x) for k, x in variables.items()},
         'answers': answers if isinstance(answers, list) else [answers],
         'expected': {'status': status}}
    if violations:
        s['expected']['constraintViolations'] = violations
    return s


def modele(title, description, subdomain, level, variations, specs, delay=60):
    # theme / domain / subdomain : anciennes colonnes, remplies pour create-questions ; le
    # rangement (sous-notion du point) est posé par la migration
    return {'title': title, 'description': description, 'grades': ['CM1'], 'theme': 'Grandeurs',
            'domain': 'Longueurs', 'subdomain': subdomain, 'level': level, 'delay': delay,
            'status': 'draft', 'options': OPTIONS, 'variations': variations,
            'testSpecs': specs}


def var(nom, expression):
    return {'name': nom, 'expression': expression}


def variation(statement, reponses, variables, etapes, conditions=None):
    # Chaque `?` de l'énoncé est une case, dans l'ordre de `reponses` ; `reponses=None` : la
    # case vient du bloc ```ranger
    v = {'statement': statement, 'variables': variables}
    if conditions:
        v['conditions'] = conditions
    if reponses is not None:
        v['blanks'] = [r if isinstance(r, dict) else {'expectedAnswer': r} for r in reponses]
    v['correction'] = {'steps': etapes}
    return v


def decimal(x):
    return {'expectedAnswer': x, 'requiredForm': VIRGULE_EXIGEE}


def choix(lignes, melanger=True):
    tete = '' if melanger else 'melanger: non\n'
    return '\n\n```choix\n' + tete + ''.join('- ' + c + '\n' for c in lignes) + '```'


def selon(k, textes, n=1):
    """`{{if:k==1|…|{{if:k==2|…|…}}}}` : le texte numéro k (à partir de 1)."""
    if len(textes) == 1:
        return textes[0]
    return ('{{if:' + k + '==' + str(n) + '|' + textes[0] + '|' + selon(k, textes[1:], n + 1)
            + '}}')


def ev(x):
    return '{{eval:' + x + '}}'


def evd(x):
    return '{{eval:' + x + ';d}}'


def col(x, k=0):
    return '\\textcolor{{{color:primary.' + str(k) + '}}}{' + x + '}'


def U(n, u):
    return str(n) + '~\\unit{' + u + '}'


def etiquettes(signe, noms):
    return ('```ranger\nsigne: ' + signe + '\n' + '\n'.join('- ' + n for n in noms)
            + '\n```')


def complete(gauche, unite):
    """« Complète. » + l'égalité, la case suivie de l'unité attendue."""
    return 'Complète.\n\n$' + gauche + ' = ?~\\text{' + unite + '}$'


MILLE = '1\\,000'
SIGNE = '{{if:r==0|<|{{if:r==1|=|>}}}}'
SIGNES = choix(['$<$', '$=$', '$>$'], melanger=False)

# Les sept unités, de la plus grande à la plus petite
SYMBOLES = ['km', 'hm', 'dam', 'm', 'dm', 'cm', 'mm']
NOMS = ['kilomètre', 'hectomètre', 'décamètre', 'mètre', 'décimètre', 'centimètre',
        'millimètre']
# « l'hectomètre » : h muet
LE = ['l\'' + n if n[0] == 'h' else 'le ' + n for n in NOMS]
DU = ['de l\'' + n if n[0] == 'h' else 'du ' + n for n in NOMS]
LIGNES = [le + ' (' + s + ')' for le, s in zip(LE, SYMBOLES)]
SUCCESSIVES = ('Chaque unité de longueur vaut **10 fois** la suivante : km, hm, dam, m, dm, cm,'
               ' mm.')

MODELES = {}

# =============== 1. CM1-067 : les unités de longueur, du mm au km ===============

SYMBOLE = variation(
    'Quel est le symbole ' + selon('k', DU) + ' ?' + choix(SYMBOLES), ['{{r}}'],
    [var('k', '1..7'), var('r', 'eval:k-1')],
    ['« kilo » veut dire mille, « hecto » cent, « déca » dix ; « déci » un dixième, « centi » un'
     ' centième, « milli » un millième.',
     selon('k', [x[0].upper() + x[1:] for x in LE]) + ' s\'écrit **' + selon('k', SYMBOLES) + '**.'])

SENS = variation(
    'Que veut dire le symbole **' + selon('k', SYMBOLES) + '** ?' + choix(NOMS), ['{{r}}'],
    [var('k', '1..7'), var('r', 'eval:k-1')],
    ['« kilo » veut dire mille, « hecto » cent, « déca » dix ; « déci » un dixième, « centi » un'
     ' centième, « milli » un millième.',
     '**' + selon('k', SYMBOLES) + '** veut dire **' + selon('k', NOMS) + '**.'])

# Trois unités (indices dans SYMBOLES, de la plus grande à la plus petite) ; la bonne réponse
# est en premier, le choix est mélangé à l'affichage
TRIPLES = [(0, 1, 3), (1, 2, 4), (2, 3, 5), (0, 2, 6), (3, 4, 6), (1, 3, 5)]


def triple_lignes(s):
    # s == 1 : la plus grande en premier ; s == 2 : la plus petite en premier
    grande = [LIGNES[t[0]] for t in TRIPLES]
    milieu = [LIGNES[t[1]] for t in TRIPLES]
    petite = [LIGNES[t[2]] for t in TRIPLES]
    return ['{{if:s==1|' + selon('k', grande) + '|' + selon('k', petite) + '}}',
            selon('k', milieu),
            '{{if:s==1|' + selon('k', petite) + '|' + selon('k', grande) + '}}']


EXTREME = variation(
    'Quelle est la plus {{if:s==1|grande|petite}} de ces trois unités de longueur ?'
    + choix(triple_lignes(None)), ['0'],
    [var('k', '1..6'), var('s', '1..2')],
    ['Du plus grand au plus petit : km, hm, dam, m, dm, cm, mm.',
     'La plus {{if:s==1|grande est **' + selon('k', [LIGNES[t[0]] for t in TRIPLES])
     + '**|petite est **' + selon('k', [LIGNES[t[2]] for t in TRIPLES]) + '**}}.'])

MODELES['01-unites-de-longueur-du-mm-au-km'] = modele(
    'Les unités de longueur, du millimètre au kilomètre',
    'Symbole et sens de mm, cm, dm, m, dam, hm, km ; la plus grande ou la plus petite de trois'
    ' unités', 'Unités', 12, [SYMBOLE, SENS, EXTREME],
    [spec('symbole de l\'hectomètre : hm', 0, {'k': 2, 'r': 1}, '1', 'correct'),
     spec('Erreur : hectomètre → dam', 0, {'k': 2, 'r': 1}, '2', 'incorrect'),
     spec('symbole du décamètre : dam', 0, {'k': 3, 'r': 2}, '2', 'correct'),
     spec('Erreur : décamètre → dm', 0, {'k': 3, 'r': 2}, '4', 'incorrect'),
     spec('dm veut dire décimètre', 1, {'k': 5, 'r': 4}, '4', 'correct'),
     spec('Erreur : dm lu décamètre', 1, {'k': 5, 'r': 4}, '2', 'incorrect'),
     spec('hm veut dire hectomètre', 1, {'k': 2, 'r': 1}, '1', 'correct'),
     spec('la plus grande de km, hm, m : km', 2, {'k': 1, 's': 1}, '0', 'correct'),
     spec('Erreur : la plus grande → m', 2, {'k': 1, 's': 1}, '2', 'incorrect'),
     spec('la plus petite de hm, dam, dm : dm', 2, {'k': 2, 's': 2}, '0', 'correct'),
     spec('Erreur : la plus petite → dam (déca/déci confondus)', 2, {'k': 2, 's': 2}, '1',
          'incorrect')],
    delay=45)

# =============== 2. CM1-068 : relations entre unités (entiers) ===============
# Unité X = SYMBOLES[x-1], unité Y plus petite ; facteur 10^(y-x)

UX = selon('x', SYMBOLES)
UY = selon('y', SYMBOLES)
FACTEUR = '{{if:y-x==1|10|{{if:y-x==2|100|' + MILLE + '}}}}'

UN_CRAN = variation(
    complete('{{a}}~\\unit{' + UX + '}', UY), [ev('10*a')],
    [var('x', '1..6'), var('y', 'eval:x+1'), var('a', '2..99')],
    [SUCCESSIVES, '$1~\\unit{' + UX + '} = 10~\\unit{' + UY + '}$, donc ${{a}}~\\unit{' + UX
     + '}$, c\'est ${{a}}$ fois $10~\\unit{' + UY + '}$.',
     '$${{a}}~\\unit{' + UX + '} = ' + col(ev('10*a')) + '~\\unit{' + UY + '}$$'])

UN_CRAN_RETOUR = variation(
    complete(ev('10*a') + '~\\unit{' + UY + '}', UX), ['{{a}}'],
    [var('x', '1..6'), var('y', 'eval:x+1'), var('a', '2..99')],
    [SUCCESSIVES, '$10~\\unit{' + UY + '} = 1~\\unit{' + UX + '}$ : dans $' + ev('10*a')
     + '~\\unit{' + UY + '}$, il y a ${{a}}$ fois $10~\\unit{' + UY + '}$.',
     '$$' + ev('10*a') + '~\\unit{' + UY + '} = ' + col('{{a}}') + '~\\unit{' + UX + '}$$'])

DEUX_CRANS = variation(
    complete('{{a}}~\\unit{' + UX + '}', UY), [ev('a*10^(y-x)')],
    [var('x', '1..5'), var('d', '2..3'), var('y', 'eval:x+d'), var('a', '2..30')],
    [SUCCESSIVES, 'De ' + UX + ' à ' + UY + ', on descend de {{d}} unités : on multiplie {{d}}'
     ' fois par 10, c\'est-à-dire par $' + FACTEUR + '$ : $1~\\unit{' + UX + '} = ' + FACTEUR
     + '~\\unit{' + UY + '}$.',
     '$${{a}}~\\unit{' + UX + '} = ' + col(ev('a*10^(y-x)')) + '~\\unit{' + UY + '}$$'],
    conditions=['y <= 7'])

KM_ET_M = variation(
    complete('{{a}}~\\unit{km}~{{b}}~\\unit{m}', 'm'), [ev('1000*a+b')],
    [var('a', '1..30'), var('b', '1..999')],
    ['$1~\\unit{km} = ' + MILLE + '~\\unit{m}$, donc ${{a}}~\\unit{km} = ' + ev('1000*a')
     + '~\\unit{m}$.', '$$' + ev('1000*a') + '~\\unit{m} + {{b}}~\\unit{m} = '
     + col(ev('1000*a+b')) + '~\\unit{m}$$'])

M_ET_CM = variation(
    complete('{{a}}~\\unit{m}~{{b}}~\\unit{cm}', 'cm'), [ev('100*a+b')],
    [var('a', '1..30'), var('b', '1..99')],
    ['$1~\\unit{m} = 100~\\unit{cm}$, donc ${{a}}~\\unit{m} = ' + ev('100*a')
     + '~\\unit{cm}$.', '$$' + ev('100*a') + '~\\unit{cm} + {{b}}~\\unit{cm} = '
     + col(ev('100*a+b')) + '~\\unit{cm}$$'])

MODELES['02-relations-entre-unites-de-longueur'] = modele(
    'Relations entre les unités de longueur',
    '1 unité = 10 fois l\'unité suivante : 7 dam = 70 m ; 340 mm = 34 cm ; 5 hm = 500 m ;'
    ' 3 km 250 m = 3 250 m ; 4 m 5 cm = 405 cm', 'Unités', 14,
    [UN_CRAN, UN_CRAN_RETOUR, DEUX_CRANS, KM_ET_M, M_ET_CM],
    [spec('7 dam = 70 m', 0, {'x': 3, 'y': 4, 'a': 7}, '70', 'correct'),
     spec('Erreur : 7 dam = 700 m', 0, {'x': 3, 'y': 4, 'a': 7}, '700', 'incorrect'),
     spec('34 hm = 340 dam', 0, {'x': 2, 'y': 3, 'a': 34}, '340', 'correct'),
     spec('340 mm = 34 cm', 1, {'x': 6, 'y': 7, 'a': 34}, '34', 'correct'),
     spec('Erreur : 340 mm = 3 400 cm (sens inversé)', 1, {'x': 6, 'y': 7, 'a': 34}, '3 400',
          'incorrect'),
     spec('5 hm = 500 m', 2, {'x': 2, 'd': 2, 'y': 4, 'a': 5}, '500', 'correct'),
     spec('4 m = 4 000 mm', 2, {'x': 4, 'd': 3, 'y': 7, 'a': 4}, '4 000', 'correct'),
     spec('Erreur : 4 m = 400 mm', 2, {'x': 4, 'd': 3, 'y': 7, 'a': 4}, '400', 'incorrect'),
     spec('Forme : 4000 sans espace', 2, {'x': 4, 'd': 3, 'y': 7, 'a': 4}, '4000',
          'unoptimal_form', ['spaces']),
     spec('3 km 250 m = 3 250 m', 3, {'a': 3, 'b': 250}, '3 250', 'correct'),
     spec('3 km 40 m = 3 040 m', 3, {'a': 3, 'b': 40}, '3 040', 'correct'),
     spec('Erreur : 3 km 40 m = 3 400 m (zéro oublié)', 3, {'a': 3, 'b': 40}, '3 400',
          'incorrect'),
     spec('Erreur : 3 km 40 m = 43 m', 3, {'a': 3, 'b': 40}, '43', 'incorrect'),
     spec('4 m 5 cm = 405 cm', 4, {'a': 4, 'b': 5}, '405', 'correct'),
     spec('Erreur : 4 m 5 cm = 450 cm', 4, {'a': 4, 'b': 5}, '450', 'incorrect')],
    delay=90)

# =============== 3. CM1-068 : décimaux et fractions ===============

CM_EN_M = variation(
    complete('{{n}}~\\unit{cm}', 'm'), [decimal(evd('n/100'))],
    [var('n', '101..999'), var('m', 'eval:floor(n/100)'), var('c', 'eval:mod(n,100)')],
    ['$100~\\unit{cm} = 1~\\unit{m}$, donc $1~\\unit{cm} = \\dfrac{1}{100}~\\unit{m}$ : un'
     ' centimètre est un centième de mètre.',
     '${{n}}~\\unit{cm} = {{m}}~\\unit{m}~{{c}}~\\unit{cm}$, c\'est {{m}}'
     ' {{if:m==1|mètre|mètres}} et {{c}} {{if:c==1|centième|centièmes}} de mètre.',
     '$${{n}}~\\unit{cm} = ' + col(evd('n/100')) + '~\\unit{m}$$'],
    conditions=['mod(n,10) != 0'])

M_EN_CM = variation(
    complete(evd('a+D/100') + '~\\unit{m}', 'cm'), [ev('100*a+D')],
    [var('a', '1..9'), var('D', '1..99')],
    ['$1~\\unit{m} = 100~\\unit{cm}$ ; le chiffre des dixièmes compte des dizaines de'
     ' centimètres ($0{,}1~\\unit{m} = 10~\\unit{cm}$), celui des centièmes des centimètres'
     ' ($0{,}01~\\unit{m} = 1~\\unit{cm}$).',
     '$' + evd('a+D/100') + '~\\unit{m} = {{a}}~\\unit{m} + ' + evd('D/100') + '~\\unit{m} = '
     + ev('100*a') + '~\\unit{cm} + {{D}}~\\unit{cm}$',
     '$$' + evd('a+D/100') + '~\\unit{m} = ' + col(ev('100*a+D')) + '~\\unit{cm}$$'])

KM_EN_M = variation(
    complete(evd('a+D/100') + '~\\unit{km}', 'm'), [ev('1000*a+10*D')],
    [var('a', '1..20'), var('D', '1..99')],
    ['$1~\\unit{km} = ' + MILLE + '~\\unit{m}$, donc $0{,}1~\\unit{km} = 100~\\unit{m}$ et'
     ' $0{,}01~\\unit{km} = 10~\\unit{m}$.',
     '$' + evd('a+D/100') + '~\\unit{km} = {{a}}~\\unit{km} + ' + evd('D/100')
     + '~\\unit{km} = ' + ev('1000*a') + '~\\unit{m} + ' + ev('10*D') + '~\\unit{m}$',
     '$$' + evd('a+D/100') + '~\\unit{km} = ' + col(ev('1000*a+10*D')) + '~\\unit{m}$$'])

# Une unité plus petite vers la suivante (y = x + 1) : 7 cm = 0,7 dm ; 25 mm = 2,5 cm
VERS_LA_SUIVANTE = variation(
    complete('{{n}}~\\unit{' + UY + '}', UX), [decimal(evd('n/10'))],
    [var('x', '1..6'), var('y', 'eval:x+1'), var('n', '1..99')],
    ['$10~\\unit{' + UY + '} = 1~\\unit{' + UX + '}$, donc $1~\\unit{' + UY
     + '} = \\dfrac{1}{10}~\\unit{' + UX + '} = 0{,}1~\\unit{' + UX + '}$.',
     '${{n}}~\\unit{' + UY + '}$, c\'est ${{n}}$ {{if:n==1|dixième|dixièmes}} de ' + selon('x', NOMS) + '.',
     '$${{n}}~\\unit{' + UY + '} = ' + col(evd('n/10')) + '~\\unit{' + UX + '}$$'],
    conditions=['mod(n,10) != 0'])

# Fractions simples d'une unité (BO : 1/2 km = 500 m ; 3/4 m = 75 cm) : n/d avec (n, d) parmi
# (1, 2), (1, 4), (3, 4), (1, 10). La réponse est calculée (n × base / d) : jamais de `{{if:…}}`
# dans une réponse attendue (la liste blanche des réponses d'élèves la refuse)
FRACTION_VARS = [var('n', '1|3'), var('d', '2|4|10')]
FRACTION_CONDITIONS = ['(n-1)*(d-4) == 0']


def fraction(grande, petite, base, base_tex):
    return variation(
        'Complète.\n\n$\\dfrac{{{n}}}{{{d}}}~\\unit{' + grande + '} = ?~\\text{' + petite + '}$',
        [ev('n*' + base + '/d')], FRACTION_VARS,
        ['$1~\\unit{' + grande + '} = ' + base_tex + '~\\unit{' + petite + '}$.',
         '$\\dfrac{1}{{{d}}}~\\unit{' + grande + '}$, c\'est $' + base_tex + '~\\unit{' + petite
         + '}$ partagés en {{d}} parts égales : $' + ev(base + '/d') + '~\\unit{' + petite
         + '}${{if:n==3|, et on en prend 3|}}.',
         '$$\\dfrac{{{n}}}{{{d}}}~\\unit{' + grande + '} = ' + col(ev('n*' + base + '/d'))
         + '~\\unit{' + petite + '}$$'],
        conditions=FRACTION_CONDITIONS)


FRACTION_KM = fraction('km', 'm', '1000', MILLE)
FRACTION_M = fraction('m', 'cm', '100', '100')

MODELES['03-longueurs-decimaux-et-fractions'] = modele(
    'Longueurs : écritures décimales et fractions',
    '215 cm = 2,15 m ; 2,15 m = 215 cm ; 3,75 km = 3 750 m ; 7 cm = 0,7 dm ; 1/2 km = 500 m ;'
    ' 3/4 m = 75 cm', 'Unités', 15,
    [CM_EN_M, M_EN_CM, KM_EN_M, VERS_LA_SUIVANTE, FRACTION_KM, FRACTION_M],
    [spec('BO : 215 cm = 2,15 m', 0, {'n': 215, 'm': 2, 'c': 15}, '2,15', 'correct'),
     spec('Erreur : 215 cm = 21,5 m (÷ 10)', 0, {'n': 215, 'm': 2, 'c': 15}, '21,5', 'incorrect'),
     spec('Erreur : 215 cm = 21 500 m (× 100)', 0, {'n': 215, 'm': 2, 'c': 15}, '21 500', 'incorrect'),
     spec('Forme : 215/100', 0, {'n': 215, 'm': 2, 'c': 15}, '\\frac{215}{100}', 'bad_form', ['form']),
     spec('305 cm = 3,05 m', 0, {'n': 305, 'm': 3, 'c': 5}, '3,05', 'correct'),
     spec('Erreur : 305 cm = 3,5 m', 0, {'n': 305, 'm': 3, 'c': 5}, '3,5', 'incorrect'),
     spec('2,15 m = 215 cm', 1, {'a': 2, 'D': 15}, '215', 'correct'),
     spec('Erreur : 2,15 m = 0,0215 cm (sens inversé)', 1, {'a': 2, 'D': 15}, '0,0215',
          'incorrect'),
     spec('2,5 m = 250 cm', 1, {'a': 2, 'D': 50}, '250', 'correct'),
     spec('Erreur : 2,5 m = 205 cm', 1, {'a': 2, 'D': 50}, '205', 'incorrect'),
     spec('3,75 km = 3 750 m', 2, {'a': 3, 'D': 75}, '3 750', 'correct'),
     spec('3,7 km = 3 700 m', 2, {'a': 3, 'D': 70}, '3 700', 'correct'),
     spec('Erreur : 3,7 km = 3 007 m', 2, {'a': 3, 'D': 70}, '3 007', 'incorrect'),
     spec('Erreur : 3,7 km = 370 m', 2, {'a': 3, 'D': 70}, '370', 'incorrect'),
     spec('7 cm = 0,7 dm', 3, {'x': 5, 'y': 6, 'n': 7}, '0,7', 'correct'),
     spec('Erreur : 7 cm = 70 dm', 3, {'x': 5, 'y': 6, 'n': 7}, '70', 'incorrect'),
     spec('25 mm = 2,5 cm', 3, {'x': 6, 'y': 7, 'n': 25}, '2,5', 'correct'),
     spec('Erreur : 25 mm = 0,25 cm', 3, {'x': 6, 'y': 7, 'n': 25}, '0,25', 'incorrect'),
     spec('BO : 1/2 km = 500 m', 4, {'n': 1, 'd': 2}, '500', 'correct'),
     spec('Erreur : 1/2 km = 0,5 m', 4, {'n': 1, 'd': 2}, '0,5', 'incorrect'),
     spec('3/4 km = 750 m', 4, {'n': 3, 'd': 4}, '750', 'correct'),
     spec('BO : 3/4 m = 75 cm', 5, {'n': 3, 'd': 4}, '75', 'correct'),
     spec('Erreur : 3/4 m = 34 cm', 5, {'n': 3, 'd': 4}, '34', 'incorrect'),
     spec('Erreur : 3/4 m = 25 cm (un quart seulement)', 5, {'n': 3, 'd': 4}, '25',
          'incorrect'),
     spec('1/10 m = 10 cm', 5, {'n': 1, 'd': 10}, '10', 'correct')],
    delay=90)

# =============== 4. CM1-069 : choisir l'unité ===============
# Trois objets par unité, dans l'ordre mm, cm, dm, m, km : r = floor((k-1)/3)

OBJETS = ['Une graine de riz mesure $6$', 'L\'épaisseur d\'un cahier mesure $5$',
          'Une coccinelle mesure $7$',
          'Un téléphone mesure $15$', 'Une règle d\'écolier mesure $20$',
          'Le pied d\'un adulte mesure $26$',
          'Une baguette de pain mesure $6$', 'La hauteur d\'une chaise mesure $9$',
          'La largeur d\'un écran d\'ordinateur mesure $5$',
          'Une girafe mesure $5$', 'Un terrain de basket mesure $28$',
          'Un immeuble de trois étages mesure $12$',
          'Un marathon fait $42$', 'La route de Paris à Lyon fait $465$',
          'Le trajet en voiture d\'une ville à la ville voisine fait $20$']
PLURIEL = ('{{if:r==0|millimètres|{{if:r==1|centimètres|{{if:r==2|décimètres'
           '|{{if:r==3|mètres|kilomètres}}}}}}}}')
SYMBOLE_R = '{{if:r==0|mm|{{if:r==1|cm|{{if:r==2|dm|{{if:r==3|m|km}}}}}}}}'

CHOISIR = variation(
    selon('k', OBJETS) + ' …\n\nQuelle unité convient ?'
    + choix(['mm', 'cm', 'dm', 'm', 'km'], melanger=False), ['{{r}}'],
    [var('k', '1..15'), var('r', 'eval:floor((k-1)/3)')],
    ['Repères : $1~\\unit{mm}$, l\'épaisseur d\'une carte ; $1~\\unit{cm}$, la largeur d\'un'
     ' doigt ; $1~\\unit{dm}$, la largeur d\'une main ; $1~\\unit{m}$, un grand pas ;'
     ' $1~\\unit{km}$, un quart d\'heure de marche.',
     selon('k', OBJETS) + ' ' + PLURIEL + ' (**' + SYMBOLE_R + '**).'])

MODELES['04-choisir-l-unite-de-longueur'] = modele(
    'Quelle unité pour mesurer une longueur ?',
    'Choisir parmi mm, cm, dm, m et km : une graine de riz de 6 mm, un téléphone de 15 cm, une'
    ' chaise de 9 dm, une girafe de 5 m, un marathon de 42 km', 'Unités', 13, [CHOISIR],
    [spec('graine de riz : mm', 0, {'k': 1, 'r': 0}, '0', 'correct'),
     spec('Erreur : graine de 6 cm', 0, {'k': 1, 'r': 0}, '1', 'incorrect'),
     spec('téléphone : cm', 0, {'k': 4, 'r': 1}, '1', 'correct'),
     spec('Erreur : téléphone de 15 dm', 0, {'k': 4, 'r': 1}, '2', 'incorrect'),
     spec('chaise : dm', 0, {'k': 8, 'r': 2}, '2', 'correct'),
     spec('Erreur : chaise de 9 m', 0, {'k': 8, 'r': 2}, '3', 'incorrect'),
     spec('girafe : m', 0, {'k': 10, 'r': 3}, '3', 'correct'),
     spec('marathon : km', 0, {'k': 13, 'r': 4}, '4', 'correct'),
     spec('Erreur : marathon de 42 m', 0, {'k': 13, 'r': 4}, '3', 'incorrect')],
    delay=45)

# =============== 5. CM1-070 : comparer des longueurs ===============

COMPARER = 'Compare ces deux longueurs.\n\n$$'

M_DEC_ET_CM = variation(
    COMPARER + evd('a+t/10') + '~\\unit{m} \\quad \\ldots \\quad {{c}}~\\unit{cm}$$' + SIGNES,
    ['{{r}}'],
    [var('a', '1..9'), var('t', '1..9'), var('k', '0..8'), var('c', 'eval:100*a+10*t+10*(k-4)'),
     var('r', 'eval:sign(100*a+10*t-c)+1')],
    ['On écrit les deux longueurs dans la même unité : $' + evd('a+t/10') + '~\\unit{m} = '
     + ev('100*a+10*t') + '~\\unit{cm}$.',
     '$$' + ev('100*a+10*t') + '~\\unit{cm} ' + SIGNE + ' {{c}}~\\unit{cm}$$',
     '$$' + evd('a+t/10') + '~\\unit{m} ' + col(SIGNE) + ' {{c}}~\\unit{cm}$$'])

KM_DEC_ET_M = variation(
    COMPARER + evd('a+t/10') + '~\\unit{km} \\quad \\ldots \\quad {{c}}~\\unit{m}$$' + SIGNES,
    ['{{r}}'],
    [var('a', '1..9'), var('t', '1..9'), var('k', '0..8'),
     var('c', 'eval:1000*a+100*t+50*(k-4)'), var('r', 'eval:sign(1000*a+100*t-c)+1')],
    ['On écrit les deux longueurs dans la même unité : $' + evd('a+t/10') + '~\\unit{km} = '
     + ev('1000*a+100*t') + '~\\unit{m}$.',
     '$$' + ev('1000*a+100*t') + '~\\unit{m} ' + SIGNE + ' {{c}}~\\unit{m}$$',
     '$$' + evd('a+t/10') + '~\\unit{km} ' + col(SIGNE) + ' {{c}}~\\unit{m}$$'])

# Quatre longueurs dans quatre unités, déjà rangées par construction (b de 2 à 9) :
# (100b - 25) cm < (b - 0,1) m < 1000b mm < (10b + 1) dm. Positions affichées du ```ranger
# lues par essai des 24 permutations (b = 2, 3, 9) : la bonne réponse est 3, 0, 1, 2
ETIQ = ['$' + ev('100*b-25') + '~\\unit{cm}$', '$' + evd('b-0.1') + '~\\unit{m}$',
        '$' + ev('1000*b') + '~\\unit{mm}$', '$' + ev('10*b+1') + '~\\unit{dm}$']
ETAPES_RANGER = [
    'On écrit toutes les longueurs en centimètres : $' + evd('b-0.1') + '~\\unit{m} = '
    + ev('100*b-10') + '~\\unit{cm}$, $' + ev('1000*b') + '~\\unit{mm} = ' + ev('100*b')
    + '~\\unit{cm}$ et $' + ev('10*b+1') + '~\\unit{dm} = ' + ev('100*b+10') + '~\\unit{cm}$.']
EN_CM = [ev('100*b-25'), ev('100*b-10'), ev('100*b'), ev('100*b+10')]

RANGER_CROISSANT = variation(
    'Range ces longueurs de la plus petite à la plus grande.\n\n' + etiquettes('<', ETIQ),
    None, [var('b', '2..9')],
    ETAPES_RANGER + ['$$' + ' < '.join(x + '~\\unit{cm}' for x in EN_CM) + '$$'])

RANGER_DECROISSANT = variation(
    'Range ces longueurs de la plus grande à la plus petite.\n\n'
    + etiquettes('>', ETIQ[::-1]), None, [var('b', '2..9')],
    ETAPES_RANGER + ['$$' + ' > '.join(x + '~\\unit{cm}' for x in EN_CM[::-1]) + '$$'])

SOMME = variation(
    complete('{{a}}~\\unit{m} + {{b}}~\\unit{cm}', 'cm'), [ev('100*a+b')],
    [var('a', '1..9'), var('b', '5..95')],
    ['Pour ajouter deux longueurs, on les écrit dans la même unité : ${{a}}~\\unit{m} = '
     + ev('100*a') + '~\\unit{cm}$.',
     '$$' + ev('100*a') + '~\\unit{cm} + {{b}}~\\unit{cm} = ' + col(ev('100*a+b'))
     + '~\\unit{cm}$$'])

DIFFERENCE = variation(
    complete('{{a}}~\\unit{km} - {{b}}~\\unit{m}', 'm'), [ev('1000*a-b')],
    [var('a', '1..5'), var('k', '1..19'), var('b', 'eval:50*k')],
    ['Pour soustraire deux longueurs, on les écrit dans la même unité : ${{a}}~\\unit{km} = '
     + ev('1000*a') + '~\\unit{m}$.',
     '$$' + ev('1000*a') + '~\\unit{m} - {{b}}~\\unit{m} = ' + col(ev('1000*a-b'))
     + '~\\unit{m}$$'])

MODELES['05-comparer-des-longueurs'] = modele(
    'Comparer des longueurs d\'unités différentes',
    '3,5 m et 340 cm ; 2,4 km et 2 450 m ; ranger quatre longueurs en cm, m, mm et dm ;'
    ' 2 m + 45 cm ; 1 km − 350 m', 'Comparaison et mesure', 5,
    [M_DEC_ET_CM, KM_DEC_ET_M, RANGER_CROISSANT, RANGER_DECROISSANT, SOMME, DIFFERENCE],
    [spec('3,5 m > 340 cm', 0, {'a': 3, 't': 5, 'k': 3, 'c': 340, 'r': 2}, '2', 'correct'),
     spec('Erreur : 3,5 m < 340 cm (nombres seuls)', 0,
          {'a': 3, 't': 5, 'k': 3, 'c': 340, 'r': 2}, '0', 'incorrect'),
     spec('3,5 m = 350 cm', 0, {'a': 3, 't': 5, 'k': 4, 'c': 350, 'r': 1}, '1', 'correct'),
     spec('2,4 km < 2 450 m', 1, {'a': 2, 't': 4, 'k': 5, 'c': 2450, 'r': 0}, '0', 'correct'),
     spec('Erreur : 2,4 km > 2 450 m', 1, {'a': 2, 't': 4, 'k': 5, 'c': 2450, 'r': 0}, '2',
          'incorrect'),
     spec('croissant : 275 cm < 2,9 m < 3 000 mm < 31 dm', 2, {'b': 3},
          ['3', '0', '1', '2'], 'correct'),
     spec('Erreur : les nombres seuls (2,9 < 31 < 275 < 3 000)', 2, {'b': 3},
          ['0', '2', '3', '1'], 'incorrect'),
     spec('Erreur : ordre décroissant', 2, {'b': 3}, ['2', '1', '0', '3'], 'incorrect'),
     spec('décroissant : 31 dm > 3 000 mm > 2,9 m > 275 cm', 3, {'b': 3},
          ['3', '0', '1', '2'], 'correct'),
     spec('Erreur : ordre croissant', 3, {'b': 3}, ['2', '1', '0', '3'], 'incorrect'),
     spec('2 m + 45 cm = 245 cm', 4, {'a': 2, 'b': 45}, '245', 'correct'),
     spec('Erreur : 2 m + 45 cm = 47 cm', 4, {'a': 2, 'b': 45}, '47', 'incorrect'),
     spec('2 m + 5 cm = 205 cm', 4, {'a': 2, 'b': 5}, '205', 'correct'),
     spec('Erreur : 2 m + 5 cm = 250 cm', 4, {'a': 2, 'b': 5}, '250', 'incorrect'),
     spec('1 km − 350 m = 650 m', 5, {'a': 1, 'k': 7, 'b': 350}, '650', 'correct'),
     spec('Erreur : 1 km − 350 m = 750 m (retenue)', 5, {'a': 1, 'k': 7, 'b': 350}, '750',
          'incorrect'),
     spec('3 km − 50 m = 2 950 m', 5, {'a': 3, 'k': 1, 'b': 50}, '2 950', 'correct')])

# =============== 6. CM1-071 : longueurs de référence ===============

REF_OBJETS = ['l\'épaisseur d\'une carte de bibliothèque', 'la largeur d\'un doigt',
              'la largeur d\'une main', 'un grand pas d\'adulte', 'la longueur d\'un bus',
              'la longueur d\'un terrain de football', 'un quart d\'heure de marche']
REF_MESURES = ['$1~\\unit{mm}$', '$1~\\unit{cm}$', '$1~\\unit{dm}$', '$1~\\unit{m}$',
               '$10~\\unit{m}$', '$100~\\unit{m}$', '$1~\\unit{km}$']
REPERES = ('Repères : ' + ' ; '.join(o + ', environ ' + m for m, o in zip(REF_MESURES, REF_OBJETS))
           + '.')

# k-ième mesure ; options : la bonne d'abord, puis trois autres (mélangées à l'affichage)
QUOI_MESURE = variation(
    'Qu\'est-ce qui mesure environ ' + selon('k', REF_MESURES) + ' ?'
    + choix([selon('k', REF_OBJETS)]
            + [selon('k', [REF_OBJETS[(i + d) % 7] for i in range(7)]) for d in (2, 4, 5)]),
    ['0'], [var('k', '1..7')],
    [REPERES, '**' + selon('k', [o[0].upper() + o[1:] for o in REF_OBJETS]) + '** mesure environ '
     + selon('k', REF_MESURES) + '.'])

COMBIEN = variation(
    selon('k', [o[0].upper() + o[1:] for o in REF_OBJETS]) + ' mesure environ…'
    + choix(REF_MESURES, melanger=False), ['{{r}}'],
    [var('k', '1..7'), var('r', 'eval:k-1')],
    [REPERES, selon('k', [o[0].upper() + o[1:] for o in REF_OBJETS]) + ' mesure environ **'
     + selon('k', REF_MESURES) + '**.'])

MODELES['06-longueurs-de-reference'] = modele(
    'Des longueurs de référence, du millimètre au kilomètre',
    '1 mm : l\'épaisseur d\'une carte ; 1 cm : la largeur d\'un doigt ; 1 dm : la largeur d\'une'
    ' main ; 1 m : un grand pas ; 10 m : un bus ; 100 m : un terrain de football ; 1 km : un'
    ' quart d\'heure de marche', 'Ordres de grandeur', 6, [QUOI_MESURE, COMBIEN],
    [spec('environ 1 dm : la largeur d\'une main', 0, {'k': 3}, '0', 'correct'),
     spec('Erreur : 1 dm, un terrain de football', 0, {'k': 3}, '2', 'incorrect'),
     spec('environ 1 km : un quart d\'heure de marche', 0, {'k': 7}, '0', 'correct'),
     spec('largeur d\'une main : 1 dm', 1, {'k': 3, 'r': 2}, '2', 'correct'),
     spec('Erreur : largeur d\'une main, 1 m', 1, {'k': 3, 'r': 2}, '3', 'incorrect'),
     spec('épaisseur d\'une carte : 1 mm', 1, {'k': 1, 'r': 0}, '0', 'correct'),
     spec('Erreur : épaisseur d\'une carte, 1 cm', 1, {'k': 1, 'r': 0}, '1', 'incorrect')],
    delay=45)

# =============== 7. CM1-072 : estimer une longueur ===============
# Quatre objets par position de la bonne réponse (r = floor((k-1)/4)), trois unités rangées
# de la plus petite à la plus grande

ESTIMER = [
    # r = 0 : la plus petite des trois unités
    ('Une fourmi', '5', ['mm', 'cm', 'dm']),
    ('L\'épaisseur d\'un cahier', '5', ['mm', 'cm', 'dm']),
    ('L\'épaisseur d\'une pièce de monnaie', '2', ['mm', 'cm', 'dm']),
    ('L\'épaisseur d\'un téléphone', '8', ['mm', 'cm', 'dm']),
    # r = 1 : celle du milieu
    ('Une gomme', '4', ['mm', 'cm', 'm']),
    ('Un crayon neuf', '18', ['mm', 'cm', 'm']),
    ('La longueur d\'une salle de classe', '8', ['dm', 'm', 'km']),
    ('La hauteur de la tour Eiffel', '330', ['cm', 'm', 'km']),
    # r = 2 : la plus grande
    ('Un trajet d\'une heure en voiture', '80', ['cm', 'm', 'km']),
    ('La France, du nord au sud', '1\\,000', ['cm', 'm', 'km']),
    ('Une piscine olympique', '50', ['cm', 'dm', 'm']),
    ('Un lit', '2', ['mm', 'cm', 'm'])]

OBJET_E = selon('k', [e[0] for e in ESTIMER])
NOMBRE_E = selon('k', [e[1] for e in ESTIMER])

ESTIMER_V = variation(
    OBJET_E + ' mesure environ…'
    + choix(['$' + NOMBRE_E + '~\\unit{' + selon('k', [e[2][i] for e in ESTIMER]) + '}$'
             for i in range(3)], melanger=False), ['{{r}}'],
    [var('k', '1..12'), var('r', 'eval:floor((k-1)/4)')],
    ['On compare à des longueurs connues : $1~\\unit{mm}$, l\'épaisseur d\'une carte ;'
     ' $1~\\unit{cm}$, la largeur d\'un doigt ;'
     ' $1~\\unit{m}$, un grand pas ; $1~\\unit{km}$, un quart d\'heure de marche.',
     OBJET_E + ' mesure environ **$' + NOMBRE_E + '~\\unit{'
     + selon('k', [e[2][i] for i, e in zip([j // 4 for j in range(12)], ESTIMER)]) + '}$**.'])

MODELES['07-estimer-une-longueur'] = modele(
    'Estimer une longueur',
    'Choisir l\'ordre de grandeur : une fourmi de 5 mm, une gomme de 4 cm, une salle de classe'
    ' de 8 m, un trajet d\'une heure en voiture de 80 km', 'Ordres de grandeur', 7, [ESTIMER_V],
    [spec('une fourmi : 5 mm', 0, {'k': 1, 'r': 0}, '0', 'correct'),
     spec('Erreur : une fourmi de 5 cm', 0, {'k': 1, 'r': 0}, '1', 'incorrect'),
     spec('une salle de classe : 8 m', 0, {'k': 7, 'r': 1}, '1', 'correct'),
     spec('Erreur : une salle de 8 dm', 0, {'k': 7, 'r': 1}, '0', 'incorrect'),
     spec('un trajet d\'une heure : 80 km', 0, {'k': 9, 'r': 2}, '2', 'correct'),
     spec('Erreur : un trajet de 80 m', 0, {'k': 9, 'r': 2}, '1', 'incorrect')],
    delay=45)

for nom, m in MODELES.items():
    with open(f'{DOSSIER}/{nom}.json', 'w') as fh:
        json.dump(m, fh, ensure_ascii=False, indent='\t')
        fh.write('\n')
print(len(MODELES), 'modèles écrits')
