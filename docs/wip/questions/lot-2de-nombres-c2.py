"""Écrit les 7 modèles du lot C2 (2de, nombres : racines carrées, puissances de 10, ranger)
dans le dossier donné (scripts/questions/2de-nombres-c2/).

Chantier `ensembles-2de`, conception validée par David. Points visés (rangement et tag posés
plus tard par migration, jamais dans le fichier) :

  01 Une racine carrée existe-t-elle ?      2-261   level 4
  02 Racine d'un carré parfait              2-261   level 5
  03 Calculs directs avec des racines       2-261   level 6
  04 Développer avec des racines            2-261   level 7
  05 Encadrer entre deux puissances de 10   2-254   level 13
  06 Ranger des carrés et des cubes         2-264   level 10
  07 Rationaliser un dénominateur           HORS PROGRAMME, gardé SANS point (voulu par David)
                                            level 3

Pièges respectés (couvrir-un-niveau.md § 9) : ni `e` ni `i` en variable ; décimaux tirés en
entiers puis affichés par `{{eval:…;d}}` ; couleur toujours dans `$…$` ; le corrigé nomme la
bonne réponse, jamais son rang ; coefficient 1 jamais écrit devant une racine (`co()`).
"""
import json
import os
import sys

DOSSIER = sys.argv[1]

# Entiers qui ne sont pas des carrés parfaits (radicandes)
NON_CARRES = '2|3|5|6|7|10|11|13|14|15'


def spec(desc, vi, variables_, status, answers, violations=None):
    expected = {'status': status}
    if violations:
        expected['constraintViolations'] = violations
    return {'description': desc, 'variationIndex': vi, 'variables': variables_,
            'expected': expected, 'answers': answers}


