"""Écrit les 9 modèles du lot 1 du CM1 (calcul mental) dans scripts/questions/cm1-1/.

Phase 0 validée par David le 2026-10-28 (« je suis tes recos », § 7 et § 7 bis du journal
`docs/wip/questions-cm1-progress.md`). Plages : bornes `cycle3.json`, CM1 (tables : termes et
facteurs de 2 à 10, 0 et 1 laissés de côté ; + / − 8, 9, 18, 19, 28, 29, 38, 39 à un nombre de 2
ou 3 chiffres ; × 5 avec n < 200, sans 5 × 20, 5 × 100, 5 × 25 ; × 8 jusqu'à n = 199 ; relations
entre 1/4, 1/2, 1, 1/10, 1/100 ; 1/10 = 0,1 et 1/100 = 0,01 seulement). Un point par modèle ;
case seule, aucun QCM. Corrigés des procédures : une étape par ligne (correctif du CE2, 2026-10-28).

    python3 docs/wip/questions/lot-cm1-1.py scripts/questions/cm1-1
"""
import json
import sys

DOSSIER = sys.argv[1]
CALCULE = 'Calcule.\n\n$${{expression1}}$$'  # faits à connaître : rien d'astucieux
COMPLETE = 'Complète.\n\n$${{expression1}}$$'
ASTUCE = 'Calcule de manière astucieuse.\n\n$${{expression1}}$$'
FORME_DECIMALE = 'Écris la forme décimale de la fraction\n\n$${{expression1}}$$'

# Les huit nombres du point (043, 163), par groupe
PROCHES_DIZAINE = '8|9'
AUTRES = '18|19|28|29|38|39'
TOUS = '8|9|18|19|28|29|38|39'

# Jamais multiple de 10 ; 25 et 125 laissés de côté (faits mémorisés)
DEUX_CHIFFRES_8 = '26..29|31..39|41..49|51..59|61..69|71..79|81..89|91..99'
TROIS_CHIFFRES_8 = ('101..109|111..119|121..124|126..129|131..139|141..149|151..159|161..169'
                    '|171..179|181..189|191..199')
# × 5 : n = 2h (pair, h jamais multiple de 5) ou n = 2h + 1 (impair, sans 25 ni 75) ;
# 3 chiffres sans multiple de 10 ni 125, 175
MOITIES_PAIRES = '6..9|11..14|16..19|21..24|26..29|31..34|36..39|41..44|46..49'
MOITIES_IMPAIRES = '5..11|13..36|38..49'
TROIS_CHIFFRES_5 = ('101..109|111..119|121..124|126..129|131..139|141..149|151..159|161..169'
                    '|171..174|176..179|181..189|191..199')


def spec(desc, vi, variables, answer, status, violations=None):
    s = {'description': desc, 'variationIndex': vi, 'variables': variables,
         'answers': [answer], 'expected': {'status': status}}
    if violations:
        s['expected']['constraintViolations'] = violations
    return s


def modele(title, description, theme, domain, subdomain, level, variations, specs, delay=20):
    # theme / domain / subdomain : anciennes colonnes, remplies pour create-questions ; le
    # rangement (nœud du point) est posé par la migration
    return {'title': title, 'description': description, 'grades': ['CM1'], 'theme': theme,
            'domain': domain, 'subdomain': subdomain, 'level': level, 'delay': delay,
            'status': 'draft', 'variations': variations, 'testSpecs': specs}


def var(nom, expression):
    return {'name': nom, 'expression': expression}


def variation(statement, variables, expression, answer, steps):
    # La case naît de la variable `expression1` (« = ? » ajouté au rendu, sauf s'il y a un `?`)
    return {'statement': statement,
            'variables': variables + [var('expression1', expression)],
            'blanks': [{'expectedAnswer': answer}],
            'correction': {'steps': steps}}


def selon(nom, valeurs, debut=1):
    """`{{if:nom==debut|v0|{{if:nom==debut+1|v1|…}}}}` ; la dernière valeur est le « sinon »."""
    texte = valeurs[-1]
    for k in range(len(valeurs) - 2, -1, -1):
        texte = '{{if:' + nom + '==' + str(debut + k) + '|' + valeurs[k] + '|' + texte + '}}'
    return texte


