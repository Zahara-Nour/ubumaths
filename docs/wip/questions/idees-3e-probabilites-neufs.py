"""Écrit les modèles neufs du chantier idees-3e-probabilites dans
scripts/questions/idees-3e-probabilites-neufs/.

Phase 0 : fiches de docs/wip/idees-3e-probabilites-progress.md, validées par David le 2026-11-26 :
N1 (tableau d'effectifs) et N2 (jeux à deux épreuves) sont des modèles neufs de 3e, point 3-033
(Q1 = oui). V1 à V3 : variations de modèles publiés, script idees-3e-probabilites-publies.py.

Rangement (après la création en brouillon) : nœud de cd2ffd9b, relevé en prod le 2026-11-26,
« Probabilités > Expériences aléatoires > événements » ; cd2ffd9b (3e) y est au niveau 1, donc
N1 au niveau 2 et N2 au niveau 3.

Bornes (cycle4.md) : 3-033 en équiprobabilité, évènements « et », « ou », « ou exclusif » ; pas de
« sachant » (Seconde).

Règles suivies (couvrir-un-niveau.md § 5) : trois erreurs prévues par case, chacune avec sa spec
`incorrect` ; un coup de pouce par variation, qui ne donne pas la réponse ; une case unique.

Usage : python3 docs/wip/questions/idees-3e-probabilites-neufs.py scripts/questions/idees-3e-probabilites-neufs
"""
import json
import os
import sys
from fractions import Fraction as Fr

DOSSIER = sys.argv[1]

PRIMAIRE = '\\textcolor{{{color:primary.0}}}'
REPONSE = 'Donne le résultat sous la forme d\'une fraction ou d\'un nombre décimal.'
RANGEMENT = {'noeud': 'Probabilités > Expériences aléatoires > événements', 'point': '3-033'}


def spec(desc, vi, variables_, status, answers, message=None, violations=None):
    expected = {'status': status}
    if message is not None:
        expected['expectedErrorMessage'] = message
    if violations:
        expected['constraintViolations'] = violations
    elif status in ('unoptimal_form', 'bad_form'):
        expected['constraintViolations'] = ['form']
    return {'description': desc, 'variationIndex': vi,
            'variables': {k: str(v) for k, v in variables_.items()},
            'expected': expected, 'answers': answers}


def modele(title, description, level, variations, specs, options):
    return {'rangement': RANGEMENT, 'title': title, 'description': description, 'grades': ['3'],
            'level': level, 'delay': 180, 'status': 'draft',
            'shared': {'blankDefaults': {'acceptDecimal': True}}, 'options': options,
            'variations': variations, 'testSpecs': specs}


def var(nom, expression):
    return {'name': nom, 'expression': expression}


def erreur(answer, message, label):
    return {'answer': answer, 'message': message, 'label': label}


def variation(statement, variables, attendue, erreurs, steps, hint, conditions=None):
    return {'statement': statement, 'variables': variables, 'conditions': conditions or [],
            'blanks': [{'expectedAnswer': attendue, 'expectedErrors': erreurs}],
            'correction': {'steps': steps}, 'hint': hint}


def ecrire(nom, m):
    os.makedirs(DOSSIER, exist_ok=True)
    chemin = os.path.join(DOSSIER, nom + '.json')
    # Garder l'id écrit en tête par create-questions --publier, s'il existe
    if os.path.exists(chemin):
        with open(chemin, encoding='utf-8') as f:
            ancien = json.load(f)
        if 'id' in ancien:
            m = {'id': ancien['id'], **m}
    with open(chemin, 'w', encoding='utf-8') as f:
        json.dump(m, f, ensure_ascii=False, indent=2)
        f.write('\n')


def fr(x):
    """Rationnel en LaTeX, comme l'élève le tape."""
    x = Fr(x)
    if x.denominator == 1:
        return str(x.numerator)
    return '\\frac{' + str(x.numerator) + '}{' + str(x.denominator) + '}'


def brut(n, d):
    """Fraction non réduite, telle que l'élève la lit dans le tableau."""
    return '\\frac{' + str(n) + '}{' + str(d) + '}'


def dec(x):
    """Décimal exact en LaTeX d'élève (virgule)."""
    x = Fr(x)
    for n in range(0, 9):
        if (x * 10 ** n).denominator == 1:
            s = str(abs((x * 10 ** n).numerator)).rjust(n + 1, '0')
            ent, frac = s[:len(s) - n], s[len(s) - n:]
            return ('-' if x < 0 else '') + ent + ('{,}' + frac if n else '')
    raise ValueError(x)


