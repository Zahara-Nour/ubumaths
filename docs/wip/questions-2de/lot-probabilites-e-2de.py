"""Écrit les 7 modèles du lot 8 E « Probabilités » de la 2de dans scripts/questions/2de-probabilites-e/.

Phase 0 validée par David le 2026-11-02 (§ 51 du journal `docs/wip/questions-2de-progress.md`).
Bornes : `bornes/lycee/2de.json` (2-389, 2-391, 2-393, 2-394, 2-395, 2-397, 2-400) : arbres sans
probabilités totales (l2-4) ; P_B(A) par inversion sur un tableau croisé seulement (2-400, l2-4) ;
tableau croisé d'effectifs seulement (2-394, l2-10). Un point par modèle ; le nœud et le tag sont posés
par la migration de rangement, après le `--publier` de David.

Décisions et pièges :
- loi des grands nombres (2-389) : les fréquences des séries de 20 et 100 lancers sont tirées hors
  d'une bande autour de 1/6, celle de 10 000 lancers dedans, pour que la « bonne » série le soit à
  coup sûr ; le bloc ` ```simulation ` n'illustre que la correction (ses tirages ne sont pas des
  variables du modèle) ;
- poids d'un arbre : décimaux `0.{{a}}` (un chiffre) ou fractions `{{r}}/{{n}}` ; une branche à
  construire porte `?` ;
- tableau croisé à construire (2-394) : toutes les cases cachées par `masquer:` (valeurs écrites,
  totaux compris) ;
- une fraction attendue s'écrit `{{eval:a/b}}` ; en spec, `\\frac{a}{b}` (LaTeX), jamais `a/b` ;
- un choix se répond par son rang dans la liste écrite (mélangée à l'affichage), la bonne en tête ;
- jamais de `{{if:…}}` imbriqué : une variation par cas ;
- les variables sont substituées telles quelles dans les `eval` : toujours `(a)` ;
- variables `e` et `i` interdites.

    python3 docs/wip/questions-2de/lot-probabilites-e-2de.py scripts/questions/2de-probabilites-e
"""
import json
import os
import subprocess
import sys

DOSSIER = sys.argv[1]
SIMULATION = ('Probabilités', 'Simulation', 'Stabilisation')
ARBRES = ('Probabilités', 'Probabilités conditionnelles', 'Arbres pondérés')
TABLEAUX = ('Probabilités', 'Probabilités conditionnelles', 'Tableaux croisés')
NOTATIONS = ('Probabilités', 'Probabilités conditionnelles', 'Notations')
CONTEXTE = ('Probabilités', 'Probabilités conditionnelles', 'Problèmes en contexte')


def spec(desc, vi, variables, answers, status, violations=None):
    s = {'description': desc, 'variationIndex': vi,
         'variables': {k: str(v) for k, v in variables.items()},
         'answers': answers if isinstance(answers, list) else [answers],
         'expected': {'status': status}}
    if violations:
        s['expected']['constraintViolations'] = violations
    return s


def modele(nom, title, description, categorie, level, variations, specs, delay=90):
    m = {'title': title, 'description': description, 'grades': ['2'], 'theme': categorie[0],
         'domain': categorie[1], 'subdomain': categorie[2], 'level': level, 'delay': delay,
         'status': 'draft', 'shared': {'blankDefaults': {'acceptDecimal': True}},
         'variations': variations, 'testSpecs': specs}
    return nom, m


def var(nom, expression):
    return {'name': nom, 'expression': expression}


def variation(statement, variables, blanks, steps, conditions=None):
    v = {'statement': statement, 'variables': variables}
    if conditions:
        v['conditions'] = conditions
    v['blanks'] = [{'expectedAnswer': b} for b in blanks]
    v['correction'] = {'steps': steps}
    return v


def col(x, k=0):
    return '\\textcolor{{{color:primary.' + str(k) + '}}}{' + x + '}'


def choix(question, options):
    return question + '\n\n```choix\n' + ''.join('- ' + o + '\n' for o in options) + '```'


