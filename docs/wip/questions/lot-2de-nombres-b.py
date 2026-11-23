"""Écrit les 13 modèles du lot B (fractions et arithmétique, Seconde) dans
scripts/questions/2de-nombres-b/ (chantier `ensembles-2de`).

    python3 docs/wip/questions/lot-2de-nombres-b.py scripts/questions/2de-nombres-b

Conception validée par David (titres, points, niveaux, contenu) ; le point visé est noté en
commentaire au-dessus de chaque modèle (le tag est posé par la migration de rangement).

Décisions et pièges :
- fractions : réponse attendue irréductible ; une fraction juste non simplifiée est « perfectible »
  (`unoptimal_form`, contrainte `reducedFractions`, réglage par défaut) ; numérateur et dénominateur
  bruts (`X`, `Y`) réduits par `g = gcd(|X|, Y)` en `N / D` ; signe écrit devant la fraction ;
- modèle 4 (entier + fraction < 1) : DEUX cases, l'entier puis la fraction, et
  `reducedFractions: off` (3 + 4/10 juste). Une case unique avec un motif
  `n:integer + a:integer/b:integer` acceptait 2 + 7/5 (le motif ne sait pas dire « a < b ») ;
- modèle 12 (décomposition) : cases positionnelles, facteurs « du plus petit au plus grand ».
  `options.orderIndependent` est refusé par une case choix (variation « premier ? » du même
  modèle) ; une case unique `2^2\\times3\\times7` ne sait pas refuser `4\\times21` ;
- nombres de 4 chiffres (modèles 9, 11) : `spacesFromFourDigits` (affichage `2 340`) ;
- jamais de variable `e` ni `i` ; décimaux par `{{eval:…;d}}` ;
- les choix d'une case choix sont jugés sur leurs indices d'origine (`melanger: non`).
"""
import json
import sys

DOSSIER = sys.argv[1]

# --- Outils -------------------------------------------------------------------------------------


def spec(desc, vi, variables, answers, status, violations=None):
    s = {'description': desc, 'variationIndex': vi,
         'variables': {k: str(v) for k, v in variables.items()},
         'answers': answers if isinstance(answers, list) else [answers],
         'expected': {'status': status}}
    if violations:
        s['expected']['constraintViolations'] = violations
    return s


def modele(title, description, level, delay, variations, specs, options=None, shared=None):
    m = {'title': title, 'description': description, 'grades': ['2'], 'level': level,
         'delay': delay, 'status': 'draft'}
    if options:
        m['options'] = options
    if shared:
        m['shared'] = shared
    m['variations'] = variations
    m['testSpecs'] = specs
    return m


def var(nom, expression):
    return {'name': nom, 'expression': expression}


def variation(statement, variables, answers, steps, conditions=None):
    v = {'statement': statement, 'variables': variables}
    if conditions:
        v['conditions'] = conditions
    v['blanks'] = [a if isinstance(a, dict) else {'expectedAnswer': a} for a in answers]
    v['correction'] = {'steps': steps}
    return v


def col(x):
    return '\\textcolor{{{color:primary.0}}}{' + x + '}'


def v(nom):
    return '{{' + nom + '}}'


def ev(x):
    return '{{eval:' + x + '}}'


def fr(num, den, d=True):
    return ('\\dfrac{ ' if d else '\\frac{ ') + num + ' }{ ' + den + ' }'


def sfr(N, D, d=True):
    """Fraction signée N/D (variables), signe devant : -\\dfrac{1}{12}."""
    return '{{if:' + N + '<0|-}}' + fr(ev('abs(' + N + ')'), v(D), d)


def sfr_int(N, D, d=True):
    """Comme sfr, mais un entier si D = 1."""
    return '{{if:' + D + '==1|' + v(N) + '|' + sfr(N, D, d) + '}}'


def reduire(X, Y, g='g', N='N', D='D'):
    """Variables de réduction de X / Y (Y > 0)."""
    return [var(g, 'eval:gcd(abs(' + X + '),' + Y + ')'), var(N, 'eval:(' + X + ')/(' + g + ')'),
            var(D, 'eval:(' + Y + ')/(' + g + ')')]


def simplif(X, Y, g='g', N='N', D='D', entier=False):
    """Étape finale : simplification par g, ou fraction déjà irréductible."""
    fin = (sfr_int if entier else sfr)(N, D)
    return ('{{if:' + g + '>1|On simplifie par $' + v(g) + '$ : $' + sfr(X, Y) + '=' + col(fin)
            + '$.|Le résultat $' + col(fin) + '$ ne se simplifie pas.}}')


def signe(s):
    return '{{if:' + s + '==0|+|-}}'


def prenom(w, noms):
    texte = noms[-1]
    for k in range(len(noms) - 2, -1, -1):
        texte = '{{if:' + w + '==' + str(k) + '|' + noms[k] + '|' + texte + '}}'
    return texte


IRR = 'Donne le résultat sous la forme d\'une fraction irréductible.'
MEME_DEN = ('Pour additionner ou soustraire des fractions, on les écrit d\'abord avec le **même'
            ' dénominateur**.')
REDUCED = ['reducedFractions']

MODELES = {}

# =================================================================================================
# 1. Somme et différence de fractions — point 2-272, niveau 2
# =================================================================================================


def m1_multiples():
    vs = [var('b', '2..6'), var('k', '2..4'), var('d', 'eval:k*b'), var('a', '1..11'),
          var('c', '1..17'), var('s', '0|1'), var('A', 'eval:a*k'),
          var('X', 'eval:a*k+(1-2*s)*c'), var('Y', 'eval:d')] + reduire('X', 'Y')
    st = (IRR + '\n\n$' + fr(v('a'), v('b')) + signe('s') + fr(v('c'), v('d')) + '=?$')
    steps = [MEME_DEN + ' Ici $' + v('d') + '=' + v('b') + '\\times' + v('k') + '$ : on écrit $'
             + fr(v('a'), v('b')) + '$ avec le dénominateur $' + v('d') + '$.',
             '$$' + fr(v('a'), v('b')) + '=' + fr(v('a') + '\\times' + v('k'),
                                                  v('b') + '\\times' + v('k'))
             + '=' + fr(v('A'), v('d')) + '$$',
             '$$' + fr(v('A'), v('d')) + signe('s') + fr(v('c'), v('d')) + '='
             + fr(v('A') + signe('s') + v('c'), v('d')) + '=' + sfr('X', 'Y') + '$$',
             simplif('X', 'Y')]
    return variation(st, vs, [sfr('N', 'D', False)], steps,
                     ['gcd(a,b)==1', 'gcd(c,d)==1', 'a<2*b', 'c<2*d', 'D!=1'])


def m1_quelconques():
    vs = [var('b', '2..9'), var('d', '2..9'), var('L', 'eval:b*d/gcd(b,d)'),
          var('kb', 'eval:L/b'), var('kd', 'eval:L/d'), var('a', '1..9'), var('c', '1..9'),
          var('s', '0|1'), var('A', 'eval:a*kb'), var('C', 'eval:c*kd'),
          var('X', 'eval:a*kb+(1-2*s)*c*kd'), var('Y', 'eval:L')] + reduire('X', 'Y')
    st = (IRR + '\n\n$' + fr(v('a'), v('b')) + signe('s') + fr(v('c'), v('d')) + '=?$')
    steps = [MEME_DEN + ' Le plus petit multiple commun de $' + v('b') + '$ et $' + v('d')
             + '$ est $' + v('L') + '=' + v('b') + '\\times' + v('kb') + '=' + v('d') + '\\times'
             + v('kd') + '$.',
             '$$' + fr(v('a'), v('b')) + '=' + fr(v('a') + '\\times' + v('kb'),
                                                  v('b') + '\\times' + v('kb'))
             + '=' + fr(v('A'), v('L')) + '\\qquad' + fr(v('c'), v('d')) + '='
             + fr(v('c') + '\\times' + v('kd'), v('d') + '\\times' + v('kd')) + '='
             + fr(v('C'), v('L')) + '$$',
             '$$' + fr(v('A'), v('L')) + signe('s') + fr(v('C'), v('L')) + '='
             + fr(v('A') + signe('s') + v('C'), v('L')) + '=' + sfr('X', 'Y') + '$$',
             simplif('X', 'Y')]
    return variation(st, vs, [sfr('N', 'D', False)], steps,
                     ['mod(b,d)!=0', 'mod(d,b)!=0', 'gcd(a,b)==1', 'gcd(c,d)==1', 'D!=1'])


def m1_trois():
    vs = [var('b', '2|3'), var('d', '4|6'), var('h', '8|12'),
          var('L1', 'eval:b*d/gcd(b,d)'), var('L', 'eval:L1*h/gcd(L1,h)'),
          var('a', '1..7'), var('c', '1..7'), var('f', '1..11'),
          var('s', '0|1'), var('t', '0|1'),
          var('A', 'eval:a*L/b'), var('C', 'eval:c*L/d'), var('F', 'eval:f*L/h'),
          var('X', 'eval:a*L/b+(1-2*s)*c*L/d+(1-2*t)*f*L/h'), var('Y', 'eval:L')] \
        + reduire('X', 'Y')
    expr = (fr(v('a'), v('b')) + signe('s') + fr(v('c'), v('d')) + signe('t')
            + fr(v('f'), v('h')))
    st = IRR + '\n\n$' + expr + '=?$'
    steps = [MEME_DEN + ' Le plus petit multiple commun de $' + v('b') + '$, $' + v('d')
             + '$ et $' + v('h') + '$ est $' + v('L') + '$.',
             '$$' + expr + '=' + fr(v('A'), v('L')) + signe('s') + fr(v('C'), v('L'))
             + signe('t') + fr(v('F'), v('L')) + '$$',
             '$$=' + fr(v('A') + signe('s') + v('C') + signe('t') + v('F'), v('L')) + '='
             + sfr('X', 'Y') + '$$',
             simplif('X', 'Y')]
    return variation(st, vs, [sfr('N', 'D', False)], steps,
                     ['gcd(a,b)==1', 'gcd(c,d)==1', 'gcd(f,h)==1', 'D!=1'])


