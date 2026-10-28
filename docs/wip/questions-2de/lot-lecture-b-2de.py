"""Écrit les 6 modèles du lot 2 bis B « Lecture graphique » de la 2de
dans scripts/questions/2de-lecture-b/.

Phase 0 validée par David le 2026-10-28 (§ 11 du journal `docs/wip/questions-2de-progress.md`).
Bornes : `bornes/lycee/2de.json` (2-342, 465, 343, 468, 344, 471) ; courbe fournie par l'énoncé
(l2-2, vaut pour √x et x³) ; les quatre sens (l2-3). Un point par modèle ; le nœud et le tag sont
posés par la migration de rangement, après le `--publier` de David.

Décisions et pièges (en plus de ceux du lot A, `lot-lecture-a-2de.py`) :
- solutions sur les nœuds de la grille : x³ = k, k ∈ {−8, −1, 1, 8} ; √x = k, k ∈ {1, 2, 3} ;
  1/x = k, k ∈ {±½, ±1, ±2} avec une grille de 0,5 ; on tire la solution `r`, puis k ;
- **pas** de variation ∅ pour 1/x = 0 (lecture d'asymptote, décision de David) ; le cas k ⩽ 0
  reste pour √x ({0} ou ∅) ;
- corrigés avec les solutions sur l'axe des abscisses dès le départ (convention du § 14) ;
- 1/x : 0 n'est jamais solution (crochet ouvert en 0, rappelé dans le corrigé) ; √x : 0 est
  dans l'ensemble de définition, √x > k avec k < 0 donne [0 ; +∞[, pas ℝ ;
- une borne hors fenêtre (±10, 20) n'a pas de disque ; la courbe 1/x n'en a pas en 0.

    python3 docs/wip/questions-2de/lot-lecture-b-2de.py scripts/questions/2de-lecture-b
"""
import json
import os
import subprocess
import sys

DOSSIER = sys.argv[1]
THEME = 'Fonctions'
INVERSE = ('Fonction inverse', 'Lecture graphique')
RACINE = ('Fonction racine carrée', 'Lecture graphique')
CUBE = ('Fonction cube', 'Lecture graphique')
INTERVALLES = {'blankDefaults': {'answerKind': 'intervalles'}}


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
         'status': 'draft', 'shared': INTERVALLES, 'variations': variations, 'testSpecs': specs}
    return nom, m


def var(nom, expression):
    return {'name': nom, 'expression': expression}


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


def conclusion(ensemble):
    return '$S=' + col(ensemble) + '$.'


def courbe(x, y, lignes, description, points=None, grille='1 ; 1'):
    """Bloc ```courbe : fenêtre, grille, une ligne par fonction."""
    texte = '```courbe\nx: ' + x + '\ny: ' + y + '\ngrille: ' + grille + '\n'
    texte += ''.join(ligne + '\n' for ligne in lignes)
    if points:
        texte += 'points: ' + points + '\n'
    return texte + 'taille: moyenne\ndescription: ' + description + '\n```'


S_EGAL = '\n\nL\'ensemble des solutions est $S=?$.'

# --- Inégalités : sens tiré par `s` (0 <, 1 ⩽, 2 >, 3 ⩾) ------------------------------------

SENS = ['<', '\\leqslant ', '>', '\\geqslant ']


def signe():
    return selon('s', SENS)


POSITION = ['**strictement sous**', '**sous ou sur**', '**strictement au-dessus de**',
            '**au-dessus ou sur**']
BORNE_A = ['l\'abscisse de $A$ est **exclue**', 'l\'abscisse de $A$ est **comprise**',
           'l\'abscisse de $A$ est **exclue**', 'l\'abscisse de $A$ est **comprise**']


def affiche(ensemble):
    """Écriture du corrigé : `\\left]…\\right[`, espace fine après le « ; »."""
    out = ensemble.replace(';', '\\,;')
    morceaux = out.split('\\cup')
    joli = []
    for m in morceaux:
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


AXE = ' Les solutions sont marquées sur l\'axe des abscisses.'
AXE_VERT = ' L\'ensemble des solutions est repassé en vert sur l\'axe des abscisses.'