# =============================================================================================
# N1 — Probabilités dans un tableau d'effectifs (3S20-2). Une case, cellules a (A et B),
# b (A et non B), c (non A et B), d (non A et non B) ; A = première ligne, B = première colonne.
# Totaux affichés (ils ne donnent jamais la réponse). Fraction acceptée non réduite.
# =============================================================================================

N = '(a+b+c+d)'


def tableau(lignes, colonnes, coin, masquer=None):
    t = ('```tableau-croise\nlignes: ' + lignes[0] + ' ; ' + lignes[1] + '\ncolonnes: '
         + colonnes[0] + ' ; ' + colonnes[1] + '\n' + lignes[0] + ' = {{a}} ; {{b}}\n'
         + lignes[1] + ' = {{c}} ; {{d}}\ncoin: ' + coin + '\n')
    if masquer:
        t += 'masquer: ' + masquer + '\n'
    return t + '```'


def cases(bas, haut):
    return [var(x, bas + '..' + haut) for x in 'abcd']


def p(num):
    return '{{eval:(' + num + ')/' + N + '}}'


def frac(num):
    """Fraction affichée dans le corrigé."""
    return '\\dfrac{ {{eval:' + num + '}} }{ {{eval:' + N + '}} }'


HINT_ET = ('Compte les oiseaux qui ont **les deux** caractères à la fois, puis divise par le nombre '
           'total d\'oiseaux.')
HINT_OU = ('« $A$ ou $B$ » : au moins l\'un des deux. $P(A \\text{ ou } B)=P(A)+P(B)-P(A \\text{ et } B)$.')
HINT_PAS_LES_DEUX = ('« L\'un ou l\'autre, mais pas les deux » : compte les cases où **un seul** des '
                     'deux caractères est présent.')

n1, n1s = [], []

# v0 — « A et B » : volière, effectifs de 3 à 15
ERR_LIGNE = ('Tu as divisé par le nombre de perruches : on choisit un oiseau parmi **tous** les '
             'oiseaux de la volière.')
ERR_COLONNE = ('Tu as divisé par le nombre de mâles : on choisit un oiseau parmi **tous** les '
               'oiseaux de la volière.')
ERR_TOTAL_LIGNE = ('Tu as compté toutes les perruches : il faut aussi que l\'oiseau soit un mâle, '
                   'c\'est la case « Perruches / Mâles ».')
n1.append(variation(
    'Dans une volière, on a compté les oiseaux selon leur espèce et leur sexe.\n\n'
    + tableau(['Perruches', 'Canaris'], ['Mâles', 'Femelles'], 'Espèce \\ Sexe') + '\n\n'
    'On choisit un oiseau de la volière au hasard. Quelle est la probabilité que ce soit une '
    'perruche **et** un mâle ? ' + REPONSE + '\n\n$$?$$',
    cases('3', '15'),
    p('a'),
    [erreur('{{eval:a/(a+b)}}', ERR_LIGNE, 'Case sur le total de sa ligne'),
     erreur('{{eval:a/(a+c)}}', ERR_COLONNE, 'Case sur le total de sa colonne'),
     erreur(p('a+b'), ERR_TOTAL_LIGNE, 'Total de la ligne au lieu de la case')],
    ['Les ${{eval:' + N + '}}$ oiseaux ont la même chance d\'être choisis : '
     '$P=\\dfrac{\\text{nombre d\'issues favorables}}{\\text{nombre d\'issues}}$.',
     'Les perruches mâles sont dans la case « Perruches / Mâles » : il y en a ${{a}}$.',
     '$P=' + frac('a') + '=' + PRIMAIRE + '{ {{solution}} }$.'],
    HINT_ET,
    ['b != c', 'a*' + N + ' != (a+b)*(a+b)', 'a*' + N + ' != (a+c)*(a+b)']))
v = {'a': 6, 'b': 4, 'c': 3, 'd': 7}  # N = 20 ; 6/20
n1s += [spec('Volière : 6/20', 0, v, 'correct', [brut(6, 20)]),
        spec('Volière : réduite 3/10', 0, v, 'correct', [fr(Fr(3, 10))]),
        spec('Volière : décimal 0,3', 0, v, 'correct', [dec(Fr(3, 10))]),
        spec('Volière : sur sa ligne', 0, v, 'incorrect', [brut(6, 10)], ERR_LIGNE),
        spec('Volière : sur sa colonne', 0, v, 'incorrect', [brut(6, 9)], ERR_COLONNE),
        spec('Volière : total de ligne', 0, v, 'incorrect', [brut(10, 20)], ERR_TOTAL_LIGNE)]

