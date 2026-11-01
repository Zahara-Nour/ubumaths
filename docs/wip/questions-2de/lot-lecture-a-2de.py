"""Écrit les 8 modèles du lot 2 bis A « Lecture graphique » de la 2de
dans scripts/questions/2de-lecture-a/.

Phase 0 validée par David le 2026-10-28 (§ 11 du journal `docs/wip/questions-2de-progress.md`).
Bornes : `bornes/lycee/2de.json` (2-492, 338, 453, 456, 340, 459, 341, 462) ; courbe fournie par
l'énoncé (l2-2) ; |x| = k et |x| < k seulement (l2-1) ; les quatre sens (l2-3). Un point par
modèle ; le nœud et le tag sont posés par la migration de rangement, après le `--publier` de David.

Décisions et pièges :
- réponse en ensemble : une case `S = ?`, `answerKind: 'intervalles'` (comme le lot 2), réunion
  `\\cup` comprise ; « 2 » sans accolades = faux ;
- solutions sur les nœuds de la grille : on construit la courbe à partir de ses solutions
  (f = k + c(x − p)(x − q), f = g + c(x − p)(x − q)) ;
- énoncé : la courbe seule ; corrigé : la droite y = k (ou C_g) en pointillé, les points
  d'intersection nommés, la partie solution de C_f repassée en vert (`sur …`, disque plein ou vide
  à la borne ; une borne hors fenêtre, ±10, n'a pas de disque) ;
- sens de l'inégalité tiré (`s` : 0 <, 1 ⩽, 2 >, 3 ⩾) ;
- jamais de `|` dans un `{{if:…}}` (séparateur) : valeur absolue écrite `\\lvert x\\rvert` ;
- les variables sont substituées telles quelles dans les `eval` : toujours `(a)`, `-(a)` ;
- variables `e` et `i` interdites.

    python3 docs/wip/questions-2de/lot-lecture-a-2de.py scripts/questions/2de-lecture-a
"""
import json
import os
import subprocess
import sys

DOSSIER = sys.argv[1]
THEME = 'Fonctions'
GENERALITES = ('Généralités', 'Lecture graphique')
AFFINES = ('Fonctions affines', 'Lecture graphique')
VALEUR_ABSOLUE = ('Valeur absolue', 'Lecture graphique')
CARRE = ('Fonction carré', 'Lecture graphique')
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


def courbe(x, y, lignes, description, points=None):
    """Bloc ```courbe : fenêtre, grille 1 ; 1, une ligne par fonction."""
    texte = '```courbe\nx: ' + x + '\ny: ' + y + '\ngrille: 1 ; 1\n'
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
BORNES = ['les abscisses des points d\'intersection sont **exclues**',
          'les abscisses des points d\'intersection sont **comprises**',
          'les abscisses des points d\'intersection sont **exclues**',
          'les abscisses des points d\'intersection sont **comprises**']


def interieur(a, b, large):
    return ('[' if large else ']') + a + ';' + b + (']' if large else '[')


def exterieur(gauche, a, b, droite, large):
    """]gauche ; a[ ∪ ]b ; droite[ ; gauche, droite = bornes du domaine (fermées) ou ±∞."""
    og = ']' if gauche == '-\\infty' else '['
    fd = '[' if droite == '+\\infty' else ']'
    return (og + gauche + ';' + a + (']' if large else '[') + '\\cup'
            + ('[' if large else ']') + b + ';' + droite + fd)


def entre_ou_dehors(a, b, gauche, droite):
    """Ensembles pour s = 0..3 quand f − k (ou f − g) est négatif ENTRE a et b."""
    return [interieur(a, b, False), interieur(a, b, True),
            exterieur(gauche, a, b, droite, False), exterieur(gauche, a, b, droite, True)]


def affiche(ensemble):
    """Écriture du corrigé : `\\left]…\\right[`, espace fine après le « ; »."""
    out = ensemble.replace(';', '\\,;')
    morceaux = out.split('\\cup')
    joli = []
    for m in morceaux:
        joli.append('\\left' + m[0] + m[1:-1] + '\\right' + m[-1])
    return '\\cup'.join(joli)


def surligne(nom, expression, a, b, large, gauche_ouverte=None, droite_ouverte=None):
    """Ligne de courbe repassée en vert sur [a ; b] (crochets selon `large`)."""
    og = gauche_ouverte if gauche_ouverte is not None else ('[' if large else ']')
    fd = droite_ouverte if droite_ouverte is not None else (']' if large else '[')
    return nom + '(x) = ' + expression + ' sur ' + og + a + ' ; ' + b + fd + '   vert'


def surlignes_entre_ou_dehors(expr, a, b, gauche, droite, noms='hj'):
    """Deux lignes h, j selon `s` : entre a et b (s = 0, 1), dehors (s = 2, 3).

    `gauche`, `droite` : bornes du domaine (fermées) ; `-10`, `10` = hors fenêtre, sans disque.
    `expr` = '0' : l'ensemble des solutions repassé sur l'axe des abscisses (noms 'tu').
    """
    n1, n2 = noms
    h = [surligne(n1, expr, a, b, False), surligne(n1, expr, a, b, True),
         surligne(n1, expr, gauche, a, False, '['), surligne(n1, expr, gauche, a, True, '[')]
    j = [surligne(n2, expr, a, b, False), surligne(n2, expr, a, b, True),
         surligne(n2, expr, b, droite, False, None, ']'),
         surligne(n2, expr, b, droite, True, None, ']')]
    return h, j


