"""Ajoute les variations validées aux 2 modèles publiés exportés de prod dans
scripts/questions/idees-3e-trigonometrie-publies/ (chantier idees-3e-trigonometrie).

Phase 0 validée par David le 2026-11-25 (« je te suis » : toutes les recommandations ; journal
docs/archive/wip/idees-3e-trigonometrie/idees-3e-trigonometrie-progress.md, § Phase 0) : fiches F1 et F2, Q2 = oui (unités
variées dans F1 v5-v7). Les variations s'ajoutent À LA FIN (les réponses des élèves gardent
l'indice de leur variation) ; la migration de contenu est générée par
scripts/questions/migration-contenu.ts. Seuls `variations` et `testSpecs` changent.

Le script repart du contenu de prod (variations et specs d'origine, comptées dans ORIGINE) :
le relancer réécrit les ajouts sans les doubler.

Décisions et pièges du lot :
- Noms des sommets tirés comme dans les variations publiées (`s`, trois jeux de lettres), figure
  reprise de la variation publiée (même triangle, angle en B marqué, deux orientations `o`).
- 57c73be1 (F1) : v5 opposé = hyp × sin, v6 hyp = adj ÷ cos, v7 adjacent = opp ÷ tan, avec une
  unité tirée (cm, dm, m ; Q2) ; v8 angle avec des côtés décimaux ; v9 angle avec les trois côtés
  donnés. Erreurs prévues : mauvais rapport, × au lieu de ÷ (ou l'inverse), calculatrice en
  radians (v5-v7) ; l'autre angle aigu, et le mauvais rapport (v8). Les valeurs arrondies des
  erreurs sont toutes distinctes entre elles et de la réponse (conditions sur `round`).
  Unité : mm de la fiche remplacé par dm (un triangle de 3 à 15 mm se lit mal).
- v9 : AB et AC entiers, BC = √(AB² + AC²) arrondi au dixième. On ne tire que des triangles où
  tan⁻¹(AC/AB), cos⁻¹(AB/BC) et sin⁻¹(AC/BC) donnent le même degré : l'élève choisit son rapport
  sans risque d'un degré d'écart (précision donnée à David avec les recommandations).
- dbd5debf (F2) : v5 l'élève écrit cos, sin ou tan de B ou de C dans une case
  (`\\frac{AB}{BC}`) ; v6 triangles imbriqués par la hauteur [AH], le même rapport dans le grand
  et dans le petit triangle (deux cases dans un ordre fixe, chacune avec son triangle nommé :
  `orderIndependent` exclurait les erreurs prévues). Deux majuscules collées se lisent comme une
  longueur, BA vaut AB (vérifié par un essai le 2026-11-25 : `\\frac{BA}{CB}` juste, `AB` seul
  refusé). Les lettres de la réponse ont un indice calculé (`nb`, `da`, `db`…) : chaque lettre
  s'écrit dans un texte répété par jeu de lettres (`par_jeu`), pour rester sous les 500
  caractères d'une erreur prévue.

Usage : python3 docs/wip/questions/idees-3e-trigonometrie-publies.py scripts/questions/idees-3e-trigonometrie-publies
"""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from idees_3e_trigonometrie_outils import (  # noqa: E402
    DEG, arrondi_net, case, couleur, erreur, lettre, resoudre, spec,
    tous_distincts, var, variation)

DOSSIER = sys.argv[1]

# id court → (variations, specs) d'origine en prod (export du 2026-11-25)
ORIGINE = {'57c73be1': (4, 8), 'dbd5debf': (4, 8)}

JEUX = [('A', 'B', 'C'), ('R', 'S', 'T'), ('E', 'F', 'G')]
A, B, C = (lettre(JEUX, i) for i in range(3))
ABC = A + B + C
HYP, ADJ, OPP = B + C, A + B, A + C          # pour l'angle en B
ANGLE_B = '\\widehat{' + ABC + '}'


def charger(court):
    with open(os.path.join(DOSSIER, court + '.json'), encoding='utf-8') as f:
        return json.load(f)


def ajouter(court, variations, specs):
    chemin = os.path.join(DOSSIER, court + '.json')
    m = charger(court)
    nv, ns = ORIGINE[court]
    m['variations'] = m['variations'][:nv]
    m['testSpecs'] = m['testSpecs'][:ns]
    for s in specs:
        s['variationIndex'] += nv
    m['variations'] += variations
    m['testSpecs'] += specs
    with open(chemin, 'w', encoding='utf-8') as f:
        json.dump(m, f, ensure_ascii=False, indent='\t')
        f.write('\n')
    print(f'{court} : {nv} + {len(variations)} variations, {ns} + {len(specs)} specs')


