"""Écrit les 3 modèles neufs du lot A (CM2 et 6e, nombres entiers) dans le dossier donné
(scripts/questions/6e-entiers-a/).

Chantier `idees-6e-entiers` (idées reprises de l'autre plateforme). Points visés (rangement et
tag posés plus tard par migration, jamais dans le fichier) :

  01 Compléter une égalité : un calcul de chaque côté    CM2-065
  02 Yohaku : compléter une grille de sommes              CM2-065
  03 Écrire un grand nombre en lettres et en chiffres     CM2-003

Décisions :
- 01 : six variations, une case `?` chacune. Tirages construits pour une réponse entière
  positive : division exacte par `conditions` (mod(a*b, c) == 0, c distinct de a et de b),
  différences positives (réponse tirée d'abord, puis la donnée calculée). Nombres < 1 000 :
  pas d'option d'espaces. Erreurs prévues : le résultat du côté complet recopié, l'opération
  inverse ratée (additionner au lieu de soustraire, multiplier au lieu de diviser) ; sur
  a × b = ? × c, aussi « soustrait c au lieu de diviser » ; sur a − ? = b × c, aussi
  « additionné b et c au lieu de les multiplier ». Deux seulement sur les autres : pas de
  troisième erreur réelle.
- 02 : grille 2 × 2 en `\\begin{array}{|c|c|c|}` (comme 4b080eed, avec \\hline et double trait avant les sommes), dernière
  colonne = sommes des lignes, dernière ligne = sommes des colonnes, case du coin vide.
  Cases de 1 à 10. V0 : coin haut gauche donné, trois `?` (ligne 1, colonne 1, puis ligne 2 :
  solution unique). V1 : diagonale haut gauche / bas droite donnée, deux `?` (chacun fixé par
  sa ligne ; sa colonne sert de vérification). Erreur prévue retenue : les deux cases
  échangées (somme de la colonne prise pour celle de la ligne) ; « somme recopiée » et
  « addition au lieu de soustraction » écartées (l'élève voit que la case est plus petite que
  la somme).
- 03 : orthographe de 1990 (traits d'union partout, « mille » invariable, « vingt » et
  « cent » au pluriel seulement multipliés et en fin de nombre, « et-un »). Écritures
  générées par `en_lettres()`, vérifiée en tête de script (cas connus, et les 22 nombres du
  modèle CE2 3dd3b738). « million » est un nom : il prend un s, et un « vingt » ou un « cent »
  qui le précède garderait son s ; le pool évite ce cas discuté (assert). Le nombre tiré est
  un rang `k` ; la valeur et les erreurs prévues sont calculées par indicatrices
  `1-min(abs(k-j),1)` (pas de `{{if:}}` imbriqué dans une variable ni dans une réponse
  attendue). V0 : texte à trous (```trous, un trou par mot, intrus tirés des pièges :
  vingt/vingts, cent/cents, mille/milles, million/millions), nombres de 3 à 8 mots. V1 : en
  chiffres (case ordinaire), erreurs prévues : tranche écrite sans ses zéros (203 081 →
  20 381), zéro des dizaines oublié dans une tranche (203 081 → 23 081), « quatre-vingt »
  lu 4 puis 20 (2 080 → 2 420) ; une erreur qui tombe sur la bonne réponse d'un nombre est
  ignorée. V2 : choix de la bonne écriture parmi 4 (3 fausses générées : s de vingt ou de
  cent, « milles », « et » en trop ou en moins). Jamais de case Texte.

Pièges respectés (couvrir-un-niveau.md § 5 et § 9) : ni `e` ni `i` en variable ; coup de
pouce `hint` sur chaque variation, sans la réponse ; chaque erreur prévue a sa spec
`incorrect` ; réponses des specs dès 4 chiffres avec espaces ; le corrigé nomme la bonne
réponse, jamais son rang.
"""
import json
import os
import sys

DOSSIER = sys.argv[1]
GRADES = ['CM2', '6']


def spec(desc, vi, variables_, status, answers, violations=None, message=None):
    expected = {'status': status}
    if violations:
        expected['constraintViolations'] = violations
    if message:
        expected['expectedErrorMessage'] = message
    return {'description': desc, 'variationIndex': vi, 'variables': variables_,
            'expected': expected, 'answers': answers}


def modele(title, description, level, delay, variations, specs, shared=None, options=None):
    m = {'title': title, 'description': description, 'grades': GRADES, 'level': level,
         'delay': delay, 'status': 'draft'}
    if options:
        m['options'] = options
    if shared:
        m['shared'] = shared
    m['variations'] = variations
    m['testSpecs'] = specs
    return m


def var(nom, expression):
    return {'name': nom, 'expression': expression}


def variation(statement, variables, blanks, steps, conditions=None, **extra):
    v = {'statement': statement, 'variables': variables, 'conditions': conditions or []}
    if blanks is not None:
        v['blanks'] = blanks
    v['correction'] = {'steps': steps}
    v.update(extra)
    return v


def blank(expected, **extra):
    b = {'expectedAnswer': expected}
    b.update(extra)
    return b


def err(answer, message, label):
    return {'answer': answer, 'message': message, 'label': label}


def bloc(nom, *lignes):
    return '```' + nom + '\n' + '\n'.join(lignes) + '\n```'


def coul(x):
    """Réponse mise en couleur (toujours à l'intérieur d'un `$…$`)."""
    return '\\textcolor{{{color:primary.0}}}{' + x + '}'


def chiffres(n):
    """Écriture LaTeX d'un entier, espace fine entre les tranches dès 4 chiffres."""
    s = str(n)
    if len(s) < 4:
        return s
    tranches = []
    while s:
        tranches.insert(0, s[-3:])
        s = s[:-3]
    return '\\,'.join(tranches)


# --- 01 · CM2-065 · Compléter une égalité : un calcul de chaque côté ------------------------