def m1_entier():
    vs = [var('n', '1..6'), var('a', '1..13'), var('b', '2..9'), var('s', '0|1'),
          var('B', 'eval:n*b'), var('X', 'eval:n*b+(1-2*s)*a'), var('Y', 'eval:b')] \
        + reduire('X', 'Y')
    st = IRR + '\n\n$' + v('n') + signe('s') + fr(v('a'), v('b')) + '=?$'
    steps = ['Un entier s\'écrit comme une fraction de dénominateur $' + v('b') + '$ : $'
             + v('n') + '=' + fr(v('n') + '\\times' + v('b'), v('b')) + '=' + fr(v('B'), v('b'))
             + '$.',
             '$$' + v('n') + signe('s') + fr(v('a'), v('b')) + '=' + fr(v('B'), v('b'))
             + signe('s') + fr(v('a'), v('b')) + '=' + fr(v('B') + signe('s') + v('a'), v('b'))
             + '=' + sfr('X', 'Y') + '$$',
             simplif('X', 'Y')]
    return variation(st, vs, [sfr('N', 'D', False)], steps, ['gcd(a,b)==1'])


MODELES['01-somme-difference-fractions'] = modele(
    'Somme et différence de fractions',
    'Calculer a/b ± c/d en fraction irréductible : dénominateurs multiples, non multiples'
    ' (3/4 − 5/6 = −1/12), trois fractions, entier ± fraction (pièges : additionner numérateurs'
    ' et dénominateurs, oublier de simplifier, signe du résultat)',
    2, 90, [m1_multiples(), m1_quelconques(), m1_trois(), m1_entier()],
    [spec('3/4 + 5/12 = 7/6', 0, {'b': 4, 'k': 3, 'a': 3, 'c': 5, 's': 0}, '\\frac{7}{6}',
          'correct'),
     spec('Non simplifiée : 14/12', 0, {'b': 4, 'k': 3, 'a': 3, 'c': 5, 's': 0},
          '\\frac{14}{12}', 'unoptimal_form', REDUCED),
     spec('Erreur : numérateurs et dénominateurs additionnés (8/16)', 0,
          {'b': 4, 'k': 3, 'a': 3, 'c': 5, 's': 0}, '\\frac{8}{16}', 'incorrect'),
     spec('3/4 − 5/6 = −1/12', 1, {'b': 4, 'd': 6, 'a': 3, 'c': 5, 's': 1}, '-\\frac{1}{12}',
          'correct'),
     spec('Erreur de signe : 1/12', 1, {'b': 4, 'd': 6, 'a': 3, 'c': 5, 's': 1},
          '\\frac{1}{12}', 'incorrect'),
     spec('Erreur : numérateurs et dénominateurs soustraits (−2/−2)', 1,
          {'b': 4, 'd': 6, 'a': 3, 'c': 5, 's': 1}, '1', 'incorrect'),
     spec('Dénominateur 24 non simplifié : −2/24', 1, {'b': 4, 'd': 6, 'a': 3, 'c': 5, 's': 1},
          '-\\frac{2}{24}', 'unoptimal_form', REDUCED),
     spec('1/2 + 3/4 − 5/8 = 5/8', 2,
          {'b': 2, 'd': 4, 'h': 8, 'a': 1, 'c': 3, 'f': 5, 's': 0, 't': 1}, '\\frac{5}{8}',
          'correct'),
     spec('Erreur : (1 + 3 − 5)/(2 + 4 + 8) = −1/14', 2,
          {'b': 2, 'd': 4, 'h': 8, 'a': 1, 'c': 3, 'f': 5, 's': 0, 't': 1}, '-\\frac{1}{14}',
          'incorrect'),
     spec('2/3 − 1/6 + 5/12 = 11/12', 2,
          {'b': 3, 'd': 6, 'h': 12, 'a': 2, 'c': 1, 'f': 5, 's': 1, 't': 0}, '\\frac{11}{12}',
          'correct'),
     spec('2 + 3/5 = 13/5', 3, {'n': 2, 'a': 3, 'b': 5, 's': 0}, '\\frac{13}{5}', 'correct'),
     spec('Erreur : 2 ajouté au numérateur (5/5)', 3, {'n': 2, 'a': 3, 'b': 5, 's': 0},
          '\\frac{5}{5}', 'incorrect'),
     spec('2 − 7/3 = −1/3', 3, {'n': 2, 'a': 7, 'b': 3, 's': 1}, '-\\frac{1}{3}', 'correct')])

# =================================================================================================
# 2. Produit de fractions, en simplifiant avant — point 2-272, niveau 3
# =================================================================================================
# a/b × c/d avec a = p·u, d = p·w, c = q·v, b = q·t : on simplifie par p et q avant de
# multiplier. p, q ∈ {3, 5, 7}, u, v ∈ {1, 2, 4}, t, w ∈ {1, 3, 5, 7} (tirage qui aboutit).


def facteurs(x, y):
    """« x × y », sans « × 1 »."""
    return v(x) + '{{if:' + y + '>1|\\times' + v(y) + '}}'


def reste(x, y):
    """Produit x × y des facteurs restants, sans « × 1 » (x et y ne valent pas 1 ensemble
    au dénominateur : t·w > 1 ; au numérateur, 1 × 1 s'écrit 1)."""
    return ('{{if:' + x + '==1|' + v(y) + '|{{if:' + y + '==1|' + v(x) + '|' + v(x) + '\\times'
            + v(y) + '}}}}')


def m2_produit(negatif):
    vs = [var('p', '3|5|7'), var('q', '3|5|7'), var('u', '1|2|4'), var('v', '1|2|4'),
          var('t', '1|3|5|7'), var('w', '1|3|5|7'),
          var('a', 'eval:p*u'), var('b', 'eval:q*t'), var('c', 'eval:q*v'), var('d', 'eval:p*w'),
          var('N', 'eval:u*v'), var('D', 'eval:t*w')]
    deux = fr(v('c'), v('d'))
    expr = (fr(v('a'), v('b')) + '\\times' + ('\\left(-' + deux + '\\right)' if negatif else deux))
    moins = '-' if negatif else ''
    st = IRR + '\n\n$' + expr + '=?$'
    steps = ['On ne multiplie pas tout de suite : on décompose pour repérer les facteurs'
             ' communs.',
             '$$' + expr + '=' + moins + fr(facteurs('p', 'u') + '\\times' + facteurs('q', 'v'),
                                            facteurs('q', 't') + '\\times' + facteurs('p', 'w'))
             + '$$',
             'On simplifie par $' + v('p') + '$ et par $' + v('q') + '$'
             + (' (un seul signe moins : le produit est négatif)' if negatif else '') + ' :',
             '$$' + expr + '=' + moins + fr(reste('u', 'v'), reste('t', 'w')) + '='
             + col(moins + fr(v('N'), v('D'))) + '$$']
    ans = moins + fr(v('N'), v('D'), False)
    return variation(st, vs, [ans], steps,
                     ['p!=q', 'gcd(a,b)==1', 'gcd(c,d)==1', 'gcd(u*v,t*w)==1', 't*w>1'])


def m2_entier():
    vs = [var('q', '2|3|5|7'), var('u', '2..5'), var('t', '2..5'), var('a', '1..9'),
          var('n', 'eval:q*u'), var('b', 'eval:q*t'), var('N', 'eval:u*a'), var('D', 'eval:t')]
    expr = v('n') + '\\times' + fr(v('a'), v('b'))
    st = IRR + '\n\n$' + expr + '=?$'
    steps = ['On multiplie l\'entier par le numérateur seulement, mais on simplifie avant de'
             ' calculer :',
             '$$' + expr + '=' + fr(v('n') + '\\times' + v('a'), v('b')) + '='
             + fr(v('q') + '\\times' + v('u') + '\\times' + v('a'), v('q') + '\\times' + v('t'))
             + '$$',
             'On simplifie par $' + v('q') + '$ :',
             '$$' + expr + '=' + fr(v('u') + '\\times' + v('a'), v('t')) + '='
             + col(fr(v('N'), v('D'))) + '$$']
    return variation(st, vs, [fr(v('N'), v('D'), False)], steps,
                     ['gcd(a,b)==1', 'gcd(u*a,t)==1'])


SP2 = {'p': 7, 'u': 2, 'q': 5, 't': 3, 'v': 5, 'w': 3}
SP2B = {'p': 7, 'u': 2, 'q': 3, 't': 5, 'v': 1, 'w': 1}  # 14/15 × 3/7 = 2/5
MODELES['02-produit-fractions-simplifier-avant'] = modele(
    'Produit de fractions, en simplifiant avant',
    'Calculer un produit de fractions en simplifiant avant de multiplier (14/15 × 3/7 = 2/5),'
    ' avec un facteur négatif, puis entier × fraction (pièges : multiplier aussi le dénominateur'
    ' par l\'entier, ne pas simplifier)',
    3, 90, [m2_produit(False), m2_produit(True), m2_entier()],
    [spec('14/15 × 3/7 = 2/5', 0, SP2B, '\\frac{2}{5}', 'correct'),
     spec('Non simplifiée : 42/105', 0, SP2B, '\\frac{42}{105}', 'unoptimal_form', REDUCED),
     spec('Erreur : produit en croix 98/45', 0, SP2B, '\\frac{98}{45}', 'incorrect'),
     spec('14/15 × (−3/7) = −2/5', 1, SP2B, '-\\frac{2}{5}', 'correct'),
     spec('Erreur : signe oublié', 1, SP2B, '\\frac{2}{5}', 'incorrect'),
     spec('6 × 5/4 = 15/2', 2, {'q': 2, 'u': 3, 't': 2, 'a': 5}, '\\frac{15}{2}', 'correct'),
     spec('Erreur : 6 multiplie aussi le dénominateur (30/24)', 2,
          {'q': 2, 'u': 3, 't': 2, 'a': 5}, '\\frac{30}{24}', 'incorrect'),
     spec('Non simplifiée : 30/4', 2, {'q': 2, 'u': 3, 't': 2, 'a': 5}, '\\frac{30}{4}',
          'unoptimal_form', REDUCED)])

# =================================================================================================
# 3. Quotient de fractions — point 2-272, niveau 4
# =================================================================================================

INVERSE = 'Diviser par une fraction, c\'est multiplier par son **inverse**.'