def figure_de(statement):
    """Le bloc ```figure d'une variation publiée, tel quel."""
    debut = statement.index('```figure')
    fin = statement.index('```', debut + 3) + 3
    return statement[debut:fin]


# =============================================================================================
# 57c73be1 — 3-061, calculer une longueur ou un angle. F1 : v5-v9.
# =============================================================================================

M57 = charger('57c73be1')
FIG_B = figure_de(M57['variations'][0]['statement'])      # angle `b`
FIG_ANG = figure_de(M57['variations'][3]['statement'])    # angle `ang`
UNITE = '{{if:u==0|cm|}}{{if:u==1|dm|}}{{if:u==2|m|}}'
U = '~\\unit{' + UNITE + '}'
RAD = 'b*\\pi/180'


def r10(expr):
    return f'round(10*({expr}))/10'


def debut_longueur(donne, cherche):
    return ('Le triangle $' + ABC + '$ est rectangle en $' + A + '$. On donne $' + ANGLE_B
            + ' = {{b}}' + DEG + '$ et $' + donne + ' = {{k}}' + U + '$. Calcule $' + cherche
            + '$, arrondie au dixième.\n\n' + FIG_B + '\n\n$' + cherche + ' \\approx ?' + U + '$')


E_RAD = ('Ta calculatrice est réglée en radians : règle-la en **degrés** avant de calculer '
         'avec un angle en degrés.')
HINT_LONG = ('Repère l\'hypoténuse, le côté adjacent et le côté opposé à l\'angle '
             '$' + ANGLE_B + '$ ; choisis le rapport qui contient la longueur connue et la longueur '
             'cherchée, puis isole la longueur cherchée.')
VARS_LONG = [var('s', '0..2'), var('o', '0..1'), var('u', '0..2'), var('b', '20..70'),
             var('k', '3..15')]


def longueur(donne, cherche, juste, erreurs, etapes):
    """Variation de longueur : juste et erreurs = expressions sans arrondi."""
    valeurs = [juste] + [e[0] for e in erreurs]
    conds = [arrondi_net(juste, 10)] + tous_distincts([f'round(10*({x}))' for x in valeurs])
    return variation(
        debut_longueur(donne, cherche),
        VARS_LONG,
        [case('{{eval:' + r10(juste) + ';d}}',
              [erreur('{{eval:' + r10(x) + ';d}}', msg, lab) for x, msg, lab in erreurs])],
        etapes + ['$$' + cherche + ' \\approx ' + couleur('{{eval:' + r10(juste) + ';d}}' + U)
                  + '$$ (à la calculatrice, en degrés, arrondi au dixième).'],
        HINT_LONG,
        conds,
    )


def rapport(fonction, num, den, val_num, val_den):
    return ('Dans le triangle $' + ABC + '$ rectangle en $' + A + '$ : $$\\' + fonction
            + ANGLE_B + ' = \\dfrac{' + num + '}{' + den + '} \\quad\\text{donc}\\quad \\'
            + fonction + '({{b}}' + DEG + ') = \\dfrac{' + val_num + '}{' + val_den + '}$$')


# v5 : AC = BC × sin B
F1_V5 = longueur(
    HYP, OPP, f'k*sin({RAD})',
    [(f'k*cos({RAD})',
      '$' + OPP + '$ est le côté **opposé** à l\'angle $' + ANGLE_B + '$ : c\'est le sinus qui '
      'le relie à l\'hypoténuse, pas le cosinus.', 'Cosinus au lieu du sinus'),
     (f'k/sin({RAD})',
      'La longueur cherchée $' + OPP + '$ est au **numérateur** du rapport : on multiplie '
      'l\'hypoténuse par le sinus, on ne divise pas.', 'Division au lieu de multiplication'),
     ('k*sin(b)', E_RAD, 'Calculatrice en radians')],
    [rapport('sin', OPP, HYP, OPP, '{{k}}'),
     'La longueur cherchée est au numérateur : $$' + OPP + ' = {{k}} \\times \\sin({{b}}' + DEG
     + ')$$'],
)

