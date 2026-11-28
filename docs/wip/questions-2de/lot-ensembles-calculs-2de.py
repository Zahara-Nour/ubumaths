"""Écrit les 3 modèles du lot 1 du chantier `ensembles-2de` dans scripts/questions/2de-ensembles-calculs/.

Phase 0 validée par David le 2026-11-20 (« je suis tes recos », journal `docs/archive/wip/ensembles-2de/ensembles-2de-progress.md`).
Points : 2-243 (ℕ, ℤ, 𝔻, ℚ, ℝ), 2-203 (symboles), 2-206 (complémentaire, notation E \\ A). Un point par
modèle ; nœud et tag posés par la migration de rangement, après le `--publier` de David.

Décisions et pièges :
- niveaux relevés en prod le 2026-11-20 (premier libre de chaque sous-notion) : ℕ, ℤ, 𝔻, ℚ, ℝ (1, 2, 3, 5,
  6, 7, 8 pris) → 4 ; Opérations sur les ensembles (1 à 4 pris) → 5 ; complémentaire (1, 4 pris) → 2 ;
- choix parmi ℕ, ℤ, 𝔻, ℚ, ℝ dans cet ordre (`melanger: non`), comme « Le plus petit ensemble de nombres » ;
- ensemble fini en réponse : `answerKind: intervalles` (sinon `\\{1;3\\}` et `\\varnothing` en `bad_form`) ;
- `eval:` ne connaît ni `==` ni `>` : indicatrices `1-min(abs(t-k),1)` ;
- variables `e` et `i` interdites ; `col()` seulement dans `$…$`.

    python3 docs/wip/questions-2de/lot-ensembles-calculs-2de.py scripts/questions/2de-ensembles-calculs
"""
import json
import os
import subprocess
import sys

DOSSIER = sys.argv[1]


def spec(desc, vi, variables, answers, status, violations=None):
    attendu = {'status': status}
    if violations is not None:
        attendu['constraintViolations'] = violations
    return {'description': desc, 'variationIndex': vi,
            'variables': {k: str(v) for k, v in variables.items()},
            'answers': answers if isinstance(answers, list) else [answers],
            'expected': attendu}


def modele(nom, title, description, level, variations, specs, delay=60, shared=None):
    m = {'title': title, 'description': description, 'grades': ['2'], 'level': level, 'delay': delay,
         'status': 'draft'}
    if shared:
        m['shared'] = shared
    m['variations'] = variations
    m['testSpecs'] = specs
    return nom, m


def var(nom, expression):
    return {'name': nom, 'expression': expression}


def variation(statement, variables, conditions, steps, blanks):
    v = {'statement': statement, 'variables': variables}
    if conditions:
        v['conditions'] = conditions
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


def indic(nom, k):
    """1 si la variable vaut k, 0 sinon (entiers)."""
    return '(1-min(abs((' + nom + ')-(' + str(k) + ')),1))'


N, Z, D, Q, R = '\\mathbb{N}', '\\mathbb{Z}', '𝔻', '\\mathbb{Q}', '\\mathbb{R}'
ACCOLADES = ('Écris cet ensemble entre accolades, en séparant les éléments par des points-virgules (par'
             ' exemple $\\{1;3;5\\}$) ; l\'ensemble vide s\'écrit $\\varnothing$.')
MODELES = []

# --- 1. 2-243 : le plus petit ensemble qui contient le résultat d'un calcul ---------------------

CHAINE = ('On a $' + N + '\\subset' + Z + '\\subset' + D + '\\subset' + Q + '\\subset' + R + '$ : chaque'
          ' ensemble contient le précédent. On **calcule** d\'abord $x$.')


def plus_petit(calcul):
    return choix('On note $x=' + calcul + '$.\n\nQuel est le **plus petit** ensemble de nombres qui contient $x$ ?',
                 ['$' + N + '$', '$' + Z + '$', '$' + D + '$', '$' + Q + '$', '$' + R + '$'], melanger=False)


