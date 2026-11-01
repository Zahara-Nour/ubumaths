"""Écrit les 6 modèles du lot 6 C « Fonctions de référence : résolutions algébriques (racine, cube,
méthode adaptée) » de la 2de dans scripts/questions/2de-fonctions-c/.

Phase 0 validée par David le 2026-11-01 (§ 37 du journal `docs/wip/questions-2de-progress.md`).
Bornes : `bornes/lycee/2de.json` (2-467, 2-469, 2-470, 2-472, 2-336, 2-448) ; l2-2 (√x et x³
seulement en résolution) ; l2-3 (les quatre sens). Un point par modèle ; le nœud et le tag sont
posés par la migration de rangement, après le `--publier` de David.

Catégories : sous-catégorie « Résolution algébrique » de Fonction racine carrée et Fonction cube
(niveau 1 = équation, 2 = inéquation), et de Généralités pour la méthode adaptée (2-336, 2-448).

Décisions (§ 37) :
- L6-c : cubes parfaits seulement (entiers, fractions 8/27, décimaux 0,008), sans ∛ ;
- L6-d : f donnée par son expression, qui se ramène à un type du programme (a·x² + c, a/x + c,
  a·√x + c, a·x³ + c) ; pas de |x| décalé (l2-1) ; le corrigé nomme le type.

Pièges (en plus de ceux des lots 2, 2 bis, 6 A et 6 B) :
- réponse en ensemble : case `answerKind: 'intervalles'` ;
- sens de l'inégalité tiré (`s` : 0 <, 1 ⩽, 2 >, 3 ⩾) ; racine et cube sont croissantes : le sens
  ne change pas ;
- √x < k : x ⩾ 0 rappelé (piège : ]−∞ ; k²[) ;
- corrigé des inéquations : courbe + droite y = k en pointillé, partie cherchée repassée en vert ;
  une borne hors fenêtre (±100) n'a pas de disque ;
- dans les blocs, les valeurs restent des expressions (`(n)/10`, `p/q`) : un `eval` rendrait
  `\\dfrac`, que le bloc ne lit pas ;
- les variables sont substituées telles quelles dans les `eval` : toujours `(a)`, `-(a)` ;
- variables `e` et `i` interdites.

    python3 docs/wip/questions-2de/lot-fonctions-c-2de.py scripts/questions/2de-fonctions-c
"""
import json
import os
import subprocess
import sys

DOSSIER = sys.argv[1]
THEME = 'Fonctions'
RACINE = ('Fonction racine carrée', 'Résolution algébrique')
CUBE = ('Fonction cube', 'Résolution algébrique')
GENERALITES = ('Généralités', 'Résolution algébrique')


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


def signe():
    return selon('s', SENS)


POSITION = ['**strictement sous**', '**sous ou sur**', '**strictement au-dessus de**',
            '**au-dessus ou sur**']
BORNE_A = ['l\'abscisse de $A$ est **exclue**', 'l\'abscisse de $A$ est **comprise**',
           'l\'abscisse de $A$ est **exclue**', 'l\'abscisse de $A$ est **comprise**']
BORNES = ['les abscisses des points d\'intersection sont **exclues**',
          'les abscisses des points d\'intersection sont **comprises**',
          'les abscisses des points d\'intersection sont **exclues**',
          'les abscisses des points d\'intersection sont **comprises**']
AXE_VERT = ' L\'ensemble des solutions est repassé en vert sur l\'axe des abscisses.'
LOIN = '100'


def intervalles(r):
    """Ensembles de x < r, x ⩽ r, x > r, x ⩾ r (réponse attendue)."""
    return [']-\\infty;' + r + '[', ']-\\infty;' + r + ']', ']' + r + ';+\\infty[',
            '[' + r + ';+\\infty[']


def intervalles_racine(r):
    """Ensembles de x < r, x ⩽ r, x > r, x ⩾ r avec x ⩾ 0 (r > 0)."""
    return ['[0;' + r + '[', '[0;' + r + ']', ']' + r + ';+\\infty[', '[' + r + ';+\\infty[']


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


def morceaux_sous(r, debut='-' + LOIN, ouvert_debut=False):
    """Intervalles du bloc pour x < r, x ⩽ r, x > r, x ⩾ r ; `debut` = borne gauche (0 pour √)."""
    g = (']' if ouvert_debut else '[') + debut
    return [[g + ' ; ' + r + '['], [g + ' ; ' + r + ']'], [']' + r + ' ; ' + LOIN + ']'],
            ['[' + r + ' ; ' + LOIN + ']']]


def morceaux_entre_ou_dehors(a, b):
    return [[']' + a + ' ; ' + b + '['], ['[' + a + ' ; ' + b + ']'],
            ['[-' + LOIN + ' ; ' + a + '[', ']' + b + ' ; ' + LOIN + ']'],
            ['[-' + LOIN + ' ; ' + a + ']', '[' + b + ' ; ' + LOIN + ']']]


def vide_ou_tout(tout):
    """∅ pour s = 0, 1 ; `tout` pour s = 2, 3 (k négatif, fonction positive)."""
    return ['\\varnothing', '\\varnothing', tout, tout]


MODELES = []

# =============================================================================================
# 1. 2-467 : √x = k
# =============================================================================================

F_RACINE = 'On note $f$ la fonction racine carrée : $f(x)=\\sqrt{x}$, définie sur $\\left[0\\,;+\\infty\\right[$.\n\n'
RACINE_METHODE = ('La fonction racine carrée est **strictement croissante** sur $\\left[0\\,;+\\infty\\right[$ :'
                  ' un nombre positif ou nul a **un seul** antécédent. Pour $k\\geqslant 0$,'
                  ' $\\sqrt{x}=k\\iff x=k^2$.')


