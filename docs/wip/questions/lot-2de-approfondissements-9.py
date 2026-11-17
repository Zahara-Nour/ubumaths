"""Écrit les 2 modèles du lot 9 « approfondissements : géométrie repérée et racine carrée » de la
seconde dans scripts/questions/2de-approfondissements-9/.

Phase 0 validée par David le 2026-11-09 (« je suis tes recos », D5 du journal
« docs/wip/questions-2de-demonstrations-progress.md », § 13), un point par modèle ; 2-323 n'a
pas de modèle neuf : réemploi de `64f54fc1` (équidistance, 1re spé), qui reçoit le niveau seconde
et le tag par la migration du lot.

| # | Point | Titre                                                       | Sous-notion (prod), niveau                      |
| 1 | 2-324 | Partie du plan décrite par des inégalités                   | Géométrie repérée › équations de droites, 12   |
| 2 | 2-363 | Relier les courbes de la fonction racine carrée et du carré  | Fonction racine carrée › définition et courbe, 1 |

Forme (D5, Q2) : exercices d'application à valeurs tirées ; 363 avec une preuve courte
(y = √x ⇔ x = y² pour x, y ⩾ 0) en case choix. Parties du plan dessinées par `aire:` du bloc
`courbe` (surface entre une courbe et l'axe des abscisses) : pas de polygone rempli à créer.
Niveaux : après ceux déjà présents sur la sous-notion (relevé prod du 2026-11-09 : 1-11, aucun).

    python3 docs/wip/questions/lot-2de-approfondissements-9.py scripts/questions/2de-approfondissements-9
"""
import json
import os
import subprocess
import sys

DOSSIER = sys.argv[1]


def spec(desc, vi, answer, status, variables=None, violations=None):
    expected = {'status': status}
    if status in ('bad_form', 'unoptimal_form'):
        expected['constraintViolations'] = violations or ['form']
    answers = answer if isinstance(answer, list) else [answer]
    return {'description': desc, 'variationIndex': vi,
            'variables': {k: str(v) for k, v in (variables or {}).items()},
            'answers': answers, 'expected': expected}


def modele(nom, title, description, level, variations, specs):
    return nom, {'title': title, 'description': description, 'grades': ['2'],
                 'level': level, 'delay': 90, 'status': 'draft',
                 'shared': {},
                 'variations': variations, 'testSpecs': specs}


def var(nom, expression):
    return {'name': nom, 'expression': expression}


def ev(x):
    return '{{eval:' + x + '}}'


def col(x, k=0):
    return '\\textcolor{{{color:primary.' + str(k) + '}}}{' + x + '}'


def choix(lignes):
    return '\n\n```choix\n' + ''.join('- ' + l + '\n' for l in lignes) + '```'


def case(statement, variables, attendu, steps):
    """Variation à une case ouverte (`?` dans une formule de l'énoncé)."""
    return {'statement': statement, 'variables': variables,
            'blanks': [attendu if isinstance(attendu, dict) else {'expectedAnswer': attendu}],
            'correction': {'steps': steps}}


def justification(statement, variables, bonne, autres, steps):
    """Variation à une case choix : la première proposition est la bonne (index 0)."""
    return {'statement': statement + choix([bonne] + autres), 'variables': variables,
            'blanks': [{'expectedAnswer': '0'}], 'correction': {'steps': steps}}


def ranger(intro, etapes, steps):
    """Variation « étapes à ranger » : étapes données dans le bon ordre."""
    return {'statement': intro + '\n\nRemets les étapes de la démonstration dans l\'ordre.\n\n'
            '```ranger\nsigne: aucun\n' + ''.join('- ' + e + '\n' for e in etapes) + '```',
            'variables': [], 'correction': {'steps': steps}}


def specs_choix(vi, juste, erreurs, variables=None):
    out = [spec(juste, vi, '0', 'correct', variables)]
    for k, erreur in enumerate(erreurs, start=1):
        out.append(spec('Erreur : ' + erreur, vi, str(k), 'incorrect', variables))
    return out


MODELES = []

def pt(nom, x, y):
    return nom + '(' + x + '\\,;\\,' + y + ')'


LE, GE = '\\leqslant ', '\\geqslant '


def courbe(lignes, description):
    return ('\n\n```courbe\n' + ''.join(l + '\n' for l in lignes) + 'taille: moyenne\n'
            'description: ' + description + '\n```\n\n')


# --- 1. 2-324 : parties du plan décrites par des inégalités ------------------------------------

