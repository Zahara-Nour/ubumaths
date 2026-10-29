"""Écrit les 8 modèles du lot 3 « Puissances, racines, fractions » de la 2de
dans scripts/questions/2de-puissances/.

Phase 0 validée par David le 2026-10-29 (§ 19 du journal `docs/wip/questions-2de-progress.md`).
Bornes : `bornes/lycee/2de.json` (2-260, 2-270 : décision l2-6, toutes les règles des puissances ;
2-423 : l2-1 ; 2-272, 2-238). Un point par modèle ; le nœud et le tag sont posés par la migration
de rangement, après le `--publier` de David.

Décisions et pièges :
- L3-a : (ab)ⁿ, (a/b)ⁿ et l'enchaînement des règles vont sur la notion « Puissances : calculs »
  (pas de sous-notion neuve) ;
- L3-b : √((x − k)²) sachant x < k ou x > k, en variation la plus difficile de 2-423 ;
- L3-c : 2-272 littéral, dénominateurs x, 2x, x² seulement ;
- la 3e a déjà produit et quotient de puissances d'un même nombre (bb9cff7b, 18761148) et la
  définition de a⁻ⁿ (15368b02) : rien de cela seul ici ;
- forme jugée en mode exact (contrainte `form` stricte) : 2³x³ au lieu de 8x³ = forme refusée ;
  écart à la phase 0 : 3x³y⁻² devait être accepté, mais un motif `requiredForm` refuse aussi
  3x³/y² ; la consigne demande donc un quotient sans exposant négatif (3x³y⁻² = forme refusée) ;
- les variables sont substituées telles quelles dans les `eval` : toujours `(a)`, `-(a)` ;
- variables `e` et `i` interdites ; lettre de l'énoncé tirée dans `L` (x, y, t, z).

    python3 docs/wip/questions-2de/lot-puissances-2de.py scripts/questions/2de-puissances
"""
import json
import os
import subprocess
import sys

DOSSIER = sys.argv[1]


def spec(desc, vi, variables, answers, status, violations=None):
    s = {'description': desc, 'variationIndex': vi,
         # une lettre seule serait lue comme le nom d'une variable : `x|x` donne la lettre x
         'variables': {k: (v + '|' + v if isinstance(v, str) and v.isalpha() else str(v))
                       for k, v in variables.items()},
         'answers': answers if isinstance(answers, list) else [answers],
         'expected': {'status': status}}
    if violations:
        s['expected']['constraintViolations'] = violations
    return s


def modele(nom, title, description, categorie, level, variations, specs, delay=60):
    m = {'title': title, 'description': description, 'grades': ['2'], 'theme': categorie[0],
         'domain': categorie[1], 'subdomain': categorie[2], 'level': level, 'delay': delay,
         'status': 'draft', 'variations': variations, 'testSpecs': specs}
    return nom, m


def var(nom, expression):
    return {'name': nom, 'expression': expression}


LETTRE = var('L', 'x|y|t|z')


def variation(statement, variables, answer, steps, conditions=None):
    v = {'statement': statement, 'variables': variables}
    if conditions:
        v['conditions'] = conditions
    v['blanks'] = [{'expectedAnswer': answer}]
    v['correction'] = {'steps': steps}
    return v


def selon(nom, valeurs, debut=0):
    """`{{if:nom==debut|v0|{{if:nom==debut+1|v1|…}}}}` ; la dernière valeur est le « sinon »."""
    texte = valeurs[-1]
    for k in range(len(valeurs) - 2, -1, -1):
        texte = '{{if:' + nom + '==' + str(debut + k) + '|' + valeurs[k] + '|' + texte + '}}'
    return texte


def col(x, k=0):
    return '\\textcolor{{{color:primary.' + str(k) + '}}}{' + x + '}'


def puissance(base, exposant):
    """`base^{exposant}`, ou `base` seule si l'exposant tiré vaut 1."""
    return '{{if:' + exposant + '==1|' + base + '|' + base + '^{ {{eval:' + exposant + '}} }}}'


def enonce(consigne, calcul):
    """La consigne, puis le calcul suivi de la case `=?`."""
    return consigne + '\n\n$$' + calcul + '=?$$'


MODELES = []
PUISSANCES = 'Puissances'

# --- 1. 2-260 : puissance d'un produit -----------------------------------------------------

REGLE_PRODUIT = ('**Puissance d\'un produit** : $(ab)^n=a^n\\times b^n$ : chaque facteur est élevé'
                 ' à la puissance $n$.')
SANS_PARENTHESES = 'Écris sans parenthèses, sous la forme la plus simple.'

PRODUIT_SIMPLE = variation(
    enonce(SANS_PARENTHESES, '\\left({{k}}{{L}}\\right)^{ {{n}} }'),
    [LETTRE, var('k', '2..5'), var('n', '2..3')],
    '{{eval:(k)^(n)}}{{L}}^{ {{n}} }',
    [REGLE_PRODUIT,
     '$$\\left({{k}}{{L}}\\right)^{ {{n}} }=' + col('{{k}}^{ {{n}} }') + '\\times' + col('{{L}}^{ {{n}} }', 1)
     + '=' + col('{{eval:(k)^(n)}}{{L}}^{ {{n}} }') + '$$'],
    ['k^n <= 125'])

PRODUIT_NEGATIF = variation(
    enonce(SANS_PARENTHESES, '\\left(-{{k}}{{L}}\\right)^{ {{n}} }'),
    [LETTRE, var('k', '2..5'), var('n', '2..3')],
    '{{eval:(-(k))^(n)}}{{L}}^{ {{n}} }',
    [REGLE_PRODUIT + ' Le facteur $-{{k}}$ garde son signe dans la puissance.',
     '$$\\left(-{{k}}{{L}}\\right)^{ {{n}} }=' + col('(-{{k}})^{ {{n}} }') + '\\times'
     + col('{{L}}^{ {{n}} }', 1) + '=' + col('{{eval:(-(k))^(n)}}{{L}}^{ {{n}} }') + '$$',
     '{{if:n==2|Un exposant pair rend le signe positif.|Un exposant impair garde le signe'
     ' négatif.}}'],
    ['k^n <= 125'])

