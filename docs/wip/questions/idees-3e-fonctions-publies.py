"""Ajoute les variations validées aux 3 modèles publiés exportés de prod dans
scripts/questions/idees-3e-fonctions-publies/ (chantier idees-3e-fonctions).

Phase 0 validée par David le 2026-11-24 (« je valide les modèles ») : fiches F1 à F5 du journal
(docs/archive/wip/idees-3e-fonctions/idees-3e-fonctions-progress.md, § Phase 0 › Variations de modèles publiés).
Les variations s'ajoutent À LA FIN (les réponses des élèves gardent l'indice de leur variation) ;
la migration de contenu est générée par scripts/questions/migration-contenu.ts. Seuls
`variations` et `testSpecs` changent : les `options` (cb545bd7 : `form` et `products` off) jugent
aussi les variations publiées, on n'y touche pas.

Le script repart du contenu de prod (variations et specs d'origine, comptées dans ORIGINE) :
le relancer réécrit les ajouts sans les doubler.

Décisions et pièges du lot :
- Tableaux « mélangés » (F1) : chaque colonne de x a sa plage (0..3, −7..−4, 4..7, −3..−1,
  8..10) : les cinq nombres sont distincts sans condition et pas rangés. Les colonnes qui portent
  la valeur cherchée sont choisies par un sélecteur `w` ; `eval:` ne connaît pas `==` : on passe
  par l'indicatrice `1-min(abs(u-k),1)` (fonction `ind`), comme le dit couvrir-un-niveau § 9.
- Ensembles (`intervalles`, F1 v6-v7 et F4) : pas d'erreurs prévues (nature exclue, comme le
  gabarit), erreurs typiques en specs `incorrect`. Une consigne commune dit comment écrire
  l'ensemble vide, dans TOUTES ces variations (sinon elle trahirait la v7 et la v11).
- F1 v7 (∅) : le nombre cherché est pris sur la ligne de x, absent de la ligne f(x) : le piège
  réel est de lire son image.
- F1 v8 : une valeur leurre est sur les deux lignes, mais dans deux colonnes différentes ; les
  deux erreurs prévues « colonnes différentes » répondent l'abscisse de chacune des deux colonnes.
- F3 v7 : une seule expression pour les trois courbes (sélecteur t, indicatrices) : droite
  c + s·g(x − m), parabole c + s(x − m)², cubique c + s(x − m + 1)(x − m)(x − m − 2)/2.
  (y + 1)y(y − 2) est toujours pair : la cubique passe par des nœuds à toute abscisse entière.
  Abscisses lues : m − 2, m + 1, m + 2 (nœuds pour les trois courbes).
- F4 v10 : cubique k + s(x − r1)(x − r2)(x − r3)/2, racines m − u, m, m + v (u, v de 2 à 3) :
  amplitude ≤ 5,7 sur [r1 − 0,5 ; r3 + 0,5], fenêtre k ± 6.
- F4 v11 : k de l'autre côté du sommet d'une parabole (une cubique a toujours un antécédent).
- F5 v7 : montants tirés en centimes (abonnement terminé par 5, jamais un zéro final qu'on lirait
  « 52,4 € ») et affichés par `;d`.

Usage : python3 docs/wip/questions/idees-3e-fonctions-publies.py scripts/questions/idees-3e-fonctions-publies
"""
import json
import os
import sys

DOSSIER = sys.argv[1]

P0 = '\\textcolor{{{color:primary.0}}}'

# id court → (variations, specs) d'origine en prod (export du 2026-11-24)
ORIGINE = {'d820232a': (5, 12), '6ad254b4': (4, 9), 'cb545bd7': (5, 13)}


def spec(desc, vi, variables_, status, answers, message=None, violations=None):
    expected = {'status': status}
    if violations:
        expected['constraintViolations'] = violations
    if message is not None:
        expected['expectedErrorMessage'] = message
    return {'description': desc, 'variationIndex': vi,
            'variables': {k: str(v) for k, v in variables_.items()},
            'expected': expected, 'answers': answers}


def var(nom, expression):
    return {'name': nom, 'expression': expression}


def erreur(answer, message, label):
    return {'answer': answer, 'message': message, 'label': label}


def case(attendue, erreurs=None, kind=None):
    c = {}
    if kind:
        c['answerKind'] = kind
    c['expectedAnswer'] = attendue
    if erreurs:
        c['expectedErrors'] = erreurs
    return c


def ensemble(attendue):
    return case(attendue, kind='intervalles')


def variation(statement, variables, blanks, steps, hint, conditions=None):
    v = {'statement': statement, 'variables': variables}
    if conditions:
        v['conditions'] = conditions
    v.update({'blanks': blanks, 'correction': {'steps': steps}, 'hint': hint})
    return v


def couleur(contenu):
    return P0 + '{' + contenu + '}'


def ind(u, k):
    """Indicatrice de u == k (u, k entiers) pour `eval:`."""
    return f'(1-min(abs(({u})-({k})),1))'


def choisir(selecteur, valeurs):
    """eval: valeur numéro `selecteur` (0, 1, 2…) de la liste."""
    return 'eval:' + '+'.join(f'({v})*{ind(selecteur, k)}' for k, v in enumerate(valeurs))


def colonne(position, valeurs):
    """eval: valeur de la colonne `position` (1 à 5) parmi les variables `valeurs`."""
    return 'eval:' + '+'.join(f'({v})*{ind(position, j + 1)}' for j, v in enumerate(valeurs))


def tous_distincts(noms):
    return [f'{a} != {b}' for i, a in enumerate(noms) for b in noms[i + 1:]]