def m3_fractions():
    vs = [var('a', '1..9'), var('b', '2..9'), var('c', '1..9'), var('d', '2..9'),
          var('X', 'eval:a*d'), var('Y', 'eval:b*c')] + reduire('X', 'Y')
    expr = fr(v('a'), v('b')) + '\\div' + fr(v('c'), v('d'))
    st = IRR + '\n\n$' + expr + '=?$'
    steps = [INVERSE + ' L\'inverse de $' + fr(v('c'), v('d')) + '$ est $' + fr(v('d'), v('c'))
             + '$.',
             '$$' + expr + '=' + fr(v('a'), v('b')) + '\\times' + fr(v('d'), v('c')) + '='
             + fr(v('a') + '\\times' + v('d'), v('b') + '\\times' + v('c')) + '='
             + fr(v('X'), v('Y')) + '$$',
             simplif('X', 'Y')]
    return variation(st, vs, [fr(v('N'), v('D'), False)], steps,
                     ['gcd(a,b)==1', 'gcd(c,d)==1', 'c>1', 'a*d!=b*c', 'D!=1'])


def m3_entier():
    vs = [var('n', '2..9'), var('a', '2..9'), var('b', '1..9'),
          var('X', 'eval:n*b'), var('Y', 'eval:a')] + reduire('X', 'Y')
    expr = v('n') + '\\div' + fr(v('a'), v('b'))
    st = IRR + '\n\n$' + expr + '=?$'
    steps = [INVERSE + ' L\'inverse de $' + fr(v('a'), v('b')) + '$ est $' + fr(v('b'), v('a'))
             + '$.',
             '$$' + expr + '=' + v('n') + '\\times' + fr(v('b'), v('a')) + '='
             + fr(v('n') + '\\times' + v('b'), v('a')) + '=' + fr(v('X'), v('Y')) + '$$',
             simplif('X', 'Y')]
    return variation(st, vs, [fr(v('N'), v('D'), False)], steps,
                     ['gcd(a,b)==1', 'b<a+4', 'D!=1'])


def m3_partie():
    vs = [var('k', '2|3|4'), var('a', '1..11'), var('b', '2..9'),
          var('X', 'eval:a'), var('Y', 'eval:b*k')] + reduire('X', 'Y')
    nom = '{{if:k==2|la moitié|{{if:k==3|le tiers|le quart}}}}'
    st = IRR + '\n\nCalcule ' + nom + ' de $' + fr(v('a'), v('b')) + '$.\n\n$$?$$'
    steps = ['Prendre ' + nom + ' d\'un nombre, c\'est le diviser par $' + v('k')
             + '$, c\'est-à-dire le multiplier par $' + fr('1', v('k')) + '$.',
             '$$' + fr(v('a'), v('b')) + '\\div' + v('k') + '=' + fr(v('a'), v('b')) + '\\times'
             + fr('1', v('k')) + '=' + fr(v('a'), v('b') + '\\times' + v('k')) + '='
             + fr(v('X'), v('Y')) + '$$',
             simplif('X', 'Y')]
    return variation(st, vs, [fr(v('N'), v('D'), False)], steps, ['gcd(a,b)==1'])


MODELES['03-quotient-fractions'] = modele(
    'Quotient de fractions',
    'Diviser par une fraction en multipliant par son inverse : 3/4 ÷ 9/8 = 2/3, 5 ÷ 2/3 = 15/2,'
    ' la moitié de 7/3 = 7/6 (pièges : inverser la mauvaise fraction, multiplier au lieu de'
    ' diviser)',
    4, 90, [m3_fractions(), m3_entier(), m3_partie()],
    [spec('3/4 ÷ 9/8 = 2/3', 0, {'a': 3, 'b': 4, 'c': 9, 'd': 8}, '\\frac{2}{3}', 'correct'),
     spec('Erreur : la première fraction inversée (3/2)', 0, {'a': 3, 'b': 4, 'c': 9, 'd': 8},
          '\\frac{3}{2}', 'incorrect'),
     spec('Erreur : multiplication (27/32)', 0, {'a': 3, 'b': 4, 'c': 9, 'd': 8},
          '\\frac{27}{32}', 'incorrect'),
     spec('Non simplifiée : 24/36', 0, {'a': 3, 'b': 4, 'c': 9, 'd': 8}, '\\frac{24}{36}',
          'unoptimal_form', REDUCED),
     spec('5 ÷ 2/3 = 15/2', 1, {'n': 5, 'a': 2, 'b': 3}, '\\frac{15}{2}', 'correct'),
     spec('Erreur : 5 × 2/3 = 10/3', 1, {'n': 5, 'a': 2, 'b': 3}, '\\frac{10}{3}', 'incorrect'),
     spec('La moitié de 7/3 = 7/6', 2, {'k': 2, 'a': 7, 'b': 3}, '\\frac{7}{6}', 'correct'),
     spec('Erreur : le double (14/3)', 2, {'k': 2, 'a': 7, 'b': 3}, '\\frac{14}{3}',
          'incorrect'),
     spec('Le quart de 10/3 = 5/6', 2, {'k': 4, 'a': 10, 'b': 3}, '\\frac{5}{6}', 'correct')])

# =================================================================================================
# 4. Entier + fraction plus petite que 1 — point 2-272, niveau 5
# =================================================================================================
# Deux cases (l'entier, la fraction) ; reducedFractions off : 3 + 4/10 juste.


def m4(q, d):
    vs = [var('q', q), var('d', d), var('r', '1..19'), var('n', 'eval:q*d+r')]
    st = ('Écris $' + fr(v('n'), v('d')) + '$ comme la somme d\'un **nombre entier** et d\'une'
          ' **fraction plus petite que $1$**.\n\n$' + fr(v('n'), v('d')) + '=?+?$')
    steps = ['On cherche combien de fois $' + v('d') + '$ va dans $' + v('n')
             + '$ : c\'est la division euclidienne de $' + v('n') + '$ par $' + v('d') + '$.',
             '$$' + v('n') + '=' + v('d') + '\\times' + v('q') + '+' + v('r') + '\\quad\\text{avec }'
             + v('r') + '<' + v('d') + '$$',
             '$$' + fr(v('n'), v('d')) + '=' + fr(v('d') + '\\times' + v('q'), v('d')) + '+'
             + fr(v('r'), v('d')) + '=' + col(v('q') + '+' + fr(v('r'), v('d'))) + '$$',
             'La fraction $' + fr(v('r'), v('d')) + '$ est bien plus petite que $1$, car $'
             + v('r') + '<' + v('d') + '$.']
    return variation(st, vs, [v('q'), fr(v('r'), v('d'), False)], steps,
                     ['r<d', 'gcd(r,d)==1'])


MODELES['04-entier-plus-fraction'] = modele(
    'Entier + fraction plus petite que 1',
    'Écrire n/d comme un entier plus une fraction plus petite que 1 : 17/5 = 3 + 2/5 (toute'
    ' fraction égale acceptée, 3 + 4/10) ; pièges : 2 + 7/5 (fraction ≥ 1), reste et diviseur'
    ' échangés',
    5, 60, [m4('1..4', '2..5'), m4('2..9', '6..12'), m4('10..20', '3..9')],
    [spec('17/5 = 3 + 2/5', 0, {'q': 3, 'd': 5, 'r': 2}, ['3', '\\frac{2}{5}'], 'correct'),
     spec('17/5 = 3 + 4/10 (fraction égale)', 0, {'q': 3, 'd': 5, 'r': 2},
          ['3', '\\frac{4}{10}'], 'correct'),
     spec('Erreur : 2 + 7/5 (fraction plus grande que 1)', 0, {'q': 3, 'd': 5, 'r': 2},
          ['2', '\\frac{7}{5}'], 'incorrect'),
     spec('Erreur : reste et diviseur échangés (3 + 5/2)', 0, {'q': 3, 'd': 5, 'r': 2},
          ['3', '\\frac{5}{2}'], 'incorrect'),
     spec('47/8 = 5 + 7/8', 1, {'q': 5, 'd': 8, 'r': 7}, ['5', '\\frac{7}{8}'], 'correct'),
     spec('Erreur : 7 + 5/8', 1, {'q': 5, 'd': 8, 'r': 7}, ['7', '\\frac{5}{8}'], 'incorrect'),
     spec('100/7 = 14 + 2/7', 2, {'q': 14, 'd': 7, 'r': 2}, ['14', '\\frac{2}{7}'], 'correct')],
    options={'constraints': {'reducedFractions': 'off'}})

# =================================================================================================
# 5. Calculs de fractions avec priorités — point 2-272, niveau 6
# =================================================================================================

PRIO = 'La multiplication passe **avant** l\'addition et la soustraction.'


def m5_somme_produit():
    # a/b ± c/b × d/f ; produit P1/P2 réduit, puis somme au dénominateur L = ppcm(b, P2)
    vs = [var('b', '2..5'), var('a', '1..7'), var('c', '1..7'), var('d', '2..9'),
          var('f', '2..9'), var('s', '0|1'),
          var('g1', 'eval:gcd(c*d,b*f)'), var('P1', 'eval:c*d/g1'), var('P2', 'eval:b*f/g1'),
          var('L', 'eval:b*P2/gcd(b,P2)'), var('A', 'eval:a*L/b'), var('B', 'eval:P1*L/P2'),
          var('X', 'eval:a*L/b+(1-2*s)*P1*L/P2'), var('Y', 'eval:L')] + reduire('X', 'Y')
    expr = (fr(v('a'), v('b')) + signe('s') + fr(v('c'), v('b')) + '\\times'
            + fr(v('d'), v('f')))
    st = IRR + '\n\n$' + expr + '=?$'
    steps = [PRIO + ' On calcule d\'abord le produit :',
             '$$' + fr(v('c'), v('b')) + '\\times' + fr(v('d'), v('f')) + '='
             + fr(v('c') + '\\times' + v('d'), v('b') + '\\times' + v('f')) + '='
             + fr(ev('c*d'), ev('b*f')) + '{{if:g1>1|=' + fr(v('P1'), v('P2')) + '}}$$',
             'Puis, au dénominateur commun $' + v('L') + '$ :',
             '$$' + fr(v('a'), v('b')) + signe('s') + fr(v('P1'), v('P2')) + '='
             + fr(v('A'), v('L')) + signe('s') + fr(v('B'), v('L')) + '=' + sfr('X', 'Y') + '$$',
             simplif('X', 'Y', entier=True)]
    return variation(st, vs, [sfr_int('N', 'D', False)], steps,
                     ['gcd(a,b)==1', 'gcd(c,b)==1', 'gcd(d,f)==1', 'P2!=1', 'X!=0'])


