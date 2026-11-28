"""Ajoute les variations validées aux 7 modèles publiés exportés de prod dans
scripts/questions/idees-1re-derivation-publies/ (chantier idees-1re-derivation).

Phase 0 validée par David le 2026-11-23 (« je valide tout ») : F3 (46913a48), F4 (d58208eb),
F5 (74d77343), F6 (1666b8e9), F7 (0140fdfa), F8 (8997f7c6), F9 (f1440b52). Les variations
s'ajoutent À LA FIN (les réponses des élèves gardent l'indice de leur variation) ; la migration
de contenu est générée par scripts/questions/migration-contenu.ts.

Le script repart du contenu de prod (variations et specs d'origine, comptées dans ORIGINE) :
le relancer réécrit les ajouts sans les doubler.

Pièges : 46913a48, d58208eb et 1666b8e9 portent aussi la 1re techno (rien au-delà des polynômes
dans le calcul) ; un message d'erreur prévue est réécrit à la résolution (parenthèses → \\left(
\\right), espaces autour des opérateurs) : messages sans parenthèses autour d'une variable ; pas
de variable `e` (constante d'Euler).

Usage : python3 docs/wip/questions/idees-1re-derivation-publies.py scripts/questions/idees-1re-derivation-publies
"""
import json
import os
import sys

DOSSIER = sys.argv[1]

PRIMAIRE = '\\textcolor{{{color:primary.0}}}'

# id court → (variations, specs) d'origine en prod (export du 2026-11-23)
ORIGINE = {'46913a48': (2, 22), 'd58208eb': (2, 13), '74d77343': (6, 25), '1666b8e9': (3, 22),
           '0140fdfa': (3, 19), '8997f7c6': (3, 27), 'f1440b52': (3, 20)}


def spec(desc, vi, variables_, status, answers, message=None, violations=('form',)):
    expected = {'status': status}
    if message is not None:
        expected['expectedErrorMessage'] = message
    if status == 'unoptimal_form':
        expected['constraintViolations'] = list(violations)
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


def bloc(nom, *lignes):
    return '```' + nom + '\n' + '\n'.join(lignes) + '\n```'


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
    print(f'{court} : {nv} + {len(variations)} variations, {ns} + {len(specs)} specs')


X = var('x', 'x|x')
H = var('h', 'h|h')

# =============================================================================================
# 46913a48 — Taux de variation et nombre dérivé (1SPE-260). F3 : αx² + βx + γ, α ≠ 1.
# Polynôme : reste dans les bornes de la 1re techno.
# =============================================================================================

v469 = []
s469 = []
ERR_ALPHA_H = 'Le terme en $h^2$ garde son coefficient : après division par $h$, il reste ${{al}}h$.'
ERR_ALPHA_2A = 'Développe tout le carré multiplié par ${{al}}$ : le terme en $h$ vaut ${{al}}\\times 2\\times{{a}}\\,h$.'
v469.append(variation(
    'Soit $f$ la fonction définie sur $\\mathbb{R}$ par $f(x)={{eval:al*x^2+b*x+c}}$.\n\n'
    'Pour $h\\neq0$, exprime le taux de variation de $f$ entre ${{a}}$ et ${{a}}+h$ sous forme '
    'simplifiée, puis déduis-en $f\'({{a}})$.\n\n'
    '$\\dfrac{f({{a}}+h)-f({{a}})}{h}=?$\n\n$f\'({{a}})=?$',
    [X, H, var('al', '2|3|-1|-2|-3'), var('b', '1..6;±'), var('c', '-6..6'), var('a', '1..4;±')],
    [case('{{eval:al*h+2*al*a+b}}', [
        erreur('{{eval:h+2*al*a+b}}', ERR_ALPHA_H, 'Coefficient de h oublié'),
        erreur('{{eval:al*h+2*a+b}}', 'N\'oublie pas de multiplier $2\\times{{a;()}}\\,h$ par ${{al}}$.',
               'α oublié devant 2ah'),
        erreur('{{eval:al*h+2*al*a}}', 'N\'oublie pas le terme ${{b}}x$ : il donne ${{b}}h$ dans la différence.',
               'Terme βx oublié'),
    ]),
     case('{{eval:2*al*a+b}}', [
         erreur('{{eval:2*a+b}}', 'N\'oublie pas de multiplier $2\\times{{a;()}}$ par ${{al}}$.',
                'α oublié'),
         erreur('{{eval:al*a^2+b*a+c}}',
                'Tu as donné l\'image de ${{a}}$ : le nombre dérivé est la limite du taux quand '
                '$h$ tend vers $0$.', 'Image au lieu du nombre dérivé'),
     ])],
    ['$f({{a}}+h)-f({{a}})={{if:al==-1|-|{{al}}}}\\left(({{a}}+h)^2-{{a;()}}^2\\right){{b;+}}h$.',
     'Or $({{a}}+h)^2-{{a;()}}^2={{eval:2*a}}h+h^2$, donc '
     '$f({{a}}+h)-f({{a}})={{eval:al*h^2+(2*al*a+b)*h}}$.',
     'Pour $h\\neq0$, on divise par $h$ : $$\\dfrac{f({{a}}+h)-f({{a}})}{h}='
     + PRIMAIRE + '{ {{eval:al*h+2*al*a+b}} }$$',
     'Quand $h$ tend vers $0$, ce taux tend vers ${{eval:2*al*a+b}}$ : '
     '$f\'({{a}})=' + PRIMAIRE + '{ {{eval:2*al*a+b}} }$.'],
    'Développe $({{a}}+h)^2$, n\'oublie pas le coefficient ${{al}}$ devant, soustrais '
    '$f({{a}})$, puis divise par $h$.',
    ['2*al*a+b != 0']))
