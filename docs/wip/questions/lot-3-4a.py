"""Écrit les 8 modèles du lot 4a « Fonctions : vocabulaire, linéaire, lectures sur une droite » de la 3e
dans scripts/questions/3-lot-4a/.

Phase 0 validée par David le 2026-10-30 (journal `questions-3-progress.md` § 11.1 et 11.6, un point
par modèle) :

| # | Point | Titre | Catégorie, niveau |
| 1 | 3-064 | Calculer une image par une fonction linéaire | Fonctions › Fonctions linéaires › Image, 1 |
| 2 | 3-041 | Reconnaître une fonction linéaire | Fonctions › Fonctions linéaires › Reconnaître, 1 |
| 3 | 3-043 | Fonction linéaire et proportionnalité | Fonctions › Fonctions linéaires › Proportionnalité, 1 |
| 4 | 3-039 | Formule, tableau de valeurs, courbe | Fonctions › Généralités › Représentations, 1 |
| 5 | 3-040 | Image et antécédent | Fonctions › Généralités › Image et antécédent, 1 |
| 6 | 3-045 | Lire l'ordonnée à l'origine | Fonctions › Fonctions affines › Lecture graphique, 2 |
| 7 | 3-067 | Lire un coefficient directeur entier | Fonctions › Fonctions affines › Lecture graphique, 3 |
| 8 | 3-067 | Lire un coefficient directeur fractionnaire | Fonctions › Fonctions affines › Lecture graphique, 4 |

Niveaux : « Fonctions affines › Lecture graphique » a déjà le niveau 1 (2de) ; les autres catégories
sont neuves (relevé MCP du 2026-10-30). Les modèles de 2de ae0ad163 et 09f0c9ec (mêmes lectures, images
fixes) restent tels quels : à comparer plus tard (David, 2026-10-30). Le nœud et le tag sont posés
par la migration de rangement, après le `--publier` de David.

Décisions et pièges :
- case choix : la bonne réponse écrite en premier (indice 0), le bloc mélange ;
- 3-041 v3 : les quatre tracés sont nommés d₁…d₄ par une permutation tirée (p), pour que la bonne
  ne soit pas toujours d₁ ; une variable ne vaut jamais une lettre → noms écrits par des {{if}} ;
- ` ```courbe ` : patrons de 2de 17809937 (antécédents) et a55ad3b4 (droite) ;
- antécédents sur une courbe : ensemble S = {… ; …}, `answerKind: 'intervalles'` (comme 17809937) ;
- 3-067 fraction : tiers seulement (q = 3) ; une moitié attendue en 1/2 refuse 0,5 (« mauvaise forme »,
  mesuré le 2026-10-30) ;
- variables `e` et `i` interdites dans les `eval`.

    python3 docs/wip/questions/lot-3-4a.py scripts/questions/3-lot-4a
"""
import json
import os
import subprocess
import sys

DOSSIER = sys.argv[1]


def spec(desc, vi, variables, answers, status):
    return {'description': desc, 'variationIndex': vi,
            'variables': {k: str(v) for k, v in variables.items()},
            'answers': answers if isinstance(answers, list) else [answers],
            'expected': {'status': status}}


def modele(nom, title, description, domain, subdomain, level, variations, specs, delay=60,
           shared=None):
    m = {'title': title, 'description': description, 'grades': ['3'], 'theme': 'Fonctions',
         'domain': domain, 'subdomain': subdomain, 'level': level, 'delay': delay,
         'status': 'draft'}
    if shared:
        m['shared'] = shared
    m['variations'] = variations
    m['testSpecs'] = specs
    return nom, m


def var(nom, expression):
    return {'name': nom, 'expression': expression}


def variation(statement, variables, answers, steps, conditions=None):
    v = {'statement': statement, 'variables': variables}
    if conditions:
        v['conditions'] = conditions
    v['blanks'] = [a if isinstance(a, dict) else {'expectedAnswer': a} for a in answers]
    v['correction'] = {'steps': steps}
    return v


def col(x, k=0):
    return '\\textcolor{{{color:primary.' + str(k) + '}}}{' + x + '}'


def ev(x):
    return '{{eval:' + x + '}}'


def choix(lignes):
    return '\n\n```choix\n' + ''.join('- ' + l + '\n' for l in lignes) + '```'


def courbe(x, y, traces, points=None, description=''):
    lignes = ['```courbe', 'x: ' + x, 'y: ' + y, 'grille: 1 ; 1'] + traces
    if points:
        lignes.append('points: ' + points)
    lignes += ['taille: moyenne', 'description: ' + description, '```']
    return '\n\n' + '\n'.join(lignes) + '\n\n'


def tableau(xs, fs):
    """Tableau de valeurs à deux lignes, x et f(x) ; une case s'écrit ?."""
    # Sans \\hline : un tableau qui porte une case passe par MathLive, qui ne le connaît pas
    # (« \\hline » écrit en clair, case vide en trop) ; forme de 4b080eed, en prod.
    cols = '|l|' + 'c|' * len(xs)
    return ('\n\n$\\begin{array}{' + cols + '} x & ' + ' & '.join(xs)
            + ' \\\\ f(x) & ' + ' & '.join(fs) + ' \\end{array}$\n\n')


X = '\\times'
MODELES = []

# --- 1. 3-064 : calculer une image par une fonction linéaire ----------------------------------