def m5_deux_produits():
    vs = [var('a', '1..5'), var('b', '2..6'), var('c', '1..9'), var('d', '2..6'),
          var('m', '1..5'), var('n', '2..6'), var('p', '1..9'), var('q', '2..6'),
          var('s', '0|1'),
          var('g1', 'eval:gcd(a*c,b*d)'), var('P1', 'eval:a*c/g1'), var('P2', 'eval:b*d/g1'),
          var('g2', 'eval:gcd(m*p,n*q)'), var('Q1', 'eval:m*p/g2'), var('Q2', 'eval:n*q/g2'),
          var('L', 'eval:P2*Q2/gcd(P2,Q2)'), var('A', 'eval:P1*L/P2'), var('B', 'eval:Q1*L/Q2'),
          var('X', 'eval:P1*L/P2+(1-2*s)*Q1*L/Q2'), var('Y', 'eval:L')] + reduire('X', 'Y')
    expr = (fr(v('a'), v('b')) + '\\times' + fr(v('c'), v('d')) + signe('s')
            + fr(v('m'), v('n')) + '\\times' + fr(v('p'), v('q')))
    st = IRR + '\n\n$' + expr + '=?$'
    steps = [PRIO + ' On calcule d\'abord les deux produits :',
             '$$' + fr(v('a'), v('b')) + '\\times' + fr(v('c'), v('d')) + '='
             + fr(ev('a*c'), ev('b*d')) + '{{if:g1>1|=' + fr(v('P1'), v('P2')) + '}}\\qquad'
             + fr(v('m'), v('n')) + '\\times' + fr(v('p'), v('q')) + '='
             + fr(ev('m*p'), ev('n*q')) + '{{if:g2>1|=' + fr(v('Q1'), v('Q2')) + '}}$$',
             'Puis, au dénominateur commun $' + v('L') + '$ :',
             '$$' + fr(v('P1'), v('P2')) + signe('s') + fr(v('Q1'), v('Q2')) + '='
             + fr(v('A'), v('L')) + signe('s') + fr(v('B'), v('L')) + '=' + sfr('X', 'Y') + '$$',
             simplif('X', 'Y', entier=True)]
    return variation(st, vs, [sfr_int('N', 'D', False)], steps,
                     ['gcd(a,b)==1', 'gcd(c,d)==1', 'gcd(m,n)==1', 'gcd(p,q)==1', 'P2!=1',
                      'Q2!=1', 'X!=0'])


def m5_fraction_de_fractions():
    # (a/b + n) / (c/d − m) = (T1/b) / (B1/d)
    vs = [var('a', '1..5'), var('b', '2..6'), var('n', '1..3'), var('c', '1..9'),
          var('d', '2..6'), var('m', '1|2'),
          var('T1', 'eval:a+n*b'), var('nb', 'eval:n*b'), var('md', 'eval:m*d'),
          var('B1', 'eval:c-m*d'), var('aB', 'eval:abs(c-m*d)'),
          var('X', 'eval:(a+n*b)*d*sign(c-m*d)'), var('Y', 'eval:b*abs(c-m*d)')] \
        + reduire('X', 'Y')
    expr = ('\\dfrac{ ' + fr(v('a'), v('b')) + '+' + v('n') + ' }{ ' + fr(v('c'), v('d')) + '-'
            + v('m') + ' }')
    inv = '{{if:B1<0|-}}{{if:aB==1|' + v('d') + '|' + fr(v('d'), v('aB')) + '}}'
    st = IRR + '\n\n$' + expr + '=?$'
    steps = ['On calcule séparément le numérateur et le dénominateur.',
             '$$' + fr(v('a'), v('b')) + '+' + v('n') + '=' + fr(v('a'), v('b')) + '+'
             + fr(v('nb'), v('b')) + '=' + fr(v('T1'), v('b')) + '\\qquad' + fr(v('c'), v('d'))
             + '-' + v('m') + '=' + fr(v('c'), v('d')) + '-' + fr(v('md'), v('d')) + '='
             + sfr('B1', 'd') + '$$',
             INVERSE + ' L\'inverse de $' + sfr('B1', 'd') + '$ est $' + inv + '$.',
             '$$' + expr + '=' + fr(v('T1'), v('b')) + '\\times'
             + '{{if:B1<0|\\left(}}' + inv + '{{if:B1<0|\\right)}}' + '=' + sfr('X', 'Y') + '$$',
             simplif('X', 'Y', entier=True)]
    return variation(st, vs, [sfr_int('N', 'D', False)], steps,
                     ['gcd(a,b)==1', 'gcd(c,d)==1', 'c!=m*d'])


def m5_entier_sur():
    # n / (m − c/d) = n × d / B1
    vs = [var('n', '1..9'), var('m', '1..3'), var('c', '1..9'), var('d', '2..7'),
          var('md', 'eval:m*d'), var('B1', 'eval:m*d-c'),
          var('X', 'eval:n*d'), var('Y', 'eval:m*d-c')] + reduire('X', 'Y')
    expr = '\\dfrac{ ' + v('n') + ' }{ ' + v('m') + '-' + fr(v('c'), v('d')) + ' }'
    st = IRR + '\n\n$' + expr + '=?$'
    steps = ['On calcule d\'abord le dénominateur :',
             '$$' + v('m') + '-' + fr(v('c'), v('d')) + '=' + fr(v('md'), v('d')) + '-'
             + fr(v('c'), v('d')) + '=' + fr(v('B1'), v('d')) + '$$',
             INVERSE + ' Diviser par $' + fr(v('B1'), v('d')) + '$, c\'est multiplier par $'
             + fr(v('d'), v('B1')) + '$ :',
             '$$' + expr + '=' + v('n') + '\\times' + fr(v('d'), v('B1')) + '='
             + fr(v('X'), v('Y')) + '$$',
             simplif('X', 'Y', entier=True)]
    return variation(st, vs, [sfr_int('N', 'D', False)], steps,
                     ['gcd(c,d)==1', 'c<m*d', 'B1>1'])


MODELES['05-calculs-fractions-priorites'] = modele(
    'Calculs de fractions avec priorités',
    'Calculer en respectant les priorités : 1/2 + 3/2 × 4/9 = 7/6, produit ± produit,'
    ' (1/2 + 1)/(3/4 − 1) = −6, 3/(2 − 1/4) = 12/7 (pièges : calculer de gauche à droite,'
    ' oublier de simplifier)',
    6, 120, [m5_somme_produit(), m5_deux_produits(), m5_fraction_de_fractions(),
             m5_entier_sur()],
    [spec('1/2 + 3/2 × 4/9 = 7/6', 0, {'b': 2, 'a': 1, 'c': 3, 'd': 4, 'f': 9, 's': 0},
          '\\frac{7}{6}', 'correct'),
     spec('Erreur : de gauche à droite (8/9)', 0,
          {'b': 2, 'a': 1, 'c': 3, 'd': 4, 'f': 9, 's': 0}, '\\frac{8}{9}', 'incorrect'),
     spec('Non simplifiée : 14/12', 0, {'b': 2, 'a': 1, 'c': 3, 'd': 4, 'f': 9, 's': 0},
          '\\frac{14}{12}', 'unoptimal_form', REDUCED),
     spec('2/3 × 9/4 − 5/6 × 3/5 = 1', 1,
          {'a': 2, 'b': 3, 'c': 9, 'd': 4, 'm': 5, 'n': 6, 'p': 3, 'q': 5, 's': 1}, '1',
          'correct'),
     spec('Erreur : 3/2 + 1/2 = 2 (signe)', 1,
          {'a': 2, 'b': 3, 'c': 9, 'd': 4, 'm': 5, 'n': 6, 'p': 3, 'q': 5, 's': 1}, '2',
          'incorrect'),
     spec('(1/2 + 1)/(3/4 − 1) = −6', 2, {'a': 1, 'b': 2, 'n': 1, 'c': 3, 'd': 4, 'm': 1},
          '-6', 'correct'),
     spec('Erreur : 6 (signe oublié)', 2, {'a': 1, 'b': 2, 'n': 1, 'c': 3, 'd': 4, 'm': 1},
          '6', 'incorrect'),
     spec('Erreur : 3/2 × (−1/4) = −3/8 (multiplié au lieu de divisé)', 2,
          {'a': 1, 'b': 2, 'n': 1, 'c': 3, 'd': 4, 'm': 1}, '-\\frac{3}{8}', 'incorrect'),
     spec('3/(2 − 1/4) = 12/7', 3, {'n': 3, 'm': 2, 'c': 1, 'd': 4}, '\\frac{12}{7}',
          'correct'),
     spec('Erreur : 3/2 − 1/4 = 5/4', 3, {'n': 3, 'm': 2, 'c': 1, 'd': 4}, '\\frac{5}{4}',
          'incorrect')])

# =================================================================================================
# 6. Problème : fraction faite, fraction restante — point 2-272, niveau 7
# =================================================================================================


def m6(contexte, dens, conds):
    texte, tout, reste = contexte
    vs = [var('w', '0..2')] + dens + [
        var('A', 'eval:a*L/n'), var('B', 'eval:b*L/m'), var('S', 'eval:a*L/n+b*L/m'),
        var('X', 'eval:L-a*L/n-b*L/m'), var('Y', 'eval:L')] + reduire('X', 'Y')
    st = texte + '\n\n' + reste + ' ' + IRR + '\n\n$$?$$'
    steps = ['On ajoute d\'abord les deux fractions déjà faites, au dénominateur commun $'
             + v('L') + '$ :',
             '$$' + fr(v('a'), v('n')) + '+' + fr(v('b'), v('m')) + '=' + fr(v('A'), v('L')) + '+'
             + fr(v('B'), v('L')) + '=' + fr(v('S'), v('L')) + '$$',
             tout + ', c\'est $1=' + fr(v('L'), v('L')) + '$. Il reste :',
             '$$' + fr(v('L'), v('L')) + '-' + fr(v('S'), v('L')) + '=' + fr(v('X'), v('Y')) + '$$',
             simplif('X', 'Y')]
    return variation(st, vs, [fr(v('N'), v('D'), False)], steps, conds + ['X>0'])