def sur_axe(nom, x, y):
    """Point nom'(x ; 0) de l'axe des abscisses, omis quand y = 0 (il serait confondu avec le
    point de la courbe) ; `y` = nom d'une variable."""
    return '{{if:' + y + '==0| |, ' + nom + "'(" + x + ' ; 0)}}'


AXE = ' Les solutions sont marquées sur l\'axe des abscisses.'
AXE_VERT = ' L\'ensemble des solutions est repassé en vert sur l\'axe des abscisses.'


MODELES = []

# =============================================================================================
# Généralités
# =============================================================================================

# --- 1. 2-492 : antécédents lus sur la courbe ------------------------------------------------

def antecedents(domaine):
    return ('La courbe $\\mathcal{C}_f$ ci-dessous représente une fonction $f$ définie sur $'
            + domaine + '$.\n\n')


QUESTION_ANTECEDENTS = ('Détermine graphiquement les antécédents de ${{k}}$ par $f$, c\'est-à-dire'
                        ' les solutions de l\'équation $f(x)={{k}}$.' + S_EGAL)
METHODE_ANTECEDENTS = ('On trace la droite horizontale d\'équation $y={{k}}$ : les antécédents de'
                       ' ${{k}}$ sont les **abscisses** des points où elle coupe $\\mathcal{C}_f$.')

# Parabole : f = k + c(x − p)(x − q), définie sur [p − 1 ; q + 1] ; deux antécédents p et q.
F_PARABOLE = '{{k}}+({{c}})*(x-({{p}}))*(x-({{q}}))'
Y_PARABOLE = ('{{eval:floor(min(0,(k)-(c)*(d)*(d)/4,(k)+(c)*(1+(d))))-1}} ; '
              '{{eval:ceil(max(0,(k)-(c)*(d)*(d)/4,(k)+(c)*(1+(d))))+1}}')
X_PARABOLE = '{{eval:(p)-2}} ; {{eval:max(1,(q)+2)}}'
DOM_PARABOLE = '[{{eval:(p)-1}} ; {{eval:(q)+1}}]'
VAR_PARABOLE = [var('p', '-4..0'), var('d', '2..4'), var('q', 'eval:(p)+(d)'), var('c', '1|-1'),
                var('k', '-3..3')]

ANT_DEUX = variation(
    antecedents('\\left[{{eval:(p)-1}}\\,;{{eval:(q)+1}}\\right]')
    + courbe(X_PARABOLE, Y_PARABOLE, ['f(x) = ' + F_PARABOLE + ' sur ' + DOM_PARABOLE
                                      + '   bleu   nom=C_f'],
             'Courbe en forme de parabole d\'une fonction f.')
    + '\n\n' + QUESTION_ANTECEDENTS,
    VAR_PARABOLE,
    '\\{ {{p}} ; {{q}} \\}',
    [METHODE_ANTECEDENTS,
     courbe(X_PARABOLE, Y_PARABOLE,
            ['f(x) = ' + F_PARABOLE + ' sur ' + DOM_PARABOLE + '   bleu   nom=C_f',
             'g(x) = {{k}}   rouge   pointillé'],
            'Courbe de f et droite horizontale y = {{k}}, qui la coupe en deux points A et B.' + AXE,
            'A({{p}} ; {{k}}), B({{q}} ; {{k}})' + sur_axe('A', '{{p}}', 'k')
            + sur_axe('B', '{{q}}', 'k')),
     'La droite coupe $\\mathcal{C}_f$ en $A({{p}}\\,;{{k}})$ et $B({{q}}\\,;{{k}})$ : ${{k}}$ a'
     ' deux antécédents, leurs abscisses, lues sur l\'axe des abscisses. ' + conclusion('\\{ {{p}} ; {{q}} \\}')])

# Cubique : f = k + c(x − p)(x − q)(x − r), définie sur [p − 0,5 ; r + 0,5] ; trois antécédents.
F_CUBIQUE = '{{k}}+({{c}})*(x-({{p}}))*(x-({{q}}))*(x-({{r}}))'
DOM_CUBIQUE = '[{{eval:(p)-0.5}} ; {{eval:(r)+0.5}}]'
X_CUBIQUE = '{{eval:(p)-1}} ; {{eval:(r)+1}}'
Y_CUBIQUE = '{{eval:min(-1,(k)-4)}} ; {{eval:max(1,(k)+4)}}'