v = {'al': 2, 'b': 3, 'c': 1, 'a': 1}  # 2x² + 3x + 1, a = 1 : taux 2h + 7, f'(1) = 7
s469 += [spec('2x² + 3x + 1, a = 1 : 2h + 7 et 7', 0, v, 'correct', ['2h+7', '7']),
         spec('2x² + 3x + 1, a = 1 : 7 + 2h', 0, v, 'correct', ['7+2h', '7']),
         spec('Coefficient de h oublié', 0, v, 'incorrect', ['h+7', '7'],
              'Le terme en $h^2$ garde son coefficient : après division par $h$, il reste $2 h$.'),
         spec('α oublié devant 2ah', 0, v, 'incorrect', ['2h+5', '7'],
              'N\'oublie pas de multiplier $2\\times1\\,h$ par $2$.'),
         spec('Terme βx oublié', 0, v, 'incorrect', ['2h+4', '7'],
              'N\'oublie pas le terme $3 x$ : il donne $3 h$ dans la différence.'),
         spec('α oublié (nombre dérivé)', 0, v, 'incorrect', ['2h+7', '5'],
              'N\'oublie pas de multiplier $2\\times1$ par $2$.'),
         spec('Image au lieu du nombre dérivé', 0, v, 'incorrect', ['2h+7', '6'],
              'Tu as donné l\'image de $1$ : le nombre dérivé est la limite du taux quand $h$ '
              'tend vers $0$.')]
v = {'al': -1, 'b': 4, 'c': -2, 'a': 3}  # −x² + 4x − 2, a = 3 : taux −h − 2, f'(3) = −2
s469 += [spec('−x² + 4x − 2, a = 3 : −h − 2 et −2', 0, v, 'correct', ['-h-2', '-2'])]
ajouter('46913a48', v469, s469)

# =============================================================================================
# d58208eb — Lire un nombre dérivé sur un graphique (1SPE-270). F4 : courbe de degré 3,
# tangente horizontale, pente en tiers. Une tangente, une case.
# =============================================================================================

LIS = '\n\nLis $f\'({{a}})$.\n\n$f\'({{a}})=?$'
INTRO = ('La courbe $\\mathcal{C}_f$ d\'une fonction $f$ (trait plein) et sa tangente $T$ au point '
         '$A$ d\'abscisse ${{a}}$ (en pointillés) sont tracées ci-dessous.\n\n')
DEF = ('Le nombre dérivé $f\'({{a}})$ est le coefficient directeur de la tangente $T$ au point $A$ '
       'd\'abscisse ${{a}}$.')
HINT_LIRE = ('Le nombre dérivé $f\'({{a}})$ est le coefficient directeur de la tangente : cherche '
             'deux points de la grille par lesquels passe $T$.')
ERR_SIGNE_PENTE = 'Regarde le sens de la tangente : si elle descend, son coefficient directeur est négatif.'
ERR_INVERSE = 'Le coefficient directeur est la variation de $y$ divisée par la variation de $x$, pas l\'inverse.'
ERR_ORDONNEE = 'Tu as lu l\'ordonnée du point $A$ : le nombre dérivé est la pente de la tangente.'


def courbe(f, g, points, description):
    return bloc('courbe', 'x: -5 ; 5', 'y: -5 ; 5', 'grille: 1 ; 1',
                'f(x) = ' + f + '   bleu', 'g(x) = ' + g + '   rouge   pointillé',
                'points: ' + points, 'taille: moyenne', 'description: ' + description)


vd58 = []
sd58 = []

# v2 — courbe de degré 3, tangente au point d'inflexion, pente entière
F_CUBE = '({{k}})/4*(x-({{a}}))^3+({{s}})*(x-({{a}}))+({{b}})'
G_CUBE = '({{s}})*(x-({{a}}))+({{b}})'
vd58.append(variation(
    INTRO + courbe(F_CUBE, G_CUBE, 'A({{a}} ; f({{a}}))',
                   'Courbe d\'une fonction et sa tangente T, en pointillés, au point A.') + LIS,
    [var('a', '-2..2'), var('b', '-2..2'), var('s', '1..2;±'), var('k', '1|-1')],
    [case('{{s}}', [
        erreur('{{eval:-s}}', ERR_SIGNE_PENTE, 'Signe de la pente'),
        erreur('{{eval:1/s}}', ERR_INVERSE, 'Rapport inversé'),
        erreur('{{b}}', ERR_ORDONNEE, 'Ordonnée de A'),
    ])],
    [DEF,
     courbe(F_CUBE, G_CUBE, 'A({{a}} ; {{b}}), B({{eval:a+1}} ; {{eval:b+s}})',
            'Courbe d\'une fonction et sa tangente T, en pointillés, passant par les points A et '
            'B de la grille.'),
     '$T$ passe par les points de la grille $A({{a}}\\,;{{b}})$ et $B({{eval:a+1}}\\,;{{eval:b+s}})$ : '
     'quand on avance de $1$, l\'ordonnée varie de ${{s}}$.',
     'Conclusion : $f\'({{a}})=\\dfrac{y_B-y_A}{x_B-x_A}=' + PRIMAIRE + '{ {{s}} }$.'],
    HINT_LIRE,
    ['abs(b+s) <= 4']))
