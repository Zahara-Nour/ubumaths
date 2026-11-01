"""Écrit les 7 modèles du lot 4a « Calcul littéral : écrire, raisonner » de la 5e dans
scripts/questions/5-litteral-a/.

Phase 0 validée par David le 2026-10-29 (« je te suis ») ; un point par modèle, thème « Calcul
littéral » :

| # | Point | Titre | Variations | Réponse | Catégorie, niveau |
| 1 | 5-034 | Écrire une formule | double, triple, moitié, carré, successeur, prédécesseur de n |
|   |       | case | Écrire › Formules, 1 |
| 2 | 5-034 | Que représente cette formule ? | 2n, 3n, n/2, n², n + 1, n − 1 | choix parmi 4 |
|   |       | Écrire › Formules, 2 |
| 3 | 5-124 | Écrire une formule de périmètre ou d'aire | carré (périmètre, aire), rectangle
|   |       | (aire, périmètre), triangle équilatéral (périmètre) | case | Écrire › Formules, 3 |
| 4 | 5-037 | Somme ou produit ? | 3x + 5, 3(x + 5), 3 + 5x, 3(x + 5) + 2, (x + 5) × 3 |
|   |       | choix | Reconnaître › Somme ou produit, 1 |
| 5 | 5-036 | L'égalité est-elle vraie pour cette valeur ? | ax + b = cx + d et a(x + b) = cx + d,
|   |       | vraie ou fausse | choix Oui / Non | Calculs › Tester une égalité, 1 |
| 6 | 5-036 | Pour quelle valeur l'égalité est-elle vraie ? | idem | choix parmi 4 |
|   |       | Calculs › Tester une égalité, 2 |
| 7 | 5-041 | Trouver un contre-exemple | n² > n ; 2n > n + 1 ; 3n + 1 impair ; n + 5 > 2n ;
|   |       | 2n > n | choix parmi 4 | Raisonner › Contre-exemple, 1 |

Bornes : `cycle4.json`, 5e (5-034 : double, triple, moitié, carré, successeur, prédécesseur ;
5-124 : aire, périmètre ; 5-036 : une seule variable ; 5-037 : selon la dernière opération).
Valeurs positives partout (produit de relatifs : 4e). Le nœud et le tag sont posés par la
migration de rangement, après le `--publier` de David.

Décisions et pièges :
- le juge compare l'écriture (contrainte `form` stricte) : « n + n + n » est refusé pour 3n ;
- forme libre (`requiredForm` motif `u`, qui accepte toute écriture) pour la moitié (n/2, n ÷ 2,
  0,5n) et le périmètre du rectangle (2(L + l), 2L + 2l, L + l + L + l), décision de David ;
- choix : indice d'origine, `melanger: non` pour Oui / Non et somme / produit.

    python3 docs/wip/questions/lot-5-litteral-a.py scripts/questions/5-litteral-a
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


def modele(nom, title, description, domain, subdomain, level, variations, specs, delay=30,
           options=None):
    m = {'title': title, 'description': description, 'grades': ['5'], 'theme': 'Calcul littéral',
         'domain': domain, 'subdomain': subdomain, 'level': level, 'delay': delay,
         'status': 'draft', 'variations': variations, 'testSpecs': specs}
    if options:
        m['options'] = options
    return nom, m


def var(nom, expression):
    return {'name': nom, 'expression': expression}


def variation(statement, variables, answers, steps, conditions=None):
    v = {'statement': statement, 'variables': variables}
    if conditions:
        v['conditions'] = conditions
    v['blanks'] = [a if isinstance(a, dict) else {'expectedAnswer': a} for a in answers]
    v['correction'] = {'steps': steps}
    return v


def col(x, k=0):
    return '\\textcolor{{{color:primary.' + str(k) + '}}}{' + x + '}'


def m(x):
    return '$' + x + '$'


def choix(lignes, melanger=True):
    tete = '' if melanger else 'melanger: non\n'
    return '\n\n```choix\n' + tete + ''.join('- ' + l + '\n' for l in lignes) + '```'


def ev(x):
    return '{{eval:' + x + '}}'


# Toute écriture de même valeur (motif qui accepte tout)
LIBRE = {'pattern': 'u'}

ECRIRE = 'Écrire'
MODELES = []

# --- 1. 5-034 : écrire une formule ---------------------------------------------------------

CONVENTION = ('**Écriture.** On peut supprimer le signe $\\times$ devant une lettre : $3 \\times n$'
              ' s\'écrit $3n$. Le nombre s\'écrit devant la lettre.')
FORMULE_QUESTION = 'Écris QUOI du nombre $n$.\n\n$?$'


def formule(quoi, attendu, calcul, ecriture, explication=CONVENTION, forme=None):
    case = {'expectedAnswer': attendu}
    if forme:
        case['requiredForm'] = forme
        case['acceptDecimal'] = True
    return variation(FORMULE_QUESTION.replace('QUOI', quoi), [], [case],
                     [explication,
                      quoi[0].upper() + quoi[1:] + ' de $n$, c\'est $' + calcul + '$, qui s\'écrit '
                      + m(col(ecriture)) + '.'])


DOUBLE = formule('le double', '2n', '2 \\times n', '2n')
TRIPLE = formule('le triple', '3n', '3 \\times n', '3n')
MOITIE = formule('la moitié', '\\dfrac{n}{2}', 'n \\div 2', '\\dfrac{n}{2}',
                 '**Moitié.** Prendre la moitié, c\'est diviser par $2$ : on peut écrire'
                 ' $\\dfrac{n}{2}$, $n \\div 2$ ou $0{,}5n$.', LIBRE)
CARRE = formule('le carré', 'n^2', 'n \\times n', 'n^2',
                '**Carré.** Le carré d\'un nombre est ce nombre multiplié par lui-même : $n \\times n$'
                ' s\'écrit $n^2$. Attention : $n^2$ n\'est pas $2n$.')
SUCCESSEUR = formule('le successeur', 'n+1', 'n + 1', 'n + 1',
                     '**Successeur.** Le successeur d\'un nombre entier est le nombre qui le suit :'
                     ' on ajoute $1$.')
PREDECESSEUR = formule('le prédécesseur', 'n-1', 'n - 1', 'n - 1',
                       '**Prédécesseur.** Le prédécesseur d\'un nombre entier est le nombre qui le'
                       ' précède : on retire $1$.')

MODELES.append(modele(
    '01-ecrire-une-formule', 'Écrire une formule',
    'Écrire en fonction de n le double (2n), le triple (3n), la moitié, le carré (n²), le'
    ' successeur (n + 1) et le prédécesseur (n − 1) d\'un nombre n',
    ECRIRE, 'Formules', 1,
    [DOUBLE, TRIPLE, MOITIE, CARRE, SUCCESSEUR, PREDECESSEUR],
    [spec('Double : 2n', 0, {}, '2n', 'correct'),
     spec('Erreur : n² pour le double', 0, {}, 'n^2', 'incorrect'),
     spec('Erreur : n + 2 pour le double', 0, {}, 'n+2', 'incorrect'),
     spec('n + n : pas la formule attendue', 0, {}, 'n+n', 'bad_form', ['form']),
     spec('Triple : 3n', 1, {}, '3n', 'correct'),
     spec('Erreur : n³ pour le triple', 1, {}, 'n^3', 'incorrect'),
     spec('Moitié : n/2', 2, {}, '\\frac{n}{2}', 'correct'),
     spec('Moitié : n ÷ 2', 2, {}, 'n\\div2', 'correct'),
     # Virgule nue (« 0,5n ») refusée par la forme exigée : défaut du juge signalé à David
     spec('Moitié : 0,5n', 2, {}, '0{,}5n', 'correct'),
     spec('Erreur : 2n pour la moitié', 2, {}, '2n', 'incorrect'),
     spec('Carré : n²', 3, {}, 'n^2', 'correct'),
     spec('Erreur : 2n pour le carré', 3, {}, '2n', 'incorrect'),
     spec('Successeur : n + 1', 4, {}, 'n+1', 'correct'),
     spec('Successeur : 1 + n', 4, {}, '1+n', 'correct'),
     spec('Erreur : n − 1 pour le successeur', 4, {}, 'n-1', 'incorrect'),
     spec('Prédécesseur : n − 1', 5, {}, 'n-1', 'correct'),
     spec('Erreur : n + 1 pour le prédécesseur', 5, {}, 'n+1', 'incorrect')],
    delay=20))

# --- 2. 5-034 : que représente cette formule ? ---------------------------------------------

REPRESENTE_QUESTION = 'Pour un nombre $n$, que représente $FORMULE$ ?'
NOMS = {'double': 'le double', 'triple': 'le triple', 'moitie': 'la moitié', 'carre': 'le carré',
        'successeur': 'le successeur', 'predecesseur': 'le prédécesseur'}
MOTS = {cle: nom + ' de $n$' for cle, nom in NOMS.items()}


def represente(formule_tex, cle, autres, explication):
    """La bonne réponse est en tête (indice 0) ; les choix sont mélangés à l'affichage."""
    return variation(
        REPRESENTE_QUESTION.replace('FORMULE', formule_tex)
        + choix([MOTS[cle]] + [MOTS[a] for a in autres]),
        [], ['0'],
        [explication, m(formule_tex) + ' représente **' + NOMS[cle] + '** de $n$.'])


