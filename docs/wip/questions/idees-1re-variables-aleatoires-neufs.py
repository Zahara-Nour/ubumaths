"""Écrit le modèle neuf du chantier idees-1re-variables-aleatoires dans
scripts/questions/idees-1re-variables-aleatoires-neufs/.

Phase 0 : fiche docs/archive/wip/idees-1re-variables-aleatoires/idees-1re-variables-aleatoires-fiches.md, validée par David le 2026-11-26
(« je valide » : F1 et ses trois variations, Q1 oui, Q2 oui).

Rangement, nœud et point vérifiés en base le 2026-11-26 : sous-notion « loi d'une variable
aléatoire » (celle de d683e906), point 1SPE-355 ; grades ["1_SPE", "1_TECHNO"] (Q1). Le second tag
1TECHNO-095 n'est pas posé par migration-rangement.ts (un point par modèle neuf) : outil manquant.

Bornes : 1re spé, univers finis ; deux épreuves indépendantes sur un arbre (v3), sans loi binomiale.

Règles suivies (couvrir-un-niveau.md § 5) : erreurs prévues par case, chacune avec sa spec
`incorrect` qui nomme son message ; un coup de pouce par variation, qui ne donne jamais la réponse.
Q2 : en v0 et v1, l'élève remplit aussi la ligne des valeurs, dans l'ordre croissant (la consigne
le dit) ; en v2 les valeurs 0, 1, 2 sont données.

Usage : python3 docs/wip/questions/idees-1re-variables-aleatoires-neufs.py scripts/questions/idees-1re-variables-aleatoires-neufs
"""
import json
import os
import sys

DOSSIER = sys.argv[1]

PRIMAIRE = '\\textcolor{{{color:primary.0}}}'

# Messages tels que la résolution les réécrit : rempli après le premier passage de question:specs.
REECRIT = {
    '$1-P(X=2)$ est la probabilité de marquer au plus un but, pas celle de n\'en marquer aucun.':
    '$1 - P \\left( X = 2 \\right)$ est la probabilité de marquer au plus un but, pas celle de '
    'n\'en marquer aucun.',
}


def spec(desc, vi, variables_, status, answers, message=None, violations=None):
    expected = {'status': status}
    if message is not None:
        expected['expectedErrorMessage'] = REECRIT.get(message, message)
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


def case(attendue, erreurs=None):
    c = {'expectedAnswer': attendue}
    if erreurs:
        c['expectedErrors'] = erreurs
    return c


def variation(statement, variables, blanks, steps, hint, conditions=None):
    return {'statement': statement, 'variables': variables, 'conditions': conditions or [],
            'blanks': blanks, 'correction': {'steps': steps}, 'hint': hint}


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


REPONSE = ('Les probabilités s\'écrivent en fraction irréductible ou en nombre décimal exact.')
CROISSANT = 'Range les valeurs de $X$ dans l\'ordre croissant. '

ERR_MISE = 'Tu as oublié de retirer la mise : $X$ est ce que le joueur reçoit **moins** ce qu\'il a misé.'
ERR_MISE_AJOUTEE = 'La mise se **retire** de ce que reçoit le joueur, elle ne s\'ajoute pas.'
ERR_ZERO = ('Quand il ne gagne rien, le joueur a quand même perdu sa mise : son gain algébrique est '
            'négatif.')
ERR_ORDRE = 'Les valeurs de $X$ se rangent dans l\'ordre croissant, de la plus petite à la plus grande.'
ERR_SIGNE = 'Perdre sa mise donne un gain **négatif**.'

m_vars, m_specs = [], []

# =============================================================================================
# v0 — Pari aux cartes : jeu de j cartes (32 ou 52), mise a, as → b, figure → c, sinon rien.
# Valeurs : −a < c − a < b − a ; probabilités (j − 16)/j, 12/j, 4/j.
# =============================================================================================

ERR_AUTRES_FIG = ('Les cartes qui ne rapportent rien ne sont ni des as ni des figures : enlève les '
                  '$4$ as **et** les $12$ figures.')
ERR_AUTRES_AS = ('Les cartes qui ne rapportent rien ne sont ni des as ni des figures : enlève les '
                 '$12$ figures **et** les $4$ as.')
ERR_ROIS = 'Les figures sont les rois, les dames **et** les valets : il y en a $12$.'
ERR_UNE_FIG = ('Il y a $4$ cartes de chaque figure : $4$ rois, $4$ dames et $4$ valets, soit $12$ '
               'figures.')
