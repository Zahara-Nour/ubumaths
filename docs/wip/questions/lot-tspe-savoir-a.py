"""Écrit les 11 modèles du sous-lot 8a « à savoir » (suites, limites, convexité, continuité,
logarithme) de la terminale spécialité dans scripts/questions/tspe-8a-savoir/.

Phase 0 validée par David le 2026-11-02 (« je valide » sur les recos, D-L8 du journal
« docs/archive/wip/questions-tspe-restes-progress.md »), un point par modèle :

| #  | Point    | Fait                                             | Domaine › À savoir, niveau          |
| 1  | TSPE-381 | comparaison de suites                            | Limites de suites, 1                |
| 2  | TSPE-570 | théorème des gendarmes                           | Limites de suites, 2                |
| 3  | TSPE-400 | comparaison et encadrement de fonctions          | Limites de fonctions, 1             |
| 4  | TSPE-401 | opérations sur les limites, formes indéterminées | Limites de fonctions, 2             |
| 5  | TSPE-410 | convexe ⟺ courbe sous ses sécantes               | Convexité, 1                        |
| 6  | TSPE-411 | convexe ⟺ courbe au-dessus de ses tangentes      | Convexité, 2                        |
| 7  | TSPE-585 | convexe ⟺ f′ croissante                          | Convexité, 3                        |
| 8  | TSPE-428 | théorème des valeurs intermédiaires              | Continuité, 1                       |
| 9  | TSPE-429 | cas strictement monotone : solution unique       | Continuité, 2                       |
| 10 | TSPE-439 | propriétés algébriques du logarithme             | Fonction logarithme, 1              |
| 11 | TSPE-440 | dérivée du logarithme                            | Fonction logarithme, 2              |

Sous-domaine « À savoir » neuf dans chaque domaine (relevé prod du 2026-11-02 : aucun en T_SPE).
Thèmes repris des voisins en prod : « Suites », « Fonctions », « Fonctions convexes » (Convexité).
Case choix à 4 propositions (la première est la bonne, l'affichage les mélange), erreurs typiques
en distracteurs, deux sens de lecture ou un piège d'hypothèse. Pas de `cleanCoefficients` (aucune
variable).

    python3 docs/wip/questions/lot-tspe-savoir-a.py scripts/questions/tspe-8a-savoir
"""
import json
import os
import subprocess
import sys

DOSSIER = sys.argv[1]


def spec(desc, vi, answer, status):
    return {'description': desc, 'variationIndex': vi, 'variables': {},
            'answers': [answer], 'expected': {'status': status}}


def modele(nom, title, description, theme, domain, level, variations, libelles):
    assert len(libelles) == len(variations)
    specs = []
    for vi, (juste, erreurs) in enumerate(libelles):
        assert len(erreurs) == 3
        specs.append(spec(juste, vi, '0', 'correct'))
        for k, erreur in enumerate(erreurs, start=1):
            specs.append(spec('Erreur : ' + erreur, vi, str(k), 'incorrect'))
    return nom, {'title': title, 'description': description, 'grades': ['T_SPE'],
                 'theme': theme, 'domain': domain, 'subdomain': 'À savoir', 'level': level,
                 'delay': 30, 'status': 'draft', 'shared': {},
                 'variations': variations, 'testSpecs': specs}


def col(x):
    return '\\textcolor{{{color:primary.0}}}{' + x + '}'


def choix(lignes):
    return '\n\n```choix\n' + ''.join('- ' + l + '\n' for l in lignes) + '```'


def qcm(statement, bonne, autres, steps):
    """Variation sans variable : la première proposition est la bonne (index 0)."""
    assert len(autres) == 3
    return {'statement': statement + choix([bonne] + autres), 'variables': [],
            'blanks': [{'expectedAnswer': '0'}], 'correction': {'steps': steps}}


MODELES = []
RIEN = 'On ne peut rien conclure.'

# --- 1. TSPE-381 : théorèmes de comparaison (suites) --------------------------------------------

V381_PLUS = qcm(
    'Soit $(u_n)$ et $(v_n)$ deux suites telles que, à partir d\'un certain rang,'
    ' $u_n\\leqslant v_n$.\n\nOn sait que $\\lim\\limits_{n\\to+\\infty}u_n=+\\infty$. Alors :',
    '$\\lim\\limits_{n\\to+\\infty}v_n=+\\infty$',
    ['$\\lim\\limits_{n\\to+\\infty}v_n=-\\infty$', '$(v_n)$ converge', RIEN],
    ['À connaître (théorème de comparaison) : si, à partir d\'un certain rang, $u_n\\leqslant v_n$'
     ' et si $\\lim\\limits_{n\\to+\\infty}u_n=+\\infty$, alors $'
     + col('\\lim\\limits_{n\\to+\\infty}v_n=+\\infty') + '$.',
     'La suite $(v_n)$, plus grande que $(u_n)$, est « poussée » vers $+\\infty$.'])
