"""Écrit les 6 modèles du lot 7 B « Tableaux de signes, résolutions » de la 2de dans
scripts/questions/2de-signes-b/.

Phase 0 validée par David le 2026-11-01 (§ 44 du journal `docs/wip/questions-2de-progress.md`).
Bornes : `bornes/lycee/2de.json` (2-330, 2-446, 2-337, 2-449, 2-450, 2-451). Un point par modèle ;
le nœud et le tag sont posés par la migration de rangement, après le `--publier` de David.

Décisions et pièges :
- Q4 / L7-b : cases SOUS le tableau ; un signe = case choix « strictement positif / négatif » ;
- facteurs affines seulement (pas de trinôme non factorisé), racines entières non nulles
  (un `{{b;+}}` nul écrirait « +0 » dans le tableau, que rien ne nettoie) ;
- l'ordre des racines est fixé PAR VARIATION (conditions `ra < rb` / `ra > rb`) : chaque ligne du
  tableau est découpée aux deux valeurs, une ligne ne s'étend jamais au-delà d'une valeur ;
- valeur interdite : `||` (double barre) dans la ligne du quotient ;
- quotient écrit à la main (`\\dfrac`, coefficient par `coef`) : la formule maison garderait les
  parenthèses dans la fraction et `cleanCoefficients` ne lit pas le LaTeX (lot 7 A, § 45) ;
- jamais de `{{if:…}}` imbriqué : une variation par sens d'inégalité et par ordre des racines ;
- variables `e` et `i` interdites.

    python3 docs/wip/questions-2de/lot-signes-b-2de.py scripts/questions/2de-signes-b
"""
import json
import os
import subprocess
import sys

DOSSIER = sys.argv[1]
CATEGORIE = ('Calcul littéral', 'Inéquations', 'Produit et quotient')


def spec(desc, vi, variables, answers, status):
    return {'description': desc, 'variationIndex': vi,
            'variables': {k: str(v) for k, v in variables.items()},
            'answers': answers if isinstance(answers, list) else [answers],
            'expected': {'status': status}}


def modele(nom, title, description, level, variations, specs, delay=90):
    m = {'title': title, 'description': description, 'grades': ['2'], 'theme': CATEGORIE[0],
         'domain': CATEGORIE[1], 'subdomain': CATEGORIE[2], 'level': level, 'delay': delay,
         'status': 'draft',
         'shared': {'cleanCoefficients': True, 'blankDefaults': {'acceptDecimal': True}},
         'variations': variations, 'testSpecs': specs}
    return nom, m


def var(nom, expression):
    return {'name': nom, 'expression': expression}


def variation(statement, variables, blanks, steps, conditions=None):
    v = {'statement': statement, 'variables': variables}
    if conditions:
        v['conditions'] = conditions
    v['blanks'] = blanks
    v['correction'] = {'steps': steps}
    return v


def case(attendu):
    return {'expectedAnswer': attendu}


def case_ens(attendu):
    return {'expectedAnswer': attendu, 'answerKind': 'intervalles'}


def col(x, k=0):
    return '\\textcolor{{{color:primary.' + str(k) + '}}}{' + x + '}'


def choix(question, options, melanger=False):
    entete = '' if melanger else 'melanger: non\n'
    return question + '\n\n```choix\n' + entete + ''.join('- ' + o + '\n' for o in options) + '```'


def coef(v):
    """Coefficient de x écrit à la main (rien ne le nettoie hors formule maison) : 1 → rien, −1 → −."""
    return '{{if:' + v + '==-1|-|}}{{if:' + v + '*' + v + '>1|{{' + v + '}}|}}'


PLUS_MOINS = ['strictement positif', 'strictement négatif']

# Facteurs ax + b (racine ra) et cx + d (racine rb), racines entières non nulles et distinctes
FACTEURS = [var('a', '1..3;±'), var('ra', '-6..6!0'), var('b', 'eval:-(a)*(ra)'),
            var('c', '1..3;±'), var('rb', '-6..6!0'), var('d', 'eval:-(c)*(rb)'),
            var('ac', 'eval:(a)*(c)')]