def reference(intro, expr_courbe, x, y, nom_f, grille='1 ; 1'):
    return intro + '\n\n' + courbe(x, y, ['f(x) = ' + expr_courbe + '   bleu   nom=C_f'],
                                   'Courbe de la fonction ' + nom_f + '.', grille=grille)


def equation_un_point(intro, expr_courbe, expr_tex, x, y, nom_f, variables, grille='1 ; 1',
                      remarque='', k_bloc='{{k}}'):
    """Une solution r, lue en A(r ; k), marquée en A'(r ; 0) ; k ≠ 0. `k_bloc` : k écrit pour
    le bloc (1/x : `1/(r)`, car k sort en `\\dfrac` que le bloc ne lit pas)."""
    return variation(
        reference(intro, expr_courbe, x, y, nom_f, grille)
        + '\n\nRésous graphiquement l\'équation $' + expr_tex + '={{k}}$.' + S_EGAL,
        variables,
        '\\{ {{r}} \\}',
        ['On trace la droite horizontale d\'équation $y={{k}}$ : les solutions sont les'
         ' **abscisses** des points où elle coupe $\\mathcal{C}_f$.',
         courbe(x, y, ['f(x) = ' + expr_courbe + '   bleu   nom=C_f',
                       'g(x) = ' + k_bloc + '   rouge   pointillé'],
                'Courbe de la fonction ' + nom_f + ' et droite horizontale en pointillé, qui la'
                ' coupe en A.' + AXE,
                'A({{r}} ; ' + k_bloc + '), A\'({{r}} ; 0)', grille),
         'La droite coupe la courbe en un seul point, d\'abscisse ${{r}}$. ' + remarque
         + conclusion('\\{ {{r}} \\}')])


def inequation_un_point(intro, expr_courbe, expr_tex, x, y, nom_f, variables, ensembles,
                        morceaux, grille='1 ; 1', remarque='', k_bloc='{{k}}'):
    """La droite y = k coupe la courbe en A(r ; k) ; `ensembles[s]` (forme réponse),
    `morceaux[s]` (intervalles du bloc, repassés en vert)."""
    return variation(
        reference(intro, expr_courbe, x, y, nom_f, grille)
        + '\n\nRésous graphiquement l\'inéquation $' + expr_tex + signe() + '{{k}}$.' + S_EGAL,
        variables + [var('s', '0..3')],
        selon('s', ensembles),
        ['On trace la droite horizontale d\'équation $y={{k}}$ ; elle coupe la courbe en $A$,'
         ' d\'abscisse ${{r}}$. On cherche les abscisses des points de la courbe situés '
         + selon('s', POSITION) + ' cette droite ; ' + selon('s', BORNE_A) + '.' + remarque,
         courbe(x, y, ['f(x) = ' + expr_courbe + '   bleu   nom=C_f',
                       'g(x) = ' + k_bloc + '   rouge   pointillé']
                + lignes_vertes(expr_courbe, morceaux),
                'Courbe de la fonction ' + nom_f + ', droite horizontale en pointillé, partie'
                ' cherchée en vert.' + AXE_VERT,
                'A({{r}} ; ' + k_bloc + ')', grille),
         conclusion(selon('s', [affiche(e) for e in ensembles]))])


MODELES = []

# =============================================================================================
# 9. 2-342 et 10. 2-465 : fonction inverse (grille 0,5)
# =============================================================================================

INTRO_INVERSE = ('On a tracé ci-dessous la courbe $\\mathcal{C}_f$ de la fonction inverse'
                 ' $f : x\\mapsto \\dfrac{1}{x}$.')
INVERSE_F = ('1/x', '\\dfrac{1}{x}', '-4 ; 4', '-4 ; 4', 'inverse')
GRILLE_DEMI = '0.5 ; 0.5'
K_INVERSE = '1/({{r}})'
ZERO_EXCLU = (' **Attention** : $0$ n\'a pas d\'image par la fonction inverse, il n\'est jamais'
              ' solution.')

