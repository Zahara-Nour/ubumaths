"""Écrit les 7 modèles du lot 2 « Proportionnalité et pourcentages » de la 4e dans scripts/questions/4-lot-2/.

Phase 0 validée par David le 2026-10-29 (§ 12 du journal `docs/wip/questions-4-progress.md`), un
point par modèle :

| # | Point | Titre                                   | Catégorie, niveau                                         |
| 1 | 4-053 | Comparer avec un rapport                | Proportionnalité › Ratios › Comparer, 1                   |
| 2 | 4-054 | Égalités de rapports                    | Proportionnalité › Ratios › Égalités de rapports, 1       |
| 3 | 4-056 | Calculer avec des pourcentages          | Proportionnalité › Pourcentages › Calculer, 7             |
| 4 | 4-058 | Le coefficient multiplicateur           | Proportionnalité › Pourcentages › Coefficient, 1          |
| 5 | 4-057 | Augmentation et coefficient multiplicateur | Proportionnalité › Pourcentages › Coefficient, 2       |
| 6 | 4-080 | Diminution et coefficient multiplicateur   | Proportionnalité › Pourcentages › Coefficient, 3       |
| 7 | 4-059 | Partage proportionnel                   | Proportionnalité › Ratios › Partage proportionnel, 1      |

Bornes : `cycle4.json`, 4e (4-054 : a/2 = b/3 = c/7, ratio 2 : 3 : 7 ; 4-056 : automatismes 100,
50, 25, 10, 1 %, 20 % de 120 ; 4-057 : + 15 % → × 1,15 ; 4-080 : − 20 % → × 0,8 ; 4-059 : ratio
5 : 11, 4 : 3 : 2). Le nœud et le tag sont posés par la migration de rangement, après le
`--publier` de David.

Décisions et pièges :
- jamais de case « 2 : 3 » : le ratio est dans l'énoncé, la réponse est un nombre ou une fraction ;
- cas tirés (plus sucré, oui / non, hausse / baisse) par une variable ; le bon choix est `{{k}}`,
  les valeurs prises par indicatrices arithmétiques (comme 4-006 du lot 1) ;
- 4-056 : t hors des automatismes de 6e (6-141 a 50, 10, 25, 75 %) ;
- choix en case choix (bloc ```choix, ADR 0033) ; montants en `$n~\\unit{€}$` ;
- variables `e` et `i` interdites dans les `eval`.

    python3 docs/wip/questions/lot-4-2.py scripts/questions/4-lot-2
"""
import json
import os
import subprocess
import sys

DOSSIER = sys.argv[1]


def spec(desc, vi, variables, answers, status, violations=None):
    s = {'description': desc, 'variationIndex': vi,
         'variables': {k: str(v) for k, v in variables.items()},
         'answers': answers if isinstance(answers, list) else [answers],
         'expected': {'status': status}}
    if violations:
        s['expected']['constraintViolations'] = violations
    return s


def modele(nom, title, description, theme, domain, subdomain, level, variations, specs,
           delay=30, options=None):
    m = {'title': title, 'description': description, 'grades': ['4'], 'theme': theme,
         'domain': domain, 'subdomain': subdomain, 'level': level, 'delay': delay,
         'status': 'draft'}
    if options:
        m['options'] = options
    m['variations'] = variations
    m['testSpecs'] = specs
    return nom, m


def var(nom, expression):
    return {'name': nom, 'expression': expression}


def variation(statement, variables, answers, steps, conditions=None):
    v = {'statement': statement, 'variables': variables}
    if conditions:
        v['conditions'] = conditions
    if answers is not None:
        v['blanks'] = [a if isinstance(a, dict) else {'expectedAnswer': a} for a in answers]
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


def choix(lignes, melanger=True):
    tete = '' if melanger else 'melanger: non\n'
    return '\n\n```choix\n' + tete + ''.join('- ' + l + '\n' for l in lignes) + '```'


def ev(x):
    return '{{eval:' + x + '}}'


def fr(n, d):
    """Fraction de deux expressions de gabarit (`{{a}}`, `{{eval:…}}`)."""
    return '\\frac{' + n + '}{' + d + '}'


def euros(x):
    return '$' + x + '~\\unit{€}$'


X = '\\times'
EUROS = '\n\n$$?~\\text{€}$$'
# Indicatrices de k ∈ {0, 1, 2} : valent 1 pour leur cas, 0 sinon
INDIC = ['(1-k)*(2-k)/2', 'k*(2-k)', 'k*(k-1)/2']
MODELES = []

# --- 1. 4-053 : comparer avec un rapport ---------------------------------------------------