def racine_eq_enonce(k_tex):
    return (F_RACINE + 'Résous dans $\\mathbb{R}$ l\'équation $\\sqrt{x}=' + k_tex + '$.' + S_EGAL)


def courbe_racine_point(x, y, k_bloc, x_bloc):
    return courbe(x, y, ['f(x) = sqrt(x)   bleu   nom=C_f', 'g(x) = ' + k_bloc + '   rouge   pointillé'],
                  'Courbe de la fonction racine carrée et droite horizontale y = k en pointillé, qui la'
                  ' coupe en un seul point A.', 'A(' + x_bloc + ' ; ' + k_bloc + ')')


RAC_ENTIER = variation(
    racine_eq_enonce('{{k}}'),
    [var('k', '1..9')],
    [case_ens('\\{ {{eval:(k)^2}} \\}')],
    [RACINE_METHODE,
     '$$\\sqrt{x}={{k}}\\iff x={{k}}^2={{eval:(k)^2}}$$',
     courbe_racine_point('-1 ; {{eval:(k)^2+3}}', '-1 ; {{eval:(k)+2}}', '{{k}}', '{{k}}^2'),
     conclusion('\\{ {{eval:(k)^2}} \\}')])

RAC_DECIMAL = variation(
    racine_eq_enonce('{{eval:(n)/10;d}}'),
    [var('n', '2..19!10')],
    [case_ens('\\{ {{eval:(n)^2/100;d}} \\}')],
    [RACINE_METHODE,
     '$$\\sqrt{x}={{eval:(n)/10;d}}\\iff x={{eval:(n)/10;d}}^2={{eval:(n)^2/100;d}}$$',
     '(Le carré a deux fois plus de chiffres après la virgule.)',
     courbe_racine_point('-0.5 ; 4.5', '-0.5 ; 2.5', '{{n}}/10', '({{n}}/10)^2'),
     conclusion('\\{ {{eval:(n)^2/100;d}} \\}')])

RAC_FRACTION = variation(
    racine_eq_enonce('\\dfrac{ {{p}} }{ {{q}} }'),
    [var('p', '1..5'), var('q', '2..5')],
    [case_ens('\\{ {{eval:(p)^2/(q)^2}} \\}')],
    [RACINE_METHODE,
     '$$\\sqrt{x}=\\dfrac{ {{p}} }{ {{q}} }\\iff x=\\left(\\dfrac{ {{p}} }{ {{q}} }\\right)^2='
     '\\dfrac{ {{eval:(p)^2}} }{ {{eval:(q)^2}} }$$',
     courbe_racine_point('-0.5 ; 7', '-0.5 ; 3', '{{p}}/{{q}}', '({{p}}/{{q}})^2'),
     conclusion('\\left\\{ \\dfrac{ {{eval:(p)^2}} }{ {{eval:(q)^2}} } \\right\\}')],
    ['gcd(p, q) == 1'])

RAC_NEGATIF = variation(
    racine_eq_enonce('{{k}}'),
    [var('k', '-9..-1')],
    [case_ens('\\varnothing')],
    ['Une racine carrée n\'est **jamais négative** : pour tout $x\\geqslant 0$, $\\sqrt{x}\\geqslant 0>{{k}}$.'
     ' La courbe de la fonction racine carrée ne coupe pas la droite $y={{k}}$.',
     'Aucun réel n\'est solution. ' + conclusion('\\varnothing')])

SP_RE = {'k': 3}
SP_RD = {'n': 12}
SP_RF = {'p': 2, 'q': 3}
SP_RN = {'k': -4}
MODELES.append(modele(
    '01-equation-racine-carree', 'Résoudre √x = k',
    'Équation √x = k par la croissance de la fonction racine carrée : k entier, décimal (√x = 1,2),'
    ' fraction ; k < 0 → ∅ (pièges : √k au lieu de k², solution négative ajoutée, 2k, k² pour k < 0)',
    RACINE, 1, [RAC_ENTIER, RAC_DECIMAL, RAC_FRACTION, RAC_NEGATIF],
    [spec('√x = 3 : S = {9}', 0, SP_RE, '\\{9\\}', 'correct'),
     spec('Erreur : √3', 0, SP_RE, '\\{\\sqrt{3}\\}', 'incorrect'),
     spec('Erreur : {−9 ; 9}', 0, SP_RE, '\\{-9;9\\}', 'incorrect'),
     spec('Erreur : 2k {6}', 0, SP_RE, '\\{6\\}', 'incorrect'),
     spec('Erreur : sans accolades', 0, SP_RE, '9', 'incorrect'),
     spec('√x = 1,2 : S = {1,44}', 1, SP_RD, '\\{1{,}44\\}', 'correct'),
     spec('Erreur : virgule {0,144}', 1, SP_RD, '\\{0{,}144\\}', 'incorrect'),
     spec('Erreur : {1,4}', 1, SP_RD, '\\{1{,}4\\}', 'incorrect'),
     spec('√x = 2/3 : S = {4/9}', 2, SP_RF, '\\{\\frac{4}{9}\\}', 'correct'),
     spec('Erreur : {4/3}', 2, SP_RF, '\\{\\frac{4}{3}\\}', 'incorrect'),
     spec('Erreur : {2/9}', 2, SP_RF, '\\{\\frac{2}{9}\\}', 'incorrect'),
     spec('√x = −4 : S = ∅', 3, SP_RN, '\\varnothing', 'correct'),
     spec('Erreur : {16}', 3, SP_RN, '\\{16\\}', 'incorrect')]))

