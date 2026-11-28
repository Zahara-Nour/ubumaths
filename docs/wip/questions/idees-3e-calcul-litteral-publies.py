"""Ajoute les variations validées aux 12 modèles publiés exportés de prod dans
scripts/questions/idees-3e-calcul-litteral-publies/ (chantier idees-3e-calcul-litteral).

Phase 0 validée par David le 2026-11-23 (« je suis tes recos ») : fiches F1 à F12 du journal
(docs/archive/wip/idees-3e-calcul-litteral/idees-3e-calcul-litteral-progress.md, § Phase 0 › Variations de modèles publiés).
Les variations s'ajoutent À LA FIN (les réponses des élèves gardent l'indice de leur variation) ;
la migration de contenu est générée par scripts/questions/migration-contenu.ts. Seuls
`variations` et `testSpecs` changent : les `options` (c32ebff9 : `brackets` strict) jugent aussi
les variations publiées, on n'y touche pas.

Le script repart du contenu de prod (variations et specs d'origine, comptées dans ORIGINE) :
le relancer réécrit les ajouts sans les doubler.

Décisions et pièges du lot :
- La forme réduite (ou factorisée) est exigée par la contrainte `form` (strict par défaut,
  ADR 0013), comme dans les variations publiées : aucun `requiredForm` ajouté. Une écriture
  juste mais non réduite (« parenthèses ôtées sans réduire », « développé au lieu de factorisé »,
  « 2(x² − 9) non fini ») a la MÊME valeur que la réponse : ce n'est pas une erreur prévue (le
  juge compare la valeur) mais une spec `bad_form`.
- Une erreur qui n'a de sens que pour une partie des tirages (signe − devant la parenthèse…) est
  écrite `{{if:…|<erreur>|<bonne réponse>}}` : sur les autres tirages elle tombe sur la bonne
  réponse et elle est ignorée.
- Pas de variable nommée `e` (constante d'Euler pour le parseur) ni `i` : sélecteurs `w`, `t`.
- Lettres dans un calcul `{{eval:…}}` : variable lettre `x|x` (ou `a|a`), comme les variations
  publiées.
- F11 et F12 (ensembles de solutions, `intervalles`) : pas d'erreurs prévues (nature exclue),
  erreurs typiques en specs `incorrect`.
- F12 (v4) : la fiche dit « k de 1 à 3 » ET « solutions fractionnaires » ; avec k ≤ 3 et c
  entier, x² = −c/k n'a jamais de solution fractionnaire : le cas fractionnaire prend k = 4 ou 9
  (4x² − 9 = 0), les autres cas gardent k de 1 à 3.

Usage : python3 docs/wip/questions/idees-3e-calcul-litteral-publies.py scripts/questions/idees-3e-calcul-litteral-publies
"""
import json
import os
import sys

DOSSIER = sys.argv[1]

P0 = '\\textcolor{{{color:primary.0}}}'
P1 = '\\textcolor{{{color:primary.1}}}'

# id court → (variations, specs) d'origine en prod (export du 2026-11-23)
ORIGINE = {'c32ebff9': (2, 11), '54107079': (16, 33), '93a5f7a9': (18, 36), '77b82211': (3, 7),
           'dcaabf69': (5, 13), '18e2afca': (5, 17), 'ff9bb2fb': (2, 4), 'c81c5852': (2, 5),
           '779ee55a': (1, 5), '44a3062b': (4, 7), '2ab49a6f': (5, 14), '3806ee3d': (3, 9)}


def spec(desc, vi, variables_, status, answers, message=None, violations=None):
    expected = {'status': status}
    if violations is None and status == 'bad_form':
        violations = ['form']
    if violations:
        expected['constraintViolations'] = violations
    if message is not None:
        expected['expectedErrorMessage'] = message
    return {'description': desc, 'variationIndex': vi,
            'variables': {k: str(v) for k, v in variables_.items()},
            'expected': expected, 'answers': answers}


def var(nom, expression):
    return {'name': nom, 'expression': expression}


def erreur(answer, message, label):
    return {'answer': answer, 'message': message, 'label': label}


def case(attendue, erreurs=None, extra=None):
    c = {'expectedAnswer': attendue}
    if extra:
        c.update(extra)
    if erreurs:
        c['expectedErrors'] = erreurs
    return c


def variation(statement, variables, blanks, steps, hint, conditions=None):
    return {'statement': statement, 'variables': variables, 'conditions': conditions or [],
            'blanks': blanks, 'correction': {'steps': steps}, 'hint': hint}


def si(condition, alors, sinon):
    return '{{if:' + condition + '|' + alors + '|' + sinon + '}}'


def couleur(contenu, c=P0):
    return c + '{' + contenu + '}'


# Correctif d'une variation PUBLIÉE (validé par David le 2026-11-24) : dans le corrigé de
# dcaabf69 v1, `{{eval:-(d)*x-(f)}}` est un binôme que le moteur peut réordonner (« 9-5x ») ;
# collé derrière `{{eval:(b)*x+(c)}}`, il soudait deux nombres (« 6x+69-5x »). On écrit les deux
# termes séparément, signe forcé (d ≥ 1, donc −dx est toujours négatif). Idempotent.
CORRECTIFS = {
    ('dcaabf69', 1, 2): ('{{eval:(b)*x+(c)}}{{eval:-(d)*x-(f)}}',
                         '{{eval:(b)*x+(c)}}{{eval:-(d)*x;+}}{{eval:-(f);+}}'),
}


def corriger_publiee(court, m):
    for (c, vi, etape), (ancien, nouveau) in CORRECTIFS.items():
        if c != court:
            continue
        steps = m['variations'][vi]['correction']['steps']
        steps[etape] = steps[etape].replace(ancien, nouveau)


def ajouter(court, variations, specs):
    chemin = os.path.join(DOSSIER, court + '.json')
    with open(chemin, encoding='utf-8') as f:
        m = json.load(f)
    nv, ns = ORIGINE[court]
    m['variations'] = m['variations'][:nv]
    m['testSpecs'] = m['testSpecs'][:ns]
    corriger_publiee(court, m)
    for s in specs:
        s['variationIndex'] += nv
    m['variations'] += variations
    m['testSpecs'] += specs
    with open(chemin, 'w', encoding='utf-8') as f:
        json.dump(m, f, ensure_ascii=False, indent='\t')
        f.write('\n')
    print(f'{court} : {nv} + {len(variations)} variations, {ns} + {len(specs)} specs')


X = var('x', 'x|x')
REGLE_PARENTHESES = ('**Suppression des parenthèses.** Des parenthèses précédées du signe $+$ '
                     's’enlèvent sans rien changer ; précédées du signe $-$, on les enlève en '
                     'changeant le signe de chaque terme.')
CONSIGNE_F1 = 'Supprime les parenthèses, puis réduis l\'expression.'

# =============================================================================================
# c32ebff9 — 3-011, enlever les parenthèses. F1 : (v2) k ± (ax + b), kx ± (ax + b) ;
# (v3) (ax + b) − (cx + d), −(ax + b) + (cx + d) ; (v4) (ax² + bx + c) − (dx² + fx + g).
# Le modèle a `brackets: strict` : une parenthèse gardée est refusée.
# =============================================================================================

ERR_F1_UN = ('Devant une parenthèse précédée de $-$, on change le signe de TOUS ses termes, pas '
             'seulement du premier.')
ERR_F1_AUCUN = ('Une parenthèse précédée de $-$ s\'enlève en changeant le signe de chacun de ses '
                'termes.')
ERR_F1_NOMBRE = ('Un nombre et un terme en $x$ ne s\'additionnent pas : ce ne sont pas des termes '
                 'semblables.')
ERR_F1_X2 = ('Les termes en $x^2$ et les termes en $x$ ne sont pas semblables : ils ne se '
             'regroupent pas.')

# (v2) g = 0 : nombre devant ; g = 1 : terme en x devant. w = 0 : + ; w = 1 : −.
BON_F1A = '{{eval:(c*g+(s)*(a))*x+(c*(1-g)+(s)*(b))}}'
F1_A = variation(
    CONSIGNE_F1 + '\n\n$${{eval:c*x^g}}' + si('w==0', '+', '-') + '({{eval:a*x+(b)}})$$\n\n$?$',
    [X, var('g', '0..1'), var('w', '0..1'), var('s', 'eval:1-2*w'), var('c', '1..9;±'),
     var('a', '1..9;±'), var('b', '1..9;±')],
    [case(BON_F1A, [
        erreur(si('w==1', '{{eval:(c*g-(a))*x+(c*(1-g)+(b))}}', BON_F1A), ERR_F1_UN,
               'Seul le premier terme a changé de signe'),
        erreur(si('w==1', '{{eval:(c*g+(a))*x+(c*(1-g)+(b))}}', BON_F1A), ERR_F1_AUCUN,
               'Signes non changés derrière un −'),
        erreur(si('g==0', '{{eval:(c+(s)*(a))*x+(s)*(b)}}', BON_F1A), ERR_F1_NOMBRE,
               'Nombre ajouté au terme en x'),
    ])],
    [
        REGLE_PARENTHESES,
        'Les parenthèses sont précédées du signe ' + couleur(si('w==0', '+', '-'), '$' + P1)
        + '$ : ' + si('w==0', 'on les enlève sans changer les termes.',
                      'on change le signe de chacun de leurs termes.'),
        '$$\\begin{align} {{eval:c*x^g}}' + couleur(si('w==0', '+', '-'), P1)
        + '({{eval:a*x+(b)}}) &= {{eval:c*x^g}}' + couleur('{{eval:(s)*(a)*x;+}}{{eval:(s)*(b);+}}')
        + ' \\\\ &= {{solution}} \\end{align}$$',
        'On a regroupé les termes en $x$ entre eux et les nombres entre eux.',
    ],
    'Regarde le signe devant la parenthèse, enlève-la, puis regroupe les termes en $x$ et les '
    'nombres.',
    ['c*g+(s)*(a) != 0', 'c*(1-g)+(s)*(b) != 0'],
)