R_DOUBLE = represente('2n', 'double', ['carre', 'successeur', 'moitie'],
                      '$2n = 2 \\times n$ : c\'est $n$ multiplié par $2$.')
R_TRIPLE = represente('3n', 'triple', ['double', 'carre', 'successeur'],
                      '$3n = 3 \\times n$ : c\'est $n$ multiplié par $3$.')
R_MOITIE = represente('\\dfrac{n}{2}', 'moitie', ['double', 'predecesseur', 'carre'],
                      '$\\dfrac{n}{2} = n \\div 2$ : c\'est $n$ divisé par $2$.')
R_CARRE = represente('n^2', 'carre', ['double', 'triple', 'successeur'],
                     '$n^2 = n \\times n$ : c\'est $n$ multiplié par lui-même (et pas par $2$).')
R_SUCCESSEUR = represente('n + 1', 'successeur', ['predecesseur', 'double', 'carre'],
                          '$n + 1$ : on ajoute $1$ à $n$, on obtient le nombre qui le suit.')
R_PREDECESSEUR = represente('n - 1', 'predecesseur', ['successeur', 'moitie', 'double'],
                            '$n - 1$ : on retire $1$ à $n$, on obtient le nombre qui le précède.')

MODELES.append(modele(
    '02-que-represente-cette-formule', 'Que représente cette formule ?',
    'Reconnaître ce que représente une formule en n : 2n est le double, n² le carré, n + 1 le'
    ' successeur… (choix parmi quatre, dont la confusion 2n / n²)',
    ECRIRE, 'Formules', 2,
    [R_DOUBLE, R_TRIPLE, R_MOITIE, R_CARRE, R_SUCCESSEUR, R_PREDECESSEUR],
    [spec('2n : le double', 0, {}, '0', 'correct'),
     spec('Erreur : 2n, le carré', 0, {}, '1', 'incorrect'),
     spec('3n : le triple', 1, {}, '0', 'correct'),
     spec('n/2 : la moitié', 2, {}, '0', 'correct'),
     spec('Erreur : n/2, le double', 2, {}, '1', 'incorrect'),
     spec('n² : le carré', 3, {}, '0', 'correct'),
     spec('Erreur : n², le double', 3, {}, '1', 'incorrect'),
     spec('n + 1 : le successeur', 4, {}, '0', 'correct'),
     spec('Erreur : n + 1, le prédécesseur', 4, {}, '1', 'incorrect'),
     spec('n − 1 : le prédécesseur', 5, {}, '0', 'correct'),
     spec('Erreur : n − 1, le successeur', 5, {}, '1', 'incorrect')],
    delay=20))

