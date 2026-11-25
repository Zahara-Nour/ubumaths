"""Écrit les modèles neufs du chantier idees-6e-proportionnalite dans scripts/questions/idees-6e-proportionnalite-neufs/.

Phase 0 validée par David le 2026-11-25 (journal docs/wip/idees-6e-proportionnalite-progress.md) :
N1 à N5. On reprend l'idée de l'autre plateforme, pas sa forme ni son texte : retour à l'unité,
linéarité additive, tableau à compléter sans la valeur pour 1, grandeurs d'une situation, et
« peut-on le calculer ? » (situations proportionnelles ou non).

Programme de 6e (bornes cycle 3, clé « 6 ») : linéarité multiplicative ou additive, retour à
l'unité, JAMAIS de produit en croix (ni énoncé, ni corrigé) ; tableau avec le nom ET l'unité de
chaque grandeur ; décimaux simples (au plus 2 décimales).

Ni theme, ni domain, ni subdomain, ni id : le rangement (nœud du point + tag) se fera par migration,
après la création en brouillon. Points visés : N1, N2 → 6-191 (quatrième proportionnelle),
N3 → 6-192 (tableau), N4 → 6-189 et N5 → 6-190 (caractérisation). Niveaux : N1 4, N2 5, N3 6,
N4 8, N5 9 (fiche de phase 0), à relever de nouveau avant la migration de rangement.

Choix d'écriture :
- prix tirés en DIXIÈMES d'euro (entiers), affichés par `;d` : pas de flottants ; prix unitaire
  entre 1,10 € et 3,50 €, jamais entier (`mod(p,10)!=0`), donc jamais 1 € (sinon l'erreur
  « ajouter la quantité au prix » tomberait sur la bonne réponse) ;
- `zeros: off` sur N1, N2, N3 : « 8,50 € » est l'écriture ordinaire d'un prix ;
- N1 (achat, recette, sirop) : la réponse porte son unité (`unit.expected`, comme le modèle
  publié e0ccaf84), et la consigne le dit ; N1 tableau, N2, N3 : nombre seul (l'unité est dans
  l'en-tête du tableau ou écrite après la case) ;
- N3 moyen : x pair dans {4, 8, 10} (et non 2..7) pour que x/2 et |x − y| ne valent jamais 1
  (la fiche interdit de donner la valeur pour 1, et une colonne « 1 » calculée la donnerait) ;
  le facteur 3 ou 5 porte sur y, le petit nombre impair ;
- N5 : chaque choix commence par « Oui : … » ou « Non : on ne peut pas le calculer », la question
  est « Peut-on calculer… ? » ; la moitié des tirages de la variation 1 sont proportionnels ; en
  variation 2, l'âge du père n'est pas proportionnel mais se CALCULE (l'écart reste le même) :
  la bonne réponse est alors la valeur additive, pas « on ne peut pas ».

Règles suivies (couvrir-un-niveau.md § 5) : erreurs prévues par case d'écriture ordinaire (de
vraies erreurs d'élèves, sans en inventer pour atteindre trois), chacune avec sa spec `incorrect`
qui nomme son message ; un coup de pouce par variation, qui ne donne jamais la réponse. Les
choix et le geste « associer » n'ont pas d'erreurs prévues.

Réponses du geste « associer » (N4, variation 2) : positions AFFICHÉES, lues par
scripts/questions/ranger-attendus.ts.

Usage : python3 docs/wip/questions/idees-6e-proportionnalite-neufs.py scripts/questions/idees-6e-proportionnalite-neufs
"""
import json
import os
import sys

DOSSIER = sys.argv[1]

PRIMAIRE = '\\textcolor{{{color:primary.0}}}'
SECOND = '\\textcolor{{{color:primary.1}}}'
ZEROS_LIBRES = {'constraints': {'zeros': 'off'}}
QUATRIEME = {'noeud': 'Proportionnalité > Situations de proportionnalité > quatrième proportionnelle',
             'point': '6-191'}
TABLEAU = {'noeud': 'Proportionnalité > Situations de proportionnalité > quatrième proportionnelle',
           'point': '6-192'}
GRANDEURS = {'noeud': 'Proportionnalité > Situations de proportionnalité > caractérisation',
             'point': '6-189'}
CALCULABLE = {'noeud': 'Proportionnalité > Situations de proportionnalité > caractérisation',
              'point': '6-190'}


def spec(desc, vi, variables_, status, answers, message=None, violations=None):
    expected = {'status': status}
    if message is not None:
        expected['expectedErrorMessage'] = message
    if violations is not None:
        expected['constraintViolations'] = violations
    return {'description': desc, 'variationIndex': vi, 'variables': variables_,
            'expected': expected, 'answers': answers}


def modele(title, description, level, delay, variations, specs, options=None, grades=None,
           rangement=None):
    m = {'rangement': rangement, 'title': title, 'description': description, 'grades': grades or ['6'], 'level': level,
         'delay': delay, 'status': 'draft'}
    if options:
        m['options'] = options
    m['variations'] = variations
    m['testSpecs'] = specs
    return m


def var(nom, expression):
    return {'name': nom, 'expression': expression}


def erreur(answer, message, label):
    return {'answer': answer, 'message': message, 'label': label}


def case(attendue, erreurs=None, unite=False):
    c = {'expectedAnswer': attendue}
    if unite:
        c['unit'] = {'expected': True}
    if erreurs:
        c['expectedErrors'] = erreurs
    return c


def variation(statement, variables, blanks, steps, hint, conditions=None):
    v = {'statement': statement, 'variables': variables, 'conditions': conditions or []}
    if blanks is not None:
        v['blanks'] = blanks
    v['correction'] = {'steps': steps}
    v['hint'] = hint
    return v


def couleur(contenu, c=PRIMAIRE):
    return c + '{' + contenu + '}'


def ctexte(contenu):
    """Texte coloré, dans sa formule."""
    return '$' + couleur('\\text{' + contenu + '}') + '$'


def bloc(nom, *lignes):
    return '```' + nom + '\n' + '\n'.join(lignes) + '\n```'


def selon(v, textes):
    """Texte choisi par la variable v (0, 1, 2…) : `{{if:}}` imbriqués."""
    texte = textes[-1]
    for k in range(len(textes) - 2, -1, -1):
        texte = '{{if:' + v + '==' + str(k) + '|' + textes[k] + '|' + texte + '}}'
    return texte


def d(expr):
    """Nombre calculé, écrit en décimal."""
    return '{{eval:' + expr + ';d}}'


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


# =============================================================================================
# N1 — 6-191 : retour à l'unité. n et m de 2 à 13, ni l'un multiple de l'autre ; on divise par n
# (valeur pour 1), puis on multiplie par m.
# =============================================================================================

N1_COND = ['mod(m,n)!=0', 'mod(n,m)!=0']
ECART_N1 = ('Quand la quantité change de ${{eval:abs(m-n)}}$, le résultat ne change pas de '
            '${{eval:abs(m-n)}}$ : passe par la valeur pour $1$.')


def n1_erreurs(un, total, unite):
    """Valeur pour 1, écart ajouté, oubli de la division par n (un : valeur pour 1, en dixièmes
    ou en unités selon le contexte ; total : valeur pour n)."""
    return [
        erreur('{{eval:(' + un + ')[' + unite + ']}}',
               'C\'est la valeur pour $1$ : il reste à la multiplier par ${{m}}$.',
               'Valeur pour 1 seulement'),
        erreur('{{eval:(' + total + '+m-n)[' + unite + ']}}', ECART_N1,
               'Écart des quantités ajouté au résultat'),
        erreur('{{eval:(' + total + '*m)[' + unite + ']}}',
               'Tu as multiplié la valeur pour ${{n}}$ par ${{m}}$ : c\'est la valeur pour '
               '${{n}} \\times {{m}}$. Divise d\'abord par ${{n}}$.',
               'Oubli de la division par n'),
    ]


OBJETS = ['croissant', 'cahier', 'stylo']
OBJETS_PL = ['croissants', 'cahiers', 'stylos']
OBJ = selon('o', OBJETS)
OBJS = selon('o', OBJETS_PL)