DIFFERENCE = variation(
    plus_petit('{{a}}-{{b}}'),
    [var('a', '2..15'), var('d', '1..20'), var('b', 'eval:(a)+(d)')],
    None,
    [CHAINE,
     '$x={{a}}-{{b}}=-{{d}}$ est un entier **négatif** : $x\\notin' + N + '$, mais $x\\in' + col(Z) + '$.'],
    [case('1')])

RACINES = variation(
    plus_petit('\\sqrt{ {{eval:(a)^2}} }-\\sqrt{ {{eval:(b)^2}} }'),
    [var('a', '2..9'), var('d', '1..5'), var('b', 'eval:(a)+(d)')],
    None,
    [CHAINE,
     '$\\sqrt{ {{eval:(a)^2}} }={{a}}$ et $\\sqrt{ {{eval:(b)^2}} }={{b}}$ : les racines sont des **entiers**.',
     '$x={{a}}-{{b}}=-{{d}}$ est un entier négatif : $x\\notin' + N + '$, mais $x\\in' + col(Z) + '$.'],
    [case('1')])

FRACTIONS_ENTIER = variation(
    plus_petit('\\dfrac{ {{r}} }{ {{q}} }+\\dfrac{ {{b}} }{ {{q}} }'),
    [var('q', '3|6|7|9'), var('r', '1..8'), var('k', '1..3'), var('b', 'eval:(k)*(q)-(r)')],
    ['r < q', 'gcd(r,q) == 1'],
    [CHAINE,
     'Même dénominateur : $x=\\dfrac{ {{r}}+{{b}} }{ {{q}} }=\\dfrac{ {{eval:(k)*(q)}} }{ {{q}} }={{k}}$.',
     'Les deux fractions ne sont pas entières, mais leur somme l\'est : $x={{k}}\\in' + col(N) + '$.'],
    [case('0')])

FRACTIONS_DECIMALES = variation(
    plus_petit('\\dfrac{ {{a}} }{10}+\\dfrac{ {{b}} }{100}'),
    [var('a', '1..9'), var('b', '1..9')],
    None,
    [CHAINE,
     '$x=\\dfrac{ {{eval:10*(a)}} }{100}+\\dfrac{ {{b}} }{100}=\\dfrac{ {{eval:10*(a)+(b)}} }{100}=0{,}{{a}}{{b}}$.',
     'Une fraction de dénominateur $100$ : $x$ est **décimal**, sans être entier : $x\\in' + col(D) + '$,'
     ' $x\\notin' + Z + '$.'],
    [case('2')])

ENTIER_FRACTION = variation(
    plus_petit('{{a}}+\\dfrac{ {{p}} }{ {{q}} }'),
    [var('a', '1..9'), var('q', '3|7|9|11'), var('p', '1..10')],
    ['p < q', 'gcd(p,q) == 1'],
    [CHAINE,
     '$x={{a}}+\\dfrac{ {{p}} }{ {{q}} }=\\dfrac{ {{eval:(a)*(q)+(p)}} }{ {{q}} }$, fraction irréductible.',
     'Son dénominateur ${{q}}$ a un facteur premier autre que $2$ et $5$ : $x$ n\'est pas décimal (son écriture'
     ' décimale ne s\'arrête pas).',
     'C\'est un quotient d\'entiers : $x\\in' + col(Q) + '$.'],
    [case('3')])

ENTIER_RACINE = variation(
    plus_petit('{{a}}+\\sqrt{ {{k}} }'),
    [var('a', '1..9'), var('k', '2|3|5|6|7|10|11|13|15|17|19|29')],
    None,
    [CHAINE,
     '${{k}}$ n\'est pas un carré parfait : $\\sqrt{ {{k}} }$ n\'est pas rationnel.',
     'Si $x$ était rationnel, $\\sqrt{ {{k}} }=x-{{a}}$ le serait aussi : impossible. Donc $x\\notin' + Q
     + '$, et $x\\in' + col(R) + '$.'],
    [case('4')])

