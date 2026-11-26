"""Ajoute les variations validées aux 3 modèles publiés exportés de prod dans
scripts/questions/idees-3e-probabilites-publies/ (chantier idees-3e-probabilites).

Phase 0 : fiches de docs/wip/idees-3e-probabilites-progress.md, validées par David le 2026-11-26 :
V1 (4 variations de b28ed4fa « Deux épreuves », 4-049), V2 (1 variation de e73b947f
« Probabilité d'un évènement », 4-048), V3 (1 variation de 247fddd1 « Évènement contraire »,
4-079). Les variations s'ajoutent À LA FIN (les réponses des élèves gardent l'indice de leur
variation) ; la migration de contenu est générée par scripts/questions/migration-contenu.ts.

Le script repart du contenu de prod (variations et specs d'origine, comptées dans ORIGINE) :
le relancer réécrit les ajouts sans les doubler. Options et partagé des modèles inchangés
(fraction non réduite : ambre, comme les variations d'origine).

Usage : python3 docs/wip/questions/idees-3e-probabilites-publies.py scripts/questions/idees-3e-probabilites-publies
"""
import json
import os
import sys
from fractions import Fraction as Fr

DOSSIER = sys.argv[1]

PRIMAIRE = '\\textcolor{{{color:primary.0}}}'
REPONSE = 'Donne le résultat sous la forme d\'une fraction irréductible ou d\'un nombre décimal.'

# id court → (variations, specs) d'origine en prod (export du 2026-11-26)
ORIGINE = {'b28ed4fa': (4, 14), 'e73b947f': (4, 14), '247fddd1': (4, 10)}


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


def var(nom, expression):
    return {'name': nom, 'expression': expression}


def erreur(answer, message, label):
    return {'answer': answer, 'message': message, 'label': label}


def variation(statement, variables, attendue, erreurs, steps, hint, conditions=None):
    return {'statement': statement, 'variables': variables, 'conditions': conditions or [],
            'blanks': [{'expectedAnswer': attendue, 'expectedErrors': erreurs}],
            'correction': {'steps': steps}, 'hint': hint}


def ajouter(court, variations, specs):
    chemin = os.path.join(DOSSIER, court + '.json')
    with open(chemin, encoding='utf-8') as f:
        m = json.load(f)
    nv, ns = ORIGINE[court]
    assert len(m['variations']) >= nv and len(m['testSpecs']) >= ns, court
    m['variations'] = m['variations'][:nv]
    m['testSpecs'] = m['testSpecs'][:ns]
    for s in specs:
        s['variationIndex'] += nv
    m['variations'] += variations
    m['testSpecs'] += specs
    with open(chemin, 'w', encoding='utf-8') as f:
        json.dump(m, f, ensure_ascii=False, indent=2)
        f.write('\n')
    print(court, ':', len(variations), 'variations,', len(specs), 'specs ajoutées')


def fr(x):
    x = Fr(x)
    if x.denominator == 1:
        return str(x.numerator)
    return '\\frac{' + str(x.numerator) + '}{' + str(x.denominator) + '}'


def brut(n, d):
    return '\\frac{' + str(n) + '}{' + str(d) + '}'


DEUX_EPREUVES = ('**Deux épreuves.** On écrit toutes les issues (tableau ou arbre) : elles sont '
                 'équiprobables, puis on compte celles qui réalisent l\'évènement.')

# =============================================================================================
# V1 — b28ed4fa « Deux épreuves » : 4 variations (4-049).
# =============================================================================================

vb, sb = [], []

# v4 — urne de r rouges et v vertes, deux tirages avec remise : k = 0 deux rouges, k = 1 même
# couleur, k = 2 couleurs différentes.
NU = '(r+v)'
JUSTE_U = '{{eval:({{if:k==0|r*r|{{if:k==1|r*r+v*v|2*r*v}}}})/(' + NU + '*' + NU + ')}}'
ERR_EQUI = ('Les quatre issues (R ; R), (R ; V), (V ; R), (V ; V) ne sont pas équiprobables : il n\'y '
            'a pas autant de boules rouges que de vertes. Numérote les boules.')
ERR_OUBLI = ('{{if:k==0|Tu as donné la probabilité de tirer une rouge **une** fois : il y a deux '
             'tirages.|{{if:k==1|Tu as oublié l\'issue (verte ; verte).|Tu as oublié l\'issue '
             '(verte ; rouge) : la rouge peut sortir au second tirage.}}}}')
