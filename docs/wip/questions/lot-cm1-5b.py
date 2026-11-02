"""Écrit les 10 modèles du lot 5b du CM1 (masses + contenances) dans scripts/questions/cm1-5b/.

Phase 0 validée par David le 2026-11-02 (§ 14 et 14 bis du journal
`docs/wip/questions-cm1-progress.md`, lignes 5b-1 à 5c-4). Bornes `cycle3.json`, CM1-076 à 085 :
- masses : du milligramme au kilogramme et la tonne (pas de quintal) ; 3 g + 5 cg = 305 cg ;
  6,2 t = 6 200 kg ; 1/4 kg = 250 g ; ranger jusqu'à trois masses ; 8,2 kg + 840 g ;
- contenances : du millilitre à l'hectolitre ; 23 dL en L ; 6,4 L en cL ; ranger jusqu'à quatre
  contenances ; 1 L − 25 cL.
Décisions (celles du lot 5a) : réponse numérique en case, l'unité écrite après la case ; décimaux
à virgule exigée (motif `a:number`) ; fractions dans l'énoncé seulement ; choix en case « choix » ;
corrigés par les relations entre unités successives, jamais par le tableau de conversion.
Catégories `Grandeurs · Masses / Contenances · …` (celles du CE1 et du CE2) ; niveaux relevés au
MCP le 2026-11-02 : Masses / Unités 1-5 → 6 (unités), 7 (choisir), 8 (relations) ; Comparaison
1-3 → 4 ; Ordres de grandeur 1-2 → 3, 4 ; Contenances / Unités 1-2 → 3, 4, 5 ; Comparaison
vide → 1.

    python3 docs/wip/questions/lot-cm1-5b.py scripts/questions/cm1-5b
"""
import json
import sys

DOSSIER = sys.argv[1]
OPTIONS = {'constraints': {'spacesFromFourDigits': True}}
VIRGULE_EXIGEE = {'pattern': 'a:number'}

# ---- Gabarits (ceux du lot 5a) ----


def spec(desc, vi, variables, answers, status, violations=None):
    s = {'description': desc, 'variationIndex': vi,
         'variables': {k: str(x) for k, x in variables.items()},
         'answers': answers if isinstance(answers, list) else [answers],
         'expected': {'status': status}}
    if violations:
        s['expected']['constraintViolations'] = violations
    return s


def modele(title, description, domain, subdomain, level, variations, specs, delay=60):
    # theme / domain / subdomain : anciennes colonnes, remplies pour create-questions ; le
    # rangement (sous-notion du point) est posé par la migration
    return {'title': title, 'description': description, 'grades': ['CM1'], 'theme': 'Grandeurs',
            'domain': domain, 'subdomain': subdomain, 'level': level, 'delay': delay,
            'status': 'draft', 'options': OPTIONS, 'variations': variations,
            'testSpecs': specs}


def var(nom, expression):
    return {'name': nom, 'expression': expression}


def variation(statement, reponses, variables, etapes, conditions=None):
    # Chaque `?` de l'énoncé est une case, dans l'ordre de `reponses` ; `reponses=None` : la
    # case vient du bloc ```ranger
    v = {'statement': statement, 'variables': variables}
    if conditions:
        v['conditions'] = conditions
    if reponses is not None:
        v['blanks'] = [r if isinstance(r, dict) else {'expectedAnswer': r} for r in reponses]
    v['correction'] = {'steps': etapes}
    return v


def decimal(x):
    return {'expectedAnswer': x, 'requiredForm': VIRGULE_EXIGEE}


def choix(lignes, melanger=True):
    tete = '' if melanger else 'melanger: non\n'
    return '\n\n```choix\n' + tete + ''.join('- ' + c + '\n' for c in lignes) + '```'


def selon(k, textes, n=1):
    """`{{if:k==1|…|{{if:k==2|…|…}}}}` : le texte numéro k (à partir de 1)."""
    if len(textes) == 1:
        return textes[0]
    return ('{{if:' + k + '==' + str(n) + '|' + textes[0] + '|' + selon(k, textes[1:], n + 1)
            + '}}')


def ev(x):
    return '{{eval:' + x + '}}'


def evd(x):
    return '{{eval:' + x + ';d}}'


def col(x, k=0):
    return '\\textcolor{{{color:primary.' + str(k) + '}}}{' + x + '}'


def etiquettes(signe, noms):
    return ('```ranger\nsigne: ' + signe + '\n' + '\n'.join('- ' + n for n in noms)
            + '\n```')


def complete(gauche, unite):
    """« Complète. » + l'égalité, la case suivie de l'unité attendue."""
    return 'Complète.\n\n$' + gauche + ' = ?~\\text{' + unite + '}$'


def maj(x):
    return x[0].upper() + x[1:]


MILLE = '1\\,000'
SIGNE = '{{if:r==0|<|{{if:r==1|=|>}}}}'
SIGNES = choix(['$<$', '$=$', '$>$'], melanger=False)
PREFIXES = ('« kilo » veut dire mille, « hecto » cent, « déca » dix ; « déci » un dixième, « centi »'
            ' un centième, « milli » un millième.')


class Grandeur:
    """Les unités d'une grandeur, de la plus grande à la plus petite (`chaine` : celles qui se
    suivent de 10 en 10)."""

    def __init__(self, mot, symboles, noms, feminins, chaine, rappel):
        self.mot = mot
        self.symboles = symboles
        self.noms = noms
        # « l'hectogramme » (h muet) ; « la tonne »
        self.le = ['la ' + n if n in feminins else 'l\'' + n if n[0] == 'h' else 'le ' + n
                   for n in noms]
        self.du = ['de la ' + n if n in feminins else 'de l\'' + n if n[0] == 'h' else 'du ' + n
                   for n in noms]
        self.lignes = [le + ' (' + s + ')' for le, s in zip(self.le, symboles)]
        self.chaine = chaine
        self.successives = ('Chaque unité de ' + mot + ' vaut **10 fois** la suivante : '
                            + ', '.join(chaine) + '.' + rappel)


MASSE = Grandeur('masse', ['t', 'kg', 'hg', 'dag', 'g', 'dg', 'cg', 'mg'],
                 ['tonne', 'kilogramme', 'hectogramme', 'décagramme', 'gramme', 'décigramme',
                  'centigramme', 'milligramme'], {'tonne'},
                 ['kg', 'hg', 'dag', 'g', 'dg', 'cg', 'mg'],
                 ' Et $1~\\unit{t} = ' + MILLE + '~\\unit{kg}$.')
CONTENANCE = Grandeur('contenance', ['hL', 'daL', 'L', 'dL', 'cL', 'mL'],
                      ['hectolitre', 'décalitre', 'litre', 'décilitre', 'centilitre',
                       'millilitre'], set(), ['hL', 'daL', 'L', 'dL', 'cL', 'mL'], '')

