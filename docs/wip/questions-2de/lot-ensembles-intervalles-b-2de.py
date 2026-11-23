"""Écrit les 8 modèles du lot 9 B « Ensembles de nombres, intervalles » de la 2de dans
scripts/questions/2de-intervalles-b/.

Phase 0 validée par David le 2026-11-03 (§ 66 du journal `docs/wip/questions-2de-progress.md`).
Points : 2-243 (ℝ, inclusions), 2-247 (𝔻), 2-248 (ℚ), 2-422 (irrationnels de la géométrie), 2-407
(notation des intervalles), 2-252 (appartenance), 2-246 (|x − a| ⩽ r), 2-251 (représenter un
intervalle). Un point par modèle ; nœud et tag posés par la migration de rangement.

Décisions et pièges :
- L9-d : irrationnels √2, π et √3 (diagonale du carré, cercle, hauteur du triangle équilatéral) ;
- 2-243 : « le plus petit ensemble » (un seul choix), car 5b20321f (2-204) coche déjà tous les
  ensembles d'un nombre et 5062197a (2-403) fait le vrai / faux des inclusions ;
- 2-246 : sens ⩽ et < seulement (décision l2-3) ; le corrigé dessine l'intervalle avec `segments:`
  (#2294) et 2-251 se sert du geste `representer:` (#2309) : mergés, PAS en prod au 2026-11-03 →
  brouillons jusqu'au `deploy:prod` qui les livre ;
- la réponse d'une droite à représenter n'est jamais écrite dans le modèle (le générateur la tire du
  bloc) ; ses specs s'écrivent `[2 ; +∞[` ;
- jamais de décimal calculé par `eval` dans un texte (point au lieu de virgule) : les décimaux sont
  écrits chiffre par chiffre (`{{a}}{,}{{b}}`) ;
- niveaux relevés en prod le 2026-11-03 : Logique › Ensembles › Ensembles de nombres (neuve) 1 à 4 ;
  › Intervalles 2 pris → 1, 3, 4 ; Fonctions › Valeur absolue › Inéquations (neuve) → 1.

    python3 docs/wip/questions-2de/lot-ensembles-intervalles-b-2de.py scripts/questions/2de-intervalles-b
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


def modele(nom, title, description, categorie, level, variations, specs, options=None, delay=60):
    m = {'title': title, 'description': description, 'grades': ['2'], 'theme': categorie[0],
         'domain': categorie[1], 'subdomain': categorie[2], 'level': level, 'delay': delay,
         'status': 'draft'}
    if options:
        m['options'] = options
    m['shared'] = {'cleanCoefficients': True}
    m['variations'] = variations
    m['testSpecs'] = specs
    return nom, m


def var(nom, expression):
    return {'name': nom, 'expression': expression}


def variation(statement, variables, blanks, steps, conditions=None):
    v = {'statement': statement, 'variables': variables}
    if conditions:
        v['conditions'] = conditions
    if blanks is not None:
        v['blanks'] = blanks
    v['correction'] = {'steps': steps}
    return v


def case(attendu, kind=None):
    c = {'expectedAnswer': attendu}
    if kind:
        c['answerKind'] = kind
    return c


def col(x, k=0):
    return '\\textcolor{{{color:primary.' + str(k) + '}}}{' + x + '}'


def choix(question, options, plusieurs=False, melanger=True):
    tete = []
    if plusieurs:
        tete.append('plusieurs: oui')
    if not melanger:
        tete.append('melanger: non')
    return (question + '\n\n```choix\n' + ''.join(t + '\n' for t in tete)
            + ''.join('- ' + o + '\n' for o in options) + '```')


def selon(nom, valeurs, debut=0):
    """`{{if:nom==debut|v0|{{if:nom==debut+1|v1|…}}}}` ; la dernière valeur est le « sinon »."""
    texte = valeurs[-1]
    for k in range(len(valeurs) - 2, -1, -1):
        texte = '{{if:' + nom + '==' + str(debut + k) + '|' + valeurs[k] + '|' + texte + '}}'
    return texte


def droite(debut, fin, *lignes):
    return '```line\nstart: ' + debut + '\nend: ' + fin + '\nstep: 1\n' + ''.join(l + '\n' for l in lignes) + '```'


MODELES = []
ENSEMBLES = ('Logique', 'Ensembles', 'Ensembles de nombres')
INTERVALLES = ('Logique', 'Ensembles', 'Intervalles')
N, Z, D, Q, R = '\\mathbb{N}', '\\mathbb{Z}', '𝔻', '\\mathbb{Q}', '\\mathbb{R}'
CHAINE = ('On a $' + N + '\\subset' + Z + '\\subset' + D + '\\subset' + Q + '\\subset' + R
          + '$ : chaque ensemble contient le précédent.')
OPTIONS_ENSEMBLES = ['$' + N + '$', '$' + Z + '$', '$' + D + '$', '$' + Q + '$', '$' + R + '$']


def plus_petit(x):
    return choix('Quel est le **plus petit** ensemble de nombres qui contient $x=' + x + '$ ?',
                 OPTIONS_ENSEMBLES, melanger=False)


# --- 1. 2-243 : ℝ et le plus petit ensemble --------------------------------------------------

PP_NATUREL = variation(
    plus_petit('\\dfrac{ {{eval:(a)*(b)}} }{ {{b}} }'),
    [var('a', '2..9'), var('b', '2..7')],
    [case('0')],
    [CHAINE, '$x=\\dfrac{ {{eval:(a)*(b)}} }{ {{b}} }={{a}}$ est un entier positif : $x\\in' + col(N) + '$, le plus'
     ' petit des cinq.'])

PP_RELATIF = variation(
    plus_petit('-\\sqrt{ {{eval:(a)^2}} }'),
    [var('a', '2..12')],
    [case('1')],
    [CHAINE, '$x=-\\sqrt{ {{eval:(a)^2}} }=-{{a}}$ est un entier négatif : $x\\notin' + N + '$ mais $x\\in'
     + col(Z) + '$.'])

PP_DECIMAL = variation(
    plus_petit('\\dfrac{ {{p}} }{ {{q}} }'),
    [var('q', '4|5|20|25|50'), var('p', '1..99')],
    [case('2')],
    [CHAINE, '$x=\\dfrac{ {{p}} }{ {{q}} }=\\dfrac{ {{eval:(p)*100/(q)}} }{100}$ : une fraction de dénominateur'
     ' $100$, donc $x$ est **décimal**, sans être entier : $x\\in' + col(D) + '$, $x\\notin' + Z + '$.'],
    ['gcd(p,q) == 1', 'p > q'])

PP_RATIONNEL = variation(
    plus_petit('\\dfrac{ {{p}} }{ {{q}} }'),
    [var('q', '3|6|7|9|11'), var('p', '1..40')],
    [case('3')],
    [CHAINE, 'La fraction $\\dfrac{ {{p}} }{ {{q}} }$ est irréductible et son dénominateur ${{q}}$ a un facteur'
     ' premier autre que $2$ et $5$ : $x$ n\'est pas décimal (son écriture décimale ne s\'arrête pas).',
     'C\'est un quotient d\'entiers : $x\\in' + col(Q) + '$.'],
    ['gcd(p,q) == 1'])

PP_REEL = variation(
    plus_petit('\\sqrt{ {{k}} }'),
    [var('k', '2|3|5|6|7|8|10|11|12|13')],
    [case('4')],
    [CHAINE, '${{k}}$ n\'est pas le carré d\'un entier : $\\sqrt{ {{k}} }$ est **irrationnel** (admis), il n\'est'
     ' dans aucun des quatre premiers ensembles : $x\\in' + col(R) + '$.'])

MODELES.append(modele(
    '01-plus-petit-ensemble', 'Le plus petit ensemble de nombres',
    'Choisir le plus petit des ensembles ℕ ⊂ ℤ ⊂ 𝔻 ⊂ ℚ ⊂ ℝ qui contient 12/4, −√49, 7/4, 5/3, √7',
    ENSEMBLES, 1,
    [PP_NATUREL, PP_RELATIF, PP_DECIMAL, PP_RATIONNEL, PP_REEL],
    [spec('15/5 : ℕ', 0, {'a': 3, 'b': 5}, '0', 'correct'),
     spec('Erreur : ℚ (une fraction)', 0, {'a': 3, 'b': 5}, '3', 'incorrect'),
     spec('−√49 : ℤ', 1, {'a': 7}, '1', 'correct'),
     spec('Erreur : ℝ (une racine)', 1, {'a': 7}, '4', 'incorrect'),
     spec('7/4 : 𝔻', 2, {'q': 4, 'p': 7}, '2', 'correct'),
     spec('Erreur : ℚ', 2, {'q': 4, 'p': 7}, '3', 'incorrect'),
     spec('5/3 : ℚ', 3, {'q': 3, 'p': 5}, '3', 'correct'),
     spec('Erreur : 𝔻', 3, {'q': 3, 'p': 5}, '2', 'incorrect'),
     spec('√7 : ℝ', 4, {'k': 7}, '4', 'correct'),
     spec('Erreur : ℚ', 4, {'k': 7}, '3', 'incorrect')]))

# --- 2. 2-247 : nombres décimaux --------------------------------------------------------------

DEF_DECIMAL = ('Un nombre est **décimal** s\'il s\'écrit $\\dfrac{a}{10^n}$, avec $a$ entier. Une fraction'
               ' **irréductible** est décimale exactement quand son dénominateur n\'a pas d\'autre facteur premier'
               ' que $2$ et $5$.')

EST_DECIMAL = variation(
    choix('Le nombre $\\dfrac{ {{p}} }{ {{eval:(w)*(qb)+(1-(w))*(qa)}} }$ est-il décimal ?', ['Oui', 'Non'],
          melanger=False),
    [var('w', '0|1'), var('qa', '4|8|20|25|40'), var('qb', '3|6|7|12|15'), var('p', '1..39')],
    [case('{{w}}')],
    [DEF_DECIMAL,
     '{{if:w==0|La fraction est irréductible et ${{qa}}$ divise $1000$ : $\\dfrac{ {{p}} }{ {{qa}} }='
     + col('\\dfrac{ {{eval:(p)*1000/(qa)}} }{1000}') + '$. **Oui**, il est décimal.|La fraction est irréductible'
     ' et ${{qb}}$ a le facteur premier ${{if:qb==7|7|3}}$ : aucune puissance de $10$ n\'est un multiple de'
     ' ${{qb}}$. **Non**, il n\'est pas décimal.}}'],
    ['gcd(p,qa) == 1', 'gcd(p,qb) == 1'])

LESQUELS_DECIMAUX = variation(
    choix('Quels nombres sont décimaux ?',
          ['$\\dfrac{ {{a}} }{4}$', '$\\dfrac{1}{3}$', '$-{{b}}{,}{{c}}$', '$\\dfrac{ {{d}} }{6}$',
           '$\\dfrac{ {{f}} }{20}$', '$\\sqrt{2}$'], plusieurs=True),
    [var('a', '1|3|5|7|9|11'), var('b', '0..9'), var('c', '1..9'), var('d', '1|5|7|11|13'),
     var('f', '1|3|7|9|11|13')],
    [case('0;2;4')],
    [DEF_DECIMAL,
     '**Décimaux** : $\\dfrac{ {{a}} }{4}=' + col('\\dfrac{ {{eval:25*(a)}} }{100}') + '$ ; $-{{b}}{,}{{c}}='
     + col('-\\dfrac{ {{eval:10*(b)+(c)}} }{10}') + '$ ; $\\dfrac{ {{f}} }{20}=' + col('\\dfrac{ {{eval:5*(f)}} }{100}')
     + '$.',
     '**Non décimaux** : $\\dfrac{1}{3}$ et $\\dfrac{ {{d}} }{6}$ (facteur premier $3$ au dénominateur de la fraction'
     ' irréductible) ; $\\sqrt{2}$, irrationnel.'])

MODELES.append(modele(
    '02-nombre-decimal', 'Nombre décimal ou non',
    'Dire si p/q irréductible est décimal (q = 8, 25, 40… ou 3, 7, 12…) ; cocher les décimaux parmi a/4,'
    ' 1/3, −2,5, d/6, f/20, √2',
    ENSEMBLES, 2,
    [EST_DECIMAL, LESQUELS_DECIMAUX],
    [spec('7/8 : oui', 0, {'w': 0, 'qa': 8, 'qb': 3, 'p': 7}, '0', 'correct'),
     spec('Erreur : 7/8 non', 0, {'w': 0, 'qa': 8, 'qb': 3, 'p': 7}, '1', 'incorrect'),
     spec('5/12 : non', 0, {'w': 1, 'qa': 8, 'qb': 12, 'p': 5}, '1', 'correct'),
     spec('Les trois décimaux', 1, {'a': 3, 'b': 2, 'c': 5, 'd': 5, 'f': 7}, '0;2;4', 'correct'),
     spec('Un décimal oublié (½)', 1, {'a': 3, 'b': 2, 'c': 5, 'd': 5, 'f': 7}, '0;2', 'unoptimal_form'),
     spec('Erreur : 1/3 coché', 1, {'a': 3, 'b': 2, 'c': 5, 'd': 5, 'f': 7}, '0;1;2;4', 'incorrect')]))

# --- 3. 2-248 : rationnels -------------------------------------------------------------------

DEF_RATIONNEL = 'Un nombre est **rationnel** s\'il s\'écrit $\\dfrac{a}{b}$, avec $a$ et $b\\neq0$ entiers.'
EN_FRACTION = 'Écris ce nombre sous la forme d\'une fraction irréductible.'

UN_CHIFFRE = variation(
    EN_FRACTION + '\n\n$${{if:s==1|-}}{{a}}{,}{{b}}=?$$',
    [var('s', '0|1'), var('a', '0..9'), var('b', '2|4|5|6|8')],
    [case('{{if:s==1|-}}\\frac{ {{eval:(10*(a)+(b))/gcd(10*(a)+(b),10)}} }{ {{eval:10/gcd(10*(a)+(b),10)}} }')],
    [DEF_RATIONNEL,
     '$${{if:s==1|-}}{{a}}{,}{{b}}={{if:s==1|-}}\\dfrac{ {{eval:10*(a)+(b)}} }{10}=' + col(
         '{{if:s==1|-}}\\dfrac{ {{eval:(10*(a)+(b))/gcd(10*(a)+(b),10)}} }{ {{eval:10/gcd(10*(a)+(b),10)}} }')
     + '$$',
     'On a simplifié par ${{eval:gcd(10*(a)+(b),10)}}$.'])

TROIS_CHIFFRES = variation(
    EN_FRACTION + '\n\n$$0{,}{{c}}{{d}}5=?$$',
    [var('c', '0..9'), var('d', '0..9')],
    [case('\\frac{ {{eval:(100*(c)+10*(d)+5)/gcd(100*(c)+10*(d)+5,1000)}} }'
          '{ {{eval:1000/gcd(100*(c)+10*(d)+5,1000)}} }')],
    [DEF_RATIONNEL,
     '$$0{,}{{c}}{{d}}5=\\dfrac{ {{eval:100*(c)+10*(d)+5}} }{1000}=' + col(
         '\\dfrac{ {{eval:(100*(c)+10*(d)+5)/gcd(100*(c)+10*(d)+5,1000)}} }'
         '{ {{eval:1000/gcd(100*(c)+10*(d)+5,1000)}} }') + '$$',
     'On a simplifié par ${{eval:gcd(100*(c)+10*(d)+5,1000)}}$.'],
    ['10*c+d > 0'])

MODELES.append(modele(
    '03-decimal-en-fraction', 'Écrire un décimal comme quotient d\'entiers',
    'Écrire −1,4 = −7/5 ou 0,125 = 1/8 en fraction irréductible',
    ENSEMBLES, 3,
    [UN_CHIFFRE, TROIS_CHIFFRES],
    [spec('1,4 = 7/5', 0, {'s': 0, 'a': 1, 'b': 4}, '\\frac{7}{5}', 'correct'),
     spec('Non simplifiée (14/10)', 0, {'s': 0, 'a': 1, 'b': 4}, '\\frac{14}{10}', 'unoptimal_form',
          ['reducedFractions']),
     spec('Erreur : 1/4', 0, {'s': 0, 'a': 1, 'b': 4}, '\\frac{1}{4}', 'incorrect'),
     spec('−2,5 = −5/2', 0, {'s': 1, 'a': 2, 'b': 5}, '-\\frac{5}{2}', 'correct'),
     spec('0,125 = 1/8', 1, {'c': 1, 'd': 2}, '\\frac{1}{8}', 'correct'),
     spec('Non simplifiée (125/1000)', 1, {'c': 1, 'd': 2}, '\\frac{125}{1000}', 'unoptimal_form',
          ['reducedFractions']),
     spec('Erreur : 125/100', 1, {'c': 1, 'd': 2}, '\\frac{125}{100}', 'incorrect')]))

# --- 4. 2-422 : irrationnels de la géométrie ------------------------------------------------

IRRATIONNEL = ('$\\sqrt{2}$, $\\sqrt{3}$ et $\\pi$ sont **irrationnels** (admis) : ils ne s\'écrivent pas'
               ' comme quotient de deux entiers.')

DIAGONALE = variation(
    'Un carré a pour côté ${{c}}$ cm. Donne la longueur exacte de sa diagonale, en cm.\n\n$$d=?$$',
    [var('c', '2..9')],
    [case('{{c}}\\sqrt{2}')],
    ['Théorème de Pythagore dans le triangle rectangle formé par deux côtés et la diagonale :',
     '$$d^2={{c}}^2+{{c}}^2={{eval:2*(c)^2}}\\qquad d=\\sqrt{ {{eval:2*(c)^2}} }=' + col('{{c}}\\sqrt{2}') + '$$',
     IRRATIONNEL + ' La diagonale d\'un carré de côté entier n\'a pas une longueur rationnelle.'])

HAUTEUR = variation(
    'Un triangle équilatéral a pour côté ${{eval:2*(c)}}$ cm. Donne la longueur exacte de sa hauteur, en cm.'
    '\n\n$$h=?$$',
    [var('c', '1..6')],
    [case('{{c}}\\sqrt{3}')],
    ['La hauteur tombe au milieu du côté : triangle rectangle d\'hypoténuse ${{eval:2*(c)}}$ et de côté ${{c}}$.',
     '$$h^2={{eval:2*(c)}}^2-{{c}}^2={{eval:3*(c)^2}}\\qquad h=\\sqrt{ {{eval:3*(c)^2}} }=' + col('{{c}}\\sqrt{3}')
     + '$$',
     IRRATIONNEL])

CERCLE = variation(
    'Un cercle a pour diamètre ${{d}}$ cm. Donne la valeur exacte de son périmètre, en cm.\n\n$$P=?$$',
    [var('d', '2..12')],
    [case('{{d}}\\pi')],
    ['$$P=\\pi\\times d=' + col('{{d}}\\pi') + '$$', IRRATIONNEL + ' Une valeur approchée, $3{,}14\\times{{d}}$,'
     ' n\'est pas la valeur exacte.'])

LESQUELS_IRRATIONNELS = variation(
    choix('Quels nombres sont irrationnels ?',
          ['$\\sqrt{2}$', '$\\sqrt{ {{eval:(k)^2}} }$', '$\\pi$', '$\\dfrac{22}{7}$', '$3{,}14$',
           '$\\sqrt{3}$'], plusieurs=True),
    [var('k', '3..9')],
    [case('0;2;5')],
    [IRRATIONNEL,
     '**Rationnels** : $\\sqrt{ {{eval:(k)^2}} }={{k}}$ ; $\\dfrac{22}{7}$ (un quotient d\'entiers, valeur'
     ' approchée de $\\pi$ seulement) ; $3{,}14=\\dfrac{314}{100}$.'])

MODELES.append(modele(
    '04-irrationnels-geometrie', 'Nombres irrationnels de la géométrie',
    'Diagonale d\'un carré (c√2), hauteur d\'un triangle équilatéral (c√3), périmètre d\'un cercle (dπ) ;'
    ' cocher √2, π, √3 parmi des rationnels',
    ENSEMBLES, 4,
    [DIAGONALE, HAUTEUR, CERCLE, LESQUELS_IRRATIONNELS],
    [spec('Côté 5 : 5√2', 0, {'c': 5}, '5\\sqrt{2}', 'correct'),
     spec('Racine non simplifiée (√50)', 0, {'c': 5}, '\\sqrt{50}', 'unoptimal_form',
          ['reducedRadicals']),
     spec('Erreur : 10', 0, {'c': 5}, '10', 'incorrect'),
     spec('Côté 6 : 3√3', 1, {'c': 3}, '3\\sqrt{3}', 'correct'),
     spec('Erreur : 3√5 (somme au lieu de différence)', 1, {'c': 3}, '3\\sqrt{5}', 'incorrect'),
     spec('Diamètre 7 : 7π', 2, {'d': 7}, '7\\pi', 'correct'),
     spec('Erreur : 14π (rayon pris pour le diamètre)', 2, {'d': 7}, '14\\pi', 'incorrect'),
     spec('√2, π, √3', 3, {'k': 5}, '0;2;5', 'correct'),
     spec('Erreur : 22/7 coché', 3, {'k': 5}, '0;2;3;5', 'incorrect')]))

# --- 5. 2-407 : notation des intervalles ---------------------------------------------------

DEF_CROCHETS = ('Le crochet est **tourné vers le nombre** quand il est compris ($\\leqslant$), **tourné vers'
                ' l\'extérieur** quand il est exclu ($<$). Du côté de $\\pm\\infty$, le crochet est toujours'
                ' ouvert.')
CONSIGNE_INTERVALLE = 'Écris l\'ensemble des réels $x$ tels que'

BORNE = variation(
    CONSIGNE_INTERVALLE + ' ${{a}}{{if:sa==1|\\leqslant|<}}x{{if:sb==1|\\leqslant|<}}{{b}}$ sous la forme d\'un'
    ' intervalle.\n\n$$?$$',
    [var('a', '-9..5'), var('l', '2..9'), var('b', 'eval:a+l'), var('sa', '0|1'), var('sb', '0|1')],
    [case('{{if:sa==1|[|]}}{{a}};{{b}}{{if:sb==1|]|[}}', 'intervalles')],
    [DEF_CROCHETS,
     '${{a}}$ est {{if:sa==1|compris|exclu}}, ${{b}}$ est {{if:sb==1|compris|exclu}} :',
     '$$x\\in' + col('{{if:sa==1|[|]}}{{a}}\\,;\\,{{b}}{{if:sb==1|]|[}}') + '$$'])

DEMI_DROITE = variation(
    CONSIGNE_INTERVALLE + ' $x{{if:d==1|{{if:s==1|\\geqslant|>}}|{{if:s==1|\\leqslant|<}}}}{{a}}$ sous la forme'
    ' d\'un intervalle.\n\n$$?$$',
    [var('a', '-9..9'), var('d', '0|1'), var('s', '0|1')],
    [case('{{if:d==1|{{if:s==1|[|]}}{{a}};+\\infty[|]-\\infty;{{a}}{{if:s==1|]|[}}}}', 'intervalles')],
    [DEF_CROCHETS,
     'Les solutions sont {{if:d==1|à droite|à gauche}} de ${{a}}$, qui est {{if:s==1|compris|exclu}} :',
     '$$x\\in' + col('{{if:d==1|{{if:s==1|[|]}}{{a}}\\,;\\,+\\infty[|]-\\infty\\,;\\,{{a}}{{if:s==1|]|[}}}}')
     + '$$'])

INEGALITE = variation(
    choix('Quelle inégalité traduit $x\\in[{{a}}\\,;\\,{{b}}[$ ?',
          ['${{a}}\\leqslant x<{{b}}$', '${{a}}<x\\leqslant{{b}}$', '${{a}}\\leqslant x\\leqslant{{b}}$',
           '${{a}}<x<{{b}}$']),
    [var('a', '-9..5'), var('l', '2..9'), var('b', 'eval:a+l')],
    [case('0')],
    [DEF_CROCHETS,
     'Le crochet de ${{a}}$ est tourné vers lui (compris), celui de ${{b}}$ vers l\'extérieur (exclu) :',
     '$$' + col('{{a}}\\leqslant x<{{b}}') + '$$'])

SP_BO = {'a': -2, 'l': 7, 'b': 5, 'sa': 0, 'sb': 1}
SP_DD = {'a': 3, 'd': 1, 's': 1}
SP_DG = {'a': -1, 'd': 0, 's': 0}
MODELES.append(modele(
    '05-notation-intervalles', 'Inégalités et intervalles',
    'Écrire −2 < x ⩽ 5 et x ⩾ 3 sous forme d\'intervalle ; l\'inégalité qui traduit x ∈ [a ; b[',
    INTERVALLES, 1,
    [BORNE, DEMI_DROITE, INEGALITE],
    [spec('−2 < x ⩽ 5 : ]−2 ; 5]', 0, SP_BO, ']-2;5]', 'correct'),
     spec('Erreur : crochet de −2 tourné vers lui', 0, SP_BO, '[-2;5]', 'incorrect'),
     spec('Erreur : bornes inversées', 0, SP_BO, ']5;-2]', 'incorrect'),
     spec('x ⩾ 3 : [3 ; +∞[', 1, SP_DD, '[3;+\\infty[', 'correct'),
     spec('Erreur : crochet fermé sur l\'infini', 1, SP_DD, '[3;+\\infty]', 'incorrect'),
     spec('x < −1 : ]−∞ ; −1[', 1, SP_DG, ']-\\infty;-1[', 'correct'),
     spec('Erreur : mauvais côté', 1, SP_DG, ']-1;+\\infty[', 'incorrect'),
     spec('[−2 ; 5[ : −2 ⩽ x < 5', 2, {'a': -2, 'l': 7, 'b': 5}, '0', 'correct'),
     spec('Erreur : crochets lus à l\'envers', 2, {'a': -2, 'l': 7, 'b': 5}, '1', 'incorrect')]))

# --- 6. 2-252 : appartenance à un intervalle ---------------------------------------------------

OUI_NON = ['Oui', 'Non']

BORNE_INCLUSE = variation(
    choix('${{if:w==1|{{b}}|{{a}}}}\\in{{if:sa==1|[|]}}{{a}}\\,;\\,{{b}}{{if:sb==1|]|[}}$ ?', OUI_NON,
          melanger=False),
    [var('a', '-9..5'), var('l', '2..9'), var('b', 'eval:a+l'), var('sa', '0|1'), var('sb', '0|1'),
     var('w', '0|1')],
    [case('{{eval:(1-(w))*(1-(sa))+(w)*(1-(sb))}}')],
    [DEF_CROCHETS,
     '${{if:w==1|{{b}}|{{a}}}}$ est une borne de l\'intervalle ; son crochet est tourné {{if:w==1|{{if:sb==1|vers'
     ' lui : elle est **comprise**, oui|vers l\'extérieur : elle est **exclue**, non}}|{{if:sa==1|vers lui : elle est'
     ' **comprise**, oui|vers l\'extérieur : elle est **exclue**, non}}}}.'])

PRES_BORNE = variation(
    choix('${{if:u==1|{{b}}{,}01|{{eval:(b)-1}}{,}99}}\\in[{{a}}\\,;\\,{{b}}[$ ?', OUI_NON, melanger=False),
    [var('a', '-5..0'), var('b', '2..9'), var('u', '0|1')],
    [case('{{u}}')],
    ['$x\\in[{{a}}\\,;\\,{{b}}[$ veut dire ${{a}}\\leqslant x<{{b}}$.',
     '{{if:u==1|$' + col('{{b}}{,}01>{{b}}') + '$ : **non**, il est à droite de l\'intervalle.|$' + col(
         '{{a}}\\leqslant{{eval:(b)-1}}{,}99<{{b}}') + '$ : **oui**, il est juste avant ${{b}}$, exclu.}}'])

IRRATIONNEL_DEDANS = variation(
    choix('$' + selon('t', ['\\sqrt{2}\\in[1{,}4\\,;\\,1{,}5]', '\\pi\\in\\,]3{,}14\\,;\\,3{,}15[',
                            '\\sqrt{3}\\in[1{,}8\\,;\\,2]', '\\sqrt{5}\\in\\,]2{,}2\\,;\\,2{,}3[',
                            '\\sqrt{10}\\in[3\\,;\\,3{,}1]']) + '$ ?', OUI_NON, melanger=False),
    [var('t', '0..4')],
    [case(selon('t', ['0', '0', '1', '0', '1']))],
    ['On compare les carrés (tous les nombres sont positifs), ou on utilise une valeur approchée.',
     selon('t', ['$1{,}4^2=1{,}96<2<2{,}25=1{,}5^2$ : $' + col('1{,}4<\\sqrt{2}<1{,}5') + '$, **oui**.',
                 '$\\pi\\approx3{,}14159$ : $' + col('3{,}14<\\pi<3{,}15') + '$, **oui**.',
                 '$1{,}8^2=3{,}24>3$ : $' + col('\\sqrt{3}<1{,}8') + '$, **non** ($\\sqrt{3}\\approx1{,}732$).',
                 '$2{,}2^2=4{,}84<5<5{,}29=2{,}3^2$ : $' + col('2{,}2<\\sqrt{5}<2{,}3') + '$, **oui**.',
                 '$3{,}1^2=9{,}61<10$ : $' + col('\\sqrt{10}>3{,}1') + '$, **non** ($\\sqrt{10}\\approx3{,}162$).'])])

MODELES.append(modele(
    '06-appartenance-intervalle', 'Un réel appartient-il à un intervalle ?',
    'Une borne comprise ou exclue ; 3,99 ou 4,01 et [−1 ; 4[ ; √2 ∈ [1,4 ; 1,5], π ∈ ]3,14 ; 3,15[, √3 ∈'
    ' [1,8 ; 2]…',
    INTERVALLES, 3,
    [BORNE_INCLUSE, PRES_BORNE, IRRATIONNEL_DEDANS],
    [spec('5 ∈ ]−2 ; 5] : oui', 0, {'a': -2, 'l': 7, 'b': 5, 'sa': 0, 'sb': 1, 'w': 1}, '0', 'correct'),
     spec('−2 ∈ ]−2 ; 5] : non', 0, {'a': -2, 'l': 7, 'b': 5, 'sa': 0, 'sb': 1, 'w': 0}, '1', 'correct'),
     spec('Erreur : −2 ∈ ]−2 ; 5]', 0, {'a': -2, 'l': 7, 'b': 5, 'sa': 0, 'sb': 1, 'w': 0}, '0', 'incorrect'),
     spec('3,99 ∈ [−1 ; 4[ : oui', 1, {'a': -1, 'b': 4, 'u': 0}, '0', 'correct'),
     spec('4,01 ∈ [−1 ; 4[ : non', 1, {'a': -1, 'b': 4, 'u': 1}, '1', 'correct'),
     spec('√2 ∈ [1,4 ; 1,5] : oui', 2, {'t': 0}, '0', 'correct'),
     spec('√3 ∈ [1,8 ; 2] : non', 2, {'t': 2}, '1', 'correct'),
     spec('Erreur : √3 ∈ [1,8 ; 2]', 2, {'t': 2}, '0', 'incorrect')]))

# --- 7. 2-246 : |x − a| ⩽ r --------------------------------------------------------------------

DISTANCE = ('$\\lvert x-a\\rvert$ est la **distance** entre $x$ et $a$ sur la droite numérique. Les réels à'
            ' une distance de $a$ inférieure à $r$ forment l\'intervalle centré en $a$ de rayon $r$.')


def x_moins(a):
    """`x - a`, ou `x + |a|` si a est négatif."""
    return 'x{{if:' + a + '<0|+{{eval:-(' + a + ')}}|-{{' + a + '}}}}'


def corrige_distance(large):
    o, f = ('[', ']') if large else (']', '[')
    return [DISTANCE,
            '$\\lvert ' + x_moins('a') + '\\rvert=\\lvert x-({{a}})\\rvert$ : distance entre $x$ et ${{a}}$,'
            ' ' + ('au plus' if large else 'strictement moins que') + ' ${{r}}$.',
            '$${{a}}-{{r}}' + ('\\leqslant' if large else '<') + 'x' + ('\\leqslant' if large else '<')
            + '{{a}}+{{r}}\\qquad x\\in' + col(o + '{{eval:(a)-(r)}}\\,;\\,{{eval:(a)+(r)}}' + f) + '$$',
            droite('{{eval:(a)-(r)-2}}', '{{eval:(a)+(r)+2}}',
                   'segments: ' + o + '{{eval:(a)-(r)}}, {{eval:(a)+(r)}}' + f,
                   'points: A={{a}}')]


ABS_LARGE = variation(
    'Écris sous la forme d\'un intervalle l\'ensemble des réels $x$ tels que $\\lvert ' + x_moins('a')
    + '\\rvert\\leqslant{{r}}$.\n\n$$?$$',
    [var('a', '-6..6!0'), var('r', '1..6')],
    [case('[{{eval:(a)-(r)}};{{eval:(a)+(r)}}]', 'intervalles')],
    corrige_distance(True))

ABS_STRICT = variation(
    'Écris sous la forme d\'un intervalle l\'ensemble des réels $x$ tels que $\\lvert ' + x_moins('a')
    + '\\rvert<{{r}}$.\n\n$$?$$',
    [var('a', '-6..6!0'), var('r', '1..6')],
    [case(']{{eval:(a)-(r)}};{{eval:(a)+(r)}}[', 'intervalles')],
    corrige_distance(False))

CENTRE_RAYON = variation(
    'L\'intervalle $[{{eval:(a)-(r)}}\\,;\\,{{eval:(a)+(r)}}]$ est l\'ensemble des réels $x$ tels que'
    ' $\\lvert x-a\\rvert\\leqslant r$. Donne $a$ et $r$.\n\n$a=?$ et $r=?$',
    [var('a', '-6..6!0'), var('r', '1..6'), var('lo', 'eval:a-r'), var('hi', 'eval:a+r')],
    [case('{{a}}'), case('{{r}}')],
    [DISTANCE,
     'Le centre est le milieu des bornes, le rayon la moitié de la longueur :',
     '$$a=\\dfrac{ {{lo}}+{{if:hi<0|({{hi}})|{{hi}}}} }{2}=' + col('{{a}}') + '\\qquad r=\\dfrac{ {{hi}}-'
     '{{if:lo<0|({{lo}})|{{lo}}}} }{2}=' + col('{{r}}', 1) + '$$'])

MODELES.append(modele(
    '07-valeur-absolue-intervalle', '|x − a| ⩽ r : un intervalle centré',
    'Écrire {x : |x − 3| ⩽ 2} = [1 ; 5] et {x : |x + 1| < 3} = ]−4 ; 2[ ; retrouver a et r de [2 ; 8]',
    ('Fonctions', 'Valeur absolue', 'Inéquations'), 1,
    [ABS_LARGE, ABS_STRICT, CENTRE_RAYON],
    [spec('|x − 3| ⩽ 2 : [1 ; 5]', 0, {'a': 3, 'r': 2}, '[1;5]', 'correct'),
     spec('Erreur : [r − a ; r + a]', 0, {'a': 3, 'r': 2}, '[-1;5]', 'incorrect'),
     spec('Erreur : crochets ouverts', 0, {'a': 3, 'r': 2}, ']1;5[', 'incorrect'),
     spec('|x + 1| < 3 : ]−4 ; 2[', 1, {'a': -1, 'r': 3}, ']-4;2[', 'correct'),
     spec('Erreur : centre 1 au lieu de −1', 1, {'a': -1, 'r': 3}, ']-2;4[', 'incorrect'),
     spec('[2 ; 8] : a = 5, r = 3', 2, {'a': 5, 'r': 3, 'lo': 2, 'hi': 8}, ['5', '3'], 'correct'),
     spec('Erreur : r = 6 (longueur entière)', 2, {'a': 5, 'r': 3, 'lo': 2, 'hi': 8}, ['5', '6'], 'incorrect')],
    delay=90))

# --- 8. 2-251 : représenter un intervalle -------------------------------------------------------

REPRESENTER = 'Représente sur la droite graduée'
CORRIGE_GESTE = ('Une borne comprise a un crochet **tourné vers l\'intervalle**, une borne exclue un crochet'
                 ' **tourné vers l\'extérieur** ; vers $\\pm\\infty$, le trait va jusqu\'au bout de la droite.')

REP_DROITE = variation(
    REPRESENTER + ' l\'ensemble des réels $x$ tels que $x{{if:s==1|\\geqslant|>}}{{a}}$.\n\n'
    + droite('-6', '6', 'representer: {{if:s==1|[|]}}{{a}}, +inf['),
    [var('a', '-4..4'), var('s', '0|1')],
    None,
    [CORRIGE_GESTE,
     '$x{{if:s==1|\\geqslant|>}}{{a}}$ : $x\\in' + col('{{if:s==1|[|]}}{{a}}\\,;\\,+\\infty[') + '$, à droite de'
     ' ${{a}}$, {{if:s==1|compris|exclu}}.'])

REP_GAUCHE = variation(
    REPRESENTER + ' l\'ensemble des réels $x$ tels que $x{{if:s==1|\\leqslant|<}}{{a}}$.\n\n'
    + droite('-6', '6', 'representer: ]-inf, {{a}}{{if:s==1|]|[}}'),
    [var('a', '-4..4'), var('s', '0|1')],
    None,
    [CORRIGE_GESTE,
     '$x{{if:s==1|\\leqslant|<}}{{a}}$ : $x\\in' + col(']-\\infty\\,;\\,{{a}}{{if:s==1|]|[}}') + '$, à gauche de'
     ' ${{a}}$, {{if:s==1|compris|exclu}}.'])

REP_BORNE = variation(
    REPRESENTER + ' l\'intervalle ${{if:sa==1|[|]}}{{a}}\\,;\\,{{b}}{{if:sb==1|]|[}}$.\n\n'
    + droite('-6', '6', 'representer: {{if:sa==1|[|]}}{{a}}, {{b}}{{if:sb==1|]|[}}'),
    [var('a', '-5..2'), var('l', '2..6'), var('b', 'eval:a+l'), var('sa', '0|1'), var('sb', '0|1')],
    None,
    [CORRIGE_GESTE,
     '${{a}}$ est {{if:sa==1|compris|exclu}}, ${{b}}$ est {{if:sb==1|compris|exclu}}.'],
    ['b <= 5'])

MODELES.append(modele(
    '08-representer-intervalle', 'Représenter un intervalle sur la droite graduée',
    'Représenter x ⩾ a, x < a (demi-droites) et un intervalle borné [a ; b[ : bornes, côté, crochets',
    INTERVALLES, 4,
    [REP_DROITE, REP_GAUCHE, REP_BORNE],
    [spec('x ⩾ 2 : [2 ; +∞[', 0, {'a': 2, 's': 1}, '[2 ; +∞[', 'correct'),
     spec('Erreur : crochet exclu', 0, {'a': 2, 's': 1}, ']2 ; +∞[', 'incorrect'),
     spec('Erreur : mauvais côté', 0, {'a': 2, 's': 1}, ']-∞ ; 2]', 'incorrect'),
     spec('x < −1 : ]−∞ ; −1[', 1, {'a': -1, 's': 0}, ']-∞ ; -1[', 'correct'),
     spec('Erreur : −1 compris', 1, {'a': -1, 's': 0}, ']-∞ ; -1]', 'incorrect'),
     spec(']−1 ; 3]', 2, {'a': -1, 'l': 4, 'b': 3, 'sa': 0, 'sb': 1}, ']-1 ; 3]', 'correct'),
     spec('Erreur : crochets échangés', 2, {'a': -1, 'l': 4, 'b': 3, 'sa': 0, 'sb': 1}, '[-1 ; 3[', 'incorrect')],
    delay=90))

os.makedirs(DOSSIER, exist_ok=True)
for nom, m in MODELES:
    with open(os.path.join(DOSSIER, nom + '.json'), 'w', encoding='utf-8') as f:
        json.dump(m, f, ensure_ascii=False, indent='\t')
        f.write('\n')
# Mis en forme comme le pre-commit, pour que le script redonne les fichiers commités
subprocess.run(['pnpm', 'exec', 'prettier', '--write', DOSSIER], check=True,
               stdout=subprocess.DEVNULL)
print(f'{len(MODELES)} modèles écrits dans {DOSSIER}')
