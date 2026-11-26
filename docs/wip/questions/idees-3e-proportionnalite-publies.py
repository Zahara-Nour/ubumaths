"""Ajoute les variations validées aux 3 modèles publiés exportés de prod dans
scripts/questions/idees-3e-proportionnalite-publies/ (chantier idees-3e-proportionnalite).

Phase 0 : fiches de docs/wip/idees-3e-proportionnalite-progress.md, validées par David le 2026-11-26 :
V1 (« de combien de pour cent ? » à partir des deux valeurs), V2 (appliquer une évolution hors des
prix), V3 (taux à un chiffre et au-delà de 100 %, deux variations) sur ccb51039 « Augmentation et
coefficient multiplicateur » (3-036) et 76f5f143 « Diminution et coefficient multiplicateur »
(3-063) ; V4 (évolution répétée, valeur au bout de n ans, deux variations) sur 8b59ca4b
« Coefficient multiplicateur d'une évolution répétée » (2-378). Les variations s'ajoutent À LA FIN
(les réponses des élèves gardent l'indice de leur variation) ; la migration de contenu est
générée par scripts/questions/migration-contenu.ts.

Le script repart du contenu de prod (variations et specs d'origine, comptées dans ORIGINE) :
le relancer réécrit les ajouts sans les doubler. Options et partagé des modèles inchangés.

Usage : python3 docs/wip/questions/idees-3e-proportionnalite-publies.py scripts/questions/idees-3e-proportionnalite-publies
"""
import json
import os
import sys
from decimal import ROUND_HALF_UP, Decimal

DOSSIER = sys.argv[1]

PRIMAIRE = '\\textcolor{{{color:primary.0}}}'

# id court → (variations, specs) d'origine en prod (export du 2026-11-26)
ORIGINE = {'ccb51039': (3, 12), '76f5f143': (3, 11), '8b59ca4b': (2, 15)}


def spec(desc, vi, variables_, status, answers, message=None, violations=None):
    expected = {'status': status}
    if message is not None:
        expected['expectedErrorMessage'] = message
    if violations:
        expected['constraintViolations'] = violations
    return {'description': desc, 'variationIndex': vi,
            'variables': {k: str(v) for k, v in variables_.items()},
            'expected': expected, 'answers': answers}


def var(nom, expression):
    return {'name': nom, 'expression': expression}


def erreur(answer, message, label):
    return {'answer': answer, 'message': message, 'label': label}


def case(attendue, erreurs, **reglages):
    c = dict(reglages)
    c['expectedAnswer'] = attendue
    c['expectedErrors'] = erreurs
    return c


def variation(statement, variables, blanks, steps, hint, conditions=None):
    return {'statement': statement, 'variables': variables, 'conditions': conditions or [],
            'blanks': blanks, 'correction': {'steps': steps}, 'hint': hint}


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


def nb(x, decimales=None):
    """Écriture d'une réponse d'élève : virgule décimale, sans zéro inutile."""
    d = Decimal(str(x))
    if decimales is not None:
        d = d.quantize(Decimal(1).scaleb(-decimales), rounding=ROUND_HALF_UP)
        s = f'{d:f}'
    else:
        s = f'{d.normalize():f}'
    entier, _, dec = s.partition('.')
    signe = '-' if entier.startswith('-') else ''
    entier = entier.lstrip('-')
    if len(entier) > 4:  # groupement par trois à partir de 10 000 (règle `spaces`)
        groupes = []
        while entier:
            groupes.insert(0, entier[-3:])
            entier = entier[:-3]
        entier = '\\,'.join(groupes)
    return signe + entier + (',' + dec if dec else '')


# Indicatrices du contexte c (0, 1, 2), pour les variables calculées
I0, I1, I2 = '(1-min(c,1))', '(min(c,1)-max(c-1,0))', 'max(c-1,0)'


def selon(v0, v1, v2):
    return '{{if:c==0|' + v0 + '|{{if:c==1|' + v1 + '|' + v2 + '}}}}'


# =============================================================================================
# V1 — « De combien de pour cent ? » à partir des deux valeurs (ccb51039 v3, 76f5f143 v3).
# Contexte c : 0 prix (10 à 300 €, t multiple de 5 jusqu'à 50), 1 collège (400 à 1 200 élèves,
# multiple de 100, t de 2 à 10), 2 ville (10 000 à 90 000 habitants, t de 5 à 30).
# =============================================================================================