# --- 3. 5-124 : formules de périmètre et d'aire --------------------------------------------


def grandeur(figure, quoi, lettre, attendu, steps, forme=None):
    case = {'expectedAnswer': attendu}
    if forme:
        case['requiredForm'] = forme
    return variation(
        figure + '\n\nÉcris la formule de son ' + quoi + ' $' + lettre + '$.\n\n$' + lettre
        + ' = ?$', [], [case], steps)


CARRE_FIG = 'Un carré a des côtés de longueur $c$.'
RECT_FIG = 'Un rectangle a pour longueur $L$ et pour largeur $l$.'
TRI_FIG = 'Un triangle équilatéral a des côtés de longueur $a$.'
PERIMETRE_DEF = '**Périmètre.** Le périmètre est la longueur du tour de la figure : on additionne' \
                ' les longueurs des côtés.'
AIRE_DEF = '**Aire.** L\'aire d\'un rectangle est le produit de sa longueur par sa largeur ;' \
           ' celle d\'un carré, le côté multiplié par lui-même.'

P_CARRE = grandeur(CARRE_FIG, 'périmètre', 'P', '4c',
                   [PERIMETRE_DEF,
                    '$P = c + c + c + c = 4 \\times c$, qui s\'écrit $P = ' + col('4c') + '$.'])