PRODUIT_PUISSANCE = variation(
    enonce(SANS_PARENTHESES, '\\left({{k}}{{L}}^{ {{m}} }\\right)^{ {{n}} }'),
    [LETTRE, var('k', '2..3'), var('m', '2..4'), var('n', '2..3')],
    '{{eval:(k)^(n)}}{{L}}^{ {{eval:(m)*(n)}} }',
    [REGLE_PRODUIT + ' Puis **puissance d\'une puissance** : $(a^m)^n=a^{m\\times n}$.',
     '$$\\left({{k}}{{L}}^{ {{m}} }\\right)^{ {{n}} }=' + col('{{k}}^{ {{n}} }') + '\\times'
     + col('\\left({{L}}^{ {{m}} }\\right)^{ {{n}} }', 1) + '=' + col('{{eval:(k)^(n)}}')
     + '\\times' + col('{{L}}^{ {{m}}\\times{{n}} }', 1) + '=' + col(
         '{{eval:(k)^(n)}}{{L}}^{ {{eval:(m)*(n)}} }') + '$$'])

SP_PS = {'L': 'x', 'k': 2, 'n': 3}
SP_PN = {'L': 'y', 'k': 3, 'n': 2}
SP_PP = {'L': 'x', 'k': 2, 'm': 2, 'n': 3}
MODELES.append(modele(
    '01-puissance-d-un-produit', 'Puissance d\'un produit',
    'Écrire sans parenthèses (kx)ⁿ, (−kx)ⁿ et (kxᵐ)ⁿ',
    (PUISSANCES, 'Calculer', 'Puissance d\'un produit'), 1,
    [PRODUIT_SIMPLE, PRODUIT_NEGATIF, PRODUIT_PUISSANCE],
    [spec('(2x)³ = 8x³', 0, SP_PS, '8x^3', 'correct'),
     spec('Erreur : seule la lettre élevée au cube (2x³)', 0, SP_PS, '2x^3', 'incorrect'),
     spec('Erreur : 2 × 3 au lieu de 2³ (6x³)', 0, SP_PS, '6x^3', 'incorrect'),
     spec('Forme : 2³x³ non calculé', 0, SP_PS, '2^3x^3', 'bad_form', ['form']),
     spec('(−3y)² = 9y²', 1, SP_PN, '9y^2', 'correct'),
     spec('Erreur : signe gardé (−9y²)', 1, SP_PN, '-9y^2', 'incorrect'),
     spec('(2x²)³ = 8x⁶', 2, SP_PP, '8x^6', 'correct'),
     spec('Erreur : exposants additionnés (8x⁵)', 2, SP_PP, '8x^5', 'incorrect'),
     spec('Erreur : coefficient oublié (2x⁶)', 2, SP_PP, '2x^6', 'incorrect')],
    delay=45))

# --- 2. 2-260 : puissance d'un quotient ----------------------------------------------------

REGLE_QUOTIENT = ('**Puissance d\'un quotient** : $\\left(\\dfrac{a}{b}\\right)^n=\\dfrac{a^n}{b^n}$ :'
                  ' le numérateur et le dénominateur sont élevés à la puissance $n$.')

QUOTIENT_LETTRE_HAUT = variation(
    enonce(SANS_PARENTHESES, '\\left(\\dfrac{ {{L}} }{ {{k}} }\\right)^{ {{n}} }'),
    [LETTRE, var('k', '2..5'), var('n', '2..3')],
    '\\frac{ {{L}}^{ {{n}} } }{ {{eval:(k)^(n)}} }',
    [REGLE_QUOTIENT,
     '$$\\left(\\dfrac{ {{L}} }{ {{k}} }\\right)^{ {{n}} }=\\dfrac{' + col('{{L}}^{ {{n}} }', 1)
     + '}{' + col('{{k}}^{ {{n}} }') + '}=' + col('\\dfrac{ {{L}}^{ {{n}} } }{ {{eval:(k)^(n)}} }')
     + '$$'],
    ['k^n <= 125'])

QUOTIENT_LETTRE_BAS = variation(
    enonce(SANS_PARENTHESES, '\\left(\\dfrac{ {{k}} }{ {{L}} }\\right)^{ {{n}} }'),
    [LETTRE, var('k', '2..5'), var('n', '2..3')],
    '\\frac{ {{eval:(k)^(n)}} }{ {{L}}^{ {{n}} } }',
    [REGLE_QUOTIENT + ' Ici ${{L}}\\neq0$.',
     '$$\\left(\\dfrac{ {{k}} }{ {{L}} }\\right)^{ {{n}} }=\\dfrac{' + col('{{k}}^{ {{n}} }') + '}{'
     + col('{{L}}^{ {{n}} }', 1) + '}=' + col('\\dfrac{ {{eval:(k)^(n)}} }{ {{L}}^{ {{n}} } }')
     + '$$'],
    ['k^n <= 125'])

QUOTIENT_EXPOSANT_NEGATIF = variation(
    enonce('Écris sous la forme d\'une fraction irréductible.',
           '\\left(\\dfrac{ {{p}} }{ {{q}} }\\right)^{-{{n}} }'),
    [var('p', '2..5'), var('q', '2..5'), var('n', '2..3')],
    '\\frac{ {{eval:(q)^(n)}} }{ {{eval:(p)^(n)}} }',
    ['**Exposant négatif** : $a^{-n}=\\dfrac{1}{a^n}$ ; pour une fraction, c\'est la puissance de'
     ' son **inverse** : $\\left(\\dfrac{a}{b}\\right)^{-n}=\\left(\\dfrac{b}{a}\\right)^{n}$.',
     '$$\\left(\\dfrac{ {{p}} }{ {{q}} }\\right)^{-{{n}} }=' + col(
         '\\left(\\dfrac{ {{q}} }{ {{p}} }\\right)^{ {{n}} }') + '=\\dfrac{ {{q}}^{ {{n}} } }{ {{p}}^{ {{n}} } }='
     + col('\\dfrac{ {{eval:(q)^(n)}} }{ {{eval:(p)^(n)}} }', 1) + '$$'],
    ['gcd(p,q) == 1', 'p^n <= 125', 'q^n <= 125'])