# =============================================================================================
# 2. 2-469 : √x < k
# =============================================================================================

RAC_INEQ_ENONCE = (F_RACINE + 'Résous dans $\\mathbb{R}$ l\'inéquation $\\sqrt{x}' + signe() + '{{k}}$.'
                   + S_EGAL)
RAC_INEQ_ENONCE_D = (F_RACINE + 'Résous dans $\\mathbb{R}$ l\'inéquation $\\sqrt{x}' + signe()
                     + '{{eval:(n)/10;d}}$.' + S_EGAL)
DOMAINE = ('$\\sqrt{x}$ n\'existe que pour $x\\geqslant 0$ : les solutions sont **toutes positives ou'
           ' nulles**.')


def racine_ineq(enonce, variables, k_tex, carre, carre_bloc, k_bloc, x, y):
    ensembles = intervalles_racine(carre)
    return variation(
        enonce,
        variables + [var('s', '0..3')],
        [case_ens(selon('s', ensembles))],
        [DOMAINE,
         'La fonction racine carrée est **croissante** sur $\\left[0\\,;+\\infty\\right[$ : elle **conserve** le'
         ' sens. Comme $\\sqrt{' + carre + '}=' + k_tex + '$, pour $x\\geqslant 0$ :'
         ' $\\sqrt{x}' + signe() + k_tex + '\\iff x' + signe() + carre + '$.',
         'Sur le graphique : on garde les abscisses des points de la courbe situés ' + selon('s', POSITION)
         + ' la droite $y=' + k_tex + '$ ; ' + selon('s', BORNE_A) + '.',
         courbe(x, y,
                ['f(x) = sqrt(x)   bleu   nom=C_f', 'g(x) = ' + k_bloc + '   rouge   pointillé']
                + lignes_vertes('sqrt(x)', morceaux_sous(carre_bloc, '0')),
                'Courbe de la fonction racine carrée, droite y = k en pointillé, partie cherchée en vert.'
                + AXE_VERT,
                'A(' + carre_bloc + ' ; ' + k_bloc + ')'),
         conclusion(selon('s', [affiche(e) for e in ensembles]))])


RACI_ENTIER = racine_ineq(RAC_INEQ_ENONCE, [var('k', '1..4')], '{{k}}', '{{eval:(k)^2}}', '{{k}}^2',
                          '{{k}}', '-1 ; {{eval:(k)^2+3}}', '-1 ; {{eval:(k)+2}}')
RACI_DECIMAL = racine_ineq(RAC_INEQ_ENONCE_D, [var('n', '2..19!10')], '{{eval:(n)/10;d}}',
                           '{{eval:(n)^2/100;d}}', '({{n}}/10)^2', '{{n}}/10', '-0.5 ; 4.5', '-0.5 ; 2.5')

RACI_NEGATIF = variation(
    RAC_INEQ_ENONCE,
    [var('k', '-9..-1'), var('s', '0..3')],
    [case_ens(selon('s', vide_ou_tout('[0;+\\infty[')))],
    [DOMAINE + ' Une racine carrée n\'est **jamais négative** : pour tout $x\\geqslant 0$,'
     ' $\\sqrt{x}\\geqslant 0>{{k}}$.',
     selon('s', ['Aucun réel n\'est solution. ' + conclusion('\\varnothing'),
                 'Aucun réel n\'est solution. ' + conclusion('\\varnothing'),
                 'Tous les réels positifs ou nuls sont solutions, et seulement eux. '
                 + conclusion(affiche('[0;+\\infty[')),
                 'Tous les réels positifs ou nuls sont solutions, et seulement eux. '
                 + conclusion(affiche('[0;+\\infty['))])])

RACI_NUL = variation(
    F_RACINE + 'Résous dans $\\mathbb{R}$ l\'inéquation $\\sqrt{x}' + signe() + '0$.' + S_EGAL,
    [var('s', '0..3')],
    [case_ens(selon('s', ['\\varnothing', '\\{0\\}', ']0;+\\infty[', '[0;+\\infty[']))],
    [DOMAINE + ' Une racine carrée n\'est jamais négative, et $\\sqrt{x}=0$ seulement pour $x=0$.',
     selon('s', ['Aucune racine carrée n\'est strictement négative : ' + conclusion('\\varnothing'),
                 'Une racine carrée négative ou nulle est nulle : seul $0$ est solution. '
                 + conclusion('\\{0\\}'),
                 'La racine carrée est strictement positive pour tout $x>0$. '
                 + conclusion(affiche(']0;+\\infty[')),
                 'Une racine carrée est toujours positive ou nulle, là où elle existe : '
                 + conclusion(affiche('[0;+\\infty['))])])