MODELES = {}

# ---- Les unités (076, 082) : symbole, sens, la plus grande ou la plus petite ----


def unites(g, triples, rappel_tonne=''):
    n = len(g.symboles)
    symbole = variation(
        'Quel est le symbole ' + selon('k', g.du) + ' ?' + choix(g.symboles), ['{{r}}'],
        [var('k', '1..' + str(n)), var('r', 'eval:k-1')],
        [PREFIXES + rappel_tonne,
         selon('k', [maj(x) for x in g.le]) + ' s\'écrit **' + selon('k', g.symboles) + '**.'])
    sens = variation(
        'Que veut dire le symbole **' + selon('k', g.symboles) + '** ?' + choix(g.noms),
        ['{{r}}'], [var('k', '1..' + str(n)), var('r', 'eval:k-1')],
        [PREFIXES + rappel_tonne,
         '**' + selon('k', g.symboles) + '** veut dire **' + selon('k', g.noms) + '**.'])
    # Trois unités (indices, de la plus grande à la plus petite) ; la bonne réponse en premier,
    # le choix est mélangé à l'affichage
    grande = [g.lignes[t[0]] for t in triples]
    milieu = [g.lignes[t[1]] for t in triples]
    petite = [g.lignes[t[2]] for t in triples]
    extreme = variation(
        'Quelle est la plus {{if:s==1|grande|petite}} de ces trois unités de ' + g.mot + ' ?'
        + choix(['{{if:s==1|' + selon('k', grande) + '|' + selon('k', petite) + '}}',
                 selon('k', milieu),
                 '{{if:s==1|' + selon('k', petite) + '|' + selon('k', grande) + '}}']), ['0'],
        [var('k', '1..' + str(len(triples))), var('s', '1..2')],
        ['De la plus grande à la plus petite : ' + ', '.join(g.symboles) + '.',
         'La plus {{if:s==1|grande est **' + selon('k', grande) + '**|petite est **'
         + selon('k', petite) + '**}}.'])
    return [symbole, sens, extreme]


MODELES['01-unites-de-masse-du-mg-a-la-tonne'] = modele(
    'Les unités de masse, du milligramme à la tonne',
    'Symbole et sens de mg, cg, dg, g, dag, hg, kg et t ; la plus grande ou la plus petite de'
    ' trois unités', 'Masses', 'Unités', 6,
    unites(MASSE, [(0, 1, 4), (1, 2, 4), (1, 4, 7), (2, 3, 5), (4, 5, 6), (0, 4, 7)],
           ' La tonne vaut mille kilogrammes.'),
    [spec('symbole de la tonne : t', 0, {'k': 1, 'r': 0}, '0', 'correct'),
     spec('symbole de l\'hectogramme : hg', 0, {'k': 3, 'r': 2}, '2', 'correct'),
     spec('Erreur : hectogramme → dag', 0, {'k': 3, 'r': 2}, '3', 'incorrect'),
     spec('symbole du centigramme : cg', 0, {'k': 7, 'r': 6}, '6', 'correct'),
     spec('Erreur : centigramme → mg', 0, {'k': 7, 'r': 6}, '7', 'incorrect'),
     spec('dg veut dire décigramme', 1, {'k': 6, 'r': 5}, '5', 'correct'),
     spec('Erreur : dg lu décagramme', 1, {'k': 6, 'r': 5}, '3', 'incorrect'),
     spec('t veut dire tonne', 1, {'k': 1, 'r': 0}, '0', 'correct'),
     spec('la plus grande de t, kg, g : t', 2, {'k': 1, 's': 1}, '0', 'correct'),
     spec('Erreur : la plus grande → g', 2, {'k': 1, 's': 1}, '2', 'incorrect'),
     spec('la plus petite de hg, dag, dg : dg', 2, {'k': 4, 's': 2}, '0', 'correct'),
     spec('Erreur : la plus petite → dag (déca/déci confondus)', 2, {'k': 4, 's': 2}, '1',
          'incorrect')],
    delay=45)

MODELES['07-unites-de-contenance-du-ml-a-l-hl'] = modele(
    'Les unités de contenance, du millilitre à l\'hectolitre',
    'Symbole et sens de mL, cL, dL, L, daL et hL ; la plus grande ou la plus petite de trois'
    ' unités', 'Contenances', 'Unités', 3,
    unites(CONTENANCE, [(0, 1, 2), (0, 2, 4), (1, 2, 3), (2, 3, 5), (2, 4, 5), (1, 3, 4)]),
    [spec('symbole de l\'hectolitre : hL', 0, {'k': 1, 'r': 0}, '0', 'correct'),
     spec('Erreur : hectolitre → daL', 0, {'k': 1, 'r': 0}, '1', 'incorrect'),
     spec('symbole du millilitre : mL', 0, {'k': 6, 'r': 5}, '5', 'correct'),
     spec('Erreur : millilitre → cL', 0, {'k': 6, 'r': 5}, '4', 'incorrect'),
     spec('daL veut dire décalitre', 1, {'k': 2, 'r': 1}, '1', 'correct'),
     spec('Erreur : daL lu décilitre', 1, {'k': 2, 'r': 1}, '3', 'incorrect'),
     spec('la plus grande de daL, L, dL : daL', 2, {'k': 3, 's': 1}, '0', 'correct'),
     spec('Erreur : la plus grande → dL', 2, {'k': 3, 's': 1}, '2', 'incorrect'),
     spec('la plus petite de L, dL, mL : mL', 2, {'k': 4, 's': 2}, '0', 'correct'),
     spec('Erreur : la plus petite → dL', 2, {'k': 4, 's': 2}, '1', 'incorrect')],
    delay=45)

# ---- Relations entre unités successives (077, 083) ----
# Unité X = chaine[x-1], unité Y plus petite ; facteur 10^(y-x)

FACTEUR = '{{if:y-x==1|10|{{if:y-x==2|100|' + MILLE + '}}}}'