# v1 — « A ou B » : bouquet, effectifs de 3 à 15
ERR_DOUBLE = ('Tu as additionné les roses et les fleurs rouges : les roses rouges sont comptées deux '
              'fois. $P(A \\text{ ou } B)=P(A)+P(B)-P(A \\text{ et } B)$.')
ERR_ET = ('Tu as compté les roses rouges seulement : « une rose **ou** une fleur rouge » compte aussi '
          'les roses blanches et les tulipes rouges.')
ERR_EXCLUSIF = ('Tu as oublié les roses rouges : une rose rouge est une rose, elle compte dans « une '
                'rose ou une fleur rouge ».')
n1.append(variation(
    'Un fleuriste a composé un bouquet de roses et de tulipes, rouges ou blanches.\n\n'
    + tableau(['Roses', 'Tulipes'], ['Rouges', 'Blanches'], 'Fleur \\ Couleur') + '\n\n'
    'On tire une fleur du bouquet au hasard. Quelle est la probabilité que ce soit une rose **ou** '
    'une fleur rouge ? ' + REPONSE + '\n\n$$?$$',
    cases('3', '15'),
    p('a+b+c'),
    [erreur(p('2*a+b+c'), ERR_DOUBLE, 'P(A) + P(B) sans retirer P(A et B)'),
     erreur(p('a'), ERR_ET, '« et » au lieu de « ou »'),
     erreur(p('b+c'), ERR_EXCLUSIF, '« ou » exclusif')],
    ['Il y a ${{eval:a+b}}$ roses, ${{eval:a+c}}$ fleurs rouges, et ${{a}}$ roses rouges, qui '
     'sont à la fois des roses et des fleurs rouges.',
     '$P(A \\text{ ou } B)=P(A)+P(B)-P(A \\text{ et } B)=' + frac('a+b') + '+' + frac('a+c') + '-'
     + frac('a') + '$.',
     '$P=' + frac('a+b+c') + '=' + PRIMAIRE + '{ {{solution}} }$.'],
    HINT_OU,
    ['2*a+b+c <= ' + N]))
v = {'a': 5, 'b': 4, 'c': 3, 'd': 8}  # N = 20 ; 12/20
n1s += [spec('Bouquet : 12/20', 1, v, 'correct', [brut(12, 20)]),
        spec('Bouquet : réduite 3/5', 1, v, 'correct', [fr(Fr(3, 5))]),
        spec('Bouquet : décimal 0,6', 1, v, 'correct', [dec(Fr(3, 5))]),
        spec('Bouquet : roses rouges comptées deux fois', 1, v, 'incorrect', [brut(17, 20)],
             ERR_DOUBLE),
        spec('Bouquet : « et »', 1, v, 'incorrect', [brut(5, 20)], ERR_ET),
        spec('Bouquet : exclusif', 1, v, 'incorrect', [brut(7, 20)], ERR_EXCLUSIF)]

# v2 — « A ou B, mais pas les deux » : garage, effectifs de 100 à 240 (total < 1 000 : pas
# d'espace à écrire dans les grands nombres)
ERR_INCLUSIF = ('Tu as compté aussi les voitures électriques neuves : elles sont électriques **et** '
                'neuves, l\'énoncé les exclut.')
ERR_ET_G = 'Tu as compté les voitures électriques neuves : ce sont celles qui ont les deux caractères.'
ERR_DOUBLE_G = ('Tu as additionné les voitures électriques et les voitures neuves : les électriques '
                'neuves sont comptées deux fois, alors qu\'elles sont exclues.')
n1.append(variation(
    'Un garage a relevé le moteur et l\'état des voitures de son parc.\n\n'
    + tableau(['Électriques', 'Essence'], ['Neuves', 'Occasion'], 'Moteur \\ État') + '\n\n'
    'On choisit une voiture du parc au hasard. Quelle est la probabilité qu\'elle soit électrique '
    'ou neuve, **mais pas les deux** ? ' + REPONSE + '\n\n$$?$$',
    cases('100', '240'),
    p('b+c'),
    [erreur(p('a+b+c'), ERR_INCLUSIF, '« ou » inclusif'),
     erreur(p('a'), ERR_ET_G, '« et » au lieu de « pas les deux »'),
     erreur(p('2*a+b+c'), ERR_DOUBLE_G, 'P(A) + P(B)')],
    ['Une voiture « électrique ou neuve, mais pas les deux » est électrique d\'occasion, ou neuve '
     'à essence.',
     'Il y en a ${{b}}+{{c}}={{eval:b+c}}$ sur ${{eval:' + N + '}}$.',
     '$P=' + frac('b+c') + '=' + PRIMAIRE + '{ {{solution}} }$.'],
    HINT_PAS_LES_DEUX,
    ['2*a+b+c <= ' + N, 'a != b+c']))