# v6 : BC = AB ÷ cos B
F1_V6 = longueur(
    ADJ, HYP, f'k/cos({RAD})',
    [(f'k*cos({RAD})',
      'La longueur cherchée $' + HYP + '$ est au **dénominateur** du rapport : on divise par '
      'le cosinus, on ne multiplie pas.', 'Multiplication au lieu de division'),
     (f'k/sin({RAD})',
      '$' + ADJ + '$ est le côté **adjacent** à l\'angle $' + ANGLE_B + '$ : c\'est le cosinus '
      'qui le relie à l\'hypoténuse, pas le sinus.', 'Sinus au lieu du cosinus'),
     ('k/cos(b)', E_RAD, 'Calculatrice en radians')],
    [rapport('cos', ADJ, HYP, '{{k}}', HYP),
     'La longueur cherchée est **au dénominateur** : $$' + HYP + ' = \\dfrac{ {{k}} }{\\cos({{b}}'
     + DEG + ')}$$'],
)

# v7 : AB = AC ÷ tan B
F1_V7 = longueur(
    OPP, ADJ, f'k/tan({RAD})',
    [(f'k*tan({RAD})',
      'La longueur cherchée $' + ADJ + '$ est au **dénominateur** de la tangente : on divise '
      'par la tangente, on ne multiplie pas.', 'Multiplication au lieu de division'),
     (f'k/sin({RAD})',
      'Tu as calculé l\'hypoténuse $' + HYP + '$. La longueur cherchée $' + ADJ + '$ est le '
      'côté **adjacent** : la tangente relie les deux côtés de l\'angle droit.',
      'Hypoténuse calculée'),
     ('k/tan(b)', E_RAD, 'Calculatrice en radians')],
    [rapport('tan', OPP, ADJ, '{{k}}', ADJ),
     'La longueur cherchée est **au dénominateur** : $$' + ADJ + ' = \\dfrac{ {{k}} }{\\tan({{b}}'
     + DEG + ')}$$'],
)

V5 = {'s': 0, 'o': 0, 'u': 0, 'b': 40, 'k': 6}   # AC = 6 sin 40° ≈ 3,9 ; cos 4,6 ; ÷ 9,3 ; rad 4,5
V6 = {'s': 1, 'o': 1, 'u': 2, 'b': 35, 'k': 8}   # ST = 8 / cos 35° ≈ 9,8
V7 = {'s': 2, 'o': 0, 'u': 1, 'b': 50, 'k': 9}   # EF = 9 / tan 50° ≈ 7,6
MSG = {i: [e['message'] for e in v['blanks'][0]['expectedErrors']]
       for i, v in enumerate([F1_V5, F1_V6, F1_V7])}

SPECS_57 = [
    spec('F1 v5 : BC = 6 cm, B = 40° : AC ≈ 3,9', 0, V5, 'correct', ['3{,}9']),
    spec('F1 v5 : cosinus au lieu du sinus', 0, V5, 'incorrect', ['4{,}6'],
         resoudre(MSG[0][0], V5)),
    spec('F1 v5 : division', 0, V5, 'incorrect', ['9{,}3'], resoudre(MSG[0][1], V5)),
    spec('F1 v5 : radians', 0, V5, 'incorrect', ['4{,}5'], resoudre(MSG[0][2], V5)),
    spec('F1 v5 : non arrondi', 0, V5, 'incorrect', ['3{,}857']),
    spec('F1 v6 : SR = 8 m, S = 35° : ST ≈ 9,8', 1, V6, 'correct', ['9{,}8']),
    spec('F1 v6 : multiplication', 1, V6, 'incorrect', ['6{,}6'], resoudre(MSG[1][0], V6)),
    spec('F1 v6 : sinus', 1, V6, 'incorrect', ['13{,}9'], resoudre(MSG[1][1], V6)),
    spec('F1 v6 : radians', 1, V6, 'incorrect', ['-8{,}9'], resoudre(MSG[1][2], V6)),
    spec('F1 v7 : EG = 9 dm, F = 50° : EF ≈ 7,6', 2, V7, 'correct', ['7{,}6']),
    spec('F1 v7 : multiplication', 2, V7, 'incorrect', ['10{,}7'], resoudre(MSG[2][0], V7)),
    spec('F1 v7 : hypoténuse', 2, V7, 'incorrect', ['11{,}7'], resoudre(MSG[2][1], V7)),
    spec('F1 v7 : radians', 2, V7, 'incorrect', ['-33{,}1'], resoudre(MSG[2][2], V7)),
]