RAPPEL_IMAGE = 'Pour calculer l\'image d\'un nombre, on **remplace $x$** par ce nombre dans l\'expression.'


def image_lineaire(a_aff, a_eval, n_var, notation=False):
    if notation:
        enonce = ('On considère la fonction $f : x \\mapsto ' + a_aff + 'x$.\n\nQuelle est l\'image de $'
                  + '{{n}}' + '$ par $f$ ?\n\n$f({{n}})=?$')
    else:
        enonce = ('On considère la fonction $f$ définie par $f(x)=' + a_aff + 'x$.\n\nCalcule $f({{n}})$.'
                  '\n\n$f({{n}})=?$')
    return variation(
        enonce, n_var, [ev('(' + a_eval + ')*(n)')],
        [RAPPEL_IMAGE,
         '$$f({{n}}) = ' + a_aff + ' ' + X + ' ' + ev('n') + ' = ' + col(ev('(' + a_eval + ')*(n)')) + '$$'])


# a entier, x entier positif
V_ENTIERS = image_lineaire('{{a}}', 'a', [var('a', '2..9;±'), var('n', '2..9')])
# x négatif : f(−4)
V_NEGATIF = image_lineaire('{{a}}', 'a', [var('a', '2..9;±'), var('n', '-9..-2')])
# a décimal (0,5 ; 1,5 ; −2,5…) : k impair, a = k/2
V_DECIMAL = image_lineaire(ev('k/2;d'), 'k/2', [var('k', '1..9;±'), var('n', '2..8')])
V_DECIMAL['conditions'] = ['k - 2*floor(k/2) == 1']
V_DECIMAL['blanks'] = [{'expectedAnswer': ev('(k)*(n)/2;d')}]
V_DECIMAL['correction']['steps'][1] = ('$$f({{n}}) = ' + ev('k/2;d') + ' ' + X + ' {{n}} = '
                                       + col(ev('(k)*(n)/2;d')) + '$$')
# notation f : x ↦ ax
V_NOTATION = image_lineaire('{{a}}', 'a', [var('a', '2..9;±'), var('n', '2..9;±')], notation=True)
for v in (V_ENTIERS, V_NEGATIF, V_NOTATION):
    v['correction']['steps'][1] = ('$$f({{n}}) = {{a}} ' + X + ' ' + '{{if:n<0|({{n}})|{{n}}}}' + ' = '
                                   + col(ev('(a)*(n)')) + '$$')

MODELES.append(modele(
    '01-image-fonction-lineaire', 'Calculer une image par une fonction linéaire',
    'Calculer l\'image d\'un nombre par une fonction linéaire f(x) = ax : a et x entiers, x négatif,'
    ' a décimal, notation f : x ↦ ax',
    'Fonctions linéaires', 'Image', 1,
    [V_ENTIERS, V_NEGATIF, V_DECIMAL, V_NOTATION],
    [spec('f(x) = 3x, f(4) = 12', 0, {'a': 3, 'n': 4}, '12', 'correct'),
     spec('Erreur : a + x = 7', 0, {'a': 3, 'n': 4}, '7', 'incorrect'),
     spec('f(x) = −5x, f(−4) = 20', 1, {'a': -5, 'n': -4}, '20', 'correct'),
     spec('Erreur de signe : −20', 1, {'a': -5, 'n': -4}, '-20', 'incorrect'),
     spec('f(x) = 1,5x, f(6) = 9', 2, {'k': 3, 'n': 6}, '9', 'correct'),
     spec('f(x) = 2,5x, f(3) = 7,5', 2, {'k': 5, 'n': 3}, '7{,}5', 'correct'),
     spec('Erreur : 2,5 + 3 = 5,5', 2, {'k': 5, 'n': 3}, '5{,}5', 'incorrect'),
     spec('f : x ↦ 7x, image de −2 = −14', 3, {'a': 7, 'n': -2}, '-14', 'correct'),
     spec('Erreur : 14', 3, {'a': 7, 'n': -2}, '14', 'incorrect')],
    delay=45))

# --- 2. 3-041 : reconnaître une fonction linéaire ---------------------------------------------

RAPPEL_LINEAIRE = ('Une fonction **linéaire** s\'écrit $x \\mapsto ax$ : on multiplie $x$ par un nombre'
                   ' fixe $a$, sans rien ajouter.')
QUELLE = 'Parmi ces fonctions, laquelle est **linéaire** ?'

V_EXPRESSIONS = variation(
    QUELLE + choix(['$x \\mapsto {{a}}x$', '$x \\mapsto {{a}}x+{{b}}$', '$x \\mapsto {{a}}x^2$',
                    '$x \\mapsto \\dfrac{ {{a}} }{x}$']),
    [var('a', '2..9'), var('b', '1..9')], ['0'],
    [RAPPEL_LINEAIRE,
     '$' + col('x \\mapsto {{a}}x') + '$ est linéaire, de coefficient ${{a}}$.',
     '$x \\mapsto {{a}}x+{{b}}$ est affine, pas linéaire (on ajoute ${{b}}$) ; dans $x \\mapsto {{a}}x^2$'
     ' et $x \\mapsto \\dfrac{ {{a}} }{x}$, $x$ n\'est pas multiplié par un nombre fixe.'])