v = {'a': 120, 'b': 230, 'c': 150, 'd': 200}  # N = 700 ; 380/700
n1s += [spec('Garage : 380/700', 2, v, 'correct', [brut(380, 700)]),
        spec('Garage : réduite 19/35', 2, v, 'correct', [fr(Fr(19, 35))]),
        spec('Garage : inclusif', 2, v, 'incorrect', [brut(500, 700)], ERR_INCLUSIF),
        spec('Garage : « et »', 2, v, 'incorrect', [brut(120, 700)], ERR_ET_G),
        spec('Garage : P(A) + P(B)', 2, v, 'incorrect', [brut(620, 700)], ERR_DOUBLE_G)]

# v3 — une case masquée à retrouver, puis « A ou B » : cité scolaire, effectifs de 100 à 240
ERR_OUBLI = ('Tu as oublié les lycéens demi-pensionnaires : la case est masquée, mais ils sont '
             'demi-pensionnaires. Retrouve-les avec le total de la colonne.')
ERR_DOUBLE_C = ('Tu as additionné les collégiens et les demi-pensionnaires : les collégiens '
                'demi-pensionnaires sont comptés deux fois.')
ERR_ET_C = ('Tu as compté les collégiens demi-pensionnaires seulement : « collégien **ou** '
            'demi-pensionnaire » compte aussi les collégiens externes et les lycéens '
            'demi-pensionnaires.')
n1.append(variation(
    'Une cité scolaire réunit un collège et un lycée. On a relevé le régime de ses élèves ; une '
    'case du tableau est masquée.\n\n'
    + tableau(['Collégiens', 'Lycéens'], ['Demi-pensionnaires', 'Externes'], 'Élèves \\ Régime',
              'Lycéens/Demi-pensionnaires') + '\n\n'
    'On choisit un élève de la cité scolaire au hasard. Quelle est la probabilité que ce soit un '
    'collégien **ou** un demi-pensionnaire ? ' + REPONSE + '\n\n$$?$$',
    cases('100', '240'),
    p('a+b+c'),
    [erreur(p('a+b'), ERR_OUBLI, 'Case masquée oubliée'),
     erreur(p('2*a+b+c'), ERR_DOUBLE_C, 'P(A) + P(B) sans retirer P(A et B)'),
     erreur(p('a'), ERR_ET_C, '« et » au lieu de « ou »')],
    ['La case masquée se retrouve avec le total de sa colonne : il y a '
     '${{eval:a+c}}-{{a}}={{c}}$ lycéens demi-pensionnaires.',
     'Un collégien ou un demi-pensionnaire : collégiens demi-pensionnaires, collégiens externes, '
     'lycéens demi-pensionnaires, soit ${{a}}+{{b}}+{{c}}={{eval:a+b+c}}$ élèves.',
     '$P=' + frac('a+b+c') + '=' + PRIMAIRE + '{ {{solution}} }$.'],
    'Commence par retrouver l\'effectif de la case masquée avec le total de sa colonne.',
    ['2*a+b+c <= ' + N]))
v = {'a': 150, 'b': 200, 'c': 120, 'd': 230}  # N = 700 ; 470/700
n1s += [spec('Cité : 470/700', 3, v, 'correct', [brut(470, 700)]),
        spec('Cité : réduite 47/70', 3, v, 'correct', [fr(Fr(47, 70))]),
        spec('Cité : case masquée oubliée', 3, v, 'incorrect', [brut(350, 700)], ERR_OUBLI),
        spec('Cité : comptés deux fois', 3, v, 'incorrect', [brut(620, 700)], ERR_DOUBLE_C),
        spec('Cité : « et »', 3, v, 'incorrect', [brut(150, 700)], ERR_ET_C)]

ecrire('n1-probabilites-dans-un-tableau-d-effectifs', modele(
    'Probabilités dans un tableau d\'effectifs',
    'Lire dans un tableau d\'effectifs la probabilité de « A et B », de « A ou B », de « A ou B, '
    'mais pas les deux ».',
    2, n1, n1s, {'constraints': {'reducedFractions': 'off'}}))