def frac(a, b):
    return '\\dfrac{ ' + a + ' }{ ' + b + ' }'


def tex_frac(a, b):
    return '\\frac{' + str(a) + '}{' + str(b) + '}'


MODELES = []

# =============================================================================================
# 1. 2-389 : loi des grands nombres
# =============================================================================================

# Bande autour de 1/6 ≈ 0,1667 : 10 000 lancers dans [0,165 ; 0,1685] (écart ⩽ 0,002) ; 100 lancers
# à 0,02 au moins (k ∉ 15..18) ; 20 lancers à 0,06 au moins.
VARS_389 = [var('k20', '1|2|5|6'), var('kc', '10|11|12|13|14|19|20|21|22|23'),
            var('km', '1650..1685')]
F20 = '{{eval:(k20)/20;d}}'
FC = '{{eval:(kc)/100;d}}'
FM = '{{eval:(km)/10000;d}}'

SIMU = ('```simulation\nX = 1 ; 2 ; 3 ; 4 ; 5 ; 6\nP = 1/6 ; 1/6 ; 1/6 ; 1/6 ; 1/6 ; 1/6\n'
        'tirages: 10000\n```')

LGN_SERIE = variation(
    'Trois élèves lancent un dé équilibré et notent la fréquence d\'apparition du $6$ : l\'un fait'
    ' $20$ lancers, un autre $100$, le dernier $10\\,000$. Ils ont mélangé leurs résultats :'
    ' $' + F20 + '$, $' + FC + '$ et $' + FM + '$.\n\n'
    + choix('Quelle fréquence vient, selon toute vraisemblance, de la série de $10\\,000$ lancers ?',
            ['$' + FM + '$', '$' + FC + '$', '$' + F20 + '$']),
    VARS_389, ['0'],
    ['La probabilité d\'obtenir $6$ avec un dé équilibré est $\\dfrac{1}{6}\\approx0{,}167$.',
     '**Loi des grands nombres** : quand le nombre de lancers est grand, la fréquence observée est,'
     ' sauf exception, proche de la probabilité.',
     'La fréquence la plus proche de $0{,}167$ est $' + col(FM) + '$ : c\'est elle qui vient, selon'
     ' toute vraisemblance, des $10\\,000$ lancers.'])

LGN_AFFIRMATION = variation(
    'On lance un dé équilibré $n$ fois et on calcule la fréquence $f$ d\'apparition du $6$. La'
    ' probabilité d\'obtenir $6$ est $\\dfrac{1}{6}$. Une série de $100$ lancers a donné'
    ' $f=' + FC + '$.\n\n'
    + choix('Quelle affirmation est juste ?',
            ['Pour $n$ grand, $f$ est, sauf exception, proche de $\\dfrac{1}{6}$.',
             'Pour $n=10\\,000$, $f$ est exactement égale à $\\dfrac{1}{6}$.',
             'Comme $f\\neq\\dfrac{1}{6}$, le dé est truqué.',
             'La fréquence $f$ ne dépend pas du nombre de lancers.']),
    VARS_389, ['0'],
    ['**Loi des grands nombres** : quand $n$ est grand, la fréquence observée est, sauf exception,'
     ' **proche** de la probabilité — rarement égale.',
     'Sur $100$ lancers, $f=' + FC + '$ s\'écarte de $\\dfrac{1}{6}\\approx0{,}167$ sans que le dé'
     ' soit truqué : les fréquences fluctuent. Avec $10\\,000$ lancers simulés :',
     SIMU,
     '$' + col('\\text{Pour } n \\text{ grand, } f \\text{ est proche de } \\tfrac{1}{6}') + '$.'])