N1_ACHAT = variation(
    'Tous les ' + OBJS + ' ont le même prix. ${{n}}$ ' + OBJS + ' coûtent ${{eval:n*p/10;d}}~'
    '\\unit{€}$.\n\nCombien coûtent ${{m}}$ ' + OBJS + ' ? Écris l\'unité dans ta réponse.\n\n'
    '${{m}}$ ' + OBJS + ' coûtent $?$.',
    [var('o', '0..2'), var('n', '2..13'), var('m', '2..13'), var('p', '11..35')],
    [case('{{eval:(m*p/10)[€]}}', n1_erreurs('p/10', 'n*p/10', '€'), unite=True)],
    [
        '**Retour à l\'unité.** On cherche d\'abord le prix d\'un ' + OBJ + ' : $'
        + d('n*p/10') + ' \\div {{n}} = ' + d('p/10') + '$. Un ' + OBJ + ' coûte $'
        + d('p/10') + '~\\unit{€}$.',
        'Puis on multiplie par ${{m}}$ : $' + d('p/10') + ' \\times {{m}} = '
        + couleur(d('m*p/10') + '~\\unit{€}') + '$.',
    ],
    'Combien coûte un seul ' + OBJ + ' ?',
    N1_COND + ['mod(p,10)!=0'],
)

INGR = selon('i', ['farine', 'sucre', 'beurre'])
N1_RECETTE = variation(
    'Pour ${{n}}$ personnes, une recette demande ${{eval:n*g}}~\\unit{g}$ de ' + INGR + '.\n\n'
    'Quelle masse de ' + INGR + ' faut-il pour ${{m}}$ personnes ? Écris l\'unité dans ta '
    'réponse.\n\nPour ${{m}}$ personnes, il faut $?$ de ' + INGR + '.',
    [var('i', '0..2'), var('n', '2..10'), var('m', '2..10'), var('g', '20|25|30|35|40|45|50|60|70|80')],
    [case('{{eval:(m*g)[g]}}', n1_erreurs('g', 'n*g', 'g'), unite=True)],
    [
        '**Retour à l\'unité.** On cherche d\'abord la masse pour une personne : ${{eval:n*g}} '
        '\\div {{n}} = {{g}}$. Il faut ${{g}}~\\unit{g}$ de ' + INGR + ' par personne.',
        'Puis on multiplie par ${{m}}$ : ${{g}} \\times {{m}} = '
        + couleur('{{eval:m*g}}~\\unit{g}') + '$.',
    ],
    'Quelle masse de ' + INGR + ' faut-il pour une seule personne ?',
    N1_COND,
)

N1_SIROP = variation(
    'Pour préparer une boisson, Hugo mélange ${{eval:n*h/2;d}}~\\unit{cL}$ de sirop avec '
    '${{n}}~\\unit{L}$ d\'eau.\n\nQuelle quantité de sirop doit-il verser dans ${{m}}~\\unit{L}$ '
    'd\'eau pour que la boisson ait le même goût ? Écris l\'unité dans ta réponse.\n\n'
    'Il faut $?$ de sirop.',
    [var('n', '2..9'), var('m', '2..9'), var('h', '5..20')],
    [case('{{eval:(m*h/2)[cL]}}', n1_erreurs('h/2', 'n*h/2', 'cL'), unite=True)],
    [
        '**Retour à l\'unité.** On cherche d\'abord le sirop pour $1~\\unit{L}$ d\'eau : $'
        + d('n*h/2') + ' \\div {{n}} = ' + d('h/2') + '$. Il faut $' + d('h/2')
        + '~\\unit{cL}$ de sirop par litre d\'eau.',
        'Puis on multiplie par ${{m}}$ : $' + d('h/2') + ' \\times {{m}} = '
        + couleur(d('m*h/2') + '~\\unit{cL}') + '$.',
    ],
    'Combien de sirop faut-il pour $1~\\unit{L}$ d\'eau ?',
    N1_COND,
)

N1_TABLEAU = variation(
    'Tous les cahiers ont le même prix. Complète le tableau en passant par le prix d\'un '
    'cahier.\n\n'
    '| Nombre de cahiers | ${{n}}$ | $1$ | ${{m}}$ |\n|---|---|---|---|\n'
    '| Prix (€) | ${{eval:n*p/10;d}}$ | $?$ | $?$ |',
    [var('n', '2..13'), var('m', '2..13'), var('p', '11..35')],
    [
        case(d('p/10'), [
            erreur(d('n*n*p/10'), 'Tu as multiplié par ${{n}}$ : pour passer de ${{n}}$ cahiers '
                   'à $1$ cahier, on divise par ${{n}}$.', 'Multiplication au lieu de division'),
            erreur(d('n*p/10-n+1'), 'Enlever ${{eval:n-1}}$ cahiers n\'enlève pas '
                   '${{eval:n-1}}~\\unit{€}$ : on divise le prix par ${{n}}$.',
                   'Écart des quantités retiré du prix'),
        ]),
        case(d('m*p/10'), [
            erreur(d('n*p*m/10'), 'Tu as multiplié le prix de ${{n}}$ cahiers par ${{m}}$ : '
                   'pars du prix d\'un cahier.', 'Prix de n multiplié par m'),
            erreur(d('n*p/10+m-n'), ECART_N1, 'Écart des quantités ajouté au prix'),
        ]),
    ],
    [
        '**Retour à l\'unité.** De ${{n}}$ cahiers à $1$ cahier, on divise par ${{n}}$ : $'
        + d('n*p/10') + ' \\div {{n}} = ' + couleur(d('p/10')) + '$. Un cahier coûte $'
        + d('p/10') + '~\\unit{€}$.',
        'De $1$ cahier à ${{m}}$ cahiers, on multiplie par ${{m}}$ : $' + d('p/10')
        + ' \\times {{m}} = ' + couleur(d('m*p/10')) + '$.',
        '| Nombre de cahiers | ${{n}}$ | $1$ | ${{m}}$ |\n|---|---|---|---|\n'
        '| Prix (€) | $' + d('n*p/10') + '$ | $' + couleur(d('p/10')) + '$ | $'
        + couleur(d('m*p/10')) + '$ |',
    ],
    'Pour passer de ${{n}}$ cahiers à $1$ cahier, que fait-on au nombre de cahiers ? Fais de même '
    'au prix.',
    N1_COND + ['mod(p,10)!=0'],
)

V_N1 = {'o': '0', 'n': '3', 'm': '7', 'p': '15'}
V_N1r = {'i': '0', 'n': '4', 'm': '6', 'g': '50'}
V_N1s = {'n': '3', 'm': '5', 'h': '7'}
V_N1t = {'n': '4', 'm': '7', 'p': '15'}
SPECS_N1 = [
    spec('Achat : 3 pour 4,50 € → 7 pour 10,50 €', 0, V_N1, 'correct', ['10{,}5\\,€']),
    spec('Achat : 10,50 € accepté', 0, V_N1, 'correct', ['10{,}50\\,€']),
    spec('Achat : sans unité refusé', 0, V_N1, 'incorrect', ['10{,}5']),
    spec('Achat : prix d\'un seul (1,50 €)', 0, V_N1, 'incorrect', ['1{,}5\\,€'],
         'C\'est la valeur pour $1$ : il reste à la multiplier par $7$.'),
    spec('Achat : écart ajouté (8,50 €)', 0, V_N1, 'incorrect', ['8{,}5\\,€'],
         'Quand la quantité change de $4$, le résultat ne change pas de $4$ : passe par la '
         'valeur pour $1$.'),
    spec('Achat : 4,50 × 7 (31,50 €)', 0, V_N1, 'incorrect', ['31{,}5\\,€'],
         'Tu as multiplié la valeur pour $3$ par $7$ : c\'est la valeur pour $3 \\times 7$. '
         'Divise d\'abord par $3$.'),
    spec('Achat : 9 pour 20,70 € → 4 pour 9,20 €', 0, {'o': '1', 'n': '9', 'm': '4', 'p': '23'},
         'correct', ['9{,}2\\,€']),
    spec('Recette : 4 pour 200 g → 6 pour 300 g', 1, V_N1r, 'correct', ['300\\,\\mathrm{g}']),
    spec('Recette : 0,3 kg accepté', 1, V_N1r, 'correct', ['0{,}3\\,\\mathrm{kg}']),
    spec('Recette : pour une personne (50 g)', 1, V_N1r, 'incorrect', ['50\\,\\mathrm{g}'],
         'C\'est la valeur pour $1$ : il reste à la multiplier par $6$.'),
    spec('Recette : écart ajouté (202 g)', 1, V_N1r, 'incorrect', ['202\\,\\mathrm{g}'],
         'Quand la quantité change de $2$, le résultat ne change pas de $2$ : passe par la '
         'valeur pour $1$.'),
    spec('Recette : 200 × 6 (1 200 g)', 1, V_N1r, 'incorrect', ['1\\,200\\,\\mathrm{g}'],
         'Tu as multiplié la valeur pour $4$ par $6$ : c\'est la valeur pour $4 \\times 6$. '
         'Divise d\'abord par $4$.'),
    spec('Sirop : 10,5 cL pour 3 L → 17,5 cL pour 5 L', 2, V_N1s, 'correct',
         ['17{,}5\\,\\mathrm{cL}']),
    spec('Sirop : 175 mL accepté', 2, V_N1s, 'correct', ['175\\,\\mathrm{mL}']),
    spec('Sirop : pour 1 L (3,5 cL)', 2, V_N1s, 'incorrect', ['3{,}5\\,\\mathrm{cL}'],
         'C\'est la valeur pour $1$ : il reste à la multiplier par $5$.'),
    spec('Sirop : écart ajouté (12,5 cL)', 2, V_N1s, 'incorrect', ['12{,}5\\,\\mathrm{cL}'],
         'Quand la quantité change de $2$, le résultat ne change pas de $2$ : passe par la '
         'valeur pour $1$.'),
    spec('Sirop : 10,5 × 5 (52,5 cL)', 2, V_N1s, 'incorrect', ['52{,}5\\,\\mathrm{cL}'],
         'Tu as multiplié la valeur pour $3$ par $5$ : c\'est la valeur pour $3 \\times 5$. '
         'Divise d\'abord par $3$.'),
    spec('Tableau : 4 pour 6 € → 1,50 € et 10,50 €', 3, V_N1t, 'correct', ['1{,}5', '10{,}5']),
    spec('Tableau : 1,50 et 10,50 acceptés', 3, V_N1t, 'correct', ['1{,}50', '10{,}50']),
    spec('Tableau : × 4 au lieu de ÷ 4 (24)', 3, V_N1t, 'incorrect', ['24', '10{,}5'],
         'Tu as multiplié par $4$ : pour passer de $4$ cahiers à $1$ cahier, on divise par $4$.'),
    spec('Tableau : 3 € retirés (3)', 3, V_N1t, 'incorrect', ['3', '10{,}5'],
         'Enlever $3$ cahiers n\'enlève pas $3~\\unit{€}$ : on divise le prix par $4$.'),
    spec('Tableau : 6 × 7 (42)', 3, V_N1t, 'incorrect', ['1{,}5', '42'],
         'Tu as multiplié le prix de $4$ cahiers par $7$ : pars du prix d\'un cahier.'),
    spec('Tableau : écart ajouté (9)', 3, V_N1t, 'incorrect', ['1{,}5', '9'],
         'Quand la quantité change de $3$, le résultat ne change pas de $3$ : passe par la '
         'valeur pour $1$.'),
]

