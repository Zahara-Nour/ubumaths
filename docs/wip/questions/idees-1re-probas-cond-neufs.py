"""Écrit les modèles neufs du chantier idees-1re-probas-cond dans
scripts/questions/idees-1re-probas-cond-neufs/.

Phase 0 : fiches docs/archive/wip/idees-1re-probas-cond/idees-1re-probas-cond-fiches.md, validées par David le 2026-11-24 :
F2, F5, F6 et F7 sont des modèles neufs (F1 et F3 : variations de modèles publiés, script
idees-1re-probas-cond-publies.py ; F4 : rien).

Rangement (migration, après la création en brouillon), nœuds et points vérifiés en base le
2026-11-24 :
- F2 : notion « Probabilités conditionnelles » (là où est 31096bae), point 2-390, grades ["2"] ;
- F5 et F7 : sous-notion « probabilités totales », point 1SPE-340, grades ["1_SPE"] ;
- F6 : sous-notion « indépendance », point 1SPE-424, grades ["1_SPE"].

Bornes : 2de (F2) sans probabilités totales ; 1re spé, formule des probabilités totales sur une
partition lisible sur un arbre, indépendance de deux évènements.

Règles suivies (couvrir-un-niveau.md § 5) : erreurs prévues par case (de vraies erreurs d'élèves,
jusqu'à quatre), chacune avec sa spec `incorrect` qui nomme son message ; un coup de pouce par
variation, qui ne donne jamais la réponse ; une case unique quand c'est possible ; pas de Oui / Non
au hasard (F6 : quatre propositions justifiées, chiffrées, l'issue « indépendants » sortant une fois
sur deux par construction des effectifs).

Pièges : pas de `cleanCoefficients` (il réécrit `P_{A}(B)` en « P_A B ») ; espaces des grands
nombres coupés comme sur 5ba712bc et 2c116f4d (décimaux à quatre chiffres après la virgule) ;
dernière case de F7 arrondie au centième avec `precision`, tirages dont l'arrondi est sans
ambiguïté et dont le dernier chiffre n'est pas 0 (comme 2c116f4d).

Usage : python3 docs/wip/questions/idees-1re-probas-cond-neufs.py scripts/questions/idees-1re-probas-cond-neufs
"""
import json
import os
import sys
from fractions import Fraction as Fr

DOSSIER = sys.argv[1]

PRIMAIRE = '\\textcolor{{{color:primary.0}}}'

# Messages tels que la résolution les réécrit ($P(A)$ → $P \\left( A \\right)$) : la spec compare
# le message résolu. Relevés par question:specs le 2026-11-24.
REECRIT = {'$P_A(B)$ est la probabilité de $B$ quand $A$ est réalisé, pas la probabilité de $A\\cap B$.': '$P_A \\left( B \\right)$ est la probabilité de $B$ quand $A$ est réalisé, pas la probabilité de $A\\cap B$.', 'Tu as divisé : de $P_A(B)=\\dfrac{P(A\\cap B)}{P(A)}$, on tire $P(A\\cap B)$ en multipliant par $P(A)$.': 'Tu as divisé : de $P_A(B)=\\dfrac{P(A\\cap B)}{P(A)}$, on tire $P(A\\cap B)$ en multipliant par $P \\left( A \\right)$.', 'Tu as multiplié par $P(A)$ : pour retrouver $P_A(B)$, on divise $P(A\\cap B)$ par $P(A)$.': 'Tu as multiplié par $P \\left( A \\right)$ : pour retrouver $P_A \\left( B \\right)$, on divise $P(A\\cap B)$ par $P \\left( A \\right)$.', "$P(A\\cap B)$ n'est pas $P_A(B)$ : il reste à diviser par $P(A)$.": "$P(A\\cap B)$ n'est pas $P_A \\left( B \\right)$ : il reste à diviser par $P \\left( A \\right)$.", '$P_S(D)$ est la proportion de messages supprimés **parmi les spams**, pas parmi tous les messages.': '$P_S \\left( D \\right)$ est la proportion de messages supprimés **parmi les spams**, pas parmi tous les messages.', "Tu as divisé $P(B)$ par $P_A(B)$ : c'est oublier le chemin qui passe par $\\overline{A}$.": "Tu as divisé $P \\left( B \\right)$ par $P_A \\left( B \\right)$ : c'est oublier le chemin qui passe par $\\overline{A}$.", "Tu as multiplié $P(B)$ par $P_A(B)$ : écris plutôt l'équation donnée par la formule des probabilités totales.": "Tu as multiplié $P \\left( B \\right)$ par $P_A \\left( B \\right)$ : écris plutôt l'équation donnée par la formule des probabilités totales.", "Tu as divisé $P(B)$ par $P_D(B)$ : c'est oublier les externes qui viennent en bus.": "Tu as divisé $P \\left( B \\right)$ par $P_D \\left( B \\right)$ : c'est oublier les externes qui viennent en bus.", "Tu as multiplié $P(B)$ par $P_D(B)$ : écris plutôt l'équation donnée par la formule des probabilités totales.": "Tu as multiplié $P \\left( B \\right)$ par $P_D \\left( B \\right)$ : écris plutôt l'équation donnée par la formule des probabilités totales.", '$n(A)+n(B)-N$ est le plus petit effectif possible de $A\\cap B$, pas celui qui rend $A$ et $B$ indépendants.': '$n \\left( A \\right) + n \\left( B \\right) - N$ est le plus petit effectif possible de $A\\cap B$, pas celui qui rend $A$ et $B$ indépendants.', 'Tu as donné $P(A)$ : on demande un effectif.': 'Tu as donné $P \\left( A \\right)$ : on demande un effectif.', "Tu as donné $P(A\\cap V)$ : $P_A(V)$ s'obtient en divisant par $P(A)$.": "Tu as donné $P(A\\cap V)$ : $P_A \\left( V \\right)$ s'obtient en divisant par $P \\left( A \\right)$.", "Tu as multiplié : $P_A(V)$ s'obtient en divisant $P(A\\cap V)$ par $P(A)$.": "Tu as multiplié : $P_A \\left( V \\right)$ s'obtient en divisant $P(A\\cap V)$ par $P \\left( A \\right)$.", 'Le chemin $\\overline{A}$ puis $V$ se calcule avec $P(\\overline{A})$, pas avec $P(A)$.': 'Le chemin $\\overline{A}$ puis $V$ se calcule avec $P(\\overline{A})$, pas avec $P \\left( A \\right)$.', 'Tu as divisé par $P(V)$ : la condition est $\\overline{V}$, divise par $P(\\overline{V})$.': 'Tu as divisé par $P \\left( V \\right)$ : la condition est $\\overline{V}$, divise par $P(\\overline{V})$.', "Tu as donné $P(C\\cap E)$ : $P_C(E)$ s'obtient en divisant par $P(C)$.": "Tu as donné $P(C\\cap E)$ : $P_C \\left( E \\right)$ s'obtient en divisant par $P \\left( C \\right)$.", "Tu as multiplié : $P_C(E)$ s'obtient en divisant $P(C\\cap E)$ par $P(C)$.": "Tu as multiplié : $P_C \\left( E \\right)$ s'obtient en divisant $P(C\\cap E)$ par $P \\left( C \\right)$.", 'Le chemin $\\overline{C}$ puis $E$ se calcule avec $P(\\overline{C})$, pas avec $P(C)$.': 'Le chemin $\\overline{C}$ puis $E$ se calcule avec $P(\\overline{C})$, pas avec $P \\left( C \\right)$.', 'Tu as donné $P_S(D)$ : il faut encore multiplier par $P(S)$.': 'Tu as donné $P_S \\left( D \\right)$ : il faut encore multiplier par $P \\left( S \\right)$.', 'Tu as donné $P(\\overline{S}\\cap D)$ : il reste à diviser par $P(D)$.': 'Tu as donné $P(\\overline{S}\\cap D)$ : il reste à diviser par $P \\left( D \\right)$.', "Tu as calculé $P_D(S)$ : on demande la probabilité que le client n'ait pas pris de sandwich.": "Tu as calculé $P_D \\left( S \\right)$ : on demande la probabilité que le client n'ait pas pris de sandwich."}


def spec(desc, vi, variables_, status, answers, message=None, violations=None):
    expected = {'status': status}
    if message is not None:
        expected['expectedErrorMessage'] = REECRIT.get(message, message)
    if violations:
        expected['constraintViolations'] = violations
    elif status in ('unoptimal_form', 'bad_form'):
        expected['constraintViolations'] = ['form']
    return {'description': desc, 'variationIndex': vi,
            'variables': {k: str(v) for k, v in variables_.items()},
            'expected': expected, 'answers': answers}


def modele(title, description, grades, level, variations, specs, rangement, shared=None,
           delay=120, options=None):
    m = {'rangement': rangement, 'title': title, 'description': description, 'grades': grades,
         'level': level, 'delay': delay, 'status': 'draft',
         'shared': shared if shared is not None else {'blankDefaults': {'acceptDecimal': True}},
         'variations': variations, 'testSpecs': specs}
    m['options'] = options if options is not None else {'constraints': {'spaces': 'off'}}
    return m


