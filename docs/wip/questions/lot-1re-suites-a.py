"""Écrit les 4 modèles neufs du lot A (1re spé, suites) dans le dossier donné
(scripts/questions/1re-suites-a/).

Chantier `idees-1re-suites`, fiches 3, 11, 12, 13 de la phase 0, validées par David le
2026-11-22. Points visés (rangement et tag posés plus tard par migration, jamais dans le
fichier) :

  01 Placer les premiers termes d'une suite             1SPE-221   level 3
  02 Sens de variation d'une suite géométrique (toutes raisons) 1SPE-229   level 4
  03 Sens de variation par le quotient u(n+1)/u(n)      1SPE-219   level 5
  04 Rang à partir duquel une suite est monotone        1SPE-219   level 6

Décisions :
- 01 copie la mécanique de 96668141 / 13388e8f (geste `placer:` d'un ```courbe) : 4 points
  (u₀ à u₃), repère fixe n ∈ [−1 ; 4], y ∈ [−10 ; 10] gradué de 1 en 1, chaque terme tenu
  dans [−9 ; 9] par `conditions`, suite non constante sur u₀..u₃. Pas d'erreur prévue (geste).
- 02 : choix à 4 options sans mélange (croissante, décroissante, constante, ni l'une ni
  l'autre). v0-v2 raison négative (ni l'une ni l'autre) ; v3-v7 raison positive ou égale à 1
  (David, 2026-11-22 : mêler les raisons, sinon la réponse serait toujours la même), réponse
  fixe par variation. q = −1 inclus en v0 et v1,
  exclu de v2 (« −1u_n »). Raison tirée en dixièmes (`q10`) puis affichée par `;d`.
- 03 : v0-v2 = calculer le quotient (case, expression en n), v3-v5 = conclure du quotient
  donné (choix à 3 options comme ecba8a9e, sans mélange). Termes toujours positifs.
  v2 porte `requiredForm: {pattern: 'u/v'}` : sans lui, (n+2)/(4n+4) était refusé (`bad_form`)
  face à l'attendu (n+2)/(4(n+1)) ; prix à payer : (2n+4)/(8n+8), non réduit, passe aussi.
  v1 : attendu en fraction (`{{eval:q10/10}}`) + `acceptDecimal`, pour accepter 1,5 et 3/2.
  Vu au juge : `4^{n+1}(n+1)` écrit sans signe × est jugé faux (lecture de la juxtaposition
  après une puissance), d'où des specs « non simplifié » écrites avec ×.
- 04 : seuil construit à l'envers (N tiré, puis d = −(c(N−1)+r) avec 0 < r < c) : la racine
  de cn + d n'est jamais entière, donc pas d'égalité u(N+1) = u(N) ; la consigne définit
  quand même la monotonie au sens large (u(n+1) ⩾ u(n) pour tout n ⩾ N). `acceptDecimal`
  sur la case pour que la racine décimale tapée (7,5) déclenche son erreur prévue.

Pièges respectés (couvrir-un-niveau.md § 5 et § 9) : ni `e` ni `i` en variable ; décimaux
tirés en entiers puis affichés par `{{eval:…;d}}` ; couleur toujours dans `$…$` ; le corrigé
nomme la bonne réponse, jamais son rang ; pas de Oui / Non ; `if:` sur des indicatrices
(`eval:` ne connaît pas `>`) ; coup de pouce `hint` sur chaque variation, sans la réponse ;
3 erreurs prévues par case de saisie, chacune avec sa spec `incorrect`.
"""
import json
import os
import sys

DOSSIER = sys.argv[1]


def spec(desc, vi, variables_, status, answers, violations=None, message=None):
    expected = {'status': status}
    if violations:
        expected['constraintViolations'] = violations
    if message:
        expected['expectedErrorMessage'] = message
    return {'description': desc, 'variationIndex': vi, 'variables': variables_,
            'expected': expected, 'answers': answers}


