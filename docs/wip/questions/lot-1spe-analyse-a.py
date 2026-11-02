"""Écrit les 5 modèles du lot A « second degré, exponentielle » de la 1re spé dans
scripts/questions/1spe-analyse-a/.

Phase 0 validée par David le 2026-11-02 (« je valide » sur les recos, journal
« docs/wip/questions-1spe-analyse-progress.md », § Phase 0), un point par modèle :

| #  | Point    | Titre                                      | Catégorie, niveau                                    |
| A1 | 1SPE-385 | Factoriser un trinôme quand c'est possible | Polynôme du second degré › Formes, 4                 |
| A2 | 1SPE-252 | Polynôme s'annulant en deux réels donnés   | Polynôme du second degré › Racines, 8                |
| A3 | 1SPE-251 | Signe d'un trinôme sous forme factorisée   | Polynôme du second degré › Signe et inéquations, 4   |
| A4 | 1SPE-296 | Courbe de t ↦ e^(−kt)                      | Fonction exponentielle › Représentation graphique, 4 |
| A5 | 1SPE-407 | Courbe de t ↦ e^(kt)                       | Fonction exponentielle › Représentation graphique, 5 |

Niveaux relevés en prod le 2026-11-02 (Formes 1-3, Racines 1-7, Signe et inéquations 1-3,
Représentation graphique 1-3). 382 est « couvert par 251 » (Q2).

Voisins à ne pas répéter : 604f83b7 (factoriser à racines données), a0089728 / 2dd2b712 (racines),
568c7bee (signe d'un trinôme développé sur un intervalle), 9e1d084e (inéquation développée),
f40e8a4a (reconnaître la courbe de exp).

Bornes : « lycee/1spe.json » (385 : a(x − x₁)(x − x₂) si Δ ⩾ 0, rien si Δ < 0 ; 252 :
a(x − x₁)(x − x₂), a ≠ 0 quelconque ; 251 : forme factorisée seulement, tableau de signes ;
296 / 407 : t ↦ e^(∓kt) pour une valeur numérique k > 0).

Pièges :
- case choix : sans « melanger: non », la bonne réponse est écrite en premier (indice 0) ;
- choix dans des dessins : fence « ```` » autour du choix, blocs indentés (gabarit lot-1spe-variations) ;
- coefficient affiché « −x », « x », « 2x » : « {{if:a==-1|-|}}{{if:a*a>1|{{a}}|}} » (ifs non imbriqués) ;
- intervalle en réponse : « answerKind: intervalles » sur la case ;
- jamais de variable « e ».

    python3 docs/wip/questions/lot-1spe-analyse-a.py scripts/questions/1spe-analyse-a
"""
import json
import os
import subprocess
import sys

DOSSIER = sys.argv[1]


def spec(desc, vi, variables, answers, status, violations=None):
    attendu = {'status': status}
    if violations:
        attendu['constraintViolations'] = violations
    return {'description': desc, 'variationIndex': vi,
            'variables': {k: str(v) for k, v in variables.items()},
            'answers': answers if isinstance(answers, list) else [answers],
            'expected': attendu}


def modele(nom, title, description, domain, subdomain, level, variations, specs, delay=60):
    return nom, {'title': title, 'description': description, 'grades': ['1_SPE'],
                 'theme': 'Fonctions', 'domain': domain, 'subdomain': subdomain,
                 'level': level, 'delay': delay, 'status': 'draft',
                 'shared': {'cleanCoefficients': True, 'blankDefaults': {'acceptDecimal': True}},
                 'variations': variations, 'testSpecs': specs}


def var(nom, expression):
    return {'name': nom, 'expression': expression}


def variation(statement, variables, blanks, steps, conditions=None):
    v = {'statement': statement, 'variables': variables}
    if conditions:
        v['conditions'] = conditions
    v['blanks'] = [b if isinstance(b, dict) else {'expectedAnswer': b} for b in blanks]
    v['correction'] = {'steps': steps}
    return v


def col(x, k=0):
    return '\\textcolor{{{color:primary.' + str(k) + '}}}{' + x + '}'


def colt(x, k=0):
    return '$' + col('\\text{' + x + '}', k) + '$'


def ev(x):
    return '{{eval:' + x + '}}'


