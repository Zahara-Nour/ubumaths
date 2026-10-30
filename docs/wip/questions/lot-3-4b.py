"""Écrit les 6 modèles du lot 4b « Fonctions : résolutions graphiques, fonction carré, Thalès » de la
3e dans scripts/questions/3-lot-4b/.

Phase 0 validée par David le 2026-10-30 (journal `questions-3-progress.md` § 11.2 et 11.6, un point
par modèle) :

| # | Point | Titre | Catégorie, niveau |
| 1 | 3-042 | Résoudre f(x) = k sur un graphique | Fonctions › Fonctions linéaires › Résolution graphique, 1 |
| 2 | 3-065 | Résoudre f(x) ⩽ k sur un graphique | Fonctions › Fonctions linéaires › Résolution graphique, 2 |
| 3 | 3-057 | Résoudre ax ⩾ b graphiquement | Calcul littéral › Inéquations › Résolution graphique, 1 |
| 4 | 3-046 | La courbe de la fonction carré | Fonctions › Fonction carré › Courbe, 1 |
| 5 | 3-053 | Résoudre x² = a graphiquement | Fonctions › Fonction carré › x² = a, 1 |
| 6 | 3-037 | Proportionnalité, graphique et Thalès | Proportionnalité › Caractérisation › Graphique et Thalès, 1 |

Niveaux : catégories neuves (relevé MCP du 2026-10-30), sauf « Fonctions linéaires › Résolution
graphique », qui porte deux modèles (niveau par modèle). Le nœud et le tag sont posés par la
migration de rangement, après le `--publier` de David.

Décisions et pièges :
- ` ```courbe ` : patrons de 2de a55ad3b4 (inéquation sur une droite, partie solution repassée en vert)
  et 9c4f6b4f (x² = k) ;
- inéquations : réponse en inégalité « x ⩽ 3 » (comme 3-014, lot 2), pas en intervalle ;
- 3-053 v1 : deux cases, la plus petite solution d'abord (l'énoncé le dit) ; v3 (a < 0) en choix ;
- 3-037 : le bloc ne trace pas de segment ; les projections sur l'axe sont les verticales en
  pointillé `asymptotes: x=… ; x=…` ;
- case choix : la bonne réponse écrite en premier (indice 0), le bloc mélange ;
- variables `e` et `i` interdites dans les `eval`.

    python3 docs/wip/questions/lot-3-4b.py scripts/questions/3-lot-4b
"""
import json
import os
import subprocess
import sys

DOSSIER = sys.argv[1]


def spec(desc, vi, variables, answers, status):
    return {'description': desc, 'variationIndex': vi,
            'variables': {k: str(v) for k, v in variables.items()},
            'answers': answers if isinstance(answers, list) else [answers],
            'expected': {'status': status}}


def modele(nom, title, description, theme, domain, subdomain, level, variations, specs, delay=60):
    m = {'title': title, 'description': description, 'grades': ['3'], 'theme': theme,
         'domain': domain, 'subdomain': subdomain, 'level': level, 'delay': delay,
         'status': 'draft', 'variations': variations, 'testSpecs': specs}
    return nom, m


def var(nom, expression):
    return {'name': nom, 'expression': expression}


def variation(statement, variables, answers, steps, conditions=None):
    v = {'statement': statement, 'variables': variables}
    if conditions:
        v['conditions'] = conditions
    v['blanks'] = [a if isinstance(a, dict) else {'expectedAnswer': a} for a in answers]
    v['correction'] = {'steps': steps}
    return v


def col(x, k=0):
    return '\\textcolor{{{color:primary.' + str(k) + '}}}{' + x + '}'


def ev(x):
    return '{{eval:' + x + '}}'


def choix(lignes):
    return '\n\n```choix\n' + ''.join('- ' + l + '\n' for l in lignes) + '```'


def courbe(x, y, traces, points=None, asymptotes=None, description=''):
    lignes = ['```courbe', 'x: ' + x, 'y: ' + y, 'grille: 1 ; 1'] + traces
    if points:
        lignes.append('points: ' + points)
    if asymptotes:
        lignes.append('asymptotes: ' + asymptotes)
    lignes += ['taille: moyenne', 'description: ' + description, '```']
    return '\n\n' + '\n'.join(lignes) + '\n\n'