v = {'a': 0, 'b': 1, 's': 2, 'k': 1}
sd58 += [spec('degré 3, pente 2', 0, v, 'correct', ['2']),
         spec('Signe', 0, v, 'incorrect', ['-2'], ERR_SIGNE_PENTE),
         spec('Rapport inversé', 0, v, 'incorrect', ['\\frac{1}{2}'], ERR_INVERSE),
         spec('Ordonnée de A', 0, v, 'incorrect', ['1'], ERR_ORDONNEE)]

# v3 — tangente horizontale au sommet d'une parabole
F_SOMMET = '({{k}})/2*(x-({{a}}))^2+({{b}})'
G_SOMMET = '0*x+({{b}})'
ERR_ABSCISSE = 'Tu as lu l\'abscisse du point $A$ : le nombre dérivé est la pente de la tangente.'
vd58.append(variation(
    INTRO + courbe(F_SOMMET, G_SOMMET, 'A({{a}} ; f({{a}}))',
                   'Courbe d\'une fonction et sa tangente T, en pointillés, au point A.') + LIS,
    [var('a', '-3..3'), var('b', '-3..3'), var('k', '1..2;±')],
    [case('0', [
        erreur('{{b}}', ERR_ORDONNEE, 'Ordonnée de A'),
        erreur('{{a}}', ERR_ABSCISSE, 'Abscisse de A'),
    ])],
    [DEF,
     courbe(F_SOMMET, G_SOMMET, 'A({{a}} ; {{b}}), B({{eval:a+2}} ; {{b}})',
            'Courbe d\'une fonction et sa tangente T, horizontale, passant par les points A et B '
            'de la grille.'),
     '$T$ est horizontale : elle passe par $A({{a}}\\,;{{b}})$ et $B({{eval:a+2}}\\,;{{b}})$, '
     'l\'ordonnée ne varie pas.',
     'Conclusion : $f\'({{a}})=\\dfrac{ {{b}}-{{b;()}} }{2}=' + PRIMAIRE + '{0}$.'],
    HINT_LIRE,
    ['a != 0', 'b != 0', 'a != b']))
v = {'a': 1, 'b': -2, 'k': 1}
sd58 += [spec('tangente horizontale : 0', 1, v, 'correct', ['0']),
         spec('Ordonnée de A', 1, v, 'incorrect', ['-2'], ERR_ORDONNEE),
         spec('Abscisse de A', 1, v, 'incorrect', ['1'], ERR_ABSCISSE)]

# v4 — parabole, pente en tiers : la tangente passe par A et par B, 3 unités plus loin
F_TIERS = '({{k}})/6*(x-({{a}}))^2+({{t}})/3*(x-({{a}}))+({{b}})'
G_TIERS = '({{t}})/3*(x-({{a}}))+({{b}})'
ERR_DIVISER = 'Tu as oublié de diviser par l\'avancée en abscisse.'
vd58.append(variation(
    INTRO + courbe(F_TIERS, G_TIERS, 'A({{a}} ; f({{a}}))',
                   'Courbe d\'une fonction et sa tangente T, en pointillés, au point A.') + LIS,
    [var('a', '-4..1'), var('b', '-3..3'), var('t', '1|2|-1|-2'), var('k', '1..2;±')],
    [case('{{eval:t/3}}', [
        erreur('{{eval:3/t}}', ERR_INVERSE, 'Rapport inversé'),
        erreur('{{t}}', ERR_DIVISER, 'Pas de division par l\'avancée'),
        erreur('{{eval:-t/3}}', ERR_SIGNE_PENTE, 'Signe de la pente'),
    ])],
    [DEF,
     courbe(F_TIERS, G_TIERS, 'A({{a}} ; {{b}}), B({{eval:a+3}} ; {{eval:b+t}})',
            'Courbe d\'une fonction et sa tangente T, en pointillés, passant par les points A et '
            'B de la grille.'),
     '$T$ passe par les points de la grille $A({{a}}\\,;{{b}})$ et $B({{eval:a+3}}\\,;{{eval:b+t}})$ : '
     'quand on avance de $3$, l\'ordonnée varie de ${{t}}$.',
     'Conclusion : $f\'({{a}})=\\dfrac{y_B-y_A}{x_B-x_A}=\\dfrac{ {{t}} }{3}='
     + PRIMAIRE + '{ {{eval:t/3}} }$.'],
    HINT_LIRE,
    ['abs(b+t) <= 4']))
v = {'a': -1, 'b': 0, 't': 2, 'k': 1}
sd58 += [spec('pente 2/3', 2, v, 'correct', ['\\frac{2}{3}']),
         spec('Rapport inversé', 2, v, 'incorrect', ['\\frac{3}{2}'], ERR_INVERSE),
         spec('Pas de division', 2, v, 'incorrect', ['2'], ERR_DIVISER),
         spec('Signe', 2, v, 'incorrect', ['-\\frac{2}{3}'], ERR_SIGNE_PENTE),
         spec('0,67 arrondi refusé', 2, v, 'incorrect', ['0{,}67'])]
ajouter('d58208eb', vd58, sd58)

# =============================================================================================
# 74d77343 — Calculer une dérivée (1SPE-265). F5 : coefficient fractionnaire.
# =============================================================================================