# v8 : angle, côtés décimaux. f = 0 cos (AB, BC), 1 sin (AC, BC), 2 tan (AC, AB) ; p < q.
COTE1 = '{{if:f==0|' + ADJ + '|' + OPP + '}}'
COTE2 = '{{if:f==2|' + ADJ + '|' + HYP + '}}'
FONC = '{{if:f==0|\\cos|}}{{if:f==1|\\sin|}}{{if:f==2|\\tan|}}'
ANG8 = ('{{if:f==0|{{eval:acos(p/q)*180/\\pi}}|}}{{if:f==1|{{eval:asin(p/q)*180/\\pi}}|}}'
        '{{if:f==2|{{eval:atan(p/q)*180/\\pi}}|}}')
AUTRE_RAPPORT = ('{{if:f==2|{{eval:round(asin(p/q)*180/\\pi)}}|'
                 '{{eval:round(atan(p/q)*180/\\pi)}}}}')
E_AUTRE_ANGLE = ('C\'est la mesure de l\'**autre** angle aigu du triangle : repère le côté '
                 'adjacent à $' + ANGLE_B + '$ (il touche l\'angle), puis choisis la bonne touche.')
E_RAPPORT = ('Ce rapport ne va pas avec ces deux côtés : la tangente relie les deux côtés de '
             'l\'angle droit, le sinus et le cosinus font intervenir l\'hypoténuse.')
F1_V8 = variation(
    'Le triangle $' + ABC + '$ est rectangle en $' + A + '$. On donne $' + COTE1
    + ' = {{eval:p;d}}~\\unit{cm}$ et $' + COTE2 + ' = {{eval:q;d}}~\\unit{cm}$. Calcule $'
    + ANGLE_B + '$, arrondi au degré.\n\n' + FIG_ANG + '\n\n$' + ANGLE_B + ' \\approx ?' + DEG
    + '$',
    [var('s', '0..2'), var('o', '0..1'), var('f', '0..2'), var('pp', '40..140'),
     var('qq', '50..150'), var('p', 'eval:pp/10'), var('q', 'eval:qq/10'), var('ang', ANG8)],
    [case('{{eval:round(ang)}}', [
        erreur('{{eval:90-round(ang)}}', E_AUTRE_ANGLE, 'L\'autre angle aigu'),
        erreur(AUTRE_RAPPORT, E_RAPPORT, 'Mauvais rapport'),
    ])],
    ['Dans le triangle $' + ABC + '$ rectangle en $' + A + '$ : $$' + FONC + ANGLE_B
     + ' = \\dfrac{' + COTE1 + '}{' + COTE2 + '} = \\dfrac{ {{eval:p;d}} }{ {{eval:q;d}} }$$',
     'À la calculatrice (touche $' + FONC + '^{-1}$, en degrés) : $$' + ANGLE_B + ' \\approx '
     + couleur('{{eval:round(ang)}}' + DEG) + '$$ (arrondi au degré).'],
    'Repère la position des deux côtés connus par rapport à l\'angle $' + ANGLE_B + '$ '
    '(adjacent, opposé, hypoténuse) : ils te disent quel rapport écrire. Utilise ensuite la '
    'touche inverse de la calculatrice, en degrés.',
    ['pp < qq', 'round(ang) >= 15', 'round(ang) <= 75', arrondi_net('ang', 1),
     f'round(ang) != 90-round(ang)', f'{AUTRE_RAPPORT} != round(ang)',
     f'{AUTRE_RAPPORT} != 90-round(ang)'],
)

V8 = {'s': 0, 'o': 0, 'f': 0, 'pp': 46, 'qq': 72, 'ang': '50.2878'}   # cos B = 4,6/7,2 → 50°
V8_TAN = {'s': 1, 'o': 1, 'f': 2, 'pp': 53, 'qq': 81, 'ang': '33.1966'}  # tan S = 5,3/8,1 → 33°
SPECS_57 += [
    spec('F1 v8 : cos B = 4,6/7,2 : B ≈ 50°', 3, V8, 'correct', ['50']),
    spec('F1 v8 : l\'autre angle', 3, V8, 'incorrect', ['40'], resoudre(E_AUTRE_ANGLE, V8)),
    spec('F1 v8 : tangente au lieu du cosinus', 3, V8, 'incorrect', ['33'], E_RAPPORT),
    spec('F1 v8 : tan S = 5,3/8,1 : S ≈ 33°', 3, V8_TAN, 'correct', ['33']),
    spec('F1 v8 : rapport renversé (autre angle)', 3, V8_TAN, 'incorrect', ['57'],
         resoudre(E_AUTRE_ANGLE, V8_TAN)),
    spec('F1 v8 : sinus au lieu de la tangente', 3, V8_TAN, 'incorrect', ['41'], E_RAPPORT),
]