VARS_V1 = [
    var('c', '0..2'), var('j', '2..30'), var('m', '4..12'), var('h', '10..90'),
    var('tp', '1..10'), var('tc', '2..10'), var('tv', '5..30'),
    var('a', 'eval:' + I0 + '*10*j+' + I1 + '*100*m+' + I2 + '*1000*h'),
    var('t', 'eval:' + I0 + '*5*tp+' + I1 + '*tc+' + I2 + '*tv'),
]
GRANDEUR = selon('le prix de l\'article', 'l\'effectif du collège', 'la population de la ville')
QUOI = selon('Le prix d\'un article', 'L\'effectif d\'un collège', 'La population d\'une ville')
AFF_A = selon('{{eval:(a)[€]}}', '{{eval:a}}', '{{eval:a}}')
AFF_B = selon('{{eval:(b)[€]}}', '{{eval:b}}', '{{eval:b}}')
APRES = selon('', ' élèves', ' habitants')


def v1(sens, signe):
    """sens : 'augmente' ou 'diminue' ; signe : '+' ou '-'."""
    b = 'a*(1' + signe + 't/100)'
    pronom = '{{if:c==2|elle|il}}'
    participe = 'augmenté' if sens == 'augmente' else 'diminué'
    ecart = 'b-a' if signe == '+' else 'a-b'
    statement = (QUOI + ' passe de $' + AFF_A + '$' + APRES + ' à $' + AFF_B + '$'
                 + APRES + '.\n\nDe quel pourcentage ' + GRANDEUR
                 + ' a-t-' + pronom + ' ' + participe + ' ?\n\n$$?~\\%$$')
    ERR_ECART = ('C\'est ' + ('l\'augmentation' if signe == '+' else 'la baisse')
                 + selon(' en euros', ' en nombre d\'élèves', ' en nombre d\'habitants')
                 + ', pas en pourcentage : il faut la comparer à la valeur de départ.')
    ERR_COEF = ('${{eval:b/a;d}}$ est le coefficient multiplicateur : multiplier par ${{eval:b/a;d}}$, '
                'c\'est ' + ('augmenter' if signe == '+' else 'diminuer') + ' de combien de pour cent ?')
    ERR_CENT = ('${{eval:100*b/a}}~\\%$ est la valeur finale exprimée en pourcentage de la valeur de '
                'départ : ' + ('enlève' if signe == '+' else 'compare à') + ' $100~\\%$.')
    steps = [
        '**Coefficient multiplicateur.** ' + ('Augmenter' if signe == '+' else 'Diminuer')
        + ' de $t~\\%$, c\'est multiplier par $1 ' + signe + ' \\dfrac{t}{100}$.',
        'On passe de ${{eval:a}}$ à ${{eval:b}}$ en multipliant par '
        '$\\dfrac{ {{eval:b}} }{ {{eval:a}} } = {{eval:b/a;d}}$.',
        '$${{eval:b/a;d}} = 1 ' + signe + ' {{eval:t/100;d}} = 1 ' + signe + ' \\frac{' + PRIMAIRE
        + '{ {{solution}} }}{100}$$',
        'C\'est ' + ('une augmentation' if signe == '+' else 'une diminution') + ' de $' + PRIMAIRE
        + '{ {{solution}}~\\% }$.',
    ]
    return variation(
        statement,
        VARS_V1 + [var('b', 'eval:' + b + ';d')],
        [case('{{t}}', [
            erreur('{{eval:' + ecart + '}}', ERR_ECART, ('Augmentation' if signe == '+' else 'Baisse')
                   + ' sans pourcentage'),
            erreur('{{eval:b/a;d}}', ERR_COEF, 'Le coefficient multiplicateur'),
            erreur('{{eval:100*b/a}}', ERR_CENT, 'Valeur finale en % de la valeur de départ'),
        ])],
        steps,
        'Par quel nombre faut-il multiplier ${{eval:a}}$ pour obtenir ${{eval:b}}$ ?',
        ['a != 100'] + ([] if signe == '+' else ['t != 50']))  # − 50 % : 100 b / a = t