RAPPORT = ('**Rapport.** Le rapport de $a$ à $b$ est le quotient $\\dfrac{a}{b}$ : il dit combien'
           ' de fois $a$ contient $b$.')

RAPPORT_FILLES = variation(
    'Dans une classe, il y a ${{f}}$ filles et ${{g}}$ garçons.\n\nQuel est le rapport du nombre'
    ' de filles au nombre de garçons ? Donne une fraction simplifiée.\n\n$$?$$',
    [var('p', '2..5'), var('q', '2..5'), var('m', '2..6'), var('f', 'eval:p*m'),
     var('g', 'eval:q*m')],
    [fr('{{p}}', '{{q}}')],
    [RAPPORT,
     '$$' + fr('{{f}}', '{{g}}') + ' = ' + fr('{{p}} ' + X + ' {{m}}', '{{q}} ' + X + ' {{m}}')
     + ' = ' + col('{{solution}}') + '$$',
     'Pour ${{q}}$ garçons, il y a ${{p}}$ filles.'],
    ['gcd(p,q)==1', 'p!=q', 'f+g>=12', 'f+g<=32'])

COMBIEN_DE_FOIS = variation(
    'On a $AB = {{a}}~\\unit{cm}$ et $CD = {{c}}~\\unit{cm}$.\n\nComplète.\n\n'
    '$$AB = ? ' + X + ' CD$$\n\n$$CD = ? ' + X + ' AB$$',
    [var('c', '2..9'), var('k', '2..6'), var('a', 'eval:c*k')],
    ['{{k}}', {'expectedAnswer': fr('1', '{{k}}'), 'acceptDecimal': True}],
    [RAPPORT,
     'Le rapport de $AB$ à $CD$ est $' + fr('{{a}}', '{{c}}') + ' = {{k}}$ : $AB = '
     + col('{{k}}') + ' ' + X + ' CD$.',
     'Le rapport de $CD$ à $AB$ est $' + fr('{{c}}', '{{a}}') + ' = ' + fr('1', '{{k}}')
     + '$ : $CD = ' + col(fr('1', '{{k}}')) + ' ' + X + ' AB$.'])

# k = 0 : A plus sucré ; k = 1 : B plus sucré ; k = 2 : aussi sucrés
SIROPS = variation(
    'On prépare deux mélanges de sirop et d\'eau :\n\n- mélange A : sirop et eau dans le ratio'
    ' $1 : {{m}}$ ;\n- mélange B : sirop et eau dans le ratio $2 : {{n}}$.\n\nQuel mélange est le'
    ' plus sucré ?'
    + choix(['le mélange A', 'le mélange B', 'ils sont aussi sucrés l\'un que l\'autre'],
            melanger=False),
    [var('k', '0..2'), var('m', '3..6'), var('d', '1..3'),
     var('n', 'eval:2*m+d*' + INDIC[0] + '-d*' + INDIC[1])],
    ['{{k}}'],
    ['**Ratio.** Un ratio $a : b$ se compare comme le rapport $\\dfrac{a}{b}$ : on ramène les deux'
     ' mélanges à **une** part de sirop.',
     'Mélange A : $1$ part de sirop pour ${{m}}$ parts d\'eau. Mélange B : $2$ parts de sirop pour'
     ' ${{n}}$ parts d\'eau, soit $1$ part de sirop pour $' + ev('n/2;d') + '$ parts d\'eau.',
     selon('k', [
         'Le mélange A a moins d\'eau pour la même quantité de sirop : '
         + col('\\text{le mélange A}').join(['$', '$']) + ' est le plus sucré.',
         'Le mélange B a moins d\'eau pour la même quantité de sirop : '
         + col('\\text{le mélange B}').join(['$', '$']) + ' est le plus sucré.',
         'Même quantité d\'eau pour la même quantité de sirop : '
         + col('\\text{ils sont aussi sucrés}').join(['$', '$']) + '.'])],
    ['n>=3'])

