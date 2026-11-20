"""Écrit les 9 modèles du lot C1 « Puissances et écriture scientifique » de la 2de
dans scripts/questions/2de-nombres-c1/ (chantier `ensembles-2de`).

    python3 docs/wip/questions/lot-2de-nombres-c1.py scripts/questions/2de-nombres-c1

Conception validée par David (journal du chantier) ; points visés : 2-260 (puissances, modèles
01 à 06) et 2-270 (écriture scientifique, puissances de 10, préfixes : modèles 07 à 09). Un point
par modèle ; le nœud et le tag sont posés par la migration de rangement, après le `--publier`.

Décisions et pièges :
- forme jugée en mode exact (contrainte `form` stricte, ADR 0013) : `7^4` attendu → `2401` refusé
  (`bad_form`), `5{,}2\\times10^{-4}` attendu → `52\\times10^{-5}` refusé. C'est ce mode qui refuse
  « 12 × 10³ » dans l'écriture scientifique (07, variation 0), sans `requiredForm` ni motif ;
- `5^{-2}` : `acceptDecimal` (0,04 vaut 1/25) ;
- base négative toujours entre parenthèses : `(-{{a}})^{n}` ; `-{{a}}^{n}` est voulu (02, 06) ;
- décimaux tirés en entiers puis affichés par `{{eval:…;d}}` ;
- réponses ≤ 999 quand c'est possible ; sinon espaces dans les specs (`31\\,000`) ;
- choix : la bonne réponse est l'indice d'origine, le corrigé la nomme ;
- variables `e` et `i` interdites.
"""
import json
import os
import sys

DOSSIER = sys.argv[1]


# --- Outils ----------------------------------------------------------------------------------


def spec(desc, vi, variables, answers, status, violations=None):
    s = {'description': desc, 'variationIndex': vi,
         'variables': {k: str(v) for k, v in variables.items()},
         'answers': answers if isinstance(answers, list) else [answers],
         'expected': {'status': status}}
    if violations:
        s['expected']['constraintViolations'] = violations
    return s


def modele(nom, title, description, level, delay, variations, specs):
    return nom, {'title': title, 'description': description, 'grades': ['2'], 'level': level,
                 'delay': delay, 'status': 'draft', 'variations': variations,
                 'testSpecs': specs}


def var(nom, expression):
    return {'name': nom, 'expression': expression}


def variation(statement, variables, answers, steps, conditions=None, blank_extra=None):
    # Une variable `eval:…;d` garde le point décimal (« 0.09 ») : elle est remplacée partout par
    # `{{eval:…;d}}` écrit en place, qui rend la virgule.
    answers = answers if isinstance(answers, list) else [answers]
    gardees = []
    for x in variables:
        expr = x['expression']
        if expr.startswith('eval:') and expr.endswith(';d'):
            macro = '{{' + expr + '}}'
            cle = '{{' + x['name'] + '}}'
            statement = statement.replace(cle, macro)
            answers = [a.replace(cle, macro) for a in answers]
            steps = [s.replace(cle, macro) for s in steps]
        else:
            gardees.append(x)
    variables = gardees
    v = {'statement': statement, 'variables': variables}
    if conditions:
        v['conditions'] = conditions
    blanks = []
    for a in (answers if isinstance(answers, list) else [answers]):
        b = {'expectedAnswer': a}
        if blank_extra:
            b.update(blank_extra)
        blanks.append(b)
    v['blanks'] = blanks
    v['correction'] = {'steps': steps}
    return v


def selon(nom, valeurs, debut=0):
    """`{{if:nom==debut|v0|{{if:nom==debut+1|v1|…}}}}` ; la dernière valeur est le « sinon »."""
    texte = valeurs[-1]
    for k in range(len(valeurs) - 2, -1, -1):
        texte = '{{if:' + nom + '==' + str(debut + k) + '|' + valeurs[k] + '|' + texte + '}}'
    return texte


def indic(nom, valeurs, debut=0):
    """Valeur numérique choisie par `nom` sans `{{if:}}` (indicatrices `1-min(abs(…),1)`)."""
    termes = []
    for k, v in enumerate(valeurs):
        if v == 0:
            continue
        termes.append('(' + str(v) + ')*(1-min(abs((' + nom + ')-(' + str(debut + k) + ')),1))')
    return 'eval:' + '+'.join(termes)


def col(x, k=0):
    return '\\textcolor{{{color:primary.' + str(k) + '}}}{' + x + '}'


def produit(facteur, nom, debut, fin):
    """`facteur × facteur × …` répété `nom` fois (nom entre debut et fin)."""
    return selon(nom, ['\\times '.join([facteur] * n) for n in range(debut, fin + 1)], debut)


def parite(nom):
    """1 si `nom` est impair, 0 sinon."""
    return '(' + nom + ')-2*floor((' + nom + ')/2)'


CHOIX_SIGNE = '```choix\nmelanger: non\n- positif\n- négatif\n```'

MODELES = []

# --- 01. 2-260 : valeur d'une puissance ----------------------------------------------------

DEF_PUISSANCE = ('**Définition** : pour $n\\geqslant 1$, $a^n=a\\times a\\times\\cdots\\times a$'
                 ' ($n$ facteurs) ; $a^0=1$ et $a^{-n}=\\dfrac{1}{a^n}$ (pour $a\\neq0$).')

VAL_NEG = variation(
    'Calcule.\n\n$$(-{{a}})^{ {{n}} }=?$$',
    [var('a', '2..5'), var('n', '2..5'), var('p', 'eval:(-(a))^(n)')],
    '{{p}}',
    [DEF_PUISSANCE,
     '$$(-{{a}})^{ {{n}} }=' + produit('(-{{a}})', 'n', 2, 5) + '$$',
     'Il y a ${{n}}$ facteurs négatifs, un nombre {{if:n==3|impair|{{if:n==5|impair|pair}}}} :'
     ' le résultat est {{if:p<0|négatif|positif}}.',
     '$$(-{{a}})^{ {{n}} }=' + col('{{p}}') + '$$'],
    ['(a)^(n) <= 700'])

VAL_EXP_NEG = variation(
    'Calcule. Donne le résultat sous la forme d\'une fraction.\n\n$${{a}}^{-{{n}} }=?$$',
    [var('a', '2|3|4|5|10'), var('n', '2..3'), var('q', 'eval:(a)^(n)')],
    '\\frac{1}{ {{q}} }',
    [DEF_PUISSANCE + ' Un exposant négatif ne rend pas le nombre négatif.',
     '$${{a}}^{-{{n}} }=\\dfrac{1}{ {{a}}^{ {{n}} } }=\\dfrac{1}{' + produit('{{a}}', 'n', 2, 3)
     + '}=' + col('\\dfrac{1}{ {{q}} }') + '$$'],
    ['(a)^(n) <= 1000'], {'acceptDecimal': True})