def relations_successives(g):
    ux = selon('x', g.chaine)
    uy = selon('y', g.chaine)
    n = len(g.chaine)
    un_cran = variation(
        complete('{{a}}~\\unit{' + ux + '}', uy), [ev('10*a')],
        [var('x', '1..' + str(n - 1)), var('y', 'eval:x+1'), var('a', '2..99')],
        [g.successives, '$1~\\unit{' + ux + '} = 10~\\unit{' + uy + '}$, donc ${{a}}~\\unit{'
         + ux + '}$, c\'est ${{a}}$ fois $10~\\unit{' + uy + '}$.',
         '$${{a}}~\\unit{' + ux + '} = ' + col(ev('10*a')) + '~\\unit{' + uy + '}$$'])
    retour = variation(
        complete(ev('10*a') + '~\\unit{' + uy + '}', ux), ['{{a}}'],
        [var('x', '1..' + str(n - 1)), var('y', 'eval:x+1'), var('a', '2..99')],
        [g.successives, '$10~\\unit{' + uy + '} = 1~\\unit{' + ux + '}$ : dans $' + ev('10*a')
         + '~\\unit{' + uy + '}$, il y a ${{a}}$ fois $10~\\unit{' + uy + '}$.',
         '$$' + ev('10*a') + '~\\unit{' + uy + '} = ' + col('{{a}}') + '~\\unit{' + ux + '}$$'])
    deux_crans = variation(
        complete('{{a}}~\\unit{' + ux + '}', uy), [ev('a*10^(y-x)')],
        [var('x', '1..' + str(n - 2)), var('d', '2..3'), var('y', 'eval:x+d'),
         var('a', '2..30')],
        [g.successives, 'De ' + ux + ' à ' + uy + ', on descend de {{d}} unités : on multiplie'
         ' {{d}} fois par 10, c\'est-à-dire par $' + FACTEUR + '$ : $1~\\unit{' + ux + '} = '
         + FACTEUR + '~\\unit{' + uy + '}$.',
         '$${{a}}~\\unit{' + ux + '} = ' + col(ev('a*10^(y-x)')) + '~\\unit{' + uy + '}$$'],
        conditions=['y <= ' + str(n)])
    return [un_cran, retour, deux_crans]


# Fractions simples d'une unité (BO : 1/4 kg = 250 g) : n/d avec (n, d) parmi (1, 2), (1, 4),
# (3, 4), (1, 10). Réponse calculée : jamais de `{{if:…}}` dans une réponse attendue
FRACTION_VARS = [var('n', '1|3'), var('d', '2|4|10')]
FRACTION_CONDITIONS = ['(n-1)*(d-4) == 0']


def fraction(grande, petite, base, base_tex):
    return variation(
        'Complète.\n\n$\\dfrac{{{n}}}{{{d}}}~\\unit{' + grande + '} = ?~\\text{' + petite + '}$',
        [ev('n*' + base + '/d')], FRACTION_VARS,
        ['$1~\\unit{' + grande + '} = ' + base_tex + '~\\unit{' + petite + '}$.',
         '$\\dfrac{1}{{{d}}}~\\unit{' + grande + '}$, c\'est $' + base_tex + '~\\unit{' + petite
         + '}$ partagés en {{d}} parts égales : $' + ev(base + '/d') + '~\\unit{' + petite
         + '}${{if:n==3|, et on en prend 3|}}.',
         '$$\\dfrac{{{n}}}{{{d}}}~\\unit{' + grande + '} = ' + col(ev('n*' + base + '/d'))
         + '~\\unit{' + petite + '}$$'],
        conditions=FRACTION_CONDITIONS)


def depuis_decimal(grande, petite, base, base_tex, a_min=1, a_max=9):
    """(a + D/100) grande = (base·a + base·D/100) petite, base = 100 ou 1 000."""
    dixieme = ev(base + '/10')
    centieme = ev(base + '/100')
    return variation(
        complete(evd('a+D/100') + '~\\unit{' + grande + '}', petite), [ev(base + '*a+' + base
                                                                         + '*D/100')],
        [var('a', str(a_min) + '..' + str(a_max)), var('D', '1..99')],
        ['$1~\\unit{' + grande + '} = ' + base_tex + '~\\unit{' + petite + '}$, donc $0{,}1~\\unit{'
         + grande + '} = ' + dixieme + '~\\unit{' + petite + '}$ et $0{,}01~\\unit{' + grande
         + '} = ' + centieme + '~\\unit{' + petite + '}$.',
         '$' + evd('a+D/100') + '~\\unit{' + grande + '} = {{a}}~\\unit{' + grande + '} + '
         + evd('D/100') + '~\\unit{' + grande + '} = ' + ev(base + '*a') + '~\\unit{' + petite
         + '} + ' + ev(base + '*D/100') + '~\\unit{' + petite + '}$',
         '$$' + evd('a+D/100') + '~\\unit{' + grande + '} = '
         + col(ev(base + '*a+' + base + '*D/100')) + '~\\unit{' + petite + '}$$'])


G_PLUS_CG = variation(
    complete('{{a}}~\\unit{g} + {{b}}~\\unit{cg}', 'cg'), [ev('100*a+b')],
    [var('a', '1..9'), var('b', '1..99')],
    [MASSE.successives, 'De g à cg, on descend de 2 unités : $1~\\unit{g} = 100~\\unit{cg}$,'
     ' donc ${{a}}~\\unit{g} = ' + ev('100*a') + '~\\unit{cg}$.',
     '$$' + ev('100*a') + '~\\unit{cg} + {{b}}~\\unit{cg} = ' + col(ev('100*a+b'))
     + '~\\unit{cg}$$'])

KG_EN_T = variation(
    complete(ev('1000*a+10*D') + '~\\unit{kg}', 't'), [decimal(evd('a+D/100'))],
    [var('a', '1..9'), var('D', '1..99')],
    ['$' + MILLE + '~\\unit{kg} = 1~\\unit{t}$, donc $100~\\unit{kg} = 0{,}1~\\unit{t}$ et'
     ' $10~\\unit{kg} = 0{,}01~\\unit{t}$.',
     '$' + ev('1000*a+10*D') + '~\\unit{kg} = ' + ev('1000*a') + '~\\unit{kg} + ' + ev('10*D')
     + '~\\unit{kg}$, c\'est ${{a}}~\\unit{t}$ et $' + evd('D/100') + '~\\unit{t}$.',
     '$$' + ev('1000*a+10*D') + '~\\unit{kg} = ' + col(evd('a+D/100')) + '~\\unit{t}$$'])