ANT_TROIS = variation(
    antecedents('\\left[{{eval:(p)-0.5;d}}\\,;{{eval:(r)+0.5;d}}\\right]')
    + courbe(X_CUBIQUE, Y_CUBIQUE, ['f(x) = ' + F_CUBIQUE + ' sur ' + DOM_CUBIQUE
                                    + '   bleu   nom=C_f'],
             'Courbe d\'une fonction f qui monte et descend plusieurs fois.')
    + '\n\n' + QUESTION_ANTECEDENTS,
    [var('p', '-3..-1'), var('g', '1|2'), var('h', '1|2'), var('q', 'eval:(p)+(g)'),
     var('r', 'eval:(q)+(h)'), var('c', '0.5|-0.5'), var('k', '-2..2')],
    '\\{ {{p}} ; {{q}} ; {{r}} \\}',
    [METHODE_ANTECEDENTS,
     courbe(X_CUBIQUE, Y_CUBIQUE,
            ['f(x) = ' + F_CUBIQUE + ' sur ' + DOM_CUBIQUE + '   bleu   nom=C_f',
             'g(x) = {{k}}   rouge   pointillé'],
            'Courbe de f et droite horizontale y = {{k}}, qui la coupe en trois points A, B et C.'
            + AXE,
            'A({{p}} ; {{k}}), B({{q}} ; {{k}}), C({{r}} ; {{k}})' + sur_axe('A', '{{p}}', 'k')
            + sur_axe('B', '{{q}}', 'k') + sur_axe('C', '{{r}}', 'k')),
     'La droite coupe $\\mathcal{C}_f$ en trois points : ${{k}}$ a trois antécédents, leurs'
     ' abscisses, lues sur l\'axe des abscisses. '
     + conclusion('\\{ {{p}} ; {{q}} ; {{r}} \\}')])

# Sommet : f = m + c(x − a)², définie sur [a − 3 ; a + 3] ; k = m (un antécédent) ou k du
# mauvais côté du sommet (aucun).
F_SOMMET = '{{m}}+({{c}})*(x-({{a}}))^2'
DOM_SOMMET = '[{{eval:(a)-3}} ; {{eval:(a)+3}}]'
X_SOMMET = '{{eval:min(-1,(a)-4)}} ; {{eval:max(1,(a)+4)}}'
Y_SOMMET = ('{{eval:min(0,(m),(m)+9*(c),(k))-1}} ; {{eval:max(0,(m),(m)+9*(c),(k))+1}}')

ANT_SOMMET = variation(
    antecedents('\\left[{{eval:(a)-3}}\\,;{{eval:(a)+3}}\\right]')
    + courbe(X_SOMMET, Y_SOMMET, ['f(x) = ' + F_SOMMET + ' sur ' + DOM_SOMMET
                                  + '   bleu   nom=C_f'],
             'Parabole d\'une fonction f, de sommet ({{a}} ; {{m}}).')
    + '\n\n' + QUESTION_ANTECEDENTS,
    [var('a', '-2..2'), var('m', '-2..2'), var('c', '1|-1'), var('t', '0|1'), var('u', '1..3'),
     var('k', 'eval:(m)-(t)*(c)*(u)')],
    selon('t', ['\\{ {{a}} \\}', '\\varnothing']),
    [METHODE_ANTECEDENTS,
     courbe(X_SOMMET, Y_SOMMET,
            ['f(x) = ' + F_SOMMET + ' sur ' + DOM_SOMMET + '   bleu   nom=C_f',
             'g(x) = {{k}}   rouge   pointillé'],
            'Courbe de f et droite horizontale y = {{k}}.',
            selon('t', ['S({{a}} ; {{m}})' + sur_axe('S', '{{a}}', 'm'), ' '])),
     selon('t', ['La droite touche $\\mathcal{C}_f$ en un seul point, le sommet $({{a}}\\,;{{m}})$ :'
                 ' ${{k}}$ a un seul antécédent. ' + conclusion('\\{ {{a}} \\}'),
                 'La droite est {{if:c>0|sous|au-dessus de}} la courbe et ne la coupe pas : ${{k}}$'
                 ' n\'a aucun antécédent. ' + conclusion('\\varnothing')])])

SP_DEUX = {'p': -3, 'd': 4, 'q': 1, 'c': 1, 'k': 2}
SP_TROIS = {'p': -2, 'g': 1, 'h': 2, 'q': -1, 'r': 1, 'c': '0.5', 'k': 1}
SP_UN = {'a': 1, 'm': -1, 'c': 1, 't': 0, 'u': 2, 'k': -1}
SP_AUCUN = {'a': 1, 'm': -1, 'c': 1, 't': 1, 'u': 2, 'k': -3}
MODELES.append(modele(
    '01-antecedents-graphiques', 'Déterminer graphiquement des antécédents',
    'Antécédents de k lus sur une courbe : deux, trois, un seul (sommet) ou aucun',
    GENERALITES, 1, [ANT_DEUX, ANT_TROIS, ANT_SOMMET],
    [spec('Antécédents de 2 : S = {−3 ; 1}', 0, SP_DEUX, '\\{-3;1\\}', 'correct'),
     spec('Dans l\'autre ordre', 0, SP_DEUX, '\\{1;-3\\}', 'correct'),
     spec('Erreur : un seul antécédent ({1})', 0, SP_DEUX, '\\{1\\}', 'incorrect'),
     spec('Erreur : k recopié ({2})', 0, SP_DEUX, '\\{2\\}', 'incorrect'),
     spec('Erreur : sans accolades', 0, SP_DEUX, '-3;1', 'incorrect'),
     spec('Trois antécédents de 1 : S = {−2 ; −1 ; 1}', 1, SP_TROIS, '\\{-2;-1;1\\}', 'correct'),
     spec('Erreur : deux sur trois', 1, SP_TROIS, '\\{-2;1\\}', 'incorrect'),
     spec('Sommet : S = {1}', 2, SP_UN, '\\{1\\}', 'correct'),
     spec('Erreur : l\'ordonnée du sommet ({−1})', 2, SP_UN, '\\{-1\\}', 'incorrect'),
     spec('Aucun antécédent : S = ∅', 2, SP_AUCUN, '\\varnothing', 'correct'),
     spec('Erreur : {0} pour « aucun »', 2, SP_AUCUN, '\\{0\\}', 'incorrect')],
    delay=60))

