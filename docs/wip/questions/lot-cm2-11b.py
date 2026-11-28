"""Écrit les 5 modèles du lot 11b du CM2 (problèmes en plusieurs étapes) dans scripts/questions/cm2-11b/.

Phase 0 validée par David le 2026-11-18 (§ 18 et 18.1 du journal `docs/archive/wip/questions-cm2-progress.md`) :
064 en case choix à plusieurs réponses (cocher toutes les solutions) ; 062 sans les dominos (déjà au
CM1) ; 064 au niveau 1 de « Préalgorithmique » ; 063, les deux sens de pose des torchons ; un seul lot.
Niveaux : en deux étapes ou plus 12 et 13, produits cartésiens 3, optimisation 2, Préalgorithmique 1.

Bornes (`cycle3.json`, exemples de réussite CM2 p. 11-14) : Qassim, Côme, Yseult, Léo et Lucie (119) ;
Romy (060) ; arbre, liste (062) ; étagères, torchons (063) ; rectangles d'aire donnée, œufs en boîtes
de 6 et 10, groupes impairs (064).

Patron et gabarits : `lot-cm2-11a.py` (recopiés ci-dessous). Case choix à plusieurs réponses : l'attendu
est calculé, un choix faux rend l'indice d'un choix vrai (`f`), un indice répété compte une fois.

    python3 docs/wip/questions/lot-cm2-11b.py scripts/questions/cm2-11b
"""
import os
import json
import os
import sys

DOSSIER = sys.argv[1]
ENTIERS = {'constraints': {'spacesFromFourDigits': True}}
DECIMAUX = {'constraints': {'spacesFromFourDigits': True, 'zeros': 'off'}}
DECIMAUX_FRACTIONS = {'constraints': {'spacesFromFourDigits': True, 'zeros': 'off',
                                      'reducedFractions': 'off'}}
VIRGULE_EXIGEE = {'pattern': 'a:number'}
MODELES = {}

# ---- Gabarits (comme lot-cm1-6.py) ----


def spec(desc, vi, variables, answers, status, violations=None):
    s = {'description': desc, 'variationIndex': vi,
         'variables': {k: str(x) for k, x in variables.items()},
         'answers': answers if isinstance(answers, list) else [answers],
         'expected': {'status': status}}
    if violations:
        s['expected']['constraintViolations'] = violations
    return s


def modele(title, description, level, variations, specs, options=ENTIERS, delay=120):
    # le rangement (sous-notion du point) et le tag sont posés par la migration (ADR 0035)
    return {'title': title, 'description': description, 'grades': ['CM2'], 'level': level,
            'delay': delay, 'status': 'draft', 'options': options, 'variations': variations,
            'testSpecs': specs}


def var(nom, expression):
    return {'name': nom, 'expression': expression}


def variation(enonce, variables, reponses, etapes, conditions=None):
    """`reponses` : attendus (`{{eval:…}}`) ou dicts de case, une par case."""
    v = {'statement': enonce, 'variables': variables}
    if conditions:
        v['conditions'] = conditions
    v['blanks'] = [r if isinstance(r, dict) else {'expectedAnswer': r} for r in reponses]
    v['correction'] = {'steps': etapes}
    return v


def probleme(texte, question, reponse, variables, conditions, etapes):
    return variation(texte + '\n\n' + question, variables, [reponse], etapes, conditions)


def decimal(x):
    return {'expectedAnswer': x, 'requiredForm': VIRGULE_EXIGEE}


def v(x):
    return '${{' + x + '}}$'


def ev(x):
    return '{{eval:' + x + '}}'


def evd(x):
    return '{{eval:' + x + ';d}}'


def col(x, k=0):
    return '\\textcolor{{{color:primary.' + str(k) + '}}}{' + x + '}'


def fr(n, d):
    return '\\frac{' + n + '}{' + d + '}'


def selon(k, textes, n=1):
    """`{{if:k==1|…|{{if:k==2|…|…}}}}` : le texte numéro k (à partir de 1)."""
    if len(textes) == 1:
        return textes[0]
    return '{{if:' + k + '==' + str(n) + '|' + textes[0] + '|' + selon(k, textes[1:], n + 1) + '}}'


def esp(n):
    """Réponse tapée avec les espaces de l'école : 342320 → 342\\,320."""
    return f'{n:,}'.replace(',', '\\,')


def trois(x):
    """Les trois chiffres d'une classe, zéros compris : 7 → « 007 »."""
    return (ev(f'floor(mod(({x}),1000)/100)') + ev(f'floor(mod(({x}),100)/10)')
            + ev(f'mod(({x}),10)'))


def grp(x):
    """Entier de 1 000 à 999 999 en texte simple, groupé : « 245 300 » (étiquette d'un schéma)."""
    return ev(f'floor(({x})/1000)') + ' ' + trois(x)


def grp_m(x):
    """Entier de 1 000 000 à 999 999 999 en texte simple, groupé : « 4 503 120 »."""
    return ev(f'floor(({x})/1000000)') + ' ' + trois(f'floor(({x})/1000)') + ' ' + trois(x)


def euros(c):
    """Prix de `c` centimes, toujours à deux décimales (« 7.50 », affiché « 7,50 »)."""
    return ('{{eval:floor((' + c + ')/100)}}.{{eval:floor(mod(' + c + ',100)/10)}}{{eval:mod('
            + c + ',10)}}')


def prix(c):
    return '$' + euros(c) + '~\\unit{€}$'


def euros_txt(c):
    """Prix en texte simple pour un schéma : « 32,25 € »."""
    return (ev(f'floor(({c})/100)') + ',' + ev(f'floor(mod(({c}),100)/10)') + ev(f'mod(({c}),10)')
            + ' €')


def en_euros(c):
    """Attendu d'une case en euros : `c` centimes, écriture décimale à virgule."""
    return decimal('{{eval:(' + c + ')/100;d}}')