SP_QH = {'L': 'x', 'k': 3, 'n': 2}
SP_QB = {'L': 't', 'k': 2, 'n': 3}
SP_QN = {'p': 2, 'q': 3, 'n': 2}
MODELES.append(modele(
    '02-puissance-d-un-quotient', 'Puissance d\'un quotient',
    'Écrire sans parenthèses (x/k)ⁿ et (k/x)ⁿ ; (p/q)⁻ⁿ en fraction irréductible',
    (PUISSANCES, 'Calculer', 'Puissance d\'un quotient'), 1,
    [QUOTIENT_LETTRE_HAUT, QUOTIENT_LETTRE_BAS, QUOTIENT_EXPOSANT_NEGATIF],
    [spec('(x/3)² = x²/9', 0, SP_QH, '\\frac{x^2}{9}', 'correct'),
     spec('Erreur : dénominateur oublié (x²/3)', 0, SP_QH, '\\frac{x^2}{3}', 'incorrect'),
     spec('(2/t)³ = 8/t³', 1, SP_QB, '\\frac{8}{t^3}', 'correct'),
     spec('Erreur : numérateur oublié (2/t³)', 1, SP_QB, '\\frac{2}{t^3}', 'incorrect'),
     spec('(2/3)⁻² = 9/4', 2, SP_QN, '\\frac{9}{4}', 'correct'),
     spec('Erreur : inverse oublié (4/9)', 2, SP_QN, '\\frac{4}{9}', 'incorrect'),
     spec('Erreur : exposant négatif lu comme un signe (−4/9)', 2, SP_QN, '-\\frac{4}{9}',
          'incorrect')],
    delay=45))

# --- 3. 2-260 : enchaîner les règles ----------------------------------------------------------

UNE_PUISSANCE = 'Écris sous la forme d\'une seule puissance de ${{L}}$ (${{L}}\\neq0$).'
REGLES = ('Règles : $a^m\\times a^n=a^{m+n}$ ; $\\dfrac{a^m}{a^n}=a^{m-n}$ ;'
          ' $(a^m)^n=a^{m\\times n}$.')


def par(x):
    """`x` entre parenthèses s'il est négatif (pour un calcul d'exposants)."""
    return '{{if:' + x + '<0|(' + '{{' + x + '}}' + ')|{{' + x + '}}}}'


ENCHAINER_PUISSANCE_PRODUIT = variation(
    enonce(UNE_PUISSANCE, '\\left({{L}}^{ {{a}} }\\right)^{ {{b}} }\\times {{L}}^{ {{c}} }'),
    [LETTRE, var('a', '2..4'), var('b', '2..3'), var('c', '-9..-2')],
    '{{L}}^{ {{eval:(a)*(b)+(c)}} }',
    [REGLES,
     '$$\\left({{L}}^{ {{a}} }\\right)^{ {{b}} }\\times {{L}}^{ {{c}} }=' + col(
         '{{L}}^{ {{eval:(a)*(b)}} }') + '\\times {{L}}^{ {{c}} }={{L}}^{ {{eval:(a)*(b)}}+'
     + par('c') + ' }=' + col('{{L}}^{ {{eval:(a)*(b)+(c)}} }', 1) + '$$'],
    ['(a)*(b)+(c) != 0', '(a)*(b)+(c) != 1'])

ENCHAINER_PRODUIT_QUOTIENT = variation(
    enonce(UNE_PUISSANCE, '\\dfrac{ {{L}}^{ {{a}} }\\times {{L}}^{ {{b}} } }{ {{L}}^{ {{c}} } }'),
    [LETTRE, var('a', '2..6'), var('b', '-5..5!0;!1'), var('c', '-5..-1')],
    '{{L}}^{ {{eval:(a)+(b)-(c)}} }',
    [REGLES,
     '$$\\dfrac{ {{L}}^{ {{a}} }\\times {{L}}^{ {{b}} } }{ {{L}}^{ {{c}} } }=\\dfrac{' + col(
         '{{L}}^{ {{eval:(a)+(b)}} }') + '}{ {{L}}^{ {{c}} } }={{L}}^{ {{eval:(a)+(b)}}-' + par('c')
     + ' }=' + col('{{L}}^{ {{eval:(a)+(b)-(c)}} }', 1) + '$$',
     'Diviser par un exposant **négatif** : soustraire $' + par('c') + '$, c\'est ajouter $'
     + '{{eval:-(c)}}$.'],
    ['(a)+(b)-(c) != 0', '(a)+(b)-(c) != 1', '(a)+(b) != 0', '(a)+(b) != 1'])

ENCHAINER_NEGATIFS = variation(
    enonce(UNE_PUISSANCE, '\\dfrac{\\left({{L}}^{-{{a}} }\\right)^{ {{b}} } }{ {{L}}^{-{{c}} } }'),
    [LETTRE, var('a', '1..3'), var('b', '2..3'), var('c', '2..7')],
    '{{L}}^{ {{eval:(c)-(a)*(b)}} }',
    [REGLES,
     '$$\\dfrac{\\left({{L}}^{-{{a}} }\\right)^{ {{b}} } }{ {{L}}^{-{{c}} } }=\\dfrac{' + col(
         '{{L}}^{ {{eval:-(a)*(b)}} }') + '}{ {{L}}^{-{{c}} } }={{L}}^{ {{eval:-(a)*(b)}}-(-{{c}}) }='
     + col('{{L}}^{ {{eval:(c)-(a)*(b)}} }', 1) + '$$'],
    ['(c)-(a)*(b) != 0', '(c)-(a)*(b) != 1'])