ERR_TROIS = ('{{if:k==0|Tu as additionné les deux tirages : pour deux rouges, compte les issues '
             'dans un tableau.|Il n\'y a pas trois issues équiprobables : (R ; V) et (V ; R) sont '
             'deux issues différentes, et les couleurs n\'ont pas le même nombre de boules.}}')
vb.append(variation(
    'Une urne contient ${{r}}$ {{if:r==1|boule rouge|boules rouges}} et ${{v}}$ {{if:v==1|boule '
    'verte|boules vertes}}. On tire une boule au hasard, on note sa couleur, on la remet dans '
    'l\'urne, puis on tire une seconde boule.\n\n'
    'Quelle est la probabilité d\'obtenir {{if:k==0|deux boules rouges|{{if:k==1|deux boules de '
    'la même couleur|deux boules de couleurs différentes}}}} ? ' + REPONSE + '\n\n$$?$$',
    [var('k', '0..2'), var('r', '1..4'), var('v', '1..4')],
    JUSTE_U,
    [erreur('{{if:k==0|\\frac{1}{4}|\\frac{1}{2}}}', ERR_EQUI, 'Quatre issues RR, RV, VR, VV'),
     erreur('{{eval:({{if:k==0|r*' + NU + '|{{if:k==1|r*r|r*v}}}})/(' + NU + '*' + NU + ')}}',
            ERR_OUBLI, 'Une épreuve ou une issue oubliée'),
     erreur('{{eval:({{if:k==0|2*r/' + NU + '|1/3}})}}',
            ERR_TROIS, 'Tirages additionnés, ou trois issues équiprobables')],
    [DEUX_EPREUVES,
     'On numérote les ${{eval:' + NU + '}}$ boules : un tableau des deux tirages a '
     '${{eval:' + NU + '}}\\times{{eval:' + NU + '}}={{eval:' + NU + '*' + NU + '}}$ cases, '
     'toutes équiprobables.',
     '{{if:k==0|Deux rouges : ${{r}}\\times{{r}}={{eval:r*r}}$ cases.|{{if:k==1|Deux rouges : '
     '${{eval:r*r}}$ cases ; deux vertes : ${{eval:v*v}}$ cases ; en tout ${{eval:r*r+v*v}}$ '
     'cases.|Rouge puis verte : ${{eval:r*v}}$ cases ; verte puis rouge : ${{eval:r*v}}$ cases ; '
     'en tout ${{eval:2*r*v}}$ cases.}}}} $P=' + PRIMAIRE + '{ {{solution}} }$.'],
    'Numérote les boules et fais le tableau des deux tirages : chaque case est une issue.',
    ['r != v', 'k + abs(v - 3*r) != 0']))
for k, r, v in [(0, 1, 2), (1, 3, 1), (2, 2, 3)]:
    nu = r + v
    juste = [Fr(r * r, nu * nu), Fr(r * r + v * v, nu * nu), Fr(2 * r * v, nu * nu)][k]
    oubli = [Fr(r, nu), Fr(r * r, nu * nu), Fr(r * v, nu * nu)][k]
    trois = [Fr(2 * r, nu), Fr(1, 3), Fr(1, 3)][k]
    equi = Fr(1, 4) if k == 0 else Fr(1, 2)
    vv = {'k': k, 'r': r, 'v': v}
    m_oubli = ['Tu as donné la probabilité de tirer une rouge **une** fois : il y a deux tirages.',
               'Tu as oublié l\'issue (verte ; verte).',
               'Tu as oublié l\'issue (verte ; rouge) : la rouge peut sortir au second tirage.'][k]
    m_trois = ('Tu as additionné les deux tirages : pour deux rouges, compte les issues dans un '
               'tableau.' if k == 0 else
               'Il n\'y a pas trois issues équiprobables : (R ; V) et (V ; R) sont deux issues '
               'différentes, et les couleurs n\'ont pas le même nombre de boules.')
    sb += [spec(f'Urne r={r} v={v} k={k}', 0, vv, 'correct', [fr(juste)]),
           spec(f'Urne r={r} v={v} k={k} : quatre issues', 0, vv, 'incorrect', [fr(equi)],
                ERR_EQUI),
           spec(f'Urne r={r} v={v} k={k} : oubli', 0, vv, 'incorrect', [fr(oubli)], m_oubli),
           spec(f'Urne r={r} v={v} k={k} : trois', 0, vv, 'incorrect', [fr(trois)], m_trois)]