A_CARRE = grandeur(CARRE_FIG, 'aire', 'A', 'c^2',
                   [AIRE_DEF, '$A = c \\times c$, qui s\'écrit $A = ' + col('c^2') + '$.'])
A_RECT = grandeur(RECT_FIG, 'aire', 'A', 'L\\times l',
                  [AIRE_DEF, '$A = ' + col('L \\times l') + '$ (on peut écrire aussi $Ll$).'])
P_RECT = grandeur(RECT_FIG, 'périmètre', 'P', '2(L+l)',
                  [PERIMETRE_DEF,
                   '$P = L + l + L + l$, que l\'on peut écrire $P = ' + col('2(L + l)')
                   + '$ ou $P = 2L + 2l$.'],
                  LIBRE)
P_TRI = grandeur(TRI_FIG, 'périmètre', 'P', '3a',
                 [PERIMETRE_DEF,
                  'Les trois côtés ont la même longueur : $P = a + a + a = 3 \\times a$, qui'
                  ' s\'écrit $P = ' + col('3a') + '$.'])

MODELES.append(modele(
    '03-formule-perimetre-aire', 'Écrire une formule de périmètre ou d\'aire',
    'Écrire la formule du périmètre ou de l\'aire d\'un carré de côté c (4c, c²), d\'un rectangle'
    ' de longueur L et de largeur l (L × l, 2(L + l)), d\'un triangle équilatéral de côté a (3a)',
    ECRIRE, 'Formules', 3,
    [P_CARRE, A_CARRE, A_RECT, P_RECT, P_TRI],
    [spec('Carré : P = 4c', 0, {}, '4c', 'correct'),
     spec('Erreur : c² pour le périmètre', 0, {}, 'c^2', 'incorrect'),
     spec('c + c + c + c : pas la formule attendue', 0, {}, 'c+c+c+c', 'bad_form', ['form']),
     spec('Carré : A = c²', 1, {}, 'c^2', 'correct'),
     spec('Erreur : 4c pour l\'aire', 1, {}, '4c', 'incorrect'),
     spec('Erreur : 2c pour l\'aire', 1, {}, '2c', 'incorrect'),
     spec('Rectangle : A = L × l', 2, {}, 'L\\times l', 'correct'),
     spec('Rectangle : A = Ll', 2, {}, 'Ll', 'correct'),
     spec('Rectangle : A = l × L', 2, {}, 'l\\times L', 'correct'),
     spec('Erreur : L + l pour l\'aire', 2, {}, 'L+l', 'incorrect'),
     spec('Rectangle : P = 2(L + l)', 3, {}, '2(L+l)', 'correct'),
     spec('Rectangle : P = 2L + 2l', 3, {}, '2L+2l', 'correct'),
     spec('Rectangle : P = L + l + L + l', 3, {}, 'L+l+L+l', 'correct'),
     spec('Erreur : L + l (demi-périmètre)', 3, {}, 'L+l', 'incorrect'),
     spec('Erreur : 2L + l', 3, {}, '2L+l', 'incorrect'),
     spec('Triangle équilatéral : P = 3a', 4, {}, '3a', 'correct'),
     spec('Triangle équilatéral : P = 3 × a', 4, {}, '3\\times a', 'correct'),
     spec('Erreur : a³', 4, {}, 'a^3', 'incorrect')],
    delay=30,
    # L × l est la formule du programme : le signe × n'est pas compté comme une maladresse ici
    options={'constraints': {'products': 'off'}}))