# =============================================================================================
# N2 — Jeux à deux épreuves : « et », « ou » (3S20-3). Une case ; l'élève construit le tableau
# des issues. Fraction réduite attendue (non réduite : ambre, comme b28ed4fa).
# =============================================================================================

n2, n2s = [], []

# v0 — deux tas de cartes (rois, dames ; rouges, noires), « même figure ou même couleur »
# r = roi rouge, s = roi noir, t = dame rouge, u = dame noire, 1 = premier tas, 2 = second tas.
N1C, N2C = '(r1+s1+t1+u1)', '(r2+s2+t2+u2)'
TOT = N1C + '*' + N2C
DIFF = '(r1*u2+s1*t2+t1*s2+u1*r2)'          # figure différente et couleur différente
FIG = '((r1+s1)*(r2+s2)+(t1+u1)*(t2+u2))'   # même figure
COUL = '((r1+t1)*(r2+t2)+(s1+u1)*(s2+u2))'  # même couleur
LES_DEUX = '(r1*r2+s1*s2+t1*t2+u1*u2)'      # même figure et même couleur
ERR_DEUX_FOIS = ('Tu as additionné « même figure » et « même couleur » : les paires de cartes '
                 'identiques sont comptées deux fois.')
ERR_ET_CARTES = ('Tu as compté les paires de cartes identiques : « même figure **ou** même couleur » '
                 'demande seulement l\'un des deux.')
ERR_SOMME_TAS = ('Il y a ${{eval:' + N1C + '}}\\times{{eval:' + N2C + '}}$ paires de cartes '
                 'possibles, pas ${{eval:' + N1C + '}} + {{eval:' + N2C + '}}$.')


def tas(k):
    return ('| Tas ' + k + ' | Roi | Dame |\n|---|---|---|\n| Rouge | ${{r' + k + '}}$ | ${{t' + k
            + '}}$ |\n| Noire | ${{s' + k + '}}$ | ${{u' + k + '}}$ |')


n2.append(variation(
    'Léa a deux tas de cartes. Les tableaux donnent le nombre de cartes de chaque sorte dans '
    'chaque tas.\n\n' + tas('1') + '\n\n' + tas('2') + '\n\n'
    'Elle tire une carte au hasard dans chaque tas. Elle gagne si les deux cartes ont la même '
    'figure **ou** la même couleur. Quelle est la probabilité qu\'elle gagne ? ' + REPONSE
    + '\n\n$$?$$',
    [var(x + k, '1..2') for k in '12' for x in 'rstu'],
    '{{eval:1-' + DIFF + '/(' + TOT + ')}}',
    [erreur('{{eval:(' + FIG + '+' + COUL + ')/(' + TOT + ')}}', ERR_DEUX_FOIS,
            '« au moins une » comptée deux fois'),
     erreur('{{eval:' + LES_DEUX + '/(' + TOT + ')}}', ERR_ET_CARTES, '« et » au lieu de « ou »'),
     erreur('{{eval:(' + TOT + '-' + DIFF + ')/(' + N1C + '+' + N2C + ')}}', ERR_SOMME_TAS,
            'Dénominateur n₁ + n₂')],
    ['Un tableau à ${{eval:' + N1C + '}}$ lignes (cartes du tas 1) et ${{eval:' + N2C
     + '}}$ colonnes (cartes du tas 2) donne ${{eval:' + TOT + '}}$ issues équiprobables.',
     'Léa perd seulement si les deux cartes n\'ont ni la même figure ni la même couleur : un roi '
     'rouge avec une dame noire, ou un roi noir avec une dame rouge. Cela fait '
     '${{r1}}\\times{{u2}}+{{s1}}\\times{{t2}}+{{t1}}\\times{{s2}}+{{u1}}\\times{{r2}}={{eval:' + DIFF
     + '}}$ issues.',
     'Elle gagne donc dans ${{eval:' + TOT + '-' + DIFF + '}}$ issues : $P=\\dfrac{ {{eval:' + TOT
     + '-' + DIFF + '}} }{ {{eval:' + TOT + '}} }=' + PRIMAIRE + '{ {{solution}} }$.'],
    'Fais un tableau : les cartes du premier tas en lignes, celles du second en colonnes. Il est '
    'plus simple de compter les issues où Léa perd.',
    [N1C + ' <= 6', N2C + ' <= 6', N1C + ' >= 5', N2C + ' >= 5',
     FIG + '+' + COUL + ' != ' + TOT + '-' + DIFF]))