# --- 2. 2-338 : f(x) = g(x) ------------------------------------------------------------------

# g affine (pente ±1), f = g + c(x − p)(x − q), toutes deux sur [p − 1 ; q + 1].
G_AFFINE = '({{a}})*x+({{b}})'
F_DEUX = G_AFFINE + '+({{c}})*(x-({{p}}))*(x-({{q}}))'
DOM_DEUX = '[{{eval:(p)-1}} ; {{eval:(q)+1}}]'
GA = '(a)*((p)-1)+(b)'
GB = '(a)*((q)+1)+(b)'
Y_DEUX = ('{{eval:min(0,' + GA + ',' + GB + ')-5}} ; {{eval:max(0,' + GA + ',' + GB + ')+5}}')
VAR_DEUX = [var('p', '-4..0'), var('d', '2..4'), var('q', 'eval:(p)+(d)'), var('a', '1|-1'),
            var('b', '-2..2'), var('c', '1|-1'), var('e', 'eval:(a)*(p)+(b)'),
            var('w', 'eval:(a)*(q)+(b)')]
DEUX_COURBES = ['f(x) = ' + F_DEUX + ' sur ' + DOM_DEUX + '   bleu   nom=C_f',
                'g(x) = ' + G_AFFINE + ' sur ' + DOM_DEUX + '   rouge   nom=C_g']
DEUX_DESC = 'Une courbe C_f en forme de parabole et une droite C_g, qui se coupent en deux points.'
INTRO_DEUX = ('Les courbes $\\mathcal{C}_f$ et $\\mathcal{C}_g$ ci-dessous représentent deux'
              ' fonctions $f$ et $g$ définies sur $\\left[{{eval:(p)-1}}\\,;{{eval:(q)+1}}\\right]$.'
              '\n\n')
POINTS_DEUX = 'A({{p}} ; g({{p}})), B({{q}} ; g({{q}}))'

EGAL_DEUX = variation(
    INTRO_DEUX + courbe(X_PARABOLE, Y_DEUX, DEUX_COURBES, DEUX_DESC)
    + '\n\nRésous graphiquement l\'équation $f(x)=g(x)$.' + S_EGAL,
    VAR_DEUX,
    '\\{ {{p}} ; {{q}} \\}',
    ['Les solutions de $f(x)=g(x)$ sont les **abscisses** des points d\'intersection de'
     ' $\\mathcal{C}_f$ et $\\mathcal{C}_g$.',
     courbe(X_PARABOLE, Y_DEUX, DEUX_COURBES, DEUX_DESC + AXE,
            POINTS_DEUX + sur_axe('A', '{{p}}', 'e') + sur_axe('B', '{{q}}', 'w')),
     'Les courbes se coupent en $A$ et $B$, d\'abscisses ${{p}}$ et ${{q}}$. '
     + conclusion('\\{ {{p}} ; {{q}} \\}')])

SP_EG = {'p': -2, 'd': 3, 'q': 1, 'a': 1, 'b': 1, 'c': 1, 'e': -1, 'w': 2}
MODELES.append(modele(
    '02-equation-f-egal-g-graphique', 'Résoudre graphiquement une équation f(x) = g(x)',
    'Solutions de f(x) = g(x) : abscisses des points d\'intersection d\'une parabole et d\'une'
    ' droite',
    GENERALITES, 2, [EGAL_DEUX],
    [spec('Intersections en −2 et 1 : S = {−2 ; 1}', 0, SP_EG, '\\{-2;1\\}', 'correct'),
     spec('Erreur : les ordonnées ({−1 ; 2})', 0, SP_EG, '\\{-1;2\\}', 'incorrect'),
     spec('Erreur : un seul point', 0, SP_EG, '\\{1\\}', 'incorrect'),
     spec('Erreur : sans accolades', 0, SP_EG, '-2;1', 'incorrect')],
    delay=60))

# --- 3. 2-453 : f(x) < g(x) ------------------------------------------------------------------