VAL_DECIMAL = variation(
    'Calcule.\n\n$$0{,}{{d}}^{ {{n}} }=?$$',
    [var('d', '1..9'), var('n', '2..3'), var('r', 'eval:(d)^(n)/10^(n);d')],
    '{{r}}',
    [DEF_PUISSANCE,
     '$$0{,}{{d}}^{ {{n}} }=' + produit('0{,}{{d}}', 'n', 2, 3) + '=' + col('{{r}}') + '$$',
     '${{d}}^{ {{n}} }={{eval:(d)^(n)}}$, puis on place la virgule : il y a ${{eval:(n)}}$ chiffres'
     ' après la virgule dans les facteurs, donc ${{eval:(n)}}$ dans le résultat.',
     'Attention : $0{,}{{d}}^{ {{n}} }$ n\'est pas $0{,}{{d}}\\times{{n}}$.'])

VAL_ZERO = variation(
    'Calcule.\n\n$${{if:t==0|{{a}}|(-{{a}})}}^{0}=?$$',
    [var('t', '0|1'), var('a', '2..15')],
    '1',
    [DEF_PUISSANCE,
     'Tout nombre non nul élevé à la puissance $0$ vaut $1$ :'
     ' ${{if:t==0|{{a}}|(-{{a}})}}^{0}=' + col('1') + '$.',
     'Pourquoi ? ${{a}}^{1}\\div {{a}}^{1}={{a}}^{1-1}={{a}}^{0}$, et un nombre divisé par'
     ' lui-même vaut $1$.'])

MODELES.append(modele(
    '01-valeur-d-une-puissance', 'Valeur d\'une puissance',
    'Calculer (−a)ⁿ, a⁻ⁿ, 0,dⁿ et a⁰ (pièges : (−2)³ = 8, 5⁻² = −25, 0,3² = 0,6, 7⁰ = 0)',
    4, 45,
    [VAL_NEG, VAL_EXP_NEG, VAL_DECIMAL, VAL_ZERO],
    [spec('(−2)³ = −8', 0, {'a': 2, 'n': 3}, '-8', 'correct'),
     spec('Erreur : signe oublié, (−2)³ = 8', 0, {'a': 2, 'n': 3}, '8', 'incorrect'),
     spec('Erreur : (−2) × 3 = −6', 0, {'a': 2, 'n': 3}, '-6', 'incorrect'),
     spec('(−3)⁴ = 81', 0, {'a': 3, 'n': 4}, '81', 'correct'),
     spec('Erreur : (−3)⁴ = −81', 0, {'a': 3, 'n': 4}, '-81', 'incorrect'),
     spec('5⁻² = 1/25', 1, {'a': 5, 'n': 2}, '\\frac{1}{25}', 'correct'),
     spec('5⁻² = 0,04 (décimal exact)', 1, {'a': 5, 'n': 2}, '0,04', 'correct'),
     spec('Erreur : 5⁻² = −25', 1, {'a': 5, 'n': 2}, '-25', 'incorrect'),
     spec('Erreur : 5⁻² = −10', 1, {'a': 5, 'n': 2}, '-10', 'incorrect'),
     spec('Erreur : 5⁻² = 1/10', 1, {'a': 5, 'n': 2}, '\\frac{1}{10}', 'incorrect'),
     spec('0,3² = 0,09', 2, {'d': 3, 'n': 2}, '0,09', 'correct'),
     spec('Erreur : 0,3² = 0,9', 2, {'d': 3, 'n': 2}, '0,9', 'incorrect'),
     spec('Erreur : 0,3² = 0,6', 2, {'d': 3, 'n': 2}, '0,6', 'incorrect'),
     spec('0,2³ = 0,008', 2, {'d': 2, 'n': 3}, '0,008', 'correct'),
     spec('7⁰ = 1', 3, {'t': 0, 'a': 7}, '1', 'correct'),
     spec('Erreur : 7⁰ = 0', 3, {'t': 0, 'a': 7}, '0', 'incorrect'),
     spec('Erreur : 7⁰ = 7', 3, {'t': 0, 'a': 7}, '7', 'incorrect'),
     spec('(−4)⁰ = 1', 3, {'t': 1, 'a': 4}, '1', 'correct'),
     spec('Erreur : (−4)⁰ = −1', 3, {'t': 1, 'a': 4}, '-1', 'incorrect')]))

# --- 02. 2-260 : signe d'une puissance -----------------------------------------------------

REGLE_SIGNE = ('**Signe d\'une puissance d\'un nombre négatif** : avec un exposant **pair**, le'
               ' résultat est positif ; avec un exposant **impair**, il est négatif.')
PAIR = '{{if:o==1|impair|pair}}'


def signe(statement, variables, rep, steps):
    return variation('Sans calculer, dis si ce nombre est positif ou négatif.\n\n$$' + statement
                     + '$$\n\n' + CHOIX_SIGNE, variables, '{{' + rep + '}}', steps)


SIGNE_PAR = signe(
    '(-{{a}})^{ {{n}} }',
    [var('a', '2..9'), var('n', '4..11'), var('o', 'eval:' + parite('n')), var('r', 'eval:o')],
    'r',
    [REGLE_SIGNE,
     'Les parenthèses contiennent le signe : on multiplie ${{n}}$ fois le nombre négatif'
     ' $-{{a}}$.',
     'L\'exposant ${{n}}$ est ' + PAIR + ' : $(-{{a}})^{ {{n}} }$ est '
     + '**{{if:o==1|négatif|positif}}**' + '.'])

SIGNE_SANS_PAR = signe(
    '-{{a}}^{ {{n}} }',
    [var('a', '2..9'), var('n', '2..9')],
    'r',
    ['**Attention aux parenthèses** : dans $-{{a}}^{ {{n}} }$, l\'exposant ne porte que sur'
     ' ${{a}}$ ; le signe « $-$ » est devant le résultat : $-{{a}}^{ {{n}} }=-\\left({{a}}^{ {{n}} }\\right)$.',
     '${{a}}^{ {{n}} }$ est positif (produit de nombres positifs), donc $-{{a}}^{ {{n}} }$ est '
     + '**négatif**' + ', que l\'exposant soit pair ou impair.'])
SIGNE_SANS_PAR['variables'].append(var('r', '1'))

SIGNE_MOINS_PAR = signe(
    '-(-{{a}})^{ {{n}} }',
    [var('a', '2..9'), var('n', '2..9'), var('o', 'eval:' + parite('n')), var('r', 'eval:1-(o)')],
    'r',
    [REGLE_SIGNE,
     'L\'exposant ${{n}}$ est ' + PAIR + ' : $(-{{a}})^{ {{n}} }$ est'
     ' {{if:o==1|négatif|positif}}.',
     'Le signe « $-$ » devant change le signe : $-(-{{a}})^{ {{n}} }$ est '
     + '**{{if:o==1|positif|négatif}}**' + '.'])

