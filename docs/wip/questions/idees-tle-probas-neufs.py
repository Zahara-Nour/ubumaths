"""Écrit les modèles neufs du chantier idees-tle-probas dans scripts/questions/idees-tle-probas-neufs/.

Phase 0 validée par David le 2026-11-24 (« je valide tes recos », journal
docs/wip/idees-tle-probas-progress.md, fiches docs/wip/idees-tle-probas-fiches.md) : F2 (loi binomiale à
la calculatrice, Q1 : oui, TSPE-510) et F3 (du vocabulaire à P(X ⩽ k), avec une table, TSPE-619).

Grades T_SPE. Ni theme, ni domain, ni subdomain, ni id : le rangement (nœud du point + tag) se fera
par migration, après la création en brouillon.

Règles suivies (couvrir-un-niveau.md § 5) : erreurs prévues par case (de vraies erreurs d'élèves) ;
un coup de pouce par variation, qui ne donne jamais la réponse. Les tables de F3 sont calculées ici
(arrondies à 10⁻⁴) et les réponses se calculent sur les valeurs ARRONDIES de la table, comme le ferait
l'élève (même règle que f0c8c1fc, 7a58b19e). ⛔ Jamais de variable `e` (Euler).

Usage : python3 docs/wip/questions/idees-tle-probas-neufs.py scripts/questions/idees-tle-probas-neufs
"""
import json
import os
import sys
from decimal import Decimal
from math import comb

DOSSIER = sys.argv[1]

PRIMAIRE = '\\textcolor{{{color:primary.0}}}'
ARRONDI_3 = {'type': 'decimal', 'digits': 3}


def spec(desc, vi, variables_, status, answers, message=None):
    expected = {'status': status}
    if message is not None:
        expected['expectedErrorMessage'] = message
    return {'description': desc, 'variationIndex': vi, 'variables': variables_,
            'expected': expected, 'answers': answers}


def modele(title, description, level, variations, specs):
    return {'title': title, 'description': description, 'grades': ['T_SPE'], 'level': level,
            'delay': 90, 'status': 'draft', 'shared': {'blankDefaults': {'acceptDecimal': True}},
            'options': {'constraints': {'spaces': 'off'}}, 'variations': variations,
            'testSpecs': specs}


def var(nom, expression):
    return {'name': nom, 'expression': expression}


def erreur(answer, message, label):
    return {'answer': answer, 'message': message, 'label': label}


def case(attendue, erreurs=None, precision=None):
    c = {'expectedAnswer': attendue}
    if precision:
        c['precision'] = precision
    if erreurs:
        c['expectedErrors'] = erreurs
    return c


def variation(statement, variables, blanks, steps, hint, conditions=None):
    return {'statement': statement, 'variables': variables, 'conditions': conditions or [],
            'blanks': blanks, 'correction': {'steps': steps}, 'hint': hint}


RANGEMENT = {
    'f02-loi-binomiale-calculatrice': ('Probabilités > Loi binomiale > expression de la loi', 'TSPE-510'),
    'f03-loi-binomiale-vocabulaire': ('Probabilités > Loi binomiale > expression de la loi', 'TSPE-619'),
}


def ecrire(nom, m):
    os.makedirs(DOSSIER, exist_ok=True)
    chemin = os.path.join(DOSSIER, nom + '.json')
    # Garder l'id écrit en tête par create-questions --publier, s'il existe
    if os.path.exists(chemin):
        with open(chemin, encoding='utf-8') as f:
            ancien = json.load(f)
        if 'id' in ancien:
            m = {'id': ancien['id'], **m}
    if nom in RANGEMENT:
        noeud, point = RANGEMENT[nom]
        tete = {k: m[k] for k in ('id',) if k in m}
        m = {**tete, 'rangement': {'noeud': noeud, 'point': point},
             **{k: v for k, v in m.items() if k != 'id'}}
    with open(chemin, 'w', encoding='utf-8') as f:
        json.dump(m, f, ensure_ascii=False, indent=2)
        f.write('\n')


def r3(x):
    """Arrondi au millième, moitié loin de zéro (comme rounding.ts), en texte « 0,123 »."""
    d = Decimal(repr(x)).quantize(Decimal('0.001'), rounding='ROUND_HALF_UP')
    return str(d).replace('.', ',')


def binom_pk(n, p, k):
    return comb(n, k) * p ** k * (1 - p) ** (n - k)


