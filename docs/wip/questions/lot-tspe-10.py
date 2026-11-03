"""Écrit les 3 modèles du lot 10 de la terminale spécialité (points oubliés relevés en fin de
chantier) dans scripts/questions/tspe-10/.

Phase 0 validée par David le 2026-11-03 (« tes recos ? » puis « go », journal
« docs/wip/questions-tspe-progress.md » § 19), un point par modèle :

| # | Point    | Titre                                         | Catégorie, niveau                                             |
| 1 | TSPE-455 | Lier la courbe de sin ou cos et le cercle     | Fonctions trigonométriques › Fonctions cosinus et sinus, 6    |
| 2 | TSPE-481 | Positivité et intégration des inégalités      | Calcul intégral › À savoir, 2                                 |
| 3 | TSPE-616 | Calculer avec des probabilités conditionnelles | Succession d'épreuves › Épreuves dépendantes, 3              |

M1 : les propositions sont quatre courbes, chacune avec un seul point P (aucune lettre ne trahit
la bonne réponse, l'affichage mélange l'ordre) ; distracteurs tous SUR la courbe : −x, π − x,
π/2 − x. M2 : comme le lot 8 (case choix, première proposition juste, v2 piège). M3 : réponse
décimale tapée ; P(B) n'est jamais demandé (617) ; pas de `cleanCoefficients` (il réécrit
P_A(B) en « P_A B »).

    python3 docs/wip/questions/lot-tspe-10.py scripts/questions/tspe-10
"""
import json
import os
import subprocess
import sys

DOSSIER = sys.argv[1]
MODELES = []


def spec(desc, vi, variables, answers, status):
    return {'description': desc, 'variationIndex': vi,
            'variables': {k: str(v) for k, v in variables.items()},
            'answers': answers if isinstance(answers, list) else [answers],
            'expected': {'status': status}}


def var(nom, expression):
    return {'name': nom, 'expression': expression}


def variation(statement, variables, answers, steps, conditions=None):
    v = {'statement': statement, 'variables': variables,
         'blanks': [{'expectedAnswer': a} for a in answers],
         'correction': {'steps': steps}}
    if conditions:
        v['conditions'] = conditions
    return v


def col(x):
    return '\\textcolor{{{color:primary.0}}}{' + x + '}'


def ev(x):
    return '{{eval:' + x + '}}'


def evd(x):
    return '{{eval:' + x + ';d}}'


def par(nom, table):
    """Une valeur par valeur de la variable (ifs à plat, jamais imbriqués)."""
    return ''.join('{{if:' + nom + '==' + str(k) + '|' + v + '}}' for k, v in table.items())


# --- 1. TSPE-455 : lier la courbe de sin ou cos et le cercle -----------------------------------

# x = p·π/6, p ∈ {1, 2, 4, 5} : −x, π − x et π/2 − x restent dans [−π ; π] et sont distincts.
P_X = [1, 2, 4, 5]
FRAC = {1: '\\dfrac{\\pi}{6}', 2: '\\dfrac{\\pi}{3}', 4: '\\dfrac{2\\pi}{3}', 5: '\\dfrac{5\\pi}{6}'}
TX = par('p', FRAC)


def courbe(fonction, abscisse, description):
    return ('```courbe\n  x: -pi ; pi\n  y: -1.5 ; 1.5\n  grille: pi/6 ; 0.5\n'
            '  f(x) = ' + fonction + '(x)   bleu\n'
            '  points: P(' + abscisse + ' ; f(' + abscisse + '))\n'
            '  taille: petite\n  description: ' + description + '\n  ```')


def choix_courbes(fonction, abscisses):
    nom = 'sinus' if fonction == 'sin' else 'cosinus'
    items = [courbe(fonction, a, 'Courbe de la fonction ' + nom + ' entre −π et π, avec un point P'
                    ' marqué sur la courbe.') for a in abscisses]
    return '\n\n````choix\n' + ''.join('- ' + i + '\n' for i in items) + '````'


ABSCISSES = ['{{p}}*pi/6', '{{eval:-p}}*pi/6', '{{eval:6-p}}*pi/6', '{{eval:3-p}}*pi/6']
# Angle écrit simplifié : « {{p}}*pi/6 » s'affiche « 2π/6 » sur le cercle.
ANGLE = par('p', {1: 'pi/6', 2: 'pi/3', 4: '2*pi/3', 5: '5*pi/6'})
CERCLE = '\n\n```trig\npreset: custom\nangles: ' + ANGLE + '\nprojections: true\n```'