def modele(title, description, level, delay, variations, specs, shared=None, options=None):
    m = {'title': title, 'description': description, 'grades': ['2'], 'level': level,
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
    v = {'statement': statement, 'variables': variables, 'conditions': conditions or [],
         'blanks': blanks, 'correction': {'steps': steps}}
    v.update(extra)
    return v


def blank(expected, **extra):
    b = {'expectedAnswer': expected}
    b.update(extra)
    return b


def bloc(nom, *lignes):
    return '```' + nom + '\n' + '\n'.join(lignes) + '\n```'


def coul(x):
    """Réponse mise en couleur (toujours à l'intérieur d'un `$…$`)."""
    return '\\textcolor{{{color:primary.0}}}{' + x + '}'


def co(v):
    """Coefficient devant une racine : rien quand il vaut 1 (jamais `1\\sqrt{…}`)."""
    return '{{if:' + v + '==1||{{' + v + '}}}}'


def rac(v):
    return '\\sqrt{ {{' + v + '}} }'


OUI_NON = bloc('choix', 'melanger: non', '- Oui', '- Non')

# Espaces dès 4 chiffres (0,003 2 ; 0,004 9 ; 32 000) : l'affichage les pose lui-même avec ce
# réglage ; les réponses (exposants, petits décimaux) n'ont jamais 4 chiffres.
ESPACES_DES_4 = {'constraints': {'spacesFromFourDigits': True}}

# --- 01 · 2-261 · Une racine carrée existe-t-elle ? ------------------------------------------
# Réponse du choix : 0 = Oui, 1 = Non (melanger: non).

DEF_RACINE = ('$\\sqrt{x}$ n\'existe que si $x$ est **positif ou nul** : aucun nombre n\'a un '
              'carré négatif.')

M1_V0 = variation(
    'Le nombre $\\sqrt{ {{if:s==0|{{a}}-\\pi|\\pi-{{a}}}} }$ existe-t-il ?\n\n' + OUI_NON,
    [var('a', '2..5'), var('s', '0|1'),
     var('rep', 'eval:(1-s)*(1-min(max(a-3,0),1))+s*min(max(a-3,0),1)')],
    [blank('{{rep}}')],
    [DEF_RACINE,
     '$\\pi\\approx3{,}14$, donc {{if:s==0|${{a}}-\\pi$|$\\pi-{{a}}$}} est '
     '{{if:rep==0|positif|négatif}} : ${{if:s==0|{{a}}-\\pi|\\pi-{{a}}}}'
     '{{if:rep==0|>|<}}0$.',
     '{{if:rep==0|$\\sqrt{ {{if:s==0|{{a}}-\\pi|\\pi-{{a}}}} }$ existe : la réponse est '
     '$' + coul('\\text{Oui}') + '$.|$\\sqrt{ {{if:s==0|{{a}}-\\pi|\\pi-{{a}}}} }$ n\'existe '
     'pas : la réponse est $' + coul('\\text{Non}') + '$.}}'],
)

M1_V1 = variation(
    'Le nombre $\\sqrt{ {{if:t==0|-{{a}}|{{if:t==1|(-{{a}})^2|-{{a}}^2}}}} }$ existe-t-il ?\n\n'
    + OUI_NON,
    [var('t', '0..2'), var('a', '2..9'), var('rep', 'eval:min(abs(t-1),1)')],
    [blank('{{rep}}')],
    [DEF_RACINE,
     '{{if:t==0|$-{{a}}$ est négatif.|{{if:t==1|$(-{{a}})^2=(-{{a}})\\times(-{{a}})='
     '{{eval:a^2}}$ : un carré est toujours positif.|$-{{a}}^2=-({{a}}\\times{{a}})='
     '-{{eval:a^2}}$ : le carré ne porte que sur ${{a}}$, le signe $-$ reste devant. '
     'C\'est un nombre négatif.}}}}',
     '{{if:rep==0|$\\sqrt{(-{{a}})^2}=\\sqrt{ {{eval:a^2}} }={{a}}$ existe : la réponse est $'
     + coul('\\text{Oui}') + '$.|Ce nombre n\'existe pas : la réponse est $'
     + coul('\\text{Non}') + '$.}}'],
)

M1_V2 = variation(
    'Le nombre $\\sqrt{ {{a}}-\\sqrt{ {{b}} } }$ existe-t-il ?\n\n' + OUI_NON,
    [var('a', '2..4'), var('d', '-2|-1|1|2'), var('b', 'eval:a^2+d'),
     var('rep', 'eval:min(max(d,0),1)')],
    [blank('{{rep}}')],
    [DEF_RACINE + ' Il faut savoir si ${{a}}-\\sqrt{ {{b}} }$ est positif, donc comparer '
     '${{a}}$ et $\\sqrt{ {{b}} }$.',
     'Ce sont deux nombres positifs : on compare leurs carrés. ${{a}}^2={{eval:a^2}}$ et '
     '$(\\sqrt{ {{b}} })^2={{b}}$.',
     '{{if:rep==0|${{eval:a^2}}>{{b}}$, donc ${{a}}>\\sqrt{ {{b}} }$ et '
     '${{a}}-\\sqrt{ {{b}} }>0$ : la racine existe, la réponse est $' + coul('\\text{Oui}')
     + '$.|${{eval:a^2}}<{{b}}$, donc ${{a}}<\\sqrt{ {{b}} }$ et ${{a}}-\\sqrt{ {{b}} }<0$ : '
     'la racine n\'existe pas, la réponse est $' + coul('\\text{Non}') + '$.}}'],
)

M1_SPECS = [
    spec('√(3 − π) : Non', 0, {'a': '3', 's': '0'}, 'correct', ['1']),
    spec('Erreur : √(3 − π) existe', 0, {'a': '3', 's': '0'}, 'incorrect', ['0']),
    spec('√(π − 3) : Oui', 0, {'a': '3', 's': '1'}, 'correct', ['0']),
    spec('√(4 − π) : Oui', 0, {'a': '4', 's': '0'}, 'correct', ['0']),
    spec('√(−4) : Non', 1, {'t': '0', 'a': '4'}, 'correct', ['1']),
    spec('√((−4)²) : Oui', 1, {'t': '1', 'a': '4'}, 'correct', ['0']),
    spec('Erreur : √((−4)²) n\'existe pas (le signe −)', 1, {'t': '1', 'a': '4'}, 'incorrect',
         ['1']),
    spec('√(−4²) : Non', 1, {'t': '2', 'a': '4'}, 'correct', ['1']),
    spec('Erreur : √(−4²) existe (−4² lu (−4)²)', 1, {'t': '2', 'a': '4'}, 'incorrect', ['0']),
    spec('√(2 − √5) : Non', 2, {'a': '2', 'd': '1'}, 'correct', ['1']),
    spec('Erreur : √(2 − √5) existe', 2, {'a': '2', 'd': '1'}, 'incorrect', ['0']),
    spec('√(3 − √7) : Oui', 2, {'a': '3', 'd': '-2'}, 'correct', ['0']),
]

M1 = modele(
    'Une racine carrée existe-t-elle ?',
    'Dire si √x existe (Oui / Non) : √(3 − π), √(−4), √((−4)²), √(−4²), √(2 − √5) '
    '(pièges : (−4)² positif, −4² négatif, comparer a et √b par les carrés)',
    4, 45, [M1_V0, M1_V1, M1_V2], M1_SPECS)

# --- 02 · 2-261 · Racine d'un carré parfait ------------------------------------------------

M2_V0 = variation(
    'Calcule.\n\n$$\\sqrt{ {{eval:k^2}} }=?$$',
    [var('k', '2..15')],
    [blank('{{k}}')],
    ['$\\sqrt{ {{eval:k^2}} }$ est le nombre **positif** dont le carré vaut ${{eval:k^2}}$.',
     '${{k}}^2={{eval:k^2}}$, donc $\\sqrt{ {{eval:k^2}} }=' + coul('{{k}}') + '$.'],
)

M2_V1 = variation(
    'Calcule.\n\n$$\\sqrt{ {{eval:k^2/10^(2*p);d}} }=?$$',
    [var('k', '2|3|4|5|6|7|8|9|11|12'), var('p', '1..2')],
    [blank('{{eval:k/10^p;d}}')],
    ['On cherche le nombre positif dont le carré vaut ${{eval:k^2/10^(2*p);d}}$.',
     '${{eval:k/10^p;d}}^2={{eval:k/10^p;d}}\\times{{eval:k/10^p;d}}='
     '{{eval:k^2/10^(2*p);d}}$ : en élevant au carré, le nombre de chiffres après la virgule '
     '**double**.',
     'Donc $\\sqrt{ {{eval:k^2/10^(2*p);d}} }=' + coul('{{eval:k/10^p;d}}') + '$.'],
)

M2_V2 = variation(
    'Quel nombre **positif** a pour carré ${{eval:k^2}}$ ?\n\n$$?$$',
    [var('k', '2..15')],
    [blank('{{k}}')],
    ['${{k}}^2={{eval:k^2}}$ et ${{k}}$ est positif.',
     'Le nombre cherché est $\\sqrt{ {{eval:k^2}} }=' + coul('{{k}}') + '$. ($-{{k}}$ a aussi '
     'pour carré ${{eval:k^2}}$, mais il est négatif.)'],
)

M2_SPECS = [
    spec('√144 = 12', 0, {'k': '12'}, 'correct', ['12']),
    spec('Erreur : √144 = 72 (moitié)', 0, {'k': '12'}, 'incorrect', ['72']),
    spec('Erreur : √144 = −12', 0, {'k': '12'}, 'incorrect', ['-12']),
    spec('√0,09 = 0,3', 1, {'k': '3', 'p': '1'}, 'correct', ['0,3']),
    spec('Erreur : √0,09 = 0,03', 1, {'k': '3', 'p': '1'}, 'incorrect', ['0,03']),
    spec('√1,44 = 1,2', 1, {'k': '12', 'p': '1'}, 'correct', ['1,2']),
    spec('√0,0049 = 0,07', 1, {'k': '7', 'p': '2'}, 'correct', ['0,07']),
    spec('Erreur : √0,0049 = 0,007', 1, {'k': '7', 'p': '2'}, 'incorrect', ['0,007']),
    spec('Carré 144 → 12', 2, {'k': '12'}, 'correct', ['12']),
    spec('Erreur : −12 (négatif)', 2, {'k': '12'}, 'incorrect', ['-12']),
]

M2 = modele(
    'Racine d\'un carré parfait',
    'Calculer √144, √0,09, √0,0049 ou le nombre positif de carré 144 '
    '(pièges : √0,09 = 0,03, la réponse négative)',
    5, 30, [M2_V0, M2_V1, M2_V2], M2_SPECS,
    shared={'blankDefaults': {'acceptDecimal': True}}, options=ESPACES_DES_4)

# --- 03 · 2-261 · Calculs directs avec des racines ------------------------------------------

M3_V0 = variation(
    'Calcule.\n\n$$(' + rac('a') + ')^2=?$$',
    [var('a', NON_CARRES)],
    [blank('{{a}}')],
    ['Par définition, $' + rac('a') + '$ est le nombre positif dont le carré vaut ${{a}}$.',
     '$(' + rac('a') + ')^2=' + coul('{{a}}') + '$.'],
)

M3_V1 = variation(
    'Calcule.\n\n$$' + rac('a') + '\\times' + rac('a') + '=?$$',
    [var('a', NON_CARRES)],
    [blank('{{a}}')],
    ['$' + rac('a') + '\\times' + rac('a') + '=(' + rac('a') + ')^2$.',
     'Le carré de $' + rac('a') + '$ vaut ${{a}}$ : $' + rac('a') + '\\times' + rac('a') + '='
     + coul('{{a}}') + '$.'],
)

M3_V2 = variation(
    'Calcule.\n\n$${{p}}' + rac('a') + '\\times{{q}}' + rac('a') + '=?$$',
    [var('a', NON_CARRES), var('p', '2..6'), var('q', '2..6')],
    [blank('{{eval:p*q*a}}')],
    ['On regroupe les nombres et les racines : ${{p}}' + rac('a') + '\\times{{q}}' + rac('a')
     + '=({{p}}\\times{{q}})\\times(' + rac('a') + '\\times' + rac('a') + ')$.',
     '$' + rac('a') + '\\times' + rac('a') + '={{a}}$, donc le produit vaut '
     '${{eval:p*q}}\\times{{a}}=' + coul('{{eval:p*q*a}}') + '$.'],
)

M3_V3 = variation(
    'Calcule.\n\n$$({{p}}' + rac('a') + ')^2=?$$',
    [var('a', NON_CARRES), var('p', '2..6')],
    [blank('{{eval:p^2*a}}')],
    ['Le carré porte sur **les deux** facteurs : $({{p}}' + rac('a') + ')^2={{p}}^2\\times('
     + rac('a') + ')^2$.',
     '$={{eval:p^2}}\\times{{a}}=' + coul('{{eval:p^2*a}}') + '$.'],
)

M3_V4 = variation(
    'Calcule.\n\n$$' + co('p') + rac('a') + '+' + co('q') + rac('a') + '=?$$',
    [var('a', NON_CARRES), var('p', '1..4'), var('q', '1..4')],
    [blank('{{eval:p+q}}' + rac('a'))],
    ['On compte les $' + rac('a') + '$, comme on écrirait $' + co('p') + 'x+' + co('q')
     + 'x={{eval:p+q}}x$.',
     '$' + co('p') + rac('a') + '+' + co('q') + rac('a') + '=' + coul('{{eval:p+q}}' + rac('a'))
     + '$.',
     'Attention : on n\'additionne pas sous la racine, $' + co('p') + rac('a') + '+' + co('q')
     + rac('a') + '\\neq\\sqrt{ {{eval:(p+q)*a}} }$.'],
)

M3_SPECS = [
    spec('(√7)² = 7', 0, {'a': '7'}, 'correct', ['7']),
    spec('Erreur : (√7)² = 49', 0, {'a': '7'}, 'incorrect', ['49']),
    spec('Erreur : (√7)² = 14', 0, {'a': '7'}, 'incorrect', ['14']),
    spec('√7 × √7 = 7', 1, {'a': '7'}, 'correct', ['7']),
    spec('Perfectible : √7 × √7 = √49 (racine non simplifiée)', 1, {'a': '7'}, 'unoptimal_form',
         ['\\sqrt{49}'], ['reducedRadicals']),
    spec('3√2 × 5√2 = 30', 2, {'a': '2', 'p': '3', 'q': '5'}, 'correct', ['30']),
    spec('Erreur : 3√2 × 5√2 = 15√2', 2, {'a': '2', 'p': '3', 'q': '5'}, 'incorrect',
         ['15\\sqrt{2}']),
    spec('(2√3)² = 12', 3, {'a': '3', 'p': '2'}, 'correct', ['12']),
    spec('Erreur : (2√3)² = 6', 3, {'a': '3', 'p': '2'}, 'incorrect', ['6']),
    spec('Erreur : (2√3)² = 36', 3, {'a': '3', 'p': '2'}, 'incorrect', ['36']),
    spec('√5 + √5 = 2√5', 4, {'a': '5', 'p': '1', 'q': '1'}, 'correct', ['2\\sqrt{5}']),
    spec('Erreur : √5 + √5 = √10', 4, {'a': '5', 'p': '1', 'q': '1'}, 'incorrect',
         ['\\sqrt{10}']),
    spec('2√3 + 3√3 = 5√3', 4, {'a': '3', 'p': '2', 'q': '3'}, 'correct', ['5\\sqrt{3}']),
    spec('Erreur : 2√3 + 3√3 = 5√6', 4, {'a': '3', 'p': '2', 'q': '3'}, 'incorrect',
         ['5\\sqrt{6}']),
]

M3 = modele(
    'Calculs directs avec des racines',
    'Calculer (√7)², √7 × √7, 3√2 × 5√2, (2√3)², √5 + √5 '
    '(pièges : (2√3)² = 6, √a + √a = √(2a), (√7)² = 49)',
    6, 45, [M3_V0, M3_V1, M3_V2, M3_V3, M3_V4], M3_SPECS)

# --- 04 · 2-261 · Développer avec des racines -----------------------------------------------

M4_V0 = variation(
    'Développe et réduis.\n\n$$({{a}}+' + rac('b') + ')^2=?$$',
    [var('a', '1..5'), var('b', NON_CARRES)],
    [blank('{{eval:a^2+b}}+{{eval:2*a}}' + rac('b'))],
    ['On utilise $(u+v)^2=u^2+2uv+v^2$ avec $u={{a}}$ et $v=' + rac('b') + '$.',
     '$({{a}}+' + rac('b') + ')^2={{a}}^2+2\\times{{a}}\\times' + rac('b') + '+(' + rac('b')
     + ')^2={{eval:a^2}}+{{eval:2*a}}' + rac('b') + '+{{b}}$.',
     'On regroupe les nombres sans racine : $({{a}}+' + rac('b') + ')^2='
     + coul('{{eval:a^2+b}}+{{eval:2*a}}' + rac('b')) + '$.'],
)

M4_V1 = variation(
    'Développe et réduis.\n\n$$({{a}}-' + rac('b') + ')^2=?$$',
    [var('a', '1..5'), var('b', NON_CARRES)],
    [blank('{{eval:a^2+b}}-{{eval:2*a}}' + rac('b'))],
    ['On utilise $(u-v)^2=u^2-2uv+v^2$ avec $u={{a}}$ et $v=' + rac('b') + '$.',
     '$({{a}}-' + rac('b') + ')^2={{a}}^2-2\\times{{a}}\\times' + rac('b') + '+(' + rac('b')
     + ')^2={{eval:a^2}}-{{eval:2*a}}' + rac('b') + '+{{b}}$.',
     'On regroupe les nombres sans racine : $({{a}}-' + rac('b') + ')^2='
     + coul('{{eval:a^2+b}}-{{eval:2*a}}' + rac('b')) + '$.'],
)

M4_V2 = variation(
    'Développe et réduis.\n\n$$(' + rac('b') + '-{{a}})(' + rac('b') + '+{{a}})=?$$',
    [var('a', '1..4'), var('b', NON_CARRES)],
    [blank('{{eval:b-a^2}}')],
    ['On utilise $(u-v)(u+v)=u^2-v^2$ avec $u=' + rac('b') + '$ et $v={{a}}$.',
     '$(' + rac('b') + '-{{a}})(' + rac('b') + '+{{a}})=(' + rac('b') + ')^2-{{a}}^2='
     '{{b}}-{{eval:a^2}}=' + coul('{{eval:b-a^2}}') + '$.',
     'Les racines disparaissent : c\'est tout l\'intérêt de cette identité.'],
)

# (a + √b)(c − √b) = ac − b + (c − a)√b, m = c − a ≠ 0, k = ac − b ≠ 0
SIGNE_M = '{{if:m==1|+|{{if:m==-1|-|{{if:m>0|+{{m}}|{{m}}}}}}}}'

M4_V3 = variation(
    'Développe et réduis.\n\n$$({{a}}+' + rac('b') + ')({{c}}-' + rac('b') + ')=?$$',
    [var('a', '1..4'), var('c', '1..4'), var('b', NON_CARRES), var('m', 'eval:c-a'),
     var('k', 'eval:a*c-b')],
    [blank('{{k}}' + SIGNE_M + rac('b'))],
    ['Double distributivité : chaque terme de la première parenthèse multiplie chaque terme '
     'de la seconde.',
     '$({{a}}+' + rac('b') + ')({{c}}-' + rac('b') + ')={{a}}\\times{{c}}-' + co('a') + rac('b')
     + '+' + co('c') + rac('b') + '-' + rac('b') + '\\times' + rac('b') + '$',
     '$={{eval:a*c}}-' + co('a') + rac('b') + '+' + co('c') + rac('b') + '-{{b}}$.',
     'On regroupe les nombres d\'un côté, les $' + rac('b') + '$ de l\'autre : $'
     + coul('{{k}}' + SIGNE_M + rac('b')) + '$.'],
    conditions=['c != a', 'a*c != b'],
)

M4_SPECS = [
    spec('(1 + √2)² = 3 + 2√2', 0, {'a': '1', 'b': '2'}, 'correct', ['3+2\\sqrt{2}']),
    spec('(1 + √2)², termes dans l\'autre ordre', 0, {'a': '1', 'b': '2'}, 'correct',
         ['2\\sqrt{2}+3']),
    spec('Erreur : (1 + √2)² = 3 (double produit oublié)', 0, {'a': '1', 'b': '2'},
         'incorrect', ['3']),
    spec('Erreur : (1 + √2)² = 1 + 2√2 (oubli de (√2)²)', 0, {'a': '1', 'b': '2'},
         'incorrect', ['1+2\\sqrt{2}']),
    spec('Erreur : non développé', 0, {'a': '1', 'b': '2'}, 'bad_form',
         ['(1+\\sqrt{2})^2'], ['form']),
    spec('Erreur : non réduit (1 + 2√2 + 2)', 0, {'a': '1', 'b': '2'}, 'bad_form',
         ['1+2\\sqrt{2}+2'], ['form']),
    spec('Perfectible : 3 + √8 (racine non simplifiée)', 0, {'a': '1', 'b': '2'},
         'unoptimal_form', ['3+\\sqrt{8}'], ['reducedRadicals']),
    spec('(3 − √5)² = 14 − 6√5', 1, {'a': '3', 'b': '5'}, 'correct', ['14-6\\sqrt{5}']),
    spec('Erreur : (3 − √5)² = 4', 1, {'a': '3', 'b': '5'}, 'incorrect', ['4']),
    spec('(√5 − 1)(√5 + 1) = 4', 2, {'a': '1', 'b': '5'}, 'correct', ['4']),
    spec('Erreur : (√5 − 1)(√5 + 1) = 6', 2, {'a': '1', 'b': '5'}, 'incorrect', ['6']),
    spec('(√2 − 3)(√2 + 3) = −7', 2, {'a': '3', 'b': '2'}, 'correct', ['-7']),
    spec('(2 + √3)(1 − √3) = −1 − √3', 3, {'a': '2', 'c': '1', 'b': '3'}, 'correct',
         ['-1-\\sqrt{3}']),
    spec('Erreur : (2 + √3)(1 − √3) = 2 − 3 (produits croisés oubliés)', 3,
         {'a': '2', 'c': '1', 'b': '3'}, 'incorrect', ['-1']),
    spec('(1 + √5)(4 − √5) = −1 + 3√5', 3, {'a': '1', 'c': '4', 'b': '5'}, 'correct',
         ['-1+3\\sqrt{5}']),
]

M4 = modele(
    'Développer avec des racines',
    'Développer (1 + √2)², (3 − √5)², (√5 − 1)(√5 + 1), (2 + √3)(1 − √3) '
    '(pièges : (1 + √2)² = 3, oubli de (√b)², produits croisés oubliés)',
    7, 90, [M4_V0, M4_V1, M4_V2, M4_V3], M4_SPECS, shared={'cleanCoefficients': True})

# --- 05 · 2-254 · Encadrer entre deux puissances de 10 --------------------------------------
# x = u,v × 10^(±n) : deux premiers chiffres significatifs u, v (u ≠ 0, v ≠ 0).

M5_V0 = variation(
    'Complète avec deux entiers.\n\n$$10^{?}\\leqslant{{eval:(10*u+v)/10^(n+1);d}}<10^{?}$$',
    [var('u', '1..9'), var('v', '1..9'), var('n', '1..5')],
    [blank('{{eval:-n}}'), blank('{{eval:1-n}}')],
    ['On écrit le nombre en notation scientifique (un seul chiffre non nul avant la virgule) : '
     '${{eval:(10*u+v)/10^(n+1);d}}={{u}}{,}{{v}}\\times10^{-{{n}}}$.',
     'Comme $1\\leqslant{{u}}{,}{{v}}<10$, en multipliant par $10^{-{{n}}}$ : '
     '$10^{-{{n}}}\\leqslant{{eval:(10*u+v)/10^(n+1);d}}<10^{ {{eval:1-n}} }$.',
     'Les deux entiers sont $' + coul('{{eval:-n}}') + '$ et $' + coul('{{eval:1-n}}') + '$.'],
)

M5_V1 = variation(
    'Complète avec deux entiers.\n\n$$10^{?}\\leqslant{{eval:(10*u+v)*10^(n-1)}}<10^{?}$$',
    [var('u', '1..9'), var('v', '1..9'), var('n', '2..7')],
    [blank('{{n}}'), blank('{{eval:n+1}}')],
    ['On écrit le nombre en notation scientifique (un seul chiffre non nul avant la virgule) : '
     '${{eval:(10*u+v)*10^(n-1)}}={{u}}{,}{{v}}\\times10^{ {{n}} }$.',
     'Comme $1\\leqslant{{u}}{,}{{v}}<10$, en multipliant par $10^{ {{n}} }$ : '
     '$10^{ {{n}} }\\leqslant{{eval:(10*u+v)*10^(n-1)}}<10^{ {{eval:n+1}} }$.',
     'Les deux entiers sont $' + coul('{{n}}') + '$ et $' + coul('{{eval:n+1}}') + '$.'],
)

M5_SPECS = [
    spec('0,003 2 : entre 10⁻³ et 10⁻²', 0, {'u': '3', 'v': '2', 'n': '3'}, 'correct',
         ['-3', '-2']),
    spec('Erreur : zéros après la virgule comptés (10⁻² et 10⁻¹)', 0,
         {'u': '3', 'v': '2', 'n': '3'}, 'incorrect', ['-2', '-1']),
    spec('Erreur : bornes échangées', 0, {'u': '3', 'v': '2', 'n': '3'}, 'incorrect',
         ['-2', '-3']),
    spec('0,47 : entre 10⁻¹ et 10⁰', 0, {'u': '4', 'v': '7', 'n': '1'}, 'correct', ['-1', '0']),
    spec('32 000 : entre 10⁴ et 10⁵', 1, {'u': '3', 'v': '2', 'n': '4'}, 'correct',
         ['4', '5']),
    spec('Erreur : chiffres comptés (10⁵ et 10⁶)', 1, {'u': '3', 'v': '2', 'n': '4'},
         'incorrect', ['5', '6']),
]

M5 = modele(
    'Encadrer entre deux puissances de 10',
    'Trouver n et n + 1 tels que 10ⁿ ≤ x < 10ⁿ⁺¹ pour 0,003 2 ou 32 000 '
    '(pièges : compter les zéros ou les chiffres, bornes échangées)',
    13, 60, [M5_V0, M5_V1], M5_SPECS, options=ESPACES_DES_4)

# --- 06 · 2-264 · Ranger des carrés et des cubes --------------------------------------------
# Bloc ```ranger, étiquettes écrites dans le BON ordre (le tirage les mélange).

X01 = '0{,}{{a}}'          # base entre 0 et 1
X1 = '{{u}}{,}{{a}}'       # base plus grande que 1

M6_V0 = variation(
    'Range dans l\'ordre croissant.\n\n'
    + bloc('ranger', 'signe: <', '- $' + X01 + '^3$', '- $' + X01 + '^2$', '- $' + X01 + '$'),
    [var('a', '2..9')],
    [],
    ['$' + X01 + '$ est entre $0$ et $1$ : le multiplier par lui-même donne un nombre **plus '
     'petit**.',
     '$' + X01 + '^2={{eval:a^2/100;d}}$ et $' + X01 + '^3={{eval:a^3/1000;d}}$.',
     '$' + coul(X01 + '^3<' + X01 + '^2<' + X01) + '$.'],
)

M6_V1 = variation(
    'Range dans l\'ordre croissant.\n\n'
    + bloc('ranger', 'signe: <', '- $' + X01 + '^3$', '- $' + X01 + '^2$', '- $' + X01 + '$',
           '- $\\sqrt{' + X01 + '}$'),
    [var('a', '2..9')],
    [],
    ['$' + X01 + '$ est entre $0$ et $1$ : le multiplier par lui-même donne un nombre **plus '
     'petit**, donc $' + X01 + '^3<' + X01 + '^2<' + X01 + '$.',
     'Pour la racine, c\'est l\'inverse : $\\sqrt{' + X01 + '}\\approx'
     '{{eval:floor(sqrt(a*1000)+0.5)/100;d}}$, plus grand que $' + X01 + '$.',
     '$' + coul(X01 + '^3<' + X01 + '^2<' + X01 + '<\\sqrt{' + X01 + '}') + '$.'],
)

M6_V2 = variation(
    'Range dans l\'ordre croissant.\n\n'
    + bloc('ranger', 'signe: <', '- $\\sqrt{' + X1 + '}$', '- $' + X1 + '$', '- $' + X1 + '^2$',
           '- $' + X1 + '^3$'),
    [var('u', '1..2'), var('a', '1..9')],
    [],
    ['$' + X1 + '$ est plus grand que $1$ : le multiplier par lui-même donne un nombre **plus '
     'grand**, donc $' + X1 + '<' + X1 + '^2<' + X1 + '^3$.',
     'Pour la racine, c\'est l\'inverse : $\\sqrt{' + X1 + '}\\approx'
     '{{eval:floor(sqrt((10*u+a)*1000)+0.5)/100;d}}$, plus petit que $' + X1 + '$.',
     '$' + coul('\\sqrt{' + X1 + '}<' + X1 + '<' + X1 + '^2<' + X1 + '^3') + '$.'],
)

# Réponses d'un ranger = positions AFFICHÉES (mélange de l'instance) : relevées au runner.
# Ordre affiché pour a = 5 (u = 1) : V0 « x², x, x³ », V1 « x², x, √x, x³ »,
# V2 « x, x², x³, √x » (tirage déterministe pour des variables fixées).
M6_SPECS = [
    spec('0,5³ < 0,5² < 0,5', 0, {'a': '5'}, 'correct', ['2', '0', '1']),
    spec('Erreur : 0,5 < 0,5² < 0,5³ (comme pour une base > 1)', 0, {'a': '5'}, 'incorrect',
         ['1', '0', '2']),
    spec('0,5³ < 0,5² < 0,5 < √0,5', 1, {'a': '5'}, 'correct', ['3', '0', '1', '2']),
    spec('Erreur : √0,5 < 0,5 < 0,5² < 0,5³', 1, {'a': '5'}, 'incorrect',
         ['2', '1', '0', '3']),
    spec('√1,5 < 1,5 < 1,5² < 1,5³', 2, {'u': '1', 'a': '5'}, 'correct', ['3', '0', '1', '2']),
    spec('Erreur : 1,5³ < 1,5² < 1,5 < √1,5 (comme pour une base < 1)', 2,
         {'u': '1', 'a': '5'}, 'incorrect', ['2', '1', '0', '3']),
]

M6 = modele(
    'Ranger des carrés et des cubes',
    'Ranger x³, x², x (et √x) dans l\'ordre croissant pour x = 0,5 ou x = 1,5 '
    '(piège : croire x² > x même quand 0 < x < 1)',
    10, 60, [M6_V0, M6_V1, M6_V2], M6_SPECS)

# --- 07 · HORS PROGRAMME, sans point · Rationaliser un dénominateur -------------------------
# Forme exigée : un quotient de dénominateur ENTIER (`u/v:integer`), donc sans racine en bas
# (3/√2 → bad_form). 3/2 × √2 (rationnel fois racine) n'a pas de racine en bas non plus, mais
# n'est pas la forme a√b/b : perfectible (`acceptable`, ½ point). Un motif ne peut pas porter
# deux formes justes : à trancher par David s'il veut 3/2 × √2 juste. Variation 3 (réponse
# √b ± a, sans fraction) : mode exact par défaut, qui refuse 1/(√b − a) recopié (bad_form).
SANS_RACINE_EN_BAS = {'pattern': 'u/v:integer', 'acceptable': 'u:rationalType*sqrt(w)'}

M7_V0 = variation(
    'Écris ce nombre sans racine carrée au dénominateur.\n\n$$\\dfrac{ {{a}} }{' + rac('b')
    + '}=?$$',
    [var('a', '1..9'), var('b', NON_CARRES)],
    [blank('\\frac{' + co('a') + rac('b') + '}{ {{b}} }', requiredForm=SANS_RACINE_EN_BAS)],
    ['On multiplie le numérateur et le dénominateur par $' + rac('b') + '$, car $' + rac('b')
     + '\\times' + rac('b') + '={{b}}$.',
     '$\\dfrac{ {{a}} }{' + rac('b') + '}=\\dfrac{ {{a}}\\times' + rac('b') + '}{' + rac('b')
     + '\\times' + rac('b') + '}=' + coul('\\dfrac{' + co('a') + rac('b') + '}{ {{b}} }')
     + '$.'],
    conditions=['gcd(a,b) == 1'],
)

M7_V1 = variation(
    'Écris ce nombre sans racine carrée au dénominateur.\n\n$$\\dfrac{ {{a}} }{ {{c}}'
    + rac('b') + '}=?$$',
    [var('a', '1..9'), var('c', '2..5'), var('b', NON_CARRES)],
    [blank('\\frac{' + co('a') + rac('b') + '}{ {{eval:c*b}} }',
           requiredForm=SANS_RACINE_EN_BAS)],
    ['On multiplie le numérateur et le dénominateur par $' + rac('b') + '$, car $' + rac('b')
     + '\\times' + rac('b') + '={{b}}$.',
     '$\\dfrac{ {{a}} }{ {{c}}' + rac('b') + '}=\\dfrac{ {{a}}\\times' + rac('b')
     + '}{ {{c}}\\times' + rac('b') + '\\times' + rac('b') + '}=\\dfrac{' + co('a') + rac('b')
     + '}{ {{c}}\\times{{b}} }=' + coul('\\dfrac{' + co('a') + rac('b') + '}{ {{eval:c*b}} }')
     + '$.'],
    conditions=['gcd(a,c*b) == 1'],
)

# 1/(√b − a) ou 1/(√b + a) avec b = a² + 1 : la quantité conjuguée donne un dénominateur 1.
M7_V2 = variation(
    'Écris ce nombre sans racine carrée au dénominateur.\n\n$$\\dfrac{1}{' + rac('b')
    + '{{if:s==0|-|+}}{{a}}}=?$$',
    [var('a', '1..4'), var('s', '0|1'), var('b', 'eval:a^2+1')],
    [blank(rac('b') + '{{if:s==0|+|-}}{{a}}')],
    ['On multiplie le numérateur et le dénominateur par la **quantité conjuguée** $' + rac('b')
     + '{{if:s==0|+|-}}{{a}}$, pour utiliser $(u-v)(u+v)=u^2-v^2$.',
     'Dénominateur : $(' + rac('b') + '-{{a}})(' + rac('b') + '+{{a}})=(' + rac('b') + ')^2-'
     '{{a}}^2={{b}}-{{eval:a^2}}=1$.',
     '$\\dfrac{1}{' + rac('b') + '{{if:s==0|-|+}}{{a}}}=\\dfrac{' + rac('b')
     + '{{if:s==0|+|-}}{{a}}}{1}=' + coul(rac('b') + '{{if:s==0|+|-}}{{a}}') + '$.'],
)

M7_SPECS = [
    spec('3/√2 = 3√2/2', 0, {'a': '3', 'b': '2'}, 'correct', ['\\frac{3\\sqrt{2}}{2}']),
    spec('Erreur : 3/√2 recopié (racine au dénominateur)', 0, {'a': '3', 'b': '2'}, 'bad_form',
         ['\\frac{3}{\\sqrt{2}}'], ['form']),
    spec('Perfectible : 3/2 × √2 (forme admise, pas celle demandée)', 0, {'a': '3', 'b': '2'},
         'unoptimal_form', ['\\frac{3}{2}\\sqrt{2}'], ['form']),
    spec('Erreur : 6/(2√2) (racine au dénominateur)', 0, {'a': '3', 'b': '2'}, 'bad_form',
         ['\\frac{6}{2\\sqrt{2}}'], ['form']),
    spec('Erreur : 3/√2 = 3√2 (dénominateur oublié)', 0, {'a': '3', 'b': '2'}, 'incorrect',
         ['3\\sqrt{2}']),
    spec('Erreur : 3/√2 = 3√2/4', 0, {'a': '3', 'b': '2'}, 'incorrect',
         ['\\frac{3\\sqrt{2}}{4}']),
    spec('1/√5 = √5/5', 0, {'a': '1', 'b': '5'}, 'correct', ['\\frac{\\sqrt{5}}{5}']),
    spec('5/(2√3) = 5√3/6', 1, {'a': '5', 'c': '2', 'b': '3'}, 'correct',
         ['\\frac{5\\sqrt{3}}{6}']),
    spec('Erreur : 5/(2√3) recopié', 1, {'a': '5', 'c': '2', 'b': '3'}, 'bad_form',
         ['\\frac{5}{2\\sqrt{3}}'], ['form']),
    spec('Erreur : 5/(2√3) = 5√3/3', 1, {'a': '5', 'c': '2', 'b': '3'}, 'incorrect',
         ['\\frac{5\\sqrt{3}}{3}']),
    spec('1/(√2 − 1) = √2 + 1', 2, {'a': '1', 's': '0'}, 'correct', ['\\sqrt{2}+1']),
    spec('1/(√5 + 2) = √5 − 2', 2, {'a': '2', 's': '1'}, 'correct', ['\\sqrt{5}-2']),
    spec('Erreur : 1/(√2 − 1) recopié', 2, {'a': '1', 's': '0'}, 'bad_form',
         ['\\frac{1}{\\sqrt{2}-1}'], ['form']),
    spec('Erreur : 1/(√5 + 2) = √5 + 2', 2, {'a': '2', 's': '1'}, 'incorrect',
         ['\\sqrt{5}+2']),
]

M7 = modele(
    'Rationaliser un dénominateur',
    'Écrire 3/√2, 5/(2√3) ou 1/(√5 − 2) sans racine au dénominateur '
    '(pièges : dénominateur oublié, racine laissée au dénominateur, conjuguée de mauvais signe)',
    3, 60, [M7_V0, M7_V1, M7_V2], M7_SPECS)

FICHIERS = [
    ('01-racine-carree-existe.json', M1),
    ('02-racine-carre-parfait.json', M2),
    ('03-calculs-directs-racines.json', M3),
    ('04-developper-avec-racines.json', M4),
    ('05-encadrer-puissances-de-10.json', M5),
    ('06-ranger-carres-cubes.json', M6),
    ('07-rationaliser-denominateur.json', M7),
]

os.makedirs(DOSSIER, exist_ok=True)
for nom, m in FICHIERS:
    with open(os.path.join(DOSSIER, nom), 'w', encoding='utf-8') as f:
        json.dump(m, f, ensure_ascii=False, indent='\t')
        f.write('\n')
print(len(FICHIERS), 'modèles écrits dans', DOSSIER)