# --- 4. 5-037 : somme ou produit ? ---------------------------------------------------------
# Choix dans l'ordre écrit : 0 une somme, 1 un produit.

SP_CHOIX = choix(['une somme', 'un produit'], melanger=False)
SP_DEF = ('**Somme ou produit.** On regarde la **dernière opération** à effectuer : une addition,'
          ' c\'est une somme ; une multiplication, c\'est un produit.')
AB_SP = [var('a', '2..9'), var('b', '2..9')]
SOMME = col('\\text{une somme}').join('$$')
PRODUIT = col('\\text{un produit}').join('$$')


def somme_produit(expression, reponse, explication):
    return variation('L\'expression $' + expression + '$ est :' + SP_CHOIX, AB_SP, [reponse],
                     [SP_DEF, explication], ['a!=b'])


SP_SOMME = somme_produit('{{a}}x + {{b}}', '0',
                         'On calcule d\'abord ${{a}}x = {{a}} \\times x$, puis on ajoute ${{b}}$ :'
                         ' c\'est ' + SOMME + '.')
SP_PRODUIT = somme_produit('{{a}}(x + {{b}})', '1',
                           'On calcule d\'abord la parenthèse $x + {{b}}$, puis on multiplie par'
                           ' ${{a}}$ : c\'est ' + PRODUIT + '.')
SP_SOMME_TETE = somme_produit('{{a}} + {{b}}x', '0',
                              'On calcule d\'abord ${{b}}x = {{b}} \\times x$, puis on l\'ajoute à'
                              ' ${{a}}$ : c\'est ' + SOMME + '.')
SP_PIEGE = variation(
    'L\'expression ${{a}}(x + {{b}}) + {{c}}$ est :' + SP_CHOIX,
    AB_SP + [var('c', '2..9')], ['0'],
    [SP_DEF,
     'On calcule la parenthèse, puis le produit ${{a}}(x + {{b}})$, et **en dernier** on ajoute'
     ' ${{c}}$ : c\'est ' + SOMME + ', même s\'il y a un produit dedans.'],
    ['a!=b'])
SP_PRODUIT_FIN = somme_produit('(x + {{a}}) \\times {{b}}', '1',
                               'On calcule d\'abord la parenthèse $x + {{a}}$, puis on multiplie'
                               ' par ${{b}}$ : c\'est ' + PRODUIT + '.')

MODELES.append(modele(
    '04-somme-ou-produit', 'Somme ou produit ?',
    'Dire si une expression littérale est une somme ou un produit selon la dernière opération à'
    ' effectuer : 3x + 5 et 3(x + 5) + 2 sont des sommes ; 3(x + 5) est un produit',
    'Reconnaître', 'Somme ou produit', 1,
    [SP_SOMME, SP_PRODUIT, SP_SOMME_TETE, SP_PIEGE, SP_PRODUIT_FIN],
    [spec('3x + 5 : une somme', 0, {'a': 3, 'b': 5}, '0', 'correct'),
     spec('Erreur : un produit (à cause de 3x)', 0, {'a': 3, 'b': 5}, '1', 'incorrect'),
     spec('3(x + 5) : un produit', 1, {'a': 3, 'b': 5}, '1', 'correct'),
     spec('Erreur : une somme (à cause du +)', 1, {'a': 3, 'b': 5}, '0', 'incorrect'),
     spec('3 + 5x : une somme', 2, {'a': 3, 'b': 5}, '0', 'correct'),
     spec('3(x + 5) + 2 : une somme', 3, {'a': 3, 'b': 5, 'c': 2}, '0', 'correct'),
     spec('Erreur : un produit', 3, {'a': 3, 'b': 5, 'c': 2}, '1', 'incorrect'),
     spec('(x + 3) × 5 : un produit', 4, {'a': 3, 'b': 5}, '1', 'correct')],
    delay=20))