SIGNE_EXP_NEG = signe(
    '(-{{a}})^{-{{n}} }',
    [var('a', '2..9'), var('n', '2..7'), var('o', 'eval:' + parite('n')), var('r', 'eval:o')],
    'r',
    [REGLE_SIGNE,
     '$(-{{a}})^{-{{n}} }=\\dfrac{1}{(-{{a}})^{ {{n}} } }$ : l\'exposant négatif donne un inverse,'
     ' qui a le même signe que $(-{{a}})^{ {{n}} }$.',
     'L\'exposant ${{n}}$ est ' + PAIR + ' : $(-{{a}})^{-{{n}} }$ est '
     + '**{{if:o==1|négatif|positif}}**' + '.'])

MODELES.append(modele(
    '02-signe-d-une-puissance', 'Signe d\'une puissance',
    'Dire sans calculer si (−a)ⁿ, −aⁿ, −(−a)ⁿ ou (−a)⁻ⁿ est positif ou négatif (pièges : −3⁴'
    ' positif, exposant négatif rend négatif)',
    5, 30,
    [SIGNE_PAR, SIGNE_SANS_PAR, SIGNE_MOINS_PAR, SIGNE_EXP_NEG],
    [spec('(−3)⁵ : négatif', 0, {'a': 3, 'n': 5}, '1', 'correct'),
     spec('Erreur : (−3)⁵ positif', 0, {'a': 3, 'n': 5}, '0', 'incorrect'),
     spec('(−3)⁴ : positif', 0, {'a': 3, 'n': 4}, '0', 'correct'),
     spec('Erreur : (−3)⁴ négatif', 0, {'a': 3, 'n': 4}, '1', 'incorrect'),
     spec('−3⁴ : négatif', 1, {'a': 3, 'n': 4}, '1', 'correct'),
     spec('Erreur : −3⁴ positif (exposant pair)', 1, {'a': 3, 'n': 4}, '0', 'incorrect'),
     spec('−(−2)⁴ : négatif', 2, {'a': 2, 'n': 4}, '1', 'correct'),
     spec('−(−2)³ : positif', 2, {'a': 2, 'n': 3}, '0', 'correct'),
     spec('Erreur : −(−2)³ négatif', 2, {'a': 2, 'n': 3}, '1', 'incorrect'),
     spec('(−5)⁻² : positif', 3, {'a': 5, 'n': 2}, '0', 'correct'),
     spec('Erreur : (−5)⁻² négatif (exposant négatif)', 3, {'a': 5, 'n': 2}, '1', 'incorrect'),
     spec('(−5)⁻³ : négatif', 3, {'a': 5, 'n': 3}, '1', 'correct')]))

# --- 03. 2-260 : notation puissance --------------------------------------------------------

EN_PUISSANCE = 'Écris sous la forme d\'une puissance.'

NOT_POS = variation(
    EN_PUISSANCE + '\n\n$$' + produit('{{a}}', 'n', 3, 7) + '=?$$',
    [var('a', '2..9'), var('n', '3..7')],
    '{{a}}^{ {{n}} }',
    ['$a^n$ est le produit de $n$ facteurs tous égaux à $a$ : la base est le facteur répété,'
     ' l\'exposant est le nombre de facteurs.',
     'Le facteur ${{a}}$ est répété ${{n}}$ fois : $' + produit('{{a}}', 'n', 3, 7) + '='
     + col('{{a}}^{ {{n}} }') + '$.'])

NOT_NEG = variation(
    EN_PUISSANCE + '\n\n$$' + produit('(-{{a}})', 'n', 2, 5) + '=?$$',
    [var('a', '2..9'), var('n', '2..5')],
    '(-{{a}})^{ {{n}} }',
    ['$a^n$ est le produit de $n$ facteurs tous égaux à $a$ ; ici le facteur répété est'
     ' $-{{a}}$, il reste entre parenthèses.',
     'Le facteur $(-{{a}})$ est répété ${{n}}$ fois : $' + produit('(-{{a}})', 'n', 2, 5) + '='
     + col('(-{{a}})^{ {{n}} }') + '$.',
     'Sans parenthèses, $-{{a}}^{ {{n}} }$ serait l\'opposé de ${{a}}^{ {{n}} }$ : ce n\'est pas le'
     ' même nombre quand l\'exposant est pair.'])

NOT_INV = variation(
    EN_PUISSANCE + '\n\n$$\\dfrac{1}{' + produit('{{a}}', 'n', 2, 5) + '}=?$$',
    [var('a', '2..9'), var('n', '2..5')],
    '{{a}}^{-{{n}} }',
    ['$a^{-n}=\\dfrac{1}{a^n}$ : l\'inverse d\'une puissance s\'écrit avec un exposant négatif.',
     '$$\\dfrac{1}{' + produit('{{a}}', 'n', 2, 5) + '}=\\dfrac{1}{ {{a}}^{ {{n}} } }='
     + col('{{a}}^{-{{n}} }') + '$$'])

MODELES.append(modele(
    '03-notation-puissance', 'Notation puissance',
    'Écrire un produit de facteurs égaux, ou son inverse, sous la forme aⁿ ou a⁻ⁿ (pièges : 4⁷'
    ' pour 7⁴, −2⁴ pour (−2)⁴, 5³ pour 1/5³)',
    6, 30,
    [NOT_POS, NOT_NEG, NOT_INV],
    [spec('7 × 7 × 7 × 7 = 7⁴', 0, {'a': 7, 'n': 4}, '7^4', 'correct'),
     spec('Erreur : base et exposant échangés (4⁷)', 0, {'a': 7, 'n': 4}, '4^7', 'incorrect'),
     spec('Erreur : 7 × 4 = 28', 0, {'a': 7, 'n': 4}, '28', 'incorrect'),
     spec('Forme : 2 401 calculé', 0, {'a': 7, 'n': 4}, '2\\,401', 'bad_form', ['form']),
     spec('(−2) × (−2) × (−2) × (−2) = (−2)⁴', 1, {'a': 2, 'n': 4}, '(-2)^4', 'correct'),
     spec('Erreur : parenthèses oubliées (−2⁴)', 1, {'a': 2, 'n': 4}, '-2^4', 'incorrect'),
     spec('(−3) × (−3) × (−3) = (−3)³', 1, {'a': 3, 'n': 3}, '(-3)^3', 'correct'),
     spec('1/(5 × 5 × 5) = 5⁻³', 2, {'a': 5, 'n': 3}, '5^{-3}', 'correct'),
     spec('Erreur : 5³ (inverse oublié)', 2, {'a': 5, 'n': 3}, '5^3', 'incorrect'),
     spec('Erreur : −5³', 2, {'a': 5, 'n': 3}, '-5^3', 'incorrect')]))

# --- 04. 2-260 : écrire un nombre comme une puissance --------------------------------------