V_AUTREMENT = variation(
    QUELLE + choix(['$x \\mapsto \\dfrac{x}{ {{a}} }$', '$x \\mapsto x+{{a}}$', '$x \\mapsto {{a}}$',
                    '$x \\mapsto {{a}}-x$']),
    [var('a', '2..9')], ['0'],
    [RAPPEL_LINEAIRE,
     '$\\dfrac{x}{ {{a}} } = \\dfrac{1}{ {{a}} } ' + X + ' x$ : $' + col('x \\mapsto \\dfrac{x}{ {{a}} }')
     + '$ est linéaire, de coefficient $\\dfrac{1}{ {{a}} }$.',
     '$x \\mapsto x+{{a}}$ et $x \\mapsto {{a}}-x$ ajoutent un nombre : elles sont affines. $x \\mapsto {{a}}$'
     ' est constante.'])


def nom_trace(j):
    """Nom du tracé j (0 = la droite linéaire), décalé par la permutation tirée p."""
    return ''.join('{{if:p==' + str(k) + '|d_' + str((j + k) % 4 + 1) + '|}}' for k in range(4))


TRACES_LINEAIRE = [
    'f(x) = ({{m}})*x   bleu   nom=' + nom_trace(0),
    'g(x) = ({{c}})*x+({{b}})   rouge   nom=' + nom_trace(1),
    'h(x) = 0.5*x^2-3   vert   nom=' + nom_trace(2),
    'k(x) = {{h}}   orange   nom=' + nom_trace(3),
]
V_GRAPHIQUE = variation(
    'Dans le repère ci-dessous, quel tracé représente une fonction **linéaire** ?'
    + courbe('-5 ; 5', '-5 ; 5', TRACES_LINEAIRE,
             description='Quatre tracés : trois droites et une parabole, nommés d1 à d4.')
    + choix(['$' + nom_trace(j) + '$' for j in range(4)]),
    [var('m', '1|2|-1|-2'), var('c', '1|-1|2'), var('b', '2..3;±'), var('h', '2..4;±'),
     var('p', '0..3')], ['0'],
    ['Une fonction linéaire est représentée par une **droite qui passe par l\'origine** du repère.',
     '$' + col(nom_trace(0)) + '$ est une droite qui passe par l\'origine : c\'est elle.',
     '$' + nom_trace(1) + '$ et $' + nom_trace(3) + '$ sont des droites qui ne passent pas par l\'origine'
     ' (fonctions affines) ; $' + nom_trace(2) + '$ n\'est pas une droite.'],
    ['c != m', 'h != b'])

MODELES.append(modele(
    '02-reconnaitre-fonction-lineaire', 'Reconnaître une fonction linéaire',
    'Reconnaître une fonction linéaire : parmi quatre expressions, écrite autrement (x/4), ou parmi'
    ' quatre tracés (droite passant par l\'origine)',
    'Fonctions linéaires', 'Reconnaître', 1,
    [V_EXPRESSIONS, V_AUTREMENT, V_GRAPHIQUE],
    [spec('Expressions : ax', 0, {'a': 3, 'b': 2}, '0', 'correct'),
     spec('Erreur : ax + b', 0, {'a': 3, 'b': 2}, '1', 'incorrect'),
     spec('Écrite autrement : x/a', 1, {'a': 4}, '0', 'correct'),
     spec('Erreur : constante', 1, {'a': 4}, '2', 'incorrect'),
     spec('Graphique : la droite par l\'origine', 2, {'m': 2, 'c': 1, 'b': 3, 'h': -2, 'p': 1}, '0',
          'correct'),
     spec('Erreur : la droite affine', 2, {'m': 2, 'c': 1, 'b': 3, 'h': -2, 'p': 1}, '1', 'incorrect')],
    delay=45))

# --- 3. 3-043 : fonction linéaire et proportionnalité -----------------------------------------

RAPPEL_PROP = ('$f$ est linéaire : $f(x)=ax$, donc $f(x)$ est **proportionnel** à $x$ et $a$ est le'
               ' coefficient de proportionnalité, $a=\\dfrac{f(x)}{x}$.')

V_TABLEAU = variation(
    'La fonction $f$ est linéaire, $f(x)=ax$. Voici un tableau de valeurs de $f$ :'
    + tableau(['{{n}}', '{{q}}'], [ev('(a)*(n)'), ev('(a)*(q)')]) + 'Quel est le coefficient $a$ ?\n\n$a=?$',
    [var('a', '2..9;±'), var('n', '1..5'), var('q', '6..10')], [ev('a')],
    [RAPPEL_PROP,
     '$$a = \\dfrac{' + ev('(a)*(n)') + '}{ {{n}} } = ' + col(ev('a')) + '$$'])

V_UNE_VALEUR = variation(
    '$f$ est une fonction linéaire telle que $f({{n}})=' + ev('(a)*(n)') + '$.\n\nQuel est son coefficient'
    ' $a$ ?\n\n$a=?$',
    [var('a', '2..9;±'), var('n', '2..6')], [ev('a')],
    [RAPPEL_PROP,
     '$$a = \\dfrac{f({{n}})}{ {{n}} } = \\dfrac{' + ev('(a)*(n)') + '}{ {{n}} } = ' + col(ev('a')) + '$$'],
    ['abs(a) != n'])