V381_MOINS = qcm(
    'Soit $(u_n)$ et $(v_n)$ deux suites telles que, à partir d\'un certain rang,'
    ' $u_n\\leqslant v_n$.\n\nOn sait que $\\lim\\limits_{n\\to+\\infty}v_n=-\\infty$. Alors :',
    '$\\lim\\limits_{n\\to+\\infty}u_n=-\\infty$',
    ['$\\lim\\limits_{n\\to+\\infty}u_n=+\\infty$', '$(u_n)$ converge', RIEN],
    ['À connaître (théorème de comparaison) : si, à partir d\'un certain rang, $u_n\\leqslant v_n$'
     ' et si $\\lim\\limits_{n\\to+\\infty}v_n=-\\infty$, alors $'
     + col('\\lim\\limits_{n\\to+\\infty}u_n=-\\infty') + '$.',
     'La suite $(u_n)$, plus petite que $(v_n)$, est entraînée vers $-\\infty$.'])
V381_PIEGE = qcm(
    'Soit $(u_n)$ et $(v_n)$ deux suites telles que, à partir d\'un certain rang,'
    ' $u_n\\leqslant v_n$.\n\nOn sait que $\\lim\\limits_{n\\to+\\infty}u_n=-\\infty$.'
    ' Que peut-on dire de la limite de $(v_n)$ ?',
    RIEN,
    ['$\\lim\\limits_{n\\to+\\infty}v_n=-\\infty$', '$\\lim\\limits_{n\\to+\\infty}v_n=+\\infty$',
     '$(v_n)$ converge'],
    ['À connaître : le théorème de comparaison pousse la plus GRANDE suite vers $+\\infty$, ou la'
     ' plus PETITE vers $-\\infty$.',
     'Ici, c\'est la plus petite, $(u_n)$, qui tend vers $-\\infty$ : cela ne dit rien de $(v_n)$.'
     ' Par exemple $u_n=-n$ et $v_n=1$, ou $u_n=-n$ et $v_n=n$. Donc ' + '$' + col('\\text{on ne'
     ' peut rien conclure}') + '$.'])

MODELES.append(modele(
    '01-comparaison-de-suites', 'Théorèmes de comparaison pour les suites',
    'À savoir : uₙ ≤ vₙ et uₙ → +∞ ⟹ vₙ → +∞ ; vₙ → −∞ ⟹ uₙ → −∞ ; piège : uₙ → −∞ ne dit rien'
    ' de vₙ',
    'Suites', 'Limites de suites', 1,
    [V381_PLUS, V381_MOINS, V381_PIEGE],
    [('vₙ → +∞', ['−∞', 'converge', 'rien']),
     ('uₙ → −∞', ['+∞', 'converge', 'rien']),
     ('rien', ['−∞ (sens inversé)', '+∞', 'converge'])]))

# --- 2. TSPE-570 : théorème des gendarmes -------------------------------------------------------

V570_CONCLUSION = qcm(
    'Soit $(u_n)$, $(v_n)$ et $(w_n)$ trois suites telles que, à partir d\'un certain rang,'
    ' $u_n\\leqslant w_n\\leqslant v_n$.\n\nOn sait que $(u_n)$ et $(v_n)$ convergent toutes les'
    ' deux vers le même réel $\\ell$. Alors :',
    '$(w_n)$ converge vers $\\ell$',
    ['$(w_n)$ converge, mais pas forcément vers $\\ell$', '$(w_n)$ est constante, égale à $\\ell$',
     RIEN],
    ['À connaître (théorème des gendarmes) : si, à partir d\'un certain rang,'
     ' $u_n\\leqslant w_n\\leqslant v_n$ et si $(u_n)$ et $(v_n)$ convergent vers la même limite'
     ' $\\ell$, alors $' + col('(w_n)\\text{ converge vers }\\ell') + '$.',
     'Le théorème donne à la fois la convergence de $(w_n)$ et sa limite.'])
V570_HYPOTHESE = qcm(
    'Soit $(u_n)$, $(v_n)$ et $(w_n)$ trois suites telles que, pour tout entier naturel $n$,'
    ' $u_n\\leqslant w_n\\leqslant v_n$.\n\nQuelle information permet de conclure que $(w_n)$'
    ' converge vers $3$ ?',
    '$\\lim\\limits_{n\\to+\\infty}u_n=3$ et $\\lim\\limits_{n\\to+\\infty}v_n=3$',
    ['$\\lim\\limits_{n\\to+\\infty}u_n=3$ seulement', '$\\lim\\limits_{n\\to+\\infty}v_n=3$ seulement',
     '$(u_n)$ et $(v_n)$ convergent'],
    ['À connaître : le théorème des gendarmes demande que les DEUX suites qui encadrent convergent'
     ' vers la MÊME limite.',
     'Il faut donc $' + col('\\lim\\limits_{n\\to+\\infty}u_n=3\\text{ et }'
                           '\\lim\\limits_{n\\to+\\infty}v_n=3') + '$.',
     'Une seule des deux ne suffit pas, et deux limites différentes non plus : avec $u_n=0$ et'
     ' $v_n=3$, $(w_n)$ peut ne pas converger.'])