def evp(x):
    """Valeur signée, pour l'écrire après un terme : « + 3 », « − 3 »."""
    return '{{eval:' + x + ';+}}'


def coef(a):
    """Coefficient devant une parenthèse ou une lettre : rien pour 1, « − » pour −1."""
    return '{{if:' + a + '==-1|-|}}{{if:' + a + '*' + a + '>1|{{' + a + '}}|}}'


def choix(lignes, melanger=True, fence='```'):
    tete = '' if melanger else 'melanger: non\n'
    return '\n\n' + fence + 'choix\n' + tete + ''.join('- ' + l + '\n' for l in lignes) + fence


def facteur(r):
    """(x − r), r écrit par une expression de variables."""
    return '(x' + evp('-(' + r + ')') + ')'


X = var('x', 'x|x')
MODELES = []

# --- A1. 1SPE-385 : factoriser, si c'est possible -------------------------------------------

NE_SE_FACTORISE_PAS = '$P(x)$ ne se factorise pas dans $\\mathbb{R}$'
QUESTION385 = ('Soit $P(x)=' + ev('a*x^2+b*x+c') + '$.\n\nQuelle est la forme factorisée de'
               ' $P(x)$ dans $\\mathbb{R}$ ?')
DELTA = ('On calcule le discriminant : $$\\Delta=b^2-4ac=' + ev('b;()') + '^2-4\\times'
         + ev('a;()') + '\\times' + ev('c;()') + '=' + ev('b^2-4*a*c') + '$$')
REGLE = ('Si $\\Delta>0$, $P(x)=a(x-x_1)(x-x_2)$ ; si $\\Delta=0$, $P(x)=a(x-x_0)^2$ ; si'
         ' $\\Delta<0$, $P$ n\'a pas de racine et **ne se factorise pas**.')
BS_RS = [var('b', 'eval:-a*(r+s)'), var('c', 'eval:a*r*s')]

V385_UN = variation(
    QUESTION385 + choix(['$P(x)=' + facteur('r') + facteur('s') + '$',
                         '$P(x)=' + facteur('-r') + facteur('-s') + '$',
                         '$P(x)=x' + facteur('r+s') + evp('r*s') + '$',
                         NE_SE_FACTORISE_PAS]),
    [X, var('a', '1'), var('r', '-6..5'), var('s', '-5..6')] + BS_RS, ['0'],
    [DELTA,
     '$\\Delta>0$ : $P$ a deux racines, $x_{1,2}=\\dfrac{-b\\pm\\sqrt{\\Delta}}{2a}$, soit'
     ' $x_1={{r}}$ et $x_2={{s}}$.',
     REGLE + ' Ici $a=1$ :',
     '$$P(x)=' + col(facteur('r') + facteur('s')) + '$$',
     'Attention : $x' + facteur('r+s') + evp('r*s') + '$ n\'est pas une forme factorisée,'
     ' c\'est une somme.'],
    ['r < s', 'r != 0', 's != 0', 'r + s != 0'])
V385_A = variation(
    QUESTION385 + choix(['$P(x)={{a}}' + facteur('r') + facteur('s') + '$',
                         '$P(x)=' + facteur('r') + facteur('s') + '$',
                         '$P(x)={{a}}' + facteur('-r') + facteur('-s') + '$',
                         NE_SE_FACTORISE_PAS]),
    [X, var('a', '2..3;±'), var('r', '-5..4'), var('s', '-4..5')] + BS_RS, ['0'],
    [DELTA,
     '$\\Delta>0$ : $P$ a deux racines, $x_{1,2}=\\dfrac{-b\\pm\\sqrt{\\Delta}}{2a}$, soit'
     ' $x_1={{r}}$ et $x_2={{s}}$.',
     REGLE + ' Ici $a={{a}}$ : sans lui, on n\'écrit pas $P(x)$ mais $\\dfrac{P(x)}{ {{a}} }$.',
     '$$P(x)=' + col('{{a}}' + facteur('r') + facteur('s')) + '$$'],
    ['r < s', 'r != 0', 's != 0', 'r + s != 0'])
