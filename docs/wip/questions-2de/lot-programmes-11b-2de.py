"""Écrit les 5 modèles du lot 11 B « Lire un programme : fonctions » de la 2de dans
scripts/questions/2de-programmes-11b/.

Phase 0 validée par David le 2026-11-05 (§ 87 du journal `docs/wip/questions-2de-progress.md`).
Points : 2-229 (fonction à un ou plusieurs arguments), 2-416 (appeler une fonction), 2-232 (fonction plus
complexe), 2-233 (fonction renvoyant une moyenne), 2-417 (fonction renvoyant un écart type). Un point par
modèle ; nœud et tag posés par la migration de rangement (11 A + 11 B).

Décisions et pièges :
- L11-b : 233 et 417 sous Algorithmique › Fonctions Python › définir une fonction (pas Statistiques) ;
- aucune liste (BO) : moyenne et écart type de quatre arguments, ou boucle de tirages ;
- « variance » n'est pas un mot de 2de : « le carré de l'écart type » ;
- nœuds relevés en prod le 2026-11-05 (vides) : définir une fonction → 229 niv. 1, 233 niv. 2, 232 et 417
  niv. 3 ; appeler une fonction → 416 niv. 1 ;
- mêmes pièges que le 11 A (pas de `==` dans une branche de `{{if:}}`, indicatrices).

    python3 docs/wip/questions-2de/lot-programmes-11b-2de.py scripts/questions/2de-programmes-11b
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
DECIMAL = {'blankDefaults': {'acceptDecimal': True}}


def avec_partage(entree, shared):
    nom, m = entree
    m['shared'] = shared
    return nom, m


FONCTION = ('`def nom(arguments):` définit une fonction ; `return` donne la valeur **renvoyée**. Lors d\'un'
            ' appel, chaque argument reçoit la valeur placée **au même rang** entre les parenthèses.')

# --- 11. 2-229 : fonction à un ou plusieurs arguments -------------------------------------------------

CODES_229 = [py('def aire(L, l):', '    return L * l'),
             py('def f(x):', '    return {{k}} * x - {{p}}'),
             py('def ecart(a, b):', '    return a - b'),
             py('def prix(n, p, r):', '    return n * p - r')]
APPELS_229 = ['aire({{a}}, {{b}})', 'f({{a}})', 'ecart({{a}}, {{b}})', 'prix({{a}}, {{k}}, {{p}})']

VALEUR_229 = variation(
    'On considère la fonction Python suivante.\n\n' + selon('t', CODES_229)
    + '\n\nQue renvoie l\'appel `' + selon('t', APPELS_229) + '` ?\n\n$?$',
    [var('t', '0..3'), var('a', '2..9'), var('b', '11..19'), var('k', '2..6'), var('p', '1..9'),
     var('rep', indic('t', ['(a)*(b)', '(k)*(a)-(p)', '(a)-(b)', '(a)*(k)-(p)']))],
    None,
    [FONCTION,
     selon('t', [
         '`L` reçoit ${{a}}$ et `l` reçoit ${{b}}$ : la fonction renvoie ${{a}}\\times{{b}}=' + col('{{rep}}') + '$.',
         '`x` reçoit ${{a}}$ : la fonction renvoie ${{k}}\\times{{a}}-{{p}}=' + col('{{rep}}') + '$.',
         '`a` reçoit ${{a}}$ et `b` reçoit ${{b}}$ (l\'ordre compte) : la fonction renvoie ${{a}}-{{b}}='
         + col('{{rep}}') + '$.',
         '`n` reçoit ${{a}}$, `p` reçoit ${{k}}$ et `r` reçoit ${{p}}$ : la fonction renvoie ${{a}}\\times{{k}}'
         '-{{p}}=' + col('{{rep}}') + '$.'])],
    [case('{{rep}}')])

NB_ARGUMENTS = variation(
    'On considère la fonction Python suivante.\n\n'
    + selon('t', [py('def perimetre(L, l):', '    return 2 * (L + l)'),
                  py('def carre(x):', '    return x * x'),
                  py('def volume(L, l, h):', '    return L * l * h'),
                  py('def moyenne(a, b, c, d):', '    return (a + b + c + d) / 4')])
    + '\n\nCombien d\'arguments faut-il donner pour l\'appeler ?\n\n$?$',
    [var('t', '0..3'), var('rep', indic('t', [2, 1, 3, 4]))],
    None,
    ['Les arguments sont les noms écrits entre les parenthèses, après le nom de la fonction, séparés par des'
     ' virgules.',
     'Ici : `' + selon('t', ['L, l', 'x', 'L, l, h', 'a, b, c, d']) + '`, soit $' + col('{{rep}}') + '$ argument'
     + selon('t', ['s', '', 's', 's']) + '.'],
    [case('{{rep}}')])

SP_229 = {'t': 0, 'a': 4, 'b': 12, 'k': 3, 'p': 5, 'rep': 48}
MODELES.append(modele(
    '11-fonction-arguments', 'Fonction Python à un ou plusieurs arguments',
    'Valeur renvoyée par aire(4, 12), f(4) avec f(x) = 3x − 5, ecart(4, 12) (ordre des arguments),'
    ' prix(n, p, r) ; nombre d\'arguments d\'une fonction',
    1,
    [VALEUR_229, NB_ARGUMENTS],
    [spec('aire(4, 12) = 48', 0, SP_229, '48', 'correct'),
     spec('f(4) = 7', 0, dict(SP_229, t=1, rep=7), '7', 'correct'),
     spec('ecart(4, 12) = -8', 0, dict(SP_229, t=2, rep=-8), '-8', 'correct'),
     spec('Erreur : arguments inversés', 0, dict(SP_229, t=2, rep=-8), '8', 'incorrect'),
     spec('prix(4, 3, 5) = 7', 0, dict(SP_229, t=3, rep=7), '7', 'correct'),
     spec('volume : 3 arguments', 1, {'t': 2, 'rep': 3}, '3', 'correct'),
     spec('moyenne : 4 arguments', 1, {'t': 3, 'rep': 4}, '4', 'correct'),
     spec('Erreur : moyenne à 1 argument', 1, {'t': 3, 'rep': 4}, '1', 'incorrect')]))

# --- 12. 2-416 : appeler une fonction --------------------------------------------------------------

DEF_F = py('def f(x):', '    return {{k}} * x + {{p}}')
APPEL = ('Appeler `f(5)` calcule l\'image de $5$ : `x` reçoit $5$ et l\'appel **vaut** la valeur renvoyée ;'
         ' il s\'utilise comme un nombre dans un calcul.')

CALCULER_APPEL = variation(
    'On considère la fonction Python suivante.\n\n' + DEF_F
    + '\n\nOn exécute ensuite `y = ' + selon('t', ['f({{a}}) + f({{b}})', 'f(f({{a}}))', '2 * f({{a}})'])
    + '`. Que vaut `y` ?\n\n$y=?$',
    [var('t', '0..2'), var('k', '2..5'), var('p', '1..9'), var('a', '1..5'), var('b', '6..9'),
     var('fa', 'eval:(k)*(a)+(p)'), var('fb', 'eval:(k)*(b)+(p)'), var('ffa', 'eval:(k)*(fa)+(p)'),
     var('rep', indic('t', ['(fa)+(fb)', '(ffa)', '2*(fa)']))],
    None,
    [APPEL,
     '`f({{a}})` vaut ${{k}}\\times{{a}}+{{p}}={{fa}}$.',
     selon('t', [
         '`f({{b}})` vaut ${{k}}\\times{{b}}+{{p}}={{fb}}$, donc $y={{fa}}+{{fb}}=' + col('{{rep}}') + '$.',
         '`f(f({{a}}))` est donc `f({{fa}})`, qui vaut ${{k}}\\times{{fa}}+{{p}}=' + col('{{rep}}') + '$.',
         '$y=2\\times{{fa}}=' + col('{{rep}}') + '$.'])],
    [case('{{rep}}')])

ECRIRE_APPEL = variation(
    choix('On a défini la fonction Python ci-dessous.\n\n' + DEF_F
          + '\n\nQuelle instruction range dans `y` l\'image de ${{a}}$ par `f` ?',
          ['`y = f({{a}})`', '`y = f`', '`f({{a}}) = y`', '`y = def f({{a}})`', '`y = f(x) = {{a}}`']),
    [var('k', '2..5'), var('p', '1..9'), var('a', '2..9')],
    None,
    [APPEL,
     'On écrit le nom de la fonction suivi de la valeur entre parenthèses, et on range le résultat dans `y` :'
     ' `y = f({{a}})`, qui vaut ${{k}}\\times{{a}}+{{p}}={{eval:(k)*(a)+(p)}}$.',
     '`def` sert seulement à **définir** la fonction ; `y = f` ne calcule rien ; la variable qui reçoit la'
     ' valeur est toujours à gauche du `=`.'],
    [case('0')])

SP_416 = {'t': 0, 'k': 3, 'p': 2, 'a': 4, 'b': 7, 'fa': 14, 'fb': 23, 'ffa': 44, 'rep': 37}
MODELES.append(modele(
    '12-appeler-fonction', 'Appeler une fonction Python',
    'Valeur de y = f(4) + f(7), y = f(f(4)), y = 2 * f(4) avec f(x) = 3x + 2 ; écrire l\'appel qui range'
    ' l\'image de a dans y',
    1,
    [CALCULER_APPEL, ECRIRE_APPEL],
    [spec('f(4) + f(7) = 37', 0, SP_416, '37', 'correct'),
     spec('Erreur : f(4 + 7)', 0, SP_416, '35', 'incorrect'),
     spec('f(f(4)) = 44', 0, dict(SP_416, t=1, rep=44), '44', 'correct'),
     spec('Erreur : f(f(4)) lu f(4)', 0, dict(SP_416, t=1, rep=44), '14', 'incorrect'),
     spec('2 * f(4) = 28', 0, dict(SP_416, t=2, rep=28), '28', 'correct'),
     spec('y = f(4)', 1, {'k': 3, 'p': 2, 'a': 4}, '0', 'correct'),
     spec('Erreur : f(4) = y', 1, {'k': 3, 'p': 2, 'a': 4}, '2', 'incorrect')]))

# --- 13. 2-232 : fonction plus complexe --------------------------------------------------------------

LIRE_FONCTION = ('Pour lire une fonction, on suit ses variables **tour par tour** pour un argument donné,'
                 ' puis on dit ce qu\'elle calcule.')
ENTIERS = [12, 18, 20, 24, 28, 30, 36, 40, 45, 48]
DIVISEURS = [6, 6, 6, 8, 6, 8, 9, 8, 6, 10]

NB_DIVISEURS = variation(
    'On considère la fonction Python suivante (`n % k` est le reste de la division de `n` par `k`).\n\n'
    + py('def mystere(n):', '    c = 0', '    for k in range(1, n + 1):', '        if n % k == 0:',
         '            c = c + 1', '    return c')
    + '\n\nQue renvoie `mystere({{n}})` ?\n\n$?$',
    [var('t', '0..9'), var('n', indic('t', ENTIERS)), var('rep', indic('t', DIVISEURS))],
    None,
    [LIRE_FONCTION,
     '`k` prend les valeurs $1$ à ${{n}}$ ; `c` augmente de $1$ quand le reste de ${{n}}$ par `k` est nul,'
     ' c\'est-à-dire quand `k` est un **diviseur** de ${{n}}$ : la fonction compte les diviseurs.',
     '${{n}}$ a ' + col('{{rep}}') + ' diviseurs : ' + selon('t', [
         '$1, 2, 3, 4, 6, 12$', '$1, 2, 3, 6, 9, 18$', '$1, 2, 4, 5, 10, 20$', '$1, 2, 3, 4, 6, 8, 12, 24$',
         '$1, 2, 4, 7, 14, 28$', '$1, 2, 3, 5, 6, 10, 15, 30$', '$1, 2, 3, 4, 6, 9, 12, 18, 36$',
         '$1, 2, 4, 5, 8, 10, 20, 40$', '$1, 3, 5, 9, 15, 45$', '$1, 2, 3, 4, 6, 8, 12, 16, 24, 48$'])
     + '. La fonction renvoie $' + col('{{rep}}') + '$.'],
    [case('{{rep}}')])

SEUIL_CARRE = variation(
    'On considère la fonction Python suivante.\n\n'
    + py('def seuil(A):', '    n = 0', '    while n * n <= A:', '        n = n + 1', '    return n')
    + '\n\nQue renvoie `seuil({{A}})` ?\n\n$?$',
    [var('A', '10..150'), var('N', 'eval:floor(sqrt(A)+0.000001)+1')],
    None,
    [LIRE_FONCTION,
     'La boucle continue tant que $n^2\\leqslant{{A}}$ : la fonction renvoie le **plus petit entier** $n$ tel'
     ' que $n^2>{{A}}$.',
     '${{eval:(N)-1}}^2={{eval:((N)-1)^2}}\\leqslant{{A}}$ et ${{N}}^2={{eval:(N)^2}}>{{A}}$ : la fonction'
     ' renvoie $' + col('{{N}}') + '$.'],
    [case('{{N}}')])

COMPLETER_MAX = variation(
    choix('La fonction ci-dessous doit renvoyer le ' + selon('t', ['plus grand', 'plus petit'])
          + ' des deux nombres `a` et `b`.\n\n'
          + py('def ' + selon('t', ['maximum', 'minimum']) + '(a, b):', '    if a > b:', '        return '
               + selon('t', ['a', 'b']), '    else:', '        ...')
          + '\n\nPar quelle instruction faut-il remplacer les points de suspension ?',
          [selon('t', ['`return b`', '`return a`']), selon('t', ['`return a`', '`return b`']),
           '`return a > b`', '`print(a)`']),
    [var('t', '0|1')],
    None,
    [LIRE_FONCTION,
     'Dans le `else`, on a $a\\leqslant b$ : le ' + selon('t', ['plus grand', 'plus petit']) + ' est `'
     + selon('t', ['b', 'a']) + '`, la fonction doit renvoyer `' + selon('t', ['b', 'a']) + '` avec `return`.',
     '`print` affiche sans rien renvoyer ; `a > b` est un booléen, pas un nombre.'],
    [case('0')])

MODELES.append(modele(
    '13-fonction-complexe', 'Lire une fonction Python plus complexe',
    'Que renvoie une fonction qui compte les diviseurs (boucle et condition), une fonction de seuil n² > A'
    ' (while) ; compléter la fonction maximum ou minimum',
    3,
    [NB_DIVISEURS, SEUIL_CARRE, COMPLETER_MAX],
    [spec('24 : 8 diviseurs', 0, {'t': 3, 'n': 24, 'rep': 8}, '8', 'correct'),
     spec('Erreur : 24 lu comme résultat', 0, {'t': 3, 'n': 24, 'rep': 8}, '24', 'incorrect'),
     spec('36 : 9 diviseurs', 0, {'t': 6, 'n': 36, 'rep': 9}, '9', 'correct'),
     spec('seuil(50) = 8', 1, {'A': 50, 'N': 8}, '8', 'correct'),
     spec('Erreur : seuil(50) = 7', 1, {'A': 50, 'N': 8}, '7', 'incorrect'),
     spec('seuil(49) = 8 (49 ⩽ 49)', 1, {'A': 49, 'N': 8}, '8', 'correct'),
     spec('maximum : return b', 2, {'t': 0}, '0', 'correct'),
     spec('Erreur : print(a)', 2, {'t': 0}, '3', 'incorrect')],
    delay=90))

# --- 14. 2-233 : fonction renvoyant une moyenne ------------------------------------------------------

MOYENNE = 'La moyenne de plusieurs valeurs est leur **somme** divisée par leur **nombre**.'

MOYENNE_QUATRE = variation(
    'On considère la fonction Python suivante.\n\n'
    + py('def moyenne(a, b, c, d):', '    s = a + b + c + d', '    return s / 4')
    + '\n\nQue renvoie `moyenne({{a}}, {{b}}, {{c}}, {{d}})` ?\n\n$?$',
    [var('a', '6..18'), var('b', '6..18'), var('c', '6..18'), var('d', '6..18'),
     var('s', 'eval:(a)+(b)+(c)+(d)')],
    None,
    [MOYENNE,
     '`s` vaut ${{a}}+{{b}}+{{c}}+{{d}}={{s}}$.',
     'La fonction renvoie $\\dfrac{ {{s}} }{4}=' + col('{{eval:(s)/4;d}}') + '$.'],
    [case('{{eval:(s)/4;d}}')])

MOYENNE_DE = variation(
    choix('On considère la fonction Python suivante.\n\n'
          + py('from random import randint', '', 'def experience(n):', '    s = 0', '    for i in range(n):',
               '        s = s + randint(1, 6)', '    return s / n')
          + '\n\n`randint(1, 6)` renvoie un entier au hasard entre $1$ et $6$, comme un lancer de dé. Que renvoie'
          ' `experience({{n}})` ?',
          ['la moyenne des résultats de ${{n}}$ lancers de dé', 'la somme des résultats de ${{n}}$ lancers de dé',
           'le résultat d\'un seul lancer de dé', 'le nombre de lancers, ${{n}}$']),
    [var('n', '20|50|100|500|1000')],
    None,
    [MOYENNE,
     'La boucle tourne ${{n}}$ fois et ajoute à `s` le résultat d\'un lancer : à la fin, `s` est la **somme**'
     ' des ${{n}}$ résultats.',
     'La fonction renvoie `s / {{n}}` : la somme divisée par le nombre de lancers, c\'est la **moyenne** des'
     ' résultats.'],
    [case('0')])

COEFS = [(1, 1), (1, 3), (3, 1), (2, 3), (3, 2), (1, 4), (4, 1)]
MOYENNE_PONDEREE = variation(
    'On considère la fonction Python suivante, qui calcule une moyenne de deux notes avec des coefficients.\n\n'
    + py('def moyenne(n1, c1, n2, c2):', '    return (n1 * c1 + n2 * c2) / (c1 + c2)')
    + '\n\nQue renvoie `moyenne({{x}}, {{c1}}, {{y}}, {{c2}})` ?\n\n$?$',
    [var('t', '1..6'), var('c1', indic('t', [a for a, _ in COEFS])), var('c2', indic('t', [b for _, b in COEFS])),
     var('x', '6..18'), var('y', '6..18'), var('num', 'eval:(x)*(c1)+(y)*(c2)')],
    ['x != y'],
    [MOYENNE,
     'Le numérateur vaut ${{x}}\\times{{c1}}+{{y}}\\times{{c2}}={{num}}$ et le dénominateur ${{c1}}+{{c2}}'
     '={{eval:(c1)+(c2)}}$.',
     'La fonction renvoie $\\dfrac{ {{num}} }{ {{eval:(c1)+(c2)}} }=' + col('{{eval:(num)/((c1)+(c2));d}}') + '$.'],
    [case('{{eval:(num)/((c1)+(c2));d}}')])

MODELES.append(avec_partage(modele(
    '14-fonction-moyenne', 'Lire une fonction Python qui renvoie une moyenne',
    'Valeur renvoyée par moyenne(a, b, c, d) ; ce que renvoie une fonction qui additionne n lancers de dé puis'
    ' divise par n ; moyenne de deux notes avec coefficients',
    2,
    [MOYENNE_QUATRE, MOYENNE_DE, MOYENNE_PONDEREE],
    [spec('moyenne(12, 9, 15, 11) = 11,75', 0, {'a': 12, 'b': 9, 'c': 15, 'd': 11, 's': 47}, '11,75', 'correct'),
     spec('Erreur : la somme 47', 0, {'a': 12, 'b': 9, 'c': 15, 'd': 11, 's': 47}, '47', 'incorrect'),
     spec('moyenne(10, 12, 14, 16) = 13', 0, {'a': 10, 'b': 12, 'c': 14, 'd': 16, 's': 52}, '13', 'correct'),
     spec('Lancers : la moyenne', 1, {'n': 100}, '0', 'correct'),
     spec('Erreur : la somme', 1, {'n': 100}, '1', 'incorrect'),
     spec('12 coef 1, 16 coef 3 : 15', 2, {'t': 1, 'c1': 1, 'c2': 3, 'x': 12, 'y': 16, 'num': 60}, '15',
          'correct'),
     spec('Erreur : moyenne sans coefficients 14', 2, {'t': 1, 'c1': 1, 'c2': 3, 'x': 12, 'y': 16, 'num': 60},
          '14', 'incorrect'),
     spec('14 coef 2, 9 coef 3 : 11', 2, {'t': 3, 'c1': 2, 'c2': 3, 'x': 14, 'y': 9, 'num': 55}, '11',
          'correct')]), DECIMAL))

# --- 15. 2-417 : fonction renvoyant un écart type ----------------------------------------------------

ECART_TYPE = ('L\'écart type mesure la dispersion autour de la moyenne $m$ : on fait la moyenne des carrés des'
              ' écarts $(x-m)^2$, puis on en prend la **racine carrée**.')

QUE_RENVOIE = variation(
    choix('On considère la fonction Python suivante (`sqrt` est la racine carrée, `x ** 2` le carré de `x`).\n\n'
          + py('from math import sqrt', '', 'def f(a, b, c, d):', '    m = (a + b + c + d) / 4',
               '    v = ((a - m) ** 2 + (b - m) ** 2 + (c - m) ** 2 + (d - m) ** 2) / 4',
               selon('t', ['    return sqrt(v)', '    return v', '    return m']))
          + '\n\nQue renvoie `f(a, b, c, d)` ?',
          ['l\'écart type des quatre valeurs', 'le carré de l\'écart type des quatre valeurs',
           'la moyenne des quatre valeurs', 'l\'étendue des quatre valeurs'], melanger=False),
    [var('t', '0..2')],
    None,
    [ECART_TYPE,
     '`m` est la **moyenne** des quatre valeurs ; `v` est la moyenne des carrés des écarts à `m`, c\'est-à-dire'
     ' le **carré de l\'écart type**.',
     'La fonction renvoie `' + selon('t', ['sqrt(v)', 'v', 'm']) + '` : '
     + selon('t', ['l\'**écart type**.', 'le **carré de l\'écart type** (il manque la racine carrée).',
                   'la **moyenne**.'])],
    [case('{{t}}')])

VALEUR_ECART = variation(
    'On considère la fonction Python suivante.\n\n'
    + py('from math import sqrt', '', 'def ecart_type(a, b, c, d):', '    m = (a + b + c + d) / 4',
         '    v = ((a - m) ** 2 + (b - m) ** 2 + (c - m) ** 2 + (d - m) ** 2) / 4', '    return sqrt(v)')
    + '\n\nQue renvoie `ecart_type({{eval:(m)-(d)}}, {{eval:(m)+(d)}}, {{eval:(m)-(d)}}, {{eval:(m)+(d)}})` ?\n\n$?$',
    [var('m', '8..15'), var('d', '1..6')],
    None,
    [ECART_TYPE,
     '`m` vaut $\\dfrac{ {{eval:(m)-(d)}}+{{eval:(m)+(d)}}+{{eval:(m)-(d)}}+{{eval:(m)+(d)}} }{4}={{m}}$.',
     'Chaque valeur est à ${{d}}$ de ${{m}}$ : chaque écart au carré vaut ${{d}}^2={{eval:(d)^2}}$, donc `v` vaut'
     ' $\\dfrac{4\\times{{eval:(d)^2}}}{4}={{eval:(d)^2}}$.',
     'La fonction renvoie $\\sqrt{ {{eval:(d)^2}} }=' + col('{{d}}') + '$.'],
    [case('{{d}}')])

MODELES.append(avec_partage(modele(
    '15-fonction-ecart-type', 'Lire une fonction Python qui renvoie un écart type',
    'Reconnaître ce que renvoie une fonction de quatre arguments (écart type, son carré, moyenne) ; valeur'
    ' renvoyée par ecart_type(m − d, m + d, m − d, m + d)',
    3,
    [QUE_RENVOIE, VALEUR_ECART],
    [spec('sqrt(v) : écart type', 0, {'t': 0}, '0', 'correct'),
     spec('v : carré de l\'écart type', 0, {'t': 1}, '1', 'correct'),
     spec('Erreur : v pris pour l\'écart type', 0, {'t': 1}, '0', 'incorrect'),
     spec('m : moyenne', 0, {'t': 2}, '2', 'correct'),
     spec('ecart_type(7, 13, 7, 13) = 3', 1, {'m': 10, 'd': 3}, '3', 'correct'),
     spec('Erreur : le carré 9', 1, {'m': 10, 'd': 3}, '9', 'incorrect'),
     spec('Erreur : la moyenne 10', 1, {'m': 10, 'd': 3}, '10', 'incorrect')],
    delay=90), DECIMAL))

os.makedirs(DOSSIER, exist_ok=True)
for nom, m in MODELES:
    with open(os.path.join(DOSSIER, nom + '.json'), 'w', encoding='utf-8') as f:
        json.dump(m, f, ensure_ascii=False, indent='\t')
        f.write('\n')
# Mis en forme comme le pre-commit, pour que le script redonne les fichiers commités
subprocess.run(['pnpm', 'exec', 'prettier', '--write', DOSSIER], check=True,
               stdout=subprocess.DEVNULL)
print(f'{len(MODELES)} modèles écrits dans {DOSSIER}')