# v9 : les trois côtés donnés. AB = a, AC = c entiers, BC = h arrondi au dixième.
ANG9 = 'atan(c/a)*180/\\pi'
F1_V9 = variation(
    'Le triangle $' + ABC + '$ est rectangle en $' + A + '$. On donne $' + ADJ
    + ' = {{a}}~\\unit{cm}$, $' + OPP + ' = {{c}}~\\unit{cm}$ et $' + HYP
    + ' = {{eval:h;d}}~\\unit{cm}$. Calcule $' + ANGLE_B + '$, arrondi au degré.\n\n'
    + FIG_ANG + '\n\n$' + ANGLE_B + ' \\approx ?' + DEG + '$',
    [var('s', '0..2'), var('o', '0..1'), var('a', '3..12'), var('c', '3..12'),
     var('h', 'eval:round(10*sqrt(a^2+c^2))/10'), var('ang', 'eval:' + ANG9)],
    [case('{{eval:round(ang)}}', [
        erreur('{{eval:90-round(ang)}}', E_AUTRE_ANGLE, 'L\'autre angle aigu'),
    ])],
    ['Trois rapports sont possibles. Les deux côtés de l\'angle droit sont donnés exactement : '
     'la tangente est le plus sûr. $$\\tan' + ANGLE_B + ' = \\dfrac{' + OPP + '}{' + ADJ
     + '} = \\dfrac{ {{c}} }{ {{a}} }$$',
     'À la calculatrice (touche $\\tan^{-1}$, en degrés) : $$' + ANGLE_B + ' \\approx '
     + couleur('{{eval:round(ang)}}' + DEG) + '$$ (arrondi au degré).',
     'Avec $\\cos' + ANGLE_B + ' = \\dfrac{ {{a}} }{ {{eval:h;d}} }$ ou $\\sin' + ANGLE_B
     + ' = \\dfrac{ {{c}} }{ {{eval:h;d}} }$, on trouve le même arrondi.'],
    'Tu peux choisir n\'importe quel rapport qui contient deux côtés connus : repère le côté '
    'adjacent, le côté opposé et l\'hypoténuse de l\'angle $' + ANGLE_B + '$.',
    ['a != c', 'round(ang) >= 20', 'round(ang) <= 70', arrondi_net('ang', 1),
     'round(acos(a/h)*180/\\pi) == round(ang)', 'round(asin(c/h)*180/\\pi) == round(ang)'],
)

V9 = {'s': 2, 'o': 0, 'a': 7, 'c': 4, 'h': '8.1', 'ang': '29.7449'}   # tan F = 4/7 → 30°
SPECS_57 += [
    spec('F1 v9 : EF = 7, EG = 4, FG = 8,1 : F ≈ 30°', 4, V9, 'correct', ['30']),
    spec('F1 v9 : l\'autre angle', 4, V9, 'incorrect', ['60'],
         resoudre(E_AUTRE_ANGLE, V9)),
    spec('F1 v9 : non arrondi', 4, V9, 'incorrect', ['29{,}7']),
]

ajouter('57c73be1', [F1_V5, F1_V6, F1_V7, F1_V8, F1_V9], SPECS_57)

# =============================================================================================
# dbd5debf — 3-023, écrire cos, sin ou tan. F2 : v5 saisie libre ; v6 triangles imbriqués.
# =============================================================================================

MDB = charger('dbd5debf')
FIG_DB = figure_de(MDB['variations'][0]['statement'])          # angle B marqué
# Angle marqué selon g : B (g = 0) ou C (g = 1)
MARQUE_B = 'angle(' + C + ', ' + B + ', ' + A + ')'
MARQUE_C = 'angle(' + A + ', ' + C + ', ' + B + ')'
assert MARQUE_B in FIG_DB
FIG_DB_G = FIG_DB.replace(MARQUE_B, '{{if:g==0|' + MARQUE_B + '|' + MARQUE_C + '}}').replace(
    'angle en ' + B + ' marqué', 'angle en {{if:g==0|' + B + '|' + C + '}} marqué')

JEUX4 = [('A', 'B', 'C', 'H'), ('R', 'S', 'T', 'K'), ('E', 'F', 'G', 'P')]


def par_jeu(fn, jeux=JEUX4):
    """Texte écrit une fois par jeu de lettres, choisi par `s` (lettres d'indice calculé)."""
    return ''.join(f'{{{{if:s=={k}|{fn(j)}|}}}}' for k, j in enumerate(jeux))


ANGLE_G = '\\widehat{{{if:g==0|' + ABC + '|' + A + C + B + '}}}'
FONC_F = '{{if:f==0|\\cos|}}{{if:f==1|\\sin|}}{{if:f==2|\\tan|}}'