# k = 1, r = 3, v = 1 : 10/16 non réduite → ambre
sb.append(spec('Urne r=3 v=1 k=1 : 10/16 non réduite', 0, {'k': 1, 'r': 3, 'v': 1},
               'unoptimal_form', [brut(10, 16)], violations=['reducedFractions']))

# v5 — une pièce choisit l'urne (6 boules chacune, 1-2-3 bleues, rouges, vertes) : P(bleue)
ERR_SIX = ('Tu as additionné les boules bleues des deux urnes sur $6$ : il y a $2\\times6=12$ issues '
           '(pièce, boule).')
ERR_PRODUIT = ('Tu as multiplié les probabilités des deux urnes : on ne tire que dans **une** urne, '
               'celle que donne la pièce.')
ERR_UNE_URNE = ('Tu n\'as regardé que l\'urne 1 : la pièce peut aussi tomber sur Face.')
vb.append(variation(
    'L\'urne 1 contient ${{b1}}$ {{if:b1==1|boule bleue|boules bleues}}, ${{r1}}$ {{if:r1==1|boule '
    'rouge|boules rouges}} et ${{eval:6-b1-r1}}$ {{if:b1+r1==5|boule verte|boules vertes}}. '
    'L\'urne 2 contient ${{b2}}$ {{if:b2==1|boule bleue|boules bleues}}, ${{r2}}$ {{if:r2==1|boule '
    'rouge|boules rouges}} et ${{eval:6-b2-r2}}$ {{if:b2+r2==5|boule verte|boules vertes}}.\n\n'
    'On lance une pièce équilibrée : sur Pile, on tire une boule au hasard dans l\'urne 1 ; sur '
    'Face, dans l\'urne 2.\n\nQuelle est la probabilité de tirer une boule bleue ? ' + REPONSE
    + '\n\n$$?$$',
    [var('b1', '1..3'), var('r1', '1..3'), var('b2', '1..3'), var('r2', '1..3')],
    '{{eval:(b1+b2)/12}}',
    [erreur('{{eval:(b1+b2)/6}}', ERR_SIX, 'Dénominateur 6'),
     erreur('{{eval:b1*b2/36}}', ERR_PRODUIT, 'Produit des deux urnes'),
     erreur('{{eval:b1/6}}', ERR_UNE_URNE, 'Urne 1 seule')],
    [DEUX_EPREUVES,
     'Les deux urnes ont $6$ boules : un tableau (pièce, boule) a $2\\times6=12$ issues '
     'équiprobables.',
     'Une boule bleue sort avec Pile dans ${{b1}}$ {{if:b1==1|issue|issues}} et avec Face dans '
     '${{b2}}$ {{if:b2==1|issue|issues}} : '
     '$P=\\dfrac{ {{eval:b1+b2}} }{12}=' + PRIMAIRE + '{ {{solution}} }$.'],
    'Chaque issue est un couple (côté de la pièce, boule tirée). Combien y en a-t-il ?',
    ['b1 != r1', 'b2 != r2', 'b1 != b2']))
for b1, r1, b2, r2 in [(1, 2, 3, 1), (2, 3, 1, 3)]:
    vv = {'b1': b1, 'r1': r1, 'b2': b2, 'r2': r2}
    sb += [spec(f'Pièce et urnes b={b1},{b2}', 1, vv, 'correct', [fr(Fr(b1 + b2, 12))]),
           spec(f'Pièce et urnes b={b1},{b2} : non réduite', 1, vv, 'unoptimal_form',
                [brut(b1 + b2, 12)], violations=['reducedFractions']),
           spec(f'Pièce et urnes b={b1},{b2} : sur 6', 1, vv, 'incorrect',
                [fr(Fr(b1 + b2, 6))], ERR_SIX),
           spec(f'Pièce et urnes b={b1},{b2} : produit', 1, vv, 'incorrect',
                [fr(Fr(b1 * b2, 36))], ERR_PRODUIT),
           spec(f'Pièce et urnes b={b1},{b2} : urne 1', 1, vv, 'incorrect', [fr(Fr(b1, 6))],
                ERR_UNE_URNE)]