def ajouter(court, variations, specs):
    chemin = os.path.join(DOSSIER, court + '.json')
    with open(chemin, encoding='utf-8') as f:
        m = json.load(f)
    nv, ns = ORIGINE[court]
    m['variations'] = m['variations'][:nv]
    m['testSpecs'] = m['testSpecs'][:ns]
    for s in specs:
        s['variationIndex'] += nv
    m['variations'] += variations
    m['testSpecs'] += specs
    with open(chemin, 'w', encoding='utf-8') as f:
        json.dump(m, f, ensure_ascii=False, indent='\t')
        f.write('\n')
    print(f'{court} : {nv} + {len(variations)} variations, {ns} + {len(specs)} specs')


DEF_IMAGE = ('Si $f(a)=b$, on dit que $b$ est **l\'image** de $a$ et que $a$ est **un antécédent** '
             'de $b$. Dans le tableau, les antécédents sont sur la ligne de $x$, les images sur '
             'celle de $f(x)$.')
FIN_ENSEMBLE = ('\n\nÉcris l\'ensemble des antécédents ($\\varnothing$ s\'il n\'y en a aucun).'
                '\n\nL\'ensemble des antécédents est $?$.')

# =============================================================================================
# d820232a — 3-040, image et antécédent. F1 : (v6) tableau mélangé, deux antécédents ;
# (v7) nombre absent de la ligne f(x) : ∅ ; (v8) deux fonctions, même image.
# F4 : (v9) parabole, k = ordonnée du sommet ; (v10) cubique, f(x) = k, trois solutions ;
# (v11) k hors de la courbe : ∅.
# =============================================================================================

XS = ['a1', 'a2', 'a3', 'a4', 'a5']
YS = ['b1', 'b2', 'b3', 'b4', 'b5']
HS = ['h1', 'h2', 'h3', 'h4', 'h5']
VAR_XS = [var('a1', '0..3'), var('a2', '-7..-4'), var('a3', '4..7'), var('a4', '-3..-1'),
          var('a5', '8..10')]
VAR_YS = [var(n, '-20..20') for n in YS]


def ligne(nom, cellules):
    return nom + ' & ' + ' & '.join('{{' + c + '}}' for c in cellules)


def tableau(*lignes):
    return ('$\\begin{array}{|l|c|c|c|c|c|} ' + ' \\\\ '.join(lignes) + ' \\end{array}$')


TAB_F = tableau(ligne('x', XS), ligne('f(x)', ['c1', 'c2', 'c3', 'c4', 'c5']))
INTRO_F = 'Voici un tableau de valeurs d\'une fonction $f$ :\n\n'
HINT_ANTE = ('Un antécédent de ${{d}}$ est un nombre de la ligne de $x$ dont l\'image, sur la '
             'ligne de $f(x)$, vaut ${{d}}$. Parcours **toute** la ligne de $f(x)$.')

# (v6) d dans les colonnes pa et pb : w = 0 → (1, 4), w = 1 → (2, 5), w = 2 → (3, 5).
F1_A = variation(
    INTRO_F + TAB_F + '\n\nQuel nombre, ou quels nombres, ont pour image ${{d}}$ par $f$ dans ce '
    'tableau ?' + FIN_ENSEMBLE,
    VAR_XS + [var('w', '0..2'), var('pa', 'eval:1+w'), var('pb', 'eval:4+min(w,1)'),
              var('d', '-20..20')] + VAR_YS
    + [var(f'c{j}', f'eval:(d)*({ind("pa", j)}+{ind("pb", j)})+(b{j})*(1-{ind("pa", j)}-'
                    f'{ind("pb", j)})') for j in range(1, 6)]
    + [var('ra', colonne('pa', XS)), var('rb', colonne('pb', XS))],
    [ensemble('\\{ {{ra}} ; {{rb}} \\}')],
    [
        DEF_IMAGE,
        'On cherche ${{d}}$ sur la ligne de $f(x)$ : il y est **deux fois**, sous $x={{ra}}$ et '
        'sous $x={{rb}}$.',
        '${{d}}$ a deux antécédents dans ce tableau : ' + '$' + couleur('\\{ {{ra}} ; {{rb}} \\}')
        + '$.',
    ],
    HINT_ANTE,
    tous_distincts(YS) + [f'{y} != d' for y in YS],
)

# (v7) d = abscisse de la colonne s, absent de la ligne f(x).
F1_B = variation(
    INTRO_F + TAB_F + '\n\nQuel nombre, ou quels nombres, ont pour image ${{d}}$ par $f$ dans ce '
    'tableau ?' + FIN_ENSEMBLE,
    VAR_XS + [var('s', '1..5'), var('d', colonne('s', XS))] + VAR_YS
    + [var(f'c{j}', f'eval:b{j}') for j in range(1, 6)] + [var('fd', colonne('s', YS))],
    [ensemble('\\varnothing')],
    [
        DEF_IMAGE,
        'On cherche ${{d}}$ sur la ligne de $f(x)$ : il n\'y est pas. Attention, ${{d}}$ est sur '
        'la ligne de $x$ : $f({{d}})={{fd}}$ est l\'**image** de ${{d}}$, pas un antécédent.',
        'Aucun nombre du tableau n\'a pour image ${{d}}$ : l\'ensemble est $'
        + couleur('\\varnothing') + '$.',
    ],
    HINT_ANTE,
    tous_distincts(YS) + [f'{y} != d' for y in YS],
)

# (v8) colonne commune k, leurre : g(q) = f(p). w = 0 → (4, 1, 3), 1 → (2, 5, 1), 2 → (5, 2, 4).
GS = [f'eval:(b{j})*{ind("k", j)}+(fp)*{ind("q", j)}+(h{j})*(1-{ind("k", j)}-{ind("q", j)})'
      for j in range(1, 6)]
E_F1_COMMUNE = ('Tu as donné l\'image commune ${{fk}}$ : la question demande le **nombre** $x$, '
                'sur la ligne de $x$.')