# v5. Indices : A 0, B 1, C 2. Angle en B (g = 0) : adjacent AB, opposé AC ; en C : l'inverse.
# cos = adj/hyp, sin = opp/hyp, tan = opp/adj. Numérateur (0, nb), dénominateur (da, db).
# Erreur « autre côté » : (0, x)/(BC), x = 3 − nb (cos, sin) ou nb (tan : hypoténuse prise).
VARS_RAPPORT = [
    var('nb', 'eval:1+g+min(f,1)*(1-2*g)'),
    var('da', 'eval:1-floor(f/2)'), var('db', 'eval:2-floor(f/2)*(1-g)'),
]


def num_grand(j):
    return j[0] + '{{if:nb==1|' + j[1] + '|' + j[2] + '}}'


def den_grand(j):
    return ('{{if:da==0|' + j[0] + '|' + j[1] + '}}{{if:db==1|' + j[1] + '|' + j[2] + '}}')


def frac(n, d):
    return '\\frac{' + n + '}{' + d + '}'


NUM5 = par_jeu(num_grand)
DEN5 = par_jeu(den_grand)
BC5 = B + C
REP5 = par_jeu(lambda j: frac(num_grand(j), den_grand(j)))
RENV5 = par_jeu(lambda j: frac(den_grand(j), num_grand(j)))
COTE5 = par_jeu(lambda j: frac(j[0] + '{{if:x==1|' + j[1] + '|' + j[2] + '}}', j[1] + j[2]))
E_RENVERSE = ('Tu as renversé le rapport : {{if:f==2|le côté adjacent|l\'hypoténuse}} va au '
              '**dénominateur**.')
E_COTE = ('{{if:f==2|La tangente ne fait pas intervenir l\'hypoténuse : c\'est le côté opposé '
          'sur le côté adjacent.|Tu as pris l\'autre côté de l\'angle droit : le côté adjacent '
          'touche l\'angle, le côté opposé est en face.}}')
F2_V5 = variation(
    'Le triangle $' + ABC + '$ est rectangle en $' + A + '$. Écris $' + FONC_F + ANGLE_G
    + '$ comme un quotient de deux longueurs du triangle.\n\n' + FIG_DB_G + '\n\n$' + FONC_F
    + ANGLE_G + ' = ?$',
    [var('s', '0..2'), var('o', '0..1'), var('f', '0..2'), var('g', '0..1')] + VARS_RAPPORT
    + [var('x', 'eval:3-nb-floor(f/2)*(3-2*nb)')],
    [case(REP5, [
        erreur(RENV5, E_RENVERSE, 'Rapport renversé'),
        erreur(COTE5, E_COTE, 'Mauvais côté de l\'angle droit'),
    ])],
    ['Pour l\'angle $' + ANGLE_G + '$ : l\'**hypoténuse** est $' + BC5 + '$ (en face de '
     'l\'angle droit), le **côté adjacent** est $' + A + '{{if:g==0|' + B + '|' + C
     + '}}$, le **côté opposé** est $' + A + '{{if:g==0|' + C + '|' + B + '}}$.',
     '$$' + FONC_F + ' = \\dfrac{\\text{{{if:f==0|côté adjacent|côté opposé}}}}'
     '{\\text{{{if:f==2|côté adjacent|hypoténuse}}}} \\quad\\text{donc}\\quad ' + FONC_F
     + ANGLE_G + ' = ' + couleur(REP5.replace('\\frac', '\\dfrac')) + '$$'],
    'Repère l\'hypoténuse (en face de l\'angle droit), puis le côté adjacent (il touche '
    'l\'angle) et le côté opposé (en face de l\'angle). Le cosinus et le sinus divisent par '
    'l\'hypoténuse, la tangente par le côté adjacent.',
)