MODELES.append(modele(
    '02-theoreme-des-gendarmes', 'Théorème des gendarmes',
    'À savoir : uₙ ≤ wₙ ≤ vₙ, uₙ et vₙ → ℓ ⟹ wₙ → ℓ ; hypothèse : les deux suites, même limite',
    'Suites', 'Limites de suites', 2,
    [V570_CONCLUSION, V570_HYPOTHESE],
    [('converge vers ℓ', ['pas forcément vers ℓ', 'constante', 'rien']),
     ('les deux vers 3', ['u seule', 'v seule', 'convergent, limites quelconques'])]))

# --- 3. TSPE-400 : comparaison et encadrement (fonctions) ---------------------------------------

V400_COMPARAISON = qcm(
    'Soit $f$ et $g$ deux fonctions définies sur un intervalle $[a\\,;+\\infty[$ telles que, pour'
    ' tout $x\\geqslant a$, $f(x)\\geqslant g(x)$.\n\nOn sait que'
    ' $\\lim\\limits_{x\\to+\\infty}g(x)=+\\infty$. Alors :',
    '$\\lim\\limits_{x\\to+\\infty}f(x)=+\\infty$',
    ['$\\lim\\limits_{x\\to+\\infty}f(x)=-\\infty$', '$f$ a une limite finie en $+\\infty$', RIEN],
    ['À connaître (théorème de comparaison) : si $f(x)\\geqslant g(x)$ pour $x$ assez grand et si'
     ' $\\lim\\limits_{x\\to+\\infty}g(x)=+\\infty$, alors $'
     + col('\\lim\\limits_{x\\to+\\infty}f(x)=+\\infty') + '$.'])
V400_ENCADREMENT = qcm(
    'Soit $f$, $g$ et $h$ trois fonctions définies sur un intervalle $[a\\,;+\\infty[$ telles que,'
    ' pour tout $x\\geqslant a$, $g(x)\\leqslant f(x)\\leqslant h(x)$.\n\nOn sait que'
    ' $\\lim\\limits_{x\\to+\\infty}g(x)=2$ et $\\lim\\limits_{x\\to+\\infty}h(x)=2$. Alors :',
    '$\\lim\\limits_{x\\to+\\infty}f(x)=2$',
    ['$f$ a une limite finie en $+\\infty$, mais pas forcément $2$',
     '$\\lim\\limits_{x\\to+\\infty}f(x)=4$', RIEN],
    ['À connaître (théorème d\'encadrement, ou « des gendarmes ») : si'
     ' $g(x)\\leqslant f(x)\\leqslant h(x)$ pour $x$ assez grand, et si $g$ et $h$ ont la même'
     ' limite finie $\\ell$ en $+\\infty$, alors $f$ a aussi pour limite $\\ell$.',
     'Ici $\\ell=2$, donc $' + col('\\lim\\limits_{x\\to+\\infty}f(x)=2') + '$.'])
V400_PIEGE = qcm(
    'Soit $f$ et $g$ deux fonctions définies sur un intervalle $[a\\,;+\\infty[$ telles que, pour'
    ' tout $x\\geqslant a$, $f(x)\\leqslant g(x)$.\n\nOn sait que'
    ' $\\lim\\limits_{x\\to+\\infty}g(x)=+\\infty$. Que peut-on dire de la limite de $f$ en'
    ' $+\\infty$ ?',
    RIEN,
    ['$\\lim\\limits_{x\\to+\\infty}f(x)=+\\infty$', '$\\lim\\limits_{x\\to+\\infty}f(x)=-\\infty$',
     '$f$ a une limite finie en $+\\infty$'],
    ['À connaître : la comparaison pousse vers $+\\infty$ la fonction la plus GRANDE.',
     'Ici, c\'est la plus grande, $g$, qui tend vers $+\\infty$ : cela ne dit rien de $f$. Par'
     ' exemple $g(x)=x$ avec $f(x)=1$, ou avec $f(x)=-x$. Donc $' + col('\\text{on ne peut rien'
     ' conclure}') + '$.'])

MODELES.append(modele(
    '03-comparaison-encadrement-fonctions', 'Comparaison et encadrement pour les fonctions',
    'À savoir : f ≥ g et g → +∞ ⟹ f → +∞ ; encadrement g ≤ f ≤ h, même limite ; piège : f ≤ g'
    ' et g → +∞ ne dit rien de f',
    'Fonctions', 'Limites de fonctions', 1,
    [V400_COMPARAISON, V400_ENCADREMENT, V400_PIEGE],
    [('f → +∞', ['−∞', 'limite finie', 'rien']),
     ('f → 2', ['limite finie quelconque', 'somme 4', 'rien']),
     ('rien', ['+∞ (sens inversé)', '−∞', 'limite finie'])]))

# --- 4. TSPE-401 : opérations sur les limites ---------------------------------------------------

FI = 'C\'est une forme indéterminée : on ne peut pas conclure sans transformer l\'écriture.'