# (v3) w = 0 : (ax + b) − (cx + d) ; w = 1 : −(ax + b) + (cx + d).
F1_B = variation(
    CONSIGNE_F1 + '\n\n$$' + si('w==1', '-', '') + '({{eval:a*x+(b)}})' + si('w==0', '-', '+')
    + '({{eval:c*x+(d)}})$$\n\n$?$',
    [X, var('w', '0..1'), var('s', 'eval:1-2*w'), var('a', '1..9;±'), var('b', '1..9;±'),
     var('c', '1..9;±'), var('d', '1..9;±')],
    [case('{{eval:(s)*(a-(c))*x+(s)*(b-(d))}}', [
        erreur('{{eval:(s)*(a-(c))*x+(b+(d))}}', ERR_F1_UN,
               'Seul le premier terme a changé de signe'),
        erreur('{{eval:(a+(c))*x+(b+(d))}}', ERR_F1_AUCUN, 'Signes non changés derrière un −'),
    ])],
    [
        REGLE_PARENTHESES,
        '$$\\begin{align} ' + si('w==1', '-', '') + '({{eval:a*x+(b)}})' + si('w==0', '-', '+')
        + '({{eval:c*x+(d)}}) &= '
        + si('w==0', '{{eval:a*x+(b)}}' + couleur('{{eval:-(c)*x;+}}{{eval:-(d);+}}'),
             couleur('{{eval:-(a)*x}}{{eval:-(b);+}}') + '{{eval:c*x;+}}{{eval:d;+}}')
        + ' \\\\ &= {{solution}} \\end{align}$$',
        'On a regroupé les termes en $x$ entre eux et les nombres entre eux.',
    ],
    'Seule la parenthèse précédée de $-$ change les signes de ses termes. Enlève les deux '
    'parenthèses, puis regroupe.',
    ['a != c', 'b != d'],
)

# (v4) (ax² + bx + c) − (dx² + fx + g)
BON_F1C = '{{eval:(a-(d))*x^2+(b-(f))*x+(c-(g))}}'
F1_C = variation(
    CONSIGNE_F1 + '\n\n$$({{eval:a*x^2+(b)*x+(c)}})-({{eval:d*x^2+(f)*x+(g)}})$$\n\n$?$',
    [X, var('a', '1..9;±'), var('b', '1..9;±'), var('c', '1..9;±'), var('d', '1..9;±'),
     var('f', '1..9;±'), var('g', '1..9;±')],
    [case(BON_F1C, [
        erreur('{{eval:(a-(d))*x^2+(b+(f))*x+(c+(g))}}', ERR_F1_UN,
               'Seul le premier terme a changé de signe'),
        erreur('{{eval:(a+(d))*x^2+(b+(f))*x+(c+(g))}}', ERR_F1_AUCUN,
               'Signes non changés derrière un −'),
        erreur('{{eval:(a-(d)+b-(f))*x^2+(c-(g))}}', ERR_F1_X2, 'Termes en x² et en x additionnés'),
    ])],
    [
        REGLE_PARENTHESES,
        '$$\\begin{align} ({{eval:a*x^2+(b)*x+(c)}})-({{eval:d*x^2+(f)*x+(g)}}) &= '
        '{{eval:a*x^2+(b)*x+(c)}}' + couleur('{{eval:-(d)*x^2;+}}{{eval:-(f)*x;+}}{{eval:-(g);+}}')
        + ' \\\\ &= {{solution}} \\end{align}$$',
        'On a regroupé les termes en $x^2$, puis les termes en $x$, puis les nombres.',
    ],
    'Change le signe de chaque terme de la parenthèse précédée de $-$, puis regroupe les termes '
    'de même nature : $x^2$ avec $x^2$, $x$ avec $x$.',
    ['a != d', 'b != f', 'c != g'],
)

V_A = {'g': 0, 'w': 1, 'c': 3, 'a': 2, 'b': -5}  # 3 − (2x − 5) = −2x + 8
V_A2 = {'g': 1, 'w': 0, 'c': 4, 'a': -1, 'b': 6}  # 4x + (−x + 6) = 3x + 6
V_B = {'w': 0, 'a': 5, 'b': 2, 'c': 3, 'd': -4}  # (5x + 2) − (3x − 4) = 2x + 6
V_B2 = {'w': 1, 'a': 2, 'b': 7, 'c': 6, 'd': 1}  # −(2x + 7) + (6x + 1) = 4x − 6
V_C = {'a': 3, 'b': -2, 'c': 5, 'd': 1, 'f': 4, 'g': -3}  # 2x² − 6x + 8
SPECS_C32 = [
    spec('F1a : 3 − (2x − 5) = −2x + 8', 0, V_A, 'correct', ['-2x+8']),
    spec('F1a : ordre libre 8 − 2x', 0, V_A, 'correct', ['8-2x']),
    spec('F1a : parenthèses ôtées sans réduire', 0, V_A, 'bad_form', ['3-2x+5']),
    spec('F1a : parenthèse gardée', 0, V_A, 'bad_form', ['3-(2x-5)']),
    spec('F1a : seul le premier terme changé', 0, V_A, 'incorrect', ['-2x-2'], ERR_F1_UN),
    spec('F1a : signes non changés', 0, V_A, 'incorrect', ['2x-2'], ERR_F1_AUCUN),
    spec('F1a : nombre ajouté au terme en x', 0, V_A, 'incorrect', ['x+5'], ERR_F1_NOMBRE),
    spec('F1a : 4x + (−x + 6) = 3x + 6', 0, V_A2, 'correct', ['3x+6']),
    spec('F1a : 6 + 3x', 0, V_A2, 'correct', ['6+3x']),
    spec('F1b : (5x + 2) − (3x − 4) = 2x + 6', 1, V_B, 'correct', ['2x+6']),
    spec('F1b : ordre libre', 1, V_B, 'correct', ['6+2x']),
    spec('F1b : sans réduire', 1, V_B, 'bad_form', ['5x+2-3x+4']),
    spec('F1b : seul le premier terme changé', 1, V_B, 'incorrect', ['2x-2'], ERR_F1_UN),
    spec('F1b : signes non changés', 1, V_B, 'incorrect', ['8x-2'], ERR_F1_AUCUN),
    spec('F1b : −(2x + 7) + (6x + 1) = 4x − 6', 1, V_B2, 'correct', ['4x-6']),
    spec('F1b : seul le premier terme changé (−(…) devant)', 1, V_B2, 'incorrect', ['4x+8'],
         ERR_F1_UN),
    spec('F1c : 2x² − 6x + 8', 2, V_C, 'correct', ['2x^2-6x+8']),
    spec('F1c : ordre libre', 2, V_C, 'correct', ['8-6x+2x^2']),
    spec('F1c : sans réduire', 2, V_C, 'bad_form', ['3x^2-2x+5-x^2-4x+3']),
    spec('F1c : seul le premier terme changé', 2, V_C, 'incorrect', ['2x^2+2x+2'], ERR_F1_UN),
    spec('F1c : signes non changés', 2, V_C, 'incorrect', ['4x^2+2x+2'], ERR_F1_AUCUN),
    spec('F1c : x² et x additionnés', 2, V_C, 'incorrect', ['-4x^2+8'], ERR_F1_X2),
]

ajouter('c32ebff9', [F1_A, F1_B, F1_C], SPECS_C32)

# =============================================================================================
# 54107079 — 4-022, développer. F2 : (v16) kx(ax + b) ; (v17) k(ax + b) + c et c − k(ax + b).
# =============================================================================================

CONSIGNE_DEV = 'Développe et réduis :'
ERR_F2_UN = ('Tu n\'as multiplié que le premier terme de la parenthèse : le facteur multiplie '
             'chacun des termes.')
ERR_F2_CARRE = '$x \\times x = x^2$ : le produit de deux termes en $x$ est un terme en $x^2$.'
ERR_F2_X = ('Dans le second produit, tu as oublié le $x$ du facteur : il multiplie aussi le '
            'nombre.')
ERR_F2_SIGNE = ('Le signe $-$ devant le facteur change le signe de chacun des produits, le '
                'second compris.')
ERR_F2_ORDRE = ('La multiplication est prioritaire : on développe le produit avant de '
                'soustraire, on ne soustrait pas le nombre et le facteur d\'abord.')

F2_A = variation(
    CONSIGNE_DEV + '\n\n$${{eval:k*x}}({{eval:a*x+(b)}})$$\n\n$?$',
    [X, var('k', '2..9;±'), var('a', '1..9;±'), var('b', '1..9;±')],
    [case('{{eval:(k*a)*x^2+(k*b)*x}}', [
        erreur('{{eval:(k*a)*x^2+(b)}}', ERR_F2_UN, 'Second terme non multiplié'),
        erreur('{{eval:(k*a+k*b)*x}}', ERR_F2_CARRE, 'x × x = x'),
        erreur('{{eval:(k*a)*x^2+(k*b)}}', ERR_F2_X, 'x oublié dans le second produit'),
    ])],
    [
        '$$\\begin{align} ' + couleur('{{eval:k*x}}') + '({{eval:a*x+(b)}}) &= '
        + couleur('{{eval:k*x}}') + ' \\times {{if:a<0|({{eval:a*x}})|{{eval:a*x}}}} + ' + couleur('{{eval:k*x}}')
        + ' \\times {{if:b<0|({{b}})|{{b}}}} \\\\ &= {{solution}} \\end{align}$$',
        '$x \\times x = x^2$ : le premier produit est un terme en $x^2$.',
    ],
    'Multiplie le facteur placé devant la parenthèse par chacun de ses deux termes ; '
    '$x \\times x$ s\'écrit $x^2$.',
)