K = ev('k')
V324_TRIANGLE = case(
    'Dans un repère, on a coloré une partie du plan.'
    + courbe(['x: -1 ; 6', 'y: -1 ; 6', 'grille: 1 ; 1',
              'f(x) = ' + K + '-x sur [0 ; ' + K + ']   bleu',
              'aire: f ; 0 ; ' + K],
             'Triangle coloré limité par les deux axes et une droite.')
    + 'La partie colorée est l\'ensemble des points $M(x\\,;\\,y)$ tels que $x' + GE + '0$, $y'
    + GE + '0$ et :\n\n$x+y' + LE + '?$',
    [var('k', '2..5')], K,
    ['Le bord oblique passe par $(' + K + '\\,;\\,0)$ et $(0\\,;\\,' + K + ')$ : c\'est la droite'
     ' d\'équation $y=' + K + '-x$, soit $x+y=' + K + '$.',
     'Les points colorés sont sous cette droite : $y' + LE + K + '-x$, soit $' + col('x+y' + LE
                                                                                    + K) + '$.'])
A1, A2, BH = ev('a1'), ev('a2'), ev('b')
V324_RECTANGLE = case(
    'Dans un repère, on a coloré une partie du plan.'
    + courbe(['x: -4 ; 5', 'y: -1 ; 5', 'grille: 1 ; 1',
              'f(x) = ' + BH + ' sur [' + A1 + ' ; ' + A2 + ']   bleu',
              'aire: f ; ' + A1 + ' ; ' + A2],
             'Rectangle coloré posé sur l\'axe des abscisses.')
    + 'Complète les inégalités qui décrivent la partie colorée.\n\n'
    '$$?' + LE + 'x' + LE + '?\\quad\\text{et}\\quad 0' + LE + 'y' + LE + '?$$',
    [var('a1', '-3..1'), var('w', '1..3'), var('a2', 'eval:(a1)+(w)'), var('b', '1..4')],
    None,
    ['Les abscisses des points colorés vont de $' + A1 + '$ à $' + A2 + '$ : $'
     + col(A1 + LE + 'x' + LE + A2) + '$.',
     'Leurs ordonnées vont de $0$ à $' + BH + '$ : $' + col('0' + LE + 'y' + LE + BH) + '$.'])
V324_RECTANGLE['blanks'] = [{'expectedAnswer': A1}, {'expectedAnswer': A2},
                            {'expectedAnswer': BH}]
M, P, C = ev('m'), ev('p'), ev('c')
DROITE = M + 'x+' + P
V324_TRAPEZE = justification(
    'Dans un repère, on a coloré une partie du plan, limitée par l\'axe des abscisses, l\'axe des'
    ' ordonnées, la droite d\'équation $x=' + C + '$ et la droite d\'équation $y=' + DROITE + '$.'
    + courbe(['x: -1 ; 5', 'y: -1 ; 12', 'grille: 1 ; 2',
              'f(x) = ' + M + '*x+' + P + '   bleu',
              'aire: f ; 0 ; ' + C],
             'Trapèze coloré sous une droite, entre l\'axe des ordonnées et une verticale.')
    + 'Quelle condition décrit la partie colorée ?',
    [var('m', '2..3'), var('p', '1..2'), var('c', '2..3')],
    '$0' + LE + 'x' + LE + C + '$ et $0' + LE + 'y' + LE + DROITE + '$',
    ['$0' + LE + 'x' + LE + C + '$ et $y' + GE + DROITE + '$',
     '$x' + GE + '0$ et $0' + LE + 'y' + LE + DROITE + '$',
     '$0' + LE + 'x' + LE + C + '$ et $0' + LE + 'y' + LE + C + '$'],
    ['Les points colorés sont entre l\'axe des ordonnées et la verticale $x=' + C + '$ : $0'
     + LE + 'x' + LE + C + '$.',
     'Ils sont au-dessus de l\'axe des abscisses et sous la droite : $0' + LE + 'y' + LE
     + DROITE + '$.',
     'Conclusion : $' + col('0' + LE + 'x' + LE + C + '\\text{ et }0' + LE + 'y' + LE + DROITE)
     + '$.'])