def tableau(xs, fs):
    """Tableau de valeurs à deux lignes, x et f(x) ; une case s'écrit ?."""
    # Sans \\hline : MathLive ne le connaît pas dans un tableau à case (lot 4a, § 11.7).
    cols = '|l|' + 'c|' * len(xs)
    return ('\n\n$\\begin{array}{' + cols + '} x & ' + ' & '.join(xs)
            + ' \\\\ f(x) & ' + ' & '.join(fs) + ' \\end{array}$\n\n')


def sens(v):
    """Le signe d'inégalité n° v : 0 <, 1 ⩽, 2 >, 3 ⩾."""
    return ('{{if:' + v + '==0|<|{{if:' + v + '==1|\\leqslant |{{if:' + v + '==2|>|\\geqslant }}}}'
            '}}')


def sens_inverse(v):
    return ('{{if:' + v + '==0|>|{{if:' + v + '==1|\\geqslant |{{if:' + v + '==2|<|\\leqslant }}}}'
            '}}')


def selon(v, valeurs):
    """{{if}} en chaîne : valeurs[k] quand v == k (k de 0 à 3)."""
    return ('{{if:' + v + '==0|' + valeurs[0] + '|{{if:' + v + '==1|' + valeurs[1] + '|{{if:' + v
            + '==2|' + valeurs[2] + '|' + valeurs[3] + '}}}}}}')


X = '\\times'
MODELES = []

# Droite par l'origine de pente m, lue sur x ∈ [−5 ; 5]
Y_LIN = ev('-4*abs(m)-1') + ' ; ' + ev('4*abs(m)+1')
DROITE_LIN = 'f(x) = ({{m}})*x   bleu   nom=\\mathcal{D}'
DESC_LIN = 'Droite D passant par l\'origine, représentant une fonction linéaire f.'
ENONCE_LIN = ('La droite $\\mathcal{D}$ ci-dessous représente une fonction linéaire $f$.'
              + courbe('-5 ; 5', Y_LIN, [DROITE_LIN], description=DESC_LIN))

# --- 1. 3-042 : résoudre f(x) = k sur un graphique --------------------------------------------


def equation_lin(m):
    return variation(
        ENONCE_LIN + 'Résous graphiquement l\'équation $f(x)=' + ev('(m)*(z)') + '$.\n\n$x=?$',
        [var('m', m), var('z', '1..3;±')], ['{{z}}'],
        ['On trace la droite horizontale d\'équation $y=' + ev('(m)*(z)') + '$ : la solution est'
         ' l\'**abscisse** du point où elle coupe $\\mathcal{D}$.',
         courbe('-5 ; 5', Y_LIN, [DROITE_LIN, 'g(x) = ' + ev('(m)*(z)') + '   rouge   pointillé'],
                points='A({{z}} ; ' + ev('(m)*(z)') + '), A\'({{z}} ; 0)',
                description='Droite D et droite horizontale y = ' + ev('(m)*(z)')
                + ', qui la coupe en A ; A\' est sur l\'axe des abscisses.').strip(),
         'La droite coupe $\\mathcal{D}$ en $A({{z}}\\,;' + ev('(m)*(z)') + ')$ : $x=' + col('{{z}}')
         + '$. On vérifie : $f({{z}})=' + ev('(m)*(z)') + '$.'])


MODELES.append(modele(
    '01-resoudre-graphiquement-f-egal-k', 'Résoudre f(x) = k sur un graphique',
    'Résoudre graphiquement une équation f(x) = k, f linéaire tracée (droite par l\'origine) :'
    ' a positif, a négatif ; solution entière',
    'Fonctions', 'Fonctions linéaires', 'Résolution graphique', 1,
    [equation_lin('1|2|3'), equation_lin('-1|-2|-3')],
    [spec('f(x) = 2x, f(x) = 6 : x = 3', 0, {'m': 2, 'z': 3}, '3', 'correct'),
     spec('Erreur : k lui-même, 6', 0, {'m': 2, 'z': 3}, '6', 'incorrect'),
     spec('Erreur : l\'image f(6) = 12', 0, {'m': 2, 'z': 3}, '12', 'incorrect'),
     spec('f(x) = −3x, f(x) = 6 : x = −2', 1, {'m': -3, 'z': -2}, '-2', 'correct'),
     spec('Erreur de signe : 2', 1, {'m': -3, 'z': -2}, '2', 'incorrect')],
    delay=45))