MODELES.append(modele(
    '01-comparer-avec-un-rapport', 'Comparer avec un rapport',
    'Comparer deux nombres ou deux grandeurs par leur rapport ou leur ratio : 12 filles pour'
    ' 18 garçons, rapport 2/3 ; AB = 3 × CD ; un mélange au ratio 1 : 4 ou 2 : 7 est-il plus sucré ?',
    'Proportionnalité', 'Ratios', 'Comparer', 1,
    [RAPPORT_FILLES, COMBIEN_DE_FOIS, SIROPS],
    [spec('12 filles, 18 garçons : 2/3', 0, {'p': 2, 'q': 3, 'm': 6, 'f': 12, 'g': 18},
          '\\frac{2}{3}', 'correct'),
     spec('12/18 non simplifié : ambre', 0, {'p': 2, 'q': 3, 'm': 6, 'f': 12, 'g': 18},
          '\\frac{12}{18}', 'unoptimal_form', ['reducedFractions']),
     spec('Erreur : rapport inversé 3/2', 0, {'p': 2, 'q': 3, 'm': 6, 'f': 12, 'g': 18},
          '\\frac{3}{2}', 'incorrect'),
     spec('AB = 15, CD = 5 : 3 et 1/3', 1, {'c': 5, 'k': 3, 'a': 15}, ['3', '\\frac{1}{3}'],
          'correct'),
     spec('AB = 8, CD = 2 : 4 et 0,25', 1, {'c': 2, 'k': 4, 'a': 8}, ['4', '0,25'], 'correct'),
     spec('Erreur : différence 10, et 3 dans les deux cases', 1, {'c': 5, 'k': 3, 'a': 15},
          ['10', '3'], 'incorrect'),
     spec('1 : 4 et 2 : 7 : B plus sucré', 2, {'k': 1, 'm': 4, 'd': 1, 'n': 7}, '1', 'correct'),
     spec('Erreur : A (7 > 4, plus d\'eau dans B)', 2, {'k': 1, 'm': 4, 'd': 1, 'n': 7}, '0',
          'incorrect'),
     spec('1 : 3 et 2 : 8 : A plus sucré', 2, {'k': 0, 'm': 3, 'd': 2, 'n': 8}, '0', 'correct'),
     spec('1 : 5 et 2 : 10 : aussi sucrés', 2, {'k': 2, 'm': 5, 'd': 1, 'n': 10}, '2', 'correct'),
     spec('Erreur : 1 : 5 et 2 : 10, B', 2, {'k': 2, 'm': 5, 'd': 1, 'n': 10}, '1', 'incorrect')],
    delay=45))

# --- 2. 4-054 : égalités de rapports -------------------------------------------------------

EGALITE = ('**Proportionnalité.** Des nombres sont proportionnels à d\'autres quand leurs rapports'
           ' sont égaux : chaque quotient vaut le même nombre.')

DEUX_RAPPORTS = variation(
    'Les nombres $x$ et $y$ vérifient $' + fr('x', '{{p}}') + ' = ' + fr('y', '{{q}}') + '$.\n\n'
    'On sait que $x = {{x}}$. Que vaut $y$ ?\n\n$$y = ?$$',
    [var('p', '2..5'), var('q', '2..9'), var('k', '2..9'), var('x', 'eval:p*k')],
    ['{{eval:q*k}}'],
    [EGALITE,
     '$' + fr('{{x}}', '{{p}}') + ' = {{k}}$, donc $' + fr('y', '{{q}}') + ' = {{k}}$.',
     '$$y = {{q}} ' + X + ' {{k}} = ' + col('{{solution}}') + '$$'],
    ['p!=q'])

TROIS_RAPPORTS = variation(
    'Les nombres $a$, $b$ et $c$ vérifient $' + fr('a', '{{p}}') + ' = ' + fr('b', '{{q}}') + ' = '
    + fr('c', '{{r}}') + '$ : ils sont dans le ratio ${{p}} : {{q}} : {{r}}$.\n\n'
    'On sait que $a = {{a}}$. Que vaut $c$ ?\n\n$$c = ?$$',
    [var('p', '2..5'), var('q', '2..9'), var('r', '2..9'), var('k', '2..9'),
     var('a', 'eval:p*k')],
    ['{{eval:r*k}}'],
    [EGALITE,
     '$' + fr('{{a}}', '{{p}}') + ' = {{k}}$ : chaque rapport vaut ${{k}}$, donc $'
     + fr('c', '{{r}}') + ' = {{k}}$.',
     '$$c = {{r}} ' + X + ' {{k}} = ' + col('{{solution}}') + '$$'],
    ['p!=q', 'q!=r', 'p!=r', 'gcd(gcd(p,q),r)==1'])