MODELES['02-relations-entre-unites-de-masse'] = modele(
    'Relations entre les unités de masse',
    '40 dg = 4 g ; 3 g + 5 cg = 305 cg ; 6,2 t = 6 200 kg ; 3 250 kg = 3,25 t ;'
    ' 1/4 kg = 250 g ; 1/2 t = 500 kg ; 1,25 kg = 1 250 g', 'Masses', 'Unités', 8,
    relations_successives(MASSE) + [
        G_PLUS_CG, depuis_decimal('t', 'kg', '1000', MILLE), KG_EN_T,
        fraction('kg', 'g', '1000', MILLE), fraction('t', 'kg', '1000', MILLE),
        depuis_decimal('kg', 'g', '1000', MILLE)],
    [spec('7 dag = 70 g', 0, {'x': 3, 'y': 4, 'a': 7}, '70', 'correct'),
     spec('Erreur : 7 dag = 700 g', 0, {'x': 3, 'y': 4, 'a': 7}, '700', 'incorrect'),
     spec('BO : 40 dg = 4 g', 1, {'x': 4, 'y': 5, 'a': 4}, '4', 'correct'),
     spec('Erreur : 40 dg = 400 g (sens inversé)', 1, {'x': 4, 'y': 5, 'a': 4}, '400',
          'incorrect'),
     spec('5 kg = 500 dag', 2, {'x': 1, 'd': 2, 'y': 3, 'a': 5}, '500', 'correct'),
     spec('3 g = 3 000 mg', 2, {'x': 4, 'd': 3, 'y': 7, 'a': 3}, '3 000', 'correct'),
     spec('Erreur : 3 g = 300 mg', 2, {'x': 4, 'd': 3, 'y': 7, 'a': 3}, '300', 'incorrect'),
     spec('Forme : 3000 sans espace', 2, {'x': 4, 'd': 3, 'y': 7, 'a': 3}, '3000',
          'unoptimal_form', ['spaces']),
     spec('BO : 3 g + 5 cg = 305 cg', 3, {'a': 3, 'b': 5}, '305', 'correct'),
     spec('Erreur : 3 g + 5 cg = 35 cg', 3, {'a': 3, 'b': 5}, '35', 'incorrect'),
     spec('Erreur : 3 g + 5 cg = 8 cg', 3, {'a': 3, 'b': 5}, '8', 'incorrect'),
     spec('3 g + 45 cg = 345 cg', 3, {'a': 3, 'b': 45}, '345', 'correct'),
     spec('BO : 6,2 t = 6 200 kg', 4, {'a': 6, 'D': 20}, '6 200', 'correct'),
     spec('Erreur : 6,2 t = 6 002 kg', 4, {'a': 6, 'D': 20}, '6 002', 'incorrect'),
     spec('Erreur : 6,2 t = 620 kg', 4, {'a': 6, 'D': 20}, '620', 'incorrect'),
     spec('3,25 t = 3 250 kg', 4, {'a': 3, 'D': 25}, '3 250', 'correct'),
     spec('3 250 kg = 3,25 t', 5, {'a': 3, 'D': 25}, '3,25', 'correct'),
     spec('3 500 kg = 3,5 t', 5, {'a': 3, 'D': 50}, '3,5', 'correct'),
     spec('Erreur : 3 500 kg = 35 t', 5, {'a': 3, 'D': 50}, '35', 'incorrect'),
     spec('Erreur : 3 500 kg = 3,05 t', 5, {'a': 3, 'D': 50}, '3,05', 'incorrect'),
     spec('Forme : 3 500 kg = 7/2 t', 5, {'a': 3, 'D': 50}, '\\frac{7}{2}', 'bad_form',
          ['form']),
     spec('BO : 1/4 kg = 250 g', 6, {'n': 1, 'd': 4}, '250', 'correct'),
     spec('Erreur : 1/4 kg = 0,25 g', 6, {'n': 1, 'd': 4}, '0,25', 'incorrect'),
     spec('Erreur : 1/4 kg = 25 g', 6, {'n': 1, 'd': 4}, '25', 'incorrect'),
     spec('3/4 kg = 750 g', 6, {'n': 3, 'd': 4}, '750', 'correct'),
     spec('1/2 t = 500 kg', 7, {'n': 1, 'd': 2}, '500', 'correct'),
     spec('Erreur : 1/2 t = 12 kg', 7, {'n': 1, 'd': 2}, '12', 'incorrect'),
     spec('1,25 kg = 1 250 g', 8, {'a': 1, 'D': 25}, '1 250', 'correct'),
     spec('Erreur : 1,25 kg = 125 g', 8, {'a': 1, 'D': 25}, '125', 'incorrect'),
     spec('Erreur : 1,25 kg = 1 025 g', 8, {'a': 1, 'D': 25}, '1 025', 'incorrect')],
    delay=90)

DL_EN_L = variation(
    complete('{{n}}~\\unit{dL}', 'L'), [decimal(evd('n/10'))],
    [var('n', '11..99'), var('a', 'eval:floor(n/10)'), var('u', 'eval:mod(n,10)')],
    ['$10~\\unit{dL} = 1~\\unit{L}$, donc $1~\\unit{dL} = \\dfrac{1}{10}~\\unit{L} ='
     ' 0{,}1~\\unit{L}$ : un décilitre est un dixième de litre.',
     '${{n}}~\\unit{dL} = {{a}}~\\unit{L}~{{u}}~\\unit{dL}$, c\'est {{a}}'
     ' {{if:a==1|litre|litres}} et {{u}} {{if:u==1|dixième|dixièmes}} de litre.',
     '$${{n}}~\\unit{dL} = ' + col(evd('n/10')) + '~\\unit{L}$$'],
    conditions=['u != 0'])

CL_EN_L = variation(
    complete('{{n}}~\\unit{cL}', 'L'), [decimal(evd('n/100'))],
    [var('n', '101..999'), var('a', 'eval:floor(n/100)'), var('c', 'eval:mod(n,100)')],
    ['$100~\\unit{cL} = 1~\\unit{L}$, donc $1~\\unit{cL} = \\dfrac{1}{100}~\\unit{L}$ : un'
     ' centilitre est un centième de litre.',
     '${{n}}~\\unit{cL} = {{a}}~\\unit{L}~{{c}}~\\unit{cL}$, c\'est {{a}}'
     ' {{if:a==1|litre|litres}} et {{c}} {{if:c==1|centième|centièmes}} de litre.',
     '$${{n}}~\\unit{cL} = ' + col(evd('n/100')) + '~\\unit{L}$$'],
    conditions=['mod(n,10) != 0'])