def prix_var(nom, bornes_euros, bornes_centimes='1..99'):
    """Les trois variables d'un prix : euros `nomE`, centimes `nomC`, total en centimes `nom`."""
    return [var(nom + 'E', bornes_euros), var(nom + 'C', bornes_centimes),
            var(nom, 'eval:100*' + nom + 'E+' + nom + 'C')]


def prix_spec(nom, euros_, centimes):
    return {nom + 'E': euros_, nom + 'C': centimes, nom: 100 * euros_ + centimes}


def schema(lignes):
    """Bloc schéma en barres, collé à la fin d'une étape du corrigé."""
    return '\n\n```schema-barres\n' + '\n'.join(lignes) + '\n```'


def repete(k, etiquette, kmax=9, longueur=None):
    """`k` segments identiques (k de 2 à kmax), séparés par « ; »."""
    seg = etiquette + (' (' + longueur + ')' if longueur else '')
    return seg + ' ; ' + seg + ''.join(
        '{{if:' + k + '>' + str(j - 1) + '| ; ' + seg + '|}}' for j in range(3, kmax + 1))


def choix(lignes):
    """Case « choix » dans l'ordre écrit (l'attendu est l'indice d'origine)."""
    return '\n\n```choix\nmelanger: non\n' + ''.join('- ' + c + '\n' for c in lignes) + '```'


EURO = '~\\text{€}'  # juste après une case : case de nombre


def choix_plusieurs(lignes):
    """Case « choix » à plusieurs bonnes réponses, dans l'ordre écrit."""
    return ('\n\n```choix\nplusieurs: oui\nmelanger: non\n' + ''.join('- ' + c + '\n' for c in lignes)
            + '```')


def divise(n, d):
    """1 si `d` divise `n`, 0 sinon (expression)."""
    return f'(1-min(mod({n},{d}),1))'


def plus_petit(exprs):
    """min(a, min(b, …)) emboîtés."""
    if len(exprs) == 1:
        return exprs[0]
    return 'min(' + exprs[0] + ',' + plus_petit(exprs[1:]) + ')'


def attendu_choix(nb, bouche_trou='f'):
    """Indices des choix vrais (variables t0, t1…) ; un choix faux rend l'indice `f`, vrai lui
    aussi (un indice répété compte une fois)."""
    return ';'.join(ev(f'{i}*t{i}+{bouche_trou}*(1-t{i})') for i in range(nb))


def vars_bouche_trou(nb):
    """`f` = le plus petit indice vrai."""
    return var('f', 'eval:' + plus_petit([f'{i}+99*(1-t{i})' for i in range(nb)]))


SOMME_T = lambda nb: ' + '.join(f't{i}' for i in range(nb))  # noqa: E731

# =============== 11b-1. CM2-119 : additifs en plusieurs étapes ===============

# BO (Qassim) : billet de 50 €, deux prix connus, la monnaie rendue ; le troisième prix ?
AD_PRIX = probleme(
    'Qassim achète un reblochon à ' + prix('a') + ', une tranche de beaufort à ' + prix('b')
    + ' et un camembert. Il donne un billet de $50~\\unit{€}$ au fromager, qui lui rend '
    + prix('5000-a-b-c') + '.',
    'Quel est le prix du camembert ?\n\nLe camembert coûte $?' + EURO + '$.',
    en_euros('c'), prix_var('a', '4..19', '0..99') + prix_var('b', '6..24') + prix_var('c', '2..9'),
    ['5000 - a - b - c >= 150', 'mod(5000-a-b-c,10) != 0'],
    ['**Ce que Qassim a dépensé.** Il a donné $50~\\unit{€}$ et on lui a rendu '
     + prix('5000-a-b-c') + ' : $50 - ' + euros('5000-a-b-c') + ' = ' + euros('a+b+c') + '$.'
     + schema(['Billet : 50 € (10)', 'Fromages, monnaie : ' + euros_txt('a') + ' (3) ; '
               + euros_txt('b') + ' (3) ; ? (2) ; ' + euros_txt('5000-a-b-c') + ' (2)']),
     '**Les deux prix connus.** $' + euros('a') + ' + ' + euros('b') + ' = ' + euros('a+b') + '$.',
     '**Le camembert.** C\'est ce qui manque : $' + euros('a+b+c') + ' - ' + euros('a+b') + ' = '
     + col(euros('c')) + '$.',
     'Le camembert coûte ' + prix('c') + '.',
     'On vérifie : $' + euros('a') + ' + ' + euros('b') + ' + ' + euros('c') + ' + '
     + euros('5000-a-b-c') + ' = 50$ ; on retrouve le billet.'])

# BO (Côme) : retire X, dépense Y, il reste Z ; au départ ?
AD_DEPART = probleme(
    'Côme sort faire des courses. Il passe d\'abord à la banque, où il retire $' + ev('10*x')
    + '~\\unit{€}$ au distributeur. Puis il achète un rôti à ' + prix('y') + ' chez le boucher.'
    ' En rentrant, il constate qu\'il lui reste ' + prix('z') + '.',
    'Quelle somme d\'argent Côme avait-il en sortant de chez lui ?\n\nIl avait $?' + EURO + '$.',
    en_euros('z+y-1000*x'), [var('x', '2..8')] + prix_var('y', '9..39') + prix_var('z', '12..69'),
    ['z + y - 1000 * x >= 300', 'mod(z+y,100) != 0'],
    ['On **remonte le temps**, de la fin vers le début, en faisant chaque fois l\'inverse.',
     '**Avant la boucherie.** Il avait ce qui lui reste, plus le prix du rôti : $' + euros('z')
     + ' + ' + euros('y') + ' = ' + euros('z+y') + '$.',
     '**Avant la banque.** Le distributeur lui a donné $' + ev('10*x') + '~\\unit{€}$ : avant, il'
     ' en avait autant de moins. $' + euros('z+y') + ' - ' + ev('10*x') + ' = '
     + col(euros('z+y-1000*x')) + '$.',
     'Côme avait ' + prix('z+y-1000*x') + ' en sortant de chez lui.',
     'On vérifie dans l\'ordre de l\'histoire : $' + euros('z+y-1000*x') + ' + ' + ev('10*x')
     + ' - ' + euros('y') + ' = ' + euros('z') + '$.'])