def specs_v1(signe):
    out = []
    # (c, j, m, h, tp, tc, tv) → a, t
    for c, j, m, h, tp, tc, tv in [(0, 12, 5, 20, 4, 3, 10), (1, 5, 8, 20, 4, 6, 10),
                                   (2, 5, 8, 45, 4, 6, 12)]:
        a = [10 * j, 100 * m, 1000 * h][c]
        t = [5 * tp, tc, tv][c]
        b = Decimal(a) * (1 + Decimal(t) / 100 if signe == '+' else 1 - Decimal(t) / 100)
        vv = {'c': c, 'j': j, 'm': m, 'h': h, 'tp': tp, 'tc': tc, 'tv': tv, 'a': a, 't': t,
              'b': f'{b.normalize():f}'}
        ecart = abs(b - a)
        out += [spec(f'c={c} {a} → {nb(b)} : {t} %', 0, vv, 'correct', [str(t)]),
                spec(f'c={c} : écart {nb(ecart)}', 0, vv, 'incorrect', [nb(ecart)]),
                spec(f'c={c} : coefficient {nb(b / a)}', 0, vv, 'incorrect', [nb(b / a)]),
                spec(f'c={c} : {nb(100 * b / a)} %', 0, vv, 'incorrect', [nb(100 * b / a)])]
    return out


# =============================================================================================
# V2 — Appliquer une évolution hors des prix, taux non ronds (ccb51039 v4, 76f5f143 v4).
# Contexte c : 0 collège (300 à 1 200 élèves, multiple de 100, t de 1 à 11), 1 ville (10 000 à
# 90 000 habitants, multiple de 1 000, t de 5 à 30), 2 facture (700 à 1 400 €, t de 1 à 12).
# =============================================================================================

VARS_V2 = [
    var('c', '0..2'), var('m', '3..12'), var('h', '10..90'), var('f', '700..1400'),
    var('tc', '1..11'), var('tv', '5..30'), var('tf', '1..12'),
    var('a', 'eval:' + I0 + '*100*m+' + I1 + '*1000*h+' + I2 + '*f'),
    var('t', 'eval:' + I0 + '*tc+' + I1 + '*tv+' + I2 + '*tf'),
]


def v2(signe):
    verbe = 'augmente' if signe == '+' else 'diminue'
    statement = (selon('Un collège compte ${{eval:a}}$ élèves. Son effectif ' + verbe + ' de ${{t}}~\\%$.'
                       '\n\nCombien d\'élèves compte-t-il ensuite ?',
                       'Une ville compte ${{eval:a}}$ habitants. Sa population ' + verbe
                       + ' de ${{t}}~\\%$.\n\nCombien d\'habitants compte-t-elle ensuite ?',
                       'Une facture d\'électricité annuelle s\'élève à ${{eval:a}}~\\unit{€}$. Elle '
                       + verbe + ' de ${{t}}~\\%$.\n\nQuel est son nouveau montant ?')
                 + '\n\n$$?' + selon('~\\text{élèves}', '~\\text{habitants}', '~\\text{€}') + '$$')
    coef = '1' + signe + 't/100'
    ERR_T = ('Tu as ' + ('ajouté' if signe == '+' else 'enlevé') + ' ${{t}}$ : il faut '
             + ('ajouter' if signe == '+' else 'enlever') + ' ${{t}}~\\%$ de ${{eval:a}}$, '
             'ou multiplier par le coefficient multiplicateur.')
    ERR_PART = ('C\'est ' + ('l\'augmentation' if signe == '+' else 'la baisse') + ' seule : il faut '
                'encore ' + ('l\'ajouter à' if signe == '+' else 'l\'enlever de') + ' ${{eval:a}}$.')
    # t < 10 : le taux lu comme un dixième (7 % → 0,7) ; t ⩾ 10 : l'évolution dans le mauvais sens
    if signe == '+':
        faux_coef = '{{if:t<10|{{eval:a*(1+t/10);d}}|{{eval:a*(1-t/100);d}}}}'
        msg_coef = ('{{if:t<10|${{t}}~\\%$, c\'est $\\dfrac{ {{t}} }{100}={{eval:t/100;d}}$ : le '
                    'coefficient est ${{eval:1+t/100;d}}$, pas ${{eval:1+t/10;d}}$.|Tu as calculé une '
                    'diminution : augmenter, c\'est multiplier par $1+\\dfrac{t}{100}$.}}')
        label_coef = 'Coefficient 1 + t/10, ou diminution'
    else:
        faux_coef = '{{if:t<10|{{eval:a*(1-t/10);d}}|{{eval:a*(1+t/100);d}}}}'
        msg_coef = ('{{if:t<10|${{t}}~\\%$, c\'est $\\dfrac{ {{t}} }{100}={{eval:t/100;d}}$ : le '
                    'coefficient est ${{eval:1-t/100;d}}$, pas ${{eval:1-t/10;d}}$.|Tu as calculé une '
                    'augmentation : diminuer, c\'est multiplier par $1-\\dfrac{t}{100}$.}}')
        label_coef = 'Coefficient 1 − t/10, ou augmentation'
    steps = [
        '**Coefficient multiplicateur.** ' + ('Augmenter' if signe == '+' else 'Diminuer')
        + ' de $t~\\%$, c\'est multiplier par $1 ' + signe + ' \\dfrac{t}{100}$.',
        'Le coefficient multiplicateur est $1 ' + signe + ' \\frac{ {{t}} }{100} = {{eval:' + coef
        + ';d}}$.',
        '$${{eval:a}} \\times {{eval:' + coef + ';d}} = ' + PRIMAIRE + '{ {{solution}} }$$',
    ]
    return variation(
        statement, VARS_V2,
        [case('{{eval:a*(' + coef + ');d}}', [
            erreur('{{eval:a' + signe + 't}}', ERR_T, ('a + t' if signe == '+' else 'a − t')),
            erreur('{{eval:a*t/100;d}}', ERR_PART,
                   ('L\'augmentation' if signe == '+' else 'La baisse') + ' seule'),
            erreur(faux_coef, msg_coef, label_coef),
        ])],
        steps,
        'Calcule d\'abord le coefficient multiplicateur : $1 ' + signe + ' \\dfrac{ {{t}} }{100}$.')