v74 = []
s74 = []
ERR_PAS_N = 'Tu as oublié de multiplier par l\'exposant ${{n}}$ : $(x^n)\'=nx^{n-1}$.'
ERR_EXPOSANT = 'L\'exposant baisse de $1$ : $(x^n)\'=nx^{n-1}$.'
ERR_DIVISE_N = 'Il faut multiplier le coefficient par ${{n}}$, pas le diviser.'
v74.append(variation(
    'Calcule la dérivée de cette fonction.\n\n'
    '$$f(x)={{if:p<0|-|}}\\frac{ {{eval:abs(p)}} }{ {{q}} }x^{ {{n}} }$$\n\n$f\'(x)=?$',
    [var('p', '1..5;±'), var('q', '2..5'), var('n', '2..6')],
    [case('{{eval:n*p/q}}x^{ {{eval:n-1}} }', [
        erreur('{{eval:p/q}}x^{ {{eval:n-1}} }', ERR_PAS_N, 'Exposant pas multiplié'),
        erreur('{{eval:n*p/q}}x^{ {{n}} }', ERR_EXPOSANT, 'Exposant pas baissé'),
        erreur('{{eval:p/(n*q)}}x^{ {{eval:n-1}} }', ERR_DIVISE_N, 'Division par n'),
    ])],
    ['$f(x)=k\\times x^{ {{n}} }$ avec $k={{eval:p/q}}$, et $(x^{ {{n}} })\'={{n}}x^{ {{eval:n-1}} }$.',
     'Donc $f\'(x)={{eval:p/q}}\\times{{n}}x^{ {{eval:n-1}} }={{solution:0}}$.'],
    'Rappel : $(x^n)\'=nx^{n-1}$, et un coefficient multiplicatif se garde : $(ku)\'=ku\'$.',
    ['gcd(p,q) = 1']))
v = {'p': 2, 'q': 3, 'n': 4}
s74 += [spec('2/3 x⁴ : 8/3 x³', 0, v, 'correct', ['\\frac{8}{3}x^3']),
        spec('2/3 x⁴ : 8x³/3', 0, v, 'correct', ['\\frac{8x^3}{3}']),
        spec('Exposant pas multiplié', 0, v, 'incorrect', ['\\frac{2}{3}x^3'],
             'Tu as oublié de multiplier par l\'exposant $4$ : $(x^n)\'=nx^{n-1}$.'),
        spec('Exposant pas baissé', 0, v, 'incorrect', ['\\frac{8}{3}x^4'], ERR_EXPOSANT),
        spec('Division par n', 0, v, 'incorrect', ['\\frac{1}{6}x^3'],
             'Il faut multiplier le coefficient par $4$, pas le diviser.'),
        spec('Non simplifié 4×2/3', 0, v, 'unoptimal_form', ['\\frac{4\\times2}{3}x^3'], violations=('reducedFractions', 'form'))]
v = {'p': -3, 'q': 2, 'n': 4}
s74 += [spec('−3/2 x⁴ : −6x³', 0, v, 'correct', ['-6x^3'])]

ERR_RAC_2 = 'N\'oublie pas le $2$ : $(\\sqrt{x})\'=\\dfrac{1}{2\\sqrt{x}}$.'
ERR_RAC_HAUT = 'La racine va au dénominateur : $(\\sqrt{x})\'=\\dfrac{1}{2\\sqrt{x}}$.'
v74.append(variation(
    'Calcule la dérivée de cette fonction, pour $x>0$.\n\n'
    '$$f(x)=\\frac{ {{p}} }{ {{q}} }\\sqrt{x}$$\n\n$f\'(x)=?$',
    [var('p', '1..5'), var('q', '2..5')],
    [case('\\frac{ {{p}} }{ {{eval:2*q}}\\sqrt{x} }', [
        erreur('\\frac{ {{p}} }{ {{q}}\\sqrt{x} }', ERR_RAC_2, 'Facteur 2 oublié'),
        erreur('\\frac{ {{p}}\\sqrt{x} }{ {{eval:2*q}} }', ERR_RAC_HAUT, '√x au numérateur'),
    ])],
    ['La dérivée de $x\\mapsto\\sqrt{x}$ est $x\\mapsto\\dfrac{1}{2\\sqrt{x}}$ (pour $x>0$), et '
     '$f(x)=\\dfrac{ {{p}} }{ {{q}} }\\times\\sqrt{x}$.',
     'Donc $f\'(x)=\\dfrac{ {{p}} }{ {{q}} }\\times\\dfrac{1}{2\\sqrt{x}}={{solution:0}}$.'],
    'Rappel : $(\\sqrt{x})\'=\\dfrac{1}{2\\sqrt{x}}$, et un coefficient multiplicatif se garde.',
    ['gcd(p,q) = 1', 'gcd(p,2*q) = 1']))
v = {'p': 3, 'q': 4}
s74 += [spec('3/4 √x : 3/(8√x)', 1, v, 'correct', ['\\frac{3}{8\\sqrt{x}}']),
        spec('3/4 √x : facteur 2 oublié', 1, v, 'incorrect', ['\\frac{3}{4\\sqrt{x}}'], ERR_RAC_2),
        spec('3/4 √x : √x en haut', 1, v, 'incorrect', ['\\frac{3\\sqrt{x}}{8}'], ERR_RAC_HAUT)]
ajouter('74d77343', v74, s74)

# =============================================================================================
# 1666b8e9 — Dériver un polynôme (1SPE-265, 1 techno). F6 : coefficients décimaux.
# Un décimal écrit dans l'expression donne des décimaux (ubumark.md).
# =============================================================================================