SP_QI = {'k': 2, 's': 0}
SP_QS = {'k': 3, 's': 3}
SP_QD = {'n': 15, 's': 1}
SP_QN = {'k': -2, 's': 2}
SP_QN2 = {'k': -2, 's': 0}
MODELES.append(modele(
    '02-inequation-racine-carree', 'Résoudre √x < k',
    'Inéquation √x < k par la croissance de la fonction racine carrée et x ⩾ 0 : k entier ou décimal,'
    ' les quatre sens ; k < 0 (∅ ou [0 ; +∞[), k = 0 (pièges : x ⩾ 0 oublié, k au lieu de k², 0 exclu,'
    ' crochets)',
    RACINE, 2, [RACI_ENTIER, RACI_DECIMAL, RACI_NEGATIF, RACI_NUL],
    [spec('√x < 2 : S = [0 ; 4[', 0, SP_QI, '[0;4[', 'correct'),
     spec('Erreur : x ⩾ 0 oublié ]−∞ ; 4[', 0, SP_QI, ']-\\infty;4[', 'incorrect'),
     spec('Erreur : 0 exclu ]0 ; 4[', 0, SP_QI, ']0;4[', 'incorrect'),
     spec('Erreur : k au lieu de k² [0 ; 2[', 0, SP_QI, '[0;2[', 'incorrect'),
     spec('Erreur : crochet fermé [0 ; 4]', 0, SP_QI, '[0;4]', 'incorrect'),
     spec('√x ⩾ 3 : S = [9 ; +∞[', 0, SP_QS, '[9;+\\infty[', 'correct'),
     spec('Erreur : crochet ouvert ]9 ; +∞[', 0, SP_QS, ']9;+\\infty[', 'incorrect'),
     spec('Erreur : [3 ; +∞[', 0, SP_QS, '[3;+\\infty[', 'incorrect'),
     spec('√x ⩽ 1,5 : S = [0 ; 2,25]', 1, SP_QD, '[0;2{,}25]', 'correct'),
     spec('En fraction [0 ; 9/4]', 1, SP_QD, '[0;\\frac{9}{4}]', 'correct'),
     spec('Erreur : ]−∞ ; 2,25]', 1, SP_QD, ']-\\infty;2{,}25]', 'incorrect'),
     spec('√x > −2 : S = [0 ; +∞[', 2, SP_QN, '[0;+\\infty[', 'correct'),
     spec('Erreur : ℝ', 2, SP_QN, '\\mathbb{R}', 'incorrect'),
     spec('Erreur : ]4 ; +∞[', 2, SP_QN, ']4;+\\infty[', 'incorrect'),
     spec('√x < −2 : S = ∅', 2, SP_QN2, '\\varnothing', 'correct'),
     spec('Erreur : [0 ; 4[', 2, SP_QN2, '[0;4[', 'incorrect'),
     spec('√x ⩽ 0 : S = {0}', 3, {'s': 1}, '\\{0\\}', 'correct'),
     spec('Erreur : ∅', 3, {'s': 1}, '\\varnothing', 'incorrect'),
     spec('√x > 0 : S = ]0 ; +∞[', 3, {'s': 2}, ']0;+\\infty[', 'correct'),
     spec('Erreur : ℝ \\ {0}', 3, {'s': 2}, '\\mathbb{R}\\setminus\\{0\\}', 'incorrect')],
    delay=90))

# =============================================================================================
# 3. 2-470 : x³ = k (cubes parfaits, L6-c) et 4. 2-472 : x³ < k
# =============================================================================================

F_CUBE = 'On note $f$ la fonction cube : $f(x)=x^3$.\n\n'
CUBE_METHODE = ('La fonction cube est **strictement croissante** sur $\\mathbb{R}$ : tout réel, **positif'
                ' ou négatif**, a **un seul** antécédent. On cherche le nombre dont le cube vaut ')
FENETRE_Y_CUBE = '{{eval:-max((k),-(k))-4}} ; {{eval:max((k),-(k))+4}}'


def courbe_cube_point(x, y, k_bloc, r_bloc):
    return courbe(x, y, ['f(x) = x^3   bleu   nom=C_f', 'g(x) = ' + k_bloc + '   rouge   pointillé'],
                  'Courbe de la fonction cube et droite horizontale y = k en pointillé, qui la coupe en un'
                  ' seul point A.', 'A(' + r_bloc + ' ; ' + k_bloc + ')')


def cube_eq_enonce(k_tex):
    return F_CUBE + 'Résous dans $\\mathbb{R}$ l\'équation $x^3=' + k_tex + '$.' + S_EGAL


CUBE_ENTIER = variation(
    cube_eq_enonce('{{k}}'),
    [var('r', '-5..5!0'), var('k', 'eval:(r)^3')],
    [case_ens('\\{ {{r}} \\}')],
    [CUBE_METHODE + '${{k}}$.',
     '$$({{r}})^3={{k}}\\qquad\\text{donc}\\qquad x^3={{k}}\\iff x={{r}}$$',
     courbe_cube_point('-6 ; 6', FENETRE_Y_CUBE, '{{k}}', '{{r}}'),
     conclusion('\\{ {{r}} \\}')])

CUBE_FRACTION = variation(
    cube_eq_enonce('{{eval:(p)^3/(q)^3}}'),
    [var('p', '1..3;±'), var('q', '2..4')],
    [case_ens('\\{ {{eval:(p)/(q)}} \\}')],
    [CUBE_METHODE + '${{eval:(p)^3/(q)^3}}$.',
     '$$\\left({{eval:(p)/(q)}}\\right)^3=\\dfrac{ {{eval:(p)^3}} }{ {{eval:(q)^3}} }\\qquad\\text{donc}\\qquad'
     ' x^3={{eval:(p)^3/(q)^3}}\\iff x={{eval:(p)/(q)}}$$',
     courbe_cube_point('-2 ; 2', '-4 ; 4', '({{p}}/{{q}})^3', '{{p}}/{{q}}'),
     conclusion('\\left\\{ {{eval:(p)/(q)}} \\right\\}')],
    ['gcd(p, q) == 1'])

CUBE_DECIMAL = variation(
    cube_eq_enonce('{{eval:(n)^3/1000;d}}'),
    [var('n', '1..5;±')],
    [case_ens('\\{ {{eval:(n)/10;d}} \\}')],
    [CUBE_METHODE + '${{eval:(n)^3/1000;d}}$.',
     '$$({{eval:(n)/10;d}})^3={{eval:(n)^3/1000;d}}\\qquad\\text{donc}\\qquad x^3={{eval:(n)^3/1000;d}}'
     '\\iff x={{eval:(n)/10;d}}$$',
     '(Le cube a trois fois plus de chiffres après la virgule.)',
     courbe_cube_point('-1 ; 1', '-0.5 ; 0.5', '({{n}}/10)^3', '{{n}}/10'),
     conclusion('\\{ {{eval:(n)/10;d}} \\}')])