def var(nom, expression):
    return {'name': nom, 'expression': expression}


def erreur(answer, message, label):
    return {'answer': answer, 'message': message, 'label': label}


def case(attendue, erreurs=None, extra=None):
    c = {'expectedAnswer': attendue}
    if extra:
        c.update(extra)
    if erreurs:
        c['expectedErrors'] = erreurs
    return c


def variation(statement, variables, blanks, steps, hint, conditions=None):
    return {'statement': statement, 'variables': variables, 'conditions': conditions or [],
            'blanks': blanks, 'correction': {'steps': steps}, 'hint': hint}


def ecrire(nom, m):
    os.makedirs(DOSSIER, exist_ok=True)
    chemin = os.path.join(DOSSIER, nom + '.json')
    # Garder l'id écrit en tête par create-questions --publier, s'il existe
    if os.path.exists(chemin):
        with open(chemin, encoding='utf-8') as f:
            ancien = json.load(f)
        if 'id' in ancien:
            m = {'id': ancien['id'], **m}
    with open(chemin, 'w', encoding='utf-8') as f:
        json.dump(m, f, ensure_ascii=False, indent=2)
        f.write('\n')


def fr(x):
    """Rationnel en LaTeX, comme l'élève le tape."""
    x = Fr(x)
    if x.denominator == 1:
        return str(x.numerator)
    signe = '-' if x < 0 else ''
    return signe + '\\frac{' + str(abs(x.numerator)) + '}{' + str(x.denominator) + '}'


def dec(x):
    """Décimal exact en LaTeX d'élève (virgule)."""
    x = Fr(x)
    for n in range(0, 9):
        if (x * 10 ** n).denominator == 1:
            s = str(abs((x * 10 ** n).numerator)).rjust(n + 1, '0')
            ent, frac = s[:len(s) - n], s[len(s) - n:]
            return ('-' if x < 0 else '') + ent + ('{,}' + frac if n else '')
    raise ValueError(x)


REPONSE = 'Réponds par une fraction irréductible ou par un nombre décimal exact.'
TOTALES = {'noeud': 'Probabilités > Probabilités conditionnelles > probabilités totales',
           'point': '1SPE-340'}

# =============================================================================================
# F2 — P(A ∩ B) = P(A) × P_A(B), dans les deux sens (1P10-2). 2de, point 2-390.
# Une case, fraction irréductible ou décimal exact (comme 5ba712bc).
# =============================================================================================

HINT_F2 = 'La définition : $P_A(B)=\\dfrac{P(A\\cap B)}{P(A)}$.'
ERR_SOMME = 'Tu as additionné : la probabilité d\'un « et » s\'obtient ici par un produit.'
ERR_PAB = ('$P_A(B)$ est la probabilité de $B$ quand $A$ est réalisé, pas la probabilité de '
           '$A\\cap B$.')
ERR_DIVISE = ('Tu as divisé : de $P_A(B)=\\dfrac{P(A\\cap B)}{P(A)}$, on tire $P(A\\cap B)$ en '
              'multipliant par $P(A)$.')
ERR_FOIS_PA = ('Tu as multiplié par $P(A)$ : pour retrouver $P_A(B)$, on divise $P(A\\cap B)$ '
               'par $P(A)$.')
ERR_ENVERS = 'Ton quotient est à l\'envers : $P(A\\cap B)$ va au numérateur.'
ERR_INTER = '$P(A\\cap B)$ n\'est pas $P_A(B)$ : il reste à diviser par $P(A)$.'
ERR_NUM_DEN = ('Pour multiplier deux fractions, on multiplie les numérateurs entre eux **et** les '
               'dénominateurs entre eux.')
DEUX = ('On considère deux évènements $A$ et $B$ tels que $P(A)=DA$ et $DONNEE$.\n\n'
        'Calcule $CHERCHE$. ' + REPONSE + '\n\n$CHERCHE=?$')


def deux(da, donnee, cherche):
    return DEUX.replace('DA', da).replace('DONNEE', donnee).replace('CHERCHE', cherche)


f2, f2s = [], []

# v0 — P(A) = 0,a, P_A(B) = 0,b → P(A ∩ B)
f2.append(variation(
    deux('{{eval:a/10;d}}', 'P_A(B)={{eval:b/10;d}}', 'P(A\\cap B)'),
    [var('a', '1..9'), var('b', '1..9')],
    [case('{{eval:a*b/100}}', [
        erreur('{{eval:(a+b)/10}}', ERR_SOMME, 'Somme au lieu du produit'),
        erreur('{{eval:b/10}}', ERR_PAB, 'P_A(B) recopiée'),
        erreur('{{eval:b/a}}', ERR_DIVISE, 'Division au lieu du produit'),
    ])],
    ['Par définition, $P_A(B)=\\dfrac{P(A\\cap B)}{P(A)}$, donc $P(A\\cap B)=P(A)\\times P_A(B)$.',
     '$P(A\\cap B)={{eval:a/10;d}}\\times{{eval:b/10;d}}=' + PRIMAIRE
     + '{ {{eval:a*b/100;d}} }$, soit ${{eval:a*b/100}}$.'],
    HINT_F2))
v = {'a': 3, 'b': 4}
f2s += [spec('0,3 × 0,4 = 0,12', 0, v, 'correct', ['0{,}12']),
        spec('Fraction irréductible 3/25', 0, v, 'correct', ['\\frac{3}{25}']),
        spec('Point décimal 0.12', 0, v, 'correct', ['0.12']),
        spec('Fraction non réduite 12/100', 0, v, 'unoptimal_form', ['\\frac{12}{100}'],
             violations=['reducedFractions']),
        spec('Somme', 0, v, 'incorrect', ['0{,}7'], ERR_SOMME),
        spec('P_A(B) recopiée', 0, v, 'incorrect', ['0{,}4'], ERR_PAB),
        spec('Division', 0, v, 'incorrect', ['\\frac{4}{3}'], ERR_DIVISE)]

# v1 — P(A) = 0,a, P(A ∩ B) = ab/100 → P_A(B)
f2.append(variation(
    deux('{{eval:a/10;d}}', 'P(A\\cap B)={{eval:a*b/100;d}}', 'P_A(B)'),
    [var('a', '2..9'), var('b', '1..9')],
    [case('{{eval:b/10}}', [
        erreur('{{eval:a*a*b/1000}}', ERR_FOIS_PA, 'Multiplié par P(A)'),
        erreur('{{eval:10/b}}', ERR_ENVERS, 'Quotient à l\'envers'),
        erreur('{{eval:a*b/100}}', ERR_INTER, 'P(A ∩ B) recopiée'),
    ])],
    ['Par définition, $P_A(B)=\\dfrac{P(A\\cap B)}{P(A)}$.',
     '$P_A(B)=\\dfrac{ {{eval:a*b/100;d}} }{ {{eval:a/10;d}} }=' + PRIMAIRE
     + '{ {{eval:b/10;d}} }$, soit ${{eval:b/10}}$.'],
    HINT_F2))
v = {'a': 4, 'b': 6}  # P(A ∩ B) = 0,24 → 0,6
f2s += [spec('0,24 / 0,4 = 0,6', 1, v, 'correct', ['0{,}6']),
        spec('Fraction 3/5', 1, v, 'correct', ['\\frac{3}{5}']),
        spec('Multiplié par P(A)', 1, v, 'incorrect', ['0{,}096'], ERR_FOIS_PA),
        spec('Quotient à l\'envers', 1, v, 'incorrect', ['\\frac{5}{3}'], ERR_ENVERS),
        spec('P(A ∩ B) recopiée', 1, v, 'incorrect', ['0{,}24'], ERR_INTER)]

# v2 — fractions : P(A) = n/d, P_A(B) = r/s → P(A ∩ B)
FRAC_VARS = [var('d', '2..9'), var('n', '1..8'), var('s', '2..9'), var('r', '1..8')]
FRAC_COND = ['n < d', 'gcd(n, d) = 1', 'r < s', 'gcd(r, s) = 1']
f2.append(variation(
    deux('\\dfrac{ {{n}} }{ {{d}} }', 'P_A(B)=\\dfrac{ {{r}} }{ {{s}} }', 'P(A\\cap B)'),
    FRAC_VARS,
    [case('{{eval:n*r/(d*s)}}', [
        erreur('{{eval:n/d+r/s}}', ERR_SOMME, 'Somme au lieu du produit'),
        erreur('{{eval:n*r/(d+s)}}', ERR_NUM_DEN, 'Dénominateurs additionnés'),
        erreur('{{eval:r*d/(s*n)}}', ERR_DIVISE, 'Division au lieu du produit'),
    ])],
    ['Par définition, $P_A(B)=\\dfrac{P(A\\cap B)}{P(A)}$, donc $P(A\\cap B)=P(A)\\times P_A(B)$.',
     '$P(A\\cap B)=\\dfrac{ {{n}} }{ {{d}} }\\times\\dfrac{ {{r}} }{ {{s}} }'
     '=\\dfrac{ {{eval:n*r;d}} }{ {{eval:d*s;d}} }=' + PRIMAIRE + '{ {{eval:n*r/(d*s)}} }$.'],
    HINT_F2,
    FRAC_COND + ['d*s != d+s', 'gcd(n*r, d*s) > 1']))