HINT_EGALITE = ('Calcule d\'abord le côté de l\'égalité qui n\'a pas de case vide : les deux '
                'côtés doivent donner le même nombre.')

MSG_RECOPIE = ('Tu as écrit le résultat de ${{a}} \\times {{b}}$ : il faut chercher le nombre '
               'qui, dans l\'autre calcul, donne aussi ${{p}}$.')
MSG_RECOPIE_BC = ('Tu as écrit le résultat de ${{b}} \\times {{c}}$ : il faut chercher le nombre '
                  'qui, dans l\'autre calcul, donne aussi ${{p}}$.')

VARS_PRODUIT = [var('a', '2..9'), var('b', '2..9'), var('c', '2..9'), var('p', 'eval:a*b'),
                var('x', 'eval:p/c')]
COND_PRODUIT = ['mod(a*b,c) == 0', 'c != a', 'c != b']

M1_V0 = variation(
    'Complète l\'égalité.\n\n${{a}} \\times {{b}} = ? \\times {{c}}$',
    VARS_PRODUIT,
    [blank('{{x}}', expectedErrors=[
        err('{{p}}', MSG_RECOPIE, 'Résultat du côté complet recopié'),
        err('{{eval:p*c}}', 'Tu as multiplié ${{p}}$ par ${{c}}$ : pour trouver le nombre '
            'qui, multiplié par ${{c}}$, donne ${{p}}$, on divise ${{p}}$ par ${{c}}$.',
            'Multiplié au lieu de diviser'),
        err('{{eval:p-c}}', 'Tu as soustrait ${{c}}$ : le nombre manquant est multiplié par '
            '${{c}}$, il faut donc diviser ${{p}}$ par ${{c}}$.',
            'Soustrait au lieu de diviser'),
    ])],
    ['**Le côté complet.** ${{a}} \\times {{b}} = {{p}}$.',
     '**Le nombre manquant.** $\\square \\times {{c}} = {{p}}$, donc le nombre manquant est '
     '${{p}} \\div {{c}} = ' + coul('{{x}}') + '$.',
     '**Vérification.** ${{x}} \\times {{c}} = {{p}}$.'],
    COND_PRODUIT, hint=HINT_EGALITE)

M1_V1 = variation(
    'Complète l\'égalité.\n\n${{a}} - ? = {{b}} \\times {{c}}$',
    [var('b', '2..9'), var('c', '2..9'), var('p', 'eval:b*c'), var('x', '5..120'),
     var('a', 'eval:p+x')],
    [blank('{{x}}', expectedErrors=[
        err('{{p}}', MSG_RECOPIE_BC, 'Résultat du côté complet recopié'),
        err('{{eval:a+p}}', 'Tu as additionné ${{a}}$ et ${{p}}$ : on cherche ce qu\'il faut '
            'enlever à ${{a}}$ pour obtenir ${{p}}$, c\'est-à-dire ${{a}} - {{p}}$.',
            'Additionné au lieu de soustraire'),
        err('{{eval:a-b-c}}', 'Tu as additionné ${{b}}$ et ${{c}}$ au lieu de les multiplier : '
            '${{b}} \\times {{c}} = {{p}}$.', 'Produit lu comme une somme'),
    ])],
    ['**Le côté complet.** ${{b}} \\times {{c}} = {{p}}$.',
     '**Le nombre manquant.** ${{a}} - \\square = {{p}}$ : on enlève à ${{a}}$ ce qu\'il faut '
     'pour arriver à ${{p}}$, donc le nombre manquant est ${{a}} - {{p}} = ' + coul('{{x}}')
     + '$.',
     '**Vérification.** ${{a}} - {{x}} = {{p}}$.'],
    ['a <= 200'], hint=HINT_EGALITE)

M1_V2 = variation(
    'Complète l\'égalité.\n\n${{a}} + ? = {{b}} \\times {{c}}$',
    [var('b', '2..9'), var('c', '2..9'), var('p', 'eval:b*c'), var('x', '2..60'),
     var('a', 'eval:p-x')],
    [blank('{{x}}', expectedErrors=[
        err('{{p}}', MSG_RECOPIE_BC, 'Résultat du côté complet recopié'),
        err('{{eval:p+a}}', 'Tu as additionné ${{p}}$ et ${{a}}$ : on cherche ce qu\'il faut '
            'ajouter à ${{a}}$ pour obtenir ${{p}}$, c\'est-à-dire ${{p}} - {{a}}$.',
            'Additionné au lieu de soustraire'),
    ])],
    ['**Le côté complet.** ${{b}} \\times {{c}} = {{p}}$.',
     '**Le nombre manquant.** ${{a}} + \\square = {{p}}$, donc le nombre manquant est '
     '${{p}} - {{a}} = ' + coul('{{x}}') + '$.',
     '**Vérification.** ${{a}} + {{x}} = {{p}}$.'],
    ['a >= 5'], hint=HINT_EGALITE)

M1_V3 = variation(
    'Complète l\'égalité.\n\n${{a}} \\times {{b}} = ? + {{c}}$',
    [var('a', '2..9'), var('b', '2..9'), var('p', 'eval:a*b'), var('c', '5..90'),
     var('x', 'eval:p-c')],
    [blank('{{x}}', expectedErrors=[
        err('{{p}}', MSG_RECOPIE, 'Résultat du côté complet recopié'),
        err('{{eval:p+c}}', 'Tu as additionné ${{p}}$ et ${{c}}$ : on cherche ce qu\'il faut '
            'ajouter à ${{c}}$ pour obtenir ${{p}}$, c\'est-à-dire ${{p}} - {{c}}$.',
            'Additionné au lieu de soustraire'),
    ])],
    ['**Le côté complet.** ${{a}} \\times {{b}} = {{p}}$.',
     '**Le nombre manquant.** $\\square + {{c}} = {{p}}$, donc le nombre manquant est '
     '${{p}} - {{c}} = ' + coul('{{x}}') + '$.',
     '**Vérification.** ${{x}} + {{c}} = {{p}}$.'],
    ['c <= p - 2'], hint=HINT_EGALITE)