F1 = '{{a}}x{{b;+}}'          # formule maison (nettoyée)
F2 = '{{c}}x{{d;+}}'
L1 = coef('a') + 'x{{b;+}}'   # étiquette de ligne du tableau (écrite à la main)
L2 = coef('c') + 'x{{d;+}}'
PRODUIT = '$A(x)=(' + F1 + ')(' + F2 + ')$'
QUOTIENT = '$B(x)=\\dfrac{ ' + L1 + ' }{ ' + L2 + ' }$'

# Signe d'un facteur de coefficient `v` : à gauche de sa racine, à droite
GAUCHE = '{{if:%s>0|-|+}}'
DROITE = '{{if:%s>0|+|-}}'
# Signe du produit (ou du quotient) sur les trois intervalles : celui de ac, −, celui de ac
EXT = '{{if:ac>0|+|-}}'
MIL = '{{if:ac>0|-|+}}'
# Réponse « strictement positif » (0) / « strictement négatif » (1)
REP_EXT = '{{if:ac>0|0|1}}'
REP_MIL = '{{if:ac>0|1|0}}'


def ligne(label, x1, x2, entrees):
    """Ligne d'un tableau à deux valeurs x1 < x2 : `entrees` = 5 cases (intervalle, x1, intervalle,
    x2, intervalle) ; une case de valeur vide (None) n'est pas écrite."""
    s = ['sign: ' + label,
         '  -inf,' + x1 + ': ' + entrees[0]]
    if entrees[1]:
        s.append('  ' + x1 + ': ' + entrees[1])
    s.append('  ' + x1 + ',' + x2 + ': ' + entrees[2])
    if entrees[3]:
        s.append('  ' + x2 + ': ' + entrees[3])
    s.append('  ' + x2 + ',+inf: ' + entrees[4])
    return s


def ligne_facteur(label, v, x1, x2, rang, marque='z'):
    """Facteur de coefficient `v`, nul (ou interdit) en x1 (rang 1) ou en x2 (rang 2)."""
    g, d = GAUCHE % v, DROITE % v
    if rang == 1:
        return ligne(label, x1, x2, [g, marque, d, None, d])
    return ligne(label, x1, x2, [g, None, g, marque, d])


def tableau(x1, x2, lignes):
    out = ['```variation', 'variable: x', 'domain: -inf, ' + x1 + ', ' + x2 + ', +inf']
    for l in lignes:
        out += [''] + l
    return '\n'.join(out + ['```'])


def tableau_produit(x1, x2, ordre, avec_resultat=True, label1=L1, v1='a'):
    """Tableau de A(x) = F1 × F2 ; ordre = 'ab' si ra < rb, 'ba' sinon."""
    r1, r2 = (1, 2) if ordre == 'ab' else (2, 1)
    lignes = [ligne_facteur(label1, v1, x1, x2, r1), ligne_facteur(L2, 'c', x1, x2, r2)]
    if avec_resultat:
        lignes.append(ligne('A(x)', x1, x2, [EXT, 'z', MIL, 'z', EXT]))
    return tableau(x1, x2, lignes)


def tableau_quotient(x1, x2, ordre, avec_resultat=True):
    """Tableau de B(x) = F1 / F2 ; ordre = 'ab' si ra < rb (zéro avant la valeur interdite)."""
    r1, r2 = (1, 2) if ordre == 'ab' else (2, 1)
    m1, m2 = ('z', '||') if ordre == 'ab' else ('||', 'z')
    lignes = [ligne_facteur(L1, 'a', x1, x2, r1), ligne_facteur(L2, 'c', x1, x2, r2)]
    if avec_resultat:
        lignes.append(ligne('B(x)', x1, x2, [EXT, m1, MIL, m2, EXT]))
    return tableau(x1, x2, lignes)


def bornes(ordre):
    return ('{{ra}}', '{{rb}}') if ordre == 'ab' else ('{{rb}}', '{{ra}}')


def cond(ordre):
    return ['ra < rb'] if ordre == 'ab' else ['ra > rb']


REGLE = ('Dans chaque colonne, on applique la **règle des signes** : deux signes identiques donnent $+$, deux'
         ' signes contraires donnent $-$.')
FACTEUR_STEP = ('Chaque facteur $mx+p$ s\'annule en $-\\dfrac{p}{m}$ ; il est du signe de $m$ à droite de cette'
                ' valeur, du signe contraire à gauche.')