v166 = []
s166 = []
ERR_CONSTANTE = 'La dérivée d\'une constante est nulle.'
ERR_PAS_MULT = 'Multiplie chaque coefficient par l\'exposant : $(ax^n)\'=nax^{n-1}$.'
v166.append(variation(
    'Soit $f$ la fonction définie sur $\\mathbb{R}$ par $f(x)={{eval:a*x^3+b*x^2+c*x+d}}$.\n\n'
    'Calcule $f\'(x)$.\n\n$f\'(x)=?$',
    [X, var('a', '0.5|1.5|2.5|0.2|1.2|-0.5|-1.5|-2.5|-0.2|-1.2'),
     var('b', '0.5|1.5|2.5|0.4|1.4|-0.5|-1.5|-2.5|-0.4|-1.4'),
     var('c', '1..9;±'), var('d', '1..9;±')],
    [case('{{eval:3*a*x^2+2*b*x+c}}', [
        erreur('{{eval:a*x^2+b*x+c}}', ERR_PAS_MULT, 'Exposant pas multiplié'),
        erreur('{{eval:3*a*x^2+2*b*x+c+d}}', ERR_CONSTANTE, 'Constante gardée'),
        erreur('{{eval:3*a*x^3+2*b*x^2+c*x}}', 'L\'exposant baisse de $1$ : $(x^n)\'=nx^{n-1}$.',
               'Exposant pas baissé'),
    ])],
    ['On dérive terme à terme : $(ax^n)\'=nax^{n-1}$, et la dérivée d\'une constante est nulle.',
     '$f\'(x)=3\\times{{a;()}}x^2+2\\times{{b;()}}x{{c;+}}='
     + PRIMAIRE + '{ {{eval:3*a*x^2+2*b*x+c}} }$.'],
    'Dérive terme à terme avec $(x^n)\'=nx^{n-1}$ ; les coefficients décimaux se multiplient '
    'comme les autres.'))
v = {'a': '0.5', 'b': '-1.5', 'c': 3, 'd': -4}  # f' = 1,5x² − 3x + 3
s166 += [spec('0,5x³ − 1,5x² + 3x − 4 : 1,5x² − 3x + 3', 0, v, 'correct', ['1{,}5x^2-3x+3']),
         spec('écriture fractionnaire 3/2 x²', 0, v, 'unoptimal_form', ['\\frac{3}{2}x^2-3x+3']),
         spec('Exposant pas multiplié', 0, v, 'incorrect', ['0{,}5x^2-1{,}5x+3'], ERR_PAS_MULT),
         spec('Constante gardée', 0, v, 'incorrect', ['1{,}5x^2-3x-1'], ERR_CONSTANTE),
         spec('Exposant pas baissé', 0, v, 'incorrect', ['1{,}5x^3-3x^2+3x'],
              'L\'exposant baisse de $1$ : $(x^n)\'=nx^{n-1}$.')]
ajouter('1666b8e9', v166, s166)

# =============================================================================================
# 0140fdfa — Dériver l'inverse d'une fonction (1SPE-395). F7 : k/(ax² + c), a ≠ 1.
# =============================================================================================

v014 = []
s014 = []
ERR_V_2X = 'La dérivée de ${{a}}x^2{{c;+}}$ est ${{eval:2*a}}x$ : n\'oublie pas le coefficient ${{a}}$.'
ERR_V_OUBLIE = 'Il manque $v\'$ au numérateur : $\\left(\\dfrac{k}{v}\\right)\'=-\\dfrac{kv\'}{v^2}$.'
ERR_SIGNE_INV = 'N\'oublie pas le signe $-$ : $\\left(\\dfrac{k}{v}\\right)\'=-\\dfrac{kv\'}{v^2}$.'
v014.append(variation(
    'Soit $f$ la fonction définie sur $\\mathbb{R}$ par $f(x)=\\frac{ {{k}} }{ {{a}}x^2+{{c}} }$.\n\n'
    'Calcule $f\'(x)$.\n\n$f\'(x)=?$',
    [var('k', '1..6'), var('a', '2..5'), var('c', '1..9')],
    [case('-\\frac{ {{eval:2*a*k}}x}{({{a}}x^2+{{c}})^2}', [
        erreur('-\\frac{ {{eval:2*k}}x}{({{a}}x^2+{{c}})^2}', ERR_V_2X, 'Coefficient a oublié dans v′'),
        erreur('-\\frac{ {{k}} }{({{a}}x^2+{{c}})^2}', ERR_V_OUBLIE, 'v′ oublié'),
        erreur('\\frac{ {{eval:2*a*k}}x}{({{a}}x^2+{{c}})^2}', ERR_SIGNE_INV, 'Signe oublié'),
    ])],
    ['$f=k\\times\\frac{1}{v}$ avec $k={{k}}$ : $\\left(\\frac{k}{v}\\right)\'=-\\frac{kv\'}{v^2}$.',
     'Avec $v(x)={{a}}x^2+{{c}}$ : $v\'(x)={{eval:2*a}}x$. On a bien $v(x)>0$ pour tout réel $x$.',
     '$$f\'(x)=-\\frac{ {{k}}\\times{{eval:2*a}}x}{({{a}}x^2+{{c}})^2}='
     + PRIMAIRE + '{-\\frac{ {{eval:2*a*k}}x}{({{a}}x^2+{{c}})^2} }$$'],
    'Écris $f=\\dfrac{k}{v}$ et utilise $\\left(\\dfrac{k}{v}\\right)\'=-\\dfrac{kv\'}{v^2}$ ; '
    'calcule $v\'$ avec soin.'))
v = {'k': 3, 'a': 2, 'c': 5}
s014 += [spec('3/(2x² + 5) : −12x/(2x² + 5)²', 0, v, 'correct', ['-\\frac{12x}{(2x^2+5)^2}']),
         spec('dénominateur développé', 0, v, 'unoptimal_form', ['-\\frac{12x}{4x^4+20x^2+25}']),
         spec('Coefficient a oublié', 0, v, 'incorrect', ['-\\frac{6x}{(2x^2+5)^2}'],
              'La dérivée de $2 x^2 + 5$ est $4 x$ : n\'oublie pas le coefficient $2$.'),
         spec('v′ oublié', 0, v, 'incorrect', ['-\\frac{3}{(2x^2+5)^2}'], ERR_V_OUBLIE),
         spec('Signe oublié', 0, v, 'incorrect', ['\\frac{12x}{(2x^2+5)^2}'], ERR_SIGNE_INV)]