V385_ZERO = variation(
    QUESTION385 + choix(['$P(x)=' + facteur('r') + '^2$',
                         '$P(x)=' + facteur('-r') + '^2$',
                         '$P(x)=' + facteur('r') + facteur('-r') + '$',
                         NE_SE_FACTORISE_PAS]),
    [X, var('a', '1'), var('r', '1..6;±'), var('s', 'eval:r')] + BS_RS, ['0'],
    [DELTA,
     '$\\Delta=0$ : $P$ a une seule racine, $x_0=-\\dfrac{b}{2a}={{r}}$.',
     REGLE + ' Ici $a=1$ :', '$$P(x)=' + col(facteur('r') + '^2') + '$$'])
V385_NEGATIF = variation(
    QUESTION385 + choix([NE_SE_FACTORISE_PAS,
                         '$P(x)=' + facteur('h+m') + facteur('h-m') + '$',
                         '$P(x)=' + facteur('h') + '^2$',
                         '$P(x)=' + facteur('h') + facteur('-h') + '$']),
    [X, var('a', '1'), var('h', '1..4;±'), var('m', '1..3'), var('b', 'eval:-2*h'),
     var('c', 'eval:h^2+m^2')], ['0'],
    [DELTA,
     '$\\Delta<0$ : $P$ n\'a **aucune racine** réelle.',
     REGLE,
     '$P(x)$ ' + colt('ne se factorise pas') + ' dans $\\mathbb{R}$ : sa forme canonique est $P(x)=' + facteur('h')
     + '^2+' + ev('m^2') + '$, toujours strictement positive. Écrire $' + facteur('h+m')
     + facteur('h-m') + '$, c\'est factoriser $' + facteur('h') + '^2-' + ev('m^2')
     + '$ : erreur de signe.'],
    ['h != m', 'h != -m'])

MODELES.append(modele(
    '01-factoriser-un-trinome-si-possible', 'Factoriser un trinôme quand c\'est possible',
    'Discriminant puis forme factorisée (case choix) : Δ > 0 avec a = 1 ou a ≠ 1, Δ = 0, Δ < 0'
    ' (ne se factorise pas) ; pièges : signes des racines, a oublié, somme prise pour un produit',
    'Polynôme du second degré', 'Formes', 4,
    [V385_UN, V385_A, V385_ZERO, V385_NEGATIF],
    [spec('x² − x − 6 = (x + 2)(x − 3)', 0, {'a': 1, 'r': -2, 's': 3, 'b': 1 * -1, 'c': -6}, '0',
          'correct'),
     spec('Erreur : signes des racines', 0, {'a': 1, 'r': -2, 's': 3, 'b': -1, 'c': -6}, '1',
          'incorrect'),
     spec('Erreur : somme', 0, {'a': 1, 'r': -2, 's': 3, 'b': -1, 'c': -6}, '2', 'incorrect'),
     spec('2(x − 1)(x − 3)', 1, {'a': 2, 'r': 1, 's': 3, 'b': -8, 'c': 6}, '0', 'correct'),
     spec('Erreur : a oublié', 1, {'a': 2, 'r': 1, 's': 3, 'b': -8, 'c': 6}, '1', 'incorrect'),
     spec('(x − 3)²', 2, {'a': 1, 'r': 3, 's': 3, 'b': -6, 'c': 9}, '0', 'correct'),
     spec('Erreur : « ne se factorise pas »', 2, {'a': 1, 'r': 3, 's': 3, 'b': -6, 'c': 9}, '3',
          'incorrect'),
     spec('Δ < 0 : ne se factorise pas', 3, {'a': 1, 'h': 2, 'm': 1, 'b': -4, 'c': 5}, '0',
          'correct'),
     spec('Erreur : (x − 3)(x − 1)', 3, {'a': 1, 'h': 2, 'm': 1, 'b': -4, 'c': 5}, '1',
          'incorrect')],
    delay=60))

# --- A2. 1SPE-252 : les polynômes qui s'annulent en deux réels donnés ------------------------

RACINES = ('Un polynôme du second degré qui s\'annule en $x_1$ et $x_2$ (distincts) s\'écrit'
           ' $a(x-x_1)(x-x_2)$, avec $a\\neq0$.')