# =============================================================================================
# F2 — TSPE-510 : P(X = k), P(X ⩾ 1), P(X < n) à la calculatrice, arrondis au millième.
# p = t/20 (0,1 à 0,9 par pas de 0,05). k proche de np, pour une probabilité qui ne s'arrondit pas
# à 0. Les erreurs prévues sont écrites arrondies, comme l'élève les tape.
# =============================================================================================

P = 't/20'
PTEX = '{{eval:t/20;d}}'
QTEX = '{{eval:1-t/20;d}}'
BINOM_K = 'binom(n,k)*(t/20)^k*(1-t/20)^(n-k)'
CONSIGNE_ARRONDI = 'Donne le résultat arrondi au millième.'
RAPPEL_FORMULE = ('Pour $X$ de loi $\\mathcal{B}(n\\,;p)$ : '
                  '$P(X=k)=\\dbinom{n}{k}p^{k}(1-p)^{n-k}$.')

F2_A = variation(
    'La variable aléatoire $X$ suit la loi binomiale $\\mathcal{B}\\left({{n}}\\,;' + PTEX
    + '\\right)$.\n\nCalcule $P(X={{k}})$ à la calculatrice. ' + CONSIGNE_ARRONDI
    + '\n\n$P(X={{k}})\\approx ?$',
    [var('n', '10..30'), var('t', '2..18'), var('d', '-2..2'),
     var('k', '{{eval:round(n*t/20)+d}}')],
    [case('{{eval:' + BINOM_K + '}}', [
        erreur('{{eval:round(1000*(t/20)^k*(1-t/20)^(n-k))/1000}}',
               'Tu as oublié le coefficient binomial $\\dbinom{ {{n}} }{ {{k}} }$ : il compte les '
               'chemins qui mènent à ${{k}}$ succès.', 'Coefficient binomial oublié'),
        erreur('{{eval:round(1000*binom(n,k)*(t/20)^(n-k)*(1-t/20)^k)/1000}}',
               'L\'exposant de $p$ est le nombre de succès, ${{k}}$ ; celui de $1-p$ est le nombre '
               'd\'échecs, ${{eval:n-k}}$.', 'Exposants inversés'),
    ], ARRONDI_3)],
    [
        RAPPEL_FORMULE,
        '$P(X={{k}})=\\dbinom{ {{n}} }{ {{k}} }\\times' + PTEX + '^{ {{k}} }\\times' + QTEX
        + '^{ {{eval:n-k}} }\\approx' + PRIMAIRE + '{ {{eval:round(1000*' + BINOM_K
        + ')/1000;d}} }$ (calculatrice : loi binomiale, ou `binomFdp`).',
    ],
    'Combien de succès, combien d\'échecs ? Écris la formule de $P(X=k)$ avant de calculer.',
    ['k >= 1', 'k <= n-1'],
)

F2_B = variation(
    '{{if:c==0|Un tireur atteint sa cible avec la probabilité $' + PTEX + '$ à chaque tir, les tirs '
    'étant indépendants. Il tire ${{n}}$ fois.}}'
    '{{if:c==1|Chaque graine d\'un sachet germe avec la probabilité $' + PTEX + '$, '
    'indépendamment des autres. On sème ${{n}}$ graines.}}'
    '{{if:c==2|Une ampoule produite par une usine présente un défaut avec la probabilité $'
    + PTEX + '$. On prélève ${{n}}$ ampoules ; la production est assez grande pour assimiler ce '
    'prélèvement à des tirages avec remise.}}\n\n'
    'Calcule la probabilité de l\'événement '
    '{{if:c==0|« le tireur atteint la cible au moins une fois »}}'
    '{{if:c==1|« au moins une graine germe »}}'
    '{{if:c==2|« au moins une des ampoules prélevées présente un défaut »}}. '
    + CONSIGNE_ARRONDI + '\n\n$?$',
    [var('c', '0..2'), var('n', '5..30'), var('t', '1..8')],
    [case('{{eval:1-(1-t/20)^n}}', [
        erreur('{{eval:round(1000*(1-t/20)^n)/1000}}',
               'Ce nombre est la probabilité de n\'avoir **aucun** succès, $P(X=0)$. L\'événement '
               'demandé est son contraire.', 'P(X = 0) au lieu de P(X ⩾ 1)'),
        erreur('{{eval:round(1000*(1-(t/20)^n))/1000}}',
               'Le contraire de « au moins un succès » est « aucun succès » : '
               '$P(X=0)=(1-p)^{n}$, pas $p^{n}$.', 'Mauvais contraire'),
        erreur('{{eval:round(1000*binom(n,1)*(t/20)*(1-t/20)^(n-1))/1000}}',
               'Tu as calculé $P(X=1)$, exactement un succès. « Au moins un » compte aussi '
               '$2$, $3$… succès.', 'Exactement un'),
    ], ARRONDI_3)],
    [
        'On note $X$ le nombre de succès : les ${{n}}$ épreuves sont identiques et indépendantes, '
        'donc $X$ suit la loi $\\mathcal{B}\\left({{n}}\\,;' + PTEX + '\\right)$.',
        'L\'événement contraire de $X\\geqslant 1$ est $X=0$ : '
        '$P(X\\geqslant 1)=1-P(X=0)=1-' + QTEX + '^{ {{n}} }\\approx' + PRIMAIRE
        + '{ {{eval:round(1000*(1-(1-t/20)^n))/1000;d}} }$.',
    ],
    '« Au moins un » : quel est l\'événement contraire, et quelle est sa probabilité ?',
    ['(1-t/20)^n >= 0.002'],
)