ajouter('0140fdfa', v014, s014)

# =============================================================================================
# 8997f7c6 — Dériver un produit (1SPE-394). F8 : ax²√x, (ax² + c)√x.
# =============================================================================================

v899 = []
s899 = []
ERR_UPRIME_VPRIME = 'La dérivée d\'un produit n\'est pas le produit des dérivées : $(uv)\'=u\'v+uv\'$.'
ERR_UN_TERME = 'Il manque un des deux termes de $(uv)\'=u\'v+uv\'$.'
DOMAINE_RAC = ('Soit $f$ la fonction définie sur $[0\\,;+\\infty[$ par $f(x)={{FX}}$. Elle est '
               'dérivable sur $]0\\,;+\\infty[$.\n\nCalcule $f\'(x)$ pour $x>0$.\n\n$f\'(x)=?$')

v899.append(variation(
    DOMAINE_RAC.replace('{{FX}}', '{{eval:a*x^2}}\\sqrt{x}'),
    [X, var('a', '1..5;±')],
    [case('{{eval:5*a/2}}x\\sqrt{x}', [
        erreur('{{a}}\\sqrt{x}', ERR_UPRIME_VPRIME, 'u′v′'),
        erreur('{{eval:2*a}}x\\sqrt{x}', ERR_UN_TERME, 'Terme uv′ oublié'),
        erreur('\\frac{ {{eval:a*x^2}} }{2\\sqrt{x}}', ERR_UN_TERME, 'Terme u′v oublié'),
    ])],
    ['$f=uv$ avec $u(x)={{eval:a*x^2}}$ et $v(x)=\\sqrt{x}$ : $u\'(x)={{eval:2*a*x}}$ et '
     '$v\'(x)=\\dfrac{1}{2\\sqrt{x}}$.',
     '$$f\'(x)={{eval:2*a*x}}\\sqrt{x}{{if:a>0|+|}}{{eval:a*x^2}}\\times\\dfrac{1}{2\\sqrt{x}}'
     '={{eval:2*a*x}}\\sqrt{x}{{if:a>0|+|-}}\\dfrac{ {{eval:abs(a)*x}} }{2}\\sqrt{x}$$ car '
     '$\\dfrac{x^2}{\\sqrt{x}}=x\\sqrt{x}$.',
     '$$f\'(x)=' + PRIMAIRE + '{ {{eval:5*a/2}}x\\sqrt{x} }$$'],
    'Écris $f=uv$ avec $u(x)={{eval:a*x^2}}$ et $v(x)=\\sqrt{x}$, applique $(uv)\'=u\'v+uv\'$, '
    'puis utilise $\\dfrac{x^2}{\\sqrt{x}}=x\\sqrt{x}$.'))
v = {'a': 2}
s899 += [spec('2x²√x : 5x√x', 0, v, 'correct', ['5x\\sqrt{x}']),
         spec('2x²√x : forme non réduite', 0, v, 'unoptimal_form',
              ['4x\\sqrt{x}+\\frac{2x^2}{2\\sqrt{x}}'], violations=('reducedFractions', 'form')),
         spec('u′v′', 0, v, 'incorrect', ['2\\sqrt{x}'], ERR_UPRIME_VPRIME),
         spec('Terme uv′ oublié', 0, v, 'incorrect', ['4x\\sqrt{x}'], ERR_UN_TERME),
         spec('Terme u′v oublié', 0, v, 'incorrect', ['\\frac{2x^2}{2\\sqrt{x}}'], ERR_UN_TERME)]
v = {'a': -1}
s899 += [spec('−x²√x : −5/2 x√x', 0, v, 'correct', ['-\\frac{5}{2}x\\sqrt{x}'])]

v899.append(variation(
    DOMAINE_RAC.replace('{{FX}}', '({{eval:a*x^2+c}})\\sqrt{x}'),
    [X, var('a', '1..4;±'), var('c', '1..6;±')],
    [case('\\frac{ {{eval:5*a*x^2+c}} }{2\\sqrt{x}}', [
        erreur('\\frac{ {{eval:a*x}} }{\\sqrt{x}}', ERR_UPRIME_VPRIME, 'u′v′'),
        erreur('{{eval:2*a*x}}\\sqrt{x}', ERR_UN_TERME, 'Terme uv′ oublié'),
        erreur('\\frac{ {{eval:a*x^2+c}} }{2\\sqrt{x}}', ERR_UN_TERME, 'Terme u′v oublié'),
    ])],
    ['$f=uv$ avec $u(x)={{eval:a*x^2+c}}$ et $v(x)=\\sqrt{x}$ : $u\'(x)={{eval:2*a*x}}$ et '
     '$v\'(x)=\\dfrac{1}{2\\sqrt{x}}$.',
     '$$f\'(x)={{eval:2*a*x}}\\sqrt{x}+\\dfrac{ {{eval:a*x^2+c}} }{2\\sqrt{x}}$$',
     'Au même dénominateur, avec ${{eval:2*a*x}}\\sqrt{x}=\\dfrac{ {{eval:4*a*x^2}} }{2\\sqrt{x}}$ : '
     '$$f\'(x)=' + PRIMAIRE + '{\\dfrac{ {{eval:5*a*x^2+c}} }{2\\sqrt{x}} }$$'],
    'Écris $f=uv$ avec $v(x)=\\sqrt{x}$, applique $(uv)\'=u\'v+uv\'$, puis réduis au même '
    'dénominateur $2\\sqrt{x}$.'))
