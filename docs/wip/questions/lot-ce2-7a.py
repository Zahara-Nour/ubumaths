"""Écrit les 10 modèles du lot 7a du CE2 (calcul posé et monnaie) dans scripts/questions/ce2-7a/.

Phase 0 validée par David le 2026-11-02 (§ 11 du journal `docs/wip/questions-ce2-progress.md`,
« tes recos ? » puis « ok »). Bornes `cycle2.json` : CE2-016 et 090 (entiers ≤ 10 000), CE2-019
(2 ou 3 chiffres × 1 ou 2 chiffres, produit ≤ 10 000 ; 16 × 548 = 8 768), CE2-055 et 056
(montants à virgule, 3 termes au plus, unités mêlées : 43,45 € + 68 centimes ; 143 € + 3,67 € +
54 centimes ; 74,56 € − 15,30 €), CE2-054 (achats avec pièces et billets), CE2-080 (rendre la
monnaie par ajouts : 5 € pour 3,68 € = 32 c puis 1 €). Décisions :

1. Deux modèles de soustraction posée, un par méthode (cassage, compensation).
2. Multiplication : niveaux 2 et 3 de « Entiers · Multiplier · Calcul posé » (CM1 : 1), le publié
   ne bouge pas.
3. Unités mêlées (055) : texte seul, l'élève convertit puis pose ; l'opération n'est PAS dessinée
   dans le corrigé (le corrigé écrit le calcul en formule).
4. Un seul lot de 10 modèles.
5. Rendre la monnaie : une variation guidée (deux ajouts), puis le total rendu (case), puis la
   monnaie posée (`construire:`).

Catégories (relevé MCP du 2026-11-02, à relire avant la publication) : Addition / Calcul posé 3 ;
Soustraction / Calcul posé 3 (cassage) et 4 (compensation) ; Entiers · Multiplier · Calcul posé
2 et 3 ; Monnaie / Euros et centimes 3 et 4 ; Pièces et billets 12 ; Rendre la monnaie 5 et 6.

Opérations : la case d'une opération posée n'a pas d'`expectedAnswer` (le bloc calcule la
réponse) ; les variables dérivées (chiffres, retenues) viennent de `a` et `b`, les specs ne
fixent que les racines. Jamais de variable `e` ni `i`.

    python3 docs/wip/questions/lot-ce2-7a.py scripts/questions/ce2-7a
"""
import json
import sys

DOSSIER = sys.argv[1]
SANS_ZEROS = {'constraints': {'zeros': 'off'}}

# ---- Gabarits ----


def spec(desc, vi, variables, answers, status):
    return {'description': desc, 'variationIndex': vi,
            'variables': {k: str(x) for k, x in variables.items()},
            'answers': answers if isinstance(answers, list) else [answers],
            'expected': {'status': status}}


def modele(title, description, theme, domain, subdomain, level, variations, specs, delay=120,
           options=None):
    # theme / domain / subdomain : anciennes colonnes, remplies pour create-questions ; le
    # rangement (sous-notion du point) est posé par la migration
    m = {'title': title, 'description': description, 'grades': ['CE2'], 'theme': theme,
         'domain': domain, 'subdomain': subdomain, 'level': level, 'delay': delay,
         'status': 'draft'}
    if options:
        m['options'] = options
    m.update({'variations': variations, 'testSpecs': specs})
    return m


def var(nom, expression):
    return {'name': nom, 'expression': expression}


def variation(statement, reponses, variables, etapes, conditions=None):
    v = {'statement': statement, 'variables': variables}
    if conditions:
        v['conditions'] = conditions
    v['blanks'] = [r if isinstance(r, dict) else {'expectedAnswer': r} for r in reponses]
    v['correction'] = {'steps': etapes}
    return v


def bloc(nom, *lignes):
    return '\n\n```' + nom + '\n' + '\n'.join(lignes) + '\n```'


def choix(lignes, melanger=True):
    tete = '' if melanger else 'melanger: non\n'
    return '\n\n```choix\n' + tete + ''.join('- ' + c + '\n' for c in lignes) + '```'


def selon(k, textes, n=1):
    """`{{if:k==1|…|{{if:k==2|…|…}}}}` : le texte numéro k (à partir de 1)."""
    if len(textes) == 1:
        return textes[0]
    return ('{{if:' + k + '==' + str(n) + '|' + textes[0] + '|' + selon(k, textes[1:], n + 1)
            + '}}')


def ev(x):
    return '{{eval:' + x + '}}'


def col(x, k=0):
    return '\\textcolor{{{color:primary.' + str(k) + '}}}{' + x + '}'


def fr(n):
    """Entier à la française, réponse d'une spec : 1 776, 9 022."""
    return f'{n:,}'.replace(',', ' ')


# ---- Colonnes (addition, soustraction, multiplication) ----

POSE = 'Pose et calcule.\n\n```operation\ncalcul: '
ALIGNER = 'On aligne les chiffres : unités sous les unités, dizaines sous les dizaines, et ainsi de suite.'
NOM = ['Unités', 'Dizaines', 'Centaines', 'Milliers']


def chiffre(t, j):
    """Chiffre de rang j (0 = unités) de l'expression t."""
    return f'mod({t},10)' if j == 0 else f'mod(floor({t}/{10 ** j}),10)'


def retenue_entrante(termes, j):
    """Retenue qui arrive en colonne j (j ≥ 1) dans une addition."""
    return ('floor((' + '+'.join(f'mod({t},{10 ** j})' for t in termes) + ')/' + str(10 ** j)
            + ')')


def etapes_addition(termes, n):
    """Une étape par colonne, de droite à gauche ; n colonnes."""
    etapes = [ALIGNER]
    for j in range(n):
        digs = [chiffre(t, j) for t in termes]
        cin = retenue_entrante(termes, j) if j else None
        somme = '+'.join(digs) + (('+' + cin) if j else '')
        texte = (NOM[j] + ' : $' + ' + '.join(ev(d) for d in digs)
                 + (('{{if:' + cin + '>0| + ' + ev(cin) + '|}}') if j else '')
                 + ' = ' + ev(somme) + '$')
        if j < n - 1:
            texte += ('{{if:' + somme + '>=10| : on écrit $' + ev('mod(' + somme + ',10)')
                      + '$ et on retient $' + ev('floor((' + somme + ')/10)')
                      + '$ à la colonne suivante.|.}}')
        else:
            texte += '.'
        etapes.append(texte)
    return etapes