MODELES['08-relations-entre-unites-de-contenance'] = modele(
    'Relations entre les unités de contenance',
    '1 cL = 10 mL ; 4 hL = 40 daL ; 3 L = 3 000 mL ; 23 dL = 2,3 L ; 125 cL = 1,25 L ;'
    ' 6,4 L = 640 cL ; 0,75 L = 75 cL', 'Contenances', 'Unités', 5,
    relations_successives(CONTENANCE) + [
        DL_EN_L, CL_EN_L, depuis_decimal('L', 'cL', '100', '100', a_min=0)],
    [spec('BO : 1 cL = 10 mL', 0, {'x': 5, 'y': 6, 'a': 1}, '10', 'correct'),
     spec('4 hL = 40 daL', 0, {'x': 1, 'y': 2, 'a': 4}, '40', 'correct'),
     spec('Erreur : 4 hL = 400 daL', 0, {'x': 1, 'y': 2, 'a': 4}, '400', 'incorrect'),
     spec('350 mL = 35 cL', 1, {'x': 5, 'y': 6, 'a': 35}, '35', 'correct'),
     spec('Erreur : 350 mL = 3 500 cL (sens inversé)', 1, {'x': 5, 'y': 6, 'a': 35}, '3 500',
          'incorrect'),
     spec('3 L = 3 000 mL', 2, {'x': 3, 'd': 3, 'y': 6, 'a': 3}, '3 000', 'correct'),
     spec('Erreur : 3 L = 300 mL', 2, {'x': 3, 'd': 3, 'y': 6, 'a': 3}, '300', 'incorrect'),
     spec('2 hL = 200 L', 2, {'x': 1, 'd': 2, 'y': 3, 'a': 2}, '200', 'correct'),
     spec('Erreur : 2 hL = 20 L', 2, {'x': 1, 'd': 2, 'y': 3, 'a': 2}, '20', 'incorrect'),
     spec('BO : 23 dL = 2,3 L', 3, {'n': 23, 'a': 2, 'u': 3}, '2,3', 'correct'),
     spec('Erreur : 23 dL = 0,23 L', 3, {'n': 23, 'a': 2, 'u': 3}, '0,23', 'incorrect'),
     spec('Erreur : 23 dL = 230 L', 3, {'n': 23, 'a': 2, 'u': 3}, '230', 'incorrect'),
     spec('Forme : 23/10', 3, {'n': 23, 'a': 2, 'u': 3}, '\\frac{23}{10}', 'bad_form', ['form']),
     spec('125 cL = 1,25 L', 4, {'n': 125, 'a': 1, 'c': 25}, '1,25', 'correct'),
     spec('Erreur : 125 cL = 12,5 L', 4, {'n': 125, 'a': 1, 'c': 25}, '12,5', 'incorrect'),
     spec('205 cL = 2,05 L', 4, {'n': 205, 'a': 2, 'c': 5}, '2,05', 'correct'),
     spec('Erreur : 205 cL = 2,5 L', 4, {'n': 205, 'a': 2, 'c': 5}, '2,5', 'incorrect'),
     spec('BO : 6,4 L = 640 cL', 5, {'a': 6, 'D': 40}, '640', 'correct'),
     spec('Erreur : 6,4 L = 64 cL', 5, {'a': 6, 'D': 40}, '64', 'incorrect'),
     spec('Erreur : 6,4 L = 604 cL', 5, {'a': 6, 'D': 40}, '604', 'incorrect'),
     spec('0,75 L = 75 cL', 5, {'a': 0, 'D': 75}, '75', 'correct'),
     spec('Erreur : 0,75 L = 7,5 cL', 5, {'a': 0, 'D': 75}, '7,5', 'incorrect')],
    delay=90)

# ---- Choisir l'unité (078, 084) : trois objets par unité, r = floor((k-1)/3) ----


def choisir(objets, symboles, pluriels, reperes):
    pluriel = selon_0('r', pluriels)
    symbole = selon_0('r', symboles)
    return variation(
        selon('k', objets) + ' …\n\nQuelle unité convient ?' + choix(symboles, melanger=False),
        ['{{r}}'], [var('k', '1..' + str(len(objets))), var('r', 'eval:floor((k-1)/3)')],
        [reperes, selon('k', objets) + ' ' + pluriel + ' (**' + symbole + '**).'])


def selon_0(r, textes, n=0):
    """Le texte numéro r, à partir de 0."""
    if len(textes) == 1:
        return textes[0]
    return ('{{if:' + r + '==' + str(n) + '|' + textes[0] + '|' + selon_0(r, textes[1:], n + 1)
            + '}}')


OBJETS_MASSE = ['Un comprimé de vitamine pèse $500$', 'Un moustique pèse $2$',
                'Un grain de riz pèse $25$',
                'Une pomme pèse $150$', 'Une lettre pèse $20$',
                'Une tablette de chocolat pèse $100$',
                'Un enfant de 10 ans pèse $30$', 'Un sac de pommes de terre pèse $5$',
                'Un vélo pèse $12$',
                'Un camion pèse $20$', 'Un éléphant pèse $5$', 'Une baleine bleue pèse $150$']
REPERES_MASSE = ('Repères : $1~\\unit{mg}$, une petite fourmi ; $1~\\unit{g}$, un trombone ;'
                 ' $1~\\unit{kg}$, une bouteille d\'un litre d\'eau ; $1~\\unit{t}$, une voiture.')

MODELES['03-choisir-l-unite-de-masse'] = modele(
    'Quelle unité pour peser un objet ?',
    'Choisir parmi mg, g, kg et t : un comprimé de 500 mg, une pomme de 150 g, un enfant de'
    ' 30 kg, un camion de 20 t', 'Masses', 'Unités', 7,
    [choisir(OBJETS_MASSE, ['mg', 'g', 'kg', 't'],
             ['milligrammes', 'grammes', 'kilogrammes', 'tonnes'], REPERES_MASSE)],
    [spec('comprimé : mg', 0, {'k': 1, 'r': 0}, '0', 'correct'),
     spec('Erreur : comprimé de 500 g', 0, {'k': 1, 'r': 0}, '1', 'incorrect'),
     spec('pomme : g', 0, {'k': 4, 'r': 1}, '1', 'correct'),
     spec('Erreur : pomme de 150 kg', 0, {'k': 4, 'r': 1}, '2', 'incorrect'),
     spec('enfant : kg', 0, {'k': 7, 'r': 2}, '2', 'correct'),
     spec('Erreur : enfant de 30 g', 0, {'k': 7, 'r': 2}, '1', 'incorrect'),
     spec('éléphant : t', 0, {'k': 11, 'r': 3}, '3', 'correct'),
     spec('Erreur : éléphant de 5 kg', 0, {'k': 11, 'r': 3}, '2', 'incorrect')],
    delay=45)

OBJETS_CONTENANCE = ['Une cuillère à café contient $5$', 'Une seringue contient $10$',
                     'Un flacon de sirop contient $125$',
                     'Un verre contient $20$', 'Une canette contient $33$',
                     'Un pot de yaourt contient $12$',
                     'Un seau contient $10$', 'Un arrosoir contient $8$',
                     'Une baignoire contient $150$',
                     'Un tonneau contient $2$', 'Une cuve à fioul contient $15$',
                     'Un camion-citerne contient $300$']
REPERES_CONTENANCE = ('Repères : $5~\\unit{mL}$, une cuillère à café ; $20~\\unit{cL}$, un verre ;'
                      ' $1~\\unit{L}$, une bouteille d\'un litre ; $1~\\unit{hL}$, cent litres (une'
                      ' baignoire en contient environ $150~\\unit{L}$).')