# w = 0 : k(ax + b) + c ; w = 1 : c − k(ax + b)
BON_F2B = '{{eval:((s)*(k)*(a))*x+((s)*(k)*(b)+(c))}}'
F2_B = variation(
    CONSIGNE_DEV + '\n\n$$' + si('w==0', '{{k}}({{eval:a*x+(b)}}){{eval:c;+}}',
                                 '{{c}}-{{k}}({{eval:a*x+(b)}})') + '$$\n\n$?$',
    [X, var('w', '0..1'), var('s', 'eval:1-2*w'), var('k', '2..9'), var('a', '1..9;±'),
     var('b', '1..9;±'), var('c', '1..9;±')],
    [case(BON_F2B, [
        erreur('{{eval:((s)*(k)*(a))*x+((s)*(b)+(c))}}', ERR_F2_UN, 'Second terme non multiplié'),
        erreur(si('w==1', '{{eval:(-(k)*(a))*x+((k)*(b)+(c))}}', BON_F2B), ERR_F2_SIGNE,
               'Signe du second produit'),
        erreur(si('w==1', '{{eval:((c)-(k))*(a)*x+((c)-(k))*(b)}}', BON_F2B), ERR_F2_ORDRE,
               '(c − k)(ax + b) : priorité oubliée'),
    ])],
    [
        si('w==0', 'On développe d\'abord le produit, puis on ajoute le nombre.',
           'La multiplication est prioritaire : on développe d\'abord $-{{k}}({{eval:a*x+(b)}})$, '
           'le signe $-$ devant le facteur compris.'),
        '$$\\begin{align} ' + si('w==0', '{{k}}({{eval:a*x+(b)}}){{eval:c;+}}',
                                  '{{c}}-{{k}}({{eval:a*x+(b)}})')
        + ' &= ' + si('w==0', couleur('{{eval:(k)*(a)*x}}{{eval:(k)*(b);+}}') + '{{eval:c;+}}',
                      '{{c}}' + couleur('{{eval:-(k)*(a)*x;+}}{{eval:-(k)*(b);+}}'))
        + ' \\\\ &= {{solution}} \\end{align}$$',
    ],
    'Développe d\'abord le produit (la multiplication est prioritaire), en gardant le signe '
    'placé devant le facteur, puis regroupe les nombres.',
    ['(s)*(k)*(b)+(c) != 0'],
)

V_KX = {'k': -3, 'a': 2, 'b': -5}  # −3x(2x − 5) = −6x² + 15x
V_C1 = {'w': 1, 'k': 3, 'a': 2, 'b': -4, 'c': 5}  # 5 − 3(2x − 4) = −6x + 17
V_C0 = {'w': 0, 'k': 4, 'a': -2, 'b': 3, 'c': -7}  # 4(−2x + 3) − 7 = −8x + 5
SPECS_541 = [
    spec('F2a : −3x(2x − 5) = −6x² + 15x', 0, V_KX, 'correct', ['-6x^2+15x']),
    spec('F2a : ordre libre', 0, V_KX, 'correct', ['15x-6x^2']),
    spec('F2a : recopiée', 0, V_KX, 'bad_form', ['-3x(2x-5)']),
    spec('F2a : second terme non multiplié', 0, V_KX, 'incorrect', ['-6x^2-5'], ERR_F2_UN),
    spec('F2a : x × x = x', 0, V_KX, 'incorrect', ['9x'], ERR_F2_CARRE),
    spec('F2a : x oublié', 0, V_KX, 'incorrect', ['-6x^2+15'], ERR_F2_X),
    spec('F2b : 5 − 3(2x − 4) = −6x + 17', 1, V_C1, 'correct', ['-6x+17']),
    spec('F2b : 17 − 6x', 1, V_C1, 'correct', ['17-6x']),
    spec('F2b : non réduit', 1, V_C1, 'bad_form', ['5-6x+12']),
    spec('F2b : second terme non multiplié', 1, V_C1, 'incorrect', ['-6x+9'], ERR_F2_UN),
    spec('F2b : signe du second produit', 1, V_C1, 'incorrect', ['-6x-7'], ERR_F2_SIGNE),
    spec('F2b : (5 − 3)(2x − 4)', 1, V_C1, 'incorrect', ['4x-8'], ERR_F2_ORDRE),
    spec('F2b : 4(−2x + 3) − 7 = −8x + 5', 1, V_C0, 'correct', ['-8x+5']),
    spec('F2b : second terme non multiplié (+ c)', 1, V_C0, 'incorrect', ['-8x-4'], ERR_F2_UN),
]

ajouter('54107079', [F2_A, F2_B], SPECS_541)

# =============================================================================================
# 93a5f7a9 — 3-012, réduire un produit. F3 : (v18) ax × bx et ax² × bx ; (v19) deux monômes à
# plusieurs lettres, (m·aᵘb) × (n·b·cᵛ), exemple du BO (a²b) × (bc).
# =============================================================================================

ERR_F3_CARRE = si('g==1', '$x \\times x = x^2$, et non $2 x$.',
                  '$x^2 \\times x = x^3$ : les exposants s\'ajoutent.')
ERR_F3_ADD = 'Dans un produit, les coefficients se multiplient, ils ne s\'additionnent pas.'
ERR_F3_SIGNE = 'Vérifie le signe : applique la règle des signes au produit des coefficients.'

F3_A = variation(
    'Réduis :\n\n$${{eval:a*x^g}} \\times ' + si('b<0', '({{eval:b*x}})', '{{eval:b*x}}') + '$$\n\n$?$',
    [X, var('g', '1..2'), var('a', '2..9;±'), var('b', '2..9;±')],
    [case('{{eval:(a*b)*x^(g+1)}}', [
        erreur(si('g==1', '{{eval:2*(a)*(b)*x}}', '{{eval:(a)*(b)*x^2}}'), ERR_F3_CARRE,
               'Puissances de x mal multipliées'),
        erreur('{{eval:((a)+(b))*x^(g+1)}}', ERR_F3_ADD, 'Coefficients additionnés'),
        erreur('{{eval:(-(a)*(b))*x^(g+1)}}', ERR_F3_SIGNE, 'Signe du produit'),
    ])],
    [
        'On multiplie les nombres entre eux, puis les puissances de $x$ entre elles.',
        '$$\\begin{align} {{eval:a*x^g}} \\times ' + si('b<0', '({{eval:b*x}})', '{{eval:b*x}}')
        + ' &= ' + couleur('{{if:a<0|({{a}})|{{a}}}} \\times {{if:b<0|({{b}})|{{b}}}}')
        + ' \\times ' + couleur(si('g==1', 'x \\times x', 'x^2 \\times x'), P1)
        + ' \\\\ &= {{solution}} \\end{align}$$',
    ],
    'Multiplie les coefficients entre eux (règle des signes), puis les puissances de $x$ : '
    '$x \\times x = x^2$.',
)

F3_B = variation(
    'Réduis :\n\n$$({{eval:m*a^u*b}}) \\times ({{eval:n*b*c^v}})$$\n\n$?$',
    [var('a', 'a|a'), var('b', 'b|b'), var('c', 'c|c'), var('m', '1..9;±'), var('n', '1..9;±'),
     var('u', '1..2'), var('v', '0..1')],
    [case('{{eval:(m*n)*a^u*b^2*c^v}}', [
        erreur('{{eval:(2*(m)*(n))*a^u*b*c^v}}', '$b \\times b = b^2$, et non $2 b$.',
               'b × b = 2b'),
        erreur('{{eval:((m)+(n))*a^u*b^2*c^v}}', ERR_F3_ADD, 'Coefficients additionnés'),
        erreur('{{eval:(-(m)*(n))*a^u*b^2*c^v}}', ERR_F3_SIGNE, 'Signe du produit'),
    ])],
    [
        'On regroupe les nombres, puis chaque lettre avec elle-même : l\'ordre des facteurs d\'un '
        'produit ne compte pas.',
        '$$\\begin{align} ({{eval:m*a^u*b}}) \\times ({{eval:n*b*c^v}}) &= '
        + couleur('{{if:m<0|({{m}})|{{m}}}} \\times {{if:n<0|({{n}})|{{n}}}}')
        + ' \\times {{eval:a^u}} \\times ' + couleur('b \\times b', P1)
        + '{{if:v==1| \\times c|}} \\\\ &= {{solution}} \\end{align}$$',
    ],
    'Multiplie les coefficients entre eux, puis regroupe chaque lettre avec elle-même : '
    '$b \\times b = b^2$.',
)

SPECS_93 = [
    spec('F3a : 3x × (−4x) = −12x²', 0, {'g': 1, 'a': 3, 'b': -4}, 'correct', ['-12x^2']),
    spec('F3a : recopiée', 0, {'g': 1, 'a': 3, 'b': -4}, 'bad_form', ['3x\\times(-4x)'],
         violations=['signs', 'products', 'form']),
    spec('F3a : x × x = 2x', 0, {'g': 1, 'a': 3, 'b': -4}, 'incorrect', ['-24x'],
         '$x \\times x = x^2$, et non $2 x$.'),
    spec('F3a : coefficients additionnés', 0, {'g': 1, 'a': 3, 'b': -4}, 'incorrect', ['-x^2'],
         ERR_F3_ADD),
    spec('F3a : signe', 0, {'g': 1, 'a': 3, 'b': -4}, 'incorrect', ['12x^2'], ERR_F3_SIGNE),
    spec('F3a : −2x² × 5x = −10x³', 0, {'g': 2, 'a': -2, 'b': 5}, 'correct', ['-10x^3']),
    spec('F3a : x² × x = x²', 0, {'g': 2, 'a': -2, 'b': 5}, 'incorrect', ['-10x^2'],
         '$x^2 \\times x = x^3$ : les exposants s\'ajoutent.'),
    spec('F3b : (a²b) × (bc) = a²b²c', 1, {'m': 1, 'n': 1, 'u': 2, 'v': 1}, 'correct',
         ['a^2b^2c']),
    spec('F3b : recopiée', 1, {'m': 1, 'n': 1, 'u': 2, 'v': 1}, 'bad_form',
         ['a^2b\\times bc'], violations=['products', 'form']),
    spec('F3b : (2a²b) × (−3bc) = −6a²b²c', 1, {'m': 2, 'n': -3, 'u': 2, 'v': 1}, 'correct',
         ['-6a^2b^2c']),
    spec('F3b : autre ordre des lettres', 1, {'m': 2, 'n': -3, 'u': 2, 'v': 1}, 'correct',
         ['-6b^2a^2c']),
    spec('F3b : b × b = 2b', 1, {'m': 2, 'n': -3, 'u': 2, 'v': 1}, 'incorrect', ['-12a^2bc'],
         '$b \\times b = b^2$, et non $2 b$.'),
    spec('F3b : coefficients additionnés', 1, {'m': 2, 'n': -3, 'u': 2, 'v': 1}, 'incorrect',
         ['-a^2b^2c'], ERR_F3_ADD),
    spec('F3b : signe', 1, {'m': 2, 'n': -3, 'u': 2, 'v': 1}, 'incorrect', ['6a^2b^2c'],
         ERR_F3_SIGNE),
    spec('F3b : (−4ab) × (−5b) = 20ab²', 1, {'m': -4, 'n': -5, 'u': 1, 'v': 0}, 'correct',
         ['20ab^2']),
]

