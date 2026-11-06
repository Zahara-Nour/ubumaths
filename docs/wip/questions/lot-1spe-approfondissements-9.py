"""Écrit les 3 modèles du lot 9 « approfondissements : probabilités » de la 1re spé
dans scripts/questions/1spe-approfondissements-9/.

Phase 0 validée par David le 2026-11-04 (D3 du journal
« docs/wip/questions-1spe-demonstrations-progress.md », § 9) ; contenu validé le 2026-11-05 (D7,
« ok pour le contenu »), un point par modèle, chacun sur la sous-notion de son point (aucune neuve) :

| # | Point    | Titre                                                | Niv. | Nœud du modèle                                          |
| 1 | 1SPE-345 | Succession de plusieurs épreuves indépendantes       | 1    | Probabilités conditionnelles › épreuves indépendantes successives |
| 2 | 1SPE-346 | Marche aléatoire sur une droite graduée              | 2    | Probabilités conditionnelles › épreuves indépendantes successives |
| 3 | 1SPE-361 | Étudier la fonction x ↦ E((X − x)²)                  | 2    | Variables aléatoires › variance et écart-type           |

Forme (D3, Q2) : 345 et 346 sont des exercices d'application à valeurs tirées (p = k/10) ; 361 est
en partie une preuve (case, case choix à 4 propositions dont la première est la bonne, variation
« étapes à ranger », positions calculées par le générateur, graine 0). Réponses décimales
acceptées (`acceptDecimal`, comme les modèles de probabilités de 1re spé).

Variables : jamais `e` ni `E` (constante d'Euler) ; moyenne `m`, probabilités `q1`, `q2`, `q3`.

Approfondissements « en aucun cas obligatoires » (BO 1re spé p.3).

    python3 docs/wip/questions/lot-1spe-approfondissements-9.py scripts/questions/1spe-approfondissements-9
"""
import json
import os
import subprocess
import sys

DOSSIER = sys.argv[1]

DECIMAL = {'blankDefaults': {'acceptDecimal': True}}


def spec(desc, vi, answer, status, variables=None, violations=None):
    expected = {'status': status}
    if status in ('bad_form', 'unoptimal_form'):
        expected['constraintViolations'] = violations or ['form']
    answers = answer if isinstance(answer, list) else [answer]
    return {'description': desc, 'variationIndex': vi,
            'variables': {k: str(v) for k, v in (variables or {}).items()},
            'answers': answers, 'expected': expected}


def modele(nom, title, description, level, variations, specs):
    return nom, {'title': title, 'description': description, 'grades': ['1_SPE'],
                 'level': level, 'delay': 90, 'status': 'draft',
                 'shared': DECIMAL,
                 'variations': variations, 'testSpecs': specs}


def var(nom, expression):
    return {'name': nom, 'expression': expression}


def ev(x):
    return '{{eval:' + x + '}}'


def evd(x):
    """Valeur décimale (virgule)."""
    return '{{eval:' + x + ';d}}'


def col(x, k=0):
    return '\\textcolor{{{color:primary.' + str(k) + '}}}{' + x + '}'


def choix(lignes):
    return '\n\n```choix\n' + ''.join('- ' + l + '\n' for l in lignes) + '```'


def case(statement, variables, attendu, steps, conditions=None):
    """Variation à une case ouverte (`?` dans une formule de l'énoncé)."""
    v = {'statement': statement, 'variables': variables,
         'blanks': [attendu if isinstance(attendu, dict) else {'expectedAnswer': attendu}],
         'correction': {'steps': steps}}
    if conditions:
        v['conditions'] = conditions
    return v


def justification(statement, variables, bonne, autres, steps, conditions=None):
    """Variation à une case choix : la première proposition est la bonne (index 0)."""
    v = {'statement': statement + choix([bonne] + autres), 'variables': variables,
         'blanks': [{'expectedAnswer': '0'}], 'correction': {'steps': steps}}
    if conditions:
        v['conditions'] = conditions
    return v


def ranger(intro, etapes, steps):
    """Variation « étapes à ranger » (lot 4) : étapes données dans le bon ordre."""
    return {'statement': intro + '\n\nRemets les étapes de la démonstration dans l\'ordre.\n\n'
            '```ranger\nsigne: aucun\n' + ''.join('- ' + e + '\n' for e in etapes) + '```',
            'variables': [], 'correction': {'steps': steps}}


def specs_choix(vi, juste, erreurs, variables=None):
    out = [spec(juste, vi, '0', 'correct', variables)]
    for k, erreur in enumerate(erreurs, start=1):
        out.append(spec('Erreur : ' + erreur, vi, str(k), 'incorrect', variables))
    return out


REPONSE = 'Réponds par une fraction irréductible ou par un nombre décimal exact.'
P = evd('k/10')        # p
Q = evd('1-k/10')      # 1 − p
K = var('k', '2..8')