V_COS_B = {'s': 0, 'o': 0, 'f': 0, 'g': 0, 'nb': 1, 'da': 1, 'db': 2, 'x': 2}
V_TAN_C = {'s': 1, 'o': 1, 'f': 2, 'g': 1, 'nb': 1, 'da': 0, 'db': 2, 'x': 1}
V_SIN_C = {'s': 2, 'o': 0, 'f': 1, 'g': 1, 'nb': 1, 'da': 1, 'db': 2, 'x': 2}
SPECS_DB = [
    spec('F2 v5 : cos B = AB/BC', 0, V_COS_B, 'correct', ['\\frac{AB}{BC}']),
    spec('F2 v5 : cos B = BA/CB (sens des lettres libre)', 0, V_COS_B, 'correct',
         ['\\frac{BA}{CB}']),
    spec('F2 v5 : cos B renversé', 0, V_COS_B, 'incorrect', ['\\frac{BC}{AB}'],
         resoudre(E_RENVERSE, V_COS_B)),
    spec('F2 v5 : cos B avec le côté opposé', 0, V_COS_B, 'incorrect', ['\\frac{AC}{BC}'],
         resoudre(E_COTE, V_COS_B)),
    spec('F2 v5 : une seule longueur', 0, V_COS_B, 'incorrect', ['AB']),
    spec('F2 v5 : tan T = RS/RT', 0, V_TAN_C, 'correct', ['\\frac{RS}{RT}']),
    spec('F2 v5 : tan T renversé', 0, V_TAN_C, 'incorrect', ['\\frac{RT}{RS}'],
         resoudre(E_RENVERSE, V_TAN_C)),
    spec('F2 v5 : tan T avec l\'hypoténuse', 0, V_TAN_C, 'incorrect', ['\\frac{RS}{ST}'],
         resoudre(E_COTE, V_TAN_C)),
    spec('F2 v5 : sin G = EF/FG', 0, V_SIN_C, 'correct', ['\\frac{EF}{FG}']),
    spec('F2 v5 : sin G avec le côté adjacent', 0, V_SIN_C, 'incorrect', ['\\frac{EG}{FG}'],
         resoudre(E_COTE, V_SIN_C)),
]

# v6. Indices : A 0, B 1, C 2, H 3 (pied de la hauteur issue de A). Angle en B (g = 0) :
# grand triangle comme v5 ; petit triangle ABH rectangle en H : hyp AB, adj BH, opp AH.
# Angle en C : petit triangle ACH : hyp AC, adj CH, opp AH. Sommet de l'angle : W (B ou C).
# Petit triangle : cos = WH/AW ; sin = AH/AW ; tan = AH/WH.
A4, B4, C4, H4 = (lettre(JEUX4, i) for i in range(4))


def w(j):
    return '{{if:g==0|' + j[1] + '|' + j[2] + '}}'


def num_petit(j):
    return '{{if:f==0|' + w(j) + '|' + j[0] + '}}' + j[3]


def den_petit(j):
    return '{{if:f==2|' + w(j) + j[3] + '|' + j[0] + w(j) + '}}'


SOMMET = par_jeu(w)
PETIT = A4 + SOMMET + H4
REP6 = par_jeu(lambda j: frac(num_grand(j), den_grand(j)))
RENV6 = par_jeu(lambda j: frac(den_grand(j), num_grand(j)))
REP6P = par_jeu(lambda j: frac(num_petit(j), den_petit(j)))
RENV6P = par_jeu(lambda j: frac(den_petit(j), num_petit(j)))
GRAND6P = par_jeu(lambda j: frac(num_petit(j), j[1] + j[2]))
ANGLE_GRAND = '\\widehat{' + A4 + SOMMET + '{{if:g==0|' + C4 + '|' + B4 + '}}}'
ANGLE_PETIT = '\\widehat{' + A4 + SOMMET + H4 + '}'
FIG_V6 = (
    '```figure\nfenetre: 0 ; 10 ; 0 ; 6.5\ndescription: Triangle ' + A4 + B4 + C4
    + ' rectangle en ' + A4 + ', ' + H4 + ' pied de la hauteur issue de ' + A4 + ' sur ['
    + B4 + C4 + '], angle en ' + SOMMET + ' marqué.\n---\n'
    + B4 + ' = point(1, 1, etiquette="bas-gauche")\n'
    + C4 + ' = point(9, 1, etiquette="bas-droite")\n'
    + A4 + ' = point(' + B4 + ', longueur=8*cos({{bb}}), angle={{bb}}, etiquette="haut")\n'
    + H4 + ' = point(' + B4 + ', longueur=8*cos({{bb}})*cos({{bb}}), angle=0, '
    'etiquette="bas")\n'
    + 'segment(' + A4 + ', ' + B4 + ')\nsegment(' + B4 + ', ' + C4 + ')\nsegment(' + C4 + ', '
    + A4 + ')\nsegment(' + A4 + ', ' + H4 + ')\n'
    + 'angle(' + B4 + ', ' + A4 + ', ' + C4 + ', marque="carre")\n'
    + 'angle(' + A4 + ', ' + H4 + ', ' + C4 + ', marque="carre")\n'
    + '{{if:g==0|angle(' + C4 + ', ' + B4 + ', ' + A4 + ')|angle(' + A4 + ', ' + C4 + ', '
    + B4 + ')}}\n```'
)
E_GRAND_HYP = ('Dans le petit triangle, l\'hypoténuse n\'est pas celle du grand : c\'est le '
               'côté en face de **son** angle droit, en $' + H4 + '$.')
