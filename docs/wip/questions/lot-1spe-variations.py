"""Écrit les 7 modèles du lot « variations et courbes » de la 1re spé dans scripts/questions/1spe-variations/.

Phase 0 validée par David le 2026-11-01 (D25, § 19 du journal « docs/wip/questions-1spe-progress.md »),
un point par modèle :

| # | Point    | Titre                                     | Catégorie (Fonctions › …), niveau        |
| 1 | 1SPE-399 | Lire la parité sur une courbe             | Généralités › Parité, 1                  |
| 2 | 1SPE-280 | Étudier la parité d'une fonction          | Généralités › Parité, 2                  |
| 3 | 1SPE-400 | Fonction de dérivée nulle                 | Dérivation › Variations, 6               |
| 4 | 1SPE-282 | Extrémum et tangente horizontale          | Dérivation › Variations, 7               |
| 5 | 1SPE-285 | Établir une inégalité par les variations  | Dérivation › Variations, 8               |
| 6 | 1SPE-286 | Position relative de deux courbes         | Dérivation › Position relative, 1        |
| 7 | 1SPE-403 | Allure de la parabole selon le signe de a | Polynôme du second degré › Variations, 2 |

Niveaux relevés en prod le 2026-11-01, tous niveaux scolaires confondus (Dérivation › Variations :
1 à 5 pris ; Polynôme du second degré › Variations : 1 pris ; Parité et Position relative : neuves).

Bornes : « lycee/1spe.json » (parité sur un domaine symétrique ; f′ = 0 ⟺ f constante sur un
intervalle ; extrémum intérieur ⟹ f′(a) = 0 ; inégalité et position relative par le signe d'une
différence ; allure de la parabole selon le signe de a). Fonctions : polynômes, 1/x, eˣ.

Décisions (David, 2026-11-01, « go » sur les recos) : Q1 deux sous-catégories neuves ; Q2 case
« f(−x) = » avant la case choix (modèle 2) ; Q3 variation du domaine non symétrique gardée.

Pièges :
- case choix : sans « melanger: non », la bonne réponse est écrite en premier (indice 0) ;
- choix fixe (paire / impaire / ni l'un ni l'autre ; Oui / Non) : indice calculé par « eval » ;
- jamais de variable « e » ni « i » ;
- tableau de variations à borne ouverte : « domain: ]0, [a, [+inf[ » (le parseur ne coupe qu'avant
  un crochet ; « ]0, a, +inf[ » donne un seul point) ;
- intervalle en réponse : « blankDefaults.answerKind = intervalles » (sinon « bad_form ») ;
- (−x)/(x² + k) au lieu de −x/(x² + k) : « unoptimal_form » (règle de superflu ordinaire).

    python3 docs/wip/questions/lot-1spe-variations.py scripts/questions/1spe-variations
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


def modele(nom, title, description, domain, subdomain, level, variations, specs, delay=60,
           shared=None):
    return nom, {'title': title, 'description': description, 'grades': ['1_SPE'],
                 'theme': 'Fonctions', 'domain': domain, 'subdomain': subdomain,
                 'level': level, 'delay': delay, 'status': 'draft',
                 'shared': {'cleanCoefficients': True, **(shared or {})},
                 'variations': variations, 'testSpecs': specs}


def var(nom, expression):
    return {'name': nom, 'expression': expression}


def variation(statement, variables, answers, steps, conditions=None):
    v = {'statement': statement, 'variables': variables}
    if conditions:
        v['conditions'] = conditions
    v['blanks'] = [{'expectedAnswer': a} for a in answers]
    v['correction'] = {'steps': steps}
    return v


def col(x, k=0):
    return '\\textcolor{{{color:primary.' + str(k) + '}}}{' + x + '}'


def ev(x):
    return '{{eval:' + x + '}}'


def evp(x):
    """Valeur signée, pour l'écrire après un terme : « + 3 », « − 3 »."""
    return '{{eval:' + x + ';+}}'


def choix(lignes, melanger=True, fence='```'):
    tete = '' if melanger else 'melanger: non\n'
    return '\n\n' + fence + 'choix\n' + tete + ''.join('- ' + l + '\n' for l in lignes) + fence


def courbe(fonction, description, x='-4 ; 4', y='-5 ; 5', autres=None):
    lignes = ['x: ' + x, 'y: ' + y, 'grille: 1 ; 1', fonction] + (autres or [])
    lignes += ['taille: moyenne', 'description: ' + description]
    return '\n\n```courbe\n' + '\n'.join(lignes) + '\n```'


X = var('x', 'x|x')
S = var('s', '1|-1')
MODELES = []

# --- 1. 1SPE-399 : la parité lue sur la courbe -------------------------------------------------

PARITE = choix(['paire', 'impaire', 'ni paire ni impaire'], melanger=False)
LIRE = ('La courbe $\\mathcal{C}_f$ ci-dessous représente une fonction $f$ définie sur'
        ' $[{{a0}}\\,;{{a1}}]$.')
QUESTION399 = '\n\nD\'après le graphique, la fonction $f$ semble :' + PARITE

V399_PAIRE = variation(
    LIRE.replace('{{a0}}', '-2{,}5').replace('{{a1}}', '2{,}5')
    + courbe('f(x) = {{s}}*(x^4-5*x^2)/4+({{c}}) sur [-2.5 ; 2.5]   bleu   nom=C_f',
             'Courbe d\'une fonction f tracée pour x de −2,5 à 2,5, symétrique par rapport à l\'axe'
             ' des ordonnées.')
    + QUESTION399,
    [S, var('c', '-1..1')], ['0'],
    ['La courbe est symétrique par rapport à l\'**axe des ordonnées** : les points d\'abscisses $x$'
     ' et $-x$ ont la même ordonnée, $f(-x)=f(x)$.',
     '$f$ semble $' + col('\\text{paire}') + '$.'])