def ineg_deux(c):
    """c = 1 : f sous g entre p et q ; c = −1 : f sous g en dehors."""
    a, b = '{{p}}', '{{q}}'
    gauche, droite = '{{eval:(p)-1}}', '{{eval:(q)+1}}'
    ensembles = entre_ou_dehors(a, b, gauche, droite)
    h, j = surlignes_entre_ou_dehors(F_DEUX.replace('{{c}}', str(c)), a, b, gauche, droite)
    t, u = surlignes_entre_ou_dehors('0', a, b, gauche, droite, 'tu')
    if c < 0:
        ensembles = ensembles[2:] + ensembles[:2]
        h, j = h[2:] + h[:2], j[2:] + j[:2]
        t, u = t[2:] + t[:2], u[2:] + u[:2]
    lignes = [selon('s', h), selon('s', j), selon('s', t), selon('s', u)]
    courbes = [l.replace('{{c}}', str(c)) for l in DEUX_COURBES]
    return variation(
        INTRO_DEUX.replace('{{c}}', str(c)) + courbe(X_PARABOLE, Y_DEUX, courbes, DEUX_DESC)
        + '\n\nRésous graphiquement l\'inéquation $f(x)' + signe() + 'g(x)$.' + S_EGAL,
        [v for v in VAR_DEUX if v['name'] != 'c'] + [var('s', '0..3')],
        selon('s', ensembles),
        ['On cherche les abscisses des points de $\\mathcal{C}_f$ situés ' + selon('s', POSITION)
         + ' $\\mathcal{C}_g$ ; ' + selon('s', BORNES) + '.',
         courbe(X_PARABOLE, Y_DEUX, courbes + lignes, DEUX_DESC + ' La partie cherchée de C_f est'
                ' en vert.' + AXE_VERT, POINTS_DEUX),
         'Les courbes se coupent en $x={{p}}$ et $x={{q}}$ ; $f$ est définie sur'
         ' $\\left[{{eval:(p)-1}}\\,;{{eval:(q)+1}}\\right]$. '
         + conclusion(selon('s', [affiche(x) for x in ensembles]))])


# Pour < et c = 1 : ]p ; q[ ; pour > et c = 1 : [p − 1 ; p[ ∪ ]q ; q + 1]
SP_IP = {'p': -2, 'd': 3, 'q': 1, 'a': 1, 'b': 1, 'e': -1, 'w': 2, 's': 0}
SP_IPS = {'p': -2, 'd': 3, 'q': 1, 'a': 1, 'b': 1, 'e': -1, 'w': 2, 's': 3}
SP_IN = {'p': -2, 'd': 3, 'q': 1, 'a': -1, 'b': 0, 'e': 2, 'w': -1, 's': 1}
MODELES.append(modele(
    '03-inequation-f-inferieur-g-graphique', 'Résoudre graphiquement une inéquation f(x) < g(x)',
    'Solutions de f(x) < g(x) lues sur une parabole et une droite : entre les points'
    ' d\'intersection ou en dehors, les quatre sens',
    GENERALITES, 3, [ineg_deux(1), ineg_deux(-1)],
    [spec('f < g, parabole vers le haut : S = ]−2 ; 1[', 0, SP_IP, ']-2;1[', 'correct'),
     spec('Erreur : crochets fermés', 0, SP_IP, '[-2;1]', 'incorrect'),
     spec('Erreur : en dehors', 0, SP_IP, '[-3;-2[\\cup]1;2]', 'incorrect'),
     spec('f ⩾ g : S = [−3 ; −2] ∪ [1 ; 2]', 0, SP_IPS, '[-3;-2]\\cup[1;2]', 'correct'),
     spec('Erreur : ]−∞ ; −2] ∪ [1 ; +∞[ (domaine oublié)', 0, SP_IPS,
          ']-\\infty;-2]\\cup[1;+\\infty[', 'incorrect'),
     spec('f ⩽ g, parabole vers le bas : S = [−3 ; −2] ∪ [1 ; 2]', 1, SP_IN,
          '[-3;-2]\\cup[1;2]', 'correct'),
     spec('Erreur : entre les points [−2 ; 1]', 1, SP_IN, '[-2;1]', 'incorrect')],
    delay=90))

# =============================================================================================
# Fonctions affines
# =============================================================================================

# --- 4. 2-456 : f(x) < k, f affine -----------------------------------------------------------

def ineg_affine(pentes, croissante):
    """f(x) = m x + p, k = f(x0) ; croissante : f(x) < k ⇔ x < x0."""
    x0 = '{{z}}'
    expr = '({{m}})*x+({{p}})'
    gauche = [']-\\infty;' + x0 + '[', ']-\\infty;' + x0 + ']']
    droite = [']' + x0 + ';+\\infty[', '[' + x0 + ';+\\infty[']
    ensembles = gauche + droite if croissante else droite + gauche
    h_gauche = [surligne('h', expr, '-10', x0, False, '['),
                surligne('h', expr, '-10', x0, True, '[')]
    h_droite = [surligne('h', expr, x0, '10', False, None, ']'),
                surligne('h', expr, x0, '10', True, None, ']')]
    h = h_gauche + h_droite if croissante else h_droite + h_gauche
    t = [l.replace('h(x) = ' + expr, 't(x) = 0') for l in h]
    y = ('{{eval:min(-1,(p)-4*abs(m))-1}} ; {{eval:max(1,(p)+4*abs(m))+1}}')
    droite_f = 'f(x) = ' + expr + '   bleu   nom=\\mathcal{D}'
    desc = 'Droite D représentant une fonction affine f.'
    return variation(
        'La droite $\\mathcal{D}$ ci-dessous représente une fonction affine $f$.\n\n'
        + courbe('-5 ; 5', y, [droite_f], desc)
        + '\n\nRésous graphiquement l\'inéquation $f(x)' + signe() + '{{k}}$.' + S_EGAL,
        [var('m', pentes), var('z', '-2..2'), var('p', '-2..2'), var('k', 'eval:(m)*(z)+(p)'),
         var('s', '0..3')],
        selon('s', ensembles),
        ['On trace la droite horizontale d\'équation $y={{k}}$ ; elle coupe $\\mathcal{D}$ au point'
         ' $A$ d\'abscisse ${{z}}$. On cherche les abscisses des points de $\\mathcal{D}$ situés '
         + selon('s', POSITION) + ' cette droite.',
         courbe('-5 ; 5', y, [droite_f, 'g(x) = {{k}}   rouge   pointillé', selon('s', h),
                              selon('s', t)],
                desc + ' Droite y = {{k}} en pointillé, partie cherchée en vert.' + AXE_VERT,
                'A({{z}} ; {{k}})'),
         'La fonction $f$ est ' + ('croissante' if croissante else 'décroissante') + ' : la partie'
         ' cherchée est à ' + selon('s', ['gauche', 'gauche', 'droite', 'droite'] if croissante
                                     else ['droite', 'droite', 'gauche', 'gauche'])
         + ' de $A$, ' + selon('s', ['borne exclue', 'borne comprise', 'borne exclue',
                                     'borne comprise']) + '. '
         + conclusion(selon('s', [affiche(x) for x in ensembles]))])