F2_V6 = variation(
    'Le triangle $' + A4 + B4 + C4 + '$ est rectangle en $' + A4 + '$ et $' + H4 + '$ est le '
    'pied de la hauteur issue de $' + A4 + '$. Écris $' + FONC_F + '$ de l\'angle marqué de '
    'deux façons : dans le triangle $' + A4 + B4 + C4 + '$, puis dans le triangle $' + PETIT
    + '$.\n\n' + FIG_V6 + '\n\nDans le triangle $' + A4 + B4 + C4 + '$ : $' + FONC_F
    + ANGLE_GRAND + ' = ?$\n\nDans le triangle $' + PETIT + '$ : $' + FONC_F + ANGLE_PETIT
    + ' = ?$',
    [var('s', '0..2'), var('f', '0..2'), var('g', '0..1'), var('bb', '35..55')]
    + VARS_RAPPORT,
    [case(REP6, [erreur(RENV6, E_RENVERSE, 'Rapport renversé')]),
     case(REP6P, [
         erreur(RENV6P, E_RENVERSE, 'Rapport renversé'),
         erreur(GRAND6P, E_GRAND_HYP, 'Hypoténuse du grand triangle'),
     ])],
    ['Les angles $' + ANGLE_GRAND + '$ et $' + ANGLE_PETIT + '$ sont le même angle : ses deux '
     'triangles rectangles donnent deux écritures.',
     'Dans le triangle $' + A4 + B4 + C4 + '$ (angle droit en $' + A4 + '$, hypoténuse $' + B4
     + C4 + '$) : $$' + FONC_F + ANGLE_GRAND + ' = ' + couleur(REP6.replace('\\frac', '\\dfrac'))
     + '$$',
     'Dans le triangle $' + PETIT + '$ (angle droit en $' + H4 + '$, hypoténuse $' + A4 + SOMMET
     + '$) : $$' + FONC_F + ANGLE_PETIT + ' = ' + couleur(REP6P.replace('\\frac', '\\dfrac'))
     + '$$'],
    'Dans chaque triangle rectangle, repère son hypoténuse, en face de **son** angle droit : '
    'ce n\'est pas la même dans les deux triangles.',
)

V6_COS_B = {'s': 0, 'f': 0, 'g': 0, 'bb': 40, 'nb': 1, 'da': 1, 'db': 2}
V6_TAN_C = {'s': 1, 'f': 2, 'g': 1, 'bb': 50, 'nb': 1, 'da': 0, 'db': 2}
SPECS_DB += [
    spec('F2 v6 : cos B = AB/BC = BH/AB', 1, V6_COS_B, 'correct',
         ['\\frac{AB}{BC}', '\\frac{BH}{AB}']),
    spec('F2 v6 : cos B = BA/BC = HB/BA', 1, V6_COS_B, 'correct',
         ['\\frac{BA}{BC}', '\\frac{HB}{BA}']),
    spec('F2 v6 : petit triangle renversé', 1, V6_COS_B, 'incorrect',
         ['\\frac{AB}{BC}', '\\frac{AB}{BH}'], resoudre(E_RENVERSE, V6_COS_B)),
    spec('F2 v6 : hypoténuse du grand triangle', 1, V6_COS_B, 'incorrect',
         ['\\frac{AB}{BC}', '\\frac{BH}{BC}'], resoudre(E_GRAND_HYP, V6_COS_B)),
    spec('F2 v6 : grand triangle renversé', 1, V6_COS_B, 'incorrect',
         ['\\frac{BC}{AB}', '\\frac{BH}{AB}'], resoudre(E_RENVERSE, V6_COS_B)),
    spec('F2 v6 : tan T = RS/RT = RK/TK', 1, V6_TAN_C, 'correct',
         ['\\frac{RS}{RT}', '\\frac{RK}{TK}']),
    spec('F2 v6 : tan T, petit triangle renversé', 1, V6_TAN_C, 'incorrect',
         ['\\frac{RS}{RT}', '\\frac{TK}{RK}'], resoudre(E_RENVERSE, V6_TAN_C)),
]

ajouter('dbd5debf', [F2_V5, F2_V6], SPECS_DB)