# --- 2 et 3. Inéquations lues sur une droite par l'origine ------------------------------------

STRICTE = ('{{if:s==0|L\'inégalité est **stricte** : $' + ev('z') + '$ n\'est pas solution.|{{if:s==2|'
           'L\'inégalité est **stricte** : $' + ev('z') + '$ n\'est pas solution.|L\'inégalité est'
           ' **large** : $' + ev('z') + '$ est solution.}}}}')
DESSOUS = ['**strictement sous**', '**sous ou sur**', '**strictement au-dessus de**', '**au-dessus ou sur**']


def partie_verte(nom, expr, gauche_si):
    """Partie solution en vert : à gauche de z pour les sens listés dans gauche_si, à droite sinon."""
    morceaux = []
    for s in range(4):
        borne = '[' if s in (1, 3) else ']'
        if s in gauche_si:
            morceaux.append('[-10 ; {{z}}' + ('[' if borne == ']' else ']'))
        else:
            morceaux.append(borne + '{{z}} ; 10]')
    return selon('s', [nom + '(x) = ' + expr + ' sur ' + d + '   vert' for d in morceaux])


def inequation(enonce, m_var, croissante, y_k, droite, desc, vars_extra=None, lecture=None):
    """Résolution graphique de f(x) <sens> k, f linéaire de pente m (croissante si m > 0)."""
    reponse = 'x' + (sens('s') if croissante else sens_inverse('s')) + '{{z}}'
    gauche = (0, 1) if croissante else (2, 3)
    return variation(
        enonce + '\n\nLes solutions sont les nombres $x$ tels que $?$.',
        [var('m', m_var), var('z', '1..3;±'), var('s', '0..3')] + (vars_extra or []),
        [reponse],
        [(lecture or 'On trace la droite horizontale d\'équation $y=' + y_k + '$ ; elle coupe'
          ' $\\mathcal{D}$ au point $A$ d\'abscisse ${{z}}$.') + ' On cherche les abscisses des points de'
         ' $\\mathcal{D}$ situés ' + selon('s', DESSOUS) + ' cette droite.',
         courbe('-5 ; 5', Y_LIN, [droite, 'g(x) = ' + y_k + '   rouge   pointillé',
                                  partie_verte('h', '({{m}})*x', gauche), partie_verte('t', '0', gauche)],
                points='A({{z}} ; ' + y_k + ')',
                description=desc + ' Droite y = ' + y_k + ' en pointillé, partie cherchée en vert, et les'
                ' solutions repassées en vert sur l\'axe des abscisses.').strip(),
         ('La droite $\\mathcal{D}$ monte : ' if croissante else 'La droite $\\mathcal{D}$ descend : ')
         + 'la partie cherchée est à ' + selon('s', ['gauche', 'gauche', 'droite', 'droite'] if croissante
                                               else ['droite', 'droite', 'gauche', 'gauche'])
         + ' de $A$. ' + STRICTE + ' Les solutions sont les nombres $x$ tels que $' + col(reponse) + '$.'])


INEQ_F = (ENONCE_LIN + 'Résous graphiquement l\'inéquation $f(x)' + sens('s') + ev('(m)*(z)') + '$.')