MODELES = []

# --- 1. 1SPE-345 : succession de plusieurs épreuves indépendantes -------------------------------

ARCHER = ('Un archer tire trois flèches sur une cible. Les tirs sont indépendants et, à chaque'
          ' tir, il atteint la cible avec la probabilité $' + P + '$. On note $S$ l\'issue'
          ' « la flèche atteint la cible ».\n\n')
ARBRE = ('```probtree\n'
         + ''.join(
             f'{a}:{pa}\n'
             + ''.join(
                 f'  {b}:{pb}\n'
                 + ''.join(f'    {c}:{pc}\n' for c, pc in (('S', P), ('\\overline{S}', Q)))
                 for b, pb in (('S', P), ('\\overline{S}', Q)))
             for a, pa in (('S', P), ('\\overline{S}', Q)))
         + '```\n\n')

V345_TROIS = case(
    ARCHER + 'Quelle est la probabilité qu\'il atteigne la cible trois fois ? ' + REPONSE
    + '\n\n$P=?$',
    [K], ev('k^3/1000'),
    ['Les trois tirs sont indépendants : la probabilité de la liste $(S,S,S)$ est le produit'
     ' des probabilités de chaque tir.',
     '$P=' + P + '\\times' + P + '\\times' + P + '=' + P + '^3=' + col(evd('k^3/1000')) + '$.'])
V345_UNE = case(
    ARCHER + 'L\'arbre ci-dessous représente les trois tirs.\n\n' + ARBRE
    + 'Quelle est la probabilité qu\'il atteigne la cible exactement une fois ? ' + REPONSE
    + '\n\n$P=?$',
    [K], ev('3*k*(10-k)^2/1000'),
    ['Trois chemins réalisent « exactement une fois » : $(S,\\overline{S},\\overline{S})$,'
     ' $(\\overline{S},S,\\overline{S})$ et $(\\overline{S},\\overline{S},S)$.',
     'Chacun a la probabilité $' + P + '\\times' + Q + '^2=' + evd('k*(10-k)^2/1000') + '$.',
     'Donc $P=3\\times' + evd('k*(10-k)^2/1000') + '=' + col(evd('3*k*(10-k)^2/1000')) + '$.'])
V345_TROIS_EPREUVES = case(
    'On lance un dé équilibré à six faces, puis une pièce équilibrée, puis on tire au hasard'
    ' une boule dans une urne qui contient ' + ev('r') + ' boules rouges et ' + ev('n-r')
    + ' boules noires. Les trois épreuves sont indépendantes.\n\n'
    'Quelle est la probabilité d\'obtenir 6 avec le dé, « pile » avec la pièce et une boule'
    ' rouge ? Réponds par une fraction irréductible.\n\n$P=?$',
    [var('n', '5..10'), var('r', '1..{{eval:n-1}}')], ev('r/(12*n)'),
    ['Les probabilités sont $\\dfrac{1}{6}$ pour le dé, $\\dfrac{1}{2}$ pour la pièce et'
     ' $\\dfrac{' + ev('r') + '}{' + ev('n') + '}$ pour l\'urne.',
     'Les épreuves sont indépendantes : on multiplie, $P=\\dfrac{1}{6}\\times\\dfrac{1}{2}\\times'
     '\\dfrac{' + ev('r') + '}{' + ev('n') + '}=' + col(ev('r/(12*n)')) + '$.'])

MODELES.append(modele(
    '01-succession-d-epreuves-independantes', 'Succession de plusieurs épreuves indépendantes',
    'Trois tirs indépendants de probabilité p : trois succès (p³), exactement un succès'
    ' (3p(1 − p)², arbre à trois niveaux) ; dé, pièce et urne : probabilité d\'une liste',
    1,
    [V345_TROIS, V345_UNE, V345_TROIS_EPREUVES],
    [spec('0,343', 0, '0{,}343', 'correct', {'k': 7}),
     spec('En fraction', 0, '\\frac{343}{1000}', 'correct', {'k': 7}),
     spec('Erreur : 3p (2,1)', 0, '2{,}1', 'incorrect', {'k': 7}),
     spec('Erreur : p (0,7)', 0, '0{,}7', 'incorrect', {'k': 7}),
     spec('0,432', 1, '0{,}432', 'correct', {'k': 4}),
     spec('Erreur : un seul chemin (0,144)', 1, '0{,}144', 'incorrect', {'k': 4}),
     spec('Erreur : 3p(1 − p) (0,72)', 1, '0{,}72', 'incorrect', {'k': 4}),
     spec('1/32', 2, '\\frac{1}{32}', 'correct', {'n': 8, 'r': 3}),
     spec('Erreur : 3/8 (urne seule)', 2, '\\frac{3}{8}', 'incorrect', {'n': 8, 'r': 3}),
     spec('Erreur : 3/96 non simplifiée', 2, '\\frac{3}{96}', 'unoptimal_form', {'n': 8, 'r': 3},
          ['reducedFractions'])]))