SP_KN = {'r': -2, 'k': -8}
SP_KP = {'r': 4, 'k': 64}
SP_KF = {'p': 2, 'q': 3}
SP_KD = {'n': -2}
MODELES.append(modele(
    '03-equation-cube', 'Résoudre x³ = k',
    'Équation x³ = k (cubes parfaits) par la croissance de la fonction cube : k entier, fraction'
    ' (8/27), décimal (0,008), positif ou négatif, une seule solution (pièges : ∅ pour k < 0, deux'
    ' solutions opposées, k/3, virgule)',
    CUBE, 1, [CUBE_ENTIER, CUBE_FRACTION, CUBE_DECIMAL],
    [spec('x³ = −8 : S = {−2}', 0, SP_KN, '\\{-2\\}', 'correct'),
     spec('Erreur : ∅ (un cube serait positif)', 0, SP_KN, '\\varnothing', 'incorrect'),
     spec('Erreur : {−2 ; 2}', 0, SP_KN, '\\{-2;2\\}', 'incorrect'),
     spec('Erreur : signe {2}', 0, SP_KN, '\\{2\\}', 'incorrect'),
     spec('x³ = 64 : S = {4}', 0, SP_KP, '\\{4\\}', 'correct'),
     spec('Erreur : {−4 ; 4}', 0, SP_KP, '\\{-4;4\\}', 'incorrect'),
     spec('Erreur : 64/3', 0, SP_KP, '\\{\\frac{64}{3}\\}', 'incorrect'),
     spec('Erreur : {8} (racine carrée)', 0, SP_KP, '\\{8\\}', 'incorrect'),
     spec('x³ = 8/27 : S = {2/3}', 1, SP_KF, '\\{\\frac{2}{3}\\}', 'correct'),
     spec('Erreur : {8/9}', 1, SP_KF, '\\{\\frac{8}{9}\\}', 'incorrect'),
     spec('x³ = −0,008 : S = {−0,2}', 2, SP_KD, '\\{-0{,}2\\}', 'correct'),
     spec('Erreur : virgule {−0,02}', 2, SP_KD, '\\{-0{,}02\\}', 'incorrect'),
     spec('Erreur : signe {0,2}', 2, SP_KD, '\\{0{,}2\\}', 'incorrect')]))

# --- 4. 2-472 : x³ < k -----------------------------------------------------------------------


def cube_ineq(k_tex, r_tex, variables, k_bloc, r_bloc, x, y, conditions=None):
    ensembles = intervalles(r_tex)
    return variation(
        F_CUBE + 'Résous dans $\\mathbb{R}$ l\'inéquation $x^3' + signe() + k_tex + '$.' + S_EGAL,
        variables + [var('s', '0..3')],
        [case_ens(selon('s', ensembles))],
        ['On cherche d\'abord le nombre dont le cube vaut $' + k_tex + '$ : $' + r_tex + '$, car'
         ' $\\left(' + r_tex + '\\right)^3=' + k_tex + '$.',
         'La fonction cube est **croissante** sur $\\mathbb{R}$ : elle **conserve** le sens.'
         ' $x^3' + signe() + k_tex + '\\iff x' + signe() + r_tex + '$.',
         'Sur le graphique : on garde les abscisses des points de la courbe situés ' + selon('s', POSITION)
         + ' la droite $y=' + k_tex + '$ ; ' + selon('s', BORNE_A) + '.',
         courbe(x, y,
                ['f(x) = x^3   bleu   nom=C_f', 'g(x) = ' + k_bloc + '   rouge   pointillé']
                + lignes_vertes('x^3', morceaux_sous(r_bloc)),
                'Courbe de la fonction cube, droite y = k en pointillé, partie cherchée en vert.' + AXE_VERT,
                'A(' + r_bloc + ' ; ' + k_bloc + ')'),
         conclusion(selon('s', [affiche(e) for e in ensembles]))],
        conditions)


CUBI_ENTIER = cube_ineq('{{k}}', '{{r}}', [var('r', '-4..4'), var('k', 'eval:(r)^3')], '{{k}}', '{{r}}',
                        '-5 ; 5', FENETRE_Y_CUBE)
CUBI_FRACTION = cube_ineq('{{eval:(p)^3/(q)^3}}', '{{eval:(p)/(q)}}', [var('p', '1..3;±'), var('q', '2..4')],
                          '({{p}}/{{q}})^3', '{{p}}/{{q}}', '-2 ; 2', '-4 ; 4', ['gcd(p, q) == 1'])