MODELES.append(modele(
    '02-resoudre-graphiquement-f-inferieur-k', 'Résoudre f(x) ⩽ k sur un graphique',
    'Résoudre graphiquement une inéquation f(x) ⩽ k (les quatre sens), f linéaire tracée : a positif,'
    ' a négatif (le sens change) ; réponse écrite en inégalité « x ⩽ 3 »',
    'Fonctions', 'Fonctions linéaires', 'Résolution graphique', 2,
    [inequation(INEQ_F, '1|2|3', True, ev('(m)*(z)'), DROITE_LIN, DESC_LIN),
     inequation(INEQ_F, '-1|-2|-3', False, ev('(m)*(z)'), DROITE_LIN, DESC_LIN)],
    [spec('f(x) = 2x, f(x) ⩽ 2 : x ⩽ 1', 0, {'m': 2, 'z': 1, 's': 1}, 'x\\leqslant 1', 'correct'),
     spec('Erreur : stricte au lieu de large, x < 1', 0, {'m': 2, 'z': 1, 's': 1}, 'x<1', 'incorrect'),
     spec('Erreur : mauvais côté, x ⩾ 1', 0, {'m': 2, 'z': 1, 's': 1}, 'x\\geqslant 1', 'incorrect'),
     spec('f(x) = 3x, f(x) > −6 : x > −2', 0, {'m': 3, 'z': -2, 's': 2}, 'x>-2', 'correct'),
     spec('Erreur : la borne k, x > −6', 0, {'m': 3, 'z': -2, 's': 2}, 'x>-6', 'incorrect'),
     spec('f(x) = −x, f(x) < −2 : x > 2', 1, {'m': -1, 'z': 2, 's': 0}, 'x>2', 'correct'),
     spec('Erreur : sens non changé, x < 2', 1, {'m': -1, 'z': 2, 's': 0}, 'x<2', 'incorrect'),
     spec('Erreur : large au lieu de stricte, x ⩾ 2', 1, {'m': -1, 'z': 2, 's': 0}, 'x\\geqslant 2',
          'incorrect')],
    delay=60))

# 3-057 : l'inéquation ax <sens> b, résolue avec les droites y = ax et y = b
INEQ_AX = ('Pour résoudre l\'inéquation $\\textcolor{{{color:primary.1}}}{ {{m}}x' + sens('s') + ev('(m)*(z)')
           + '}$, on a tracé ci-dessous la droite $\\mathcal{D}$ d\'équation $y={{m}}x$ et la droite'
           ' $\\mathcal{H}$ d\'équation $y=' + ev('(m)*(z)') + '$.'
           + courbe('-5 ; 5', Y_LIN, [DROITE_LIN, 'g(x) = ' + ev('(m)*(z)') + '   rouge   pointillé'
                                      '   nom=\\mathcal{H}'],
                    description='Droite D d\'équation y = {{m}}x et droite horizontale H d\'équation'
                    ' y = ' + ev('(m)*(z)') + '.')
           + 'Résous graphiquement cette inéquation.')
LECTURE_AX = ('$\\mathcal{H}$ coupe $\\mathcal{D}$ au point $A$ d\'abscisse ${{z}}$. Résoudre ${{m}}x' + sens('s')
              + ev('(m)*(z)') + '$, c\'est chercher les points de $\\mathcal{D}$ situés par rapport à'
              ' $\\mathcal{H}$ comme le dit l\'inégalité.')

MODELES.append(modele(
    '03-resoudre-graphiquement-ax-b', 'Résoudre ax ⩾ b graphiquement',
    'Résoudre graphiquement une inéquation ax ⩾ b (les quatre sens) avec les droites y = ax et y = b'
    ' tracées : a positif, a négatif ; réponse écrite en inégalité « x ⩾ 2 »',
    'Calcul littéral', 'Inéquations', 'Résolution graphique', 1,
    [inequation(INEQ_AX, '2|3|4', True, ev('(m)*(z)'), DROITE_LIN, DESC_LIN, lecture=LECTURE_AX),
     inequation(INEQ_AX, '-2|-3|-4', False, ev('(m)*(z)'), DROITE_LIN, DESC_LIN, lecture=LECTURE_AX)],
    [spec('3x ⩾ 6 : x ⩾ 2', 0, {'m': 3, 'z': 2, 's': 3}, 'x\\geqslant 2', 'correct'),
     spec('Erreur : stricte au lieu de large, x > 2', 0, {'m': 3, 'z': 2, 's': 3}, 'x>2', 'incorrect'),
     spec('Erreur : la borne b, x ⩾ 6', 0, {'m': 3, 'z': 2, 's': 3}, 'x\\geqslant 6', 'incorrect'),
     spec('−2x < 4 : x > −2', 1, {'m': -2, 'z': -2, 's': 0}, 'x>-2', 'correct'),
     spec('Erreur : sens non changé, x < −2', 1, {'m': -2, 'z': -2, 's': 0}, 'x<-2', 'incorrect'),
     spec('Erreur : large au lieu de stricte, x ⩾ −2', 1, {'m': -2, 'z': -2, 's': 0},
          'x\\geqslant -2', 'incorrect')],
    delay=60))

