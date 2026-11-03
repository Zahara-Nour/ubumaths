"""Écrit les 8 modèles du lot 12 a-1 « Inégalités et comparaisons » de la 2de dans scripts/questions/2de-inegalites-a1/.

Phase 0 validée par David le 2026-11-03 (§ 71 du journal `docs/wip/questions-2de-progress.md`).
Points : 2-263 (somme d'inégalités), 2-424 (produit par un réel), 2-264 (comparer par différence), 2-425
(comparer par rapport), 2-276, 2-427 (les mêmes sur des quantités en contexte), 2-277, 2-428 (interpréter
une différence, un rapport). Un point par modèle ; le nœud et le tag sont posés par la migration de
rangement, après le `--publier` de David.

Décisions et pièges :
- L12a-a : un modèle par point ; 264 et 425 en calcul, 276 et 427 en contexte ;
- niveaux relevés en prod le 2026-11-03 (index d'unicité par catégorie, tous niveaux scolaires) :
  Calcul littéral › Inégalités n'existe pas → Règles de calcul 1, 2 ; Comparer 1 à 6 ;
- `eval` ne connaît ni `==` ni `>` : le rang de la bonne réponse d'une case choix est calculé par
  indicatrices (`min(max(d,0),1)`, `d` entier non nul) ;
- une case choix rend l'indice d'origine coché ; les choix sont mélangés à l'affichage sauf
  `melanger: non` : le corrigé nomme la bonne réponse, jamais son rang.

    python3 docs/wip/questions-2de/lot-inegalites-a1-2de.py scripts/questions/2de-inegalites-a1
"""
import json
import os
import subprocess
import sys

DOSSIER = sys.argv[1]


def spec(desc, vi, variables, answers, status, violations=None):
    s = {'description': desc, 'variationIndex': vi,
         'variables': {k: str(v) for k, v in variables.items()},
         'answers': answers if isinstance(answers, list) else [answers],
         'expected': {'status': status}}
    if violations:
        s['expected']['constraintViolations'] = violations
    return s


def modele(nom, title, description, categorie, level, variations, specs, shared=None, delay=60):
    m = {'title': title, 'description': description, 'grades': ['2'], 'theme': categorie[0],
         'domain': categorie[1], 'subdomain': categorie[2], 'level': level, 'delay': delay,
         'status': 'draft'}
    m['shared'] = {'cleanCoefficients': True}
    if shared:
        m['shared'].update(shared)
    m['variations'] = variations
    m['testSpecs'] = specs
    return nom, m


def var(nom, expression):
    return {'name': nom, 'expression': expression}


def variation(statement, variables, blanks, steps, conditions=None):
    v = {'statement': statement, 'variables': variables}
    if conditions:
        v['conditions'] = conditions
    v['blanks'] = blanks
    v['correction'] = {'steps': steps}
    return v


def case(attendu):
    return {'expectedAnswer': attendu}


def col(x, k=0):
    return '\\textcolor{{{color:primary.' + str(k) + '}}}{' + x + '}'


def choix(question, options, melanger=True):
    tete = '' if melanger else 'melanger: non\n'
    return question + '\n\n```choix\n' + tete + ''.join('- ' + o + '\n' for o in options) + '```'


MODELES = []
REGLES = ('Calcul littéral', 'Inégalités', 'Règles de calcul')
COMPARER = ('Calcul littéral', 'Inégalités', 'Comparer')
DECIMAL = {'blankDefaults': {'acceptDecimal': True}}

# --- 1. 2-263 : somme d'inégalités ----------------------------------------------------------

HYP = 'On sait que ${{p}}\\leqslant a\\leqslant {{q}}$ et ${{r}}\\leqslant b\\leqslant {{s}}$.'
VARS_AB = [var('p', '-3..6'), var('dq', '1..5'), var('q', 'eval:(p)+(dq)'),
           var('r', '-6..3'), var('ds', '1..5'), var('s', 'eval:(r)+(ds)')]

SOMME = variation(
    HYP + '\n\nEncadre $a+b$.\n\n$$?\\leqslant a+b\\leqslant ?$$',
    VARS_AB,
    [case('{{eval:(p)+(r)}}'), case('{{eval:(q)+(s)}}')],
    ['**On peut ajouter membre à membre deux inégalités de même sens.**',
     '$$\\begin{aligned}{{p}}&\\leqslant a\\leqslant {{q}}\\\\{{r}}&\\leqslant b\\leqslant {{s}}\\end{aligned}$$',
     '$${{p}}+({{r}})\\leqslant a+b\\leqslant {{q}}+({{s}})$$',
     '$$' + col('{{eval:(p)+(r)}}') + '\\leqslant a+b\\leqslant ' + col('{{eval:(q)+(s)}}', 1) + '$$'])