MODELES['09-choisir-l-unite-de-contenance'] = modele(
    'Quelle unité pour mesurer une contenance ?',
    'Choisir parmi mL, cL, L et hL : une cuillère de 5 mL, un verre de 20 cL, un seau de 10 L,'
    ' un tonneau de 2 hL', 'Contenances', 'Unités', 4,
    [choisir(OBJETS_CONTENANCE, ['mL', 'cL', 'L', 'hL'],
             ['millilitres', 'centilitres', 'litres', 'hectolitres'], REPERES_CONTENANCE)],
    [spec('cuillère à café : mL', 0, {'k': 1, 'r': 0}, '0', 'correct'),
     spec('Erreur : cuillère de 5 L', 0, {'k': 1, 'r': 0}, '2', 'incorrect'),
     spec('verre : cL', 0, {'k': 4, 'r': 1}, '1', 'correct'),
     spec('Erreur : verre de 20 L', 0, {'k': 4, 'r': 1}, '2', 'incorrect'),
     spec('seau : L', 0, {'k': 7, 'r': 2}, '2', 'correct'),
     spec('Erreur : seau de 10 hL', 0, {'k': 7, 'r': 2}, '3', 'incorrect'),
     spec('camion-citerne : hL', 0, {'k': 12, 'r': 3}, '3', 'correct'),
     spec('Erreur : camion-citerne de 300 L', 0, {'k': 12, 'r': 3}, '2', 'incorrect')],
    delay=45)

# ---- Comparer (079, 085) ----


def signe_decimal(mot, grande, petite, base, pas, a_min=1):
    """(a + t/10) grande … c petite, c autour de base·(a + t/10) par pas de `pas`."""
    valeur = base + '*a+' + base + '*t/10'
    return variation(
        'Compare ces deux ' + mot + '.\n\n$$' + evd('a+t/10') + '~\\unit{' + grande
        + '} \\quad \\ldots \\quad {{c}}~\\unit{' + petite + '}$$' + SIGNES, ['{{r}}'],
        [var('a', str(a_min) + '..9'), var('t', '1..9'), var('k', '0..8'),
         var('c', 'eval:' + valeur + '+' + pas + '*(k-4)'), var('r', 'eval:sign(' + valeur
                                                                + '-c)+1')],
        ['On écrit les deux ' + mot + ' dans la même unité : $' + evd('a+t/10') + '~\\unit{'
         + grande + '} = ' + ev(valeur) + '~\\unit{' + petite + '}$.',
         '$$' + ev(valeur) + '~\\unit{' + petite + '} ' + SIGNE + ' {{c}}~\\unit{' + petite + '}$$',
         '$$' + evd('a+t/10') + '~\\unit{' + grande + '} ' + col(SIGNE) + ' {{c}}~\\unit{' + petite
         + '}$$'],
        conditions=['c > 0'])


def somme(mot, grande, petite, base, a_var, b_var, signe='+'):
    verbe = 'ajouter' if signe == '+' else 'soustraire'
    op = '+' if signe == '+' else '-'
    return variation(
        complete('{{a}}~\\unit{' + grande + '} ' + op + ' {{b}}~\\unit{' + petite + '}', petite),
        [ev(base + '*a' + op + 'b')], a_var + b_var,
        ['Pour ' + verbe + ' deux ' + mot + ', on les écrit dans la même unité : ${{a}}~\\unit{'
         + grande + '} = ' + ev(base + '*a') + '~\\unit{' + petite + '}$.',
         '$$' + ev(base + '*a') + '~\\unit{' + petite + '} ' + op + ' {{b}}~\\unit{' + petite
         + '} = ' + col(ev(base + '*a' + op + 'b')) + '~\\unit{' + petite + '}$$'])


# 8,2 kg + 840 g (BO) : la masse en kg est décimale
KG_DEC_PLUS_G = variation(
    complete(evd('a+t/10') + '~\\unit{kg} + {{b}}~\\unit{g}', 'g'), [ev('1000*a+100*t+b')],
    [var('a', '1..9'), var('t', '1..9'), var('b', '105..995')],
    ['Pour ajouter deux masses, on les écrit dans la même unité : $' + evd('a+t/10')
     + '~\\unit{kg} = ' + ev('1000*a+100*t') + '~\\unit{g}$.',
     '$$' + ev('1000*a+100*t') + '~\\unit{g} + {{b}}~\\unit{g} = ' + col(ev('1000*a+100*t+b'))
     + '~\\unit{g}$$'],
    conditions=['mod(b,5) == 0'])

# Trois masses dans trois unités, déjà rangées par construction (b de 2 à 9) :
# (1000b − 250) g < (b − 0,1) kg < (10b + 1) hg. Positions affichées du ```ranger lues par essai
# des 6 permutations (b = 2, 3, 9), stables : la bonne réponse est 2, 0, 1
ETIQ_M = ['$' + ev('1000*b-250') + '~\\unit{g}$', '$' + evd('b-0.1') + '~\\unit{kg}$',
          '$' + ev('10*b+1') + '~\\unit{hg}$']
EN_G = [ev('1000*b-250'), ev('1000*b-100'), ev('1000*b+100')]
ETAPES_M = ['On écrit toutes les masses en grammes : $' + evd('b-0.1') + '~\\unit{kg} = '
            + ev('1000*b-100') + '~\\unit{g}$ et $' + ev('10*b+1') + '~\\unit{hg} = '
            + ev('1000*b+100') + '~\\unit{g}$, car $1~\\unit{hg} = 100~\\unit{g}$.']