# --- 4. 3-046 : la courbe de la fonction carré ------------------------------------------------


def nom_trace(j):
    """Nom du tracé j (0 = la parabole x²), décalé par la permutation tirée p."""
    return ''.join('{{if:p==' + str(k) + '|C_' + str((j + k) % 4 + 1) + '|}}' for k in range(4))


TRACES_CARRE = [
    'f(x) = x^2   bleu   nom=' + nom_trace(0),
    'g(x) = -x^2   rouge   nom=' + nom_trace(1),
    'h(x) = x^2+({{c}})   vert   nom=' + nom_trace(2),
    'k(x) = ({{m}})*x   orange   nom=' + nom_trace(3),
]
V_QUELLE_COURBE = variation(
    'Dans le repère ci-dessous, quelle courbe représente la fonction carré $x \\mapsto x^2$ ?'
    + courbe('-4 ; 4', '-6 ; 10', TRACES_CARRE,
             description='Quatre tracés nommés C1 à C4 : trois paraboles et une droite.')
    + choix(['$' + nom_trace(j) + '$' for j in range(4)]),
    [var('c', '2|3|-2|-3'), var('m', '1|-1'), var('p', '0..3')], ['0'],
    ['La courbe de la fonction carré passe par $O(0\\,;0)$, $(1\\,;1)$ et $(-1\\,;1)$, $(2\\,;4)$ et'
     ' $(-2\\,;4)$ : elle est **symétrique** par rapport à l\'axe des ordonnées et tournée vers le haut.',
     '$' + col(nom_trace(0)) + '$ passe par tous ces points : c\'est elle.',
     '$' + nom_trace(1) + '$ est tournée vers le bas ($-x^2$), $' + nom_trace(2) + '$ ne passe pas par'
     ' l\'origine ($x^2' + '{{if:c<0|{{c}}|+{{c}}}}' + '$) et $' + nom_trace(3) + '$ est une droite.'])

V_TABLEAU_CARRE = variation(
    'On considère la fonction carré $f : x \\mapsto x^2$.\n\nComplète son tableau de valeurs :'
    + tableau(['-1', '0', '1', '{{n}}'], ['1', '0', '1', '?']),
    [var('n', '2..7;±')], [ev('(n)^2')],
    ['$f({{n}})$ est le **carré** de ${{n}}$ : on multiplie ${{n}}$ par lui-même, **parenthèses comprises**'
     ' pour un nombre négatif.',
     '$$f({{n}}) = ' + '{{if:n<0|({{n}})|{{n}}}}' + '^2 = ' + '{{if:n<0|({{n}})|{{n}}}}' + ' ' + X + ' '
     + '{{if:n<0|({{n}})|{{n}}}}' + ' = ' + col(ev('(n)^2')) + '$$'])

# t : 0 → A est sur la courbe ; 1 → ordonnée 2n (erreur « carré = double ») ; 2 → −n² (−3² = −9)
V_POINT_SUR = variation(
    'Le point $A({{n}}\\,;{{b}})$ est-il sur la courbe de la fonction carré $x \\mapsto x^2$ ?'
    + choix(['{{if:t==0|Oui|Non}}', '{{if:t==0|Non|Oui}}']),
    [var('n', '3..6;±'), var('t', '0|1|2'),
     var('b', 'eval:((t)-1)*((t)-2)/2*(n)^2+(t)*(2-(t))*2*(n)-(t)*((t)-1)/2*(n)^2')], ['0'],
    ['$A$ est sur la courbe si son ordonnée est le **carré** de son abscisse.',
     '$$' + '{{if:n<0|({{n}})|{{n}}}}' + '^2 = ' + ev('(n)^2') + '$$',
     '{{if:t==0|L\'ordonnée de $A$ vaut bien $' + ev('(n)^2') + '$ : ' + col('\\text{oui}')
     + ', $A$ est sur la courbe.|L\'ordonnée de $A$ est ${{b}}$, et non $' + ev('(n)^2') + '$ : '
     + col('\\text{non}') + ', $A$ n\'est pas sur la courbe.}}'])