ERR_QUART = ('Il y a $4$ as, mais la probabilité se calcule sur toutes les cartes du jeu : divise '
             'par le nombre de cartes.')
ERR_UN_AS = 'Il n\'y a pas un seul as dans le jeu : il y en a $4$, un par couleur.'

m_vars.append(variation(
    'On propose un pari à un joueur avec un jeu de ${{j}}$ cartes bien mélangé, qui contient '
    '$4$ as et $12$ figures (rois, dames et valets). Il mise ${{a}}$ € puis tire une carte au '
    'hasard. S\'il obtient un as, il reçoit ${{b}}$ € ; s\'il obtient une figure, il reçoit '
    '${{c}}$ € ; sinon, il ne reçoit rien.\n\nOn note $X$ le gain algébrique du joueur, en euros '
    '(ce qu\'il reçoit moins sa mise). Complète le tableau de la loi de $X$. ' + CROISSANT
    + REPONSE + '\n\n'
    '| $x_k$ | $?$ | $?$ | $?$ |\n|---|---|---|---|\n'
    '| $P(X=x_k)$ | $?$ | $?$ | $?$ |',
    [var('j', '32|52'), var('a', '2..10'), var('b', '30|40|50'), var('k', '5..10'),
     var('c', 'eval:a+k')],
    [
        case('{{eval:-a}}', [
            erreur('0', ERR_ZERO, 'Zéro au lieu de la mise perdue'),
            erreur('{{a}}', ERR_SIGNE, 'Mise perdue comptée positive'),
            erreur('{{eval:b-a}}', ERR_ORDRE, 'Ordre décroissant'),
        ]),
        case('{{eval:c-a}}', [
            erreur('{{c}}', ERR_MISE, 'Mise oubliée'),
            erreur('{{eval:c+a}}', ERR_MISE_AJOUTEE, 'Mise ajoutée'),
        ]),
        case('{{eval:b-a}}', [
            erreur('{{b}}', ERR_MISE, 'Mise oubliée'),
            erreur('{{eval:b+a}}', ERR_MISE_AJOUTEE, 'Mise ajoutée'),
            erreur('{{eval:-a}}', ERR_ORDRE, 'Ordre décroissant'),
        ]),
        case('{{eval:(j-16)/j}}', [
            erreur('{{eval:(j-4)/j}}', ERR_AUTRES_FIG, 'Figures oubliées'),
            erreur('{{eval:(j-12)/j}}', ERR_AUTRES_AS, 'As oubliés'),
        ]),
        case('{{eval:12/j}}', [
            erreur('{{eval:8/j}}', ERR_ROIS, 'Rois oubliés'),
            erreur('{{eval:4/j}}', ERR_UNE_FIG, 'Une seule sorte de figure'),
        ]),
        case('{{eval:4/j}}', [
            erreur('\\frac{1}{4}', ERR_QUART, 'Un quart'),
            erreur('{{eval:1/j}}', ERR_UN_AS, 'Un seul as'),
        ]),
    ],
    ['Le joueur a misé ${{a}}$ € : as, ${{b}}-{{a}}={{eval:b-a}}$ ; figure, ${{c}}-{{a}}='
     '{{eval:c-a}}$ ; autre carte, $0-{{a}}=-{{a}}$. Les valeurs de $X$ sont $-{{a}}$, '
     '${{eval:c-a}}$ et ${{eval:b-a}}$.',
     'Le jeu contient $4$ as, $12$ figures et ${{j}}-16={{eval:j-16}}$ autres cartes, toutes '
     'tirées avec la même probabilité.',
     '$P(X=-{{a}})=\\dfrac{ {{eval:j-16}} }{ {{j}} }=' + PRIMAIRE + '{ {{eval:(j-16)/j}} }$, '
     '$P(X={{eval:c-a}})=\\dfrac{12}{ {{j}} }=' + PRIMAIRE + '{ {{eval:12/j}} }$ et '
     '$P(X={{eval:b-a}})=\\dfrac{4}{ {{j}} }=' + PRIMAIRE + '{ {{eval:4/j}} }$.'],
    'Commence par la ligne des valeurs : pour chaque carte, ce que reçoit le joueur moins ce qu\'il '
    'a misé.'))

v = {'j': 32, 'a': 4, 'b': 40, 'k': 7, 'c': 11}
JUSTE0 = ['-4', '7', '36', '\\frac{1}{2}', '\\frac{3}{8}', '\\frac{1}{8}']


