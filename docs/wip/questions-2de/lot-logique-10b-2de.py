"""Écrit les 7 modèles du lot 10 B « Logique » de la 2de dans scripts/questions/2de-logique-10b/.

Phase 0 validée par David le 2026-11-05 (§ 82 du journal `docs/wip/questions-2de-progress.md`).
Points : 2-208 (proposition), 2-209 (variables), 2-211 (négation), 2-213 (implication), 2-409
(équivalence), 2-215 (« pour tout »), 2-412 (« il existe »). Un point par modèle ; le nœud et le tag
sont posés par la migration de rangement (10 A + 10 B), après le `--publier` de David.

Décisions et pièges :
- BO « en situation » : propositions tirées des chapitres de 2de (calcul, parité, inégalités,
  quadrilatères), jamais de logique formelle ;
- L10-c : aucune négation de « et » / « ou » (niveau de 1re, 0ab3faa5) ;
- L10-d : « implique », « équivaut à » dans l'énoncé ; ⇒ et ⇔ seulement dans le corrigé ;
- nœuds et niveaux relevés en prod le 2026-11-05 : Proposition mathématique (notion, vide) → 208 niv. 1 ;
  › statut des lettres et des égalités (1, 3 pris) → 209 niv. 2 ; Quantificateurs et négation ›
  négation d'une proposition (2, 3 pris) → 211 niv. 1 ; › pour tout, il existe (4 pris) → 215 niv. 1,
  412 niv. 2 ; Implication et équivalence › implication (vide) → 213 niv. 1 ; › équivalence (vide) →
  409 niv. 1 ;
- pas de réponse « inégalité » dans le moteur (`answerKind` n'en a pas) : négation de « x > a » en
  case choix ;
- « donne un tel entier » : règle `equation_root` (toute solution acceptée, comme f98164b1) ;
- lettres des propositions et des figures ≠ étiquettes A-E des cases choix (P, Q, IJKL, MNP) ;
- `eval:` ne connaît ni `==` ni `>` : indicatrices ; `col()` seulement dans `$…$`.

    python3 docs/wip/questions-2de/lot-logique-10b-2de.py scripts/questions/2de-logique-10b
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


VRAI_FAUX = ['La proposition est vraie.', 'La proposition est fausse.']
MODELES = []

# --- 5. 2-208 : proposition ou non ----------------------------------------------------------------

PROPOSITION = ('Une **proposition** est une phrase mathématique dont on peut dire si elle est **vraie** ou'
               ' **fausse** (même sans savoir laquelle des deux).')

RECONNAITRE = variation(
    choix('Parmi ces écritures, lesquelles sont des propositions mathématiques (vraies ou fausses) ?',
          ['${{a}}+{{b}}={{c}}$', '${{a}}x+{{b}}$', 'Résoudre l\'équation ${{a}}x={{b}}$.',
           'Tout carré est un losange.', '${{n}}$ est un nombre premier.'], plusieurs=True),
    [var('a', '2..9'), var('b', '2..9'), var('w', '0|1'), var('c', 'eval:(a)+(b)+(w)'), var('n', '21..39')],
    None,
    [PROPOSITION,
     '$' + col('{{a}}+{{b}}={{c}}') + '$ est une proposition, {{if:w==0|vraie|fausse}}. « Tout carré est un'
     ' losange » est une proposition, vraie. « ${{n}}$ est un nombre premier » est une proposition : on peut'
     ' dire si elle est vraie ou fausse.',
     '${{a}}x+{{b}}$ est une **expression** : elle n\'est ni vraie ni fausse. « Résoudre… » est une'
     ' **consigne** : elle n\'est ni vraie ni fausse non plus.'],
    [case('0;3;4')])

VRAIE_OU_FAUSSE = variation(
    choix('On considère la proposition « ' + selon('t', [
        '${{a}}\\times{{b}}={{c}}$', '${{n}}$ est un multiple de $3$', '$({{a}}+{{b}})^2={{a}}^2+{{b}}^2$'])
          + ' ». Est-elle vraie ou fausse ?', VRAI_FAUX, melanger=False),
    [var('t', '0..2'), var('a', '3..9'), var('b', '3..9'), var('w', '0|1'), var('c', 'eval:(a)*(b)+(w)'),
     var('n', '20..60'), var('r3', 'eval:min((n)-3*floor((n)/3),1)'),
     var('rep', 'eval:(1-min(t,1))*(w)+(1-min(abs((t)-1),1))*(r3)+min(max((t)-1,0),1)')],
    None,
    [PROPOSITION,
     selon('t', [
         '${{a}}\\times{{b}}={{eval:(a)*(b)}}${{if:w==0|, la proposition est **vraie**.| et non ${{c}}$ : la'
         ' proposition est **fausse**.}}',
         '${{n}}=3\\times{{eval:floor((n)/3)}}{{if:r3==1|+{{eval:(n)-3*floor((n)/3)}}}}$ : {{if:r3==0|${{n}}$'
         ' est un multiple de $3$, la proposition est **vraie**.|le reste n\'est pas nul, la proposition est'
         ' **fausse**.}}',
         '$({{a}}+{{b}})^2={{eval:(a)+(b)}}^2={{eval:((a)+(b))^2}}$ mais ${{a}}^2+{{b}}^2={{eval:(a)^2+(b)^2}}$ :'
         ' la proposition est **fausse**.'])],
    [case('{{rep}}')])

SP_VF = {'t': 0, 'a': 4, 'b': 7, 'w': 0, 'c': 28, 'n': 21, 'r3': 0, 'rep': 0}
MODELES.append(modele(
    '05-proposition', 'Proposition mathématique ou non ?',
    'Reconnaître les propositions (égalité, propriété, « n est premier ») parmi une expression et une'
    ' consigne ; dire si 4 × 7 = 28, « 22 est un multiple de 3 », (a + b)² = a² + b² sont vraies ou fausses',
    1,
    [RECONNAITRE, VRAIE_OU_FAUSSE],
    [spec('Les trois propositions', 0, {'a': 3, 'b': 5, 'w': 1, 'c': 9, 'n': 23}, '0;3;4', 'correct'),
     spec('Erreur : l\'expression cochée', 0, {'a': 3, 'b': 5, 'w': 1, 'c': 9, 'n': 23}, '0;1;3;4',
          'incorrect'),
     spec('Incomplet : l\'égalité fausse oubliée', 0, {'a': 3, 'b': 5, 'w': 1, 'c': 9, 'n': 23}, '3;4',
          'unoptimal_form'),
     spec('4 × 7 = 28 : vraie', 1, SP_VF, '0', 'correct'),
     spec('4 × 7 = 29 : fausse', 1, dict(SP_VF, w=1, c=29, rep=1), '1', 'correct'),
     spec('21 multiple de 3 : vraie', 1, dict(SP_VF, t=1), '0', 'correct'),
     spec('22 multiple de 3 : fausse', 1, dict(SP_VF, t=1, n=22, r3=1, rep=1), '1', 'correct'),
     spec('(a + b)² = a² + b² : fausse', 1, dict(SP_VF, t=2, rep=1), '1', 'correct'),
     spec('Erreur : (a + b)² = a² + b² vraie', 1, dict(SP_VF, t=2, rep=1), '0', 'incorrect')],
    delay=90))

# --- 6. 2-209 : écrire avec une variable --------------------------------------------------------------

LETTRE = ('Pour écrire une proposition avec une lettre, on dit **ce que représente la lettre** (« pour tout'
          ' réel $x$ », « il existe un entier $k$ ») avant de l\'utiliser.')

TRADUIRE = variation(
    choix('Quelle écriture traduit la phrase « ' + selon('t', [
        'le carré d\'un nombre réel est toujours positif ou nul', 'l\'entier $n$ est pair',
        'l\'entier $n$ est un multiple de ${{m}}$']) + ' » ?',
          [selon('t', ['Pour tout réel $x$, $x^2\\geqslant 0$.', 'Il existe un entier $k$ tel que $n=2k$.',
                       'Il existe un entier $k$ tel que $n={{m}}k$.']),
           selon('t', ['Il existe un réel $x$ tel que $x^2\\geqslant 0$.',
                       'Il existe un réel $k$ tel que $n=2k$.',
                       'Il existe un entier $k$ tel que $k={{m}}n$.']),
           selon('t', ['Pour tout réel $x$, $x\\geqslant 0$.', 'Pour tout entier $k$, $n=2k$.',
                       'Pour tout entier $k$, $n={{m}}k$.']),
           selon('t', ['$x^2\\geqslant 0$.', '$n=2n$.', 'Il existe un réel $k$ tel que $n={{m}}k$.'])]),
    [var('t', '0..2'), var('m', '3|5|7')],
    None,
    [LETTRE,
     selon('t', [
         '« Toujours » porte sur **tous** les réels : $' + col('\\text{pour tout réel } x,\\ x^2\\geqslant 0') + '$.'
         ' « $x^2\\geqslant 0$ » seul ne dit pas ce qu\'est $x$, et « il existe » ne dit pas « toujours ».',
         '$n$ est pair s\'il est le double d\'un **entier** : il existe un entier $k$ tel que $' + col('n=2k')
         + '$. Avec un réel $k$, tout nombre conviendrait ($3=2\\times1{,}5$).',
         '$n$ est un multiple de ${{m}}$ s\'il s\'écrit ${{m}}$ fois un **entier** : il existe un entier $k$ tel'
         ' que $' + col('n={{m}}k') + '$.'])],
    [case('0')])

SENS = variation(
    choix('Soit $n$ un entier. Que signifie la proposition « il existe un entier $k$ tel que $n='
          + selon('t', ['2k+1', '{{m}}k', 'k^2']) + '$ » ?',
          [selon('t', ['$n$ est impair.', '$n$ est un multiple de ${{m}}$.', '$n$ est le carré d\'un entier.']),
           selon('t', ['$n$ est pair.', '$n$ est un diviseur de ${{m}}$.', '$n$ est pair.']),
           selon('t', ['$n=1$.', '$n={{m}}$.', '$n$ est le double d\'un entier.']),
           selon('t', ['$n$ est un nombre premier.', '$k$ est un multiple de ${{m}}$.',
                       '$k$ est le carré de $n$.'])]),
    [var('t', '0..2'), var('m', '3|5|7')],
    None,
    [LETTRE,
     selon('t', [
         '$2k$ est pair, donc $2k+1$ est le nombre qui suit un pair : $n$ est ' + '**impair**'
         + ' (par exemple $k=3$ donne $n=7$).',
         '$n$ est ${{m}}$ fois un entier : $n$ est un **multiple de ${{m}}$** (par exemple $k=4$ donne'
         ' $n={{eval:4*(m)}}$).',
         '$n$ est le carré d\'un entier : $n$ est un **carré parfait** (par exemple $k=5$ donne $n=25$).'])],
    [case('0')])

MODELES.append(modele(
    '06-variables', 'Écrire une proposition avec une variable',
    'Traduire « le carré d\'un réel est positif », « n est pair », « n est multiple de m » avec une lettre'
    ' (pièges : lettre non introduite, k réel, « pour tout » et « il existe » échangés) ; lire « il existe'
    ' un entier k tel que n = 2k + 1 »',
    2,
    [TRADUIRE, SENS],
    [spec('Carré positif', 0, {'t': 0, 'm': 3}, '0', 'correct'),
     spec('Erreur : x non introduit', 0, {'t': 0, 'm': 3}, '3', 'incorrect'),
     spec('Erreur : « il existe »', 0, {'t': 0, 'm': 3}, '1', 'incorrect'),
     spec('Pair : k entier', 0, {'t': 1, 'm': 3}, '0', 'correct'),
     spec('Erreur : k réel', 0, {'t': 1, 'm': 3}, '1', 'incorrect'),
     spec('Multiple de 5', 0, {'t': 2, 'm': 5}, '0', 'correct'),
     spec('2k + 1 : impair', 1, {'t': 0, 'm': 3}, '0', 'correct'),
     spec('Erreur : pair', 1, {'t': 0, 'm': 3}, '1', 'incorrect'),
     spec('k² : carré', 1, {'t': 2, 'm': 3}, '0', 'correct')]))

# --- 7. 2-211 : négation ----------------------------------------------------------------------------

NEGATION = ('La **négation** d\'une proposition est vraie exactement quand la proposition est fausse. Ce'
            ' n\'est pas « une autre propriété » : c\'est « ne pas avoir la propriété ».')
REL = ['>', '\\geqslant ', '<', '\\leqslant ']
NEG = ['\\leqslant ', '<', '\\geqslant ', '>']
PIEGE = ['<', '\\leqslant ', '>', '\\geqslant ']
MOT = ['strictement supérieur à', 'supérieur ou égal à', 'strictement inférieur à', 'inférieur ou égal à']

INEGALITE = variation(
    choix('Soit $x$ un réel. Quelle est la négation de la proposition « $x' + selon('r', REL) + '{{a}}$ » ?',
          ['$x' + selon('r', NEG) + '{{a}}$', '$x' + selon('r', PIEGE) + '{{a}}$', '$x\\neq{{a}}$', '$x={{a}}$']),
    [var('r', '0..3'), var('a', '-9..9')],
    None,
    [NEGATION,
     'La proposition est fausse quand $x$ n\'est pas ' + selon('r', MOT) + ' ${{a}}$. Le nombre ${{a}}$ lui-même'
     ' la rend {{if:r==1|vraie|{{if:r==3|vraie|fausse}}}} : il doit donc être {{if:r==1|exclu de|{{if:r==3|exclu'
     ' de|compris dans}}}} la négation.',
     'La négation est $' + col('x' + selon('r', NEG) + '{{a}}') + '$ (et non $x' + selon('r', PIEGE) + '{{a}}$).'],
    [case('0')])

PHRASE = variation(
    choix('Quelle est la négation de la proposition « ' + selon('t', [
        'le triangle $MNP$ est rectangle', 'l\'entier $n$ est pair', 'les droites $(d)$ et $(d\')$ sont'
        ' parallèles']) + ' » ?',
          [selon('t', ['Le triangle $MNP$ n\'est pas rectangle.', 'L\'entier $n$ est impair.',
                       'Les droites $(d)$ et $(d\')$ ne sont pas parallèles.']),
           selon('t', ['Le triangle $MNP$ est isocèle.', 'L\'entier $n$ n\'est pas impair.',
                       'Les droites $(d)$ et $(d\')$ sont perpendiculaires.']),
           selon('t', ['Le triangle $MNP$ est équilatéral.', 'L\'entier $n$ est un multiple de $3$.',
                       'Les droites $(d)$ et $(d\')$ ne sont pas perpendiculaires.']),
           selon('t', ['Aucun triangle n\'est rectangle.', 'L\'entier $n$ est nul.',
                       'Les droites $(d)$ et $(d\')$ sont confondues.'])]),
    [var('t', '0..2')],
    None,
    [NEGATION,
     selon('t', [
         'Le contraire de « est rectangle » est « **n\'est pas** rectangle ». Un triangle isocèle peut être'
         ' rectangle : « isocèle » n\'est pas la négation.',
         'Un entier qui n\'est pas pair est **impair**. « $n$ n\'est pas impair » veut dire « $n$ est pair » :'
         ' c\'est la proposition elle-même.',
         'Le contraire de « sont parallèles » est « **ne sont pas** parallèles » (elles sont alors sécantes).'
         ' Deux droites perpendiculaires ne sont pas parallèles, mais deux droites non parallèles ne sont pas'
         ' toujours perpendiculaires.'])],
    [case('0')])

MODELES.append(modele(
    '07-negation', 'Négation d\'une proposition',
    'Nier x > a, x ⩾ a, x < a, x ⩽ a (piège : x < a pour la négation de x > a) ; nier « MNP est'
    ' rectangle », « n est pair », « (d) et (d\') sont parallèles » (pièges : une autre propriété, double'
    ' négation)',
    1,
    [INEGALITE, PHRASE],
    [spec('Non (x > 3) : x ⩽ 3', 0, {'r': 0, 'a': 3}, '0', 'correct'),
     spec('Erreur : x < 3', 0, {'r': 0, 'a': 3}, '1', 'incorrect'),
     spec('Non (x ⩽ −2) : x > −2', 0, {'r': 3, 'a': -2}, '0', 'correct'),
     spec('Erreur : x ⩾ −2', 0, {'r': 3, 'a': -2}, '1', 'incorrect'),
     spec('N\'est pas rectangle', 1, {'t': 0}, '0', 'correct'),
     spec('Erreur : isocèle', 1, {'t': 0}, '1', 'incorrect'),
     spec('Impair', 1, {'t': 1}, '0', 'correct'),
     spec('Erreur : double négation', 1, {'t': 1}, '1', 'incorrect'),
     spec('Erreur : perpendiculaires', 1, {'t': 2}, '1', 'incorrect')]))

# --- 8. 2-213 : formuler une implication --------------------------------------------------------------

IMPLICATION = ('Dans « **si** $P$, **alors** $Q$ », $P$ est l\'hypothèse et $Q$ la conclusion ; on note'
               ' $P\\Rightarrow Q$ (« $P$ implique $Q$ »). Échanger les deux donne la **réciproque**, qui'
               ' n\'est pas toujours vraie.')

FORMULER = variation(
    choix('On considère la propriété : « ' + selon('t', [
        'les diagonales d\'un rectangle ont la même longueur', 'tout multiple de ${{m}}$ est pair',
        'tout carré est un losange']) + ' ». Quelle phrase l\'écrit sous la forme « si …, alors … » ?',
          [selon('t', ['Si un quadrilatère est un rectangle, alors ses diagonales ont la même longueur.',
                       'Si un entier est un multiple de ${{m}}$, alors il est pair.',
                       'Si un quadrilatère est un carré, alors c\'est un losange.']),
           selon('t', ['Si les diagonales d\'un quadrilatère ont la même longueur, alors c\'est un rectangle.',
                       'Si un entier est pair, alors c\'est un multiple de ${{m}}$.',
                       'Si un quadrilatère est un losange, alors c\'est un carré.']),
           selon('t', ['Si un quadrilatère n\'est pas un rectangle, alors ses diagonales n\'ont pas la même'
                       ' longueur.', 'Si un entier n\'est pas un multiple de ${{m}}$, alors il n\'est pas pair.',
                       'Si un quadrilatère n\'est pas un carré, alors ce n\'est pas un losange.']),
           selon('t', ['Un quadrilatère est un rectangle et ses diagonales ont la même longueur.',
                       'Un entier est pair et multiple de ${{m}}$.',
                       'Un quadrilatère est un carré et un losange.'])]),
    [var('t', '0..2'), var('m', '4|6|10')],
    None,
    [IMPLICATION,
     selon('t', [
         'L\'hypothèse est « être un rectangle », la conclusion « avoir des diagonales de même longueur » :'
         ' **si** un quadrilatère est un rectangle, **alors** ses diagonales ont la même longueur.',
         'L\'hypothèse est « être un multiple de ${{m}}$ », la conclusion « être pair » : **si** un entier est'
         ' un multiple de ${{m}}$, **alors** il est pair.',
         'L\'hypothèse est « être un carré », la conclusion « être un losange » : **si** un quadrilatère est un'
         ' carré, **alors** c\'est un losange.']),
     selon('t', [
         'La réciproque est fausse : un trapèze isocèle a des diagonales de même longueur sans être un'
         ' rectangle.',
         'La réciproque est fausse : $2$ est pair, mais ce n\'est pas un multiple de ${{m}}$.',
         'La réciproque est fausse : un losange dont les angles ne sont pas droits n\'est pas un carré.'])],
    [case('0')])

SENS_VRAI = variation(
    choix(selon('t', ['Soit $x$ un réel.', 'Soit $x$ un réel.', 'Soit $n$ un entier.'])
          + ' Laquelle de ces implications est vraie ?',
          [selon('t', ['Si $x={{a}}$, alors $x^2={{eval:(a)^2}}$.', 'Si $x>{{g}}$, alors $x>{{b}}$.',
                       'Si $n$ est un multiple de $4$, alors $n$ est pair.']),
           selon('t', ['Si $x^2={{eval:(a)^2}}$, alors $x={{a}}$.', 'Si $x>{{b}}$, alors $x>{{g}}$.',
                       'Si $n$ est pair, alors $n$ est un multiple de $4$.']),
           'Les deux sont vraies.', 'Aucune n\'est vraie.']),
    [var('t', '0..2'), var('a', '2..9'), var('b', '-5..5'), var('d', '1..4'), var('g', 'eval:(b)+(d)')],
    None,
    [IMPLICATION,
     selon('t', [
         'Si $x={{a}}$, alors $x^2={{a}}^2={{eval:(a)^2}}$ : $' + col('x={{a}}\\Rightarrow x^2={{eval:(a)^2}}')
         + '$ est vraie. La réciproque est fausse : $x=-{{a}}$ vérifie $x^2={{eval:(a)^2}}$ mais $x\\neq{{a}}$.',
         'Si $x>{{g}}$, comme ${{g}}>{{b}}$, alors $x>{{b}}$ : $' + col('x>{{g}}\\Rightarrow x>{{b}}')
         + '$ est vraie. La réciproque est fausse : $x={{g}}$ vérifie $x>{{b}}$ mais pas $x>{{g}}$.',
         'Si $n=4k$, alors $n=2\\times(2k)$ est pair : la première est vraie. La réciproque est fausse : $6$ est'
         ' pair, mais ce n\'est pas un multiple de $4$.'])],
    [case('0')])

MODELES.append(modele(
    '08-implication', 'Formuler une implication',
    'Écrire une propriété du cours (diagonales du rectangle, multiples, carré et losange) sous la forme'
    ' « si …, alors … » (piège : la réciproque) ; choisir le sens vrai de x = a ⇒ x² = a², x > g ⇒ x > b,'
    ' multiple de 4 ⇒ pair',
    1,
    [FORMULER, SENS_VRAI],
    [spec('Rectangle', 0, {'t': 0, 'm': 4}, '0', 'correct'),
     spec('Erreur : la réciproque', 0, {'t': 0, 'm': 4}, '1', 'incorrect'),
     spec('Multiple de 6', 0, {'t': 1, 'm': 6}, '0', 'correct'),
     spec('Erreur : réciproque, multiple de 6', 0, {'t': 1, 'm': 6}, '1', 'incorrect'),
     spec('Carré, losange', 0, {'t': 2, 'm': 4}, '0', 'correct'),
     spec('x = 3 ⇒ x² = 9', 1, {'t': 0, 'a': 3, 'b': 0, 'd': 2, 'g': 2}, '0', 'correct'),
     spec('Erreur : x² = 9 ⇒ x = 3', 1, {'t': 0, 'a': 3, 'b': 0, 'd': 2, 'g': 2}, '1', 'incorrect'),
     spec('Erreur : les deux', 1, {'t': 0, 'a': 3, 'b': 0, 'd': 2, 'g': 2}, '2', 'incorrect'),
     spec('x > 2 ⇒ x > 0', 1, {'t': 1, 'a': 3, 'b': 0, 'd': 2, 'g': 2}, '0', 'correct'),
     spec('Multiple de 4 ⇒ pair', 1, {'t': 2, 'a': 3, 'b': 0, 'd': 2, 'g': 2}, '0', 'correct')],
    delay=90))

# --- 9. 2-409 : équivalence ---------------------------------------------------------------------------

EQUIV = ('« $P$ **équivaut à** $Q$ » ($P\\Leftrightarrow Q$) veut dire : $P$ implique $Q$ **et** $Q$ implique'
         ' $P$. Pour le montrer, on vérifie les **deux** sens ; un seul contre-exemple suffit à écarter un sens.')
P_TXT = ['$x={{a}}$', '${{c}}x+{{dd}}={{f}}$', '$IJKL$ est un losange', '$x>{{b}}$', '$n$ est pair', '$x>{{b}}$']
Q_TXT = ['$x^2={{eval:(a)^2}}$', '$x={{s}}$', '$IJKL$ est un carré', '$x>{{g}}$', '$n^2$ est pair', '$x<{{g}}$']
REP_EQ = [0, 2, 1, 1, 2, 3]

EQUIVALENCE = variation(
    choix(selon('t', ['Soit $x$ un réel.', 'Soit $x$ un réel.', 'Soit $IJKL$ un quadrilatère.',
                      'Soit $x$ un réel.', 'Soit $n$ un entier.', 'Soit $x$ un réel.'])
          + ' On considère les propositions $P$ : « ' + selon('t', P_TXT) + ' » et $Q$ : « '
          + selon('t', Q_TXT) + ' ». Quelle phrase est juste ?',
          ['$P$ implique $Q$, mais $Q$ n\'implique pas $P$.', '$Q$ implique $P$, mais $P$ n\'implique pas $Q$.',
           '$P$ équivaut à $Q$.', 'Ni $P$ n\'implique $Q$, ni $Q$ n\'implique $P$.'], melanger=False),
    [var('t', '0..5'), var('a', '2..9'), var('c', '2..5'), var('s', '-5..5'), var('dd', '1..9'),
     var('f', 'eval:(c)*(s)+(dd)'), var('b', '-5..5'), var('d', '1..4'), var('g', 'eval:(b)+(d)'),
     var('rep', indic('t', REP_EQ))],
    None,
    [EQUIV,
     selon('t', [
         'Si $x={{a}}$, alors $x^2={{eval:(a)^2}}$ : $P\\Rightarrow Q$. Mais $x=-{{a}}$ vérifie $Q$ sans vérifier'
         ' $P$ : $Q$ n\'implique pas $P$. Donc $' + col('P\\Rightarrow Q') + '$ seulement.',
         '${{c}}x+{{dd}}={{f}}\\Leftrightarrow{{c}}x={{eval:(f)-(dd)}}\\Leftrightarrow x={{s}}$ : chaque étape se'
         ' fait dans les deux sens, donc $' + col('P\\Leftrightarrow Q') + '$.',
         'Un carré est un losange : $Q\\Rightarrow P$. Un losange dont les angles ne sont pas droits n\'est pas'
         ' un carré : $P$ n\'implique pas $Q$. Donc $' + col('Q\\Rightarrow P') + '$ seulement.',
         'Si $x>{{g}}$, comme ${{g}}>{{b}}$, alors $x>{{b}}$ : $Q\\Rightarrow P$. Mais $x={{g}}$ vérifie $P$'
         ' sans vérifier $Q$. Donc $' + col('Q\\Rightarrow P') + '$ seulement.',
         'Si $n=2k$, alors $n^2=2\\times(2k^2)$ est pair : $P\\Rightarrow Q$. Si $n=2k+1$, alors'
         ' $n^2=2\\times(2k^2+2k)+1$ est impair ; donc si $n^2$ est pair, $n$ n\'est pas impair, il est pair :'
         ' $Q\\Rightarrow P$. Donc $' + col('P\\Leftrightarrow Q') + '$.',
         '$x={{eval:(g)+1}}$ vérifie $P$ sans vérifier $Q$ ; $x={{eval:(b)-1}}$ vérifie $Q$ sans vérifier $P$.'
         ' Aucune des deux propositions n\'implique l\'autre.'])],
    [case('{{rep}}')])

SP_EQV = {'t': 0, 'a': 3, 'c': 2, 's': 3, 'dd': 1, 'f': 7, 'b': 1, 'd': 2, 'g': 3, 'rep': 0}
MODELES.append(modele(
    '09-equivalence', 'Implication ou équivalence ?',
    'Relier deux propositions par « implique » ou « équivaut à » : x = 3 et x² = 9, 2x + 1 = 7 et x = 3,'
    ' losange et carré, x > 1 et x > 3, n pair et n² pair, x > 1 et x < 3 (piège : « équivaut » partout)',
    1,
    [EQUIVALENCE],
    [spec('x = 3 et x² = 9 : P ⇒ Q', 0, SP_EQV, '0', 'correct'),
     spec('Erreur : équivalence', 0, SP_EQV, '2', 'incorrect'),
     spec('2x + 1 = 7 et x = 3 : ⇔', 0, dict(SP_EQV, t=1, rep=2), '2', 'correct'),
     spec('Erreur : un seul sens', 0, dict(SP_EQV, t=1, rep=2), '0', 'incorrect'),
     spec('Losange, carré : Q ⇒ P', 0, dict(SP_EQV, t=2, rep=1), '1', 'correct'),
     spec('Erreur : losange ⇒ carré', 0, dict(SP_EQV, t=2, rep=1), '0', 'incorrect'),
     spec('x > 1, x > 3 : Q ⇒ P', 0, dict(SP_EQV, t=3, rep=1), '1', 'correct'),
     spec('n pair, n² pair : ⇔', 0, dict(SP_EQV, t=4, rep=2), '2', 'correct'),
     spec('x > 1, x < 3 : aucune', 0, dict(SP_EQV, t=5, rep=3), '3', 'correct')],
    delay=90))

# --- 10. 2-215 : « pour tout » ------------------------------------------------------------------------

POUR_TOUT = ('Une proposition « **pour tout** … » est vraie si elle est vraie pour **chaque** valeur, ce qui'
             ' se démontre. Elle est fausse dès qu\'**une seule** valeur la met en défaut (un contre-exemple).')
UNIV = ['pour tout réel $x$, $x^2\\geqslant 0$', 'pour tout réel $x$, $x^2\\geqslant x$',
        'pour tout réel $x$, $(x+{{a}})^2=x^2+{{eval:(a)^2}}$',
        'pour tout réel $x$, $(x+{{a}})^2=x^2+{{eval:2*(a)}}x+{{eval:(a)^2}}$',
        'pour tout entier $n$, $n^2+n$ est pair', 'pour tout réel $x$, ${{a}}x\\geqslant x$']

UNIVERSELLE = variation(
    choix('La proposition « ' + selon('t', UNIV) + ' » est-elle vraie ou fausse ?', VRAI_FAUX, melanger=False),
    [var('t', '0..5'), var('a', '2..6'), var('rep', indic('t', [0, 1, 1, 0, 0, 1]))],
    None,
    [POUR_TOUT,
     selon('t', [
         'Un carré est toujours positif ou nul : la proposition est **vraie**.',
         'Pour $x=0{,}5$ : $x^2=0{,}25$ et $0{,}25<0{,}5$. Ce contre-exemple suffit : la proposition est'
         ' **fausse**.',
         'Pour $x=1$ : $(1+{{a}})^2={{eval:(1+(a))^2}}$ mais $1+{{eval:(a)^2}}={{eval:1+(a)^2}}$. La proposition'
         ' est **fausse** (on a oublié le double produit).',
         'C\'est l\'identité $(x+{{a}})^2=x^2+2\\times{{a}}\\times x+{{a}}^2$ : la proposition est **vraie**.',
         '$n^2+n=n(n+1)$ : l\'un des deux entiers consécutifs $n$ et $n+1$ est pair, donc le produit est pair.'
         ' La proposition est **vraie**.',
         'Pour $x=-1$ : ${{a}}\\times(-1)=-{{a}}$ et $-{{a}}<-1$. Ce contre-exemple suffit : la proposition est'
         ' **fausse**.'])],
    [case('{{rep}}')])

EXEMPLES = variation(
    choix('On vérifie la proposition « ' + selon('t', [
        'pour tout entier naturel $n$, $n^2+n+41$ est un nombre premier',
        'pour tout réel $x$, $x^2\\geqslant x$']) + ' » ' + selon('t', [
        'pour $n=0$, $1$, $2$, $3$ et $4$ : on obtient $41$, $43$, $47$, $53$ et $61$, tous premiers.',
        'pour $x=0$, $1$, $2$ et $3$ : elle est vraie à chaque fois.']) + ' Que peut-on conclure ?',
          ['On ne peut rien conclure : des exemples ne prouvent pas une proposition « pour tout ».',
           'La proposition est vraie.', 'La proposition est fausse.']),
    [var('t', '0..1')],
    None,
    [POUR_TOUT,
     'Quelques exemples ne suffisent pas : il faudrait que **toutes** les valeurs conviennent.',
     selon('t', [
         'D\'ailleurs elle est fausse : pour $n=40$, $40^2+40+41=1681=41\\times41$ n\'est pas premier.',
         'D\'ailleurs elle est fausse : pour $x=0{,}5$, $x^2=0{,}25<0{,}5$.'])],
    [case('0')])

SP_U = {'t': 0, 'a': 3, 'rep': 0}
MODELES.append(modele(
    '10-pour-tout', 'Propositions « pour tout »',
    'Dire si « pour tout réel x, x² ⩾ 0 », « x² ⩾ x », « (x + a)² = x² + a² », l\'identité, « n² + n pair »,'
    ' « ax ⩾ x » est vraie ou fausse ; des exemples ne prouvent pas un « pour tout » (n² + n + 41)',
    1,
    [UNIVERSELLE, EXEMPLES],
    [spec('x² ⩾ 0 : vraie', 0, SP_U, '0', 'correct'),
     spec('x² ⩾ x : fausse', 0, dict(SP_U, t=1, rep=1), '1', 'correct'),
     spec('Erreur : x² ⩾ x vraie', 0, dict(SP_U, t=1, rep=1), '0', 'incorrect'),
     spec('(x + 3)² = x² + 9 : fausse', 0, dict(SP_U, t=2, rep=1), '1', 'correct'),
     spec('Identité : vraie', 0, dict(SP_U, t=3, rep=0), '0', 'correct'),
     spec('n² + n pair : vraie', 0, dict(SP_U, t=4, rep=0), '0', 'correct'),
     spec('3x ⩾ x : fausse', 0, dict(SP_U, t=5, rep=1), '1', 'correct'),
     spec('Exemples : rien', 1, {'t': 0}, '0', 'correct'),
     spec('Erreur : exemples, donc vraie', 1, {'t': 0}, '1', 'incorrect'),
     spec('x² ⩾ x vérifiée sur 4 valeurs : rien', 1, {'t': 1}, '0', 'correct')],
    delay=90))

# --- 11. 2-412 : « il existe » ------------------------------------------------------------------------

IL_EXISTE = ('Une proposition « **il existe** … » est vraie dès qu\'**une** valeur convient (un exemple suffit).'
             ' Elle est fausse si **aucune** valeur ne convient.')
EXIST = ['il existe un réel $x$ tel que $x^2=-{{k}}$', 'il existe un réel $x$ tel que $x^2={{k}}$',
         'il existe un entier $n$ tel que $2n={{eval:2*(q)+1}}$',
         'il existe un entier $n$ tel que ${{m}}n={{eval:(m)*(q)}}$', 'il existe un réel $x$ tel que $x^2<x$']

EXISTENTIELLE = variation(
    choix('La proposition « ' + selon('t', EXIST) + ' » est-elle vraie ou fausse ?', VRAI_FAUX, melanger=False),
    [var('t', '0..4'), var('k', '2..9'), var('q', '2..9'), var('m', '3..9'),
     var('rep', indic('t', [1, 0, 1, 0, 0]))],
    None,
    [IL_EXISTE,
     selon('t', [
         'Un carré est toujours positif ou nul : aucun réel n\'a pour carré $-{{k}}$. La proposition est'
         ' **fausse**.',
         '$x=\\sqrt{ {{k}} }$ convient : la proposition est **vraie**.',
         '$2n$ est pair et ${{eval:2*(q)+1}}$ est impair : aucun entier ne convient. La proposition est'
         ' **fausse**.',
         '$n={{q}}$ convient : ${{m}}\\times{{q}}={{eval:(m)*(q)}}$. La proposition est **vraie**.',
         '$x=0{,}5$ convient : $0{,}25<0{,}5$. La proposition est **vraie**.'])],
    [case('{{rep}}')])

DONNER = variation(
    'La proposition « il existe un entier $n$ tel que $n^2={{if:s==1|n|{{if:s==-1|-n|{{s}}n}}}}+{{pr}}$ » est'
    ' vraie. Donne un tel entier.\n\n$n=?$',
    [var('r1', '2..6'), var('r2', '-5..-1'), var('s', 'eval:(r1)+(r2)'), var('pr', 'eval:-(r1)*(r2)')],
    ['s != 0'],
    [IL_EXISTE,
     'On cherche un entier qui convient, en essayant de petites valeurs.',
     'Pour $n={{r1}}$ : $n^2={{eval:(r1)^2}}$ et ${{s}}\\times{{r1}}+{{pr}}'
     '={{eval:(r1)^2}}$ : $' + col('n={{r1}}') + '$ convient. $n={{r2}}$ convient aussi : un seul exemple'
     ' suffit.'],
    [case('{{r1}}', rulesSuffice=True, validationRules=[
        {'type': 'equation_root', 'equation': 'n^2 = ({{s}})*n + {{pr}}', 'variable': 'n'}])])

SP_EX = {'t': 0, 'k': 4, 'q': 3, 'm': 5, 'rep': 1}
SP_DO = {'r1': 3, 'r2': -1, 's': 2, 'pr': 3}
MODELES.append(modele(
    '11-il-existe', 'Propositions « il existe »',
    'Dire si « il existe un réel x tel que x² = −4 », « x² = 4 », « 2n = 7 », « 5n = 15 », « x² < x » est'
    ' vraie ou fausse ; donner un entier n tel que n² = 2n + 3 (toute solution acceptée)',
    2,
    [EXISTENTIELLE, DONNER],
    [spec('x² = −4 : fausse', 0, SP_EX, '1', 'correct'),
     spec('Erreur : x² = −4 vraie', 0, SP_EX, '0', 'incorrect'),
     spec('x² = 4 : vraie', 0, dict(SP_EX, t=1, rep=0), '0', 'correct'),
     spec('2n = 7 : fausse', 0, dict(SP_EX, t=2, rep=1), '1', 'correct'),
     spec('5n = 15 : vraie', 0, dict(SP_EX, t=3, rep=0), '0', 'correct'),
     spec('x² < x : vraie', 0, dict(SP_EX, t=4, rep=0), '0', 'correct'),
     spec('Erreur : x² < x fausse', 0, dict(SP_EX, t=4, rep=0), '1', 'incorrect'),
     spec('n = 3', 1, SP_DO, '3', 'correct'),
     spec('n = −1, l\'autre solution', 1, SP_DO, '-1', 'correct'),
     spec('Erreur : n = 2', 1, SP_DO, '2', 'incorrect'),
     spec('s = 1 : n² = n + 6, n = −2', 1, {'r1': 3, 'r2': -2, 's': 1, 'pr': 6}, '-2', 'correct')]))

os.makedirs(DOSSIER, exist_ok=True)
for nom, m in MODELES:
    with open(os.path.join(DOSSIER, nom + '.json'), 'w', encoding='utf-8') as f:
        json.dump(m, f, ensure_ascii=False, indent='\t')
        f.write('\n')
# Mis en forme comme le pre-commit, pour que le script redonne les fichiers commités
subprocess.run(['pnpm', 'exec', 'prettier', '--write', DOSSIER], check=True,
               stdout=subprocess.DEVNULL)
print(f'{len(MODELES)} modèles écrits dans {DOSSIER}')