E_F1_LEURRE = ('${{fp}}$ est sur les deux lignes, mais pas dans la même colonne : cherche une '
               'colonne où les images par $f$ et par $g$ sont égales.')
F1_C = variation(
    'Voici un tableau de valeurs de deux fonctions $f$ et $g$ :\n\n'
    + tableau(ligne('x', XS), ligne('f(x)', YS), ligne('g(x)', ['g1', 'g2', 'g3', 'g4', 'g5']))
    + '\n\nPour quel nombre $f$ et $g$ ont-elles la même image ?\n\n$x=?$',
    VAR_XS + [var('w', '0..2'), var('k', choisir('w', [4, 2, 5])),
              var('p', choisir('w', [1, 5, 2])), var('q', choisir('w', [3, 1, 4]))]
    + VAR_YS + [var(n, '-20..20') for n in HS]
    + [var('fp', colonne('p', YS)), var('fk', colonne('k', YS)), var('xk', colonne('k', XS)),
       var('xp', colonne('p', XS)), var('xq', colonne('q', XS))]
    + [var(f'g{j}', GS[j - 1]) for j in range(1, 6)],
    [case('{{xk}}', [
        erreur('{{fk}}', E_F1_COMMUNE, 'Image commune au lieu du nombre'),
        erreur('{{xp}}', E_F1_LEURRE, 'Même valeur dans deux colonnes (ligne de f)'),
        erreur('{{xq}}', E_F1_LEURRE, 'Même valeur dans deux colonnes (ligne de g)'),
    ])],
    [
        'L\'image d\'un nombre $x$ se lit dans **sa colonne**. On cherche une colonne où les lignes '
        '$f(x)$ et $g(x)$ portent le même nombre.',
        'Sous $x={{xk}}$ : $f({{xk}})=g({{xk}})={{fk}}$.',
        '$f$ et $g$ ont la même image pour $x=' + couleur('{{xk}}') + '$.',
    ],
    'Compare $f(x)$ et $g(x)$ **colonne par colonne** ; le nombre cherché se lit sur la ligne de $x$.',
    tous_distincts(YS) + [f'h{j} != b{j}' for j in range(1, 6)]
    + ['fk != xk', 'fk != xp', 'fk != xq'],
)

COURBE_PARABOLE = ('x: {{eval:min(-1,p-3)}} ; {{eval:max(1,p+3)}}\n'
                   'y: {{eval:min(-1,Y0)}} ; {{eval:max(1,Y1)}}\n'
                   'grille: 1 ; 1\n'
                   'f(x) = ({{c}})*(x-({{p}}))^2+({{q}}) sur [{{eval:p-2.2;d}} ; '
                   '{{eval:p+2.2;d}}]   bleu   nom=C_f\n')


def bloc_courbe(contenu, description, extra=''):
    return ('```courbe\n' + contenu + extra + 'taille: moyenne\ndescription: ' + description
            + '\n```')


INTRO_C = 'La courbe $\\mathcal{C}_f$ ci-dessous représente une fonction $f$.\n\n'
HORIZ = ('On trace la droite horizontale d\'équation $y={{k}}$ : les antécédents de ${{k}}$ sont '
         'les **abscisses** des points où elle coupe $\\mathcal{C}_f$.')
HINT_HORIZ = ('Trace la droite horizontale d\'équation $y={{k}}$ : les antécédents sont les '
              'abscisses des points où elle rencontre la courbe.')

# (v9) k = q, ordonnée du sommet.
PAR_V9 = COURBE_PARABOLE.replace('Y0', 'q-1,q+5*(c)').replace('Y1', 'q+1,q+5*(c)')
F4_A = variation(
    INTRO_C + bloc_courbe(PAR_V9, 'Courbe en forme de parabole d\'une fonction f.')
    + '\n\nLis les antécédents de ${{k}}$ par $f$.' + FIN_ENSEMBLE,
    [var('c', '1|-1'), var('p', '-2..2'), var('q', '-3..3'), var('k', 'eval:q')],
    [ensemble('\\{ {{p}} \\}')],
    [
        HORIZ,
        bloc_courbe(PAR_V9, 'Courbe de f et droite horizontale y = {{k}}, qui la touche en son '
                            'sommet S.',
                    'g(x) = {{k}}   rouge   pointillé\npoints: S({{p}} ; {{k}})\n'),
        'La droite ne touche $\\mathcal{C}_f$ qu\'en un seul point, le sommet $S$ : ${{k}}$ a '
        '**un seul** antécédent, $' + couleur('\\{ {{p}} \\}') + '$.',
    ],
    HINT_HORIZ,
    ['q != p'],
)

# (v10) cubique, racines r1 = m − u, r2 = m, r3 = m + v.
CUBIQUE = ('x: {{eval:min(-1,r1-1)}} ; {{eval:max(1,r3+1)}}\n'
           'y: {{eval:min(-1,k-6)}} ; {{eval:max(1,k+6)}}\n'
           'grille: 1 ; 1\n'
           'f(x) = {{k}}+({{s}})*(x-({{r1}}))*(x-({{r2}}))*(x-({{r3}}))/2 sur '
           '[{{eval:r1-0.5;d}} ; {{eval:r3+0.5;d}}]   bleu   nom=C_f\n')