SP_AC = {'m': 2, 'z': 1, 'p': -1, 'k': 1, 's': 0}
SP_AD = {'m': -1, 'z': -2, 'p': 1, 'k': 3, 's': 1}
MODELES.append(modele(
    '04-inequation-affine-graphique', 'Résoudre graphiquement une inéquation f(x) < k (affine)',
    'Inéquation f(x) < k lue sur la droite d\'une fonction affine : croissante, décroissante, les'
    ' quatre sens',
    AFFINES, 1, [ineg_affine('1|2', True), ineg_affine('-1|-2', False)],
    [spec('f croissante, f(x) < 1 : S = ]−∞ ; 1[', 0, SP_AC, ']-\\infty;1[', 'correct'),
     spec('Erreur : mauvais côté', 0, SP_AC, ']1;+\\infty[', 'incorrect'),
     spec('Erreur : crochet fermé', 0, SP_AC, ']-\\infty;1]', 'incorrect'),
     spec('f décroissante, f(x) ⩽ 3 : S = [−2 ; +∞[', 1, SP_AD, '[-2;+\\infty[', 'correct'),
     spec('Erreur : côté de la croissante', 1, SP_AD, ']-\\infty;-2]', 'incorrect'),
     spec('Erreur : k lu pour la borne', 1, SP_AD, '[3;+\\infty[', 'incorrect')],
    delay=60))

# =============================================================================================
# Fonctions de référence : |x| et x²
# =============================================================================================

def reference(intro, expr_courbe, x, y, nom_f):
    return intro + '\n\n' + courbe(x, y, ['f(x) = ' + expr_courbe + '   bleu   nom=C_f'],
                                   'Courbe de la fonction ' + nom_f + '.')


def equation_reference(intro, expr_courbe, expr_tex, x, y, nom_f, valeurs_k, racine, raison):
    """Variation 0 : deux solutions ±r ; variation 1 : k = 0 ({0}) ou k < 0 (∅)."""
    deux = variation(
        reference(intro, expr_courbe, x, y, nom_f)
        + '\n\nRésous graphiquement l\'équation $' + expr_tex + '={{k}}$.' + S_EGAL,
        [var('k', valeurs_k), var('r', racine)],
        '\\{ -{{r}} ; {{r}} \\}',
        ['On trace la droite horizontale d\'équation $y={{k}}$ : les solutions sont les'
         ' **abscisses** des points où elle coupe $\\mathcal{C}_f$.',
         courbe(x, y, ['f(x) = ' + expr_courbe + '   bleu   nom=C_f',
                       'g(x) = {{k}}   rouge   pointillé'],
                'Courbe de la fonction ' + nom_f + ' et droite y = {{k}}, qui la coupe en A et B.'
                + AXE,
                'A({{eval:-(r)}} ; {{k}}), B({{r}} ; {{k}}), A\'({{eval:-(r)}} ; 0), B\'({{r}} ; 0)'),
         'La droite coupe la courbe en deux points, d\'abscisses $-{{r}}$ et ${{r}}$. '
         + conclusion('\\{ -{{r}} ; {{r}} \\}')])
    cas = variation(
        reference(intro, expr_courbe, x, '-5 ; ' + y.split(';')[1].strip(), nom_f)
        + '\n\nRésous graphiquement l\'équation $' + expr_tex + '={{k}}$.' + S_EGAL,
        [var('t', '0|1'), var('u', '1..4'), var('k', 'eval:0-(t)*(u)')],
        selon('t', ['\\{ 0 \\}', '\\varnothing']),
        ['On trace la droite horizontale d\'équation $y={{k}}$.',
         courbe(x, '-5 ; ' + y.split(';')[1].strip(),
                ['f(x) = ' + expr_courbe + '   bleu   nom=C_f',
                 'g(x) = {{k}}   rouge   pointillé'],
                'Courbe de la fonction ' + nom_f + ' et droite y = {{k}}.',
                selon('t', ['O(0 ; 0)', ' '])),
         selon('t', ['La droite $y=0$ (l\'axe des abscisses) touche la courbe en un seul point,'
                     ' l\'origine. ' + conclusion('\\{ 0 \\}'),
                     'La droite est sous la courbe et ne la coupe pas : ' + raison + ' '
                     + conclusion('\\varnothing')])])
    return [deux, cas]