MODELES = []

# =============================================================================================
# 1. 2-330 : tableau de signes d'un produit
# =============================================================================================

SIGNES_SYMBOLIQUES = ('\n\nOn range ces deux valeurs dans l\'ordre croissant : $x_1<x_2$.\n\n'
                      + choix('Pour $x<x_1$, $A(x)$ est :', PLUS_MOINS) + '\n\n'
                      + choix('Pour $x_1<x<x_2$, $A(x)$ est :', PLUS_MOINS) + '\n\n'
                      + choix('Pour $x>x_2$, $A(x)$ est :', PLUS_MOINS))


def produit_construire(ordre):
    x1, x2 = bornes(ordre)
    return variation(
        'On veut dresser le tableau de signes de ' + PRODUIT + '.\n\nQuelles valeurs de $x$ annulent $A(x)$ ?'
        ' Donne-les dans l\'ordre croissant.\n\n$x_1=?$\n\n$x_2=?$' + SIGNES_SYMBOLIQUES,
        FACTEURS,
        [case(x1), case(x2), case(REP_EXT), case(REP_MIL), case(REP_EXT)],
        [FACTEUR_STEP, '$' + F1 + '=0\\iff x={{ra}}$ et $' + F2 + '=0\\iff x={{rb}}$ : $x_1=' + col(x1, 1)
         + '$, $x_2=' + col(x2, 1) + '$.', REGLE, tableau_produit(x1, x2, ordre)],
        cond(ordre))


PRODUIT_LIRE = variation(
    'Voici les signes des deux facteurs de ' + PRODUIT + '.\n\n'
    + tableau_produit('{{ra}}', '{{rb}}', 'ab', avec_resultat=False) + '\n\n'
    + choix('Sur $\\left]-\\infty\\,;{{ra}}\\right[$, $A(x)$ est :', PLUS_MOINS) + '\n\n'
    + choix('Sur $\\left]{{ra}}\\,;{{rb}}\\right[$, $A(x)$ est :', PLUS_MOINS) + '\n\n'
    + choix('Sur $\\left]{{rb}}\\,;+\\infty\\right[$, $A(x)$ est :', PLUS_MOINS),
    FACTEURS,
    [case(REP_EXT), case(REP_MIL), case(REP_EXT)],
    [REGLE, tableau_produit('{{ra}}', '{{rb}}', 'ab')],
    ['ra < rb'])

# k(ax + b) : un seul zéro
PRODUIT_CONSTANTE = variation(
    'On veut dresser le tableau de signes de $A(x)={{k}}(' + F1 + ')$.\n\nPour quelle valeur de $x$ a-t-on'
    ' $A(x)=0$ ?\n\n$x=?$\n\n'
    + choix('Pour $x<{{ra}}$, $A(x)$ est :', PLUS_MOINS) + '\n\n'
    + choix('Pour $x>{{ra}}$, $A(x)$ est :', PLUS_MOINS),
    [var('k', '2..5;±'), var('a', '1..3;±'), var('ra', '-6..6!0'), var('b', 'eval:-(a)*(ra)'),
     var('ka', 'eval:(k)*(a)')],
    [case('{{ra}}'), case('{{if:ka>0|1|0}}'), case('{{if:ka>0|0|1}}')],
    ['${{k}}$ est une constante {{if:k>0|positive|négative}} : elle ne s\'annule pas, mais elle compte dans la'
     ' règle des signes.',
     '$' + F1 + '=0\\iff x=' + col('{{ra}}', 1) + '$.',
     ''])  # tableau à une valeur, posé ci-dessous
PRODUIT_CONSTANTE['correction']['steps'][2] = '\n'.join([
    '```variation', 'variable: x', 'domain: -inf, {{ra}}, +inf', '',
    'sign: {{k}}', '  -inf,{{ra}}: {{if:k>0|+|-}}', '  {{ra}},+inf: {{if:k>0|+|-}}', '',
    'sign: ' + L1, '  -inf,{{ra}}: ' + GAUCHE % 'a', '  {{ra}}: z', '  {{ra}},+inf: ' + DROITE % 'a', '',
    'sign: A(x)', '  -inf,{{ra}}: {{if:ka>0|-|+}}', '  {{ra}}: z', '  {{ra}},+inf: {{if:ka>0|+|-}}', '```'])