SOL_V10 = '\\{ {{r1}} ; {{r2}} ; {{r3}} \\}'
F4_B = variation(
    INTRO_C + bloc_courbe(CUBIQUE, 'Courbe d\'une fonction f qui monte et descend.')
    + '\n\nRésous graphiquement l\'équation $f(x)={{k}}$.\n\nÉcris l\'ensemble des solutions '
    '($\\varnothing$ s\'il n\'y en a aucune).\n\nL\'ensemble des solutions est $S=?$.',
    [var('s', '1|-1'), var('m', '-1..1'), var('u', '2..3'), var('v', '2..3'), var('k', '-3..3'),
     var('r1', 'eval:m-u'), var('r2', 'eval:m'), var('r3', 'eval:m+v')],
    [ensemble(SOL_V10)],
    [
        'Les solutions de $f(x)={{k}}$ sont les antécédents de ${{k}}$. On trace la droite '
        'horizontale d\'équation $y={{k}}$ : les solutions sont les **abscisses** des points où '
        'elle coupe $\\mathcal{C}_f$.',
        bloc_courbe(CUBIQUE, 'Courbe de f et droite horizontale y = {{k}}, qui la coupe en A, B '
                             'et C.',
                    'g(x) = {{k}}   rouge   pointillé\npoints: A({{r1}} ; {{k}}), '
                    'B({{r2}} ; {{k}}), C({{r3}} ; {{k}})\n'),
        'La droite coupe $\\mathcal{C}_f$ en **trois** points $A$, $B$ et $C$ : '
        '$S=' + couleur(SOL_V10) + '$.',
    ],
    'Les solutions de $f(x)={{k}}$ sont les antécédents de ${{k}}$. ' + HINT_HORIZ
    + ' Compte-les tous.',
    ['k != 0'],
)

# (v11) k = q − c·t : de l'autre côté du sommet.
PAR_V11 = COURBE_PARABOLE.replace('Y0', 'k-1,q+5*(c)').replace('Y1', 'k+1,q+5*(c)')
F4_C = variation(
    INTRO_C + bloc_courbe(PAR_V11, 'Courbe en forme de parabole d\'une fonction f.')
    + '\n\nLis les antécédents de ${{k}}$ par $f$.' + FIN_ENSEMBLE,
    [var('c', '1|-1'), var('p', '-2..2'), var('q', '-2..2'), var('t', '1..3'),
     var('k', 'eval:q-(c)*(t)')],
    [ensemble('\\varnothing')],
    [
        HORIZ,
        bloc_courbe(PAR_V11, 'Courbe de f et droite horizontale y = {{k}}, qui ne la rencontre '
                             'pas.', 'g(x) = {{k}}   rouge   pointillé\n'),
        'La droite ne rencontre pas $\\mathcal{C}_f$ : la courbe ne '
        '{{if:c==1|descend jamais au-dessous|monte jamais au-dessus}} de son sommet, d\'ordonnée ${{q}}$. ${{k}}$ n\'a aucun '
        'antécédent : $' + couleur('\\varnothing') + '$.',
    ],
    HINT_HORIZ,
)

# Tirages des specs F1 : x = 2, −5, 6, −1, 9 ; f(x) = 11, −3, 15, 0, −12 (hors colonnes de d).
XV = {'a1': 2, 'a2': -5, 'a3': 6, 'a4': -1, 'a5': 9}
YV = {'b1': 11, 'b2': -3, 'b3': 15, 'b4': 0, 'b5': -12}
V6 = {**XV, 'w': 0, 'd': 7, **YV}          # d sous x = 2 et x = −1
V6B = {**XV, 'w': 2, 'd': -8, **YV}        # d sous x = 6 et x = 9
V7 = {**XV, 's': 3, **YV}                  # d = 6, f(6) = 15
V8 = {**XV, 'w': 0, **YV, 'h1': 4, 'h2': 8, 'h3': -7, 'h4': 13, 'h5': 5}
# V8 : f = 11, −3, 15, 0, −12 ; g = 4, 8, 11, 0, 5 → même image en x = −1 (0) ; leurre 11.
V9 = {'c': 1, 'p': 1, 'q': -2}
V10 = {'s': 1, 'm': 0, 'u': 2, 'v': 3, 'k': 1}
V11 = {'c': 1, 'p': 1, 'q': 2, 't': 3}     # k = −1, sommet (1 ; 2)

SPECS_D8 = [
    spec('F1a : antécédents de 7 = {2 ; −1}', 0, V6, 'correct', ['\\{2;-1\\}']),
    spec('F1a : ordre inverse', 0, V6, 'correct', ['\\{-1;2\\}']),
    spec('F1a : un seul des deux antécédents', 0, V6, 'incorrect', ['\\{2\\}']),
    spec('F1a : le nombre 7 lui-même', 0, V6, 'incorrect', ['\\{7\\}']),
    spec('F1a : w = 2, antécédents de −8 = {6 ; 9}', 0, V6B, 'correct', ['\\{6;9\\}']),
    spec('F1b : 6 absent de la ligne f(x) → ∅', 1, V7, 'correct', ['\\varnothing']),
    spec('F1b : autre écriture de l\'ensemble vide', 1, V7, 'correct', ['\\emptyset']),
    spec('F1b : image de 6 lue au lieu de ses antécédents', 1, V7, 'incorrect', ['\\{15\\}']),
    spec('F1b : le nombre 6 lui-même', 1, V7, 'incorrect', ['\\{6\\}']),
    spec('F1c : même image en x = −1', 2, V8, 'correct', ['-1']),
    spec('F1c : image commune donnée', 2, V8, 'incorrect', ['0'], E_F1_COMMUNE.replace(
        '{{fk}}', '0')),
    spec('F1c : leurre, colonne de f', 2, V8, 'incorrect', ['2'],
         E_F1_LEURRE.replace('{{fp}}', '11')),
    spec('F1c : leurre, colonne de g', 2, V8, 'incorrect', ['6'],
         E_F1_LEURRE.replace('{{fp}}', '11')),
    spec('F1c : la valeur leurre elle-même', 2, V8, 'incorrect', ['11']),
    spec('F4a : sommet (1 ; −2), antécédents de −2 = {1}', 3, V9, 'correct', ['\\{1\\}']),
    spec('F4a : ordonnée du sommet donnée', 3, V9, 'incorrect', ['\\{-2\\}']),
    spec('F4a : deux antécédents inventés', 3, V9, 'incorrect', ['\\{0;2\\}']),
    spec('F4b : f(x) = 1 → {−2 ; 0 ; 3}', 4, V10, 'correct', ['\\{-2;0;3\\}']),
    spec('F4b : autre ordre', 4, V10, 'correct', ['\\{3;-2;0\\}']),
    spec('F4b : une solution oubliée', 4, V10, 'incorrect', ['\\{-2;3\\}']),
    spec('F4b : l\'image 1 donnée', 4, V10, 'incorrect', ['\\{1\\}']),
    spec('F4b : s = −1, k = −2', 4, {**V10, 's': -1, 'm': 1, 'u': 3, 'v': 2, 'k': -2}, 'correct',
         ['\\{-2;1;3\\}']),
    spec('F4c : −1 sous le sommet (1 ; 2) → ∅', 5, V11, 'correct', ['\\varnothing']),
    spec('F4c : autre écriture de l\'ensemble vide', 5, V11, 'correct', ['\\emptyset']),
    spec('F4c : abscisse du sommet donnée', 5, V11, 'incorrect', ['\\{1\\}']),
    spec('F4c : le nombre −1 lui-même', 5, V11, 'incorrect', ['\\{-1\\}']),
    spec('F4c : c = −1, 4 au-dessus du sommet (0 ; 1) → ∅', 5, {'c': -1, 'p': 0, 'q': 1, 't': 3},
         'correct', ['\\varnothing']),
]