V399_IMPAIRE = variation(
    LIRE.replace('{{a0}}', '-2{,}6').replace('{{a1}}', '2{,}6')
    + courbe('f(x) = {{s}}*(x^3-4*x)/2 sur [-2.6 ; 2.6]   bleu   nom=C_f',
             'Courbe d\'une fonction f tracée pour x de −2,6 à 2,6, symétrique par rapport à'
             ' l\'origine du repère.')
    + QUESTION399,
    [S], ['1'],
    ['La courbe est symétrique par rapport à l\'**origine** $O$ du repère : les points d\'abscisses'
     ' $x$ et $-x$ ont des ordonnées opposées, $f(-x)=-f(x)$.',
     '$f$ semble $' + col('\\text{impaire}') + '$.'])
V399_AXE = variation(
    LIRE.replace('[{{a0}}\\,;{{a1}}]', '{{if:h>0|[-1{,}5\\,;3{,}5]|[-3{,}5\\,;1{,}5]}}')
    + courbe('f(x) = {{s}}*((x-({{h}}))^4-5*(x-({{h}}))^2)/4 sur [{{h}}-2.5 ; {{h}}+2.5]'
             '   bleu   nom=C_f',
             'Courbe d\'une fonction f, symétrique par rapport à la droite verticale d\'équation'
             ' x = {{h}}, pas par rapport à l\'axe des ordonnées.')
    + QUESTION399,
    [S, var('h', '1|-1')], ['2'],
    ['La courbe est symétrique par rapport à la droite d\'équation $x={{h}}$, **pas** par rapport'
     ' à l\'axe des ordonnées, ni par rapport à l\'origine.',
     'D\'ailleurs, l\'ensemble de définition n\'est pas symétrique par rapport à $0$.',
     '$f$ semble $' + col('\\text{ni paire ni impaire}') + '$.'])
V399_CENTRE = variation(
    LIRE.replace('{{a0}}', '-2{,}6').replace('{{a1}}', '2{,}6')
    + courbe('f(x) = {{s}}*(x^3-4*x)/2+({{c}}) sur [-2.6 ; 2.6]   bleu   nom=C_f',
             'Courbe d\'une fonction f tracée pour x de −2,6 à 2,6, symétrique par rapport au point'
             ' de coordonnées (0 ; {{c}}), pas par rapport à l\'origine.', y='-6 ; 6')
    + QUESTION399,
    [S, var('c', '1..2;±')], ['2'],
    ['La courbe est symétrique par rapport au point $(0\\,;{{c}})$, **pas** par rapport à'
     ' l\'origine : $f(0)={{c}}\\neq0$, alors qu\'une fonction impaire définie en $0$ vérifie'
     ' $f(0)=0$.',
     'Elle n\'est pas non plus symétrique par rapport à l\'axe des ordonnées.',
     '$f$ semble $' + col('\\text{ni paire ni impaire}') + '$.'])
V399_POINT = variation(
    '$f$ est une fonction {{if:p==0|paire|impaire}} définie sur $\\mathbb{R}$, et le point'
    ' $A({{a}}\\,;{{b}})$ appartient à sa courbe $\\mathcal{C}_f$.\n\nQuelle est l\'ordonnée du'
    ' point de $\\mathcal{C}_f$ d\'abscisse $' + ev('-a') + '$ ?\n\n$f(' + ev('-a') + ')=?$',
    [var('p', '0|1'), var('a', '1..5'), var('b', '1..6;±')], [ev('b*(1-2*p)')],
    ['{{if:p==0|$f$ est paire : $f(-x)=f(x)$, sa courbe est symétrique par rapport à l\'axe des'
     ' ordonnées.|$f$ est impaire : $f(-x)=-f(x)$, sa courbe est symétrique par rapport à'
     ' l\'origine.}}',
     '$$f(' + ev('-a') + ')=' + col(ev('b*(1-2*p)')) + '$$'])

MODELES.append(modele(
    '01-lire-la-parite', 'Lire la parité sur une courbe',
    'Symétrie par rapport à l\'axe des ordonnées (paire) ou à l\'origine (impaire) lue sur la'
    ' courbe ; pièges : axe x = h, centre (0 ; c) ; puis f(−a) déduit de la parité',
    'Généralités', 'Parité', 1,
    [V399_PAIRE, V399_IMPAIRE, V399_AXE, V399_CENTRE, V399_POINT],
    [spec('Paire', 0, {'s': 1, 'c': 0}, '0', 'correct'),
     spec('Erreur : impaire', 0, {'s': 1, 'c': 0}, '1', 'incorrect'),
     spec('Impaire', 1, {'s': 1}, '1', 'correct'),
     spec('Erreur : paire', 1, {'s': 1}, '0', 'incorrect'),
     spec('Axe x = 1 : ni l\'une ni l\'autre', 2, {'s': 1, 'h': 1}, '2', 'correct'),
     spec('Erreur : paire', 2, {'s': 1, 'h': 1}, '0', 'incorrect'),
     spec('Centre (0 ; 2) : ni l\'une ni l\'autre', 3, {'s': 1, 'c': 2}, '2', 'correct'),
     spec('Erreur : impaire', 3, {'s': 1, 'c': 2}, '1', 'incorrect'),
     spec('Paire, A(3 ; −4) : −4', 4, {'p': 0, 'a': 3, 'b': -4}, '-4', 'correct'),
     spec('Paire, erreur : 4', 4, {'p': 0, 'a': 3, 'b': -4}, '4', 'incorrect'),
     spec('Impaire, A(3 ; −4) : 4', 4, {'p': 1, 'a': 3, 'b': -4}, '4', 'correct'),
     spec('Impaire, erreur : −4', 4, {'p': 1, 'a': 3, 'b': -4}, '-4', 'incorrect')],
    delay=45))