N1 = modele(
    'Résoudre un problème par le retour à l\'unité',
    'Trouver la valeur pour m connaissant la valeur pour n (n et m de 2 à 13, ni l\'un multiple '
    'de l\'autre) en passant par la valeur pour 1 : achat, recette, sirop dans l\'eau (réponse '
    'avec son unité), puis tableau n, 1, m ; pièges : valeur pour 1 seulement, écart ajouté, '
    'oubli de la division',
    4, 60, [N1_ACHAT, N1_RECETTE, N1_SIROP, N1_TABLEAU], SPECS_N1, ZEROS_LIBRES,
    rangement=QUATRIEME)


# =============================================================================================
# N2 — 6-191 : linéarité additive. n1 → P1, n2 → P2 (n1, n2 de 2 à 9, ni l'un multiple de
# l'autre) ; prix unitaire en dixièmes d'euro, de 1,10 à 3,50 €, jamais entier.
# =============================================================================================

P1 = d('n1*p/10')
P2 = d('n2*p/10')
N2_VARS = [var('n1', '2..9'), var('n2', '2..9'), var('p', '11..35')]
N2_COND = ['mod(n1,n2)!=0', 'mod(n2,n1)!=0', 'mod(p,10)!=0']


def n2_donnees(objets):
    return ('Tous les ' + objets + ' ont le même prix. ${{n1}}$ ' + objets + ' coûtent $' + P1
            + '~\\unit{€}$ et ${{n2}}$ ' + objets + ' coûtent $' + P2 + '~\\unit{€}$.')


N2_SOMME = variation(
    n2_donnees('cahiers') + '\n\nCombien coûtent ${{eval:n1+n2}}$ cahiers ?\n\n$$?~\\text{€}$$',
    N2_VARS,
    [case(d('(n1+n2)*p/10'), [
        erreur(d('n2*p/10+n1'), 'Tu as ajouté ${{n1}}~\\unit{€}$ : ${{n1}}$ cahiers de plus '
               'coûtent $' + P1 + '~\\unit{€}$ de plus.', 'Quantité ajoutée au prix'),
        erreur(d('abs(n2-n1)*p/10'), 'Tu as fait la différence des prix : c\'est le prix de '
               '${{eval:abs(n2-n1)}}$ cahiers. Pour ${{eval:n1+n2}}$ cahiers, additionne.',
               'Différence au lieu de somme'),
        erreur(d('n1*n2*p/10'), 'Tu as multiplié le prix de ${{n1}}$ cahiers par ${{n2}}$ : '
               'c\'est le prix de ${{eval:n1*n2}}$ cahiers.', 'Prix multiplié par la quantité'),
    ])],
    [
        '**Additionner deux lignes.** ${{eval:n1+n2}} = {{n1}} + {{n2}}$ : ${{eval:n1+n2}}$ '
        'cahiers, c\'est ${{n1}}$ cahiers et encore ${{n2}}$ cahiers.',
        'On additionne leurs prix : $' + P1 + ' + ' + P2 + ' = '
        + couleur(d('(n1+n2)*p/10') + '~\\unit{€}') + '$.',
    ],
    'Écris ${{eval:n1+n2}}$ à l\'aide des deux quantités de l\'énoncé.',
    N2_COND,
)

N2_DIFF = variation(
    n2_donnees('bouteilles de jus') + '\n\nCombien coûtent ${{eval:n1-n2}}$ bouteilles de jus ?'
    '\n\n$$?~\\text{€}$$',
    N2_VARS,
    [case(d('(n1-n2)*p/10'), [
        erreur(d('(n1+n2)*p/10'), 'Tu as additionné les prix : c\'est le prix de '
               '${{eval:n1+n2}}$ bouteilles. Pour ${{eval:n1-n2}}$ bouteilles, soustrais.',
               'Somme au lieu de différence'),
        erreur(d('n1*p/10-n2'), 'Tu as enlevé ${{n2}}~\\unit{€}$ : ${{n2}}$ bouteilles de moins '
               'coûtent $' + P2 + '~\\unit{€}$ de moins.', 'Quantité retirée du prix'),
    ])],
    [
        '**Soustraire deux lignes.** ${{eval:n1-n2}} = {{n1}} - {{n2}}$ : ${{eval:n1-n2}}$ '
        'bouteilles, c\'est ${{n1}}$ bouteilles moins ${{n2}}$ bouteilles.',
        'On soustrait leurs prix : $' + P1 + ' - ' + P2 + ' = '
        + couleur(d('(n1-n2)*p/10') + '~\\unit{€}') + '$.',
    ],
    'Écris ${{eval:n1-n2}}$ à l\'aide des deux quantités de l\'énoncé.',
    N2_COND + ['n1>n2'],
)

PN = d('n*p/10')
N2_DEMI = variation(
    'Tous les paquets de gâteaux ont le même prix. ${{n}}$ paquets coûtent $' + PN
    + '~\\unit{€}$.\n\nCombien coûtent ${{eval:3*n/2}}$ paquets ?\n\n$$?~\\text{€}$$',
    [var('n', '4|6|8'), var('p', '11..35')],
    [case(d('3*n*p/20'), [
        erreur(d('n*p/20'), 'C\'est le prix de ${{eval:n/2}}$ paquets : il faut aussi ajouter '
               'le prix des ${{n}}$ premiers.', 'Moitié seulement'),
        erreur(d('n*p/10+n/2'), 'Tu as ajouté ${{eval:n/2}}~\\unit{€}$ : ${{eval:n/2}}$ paquets '
               'de plus coûtent la moitié de $' + PN + '~\\unit{€}$ de plus.',
               'Quantité ajoutée au prix'),
        erreur(d('3*n*n*p/20'), 'Tu as multiplié le prix de ${{n}}$ paquets par '
               '${{eval:3*n/2}}$ : c\'est le prix de ${{n}} \\times {{eval:3*n/2}}$ paquets.',
               'Prix multiplié par la quantité'),
    ])],
    [
        '**Une fois et demie.** ${{eval:3*n/2}} = {{n}} + {{eval:n/2}}$, et ${{eval:n/2}}$ est la '
        'moitié de ${{n}}$ : ${{eval:n/2}}$ paquets coûtent la moitié de $' + PN
        + '~\\unit{€}$, soit $' + d('n*p/20') + '~\\unit{€}$.',
        'On additionne : $' + PN + ' + ' + d('n*p/20') + ' = '
        + couleur(d('3*n*p/20') + '~\\unit{€}') + '$.',
    ],
    'Écris ${{eval:3*n/2}}$ comme ${{n}}$ plus un autre nombre : lequel ?',
    ['mod(p,10)!=0'],
)