def specs_v2(signe):
    out = []
    for c, m, h, f, tc, tv, tf in [(0, 6, 20, 900, 7, 10, 3), (1, 6, 32, 900, 7, 15, 3),
                                   (2, 6, 20, 1150, 7, 10, 3), (2, 6, 20, 980, 7, 10, 12)]:
        a = [100 * m, 1000 * h, f][c]
        t = [tc, tv, tf][c]
        k = 1 + Decimal(t) / 100 if signe == '+' else 1 - Decimal(t) / 100
        vv = {'c': c, 'm': m, 'h': h, 'f': f, 'tc': tc, 'tv': tv, 'tf': tf, 'a': a, 't': t}
        juste = a * k
        if t < 10:
            faux = a * (1 + Decimal(t) / 10 if signe == '+' else 1 - Decimal(t) / 10)
        else:
            faux = a * (1 - Decimal(t) / 100 if signe == '+' else 1 + Decimal(t) / 100)
        out += [spec(f'c={c} a={a} t={t} : {nb(juste)}', 0, vv, 'correct', [nb(juste)]),
                spec(f'c={c} a={a} t={t} : a {signe} t', 0, vv, 'incorrect',
                     [str(a + t if signe == '+' else a - t)]),
                spec(f'c={c} a={a} t={t} : variation seule', 0, vv, 'incorrect',
                     [nb(a * Decimal(t) / 100)]),
                spec(f'c={c} a={a} t={t} : mauvais coefficient', 0, vv, 'incorrect', [nb(faux)])]
    return out


# =============================================================================================
# V3 — Taux à un chiffre et taux au-delà de 100 % (ccb51039 v5 et v6, 76f5f143 v5 et v6).
# =============================================================================================

T_AUG = '1|2|3|4|5|6|7|8|9|110|120|125|130|150|160|175|180|190'
T_DIM = '1|2|3|4|6|7|8|9|12|17|23|36|38|41|64|72'
K_AUG = '101|102|103|104|105|106|107|108|109|150|170|180|200|220|250|290'
K_DIM = '99|98|97|96|94|93|91|88|83|77|64|58|46|31'

v_taux_aug = variation(
    'Augmenter une quantité de ${{t}}~\\%$, c\'est la multiplier par :\n\n$$?$$',
    [var('t', T_AUG)],
    [case('{{eval:1+t/100;d}}', [
        erreur('{{if:t<10|{{eval:1+t/10;d}}|{{eval:1+t/1000;d}}}}',
               '${{t}}~\\%$, c\'est $\\dfrac{ {{t}} }{100}={{eval:t/100;d}}$ : on ajoute '
               '${{eval:t/100;d}}$ à $1$, on n\'écrit pas ${{t}}$ derrière la virgule.',
               'Coefficient « 1, t »'),
        erreur('{{eval:t/100;d}}',
               'Multiplier par ${{eval:t/100;d}}$ donne ${{t}}~\\%$ de la quantité, pas la quantité '
               'augmentée : il faut encore ajouter $1$.', 'Le 1 oublié'),
        erreur('{{eval:100+t}}',
               'Le coefficient s\'écrit en nombre décimal : ${{eval:100+t}}~\\%$, c\'est '
               '$\\dfrac{ {{eval:100+t}} }{100}$.', 'Pourcentage 100 + t non converti'),
    ])],
    ['**Coefficient multiplicateur.** Augmenter de $t~\\%$, c\'est multiplier par $1 + \\dfrac{t}{100}$.',
     '$$1 + \\frac{ {{t}} }{100} = 1 + {{eval:t/100;d}} = ' + PRIMAIRE + '{ {{solution}} }$$'],
    'Écris d\'abord $\\dfrac{ {{t}} }{100}$ sous forme décimale.')