SP_I2 = {'r': '0.5', 'k': 2}
SP_IH = {'r': 2, 'k': '0.5'}
SP_IM = {'r': -1, 'k': -1}
MODELES.append(modele(
    '09-equation-inverse-graphique', 'Résoudre graphiquement une équation 1/x = k',
    'Équation 1/x = k lue sur l\'hyperbole de la fonction inverse : k ∈ {±½ ; ±1 ; ±2}, une'
    ' solution',
    INVERSE, 1,
    [equation_un_point(INTRO_INVERSE, *INVERSE_F,
                       [var('r', '-2|-1|-0.5|0.5|1|2'), var('k', 'eval:1/(r)')], GRILLE_DEMI,
                       k_bloc=K_INVERSE)],
    [spec('1/x = 2 : S = {0,5}', 0, SP_I2, '\\{0{,}5\\}', 'correct'),
     spec('1/x = 2 : S = {1/2}', 0, SP_I2, '\\{\\frac{1}{2}\\}', 'correct'),
     spec('Erreur : k recopié ({2})', 0, SP_I2, '\\{2\\}', 'incorrect'),
     spec('1/x = 0,5 : S = {2}', 0, SP_IH, '\\{2\\}', 'correct'),
     spec('Erreur : solution négative ajoutée ({−2 ; 2})', 0, SP_IH, '\\{-2;2\\}', 'incorrect'),
     spec('Erreur : sans accolades', 0, SP_IH, '2', 'incorrect'),
     spec('1/x = −1 : S = {−1}', 0, SP_IM, '\\{-1\\}', 'correct'),
     spec('Erreur : {1}', 0, SP_IM, '\\{1\\}', 'incorrect')],
    delay=45))

# k > 0 (r > 0) : la branche x < 0 est toujours sous la droite.
ENS_INV_POS = [']-\\infty;0[\\cup]{{r}};+\\infty[', ']-\\infty;0[\\cup[{{r}};+\\infty[',
               ']0;{{r}}[', ']0;{{r}}]']
MOR_INV_POS = [[']-10 ; 0[', ']{{r}} ; 10]'], [']-10 ; 0[', '[{{r}} ; 10]'],
               [']0 ; {{r}}['], [']0 ; {{r}}]']]
# k < 0 (r < 0) : la branche x > 0 est toujours au-dessus de la droite.
ENS_INV_NEG = [']{{r}};0[', '[{{r}};0[', ']-\\infty;{{r}}[\\cup]0;+\\infty[',
               ']-\\infty;{{r}}]\\cup]0;+\\infty[']
MOR_INV_NEG = [[']{{r}} ; 0['], ['[{{r}} ; 0['], ['[-10 ; {{r}}[', ']0 ; 10]'],
               ['[-10 ; {{r}}]', ']0 ; 10]']]

SP_IPI = {'r': 1, 'k': 1, 's': 0}
SP_IPS = {'r': '0.5', 'k': 2, 's': 3}
SP_INI = {'r': -2, 'k': '-0.5', 's': 1}
SP_INS = {'r': -1, 'k': -1, 's': 2}
MODELES.append(modele(
    '10-inequation-inverse-graphique', 'Résoudre graphiquement une inéquation 1/x < k',
    'Inéquation 1/x < k lue sur l\'hyperbole de la fonction inverse : k > 0 ou k < 0, les quatre'
    ' sens ; 0 jamais solution',
    INVERSE, 2,
    [inequation_un_point(INTRO_INVERSE, *INVERSE_F,
                         [var('r', '0.5|1|2'), var('k', 'eval:1/(r)')],
                         ENS_INV_POS, MOR_INV_POS, GRILLE_DEMI, ZERO_EXCLU, K_INVERSE),
     inequation_un_point(INTRO_INVERSE, *INVERSE_F,
                         [var('r', '-2|-1|-0.5'), var('k', 'eval:1/(r)')],
                         ENS_INV_NEG, MOR_INV_NEG, GRILLE_DEMI, ZERO_EXCLU, K_INVERSE)],
    [spec('1/x < 1 : S = ]−∞ ; 0[ ∪ ]1 ; +∞[', 0, SP_IPI, ']-\\infty;0[\\cup]1;+\\infty[',
          'correct'),
     spec('Erreur : branche négative oubliée', 0, SP_IPI, ']1;+\\infty[', 'incorrect'),
     spec('Erreur : 0 inclus', 0, SP_IPI, ']-\\infty;0]\\cup]1;+\\infty[', 'incorrect'),
     spec('1/x ⩾ 2 : S = ]0 ; 0,5]', 0, SP_IPS, ']0;0{,}5]', 'correct'),
     spec('Erreur : 0 inclus ([0 ; 0,5])', 0, SP_IPS, '[0;0{,}5]', 'incorrect'),
     spec('Erreur : ]−∞ ; 0,5]', 0, SP_IPS, ']-\\infty;0{,}5]', 'incorrect'),
     spec('1/x ⩽ −0,5 : S = [−2 ; 0[', 1, SP_INI, '[-2;0[', 'correct'),
     spec('Erreur : ]−∞ ; −2]', 1, SP_INI, ']-\\infty;-2]', 'incorrect'),
     spec('1/x > −1 : S = ]−∞ ; −1[ ∪ ]0 ; +∞[', 1, SP_INS, ']-\\infty;-1[\\cup]0;+\\infty[',
          'correct'),
     spec('Erreur : ]−1 ; +∞[', 1, SP_INS, ']-1;+\\infty[', 'incorrect')],
    delay=75))