def cartes(r1, s1, t1, u1, r2, s2, t2, u2):
    tot = (r1 + s1 + t1 + u1) * (r2 + s2 + t2 + u2)
    diff = r1 * u2 + s1 * t2 + t1 * s2 + u1 * r2
    fig = (r1 + s1) * (r2 + s2) + (t1 + u1) * (t2 + u2)
    coul = (r1 + t1) * (r2 + t2) + (s1 + u1) * (s2 + u2)
    deux = r1 * r2 + s1 * s2 + t1 * t2 + u1 * u2
    return tot, diff, fig, coul, deux


# L'erreur « n₁ + n₂ » dépasse 1 : c'est une vraie erreur d'élève, gardée telle quelle.
v = {'r1': 2, 's1': 1, 't1': 1, 'u1': 1, 'r2': 1, 's2': 1, 't2': 2, 'u2': 1}
tot, diff, fig, coul, deux = cartes(*v.values())  # 25 issues, 6 perdantes : 19/25
n2s += [spec('Cartes : 19/25', 0, v, 'correct', [fr(1 - Fr(diff, tot))]),
        spec('Cartes : 0,76', 0, v, 'correct', [dec(1 - Fr(diff, tot))]),
        spec('Cartes : comptée deux fois', 0, v, 'incorrect', [fr(Fr(fig + coul, tot))],
             ERR_DEUX_FOIS),
        spec('Cartes : « et »', 0, v, 'incorrect', [fr(Fr(deux, tot))], ERR_ET_CARTES),
        spec('Cartes : n₁ + n₂', 0, v, 'incorrect', [fr(Fr(tot - diff, 10))],
             'Il y a $5\\times5$ paires de cartes possibles, pas $5 + 5$.')]

# v1 — dé + urne de 6 boules numérotées, bleues ou rouges : « bleue et numéro ⩾ dé »
# k = 0 : boules 1 à m bleues ; k = 1 : boules m à 6 bleues.
NB = '((1-k)*m+k*(7-m))'                          # nombre de boules bleues
FAV = '((1-k)*m*(m+1)/2+k*(21-(m-1)*m/2))'         # issues (dé, boule bleue de numéro ⩾ dé)
OU = '(6*' + NB + '+21-' + FAV + ')'               # bleue ou numéro ⩾ dé
ERR_OU_URNE = ('Tu as compté les issues où la boule est bleue **ou** a un numéro supérieur ou égal '
               'au dé : il faut les deux à la fois.')
ERR_STRICT = ('« Supérieur ou égal » : quand la boule porte le même numéro que le dé, Hugo gagne '
              'aussi (si elle est bleue).')
ERR_12 = ('Il y a $6\\times6=36$ issues (dé, boule), pas $6 + 6 = 12$.')
n2.append(variation(
    'Une urne contient six boules numérotées de $1$ à $6$. Les boules numérotées '
    '{{if:k==0|de $1$ à ${{m}}$|de ${{m}}$ à $6$}} sont bleues, les autres sont rouges. Hugo lance '
    'un dé équilibré à six faces, puis tire une boule au hasard dans l\'urne.\n\n'
    'Il gagne si la boule est bleue **et** si son numéro est supérieur ou égal au nombre donné '
    'par le dé. Quelle est la probabilité qu\'il gagne ? ' + REPONSE + '\n\n$$?$$',
    [var('k', '0..1'), var('m', '2..5')],
    '{{eval:' + FAV + '/36}}',
    [erreur('{{eval:' + OU + '/36}}', ERR_OU_URNE, '« ou » au lieu de « et »'),
     erreur('{{eval:(' + FAV + '-' + NB + ')/36}}', ERR_STRICT, '⩾ lu comme >'),
     erreur('{{eval:' + FAV + '/12}}', ERR_12, 'Dénominateur 6 + 6')],
    ['Un tableau (dé en lignes, boule en colonnes) donne $6\\times6=36$ issues équiprobables.',
     'Une boule bleue de numéro $j$ gagne avec les dés $1$, …, $j$, soit $j$ issues. Les boules '
     'bleues portent les numéros {{if:k==0|$1$ à ${{m}}$|${{m}}$ à $6$}} : cela fait '
     '${{eval:' + FAV + '}}$ issues gagnantes.',
     '$P=\\dfrac{ {{eval:' + FAV + '}} }{36}=' + PRIMAIRE + '{ {{solution}} }$.'],
    'Fais le tableau des $36$ issues (dé, boule) et entoure celles où la boule est bleue **et** '
    'porte un numéro au moins égal au dé.',
    [FAV + ' <= 12']))