F2_C = variation(
    'La variable aléatoire $X$ suit la loi binomiale $\\mathcal{B}\\left({{n}}\\,;' + PTEX
    + '\\right)$.\n\nCalcule $P(X<{{n}})$. ' + CONSIGNE_ARRONDI + '\n\n$P(X<{{n}})\\approx ?$',
    [var('n', '5..15'), var('t', '12..18')],
    [case('{{eval:1-(t/20)^n}}', [
        erreur('{{eval:round(1000*(t/20)^n)/1000}}',
               'Ce nombre est $P(X={{n}})$ : tous les essais réussis. On demande son contraire.',
               'P(X = n) au lieu de P(X < n)'),
        erreur('{{eval:round(1000*(1-binom(n,n-1)*(t/20)^(n-1)*(1-t/20)))/1000}}',
               '$X<{{n}}$ veut dire $X\\leqslant {{eval:n-1}}$ : son contraire est $X={{n}}$, '
               'pas $X={{eval:n-1}}$.', 'Décalage d\'un rang'),
        erreur('{{eval:round(1000*(1-(1-t/20)^n))/1000}}',
               'Tu as calculé $P(X\\geqslant 1)$. Ici, le contraire de $X<{{n}}$ est $X={{n}}$ : '
               '$P(X={{n}})=p^{ {{n}} }$.', 'P(X ⩾ 1)'),
    ], ARRONDI_3)],
    [
        'L\'événement contraire de $X<{{n}}$ est $X={{n}}$ (tous les essais réussis).',
        '$P(X={{n}})=\\dbinom{ {{n}} }{ {{n}} }' + PTEX + '^{ {{n}} }(1-' + PTEX + ')^{0}=' + PTEX
        + '^{ {{n}} }$.',
        '$P(X<{{n}})=1-' + PTEX + '^{ {{n}} }\\approx' + PRIMAIRE
        + '{ {{eval:round(1000*(1-(t/20)^n))/1000;d}} }$.',
    ],
    'Quelles valeurs prend $X$ ? Laquelle est exclue par « $X<{{n}}$ » ?',
    ['(t/20)^n >= 0.002'],
)

F2_D = variation(
    'Une urne contient ${{r}}$ boules rouges et ${{b}}$ boules bleues, indiscernables au toucher. '
    'On effectue ${{n}}$ tirages successifs **avec remise**, et on note $X$ le nombre de boules '
    'rouges obtenues.\n\nCalcule $P(X={{k}})$. ' + CONSIGNE_ARRONDI + '\n\n$P(X={{k}})\\approx ?$',
    [var('r', '2..9'), var('b', '2..9'), var('n', '6..12'), var('d', '-1..1'),
     var('k', '{{eval:round(n*r/(r+b))+d}}')],
    [case('{{eval:binom(n,k)*(r/(r+b))^k*(b/(r+b))^(n-k)}}', [
        erreur('{{eval:round(1000*(r/(r+b))^k*(b/(r+b))^(n-k))/1000}}',
               'Tu as oublié le coefficient binomial $\\dbinom{ {{n}} }{ {{k}} }$ : il compte les '
               'ordres possibles des ${{k}}$ boules rouges.', 'Coefficient binomial oublié'),
        erreur('{{eval:round(1000*binom(n,k)*(r/b)^k*(1-r/b)^(n-k))/1000}}',
               'La probabilité de tirer une boule rouge est $\\dfrac{ {{r}} }{ {{eval:r+b}} }$ : '
               'on divise par le nombre **total** de boules.', 'p = r/b'),
    ], ARRONDI_3)],
    [
        'Les tirages avec remise sont identiques et indépendants ; la probabilité de tirer une boule '
        'rouge est $p=\\dfrac{ {{r}} }{ {{eval:r+b}} }$. Donc $X$ suit la loi '
        '$\\mathcal{B}\\left({{n}}\\,;\\dfrac{ {{r}} }{ {{eval:r+b}} }\\right)$.',
        '$P(X={{k}})=\\dbinom{ {{n}} }{ {{k}} }\\left(\\dfrac{ {{r}} }{ {{eval:r+b}} }\\right)^{ {{k}} }'
        '\\left(\\dfrac{ {{b}} }{ {{eval:r+b}} }\\right)^{ {{eval:n-k}} }\\approx' + PRIMAIRE
        + '{ {{eval:round(1000*binom(n,k)*(r/(r+b))^k*(b/(r+b))^(n-k))/1000;d}} }$.',
    ],
    'Quelle loi suit $X$, avec quels paramètres $n$ et $p$ ?',
    ['r != b', 'k >= 1', 'k <= n-1'],
)