DIFFERENCE = variation(
    HYP + '\n\nEncadre $a-b$.\n\n$$?\\leqslant a-b\\leqslant ?$$',
    VARS_AB,
    [case('{{eval:(p)-(s)}}'), case('{{eval:(q)-(r)}}')],
    ['**On ne soustrait pas deux inégalités membre à membre.** On écrit $a-b=a+(-b)$ et on encadre'
     ' d\'abord $-b$ : multiplier par $-1$ **change le sens** des inégalités.',
     '$${{r}}\\leqslant b\\leqslant {{s}}\\quad\\text{donne}\\quad {{eval:-(s)}}\\leqslant -b\\leqslant {{eval:-(r)}}$$',
     'On ajoute membre à membre avec ${{p}}\\leqslant a\\leqslant {{q}}$ :',
     '$$' + col('{{eval:(p)-(s)}}') + '\\leqslant a-b\\leqslant ' + col('{{eval:(q)-(r)}}', 1) + '$$'])

SP_AB = {'p': 2, 'dq': 3, 'q': 5, 'r': -1, 'ds': 4, 's': 3}
MODELES.append(modele(
    '01-somme-d-inegalites', 'Ajouter des inégalités',
    'Encadrer a + b, puis a − b = a + (−b), à partir de deux encadrements',
    REGLES, 1,
    [SOMME, DIFFERENCE],
    [spec('a + b : 1 ⩽ a + b ⩽ 8', 0, SP_AB, ['1', '8'], 'correct'),
     spec('Erreur : bornes inversées', 0, SP_AB, ['8', '1'], 'incorrect'),
     spec('Erreur : produit des bornes (−2 ; 15)', 0, SP_AB, ['-2', '15'], 'incorrect'),
     spec('a − b : −1 ⩽ a − b ⩽ 6', 1, SP_AB, ['-1', '6'], 'correct'),
     spec('Erreur : soustraction membre à membre (3 ; 2)', 1, SP_AB, ['3', '2'], 'incorrect'),
     spec('Erreur : une seule borne juste (−1 ; 2)', 1, SP_AB, ['-1', '2'], 'incorrect')],
    delay=90))

# --- 2. 2-424 : produit par un réel -----------------------------------------------------------

SIGNE = variation(
    choix('On sait que $x<{{a}}$. Quel symbole complète l\'inégalité ?\n\n$${{k}}x\\ \\ldots\\ {{eval:(k)*(a)}}$$',
          ['$<$', '$>$'], melanger=False),
    [var('a', '-6..9'), var('k', '2..6;±')],
    [case('{{if:k>0|0|1}}')],
    ['**Multiplier les deux membres d\'une inégalité par un réel strictement positif conserve son sens ;'
     ' par un réel strictement négatif, cela le change.**',
     'Ici on multiplie par ${{k}}$, {{if:k>0|positif : le sens est conservé|négatif : le sens change}}.',
     '$$x<{{a}}\\quad\\text{donc}\\quad {{k}}x' + col('{{if:k>0|<|>}}') + '{{eval:(k)*(a)}}$$'])

AFFINE_DEC = variation(
    'On sait que ${{a}}\\leqslant x\\leqslant {{b}}$.\n\nEncadre $f(x)={{m}}x{{eval:p;+}}$.\n\n$$?\\leqslant {{m}}x{{eval:p;+}}\\leqslant ?$$',
    [var('a', '-5..2'), var('d', '2..6'), var('b', 'eval:(a)+(d)'), var('m', '-5..-2'), var('p', '1..9;±')],
    [case('{{eval:(m)*(b)+(p)}}'), case('{{eval:(m)*(a)+(p)}}')],
    ['On multiplie par ${{m}}$, un réel **négatif** : **le sens des inégalités change**.',
     '$$ {{eval:(m)*(a)}}\\geqslant {{m}}x\\geqslant {{eval:(m)*(b)}}$$',
     'On ajoute ${{p}}$ (le sens ne change pas) :',
     '$$' + col('{{eval:(m)*(b)+(p)}}') + '\\leqslant {{m}}x{{eval:p;+}}\\leqslant ' + col('{{eval:(m)*(a)+(p)}}', 1) + '$$',
     'C\'est le **sens de variation** de la fonction affine $f$ : son coefficient ${{m}}$ est négatif, $f$ est'
     ' **décroissante**, donc $f({{b}})\\leqslant f(x)\\leqslant f({{eval:a}})$ : l\'ordre des images est inversé.'])