M1_V4 = variation(
    'Complète l\'égalité.\n\n${{a}} \\times {{b}} = {{c}} - ?$',
    [var('a', '2..9'), var('b', '2..9'), var('p', 'eval:a*b'), var('c', '20..200'),
     var('x', 'eval:c-p')],
    [blank('{{x}}', expectedErrors=[
        err('{{p}}', MSG_RECOPIE, 'Résultat du côté complet recopié'),
        err('{{eval:c+p}}', 'Tu as additionné ${{c}}$ et ${{p}}$ : on cherche ce qu\'il faut '
            'enlever à ${{c}}$ pour obtenir ${{p}}$, c\'est-à-dire ${{c}} - {{p}}$.',
            'Additionné au lieu de soustraire'),
    ])],
    ['**Le côté complet.** ${{a}} \\times {{b}} = {{p}}$.',
     '**Le nombre manquant.** ${{c}} - \\square = {{p}}$ : on enlève à ${{c}}$ ce qu\'il faut '
     'pour arriver à ${{p}}$, donc le nombre manquant est ${{c}} - {{p}} = ' + coul('{{x}}')
     + '$.',
     '**Vérification.** ${{c}} - {{x}} = {{p}}$.'],
    ['c >= p + 2'], hint=HINT_EGALITE)

M1_V5 = variation(
    'Complète l\'égalité.\n\n${{a}} \\times {{b}} = {{c}} \\times ?$',
    [var('a', '2..9'), var('b', '2..12'), var('c', '2..9'), var('p', 'eval:a*b'),
     var('x', 'eval:p/c')],
    [blank('{{x}}', expectedErrors=[
        err('{{p}}', MSG_RECOPIE, 'Résultat du côté complet recopié'),
        err('{{eval:p*c}}', 'Tu as multiplié ${{p}}$ par ${{c}}$ : pour trouver le nombre '
            'qui, multiplié par ${{c}}$, donne ${{p}}$, on divise ${{p}}$ par ${{c}}$.',
            'Multiplié au lieu de diviser'),
        err('{{eval:p-c}}', 'Tu as soustrait ${{c}}$ : le nombre manquant est multiplié par '
            '${{c}}$, il faut donc diviser ${{p}}$ par ${{c}}$.',
            'Soustrait au lieu de diviser'),
    ])],
    ['**Le côté complet.** ${{a}} \\times {{b}} = {{p}}$.',
     '**Le nombre manquant.** ${{c}} \\times \\square = {{p}}$, donc le nombre manquant est '
     '${{p}} \\div {{c}} = ' + coul('{{x}}') + '$.',
     '**Vérification.** ${{c}} \\times {{x}} = {{p}}$.'],
    COND_PRODUIT, hint=HINT_EGALITE)


def msg(template, **vals):
    """Message tel que résolu pour les valeurs d'une spec."""
    out = template
    for k, v in vals.items():
        out = out.replace('{{' + k + '}}', str(v))
    return out


def specs_m1():
    s = []
    # V0 : 6 × 8 = ? × 4 → 12
    v = {'a': '6', 'b': '8', 'c': '4'}
    s.append(spec('6 × 8 = ? × 4 : 12', 0, v, 'correct', ['12']))
    vals = dict(a=6, b=8, c=4, p=48)
    s.append(spec('Erreur prévue : 48 recopié', 0, v, 'incorrect', ['48'],
                  message=msg(MSG_RECOPIE, **vals)))
    s.append(spec('Erreur prévue : 48 × 4 = 192', 0, v, 'incorrect', ['192'],
                  message=msg(M1_V0['blanks'][0]['expectedErrors'][1]['message'], **vals)))
    s.append(spec('Erreur prévue : 48 − 4 = 44', 0, v, 'incorrect', ['44'],
                  message=msg(M1_V0['blanks'][0]['expectedErrors'][2]['message'], **vals)))
    s.append(spec('9 × 4 = ? × 6 : 6', 0, {'a': '9', 'b': '4', 'c': '6'}, 'correct', ['6']))
    # V1 : 178 − ? = 6 × 8 → 130
    v = {'b': '6', 'c': '8', 'x': '130'}
    vals = dict(a=178, b=6, c=8, p=48)
    s.append(spec('178 − ? = 6 × 8 : 130', 1, v, 'correct', ['130']))
    for k, rep, d in [(0, '48', '48 recopié'), (1, '226', '178 + 48'),
                      (2, '164', '178 − (6 + 8)')]:
        s.append(spec('Erreur prévue : ' + d, 1, v, 'incorrect', [rep],
                      message=msg(M1_V1['blanks'][0]['expectedErrors'][k]['message'], **vals)))
    # V2 : 35 + ? = 7 × 9 → 28
    v = {'b': '7', 'c': '9', 'x': '28'}
    vals = dict(a=35, b=7, c=9, p=63)
    s.append(spec('35 + ? = 7 × 9 : 28', 2, v, 'correct', ['28']))
    for k, rep, d in [(0, '63', '63 recopié'), (1, '98', '63 + 35')]:
        s.append(spec('Erreur prévue : ' + d, 2, v, 'incorrect', [rep],
                      message=msg(M1_V2['blanks'][0]['expectedErrors'][k]['message'], **vals)))
    # V3 : 9 × 6 = ? + 20 → 34
    v = {'a': '9', 'b': '6', 'c': '20'}
    vals = dict(a=9, b=6, c=20, p=54)
    s.append(spec('9 × 6 = ? + 20 : 34', 3, v, 'correct', ['34']))
    for k, rep, d in [(0, '54', '54 recopié'), (1, '74', '54 + 20')]:
        s.append(spec('Erreur prévue : ' + d, 3, v, 'incorrect', [rep],
                      message=msg(M1_V3['blanks'][0]['expectedErrors'][k]['message'], **vals)))
    # V4 : 8 × 7 = 100 − ? → 44
    v = {'a': '8', 'b': '7', 'c': '100'}
    vals = dict(a=8, b=7, c=100, p=56)
    s.append(spec('8 × 7 = 100 − ? : 44', 4, v, 'correct', ['44']))
    for k, rep, d in [(0, '56', '56 recopié'), (1, '156', '100 + 56')]:
        s.append(spec('Erreur prévue : ' + d, 4, v, 'incorrect', [rep],
                      message=msg(M1_V4['blanks'][0]['expectedErrors'][k]['message'], **vals)))
    # V5 : 5 × 12 = 6 × ? → 10
    v = {'a': '5', 'b': '12', 'c': '6'}
    vals = dict(a=5, b=12, c=6, p=60)
    s.append(spec('5 × 12 = 6 × ? : 10', 5, v, 'correct', ['10']))
    for k, rep, d in [(0, '60', '60 recopié'), (1, '360', '60 × 6'), (2, '54', '60 − 6')]:
        s.append(spec('Erreur prévue : ' + d, 5, v, 'incorrect', [rep],
                      message=msg(M1_V5['blanks'][0]['expectedErrors'][k]['message'], **vals)))
    return s