COMME_ENTIER = variation(
    'Complète.\n\n$${{N}}={{a}}^{?}$$',
    [var('a', '2|3|5'), var('n', '3..9'), var('N', 'eval:(a)^(n)')],
    '{{n}}',
    ['On divise ${{N}}$ par ${{a}}$ autant de fois que possible, ou on calcule les puissances'
     ' successives de ${{a}}$ jusqu\'à trouver ${{N}}$.',
     '$' + produit('{{a}}', 'n', 3, 9) + '={{N}}$ : il y a ${{n}}$ facteurs.',
     '$${{N}}=' + col('{{a}}^{ {{n}} }') + '$$'],
    ['(a)^(n) <= 999'])

COMME_DECIMAL = variation(
    'Complète par un nombre positif.\n\n$${{N}}=?^{ {{n}} }$$',
    [var('d', '2..9'), var('n', '2..3'), var('N', 'eval:(d)^(n)/10^(n);d'),
     var('b', 'eval:(d)/10;d')],
    '{{b}}',
    ['On cherche le nombre positif dont la puissance ${{n}}$ vaut ${{N}}$ : un produit de ${{n}}$ facteurs égaux à ce nombre.',
     '${{d}}^{ {{n}} }={{eval:(d)^(n)}}$, et ${{N}}$ a ${{n}}$ chiffres après la virgule : la base'
     ' a $1$ chiffre après la virgule.',
     '$$' + produit('{{b}}', 'n', 2, 3) + '={{N}}\\quad\\text{donc}\\quad{{N}}='
     + col('{{b}}') + '^{ {{n}} }$$'])

COMME_INVERSE = variation(
    'Complète.\n\n$$\\dfrac{1}{ {{N}} }={{a}}^{?}$$',
    [var('a', '2|3|5'), var('n', '2..6'), var('N', 'eval:(a)^(n)')],
    '-{{n}}',
    ['On écrit d\'abord le dénominateur comme une puissance de ${{a}}$, puis on utilise'
     ' $\\dfrac{1}{a^n}=a^{-n}$.',
     '${{N}}={{a}}^{ {{n}} }$, donc $\\dfrac{1}{ {{N}} }=\\dfrac{1}{ {{a}}^{ {{n}} } }='
     + col('{{a}}^{-{{n}} }') + '$.'],
    ['(a)^(n) <= 999'])

MODELES.append(modele(
    '04-ecrire-comme-une-puissance', 'Écrire un nombre comme une puissance',
    'Trouver l\'exposant ou la base : 64 = 2⁶, 0,04 = 0,2², 1/8 = 2⁻³ (pièges : 64 = 2³²,'
    ' 0,04 = 0,02², 1/8 = 2³)',
    7, 45,
    [COMME_ENTIER, COMME_DECIMAL, COMME_INVERSE],
    [spec('64 = 2⁶', 0, {'a': 2, 'n': 6}, '6', 'correct'),
     spec('Erreur : 64 = 2³² (64 ÷ 2)', 0, {'a': 2, 'n': 6}, '32', 'incorrect'),
     spec('Erreur : 64 = 2⁸ (8 × 8)', 0, {'a': 2, 'n': 6}, '8', 'incorrect'),
     spec('243 = 3⁵', 0, {'a': 3, 'n': 5}, '5', 'correct'),
     spec('0,04 = 0,2²', 1, {'d': 2, 'n': 2}, '0,2', 'correct'),
     spec('Erreur : 0,04 = 0,02²', 1, {'d': 2, 'n': 2}, '0,02', 'incorrect'),
     spec('Erreur : 0,04 = 2²', 1, {'d': 2, 'n': 2}, '2', 'incorrect'),
     spec('0,027 = 0,3³', 1, {'d': 3, 'n': 3}, '0,3', 'correct'),
     spec('1/8 = 2⁻³', 2, {'a': 2, 'n': 3}, '-3', 'correct'),
     spec('Erreur : 1/8 = 2³', 2, {'a': 2, 'n': 3}, '3', 'incorrect'),
     spec('Erreur : 1/8 = 2⁻⁸', 2, {'a': 2, 'n': 3}, '-8', 'incorrect')]))

# --- 05. 2-260 : bases cachées -------------------------------------------------------------

REGLES = ('**Règles** : $a^m\\times a^n=a^{m+n}$ ; $\\dfrac{a^m}{a^n}=a^{m-n}$ ;'
          ' $(a^m)^n=a^{m\\times n}$.')


def entre_par(x):
    return '{{if:' + x + '<0|(' + '{{' + x + '}}' + ')|{{' + x + '}}}}'


CACHE_PRODUIT = variation(
    'Écris sous la forme d\'une puissance de ${{b}}$.\n\n'
    '$$\\dfrac{ {{A}}^{ {{m}} }\\times {{B}}^{ {{n}} } }{ {{b}}^{ {{r}} } }={{b}}^{?}$$',
    [var('b', '2|3|5'), var('A', 'eval:(b)^3'), var('B', 'eval:(b)^2'), var('m', '2..4'),
     var('n', '2..4'), var('r', '1..9'), var('x', 'eval:3*(m)'), var('y', 'eval:2*(n)'),
     var('k', 'eval:3*(m)+2*(n)-(r)')],
    '{{k}}',
    [REGLES + ' Elles ne s\'appliquent qu\'à des puissances **d\'un même nombre**.',
     'On écrit chaque nombre comme une puissance de ${{b}}$ : ${{A}}=' + col('{{b}}^{3}')
     + '$ et ${{B}}=' + col('{{b}}^{2}', 1) + '$.',
     '$${{A}}^{ {{m}} }=\\left(' + col('{{b}}^{3}') + '\\right)^{ {{m}} }={{b}}^{3\\times{{m}}}'
     '={{b}}^{ {{x}} }\\quad\\text{et}\\quad{{B}}^{ {{n}} }=\\left(' + col('{{b}}^{2}', 1)
     + '\\right)^{ {{n}} }={{b}}^{2\\times{{n}}}={{b}}^{ {{y}} }$$',
     '$$\\dfrac{ {{b}}^{ {{x}} }\\times{{b}}^{ {{y}} } }{ {{b}}^{ {{r}} } }={{b}}^{ {{x}}+{{y}}-{{r}} }='
     + col('{{b}}^{ {{k}} }', 2) + '$$'],
    ['k >= 2'])