AFFINE_CROIS = variation(
    'On sait que ${{a}}\\leqslant x\\leqslant {{b}}$.\n\nEncadre $f(x)={{m}}x{{eval:p;+}}$.\n\n$$?\\leqslant {{m}}x{{eval:p;+}}\\leqslant ?$$',
    [var('a', '-5..2'), var('d', '2..6'), var('b', 'eval:(a)+(d)'), var('m', '2..5'), var('p', '1..9;±')],
    [case('{{eval:(m)*(a)+(p)}}'), case('{{eval:(m)*(b)+(p)}}')],
    ['On multiplie par ${{m}}$, un réel **positif** : **le sens des inégalités est conservé**.',
     '$$ {{eval:(m)*(a)}}\\leqslant {{m}}x\\leqslant {{eval:(m)*(b)}}$$',
     'On ajoute ${{p}}$ :',
     '$$' + col('{{eval:(m)*(a)+(p)}}') + '\\leqslant {{m}}x{{eval:p;+}}\\leqslant ' + col('{{eval:(m)*(b)+(p)}}', 1) + '$$',
     'C\'est le **sens de variation** de la fonction affine $f$ : son coefficient ${{m}}$ est positif, $f$ est'
     ' **croissante**, donc $f({{eval:a}})\\leqslant f(x)\\leqslant f({{b}})$.'])

SP_DEC = {'a': -1, 'd': 5, 'b': 4, 'm': -3, 'p': 1}
SP_CR = {'a': -1, 'd': 5, 'b': 4, 'm': 2, 'p': -3}
MODELES.append(modele(
    '02-multiplier-une-inegalite', 'Multiplier une inégalité par un réel',
    'Sens conservé ou changé selon le signe du facteur ; encadrer mx + p, lien avec le sens de variation'
    ' d\'une fonction affine',
    REGLES, 2,
    [SIGNE, AFFINE_DEC, AFFINE_CROIS],
    [spec('x < 3 donc −2x > −6', 0, {'a': 3, 'k': -2}, '1', 'correct'),
     spec('Erreur : sens non changé (−2x < −6)', 0, {'a': 3, 'k': -2}, '0', 'incorrect'),
     spec('x < 3 donc 4x < 12', 0, {'a': 3, 'k': 4}, '0', 'correct'),
     spec('Erreur : sens changé pour un positif', 0, {'a': 3, 'k': 4}, '1', 'incorrect'),
     spec('−1 ⩽ x ⩽ 4 : −11 ⩽ −3x + 1 ⩽ 4', 1, SP_DEC, ['-11', '4'], 'correct'),
     spec('Erreur : sens non changé (4 puis −11)', 1, SP_DEC, ['4', '-11'], 'incorrect'),
     spec('Erreur : + 1 oublié (−12 ; 3)', 1, SP_DEC, ['-12', '3'], 'incorrect'),
     spec('−1 ⩽ x ⩽ 4 : −5 ⩽ 2x − 3 ⩽ 5', 2, SP_CR, ['-5', '5'], 'correct'),
     spec('Erreur : sens changé pour un positif', 2, SP_CR, ['5', '-5'], 'incorrect')],
    delay=90))

# --- 3. 2-264 : comparer par différence (calcul) ---------------------------------------------

ORDRE = ['$a<b$', '$a>b$', '$a=b$']

DIFF_FRACTIONS = variation(
    'On veut comparer $a=\\dfrac{ {{p}} }{ {{q}} }$ et $b=\\dfrac{ {{r}} }{ {{s}} }$ en calculant leur différence.'
    '\n\n$$a-b=?$$\n\n' + choix('On en déduit :', ORDRE, melanger=False),
    [var('q', '3..9'), var('p', '1..8'), var('s', '3..9!q'), var('r', '1..8'),
     var('t', 'eval:min(max((p)*(s)-(r)*(q),0),1)')],
    [case('{{eval:(p)/(q)-(r)/(s)}}'), case('{{t}}')],
    ['**Comparer par la différence** : si $a-b>0$ alors $a>b$ ; si $a-b<0$ alors $a<b$.',
     '$$a-b=\\dfrac{ {{eval:(p)*(s)}} }{ {{eval:(q)*(s)}} }-\\dfrac{ {{eval:(r)*(q)}} }{ {{eval:(q)*(s)}} }='
     + col('{{eval:(p)/(q)-(r)/(s)}}') + '$$',
     'La différence est {{if:t>0|positive|négative}}, donc $' + col('a{{if:t>0|>|<}}b', 1) + '$.'],
    conditions=['gcd(p,q) == 1', 'gcd(r,s) == 1', '(p)*(s) != (r)*(q)', 'p < q', 'r < s',
                'abs((p)/(q)-(r)/(s)) < 0.2'])