v = {'a': 1, 'c': 3}
s899 += [spec('(x² + 3)√x : (5x² + 3)/(2√x)', 1, v, 'correct', ['\\frac{5x^2+3}{2\\sqrt{x}}']),
         spec('(x² + 3)√x : somme non réduite', 1, v, 'unoptimal_form',
              ['2x\\sqrt{x}+\\frac{x^2+3}{2\\sqrt{x}}']),
         spec('u′v′', 1, v, 'incorrect', ['\\frac{x}{\\sqrt{x}}'], ERR_UPRIME_VPRIME),
         spec('Terme uv′ oublié', 1, v, 'incorrect', ['2x\\sqrt{x}'], ERR_UN_TERME),
         spec('Terme u′v oublié', 1, v, 'incorrect', ['\\frac{x^2+3}{2\\sqrt{x}}'], ERR_UN_TERME)]
ajouter('8997f7c6', v899, s899)

# =============================================================================================
# f1440b52 — Dériver un quotient (1SPE-396). F9 : ax²/(x + d), (ax² + bx + c)/(x + d),
# kx/(x² + c).
# =============================================================================================

vf14 = []
sf14 = []
ERR_QUOTIENT_DERIVEES = ('La dérivée d\'un quotient n\'est pas le quotient des dérivées : '
                         '$\\left(\\dfrac{u}{v}\\right)\'=\\dfrac{u\'v-uv\'}{v^2}$.')
ERR_ORDRE = ('Attention à l\'ordre au numérateur : $u\' v - u v\'$, pas $u v\' - u\' v$.')
ERR_PAS_CARRE = 'Le dénominateur de la dérivée est $v^2$ : n\'oublie pas le carré.'
ERR_PARENTHESE = 'Le signe $-$ porte sur tout le produit $u v\'$ : mets-le entre parenthèses.'
DEF_QUOTIENT = ('Soit $f$ la fonction définie pour $x\\neq{{NI}}$ par $f(x)={{FX}}$.\n\n'
                'Calcule $f\'(x)$.\n\n$f\'(x)=?$')

# v3 — ax²/(x + d)
vf14.append(variation(
    DEF_QUOTIENT.replace('{{NI}}', '{{eval:-d}}').replace(
        '{{FX}}', '\\frac{ {{eval:a*x^2}} }{x{{d;+}} }'),
    [X, var('a', '1..4;±'), var('d', '1..5;±')],
    [case('\\frac{ {{eval:a*x^2+2*a*d*x}} }{(x{{d;+}})^2}', [
        erreur('{{eval:2*a*x}}', ERR_QUOTIENT_DERIVEES, 'u′/v′'),
        erreur('\\frac{ {{eval:-a*x^2-2*a*d*x}} }{(x{{d;+}})^2}', ERR_ORDRE, 'Ordre u′v − uv′ inversé'),
        erreur('\\frac{ {{eval:a*x^2+2*a*d*x}} }{x{{d;+}} }', ERR_PAS_CARRE, 'v² oublié'),
    ])],
    ['$f=\\dfrac{u}{v}$ : $\\left(\\dfrac{u}{v}\\right)\'=\\dfrac{u\'v-uv\'}{v^2}$.',
     'Avec $u(x)={{eval:a*x^2}}$ et $v(x)=x{{d;+}}$ : $u\'(x)={{eval:2*a*x}}$ et $v\'(x)=1$.',
     '$$f\'(x)=\\dfrac{ {{eval:2*a*x}}(x{{d;+}})-{{eval:a*x^2;()}} }{(x{{d;+}})^2}='
     + PRIMAIRE + '{\\dfrac{ {{eval:a*x^2+2*a*d*x}} }{(x{{d;+}})^2} }$$',
     'On garde le dénominateur sous forme de carré : il est positif.'],
    'Écris $f=\\dfrac{u}{v}$, calcule $u\'$ et $v\'$, puis applique '
    '$\\left(\\dfrac{u}{v}\\right)\'=\\dfrac{u\'v-uv\'}{v^2}$.'))
v = {'a': 3, 'd': 2}
sf14 += [spec('3x²/(x + 2) : (3x² + 12x)/(x + 2)²', 0, v, 'correct',
              ['\\frac{3x^2+12x}{(x+2)^2}']),
         spec('3x²/(x + 2) : numérateur factorisé', 0, v, 'unoptimal_form',
              ['\\frac{3x(x+4)}{(x+2)^2}']),
         spec('u′/v′', 0, v, 'incorrect', ['6x'], ERR_QUOTIENT_DERIVEES),
         spec('Ordre inversé', 0, v, 'incorrect', ['\\frac{-3x^2-12x}{(x+2)^2}'], ERR_ORDRE),
         spec('v² oublié', 0, v, 'incorrect', ['\\frac{3x^2+12x}{x+2}'], ERR_PAS_CARRE)]