# --- 2. 1SPE-280 : la parité par le calcul ---------------------------------------------------

ETUDIER = ('Soit $f$ la fonction définie sur $\\mathbb{R}$ par $f(x)=FX$.\n\n'
           'Calcule $f(-x)$, sous forme réduite, puis conclus.\n\n$f(-x)=?$\n\n'
           'La fonction $f$ est :' + PARITE)


def v280(fx, fmx, calcul, conclusion, indice, variables, conditions=None):
    return variation(
        ETUDIER.replace('FX', fx), [X] + variables, [fmx, indice],
        ['$\\mathbb{R}$ est symétrique par rapport à $0$ : on peut comparer $f(-x)$ et $f(x)$.',
         '$f(-x)=' + calcul + '=' + fmx + '$.', conclusion], conditions)


V280_PAIRE = v280(
    ev('x^4-k*x^2+c'), ev('x^4-k*x^2+c'), '(-x)^4-{{k}}(-x)^2' + evp('c'),
    '$f(-x)=f(x)$ pour tout réel $x$ : $f$ est $' + col('\\text{paire}') + '$.', '0',
    [var('k', '1..5'), var('c', '1..5;±')])
V280_IMPAIRE = v280(
    ev('x^3+k*x'), ev('-x^3-k*x'), '(-x)^3' + evp('k') + '\\times(-x)',
    '$f(-x)=-(' + ev('x^3+k*x') + ')=-f(x)$ pour tout réel $x$ : $f$ est $'
    + col('\\text{impaire}') + '$.', '1',
    [var('k', '1..5;±')])
V280_NI = v280(
    ev('x^2+k*x'), ev('x^2-k*x'), '(-x)^2' + evp('k') + '\\times(-x)',
    'Pour $x=1$ : $f(-1)=' + ev('1-k') + '$ et $f(1)=' + ev('1+k') + '$. On n\'a ni $f(-1)=f(1)$,'
    ' ni $f(-1)=-f(1)$ : $f$ n\'est $' + col('\\text{ni paire ni impaire}') + '$.', '2',
    [var('k', '1..5;±')])
V280_QUOTIENT = v280(
    '\\dfrac{x}{x^2+{{k}}}', '-\\dfrac{x}{x^2+{{k}}}', '\\dfrac{-x}{(-x)^2+{{k}}}',
    '$f(-x)=-f(x)$ pour tout réel $x$ : $f$ est $' + col('\\text{impaire}') + '$.', '1',
    [var('k', '1..5')])
V280_DOMAINE = variation(
    'Soit $f$ la fonction définie sur $[' + ev('-a') + '\\,;{{b}}]$ par $f(x)=x^2' + evp('c')
    + '$.\n\nLa fonction $f$ est :' + PARITE,
    [var('a', '1..3'), var('b', '2..5'), var('c', '1..5;±')], ['2'],
    ['Pour qu\'une fonction soit paire ou impaire, son ensemble de définition doit être'
     ' symétrique par rapport à $0$ : si $x$ en fait partie, $-x$ aussi.',
     'Ici ${{b}}$ est dans $[' + ev('-a') + '\\,;{{b}}]$, mais pas $' + ev('-b')
     + '$ : $f(' + ev('-b') + ')$ n\'existe pas.',
     '$f$ n\'est $' + col('\\text{ni paire ni impaire}') + '$, même si $x^2' + evp('c')
     + '$ est une expression paire.'],
    ['b > a'])

MODELES.append(modele(
    '02-etudier-la-parite', 'Étudier la parité d\'une fonction',
    'Calcul de f(−x) puis parité (case choix) : polynôme pair, impair, ni l\'un ni l\'autre,'
    ' x/(x² + k) ; piège : domaine non symétrique',
    'Généralités', 'Parité', 2,
    [V280_PAIRE, V280_IMPAIRE, V280_NI, V280_QUOTIENT, V280_DOMAINE],
    [spec('x⁴ − 3x² + 2 : paire', 0, {'k': 3, 'c': 2}, ['x^4-3x^2+2', '0'], 'correct'),
     spec('Erreur : impaire', 0, {'k': 3, 'c': 2}, ['x^4-3x^2+2', '1'], 'incorrect'),
     spec('x³ − 2x : f(−x) = −x³ + 2x, impaire', 1, {'k': -2}, ['-x^3+2x', '1'], 'correct'),
     spec('Erreur : signe de x³ oublié, −x³ − 2x', 1, {'k': -2}, ['-x^3-2x', '1'], 'incorrect'),
     spec('x² + 3x : ni l\'une ni l\'autre', 2, {'k': 3}, ['x^2-3x', '2'], 'correct'),
     spec('Erreur : paire', 2, {'k': 3}, ['x^2-3x', '0'], 'incorrect'),
     spec('x/(x² + 2) : impaire', 3, {'k': 2}, ['-\\frac{x}{x^2+2}', '1'], 'correct'),
     spec('x/(x² + 2) : (−x)/(x² + 2), forme à améliorer', 3, {'k': 2},
          ['\\frac{-x}{x^2+2}', '1'], 'unoptimal_form', ['signs']),
     spec('Erreur : paire', 3, {'k': 2}, ['-\\frac{x}{x^2+2}', '0'], 'incorrect'),
     spec('x² + 1 sur [−2 ; 3] : ni l\'une ni l\'autre', 4, {'a': 2, 'b': 3, 'c': 1}, '2',
          'correct'),
     spec('Erreur : paire', 4, {'a': 2, 'b': 3, 'c': 1}, '0', 'incorrect')],
    delay=60))