CACHE_QUOTIENT = variation(
    'Écris sous la forme d\'une puissance de ${{b}}$.\n\n'
    '$$\\dfrac{ {{B}}^{ {{m}} } }{ {{A}}^{ {{n}} } }={{b}}^{?}$$',
    [var('b', '2|3|5'), var('A', 'eval:(b)^3'), var('B', 'eval:(b)^2'), var('m', '2..5'),
     var('n', '2..3'), var('x', 'eval:2*(m)'), var('y', 'eval:3*(n)'),
     var('k', 'eval:2*(m)-3*(n)')],
    '{{k}}',
    [REGLES + ' Elles ne s\'appliquent qu\'à des puissances **d\'un même nombre**.',
     'On écrit chaque nombre comme une puissance de ${{b}}$ : ${{B}}=' + col('{{b}}^{2}')
     + '$ et ${{A}}=' + col('{{b}}^{3}', 1) + '$.',
     '$${{B}}^{ {{m}} }=\\left(' + col('{{b}}^{2}') + '\\right)^{ {{m}} }={{b}}^{ {{x}} }'
     '\\quad\\text{et}\\quad{{A}}^{ {{n}} }=\\left(' + col('{{b}}^{3}', 1)
     + '\\right)^{ {{n}} }={{b}}^{ {{y}} }$$',
     '$$\\dfrac{ {{b}}^{ {{x}} } }{ {{b}}^{ {{y}} } }={{b}}^{ {{x}}-{{y}} }='
     + col('{{b}}^{ {{k}} }', 2) + '$$'],
    ['k != 0', 'k != 1'])

MODELES.append(modele(
    '05-bases-cachees', 'Puissances : bases cachées',
    'Écrire 8² × 4³ / 2⁵ ou 9⁴ / 27² comme une puissance de 2, 3 ou 5 en repérant 8 = 2³, 4 = 2²'
    ' (pièges : exposants ajoutés sans convertir les bases, exposants additionnés au lieu de'
    ' multipliés)',
    8, 90,
    [CACHE_PRODUIT, CACHE_QUOTIENT],
    [spec('8² × 4³ / 2⁵ = 2⁷', 0, {'b': 2, 'm': 2, 'n': 3, 'r': 5}, '7', 'correct'),
     spec('Erreur : bases non converties (2 + 3 − 5 = 0)', 0, {'b': 2, 'm': 2, 'n': 3, 'r': 5},
          '0', 'incorrect'),
     spec('Erreur : (2³)² = 2⁵, exposants additionnés', 0, {'b': 2, 'm': 2, 'n': 3, 'r': 5},
          '5', 'incorrect'),
     spec('27³ × 9² / 3⁴ = 3⁹', 0, {'b': 3, 'm': 3, 'n': 2, 'r': 4}, '9', 'correct'),
     spec('25⁴ / 125² = 5²', 1, {'b': 5, 'm': 4, 'n': 2}, '2', 'correct'),
     spec('9² / 27³ = 3⁻⁵', 1, {'b': 3, 'm': 2, 'n': 3}, '-5', 'correct'),
     spec('Erreur : signe perdu (3⁵)', 1, {'b': 3, 'm': 2, 'n': 3}, '5', 'incorrect'),
     spec('Erreur : bases non converties (2 − 3 = −1)', 1, {'b': 3, 'm': 2, 'n': 3}, '-1',
          'incorrect')]))

# --- 06. 2-260 : priorités avec des puissances ---------------------------------------------

PRIORITES = ('**Priorités** : on calcule d\'abord les parenthèses, puis les **puissances**, puis'
             ' les multiplications, enfin les additions et soustractions.')

PRIO_A = variation(
    'Calcule.\n\n$${{a}}-{{b}}\\times(-{{c}})^{2}=?$$',
    [var('a', '1..9'), var('b', '2..5'), var('c', '2..4'), var('q', 'eval:(c)^2'),
     var('s', 'eval:(b)*(c)^2'), var('r', 'eval:(a)-(b)*(c)^2')],
    '{{r}}',
    [PRIORITES,
     'La puissance d\'abord : $(-{{c}})^{2}=' + col('{{q}}') + '$ (exposant pair : positif).',
     'Puis la multiplication : ${{b}}\\times' + col('{{q}}') + '=' + col('{{s}}', 1) + '$.',
     '$${{a}}-{{b}}\\times(-{{c}})^{2}={{a}}-{{b}}\\times' + col('{{q}}') + '={{a}}-'
     + col('{{s}}', 1) + '=' + col('{{r}}', 2) + '$$'])

PRIO_B = variation(
    'Calcule.\n\n$$-{{c}}^{2}+{{a}}\\times{{b}}=?$$',
    [var('a', '2..9'), var('b', '2..9'), var('c', '2..9'), var('q', 'eval:(c)^2'),
     var('s', 'eval:(a)*(b)'), var('r', 'eval:(a)*(b)-(c)^2')],
    '{{r}}',
    [PRIORITES,
     'Dans $-{{c}}^{2}$, l\'exposant ne porte que sur ${{c}}$ : $-{{c}}^{2}=-' + col('{{q}}')
     + '$ (et non $+{{q}}$).',
     'La multiplication : ${{a}}\\times{{b}}=' + col('{{s}}', 1) + '$.',
     '$$-{{c}}^{2}+{{a}}\\times{{b}}=-' + col('{{q}}') + '+' + col('{{s}}', 1) + '='
     + col('{{r}}', 2) + '$$'],
    ['r != 0'])

PRIO_C = variation(
    'Calcule.\n\n$${{b}}\\times(-{{c}})^{3}-{{a}}=?$$',
    [var('a', '1..9'), var('b', '2..4'), var('c', '2..4'), var('q', 'eval:(-(c))^3'),
     var('s', 'eval:(b)*(-(c))^3'), var('r', 'eval:(b)*(-(c))^3-(a)')],
    '{{r}}',
    [PRIORITES,
     'La puissance d\'abord : $(-{{c}})^{3}=' + col('{{q}}') + '$ (exposant impair : négatif).',
     'Puis la multiplication : ${{b}}\\times(' + col('{{q}}') + ')=' + col('{{s}}', 1) + '$.',
     '$${{b}}\\times(-{{c}})^{3}-{{a}}=' + col('{{s}}', 1) + '-{{a}}=' + col('{{r}}', 2) + '$$'])

MODELES.append(modele(
    '06-priorites-avec-puissances', 'Priorités avec des puissances',
    'Calculer a − b × (−c)², −c² + a × b, b × (−c)³ − a (pièges : (2 − 3) × 4, −3² = 9, (b × c)³'
    ' au lieu de b × c³)',
    9, 60,
    [PRIO_A, PRIO_B, PRIO_C],
    [spec('2 − 3 × (−2)² = −10', 0, {'a': 2, 'b': 3, 'c': 2}, '-10', 'correct'),
     spec('Erreur : (2 − 3) × 4 = −4', 0, {'a': 2, 'b': 3, 'c': 2}, '-4', 'incorrect'),
     spec('Erreur : (−2)² = −4, donc 14', 0, {'a': 2, 'b': 3, 'c': 2}, '14', 'incorrect'),
     spec('Erreur : 2 − (−6)² = −34', 0, {'a': 2, 'b': 3, 'c': 2}, '-34', 'incorrect'),
     spec('−3² + 4 × 5 = 11', 1, {'a': 4, 'b': 5, 'c': 3}, '11', 'correct'),
     spec('Erreur : −3² = 9, donc 29', 1, {'a': 4, 'b': 5, 'c': 3}, '29', 'incorrect'),
     spec('Erreur : (−3² + 4) × 5 = −25', 1, {'a': 4, 'b': 5, 'c': 3}, '-25', 'incorrect'),
     spec('2 × (−3)³ − 5 = −59', 2, {'a': 5, 'b': 2, 'c': 3}, '-59', 'correct'),
     spec('Erreur : (−3)³ = 27, donc 49', 2, {'a': 5, 'b': 2, 'c': 3}, '49', 'incorrect'),
     spec('Erreur : (2 × (−3))³ − 5 = −221', 2, {'a': 5, 'b': 2, 'c': 3}, '-221', 'incorrect')]))

