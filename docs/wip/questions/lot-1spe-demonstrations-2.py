"""Écrit les 5 modèles du lot 2 « démonstrations : dérivation » de la 1re spé
dans scripts/questions/1spe-demonstrations-2/.

Phase 0 validée par David le 2026-11-03 (« je te suis » sur les recos, D1 du journal
« docs/archive/wip/questions-1spe-demonstrations-progress.md », § 3), un point par modèle :

| # | Point    | Titre                                          | Catégorie, niveau                     |
| 1 | 1SPE-275 | Démontrer l'équation de la tangente            | Fonctions › Dérivation › Démonstrations, 4 |
| 2 | 1SPE-276 | Démontrer que √ n'est pas dérivable en 0       | Fonctions › Dérivation › Démonstrations, 3 |
| 3 | 1SPE-277 | Démontrer la dérivée de la fonction carré      | Fonctions › Dérivation › Démonstrations, 1 |
| 4 | 1SPE-398 | Démontrer la dérivée de la fonction inverse    | Fonctions › Dérivation › Démonstrations, 2 |
| 5 | 1SPE-278 | Démontrer la dérivée d'un produit              | Fonctions › Dérivation › Démonstrations, 5 |

Niveaux : du calcul de taux le plus court (carré) au plus long (produit) ; la tangente vient
après les trois taux, avant le produit.

Forme (D1, Q2 a) : la démonstration est écrite, l'élève complète l'étape clé (case) ou choisit la
justification (case choix à 4 propositions, la première est la bonne, l'affichage les mélange).
Une variation par étape clé (Q3) ; valeurs tirées pour 275 (a, f(a), f′(a)), 276 (h = 10⁻²ᵖ) et
278 (u(a), u′(a), v(a), v′(a)), lettres ailleurs.

Catégorie « Démonstrations » neuve sous Dérivation (relevé prod du 2026-11-03 : seules existent
celles du lot 1, sous Suites et Polynôme du second degré). Nœuds des points (relevé du
2026-11-03), tous sous Fonctions › Dérivation : tangente (275), dérivabilité en un point (276),
fonctions dérivées (277, 398), opérations sur les dérivées (278). 398 a un jumeau DANS le même
programme (1SPE-392, son « à savoir », même nœud, même libellé) : un seul point par programme
(ADR 0020), le modèle ne prend que 398.

Voisins à ne pas répéter : « Équation d'une tangente connaissant f(a) et f′(a) » (272),
« Dérivabilité de la valeur absolue en 0 » (267), les « à savoir » carré (264) et inverse (392),
« Dériver un produit » : ils APPLIQUENT le résultat, ceux-ci le DÉMONTRENT.

Bornes : « lycee/1spe.json » (ce qui est démontré : y = f(a) + f′(a)(x − a) ; √ non dérivable
en 0, taux non borné ; (x²)′ = 2x ; (1/x)′ = −1/x² ; (uv)′ = u′v + uv′ ; pas plus). La continuité
n'est pas au programme de 1re : dans 278, « v(a + h) tend vers v(a) » est ADMIS dans l'énoncé.

Aucune réponse attendue n'écrit une fonction appliquée (u(a), v(a + h)) : le juge les lirait
comme des produits. Ces étapes passent en case choix, ou en valeurs tirées. À l'inverse, h est
une fonction générique du parseur (f, g, h) : `h(2a+h)` est lu h appliquée à 2a + h, donc FAUX.
D'où « expression développée » dans 277. `\\frac{-1}{…}` reste `unoptimal_form` (signes).

    python3 docs/wip/questions/lot-1spe-demonstrations-2.py scripts/questions/1spe-demonstrations-2
"""
import json
import os
import subprocess
import sys

DOSSIER = sys.argv[1]


def spec(desc, vi, answer, status, variables=None):
    return {'description': desc, 'variationIndex': vi,
            'variables': {k: str(v) for k, v in (variables or {}).items()},
            'answers': [answer],
            'expected': ({'status': status, 'constraintViolations': ['signs']}
                         if status == 'unoptimal_form' else {'status': status})}