SP_CI = {'r': 2, 'k': 8, 's': 0}
SP_CN = {'r': -3, 'k': -27, 's': 3}
SP_CF = {'p': -1, 'q': 2, 's': 1}
MODELES.append(modele(
    '04-inequation-cube', 'Résoudre x³ < k',
    'Inéquation x³ < k (cubes parfaits) par la croissance de la fonction cube : k entier ou fraction,'
    ' positif ou négatif, les quatre sens (pièges : k au lieu de sa racine cubique, sens changé, partie'
    ' négative oubliée, crochets)',
    CUBE, 2, [CUBI_ENTIER, CUBI_FRACTION],
    [spec('x³ < 8 : S = ]−∞ ; 2[', 0, SP_CI, ']-\\infty;2[', 'correct'),
     spec('Erreur : ]−2 ; 2[ (comme x² < 4)', 0, SP_CI, ']-2;2[', 'incorrect'),
     spec('Erreur : ]−∞ ; 8[', 0, SP_CI, ']-\\infty;8[', 'incorrect'),
     spec('Erreur : crochet fermé', 0, SP_CI, ']-\\infty;2]', 'incorrect'),
     spec('Erreur : [0 ; 2[', 0, SP_CI, '[0;2[', 'incorrect'),
     spec('x³ ⩾ −27 : S = [−3 ; +∞[', 0, SP_CN, '[-3;+\\infty[', 'correct'),
     spec('Erreur : sens changé ]−∞ ; −3]', 0, SP_CN, ']-\\infty;-3]', 'incorrect'),
     spec('Erreur : ℝ (un cube serait positif)', 0, SP_CN, '\\mathbb{R}', 'incorrect'),
     spec('x³ ⩽ −1/8 : S = ]−∞ ; −1/2]', 1, SP_CF, ']-\\infty;-\\frac{1}{2}]', 'correct'),
     spec('En décimal ]−∞ ; −0,5]', 1, SP_CF, ']-\\infty;-0{,}5]', 'correct'),
     spec('Erreur : ]−∞ ; −1/8]', 1, SP_CF, ']-\\infty;-\\frac{1}{8}]', 'incorrect')],
    delay=90))

# =============================================================================================
# 5. 2-336 : f(x) = k et 6. 2-448 : f(x) < k, méthode adaptée (L6-d)
# =============================================================================================


def f_donnee(expr):
    return 'On considère la fonction $f$ définie par $f(x)=' + expr + '$.\n\n'


ISOLER = 'On **isole** la fonction de référence :'

ADAPTE_CARRE = variation(
    f_donnee('{{a}}x^2{{c;+}}') + 'Résous dans $\\mathbb{R}$ l\'équation $f(x)={{k}}$.' + S_EGAL,
    [var('a', '2..5'), var('c', '1..9;±'), var('r', '1..4'), var('k', 'eval:(a)*(r)^2+(c)')],
    [case_ens('\\{ {{eval:-(r)}} ; {{r}} \\}')],
    [ISOLER,
     '$${{a}}x^2{{c;+}}={{k}}\\iff {{a}}x^2={{eval:(k)-(c)}}\\iff x^2={{eval:(r)^2}}$$',
     'On est ramené à une équation $x^2=k$ (**fonction carré**) avec $k>0$ : **deux** solutions opposées,'
     ' ${{r}}$ et $-{{r}}$.',
     conclusion('\\{ -{{r}}\\,;{{r}} \\}')])

ADAPTE_INVERSE = variation(
    f_donnee('\\dfrac{ {{a}} }{x}{{c;+}}') + 'Résous dans $\\mathbb{R}$ l\'équation $f(x)={{k}}$.' + S_EGAL,
    [var('a', '1..6;±'), var('c', '1..5;±'), var('k', '-6..6')],
    [case_ens('\\{ {{eval:(a)/((k)-(c))}} \\}')],
    ['$f$ est définie pour $x\\neq 0$. ' + ISOLER,
     '$$\\dfrac{ {{a}} }{x}{{c;+}}={{k}}\\iff \\dfrac{ {{a}} }{x}={{eval:(k)-(c)}}\\iff x=\\dfrac{ {{a}} }'
     '{ {{eval:(k)-(c)}} }$$',
     'On est ramené à une équation $\\dfrac{1}{x}=k$ (**fonction inverse**) avec $k\\neq 0$ : **une seule**'
     ' solution, l\'inverse.',
     conclusion('\\left\\{ {{eval:(a)/((k)-(c))}} \\right\\}')],
    ['k != c'])

ADAPTE_RACINE = variation(
    f_donnee('{{a}}\\sqrt{x}{{c;+}}') + 'Résous dans $\\mathbb{R}$ l\'équation $f(x)={{k}}$.' + S_EGAL,
    [var('a', '2..5'), var('c', '1..9;±'), var('m', '1..6'), var('k', 'eval:(a)*(m)+(c)')],
    [case_ens('\\{ {{eval:(m)^2}} \\}')],
    ['$f$ est définie pour $x\\geqslant 0$. ' + ISOLER,
     '$${{a}}\\sqrt{x}{{c;+}}={{k}}\\iff {{a}}\\sqrt{x}={{eval:(k)-(c)}}\\iff \\sqrt{x}={{m}}$$',
     'On est ramené à une équation $\\sqrt{x}=k$ (**fonction racine carrée**) avec $k\\geqslant 0$ :'
     ' **une seule** solution, $x={{m}}^2={{eval:(m)^2}}$.',
     conclusion('\\{ {{eval:(m)^2}} \\}')])

ADAPTE_CUBE = variation(
    f_donnee('{{a}}x^3{{c;+}}') + 'Résous dans $\\mathbb{R}$ l\'équation $f(x)={{k}}$.' + S_EGAL,
    [var('a', '2..4'), var('c', '1..9;±'), var('r', '-3..3!0'), var('k', 'eval:(a)*(r)^3+(c)')],
    [case_ens('\\{ {{r}} \\}')],
    [ISOLER,
     '$${{a}}x^3{{c;+}}={{k}}\\iff {{a}}x^3={{eval:(k)-(c)}}\\iff x^3={{eval:(r)^3}}$$',
     'On est ramené à une équation $x^3=k$ (**fonction cube**) : **une seule** solution, ${{r}}$, car'
     ' $({{r}})^3={{eval:(r)^3}}$.',
     conclusion('\\{ {{r}} \\}')])