# --- 07. 2-270 : écriture scientifique -----------------------------------------------------

DEF_SCI = ('**Écriture scientifique** : $a\\times10^{n}$ avec $1\\leqslant a<10$ (un seul chiffre,'
           ' non nul, avant la virgule) et $n$ entier relatif.')
EXPOSANTS_SCI = '-6|-5|-4|-3|-2|3|4|5|6|7'

SCI_VERS = variation(
    'Donne l\'écriture scientifique de ce nombre.\n\n$${{N}}=?$$',
    [var('M', '11..99!m(10)'), var('p', EXPOSANTS_SCI), var('N', 'eval:(M)*10^((p)-1);d'),
     var('a', 'eval:(M)/10;d')],
    '{{a}}\\times10^{ {{p}} }',
    [DEF_SCI,
     'On place la virgule juste après le premier chiffre non nul : $a=' + col('{{a}}') + '$.',
     '{{if:p<0|Pour passer de ${{a}}$ à ${{N}}$, la virgule recule de ${{eval:-(p)}}$ rangs'
     ' vers la gauche : on divise par $10^{ {{eval:-(p)}} }$, l\'exposant est négatif.'
     '|Pour passer de ${{a}}$ à ${{N}}$, la virgule avance de ${{p}}$ rangs vers la droite : on'
     ' multiplie par $10^{ {{p}} }$.}}',
     '$${{N}}=' + col('{{a}}') + '\\times10^{' + col('{{p}}', 1) + '}$$',
     '${{M}}\\times10^{ {{eval:(p)-1}} }$ a la même valeur, mais n\'est pas une écriture'
     ' scientifique : ${{M}}$ n\'est pas compris entre $1$ et $10$.'])

SCI_DEPUIS = variation(
    'Donne l\'écriture décimale de ce nombre.\n\n$${{a}}\\times10^{ {{p}} }=?$$',
    [var('M', '11..99!m(10)'), var('p', '-4|-3|-2|2|3|4|5'),
     var('N', 'eval:(M)*10^((p)-1);d'), var('a', 'eval:(M)/10;d')],
    '{{N}}',
    ['Multiplier par $10^{n}$ ($n>0$), c\'est décaler la virgule de $n$ rangs vers la droite ;'
     ' multiplier par $10^{-n}$, c\'est la décaler de $n$ rangs vers la gauche.',
     '{{if:p<0|L\'exposant vaut ${{p}}$ : la virgule de ${{a}}$ recule de ${{eval:-(p)}}$ rangs'
     ' vers la gauche, on complète par des zéros.|L\'exposant vaut ${{p}}$ : la virgule de'
     ' ${{a}}$ avance de ${{p}}$ rangs vers la droite, on complète par des zéros.}}',
     '$${{a}}\\times10^{ {{p}} }=' + col('{{N}}') + '$$'])

SCI_CHOIX = variation(
    'Quelle est l\'écriture scientifique de ${{N}}$ ?\n\n'
    '```choix\n'
    '- ${{a}}\\times10^{ {{p}} }$\n'
    '- ${{M}}\\times10^{ {{eval:(p)-1}} }$\n'
    '- ${{a}}\\times10^{ {{eval:-(p)}} }$\n'
    '- ${{a}}\\times10^{ {{eval:(p)+1}} }$\n'
    '```',
    [var('M', '11..99!m(10)'), var('p', '-5|-4|-3|-2|3|4|5|6'),
     var('N', 'eval:(M)*10^((p)-1);d'), var('a', 'eval:(M)/10;d')],
    '0',
    [DEF_SCI,
     '$${{N}}=' + col('{{a}}\\times10^{ {{p}} }') + '$$',
     '${{M}}\\times10^{ {{eval:(p)-1}} }$ a la même valeur mais ${{M}}\\geqslant10$ : ce n\'est'
     ' pas une écriture scientifique. Les deux autres n\'ont pas la bonne valeur.'])

SP_SCI = {'M': 52, 'p': -4}
SP_SCI_G = {'M': 31, 'p': 4}
MODELES.append(modele(
    '07-ecriture-scientifique', 'Écriture scientifique',
    'Passer de l\'écriture décimale à l\'écriture scientifique et inversement ; reconnaître la'
    ' bonne (pièges : 52 × 10⁻⁵ refusé, signe de l\'exposant, décalage d\'un rang)',
    10, 60,
    [SCI_VERS, SCI_DEPUIS, SCI_CHOIX],
    [spec('0,000 52 = 5,2 × 10⁻⁴', 0, SP_SCI, '5,2\\times10^{-4}', 'correct'),
     spec('Forme : 52 × 10⁻⁵ (pas scientifique)', 0, SP_SCI, '52\\times10^{-5}', 'bad_form',
          ['form']),
     spec('Forme : 0,52 × 10⁻³ (pas scientifique)', 0, SP_SCI, '0,52\\times10^{-3}',
          'bad_form', ['form']),
     spec('Erreur : signe de l\'exposant (5,2 × 10⁴)', 0, SP_SCI, '5,2\\times10^{4}',
          'incorrect'),
     spec('Erreur : décalage d\'un rang (5,2 × 10⁻³)', 0, SP_SCI, '5,2\\times10^{-3}',
          'incorrect'),
     spec('31 000 = 3,1 × 10⁴', 0, SP_SCI_G, '3,1\\times10^{4}', 'correct'),
     spec('Forme : 12 × 10³ pour 12 000', 0, {'M': 12, 'p': 4}, '12\\times10^{3}', 'bad_form',
          ['form']),
     spec('Forme : 31 000 recopié', 0, SP_SCI_G, '31\\,000', 'bad_form', ['form']),
     spec('3,1 × 10⁴ = 31 000', 1, SP_SCI_G, '31\\,000', 'correct'),
     spec('Erreur : 3,1 × 10⁴ = 310 000', 1, SP_SCI_G, '310\\,000', 'incorrect'),
     spec('Erreur : 3,1 × 10⁴ = 3,100 00', 1, SP_SCI_G, '3,10000', 'incorrect'),
     spec('5,2 × 10⁻⁴ = 0,000 52', 1, SP_SCI, '0,000\\,52', 'correct'),
     spec('Erreur : 5,2 × 10⁻⁴ = 0,0052', 1, SP_SCI, '0,0052', 'incorrect'),
     spec('Choix : 0,000 52 = 5,2 × 10⁻⁴', 2, SP_SCI, '0', 'correct'),
     spec('Choix, erreur : 52 × 10⁻⁵ (pas scientifique)', 2, SP_SCI, '1', 'incorrect'),
     spec('Choix, erreur : signe de l\'exposant', 2, SP_SCI, '2', 'incorrect')]))