# o = 0 : proportionnels (×k) ; o = 1 : même écart (+k), le piège additif
DANS_LE_RATIO = variation(
    'Les nombres ${{A}}$, ${{B}}$ et ${{C}}$ sont-ils dans le ratio ${{p}} : {{q}} : {{r}}$ ?'
    + choix(['oui', 'non'], melanger=False),
    [var('o', '0..1'), var('p', '2..5'), var('q', '2..9'), var('r', '2..9'), var('k', '2..6'),
     var('A', 'eval:(1-o)*p*k+o*(p+k)'), var('B', 'eval:(1-o)*q*k+o*(q+k)'),
     var('C', 'eval:(1-o)*r*k+o*(r+k)')],
    ['{{o}}'],
    [EGALITE,
     '{{if:o==0|$' + fr('{{A}}', '{{p}}') + ' = ' + fr('{{B}}', '{{q}}') + ' = '
     + fr('{{C}}', '{{r}}') + ' = {{k}}$ : les trois rapports sont égaux, '
     + col('\\text{oui}').join(['$', '$']) + '.|On compare $' + fr('{{A}}', '{{p}}') + '$ et $'
     + fr('{{B}}', '{{q}}') + '$ par les produits en croix : ${{A}} ' + X + ' {{q}} = '
     + ev('A*q') + '$ et ${{B}} ' + X + ' {{p}} = ' + ev('B*p') + '$. Les rapports ne sont pas'
     + ' égaux : ' + col('\\text{non}').join(['$', '$']) + '. Ajouter le même nombre à chacun'
     + ' ne conserve pas les rapports.}}'],
    ['p<q', 'q<r', 'gcd(gcd(p,q),r)==1'])

MODELES.append(modele(
    '02-egalites-de-rapports', 'Égalités de rapports',
    'Exprimer la proportionnalité par des égalités de rapports ou un ratio : x/2 = y/3 ;'
    ' a/2 = b/3 = c/7 ; 6, 9 et 21 sont-ils dans le ratio 2 : 3 : 7 ?',
    'Proportionnalité', 'Ratios', 'Égalités de rapports', 1,
    [DEUX_RAPPORTS, TROIS_RAPPORTS, DANS_LE_RATIO],
    [spec('x/2 = y/3, x = 10 : y = 15', 0, {'p': 2, 'q': 3, 'k': 5, 'x': 10}, '15', 'correct'),
     spec('Erreur : additif 10 + 1 = 11', 0, {'p': 2, 'q': 3, 'k': 5, 'x': 10}, '11', 'incorrect'),
     spec('a/2 = b/3 = c/7, a = 8 : c = 28', 1, {'p': 2, 'q': 3, 'r': 7, 'k': 4, 'a': 8}, '28',
          'correct'),
     spec('Erreur : additif 8 + 5 = 13', 1, {'p': 2, 'q': 3, 'r': 7, 'k': 4, 'a': 8}, '13',
          'incorrect'),
     spec('6, 9, 21 dans le ratio 2 : 3 : 7 : oui', 2,
          {'o': 0, 'p': 2, 'q': 3, 'r': 7, 'k': 3, 'A': 6, 'B': 9, 'C': 21}, '0', 'correct'),
     spec('5, 6, 10 (même écart) : non', 2,
          {'o': 1, 'p': 2, 'q': 3, 'r': 7, 'k': 3, 'A': 5, 'B': 6, 'C': 10}, '1', 'correct'),
     spec('Erreur : 5, 6, 10 « oui »', 2,
          {'o': 1, 'p': 2, 'q': 3, 'r': 7, 'k': 3, 'A': 5, 'B': 6, 'C': 10}, '0', 'incorrect')]))

# --- 3. 4-056 : calculer avec des pourcentages ---------------------------------------------

POURCENT = ('**Pourcentage.** Prendre $t~\\%$ d\'un nombre, c\'est le multiplier par'
            ' $\\dfrac{t}{100}$.')

UN_POURCENT = variation(
    'Calcule $1~\\%$ de ${{c}}$.\n\n$1~\\%$ de ${{c}}$ est égal à $?$.',
    [var('c', '120..9999')],
    [ev('c/100;d')],
    [POURCENT,
     '$1~\\%$ de ${{c}}$, c\'est ${{c}} \\div 100$.',
     '$$' + fr('1', '100') + ' ' + X + ' {{c}} = ' + col('{{solution}}') + '$$'],
    ['mod(c,100)!=0'])

T_POURCENT = variation(
    'Calcule ${{t}}~\\%$ de ${{c}}$.\n\n${{t}}~\\%$ de ${{c}}$ est égal à $?$.',
    [var('t', '5|15|30|35|45|60'), var('j', '2..15'), var('c', 'eval:20*j')],
    ['{{eval:t*c/100}}'],
    [POURCENT,
     '$1~\\%$ de ${{c}}$ vaut $' + ev('c/100;d') + '$.',
     '$$' + fr('{{t}}', '100') + ' ' + X + ' {{c}} = {{t}} ' + X + ' ' + ev('c/100;d') + ' = '
     + col('{{solution}}') + '$$'])