def specs_f2():
    s = []
    # v0 : B(20 ; 0,3), k = 6 → 0,191 6… → 0,192
    v = {'n': '20', 't': '6', 'd': '0', 'k': '6'}
    s += [spec('v0 : B(20 ; 0,3), P(X = 6) ≈ 0,192', 0, v, 'correct', ['0,192']),
          spec('v0 : coefficient oublié', 0, v, 'incorrect', [r3(0.3 ** 6 * 0.7 ** 14)],
               'Tu as oublié le coefficient binomial $\\dbinom{ 20 }{ 6 }$ : il compte les '
               'chemins qui mènent à $6$ succès.'),
          spec('v0 : exposants inversés', 0, v, 'incorrect', [r3(comb(20, 6) * 0.3 ** 14 * 0.7 ** 6)])]
    # v1 : c = 0, n = 10, t = 3 (p = 0,15) → 1 − 0,85¹⁰ ≈ 0,803
    v = {'c': '0', 'n': '10', 't': '3'}
    s += [spec('v1 : 1 − 0,85¹⁰ ≈ 0,803', 1, v, 'correct', [r3(1 - 0.85 ** 10)]),
          spec('v1 : P(X = 0)', 1, v, 'incorrect', [r3(0.85 ** 10)],
               'Ce nombre est la probabilité de n\'avoir **aucun** succès, $P \\left( X = 0 \\right)$. '
               'L\'événement demandé est son contraire.'),
          spec('v1 : 1 − pⁿ', 1, v, 'incorrect', [r3(1 - 0.15 ** 10)]),
          spec('v1 : P(X = 1)', 1, v, 'incorrect', [r3(10 * 0.15 * 0.85 ** 9)])]
    # v2 : B(8 ; 0,7) → 1 − 0,7⁸ ≈ 0,942
    v = {'n': '8', 't': '14'}
    s += [spec('v2 : 1 − 0,7⁸ ≈ 0,942', 2, v, 'correct', [r3(1 - 0.7 ** 8)]),
          spec('v2 : P(X = n)', 2, v, 'incorrect', [r3(0.7 ** 8)],
               'Ce nombre est $P \\left( X = 8 \\right)$ : tous les essais réussis. On demande son '
               'contraire.'),
          spec('v2 : P(X ⩾ 1)', 2, v, 'incorrect', [r3(1 - 0.3 ** 8)])]
    # v3 : 3 rouges, 5 bleues, 8 tirages, k = 3 → C(8,3) (3/8)³ (5/8)⁵
    v = {'r': '3', 'b': '5', 'n': '8', 'd': '0', 'k': '3'}
    exact = comb(8, 3) * (3 / 8) ** 3 * (5 / 8) ** 5
    s += [spec('v3 : B(8 ; 3/8), P(X = 3)', 3, v, 'correct', [r3(exact)]),
          spec('v3 : coefficient oublié', 3, v, 'incorrect', [r3((3 / 8) ** 3 * (5 / 8) ** 5)]),
          spec('v3 : p = r/b', 3, v, 'incorrect', [r3(comb(8, 3) * 0.6 ** 3 * 0.4 ** 5)])]
    return s


F2 = modele(
    'Loi binomiale : P(X = k), P(X ⩾ 1) à la calculatrice',
    'Calcul numérique à la calculatrice, arrondi au millième : P(X = k) pour n jusqu\'à 30, '
    'P(X ⩾ 1) = 1 − (1 − p)ⁿ en situation, P(X < n) = 1 − pⁿ, urne avec remise (pièges : '
    'coefficient binomial oublié, exposants inversés, mauvais événement contraire)',
    2, [F2_A, F2_B, F2_C, F2_D], specs_f2())