def sans_retenue(*termes):
    """L'erreur « retenue oubliée » : chaque colonne réduite à son chiffre des unités."""
    res, rang = 0, 1
    while any(t // rang for t in termes):
        res += sum(t // rang % 10 for t in termes) % 10 * rang
        rang *= 10
    return res


# ---- 01. Addition posée (CE2-016) ----

TETE_ADD = POSE + '{{a}} + {{b}}\nretenues: oui\n```'


def addition_deux_termes(plage_a, plage_b, conditions, n):
    return variation(
        TETE_ADD, [], [var('a', plage_a), var('b', plage_b)],
        etapes_addition(['a', 'b'], n)
        + ['$${{a}} + {{b}} = ' + col(ev('a+b')) + '$$'], conditions)


ADD_4_3 = addition_deux_termes(
    '1001..8999', '101..999', ['mod(a,10) + mod(b,10) >= 10', 'a + b < 10000'], 4)
ADD_4_4 = addition_deux_termes(
    '1001..5999', '1001..3999',
    ['mod(a,10) + mod(b,10) >= 10', 'mod(a,100) + mod(b,100) >= 100', 'a + b < 10000'], 4)
# BO : plusieurs termes ; ici quatre, trois, deux chiffres
ADD_3_TERMES = variation(
    POSE + '{{a}} + {{b}} + {{c}}\nretenues: oui\n```', [],
    [var('a', '1001..4999'), var('b', '101..999'), var('c', '11..99')],
    etapes_addition(['a', 'b', 'c'], 4)
    + ['$${{a}} + {{b}} + {{c}} = ' + col(ev('a+b+c')) + '$$'],
    ['mod(a,10) + mod(b,10) + mod(c,10) >= 10', 'a + b + c < 10000'])
# Retenues en chaîne : 3 999 + 1 001
ADD_CHAINE = variation(
    TETE_ADD, [],
    [var('p', '1..8'), var('s', '0..9'), var('t', '0..9'), var('q', '1..9'),
     var('a', 'eval:1000*p+999'), var('b', 'eval:100*s+10*t+q')],
    etapes_addition(['a', 'b'], 4)
    + ['Les retenues se suivent de colonne en colonne : ${{a}} + {{b}} = '
       + col(ev('a+b')) + '$.'],
    ['a + b < 10000'])


def vars_ab(a, b):
    return {'a': a, 'b': b}


SPECS_ADDITION = [
    spec('4 758 + 645 = 5 403', 0, vars_ab(4758, 645), '5403', 'correct'),
    spec('Erreur : retenues oubliées, 4 758 + 645', 0, vars_ab(4758, 645),
         str(sans_retenue(4758, 645)), 'incorrect'),
    spec('2 678 + 1 945 = 4 623', 1, vars_ab(2678, 1945), '4623', 'correct'),
    spec('Erreur : retenues oubliées, 2 678 + 1 945', 1, vars_ab(2678, 1945),
         str(sans_retenue(2678, 1945)), 'incorrect'),
    spec('Erreur : 1 945 lu 945, 2 678 + 945', 1, vars_ab(2678, 1945), '3623', 'incorrect'),
    spec('2 658 + 746 + 87 = 3 491', 2, {'a': 2658, 'b': 746, 'c': 87}, '3491', 'correct'),
    spec('Erreur : retenues oubliées, 2 658 + 746 + 87', 2, {'a': 2658, 'b': 746, 'c': 87},
         str(sans_retenue(2658, 746, 87)), 'incorrect'),
    spec('Retenues en chaîne : 3 999 + 456 = 4 455', 3, {'p': 3, 's': 4, 't': 5, 'q': 6}, '4455', 'correct'),
    spec('Erreur : retenue de la chaîne oubliée, 3 999 + 456', 3,
         {'p': 3, 's': 4, 't': 5, 'q': 6}, str(sans_retenue(3999, 456)), 'incorrect'),
]

# ---- 02 et 03. Soustraction posée (CE2-090), cassage et compensation ----


def etapes_soustraction(methode, n):
    """n colonnes ; f0 à f3 : la colonne j doit emprunter à la suivante ; x_j, y_j : chiffres."""
    etapes = [ALIGNER]
    for j in range(n):
        x, y = '{{x%d}}' % j, '{{y%d}}' % j
        fj = 'f%d' % j
        fp = 'f%d' % (j - 1)
        if methode == 'cassage':
            def calcul(base):
                """La colonne avec `base` en haut : on ôte directement, ou on casse."""
                return ('{{if:' + fj + '==1|on ne peut pas ôter $' + y + '$ de $' + ev(base)
                        + '$ : on casse une unité de la colonne suivante, ce qui donne $'
                        + ev(base + '+10') + '$. $' + ev(base + '+10') + ' - ' + y + ' = '
                        + ev(base + '+10-y%d' % j) + '$.|$' + ev(base) + ' - ' + y + ' = '
                        + ev(base + '-y%d' % j) + '$.}}')
            if j == 0:
                texte = NOM[j] + ' : ' + calcul('x0')
            else:
                base = 'x%d-f%d' % (j, j - 1)
                zero = ('{{if:x%d==0|il n\'y a rien à casser ici : on casse une unité de la colonne'
                        ' suivante, on a $10$, on en cède $1$ à la colonne de droite : il reste $9$.'
                        ' $9 - ' % j + y + ' = ' + ev('9-y%d' % j) + '$.|')
                texte = NOM[j] + ' : {{if:' + fp + '==1|' + zero + 'on a cassé une unité de cette'
                texte += (' colonne pour celle de droite : $' + x + '$ devient $' + ev(base)
                          + '$ ; ' + calcul(base) + '}}|' + calcul('x%d' % j) + '}}')
        else:
            def calcul_c(bas):
                return ('{{if:' + fj + '==1|on ne peut pas ôter $' + ev(bas) + '$ de $' + x
                        + '$ : on ajoute $10$ en haut : $' + ev('x%d+10' % j) + ' - ' + ev(bas)
                        + ' = ' + ev('x%d+10-(%s)' % (j, bas)) + '$ ; on compensera dans la colonne'
                        ' suivante.|$' + x + ' - ' + ev(bas) + ' = ' + ev('x%d-(%s)' % (j, bas))
                        + '$.}}')
            if j == 0:
                texte = NOM[j] + ' : ' + calcul_c('y0')
            else:
                bas = 'y%d+f%d' % (j, j - 1)
                texte = (NOM[j] + ' : {{if:' + fp + '==1|en bas, $' + y + '$ devient $' + y
                         + ' + 1 = ' + ev(bas) + '$ (compensation) ; ' + calcul_c(bas) + '|'
                         + calcul_c('y%d' % j) + '}}')
        etapes.append(texte)
    return etapes


def derives_soustraction():
    v = []
    for j in range(4):
        v.append(var('x%d' % j, 'eval:' + chiffre('a', j)))
        v.append(var('y%d' % j, 'eval:' + chiffre('b', j)))
    for j in range(4):
        m = 10 ** (j + 1)
        v.append(var('f%d' % j, '{{if:mod(a,%d)<mod(b,%d)|1|0}}' % (m, m)))
    return v


def soustraction(methode):
    tete = POSE + '{{a}} − {{b}}\nméthode: ' + methode + '\n```'
    fin = ['$${{a}} - {{b}} = ' + col(ev('a-b')) + '$$']
    et = etapes_soustraction(methode, 4)
    quatre_trois = variation(
        tete, [], [var('a', '1001..9999'), var('b', '101..999')] + derives_soustraction(),
        et + fin, ['mod(a,10) < mod(b,10)', 'a > b'])
    quatre_quatre = variation(
        tete, [], [var('a', '2001..9999'), var('b', '1001..8999')] + derives_soustraction(),
        et + fin, ['mod(a,100) < mod(b,100)', 'a > b'])
    # Zéros : 5 002 − 1 847, 3 000 − 478 (l'échange traverse les zéros)
    zeros = variation(
        tete, [], [var('p', '2..9'), var('r', '0..8'), var('a', 'eval:1000*p+r'),
                   var('b', '101..999')] + derives_soustraction(),
        et + fin, ['a > b'])
    return [quatre_trois, quatre_quatre, zeros]


def ecart(a, b):
    """L'erreur « plus petit ôté du plus grand » dans chaque colonne."""
    res, rang = 0, 1
    while a // rang or b // rang:
        res += abs(a // rang % 10 - b // rang % 10) * rang
        rang *= 10
    return res


SPECS_SOUSTRACTION = [
    spec('6 453 − 278 = 6 175', 0, vars_ab(6453, 278), '6175', 'correct'),
    spec('Erreur : plus petit ôté du plus grand, 6 453 − 278', 0, vars_ab(6453, 278),
         str(ecart(6453, 278)), 'incorrect'),
    spec('7 305 − 2 468 = 4 837', 1, vars_ab(7305, 2468), '4837', 'correct'),
    spec('Erreur : plus petit ôté du plus grand, 7 305 − 2 468', 1, vars_ab(7305, 2468),
         str(ecart(7305, 2468)), 'incorrect'),
    spec('5 002 − 847 = 4 155', 2, {'p': 5, 'r': 2, 'b': 847}, '4155', 'correct'),
    spec('Erreur : plus petit ôté du plus grand, 5 002 − 847', 2, {'p': 5, 'r': 2, 'b': 847},
         str(ecart(5002, 847)), 'incorrect'),
    spec('Erreur : zéros mal échangés, 5 002 − 847 = 5 245', 2, {'p': 5, 'r': 2, 'b': 847},
         '5245', 'incorrect'),
    spec('3 000 − 478 = 2 522', 2, {'p': 3, 'r': 0, 'b': 478}, '2522', 'correct'),
]

# ---- 04 et 05. Multiplication posée (CE2-019) ----


def retenue_mult(j):
    """Expression (en a, b) du total de la colonne j : chiffre × b + retenue."""
    t = f'{chiffre("a", j)}*b'
    return t if j == 0 else f'({chiffre("a", j)}*b+floor(({retenue_mult(j - 1)})/10))'


def etapes_mult_un_chiffre(n):
    etapes = ['On multiplie chaque chiffre de ${{a}}$ par ${{b}}$, en commençant par les unités, et on'
              ' retient les dizaines.']
    for j in range(n):
        d, t = chiffre('a', j), retenue_mult(j)
        prec = f'floor(({retenue_mult(j - 1)})/10)' if j else None
        texte = (NOM[j] + ' : $' + ev(d) + ' \\times {{b}}'
                 + (('{{if:' + prec + '>0| + ' + ev(prec) + '|}}') if j else '')
                 + ' = ' + ev(t) + '$')
        if j < n - 1:
            texte += ('{{if:' + t + '>=10| : on écrit $' + ev('mod(' + t + ',10)')
                      + '$ et on retient $' + ev('floor((' + t + ')/10)') + '$.|.}}')
        else:
            texte += ' : on écrit $' + ev(t) + '$.'
        etapes.append(texte)
    return etapes


FIN_MULT = ['$${{a}} \\times {{b}} = ' + col(ev('a*b')) + '$$']

MULT_2_1 = variation(
    POSE + '{{a}} × {{b}}\n```', [], [var('a', '12..99'), var('b', '2..9')],
    etapes_mult_un_chiffre(2) + FIN_MULT, ['mod(a,10)*b >= 10'])
MULT_3_1 = variation(
    POSE + '{{a}} × {{b}}\n```', [], [var('a', '102..999'), var('b', '2..9')],
    etapes_mult_un_chiffre(3) + FIN_MULT, ['mod(a,10)*b >= 10'])
# Un 0 au milieu : 305 × 7
MULT_ZERO = variation(
    POSE + '{{a}} × {{b}}\n```', [],
    [var('x', '1..9'), var('z', '1..9'), var('a', 'eval:100*x+z'), var('b', '2..9')],
    etapes_mult_un_chiffre(3) + FIN_MULT, [])

SPECS_MULT_1 = [
    spec('48 × 7 = 336', 0, {'a': 48, 'b': 7}, '336', 'correct'),
    spec('Erreur : retenue oubliée, 48 × 7 = 286', 0, {'a': 48, 'b': 7}, '286', 'incorrect'),
    spec('548 × 6 = 3 288', 1, {'a': 548, 'b': 6}, fr(3288), 'correct'),
    spec('Erreur : retenue oubliée, 548 × 6 = 2 748', 1, {'a': 548, 'b': 6}, fr(2748),
         'incorrect'),
    spec('305 × 7 = 2 135', 2, {'x': 3, 'z': 5, 'b': 7}, fr(2135), 'correct'),
    spec('Erreur : 0 × 7 oublié, 305 × 7 = 215', 2, {'x': 3, 'z': 5, 'b': 7}, '215',
         'incorrect'),
]

PRODUITS = ('On multiplie ${{a}}$ par chaque chiffre de ${{b}}$, en commençant par les unités.')


def etapes_mult_deux_chiffres():
    return [PRODUITS, 'Unités : ${{a}} \\times {{u}} = ' + ev('a*u') + '$.',
            'Dizaines : ${{a}} \\times {{d}} = ' + ev('a*d') + '$ dizaines : on l\'écrit avec un'
            ' $0$ de décalage, $' + ev('10*a*d') + '$.',
            'On additionne : $' + ev('a*u') + ' + ' + ev('10*a*d') + ' = ' + ev('a*b') + '$.']


DERIVES_2 = [var('u', 'eval:mod(b,10)'), var('d', 'eval:floor(b/10)')]
MULT_2_2 = variation(
    POSE + '{{a}} × {{b}}\n```', [], [var('a', '12..99'), var('b', '12..99')] + DERIVES_2,
    etapes_mult_deux_chiffres() + FIN_MULT, ['mod(b,10) != 0'])
MULT_3_2 = variation(
    POSE + '{{a}} × {{b}}\n```', [], [var('a', '101..525'), var('b', '11..19')] + DERIVES_2,
    etapes_mult_deux_chiffres() + FIN_MULT, ['mod(b,10) != 0', 'a*b <= 10000'])
# × 20, × 30 : une seule ligne non nulle
MULT_DIZAINES = variation(
    POSE + '{{a}} × {{b}}\n```', [],
    [var('a', '12..99'), var('d', '2..9'), var('b', 'eval:10*d')],
    [PRODUITS, 'Le chiffre des unités de ${{b}}$ est $0$ : sa ligne vaudrait $0$, on la saute.',
     'Dizaines : ${{a}} \\times {{d}} = ' + ev('a*d') + '$ dizaines : on l\'écrit avec un $0$ de'
     ' décalage, $' + ev('10*a*d') + '$.'] + FIN_MULT, [])

SPECS_MULT_2 = [
    spec('48 × 37 = 1 776', 0, {'a': 48, 'b': 37}, fr(1776), 'correct'),
    spec('Erreur : décalage oublié, 48 × 7 + 48 × 3 = 480', 0, {'a': 48, 'b': 37}, '480',
         'incorrect'),
    spec('348 × 16 = 5 568', 1, {'a': 348, 'b': 16}, fr(5568), 'correct'),
    spec('Erreur : décalage oublié, 348 × 6 + 348 = 2 436', 1, {'a': 348, 'b': 16}, fr(2436),
         'incorrect'),
    spec('46 × 30 = 1 380', 2, {'a': 46, 'd': 3}, fr(1380), 'correct'),
    spec('Erreur : le zéro oublié, 46 × 3 = 138', 2, {'a': 46, 'd': 3}, '138', 'incorrect'),
]

# ---- Monnaie ----

EURO = '~\\text{€}'  # juste après une case : case de nombre
CENT = '~\\text{centimes}'
RESERVE = 'réserve: 50 20 10 5 2 1 50c 20c 10c 5c 2c 1c'
OBJETS = ['Le livre', 'Le ballon', 'Le jeu', 'La trousse', 'Le cahier', 'La gourde']


def euros(c):
    """Prix de `c` centimes, toujours à deux décimales (« 7.50 », « 1.05 »)."""
    return ('{{eval:floor((' + c + ')/100)}}.{{eval:floor(mod(' + c + ',100)/10)}}{{eval:mod('
            + c + ',10)}}')


def prix(c, couleur=False):
    """Prix de `c` centimes en formule : $7.50~\\unit{€}$."""
    p = euros(c)
    return '$' + (col(p) if couleur else p) + '~\\unit{€}$'


def en_euros(c):
    """Attendu d'une case en euros : `c` centimes, écriture décimale."""
    return '{{eval:(' + c + ')/100;d}}'


def virgule(c):
    """Réponse de spec : `c` centimes en euros, « 19,86 », « 59,3 » (zéros de fin ôtés)."""
    s = f'{c // 100},{c % 100:02d}'.rstrip('0').rstrip(',')
    return s


VIRGULES = ('On aligne les virgules : centimes sous centimes, euros sous euros. On calcule comme'
            ' avec des nombres entiers, de droite à gauche ; la virgule du résultat se place sous'
            ' les autres.')

# ---- 06. Addition de montants (CE2-055) ----

TETE_MONTANTS = 'Pose et calcule, en euros.\n\n```operation\ncalcul: '

ADD_MONTANTS = variation(
    TETE_MONTANTS + euros('p') + ' + ' + euros('q') + '\n```', [],
    [var('p', '101..4999'), var('q', '101..4999')],
    [VIRGULES,
     '$' + euros('p') + '~\\unit{€} + ' + euros('q') + '~\\unit{€} = ' + col(euros('p+q'))
     + '~\\unit{€}$'],
    ['mod(p,100) != 0', 'mod(q,100) != 0', 'mod(p,100) + mod(q,100) >= 100'])

ADD_MONTANTS_3 = variation(
    TETE_MONTANTS + euros('p') + ' + ' + euros('q') + ' + ' + euros('r') + '\n```', [],
    [var('p', '101..3999'), var('q', '101..3999'), var('r', '101..3999')],
    [VIRGULES,
     '$' + euros('p') + '~\\unit{€} + ' + euros('q') + '~\\unit{€} + ' + euros('r')
     + '~\\unit{€} = ' + col(euros('p+q+r')) + '~\\unit{€}$'],
    ['mod(p,100) != 0', 'mod(q,100) != 0', 'mod(r,100) != 0',
     'mod(p,100) + mod(q,100) + mod(r,100) >= 100'])

# BO : 43,45 € + 68 centimes (unités mêlées : on convertit d'abord)
ADD_MELEES = variation(
    'Calcule : ' + prix('p') + ' + $' + '{{c}}$ centimes.\n\n$?' + EURO + '$',
    [en_euros('p+c')],
    [var('p', '1001..9999'), var('c', '10..99')],
    ['On convertit : ${{c}}$ centimes, c\'est ' + prix('c') + '.',
     VIRGULES, '$' + euros('p') + '~\\unit{€} + ' + euros('c') + '~\\unit{€} = '
     + col(euros('p+c')) + '~\\unit{€}$'],
    ['mod(p,100) != 0'])

# BO : 143 € + 3,67 € + 54 centimes
ADD_MELEES_3 = variation(
    'Calcule : ${{n}}~\\unit{€}$ + ' + prix('b') + ' + $' + '{{c}}$ centimes.\n\n$?' + EURO
    + '$', [en_euros('100*n+b+c')],
    [var('n', '20..300'), var('b', '101..999'), var('c', '10..99')],
    ['On convertit : ${{c}}$ centimes, c\'est ' + prix('c') + '.',
     VIRGULES, '${{n}}~\\unit{€} + ' + euros('b') + '~\\unit{€} + ' + euros('c')
     + '~\\unit{€} = ' + col(euros('100*n+b+c')) + '~\\unit{€}$'],
    ['mod(b,100) != 0'])

SPECS_ADD_MONTANTS = [
    spec('4,56 € + 15,30 € = 19,86 €', 0, {'p': 456, 'q': 1530}, '19,86', 'correct'),
    spec('Erreur : virgule oubliée (1986)', 0, {'p': 456, 'q': 1530}, '1986', 'incorrect'),
    spec('Erreur : 4,56 + 15,3 lu 4,56 + 1,53', 0, {'p': 456, 'q': 1530}, '6,09', 'incorrect'),
    spec('8,95 + 12,40 + 3,75 = 25,10', 1, {'p': 895, 'q': 1240, 'r': 375}, '25,1', 'correct'),
    spec('Erreur : retenue des centimes oubliée (2 € de moins)', 1, {'p': 895, 'q': 1240, 'r': 375}, '23,1',
         'incorrect'),
    spec('43,45 € + 68 centimes = 44,13 €', 2, {'p': 4345, 'c': 68}, '44,13', 'correct'),
    spec('Erreur : 68 centimes pris pour 68 € (111,45)', 2, {'p': 4345, 'c': 68}, '111,45',
         'incorrect'),
    spec('143 € + 3,67 € + 54 centimes = 147,21 €', 3, {'n': 143, 'b': 367, 'c': 54}, '147,21',
         'correct'),
    spec('Erreur : 54 centimes pris pour 54 € (200,67)', 3, {'n': 143, 'b': 367, 'c': 54},
         '200,67', 'incorrect'),
]

# ---- 07. Soustraction de montants (CE2-056) ----

SOUS_MONTANTS = variation(
    TETE_MONTANTS + euros('p') + ' − ' + euros('q') + '\n```', [],
    [var('p', '2001..9999'), var('q', '101..1999')],
    [VIRGULES, '$' + euros('p') + '~\\unit{€} - ' + euros('q') + '~\\unit{€} = '
     + col(euros('p-q')) + '~\\unit{€}$'],
    ['mod(p,100) != 0', 'mod(q,100) != 0', 'mod(p,100) >= mod(q,100)', 'p > q'])

SOUS_MONTANTS_EMPRUNT = variation(
    TETE_MONTANTS + euros('p') + ' − ' + euros('q') + '\n```', [],
    [var('p', '2001..9999'), var('q', '101..1999')],
    [VIRGULES, 'Les centimes : on ne peut pas ôter ' + ev('mod(q,100)') + ' de ' + ev('mod(p,100)')
     + ' : on prend $1$ euro de la colonne suivante, qui vaut $100$ centimes.',
     '$' + euros('p') + '~\\unit{€} - ' + euros('q') + '~\\unit{€} = '
     + col(euros('p-q')) + '~\\unit{€}$'],
    ['mod(p,100) != 0', 'mod(q,100) != 0', 'mod(p,100) < mod(q,100)', 'p > q'])

# BO : 143,45 € − 68 € (un montant entier)
SOUS_ENTIER = variation(
    TETE_MONTANTS + euros('p') + ' − {{n}}\n```', [],
    [var('p', '10001..19999'), var('n', '21..99')],
    [VIRGULES, '${{n}}$ est un nombre entier : on peut penser ${{n}}{,}00$.',
     '$' + euros('p') + '~\\unit{€} - {{n}}~\\unit{€} = ' + col(euros('p-100*n'))
     + '~\\unit{€}$'],
    ['mod(p,100) != 0', 'p > 100*n'])

RESTE = variation(
    'Léa avait ' + prix('p') + '. Elle dépense ' + prix('q') + '. Combien lui reste-t-il ?'
    + bloc('operation', 'calcul: ' + euros('p') + ' − ' + euros('q')), [],
    [var('p', '2001..9999'), var('q', '101..1999')],
    [VIRGULES, 'Il lui reste ' + prix('p-q', True) + '.'],
    ['mod(p,100) != 0', 'mod(q,100) != 0', 'p > q'])

SPECS_SOUS_MONTANTS = [
    spec('74,56 € − 15,30 € = 59,26 €', 0, {'p': 7456, 'q': 1530}, '59,26', 'correct'),
    spec('Erreur : virgule oubliée (5926)', 0, {'p': 7456, 'q': 1530}, '5926', 'incorrect'),
    spec('74,36 € − 12,58 € = 61,78 €', 1, {'p': 7436, 'q': 1258}, '61,78', 'correct'),
    spec('Erreur : plus petit ôté du plus grand (62,22)', 1, {'p': 7436, 'q': 1258}, '62,22',
         'incorrect'),
    spec('143,45 € − 68 € = 75,45 €', 2, {'p': 14345, 'n': 68}, '75,45', 'correct'),
    spec('Erreur : 68 ôté des centimes (142,77)', 2, {'p': 14345, 'n': 68}, '142,77',
         'incorrect'),
    spec('Il lui reste 60,16 €', 3, {'p': 7436, 'q': 1420}, '60,16', 'correct'),
]

# ---- 08. Simule tes achats (CE2-054) ----

ACHATS_RESERVE = 'réserve: 20 10 5 2 1 50c 20c 10c 5c'

UN_ARTICLE = variation(
    'Tu achètes ' + selon('o', ['un livre', 'un ballon', 'un jeu']) + ' à ' + prix('p')
    + '. Paie-le avec des pièces et des billets.'
    + bloc('monnaie', 'construire: {{p}}c', RESERVE), [],
    [var('o', '1..3'), var('k', '201..4999'), var('p', 'eval:5*k')],
    ['On pose exactement le prix : ' + prix('p') + ', c\'est ${{eval:floor(p/100)}}~\\unit{€}$ et'
     ' ${{eval:mod(p,100)}}$ centimes.', 'Il y a d\'autres façons justes : ce qui compte, c\'est'
     ' la somme posée.'],
    ['mod(p,100) != 0'])

TROIS_ARTICLES = variation(
    'Tu achètes ' + selon('o', ['un cahier', 'un stylo', 'une règle']) + ' à ' + prix('a')
    + ', un classeur à ' + prix('b') + ' et une trousse à ' + prix('c')
    + '. Paie tes achats.' + bloc('monnaie', 'construire: {{s}}c', RESERVE), [],
    [var('o', '1..3'), var('x', '40..400'), var('y', '100..800'), var('z', '200..900'),
     var('a', 'eval:5*x'), var('b', 'eval:5*y'), var('c', 'eval:5*z'), var('s', 'eval:a+b+c')],
    ['On additionne les trois prix : les euros ensemble, les centimes ensemble.',
     '$' + euros('a') + '~\\unit{€} + ' + euros('b') + '~\\unit{€} + ' + euros('c')
     + '~\\unit{€} = ' + col(euros('s')) + '~\\unit{€}$', 'Tu paies ' + prix('s') + '.'],
    ['mod(a,100) != 0', 'mod(b,100) != 0', 'mod(c,100) != 0', 's < 10000'])

SANS_UN_EURO = variation(
    'Tu paies ' + prix('p') + ' sans pièce de $1~\\unit{€}$ ni de $2~\\unit{€}$.'
    + bloc('monnaie', 'construire: {{p}}c', 'réserve: 20 10 5 50c 20c 10c 5c'), [],
    [var('k', '120..999'), var('p', 'eval:5*k')],
    ['$1~\\unit{€}$, c\'est $100$ centimes : deux pièces de $50$ centimes, ou cinq pièces de $20$'
     ' centimes.', prix('p') + ', c\'est ${{eval:floor(p/100)}}~\\unit{€}$ et'
     ' ${{eval:mod(p,100)}}$ centimes : on pose des billets de $5$, $10$, $20~\\unit{€}$ et des'
     ' pièces de centimes.'],
    ['mod(p,100) != 0'])

PEUT_ACHETER = variation(
    'Voici l\'argent de Léo.' + bloc('monnaie', 'billets: {{k}}×10 {{m}}×5',
                                     'pièces: {{g}}×2 {{h}}×1 {{a}}×50c {{b}}×20c {{c}}×10c')
    + '\n\nIl veut acheter ' + selon('o', ['un livre', 'un jeu', 'un ballon']) + ' à '
    + prix('p') + '. Peut-il l\'acheter ?' + choix(['Oui', 'Non'], melanger=False), ['{{r}}'],
    [var('o', '1..3'), var('k', '0..2'), var('m', '0..2'), var('g', '0..2'), var('h', '0..2'),
     var('a', '0..1'), var('b', '0..2'), var('c', '0..2'),
     var('x', 'eval:1000*k+500*m+200*g+100*h+50*a+20*b+10*c'), var('d', '-6..6'),
     var('p', 'eval:x+10*d'), var('r', '{{if:x>=p|0|1}}')],
    ['Léo a ' + prix('x') + '.',
     '{{if:r==0|' + prix('x') + ', c\'est plus que ' + prix('p')
     + ' : oui, il peut l\'acheter.|' + prix('x') + ', c\'est moins que ' + prix('p')
     + ' : non, il lui manque ' + prix('p-x') + '.}}'],
    ['d != 0', 'x >= 500', 'mod(p,100) != 0', 'mod(x,100) != 0'])

SPECS_ACHATS = [
    spec('Poser 12,45 €', 0, {'o': 1, 'k': 249}, '12,45', 'correct'),
    spec('Erreur : 12,4 posé pour 12,45 €', 0, {'o': 1, 'k': 249}, '12,4', 'incorrect'),
    spec('Trois articles : 3,50 + 8,20 + 5,95 = 17,65 €',
         1, {'o': 1, 'x': 70, 'y': 164, 'z': 119}, '17,65', 'correct'),
    spec('Erreur : deux articles seulement (11,70 €)', 1,
         {'o': 1, 'x': 70, 'y': 164, 'z': 119}, '11,7', 'incorrect'),
    spec('Sans 1 € : 7,35 € posé', 2, {'k': 147}, '7,35', 'correct'),
    spec('Erreur : 7,3 € posé pour 7,35 €', 2, {'k': 147}, '7,3', 'incorrect'),
    spec('Léo a 12,80 €, le jeu coûte 12,50 € : oui', 3,
         {'o': 2, 'k': 1, 'm': 0, 'g': 1, 'h': 1, 'a': 1, 'b': 1, 'c': 1, 'd': -3},
         '0', 'correct'),
    spec('Erreur : non à 12,50 € avec 13 €', 3,
         {'o': 2, 'k': 1, 'm': 0, 'g': 1, 'h': 1, 'a': 1, 'b': 1, 'c': 1, 'd': -3},
         '1', 'incorrect'),
]

# ---- 09 et 10. Rendre la monnaie par ajouts (CE2-080) ----

# Billet donné, en euros, et sa ligne ```monnaie
PAIEMENTS = [(5, 'billets: 1×5', '105..495'), (10, 'billets: 1×10', '505..995'),
             (20, 'billets: 1×20', '1005..1995'), (50, 'billets: 1×50', '2005..4995')]


def ajouts(B):
    """Rendu par ajouts : jusqu'à l'euro suivant, puis jusqu'au billet."""
    haut = '(p + 100 - mod(p,100))'
    vers_euro = ('De ' + prix('p') + ' à $' + ev(haut + '/100') + '~\\unit{€}$, il faut $'
                 + ev('100 - mod(p,100)') + '$ centimes.')
    return [vers_euro + ' Puis de $' + ev(haut + '/100') + '~\\unit{€}$ à $' + str(B)
            + '~\\unit{€}$, il faut $' + ev(str(B) + ' - ' + haut + '/100') + '~\\unit{€}$.']


GUIDE = variation(
    '{{if:m==1|Un livre|{{if:m==2|Un jeu|Une gourde}}}} coûte ' + prix('p') + '. Tu paies avec'
    ' ' + selon('m', ['ce billet de $5~\\unit{€}$', 'ce billet de $10~\\unit{€}$',
                       'ce billet de $20~\\unit{€}$']) + ' :'
    + bloc('monnaie', selon('m', ['billets: 1×5', 'billets: 1×10', 'billets: 1×20']))
    + '\n\nTu es le marchand : rends la monnaie par ajouts.\n\n$' + euros('p')
    + '~\\unit{€} + ?' + CENT + ' = {{eval:floor(p/100)+1}}~\\unit{€}$\n\n$'
    '{{eval:floor(p/100)+1}}~\\unit{€} + ?' + EURO + ' = {{B}}~\\unit{€}$',
    [ev('100-mod(p,100)'), ev('B-floor(p/100)-1')],
    [var('m', '1..3'), var('B', '{{if:m==1|5|{{if:m==2|10|20}}}}'), var('p', '105..1995')],
    ['De ' + prix('p') + ' à $' + ev('floor(p/100)+1') + '~\\unit{€}$, il faut $'
     + col(ev('100-mod(p,100)')) + '$ centimes.',
     'De $' + ev('floor(p/100)+1') + '~\\unit{€}$ à $' + '{{B}}' + '~\\unit{€}$, il faut $'
     + col(ev('B-floor(p/100)-1')) + '~\\unit{€}$.',
     'Au total, le marchand rend ' + prix('100*B-p') + '.'],
    ['mod(p,100) != 0', 'floor(p/100) + 1 < B', 'p < 100*B', 'floor(p/100) + 1 >= B/2'])


def rendu_total(n):
    B, ligne, plage = PAIEMENTS[n]
    return variation(
        selon('o', OBJETS) + ' coûte ' + prix('p') + '. Léo paie avec ce billet :'
        + bloc('monnaie', ligne) + '\n\nCombien le marchand lui rend-il ?\n\n$?' + EURO + '$',
        [en_euros(str(100 * B) + '-p')],
        [var('o', '1..6'), var('p', plage)],
        ajouts(B) + ['Le marchand rend ' + prix(str(100 * B) + '-p', True) + '.'],
        ['mod(p,100) != 0', 'floor(p/100) + 1 < ' + str(B)])


def rendu_pose(n):
    B, ligne, plage = PAIEMENTS[n]
    return variation(
        selon('o', OBJETS) + ' coûte ' + prix('p') + '. Léo paie avec ce billet :'
        + bloc('monnaie', ligne) + '\n\nTu es le marchand. Rends la monnaie à Léo.'
        + bloc('monnaie', 'construire: {{r}}c', RESERVE), [],
        [var('o', '1..6'), var('p', plage), var('r', 'eval:' + str(100 * B) + '-p')],
        ajouts(B) + ['Le marchand rend ' + prix('r') + '.'],
        ['mod(p,100) != 0', 'floor(p/100) + 1 < ' + str(B)])


SPECS_AJOUTS = [
    spec('3,68 € payé avec 5 € : 32 c puis 1 €', 0, {'m': 1, 'p': 368}, ['32', '1'], 'correct'),
    spec('Erreur : 32 c puis 2 €', 0, {'m': 1, 'p': 368}, ['32', '2'], 'incorrect'),
    spec('Erreur : 68 c puis 1 €', 0, {'m': 1, 'p': 368}, ['68', '1'], 'incorrect'),
    spec('12,35 € payé avec 20 € : 65 c puis 7 €', 0, {'m': 3, 'p': 1235}, ['65', '7'],
         'correct'),
    spec('3,68 € payé avec 5 € : 1,32 €', 1, {'o': 1, 'p': 368}, '1,32', 'correct'),
    spec('Erreur : 2,32 € (euro de trop)', 1, {'o': 1, 'p': 368}, '2,32', 'incorrect'),
    spec('7,45 € payé avec 10 € : 2,55 €', 2, {'o': 2, 'p': 745}, '2,55', 'correct'),
    spec('Erreur : 2,45 € (5 − 7,45 mal retenu)', 2, {'o': 2, 'p': 745}, '2,45', 'incorrect'),
    spec('14,30 € payé avec 20 € : 5,70 €', 3, {'o': 3, 'p': 1430}, '5,7', 'correct'),
    spec('Erreur : 6,70 € (euro de trop)', 3, {'o': 3, 'p': 1430}, '6,7', 'incorrect'),
    spec('36,80 € payé avec 50 € : 13,20 €', 4, {'o': 4, 'p': 3680}, '13,2', 'correct'),
    spec('Erreur : 14,20 € (euro de trop)', 4, {'o': 4, 'p': 3680}, '14,2', 'incorrect'),
]

SPECS_POSE_RENDU = [
    spec('4,35 € payé avec 5 € : 0,65 € posés', 0, {'o': 1, 'p': 435}, '0,65', 'correct'),
    spec('Erreur : 4,35 € posés (le prix)', 0, {'o': 1, 'p': 435}, '4,35', 'incorrect'),
    spec('8,60 € payé avec 10 € : 1,40 €', 1, {'o': 2, 'p': 860}, '1,4', 'correct'),
    spec('Erreur : 1,60 € (60 c recopiés)', 1, {'o': 2, 'p': 860}, '1,6', 'incorrect'),
    spec('15,25 € payé avec 20 € : 4,75 €', 2, {'o': 3, 'p': 1525}, '4,75', 'correct'),
    spec('Erreur : 5,75 € (euro de trop)', 2, {'o': 3, 'p': 1525}, '5,75', 'incorrect'),
    spec('32,90 € payé avec 50 € : 17,10 €', 3, {'o': 4, 'p': 3290}, '17,1', 'correct'),
    spec('Erreur : 18,10 € (euro de trop)', 3, {'o': 4, 'p': 3290}, '18,1', 'incorrect'),
]

# ---- Fichiers ----

MODELES = {
    '01-addition-posee': modele(
        'Pose et calcule une addition (jusqu\'à 10 000)',
        'Addition posée en colonnes, quatre chiffres, deux ou trois termes, retenues en chaîne,'
        ' somme < 10 000', 'Nombres', 'Addition', 'Calcul posé', 3,
        [ADD_4_3, ADD_4_4, ADD_3_TERMES, ADD_CHAINE], SPECS_ADDITION, delay=180),
    '02-soustraction-cassage': modele(
        'Pose et calcule une soustraction (par cassage, jusqu\'à 10 000)',
        'Soustraction posée, méthode par cassage : 4 − 3 chiffres, 4 − 4 chiffres, zéros'
        ' (5 002 − 847)', 'Nombres', 'Soustraction', 'Calcul posé', 3,
        soustraction('cassage'), SPECS_SOUSTRACTION, delay=180),
    '03-soustraction-compensation': modele(
        'Pose et calcule une soustraction (par compensation, jusqu\'à 10 000)',
        'Soustraction posée, méthode par compensation : 4 − 3 chiffres, 4 − 4 chiffres, zéros'
        ' (5 002 − 847)', 'Nombres', 'Soustraction', 'Calcul posé', 4,
        soustraction('compensation'), SPECS_SOUSTRACTION, delay=180),
    '04-multiplication-un-chiffre': modele(
        'Pose et calcule une multiplication par un nombre à un chiffre',
        'Multiplication posée : 2 ou 3 chiffres × 1 chiffre, retenues, un 0 au milieu (305 × 7)',
        'Entiers', 'Multiplier', 'Calcul posé', 2, [MULT_2_1, MULT_3_1, MULT_ZERO],
        SPECS_MULT_1, delay=180),
    '05-multiplication-deux-chiffres': modele(
        'Pose et calcule une multiplication par un nombre à deux chiffres',
        'Multiplication posée : 2 chiffres × 2 chiffres, 3 chiffres × 2 chiffres (produit'
        ' ≤ 10 000), × 20, × 30', 'Entiers', 'Multiplier', 'Calcul posé', 3,
        [MULT_2_2, MULT_3_2, MULT_DIZAINES], SPECS_MULT_2, delay=240),
    '06-addition-de-montants': modele(
        'Pose et calcule une addition de montants en euros',
        'Additionner deux ou trois montants à virgule ; unités mêlées (43,45 € + 68 centimes)',
        'Grandeurs', 'Monnaie', 'Euros et centimes', 3,
        [ADD_MONTANTS, ADD_MONTANTS_3, ADD_MELEES, ADD_MELEES_3], SPECS_ADD_MONTANTS, delay=180,
        options=SANS_ZEROS),
    '07-soustraction-de-montants': modele(
        'Pose et calcule une soustraction de montants en euros',
        'Soustraire deux montants à virgule, avec ou sans échange sur les centimes ; ôter un'
        ' montant entier (143,45 € − 68 €) ; un reste', 'Grandeurs', 'Monnaie',
        'Euros et centimes', 4,
        [SOUS_MONTANTS, SOUS_MONTANTS_EMPRUNT, SOUS_ENTIER, RESTE], SPECS_SOUS_MONTANTS,
        delay=180, options=SANS_ZEROS),
    '08-simule-tes-achats': modele(
        'Simule tes achats avec des pièces et des billets',
        'Payer un article, trois articles, sans pièce de 1 € ; dire si l\'argent montré suffit',
        'Grandeurs', 'Monnaie', 'Pièces et billets', 12,
        [UN_ARTICLE, TROIS_ARTICLES, SANS_UN_EURO, PEUT_ACHETER], SPECS_ACHATS,
        options=SANS_ZEROS),
    '09-rends-la-monnaie-par-ajouts': modele(
        'Rends la monnaie par ajouts',
        'Rendre par ajouts successifs (3,68 € payé 5 € : 32 c puis 1 €), puis donner le total'
        ' rendu sur 5 €, 10 €, 20 € et 50 €', 'Grandeurs', 'Monnaie', 'Rendre la monnaie', 5,
        [GUIDE] + [rendu_total(n) for n in range(4)], SPECS_AJOUTS, options=SANS_ZEROS),
    '10-pose-la-monnaie-rendue': modele(
        'Pose la monnaie rendue',
        'Poser le rendu sur 5 €, 10 €, 20 € et 50 € avec des pièces et des billets',
        'Grandeurs', 'Monnaie', 'Rendre la monnaie', 6, [rendu_pose(n) for n in range(4)],
        SPECS_POSE_RENDU, options=SANS_ZEROS),
}

for nom, m in MODELES.items():
    with open(f'{DOSSIER}/{nom}.json', 'w') as f:
        json.dump(m, f, ensure_ascii=False, indent='\t')
        f.write('\n')
print(len(MODELES), 'modèles écrits')