SP_MC = {'a': 2, 'c': 1, 'r': 3, 'k': 19}
SP_MI = {'a': 3, 'c': -1, 'k': 5}
SP_MR = {'a': 2, 'c': 1, 'm': 3, 'k': 7}
SP_MK = {'a': 2, 'c': 3, 'r': -2, 'k': -13}
MODELES.append(modele(
    '05-equation-methode-adaptee', 'Résoudre f(x) = k en se ramenant à une fonction de référence',
    'f(x) = k avec f donnée par son expression (2x² + 1, 3/x − 1, 2√x + 1, 2x³ + 3) : isoler la'
    ' fonction de référence, puis la résoudre (pièges : solution négative oubliée, √ au lieu du carré,'
    ' (k − c)/a au lieu de a/(k − c), signe du cube)',
    GENERALITES, 1, [ADAPTE_CARRE, ADAPTE_INVERSE, ADAPTE_RACINE, ADAPTE_CUBE],
    [spec('2x² + 1 = 19 : S = {−3 ; 3}', 0, SP_MC, '\\{-3;3\\}', 'correct'),
     spec('Erreur : {3}', 0, SP_MC, '\\{3\\}', 'incorrect'),
     spec('Erreur : {−9 ; 9}', 0, SP_MC, '\\{-9;9\\}', 'incorrect'),
     spec('3/x − 1 = 5 : S = {1/2}', 1, SP_MI, '\\{\\frac{1}{2}\\}', 'correct'),
     spec('En décimal {0,5}', 1, SP_MI, '\\{0{,}5\\}', 'correct'),
     spec('Erreur : {2} (k − c)/a', 1, SP_MI, '\\{2\\}', 'incorrect'),
     spec('Erreur : {3/4} (c ajouté)', 1, SP_MI, '\\{\\frac{3}{4}\\}', 'incorrect'),
     spec('2√x + 1 = 7 : S = {9}', 2, SP_MR, '\\{9\\}', 'correct'),
     spec('Erreur : {3}', 2, SP_MR, '\\{3\\}', 'incorrect'),
     spec('Erreur : {√3}', 2, SP_MR, '\\{\\sqrt{3}\\}', 'incorrect'),
     spec('2x³ + 3 = −13 : S = {−2}', 3, SP_MK, '\\{-2\\}', 'correct'),
     spec('Erreur : ∅', 3, SP_MK, '\\varnothing', 'incorrect'),
     spec('Erreur : {2}', 3, SP_MK, '\\{2\\}', 'incorrect')],
    delay=90))

# --- 6. 2-448 : f(x) < k -----------------------------------------------------------------------

ADAPTE_INEQ = 'Résous dans $\\mathbb{R}$ l\'inéquation $f(x)' + signe() + '{{k}}$.' + S_EGAL
DIVISE_POSITIF = ('On **isole** la fonction de référence ; quand on divise par ${{a}}$, un nombre **positif**,'
                  ' le sens **ne change pas**.')
FENETRE_Y_F = '{{eval:min((k),(c))-4}} ; {{eval:max((k),(c))+4}}'
ENS_CARRE = entre_ou_dehors('-{{r}}', '{{r}}')
ENS_RACINE = intervalles_racine('{{eval:(m)^2}}')
ENS_CUBE = intervalles('{{r}}')

ADAPTE_INEQ_CARRE = variation(
    f_donnee('{{a}}x^2{{c;+}}') + ADAPTE_INEQ,
    [var('a', '2..3'), var('c', '1..9;±'), var('r', '1..3'), var('k', 'eval:(a)*(r)^2+(c)'),
     var('s', '0..3')],
    [case_ens(selon('s', ENS_CARRE))],
    [DIVISE_POSITIF,
     '$${{a}}x^2{{c;+}}' + signe() + '{{k}}\\iff {{a}}x^2' + signe() + '{{eval:(k)-(c)}}\\iff x^2' + signe()
     + '{{eval:(r)^2}}$$',
     'On est ramené à une inéquation $x^2<k$ (**fonction carré**) : les solutions de $x^2={{eval:(r)^2}}$'
     ' sont $-{{r}}$ et ${{r}}$ ; sur la courbe de $f$, on garde les points situés ' + selon('s', POSITION)
     + ' la droite $y={{k}}$ ; ' + selon('s', BORNES) + '.',
     courbe('{{eval:-(r)-2}} ; {{eval:(r)+2}}', FENETRE_Y_F,
            ['f(x) = {{a}}*x^2+({{c}})   bleu   nom=C_f', 'g(x) = {{k}}   rouge   pointillé']
            + lignes_vertes('{{a}}*x^2+({{c}})', morceaux_entre_ou_dehors('-{{r}}', '{{r}}')),
            'Parabole de f, droite y = {{k}} en pointillé, partie cherchée en vert.' + AXE_VERT,
            'A(-{{r}} ; {{k}}), B({{r}} ; {{k}})'),
     conclusion(selon('s', [affiche(e) for e in ENS_CARRE]))])