# =============================================================================================
# F3 — TSPE-619 : traduire le vocabulaire en P(X ⩽ …), avec une table de P(X ⩽ k) donnée.
# Une situation et une loi fixes par variation ; la table couvre toutes les valeurs utiles.
# =============================================================================================

def cumul(n, p, k):
    return sum(binom_pk(n, p, j) for j in range(k + 1))


def table(n, p, ks):
    """Valeurs de la table, arrondies à 10⁻⁴, en Decimal (calculs exacts sur l'arrondi)."""
    return {k: Decimal(repr(cumul(n, p, k))).quantize(Decimal('0.0001'), rounding='ROUND_HALF_UP')
            for k in ks}


def tex_dec(d):
    """0.0539 → 0.0539 (la table s'écrit comme f0c8c1fc ; l'affichage met la virgule)."""
    return format(d.normalize(), 'f')


def markdown_table(t):
    lignes = ['| $k$ | $P(X\\leqslant k)$ |', '|---|---|']
    lignes += ['| $' + str(k) + '$ | $' + tex_dec(v) + '$ |' for k, v in sorted(t.items())]
    return '\n'.join(lignes)


def chaine_if(var_, valeurs):
    """{{if:k==a|va|{{if:k==b|vb|…}}}} : la dernière valeur sans test."""
    items = sorted(valeurs.items())
    s = tex_dec(items[-1][1])
    for k, v in reversed(items[:-1]):
        s = '{{if:' + var_ + '==' + str(k) + '|' + tex_dec(v) + '|' + s + '}}'
    return s


def presentation(texte, n, ptex):
    return (texte + ' On note $X$ ' + '{{SUCCES}}' + ' ; on admet que $X$ suit la loi '
            'binomiale $\\mathcal{B}(' + str(n) + '\\,;' + ptex + ')$. On donne un extrait de la '
            'table de ses probabilités cumulées (arrondies à $10^{-4}$).')


SITUATIONS = [
    # (texte, succès compté, événement au subjonctif, n, p, p en TeX)
    ('Un footballeur réussit un tir au but avec la probabilité $0{,}7$. Lors d\'un entraînement, il '
     'tire $20$ tirs au but, indépendants les uns des autres.', 'le nombre de tirs réussis',
     'le footballeur réussisse', 'tirs au but', 20, 0.7, '0.7'),
    ('Chaque graine d\'un sachet germe avec la probabilité $0{,}8$, indépendamment des autres. Un '
     'jardinier sème $25$ graines.', 'le nombre de graines qui germent', '', 'graines germent', 25, 0.8, '0.8'),
    ('Un QCM comporte $30$ questions ; pour chacune, $4$ réponses sont proposées, dont une seule est '
     'exacte. Un élève répond au hasard à chaque question.', 'le nombre de bonnes réponses',
     'l\'élève donne', 'bonnes réponses', 30, 0.25, '0.25'),
    ('Dans un magasin, $30\\,\\%$ des clients repartent avec un achat. On choisit au hasard $40$ '
     'clients ; leur nombre est assez grand pour assimiler ce choix à des tirages avec remise.',
     'le nombre de clients qui repartent avec un achat', '', 'clients repartent avec un achat', 40, 0.3, '0.3'),
    ('Une usine fabrique des ampoules, dont $10\\,\\%$ ont un défaut. On prélève au hasard $50$ '
     'ampoules ; la production est assez grande pour assimiler ce prélèvement à des tirages avec '
     'remise.', 'le nombre d\'ampoules qui ont un défaut', '', 'ampoules aient un défaut', 50, 0.1, '0.1'),
]


def enonce_f3(i, ks_table, question):
    texte, succes, sujet, objet, n, p, ptex = SITUATIONS[i]
    t = table(n, p, ks_table)
    tete = presentation(texte, n, ptex).replace('{{SUCCES}}', succes)
    return tete + '\n\n' + markdown_table(t) + '\n\nEn utilisant uniquement cette table, ' + question, t


CONSIGNE_EXACT = 'Donne la valeur obtenue avec la table.'