LE_TOUT = variation(
    '${{t}}~\\%$ d\'un nombre valent ${{v}}$.\n\nQuel est ce nombre ?\n\n$$?$$',
    [var('t', '10|20|25|50'), var('v', '3..40')],
    ['{{eval:v*100/t}}'],
    [POURCENT,
     '${{t}}~\\%$, c\'est $' + fr('1', ev('100/t')) + '$ du nombre : il faut $' + ev('100/t')
     + '$ fois ${{v}}$ pour avoir le tout.',
     '$$' + ev('100/t') + ' ' + X + ' {{v}} = ' + col('{{solution}}') + '$$',
     'Vérification : ${{t}}~\\%$ de ${{solution}}$ font bien ${{v}}$.'])

MODELES.append(modele(
    '03-calculer-avec-des-pourcentages', 'Calculer avec des pourcentages',
    'Calculer avec des pourcentages : 1 % de 4 537 ; 35 % de 120 ; 20 % d\'un nombre valent 30,'
    ' quel est ce nombre ?',
    'Proportionnalité', 'Pourcentages', 'Calculer', 7,
    [UN_POURCENT, T_POURCENT, LE_TOUT],
    [spec('1 % de 4 537 = 45,37', 0, {'c': 4537}, '45,37', 'correct'),
     spec('Erreur : 453,7 (÷ 10)', 0, {'c': 4537}, '453,7', 'incorrect'),
     spec('35 % de 120 = 42', 1, {'t': 35, 'j': 6, 'c': 120}, '42', 'correct'),
     spec('Erreur : 120 − 35 = 85', 1, {'t': 35, 'j': 6, 'c': 120}, '85', 'incorrect'),
     spec('20 % d\'un nombre = 30 : 150', 2, {'t': 20, 'v': 30}, '150', 'correct'),
     spec('Erreur : 20 % de 30 = 6', 2, {'t': 20, 'v': 30}, '6', 'incorrect'),
     spec('Erreur : 30 + 20 = 50', 2, {'t': 20, 'v': 30}, '50', 'incorrect')],
    delay=45))

# --- 4. 4-058 : le coefficient multiplicateur ----------------------------------------------

COEFFICIENT = ('**Coefficient multiplicateur.** C\'est le nombre par lequel on multiplie la'
               ' valeur de départ pour obtenir la valeur d\'arrivée :'
               ' $\\text{coefficient} = \\dfrac{\\text{valeur d\'arrivée}}{\\text{valeur de'
               ' départ}}$.')


def passe_de(sens, valeurs):
    return variation(
        'Le prix d\'un article passe de ' + euros('{{a}}') + ' à ' + euros('{{b}}') + '.\n\n'
        'Par quel nombre le prix a-t-il été multiplié ?\n\n$$?$$',
        [var('K', valeurs), var('j', '2..12'), var('a', 'eval:20*j'), var('b', 'eval:a*K/100')],
        [ev('K/100;d')],
        [COEFFICIENT,
         '$$' + fr('{{b}}', '{{a}}') + ' = ' + col('{{solution}}') + '$$',
         'Vérification : ${{a}} ' + X + ' {{solution}} = {{b}}$. Le coefficient est ' + sens
         + ' $1$ : le prix a ' + ('augmenté' if sens == 'plus grand que' else 'baissé') + '.'])


HAUSSE = passe_de('plus grand que', '110|120|125|150|200')
BAISSE = passe_de('plus petit que', '50|60|75|80|90')

# k = 0 : augmentation ; k = 1 : diminution ; k = 2 : ni l'un ni l'autre (coefficient 1)
SENS = variation(
    'Multiplier un prix par ${{x}}$, c\'est :'
    + choix(['une augmentation', 'une diminution', 'ni l\'un ni l\'autre'], melanger=False),
    [var('k', '0..2'), var('u', '1..18'),
     var('x', 'eval:1+5*u*' + INDIC[0] + '/100-5*u*' + INDIC[1] + '/100;d')],
    ['{{k}}'],
    [COEFFICIENT,
     selon('k', [
         '${{x}} > 1$ : le prix grandit, c\'est ' + col('\\text{une augmentation}').join(['$', '$'])
         + '.',
         '${{x}} < 1$ : le prix diminue, c\'est ' + col('\\text{une diminution}').join(['$', '$'])
         + '.',
         'Multiplier par $1$ ne change rien : ' + col('\\text{ni l\'un ni l\'autre}')
         .join(['$', '$']) + '.'])])