SP_389 = {'k20': 5, 'kc': 21, 'km': 1672}
MODELES.append(modele(
    '01-loi-des-grands-nombres', 'Loi des grands nombres',
    'Lancers d\'un dé : la fréquence d\'une grande série est, sauf exception, proche de la'
    ' probabilité',
    SIMULATION, 1, [LGN_SERIE, LGN_AFFIRMATION],
    [spec('0,1672 vient des 10 000 lancers (rang 0)', 0, SP_389, '0', 'correct'),
     spec('Erreur : 0,21', 0, SP_389, '1', 'incorrect'),
     spec('Erreur : 0,25 (20 lancers)', 0, SP_389, '2', 'incorrect'),
     spec('Affirmation juste (rang 0)', 1, SP_389, '0', 'correct'),
     spec('Erreur : égale pour 10 000', 1, SP_389, '1', 'incorrect'),
     spec('Erreur : dé truqué', 1, SP_389, '2', 'incorrect')]))

# =============================================================================================
# 2. 2-391 : arbre de deux épreuves indépendantes
# =============================================================================================

VARS_391 = [var('n', '5|7'), var('r', '2..5'), var('bl', 'eval:(n)-(r)')]
ARBRE_391 = ('```probtree\nP:1/2\n  R:{{r}}/{{n}}\n  B:{{bl}}/{{n}}\nF:1/2\n  R:{{r}}/{{n}}\n'
             '  B:{{bl}}/{{n}}\n```')
INTRO_391 = ('On lance une pièce équilibrée ($P$ : Pile, $F$ : Face), puis on tire une boule au hasard'
             ' dans une urne qui contient ${{r}}$ boules rouges ($R$) et ${{bl}}$ boules bleues'
             ' ($B$). Les deux épreuves sont indépendantes.\n\n' + ARBRE_391 + '\n\n')

ARBRE_PR = variation(
    INTRO_391 + 'Quelle est la probabilité d\'obtenir Pile **puis** une boule rouge ?\n\n$P(P\\cap R)=?$',
    VARS_391, ['{{eval:(r)/(2*(n))}}'],
    ['La probabilité d\'un chemin est le **produit** des probabilités de ses branches.',
     'Chemin $P$ puis $R$ : $\\dfrac{1}{2}\\times\\dfrac{ {{r}} }{ {{n}} }='
     + col('{{eval:(r)/(2*(n))}}') + '$.'],
    ['bl >= 2'])

ARBRE_FB = variation(
    INTRO_391 + 'Quelle est la probabilité d\'obtenir Face **puis** une boule bleue ?\n\n'
    '$P(F\\cap B)=?$',
    VARS_391, ['{{eval:(bl)/(2*(n))}}'],
    ['La probabilité d\'un chemin est le **produit** des probabilités de ses branches.',
     'Chemin $F$ puis $B$ : $\\dfrac{1}{2}\\times\\dfrac{ {{bl}} }{ {{n}} }='
     + col('{{eval:(bl)/(2*(n))}}') + '$.'],
    ['bl >= 2'])

SP_391 = {'n': 5, 'r': 3, 'bl': 2}
MODELES.append(modele(
    '02-arbre-deux-epreuves', 'Arbre de deux épreuves indépendantes',
    'Pièce puis urne : probabilité d\'un chemin de l\'arbre (produit des branches)',
    ARBRES, 3, [ARBRE_PR, ARBRE_FB],
    [spec('1/2 × 3/5 = 3/10', 0, SP_391, tex_frac(3, 10), 'correct'),
     spec('3/10 en décimal', 0, SP_391, '0.3', 'correct'),
     spec('Erreur : somme 1/2 + 3/5', 0, SP_391, tex_frac(11, 10), 'incorrect'),
     spec('Erreur : branche seule 3/5', 0, SP_391, tex_frac(3, 5), 'incorrect'),
     spec('1/2 × 2/5 = 1/5', 1, SP_391, tex_frac(1, 5), 'correct'),
     spec('Erreur : rouge au lieu de bleue', 1, SP_391, tex_frac(3, 10), 'incorrect')]))

# =============================================================================================
# 3. 2-393 : construire un arbre pondéré
# =============================================================================================

VARS_393 = [var('a', '2..8'), var('b', '1..9'), var('c', '1..9'),
            var('ga', 'eval:10-(a)'), var('nb', 'eval:10-(b)'), var('nc', 'eval:10-(c)')]