V_PRIX = variation(
    'Au marché, les pommes coûtent $' + ev('k/10;d') + '~\\unit{€}$ le kilogramme. Le prix payé, en euros,'
    ' est une fonction linéaire $f$ de la masse $x$ achetée, en kilogrammes.\n\nDonne l\'expression de'
    ' $f(x)$.\n\n$f(x)=?$',
    [var('k', '15..35')], [ev('k/10;d') + 'x'],
    ['Le prix est **proportionnel** à la masse : on multiplie la masse par le prix d\'un kilogramme.',
     '$$f(x) = ' + col(ev('k/10;d') + 'x') + '$$'],
    ['k - 5*floor(k/5) == 0'])

V_VITESSE = variation(
    'Une voiture roule à la vitesse constante de ${{v}}~\\unit{km/h}$. La distance parcourue, en'
    ' kilomètres, est une fonction linéaire $f$ de la durée $x$ du trajet, en heures.\n\nDonne'
    ' l\'expression de $f(x)$.\n\n$f(x)=?$',
    [var('v', '50|60|70|80|90|110|130')], ['{{v}}x'],
    ['À vitesse constante, la distance est **proportionnelle** à la durée : en $x$ heures, la voiture'
     ' parcourt $x$ fois ${{v}}~\\unit{km}$.',
     '$$f(x) = ' + col('{{v}}x') + '$$'])

MODELES.append(modele(
    '03-lineaire-et-proportionnalite', 'Fonction linéaire et proportionnalité',
    'Relier fonction linéaire et proportionnalité : coefficient a lu dans un tableau ou tiré de'
    ' f(n) donné, expression f(x) = ax d\'une situation (prix au kilogramme, vitesse constante)',
    'Fonctions linéaires', 'Proportionnalité', 1,
    [V_TABLEAU, V_UNE_VALEUR, V_PRIX, V_VITESSE],
    [spec('Tableau : a = 4', 0, {'a': 4, 'n': 2, 'q': 7}, '4', 'correct'),
     spec('Erreur : rapport renversé 1/4', 0, {'a': 4, 'n': 2, 'q': 7}, '\\frac{1}{4}', 'incorrect'),
     spec('f(2) = 6 : a = 3', 1, {'a': 3, 'n': 2}, '3', 'correct'),
     spec('Erreur : 6 − 2 = 4', 1, {'a': 3, 'n': 2}, '4', 'incorrect'),
     spec('Erreur : 2/6', 1, {'a': 3, 'n': 2}, '\\frac{1}{3}', 'incorrect'),
     spec('Pommes à 2,5 € : f(x) = 2,5x', 2, {'k': 25}, '2{,}5x', 'correct'),
     spec('Erreur : x/2,5', 2, {'k': 25}, '\\frac{x}{2{,}5}', 'incorrect'),
     spec('Erreur : 2,5 + x', 2, {'k': 25}, '2{,}5+x', 'incorrect'),
     spec('Vitesse 90 : f(x) = 90x', 3, {'v': 90}, '90x', 'correct'),
     spec('Erreur : x/90', 3, {'v': 90}, '\\frac{x}{90}', 'incorrect')],
    delay=60))

# --- 4. 3-039 : formule, tableau de valeurs, courbe -------------------------------------------

COMPLETE = 'Complète le tableau de valeurs de $f$ :'

V_FORMULE_AFFINE = variation(
    'On considère la fonction $f$ définie par $f(x)={{a}}x' + '{{if:b<0|{{b}}|+{{b}}}}' + '$.\n\n' + COMPLETE
    + tableau(['0', '1', '{{n}}'], [ev('b'), ev('(a)+(b)'), '?']),
    [var('a', '2..5'), var('b', '1..9;±'), var('n', '-5..-2')], [ev('(a)*(n)+(b)')],
    ['On remplace $x$ par ${{n}}$ dans la formule.',
     '$$f({{n}}) = {{a}} ' + X + ' ({{n}}) ' + '{{if:b<0|{{b}}|+{{b}}}}' + ' = ' + col(ev('(a)*(n)+(b)')) + '$$'])

V_FORMULE_CARRE = variation(
    'On considère la fonction $f$ définie par $f(x)=x^2' + '{{if:c<0|{{c}}|+{{c}}}}' + '$.\n\n' + COMPLETE
    + tableau(['0', '1', '{{n}}'], [ev('c'), ev('1+(c)'), '?']),
    [var('c', '1..9;±'), var('n', '-5..-2')], [ev('(n)^2+(c)')],
    ['On remplace $x$ par ${{n}}$ dans la formule, **parenthèses comprises** : le carré d\'un nombre'
     ' négatif est positif.',
     '$$f({{n}}) = ({{n}})^2 ' + '{{if:c<0|{{c}}|+{{c}}}}' + ' = ' + ev('(n)^2') + ' '
     + '{{if:c<0|{{c}}|+{{c}}}}' + ' = ' + col(ev('(n)^2+(c)')) + '$$'])

# Courbe : parabole de sommet (p ; q), ouverte vers le haut ou le bas (c), lue en n = p + d
X_PARAB = ev('min(-1,p-3)') + ' ; ' + ev('max(1,p+3)')
Y_PARAB = ev('min(-1,q-1,q+5*(c))') + ' ; ' + ev('max(1,q+1,q+5*(c))')
F_PARAB = 'f(x) = ({{c}})*(x-({{p}}))^2+({{q}})'
SUR_PARAB = ' sur [' + ev('p-2.2;d') + ' ; ' + ev('p+2.2;d') + ']   bleu   nom=C_f'
VARS_PARAB = [var('c', '1|-1'), var('p', '-1..1'), var('q', '-2..2'), var('d', '-2..2'),
              var('n', 'eval:(p)+(d)')]