# BO (Yseult) : a/(q d) et b/d donnés, la part gardée ; q d ≤ 60
GARDE = fr(ev('q*d-a-q*b'), ev('q*d'))
AD_FRACTIONS = probleme(
    'Yseult partage une pizza avec sa sœur et son frère. Elle donne $' + fr('{{a}}', ev('q*d'))
    + '$ de la pizza à sa sœur et $' + fr('{{b}}', '{{d}}') + '$ de la pizza à son frère.',
    'Quelle fraction de la pizza Yseult a-t-elle gardée pour elle ?\n\nElle a gardé $?$ de la'
    ' pizza.',
    GARDE, [var('d', '2..12'), var('q', '2..5'), var('b', '1..{{eval:d-1}}'),
            var('a', '1..{{eval:q*d-1}}')],
    ['q * d <= 60', 'mod(a,q) != 0', 'q * d - a - q * b >= 1', 'mod(b,2) + mod(d,2) >= 1',
     'mod(b,3) + mod(d,3) >= 1', 'mod(b,5) + mod(d,5) >= 1'],
    ['**Même dénominateur.** Les parts ne sont pas de la même taille : on écrit $'
     + fr('{{b}}', '{{d}}') + '$ avec le dénominateur $' + ev('q*d') + '$.',
     '$$' + fr('{{b}}', '{{d}}') + ' = ' + fr(ev('q*b'), ev('q*d')) + '$$',
     '**Ce qu\'elle a donné.** $' + fr('{{a}}', ev('q*d')) + ' + ' + fr(ev('q*b'), ev('q*d'))
     + ' = ' + fr(ev('a+q*b'), ev('q*d')) + '$.',
     '**Ce qu\'elle a gardé.** La pizza entière, c\'est $' + fr(ev('q*d'), ev('q*d')) + '$ : $'
     + fr(ev('q*d'), ev('q*d')) + ' - ' + fr(ev('a+q*b'), ev('q*d')) + ' = ' + col(GARDE) + '$.',
     'Yseult a gardé $' + GARDE + '$ de la pizza.'])

# BO (Léo et Lucie) : la somme et l'écart ; chacun ?
AD_SOMME_ECART = variation(
    'Léo et Lucie ont ' + prix('2*x+g') + ' à eux deux. Lucie a ' + prix('g')
    + ' de plus que Léo.\n\nCombien chaque enfant a-t-il d\'euros ?\n\nLéo a $?' + EURO
    + '$.\n\nLucie a $?' + EURO + '$.',
    prix_var('x', '8..39') + prix_var('g', '1..12'), [en_euros('x'), en_euros('x+g')],
    ['**Le schéma.** Lucie a autant que Léo, et encore ' + prix('g') + '.'
     + schema(['Léo : ? (4)', 'Lucie : ? (4) ; ' + euros_txt('g') + ' (2)',
               'total : ' + euros_txt('2*x+g')]),
     '**On enlève l\'écart.** Il reste deux parts égales : $' + euros('2*x+g') + ' - '
     + euros('g') + ' = ' + euros('2*x') + '$.',
     '**Léo.** $' + euros('2*x') + ' \\div 2 = ' + col(euros('x')) + '$.',
     '**Lucie.** $' + euros('x') + ' + ' + euros('g') + ' = ' + col(euros('x+g')) + '$.',
     'On vérifie : $' + euros('x') + ' + ' + euros('x+g') + ' = ' + euros('2*x+g') + '$.'],
    ['g < x', 'mod(2*x+g,10) != 0'])

QASSIM = {**prix_spec('a', 9, 0), **prix_spec('b', 13, 85), **prix_spec('c', 5, 70)}
COME = {'x': 4, **prix_spec('y', 17, 80), **prix_spec('z', 31, 40)}
YSEULT = {'d': 4, 'q': 3, 'b': 1, 'a': 5}          # 1 − 5/12 − 3/12 = 4/12
LEO = {**prix_spec('x', 17, 80), **prix_spec('g', 7, 80)}  # 43,40 €
MODELES['01-problemes-additifs-en-plusieurs-etapes'] = modele(
    'Problèmes additifs en plusieurs étapes',
    'Un prix manquant (un billet, deux prix, la monnaie rendue), la somme du départ après deux'
    ' actions (« il retire…, il dépense…, il lui reste… »), la part de pizza gardée (5/12 et 1/4'
    ' donnés), deux montants connus par leur somme et leur écart ; schéma en barres au corrigé', 12,
    [AD_PRIX, AD_DEPART, AD_FRACTIONS, AD_SOMME_ECART],
    [spec('Qassim : 9 + 13,85, billet 50, rendu 21,45 → 5,70 €', 0, QASSIM, '5,7', 'correct'),
     spec('Erreur : Qassim, une étape seulement (28,55)', 0, QASSIM, '28,55', 'incorrect'),
     spec('Erreur : Qassim, tout ajouté (44,30)', 0, QASSIM, '44,3', 'incorrect'),
     spec('Côme : 31,40 + 17,80 − 40 = 9,20 €', 1, COME, '9,2', 'correct'),
     spec('Erreur : Côme, tout ajouté (89,20)', 1, COME, '89,2', 'incorrect'),
     spec('Erreur : Côme, dans l\'ordre de l\'histoire (53,60)', 1, COME, '53,6', 'incorrect'),
     spec('Yseult : 1 − 5/12 − 1/4 = 4/12', 2, YSEULT, '\\frac{4}{12}', 'correct'),
     spec('Yseult : 1/3, fraction égale', 2, YSEULT, '\\frac{1}{3}', 'correct'),
     spec('Erreur : Yseult, ce qu\'elle a donné (8/12)', 2, YSEULT, '\\frac{8}{12}', 'incorrect'),
     spec('Erreur : Yseult, numérateurs et dénominateurs ajoutés puis ôtés de 1 (10/16)', 2, YSEULT,
          '\\frac{10}{16}', 'incorrect'),
     spec('Léo et Lucie : 43,40 €, 7,80 € de plus → 17,80 et 25,60', 3, LEO, ['17,8', '25,6'],
          'correct'),
     spec('Erreur : Léo et Lucie, moitié puis écart (21,70 ; 29,50)', 3, LEO, ['21,7', '29,5'],
          'incorrect'),
     spec('Erreur : Léo et Lucie, inversés', 3, LEO, ['25,6', '17,8'], 'incorrect')],
    options=DECIMAUX_FRACTIONS, delay=180)