ajouter('93a5f7a9', [F3_A, F3_B], SPECS_93)

# =============================================================================================
# 77b82211 — réduire une somme (sans point). F4 : (v3) six termes en x², en x et nombres ;
# (v4) une somme déjà réduite : la réponse est elle-même.
# =============================================================================================

ERR_F4_X3 = ('$x^2$ et $x$ ne sont pas des termes semblables : on ne les additionne pas (et '
             '$x^2 + x$ ne fait pas $x^3$).')
ERR_F4_X2 = ('$x^2$ et $x$ ne sont pas des termes semblables : on ne les regroupe pas.')
ERR_F4_NB = 'Tu as oublié les nombres sans $x$ : ils se regroupent entre eux.'

F4_A = variation(
    'Réduis :\n\n$${{eval:a*x^2}}{{eval:b*x;+}}{{eval:c;+}}{{eval:d*x;+}}{{eval:f*x^2;+}}'
    '{{eval:g;+}}$$\n\n$?$',
    [X, var('a', '1..9;±'), var('b', '1..9;±'), var('c', '1..9;±'), var('d', '1..9;±'),
     var('f', '1..9;±'), var('g', '1..9;±')],
    [case('{{eval:(a+(f))*x^2+(b+(d))*x+(c+(g))}}', [
        erreur('{{eval:(a+(f)+(b)+(d))*x^3+(c+(g))}}', ERR_F4_X3, 'x² + x = x³'),
        erreur('{{eval:(a+(f)+(b)+(d))*x^2+(c+(g))}}', ERR_F4_X2, 'x² et x regroupés'),
        erreur('{{eval:(a+(f))*x^2+(b+(d))*x}}', ERR_F4_NB, 'Nombres oubliés'),
    ])],
    [
        'On regroupe les termes semblables : les termes en $x^2$, les termes en $x$, puis les '
        'nombres.',
        '$$\\begin{align} {{eval:a*x^2}}{{eval:b*x;+}}{{eval:c;+}}{{eval:d*x;+}}{{eval:f*x^2;+}}'
        '{{eval:g;+}} &= ' + couleur('({{a}}{{eval:f;+}})x^2')
        + ' + ' + couleur('({{b}}{{eval:d;+}})x', P1) + ' + ({{c}}{{eval:g;+}}) \\\\ '
        '&= {{solution}} \\end{align}$$',
    ],
    'Repère les termes en $x^2$, les termes en $x$ et les nombres : on n\'additionne que des '
    'termes de même nature.',
    ['a+(f) != 0', 'b+(d) != 0', 'c+(g) != 0', 'a+(f)+(b)+(d) != 0'],
)

F4_B = variation(
    'Réduis, si c\'est possible :\n\n$${{eval:a*x}}{{eval:b*x^2;+}}$$\n\n$?$',
    [X, var('a', '1..9;±'), var('b', '1..9;±')],
    [case('{{eval:(b)*x^2+(a)*x}}', [
        erreur('{{eval:(a+(b))*x^3}}', ERR_F4_X3, 'x² + x = x³'),
        erreur('{{eval:(a+(b))*x^2}}', ERR_F4_X2, 'x² et x regroupés'),
        erreur('{{eval:(a+(b))*x}}', ERR_F4_X2, 'x² et x regroupés en x'),
    ])],
    [
        'Un terme en $x$ et un terme en $x^2$ ne sont pas semblables : ils ne se regroupent pas.',
        'L\'expression est déjà réduite : $$\\textcolor{{{color:primary.0}}}{{{solution}}}$$',
    ],
    'Avant de regrouper, demande-toi si les termes sont semblables : $x$ et $x^2$ le sont-ils ?',
    ['a+(b) != 0'],
)

V_F4 = {'a': 3, 'b': -2, 'c': 5, 'd': 7, 'f': -1, 'g': -8}  # 2x² + 5x − 3
SPECS_77 = [
    spec('F4a : 2x² + 5x − 3', 0, V_F4, 'correct', ['2x^2+5x-3']),
    spec('F4a : ordre libre', 0, V_F4, 'correct', ['-3+5x+2x^2']),
    spec('F4a : non réduite', 0, V_F4, 'bad_form', ['3x^2-x^2+5x-3']),
    spec('F4a : x² + x = x³', 0, V_F4, 'incorrect', ['7x^3-3'], ERR_F4_X3),
    spec('F4a : x² et x regroupés', 0, V_F4, 'incorrect', ['7x^2-3'], ERR_F4_X2),
    spec('F4a : nombres oubliés', 0, V_F4, 'incorrect', ['2x^2+5x'], ERR_F4_NB),
    spec('F4b : 3x + 5x² déjà réduite', 1, {'a': 3, 'b': 5}, 'correct', ['3x+5x^2']),
    spec('F4b : 5x² + 3x', 1, {'a': 3, 'b': 5}, 'correct', ['5x^2+3x']),
    spec('F4b : 8x³', 1, {'a': 3, 'b': 5}, 'incorrect', ['8x^3'], ERR_F4_X3),
    spec('F4b : 8x²', 1, {'a': 3, 'b': 5}, 'incorrect', ['8x^2'], ERR_F4_X2),
    spec('F4b : 8x', 1, {'a': 3, 'b': 5}, 'incorrect', ['8x'], ERR_F4_X2),
    spec('F4b : −4x − 2x²', 1, {'a': -4, 'b': -2}, 'correct', ['-2x^2-4x']),
]

ajouter('77b82211', [F4_A, F4_B], SPECS_77)

# =============================================================================================
# dcaabf69 — 3-054, factoriser avec un facteur commun. F5 : (v5) c(ax + b) ± x(ax + b) ;
# (v6) (ax + b)(cx + d) − (fx + g)(ax + b), facteur commun en second et signe moins.
# =============================================================================================

REGLE_FC = ('**Facteur commun** : $k \\times A + k \\times B = k \\times (A + B)$ et '
            '$k \\times A - k \\times B = k \\times (A - B)$.')
ERR_F5_PRODUIT = ('Une fois le facteur commun mis devant, ce qui reste se met entre crochets '
                  'avec le signe de l\'expression : ici une somme, pas un produit.')
ERR_F5_SIGNE_X = 'Le signe $-$ devant le second terme reste dans le second facteur.'
ERR_F5_UN = ('Le signe $-$ devant la seconde parenthèse change le signe de TOUS ses termes, pas '
             'seulement du premier.')
ERR_F5_AUCUN = ('Après $-$, la parenthèse s\'enlève en changeant le signe de chacun de ses '
                'termes.')

FC5 = '({{eval:a*x+(b)}})'
BON_F5A = FC5 + '({{eval:(s)*x+(c)}})'
F5_A = variation(
    'Factorise :\n\n$${{c}}' + FC5 + si('w==0', '+', '-') + 'x' + FC5 + '$$\n\n$?$',
    [X, var('w', '0..1'), var('s', 'eval:1-2*w'), var('a', '1..5'), var('b', '1..9;±'),
     var('c', '2..9;±')],
    [case(BON_F5A, [
        erreur(si('w==0', '{{eval:(c)*x}}' + FC5, BON_F5A), ERR_F5_PRODUIT,
               'Produit au lieu de somme'),
        erreur(si('w==1', FC5 + '({{eval:x+(c)}})', BON_F5A), ERR_F5_SIGNE_X, 'Signe de x perdu'),
    ])],
    [
        REGLE_FC + ' Ici, le facteur commun est $' + couleur(FC5) + '$.',
        '$$' + couleur('{{c}}', P1) + couleur(FC5) + couleur(si('w==0', '+x', '-x'), P1)
        + couleur(FC5) + ' = ' + couleur(FC5) + '\\left[' + couleur('{{c}}' + si('w==0', '+x', '-x'), P1)
        + '\\right]$$',
        '$$' + couleur('{{solution}}') + '$$',
    ],
    'Repère la parenthèse qui se répète dans les deux termes : c\'est le facteur commun.',
    ['gcd(a, abs(b)) == 1'],
)

FC6 = '({{eval:a*x+(b)}})'
F5_B = variation(
    'Factorise :\n\n$$' + FC6 + '({{eval:c*x+(d)}})-({{eval:f*x+(g)}})' + FC6 + '$$\n\n$?$',
    [X, var('a', '1..5'), var('b', '1..9;±'), var('c', '2..6'), var('d', '1..9;±'),
     var('f', '1..5'), var('g', '1..9;±')],
    [case(FC6 + '({{eval:(c-(f))*x+(d-(g))}})', [
        erreur(FC6 + '({{eval:(c-(f))*x+(d+(g))}})', ERR_F5_UN,
               'Seul le premier terme a changé de signe'),
        erreur(FC6 + '({{eval:(c+(f))*x+(d+(g))}})', ERR_F5_AUCUN,
               'Signes non changés derrière un −'),
    ])],
    [
        REGLE_FC + ' Le facteur commun $' + couleur(FC6) + '$ est en tête dans le premier '
        'produit, en queue dans le second : l\'ordre des facteurs ne compte pas.',
        '$$' + couleur(FC6) + '({{eval:c*x+(d)}})-({{eval:f*x+(g)}})' + couleur(FC6) + ' = '
        + couleur(FC6) + '\\left[({{eval:c*x+(d)}})-({{eval:f*x+(g)}})\\right]$$',
        'Le signe $-$ devant la parenthèse change **tous** ses signes : $({{eval:c*x+(d)}})'
        '-({{eval:f*x+(g)}}) = {{eval:c*x}}{{eval:d;+}}{{eval:-(f)*x;+}}{{eval:-(g);+}} = '
        '{{eval:(c-(f))*x+(d-(g))}}$.',
        '$$' + couleur('{{solution}}') + '$$',
    ],
    'Le facteur commun n\'est pas à la même place dans les deux produits : cherche la parenthèse '
    'qui se répète. Attention au signe $-$ entre les deux produits.',
    ['c > f', 'd != g', 'gcd(c-f, abs(d-(g))) == 1', 'gcd(a, abs(b)) == 1', 'f != a || g != b',
     'c-f != a || d-(g) != b'],
)