M1 = modele(
    'Compléter une égalité : un calcul de chaque côté',
    'Trouver le nombre manquant d\'une égalité entre deux calculs : a × b = ? × c, '
    'a − ? = b × c, a + ? = b × c, a × b = ? + c, a × b = c − ?, a × b = c × ? '
    '(pièges : résultat du côté complet recopié, opération inverse ratée)',
    2, 60, [M1_V0, M1_V1, M1_V2, M1_V3, M1_V4, M1_V5], specs_m1())

# --- 02 · CM2-065 · Yohaku : compléter une grille de sommes --------------------------------
# Grille : a b | s1 ; c d | s2 ; t1 t2. Cases de 1 à 10.

CONSIGNE_YOHAKU = ('La somme de chaque ligne et de chaque colonne est écrite au bout. '
                   'Complète la grille.')
VARS_YOHAKU = [var('a', '1..10'), var('b', '1..10'), var('c', '1..10'), var('d', '1..10'),
               var('s1', 'eval:a+b'), var('s2', 'eval:c+d'), var('t1', 'eval:a+c'),
               var('t2', 'eval:b+d')]
HINT_YOHAKU = ('Commence par une ligne ou une colonne où il ne manque qu\'un nombre : la somme '
               'moins le nombre connu donne le nombre manquant.')


def grille(a, b, c, d):
    # Traits : double barre et double trait séparent les sommes de la grille (6-nombres/04 utilise \\hline)
    return ('$\\begin{array}{|c|c||c|} \\hline ' + a + ' & ' + b + ' & {{s1}} \\\\ \\hline ' + c
            + ' & ' + d + ' & {{s2}} \\\\ \\hline \\hline {{t1}} & {{t2}} & \\\\ \\hline \\end{array}$')


MSG_ECHANGE_B = ('Tu as utilisé la somme de la première colonne : cette case est dans la '
                 'première ligne, elle vaut ${{s1}} - {{a}}$.')
MSG_ECHANGE_C = ('Tu as utilisé la somme de la première ligne : cette case est dans la '
                 'première colonne, elle vaut ${{t1}} - {{a}}$.')

M2_V0 = variation(
    CONSIGNE_YOHAKU + '\n\n' + grille('{{a}}', '?', '?', '?'),
    VARS_YOHAKU,
    [blank('{{b}}', expectedErrors=[err('{{c}}', MSG_ECHANGE_B, 'Ligne et colonne confondues')]),
     blank('{{c}}', expectedErrors=[err('{{b}}', MSG_ECHANGE_C, 'Ligne et colonne confondues')]),
     blank('{{d}}')],
    ['**Première ligne.** ${{a}} + \\square = {{s1}}$, donc la case vaut '
     '${{s1}} - {{a}} = ' + coul('{{b}}') + '$.',
     '**Première colonne.** ${{a}} + \\square = {{t1}}$, donc la case vaut '
     '${{t1}} - {{a}} = ' + coul('{{c}}') + '$.',
     '**Deuxième ligne.** ${{c}} + \\square = {{s2}}$, donc la case vaut '
     '${{s2}} - {{c}} = ' + coul('{{d}}') + '$.',
     '**Vérification.** Deuxième colonne : ${{b}} + {{d}} = {{t2}}$.'],
    hint=HINT_YOHAKU)

MSG_DIAG_B = ('Cette case est dans la première ligne, avec ${{a}}$ : elle vaut '
              '${{s1}} - {{a}}$.')
MSG_DIAG_C = ('Cette case est dans la deuxième ligne, avec ${{d}}$ : elle vaut '
              '${{s2}} - {{d}}$.')

M2_V1 = variation(
    CONSIGNE_YOHAKU + '\n\n' + grille('{{a}}', '?', '?', '{{d}}'),
    VARS_YOHAKU,
    [blank('{{b}}', expectedErrors=[err('{{c}}', MSG_DIAG_B, 'Cases échangées')]),
     blank('{{c}}', expectedErrors=[err('{{b}}', MSG_DIAG_C, 'Cases échangées')])],
    ['**Première ligne.** ${{a}} + \\square = {{s1}}$, donc la case vaut '
     '${{s1}} - {{a}} = ' + coul('{{b}}') + '$.',
     '**Deuxième ligne.** $\\square + {{d}} = {{s2}}$, donc la case vaut '
     '${{s2}} - {{d}} = ' + coul('{{c}}') + '$.',
     '**Vérification.** Première colonne : ${{a}} + {{c}} = {{t1}}$ ; deuxième colonne : '
     '${{b}} + {{d}} = {{t2}}$.'],
    hint=HINT_YOHAKU)