def modele(nom, title, description, subdomain_level, variations, specs):
    return nom, {'title': title, 'description': description, 'grades': ['1_SPE'],
                 'theme': 'Fonctions', 'domain': 'Dérivation', 'subdomain': 'Démonstrations',
                 'level': subdomain_level, 'delay': 90, 'status': 'draft',
                 'shared': {},
                 'variations': variations, 'testSpecs': specs}


def var(nom, expression):
    return {'name': nom, 'expression': expression}


def ev(x):
    return '{{eval:' + x + '}}'


def col(x, k=0):
    return '\\textcolor{{{color:primary.' + str(k) + '}}}{' + x + '}'


def choix(lignes):
    return '\n\n```choix\n' + ''.join('- ' + l + '\n' for l in lignes) + '```'


def case(statement, variables, attendu, steps):
    """Variation à une case ouverte (`?` dans une formule de l'énoncé)."""
    return {'statement': statement, 'variables': variables,
            'blanks': [attendu if isinstance(attendu, dict) else {'expectedAnswer': attendu}],
            'correction': {'steps': steps}}


def justification(statement, variables, bonne, autres, steps):
    """Variation à une case choix : la première proposition est la bonne (index 0)."""
    return {'statement': statement + choix([bonne] + autres), 'variables': variables,
            'blanks': [{'expectedAnswer': '0'}], 'correction': {'steps': steps}}


def specs_choix(vi, juste, erreurs, variables=None):
    out = [spec(juste, vi, '0', 'correct', variables)]
    for k, erreur in enumerate(erreurs, start=1):
        out.append(spec('Erreur : ' + erreur, vi, str(k), 'incorrect', variables))
    return out


MODELES = []

# --- 1. 1SPE-275 : y = f(a) + f′(a)(x − a) ------------------------------------------------------

V_TANGENTE = [var('a', '1..6'), var('b', '1..9'), var('m', '2..6')]
INTRO_275 = ('Soit $f$ une fonction dérivable en $a=' + ev('a') + '$, avec $f(' + ev('a') + ')='
             + ev('b') + '$ et $f\'(' + ev('a') + ')=' + ev('m') + '$. On note $A$ le point de sa'
             ' courbe d\'abscisse $' + ev('a') + '$ : $A(' + ev('a') + '\\,;\\,' + ev('b')
             + ')$. On cherche une équation de la tangente $T$ à la courbe en $A$.\n\n')

V275_PENTE = justification(
    INTRO_275 + 'La tangente $T$ a pour coefficient directeur $' + ev('m') + '$. Pourquoi ?',
    V_TANGENTE,
    'Par définition, la tangente en $A$ est la droite qui passe par $A$ et dont le coefficient'
    ' directeur est le nombre dérivé $f\'(' + ev('a') + ')$.',
    ['Car $T$ passe par l\'origine du repère.',
     'Car toute droite qui passe par $A$ a ce coefficient directeur.',
     'Car $f(' + ev('a') + ')=' + ev('b') + '$.'],
    ['Le nombre dérivé $f\'(' + ev('a') + ')$ est ' + '**par définition**' + ' le coefficient'
     ' directeur de la tangente en $A$ : ici $' + col(ev('m')) + '$.',
     'Une infinité de droites passent par $A$ ; la tangente est celle de coefficient directeur'
     ' $f\'(' + ev('a') + ')$.',
     '$f(' + ev('a') + ')=' + ev('b') + '$ donne l\'ordonnée de $A$, pas le coefficient'
     ' directeur.'])
V275_ORDONNEE = case(
    INTRO_275 + 'Le coefficient directeur de $T$ est $f\'(' + ev('a') + ')=' + ev('m') + '$ :'
    ' $T$ a une équation de la forme $y=' + ev('m') + 'x+p$. Comme $A$ est sur $T$, ses'
    ' coordonnées vérifient cette équation. Complète.\n\n$p=?$',
    V_TANGENTE, ev('b-m*a'),
    ['$A(' + ev('a') + '\\,;\\,' + ev('b') + ')$ est sur $T$ : $' + ev('b') + '=' + ev('m')
     + '\\times' + ev('a') + '+p$.',
     'Donc $p=' + ev('b') + '-' + ev('m*a') + '=' + col(ev('b-m*a')) + '$, et $T$ a pour'
     ' équation $y=' + ev('m') + 'x+(' + ev('b-m*a') + ')$.'])