MODELES.append(modele(
    '04-le-coefficient-multiplicateur', 'Le coefficient multiplicateur',
    'Définir le coefficient multiplicateur (arrivée ÷ départ) : de 80 € à 100 €, × 1,25 ; de 80 €'
    ' à 60 €, × 0,75 ; multiplier par 0,9 est une diminution',
    'Proportionnalité', 'Pourcentages', 'Coefficient', 1,
    [HAUSSE, BAISSE, SENS],
    [spec('80 € → 100 € : 1,25', 0, {'K': 125, 'j': 4, 'a': 80, 'b': 100}, '1,25', 'correct'),
     spec('Erreur : 80/100 = 0,8', 0, {'K': 125, 'j': 4, 'a': 80, 'b': 100}, '0,8', 'incorrect'),
     spec('Erreur : la hausse, 20', 0, {'K': 125, 'j': 4, 'a': 80, 'b': 100}, '20', 'incorrect'),
     spec('80 € → 60 € : 0,75', 1, {'K': 75, 'j': 4, 'a': 80, 'b': 60}, '0,75', 'correct'),
     spec('Erreur : 80/60 inversé', 1, {'K': 75, 'j': 4, 'a': 80, 'b': 60}, '\\frac{4}{3}',
          'incorrect'),
     spec('× 1,15 : augmentation', 2, {'k': 0, 'u': 3, 'x': '1.15'}, '0', 'correct'),
     spec('× 0,9 : diminution', 2, {'k': 1, 'u': 2, 'x': '0.9'}, '1', 'correct'),
     spec('Erreur : × 0,9 « augmentation »', 2, {'k': 1, 'u': 2, 'x': '0.9'}, '0', 'incorrect'),
     spec('× 1 : ni l\'un ni l\'autre', 2, {'k': 2, 'u': 2, 'x': '1'}, '2', 'correct')]))

# --- 5 et 6. 4-057, 4-080 : augmentation, diminution et coefficient -------------------------


def evolution(hausse):
    verbe, signe, op = ('augmenter', '+', '+') if hausse else ('diminuer', '-', '-')
    regle = ('**Coefficient multiplicateur.** ' + verbe.capitalize() + ' de $t~\\%$, c\'est'
             ' multiplier par $1 ' + signe + ' \\dfrac{t}{100}$.')
    taux = '5|7|10|15|20|25|40|50|100' if hausse else '5|10|15|20|25|30|40|50|75'
    coef = ev('1' + op + 't/100;d')

    taux_vers_coef = variation(
        verbe.capitalize() + ' une quantité de ${{t}}~\\%$, c\'est la multiplier par :\n\n$$?$$',
        [var('t', taux)],
        [coef],
        [regle,
         '$$1 ' + signe + ' ' + fr('{{t}}', '100') + ' = 1 ' + signe + ' ' + ev('t/100;d') + ' = '
         + col('{{solution}}') + '$$'])

    nouveau_prix = variation(
        'Un article coûte ' + euros('{{P}}') + '. Son prix ' + ('augmente' if hausse else 'baisse')
        + ' de ${{t}}~\\%$.\n\nCalcule le nouveau prix à l\'aide du coefficient multiplicateur.'
        + EUROS,
        [var('t', '10|20|30|5|15|25'), var('j', '2..30'), var('P', 'eval:10*j')],
        [ev('P*(1' + op + 't/100);d')],
        [regle,
         'Le coefficient multiplicateur est $1 ' + signe + ' ' + fr('{{t}}', '100') + ' = '
         + coef + '$.',
         '$${{P}} ' + X + ' ' + coef + ' = ' + col('{{solution}}') + '$$'])

    coef_vers_taux = variation(
        'Multiplier une quantité par ${{x}}$, c\'est ' + ('l\'' if hausse else 'la ') + verbe
        + ' de :\n\n$$?~\\%$$',
        [var('K', '103|108|112|115|125|135|140|160' if hausse else '97|92|85|80|75|65|60|40'),
         var('x', 'eval:K/100;d')],
        [ev('K-100' if hausse else '100-K')],
        [regle,
         '$${{x}} = 1 ' + signe + ' ' + ev(('(K-100)' if hausse else '(100-K)') + '/100;d') + ' = 1 '
         + signe + ' ' + fr(col('{{solution}}'), '100') + '$$',
         'C\'est ' + ('une augmentation' if hausse else 'une diminution') + ' de '
         + col('{{solution}}~\\%').join(['$', '$']) + '.'])

    return regle, [taux_vers_coef, nouveau_prix, coef_vers_taux]