V401_RECONNAITRE = qcm(
    'Soit $f$ et $g$ deux fonctions. Dans laquelle de ces situations, en $+\\infty$, obtient-on'
    ' une **forme indéterminée** ?',
    '$f$ tend vers $+\\infty$, $g$ tend vers $-\\infty$, et l\'on cherche la limite de $f+g$',
    ['$f$ et $g$ tendent vers $+\\infty$, et l\'on cherche la limite de $f+g$',
     '$f$ tend vers $+\\infty$, $g$ tend vers $3$, et l\'on cherche la limite de $f\\times g$',
     '$f$ tend vers $2$, $g$ tend vers $+\\infty$, et l\'on cherche la limite de'
     ' $\\dfrac{f}{g}$'],
    ['À connaître : les formes indéterminées sont « $\\infty-\\infty$ », « $0\\times\\infty$ »,'
     ' « $\\dfrac{\\infty}{\\infty}$ » et « $\\dfrac{0}{0}$ ».',
     'Pour $f+g$ avec $f\\to+\\infty$ et $g\\to-\\infty$, c\'est « $' + col('+\\infty-\\infty')
     + '$ » : forme indéterminée.',
     'Les autres se concluent : $+\\infty+\\infty=+\\infty$ ; $+\\infty\\times 3=+\\infty$ ;'
     ' $\\dfrac{2}{+\\infty}$ donne $0$.'])
V401_PRODUIT = qcm(
    'Soit $f$ et $g$ deux fonctions telles que $\\lim\\limits_{x\\to+\\infty}f(x)=+\\infty$ et'
    ' $\\lim\\limits_{x\\to+\\infty}g(x)=0$.\n\nQue peut-on dire de la limite de $f\\times g$ en'
    ' $+\\infty$ ?',
    FI,
    ['Elle vaut $0$.', 'Elle vaut $+\\infty$.', 'Elle vaut $1$.'],
    ['À connaître : « $0\\times\\infty$ » est une forme indéterminée.',
     'Selon les fonctions, la limite peut être $0$ ($f(x)=x$, $g(x)=\\dfrac{1}{x^2}$), $+\\infty$'
     ' ($f(x)=x^2$, $g(x)=\\dfrac{1}{x}$) ou un autre réel : $' + col('\\text{forme indéterminée}')
     + '$.'])
V401_CONCLURE = qcm(
    'Soit $f$ et $g$ deux fonctions telles que $\\lim\\limits_{x\\to+\\infty}f(x)=-\\infty$ et'
    ' $\\lim\\limits_{x\\to+\\infty}g(x)=-\\infty$.\n\nQue peut-on dire de la limite de'
    ' $f\\times g$ en $+\\infty$ ?',
    'Elle vaut $+\\infty$.',
    ['Elle vaut $-\\infty$.', FI, 'Elle vaut $0$.'],
    ['À connaître : un produit de limites infinies est infini, avec la règle des signes.',
     '« $(-\\infty)\\times(-\\infty)$ » donne $' + col('+\\infty') + '$ : ce n\'est pas une forme'
     ' indéterminée.'])

MODELES.append(modele(
    '04-operations-formes-indeterminees', 'Opérations sur les limites : formes indéterminées',
    'À savoir : opérations sur les limites, formes indéterminées ∞ − ∞, 0 × ∞, ∞/∞, 0/0 ;'
    ' reconnaître une forme indéterminée et conclure quand ce n\'en est pas une',
    'Fonctions', 'Limites de fonctions', 2,
    [V401_RECONNAITRE, V401_PRODUIT, V401_CONCLURE],
    [('+∞ − ∞', ['+∞ + ∞', '+∞ × 3', '2/+∞']),
     ('forme indéterminée', ['0', '+∞', '1']),
     ('+∞', ['−∞ (signe)', 'forme indéterminée', '0'])]))

# --- 5. TSPE-410 : convexité par les sécantes ---------------------------------------------------

SOUS_SECANTES = 'en dessous de chacune de ses sécantes, entre les deux points d\'intersection'
SUR_SECANTES = 'au-dessus de chacune de ses sécantes, entre les deux points d\'intersection'

V410_DEFINITION = qcm(
    'Une fonction $f$ est **convexe** sur un intervalle $I$ lorsque, sur $I$, sa courbe'
    ' représentative est :',
    SOUS_SECANTES,
    [SUR_SECANTES, 'en dessous de chacune de ses tangentes', 'au-dessus de l\'axe des abscisses'],
    ['À connaître (définition) : $f$ est convexe sur $I$ lorsque, pour tous points $A$ et $B$ de'
     ' sa courbe d\'abscisses dans $I$, la courbe est ' + '$' + col('\\text{en dessous de la sécante'
     ' }(AB)') + '$ entre $A$ et $B$.',
     'Ne pas confondre : une fonction convexe peut être négative, et sa courbe est AU-DESSUS de'
     ' ses tangentes.'])
V410_CONCAVE = qcm(
    'Une fonction $f$ est **concave** sur un intervalle $I$ lorsque, sur $I$, sa courbe'
    ' représentative est :',
    SUR_SECANTES,
    [SOUS_SECANTES, 'au-dessus de chacune de ses tangentes', 'en dessous de l\'axe des abscisses'],
    ['À connaître : $f$ est concave sur $I$ lorsque $-f$ est convexe sur $I$.',
     'Sa courbe est donc ' + '$' + col('\\text{au-dessus de chacune de ses sécantes}') + '$ entre'
     ' les deux points d\'intersection.'])