def col(x, k=0):
    return '\\textcolor{{{color:primary.' + str(k) + '}}}{' + x + '}'


def etape(numero, texte):
    return f'**Étape {numero}.** {texte}'


# --- 1. CM1-035 : tables d'addition ----------------------------------------------------------

TABLES_ADDITION = [variation(
    CALCULE, [var('a', '2..10'), var('b', '2..10')], '{{a}}+{{b}}', '{{eval:a+b}}',
    ['Table de ${{b}}$ : ${{a}}+{{b}}={{solution}}$.'])]

SPECS_TABLES_ADDITION = [
    spec('8 + 7 = 15', 0, {'a': '8', 'b': '7'}, '15', 'correct'),
    spec('borne : 10 + 10 = 20', 0, {'a': '10', 'b': '10'}, '20', 'correct'),
    spec('borne : 2 + 2 = 4', 0, {'a': '2', 'b': '2'}, '4', 'correct'),
    spec('Erreur : 8 + 7 → 14', 0, {'a': '8', 'b': '7'}, '14', 'incorrect'),
    spec('Erreur : 8 × 7 → 56', 0, {'a': '8', 'b': '7'}, '56', 'incorrect'),
]

# --- 2. CM1-161 : terme manquant -------------------------------------------------------------

TERMES = [var('a', '2..10'), var('b', '2..10')]
ETAPE_TERME = ('On cherche le nombre qu\'il faut ajouter à ${{a}}$ pour obtenir ${{eval:a+b}}$ :'
               ' ${{a}}+{{b}}={{eval:a+b}}$.')

TERME_MANQUANT = [
    variation(COMPLETE, TERMES, '{{a}}+?={{eval:a+b}}', '{{b}}',
              [ETAPE_TERME, '$${{a}}+{{solution}}={{eval:a+b}}$$']),
    variation(COMPLETE, TERMES, '?+{{a}}={{eval:a+b}}', '{{b}}',
              [ETAPE_TERME, '$${{solution}}+{{a}}={{eval:a+b}}$$']),
]

SPECS_TERME = [
    spec('8 + ? = 15 : 7', 0, {'a': '8', 'b': '7'}, '7', 'correct'),
    spec('Erreur : 8 + ? = 15 → 23 (on a ajouté)', 0, {'a': '8', 'b': '7'}, '23', 'incorrect'),
    spec('Erreur : 8 + ? = 15 → 15 (recopie)', 0, {'a': '8', 'b': '7'}, '15', 'incorrect'),
    spec('Erreur : 8 + ? = 15 → 6', 0, {'a': '8', 'b': '7'}, '6', 'incorrect'),
    spec('borne : 10 + ? = 20 : 10', 0, {'a': '10', 'b': '10'}, '10', 'correct'),
    spec('? + 6 = 13 : 7', 1, {'a': '6', 'b': '7'}, '7', 'correct'),
    spec('Erreur : ? + 6 = 13 → 6 (recopie)', 1, {'a': '6', 'b': '7'}, '6', 'incorrect'),
]

# --- 3. CM1-036 : tables de multiplication ---------------------------------------------------

TABLES_MULTIPLICATION = [variation(
    CALCULE, [var('a', '2..10'), var('b', '2..10')], '{{a}}*{{b}}', '{{eval:a*b}}',
    ['Table de ${{b}}$ : ${{a}}\\times {{b}}={{solution}}$.'])]

SPECS_TABLES_MULTIPLICATION = [
    spec('7 × 8 = 56', 0, {'a': '7', 'b': '8'}, '56', 'correct'),
    spec('borne : 10 × 10 = 100', 0, {'a': '10', 'b': '10'}, '100', 'correct'),
    spec('borne : 2 × 2 = 4', 0, {'a': '2', 'b': '2'}, '4', 'correct'),
    spec('Erreur : 7 × 8 → 54 (table voisine)', 0, {'a': '7', 'b': '8'}, '54', 'incorrect'),
    spec('Erreur : 7 × 8 → 15 (addition)', 0, {'a': '7', 'b': '8'}, '15', 'incorrect'),
    spec('6 × 9 = 54', 0, {'a': '6', 'b': '9'}, '54', 'correct'),
]