MODELES.append(modele(
    '01-plus-petit-ensemble-calcul', 'Le plus petit ensemble qui contient le résultat',
    'Calculer puis choisir ℕ, ℤ, 𝔻, ℚ ou ℝ : 3 − 15, √49 − √121, 1/3 + 2/3, 8/10 + 5/100, 3 + 4/7, 4 + √29'
    ' (pièges : juger sur l\'écriture et non sur le résultat)',
    4,
    [DIFFERENCE, RACINES, FRACTIONS_ENTIER, FRACTIONS_DECIMALES, ENTIER_FRACTION, ENTIER_RACINE],
    [spec('3 − 15 : ℤ', 0, {'a': 3, 'd': 12, 'b': 15}, '1', 'correct'),
     spec('Erreur : ℕ (signe oublié)', 0, {'a': 3, 'd': 12, 'b': 15}, '0', 'incorrect'),
     spec('√49 − √121 : ℤ', 1, {'a': 7, 'd': 4, 'b': 11}, '1', 'correct'),
     spec('Erreur : ℝ (à cause des racines)', 1, {'a': 7, 'd': 4, 'b': 11}, '4', 'incorrect'),
     spec('1/3 + 2/3 : ℕ', 2, {'q': 3, 'r': 1, 'k': 1, 'b': 2}, '0', 'correct'),
     spec('Erreur : ℚ (à cause des fractions)', 2, {'q': 3, 'r': 1, 'k': 1, 'b': 2}, '3', 'incorrect'),
     spec('8/10 + 5/100 : 𝔻', 3, {'a': 8, 'b': 5}, '2', 'correct'),
     spec('Erreur : ℚ', 3, {'a': 8, 'b': 5}, '3', 'incorrect'),
     spec('3 + 4/7 : ℚ', 4, {'a': 3, 'q': 7, 'p': 4}, '3', 'correct'),
     spec('Erreur : 𝔻', 4, {'a': 3, 'q': 7, 'p': 4}, '2', 'incorrect'),
     spec('4 + √29 : ℝ', 5, {'a': 4, 'k': 29}, '4', 'correct'),
     spec('Erreur : ℚ', 5, {'a': 4, 'k': 29}, '3', 'incorrect')],
    shared={'cleanCoefficients': True}))

# --- 2. 2-203 : ∈, ∉, ⊂ ou ⊄ --------------------------------------------------------------------

SYMB = ['$\\in$', '$\\notin$', '$\\subset$', '$\\not\\subset$']
REGLE = ('$\\in$ et $\\notin$ relient un **élément** à un ensemble ; $\\subset$ et $\\not\\subset$ relient deux'
         ' **ensembles** : $A\\subset B$ quand **tout** élément de $A$ est dans $B$, $A\\not\\subset B$ dès qu\'un'
         ' élément de $A$ n\'est pas dans $B$.')


def quel_symbole(gauche, droite):
    return choix('Complète par $\\in$, $\\notin$, $\\subset$ ou $\\not\\subset$.\n\n$$' + gauche + '\\;\\ldots\\;'
                 + droite + '$$', SYMB, melanger=False)


ENS = '\\{ {{a}};{{b}};{{c}} \\}'
VARS_ENS = [var('a', '2..9'), var('u', '3..6'), var('b', 'eval:(a)+(u)'), var('w', '4..9'),
            var('c', 'eval:(b)+(w)')]

NOMBRE_FINI = variation(
    quel_symbole('{{x}}', ENS),
    VARS_ENS + [var('z', '0|1'), var('x', 'eval:(z)*(b)+(1-(z))*((b)+2)'), var('rep', 'eval:1-(z)')],
    None,
    [REGLE,
     '${{x}}$ est un **nombre**, un élément : on choisit entre $\\in$ et $\\notin$.',
     '{{if:z==1|${{x}}$ est dans l\'ensemble : $' + col('{{x}}\\in' + ENS) + '$.|${{x}}$ n\'est pas dans'
     ' l\'ensemble : $' + col('{{x}}\\notin' + ENS) + '$.}}'],
    [case('{{rep}}')])

