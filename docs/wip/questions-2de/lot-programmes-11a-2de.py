"""Écrit les 10 modèles du lot 11 A « Lire un programme : variables et instructions » de la 2de
dans scripts/questions/2de-programmes-11a/.

Phase 0 validée par David le 2026-11-05 (§ 87 du journal `docs/wip/questions-2de-progress.md`).
Points : 2-218 (types), 2-223 (choisir un type), 2-219 (affectation ←), 2-220 (séquence), 2-224
(compléter une affectation), 2-221 (conditionnelle), 2-415 (compléter une condition), 2-222 (`for`),
2-413 (`while`), 2-228 (programme plus complexe). Un point par modèle ; le nœud et le tag sont posés
par la migration de rangement (11 A + 11 B), après le `--publier` de David.

Décisions et pièges :
- Python seulement, sauf 2-219 (algorithme en langage naturel avec ←, L11-d) ; aucune liste (BO) ;
- forme reprise de la 1re (5192e88a, 19961e67) : code en ```python, case `$?$` ou case choix dont les
  options sont des lignes de code entre accents graves ;
- nœuds relevés en prod le 2026-11-05 : Algorithmique › Variables et instructions › types (vide) → 218
  niv. 1, 223 niv. 2 ; › variables et affectation → 219, 220 niv. 2, 224 niv. 3 ; › instructions
  conditionnelles → 221 niv. 2, 415 niv. 3 ; › Boucles › boucle bornée (vide) → 222 niv. 2 ; › boucle
  non bornée → 413 niv. 2 ; notion Variables et instructions → 228 niv. 3 ;
- pas de `==` ni de `|` dans une branche de `{{if:}}` : seules les parties qui changent passent par
  `selon` ;
- `eval:` ne connaît ni `==` ni `>` : indicatrices.

    python3 docs/wip/questions-2de/lot-programmes-11a-2de.py scripts/questions/2de-programmes-11a
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


def case(attendu, **extra):
    c = {'expectedAnswer': attendu}
    c.update(extra)
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


def indic(nom, valeurs):
    """Expression `eval:` qui vaut valeurs[t] quand la variable `nom` vaut t (t = 0, 1, …)."""
    return 'eval:' + '+'.join('(1-min(abs((' + nom + ')-' + str(k) + '),1))*(' + str(v) + ')'
                              for k, v in enumerate(valeurs))


def py(*lignes):
    return '```python\n' + '\n'.join(lignes) + '\n```'


def algo(*lignes):
    return '```\n' + '\n'.join(lignes) + '\n```'


MODELES = []

# --- 1. 2-218 : type d'une variable ----------------------------------------------------------------

TYPES = ['`int` (entier)', '`float` (flottant)', '`str` (chaîne de caractères)', '`bool` (booléen)']
RAPPEL_TYPES = ('En Python : `int` pour un **entier**, `float` pour un nombre **à virgule** (flottant), `str`'
                ' pour un texte entre guillemets (**chaîne de caractères**), `bool` pour `True` ou `False`'
                ' (**booléen**).')
AFFECTATIONS = ['x = {{a}}', 'x = {{a}}.5', 'x = {{c}} / 2', 'x = "{{a}}"', 'x = {{a}} < {{b}}',
                'x = {{a}} * {{b}}']

TYPE_DE = variation(
    choix('Après l\'instruction Python ci-dessous, quel est le type de la variable `x` ?\n\n'
          + py(selon('t', AFFECTATIONS)), TYPES, melanger=False),
    [var('t', '0..5'), var('a', '2..9'), var('b', '2..9'), var('c', 'eval:2*(a)'),
     var('ab', 'eval:min(max((b)-(a),0),1)'), var('rep', indic('t', [0, 1, 1, 2, 3, 0]))],
    ['a != b'],
    [RAPPEL_TYPES,
     selon('t', [
         '`{{a}}` est un nombre entier, écrit sans virgule : `x` est de type **`int`**.',
         '`{{a}}.5` est écrit avec un point (la virgule de Python) : `x` est de type **`float`**.',
         'La division `/` donne **toujours** un flottant, même quand elle « tombe juste » : `{{c}} / 2` vaut'
         ' `{{a}}.0`, et `x` est de type **`float`**.',
         '`"{{a}}"` est entre guillemets : c\'est un **texte**, pas un nombre. `x` est de type **`str`**.',
         '`{{a}} < {{b}}` est une comparaison, qui vaut `{{if:ab==1|True|False}}` : `x` est de type **`bool`**.',
         'Le produit de deux entiers est un entier : `x` vaut `{{eval:(a)*(b)}}`, de type **`int`**.'])],
    [case('{{rep}}')])

FLOTTANTS = variation(
    choix('Parmi ces instructions Python, lesquelles donnent à `x` une valeur de type `float` ?',
          ['`x = {{a}}.0`', '`x = {{c}} / 2`', '`x = {{a}}`', '`x = "{{a}}.5"`', '`x = {{a}} + {{b}}`'],
          plusieurs=True),
    [var('a', '2..9'), var('b', '2..9'), var('c', 'eval:2*(a)')],
    None,
    [RAPPEL_TYPES,
     '`{{a}}.0` est écrit avec un point : c\'est un flottant. `{{c}} / 2` aussi : la division `/` donne'
     ' toujours un flottant (`{{a}}.0`).',
     '`{{a}}` et `{{a}} + {{b}}` sont des entiers (`int`) ; `"{{a}}.5"` est entre guillemets, c\'est une chaîne'
     ' de caractères (`str`).'],
    [case('0;1')])

SP_T = {'t': 0, 'a': 4, 'b': 7, 'c': 8, 'ab': 1, 'rep': 0}
SP_F = {'a': 4, 'b': 7, 'c': 8}
MODELES.append(modele(
    '01-type-variable', 'Type d\'une variable Python',
    'Type de x après x = 4, x = 4.5, x = 8 / 2, x = "4", x = 4 < 7, x = 4 * 7 (int, float, str, bool) ;'
    ' reconnaître les affectations qui donnent un flottant',
    1,
    [TYPE_DE, FLOTTANTS],
    [spec('x = 4 : int', 0, SP_T, '0', 'correct'),
     spec('x = 4.5 : float', 0, dict(SP_T, t=1, rep=1), '1', 'correct'),
     spec('x = 8 / 2 : float', 0, dict(SP_T, t=2, rep=1), '1', 'correct'),
     spec('Erreur : 8 / 2 pris pour un entier', 0, dict(SP_T, t=2, rep=1), '0', 'incorrect'),
     spec('x = "4" : str', 0, dict(SP_T, t=3, rep=2), '2', 'correct'),
     spec('Erreur : "4" pris pour un entier', 0, dict(SP_T, t=3, rep=2), '0', 'incorrect'),
     spec('x = 4 < 7 : bool', 0, dict(SP_T, t=4, rep=3), '3', 'correct'),
     spec('x = 4 * 7 : int', 0, dict(SP_T, t=5, rep=0), '0', 'correct'),
     spec('Les deux flottants', 1, SP_F, '0;1', 'correct'),
     spec('Erreur : la chaîne "4.5" cochée', 1, SP_F, '0;1;3', 'incorrect'),
     spec('Incomplet : 8 / 2 oublié', 1, SP_F, '0', 'unoptimal_form')]))

# --- 2. 2-223 : choisir le type -----------------------------------------------------------------

TROIS_TYPES = ['entier (`int`)', 'flottant (`float`)', 'chaîne de caractères (`str`)']
SITUATIONS = ['le nombre d\'élèves d\'une classe', 'le prix d\'un article en euros, centimes compris',
              'le nom d\'une ville', 'la taille d\'une personne en mètres', 'le nombre de lancers d\'un dé',
              'la moyenne des notes d\'un élève', 'un mot de passe']
CHOISIR_RAPPEL = ('On choisit le type d\'après **ce que contient** la variable : un nombre qui se compte'
                  ' (entier), une mesure ou un résultat de calcul à virgule (flottant), un texte (chaîne de'
                  ' caractères).')

CHOISIR = variation(
    choix('Un programme Python doit garder en mémoire ' + selon('t', SITUATIONS)
          + '. Quel type de variable choisir ?', TROIS_TYPES, melanger=False),
    [var('t', '0..6'), var('rep', indic('t', [0, 1, 2, 1, 0, 1, 2]))],
    None,
    [CHOISIR_RAPPEL,
     selon('t', [
         'Un nombre d\'élèves se compte : c\'est un **entier**.',
         'Un prix avec des centimes (par exemple $12{,}99$) est un nombre à virgule : c\'est un **flottant**.',
         'Un nom de ville est un texte : c\'est une **chaîne de caractères**.',
         'Une taille en mètres (par exemple $1{,}68$) est un nombre à virgule : c\'est un **flottant**.',
         'Un nombre de lancers se compte : c\'est un **entier**.',
         'Une moyenne (par exemple $13{,}5$) est un résultat de division : c\'est un **flottant**.',
         'Un mot de passe est un texte (lettres, chiffres, symboles) : c\'est une **chaîne de caractères**.'])],
    [case('{{rep}}')])

ERREUR_TYPE = variation(
    choix('On exécute les deux lignes Python ci-dessous.\n\n'
          + py('age = "{{a}}"', 'age_suivant = age + 1')
          + '\n\nLa seconde ligne provoque une erreur. Pourquoi ?',
          ['`age` est une chaîne de caractères : on ne peut pas lui ajouter un nombre.',
           '`age` est un entier : on ne peut pas lui ajouter $1$.',
           '`age` est un flottant : il faut écrire `age + 1.0`.',
           'Un nom de variable ne peut pas contenir le caractère `_`.']),
    [var('a', '14..17')],
    None,
    ['`"{{a}}"` est entre guillemets : `age` est une **chaîne de caractères** (`str`), pas un nombre.',
     'Python refuse d\'ajouter le nombre $1$ à un texte. Il fallait écrire `age = {{a}}` (un entier,'
     ' `int`) : `age + 1` vaudrait alors `{{eval:(a)+1}}`.'],
    [case('0')])

MODELES.append(modele(
    '02-choisir-type', 'Choisir le type d\'une variable',
    'Entier, flottant ou chaîne de caractères pour un nombre d\'élèves, un prix, un nom de ville, une taille,'
    ' une moyenne, un mot de passe ; erreur de age = "16" puis age + 1',
    2,
    [CHOISIR, ERREUR_TYPE],
    [spec('Nombre d\'élèves : entier', 0, {'t': 0, 'rep': 0}, '0', 'correct'),
     spec('Prix : flottant', 0, {'t': 1, 'rep': 1}, '1', 'correct'),
     spec('Erreur : prix en entier', 0, {'t': 1, 'rep': 1}, '0', 'incorrect'),
     spec('Nom de ville : chaîne', 0, {'t': 2, 'rep': 2}, '2', 'correct'),
     spec('Moyenne : flottant', 0, {'t': 5, 'rep': 1}, '1', 'correct'),
     spec('Mot de passe : chaîne', 0, {'t': 6, 'rep': 2}, '2', 'correct'),
     spec('age est une chaîne', 1, {'a': 16}, '0', 'correct'),
     spec('Erreur : age pris pour un entier', 1, {'a': 16}, '1', 'incorrect')]))

# --- 3. 2-219 : affectation (←) -------------------------------------------------------------------

AFFECTER = ('`a ← 5` se lit « $a$ prend la valeur $5$ » : on calcule d\'abord la valeur de droite, puis on la'
            ' range dans la variable de gauche, **à la place** de l\'ancienne valeur.')

ALGO_NATUREL = variation(
    'On exécute l\'algorithme suivant.\n\n'
    + algo('a ← {{a}}', 'b ← a + {{p}}', 'a ← {{k}} × b', 'b ← a − b')
    + '\n\nÀ la fin, $a=?$ et $b=?$',
    [var('a', '2..9'), var('p', '2..9'), var('k', '2..5'), var('b1', 'eval:(a)+(p)'),
     var('a2', 'eval:(k)*(b1)'), var('b2', 'eval:(a2)-(b1)')],
    None,
    [AFFECTER,
     'Ligne 1 : $a={{a}}$. Ligne 2 : $b={{a}}+{{p}}={{b1}}$.',
     'Ligne 3 : $a={{k}}\\times{{b1}}={{a2}}$ (l\'ancienne valeur ${{a}}$ est effacée).',
     'Ligne 4 : $b={{a2}}-{{b1}}={{b2}}$. À la fin, $' + col('a={{a2}}') + '$ et $' + col('b={{b2}}') + '$.'],
    [case('{{a2}}'), case('{{b2}}')])

V = selon('w', ['x', 'n', 's', 'c'])
TRADUIRE = variation(
    choix('Quelle instruction Python traduit l\'instruction en langage naturel `' + V + ' ← ' + V + ' + {{p}}` ?',
          ['`' + V + ' = ' + V + ' + {{p}}`', '`' + V + ' + {{p}} = ' + V + '`', '`' + V + ' == ' + V + ' + {{p}}`', '`' + V + ' = {{p}}`']),
    [var('w', '0..3'), var('p', '2..9')],
    None,
    [AFFECTER,
     'En Python, l\'affectation s\'écrit avec `=`, la variable **à gauche** : `' + V + ' = ' + V + ' + {{p}}`. Elle'
     ' augmente la valeur de `' + V + '` de ${{p}}$.',
     '`==` compare deux valeurs (il ne change rien) ; `' + V + ' + {{p}} = ' + V + '` est refusé par Python ;'
     ' `' + V + ' = {{p}}` remplace la valeur de `' + V + '` par ${{p}}$ au lieu de l\'augmenter.'],
    [case('0')])

SP_AN = {'a': 3, 'p': 4, 'k': 2, 'b1': 7, 'a2': 14, 'b2': 7}
MODELES.append(modele(
    '03-affectation', 'Affectation en langage naturel et en Python',
    'Valeurs de a et b après a ← 3, b ← a + 4, a ← 2 × b, b ← a − b ; traduire x ← x + 5 en Python',
    2,
    [ALGO_NATUREL, TRADUIRE],
    [spec('a = 14 et b = 7', 0, SP_AN, ['14', '7'], 'correct'),
     spec('Erreur : a garde sa valeur de départ', 0, SP_AN, ['3', '7'], 'incorrect'),
     spec('Erreur : b calculé avec a = 3', 0, SP_AN, ['14', '11'], 'incorrect'),
     spec('x = x + 5', 1, {'w': 0, 'p': 5}, '0', 'correct'),
     spec('Erreur : == au lieu de =', 1, {'w': 0, 'p': 5}, '2', 'incorrect')]))

# --- 4. 2-220 : séquence d'instructions -----------------------------------------------------------

SEQUENCE = ('Les instructions s\'exécutent **dans l\'ordre**, de haut en bas ; une variable garde sa dernière'
            ' valeur affectée.')

SUITE = variation(
    'On exécute le programme Python suivant.\n\n'
    + py('x = {{a}}', 'y = x + {{b}}', 'x = y * {{c}}', 'y = x - y')
    + '\n\nÀ la fin, $x=?$ et $y=?$',
    [var('a', '2..9'), var('b', '2..9'), var('c', '2..4'), var('y1', 'eval:(a)+(b)'),
     var('x2', 'eval:(c)*(y1)'), var('y2', 'eval:(x2)-(y1)')],
    None,
    [SEQUENCE,
     '`x = {{a}}` puis `y = {{a}} + {{b}} = {{y1}}`.',
     '`x = {{y1}} * {{c}} = {{x2}}` puis `y = {{x2}} - {{y1}} = {{y2}}`.',
     'À la fin, $' + col('x={{x2}}') + '$ et $' + col('y={{y2}}') + '$.'],
    [case('{{x2}}'), case('{{y2}}')])

ECHANGE = variation(
    'On exécute le programme Python suivant.\n\n'
    + selon('t', [py('a = {{a}}', 'b = {{b}}', 'a = b', 'b = a'),
                  py('a = {{a}}', 'b = {{b}}', 'c = a', 'a = b', 'b = c')])
    + '\n\nÀ la fin, $a=?$ et $b=?$',
    [var('t', '0|1'), var('a', '2..9'), var('b', '11..19'), var('fb', 'eval:(t)*(a)+(1-(t))*(b)')],
    None,
    [SEQUENCE,
     selon('t', [
         '`a = b` : $a$ prend la valeur ${{b}}$ ; l\'ancienne valeur ${{a}}$ est **perdue**.',
         '`c = a` garde une copie de ${{a}}$ ; `a = b` : $a={{b}}$ ; `b = c` : $b={{a}}$.']),
     selon('t', [
         '`b = a` : $b$ prend la valeur actuelle de $a$, soit ${{b}}$. À la fin, $' + col('a={{b}}') + '$ et $'
         + col('b={{b}}') + '$ : les deux lignes n\'échangent pas les valeurs.',
         'À la fin, $' + col('a={{b}}') + '$ et $' + col('b={{a}}') + '$ : grâce à la variable `c`, les'
         ' valeurs sont échangées.'])],
    [case('{{b}}'), case('{{fb}}')])

SP_SU = {'a': 3, 'b': 4, 'c': 2, 'y1': 7, 'x2': 14, 'y2': 7}
SP_EC = {'t': 0, 'a': 5, 'b': 12, 'fb': 12}
MODELES.append(modele(
    '04-sequence', 'Séquence d\'instructions',
    'Valeurs de x et y après x = 3, y = x + 4, x = y * 2, y = x - y ; a = b puis b = a (pas d\'échange),'
    ' échange avec une variable c',
    2,
    [SUITE, ECHANGE],
    [spec('x = 14 et y = 7', 0, SP_SU, ['14', '7'], 'correct'),
     spec('Erreur : y gardé à 7 puis x - 7 avec x = 3', 0, SP_SU, ['14', '-4'], 'incorrect'),
     spec('a = b puis b = a : 12 et 12', 1, SP_EC, ['12', '12'], 'correct'),
     spec('Erreur : valeurs crues échangées', 1, SP_EC, ['12', '5'], 'incorrect'),
     spec('Avec c : 12 et 5', 1, dict(SP_EC, t=1, fb=5), ['12', '5'], 'correct'),
     spec('Erreur : avec c, rien ne change', 1, dict(SP_EC, t=1, fb=5), ['5', '12'], 'incorrect')]))

# --- 5. 2-224 : compléter une affectation ----------------------------------------------------------

COMPLETER_RAPPEL = ('L\'affectation s\'écrit `variable = expression` ; en Python, le produit s\'écrit avec `*`'
                    ' (jamais sous-entendu), et les parenthèses fixent l\'ordre des calculs.')

PROGRAMME_CALCUL = variation(
    choix('Un programme de calcul : « choisir un nombre $x$, '
          + selon('t', ['le multiplier par ${{k}}$, puis ajouter ${{p}}$',
                        'lui ajouter ${{p}}$, puis multiplier le résultat par ${{k}}$']) + ' ».\n\n'
          + py('x = float(input("x = "))', '...', 'print(y)')
          + '\n\nPar quelle instruction faut-il remplacer les points de suspension ?',
          [selon('t', ['`y = {{k}} * x + {{p}}`', '`y = {{k}} * (x + {{p}})`']),
           selon('t', ['`y = {{k}} * (x + {{p}})`', '`y = {{k}} * x + {{p}}`']),
           selon('t', ['`y = {{k}}x + {{p}}`', '`y = (x + {{p}}){{k}}`']),
           selon('t', ['`{{k}} * x + {{p}} = y`', '`y = x + {{p}} * {{k}}`'])]),
    [var('t', '0|1'), var('k', '2..9'), var('p', '2..9')],
    ['k != p'],
    [COMPLETER_RAPPEL,
     selon('t', [
         'On multiplie d\'abord, puis on ajoute : `y = {{k}} * x + {{p}}` (la multiplication passe avant'
         ' l\'addition, sans parenthèses).',
         'On ajoute d\'abord, puis on multiplie **le résultat** : il faut des parenthèses, `y = {{k}} * (x +'
         ' {{p}})`.']),
     'Python refuse `{{k}}x` (produit sous-entendu) et une affectation dont la variable est à droite.'],
    [case('0')])

COMPTEUR = variation(
    choix('Dans un jeu, le score `s` d\'un joueur doit '
          + selon('t', ['augmenter de ${{p}}$ points', 'diminuer de ${{p}}$ points', 'doubler'])
          + ' à chaque bonne réponse. Quelle instruction écrire ?',
          [selon('t', ['`s = s + {{p}}`', '`s = s - {{p}}`', '`s = 2 * s`']),
           selon('t', ['`s + {{p}}`', '`s - {{p}}`', '`s * 2`']),
           selon('t', ['`s = {{p}}`', '`s = -{{p}}`', '`s = 2`']),
           selon('t', ['`{{p}} = s + {{p}}`', '`s - {{p}} = s`', '`2 * s = s`'])]),
    [var('t', '0..2'), var('p', '2..20')],
    None,
    [COMPLETER_RAPPEL,
     'La nouvelle valeur de `s` se calcule à partir de l\'ancienne : `'
     + selon('t', ['s = s + {{p}}', 's = s - {{p}}', 's = 2 * s']) + '`.',
     selon('t', ['`s + {{p}}`', '`s - {{p}}`', '`s * 2`'])
     + ' calcule la valeur mais ne la range nulle part : `s` ne change pas.'],
    [case('0')])

MODELES.append(modele(
    '05-completer-affectation', 'Compléter une affectation',
    'Traduire « multiplier par 3 puis ajouter 5 » ou « ajouter 5 puis multiplier par 3 » en y = … ;'
    ' augmenter, diminuer, doubler un score s',
    3,
    [PROGRAMME_CALCUL, COMPTEUR],
    [spec('y = 3 * x + 5', 0, {'t': 0, 'k': 3, 'p': 5}, '0', 'correct'),
     spec('Erreur : parenthèses en trop', 0, {'t': 0, 'k': 3, 'p': 5}, '1', 'incorrect'),
     spec('y = 3 * (x + 5)', 0, {'t': 1, 'k': 3, 'p': 5}, '0', 'correct'),
     spec('Erreur : parenthèses oubliées', 0, {'t': 1, 'k': 3, 'p': 5}, '1', 'incorrect'),
     spec('s = s + 10', 1, {'t': 0, 'p': 10}, '0', 'correct'),
     spec('Erreur : s + 10 sans affectation', 1, {'t': 0, 'p': 10}, '1', 'incorrect'),
     spec('s = 2 * s', 1, {'t': 2, 'p': 10}, '0', 'correct')]))

# --- 6. 2-221 : instruction conditionnelle -----------------------------------------------------------

SI_SINON = ('Avec `if … else`, Python teste la condition : si elle est vraie, il exécute **seulement** le bloc'
            ' sous `if` ; sinon, **seulement** le bloc sous `else`.')

SI = variation(
    'On exécute le programme Python suivant.\n\n'
    + py('x = {{x}}', 'if x < {{s}}:', '    y = 2 * x', 'else:', '    y = x - {{s}}')
    + '\n\nÀ la fin, $y=?$',
    [var('s', '5..12'), var('x', '2..16'), var('lt', 'eval:min(max((s)-(x),0),1)'),
     var('y', 'eval:(lt)*2*(x)+(1-(lt))*((x)-(s))')],
    None,
    [SI_SINON,
     '{{if:lt==1|${{x}}<{{s}}$ : la condition est **vraie**|${{x}}<{{s}}$ est **faux**}}.',
     '{{if:lt==1|Python exécute `y = 2 * x` : $y=2\\times{{x}}='
     + col('{{y}}') + '$.|Python exécute `y = x - {{s}}` : $y={{x}}-{{s}}=' + col('{{y}}') + '$.}}'],
    [case('{{y}}')])

TARIF = variation(
    'On exécute le programme Python suivant.\n\n'
    + py('age = {{g}}', 'if age < 12:', '    prix = {{p1}}', 'elif age < 18:', '    prix = {{p2}}', 'else:',
         '    prix = {{p3}}')
    + '\n\nÀ la fin, $\\mathtt{prix}=?$',
    [var('g', '6|10|11|12|13|15|17|18|19|25|40'), var('p1', '4..6'), var('p2', '7..9'), var('p3', '10..13'),
     var('m12', 'eval:min(max(12-(g),0),1)'), var('m18', 'eval:min(max(18-(g),0),1)'),
     var('prix', 'eval:(m12)*(p1)+(m18-m12)*(p2)+(1-(m18))*(p3)')],
    None,
    ['Python teste les conditions **dans l\'ordre** et n\'exécute que le bloc de la **première** condition'
     ' vraie (`else` si aucune ne l\'est).',
     '{{if:m12==1|${{g}}<12$ est vrai : `prix = {{p1}}`.|${{g}}<12$ est faux. {{if:m18==1|${{g}}<18$ est vrai :'
     ' `prix = {{p2}}`.|${{g}}<18$ est faux aussi : `else`, `prix = {{p3}}`.}}}}',
     'À la fin, $\\mathtt{prix}=' + col('{{prix}}') + '$.'],
    [case('{{prix}}')])

SP_SI = {'s': 8, 'x': 5, 'lt': 1, 'y': 10}
SP_TA = {'g': 12, 'p1': 5, 'p2': 8, 'p3': 11, 'm12': 0, 'm18': 1, 'prix': 8}
MODELES.append(modele(
    '06-conditionnelle', 'Instruction conditionnelle',
    'Valeur de y après if x < s: y = 2 * x else: y = x - s ; prix selon l\'âge avec if, elif, else (âges'
    ' frontières 12 et 18 compris)',
    2,
    [SI, TARIF],
    [spec('x = 5 < 8 : y = 10', 0, SP_SI, '10', 'correct'),
     spec('Erreur : branche else prise', 0, SP_SI, '-3', 'incorrect'),
     spec('x = 8, frontière : y = 0', 0, {'s': 8, 'x': 8, 'lt': 0, 'y': 0}, '0', 'correct'),
     spec('Erreur : 8 < 8 lu vrai', 0, {'s': 8, 'x': 8, 'lt': 0, 'y': 0}, '16', 'incorrect'),
     spec('12 ans : 8', 1, SP_TA, '8', 'correct'),
     spec('Erreur : 12 < 12 lu vrai', 1, SP_TA, '5', 'incorrect'),
     spec('10 ans : 5', 1, dict(SP_TA, g=10, m12=1, prix=5), '5', 'correct'),
     spec('18 ans : 11', 1, dict(SP_TA, g=18, m18=0, prix=11), '11', 'correct')]))

# --- 7. 2-415 : compléter une condition --------------------------------------------------------------

CONDITION = ('Une condition compare deux valeurs : `<` (strictement inférieur), `<=` (inférieur ou égal),'
             ' `>`, `>=`, `==` (égal). Le `=` seul est une affectation, pas une comparaison.')
REGLES = ['les moins de ${{n}}$ ans', 'les personnes d\'au moins ${{n}}$ ans', 'les plus de ${{n}}$ ans',
          'les personnes de ${{n}}$ ans au plus']

COMPLETER_SI = variation(
    choix('Un musée accorde le tarif réduit à ' + selon('t', REGLES) + '. On complète le programme :\n\n'
          + py('age = int(input("Âge : "))', 'if ... :', '    print("Tarif réduit")', 'else:',
               '    print("Plein tarif")')
          + '\n\nQuelle condition faut-il écrire à la place des points de suspension ?',
          ['`age < {{n}}`', '`age <= {{n}}`', '`age > {{n}}`', '`age >= {{n}}`', '`age = {{n}}`']),
    [var('t', '0..3'), var('n', '12|16|18|25|60|65'), var('rep', indic('t', [0, 3, 2, 1]))],
    None,
    [CONDITION,
     selon('t', [
         '« Moins de ${{n}}$ ans » : ${{n}}$ ans exclu, `' + 'age < {{n}}' + '`.',
         '« Au moins ${{n}}$ ans » : ${{n}}$ ans ou plus, ${{n}}$ compris, `age >= {{n}}`.',
         '« Plus de ${{n}}$ ans » : ${{n}}$ ans exclu, `age > {{n}}`.',
         '« ${{n}}$ ans au plus » : ${{n}}$ ans ou moins, ${{n}}$ compris, `age <= {{n}}`.']),
     'On vérifie avec la valeur frontière : une personne de ${{n}}$ ans a-t-elle le tarif réduit ?'
     ' {{if:t==1|Oui.|{{if:t==3|Oui.|Non.}}}}'],
    [case('{{rep}}')])

PARITE = variation(
    choix('Le programme doit afficher « ' + selon('t', ['pair', 'multiple de {{d}}']) + ' » quand l\'entier `n`'
          ' est ' + selon('t', ['pair', 'un multiple de ${{d}}$']) + '.\n\n'
          + py('n = int(input("n = "))', 'if ... :', '    print("' + selon('t', ['pair', 'multiple de {{d}}'])
               + '")')
          + '\n\nQuelle condition faut-il écrire ? (`a % b` est le reste de la division de `a` par `b`.)',
          [selon('t', ['`n % 2 == 0`', '`n % {{d}} == 0`']), selon('t', ['`n % 2 == 1`', '`n % {{d}} == 1`']),
           selon('t', ['`n / 2 == 0`', '`n / {{d}} == 0`']), selon('t', ['`n % 2 = 0`', '`n % {{d}} = 0`'])]),
    [var('t', '0|1'), var('d', '3..9')],
    None,
    [CONDITION,
     '$n$ est ' + selon('t', ['pair', 'un multiple de ${{d}}$']) + ' quand le reste de sa division par $'
     + selon('t', ['2', '{{d}}']) + '$ est nul : `' + selon('t', ['n % 2', 'n % {{d}}']) + '` doit être égal à'
     ' $0$, ce qui s\'écrit avec `==`.',
     '`n / ' + selon('t', ['2', '{{d}}']) + '` est le quotient, pas le reste ; `= 0` est une affectation,'
     ' refusée après `if`.'],
    [case('0')])

MODELES.append(modele(
    '07-completer-condition', 'Compléter une condition',
    'Écrire la condition du tarif réduit pour « moins de », « au moins », « plus de », « au plus » n ans'
    ' (<, >=, >, <=) ; condition « n est pair », « n est multiple de d » avec %',
    3,
    [COMPLETER_SI, PARITE],
    [spec('Moins de 18 : age < 18', 0, {'t': 0, 'n': 18, 'rep': 0}, '0', 'correct'),
     spec('Erreur : <= pour « moins de »', 0, {'t': 0, 'n': 18, 'rep': 0}, '1', 'incorrect'),
     spec('Au moins 65 : age >= 65', 0, {'t': 1, 'n': 65, 'rep': 3}, '3', 'correct'),
     spec('Erreur : > pour « au moins »', 0, {'t': 1, 'n': 65, 'rep': 3}, '2', 'incorrect'),
     spec('Plus de 60 : age > 60', 0, {'t': 2, 'n': 60, 'rep': 2}, '2', 'correct'),
     spec('Au plus 12 : age <= 12', 0, {'t': 3, 'n': 12, 'rep': 1}, '1', 'correct'),
     spec('Erreur : = au lieu de ==', 0, {'t': 0, 'n': 18, 'rep': 0}, '4', 'incorrect'),
     spec('n pair : n % 2 == 0', 1, {'t': 0, 'd': 3}, '0', 'correct'),
     spec('Erreur : n % 2 = 0', 1, {'t': 0, 'd': 3}, '3', 'incorrect'),
     spec('Multiple de 5 : n % 5 == 0', 1, {'t': 1, 'd': 5}, '0', 'correct')]))

# --- 8. 2-222 : boucle bornée ------------------------------------------------------------------------

POUR = ('`for i in range(n)` répète le bloc $n$ fois, avec `i` qui vaut $0$, $1$, …, $n-1$ ;'
        ' `range(a, b)` donne $a$, $a+1$, …, $b-1$ (la borne $b$ est **exclue**).')

SOMME = variation(
    'On exécute le programme Python suivant.\n\n'
    + py('s = 0', selon('t', ['for i in range({{n}}):', 'for i in range(1, {{eval:(n)+1}}):',
                              'for i in range({{n}}):']),
         selon('t', ['    s = s + i', '    s = s + i', '    s = s + {{k}}']))
    + '\n\nÀ la fin, $s=?$',
    [var('t', '0..2'), var('n', '4..8'), var('k', '2..9'),
     var('rep', indic('t', ['(n)*((n)-1)/2', '(n)*((n)+1)/2', '(k)*(n)']))],
    None,
    [POUR,
     selon('t', [
         '`i` prend les valeurs $0$, $1$, …, ${{eval:(n)-1}}$ (et non ${{n}}$) : la boucle tourne ${{n}}$ fois.',
         '`i` prend les valeurs $1$, $2$, …, ${{n}}$ : la borne ${{eval:(n)+1}}$ est exclue.',
         'La boucle tourne ${{n}}$ fois et ajoute ${{k}}$ à chaque tour (la valeur de `i` ne sert pas).']),
     selon('t', [
         '$s=0+1+\\dots+{{eval:(n)-1}}=' + col('{{rep}}') + '$.',
         '$s=1+2+\\dots+{{n}}=' + col('{{rep}}') + '$.',
         '$s={{n}}\\times{{k}}=' + col('{{rep}}') + '$.'])],
    [case('{{rep}}')])

DOUBLER = variation(
    'On exécute le programme Python suivant.\n\n'
    + py('x = {{a}}', 'for i in range({{n}}):', '    x = {{q}} * x')
    + '\n\nÀ la fin, $x=?$',
    [var('a', '1..5'), var('q', '2|3'), var('n', '3..5'), var('rep', 'eval:(a)*(q)^(n)')],
    ['(q)^(n) <= 250'],
    [POUR,
     'La boucle tourne ${{n}}$ fois ; à chaque tour, $x$ est multiplié par ${{q}}$.',
     '$x={{a}}\\times{{q}}^{ {{n}} }=' + col('{{rep}}') + '$.'],
    [case('{{rep}}')])

SP_SO = {'t': 0, 'n': 5, 'k': 3, 'rep': 10}
MODELES.append(modele(
    '08-boucle-for', 'Boucle bornée (for)',
    'Valeur de s après for i in range(5): s = s + i, range(1, 6), s = s + 3 ; x multiplié par 2 ou 3'
    ' à chaque tour',
    2,
    [SOMME, DOUBLER],
    [spec('range(5) : s = 10', 0, SP_SO, '10', 'correct'),
     spec('Erreur : i de 1 à 5', 0, SP_SO, '15', 'incorrect'),
     spec('range(1, 6) : s = 15', 0, dict(SP_SO, t=1, rep=15), '15', 'correct'),
     spec('Erreur : borne 6 comptée', 0, dict(SP_SO, t=1, rep=15), '21', 'incorrect'),
     spec('s = s + 3 : s = 15', 0, dict(SP_SO, t=2, rep=15), '15', 'correct'),
     spec('3 × 2⁴ = 48', 1, {'a': 3, 'q': 2, 'n': 4, 'rep': 48}, '48', 'correct'),
     spec('Erreur : un tour de moins', 1, {'a': 3, 'q': 2, 'n': 4, 'rep': 48}, '24', 'incorrect')]))

# --- 9. 2-413 : boucle non bornée ------------------------------------------------------------------

TANT_QUE = ('`while condition:` répète le bloc **tant que** la condition est vraie ; la boucle s\'arrête dès'
            ' que la condition est fausse au moment du test.')

SEUIL_SOMME = variation(
    'On exécute le programme Python suivant.\n\n'
    + py('n = 0', 's = 0', 'while s < {{A}}:', '    n = n + 1', '    s = s + n')
    + '\n\nÀ la fin, $n=?$ et $s=?$',
    [var('A', '8..40'), var('N', 'eval:ceil((sqrt(1+8*(A))-1)/2-0.000001)'), var('S', 'eval:(N)*((N)+1)/2'),
     var('Sp', 'eval:((N)-1)*(N)/2')],
    None,
    [TANT_QUE,
     'À chaque tour, `n` augmente de $1$ et `s` reçoit $1+2+\\dots+n$.',
     'Pour $n={{eval:(N)-1}}$ : $s={{Sp}}<{{A}}$, la boucle continue. Pour $n={{N}}$ : $s={{S}}$, et ${{S}}<{{A}}$'
     ' est faux : la boucle s\'arrête.',
     'À la fin, $' + col('n={{N}}') + '$ et $' + col('s={{S}}') + '$.'],
    [case('{{N}}'), case('{{S}}')])

CAPITAL = variation(
    'Un capital de ${{c}}$ euros double chaque année. On exécute le programme Python suivant.\n\n'
    + py('c = {{c}}', 'n = 0', 'while c < {{M}}:', '    c = 2 * c', '    n = n + 1')
    + '\n\nÀ la fin, $n=?$ et $c=?$',
    [var('c', '100|200|300|500'), var('M', '1000|1500|2000|3000|5000'),
     var('N', 'eval:ceil(log((M)/(c))/log(2)-0.000001)'), var('C', 'eval:(c)*2^(N)')],
    ['N >= 2'],
    [TANT_QUE,
     'Le programme compte les années nécessaires pour que le capital atteigne au moins ${{M}}$ euros.',
     'Après ${{eval:(N)-1}}$ ans : $c={{eval:(c)*2^((N)-1)}}<{{M}}$, la boucle continue. Après ${{N}}$ ans :'
     ' $c={{C}}$, et ${{C}}<{{M}}$ est faux : la boucle s\'arrête.',
     'À la fin, $' + col('n={{N}}') + '$ et $' + col('c={{C}}') + '$.'],
    [case('{{N}}'), case('{{C}}')])

MODELES.append(modele(
    '09-boucle-while', 'Boucle non bornée (while)',
    'Valeurs de n et s après while s < 20: n = n + 1, s = s + n ; nombre d\'années pour qu\'un capital qui'
    ' double atteigne un seuil',
    2,
    [SEUIL_SOMME, CAPITAL],
    [spec('A = 20 : n = 6, s = 21', 0, {'A': 20, 'N': 6, 'S': 21, 'Sp': 15}, ['6', '21'], 'correct'),
     spec('Erreur : un tour de moins', 0, {'A': 20, 'N': 6, 'S': 21, 'Sp': 15}, ['5', '15'], 'incorrect'),
     spec('A = 21 exactement : n = 6', 0, {'A': 21, 'N': 6, 'S': 21, 'Sp': 15}, ['6', '21'], 'correct'),
     spec('300 → 3000 : n = 4, c = 4800', 1, {'c': 300, 'M': 3000, 'N': 4, 'C': 4800}, ['4', '4800'],
          'correct'),
     spec('Erreur : arrêt avant le seuil', 1, {'c': 300, 'M': 3000, 'N': 4, 'C': 4800}, ['3', '2400'],
          'incorrect'),
     spec('500 → 2000 pile : n = 2', 1, {'c': 500, 'M': 2000, 'N': 2, 'C': 2000}, ['2', '2000'], 'correct')],
    delay=90))

# --- 10. 2-228 : programme plus complexe -------------------------------------------------------------

LIRE = ('Pour lire un programme, on suit les variables **tour par tour** ; on cherche ensuite ce que le'
        ' programme calcule.')

COMPTER = variation(
    'On exécute le programme Python suivant.\n\n'
    + py('s = 0', 'for k in range(1, {{eval:(n)+1}}):', '    if k % {{d}} == 0:',
         selon('t', ['        s = s + 1', '        s = s + k']))
    + '\n\n(`k % {{d}}` est le reste de la division de `k` par ${{d}}$.) À la fin, $s=?$',
    [var('t', '0|1'), var('d', '2..5'), var('n', '10..20'), var('m', 'eval:floor((n)/(d))'),
     var('rep', 'eval:(1-(t))*(m)+(t)*(d)*(m)*((m)+1)/2')],
    None,
    [LIRE,
     '`k` prend les valeurs $1$ à ${{n}}$ ; la condition est vraie quand `k` est un multiple de ${{d}}$ :'
     ' ${{d}}$, ${{eval:2*(d)}}$, …, ${{eval:(m)*(d)}}$, soit ${{m}}$ valeurs.',
     selon('t', [
         'À chacune, `s` augmente de $1$ : le programme **compte** les multiples, $s=' + col('{{rep}}') + '$.',
         'À chacune, `s` augmente de `k` : le programme **additionne** les multiples, $s={{d}}+{{eval:2*(d)}}'
         '+\\dots+{{eval:(m)*(d)}}=' + col('{{rep}}') + '$.'])],
    [case('{{rep}}')])

MODIFIER = variation(
    choix('Le programme suivant affiche la somme des entiers de $1$ à $10$.\n\n'
          + py('s = 0', 'for k in range(1, 11):', '    s = s + k', 'print(s)')
          + '\n\nQue faut-il modifier pour qu\'il affiche la somme des entiers de $1$ à ${{n}}$ ?',
          ['remplacer `range(1, 11)` par `range(1, {{eval:(n)+1}})`',
           'remplacer `range(1, 11)` par `range(1, {{n}})`',
           'remplacer `range(1, 11)` par `range({{n}})`',
           'remplacer `s = s + k` par `s = s + {{n}}`']),
    [var('n', '15..50')],
    None,
    [LIRE,
     '`range(1, 11)` donne $1$, $2$, …, $10$ : la borne $11$ est exclue.',
     'Pour aller jusqu\'à ${{n}}$, la borne doit être ${{eval:(n)+1}}$ : `' + 'range(1, {{eval:(n)+1}})'
     + '`. Avec `range(1, {{n}})`, la boucle s\'arrêterait à ${{eval:(n)-1}}$ ; `range({{n}})` commencerait à'
     ' $0$ et s\'arrêterait aussi à ${{eval:(n)-1}}$.'],
    [case('0')])

MODELES.append(modele(
    '10-programme-complexe', 'Lire et modifier un programme (boucle et condition)',
    'Compter ou additionner les multiples de d entre 1 et n (boucle for et if avec %) ; modifier la borne'
    ' de range pour sommer jusqu\'à n',
    3,
    [COMPTER, MODIFIER],
    [spec('Multiples de 3 jusqu\'à 14 : 4', 0, {'t': 0, 'd': 3, 'n': 14, 'm': 4, 'rep': 4}, '4', 'correct'),
     spec('Erreur : somme au lieu du compte', 0, {'t': 0, 'd': 3, 'n': 14, 'm': 4, 'rep': 4}, '30',
          'incorrect'),
     spec('Somme des multiples de 3 jusqu\'à 14 : 30', 0, {'t': 1, 'd': 3, 'n': 14, 'm': 4, 'rep': 30}, '30',
          'correct'),
     spec('Borne n + 1', 1, {'n': 20}, '0', 'correct'),
     spec('Erreur : range(1, n)', 1, {'n': 20}, '1', 'incorrect')],
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