N2_INVERSE = variation(
    n2_donnees('cahiers') + '\n\nCombien de cahiers peut-on acheter avec $'
    + d('(n1+n2)*p/10') + '~\\unit{€}$ ?\n\n$$?~\\text{ cahiers}$$',
    N2_VARS,
    [case('{{eval:n1+n2}}', [
        erreur('{{eval:abs(n1-n2)}}', 'Tu as fait la différence des quantités : regarde comment '
               'obtenir $' + d('(n1+n2)*p/10') + '$ à partir des deux prix.',
               'Différence des quantités'),
        erreur('{{eval:n1*n2}}', 'Tu as multiplié les quantités : regarde comment obtenir $'
               + d('(n1+n2)*p/10') + '$ à partir des deux prix.', 'Produit des quantités'),
        erreur(d('(n1+n2)*p/10'), 'C\'est la somme dont on dispose, en euros : la question '
               'demande un nombre de cahiers.', 'Prix recopié'),
    ])],
    [
        '**Additionner deux lignes.** $' + P1 + ' + ' + P2 + ' = ' + d('(n1+n2)*p/10')
        + '$ : avec $' + d('(n1+n2)*p/10') + '~\\unit{€}$, on paie ${{n1}}$ cahiers et encore '
        '${{n2}}$ cahiers.',
        'On peut donc acheter ${{n1}} + {{n2}} = ' + couleur('{{eval:n1+n2}}') + '$ cahiers.',
    ],
    'Compare la somme dont on dispose aux deux prix de l\'énoncé.',
    N2_COND,
)

V_N2 = {'n1': '3', 'n2': '5', 'p': '15'}
V_N2d = {'n1': '7', 'n2': '3', 'p': '15'}
V_N2h = {'n': '6', 'p': '15'}
SPECS_N2 = [
    spec('Somme : 3 → 4,50, 5 → 7,50 ; 8 → 12', 0, V_N2, 'correct', ['12']),
    spec('Somme : 12,00 accepté', 0, V_N2, 'correct', ['12{,}00']),
    spec('Somme : 7,50 + 3 (10,5)', 0, V_N2, 'incorrect', ['10{,}5'],
         'Tu as ajouté $3~\\unit{€}$ : $3$ cahiers de plus coûtent $4.5~\\unit{€}$ de plus.'),
    spec('Somme : différence (3)', 0, V_N2, 'incorrect', ['3'],
         'Tu as fait la différence des prix : c\'est le prix de $2$ cahiers. Pour $8$ cahiers, '
         'additionne.'),
    spec('Somme : 4,50 × 5 (22,5)', 0, V_N2, 'incorrect', ['22{,}5'],
         'Tu as multiplié le prix de $3$ cahiers par $5$ : c\'est le prix de $15$ cahiers.'),
    spec('Différence : 7 → 10,50, 3 → 4,50 ; 4 → 6', 1, V_N2d, 'correct', ['6']),
    spec('Différence : somme (15)', 1, V_N2d, 'incorrect', ['15'],
         'Tu as additionné les prix : c\'est le prix de $10$ bouteilles. Pour $4$ bouteilles, '
         'soustrais.'),
    spec('Différence : 10,50 − 3 (7,5)', 1, V_N2d, 'incorrect', ['7{,}5'],
         'Tu as enlevé $3~\\unit{€}$ : $3$ bouteilles de moins coûtent $4.5~\\unit{€}$ de moins.'),
    spec('Une fois et demie : 6 → 9 ; 9 → 13,5', 2, V_N2h, 'correct', ['13{,}5']),
    spec('Une fois et demie : 13,50 accepté', 2, V_N2h, 'correct', ['13{,}50']),
    spec('Une fois et demie : moitié (4,5)', 2, V_N2h, 'incorrect', ['4{,}5'],
         'C\'est le prix de $3$ paquets : il faut aussi ajouter le prix des $6$ premiers.'),
    spec('Une fois et demie : 9 + 3 (12)', 2, V_N2h, 'incorrect', ['12'],
         'Tu as ajouté $3~\\unit{€}$ : $3$ paquets de plus coûtent la moitié de $9~\\unit{€}$ '
         'de plus.'),
    spec('Une fois et demie : 9 × 9 (81)', 2, V_N2h, 'incorrect', ['81'],
         'Tu as multiplié le prix de $6$ paquets par $9$ : c\'est le prix de $6 \\times 9$ '
         'paquets.'),
    spec('Inverse : 12 € → 8 cahiers', 3, V_N2, 'correct', ['8']),
    spec('Inverse : différence (2)', 3, V_N2, 'incorrect', ['2'],
         'Tu as fait la différence des quantités : regarde comment obtenir $12$ à partir des '
         'deux prix.'),
    spec('Inverse : produit (15)', 3, V_N2, 'incorrect', ['15'],
         'Tu as multiplié les quantités : regarde comment obtenir $12$ à partir des deux prix.'),
    spec('Inverse : prix recopié (20)', 3, {'n1': '3', 'n2': '5', 'p': '25'}, 'incorrect', ['20'],
         'C\'est la somme dont on dispose, en euros : la question demande un nombre de cahiers.'),
]

N2 = modele(
    'Résoudre un problème par la linéarité additive',
    'Deux prix donnés (n1 et n2 objets, de 2 à 9, ni l\'un multiple de l\'autre) : prix de '
    'n1 + n2 ou de n1 − n2 objets en additionnant ou soustrayant les prix, prix d\'une fois et '
    'demie la quantité, nombre d\'objets pour la somme des prix ; pièges : quantité ajoutée au '
    'prix, mauvaise opération',
    5, 60, [N2_SOMME, N2_DIFF, N2_DEMI, N2_INVERSE], SPECS_N2, ZEROS_LIBRES,
    rangement=QUATRIEME)


# =============================================================================================
# N3 — 6-192 : compléter un tableau de proportionnalité (2 lignes, 5 colonnes), sans la valeur
# pour 1. Les deux premières colonnes sont données (x, y premiers entre eux).
# =============================================================================================

def tableau(l1, l2, haut, bas):
    return ('| ' + l1 + ' | ' + ' | '.join(haut) + ' |\n|---|---|---|---|---|---|\n'
            '| ' + l2 + ' | ' + ' | '.join(bas) + ' |')


X3 = d('x*p/10')
Y3 = d('y*p/10')
N3_FACILE = variation(
    'Tous les cahiers ont le même prix. Complète ce tableau de proportionnalité.\n\n'
    + tableau('Nombre de cahiers', 'Prix (€)',
              ['${{x}}$', '${{y}}$', '${{eval:x+y}}$', '${{eval:2*x}}$', '${{eval:10*x}}$'],
              ['$' + X3 + '$', '$' + Y3 + '$', '$?$', '$?$', '$?$']),
    [var('x', '2..7'), var('y', '2..7'), var('p', '11..35')],
    [
        case(d('(x+y)*p/10'), [
            erreur(d('y*p/10+x'), 'Tu as ajouté ${{x}}~\\unit{€}$ : ${{x}}$ cahiers de plus '
                   'coûtent $' + X3 + '~\\unit{€}$ de plus.', 'Quantité ajoutée au prix'),
            erreur(d('abs(y-x)*p/10'), 'Tu as fait la différence des prix : c\'est le prix de '
                   '${{eval:abs(y-x)}}$ cahiers.', 'Différence au lieu de somme'),
            erreur(d('(2*y-x)*p/10'), 'Le tableau ne continue pas avec le même écart : '
                   '${{eval:x+y}}$ cahiers, c\'est ${{x}}$ cahiers et ${{y}}$ cahiers.',
                   'Même écart ajouté'),
        ]),
        case(d('2*x*p/10'), [
            erreur(d('x*p/10+2'), 'Tu as ajouté $2~\\unit{€}$ : deux fois plus de cahiers '
                   'coûtent deux fois plus cher.', 'Ajout de 2 au lieu du double'),
            erreur(d('2*y*p/10'), 'Tu as doublé le prix de ${{y}}$ cahiers : ${{eval:2*x}}$, '
                   'c\'est le double de ${{x}}$.', 'Double de la mauvaise colonne'),
        ]),
        case('{{eval:x*p}}', [
            erreur(X3, 'Multiplier par $10$, ce n\'est pas écrire un $0$ à droite d\'un nombre '
                   'décimal : chaque chiffre prend une valeur dix fois plus grande.',
                   'Zéro ajouté à droite d\'un décimal'),
            erreur('{{eval:10*x*p}}', 'Tu as multiplié par $100$ : ${{eval:10*x}}$ cahiers, '
                   'c\'est $10$ fois ${{x}}$ cahiers.', 'Multiplication par 100'),
            erreur(d('x*p/10+10'), 'Tu as ajouté $10~\\unit{€}$ : dix fois plus de cahiers '
                   'coûtent dix fois plus cher.', 'Ajout de 10 au lieu de × 10'),
        ]),
    ],
    [
        '**Combiner les colonnes.** ${{eval:x+y}} = {{x}} + {{y}}$, donc le prix de '
        '${{eval:x+y}}$ cahiers est $' + X3 + ' + ' + Y3 + ' = ' + couleur(d('(x+y)*p/10'))
        + '$.',
        '${{eval:2*x}} = 2 \\times {{x}}$, donc le prix est $2 \\times ' + X3 + ' = '
        + couleur(d('2*x*p/10')) + '$.',
        '${{eval:10*x}} = 10 \\times {{x}}$, donc le prix est $10 \\times ' + X3 + ' = '
        + couleur('{{eval:x*p}}') + '$.',
    ],
    'Pour chaque colonne, écris le nombre de cahiers à l\'aide de ${{x}}$ et de ${{y}}$.',
    ['gcd(x,y)==1', 'x<y', 'mod(p,10)!=0', 'mod(x*p,10)!=0'],
)