# --- 4. CM1-043 : ajouter 8, 9, 18, 19, 28, 29, 38 ou 39 -------------------------------------
# n = 10d + u (ou 100c + 10d + u) avec u de 2 à 9 : toujours une retenue. m = la dizaine
# au-dessus de b, r = m − b (1 ou 2).

DIZAINE = 'eval:b+10-mod(b,10)'
ECART = 'eval:10-mod(b,10)'


def ajouter(groupe, nombre_vars):
    return variation(
        ASTUCE, [var('b', groupe)] + nombre_vars + [var('m', DIZAINE), var('r', ECART)],
        '{{n}}+{{b}}', '{{eval:n+b}}',
        ['Ajouter ${{b}}$, c\'est ajouter ${{m}}$, puis enlever ${{r}}$.',
         etape(1, '${{n}}+{{m}}=' + col('{{eval:n+m}}') + '$.'),
         etape(2, '${{eval:n+m}}-{{r}}=' + col('{{solution}}', 1) + '$.'),
         'Donc ${{n}}+{{b}}={{solution}}$.'])


DEUX_CHIFFRES_V1 = [var('d', '1..8'), var('u', '2..9'), var('n', 'eval:10*d+u')]
DEUX_CHIFFRES_V2 = [var('d', '1..5'), var('u', '2..9'), var('n', 'eval:10*d+u')]
TROIS_CHIFFRES_PLUS = [var('c', '1..9'), var('d', '0..5'), var('u', '2..9'),
                       var('n', 'eval:100*c+10*d+u')]

SPECS_AJOUTER = [
    spec('57 + 9 = 66', 0, {'b': '9', 'd': '5', 'u': '7'}, '66', 'correct'),
    spec('Erreur : 57 + 9 → 67 (+ 10 sans compenser)', 0, {'b': '9', 'd': '5', 'u': '7'}, '67',
         'incorrect'),
    spec('Erreur : 57 + 9 → 68 (compensation à l\'envers)', 0, {'b': '9', 'd': '5', 'u': '7'},
         '68', 'incorrect'),
    spec('borne : 89 + 8 = 97', 0, {'b': '8', 'd': '8', 'u': '9'}, '97', 'correct'),
    spec('57 + 29 = 86', 1, {'b': '29', 'd': '5', 'u': '7'}, '86', 'correct'),
    spec('Erreur : 57 + 29 → 87 (+ 30 sans compenser)', 1, {'b': '29', 'd': '5', 'u': '7'}, '87',
         'incorrect'),
    spec('Erreur : 57 + 29 → 76 (retenue oubliée)', 1, {'b': '29', 'd': '5', 'u': '7'}, '76',
         'incorrect'),
    spec('46 + 38 = 84', 1, {'b': '38', 'd': '4', 'u': '6'}, '84', 'correct'),
    spec('Erreur : 46 + 38 → 85 (− 1 au lieu de − 2)', 1, {'b': '38', 'd': '4', 'u': '6'}, '85',
         'incorrect'),
    spec('347 + 28 = 375', 2, {'b': '28', 'c': '3', 'd': '4', 'u': '7'}, '375', 'correct'),
    spec('borne : 959 + 39 = 998', 2, {'b': '39', 'c': '9', 'd': '5', 'u': '9'}, '998',
         'correct'),
    spec('Erreur : 347 + 28 → 365 (retenue oubliée)', 2, {'b': '28', 'c': '3', 'd': '4', 'u': '7'},
         '365', 'incorrect'),
]

# --- 5. CM1-163 : soustraire 8, 9, 18, 19, 28, 29, 38 ou 39 ----------------------------------
# n = 10d + u (ou 100c + 10d + u) avec u de 0 à 7 : toujours un emprunt.


def soustraire(groupe, nombre_vars):
    return variation(
        ASTUCE, [var('b', groupe)] + nombre_vars + [var('m', DIZAINE), var('r', ECART)],
        '{{n}}-{{b}}', '{{eval:n-b}}',
        ['Soustraire ${{b}}$, c\'est soustraire ${{m}}$, puis rajouter ${{r}}$.',
         etape(1, '${{n}}-{{m}}=' + col('{{eval:n-m}}') + '$.'),
         etape(2, '${{eval:n-m}}+{{r}}=' + col('{{solution}}', 1) + '$.'),
         'Donc ${{n}}-{{b}}={{solution}}$.'])