V252_A = variation(
    'Donne le polynôme du second degré $P$, de coefficient de $x^2$ égal à ${{a}}$, qui'
    ' s\'annule en ${{r}}$ et en ${{s}}$. Donne-le sous forme factorisée.\n\n$P(x)=?$',
    [X, var('a', '1..3;±'), var('r', '-6..5'), var('s', '-5..6')], [ev('a*(x-r)*(x-s)')],
    [RACINES, 'Ici $a={{a}}$, $x_1={{r}}$ et $x_2={{s}}$ :',
     '$$P(x)=' + col(coef('a') + facteur('r') + facteur('s')) + '$$',
     'Développé, c\'est $P(x)=' + ev('a*x^2-a*(r+s)*x+a*r*s') + '$ : on vérifie qu\'il'
     ' s\'annule en ${{r}}$ et en ${{s}}$.'],
    ['r < s', 'r != 0', 's != 0', 'r + s != 0'])
V252_POINT = variation(
    'Le polynôme du second degré $P(x)=a' + facteur('r') + facteur('s') + '$ vérifie'
    ' $P(0)=' + ev('a*r*s') + '$.\n\nQue vaut $a$ ?\n\n$a=?$',
    [var('a', '1..3;±'), var('r', '1..5;±'), var('s', '1..5;±')], ['{{a}}'],
    ['On remplace $x$ par $0$ : $P(0)=a\\times' + ev('-r;()') + '\\times' + ev('-s;()') + '='
     + ev('r*s') + 'a$.',
     '$' + ev('r*s') + 'a=' + ev('a*r*s') + '$ donne $a=' + col('{{a}}') + '$.'],
    ['r < s', 'r != 0', 's != 0'])
V252_TOUS = variation(
    'Quels sont **tous** les polynômes du second degré qui s\'annulent en ${{r}}$ et en ${{s}}$ ?'
    + choix(['les polynômes $a' + facteur('r') + facteur('s') + '$, pour tout réel $a\\neq0$',
             'le seul polynôme $' + facteur('r') + facteur('s') + '$',
             'les polynômes $a' + facteur('-r') + facteur('-s') + '$, pour tout réel $a\\neq0$',
             'les polynômes $' + facteur('r') + facteur('s') + '+a$, pour tout réel $a$']),
    [var('r', '-6..5'), var('s', '-5..6')], ['0'],
    [RACINES, 'Le coefficient $a$ est **quelconque** (non nul) : il y a une infinité de tels'
     ' polynômes, tous de la forme $' + col('a' + facteur('r') + facteur('s')) + '$.',
     'Ajouter une constante $a$ change les racines : $' + facteur('r') + facteur('s')
     + '+a$ ne s\'annule plus en ${{r}}$ dès que $a\\neq0$.'],
    ['r < s', 'r != 0', 's != 0', 'r + s != 0'])

MODELES.append(modele(
    '02-polynome-s-annulant-en-deux-reels', 'Polynôme s\'annulant en deux réels donnés',
    'Polynômes a(x − x₁)(x − x₂) : écrire celui de coefficient a donné (forme factorisée), retrouver a par P(0),'
    ' reconnaître la famille (a ≠ 0 quelconque) ; pièges : signes, constante ajoutée',
    'Polynôme du second degré', 'Racines', 8, [V252_A, V252_POINT, V252_TOUS],
    [spec('2(x + 1)(x − 3), factorisé', 0, {'a': 2, 'r': -1, 's': 3}, '2(x+1)(x-3)', 'correct'),
     spec('Développé : forme non demandée', 0, {'a': 2, 'r': -1, 's': 3}, '2x^2-4x-6', 'bad_form',
          ['form']),
     spec('Erreur : signes des racines', 0, {'a': 2, 'r': -1, 's': 3}, '2(x-1)(x+3)',
          'incorrect'),
     spec('Erreur : a oublié', 0, {'a': 2, 'r': -1, 's': 3}, '(x+1)(x-3)', 'incorrect'),
     spec('P(0) = −12, racines −2 et 3 : a = 2', 1, {'a': 2, 'r': -2, 's': 3}, '2', 'correct'),
     spec('Erreur : a = P(0)', 1, {'a': 2, 'r': -2, 's': 3}, '-12', 'incorrect'),
     spec('Erreur : signe, a = −2', 1, {'a': 2, 'r': -2, 's': 3}, '-2', 'incorrect'),
     spec('Famille a(x − r)(x − s)', 2, {'r': -2, 's': 3}, '0', 'correct'),
     spec('Erreur : un seul polynôme', 2, {'r': -2, 's': 3}, '1', 'incorrect')],
    delay=60))