def inequation_reference(intro, expr_courbe, expr_tex, x, y, nom_f, valeurs_k, racine, raison):
    """Variation 0 : k > 0, entre −r et r ou en dehors ; variation 1 : k < 0 (∅ ou ℝ)."""
    ensembles = entre_ou_dehors('-{{r}}', '{{r}}', '-\\infty', '+\\infty')
    h, j = surlignes_entre_ou_dehors(expr_courbe, '-{{r}}', '{{r}}', '-10', '10')
    t, u = surlignes_entre_ou_dehors('0', '-{{r}}', '{{r}}', '-10', '10', 'tu')
    lignes = [selon('s', h), selon('s', j), selon('s', t), selon('s', u)]
    positif = variation(
        reference(intro, expr_courbe, x, y, nom_f)
        + '\n\nRésous graphiquement l\'inéquation $' + expr_tex + signe() + '{{k}}$.' + S_EGAL,
        [var('k', valeurs_k), var('r', racine), var('s', '0..3')],
        selon('s', ensembles),
        ['On trace la droite horizontale d\'équation $y={{k}}$ ; elle coupe la courbe en $A$ et $B$,'
         ' d\'abscisses $-{{r}}$ et ${{r}}$. On cherche les abscisses des points de la courbe'
         ' situés ' + selon('s', POSITION) + ' cette droite ; ' + selon('s', BORNES) + '.',
         courbe(x, y, ['f(x) = ' + expr_courbe + '   bleu   nom=C_f',
                       'g(x) = {{k}}   rouge   pointillé'] + lignes,
                'Courbe de la fonction ' + nom_f + ', droite y = {{k}} en pointillé, partie'
                ' cherchée en vert.' + AXE_VERT,
                'A({{eval:-(r)}} ; {{k}}), B({{r}} ; {{k}})'),
         conclusion(selon('s', [affiche(x) for x in ensembles]))])
    negatif = variation(
        reference(intro, expr_courbe, x, '-5 ; ' + y.split(';')[1].strip(), nom_f)
        + '\n\nRésous graphiquement l\'inéquation $' + expr_tex + signe() + '{{k}}$.' + S_EGAL,
        [var('k', '-4..-1'), var('s', '0..3')],
        selon('s', ['\\varnothing', '\\varnothing', '\\mathbb{R}', '\\mathbb{R}']),
        ['On trace la droite horizontale d\'équation $y={{k}}$ : elle est entièrement **sous** la'
         ' courbe, car ' + raison,
         courbe(x, '-5 ; ' + y.split(';')[1].strip(),
                ['f(x) = ' + expr_courbe + '   bleu   nom=C_f',
                 'g(x) = {{k}}   rouge   pointillé',
                 selon('s', [' ', ' ', 't(x) = 0   vert', 't(x) = 0   vert'])],
                'Courbe de la fonction ' + nom_f + ' et droite y = {{k}}, sous la courbe.'
                + selon('s', ['', '', AXE_VERT, AXE_VERT])),
         selon('s', ['Aucun point de la courbe n\'est sous la droite. ' + conclusion('\\varnothing'),
                     'Aucun point de la courbe n\'est sous la droite. ' + conclusion('\\varnothing'),
                     'Tous les points de la courbe sont au-dessus de la droite. '
                     + conclusion('\\mathbb{R}'),
                     'Tous les points de la courbe sont au-dessus de la droite. '
                     + conclusion('\\mathbb{R}')])])
    return [positif, negatif]


# --- 5. 2-340 et 6. 2-459 : valeur absolue ---------------------------------------------------

INTRO_ABS = ('On a tracé ci-dessous la courbe $\\mathcal{C}_f$ de la fonction valeur absolue'
             ' $f : x\\mapsto \\lvert x\\rvert$.')
RAISON_ABS = 'une valeur absolue n\'est jamais négative.'
ABS = ('abs(x)', '\\lvert x\\rvert', '-5 ; 5', '-2 ; 5', 'valeur absolue')

SP_A2 = {'k': 3, 'r': 3}
SP_A0 = {'t': 0, 'u': 2, 'k': 0}
SP_AV = {'t': 1, 'u': 2, 'k': -2}
MODELES.append(modele(
    '05-equation-valeur-absolue-graphique',
    'Résoudre graphiquement une équation |x| = k',
    'Équation |x| = k lue sur la courbe de la valeur absolue : deux solutions, k = 0, k < 0',
    VALEUR_ABSOLUE, 1,
    equation_reference(INTRO_ABS, *ABS, '1..4', 'eval:k', RAISON_ABS),
    [spec('|x| = 3 : S = {−3 ; 3}', 0, SP_A2, '\\{-3;3\\}', 'correct'),
     spec('Erreur : solution négative oubliée', 0, SP_A2, '\\{3\\}', 'incorrect'),
     spec('Erreur : sans accolades', 0, SP_A2, '-3;3', 'incorrect'),
     spec('|x| = 0 : S = {0}', 1, SP_A0, '\\{0\\}', 'correct'),
     spec('Erreur : ∅ pour k = 0', 1, SP_A0, '\\varnothing', 'incorrect'),
     spec('|x| = −2 : S = ∅', 1, SP_AV, '\\varnothing', 'correct'),
     spec('Erreur : {−2 ; 2}', 1, SP_AV, '\\{-2;2\\}', 'incorrect')],
    delay=45))