# =============== 11b-2. CM2-060 : mixtes en plusieurs étapes ===============

# BO (Romy) : n pains à p, m chaussons inconnus, un billet, la monnaie ; un chausson ?
MX_UNITE = probleme(
    'Romy achète ' + v('n') + ' pains aux raisins à ' + prix('p') + ' l\'un et ' + v('m')
    + ' chaussons aux pommes. Elle donne un billet de $20~\\unit{€}$ au boulanger, qui lui rend '
    + prix('2000-n*p-m*u') + '.',
    'Quel est le prix d\'un chausson aux pommes ?\n\nUn chausson coûte $?' + EURO + '$.',
    en_euros('u'), [var('n', '2..5'), var('m', '3..8')] + prix_var('p', '1..2')
    + prix_var('u', '1..2'),
    ['2000 - n * p - m * u >= 100', 'p != u'],
    ['**Ce que Romy a dépensé.** $20 - ' + euros('2000-n*p-m*u') + ' = ' + euros('n*p+m*u')
     + '$.',
     '**Les pains.** ${{n}} \\times ' + euros('p') + ' = ' + euros('n*p') + '$.',
     '**Les chaussons ensemble.** $' + euros('n*p+m*u') + ' - ' + euros('n*p') + ' = '
     + euros('m*u') + '$.'
     + schema(['Chaussons : ' + repete('m', '?', 8) + ' = ' + euros_txt('m*u')]),
     '**Un chausson.** Les ' + v('m') + ' chaussons coûtent tous le même prix : $'
     + euros('m*u') + ' \\div {{m}} = ' + col(euros('u')) + '$.',
     'Un chausson aux pommes coûte ' + prix('u') + '.'])

# un achat puis un partage : k boîtes à p = m × t ; chacun paie k × t
MX_PARTAGE = probleme(
    v('m') + ' amis achètent ensemble ' + v('k') + ' boîtes de jeux à ' + prix('m*t')
    + ' la boîte. Ils partagent la dépense en parts égales.',
    'Combien chaque ami paie-t-il ?\n\nChacun paie $?' + EURO + '$.',
    en_euros('k*t'), [var('m', '3..6'), var('k', '2..9'), var('t', '70..450')],
    ['mod(t,5) == 0', 'k != m'],
    ['**La dépense totale.** ${{k}} \\times ' + euros('m*t') + ' = ' + euros('k*m*t') + '$.',
     '**Le partage.** On partage en ' + v('m') + ' parts égales : $' + euros('k*m*t')
     + ' \\div {{m}} = ' + col(euros('k*t')) + '$.',
     'Chaque ami paie ' + prix('k*t') + '.',
     'On vérifie : ${{m}} \\times ' + euros('k*t') + ' = ' + euros('k*m*t') + '$.'])

# une recette moins des frais : n objets vendus à p, frais F (en euros entiers)
MX_RECETTE = probleme(
    'Pour financer une sortie, la classe vend ' + v('n') + ' gâteaux à ' + prix('p')
    + ' le gâteau. Les ingrédients ont coûté $' + ev('F') + '~\\unit{€}$.',
    'Combien d\'argent reste-t-il pour la sortie ?\n\nIl reste $?' + EURO + '$.',
    en_euros('n*p-100*F'), [var('n', '40..360'), var('F', '35..480')] + prix_var('p', '1..4'),
    ['n * p - 100 * F >= 2000', 'mod(p,10) != 0', 'mod(n,10) != 0'],
    ['**La recette.** ${{n}} \\times ' + euros('p') + ' = ' + euros('n*p') + '$.',
     '**On retire les frais.** $' + euros('n*p') + ' - {{F}} = ' + col(euros('n*p-100*F'))
     + '$.',
     'Il reste ' + prix('n*p-100*F') + ' pour la sortie.',
     'On vérifie : $' + euros('n*p-100*F') + ' + {{F}} = ' + euros('n*p') + '$ ; on retrouve la'
     ' recette.'])