MODELES.append(modele(
    '01-partie-du-plan-decrite-par-des-inegalites', 'Partie du plan décrite par des inégalités',
    'Triangle x ⩾ 0, y ⩾ 0, x + y ⩽ k (case, k de 2 à 5) ; rectangle a ⩽ x ⩽ a\', 0 ⩽ y ⩽ b'
    ' (trois cases) ; trapèze sous la droite y = mx + p (case choix)',
    12,
    [V324_TRIANGLE, V324_RECTANGLE, V324_TRAPEZE],
    [spec('k = 3 : 3', 0, '3', 'correct', {'k': 3}),
     spec('Erreur : −3', 0, '-3', 'incorrect', {'k': 3}),
     spec('k = 5 : 5', 0, '5', 'correct', {'k': 5}),
     spec('a = −1, a\' = 2, b = 3', 1, ['-1', '2', '3'], 'correct',
          {'a1': -1, 'w': 3, 'a2': 2, 'b': 3}),
     spec('Erreur : bornes échangées', 1, ['2', '-1', '3'], 'incorrect',
          {'a1': -1, 'w': 3, 'a2': 2, 'b': 3}),
     spec('Erreur : largeur au lieu de la borne', 1, ['-1', '3', '3'], 'incorrect',
          {'a1': -1, 'w': 3, 'a2': 2, 'b': 3})]
    + specs_choix(2, 'sous la droite', ['au-dessus', 'sans borne à droite', 'carré'],
                  {'m': 2, 'p': 1, 'c': 3})))

# --- 2. 2-363 : courbes de √x et de x² sur ℝ⁺ ---------------------------------------------------

INTRO_363 = ('On a tracé, sur $[0\\,;+\\infty[$, la courbe $\\mathcal{C}_f$ de la fonction carré'
             ' $f:x\\mapsto x^2$ (en bleu), la courbe $\\mathcal{C}_g$ de la fonction racine carrée'
             ' $g:x\\mapsto\\sqrt{x}$ (en rouge) et la droite d\'équation $y=x$ (en pointillés).'
             # Fenêtre 6 × 4,5 : le cadre est au rapport 3:4, le repère est donc orthonormé et la
             # symétrie d'axe y = x se voit ; borne de f hors du cadre (pas de point d'extrémité).
             + courbe(['x: -0.5 ; 5.5', 'y: -0.5 ; 4', 'grille: 1 ; 1',
                       'f(x) = x^2 sur [0 ; 3]   bleu   nom=C_f',
                       'g(x) = sqrt(x)   rouge   nom=C_g',
                       'd(x) = x   gris pointillé'],
                      'Courbes de la fonction carré et de la fonction racine carrée sur les'
                      ' réels positifs, et la droite d\'équation y = x.'))
A = ev('a')
V363_SYMETRIQUE = case(
    'Le point $' + pt('A', A, ev('a^2')) + '$ est sur la courbe de la fonction carré $x\\mapsto'
    ' x^2$. On note $A\'$ son symétrique par rapport à la droite d\'équation $y=x$.\n\n'
    'Donne les coordonnées de $A\'$.\n\n$$A\'(?\\,;\\,?)$$',
    [var('a', '2..9')], None,
    ['La symétrie d\'axe la droite $y=x$ échange l\'abscisse et l\'ordonnée : $'
     + col(pt('A\'', ev('a^2'), A)) + '$.',
     '$\\sqrt{' + ev('a^2') + '}=' + A + '$ : $A\'$ est sur la courbe de la fonction racine'
     ' carrée.'])
V363_SYMETRIQUE['blanks'] = [{'expectedAnswer': ev('a^2')}, {'expectedAnswer': A}]
V363_EQUIVALENCE = justification(
    'Soit $x' + GE + '0$ et $y' + GE + '0$. On démontre que $y=\\sqrt{x}$ équivaut à $x=y^2$ :'
    ' $M(x\\,;\\,y)$ est sur la courbe de la racine carrée si et seulement si $M\'(y\\,;\\,x)$'
    ' est sur celle de la fonction carré.\n\nPourquoi $y=\\sqrt{x}$ équivaut-il à $x=y^2$ ?',
    [],
    'Par définition, $\\sqrt{x}$ est le nombre positif dont le carré est $x$, et $y' + GE + '0$.',
    ['Car $\\sqrt{x^2}=x$ pour tout réel $x$.',
     'Car la fonction racine carrée est croissante.',
     'Car $x=y^2$ donne toujours $y=\\sqrt{x}$, même si $y<0$.'],
    ['$\\sqrt{x}$ est **l\'unique nombre positif dont le carré est $x$** : si $y' + GE + '0$ et'
     ' $y^2=x$, alors $y=\\sqrt{x}$ ; réciproquement, $(\\sqrt{x})^2=x$.',
     'La condition $y' + GE + '0$ est indispensable : $(-2)^2=4$ mais $\\sqrt{4}=2$.',
     '$\\sqrt{x^2}=|x|$, et non $x$, pour un réel $x$ quelconque.'])