MODELES.append(modele(
    '04-courbe-fonction-carre', 'La courbe de la fonction carré',
    'La courbe de la fonction carré : la reconnaître parmi quatre tracés (−x², x² + c, droite),'
    ' compléter son tableau de valeurs, dire si un point est dessus',
    'Fonctions', 'Fonction carré', 'Courbe', 1,
    [V_QUELLE_COURBE, V_TABLEAU_CARRE, V_POINT_SUR],
    [spec('Quatre tracés : la parabole x²', 0, {'c': 2, 'm': 1, 'p': 1}, '0', 'correct'),
     spec('Erreur : x² + 2', 0, {'c': 2, 'm': 1, 'p': 1}, '2', 'incorrect'),
     spec('Erreur : −x²', 0, {'c': 2, 'm': 1, 'p': 1}, '1', 'incorrect'),
     spec('Tableau : f(−4) = 16', 1, {'n': -4}, '16', 'correct'),
     spec('Erreur : −4² = −16', 1, {'n': -4}, '-16', 'incorrect'),
     spec('Erreur : le double, −8', 1, {'n': -4}, '-8', 'incorrect'),
     spec('A(−3 ; 9) est dessus : oui', 2, {'n': -3, 't': 0, 'b': 9}, '0', 'correct'),
     spec('Erreur : non', 2, {'n': -3, 't': 0, 'b': 9}, '1', 'incorrect'),
     spec('A(4 ; 8) n\'est pas dessus : non', 2, {'n': 4, 't': 1, 'b': 8}, '0', 'correct'),
     spec('A(−3 ; −9) n\'est pas dessus : non', 2, {'n': -3, 't': 2, 'b': -9}, '0', 'correct'),
     spec('Erreur : −3² = −9, oui', 2, {'n': -3, 't': 2, 'b': -9}, '1', 'incorrect')],
    delay=60))

# --- 5. 3-053 : résoudre x² = a graphiquement -------------------------------------------------

PARABOLE = 'f(x) = x^2   bleu   nom=C_f'
DESC_PARAB = 'Courbe de la fonction carré et droite horizontale y = {{a}} en pointillé.'


def enonce_carre(y):
    return ('On a tracé ci-dessous la courbe $\\mathcal{C}_f$ de la fonction carré $f : x\\mapsto x^2$ et'
            ' la droite d\'équation $y={{a}}$.'
            + courbe('-4 ; 4', y, [PARABOLE, 'g(x) = {{a}}   rouge   pointillé'], description=DESC_PARAB))


V_DEUX = variation(
    enonce_carre('-2 ; 10') + 'Résous graphiquement l\'équation $x^2={{a}}$.\n\nLes solutions sont $x=?$ et'
    ' $x=?$ (la plus petite d\'abord).',
    [var('r', '1..3'), var('a', 'eval:(r)^2')], [ev('-(r)'), '{{r}}'],
    ['Les solutions sont les **abscisses** des points où la droite $y={{a}}$ coupe $\\mathcal{C}_f$.',
     courbe('-4 ; 4', '-2 ; 10', [PARABOLE, 'g(x) = {{a}}   rouge   pointillé'],
            points='A(' + ev('-(r)') + ' ; {{a}}), B({{r}} ; {{a}})',
            description='Courbe de la fonction carré et droite y = {{a}}, qui la coupe en A et B.').strip(),
     'La droite coupe la courbe en **deux** points, d\'abscisses $' + col(ev('-(r)')) + '$ et $'
     + col('{{r}}') + '$ : $(' + ev('-(r)') + ')^2={{r}}^2={{a}}$.'])

V_ZERO = variation(
    enonce_carre('-2 ; 10') + 'Résous graphiquement l\'équation $x^2={{a}}$.\n\n$x=?$',
    [var('a', '0')], ['0'],
    ['La droite $y=0$ est l\'axe des abscisses.',
     courbe('-4 ; 4', '-2 ; 10', [PARABOLE], points='O(0 ; 0)',
            description='Courbe de la fonction carré, qui touche l\'axe des abscisses en O.').strip(),
     'Elle touche $\\mathcal{C}_f$ en **un seul** point, l\'origine : $x=' + col('0') + '$.'])