V_COURBE_TABLEAU = variation(
    'La courbe $\\mathcal{C}_f$ ci-dessous représente une fonction $f$.'
    + courbe(X_PARAB, Y_PARAB, [F_PARAB + SUR_PARAB], description='Courbe en forme de parabole d\'une'
             ' fonction f.')
    + COMPLETE + tableau(['{{n}}'], ['?']),
    VARS_PARAB, [ev('(q)+(c)*(d)^2')],
    ['On cherche le point de $\\mathcal{C}_f$ d\'**abscisse** ${{n}}$ ; $f({{n}})$ est son **ordonnée**.',
     courbe(X_PARAB, Y_PARAB, [F_PARAB + SUR_PARAB],
            points='A({{n}} ; ' + ev('(q)+(c)*(d)^2') + ')',
            description='Courbe de f et son point A d\'abscisse {{n}}.').strip(),
     '$A({{n}}\\,;' + ev('(q)+(c)*(d)^2') + ')$ : $f({{n}})=' + col(ev('(q)+(c)*(d)^2')) + '$.'],
    ['d != 0'])

V_TABLEAU_FORMULE = variation(
    'Voici un tableau de valeurs d\'une fonction $f$ :'
    + tableau(['0', '1', '2', '3'], [ev('b'), ev('(a)+(b)'), ev('2*(a)+(b)'), ev('3*(a)+(b)')])
    + 'Quelle formule peut définir $f$ ?'
    + choix(['$f(x)={{a}}x+{{b}}$', '$f(x)={{b}}x+{{a}}$', '$f(x)=' + ev('(a)+(b)') + 'x$', '$f(x)=x+{{b}}$']),
    [var('a', '2..5'), var('b', '2..9')], ['0'],
    ['On vérifie chaque formule sur **toutes** les colonnes du tableau.',
     'Avec $' + col('f(x)={{a}}x+{{b}}') + '$ : $f(0)={{b}}$, $f(1)=' + ev('(a)+(b)') + '$, $f(2)='
     + ev('2*(a)+(b)') + '$, $f(3)=' + ev('3*(a)+(b)') + '$ : tout correspond.',
     '$f(x)=' + ev('(a)+(b)') + 'x$ donne $f(0)=0$, et non ${{b}}$.'],
    ['a != b'])

MODELES.append(modele(
    '04-formule-tableau-courbe', 'Formule, tableau de valeurs, courbe',
    'Passer d\'une représentation d\'une fonction à une autre : formule → tableau (affine, x² + c en un'
    ' nombre négatif), courbe → tableau, tableau → formule',
    'Généralités', 'Représentations', 1,
    [V_FORMULE_AFFINE, V_FORMULE_CARRE, V_COURBE_TABLEAU, V_TABLEAU_FORMULE],
    [spec('f(x) = 3x + 2, f(−4) = −10', 0, {'a': 3, 'b': 2, 'n': -4}, '-10', 'correct'),
     spec('Erreur : signe oublié, 3 × 4 + 2 = 14', 0, {'a': 3, 'b': 2, 'n': -4}, '14', 'incorrect'),
     spec('f(x) = x² + 1, f(−3) = 10', 1, {'c': 1, 'n': -3}, '10', 'correct'),
     spec('Erreur : −3² = −9, −8', 1, {'c': 1, 'n': -3}, '-8', 'incorrect'),
     spec('Erreur : 2 × (−3) + 1 = −5', 1, {'c': 1, 'n': -3}, '-5', 'incorrect'),
     spec('Courbe : f(2) = 3 (sommet (0 ; −1), haut)', 2, {'c': 1, 'p': 0, 'q': -1, 'd': 2, 'n': 2}, '3',
          'correct'),
     spec('Erreur : l\'abscisse 2', 2, {'c': 1, 'p': 0, 'q': -1, 'd': 2, 'n': 2}, '2', 'incorrect'),
     spec('Tableau : 3x + 5', 3, {'a': 3, 'b': 5}, '0', 'correct'),
     spec('Erreur : 8x (seulement f(1))', 3, {'a': 3, 'b': 5}, '2', 'incorrect')],
    delay=75))

# --- 5. 3-040 : image et antécédent -----------------------------------------------------------

RAPPEL_VOC = ('Si $f(a)=b$, on dit que $b$ est **l\'image** de $a$ et que $a$ est **un antécédent** de $b$.'
              ' Dans le tableau, les antécédents sont sur la ligne de $x$, les images sur celle de $f(x)$.')
TAB_IMAGES = tableau(['-2', '-1', '0', '1', '2'],
                     [ev('-2*(a)+(b)'), ev('-(a)+(b)'), ev('b'), ev('(a)+(b)'), ev('2*(a)+(b)')])
VARS_TAB = [var('a', '2..4;±'), var('b', '-3..3'), var('k', '-2..2')]
CONDS_TAB = ['b != 0', 'abs(b) != abs(a)']