def arbre_393(plein):
    if not plein:
        return ('```probtree\nF:?\n  C:?\n  \\overline{C}:?\nG:?\n  C:?\n  \\overline{C}:?\n```')
    return ('```probtree\nF:0.{{a}}\n  C:0.{{b}}\n  \\overline{C}:0.{{nb}}\nG:0.{{ga}}\n'
            '  C:0.{{c}}\n  \\overline{C}:0.{{nc}}\n```')


CONSTRUIRE_ARBRE = variation(
    'Dans un club, ${{a}}0\\,\\%$ des adhérents sont des filles, les autres des garçons. Parmi les'
    ' filles, ${{b}}0\\,\\%$ font de la compétition ; parmi les garçons, ${{c}}0\\,\\%$. On choisit'
    ' un adhérent au hasard ; on note $F$ « c\'est une fille », $G$ « c\'est un garçon » et $C$ « il'
    ' fait de la compétition ».\n\n' + arbre_393(False) + '\n\nComplète l\'arbre pondéré.\n\n'
    '$P(F)=?$\n\n$P(G)=?$\n\n$P_{F}(C)=?$\n\n$P_{F}(\\overline{C})=?$\n\n$P_{G}(C)=?$\n\n'
    '$P_{G}(\\overline{C})=?$',
    VARS_393,
    ['{{eval:(a)/10}}', '{{eval:(ga)/10}}', '{{eval:(b)/10}}', '{{eval:(nb)/10}}',
     '{{eval:(c)/10}}', '{{eval:(nc)/10}}'],
    ['Premier niveau : le sexe ; $P(G)=1-P(F)$.',
     'Second niveau : « parmi les filles » donne une probabilité **sachant $F$**, portée par les'
     ' branches qui partent de $F$ ; la somme des branches issues d\'un même nœud vaut $1$.',
     arbre_393(True)],
    ['b != c'])

SP_393 = {'a': 6, 'b': 3, 'c': 5, 'ga': 4, 'nb': 7, 'nc': 5}
MODELES.append(modele(
    '03-construire-un-arbre-pondere', 'Construire un arbre pondéré',
    'Énoncé « x % des…, parmi eux y % » traduit en arbre : six pondérations',
    ARBRES, 4, [CONSTRUIRE_ARBRE],
    [spec('0,6 ; 0,4 ; 0,3 ; 0,7 ; 0,5 ; 0,5', 0, SP_393,
          ['0.6', '0.4', '0.3', '0.7', '0.5', '0.5'], 'correct'),
     spec('Erreur : P_F(C̄) = 1 − P(F)', 0, SP_393, ['0.6', '0.4', '0.3', '0.4', '0.5', '0.5'],
          'incorrect'),
     spec('Erreur : P_F(C) = P(F) × 0,3 (0,18)', 0, SP_393,
          ['0.6', '0.4', '0.18', '0.82', '0.2', '0.8'], 'incorrect')],
    delay=180))

# =============================================================================================
# 4. 2-394 : construire un tableau croisé d'effectifs
# =============================================================================================

VARS_394 = [var('a', '4..8'), var('b', '4..8'), var('r', '2..12'), var('s', '2..12'),
            var('tf', 'eval:20*(a)'), var('tg', 'eval:20*(b)'), var('nt', 'eval:(tf)+(tg)'),
            var('p', 'eval:5*(r)'), var('q', 'eval:5*(s)'),
            var('fc', 'eval:(tf)*(p)/100'), var('gc', 'eval:(tg)*(q)/100'),
            var('fs', 'eval:(tf)-(fc)'), var('gs', 'eval:(tg)-(gc)'), var('tc', 'eval:(fc)+(gc)')]


def tableau_394(masque):
    t = ('```tableau-croise\nlignes: Filles ; Garçons\ncolonnes: Club ; Sans club\n'
         'Filles = {{fc}} ; {{fs}}\nGarçons = {{gc}} ; {{gs}}\ncoin: Sexe \\ Sport\n')
    if masque:
        t += ('masquer: Filles/Club ; Filles/Sans club ; Filles/Total ; Garçons/Club ;'
              ' Garçons/Sans club ; Garçons/Total ; Total/Club ; Total/Sans club ; Total/Total\n')
    return t + '```'