_, AUGMENTATION = evolution(True)
MODELES.append(modele(
    '05-augmentation-et-coefficient', 'Augmentation et coefficient multiplicateur',
    'Traduire une augmentation de t % par le coefficient 1 + t/100 : + 15 % → × 1,15 ; 120 €'
    ' augmenté de 20 % ; × 1,35 → + 35 %',
    'Proportionnalité', 'Pourcentages', 'Coefficient', 2,
    AUGMENTATION,
    [spec('+ 15 % → × 1,15', 0, {'t': 15}, '1,15', 'correct'),
     spec('Erreur : 0,15', 0, {'t': 15}, '0,15', 'incorrect'),
     spec('+ 5 % → × 1,05', 0, {'t': 5}, '1,05', 'correct'),
     spec('Erreur : + 5 % → 1,5', 0, {'t': 5}, '1,5', 'incorrect'),
     spec('+ 100 % → × 2', 0, {'t': 100}, '2', 'correct'),
     spec('120 € + 20 % = 144 €', 1, {'t': 20, 'j': 12, 'P': 120}, '144', 'correct'),
     spec('Erreur : 120 × 0,2 = 24 (la hausse seule)', 1, {'t': 20, 'j': 12, 'P': 120}, '24',
          'incorrect'),
     spec('Erreur : 120 + 20 = 140', 1, {'t': 20, 'j': 12, 'P': 120}, '140', 'incorrect'),
     spec('× 1,35 → + 35 %', 2, {'K': 135, 'x': '1.35'}, '35', 'correct'),
     spec('Erreur : 135', 2, {'K': 135, 'x': '1.35'}, '135', 'incorrect'),
     spec('× 1,08 → + 8 %', 2, {'K': 108, 'x': '1.08'}, '8', 'correct'),
     spec('Erreur : × 1,08 → 80', 2, {'K': 108, 'x': '1.08'}, '80', 'incorrect')]))

_, DIMINUTION = evolution(False)
MODELES.append(modele(
    '06-diminution-et-coefficient', 'Diminution et coefficient multiplicateur',
    'Traduire une diminution de t % par le coefficient 1 − t/100 : − 20 % → × 0,8 ; 120 € diminué'
    ' de 20 % ; × 0,85 → − 15 %',
    'Proportionnalité', 'Pourcentages', 'Coefficient', 3,
    DIMINUTION,
    [spec('− 20 % → × 0,8', 0, {'t': 20}, '0,8', 'correct'),
     spec('Erreur : 1,2', 0, {'t': 20}, '1,2', 'incorrect'),
     spec('Erreur : 0,2', 0, {'t': 20}, '0,2', 'incorrect'),
     spec('− 5 % → × 0,95', 0, {'t': 5}, '0,95', 'correct'),
     spec('Erreur : − 5 % → 0,5', 0, {'t': 5}, '0,5', 'incorrect'),
     spec('120 € − 20 % = 96 €', 1, {'t': 20, 'j': 12, 'P': 120}, '96', 'correct'),
     spec('Erreur : 120 × 0,2 = 24', 1, {'t': 20, 'j': 12, 'P': 120}, '24', 'incorrect'),
     spec('× 0,85 → − 15 %', 2, {'K': 85, 'x': '0.85'}, '15', 'correct'),
     spec('Erreur : 85', 2, {'K': 85, 'x': '0.85'}, '85', 'incorrect'),
     spec('× 0,6 → − 40 %', 2, {'K': 60, 'x': '0.6'}, '40', 'correct'),
     spec('Erreur : × 0,6 → 60', 2, {'K': 60, 'x': '0.6'}, '60', 'incorrect')]))

# --- 7. 4-059 : partage proportionnel ------------------------------------------------------

PARTAGE = ('**Partage proportionnel.** Partager dans le ratio $a : b$, c\'est faire $a + b$ parts'
           ' égales : le premier en reçoit $a$, le second $b$.')

DEUX_PARTS = variation(
    'Inès et Tom se partagent ' + euros('{{N}}') + ' dans le ratio ${{a}} : {{b}}$.\n\n'
    'Quelle est la part d\'Inès ?' + EUROS,
    [var('a', '2..11'), var('b', '2..11'), var('u', '2..20'), var('N', 'eval:(a+b)*u')],
    ['{{eval:a*u}}'],
    [PARTAGE,
     'Il y a ${{a}} + {{b}} = ' + ev('a+b') + '$ parts. Une part vaut ${{N}} \\div ' + ev('a+b')
     + ' = {{u}}~\\unit{€}$.',
     'Inès reçoit ${{a}}$ parts : $${{a}} ' + X + ' {{u}} = ' + col('{{solution}}') + '~\\unit{€}$$'],
    ['a!=b', 'gcd(a,b)==1'])