# x(cx + d) : un zéro en 0
def produit_x(ordre):
    """ordre 'ab' : 0 < rb ; 'ba' : rb < 0."""
    x1, x2 = ('0', '{{rb}}') if ordre == 'ab' else ('{{rb}}', '0')
    variables = [var('c', '1..3;±'), var('rb', '1..6' if ordre == 'ab' else '-6..-1'),
                 var('d', 'eval:-(c)*(rb)'), var('ac', 'eval:(c)')]
    lignes = [ligne_facteur('x', '1', x1, x2, 1 if ordre == 'ab' else 2),
              ligne_facteur(L2, 'c', x1, x2, 2 if ordre == 'ab' else 1),
              ligne('A(x)', x1, x2, [EXT, 'z', MIL, 'z', EXT])]
    return variation(
        'On veut dresser le tableau de signes de $A(x)=x(' + F2 + ')$.\n\nQuelles valeurs de $x$ annulent'
        ' $A(x)$ ? Donne-les dans l\'ordre croissant.\n\n$x_1=?$\n\n$x_2=?$' + SIGNES_SYMBOLIQUES,
        variables,
        [case(x1), case(x2), case(REP_EXT), case(REP_MIL), case(REP_EXT)],
        [FACTEUR_STEP, 'Le facteur $x$ s\'annule en $0$, le facteur $' + F2 + '$ en ${{rb}}$ : $x_1=' + col(x1, 1)
         + '$, $x_2=' + col(x2, 1) + '$.', REGLE, tableau(x1, x2, lignes)])


SP_AB = {'a': 2, 'ra': -1, 'b': 2, 'c': -1, 'rb': 3, 'd': 3, 'ac': -2}      # (2x+2)(−x+3)
SP_BA = {'a': 1, 'ra': 4, 'b': -4, 'c': 3, 'rb': -2, 'd': 6, 'ac': 3}       # (x−4)(3x+6)
SP_K = {'k': -3, 'a': 2, 'ra': 1, 'b': -2, 'ka': -6}                        # −3(2x−2)
SP_X = {'c': 2, 'rb': 3, 'd': -6, 'ac': 2}                                  # x(2x−6)
SP_XN = {'c': -1, 'rb': -2, 'd': -2, 'ac': -1}                              # x(−x−2)
MODELES.append(modele(
    '01-tableau-de-signes-d-un-produit', 'Tableau de signes d\'un produit',
    'Dresser le tableau de signes de (ax + b)(cx + d), de k(ax + b), de x(cx + d) : valeurs qui annulent dans'
    ' l\'ordre, signe sur chaque intervalle (pièges : racine −b/a écrite b/a, ordre des valeurs, constante'
    ' négative oubliée, règle des signes)',
    3, [produit_construire('ab'), produit_construire('ba'), PRODUIT_LIRE, PRODUIT_CONSTANTE, produit_x('ab'),
        produit_x('ba')],
    [spec('(2x+2)(−x+3) : −1, 3, −, +, −', 0, SP_AB, ['-1', '3', '1', '0', '1'], 'correct'),
     spec('Erreur : valeurs 1 et −3 (signe de −b/a)', 0, SP_AB, ['1', '-3', '1', '0', '1'], 'incorrect'),
     spec('Erreur : + − + (signe de a seul)', 0, SP_AB, ['-1', '3', '0', '1', '0'], 'incorrect'),
     spec('(x−4)(3x+6) : −2, 4, +, −, +', 1, SP_BA, ['-2', '4', '0', '1', '0'], 'correct'),
     spec('Erreur : ordre 4, −2', 1, SP_BA, ['4', '-2', '0', '1', '0'], 'incorrect'),
     spec('Lire : −, +, −', 2, SP_AB, ['1', '0', '1'], 'correct'),
     spec('Erreur : +, −, +', 2, SP_AB, ['0', '1', '0'], 'incorrect'),
     spec('−3(2x−2) : 1, +, −', 3, SP_K, ['1', '0', '1'], 'correct'),
     spec('Erreur : constante oubliée (−, +)', 3, SP_K, ['1', '1', '0'], 'incorrect'),
     spec('x(2x−6) : 0, 3, +, −, +', 4, SP_X, ['0', '3', '0', '1', '0'], 'correct'),
     spec('Erreur : oubli du zéro 0', 4, SP_X, ['3', '3', '0', '1', '0'], 'incorrect'),
     spec('x(−x−2) : −2, 0, −, +, −', 5, SP_XN, ['-2', '0', '1', '0', '1'], 'correct')]))