SP_EP = {'L': 'x', 'a': 2, 'b': 3, 'c': -4}
SP_EQ = {'L': 'y', 'a': 5, 'b': 3, 'c': -2}
SP_EN = {'L': 'z', 'a': 2, 'b': 3, 'c': 4}
MODELES.append(modele(
    '03-enchainer-les-regles', 'Écrire sous la forme d\'une seule puissance',
    'Enchaîner deux règles, exposants relatifs : (xᵃ)ᵇ × xᶜ, xᵃ × xᵇ / xᶜ, (x⁻ᵃ)ᵇ / x⁻ᶜ',
    (PUISSANCES, 'Calculer', 'Mixer tout ça'), 2,
    [ENCHAINER_PUISSANCE_PRODUIT, ENCHAINER_PRODUIT_QUOTIENT, ENCHAINER_NEGATIFS],
    [spec('(x²)³ × x⁻⁴ = x²', 0, SP_EP, 'x^2', 'correct'),
     spec('Erreur : (x²)³ lu x⁵ (x¹)', 0, SP_EP, 'x', 'incorrect'),
     spec('Erreur : exposants multipliés (x⁻²⁴)', 0, SP_EP, 'x^{-24}', 'incorrect'),
     spec('y⁵ × y³ / y⁻² = y¹⁰', 1, SP_EQ, 'y^{10}', 'correct'),
     spec('Erreur : signe de l\'exposant du dénominateur perdu (y⁶)', 1, SP_EQ, 'y^6', 'incorrect'),
     spec('(z⁻²)³ / z⁻⁴ = z⁻²', 2, SP_EN, 'z^{-2}', 'correct'),
     spec('Forme : 1/z² au lieu d\'une puissance', 2, SP_EN, '\\frac{1}{z^2}', 'bad_form', ['form']),
     spec('Erreur : z⁻¹⁰ (− − non changé en +)', 2, SP_EN, 'z^{-10}', 'incorrect')]))

# --- 4. 2-270 : calcul numérique avec des puissances ----------------------------------------

NUMERIQUE_ENTIER = variation(
    enonce('Calcule.', '\\dfrac{ {{k}}^{ {{a}} }\\times {{k}}^{ {{b}} } }{ {{k}}^{ {{c}} } }'),
    [var('k', '2|3'), var('r', '1..4'), var('a', '3..7'), var('b', '-5..-1'),
     var('c', 'eval:(a)+(b)-(r)')],
    '{{eval:(k)^(r)}}',
    [REGLES.replace('Règles', 'On écrit d\'abord une seule puissance de ${{k}}$. Règles'),
     '$$\\dfrac{ {{k}}^{ {{a}} }\\times {{k}}^{ {{b}} } }{ {{k}}^{ {{c}} } }={{k}}^{ {{a}}+' + par('b')
     + '-' + par('c') + ' }=' + col('{{k}}^{ {{r}} }') + '=' + col('{{eval:(k)^(r)}}', 1) + '$$'],
    ['(k)^(r) <= 81', 'c != 0', 'c != 1', '(a)+(b) != 0'])

NUMERIQUE_FRACTION = variation(
    enonce('Calcule et donne le résultat sous la forme d\'une fraction irréductible.',
           '\\dfrac{2^{ {{a}} }\\times 3^{ {{b}} } }{2^{ {{c}} }\\times 3^{ {{d}} } }'),
    [var('u', '-2..2'), var('v', '-2..2'), var('a', '1..5'), var('b', '1..4'),
     var('c', 'eval:(a)-(u)'), var('d', 'eval:(b)-(v)')],
    '{{eval:2^(u)*3^(v)}}',
    ['On regroupe les puissances de $2$, puis celles de $3$ : $\\dfrac{a^m}{a^n}=a^{m-n}$.',
     '$$\\dfrac{2^{ {{a}} }\\times 3^{ {{b}} } }{2^{ {{c}} }\\times 3^{ {{d}} } }=' + col(
         '2^{ {{u}} }') + '\\times' + col('3^{ {{v}} }', 1) + '=' + col('{{eval:2^(u)*3^(v)}}', 2)
     + '$$',
     'Un exposant négatif envoie la puissance au dénominateur : $a^{-n}=\\dfrac{1}{a^n}$.'],
    ['c >= 1', 'd >= 1', 'u < 0 or v < 0', 'u > 0 or v > 0'])

NUMERIQUE_SCIENTIFIQUE = variation(
    enonce('Calcule et donne le résultat en notation scientifique.',
           '{{p}}\\times10^{ {{a}} }\\times{{q}}\\times10^{ {{b}} }'),
    [var('p', '2..9'), var('q', '2..9'), var('a', '2..9'), var('b', '-9..-2'),
     var('w', 'eval:(a)+(b)')],
    '{{eval:(p)*(q)/10;d}}\\times10^{ {{eval:(a)+(b)+1}} }',
    ['On multiplie les nombres entre eux, puis les puissances de $10$ entre elles.',
     '$${{p}}\\times10^{ {{a}} }\\times{{q}}\\times10^{ {{b}} }=' + col('{{eval:(p)*(q)}}')
     + '\\times' + col('10^{ {{eval:(a)+(b)}} }', 1) + '$$',
     '${{eval:(p)*(q)}}$ n\'est pas compris entre $1$ et $10$ : ${{eval:(p)*(q)}}={{eval:(p)*(q)/10;d}}'
     '\\times10$, donc',
     '$${{eval:(p)*(q)}}\\times10^{ {{eval:(a)+(b)}} }={{eval:(p)*(q)/10;d}}\\times10^{1+'
     + par('w') + ' }=' + col(
         '{{eval:(p)*(q)/10;d}}\\times10^{ {{eval:(a)+(b)+1}} }', 2) + '$$'],
    ['(p)*(q) >= 10', 'w != 0', 'w != -1', 'w != 0'])