for k, m in [(0, 3), (1, 4)]:
    nb = m if k == 0 else 7 - m
    fav = m * (m + 1) // 2 if k == 0 else 21 - (m - 1) * m // 2
    ou = 6 * nb + 21 - fav
    v = {'k': k, 'm': m}
    n2s += [spec(f'Dé et urne k={k} m={m}', 1, v, 'correct', [fr(Fr(fav, 36))]),
            spec(f'Dé et urne k={k} m={m} : non réduite', 1, v, 'unoptimal_form', [brut(fav, 36)],
                 violations=['reducedFractions']),
            spec(f'Dé et urne k={k} m={m} : « ou »', 1, v, 'incorrect', [fr(Fr(ou, 36))],
                 ERR_OU_URNE),
            spec(f'Dé et urne k={k} m={m} : strict', 1, v, 'incorrect', [fr(Fr(fav - nb, 36))],
                 ERR_STRICT),
            spec(f'Dé et urne k={k} m={m} : 12', 1, v, 'incorrect', [fr(Fr(fav, 12))], ERR_12)]

# v2 — urne de trois couleurs, deux tirages avec remise : « au moins une boule rouge »
NU = '(r+v+j)'
ERR_DEUX_FOIS_U = ('Tu as additionné « rouge au 1er tirage » et « rouge au 2e tirage » : l\'issue '
                   '(rouge, rouge) est comptée deux fois.')
ERR_ET_U = ('Tu as calculé la probabilité de deux boules rouges : « au moins une » compte aussi les '
            'issues avec une seule boule rouge.')
ERR_EXACT_U = ('Tu as compté les issues avec exactement une boule rouge : « au moins une » compte '
               'aussi l\'issue (rouge, rouge).')
n2.append(variation(
    'Une urne contient ${{r}}$ {{if:r==1|boule rouge|boules rouges}}, ${{v}}$ {{if:v==1|boule '
    'verte|boules vertes}} et ${{j}}$ {{if:j==1|boule jaune|boules jaunes}}. On tire une boule au '
    'hasard, on note sa couleur, on la remet dans l\'urne, puis on tire une seconde boule.\n\n'
    'Quelle est la probabilité d\'obtenir au moins une boule rouge ? ' + REPONSE + '\n\n$$?$$',
    [var('r', '1..4'), var('v', '1..4'), var('j', '1..4')],
    '{{eval:1-(v+j)*(v+j)/(' + NU + '*' + NU + ')}}',
    [erreur('{{eval:2*r/' + NU + '}}', ERR_DEUX_FOIS_U, '« au moins une » comptée deux fois'),
     erreur('{{eval:r*r/(' + NU + '*' + NU + ')}}', ERR_ET_U, '« et » au lieu de « ou »'),
     erreur('{{eval:2*r*(v+j)/(' + NU + '*' + NU + ')}}', ERR_EXACT_U, 'Exactement une')],
    ['Numérotons les ${{eval:' + NU + '}}$ boules : un tableau des deux tirages donne '
     '${{eval:' + NU + '}}\\times{{eval:' + NU + '}}={{eval:' + NU + '*' + NU
     + '}}$ issues équiprobables.',
     'Le contraire de « au moins une boule rouge » est « aucune boule rouge » : '
     '${{eval:v+j}}\\times{{eval:v+j}}={{eval:(v+j)*(v+j)}}$ issues.',
     '$P=1-\\dfrac{ {{eval:(v+j)*(v+j)}} }{ {{eval:' + NU + '*' + NU + '}} }=' + PRIMAIRE
     + '{ {{solution}} }$.'],
    'Il est plus simple de compter les issues **sans** boule rouge, puis de passer au contraire.',
    ['2*r < ' + NU]))
for r, vv, j in [(1, 2, 3), (2, 3, 1)]:
    nu = r + vv + j
    juste = 1 - Fr((vv + j) ** 2, nu * nu)
    v = {'r': r, 'v': vv, 'j': j}
    n2s += [spec(f'Urne {r}-{vv}-{j}', 2, v, 'correct', [fr(juste)]),
            spec(f'Urne {r}-{vv}-{j} : non réduite', 2, v,
                 'unoptimal_form' if juste.denominator != nu * nu else 'correct',
                 [brut(nu * nu - (vv + j) ** 2, nu * nu)],
                 violations=['reducedFractions'] if juste.denominator != nu * nu else None),
            spec(f'Urne {r}-{vv}-{j} : deux fois', 2, v, 'incorrect', [fr(Fr(2 * r, nu))],
                 ERR_DEUX_FOIS_U),
            spec(f'Urne {r}-{vv}-{j} : « et »', 2, v, 'incorrect', [fr(Fr(r * r, nu * nu))],
                 ERR_ET_U),
            spec(f'Urne {r}-{vv}-{j} : exactement une', 2, v, 'incorrect',
                 [fr(Fr(2 * r * (vv + j), nu * nu))], ERR_EXACT_U)]