v = {'d': 3, 'n': 2, 's': 4, 'r': 3}  # 2/3 × 3/4 = 1/2
f2s += [spec('2/3 × 3/4 = 1/2', 2, v, 'correct', ['\\frac{1}{2}']),
        spec('Décimal exact 0,5', 2, v, 'correct', ['0{,}5']),
        spec('Non réduite 6/12', 2, v, 'unoptimal_form', ['\\frac{6}{12}'],
             violations=['reducedFractions']),
        spec('Somme', 2, v, 'incorrect', ['\\frac{17}{12}'], ERR_SOMME),
        spec('Dénominateurs additionnés', 2, v, 'incorrect', ['\\frac{6}{7}'], ERR_NUM_DEN),
        spec('Division', 2, v, 'incorrect', ['\\frac{9}{8}'], ERR_DIVISE)]

# v3 — fractions : P(A) = n/d, P(A ∩ B) = nr/(ds) → P_A(B) = r/s
f2.append(variation(
    deux('\\dfrac{ {{n}} }{ {{d}} }', 'P(A\\cap B)={{eval:n*r/(d*s)}}', 'P_A(B)'),
    FRAC_VARS,
    [case('{{eval:r/s}}', [
        erreur('{{eval:n*n*r/(d*d*s)}}', ERR_FOIS_PA, 'Multiplié par P(A)'),
        erreur('{{eval:s/r}}', ERR_ENVERS, 'Quotient à l\'envers'),
        erreur('{{eval:n*r/(d*s)}}', ERR_INTER, 'P(A ∩ B) recopiée'),
    ])],
    ['Par définition, $P_A(B)=\\dfrac{P(A\\cap B)}{P(A)}$.',
     'Diviser par une fraction, c\'est multiplier par son inverse : $P_A(B)={{eval:n*r/(d*s)}}'
     '\\times\\dfrac{ {{d}} }{ {{n}} }=' + PRIMAIRE + '{ {{eval:r/s}} }$.'],
    HINT_F2,
    FRAC_COND))
v = {'d': 3, 'n': 2, 's': 5, 'r': 3}  # P(A ∩ B) = 2/5 → 3/5
f2s += [spec('2/5 ÷ 2/3 = 3/5', 3, v, 'correct', ['\\frac{3}{5}']),
        spec('Décimal exact 0,6', 3, v, 'correct', ['0{,}6']),
        spec('Multiplié par P(A)', 3, v, 'incorrect', ['\\frac{4}{15}'], ERR_FOIS_PA),
        spec('Quotient à l\'envers', 3, v, 'incorrect', ['\\frac{5}{3}'], ERR_ENVERS),
        spec('P(A ∩ B) recopiée', 3, v, 'incorrect', ['\\frac{2}{5}'], ERR_INTER)]

# v4 — en situation : spams supprimés
ERR_PSD = ('$P_S(D)$ est la proportion de messages supprimés **parmi les spams**, pas parmi tous '
           'les messages.')
ERR_BRANCHE = 'Tu as calculé la probabilité qu\'un message soit un spam **non** supprimé.'
f2.append(variation(
    'Une messagerie trie les messages reçus : ${{x}}\\,\\%$ des messages sont des spams, et son '
    'logiciel supprime ${{y}}\\,\\%$ des spams.\n\nOn choisit un message au hasard. On note $S$ '
    'l\'évènement « le message est un spam » et $D$ l\'évènement « le message est supprimé par le '
    'logiciel ».\n\nQuelle est la probabilité que le message soit un spam supprimé par le logiciel ? '
    + REPONSE + '\n\n$P(S\\cap D)=?$',
    [var('x', '10..40'), var('y', '80..98')],
    [case('{{eval:x*y/10000}}', [
        erreur('{{eval:y/100}}', ERR_PSD, 'P_S(D) recopiée'),
        erreur('{{eval:x*(100-y)/10000}}', ERR_BRANCHE, 'Spam non supprimé'),
        erreur('{{eval:(x+y)/100}}', ERR_SOMME, 'Somme au lieu du produit'),
    ])],
    ['L\'énoncé donne $P(S)={{eval:x/100;d}}$ et, parmi les spams, $P_S(D)={{eval:y/100;d}}$.',
     'Par définition, $P_S(D)=\\dfrac{P(S\\cap D)}{P(S)}$, donc $P(S\\cap D)=P(S)\\times P_S(D)$.',
     '$P(S\\cap D)={{eval:x/100;d}}\\times{{eval:y/100;d}}=' + PRIMAIRE
     + '{ {{eval:x*y/10000;d}} }$.'],
    'La définition : $P_S(D)=\\dfrac{P(S\\cap D)}{P(S)}$.'))
v = {'x': 20, 'y': 95}
f2s += [spec('0,2 × 0,95 = 0,19', 4, v, 'correct', ['0{,}19']),
        spec('Fraction 19/100', 4, v, 'correct', ['\\frac{19}{100}']),
        spec('Pourcentage refusé', 4, v, 'bad_form', ['19\\%']),
        spec('P_S(D) recopiée', 4, v, 'incorrect', ['0{,}95'], ERR_PSD),
        spec('Spam non supprimé', 4, v, 'incorrect', ['0{,}01'], ERR_BRANCHE),
        spec('Somme', 4, v, 'incorrect', ['1{,}15'], ERR_SOMME)]

ecrire('f2-intersection-et-probabilite-conditionnelle', modele(
    'Probabilité conditionnelle et intersection : P(A ∩ B) = P(A) × P_A(B)',
    'Sans arbre : calculer P(A ∩ B) à partir de P(A) et P_A(B), ou P_A(B) à partir de P(A) et '
    'P(A ∩ B), en décimaux, en fractions ou en situation.',
    ['2'], 2, f2, f2s,
    {'noeud': 'Probabilités > Probabilités conditionnelles', 'point': '2-390'}, delay=60))

# =============================================================================================
# F5 — Retrouver P(A) par les probabilités totales (1P12-1). Point 1SPE-340.
# P(A) = a/10, P_A(B) = b/10, P_Ā(B) = k/10 ; P(B) = (ab + (10 − a)k)/100 tombe au centième.
# =============================================================================================

HINT_F5 = ('Note $x=P(A)$ et écris $P(B)$ avec la formule des probabilités totales : tu obtiens '
           'une équation d\'inconnue $x$.')
ERR_DIV_PAB = ('Tu as divisé $P(B)$ par $P_A(B)$ : c\'est oublier le chemin qui passe par '
               '$\\overline{A}$.')
ERR_SANS_DIV = ('Tu as soustrait $P_{\\overline{A}}(B)$ sans finir : l\'équation donne '
                '$x\\left(P_A(B)-P_{\\overline{A}}(B)\\right)=P(B)-P_{\\overline{A}}(B)$, il reste à '
                'diviser.')
ERR_ABARRE = 'C\'est la probabilité de $\\overline{A}$ : on demande celle de $A$.'
ERR_PRODUIT = ('Tu as multiplié $P(B)$ par $P_A(B)$ : écris plutôt l\'équation donnée par la formule '
               'des probabilités totales.')
F5_VARS = [var('a', '2..8'), var('b', '1..9'), var('k', '1..9')]
F5_COND = ['a != 5', 'b != k', '(a*b+(10-a)*k)*b != 100*a', 'a*(b-k) != 10*(10-a)']
PB = '{{eval:(a*b+(10-a)*k)/100;d}}'


def erreurs_f5(lettre='A', b_='B'):
    return [
        erreur('{{eval:(a*b+(10-a)*k)/(10*b)}}', ERR_DIV_PAB, 'P(B) divisée par P_A(B)'),
        erreur('{{eval:a*(b-k)/100}}', ERR_SANS_DIV, 'Division oubliée'),
        erreur('{{eval:(10-a)/10}}', ERR_ABARRE, 'P(Ā) au lieu de P(A)'),
        erreur('{{eval:(a*b+(10-a)*k)*b/1000}}', ERR_PRODUIT, 'P(B) × P_A(B)'),
    ]


def etapes_f5(a_='A', b_='B'):
    abar = '\\overline{' + a_ + '}'
    return [
        'On note $x=P(' + a_ + ')$ ; alors $P(' + abar + ')=1-x$. D\'après la formule des '
        'probabilités totales, $P(' + b_ + ')=P(' + a_ + ')\\times P_{' + a_ + '}(' + b_
        + ')+P(' + abar + ')\\times P_{' + abar + '}(' + b_ + ')$.',
        '$' + PB + '={{eval:b/10;d}}\\,x+{{eval:k/10;d}}\\,(1-x)$, soit $' + PB
        + '-{{eval:k/10;d}}={{eval:(b-k)/10;d}}\\,x$.',
        'Donc $x=\\dfrac{ {{eval:a*(b-k)/100;d}} }{ {{eval:(b-k)/10;d}} }$ et $P(' + a_ + ')='
        + PRIMAIRE + '{ {{eval:a/10;d}} }$.',
    ]