ROMY = {'n': 3, 'm': 7, **prix_spec('p', 1, 35), **prix_spec('u', 1, 15)}  # rendu 7,90 €
AMIS = {'m': 4, 'k': 3, 't': 315}          # boîte 12,60 € ; total 37,80 ; chacun 9,45
GATEAUX = {'n': 125, 'F': 65, **prix_spec('p', 1, 50)}   # 187,50 − 65 = 122,50
MODELES['02-problemes-mixtes-en-plusieurs-etapes'] = modele(
    'Problèmes mixtes en plusieurs étapes',
    'Les quatre opérations dans un même problème : un prix à l\'unité retrouvé à partir de la'
    ' monnaie rendue (trois pains, sept chaussons, un billet de 20 €), un achat partagé entre'
    ' amis, une recette moins des frais', 13,
    [MX_UNITE, MX_PARTAGE, MX_RECETTE],
    [spec('Romy : 3 × 1,35 et 7 chaussons, rendu 7,90 → 1,15 €', 0, ROMY, '1,15', 'correct'),
     spec('Erreur : Romy, les pains oubliés ((20 − 7,90) ÷ 7 ≈ 1,73)', 0, ROMY, '1,73',
          'incorrect'),
     spec('Erreur : Romy, les sept chaussons ensemble (8,05)', 0, ROMY, '8,05', 'incorrect'),
     spec('amis : 3 × 12,60 ÷ 4 = 9,45 €', 1, AMIS, '9,45', 'correct'),
     spec('Erreur : amis, une boîte partagée (3,15)', 1, AMIS, '3,15', 'incorrect'),
     spec('Erreur : amis, sans partager (37,80)', 1, AMIS, '37,8', 'incorrect'),
     spec('gâteaux : 125 × 1,50 − 65 = 122,50 €', 2, GATEAUX, '122,5', 'correct'),
     spec('Erreur : gâteaux, la recette seulement (187,50)', 2, GATEAUX, '187,5', 'incorrect'),
     spec('Erreur : gâteaux, frais ajoutés (252,50)', 2, GATEAUX, '252,5', 'incorrect')],
    options=DECIMAUX, delay=180)

# =============== 11b-3. CM2-062 : dénombrement ===============

# k lancers (3 ou 4) : 2 × 2 × 2 (× 2)
RESULTATS_3 = 'PPP, PPF, PFP, PFF, FPP, FPF, FFP, FFF'
DN_PIECE = probleme(
    'Telma lance une pièce de monnaie ' + v('k') + ' fois de suite et note chaque fois « pile »'
    ' (P) ou « face » (F). Par exemple, elle peut obtenir {{if:k==3|F, F, P|F, F, P, F}}.',
    'Combien de suites de résultats différentes Telma peut-elle obtenir ?\n\nElle peut en obtenir'
    ' $?$.',
    ev('8+8*(k-3)'), [var('k', '3..4')], [],
    ['On fait un **arbre** : au premier lancer, 2 résultats (P ou F) ; pour chacun, 2 résultats'
     ' au deuxième lancer, soit $2 \\times 2 = 4$ débuts ; puis encore 2 au troisième lancer.',
     '{{if:k==3|$2 \\times 2 \\times 2 = ' + col('8') + '$.|$2 \\times 2 \\times 2 \\times 2 = '
     + col('16') + '$.}}',
     '{{if:k==3|La liste, sans oubli ni répétition : ' + RESULTATS_3 + '.|Les 8 suites de trois'
     ' lancers (' + RESULTATS_3 + '), chacune suivie de P ou de F : $8 \\times 2 = 16$.}}',
     'Telma peut obtenir $' + ev('8+8*(k-3)') + '$ suites différentes.'])

# trois chiffres x, y, z ; r = 0 : chacun une fois (6) ; r = 1 : répétés permis (27)
DN_NOMBRES = probleme(
    'On écrit des nombres de trois chiffres avec les chiffres ' + v('x') + ', ' + v('y') + ' et '
    + v('z') + ' seulement{{if:r==0|, en utilisant chaque chiffre une fois et une seule (par'
    ' exemple ' + '{{y}}{{x}}{{z}}' + ')|. Un chiffre peut être utilisé plusieurs fois (par'
    ' exemple ' + '{{y}}{{y}}{{x}}' + ')}}.',
    'Combien de nombres différents peut-on écrire ?\n\nOn peut en écrire $?$.',
    ev('6+21*r'), [var('r', '0..1'), var('x', '1..9'), var('y', '1..9'), var('z', '1..9')],
    ['x != y', 'y != z', 'x != z'],
    ['On fait un **arbre** chiffre par chiffre : centaines, puis dizaines, puis unités.',
     '{{if:r==0|Centaines : 3 choix ; dizaines : il reste 2 chiffres ; unités : il en reste 1.'
     ' $3 \\times 2 \\times 1 = ' + col('6') + '$.|Centaines : 3 choix ; dizaines : encore 3 ;'
     ' unités : encore 3. $3 \\times 3 \\times 3 = ' + col('27') + '$.}}',
     '{{if:r==0|La liste : {{x}}{{y}}{{z}}, {{x}}{{z}}{{y}}, {{y}}{{x}}{{z}}, {{y}}{{z}}{{x}},'
     ' {{z}}{{x}}{{y}}, {{z}}{{y}}{{x}}.|Par exemple, les 9 nombres qui commencent par {{x}} :'
     ' {{x}}{{x}}{{x}}, {{x}}{{x}}{{y}}, {{x}}{{x}}{{z}}, {{x}}{{y}}{{x}}, {{x}}{{y}}{{y}},'
     ' {{x}}{{y}}{{z}}, {{x}}{{z}}{{x}}, {{x}}{{z}}{{y}}, {{x}}{{z}}{{z}} ; autant pour {{y}} et'
     ' pour {{z}}.}}',
     'On peut écrire $' + ev('6+21*r') + '$ nombres différents.'])

# tournoi : n équipes, chacune joue une fois contre chaque autre
DN_TOURNOI = probleme(
    v('n') + ' équipes participent à un tournoi de handball. Chaque équipe joue une fois, et une'
    ' seule, contre chacune des autres équipes.',
    'Combien de matchs y a-t-il en tout ?\n\nIl y a $?$ matchs.',
    ev('n*(n-1)/2'), [var('n', '4..10')], [],
    ['On fait une **liste organisée** : la première équipe joue contre les $' + ev('n-1')
     + '$ autres ; la deuxième a déjà joué contre la première, il lui reste $' + ev('n-2')
     + '$ matchs ; et ainsi de suite, jusqu\'à l\'avant-dernière, qui n\'a plus qu\'un match.',
     '$$' + selon('n', [' + '.join(str(i) for i in range(m - 1, 0, -1)) for m in range(4, 11)], 4)
     + ' = ' + col(ev('n*(n-1)/2')) + '$$',
     'Il y a $' + ev('n*(n-1)/2') + '$ matchs en tout.',
     'Attention : $' + v('n').strip('$') + ' \\times ' + ev('n-1') + ' = ' + ev('n*(n-1)')
     + '$ compterait chaque match deux fois (A contre B, puis B contre A).'])