PEINTRE = prenom('w', ['Hugo', 'Awa', 'Malik'])
LECTEUR = prenom('w', ['Chloé', 'Yanis', 'Lou'])
MARCHEUR = prenom('w', ['Inès', 'Théo', 'Sacha'])
MODELES['06-probleme-fraction-restante'] = modele(
    'Problème : fraction faite, fraction restante',
    'Il peint 2/5 du mur le matin et 1/3 l\'après-midi : quelle fraction reste à peindre ? (4/15)'
    ' ; mêmes dénominateurs, puis multiples, puis quelconques (pièges : donner la fraction faite,'
    ' additionner numérateurs et dénominateurs)',
    7, 90,
    [m6((LECTEUR + ' lit {{if:a==1|le|les}} $' + fr(v('a'), v('n')) + '$ d\'un roman samedi et {{if:b==1|le|les}} $'
         + fr(v('b'), v('m')) + '$ du roman dimanche.', 'Le roman entier',
         'Quelle fraction du roman lui reste-t-il à lire ?'),
        [var('n', '5..12'), var('m', 'eval:n'), var('L', 'eval:n'), var('a', '1..7'),
         var('b', '1..7')], ['gcd(a,n)==1', 'gcd(b,n)==1']),
     m6((MARCHEUR + ' fait une randonnée. Le matin, {{if:w==1|il|elle}} parcourt {{if:a==1|le|les}} $' + fr(v('a'), v('n'))
         + '$ du trajet, et l\'après-midi {{if:b==1|le|les}} $' + fr(v('b'), v('m')) + '$ du trajet.',
         'Le trajet entier', 'Quelle fraction du trajet reste-t-il à parcourir ?'),
        [var('n', '2..5'), var('k', '2..3'), var('m', 'eval:k*n'), var('L', 'eval:m'),
         var('a', '1..4'), var('b', '1..11')], ['gcd(a,n)==1', 'gcd(b,m)==1']),
     m6((PEINTRE + ' peint {{if:a==1|le|les}} $' + fr(v('a'), v('n')) + '$ d\'un mur le matin et {{if:b==1|le|les}} $'
         + fr(v('b'), v('m')) + '$ du mur l\'après-midi.', 'Le mur entier',
         'Quelle fraction du mur reste-t-il à peindre ?'),
        [var('n', '3..7'), var('m', '2..5'), var('L', 'eval:n*m'), var('a', '1..3'),
         var('b', '1..2')], ['gcd(n,m)==1', 'n>m', 'gcd(a,n)==1', 'gcd(b,m)==1'])],
    [spec('3/10 + 4/10 : il reste 3/10', 0, {'w': 0, 'n': 10, 'a': 3, 'b': 4},
          '\\frac{3}{10}', 'correct'),
     spec('Erreur : la fraction lue (7/10)', 0, {'w': 0, 'n': 10, 'a': 3, 'b': 4},
          '\\frac{7}{10}', 'incorrect'),
     spec('1/3 + 1/6 : il reste 1/2', 1, {'w': 1, 'n': 3, 'k': 2, 'a': 1, 'b': 1},
          '\\frac{1}{2}', 'correct'),
     spec('Non simplifiée : 3/6', 1, {'w': 1, 'n': 3, 'k': 2, 'a': 1, 'b': 1}, '\\frac{3}{6}',
          'unoptimal_form', REDUCED),
     spec('Erreur : 1 − (1 + 1)/(3 + 6) = 7/9', 1, {'w': 1, 'n': 3, 'k': 2, 'a': 1, 'b': 1},
          '\\frac{7}{9}', 'incorrect'),
     spec('2/5 + 1/3 : il reste 4/15', 2, {'w': 2, 'n': 5, 'm': 3, 'a': 2, 'b': 1},
          '\\frac{4}{15}', 'correct'),
     spec('Erreur : la fraction peinte (11/15)', 2, {'w': 2, 'n': 5, 'm': 3, 'a': 2, 'b': 1},
          '\\frac{11}{15}', 'incorrect')])

# =================================================================================================
# 7. Problème : une fraction du reste — point 2-272, niveau 8
# =================================================================================================


def m7_deux(texte, question):
    vs = [var('w', '0..2'), var('b', '2..6'), var('a', '1..4'), var('d', '2..6'),
          var('c', '1..4'), var('R1', 'eval:b-a'), var('R2', 'eval:d-c'),
          var('X', 'eval:(b-a)*(d-c)'), var('Y', 'eval:b*d')] + reduire('X', 'Y')
    st = texte + '\n\n' + question + ' ' + IRR + '\n\n$$?$$'
    steps = ['Après la première étape, il reste $1-' + fr(v('a'), v('b')) + '='
             + fr(v('R1'), v('b')) + '$ du total.',
             'Ensuite, on prend $' + fr(v('c'), v('d')) + '$ **de ce reste**, pas du total : il'
             ' reste les $1-' + fr(v('c'), v('d')) + '=' + fr(v('R2'), v('d')) + '$ de $'
             + fr(v('R1'), v('b')) + '$.',
             'Prendre une fraction d\'une quantité, c\'est multiplier :',
             '$$' + fr(v('R2'), v('d')) + '\\times' + fr(v('R1'), v('b')) + '='
             + fr(v('X'), v('Y')) + '$$',
             simplif('X', 'Y')]
    return variation(st, vs, [fr(v('N'), v('D'), False)], steps,
                     ['a<b', 'c<d', 'gcd(a,b)==1', 'gcd(c,d)==1'])


def m7_trois():
    vs = [var('w', '0..2'), var('b', '2..5'), var('a', '1..3'), var('d', '2..5'),
          var('c', '1..3'), var('h', '2..5'), var('f', '1..3'), var('R1', 'eval:b-a'),
          var('R2', 'eval:d-c'), var('R3', 'eval:h-f'),
          var('X', 'eval:(b-a)*(d-c)*(h-f)'), var('Y', 'eval:b*d*h')] + reduire('X', 'Y')
    nom = prenom('w', ['Maya', 'Nolan', 'Zoé'])
    st = (nom + ' a cueilli un bouquet de fleurs. Elle en donne {{if:a==1|le|les}} $' + fr(v('a'), v('b'))
          + '$ à sa mère, puis {{if:c==1|le|les}} $' + fr(v('c'), v('d')) + '$ de ce qui reste à sa sœur, puis'
          ' {{if:f==1|le|les}} $' + fr(v('f'), v('h')) + '$ de ce qui reste encore à son amie.\n\nQuelle'
          ' fraction du bouquet lui reste-t-il ? ' + IRR + '\n\n$$?$$')
    st = st.replace('Elle en', '{{if:w==1|Il|Elle}} en')
    steps = ['À chaque étape, on prend une fraction **de ce qui reste**, pas du bouquet entier.',
             'Il reste successivement $1-' + fr(v('a'), v('b')) + '=' + fr(v('R1'), v('b'))
             + '$, puis $1-' + fr(v('c'), v('d')) + '=' + fr(v('R2'), v('d')) + '$ de ce reste,'
             ' puis $1-' + fr(v('f'), v('h')) + '=' + fr(v('R3'), v('h')) + '$ du nouveau reste.',
             'Prendre une fraction d\'une quantité, c\'est multiplier :',
             '$$' + fr(v('R3'), v('h')) + '\\times' + fr(v('R2'), v('d')) + '\\times'
             + fr(v('R1'), v('b')) + '=' + fr(v('X'), v('Y')) + '$$',
             simplif('X', 'Y')]
    return variation(st, vs, [fr(v('N'), v('D'), False)], steps,
                     ['a<b', 'c<d', 'f<h', 'gcd(a,b)==1', 'gcd(c,d)==1', 'gcd(f,h)==1'])


ARGENT = prenom('w', ['Léa', 'Nathan', 'Jade'])
BUVEUR = prenom('w', ['Noé', 'Lina', 'Adam'])
MODELES['07-probleme-fraction-du-reste'] = modele(
    'Problème : une fraction du reste',
    'Léa dépense 1/3 de son argent, puis 1/4 de ce qui reste : quelle fraction lui reste-t-il ?'
    ' (1/2) ; deux étapes puis trois, contextes variés (piège : prendre 1/4 du total, 1 − 1/3 −'
    ' 1/4)',
    8, 120,
    [m7_deux(ARGENT + ' dépense {{if:a==1|le|les}} $' + fr(v('a'), v('b')) + '$ de son argent de poche pour un'
             ' livre, puis {{if:c==1|le|les}} $' + fr(v('c'), v('d')) + '$ de ce qui lui reste pour une place de'
             ' cinéma.', 'Quelle fraction de son argent de poche de départ lui reste-t-il ?'),
     m7_deux('Une bouteille de jus de fruits est pleine. ' + BUVEUR + ' en boit les $'
             + fr(v('a'), v('b')) + '$, puis on verse {{if:c==1|le|les}} $' + fr(v('c'), v('d'))
             + '$ de ce qui reste dans une carafe.',
             'Quelle fraction de la bouteille pleine reste-t-il dans la bouteille ?'),
     m7_trois()],
    [spec('1/3 puis 1/4 du reste : il reste 1/2', 0, {'w': 0, 'a': 1, 'b': 3, 'c': 1, 'd': 4},
          '\\frac{1}{2}', 'correct'),
     spec('Erreur : 1/4 du total (1 − 1/3 − 1/4 = 5/12)', 0,
          {'w': 0, 'a': 1, 'b': 3, 'c': 1, 'd': 4}, '\\frac{5}{12}', 'incorrect'),
     spec('Erreur : 2/5 puis 1/2 du reste, la fraction dépensée 7/10 au lieu de 3/10', 0,
          {'w': 0, 'a': 2, 'b': 5, 'c': 1, 'd': 2}, '\\frac{7}{10}', 'incorrect'),
     spec('Non simplifiée : 6/12', 0, {'w': 0, 'a': 1, 'b': 3, 'c': 1, 'd': 4}, '\\frac{6}{12}',
          'unoptimal_form', REDUCED),
     spec('Bouteille : 1/4 puis 2/3 du reste, il reste 1/4', 1,
          {'w': 1, 'a': 1, 'b': 4, 'c': 2, 'd': 3}, '\\frac{1}{4}', 'correct'),
     spec('Erreur : 1 − 1/4 − 2/3 = 1/12', 1, {'w': 1, 'a': 1, 'b': 4, 'c': 2, 'd': 3},
          '\\frac{1}{12}', 'incorrect'),
     spec('Bouquet : 1/2, 1/3, 1/4 : il reste 1/4', 2,
          {'w': 0, 'a': 1, 'b': 2, 'c': 1, 'd': 3, 'f': 1, 'h': 4}, '\\frac{1}{4}', 'correct'),
     spec('Erreur : 1 − 1/2 − 1/3 − 1/4 = −1/12', 2,
          {'w': 0, 'a': 1, 'b': 2, 'c': 1, 'd': 3, 'f': 1, 'h': 4}, '-\\frac{1}{12}',
          'incorrect')])