V_IMAGE_TABLEAU = variation(
    'Voici un tableau de valeurs d\'une fonction $f$ :' + TAB_IMAGES + 'Quelle est l\'image de ${{k}}$ par'
    ' $f$ ?\n\n$f({{k}})=?$',
    VARS_TAB, [ev('(a)*(k)+(b)')],
    [RAPPEL_VOC,
     'On lit la colonne de $x={{k}}$ : l\'image de ${{k}}$ est $' + col(ev('(a)*(k)+(b)')) + '$.'],
    CONDS_TAB + ['k != 0'])

V_ANTECEDENT_TABLEAU = variation(
    'Voici un tableau de valeurs d\'une fonction $f$ :' + TAB_IMAGES + 'Quel est l\'antécédent de $'
    + ev('(a)*(k)+(b)') + '$ par $f$ dans ce tableau ?\n\n$?$',
    VARS_TAB, ['{{k}}'],
    [RAPPEL_VOC,
     'On cherche $' + ev('(a)*(k)+(b)') + '$ sur la ligne de $f(x)$ : il est sous $x=' + col('{{k}}')
     + '$. L\'antécédent est $' + col('{{k}}') + '$.'],
    CONDS_TAB + ['k != 0', '(a)*(k)+(b) != k'])

V_IMAGE_COURBE = variation(
    'La courbe $\\mathcal{C}_f$ ci-dessous représente une fonction $f$.'
    + courbe(X_PARAB, Y_PARAB, [F_PARAB + SUR_PARAB], description='Courbe en forme de parabole d\'une'
             ' fonction f.')
    + 'Lis l\'image de ${{n}}$ par $f$.\n\n$f({{n}})=?$',
    VARS_PARAB, [ev('(q)+(c)*(d)^2')],
    ['L\'image de ${{n}}$ est l\'**ordonnée** du point de $\\mathcal{C}_f$ d\'abscisse ${{n}}$.',
     courbe(X_PARAB, Y_PARAB, [F_PARAB + SUR_PARAB],
            points='A({{n}} ; ' + ev('(q)+(c)*(d)^2') + ')',
            description='Courbe de f et son point A d\'abscisse {{n}}.').strip(),
     '$A({{n}}\\,;' + ev('(q)+(c)*(d)^2') + ')$ : $f({{n}})=' + col(ev('(q)+(c)*(d)^2')) + '$.'],
    ['d != 0', '(q)+(c)*(d)^2 != n'])

# Antécédents sur une courbe : patron de 2de 17809937 (parabole de racines p et q au niveau k)
X_ANT = ev('(p)-2') + ' ; ' + ev('max(1,(r)+2)')
Y_ANT = (ev('floor(min(0,(k)-(c)*(d)*(d)/4,(k)+(c)*(1+(d))))-1') + ' ; '
         + ev('ceil(max(0,(k)-(c)*(d)*(d)/4,(k)+(c)*(1+(d))))+1'))
F_ANT = ('f(x) = {{k}}+({{c}})*(x-({{p}}))*(x-({{r}})) sur [' + ev('(p)-1') + ' ; ' + ev('(r)+1')
         + ']   bleu   nom=C_f')
V_ANTECEDENTS_COURBE = variation(
    'La courbe $\\mathcal{C}_f$ ci-dessous représente une fonction $f$.'
    + courbe(X_ANT, Y_ANT, [F_ANT], description='Courbe en forme de parabole d\'une fonction f.')
    + 'Lis les antécédents de ${{k}}$ par $f$.\n\nL\'ensemble des antécédents est $?$.',
    [var('p', '-4..0'), var('d', '2..4'), var('r', 'eval:(p)+(d)'), var('c', '1|-1'), var('k', '-3..3')],
    [{'expectedAnswer': '\\{ {{p}} ; {{r}} \\}', 'answerKind': 'intervalles'}],
    ['On trace la droite horizontale d\'équation $y={{k}}$ : les antécédents de ${{k}}$ sont les'
     ' **abscisses** des points où elle coupe $\\mathcal{C}_f$.',
     courbe(X_ANT, Y_ANT, [F_ANT, 'g(x) = {{k}}   rouge   pointillé'],
            points='A({{p}} ; {{k}}), B({{r}} ; {{k}})',
            description='Courbe de f et droite horizontale y = {{k}}, qui la coupe en A et B.').strip(),
     'La droite coupe $\\mathcal{C}_f$ en $A$ et $B$ : ${{k}}$ a deux antécédents, $'
     + col('\\{ {{p}} ; {{r}} \\}') + '$.'])

V_IMAGE_EXPRESSION = variation(
    'On considère la fonction $f$ définie par $f(x)=x^2-{{b}}$.\n\nCalcule l\'image de ${{n}}$ par $f$.'
    '\n\n$f({{n}})=?$',
    [var('b', '1..9'), var('n', '-6..-2')], [ev('(n)^2-(b)')],
    ['On remplace $x$ par ${{n}}$, **entre parenthèses** : le carré d\'un nombre négatif est positif.',
     '$$f({{n}}) = ({{n}})^2-{{b}} = ' + ev('(n)^2') + '-{{b}} = ' + col(ev('(n)^2-(b)')) + '$$'])