MOINS_V1 = [var('d', '2..9'), var('u', '0..7'), var('n', 'eval:10*d+u')]
MOINS_V2 = [var('d', '5..9'), var('u', '0..7'), var('n', 'eval:10*d+u')]
MOINS_V3 = [var('c', '1..9'), var('d', '0..9'), var('u', '0..7'), var('n', 'eval:100*c+10*d+u')]

SPECS_SOUSTRAIRE = [
    spec('53 − 9 = 44', 0, {'b': '9', 'd': '5', 'u': '3'}, '44', 'correct'),
    spec('Erreur : 53 − 9 → 43 (− 10 sans compenser)', 0, {'b': '9', 'd': '5', 'u': '3'}, '43',
         'incorrect'),
    spec('Erreur : 53 − 9 → 42 (compensation à l\'envers)', 0, {'b': '9', 'd': '5', 'u': '3'},
         '42', 'incorrect'),
    spec('borne : 20 − 8 = 12', 0, {'b': '8', 'd': '2', 'u': '0'}, '12', 'correct'),
    spec('57 − 29 = 28', 1, {'b': '29', 'd': '5', 'u': '7'}, '28', 'correct'),
    spec('Erreur : 57 − 29 → 27 (− 30 sans compenser)', 1, {'b': '29', 'd': '5', 'u': '7'}, '27',
         'incorrect'),
    spec('Erreur : 57 − 29 → 32 (écart des chiffres : 9 − 7)', 1, {'b': '29', 'd': '5', 'u': '7'},
         '32', 'incorrect'),
    spec('borne : 50 − 39 = 11', 1, {'b': '39', 'd': '5', 'u': '0'}, '11', 'correct'),
    spec('Erreur : 64 − 38 → 25 (− 1 au lieu de + 2)', 1, {'b': '38', 'd': '6', 'u': '4'}, '25',
         'incorrect'),
    spec('305 − 18 = 287', 2, {'b': '18', 'c': '3', 'd': '0', 'u': '5'}, '287', 'correct'),
    spec('borne : 100 − 39 = 61', 2, {'b': '39', 'c': '1', 'd': '0', 'u': '0'}, '61', 'correct'),
    spec('Erreur : 305 − 18 → 297 (emprunt oublié)', 2, {'b': '18', 'c': '3', 'd': '0', 'u': '5'},
         '297', 'incorrect'),
]

# --- 6. CM1-164 : multiplier par 8 -----------------------------------------------------------


def double(numero, nombre, resultat, couleur):
    return etape(numero, f'Le double de ${nombre}$ : $2\\times {nombre}={col(resultat, couleur)}$.')


def fois_8(nombres):
    return variation(
        ASTUCE, [var('n', nombres)], '8*{{n}}', '{{eval:8*n}}',
        ['Multiplier par $8$, c\'est prendre le double, puis le double, puis encore le double.',
         double(1, '{{n}}', '{{eval:2*n}}', 0),
         double(2, '{{eval:2*n}}', '{{eval:4*n}}', 1),
         double(3, '{{eval:4*n}}', '{{solution}}', 2),
         'Donc $8\\times {{n}}={{solution}}$.'])


SPECS_8 = [
    spec('8 × 45 = 360', 0, {'n': '45'}, '360', 'correct'),
    spec('Erreur : double du double seulement (180)', 0, {'n': '45'}, '180', 'incorrect'),
    spec('Erreur : 8 × 4 et 8 × 5 accolés (3 240)', 0, {'n': '45'}, '3240', 'incorrect'),
    spec('borne : 8 × 26 = 208', 0, {'n': '26'}, '208', 'correct'),
    spec('borne : 8 × 99 = 792', 0, {'n': '99'}, '792', 'correct'),
    spec('8 × 123 = 984', 1, {'n': '123'}, '984', 'correct'),
    spec('Erreur : un double oublié (492)', 1, {'n': '123'}, '492', 'incorrect'),
    spec('borne : 8 × 199 = 1 592', 1, {'n': '199'}, '1592', 'correct'),
]