def f3_moins_de():
    ks = range(9, 18)
    question = ('calcule la probabilité que le footballeur réussisse **moins de** ${{k}}$ tirs au '
                'but. ' + CONSIGNE_EXACT + '\n\n$?$')
    st, t = enonce_f3(0, ks, question)
    juste = {k: t[k - 1] for k in range(12, 17)}
    faux_k = {k: t[k] for k in range(12, 17)}
    faux_1m = {k: 1 - t[k - 1] for k in range(12, 17)}
    v = variation(
        st, [var('k', '12..16'), var('r', chaine_if('k', juste)), var('f', chaine_if('k', faux_k)),
             var('g', chaine_if('k', faux_1m))],
        [case('{{r}}', [
            erreur('{{f}}', '« Moins de ${{k}}$ » exclut ${{k}}$ : c\'est $X\\leqslant {{eval:k-1}}$, '
                   'pas $X\\leqslant {{k}}$.', 'Décalage d\'un rang'),
            erreur('{{g}}', 'Tu as calculé la probabilité d\'en réussir **au moins** ${{k}}$. « Moins '
                   'de ${{k}}$ », c\'est $X\\leqslant {{eval:k-1}}$ : la table le donne directement.',
                   'Contraire pris à tort'),
        ])],
        ['« Moins de ${{k}}$ tirs » : $X<{{k}}$, c\'est-à-dire $X\\leqslant {{eval:k-1}}$ ($X$ est un '
         'entier).',
         '$P(X<{{k}})=P(X\\leqslant {{eval:k-1}})=' + PRIMAIRE + '{ {{r}} }$ (lu dans la table).'],
        '« Moins de $k$ » : la valeur $k$ est-elle comprise ? Écris l\'événement avec $X\\leqslant$.',
    )
    ex = 14
    sp = [spec('moins de 14 → P(X ⩽ 13)', 0, {'k': str(ex)}, 'correct', [tex_dec(t[ex - 1]).replace('.', ',')]),
          spec('moins de 14 : P(X ⩽ 14) lu', 0, {'k': str(ex)}, 'incorrect', [tex_dec(t[ex]).replace('.', ',')],
               '« Moins de $14$ » exclut $14$ : c\'est $X\\leqslant 13$, pas $X\\leqslant 14$.'),
          spec('moins de 14 : 1 − P(X ⩽ 13)', 0, {'k': str(ex)}, 'incorrect',
               [tex_dec(1 - t[ex - 1]).replace('.', ',')])]
    return v, sp


def f3_au_plus():
    ks = range(15, 24)
    question = ('calcule la probabilité que **au plus** ${{k}}$ graines germent. ' + CONSIGNE_EXACT
                + '\n\n$?$')
    st, t = enonce_f3(1, ks, question)
    rng = range(17, 23)
    juste = {k: t[k] for k in rng}
    faux_km1 = {k: t[k - 1] for k in rng}
    faux_1m = {k: 1 - t[k] for k in rng}
    v = variation(
        st, [var('k', '17..22'), var('r', chaine_if('k', juste)), var('f', chaine_if('k', faux_km1)),
             var('g', chaine_if('k', faux_1m))],
        [case('{{r}}', [
            erreur('{{f}}', '« Au plus ${{k}}$ » compte aussi ${{k}}$ : c\'est $X\\leqslant {{k}}$, '
                   'pas $X\\leqslant {{eval:k-1}}$.', 'Décalage d\'un rang'),
            erreur('{{g}}', '« Au plus ${{k}}$ » veut dire « ${{k}}$ ou moins » : $X\\leqslant {{k}}$, '
                   'lu directement dans la table, sans passer par le contraire.', 'Contraire pris à tort'),
        ])],
        ['« Au plus ${{k}}$ graines » : ${{k}}$ ou moins, c\'est-à-dire $X\\leqslant {{k}}$.',
         '$P(X\\leqslant {{k}})=' + PRIMAIRE + '{ {{r}} }$ (lu dans la table).'],
        '« Au plus $k$ » : la valeur $k$ est-elle comprise ? Écris l\'événement avec $X\\leqslant$.',
    )
    ex = 20
    sp = [spec('au plus 20 → P(X ⩽ 20)', 1, {'k': str(ex)}, 'correct', [tex_dec(t[ex]).replace('.', ',')]),
          spec('au plus 20 : P(X ⩽ 19)', 1, {'k': str(ex)}, 'incorrect', [tex_dec(t[ex - 1]).replace('.', ',')],
               '« Au plus $20$ » compte aussi $20$ : c\'est $X\\leqslant 20$, pas $X\\leqslant 19$.'),
          spec('au plus 20 : 1 − P(X ⩽ 20)', 1, {'k': str(ex)}, 'incorrect',
               [tex_dec(1 - t[ex]).replace('.', ',')])]
    return v, sp