S_TAB = {'a': 3, 'b': 1, 'k': 2}
S_COURBE = {'c': 1, 'p': 0, 'q': -1, 'd': 2, 'n': 2}
S_ANT = {'p': -2, 'd': 4, 'r': 2, 'c': 1, 'k': 1}
MODELES.append(modele(
    '05-image-et-antecedent', 'Image et antécédent',
    'Image et antécédent : lus dans un tableau de valeurs, lus sur une courbe (deux antécédents),'
    ' image calculée par une expression simple (x² − 3)',
    'Généralités', 'Image et antécédent', 1,
    [V_IMAGE_TABLEAU, V_ANTECEDENT_TABLEAU, V_IMAGE_COURBE, V_ANTECEDENTS_COURBE, V_IMAGE_EXPRESSION],
    [spec('Tableau : image de 2 = 7', 0, S_TAB, '7', 'correct'),
     spec('Erreur : antécédent au lieu de l\'image', 0, S_TAB, '2', 'incorrect'),
     spec('Tableau : antécédent de 7 = 2', 1, S_TAB, '2', 'correct'),
     spec('Erreur : l\'image de 7 confondue', 1, S_TAB, '7', 'incorrect'),
     spec('Courbe : image de 2 = 3', 2, S_COURBE, '3', 'correct'),
     spec('Erreur : 2', 2, S_COURBE, '2', 'incorrect'),
     spec('Courbe : antécédents de 1 = {−2 ; 2}', 3, S_ANT, '\\{-2;2\\}', 'correct'),
     spec('Ordre inverse', 3, S_ANT, '\\{2;-2\\}', 'correct'),
     spec('Erreur : un seul antécédent', 3, S_ANT, '\\{2\\}', 'incorrect'),
     spec('x² − 3, image de −4 = 13', 4, {'b': 3, 'n': -4}, '13', 'correct'),
     spec('Erreur : −16 − 3 = −19', 4, {'b': 3, 'n': -4}, '-19', 'incorrect'),
     spec('Erreur : 2 × (−4) − 3 = −11', 4, {'b': 3, 'n': -4}, '-11', 'incorrect')],
    delay=60))

# --- 6. 3-045 : lire l'ordonnée à l'origine ---------------------------------------------------

Y_DROITE = ev('min(-1,(p)-4*abs(m))-1') + ' ; ' + ev('max(1,(p)+4*abs(m))+1')
DROITE = 'f(x) = ({{m}})*x+({{p}})   bleu   nom=\\mathcal{D}'
DESC_DROITE = 'Droite D représentant une fonction affine f.'
RAPPEL_ORDONNEE = ('L\'ordonnée à l\'origine $b$ de $f(x)=ax+b$ est l\'**ordonnée du point** où la droite'
                   ' coupe l\'**axe des ordonnées** (le point d\'abscisse $0$) : $f(0)=b$.')


def ordonnee(vars_):
    return variation(
        'La droite $\\mathcal{D}$ ci-dessous représente une fonction affine $f$.'
        + courbe('-5 ; 5', Y_DROITE, [DROITE], description=DESC_DROITE)
        + 'Quelle est l\'ordonnée à l\'origine de $f$ ?\n\n$b=?$',
        vars_, ['{{p}}'],
        [RAPPEL_ORDONNEE,
         courbe('-5 ; 5', Y_DROITE, [DROITE], points='B(0 ; {{p}})',
                description='Droite D et son point B sur l\'axe des ordonnées.').strip(),
         '$\\mathcal{D}$ coupe l\'axe des ordonnées en $B(0\\,;{{p}})$ : $b=' + col('{{p}}') + '$.'])


MODELES.append(modele(
    '06-lire-ordonnee-origine', 'Lire l\'ordonnée à l\'origine',
    'Lire graphiquement l\'ordonnée à l\'origine d\'une fonction affine : droite montante, descendante,'
    ' fonction linéaire (b = 0)',
    'Fonctions affines', 'Lecture graphique', 2,
    [ordonnee([var('m', '1|2|3'), var('p', '1..4;±')]),
     ordonnee([var('m', '-1|-2|-3'), var('p', '1..4;±')]),
     ordonnee([var('m', '1|2|-1|-2'), var('p', '0')])],
    [spec('Montante, b = 3', 0, {'m': 2, 'p': 3}, '3', 'correct'),
     spec('Erreur : l\'abscisse du point sur l\'axe des abscisses (−1,5)', 0, {'m': 2, 'p': 3},
          '-1{,}5', 'incorrect'),
     spec('Descendante, b = −2', 1, {'m': -1, 'p': -2}, '-2', 'correct'),
     spec('Erreur de signe : 2', 1, {'m': -1, 'p': -2}, '2', 'incorrect'),
     spec('Linéaire : b = 0', 2, {'m': 2, 'p': 0}, '0', 'correct'),
     spec('Erreur : le coefficient 2', 2, {'m': 2, 'p': 0}, '2', 'incorrect')],
    delay=45))

# --- 7 et 8. 3-067 : lire le coefficient directeur --------------------------------------------

RAPPEL_COEFF = ('Le coefficient directeur $a$ se lit entre deux points de la droite : quand on avance de'
                ' $1$ vers la droite, $f(x)$ change de $a$ ; plus généralement $a=\\dfrac{\\text{déplacement'
                ' vertical}}{\\text{déplacement horizontal}}$.')