def remplace(liste, i, valeur):
    copie = list(liste)
    copie[i] = valeur
    return copie


m_specs += [
    spec('32 cartes, mise 4 : -4, 7, 36 ; 1/2, 3/8, 1/8', 0, v, 'correct', JUSTE0),
    spec('Décimaux exacts', 0, v, 'correct', ['-4', '7', '36', '0{,}5', '0{,}375', '0{,}125']),
    spec('Fractions non réduites', 0, v, 'unoptimal_form',
         ['-4', '7', '36', '\\frac{16}{32}', '\\frac{12}{32}', '\\frac{4}{32}'],
         violations=['reducedFractions'] * 3),
    spec('Zéro au lieu de -4', 0, v, 'incorrect', remplace(JUSTE0, 0, '0'), ERR_ZERO),
    spec('4 au lieu de -4', 0, v, 'incorrect', remplace(JUSTE0, 0, '4'), ERR_SIGNE),
    spec('Mise oubliée (figure)', 0, v, 'incorrect', remplace(JUSTE0, 1, '11'), ERR_MISE),
    spec('Mise ajoutée (figure)', 0, v, 'incorrect', remplace(JUSTE0, 1, '15'), ERR_MISE_AJOUTEE),
    spec('Mise oubliée (as)', 0, v, 'incorrect', remplace(JUSTE0, 2, '40'), ERR_MISE),
    spec('Mise ajoutée (as)', 0, v, 'incorrect', remplace(JUSTE0, 2, '44'), ERR_MISE_AJOUTEE),
    spec('Figures oubliées', 0, v, 'incorrect', remplace(JUSTE0, 3, '\\frac{7}{8}'), ERR_AUTRES_FIG),
    spec('As oubliés', 0, v, 'incorrect', remplace(JUSTE0, 3, '\\frac{5}{8}'), ERR_AUTRES_AS),
    spec('Rois oubliés', 0, v, 'incorrect', remplace(JUSTE0, 4, '\\frac{1}{4}'), ERR_ROIS),
    spec('Une sorte de figure', 0, v, 'incorrect', remplace(JUSTE0, 4, '\\frac{1}{8}'), ERR_UNE_FIG),
    spec('Un quart pour un as', 0, v, 'incorrect', remplace(JUSTE0, 5, '\\frac{1}{4}'), ERR_QUART),
    spec('Un seul as', 0, v, 'incorrect', remplace(JUSTE0, 5, '\\frac{1}{32}'), ERR_UN_AS),
]
v52 = {'j': 52, 'a': 3, 'b': 50, 'k': 5, 'c': 8}
m_specs += [
    spec('52 cartes, mise 3 : -3, 5, 47 ; 9/13, 3/13, 1/13', 0, v52, 'correct',
         ['-3', '5', '47', '\\frac{9}{13}', '\\frac{3}{13}', '\\frac{1}{13}']),
    spec('52 cartes, ordre décroissant', 0, v52, 'incorrect',
         ['47', '5', '-3', '\\frac{9}{13}', '\\frac{3}{13}', '\\frac{1}{13}'], ERR_ORDRE),
]

# =============================================================================================
# v1 — Loterie : N = 100 t tickets à p €, 1 lot L1 = 1000 u, n2 lots L2 = 100 w, n3 = 10 z lots
# L3 = 10 y, le reste perdant. Valeurs −p < L3 − p < L2 − p < L1 − p.
# =============================================================================================

ERR_TICKET = ('Le joueur a payé son ticket : retire son prix de ce qu\'il reçoit, même quand il '
              'gagne.')
ERR_PERDANT_ZERO = 'Un ticket perdant fait quand même perdre son prix : le gain algébrique est négatif.'
ERR_GROS_LOT = ('Les tickets perdants sont tous ceux qui ne gagnent rien : enlève aussi le ticket '
                'du gros lot.')
ERR_EFFECTIF = ('C\'est un nombre de tickets : la probabilité s\'obtient en le divisant par le '
                'nombre total de tickets.')
ERR_PERDANTS_EFFECTIF = ('C\'est le nombre de tickets perdants : la probabilité s\'obtient en le '
                         'divisant par le nombre total de tickets.')