# --- 3. 1SPE-400 : f′ = 0 ⟺ f constante -------------------------------------------------------

CONSTANTE = ('Une fonction dérivable sur un intervalle $I$ est **constante** sur $I$ si, et'
             ' seulement si, sa dérivée est nulle sur $I$.')
V400_VALEUR = variation(
    '$f$ est une fonction dérivable sur $\\mathbb{R}$ telle que $f\'(x)=0$ pour tout réel $x$,'
    ' et $f({{m}})={{n}}$.\n\nQue vaut $f({{p}})$ ?\n\n$f({{p}})=?$',
    [var('m', '-5..5'), var('p', '-9..9'), var('n', '1..20;±')], ['{{n}}'],
    [CONSTANTE, '$f\'$ est nulle sur $\\mathbb{R}$ : $f$ est constante, égale à'
     ' $f({{m}})={{n}}$.', '$$f({{p}})=' + col('{{n}}') + '$$'],
    ['m != p'])
V400_CACHEE = variation(
    'Soit $f$ la fonction définie sur $\\mathbb{R}$ par $f(x)=(x' + evp('a') + ')^2-x^2'
    + evp('-2*a') + 'x$.\n\nCalcule $f\'(x)$, puis donne $f(x)$ sous forme réduite.\n\n'
    '$f\'(x)=?$\n\n$f(x)=?$',
    [X, var('a', '1..6;±')], ['0', ev('a^2')],
    ['$f\'(x)=2(x' + evp('a') + ')-2x' + evp('-2*a') + '=' + col('0') + '$.',
     CONSTANTE + ' Ici $f$ est constante sur $\\mathbb{R}$, égale à $f(0)=' + ev('a^2') + '$ :',
     '$$f(x)=' + col(ev('a^2')) + '$$'])
V400_COURBE = variation(
    '$f$ est une fonction dérivable sur $\\mathbb{R}$ telle que $f\'(x)=0$ pour tout réel $x$.'
    ' Sa courbe $\\mathcal{C}_f$ passe par le point $A({{m}}\\,;{{n}})$.\n\nDonne une équation'
    ' de $\\mathcal{C}_f$.\n\n$y=?$',
    [var('m', '1..9;±'), var('n', '1..9;±')], ['{{n}}'],
    [CONSTANTE, '$f$ est constante, égale à $f({{m}})={{n}}$ : sa courbe est la droite'
     ' horizontale passant par $A$.', '$$y=' + col('{{n}}') + '$$'],
    ['m != n'])

MODELES.append(modele(
    '03-fonction-de-derivee-nulle', 'Fonction de dérivée nulle',
    'f′ nulle sur un intervalle ⟺ f constante : f(p) connaissant f(m), constante cachée'
    ' (x + a)² − x² − 2ax, équation de la courbe',
    'Dérivation', 'Variations', 6, [V400_VALEUR, V400_CACHEE, V400_COURBE],
    [spec('f(2) = 7 : f(−3) = 7', 0, {'m': 2, 'p': -3, 'n': 7}, '7', 'correct'),
     spec('Erreur : f(−3) = 0', 0, {'m': 2, 'p': -3, 'n': 7}, '0', 'incorrect'),
     spec('(x + 3)² − x² − 6x : 0 et 9', 1, {'a': 3}, ['0', '9'], 'correct'),
     spec('Erreur : f(x) = 0', 1, {'a': 3}, ['0', '0'], 'incorrect'),
     spec('A(2 ; −5) : y = −5', 2, {'m': 2, 'n': -5}, '-5', 'correct'),
     spec('Erreur : y = 2', 2, {'m': 2, 'n': -5}, '2', 'incorrect')],
    delay=45))

# --- 4. 1SPE-282 : extrémum ⟹ f′(a) = 0 ------------------------------------------------------

EXTREMUM = ('Si $f$, dérivable sur un intervalle ouvert, admet un extrémum en $a$, alors'
            ' $f\'(a)=0$ : la tangente en $a$ est **horizontale**.')
OUI_NON = choix(['Oui', 'Non'], melanger=False)  # « Non » = indice 1

V282_TANGENTE = variation(
    '$f$ est une fonction dérivable sur $\\mathbb{R}$ qui admet un'
    ' {{if:q==0|maximum|minimum}} en ${{a}}$, égal à ${{b}}$.\n\n'
    '$f\'({{a}})=?$\n\nÉquation de la tangente à $\\mathcal{C}_f$ au point d\'abscisse ${{a}}$ :'
    ' $y=?$',
    [var('q', '0|1'), var('a', '1..6;±'), var('b', '1..9;±')], ['0', '{{b}}'],
    [EXTREMUM, 'Ici $f\'({{a}})=' + col('0') + '$.',
     'La tangente $y=f\'({{a}})(x' + evp('-a') + ')+f({{a}})$ devient $y=' + col('{{b}}') + '$.'])