# =============================================================================================
# 11. 2-343 et 12. 2-468 : fonction racine carrée
# =============================================================================================

INTRO_RACINE = ('On a tracé ci-dessous la courbe $\\mathcal{C}_f$ de la fonction racine carrée'
                ' $f : x\\mapsto \\sqrt{x}$, définie sur $[0\\,;+\\infty[$.')
RAISON_RACINE = 'une racine carrée n\'est jamais négative.'
X_RACINE = '-1 ; 10'
Y_RACINE = '-1 ; 4'
Y_RACINE_BAS = '-5 ; 4'

SP_R2 = {'k': 2, 'r': 4}
SP_R0 = {'t': 0, 'u': 2, 'k': 0}
SP_RV = {'t': 1, 'u': 3, 'k': -3}
MODELES.append(modele(
    '11-equation-racine-graphique', 'Résoudre graphiquement une équation √x = k',
    'Équation √x = k lue sur la courbe de la fonction racine carrée : k ∈ {1 ; 2 ; 3}, k = 0,'
    ' k < 0',
    RACINE, 1,
    [equation_un_point(INTRO_RACINE, 'sqrt(x)', '\\sqrt{x}', X_RACINE, Y_RACINE, 'racine carrée',
                       [var('k', '1..3'), var('r', 'eval:(k)^2')]),
     variation(
         reference(INTRO_RACINE, 'sqrt(x)', X_RACINE, Y_RACINE_BAS, 'racine carrée')
         + '\n\nRésous graphiquement l\'équation $\\sqrt{x}={{k}}$.' + S_EGAL,
         [var('t', '0|1'), var('u', '1..4'), var('k', 'eval:0-(t)*(u)')],
         selon('t', ['\\{ 0 \\}', '\\varnothing']),
         ['On trace la droite horizontale d\'équation $y={{k}}$.',
          courbe(X_RACINE, Y_RACINE_BAS,
                 ['f(x) = sqrt(x)   bleu   nom=C_f', 'g(x) = {{k}}   rouge   pointillé'],
                 'Courbe de la fonction racine carrée et droite y = {{k}}.',
                 selon('t', ['O(0 ; 0)', ' '])),
          selon('t', ['La droite $y=0$ (l\'axe des abscisses) touche la courbe en un seul point,'
                      ' l\'origine. ' + conclusion('\\{ 0 \\}'),
                      'La droite est sous la courbe et ne la coupe pas : ' + RAISON_RACINE + ' '
                      + conclusion('\\varnothing')])])],
    [spec('√x = 2 : S = {4}', 0, SP_R2, '\\{4\\}', 'correct'),
     spec('Erreur : k recopié ({2})', 0, SP_R2, '\\{2\\}', 'incorrect'),
     spec('Erreur : {√2}', 0, SP_R2, '\\{\\sqrt{2}\\}', 'incorrect'),
     spec('Erreur : {−4 ; 4}', 0, SP_R2, '\\{-4;4\\}', 'incorrect'),
     spec('√x = 0 : S = {0}', 1, SP_R0, '\\{0\\}', 'correct'),
     spec('√x = −3 : S = ∅', 1, SP_RV, '\\varnothing', 'correct'),
     spec('Erreur : {9}', 1, SP_RV, '\\{9\\}', 'incorrect')],
    delay=45))