# --- A3. 1SPE-251 : signe d'un trinôme sous forme factorisée --------------------------------


def tableau(lignes):
    """Tableau de signes sur −∞, r, s, +∞ ; lignes = [(nom, [s1, en r, s2, en s, s3])]."""
    corps = ['```variation', 'variable: x', 'domain: -inf, {{r}}, {{s}}, +inf']
    for nom, (s1, zr, s2, zs, s3) in lignes:
        corps += ['', 'sign: ' + nom, '  -inf,{{r}}: ' + s1]
        if zr:
            corps.append('  {{r}}: z')
        corps.append('  {{r}},{{s}}: ' + s2)
        if zs:
            corps.append('  {{s}}: z')
        corps.append('  {{s}},+inf: ' + s3)
    return '\n'.join(corps + ['```'])


PLUS = '{{if:a>0|+|-}}'
MOINS = '{{if:a>0|-|+}}'
TABLEAU_A = tableau([('{{a}}', [PLUS, False, PLUS, False, PLUS]),
                     ('x' + evp('-r'), ['-', True, '+', False, '+']),
                     ('x' + evp('-s'), ['-', False, '-', True, '+']),
                     ('P(x)', [PLUS, True, MOINS, True, PLUS])])
P_FACTORISE = '$P(x)=' + coef('a') + facteur('r') + facteur('s') + '$'
SIGNE = choix(['strictement positif', 'strictement négatif', 'il change de signe'],
              melanger=False)
REGLE_SIGNE = ('Un trinôme $a(x-x_1)(x-x_2)$ est **du signe de $a$ à l\'extérieur des racines**,'
               ' et du signe contraire entre elles. On le lit dans le tableau de signes :')
VARS_A3 = [var('a', '1..3;±'), var('r', '-6..5'), var('s', '-5..6')]

V251_ENTRE = variation(
    'Soit ' + P_FACTORISE + '.\n\nQuel est le signe de $P(x)$ pour'
    ' $x\\in\\left]{{r}}\\,;{{s}}\\right[$ ?' + SIGNE,
    VARS_A3, ['{{if:a>0|1|0}}'],
    [REGLE_SIGNE, TABLEAU_A,
     'Entre les racines ${{r}}$ et ${{s}}$, $P(x)$ est du signe contraire de $a={{a}}$ :'
     ' ' + colt('{{if:a>0|strictement négatif|strictement positif}}') + '.'],
    ['r < s', 'r != 0', 's != 0'])
V251_DEHORS = variation(
    'Soit ' + P_FACTORISE + '.\n\nQuel est le signe de $P(x)$ pour'
    ' $x\\in{{if:z==0|\\left]-\\infty\\,;{{r}}\\right[|\\left]{{s}}\\,;+\\infty\\right[}}$ ?'
    + SIGNE,
    [var('z', '0|1')] + VARS_A3, ['{{if:a>0|0|1}}'],
    [REGLE_SIGNE, TABLEAU_A,
     'À l\'extérieur des racines, $P(x)$ est du signe de $a={{a}}$ :'
     ' ' + colt('{{if:a>0|strictement positif|strictement négatif}}') + '.'],
    ['r < s', 'r != 0', 's != 0'])
V251_INEQUATION = variation(
    'Soit ' + P_FACTORISE + '.\n\nRésous l\'inéquation $P(x)\\leqslant0$.\n\n$S=?$',
    VARS_A3,
    [{'expectedAnswer': '{{if:a>0|[{{r}};{{s}}]|]-\\infty;{{r}}]\\cup[{{s}};+\\infty[}}',
      'answerKind': 'intervalles'}],
    [REGLE_SIGNE, TABLEAU_A,
     'On garde les intervalles où la ligne de $P(x)$ porte $-$, **et** les racines, où elle'
     ' porte $0$ (l\'inégalité est large).',
     '$S=' + col('{{if:a>0|\\left[{{r}}\\,;{{s}}\\right]|\\left]-\\infty\\,;{{r}}\\right]\\cup'
                 '\\left[{{s}}\\,;+\\infty\\right[}}') + '$'],
    ['r < s', 'r != 0', 's != 0'])