m_vars.append(variation(
    'Une association organise une loterie. Elle vend ${{eval:100*t}}$ tickets à ${{p}}$ € l\'un. '
    'Un seul ticket fait gagner ${{eval:1000*u}}$ €, ${{n}}$ tickets font gagner '
    '${{eval:100*w}}$ € chacun, ${{eval:10*z}}$ tickets font gagner ${{eval:10*y}}$ € chacun, et '
    'les autres sont perdants.\n\nUn joueur achète un ticket. On note $X$ son gain algébrique, en '
    'euros (ce qu\'il reçoit moins le prix du ticket). Complète le tableau de la loi de $X$. '
    + CROISSANT + REPONSE + '\n\n'
    '| $x_k$ | $?$ | $?$ | $?$ | $?$ |\n|---|---|---|---|---|\n'
    '| $P(X=x_k)$ | $?$ | $?$ | $?$ | $?$ |',
    [var('t', '20..50'), var('p', '2..5'), var('u', '1..5'), var('n', '5..10'),
     var('w', '5..10'), var('z', '5..10'), var('y', '5..10')],
    [
        case('{{eval:-p}}', [
            erreur('0', ERR_PERDANT_ZERO, 'Zéro pour un ticket perdant'),
            erreur('{{p}}', ERR_SIGNE, 'Prix compté positif'),
            erreur('{{eval:1000*u-p}}', ERR_ORDRE, 'Ordre décroissant'),
        ]),
        case('{{eval:10*y-p}}', [
            erreur('{{eval:10*y}}', ERR_TICKET, 'Prix du ticket oublié'),
            erreur('{{eval:10*y+p}}', ERR_MISE_AJOUTEE, 'Prix ajouté'),
        ]),
        case('{{eval:100*w-p}}', [
            erreur('{{eval:100*w}}', ERR_TICKET, 'Prix du ticket oublié'),
            erreur('{{eval:100*w+p}}', ERR_MISE_AJOUTEE, 'Prix ajouté'),
        ]),
        case('{{eval:1000*u-p}}', [
            erreur('{{eval:1000*u}}', ERR_TICKET, 'Prix du ticket oublié'),
            erreur('{{eval:1000*u+p}}', ERR_MISE_AJOUTEE, 'Prix ajouté'),
            erreur('{{eval:-p}}', ERR_ORDRE, 'Ordre décroissant'),
        ]),
        case('{{eval:(100*t-1-n-10*z)/(100*t)}}', [
            erreur('{{eval:(100*t-n-10*z)/(100*t)}}', ERR_GROS_LOT, 'Gros lot oublié'),
            erreur('{{eval:100*t-1-n-10*z}}', ERR_PERDANTS_EFFECTIF, 'Effectif des perdants'),
        ]),
        case('{{eval:10*z/(100*t)}}', [
            erreur('{{eval:10*z}}', ERR_EFFECTIF, 'Effectif au lieu de probabilité'),
        ]),
        case('{{eval:n/(100*t)}}', [
            erreur('{{n}}', ERR_EFFECTIF, 'Effectif au lieu de probabilité'),
        ]),
        case('{{eval:1/(100*t)}}', [
            erreur('1', ERR_EFFECTIF, 'Effectif au lieu de probabilité'),
        ]),
    ],
    ['Le joueur a payé ${{p}}$ € : les valeurs de $X$ sont $-{{p}}$ (ticket perdant), '
     '${{eval:10*y-p}}$, ${{eval:100*w-p}}$ et ${{eval:1000*u-p}}$.',
     'Il y a $1+{{n}}+{{eval:10*z}}={{eval:1+n+10*z}}$ tickets gagnants, donc '
     '${{eval:100*t}}-{{eval:1+n+10*z}}={{eval:100*t-1-n-10*z}}$ tickets perdants, tous tirés avec '
     'la même probabilité.',
     '$P(X=-{{p}})=\\dfrac{ {{eval:100*t-1-n-10*z}} }{ {{eval:100*t}} }=' + PRIMAIRE
     + '{ {{eval:(100*t-1-n-10*z)/(100*t)}} }$, $P(X={{eval:10*y-p}})=\\dfrac{ {{eval:10*z}} }'
     '{ {{eval:100*t}} }=' + PRIMAIRE + '{ {{eval:10*z/(100*t)}} }$, $P(X={{eval:100*w-p}})='
     '\\dfrac{ {{n}} }{ {{eval:100*t}} }=' + PRIMAIRE + '{ {{eval:n/(100*t)}} }$ et '
     '$P(X={{eval:1000*u-p}})=' + PRIMAIRE + '{ {{eval:1/(100*t)}} }$.'],
    'Le joueur paie son ticket dans tous les cas, même s\'il gagne.',
    ['1000*u > 100*w']))