# v6 — deux dés sans tableau : X = somme (o = 0, seuil 5 à 8), produit (o = 1, seuil 12 à 20)
# ou écart (o = 2, seuil 3), comparé par ⩽, <, ⩾, > (c = 0 à 3).
# L(u) = nombre de couples (a, b) avec X ⩽ u ; ⩽ s → L(s), < s → L(s − 1), ⩾ s → 36 − L(s − 1),
# > s → 36 − L(s). L'erreur « large / stricte » prend le seuil voisin (u2).
# L3(u) = nombre de paires {a, b} (a ⩽ b) avec X ⩽ u, sur 21 : l'erreur des issues sans ordre.
A = range(1, 7)


def l_somme(u):
    return '+'.join(f'min(max({u}-{a},0),6)' for a in A)


def l_produit(u):
    return '+'.join(f'min(floor({u}/{a}),6)' for a in A)


def l_ecart(u):
    return '+'.join(f'(min({a}+{u},6)-max({a}-{u},1)+1)' for a in A)


def l3_somme(u):
    return '+'.join(f'max(min(6,{u}-{a})-{a}+1,0)' for a in A)


def l3_produit(u):
    return '+'.join(f'max(min(6,floor({u}/{a}))-{a}+1,0)' for a in A)


def l3_ecart(u):
    return '+'.join(f'max(min(6,{a}+{u})-{a}+1,0)' for a in A)


I0, I1, I2 = '(1-min(o,1))', '(min(o,1)-max(o-1,0))', 'max(o-1,0)'


def melange(fs, u):
    return '(' + I0 + '*(' + fs[0](u) + ')+' + I1 + '*(' + fs[1](u) + ')+' + I2 + '*(' + fs[2](u) + '))'


LS = (l_somme, l_produit, l_ecart)
L3S = (l3_somme, l3_produit, l3_ecart)
VARS_DES = [
    var('o', '0..2'), var('c', '0..3'), var('ss', '5..8'), var('sp', '12..20'),
    var('s', 'eval:' + I0 + '*ss+' + I1 + '*sp+' + I2 + '*3'),
    var('u', 'eval:s-min(c,1)+floor(c/3)'),
    var('ub', 'eval:s-1+min(c,1)-floor(c/3)'),
    var('w', 'eval:floor(c/2)'),
    var('n', 'eval:w*36+(1-2*w)*' + melange(LS, 'u')),
    var('nb', 'eval:w*36+(1-2*w)*' + melange(LS, 'ub')),
    var('nt', 'eval:w*21+(1-2*w)*' + melange(L3S, 'u')),
]
X = ('{{if:o==0|la somme des deux nombres obtenus|{{if:o==1|le produit des deux nombres obtenus|'
     'l\'écart entre les deux nombres obtenus (le plus grand moins le plus petit)}}}}')
CMP = '{{if:c==0|\\leqslant|{{if:c==1|<|{{if:c==2|\\geqslant|>}}}}}}'
CMP_B = '{{if:c==0|<|{{if:c==1|\\leqslant|{{if:c==2|>|\\geqslant}}}}}}'
ERR_LARGE = ('Attention à l\'inégalité : $X ' + CMP + ' {{s}}$ {{if:c==0|compte|{{if:c==1|ne compte '
             'pas|{{if:c==2|compte|ne compte pas}}}}}} les issues où $X = {{s}}$.')
ERR_CONTRAIRE = 'Tu as compté les issues où $X ' + CMP + ' {{s}}$ est **faux** : c\'est l\'évènement contraire.'
ERR_SANS_ORDRE = ('Les issues $(1\\,;2)$ et $(2\\,;1)$ sont différentes : il y a $36$ issues '
                  'équiprobables, pas $21$.')