V275_FORME = case(
    'Soit $f$ une fonction dérivable en un réel $a$, et $A(a\\,;\\,f(a))$ le point de sa courbe'
    ' d\'abscisse $a$. La tangente en $A$ a pour coefficient directeur $f\'(a)$ : elle a une'
    ' équation de la forme $y=f\'(a)x+p$.\n\n'
    'Comme $A$ est sur la tangente, $f(a)=f\'(a)\\times a+p$, donc $p=f(a)-f\'(a)\\times a$.'
    ' On remplace $p$, puis on factorise par $f\'(a)$. Complète.\n\n'
    '$y=f\'(a)x+f(a)-f\'(a)\\times a=f(a)+f\'(a)\\times(?)$',
    [], 'x-a',
    ['$f\'(a)x-f\'(a)\\times a=f\'(a)\\times(x-a)$ : on met $f\'(a)$ en facteur.',
     'Donc $y=f(a)+f\'(a)(' + col('x-a') + ')$.'])

VARS_275 = {'a': 2, 'b': 5, 'm': 3}
MODELES.append(modele(
    '01-demontrer-equation-tangente', 'Démontrer l\'équation de la tangente',
    'Démonstration à trous de y = f(a) + f′(a)(x − a) : justification du coefficient directeur'
    ' f′(a), ordonnée à l\'origine par le point A (valeurs tirées), factorisation par f′(a)',
    4,
    [V275_PENTE, V275_ORDONNEE, V275_FORME],
    specs_choix(0, 'définition de la tangente', ['origine', 'toute droite par A', 'f(a)'],
                VARS_275)
    + [spec('−1', 1, '-1', 'correct', VARS_275),
       spec('Erreur : 11 (5 + 3 × 2)', 1, '11', 'incorrect', VARS_275),
       spec('Erreur : 5 (f(a))', 1, '5', 'incorrect', VARS_275),
       spec('Erreur : 1 (5 − 2 × 2)', 1, '1', 'incorrect', VARS_275),
       spec('x − a', 2, 'x-a', 'correct'),
       spec('Erreur : a − x', 2, 'a-x', 'incorrect'),
       spec('Erreur : x + a', 2, 'x+a', 'incorrect'),
       spec('Erreur : x', 2, 'x', 'incorrect')]))

# --- 2. 1SPE-276 : √ n'est pas dérivable en 0 ---------------------------------------------------

INTRO_276 = ('Soit $f$ la fonction racine carrée, définie sur $[0\\,;+\\infty[$ par'
             ' $f(x)=\\sqrt{x}$. On étudie son taux de variation entre $0$ et $h$, pour $h>0$.\n\n')
TAUX_276 = ('$$\\dfrac{f(h)-f(0)}{h}=\\dfrac{\\sqrt{h}-0}{h}=\\dfrac{\\sqrt{h}}{h}'
            '=\\dfrac{1}{\\sqrt{h}}$$\n\n')

V276_TAUX = case(
    INTRO_276 + 'Pour $h>0$, $h=\\sqrt{h}\\times\\sqrt{h}$. Complète.\n\n'
    '$\\dfrac{f(h)-f(0)}{h}=\\dfrac{\\sqrt{h}}{h}=?$',
    [], {'expectedAnswer': '\\frac{1}{\\sqrt{h}}', 'requiredForm': {'pattern': 'u'}},
    ['$f(0)=\\sqrt{0}=0$, donc le taux vaut $\\dfrac{\\sqrt{h}}{h}$.',
     'On simplifie par $\\sqrt{h}$ : $\\dfrac{\\sqrt{h}}{\\sqrt{h}\\times\\sqrt{h}}='
     + col('\\dfrac{1}{\\sqrt{h}}') + '$.'])
V276_VALEUR = case(
    INTRO_276 + 'Pour $h>0$, ce taux vaut $\\dfrac{1}{\\sqrt{h}}$. Complète, pour $h='
    + ev('1/10^(2*p);d') + '$.\n\n$\\dfrac{f(h)-f(0)}{h}=?$',
    [var('p', '1..3')], ev('10^p'),
    ['$\\sqrt{' + ev('1/10^(2*p);d') + '}=' + ev('1/10^p;d') + '$.',
     'Donc le taux vaut $\\dfrac{1}{' + ev('1/10^p;d') + '}=' + col(ev('10^p')) + '$.',
     'Plus $h$ est proche de $0$, plus le taux est grand.'])