N3_MOYEN = variation(
    'Pour carreler un sol, on pose toujours le même nombre de carreaux par mètre carré. Complète '
    'ce tableau de proportionnalité.\n\n'
    + tableau('Surface (m²)', 'Nombre de carreaux',
              ['${{x}}$', '${{y}}$', '${{eval:abs(x-y)}}$', '${{eval:x/2}}$', '${{eval:k*y}}$'],
              ['${{eval:x*c}}$', '${{eval:y*c}}$', '$?$', '$?$', '$?$']),
    [var('x', '4|8|10'), var('y', '3|5|7'), var('k', '3|5'), var('c', '4..16')],
    [
        case('{{eval:abs(x-y)*c}}', [
            erreur('{{eval:(x+y)*c}}', 'Tu as additionné : ${{eval:abs(x-y)}}$, c\'est la '
                   'différence de ${{x}}$ et ${{y}}$.', 'Somme au lieu de différence'),
            erreur('{{eval:max(x,y)*c-abs(x-y)}}', 'Tu as enlevé ${{eval:abs(x-y)}}$ carreaux : '
                   'enlève le nombre de carreaux de ${{eval:min(x,y)}}~\\unit{m^2}$.',
                   'Quantité retirée au nombre de carreaux'),
        ]),
        case('{{eval:x*c/2}}', [
            erreur('{{eval:x*c-2}}', 'Tu as enlevé $2$ : la moitié de la surface demande la '
                   'moitié des carreaux.', 'Retrait de 2 au lieu de la moitié'),
            erreur('{{eval:2*x*c}}', 'Tu as doublé : ${{eval:x/2}}$, c\'est la moitié de '
                   '${{x}}$, pas le double.', 'Double au lieu de moitié'),
        ]),
        case('{{eval:k*y*c}}', [
            erreur('{{eval:y*c+k}}', 'Tu as ajouté ${{k}}$ : ${{k}}$ fois plus de surface '
                   'demande ${{k}}$ fois plus de carreaux.', 'Ajout au lieu de multiplication'),
            erreur('{{eval:k*x*c}}', 'Tu as multiplié la mauvaise colonne : ${{eval:k*y}}$, '
                   'c\'est ${{k}}$ fois ${{y}}$.', 'Multiple de la mauvaise colonne'),
        ]),
    ],
    [
        '**Combiner les colonnes.** ${{eval:abs(x-y)}} = {{eval:max(x,y)}} - {{eval:min(x,y)}}$, '
        'donc il faut ${{eval:max(x,y)*c}} - {{eval:min(x,y)*c}} = ' + couleur('{{eval:abs(x-y)*c}}')
        + '$ carreaux.',
        '${{eval:x/2}}$ est la moitié de ${{x}}$, donc il faut la moitié de ${{eval:x*c}}$ : $'
        + couleur('{{eval:x*c/2}}') + '$ carreaux.',
        '${{eval:k*y}} = {{k}} \\times {{y}}$, donc il faut ${{k}} \\times {{eval:y*c}} = '
        + couleur('{{eval:k*y*c}}') + '$ carreaux.',
    ],
    'Pour chaque colonne, cherche comment obtenir la surface à partir de ${{x}}$ et de ${{y}}$ : '
    'somme, différence, moitié, multiple ?',
    ['gcd(x,y)==1', 'abs(x-y)>=2'],
)

XS = d('x*h/2')
YS = d('y*h/2')
N3_HAUT = variation(
    'Pour préparer une boisson, on verse toujours la même quantité de sirop par litre d\'eau. '
    'Complète ce tableau de proportionnalité.\n\n'
    + tableau('Volume d\'eau (L)', 'Volume de sirop (cL)',
              ['${{x}}$', '${{y}}$', '$?$', '${{eval:3*x}}$', '${{eval:10*y}}$'],
              ['$' + XS + '$', '$' + YS + '$', '$' + d('(x+y)*h/2') + '$', '$?$', '$?$']),
    [var('x', '2..6'), var('y', '3..7'), var('h', '5..19')],
    [
        case('{{eval:x+y}}', [
            erreur('{{eval:2*y-x}}', 'Le tableau ne continue pas avec le même écart : regarde '
                   'comment obtenir $' + d('(x+y)*h/2') + '$ à partir des deux volumes de sirop.',
                   'Même écart ajouté'),
            erreur(d('(x+y)*h/2'), 'C\'est le volume de sirop : la case demande le volume '
                   'd\'eau.', 'Ligne recopiée'),
        ]),
        case(d('3*x*h/2'), [
            erreur(d('x*h/2+3'), 'Tu as ajouté $3$ : trois fois plus d\'eau demande trois fois '
                   'plus de sirop.', 'Ajout de 3 au lieu de × 3'),
            erreur(d('3*y*h/2'), 'Tu as multiplié la mauvaise colonne : ${{eval:3*x}}$, c\'est '
                   '$3$ fois ${{x}}$.', 'Triple de la mauvaise colonne'),
        ]),
        case(d('5*y*h'), [
            erreur(YS, 'Multiplier par $10$, ce n\'est pas écrire un $0$ à droite d\'un nombre '
                   'décimal : chaque chiffre prend une valeur dix fois plus grande.',
                   'Zéro ajouté à droite d\'un décimal'),
            erreur('{{eval:50*y*h}}', 'Tu as multiplié par $100$ : ${{eval:10*y}}~\\unit{L}$, '
                   'c\'est $10$ fois ${{y}}~\\unit{L}$.', 'Multiplication par 100'),
            erreur(d('y*h/2+10'), 'Tu as ajouté $10$ : dix fois plus d\'eau demande dix fois '
                   'plus de sirop.', 'Ajout de 10 au lieu de × 10'),
        ]),
    ],
    [
        '**Combiner les colonnes.** $' + XS + ' + ' + YS + ' = ' + d('(x+y)*h/2') + '$ : ce '
        'volume de sirop va avec ${{x}} + {{y}} = ' + couleur('{{eval:x+y}}') + '$ litres '
        'd\'eau.',
        '${{eval:3*x}} = 3 \\times {{x}}$, donc il faut $3 \\times ' + XS + ' = '
        + couleur(d('3*x*h/2')) + '$ centilitres de sirop.',
        '${{eval:10*y}} = 10 \\times {{y}}$, donc il faut $10 \\times ' + YS + ' = '
        + couleur(d('5*y*h')) + '$ centilitres de sirop.',
    ],
    'Dans la troisième colonne, compare le volume de sirop aux deux volumes de sirop connus.',
    ['gcd(x,y)==1', 'x<y', 'mod(y*h,2)==1'],
)