SP_NE = {'k': 2, 'r': 2, 'a': 5, 'b': -2, 'c': 1}
SP_NF = {'u': -1, 'v': 1, 'a': 3, 'b': 2, 'c': 4, 'd': 1}
SP_NS = {'p': 4, 'q': 3, 'a': 5, 'b': -2}
MODELES.append(modele(
    '04-calcul-numerique-puissances', 'Calculer avec des puissances',
    'Calcul numérique, exposants relatifs : résultat entier, fraction irréductible, notation'
    ' scientifique',
    (PUISSANCES, 'Calculer', 'Mixer tout ça'), 3,
    [NUMERIQUE_ENTIER, NUMERIQUE_FRACTION, NUMERIQUE_SCIENTIFIQUE],
    [spec('2⁵ × 2⁻² / 2¹ = 4', 0, SP_NE, '4', 'correct'),
     spec('Forme : 2² non calculé', 0, SP_NE, '2^2', 'bad_form', ['form']),
     spec('Erreur : signe de −2 perdu (2⁶ = 64)', 0, SP_NE, '64', 'incorrect'),
     spec('(2³ × 3²)/(2⁴ × 3) = 3/2', 1, SP_NF, '\\frac{3}{2}', 'correct'),
     spec('Erreur : 2/3 (fraction renversée)', 1, SP_NF, '\\frac{2}{3}', 'incorrect'),
     spec('Fraction non réduite (6/4)', 1, SP_NF, '\\frac{6}{4}', 'unoptimal_form',
          ['reducedFractions']),
     spec('4 × 10⁵ × 3 × 10⁻² = 1,2 × 10⁴', 2, SP_NS, '1{,}2\\times10^4', 'correct'),
     spec('Forme : 12 × 10³ (pas scientifique)', 2, SP_NS, '12\\times10^3', 'bad_form', ['form']),
     spec('Erreur : exposant non corrigé (1,2 × 10³)', 2, SP_NS, '1{,}2\\times10^3', 'incorrect')]))

# --- 5. 2-270 : calcul littéral avec des puissances -----------------------------------------

LITTERAL_PRODUIT = variation(
    enonce('Réduis l\'expression (${{L}}\\neq0$).',
           '\\left({{k}}{{L}}^{ {{a}} }\\right)^2\\times{{m}}{{L}}^{ {{b}} }'),
    [LETTRE, var('k', '2..3'), var('a', '2..3'), var('m', '2..5'), var('b', '-3..-1')],
    '{{eval:(k)*(k)*(m)}}' + puissance('{{L}}', '2*(a)+(b)'),
    ['On élève au carré, puis on multiplie les nombres entre eux et les puissances de ${{L}}$ entre'
     ' elles.',
     '$$\\left({{k}}{{L}}^{ {{a}} }\\right)^2\\times{{m}}{{L}}^{ {{b}} }=' + col(
         '{{eval:(k)*(k)}}{{L}}^{ {{eval:2*(a)}} }') + '\\times{{m}}{{L}}^{ {{b}} }={{eval:(k)*(k)}}'
     '\\times{{m}}\\times{{L}}^{ {{eval:2*(a)}}+(' + '{{b}})}=' + col(
         '{{eval:(k)*(k)*(m)}}' + puissance('{{L}}', '2*(a)+(b)'), 1) + '$$'],
    ['2*(a)+(b) != 0'])

LITTERAL_QUOTIENT = variation(
    enonce('Simplifie l\'expression et écris-la sous la forme d\'un quotient, sans exposant'
           ' négatif ($x\\neq0$, $y\\neq0$).',
           '\\dfrac{ {{eval:(c)*(q)}}x^{ {{a}} }y}{ {{q}}xy^{ {{b}} } }'),
    [var('c', '2..5'), var('q', '2..3'), var('a', '3..5'), var('b', '3..4')],
    '\\frac{ {{c}}x^{ {{eval:(a)-1}} } }{y^{ {{eval:(b)-1}} } }',
    ['On simplifie les nombres, puis les puissances de $x$, puis celles de $y$ :'
     ' $\\dfrac{a^m}{a^n}=a^{m-n}$.',
     '$$\\dfrac{ {{eval:(c)*(q)}}x^{ {{a}} }y}{ {{q}}xy^{ {{b}} } }=' + col(
         '\\dfrac{ {{eval:(c)*(q)}} }{ {{q}} }') + '\\times' + col('x^{ {{a}}-1}', 1) + '\\times'
     + col('y^{1-{{b}} }', 2) + '={{c}}x^{ {{eval:(a)-1}} }y^{ {{eval:1-(b)}} }=' + col(
         '\\dfrac{ {{c}}x^{ {{eval:(a)-1}} } }{y^{ {{eval:(b)-1}} } }') + '$$'])

SP_LP = {'L': 'x', 'k': 2, 'a': 3, 'm': 3, 'b': -1}
SP_LQ = {'c': 3, 'q': 2, 'a': 4, 'b': 3}
MODELES.append(modele(
    '05-calcul-litteral-puissances', 'Réduire une expression avec des puissances',
    'Calcul littéral, exposants relatifs : (kxᵃ)² × mxᵇ ; quotient de monômes en x et y',
    ('Calcul littéral', 'Calculs', 'Avec des puissances'), 3,
    [LITTERAL_PRODUIT, LITTERAL_QUOTIENT],
    [spec('(2x³)² × 3x⁻¹ = 12x⁵', 0, SP_LP, '12x^5', 'correct'),
     spec('Erreur : coefficient non élevé au carré (6x⁵)', 0, SP_LP, '6x^5', 'incorrect'),
     spec('Erreur : (x³)² lu x⁵ (12x⁴)', 0, SP_LP, '12x^4', 'incorrect'),
     spec('6x⁴y / (2xy³) = 3x³/y²', 1, SP_LQ, '\\frac{3x^3}{y^2}', 'correct'),
     spec('Forme : exposant négatif 3x³y⁻² (quotient demandé)', 1, SP_LQ, '3x^3y^{-2}', 'bad_form',
          ['form']),
     spec('Fraction non simplifiée (6x³/(2y²))', 1, SP_LQ, '\\frac{6x^3}{2y^2}', 'unoptimal_form',
          ['reducedFractions']),
     spec('Erreur : 3x⁴/y³ (rien simplifié en lettres)', 1, SP_LQ, '\\frac{3x^4}{y^3}', 'incorrect'),
     spec('Erreur : 3x³y² (exposant de y mal soustrait)', 1, SP_LQ, '3x^3y^2', 'incorrect')]))