CONSTRUIRE_TABLEAU = variation(
    'Un lycée compte ${{nt}}$ élèves, dont ${{tf}}$ filles. ${{p}}\\,\\%$ des filles et ${{q}}\\,\\%$'
    ' des garçons pratiquent un sport en club.\n\n' + tableau_394(True) + '\n\nComplète le tableau'
    ' croisé d\'effectifs.\n\nFilles en club : $?$\n\nGarçons en club : $?$\n\nÉlèves en club : $?$'
    '\n\nOn choisit un élève au hasard. Quelle est la probabilité qu\'il pratique un sport en club ?'
    '\n\n$?$',
    VARS_394, ['{{fc}}', '{{gc}}', '{{tc}}', '{{eval:(tc)/(nt)}}'],
    ['Garçons : ${{nt}}-{{tf}}={{tg}}$.',
     'Filles en club : ${{p}}\\,\\%$ **des filles**, ${{eval:(p)/100;d}}\\times{{tf}}='
     + col('{{fc}}') + '$ ; garçons en club : ${{eval:(q)/100;d}}\\times{{tg}}=' + col('{{gc}}')
     + '$ ; en tout ${{fc}}+{{gc}}=' + col('{{tc}}') + '$.',
     tableau_394(False),
     'Tirage au hasard (équiprobabilité) : $\\dfrac{ {{tc}} }{ {{nt}} }='
     + col('{{eval:(tc)/(nt)}}') + '$.'],
    ['p != q'])

SP_394 = {'a': 6, 'b': 4, 'r': 6, 's': 10, 'tf': 120, 'tg': 80, 'nt': 200, 'p': 30, 'q': 50,
          'fc': 36, 'gc': 40, 'fs': 84, 'gs': 40, 'tc': 76}
MODELES.append(modele(
    '04-construire-un-tableau-croise', 'Construire un tableau croisé d\'effectifs',
    'Énoncé en pourcentages traduit en tableau croisé, puis probabilité d\'un événement',
    TABLEAUX, 4, [CONSTRUIRE_TABLEAU],
    [spec('36 ; 40 ; 76 ; 76/200 = 19/50', 0, SP_394, ['36', '40', '76', tex_frac(19, 50)],
          'correct'),
     spec('36 ; 40 ; 76 ; 0,38', 0, SP_394, ['36', '40', '76', '0.38'], 'correct'),
     spec('Erreur : pourcentages du total (60 ; 100)', 0, SP_394,
          ['60', '100', '160', tex_frac(4, 5)], 'incorrect')],
    delay=180))

# =============================================================================================
# 5. 2-395 : traduire en notations
# =============================================================================================

INTRO_395 = ('Dans un lycée, on choisit un élève au hasard. On note $L$ l\'événement « l\'élève étudie'
             ' le latin » et $G$ l\'événement « l\'élève étudie le grec ».\n\n')
V = '0{,}{{v}}'
VARS_395 = [var('v', '1..9')]

NOT_INTER = variation(
    INTRO_395 + choix('« La probabilité que l\'élève étudie le latin **et** le grec est $' + V
                      + '$. » Quelle écriture traduit cette phrase ?',
                      ['$P(L\\cap G)=' + V + '$', '$P_L(G)=' + V + '$', '$P(L)=' + V + '$',
                       '$P_G(L)=' + V + '$']),
    VARS_395, ['0'],
    ['« $L$ et $G$ » est l\'intersection $L\\cap G$ ; aucune condition « parmi… » ni « sachant… ».',
     '$' + col('P(L\\cap G)=' + V) + '$.'])