def v455(fonction):
    nom, coord, autre = (('sinus', 'ordonnée', 'abscisse') if fonction == 'sin'
                         else ('cosinus', 'abscisse', 'ordonnée'))
    piege, faux = (('$\\pi-x$ a le même sinus que $x$', '$\\pi-x$') if fonction == 'sin'
                   else ('$-x$ a le même cosinus que $x$', '$-x$'))
    return variation(
        'Le point $M$ du cercle trigonométrique est associé au réel $x=' + TX + '$.' + CERCLE
        + '\n\nSur quelle figure le point $P$ de la courbe de la fonction ' + nom + ' correspond-il'
        ' au point $M$ ?' + choix_courbes(fonction, ABSCISSES),
        [var('p', '|'.join(str(p) for p in P_X))], ['0'],
        ['Le ' + nom + ' de $x$ est l\'' + coord + ' du point $M$ du cercle associé à $x$.',
         'Le point de la courbe qui correspond à $M$ a donc pour abscisse $x=' + TX + '$ et pour'
         ' ordonnée $\\' + fonction + '(x)$ : c\'est le point $' + col('P\\left(' + TX + '\\,;\\'
                                                                    + fonction + ' x\\right)') + '$.',
         'Attention : ' + piege + ', mais le point de la courbe d\'abscisse ' + faux + ' ne'
         ' correspond pas à $M$ ; et l\'' + autre + ' de $M$ donne l\'autre fonction.'])


V455_SIN = v455('sin')
V455_COS = v455('cos')

# Signe de cos x lu sur le cercle : p·π/6, p hors de {0, 3, 6, 9}.
P_SIGNE = [1, 2, 4, 5, 7, 8, 10, 11]
CHOIX_SIGNE = ('\n\n```choix\n- au-dessus de l\'axe des abscisses\n- en dessous de l\'axe des'
               ' abscisses\n- sur l\'axe des abscisses\n- on ne peut pas savoir sans calculatrice\n```')
SIGNE = {p: ('0' if p in (1, 2, 10, 11) else '1') for p in P_SIGNE}
TEXTE_SIGNE = {p: ('positive' if SIGNE[p] == '0' else 'négative') for p in P_SIGNE}
POSITION = {p: ('au-dessus' if SIGNE[p] == '0' else 'en dessous') for p in P_SIGNE}
V455_SIGNE = variation(
    'Le point $M$ du cercle trigonométrique est associé au réel $x$.'
    '\n\n```trig\npreset: all\nlabels: false\npoints: M = {{p}}*pi/6\n```'
    '\n\nSur la courbe de la fonction cosinus, le point d\'abscisse $x$ est :' + CHOIX_SIGNE,
    [var('p', '|'.join(str(p) for p in P_SIGNE))], [par('p', SIGNE)],
    ['$\\cos x$ est l\'**abscisse** du point $M$ : elle est ' + par('p', TEXTE_SIGNE)
     + ', car $M$ est ' + par('p', {p: ('à droite' if SIGNE[p] == '0' else 'à gauche')
                                   for p in P_SIGNE}) + ' de l\'axe des ordonnées.',
     'Le point de la courbe de cosinus d\'abscisse $x$ a pour ordonnée $\\cos x$ : il est $'
     + col('\\text{' + par('p', POSITION) + '}') + '$ de l\'axe des abscisses.',
     'L\'ordonnée de $M$, elle, est $\\sin x$ : elle ne dit rien du signe de $\\cos x$.'])

SPECS_455 = []
for vi in (0, 1):
    SPECS_455 += [spec('Point (x ; f(x)), p = 2', vi, {'p': 2}, '0', 'correct'),
                  spec('Erreur : −x', vi, {'p': 2}, '1', 'incorrect'),
                  spec('Erreur : π − x', vi, {'p': 2}, '2', 'incorrect'),
                  spec('Erreur : π/2 − x (sin et cos confondus)', vi, {'p': 2}, '3', 'incorrect')]