ajouter('d820232a', [F1_A, F1_B, F1_C, F4_A, F4_B, F4_C], SPECS_D8)

# =============================================================================================
# 6ad254b4 — 3-039, formule → tableau. F2 : (v5) ax² + bx + c ; (v6) (x + a)(x + b), tableau
# x = −m, 0, m (m = 2 ou 3). F3 : (v7) courbe (droite, parabole ou cubique) → tableau.
# =============================================================================================

X = var('x', 'x|x')
M = var('m', '2|3')
TAB_3 = ('$\\begin{array}{|l|c|c|c|} x & {{eval:-m}} & 0 & {{m}} \\\\ f(x) & ? & ? & ? '
         '\\end{array}$')
REMPLACER = 'On remplace $x$ par chaque valeur, **entre parenthèses** quand elle est négative.'

E_F2_CARRE = ('Le carré d\'un nombre négatif est positif : $\\left( {{eval:-m}} \\right)^2 = {{eval:m^2}}$.')
E_F2_SIGNE_X = ('Garde le signe de $x$ : remplace $x$ par $\\left( {{eval:-m}} \\right)$ dans **chaque** terme, '
                'aussi dans le terme en $x$.')
E_F2_AX2 = ('Dans $a x^2$, seul $x$ est élevé au carré : on calcule $a\\times x^2$, et non '
            '$(a\\times x)^2$.')
E_F2_2X = '$x^2$ veut dire $x\\times x$, et non $2\\times x$.'

F2_A = variation(
    'On considère la fonction $f$ définie par $f(x)={{eval:a*x^2+(b)*x+(c)}}$.\n\nComplète le '
    'tableau de valeurs de $f$ :\n\n' + TAB_3,
    [X, var('a', '1..3;±'), var('b', '1..5;±'), var('c', '1..9;±'), M],
    [
        case('{{eval:(a)*(m)^2-(b)*(m)+(c)}}', [
            erreur('{{eval:-(a)*(m)^2-(b)*(m)+(c)}}', E_F2_CARRE, '(−m)² calculé −m²'),
            erreur('{{eval:(a)*(m)^2+(b)*(m)+(c)}}', E_F2_SIGNE_X, 'Signe de x oublié dans bx'),
            erreur('{{eval:(a)^2*(m)^2-(b)*(m)+(c)}}', E_F2_AX2, 'ax² calculé (ax)²'),
        ]),
        case('{{c}}'),
        case('{{eval:(a)*(m)^2+(b)*(m)+(c)}}', [
            erreur('{{eval:(a)^2*(m)^2+(b)*(m)+(c)}}', E_F2_AX2, 'ax² calculé (ax)²'),
            erreur('{{eval:2*(a)*(m)+(b)*(m)+(c)}}', E_F2_2X, 'x² calculé 2x'),
        ]),
    ],
    [
        REMPLACER,
        '$$f({{eval:-m}}) = {{a}} \\times ({{eval:-m}})^2 {{eval:b;+}} \\times ({{eval:-m}}) '
        '{{eval:c;+}} = {{eval:(a)*(m)^2}} {{eval:-(b)*(m);+}} {{eval:c;+}} = '
        + couleur('{{eval:(a)*(m)^2-(b)*(m)+(c)}}') + '$$',
        '$$f(0) = {{a}} \\times 0^2 {{eval:b;+}} \\times 0 {{eval:c;+}} = ' + couleur('{{c}}')
        + '$$',
        '$$f({{m}}) = {{a}} \\times {{m}}^2 {{eval:b;+}} \\times {{m}} {{eval:c;+}} = '
        '{{eval:(a)*(m)^2}} {{eval:(b)*(m);+}} {{eval:c;+}} = '
        + couleur('{{eval:(a)*(m)^2+(b)*(m)+(c)}}') + '$$',
    ],
    'Remplace $x$ par chaque valeur du tableau, entre parenthèses quand elle est négative, puis '
    'calcule d\'abord le carré.',
)

E_F2_MOINS_M = 'Remplace $x$ par $\\left( {{eval:-m}} \\right)$, et non par ${{m}}$ : garde le signe.'
E_F2_REGLE = ('Revois la règle des signes : le produit de deux nombres de même signe est '
              'positif, de signes contraires négatif.')
E_F2_SOMME = 'Les deux parenthèses côte à côte se **multiplient** : on ne les additionne pas.'
FACT = '(x{{if:a<0|{{a}}|+{{a}}}})(x{{if:b<0|{{b}}|+{{b}}}})'