# --- 6. 2-423 : √a² = |a| ------------------------------------------------------------------

RACINE_CARRE = ('Pour tout réel $a$ : $\\sqrt{a^2}=|a|$. On regarde donc le **signe** de $a$ :'
                ' $|a|=a$ si $a\\geqslant0$, $|a|=-a$ si $a<0$.')

RACINE_ENTIER = variation(
    enonce('Calcule.', '\\sqrt{(-{{k}})^2}'),
    [var('k', '2..12')],
    '{{k}}',
    [RACINE_CARRE,
     '$$\\sqrt{(-{{k}})^2}=|-{{k}}|=' + col('{{k}}') + '$$',
     'Une racine carrée n\'est jamais négative.'])

# (a, valeur, signe) : a = « 1 − √2 »… ; `t` choisit le cas
DIFFERENCES = [('1-\\sqrt{2}', '\\sqrt{2}-1', 'négatif', '\\sqrt{2}>1'),
               ('3-\\pi', '\\pi-3', 'négatif', '\\pi>3'),
               ('\\sqrt{3}-2', '2-\\sqrt{3}', 'négatif', '\\sqrt{3}<2'),
               ('\\sqrt{5}-3', '3-\\sqrt{5}', 'négatif', '\\sqrt{5}<3'),
               ('\\sqrt{7}-2', '\\sqrt{7}-2', 'positif', '\\sqrt{7}>2')]
RACINE_DIFFERENCE = variation(
    enonce('Écris sans racine carrée ni valeur absolue.',
           '\\sqrt{\\left(' + selon('t', [d[0] for d in DIFFERENCES]) + '\\right)^2}'),
    [var('t', '0..4')],
    selon('t', [d[1] for d in DIFFERENCES]),
    [RACINE_CARRE,
     'Comme $' + selon('t', [d[3] for d in DIFFERENCES]) + '$, le nombre $'
     + selon('t', [d[0] for d in DIFFERENCES]) + '$ est **'
     + selon('t', [d[2] for d in DIFFERENCES]) + '**.',
     '$$\\sqrt{\\left(' + selon('t', [d[0] for d in DIFFERENCES]) + '\\right)^2}=\\left|'
     + selon('t', [d[0] for d in DIFFERENCES]) + '\\right|=' + col(
         selon('t', [d[1] for d in DIFFERENCES])) + '$$'])

RACINE_LITTERALE = variation(
    enonce('On sait que $x' + selon('s', ['<', '>']) + '{{k}}$. Écris sans racine carrée ni valeur'
           ' absolue.', '\\sqrt{(x-{{k}})^2}'),
    [var('k', '1..9'), var('s', '0..1')],
    selon('s', ['{{k}}-x', 'x-{{k}}']),
    [RACINE_CARRE,
     'Comme $x' + selon('s', ['<', '>']) + '{{k}}$, le nombre $x-{{k}}$ est **'
     + selon('s', ['négatif', 'positif']) + '**.',
     '$$\\sqrt{(x-{{k}})^2}=|x-{{k}}|=' + col(selon('s', ['-(x-{{k}})={{k}}-x', 'x-{{k}}']))
     + '$$'])

SP_RE = {'k': 5}
SP_RD = {'t': 0}
SP_RP = {'t': 4}
SP_RL = {'k': 2, 's': 0}
SP_RG = {'k': 2, 's': 1}
MODELES.append(modele(
    '06-racine-de-a-carre', 'Simplifier la racine carrée d\'un carré',
    '√a² = |a| : a entier négatif, a = 1 − √2, 3 − π…, puis √((x − k)²) sachant x < k ou x > k',
    ('Racines carrées', 'Manipuler', 'Propriétés'), 2,
    [RACINE_ENTIER, RACINE_DIFFERENCE, RACINE_LITTERALE],
    [spec('√((−5)²) = 5', 0, SP_RE, '5', 'correct'),
     spec('Erreur : −5', 0, SP_RE, '-5', 'incorrect'),
     spec('√((1 − √2)²) = √2 − 1', 1, SP_RD, '\\sqrt{2}-1', 'correct'),
     spec('Erreur : 1 − √2 (négatif)', 1, SP_RD, '1-\\sqrt{2}', 'incorrect'),
     spec('√((√7 − 2)²) = √7 − 2', 1, SP_RP, '\\sqrt{7}-2', 'correct'),
     spec('Erreur : 2 − √7 (signe changé à tort)', 1, SP_RP, '2-\\sqrt{7}', 'incorrect'),
     spec('x < 2 : 2 − x', 2, SP_RL, '2-x', 'correct'),
     spec('x < 2 : −x + 2 accepté', 2, SP_RL, '-x+2', 'correct'),
     spec('Erreur : x − 2 sachant x < 2', 2, SP_RL, 'x-2', 'incorrect'),
     spec('x > 2 : x − 2', 2, SP_RG, 'x-2', 'correct'),
     spec('Erreur : 2 − x sachant x > 2', 2, SP_RG, '2-x', 'incorrect')]))

# --- 7. 2-272 : écritures fractionnaires ----------------------------------------------------

UNE_FRACTION = 'Écris sous la forme d\'une seule fraction, la plus simple possible (${{L}}\\neq0$).'