vb.append(variation(
    'On lance deux dés équilibrés à six faces. On note $X$ ' + X + '.\n\n'
    'Quelle est la probabilité que $X ' + CMP + ' {{s}}$ ? ' + REPONSE + '\n\n$$?$$',
    VARS_DES,
    '{{eval:n/36}}',
    [erreur('{{eval:nb/36}}', ERR_LARGE, 'Inégalité large et stricte confondues'),
     erreur('{{eval:(36-n)/36}}', ERR_CONTRAIRE, 'Évènement contraire'),
     erreur('{{eval:nt/21}}', ERR_SANS_ORDRE, 'Issues sans ordre (21)')],
    [DEUX_EPREUVES,
     'Le tableau des deux dés a $6\\times6=36$ cases équiprobables ; dans chaque case, on écrit '
     'la valeur de $X$.',
     'On compte les cases où $X ' + CMP + ' {{s}}$ : il y en a ${{n}}$. '
     '$P=\\dfrac{ {{n}} }{36}=' + PRIMAIRE + '{ {{solution}} }$.'],
    'Fais le tableau des $36$ issues et écris dans chaque case la valeur de $X$.',
    ['n >= 1', 'n <= 35', 'nb != n', '2*n != 36', '12*nt != 7*n', '12*nt != 7*nb',
     '12*nt != 7*(36-n)', 'nb != 36-n']))


def compte(o, c, s):
    """Force brute : (n, nb, nt) de la variation v6."""
    op = [lambda a, b: a + b, lambda a, b: a * b, lambda a, b: abs(a - b)][o]
    test = [lambda x, t: x <= t, lambda x, t: x < t, lambda x, t: x >= t, lambda x, t: x > t][c]
    test_b = [lambda x, t: x < t, lambda x, t: x <= t, lambda x, t: x > t, lambda x, t: x >= t][c]
    n = sum(1 for a in A for b in A if test(op(a, b), s))
    nb = sum(1 for a in A for b in A if test_b(op(a, b), s))
    nt = sum(1 for a in A for b in A if a <= b and test(op(a, b), s))
    return n, nb, nt


# Contrôle des formules par force brute, sur tous les tirages
for o in range(3):
    for c in range(4):
        for t in ([5, 6, 7, 8] if o == 0 else [12 + i for i in range(9)] if o == 1 else [3]):
            n, nb, nt = compte(o, c, t)
            u = t - min(c, 1) + c // 3
            ub = t - 1 + min(c, 1) - c // 3
            w = c // 2

            def L(fs, uu):
                return eval(fs[o](uu).replace('floor', 'int'))

            assert n == w * 36 + (1 - 2 * w) * L(LS, u), (o, c, t)
            assert nb == w * 36 + (1 - 2 * w) * L(LS, ub), (o, c, t)
            assert nt == w * 21 + (1 - 2 * w) * L(L3S, u), (o, c, t)

for o, c, ss, sp in [(0, 0, 5, 12), (1, 3, 6, 15), (2, 2, 7, 18)]:
    s = [ss, sp, 3][o]
    n, nb, nt = compte(o, c, s)
    vv = {'o': o, 'c': c, 'ss': ss, 'sp': sp}
    cmp = ['\\leqslant', '<', '\\geqslant', '>'][c]
    large = ['compte', 'ne compte pas', 'compte', 'ne compte pas'][c]
    sb += [spec(f'Dés o={o} c={c} s={s}', 2, vv, 'correct', [fr(Fr(n, 36))]),
           spec(f'Dés o={o} c={c} s={s} : large / stricte', 2, vv, 'incorrect',
                [fr(Fr(nb, 36))],
                f'Attention à l\'inégalité : $X {cmp} {s}$ {large} les issues où $X = {s}$.'),
           spec(f'Dés o={o} c={c} s={s} : contraire', 2, vv, 'incorrect', [fr(Fr(36 - n, 36))],
                f'Tu as compté les issues où $X {cmp} {s}$ est **faux** : c\'est l\'évènement '
                'contraire.'),
           spec(f'Dés o={o} c={c} s={s} : sur 21', 2, vv, 'incorrect', [fr(Fr(nt, 21))],
                ERR_SANS_ORDRE)]

# v7 — dé à 4 et dé à 6 (24 issues), cinq évènements (k = 0 à 4)
EVTS = ['la somme des deux nombres soit un multiple de $3$', 'la somme des deux nombres soit '
        'strictement supérieure à $7$', 'la somme des deux nombres soit inférieure ou égale à $5$',
        'le dé à six faces donne un nombre strictement plus grand que le dé à quatre faces',
        'le produit des deux nombres soit strictement supérieur à $10$']
TESTS = [lambda a, b: (a + b) % 3 == 0, lambda a, b: a + b > 7, lambda a, b: a + b <= 5,
         lambda a, b: b > a, lambda a, b: a * b > 10]