def par(n):
    return '{{if:' + n + '<0|({{' + n + '}})|{{' + n + '}}}}'


F2_B = variation(
    'On considère la fonction $f$ définie par $f(x)=' + FACT + '$.\n\nComplète le tableau de '
    'valeurs de $f$ :\n\n' + TAB_3,
    [var('a', '1..6;±'), var('b', '1..6;±'), M, var('am', 'eval:a-m'), var('bm', 'eval:b-m'),
     var('ap', 'eval:a+m'), var('bp', 'eval:b+m')],
    [
        case('{{eval:(a-m)*(b-m)}}', [
            erreur('{{eval:(a+m)*(b+m)}}', E_F2_MOINS_M, 'x remplacé par m au lieu de −m'),
            erreur('{{eval:-(a-m)*(b-m)}}', E_F2_REGLE, 'Règle des signes'),
            erreur('{{eval:(a-m)+(b-m)}}', E_F2_SOMME, 'Facteurs additionnés'),
        ]),
        case('{{eval:a*b}}', [
            erreur('{{eval:a+b}}', E_F2_SOMME, 'Facteurs additionnés'),
            erreur('{{eval:-(a*b)}}', E_F2_REGLE, 'Règle des signes'),
        ]),
        case('{{eval:(a+m)*(b+m)}}', [
            erreur('{{eval:(a+m)+(b+m)}}', E_F2_SOMME, 'Facteurs additionnés'),
            erreur('{{eval:-(a+m)*(b+m)}}', E_F2_REGLE, 'Règle des signes'),
        ]),
    ],
    [
        REMPLACER + ' Les deux facteurs se calculent d\'abord, puis on les **multiplie**.',
        '$$f({{eval:-m}}) = ({{eval:-m}}{{eval:a;+}})({{eval:-m}}{{eval:b;+}}) = ' + par('am')
        + ' \\times ' + par('bm') + ' = ' + couleur('{{eval:(a-m)*(b-m)}}') + '$$',
        '$$f(0) = (0{{eval:a;+}})(0{{eval:b;+}}) = ' + par('a') + ' \\times ' + par('b') + ' = '
        + couleur('{{eval:a*b}}') + '$$',
        '$$f({{m}}) = ({{m}}{{eval:a;+}})({{m}}{{eval:b;+}}) = ' + par('ap') + ' \\times '
        + par('bp') + ' = ' + couleur('{{eval:(a+m)*(b+m)}}') + '$$',
    ],
    'Remplace $x$ par chaque valeur du tableau, calcule chaque parenthèse, puis multiplie les deux '
    'résultats.',
    ['a != b'],
)

# (v7) t = 0 droite, 1 parabole, 2 cubique ; abscisses lues m − 2, m + 1, m + 2.
J0, J1, J2 = ind('t', 0), ind('t', 1), ind('t', 2)
LO = f'eval:-6*{J0}+((1+s)/2*(-1)+(1-s)/2*(-6))*{J1}+((1+s)/2*(-7)+(1-s)/2*(-2))*{J2}'
HI = f'eval:6*{J0}+((1+s)/2*6+(1-s)/2*1)*{J1}+((1+s)/2*2+(1-s)/2*7)*{J2}'
COURBE_F3 = ('x: {{eval:min(-1,m-3)}} ; {{eval:max(1,m+3)}}\n'
             'y: {{eval:min(-1,c+lo)}} ; {{eval:max(1,c+hi)}}\n'
             'grille: 1 ; 1\n'
             'f(x) = {{c}}+({{s}})*({{j0}}*{{g}}*(x-({{m}}))+{{j1}}*(x-({{m}}))^2+{{j2}}*'
             '(x-({{m}})+1)*(x-({{m}}))*(x-({{m}})-2)/2) sur [{{eval:m-2.3;d}} ; '
             '{{eval:m+2.3;d}}]   bleu   nom=C_f\n')
E_F3_ABS = ('Tu as recopié l\'abscisse : on lit l\'**ordonnée** du point de la courbe, sur '
            'l\'axe vertical.')
E_F3_CARREAU = ('Compte à nouveau les carreaux : ta lecture est décalée d\'un carreau.')


def case_f3(n):
    return case('{{v' + n + '}}', [
        erreur('{{u' + n + '}}', E_F3_ABS, 'Abscisse au lieu de l\'ordonnée'),
        erreur('{{eval:v' + n + '+1}}', E_F3_CARREAU, 'Lecture décalée d\'un carreau (+1)'),
        erreur('{{eval:v' + n + '-1}}', E_F3_CARREAU, 'Lecture décalée d\'un carreau (−1)'),
    ])