# --- 2. 1SPE-346 : marche aléatoire -----------------------------------------------------------

PION = ('Un pion part de l\'origine $O$ d\'une droite graduée. À chaque étape, il avance de 1'
        ' avec la probabilité $' + P + '$ et recule de 1 sinon ; les étapes sont'
        ' indépendantes.\n\n')

V346_TROIS = case(
    PION + 'Quelle est la probabilité que le pion soit au point d\'abscisse 3 après trois'
    ' étapes ? ' + REPONSE + '\n\n$P=?$',
    [K], ev('k^3/1000'),
    ['Pour être en 3 après trois étapes, le pion doit avancer trois fois : un seul chemin.',
     'Les étapes sont indépendantes : $P=' + P + '^3=' + col(evd('k^3/1000')) + '$.'])
V346_UN = case(
    PION + 'Quelle est la probabilité que le pion soit au point d\'abscisse 1 après trois'
    ' étapes ? ' + REPONSE + '\n\n$P=?$',
    [K], ev('3*k^2*(10-k)/1000'),
    ['Pour être en 1 après trois étapes, le pion avance deux fois et recule une fois.',
     'Le recul peut avoir lieu à la première, à la deuxième ou à la troisième étape : trois'
     ' chemins, chacun de probabilité $' + P + '^2\\times' + Q + '=' + evd('k^2*(10-k)/1000')
     + '$.',
     'Donc $P=3\\times' + evd('k^2*(10-k)/1000') + '=' + col(evd('3*k^2*(10-k)/1000')) + '$.'])
V346_RETOUR = case(
    PION + 'Quelle est la probabilité que le pion soit revenu en $O$ après deux étapes ? '
    + REPONSE + '\n\n$P=?$',
    [K], ev('2*k*(10-k)/100'),
    ['Pour revenir en $O$ en deux étapes, le pion avance puis recule, ou recule puis avance.',
     'Chaque chemin a la probabilité $' + P + '\\times' + Q + '=' + evd('k*(10-k)/100') + '$.',
     'Donc $P=2\\times' + evd('k*(10-k)/100') + '=' + col(evd('2*k*(10-k)/100')) + '$.'])

MODELES.append(modele(
    '02-marche-aleatoire', 'Marche aléatoire sur une droite graduée',
    'Pion qui avance de 1 avec la probabilité p, recule sinon : être en 3 après trois étapes'
    ' (p³), en 1 après trois étapes (3p²(1 − p)), revenu en O après deux étapes (2p(1 − p))',
    2,
    [V346_TROIS, V346_UN, V346_RETOUR],
    [spec('0,027', 0, '0{,}027', 'correct', {'k': 3}),
     spec('Erreur : 3p (0,9)', 0, '0{,}9', 'incorrect', {'k': 3}),
     spec('0,432', 1, '0{,}432', 'correct', {'k': 6}),
     spec('Erreur : un seul chemin (0,144)', 1, '0{,}144', 'incorrect', {'k': 6}),
     spec('0,42', 2, '0{,}42', 'correct', {'k': 3}),
     spec('Erreur : un seul chemin (0,21)', 2, '0{,}21', 'incorrect', {'k': 3}),
     spec('Erreur : p² + (1 − p)² (0,58)', 2, '0{,}58', 'incorrect', {'k': 3})]))

# --- 3. 1SPE-361 : la fonction x ↦ E((X − x)²) ---------------------------------------------------

LOI = [var('x1', '-4..4'), var('d1', '1..4'), var('d2', '1..4'),
       var('x2', '{{eval:x1+d1}}'), var('x3', '{{eval:x2+d2}}'),
       var('q1', '1..8'), var('q2', '1..{{eval:9-q1}}'), var('q3', '{{eval:10-q1-q2}}'),
       var('S', '{{eval:q1*(x1)+q2*(x2)+q3*(x3)}}'), var('m', '{{eval:S/10}}')]
TABLEAU = ('La loi de probabilité d\'une variable aléatoire $X$ est donnée par le tableau'
           ' suivant.\n\n'
           '| $x_k$ | ${{x1}}$ | ${{x2}}$ | ${{x3}}$ |\n|---|---|---|---|\n'
           '| $P(X=x_k)$ | ' + ' | '.join('$' + evd(q + '/10') + '$' for q in ('q1', 'q2', 'q3'))
           + ' |\n\n')
F = ('Pour tout réel $x$, on pose $f(x)=E\\left((X-x)^2\\right)$, l\'espérance de la variable'
     ' aléatoire $(X-x)^2$.\n\n')