V_F5A1 = {'w': 1, 'a': 2, 'b': 1, 'c': 3}  # 3(2x + 1) − x(2x + 1) = (2x + 1)(3 − x)
V_F5A0 = {'w': 0, 'a': 3, 'b': -2, 'c': -5}  # −5(3x − 2) + x(3x − 2) = (3x − 2)(x − 5)
V_F5B = {'a': 1, 'b': 4, 'c': 5, 'd': 2, 'f': 2, 'g': -3}  # (x + 4)(5x + 2) − (2x − 3)(x + 4)
SPECS_DC = [
    spec('F5a : 3(2x + 1) − x(2x + 1) = (2x + 1)(3 − x)', 0, V_F5A1, 'correct', ['(2x+1)(3-x)']),
    spec('F5a : (−x + 3)(2x + 1)', 0, V_F5A1, 'correct', ['(-x+3)(2x+1)']),
    spec('F5a : développé', 0, V_F5A1, 'bad_form', ['-2x^2+5x+3']),
    spec('F5a : signe de x perdu', 0, V_F5A1, 'incorrect', ['(2x+1)(x+3)'], ERR_F5_SIGNE_X),
    spec('F5a : −5(3x − 2) + x(3x − 2) = (3x − 2)(x − 5)', 0, V_F5A0, 'correct',
         ['(3x-2)(x-5)']),
    spec('F5a : produit au lieu de somme', 0, V_F5A0, 'incorrect', ['-5x(3x-2)'],
         ERR_F5_PRODUIT),
    spec('F5b : (x + 4)(5x + 2) − (2x − 3)(x + 4) = (x + 4)(3x + 5)', 1, V_F5B, 'correct', ['(x+4)(3x+5)']),
    spec('F5b : facteurs permutés', 1, V_F5B, 'correct', ['(3x+5)(x+4)']),
    spec('F5b : crochet non réduit', 1, V_F5B, 'bad_form', ['(x+4)(5x+2-2x+3)']),
    spec('F5b : seul le premier terme changé', 1, V_F5B, 'incorrect', ['(x+4)(3x-1)'],
         ERR_F5_UN),
    spec('F5b : signes non changés', 1, V_F5B, 'incorrect', ['(x+4)(7x-1)'], ERR_F5_AUCUN),
]

ajouter('dcaabf69', [F5_A, F5_B], SPECS_DC)

# =============================================================================================
# 18e2afca — 3-016, (a + b)² et (a − b)². F6 : (v5) (b + ax)² et (b − ax)², a de 2 à 5,
# b de 1 à 9 : le terme en x en second.
# =============================================================================================

SIGNE_W = si('w==0', '+', '-')
BON_F6 = '{{eval:b^2}}' + SIGNE_W + '{{eval:2*a*b}}x+{{eval:a^2}}x^2'
ERR_F6_DOUBLE = ('Tu as oublié le double produit : le carré d\'une somme ou d\'une différence '
                 'n\'est pas la somme des carrés.')
ERR_F6_DIFF = ('Le carré d\'une différence n\'est pas la différence des carrés : il y a un double '
               'produit, et le dernier carré est positif.')
ERR_F6_SIGNE = 'Vérifie le signe du double produit : il est celui du signe entre les deux termes.'
ERR_F6_CARRE = 'Le carré porte sur le nombre ET sur $x$ : il faut élever le coefficient au carré.'
F6 = variation(
    'Développe et réduis :\n\n$$({{b}}' + SIGNE_W + '{{a}}x)^2$$\n\n$?$',
    [var('w', '0..1'), var('a', '2..5'), var('b', '1..9')],
    [case(BON_F6, [
        erreur('{{eval:b^2}}+{{eval:a^2}}x^2', ERR_F6_DOUBLE, 'Double produit oublié'),
        erreur(si('w==1', '{{eval:b^2}}-{{eval:a^2}}x^2', BON_F6), ERR_F6_DIFF, 'b² − a²x²'),
        erreur('{{eval:b^2}}' + si('w==0', '-', '+') + '{{eval:2*a*b}}x+{{eval:a^2}}x^2',
               ERR_F6_SIGNE, 'Signe du double produit'),
        erreur('{{eval:b^2}}' + SIGNE_W + '{{eval:2*a*b}}x+{{a}}x^2', ERR_F6_CARRE,
               '(ax)² écrit ax²'),
    ])],
    [
        si('w==0', '**Carré d\'une somme** : $(a+b)^2=a^2+2ab+b^2$.',
           '**Carré d\'une différence** : $(a-b)^2=a^2-2ab+b^2$.')
        + ' Ici, $a={{b}}$ et $b={{a}}x$ : le terme en $x$ est le second.',
        '$({{a}}x)^2 = {{a}}^2 \\times x^2 = {{eval:a^2}}x^2$ : le carré porte sur ${{a}}$ '
        '**et** sur $x$.',
        '$$({{b}}' + SIGNE_W + '{{a}}x)^2 = {{b}}^2 ' + SIGNE_W
        + ' 2 \\times {{b}} \\times {{a}}x + ({{a}}x)^2 = \\textcolor{{{color:primary.0}}}'
        '{{{solution}}}$$',
    ],
    'Reconnais l\'identité remarquable, puis repère qui joue le rôle de $a$ et qui joue le rôle '
    'de $b$.',
)

SPECS_18 = [
    spec('F6 : (3 − 2x)² = 9 − 12x + 4x²', 0, {'w': 1, 'a': 2, 'b': 3}, 'correct',
         ['9-12x+4x^2']),
    spec('F6 : ordre décroissant 4x² − 12x + 9', 0, {'w': 1, 'a': 2, 'b': 3}, 'correct',
         ['4x^2-12x+9']),
    spec('F6 : non réduit', 0, {'w': 1, 'a': 2, 'b': 3}, 'bad_form', ['9-6x-6x+4x^2']),
    spec('F6 : double produit oublié', 0, {'w': 1, 'a': 2, 'b': 3}, 'incorrect', ['9+4x^2'],
         ERR_F6_DOUBLE),
    spec('F6 : 9 − 4x²', 0, {'w': 1, 'a': 2, 'b': 3}, 'incorrect', ['9-4x^2'], ERR_F6_DIFF),
    spec('F6 : signe du double produit', 0, {'w': 1, 'a': 2, 'b': 3}, 'incorrect',
         ['9+12x+4x^2'], ERR_F6_SIGNE),
    spec('F6 : (2x)² écrit 2x²', 0, {'w': 1, 'a': 2, 'b': 3}, 'incorrect', ['9-12x+2x^2'],
         ERR_F6_CARRE),
    spec('F6 : (5 + 3x)² = 25 + 30x + 9x²', 0, {'w': 0, 'a': 3, 'b': 5}, 'correct',
         ['25+30x+9x^2']),
    spec('F6 : signe du double produit (somme)', 0, {'w': 0, 'a': 3, 'b': 5}, 'incorrect',
         ['25-30x+9x^2'], ERR_F6_SIGNE),
]

ajouter('18e2afca', [F6], SPECS_18)

# =============================================================================================
# ff9bb2fb — 3-058, factoriser a² − b². F7 : (v2) k·x² − k·a², « Factorise le plus possible » :
# k(x + a)(x − a). Les factorisations inachevées (k(x² − a²), (kx − ka)(x + a)) ont la même
# valeur : specs `bad_form` (contrainte `form`).
# =============================================================================================

ERR_F7_K = 'Tu as oublié le facteur commun ${{k}}$ : ton produit ne vaut pas l\'expression.'
ERR_F7_CARRE = ('Une différence de deux carrés se factorise en un produit d\'une somme par une '
                'différence, pas en un carré.')
BON_F7 = '{{k}}({{c}}+{{a}})({{c}}-{{a}})'
F7 = variation(
    'Factorise le plus possible.\n\n$${{k}}{{c}}^2-{{eval:k*a^2}}$$\n\n$?$',
    [var('k', '2..5')],
    [case(BON_F7, [
        erreur('({{c}}+{{a}})({{c}}-{{a}})', ERR_F7_K, 'Facteur k oublié'),
        erreur('{{k}}({{c}}-{{a}})^2', ERR_F7_CARRE, 'Carré au lieu de a² − b²'),
    ])],
    [
        'On met d\'abord le facteur commun $' + couleur('{{k}}') + '$ en facteur.',
        '$$\\begin{align} {{k}}{{c}}^2-{{eval:k*a^2}} &= ' + couleur('{{k}}')
        + '({{c}}^2-{{eval:a^2}}) \\\\ &= ' + couleur('{{k}}') + '({{c}}^2-{{a}}^2) \\\\ &= '
        '{{solution}} \\end{align}$$',
        'On a utilisé $a^2 - b^2 = (a + b)(a - b)$ : la factorisation est finie, il ne reste que '
        'des facteurs du premier degré et un nombre.',
    ],
    'Commence par mettre en facteur le nombre commun aux deux termes, puis regarde ce qui reste.',
)