# v4 — (ax² + bx + c)/(x + d)
vf14.append(variation(
    DEF_QUOTIENT.replace('{{NI}}', '{{eval:-d}}').replace(
        '{{FX}}', '\\frac{ {{eval:a*x^2+b*x+c}} }{x{{d;+}} }'),
    [X, var('a', '2|3|-2|-3'), var('b', '1..6;±'), var('c', '1..6;±'), var('d', '1..5;±')],
    [case('\\frac{ {{eval:a*x^2+2*a*d*x+b*d-c}} }{(x{{d;+}})^2}', [
        erreur('{{eval:2*a*x+b}}', ERR_QUOTIENT_DERIVEES, 'u′/v′'),
        erreur('\\frac{ {{eval:a*x^2+(2*a*d+2*b)*x+b*d+c}} }{(x{{d;+}})^2}', ERR_PARENTHESE,
               'Parenthèses oubliées après le −'),
        erreur('\\frac{ {{eval:a*x^2+2*a*d*x+b*d-c}} }{x{{d;+}} }', ERR_PAS_CARRE, 'v² oublié'),
    ])],
    ['$f=\\dfrac{u}{v}$ : $\\left(\\dfrac{u}{v}\\right)\'=\\dfrac{u\'v-uv\'}{v^2}$.',
     'Avec $u(x)={{eval:a*x^2+b*x+c}}$ et $v(x)=x{{d;+}}$ : $u\'(x)={{eval:2*a*x+b}}$ et '
     '$v\'(x)=1$.',
     '$$f\'(x)=\\dfrac{({{eval:2*a*x+b}})(x{{d;+}})-({{eval:a*x^2+b*x+c}})}{(x{{d;+}})^2}$$',
     'On développe et on réduit le numérateur : '
     '$({{eval:2*a*x+b}})(x{{d;+}})={{eval:2*a*x^2+(2*a*d+b)*x+b*d}}$, donc '
     '$$f\'(x)=' + PRIMAIRE + '{\\dfrac{ {{eval:a*x^2+2*a*d*x+b*d-c}} }{(x{{d;+}})^2} }$$'],
    'Écris $f=\\dfrac{u}{v}$, calcule $u\'$ et $v\'$, applique '
    '$\\left(\\dfrac{u}{v}\\right)\'=\\dfrac{u\'v-uv\'}{v^2}$, puis réduis le numérateur.',
    ['a*d^2-b*d+c != 0', 'b*d-c != 0']))
v = {'a': 2, 'b': 1, 'c': 3, 'd': 1}  # (2x² + x + 3)/(x + 1) : (2x² + 4x − 2)/(x + 1)²
sf14 += [spec('(2x² + x + 3)/(x + 1) : (2x² + 4x − 2)/(x + 1)²', 1, v, 'correct',
              ['\\frac{2x^2+4x-2}{(x+1)^2}']),
         spec('u′/v′', 1, v, 'incorrect', ['4x+1'], ERR_QUOTIENT_DERIVEES),
         spec('Parenthèses oubliées', 1, v, 'incorrect', ['\\frac{2x^2+6x+4}{(x+1)^2}'],
              ERR_PARENTHESE),
         spec('v² oublié', 1, v, 'incorrect', ['\\frac{2x^2+4x-2}{x+1}'], ERR_PAS_CARRE)]

# v5 — kx/(x² + c)
vf14.append(variation(
    'Soit $f$ la fonction définie sur $\\mathbb{R}$ par $f(x)=\\frac{ {{k}}x}{x^2+{{c}} }$.\n\n'
    'Calcule $f\'(x)$.\n\n$f\'(x)=?$',
    [X, var('k', '2..6'), var('c', '1..9')],
    [case('\\frac{ {{eval:-k*x^2+k*c}} }{(x^2+{{c}})^2}', [
        erreur('\\frac{ {{k}} }{2x}', ERR_QUOTIENT_DERIVEES, 'u′/v′'),
        erreur('\\frac{ {{eval:k*x^2-k*c}} }{(x^2+{{c}})^2}', ERR_ORDRE, 'Ordre u′v − uv′ inversé'),
        erreur('\\frac{ {{eval:-k*x^2+k*c}} }{x^2+{{c}} }', ERR_PAS_CARRE, 'v² oublié'),
    ])],
    ['$f=\\dfrac{u}{v}$ : $\\left(\\dfrac{u}{v}\\right)\'=\\dfrac{u\'v-uv\'}{v^2}$.',
     'Avec $u(x)={{k}}x$ et $v(x)=x^2+{{c}}$ : $u\'(x)={{k}}$ et $v\'(x)=2x$.',
     '$$f\'(x)=\\dfrac{ {{k}}(x^2+{{c}})-{{k}}x\\times2x}{(x^2+{{c}})^2}='
     + PRIMAIRE + '{\\dfrac{ {{eval:-k*x^2+k*c}} }{(x^2+{{c}})^2} }$$'],
    'Écris $f=\\dfrac{u}{v}$ avec $v(x)=x^2+{{c}}$, puis applique '
    '$\\left(\\dfrac{u}{v}\\right)\'=\\dfrac{u\'v-uv\'}{v^2}$.'))
v = {'k': 2, 'c': 3}
sf14 += [spec('2x/(x² + 3) : (−2x² + 6)/(x² + 3)²', 2, v, 'correct',
              ['\\frac{-2x^2+6}{(x^2+3)^2}']),
         spec('2x/(x² + 3) : 2(3 − x²)/(x² + 3)²', 2, v, 'unoptimal_form',
              ['\\frac{2(3-x^2)}{(x^2+3)^2}']),
         spec('u′/v′', 2, v, 'incorrect', ['\\frac{2}{2x}'], ERR_QUOTIENT_DERIVEES),
         spec('Ordre inversé', 2, v, 'incorrect', ['\\frac{2x^2-6}{(x^2+3)^2}'], ERR_ORDRE),
         spec('v² oublié', 2, v, 'incorrect', ['\\frac{-2x^2+6}{x^2+3}'], ERR_PAS_CARRE)]
ajouter('f1440b52', vf14, sf14)