V282_PARAMETRE = variation(
    'Soit $k$ un réel et $f$ la fonction définie sur $\\mathbb{R}$ par $f(x)=x^3+kx$. On sait'
    ' que $f$ admet un extrémum en ${{m}}$.\n\nQue vaut $k$ ?\n\n$k=?$',
    [var('m', '1..4')], [ev('-3*m^2')],
    [EXTREMUM, '$f\'(x)=3x^2+k$, donc $f\'({{m}})=' + ev('3*m^2') + '+k$.',
     '$f\'({{m}})=0$ donne $$k=' + col(ev('-3*m^2')) + '$$'])
V282_ABSCISSES = variation(
    'Soit $f$ la fonction définie sur $\\mathbb{R}$ par $f(x)=' + ev('2*x^3-3*(r+t)*x^2+6*r*t*x')
    + '$.\n\nEn quels points la courbe $\\mathcal{C}_f$ a-t-elle une tangente horizontale ? Donne'
    ' leurs abscisses, de la plus petite à la plus grande.\n\n$x_1=?$\n\n$x_2=?$',
    [X, var('r', '-3..2'), var('d', '1..3'), var('t', 'eval:r+d')], ['{{r}}', '{{t}}'],
    ['La tangente au point d\'abscisse $a$ est horizontale quand $f\'(a)=0$.',
     '$f\'(x)=' + ev('6*x^2-6*(r+t)*x+6*r*t') + '=6(x' + evp('-r') + ')(x' + evp('-t') + ')$.',
     '$f\'(x)=0$ pour $x_1=' + col('{{r}}') + '$ et $x_2=' + col('{{t}}') + '$.'],
    ['r != 0', 't != 0', 'r + t != 0'])
V282_RECIPROQUE = variation(
    'Soit $f$ la fonction définie sur $\\mathbb{R}$ par $f(x)=(x' + evp('-a') + ')^3' + evp('c')
    + '$.\n\n$f\'({{a}})=?$\n\nLa fonction $f$ admet-elle un extrémum en ${{a}}$ ?' + OUI_NON,
    [var('a', '1..4;±'), var('c', '1..5;±')], ['0', '1'],
    ['$f\'(x)=3(x' + evp('-a') + ')^2$, donc $f\'({{a}})=' + col('0') + '$ : la tangente en ${{a}}$'
     ' est horizontale.',
     'Mais $f\'(x)=3(x' + evp('-a') + ')^2\\geqslant0$ : $f$ est croissante sur $\\mathbb{R}$.'
     ' Elle prend des valeurs plus petites que $f({{a}})$ avant ${{a}}$, et plus grandes après.',
     '$f$ $' + col('\\text{n\'admet pas d\'extrémum}') + '$ en ${{a}}$ : $f\'(a)=0$ ne suffit'
     ' pas, il faut que $f\'$ **change de signe** en $a$.'])

MODELES.append(modele(
    '04-extremum-et-tangente-horizontale', 'Extrémum et tangente horizontale',
    'En un extrémum, f′(a) = 0 et tangente horizontale : équation de la tangente, paramètre k,'
    ' abscisses des tangentes horizontales ; réciproque fausse ((x − a)³)',
    'Dérivation', 'Variations', 7,
    [V282_TANGENTE, V282_PARAMETRE, V282_ABSCISSES, V282_RECIPROQUE],
    [spec('Maximum en 2, égal à 5 : 0, y = 5', 0, {'q': 0, 'a': 2, 'b': 5}, ['0', '5'], 'correct'),
     spec('Erreur : y = 2', 0, {'q': 0, 'a': 2, 'b': 5}, ['0', '2'], 'incorrect'),
     spec('Extrémum en 2 : k = −12', 1, {'m': 2}, '-12', 'correct'),
     spec('Erreur : f(2) = 0, k = −4', 1, {'m': 2}, '-4', 'incorrect'),
     spec('Racines 1 et 3', 2, {'r': 1, 'd': 2, 't': 3}, ['1', '3'], 'correct'),
     spec('Erreur : racines de f, pas de f′', 2, {'r': 1, 'd': 2, 't': 3}, ['0', '3'],
          'incorrect'),
     spec('(x − 2)³ + 1 : 0, non', 3, {'a': 2, 'c': 1}, ['0', '1'], 'correct'),
     spec('Erreur : « oui »', 3, {'a': 2, 'c': 1}, ['0', '0'], 'incorrect')],
    delay=60))

# --- 5. 1SPE-285 : une inégalité par les variations ------------------------------------------

MINIMUM = ['$g(x)\\geqslant g(x_0)=0$ sur tout l\'intervalle : l\'inégalité est démontrée.']