V_F7 = {'a': 3, 'k': 2, 'c': 'x|x'}
SPECS_FF = [
    spec('F7 : 2x² − 18 = 2(x + 3)(x − 3)', 0, V_F7, 'correct', ['2(x+3)(x-3)']),
    spec('F7 : ordre des facteurs', 0, V_F7, 'correct', ['2(x-3)(x+3)']),
    spec('F7 : 2(x² − 9) non fini', 0, V_F7, 'bad_form', ['2(x^2-9)']),
    spec('F7 : (2x − 6)(x + 3) non fini', 0, V_F7, 'bad_form', ['(2x-6)(x+3)']),
    spec('F7 : k oublié', 0, V_F7, 'incorrect', ['(x-3)(x+3)'],
         'Tu as oublié le facteur commun $2$ : ton produit ne vaut pas l\'expression.'),
    spec('F7 : carré', 0, V_F7, 'incorrect', ['2(x-3)^2'], ERR_F7_CARRE),
    spec('F7 : 3y² − 75 = 3(y + 5)(y − 5)', 0, {'a': 5, 'k': 3, 'c': 'y|y'}, 'correct',
         ['3(y+5)(y-5)']),
]

ajouter('ff9bb2fb', [F7], SPECS_FF)

# =============================================================================================
# c81c5852 — 4-024, équation du premier degré. F8 : (v2) x/a = b ; (v3) ax/b = c, solution
# fractionnaire possible (irréductible), écriture décimale acceptée si elle est exacte.
# =============================================================================================

ERR_F8_DIV = ('Pour retrouver $x$, on fait l\'opération inverse de la division par ${{u}}$ : on '
              'multiplie par ${{u}}$.')
ERR_F8_INV = ('Tu as inversé : on multiplie les deux membres par ${{b}}$, puis on les divise par '
              '${{a}}$.')
ERR_F8_OUBLI = ('Tu as multiplié par ${{b}}$, mais il reste à diviser par ${{a}}$ pour isoler '
                '$x$.')

F8_A = variation(
    'Résous cette équation.\n\n$$\\dfrac{x}{ {{u}} }={{v}}$$\n\n$x=?$',
    [var('u', '2..9'), var('v', '1..9;±')],
    [case('{{eval:u*v}}', [erreur('{{eval:v/u}}', ERR_F8_DIV, 'Division au lieu de produit')])],
    [
        'On multiplie les deux membres par ' + couleur('{{u}}', '$' + P0) + '$.',
        '$$\\dfrac{x}{ {{u}} }={{v}} \\quad \\lrArr \\quad x = {{v}} \\times '
        + couleur('{{u}}') + ' \\quad \\lrArr \\quad x = {{solution:0}}$$',
    ],
    '$x$ est divisé par ${{u}}$ : quelle opération fait le chemin inverse ?',
)

F8_B = variation(
    'Résous cette équation. Donne la solution sous forme d\'un entier ou d\'une fraction '
    'irréductible.\n\n$$\\dfrac{ {{a}}x}{ {{b}} }={{c}}$$\n\n$x=?$',
    [var('a', '2..9'), var('b', '2..9'), var('c', '1..9;±')],
    [case('{{eval:b*c/a}}', [
        erreur('{{eval:a*c/b}}', ERR_F8_INV, 'Rôles de a et b inversés'),
        erreur('{{eval:b*c}}', ERR_F8_OUBLI, 'Division par a oubliée'),
    ], extra={'acceptDecimal': True})],
    [
        'On multiplie les deux membres par ' + couleur('{{b}}', '$' + P0) + '$, puis on les '
        'divise par ' + couleur('{{a}}', '$' + P1) + '$.',
        '$$\\begin{align} \\dfrac{ {{a}}x}{ {{b}} }={{c}} & \\quad \\lrArr \\quad {{a}}x = {{c}} '
        '\\times ' + couleur('{{b}}') + ' \\\\ & \\quad \\lrArr \\quad x = \\dfrac{ {{eval:b*c}} }{'
        + couleur('{{a}}', P1) + '} \\\\ & \\quad \\lrArr \\quad x = {{solution:0}} \\end{align}$$',
    ],
    'Débarrasse-toi d\'abord de la division par ${{b}}$, puis de la multiplication par ${{a}}$.',
    ['a != b', 'gcd(a, b) == 1'],
)

SPECS_C81 = [
    spec('F8a : x/4 = −3 → −12', 0, {'u': 4, 'v': -3}, 'correct', ['-12']),
    spec('F8a : b/a', 0, {'u': 4, 'v': -3}, 'incorrect', ['-\\frac{3}{4}'],
         'Pour retrouver $x$, on fait l\'opération inverse de la division par $4$ : on multiplie '
         'par $4$.'),
    spec('F8a : x/7 = 5 → 35', 0, {'u': 7, 'v': 5}, 'correct', ['35']),
    spec('F8b : 3x/5 = 4 → 20/3', 1, {'a': 3, 'b': 5, 'c': 4}, 'correct', ['\\frac{20}{3}']),
    spec('F8b : 40/6 non simplifiée', 1, {'a': 3, 'b': 5, 'c': 4}, 'unoptimal_form',
         ['\\frac{40}{6}'], violations=['reducedFractions']),
    spec('F8b : 6,67 arrondi', 1, {'a': 3, 'b': 5, 'c': 4}, 'incorrect', ['6{,}67']),
    spec('F8b : a et b inversés', 1, {'a': 3, 'b': 5, 'c': 4}, 'incorrect', ['\\frac{12}{5}'],
         'Tu as inversé : on multiplie les deux membres par $5$, puis on les divise par $3$.'),
    spec('F8b : division oubliée', 1, {'a': 3, 'b': 5, 'c': 4}, 'incorrect', ['20'],
         'Tu as multiplié par $5$, mais il reste à diviser par $3$ pour isoler $x$.'),
    spec('F8b : 2x/3 = −5 → −15/2', 1, {'a': 2, 'b': 3, 'c': -5}, 'correct', ['-\\frac{15}{2}']),
    spec('F8b : −7,5 exact', 1, {'a': 2, 'b': 3, 'c': -5}, 'correct', ['-7{,}5']),
]

ajouter('c81c5852', [F8_A, F8_B], SPECS_C81)

# =============================================================================================
# 779ee55a — 4-025, ax + b = cx + d. F9 : (v1) k(ax + b) = cx + d ; (v2) k − (ax + b) = cx + d.
# =============================================================================================

ERR_F9_KB = ('En développant, le facteur ${{k}}$ multiplie les deux termes de la parenthèse, le '
             'nombre compris.')
ERR_F9_MEMBRE = ('Quand un terme change de membre, il change de signe : vérifie le nombre que tu '
                 'as fait passer à droite.')
ERR_F9_INV = ('Tu as divisé dans le mauvais sens : de $A x = B$, on tire $x = \\dfrac{B}{A}$.')
ERR_F9_UN = ('Le signe $-$ devant la parenthèse change le signe de TOUS ses termes, pas seulement '
             'du premier.')
ERR_F9_AUCUN = ('Une parenthèse précédée de $-$ s\'enlève en changeant le signe de chacun de ses '
                'termes.')

F9_A = variation(
    'Résous cette équation.\n\n$${{k}}({{eval:a*x+(b)}})={{eval:c*x+(d)}}$$\n\n$x=?$',
    [X, var('k', '2..5;±'), var('a', '1..5'), var('b', '1..9;±'), var('c', '1..9;±'),
     var('d', '1..9;±')],
    [case('{{eval:(d-(k)*(b))/((k)*(a)-(c))}}', [
        erreur('{{eval:(d-(b))/((k)*(a)-(c))}}', ERR_F9_KB, 'k × b oublié'),
        erreur('{{eval:(d+(k)*(b))/((k)*(a)-(c))}}', ERR_F9_MEMBRE, 'Signe en changeant de membre'),
        erreur('{{eval:((k)*(a)-(c))/(d-(k)*(b))}}', ERR_F9_INV, 'Division inversée'),
    ])],
    [
        'On développe le membre de gauche, puis on regroupe les termes en $x$ à gauche et les '
        'nombres à droite.',
        '$$\\begin{align} {{k}}({{eval:a*x+(b)}})={{eval:c*x+(d)}} & \\quad \\lrArr \\quad '
        + couleur('{{eval:(k)*(a)*x}}{{eval:(k)*(b);+}}') + '={{eval:c*x+(d)}} \\\\ '
        '& \\quad \\lrArr \\quad {{eval:(k)*(a)*x}}' + couleur('{{eval:-(c)*x;+}}', P1)
        + '={{d}}' + couleur('{{eval:-(k)*(b);+}}', P1) + ' \\\\ '
        '& \\quad \\lrArr \\quad {{eval:((k)*(a)-(c))*x}}={{eval:d-(k)*(b)}} \\\\ '
        '& \\quad \\lrArr \\quad x = {{solution:0}} \\end{align}$$',
    ],
    'Développe d\'abord le membre de gauche, puis ramène les termes en $x$ d\'un côté et les '
    'nombres de l\'autre.',
    ['(k)*(a) != c', 'd-(k)*(b) != 0'],
)

F9_B = variation(
    'Résous cette équation.\n\n$${{k}}-({{eval:a*x+(b)}})={{eval:c*x+(d)}}$$\n\n$x=?$',
    [X, var('k', '1..9;±'), var('a', '1..5'), var('b', '1..9;±'), var('c', '1..9;±'),
     var('d', '1..9;±')],
    [case('{{eval:(k-(b)-(d))/(a+(c))}}', [
        erreur('{{eval:(k+(b)-(d))/(a+(c))}}', ERR_F9_UN, 'Seul le premier terme a changé de signe'),
        erreur('{{eval:(d-(k)-(b))/(a-(c))}}', ERR_F9_AUCUN, 'Signes non changés derrière un −'),
        erreur('{{eval:(a+(c))/(k-(b)-(d))}}', ERR_F9_INV, 'Division inversée'),
    ])],
    [
        'Le signe $-$ devant la parenthèse change le signe de chacun de ses termes.',
        '$$\\begin{align} {{k}}-({{eval:a*x+(b)}})={{eval:c*x+(d)}} & \\quad \\lrArr \\quad '
        '{{k}}' + couleur('{{eval:-(a)*x;+}}{{eval:-(b);+}}') + '={{eval:c*x+(d)}} \\\\ '
        '& \\quad \\lrArr \\quad {{eval:-(a)*x}}' + couleur('{{eval:-(c)*x;+}}', P1)
        + '={{d}}' + couleur('{{eval:-(k)+(b);+}}', P1) + ' \\\\ '
        '& \\quad \\lrArr \\quad {{eval:(-(a)-(c))*x}}={{eval:d-(k)+(b)}} \\\\ '
        '& \\quad \\lrArr \\quad x = {{solution:0}} \\end{align}$$',
    ],
    'Enlève d\'abord la parenthèse précédée de $-$ en changeant le signe de chacun de ses '
    'termes, puis résous comme d\'habitude.',
    # la dernière condition : deux erreurs prévues de même valeur auraient deux messages
    ['a+(c) != 0', 'a != c', 'k-(b)-(d) != 0',
     '(k+(b)-(d))*(a-(c)) != (d-(k)-(b))*(a+(c))'],
)