# =============================================================================================
# 2. 2-446 : tableau de signes d'un quotient
# =============================================================================================


def quotient_construire(ordre):
    x1, x2 = bornes(ordre)
    return variation(
        'On veut dresser le tableau de signes de ' + QUOTIENT + '.\n\nPour quelle valeur de $x$ le numérateur'
        ' s\'annule-t-il ?\n\n$x=?$\n\nQuelle est la valeur interdite ?\n\n$x=?$\n\n'
        'On range ces deux valeurs dans l\'ordre croissant : $x_1<x_2$.\n\n'
        + choix('Pour $x<x_1$, $B(x)$ est :', PLUS_MOINS) + '\n\n'
        + choix('Pour $x_1<x<x_2$, $B(x)$ est :', PLUS_MOINS) + '\n\n'
        + choix('Pour $x>x_2$, $B(x)$ est :', PLUS_MOINS),
        FACTEURS,
        [case('{{ra}}'), case('{{rb}}'), case(REP_EXT), case(REP_MIL), case(REP_EXT)],
        ['Le numérateur $' + F1 + '$ s\'annule en $' + col('{{ra}}', 1) + '$ : $B$ y vaut $0$. Le dénominateur $'
         + F2 + '$ s\'annule en $' + col('{{rb}}', 1) + '$ : c\'est la **valeur interdite**, marquée d\'une'
         ' double barre.',
         'Le signe d\'un quotient suit la même règle que celui d\'un produit. ' + REGLE,
         tableau_quotient(x1, x2, ordre)],
        cond(ordre))


def quotient_lire(ordre):
    x1, x2 = bornes(ordre)
    return variation(
        'Voici les signes du numérateur et du dénominateur de ' + QUOTIENT + '.\n\n'
        + tableau_quotient(x1, x2, ordre, avec_resultat=False) + '\n\n'
        + choix('Sur $\\left]-\\infty\\,;' + x1 + '\\right[$, $B(x)$ est :', PLUS_MOINS) + '\n\n'
        + choix('Sur $\\left]' + x1 + '\\,;' + x2 + '\\right[$, $B(x)$ est :', PLUS_MOINS) + '\n\n'
        + choix('Sur $\\left]' + x2 + '\\,;+\\infty\\right[$, $B(x)$ est :', PLUS_MOINS) + '\n\n'
        + choix('Dans la ligne de $B(x)$, sous la valeur ${{rb}}$, on écrit :', ['$0$', 'une double barre']),
        FACTEURS,
        [case(REP_EXT), case(REP_MIL), case(REP_EXT), case('1')],
        [REGLE, 'En ${{rb}}$ le dénominateur est nul : $B({{rb}})$ n\'existe pas, d\'où la ' + col('\\text{double'
         ' barre}') + '.', tableau_quotient(x1, x2, ordre)],
        cond(ordre))


MODELES.append(modele(
    '02-tableau-de-signes-d-un-quotient', 'Tableau de signes d\'un quotient',
    'Dresser le tableau de signes de (ax + b)/(cx + d) : valeur qui annule, valeur interdite, signe sur chaque'
    ' intervalle ; lire les signes des facteurs (pièges : 0 sous la valeur interdite, valeur interdite et zéro'
    ' échangés)',
    4, [quotient_construire('ab'), quotient_construire('ba'), quotient_lire('ab'), quotient_lire('ba')],
    [spec('(2x+2)/(−x+3) : −1, 3, −, +, −', 0, SP_AB, ['-1', '3', '1', '0', '1'], 'correct'),
     spec('Erreur : zéro et valeur interdite échangés', 0, SP_AB, ['3', '-1', '1', '0', '1'], 'incorrect'),
     spec('(x−4)/(3x+6) : 4, −2, +, −, +', 1, SP_BA, ['4', '-2', '0', '1', '0'], 'correct'),
     spec('Lire : −, +, −, double barre', 2, SP_AB, ['1', '0', '1', '1'], 'correct'),
     spec('Erreur : 0 sous la valeur interdite', 2, SP_AB, ['1', '0', '1', '0'], 'incorrect'),
     spec('Lire (ordre inverse) : +, −, +, double barre', 3, SP_BA, ['0', '1', '0', '1'], 'correct'),
     spec('Erreur : signes inversés', 3, SP_BA, ['1', '0', '1', '1'], 'incorrect')]))