# =================================================================================================
# 8. Comparer deux fractions — point 2-264, niveau 9
# =================================================================================================
# Case choix « < » (indice 0) ou « > » (indice 1). z = 1 : la plus grande fraction est à gauche.

CHOIX_COMPARER = '```choix\nmelanger: non\n- $<$\n- $>$\n```'


def comparer(gauche_si_z, droite_si_z, vs, steps, conds):
    g = '{{if:z==1|' + gauche_si_z + '|' + droite_si_z + '}}'
    d = '{{if:z==1|' + droite_si_z + '|' + gauche_si_z + '}}'
    st = ('Compare ces deux fractions : choisis le bon signe.\n\n$$' + g + '\\;\\ldots\\;' + d
          + '$$\n\n' + CHOIX_COMPARER)
    fin = ('Donc $' + col(g + '{{if:z==1|>|<}}' + d) + '$.')
    return variation(st, [var('z', '0|1')] + vs + [var('rep', 'eval:z')], ['{{rep}}'],
                     steps + [fin], conds)


def m8_un():
    grand, petit = fr(v('p'), v('q')), fr(v('r'), v('t'))
    return comparer(
        grand, petit,
        [var('q', '3..12'), var('k', '1..3'), var('p', 'eval:q+k'), var('t', '3..12'),
         var('j', '1..3'), var('r', 'eval:t-j')],
        ['On compare chaque fraction à $1$.',
         '$' + grand + '>1$ car son numérateur $' + v('p') + '$ est plus grand que son'
         ' dénominateur $' + v('q') + '$.',
         '$' + petit + '<1$ car son numérateur $' + v('r') + '$ est plus petit que son'
         ' dénominateur $' + v('t') + '$.',
         'Ainsi $' + petit + '<1<' + grand + '$.'],
        ['gcd(p,q)==1', 'gcd(r,t)==1', 'q!=t'])


def m8_difference():
    grand, petit = fr(v('n'), v('n1')), fr(v('m'), v('n'))
    return comparer(
        grand, petit,
        [var('n', '5..15'), var('n1', 'eval:n-1'), var('m', 'eval:n+1'),
         var('P', 'eval:n*(n-1)'), var('M1', 'eval:(n+1)*(n-1)'), var('M2', 'eval:n*n')],
        ['Les deux fractions sont très proches de $1$ : on étudie le signe de leur différence.',
         '$$' + petit + '-' + grand + '=' + fr(v('m') + '\\times' + v('n1'),
                                             v('n') + '\\times' + v('n1')) + '-'
         + fr(v('n') + '\\times' + v('n'), v('n1') + '\\times' + v('n')) + '='
         + fr(v('M1') + '-' + v('M2'), v('P')) + '=-' + fr('1', v('P')) + '$$',
         'La différence est **négative**, donc $' + petit + '<' + grand + '$.'],
        [])


def m8_meme_den():
    grand, petit = fr(v('a'), v('n')), fr(v('b'), v('n'))
    return comparer(
        grand, petit,
        [var('n', '7..19'), var('a', '2..30'), var('b', '1..29')],
        ['Les deux fractions ont le **même dénominateur** $' + v('n') + '$ : la plus grande est'
         ' celle qui a le plus grand numérateur.',
         '$' + v('a') + '>' + v('b') + '$, donc $' + grand + '>' + petit + '$.'],
        ['a>b', 'gcd(a,n)==1', 'gcd(b,n)==1'])


def m8_meme_num():
    grand, petit = fr(v('n'), v('a')), fr(v('n'), v('b'))
    return comparer(
        grand, petit,
        [var('n', '2..19'), var('a', '2..19'), var('b', '3..20')],
        ['Les deux fractions ont le **même numérateur** $' + v('n') + '$ : on partage la même'
         ' quantité en plus de parts quand le dénominateur est plus grand, donc chaque part est'
         ' plus petite.',
         '$' + v('a') + '<' + v('b') + '$, donc $' + grand + '>' + petit + '$.'],
        ['a<b', 'gcd(a,n)==1', 'gcd(b,n)==1'])


MODELES['08-comparer-deux-fractions'] = modele(
    'Comparer deux fractions',
    'Choisir < ou > entre deux fractions : 7/5 et 9/11 (comparer à 1), 13/12 et 12/11 (signe de'
    ' la différence), même dénominateur, même numérateur (piège : le plus grand dénominateur ne'
    ' donne pas la plus grande fraction)',
    9, 60, [m8_un(), m8_difference(), m8_meme_den(), m8_meme_num()],
    [spec('7/5 … 9/11 : >', 0, {'z': 1, 'q': 5, 'k': 2, 't': 11, 'j': 2}, '1', 'correct'),
     spec('Erreur : 7/5 < 9/11 (grands nombres)', 0, {'z': 1, 'q': 5, 'k': 2, 't': 11, 'j': 2},
          '0', 'incorrect'),
     spec('9/11 … 7/5 : <', 0, {'z': 0, 'q': 5, 'k': 2, 't': 11, 'j': 2}, '0', 'correct'),
     spec('13/12 … 12/11 : <', 1, {'z': 0, 'n': 12}, '0', 'correct'),
     spec('Erreur : 13/12 > 12/11', 1, {'z': 0, 'n': 12}, '1', 'incorrect'),
     spec('11/13 … 8/13 : >', 2, {'z': 1, 'n': 13, 'a': 11, 'b': 8}, '1', 'correct'),
     spec('5/9 … 5/7 : <', 3, {'z': 0, 'n': 5, 'a': 7, 'b': 9}, '0', 'correct'),
     spec('Erreur : 5/9 > 5/7 (plus grand dénominateur)', 3, {'z': 0, 'n': 5, 'a': 7, 'b': 9},
          '1', 'incorrect')])

# =================================================================================================
# 9. Valeur décimale d'une fraction simple — point 2-248, niveau 9
# =================================================================================================
# T = plus petite puissance de 10 multiple de d (indicatrices, `eval` sans comparaison).


def m9(dens, amax):
    vs = [var('d', dens), var('a', '1..' + str(amax)),
          var('T', 'eval:10+90*min(mod(10,d),1)+900*min(mod(100,d),1)'),
          var('k', 'eval:T/d'), var('A', 'eval:a*T/d')]
    st = ('Donne l\'écriture décimale de $' + fr(v('a'), v('d')) + '$.\n\n$'
          + fr(v('a'), v('d')) + '=?$')
    steps = ['On écrit une fraction égale dont le dénominateur est $10$, $100$ ou $1\\,000$'
             '{{if:k==1|, ici elle l\'est déjà.| : ici $' + v('d') + '\\times' + v('k') + '='
             + v('T') + '$.}}',
             '$$' + fr(v('a'), v('d')) + '{{if:k>1|=' + fr(v('a') + '\\times' + v('k'),
                                                          v('d') + '\\times' + v('k')) + '='
             + fr(v('A'), v('T')) + '}}=' + col(ev('a/d;d')) + '$$']
    return variation(st, vs, [ev('a/d;d')], steps, ['gcd(a,d)==1'])


MODELES['09-valeur-decimale-fraction'] = modele(
    'Valeur décimale d\'une fraction simple',
    'Écrire en décimal une fraction de dénominateur 2, 4, 5, 8, 10, 20, 25 ou 50 : 7/4 = 1,75 ;'
    ' 13/5 = 2,6 (pièges : 7/4 lu 7,4, décimales oubliées)',
    9, 60, [m9('2|5|10', 29), m9('4|20|25|50', 99), m9('8', 39)],
    [spec('13/5 = 2,6', 0, {'d': 5, 'a': 13}, '2{,}6', 'correct'),
     spec('Erreur : 13/5 lu 13,5', 0, {'d': 5, 'a': 13}, '13{,}5', 'incorrect'),
     spec('7/4 = 1,75', 1, {'d': 4, 'a': 7}, '1{,}75', 'correct'),
     spec('Erreur : 7/4 lu 7,4', 1, {'d': 4, 'a': 7}, '7{,}4', 'incorrect'),
     spec('Erreur : 7/4 ≈ 1,7', 1, {'d': 4, 'a': 7}, '1{,}7', 'incorrect'),
     spec('11/8 = 1,375', 2, {'d': 8, 'a': 11}, '1{,}375', 'correct'),
     spec('Erreur : 11/8 = 1,38', 2, {'d': 8, 'a': 11}, '1{,}38', 'incorrect')],
    options={'constraints': {'spacesFromFourDigits': True}})

# =================================================================================================
# 10. Division euclidienne — point 2-236, niveau 14
# =================================================================================================


def m10(texte, cases, apres):
    vs = [var('w', '0..2'), var('b', '6..25'), var('q', '5..40'), var('r', '1..24'),
          var('n', 'eval:b*q+r'), var('bq', 'eval:b*q'), var('q1', 'eval:q+1'),
          var('bq1', 'eval:b*(q+1)')]
    st = texte + '\n\n' + cases
    steps = ['On cherche le plus grand multiple de $' + v('b') + '$ qui ne dépasse pas $' + v('n')
             + '$ : $' + v('b') + '\\times' + v('q') + '=' + v('bq') + '\\leqslant' + v('n')
             + '<' + v('b') + '\\times' + v('q1') + '=' + v('bq1') + '$.',
             'Le reste est $' + v('n') + '-' + v('bq') + '=' + v('r') + '$, bien **plus petit'
             ' que** $' + v('b') + '$.',
             '$$' + col(v('n') + '=' + v('b') + '\\times' + v('q') + '+' + v('r')) + '$$',
             apres]
    return variation(st, vs, [v('q'), v('r')], steps, ['r<b', 'n<=999'])