MODELES['03-problemes-de-denombrement-arbre-liste'] = modele(
    'Problèmes de dénombrement : arbre, liste',
    'Compter sans oubli ni répétition : les suites de 3 ou 4 lancers d\'une pièce, les nombres de'
    ' trois chiffres écrits avec trois chiffres donnés (chacun une fois, ou répétés), les matchs'
    ' d\'un tournoi où chaque équipe rencontre chaque autre ; arbre ou liste au corrigé', 3,
    [DN_PIECE, DN_NOMBRES, DN_TOURNOI],
    [spec('pièce : 3 lancers → 8', 0, {'k': 3}, '8', 'correct'),
     spec('Erreur : pièce, 2 × 3 (6)', 0, {'k': 3}, '6', 'incorrect'),
     spec('pièce : 4 lancers → 16', 0, {'k': 4}, '16', 'correct'),
     spec('Erreur : pièce, 2 × 4 (8)', 0, {'k': 4}, '8', 'incorrect'),
     spec('chiffres une fois : 6', 1, {'r': 0, 'x': 2, 'y': 5, 'z': 7}, '6', 'correct'),
     spec('Erreur : chiffres une fois, 3', 1, {'r': 0, 'x': 2, 'y': 5, 'z': 7}, '3', 'incorrect'),
     spec('chiffres répétés : 27', 1, {'r': 1, 'x': 2, 'y': 5, 'z': 7}, '27', 'correct'),
     spec('Erreur : chiffres répétés, 3 × 3 (9)', 1, {'r': 1, 'x': 2, 'y': 5, 'z': 7}, '9',
          'incorrect'),
     spec('tournoi : 6 équipes → 15', 2, {'n': 6}, '15', 'correct'),
     spec('Erreur : tournoi, chaque match compté deux fois (30)', 2, {'n': 6}, '30', 'incorrect'),
     spec('Erreur : tournoi, 6 × 6 (36)', 2, {'n': 6}, '36', 'incorrect')],
    delay=150)

# =============== 11b-4. CM2-063 : optimisation ===============

# BO (étagères) : planches de L m coupées en morceaux de l m, e équerres, v vis par étagère
X1, X2, X3 = 'P*floor(L/l)', 'floor(E/q)', 'floor(V/w)'
MEILLEUR = plus_petit([X1, X2, X3])
OP_ETAGERES = probleme(
    'Madame Lidon fabrique des étagères. Pour une étagère, il lui faut une planche de $'
    + '{{l}}~\\unit{m}$, ' + v('q') + ' équerres et ' + v('w') + ' vis. Elle dispose de :\n\n- '
    + v('P') + ' planches de ${{L}}~\\unit{m}$, qu\'elle peut couper ;\n- ' + v('E')
    + ' équerres ;\n- ' + v('V') + ' vis.',
    'Combien d\'étagères peut-elle fabriquer au maximum ?\n\nElle peut en fabriquer $?$.',
    ev(MEILLEUR), [var('l', '2..3'), var('L', '4..9'), var('P', '4..12'), var('q', '2..4'),
                   var('E', '20..90'), var('w', '6..12'), var('V', '60..200')],
    ['L > l', 'mod(L,l) != 0', f'{X1} != {X2}', f'{X2} != {X3}', f'{X1} != {X3}',
     f'floor(P*L/l) != {X1}'],
    ['On compte combien d\'étagères permet **chaque fourniture**, puis on garde le **plus petit**'
     ' nombre : au-delà, il manquerait quelque chose.',
     '**Planches.** Dans une planche de ${{L}}~\\unit{m}$, on coupe $' + ev('floor(L/l)')
     + '$ morceau{{if:floor(L/l)>1|x|}} de ${{l}}~\\unit{m}$ (le reste, $' + ev('mod(L,l)')
     + '~\\unit{m}$, ne sert à rien) : ${{P}} \\times ' + ev('floor(L/l)') + ' = ' + ev(X1)
     + '$ étagères.',
     '**Équerres.** ${{E}} \\div {{q}}$ : $' + ev(X2) + '$ étagères'
     + '{{if:mod(E,q)>0| (il reste ' + ev('mod(E,q)') + ' équerre{{if:mod(E,q)>1|s|}})|}}.',
     '**Vis.** ${{V}} \\div {{w}}$ : $' + ev(X3) + '$ étagères'
     + '{{if:mod(V,w)>0| (il reste ' + ev('mod(V,w)') + ' vis)|}}.',
     'Le plus petit des trois nombres : Madame Lidon peut fabriquer au maximum $' + col(ev(MEILLEUR))
     + '$ étagères.'])