# =============================================================================================
# 3. 2-337 : f(x) = 0, f produit, à l'aide du tableau
# =============================================================================================

EQ_QUESTION = '\n\nRésous l\'équation $A(x)=0$.\n\n$S=?$'


def eq_produit(ordre):
    x1, x2 = bornes(ordre)
    return variation(
        'Voici le tableau de signes de ' + PRODUIT + '.\n\n' + tableau_produit(x1, x2, ordre) + EQ_QUESTION,
        FACTEURS,
        [case_ens('\\{ ' + x1 + ' ; ' + x2 + ' \\}')],
        ['Les solutions de $A(x)=0$ sont les valeurs où la ligne de $A(x)$ porte un $0$.',
         '$S=' + col('\\left\\{' + x1 + '\\,;' + x2 + '\\right\\}') + '$.'],
        cond(ordre))


EQ_X = variation(
    'Voici le tableau de signes de $A(x)=x(' + F2 + ')$.\n\n'
    + tableau('0', '{{rb}}', [ligne_facteur('x', '1', '0', '{{rb}}', 1), ligne_facteur(L2, 'c', '0', '{{rb}}', 2),
                              ligne('A(x)', '0', '{{rb}}', [EXT, 'z', MIL, 'z', EXT])])
    + EQ_QUESTION,
    [var('c', '1..3;±'), var('rb', '1..6'), var('d', 'eval:-(c)*(rb)'), var('ac', 'eval:(c)')],
    [case_ens('\\{ 0 ; {{rb}} \\}')],
    ['Les solutions de $A(x)=0$ sont les valeurs où la ligne de $A(x)$ porte un $0$ ; le facteur $x$ s\'annule en'
     ' $0$.',
     '$S=' + col('\\left\\{0\\,;{{rb}}\\right\\}') + '$.'])

MODELES.append(modele(
    '03-equation-produit-nul-par-un-tableau', 'Résoudre A(x) = 0 avec un tableau de signes',
    'Lire les solutions de A(x) = 0 sur le tableau de signes d\'un produit (pièges : une seule solution,'
    ' solutions sans accolades, intervalle au lieu d\'un ensemble de valeurs)',
    5, [eq_produit('ab'), eq_produit('ba'), EQ_X],
    [spec('{−1 ; 3}', 0, SP_AB, '\\{-1;3\\}', 'correct'),
     spec('Ordre inverse accepté {3 ; −1}', 0, SP_AB, '\\{3;-1\\}', 'correct'),
     spec('Erreur : une seule solution', 0, SP_AB, '\\{-1\\}', 'incorrect'),
     spec('Erreur : intervalle [−1 ; 3]', 0, SP_AB, '[-1;3]', 'incorrect'),
     spec('{−2 ; 4}', 1, SP_BA, '\\{-2;4\\}', 'correct'),
     spec('{0 ; 3}', 2, SP_X, '\\{0;3\\}', 'correct'),
     spec('Erreur : oubli de 0', 2, SP_X, '\\{3\\}', 'incorrect')]))

# =============================================================================================
# 4. 2-449 : f(x) = 0, f quotient, à l'aide du tableau
# =============================================================================================


def eq_quotient(ordre):
    x1, x2 = bornes(ordre)
    return variation(
        'Voici le tableau de signes de ' + QUOTIENT + '.\n\n' + tableau_quotient(x1, x2, ordre)
        + '\n\nRésous l\'équation $B(x)=0$.\n\n$S=?$',
        FACTEURS,
        [case_ens('\\{ {{ra}} \\}')],
        ['$B(x)=0$ là où la ligne de $B(x)$ porte un $0$ : là où le **numérateur** s\'annule.',
         'En ${{rb}}$ la double barre marque la valeur interdite : $B({{rb}})$ n\'existe pas, ce n\'est pas une'
         ' solution.', '$S=' + col('\\left\\{{{ra}}\\right\\}') + '$.'],
        cond(ordre))