V410_RECONNAITRE = qcm(
    'Sur un intervalle $I$, la courbe représentative d\'une fonction $f$ est en dessous de'
    ' chacune de ses sécantes, entre les deux points d\'intersection.\n\nAlors :',
    '$f$ est convexe sur $I$',
    ['$f$ est concave sur $I$', '$f$ est croissante sur $I$', '$f$ est positive sur $I$'],
    ['À connaître (définition) : « courbe en dessous de ses sécantes » signifie « $f$ convexe ».',
     'Donc $' + col('f\\text{ est convexe sur }I') + '$ ; cela ne dit rien du sens de variation ni'
     ' du signe de $f$.'])

MODELES.append(modele(
    '05-convexite-secantes', 'Convexité : position par rapport aux sécantes',
    'À savoir : f convexe sur I ⟺ courbe en dessous de ses sécantes (définition) ; concave :'
    ' au-dessus ; distracteurs : tangentes, signe, sens de variation',
    'Fonctions convexes', 'Convexité', 1,
    [V410_DEFINITION, V410_CONCAVE, V410_RECONNAITRE],
    [('sous les sécantes', ['au-dessus', 'sous les tangentes', 'positive']),
     ('au-dessus des sécantes', ['en dessous', 'au-dessus des tangentes', 'négative']),
     ('convexe', ['concave', 'croissante', 'positive'])]))

# --- 6. TSPE-411 : convexité par les tangentes --------------------------------------------------

V411_CARACTERISATION = qcm(
    'Soit $f$ une fonction deux fois dérivable sur un intervalle $I$.\n\n$f$ est convexe sur $I$'
    ' si et seulement si, sur $I$, sa courbe représentative est :',
    'au-dessus de chacune de ses tangentes',
    ['en dessous de chacune de ses tangentes', 'au-dessus de chacune de ses sécantes',
     'au-dessus de l\'axe des abscisses'],
    ['À connaître (admis) : pour $f$ deux fois dérivable sur $I$, $f$ est convexe sur $I$ si et'
     ' seulement si sa courbe est $' + col('\\text{au-dessus de chacune de ses tangentes}') + '$.',
     'Et en dessous de ses sécantes : les deux positions vont ensemble.'])
V411_INEGALITE = qcm(
    'Soit $f$ une fonction deux fois dérivable et convexe sur $\\mathbb{R}$, et $a$ un réel.\n\n'
    'Pour tout réel $x$ :',
    '$f(x)\\geqslant f\'(a)(x-a)+f(a)$',
    ['$f(x)\\leqslant f\'(a)(x-a)+f(a)$', '$f(x)=f\'(a)(x-a)+f(a)$', '$f(x)\\geqslant f(a)$'],
    ['À connaître : la tangente en $a$ a pour équation $y=f\'(a)(x-a)+f(a)$, et la courbe d\'une'
     ' fonction convexe est au-dessus de ses tangentes.',
     'Donc, pour tout réel $x$, $' + col('f(x)\\geqslant f\'(a)(x-a)+f(a)') + '$.',
     '$f(x)\\geqslant f(a)$ serait vrai seulement si la tangente en $a$ était horizontale.'])
V411_CONCAVE = qcm(
    'Soit $f$ une fonction deux fois dérivable et **concave** sur un intervalle $I$.\n\nSur $I$,'
    ' sa courbe représentative est :',
    'en dessous de chacune de ses tangentes',
    ['au-dessus de chacune de ses tangentes', 'en dessous de chacune de ses sécantes',
     'en dessous de l\'axe des abscisses'],
    ['À connaître : $f$ concave équivaut à $-f$ convexe ; la courbe de $-f$ est au-dessus de ses'
     ' tangentes.',
     'Celle de $f$ est donc $' + col('\\text{en dessous de chacune de ses tangentes}') + '$ (et'
     ' au-dessus de ses sécantes).'])

MODELES.append(modele(
    '06-convexite-tangentes', 'Convexité : position par rapport aux tangentes',
    'À savoir : f deux fois dérivable, convexe ⟺ courbe au-dessus de ses tangentes ; inégalité'
    ' f(x) ≥ f′(a)(x − a) + f(a) ; concave : en dessous',
    'Fonctions convexes', 'Convexité', 2,
    [V411_CARACTERISATION, V411_INEGALITE, V411_CONCAVE],
    [('au-dessus des tangentes', ['en dessous', 'au-dessus des sécantes', 'positive']),
     ('≥ tangente', ['≤', '=', '≥ f(a)']),
     ('sous les tangentes', ['au-dessus', 'sous les sécantes', 'négative'])]))

# --- 7. TSPE-585 : convexité et croissance de f′ ------------------------------------------------

V585_CARACTERISATION = qcm(
    'Soit $f$ une fonction deux fois dérivable sur un intervalle $I$.\n\n$f$ est convexe sur $I$'
    ' si et seulement si :',
    '$f\'$ est croissante sur $I$',
    ['$f$ est croissante sur $I$', '$f\'$ est positive sur $I$', '$f\'$ est décroissante sur $I$'],
    ['À connaître (admis) : pour $f$ deux fois dérivable sur $I$, $f$ est convexe sur $I$ si et'
     ' seulement si $' + col('f\'\\text{ est croissante sur }I') + '$.',
     'Ne pas confondre : « $f\'$ positive » signifie « $f$ croissante », pas « $f$ convexe ».'])