f5, f5s = [], []

# v0 — sans arbre, P_Ā(B̄) donnée
f5.append(variation(
    'On considère deux évènements $A$ et $B$ tels que $P(B)=' + PB + '$, $P_A(B)={{eval:b/10;d}}$ et '
    '$P_{\\overline{A}}(\\overline{B})={{eval:(10-k)/10;d}}$.\n\nCalcule $P(A)$. ' + REPONSE
    + '\n\n$P(A)=?$',
    F5_VARS,
    [case('{{eval:a/10}}', erreurs_f5())],
    ['$P_{\\overline{A}}(B)=1-P_{\\overline{A}}(\\overline{B})=1-{{eval:(10-k)/10;d}}'
     '={{eval:k/10;d}}$.'] + etapes_f5(),
    HINT_F5, F5_COND))
v = {'a': 3, 'b': 6, 'k': 2}  # P(B) = 0,18 + 0,14 = 0,32
f5s += [spec('P(B) = 0,32, P_A(B) = 0,6, P_Ā(B̄) = 0,8 : P(A) = 0,3', 0, v, 'correct', ['0{,}3']),
        spec('Fraction 3/10', 0, v, 'correct', ['\\frac{3}{10}']),
        spec('P(B) / P_A(B)', 0, v, 'incorrect', ['\\frac{8}{15}'], ERR_DIV_PAB),
        spec('Division oubliée', 0, v, 'incorrect', ['0{,}12'], ERR_SANS_DIV),
        spec('P(Ā)', 0, v, 'incorrect', ['0{,}7'], ERR_ABARRE),
        spec('P(B) × P_A(B)', 0, v, 'incorrect', ['0{,}192'], ERR_PRODUIT)]

# v1 — avec l'arbre, branches P(A) et P(Ā) inconnues
f5.append(variation(
    'On considère l\'arbre pondéré ci-dessous, dont on ne connaît pas les deux premières '
    'pondérations.\n\n```probtree\nA:?\n  B:0.{{b}}\n  \\overline{B}:0.{{eval:10-b}}\n'
    '\\overline{A}:?\n  B:0.{{k}}\n  \\overline{B}:0.{{eval:10-k}}\n```\n\nOn sait de plus que '
    '$P(B)=' + PB + '$.\n\nCalcule $P(A)$. ' + REPONSE + '\n\n$P(A)=?$',
    F5_VARS,
    [case('{{eval:a/10}}', erreurs_f5())],
    etapes_f5(),
    HINT_F5, F5_COND))
v = {'a': 6, 'b': 7, 'k': 2}  # P(B) = 0,42 + 0,08 = 0,5
f5s += [spec('P(B) = 0,5 : P(A) = 0,6', 1, v, 'correct', ['0{,}6']),
        spec('Fraction 3/5', 1, v, 'correct', ['\\frac{3}{5}']),
        spec('P(B) / P_A(B)', 1, v, 'incorrect', ['\\frac{5}{7}'], ERR_DIV_PAB),
        spec('Division oubliée', 1, v, 'incorrect', ['0{,}3'], ERR_SANS_DIV),
        spec('P(Ā)', 1, v, 'incorrect', ['0{,}4'], ERR_ABARRE),
        spec('P(B) × P_A(B)', 1, v, 'incorrect', ['0{,}35'], ERR_PRODUIT)]

# v2 — en situation : demi-pensionnaires et bus
ERR_DIV_BUS = ('Tu as divisé $P(B)$ par $P_D(B)$ : c\'est oublier les externes qui viennent en '
               'bus.')
ERR_SANS_DIV_BUS = ('Tu as soustrait $P_{\\overline{D}}(B)$ sans finir : l\'équation donne '
                    '$x\\left(P_D(B)-P_{\\overline{D}}(B)\\right)=P(B)-P_{\\overline{D}}(B)$, il '
                    'reste à diviser.')
ERR_EXTERNES = 'C\'est la proportion d\'externes : on demande celle des demi-pensionnaires.'
ERR_PRODUIT_BUS = ('Tu as multiplié $P(B)$ par $P_D(B)$ : écris plutôt l\'équation donnée par la '
                   'formule des probabilités totales.')
f5.append(variation(
    'Dans un lycée, ${{eval:a*b+(10-a)*k}}\\,\\%$ des élèves viennent en bus. Parmi les '
    'demi-pensionnaires, ${{b}}0\\,\\%$ viennent en bus ; parmi les externes, ${{k}}0\\,\\%$ viennent '
    'en bus. Chaque élève est demi-pensionnaire ou externe.\n\nOn choisit un élève au hasard. On '
    'note $D$ l\'évènement « l\'élève est demi-pensionnaire » et $B$ l\'évènement « l\'élève vient en '
    'bus ».\n\nQuelle est la probabilité que l\'élève soit demi-pensionnaire ? ' + REPONSE
    + '\n\n$P(D)=?$',
    F5_VARS,
    [case('{{eval:a/10}}', [
        erreur('{{eval:(a*b+(10-a)*k)/(10*b)}}', ERR_DIV_BUS, 'P(B) divisée par P_D(B)'),
        erreur('{{eval:a*(b-k)/100}}', ERR_SANS_DIV_BUS, 'Division oubliée'),
        erreur('{{eval:(10-a)/10}}', ERR_EXTERNES, 'Proportion d\'externes'),
        erreur('{{eval:(a*b+(10-a)*k)*b/1000}}', ERR_PRODUIT_BUS, 'P(B) × P_D(B)'),
    ])],
    ['L\'énoncé donne $P(B)=' + PB + '$, $P_D(B)={{eval:b/10;d}}$ et '
     '$P_{\\overline{D}}(B)={{eval:k/10;d}}$.'] + etapes_f5('D', 'B'),
    'Note $x=P(D)$ et écris $P(B)$ avec la formule des probabilités totales : tu obtiens une '
    'équation d\'inconnue $x$.', F5_COND))
v = {'a': 4, 'b': 8, 'k': 2}  # 32 + 12 = 44 %
f5s += [spec('44 % en bus : P(D) = 0,4', 2, v, 'correct', ['0{,}4']),
        spec('Fraction 2/5', 2, v, 'correct', ['\\frac{2}{5}']),
        spec('P(B) / P_D(B)', 2, v, 'incorrect', ['\\frac{11}{20}'], ERR_DIV_BUS),
        spec('Division oubliée', 2, v, 'incorrect', ['0{,}24'], ERR_SANS_DIV_BUS),
        spec('Externes', 2, v, 'incorrect', ['0{,}6'], ERR_EXTERNES),
        spec('P(B) × P_D(B)', 2, v, 'incorrect', ['0{,}352'], ERR_PRODUIT_BUS)]

ecrire('f5-retrouver-p-a-par-les-probabilites-totales', modele(
    'Retrouver P(A) par la formule des probabilités totales',
    'P(B), P_A(B) et P_Ā(B) (ou P_Ā(B̄)) connues : poser x = P(A) et résoudre l\'équation donnée '
    'par la formule des probabilités totales ; sans arbre, avec l\'arbre, en situation.',
    ['1_SPE'], 3, f5, f5s, TOTALES, delay=150))

# =============================================================================================
# F6 — Indépendance lue sur un tableau d'effectifs (1P13-1). Point 1SPE-424.
# Colonnes A / Ā : effectifs ca, cb multiples de 10 (20 à 90) ; P(B) = p/10. Indépendants
# (ind = 1) : n(A ∩ B) = ca·p/10 ; sinon on décale de dd = ±3 à ±8 personnes (la ligne B garde
# son total). V1, V2 : QCM à quatre propositions justifiées, chiffrées ; V3 : une case.
# =============================================================================================

HINT_F6 = ('Indépendants : $P(A\\cap B)=P(A)\\times P(B)$. Écris chaque probabilité comme un '
           'effectif sur l\'effectif total.')
F6_VARS = [var('ca', '20|30|40|50|60|70|80|90'), var('cb', '20|30|40|50|60|70|80|90'),
           var('p', '3..7'), var('ind', '0|1'), var('dd', '3..8;±'),
           var('nt', 'eval:ca+cb'), var('nr', 'eval:p*(ca+cb)/10'),
           var('x', 'eval:ca*p/10+(1-ind)*dd'), var('y', 'eval:p*(ca+cb)/10-ca*p/10-(1-ind)*dd'),
           var('z', 'eval:ca-ca*p/10-(1-ind)*dd'),
           var('w', 'eval:cb-p*(ca+cb)/10+ca*p/10+(1-ind)*dd')]
F6_COND = ['x >= 2', 'y >= 2', 'z >= 2', 'w >= 2', '10*ca != p*(ca+cb)']