DIFF_CARRE = variation(
    'Pour tout réel $x$, on pose $A=x^2+{{eval:(k)^2}}$ et $B={{eval:2*(k)}}x$.\n\nComplète :'
    '\n\n$$A-B=(x-?)^2$$\n\n' + choix('On en déduit que, pour tout réel $x$ :',
                                         ['$A\\geqslant B$', '$A\\leqslant B$', 'cela dépend de $x$'],
                                         melanger=False),
    [var('k', '2..9')],
    [case('{{k}}'), case('0')],
    ['On calcule la différence et on reconnaît une identité remarquable :',
     '$$A-B=x^2-{{eval:2*(k)}}x+{{eval:(k)^2}}=' + col('(x-{{k}})^2') + '$$',
     'Un carré est toujours positif ou nul : $A-B\\geqslant 0$, donc $' + col('A\\geqslant B', 1)
     + '$ pour tout réel $x$ (égalité pour $x={{k}}$).'])

SP_FR = {'q': 7, 'p': 3, 's': 12, 'r': 5, 't': 1}
MODELES.append(modele(
    '03-comparer-par-difference', 'Comparer deux nombres par leur différence',
    'Signe de a − b pour comparer deux fractions ; A = x² + k², B = 2kx : A − B = (x − k)² ⩾ 0',
    COMPARER, 1,
    [DIFF_FRACTIONS, DIFF_CARRE],
    [spec('3/7 − 5/12 = 1/84 > 0 : a > b', 0, SP_FR, ['\\frac{1}{84}', '1'], 'correct'),
     spec('Erreur : b − a (−1/84)', 0, SP_FR, ['-\\frac{1}{84}', '1'], 'incorrect'),
     spec('Erreur : conclusion inversée', 0, SP_FR, ['\\frac{1}{84}', '0'], 'incorrect'),
     spec('k = 3 : (x − 3)², A ⩾ B', 1, {'k': 3}, ['3', '0'], 'correct'),
     spec('Erreur : « cela dépend de x »', 1, {'k': 3}, ['3', '2'], 'incorrect'),
     spec('Erreur : (x − 6)²', 1, {'k': 3}, ['6', '0'], 'incorrect')]))

# --- 4. 2-425 : comparer par rapport (calcul) ------------------------------------------------

RAPPORT_FRACTIONS = variation(
    'On veut comparer les nombres strictement positifs $a=\\dfrac{ {{p}} }{ {{q}} }$ et'
    ' $b=\\dfrac{ {{r}} }{ {{s}} }$ en calculant leur rapport.\n\n$$\\dfrac{a}{b}=?$$\n\n'
    + choix('On en déduit :', ORDRE, melanger=False),
    [var('q', '2..9'), var('p', '2..9'), var('s', '2..9!q'), var('r', '2..9'),
     var('t', 'eval:min(max((p)*(s)-(r)*(q),0),1)')],
    [case('{{eval:((p)*(s))/((q)*(r))}}'), case('{{t}}')],
    ['**Comparer par le rapport** (nombres strictement positifs) : si $\\dfrac{a}{b}>1$ alors $a>b$ ;'
     ' si $\\dfrac{a}{b}<1$ alors $a<b$.',
     '$$\\dfrac{a}{b}=\\dfrac{ {{p}} }{ {{q}} }\\times\\dfrac{ {{s}} }{ {{r}} }=' + col('{{eval:((p)*(s))/((q)*(r))}}') + '$$',
     'Le rapport est {{if:t>0|plus grand|plus petit}} que $1$, donc $' + col('a{{if:t>0|>|<}}b', 1) + '$.'],
    conditions=['gcd(p,q) == 1', 'gcd(r,s) == 1', '(p)*(s) != (r)*(q)',
                'abs((p)*(s)-(r)*(q)) < (q)*(r)'])