def f3_au_moins():
    ks = range(4, 13)
    question = ('calcule la probabilité que l\'élève donne **au moins** ${{k}}$ bonnes réponses. '
                + CONSIGNE_EXACT + '\n\n$?$')
    st, t = enonce_f3(2, ks, question)
    rng = range(6, 11)
    juste = {k: 1 - t[k - 1] for k in rng}
    faux_k = {k: 1 - t[k] for k in rng}
    faux_lu = {k: t[k - 1] for k in rng}
    v = variation(
        st, [var('k', '6..10'), var('c', chaine_if('k', {k: t[k - 1] for k in rng})),
             var('r', chaine_if('k', juste)), var('f', chaine_if('k', faux_k)),
             var('g', chaine_if('k', faux_lu))],
        [case('{{r}}', [
            erreur('{{f}}', '« Au moins ${{k}}$ » compte ${{k}}$ : son contraire est '
                   '$X\\leqslant {{eval:k-1}}$, pas $X\\leqslant {{k}}$.', 'Décalage d\'un rang'),
            erreur('{{g}}', 'Ce nombre est $P(X\\leqslant {{eval:k-1}})$, la probabilité du '
                   '**contraire** : $P(X\\geqslant {{k}})=1-P(X\\leqslant {{eval:k-1}})$.',
                   '« 1 − » oublié'),
        ])],
        ['« Au moins ${{k}}$ » : $X\\geqslant {{k}}$. La table donne $P(X\\leqslant \\ldots)$ : on passe '
         'par le contraire, $X\\leqslant {{eval:k-1}}$.',
         '$P(X\\geqslant {{k}})=1-P(X\\leqslant {{eval:k-1}})=1-{{c}}=' + PRIMAIRE + '{ {{r}} }$.'],
        'La table donne $P(X\\leqslant \\ldots)$. Quel est l\'événement contraire de « au moins $k$ » ?',
    )
    ex = 8
    sp = [spec('au moins 8 → 1 − P(X ⩽ 7)', 2, {'k': str(ex)}, 'correct',
               [tex_dec(1 - t[ex - 1]).replace('.', ',')]),
          spec('au moins 8 : 1 − P(X ⩽ 8)', 2, {'k': str(ex)}, 'incorrect',
               [tex_dec(1 - t[ex]).replace('.', ',')],
               '« Au moins $8$ » compte $8$ : son contraire est $X\\leqslant 7$, pas $X\\leqslant 8$.'),
          spec('au moins 8 : P(X ⩽ 7) lu', 2, {'k': str(ex)}, 'incorrect',
               [tex_dec(t[ex - 1]).replace('.', ',')])]
    return v, sp


def f3_plus_de():
    ks = range(8, 17)
    question = ('calcule la probabilité que **plus de** ${{k}}$ clients repartent avec un achat. '
                + CONSIGNE_EXACT + '\n\n$?$')
    st, t = enonce_f3(3, ks, question)
    rng = range(10, 16)
    juste = {k: 1 - t[k] for k in rng}
    faux_km1 = {k: 1 - t[k - 1] for k in rng}
    faux_lu = {k: t[k] for k in rng}
    v = variation(
        st, [var('k', '10..15'), var('c', chaine_if('k', {k: t[k] for k in rng})),
             var('r', chaine_if('k', juste)), var('f', chaine_if('k', faux_km1)),
             var('g', chaine_if('k', faux_lu))],
        [case('{{r}}', [
            erreur('{{f}}', '« Plus de ${{k}}$ » exclut ${{k}}$ : c\'est $X>{{k}}$, dont le contraire '
                   'est $X\\leqslant {{k}}$.', 'Décalage d\'un rang'),
            erreur('{{g}}', 'Ce nombre est $P(X\\leqslant {{k}})$, la probabilité du **contraire** : '
                   '$P(X>{{k}})=1-P(X\\leqslant {{k}})$.', '« 1 − » oublié'),
        ])],
        ['« Plus de ${{k}}$ » : $X>{{k}}$, contraire de $X\\leqslant {{k}}$.',
         '$P(X>{{k}})=1-P(X\\leqslant {{k}})=1-{{c}}=' + PRIMAIRE + '{ {{r}} }$.'],
        '« Plus de $k$ » : la valeur $k$ est-elle comprise ? Quel est l\'événement contraire ?',
    )
    ex = 12
    sp = [spec('plus de 12 → 1 − P(X ⩽ 12)', 3, {'k': str(ex)}, 'correct',
               [tex_dec(1 - t[ex]).replace('.', ',')]),
          spec('plus de 12 : 1 − P(X ⩽ 11)', 3, {'k': str(ex)}, 'incorrect',
               [tex_dec(1 - t[ex - 1]).replace('.', ',')],
               '« Plus de $12$ » exclut $12$ : c\'est $X > 12$, dont le contraire est $X\\leqslant 12$.'),
          spec('plus de 12 : P(X ⩽ 12) lu', 3, {'k': str(ex)}, 'incorrect',
               [tex_dec(t[ex]).replace('.', ',')])]
    return v, sp