ENS_RAC = ['[0;{{r}}[', '[0;{{r}}]', ']{{r}};+\\infty[', '[{{r}};+\\infty[']
MOR_RAC = [['[0 ; {{r}}['], ['[0 ; {{r}}]'], [']{{r}} ; 20]'], ['[{{r}} ; 20]']]
ENS_RAC_NEG = ['\\varnothing', '\\varnothing', '[0;+\\infty[', '[0;+\\infty[']

SP_RI = {'k': 2, 'r': 4, 's': 0}
SP_RS = {'k': 1, 'r': 1, 's': 3}
SP_RN = {'k': -2, 's': 2}
SP_RNV = {'k': -1, 's': 1}
MODELES.append(modele(
    '12-inequation-racine-graphique', 'Résoudre graphiquement une inéquation √x < k',
    'Inéquation √x < k lue sur la courbe de la fonction racine carrée : k > 0 (les quatre sens,'
    ' 0 compris à gauche), k < 0 (∅ ou [0 ; +∞[)',
    RACINE, 2,
    [inequation_un_point(INTRO_RACINE, 'sqrt(x)', '\\sqrt{x}', X_RACINE, Y_RACINE,
                         'racine carrée', [var('k', '1..3'), var('r', 'eval:(k)^2')],
                         ENS_RAC, MOR_RAC,
                         remarque=' La courbe commence en $x=0$ : $\\sqrt{x}$ n\'existe que pour'
                         ' $x\\geqslant 0$.'),
     variation(
         reference(INTRO_RACINE, 'sqrt(x)', X_RACINE, Y_RACINE_BAS, 'racine carrée')
         + '\n\nRésous graphiquement l\'inéquation $\\sqrt{x}' + signe() + '{{k}}$.' + S_EGAL,
         [var('k', '-4..-1'), var('s', '0..3')],
         selon('s', ENS_RAC_NEG),
         ['On trace la droite horizontale d\'équation $y={{k}}$ : elle est entièrement **sous** la'
          ' courbe, car ' + RAISON_RACINE,
          courbe(X_RACINE, Y_RACINE_BAS,
                 ['f(x) = sqrt(x)   bleu   nom=C_f', 'g(x) = {{k}}   rouge   pointillé',
                  selon('s', [' ', ' ', 't(x) = 0 sur [0 ; 20]   vert',
                              't(x) = 0 sur [0 ; 20]   vert'])],
                 'Courbe de la fonction racine carrée et droite y = {{k}}, sous la courbe.'
                 + selon('s', ['', '', AXE_VERT, AXE_VERT])),
          selon('s', ['Aucun point de la courbe n\'est sous la droite. '
                      + conclusion('\\varnothing'),
                      'Aucun point de la courbe n\'est sous la droite. '
                      + conclusion('\\varnothing'),
                      'Tous les points de la courbe sont au-dessus de la droite, mais la courbe'
                      ' n\'existe que pour $x\\geqslant 0$. '
                      + conclusion(affiche('[0;+\\infty[')),
                      'Tous les points de la courbe sont au-dessus de la droite, mais la courbe'
                      ' n\'existe que pour $x\\geqslant 0$. '
                      + conclusion(affiche('[0;+\\infty['))])])],
    [spec('√x < 2 : S = [0 ; 4[', 0, SP_RI, '[0;4[', 'correct'),
     spec('Erreur : ]−∞ ; 4[ (domaine oublié)', 0, SP_RI, ']-\\infty;4[', 'incorrect'),
     spec('Erreur : 0 exclu', 0, SP_RI, ']0;4[', 'incorrect'),
     spec('Erreur : k lu pour la borne ([0 ; 2[)', 0, SP_RI, '[0;2[', 'incorrect'),
     spec('√x ⩾ 1 : S = [1 ; +∞[', 0, SP_RS, '[1;+\\infty[', 'correct'),
     spec('Erreur : crochet ouvert', 0, SP_RS, ']1;+\\infty[', 'incorrect'),
     spec('√x > −2 : S = [0 ; +∞[', 1, SP_RN, '[0;+\\infty[', 'correct'),
     spec('Erreur : ℝ', 1, SP_RN, '\\mathbb{R}', 'incorrect'),
     spec('√x ⩽ −1 : S = ∅', 1, SP_RNV, '\\varnothing', 'correct')],
    delay=60))