V_N3 = {'x': '3', 'y': '5', 'p': '15'}
V_N3m = {'x': '8', 'y': '3', 'k': '5', 'c': '6'}
V_N3h = {'x': '2', 'y': '5', 'h': '9'}
SPECS_N3 = [
    spec('Facile : 3 → 4,50, 5 → 7,50 ; 12, 9, 45', 0, V_N3, 'correct', ['12', '9', '45']),
    spec('Facile : 12,00 et 9,00 acceptés', 0, V_N3, 'correct', ['12{,}00', '9{,}00', '45']),
    spec('Facile : 7,50 + 3 (10,5)', 0, V_N3, 'incorrect', ['10{,}5', '9', '45'],
         'Tu as ajouté $3~\\unit{€}$ : $3$ cahiers de plus coûtent $4.5~\\unit{€}$ de plus.'),
    spec('Facile : différence des prix (3)', 0, V_N3, 'incorrect', ['3', '9', '45'],
         'Tu as fait la différence des prix : c\'est le prix de $2$ cahiers.'),
    spec('Facile : même écart (7,5)', 0, {'x': '3', 'y': '4', 'p': '15'},
         'incorrect', ['7{,}5', '9', '45'],
         'Le tableau ne continue pas avec le même écart : $7$ cahiers, c\'est $3$ cahiers et '
         '$4$ cahiers.'),
    spec('Facile : 4,50 + 2 (6,5)', 0, V_N3, 'incorrect', ['12', '6{,}5', '45'],
         'Tu as ajouté $2~\\unit{€}$ : deux fois plus de cahiers coûtent deux fois plus cher.'),
    spec('Facile : double de 7,50 (15)', 0, V_N3, 'incorrect', ['12', '15', '45'],
         'Tu as doublé le prix de $5$ cahiers : $6$, c\'est le double de $3$.'),
    spec('Facile : 4,50 → 4,50 (zéro ajouté)', 0, V_N3, 'incorrect', ['12', '9', '4{,}50'],
         'Multiplier par $10$, ce n\'est pas écrire un $0$ à droite d\'un nombre décimal : '
         'chaque chiffre prend une valeur dix fois plus grande.'),
    spec('Facile : × 100 (450)', 0, V_N3, 'incorrect', ['12', '9', '450'],
         'Tu as multiplié par $100$ : $30$ cahiers, c\'est $10$ fois $3$ cahiers.'),
    spec('Facile : 4,50 + 10 (14,5)', 0, V_N3, 'incorrect', ['12', '9', '14{,}5'],
         'Tu as ajouté $10~\\unit{€}$ : dix fois plus de cahiers coûtent dix fois plus cher.'),
    spec('Moyen : 8 → 48, 3 → 18 ; 30, 24, 90', 1, V_N3m, 'correct', ['30', '24', '90']),
    spec('Moyen : somme (66)', 1, V_N3m, 'incorrect', ['66', '24', '90'],
         'Tu as additionné : $5$, c\'est la différence de $8$ et $3$.'),
    spec('Moyen : 48 − 5 (43)', 1, V_N3m, 'incorrect', ['43', '24', '90'],
         'Tu as enlevé $5$ carreaux : enlève le nombre de carreaux de $3~\\unit{m^2}$.'),
    spec('Moyen : 48 − 2 (46)', 1, V_N3m, 'incorrect', ['30', '46', '90'],
         'Tu as enlevé $2$ : la moitié de la surface demande la moitié des carreaux.'),
    spec('Moyen : double (96)', 1, V_N3m, 'incorrect', ['30', '96', '90'],
         'Tu as doublé : $4$, c\'est la moitié de $8$, pas le double.'),
    spec('Moyen : 18 + 5 (23)', 1, V_N3m, 'incorrect', ['30', '24', '23'],
         'Tu as ajouté $5$ : $5$ fois plus de surface demande $5$ fois plus de carreaux.'),
    spec('Moyen : 5 × 48 (240)', 1, V_N3m, 'incorrect', ['30', '24', '240'],
         'Tu as multiplié la mauvaise colonne : $15$, c\'est $5$ fois $3$.'),
    spec('Moyen : 4 et 7, 3 × 7', 1, {'x': '4', 'y': '7', 'k': '3', 'c': '10'}, 'correct',
         ['30', '20', '210']),
    spec('Sirop : 2 → 9, 5 → 22,5 ; 7 L, 27, 225', 2, V_N3h, 'correct', ['7', '27', '225']),
    spec('Sirop : même écart (8)', 2, V_N3h, 'incorrect', ['8', '27', '225'],
         'Le tableau ne continue pas avec le même écart : regarde comment obtenir $31.5$ à '
         'partir des deux volumes de sirop.'),
    spec('Sirop : volume de sirop recopié (31,5)', 2, V_N3h, 'incorrect', ['31{,}5', '27', '225'],
         'C\'est le volume de sirop : la case demande le volume d\'eau.'),
    spec('Sirop : 9 + 3 (12)', 2, V_N3h, 'incorrect', ['7', '12', '225'],
         'Tu as ajouté $3$ : trois fois plus d\'eau demande trois fois plus de sirop.'),
    spec('Sirop : 3 × 22,5 (67,5)', 2, V_N3h, 'incorrect', ['7', '67{,}5', '225'],
         'Tu as multiplié la mauvaise colonne : $6$, c\'est $3$ fois $2$.'),
    spec('Sirop : 22,5 → 22,50 (zéro ajouté)', 2, V_N3h, 'incorrect', ['7', '27', '22{,}50'],
         'Multiplier par $10$, ce n\'est pas écrire un $0$ à droite d\'un nombre décimal : '
         'chaque chiffre prend une valeur dix fois plus grande.'),
    spec('Sirop : × 100 (2 250)', 2, V_N3h, 'incorrect', ['7', '27', '2\\,250'],
         'Tu as multiplié par $100$ : $50~\\unit{L}$, c\'est $10$ fois $5~\\unit{L}$.'),
    spec('Sirop : 22,5 + 10 (32,5)', 2, V_N3h, 'incorrect', ['7', '27', '32{,}5'],
         'Tu as ajouté $10$ : dix fois plus d\'eau demande dix fois plus de sirop.'),
]

N3 = modele(
    'Compléter un tableau de proportionnalité',
    'Tableau de 5 colonnes dont 2 données (quantités premières entre elles, sans la valeur pour '
    '1) : compléter par somme, double, × 10 (prix de cahiers), par différence, moitié, × 3 ou × 5 '
    '(carreaux), ou retrouver une quantité de la première ligne (sirop) ; pièges : même écart '
    'ajouté, mauvaise colonne, zéro écrit à droite d\'un décimal',
    6, 90, [N3_FACILE, N3_MOYEN, N3_HAUT], SPECS_N3, ZEROS_LIBRES,
    rangement=TABLEAU)


# =============================================================================================
# N4 — 6-189 : reconnaître les grandeurs d'une situation (pas les unités, pas les objets).
# Variation 1 : cocher les deux grandeurs (toujours les choix d'origine 0 et 3, mélangés à
# l'affichage). Variation 2 : relier chaque grandeur à son unité.
# =============================================================================================

N4_SITUATIONS = [
    'Inès achète $3~\\unit{kg}$ de pommes pour $5{,}40~\\unit{€}$.',
    'Pour $6$ personnes, Hugo utilise $300~\\unit{g}$ de farine.',
    'Un cycliste parcourt $45~\\unit{km}$ en $3~\\unit{h}$.',
    'Un robinet ouvert remplit un seau de $10~\\unit{L}$ en $2~\\unit{min}$.',
]
N4_CHOIX = [
    ['la masse de pommes achetée', 'le nombre de personnes', 'la distance parcourue',
     'le volume d\'eau versé'],
    ['le kilogramme', 'le gramme', 'le kilomètre', 'le litre'],
    ['les pommes', 'la farine', 'le vélo', 'le robinet'],
    ['le prix payé', 'la masse de farine', 'la durée du trajet', 'la durée de remplissage'],
    ['l\'euro', 'la recette', 'l\'heure', 'la minute'],
]
N4_GRANDEURS = selon('s', [
    'la masse de pommes (en kilogrammes) et le prix payé (en euros)',
    'le nombre de personnes et la masse de farine (en grammes)',
    'la distance parcourue (en kilomètres) et la durée du trajet (en heures)',
    'le volume d\'eau versé (en litres) et la durée de remplissage (en minutes)',
])
N4_PIEGES = selon('s', [
    '« Le kilogramme » et « l\'euro » sont des unités ; « les pommes » sont ce qu\'on achète, '
    'pas une mesure.',
    '« Le gramme » est une unité ; « la farine » et « la recette » ne sont pas des mesures.',
    '« Le kilomètre » et « l\'heure » sont des unités ; « le vélo » est un objet.',
    '« Le litre » et « la minute » sont des unités ; « le robinet » est un objet.',
])