SP_AI = {'k': 2, 'r': 2, 's': 0}
SP_AS = {'k': 4, 'r': 4, 's': 3}
SP_AN = {'k': -1, 's': 2}
MODELES.append(modele(
    '06-inequation-valeur-absolue-graphique',
    'Résoudre graphiquement une inéquation |x| < k',
    'Inéquation |x| < k lue sur la courbe de la valeur absolue : k > 0 (entre −k et k, ou en'
    ' dehors, les quatre sens), k < 0 (∅ ou ℝ)',
    VALEUR_ABSOLUE, 2,
    inequation_reference(INTRO_ABS, *ABS, '1..4', 'eval:k', RAISON_ABS),
    [spec('|x| < 2 : S = ]−2 ; 2[', 0, SP_AI, ']-2;2[', 'correct'),
     spec('Erreur : crochets fermés', 0, SP_AI, '[-2;2]', 'incorrect'),
     spec('Erreur : ]−∞ ; 2[', 0, SP_AI, ']-\\infty;2[', 'incorrect'),
     spec('|x| ⩾ 4 : S = ]−∞ ; −4] ∪ [4 ; +∞[', 0, SP_AS, ']-\\infty;-4]\\cup[4;+\\infty[',
          'correct'),
     spec('Erreur : [4 ; +∞[ seulement', 0, SP_AS, '[4;+\\infty[', 'incorrect'),
     spec('Erreur : [−4 ; 4]', 0, SP_AS, '[-4;4]', 'incorrect'),
     spec('|x| > −1 : S = ℝ', 1, SP_AN, '\\mathbb{R}', 'correct'),
     spec('Erreur : ∅', 1, SP_AN, '\\varnothing', 'incorrect')],
    delay=60))

# --- 7. 2-341 et 8. 2-462 : fonction carré ---------------------------------------------------

INTRO_CARRE = ('On a tracé ci-dessous la courbe $\\mathcal{C}_f$ de la fonction carré'
               ' $f : x\\mapsto x^2$.')
RAISON_CARRE = 'un carré n\'est jamais négatif.'
CARRE_F = ('x^2', 'x^2', '-4 ; 4', '-2 ; 10', 'carré')

SP_C2 = {'k': 4, 'r': 2}
SP_C0 = {'t': 0, 'u': 3, 'k': 0}
SP_CV = {'t': 1, 'u': 3, 'k': -3}
MODELES.append(modele(
    '07-equation-carre-graphique', 'Résoudre graphiquement une équation x² = k',
    'Équation x² = k lue sur la parabole de la fonction carré : k carré parfait, k = 0, k < 0',
    CARRE, 1,
    equation_reference(INTRO_CARRE, *CARRE_F, '1|4|9', 'eval:sqrt(k)', RAISON_CARRE),
    [spec('x² = 4 : S = {−2 ; 2}', 0, SP_C2, '\\{-2;2\\}', 'correct'),
     spec('Erreur : solution négative oubliée', 0, SP_C2, '\\{2\\}', 'incorrect'),
     spec('Erreur : image de 4 lue ({16})', 0, SP_C2, '\\{16\\}', 'incorrect'),
     spec('Erreur : k recopié ({−4 ; 4})', 0, SP_C2, '\\{-4;4\\}', 'incorrect'),
     spec('x² = 0 : S = {0}', 1, SP_C0, '\\{0\\}', 'correct'),
     spec('x² = −3 : S = ∅', 1, SP_CV, '\\varnothing', 'correct'),
     spec('Erreur : {−3 ; 3}', 1, SP_CV, '\\{-3;3\\}', 'incorrect')],
    delay=45))

SP_CI = {'k': 9, 'r': 3, 's': 1}
SP_CS = {'k': 1, 'r': 1, 's': 2}
SP_CN = {'k': -2, 's': 0}
MODELES.append(modele(
    '08-inequation-carre-graphique', 'Résoudre graphiquement une inéquation x² < k',
    'Inéquation x² < k lue sur la parabole de la fonction carré : k > 0 (entre −√k et √k, ou en'
    ' dehors, les quatre sens), k < 0 (∅ ou ℝ)',
    CARRE, 2,
    inequation_reference(INTRO_CARRE, *CARRE_F, '1|4|9', 'eval:sqrt(k)', RAISON_CARRE),
    [spec('x² ⩽ 9 : S = [−3 ; 3]', 0, SP_CI, '[-3;3]', 'correct'),
     spec('Erreur : ]−∞ ; 3] (solution négative oubliée)', 0, SP_CI, ']-\\infty;3]',
          'incorrect'),
     spec('Erreur : crochets ouverts', 0, SP_CI, ']-3;3[', 'incorrect'),
     spec('x² > 1 : S = ]−∞ ; −1[ ∪ ]1 ; +∞[', 0, SP_CS, ']-\\infty;-1[\\cup]1;+\\infty[',
          'correct'),
     spec('Erreur : ]1 ; +∞[ seulement', 0, SP_CS, ']1;+\\infty[', 'incorrect'),
     spec('x² < −2 : S = ∅', 1, SP_CN, '\\varnothing', 'correct'),
     spec('Erreur : ℝ', 1, SP_CN, '\\mathbb{R}', 'incorrect')],
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