SPECS_455 += [spec('p = 1 : au-dessus', 2, {'p': 1}, '0', 'correct'),
              spec('Erreur p = 1 : en dessous', 2, {'p': 1}, '1', 'incorrect'),
              spec('p = 4 : en dessous (sin x > 0 mais cos x < 0)', 2, {'p': 4}, '1', 'correct'),
              spec('Erreur p = 4 : ordonnée lue', 2, {'p': 4}, '0', 'incorrect'),
              spec('p = 11 : au-dessus', 2, {'p': 11}, '0', 'correct'),
              spec('Erreur : sur l\'axe', 2, {'p': 11}, '2', 'incorrect'),
              spec('Erreur : on ne peut pas savoir', 2, {'p': 7}, '3', 'incorrect')]

MODELES.append(('01-courbe-et-cercle', {
    'title': 'Lier la courbe de sinus ou cosinus et le cercle',
    'description': 'Point M du cercle associé à x → point (x ; sin x) ou (x ; cos x) de la courbe'
                   ' (distracteurs −x, π − x, π/2 − x, tous sur la courbe) ; signe de cos x lu sur'
                   ' le quadrant de M → position du point de la courbe',
    'grades': ['T_SPE'], 'theme': 'Fonctions', 'domain': 'Fonctions trigonométriques',
    'subdomain': 'Fonctions cosinus et sinus', 'level': 6, 'delay': 60, 'status': 'draft',
    'shared': {}, 'variations': [V455_SIN, V455_COS, V455_SIGNE], 'testSpecs': SPECS_455}))

# --- 2. TSPE-481 : positivité et intégration des inégalités (à savoir) -------------------------

AB = '[a\\,;b]'
INT_F = '\\displaystyle\\int_a^bf(x)\\,\\mathrm{d}x'
INT_G = '\\displaystyle\\int_a^bg(x)\\,\\mathrm{d}x'


def choix(lignes):
    return '\n\n```choix\n' + ''.join('- ' + l + '\n' for l in lignes) + '```'


def qcm(statement, bonne, autres, steps):
    assert len(autres) == 3
    return {'statement': statement + choix([bonne] + autres), 'variables': [],
            'blanks': [{'expectedAnswer': '0'}], 'correction': {'steps': steps}}


V481_POSITIVITE = qcm(
    'Soit $f$ une fonction continue sur $' + AB + '$, avec $a\\leqslant b$. Si $f(x)\\geqslant 0$'
    ' pour tout $x$ de $' + AB + '$, alors :',
    '$' + INT_F + '\\geqslant 0$',
    ['$' + INT_F + '\\leqslant 0$', '$' + INT_F + '=0$', 'on ne peut rien conclure'],
    ['À connaître (positivité) : si $f$ est continue et positive sur $' + AB + '$, avec $a\\leqslant'
     ' b$, alors $' + col(INT_F + '\\geqslant 0') + '$.',
     'Pour $f$ positive, l\'intégrale est l\'aire du domaine entre la courbe, l\'axe des abscisses et'
     ' les droites $x=a$ et $x=b$ : une aire est positive.'])
V481_INEGALITES = qcm(
    'Soient $f$ et $g$ deux fonctions continues sur $' + AB + '$, avec $a\\leqslant b$. Si'
    ' $f(x)\\leqslant g(x)$ pour tout $x$ de $' + AB + '$, alors :',
    '$' + INT_F + '\\leqslant' + INT_G + '$',
    ['$' + INT_F + '\\geqslant' + INT_G + '$',
     '$\\displaystyle\\int_a^b\\big(f(x)-g(x)\\big)\\,\\mathrm{d}x\\geqslant 0$',
     'on ne peut rien conclure'],
    ['À connaître (intégration des inégalités) : si $f\\leqslant g$ sur $' + AB + '$, avec'
     ' $a\\leqslant b$, alors $' + col(INT_F + '\\leqslant' + INT_G) + '$.',
     'Preuve : $g-f\\geqslant 0$ sur $' + AB + '$, donc par positivité $\\displaystyle\\int_a^b'
     '\\big(g(x)-f(x)\\big)\\,\\mathrm{d}x\\geqslant 0$, puis on utilise la linéarité. C\'est'
     ' l\'intégrale de $f-g$ qui est négative, pas positive.'])