N4_COCHER = variation(
    selon('s', N4_SITUATIONS) + '\n\nQuelles sont les deux grandeurs de cette situation ? Coche-les.'
    '\n\n' + bloc('choix', 'plusieurs: oui', *['- ' + selon('s', c) for c in N4_CHOIX]),
    [var('s', '0..3')],
    [case('0;3')],
    [
        '**Grandeur ou unité ?** Une grandeur est ce qu\'on mesure (une masse, un prix, une '
        'durée…) ; l\'unité est ce avec quoi on la mesure (le kilogramme, l\'euro, l\'heure…).',
        'Ici, les deux grandeurs sont ' + ctexte(N4_GRANDEURS) + '.',
        N4_PIEGES,
    ],
    'Une grandeur se mesure ; l\'unité dit avec quoi on la mesure.',
)

N4_PAIRES = [
    (['la masse d\'une pastèque', 'la masse d\'un stylo'], ['le kilogramme', 'le gramme']),
    (['la durée d\'un film', 'la durée d\'une course de $100~\\unit{m}$'],
     ['l\'heure', 'la seconde']),
    (['le prix d\'un livre', 'la distance entre deux villes'], ['l\'euro', 'le kilomètre']),
    (['la longueur d\'une piscine', 'l\'aire d\'une chambre'], ['le mètre', 'le mètre carré']),
    (['la contenance d\'une bouteille d\'eau', 'la contenance d\'un verre'],
     ['le litre', 'le centilitre']),
]
N4_INTRUS = ['le mètre carré', 'l\'euro']

N4_RELIER = variation(
    'Relie chaque grandeur à l\'unité qui sert à la mesurer. Une unité ne sert pas.\n\n'
    + bloc('associer', *['- ' + selon('s', g) + ' -> ' + selon('s', u) for g, u in N4_PAIRES],
           '- -> ' + selon('s', N4_INTRUS)),
    [var('s', '0..1')],
    None,
    [
        '**Grandeur et unité.** Une grandeur se mesure ; son unité dit avec quoi on la mesure : '
        'une masse en kilogrammes ou en grammes, une durée en heures ou en secondes, une longueur '
        'en mètres, une contenance en litres.',
        selon('s', [
            'Masse de la pastèque : ' + ctexte('le kilogramme') + ' ; durée du film : '
            + ctexte('l\'heure') + ' ; prix du livre : ' + ctexte('l\'euro')
            + ' ; longueur de la piscine : ' + ctexte('le mètre') + ' ; contenance de la '
            'bouteille : ' + ctexte('le litre') + '. Le mètre carré mesure une aire : '
            'il ne sert pas.',
            'Masse du stylo : ' + ctexte('le gramme') + ' ; durée de la course : '
            + ctexte('la seconde') + ' ; distance entre deux villes : '
            + ctexte('le kilomètre') + ' ; aire de la chambre : '
            + ctexte('le mètre carré') + ' ; contenance du verre : '
            + ctexte('le centilitre') + '. L\'euro mesure un prix : il ne sert pas.',
        ]),
    ],
    'Une grandeur se mesure ; l\'unité dit avec quoi on la mesure.',
)

# Réponses du relier : positions affichées, lues par ranger-attendus.ts
SPECS_N4 = [
    spec('Cocher : achat, masse et prix', 0, {'s': '0'}, 'correct', ['0;3']),
    spec('Cocher : achat, une unité cochée', 0, {'s': '0'}, 'incorrect', ['0;1']),
    spec('Cocher : achat, l\'objet coché', 0, {'s': '0'}, 'incorrect', ['2;3']),
    spec('Cocher : achat, une seule grandeur (partiel)', 0, {'s': '0'}, 'unoptimal_form', ['0']),
    spec('Cocher : trajet, unités seulement', 0, {'s': '2'}, 'incorrect', ['1;4']),
    spec('Cocher : robinet, distance et durée', 0, {'s': '3'}, 'correct', ['0;3']),
    spec('Relier : série 1, le bon classement', 1, {'s': '0'}, 'correct',
         ['5', '4', '1', '0', '2']),
    spec('Relier : série 1, kilogramme et heure échangés', 1, {'s': '0'}, 'incorrect',
         ['4', '5', '1', '0', '2']),
    spec('Relier : série 1, le mètre carré (intrus) pour la piscine', 1, {'s': '0'}, 'incorrect',
         ['5', '4', '1', '3', '2']),
    spec('Relier : série 2, le bon classement', 1, {'s': '1'}, 'correct',
         ['5', '4', '1', '0', '2']),
]

N4 = modele(
    'Reconnaître les grandeurs d\'une situation',
    'Dans une situation (achat, recette, trajet, robinet), cocher les deux grandeurs parmi des '
    'unités et des objets ; puis relier chaque grandeur (masse, durée, prix, longueur, '
    'contenance, aire) à son unité, avec une unité en trop',
    8, 60, [N4_COCHER, N4_RELIER], SPECS_N4,
    rangement=GRANDEURS)


# =============================================================================================
# N5 — 6-190 : peut-on le calculer ? Choix unique : « Oui : » la valeur proportionnelle, deux
# autres valeurs (écart ajouté, produit par la nouvelle quantité), « Non : on ne peut pas le
# calculer ». Variation 1 : t ≤ 2 non proportionnel (taille, masse, pointure selon l'âge),
# t ≥ 3 proportionnel (prix au kilo, distance à vitesse constante, imprimante).
# Valeur de départ V tirée en entier (prix en dixièmes d'euro, divisé par f = 10 à l'affichage).
# =============================================================================================

def ind(v, k):
    return '(1-min(abs(' + v + '-' + str(k) + '),1))'


N5_V = ('eval:(80+6*q)*' + ind('t', 0) + '+(2*q+10)*' + ind('t', 1) + '+(18+2*q)*' + ind('t', 2)
        + '+q*u*' + ind('t', 3) + '+q*10*w*' + ind('t', 4) + '+q*r*' + ind('t', 5))
N5_F = 'eval:1+9*' + ind('t', 3)

N5_ENONCES = [
    'À ${{q}}$ ans, Léo mesure ${{V}}~\\unit{cm}$. Peut-on calculer sa taille à ${{eval:k*q}}$ ans ?',
    'À ${{q}}$ ans, Zoé pèse ${{V}}~\\unit{kg}$. Peut-on calculer sa masse à ${{eval:k*q}}$ ans ?',
    'À ${{q}}$ ans, Tom chausse du ${{V}}$. Peut-on calculer sa pointure à ${{eval:k*q}}$ ans ?',
    'Au marché, ${{q}}~\\unit{kg}$ de pommes coûtent $' + d('V/10') + '~\\unit{€}$. Peut-on '
    'calculer le prix de ${{eval:k*q}}~\\unit{kg}$ de ces pommes ?',
    'Un car roule toujours à la même vitesse. Il parcourt ${{V}}~\\unit{km}$ en ${{q}}~\\unit{h}$. '
    'Peut-on calculer la distance qu\'il parcourt en ${{eval:k*q}}~\\unit{h}$ ?',
    'Une imprimante imprime toujours au même rythme : ${{V}}$ pages en ${{q}}~\\unit{min}$. '
    'Peut-on calculer le nombre de pages imprimées en ${{eval:k*q}}~\\unit{min}$ ?',
]


def n5_oui(valeur):
    return selon('t', [
        'Oui : il mesurera $' + valeur + '~\\unit{cm}$.',
        'Oui : elle pèsera $' + valeur + '~\\unit{kg}$.',
        'Oui : il chaussera du $' + valeur + '$.',
        'Oui : elles coûteront $' + valeur + '~\\unit{€}$.',
        'Oui : il parcourra $' + valeur + '~\\unit{km}$.',
        'Oui : elle imprimera $' + valeur + '$ pages.',
    ])


N5_PROP = d('k*V/f')
N5_PLUS = d('V/f+(k-1)*q')
N5_FOIS = d('k*q*V/f')