V_F9A = {'k': 3, 'a': 2, 'b': -1, 'c': 4, 'd': 5}  # 6x − 3 = 4x + 5 → x = 4
V_F9B = {'k': 4, 'a': 2, 'b': 3, 'c': 1, 'd': -8}  # 4 − 2x − 3 = x − 8 → −3x = −9 → x = 3
SPECS_779 = [
    spec('F9a : 3(2x − 1) = 4x + 5 → 4', 0, V_F9A, 'correct', ['4']),
    spec('F9a : 8/2 non simplifiée', 0, V_F9A, 'unoptimal_form', ['\\frac{8}{2}'], violations=['reducedFractions']),
    spec('F9a : k × b oublié', 0, V_F9A, 'incorrect', ['3'], ERR_F9_KB.replace('{{k}}', '3')),
    spec('F9a : signe en changeant de membre', 0, V_F9A, 'incorrect', ['1'], ERR_F9_MEMBRE),
    spec('F9a : division inversée', 0, V_F9A, 'incorrect', ['\\frac{1}{4}'], ERR_F9_INV),
    spec('F9a : −2(x + 3) = x + 1 → −7/3', 0, {'k': -2, 'a': 1, 'b': 3, 'c': 1, 'd': 1},
         'correct', ['-\\frac{7}{3}']),
    spec('F9b : 4 − (2x + 3) = x − 8 → 3', 1, V_F9B, 'correct', ['3']),
    spec('F9b : seul le premier terme changé', 1, V_F9B, 'incorrect', ['5'], ERR_F9_UN),
    spec('F9b : signes non changés', 1, V_F9B, 'incorrect', ['-15'], ERR_F9_AUCUN),
    spec('F9b : division inversée', 1, V_F9B, 'incorrect', ['\\frac{1}{3}'], ERR_F9_INV),
]

ajouter('779ee55a', [F9_A, F9_B], SPECS_779)

# =============================================================================================
# 44a3062b — 4-055, quatrième proportionnelle. F10 : (v4) x/a = c/b ou a/x = b/c, x = ac/b
# décimal (b ∈ {2, 4, 5, 8} : b est premier avec a, variables partagées).
# =============================================================================================

ERR_F10_INV = ('Produit en croix mal posé : on multiplie les deux nombres placés en diagonale, '
               'puis on divise par le troisième.')
ERR_F10_PROD = ('Tu as multiplié les trois nombres : le produit en croix se termine par une '
                'division.')
F10 = variation(
    'Trouve $x$.\n\n$$' + si('w==0', '\\dfrac{x}{ {{a}} }=\\dfrac{ {{c}} }{ {{b}} }',
                             '\\dfrac{ {{a}} }{x}=\\dfrac{ {{b}} }{ {{c}} }') + '$$\n\n$x=?$',
    [var('w', '0..1')],
    [case('{{eval:a*c/b}}', [
        erreur('{{eval:a*b/c}}', ERR_F10_INV, 'Produit en croix inversé'),
        erreur('{{eval:a*b*c}}', ERR_F10_PROD, 'a × b × c'),
    ])],
    [
        'Deux quotients égaux ont des produits en croix égaux : $\\dfrac{A}{B} = \\dfrac{C}{D} '
        '\\iff A \\times D = B \\times C$.',
        si('w==0',
           '$$x \\times {{b}} = {{a}} \\times {{c}} \\quad \\lrArr \\quad x = \\dfrac{'
           + couleur('{{a}} \\times {{c}}') + '}{ {{b}} } = {{solution:0}}$$',
           '$${{a}} \\times {{c}} = x \\times {{b}} \\quad \\lrArr \\quad x = \\dfrac{'
           + couleur('{{a}} \\times {{c}}') + '}{ {{b}} } = {{solution:0}}$$'),
    ],
    'Utilise l\'égalité des produits en croix, puis isole $x$.',
    ['mod(100*a*c, b) == 0'],
)

SPECS_44 = [
    spec('F10 : x/4 = 3/5 → 2,4', 0, {'w': 0, 'a': 4, 'b': 5, 'c': 3}, 'correct', ['2{,}4']),
    spec('F10 : 12/5', 0, {'w': 0, 'a': 4, 'b': 5, 'c': 3}, 'correct', ['\\frac{12}{5}']),
    spec('F10 : produit en croix inversé', 0, {'w': 0, 'a': 4, 'b': 5, 'c': 3}, 'incorrect',
         ['\\frac{20}{3}'], ERR_F10_INV),
    spec('F10 : a × b × c', 0, {'w': 0, 'a': 4, 'b': 5, 'c': 3}, 'incorrect', ['60'],
         ERR_F10_PROD),
    spec('F10 : 3/x = 2/7 → 10,5', 0, {'w': 1, 'a': 3, 'b': 2, 'c': 7}, 'correct', ['10{,}5']),
    spec('F10 : 3/x = 2/7, produit en croix inversé', 0, {'w': 1, 'a': 3, 'b': 2, 'c': 7},
         'incorrect', ['\\frac{6}{7}'], ERR_F10_INV),
]

ajouter('44a3062b', [F10], SPECS_44)

# =============================================================================================
# 2ab49a6f — 3-015, équation produit nul. F11 : (v5) ax² + bx = 0 ; (v6) a²x² − b² = 0 ;
# (v7) (ax + b)² = 0, une seule solution ; (v8) programme de calcul (x + a)(x − b).
# Ensembles de solutions (`intervalles`) : pas d'erreurs prévues, specs `incorrect`.
# =============================================================================================

PRODUIT_NUL = '**Un produit est nul si et seulement si l\'un au moins de ses facteurs est nul.**'
FIN_S = '\n\nL\'ensemble des solutions est $S=?$.'

F11_A = variation(
    'Résous l\'équation ${{eval:a*x^2+(b)*x}}=0$.' + FIN_S,
    [X, var('a', '2..9'), var('b', '1..20;±')],
    [case('\\{ 0 ; {{eval:-(b)/(a)}} \\}')],
    [
        'Ce n\'est pas encore un produit : on **factorise** par ' + couleur('x', '$' + P0) + '$.',
        '$${{eval:a*x^2+(b)*x}} = ' + couleur('x') + '({{eval:a*x+(b)}})$$',
        PRODUIT_NUL,
        '$$x({{eval:a*x+(b)}})=0 \\iff x=0 \\text{ ou } {{eval:a*x+(b)}}=0 \\iff x=0 \\text{ ou } '
        'x={{eval:-(b)/(a)}}$$',
        'L\'équation a deux solutions : $S=' + couleur('\\{ 0 ; {{eval:-(b)/(a)}} \\}') + '$.',
    ],
    'Transforme d\'abord le membre de gauche en produit : les deux termes ont un facteur commun.',
    ['gcd(a, abs(b)) == 1'],
)

F11_B = variation(
    'Résous l\'équation ${{eval:a^2*x^2}}-{{eval:b^2}}=0$.' + FIN_S,
    [X, var('a', '1..9'), var('b', '1..12')],
    [case('\\{ {{eval:-(b)/(a)}} ; {{eval:b/a}} \\}')],
    [
        'On factorise avec $A^2 - B^2 = (A - B)(A + B)$, où $A = {{eval:a*x}}$ et $B = {{b}}$.',
        '$${{eval:a^2*x^2}}-{{eval:b^2}} = ' + couleur('({{eval:a*x-(b)}})({{eval:a*x+(b)}})')
        + '$$',
        PRODUIT_NUL,
        '$$({{eval:a*x-(b)}})({{eval:a*x+(b)}})=0 \\iff {{eval:a*x}}={{b}} \\text{ ou } '
        '{{eval:a*x}}={{eval:-(b)}} \\iff x={{eval:b/a}} \\text{ ou } x={{eval:-(b)/(a)}}$$',
        'L\'équation a deux solutions : $S=' + couleur('\\{ {{eval:-(b)/(a)}} ; {{eval:b/a}} \\}')
        + '$.',
    ],
    'Reconnais une différence de deux carrés et factorise-la avant de résoudre.',
    ['gcd(a, b) == 1'],
)

F11_C = variation(
    'Résous l\'équation $({{eval:a*x+(b)}})^2=0$.' + FIN_S,
    [X, var('a', '1..9'), var('b', '1..9;±')],
    [case('\\{ {{eval:-(b)/(a)}} \\}')],
    [
        'Un carré est un produit : $({{eval:a*x+(b)}})^2 = ({{eval:a*x+(b)}})({{eval:a*x+(b)}})$. '
        + PRODUIT_NUL,
        '$$({{eval:a*x+(b)}})^2=0 \\iff {{eval:a*x+(b)}}=0 \\iff x={{eval:-(b)/(a)}}$$',
        'Les deux facteurs sont égaux : l\'équation a **une seule** solution, '
        '$S=' + couleur('\\{ {{eval:-(b)/(a)}} \\}') + '$.',
    ],
    'Écris le carré comme un produit de deux facteurs : sont-ils différents ?',
    ['gcd(a, abs(b)) == 1'],
)