V285_CUBE = variation(
    'On veut démontrer que, pour tout réel $x\\geqslant0$, $x^3+' + ev('2*a^3') + '\\geqslant '
    + ev('3*a^2*x') + '$. Pour cela, on étudie la fonction $g$ définie sur $[0\\,;+\\infty[$ par'
    ' $g(x)=' + ev('x^3-3*a^2*x+2*a^3') + '$.\n\nSur $[0\\,;+\\infty[$, $g$ atteint son minimum'
    ' en $x_0=?$\n\nCe minimum vaut $g(x_0)=?$',
    [X, var('a', '1..3')], ['{{a}}', '0'],
    ['$g\'(x)=' + ev('3*x^2-3*a^2') + '=3(x-{{a}})(x+{{a}})$ ; sur $[0\\,;+\\infty[$, $x+{{a}}>0$,'
     ' donc $g\'(x)$ a le signe de $x-{{a}}$.',
     '```variation\nvariable: x\ndomain: 0, {{a}}, +inf\n\nsign: g\'(x)\n  0,{{a}}: -\n'
     '  {{a}}: z\n  {{a}},+inf: +\n\nvariation: g(x)\n  0: ' + ev('2*a^3') + ', top\n'
     '  {{a}}: 0, bottom\n```',
     'Le minimum est atteint en $x_0=' + col('{{a}}') + '$ et vaut $g({{a}})=' + ev('a^3') + '-'
     + ev('3*a^3') + '+' + ev('2*a^3') + '=' + col('0') + '$.'] + MINIMUM)
V285_EXP = variation(
    'On veut démontrer que, pour tout réel $x$, $\\mathrm{e}^x\\geqslant 1+x$. Pour cela, on'
    ' étudie la fonction $g$ définie sur $\\mathbb{R}$ par $g(x)=\\mathrm{e}^x-x-1$.\n\n'
    '$g$ atteint son minimum en $x_0=?$\n\nCe minimum vaut $g(x_0)=?$',
    [], ['0', '0'],
    ['$g\'(x)=\\mathrm{e}^x-1$ : négatif pour $x<0$ (car $\\mathrm{e}^x<1$), positif pour $x>0$.',
     '```variation\nvariable: x\ndomain: -inf, 0, +inf\n\nsign: g\'(x)\n  -inf,0: -\n  0: z\n'
     '  0,+inf: +\n\nvariation: g(x)\n  0: 0, bottom\n```',
     'Le minimum est atteint en $x_0=' + col('0') + '$ et vaut $g(0)=\\mathrm{e}^0-0-1='
     + col('0') + '$.'] + MINIMUM)
V285_INVERSE = variation(
    'On veut démontrer que, pour tout réel $x>0$, $x+\\dfrac{' + ev('a^2') + '}{x}\\geqslant '
    + ev('2*a') + '$. Pour cela, on étudie la fonction $g$ définie sur $]0\\,;+\\infty[$ par'
    ' $g(x)=x+\\dfrac{' + ev('a^2') + '}{x}-' + ev('2*a') + '$.\n\n$g$ atteint son minimum en'
    ' $x_0=?$\n\nCe minimum vaut $g(x_0)=?$',
    [var('a', '1..4')], ['{{a}}', '0'],
    ['$g\'(x)=1-\\dfrac{' + ev('a^2') + '}{x^2}=\\dfrac{(x-{{a}})(x+{{a}})}{x^2}$ ; sur'
     ' $]0\\,;+\\infty[$, $g\'(x)$ a le signe de $x-{{a}}$.',
     '```variation\nvariable: x\ndomain: ]0, [{{a}}, [+inf[\n\nsign: g\'(x)\n  0,{{a}}: -\n'
     '  {{a}}: z\n  {{a}},+inf: +\n\nvariation: g(x)\n  {{a}}: 0, bottom\n```',
     'Le minimum est atteint en $x_0=' + col('{{a}}') + '$ et vaut $g({{a}})={{a}}+\\dfrac{'
     + ev('a^2') + '}{ {{a}} }-' + ev('2*a') + '=' + col('0') + '$.'] + MINIMUM)

MODELES.append(modele(
    '05-inegalite-par-les-variations', 'Établir une inégalité par les variations',
    'Inégalité démontrée par le minimum de g = différence des deux membres : x³ + 2a³ ≥ 3a²x sur'
    ' [0 ; +∞[, eˣ ≥ 1 + x, x + a²/x ≥ 2a sur ]0 ; +∞[',
    'Dérivation', 'Variations', 8, [V285_CUBE, V285_EXP, V285_INVERSE],
    [spec('a = 2 : minimum 0 en 2', 0, {'a': 2}, ['2', '0'], 'correct'),
     spec('Erreur : racine négative de g′, −2', 0, {'a': 2}, ['-2', '0'], 'incorrect'),
     spec('Erreur : minimum = g(0) = 16', 0, {'a': 2}, ['2', '16'], 'incorrect'),
     spec('eˣ : minimum 0 en 0', 1, {}, ['0', '0'], 'correct'),
     spec('Erreur : minimum 1', 1, {}, ['0', '1'], 'incorrect'),
     spec('a = 3 : minimum 0 en 3', 2, {'a': 3}, ['3', '0'], 'correct'),
     spec('Erreur : minimum en 9', 2, {'a': 3}, ['9', '0'], 'incorrect')],
    delay=90))

# --- 6. 1SPE-286 : position relative par le signe de f − g ------------------------------------

POSITION = ('$\\mathcal{C}_f$ est au-dessus de $\\mathcal{C}_g$ là où $f(x)-g(x)>0$, au-dessous là'
            ' où $f(x)-g(x)<0$.')