def coeff_entier(vars_):
    return variation(
        'La droite $\\mathcal{D}$ ci-dessous représente une fonction affine $f$.'
        + courbe('-5 ; 5', Y_DROITE, [DROITE], description=DESC_DROITE)
        + 'Quel est le coefficient directeur de $f$ ?\n\n$a=?$',
        vars_, ['{{m}}'],
        [RAPPEL_COEFF,
         courbe('-5 ; 5', Y_DROITE, [DROITE], points='A(0 ; {{p}}), B(1 ; ' + ev('(p)+(m)') + ')',
                description='Droite D et deux de ses points, A et B, d\'abscisses 0 et 1.').strip(),
         'De $A(0\\,;{{p}})$ à $B(1\\,;' + ev('(p)+(m)') + ')$ : on avance de $1$, on '
         + '{{if:m>0|monte|descend}}' + ' de $' + ev('abs(m)') + '$, donc $a=' + col('{{m}}') + '$.'])


MODELES.append(modele(
    '07-lire-coefficient-directeur-entier', 'Lire un coefficient directeur entier',
    'Lire graphiquement le coefficient directeur entier d\'une fonction affine : droite montante,'
    ' descendante',
    'Fonctions affines', 'Lecture graphique', 3,
    [coeff_entier([var('m', '1..3'), var('p', '-2..2')]),
     coeff_entier([var('m', '-3..-1'), var('p', '-2..2')])],
    [spec('Montante, a = 2', 0, {'m': 2, 'p': 1}, '2', 'correct'),
     spec('Erreur : l\'ordonnée à l\'origine 1', 0, {'m': 2, 'p': 1}, '1', 'incorrect'),
     spec('Erreur : 1/2 (horizontal sur vertical)', 0, {'m': 2, 'p': 1}, '\\frac{1}{2}', 'incorrect'),
     spec('Descendante, a = −3', 1, {'m': -3, 'p': 2}, '-3', 'correct'),
     spec('Erreur : signe oublié, 3', 1, {'m': -3, 'p': 2}, '3', 'incorrect')],
    delay=60))

# Fraction n/q : la droite passe par A(0 ; p) et B(q ; p + n), deux nœuds du quadrillage
Y_FRAC = ev('min(-1,(p)-3)-1') + ' ; ' + ev('max(1,(p)+3)+1')
DROITE_FRAC = 'f(x) = ({{n}})/({{q}})*x+({{p}})   bleu   nom=\\mathcal{D}'


def coeff_fraction(vars_):
    return variation(
        'La droite $\\mathcal{D}$ ci-dessous représente une fonction affine $f$.'
        + courbe('-5 ; 5', Y_FRAC, [DROITE_FRAC], description=DESC_DROITE)
        + 'Quel est le coefficient directeur de $f$ ?\n\n$a=?$',
        vars_, [ev('(n)/(q)')],
        [RAPPEL_COEFF,
         courbe('-5 ; 5', Y_FRAC, [DROITE_FRAC], points='A(0 ; {{p}}), B({{q}} ; ' + ev('(p)+(n)') + ')',
                description='Droite D et deux de ses points sur le quadrillage, A et B.').strip(),
         'De $A(0\\,;{{p}})$ à $B({{q}}\\,;' + ev('(p)+(n)') + ')$ : on avance de ${{q}}$, on '
         + '{{if:n>0|monte|descend}}' + ' de $' + ev('abs(n)') + '$, donc $a=\\dfrac{' + '{{n}}' + '}{ {{q}} }='
         + col(ev('(n)/(q)')) + '$.'],
        ['gcd(abs(n), q) == 1'])


MODELES.append(modele(
    '08-lire-coefficient-directeur-fraction', 'Lire un coefficient directeur fractionnaire',
    'Lire graphiquement un coefficient directeur fractionnaire en tiers (1/3, 2/3, −1/3, −2/3) entre'
    ' deux nœuds du quadrillage',
    'Fonctions affines', 'Lecture graphique', 4,
    [coeff_fraction([var('n', '1..2'), var('q', '3'), var('p', '-2..2')]),
     coeff_fraction([var('n', '-2..-1'), var('q', '3'), var('p', '-2..2')])],
    [spec('Montante, a = 2/3', 0, {'n': 2, 'q': 3, 'p': -1}, '\\frac{2}{3}', 'correct'),
     spec('Erreur : 3/2 (renversé)', 0, {'n': 2, 'q': 3, 'p': -1}, '\\frac{3}{2}', 'incorrect'),
     spec('Montante, a = 1/3', 0, {'n': 1, 'q': 3, 'p': 0}, '\\frac{1}{3}', 'correct'),
     spec('Erreur : arrondi 0,33', 0, {'n': 1, 'q': 3, 'p': 0}, '0{,}33', 'incorrect'),
     spec('Descendante, a = −1/3', 1, {'n': -1, 'q': 3, 'p': 2}, '-\\frac{1}{3}', 'correct'),
     spec('Erreur : signe oublié', 1, {'n': -1, 'q': 3, 'p': 2}, '\\frac{1}{3}', 'incorrect')],
    delay=75))

os.makedirs(DOSSIER, exist_ok=True)
for nom, m in MODELES:
    with open(os.path.join(DOSSIER, nom + '.json'), 'w', encoding='utf-8') as f:
        json.dump(m, f, ensure_ascii=False, indent='\t')
        f.write('\n')
# Mis en forme comme le pre-commit, pour que le script redonne les fichiers commités
subprocess.run(['pnpm', 'exec', 'prettier', '--write', DOSSIER], check=True,
               stdout=subprocess.DEVNULL)
print(f'{len(MODELES)} modèles écrits dans {DOSSIER}')