N5_CORRIGE_1 = selon('t', [
    'La taille n\'est pas proportionnelle à l\'âge : on ne grandit pas toujours de la même '
    'façon, et à ${{eval:k*q}}$ ans on ne mesure pas ${{k}}$ fois sa taille de ${{q}}$ ans. '
    'Aucun calcul ne donne la réponse : ' + ctexte('on ne peut pas la calculer') + '.',
    'La masse n\'est pas proportionnelle à l\'âge : on ne grossit pas toujours de la même façon. '
    'Aucun calcul ne donne la réponse : ' + ctexte('on ne peut pas la calculer') + '.',
    'La pointure n\'est pas proportionnelle à l\'âge : le pied grandit puis s\'arrête de '
    'grandir. Aucun calcul ne donne la réponse : '
    + ctexte('on ne peut pas la calculer') + '.',
    'Le prix est proportionnel à la masse : chaque kilogramme coûte le même prix. '
    '${{eval:k*q}}~\\unit{kg}$, c\'est ${{k}}$ fois ${{q}}~\\unit{kg}$, donc le prix est '
    'multiplié par ${{k}}$ : $' + d('V/10') + ' \\times {{k}} = '
    + couleur(N5_PROP + '~\\unit{€}') + '$.',
    'La vitesse ne change pas : la distance est proportionnelle à la durée. '
    '${{eval:k*q}}~\\unit{h}$, c\'est ${{k}}$ fois ${{q}}~\\unit{h}$, donc la distance est '
    'multipliée par ${{k}}$ : ${{V}} \\times {{k}} = ' + couleur(N5_PROP + '~\\unit{km}') + '$.',
    'Le rythme ne change pas : le nombre de pages est proportionnel à la durée. '
    '${{eval:k*q}}~\\unit{min}$, c\'est ${{k}}$ fois ${{q}}~\\unit{min}$, donc le nombre de pages '
    'est multiplié par ${{k}}$ : ${{V}} \\times {{k}} = ' + couleur(N5_PROP) + '$ pages.',
])

N5_AGE = variation(
    selon('t', N5_ENONCES) + '\n\n'
    + bloc('choix', '- ' + n5_oui(N5_PROP), '- ' + n5_oui(N5_PLUS), '- ' + n5_oui(N5_FOIS),
           '- Non : on ne peut pas le calculer.'),
    [var('t', '0..5'), var('k', '2..3'), var('q', '2..6'), var('u', '11..35'), var('w', '4..9'),
     var('r', '8..20'), var('V', N5_V), var('f', N5_F), var('a', 'eval:3-3*floor(t/3)')],
    [case('{{a}}')],
    [
        '**Proportionnel ou pas ?** Deux grandeurs sont proportionnelles quand, si l\'une est '
        'multipliée par un nombre, l\'autre est multipliée par le même nombre.',
        N5_CORRIGE_1,
    ],
    'Si la première grandeur est multipliée par ${{k}}$, la seconde l\'est-elle forcément aussi ?',
    ['mod(u,10)!=0', 'V!=q*f', '(k-1)*q*f!=(k*q-1)*V'],
)

N5_ENONCES_2 = [
    'Quand Lina a ${{q}}$ ans, son père a ${{V}}$ ans. Peut-on calculer l\'âge de son père quand '
    'Lina aura ${{eval:k*q}}$ ans ?',
    'Pour ${{q}}$ personnes, une recette de crêpes demande ${{V}}~\\unit{g}$ de farine. Peut-on '
    'calculer la masse de farine pour ${{eval:k*q}}$ personnes ?',
]


def n5_oui_2(valeur):
    return selon('t', ['Oui : il aura $' + valeur + '$ ans.',
                       'Oui : il faudra $' + valeur + '~\\unit{g}$ de farine.'])


N5_FAMILLE = variation(
    selon('t', N5_ENONCES_2) + '\n\n'
    + bloc('choix', '- ' + n5_oui_2('{{eval:k*V}}'), '- ' + n5_oui_2('{{eval:V+(k-1)*q}}'),
           '- ' + n5_oui_2('{{eval:V+k*q}}'), '- Non : on ne peut pas le calculer.'),
    [var('t', '0..1'), var('k', '2..3'), var('q', '3..8'), var('ecart', '24..38'),
     var('g', '20|25|30|40|50|60'), var('V', 'eval:(1-t)*(q+ecart)+t*q*g'), var('a', 'eval:1-t')],
    [case('{{a}}')],
    [
        '**Proportionnel ou pas ?** Deux grandeurs sont proportionnelles quand, si l\'une est '
        'multipliée par un nombre, l\'autre est multipliée par le même nombre.',
        selon('t', [
            'L\'âge du père n\'est pas proportionnel à celui de Lina : quand Lina aura ${{k}}$ fois '
            'son âge, son père n\'aura pas ${{k}}$ fois le sien. Mais l\'écart d\'âge ne change '
            'jamais : ${{V}} - {{q}} = {{eval:V-q}}$ ans.',
            'La masse de farine est proportionnelle au nombre de personnes : pour ${{k}}$ fois '
            'plus de personnes, il faut ${{k}}$ fois plus de farine.',
        ]),
        selon('t', [
            'Quand Lina aura ${{eval:k*q}}$ ans, son père aura ${{eval:k*q}} + {{eval:V-q}} = '
            + couleur('{{eval:V+(k-1)*q}}') + '$ ans.',
            '${{V}} \\times {{k}} = ' + couleur('{{eval:k*V}}~\\unit{g}') + '$.',
        ]),
    ],
    'Les deux grandeurs sont-elles proportionnelles ? Sinon, y a-t-il quand même quelque chose '
    'qui ne change pas ?',
    ['(k-1)*V!=k*q'],
)

SPECS_N5 = [
    spec('Taille : on ne peut pas', 0, {'t': '0', 'k': '2', 'q': '5', 'u': '15', 'w': '6', 'r': '10',
                                       'V': '110', 'f': '1', 'a': '3'}, 'correct', ['3']),
    spec('Taille : piège du double', 0, {'t': '0', 'k': '2', 'q': '5', 'u': '15', 'w': '6',
                                        'r': '10', 'V': '110', 'f': '1', 'a': '3'},
         'incorrect', ['0']),
    spec('Pointure : on ne peut pas', 0, {'t': '2', 'k': '3', 'q': '4', 'u': '15', 'w': '6',
                                         'r': '10', 'V': '26', 'f': '1', 'a': '3'}, 'correct', ['3']),
    spec('Pommes : 2 kg → 3 €, 6 kg → 9 €', 0, {'t': '3', 'k': '3', 'q': '2', 'u': '15', 'w': '6',
                                                'r': '10', 'V': '30', 'f': '10', 'a': '0'},
         'correct', ['0']),
    spec('Pommes : « on ne peut pas » refusé', 0, {'t': '3', 'k': '3', 'q': '2', 'u': '15',
                                                   'w': '6', 'r': '10', 'V': '30', 'f': '10',
                                                   'a': '0'}, 'incorrect', ['3']),
    spec('Pommes : écart ajouté refusé', 0, {'t': '3', 'k': '3', 'q': '2', 'u': '15', 'w': '6',
                                             'r': '10', 'V': '30', 'f': '10', 'a': '0'},
         'incorrect', ['1']),
    spec('Car : 3 h → 180 km, 6 h → 360 km', 0, {'t': '4', 'k': '2', 'q': '3', 'u': '15',
                                                  'w': '6', 'r': '10', 'V': '180', 'f': '1',
                                                  'a': '0'}, 'correct', ['0']),
    spec('Père : l\'écart reste (correct = 1)', 1, {'t': '0', 'k': '2', 'q': '4', 'ecart': '30',
                                                    'g': '50', 'V': '34', 'a': '1'},
         'correct', ['1']),
    spec('Père : piège du double', 1, {'t': '0', 'k': '2', 'q': '4', 'ecart': '30', 'g': '50',
                                       'V': '34', 'a': '1'}, 'incorrect', ['0']),
    spec('Père : « on ne peut pas » refusé', 1, {'t': '0', 'k': '2', 'q': '4', 'ecart': '30',
                                                  'g': '50', 'V': '34', 'a': '1'},
         'incorrect', ['3']),
    spec('Recette : 4 → 200 g, 8 → 400 g', 1, {'t': '1', 'k': '2', 'q': '4', 'ecart': '30',
                                                'g': '50', 'V': '200', 'a': '0'}, 'correct', ['0']),
    spec('Recette : écart ajouté refusé', 1, {'t': '1', 'k': '2', 'q': '4', 'ecart': '30',
                                               'g': '50', 'V': '200', 'a': '0'},
         'incorrect', ['1']),
]

N5 = modele(
    'Peut-on le calculer ?',
    'Dire si une valeur se calcule : taille, masse, pointure selon l\'âge (non) ou prix au '
    'kilo, distance à vitesse constante, pages imprimées (oui, proportionnel) ; âge du père '
    '(non proportionnel, mais l\'écart reste) ou recette (oui) ; piège : multiplier quand ce '
    'n\'est pas proportionnel',
    9, 60, [N5_AGE, N5_FAMILLE], SPECS_N5,
    rangement=CALCULABLE)


ecrire('n1-retour-a-l-unite', N1)
ecrire('n2-linearite-additive', N2)
ecrire('n3-completer-tableau-proportionnalite', N3)
ecrire('n4-reconnaitre-les-grandeurs', N4)
ecrire('n5-peut-on-le-calculer', N5)
print('5 modèles écrits dans', DOSSIER)