V585_CONCAVE = qcm(
    'Soit $f$ une fonction deux fois dérivable sur un intervalle $I$, telle que $f\'$ est'
    ' **décroissante** sur $I$.\n\nAlors :',
    '$f$ est concave sur $I$',
    ['$f$ est convexe sur $I$', '$f$ est décroissante sur $I$', '$f$ est négative sur $I$'],
    ['À connaître : $f$ convexe sur $I$ si et seulement si $f\'$ est croissante sur $I$ ; $f$'
     ' concave si et seulement si $f\'$ est décroissante sur $I$.',
     'Ici $f\'$ décroît, donc $' + col('f\\text{ est concave sur }I') + '$ ; cela ne dit rien du'
     ' sens de variation de $f$ (c\'est le signe de $f\'$ qui le donne).'])
V585_SENS_INVERSE = qcm(
    'Soit $f$ une fonction deux fois dérivable et convexe sur un intervalle $I$.\n\nQue peut-on'
    ' dire de $f\'$ sur $I$ ?',
    '$f\'$ est croissante sur $I$',
    ['$f\'$ est positive sur $I$', '$f\'$ est décroissante sur $I$', '$f\'$ est constante sur $I$'],
    ['À connaître : $f$ convexe sur $I$ si et seulement si $f\'$ est croissante sur $I$.',
     'Donc $' + col('f\'\\text{ est croissante sur }I') + '$ ; son signe peut changer (par exemple'
     ' $f(x)=x^2$, $f\'(x)=2x$).'])

MODELES.append(modele(
    '07-convexite-derivee-croissante', 'Convexité et croissance de la dérivée',
    'À savoir : f deux fois dérivable, convexe ⟺ f′ croissante ; concave ⟺ f′ décroissante ;'
    ' distracteur : f′ positive (f croissante)',
    'Fonctions convexes', 'Convexité', 3,
    [V585_CARACTERISATION, V585_CONCAVE, V585_SENS_INVERSE],
    [('f′ croissante', ['f croissante', 'f′ positive', 'f′ décroissante']),
     ('concave', ['convexe', 'décroissante', 'négative']),
     ('f′ croissante', ['f′ positive', 'f′ décroissante', 'f′ constante'])]))

# --- 8. TSPE-428 : théorème des valeurs intermédiaires ------------------------------------------

V428_HYPOTHESE = qcm(
    'Soit $f$ une fonction définie sur un intervalle $[a\\,;b]$.\n\nQuelle hypothèse le théorème'
    ' des valeurs intermédiaires demande-t-il pour affirmer que, pour tout réel $k$ compris entre'
    ' $f(a)$ et $f(b)$, l\'équation $f(x)=k$ admet au moins une solution dans $[a\\,;b]$ ?',
    '$f$ est continue sur $[a\\,;b]$',
    ['$f$ est strictement monotone sur $[a\\,;b]$', '$f(a)<f(b)$',
     '$f$ est définie en $a$ et en $b$'],
    ['À connaître (théorème des valeurs intermédiaires, admis) : si $' + col('f\\text{ est continue'
     ' sur }[a\\,;b]') + '$, alors pour tout réel $k$ compris entre $f(a)$ et $f(b)$, l\'équation'
     ' $f(x)=k$ admet au moins une solution dans $[a\\,;b]$.',
     'La stricte monotonie n\'est pas demandée : elle sert à l\'unicité de la solution.'])
V428_CONCLUSION = qcm(
    'Soit $f$ une fonction continue sur un intervalle $[a\\,;b]$, et $k$ un réel compris entre'
    ' $f(a)$ et $f(b)$.\n\nAlors l\'équation $f(x)=k$ admet :',
    'au moins une solution dans $[a\\,;b]$',
    ['exactement une solution dans $[a\\,;b]$', 'aucune solution dans $[a\\,;b]$',
     'au moins une solution, mais peut-être hors de $[a\\,;b]$'],
    ['À connaître (théorème des valeurs intermédiaires) : $f$ continue sur $[a\\,;b]$ prend toutes'
     ' les valeurs comprises entre $f(a)$ et $f(b)$.',
     'L\'équation $f(x)=k$ admet donc $' + col('\\text{au moins une solution dans }[a\\,;b]')
     + '$, et peut-être plusieurs si $f$ n\'est pas strictement monotone.'])
V428_EXEMPLE = qcm(
    'Soit $f$ une fonction continue sur $[-1\\,;2]$ telle que $f(-1)=-3$ et $f(2)=4$.\n\n'
    'L\'équation $f(x)=0$ :',
    'admet au moins une solution dans $[-1\\,;2]$',
    ['admet exactement une solution dans $[-1\\,;2]$', 'n\'a aucune solution dans $[-1\\,;2]$',
     'a pour solution $x=0$'],
    ['À connaître (théorème des valeurs intermédiaires) : $f$ est continue sur $[-1\\,;2]$ et $0$'
     ' est compris entre $f(-1)=-3$ et $f(2)=4$.',
     'Donc l\'équation $f(x)=0$ $' + col('\\text{admet au moins une solution dans }[-1\\,;2]')
     + '$. Rien ne dit qu\'elle est unique, ni qu\'elle vaut $0$.'])