MODELES['10-division-euclidienne'] = modele(
    'Division euclidienne',
    'Écrire 157 = 12 × 13 + 1 (quotient et reste), puis 157 bonbons en sachets de 12 : 13 sachets'
    ' pleins, il en reste 1 (piège : reste plus grand que le diviseur, 12 × 12 + 13)',
    14, 90,
    [m10('Effectue la division euclidienne de $' + v('n') + '$ par $' + v('b') + '$ : complète'
         ' l\'égalité, avec un reste plus petit que $' + v('b') + '$.',
         '$' + v('n') + '=' + v('b') + '\\times ?+?$',
         'Le quotient est $' + v('q') + '$ et le reste $' + v('r') + '$.'),
     m10(prenom('w', ['Nina', 'Ilyes', 'Margaux']) + ' a $' + v('n') + '$ bonbons. Elle les'
         ' range dans des sachets de $' + v('b') + '$ bonbons.\n\nCombien de sachets pleins'
         ' peut-elle remplir ? Combien de bonbons reste-t-il ?',
         'Sachets pleins : $?$\n\nBonbons restants : $?$',
         'On remplit $' + col(v('q')) + '$ sachets et il reste $' + col(v('r')) + '$ bonbons.'),
     m10('Pour un tournoi, $' + v('n') + '$ élèves forment des équipes de $' + v('b')
         + '$.\n\nCombien d\'équipes complètes peut-on former ? Combien d\'élèves restent sans'
         ' équipe ?', 'Équipes complètes : $?$\n\nÉlèves sans équipe : $?$',
         'On forme $' + col(v('q')) + '$ équipes complètes et $' + col(v('r'))
         + '$ élèves restent sans équipe.')],
    [spec('157 = 12 × 13 + 1', 0, {'w': 0, 'b': 12, 'q': 13, 'r': 1}, ['13', '1'], 'correct'),
     spec('Erreur : 12 × 12 + 13 (reste trop grand)', 0, {'w': 0, 'b': 12, 'q': 13, 'r': 1},
          ['12', '13'], 'incorrect'),
     spec('Erreur : quotient décimal 13,08', 0, {'w': 0, 'b': 12, 'q': 13, 'r': 1},
          ['13{,}08', '0'], 'incorrect'),
     spec('157 bonbons, sachets de 12 : 13 et 1', 1, {'w': 0, 'b': 12, 'q': 13, 'r': 1},
          ['13', '1'], 'correct'),
     spec('Erreur : 14 sachets (sachet incomplet compté)', 1,
          {'w': 0, 'b': 12, 'q': 13, 'r': 1}, ['14', '1'], 'incorrect'),
     spec('230 élèves, équipes de 7 : 32 et 6', 2, {'w': 0, 'b': 7, 'q': 32, 'r': 6},
          ['32', '6'], 'correct')])
MODELES['10-division-euclidienne']['variations'][1]['statement'] = \
    MODELES['10-division-euclidienne']['variations'][1]['statement'].replace(
        'Elle les', '{{if:w==1|Il|Elle}} les').replace('peut-elle', 'peut-{{if:w==1|il|elle}}')

# =================================================================================================
# 11. Critères de divisibilité — point 2-236, niveau 15
# =================================================================================================
# Chaque variation fixe l'ensemble des bons diviseurs (parmi 2, 3, 4, 5, 9), pour que la réponse
# ne soit pas toujours « tous ».

DIVISEURS = [2, 3, 4, 5, 9]


def m11(base, kmin, kmax, conds, vrais):
    vs = [var('k', str(kmin) + '..' + str(kmax)), var('n', 'eval:' + str(base) + '*k'),
          var('m', 'eval:floor(n/1000)'), var('cc', 'eval:mod(floor(n/100),10)'),
          var('dz', 'eval:mod(floor(n/10),10)'), var('u', 'eval:mod(n,10)'),
          var('S', 'eval:floor(n/1000)+mod(floor(n/100),10)+mod(floor(n/10),10)+mod(n,10)'),
          var('S3', 'eval:mod(S,3)'), var('S9', 'eval:mod(S,9)'), var('du', 'eval:mod(n,100)')]
    st = ('Par quels nombres $' + v('n') + '$ est-il divisible ? Coche toutes les bonnes'
          ' réponses.\n\n```choix\nplusieurs: oui\nmelanger: non\n'
          + '\n'.join('- $' + str(x) + '$' for x in DIVISEURS) + '\n```')

    def ok(x):
        return x in vrais

    steps = [
        '**Par $2$ et par $5$** : on regarde le dernier chiffre, $' + v('u') + '$. '
        + ('Il est pair : divisible par $2$. ' if ok(2) else 'Il est impair : pas divisible par'
           ' $2$. ')
        + ('Il vaut $0$ ou $5$ : divisible par $5$.' if ok(5) else 'Ce n\'est ni $0$ ni $5$ : pas'
           ' divisible par $5$.'),
        '**Par $3$ et par $9$** : on additionne les chiffres, $' + v('m') + '+' + v('cc') + '+'
        + v('dz') + '+' + v('u') + '=' + v('S') + '$. '
        + ('$' + v('S') + '$ est un multiple de $3$' if ok(3)
           else '$' + v('S') + '$ n\'est pas un multiple de $3$')
        + (' et de $9$ : divisible par $3$ et par $9$.' if ok(9)
           else (', mais pas de $9$ : divisible par $3$, pas par $9$.' if ok(3)
                 else ' (ni de $9$) : divisible ni par $3$ ni par $9$.')),
        '**Par $4$** : on regarde le nombre formé par les deux derniers chiffres, $' + v('du')
        + '$. ' + ('C\'est un multiple de $4$ : divisible par $4$.' if ok(4)
                   else 'Ce n\'est pas un multiple de $4$ : pas divisible par $4$.'),
        '$' + v('n') + '$ est divisible par ' + ', '.join('$' + col(str(x)) + '$' for x in vrais[:-1])
        + ' et $' + col(str(vrais[-1])) + '$.']
    rep = ';'.join(str(DIVISEURS.index(x)) for x in vrais)
    return variation(st, vs, [rep], steps, conds)


MODELES['11-criteres-divisibilite'] = modele(
    'Critères de divisibilité',
    'Cocher les diviseurs d\'un nombre de 4 chiffres parmi 2, 3, 4, 5, 9 (2 340 : tous) ; réponses'
    ' variées (pièges : 4 jugé sur le dernier chiffre seul, 9 confondu avec 3)',
    15, 90,
    [m11(180, 6, 55, [], [2, 3, 4, 5, 9]),
     m11(30, 34, 333, ['mod(k,2)==1', 'mod(k,3)!=0'], [2, 3, 5]),
     m11(9, 112, 1111, ['mod(k,2)==1', 'mod(k,5)!=0'], [3, 9]),
     m11(12, 84, 833, ['mod(k,3)!=0', 'mod(k,5)!=0'], [2, 3, 4]),
     m11(15, 67, 666, ['mod(k,2)==1', 'mod(k,3)!=0'], [3, 5])],
    [spec('2 340 : tous', 0, {'k': 13}, '0;1;2;3;4', 'correct'),
     spec('Oubli de 4 (½ point)', 0, {'k': 13}, '0;1;3;4', 'unoptimal_form'),
     spec('1 110 : 2, 3, 5', 1, {'k': 37}, '0;1;3', 'correct'),
     spec('Erreur : 4 coché pour 1 110', 1, {'k': 37}, '0;1;2;3', 'incorrect'),
     spec('2 133 : 3 et 9', 2, {'k': 237}, '1;4', 'correct'),
     spec('2 136 : 2, 3, 4', 3, {'k': 178}, '0;1;2', 'correct'),
     spec('Erreur : 9 coché pour 2 136', 3, {'k': 178}, '0;1;2;4', 'incorrect'),
     spec('1 095 : 3 et 5', 4, {'k': 73}, '1;3', 'correct')],
    options={'constraints': {'spacesFromFourDigits': True}})

# =================================================================================================
# 12. Nombre premier, décomposition — HORS PROGRAMME (reprise du collège), sans point, niveau 16
# =================================================================================================

PREMIERS = '97|101|103|107|109|113|127|131|137|139|149|151|157|163|167|173|179|181|191|193|197|199'


def m12_premier():
    vs = [var('z', '0|1'), var('pr', PREMIERS), var('p', '7|11|13'),
          var('q', '7|11|13|17|19|23'), var('n', 'eval:z*pr+(1-z)*p*q'), var('rep', 'eval:1-z')]
    st = ('$' + v('n') + '$ est-il un nombre premier ?\n\n```choix\nmelanger: non\n- Oui, $'
          + v('n') + '$ est premier.\n- Non, $' + v('n') + '$ n\'est pas premier.\n```')
    steps = ['Un nombre **premier** a exactement deux diviseurs : $1$ et lui-même. On cherche un'
             ' diviseur parmi les nombres premiers $2$, $3$, $5$, $7$, $11$, $13$… en s\'arrêtant'
             ' quand leur carré dépasse $' + v('n') + '$.',
             '$' + v('n') + '$ n\'est divisible ni par $2$ (impair), ni par $3$ (somme des'
             ' chiffres), ni par $5$ (dernier chiffre).',
             '{{if:z==1|Il n\'est divisible ni par $7$, ni par $11$, ni par $13$, et $17^2=289>'
             + v('n') + '$ : $' + col(v('n') + '\\text{ est premier}') + '$.|Mais $' + v('n')
             + '=' + v('p') + '\\times' + v('q') + '$ : $' + col(v('n')
                                                              + '\\text{ n\'est pas premier}')
             + '$.}}']
    return variation(st, vs, ['{{rep}}'], steps, ['p<=q', 'p*q<=199'])