v_coef_aug = variation(
    'Multiplier une quantité par ${{x}}$, c\'est l\'augmenter de :\n\n$$?~\\%$$',
    [var('K', K_AUG), var('x', 'eval:K/100;d')],
    [case('{{eval:K-100}}', [
        erreur('{{K}}', 'Multiplier par ${{x}}$, c\'est prendre ${{K}}~\\%$ de la quantité : '
               'l\'augmentation est ce qui dépasse $100~\\%$.', 'Le coefficient en pourcentage'),
        erreur('{{eval:(K-100)/100;d}}', '${{x}} = 1 + {{eval:(K-100)/100;d}}$ : il reste '
               'à écrire ${{eval:(K-100)/100;d}}$ en pourcentage.', 'Pas multiplié par 100'),
        erreur('{{if:K<110|{{eval:10*(K-100)}}|{{eval:K/10}}}}',
               '{{if:K<110|${{x}} = 1 + {{eval:(K-100)/100;d}}$ : ${{eval:(K-100)/100;d}}$, c\'est '
               '${{eval:K-100}}$ centièmes.|${{x}} = 1 + {{eval:(K-100)/100;d}}$ : c\'est '
               '$\\dfrac{ {{eval:K-100}} }{100}$ qu\'on ajoute à $1$.}}',
               'Virgule mal placée'),
    ])],
    ['**Coefficient multiplicateur.** Augmenter de $t~\\%$, c\'est multiplier par $1 + \\dfrac{t}{100}$.',
     '$${{x}} = 1 + {{eval:(K-100)/100;d}} = 1 + \\frac{' + PRIMAIRE + '{ {{solution}} }}{100}$$',
     'C\'est une augmentation de $' + PRIMAIRE + '{ {{solution}}~\\% }$.'],
    'Écris ${{x}}$ sous la forme $1 + \\dots$')

v_taux_dim = variation(
    'Diminuer une quantité de ${{t}}~\\%$, c\'est la multiplier par :\n\n$$?$$',
    [var('t', T_DIM)],
    [case('{{eval:1-t/100;d}}', [
        erreur('{{eval:t/100;d}}',
               'Multiplier par ${{eval:t/100;d}}$ donne la baisse, pas ce qui reste : on enlève '
               '${{eval:t/100;d}}$ à $1$.', 'La baisse seule'),
        erreur('{{if:t<10|{{eval:1-t/10;d}}|{{eval:100-t}}}}',
               '{{if:t<10|${{t}}~\\%$, c\'est $\\dfrac{ {{t}} }{100}={{eval:t/100;d}}$, pas '
               '${{eval:t/10;d}}$.|Le coefficient s\'écrit en nombre décimal : ${{eval:100-t}}~\\%$, '
               'c\'est $\\dfrac{ {{eval:100-t}} }{100}$.}}',
               'Taux lu en dixièmes, ou pourcentage non converti'),
        erreur('{{eval:1+t/100;d}}', 'Multiplier par ${{eval:1+t/100;d}}$, c\'est augmenter : pour '
               'diminuer, on enlève $\\dfrac{ {{t}} }{100}$ à $1$.', 'Coefficient d\'augmentation'),
    ])],
    ['**Coefficient multiplicateur.** Diminuer de $t~\\%$, c\'est multiplier par $1 - \\dfrac{t}{100}$.',
     '$$1 - \\frac{ {{t}} }{100} = 1 - {{eval:t/100;d}} = ' + PRIMAIRE + '{ {{solution}} }$$'],
    'Écris d\'abord $\\dfrac{ {{t}} }{100}$ sous forme décimale.')