NOT_COND = variation(
    INTRO_395 + choix('« **Parmi les latinistes**, ${{v}}0\\,\\%$ étudient le grec. » Quelle écriture'
                      ' traduit cette phrase ?',
                      ['$P_L(G)=' + V + '$', '$P_G(L)=' + V + '$', '$P(L\\cap G)=' + V + '$',
                       '$P(G)=' + V + '$']),
    VARS_395, ['0'],
    ['« Parmi les latinistes » : on sait que $L$ est réalisé ; c\'est une probabilité **sachant $L$**,'
     ' le $L$ va en indice.',
     '$' + col('P_L(G)=' + V) + '$.'])

NOT_CONTRAIRE = variation(
    INTRO_395 + choix('« Un élève qui étudie le grec a une probabilité $' + V + '$ de **ne pas**'
                      ' étudier le latin. » Quelle écriture traduit cette phrase ?',
                      ['$P_G(\\overline{L})=' + V + '$', '$P_{\\overline{L}}(G)=' + V + '$',
                       '$P(G\\cap\\overline{L})=' + V + '$', '$P_G(L)=' + V + '$']),
    VARS_395, ['0'],
    ['« Un élève qui étudie le grec » : on sait que $G$ est réalisé, $G$ en indice. « Ne pas étudier'
     ' le latin » : l\'événement contraire $\\overline{L}$.',
     '$' + col('P_G(\\overline{L})=' + V) + '$.'])

NOT_INVERSE = variation(
    INTRO_395 + choix('Que signifie $P(\\overline{L})=' + V + '$ ?',
                      ['La probabilité que l\'élève n\'étudie pas le latin est $' + V + '$.',
                       'La probabilité que l\'élève étudie le latin est $' + V + '$.',
                       'La probabilité que l\'élève étudie le grec mais pas le latin est $' + V + '$.',
                       'Parmi les élèves qui n\'étudient pas le grec, la proportion de latinistes est $'
                       + V + '$.']),
    VARS_395, ['0'],
    ['$\\overline{L}$ est l\'événement contraire de $L$ : « l\'élève n\'étudie **pas** le latin ».'
     ' Sans indice, pas de condition.',
     '$' + col('\\text{L\'élève n\'étudie pas le latin avec la probabilité } ' + V) + '$.'])

SP_395 = {'v': 3}
MODELES.append(modele(
    '05-traduire-en-notations', 'Traduire un énoncé en notations de probabilités',
    'Phrase ↔ notation : P(A ∩ B), P_A(B), événement contraire',
    NOTATIONS, 1, [NOT_INTER, NOT_COND, NOT_CONTRAIRE, NOT_INVERSE],
    [spec('Intersection (rang 0)', 0, SP_395, '0', 'correct'),
     spec('Erreur : P_L(G)', 0, SP_395, '1', 'incorrect'),
     spec('Conditionnelle P_L(G) (rang 0)', 1, SP_395, '0', 'correct'),
     spec('Erreur : P_G(L)', 1, SP_395, '1', 'incorrect'),
     spec('P_G(L̄) (rang 0)', 2, SP_395, '0', 'correct'),
     spec('Erreur : P_L̄(G)', 2, SP_395, '1', 'incorrect'),
     spec('Contraire (rang 0)', 3, SP_395, '0', 'correct'),
     spec('Erreur : L au lieu de L̄', 3, SP_395, '1', 'incorrect')]))

# =============================================================================================
# 6. 2-397 : probabilité conditionnelle lue sur un arbre
# =============================================================================================

VARS_397 = [var('a', '2..8'), var('b', '1..9'), var('c', '1..9'),
            var('na', 'eval:10-(a)'), var('nb', 'eval:10-(b)'), var('nc', 'eval:10-(c)'),
            var('ab', 'eval:(a)*(b)')]
ARBRE_397 = ('```probtree\nA:0.{{a}}\n  B:0.{{b}}\n  \\overline{B}:0.{{nb}}\n\\overline{A}:0.{{na}}\n'
             '  B:0.{{c}}\n  \\overline{B}:0.{{nc}}\n```')
ARBRE_397_TROU = ('```probtree\nA:0.{{a}}\n  B:?\n  \\overline{B}:?\n\\overline{A}:0.{{na}}\n'
                  '  B:0.{{c}}\n  \\overline{B}:0.{{nc}}\n```')