# --- 5 et 6. 5-036 : tester une égalité ----------------------------------------------------
# a > c ≥ 2 : la solution est unique et le membre de droite reste positif.

EGALITE_DEF = ('**Tester une égalité.** On remplace $x$ par la valeur dans **chaque membre**, on'
               ' calcule séparément, puis on compare les deux résultats.')
EG_VARS = [var('k', '2..9'), var('a', '3..9'), var('c', '2..8'), var('b', '1..9')]
EG_COND = ['c<a']
AFFINE_G = '{{a}}x + {{b}}'
PARENTHESE_G = '{{a}}(x + {{b}})'
DROITE = '{{c}}x + {{d}}'
# Membres de gauche évalués en x = k
VAL_AFFINE = 'a*k+b'
VAL_PARENTHESE = 'a*(k+b)'


def calculs(gauche):
    """Les deux membres calculés en x = k (texte de la correction)."""
    if gauche == AFFINE_G:
        g = '{{a}} \\times {{k}} + {{b}} = ' + col(ev(VAL_AFFINE), 1)
    else:
        g = '{{a}} \\times ({{k}} + {{b}}) = {{a}} \\times ' + ev('k+b') + ' = ' \
            + col(ev(VAL_PARENTHESE), 1)
    return ['Pour $x = {{k}}$ :', '$$' + g + '$$',
            '$${{c}} \\times {{k}} + {{d}} = ' + col(ev('c*k+d'), 1) + '$$']


def tester(gauche, valeur_g, vraie):
    # Écart h (jamais `e` : c'est la constante d'Euler)
    d = 'eval:(' + valeur_g + ')-c*k' + ('' if vraie else '+h')
    variables = EG_VARS + ([] if vraie else [var('h', '1..5')]) + [var('d', d)]
    conclusion = ('Les deux membres sont égaux : l\'égalité est ' + col('\\text{vraie}').join('$$')
                  + ' pour $x = {{k}}$. Réponse : ' + col('\\text{Oui}').join('$$') + '.'
                  if vraie else
                  'Les deux membres sont différents : l\'égalité est '
                  + col('\\text{fausse}').join('$$') + ' pour $x = {{k}}$. Réponse : '
                  + col('\\text{Non}').join('$$') + '.')
    return variation(
        'L\'égalité $' + gauche + ' = ' + DROITE + '$ est-elle vraie pour $x = {{k}}$ ?'
        + choix(['Oui', 'Non'], melanger=False),
        variables, ['0' if vraie else '1'],
        [EGALITE_DEF] + calculs(gauche) + [conclusion], EG_COND)


T_AFFINE_VRAIE = tester(AFFINE_G, VAL_AFFINE, True)
T_AFFINE_FAUSSE = tester(AFFINE_G, VAL_AFFINE, False)
T_PAR_VRAIE = tester(PARENTHESE_G, VAL_PARENTHESE, True)
T_PAR_FAUSSE = tester(PARENTHESE_G, VAL_PARENTHESE, False)