ESPERANCE = ('$E(X)=' + evd('q1/10') + '\\times{{eval:x1;()}}+' + evd('q2/10') + '\\times{{eval:x2;()}}+'
             + evd('q3/10') + '\\times{{eval:x3;()}}=' + evd('m') + '$.')

V361_COEFFICIENT = case(
    TABLEAU + F + 'En développant $(X-x)^2$ et par linéarité de l\'espérance, $f(x)$ s\'écrit'
    ' $x^2+bx+c$. ' + REPONSE + '\n\n$b=?$',
    LOI, ev('-S/5'),
    ['$(X-x)^2=X^2-2xX+x^2$, donc, par linéarité, $f(x)=E(X^2)-2x\\,E(X)+x^2$ : $b=-2E(X)$.',
     ESPERANCE,
     'Donc $b=-2E(X)=' + col(evd('-S/5')) + '$.'],
    ['S != 0'])
V361_MINIMUM = case(
    TABLEAU + F + 'On admet que $f(x)=x^2-2E(X)\\,x+E(X^2)$. En quel réel $x$ la fonction $f$'
    ' atteint-elle son minimum ? ' + REPONSE + '\n\n$x=?$',
    LOI, ev('m'),
    ['$f$ est un polynôme du second degré de coefficient $1>0$ : son minimum est atteint en'
     ' $x=-\\dfrac{-2E(X)}{2}=E(X)$.',
     ESPERANCE,
     'Le minimum est atteint en $x=' + col(evd('m')) + '$.'])
V361_VALEUR = justification(
    'Soit $X$ une variable aléatoire. ' + F + 'On admet que $f(x)=x^2-2E(X)\\,x+E(X^2)$. Quelle est la valeur minimale de $f$ ?',
    [],
    '$V(X)$, la variance de $X$',
    ['$E(X)$, l\'espérance de $X$', '$E(X^2)$', '$0$'],
    ['Forme canonique : $f(x)=\\left(x-E(X)\\right)^2+E(X^2)-E(X)^2$.',
     'Or $E(X^2)-E(X)^2=V(X)$ (formule de König-Huygens), donc $f(x)=\\left(x-E(X)\\right)^2+V(X)$.',
     'Un carré est positif ou nul et vaut $0$ en $x=E(X)$ : la valeur minimale de $f$ est'
     ' $' + col('V(X)') + '$.'])
V361_PREUVE = ranger(
    'Soit $X$ une variable aléatoire. ' + F + 'On démontre que $f$ atteint son minimum en $E(X)$ et que ce minimum vaut $V(X)$.',
    ['Pour tout réel $x$, $(X-x)^2=X^2-2xX+x^2$.',
     'Par linéarité de l\'espérance, $f(x)=x^2-2E(X)\\,x+E(X^2)$.',
     'Forme canonique : $f(x)=\\left(x-E(X)\\right)^2+E(X^2)-E(X)^2=\\left(x-E(X)\\right)^2+V(X)$.',
     'Donc $f$ atteint son minimum en $x=E(X)$, et ce minimum vaut $V(X)$.'],
    ['On développe le carré, puis on passe à l\'espérance (linéarité) : $f$ est du second degré.',
     'Sa forme canonique fait apparaître $V(X)=E(X^2)-E(X)^2$ : le minimum, atteint en'
     ' $E(X)$, vaut $' + col('V(X)') + '$.'])

VARS_361 = {'x1': 1, 'd1': 1, 'd2': 2, 'q1': 2, 'q2': 5}   # x = 1, 2, 4 ; E(X) = 2,4

MODELES.append(modele(
    '03-fonction-esperance-de-x-moins-x-au-carre', 'Étudier la fonction x ↦ E((X − x)²)',
    'f(x) = E((X − x)²) = x² + bx + c : b = −2E(X), minimum atteint en E(X), valeur minimale'
    ' V(X) (case choix), démonstration (étapes à ranger)',
    2,
    [V361_COEFFICIENT, V361_MINIMUM, V361_VALEUR, V361_PREUVE],
    [spec('−4,8', 0, '-4{,}8', 'correct', VARS_361),
     spec('En fraction', 0, '-\\frac{24}{5}', 'correct', VARS_361),
     spec('Erreur : signe (4,8)', 0, '4{,}8', 'incorrect', VARS_361),
     spec('Erreur : −E(X) (−2,4)', 0, '-2{,}4', 'incorrect', VARS_361),
     spec('2,4', 1, '2{,}4', 'correct', VARS_361),
     spec('Erreur : −2,4', 1, '-2{,}4', 'incorrect', VARS_361),
     spec('Erreur : 4,8', 1, '4{,}8', 'incorrect', VARS_361)]
    + specs_choix(2, 'V(X)', ['E(X)', 'E(X²)', '0'])
    + ['RANGER:3']))


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