v_coef_dim = variation(
    'Multiplier une quantité par ${{x}}$, c\'est la diminuer de :\n\n$$?~\\%$$',
    [var('K', K_DIM), var('x', 'eval:K/100;d')],
    [case('{{eval:100-K}}', [
        erreur('{{K}}', 'Multiplier par ${{x}}$, c\'est garder ${{K}}~\\%$ de la quantité : la baisse '
               'est ce qui manque pour aller jusqu\'à $100~\\%$.', 'Ce qui reste'),
        erreur('{{eval:(100-K)/100;d}}', '${{x}} = 1 - {{eval:(100-K)/100;d}}$ : il reste '
               'à écrire ${{eval:(100-K)/100;d}}$ en pourcentage.', 'Pas multiplié par 100'),
        erreur('{{eval:K-100}}', '« Diminuer de » dit déjà que c\'est une baisse : le pourcentage '
               's\'écrit sans signe moins.', 'Pourcentage négatif'),
    ])],
    ['**Coefficient multiplicateur.** Diminuer de $t~\\%$, c\'est multiplier par $1 - \\dfrac{t}{100}$.',
     '$${{x}} = 1 - {{eval:(100-K)/100;d}} = 1 - \\frac{' + PRIMAIRE + '{ {{solution}} }}{100}$$',
     'C\'est une diminution de $' + PRIMAIRE + '{ {{solution}}~\\% }$.'],
    'Écris ${{x}}$ sous la forme $1 - \\dots$')


def specs_taux_aug():
    out = []
    for t in (3, 7, 150, 190):
        k = 1 + Decimal(t) / 100
        concat = 1 + Decimal(t) / (10 if t < 10 else 1000)
        out += [spec(f'+ {t} % → × {nb(k)}', 0, {'t': t}, 'correct', [nb(k)]),
                spec(f'+ {t} % : {nb(concat)}', 0, {'t': t}, 'incorrect', [nb(concat)]),
                spec(f'+ {t} % : {nb(Decimal(t) / 100)}', 0, {'t': t}, 'incorrect',
                     [nb(Decimal(t) / 100)]),
                spec(f'+ {t} % : {100 + t}', 0, {'t': t}, 'incorrect', [str(100 + t)])]
    return out


def specs_coef_aug():
    out = []
    for K in (104, 109, 250, 200):
        x = Decimal(K) / 100
        vv = {'K': K, 'x': f'{x.normalize():f}'}
        virgule = 10 * (K - 100) if K < 110 else Decimal(K) / 10
        out += [spec(f'× {nb(x)} → + {K - 100} %', 0, vv, 'correct', [str(K - 100)]),
                spec(f'× {nb(x)} : {K}', 0, vv, 'incorrect', [str(K)]),
                spec(f'× {nb(x)} : {nb(x - 1)}', 0, vv, 'incorrect', [nb(x - 1)]),
                spec(f'× {nb(x)} : {nb(virgule)}', 0, vv, 'incorrect', [nb(virgule)])]
    return out


def specs_taux_dim():
    out = []
    for t in (7, 3, 23, 64):
        k = 1 - Decimal(t) / 100
        second = 1 - Decimal(t) / 10 if t < 10 else 100 - t
        out += [spec(f'− {t} % → × {nb(k)}', 0, {'t': t}, 'correct', [nb(k)]),
                spec(f'− {t} % : {nb(Decimal(t) / 100)}', 0, {'t': t}, 'incorrect',
                     [nb(Decimal(t) / 100)]),
                spec(f'− {t} % : {nb(second)}', 0, {'t': t}, 'incorrect', [nb(second)]),
                spec(f'− {t} % : {nb(1 + Decimal(t) / 100)}', 0, {'t': t}, 'incorrect',
                     [nb(1 + Decimal(t) / 100)])]
    return out


def specs_coef_dim():
    out = []
    for K in (96, 77, 31):
        x = Decimal(K) / 100
        vv = {'K': K, 'x': f'{x.normalize():f}'}
        out += [spec(f'× {nb(x)} → − {100 - K} %', 0, vv, 'correct', [str(100 - K)]),
                spec(f'× {nb(x)} : {K}', 0, vv, 'incorrect', [str(K)]),
                spec(f'× {nb(x)} : {nb(1 - x)}', 0, vv, 'incorrect', [nb(1 - x)]),
                spec(f'× {nb(x)} : {K - 100}', 0, vv, 'incorrect', [str(K - 100)])]
    return out


def decaler(specs, de):
    for s in specs:
        s['variationIndex'] += de
    return specs


va = [v1('augmente', '+'), v2('+'), v_taux_aug, v_coef_aug]
sa = (specs_v1('+') + decaler(specs_v2('+'), 1) + decaler(specs_taux_aug(), 2)
      + decaler(specs_coef_aug(), 3))
ajouter('ccb51039', va, sa)