# 5x + 3 = 2x + d en x = 4 : d = 20 + 3 − 8 = 15 (vraie), 17 (fausse, h = 2)
V5 = {'k': 4, 'a': 5, 'c': 2, 'b': 3, 'd': 15}
F5 = {'k': 4, 'a': 5, 'c': 2, 'b': 3, 'h': 2, 'd': 17}
# 4(x + 1) = 2x + d en x = 3 : d = 16 − 6 = 10
VP = {'k': 3, 'a': 4, 'c': 2, 'b': 1, 'd': 10}
FP = {'k': 3, 'a': 4, 'c': 2, 'b': 1, 'h': 1, 'd': 11}
MODELES.append(modele(
    '05-tester-une-egalite', 'L\'égalité est-elle vraie pour cette valeur ?',
    'Tester une égalité à une variable pour une valeur donnée en calculant chaque membre :'
    ' 5x + 3 = 2x + 15 est vraie pour x = 4 ; 4(x + 1) = 2x + 11 est fausse pour x = 3',
    'Calculs', 'Tester une égalité', 1,
    [T_AFFINE_VRAIE, T_AFFINE_FAUSSE, T_PAR_VRAIE, T_PAR_FAUSSE],
    [spec('5x + 3 = 2x + 15 en x = 4 : oui', 0, V5, '0', 'correct'),
     spec('Erreur : non', 0, V5, '1', 'incorrect'),
     spec('5x + 3 = 2x + 17 en x = 4 : non', 1, F5, '1', 'correct'),
     spec('Erreur : oui', 1, F5, '0', 'incorrect'),
     spec('4(x + 1) = 2x + 10 en x = 3 : oui', 2, VP, '0', 'correct'),
     spec('4(x + 1) = 2x + 11 en x = 3 : non', 3, FP, '1', 'correct'),
     spec('Erreur : oui', 3, FP, '0', 'incorrect')],
    delay=45))

# 6. Pour quelle valeur ? La bonne valeur est en tête (indice 0), les choix sont mélangés.


def quelle_valeur(gauche, valeur_g):
    return variation(
        'Pour quelle valeur de $x$ l\'égalité $' + gauche + ' = ' + DROITE + '$ est-elle vraie ?'
        + choix(['$x = {{k}}$', '$x = ' + ev('k+1') + '$', '$x = ' + ev('k-1') + '$',
                 '$x = ' + ev('k+2') + '$']),
        EG_VARS + [var('d', 'eval:(' + valeur_g + ')-c*k')], ['0'],
        [EGALITE_DEF + ' On essaie les valeurs proposées : seule $x = {{k}}$ donne deux membres'
         ' égaux.'] + calculs(gauche)
        + ['L\'égalité est vraie pour ' + col('x = {{k}}').join('$$') + '.'],
        EG_COND)


Q_AFFINE = quelle_valeur(AFFINE_G, VAL_AFFINE)
Q_PAR = quelle_valeur(PARENTHESE_G, VAL_PARENTHESE)

MODELES.append(modele(
    '06-pour-quelle-valeur', 'Pour quelle valeur l\'égalité est-elle vraie ?',
    'Trouver, parmi quatre valeurs, celle pour laquelle une égalité à une variable est vraie :'
    ' 5x + 3 = 2x + 15 pour x = 4 ; 4(x + 1) = 2x + 10 pour x = 3',
    'Calculs', 'Tester une égalité', 2,
    [Q_AFFINE, Q_PAR],
    [spec('5x + 3 = 2x + 15 : x = 4', 0, V5, '0', 'correct'),
     spec('Erreur : x = 5', 0, V5, '1', 'incorrect'),
     spec('4(x + 1) = 2x + 10 : x = 3', 1, VP, '0', 'correct'),
     spec('Erreur : x = 2', 1, VP, '2', 'incorrect')],
    delay=60))

# --- 7. 5-041 : contre-exemple -------------------------------------------------------------
# Le contre-exemple est en tête (indice 0), les choix sont mélangés.

CONTRE_DEF = ('**Contre-exemple.** Pour montrer qu\'une affirmation « pour tout nombre… » est'
              ' fausse, il suffit d\'**un seul** nombre pour lequel elle ne marche pas.')
CONTRE_QUESTION = ('Léo affirme : « AFFIRMATION »\n\nQuelle valeur de $n$ est un contre-exemple qui'
                   ' prouve que Léo a tort ?')


def contre(affirmation, valeurs, explication, variables=None, conditions=None):
    return variation(
        CONTRE_QUESTION.replace('AFFIRMATION', affirmation)
        + choix(['$n = ' + v + '$' for v in valeurs]),
        variables or [], ['0'], [CONTRE_DEF, explication], conditions)


C_CARRE = contre(
    'Pour tout nombre $n$, $n^2$ est plus grand que $n$.', ['1', '3', '5', '10'],
    'Pour $n = 1$ : $1^2 = 1$, qui n\'est pas plus grand que $1$. ' + col('n = 1').join('$$')
    + ' est un contre-exemple. (Pour $3$, $5$ et $10$, le carré est bien plus grand.)')