F3 = variation(
    INTRO_C + bloc_courbe(COURBE_F3, 'Courbe d\'une fonction f, sur un quadrillage d\'unité 1.')
    + '\n\nComplète le tableau de valeurs de $f$ en lisant le graphique :\n\n'
    '$\\begin{array}{|l|c|c|c|} x & {{u1}} & {{u2}} & {{u3}} \\\\ f(x) & ? & ? & ? '
    '\\end{array}$',
    [var('t', '0..2'), var('s', '1|-1'), var('g', '1..2'), var('m', '-1..1'), var('c', '-3..3'),
     var('j0', 'eval:' + J0), var('j1', 'eval:' + J1), var('j2', 'eval:' + J2),
     var('lo', LO), var('hi', HI),
     var('u1', 'eval:m-2'), var('u2', 'eval:m+1'), var('u3', 'eval:m+2'),
     var('v1', 'eval:c+(s)*(-2*(g)*(j0)+4*(j1)-4*(j2))'),
     var('v2', 'eval:c+(s)*((g)*(j0)+(j1)-(j2))'),
     var('v3', 'eval:c+(s)*(2*(g)*(j0)+4*(j1))')],
    [case_f3('1'), case_f3('2'), case_f3('3')],
    [
        'Pour lire $f(a)$ : on part de $a$ sur l\'axe des abscisses, on va verticalement jusqu\'à '
        '$\\mathcal{C}_f$, puis horizontalement jusqu\'à l\'axe des ordonnées.',
        bloc_courbe(COURBE_F3, 'Courbe de f et ses points A, B et C d\'abscisses {{u1}}, {{u2}} '
                               'et {{u3}}.',
                    'points: A({{u1}} ; {{v1}}), B({{u2}} ; {{v2}}), C({{u3}} ; {{v3}})\n'),
        '$A({{u1}}\\,;{{v1}})$, $B({{u2}}\\,;{{v2}})$ et $C({{u3}}\\,;{{v3}})$ :',
        '$\\begin{array}{|l|c|c|c|} x & {{u1}} & {{u2}} & {{u3}} \\\\ f(x) & ' + couleur('{{v1}}')
        + ' & ' + couleur('{{v2}}') + ' & ' + couleur('{{v3}}') + ' \\end{array}$',
    ],
    'Pour chaque $x$ du tableau, va verticalement jusqu\'à la courbe, puis lis l\'ordonnée du point '
    'sur l\'axe vertical.',
)

V5 = {'a': 2, 'b': -3, 'c': 1, 'm': 3}      # f(x) = 2x² − 3x + 1 : 28, 1, 10
V5B = {'a': -1, 'b': 4, 'c': -5, 'm': 2}    # f(x) = −x² + 4x − 5 : −17, −5, −1
V6F = {'a': 2, 'b': -5, 'm': 3}             # (x + 2)(x − 5) : 8, −10, −10
F3_DROITE = {'t': 0, 's': 1, 'g': 2, 'm': 0, 'c': 1}     # 1 + 2x en −2, 1, 2 : −3, 3, 5
F3_CUBIQUE = {'t': 2, 's': 1, 'g': 1, 'm': 1, 'c': 2}    # en −1, 2, 3 : −2, 1, 2
F3_PARABOLE = {'t': 1, 's': -1, 'g': 1, 'm': -1, 'c': 3}  # en −3, 0, 1 : −1, 2, −1


SPECS_6A = [
    spec('F2a : 2x² − 3x + 1 → 28, 1, 10', 0, V5, 'correct', ['28', '1', '10']),
    spec('F2a : (−3)² = −9', 0, V5, 'incorrect', ['-8', '1', '10'],
         E_F2_CARRE.replace('{{eval:-m}}', '-3').replace('{{eval:m^2}}', '9')),
    spec('F2a : signe de x oublié dans bx', 0, V5, 'incorrect', ['10', '1', '10'],
         E_F2_SIGNE_X.replace('{{eval:-m}}', '-3')),
    spec('F2a : (ax)² en −3', 0, V5, 'incorrect', ['46', '1', '10'], E_F2_AX2),
    spec('F2a : (ax)² en 3', 0, V5, 'incorrect', ['28', '1', '28'], E_F2_AX2),
    spec('F2a : x² pris pour 2x', 0, V5, 'incorrect', ['28', '1', '4'], E_F2_2X),
    spec('F2a : −x² + 4x − 5 → −17, −5, −1', 0, V5B, 'correct', ['-17', '-5', '-1']),
    spec('F2a : −x² pris pour (−x)² en 2', 0, V5B, 'incorrect', ['-17', '-5', '7'], E_F2_AX2),
    spec('F2b : (x + 2)(x − 5) → 8, −10, −10', 1, V6F, 'correct', ['8', '-10', '-10']),
    spec('F2b : x remplacé par 3 au lieu de −3', 1, V6F, 'incorrect', ['-10', '-10', '-10'],
         E_F2_MOINS_M.replace('{{eval:-m}}', '-3').replace('{{m}}', '3')),
    spec('F2b : règle des signes en −3', 1, V6F, 'incorrect', ['-8', '-10', '-10'], E_F2_REGLE),
    spec('F2b : facteurs additionnés en −3', 1, V6F, 'incorrect', ['-9', '-10', '-10'],
         E_F2_SOMME),
    spec('F2b : facteurs additionnés en 0', 1, V6F, 'incorrect', ['8', '-3', '-10'], E_F2_SOMME),
    spec('F2b : facteurs additionnés en 3', 1, V6F, 'incorrect', ['8', '-10', '3'], E_F2_SOMME),
    spec('F3 : droite 1 + 2x → −3, 3, 5', 2, F3_DROITE, 'correct', ['-3', '3', '5']),
    spec('F3 : abscisse recopiée', 2, F3_DROITE, 'incorrect', ['-2', '3', '5'], E_F3_ABS),
    spec('F3 : décalé d\'un carreau vers le haut', 2, F3_DROITE, 'incorrect', ['-3', '4', '5'],
         E_F3_CARREAU),
    spec('F3 : décalé d\'un carreau vers le bas', 2, F3_DROITE, 'incorrect', ['-3', '3', '4'],
         E_F3_CARREAU),
    spec('F3 : cubique → −2, 1, 2', 2, F3_CUBIQUE, 'correct', ['-2', '1', '2']),
    spec('F3 : cubique, abscisse recopiée', 2, F3_CUBIQUE, 'incorrect', ['-1', '1', '2'],
         E_F3_ABS),
    spec('F3 : parabole → −1, 2, −1', 2, F3_PARABOLE, 'correct', ['-1', '2', '-1']),
]

ajouter('6ad254b4', [F2_A, F2_B, F3], SPECS_6A)

# =============================================================================================
# cb545bd7 — 4-062, produire une formule. F5 : (v6) grandeur qui diminue (abonnés) ;
# (v7) coefficients décimaux (facture d'eau). Options du modèle : `form` et `products` off.
# =============================================================================================