FRACTION_NUMERIQUE = variation(
    enonce('Calcule et donne le résultat sous la forme d\'une fraction irréductible.',
           '\\left(\\dfrac{ {{a}} }{ {{b}} }+\\dfrac{ {{c}} }{ {{d}} }\\right)\\div\\dfrac{ {{f}} }{ {{g}} }'),
    [var('b', '2..6'), var('d', '2..6!b'), var('a', '1..5'), var('c', '1..5'), var('f', '2..5'),
     var('g', '2..5!f')],
    '{{eval:((a)/(b)+(c)/(d))*(g)/(f)}}',
    ['On calcule d\'abord la parenthèse (même dénominateur), puis **diviser par une fraction,'
     ' c\'est multiplier par son inverse** : $\\dfrac{a}{b}\\div\\dfrac{c}{d}=\\dfrac{a}{b}\\times'
     '\\dfrac{d}{c}$.',
     '$$\\dfrac{ {{a}} }{ {{b}} }+\\dfrac{ {{c}} }{ {{d}} }=' + col('{{eval:(a)/(b)+(c)/(d)}}') + '$$',
     '$$' + col('{{eval:(a)/(b)+(c)/(d)}}') + '\\div\\dfrac{ {{f}} }{ {{g}} }=' + col(
         '{{eval:(a)/(b)+(c)/(d)}}') + '\\times' + col('\\dfrac{ {{g}} }{ {{f}} }', 1) + '=' + col(
         '{{eval:((a)/(b)+(c)/(d))*(g)/(f)}}', 2) + '$$'],
    ['gcd(a,b) == 1', 'gcd(c,d) == 1', 'gcd(f,g) == 1',
     'mod((a)*(d)+(c)*(b), (b)*(d)) != 0', 'mod(((a)*(d)+(c)*(b))*(g), (b)*(d)*(f)) != 0'])

FRACTION_SOMME = variation(
    enonce(UNE_FRACTION, '\\dfrac{ {{a}} }{ {{L}} }+\\dfrac{ {{b}} }{2{{L}} }'),
    [LETTRE, var('a', '1..5'), var('b', '1|3|5|7|9')],
    '\\frac{ {{eval:2*(a)+(b)}} }{2{{L}} }',
    ['On met au **même dénominateur** $2{{L}}$ : on multiplie le numérateur et le dénominateur de'
     ' $\\dfrac{ {{a}} }{ {{L}} }$ par $2$.',
     '$$\\dfrac{ {{a}} }{ {{L}} }+\\dfrac{ {{b}} }{2{{L}} }=' + col('\\dfrac{ {{eval:2*(a)}} }{2{{L}} }')
     + '+\\dfrac{ {{b}} }{2{{L}} }=' + col('\\dfrac{ {{eval:2*(a)+(b)}} }{2{{L}} }', 1) + '$$',
     'On n\'additionne **jamais** les dénominateurs.'])

NUMERATEUR_REDUIT = '{{if:na==1|{{L}}|{{na}}{{L}}}}'
FRACTION_DIVISION = variation(
    enonce(UNE_FRACTION, '\\dfrac{ {{a}} }{ {{L}} }\\div\\dfrac{ {{b}} }{ {{L}}^2}'),
    [LETTRE, var('a', '2..9'), var('b', '2..9!a'), var('na', 'eval:(a)/gcd(a,b)'),
     var('nb', 'eval:(b)/gcd(a,b)')],
    '\\frac{' + NUMERATEUR_REDUIT + '}{ {{nb}} }',
    ['**Diviser par une fraction, c\'est multiplier par son inverse.**',
     '$$\\dfrac{ {{a}} }{ {{L}} }\\div\\dfrac{ {{b}} }{ {{L}}^2}=\\dfrac{ {{a}} }{ {{L}} }\\times' + col(
         '\\dfrac{ {{L}}^2}{ {{b}} }') + '=\\dfrac{ {{a}}{{L}}^2}{ {{b}}{{L}} }=' + col(
         '\\dfrac{' + NUMERATEUR_REDUIT + '}{ {{nb}} }', 1) + '$$'],
    ['nb != 1'])

FRACTION_UN_PLUS = variation(
    enonce(UNE_FRACTION, '1+\\dfrac{ {{k}} }{ {{L}} }'),
    [LETTRE, var('k', '1..9')],
    '\\frac{ {{L}}+{{k}} }{ {{L}} }',
    ['On écrit $1$ avec le dénominateur ${{L}}$ : $1=\\dfrac{ {{L}} }{ {{L}} }$.',
     '$$1+\\dfrac{ {{k}} }{ {{L}} }=' + col('\\dfrac{ {{L}} }{ {{L}} }') + '+\\dfrac{ {{k}} }{ {{L}} }='
     + col('\\dfrac{ {{L}}+{{k}} }{ {{L}} }', 1) + '$$'])

SP_FN = {'b': 2, 'd': 3, 'a': 1, 'c': 1, 'f': 5, 'g': 3}
SP_FS = {'L': 'x', 'a': 3, 'b': 1}
SP_FD = {'L': 'x', 'a': 2, 'b': 4}
SP_FU = {'L': 'x', 'k': 3}
MODELES.append(modele(
    '07-ecritures-fractionnaires', 'Calculer avec des écritures fractionnaires',
    'Une seule fraction : (a/b + c/d) ÷ e/f ; a/x + b/(2x) ; (a/x) ÷ (b/x²) ; 1 + k/x',
    ('Calcul littéral', 'Transformation', 'Écritures fractionnaires'), 1,
    [FRACTION_NUMERIQUE, FRACTION_SOMME, FRACTION_DIVISION, FRACTION_UN_PLUS],
    [spec('(1/2 + 1/3) ÷ 5/3 = 1/2', 0, SP_FN, '\\frac{1}{2}', 'correct'),
     spec('Erreur : multiplié par 5/3 (25/18)', 0, SP_FN, '\\frac{25}{18}', 'incorrect'),
     spec('Erreur : 1/2 + 1/3 = 2/5, puis ÷ 5/3 (6/25)', 0, SP_FN, '\\frac{6}{25}', 'incorrect'),
     spec('3/x + 1/(2x) = 7/(2x)', 1, SP_FS, '\\frac{7}{2x}', 'correct'),
     spec('Erreur : dénominateurs additionnés (4/(3x))', 1, SP_FS, '\\frac{4}{3x}', 'incorrect'),
     spec('Erreur : numérateurs additionnés sans mise au même dénominateur (4/(2x))', 1, SP_FS,
          '\\frac{4}{2x}', 'incorrect'),
     spec('(2/x) ÷ (4/x²) = x/2', 2, SP_FD, '\\frac{x}{2}', 'correct'),
     spec('Erreur : inverse de la première fraction (2/x)', 2, SP_FD, '\\frac{2}{x}', 'incorrect'),
     spec('1 + 3/x = (x + 3)/x', 3, SP_FU, '\\frac{x+3}{x}', 'correct'),
     spec('Erreur : 1 ajouté au numérateur (4/x)', 3, SP_FU, '\\frac{4}{x}', 'incorrect')]))