RAPPORT_PUISSANCES = variation(
    'On veut comparer $a={{u}}\\times 10^{ {{n}} }$ et $b={{v}}\\times 10^{ {{eval:(n)+1}} }$ en calculant leur'
    ' rapport.\n\n$$\\dfrac{a}{b}=?$$\n\n' + choix('On en déduit :', ORDRE, melanger=False),
    [var('n', '3..8'), var('v', '1|2|4|5'), var('u', '11..49'), var('t', 'eval:min(max((u)-10*(v),0),1)')],
    [case('{{eval:(u)/(10*(v))}}'), case('{{t}}')],
    ['**Comparer par le rapport** : $a$ et $b$ sont strictement positifs, on compare $\\dfrac{a}{b}$ à $1$.',
     '$$\\dfrac{a}{b}=\\dfrac{ {{u}} }{ {{v}} }\\times\\dfrac{10^{ {{n}} }}{10^{ {{eval:(n)+1}} }}=\\dfrac{ {{u}} }{ {{v}} }\\times\\dfrac{1}{10}='
     + col('{{eval:(u)/(10*(v));d}}') + '$$',
     'Le rapport est {{if:t>0|plus grand|plus petit}} que $1$, donc $' + col('a{{if:t>0|>|<}}b', 1) + '$.'],
    conditions=['u != 10*(v)', 'mod(u,10) != 0'])

SP_RF = {'q': 8, 'p': 9, 's': 3, 'r': 4, 't': 0}
SP_RP = {'n': 5, 'v': 4, 'u': 36, 't': 0}
MODELES.append(modele(
    '04-comparer-par-rapport', 'Comparer deux nombres positifs par leur rapport',
    'Rapport a/b comparé à 1 : deux fractions ; deux nombres écrits avec des puissances de 10',
    COMPARER, 2,
    [RAPPORT_FRACTIONS, RAPPORT_PUISSANCES],
    [spec('(9/8) / (4/3) = 27/32 < 1 : a < b', 0, SP_RF, ['\\frac{27}{32}', '0'], 'correct'),
     spec('Erreur : b / a (32/27)', 0, SP_RF, ['\\frac{32}{27}', '0'], 'incorrect'),
     spec('Erreur : rapport < 1 lu « a > b »', 0, SP_RF, ['\\frac{27}{32}', '1'], 'incorrect'),
     spec('36 × 10⁵ / (4 × 10⁶) = 0,9 : a < b', 1, SP_RP, ['0,9', '0'], 'correct'),
     spec('0,9 en fraction', 1, SP_RP, ['\\frac{9}{10}', '0'], 'correct'),
     spec('Erreur : puissances oubliées (9)', 1, SP_RP, ['9', '1'], 'incorrect')],
    shared=DECIMAL))

# --- 5. 2-276 : comparer deux quantités par leur différence ----------------------------------

QUI = ['le tarif A', 'le tarif B', 'les deux tarifs coûtent autant']

VELOS = variation(
    'Un loueur de vélos propose deux tarifs.\n\n- Tarif A : ${{f}}~\\unit{€}$ d\'inscription, puis'
    ' ${{a}}~\\unit{€}$ par heure.\n- Tarif B : ${{b}}~\\unit{€}$ par heure, sans inscription.\n\nOn loue un'
    ' vélo pendant ${{h}}$ heures. Calcule la différence (prix A) − (prix B).\n\n$$?~\\unit{€}$$\n\n'
    + choix('Le moins cher est :', QUI, melanger=False),
    [var('f', '6..20'), var('a', '1..4'), var('g', '1..4'), var('b', 'eval:(a)+(g)'), var('h', '2..10'),
     var('pos', 'eval:min(max((f)-(g)*(h),0),1)'), var('neg', 'eval:min(max((g)*(h)-(f),0),1)'),
     var('idx', 'eval:(pos)+2*(1-(pos)-(neg))')],
    [case('{{eval:(f)-(g)*(h)}}'), case('{{idx}}')],
    ['Prix A : ${{f}}+{{a}}\\times{{h}}={{eval:(f)+(a)*(h)}}~\\unit{€}$ ; prix B : ${{b}}\\times{{h}}='
     '{{eval:(b)*(h)}}~\\unit{€}$.',
     '$$\\text{prix A}-\\text{prix B}={{eval:(f)+(a)*(h)}}-{{eval:(b)*(h)}}=' + col('{{eval:(f)-(g)*(h)}}')
     + '~\\unit{€}$$',
     '{{if:pos>0|La différence est positive : le tarif A coûte plus cher, le moins cher est **le tarif B**.'
     '|{{if:neg>0|La différence est négative : le moins cher est **le tarif A**.|La différence est nulle : les'
     ' deux tarifs coûtent autant.}}}}'])