vd = [v1('diminue', '-'), v2('-'), v_taux_dim, v_coef_dim]
sd = (specs_v1('-') + decaler(specs_v2('-'), 1) + decaler(specs_taux_dim(), 2)
      + decaler(specs_coef_dim(), 3))
ajouter('76f5f143', vd, sd)

# =============================================================================================
# V4 — Évolution répétée : valeur au bout de n ans (8b59ca4b v2 et v3, Seconde, 2-378).
# Deux cases : le coefficient global (puissance, ou sa valeur exacte), puis la valeur arrondie.
# =============================================================================================

v_hausse = variation(
    '{{if:c==0|Un salaire mensuel de ${{a}}~\\unit{€}$ augmente de ${{t}}\\,\\%$ chaque année|'
    'Un capital de ${{a}}~\\unit{€}$ rapporte ${{t}}\\,\\%$ d\'intérêts par an, ajoutés au capital '
    'chaque année}}, pendant ${{n}}$ ans.\n\n'
    'Le coefficient multiplicateur global est $?$.\n\n'
    'Au bout de ${{n}}$ ans, {{if:c==0|le salaire|le capital}} vaut, arrondi au centime, '
    '$?~\\text{€}$.',
    [var('c', '0..1'), var('j', '20..40'), var('a', 'eval:50*j'), var('t', '1..5'),
     var('n', '3..6')],
    [case('{{eval:1+t/100;d}}^{ {{n}} }', [
        erreur('{{eval:1+n*t/100;d}}', 'Les taux ne s\'additionnent pas : chaque année, on multiplie '
               'par ${{eval:1+t/100;d}}$, donc ${{n}}$ fois de suite.', 'Taux additionnés'),
        erreur('{{eval:n*(1+t/100);d}}', 'Multiplier ${{n}}$ fois par ${{eval:1+t/100;d}}$, ce n\'est '
               'pas multiplier par ${{n}}\\times{{eval:1+t/100;d}}$ : c\'est une puissance.',
               'Coefficient multiplié par n'),
        erreur('{{eval:1+t/100;d}}', 'C\'est le coefficient d\'une seule année : on le demande pour '
               '${{n}}$ ans.', 'Une seule année'),
     ], acceptDecimal=True),
     case('{{eval:a*(1+t/100)^n;a2}}', [
         erreur('{{eval:a*(1+n*t/100);a2}}', 'Les taux ne s\'additionnent pas : on multiplie '
                '${{a}}$ par ${{eval:1+t/100;d}}^{ {{n}} }$, pas par ${{eval:1+n*t/100;d}}$.',
                'Taux additionnés'),
         erreur('{{eval:a*n*(1+t/100);a2}}', 'Tu as multiplié par ${{n}}$ : il faut multiplier '
                '${{n}}$ fois par ${{eval:1+t/100;d}}$, c\'est-à-dire par ${{eval:1+t/100;d}}^{ {{n}} }$.',
                'Multiplié par n'),
         erreur('{{eval:a*(1+t/100)^n-a;a2}}', 'C\'est ce qui a été gagné : on demande la nouvelle '
                'valeur.', 'Le gain seul'),
     ], precision={'type': 'decimal', 'digits': 2})],
    ['Chaque année, la valeur est multipliée par $1+\\dfrac{ {{t}} }{100}={{eval:1+t/100;d}}$.',
     'Au bout de ${{n}}$ ans, elle est multipliée ${{n}}$ fois par ${{eval:1+t/100;d}}$ : le '
     'coefficient multiplicateur global est $' + PRIMAIRE + '{ {{eval:1+t/100;d}}^{ {{n}} } }$.',
     '$${{a}}\\times{{eval:1+t/100;d}}^{ {{n}} }\\approx' + PRIMAIRE
     + '{ {{eval:a*(1+t/100)^n;a2}} }$$'],
    'Chaque année, la valeur est multipliée par le même nombre : lequel, et combien de fois ?')

