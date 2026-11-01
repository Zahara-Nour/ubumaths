"""Écrit les 6 modèles du lot 7 A « Signes » de la 2de dans scripts/questions/2de-signes-a/.

Phase 0 validée par David le 2026-11-01 (§ 44 du journal `docs/wip/questions-2de-progress.md`).
Bornes : `bornes/lycee/2de.json` (2-329, 2-475, 2-476, 2-352, 2-268, 2-426). Un point par modèle ;
le nœud et le tag sont posés par la migration de rangement, après le `--publier` de David.

Décisions et pièges :
- L7-a : 2-268 et 2-426 = signe SANS tableau (en une valeur, sur un intervalle : règle des signes) ;
  le tableau est au lot 7 B (2-330, 2-446) ;
- L7-b : un signe se répond en case choix (« strictement positif / strictement négatif… ») ;
- fonctions de référence pour le signe : carré, inverse, valeur absolue (ni √ ni cube, l2-2) ;
- facteurs : expressions affines seulement (pas de trinôme non factorisé) ;
- un tableau de signes dans une case choix : clôture ```` du bloc choix ;
- jamais de `|` dans un `{{if:…}}` (séparateur) : valeur absolue écrite `\\lvert x\\rvert` ;
- jamais de `{{if:…}}` imbriqué : une variation par cas ;
- les variables sont substituées telles quelles dans les `eval` : toujours `(a)`, `-(a)` ;
- variables `e` et `i` interdites.

    python3 docs/wip/questions-2de/lot-signes-a-2de.py scripts/questions/2de-signes-a
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


def modele(nom, title, description, categorie, level, variations, specs, delay=60):
    m = {'title': title, 'description': description, 'grades': ['2'], 'theme': categorie[0],
         'domain': categorie[1], 'subdomain': categorie[2], 'level': level, 'delay': delay,
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


def choix(question, options, melanger=True, plusieurs=False):
    entete = ('plusieurs: oui\n' if plusieurs else '') + ('' if melanger else 'melanger: non\n')
    return question + '\n\n```choix\n' + entete + ''.join('- ' + o + '\n' for o in options) + '```'


def tableau_lignes(label, zero, signes, borne='z'):
    """Tableau de signes d'une ligne : une seule valeur `zero` (texte) entre −∞ et +∞.

    `signes` = (signe à gauche, signe à droite) ; `borne` = `z` (zéro) ou `d` (valeur interdite)."""
    return ['```variation', 'variable: x', 'domain: -inf, ' + zero + ', +inf', '',
            'sign: ' + label,
            '  -inf,' + zero + ': ' + signes[0],
            '  ' + zero + ': ' + borne,
            '  ' + zero + ',+inf: ' + signes[1],
            '```']


def tableau(label, zero, signes, borne='z'):
    return '\n'.join(tableau_lignes(label, zero, signes, borne))


def choix_tableaux(question, label, zero, liste):
    """Case choix entre des tableaux de signes, mélangés ; le bon en premier (réponse « 0 »)."""
    options = []
    for signes in liste:
        lignes = tableau_lignes(label, zero, signes)
        options.append('- ' + lignes[0] + '\n' + ''.join(('  ' + l if l else '') + '\n' for l in lignes[1:]))
    return question + '\n\n````choix\n' + ''.join(options) + '````'


# Cinq signes, dans cet ordre (réponse = rang)
SIGNES = ['strictement positif', 'positif ou nul', 'strictement négatif', 'négatif ou nul',
          'de signe variable : il dépend de $x$']
# Signe d'un nombre (produit, quotient en une valeur)
SIGNE_NOMBRE = ['strictement positif', 'strictement négatif', 'nul', 'n\'existe pas']
PLUS_MOINS = ['strictement positif', 'strictement négatif']
# Les quatre tableaux d'une ligne à une valeur (le premier est remplacé par le bon)
TOUS_SIGNES = [('+', '+'), ('-', '+'), ('+', '-'), ('-', '-')]


def tableaux_avec(bon):
    return [bon] + [s for s in TOUS_SIGNES if s != bon]


MODELES = []

# =============================================================================================
# 1. 2-329 : signe des fonctions de référence
# =============================================================================================

SIGNE_CARRE = variation(
    choix('Pour tout réel $x${{if:g==1| non nul|}}, le nombre $x^2$ est :', SIGNES, melanger=False),
    [var('g', '0|1')],
    [case('{{eval:1-(g)}}')],
    ['Un carré est toujours positif ou nul : $x^2\\geqslant 0$, et $x^2=0$ seulement pour $x=0$.',
     '{{if:g==1|Ici $x\\neq 0$ : $x^2$ est ' + col('\\text{strictement positif}') + '.|Il vaut $0$ pour'
     ' $x=0$ : $x^2$ est ' + col('\\text{positif ou nul}') + '.}}'])

SIGNE_INVERSE = variation(
    choix('Pour tout réel $x{{if:g==1|<|>}}0$, le nombre $\\dfrac{1}{x}$ est :', SIGNES, melanger=False),
    [var('g', '0|1')],
    [case('{{eval:2*(g)}}')],
    ['$\\dfrac{1}{x}$ est du **signe de $x$** (on divise $1$, positif, par $x$) et n\'est jamais nul.',
     'Ici $x{{if:g==1|<|>}}0$ : $\\dfrac{1}{x}$ est '
     + col('\\text{strictement {{if:g==1|négatif|positif}}}') + '.'])

SIGNE_VA = variation(
    choix('Pour tout réel $x${{if:g==1| non nul|}}, le nombre $\\lvert x\\rvert$ est :', SIGNES,
          melanger=False),
    [var('g', '0|1')],
    [case('{{eval:1-(g)}}')],
    ['$\\lvert x\\rvert$ est la distance de $x$ à $0$ : elle est positive ou nulle, et nulle seulement pour'
     ' $x=0$.',
     '{{if:g==1|Ici $x\\neq 0$ : $\\lvert x\\rvert$ est ' + col('\\text{strictement positif}') + '.|Elle vaut'
     ' $0$ pour $x=0$ : $\\lvert x\\rvert$ est ' + col('\\text{positif ou nul}') + '.}}'])

# Signe d'une image sans calcul : f carré, inverse ou valeur absolue en un négatif
IMAGE_INVERSE = variation(
    'On note $f$ la fonction inverse : $f(x)=\\dfrac{1}{x}$.\n\n'
    + choix('Sans calculer, quel est le signe de $f\\left(-\\dfrac{ {{p}} }{ {{q}} }\\right)$ ?', PLUS_MOINS,
            melanger=False),
    [var('p', '1..9'), var('q', '2..9')],
    [case('1')],
    ['$\\dfrac{1}{x}$ est du signe de $x$.',
     '$-\\dfrac{ {{p}} }{ {{q}} }<0$, donc son image est ' + col('\\text{strictement négative}') + '.'],
    ['gcd(p, q) == 1', 'p != q'])

IMAGE_CARRE = variation(
    'On note $f$ la fonction carré : $f(x)=x^2$.\n\n'
    + choix('Sans calculer, quel est le signe de $f\\left(-\\dfrac{ {{p}} }{ {{q}} }\\right)$ ?', PLUS_MOINS,
            melanger=False),
    [var('p', '1..9'), var('q', '2..9')],
    [case('0')],
    ['Un carré est positif ou nul, et nul seulement en $0$.',
     '$-\\dfrac{ {{p}} }{ {{q}} }\\neq 0$, donc son carré est ' + col('\\text{strictement positif}')
     + ', même si le nombre est négatif.'],
    ['gcd(p, q) == 1', 'p != q'])

MODELES.append(modele(
    '01-signe-des-fonctions-de-reference', 'Signe des fonctions de référence',
    'Signe de x², de 1/x et de |x| selon x ; signe d\'une image sans calcul (pièges : x² « négatif pour'
    ' x < 0 », 1/x « toujours positif », oubli du cas nul)',
    ('Fonctions', 'Généralités', 'Signe'), 1,
    [SIGNE_CARRE, SIGNE_INVERSE, SIGNE_VA, IMAGE_INVERSE, IMAGE_CARRE],
    [spec('x² positif ou nul', 0, {'g': 0}, '1', 'correct'),
     spec('Erreur : strictement positif (oubli de 0)', 0, {'g': 0}, '0', 'incorrect'),
     spec('x² pour x ≠ 0 : strictement positif', 0, {'g': 1}, '0', 'correct'),
     spec('Erreur : signe variable', 0, {'g': 1}, '4', 'incorrect'),
     spec('1/x pour x > 0 : strictement positif', 1, {'g': 0}, '0', 'correct'),
     spec('1/x pour x < 0 : strictement négatif', 1, {'g': 1}, '2', 'correct'),
     spec('Erreur : 1/x toujours positif', 1, {'g': 1}, '0', 'incorrect'),
     spec('|x| positif ou nul', 2, {'g': 0}, '1', 'correct'),
     spec('|x| pour x ≠ 0 : strictement positif', 2, {'g': 1}, '0', 'correct'),
     spec('f(−2/3) < 0 pour l\'inverse', 3, {'p': 2, 'q': 3}, '1', 'correct'),
     spec('Erreur : positif', 3, {'p': 2, 'q': 3}, '0', 'incorrect'),
     spec('(−2/3)² > 0', 4, {'p': 2, 'q': 3}, '0', 'correct'),
     spec('Erreur : négatif « car le nombre est négatif »', 4, {'p': 2, 'q': 3}, '1', 'incorrect')]))

# =============================================================================================
# 2. 2-475 : signe de |x|
# =============================================================================================

TABLEAU_VA = variation(
    choix_tableaux('Quel est le tableau de signes de la fonction valeur absolue $x\\mapsto\\lvert x\\rvert$ ?',
                   '\\lvert x\\rvert', '0', tableaux_avec(('+', '+'))),
    [],
    [case('0')],
    ['$\\lvert x\\rvert$ est une distance : elle est positive, et nulle seulement pour $x=0$.',
     tableau('\\lvert x\\rvert', '0', ('+', '+'))])

VA_NON_NUL = variation(
    'Pour quels réels $x$ a-t-on $\\lvert x\\rvert>0$ ?\n\nDonne l\'ensemble de ces réels.\n\n$S=?$',
    [],
    [case_ens('\\mathbb{R}\\setminus\\{0\\}')],
    ['$\\lvert x\\rvert\\geqslant 0$ pour tout réel $x$, et $\\lvert x\\rvert=0$ seulement pour $x=0$.',
     'Donc $\\lvert x\\rvert>0$ pour tout $x\\neq 0$ : $S=' + col('\\mathbb{R}\\setminus\\{0\\}') + '$.'])

MOINS_VA = variation(
    choix('Pour tout réel $x$, le nombre $-{{k}}\\lvert x\\rvert$ est :', SIGNES, melanger=False),
    [var('k', '1..5')],
    [case('3')],
    ['$\\lvert x\\rvert\\geqslant 0$ ; multiplié par $-{{k}}$, négatif, il change de signe.',
     '$-{{k}}\\lvert x\\rvert\\leqslant 0$, nul pour $x=0$ : il est ' + col('\\text{négatif ou nul}') + '.'])

MODELES.append(modele(
    '02-signe-de-la-valeur-absolue', 'Signe de la fonction valeur absolue',
    'Tableau de signes de |x| ; ensemble où |x| > 0 ; signe de −k|x| (pièges : |x| négatif pour x < 0,'
    ' 0 compris dans |x| > 0)',
    ('Fonctions', 'Valeur absolue', 'Signe'), 1, [TABLEAU_VA, VA_NON_NUL, MOINS_VA],
    [spec('+ 0 +', 0, {}, '0', 'correct'),
     spec('Erreur : − 0 + (comme x)', 0, {}, '1', 'incorrect'),
     spec('ℝ \\ {0}', 1, {}, '\\mathbb{R}\\setminus\\{0\\}', 'correct'),
     spec('Réunion ]−∞ ; 0[ ∪ ]0 ; +∞[', 1, {}, ']-\\infty;0[\\cup]0;+\\infty[', 'correct'),
     spec('Erreur : ℝ', 1, {}, '\\mathbb{R}', 'incorrect'),
     spec('Erreur : ]0 ; +∞[', 1, {}, ']0;+\\infty[', 'incorrect'),
     spec('−3|x| négatif ou nul', 2, {'k': 3}, '3', 'correct'),
     spec('Erreur : strictement négatif', 2, {'k': 3}, '2', 'incorrect')]))

# =============================================================================================
# 3. 2-476 : signe de x²
# =============================================================================================

TABLEAU_CARRE = variation(
    choix_tableaux('Quel est le tableau de signes de la fonction carré $x\\mapsto x^2$ ?', 'x^2', '0',
                   tableaux_avec(('+', '+'))),
    [],
    [case('0')],
    ['Un carré est positif, et nul seulement pour $x=0$ : $(-3)^2=9>0$ comme $3^2=9$.',
     tableau('x^2', '0', ('+', '+'))])

MOINS_CARRE = variation(
    choix('Pour tout réel $x$, le nombre $-{{k}}x^2$ est :', SIGNES, melanger=False),
    [var('k', '1..5')],
    [case('3')],
    ['$x^2\\geqslant 0$ ; multiplié par $-{{k}}$, négatif, il change de signe.',
     '$-{{k}}x^2\\leqslant 0$, nul pour $x=0$ : il est ' + col('\\text{négatif ou nul}') + '.'])

CARRE_DECALE = variation(
    choix('Pour tout réel $x$, le nombre $(x{{eval:-(a);+}})^2$ est :', SIGNES, melanger=False)
    + '\n\nPour quelle valeur de $x$ est-il nul ?\n\n$x=?$',
    [var('a', '1..9;±')],
    [case('1'), case('{{a}}')],
    ['Un carré est positif ou nul, et nul seulement quand le nombre élevé au carré est nul.',
     '$(x{{eval:-(a);+}})^2$ est ' + col('\\text{positif ou nul}') + ', nul pour $x{{eval:-(a);+}}=0$, soit $x='
     + col('{{a}}', 1) + '$.'])

MODELES.append(modele(
    '03-signe-du-carre', 'Signe de la fonction carré',
    'Tableau de signes de x² ; signe de −kx² ; signe de (x − a)² et valeur qui l\'annule (pièges : x²'
    ' négatif pour x < 0, −x² « positif car c\'est un carré », (x − a)² nul en −a)',
    ('Fonctions', 'Fonction carré', 'Signe'), 1, [TABLEAU_CARRE, MOINS_CARRE, CARRE_DECALE],
    [spec('+ 0 +', 0, {}, '0', 'correct'),
     spec('Erreur : − 0 +', 0, {}, '1', 'incorrect'),
     spec('−2x² négatif ou nul', 1, {'k': 2}, '3', 'correct'),
     spec('Erreur : positif ou nul « c\'est un carré »', 1, {'k': 2}, '1', 'incorrect'),
     spec('(x − 3)² positif ou nul, nul en 3', 2, {'a': 3}, ['1', '3'], 'correct'),
     spec('Erreur : nul en −3', 2, {'a': 3}, ['1', '-3'], 'incorrect'),
     spec('Erreur : strictement positif', 2, {'a': 3}, ['0', '3'], 'incorrect')]))

# =============================================================================================
# 4. 2-352 : fonction affine — sens de variation, signe, droite
# =============================================================================================

SENS = ['croissante', 'décroissante']
AFFINE_RACINE = [var('m', '1..4;±'), var('r', '-5..5!0'), var('p', 'eval:-(m)*(r)')]
SENS_STEP = ('$f$ est affine de coefficient directeur $m={{m}}$, {{if:m>0|positif : $f$ est **croissante**|'
             'négatif : $f$ est **décroissante**}}.')
ZERO_STEP = '$f(x)=0\\iff {{m}}x{{p;+}}=0\\iff x=' + col('{{r}}', 1) + '$.'
SIGNE_GAUCHE_STEP = ('{{if:m>0|$f$ croît et s\'annule en ${{r}}$ : elle est **négative avant**, positive après.|'
                     '$f$ décroît et s\'annule en ${{r}}$ : elle est **positive avant**, négative après.}}')
SIGNE_DROITE_STEP = ('{{if:m>0|$f$ croît et s\'annule en ${{r}}$ : elle est négative avant, **positive après**.|'
                     '$f$ décroît et s\'annule en ${{r}}$ : elle est positive avant, **négative après**.}}')

AFFINE_FORMULE = variation(
    'On considère la fonction $f$ définie sur $\\mathbb{R}$ par $f(x)={{m}}x{{p;+}}$.\n\n'
    + choix('Quel est le sens de variation de $f$ ?', SENS, melanger=False)
    + '\n\nPour quelle valeur de $x$ a-t-on $f(x)=0$ ?\n\n$x=?$\n\n'
    + choix('Sur $\\left]-\\infty\\,;{{r}}\\right[$, $f(x)$ est :', PLUS_MOINS, melanger=False),
    AFFINE_RACINE,
    [case('{{if:m>0|0|1}}'), case('{{r}}'), case('{{if:m>0|1|0}}')],
    [SENS_STEP, ZERO_STEP, SIGNE_GAUCHE_STEP,
     tableau('f(x)', '{{r}}', ('{{if:m>0|-|+}}', '{{if:m>0|+|-}}'))])

# La droite est tracée : coefficient directeur et racine lus
AFFINE_DROITE = variation(
    'La droite ci-dessous représente une fonction affine $f$.\n\n'
    + '\n'.join(['```courbe', 'x: -6 ; 6', 'y: -7 ; 7', 'grille: 1 ; 1',
                 'f(x) = {{m}}*x+({{p}})   bleu', 'taille: moyenne',
                 'description: Droite {{if:m>0|montante|descendante}} qui coupe l\'axe des abscisses au point'
                 ' d\'abscisse {{r}}.', '```'])
    + '\n\n' + choix('Quel est le sens de variation de $f$ ?', SENS, melanger=False)
    + '\n\nPour quelle valeur de $x$ a-t-on $f(x)=0$ ?\n\n$x=?$\n\n'
    + choix('Sur $\\left]{{r}}\\,;+\\infty\\right[$, $f(x)$ est :', PLUS_MOINS, melanger=False),
    [var('m', '1..2;±'), var('r', '-3..3!0'), var('p', 'eval:-(m)*(r)')],
    [case('{{if:m>0|0|1}}'), case('{{r}}'), case('{{if:m>0|0|1}}')],
    ['La droite {{if:m>0|monte : $f$ est **croissante**|descend : $f$ est **décroissante**}}.',
     'Elle coupe l\'axe des abscisses en $x=' + col('{{r}}', 1) + '$ : c\'est là que $f$ s\'annule.',
     'Pour $x>{{r}}$, la droite est {{if:m>0|**au-dessus** de l\'axe des abscisses : $f(x)>0$|**en dessous** de'
     ' l\'axe des abscisses : $f(x)<0$}}.',
     tableau('f(x)', '{{r}}', ('{{if:m>0|-|+}}', '{{if:m>0|+|-}}'))])

# Du tableau de signes au sens de variation
AFFINE_TABLEAU = variation(
    'Une fonction affine $f$ a le tableau de signes suivant.\n\n'
    + tableau('f(x)', '{{r}}', ('{{if:s>0|-|+}}', '{{if:s>0|+|-}}')) + '\n\n'
    + choix('Quel est le sens de variation de $f$ ?', SENS, melanger=False),
    [var('r', '-5..5'), var('s', '-1|1')],
    [case('{{if:s>0|0|1}}')],
    ['Une fonction affine non constante qui passe {{if:s>0|du négatif au positif|du positif au négatif}}'
     ' est ' + col('\\text{{{if:s>0|croissante|décroissante}}}') + ' : son coefficient directeur est'
     ' {{if:s>0|positif|négatif}}.'])

SP_AF_P = {'m': 2, 'r': 3, 'p': -6}
SP_AF_N = {'m': -3, 'r': -2, 'p': -6}
SP_DR_P = {'m': 2, 'r': -1, 'p': 2}
SP_DR_N = {'m': -1, 'r': 2, 'p': 2}
MODELES.append(modele(
    '04-affine-variations-signe-droite', 'Fonction affine : variations, signe et droite',
    'Sens de variation, valeur qui annule et signe d\'une fonction affine, par la formule, sur la droite,'
    ' depuis le tableau de signes (pièges : signe de p au lieu de m, zéro −p/m écrit p/m, signe inversé'
    ' pour m < 0)',
    ('Fonctions', 'Fonctions affines', 'Variations-Signe'), 4,
    [AFFINE_FORMULE, AFFINE_DROITE, AFFINE_TABLEAU],
    [spec('2x − 6 : croissante, 3, négative avant', 0, SP_AF_P, ['0', '3', '1'], 'correct'),
     spec('Erreur : zéro −3', 0, SP_AF_P, ['0', '-3', '1'], 'incorrect'),
     spec('Erreur : positive avant', 0, SP_AF_P, ['0', '3', '0'], 'incorrect'),
     spec('−3x − 6 : décroissante, −2, positive avant', 0, SP_AF_N, ['1', '-2', '0'], 'correct'),
     spec('Erreur : croissante (signe de p)', 0, SP_AF_N, ['0', '-2', '0'], 'incorrect'),
     spec('Droite 2x + 2 : croissante, −1, positive après', 1, SP_DR_P, ['0', '-1', '0'], 'correct'),
     spec('Droite −x + 2 : décroissante, 2, négative après', 1, SP_DR_N, ['1', '2', '1'], 'correct'),
     spec('Erreur : positive après', 1, SP_DR_N, ['1', '2', '0'], 'incorrect'),
     spec('− 0 + : croissante', 2, {'r': 1, 's': 1}, '0', 'correct'),
     spec('+ 0 − : décroissante', 2, {'r': 1, 's': -1}, '1', 'correct'),
     spec('Erreur : croissante pour + 0 −', 2, {'r': 1, 's': -1}, '0', 'incorrect')]))

# =============================================================================================
# 5. 2-268 : signe de A(x)B(x), sans tableau
# =============================================================================================

PRODUIT = '({{a}}x{{b;+}})({{c}}x{{d;+}})'
# Facteurs ax + b et cx + d de racines entières r1 = −b/a, r2 = −d/c
FACTEURS = [var('a', '1..3;±'), var('r1', '-6..6'), var('b', 'eval:-(a)*(r1)'),
            var('c', '1..3;±'), var('r2', '-6..6'), var('d', 'eval:-(c)*(r2)')]
VAL_A = 'eval:(a)*(x0)+(b)'
VAL_C = 'eval:(c)*(x0)+(d)'
F1 = '{{a}}x{{b;+}}'
F2 = '{{c}}x{{d;+}}'


def coef(v):
    """Coefficient de x écrit à la main (hors formule maison, rien ne le nettoie) : 1 → rien, −1 → −."""
    return '{{if:' + v + '==-1|-|}}{{if:' + v + '*' + v + '>1|{{' + v + '}}|}}'


def signe_txt(v):
    return '{{if:' + v + '>0|positif|négatif}}'


PRODUIT_VALEUR = variation(
    'On considère $A(x)=' + PRODUIT + '$.\n\n'
    + choix('Sans développer, quel est le signe de $A({{x0}})$ ?', SIGNE_NOMBRE[:3], melanger=False),
    FACTEURS + [var('x0', '-6..6'), var('u', VAL_A), var('w', VAL_C), var('v', 'eval:(u)*(w)')],
    [case('{{if:v>0|0|1}}')],
    ['En $x={{x0}}$, le facteur $' + F1 + '$ vaut ${{u}}$ et le facteur $' + F2 + '$ vaut ${{w}}$.',
     'Un facteur ' + signe_txt('u') + ', un facteur ' + signe_txt('w') + ' : par la **règle des signes**,'
     ' $A({{x0}})$ est ' + col('\\text{strictement {{if:v>0|positif|négatif}}}') + '.'],
    ['r1 != r2', 'x0 != r1', 'x0 != r2'])

PRODUIT_RACINE = variation(
    'On considère $A(x)=' + PRODUIT + '$.\n\n'
    + choix('Sans développer, quel est le signe de $A({{r1}})$ ?', SIGNE_NOMBRE[:3], melanger=False),
    FACTEURS,
    [case('2')],
    ['En $x={{r1}}$, le facteur $' + F1 + '$ vaut $0$.',
     'Un produit dont un facteur est nul est nul : $A({{r1}})$ est ' + col('\\text{nul}') + '.'],
    ['r1 != r2'])

# Sur un intervalle : facteurs (x − p) ou (p − x), racines p < q
FACTEUR_P = '{{if:s1>0|x{{eval:-(p);+}}|{{p}}-x}}'
FACTEUR_Q = '{{if:s2>0|x{{eval:-(q);+}}|{{q}}-x}}'
VAR_INTERVALLE = [var('p', '-6..4'), var('k', '2..4'), var('q', 'eval:(p)+(k)'), var('s1', '-1|1'),
                  var('s2', '-1|1')]


def intervalle_variation(enonce_avant, expression, intervalle, t, operation):
    """Signe d'un produit ou d'un quotient de (x − p) / (p − x) et (x − q) / (q − x) sur un intervalle."""
    produit = operation == 'produit'
    return variation(
        enonce_avant + '\n\n'
        + choix('Pour $x\\in' + intervalle + '$, $' + ('A' if produit else 'B') + '(x)$ est :', PLUS_MOINS,
                melanger=False),
        VAR_INTERVALLE + [var('t', t), var('u', 'eval:(s1)*((t)-(p))'), var('w', 'eval:(s2)*((t)-(q))'),
                          var('v', 'eval:(u)*(w)')],
        [case('{{if:v>0|0|1}}')],
        ['Pour $x\\in' + intervalle + '$ : $' + FACTEUR_P + '$ est ' + signe_txt('u') + ' et $' + FACTEUR_Q
         + '$ est ' + signe_txt('w') + '.',
         'Par la **règle des signes** ' + ('du produit' if produit else 'du quotient') + ', $'
         + ('A' if produit else 'B') + '(x)$ est ' + col('\\text{strictement {{if:v>0|positif|négatif}}}')
         + '.'])


ENTRE = '\\left]{{p}}\\,;{{q}}\\right['
DEHORS = '{{if:g==0|\\left]-\\infty\\,;{{p}}\\right[|\\left]{{q}}\\,;+\\infty\\right[}}'
T_ENTRE = 'eval:(p)+1'
T_DEHORS = 'eval:((p)-1)*(1-(g))+((q)+1)*(g)'

PRODUIT_ENTRE = intervalle_variation(
    'On considère $A(x)=(' + FACTEUR_P + ')(' + FACTEUR_Q + ')$.', 'A', ENTRE, T_ENTRE, 'produit')
PRODUIT_DEHORS = intervalle_variation(
    'On considère $A(x)=(' + FACTEUR_P + ')(' + FACTEUR_Q + ')$.', 'A', DEHORS, T_DEHORS, 'produit')
PRODUIT_DEHORS['variables'].insert(0, var('g', '0|1'))

SP_PV = {'a': 2, 'r1': 3, 'b': -6, 'c': -1, 'r2': -2, 'd': -2, 'x0': 1, 'u': -4, 'w': -3, 'v': 12}
SP_PV2 = {'a': 1, 'r1': 4, 'b': -4, 'c': 3, 'r2': -1, 'd': 3, 'x0': 2, 'u': -2, 'w': 9, 'v': -18}
SP_PR = {'a': 2, 'r1': 3, 'b': -6, 'c': -1, 'r2': -2, 'd': -2}
SP_PE = {'p': -1, 'k': 3, 'q': 2, 's1': 1, 's2': 1, 't': 0, 'u': 1, 'w': -2, 'v': -2}
SP_PE2 = {'p': -1, 'k': 3, 'q': 2, 's1': 1, 's2': -1, 't': 0, 'u': 1, 'w': 2, 'v': 2}
SP_PD = {'g': 1, 'p': -1, 'k': 3, 'q': 2, 's1': 1, 's2': 1, 't': 3, 'u': 4, 'w': 1, 'v': 4}
SP_PD2 = {'g': 0, 'p': -1, 'k': 3, 'q': 2, 's1': -1, 's2': 1, 't': -2, 'u': 1, 'w': -4, 'v': -4}
MODELES.append(modele(
    '05-signe-d-un-produit', 'Signe d\'un produit, sans tableau',
    'Signe de (ax + b)(cx + d) en une valeur (facteur nul compris) et sur un intervalle, par la règle des'
    ' signes (pièges : un facteur oublié, « nul » pour une valeur qui n\'annule rien, signe de p − x)',
    ('Calcul littéral', 'Inéquations', 'Produit et quotient'), 1,
    [PRODUIT_VALEUR, PRODUIT_RACINE, PRODUIT_ENTRE, PRODUIT_DEHORS],
    [spec('(2x − 6)(−x − 2) en 1 : (−4)(−3) > 0', 0, SP_PV, '0', 'correct'),
     spec('Erreur : négatif', 0, SP_PV, '1', 'incorrect'),
     spec('(x − 4)(3x + 3) en 2 : (−2)(9) < 0', 0, SP_PV2, '1', 'correct'),
     spec('En la racine 3 : nul', 1, SP_PR, '2', 'correct'),
     spec('Erreur : positif', 1, SP_PR, '0', 'incorrect'),
     spec('(x + 1)(x − 2) sur ]−1 ; 2[ : négatif', 2, SP_PE, '1', 'correct'),
     spec('Erreur : positif', 2, SP_PE, '0', 'incorrect'),
     spec('(x + 1)(2 − x) sur ]−1 ; 2[ : positif', 2, SP_PE2, '0', 'correct'),
     spec('(x + 1)(x − 2) sur ]2 ; +∞[ : positif', 3, SP_PD, '0', 'correct'),
     spec('(−1 − x)(x − 2) sur ]−∞ ; −1[ : négatif', 3, SP_PD2, '1', 'correct'),
     spec('Erreur : positif', 3, SP_PD2, '0', 'incorrect')]))

# =============================================================================================
# 6. 2-426 : signe de A(x)/B(x), sans tableau
# =============================================================================================

# Écrit à la main : la formule maison garderait les parenthèses dans la fraction
QUOTIENT = ('\\dfrac{ ' + coef('a') + 'x{{b;+}} }{ ' + coef('c') + 'x{{d;+}} }')
QUOTIENT_COND = ['r1 != r2', 'r1 != 0', 'r2 != 0']

QUOTIENT_VALEUR = variation(
    'On considère $B(x)=' + QUOTIENT + '$.\n\n'
    + choix('Sans calculer le quotient, quel est le signe de $B({{x0}})$ ?', SIGNE_NOMBRE, melanger=False),
    FACTEURS + [var('x0', '-6..6'), var('u', VAL_A), var('w', VAL_C), var('v', 'eval:(u)*(w)')],
    [case('{{if:v>0|0|1}}')],
    ['En $x={{x0}}$, le numérateur $' + F1 + '$ vaut ${{u}}$ et le dénominateur $' + F2 + '$ vaut ${{w}}$.',
     'Numérateur ' + signe_txt('u') + ', dénominateur ' + signe_txt('w') + ' : par la **règle des signes**,'
     ' $B({{x0}})$ est ' + col('\\text{strictement {{if:v>0|positif|négatif}}}') + '.'],
    QUOTIENT_COND + ['x0 != r1', 'x0 != r2'])

QUOTIENT_NUL = variation(
    'On considère $B(x)=' + QUOTIENT + '$.\n\n'
    + choix('Quel est le signe de $B({{r1}})$ ?', SIGNE_NOMBRE, melanger=False),
    FACTEURS,
    [case('2')],
    ['En $x={{r1}}$, le numérateur $' + F1 + '$ vaut $0$ et le dénominateur $' + F2 + '$ vaut'
     ' ${{eval:(c)*(r1)+(d)}}\\neq 0$.',
     'Un quotient de numérateur nul est nul : $B({{r1}})$ est ' + col('\\text{nul}') + '.'],
    QUOTIENT_COND)

QUOTIENT_INTERDIT = variation(
    'On considère $B(x)=' + QUOTIENT + '$.\n\n'
    + choix('Quel est le signe de $B({{r2}})$ ?', SIGNE_NOMBRE, melanger=False),
    FACTEURS,
    [case('3')],
    ['En $x={{r2}}$, le dénominateur $' + F2 + '$ vaut $0$.',
     'On ne divise pas par $0$ : $B({{r2}})$ ' + col('\\text{n\'existe pas}') + ' ($' + '{{r2}}' + '$ est une'
     ' **valeur interdite**).'],
    QUOTIENT_COND)

QUOTIENT_I = '\\dfrac{ ' + FACTEUR_P + ' }{ ' + FACTEUR_Q + ' }'
QUOTIENT_ENTRE = intervalle_variation('On considère $B(x)=' + QUOTIENT_I + '$.', 'B', ENTRE, T_ENTRE,
                                      'quotient')
QUOTIENT_DEHORS = intervalle_variation('On considère $B(x)=' + QUOTIENT_I + '$.', 'B', DEHORS, T_DEHORS,
                                       'quotient')
QUOTIENT_DEHORS['variables'].insert(0, var('g', '0|1'))
for v in (QUOTIENT_ENTRE, QUOTIENT_DEHORS):
    v['conditions'] = ['p != 0', 'q != 0']

MODELES.append(modele(
    '06-signe-d-un-quotient', 'Signe d\'un quotient, sans tableau',
    'Signe de (ax + b)/(cx + d) en une valeur (numérateur nul, valeur interdite compris) et sur un'
    ' intervalle, par la règle des signes (pièges : « nul » à la valeur interdite, dénominateur oublié)',
    ('Calcul littéral', 'Inéquations', 'Produit et quotient'), 2,
    [QUOTIENT_VALEUR, QUOTIENT_NUL, QUOTIENT_INTERDIT, QUOTIENT_ENTRE, QUOTIENT_DEHORS],
    [spec('(2x − 6)/(−x − 2) en 1 : (−4)/(−3) > 0', 0, SP_PV, '0', 'correct'),
     spec('Erreur : négatif', 0, SP_PV, '1', 'incorrect'),
     spec('(x − 4)/(3x + 3) en 2 : négatif', 0, SP_PV2, '1', 'correct'),
     spec('Numérateur nul en 3 : nul', 1, SP_PR, '2', 'correct'),
     spec('Erreur : n\'existe pas', 1, SP_PR, '3', 'incorrect'),
     spec('Valeur interdite −2 : n\'existe pas', 2, SP_PR, '3', 'correct'),
     spec('Erreur : nul à la valeur interdite', 2, SP_PR, '2', 'incorrect'),
     spec('(x + 1)/(x − 2) sur ]−1 ; 2[ : négatif', 3, SP_PE, '1', 'correct'),
     spec('(x + 1)/(2 − x) sur ]−1 ; 2[ : positif', 3, SP_PE2, '0', 'correct'),
     spec('(x + 1)/(x − 2) sur ]2 ; +∞[ : positif', 4, SP_PD, '0', 'correct'),
     spec('Erreur : négatif', 4, SP_PD, '1', 'incorrect')]))

os.makedirs(DOSSIER, exist_ok=True)
for nom, m in MODELES:
    with open(os.path.join(DOSSIER, nom + '.json'), 'w', encoding='utf-8') as f:
        json.dump(m, f, ensure_ascii=False, indent='\t')
        f.write('\n')
# Mis en forme comme le pre-commit, pour que le script redonne les fichiers commités
subprocess.run(['pnpm', 'exec', 'prettier', '--write', DOSSIER], check=True,
               stdout=subprocess.DEVNULL)
print(f'{len(MODELES)} modèles écrits dans {DOSSIER}')