MODELES.append(modele(
    '08-theoreme-valeurs-intermediaires', 'Théorème des valeurs intermédiaires',
    'À savoir : f continue sur [a ; b], k entre f(a) et f(b) ⟹ f(x) = k a au moins une solution'
    ' dans [a ; b] ; hypothèse : la continuité (pas la monotonie) ; conclusion : au moins une',
    'Fonctions', 'Continuité', 1,
    [V428_HYPOTHESE, V428_CONCLUSION, V428_EXEMPLE],
    [('continue', ['strictement monotone', 'f(a) < f(b)', 'définie en a et b']),
     ('au moins une', ['exactement une', 'aucune', 'hors de [a ; b]']),
     ('au moins une', ['exactement une', 'aucune', 'x = 0'])]))

# --- 9. TSPE-429 : cas strictement monotone -----------------------------------------------------

UNE = 'Exactement une.'
PAS_SAVOIR = 'On ne peut pas savoir.'

V429_CROISSANTE = qcm(
    'Soit $f$ une fonction continue et strictement croissante sur un intervalle $[a\\,;b]$, et $k$'
    ' un réel compris entre $f(a)$ et $f(b)$.\n\nCombien l\'équation $f(x)=k$ a-t-elle de'
    ' solutions dans $[a\\,;b]$ ?',
    UNE, ['Aucune.', 'Au moins deux.', PAS_SAVOIR],
    ['À connaître : si $f$ est continue et strictement monotone sur $[a\\,;b]$, alors pour tout'
     ' réel $k$ compris entre $f(a)$ et $f(b)$, l\'équation $f(x)=k$ admet $'
     + col('\\text{une unique solution}') + '$ dans $[a\\,;b]$.',
     'La continuité donne au moins une solution ; la stricte monotonie empêche d\'en avoir deux.'])
V429_HYPOTHESE = qcm(
    'Soit $f$ une fonction continue sur un intervalle $[a\\,;b]$, et $k$ un réel compris entre'
    ' $f(a)$ et $f(b)$.\n\nQuelle hypothèse supplémentaire garantit que l\'équation $f(x)=k$ a une'
    ' **unique** solution dans $[a\\,;b]$ ?',
    '$f$ est strictement monotone sur $[a\\,;b]$',
    ['$f$ est monotone sur $[a\\,;b]$, au sens large', '$f(a)<f(b)$',
     '$f$ est dérivable sur $[a\\,;b]$'],
    ['À connaître : c\'est la ' + '$' + col('\\text{stricte monotonie}') + '$ qui donne'
     ' l\'unicité.',
     'La monotonie au sens large ne suffit pas : une fonction constante sur un morceau de $[a\\,;b]$ peut'
     ' prendre la valeur $k$ en une infinité de points.'])
V429_EXEMPLE = qcm(
    'Soit $f$ une fonction continue et strictement décroissante sur $[0\\,;5]$, telle que'
    ' $f(0)=7$ et $f(5)=-2$.\n\nCombien l\'équation $f(x)=0$ a-t-elle de solutions dans'
    ' $[0\\,;5]$ ?',
    UNE, ['Aucune.', 'Deux.', PAS_SAVOIR],
    ['À connaître : $f$ est continue et strictement monotone sur $[0\\,;5]$, et $0$ est compris'
     ' entre $f(5)=-2$ et $f(0)=7$.',
     'L\'équation $f(x)=0$ a donc $' + col('\\text{exactement une solution}') + '$ dans'
     ' $[0\\,;5]$.'])

MODELES.append(modele(
    '09-tvi-strictement-monotone', 'Théorème des valeurs intermédiaires : cas strictement monotone',
    'À savoir : f continue et strictement monotone sur [a ; b], k entre f(a) et f(b) ⟹ solution'
    ' unique ; hypothèse : stricte monotonie (au sens large ne suffit pas)',
    'Fonctions', 'Continuité', 2,
    [V429_CROISSANTE, V429_HYPOTHESE, V429_EXEMPLE],
    [('une', ['aucune', 'au moins deux', 'on ne sait pas']),
     ('strictement monotone', ['au sens large', 'f(a) < f(b)', 'dérivable']),
     ('une', ['aucune', 'deux', 'on ne sait pas'])]))

# --- 10. TSPE-439 : propriétés algébriques du logarithme ----------------------------------------

V439_PRODUIT = qcm(
    'Pour tous réels $a>0$ et $b>0$, $\\ln(ab)$ est égal à :',
    '$\\ln a+\\ln b$', ['$\\ln a\\times\\ln b$', '$\\ln(a+b)$', '$a\\ln b$'],
    ['À connaître : le logarithme transforme un produit en somme.',
     'Pour tous réels $a>0$ et $b>0$, $\\ln(ab)=' + col('\\ln a+\\ln b') + '$.'])