v_baisse = variation(
    'Une espèce protégée compte ${{a}}$ individus. Sa population diminue de ${{t}}\\,\\%$ chaque '
    'année, pendant ${{n}}$ ans.\n\n'
    'Le coefficient multiplicateur global est $?$.\n\n'
    'Au bout de ${{n}}$ ans, il reste environ $?$ individus (arrondi à l\'unité).',
    [var('a', '300..1300'), var('t', '4..16'), var('n', '3..6')],
    [case('{{eval:1-t/100;d}}^{ {{n}} }', [
        erreur('{{eval:1-n*t/100;d}}', 'Les taux ne s\'additionnent pas : chaque année, on multiplie '
               'par ${{eval:1-t/100;d}}$, donc ${{n}}$ fois de suite.', 'Taux additionnés'),
        erreur('{{eval:n*(1-t/100);d}}', 'Multiplier ${{n}}$ fois par ${{eval:1-t/100;d}}$, ce n\'est '
               'pas multiplier par ${{n}}\\times{{eval:1-t/100;d}}$ : c\'est une puissance.',
               'Coefficient multiplié par n'),
        erreur('{{eval:1-t/100;d}}', 'C\'est le coefficient d\'une seule année : on le demande pour '
               '${{n}}$ ans.', 'Une seule année'),
     ], acceptDecimal=True),
     case('{{eval:a*(1-t/100)^n;a0}}', [
         erreur('{{eval:a*(1-n*t/100);a0}}', 'Les taux ne s\'additionnent pas : on multiplie '
                '${{a}}$ par ${{eval:1-t/100;d}}^{ {{n}} }$, pas par ${{eval:1-n*t/100;d}}$.',
                'Taux additionnés'),
         erreur('{{eval:a*n*(1-t/100);a0}}', 'Tu as multiplié par ${{n}}$ : il faut multiplier '
                '${{n}}$ fois par ${{eval:1-t/100;d}}$, c\'est-à-dire par ${{eval:1-t/100;d}}^{ {{n}} }$.',
                'Multiplié par n'),
         erreur('{{eval:a-a*(1-t/100)^n;a0}}', 'C\'est le nombre d\'individus disparus : on demande '
                'combien il en reste.', 'La perte seule'),
     ], precision={'type': 'decimal', 'digits': 0})],
    ['Chaque année, la population est multipliée par $1-\\dfrac{ {{t}} }{100}={{eval:1-t/100;d}}$.',
     'Au bout de ${{n}}$ ans, elle est multipliée ${{n}}$ fois par ${{eval:1-t/100;d}}$ : le '
     'coefficient multiplicateur global est $' + PRIMAIRE + '{ {{eval:1-t/100;d}}^{ {{n}} } }$.',
     '$${{a}}\\times{{eval:1-t/100;d}}^{ {{n}} }\\approx' + PRIMAIRE
     + '{ {{eval:a*(1-t/100)^n;a0}} }$$'],
    'Chaque année, la population est multipliée par le même nombre : lequel, et combien de fois ?')


def puissance(k, n):
    return nb(k).replace(',', '{,}') + '^{' + str(n) + '}'


def specs_hausse():
    out = []
    for c, j, t, n in [(0, 30, 2, 5), (1, 25, 4, 3)]:
        a = 50 * j
        k = 1 + Decimal(t) / 100
        vv = {'c': c, 'j': j, 'a': a, 't': t, 'n': n}
        val = nb(a * k ** n, 2)
        out += [spec(f'{a} € à + {t} % pendant {n} ans', 0, vv, 'correct', [puissance(k, n), val]),
                spec(f'{a} € : taux additionnés', 0, vv, 'incorrect',
                     [nb(1 + Decimal(n * t) / 100), nb(a * (1 + Decimal(n * t) / 100), 2)]),
                spec(f'{a} € : multiplié par n', 0, vv, 'incorrect',
                     [nb(n * k), nb(a * n * k, 2)]),
                spec(f'{a} € : une seule année, gain seul', 0, vv, 'incorrect',
                     [nb(k), nb(a * k ** n - a, 2)])]
    return out


def specs_baisse():
    out = []
    for a, t, n in [(800, 10, 4), (1250, 5, 6)]:
        k = 1 - Decimal(t) / 100
        vv = {'a': a, 't': t, 'n': n}
        out += [spec(f'{a} individus, − {t} % pendant {n} ans', 1, vv, 'correct',
                     [puissance(k, n), nb(a * k ** n, 0)]),
                spec(f'{a} individus : taux additionnés', 1, vv, 'incorrect',
                     [nb(1 - Decimal(n * t) / 100), nb(a * (1 - Decimal(n * t) / 100), 0)]),
                spec(f'{a} individus : multiplié par n', 1, vv, 'incorrect',
                     [nb(n * k), nb(a * n * k, 0)]),
                spec(f'{a} individus : une seule année, perte seule', 1, vv, 'incorrect',
                     [nb(k), nb(a - a * k ** n, 0)])]
    return out


ajouter('8b59ca4b', [v_hausse, v_baisse], specs_hausse() + specs_baisse())