V363_SYMETRIE = justification(
    INTRO_363 + 'Quelle transformation échange les courbes $\\mathcal{C}_f$ et $\\mathcal{C}_g$ ?',
    [],
    'La symétrie d\'axe la droite d\'équation $y=x$.',
    ['La symétrie d\'axe l\'axe des abscisses.',
     'La symétrie d\'axe l\'axe des ordonnées.',
     'La symétrie de centre l\'origine du repère.'],
    ['Pour $x' + GE + '0$ et $y' + GE + '0$, $y=\\sqrt{x}$ équivaut à $x=y^2$ : $M(x\\,;\\,y)$'
     ' est sur $\\mathcal{C}_g$ si et seulement si $M\'(y\\,;\\,x)$ est sur $\\mathcal{C}_f$.',
     'Échanger abscisse et ordonnée, c\'est la **symétrie d\'axe la droite d\'équation $y=x$**.'])
V363_POSITION = justification(
    INTRO_363 + 'Pour $0<x<1$, comment se rangent $x$, $x^2$ et $\\sqrt{x}$ ?',
    [],
    '$x^2<x<\\sqrt{x}$',
    ['$\\sqrt{x}<x<x^2$', '$x<x^2<\\sqrt{x}$', '$x^2<\\sqrt{x}<x$'],
    ['Sur $]0\\,;1[$, $\\mathcal{C}_f$ est sous la droite $y=x$ et $\\mathcal{C}_g$ au-dessus.',
     'Par exemple, pour $x=0{,}25$ : $x^2=0{,}0625$ et $\\sqrt{x}=0{,}5$.',
     'Donc $' + col('x^2<x<\\sqrt{x}') + '$ ; l\'ordre s\'inverse pour $x>1$.'])

MODELES.append(modele(
    '02-courbes-racine-carree-et-carre', 'Relier les courbes de la fonction racine carrée et de'
    ' la fonction carré',
    'Symétrique de A(a ; a²) par rapport à y = x (deux cases, a de 2 à 9) ; y = √x équivaut à'
    ' x = y² (case choix) ; symétrie d\'axe y = x (case choix, figure) ; x² < x < √x sur ]0 ; 1['
    ' (case choix, figure)',
    1,
    [V363_SYMETRIQUE, V363_EQUIVALENCE, V363_SYMETRIE, V363_POSITION],
    [spec('a = 3 : A\'(9 ; 3)', 0, ['9', '3'], 'correct', {'a': 3}),
     spec('Erreur : A inchangé (3 ; 9)', 0, ['3', '9'], 'incorrect', {'a': 3}),
     spec('Erreur : symétrie par rapport à (Ox) (3 ; −9)', 0, ['3', '-9'], 'incorrect', {'a': 3})]
    + specs_choix(1, 'définition de √x', ['√(x²) = x', 'croissante', 'sans y ⩾ 0'])
    + specs_choix(2, 'axe y = x', ['axe (Ox)', 'axe (Oy)', 'centre O'])
    + specs_choix(3, 'x² < x < √x', ['ordre inversé', 'x < x²', '√x < x'])))

# --- Specs « ranger » : positions affichées calculées par le générateur (graine 0) -------------

def positions(chemin, vi):
    out = subprocess.run(['pnpm', 'exec', 'tsx', 'docs/wip/questions/positions-ranger.ts', chemin, str(vi)],
                         check=True, capture_output=True, text=True).stdout.strip().splitlines()
    return json.loads(out[-1])


os.makedirs(DOSSIER, exist_ok=True)
for nom, m in MODELES:
    chemin = os.path.join(DOSSIER, nom + '.json')
    a_ranger = [s for s in m['testSpecs'] if isinstance(s, str)]
    m['testSpecs'] = [s for s in m['testSpecs'] if not isinstance(s, str)]
    with open(chemin, 'w', encoding='utf-8') as f:
        json.dump(m, f, ensure_ascii=False, indent='\t')
    for marque in a_ranger:
        vi = int(marque.split(':')[1])
        juste = positions(chemin, vi)
        faux = juste[:]
        faux[1], faux[2] = faux[2], faux[1]
        m['testSpecs'] += [spec('Étapes dans l’ordre', vi, juste, 'correct'),
                           spec('Erreur : deuxième et troisième étapes échangées', vi, faux,
                                'incorrect')]
    with open(chemin, 'w', encoding='utf-8') as f:
        json.dump(m, f, ensure_ascii=False, indent='\t')
        f.write('\n')
# Mis en forme comme le pre-commit, pour que le script redonne les fichiers commités
subprocess.run(['pnpm', 'exec', 'prettier', '--write', DOSSIER], check=True,
               stdout=subprocess.DEVNULL)
print(f'{len(MODELES)} modèles écrits dans {DOSSIER}')