V439_QUOTIENT = qcm(
    'Pour tous réels $a>0$ et $b>0$, $\\ln\\left(\\dfrac{a}{b}\\right)$ est égal à :',
    '$\\ln a-\\ln b$', ['$\\dfrac{\\ln a}{\\ln b}$', '$\\ln(a-b)$', '$\\ln b-\\ln a$'],
    ['À connaître : pour tous réels $a>0$ et $b>0$, $\\ln\\left(\\dfrac{a}{b}\\right)='
     + col('\\ln a-\\ln b') + '$.',
     'En particulier, $\\ln\\left(\\dfrac{1}{b}\\right)=-\\ln b$.'])
V439_PUISSANCE = qcm(
    'Pour tout réel $a>0$ et tout entier naturel $n$, $\\ln\\left(a^n\\right)$ est égal à :',
    '$n\\ln a$', ['$(\\ln a)^n$', '$\\ln a+n$', '$a\\ln n$'],
    ['À connaître : pour tout réel $a>0$ et tout entier $n$, $\\ln\\left(a^n\\right)='
     + col('n\\ln a') + '$.',
     'C\'est la propriété du produit répétée $n$ fois : $\\ln(a\\times a\\times\\cdots\\times a)='
     '\\ln a+\\ln a+\\cdots+\\ln a$.'])

MODELES.append(modele(
    '10-logarithme-proprietes-algebriques', 'Propriétés algébriques du logarithme',
    'À savoir : ln(ab) = ln a + ln b, ln(a/b) = ln a − ln b, ln(aⁿ) = n ln a, parmi des erreurs'
    ' typiques (ln a × ln b, ln(a + b), (ln a)ⁿ)',
    'Fonctions', 'Fonction logarithme', 1,
    [V439_PRODUIT, V439_QUOTIENT, V439_PUISSANCE],
    [('somme', ['produit des ln', 'ln(a + b)', 'a ln b']),
     ('différence', ['quotient des ln', 'ln(a − b)', 'ordre inversé']),
     ('n ln a', ['(ln a)ⁿ', 'ln a + n', 'a ln n'])]))

# --- 11. TSPE-440 : dérivée du logarithme -------------------------------------------------------

V440_DIRECT = qcm(
    'La fonction $\\ln$ est dérivable sur $]0\\,;+\\infty[$. Pour tout réel $x>0$, $\\ln\'(x)$'
    ' est égal à :',
    '$\\dfrac{1}{x}$', ['$\\ln x$', '$\\dfrac{1}{x^2}$', '$-\\dfrac{1}{x}$'],
    ['À connaître : la fonction $\\ln$ est dérivable sur $]0\\,;+\\infty[$ et, pour tout réel'
     ' $x>0$, $\\ln\'(x)=' + col('\\dfrac{1}{x}') + '$.',
     'Comme $\\dfrac{1}{x}>0$ sur $]0\\,;+\\infty[$, la fonction $\\ln$ y est strictement'
     ' croissante.'])
V440_INVERSE = qcm(
    'Parmi ces fonctions définies sur $]0\\,;+\\infty[$, laquelle a pour dérivée la fonction'
    ' $x\\mapsto\\dfrac{1}{x}$ ?',
    '$x\\mapsto\\ln x$',
    ['$x\\mapsto-\\dfrac{1}{x^2}$', '$x\\mapsto x\\ln x$', '$x\\mapsto\\ln x+x$'],
    ['À connaître : pour tout réel $x>0$, $\\ln\'(x)=\\dfrac{1}{x}$.',
     'La fonction qui a pour dérivée $x\\mapsto\\dfrac{1}{x}$ est donc $' + col('x\\mapsto\\ln x')
     + '$.',
     'Vérification des autres : $-\\dfrac{1}{x^2}$ est la dérivée de $\\dfrac{1}{x}$ (sens'
     ' inversé), $(x\\ln x)\'=\\ln x+1$ et $(\\ln x+x)\'=\\dfrac{1}{x}+1$.'])

MODELES.append(modele(
    '11-derivee-du-logarithme', 'Dérivée de la fonction logarithme',
    'À savoir : ln′(x) = 1/x sur ]0 ; +∞[, reconnue parmi des erreurs typiques, et dans l\'autre'
    ' sens (quelle fonction a pour dérivée 1/x)',
    'Fonctions', 'Fonction logarithme', 2,
    [V440_DIRECT, V440_INVERSE],
    [('1/x', ['ln x', '1/x²', '−1/x']),
     ('ln x', ['−1/x² (dérivée de 1/x)', 'x ln x', 'ln x + x'])]))

os.makedirs(DOSSIER, exist_ok=True)
for nom, m in MODELES:
    with open(os.path.join(DOSSIER, nom + '.json'), 'w', encoding='utf-8') as f:
        json.dump(m, f, ensure_ascii=False, indent='\t')
        f.write('\n')
# Mis en forme comme le pre-commit, pour que le script redonne les fichiers commités
subprocess.run(['pnpm', 'exec', 'prettier', '--write', DOSSIER], check=True,
               stdout=subprocess.DEVNULL)
print(f'{len(MODELES)} modèles écrits dans {DOSSIER}')