DEUX_FINIS = variation(
    quel_symbole('\\{ {{a}};{{y}} \\}', ENS),
    VARS_ENS + [var('z', '0|1'), var('y', 'eval:(z)*(c)+(1-(z))*((c)+1)'), var('rep', 'eval:3-(z)')],
    None,
    [REGLE,
     '$\\{ {{a}};{{y}} \\}$ est un **ensemble** : on choisit entre $\\subset$ et $\\not\\subset$.',
     '{{if:z==1|${{a}}$ et ${{y}}$ sont tous deux dans $' + ENS + '$ : $' + col('\\{ {{a}};{{y}} \\}\\subset'
     + ENS) + '$.|${{y}}$ n\'est pas dans $' + ENS + '$ : $' + col('\\{ {{a}};{{y}} \\}\\not\\subset' + ENS)
     + '$.}}'],
    [case('{{rep}}')])

NOMBRE_ENSEMBLE = variation(
    quel_symbole(selon('t', ['-{{a}}', '-{{a}}', '\\dfrac{1}{ {{q}} }', '\\sqrt{ {{k}} }', '\\dfrac{ {{a}} }{ {{q}} }']),
                 selon('t', [N, Z, D, Q, Q])),
    [var('t', '0..4'), var('a', '2..9'), var('q', '3|7|9'), var('k', '2|3|5|7|11'),
     var('rep', 'eval:1-' + indic('t', 1) + '-' + indic('t', 4))],
    None,
    [REGLE,
     'À gauche, un **nombre** : on choisit entre $\\in$ et $\\notin$.',
     selon('t', [
         '$-{{a}}$ est négatif, ce n\'est pas un entier naturel : $' + col('-{{a}}\\notin' + N) + '$.',
         '$-{{a}}$ est un entier relatif : $' + col('-{{a}}\\in' + Z) + '$.',
         '$\\dfrac{1}{ {{q}} }$ a une écriture décimale qui ne s\'arrête pas : $' + col('\\dfrac{1}{ {{q}} }\\notin'
         + D) + '$.',
         '${{k}}$ n\'est pas un carré parfait, $\\sqrt{ {{k}} }$ n\'est pas rationnel : $' + col('\\sqrt{ {{k}} }'
         '\\notin' + Q) + '$.',
         '$\\dfrac{ {{a}} }{ {{q}} }$ est un quotient d\'entiers : $' + col('\\dfrac{ {{a}} }{ {{q}} }\\in' + Q)
         + '$.'])],
    [case('{{rep}}')])

DEUX_ENSEMBLES = variation(
    quel_symbole(selon('t', [N, Z, D, R, Q]), selon('t', [Z, N, Q, Q, D])),
    [var('t', '0..4'), var('rep', 'eval:3-' + indic('t', 0) + '-' + indic('t', 2))],
    None,
    [REGLE,
     'À gauche, un **ensemble** : on choisit entre $\\subset$ et $\\not\\subset$.',
     selon('t', [
         'Tout entier naturel est un entier relatif : $' + col(N + '\\subset' + Z) + '$.',
         '$-1$ est un entier relatif mais pas un entier naturel : $' + col(Z + '\\not\\subset' + N) + '$.',
         'Tout décimal s\'écrit $\\dfrac{a}{10^n}$, quotient d\'entiers : $' + col(D + '\\subset' + Q) + '$.',
         '$\\sqrt{2}$ est réel mais pas rationnel : $' + col(R + '\\not\\subset' + Q) + '$.',
         '$\\dfrac{1}{3}$ est rationnel mais pas décimal : $' + col(Q + '\\not\\subset' + D) + '$.'])],
    [case('{{rep}}')])