# BO (torchons) : tissu W × H cm (W > H), torchons a × b cm, R m de ruban autour de chacun
C1, C2 = 'floor(W/a)*floor(H/b)', 'floor(W/b)*floor(H/a)'
TISSU = 'max(' + C1 + ',' + C2 + ')'
RUBAN = 'floor(100*R/(2*(a+b)))'
OP_TORCHONS = probleme(
    'Azmar fabrique des torchons rectangulaires de ${{a}}~\\unit{cm}$ sur ${{b}}~\\unit{cm}$ ; il'
    ' coud du ruban tout autour de chaque torchon. Il a un reste de tissu rectangulaire de $'
    + evd('W/100') + '~\\unit{m}$ sur $' + evd('H/100') + '~\\unit{m}$, et ${{R}}~\\unit{m}$ de'
    ' ruban.',
    'Combien de torchons Azmar peut-il fabriquer au maximum ?\n\nIl peut en fabriquer $?$.',
    ev('min(' + TISSU + ',' + RUBAN + ')'),
    [var('ai', '6..9'), var('a', 'eval:10*ai'), var('bi', '4..6'), var('b', 'eval:10*bi'),
     var('wi', '20..40'), var('W', 'eval:10*wi'), var('hi', '15..30'), var('H', 'eval:10*hi'),
     var('R', '20..60')],
    ['a > b', 'W > H', f'{C1} != {C2}', f'{C1} >= 4', f'{C2} >= 4', f'{RUBAN} != {TISSU}',
     f'{RUBAN} != min({C1},{C2})'],
    ['**Le tissu.** Tout est en centimètres : $' + evd('W/100') + '~\\unit{m} = {{W}}~\\unit{cm}$,'
     ' $' + evd('H/100') + '~\\unit{m} = {{H}}~\\unit{cm}$. On peut poser les torchons de deux'
     ' façons.',
     'Le long côté du torchon sur le long côté du tissu : $' + ev('floor(W/a)') + '$ torchons'
     ' dans la longueur ($' + '{{W}} \\div {{a}}$), $' + ev('floor(H/b)') + '$ dans la largeur ($'
     '{{H}} \\div {{b}}$), soit $' + ev('floor(W/a)') + ' \\times ' + ev('floor(H/b)') + ' = '
     + ev(C1) + '$ torchons.',
     'Dans l\'autre sens : $' + ev('floor(W/b)') + ' \\times ' + ev('floor(H/a)') + ' = '
     + ev(C2) + '$ torchons. Le tissu permet donc $' + ev(TISSU) + '$ torchons au plus.',
     '**Le ruban.** Le tour d\'un torchon : $2 \\times ({{a}} + {{b}}) = ' + ev('2*(a+b)')
     + '~\\unit{cm}$ ; ${{R}}~\\unit{m} = ' + ev('100*R') + '~\\unit{cm}$, et $' + ev('100*R')
     + ' \\div ' + ev('2*(a+b)') + '$ : $' + ev(RUBAN) + '$ torchons au plus.',
     'Le plus petit des deux nombres : Azmar peut fabriquer au maximum $'
     + col(ev('min(' + TISSU + ',' + RUBAN + ')')) + '$ torchons.'])

LIDON = {'l': 2, 'L': 5, 'P': 6, 'q': 2, 'E': 40, 'w': 9, 'V': 120}   # 12, 20, 13 → 12
AZMAR = {'ai': 8, 'a': 80, 'bi': 5, 'b': 50, 'wi': 30, 'W': 300, 'hi': 24, 'H': 240, 'R': 50}
MODELES['04-problemes-d-optimisation-contraintes'] = modele(
    'Problèmes d\'optimisation : plusieurs contraintes',
    'Le plus grand nombre d\'objets qu\'on peut fabriquer quand plusieurs fournitures limitent :'
    ' des étagères (planches coupées, équerres, vis), des torchons (tissu à découper dans le bon'
    ' sens, ruban autour) ; on garde le plus petit des nombres', 2,
    [OP_ETAGERES, OP_TORCHONS],
    [spec('étagères : 12, 20, 13 → 12', 0, LIDON, '12', 'correct'),
     spec('Erreur : étagères, 6 × 5 ÷ 2 sans couper (15)', 0, LIDON, '15', 'incorrect'),
     spec('Erreur : étagères, le plus grand (20)', 0, LIDON, '20', 'incorrect'),
     spec('Erreur : étagères, les vis (13)', 0, LIDON, '13', 'incorrect'),
     spec('torchons : 12 ou 18 dans le tissu, 19 avec le ruban → 18', 1, AZMAR, '18', 'correct'),
     spec('Erreur : torchons, un seul sens (12)', 1, AZMAR, '12', 'incorrect'),
     spec('Erreur : torchons, le ruban seulement (19)', 1, AZMAR, '19', 'incorrect')],
    delay=240)

# =============== 11b-5. CM2-064 : trouver toutes les solutions ===============

# V1 : rectangles d'aire A (80 à 99) à côtés entiers ; largeur d de 1 à 9 (d × d ≤ A)
RECT_T = [var(f't{d - 1}', 'eval:' + divise('A', d)) for d in range(1, 10)]
TA_RECTANGLES = variation(
    'On cherche tous les rectangles dont les côtés mesurent un nombre entier de centimètres et dont'
    ' l\'aire est égale à ${{A}}~\\unit{cm^2}$. Un rectangle de $2~\\unit{cm}$ sur $10~\\unit{cm}$'
    ' est le même qu\'un rectangle de $10~\\unit{cm}$ sur $2~\\unit{cm}$.\n\nCoche toutes les'
    ' dimensions qui conviennent.'
    + choix_plusieurs([f'${d}~\\unit{{cm}}$ sur $' + ev(f'floor(A/{d})') + '~\\unit{cm}$'
                       for d in range(1, 10)]),
    [var('A', '80..99')] + RECT_T,
    [';'.join(ev(f'{i}*t{i}') for i in range(9))],
    ['On essaie **chaque largeur** dans l\'ordre, de $1$ à $9~\\unit{cm}$ (au-delà, la largeur'
     ' dépasserait la longueur, et on retrouverait les mêmes rectangles). La largeur convient si $'
     '{{A}}$ se divise exactement par elle.',
     ' ; '.join('{{if:t' + str(d - 1) + '==1|$' + str(d) + ' \\times ' + ev(f'A/{d}') + ' = {{A}}$ '
                + '**oui**|$' + str(d) + ' \\times ' + ev(f'floor(A/{d})') + ' = '
                + ev(f'{d}*floor(A/{d})') + '$ non}}' for d in range(1, 10)),
     'Il y a $' + ev(SOMME_T(9)) + '$ rectangles.'],
    [SOMME_T(9) + ' >= 4'])