def specs_m2():
    s = []
    v = {'a': '3', 'b': '7', 'c': '5', 'd': '4'}
    vals = dict(a=3, s1=10, t1=8, d=4, s2=9)
    s.append(spec('Coin 3, sommes 10, 9, 8, 11 : 7, 5, 4', 0, v, 'correct', ['7', '5', '4']))
    s.append(spec('Erreur prévue : cases 7 et 5 échangées', 0, v, 'incorrect', ['5', '7', '4'],
                  message=msg(MSG_ECHANGE_B, **vals)))
    s.append(spec('Erreur : dernière case fausse', 0, v, 'incorrect', ['7', '5', '6']))
    s.append(spec('Cases égales : 2, 2, 9', 0, {'a': '6', 'b': '2', 'c': '2', 'd': '9'},
                  'correct', ['2', '2', '9']))
    v = {'a': '8', 'b': '1', 'c': '6', 'd': '10'}
    vals = dict(a=8, s1=9, d=10, s2=16)
    s.append(spec('Diagonale 8 et 10 : 1 et 6', 1, v, 'correct', ['1', '6']))
    s.append(spec('Erreur prévue : 6 et 1 échangés (case 1)', 1, v, 'incorrect', ['6', '6'],
                  message=msg(MSG_DIAG_B, **vals)))
    s.append(spec('Erreur prévue : 6 et 1 échangés (case 2)', 1, v, 'incorrect', ['1', '1'],
                  message=msg(MSG_DIAG_C, **vals)))
    return s


M2 = modele(
    'Yohaku : compléter une grille de sommes',
    'Grille 2 × 2 de nombres de 1 à 10 dont on connaît les sommes des lignes et des '
    'colonnes : un coin donné (trois cases à trouver) ou une diagonale donnée (deux cases)',
    3, 60, [M2_V0, M2_V1], specs_m2())

# --- 03 · CM2-003 · Écrire un grand nombre en lettres et en chiffres -----------------------

UNITES = ['zéro', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf', 'dix',
          'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit',
          'dix-neuf']
DIZAINES = {2: 'vingt', 3: 'trente', 4: 'quarante', 5: 'cinquante', 6: 'soixante'}


def moins_de_100(n, fin):
    """Mots d'un nombre de 1 à 99 ; `fin` : rien après lui (le s de quatre-vingts)."""
    if n < 20:
        return UNITES[n].split('-')
    if n < 70:
        t, u = divmod(n, 10)
        mots = [DIZAINES[t]]
        if u == 1:
            mots += ['et', 'un']
        elif u:
            mots += UNITES[u].split('-')
        return mots
    if n < 80:
        return ['soixante'] + (['et', 'onze'] if n == 71 else UNITES[n - 60].split('-'))
    r = n - 80
    if r == 0:
        return ['quatre', 'vingts' if fin else 'vingt']
    return ['quatre', 'vingt'] + UNITES[r].split('-')


def moins_de_1000(n, fin):
    c, r = divmod(n, 100)
    mots = []
    if c:
        if c > 1:
            mots += UNITES[c].split('-')
        mots.append('cents' if (c > 1 and r == 0 and fin) else 'cent')
    if r:
        mots += moins_de_100(r, fin)
    return mots


def mots_en_lettres(n):
    assert 1 <= n <= 999_999_999
    millions, reste = divmod(n, 1_000_000)
    milliers, unites = divmod(reste, 1000)
    mots = []
    if millions:
        # « million » est un nom : un vingt ou un cent devant lui garderait son s (cas évité)
        mots += moins_de_1000(millions, True)
        mots.append('million' if millions == 1 else 'millions')
    if milliers:
        if milliers > 1:
            mots += moins_de_1000(milliers, False)
        mots.append('mille')
    if unites:
        mots += moins_de_1000(unites, True)
    return mots


def en_lettres(n):
    return '-'.join(mots_en_lettres(n))


CONNUS = {
    21: 'vingt-et-un', 71: 'soixante-et-onze', 80: 'quatre-vingts', 81: 'quatre-vingt-un',
    91: 'quatre-vingt-onze', 99: 'quatre-vingt-dix-neuf', 100: 'cent', 101: 'cent-un',
    200: 'deux-cents', 201: 'deux-cent-un', 280: 'deux-cent-quatre-vingts', 1000: 'mille',
    1001: 'mille-un', 2000: 'deux-mille', 21000: 'vingt-et-un-mille',
    80000: 'quatre-vingt-mille', 200000: 'deux-cent-mille', 1000000: 'un-million',
    2000000: 'deux-millions', 1200000: 'un-million-deux-cent-mille',
    999999999: 'neuf-cent-quatre-vingt-dix-neuf-millions-neuf-cent-quatre-vingt-dix-neuf-mille-'
               'neuf-cent-quatre-vingt-dix-neuf',
}
for _n, _l in CONNUS.items():
    assert en_lettres(_n) == _l, (_n, en_lettres(_n), _l)

# Les 22 nombres du modèle CE2 3dd3b738 (relu par David)
CE2 = {2307: 'deux-mille-trois-cent-sept', 4050: 'quatre-mille-cinquante',
       1999: 'mille-neuf-cent-quatre-vingt-dix-neuf', 7080: 'sept-mille-quatre-vingts',
       3071: 'trois-mille-soixante-et-onze', 6094: 'six-mille-quatre-vingt-quatorze',
       9015: 'neuf-mille-quinze', 1200: 'mille-deux-cents', 5600: 'cinq-mille-six-cents',
       2081: 'deux-mille-quatre-vingt-un', 8770: 'huit-mille-sept-cent-soixante-dix',
       4999: 'quatre-mille-neuf-cent-quatre-vingt-dix-neuf', 1001: 'mille-un',
       3460: 'trois-mille-quatre-cent-soixante', 7203: 'sept-mille-deux-cent-trois',
       9090: 'neuf-mille-quatre-vingt-dix', 6312: 'six-mille-trois-cent-douze',
       2500: 'deux-mille-cinq-cents', 8016: 'huit-mille-seize', 5170: 'cinq-mille-cent-soixante-dix',
       3008: 'trois-mille-huit', 1780: 'mille-sept-cent-quatre-vingts'}