# =============================================================================================
# 13. 2-344 et 14. 2-471 : fonction cube
# =============================================================================================

INTRO_CUBE = ('On a tracé ci-dessous la courbe $\\mathcal{C}_f$ de la fonction cube'
              ' $f : x\\mapsto x^3$.')
CUBE_F = ('x^3', 'x^3', '-3 ; 3', '-9 ; 9', 'cube')
VAR_CUBE = [var('r', '-2|-1|1|2'), var('k', 'eval:(r)^3')]

SP_K8 = {'r': 2, 'k': 8}
SP_KM = {'r': -1, 'k': -1}
MODELES.append(modele(
    '13-equation-cube-graphique', 'Résoudre graphiquement une équation x³ = k',
    'Équation x³ = k lue sur la courbe de la fonction cube : k ∈ {−8 ; −1 ; 1 ; 8}, une solution',
    CUBE, 1,
    [equation_un_point(INTRO_CUBE, *CUBE_F, VAR_CUBE,
                       remarque='Contrairement à la fonction carré, il n\'y a qu\'une solution. ')],
    [spec('x³ = 8 : S = {2}', 0, SP_K8, '\\{2\\}', 'correct'),
     spec('Erreur : {−2 ; 2} (comme pour x²)', 0, SP_K8, '\\{-2;2\\}', 'incorrect'),
     spec('Erreur : k recopié ({8})', 0, SP_K8, '\\{8\\}', 'incorrect'),
     spec('x³ = −1 : S = {−1}', 0, SP_KM, '\\{-1\\}', 'correct'),
     spec('Erreur : ∅ (un cube serait positif)', 0, SP_KM, '\\varnothing', 'incorrect'),
     spec('Erreur : {1}', 0, SP_KM, '\\{1\\}', 'incorrect')],
    delay=45))

ENS_CUBE = [']-\\infty;{{r}}[', ']-\\infty;{{r}}]', ']{{r}};+\\infty[', '[{{r}};+\\infty[']
MOR_CUBE = [['[-10 ; {{r}}['], ['[-10 ; {{r}}]'], [']{{r}} ; 10]'], ['[{{r}} ; 10]']]

SP_KI = {'r': 2, 'k': 8, 's': 0}
SP_KS = {'r': -1, 'k': -1, 's': 3}
MODELES.append(modele(
    '14-inequation-cube-graphique', 'Résoudre graphiquement une inéquation x³ < k',
    'Inéquation x³ < k lue sur la courbe de la fonction cube : k ∈ {−8 ; −1 ; 1 ; 8}, les quatre'
    ' sens',
    CUBE, 2,
    [inequation_un_point(INTRO_CUBE, *CUBE_F, VAR_CUBE, ENS_CUBE, MOR_CUBE)],
    [spec('x³ < 8 : S = ]−∞ ; 2[', 0, SP_KI, ']-\\infty;2[', 'correct'),
     spec('Erreur : ]−2 ; 2[ (comme pour x²)', 0, SP_KI, ']-2;2[', 'incorrect'),
     spec('Erreur : ]−∞ ; 8[ (k lu pour la borne)', 0, SP_KI, ']-\\infty;8[', 'incorrect'),
     spec('x³ ⩾ −1 : S = [−1 ; +∞[', 0, SP_KS, '[-1;+\\infty[', 'correct'),
     spec('Erreur : crochet ouvert', 0, SP_KS, ']-1;+\\infty[', 'incorrect'),
     spec('Erreur : [1 ; +∞[', 0, SP_KS, '[1;+\\infty[', 'incorrect')],
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