def m12_trois_premiers():
    # a < b < c premiers, l'un au carré (w) ; facteurs rangés : a, f2, f3, c
    vs = [var('a', '2|3|5'), var('b', '3|5|7'), var('c', '5|7|11|13'), var('w', '0..2'),
          var('f2', 'eval:a+(b-a)*min(w,1)'), var('f3', 'eval:b+(c-b)*max(w-1,0)'),
          var('n', 'eval:a*f2*f3*c'), var('n1', 'eval:n/a'), var('n2', 'eval:n/(a*f2)')]
    st = ('Décompose $' + v('n') + '$ en produit de facteurs premiers. Écris les facteurs **du'
          ' plus petit au plus grand**, chacun autant de fois qu\'il apparaît.\n\n$' + v('n')
          + '=?\\times ?\\times ?\\times ?$')
    puiss = ('{{if:w==0|' + v('a') + '^2\\times' + v('b') + '\\times' + v('c') + '|{{if:w==1|'
             + v('a') + '\\times' + v('b') + '^2\\times' + v('c') + '|' + v('a') + '\\times'
             + v('b') + '\\times' + v('c') + '^2}}}}')
    steps = ['On divise par le plus petit nombre premier possible, encore et encore :',
             '$$' + v('n') + '=' + v('a') + '\\times' + v('n1') + '=' + v('a') + '\\times'
             + v('f2') + '\\times' + v('n2') + '=' + v('a') + '\\times' + v('f2') + '\\times'
             + v('f3') + '\\times' + v('c') + '$$',
             'Les facteurs $' + v('a') + '$, $' + v('f2') + '$, $' + v('f3') + '$ et $' + v('c')
             + '$ sont premiers. Avec une puissance : $' + v('n') + '=' + col(puiss) + '$.']
    return variation(st, vs, [v('a'), v('f2'), v('f3'), v('c')], steps,
                     ['a<b', 'b<c', 'n<=300'])


def m12_cube():
    vs = [var('p', '2|3'), var('q', '5|7|11'), var('n', 'eval:p^3*q'), var('n1', 'eval:p^2*q'),
          var('n2', 'eval:p*q')]
    st = ('Décompose $' + v('n') + '$ en produit de facteurs premiers. Écris les facteurs **du'
          ' plus petit au plus grand**, chacun autant de fois qu\'il apparaît.\n\n$' + v('n')
          + '=?\\times ?\\times ?\\times ?$')
    steps = ['On divise par le plus petit nombre premier possible, encore et encore :',
             '$$' + v('n') + '=' + v('p') + '\\times' + v('n1') + '=' + v('p') + '\\times' + v('p')
             + '\\times' + v('n2') + '=' + v('p') + '\\times' + v('p') + '\\times' + v('p')
             + '\\times' + v('q') + '$$',
             'Avec une puissance : $' + v('n') + '=' + col(v('p') + '^3\\times' + v('q')) + '$.']
    return variation(st, vs, [v('p'), v('p'), v('p'), v('q')], steps, ['n<=300'])


MODELES['12-nombre-premier-decomposition'] = modele(
    'Nombre premier, décomposition en facteurs premiers',
    '91 est-il premier ? (non, 7 × 13) ; décomposer 84 = 2 × 2 × 3 × 7, facteurs rangés du plus'
    ' petit au plus grand (pièges : nombre impair pris pour premier, facteur non premier comme 4)',
    16, 90, [m12_premier(), m12_trois_premiers(), m12_cube()],
    [spec('91 n\'est pas premier', 0, {'z': 0, 'p': 7, 'q': 13}, '1', 'correct'),
     spec('Erreur : 91 pris pour premier', 0, {'z': 0, 'p': 7, 'q': 13}, '0', 'incorrect'),
     spec('97 est premier', 0, {'z': 1, 'pr': 97, 'p': 7, 'q': 13}, '0', 'correct'),
     spec('84 = 2 × 2 × 3 × 7', 1, {'a': 2, 'b': 3, 'c': 7, 'w': 0}, ['2', '2', '3', '7'],
          'correct'),
     spec('Erreur : facteur 4 non premier (4 × 3 × 7 × 1)', 1, {'a': 2, 'b': 3, 'c': 7, 'w': 0},
          ['1', '4', '3', '7'], 'incorrect'),
     spec('Facteurs dans le désordre : refusé', 1, {'a': 2, 'b': 3, 'c': 7, 'w': 0},
          ['7', '3', '2', '2'], 'incorrect'),
     spec('56 = 2 × 2 × 2 × 7', 2, {'p': 2, 'q': 7}, ['2', '2', '2', '7'], 'correct'),
     spec('Erreur : 2 × 4 × 7 × 1', 2, {'p': 2, 'q': 7}, ['1', '2', '4', '7'], 'incorrect')])

# =================================================================================================
# 13. Problèmes de PGCD et de PPCM — HORS PROGRAMME, sans point, niveau 17
# =================================================================================================


def m13_pgcd(texte, cases, fin):
    vs = [var('w', '0..2'), var('g', '3..15'), var('u', '2..9'), var('v', '2..9'),
          var('A', 'eval:g*u'), var('B', 'eval:g*v')]
    steps = ['Le nombre cherché doit diviser $' + v('A') + '$ et $' + v('B') + '$ : c\'est un'
             ' **diviseur commun**. On cherche le plus grand : le PGCD.',
             '$' + v('A') + '=' + v('g') + '\\times' + v('u') + '$ et $' + v('B') + '=' + v('g')
             + '\\times' + v('v') + '$, et $' + v('u') + '$ et $' + v('v') + '$ n\'ont aucun'
             ' diviseur commun autre que $1$ : on ne peut pas faire plus grand que $' + v('g')
             + '$.', fin]
    return variation(texte + '\n\n' + cases, vs, [v('g')], steps,
                     ['u>v', 'gcd(u,v)==1', 'g*u<=200'])


def m13_ppcm():
    vs = [var('g', '2..6'), var('u', '2..7'), var('v', '2..7'), var('A', 'eval:g*u'),
          var('B', 'eval:g*v'), var('L', 'eval:g*u*v')]
    st = ('Deux phares s\'allument en même temps. Le premier se rallume toutes les $' + v('A')
          + '~\\unit{s}$, le second toutes les $' + v('B') + '~\\unit{s}$.\n\nAu bout de combien'
          ' de secondes se rallumeront-ils de nouveau **ensemble**, pour la première fois ?\n\n'
          'Au bout de $?$ secondes.')
    steps = ['Le premier phare se rallume aux multiples de $' + v('A') + '$, le second aux'
             ' multiples de $' + v('B') + '$. On cherche le plus petit **multiple commun** : le'
             ' PPCM.',
             'On parcourt les multiples de $' + v('A') + '$ : $' + v('A') + '\\times' + v('v')
             + '=' + v('L') + '=' + v('B') + '\\times' + v('u') + '$ est le premier qui est aussi'
             ' un multiple de $' + v('B') + '$.',
             'Ils se rallument ensemble au bout de $' + col(v('L') + '~\\unit{s}') + '$.']
    return variation(st, vs, [v('L')], steps, ['u>v', 'gcd(u,v)==1', 'g*u*v<=200'])


SACHETS = prenom('w', ['Mehdi', 'Clara', 'Louis'])
MODELES['13-problemes-pgcd-ppcm'] = modele(
    'Problèmes de PGCD et de PPCM',
    'Plus grand nombre de sachets identiques avec 84 billes et 60 bonbons (12), plus grande'
    ' longueur de morceaux, deux phares qui se rallument ensemble (PPCM) (pièges : un diviseur'
    ' commun qui n\'est pas le plus grand, confondre PGCD et PPCM)',
    17, 120,
    [m13_pgcd(SACHETS + ' a $' + v('A') + '$ billes et $' + v('B') + '$ bonbons. Il veut faire'
              ' des sachets **tous identiques** (même nombre de billes, même nombre de bonbons),'
              ' en utilisant toutes les billes et tous les bonbons.\n\nQuel est le plus grand'
              ' nombre de sachets possible ?', '$?$ sachets',
              'On fait $' + col(v('g')) + '$ sachets de $' + v('u') + '$ billes et $' + v('v')
              + '$ bonbons.'),
     m13_pgcd('On coupe deux rubans de $' + v('A') + '~\\unit{cm}$ et de $' + v('B')
              + '~\\unit{cm}$ en morceaux **tous de même longueur**, sans aucune chute, les plus'
              ' longs possible.\n\nQuelle est la longueur d\'un morceau ?',
              '$?~\\unit{cm}$',
              'Chaque morceau mesure $' + col(v('g') + '~\\unit{cm}') + '$ : on obtient $'
              + v('u') + '$ et $' + v('v') + '$ morceaux.'),
     m13_ppcm()],
    [spec('84 billes et 60 bonbons : 12 sachets', 0, {'w': 0, 'g': 12, 'u': 7, 'v': 5}, '12',
          'correct'),
     spec('Erreur : 6, diviseur commun pas le plus grand', 0, {'w': 0, 'g': 12, 'u': 7, 'v': 5},
          '6', 'incorrect'),
     spec('Erreur : PPCM 420', 0, {'w': 0, 'g': 12, 'u': 7, 'v': 5}, '420', 'incorrect'),
     spec('Rubans de 90 et 54 cm : 18', 1, {'w': 0, 'g': 18, 'u': 5, 'v': 3}, '18',
          'correct'),
     spec('Phares 12 s et 18 s : 36', 2, {'g': 6, 'u': 3, 'v': 2}, '36', 'correct'),
     spec('Erreur : 12 × 18 = 216', 2, {'g': 6, 'u': 3, 'v': 2}, '216', 'incorrect'),
     spec('Erreur : PGCD 6', 2, {'g': 6, 'u': 3, 'v': 2}, '6', 'incorrect')])

# Le prénom « Il » des sachets : Clara est une fille.
MODELES['13-problemes-pgcd-ppcm']['variations'][0]['statement'] = \
    MODELES['13-problemes-pgcd-ppcm']['variations'][0]['statement'].replace(
        'Il veut', '{{if:w==1|Elle|Il}} veut')

for nom, m in MODELES.items():
    with open(f'{DOSSIER}/{nom}.json', 'w') as f:
        json.dump(m, f, ensure_ascii=False, indent='\t')
        f.write('\n')
print(len(MODELES), 'modèles écrits')