COURSE = variation(
    'Léa fait ${{n}}$ tours d\'une piste de ${{t}}~\\unit{m}$. Tom court ${{tom}}~\\unit{m}$ en ligne'
    ' droite. Calcule la différence (distance de Léa) − (distance de Tom).\n\n$$?~\\unit{m}$$\n\n'
    + choix('A parcouru la plus grande distance :', ['Léa', 'Tom', 'aucun : la même distance'],
            melanger=False),
    [var('n', '3..8'), var('t', '200|300|400'), var('dw', '-6..6'), var('tom', 'eval:(n)*(t)+100*(dw)'),
     var('pos', 'eval:min(max((n)*(t)-(tom),0),1)'), var('neg', 'eval:min(max((tom)-(n)*(t),0),1)'),
     var('idx', 'eval:(1-(pos))*(1-(neg))*2+(neg)')],
    [case('{{eval:(n)*(t)-(tom)}}'), case('{{idx}}')],
    ['Distance de Léa : ${{n}}\\times{{t}}={{eval:(n)*(t)}}~\\unit{m}$.',
     '$$ {{eval:(n)*(t)}}-{{tom}}=' + col('{{eval:(n)*(t)-(tom)}}') + '~\\unit{m}$$',
     '{{if:pos>0|La différence est positive : **Léa** a couru plus loin.|{{if:neg>0|La différence est négative :'
     ' **Tom** a couru plus loin.|La différence est nulle : ils ont couru la même distance.}}}}'])

SP_VE = {'f': 12, 'a': 2, 'g': 3, 'b': 5, 'h': 5, 'pos': 0, 'neg': 1, 'idx': 0}
SP_CO = {'n': 4, 't': 400, 'dw': -1, 'tom': 1500, 'pos': 1, 'neg': 0, 'idx': 0}
MODELES.append(modele(
    '05-comparer-deux-quantites-par-difference', 'Comparer deux quantités par leur différence',
    'Deux tarifs de location (inscription + prix horaire) ; deux distances : le signe de la différence décide',
    COMPARER, 3,
    [VELOS, COURSE],
    [spec('22 − 25 = −3 : tarif A', 0, SP_VE, ['-3', '0'], 'correct'),
     spec('Erreur : B − A (3)', 0, SP_VE, ['3', '0'], 'incorrect'),
     spec('Erreur : signe lu à l\'envers (tarif B)', 0, SP_VE, ['-3', '1'], 'incorrect'),
     spec('1 600 − 1 500 = 100 : Léa', 1, SP_CO, ['100', '0'], 'correct'),
     spec('Erreur : un tour seulement (−1 100, Tom)', 1, SP_CO, ['-1100', '1'], 'incorrect')],
    delay=90))

# --- 6. 2-427 : comparer deux quantités par leur rapport -------------------------------------

IMMEUBLES = variation(
    'L\'immeuble A mesure ${{eval:(r)*(w)}}~\\unit{m}$ et l\'immeuble B ${{eval:20*(w)}}~\\unit{m}$.\n\n'
    'Calcule le rapport des hauteurs $\\dfrac{h_A}{h_B}$.\n\n$$\\dfrac{h_A}{h_B}=?$$\n\n'
    + choix('Le plus haut est :', ['l\'immeuble A', 'l\'immeuble B'], melanger=False),
    [var('w', '2..6'), var('r', '25|30|40|50|60|15|10|8|16'), var('t', 'eval:1-min(max((r)-20,0),1)')],
    [case('{{eval:(r)/20}}'), case('{{t}}')],
    ['**Comparer par le rapport** (quantités strictement positives) : on compare $\\dfrac{h_A}{h_B}$ à $1$.',
     '$$\\dfrac{h_A}{h_B}=\\dfrac{ {{eval:(r)*(w)}} }{ {{eval:20*(w)}} }=' + col('{{eval:(r)/20;d}}') + '$$',
     '{{if:t>0|Le rapport est plus petit que $1$ : $h_A<h_B$, le plus haut est **l\'immeuble B** ($h_A$ vaut'
     ' ${{eval:(r)/20;d}}$ fois $h_B$).|Le rapport est plus grand que $1$ : $h_A>h_B$, le plus haut est'
     ' **l\'immeuble A**, ${{eval:(r)/20;d}}$ fois plus haut que B.}}'])

VILLES = variation(
    'La ville A compte ${{eval:(r)*(w)*50}}$ habitants et la ville B ${{eval:1000*(w)}}$ habitants.\n\n'
    'Calcule le rapport $\\dfrac{\\text{population de A}}{\\text{population de B}}$.\n\n$$?$$\n\n'
    + choix('La ville la plus peuplée est :', ['A', 'B'], melanger=False),
    [var('w', '3..12'), var('r', '25|30|40|50|60|15|10|8|16'), var('t', 'eval:1-min(max((r)-20,0),1)')],
    [case('{{eval:(r)/20}}'), case('{{t}}')],
    ['On compare le rapport des populations à $1$ (deux quantités strictement positives).',
     '$$\\dfrac{ {{eval:(r)*(w)*50}} }{ {{eval:1000*(w)}} }=' + col('{{eval:(r)/20;d}}') + '$$',
     '{{if:t>0|Le rapport est plus petit que $1$ : la ville la plus peuplée est **B**.|Le rapport est plus'
     ' grand que $1$ : la ville la plus peuplée est **A**.}}'])