V251_CACHE = variation(
    'Soit $P(x)=' + coef('k') + '({{u}}-x)(x' + evp('v') + ')$.\n\nQuel est le signe de $P(x)$'
    ' pour $x\\in\\left]' + ev('-v') + '\\,;{{u}}\\right[$ ?' + SIGNE,
    [var('k', '1..3'), var('u', '1..6'), var('v', '1..6;±'), var('r', 'eval:-v'),
     var('s', 'eval:u')], ['0'],
    ['Attention au facteur $({{u}}-x)$ : c\'est $-(x-{{u}})$. Développé, le terme en $x^2$ est $'
     + ev('-k') + 'x^2$ : $a=' + ev('-k') + '<0$.',
     tableau([('{{u}}-x', ['+', False, '+', True, '-']),
              ('x' + evp('v'), ['-', True, '+', False, '+']),
              ('P(x)', ['-', True, '+', True, '-'])]),
     'Entre les racines, $P(x)$ est du signe contraire de $a$ : ' + colt('strictement positif')
     + '.'],
    ['u + v > 0'])

MODELES.append(modele(
    '03-signe-d-un-trinome-factorise', 'Signe d\'un trinôme sous forme factorisée',
    'P(x) = a(x − x₁)(x − x₂) : signe entre et hors des racines, inéquation P(x) ≤ 0 (bornes'
    ' comprises), piège (u − x) qui cache a < 0 ; corrigé en tableau de signes',
    'Polynôme du second degré', 'Signe et inéquations', 4,
    [V251_ENTRE, V251_DEHORS, V251_INEQUATION, V251_CACHE],
    [spec('2(x + 1)(x − 3) entre : négatif', 0, {'a': 2, 'r': -1, 's': 3}, '1', 'correct'),
     spec('Erreur : signe de a', 0, {'a': 2, 'r': -1, 's': 3}, '0', 'incorrect'),
     spec('−(x + 1)(x − 3) entre : positif', 0, {'a': -1, 'r': -1, 's': 3}, '0', 'correct'),
     spec('2(x + 1)(x − 3) sur ]3 ; +∞[ : positif', 1, {'z': 1, 'a': 2, 'r': -1, 's': 3}, '0',
          'correct'),
     spec('−2(x + 1)(x − 3) sur ]−∞ ; −1[ : négatif', 1, {'z': 0, 'a': -2, 'r': -1, 's': 3},
          '1', 'correct'),
     spec('Erreur : « change de signe »', 1, {'z': 0, 'a': -2, 'r': -1, 's': 3}, '2',
          'incorrect'),
     spec('a > 0 : [−1 ; 3]', 2, {'a': 2, 'r': -1, 's': 3}, '[-1;3]', 'correct'),
     spec('Erreur : crochets ouverts', 2, {'a': 2, 'r': -1, 's': 3}, ']-1;3[', 'incorrect'),
     spec('a < 0 : ]−∞ ; −1] ∪ [3 ; +∞[', 2, {'a': -2, 'r': -1, 's': 3},
          ']-\\infty;-1]\\cup[3;+\\infty[', 'correct'),
     spec('a < 0, erreur : [−1 ; 3]', 2, {'a': -2, 'r': -1, 's': 3}, '[-1;3]', 'incorrect'),
     spec('2(4 − x)(x + 1) sur ]−1 ; 4[ : positif', 3, {'k': 2, 'u': 4, 'v': 1, 'r': -1, 's': 4},
          '0', 'correct'),
     spec('Erreur : a lu positif', 3, {'k': 2, 'u': 4, 'v': 1, 'r': -1, 's': 4}, '1',
          'incorrect')],
    delay=60))

# --- A4, A5. 1SPE-296, 1SPE-407 : courbes de t ↦ e^(∓kt) -------------------------------------


def courbe_choix(fonction, description):
    return ('```courbe\n  x: -3 ; 3\n  y: -3 ; 5\n  grille: 1 ; 1\n'
            '  f(x) = ' + fonction + '   bleu\n'
            '  taille: petite\n  description: ' + description + '\n  ```')


