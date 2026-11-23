"""Écrit les 6 modèles du lot 6 B « Fonctions de référence : résolutions algébriques (affine, |x|,
carré, inverse) » de la 2de dans scripts/questions/2de-fonctions-b/.

Phase 0 validée par David le 2026-11-01 (§ 37 du journal `docs/wip/questions-2de-progress.md`).
Bornes : `bornes/lycee/2de.json` (2-455, 2-457, 2-460, 2-461, 2-463, 2-466) ; l2-1 (|x| < k
seulement, pas |2x − 1| < 3) ; l2-3 (les quatre sens). Un point par modèle ; le nœud et le tag sont
posés par la migration de rangement, après le `--publier` de David.

Catégories : sous-catégorie « Résolution algébrique » de chaque fonction (niveau 1 = équation,
2 = inéquation ; |x| et 1/x n'ont ici que l'inéquation, niveau 1 : |x| = k est 2-458, 62b99aa7, et
1/x = k est 2-464, déjà couverts).

Décisions et pièges (en plus de ceux des lots 2, 2 bis et 6 A) :
- réponse en ensemble : case `answerKind: 'intervalles'` ; 2-455 « antécédent » en case nombre ;
- sens de l'inégalité tiré (`s` : 0 <, 1 ⩽, 2 >, 3 ⩾) ; fonction décroissante = sens inversé ;
- corrigé des inéquations : courbe + droite y = k en pointillé, partie cherchée repassée en vert
  (courbe et axe des abscisses) ; une borne hors fenêtre (±20) n'a pas de disque ;
- |x| < k : la distance à 0 dite dans le corrigé ; ` ```line ` ne trace pas d'intervalle, d'où la
  courbe du V avec l'ensemble repassé sur l'axe des abscisses ;
- dans les blocs, les valeurs restent des expressions (`1/(k)`, `p/q`, `sqrt(a)`) : un `eval`
  rendrait `\\dfrac`, que le bloc ne lit pas ;
- jamais de `|` dans un `{{if:…}}` (séparateur) : valeur absolue écrite `\\lvert x\\rvert` ;
- les variables sont substituées telles quelles dans les `eval` : toujours `(a)`, `-(a)` ;
- variables `e` et `i` interdites.

    python3 docs/wip/questions-2de/lot-fonctions-b-2de.py scripts/questions/2de-fonctions-b
"""
import json
import os
import subprocess
import sys

DOSSIER = sys.argv[1]
THEME = 'Fonctions'
AFFINE = ('Fonctions affines', 'Résolution algébrique')
VALEUR_ABSOLUE = ('Valeur absolue', 'Résolution algébrique')
CARRE = ('Fonction carré', 'Résolution algébrique')
INVERSE = ('Fonction inverse', 'Résolution algébrique')


def spec(desc, vi, variables, answers, status, violations=None):
    s = {'description': desc, 'variationIndex': vi,
         'variables': {k: str(v) for k, v in variables.items()},
         'answers': answers if isinstance(answers, list) else [answers],
         'expected': {'status': status}}
    if violations:
        s['expected']['constraintViolations'] = violations
    return s