F11_D = variation(
    'Voici un programme de calcul :\n\n- Choisir un nombre.\n- Lui ajouter ${{a}}$ : on obtient '
    'un premier résultat.\n- Soustraire ${{b}}$ au nombre choisi : on obtient un second '
    'résultat.\n- Multiplier les deux résultats.\n\nQuels nombres de départ donnent $0$ à la fin '
    'du programme ? Écris l\'ensemble $S$ de ces nombres.\n\n$S=?$',
    [X, var('a', '1..9'), var('b', '1..9')],
    [case('\\{ {{eval:-(a)}} ; {{b}} \\}')],
    [
        'On appelle $x$ le nombre de départ : le programme donne $(x+{{a}})(x-{{b}})$.',
        PRODUIT_NUL,
        '$$(x+{{a}})(x-{{b}})=0 \\iff x+{{a}}=0 \\text{ ou } x-{{b}}=0 \\iff x={{eval:-(a)}} '
        '\\text{ ou } x={{b}}$$',
        'Deux nombres de départ donnent $0$ : $S=' + couleur('\\{ {{eval:-(a)}} ; {{b}} \\}')
        + '$.',
    ],
    'Appelle $x$ le nombre de départ et écris le résultat du programme avec $x$ : c\'est un '
    'produit.',
)

SPECS_2AB = [
    spec('F11a : 3x² − 5x = 0 → {0 ; 5/3}', 0, {'a': 3, 'b': -5}, 'correct',
         ['\\{0;\\frac{5}{3}\\}']),
    spec('F11a : ordre inverse', 0, {'a': 3, 'b': -5}, 'correct', ['\\{\\frac{5}{3};0\\}']),
    spec('F11a : 0 oublié', 0, {'a': 3, 'b': -5}, 'incorrect', ['\\{\\frac{5}{3}\\}']),
    spec('F11a : signe', 0, {'a': 3, 'b': -5}, 'incorrect', ['\\{0;-\\frac{5}{3}\\}']),
    spec('F11a : 2x² + 7x = 0 → {−3,5 ; 0}', 0, {'a': 2, 'b': 7}, 'correct',
         ['\\{-3{,}5;0\\}']),
    spec('F11b : 4x² − 9 = 0 → {−3/2 ; 3/2}', 1, {'a': 2, 'b': 3}, 'correct',
         ['\\{-\\frac{3}{2};\\frac{3}{2}\\}']),
    spec('F11b : écriture décimale', 1, {'a': 2, 'b': 3}, 'correct', ['\\{1{,}5;-1{,}5\\}']),
    spec('F11b : une seule solution', 1, {'a': 2, 'b': 3}, 'incorrect', ['\\{\\frac{3}{2}\\}']),
    spec('F11b : b²/a² au lieu de b/a', 1, {'a': 2, 'b': 3}, 'incorrect',
         ['\\{-\\frac{9}{4};\\frac{9}{4}\\}']),
    spec('F11c : (2x − 3)² = 0 → {3/2}', 2, {'a': 2, 'b': -3}, 'correct', ['\\{\\frac{3}{2}\\}']),
    spec('F11c : deux solutions opposées', 2, {'a': 2, 'b': -3}, 'incorrect',
         ['\\{-\\frac{3}{2};\\frac{3}{2}\\}']),
    spec('F11c : signe', 2, {'a': 2, 'b': -3}, 'incorrect', ['\\{-\\frac{3}{2}\\}']),
    spec('F11d : (x + 4)(x − 7) → {−4 ; 7}', 3, {'a': 4, 'b': 7}, 'correct', ['\\{-4;7\\}']),
    spec('F11d : ordre inverse', 3, {'a': 4, 'b': 7}, 'correct', ['\\{7;-4\\}']),
    spec('F11d : signes inversés', 3, {'a': 4, 'b': 7}, 'incorrect', ['\\{4;-7\\}']),
    spec('F11d : une seule solution', 3, {'a': 4, 'b': 7}, 'incorrect', ['\\{7\\}']),
]

ajouter('2ab49a6f', [F11_A, F11_B, F11_C, F11_D], SPECS_2AB)

# =============================================================================================
# 3806ee3d — 3-008, x² = a. F12 : (v3) x² = p²/q² ; (v4) kx² + c = 0 : t = 0 solutions entières,
# t = 1 fractionnaires (k = q², 4 ou 9 : voir l'en-tête), t = 2 en √, t = 3 aucune.
# =============================================================================================

RAPPEL_X2 = ('Les nombres dont le carré vaut $a>0$ sont $\\sqrt{a}$ et $-\\sqrt{a}$ : **deux** '
             'solutions. Si $a=0$, une seule ($0$) ; si $a<0$, aucune (un carré est positif).')
F12_A = variation(
    'Résous l\'équation $x^2=\\dfrac{ {{eval:p^2}} }{ {{eval:q^2}} }$.' + FIN_S,
    [var('p', '1..12'), var('q', '2..10')],
    [case('\\{ {{eval:-(p)/(q)}} ; {{eval:p/q}} \\}')],
    [
        RAPPEL_X2,
        '$\\dfrac{ {{eval:p^2}} }{ {{eval:q^2}} } > 0$ et $\\sqrt{\\dfrac{ {{eval:p^2}} }{ '
        '{{eval:q^2}} }} = \\dfrac{\\sqrt{ {{eval:p^2}} }}{\\sqrt{ {{eval:q^2}} }} = '
        '\\dfrac{ {{p}} }{ {{q}} }$ : $x = \\dfrac{ {{p}} }{ {{q}} }$ ou $x = -\\dfrac{ {{p}} }{ '
        '{{q}} }$.',
        '$S=' + couleur('\\{ {{eval:-(p)/(q)}} ; {{eval:p/q}} \\}') + '$.',
    ],
    'La racine carrée d\'un quotient est le quotient des racines carrées. N\'oublie pas la '
    'solution négative.',
    ['gcd(p, q) == 1'],
)

K_X2 = '{{if:k==1||{{k}}}}x^2'
EQ_F12 = si('t==0', K_X2 + '-{{eval:k*n^2}}',
            si('t==1', '{{eval:q^2}}x^2-{{eval:p^2}}',
               si('t==2', K_X2 + '-{{eval:k*m}}', K_X2 + '+{{c}}')))
X2_VAUT = si('t==0', '{{eval:n^2}}', si('t==1', '\\dfrac{ {{eval:p^2}} }{ {{eval:q^2}} }',
                                        si('t==2', '{{m}}', '{{eval:-(c)/(k)}}')))
F12_B = variation(
    'Résous l\'équation $' + EQ_F12 + '=0$.' + FIN_S,
    [var('t', '0..3'), var('k', '1..3'), var('n', '1..9'), var('p', '1..9'), var('q', '2..3'),
     var('m', '2|3|5|6|7|10|11|13|14|15'), var('c', '1..20')],
    [case(si('t==0', '\\{ -{{n}} ; {{n}} \\}',
             si('t==1', '\\{ {{eval:-(p)/(q)}} ; {{eval:p/q}} \\}',
                si('t==2', '\\{ -\\sqrt{ {{m}} } ; \\sqrt{ {{m}} } \\}', '\\varnothing'))))],
    [
        'On isole $x^2$ : $' + EQ_F12 + '=0 \\iff x^2=' + couleur(X2_VAUT) + '$.',
        RAPPEL_X2,
        si('t==3', '${{eval:-(c)/(k)}}<0$ et un carré n\'est jamais négatif : aucune solution, '
                   '$S=' + couleur('\\varnothing') + '$.',
           'Le nombre est positif : deux solutions opposées, $S=' + couleur(
               si('t==0', '\\{ -{{n}} ; {{n}} \\}',
                  si('t==1', '\\{ {{eval:-(p)/(q)}} ; {{eval:p/q}} \\}',
                     '\\{ -\\sqrt{ {{m}} } ; \\sqrt{ {{m}} } \\}'))) + '$.'),
    ],
    'Commence par isoler $x^2$, puis regarde le signe du nombre obtenu.',
    ['gcd(p, q) == 1'],
)

SPECS_38 = [
    spec('F12a : x² = 49/9 → {−7/3 ; 7/3}', 0, {'p': 7, 'q': 3}, 'correct',
         ['\\{-\\frac{7}{3};\\frac{7}{3}\\}']),
    spec('F12a : ordre inverse', 0, {'p': 7, 'q': 3}, 'correct',
         ['\\{\\frac{7}{3};-\\frac{7}{3}\\}']),
    spec('F12a : solution négative oubliée', 0, {'p': 7, 'q': 3}, 'incorrect',
         ['\\{\\frac{7}{3}\\}']),
    spec('F12a : racine du numérateur seul', 0, {'p': 7, 'q': 3}, 'incorrect',
         ['\\{-\\frac{7}{9};\\frac{7}{9}\\}']),
    spec('F12a : x² = 25/4 → {−2,5 ; 2,5}', 0, {'p': 5, 'q': 2}, 'correct', ['\\{-2{,}5;2{,}5\\}']),
    spec('F12b : 2x² − 18 = 0 → {−3 ; 3}', 1, {'t': 0, 'k': 2, 'n': 3}, 'correct',
         ['\\{-3;3\\}']),
    spec('F12b : solution négative oubliée', 1, {'t': 0, 'k': 2, 'n': 3}, 'incorrect',
         ['\\{3\\}']),
    spec('F12b : 4x² − 9 = 0 → {−3/2 ; 3/2}', 1, {'t': 1, 'p': 3, 'q': 2}, 'correct',
         ['\\{-\\frac{3}{2};\\frac{3}{2}\\}']),
    spec('F12b : racine du numérateur seul', 1, {'t': 1, 'p': 3, 'q': 2}, 'incorrect',
         ['\\{-\\frac{3}{4};\\frac{3}{4}\\}']),
    spec('F12b : 3x² − 21 = 0 → {−√7 ; √7}', 1, {'t': 2, 'k': 3, 'm': 7}, 'correct',
         ['\\{-\\sqrt{7};\\sqrt{7}\\}']),
    spec('F12b : 2x² + 8 = 0 → ∅', 1, {'t': 3, 'k': 2, 'c': 8}, 'correct', ['\\varnothing']),
    spec('F12b : des solutions quand il n\'y en a pas', 1, {'t': 3, 'k': 2, 'c': 8},
         'incorrect', ['\\{-2;2\\}']),
]

ajouter('3806ee3d', [F12_A, F12_B], SPECS_38)