v = {'t': 25, 'p': 2, 'u': 3, 'n': 6, 'w': 8, 'z': 5, 'y': 6}
# 2 500 tickets ; perdants 2 500 − 1 − 6 − 50 = 2 443
JUSTE1 = ['-2', '58', '798', '2998', '\\frac{2443}{2500}', '\\frac{1}{50}', '\\frac{3}{1250}',
          '\\frac{1}{2500}']
m_specs += [
    spec('2 500 tickets à 2 €', 1, v, 'correct', JUSTE1),
    spec('Décimaux exacts', 1, v, 'correct',
         ['-2', '58', '798', '2998', '0{,}9772', '0{,}02', '0{,}0024', '0{,}0004']),
    spec('Fractions non réduites', 1, v, 'unoptimal_form',
         remplace(remplace(JUSTE1, 5, '\\frac{50}{2500}'), 6, '\\frac{6}{2500}'),
         violations=['reducedFractions'] * 2),
    spec('Zéro pour un ticket perdant', 1, v, 'incorrect', remplace(JUSTE1, 0, '0'),
         ERR_PERDANT_ZERO),
    spec('Prix positif', 1, v, 'incorrect', remplace(JUSTE1, 0, '2'), ERR_SIGNE),
    spec('Prix oublié (petit lot)', 1, v, 'incorrect', remplace(JUSTE1, 1, '60'), ERR_TICKET),
    spec('Prix ajouté (petit lot)', 1, v, 'incorrect', remplace(JUSTE1, 1, '62'), ERR_MISE_AJOUTEE),
    spec('Prix oublié (lot moyen)', 1, v, 'incorrect', remplace(JUSTE1, 2, '800'), ERR_TICKET),
    spec('Prix ajouté (lot moyen)', 1, v, 'incorrect', remplace(JUSTE1, 2, '802'), ERR_MISE_AJOUTEE),
    spec('Prix oublié (gros lot)', 1, v, 'incorrect', remplace(JUSTE1, 3, '3000'), ERR_TICKET),
    spec('Prix ajouté (gros lot)', 1, v, 'incorrect', remplace(JUSTE1, 3, '3002'), ERR_MISE_AJOUTEE),
    spec('Gros lot oublié dans les perdants', 1, v, 'incorrect',
         remplace(JUSTE1, 4, '\\frac{2444}{2500}'), ERR_GROS_LOT),
    spec('Effectif des perdants', 1, v, 'incorrect', remplace(JUSTE1, 4, '2443'),
         ERR_PERDANTS_EFFECTIF),
    spec('Effectif (petits lots)', 1, v, 'incorrect', remplace(JUSTE1, 5, '50'), ERR_EFFECTIF),
    spec('Effectif (lots moyens)', 1, v, 'incorrect', remplace(JUSTE1, 6, '6'), ERR_EFFECTIF),
    spec('Effectif (gros lot)', 1, v, 'incorrect', remplace(JUSTE1, 7, '1'), ERR_EFFECTIF),
    spec('Ordre décroissant', 1, v, 'incorrect',
         ['2998', '798', '58', '-2'] + JUSTE1[4:], ERR_ORDRE),
]

# =============================================================================================
# v2 — Deux tirs au but indépendants, probabilité a/b de marquer ; X = nombre de buts.
# P(X=0) = (b−a)²/b², P(X=1) = 2a(b−a)/b², P(X=2) = a²/b².
# =============================================================================================

ERR_UN_TIR = ('Il y a deux tirs : « aucun but » veut dire manquer le premier **et** le second, '
              'les probabilités se multiplient.')
ERR_CONTRAIRE_2 = ('$1-P(X=2)$ est la probabilité de marquer au plus un but, pas celle de n\'en '
                   'marquer aucun.')
ERR_UN_CHEMIN = ('Deux chemins de l\'arbre donnent exactement un but : marquer puis manquer, ou '
                 'manquer puis marquer.')
ERR_SOMME = 'Pour deux tirs successifs, les probabilités le long d\'un chemin se **multiplient**.'
ERR_UN_TIR_2 = ('C\'est la probabilité de marquer sur **un** tir : pour deux buts, il faut marquer '
                'au premier et au second tir.')