# --- 7. CM1-046 : multiplier par 5 -----------------------------------------------------------


def fois_5(nombre_vars):
    return variation(
        ASTUCE, nombre_vars, '5*{{n}}', '{{eval:5*n}}',
        ['Multiplier par $5$, c\'est multiplier par $10$, puis prendre la moitié.',
         etape(1, '$10\\times {{n}}=' + col('{{eval:10*n}}') + '$.'),
         etape(2, 'La moitié de ${{eval:10*n}}$ : $' + col('{{solution}}', 1) + '$.'),
         'Donc $5\\times {{n}}={{solution}}$.'])


PAIRS = [var('h', MOITIES_PAIRES), var('n', 'eval:2*h')]
IMPAIRS = [var('h', MOITIES_IMPAIRES), var('n', 'eval:2*h+1')]
GRANDS_5 = [var('n', TROIS_CHIFFRES_5)]

SPECS_5 = [
    spec('5 × 46 = 230', 0, {'h': '23'}, '230', 'correct'),
    spec('Erreur : × 10 sans la moitié (460)', 0, {'h': '23'}, '460', 'incorrect'),
    spec('Erreur : la moitié sans × 10 (23)', 0, {'h': '23'}, '23', 'incorrect'),
    spec('borne : 5 × 98 = 490', 0, {'h': '49'}, '490', 'correct'),
    spec('5 × 37 = 185', 1, {'h': '18'}, '185', 'correct'),
    spec('Erreur : 5 × 3 et 5 × 7 accolés (1 535)', 1, {'h': '18'}, '1535', 'incorrect'),
    spec('borne : 5 × 11 = 55', 1, {'h': '5'}, '55', 'correct'),
    spec('5 × 148 = 740', 2, {'n': '148'}, '740', 'correct'),
    spec('Erreur : × 10 sans la moitié (1 480)', 2, {'n': '148'}, '1480', 'incorrect'),
    spec('borne : 5 × 199 = 995', 2, {'n': '199'}, '995', 'correct'),
]

# --- 8. CM1-037 : relations entre fractions usuelles -----------------------------------------
# La case est toujours un entier : jamais de fraction à simplifier (David, 2026-10-28).

EGALITES = ['1/2=?/4', '1=?/2', '1=?/4', '1=?/10', '1=?/100', '1/10=?/100']
EGALITES_REPONSES = ['2', '2', '4', '10', '100', '10']
EGALITES_RAISONS = [
    'Un demi, c\'est deux quarts : $\\dfrac{1}{2}=\\dfrac{' + col('2') + '}{4}$.',
    'Une unité, c\'est deux demis : $1=\\dfrac{' + col('2') + '}{2}$.',
    'Une unité, c\'est quatre quarts : $1=\\dfrac{' + col('4') + '}{4}$.',
    'Une unité, c\'est dix dixièmes : $1=\\dfrac{' + col('10') + '}{10}$.',
    'Une unité, c\'est cent centièmes : $1=\\dfrac{' + col('100') + '}{100}$.',
    'Un dixième, c\'est dix centièmes : $\\dfrac{1}{10}=\\dfrac{' + col('10') + '}{100}$.',
]

CALCULS = ['1/2+1/2=?', '1/4+1/4=?/2', '1-1/4=?/4', '1-1/2=?/2', '1/2+1/4=?/4']
CALCULS_REPONSES = ['1', '1', '3', '1', '3']
CALCULS_RAISONS = [
    'Deux demis font une unité : $\\dfrac{1}{2}+\\dfrac{1}{2}=' + col('1') + '$.',
    'Deux quarts font un demi : $\\dfrac{1}{4}+\\dfrac{1}{4}=\\dfrac{' + col('1') + '}{2}$.',
    'Une unité, c\'est quatre quarts ; on en enlève un, il en reste trois :'
    ' $1-\\dfrac{1}{4}=\\dfrac{' + col('3') + '}{4}$.',
    'Une unité, c\'est deux demis ; on en enlève un, il en reste un :'
    ' $1-\\dfrac{1}{2}=\\dfrac{' + col('1') + '}{2}$.',
    'Un demi, c\'est deux quarts ; deux quarts et un quart font trois quarts :'
    ' $\\dfrac{1}{2}+\\dfrac{1}{4}=\\dfrac{' + col('3') + '}{4}$.',
]