SP_F = {'a': 3, 'u': 4, 'b': 7, 'w': 5, 'c': 12}
MODELES.append(modele(
    '02-appartenance-inclusion', '∈, ∉, ⊂ ou ⊄ ?',
    'Choisir parmi ∈, ∉, ⊂, ⊄ : 7 … {3 ; 7 ; 12}, {3 ; 13} … {3 ; 7 ; 12}, −4 … ℕ, √5 … ℚ, ℤ … ℕ, ℚ … 𝔻'
    ' (piège : ∈ et ⊂ échangés)',
    5,
    [NOMBRE_FINI, DEUX_FINIS, NOMBRE_ENSEMBLE, DEUX_ENSEMBLES],
    [spec('7 ∈ {3 ; 7 ; 12}', 0, dict(SP_F, z=1, x=7, rep=0), '0', 'correct'),
     spec('Erreur : ⊂ pour un élément', 0, dict(SP_F, z=1, x=7, rep=0), '2', 'incorrect'),
     spec('9 ∉ {3 ; 7 ; 12}', 0, dict(SP_F, z=0, x=9, rep=1), '1', 'correct'),
     spec('{3 ; 12} ⊂ {3 ; 7 ; 12}', 1, dict(SP_F, z=1, y=12, rep=2), '2', 'correct'),
     spec('Erreur : ∈ pour un ensemble', 1, dict(SP_F, z=1, y=12, rep=2), '0', 'incorrect'),
     spec('{3 ; 13} ⊄ {3 ; 7 ; 12}', 1, dict(SP_F, z=0, y=13, rep=3), '3', 'correct'),
     spec('Erreur : ⊂ alors que 13 manque', 1, dict(SP_F, z=0, y=13, rep=3), '2', 'incorrect'),
     spec('−4 ∉ ℕ', 2, {'t': 0, 'a': 4, 'q': 3, 'k': 5, 'rep': 1}, '1', 'correct'),
     spec('Erreur : −4 ∈ ℕ', 2, {'t': 0, 'a': 4, 'q': 3, 'k': 5, 'rep': 1}, '0', 'incorrect'),
     spec('−4 ∈ ℤ', 2, {'t': 1, 'a': 4, 'q': 3, 'k': 5, 'rep': 0}, '0', 'correct'),
     spec('√5 ∉ ℚ', 2, {'t': 3, 'a': 4, 'q': 3, 'k': 5, 'rep': 1}, '1', 'correct'),
     spec('4/3 ∈ ℚ', 2, {'t': 4, 'a': 4, 'q': 3, 'k': 5, 'rep': 0}, '0', 'correct'),
     spec('Erreur : ⊂ pour un nombre', 2, {'t': 4, 'a': 4, 'q': 3, 'k': 5, 'rep': 0}, '2', 'incorrect'),
     spec('ℕ ⊂ ℤ', 3, {'t': 0, 'rep': 2}, '2', 'correct'),
     spec('ℤ ⊄ ℕ', 3, {'t': 1, 'rep': 3}, '3', 'correct'),
     spec('Erreur : ℤ ⊂ ℕ', 3, {'t': 1, 'rep': 3}, '2', 'incorrect'),
     spec('𝔻 ⊂ ℚ', 3, {'t': 2, 'rep': 2}, '2', 'correct'),
     spec('ℚ ⊄ 𝔻', 3, {'t': 4, 'rep': 3}, '3', 'correct'),
     spec('Erreur : ∉ pour un ensemble', 3, {'t': 4, 'rep': 3}, '1', 'incorrect')]))

# --- 3. 2-206 : A privé de B --------------------------------------------------------------------

PRIVE = ('$A\\setminus B$ se lit « $A$ **privé de** $B$ » : ce sont les éléments de $A$ qui ne sont **pas** dans'
         ' $B$. Si $B\\subset A$, c\'est le complémentaire de $B$ dans $A$.')
VARS_AB = [var('p', '1..5'), var('h', '1..3'), var('q', 'eval:(p)+(h)'), var('r', 'eval:(q)+(h)'),
           var('s', 'eval:(r)+(h)'), var('u', 'eval:(s)+(h)+1'), var('v', 'eval:(u)+(h)')]