def modele(title, description, level, delay, variations, specs, shared=None, options=None):
    m = {'title': title, 'description': description, 'grades': ['1_SPE'], 'level': level,
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


def variation(statement, variables, blanks, steps, conditions=None, **extra):
    v = {'statement': statement, 'variables': variables, 'conditions': conditions or []}
    if blanks is not None:
        v['blanks'] = blanks
    v['correction'] = {'steps': steps}
    v.update(extra)
    return v


def blank(expected, **extra):
    b = {'expectedAnswer': expected}
    b.update(extra)
    return b


def err(answer, message, label):
    return {'answer': answer, 'message': message, 'label': label}


def bloc(nom, *lignes):
    return '```' + nom + '\n' + '\n'.join(lignes) + '\n```'


def coul(x):
    """Réponse mise en couleur (toujours à l'intérieur d'un `$…$`)."""
    return '\\textcolor{{{color:primary.0}}}{' + x + '}'


# --- 01 · 1SPE-221 · Placer les premiers termes d'une suite ---------------------------------

CONSIGNE_PLACER = ('Place les points $A$, $B$, $C$ et $D$ qui représentent $u_0$, $u_1$, $u_2$ '
                   'et $u_3$ : le point d\'abscisse $n$ a pour ordonnée $u_n$.')

REPERE = bloc(
    'courbe',
    'x: -1 ; 4',
    'y: -10 ; 10',
    'grille: 1 ; 1',
    'placer: A=(0 ; {{t0}}) ; B=(1 ; {{t1}}) ; C=(2 ; {{t2}}) ; D=(3 ; {{t3}})',
    'taille: moyenne',
    'description: Repère gradué de 1 en 1 : n de −1 à 4 en abscisse, de −10 à 10 en ordonnée.')

PLACER_FIN = ('On place chaque point $(n\\,;u_n)$ : $A' + coul('(0\\,;{{t0}})') + '$, $B'
              + coul('(1\\,;{{t1}})') + '$, $C' + coul('(2\\,;{{t2}})') + '$, $D'
              + coul('(3\\,;{{t3}})') + '$.')

DANS_LE_REPERE = ['abs(t0) <= 9', 'abs(t1) <= 9', 'abs(t2) <= 9', 'abs(t3) <= 9']
NON_CONSTANTE = 'abs(t1-t0)+abs(t2-t1)+abs(t3-t2) > 0'


def enonce_placer(definition):
    return definition + '\n\n' + CONSIGNE_PLACER + '\n\n' + REPERE


M1_V0 = variation(
    enonce_placer('La suite $(u_n)$ est définie, pour tout entier naturel $n$, par '
                  '$u_n={{a}}n{{b;+}}$.'),
    [var('a', '-3|-2|-1|1|2|3'), var('b', '1..9;±'), var('t0', 'eval:b'),
     var('t1', 'eval:a+b'), var('t2', 'eval:2*a+b'), var('t3', 'eval:3*a+b')],
    None,
    ['On remplace $n$ par $0$, $1$, $2$ et $3$ dans $u_n={{a}}n{{b;+}}$ : $u_0={{t0}}$, '
     '$u_1={{t1}}$, $u_2={{t2}}$, $u_3={{t3}}$.',
     PLACER_FIN + ' Les points sont alignés.'],
    DANS_LE_REPERE + [NON_CONSTANTE],
    hint='Calcule $u_0$, $u_1$, $u_2$ et $u_3$ en remplaçant $n$ par $0$, $1$, $2$ et $3$ dans '
         'l\'expression de $u_n$.',
)

M1_V1 = variation(
    enonce_placer('La suite $(u_n)$ est définie, pour tout entier naturel $n$, par '
                  '$u_n={{sg}}n^2{{c;+}}$.'),
    [var('sg', '-1|1'), var('c', '-9..9'), var('t0', 'eval:c'), var('t1', 'eval:sg+c'),
     var('t2', 'eval:4*sg+c'), var('t3', 'eval:9*sg+c')],
    None,
    ['On remplace $n$ par $0$, $1$, $2$ et $3$ (attention, on élève $n$ au carré avant de '
     'multiplier par le signe) : $u_0={{t0}}$, $u_1={{t1}}$, $u_2={{t2}}$, $u_3={{t3}}$.',
     PLACER_FIN + ' Les points ne sont pas alignés.'],
    DANS_LE_REPERE,
    hint='Remplace $n$ par $0$, $1$, $2$ et $3$ : $n^2$ vaut alors $0$, $1$, $4$ et $9$.',
)

M1_V2 = variation(
    enonce_placer('La suite $(u_n)$ est définie par $u_0={{t0}}$ et, pour tout entier naturel '
                  '$n$, $u_{n+1}={{a}}u_n{{b;+}}$.'),
    [var('a', '-2|2|3'), var('b', '1..3;±'), var('t0', '-3..3'), var('t1', 'eval:a*t0+b'),
     var('t2', 'eval:a*t1+b'), var('t3', 'eval:a*t2+b')],
    None,
    ['Chaque terme se calcule à partir du précédent : '
     '$u_1={{a}}\\times{{t0;()}}{{b;+}}={{t1}}$, '
     '$u_2={{a}}\\times{{t1;()}}{{b;+}}={{t2}}$, '
     '$u_3={{a}}\\times{{t2;()}}{{b;+}}={{t3}}$.',
     PLACER_FIN],
    DANS_LE_REPERE + ['t1 != t0'],
    hint='Pars de $u_0$ : la relation donne $u_1$ quand on prend $n=0$, puis $u_2$ à partir de '
         '$u_1$, et ainsi de suite.',
)

M1_V3 = variation(
    enonce_placer('La suite $(u_n)$ est définie par $u_0={{t0}}$ et, pour tout entier naturel '
                  '$n$, $u_{n+1}=u_n^2-{{c}}$.'),
    [var('c', '1|2'), var('t0', '-3..3'), var('t1', 'eval:t0^2-c'), var('t2', 'eval:t1^2-c'),
     var('t3', 'eval:t2^2-c')],
    None,
    ['Chaque terme se calcule à partir du précédent : $u_1={{t0;()}}^2-{{c}}={{t1}}$, '
     '$u_2={{t1;()}}^2-{{c}}={{t2}}$, $u_3={{t2;()}}^2-{{c}}={{t3}}$.',
     PLACER_FIN],
    DANS_LE_REPERE + [NON_CONSTANTE],
    hint='Pars de $u_0$ : élève-le au carré puis retranche ${{c}}$ pour obtenir $u_1$, et '
         'recommence à partir de $u_1$.',
)

M1_V4 = variation(
    enonce_placer('La suite $(u_n)$ est définie par $u_0={{t0}}$ et, pour tout entier naturel '
                  '$n$, $u_{n+1}=u_n{{a;+}}n$.'),
    [var('a', '1..3;±'), var('t0', '-5..5'), var('t1', 'eval:t0'), var('t2', 'eval:t0+a'),
     var('t3', 'eval:t0+3*a')],
    None,
    ['Pour $n=0$ : $u_1=u_0{{a;+}}\\times0={{t1}}$ (on ajoute $0$, donc $u_1=u_0$).',
     'Pour $n=1$ : $u_2=u_1{{a;+}}\\times1={{t2}}$ ; pour $n=2$ : '
     '$u_3=u_2{{a;+}}\\times2={{t3}}$.',
     PLACER_FIN],
    DANS_LE_REPERE,
    hint='Pour calculer $u_1$, prends $n=0$ dans la relation ; pour $u_2$, prends $n=1$.',
)


def pts(*ys):
    return [str(k) + ';' + str(y) for k, y in enumerate(ys)]


M1_SPECS = [
    spec('u_n = 2n − 3 : −3, −1, 1, 3', 0, {'a': '2', 'b': '-3'}, 'correct', pts(-3, -1, 1, 3)),
    spec('Erreur : abscisse et ordonnée échangées pour B', 0, {'a': '2', 'b': '-3'},
         'incorrect', ['0;-3', '-1;1', '2;1', '3;3']),
    spec('Erreur : décalage d\'un rang (u₁ placé en 0)', 0, {'a': '2', 'b': '-3'}, 'incorrect',
         pts(-1, 1, 3, 5)),
    spec('u_n = −n + 4 : 4, 3, 2, 1', 0, {'a': '-1', 'b': '4'}, 'correct', pts(4, 3, 2, 1)),
    spec('u_n = n² − 5 : −5, −4, −1, 4', 1, {'sg': '1', 'c': '-5'}, 'correct',
         pts(-5, -4, -1, 4)),
    spec('Erreur : n² lu 2n (−5, −3, −1, 1)', 1, {'sg': '1', 'c': '-5'}, 'incorrect',
         pts(-5, -3, -1, 1)),
    spec('u_n = −n² + 6 : 6, 5, 2, −3', 1, {'sg': '-1', 'c': '6'}, 'correct', pts(6, 5, 2, -3)),
    spec('u_n = −n² : 0, −1, −4, −9', 1, {'sg': '-1', 'c': '0'}, 'correct', pts(0, -1, -4, -9)),
    spec('Erreur : −n² lu (−n)² (0, 1, 4, 9)', 1, {'sg': '-1', 'c': '0'}, 'incorrect',
         pts(0, 1, 4, 9)),
    spec('u₀ = 2, u(n+1) = 2u(n) − 3 : 2, 1, −1, −5', 2, {'a': '2', 'b': '-3', 't0': '2'},
         'correct', pts(2, 1, -1, -5)),
    spec('Erreur : 2(u − 3) au lieu de 2u − 3 (2, −2, −10…)', 2,
         {'a': '2', 'b': '-3', 't0': '2'}, 'incorrect', pts(2, -2, -10, -26)),
    spec('Erreur : u₁ calculé avec n à la place de u (2, −3, −1, 1)', 2,
         {'a': '2', 'b': '-3', 't0': '2'}, 'incorrect', pts(2, -3, -1, 1)),
    spec('u₀ = 1, u(n+1) = −2u(n) + 1 : 1, −1, 3, −5', 2, {'a': '-2', 'b': '1', 't0': '1'},
         'correct', pts(1, -1, 3, -5)),
    spec('u₀ = 0, u(n+1) = u(n)² − 1 : 0, −1, 0, −1', 3, {'c': '1', 't0': '0'}, 'correct',
         pts(0, -1, 0, -1)),
    spec('Erreur : (−1)² − 1 calculé −2 (0, −1, −2, 3)', 3, {'c': '1', 't0': '0'}, 'incorrect',
         pts(0, -1, -2, 3)),
    spec('u₀ = 0, u(n+1) = u(n)² − 2 : 0, −2, 2, 2', 3, {'c': '2', 't0': '0'}, 'correct',
         pts(0, -2, 2, 2)),
    spec('u₀ = 1, u(n+1) = u(n) + 2n : 1, 1, 3, 7', 4, {'a': '2', 't0': '1'}, 'correct',
         pts(1, 1, 3, 7)),
    spec('u₀ = 0, u(n+1) = u(n) + n : 0, 0, 1, 3', 4, {'a': '1', 't0': '0'}, 'correct',
         pts(0, 0, 1, 3)),
    spec('Erreur : on ajoute n + 1 (0, 1, 3, 6)', 4, {'a': '1', 't0': '0'}, 'incorrect',
         pts(0, 1, 3, 6)),
    spec('Erreur : suite arithmétique de raison 2 (1, 3, 5, 7)', 4, {'a': '2', 't0': '1'},
         'incorrect', pts(1, 3, 5, 7)),
    spec('u₀ = 4, u(n+1) = u(n) − n : 4, 4, 3, 1', 4, {'a': '-1', 't0': '4'}, 'correct',
         pts(4, 4, 3, 1)),
]

M1 = modele(
    'Placer les premiers termes d\'une suite',
    'Placer u₀ à u₃ dans un repère : explicite an + b ou ±n² + c, récurrente au + b, u² − c, '
    'u + an (pièges : n² et −n², u₁ = u₀ quand on ajoute a × 0)',
    3, 120, [M1_V0, M1_V1, M1_V2, M1_V3, M1_V4], M1_SPECS,
    shared={'cleanCoefficients': True})

# --- 02 · 1SPE-229 · Sens de variation d'une suite géométrique, toutes raisons ---------------
# Réponse du choix (sans mélange) : 0 croissante, 1 décroissante, 2 constante, 3 ni l'une ni
# l'autre. La raison est négative : toujours 3.

CHOIX_SENS4 = bloc('choix', 'melanger: non', '- croissante', '- décroissante', '- constante',
                   '- ni croissante, ni décroissante')

Q_NEG = '-30|-25|-20|-15|-10|-8|-5|-4|-2'
Q_NEG_SANS_MOINS_UN = '-30|-25|-20|-15|-8|-5|-4|-2'

def M2_VARS(q, a='1..9;±'):
    return [var('a', a), var('q10', q), var('sa', 'eval:min(max(a,0),1)')]

M2_FIN = [
    'Calculons les premiers termes : $u_0={{a}}$, $u_1={{eval:a*q10/10;d}}$, '
    '$u_2={{eval:a*q10^2/100;d}}$. Leurs signes alternent.',
    '{{if:sa==1|$u_1<u_0$ mais $u_2>u_1$|$u_1>u_0$ mais $u_2<u_1$}} : la suite est $'
    + coul('\\text{ni croissante, ni décroissante}') + '$.',
]

M2_RAPPEL = ('La raison $q={{eval:q10/10;d}}$ est **négative** : multiplier par $q$ change le signe '
             'du terme à chaque rang.')

M2_HINT = ('Regarde d\'abord le signe de la raison $q$ ; si elle est positive, compare-la à $1$ '
           'et tiens compte du signe de $u_0$.')

M2_V0 = variation(
    'La suite $(u_n)$ est géométrique, de premier terme $u_0={{a}}$ et de raison '
    '$q={{eval:q10/10;d}}$.\n\nQuel est son sens de variation ?\n\n' + CHOIX_SENS4,
    M2_VARS(Q_NEG), [blank('3')], [M2_RAPPEL] + M2_FIN, hint=M2_HINT)

M2_V1 = variation(
    'La suite $(u_n)$ est définie, pour tout entier naturel $n$, par '
    '$u_n={{a}}\\times\\left({{eval:q10/10;d}}\\right)^n$.\n\nQuel est son sens de variation ?\n\n'
    + CHOIX_SENS4,
    M2_VARS(Q_NEG, '2..9;±'), [blank('3')],
    ['$(u_n)$ est géométrique, de premier terme $u_0={{a}}$ et de raison $q={{eval:q10/10;d}}$, '
     'un nombre **négatif** : multiplier par $q$ change le signe du terme à chaque rang.']
    + M2_FIN, hint=M2_HINT)

M2_V2 = variation(
    'La suite $(u_n)$ est définie par $u_0={{a}}$ et, pour tout entier naturel $n$, '
    '$u_{n+1}={{eval:q10/10;d}}u_n$.\n\nQuel est son sens de variation ?\n\n' + CHOIX_SENS4,
    M2_VARS(Q_NEG_SANS_MOINS_UN), [blank('3')],
    ['On passe d\'un terme au suivant en multipliant par ${{eval:q10/10;d}}$ : la suite est '
     'géométrique de raison $q={{eval:q10/10;d}}$, un nombre **négatif**, qui change le signe '
     'du terme à chaque rang.'] + M2_FIN, hint=M2_HINT)

# Raisons positives (décision de David, 2026-11-22) : sans elles, la réponse serait toujours
# « ni croissante, ni décroissante ». Une variation par cas, réponse fixe par variation.
Q_SUP1 = '12|15|20|25|30'
Q_INF1 = '2|4|5|8|9'

def M2_POS(enonce, a, q, rep, etapes):
    return variation(enonce + '\n\nQuel est son sens de variation ?\n\n' + CHOIX_SENS4,
                     [var('a', a), var('q10', q)], [blank(rep)], etapes, hint=M2_HINT)

M2_V3 = M2_POS(
    'La suite $(u_n)$ est géométrique, de premier terme $u_0={{a}}$ et de raison '
    '$q={{eval:q10/10;d}}$.', '1..9', Q_SUP1, '0',
    ['La raison $q={{eval:q10/10;d}}$ est plus grande que $1$ et $u_0={{a}}>0$ : chaque terme est '
     'plus grand que le précédent ($u_{n+1}-u_n=u_n(q-1)>0$).',
     'La suite est $' + coul('\\text{croissante}') + '$.'])

M2_V4 = M2_POS(
    'La suite $(u_n)$ est définie, pour tout entier naturel $n$, par '
    '$u_n=-{{a}}\\times{{eval:q10/10;d}}^n$.', '2..9', Q_INF1, '0',
    ['$(u_n)$ est géométrique, de premier terme $u_0=-{{a}}<0$ et de raison '
     '$q={{eval:q10/10;d}}$, comprise entre $0$ et $1$.',
     '$u_{n+1}-u_n=u_n(q-1)$ : produit de deux nombres négatifs, donc positif. La suite est $'
     + coul('\\text{croissante}') + '$.'])

M2_V5 = M2_POS(
    'La suite $(u_n)$ est définie par $u_0={{a}}$ et, pour tout entier naturel $n$, '
    '$u_{n+1}={{eval:q10/10;d}}u_n$.', '1..9', Q_INF1, '1',
    ['On passe d\'un terme au suivant en multipliant par ${{eval:q10/10;d}}$ : la suite est '
     'géométrique de raison $q={{eval:q10/10;d}}$, comprise entre $0$ et $1$, et $u_0={{a}}>0$.',
     '$u_{n+1}-u_n=u_n(q-1)<0$ : la suite est $' + coul('\\text{décroissante}') + '$.'])

M2_V6 = M2_POS(
    'La suite $(u_n)$ est géométrique, de premier terme $u_0=-{{a}}$ et de raison '
    '$q={{eval:q10/10;d}}$.', '1..9', Q_SUP1, '1',
    ['La raison $q={{eval:q10/10;d}}$ est plus grande que $1$ et $u_0=-{{a}}<0$ : '
     '$u_{n+1}-u_n=u_n(q-1)$ est le produit d\'un nombre négatif et d\'un nombre positif.',
     'La suite est $' + coul('\\text{décroissante}') + '$.'])

M2_V7 = variation(
    'La suite $(u_n)$ est géométrique, de premier terme $u_0={{a}}$ et de raison $q=1$.'
    '\n\nQuel est son sens de variation ?\n\n' + CHOIX_SENS4,
    [var('a', '1..9;±')], [blank('2')],
    ['Avec $q=1$, chaque terme est égal au précédent : $u_n={{a}}$ pour tout $n$.',
     'La suite est $' + coul('\\text{constante}') + '$.'], hint=M2_HINT)

M2_SPECS = [
    spec('u₀ = 3, q = −2 : ni l\'une ni l\'autre', 0, {'a': '3', 'q10': '-20'}, 'correct', ['3']),
    spec('Erreur : décroissante parce que q < 0', 0, {'a': '3', 'q10': '-20'}, 'incorrect',
         ['1']),
    spec('Erreur : croissante parce que u₀ > 0', 0, {'a': '3', 'q10': '-20'}, 'incorrect',
         ['0']),
    spec('u₀ = −4, q = −0,5 : ni l\'une ni l\'autre', 0, {'a': '-4', 'q10': '-5'}, 'correct',
         ['3']),
    spec('u₀ = 2, q = −1 : ni l\'une ni l\'autre', 0, {'a': '2', 'q10': '-10'}, 'correct', ['3']),
    spec('Erreur : constante pour q = −1', 0, {'a': '2', 'q10': '-10'}, 'incorrect', ['2']),
    spec('u_n = −3 × (−0,4)ⁿ : ni l\'une ni l\'autre', 1, {'a': '-3', 'q10': '-4'}, 'correct',
         ['3']),
    spec('Erreur : croissante (−3 < 0 et |q| < 1)', 1, {'a': '-3', 'q10': '-4'}, 'incorrect',
         ['0']),
    spec('u₀ = 5, u(n+1) = −2,5 u(n) : ni l\'une ni l\'autre', 2, {'a': '5', 'q10': '-25'},
         'correct', ['3']),
    spec('Erreur : décroissante (−2,5 < 0)', 2, {'a': '5', 'q10': '-25'}, 'incorrect', ['1']),
    spec('u₀ = 4, q = 1,5 : croissante', 3, {'a': '4', 'q10': '15'}, 'correct', ['0']),
    spec('Erreur : ni l\'une ni l\'autre', 3, {'a': '4', 'q10': '15'}, 'incorrect', ['3']),
    spec('−3 × 0,5ⁿ : croissante', 4, {'a': '3', 'q10': '5'}, 'correct', ['0']),
    spec('Erreur : décroissante (q < 1, signe de u₀ oublié)', 4, {'a': '3', 'q10': '5'},
         'incorrect', ['1']),
    spec('u₀ = 6, u(n+1) = 0,8 u(n) : décroissante', 5, {'a': '6', 'q10': '8'}, 'correct', ['1']),
    spec('Erreur : croissante', 5, {'a': '6', 'q10': '8'}, 'incorrect', ['0']),
    spec('u₀ = −2, q = 3 : décroissante', 6, {'a': '2', 'q10': '30'}, 'correct', ['1']),
    spec('Erreur : croissante (q > 1, signe de u₀ oublié)', 6, {'a': '2', 'q10': '30'},
         'incorrect', ['0']),
    spec('q = 1 : constante', 7, {'a': '5'}, 'correct', ['2']),
    spec('Erreur : croissante', 7, {'a': '5'}, 'incorrect', ['0']),
]

M2 = modele(
    'Sens de variation d\'une suite géométrique, quelle que soit sa raison',
    'Suite géométrique donnée par u₀ et q, par a × qⁿ ou par u(n+1) = q u(n) : raison négative '
    '(ni croissante, ni décroissante ; piège « q < 0 donc décroissante »), raison positive selon '
    'q et le signe de u₀, raison 1 (constante)',
    4, 45, [M2_V0, M2_V1, M2_V2, M2_V3, M2_V4, M2_V5, M2_V6, M2_V7], M2_SPECS, shared={'cleanCoefficients': True})

# --- 03 · 1SPE-219 · Sens de variation par le quotient u(n+1)/u(n) ---------------------------

QUOT = '\\dfrac{u_{n+1}}{u_n}'
CONSIGNE_QUOT = ('Exprime $' + QUOT + '$ en fonction de $n$, sous la forme d\'un seul quotient '
                 'simplifié.\n\n$' + QUOT + '=?$')
MSG_INVERSE = ('Tu as calculé $\\dfrac{u_n}{u_{n+1}}$ : c\'est $u_{n + 1}$ qu\'on divise par '
               '$u_n$.')
HINT_QUOT = ('Écris $u_{n+1}$ en remplaçant $n$ par $n+1$, puis multiplie-le par l\'inverse de '
             '$u_n$ et simplifie les puissances.')

M3_V0 = variation(
    'La suite $(u_n)$ est définie, pour tout entier $n\\geqslant1$, par '
    '$u_n=\\dfrac{n}{ {{k}}^n}$.\n\n' + CONSIGNE_QUOT,
    [var('k', '2..5')],
    [blank('\\frac{n+1}{ {{k}}n}', expectedErrors=[
        err('\\frac{ {{k}}n}{n+1}', MSG_INVERSE, 'Quotient inversé'),
        err('\\frac{n+1}{n}', 'Tu as simplifié ${{k}}^n$ et ${{k}}^{n + 1}$ comme s\'ils étaient '
            'égaux : leur quotient vaut ${{k}}$.', 'Puissances simplifiées en 1'),
        err('\\frac{ {{k}}(n+1)}{n}', 'Tu as multiplié par ${{k}}$ au lieu de diviser : '
            '${{k}}^{n + 1}$ est au dénominateur de $u_{n + 1}$.', 'Multiplié au lieu de divisé'),
    ])],
    ['$u_{n+1}=\\dfrac{n+1}{ {{k}}^{n+1}}$.',
     '$' + QUOT + '=\\dfrac{n+1}{ {{k}}^{n+1}}\\times\\dfrac{ {{k}}^n}{n}$ et '
     '$\\dfrac{ {{k}}^n}{ {{k}}^{n+1}}=\\dfrac{1}{ {{k}} }$.',
     'Donc $' + QUOT + '=' + coul('\\dfrac{n+1}{ {{k}}n}') + '$.'],
    hint=HINT_QUOT,
)

M3_V1 = variation(
    'La suite $(u_n)$ est définie, pour tout entier naturel $n$, par '
    '$u_n={{a}}\\times{{eval:q10/10;d}}^n$.\n\nCalcule $' + QUOT + '$.\n\n$' + QUOT + '=?$',
    [var('a', '2..9'), var('q10', '4|6|8|12|15|25')],
    [blank('{{eval:q10/10}}', acceptDecimal=True, expectedErrors=[
        err('{{eval:10/q10}}', MSG_INVERSE, 'Quotient inversé'),
        err('{{a}}', 'Tu as gardé le coefficient ${{a}}$ : il est dans $u_{n + 1}$ et dans '
            '$u_n$, il se simplifie.', 'Coefficient gardé'),
        err('{{eval:a*q10/10;d}}', 'Tu as calculé $u_1$, pas le quotient $' + QUOT + '$.',
            'Terme u₁ au lieu du quotient'),
    ])],
    ['$u_{n+1}={{a}}\\times{{eval:q10/10;d}}^{n+1}$.',
     '$' + QUOT + '=\\dfrac{ {{a}}\\times{{eval:q10/10;d}}^{n+1}}{ {{a}}\\times'
     '{{eval:q10/10;d}}^n}={{eval:q10/10;d}}^{n+1-n}=' + coul('{{eval:q10/10;d}}') + '$.'],
    hint='Écris $u_{n+1}$ en remplaçant $n$ par $n+1$, puis simplifie le quotient : le '
         'coefficient et les puissances se simplifient.',
)

M3_V2 = variation(
    'La suite $(u_n)$ est définie, pour tout entier naturel $n$, par '
    '$u_n=\\dfrac{n+1}{ {{k}}^n}$.\n\n' + CONSIGNE_QUOT,
    [var('k', '2..5')],
    [blank('\\frac{n+2}{ {{k}}(n+1)}', requiredForm={'pattern': 'u/v'}, expectedErrors=[
        err('\\frac{ {{k}}(n+1)}{n+2}', MSG_INVERSE, 'Quotient inversé'),
        err('\\frac{n+2}{n+1}', 'Tu as simplifié ${{k}}^n$ et ${{k}}^{n + 1}$ comme s\'ils étaient '
            'égaux : leur quotient vaut ${{k}}$.', 'Puissances simplifiées en 1'),
        err('\\frac{ {{k}}(n+2)}{n+1}', 'Tu as multiplié par ${{k}}$ au lieu de diviser : '
            '${{k}}^{n + 1}$ est au dénominateur de $u_{n + 1}$.', 'Multiplié au lieu de divisé'),
    ])],
    ['$u_{n+1}=\\dfrac{(n+1)+1}{ {{k}}^{n+1}}=\\dfrac{n+2}{ {{k}}^{n+1}}$.',
     '$' + QUOT + '=\\dfrac{n+2}{ {{k}}^{n+1}}\\times\\dfrac{ {{k}}^n}{n+1}$ et '
     '$\\dfrac{ {{k}}^n}{ {{k}}^{n+1}}=\\dfrac{1}{ {{k}} }$.',
     'Donc $' + QUOT + '=' + coul('\\dfrac{n+2}{ {{k}}(n+1)}') + '$.'],
    hint=HINT_QUOT,
)

CHOIX_SENS3 = bloc('choix', 'melanger: non', '- croissante', '- décroissante',
                   '- ni croissante, ni décroissante')
HINT_CONCLURE = ('Les termes sont positifs : compare le quotient $' + QUOT + '$ à $1$, pour '
                 'tout $n$.')


def enonce_conclure(quotient):
    return ('Une suite $(u_n)$ vérifie, pour tout entier naturel $n$, $u_n>0$ et :\n\n'
            '$$' + QUOT + '=' + quotient + '$$\n\nQue peut-on dire du sens de variation de la '
            'suite $(u_n)$ ?\n\n' + CHOIX_SENS3)


RAPPEL_QUOT = ('Les termes sont **positifs** : $u_{n+1}>u_n$ revient à $' + QUOT + '>1$, et '
               '$u_{n+1}<u_n$ à $' + QUOT + '<1$.')

M3_V3 = variation(
    enonce_conclure('\\dfrac{n+{{a}}}{n+{{b}}}'),
    [var('a', '1..9'), var('b', '1..9'), var('sa', 'eval:min(max(a-b,0),1)'),
     var('rep', 'eval:1-sa')],
    [blank('{{rep}}')],
    [RAPPEL_QUOT,
     'Pour tout $n$, $n+{{a}}{{if:sa==1|>|<}}n+{{b}}$ et $n+{{b}}>0$, donc $' + QUOT
     + '{{if:sa==1|>|<}}1$.',
     'Donc $u_{n+1}{{if:sa==1|>|<}}u_n$ pour tout $n$ : la suite est $'
     + coul('\\text{ {{if:sa==1|croissante|décroissante}} }') + '$.'],
    ['a != b'],
    hint=HINT_CONCLURE,
)

M3_V4 = variation(
    enonce_conclure('\\dfrac{ {{k}} }{n+1}'),
    [var('k', '2..9')],
    [blank('2')],
    [RAPPEL_QUOT,
     'Pour $n=0$ : $' + QUOT + '={{k}}>1$, donc $u_1>u_0$.',
     'Pour $n={{k}}$ : $\\dfrac{u_{ {{eval:k+1}} }}{u_{ {{k}} }}=\\dfrac{ {{k}} }{ {{eval:k+1}} }<1$, '
     'donc $u_{ {{eval:k+1}} }<u_{ {{k}} }$.',
     'Le quotient passe de part et d\'autre de $1$ : la suite est $'
     + coul('\\text{ni croissante, ni décroissante}') + '$.'],
    hint=HINT_CONCLURE,
)

M3_V5 = variation(
    enonce_conclure('1{{if:s==0|+|-}}\\dfrac{1}{n+{{k}}}'),
    [var('s', '0|1'), var('k', '2..9')],
    [blank('{{s}}')],
    [RAPPEL_QUOT,
     'Pour tout $n$, $\\dfrac{1}{n+{{k}}}>0$, donc $' + QUOT + '{{if:s==0|>|<}}1$.',
     'Donc $u_{n+1}{{if:s==0|>|<}}u_n$ pour tout $n$ : la suite est $'
     + coul('\\text{ {{if:s==0|croissante|décroissante}} }') + '$.'],
    hint=HINT_CONCLURE,
)

M3_SPECS = [
    # v0 : n/kⁿ
    spec('u_n = n/2ⁿ : (n+1)/(2n)', 0, {'k': '2'}, 'correct', ['\\frac{n+1}{2n}']),
    spec('Autre écriture : (n+1)/2 × 1/n refusée (pas un seul quotient)', 0, {'k': '2'},
         'bad_form', ['\\frac{n+1}{2}\\times\\frac{1}{n}'], ['products', 'form']),
    spec('Erreur prévue : quotient inversé', 0, {'k': '2'}, 'incorrect', ['\\frac{2n}{n+1}'],
         message=MSG_INVERSE),
    spec('Erreur prévue : puissances simplifiées en 1', 0, {'k': '2'}, 'incorrect',
         ['\\frac{n+1}{n}'],
         message='Tu as simplifié $2^n$ et $2^{n + 1}$ comme s\'ils étaient égaux : leur '
                 'quotient vaut $2$.'),
    spec('Erreur prévue : multiplié par 2', 0, {'k': '2'}, 'incorrect', ['\\frac{2(n+1)}{n}'],
         message='Tu as multiplié par $2$ au lieu de diviser : $2^{n + 1}$ est au dénominateur '
                 'de $u_{n + 1}$.'),
    spec('Non simplifié : produit de deux quotients', 0, {'k': '2'}, 'bad_form',
         ['\\frac{n+1}{2^{n+1}}\\times\\frac{2^n}{n}'], ['products', 'form']),
    spec('u_n = n/3ⁿ : (n+1)/(3n)', 0, {'k': '3'}, 'correct', ['\\frac{n+1}{3n}']),
    # v1 : a × qⁿ
    spec('u_n = 3 × 1,5ⁿ : 1,5', 1, {'a': '3', 'q10': '15'}, 'correct', ['1,5']),
    spec('Autre écriture : 3/2', 1, {'a': '3', 'q10': '15'}, 'correct', ['\\frac{3}{2}']),
    spec('Erreur prévue : quotient inversé (2/3)', 1, {'a': '3', 'q10': '15'}, 'incorrect',
         ['\\frac{2}{3}'], message=MSG_INVERSE),
    spec('Erreur prévue : coefficient gardé (3)', 1, {'a': '3', 'q10': '15'}, 'incorrect', ['3'],
         message='Tu as gardé le coefficient $3$ : il est dans $u_{n + 1}$ et dans $u_n$, il se '
                 'simplifie.'),
    spec('Erreur prévue : u₁ (4,5)', 1, {'a': '3', 'q10': '15'}, 'incorrect', ['4,5'],
         message='Tu as calculé $u_1$, pas le quotient $' + QUOT + '$.'),
    spec('u_n = 5 × 0,8ⁿ : 0,8', 1, {'a': '5', 'q10': '8'}, 'correct', ['0,8']),
    # v2 : (n+1)/kⁿ
    spec('u_n = (n+1)/4ⁿ : (n+2)/(4(n+1))', 2, {'k': '4'}, 'correct',
         ['\\frac{n+2}{4(n+1)}']),
    spec('Autre écriture : (n+2)/(4n+4)', 2, {'k': '4'}, 'correct', ['\\frac{n+2}{4n+4}']),
    spec('Non simplifié : puissances laissées dans le quotient (perfectible)', 2, {'k': '4'},
         'unoptimal_form', ['\\frac{(n+2)\\times4^n}{4^{n+1}\\times(n+1)}'], ['products']),
    spec('Non simplifié : produit de deux quotients', 2, {'k': '4'}, 'bad_form',
         ['\\frac{n+2}{4^{n+1}}\\times\\frac{4^n}{n+1}'], ['form']),
    spec('Erreur prévue : quotient inversé', 2, {'k': '4'}, 'incorrect',
         ['\\frac{4(n+1)}{n+2}'], message=MSG_INVERSE),
    spec('Erreur prévue : puissances simplifiées en 1', 2, {'k': '4'}, 'incorrect',
         ['\\frac{n+2}{n+1}'],
         message='Tu as simplifié $4^n$ et $4^{n + 1}$ comme s\'ils étaient égaux : leur '
                 'quotient vaut $4$.'),
    spec('Erreur prévue : multiplié par 4', 2, {'k': '4'}, 'incorrect', ['\\frac{4(n+2)}{n+1}'],
         message='Tu as multiplié par $4$ au lieu de diviser : $4^{n + 1}$ est au dénominateur '
                 'de $u_{n + 1}$.'),
    # v3 : (n+a)/(n+b)
    spec('(n+5)/(n+2) : croissante', 3, {'a': '5', 'b': '2'}, 'correct', ['0']),
    spec('Erreur : décroissante', 3, {'a': '5', 'b': '2'}, 'incorrect', ['1']),
    spec('(n+1)/(n+3) : décroissante', 3, {'a': '1', 'b': '3'}, 'correct', ['1']),
    spec('Erreur : ni l\'une ni l\'autre (le quotient dépend de n)', 3, {'a': '1', 'b': '3'},
         'incorrect', ['2']),
    # v4 : k/(n+1)
    spec('4/(n+1) : ni l\'une ni l\'autre', 4, {'k': '4'}, 'correct', ['2']),
    spec('Erreur : croissante (vu seulement n = 0)', 4, {'k': '4'}, 'incorrect', ['0']),
    spec('Erreur : décroissante (le quotient décroît)', 4, {'k': '4'}, 'incorrect', ['1']),
    # v5 : 1 ± 1/(n+k)
    spec('1 + 1/(n+3) : croissante', 5, {'s': '0', 'k': '3'}, 'correct', ['0']),
    spec('1 − 1/(n+3) : décroissante', 5, {'s': '1', 'k': '3'}, 'correct', ['1']),
    spec('Erreur : croissante (quotient positif)', 5, {'s': '1', 'k': '3'}, 'incorrect', ['0']),
]

M3 = modele(
    'Sens de variation par le quotient u(n+1)/u(n)',
    'Calculer u(n+1)/u(n) (n/kⁿ, a × qⁿ, (n+1)/kⁿ) ou conclure du quotient comparé à 1 pour une '
    'suite à termes positifs (pièges : quotient inversé, kⁿ/kⁿ⁺¹ simplifié en 1)',
    5, 75, [M3_V0, M3_V1, M3_V2, M3_V3, M3_V4, M3_V5], M3_SPECS,
    shared={'cleanCoefficients': True})

# --- 04 · 1SPE-219 · Rang à partir duquel une suite est monotone ----------------------------
# Seuil construit à l'envers : N tiré, r dans ]0 ; c[ (ou ]0 ; 2a[), la racine n'est jamais
# entière.

CONSIGNE_CROIT = ('Quel est le plus petit entier naturel $N$ tel que la suite $(u_n)$ est '
                  'croissante à partir du rang $N$, c\'est-à-dire tel que $u_{n+1}\\geqslant u_n$ '
                  'pour tout entier $n\\geqslant N$ ?\n\n$N=?$')
CONSIGNE_DECROIT = ('Quel est le plus petit entier naturel $N$ tel que la suite $(u_n)$ est '
                    'décroissante à partir du rang $N$, c\'est-à-dire tel que $u_{n+1}\\leqslant '
                    'u_n$ pour tout entier $n\\geqslant N$ ?\n\n$N=?$')

MSG_INF_CROIT = ('Tu as arrondi à l\'entier inférieur : à ce rang, $u_{n + 1} - u_n$ est encore '
                 'négatif.')
MSG_INF_DECROIT = ('Tu as arrondi à l\'entier inférieur : à ce rang, $u_{n + 1} - u_n$ est encore '
                   'positif.')
MSG_SUP = ('Tu as décalé d\'un rang : $N$ est le premier entier $n$ pour lequel la différence '
           '$u_{n + 1} - u_n$ a le bon signe.')
MSG_RACINE = ('Tu as donné la solution de $u_{n + 1} - u_n = 0$, qui n\'est pas un entier : le rang '
              'cherché est un entier.')


def erreurs_rang(racine, msg_inf):
    return [
        err('{{eval:N-1}}', msg_inf, 'Arrondi à l\'entier inférieur'),
        err('{{eval:N+1}}', MSG_SUP, 'Décalage d\'un rang'),
        err(racine, MSG_RACINE, 'Racine non entière donnée'),
    ]


VARS_SEUIL = [var('N', '2..10'), var('c', '2..6'), var('r', '1..5'),
              var('m', 'eval:c*(N-1)+r')]
HINT_DIFF = ('Cherche pour quels entiers $n$ la différence $u_{n+1}-u_n$ a le signe voulu, en '
             'résolvant une inéquation.')

M4_V0 = variation(
    'Une suite $(u_n)$ vérifie, pour tout entier naturel $n$ :\n\n'
    '$$u_{n+1}-u_n={{c}}n-{{m}}$$\n\n' + CONSIGNE_CROIT,
    VARS_SEUIL,
    [blank('{{N}}', acceptDecimal=True,
           expectedErrors=erreurs_rang('{{eval:m/c}}', MSG_INF_CROIT))],
    ['On cherche les entiers $n$ tels que $u_{n+1}-u_n\\geqslant0$ : '
     '${{c}}n-{{m}}\\geqslant0\\iff n\\geqslant{{eval:m/c}}$.',
     '${{eval:N-1}}<{{eval:m/c}}<{{N}}$ : pour $n={{eval:N-1}}$, $u_{n+1}-u_n=-{{r}}<0$, et pour '
     'tout $n\\geqslant{{N}}$, $u_{n+1}-u_n>0$.',
     'Le plus petit entier cherché est $N=' + coul('{{N}}') + '$.'],
    ['r < c'],
    hint=HINT_DIFF,
)

M4_V1 = variation(
    'Une suite $(u_n)$ vérifie, pour tout entier naturel $n$ :\n\n'
    '$$u_{n+1}-u_n={{m}}-{{c}}n$$\n\n' + CONSIGNE_DECROIT,
    VARS_SEUIL,
    [blank('{{N}}', acceptDecimal=True,
           expectedErrors=erreurs_rang('{{eval:m/c}}', MSG_INF_DECROIT))],
    ['On cherche les entiers $n$ tels que $u_{n+1}-u_n\\leqslant0$ : '
     '${{m}}-{{c}}n\\leqslant0\\iff n\\geqslant{{eval:m/c}}$.',
     '${{eval:N-1}}<{{eval:m/c}}<{{N}}$ : pour $n={{eval:N-1}}$, $u_{n+1}-u_n={{r}}>0$, et pour '
     'tout $n\\geqslant{{N}}$, $u_{n+1}-u_n<0$.',
     'Le plus petit entier cherché est $N=' + coul('{{N}}') + '$.'],
    ['r < c'],
    hint=HINT_DIFF,
)

M4_V2 = variation(
    'La suite $(u_n)$ est définie, pour tout entier naturel $n$, par '
    '$u_n={{a}}n^2{{b;+}}n{{k;+}}$.\n\n' + CONSIGNE_CROIT,
    [var('a', '1..3'), var('N', '2..6'), var('r', '1..5'), var('k', '1..9;±'),
     var('b', 'eval:-a-2*a*(N-1)-r'), var('d', 'eval:a+b')],
    [blank('{{N}}', acceptDecimal=True,
           expectedErrors=erreurs_rang('{{eval:-d/(2*a)}}', MSG_INF_CROIT))],
    ['On calcule $u_{n+1}-u_n={{if:a==1||{{a}}}}\\left((n+1)^2-n^2\\right){{b;+}}'
     '\\left((n+1)-n\\right)={{if:a==1||{{a}}}}(2n+1){{b;+}}={{eval:2*a}}n{{d;+}}$.',
     '$u_{n+1}-u_n\\geqslant0\\iff n\\geqslant{{eval:-d/(2*a)}}$, et '
     '${{eval:N-1}}<{{eval:-d/(2*a)}}<{{N}}$ : pour $n={{eval:N-1}}$, '
     '$u_{n+1}-u_n=-{{r}}<0$, et pour tout $n\\geqslant{{N}}$, $u_{n+1}-u_n>0$.',
     'Le plus petit entier cherché est $N=' + coul('{{N}}') + '$.'],
    ['r < 2*a'],
    hint='Exprime d\'abord $u_{n+1}-u_n$ en fonction de $n$, en développant $(n+1)^2$, puis '
         'cherche à partir de quel $n$ elle est positive.',
)

M4_V3 = variation(
    'La suite $(u_n)$ est définie par $u_0={{u0}}$ et, pour tout entier naturel $n$, '
    '$u_{n+1}=u_n+{{c}}n-{{m}}$.\n\n' + CONSIGNE_CROIT,
    VARS_SEUIL + [var('u0', '-9..9')],
    [blank('{{N}}', acceptDecimal=True,
           expectedErrors=erreurs_rang('{{eval:m/c}}', MSG_INF_CROIT))],
    ['La relation donne directement $u_{n+1}-u_n={{c}}n-{{m}}$ : la valeur de $u_0$ ne sert pas.',
     '${{c}}n-{{m}}\\geqslant0\\iff n\\geqslant{{eval:m/c}}$, et '
     '${{eval:N-1}}<{{eval:m/c}}<{{N}}$ : pour $n={{eval:N-1}}$, $u_{n+1}-u_n=-{{r}}<0$, et '
     'pour tout $n\\geqslant{{N}}$, $u_{n+1}-u_n>0$.',
     'Le plus petit entier cherché est $N=' + coul('{{N}}') + '$.'],
    ['r < c'],
    hint='Isole $u_{n+1}-u_n$ dans la relation, puis cherche à partir de quel $n$ cette '
         'différence est positive.',
)

# Variables d'exemple : 4n − 30 (N = 8, c = 4, r = 2, m = 30)
EX0 = {'N': '8', 'c': '4', 'r': '2', 'm': '30'}
# 3n² − 14n + 9 → 6n − 11 (N = 2, a = 3, r = 5, b = −14, d = −11)
EX2 = {'a': '3', 'N': '2', 'r': '5', 'k': '9', 'b': '-14', 'd': '-11'}

M4_SPECS = [
    spec('4n − 30 : N = 8', 0, EX0, 'correct', ['8']),
    spec('Erreur prévue : 7 (arrondi inférieur)', 0, EX0, 'incorrect', ['7'],
         message=MSG_INF_CROIT),
    spec('Erreur prévue : 9 (décalage)', 0, EX0, 'incorrect', ['9'], message=MSG_SUP),
    spec('Erreur prévue : 7,5 (racine)', 0, EX0, 'incorrect', ['7,5'], message=MSG_RACINE),
    spec('Erreur prévue : 15/2 (racine en fraction)', 0, EX0, 'incorrect', ['\\frac{15}{2}'],
         message=MSG_RACINE),
    spec('25 − 3n : N = 9', 1, {'N': '9', 'c': '3', 'r': '1', 'm': '25'}, 'correct', ['9']),
    spec('Erreur prévue : 8 (arrondi inférieur)', 1, {'N': '9', 'c': '3', 'r': '1', 'm': '25'},
         'incorrect', ['8'], message=MSG_INF_DECROIT),
    spec('Erreur prévue : 10 (décalage)', 1, {'N': '9', 'c': '3', 'r': '1', 'm': '25'},
         'incorrect', ['10'], message=MSG_SUP),
    spec('Erreur prévue : 25/3 (racine)', 1, {'N': '9', 'c': '3', 'r': '1', 'm': '25'},
         'incorrect', ['\\frac{25}{3}'], message=MSG_RACINE),
    spec('3n² − 14n + 9 : N = 2', 2, EX2, 'correct', ['2']),
    spec('Erreur prévue : 1 (arrondi inférieur)', 2, EX2, 'incorrect', ['1'],
         message=MSG_INF_CROIT),
    spec('Erreur prévue : 3 (décalage)', 2, EX2, 'incorrect', ['3'], message=MSG_SUP),
    spec('Erreur prévue : 11/6 (racine)', 2, EX2, 'incorrect', ['\\frac{11}{6}'],
         message=MSG_RACINE),
    spec('u(n+1) = u(n) + 5n − 17 : N = 4', 3,
         {'N': '4', 'c': '5', 'r': '2', 'm': '17', 'u0': '3'}, 'correct', ['4']),
    spec('Erreur prévue : 3 (arrondi inférieur)', 3,
         {'N': '4', 'c': '5', 'r': '2', 'm': '17', 'u0': '3'}, 'incorrect', ['3'],
         message=MSG_INF_CROIT),
    spec('Erreur prévue : 5 (décalage)', 3,
         {'N': '4', 'c': '5', 'r': '2', 'm': '17', 'u0': '3'}, 'incorrect', ['5'],
         message=MSG_SUP),
    spec('Erreur prévue : 3,4 (racine)', 3,
         {'N': '4', 'c': '5', 'r': '2', 'm': '17', 'u0': '3'}, 'incorrect', ['3,4'],
         message=MSG_RACINE),
]

M4 = modele(
    'Rang à partir duquel une suite est monotone',
    'Plus petit N tel que la suite est croissante (ou décroissante) à partir du rang N : '
    'u(n+1) − u(n) = cn + d donnée, u(n) = an² + bn + c, ou u(n+1) = u(n) + cn + d '
    '(pièges : arrondi inférieur, décalage d\'un rang, racine non entière donnée)',
    6, 90, [M4_V0, M4_V1, M4_V2, M4_V3], M4_SPECS, shared={'cleanCoefficients': True})

FICHIERS = [
    ('01-placer-premiers-termes-suite.json', M1),
    ('02-sens-variation-geometrique.json', M2),
    ('03-sens-variation-quotient.json', M3),
    ('04-rang-suite-monotone.json', M4),
]

os.makedirs(DOSSIER, exist_ok=True)
for nom, m in FICHIERS:
    with open(os.path.join(DOSSIER, nom), 'w', encoding='utf-8') as f:
        json.dump(m, f, ensure_ascii=False, indent='\t')
        f.write('\n')
print(len(FICHIERS), 'modèles écrits dans', DOSSIER)