MODELES.append(modele(
    '04-equation-quotient-nul-par-un-tableau', 'Résoudre B(x) = 0 avec un tableau de signes (quotient)',
    'Lire la solution de B(x) = 0 sur le tableau de signes d\'un quotient (pièges : valeur interdite comptée'
    ' comme solution, valeur interdite seule)',
    6, [eq_quotient('ab'), eq_quotient('ba')],
    [spec('{−1}', 0, SP_AB, '\\{-1\\}', 'correct'),
     spec('Erreur : valeur interdite comptée {−1 ; 3}', 0, SP_AB, '\\{-1;3\\}', 'incorrect'),
     spec('Erreur : valeur interdite seule {3}', 0, SP_AB, '\\{3\\}', 'incorrect'),
     spec('{4}', 1, SP_BA, '\\{4\\}', 'correct')]))

# =============================================================================================
# 5 et 6. 2-450, 2-451 : f(x) > 0 (quatre sens), produit puis quotient
# =============================================================================================

SENS = [('>', True, True), ('\\geqslant', True, False), ('<', False, True), ('\\leqslant', False, False)]


def ensembles(x1, x2, ferme1, ferme2):
    """(extérieur, intérieur) en syntaxe de case `intervalles`."""
    dehors = (']-\\infty;' + x1 + (']' if ferme1 else '[') + '\\cup' + ('[' if ferme2 else ']') + x2
              + ';+\\infty[')
    dedans = ('[' if ferme1 else ']') + x1 + ';' + x2 + (']' if ferme2 else '[')
    return dehors, dedans


def en_latex(ens):
    return ens.replace(';', '\\,;').replace('\\cup', '\\cup ')


def inequation(quotient, ordre, sens):
    symbole, positif, strict = sens
    x1, x2 = bornes(ordre)
    nom = 'B' if quotient else 'A'
    if quotient:
        # zéro du numérateur fermé si large ; valeur interdite toujours ouverte
        f1 = (not strict) and ordre == 'ab'
        f2 = (not strict) and ordre == 'ba'
        tab = tableau_quotient(x1, x2, ordre)
        expr = QUOTIENT
    else:
        f1 = f2 = not strict
        tab = tableau_produit(x1, x2, ordre)
        expr = PRODUIT
    dehors, dedans = ensembles(x1, x2, f1, f2)
    # Positif dehors si ac > 0 ; on cherche positif (> ou ⩾) ou négatif (< ou ⩽)
    attendu = '{{if:ac>0|' + (dehors if positif else dedans) + '|' + (dedans if positif else dehors) + '}}'
    affiche = ('{{if:ac>0|' + en_latex(dehors if positif else dedans) + '|' + en_latex(dedans if positif else dehors)
               + '}}')
    lecture = ('On garde les intervalles où la ligne de $' + nom + '(x)$ porte '
               + ('$+$' if positif else '$-$')
               + (', **sans** les valeurs où elle porte $0$.' if strict else ', **et** les valeurs où elle porte'
                  ' $0$.'))
    if quotient:
        lecture += ' La valeur interdite ${{rb}}$ est **toujours exclue** (crochet ouvert).'
    return variation(
        'Voici le tableau de signes de ' + expr + '.\n\n' + tab + '\n\nRésous l\'inéquation $' + nom + '(x)'
        + symbole + '0$.\n\n$S=?$',
        FACTEURS,
        [case_ens(attendu)],
        [lecture, '$S=' + col(affiche) + '$.'],
        cond(ordre))