FORMULE = ('**Formule.** On écrit le calcul qu\'on ferait avec un nombre, en remplaçant ce '
           'nombre par la lettre.')
E_F5_INV_A = ('Le nombre d\'abonnés du départ ne se multiplie pas par $t$ : c\'est la perte de '
              'chaque mois qui se répète.')
E_F5_SIGNE = 'Les abonnés **diminuent** : on retire ${{a}} t$, on ne l\'ajoute pas.'
E_F5_TOUT_A = ('Seule la perte se répète chaque mois : le nombre d\'abonnés du départ ne compte '
               'qu\'une fois.')
F5_A = variation(
    'Une chaîne de vidéos compte ${{n0}}$ abonnés. Chaque mois, elle en perd ${{a}}$. On note '
    '$N(t)$ le nombre d\'abonnés au bout de $t$ mois.\n\nExprime $N(t)$ en fonction de $t$.\n\n'
    '$N(t) = ?$',
    [var('k', '3..9'), var('n0', 'eval:1000*k'), var('j', '2..9'), var('a', 'eval:10*j')],
    [case('{{n0}}-{{a}}t', [
        erreur('{{a}}-{{n0}}t', E_F5_INV_A, 'Coefficients inversés'),
        erreur('{{n0}}+{{a}}t', E_F5_SIGNE, 'Signe de la diminution'),
        erreur('({{n0}}-{{a}})t', E_F5_TOUT_A, 'Nombre de départ multiplié par t'),
    ])],
    [
        FORMULE,
        'Au bout de $10$ mois, il resterait ${{n0}} - {{a}} \\times 10$ abonnés. Au bout de $t$ '
        'mois :',
        '$$N(t) = ' + couleur('{{n0}} - {{a}}t') + '$$',
    ],
    'Écris le calcul pour un nombre de mois précis, par exemple $10$, puis remplace ce nombre par '
    '$t$.',
)

E_F5_INV_B = ('L\'abonnement se paie une seule fois : c\'est le prix du mètre cube qui se '
              'multiplie par $v$.')
E_F5_TOUT_B = ('Seul le prix du mètre cube dépend de $v$ : l\'abonnement s\'ajoute une seule '
               'fois.')
E_F5_OUBLI = 'N\'oublie pas l\'abonnement : on le paie même sans consommer d\'eau.'
B_EUR = '{{eval:bc/100;d}}'
P_EUR = '{{eval:pc/100;d}}'
F5_B = variation(
    'Une facture d\'eau comprend un abonnement de $' + B_EUR + '~\\unit{€}$, puis $' + P_EUR
    + '~\\unit{€}$ par mètre cube d\'eau consommé. On note $F(v)$ le montant de la facture, en '
    'euros, pour $v$ mètres cubes.\n\nExprime $F(v)$ en fonction de $v$.\n\n$F(v) = ?$',
    [var('bk', '300..699'), var('bc', 'eval:10*bk+5'), var('pk', '20..44'),
     var('pc', 'eval:10*pk+5')],
    [case(B_EUR + '+' + P_EUR + 'v', [
        erreur(P_EUR + '+' + B_EUR + 'v', E_F5_INV_B, 'Coefficients inversés'),
        erreur('(' + B_EUR + '+' + P_EUR + ')v', E_F5_TOUT_B, 'Abonnement multiplié par v'),
        erreur(P_EUR + 'v', E_F5_OUBLI, 'Abonnement oublié'),
    ])],
    [
        FORMULE,
        'Pour $20~\\unit{m^3}$, on paierait $' + B_EUR + ' + ' + P_EUR + ' \\times 20$. Pour $v$ '
        'mètres cubes :',
        '$$F(v) = ' + couleur(B_EUR + ' + ' + P_EUR + 'v') + '$$',
    ],
    'Écris le calcul pour une consommation précise, par exemple $20~\\unit{m^3}$, puis remplace '
    'ce nombre par $v$.',
)

V_ABO = {'k': 8, 'j': 5}                 # 8 000 − 50t
V_EAU = {'bk': 524, 'pk': 31}            # 52,45 + 3,15v

SPECS_CB = [
    spec('F5a : 8 000 − 50t', 0, V_ABO, 'correct', ['8\\,000-50t']),
    spec('F5a : autre ordre', 0, V_ABO, 'correct', ['-50t+8\\,000']),
    spec('F5a : avec le signe ×', 0, V_ABO, 'correct', ['8\\,000-50\\times t']),
    spec('F5a : sans espace dans 8000', 0, V_ABO, 'correct', ['8000-50t']),
    spec('F5a : coefficients inversés', 0, V_ABO, 'incorrect', ['50-8\\,000t'], E_F5_INV_A),
    spec('F5a : signe de la diminution', 0, V_ABO, 'incorrect', ['8\\,000+50t'],
         E_F5_SIGNE.replace('{{a}}', '50')),
    spec('F5a : tout multiplié par t', 0, V_ABO, 'incorrect', ['(8\\,000-50)t'], E_F5_TOUT_A),
    spec('F5b : 52,45 + 3,15v', 1, V_EAU, 'correct', ['52{,}45+3{,}15v']),
    spec('F5b : autre ordre', 1, V_EAU, 'correct', ['3{,}15v+52{,}45']),
    spec('F5b : coefficients inversés', 1, V_EAU, 'incorrect', ['3{,}15+52{,}45v'], E_F5_INV_B),
    spec('F5b : abonnement multiplié', 1, V_EAU, 'incorrect', ['(52{,}45+3{,}15)v'],
         E_F5_TOUT_B),
    spec('F5b : abonnement oublié', 1, V_EAU, 'incorrect', ['3{,}15v'], E_F5_OUBLI),
]

ajouter('cb545bd7', [F5_A, F5_B], SPECS_CB)