def tableau(a_, abar, b_, bbar, cellules):
    """Tableau d'effectifs : colonnes A / Ā, lignes B / B̄ ; cellules = (x, y, z, w)."""
    x, y, z, w = cellules
    return ('|  | ' + a_ + ' | ' + abar + ' | Total |\n|---|---|---|---|\n'
            '| ' + b_ + ' | ' + x + ' | ' + y + ' | ${{nr}}$ |\n'
            '| ' + bbar + ' | ' + z + ' | ' + w + ' | ${{eval:nt-nr}}$ |\n'
            '| Total | ${{ca}}$ | ${{cb}}$ | ${{nt}}$ |')


PLEIN = ('${{x}}$', '${{y}}$', '${{z}}$', '${{w}}$')
PROD = '{{eval:ca*p/(10*nt)}}'
INTER = '{{eval:x/nt}}'

f6, f6s = [], []

# v0 — festival, méthode P(A ∩ B) = P(A) × P(B)
f6.append(variation(
    'Un festival propose deux soirées, le samedi et le dimanche. Chaque billet est vendu au tarif '
    'plein ou au tarif réduit. Le tableau donne la répartition des billets vendus.\n\n'
    + tableau('Samedi', 'Dimanche', 'Tarif réduit', 'Tarif plein', PLEIN)
    + '\n\nOn choisit un billet au hasard. On note $A$ l\'évènement « le billet est pour la soirée '
    'du samedi » et $B$ l\'évènement « le billet est au tarif réduit ».\n\nLes évènements $A$ et $B$ '
    'sont-ils indépendants ?\n\n```choix\n'
    '- Oui, car $P(A\\cap B)=P(A)\\times P(B)=' + PROD + '$.\n'
    '- Non, car $P(A\\cap B)={{eval:ind*p/10+(1-ind)*x/nt}}\\neq P(A)\\times P(B)=' + PROD + '$.\n'
    '- Oui, car $P(A\\cap B)\\neq 0$.\n'
    '- Non, car $P(A)\\neq P(B)$.\n```',
    F6_VARS,
    [case('{{eval:1-ind}}')],
    ['$P(A)=\\dfrac{ {{ca}} }{ {{nt}} }={{eval:ca/nt}}$, $P(B)=\\dfrac{ {{nr}} }{ {{nt}} }'
     '={{eval:p/10}}$ et $P(A\\cap B)=\\dfrac{ {{x}} }{ {{nt}} }=' + INTER + '$.',
     '$P(A)\\times P(B)={{eval:ca/nt}}\\times{{eval:p/10}}=' + PROD + '$.',
     '{{if:ind=1|C\'est bien $P(A\\cap B)$ : $A$ et $B$ **sont indépendants**.}}'
     '{{if:ind=0|Or $P(A\\cap B)=' + INTER + '\\neq' + PROD + '$ : $A$ et $B$ **ne sont pas '
     'indépendants**.}}',
     'Ni $P(A\\cap B)\\neq 0$ ni $P(A)\\neq P(B)$ ne disent rien de l\'indépendance : seule '
     'l\'égalité $P(A\\cap B)=P(A)\\times P(B)$ compte.'],
    HINT_F6, F6_COND))
v = {'ca': 40, 'cb': 60, 'p': 3, 'ind': 1, 'dd': 5}  # 12 / 100 = 0,4 × 0,3
f6s += [spec('Indépendants : 12/100 = 0,4 × 0,3', 0, v, 'correct', ['0']),
        spec('« Non » refusé', 0, v, 'incorrect', ['1']),
        spec('« Oui, car ≠ 0 » refusé', 0, v, 'incorrect', ['2']),
        spec('« Non, car P(A) ≠ P(B) » refusé', 0, v, 'incorrect', ['3'])]
v = {'ca': 40, 'cb': 60, 'p': 3, 'ind': 0, 'dd': 5}  # 17 / 100 ≠ 0,12
f6s += [spec('Non indépendants : 17/100 ≠ 0,12', 0, v, 'correct', ['1']),
        spec('« Oui, car produit » refusé', 0, v, 'incorrect', ['0']),
        spec('« Oui, car ≠ 0 » refusé', 0, v, 'incorrect', ['2']),
        spec('« Non, car P(A) ≠ P(B) » refusé', 0, v, 'incorrect', ['3'])]

# v1 — ateliers d'un lycée, méthode P_A(B) = P(B)
PB_F6 = '{{eval:p/10}}'
f6.append(variation(
    'Dans un lycée, on s\'intéresse aux élèves inscrits à l\'atelier théâtre et aux '
    'demi-pensionnaires. Le tableau donne les effectifs.\n\n'
    + tableau('Théâtre', 'Pas de théâtre', 'Demi-pensionnaire', 'Externe', PLEIN)
    + '\n\nOn choisit un élève au hasard. On note $A$ l\'évènement « l\'élève est inscrit à l\'atelier '
    'théâtre » et $B$ l\'évènement « l\'élève est demi-pensionnaire ».\n\nLes évènements $A$ et $B$ '
    'sont-ils indépendants ?\n\n```choix\n'
    '- Oui, car $P_A(B)=P(B)=' + PB_F6 + '$.\n'
    '- Non, car $P_A(B)={{eval:ind*ca*p/(10*nt)+(1-ind)*x/ca}}\\neq P(B)=' + PB_F6 + '$.\n'
    '- Oui, car $P(A\\cap B)\\neq 0$.\n'
    '- Non, car $P(A)\\neq P(B)$.\n```',
    F6_VARS,
    [case('{{eval:1-ind}}')],
    ['Quand $P(A)\\neq 0$, $A$ et $B$ sont indépendants si et seulement si $P_A(B)=P(B)$.',
     '$P(B)=\\dfrac{ {{nr}} }{ {{nt}} }=' + PB_F6 + '$ et, parmi les ${{ca}}$ élèves inscrits au '
     'théâtre, $P_A(B)=\\dfrac{ {{x}} }{ {{ca}} }={{eval:x/ca}}$.',
     '{{if:ind=1|$P_A(B)=P(B)$ : $A$ et $B$ **sont indépendants**.}}'
     '{{if:ind=0|$P_A(B)\\neq P(B)$ : $A$ et $B$ **ne sont pas indépendants**.}}',
     'Ni $P(A\\cap B)\\neq 0$ ni $P(A)\\neq P(B)$ ne disent rien de l\'indépendance.'],
    'Indépendants : $P_A(B)=P(B)$. $P_A(B)$ se lit dans la colonne de $A$ seulement.',
    F6_COND))
v = {'ca': 50, 'cb': 30, 'p': 6, 'ind': 1, 'dd': -4}  # 30 / 50 = 0,6
f6s += [spec('Indépendants : 30/50 = 0,6', 1, v, 'correct', ['0']),
        spec('« Non » refusé', 1, v, 'incorrect', ['1']),
        spec('« Oui, car ≠ 0 » refusé', 1, v, 'incorrect', ['2'])]
v = {'ca': 50, 'cb': 30, 'p': 6, 'ind': 0, 'dd': -4}  # 26 / 50 ≠ 0,6
f6s += [spec('Non indépendants : 26/50 ≠ 0,6', 1, v, 'correct', ['1']),
        spec('« Oui » refusé', 1, v, 'incorrect', ['0']),
        spec('« Non, car P(A) ≠ P(B) » refusé', 1, v, 'incorrect', ['3'])]

# v2 — salle de sport : l'effectif qui rend A et B indépendants (une case)
ERR_SANS_N = ('Tu as oublié de diviser par l\'effectif total : $n(A\\cap B)=\\dfrac{n(A)\\times '
              'n(B)}{N}$.')
ERR_INCLUSION = ('$n(A)+n(B)-N$ est le plus petit effectif possible de $A\\cap B$, pas celui qui '
                 'rend $A$ et $B$ indépendants.')
ERR_PA = 'Tu as donné $P(A)$ : on demande un effectif.'
f6.append(variation(
    'Une salle de sport propose deux formules, « libre » et « coaching ». Chaque abonné paie en une '
    'fois ou en mensualités. On ne connaît que les totaux du tableau des effectifs.\n\n'
    + tableau('Libre', 'Coaching', 'Mensualités', 'En une fois', ('$?$', '', '', ''))
    + '\n\nOn choisit un abonné au hasard. On note $A$ l\'évènement « l\'abonné a la formule libre » '
    'et $B$ l\'évènement « l\'abonné paie en mensualités ».\n\nQuel effectif faut-il écrire dans la '
    'case « libre et mensualités » pour que $A$ et $B$ soient indépendants ?',
    [var('ca', '20|30|40|50|60|70|80|90'), var('cb', '20|30|40|50|60|70|80|90'),
     var('p', '3..7'), var('nt', 'eval:ca+cb'), var('nr', 'eval:p*(ca+cb)/10')],
    [case('{{eval:ca*p/10}}', [
        erreur('{{eval:ca*nr}}', ERR_SANS_N, 'Pas de division par N'),
        erreur('{{eval:ca+nr-nt}}', ERR_INCLUSION, 'n(A) + n(B) − N'),
        erreur('{{eval:ca/nt}}', ERR_PA, 'P(A) au lieu d\'un effectif'),
    ])],
    ['$A$ et $B$ sont indépendants lorsque $P(A\\cap B)=P(A)\\times P(B)$, soit '
     '$\\dfrac{n(A\\cap B)}{ {{nt}} }=\\dfrac{ {{ca}} }{ {{nt}} }\\times\\dfrac{ {{nr}} }{ {{nt}} }$.',
     'Donc $n(A\\cap B)=\\dfrac{ {{ca}}\\times{{nr}} }{ {{nt}} }=' + PRIMAIRE
     + '{ {{eval:ca*p/10}} }$.'],
    HINT_F6, ['10*ca != p*(ca+cb)', 'ca+nr-nt != ca*p/10']))