# V2 : N œufs (90 à 98, pair) en boîtes pleines de 10 (b de 0 à 9) et de 6
def boites6(b):
    x = f'floor((N-{10 * b})/6)'
    return '{{if:' + x + '==0|aucune boîte de 6|$' + ev(x) + '$ boîte{{if:' + x + '>1|s|}} de 6}}'


def boites10(b):
    return {0: 'aucune boîte de 10', 1: '$1$ boîte de 10'}.get(b, f'${b}$ boîtes de 10')


OEUFS_T = [var(f't{b}', 'eval:' + divise(f'(N-{10 * b})', 6)) for b in range(10)]
TA_OEUFS = variation(
    'Alice a ${{N}}$ œufs à ranger dans des boîtes de 6 œufs et des boîtes de 10 œufs ; elle a'
    ' assez de boîtes de chaque sorte. Tous les œufs doivent être rangés, et toutes les boîtes'
    ' utilisées doivent être pleines.\n\nCoche toutes les façons de faire.'
    + choix_plusieurs([boites10(b) + ' et ' + boites6(b) for b in range(10)]),
    [var('j', '0..4'), var('N', 'eval:90+2*j')] + OEUFS_T + [vars_bouche_trou(10)],
    [attendu_choix(10)],
    ['On essaie **chaque nombre de boîtes de 10**, de $0$ à $9$ : les œufs qui restent doivent'
     ' remplir exactement des boîtes de 6.',
     ' ; '.join('{{if:t' + str(b) + '==1|' + ('{{if:N==90|aucun œuf ne reste **oui**|' if b == 9 else '')
                + '$' + ev(f'N-{10 * b}') + ' = 6 \\times ' + ev(f'(N-{10 * b})/6') + '$ **oui**'
                + ('}}' if b == 9 else '') + '|$' + ev(f'N-{10 * b}') + '$ non}}' for b in range(10)),
     'Il y a $' + ev(SOMME_T(10)) + '$ façons.'])

# V3 : n élèves, groupes de même taille, nombre impair d'élèves (3 à 15), au moins deux groupes
GROUPES_T = [var(f't{i}', 'eval:' + divise('n', 2 * i + 3)) for i in range(7)]
TA_GROUPES = variation(
    'Il y a ${{n}}$ élèves dans une classe. Le maître veut faire des groupes ayant tous le même'
    ' nombre d\'élèves ; il veut un nombre impair d\'élèves dans chaque groupe, et au moins deux'
    ' groupes.\n\nCoche toutes les tailles de groupe possibles.'
    + choix_plusieurs([f'groupes de ${2 * i + 3}$ élèves' for i in range(7)]),
    [var('n', '20..45')] + GROUPES_T + [vars_bouche_trou(7)],
    [attendu_choix(7)],
    ['On essaie **chaque nombre impair** : la taille convient si ${{n}}$ se divise exactement'
     ' par elle.',
     ' ; '.join('{{if:t' + str(i) + '==1|${{n}} = ' + str(2 * i + 3) + ' \\times '
                + ev(f'n/{2 * i + 3}') + '$ ' + '**oui**|' + str(2 * i + 3)
                + ' : non}}' for i in range(7)),
     'Il y a $' + ev(SOMME_T(7)) + '$ tailles possibles.'],
    [SOMME_T(7) + ' >= 2', 'n != 34', 'n != 38', 'n != 42'])


def t_vals(truths):
    return {f't{i}': t for i, t in enumerate(truths)}


R84 = {'A': 84, **t_vals([1 if 84 % d == 0 else 0 for d in range(1, 10)])}
O96_T = [1 if (96 - 10 * b) % 6 == 0 else 0 for b in range(10)]
O96 = {'j': 3, 'N': 96, **t_vals(O96_T), 'f': 0}
G30_T = [1 if 30 % (2 * i + 3) == 0 else 0 for i in range(7)]
G30 = {'n': 30, **t_vals(G30_T), 'f': 0}
MODELES['05-trouver-toutes-les-solutions'] = modele(
    'Trouver toutes les solutions',
    'Recherche exhaustive, en cochant toutes les solutions : les rectangles d\'aire donnée à côtés'
    ' entiers, les façons de ranger des œufs en boîtes pleines de 6 et de 10, les tailles'
    ' impaires de groupes d\'une classe ; essai organisé au corrigé', 1,
    [TA_RECTANGLES, TA_OEUFS, TA_GROUPES],
    [spec('rectangles 84 : 1, 2, 3, 4, 6, 7', 0, R84, '0;1;2;3;5;6', 'correct'),
     spec('Partiel : rectangles 84, le 7 × 12 oublié', 0, R84, '0;1;2;3;5', 'unoptimal_form'),
     spec('Erreur : rectangles 84, 5 × 16 coché', 0, R84, '0;1;2;3;4;5;6', 'incorrect'),
     spec('œufs 96 : 0, 3, 6, 9 boîtes de 10', 1, O96, '0;3;6;9', 'correct'),
     spec('Partiel : œufs 96, une seule façon', 1, O96, '3', 'unoptimal_form'),
     spec('Erreur : œufs 96, 1 boîte de 10 cochée', 1, O96, '0;1;3;6;9', 'incorrect'),
     spec('groupes 30 : 3, 5, 15', 2, G30, '0;1;6', 'correct'),
     spec('Partiel : groupes 30, le 15 oublié', 2, G30, '0;1', 'unoptimal_form'),
     spec('Erreur : groupes 30, 9 coché', 2, G30, '0;1;3;6', 'incorrect')],
    delay=240)

os.makedirs(DOSSIER, exist_ok=True)
for nom, m in MODELES.items():
    with open(f'{DOSSIER}/{nom}.json', 'w') as fh:
        json.dump(m, fh, ensure_ascii=False, indent='\t')
        fh.write('\n')
print(len(MODELES), 'modèles écrits')