def f3_entre():
    ks = range(1, 10)
    question = ('calcule la probabilité que le nombre d\'ampoules avec un défaut soit **compris entre** '
                '${{a}}$ et ${{b}}$ (inclus). ' + CONSIGNE_EXACT + '\n\n$?$')
    st, t = enonce_f3(4, ks, question)
    cles = [(a, b) for a in range(3, 6) for b in range(7, 10)]
    # une seule variable de tirage : c = 3·(a − 3) + (b − 7) (jamais i : unité imaginaire)
    def chaine(fn):
        return chaine_if('c', {i: fn(a, b) for i, (a, b) in enumerate(cles)})
    v = variation(
        st, [var('c', '0..8'), var('a', chaine_if('c', {i: Decimal(a) for i, (a, b) in enumerate(cles)})),
             var('b', chaine_if('c', {i: Decimal(b) for i, (a, b) in enumerate(cles)})),
             var('u', chaine(lambda a, b: t[b])), var('w', chaine(lambda a, b: t[a - 1])),
             var('r', chaine(lambda a, b: t[b] - t[a - 1])),
             var('f', chaine(lambda a, b: t[b] - t[a])),
             var('g', chaine(lambda a, b: t[b - 1] - t[a - 1]))],
        [case('{{r}}', [
            erreur('{{f}}', '${{a}}$ est inclus : on retire $P(X\\leqslant {{eval:a-1}})$, pas '
                   '$P(X\\leqslant {{a}})$, sinon $X={{a}}$ disparaît.', 'Borne basse exclue'),
            erreur('{{g}}', '${{b}}$ est inclus : on part de $P(X\\leqslant {{b}})$, pas de '
                   '$P(X\\leqslant {{eval:b-1}})$.', 'Borne haute exclue'),
        ])],
        ['$\\{ {{a}}\\leqslant X\\leqslant {{b}}\\}$ : on prend $X\\leqslant {{b}}$ et on retire '
         '$X\\leqslant {{eval:a-1}}$, pour garder $X={{a}}$.',
         '$P({{a}}\\leqslant X\\leqslant {{b}})=P(X\\leqslant {{b}})-P(X\\leqslant {{eval:a-1}})='
         '{{u}}-{{w}}=' + PRIMAIRE + '{ {{r}} }$.'],
        'Écris l\'événement comme « $X\\leqslant \\ldots$ » privé de « $X\\leqslant \\ldots$ » : '
        'quelles valeurs garder ?',
    )
    i = 3 * (4 - 3) + (8 - 7)  # a = 4, b = 8
    sp = [spec('entre 4 et 8 → P(X ⩽ 8) − P(X ⩽ 3)', 4, {'c': str(i)}, 'correct',
               [tex_dec(t[8] - t[3]).replace('.', ',')]),
          spec('entre 4 et 8 : P(X ⩽ 8) − P(X ⩽ 4)', 4, {'c': str(i)}, 'incorrect',
               [tex_dec(t[8] - t[4]).replace('.', ',')],
               '$4$ est inclus : on retire $P(X\\leqslant 3)$, pas $P(X\\leqslant 4)$, sinon $X = 4$ '
               'disparaît.'),
          spec('entre 4 et 8 : P(X ⩽ 7) − P(X ⩽ 3)', 4, {'c': str(i)}, 'incorrect',
               [tex_dec(t[7] - t[3]).replace('.', ',')])]
    return v, sp


def f3():
    vs, ss = [], []
    for fn in (f3_moins_de, f3_au_plus, f3_au_moins, f3_plus_de, f3_entre):
        v, s = fn()
        vs.append(v)
        ss += s
    return modele(
        'Loi binomiale : du vocabulaire à P(X ⩽ k)',
        'Traduire « moins de », « au plus », « au moins », « plus de », « entre … et … (inclus) » en '
        'P(X ⩽ …) et calculer avec une table de probabilités cumulées donnée (pièges : décalage d\'un '
        'rang, « 1 − » oublié ou pris à tort, borne exclue)',
        6, vs, ss)


ecrire('f02-loi-binomiale-calculatrice', F2)
ecrire('f03-loi-binomiale-vocabulaire', f3())
print('écrit :', DOSSIER)