V276_CONCLUSION = justification(
    INTRO_276 + TAUX_276 + 'Que peut-on en conclure ?',
    [],
    'Quand $h$ tend vers $0$, $\\dfrac{1}{\\sqrt{h}}$ devient aussi grand qu\'on veut : le taux'
    ' n\'a pas de limite finie, donc $f$ n\'est pas dérivable en $0$.',
    ['Quand $h$ tend vers $0$, le taux tend vers $0$, donc $f\'(0)=0$.',
     '$f$ n\'est pas dérivable en $0$ car $f$ n\'est pas définie en $0$.',
     'Le taux tend vers $1$, donc $f\'(0)=1$.'],
    ['Pour $h=0{,}01$, le taux vaut $10$ ; pour $h=0{,}0001$, il vaut $100$ : il'
     ' ' + '**grandit sans limite**' + ' quand $h$ se rapproche de $0$.',
     'Être dérivable en $0$, c\'est avoir un taux qui tend vers un nombre réel : ce n\'est pas'
     ' le cas ici.',
     '$f$ est bien définie en $0$ : $f(0)=\\sqrt{0}=0$.'])

MODELES.append(modele(
    '02-demontrer-racine-non-derivable-en-0', 'Démontrer que la racine carrée n\'est pas dérivable en 0',
    'Démonstration à trous : taux de variation de √ entre 0 et h égal à 1/√h, sa valeur pour'
    ' h = 0,01, 0,0001 ou 0,000001 (tirée), conclusion (taux non borné)',
    3,
    [V276_TAUX, V276_VALEUR, V276_CONCLUSION],
    [spec('1/√h', 0, '\\frac{1}{\\sqrt{h}}', 'correct'),
     spec('Écriture √h/h', 0, '\\frac{\\sqrt{h}}{h}', 'correct'),
     spec('Erreur : √h', 0, '\\sqrt{h}', 'incorrect'),
     spec('Erreur : 1/h', 0, '\\frac{1}{h}', 'incorrect'),
     spec('Erreur : 1/(2√h)', 0, '\\frac{1}{2\\sqrt{h}}', 'incorrect'),
     spec('10 (h = 0,01)', 1, '10', 'correct', {'p': 1}),
     spec('Erreur : 0,1 (√h)', 1, '0.1', 'incorrect', {'p': 1}),
     spec('Erreur : 100 (1/h)', 1, '100', 'incorrect', {'p': 1}),
     spec('1000 (h = 0,000001)', 1, '1000', 'correct', {'p': 3})]
    + specs_choix(2, 'taux non borné', ['tend vers 0', 'non définie en 0', 'tend vers 1'])))

# --- 3. 1SPE-277 : (x²)′ = 2x -------------------------------------------------------------------

INTRO_277 = ('Soit $f$ la fonction carré, définie sur $\\mathbb{R}$ par $f(x)=x^2$, et $a$ un'
             ' réel. Pour $h\\neq 0$, on calcule le taux de variation de $f$ entre $a$ et'
             ' $a+h$ :\n\n$$\\dfrac{f(a+h)-f(a)}{h}=\\dfrac{(a+h)^2-a^2}{h}$$\n\n')

V277_DEVELOPPE = case(
    INTRO_277 + 'On développe $(a+h)^2$, puis on réduit. Complète par une expression développée.'
    '\n\n$(a+h)^2-a^2=?$',
    [], {'expectedAnswer': '2ah+h^2', 'requiredForm': {'pattern': 'u'}},
    ['$(a+h)^2=a^2+2ah+h^2$ (identité remarquable).',
     'Donc $(a+h)^2-a^2=' + col('2ah+h^2') + '$ : les $a^2$ se compensent.'])
V277_TAUX = case(
    INTRO_277 + 'Comme $(a+h)^2-a^2=2ah+h^2$, on simplifie par $h$. Complète.\n\n'
    '$\\dfrac{f(a+h)-f(a)}{h}=\\dfrac{2ah+h^2}{h}=?$',
    [], {'expectedAnswer': '2a+h', 'requiredForm': {'pattern': 'u'}},
    ['$2ah+h^2=h(2a+h)$ : on met $h$ en facteur.',
     'Comme $h\\neq 0$, on simplifie : le taux vaut $' + col('2a+h') + '$.'])