def exp_k(signe):
    """e^{−kt} ou e^{kt}, k écrit sans 1."""
    return '\\mathrm{e}^{' + signe + '{{if:k>1|{{k}}|}}t}'


def modeles_exp(signe, point, nom, level):
    autre = '' if signe == '-' else '-'
    f_tex = exp_k(signe)
    croit = signe == ''
    sens = 'croissante' if croit else 'décroissante'
    sens_contraire = 'décroissante' if croit else 'croissante'
    derivee = ('$f\'(t)=' + ('' if croit else '-') + '{{if:k>1|{{k}}|}}' + f_tex + '$, '
               + ('positive' if croit else 'négative') + ' car $\\mathrm{e}^{u}>0$ pour tout'
               ' réel $u$ : $f$ est strictement ' + sens + ' sur $\\mathbb{R}$.')
    f0 = '$f(0)=\\mathrm{e}^{0}=1$ : la courbe passe par le point $(0\\,;1)$.'
    limite = ('Quand $t$ ' + ('diminue' if croit else 'augmente') + ', $f(t)$ se rapproche de $0$'
              ' sans l\'atteindre : la courbe se rapproche de l\'axe des abscisses.')
    ks = signe + '{{k}}*x'
    v_courbes = variation(
        'Quelle courbe représente la fonction $f$ définie sur $\\mathbb{R}$ par $f(t)=' + f_tex
        + '$ ?' + choix([
            courbe_choix('exp(' + ks + ')', 'Courbe ' + sens + ', au-dessus de l\'axe des'
                         ' abscisses, passant par le point (0 ; 1).'),
            courbe_choix('exp(' + autre + '{{k}}*x)', 'Courbe ' + sens_contraire + ', au-dessus'
                         ' de l\'axe des abscisses, passant par le point (0 ; 1).'),
            courbe_choix('-exp(' + ks + ')', 'Courbe au-dessous de l\'axe des abscisses, passant'
                         ' par le point (0 ; −1).'),
            courbe_choix('exp(' + ks + ')+1', 'Courbe ' + sens + ', passant par le point'
                         ' (0 ; 2).')], fence='````'),
        [var('k', '1..3')], ['0'],
        [derivee, f0, limite, '```courbe\nx: -3 ; 3\ny: -3 ; 5\ngrille: 1 ; 1\nf(x) = exp('
         + ks + ')   bleu   nom=C_f\npoints: A(0 ; 1)\ntaille: moyenne\ndescription: Courbe de'
         ' la fonction f, ' + sens + ', passant par A(0 ; 1).\n```',
         'C\'est la courbe ' + colt(sens + ', passant par (0 ; 1), au-dessus de l\'axe') + '.'])
    # Deux courbes : k = 0,5 et k = 2 ; p = 1 échange les couleurs
    v_comparer = variation(
        'Dans le repère ci-dessous, les courbes $\\mathcal{C}_1$ (en bleu) et $\\mathcal{C}_2$'
        ' (en rouge) représentent les fonctions $t\\mapsto\\mathrm{e}^{' + signe + '0{,}5t}$ et'
        ' $t\\mapsto\\mathrm{e}^{' + signe + '2t}$, dans un ordre inconnu.\n\n```courbe\nx: -3 ; 3\n'
        'y: -1 ; 5\ngrille: 1 ; 1\nf(x) = exp(' + signe + '{{if:p==0|2|0.5}}*x)   bleu'
        '   nom=C_1\ng(x) = exp(' + signe + '{{if:p==0|0.5|2}}*x)   rouge   nom=C_2\n'
        'taille: moyenne\ndescription: Deux courbes ' + sens + 's passant par le point (0 ; 1),'
        ' l\'une plus pentue que l\'autre.\n```\n\nQuelle courbe représente $t\\mapsto\\mathrm{e}^{'
        + signe + '2t}$ ?' + choix(['$\\mathcal{C}_1$', '$\\mathcal{C}_2$'], melanger=False),
        [var('p', '0|1')], ['{{p}}'],
        ['Les deux courbes passent par $(0\\,;1)$, car $\\mathrm{e}^{0}=1$.',
         'Pour $t=' + ('1' if croit else '-1') + '$ : $\\mathrm{e}^{2}\\approx7{,}4$ et'
         ' $\\mathrm{e}^{0{,}5}\\approx1{,}6$. Plus $k$ est grand, plus la courbe de $t\\mapsto'
         '\\mathrm{e}^{' + signe + 'kt}$ ' + ('monte vite' if croit else 'descend vite') + ' pour'
         ' $t>0$' + ('' if croit else ' (et monte vite pour $t<0$)') + '.',
         'La courbe la plus pentue est $' + col('{{if:p==0|\\mathcal{C}_1|\\mathcal{C}_2}}')
         + '$ ({{if:p==0|en bleu|en rouge}}).'])
    v_proprietes = variation(
        'Soit $f$ la fonction définie sur $\\mathbb{R}$ par $f(t)=' + f_tex + '$. Quelle phrase'
        ' décrit sa courbe ?' + choix([
            'Elle est ' + sens + ', au-dessus de l\'axe des abscisses, et passe par $(0\\,;1)$.',
            'Elle est ' + sens_contraire + ', au-dessus de l\'axe des abscisses, et passe par'
            ' $(0\\,;1)$.',
            'Elle est ' + sens + ', au-dessus de l\'axe des abscisses, et passe par $(0\\,;0)$.',
            'Elle est ' + sens + ' et coupe l\'axe des abscisses en $t='
            + ('-' if croit else '') + '{{k}}$.']),
        [var('k', '1..3')], ['0'],
        [derivee, f0, '$\\mathrm{e}^{u}>0$ pour tout réel $u$ : la courbe est toujours au-dessus'
         ' de l\'axe des abscisses, elle ne le coupe jamais.',
         'Elle est ' + colt(sens + ', au-dessus de l\'axe, et passe par (0 ; 1)') + '.'])
    titre = 'Courbe de t ↦ e^(' + ('' if croit else '−') + 'kt)'
    return nom, {
        'titre': titre, 'point': point, 'level': level,
        'variations': [v_courbes, v_comparer, v_proprietes]}


