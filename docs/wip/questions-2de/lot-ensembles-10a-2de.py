"""Écrit les 4 modèles du lot 10 A « Ensembles » de la 2de dans scripts/questions/2de-ensembles-10a/.

Phase 0 validée par David le 2026-11-05 (§ 82 du journal `docs/wip/questions-2de-progress.md`).
Points : 2-201 (élément, appartenance), 2-202 (ensemble vide), 2-203 (symboles ∅, ∈, ⊂, ∩, ∪, {…}),
2-206 (notations Ā et E \\ A). Un point par modèle ; le nœud et le tag sont posés par la migration de
rangement, après le `--publier` de David.

Décisions et pièges :
- BO « en situation » : diviseurs, entiers d'un intervalle, équations, dé ; jamais de logique formelle ;
- nœuds et niveaux relevés en prod le 2026-11-05 : Ensembles › Ensembles de nombres › appartenance et
  inclusion (1, 2 pris : 5b20321f, 5062197a) → 201 niv. 3, 203 niv. 4 ; Ensembles › Opérations sur
  les ensembles (2, 3 pris : 9724dc3d, 0598a535) → 202 niv. 1 ; › complémentaire (4 pris : 5676627b)
  → 206 niv. 1 ;
- ensemble fini en réponse : `answerKind: intervalles` (sans lui, `\\{1;3;5\\}` et `\\varnothing` sont
  refusés en `bad_form`) ; `?` dans `$…$` = une case : « … » à la place ;
- `eval:` ne connaît ni `==` ni `>` : indicatrices `min(max(…,0),1)` ;
- `col()` seulement dans `$…$` ; variables `e` et `i` interdites.

    python3 docs/wip/questions-2de/lot-ensembles-10a-2de.py scripts/questions/2de-ensembles-10a
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


def modele(nom, title, description, level, variations, specs, delay=60):
    m = {'title': title, 'description': description, 'grades': ['2'], 'level': level, 'delay': delay,
         'status': 'draft', 'variations': variations, 'testSpecs': specs}
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


ACCOLADES = ('Écris cet ensemble entre accolades, en séparant les éléments par des points-virgules (par'
             ' exemple $\\{1;3;5\\}$) ; l\'ensemble vide s\'écrit $\\varnothing$.')
MODELES = []

# --- 1. 2-201 : élément, appartenance ------------------------------------------------------------

DEF_APPARTIENT = ('$x\\in D$ se lit « $x$ **appartient** à $D$ » : $x$ est un **élément** de $D$. Sinon, on'
                  ' écrit $x\\notin D$.')

DIVISEUR = variation(
    choix('On note $D$ l\'ensemble des diviseurs positifs de ${{n}}$. Complète par $\\in$ ou $\\notin$.'
          '\n\n$${{x}}\\;\\ldots\\;D$$', ['$\\in$', '$\\notin$'], melanger=False),
    [var('n', '12|18|20|24|30|36'), var('x', '2..12'), var('q', 'eval:floor((n)/(x))'),
     var('r', 'eval:(n)-(x)*(q)'), var('rep', 'eval:min(r,1)')],
    None,
    [DEF_APPARTIENT,
     '{{if:rep==0|${{n}}={{x}}\\times{{q}}$ : ${{x}}$ divise ${{n}}$, donc $' + col('{{x}}\\in D') + '$.|'
     '${{n}}={{x}}\\times{{q}}+{{r}}$ : le reste n\'est pas nul, ${{x}}$ ne divise pas ${{n}}$, donc $'
     + col('{{x}}\\notin D') + '$.}}'],
    [case('{{rep}}')])

ENTIERS = variation(
    'On note $E$ l\'ensemble des entiers relatifs $n$ tels que ${{a}}{{if:sa==1|\\leqslant |<}}n'
    '{{if:sb==1|\\leqslant|<}}{{b}}$.\n\n' + ACCOLADES + '\n\n$$E=?$$',
    [var('a', '-6..3'), var('b', 'eval:(a)+4'), var('sa', '0|1'), var('sb', '0|1'),
     var('f', 'eval:(a)+1-(sa)'), var('g4', 'eval:min((sa)+(sb),1)'), var('g5', 'eval:(sa)*(sb)')],
    None,
    ['On écrit tous les éléments de $E$, l\'un après l\'autre.',
     '${{a}}$ est {{if:sa==1|compris (inégalité large)|exclu (inégalité stricte)}}, ${{b}}$ est '
     '{{if:sb==1|compris (inégalité large)|exclu (inégalité stricte)}} :',
     '$$E=' + col('\\{ {{f}};{{eval:(f)+1}};{{eval:(f)+2}}{{if:g4==1|;{{eval:(f)+3}}}}'
                  '{{if:g5==1|;{{eval:(f)+4}}}} \\}') + '$$'],
    [case('\\{ {{f}};{{eval:(f)+1}};{{eval:(f)+2}}{{if:g4==1|;{{eval:(f)+3}}}}{{if:g5==1|;{{eval:(f)+4}}}}'
          ' \\}', 'intervalles')])

SP_ENT = {'a': -2, 'b': 2, 'sa': 0, 'sb': 1, 'f': -1, 'g4': 1, 'g5': 0}
MODELES.append(modele(
    '01-appartenance', 'Élément d\'un ensemble, appartenance',
    'Compléter x … D par ∈ ou ∉ (D = diviseurs de n) ; écrire en extension les entiers n tels que'
    ' −2 < n ⩽ 2 (pièges : borne exclue comptée, borne comprise oubliée)',
    3,
    [DIVISEUR, ENTIERS],
    [spec('4 et 24 : ∈', 0, {'n': 24, 'x': 4, 'q': 6, 'r': 0, 'rep': 0}, '0', 'correct'),
     spec('Erreur : 4 ∉ D', 0, {'n': 24, 'x': 4, 'q': 6, 'r': 0, 'rep': 0}, '1', 'incorrect'),
     spec('5 et 18 : ∉', 0, {'n': 18, 'x': 5, 'q': 3, 'r': 3, 'rep': 1}, '1', 'correct'),
     spec('−2 < n ⩽ 2 : {−1 ; 0 ; 1 ; 2}', 1, SP_ENT, '\\{-1;0;1;2\\}', 'correct'),
     spec('Dans le désordre', 1, SP_ENT, '\\{2;1;0;-1\\}', 'correct'),
     spec('Erreur : −2 exclu compté', 1, SP_ENT, '\\{-2;-1;0;1;2\\}', 'incorrect'),
     spec('Erreur : 2 compris oublié', 1, SP_ENT, '\\{-1;0;1\\}', 'incorrect'),
     spec('Deux bornes comprises : 5 éléments', 1, {'a': 0, 'b': 4, 'sa': 1, 'sb': 1, 'f': 0, 'g4': 1, 'g5': 1},
          '\\{0;1;2;3;4\\}', 'correct'),
     spec('Deux bornes exclues : 3 éléments', 1, {'a': 0, 'b': 4, 'sa': 0, 'sb': 0, 'f': 1, 'g4': 0, 'g5': 0},
          '\\{1;2;3\\}', 'correct')]))

# --- 2. 2-202 : ensemble vide --------------------------------------------------------------------

VIDE = ('L\'**ensemble vide**, noté $\\varnothing$, n\'a **aucun** élément. Attention : $\\{0\\}$ n\'est pas'
        ' vide, il a un élément, le nombre $0$.')

EQUATION = variation(
    'Résous dans $\\mathbb{R}$ l\'équation\n\n$$' + selon('t', [
        'x^2=-{{k}}', '{{c}}x+{{a}}={{c}}x{{if:b<0|{{b}}|+{{b}}}}', 'x^2=0',
        '{{c}}(x+1)+{{d}}={{c}}x+{{a}}']) + '$$\n\n$$S=?$$',
    [var('t', '0..3'), var('k', '1..9'), var('c', '2..5'), var('a', '6..9'), var('b', '-9..9'),
     var('d', 'eval:(a)-(c)')],
    ['b != a', 'b != 0'],
    [VIDE,
     selon('t', [
         'Un carré est toujours positif ou nul : $x^2=-{{k}}$ n\'a **aucune** solution. $S=' + col('\\varnothing')
         + '$.',
         'On soustrait ${{c}}x$ aux deux membres : ${{a}}={{b}}$, ce qui est faux, quel que soit $x$. **Aucune**'
         ' solution : $S=' + col('\\varnothing') + '$.',
         'Un carré est nul seulement pour $x=0$ : **une** solution, $S=' + col('\\{0\\}') + '$, qui n\'est pas'
         ' l\'ensemble vide.',
         'On développe : ${{c}}(x+1)+{{d}}={{c}}x+{{c}}+{{d}}={{c}}x+{{a}}$. L\'égalité est vraie **pour tout**'
         ' réel $x$ : $S=' + col('\\mathbb{R}') + '$.'])],
    [case(selon('t', ['\\varnothing', '\\varnothing', '\\{0\\}', '\\mathbb{R}']), 'intervalles')])

INTER_VIDE = variation(
    'On note $A$ l\'ensemble des entiers pairs de $1$ à $10$ et $B=\\{ {{o1}};{{z}};{{o2}} \\}$.\n\n'
    + ACCOLADES + '\n\n$$A\\cap B=?$$',
    [var('w', '0|1'), var('o1', '1|3'), var('o2', '7|9'), var('v', '4|6'), var('z', 'eval:5+(w)*((v)-5)')],
    None,
    [VIDE,
     '$A=\\{2;4;6;8;10\\}$. $A\\cap B$ contient les éléments **communs** à $A$ et à $B$.',
     '{{if:w==1|Seul ${{z}}$ est pair dans $B$ : $A\\cap B=' + col('\\{ {{z}} \\}') + '$.|Tous les éléments de'
     ' $B$ sont impairs : aucun élément commun, $A\\cap B=' + col('\\varnothing') + '$.}}'],
    [case('{{if:w==1|\\{ {{z}} \\}|\\varnothing}}', 'intervalles')])

SP_EQ = {'t': 0, 'k': 4, 'c': 3, 'a': 7, 'b': 2, 'd': 4}
MODELES.append(modele(
    '02-ensemble-vide', 'L\'ensemble vide',
    'S = ∅ pour x² = −4 ou 3x + 7 = 3x + 2, S = {0} pour x² = 0, S = ℝ pour une identité ; A ∩ B vide ou non'
    ' (piège : {0} pris pour ∅)',
    1,
    [EQUATION, INTER_VIDE],
    [spec('x² = −4 : ∅', 0, SP_EQ, '\\varnothing', 'correct'),
     spec('Erreur : {0} au lieu de ∅', 0, SP_EQ, '\\{0\\}', 'incorrect'),
     spec('3x + 7 = 3x + 2 : ∅', 0, dict(SP_EQ, t=1), '\\varnothing', 'correct'),
     spec('x² = 0 : {0}', 0, dict(SP_EQ, t=2), '\\{0\\}', 'correct'),
     spec('Erreur : ∅ au lieu de {0}', 0, dict(SP_EQ, t=2), '\\varnothing', 'incorrect'),
     spec('Identité : ℝ', 0, dict(SP_EQ, t=3), '\\mathbb{R}', 'correct'),
     spec('Erreur : ∅ pour une identité', 0, dict(SP_EQ, t=3), '\\varnothing', 'incorrect'),
     spec('Disjoints : ∅', 1, {'w': 0, 'o1': 3, 'o2': 7, 'v': 4, 'z': 5}, '\\varnothing', 'correct'),
     spec('Erreur : {0}', 1, {'w': 0, 'o1': 3, 'o2': 7, 'v': 4, 'z': 5}, '\\{0\\}', 'incorrect'),
     spec('Un commun : {4}', 1, {'w': 1, 'o1': 3, 'o2': 7, 'v': 4, 'z': 4}, '\\{4\\}', 'correct'),
     spec('Erreur : ∅ alors que 4 est commun', 1, {'w': 1, 'o1': 3, 'o2': 7, 'v': 4, 'z': 4}, '\\varnothing',
          'incorrect')]))

# --- 3. 2-203 : le bon symbole -------------------------------------------------------------------

SYMBOLES = ('$\\in$ relie un **élément** à un ensemble ; $\\subset$ relie deux **ensembles** (tout élément du'
            ' premier est dans le second) ; $\\cap$ (« inter ») donne les éléments **communs**, $\\cup$'
            ' (« union ») les éléments de l\'un **ou** de l\'autre.')
N, Z = '\\mathbb{N}', '\\mathbb{Z}'

COMPLETER = variation(
    choix('Quel symbole complète l\'écriture ?\n\n$$' + selon('t', [
        '{{a}}\\;\\ldots\\;' + N, '\\{ {{a}} \\}\\;\\ldots\\;' + N, N + '\\;\\ldots\\;' + Z,
        '[{{p}}\\,;\\,{{r}}]\\;\\ldots\\;[{{q}}\\,;\\,{{s}}]=[{{q}}\\,;\\,{{r}}]',
        '[{{p}}\\,;\\,{{r}}]\\;\\ldots\\;[{{q}}\\,;\\,{{s}}]=[{{p}}\\,;\\,{{s}}]',
        '{{q}}\\;\\ldots\\;[{{p}}\\,;\\,{{r}}]']) + '$$',
        ['$\\in$', '$\\subset$', '$\\cap$', '$\\cup$'], melanger=False),
    [var('t', '0..5'), var('a', '2..9'), var('p', '-6..0'), var('l', '1..3'), var('q', 'eval:(p)+(l)'),
     var('r', 'eval:(q)+2'), var('s', 'eval:(r)+(l)'), var('rep', 'eval:' + '+'.join(
         '(1-min(abs((t)-' + str(k) + '),1))*' + str(v) for k, v in enumerate([0, 1, 1, 2, 3, 0])))],
    None,
    [SYMBOLES,
     selon('t', [
         '${{a}}$ est un **nombre**, un élément : $' + col('{{a}}\\in' + N) + '$.',
         '$\\{ {{a}} \\}$ est un **ensemble** (à un élément) : $' + col('\\{ {{a}} \\}\\subset' + N) + '$.',
         'Tout entier naturel est un entier relatif : $' + col(N + '\\subset' + Z) + '$.',
         'Les réels communs aux deux intervalles vont de ${{q}}$ à ${{r}}$ : c\'est l\'**intersection**, $'
         + col('[{{p}}\\,;\\,{{r}}]\\cap[{{q}}\\,;\\,{{s}}]') + '$.',
         'Les réels de l\'un ou de l\'autre vont de ${{p}}$ à ${{s}}$ : c\'est la **réunion**, $'
         + col('[{{p}}\\,;\\,{{r}}]\\cup[{{q}}\\,;\\,{{s}}]') + '$.',
         '${{q}}$ est un **nombre** compris entre ${{p}}$ et ${{r}}$ : $' + col('{{q}}\\in[{{p}}\\,;\\,{{r}}]')
         + '$.'])],
    [case('{{rep}}')])

ECRITURE = variation(
    choix('On note $E=\\{ {{a}};{{b}};{{c}} \\}$. Quelles écritures sont justes ?',
          ['${{a}}\\in E$', '$\\{ {{a}} \\}\\in E$', '${{a}}\\subset E$', '$\\{ {{a}} \\}\\subset E$',
           '$E\\in' + N + '$'], plusieurs=True),
    [var('a', '1..4'), var('b', 'eval:(a)+2'), var('c', 'eval:(a)+5')],
    None,
    [SYMBOLES,
     '${{a}}$ est un élément : $' + col('{{a}}\\in E') + '$, mais pas « ${{a}}\\subset E$ ».',
     '$\\{ {{a}} \\}$ est un ensemble : $' + col('\\{ {{a}} \\}\\subset E') + '$, mais pas « $\\{ {{a}} \\}\\in E$ ».',
     '$E$ est un ensemble d\'entiers naturels : $E\\subset' + N + '$, et non $E\\in' + N + '$.'],
    [case('0;3')])

SP_SY = {'t': 0, 'a': 3, 'p': -2, 'l': 1, 'q': -1, 'r': 1, 's': 2, 'rep': 0}
MODELES.append(modele(
    '03-symboles', 'Le bon symbole : ∈, ⊂, ∩, ∪',
    'Compléter 3 … ℕ, {3} … ℕ, ℕ … ℤ, [−2 ; 1] … [−1 ; 2] = [−1 ; 1] ; cocher les écritures justes avec'
    ' E = {2 ; 4 ; 7} (piège : ∈ et ⊂ échangés)',
    4,
    [COMPLETER, ECRITURE],
    [spec('3 ∈ ℕ', 0, SP_SY, '0', 'correct'),
     spec('Erreur : 3 ⊂ ℕ', 0, SP_SY, '1', 'incorrect'),
     spec('{3} ⊂ ℕ', 0, dict(SP_SY, t=1, rep=1), '1', 'correct'),
     spec('Erreur : {3} ∈ ℕ', 0, dict(SP_SY, t=1, rep=1), '0', 'incorrect'),
     spec('ℕ ⊂ ℤ', 0, dict(SP_SY, t=2, rep=1), '1', 'correct'),
     spec('Intersection', 0, dict(SP_SY, t=3, rep=2), '2', 'correct'),
     spec('Erreur : réunion au lieu d\'intersection', 0, dict(SP_SY, t=3, rep=2), '3', 'incorrect'),
     spec('Réunion', 0, dict(SP_SY, t=4, rep=3), '3', 'correct'),
     spec('−1 ∈ [−2 ; 1]', 0, dict(SP_SY, t=5, rep=0), '0', 'correct'),
     spec('2 ∈ E et {2} ⊂ E', 1, {'a': 2, 'b': 4, 'c': 7}, '0;3', 'correct'),
     spec('Erreur : {2} ∈ E coché', 1, {'a': 2, 'b': 4, 'c': 7}, '0;1;3', 'incorrect'),
     spec('Erreur : 2 ⊂ E', 1, {'a': 2, 'b': 4, 'c': 7}, '2;3', 'incorrect')]))

# --- 4. 2-206 : notations Ā et E \ A -------------------------------------------------------------

CONTRAIRE = ('$\\overline{A}$ (on lit « $A$ barre ») est le **complémentaire** de $A$ dans $E$ : les éléments'
             ' de $E$ qui ne sont **pas** dans $A$. On le note aussi $E\\setminus A$. En probabilités, c\'est'
             ' l\'**événement contraire** de $A$.')
EVENEMENTS = ['obtenir un nombre pair', 'obtenir un multiple de $3$', 'obtenir un nombre supérieur ou égal à $5$',
              'obtenir un nombre premier', 'obtenir un nombre strictement inférieur à $3$']
A_DE = ['\\{2;4;6\\}', '\\{3;6\\}', '\\{5;6\\}', '\\{2;3;5\\}', '\\{1;2\\}']
ABARRE_DE = ['\\{1;3;5\\}', '\\{1;2;4;5\\}', '\\{1;2;3;4\\}', '\\{1;4;6\\}', '\\{3;4;5;6\\}']

DE = variation(
    'On lance un dé à six faces : $E=\\{1;2;3;4;5;6\\}$. On note $A$ l\'événement « ' + selon('t', EVENEMENTS)
    + ' ».\n\n' + ACCOLADES + '\n\n$$\\overline{A}=?$$',
    [var('t', '0..4')],
    None,
    [CONTRAIRE,
     '$A=' + selon('t', A_DE) + '$' + selon('t', ['', '', '', ' ($1$ n\'est pas premier)', '']) + '.',
     '$$\\overline{A}=E\\setminus A=' + col(selon('t', ABARRE_DE)) + '$$'],
    [case(selon('t', ABARRE_DE), 'intervalles')])

MOTS = variation(
    choix('On lance ' + selon('t', ['un dé à six faces. $A$ est l\'événement « obtenir un nombre pair »',
                                    'un dé à six faces. $A$ est l\'événement « obtenir un nombre supérieur ou égal'
                                    ' à ${{m}}$ »',
                                    'deux fois une pièce. $A$ est l\'événement « obtenir au moins une fois pile'
                                    ' »']) + '. Quel est l\'événement $\\overline{A}$ ?',
          ['« ' + selon('t', ['obtenir un nombre impair', 'obtenir un nombre strictement inférieur à ${{m}}$',
                              'n\'obtenir aucun pile']) + ' »',
           '« ' + selon('t', ['obtenir un multiple de $3$', 'obtenir un nombre inférieur ou égal à ${{m}}$',
                              'obtenir exactement une fois pile']) + ' »',
           '« ' + selon('t', ['ne pas obtenir $2$', 'obtenir un nombre strictement supérieur à ${{m}}$',
                              'obtenir deux fois pile']) + ' »',
           '« ' + selon('t', ['obtenir un nombre premier', 'obtenir un nombre inférieur ou égal à'
                              ' ${{eval:(m)+1}}$', 'obtenir au plus une fois pile']) + ' »']),
    [var('t', '0..2'), var('m', '4|5')],
    None,
    [CONTRAIRE,
     selon('t', [
         'Un nombre qui n\'est pas pair est impair : $\\overline{A}$ est « obtenir un nombre **impair** ».',
         'Le contraire de « $\\geqslant{{m}}$ » est « $<{{m}}$ » (et non « $\\leqslant{{m}}$ » : ${{m}}$ est'
         ' déjà dans $A$). $\\overline{A}=' + col('{{if:m==4|\\{1;2;3\\}|\\{1;2;3;4\\}}}') + '$ : « obtenir un nombre'
         ' **strictement inférieur** à ${{m}}$ ».',
         '« Au moins une fois pile » est faux seulement si l\'on obtient deux fois face : $\\overline{A}$ est'
         ' « n\'obtenir **aucun** pile ».'])],
    [case('0')])

MODELES.append(modele(
    '04-notation-complementaire', 'Notations Ā et E \\ A',
    'Dé à six faces : écrire Ā en extension (pair, multiple de 3, ⩾ 5, premier, < 3) ; choisir la phrase'
    ' de Ā (impair ; « < m » et non « ⩽ m » ; aucun pile)',
    1,
    [DE, MOTS],
    [spec('Pair : {1 ; 3 ; 5}', 0, {'t': 0}, '\\{1;3;5\\}', 'correct'),
     spec('Dans le désordre', 0, {'t': 0}, '\\{5;3;1\\}', 'correct'),
     spec('Erreur : A au lieu de Ā', 0, {'t': 0}, '\\{2;4;6\\}', 'incorrect'),
     spec('Premier : {1 ; 4 ; 6}', 0, {'t': 3}, '\\{1;4;6\\}', 'correct'),
     spec('Erreur : 1 oublié', 0, {'t': 3}, '\\{4;6\\}', 'incorrect'),
     spec('< 3 : {3 ; 4 ; 5 ; 6}', 0, {'t': 4}, '\\{3;4;5;6\\}', 'correct'),
     spec('Impair', 1, {'t': 0, 'm': 4}, '0', 'correct'),
     spec('Erreur : ⩽ m', 1, {'t': 1, 'm': 4}, '1', 'incorrect'),
     spec('Aucun pile', 1, {'t': 2, 'm': 4}, '0', 'correct'),
     spec('Erreur : au plus une fois pile', 1, {'t': 2, 'm': 4}, '3', 'incorrect')]))

os.makedirs(DOSSIER, exist_ok=True)
for nom, m in MODELES:
    with open(os.path.join(DOSSIER, nom + '.json'), 'w', encoding='utf-8') as f:
        json.dump(m, f, ensure_ascii=False, indent='\t')
        f.write('\n')
# Mis en forme comme le pre-commit, pour que le script redonne les fichiers commités
subprocess.run(['pnpm', 'exec', 'prettier', '--write', DOSSIER], check=True,
               stdout=subprocess.DEVNULL)
print(f'{len(MODELES)} modèles écrits dans {DOSSIER}')