MODELES['04-comparer-des-masses'] = modele(
    'Comparer des masses d\'unités différentes',
    '1,5 kg et 1 200 g ; 2,4 t et 2 450 kg ; ranger trois masses en g, kg et hg ;'
    ' 8,2 kg + 840 g ; 3 kg − 250 g', 'Masses', 'Comparaison', 4,
    [signe_decimal('masses', 'kg', 'g', '1000', '50'),
     signe_decimal('masses', 't', 'kg', '1000', '50'),
     variation('Range ces masses de la plus légère à la plus lourde.\n\n'
               + etiquettes('<', ETIQ_M), None, [var('b', '2..9')],
               ETAPES_M + ['$$' + ' < '.join(x + '~\\unit{g}' for x in EN_G) + '$$']),
     variation('Range ces masses de la plus lourde à la plus légère.\n\n'
               + etiquettes('>', ETIQ_M[::-1]), None, [var('b', '2..9')],
               ETAPES_M + ['$$' + ' > '.join(x + '~\\unit{g}' for x in EN_G[::-1]) + '$$']),
     KG_DEC_PLUS_G,
     somme('masses', 'kg', 'g', '1000', [var('a', '1..5'), var('k', '1..19')],
           [var('b', 'eval:50*k')], signe='-')],
    [spec('1,5 kg > 1 200 g', 0, {'a': 1, 't': 5, 'k': 0, 'c': 1300, 'r': 2}, '2', 'correct'),
     spec('Erreur : 1,5 kg < 1 300 g (nombres seuls)', 0,
          {'a': 1, 't': 5, 'k': 0, 'c': 1300, 'r': 2}, '0', 'incorrect'),
     spec('1,5 kg = 1 500 g', 0, {'a': 1, 't': 5, 'k': 4, 'c': 1500, 'r': 1}, '1', 'correct'),
     spec('2,4 t < 2 450 kg', 1, {'a': 2, 't': 4, 'k': 5, 'c': 2450, 'r': 0}, '0', 'correct'),
     spec('Erreur : 2,4 t > 2 450 kg', 1, {'a': 2, 't': 4, 'k': 5, 'c': 2450, 'r': 0}, '2',
          'incorrect'),
     spec('croissant : 2 750 g < 2,9 kg < 31 hg', 2, {'b': 3}, ['2', '0', '1'], 'correct'),
     spec('Erreur : les nombres seuls (2,9 < 31 < 2 750)', 2, {'b': 3}, ['0', '1', '2'],
          'incorrect'),
     spec('Erreur : ordre décroissant', 2, {'b': 3}, ['1', '0', '2'], 'incorrect'),
     spec('décroissant : 31 hg > 2,9 kg > 2 750 g', 3, {'b': 3}, ['2', '0', '1'], 'correct'),
     spec('Erreur : ordre croissant', 3, {'b': 3}, ['1', '0', '2'], 'incorrect'),
     spec('BO : 8,2 kg + 840 g = 9 040 g', 4, {'a': 8, 't': 2, 'b': 840}, '9 040', 'correct'),
     spec('Erreur : 8,2 kg + 840 g = 848,2 g', 4, {'a': 8, 't': 2, 'b': 840}, '848,2',
          'incorrect'),
     spec('Erreur : 8,2 kg + 840 g = 1 660 g (820 + 840)', 4, {'a': 8, 't': 2, 'b': 840},
          '1 660', 'incorrect'),
     spec('3 kg − 250 g = 2 750 g', 5, {'a': 3, 'k': 5, 'b': 250}, '2 750', 'correct'),
     spec('Erreur : 3 kg − 250 g = 2 850 g (retenue)', 5, {'a': 3, 'k': 5, 'b': 250}, '2 850',
          'incorrect')])

# Quatre contenances dans quatre unités, déjà rangées (b de 2 à 9) :
# (100b − 30) cL < (b − 0,1) L < 1000b mL < (10b + 1) dL ; bonne réponse 3, 0, 1, 2 (comme au 5a)
ETIQ_C = ['$' + ev('100*b-30') + '~\\unit{cL}$', '$' + evd('b-0.1') + '~\\unit{L}$',
          '$' + ev('1000*b') + '~\\unit{mL}$', '$' + ev('10*b+1') + '~\\unit{dL}$']
EN_CL = [ev('100*b-30'), ev('100*b-10'), ev('100*b'), ev('100*b+10')]
ETAPES_C = ['On écrit toutes les contenances en centilitres : $' + evd('b-0.1') + '~\\unit{L} = '
            + ev('100*b-10') + '~\\unit{cL}$, $' + ev('1000*b') + '~\\unit{mL} = ' + ev('100*b')
            + '~\\unit{cL}$ et $' + ev('10*b+1') + '~\\unit{dL} = ' + ev('100*b+10')
            + '~\\unit{cL}$.']

MODELES['10-comparer-des-contenances'] = modele(
    'Comparer des contenances d\'unités différentes',
    '0,8 L et 75 cL ; 2,5 L et 2 400 mL ; ranger quatre contenances en cL, L, mL et dL ;'
    ' 1 L − 25 cL ; 2 L + 50 cL', 'Contenances', 'Comparaison', 1,
    [signe_decimal('contenances', 'L', 'cL', '100', '5', a_min=0),
     signe_decimal('contenances', 'L', 'mL', '1000', '50'),
     variation('Range ces contenances de la plus petite à la plus grande.\n\n'
               + etiquettes('<', ETIQ_C), None, [var('b', '2..9')],
               ETAPES_C + ['$$' + ' < '.join(x + '~\\unit{cL}' for x in EN_CL) + '$$']),
     variation('Range ces contenances de la plus grande à la plus petite.\n\n'
               + etiquettes('>', ETIQ_C[::-1]), None, [var('b', '2..9')],
               ETAPES_C + ['$$' + ' > '.join(x + '~\\unit{cL}' for x in EN_CL[::-1]) + '$$']),
     somme('contenances', 'L', 'cL', '100', [var('a', '1..5'), var('k', '1..19')],
           [var('b', 'eval:5*k')], signe='-'),
     somme('contenances', 'L', 'cL', '100', [var('a', '1..9')], [var('b', '5..95')])],
    [spec('0,8 L > 75 cL', 0, {'a': 0, 't': 8, 'k': 3, 'c': 75, 'r': 2}, '2', 'correct'),
     spec('Erreur : 0,8 L < 75 cL (nombres seuls)', 0,
          {'a': 0, 't': 8, 'k': 3, 'c': 75, 'r': 2}, '0', 'incorrect'),
     spec('0,8 L = 80 cL', 0, {'a': 0, 't': 8, 'k': 4, 'c': 80, 'r': 1}, '1', 'correct'),
     spec('2,5 L > 2 400 mL', 1, {'a': 2, 't': 5, 'k': 2, 'c': 2400, 'r': 2}, '2', 'correct'),
     spec('Erreur : 2,5 L < 2 400 mL', 1, {'a': 2, 't': 5, 'k': 2, 'c': 2400, 'r': 2}, '0',
          'incorrect'),
     spec('croissant : 270 cL < 2,9 L < 3 000 mL < 31 dL', 2, {'b': 3},
          ['3', '0', '1', '2'], 'correct'),
     spec('Erreur : les nombres seuls (2,9 < 31 < 270 < 3 000)', 2, {'b': 3},
          ['0', '2', '3', '1'], 'incorrect'),
     spec('décroissant : 31 dL > 3 000 mL > 2,9 L > 270 cL', 3, {'b': 3},
          ['3', '0', '1', '2'], 'correct'),
     spec('BO : 1 L − 25 cL = 75 cL', 4, {'a': 1, 'k': 5, 'b': 25}, '75', 'correct'),
     spec('Erreur : 1 L − 25 cL = 24 cL', 4, {'a': 1, 'k': 5, 'b': 25}, '24', 'incorrect'),
     spec('Erreur : 1 L − 25 cL = 85 cL (retenue)', 4, {'a': 1, 'k': 5, 'b': 25}, '85',
          'incorrect'),
     spec('2 L + 50 cL = 250 cL', 5, {'a': 2, 'b': 50}, '250', 'correct'),
     spec('Erreur : 2 L + 50 cL = 52 cL', 5, {'a': 2, 'b': 50}, '52', 'incorrect')])