for signe, point, nom, level in [('-', '296', '04-courbe-de-exp-moins-kt', 4),
                                 ('', '407', '05-courbe-de-exp-kt', 5)]:
    croit = signe == ''
    sens = 'croissante' if croit else 'décroissante'
    _, d = modeles_exp(signe, point, nom, level)
    MODELES.append(modele(
        nom, d['titre'],
        'Fonction t ↦ e^(' + ('' if croit else '−') + 'kt), k > 0 : courbe à choisir parmi 4'
        ' (sens contraire, opposée, décalée), k = 0,5 ou 2 selon la pente, description ('
        + sens + ', au-dessus de l\'axe, par (0 ; 1))',
        'Fonction exponentielle', 'Représentation graphique', level, d['variations'],
        [spec('k = 2 : bonne courbe', 0, {'k': 2}, '0', 'correct'),
         spec('Erreur : sens contraire', 0, {'k': 2}, '1', 'incorrect'),
         spec('Erreur : courbe décalée', 0, {'k': 2}, '3', 'incorrect'),
         spec('p = 0 : 𝒞₁', 1, {'p': 0}, '0', 'correct'),
         spec('p = 0, erreur : 𝒞₂', 1, {'p': 0}, '1', 'incorrect'),
         spec('p = 1 : 𝒞₂', 1, {'p': 1}, '1', 'correct'),
         spec('k = 3 : bonne description', 2, {'k': 3}, '0', 'correct'),
         spec('Erreur : passe par (0 ; 0)', 2, {'k': 3}, '2', 'incorrect')],
        delay=45))

os.makedirs(DOSSIER, exist_ok=True)
for nom, m in MODELES:
    with open(os.path.join(DOSSIER, nom + '.json'), 'w', encoding='utf-8') as f:
        json.dump(m, f, ensure_ascii=False, indent='\t')
        f.write('\n')
# Mis en forme comme le pre-commit, pour que le script redonne les fichiers commités
subprocess.run(['pnpm', 'exec', 'prettier', '--write', DOSSIER], check=True,
               stdout=subprocess.DEVNULL)
print(f'{len(MODELES)} modèles écrits dans {DOSSIER}')