v = {'ca': 40, 'cb': 60, 'p': 7}  # 40 × 70 / 100 = 28
f6s += [spec('40 × 70 / 100 = 28', 2, v, 'correct', ['28']),
        spec('27 refusé', 2, v, 'incorrect', ['27']),
        spec('Pas de division par N', 2, v, 'incorrect', ['2\\,800'], ERR_SANS_N),
        spec('n(A) + n(B) − N', 2, v, 'incorrect', ['10'], ERR_INCLUSION),
        spec('P(A)', 2, v, 'incorrect', ['0{,}4'], ERR_PA)]

ecrire('f6-independance-sur-un-tableau-d-effectifs', modele(
    'Indépendance lue sur un tableau d\'effectifs',
    'Tableau croisé d\'effectifs en situation : décider si A et B sont indépendants (QCM justifié, '
    'par P(A ∩ B) = P(A)P(B) ou par P_A(B) = P(B)), ou trouver l\'effectif qui les rend '
    'indépendants.',
    ['1_SPE'], 2, f6, f6s,
    {'noeud': 'Probabilités > Probabilités conditionnelles > indépendance', 'point': '1SPE-424'},
    shared={'blankDefaults': {'acceptDecimal': True}}, delay=150))

# =============================================================================================
# F7 — Problème à données mélangées (1P14-1, 1P14-2). Point 1SPE-340.
# V1, V2 : P(A) = a %, P(A ∩ B) = m % (m = a·t/10, donc P_A(B) = t/10 exact), P_Ā(B) = k %.
# V3 (sens classique) : P(S), P_S(D), P_S̄(D̄).
# =============================================================================================

ARRONDI = {'precision': {'type': 'decimal', 'digits': 2}, 'acceptDecimal': False}
F7_VARS = [var('a', '30|35|40|45|55|60|65|70'), var('t', '3..9'), var('k', '30..70'),
           var('m', 'eval:a*t/10'), var('dv', 'eval:10000-100*a*t/10-(100-a)*k')]
F7_COND = ['mod(a*t, 10) = 0', 'm >= 20', 'm <= a-5', 'k != 50']
PV = '{{eval:(100*m+(100-a)*k)/10000}}'
PVD = '{{eval:(100*m+(100-a)*k)/10000;d}}'
R3 = 'round(10000*(a-m)/dv)'

ERR_PAV_INTER = 'Tu as donné $P(A\\cap V)$ : $P_A(V)$ s\'obtient en divisant par $P(A)$.'
ERR_PAV_ENVERS = 'Ton quotient est à l\'envers : $P_A(V)=\\dfrac{P(A\\cap V)}{P(A)}$.'
ERR_PAV_PROD = 'Tu as multiplié : $P_A(V)$ s\'obtient en divisant $P(A\\cap V)$ par $P(A)$.'
ERR_PV_FACTEUR = ('Tu as oublié le facteur $P(\\overline{A})$ : '
                  '$P(\\overline{A}\\cap V)=P(\\overline{A})\\times P_{\\overline{A}}(V)$.')
ERR_PV_CHEMIN = 'Il manque le chemin qui passe par $\\overline{A}$.'
ERR_PV_PA = ('Le chemin $\\overline{A}$ puis $V$ se calcule avec $P(\\overline{A})$, pas avec '
             '$P(A)$.')
ERR_INV_DIV = 'Tu as donné $P(A\\cap\\overline{V})$ : il reste à diviser par $P(\\overline{V})$.'
ERR_INV_ENVERS = ('Tu as calculé $P_A(\\overline{V})$ : la condition, ici, est $\\overline{V}$, '
                  'elle va au dénominateur.')
ERR_INV_PV = 'Tu as divisé par $P(V)$ : la condition est $\\overline{V}$, divise par $P(\\overline{V})$.'

f7, f7s = [], []

# v0 — agence de voyage
f7.append(variation(
    'Une agence de voyage organise un séjour. Pour s\'y rendre, ${{a}}\\,\\%$ des clients prennent '
    'l\'avion, les autres le train. ${{m}}\\,\\%$ des clients prennent l\'avion **et** l\'option '
    '« visite guidée ». Parmi les clients qui prennent le train, ${{k}}\\,\\%$ prennent la visite '
    'guidée.\n\nOn choisit un client au hasard. On note $A$ l\'évènement « le client prend l\'avion » '
    'et $V$ l\'évènement « le client prend la visite guidée ».\n\nCalcule la probabilité qu\'un client '
    'qui prend l\'avion prenne la visite guidée. Donne la valeur exacte.\n\n$P_A(V)=?$\n\nCalcule la '
    'probabilité que le client prenne la visite guidée. Donne la valeur exacte.\n\n$P(V)=?$\n\nLe '
    'client n\'a pas pris la visite guidée. Quelle est la probabilité qu\'il ait pris l\'avion ? '
    'Arrondis au centième.\n\n$P_{\\overline{V}}(A)\\approx ?$',
    F7_VARS,
    [case('{{eval:t/10}}', [
        erreur('{{eval:m/100}}', ERR_PAV_INTER, 'P(A ∩ V) recopiée'),
        erreur('{{eval:a/m}}', ERR_PAV_ENVERS, 'Quotient à l\'envers'),
        erreur('{{eval:a*m/10000}}', ERR_PAV_PROD, 'Produit au lieu du quotient'),
    ]),
     case(PV, [
         erreur('{{eval:(m+k)/100}}', ERR_PV_FACTEUR, 'Facteur P(Ā) oublié'),
         erreur('{{eval:m/100}}', ERR_PV_CHEMIN, 'Un seul chemin'),
         erreur('{{eval:(100*m+a*k)/10000}}', ERR_PV_PA, 'P(A) au lieu de P(Ā)'),
     ]),
     case('{{eval:' + R3 + '/100;d}}', [
         erreur('{{eval:(a-m)/100}}', ERR_INV_DIV, 'Division oubliée'),
         erreur('{{eval:(a-m)/a}}', ERR_INV_ENVERS, 'P_A(V̄) au lieu de P_V̄(A)'),
         erreur('{{eval:round(10000*(a-m)/(10000-dv))/100;d}}', ERR_INV_PV, 'Divisé par P(V)'),
     ], ARRONDI)],
    ['$P_A(V)=\\dfrac{P(A\\cap V)}{P(A)}=\\dfrac{ {{eval:m/100;d}} }{ {{eval:a/100;d}} }='
     + PRIMAIRE + '{ {{eval:t/10;d}} }$.',
     'On peut alors compléter l\'arbre pondéré :\n\n```probtree\nA:{{eval:a/100;d}}\n'
     '  V:{{eval:t/10;d}}\n  \\overline{V}:{{eval:1-t/10;d}}\n\\overline{A}:{{eval:1-a/100;d}}\n'
     '  V:{{eval:k/100;d}}\n  \\overline{V}:{{eval:1-k/100;d}}\n```',
     'D\'après la formule des probabilités totales, $P(V)=P(A\\cap V)+P(\\overline{A}\\cap V)'
     '={{eval:m/100;d}}+{{eval:1-a/100;d}}\\times{{eval:k/100;d}}=' + PRIMAIRE + '{' + PVD + '}$.',
     '$P(\\overline{V})=1-' + PVD + '={{eval:dv/10000;d}}$ et $P(A\\cap\\overline{V})=P(A)-P(A\\cap V)'
     '={{eval:(a-m)/100;d}}$, donc $P_{\\overline{V}}(A)=\\dfrac{ {{eval:(a-m)/100;d}} }'
     '{ {{eval:dv/10000;d}} }\\approx' + PRIMAIRE + '{ {{eval:' + R3 + '/100;d}} }$.'],
    'Commence par retrouver $P_A(V)=\\dfrac{P(A\\cap V)}{P(A)}$, puis complète l\'arbre.',
    F7_COND + ['abs(10000*(a-m)/dv-' + R3 + ') < 0.49', 'mod(' + R3 + ', 10) != 0',
               R3 + ' != round(100*(a-m)/a)', R3 + ' != round(10000*(a-m)/(10000-dv))',
               R3 + ' != a-m']))