V_AUCUNE = variation(
    enonce_carre('-10 ; 10') + 'Combien l\'équation $x^2={{a}}$ a-t-elle de solutions ?'
    + choix(['Aucune solution', 'Une seule solution : $x=' + ev('-sqrt(-(a))') + '$',
             'Deux solutions : $x=' + ev('-sqrt(-(a))') + '$ et $x=' + ev('sqrt(-(a))') + '$']),
    [var('a', '-1|-4|-9')], ['0'],
    ['Les solutions seraient les abscisses des points où la droite $y={{a}}$ coupe $\\mathcal{C}_f$.',
     'La droite est **sous** la courbe et ne la coupe pas : un carré n\'est jamais négatif. L\'équation n\'a '
     + col('\\text{aucune solution}') + '.',
     '$' + ev('-sqrt(-(a))') + '$ ne convient pas : $(' + ev('-sqrt(-(a))') + ')^2=' + ev('-(a)')
     + '$, et non ${{a}}$.'])

MODELES.append(modele(
    '05-resoudre-graphiquement-x2-egal-a', 'Résoudre x² = a graphiquement',
    'Résoudre graphiquement une équation x² = a, parabole et droite y = a tracées : a carré parfait'
    ' (deux solutions), a = 0 (une solution), a négatif (aucune solution)',
    'Fonctions', 'Fonction carré', 'x² = a', 1,
    [V_DEUX, V_ZERO, V_AUCUNE],
    [spec('x² = 9 : −3 et 3', 0, {'r': 3, 'a': 9}, ['-3', '3'], 'correct'),
     spec('Erreur : une seule solution (3 et 3)', 0, {'r': 3, 'a': 9}, ['3', '3'], 'incorrect'),
     spec('Erreur : ±9', 0, {'r': 3, 'a': 9}, ['-9', '9'], 'incorrect'),
     spec('x² = 0 : x = 0', 1, {'a': 0}, '0', 'correct'),
     spec('x² = −4 : aucune solution', 2, {'a': -4}, '0', 'correct'),
     spec('Erreur : x = −2', 2, {'a': -4}, '1', 'incorrect'),
     spec('Erreur : deux solutions', 2, {'a': -4}, '2', 'incorrect')],
    delay=60))

# --- 6. 3-037 : proportionnalité, graphique et Thalès -----------------------------------------

# A(p ; q) et B(r ; ordonnée q·r/p) sur la droite par l'origine ; A' et B' leurs projetés sur l'axe
YB = ev('(q)*(r)/(p);d')
# Dans le bloc : ni virgule décimale (liste des points), ni \dfrac d'un {{eval}} → le calcul brut
YB_PT = '{{q}}*{{r}}/{{p}}'
VARS_THALES = [var('p', '2|4|5'), var('q', '1..4'), var('r', '3..9')]
CONDS_THALES = ['r >= p+2', '(q)*(r)/(p) <= 12']


def figure_thales(points):
    return courbe('-1 ; ' + ev('(r)+1'), '-1 ; ' + ev('ceil((q)*(r)/(p))+1'),
                  ['f(x) = ({{q}})/({{p}})*x   bleu   nom=\\mathcal{D}'],
                  points=points, asymptotes='x={{p}} ; x={{r}}',
                  description='Droite D passant par l\'origine O, ses points A et B, et leurs projetés A\''
                  ' et B\' sur l\'axe des abscisses ; verticales en pointillé.')


EGALITE = '\\dfrac{OA\'}{OB\'}=\\dfrac{A\'A}{B\'B}'
SITUATION = ('La droite $\\mathcal{D}$ passe par l\'origine $O$ : elle représente une situation de'
             ' proportionnalité. $A$ et $B$ sont deux de ses points, $A\'$ et $B\'$ leurs projetés sur'
             ' l\'axe des abscisses.')