m_vars.append(variation(
    'Une joueuse de handball a remarqué que, lorsqu\'elle tire au but, elle a ${{a}}$ '
    '{{if:a == 1|chance|chances}} sur ${{b}}$ de marquer. Elle tire deux fois, et les deux tirs '
    'sont indépendants.\n\nOn note $X$ le nombre de buts marqués au cours des deux tirs. Complète '
    'le tableau de la loi de $X$. ' + REPONSE + '\n\n'
    '| $x_k$ | $0$ | $1$ | $2$ |\n|---|---|---|---|\n'
    '| $P(X=x_k)$ | $?$ | $?$ | $?$ |',
    [var('b', '3..9'), var('a', '1..8')],
    [
        case('{{eval:(b-a)^2/b^2}}', [
            erreur('{{eval:(b-a)/b}}', ERR_UN_TIR, 'Un seul tir'),
            erreur('{{eval:1-a^2/b^2}}', ERR_CONTRAIRE_2, 'Contraire de X = 2'),
        ]),
        case('{{eval:2*a*(b-a)/b^2}}', [
            erreur('{{eval:a*(b-a)/b^2}}', ERR_UN_CHEMIN, 'Un seul chemin'),
        ]),
        case('{{eval:a^2/b^2}}', [
            erreur('{{eval:2*a/b}}', ERR_SOMME, 'Somme au lieu du produit'),
            erreur('{{eval:a/b}}', ERR_UN_TIR_2, 'Un seul tir'),
        ]),
    ],
    ['On note $M$ l\'évènement « la joueuse marque ». À chaque tir, $P(M)=\\dfrac{ {{a}} }{ {{b}} }$ '
     'et $P(\\overline{M})=\\dfrac{ {{eval:b-a}} }{ {{b}} }$ ; les tirs sont indépendants, donc on '
     'multiplie le long des chemins de l\'arbre.',
     '$P(X=0)=\\dfrac{ {{eval:b-a}} }{ {{b}} }\\times\\dfrac{ {{eval:b-a}} }{ {{b}} }=' + PRIMAIRE
     + '{ {{eval:(b-a)^2/b^2}} }$ et $P(X=2)=\\dfrac{ {{a}} }{ {{b}} }\\times\\dfrac{ {{a}} }'
     '{ {{b}} }=' + PRIMAIRE + '{ {{eval:a^2/b^2}} }$.',
     'Deux chemins donnent un but : $P(X=1)=2\\times\\dfrac{ {{a}} }{ {{b}} }\\times\\dfrac{ '
     '{{eval:b-a}} }{ {{b}} }=' + PRIMAIRE + '{ {{eval:2*a*(b-a)/b^2}} }$.'],
    'Dessine l\'arbre des deux tirs : combien de chemins donnent exactement un but ?',
    ['a < b', 'gcd(a, b) = 1', '2*a != b']))

v = {'b': 5, 'a': 2}
JUSTE2 = ['\\frac{9}{25}', '\\frac{12}{25}', '\\frac{4}{25}']
m_specs += [
    spec('2 chances sur 5 : 9/25, 12/25, 4/25', 2, v, 'correct', JUSTE2),
    spec('Décimaux exacts', 2, v, 'correct', ['0{,}36', '0{,}48', '0{,}16']),
    spec('Un seul tir (aucun but)', 2, v, 'incorrect', remplace(JUSTE2, 0, '\\frac{3}{5}'),
         ERR_UN_TIR),
    spec('Contraire de X = 2', 2, v, 'incorrect', remplace(JUSTE2, 0, '\\frac{21}{25}'),
         ERR_CONTRAIRE_2),
    spec('Un seul chemin', 2, v, 'incorrect', remplace(JUSTE2, 1, '\\frac{6}{25}'), ERR_UN_CHEMIN),
    spec('Somme au lieu du produit', 2, v, 'incorrect', remplace(JUSTE2, 2, '\\frac{4}{5}'),
         ERR_SOMME),
    spec('Un seul tir (deux buts)', 2, v, 'incorrect', remplace(JUSTE2, 2, '\\frac{2}{5}'),
         ERR_UN_TIR_2),
]

ecrire('f1-loi-de-x-tableau-a-completer', {
    'rangement': {'noeud': 'Probabilités > Variables aléatoires > loi d\'une variable aléatoire',
                  'point': '1SPE-355'},
    'title': 'Déterminer la loi de X : tableau à compléter',
    'description': 'À partir d\'un énoncé (pari aux cartes, loterie, deux tirs indépendants), '
                   'compléter le tableau de la loi de X : valeurs et probabilités.',
    'grades': ['1_SPE', '1_TECHNO'], 'level': 2, 'delay': 240, 'status': 'draft',
    'shared': {'blankDefaults': {'acceptDecimal': True}},
    'options': {'constraints': {'spaces': 'off'}},
    'variations': m_vars, 'testSpecs': m_specs,
})