v = {'a': 40, 't': 6, 'k': 30}  # m = 24 ; P(V) = 0,24 + 0,18 = 0,42 ; P_V̄(A) = 0,16/0,58 ≈ 0,28
f7s += [spec('P_A(V) = 0,6 ; P(V) = 0,42 ; P_V̄(A) ≈ 0,28', 0, v, 'correct',
             ['0{,}6', '0{,}42', '0{,}28']),
        spec('Fractions 3/5 et 21/50', 0, v, 'correct', ['\\frac{3}{5}', '\\frac{21}{50}', '0{,}28']),
        spec('Arrondi faux 0,27', 0, v, 'incorrect', ['0{,}6', '0{,}42', '0{,}27']),
        spec('P(A ∩ V) recopiée', 0, v, 'incorrect', ['0{,}24', '0{,}42', '0{,}28'], ERR_PAV_INTER),
        spec('Quotient à l\'envers', 0, v, 'incorrect', ['\\frac{5}{3}', '0{,}42', '0{,}28'],
             ERR_PAV_ENVERS),
        spec('Produit', 0, v, 'incorrect', ['0{,}096', '0{,}42', '0{,}28'], ERR_PAV_PROD),
        spec('Facteur P(Ā) oublié', 0, v, 'incorrect', ['0{,}6', '0{,}54', '0{,}28'], ERR_PV_FACTEUR),
        spec('Un seul chemin', 0, v, 'incorrect', ['0{,}6', '0{,}24', '0{,}28'], ERR_PV_CHEMIN),
        spec('P(A) au lieu de P(Ā)', 0, v, 'incorrect', ['0{,}6', '0{,}36', '0{,}28'], ERR_PV_PA),
        spec('Division oubliée', 0, v, 'incorrect', ['0{,}6', '0{,}42', '0{,}16'], ERR_INV_DIV),
        spec('P_A(V̄)', 0, v, 'incorrect', ['0{,}6', '0{,}42', '0{,}4'], ERR_INV_ENVERS),
        spec('Divisé par P(V)', 0, v, 'incorrect', ['0{,}6', '0{,}42', '0{,}38'], ERR_INV_PV)]

# v1 — salon de coiffure : P(C̄ ∩ Ē) en dernière case, valeur exacte
ERR_PCE_INTER = 'Tu as donné $P(C\\cap E)$ : $P_C(E)$ s\'obtient en divisant par $P(C)$.'
ERR_PCE_ENVERS = 'Ton quotient est à l\'envers : $P_C(E)=\\dfrac{P(C\\cap E)}{P(C)}$.'
ERR_PCE_PROD = 'Tu as multiplié : $P_C(E)$ s\'obtient en divisant $P(C\\cap E)$ par $P(C)$.'
ERR_PE_FACTEUR = ('Tu as oublié le facteur $P(\\overline{C})$ : '
                  '$P(\\overline{C}\\cap E)=P(\\overline{C})\\times P_{\\overline{C}}(E)$.')
ERR_PE_CHEMIN = 'Il manque le chemin qui passe par $\\overline{C}$.'
ERR_PE_PC = ('Le chemin $\\overline{C}$ puis $E$ se calcule avec $P(\\overline{C})$, pas avec '
             '$P(C)$.')
ERR_NN_EBARRE = ('Tu as donné $P(\\overline{E})$ : on veut les clients qui ne prennent **ni** la '
                 'couleur-soin **ni** l\'effet.')
ERR_NN_BRANCHE = ('Tu as pris $P_{\\overline{C}}(E)$ au lieu de $P_{\\overline{C}}(\\overline{E})$ '
                  'sur la seconde branche.')
ERR_NN_SEUL = 'Tu as donné $P_{\\overline{C}}(\\overline{E})$ : il faut encore multiplier par $P(\\overline{C})$.'
f7.append(variation(
    'Un salon de coiffure propose une couleur-soin : ${{a}}\\,\\%$ des clients la choisissent. '
    '${{m}}\\,\\%$ des clients choisissent la couleur-soin **et** l\'effet « coup de soleil » (des '
    'mèches éclaircies). Parmi les clients qui ne choisissent pas la couleur-soin, ${{k}}\\,\\%$ '
    'demandent l\'effet « coup de soleil ».\n\nOn choisit un client au hasard. On note $C$ '
    'l\'évènement « le client choisit la couleur-soin » et $E$ l\'évènement « le client demande '
    'l\'effet coup de soleil ».\n\nCalcule $P_C(E)$. Donne la valeur exacte.\n\n$P_C(E)=?$\n\n'
    'Calcule la probabilité que le client demande l\'effet « coup de soleil ». Donne la valeur '
    'exacte.\n\n$P(E)=?$\n\nCalcule la probabilité que le client ne choisisse pas la couleur-soin '
    'et ne demande pas l\'effet « coup de soleil ». Donne la valeur exacte.\n\n'
    '$P(\\overline{C}\\cap\\overline{E})=?$',
    F7_VARS,
    [case('{{eval:t/10}}', [
        erreur('{{eval:m/100}}', ERR_PCE_INTER, 'P(C ∩ E) recopiée'),
        erreur('{{eval:a/m}}', ERR_PCE_ENVERS, 'Quotient à l\'envers'),
        erreur('{{eval:a*m/10000}}', ERR_PCE_PROD, 'Produit au lieu du quotient'),
    ]),
     case(PV, [
         erreur('{{eval:(m+k)/100}}', ERR_PE_FACTEUR, 'Facteur P(C̄) oublié'),
         erreur('{{eval:m/100}}', ERR_PE_CHEMIN, 'Un seul chemin'),
         erreur('{{eval:(100*m+a*k)/10000}}', ERR_PE_PC, 'P(C) au lieu de P(C̄)'),
     ]),
     case('{{eval:(100-a)*(100-k)/10000}}', [
         erreur('{{eval:dv/10000}}', ERR_NN_EBARRE, 'P(Ē) au lieu de P(C̄ ∩ Ē)'),
         erreur('{{eval:(100-a)*k/10000}}', ERR_NN_BRANCHE, 'Mauvaise branche'),
         erreur('{{eval:(100-k)/100}}', ERR_NN_SEUL, 'P(C̄) oubliée'),
     ])],
    ['$P_C(E)=\\dfrac{P(C\\cap E)}{P(C)}=\\dfrac{ {{eval:m/100;d}} }{ {{eval:a/100;d}} }='
     + PRIMAIRE + '{ {{eval:t/10;d}} }$.',
     'On peut alors compléter l\'arbre pondéré :\n\n```probtree\nC:{{eval:a/100;d}}\n'
     '  E:{{eval:t/10;d}}\n  \\overline{E}:{{eval:1-t/10;d}}\n\\overline{C}:{{eval:1-a/100;d}}\n'
     '  E:{{eval:k/100;d}}\n  \\overline{E}:{{eval:1-k/100;d}}\n```',
     'D\'après la formule des probabilités totales, $P(E)=P(C\\cap E)+P(\\overline{C}\\cap E)'
     '={{eval:m/100;d}}+{{eval:1-a/100;d}}\\times{{eval:k/100;d}}=' + PRIMAIRE + '{' + PVD + '}$.',
     '$P(\\overline{C}\\cap\\overline{E})=P(\\overline{C})\\times P_{\\overline{C}}(\\overline{E})'
     '={{eval:1-a/100;d}}\\times{{eval:1-k/100;d}}=' + PRIMAIRE
     + '{ {{eval:(100-a)*(100-k)/10000;d}} }$.'],
    'Commence par retrouver $P_C(E)=\\dfrac{P(C\\cap E)}{P(C)}$, puis complète l\'arbre.',
    F7_COND + ['100*(100-k) != dv', 'dv != (100-a)*k']))
v = {'a': 60, 't': 5, 'k': 40}  # m = 30 ; P(E) = 0,3 + 0,16 = 0,46 ; P(C̄ ∩ Ē) = 0,4 × 0,6 = 0,24
f7s += [spec('P_C(E) = 0,5 ; P(E) = 0,46 ; P(C̄ ∩ Ē) = 0,24', 1, v, 'correct',
             ['0{,}5', '0{,}46', '0{,}24']),
        spec('Fractions', 1, v, 'correct', ['\\frac{1}{2}', '\\frac{23}{50}', '\\frac{6}{25}']),
        spec('P(C ∩ E) recopiée', 1, v, 'incorrect', ['0{,}3', '0{,}46', '0{,}24'], ERR_PCE_INTER),
        spec('Quotient à l\'envers', 1, v, 'incorrect', ['2', '0{,}46', '0{,}24'], ERR_PCE_ENVERS),
        spec('Produit', 1, v, 'incorrect', ['0{,}18', '0{,}46', '0{,}24'], ERR_PCE_PROD),
        spec('Facteur P(C̄) oublié', 1, v, 'incorrect', ['0{,}5', '0{,}7', '0{,}24'], ERR_PE_FACTEUR),
        spec('Un seul chemin', 1, v, 'incorrect', ['0{,}5', '0{,}3', '0{,}24'], ERR_PE_CHEMIN),
        spec('P(C) au lieu de P(C̄)', 1, v, 'incorrect', ['0{,}5', '0{,}54', '0{,}24'], ERR_PE_PC),
        spec('P(Ē)', 1, v, 'incorrect', ['0{,}5', '0{,}46', '0{,}54'], ERR_NN_EBARRE),
        spec('Mauvaise branche', 1, v, 'incorrect', ['0{,}5', '0{,}46', '0{,}16'], ERR_NN_BRANCHE),
        spec('P(C̄) oubliée', 1, v, 'incorrect', ['0{,}5', '0{,}46', '0{,}6'], ERR_NN_SEUL)]