LIRE_COND = variation(
    'On considère l\'arbre pondéré ci-dessous.\n\n' + ARBRE_397 + '\n\nQuelle est la probabilité de'
    ' $B$ sachant $\\overline{A}$ ?\n\n$P_{\\overline{A}}(B)=?$',
    VARS_397, ['{{eval:(c)/10}}'],
    ['Sur un arbre, les branches du **second niveau** portent des probabilités conditionnelles : la'
     ' branche $B$ issue de $\\overline{A}$ porte $P_{\\overline{A}}(B)$.',
     '$P_{\\overline{A}}(B)=' + col('0{,}{{c}}') + '$.'],
    ['b != c', 'c != na'])

CALC_COND = variation(
    'On considère l\'arbre pondéré ci-dessous, dont deux branches sont effacées.\n\n'
    + ARBRE_397_TROU + '\n\nOn sait que $P(A\\cap B)={{eval:(ab)/100;d}}$. Calcule $P_A(B)$.\n\n'
    '$P_A(B)=?$',
    VARS_397, ['{{eval:(b)/10}}'],
    ['Probabilité d\'un chemin : $P(A\\cap B)=P(A)\\times P_A(B)$, donc'
     ' $P_A(B)=\\dfrac{P(A\\cap B)}{P(A)}$.',
     '$P_A(B)=\\dfrac{ {{eval:(ab)/100;d}} }{ 0{,}{{a}} }=' + col('0{,}{{b}}') + '$.'],
    ['b != a'])

SP_397 = {'a': 4, 'b': 3, 'c': 7, 'na': 6, 'nb': 7, 'nc': 3, 'ab': 12}
MODELES.append(modele(
    '06-probabilite-conditionnelle-arbre', 'Probabilité conditionnelle sur un arbre',
    'Lire P_Ā(B) sur une branche du second niveau ; retrouver P_A(B) à partir de P(A ∩ B)',
    ARBRES, 5, [LIRE_COND, CALC_COND],
    [spec('P_Ā(B) = 0,7', 0, SP_397, '0.7', 'correct'),
     spec('Erreur : P(Ā) = 0,6', 0, SP_397, '0.6', 'incorrect'),
     spec('Erreur : P_A(B) = 0,3', 0, SP_397, '0.3', 'incorrect'),
     spec('P_A(B) = 0,12 / 0,4 = 0,3', 1, SP_397, '0.3', 'correct'),
     spec('Erreur : P(A ∩ B) × P(A) (0,048)', 1, SP_397, '0.048', 'incorrect'),
     spec('Erreur : P(A ∩ B) recopiée (0,12)', 1, SP_397, '0.12', 'incorrect')]))

# =============================================================================================
# 7. 2-400 : P_M(T) ou P_T(M) — faux positifs
# =============================================================================================

VARS_400 = [var('m', '100|200|500'), var('s', '90|95|98'), var('sp', '90|95|98|99'),
            var('vp', 'eval:(m)*(s)/100'), var('fn', 'eval:(m)-(vp)'), var('nm', 'eval:10000-(m)'),
            var('vn', 'eval:(nm)*(sp)/100'), var('fp', 'eval:(nm)-(vn)'),
            var('tp', 'eval:(vp)+(fp)')]
TAB_400 = ('```tableau-croise\nlignes: Malade ; Non malade\ncolonnes: Test positif ; Test négatif\n'
           'Malade = {{vp}} ; {{fn}}\nNon malade = {{fp}} ; {{vn}}\ncoin: État \\ Test\n```')
INTRO_400 = ('Un test de dépistage d\'une maladie est essayé sur $10\\,000$ personnes. On choisit une'
             ' personne au hasard ; on note $M$ « elle est malade » et $T$ « son test est'
             ' positif ».\n\n' + TAB_400 + '\n\nDonne les résultats en fraction ou en écriture décimale.'
             '\n\n')