# --- 08. 2-270 : calculer avec des puissances de 10 ----------------------------------------

REGLES_10 = ('**Puissances de 10** : $10^{n}=1\\underbrace{0\\cdots0}_{n}$ ; $10^{m}\\times10^{n}'
             '=10^{m+n}$ ; $\\dfrac{10^{m}}{10^{n}}=10^{m-n}$ ; $10^{0}=1$.')

DIX_SOMME = variation(
    'Calcule.\n\n$$10^{ {{a}} }+10^{ {{b}} }=?$$',
    [var('a', '2..4'), var('b', '1..3'), var('A', 'eval:10^(a)'), var('B', 'eval:10^(b)'),
     var('r', 'eval:10^(a)+10^(b)')],
    '{{r}}',
    [REGLES_10 + ' Il n\'y a **pas** de règle pour une somme : on calcule chaque puissance.',
     '$10^{ {{a}} }=' + col('{{A}}') + '$ et $10^{ {{b}} }=' + col('{{B}}', 1) + '$.',
     '$$10^{ {{a}} }+10^{ {{b}} }=' + col('{{A}}') + '+' + col('{{B}}', 1) + '='
     + col('{{r}}', 2) + '$$'],
    ['b < a'])

DIX_QUOTIENT = variation(
    'Écris sous la forme d\'une puissance de $10$.\n\n'
    '$$\\dfrac{10^{ {{a}} }\\times10^{ {{b}} } }{10^{ {{c}} } }=10^{?}$$',
    [var('a', '2..7'), var('b', '-6..-1'), var('c', '-4..5'), var('k', 'eval:(a)+(b)-(c)')],
    '{{k}}',
    [REGLES_10,
     'Au numérateur : $10^{ {{a}} }\\times10^{ {{b}} }=10^{ {{a}}+(' + '{{b}}' + ')}=10^{ '
     '{{eval:(a)+(b)}} }$.',
     '$$\\dfrac{10^{ {{eval:(a)+(b)}} } }{10^{ {{c}} } }=10^{ {{eval:(a)+(b)}}-' + entre_par('c')
     + ' }=' + col('10^{ {{k}} }') + '{{if:k==0|=1|}}$$'],
    ['c != 0', 'c != 1'])

DIX_DECIMAL = variation(
    'Donne l\'écriture décimale de ce nombre.\n\n$${{a}}\\times10^{ {{p}} }=?$$',
    [var('M', '101..999!m(10)'), var('p', '2..4'), var('a', 'eval:(M)/100;d'),
     var('N', 'eval:(M)*10^((p)-2);d')],
    '{{N}}',
    ['Multiplier par $10^{ {{p}} }$, c\'est multiplier par ${{eval:10^(p)}}$ : la virgule avance'
     ' de ${{p}}$ rangs vers la droite, on complète par des zéros si besoin.',
     '$${{a}}\\times10^{ {{p}} }=' + col('{{N}}') + '$$'])

DIX_MANQUANT = variation(
    'Complète.\n\n$$10^{ {{a}} }\\times10^{?}=10^{ {{c}} }$$',
    [var('a', '-5..7'), var('c', '-6..8'), var('k', 'eval:(c)-(a)')],
    '{{k}}',
    [REGLES_10,
     'Les exposants s\'additionnent : ${{a}}+?={{c}}$, donc $?={{c}}-' + entre_par('a') + '$.',
     '$$10^{ {{a}} }\\times10^{' + col('{{k}}') + '}=10^{ {{c}} }$$'],
    ['a != 0', 'a != 1', 'c != 0', 'c != 1', 'k != 0', 'k != 1', 'a < 0 or c < 0 or k < 0'])

MODELES.append(modele(
    '08-calculer-avec-puissances-de-10', 'Calculer avec des puissances de 10',
    'Calculer 10³ + 10², 10⁵ × 10⁻³ / 10², 4,57 × 10³, et trouver un exposant manquant (pièges :'
    ' 10³ + 10² = 10⁵, signe d\'un exposant négatif, exposants multipliés)',
    11, 45,
    [DIX_SOMME, DIX_QUOTIENT, DIX_DECIMAL, DIX_MANQUANT],
    [spec('10³ + 10² = 1 100', 0, {'a': 3, 'b': 2}, '1\\,100', 'correct'),
     spec('10³ + 10² = 1100 (sans espace, 4 chiffres)', 0, {'a': 3, 'b': 2}, '1100', 'correct'),
     spec('Erreur : 10³ + 10² = 10⁵ = 100 000', 0, {'a': 3, 'b': 2}, '100\\,000', 'incorrect'),
     spec('Erreur : 10³ + 10² = 10⁵', 0, {'a': 3, 'b': 2}, '10^5', 'incorrect'),
     spec('10⁴ + 10³ = 11 000', 0, {'a': 4, 'b': 3}, '11\\,000', 'correct'),
     spec('10⁵ × 10⁻³ / 10² = 10⁰', 1, {'a': 5, 'b': -3, 'c': 2}, '0', 'correct'),
     spec('Erreur : signe perdu (5 + 3 − 2 = 6)', 1, {'a': 5, 'b': -3, 'c': 2}, '6',
          'incorrect'),
     spec('Erreur : exposants multipliés (5 × (−3) × 2)', 1, {'a': 5, 'b': -3, 'c': 2}, '-30',
          'incorrect'),
     spec('10⁴ × 10⁻² / 10⁻³ = 10⁵', 1, {'a': 4, 'b': -2, 'c': -3}, '5', 'correct'),
     spec('Erreur : 4 − 2 − 3 = −1', 1, {'a': 4, 'b': -2, 'c': -3}, '-1', 'incorrect'),
     spec('4,5 × 10³ = 4 500', 2, {'M': 450, 'p': 3}, '4\\,500', 'correct'),
     spec('Erreur : 4,5 × 10³ = 4,5000', 2, {'M': 450, 'p': 3}, '4,5000', 'incorrect'),
     spec('Erreur : 4,5 × 10³ = 45 000', 2, {'M': 450, 'p': 3}, '45\\,000', 'incorrect'),
     spec('3,27 × 10² = 327', 2, {'M': 327, 'p': 2}, '327', 'correct'),
     spec('10³ × 10^? = 10⁻² : ? = −5', 3, {'a': 3, 'c': -2}, '-5', 'correct'),
     spec('Erreur : 10³ × 10^? = 10⁻² : ? = 5', 3, {'a': 3, 'c': -2}, '5', 'incorrect'),
     spec('Erreur : −2 + 3 au lieu de −2 − 3 (? = 1)', 3,
          {'a': 3, 'c': -2}, '1', 'incorrect')]))