A4 = '\\{ {{p}};{{q}};{{r}};{{s}} \\}'
B4 = '\\{ {{r}};{{s}};{{u}};{{v}} \\}'


def prive(a, b, demande):
    return 'On note $A=' + a + '$ et $B=' + b + '$.\n\n' + ACCOLADES + '\n\n$$' + demande + '=?$$'


A_PRIVE_B = variation(
    prive(A4, B4, 'A\\setminus B'),
    VARS_AB, None,
    [PRIVE,
     '${{r}}$ et ${{s}}$ sont dans $B$ : on les retire de $A$. Il reste $A\\setminus B=' + col('\\{ {{p}};{{q}} \\}')
     + '$.'],
    [case('\\{ {{p}};{{q}} \\}', 'intervalles')])

B_PRIVE_A = variation(
    prive(A4, B4, 'B\\setminus A'),
    VARS_AB, None,
    [PRIVE,
     'Ici on part de $B$ : ${{r}}$ et ${{s}}$ sont dans $A$, on les retire de $B$. Il reste $B\\setminus A='
     + col('\\{ {{u}};{{v}} \\}') + '$.'],
    [case('\\{ {{u}};{{v}} \\}', 'intervalles')])

INCLUS = variation(
    prive('\\{ {{r}};{{s}} \\}', '\\{ {{p}};{{r}};{{s}};{{u}} \\}', 'A\\setminus B'),
    VARS_AB, None,
    [PRIVE,
     'Tous les éléments de $A$ sont dans $B$ ($A\\subset B$) : on les retire tous, il ne reste rien.',
     '$A\\setminus B=' + col('\\varnothing') + '$.'],
    [case('\\varnothing', 'intervalles')])

SP_AB = {'p': 1, 'h': 2, 'q': 3, 'r': 5, 's': 7, 'u': 10, 'v': 12}
MODELES.append(modele(
    '03-a-prive-de-b', 'A privé de B',
    'A = {1 ; 3 ; 5 ; 7}, B = {5 ; 7 ; 10 ; 12} : écrire A \\ B, B \\ A ; A ⊂ B donne A \\ B = ∅'
    ' (pièges : A \\ B et B \\ A échangés, A ∩ B à la place)',
    2,
    [A_PRIVE_B, B_PRIVE_A, INCLUS],
    [spec('A \\ B = {1 ; 3}', 0, SP_AB, '\\{1;3\\}', 'correct'),
     spec('Dans le désordre', 0, SP_AB, '\\{3;1\\}', 'correct'),
     spec('Erreur : B \\ A', 0, SP_AB, '\\{10;12\\}', 'incorrect'),
     spec('Erreur : A ∩ B', 0, SP_AB, '\\{5;7\\}', 'incorrect'),
     spec('B \\ A = {10 ; 12}', 1, SP_AB, '\\{10;12\\}', 'correct'),
     spec('Erreur : A \\ B', 1, SP_AB, '\\{1;3\\}', 'incorrect'),
     spec('A ⊂ B : ∅', 2, SP_AB, '\\varnothing', 'correct'),
     spec('Erreur : B \\ A', 2, SP_AB, '\\{1;10\\}', 'incorrect'),
     spec('Erreur : {0}', 2, SP_AB, '\\{0\\}', 'incorrect')]))

os.makedirs(DOSSIER, exist_ok=True)
for nom, m in MODELES:
    with open(os.path.join(DOSSIER, nom + '.json'), 'w', encoding='utf-8') as f:
        json.dump(m, f, ensure_ascii=False, indent='\t')
        f.write('\n')
# Mis en forme comme le pre-commit, pour que le script redonne les fichiers commités
subprocess.run(['pnpm', 'exec', 'prettier', '--write', DOSSIER], check=True,
               stdout=subprocess.DEVNULL)
print(f'{len(MODELES)} modèles écrits dans {DOSSIER}')