# Produit, racines −1 et 3, ac < 0 : + au milieu
SP_I = SP_AB
MODELES.append(modele(
    '05-inequation-produit-par-un-tableau', 'Résoudre A(x) > 0 avec un tableau de signes',
    'Lire les solutions de A(x) > 0, ⩾ 0, < 0, ⩽ 0 sur le tableau de signes d\'un produit (pièges : signe lu à'
    ' l\'envers, crochets fermés pour une inégalité stricte, réunion oubliée)',
    7, [inequation(False, 'ab', s) for s in SENS],
    [spec('> 0 : ]−1 ; 3[', 0, SP_I, ']-1;3[', 'correct'),
     spec('Erreur : signe lu à l\'envers', 0, SP_I, ']-\\infty;-1[\\cup]3;+\\infty[', 'incorrect'),
     spec('Erreur : crochets fermés', 0, SP_I, '[-1;3]', 'incorrect'),
     spec('⩾ 0 : [−1 ; 3]', 1, SP_I, '[-1;3]', 'correct'),
     spec('< 0 : réunion', 2, SP_I, ']-\\infty;-1[\\cup]3;+\\infty[', 'correct'),
     spec('Erreur : un seul intervalle', 2, SP_I, ']3;+\\infty[', 'incorrect'),
     spec('⩽ 0 : réunion fermée', 3, SP_I, ']-\\infty;-1]\\cup[3;+\\infty[', 'correct'),
     spec('(−2x−4)(x−4) > 0 : ]−2 ; 4[', 0, {'a': -2, 'ra': -2, 'b': -4, 'c': 1, 'rb': 4, 'd': -4, 'ac': -2},
          ']-2;4[', 'correct')]))

MODELES.append(modele(
    '06-inequation-quotient-par-un-tableau', 'Résoudre B(x) > 0 avec un tableau de signes (quotient)',
    'Lire les solutions de B(x) > 0, ⩾ 0, < 0, ⩽ 0 sur le tableau de signes d\'un quotient (pièges : valeur'
    ' interdite incluse, zéro du numérateur exclu pour une inégalité large)',
    8, [inequation(True, o, s) for o in ('ab', 'ba') for s in SENS],
    [spec('> 0 : ]−1 ; 3[', 0, SP_AB, ']-1;3[', 'correct'),
     spec('⩾ 0 : [−1 ; 3[', 1, SP_AB, '[-1;3[', 'correct'),
     spec('Erreur : valeur interdite incluse [−1 ; 3]', 1, SP_AB, '[-1;3]', 'incorrect'),
     spec('Erreur : zéro exclu ]−1 ; 3[', 1, SP_AB, ']-1;3[', 'incorrect'),
     spec('⩽ 0 : ]−∞ ; −1] ∪ ]3 ; +∞[', 3, SP_AB, ']-\\infty;-1]\\cup]3;+\\infty[', 'correct'),
     spec('Ordre inverse, ⩾ 0 : ]−∞ ; −2[ ∪ [4 ; +∞[', 5, SP_BA, ']-\\infty;-2[\\cup[4;+\\infty[', 'correct'),
     spec('Erreur : −2 inclus', 5, SP_BA, ']-\\infty;-2]\\cup[4;+\\infty[', 'incorrect'),
     spec('< 0 : ]−∞ ; −1[ ∪ ]3 ; +∞[', 2, SP_AB, ']-\\infty;-1[\\cup]3;+\\infty[', 'correct'),
     spec('Ordre inverse, > 0 : ]−∞ ; −2[ ∪ ]4 ; +∞[', 4, SP_BA, ']-\\infty;-2[\\cup]4;+\\infty[', 'correct'),
     spec('Ordre inverse, < 0 : ]−2 ; 4[', 6, SP_BA, ']-2;4[', 'correct'),
     spec('Ordre inverse, ⩽ 0 : ]−2 ; 4]', 7, SP_BA, ']-2;4]', 'correct'),
     spec('Erreur : valeur interdite incluse [−2 ; 4]', 7, SP_BA, '[-2;4]', 'incorrect')]))

os.makedirs(DOSSIER, exist_ok=True)
for nom, m in MODELES:
    with open(os.path.join(DOSSIER, nom + '.json'), 'w', encoding='utf-8') as f:
        json.dump(m, f, ensure_ascii=False, indent='\t')
        f.write('\n')
subprocess.run(['pnpm', 'exec', 'prettier', '--write', DOSSIER], check=True,
               stdout=subprocess.DEVNULL)
print(f'{len(MODELES)} modèles écrits dans {DOSSIER}')