V286_DROITE = variation(
    'Soit $f(x)=x^2$ et $g(x)=' + ev('(r+t)*x-r*t') + '$, de courbes $\\mathcal{C}_f$ et'
    ' $\\mathcal{C}_g$.\n\nSur quel intervalle $\\mathcal{C}_f$ est-elle strictement au-dessous de'
    ' $\\mathcal{C}_g$ ?\n\n$x\\in ?$',
    [X, var('r', '-4..2'), var('d', '1..4'), var('t', 'eval:r+d')], [']{{r}};{{t}}['],
    [POSITION,
     '$f(x)-g(x)=' + ev('x^2-(r+t)*x+r*t') + '=(x' + evp('-r') + ')(x' + evp('-t') + ')$, de'
     ' racines ${{r}}$ et ${{t}}$.',
     'Ce trinôme est négatif entre ses racines : $\\mathcal{C}_f$ est au-dessous de'
     ' $\\mathcal{C}_g$ pour $x\\in' + col(']{{r}}\\,;{{t}}[') + '$.'],
    ['r != 0', 't != 0', 'r + t != 0'])
V286_PARABOLES = variation(
    'Soit $f(x)=' + ev('x^2+(b+k)*x+c-k*z') + '$ et $g(x)=' + ev('x^2+b*x+c') + '$, de courbes'
    ' $\\mathcal{C}_f$ et $\\mathcal{C}_g$.\n\nSur quel intervalle $\\mathcal{C}_f$ est-elle'
    ' strictement au-dessus de $\\mathcal{C}_g$ ?\n\n$x\\in ?$',
    [X, var('b', '1..5;±'), var('c', '1..6;±'), var('k', '1..3;±'), var('z', '1..4;±')],
    ['{{if:k>0|]{{z}};+\\infty[|]-\\infty;{{z}}[}}'],
    [POSITION,
     '$f(x)-g(x)=' + ev('k*x-k*z') + '$ : une fonction affine qui s\'annule en $x={{z}}$, de'
     ' coefficient directeur ${{k}}$ {{if:k>0|positif : elle est positive pour $x>{{z}}$|négatif :'
     ' elle est positive pour $x<{{z}}$}}.',
     '$\\mathcal{C}_f$ est au-dessus de $\\mathcal{C}_g$ pour $x\\in'
     + col('{{if:k>0|]{{z}}\\,;+\\infty[|]-\\infty\\,;{{z}}[}}') + '$.'],
    ['b + k != 0', 'c - k*z != 0'])
V286_CUBE = variation(
    'Soit $f(x)=x^3$ et $g(x)=' + ev('a^2*x') + '$, de courbes $\\mathcal{C}_f$ et'
    ' $\\mathcal{C}_g$.\n\nSur $[0\\,;+\\infty[$, sur quel intervalle $\\mathcal{C}_f$ est-elle'
    ' strictement au-dessus de $\\mathcal{C}_g$ ?\n\n$x\\in ?$',
    [X, var('a', '1..3')], [']{{a}};+\\infty['],
    [POSITION,
     '$f(x)-g(x)=x^3-' + ev('a^2*x') + '=x(x-{{a}})(x+{{a}})$. Sur $[0\\,;+\\infty[$, $x\\geqslant0$'
     ' et $x+{{a}}>0$ : le signe est celui de $x-{{a}}$.',
     '$\\mathcal{C}_f$ est au-dessus de $\\mathcal{C}_g$ pour $x\\in' + col(']{{a}}\\,;+\\infty[')
     + '$.'])

MODELES.append(modele(
    '06-position-relative', 'Position relative de deux courbes',
    'Position relative par le signe de f(x) − g(x) : parabole et droite, deux paraboles (f − g'
    ' affine), x³ et a²x sur [0 ; +∞[',
    'Dérivation', 'Position relative', 1, [V286_DROITE, V286_PARABOLES, V286_CUBE],
    [spec('x² et 4x − 3 : ]1 ; 3[', 0, {'r': 1, 'd': 2, 't': 3}, ']1;3[', 'correct'),
     spec('Erreur : crochets fermés', 0, {'r': 1, 'd': 2, 't': 3}, '[1;3]', 'incorrect'),
     spec('Erreur : au-dessus, ]3 ; +∞[', 0, {'r': 1, 'd': 2, 't': 3}, ']3;+\\infty[',
          'incorrect'),
     spec('k = 2, z = 1 : ]1 ; +∞[', 1, {'b': 1, 'c': 2, 'k': 2, 'z': 1}, ']1;+\\infty[',
          'correct'),
     spec('k = −2, z = 1 : ]−∞ ; 1[', 1, {'b': 1, 'c': 2, 'k': -2, 'z': 1}, ']-\\infty;1[',
          'correct'),
     spec('k = −2, erreur : ]1 ; +∞[', 1, {'b': 1, 'c': 2, 'k': -2, 'z': 1}, ']1;+\\infty[',
          'incorrect'),
     spec('x³ et 4x : ]2 ; +∞[', 2, {'a': 2}, ']2;+\\infty[', 'correct'),
     spec('Erreur : ]4 ; +∞[', 2, {'a': 2}, ']4;+\\infty[', 'incorrect')],
    delay=60, shared={'blankDefaults': {'answerKind': 'intervalles'}}))

# --- 7. 1SPE-403 : allure de la parabole selon le signe de a ----------------------------------


def parabole(signe, sommet, description):
    return ('```courbe\n  x: -5 ; 5\n  y: -6 ; 6\n  grille: 1 ; 1\n'
            '  f(x) = ' + signe + '{{m}}*(x-(' + sommet + '))^2+({{be}})   bleu\n'
            '  taille: petite\n  description: ' + description + '\n  ```')