# v3 — dé à 4 et dé à 6 : « les deux » (k = 0) ou « au moins un » (k = 1), pair ou impair (q)
ERR_ET_OU_D = ('{{if:k==0|Tu as compté les issues où au moins un dé convient : « les deux » demande '
               'que les deux dés conviennent.|Tu as compté les issues où les deux dés conviennent : '
               '« au moins un » compte aussi les issues où un seul dé convient.}}')
ERR_ADD_D = ('Tu as additionné les probabilités des deux dés : compte plutôt les issues dans le '
             'tableau des deux dés.')
ERR_10 = 'Il y a $4\\times6=24$ issues, pas $4 + 6 = 10$.'
n2.append(variation(
    'On lance un dé équilibré à quatre faces (numérotées de $1$ à $4$) et un dé équilibré à six '
    'faces (numérotées de $1$ à $6$).\n\n'
    'Quelle est la probabilité que {{if:k==0|les deux dés donnent|au moins un des deux dés donne}} '
    'un nombre {{if:q==0|pair|impair}} ? ' + REPONSE + '\n\n$$?$$',
    [var('k', '0..1'), var('q', '0..1')],
    '{{eval:(1+2*k)/4}}',
    [erreur('{{eval:(3-2*k)/4}}', ERR_ET_OU_D, '« et » et « ou » confondus'),
     erreur('1', ERR_ADD_D, 'Probabilités des deux dés additionnées'),
     erreur('\\frac{1}{2}', ERR_10, 'Dénominateur 4 + 6')],
    ['Un tableau (dé à quatre faces en lignes, dé à six faces en colonnes) donne $4\\times6=24$ '
     'issues équiprobables.',
     'Le dé à quatre faces a $2$ nombres {{if:q==0|pairs|impairs}}, le dé à six faces en a $3$. '
     '{{if:k==0|Les deux dés conviennent dans $2\\times3=6$ issues.|Aucun dé ne convient dans '
     '$2\\times3=6$ issues, donc au moins un convient dans $24-6=18$ issues.}}',
     '$P=\\dfrac{ {{eval:6+12*k}} }{24}=' + PRIMAIRE + '{ {{solution}} }$.'],
    'Fais le tableau des $24$ issues et colorie celles qui conviennent.'))
# Erreur « 4 + 6 » : l'élève compte les nombres qui conviennent sur les deux dés, 2 + 3 = 5, sur
# 4 + 6 = 10, dans les deux cas : 1/2.
for k, q in [(0, 0), (1, 1)]:
    v = {'k': k, 'q': q}
    juste = Fr(1 + 2 * k, 4)
    n2s += [spec(f'Dés 4 et 6 k={k} q={q}', 3, v, 'correct', [fr(juste)]),
            spec(f'Dés 4 et 6 k={k} q={q} : décimal', 3, v, 'correct', [dec(juste)]),
            spec(f'Dés 4 et 6 k={k} q={q} : non réduite', 3, v, 'unoptimal_form',
                 [brut(6 + 12 * k, 24)], violations=['reducedFractions']),
            spec(f'Dés 4 et 6 k={k} q={q} : et / ou', 3, v, 'incorrect', [fr(Fr(3 - 2 * k, 4))],
                 'Tu as compté les issues où au moins un dé convient : « les deux » demande que '
                 'les deux dés conviennent.' if k == 0 else
                 'Tu as compté les issues où les deux dés conviennent : « au moins un » compte '
                 'aussi les issues où un seul dé convient.'),
            spec(f'Dés 4 et 6 k={k} q={q} : additionné', 3, v, 'incorrect', ['1'], ERR_ADD_D),
            spec(f'Dés 4 et 6 k={k} q={q} : 4 + 6', 3, v, 'incorrect', [fr(Fr(1, 2))], ERR_10)]

ecrire('n2-jeux-a-deux-epreuves-et-ou', modele(
    'Jeux à deux épreuves : évènements « et », « ou »',
    'Calculer la probabilité de gagner à un jeu à deux épreuves (cartes, dé et urne, urne avec '
    'remise, deux dés) quand l\'évènement est un « et » ou un « ou ».',
    3, n2, n2s, None))

print('N1 :', len(n1), 'variations,', len(n1s), 'specs ; N2 :', len(n2), 'variations,', len(n2s),
      'specs')