V277_LIMITE = justification(
    INTRO_277 + 'Ce taux vaut $2a+h$. On en déduit que $f$ est dérivable en $a$, avec'
    ' $f\'(a)=2a$. Pourquoi ?',
    [],
    'Car quand $h$ tend vers $0$, $2a+h$ tend vers $2a$.',
    ['Car $2a+h=2a$ pour tout réel $h$.',
     'Car on remplace $h$ par $0$ dans $\\dfrac{(a+h)^2-a^2}{h}$.',
     'Car $f(a)=a^2$, et on multiplie par $2$.'],
    ['Le nombre dérivé est la limite du taux quand $h$ tend vers $0$.',
     'Ici le taux vaut $2a+h$, qui tend vers $' + col('2a') + '$ : $f\'(a)=2a$.',
     'On ne peut pas remplacer $h$ par $0$ dans $\\dfrac{(a+h)^2-a^2}{h}$ : on diviserait par'
     ' $0$. C\'est pour cela qu\'on simplifie d\'abord.'])

MODELES.append(modele(
    '03-demontrer-derivee-carre', 'Démontrer la dérivée de la fonction carré',
    'Démonstration à trous de (x²)′ = 2x par le taux de variation entre a et a + h :'
    ' (a + h)² − a² à développer, taux 2a + h, justification de la limite',
    1,
    [V277_DEVELOPPE, V277_TAUX, V277_LIMITE],
    [spec('2ah + h²', 0, '2ah+h^2', 'correct'),
     spec('Écriture h² + 2ah', 0, 'h^2+2ah', 'correct'),
     spec('Erreur : h²', 0, 'h^2', 'incorrect'),
     spec('Erreur : 2ah', 0, '2ah', 'incorrect'),
     spec('Erreur : 2a + h (taux au lieu de la différence)', 0, '2a+h', 'incorrect'),
     spec('2a + h', 1, '2a+h', 'correct'),
     spec('Erreur : 2a (limite au lieu du taux)', 1, '2a', 'incorrect'),
     spec('Erreur : 2ah + h', 1, '2ah+h', 'incorrect'),
     spec('Erreur : a + h', 1, 'a+h', 'incorrect')]
    + specs_choix(2, 'limite de 2a + h', ['égalité pour tout h', 'h remplacé par 0',
                                           'f(a) multiplié par 2'])))

# --- 4. 1SPE-398 : (1/x)′ = −1/x² ---------------------------------------------------------------

INTRO_398 = ('Soit $f$ la fonction inverse, définie sur $]-\\infty\\,;0[\\,\\cup\\,]0\\,;+\\infty[$'
             ' par $f(x)=\\dfrac{1}{x}$, et $a$ un réel non nul. Pour $h\\neq 0$ tel que'
             ' $a+h\\neq 0$, on calcule le taux de variation de $f$ entre $a$ et $a+h$.\n\n')

V398_DIFFERENCE = case(
    INTRO_398 + 'On réduit au même dénominateur. Complète.\n\n'
    '$f(a+h)-f(a)=\\dfrac{1}{a+h}-\\dfrac{1}{a}=\\dfrac{?}{a(a+h)}$',
    [], '-h',
    ['$\\dfrac{1}{a+h}=\\dfrac{a}{a(a+h)}$ et $\\dfrac{1}{a}=\\dfrac{a+h}{a(a+h)}$.',
     'Le numérateur vaut $a-(a+h)=' + col('-h') + '$.'])
V398_TAUX = case(
    INTRO_398 + 'Comme $f(a+h)-f(a)=\\dfrac{-h}{a(a+h)}$, on divise par $h$. Complète.\n\n'
    '$\\dfrac{f(a+h)-f(a)}{h}=?$',
    [], {'expectedAnswer': '-\\frac{1}{a(a+h)}', 'requiredForm': {'pattern': 'u'}},
    ['Diviser par $h$, c\'est multiplier par $\\dfrac{1}{h}$ :'
     ' $\\dfrac{-h}{a(a+h)}\\times\\dfrac{1}{h}$.',
     'Comme $h\\neq 0$, on simplifie par $h$ : le taux vaut $' + col('-\\dfrac{1}{a(a+h)}')
     + '$.'])