V403_COURBES = variation(
    'Soit $f$ la fonction définie sur $\\mathbb{R}$ par $f(x)=' + ev('s*m*x^2-2*s*m*al*x+s*m*al^2+be')
    + '$.\n\nQuelle courbe peut représenter $f$ ?'
    + choix([parabole('{{s}}*', '{{al}}', 'Parabole tournée vers {{if:s>0|le haut|le bas}},'
                      ' de sommet d\'abscisse {{al}}.'),
             parabole('-({{s}})*', '{{al}}', 'Parabole tournée vers {{if:s>0|le bas|le haut}},'
                      ' de sommet d\'abscisse {{al}}.'),
             parabole('{{s}}*', ev('-al'), 'Parabole tournée vers {{if:s>0|le haut|le bas}},'
                      ' de sommet d\'abscisse ' + ev('-al') + '.'),
             parabole('-({{s}})*', ev('-al'), 'Parabole tournée vers {{if:s>0|le bas|le haut}},'
                      ' de sommet d\'abscisse ' + ev('-al') + '.')], fence='````'),
    [X, S, var('m', '1|2'), var('al', '1..3;±'), var('be', '-2..2')], ['0'],
    ['Le coefficient de $x^2$ est $' + ev('s*m') + '$, {{if:s>0|positif : la parabole est tournée'
     ' vers le haut|négatif : la parabole est tournée vers le bas}}.',
     '$f\'(x)=' + ev('2*s*m*x-2*s*m*al') + '$ s\'annule en $x={{al}}$ : c\'est l\'abscisse du'
     ' sommet. $f$ est {{if:s>0|décroissante puis croissante|croissante puis décroissante}}.',
     'La bonne courbe est $' + col('\\text{tournée vers {{if:s>0|le haut|le bas}}, de sommet'
                                   ' d\'abscisse } {{al}}') + '$.'],
    ['s*m*al^2 + be != 0'])
V403_SENS = variation(
    'Soit $f$ la fonction définie sur $\\mathbb{R}$ par $f(x)=' + ev('s*m*x^2+b*x+c') + '$.\n\n'
    'Sur $\\mathbb{R}$, la fonction $f$ est :'
    + choix(['décroissante puis croissante', 'croissante puis décroissante'], melanger=False),
    [X, S, var('m', '1..4'), var('b', '1..6;±'), var('c', '1..9;±')], [ev('(1-s)/2')],
    ['$f\'(x)=' + ev('2*s*m*x+b') + '$ : une fonction affine de coefficient directeur $'
     + ev('2*s*m') + '$, {{if:s>0|négative puis positive|positive puis négative}}.',
     'Le coefficient de $x^2$ est $' + ev('s*m') + '$ : la parabole est tournée vers'
     ' {{if:s>0|le haut|le bas}}.',
     '$f$ est $' + col('\\text{ {{if:s>0|décroissante puis croissante|croissante puis'
                       ' décroissante}} }') + '$.'])
V403_FACTORISEE = variation(
    'Soit $f$ la fonction définie sur $\\mathbb{R}$ par $f(x)=' + ev('s*m') + '({{u}}-x)(x'
    + evp('v') + ')$.\n\nSa courbe est une parabole tournée :'
    + choix(['vers le haut', 'vers le bas'], melanger=False),
    [S, var('m', '2..3'), var('u', '1..6'), var('v', '1..6;±')], [ev('(1+s)/2')],
    ['Le terme en $x^2$ vient de $' + ev('s*m') + '\\times(-x)\\times x=' + ev('-s*m') + 'x^2$ :'
     ' le coefficient de $x^2$ est $a=' + ev('-s*m') + '$, {{if:s>0|négatif|positif}}.',
     'La parabole est tournée $' + col('\\text{vers {{if:s>0|le bas|le haut}} }') + '$.'],
    ['u + v != 0'])

MODELES.append(modele(
    '07-allure-de-la-parabole', 'Allure de la parabole selon le signe de a',
    'Signe du coefficient de x² ⟹ parabole tournée vers le haut ou le bas : courbe à choisir'
    ' (sommet par f′), sens de variation, forme factorisée k(u − x)(x + v)',
    'Polynôme du second degré', 'Variations', 2, [V403_COURBES, V403_SENS, V403_FACTORISEE],
    [spec('Bonne courbe', 0, {'s': 1, 'm': 1, 'al': 2, 'be': -1}, '0', 'correct'),
     spec('Erreur : sens inversé', 0, {'s': 1, 'm': 1, 'al': 2, 'be': -1}, '1', 'incorrect'),
     spec('Erreur : sommet opposé', 0, {'s': 1, 'm': 1, 'al': 2, 'be': -1}, '2', 'incorrect'),
     spec('a > 0 : décroissante puis croissante', 1, {'s': 1, 'm': 2, 'b': 3, 'c': 1}, '0',
          'correct'),
     spec('a < 0 : croissante puis décroissante', 1, {'s': -1, 'm': 2, 'b': 3, 'c': 1}, '1',
          'correct'),
     spec('a < 0, erreur', 1, {'s': -1, 'm': 2, 'b': 3, 'c': 1}, '0', 'incorrect'),
     spec('2(3 − x)(x + 1) : vers le bas', 2, {'s': 1, 'm': 2, 'u': 3, 'v': 1}, '1', 'correct'),
     spec('Erreur : vers le haut (k > 0 lu comme a)', 2, {'s': 1, 'm': 2, 'u': 3, 'v': 1}, '0',
          'incorrect'),
     spec('−2(3 − x)(x + 1) : vers le haut', 2, {'s': -1, 'm': 2, 'u': 3, 'v': 1}, '0',
          'correct')],
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