V481_BORNES = qcm(
    'Soit $f$ une fonction continue sur $[0\\,;3]$, avec $f(x)\\geqslant 0$ pour tout $x$ de'
    ' $[0\\,;3]$. Alors :',
    '$\\displaystyle\\int_3^0f(x)\\,\\mathrm{d}x\\leqslant 0$',
    ['$\\displaystyle\\int_3^0f(x)\\,\\mathrm{d}x\\geqslant 0$',
     '$\\displaystyle\\int_3^0f(x)\\,\\mathrm{d}x=0$',
     'on ne peut rien conclure'],
    ['La positivité demande des bornes dans l\'ordre croissant : ici la borne du bas ($3$) est plus'
     ' grande que celle du haut ($0$).',
     'Or $\\displaystyle\\int_3^0f(x)\\,\\mathrm{d}x=-\\int_0^3f(x)\\,\\mathrm{d}x$, et'
     ' $\\displaystyle\\int_0^3f(x)\\,\\mathrm{d}x\\geqslant 0$ par positivité, donc $'
     + col('\\displaystyle\\int_3^0f(x)\\,\\mathrm{d}x\\leqslant 0') + '$.'])

SPECS_481 = []
for vi, (juste, erreurs) in enumerate([
        ('∫ f ⩾ 0', ['∫ f ⩽ 0', '∫ f = 0', 'rien']),
        ('∫ f ⩽ ∫ g', ['sens inversé', '∫ (f − g) ⩾ 0', 'rien']),
        ('∫₃⁰ f ⩽ 0', ['positivité sans regarder les bornes', '= 0', 'rien'])]):
    SPECS_481.append(spec(juste, vi, {}, '0', 'correct'))
    for k, erreur in enumerate(erreurs, start=1):
        SPECS_481.append(spec('Erreur : ' + erreur, vi, {}, str(k), 'incorrect'))

MODELES.append(('02-positivite-et-inegalites', {
    'title': 'Positivité et intégration des inégalités',
    'description': 'À savoir : f ⩾ 0 sur [a ; b], a ⩽ b ⇒ ∫ f ⩾ 0 ; f ⩽ g ⇒ ∫ f ⩽ ∫ g ; piège :'
                   ' bornes dans l\'ordre décroissant, ∫₃⁰ f ⩽ 0',
    'grades': ['T_SPE'], 'theme': 'Intégration', 'domain': 'Calcul intégral',
    'subdomain': 'À savoir', 'level': 2, 'delay': 30, 'status': 'draft', 'shared': {},
    'variations': [V481_POSITIVITE, V481_INEGALITES, V481_BORNES], 'testSpecs': SPECS_481}))

# --- 3. TSPE-616 : calculer avec des probabilités conditionnelles -------------------------------

CONSIGNE = 'Réponds par une fraction irréductible ou par un nombre décimal exact.'


def bar(x):
    return '\\overline{' + x + '}'


ARBRE = ('\n\n```probtree\nA:' + evd('a/10') + '\n  B:' + evd('b/10') + '\n  ' + bar('B') + ':'
         + evd('1-b/10') + '\n' + bar('A') + ':' + evd('1-a/10') + '\n  B:' + evd('c/10') + '\n  '
         + bar('B') + ':' + evd('1-c/10') + '\n```')
VARS = [var('a', '2..8'), var('b', '1..9'), var('c', '1..9')]
COND = ['b != c']
DONNEES = ('$P(A)=' + evd('a/10') + '$, $P_A(B)=' + evd('b/10') + '$ et $P_{' + bar('A') + '}(B)='
           + evd('c/10') + '$')
ENONCE = ('On choisit au hasard un élève d\'un lycée. On note $A$ l\'événement « l\'élève est'
          ' demi-pensionnaire » et $B$ l\'événement « l\'élève vient au lycée en bus ». On sait'
          ' que ' + DONNEES + '.')

V616_AB = variation(
    ENONCE + ' L\'arbre pondéré ci-dessous représente la situation.' + ARBRE + '\n\n' + CONSIGNE
    + '\n\n$P(A\\cap B)=?$',
    VARS, [ev('a*b/100')],
    ['On suit le chemin $A$ puis $B$ : $P(A\\cap B)=P(A)\\times P_A(B)$ (la probabilité d\'un chemin'
     ' est le produit des probabilités de ses branches).',
     '$P(A\\cap B)=' + evd('a/10') + '\\times' + evd('b/10') + '=' + col(evd('a*b/100')) + '$.'],
    COND)