# v2 — snack (sens classique : P(S), P_S(D), P_S̄(D̄))
QD = 'a*b+(100-a)*(100-c)'
R3S = 'round(100*(100-a)*(100-c)/(' + QD + '))'
ERR_SD_PSD = 'Tu as donné $P_S(D)$ : il faut encore multiplier par $P(S)$.'
ERR_SD_BRANCHE = 'Tu as calculé $P(S\\cap\\overline{D})$ : le client prend un dessert.'
ERR_SD_SOMME = 'Tu as additionné : un chemin de l\'arbre se calcule par un produit.'
ERR_PD_CONTRAIRE = ('Sur la branche $\\overline{S}$, la probabilité de $D$ est '
                    '$P_{\\overline{S}}(D)=1-P_{\\overline{S}}(\\overline{D})$.')
ERR_PD_CHEMIN = 'Il manque le chemin qui passe par $\\overline{S}$.'
ERR_PD_FACTEUR = ('Tu as oublié le facteur $P(\\overline{S})$ : '
                  '$P(\\overline{S}\\cap D)=P(\\overline{S})\\times P_{\\overline{S}}(D)$.')
ERR_INVS_DIV = 'Tu as donné $P(\\overline{S}\\cap D)$ : il reste à diviser par $P(D)$.'
ERR_INVS_ENVERS = ('Tu as donné $P_{\\overline{S}}(D)$ : la condition, ici, est $D$, elle va au '
                   'dénominateur.')
ERR_INVS_BARRE = 'Tu as calculé $P_D(S)$ : on demande la probabilité que le client n\'ait pas pris de sandwich.'
f7.append(variation(
    'Un snack vend des sandwichs et des desserts. ${{a}}\\,\\%$ des clients achètent un sandwich. '
    'Parmi eux, ${{b}}\\,\\%$ achètent aussi un dessert. Parmi les clients qui n\'achètent pas de '
    'sandwich, ${{c}}\\,\\%$ n\'achètent pas de dessert.\n\nOn choisit un client au hasard. On note '
    '$S$ l\'évènement « le client achète un sandwich » et $D$ l\'évènement « le client achète un '
    'dessert ».\n\nCalcule la probabilité que le client achète un sandwich et un dessert. Donne la '
    'valeur exacte.\n\n$P(S\\cap D)=?$\n\nCalcule la probabilité que le client achète un dessert. '
    'Donne la valeur exacte.\n\n$P(D)=?$\n\nLe client a acheté un dessert. Quelle est la probabilité '
    'qu\'il n\'ait pas acheté de sandwich ? Arrondis au centième.\n\n$P_D(\\overline{S})\\approx ?$',
    [var('a', '30..70'), var('b', '30..70'), var('c', '30..70')],
    [case('{{eval:a*b/10000}}', [
        erreur('{{eval:b/100}}', ERR_SD_PSD, 'P_S(D) recopiée'),
        erreur('{{eval:a*(100-b)/10000}}', ERR_SD_BRANCHE, 'Mauvaise branche'),
        erreur('{{eval:(a+b)/100}}', ERR_SD_SOMME, 'Somme au lieu du produit'),
    ]),
     case('{{eval:(' + QD + ')/10000}}', [
         erreur('{{eval:(a*b+(100-a)*c)/10000}}', ERR_PD_CONTRAIRE, 'P_S̄(D̄) prise pour P_S̄(D)'),
         erreur('{{eval:a*b/10000}}', ERR_PD_CHEMIN, 'Un seul chemin'),
         erreur('{{eval:(a*b+100*(100-c))/10000}}', ERR_PD_FACTEUR, 'Facteur P(S̄) oublié'),
     ]),
     case('{{eval:' + R3S + '/100;d}}', [
         # Case arrondie : l'erreur prévue s'écrit arrondie au centième, comme l'élève la tape
         erreur('{{eval:round((100-a)*(100-c)/100)/100;d}}', ERR_INVS_DIV, 'Division oubliée'),
         erreur('{{eval:(100-c)/100}}', ERR_INVS_ENVERS, 'P_S̄(D) au lieu de P_D(S̄)'),
         erreur('{{eval:round(100*a*b/(' + QD + '))/100;d}}', ERR_INVS_BARRE, 'P_D(S)'),
     ], ARRONDI)],
    ['On traduit l\'énoncé par un arbre pondéré, avec $P_{\\overline{S}}(D)=1-{{eval:c/100;d}}'
     '={{eval:1-c/100;d}}$ :\n\n```probtree\nS:{{eval:a/100;d}}\n  D:{{eval:b/100;d}}\n'
     '  \\overline{D}:{{eval:1-b/100;d}}\n\\overline{S}:{{eval:1-a/100;d}}\n  D:{{eval:1-c/100;d}}\n'
     '  \\overline{D}:{{eval:c/100;d}}\n```',
     '$P(S\\cap D)={{eval:a/100;d}}\\times{{eval:b/100;d}}=' + PRIMAIRE
     + '{ {{eval:a*b/10000;d}} }$.',
     'D\'après la formule des probabilités totales, $P(D)=P(S\\cap D)+P(\\overline{S}\\cap D)'
     '={{eval:a*b/10000;d}}+{{eval:1-a/100;d}}\\times{{eval:1-c/100;d}}=' + PRIMAIRE
     + '{ {{eval:(' + QD + ')/10000;d}} }$.',
     '$P_D(\\overline{S})=\\dfrac{P(\\overline{S}\\cap D)}{P(D)}=\\dfrac{ {{eval:(100-a)*(100-c)/10000;d}} }'
     '{ {{eval:(' + QD + ')/10000;d}} }\\approx' + PRIMAIRE + '{ {{eval:' + R3S + '/100;d}} }$.'],
    'Traduis l\'énoncé par un arbre pondéré, sans oublier les évènements contraires sur chaque '
    'branche.',
    ['abs(100*(100-a)*(100-c)/(' + QD + ')-' + R3S + ') < 0.49', 'mod(' + R3S + ', 10) != 0',
     'b != 100-c', 'c != 50', R3S + ' != 100-c', R3S + ' != round(100*a*b/(' + QD + '))',
     R3S + ' != round((100-a)*(100-c)/100)']))
v = {'a': 40, 'b': 30, 'c': 60}
# P(S∩D) = 0,12 ; P(D) = 0,12 + 0,6 × 0,4 = 0,36 ; P_D(S̄) = 0,24 / 0,36 ≈ 0,67
f7s += [spec('0,12 ; 0,36 ; P_D(S̄) ≈ 0,67', 2, v, 'correct', ['0{,}12', '0{,}36', '0{,}67']),
        spec('Fractions', 2, v, 'correct', ['\\frac{3}{25}', '\\frac{9}{25}', '0{,}67']),
        spec('Troncature 0,66', 2, v, 'incorrect', ['0{,}12', '0{,}36', '0{,}66']),
        spec('P_S(D) recopiée', 2, v, 'incorrect', ['0{,}3', '0{,}36', '0{,}67'], ERR_SD_PSD),
        spec('Mauvaise branche', 2, v, 'incorrect', ['0{,}28', '0{,}36', '0{,}67'], ERR_SD_BRANCHE),
        spec('Somme', 2, v, 'incorrect', ['0{,}7', '0{,}36', '0{,}67'], ERR_SD_SOMME),
        spec('P_S̄(D̄) prise pour P_S̄(D)', 2, v, 'incorrect', ['0{,}12', '0{,}48', '0{,}67'],
             ERR_PD_CONTRAIRE),
        spec('Un seul chemin', 2, v, 'incorrect', ['0{,}12', '0{,}12', '0{,}67'], ERR_PD_CHEMIN),
        spec('Facteur P(S̄) oublié', 2, v, 'incorrect', ['0{,}12', '0{,}52', '0{,}67'],
             ERR_PD_FACTEUR),
        spec('Division oubliée', 2, v, 'incorrect', ['0{,}12', '0{,}36', '0{,}24'], ERR_INVS_DIV),
        spec('P_S̄(D)', 2, v, 'incorrect', ['0{,}12', '0{,}36', '0{,}4'], ERR_INVS_ENVERS),
        spec('P_D(S)', 2, v, 'incorrect', ['0{,}12', '0{,}36', '0{,}33'], ERR_INVS_BARRE)]

ecrire('f7-probleme-a-donnees-melangees', modele(
    'Problème à données mélangées : retrouver P_A(B), puis P(B), puis inverser',
    'L\'énoncé donne P(A), P(A ∩ B) et P_Ā(B) : retrouver P_A(B), calculer P(B) par les '
    'probabilités totales, puis une probabilité inverse (arrondie) ou une intersection ; et le sens '
    'classique (P(S), P_S(D), P_S̄(D̄)).',
    ['1_SPE'], 4, f7, f7s, TOTALES, delay=300))