NS = [sum(1 for a in range(1, 5) for b in A if t(a, b)) for t in TESTS]  # [8, 6, 10, 14, 8]


def selon(valeurs):
    """{{if:k==0|…|{{if:k==1|…|…}}}} sur cinq valeurs."""
    s = valeurs[-1]
    for i in range(len(valeurs) - 2, -1, -1):
        s = '{{if:k==' + str(i) + '|' + valeurs[i] + '|' + s + '}}'
    return s


N46 = '(' + '+'.join(f'{n}*(1-min(abs(k-{i}),1))' for i, n in enumerate(NS)) + ')'
ERR_36 = 'Le dé à quatre faces n\'a que $4$ faces : il y a $4\\times6=24$ issues, pas $36$.'
ERR_CONTRAIRE_46 = 'Tu as compté les issues qui ne conviennent **pas** : c\'est l\'évènement contraire.'
ERR_10 = 'Il y a $4\\times6=24$ issues, pas $4 + 6 = 10$.'
vb.append(variation(
    'On lance un dé équilibré à quatre faces (numérotées de $1$ à $4$) et un dé équilibré à six '
    'faces (numérotées de $1$ à $6$).\n\nQuelle est la probabilité que ' + selon(EVTS) + ' ? '
    + REPONSE + '\n\n$$?$$',
    [var('k', '0..4'), var('n', 'eval:' + N46)],
    '{{eval:n/24}}',
    [erreur('{{eval:n/36}}', ERR_36, 'Dénominateur 36 au lieu de 24'),
     erreur('{{eval:(24-n)/24}}', ERR_CONTRAIRE_46, 'Évènement contraire'),
     erreur('{{eval:n/10}}', ERR_10, 'Dénominateur 4 + 6')],
    [DEUX_EPREUVES,
     'Le tableau (dé à quatre faces en lignes, dé à six faces en colonnes) a $4\\times6=24$ cases '
     'équiprobables.',
     'L\'évènement est réalisé dans ${{n}}$ cases : $P=\\dfrac{ {{n}} }{24}=' + PRIMAIRE
     + '{ {{solution}} }$.'],
    'Fais le tableau des issues : $4$ lignes pour le premier dé, $6$ colonnes pour le second.'))
for k, n in enumerate(NS):
    vv = {'k': k}
    sb.append(spec(f'Dés 4 et 6, k={k}', 3, vv, 'correct', [fr(Fr(n, 24))]))
sb += [spec('Dés 4 et 6, k=3 : non réduite', 3, {'k': 3}, 'unoptimal_form', [brut(14, 24)],
            violations=['reducedFractions']),
       spec('Dés 4 et 6, k=3 : 36', 3, {'k': 3}, 'incorrect', [fr(Fr(14, 36))], ERR_36),
       spec('Dés 4 et 6, k=3 : contraire', 3, {'k': 3}, 'incorrect', [fr(Fr(10, 24))],
            ERR_CONTRAIRE_46),
       spec('Dés 4 et 6, k=3 : 10', 3, {'k': 3}, 'incorrect', [fr(Fr(14, 10))], ERR_10)]

ajouter('b28ed4fa', vb, sb)

# =============================================================================================
# V2 — e73b947f « Probabilité d'un évènement » : roulette de 0 à 36 (4-048).
# =============================================================================================

ROULETTE = ('Une roulette de casino a $37$ cases numérotées de $0$ à $36$. On lance la bille : '
            'chaque case a la même probabilité de la recevoir.')