ADAPTE_INEQ_RACINE = variation(
    f_donnee('{{a}}\\sqrt{x}{{c;+}}') + ADAPTE_INEQ,
    [var('a', '2..4'), var('c', '1..9;±'), var('m', '1..3'), var('k', 'eval:(a)*(m)+(c)'), var('s', '0..3')],
    [case_ens(selon('s', ENS_RACINE))],
    ['$f$ est définie pour $x\\geqslant 0$ : les solutions sont **positives ou nulles**. '
     + DIVISE_POSITIF,
     '$${{a}}\\sqrt{x}{{c;+}}' + signe() + '{{k}}\\iff {{a}}\\sqrt{x}' + signe() + '{{eval:(k)-(c)}}\\iff'
     ' \\sqrt{x}' + signe() + '{{m}}$$',
     'On est ramené à une inéquation $\\sqrt{x}<k$ (**fonction racine carrée**, croissante : le sens est'
     ' conservé) : $\\sqrt{x}' + signe() + '{{m}}\\iff x' + signe() + '{{eval:(m)^2}}$, avec $x\\geqslant 0$.',
     courbe('-1 ; {{eval:(m)^2+3}}', FENETRE_Y_F,
            ['f(x) = {{a}}*sqrt(x)+({{c}})   bleu   nom=C_f', 'g(x) = {{k}}   rouge   pointillé']
            + lignes_vertes('{{a}}*sqrt(x)+({{c}})', morceaux_sous('{{m}}^2', '0')),
            'Courbe de f, droite y = {{k}} en pointillé, partie cherchée en vert.' + AXE_VERT,
            'A({{m}}^2 ; {{k}})'),
     conclusion(selon('s', [affiche(e) for e in ENS_RACINE]))])

ADAPTE_INEQ_CUBE = variation(
    f_donnee('{{a}}x^3{{c;+}}') + ADAPTE_INEQ,
    [var('a', '2..3'), var('c', '1..9;±'), var('r', '-2..2!0'), var('k', 'eval:(a)*(r)^3+(c)'),
     var('s', '0..3')],
    [case_ens(selon('s', ENS_CUBE))],
    [DIVISE_POSITIF,
     '$${{a}}x^3{{c;+}}' + signe() + '{{k}}\\iff {{a}}x^3' + signe() + '{{eval:(k)-(c)}}\\iff x^3' + signe()
     + '{{eval:(r)^3}}$$',
     'On est ramené à une inéquation $x^3<k$ (**fonction cube**, croissante : le sens est conservé) :'
     ' comme $({{r}})^3={{eval:(r)^3}}$, $x^3' + signe() + '{{eval:(r)^3}}\\iff x' + signe() + '{{r}}$.',
     courbe('-4 ; 4', FENETRE_Y_F,
            ['f(x) = {{a}}*x^3+({{c}})   bleu   nom=C_f', 'g(x) = {{k}}   rouge   pointillé']
            + lignes_vertes('{{a}}*x^3+({{c}})', morceaux_sous('{{r}}')),
            'Courbe de f, droite y = {{k}} en pointillé, partie cherchée en vert.' + AXE_VERT,
            'A({{r}} ; {{k}})'),
     conclusion(selon('s', [affiche(e) for e in ENS_CUBE]))])

SP_NC = {'a': 2, 'c': 1, 'r': 3, 'k': 19, 's': 0}
SP_NC2 = {'a': 3, 'c': -2, 'r': 2, 'k': 10, 's': 3}
SP_NR = {'a': 2, 'c': 1, 'm': 3, 'k': 7, 's': 1}
SP_NK = {'a': 2, 'c': 3, 'r': -2, 'k': -13, 's': 2}
MODELES.append(modele(
    '06-inequation-methode-adaptee', 'Résoudre f(x) < k en se ramenant à une fonction de référence',
    'f(x) < k avec f donnée par son expression (2x² + 1, 2√x + 1, 2x³ + 3) : isoler la fonction de'
    ' référence, puis résoudre par sa courbe ou sa croissance, les quatre sens (pièges : partie négative'
    ' oubliée, x ⩾ 0 oublié, m au lieu de m², crochets)',
    GENERALITES, 2, [ADAPTE_INEQ_CARRE, ADAPTE_INEQ_RACINE, ADAPTE_INEQ_CUBE],
    [spec('2x² + 1 < 19 : S = ]−3 ; 3[', 0, SP_NC, ']-3;3[', 'correct'),
     spec('Erreur : ]−∞ ; 3[', 0, SP_NC, ']-\\infty;3[', 'incorrect'),
     spec('Erreur : ]−9 ; 9[', 0, SP_NC, ']-9;9[', 'incorrect'),
     spec('3x² − 2 ⩾ 10 : S = ]−∞ ; −2] ∪ [2 ; +∞[', 0, SP_NC2, ']-\\infty;-2]\\cup[2;+\\infty[', 'correct'),
     spec('Erreur : [2 ; +∞[', 0, SP_NC2, '[2;+\\infty[', 'incorrect'),
     spec('2√x + 1 ⩽ 7 : S = [0 ; 9]', 1, SP_NR, '[0;9]', 'correct'),
     spec('Erreur : ]−∞ ; 9]', 1, SP_NR, ']-\\infty;9]', 'incorrect'),
     spec('Erreur : [0 ; 3]', 1, SP_NR, '[0;3]', 'incorrect'),
     spec('2x³ + 3 > −13 : S = ]−2 ; +∞[', 2, SP_NK, ']-2;+\\infty[', 'correct'),
     spec('Erreur : sens changé ]−∞ ; −2[', 2, SP_NK, ']-\\infty;-2[', 'incorrect'),
     spec('Erreur : ]−8 ; +∞[', 2, SP_NK, ']-8;+\\infty[', 'incorrect')],
    delay=120))

os.makedirs(DOSSIER, exist_ok=True)
for nom, m in MODELES:
    with open(os.path.join(DOSSIER, nom + '.json'), 'w', encoding='utf-8') as f:
        json.dump(m, f, ensure_ascii=False, indent='\t')
        f.write('\n')
# Mis en forme comme le pre-commit, pour que le script redonne les fichiers commités
subprocess.run(['pnpm', 'exec', 'prettier', '--write', DOSSIER], check=True,
               stdout=subprocess.DEVNULL)
print(f'{len(MODELES)} modèles écrits dans {DOSSIER}')