C_CARRE_DECIMAL = contre(
    'Pour tout nombre $n$, $n^2$ est plus grand que $n$.', ['0{,}5', '2', '4', '7'],
    'Pour $n = 0{,}5$ : $0{,}5^2 = 0{,}25$, qui est plus petit que $0{,}5$. '
    + col('n = 0{,}5').join('$$') + ' est un contre-exemple.')
C_DOUBLE = contre(
    'Pour tout nombre $n$, $2n$ est plus grand que $n + 1$.', ['1', '3', '4', '6'],
    'Pour $n = 1$ : $2n = 2$ et $n + 1 = 2$ ; $2$ n\'est pas plus grand que $2$. '
    + col('n = 1').join('$$') + ' est un contre-exemple.')
C_IMPAIR = contre(
    'Pour tout nombre entier $n$, $3n + 1$ est impair.',
    ['{{p}}', ev('2*q'), ev('2*q+2'), ev('2*q+4')],
    'Pour $n = {{p}}$ : $3 \\times {{p}} + 1 = ' + ev('3*p+1') + '$, qui est pair. '
    + col('n = {{p}}').join('$$') + ' est un contre-exemple.',
    [var('p', '1|3|5|7|9'), var('q', '1..3')])
C_PLUS_CINQ = contre(
    'Pour tout nombre $n$, $n + 5$ est plus grand que $2n$.', ['{{k}}', '1', '2', '3'],
    'Pour $n = {{k}}$ : $n + 5 = ' + ev('k+5') + '$ et $2n = ' + ev('2*k') + '$ ; '
    + ev('k+5') + ' n\'est pas plus grand que ' + ev('2*k') + '. ' + col('n = {{k}}').join('$$')
    + ' est un contre-exemple.',
    [var('k', '5..9')])
C_ZERO = contre(
    'Pour tout nombre $n$, le double de $n$ est plus grand que $n$.', ['0', '3', '7', '12'],
    'Pour $n = 0$ : le double de $0$ est $0$, qui n\'est pas plus grand que $0$. '
    + col('n = 0').join('$$') + ' est un contre-exemple.')

MODELES.append(modele(
    '07-trouver-un-contre-exemple', 'Trouver un contre-exemple',
    'Choisir, parmi quatre valeurs, un contre-exemple qui prouve qu\'une affirmation est fausse :'
    ' n = 1 pour « n² est plus grand que n », n = 0 pour « le double est plus grand »',
    'Raisonner', 'Contre-exemple', 1,
    [C_CARRE, C_CARRE_DECIMAL, C_DOUBLE, C_IMPAIR, C_PLUS_CINQ, C_ZERO],
    [spec('n² > n : n = 1', 0, {}, '0', 'correct'),
     spec('Erreur : n = 3', 0, {}, '1', 'incorrect'),
     spec('n² > n : n = 0,5', 1, {}, '0', 'correct'),
     spec('2n > n + 1 : n = 1', 2, {}, '0', 'correct'),
     spec('3n + 1 impair : n = 3', 3, {'p': 3, 'q': 1}, '0', 'correct'),
     spec('Erreur : n = 2', 3, {'p': 3, 'q': 1}, '1', 'incorrect'),
     spec('n + 5 > 2n : n = 6', 4, {'k': 6}, '0', 'correct'),
     spec('Erreur : n = 1', 4, {'k': 6}, '1', 'incorrect'),
     spec('Double : n = 0', 5, {}, '0', 'correct')],
    delay=45))

os.makedirs(DOSSIER, exist_ok=True)
for nom, mod in MODELES:
    with open(os.path.join(DOSSIER, nom + '.json'), 'w', encoding='utf-8') as f:
        json.dump(mod, f, ensure_ascii=False, indent='\t')
        f.write('\n')
# Mis en forme comme le pre-commit, pour que le script redonne les fichiers commités
subprocess.run(['pnpm', 'exec', 'prettier', '--write', DOSSIER], check=True,
               stdout=subprocess.DEVNULL)
print(f'{len(MODELES)} modèles écrits dans {DOSSIER}')