ERR_ZERO = 'Le $0$ est aussi un numéro inférieur à ${{n}}$ : tu l\'as oublié.'
ERR_36C = 'La roulette a $37$ cases, de $0$ à $36$, pas $36$.'
ERR_DEUX = 'Tu as oublié le $0$, et la roulette a $37$ cases, pas $36$.'
ve = [variation(
    ROULETTE + '\n\nQuelle est la probabilité que le numéro obtenu soit inférieur ou égal à '
    '${{n}}$ ? ' + REPONSE + '\n\n$$?$$',
    [var('n', '5..30')],
    '{{eval:(n+1)/37}}',
    [erreur('{{eval:n/37}}', ERR_ZERO, 'Le 0 oublié'),
     erreur('{{eval:(n+1)/36}}', ERR_36C, '36 cases au lieu de 37'),
     erreur('{{eval:n/36}}', ERR_DEUX, 'Le 0 oublié et 36 cases')],
    ['**Équiprobabilité.** Quand toutes les issues ont la même probabilité, $P(A) = '
     '\\dfrac{\\text{nombre d\'issues favorables à } A}{\\text{nombre total d\'issues}}$.',
     'Les numéros de $0$ à ${{n}}$ sont au nombre de ${{n}}+1={{eval:n+1}}$ (le $0$ compte).',
     '$$P=\\dfrac{ {{eval:n+1}} }{37}=' + PRIMAIRE + '{ {{solution}} }$$'],
    'Compte précisément les numéros de $0$ à ${{n}}$ : combien y en a-t-il ?')]
se = []
for n in (12, 23):
    se += [spec(f'Roulette n={n}', 0, {'n': n}, 'correct', [fr(Fr(n + 1, 37))]),
           spec(f'Roulette n={n} : 0 oublié', 0, {'n': n}, 'incorrect', [fr(Fr(n, 37))],
                ERR_ZERO.replace('{{n}}', str(n))),
           spec(f'Roulette n={n} : 36 cases', 0, {'n': n}, 'incorrect', [fr(Fr(n + 1, 36))],
                ERR_36C),
           spec(f'Roulette n={n} : les deux', 0, {'n': n}, 'incorrect', [fr(Fr(n, 36))],
                ERR_DEUX)]
ajouter('e73b947f', ve, se)

# =============================================================================================
# V3 — 247fddd1 « Évènement contraire » : roulette, P(⩾ n + 1) = 1 − (n + 1)/37 (4-079).
# =============================================================================================

ERR_RECOPIE = ('Tu as recopié la probabilité donnée : on demande celle de l\'évènement '
               'contraire.')
ERR_N_COMPTE = ('Tu as compté le numéro ${{n}}$ : « supérieur ou égal à ${{eval:n+1}}$ » commence '
                'à ${{eval:n+1}}$.')
ERR_36D = 'La roulette a $37$ cases, de $0$ à $36$ : le dénominateur reste $37$.'
vc = [variation(
    ROULETTE + ' La probabilité que le numéro obtenu soit inférieur ou égal à ${{n}}$ est '
    '$\\dfrac{ {{eval:n+1}} }{37}$.\n\nQuelle est la probabilité que le numéro obtenu soit '
    'supérieur ou égal à ${{eval:n+1}}$ ? ' + REPONSE + '\n\n$$?$$',
    [var('n', '5..30')],
    '{{eval:(36-n)/37}}',
    [erreur('{{eval:(n+1)/37}}', ERR_RECOPIE, 'P(A) recopiée'),
     erreur('{{eval:(37-n)/37}}', ERR_N_COMPTE, 'Le numéro n compté'),
     erreur('{{eval:(36-n)/36}}', ERR_36D, '36 cases')],
    ['**Évènement contraire.** $P(\\text{non } A) = 1 - P(A)$ : un évènement et son contraire ont '
     'des probabilités de somme $1$.',
     '« Supérieur ou égal à ${{eval:n+1}}$ » est le contraire de « inférieur ou égal à ${{n}}$ ».',
     '$$1-\\dfrac{ {{eval:n+1}} }{37}=' + PRIMAIRE + '{ {{solution}} }$$'],
    'Quel est le contraire de « inférieur ou égal à ${{n}}$ » ?')]
sc = []
for n in (12, 23):
    sc += [spec(f'Contraire roulette n={n}', 0, {'n': n}, 'correct', [fr(Fr(36 - n, 37))]),
           spec(f'Contraire roulette n={n} : recopiée', 0, {'n': n}, 'incorrect',
                [fr(Fr(n + 1, 37))], ERR_RECOPIE),
           spec(f'Contraire roulette n={n} : n compté', 0, {'n': n}, 'incorrect',
                [fr(Fr(37 - n, 37))],
                ERR_N_COMPTE.replace('{{n}}', str(n)).replace('{{eval:n+1}}', str(n + 1))),
           spec(f'Contraire roulette n={n} : 36', 0, {'n': n}, 'incorrect', [fr(Fr(36 - n, 36))],
                ERR_36D)]
ajouter('247fddd1', vc, sc)