RELATIONS = [
    variation(COMPLETE, [var('k', f'1..{len(EGALITES)}'), var('r', selon('k', EGALITES_REPONSES))],
              selon('k', EGALITES), '{{r}}', [selon('k', EGALITES_RAISONS)]),
    variation(COMPLETE, [var('k', f'1..{len(CALCULS)}'), var('r', selon('k', CALCULS_REPONSES))],
              selon('k', CALCULS), '{{r}}', [selon('k', CALCULS_RAISONS)]),
]

SPECS_RELATIONS = [
    spec('1/2 = ?/4 : 2', 0, {'k': '1'}, '2', 'correct'),
    spec('Erreur : 1/2 = ?/4 → 1 (numérateur recopié)', 0, {'k': '1'}, '1', 'incorrect'),
    spec('1 = ?/4 : 4', 0, {'k': '3'}, '4', 'correct'),
    spec('Erreur : 1 = ?/4 → 1', 0, {'k': '3'}, '1', 'incorrect'),
    spec('1 = ?/100 : 100', 0, {'k': '5'}, '100', 'correct'),
    spec('1/10 = ?/100 : 10', 0, {'k': '6'}, '10', 'correct'),
    spec('Erreur : 1/10 = ?/100 → 1', 0, {'k': '6'}, '1', 'incorrect'),
    spec('1/2 + 1/2 = 1', 1, {'k': '1'}, '1', 'correct'),
    spec('Erreur : 1/2 + 1/2 → 2 (numérateurs ajoutés)', 1, {'k': '1'}, '2', 'incorrect'),
    spec('1/4 + 1/4 = ?/2 : 1', 1, {'k': '2'}, '1', 'correct'),
    spec('Erreur : 1/4 + 1/4 = ?/2 → 2 (numérateurs ajoutés)', 1, {'k': '2'}, '2', 'incorrect'),
    spec('1 − 1/4 = ?/4 : 3', 1, {'k': '3'}, '3', 'correct'),
    spec('1/2 + 1/4 = ?/4 : 3', 1, {'k': '5'}, '3', 'correct'),
    spec('Erreur : 1/2 + 1/4 = ?/4 → 2 (numérateurs ajoutés)', 1, {'k': '5'}, '2', 'incorrect'),
]

# --- 9. CM1-038 : 1/10 = 0,1 et 1/100 = 0,01 -------------------------------------------------

DIXIEME_CENTIEME = [
    variation(FORME_DECIMALE, [var('k', '1..2')], selon('k', ['1/10', '1/100']),
              '{{eval:{{expression1}};d}}',
              [selon('k', ['Un dixième s\'écrit $' + col('0.1') + '$ : le $1$ est au rang des'
                           ' dixièmes, le premier après la virgule.',
                           'Un centième s\'écrit $' + col('0.01') + '$ : le $1$ est au rang des'
                           ' centièmes, le deuxième après la virgule ; on écrit $0$ aux dixièmes.'])]),
    variation(COMPLETE, [var('k', '1..2'), var('r', selon('k', ['10', '100']))],
              selon('k', ['0.1=1/?', '0.01=1/?']), '{{r}}',
              [selon('k', ['$0.1$, c\'est un dixième : $0.1=\\dfrac{1}{' + col('10') + '}$.',
                           '$0.01$, c\'est un centième : $0.01=\\dfrac{1}{' + col('100') + '}$.'])]),
]

SPECS_DIXIEME = [
    spec('1/10 = 0,1', 0, {'k': '1'}, '0.1', 'correct'),
    spec('1/100 = 0,01', 0, {'k': '2'}, '0.01', 'correct'),
    spec('Erreur : 1/100 → 0,1', 0, {'k': '2'}, '0.1', 'incorrect'),
    spec('Erreur : 1/10 → 0,01', 0, {'k': '1'}, '0.01', 'incorrect'),
    spec('Erreur : 1/100 → 0,100', 0, {'k': '2'}, '0.100', 'incorrect'),
    spec('0,1 = 1/10', 1, {'k': '1'}, '10', 'correct'),
    spec('0,01 = 1/100', 1, {'k': '2'}, '100', 'correct'),
    spec('Erreur : 0,01 = 1/? → 10', 1, {'k': '2'}, '10', 'incorrect'),
]