# --- 09. 2-270 : préfixes et puissances de 10 ----------------------------------------------

# (symbole, exposant, nom) ; téra n'est pas dans les préfixes du moteur d'unités : `\unit{TW}`
# n'est qu'affiché (aucune réponse ne porte d'unité).
PREFIXES = [('k', 3, 'kilo'), ('M', 6, 'méga'), ('G', 9, 'giga'), ('T', 12, 'téra'),
            ('m', -3, 'milli'), ('μ', -6, 'micro'), ('n', -9, 'nano')]
UNITES = [('m', 'mètre'), ('W', 'watt'), ('g', 'gramme')]
# couples réalistes (indice de préfixe, indice d'unité)
COUPLES = [(0, 0), (4, 0), (5, 0), (6, 0),
           (0, 1), (1, 1), (2, 1), (3, 1), (4, 1),
           (0, 2), (4, 2), (5, 2)]
NB = len(COUPLES)

VARS_PREFIXE = [
    var('t', '0..' + str(NB - 1)),
    var('x', indic('t', [PREFIXES[p][1] for p, _ in COUPLES])),
    var('j', indic('t', [p for p, _ in COUPLES])),
    var('u', indic('t', [u for _, u in COUPLES])),
]
UNITE_PREFIXEE = selon('t', ['\\unit{' + PREFIXES[p][0] + UNITES[u][0] + '}'
                             for p, u in COUPLES])
UNITE = selon('u', ['\\unit{' + s + '}' for s, _ in UNITES])
NOM_PREFIXE = selon('j', [n for _, _, n in PREFIXES])
NOM_UNITE = selon('u', [n for _, n in UNITES])
TABLE_PREFIXES = ('**Préfixes** : téra (T) $=10^{12}$, giga (G) $=10^{9}$, méga (M) $=10^{6}$,'
                  ' kilo (k) $=10^{3}$, milli (m) $=10^{-3}$, micro (μ) $=10^{-6}$,'
                  ' nano (n) $=10^{-9}$.')

PREF_EXPOSANT = variation(
    'Complète.\n\n$$1~' + UNITE_PREFIXEE + '=10^{?}~' + UNITE + '$$',
    VARS_PREFIXE,
    '{{x}}',
    [TABLE_PREFIXES,
     'Le préfixe ' + NOM_PREFIXE + ' vaut $10^{ {{x}} }$ : $1~' + UNITE_PREFIXEE + '='
     + col('10^{ {{x}} }') + '~' + UNITE + '$.'])

PREF_VERS_UNITE = variation(
    'Écris cette grandeur en ' + NOM_UNITE + 's, sous la forme $c\\times10^{n}$.\n\n'
    '$${{c}}~' + UNITE_PREFIXEE + '=?~' + UNITE + '$$',
    VARS_PREFIXE + [var('c', '2..9')],
    '{{c}}\\times10^{ {{x}} }',
    [TABLE_PREFIXES,
     '$1~' + UNITE_PREFIXEE + '=10^{ {{x}} }~' + UNITE + '$, donc ${{c}}~' + UNITE_PREFIXEE
     + '={{c}}\\times' + col('10^{ {{x}} }') + '~' + UNITE + '$.'])

PREF_CHOIX = variation(
    'Quel préfixe complète l\'égalité ?\n\n'
    '$$10^{ {{x}} }~' + UNITE + '=1~\\ldots\\text{' + NOM_UNITE + '}$$\n\n'
    '```choix\nmelanger: non\n'
    + ''.join('- ' + n + ' (' + s + ')\n' for s, _, n in PREFIXES)
    + '```',
    VARS_PREFIXE,
    '{{j}}',
    [TABLE_PREFIXES,
     '$10^{ {{x}} }$, c\'est le préfixe ' + '**' + NOM_PREFIXE + '**' + ' : $10^{ {{x}} }~'
     + UNITE + '=1~' + UNITE_PREFIXEE + '$.'])

SP_NM = {'t': 3}   # nm
SP_GW = {'t': 6}   # GW
SP_MG = {'t': 10}  # mg
MODELES.append(modele(
    '09-prefixes-et-puissances-de-10', 'Préfixes et puissances de 10',
    'Relier les préfixes k, M, G, T, m, μ, n à 10³ … 10⁻⁹ (m, W, g), dans les deux sens : 1 nm ='
    ' 10⁻⁹ m, 3 GW = 3 × 10⁹ W (pièges : micro et milli confondus, signe de l\'exposant)',
    12, 45,
    [PREF_EXPOSANT, PREF_VERS_UNITE, PREF_CHOIX],
    [spec('1 nm = 10⁻⁹ m', 0, SP_NM, '-9', 'correct'),
     spec('Erreur : 1 nm = 10⁹ m', 0, SP_NM, '9', 'incorrect'),
     spec('Erreur : 1 nm = 10⁻⁶ m (micro)', 0, SP_NM, '-6', 'incorrect'),
     spec('1 GW = 10⁹ W', 0, SP_GW, '9', 'correct'),
     spec('3 GW = 3 × 10⁹ W', 1, dict(SP_GW, c=3), '3\\times10^{9}', 'correct'),
     spec('Erreur : 3 GW = 3 × 10⁶ W (méga)', 1, dict(SP_GW, c=3), '3\\times10^{6}',
          'incorrect'),
     spec('7 mg = 7 × 10⁻³ g', 1, dict(SP_MG, c=7), '7\\times10^{-3}', 'correct'),
     spec('Erreur : 7 mg = 7 × 10³ g', 1, dict(SP_MG, c=7), '7\\times10^{3}', 'incorrect'),
     spec('10⁹ W = 1 GW : giga', 2, SP_GW, '2', 'correct'),
     spec('Erreur : méga pour 10⁹', 2, SP_GW, '1', 'incorrect'),
     spec('10⁻⁹ m = 1 nm : nano', 2, SP_NM, '6', 'correct'),
     spec('Erreur : micro pour 10⁻⁹', 2, SP_NM, '5', 'incorrect')]))

# --- Écriture --------------------------------------------------------------------------------

os.makedirs(DOSSIER, exist_ok=True)
for nom, m in MODELES:
    chemin = os.path.join(DOSSIER, nom + '.json')
    if os.path.exists(chemin):
        ancien = json.load(open(chemin, encoding='utf-8'))
        if 'id' in ancien:
            m = {'id': ancien['id'], **m}
    with open(chemin, 'w', encoding='utf-8') as f:
        json.dump(m, f, ensure_ascii=False, indent='\t')
        f.write('\n')
print(len(MODELES), 'modèles écrits dans', DOSSIER)