V398_LIMITE = case(
    INTRO_398 + 'Le taux vaut $-\\dfrac{1}{a(a+h)}$. Quand $h$ tend vers $0$, $a(a+h)$ tend'
    ' vers $a\\times a$. Complète.\n\n$f\'(a)=?$',
    [], {'expectedAnswer': '-\\frac{1}{a^2}', 'requiredForm': {'pattern': 'u'}},
    ['Quand $h$ tend vers $0$, $a+h$ tend vers $a$, donc $a(a+h)$ tend vers $a^2$, qui n\'est'
     ' pas nul.',
     'Le taux tend donc vers $' + col('-\\dfrac{1}{a^2}') + '$ : $f$ est dérivable en $a$ et'
     ' $f\'(a)=-\\dfrac{1}{a^2}$.'])

MODELES.append(modele(
    '04-demontrer-derivee-inverse', 'Démontrer la dérivée de la fonction inverse',
    'Démonstration à trous de (1/x)′ = −1/x² par le taux de variation entre a et a + h :'
    ' numérateur −h, taux −1/(a(a + h)), limite −1/a²',
    2,
    [V398_DIFFERENCE, V398_TAUX, V398_LIMITE],
    [spec('−h', 0, '-h', 'correct'),
     spec('Erreur : h (soustraction inversée)', 0, 'h', 'incorrect'),
     spec('Erreur : 1', 0, '1', 'incorrect'),
     spec('Erreur : −1', 0, '-1', 'incorrect'),
     spec('−1/(a(a + h))', 1, '-\\frac{1}{a(a+h)}', 'correct'),
     spec('Forme (−1)/(a(a + h)) : signe à sortir', 1, '\\frac{-1}{a(a+h)}', 'unoptimal_form'),
     spec('Écriture −1/(a² + ah)', 1, '-\\frac{1}{a^2+ah}', 'correct'),
     spec('Erreur : −1/(a(2a + h))', 1, '-\\frac{1}{a(2a+h)}', 'incorrect'),
     spec('Erreur : 1/(a(a + h))', 1, '\\frac{1}{a(a+h)}', 'incorrect'),
     spec('Erreur : −h/(a(a + h)) (pas divisé)', 1, '\\frac{-h}{a(a+h)}', 'incorrect'),
     spec('Erreur : −1/a² (limite au lieu du taux)', 1, '-\\frac{1}{a^2}', 'incorrect'),
     spec('−1/a²', 2, '-\\frac{1}{a^2}', 'correct'),
     spec('Forme (−1)/a² : signe à sortir', 2, '\\frac{-1}{a^2}', 'unoptimal_form'),
     spec('Erreur : 1/a²', 2, '\\frac{1}{a^2}', 'incorrect'),
     spec('Erreur : −1/a', 2, '-\\frac{1}{a}', 'incorrect'),
     spec('Erreur : −1/(2a)', 2, '-\\frac{1}{2a}', 'incorrect')]))

# --- 5. 1SPE-278 : (uv)′ = u′v + uv′ ------------------------------------------------------------

INTRO_278 = ('Soit $u$ et $v$ deux fonctions dérivables en un réel $a$. Pour $h\\neq 0$, on étudie'
             ' le taux de variation du produit $uv$ entre $a$ et $a+h$ :\n\n'
             '$$\\dfrac{u(a+h)v(a+h)-u(a)v(a)}{h}$$\n\n')
DECOMPOSE_278 = ('On ajoute et on retranche $u(a)v(a+h)$ au numérateur, ce qui donne\n\n'
                 '$$\\dfrac{u(a+h)-u(a)}{h}\\times v(a+h)+u(a)\\times\\dfrac{v(a+h)-v(a)}{h}$$\n\n'
                 'On admet que $v(a+h)$ tend vers $v(a)$ quand $h$ tend vers $0$.\n\n')