SP_IM = {'w': 4, 'r': 30, 't': 0}
SP_VI = {'w': 5, 'r': 16, 't': 1}
MODELES.append(modele(
    '06-comparer-deux-quantites-par-rapport', 'Comparer deux quantités par leur rapport',
    'Rapport de deux hauteurs, de deux populations, comparé à 1',
    COMPARER, 4,
    [IMMEUBLES, VILLES],
    [spec('120 / 80 = 1,5 : A', 0, SP_IM, ['1,5', '0'], 'correct'),
     spec('1,5 en fraction', 0, SP_IM, ['\\frac{3}{2}', '0'], 'correct'),
     spec('Erreur : rapport inversé (2/3)', 0, SP_IM, ['\\frac{2}{3}', '0'], 'incorrect'),
     spec('Erreur : différence (40)', 0, SP_IM, ['40', '0'], 'incorrect'),
     spec('4 000 / 5 000 = 0,8 : B', 1, SP_VI, ['0,8', '1'], 'correct'),
     spec('Erreur : rapport < 1 lu « A »', 1, SP_VI, ['0,8', '0'], 'incorrect')],
    shared=DECIMAL))

# --- 7. 2-277 : interpréter une différence ---------------------------------------------------

SALAIRES = variation(
    choix('Paul et Zoé comparent leurs salaires mensuels, en euros. On note $x$ celui de Paul et $y$ celui de'
          ' Zoé ; on calcule $x-y={{eval:10*(d)}}$.\n\nQue signifie ce résultat ?',
          ['Paul gagne ${{eval:10*abs(d)}}~\\unit{€}$ de plus que Zoé.',
           'Paul gagne ${{eval:10*abs(d)}}~\\unit{€}$ de moins que Zoé.',
           'Paul gagne ${{eval:10*abs(d)}}$ fois plus que Zoé.'])
    + '\n\nZoé gagne ${{y}}~\\unit{€}$. Combien gagne Paul ?\n\n$$?~\\unit{€}$$',
    [var('d', '5..40;±'), var('y', '1500..2400'), var('t', 'eval:1-min(max(d,0),1)')],
    [case('{{t}}'), case('{{eval:(y)+10*(d)}}')],
    ['La **différence** $x-y$ mesure un **écart additif** : de combien l\'un dépasse l\'autre.',
     '{{if:t>0|$x-y$ est négatif : $x<y$, Paul gagne **${{eval:10*abs(d)}}~\\unit{€}$ de moins** que Zoé.|$x-y$'
     ' est positif : $x>y$, Paul gagne **${{eval:10*abs(d)}}~\\unit{€}$ de plus** que Zoé.}}',
     '$$x=y+({{eval:10*(d)}})={{y}}+({{eval:10*(d)}})=' + col('{{eval:(y)+10*(d)}}') + '~\\unit{€}$$'])

SCORES = variation(
    choix('Au même jeu, on note $L$ le score de Léa et $T$ celui de Tom ; on calcule $L-T={{d}}$.\n\nQue'
          ' signifie ce résultat ?',
          ['Léa a ${{eval:abs(d)}}$ points de plus que Tom.',
           'Léa a ${{eval:abs(d)}}$ points de moins que Tom.',
           'Léa a ${{eval:abs(d)}}$ fois plus de points que Tom.'])
    + '\n\nTom a ${{s}}$ points. Combien Léa en a-t-elle ?\n\n$$?$$',
    [var('d', '3..60;±'), var('s', '80..300'), var('t', 'eval:1-min(max(d,0),1)')],
    [case('{{t}}'), case('{{eval:(s)+(d)}}')],
    ['La **différence** $L-T$ dit de combien de points Léa dépasse Tom (si elle est positive) ou est'
     ' dépassée (si elle est négative).',
     '{{if:t>0|$L-T<0$ : Léa a **${{eval:abs(d)}}$ points de moins** que Tom.|$L-T>0$ : Léa a'
     ' **${{eval:abs(d)}}$ points de plus** que Tom.}}',
     '$$L=T+({{d}})={{s}}+({{d}})=' + col('{{eval:(s)+(d)}}') + '$$'])