def modele(nom, title, description, categorie, level, variations, specs, delay=60):
    m = {'title': title, 'description': description, 'grades': ['2'], 'theme': THEME,
         'domain': categorie[0], 'subdomain': categorie[1], 'level': level, 'delay': delay,
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


def selon(nom, valeurs, debut=0):
    """`{{if:nom==debut|v0|{{if:nom==debut+1|v1|…}}}}` ; la dernière valeur est le « sinon »."""
    texte = valeurs[-1]
    for k in range(len(valeurs) - 2, -1, -1):
        texte = '{{if:' + nom + '==' + str(debut + k) + '|' + valeurs[k] + '|' + texte + '}}'
    return texte


def col(x, k=0):
    return '\\textcolor{{{color:primary.' + str(k) + '}}}{' + x + '}'


def conclusion(ensemble):
    return '$S=' + col(ensemble) + '$.'


def courbe(x, y, lignes, description, points=None, grille=None):
    """Bloc ```courbe : fenêtre, grille (automatique si None), une ligne par fonction."""
    texte = '```courbe\nx: ' + x + '\ny: ' + y + '\n'
    if grille:
        texte += 'grille: ' + grille + '\n'
    texte += ''.join(ligne + '\n' for ligne in lignes)
    if points:
        texte += 'points: ' + points + '\n'
    return texte + 'taille: moyenne\ndescription: ' + description + '\n```'


S_EGAL = '\n\nL\'ensemble des solutions est $S=?$.'

# --- Inégalités : sens tiré par `s` (0 <, 1 ⩽, 2 >, 3 ⩾) ------------------------------------

SENS = ['<', '\\leqslant ', '>', '\\geqslant ']
SENS_INVERSE = ['>', '\\geqslant ', '<', '\\leqslant ']


def signe(inverse=False):
    return selon('s', SENS_INVERSE if inverse else SENS)


POSITION = ['**strictement sous**', '**sous ou sur**', '**strictement au-dessus de**',
            '**au-dessus ou sur**']
BORNES = ['les abscisses des points d\'intersection sont **exclues**',
          'les abscisses des points d\'intersection sont **comprises**',
          'les abscisses des points d\'intersection sont **exclues**',
          'les abscisses des points d\'intersection sont **comprises**']
BORNE_A = ['l\'abscisse de $A$ est **exclue**', 'l\'abscisse de $A$ est **comprise**',
           'l\'abscisse de $A$ est **exclue**', 'l\'abscisse de $A$ est **comprise**']
AXE_VERT = ' L\'ensemble des solutions est repassé en vert sur l\'axe des abscisses.'


def intervalles(r):
    """Ensembles de x < r, x ⩽ r, x > r, x ⩾ r (réponse attendue)."""
    return [']-\\infty;' + r + '[', ']-\\infty;' + r + ']', ']' + r + ';+\\infty[',
            '[' + r + ';+\\infty[']


def interieur(a, b, large):
    return ('[' if large else ']') + a + ';' + b + (']' if large else '[')


def exterieur(a, b, large):
    """]−∞ ; a[ ∪ ]b ; +∞[ (crochets en a et b selon `large`)."""
    return (']-\\infty;' + a + (']' if large else '[') + '\\cup'
            + ('[' if large else ']') + b + ';+\\infty[')


def entre_ou_dehors(a, b):
    """Ensembles pour s = 0..3 quand f − k est négatif ENTRE a et b."""
    return [interieur(a, b, False), interieur(a, b, True), exterieur(a, b, False),
            exterieur(a, b, True)]


def affiche(ensemble):
    """Écriture du corrigé : `\\left]…\\right[`, espace fine après le « ; »."""
    out = ensemble.replace(';', '\\,;')
    joli = []
    for m in out.split('\\cup'):
        joli.append('\\left' + m[0] + m[1:-1] + '\\right' + m[-1])
    return '\\cup'.join(joli)


def vert(nom, expression, intervalle):
    """Ligne repassée en vert sur un intervalle écrit `]a ; b]` ; ' ' = pas de ligne."""
    if not intervalle:
        return ' '
    return nom + '(x) = ' + expression + ' sur ' + intervalle + '   vert'


def lignes_vertes(expr, morceaux):
    """`morceaux[s]` = un ou deux intervalles (forme du bloc) pour s = 0..3 : chaque morceau
    repassé en vert sur la courbe (h, j) et sur l'axe des abscisses (t, u)."""
    lignes = []
    for i, (n_courbe, n_axe) in enumerate((('h', 't'), ('j', 'u'))):
        par_sens = [m[i] if i < len(m) else '' for m in morceaux]
        lignes.append(selon('s', [vert(n_courbe, expr, x) for x in par_sens]))
        lignes.append(selon('s', [vert(n_axe, '0', x) for x in par_sens]))
    return lignes


def morceaux_entre_ou_dehors(a, b):
    """Intervalles du bloc pour s = 0..3, négatif entre a et b ; ±20 = hors fenêtre."""
    return [[']' + a + ' ; ' + b + '['], ['[' + a + ' ; ' + b + ']'],
            ['[-20 ; ' + a + '[', ']' + b + ' ; 20]'], ['[-20 ; ' + a + ']', '[' + b + ' ; 20]']]


def morceaux_sous(r, inverse=False):
    """Intervalles du bloc pour x < r, x ⩽ r, x > r, x ⩾ r (inversés si `inverse`)."""
    liste = [['[-20 ; ' + r + '['], ['[-20 ; ' + r + ']'], [']' + r + ' ; 20]'], ['[' + r + ' ; 20]']]
    return liste[2:] + liste[:2] if inverse else liste


X = var('x', 'x|x')
MODELES = []

# =============================================================================================
# 1. 2-455 et 2. 2-457 : fonctions affines
# =============================================================================================

F_AFFINE = ('On considère la fonction affine $f$ définie sur $\\mathbb{R}$ par'
            ' $f(x)={{eval:(m)*x+(p)}}$.\n\n')
EQ_METHODE = ('On remplace $f(x)$ par son expression : on résout une équation du premier degré. $f$ est'
              ' affine et non constante, l\'équation a **une seule** solution.')


def eq_affine(r, avec_fraction):
    calcul = ('$${{eval:(m)*x+(p)}}={{k}}\\iff {{eval:(m)*x}}={{eval:(k)-(p)}}\\iff x='
              + ('\\dfrac{ {{eval:(k)-(p)}} }{ {{m}} }=' if avec_fraction else '') + r + '$$')
    return calcul


EQ_ENTIERE = variation(
    F_AFFINE + 'Résous dans $\\mathbb{R}$ l\'équation $f(x)={{k}}$.' + S_EGAL,
    [X, var('m', '2..9;±'), var('r', '-9..9!0'), var('p', '1..9;±'), var('k', 'eval:(m)*(r)+(p)')],
    [case_ens('\\{ {{r}} \\}')],
    [EQ_METHODE, eq_affine('{{r}}', False), conclusion('\\{ {{r}} \\}')])

EQ_FRACTION = variation(
    F_AFFINE + 'Résous dans $\\mathbb{R}$ l\'équation $f(x)={{k}}$.' + S_EGAL,
    [X, var('m', '2..9;±'), var('p', '1..9;±'), var('k', '-9..9')],
    [case_ens('\\{ {{eval:((k)-(p))/(m)}} \\}')],
    [EQ_METHODE, eq_affine('{{eval:((k)-(p))/(m)}}', True),
     conclusion('\\left\\{ {{eval:((k)-(p))/(m)}} \\right\\}')],
    ['mod((k)-(p), m) != 0'])

ANTECEDENT = variation(
    F_AFFINE + 'Détermine l\'antécédent de ${{k}}$ par $f$.\n\nL\'antécédent de ${{k}}$ par $f$ est $?$',
    [X, var('m', '2..5;±'), var('p', '1..9;±'), var('k', '-9..9')],
    [case('{{eval:((k)-(p))/(m)}}')],
    ['Un antécédent de ${{k}}$ est un nombre $x$ tel que $f(x)={{k}}$ : on résout cette équation.',
     eq_affine(col('{{eval:((k)-(p))/(m)}}'), False),
     '$f$ est affine et non constante : ${{k}}$ a **un seul** antécédent.'],
    ['k != p'])

SP_EE = {'m': 3, 'r': 4, 'p': -2, 'k': 10}
SP_EF = {'m': -4, 'p': 1, 'k': 7}
SP_AN = {'m': 2, 'p': -5, 'k': 3}
MODELES.append(modele(
    '01-affine-equation-f-egal-k', 'Résoudre f(x) = k (fonction affine)',
    'Fonction affine donnée par son expression : résoudre f(x) = k (solution entière, puis'
    ' fractionnaire) ; antécédent de k (pièges : signe en changeant de membre, f(k) au lieu de'
    ' résoudre, « 4 » sans accolades)',
    AFFINE, 1, [EQ_ENTIERE, EQ_FRACTION, ANTECEDENT],
    [spec('3x − 2 = 10 : S = {4}', 0, SP_EE, '\\{4\\}', 'correct'),
     spec('Erreur : signe en changeant de membre {8/3}', 0, SP_EE, '\\{\\frac{8}{3}\\}', 'incorrect'),
     spec('Erreur : f(10) = 28', 0, SP_EE, '\\{28\\}', 'incorrect'),
     spec('Erreur : sans accolades', 0, SP_EE, '4', 'incorrect'),
     spec('−4x + 1 = 7 : S = {−3/2}', 1, SP_EF, '\\{-\\frac{3}{2}\\}', 'correct'),
     spec('En décimal {−1,5}', 1, SP_EF, '\\{-1{,}5\\}', 'correct'),
     spec('Erreur : signe perdu {3/2}', 1, SP_EF, '\\{\\frac{3}{2}\\}', 'incorrect'),
     spec('Erreur : signe en changeant de membre {−2}', 1, SP_EF, '\\{-2\\}', 'incorrect'),
     spec('2x − 5 = 3 : antécédent 4', 2, SP_AN, '4', 'correct'),
     spec('Erreur : image f(3) = 1', 2, SP_AN, '1', 'incorrect'),
     spec('Erreur : signe (−1)', 2, SP_AN, '-1', 'incorrect')]))


def ineq_affine(m_plage, positif):
    inverse = not positif
    return variation(
        F_AFFINE + 'Résous dans $\\mathbb{R}$ l\'inéquation $f(x)' + signe() + '{{k}}$.' + S_EGAL,
        [X, var('m', m_plage), var('r', '-4..4'), var('k', '-4..4'), var('p', 'eval:(k)-(m)*(r)'),
         var('s', '0..3')],
        [case_ens(selon('s', intervalles('{{r}}')[2:] + intervalles('{{r}}')[:2] if inverse
                        else intervalles('{{r}}')))],
        ['$${{eval:(m)*x+(p)}}' + signe() + '{{k}}\\iff {{eval:(m)*x}}' + signe() + '{{eval:(k)-(p)}}$$',
         ('On divise les deux membres par ${{m}}$, un nombre **positif** : le sens **ne change pas**.'
          if positif else
          'On divise les deux membres par ${{m}}$, un nombre **négatif** : le sens **change**.')
         + ' $x' + signe(inverse) + '{{r}}$.',
         'Sur le graphique : $f$ est ' + ('**croissante**' if positif else '**décroissante**')
         + ', sa droite coupe la droite d\'équation $y={{k}}$ en $A$, d\'abscisse ${{r}}$ ; on garde les'
         ' abscisses des points de la droite de $f$ situés ' + selon('s', POSITION) + ' la droite'
         ' $y={{k}}$ ; ' + selon('s', BORNE_A) + '.',
         courbe('-6 ; 6', '-6 ; 6',
                ['f(x) = {{m}}*x+({{p}})   bleu   nom=C_f', 'g(x) = {{k}}   rouge   pointillé']
                + lignes_vertes('{{m}}*x+({{p}})', morceaux_sous('{{r}}', inverse)),
                'Droite représentant la fonction affine f, droite horizontale y = {{k}} en pointillé,'
                ' partie cherchée en vert.' + AXE_VERT,
                'A({{r}} ; {{k}})', '1 ; 1'),
         conclusion(selon('s', [affiche(x) for x in (intervalles('{{r}}')[2:] + intervalles('{{r}}')[:2]
                                                     if inverse else intervalles('{{r}}'))]))],
        ['(k)-(m)*(r) != 0'])


SP_IP = {'m': 2, 'r': 3, 'k': 1, 'p': -5, 's': 0}
SP_IN = {'m': -3, 'r': -1, 'k': 2, 'p': -1, 's': 3}
SP_IN2 = {'m': -2, 'r': 2, 'k': -1, 'p': 3, 's': 0}
MODELES.append(modele(
    '02-affine-inequation-f-inferieur-k', 'Résoudre f(x) < k (fonction affine)',
    'Fonction affine donnée par son expression : résoudre f(x) < k, coefficient directeur positif puis'
    ' négatif (le sens change), les quatre sens (pièges : sens non changé, crochet, signe en changeant'
    ' de membre)',
    AFFINE, 2, [ineq_affine('2..3', True), ineq_affine('-3..-2', False)],
    [spec('2x − 5 < 1 : S = ]−∞ ; 3[', 0, SP_IP, ']-\\infty;3[', 'correct'),
     spec('Erreur : crochet fermé', 0, SP_IP, ']-\\infty;3]', 'incorrect'),
     spec('Erreur : signe en changeant de membre ]−∞ ; −2[', 0, SP_IP, ']-\\infty;-2[', 'incorrect'),
     spec('Erreur : mauvais côté ]3 ; +∞[', 0, SP_IP, ']3;+\\infty[', 'incorrect'),
     spec('−3x − 1 ⩾ 2 : S = ]−∞ ; −1]', 1, SP_IN, ']-\\infty;-1]', 'correct'),
     spec('Erreur : sens non changé [−1 ; +∞[', 1, SP_IN, '[-1;+\\infty[', 'incorrect'),
     spec('Erreur : crochet ouvert', 1, SP_IN, ']-\\infty;-1[', 'incorrect'),
     spec('−2x + 3 < −1 : S = ]2 ; +∞[', 1, SP_IN2, ']2;+\\infty[', 'correct'),
     spec('Erreur : sens non changé ]−∞ ; 2[', 1, SP_IN2, ']-\\infty;2[', 'incorrect')],
    delay=90))

# =============================================================================================
# 3. 2-460 : |x| < k
# =============================================================================================

ABS_ENONCE = ('Résous dans $\\mathbb{R}$ l\'inéquation $\\lvert x\\rvert' + signe() + '{{k}}$.' + S_EGAL)
DISTANCE = ('$\\lvert x\\rvert$ est la **distance** entre $x$ et $0$ sur la droite graduée.')
DISTANCE_SENS = ['les nombres à une distance de $0$ **strictement inférieure** à ${{k}}$ : ceux situés'
                 ' strictement entre $-{{k}}$ et ${{k}}$',
                 'les nombres à une distance de $0$ **inférieure ou égale** à ${{k}}$ : ceux situés'
                 ' entre $-{{k}}$ et ${{k}}$, bornes comprises',
                 'les nombres à une distance de $0$ **strictement supérieure** à ${{k}}$ : ceux situés'
                 ' strictement avant $-{{k}}$ ou strictement après ${{k}}$',
                 'les nombres à une distance de $0$ **supérieure ou égale** à ${{k}}$ : ceux situés'
                 ' avant $-{{k}}$ ou après ${{k}}$, bornes comprises']
ENS_ABS = entre_ou_dehors('-{{k}}', '{{k}}')

ABS_POSITIF = variation(
    ABS_ENONCE,
    [var('k', '1..6'), var('s', '0..3')],
    [case_ens(selon('s', ENS_ABS))],
    [DISTANCE + ' On cherche ' + selon('s', DISTANCE_SENS) + '.',
     courbe('-8 ; 8', '-2 ; 8',
            ['f(x) = abs(x)   bleu   nom=C_f', 'g(x) = {{k}}   rouge   pointillé']
            + lignes_vertes('abs(x)', morceaux_entre_ou_dehors('-{{k}}', '{{k}}')),
            'Courbe de la valeur absolue, droite y = {{k}} en pointillé, partie cherchée en vert.'
            + AXE_VERT,
            'A({{eval:-(k)}} ; {{k}}), B({{k}} ; {{k}})', '1 ; 1'),
     'Sur la courbe de $x\\mapsto\\lvert x\\rvert$, on lit la même chose : les points situés '
     + selon('s', POSITION) + ' la droite $y={{k}}$ ; ' + selon('s', BORNES) + '.',
     conclusion(selon('s', [affiche(x) for x in ENS_ABS]))])

ABS_NEGATIF = variation(
    ABS_ENONCE,
    [var('k', '-9..-1'), var('s', '0..3')],
    [case_ens(selon('s', ['\\varnothing', '\\varnothing', '\\mathbb{R}', '\\mathbb{R}']))],
    [DISTANCE + ' Une distance n\'est **jamais négative** : pour tout réel $x$,'
     ' $\\lvert x\\rvert\\geqslant 0>{{k}}$.',
     selon('s', ['Aucun réel n\'est solution. ' + conclusion('\\varnothing'),
                 'Aucun réel n\'est solution. ' + conclusion('\\varnothing'),
                 'Tous les réels sont solutions. ' + conclusion('\\mathbb{R}'),
                 'Tous les réels sont solutions. ' + conclusion('\\mathbb{R}')])])

ABS_NUL = variation(
    'Résous dans $\\mathbb{R}$ l\'inéquation $\\lvert x\\rvert' + signe() + '0$.' + S_EGAL,
    [var('s', '0..3')],
    [case_ens(selon('s', ['\\varnothing', '\\{0\\}', '\\mathbb{R}\\setminus\\{0\\}', '\\mathbb{R}']))],
    [DISTANCE + ' Elle n\'est jamais négative, et elle vaut $0$ seulement pour $x=0$.',
     selon('s', ['Aucune distance n\'est strictement négative : aucun réel n\'est solution. '
                 + conclusion('\\varnothing'),
                 'Une distance ne peut être que nulle : seul $0$ est solution. ' + conclusion('\\{0\\}'),
                 'La distance est strictement positive pour tout $x$ sauf $0$. '
                 + conclusion('\\mathbb{R}\\setminus\\{0\\}'),
                 'Une distance est toujours positive ou nulle : tous les réels sont solutions. '
                 + conclusion('\\mathbb{R}')])])

SP_AL = {'k': 3, 's': 1}
SP_AD = {'k': 5, 's': 2}
SP_AV = {'k': -2, 's': 0}
SP_AT = {'k': -2, 's': 3}
MODELES.append(modele(
    '03-inequation-valeur-absolue', 'Résoudre |x| < k',
    'Inéquation |x| < k par la distance à 0 : k > 0 (entre −k et k, ou en dehors, les quatre sens),'
    ' k < 0 (∅ ou ℝ), k = 0 ({0}, ℝ \\ {0}, ∅, ℝ) (pièges : un seul côté, crochets, ∅ et ℝ confondus)',
    VALEUR_ABSOLUE, 1, [ABS_POSITIF, ABS_NEGATIF, ABS_NUL],
    [spec('|x| ⩽ 3 : S = [−3 ; 3]', 0, SP_AL, '[-3;3]', 'correct'),
     spec('Erreur : crochets ouverts', 0, SP_AL, ']-3;3[', 'incorrect'),
     spec('Erreur : ]−∞ ; 3]', 0, SP_AL, ']-\\infty;3]', 'incorrect'),
     spec('|x| > 5 : S = ]−∞ ; −5[ ∪ ]5 ; +∞[', 0, SP_AD, ']-\\infty;-5[\\cup]5;+\\infty[', 'correct'),
     spec('Erreur : ]5 ; +∞[ seulement', 0, SP_AD, ']5;+\\infty[', 'incorrect'),
     spec('Erreur : ]−5 ; 5[', 0, SP_AD, ']-5;5[', 'incorrect'),
     spec('|x| < −2 : S = ∅', 1, SP_AV, '\\varnothing', 'correct'),
     spec('Erreur : ]−2 ; 2[', 1, SP_AV, ']-2;2[', 'incorrect'),
     spec('|x| ⩾ −2 : S = ℝ', 1, SP_AT, '\\mathbb{R}', 'correct'),
     spec('Erreur : ∅', 1, SP_AT, '\\varnothing', 'incorrect'),
     spec('|x| ⩽ 0 : S = {0}', 2, {'s': 1}, '\\{0\\}', 'correct'),
     spec('Erreur : ∅', 2, {'s': 1}, '\\varnothing', 'incorrect'),
     spec('|x| > 0 : S = ℝ \\ {0}', 2, {'s': 2}, '\\mathbb{R}\\setminus\\{0\\}', 'correct'),
     spec('Réunion ]−∞ ; 0[ ∪ ]0 ; +∞[', 2, {'s': 2}, ']-\\infty;0[\\cup]0;+\\infty[', 'correct'),
     spec('Erreur : ℝ', 2, {'s': 2}, '\\mathbb{R}', 'incorrect')],
    delay=75))

# =============================================================================================
# 4. 2-461 : x² = k (antécédents par la fonction carré) et 5. 2-463 : x² < k
# =============================================================================================

F_CARRE = 'On note $f$ la fonction carré : $f(x)=x^2$.\n\n'
SYMETRIE = ('La parabole de la fonction carré est **symétrique** par rapport à l\'axe des ordonnées :'
            ' $(-a)^2=a^2$, donc si $a$ est un antécédent, $-a$ aussi. La droite $y=k$ (avec $k>0$)'
            ' coupe la parabole en **deux** points symétriques.')


def antecedents(k_tex):
    return (F_CARRE + 'Détermine les antécédents de $' + k_tex + '$ par $f$, c\'est-à-dire résous dans'
            ' $\\mathbb{R}$ l\'équation $x^2=' + k_tex + '$.' + S_EGAL)


def deux_points(x, y, k_bloc, a_bloc, description):
    return courbe(x, y, ['f(x) = x^2   bleu   nom=C_f', 'g(x) = ' + k_bloc + '   rouge   pointillé'],
                  description, 'A(-(' + a_bloc + ') ; ' + k_bloc + '), B(' + a_bloc + ' ; ' + k_bloc + ')')


K_FRAC = '\\dfrac{ {{eval:(p)^2}} }{ {{eval:(q)^2}} }'
ANT_FRACTION = variation(
    antecedents(K_FRAC),
    [var('p', '1..5'), var('q', '2..5')],
    [case_ens('\\{ {{eval:-(p)/(q)}} ; {{eval:(p)/(q)}} \\}')],
    [SYMETRIE,
     '$\\left(\\dfrac{ {{p}} }{ {{q}} }\\right)^2=\\dfrac{ {{eval:(p)^2}} }{ {{eval:(q)^2}} }$ : $\\dfrac{ {{p}} }'
     '{ {{q}} }$ est un antécédent, et son opposé $-\\dfrac{ {{p}} }{ {{q}} }$ aussi.',
     deux_points('-3 ; 3', '-1 ; 7', '{{eval:(p)^2}}/{{eval:(q)^2}}', '{{p}}/{{q}}',
                 'Parabole de la fonction carré et droite horizontale en pointillé, qui la coupe en deux'
                 ' points A et B symétriques par rapport à l\'axe des ordonnées.'),
     conclusion('\\left\\{ -\\dfrac{ {{p}} }{ {{q}} }\\,;\\dfrac{ {{p}} }{ {{q}} } \\right\\}')],
    ['gcd(p, q) == 1'])

ANT_DECIMAL = variation(
    antecedents('{{eval:(n)^2/100;d}}'),
    [var('n', '2..15!10')],
    [case_ens('\\{ {{eval:-(n)/10;d}} ; {{eval:(n)/10;d}} \\}')],
    [SYMETRIE,
     '${{eval:(n)/10;d}}^2={{eval:(n)^2/100;d}}$ : ${{eval:(n)/10;d}}$ est un antécédent, et son opposé'
     ' ${{eval:-(n)/10;d}}$ aussi. (Le carré a deux fois plus de chiffres après la virgule.)',
     deux_points('-2 ; 2', '-0.5 ; 2.5', '({{n}}/10)^2', '{{n}}/10',
                 'Parabole de la fonction carré et droite horizontale en pointillé, qui la coupe en deux'
                 ' points A et B symétriques par rapport à l\'axe des ordonnées.'),
     conclusion('\\{ {{eval:-(n)/10;d}}\\,;{{eval:(n)/10;d}} \\}')])

ANT_DECALE = variation(
    'On considère la fonction $f$ définie sur $\\mathbb{R}$ par $f(x)=x^2{{c;+}}$.\n\nDétermine les'
    ' antécédents de ${{k}}$ par $f$, c\'est-à-dire résous dans $\\mathbb{R}$ l\'équation $f(x)={{k}}$.'
    + S_EGAL,
    [var('c', '1..4;±'), var('r', '1..3'), var('k', 'eval:(r)^2+(c)')],
    [case_ens('\\{ {{eval:-(r)}} ; {{r}} \\}')],
    ['On se ramène à la fonction carré :',
     '$$x^2{{c;+}}={{k}}\\iff x^2={{eval:(r)^2}}$$',
     'Les antécédents de ${{eval:(r)^2}}$ par la fonction carré sont ${{r}}$ et $-{{r}}$ (la parabole'
     ' est symétrique par rapport à l\'axe des ordonnées).',
     courbe('-4 ; 4', '{{eval:min(0,(c))-2}} ; {{eval:(k)+2}}',
            ['f(x) = x^2+({{c}})   bleu   nom=C_f', 'g(x) = {{k}}   rouge   pointillé'],
            'Parabole de f et droite horizontale y = {{k}} en pointillé, qui la coupe en deux points A et B'
            ' symétriques par rapport à l\'axe des ordonnées.',
            'A({{eval:-(r)}} ; {{k}}), B({{r}} ; {{k}})'),
     conclusion('\\{ -{{r}}\\,;{{r}} \\}')])

SP_FR = {'p': 3, 'q': 2}
SP_DE = {'n': 12}
SP_DC = {'c': -3, 'r': 2, 'k': 1}
MODELES.append(modele(
    '04-antecedents-par-la-fonction-carre', 'Antécédents par la fonction carré',
    'Antécédents de k par x ↦ x² : k fraction (9/4), décimal (1,44), puis f(x) = x² + c = k ; deux'
    ' antécédents opposés, symétrie de la parabole (pièges : l\'antécédent négatif oublié, k/2, c'
    ' oublié, 1,2² = 1,44 pris pour 0,12)',
    CARRE, 1, [ANT_FRACTION, ANT_DECIMAL, ANT_DECALE],
    [spec('x² = 9/4 : S = {−3/2 ; 3/2}', 0, SP_FR, '\\{-\\frac{3}{2};\\frac{3}{2}\\}', 'correct'),
     spec('En décimal {−1,5 ; 1,5}', 0, SP_FR, '\\{-1{,}5;1{,}5\\}', 'correct'),
     spec('Erreur : l\'antécédent négatif oublié', 0, SP_FR, '\\{\\frac{3}{2}\\}', 'incorrect'),
     spec('Erreur : k/2 {−9/8 ; 9/8}', 0, SP_FR, '\\{-\\frac{9}{8};\\frac{9}{8}\\}', 'incorrect'),
     spec('x² = 1,44 : S = {−1,2 ; 1,2}', 1, SP_DE, '\\{-1{,}2;1{,}2\\}', 'correct'),
     spec('Erreur : {1,2}', 1, SP_DE, '\\{1{,}2\\}', 'incorrect'),
     spec('Erreur : virgule {−0,12 ; 0,12}', 1, SP_DE, '\\{-0{,}12;0{,}12\\}', 'incorrect'),
     spec('x² − 3 = 1 : S = {−2 ; 2}', 2, SP_DC, '\\{-2;2\\}', 'correct'),
     spec('Erreur : c oublié {−1 ; 1}', 2, SP_DC, '\\{-1;1\\}', 'incorrect'),
     spec('Erreur : {2}', 2, SP_DC, '\\{2\\}', 'incorrect')]))

# --- 5. 2-463 : x² < k ------------------------------------------------------------------------

CARRE_ENONCE = 'Résous dans $\\mathbb{R}$ l\'inéquation $x^2' + signe() + '{{k}}$.' + S_EGAL


def carre_positif(variables, racine, racine_bloc, x, y, conditions=None):
    ensembles = entre_ou_dehors('-' + racine, racine)
    return variation(
        CARRE_ENONCE,
        variables + [var('s', '0..3')],
        [case_ens(selon('s', ensembles))],
        ['Les solutions de $x^2={{k}}$ sont $-' + racine + '$ et $' + racine + '$ : sur la parabole de la'
         ' fonction carré, la droite $y={{k}}$ coupe la courbe en $A$ et $B$, d\'abscisses $-' + racine
         + '$ et $' + racine + '$.',
         'On cherche les abscisses des points de la parabole situés ' + selon('s', POSITION)
         + ' la droite ; ' + selon('s', BORNES) + '.',
         courbe(x, y, ['f(x) = x^2   bleu   nom=C_f', 'g(x) = {{k}}   rouge   pointillé']
                + lignes_vertes('x^2', morceaux_entre_ou_dehors('-' + racine_bloc, racine_bloc)),
                'Parabole de la fonction carré, droite y = {{k}} en pointillé, partie cherchée en vert.'
                + AXE_VERT,
                'A(-' + racine_bloc + ' ; {{k}}), B(' + racine_bloc + ' ; {{k}})'),
         conclusion(selon('s', [affiche(e) for e in ensembles]))],
        conditions)


CARRE_PARFAIT = carre_positif([var('n', '1..6'), var('k', 'eval:(n)^2')], '{{n}}', '{{n}}',
                              '{{eval:-(n)-2}} ; {{eval:(n)+2}}', '{{eval:-floor((n)^2/8)-1}} ; {{eval:(k)+floor((n)^2/4)+2}}')
CARRE_RACINE = carre_positif([var('k', '2..23')], '\\sqrt{ {{k}} }', 'sqrt({{k}})', '-6 ; 6', '-3 ; 27',
                             ['mod(k,4) != 0', 'mod(k,9) != 0'])

CARRE_NEGATIF = variation(
    CARRE_ENONCE,
    [var('k', '-9..-1'), var('s', '0..3')],
    [case_ens(selon('s', ['\\varnothing', '\\varnothing', '\\mathbb{R}', '\\mathbb{R}']))],
    ['Un carré n\'est **jamais négatif** : pour tout réel $x$, $x^2\\geqslant 0>{{k}}$ (la parabole est'
     ' entièrement au-dessus de la droite $y={{k}}$).',
     selon('s', ['Aucun réel n\'est solution. ' + conclusion('\\varnothing'),
                 'Aucun réel n\'est solution. ' + conclusion('\\varnothing'),
                 'Tous les réels sont solutions. ' + conclusion('\\mathbb{R}'),
                 'Tous les réels sont solutions. ' + conclusion('\\mathbb{R}')])])

CARRE_NUL = variation(
    'Résous dans $\\mathbb{R}$ l\'inéquation $x^2' + signe() + '0$.' + S_EGAL,
    [var('s', '0..3')],
    [case_ens(selon('s', ['\\varnothing', '\\{0\\}', '\\mathbb{R}\\setminus\\{0\\}', '\\mathbb{R}']))],
    ['Un carré n\'est jamais négatif, et $x^2=0$ seulement pour $x=0$.',
     selon('s', ['Aucun carré n\'est strictement négatif : ' + conclusion('\\varnothing'),
                 'Un carré négatif ou nul est nul : seul $0$ est solution. ' + conclusion('\\{0\\}'),
                 'Le carré est strictement positif pour tout $x$ sauf $0$. '
                 + conclusion('\\mathbb{R}\\setminus\\{0\\}'),
                 'Un carré est toujours positif ou nul : ' + conclusion('\\mathbb{R}')])])

SP_CI = {'n': 3, 'k': 9, 's': 0}
SP_CS = {'n': 2, 'k': 4, 's': 3}
SP_CR = {'k': 5, 's': 1}
SP_CR2 = {'k': 7, 's': 2}
SP_CN = {'k': -4, 's': 2}
MODELES.append(modele(
    '05-inequation-x-carre-inferieur-k', 'Résoudre x² < k',
    'Inéquation x² < k par la parabole : k carré parfait, k non carré (√5), les quatre sens ; k < 0'
    ' (∅ ou ℝ), k = 0 (pièges : ]−∞ ; 3[ pour x² < 9, la partie négative oubliée, crochets)',
    CARRE, 2, [CARRE_PARFAIT, CARRE_RACINE, CARRE_NEGATIF, CARRE_NUL],
    [spec('x² < 9 : S = ]−3 ; 3[', 0, SP_CI, ']-3;3[', 'correct'),
     spec('Erreur : ]−∞ ; 3[', 0, SP_CI, ']-\\infty;3[', 'incorrect'),
     spec('Erreur : ]−9 ; 9[', 0, SP_CI, ']-9;9[', 'incorrect'),
     spec('Erreur : crochets fermés', 0, SP_CI, '[-3;3]', 'incorrect'),
     spec('x² ⩾ 4 : S = ]−∞ ; −2] ∪ [2 ; +∞[', 0, SP_CS, ']-\\infty;-2]\\cup[2;+\\infty[', 'correct'),
     spec('Erreur : [2 ; +∞[ seulement', 0, SP_CS, '[2;+\\infty[', 'incorrect'),
     spec('x² ⩽ 5 : S = [−√5 ; √5]', 1, SP_CR, '[-\\sqrt{5};\\sqrt{5}]', 'correct'),
     spec('Erreur : [0 ; √5]', 1, SP_CR, '[0;\\sqrt{5}]', 'incorrect'),
     spec('x² > 7 : S = ]−∞ ; −√7[ ∪ ]√7 ; +∞[', 1, SP_CR2, ']-\\infty;-\\sqrt{7}[\\cup]\\sqrt{7};+\\infty[',
          'correct'),
     spec('Erreur : ]√7 ; +∞[', 1, SP_CR2, ']\\sqrt{7};+\\infty[', 'incorrect'),
     spec('x² > −4 : S = ℝ', 2, SP_CN, '\\mathbb{R}', 'correct'),
     spec('Erreur : ∅', 2, SP_CN, '\\varnothing', 'incorrect'),
     spec('x² ⩽ 0 : S = {0}', 3, {'s': 1}, '\\{0\\}', 'correct'),
     spec('Erreur : ∅', 3, {'s': 1}, '\\varnothing', 'incorrect'),
     spec('x² > 0 : S = ℝ \\ {0}', 3, {'s': 2}, '\\mathbb{R}\\setminus\\{0\\}', 'correct'),
     spec('Erreur : ℝ', 3, {'s': 2}, '\\mathbb{R}', 'incorrect')],
    delay=90))

# =============================================================================================
# 6. 2-466 : 1/x < k
# =============================================================================================

R = '{{eval:1/(k)}}'
R_BLOC = '1/({{k}})'
INV_ENONCE = ('On note $f$ la fonction inverse : $f(x)=\\dfrac{1}{x}$.\n\nRésous dans $\\mathbb{R}$'
              ' l\'inéquation $\\dfrac{1}{x}' + signe() + '{{k;d}}$.' + S_EGAL)
ZERO = ('$0$ n\'a pas d\'image : il n\'est **jamais** solution. On sépare les réels négatifs et les réels'
        ' positifs.')
NEG_TOUS = 'tous les réels négatifs sont solutions'
NEG_AUCUN = 'aucun réel négatif n\'est solution'
POS_TOUS = 'tous les réels positifs sont solutions'
POS_AUCUN = 'aucun réel positif n\'est solution'


def inv_variation(positif):
    if positif:
        ensembles = [']-\\infty;0[\\cup]' + R + ';+\\infty[', ']-\\infty;0[\\cup[' + R + ';+\\infty[',
                     ']0;' + R + '[', ']0;' + R + ']']
        morceaux = [[']-20 ; 0[', ']' + R_BLOC + ' ; 20]'], [']-20 ; 0[', '[' + R_BLOC + ' ; 20]'],
                    [']0 ; ' + R_BLOC + '['], [']0 ; ' + R_BLOC + ']']]
        signe_hors = ('Pour $x<0$ : $\\dfrac{1}{x}<0<{{k;d}}$, donc '
                      + selon('s', [NEG_TOUS, NEG_TOUS, NEG_AUCUN, NEG_AUCUN]) + '.')
        decroit = ('Pour $x>0$ : la fonction inverse est **décroissante** sur $\\left]0\\,;+\\infty\\right[$ et'
                   ' $\\dfrac{1}{x}={{k;d}}$ pour $x=' + R + '$ ; une fonction décroissante **change** le sens :'
                   ' $\\dfrac{1}{x}' + signe() + '{{k;d}}\\iff x' + signe(True) + R + '$ (avec $x>0$).')
    else:
        ensembles = [']' + R + ';0[', '[' + R + ';0[', ']-\\infty;' + R + '[\\cup]0;+\\infty[',
                     ']-\\infty;' + R + ']\\cup]0;+\\infty[']
        morceaux = [[']' + R_BLOC + ' ; 0['], ['[' + R_BLOC + ' ; 0['], ['[-20 ; ' + R_BLOC + '[', ']0 ; 20]'],
                    ['[-20 ; ' + R_BLOC + ']', ']0 ; 20]']]
        signe_hors = ('Pour $x>0$ : $\\dfrac{1}{x}>0>{{k;d}}$, donc '
                      + selon('s', [POS_AUCUN, POS_AUCUN, POS_TOUS, POS_TOUS]) + '.')
        decroit = ('Pour $x<0$ : la fonction inverse est **décroissante** sur $\\left]-\\infty\\,;0\\right[$ et'
                   ' $\\dfrac{1}{x}={{k;d}}$ pour $x=' + R + '$ ; une fonction décroissante **change** le sens :'
                   ' $\\dfrac{1}{x}' + signe() + '{{k;d}}\\iff x' + signe(True) + R + '$ (avec $x<0$).')
    return variation(
        INV_ENONCE,
        [var('k', '0.5|1|2|3|4' if positif else '-4|-3|-2|-1|-0.5'), var('s', '0..3')],
        [case_ens(selon('s', ensembles))],
        [ZERO, signe_hors, decroit,
         courbe('-4 ; 4', '-5 ; 5',
                ['f(x) = 1/x   bleu   nom=C_f', 'g(x) = {{k}}   rouge   pointillé']
                + lignes_vertes('1/x', morceaux),
                'Hyperbole de la fonction inverse, droite y = {{k}} en pointillé, partie cherchée en vert.'
                + AXE_VERT,
                'A(' + R_BLOC + ' ; {{k}})'),
         conclusion(selon('s', [affiche(e) for e in ensembles]))])


SP_VP = {'k': 2, 's': 0}
SP_VT = {'k': 3, 's': 3}
SP_VN = {'k': -2, 's': 2}
SP_VD = {'k': '-0.5', 's': 1}
MODELES.append(modele(
    '06-inequation-inverse', 'Résoudre 1/x < k',
    'Inéquation 1/x < k par le signe de x et la décroissance de la fonction inverse : k > 0 ou k < 0'
    ' (±½ à ±4), les quatre sens (pièges : branche négative oubliée, 0 inclus, sens non changé)',
    INVERSE, 1, [inv_variation(True), inv_variation(False)],
    [spec('1/x < 2 : S = ]−∞ ; 0[ ∪ ]1/2 ; +∞[', 0, SP_VP, ']-\\infty;0[\\cup]\\frac{1}{2};+\\infty[', 'correct'),
     spec('En décimal ]−∞ ; 0[ ∪ ]0,5 ; +∞[', 0, SP_VP, ']-\\infty;0[\\cup]0{,}5;+\\infty[', 'correct'),
     spec('Erreur : branche négative oubliée', 0, SP_VP, ']\\frac{1}{2};+\\infty[', 'incorrect'),
     spec('Erreur : 0 inclus', 0, SP_VP, ']-\\infty;0]\\cup]\\frac{1}{2};+\\infty[', 'incorrect'),
     spec('Erreur : sens non changé ]−∞ ; 1/2[', 0, SP_VP, ']-\\infty;\\frac{1}{2}[', 'incorrect'),
     spec('1/x ⩾ 3 : S = ]0 ; 1/3]', 0, SP_VT, ']0;\\frac{1}{3}]', 'correct'),
     spec('Erreur : 0 inclus [0 ; 1/3]', 0, SP_VT, '[0;\\frac{1}{3}]', 'incorrect'),
     spec('Erreur : ]−∞ ; 1/3]', 0, SP_VT, ']-\\infty;\\frac{1}{3}]', 'incorrect'),
     spec('1/x > −2 : S = ]−∞ ; −1/2[ ∪ ]0 ; +∞[', 1, SP_VN, ']-\\infty;-\\frac{1}{2}[\\cup]0;+\\infty[',
          'correct'),
     spec('Erreur : ]−1/2 ; 0[', 1, SP_VN, ']-\\frac{1}{2};0[', 'incorrect'),
     spec('Erreur : ]−1/2 ; +∞[', 1, SP_VN, ']-\\frac{1}{2};+\\infty[', 'incorrect'),
     spec('1/x ⩽ −0,5 : S = [−2 ; 0[', 1, SP_VD, '[-2;0[', 'correct'),
     spec('Erreur : 0 inclus [−2 ; 0]', 1, SP_VD, '[-2;0]', 'incorrect'),
     spec('Erreur : ]−∞ ; −2]', 1, SP_VD, ']-\\infty;-2]', 'incorrect')],
    delay=90))

os.makedirs(DOSSIER, exist_ok=True)
for nom, m in MODELES:
    with open(os.path.join(DOSSIER, nom + '.json'), 'w', encoding='utf-8') as f:
        json.dump(m, f, ensure_ascii=False, indent='\t')
        f.write('\n')
# Mis en forme comme le pre-commit, pour que le script redonne les fichiers commités
subprocess.run(['pnpm', 'exec', 'prettier', '--write', DOSSIER], check=True,
               stdout=subprocess.DEVNULL)
print(f'{len(MODELES)} modèles écrits dans {DOSSIER}')