V278_ASTUCE = justification(
    INTRO_278 + 'Pour faire apparaître les taux de variation de $u$ et de $v$, on ajoute et on'
    ' retranche un même terme au numérateur. Lequel ?',
    [],
    '$u(a)v(a+h)$',
    ['$u(a)v(a)$', '$u(a+h)+v(a+h)$', '$u\'(a)v\'(a)$'],
    ['$u(a+h)v(a+h)-' + col('u(a)v(a+h)') + '=(u(a+h)-u(a))v(a+h)$ fait apparaître le'
     ' taux de $u$.',
     '$' + col('u(a)v(a+h)') + '-u(a)v(a)=u(a)(v(a+h)-v(a))$ fait apparaître le taux'
     ' de $v$.',
     'Ajouter et retrancher $u(a)v(a)$ ne change rien : le numérateur reste le même.'])
V278_PREMIER = justification(
    INTRO_278 + DECOMPOSE_278 + 'Quand $h$ tend vers $0$, vers quoi tend le premier terme'
    ' $\\dfrac{u(a+h)-u(a)}{h}\\times v(a+h)$ ?',
    [],
    '$u\'(a)v(a)$',
    ['$u\'(a)v\'(a)$', '$u(a)v(a)$', '$u\'(a)$'],
    ['$\\dfrac{u(a+h)-u(a)}{h}$ est le taux de variation de $u$ : il tend vers $u\'(a)$.',
     '$v(a+h)$ tend vers $v(a)$ (admis).',
     'Le produit tend donc vers $' + col('u\'(a)v(a)') + '$.'])
V_PRODUIT = [var('u', '1..6'), var('p', '2..5'), var('v', '1..6'), var('q', '2..5')]
V278_VALEUR = case(
    INTRO_278 + DECOMPOSE_278 + 'On prend $u(a)=' + ev('u') + '$, $u\'(a)=' + ev('p')
    + '$, $v(a)=' + ev('v') + '$ et $v\'(a)=' + ev('q') + '$. Complète.\n\n'
    'Quand $h$ tend vers $0$, le taux de variation de $uv$ tend vers $?$',
    V_PRODUIT, ev('p*v+u*q'),
    ['Le premier terme tend vers $u\'(a)v(a)=' + ev('p') + '\\times' + ev('v') + '=' + ev('p*v')
     + '$.',
     'Le second terme tend vers $u(a)v\'(a)=' + ev('u') + '\\times' + ev('q') + '=' + ev('u*q')
     + '$.',
     'Le taux tend donc vers $' + ev('p*v') + '+' + ev('u*q') + '=' + col(ev('p*v+u*q'))
     + '$ : $(uv)\'(a)=u\'(a)v(a)+u(a)v\'(a)$, et non $u\'(a)v\'(a)$.'])

VARS_278 = {'u': 3, 'p': 2, 'v': 5, 'q': 4}
MODELES.append(modele(
    '05-demontrer-derivee-produit', 'Démontrer la dérivée d\'un produit',
    'Démonstration à trous de (uv)′ = u′v + uv′ (taux de variation de uv) : terme ajouté et'
    ' retranché, limite du premier terme, limite du taux avec des valeurs tirées',
    5,
    [V278_ASTUCE, V278_PREMIER, V278_VALEUR],
    specs_choix(0, 'u(a)v(a + h)', ['u(a)v(a)', 'somme', 'u′(a)v′(a)'])
    + specs_choix(1, 'u′(a)v(a)', ['u′(a)v′(a)', 'u(a)v(a)', 'u′(a)'])
    + [spec('22 (2 × 5 + 3 × 4)', 2, '22', 'correct', VARS_278),
       spec('Erreur : 8 (u′v′)', 2, '8', 'incorrect', VARS_278),
       spec('Erreur : 10 (u′v seulement)', 2, '10', 'incorrect', VARS_278),
       spec('Erreur : 15 (uv)', 2, '15', 'incorrect', VARS_278)]))

os.makedirs(DOSSIER, exist_ok=True)
for nom, m in MODELES:
    with open(os.path.join(DOSSIER, nom + '.json'), 'w', encoding='utf-8') as f:
        json.dump(m, f, ensure_ascii=False, indent='\t')
        f.write('\n')
# Mis en forme comme le pre-commit, pour que le script redonne les fichiers commités
subprocess.run(['pnpm', 'exec', 'prettier', '--write', DOSSIER], check=True,
               stdout=subprocess.DEVNULL)
print(f'{len(MODELES)} modèles écrits dans {DOSSIER}')