PRENOMS = ['Ali', 'Béa', 'Chloé']
TROIS_PARTS = variation(
    'Ali, Béa et Chloé se partagent ' + euros('{{N}}') + ' dans le ratio ${{a}} : {{b}} : {{c}}$'
    ' (dans cet ordre).\n\nQuelle est la part de ' + selon('k', PRENOMS) + ' ?' + EUROS,
    [var('k', '0..2'), var('a', '2..6'), var('b', '2..6'), var('c', '2..6'), var('u', '2..15'),
     var('N', 'eval:(a+b+c)*u'),
     var('n', 'eval:a*' + INDIC[0] + '+b*' + INDIC[1] + '+c*' + INDIC[2])],
    ['{{eval:n*u}}'],
    [PARTAGE,
     'Il y a ${{a}} + {{b}} + {{c}} = ' + ev('a+b+c') + '$ parts. Une part vaut ${{N}} \\div '
     + ev('a+b+c') + ' = {{u}}~\\unit{€}$.',
     selon('k', PRENOMS) + ' reçoit ${{n}}$ parts : $${{n}} ' + X + ' {{u}} = '
     + col('{{solution}}') + '~\\unit{€}$$'],
    ['a!=b', 'b!=c', 'a!=c'])

MISES = variation(
    'Lina a versé ' + euros('{{m}}') + ' et Noé ' + euros('{{p}}') + ' pour acheter un billet de'
    ' tombola. Ils gagnent ' + euros('{{G}}') + ' et se partagent le gain proportionnellement à'
    ' leurs mises.\n\nQuelle est la part de Lina ?' + EUROS,
    # gain plus grand que les mises (u > 10) ; au moins 2 parts chacun
    [var('a', '2..5'), var('b', '2..5'), var('u', '11..40'), var('m', 'eval:10*a'),
     var('p', 'eval:10*b'), var('G', 'eval:(a+b)*u')],
    ['{{eval:a*u}}'],
    ['**Partage proportionnel.** Les parts sont proportionnelles aux mises ${{m}}$ et ${{p}}$,'
     ' c\'est-à-dire au ratio ${{a}} : {{b}}$.',
     'Il y a ${{a}} + {{b}} = ' + ev('a+b') + '$ parts. Une part vaut ${{G}} \\div ' + ev('a+b')
     + ' = {{u}}~\\unit{€}$.',
     'Lina reçoit ${{a}}$ parts : $${{a}} ' + X + ' {{u}} = ' + col('{{solution}}')
     + '~\\unit{€}$$'],
    ['a!=b', 'gcd(a,b)==1'])

MODELES.append(modele(
    '07-partage-proportionnel', 'Partage proportionnel',
    'Partager une quantité en parts proportionnelles : 80 € dans le ratio 5 : 11 ; 90 € dans le'
    ' ratio 4 : 3 : 2 ; un gain partagé proportionnellement aux mises',
    'Proportionnalité', 'Ratios', 'Partage proportionnel', 1,
    [DEUX_PARTS, TROIS_PARTS, MISES],
    [spec('80 € dans le ratio 5 : 11 : 25 €', 0, {'a': 5, 'b': 11, 'u': 5, 'N': 80}, '25',
          'correct'),
     spec('Erreur : partage égal 40', 0, {'a': 5, 'b': 11, 'u': 5, 'N': 80}, '40', 'incorrect'),
     spec('Erreur : 80 ÷ 5 = 16', 0, {'a': 5, 'b': 11, 'u': 5, 'N': 80}, '16', 'incorrect'),
     spec('90 € dans le ratio 4 : 3 : 2, Béa : 30 €', 1,
          {'k': 1, 'a': 4, 'b': 3, 'c': 2, 'u': 10, 'N': 90, 'n': 3}, '30', 'correct'),
     spec('Erreur : la part de Béa (30) pour Chloé', 1,
          {'k': 2, 'a': 4, 'b': 3, 'c': 2, 'u': 10, 'N': 90, 'n': 2}, '30', 'incorrect'),
     spec('90 € dans le ratio 4 : 3 : 2, Chloé : 20 €', 1,
          {'k': 2, 'a': 4, 'b': 3, 'c': 2, 'u': 10, 'N': 90, 'n': 2}, '20', 'correct'),
     spec('Mises 30 € et 50 €, gain 120 € : Lina 45 €', 2,
          {'a': 3, 'b': 5, 'u': 15, 'm': 30, 'p': 50, 'G': 120}, '45', 'correct'),
     spec('Erreur : partage égal 60', 2,
          {'a': 3, 'b': 5, 'u': 15, 'm': 30, 'p': 50, 'G': 120}, '60', 'incorrect')],
    delay=60))

os.makedirs(DOSSIER, exist_ok=True)
for nom, m in MODELES:
    with open(os.path.join(DOSSIER, nom + '.json'), 'w', encoding='utf-8') as f:
        json.dump(m, f, ensure_ascii=False, indent='\t')
        f.write('\n')
# Mis en forme comme le pre-commit, pour que le script redonne les fichiers commités
subprocess.run(['pnpm', 'exec', 'prettier', '--write', DOSSIER], check=True,
               stdout=subprocess.DEVNULL)
print(f'{len(MODELES)} modèles écrits dans {DOSSIER}')