# --- 8. 2-238 : forme irréductible ----------------------------------------------------------

IRREDUCTIBLE = 'Écris cette fraction sous forme irréductible.'


def facteurs_2_3(p):
    """Décomposition 2^u × 3^v × p, avec u, v tirés (1 ou 2)."""
    return (puissance('2', 'u') + '\\times' + puissance('3', 'v') + '\\times' + p)


IRREDUCTIBLE_PREMIERS = variation(
    enonce(IRREDUCTIBLE, '\\dfrac{ {{eval:2^(u)*3^(v)*(p)}} }{ {{eval:2^(u)*3^(v)*(q)}} }'),
    [var('u', '1..2'), var('v', '1..2'), var('p', '5|7|11|13'), var('q', '5|7|11|13!p')],
    '\\frac{ {{p}} }{ {{q}} }',
    ['On décompose le numérateur et le dénominateur en **produits de facteurs premiers**.',
     '$${{eval:2^(u)*3^(v)*(p)}}=' + col(facteurs_2_3('{{p}}').replace('\\times{{p}}', ''))
     + '\\times{{p}}\\qquad{{eval:2^(u)*3^(v)*(q)}}=' + col(
         facteurs_2_3('{{q}}').replace('\\times{{q}}', '')) + '\\times{{q}}$$',
     'Le plus grand diviseur commun est $' + col('{{eval:2^(u)*3^(v)}}') + '$ ; on simplifie par'
     ' lui :',
     '$$\\dfrac{ {{eval:2^(u)*3^(v)*(p)}} }{ {{eval:2^(u)*3^(v)*(q)}} }=\\dfrac{' + col(
         '{{eval:2^(u)*3^(v)}}') + '\\times{{p}} }{' + col('{{eval:2^(u)*3^(v)}}')
     + '\\times{{q}} }=' + col('\\dfrac{ {{p}} }{ {{q}} }', 1) + '$$',
     '${{p}}$ et ${{q}}$ sont premiers et différents : la fraction est irréductible.'])

IRREDUCTIBLE_CACHE = variation(
    enonce(IRREDUCTIBLE, '\\dfrac{ {{eval:(p)*(r)*(s)}} }{ {{eval:(q)*(r)*(s)}} }'),
    [var('p', '2|3|5'), var('q', '2|3|5!p'), var('r', '7|11|13'), var('s', '7|11|13!r')],
    '\\frac{ {{p}} }{ {{q}} }',
    ['Aucun petit diviseur commun n\'apparaît : on décompose en **produits de facteurs premiers**.',
     '$${{eval:(p)*(r)*(s)}}={{p}}\\times' + col('{{r}}\\times{{s}}') + '\\qquad{{eval:(q)*(r)*(s)}}'
     '={{q}}\\times' + col('{{r}}\\times{{s}}') + '$$',
     'Le diviseur commun est $' + col('{{r}}\\times{{s}}={{eval:(r)*(s)}}') + '$ :',
     '$$\\dfrac{ {{eval:(p)*(r)*(s)}} }{ {{eval:(q)*(r)*(s)}} }=' + col('\\dfrac{ {{p}} }{ {{q}} }', 1)
     + '$$'],
    ['r < s'])

SP_IP = {'u': 2, 'v': 1, 'p': 5, 'q': 7}
SP_IC = {'p': 2, 'q': 3, 'r': 7, 's': 11}
MODELES.append(modele(
    '08-forme-irreductible', 'Rendre une fraction irréductible',
    'Simplifier par décomposition en facteurs premiers : diviseur commun 2ᵘ × 3ᵛ (60/84), puis'
    ' diviseur commun caché, produit de deux premiers ⩾ 7 (154/231)',
    ('Fractions', 'Apprivoiser', 'Simplification'), 7,
    [IRREDUCTIBLE_PREMIERS, IRREDUCTIBLE_CACHE],
    [spec('60/84 = 5/7', 0, SP_IP, '\\frac{5}{7}', 'correct'),
     spec('Simplification incomplète (30/42)', 0, SP_IP, '\\frac{30}{42}', 'unoptimal_form',
          ['reducedFractions']),
     spec('Erreur : 7/5 (fraction renversée)', 0, SP_IP, '\\frac{7}{5}', 'incorrect'),
     spec('154/231 = 2/3', 1, SP_IC, '\\frac{2}{3}', 'correct'),
     spec('Simplification par 7 seulement (22/33)', 1, SP_IC, '\\frac{22}{33}', 'unoptimal_form',
          ['reducedFractions']),
     spec('Erreur : 3/2', 1, SP_IC, '\\frac{3}{2}', 'incorrect')]))

os.makedirs(DOSSIER, exist_ok=True)
for nom, m in MODELES:
    with open(os.path.join(DOSSIER, nom + '.json'), 'w', encoding='utf-8') as f:
        json.dump(m, f, ensure_ascii=False, indent='\t')
        f.write('\n')
# Mis en forme comme le pre-commit, pour que le script redonne les fichiers commités
subprocess.run(['pnpm', 'exec', 'prettier', '--write', DOSSIER], check=True,
               stdout=subprocess.DEVNULL)
print(f'{len(MODELES)} modèles écrits dans {DOSSIER}')