for _n, _l in CE2.items():
    assert en_lettres(_n) == _l, (_n, en_lettres(_n), _l)


def sans_cas_discute(n):
    """Tranche des millions jamais terminée par vingt ou cent multiplié (s discuté)."""
    m = n // 1_000_000
    return m == 0 or not (m % 100 == 80 or (m % 100 == 0 and m >= 200))


def tranches(n):
    out = []
    while n:
        out.insert(0, n % 1000)
        n //= 1000
    return out


def zeros_de_tranche_oublies(n):
    """203 081 → 20 381 : chaque tranche non nulle après la première écrite sans ses zéros."""
    t = tranches(n)
    s = str(t[0]) + ''.join(('000' if g == 0 else str(g)) for g in t[1:])
    return int(s)


def zero_des_dizaines_oublie(n):
    """203 081 → 23 081 : dans la première tranche de forme c0u, le zéro des dizaines oublié."""
    t = tranches(n)
    for k, g in enumerate(t):
        if g >= 100 and (g // 10) % 10 == 0 and g % 10 != 0:
            tete = ''.join((str(x) if j == 0 else '%03d' % x) for j, x in enumerate(t[:k]))
            milieu = str(g // 100) + str(g % 10)
            if k > 0:
                milieu = milieu.rjust(2, '0')
            queue = ''.join('%03d' % x for x in t[k + 1:])
            return int(tete + milieu + queue)
    return n


def quatre_vingt_lu_4_20(n):
    """2 080 → 2 420 : dans la dernière tranche de 80 à 99, « quatre-vingt » lu 4 puis 20."""
    t = tranches(n)
    for k in range(len(t) - 1, -1, -1):
        if 80 <= t[k] <= 99:
            t2 = list(t)
            t2[k] = 420 + t[k] - 80
            return int(str(t2[0]) + ''.join('%03d' % x for x in t2[1:]))
    return n


assert zeros_de_tranche_oublies(203081) == 20381
assert zero_des_dizaines_oublie(203081) == 23081
assert zero_des_dizaines_oublie(4091) == 4091
assert quatre_vingt_lu_4_20(2080) == 2420
assert quatre_vingt_lu_4_20(12000080) == 12000420


def indic(pool, valeurs):
    """eval: somme des valeurs choisies par le rang k (indicatrices 1-min(abs(k-j),1))."""
    return 'eval:' + '+'.join('%d*(1-min(abs(k-%d),1))' % (v, j) for j, v in enumerate(valeurs))


def selon_k(textes):
    """{{if:k==0|…|{{if:k==1|…|…}}}} (énoncé et corrigé seulement)."""
    out = textes[-1]
    for j in range(len(textes) - 2, -1, -1):
        out = '{{if:k==' + str(j) + '|' + textes[j] + '|' + out + '}}'
    return out


HINT_ORTHO = ('« vingt » et « cent » ne prennent un s que s\'ils sont multipliés et terminent le '
              'nombre ; « mille » ne prend jamais de s ; tous les mots sont reliés par des '
              'traits d\'union.')
REGLE = ('**La règle.** Tous les mots sont reliés par des traits d\'union ; « mille » ne prend '
         'jamais de s ; « vingt » et « cent » prennent un s seulement quand ils sont multipliés '
         'et terminent le nombre (quatre-vingts, deux-cents, mais quatre-vingt-un, '
         'deux-cent-mille) ; « et » s\'écrit seulement dans 21, 31, 41, 51, 61 et 71.')

# V0 : texte à trous
POOL_TROUS = [2080, 7300, 15081, 80000, 203081, 300900, 521400, 1200000, 3040500, 12000080,
              500001, 4091]
PIEGES = {'vingt': 'vingts', 'vingts': 'vingt', 'cent': 'cents', 'cents': 'cent',
          'mille': 'milles', 'million': 'millions', 'millions': 'million', 'un': 'une'}


def intrus(mots):
    pris = []
    for m in mots:
        p = PIEGES.get(m)
        if p and p not in mots and p not in pris and p != 'une':
            pris.append(p)
    for extra in ['milles', 'vingts', 'cents', 'et']:
        if len(pris) >= 3:
            break
        if extra not in mots and extra not in pris:
            pris.append(extra)
    return pris[:4]


LIGNES_TROUS, LIGNES_INTRUS = [], []
for n in POOL_TROUS:
    assert sans_cas_discute(n)
    mots = mots_en_lettres(n)
    assert len(mots) <= 10
    etiquettes = set(mots) | set(intrus(mots))
    assert 3 <= len(etiquettes) <= 12, (n, etiquettes)
    LIGNES_TROUS.append('$' + chiffres(n) + '$ s\'écrit ' + '-'.join('[' + m + ']' for m in mots)
                        + '.')
    LIGNES_INTRUS.append('intrus: ' + ' ; '.join(intrus(mots)))

M3_V0 = variation(
    'Complète l\'écriture en lettres de ce nombre avec les étiquettes.\n\n'
    + bloc('trous', selon_k(LIGNES_TROUS), selon_k(LIGNES_INTRUS)),
    [var('k', '0..' + str(len(POOL_TROUS) - 1))],
    None,
    [REGLE,
     'On écrit : **' + selon_k([en_lettres(n) for n in POOL_TROUS]) + '**.'],
    hint=HINT_ORTHO)

# V1 : en chiffres
POOL_CHIFFRES = [2080, 15081, 40271, 80000, 203081, 300900, 521400, 680095, 1200000, 3040500,
                 12000080, 45300021, 7081200, 203060007, 971000400, 60070080, 500001, 4091,
                 100200300, 8017006]
for n in POOL_CHIFFRES:
    assert sans_cas_discute(n)


def lecture_par_tranches(n):
    millions, reste = divmod(n, 1_000_000)
    milliers, unites = divmod(reste, 1000)
    morceaux = []
    if millions:
        morceaux.append('$' + str(millions) + '$ million' + ('s' if millions > 1 else ''))
    if milliers or millions:
        if millions and not milliers:
            morceaux.append('$000$ (pas de mille)')
        else:
            morceaux.append('$' + ('%03d' % milliers if millions else str(milliers)) + '$ mille')
    morceaux.append('$' + ('%03d' % unites if (millions or milliers) else str(unites)) + '$')
    return ', puis '.join(morceaux)


MSG_TRANCHE = ('Chaque tranche après la première s\'écrit avec trois chiffres : il manque des '
               'zéros.')
MSG_DIZAINE = ('Tu as oublié un zéro : quand les dizaines ne sont pas dites, on écrit $0$ à '
               'leur place.')
MSG_QV = ('« quatre-vingt » ne se lit pas $4$ puis $20$ : c\'est $4 \\times 20 = 80$.')

M3_V1 = variation(
    'Écris ce nombre en chiffres.\n\n**' + selon_k([en_lettres(n) for n in POOL_CHIFFRES])
    + '**\n\nEn chiffres : $?$',
    [var('k', '0..' + str(len(POOL_CHIFFRES) - 1)), var('n', indic(POOL_CHIFFRES, POOL_CHIFFRES)),
     var('z1', indic(POOL_CHIFFRES, [zeros_de_tranche_oublies(n) for n in POOL_CHIFFRES])),
     var('z2', indic(POOL_CHIFFRES, [zero_des_dizaines_oublie(n) for n in POOL_CHIFFRES])),
     var('q', indic(POOL_CHIFFRES, [quatre_vingt_lu_4_20(n) for n in POOL_CHIFFRES]))],
    [blank('{{n}}', expectedErrors=[
        err('{{z1}}', MSG_TRANCHE, 'Tranche écrite sans ses zéros'),
        err('{{z2}}', MSG_DIZAINE, 'Zéro des dizaines oublié'),
        err('{{q}}', MSG_QV, '« quatre-vingt » lu 4 puis 20'),
    ])],
    ['On lit le nombre tranche par tranche, de gauche à droite : '
     + selon_k([lecture_par_tranches(n) for n in POOL_CHIFFRES]) + '.',
     'Chaque tranche après la première s\'écrit avec trois chiffres : un rang qui n\'est pas '
     'dit s\'écrit $0$.',
     'En chiffres : $' + coul(selon_k([chiffres(n) for n in POOL_CHIFFRES])) + '$.'],
    hint='Lis le nombre tranche par tranche : d\'abord les millions, puis les milliers, puis le '
         'reste. Chaque tranche, sauf la première, s\'écrit avec trois chiffres.')

# V2 : choisir la bonne orthographe
POOL_CHOIX = [2080, 7300, 15081, 80000, 203081, 300900, 521400, 680095, 1200000, 3040500,
              9400000, 4091, 500001, 7081200]
UNITE_MOTS = set(UNITES[2:10])


def fausses(n):
    mots = mots_en_lettres(n)
    pluriel, mille, et = [], [], []
    for j, m in enumerate(mots):
        autre = None
        if m in ('vingts', 'cents'):
            autre = m[:-1]
        elif m == 'vingt' and j > 0 and mots[j - 1] == 'quatre':
            autre = 'vingts'
        elif m == 'cent' and j > 0 and mots[j - 1] in UNITE_MOTS:
            autre = 'cents'
        if autre:
            pluriel.append(mots[:j] + [autre] + mots[j + 1:])
        if m == 'mille':
            mille.append(mots[:j] + ['milles'] + mots[j + 1:])
        if m == 'millions':
            mille.append(mots[:j] + ['million'] + mots[j + 1:])
        if m == 'et':
            et.append(mots[:j] + mots[j + 1:])
        if m == 'un' and j > 0 and mots[j - 1] in ('vingt', 'mille', 'cent'):
            et.append(mots[:j] + ['et'] + mots[j:])
    # Repli : deux pièges à la fois (s de vingt ou de cent, et « milles »)
    doubles = [['milles' if x == 'mille' else x for x in v] for v in pluriel if 'mille' in v]
    choisies = []
    listes = [pluriel, mille, et, doubles]
    while len(choisies) < 3 and any(listes):
        for liste in listes:
            if liste and len(choisies) < 3:
                f = '-'.join(liste.pop(0))
                if f != en_lettres(n) and f not in choisies:
                    choisies.append(f)
    assert len(choisies) == 3, (n, choisies)
    return choisies


FAUSSES = [fausses(n) for n in POOL_CHOIX]
for n in POOL_CHOIX:
    assert sans_cas_discute(n)

M3_V2 = variation(
    'Quelle est la bonne écriture en lettres de $'
    + selon_k([chiffres(n) for n in POOL_CHOIX]) + '$ ?\n\n'
    + bloc('choix',
           '- ' + selon_k([en_lettres(n) for n in POOL_CHOIX]),
           '- ' + selon_k([f[0] for f in FAUSSES]),
           '- ' + selon_k([f[1] for f in FAUSSES]),
           '- ' + selon_k([f[2] for f in FAUSSES])),
    [var('k', '0..' + str(len(POOL_CHOIX) - 1))],
    [blank('0')],
    [REGLE,
     'La bonne écriture est donc **' + selon_k([en_lettres(n) for n in POOL_CHOIX]) + '**.'],
    hint=HINT_ORTHO)


def specs_m3():
    s = []
    # V0 : texte à trous. Réponse d'un trou = position AFFICHÉE de son étiquette, la réserve
    # étant mélangée par la graine 0 des specs : positions relevées par un tirage de
    # `generateInstanceWithFixedVariables` (à relever de nouveau si le pool V0 change).
    # k = 0 (2 080) : réserve milles, quatre, vingts, vingt, cents, mille, deux
    s.append(spec('deux-mille-quatre-vingts', 0, {'k': '0'}, 'correct', ['6', '5', '1', '2']))
    s.append(spec('Erreur : quatre-vingt sans s en fin', 0, {'k': '0'}, 'incorrect',
                  ['6', '5', '1', '3']))
    s.append(spec('Erreur : milles', 0, {'k': '0'}, 'incorrect', ['6', '0', '1', '2']))
    # k = 3 (80 000) : réserve vingts, mille, milles, cents, vingt, quatre
    s.append(spec('quatre-vingt-mille', 0, {'k': '3'}, 'correct', ['5', '4', '1']))
    s.append(spec('Erreur : quatre-vingts-mille', 0, {'k': '3'}, 'incorrect', ['5', '0', '1']))
    s.append(spec('Erreur : quatre-vingt-milles', 0, {'k': '3'}, 'incorrect', ['5', '4', '2']))
    # k = 6 (521 400) : réserve milles, un, cents, vingts, mille, quatre, et, cent, vingt, cinq
    s.append(spec('cinq-cent-vingt-et-un-mille-quatre-cents', 0, {'k': '6'}, 'correct',
                  ['9', '7', '8', '6', '1', '4', '5', '2']))
    s.append(spec('Erreur : quatre-cent sans s en fin', 0, {'k': '6'}, 'incorrect',
                  ['9', '7', '8', '6', '1', '4', '5', '7']))
    # V1 : en chiffres (rangs dans POOL_CHIFFRES)
    j = POOL_CHIFFRES.index(203081)
    s.append(spec('deux-cent-trois-mille-quatre-vingt-un = 203 081', 1, {'k': str(j)}, 'correct',
                  ['203\\,081']))
    s.append(spec('203081 sans espace', 1, {'k': str(j)}, 'unoptimal_form', ['203081'],
                  violations=['spaces']))
    s.append(spec('Erreur prévue : 20 381 (tranche sans zéro)', 1, {'k': str(j)}, 'incorrect',
                  ['20\\,381'], message=MSG_TRANCHE))
    s.append(spec('Erreur prévue : 23 081 (zéro des dizaines)', 1, {'k': str(j)}, 'incorrect',
                  ['23\\,081'], message=MSG_DIZAINE))
    s.append(spec('Erreur prévue : 203 421 (quatre-vingt lu 4 20)', 1, {'k': str(j)},
                  'incorrect', ['203\\,421'], message=MSG_QV))
    j = POOL_CHIFFRES.index(2080)
    s.append(spec('deux-mille-quatre-vingts = 2 080', 1, {'k': str(j)}, 'correct', ['2\\,080']))
    s.append(spec('Erreur prévue : 280', 1, {'k': str(j)}, 'incorrect', ['280'],
                  message=MSG_TRANCHE))
    s.append(spec('Erreur prévue : 2 420', 1, {'k': str(j)}, 'incorrect', ['2\\,420'],
                  message=MSG_QV))
    j = POOL_CHIFFRES.index(203060007)
    s.append(spec('deux-cent-trois-millions-soixante-mille-sept = 203 060 007', 1,
                  {'k': str(j)}, 'correct', ['203\\,060\\,007']))
    s.append(spec('Erreur prévue : 203 607', 1, {'k': str(j)}, 'incorrect', ['203\\,607'],
                  message=MSG_TRANCHE))
    s.append(spec('Erreur prévue : 23 060 007', 1, {'k': str(j)}, 'incorrect',
                  ['23\\,060\\,007'], message=MSG_DIZAINE))
    j = POOL_CHIFFRES.index(80000)
    s.append(spec('quatre-vingt-mille = 80 000', 1, {'k': str(j)}, 'correct', ['80\\,000']))
    s.append(spec('Erreur : 8 000', 1, {'k': str(j)}, 'incorrect', ['8\\,000']))
    # V2 : choix (0 = la bonne)
    for n in (2080, 80000, 521400):
        j = POOL_CHOIX.index(n)
        s.append(spec(en_lettres(n), 2, {'k': str(j)}, 'correct', ['0']))
        for r in (1, 2, 3):
            s.append(spec('Erreur : ' + FAUSSES[j][r - 1], 2, {'k': str(j)}, 'incorrect',
                          [str(r)]))
    return s


M3 = modele(
    'Écrire un grand nombre en lettres et en chiffres',
    'Nombres jusqu\'à 999 999 999, orthographe de 1990 : compléter l\'écriture en lettres avec '
    'des étiquettes, écrire en chiffres un nombre écrit en lettres, choisir la bonne '
    'orthographe (pièges : zéros oubliés, quatre-vingt(s), cent(s), mille invariable)',
    4, 60, [M3_V0, M3_V1, M3_V2], specs_m3(),
    options={'constraints': {'spacesFromFourDigits': True}})

FICHIERS = [
    ('01-completer-egalite-deux-calculs.json', M1),
    ('02-yohaku-grille-de-sommes.json', M2),
    ('03-grand-nombre-lettres-chiffres.json', M3),
]

if __name__ == '__main__':
    os.makedirs(DOSSIER, exist_ok=True)
    for nom, m in FICHIERS:
        with open(os.path.join(DOSSIER, nom), 'w', encoding='utf-8') as f:
            json.dump(m, f, ensure_ascii=False, indent='\t')
            f.write('\n')
    print(len(FICHIERS), 'modèles écrits dans', DOSSIER)