MODELES = {
    '01-tables-d-addition': modele(
        'Tables d\'addition', 'Toutes les tables mêlées : a + b, a et b de 2 à 10',
        'Entiers', 'Additionner', 'Tables', 11, TABLES_ADDITION, SPECS_TABLES_ADDITION),
    '02-terme-manquant': modele(
        'Trouver le terme manquant', 'Tables d\'addition dans l\'autre sens : 8 + ? = 15',
        'Entiers', 'Additionner', 'A trou', 15, TERME_MANQUANT, SPECS_TERME),
    '03-tables-de-multiplication': modele(
        'Tables de multiplication', 'Toutes les tables mêlées : a × b, a et b de 2 à 10',
        'Entiers', 'Multiplier', 'Tables', 10, TABLES_MULTIPLICATION,
        SPECS_TABLES_MULTIPLICATION),
    '04-ajouter-8-9-18-19': modele(
        'Ajouter $8$, $9$, $18$, $19$, $28$, $29$, $38$ ou $39$',
        'Ajouter la dizaine au-dessus, puis enlever 1 ou 2 : 57 + 9, 57 + 29, 347 + 28',
        'Entiers', 'Additionner', 'Somme astucieuse', 11,
        [ajouter(PROCHES_DIZAINE, DEUX_CHIFFRES_V1), ajouter(AUTRES, DEUX_CHIFFRES_V2),
         ajouter(TOUS, TROIS_CHIFFRES_PLUS)], SPECS_AJOUTER, delay=30),
    '05-soustraire-8-9-18-19': modele(
        'Soustraire $8$, $9$, $18$, $19$, $28$, $29$, $38$ ou $39$',
        'Soustraire la dizaine au-dessus, puis rajouter 1 ou 2 : 53 − 9, 57 − 29, 305 − 18',
        'Entiers', 'Soustraire', 'Différence astucieuse', 4,
        [soustraire(PROCHES_DIZAINE, MOINS_V1), soustraire(AUTRES, MOINS_V2),
         soustraire(TOUS, MOINS_V3)], SPECS_SOUSTRAIRE, delay=30),
    '06-multiplier-par-8': modele(
        'Multiplier par $8$', 'Le double, puis le double, puis encore le double : 8 × 45, puis 8 × 123',
        'Entiers', 'Multiplier', 'Produits astucieux', 4,
        [fois_8(DEUX_CHIFFRES_8), fois_8(TROIS_CHIFFRES_8)], SPECS_8, delay=30),
    '07-multiplier-par-5': modele(
        'Multiplier par $5$', 'Multiplier par 10, puis prendre la moitié : 5 × 46, 5 × 37, 5 × 148',
        'Entiers', 'Multiplier', 'Produits astucieux', 5,
        [fois_5(PAIRS), fois_5(IMPAIRS), fois_5(GRANDS_5)], SPECS_5, delay=30),
    '08-relations-entre-fractions': modele(
        'Relations entre fractions usuelles',
        'Demis, quarts, dixièmes, centièmes et l\'unité : 1/2 = ?/4, 1 − 1/4 = ?/4',
        'Fractions', 'Apprivoiser', 'Egalité de fractions', 5, RELATIONS, SPECS_RELATIONS),
    '09-dixieme-et-centieme': modele(
        'Écrire $\\dfrac{1}{10}$ et $\\dfrac{1}{100}$ en écriture décimale',
        '1/10 = 0,1 et 1/100 = 0,01, dans les deux sens',
        'Fractions', 'Apprivoiser', 'Forme décimale', 14, DIXIEME_CENTIEME, SPECS_DIXIEME),
}

for nom, m in MODELES.items():
    with open(f'{DOSSIER}/{nom}.json', 'w') as f:
        json.dump(m, f, ensure_ascii=False, indent='\t')
        f.write('\n')
print(len(MODELES), 'modèles écrits')