# ---- Masses de référence (080) ----

REF_OBJETS = ['une petite fourmi', 'un trombone', 'une tablette de chocolat',
              'une bouteille d\'un litre d\'eau', 'un seau de dix litres d\'eau', 'une voiture']
REF_MESURES = ['$1~\\unit{mg}$', '$1~\\unit{g}$', '$100~\\unit{g}$', '$1~\\unit{kg}$',
               '$10~\\unit{kg}$', '$1~\\unit{t}$']
REPERES = ('Repères : ' + ' ; '.join(o + ', environ ' + m for m, o in zip(REF_MESURES, REF_OBJETS))
           + '.')
N_REF = len(REF_OBJETS)

QUOI_PESE = variation(
    'Qu\'est-ce qui pèse environ ' + selon('k', REF_MESURES) + ' ?'
    + choix([selon('k', REF_OBJETS)]
            + [selon('k', [REF_OBJETS[(i + d) % N_REF] for i in range(N_REF)]) for d in (2, 3, 4)]),
    ['0'], [var('k', '1..' + str(N_REF))],
    [REPERES, '**' + selon('k', [maj(o) for o in REF_OBJETS]) + '** pèse environ '
     + selon('k', REF_MESURES) + '.'])

COMBIEN_PESE = variation(
    selon('k', [maj(o) for o in REF_OBJETS]) + ' pèse environ…'
    + choix(REF_MESURES, melanger=False), ['{{r}}'],
    [var('k', '1..' + str(N_REF)), var('r', 'eval:k-1')],
    [REPERES, selon('k', [maj(o) for o in REF_OBJETS]) + ' pèse environ **'
     + selon('k', REF_MESURES) + '**.'])

MODELES['05-masses-de-reference'] = modele(
    'Des masses de référence, du milligramme à la tonne',
    '1 mg : une petite fourmi ; 1 g : un trombone ; 100 g : une tablette de chocolat ; 1 kg : une'
    ' bouteille d\'un litre d\'eau ; 10 kg : un seau de dix litres d\'eau ; 1 t : une voiture',
    'Masses', 'Ordres de grandeur', 3, [QUOI_PESE, COMBIEN_PESE],
    [spec('environ 1 g : un trombone', 0, {'k': 2}, '0', 'correct'),
     spec('Erreur : 1 g, un seau d\'eau', 0, {'k': 2}, '2', 'incorrect'),
     spec('environ 1 t : une voiture', 0, {'k': 6}, '0', 'correct'),
     spec('bouteille d\'un litre d\'eau : 1 kg', 1, {'k': 4, 'r': 3}, '3', 'correct'),
     spec('Erreur : bouteille d\'un litre, 1 g', 1, {'k': 4, 'r': 3}, '1', 'incorrect'),
     spec('voiture : 1 t', 1, {'k': 6, 'r': 5}, '5', 'correct'),
     spec('Erreur : voiture, 10 kg', 1, {'k': 6, 'r': 5}, '4', 'incorrect')],
    delay=45)

# ---- Estimer une masse (081) : quatre objets par position de la bonne réponse,
# r = floor((k-1)/4) ; trois unités rangées de la plus petite à la plus grande ----

ESTIMER = [
    # r = 0 : la plus petite des trois unités
    ('Une pomme', '150', ['g', 'kg', 't']),
    ('Une lettre', '20', ['g', 'kg', 't']),
    ('Un comprimé', '500', ['mg', 'g', 'kg']),
    ('Un moustique', '2', ['mg', 'g', 'kg']),
    # r = 1 : celle du milieu
    ('Un enfant de 10 ans', '30', ['g', 'kg', 't']),
    ('Un vélo', '12', ['g', 'kg', 't']),
    ('Une tablette de chocolat', '100', ['mg', 'g', 'kg']),
    ('Une baguette de pain', '250', ['mg', 'g', 'kg']),
    # r = 2 : la plus grande
    ('Un éléphant', '5', ['g', 'kg', 't']),
    ('Un camion', '20', ['g', 'kg', 't']),
    ('Une pastèque', '4', ['mg', 'g', 'kg']),
    ('Un sac de pommes de terre', '5', ['mg', 'g', 'kg'])]

OBJET_E = selon('k', [e[0] for e in ESTIMER])
NOMBRE_E = selon('k', [e[1] for e in ESTIMER])

ESTIMER_V = variation(
    OBJET_E + ' pèse environ…'
    + choix(['$' + NOMBRE_E + '~\\unit{' + selon('k', [e[2][i] for e in ESTIMER]) + '}$'
             for i in range(3)], melanger=False), ['{{r}}'],
    [var('k', '1..12'), var('r', 'eval:floor((k-1)/4)')],
    ['On compare à des masses connues : $1~\\unit{g}$, un trombone ; $1~\\unit{kg}$, une'
     ' bouteille d\'un litre d\'eau ; $1~\\unit{t}$, une voiture.',
     OBJET_E + ' pèse environ **$' + NOMBRE_E + '~\\unit{'
     + selon('k', [e[2][i] for i, e in zip([j // 4 for j in range(12)], ESTIMER)]) + '}$**.'])

MODELES['06-estimer-une-masse'] = modele(
    'Estimer une masse, du milligramme à la tonne',
    'Choisir l\'ordre de grandeur : une pomme de 150 g, un comprimé de 500 mg, un enfant de'
    ' 30 kg, un éléphant de 5 t', 'Masses', 'Ordres de grandeur', 4, [ESTIMER_V],
    [spec('une pomme : 150 g', 0, {'k': 1, 'r': 0}, '0', 'correct'),
     spec('Erreur : une pomme de 150 kg', 0, {'k': 1, 'r': 0}, '1', 'incorrect'),
     spec('un enfant de 10 ans : 30 kg', 0, {'k': 5, 'r': 1}, '1', 'correct'),
     spec('Erreur : un enfant de 30 g', 0, {'k': 5, 'r': 1}, '0', 'incorrect'),
     spec('un éléphant : 5 t', 0, {'k': 9, 'r': 2}, '2', 'correct'),
     spec('Erreur : un éléphant de 5 kg', 0, {'k': 9, 'r': 2}, '1', 'incorrect')],
    delay=45)

for nom, m in sorted(MODELES.items()):
    with open(f'{DOSSIER}/{nom}.json', 'w') as fh:
        json.dump(m, fh, ensure_ascii=False, indent='\t')
        fh.write('\n')
print(len(MODELES), 'modèles écrits')