CONFIG = ('$O$, $A\'$, $B\'$ sont alignés, $O$, $A$, $B$ aussi, et les droites $(A\'A)$ et $(B\'B)$ sont'
          ' **parallèles** (toutes deux perpendiculaires à l\'axe des abscisses) : le théorème de Thalès'
          ' s\'applique dans les triangles $OA\'A$ et $OB\'B$.')

V_EGALITE = variation(
    SITUATION + figure_thales('A({{p}} ; {{q}}), B({{r}} ; ' + YB_PT + '), A\'({{p}} ; 0), B\'({{r}} ; 0)')
    + 'Quelle égalité donne le théorème de Thalès ?'
    + choix(['$' + EGALITE + '$', '$\\dfrac{OA\'}{OB\'}=\\dfrac{B\'B}{A\'A}$',
             '$\\dfrac{OA\'}{OB}=\\dfrac{A\'A}{B\'B}$', '$\\dfrac{OA\'}{A\'B\'}=\\dfrac{A\'A}{B\'B}$']),
    VARS_THALES, ['0'],
    [CONFIG,
     'Les côtés du petit triangle sont **proportionnels** à ceux du grand, dans le même ordre : $'
     + col(EGALITE) + '$.',
     'Les autres égalités mélangent un côté de $OA\'A$ et un côté de $OB\'B$ qui ne se correspondent pas.'],
    CONDS_THALES)

V_ORDONNEE = variation(
    SITUATION + ' $A$ a pour coordonnées $({{p}}\\,;{{q}})$ et $B$ a pour abscisse ${{r}}$.'
    + figure_thales('A({{p}} ; {{q}}), B({{r}} ; ' + YB_PT + '), A\'({{p}} ; 0), B\'({{r}} ; 0)')
    + 'Calcule l\'ordonnée de $B$ avec le théorème de Thalès.\n\n$B\'B=?$',
    VARS_THALES, [YB],
    [CONFIG,
     '$$' + EGALITE + ' \\quad\\text{donc}\\quad \\dfrac{ {{p}} }{ {{r}} }=\\dfrac{ {{q}} }{B\'B}$$',
     '$$B\'B = \\dfrac{ {{q}} ' + X + ' {{r}} }{ {{p}} } = ' + col(YB) + '$$'],
    CONDS_THALES)

S_THALES = {'p': 2, 'q': 3, 'r': 5}
MODELES.append(modele(
    '06-proportionnalite-graphique-thales', 'Proportionnalité, graphique et Thalès',
    'Lire une proportionnalité sur une droite passant par l\'origine avec le théorème de Thalès :'
    ' choisir l\'égalité, calculer l\'ordonnée d\'un point',
    'Proportionnalité', 'Caractérisation', 'Graphique et Thalès', 1,
    [V_EGALITE, V_ORDONNEE],
    [spec('Égalité de Thalès', 0, S_THALES, '0', 'correct'),
     spec('Erreur : rapport renversé', 0, S_THALES, '1', 'incorrect'),
     spec('Erreur : OB au lieu de OB\'', 0, S_THALES, '2', 'incorrect'),
     spec('A(2 ; 3), B d\'abscisse 5 : 7,5', 1, S_THALES, '7{,}5', 'correct'),
     spec('Erreur : additif, 3 + 3 = 6', 1, S_THALES, '6', 'incorrect'),
     spec('Erreur : renversé, 2 × 5 / 3', 1, S_THALES, '\\frac{10}{3}', 'incorrect'),
     spec('A(4 ; 2), B d\'abscisse 6 : 3', 1, {'p': 4, 'q': 2, 'r': 6}, '3', 'correct')],
    delay=75))

os.makedirs(DOSSIER, exist_ok=True)
for nom, m in MODELES:
    with open(os.path.join(DOSSIER, nom + '.json'), 'w', encoding='utf-8') as f:
        json.dump(m, f, ensure_ascii=False, indent='\t')
        f.write('\n')
# Mis en forme comme le pre-commit, pour que le script redonne les fichiers commités
subprocess.run(['pnpm', 'exec', 'prettier', '--write', DOSSIER], check=True,
               stdout=subprocess.DEVNULL)
print(f'{len(MODELES)} modèles écrits dans {DOSSIER}')