SENSIBILITE = variation(
    INTRO_400 + 'La **sensibilité** du test est la probabilité qu\'un malade ait un test positif.'
    '\n\n$P_M(T)=?$\n\nUne personne a un test positif. Quelle est la probabilité qu\'elle soit'
    ' malade ?\n\n$P_T(M)=?$',
    VARS_400, ['{{eval:(vp)/(m)}}', '{{eval:(vp)/(tp)}}'],
    ['$P_M(T)$ : **parmi les malades** (ligne « Malade », ${{m}}$ personnes), ceux qui ont un test'
     ' positif : $\\dfrac{ {{vp}} }{ {{m}} }=' + col('{{eval:(vp)/(m)}}') + '$.',
     '$P_T(M)$ : **parmi les tests positifs** (colonne « Test positif », ${{tp}}$ personnes), les'
     ' malades : $\\dfrac{ {{vp}} }{ {{tp}} }=' + col('{{eval:(vp)/(tp)}}') + '$.',
     'Les deux probabilités sont très différentes : beaucoup de tests positifs sont des **faux'
     ' positifs** (${{fp}}$ non-malades testés positifs), car les non-malades sont très nombreux.'])

FAUX_POSITIFS = variation(
    INTRO_400 + 'Combien de **faux positifs** (personnes non malades dont le test est positif) compte'
    ' cet essai ?\n\n$?$\n\nUne personne a un test positif. Quelle est la probabilité qu\'elle ne'
    ' soit **pas** malade ?\n\n$P_T(\\overline{M})=?$',
    VARS_400, ['{{fp}}', '{{eval:(fp)/(tp)}}'],
    ['Faux positifs : ligne « Non malade », colonne « Test positif » : $' + col('{{fp}}') + '$.',
     '$P_T(\\overline{M})$ : **parmi les ${{tp}}$ tests positifs**, les non-malades :'
     ' $\\dfrac{ {{fp}} }{ {{tp}} }=' + col('{{eval:(fp)/(tp)}}') + '$.',
     'À ne pas confondre avec $P_{\\overline{M}}(T)=\\dfrac{ {{fp}} }{ {{nm}} }$, la proportion de'
     ' tests positifs parmi les non-malades.'])

SP_400 = {'m': 200, 's': 95, 'sp': 95, 'vp': 190, 'fn': 10, 'nm': 9800, 'vn': 9310, 'fp': 490,
          'tp': 680}
MODELES.append(modele(
    '07-faux-positifs', 'Faux positifs : P_M(T) ou P_T(M)',
    'Test de dépistage en tableau croisé : sensibilité, probabilité d\'être malade sachant le test'
    ' positif, faux positifs',
    CONTEXTE, 4, [SENSIBILITE, FAUX_POSITIFS],
    [spec('P_M(T) = 19/20, P_T(M) = 19/68', 0, SP_400, [tex_frac(19, 20), tex_frac(19, 68)],
          'correct'),
     spec('0,95 et 19/68', 0, SP_400, ['0.95', tex_frac(19, 68)], 'correct'),
     spec('Erreur : P_T(M) = P_M(T)', 0, SP_400, ['0.95', '0.95'], 'incorrect'),
     spec('Erreur : P_T(M) = 190/10000', 0, SP_400, ['0.95', '0.019'], 'incorrect'),
     spec('490 faux positifs, P_T(M̄) = 49/68', 1, SP_400, ['490', tex_frac(49, 68)], 'correct'),
     spec('Erreur : P_M̄(T) = 490/9800 = 0,05', 1, SP_400, ['490', '0.05'], 'incorrect')],
    delay=150))

os.makedirs(DOSSIER, exist_ok=True)
for nom, m in MODELES:
    with open(os.path.join(DOSSIER, nom + '.json'), 'w', encoding='utf-8') as f:
        json.dump(m, f, ensure_ascii=False, indent='\t')
        f.write('\n')
# Mis en forme comme le pre-commit, pour que le script redonne les fichiers commités
subprocess.run(['pnpm', 'exec', 'prettier', '--write', DOSSIER], check=True,
               stdout=subprocess.DEVNULL)
print(f'{len(MODELES)} modèles écrits dans {DOSSIER}')