SP_SA = {'d': -12, 'y': 1800, 't': 1}
SP_SC = {'d': 25, 's': 140, 't': 0}
MODELES.append(modele(
    '07-interpreter-une-difference', 'Interpréter une différence',
    'x − y = −120 : « 120 € de moins » ; L − T = 25 : « 25 points de plus » ; retrouver une des deux quantités',
    COMPARER, 5,
    [SALAIRES, SCORES],
    [spec('x − y = −120 : 120 € de moins, 1 680 €', 0, SP_SA, ['1', '1680'], 'correct'),
     spec('Erreur : signe lu à l\'envers', 0, SP_SA, ['0', '1920'], 'incorrect'),
     spec('Erreur : bonne phrase, y − 120 mal fait (1 920)', 0, SP_SA, ['1', '1920'], 'incorrect'),
     spec('L − T = 25 : 25 de plus, 165', 1, SP_SC, ['0', '165'], 'correct'),
     spec('Erreur : « fois plus »', 1, SP_SC, ['2', '165'], 'incorrect')]))

# --- 8. 2-428 : interpréter un rapport -------------------------------------------------------

PRIX = variation(
    'Le rapport du prix d\'un article en 2025 à son prix en 2024 vaut'
    ' $\\dfrac{P_{2025}}{P_{2024}}={{eval:(q)/100;d}}$.\n\n'
    + choix('Entre 2024 et 2025, le prix :', ['a augmenté', 'a baissé'], melanger=False)
    + '\n\nDe quel pourcentage ?\n\n$$?~\\%$$',
    [var('q', '110|120|125|150|200|90|80|75|60|50'), var('t', 'eval:1-min(max((q)-100,0),1)')],
    [case('{{t}}'), case('{{eval:abs((q)-100)}}')],
    ['Un rapport $\\dfrac{P_{2025}}{P_{2024}}=k$ veut dire $P_{2025}=k\\times P_{2024}$ : le prix est'
     ' **multiplié par $k$** (variation multiplicative).',
     '{{if:t>0|$k={{eval:(q)/100;d}}<1$ : le prix **a baissé**. $k=1-{{eval:(100-(q))/100;d}}$ : il a baissé de'
     ' $' + col('{{eval:100-(q)}}~\\%') + '$.|$k={{eval:(q)/100;d}}>1$ : le prix **a augmenté**.'
     ' $k=1+{{eval:((q)-100)/100;d}}$ : il a augmenté de $' + col('{{eval:(q)-100}}~\\%') + '$.}}'])

ABONNES = variation(
    'Le nombre d\'abonnés d\'une chaîne a été **multiplié par ${{eval:(m)/100;d}}$** en un an.\n\nDe quel'
    ' pourcentage a-t-il augmenté ?\n\n$$?~\\%$$',
    [var('m', '150|200|250|300|400|500')],
    [case('{{eval:(m)-100}}')],
    ['Multiplier par $k$, c\'est ajouter $(k-1)$ fois la quantité de départ :',
     '$${{eval:(m)/100;d}}=1+{{eval:((m)-100)/100;d}}$$',
     'Le nombre d\'abonnés a augmenté de $' + col('{{eval:(m)-100}}~\\%') + '$.'])

MODELES.append(modele(
    '08-interpreter-un-rapport', 'Interpréter un rapport',
    'Rapport 1,25 : hausse de 25 % ; 0,8 : baisse de 20 % ; multiplié par 3 : hausse de 200 %',
    COMPARER, 6,
    [PRIX, ABONNES],
    [spec('0,8 : baisse de 20 %', 0, {'q': 80, 't': 1}, ['1', '20'], 'correct'),
     spec('Erreur : 0,8 lu « 80 % »', 0, {'q': 80, 't': 1}, ['1', '80'], 'incorrect'),
     spec('Erreur : 0,8 lu « hausse »', 0, {'q': 80, 't': 1}, ['0', '20'], 'incorrect'),
     spec('1,25 : hausse de 25 %', 0, {'q': 125, 't': 0}, ['0', '25'], 'correct'),
     spec('× 3 : hausse de 200 %', 1, {'m': 300}, '200', 'correct'),
     spec('Erreur : × 3 lu « 300 % »', 1, {'m': 300}, '300', 'incorrect')],
    shared=DECIMAL))

os.makedirs(DOSSIER, exist_ok=True)
for nom, m in MODELES:
    with open(os.path.join(DOSSIER, nom + '.json'), 'w', encoding='utf-8') as f:
        json.dump(m, f, ensure_ascii=False, indent='\t')
        f.write('\n')
# Mis en forme comme le pre-commit, pour que le script redonne les fichiers commités
subprocess.run(['pnpm', 'exec', 'prettier', '--write', DOSSIER], check=True,
               stdout=subprocess.DEVNULL)
print(f'{len(MODELES)} modèles écrits dans {DOSSIER}')