V616_NON_A_NON_B = variation(
    ENONCE + '\n\n' + CONSIGNE + '\n\nProbabilité que l\'élève ne soit pas demi-pensionnaire et ne'
    ' vienne pas en bus : $P(' + bar('A') + '\\cap' + bar('B') + ')=?$',
    VARS, [ev('(10-a)*(10-c)/100')],
    ['On complète l\'arbre : $P(' + bar('A') + ')=1-' + evd('a/10') + '=' + evd('1-a/10')
     + '$ et $P_{' + bar('A') + '}(' + bar('B') + ')=1-' + evd('c/10') + '=' + evd('1-c/10') + '$.'
     + ARBRE,
     '$P(' + bar('A') + '\\cap' + bar('B') + ')=P(' + bar('A') + ')\\times P_{' + bar('A') + '}('
     + bar('B') + ')=' + evd('1-a/10') + '\\times' + evd('1-c/10') + '='
     + col(evd('(10-a)*(10-c)/100')) + '$.'],
    COND)
V616_A_NON_B = variation(
    ENONCE + '\n\n' + CONSIGNE + '\n\nProbabilité que l\'élève soit demi-pensionnaire et ne vienne'
    ' pas en bus : $P(A\\cap' + bar('B') + ')=?$',
    VARS, [ev('a*(10-b)/100')],
    ['Sachant $A$, les événements $B$ et $' + bar('B') + '$ sont contraires : $P_A(' + bar('B')
     + ')=1-P_A(B)=1-' + evd('b/10') + '=' + evd('1-b/10') + '$.' + ARBRE,
     '$P(A\\cap' + bar('B') + ')=P(A)\\times P_A(' + bar('B') + ')=' + evd('a/10') + '\\times'
     + evd('1-b/10') + '=' + col(evd('a*(10-b)/100')) + '$.'],
    COND)

V = {'a': 6, 'b': 3, 'c': 7}
SPECS_616 = [
    spec('0,6 × 0,3 = 0,18', 0, V, '0{,}18', 'correct'),
    spec('En fraction', 0, V, '\\frac{9}{50}', 'correct'),
    spec('Erreur : P_A(B) seul', 0, V, '0{,}3', 'incorrect'),
    spec('Erreur : somme', 0, V, '0{,}9', 'incorrect'),
    spec('0,4 × 0,3 = 0,12', 1, V, '0{,}12', 'correct'),
    spec('Erreur : P_Ā(B) au lieu du complément', 1, V, '0{,}28', 'incorrect'),
    spec('Erreur : 1 − P(A ∩ B)', 1, V, '0{,}82', 'incorrect'),
    spec('0,6 × 0,7 = 0,42', 2, V, '0{,}42', 'correct'),
    spec('Erreur : P(A ∩ B)', 2, V, '0{,}18', 'incorrect'),
    spec('Erreur : P_A(B̄) seul', 2, V, '0{,}7', 'incorrect')]

MODELES.append(('03-probabilite-conditionnelle-intersection', {
    'title': 'Calculer avec des probabilités conditionnelles',
    'description': 'Arbre à deux épreuves dépendantes (P(A), P_A(B), P_Ā(B) donnés) : P(A ∩ B),'
                   ' P(Ā ∩ B̄), P(A ∩ B̄) par P(A) × P_A(B) ; branches à compléter (événement'
                   ' contraire) ; jamais P(B) (probabilités totales, TSPE-617)',
    'grades': ['T_SPE'], 'theme': 'Probabilités', 'domain': 'Succession d\'épreuves',
    'subdomain': 'Épreuves dépendantes', 'level': 3, 'delay': 90, 'status': 'draft',
    'shared': {'blankDefaults': {'acceptDecimal': True}},
    'variations': [V616_AB, V616_NON_A_NON_B, V616_A_NON_B], 'testSpecs': SPECS_616}))

os.makedirs(DOSSIER, exist_ok=True)
for nom, m in MODELES:
    with open(os.path.join(DOSSIER, nom + '.json'), 'w', encoding='utf-8') as f:
        json.dump(m, f, ensure_ascii=False, indent='\t')
        f.write('\n')
subprocess.run(['pnpm', 'exec', 'prettier', '--write', DOSSIER], check=True,
               stdout=subprocess.DEVNULL)
print(f'{len(MODELES)} modèles écrits dans {DOSSIER}')
