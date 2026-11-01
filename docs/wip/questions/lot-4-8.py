"""Écrit les 6 modèles du lot 8 « Programmes de calcul et fonctions » de la 4e dans
scripts/questions/4-lot-8/.

Phase 0 validée par David le 2026-11-01 (§ 39 du journal `docs/wip/questions-4-progress.md`), un
point par modèle :

| # | Point | Titre                               | Catégorie, niveau                                            |
| 1 | 4-060 | Appliquer un programme de calcul    | Fonctions › Programmes de calcul › Appliquer, 1              |
| 2 | 4-081 | Programme de calcul et lettre       | Fonctions › Programmes de calcul › Appliquer, 2              |
| 3 | 4-061 | Remonter un programme de calcul     | Fonctions › Programmes de calcul › Remonter, 1               |
| 4 | 4-062 | Produire une formule                | Fonctions › Dépendance › Formule, 1                          |
| 5 | 4-063 | Représenter une grandeur            | Fonctions › Dépendance › Graphique, 1                        |
| 6 | 4-064 | Formule, tableau et graphique       | Fonctions › Dépendance › Formule, tableau et graphique, 1    |

Bornes : `cycle4.json`, 4e (060 nombre « simple » ; 061 programme « simple » ; 062, 063, 064, 081 :
notation `P(n)` dans l'énoncé seulement, jamais « image », « antécédent » ni `f : x ↦` ; pas de
double distributivité, qui est de 3e). Le nœud et le tag sont posés par la migration de rangement,
après le `--publier` de David.

Décisions et pièges :
- 4-063 : repère à placer (` ```courbe ` + `placer:`, une case par point, réponse `x;y`), titres
  d'axes ; une variante à choix de graphiques ;
- 4-081 et 4-062 : `form` et `products` coupées, toute écriture égale acceptée ; « développée et
  réduite » exigée par `requiredForm: sum` sur la seule case qui la demande ;
- un nombre négatif dans un calcul du corrigé : variable intermédiaire et `{{if:r<0|(r)|r}}` ;
- choix en case choix (bloc ```choix, ADR 0033), le bon choix écrit en premier (indice 0) ;
- jamais de variable `e` ni `i` dans les `eval`.

    python3 docs/wip/questions/lot-4-8.py scripts/questions/4-lot-8
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


def modele(nom, title, description, theme, domain, subdomain, level, variations, specs,
           delay=60, options=None):
    m = {'title': title, 'description': description, 'grades': ['4'], 'theme': theme,
         'domain': domain, 'subdomain': subdomain, 'level': level, 'delay': delay,
         'status': 'draft'}
    if options:
        m['options'] = options
    m['variations'] = variations
    m['testSpecs'] = specs
    return nom, m


def var(nom, expression):
    return {'name': nom, 'expression': expression}


def variation(statement, variables, answers, steps, conditions=None):
    v = {'statement': statement, 'variables': variables}
    if conditions:
        v['conditions'] = conditions
    if answers is not None:
        v['blanks'] = [a if isinstance(a, dict) else {'expectedAnswer': a} for a in answers]
    v['correction'] = {'steps': steps}
    return v


def col(x, k=0):
    return '\\textcolor{{{color:primary.' + str(k) + '}}}{' + x + '}'


def choix(lignes, melanger=True):
    tete = '' if melanger else 'melanger: non\n'
    return '\n\n```choix\n' + tete + ''.join('- ' + l + '\n' for l in lignes) + '```'


def ev(x):
    return '{{eval:' + x + '}}'


def par(nom):
    """Valeur d'une variable, entre parenthèses si elle est négative (facteur d'un produit)."""
    return '{{if:' + nom + '<0|({{' + nom + '}})|{{' + nom + '}}}}'


def programme(etapes):
    return '\n\n' + ''.join('- ' + e + '\n' for e in etapes)


def tableau(entete, lignes):
    """Tableau de valeurs en LaTeX : `entete` = (nom de la ligne 1, valeurs), lignes idem."""
    cols = len(entete[1])
    tete = '\\begin{array}{|l|' + 'c|' * cols + '} '
    corps = ' \\\\ '.join(n + ' & ' + ' & '.join(vs) for n, vs in [entete] + lignes)
    return '$' + tete + corps + ' \\end{array}$'


X = '\\times'
OPTIONS_EXPRESSION = {'constraints': {'form': 'off', 'products': 'off'}}
MODELES = []

# --- 1. 4-060 : appliquer un programme de calcul à un nombre ----------------------------------

APPLIQUER = ('**Programme de calcul.** On applique les étapes **dans l\'ordre**, chacune au'
             ' résultat de la précédente.')

# 3 étapes : × a, + b, × c ; départ n relatif ; r1 = a·n, r2 = a·n + b
TROIS_VARS = [var('n', '-10..10'), var('a', '2..5'), var('b', '1..9'), var('c', '2..5'),
              var('r1', 'eval:a*n'), var('r2', 'eval:a*n+b')]
TROIS = variation(
    'Voici un programme de calcul :' + programme([
        'choisir un nombre ;', 'le multiplier par ${{a}}$ ;', 'ajouter ${{b}}$ ;',
        'multiplier le résultat par ${{c}}$.'])
    + '\nApplique ce programme au nombre ${{n}}$.\n\nRésultat : $?$',
    TROIS_VARS, [ev('c*(a*n+b)')],
    [APPLIQUER,
     '$$' + par('n') + ' ' + X + ' {{a}} = {{r1}}$$',
     '$${{r1}} + {{b}} = {{r2}}$$',
     '$$' + par('r2') + ' ' + X + ' {{c}} = ' + col(ev('c*(a*n+b)')) + '$$'],
    ['n!=0'])

# Avec un carré : + a, au carré, − b ; r = n + a
CARRE_VARS = [var('n', '-6..6'), var('a', '1..5'), var('b', '1..9'), var('r', 'eval:n+a')]
CARRE = variation(
    'Voici un programme de calcul :' + programme([
        'choisir un nombre ;', 'ajouter ${{a}}$ ;', 'élever le résultat au carré ;',
        'soustraire ${{b}}$.'])
    + '\nApplique ce programme au nombre ${{n}}$.\n\nRésultat : $?$',
    CARRE_VARS, [ev('(n+a)^2-b')],
    [APPLIQUER,
     '$${{n}} + {{a}} = {{r}}$$',
     '$$' + par('r') + '^2 = ' + ev('r^2') + '$$'
     + '{{if:r<0| Le carré d\'un nombre négatif est **positif**.|}}',
     '$$' + ev('r^2') + ' - {{b}} = ' + col(ev('r^2-b')) + '$$'],
    ['n!=0', 'r!=0'])

# Décimal simple : départ m + 0,5 ; × 4, − a, × 3
DECIMAL_VARS = [var('m', '1..5'), var('a', '1..9'), var('q', 'eval:4*m+2-a')]
DECIMAL = variation(
    'Voici un programme de calcul :' + programme([
        'choisir un nombre ;', 'le multiplier par $4$ ;', 'soustraire ${{a}}$ ;',
        'multiplier le résultat par $3$.'])
    + '\nApplique ce programme au nombre $' + ev('(2*m+1)/2;d') + '$.\n\nRésultat : $?$',
    DECIMAL_VARS, [ev('3*(4*m+2-a)')],
    [APPLIQUER,
     '$$' + ev('(2*m+1)/2;d') + ' ' + X + ' 4 = ' + ev('4*m+2') + '$$',
     '$$' + ev('4*m+2') + ' - {{a}} = {{q}}$$',
     '$$' + par('q') + ' ' + X + ' 3 = ' + col(ev('3*q')) + '$$'])

# Comparer : A (× a, + b) et B (+ c, × d) appliqués à n ; ra ≠ rb
COMPARER_VARS = [var('n', '-6..9'), var('a', '2..6'), var('b', '1..9'), var('c', '1..9'),
                 var('d', '2..6'), var('ra', 'eval:a*n+b'), var('rb', 'eval:(n+c)*d'),
                 var('ra1', 'eval:a*n'), var('rb1', 'eval:n+c')]
COMPARER = variation(
    'Voici deux programmes de calcul.\n\n**Programme A** : choisir un nombre ; le multiplier par'
    ' ${{a}}$ ; ajouter ${{b}}$.\n\n**Programme B** : choisir un nombre ; ajouter ${{c}}$ ;'
    ' multiplier le résultat par ${{d}}$.\n\nOn choisit le nombre ${{n}}$ au départ. Quel programme'
    ' donne le plus grand résultat ?'
    + choix(['{{if:ra>rb|Le programme A.|Le programme B.}}',
             '{{if:ra>rb|Le programme B.|Le programme A.}}',
             'Les deux programmes donnent le même résultat.']),
    COMPARER_VARS, ['0'],
    [APPLIQUER,
     'Programme A : $' + par('n') + ' ' + X + ' {{a}} = {{ra1}}$, puis ${{ra1}} + {{b}} = '
     + col('{{ra}}', 1) + '$.',
     'Programme B : ${{n}} + {{c}} = {{rb1}}$, puis $' + par('rb1') + ' ' + X + ' {{d}} = '
     + col('{{rb}}', 2) + '$.',
     '{{if:ra>rb|${{ra}} > {{rb}}$ : ' + col('\\text{le programme A}')
     + '.|${{rb}} > {{ra}}$ : ' + col('\\text{le programme B}') + '.}}'],
    ['ra!=rb', 'n!=0'])

MODELES.append(modele(
    '01-appliquer-un-programme-de-calcul', 'Appliquer un programme de calcul',
    'Appliquer un programme de calcul à plusieurs étapes à un nombre donné : entier relatif,'
    ' décimal simple, avec un carré ; comparer deux programmes',
    'Fonctions', 'Programmes de calcul', 'Appliquer', 1,
    [TROIS, CARRE, DECIMAL, COMPARER],
    [spec('(−3 × 4 + 5) × 2 = −14', 0, {'n': -3, 'a': 4, 'b': 5, 'c': 2}, '-14', 'correct'),
     spec('Erreur : dernière étape oubliée', 0, {'n': -3, 'a': 4, 'b': 5, 'c': 2}, '-7',
          'incorrect'),
     spec('Erreur : signe', 0, {'n': -3, 'a': 4, 'b': 5, 'c': 2}, '14', 'incorrect'),
     spec('(−5 + 2)² − 4 = 5', 1, {'n': -5, 'a': 2, 'b': 4}, '5', 'correct'),
     spec('Erreur : −3² = −9', 1, {'n': -5, 'a': 2, 'b': 4}, '-13', 'incorrect'),
     spec('(2,5 × 4 − 3) × 3 = 21', 2, {'m': 2, 'a': 3}, '21', 'correct'),
     spec('Erreur : 2,5 × 4 − 3 × 3 = 1', 2, {'m': 2, 'a': 3}, '1', 'incorrect'),
     spec('Le bon programme', 3, {'n': 2, 'a': 5, 'b': 1, 'c': 1, 'd': 3}, '0', 'correct'),
     spec('Erreur : l\'autre', 3, {'n': 2, 'a': 5, 'b': 1, 'c': 1, 'd': 3}, '1', 'incorrect'),
     spec('Erreur : le même', 3, {'n': 2, 'a': 5, 'b': 1, 'c': 1, 'd': 3}, '2', 'incorrect')],
    delay=90))

# --- 2. 4-081 : programme de calcul appliqué à une lettre ------------------------------------

LETTRE = ('**Programme de calcul et lettre.** On part de $x$ et on écrit chaque étape comme une'
          ' expression ; une multiplication qui suit une addition demande des **parenthèses**.')
PROG_ABC = programme(['choisir un nombre $x$ ;', 'le multiplier par ${{a}}$ ;',
                      'ajouter ${{b}}$ ;', 'multiplier le résultat par ${{c}}$.'])
ABC = [var('a', '2..6'), var('b', '1..9'), var('c', '2..6')]
CHAINE_ABC = '$x$ → ${{a}}x$ → ${{a}}x + {{b}}$ → ${{c}}({{a}}x + {{b}})$'

EXPRESSION = variation(
    'Voici un programme de calcul :' + PROG_ABC
    + '\nÉcris le résultat en fonction de $x$.\n\nRésultat : $?$',
    ABC, ['{{c}}({{a}}x+{{b}})'],
    [LETTRE, CHAINE_ABC,
     'Résultat : $' + col('{{c}}({{a}}x + {{b}})') + '$, qu\'on peut aussi écrire $'
     + ev('a*c') + 'x + ' + ev('b*c') + '$.'])

DEVELOPPEE = variation(
    'Voici un programme de calcul :' + PROG_ABC
    + '\nÉcris le résultat en fonction de $x$, sous forme **développée et réduite**.\n\n'
    'Résultat : $?$',
    ABC, [{'expectedAnswer': ev('a*c') + 'x+' + ev('b*c'), 'requiredForm': 'sum'}],
    [LETTRE, CHAINE_ABC,
     'On développe (distributivité) :',
     '$${{c}}({{a}}x + {{b}}) = {{c}} ' + X + ' {{a}}x + {{c}} ' + X + ' {{b}} = '
     + col(ev('a*c') + 'x + ' + ev('b*c')) + '$$'])

TRADUIRE = variation(
    'Voici un programme de calcul :' + PROG_ABC
    + '\nQuelle expression donne le résultat quand on choisit le nombre $x$ ?'
    + choix(['${{c}}({{a}}x + {{b}})$', '$' + ev('c*a') + 'x + {{b}}$',
             '${{a}}x + ' + ev('b*c') + '$', '${{a}}(x + {{b}}) ' + X + ' {{c}}$']),
    ABC, ['0'],
    [LETTRE, CHAINE_ABC,
     'La dernière étape multiplie **tout** le résultat ${{a}}x + {{b}}$ par ${{c}}$ : $'
     + col('{{c}}({{a}}x + {{b}})') + '$.'])

# + a, × b, − le nombre de départ → b(x + a) − x = (b − 1)x + ab
MOINS_DEPART = variation(
    'Voici un programme de calcul :' + programme([
        'choisir un nombre $x$ ;', 'ajouter ${{a}}$ ;', 'multiplier le résultat par ${{b}}$ ;',
        'soustraire le nombre choisi au départ.'])
    + '\nÉcris le résultat en fonction de $x$, sous forme **développée et réduite**.\n\n'
    'Résultat : $?$',
    [var('a', '1..9'), var('b', '3..6')],
    [{'expectedAnswer': ev('b-1') + 'x+' + ev('a*b'), 'requiredForm': 'sum'}],
    [LETTRE,
     '$x$ → $x + {{a}}$ → ${{b}}(x + {{a}})$ → ${{b}}(x + {{a}}) - x$',
     '$${{b}}(x + {{a}}) - x = {{b}}x + ' + ev('a*b') + ' - x = '
     + col(ev('b-1') + 'x + ' + ev('a*b')) + '$$'])

MODELES.append(modele(
    '02-programme-de-calcul-et-lettre', 'Programme de calcul et lettre',
    'Appliquer un programme de calcul à plusieurs étapes à une lettre : écrire l\'expression'
    ' obtenue en fonction de x, puis la développer et la réduire',
    'Fonctions', 'Programmes de calcul', 'Appliquer', 2,
    [EXPRESSION, DEVELOPPEE, TRADUIRE, MOINS_DEPART],
    [spec('3(2x + 5)', 0, {'a': 2, 'b': 5, 'c': 3}, '3(2x+5)', 'correct'),
     spec('Développée : 6x + 15', 0, {'a': 2, 'b': 5, 'c': 3}, '6x+15', 'correct'),
     spec('Erreur : 6x + 5 (parenthèses oubliées)', 0, {'a': 2, 'b': 5, 'c': 3}, '6x+5',
          'incorrect'),
     spec('6x + 15', 1, {'a': 2, 'b': 5, 'c': 3}, '6x+15', 'correct'),
     spec('Forme refusée : 3(2x + 5)', 1, {'a': 2, 'b': 5, 'c': 3}, '3(2x+5)', 'bad_form',
          ['form']),
     spec('Erreur : 6x + 5', 1, {'a': 2, 'b': 5, 'c': 3}, '6x+5', 'incorrect'),
     spec('c(ax + b)', 2, {'a': 2, 'b': 5, 'c': 3}, '0', 'correct'),
     spec('Erreur : cax + b', 2, {'a': 2, 'b': 5, 'c': 3}, '1', 'incorrect'),
     spec('3(x + 4) − x = 2x + 12', 3, {'a': 4, 'b': 3}, '2x+12', 'correct'),
     spec('Erreur : 2x + 4 (a × b oublié)', 3, {'a': 4, 'b': 3}, '2x+4',
          'incorrect'),
     spec('Erreur : 3x + 12', 3, {'a': 4, 'b': 3}, '3x+12', 'incorrect')],
    delay=90, options=OPTIONS_EXPRESSION))

# --- 3. 4-061 : remonter un programme de calcul ---------------------------------------------

REMONTER = ('**Remonter un programme.** On part du résultat et on fait les étapes **à l\'envers**,'
            ' en partant de la dernière, chacune remplacée par l\'opération inverse.')

# × a, + b ; départ s tiré d'abord, r = a·s + b
DEUX_VARS = [var('s', '-9..9'), var('a', '2..9'), var('b', '1..20'), var('r', 'eval:a*s+b'),
             var('t', 'eval:a*s')]
DEUX = variation(
    'Voici un programme de calcul :' + programme([
        'choisir un nombre ;', 'le multiplier par ${{a}}$ ;', 'ajouter ${{b}}$.'])
    + '\nOn obtient ${{r}}$. Quel nombre a-t-on choisi au départ ?\n\nLe nombre choisi est $?$.',
    DEUX_VARS, ['{{s}}'],
    [REMONTER,
     'La dernière étape ajoute ${{b}}$ : on **soustrait** ${{b}}$. $${{r}} - {{b}} = {{t}}$$',
     'L\'étape d\'avant multiplie par ${{a}}$ : on **divise** par ${{a}}$. $${{t}} \\div {{a}} = '
     + col('{{s}}') + '$$',
     'Vérification : $' + par('s') + ' ' + X + ' {{a}} + {{b}} = {{r}}$.'],
    ['s!=0'])

# + a, × b, − c ; r = b(s + a) − c
TROIS_R_VARS = [var('s', '-9..9'), var('a', '1..9'), var('b', '2..5'), var('c', '1..20'),
                var('u', 'eval:s+a'), var('v', 'eval:b*(s+a)'), var('r', 'eval:b*(s+a)-c')]
TROIS_R = variation(
    'Voici un programme de calcul :' + programme([
        'choisir un nombre ;', 'ajouter ${{a}}$ ;', 'multiplier le résultat par ${{b}}$ ;',
        'soustraire ${{c}}$.'])
    + '\nOn obtient ${{r}}$. Quel nombre a-t-on choisi au départ ?\n\nLe nombre choisi est $?$.',
    TROIS_R_VARS, ['{{s}}'],
    [REMONTER,
     'On annule « soustraire ${{c}}$ » : $${{r}} + {{c}} = {{v}}$$',
     'On annule « multiplier par ${{b}}$ » : $${{v}} \\div {{b}} = {{u}}$$',
     'On annule « ajouter ${{a}}$ » : $${{u}} - {{a}} = ' + col('{{s}}') + '$$'],
    ['s!=0', 'u!=0'])

PREMIERE = variation(
    'Voici un programme de calcul :' + programme([
        'choisir un nombre ;', 'le multiplier par ${{a}}$ ;', 'ajouter ${{b}}$.'])
    + '\nOn connaît le résultat et on cherche le nombre de départ. Pour remonter le programme,'
    ' que faut-il faire **en premier** ?'
    + choix(['Soustraire ${{b}}$ au résultat.', 'Diviser le résultat par ${{a}}$.',
             'Ajouter ${{b}}$ au résultat.', 'Multiplier le résultat par ${{a}}$.']),
    [var('a', '2..9'), var('b', '1..20')], ['0'],
    [REMONTER,
     'La **dernière** étape est « ajouter ${{b}}$ » : on l\'annule en premier, en '
     + col('\\text{soustrayant } {{b}}') + '.',
     'Ensuite seulement, on divise par ${{a}}$.'],
    ['a!=b'])

# ÷ a, − b ; départ s = a·t, r = t − b
DIVISION_VARS = [var('t', '-9..9'), var('a', '2..6'), var('b', '1..12'), var('s', 'eval:a*t'),
                 var('r', 'eval:t-b')]
DIVISION = variation(
    'Léa choisit un nombre, le **divise** par ${{a}}$, puis soustrait ${{b}}$ au résultat. Elle'
    ' trouve ${{r}}$.\n\nQuel nombre Léa a-t-elle choisi ?\n\nLe nombre choisi est $?$.',
    DIVISION_VARS, ['{{s}}'],
    [REMONTER,
     'On annule « soustraire ${{b}}$ » : $${{r}} + {{b}} = {{t}}$$',
     'On annule « diviser par ${{a}}$ » en **multipliant** par ${{a}}$ : $$' + par('t') + ' '
     + X + ' {{a}} = ' + col('{{s}}') + '$$'],
    ['t!=0'])

MODELES.append(modele(
    '03-remonter-un-programme-de-calcul', 'Remonter un programme de calcul',
    'Retrouver le nombre de départ d\'un programme de calcul simple en le remontant : opérations'
    ' inverses, de la dernière étape à la première',
    'Fonctions', 'Programmes de calcul', 'Remonter', 1,
    [DEUX, TROIS_R, PREMIERE, DIVISION],
    [spec('3 × s + 5 = 17 → 4', 0, {'s': 4, 'a': 3, 'b': 5}, '4', 'correct'),
     spec('Erreur : 17 ÷ 3 − 5', 0, {'s': 4, 'a': 3, 'b': 5}, '\\frac{2}{3}', 'incorrect'),
     spec('Erreur : 17 × 3 + 5 (sans inverser)', 0, {'s': 4, 'a': 3, 'b': 5}, '56',
          'incorrect'),
     spec('2(s + 3) − 4 = 6 → 2', 1, {'s': 2, 'a': 3, 'b': 2, 'c': 4}, '2', 'correct'),
     spec('Erreur : ordre direct', 1, {'s': 2, 'a': 3, 'b': 2, 'c': 4}, '1', 'incorrect'),
     spec('Soustraire b', 2, {'a': 3, 'b': 5}, '0', 'correct'),
     spec('Erreur : diviser d\'abord', 2, {'a': 3, 'b': 5}, '1', 'incorrect'),
     spec('s ÷ 4 − 3 = −1 → 8', 3, {'t': 2, 'a': 4, 'b': 3}, '8', 'correct'),
     spec('Erreur : divisé au lieu de multiplié', 3, {'t': 2, 'a': 4, 'b': 3}, '\\frac{1}{2}',
          'incorrect')],
    delay=90))

# --- 4. 4-062 : produire une formule ---------------------------------------------------------

FORMULE = ('**Formule.** On écrit le calcul qu\'on ferait avec un nombre, en remplaçant ce nombre'
           ' par la lettre.')

TAXI = variation(
    'Un taxi fait payer ${{b}}~\\unit{€}$ de prise en charge, puis ${{a}}~\\unit{€}$ par kilomètre.'
    ' On note $P(d)$ le prix, en euros, d\'une course de $d$ kilomètres.\n\nExprime $P(d)$ en'
    ' fonction de $d$.\n\n$P(d) = ?$',
    [var('a', '2..4'), var('b', '3..8')], ['{{b}}+{{a}}d'],
    [FORMULE,
     'Pour $10~\\unit{km}$, on paierait ${{b}} + {{a}} ' + X + ' 10$. Pour $d$ kilomètres :',
     '$$P(d) = ' + col('{{b}} + {{a}}d') + '$$'])

RECTANGLE_ENONCE = ('Un rectangle a pour largeur $x$ centimètres ; sa longueur mesure ${{a}}$'
                    ' centimètres de plus que sa largeur.')
AIRE = variation(
    RECTANGLE_ENONCE + '\n\nOn note $A(x)$ son aire, en $\\unit{cm^2}$. Exprime $A(x)$ en'
    ' fonction de $x$.\n\n$A(x) = ?$',
    [var('a', '2..9')], ['x(x+{{a}})'],
    [FORMULE,
     'La longueur mesure $x + {{a}}$. Aire = largeur × longueur :',
     '$$A(x) = ' + col('x(x + {{a}})') + '$$',
     'Écriture développée, juste aussi : $x^2 + {{a}}x$.'])

PERIMETRE = variation(
    RECTANGLE_ENONCE + '\n\nOn note $p(x)$ son périmètre, en centimètres. Exprime $p(x)$ en'
    ' fonction de $x$.\n\n$p(x) = ?$',
    [var('a', '2..9')], ['4x+' + ev('2*a')],
    [FORMULE,
     'Le périmètre est la somme des quatre côtés : deux largeurs $x$ et deux longueurs $x + {{a}}$.',
     '$$p(x) = 2x + 2(x + {{a}}) = ' + col('4x + ' + ev('2*a')) + '$$'])

RESERVOIR = variation(
    'Un réservoir contient ${{v}}$ litres d\'eau. Il se vide de ${{a}}$ litres par minute.'
    ' On note $V(t)$ le volume d\'eau, en litres, qui reste au bout de $t$ minutes.\n\nExprime'
    ' $V(t)$ en fonction de $t$.\n\n$V(t) = ?$',
    [var('k', '5..20'), var('v', 'eval:10*k'), var('a', '2..9')], ['{{v}}-{{a}}t'],
    [FORMULE,
     'En $t$ minutes, il part ${{a}} ' + X + ' t$ litres, qu\'on retire des ${{v}}$ litres du'
     ' départ :',
     '$$V(t) = ' + col('{{v}} - {{a}}t') + '$$'])

PLACES = variation(
    'Au cinéma, une place coûte ${{a}}~\\unit{€}$, et on paie ${{b}}~\\unit{€}$ de frais de'
    ' réservation, une seule fois.\n\nQuelle formule donne le prix $P(n)$, en euros, de $n$'
    ' places ?'
    + choix(['$P(n) = {{a}}n + {{b}}$', '$P(n) = ' + ev('a+b') + 'n$',
             '$P(n) = {{a}} + {{b}}n$', '$P(n) = ' + ev('a*b') + 'n$']),
    [var('a', '6..12'), var('b', '1..4')], ['0'],
    [FORMULE,
     '$n$ places coûtent ${{a}}n$ euros ; on ajoute **une fois** les frais :',
     '$$P(n) = ' + col('{{a}}n + {{b}}') + '$$'])

MODELES.append(modele(
    '04-produire-une-formule', 'Produire une formule',
    'Produire une formule littérale qui exprime une grandeur en fonction d\'une autre : prix d\'une'
    ' course, aire et périmètre d\'un rectangle, volume d\'un réservoir',
    'Fonctions', 'Dépendance', 'Formule', 1,
    [TAXI, AIRE, PERIMETRE, RESERVOIR, PLACES],
    [spec('4 + 2d', 0, {'a': 2, 'b': 4}, '4+2d', 'correct'),
     spec('Autre ordre : 2d + 4', 0, {'a': 2, 'b': 4}, '2d+4', 'correct'),
     spec('Erreur : (4 + 2)d', 0, {'a': 2, 'b': 4}, '6d', 'incorrect'),
     spec('x(x + 3)', 1, {'a': 3}, 'x(x+3)', 'correct'),
     spec('Développée : x² + 3x', 1, {'a': 3}, 'x^2+3x', 'correct'),
     spec('Erreur : x + 3x', 1, {'a': 3}, 'x+3x', 'incorrect'),
     spec('4x + 6', 2, {'a': 3}, '4x+6', 'correct'),
     spec('Autre écriture : 2(2x + 3)', 2, {'a': 3}, '2(2x+3)', 'correct'),
     spec('Erreur : 2x + 3', 2, {'a': 3}, '2x+3', 'incorrect'),
     spec('120 − 4t', 3, {'k': 12, 'v': 120, 'a': 4}, '120-4t', 'correct'),
     spec('Erreur : 120 + 4t', 3, {'k': 12, 'v': 120, 'a': 4}, '120+4t', 'incorrect'),
     spec('an + b', 4, {'a': 8, 'b': 2}, '0', 'correct'),
     spec('Erreur : (a + b)n', 4, {'a': 8, 'b': 2}, '1', 'incorrect')],
    delay=90, options=OPTIONS_EXPRESSION))

# --- 5. 4-063 : représenter une grandeur par un graphique -----------------------------------

GRAPHIQUE = ('**Représenter une grandeur.** Chaque couple de valeurs (grandeur de départ ;'
             ' grandeur obtenue) donne un point : la première se lit sur l\'axe horizontal, la'
             ' seconde sur l\'axe vertical.')


def repere(xmin, xmax, ymin, ymax, grille, axes, placer=None, courbes=(), description=''):
    lignes = ['x: ' + xmin + ' ; ' + xmax, 'y: ' + ymin + ' ; ' + ymax, 'grille: ' + grille,
              'axes: ' + axes]
    lignes += list(courbes)
    if placer:
        lignes.append('placer: ' + placer)
    lignes.append('taille: moyenne')
    if description:
        lignes.append('description: ' + description)
    return '```courbe\n' + '\n'.join(lignes) + '\n```'


PRIX_AXES = 'x = Nombre de places ; y = Prix (€)'
POINTS_PRIX = ('A=(0 ; {{b}}) ; B=(1 ; ' + ev('a+b') + ') ; C=(2 ; ' + ev('2*a+b') + ') ; D=(3 ; '
               + ev('3*a+b') + ')')
PRIX_VARS = [var('a', '1..3'), var('b', '1..4')]

PLACER_FORMULE = variation(
    'Le prix, en euros, de $n$ places de bowling est $P(n) = {{a}}n + {{b}}$.\n\nPlace les points'
    ' A, B, C et D du graphique qui représente le prix en fonction du nombre de places, pour $n ='
    ' 0$, $1$, $2$ et $3$.\n\n'
    + repere('-1', '5', '-1', ev('3*a+b+2'), '1 ; 1', PRIX_AXES, POINTS_PRIX,
             description='Repère gradué de 1 en 1 : nombre de places en abscisse, prix en'
             ' ordonnée.'),
    PRIX_VARS, None,
    [GRAPHIQUE,
     tableau(('n', ['0', '1', '2', '3']),
             [('P(n)', ['{{b}}', ev('a+b'), ev('2*a+b'), ev('3*a+b')])]),
     'Points : $' + col('A(0 ; {{b}})') + '$, $' + col('B(1 ; ' + ev('a+b') + ')') + '$, $'
     + col('C(2 ; ' + ev('2*a+b') + ')') + '$, $' + col('D(3 ; ' + ev('3*a+b') + ')') + '$.',
     'Les quatre points sont **alignés** : le prix augmente de ${{a}}~\\unit{€}$ à chaque place.'])

VELO_AXES = 'x = Durée (h) ; y = Distance (km)'
PLACER_TABLEAU = variation(
    'Un cycliste roule à vitesse constante. Le tableau donne la distance $d(t)$ parcourue, en'
    ' kilomètres, au bout de $t$ heures.\n\n'
    + tableau(('t', ['1', '2', '3', '4']),
              [('d(t)', ['{{v}}', ev('2*v'), ev('3*v'), ev('4*v')])])
    + '\n\nPlace les points A, B, C et D qui représentent ce tableau.\n\n'
    + repere('-1', '5', '-5', ev('4*v+10'), '1 ; 5', VELO_AXES,
             'A=(1 ; {{v}}) ; B=(2 ; ' + ev('2*v') + ') ; C=(3 ; ' + ev('3*v') + ') ; D=(4 ; '
             + ev('4*v') + ')',
             description='Repère : durée en abscisse, de 1 en 1 ; distance en ordonnée, de 5'
             ' en 5.'),
    [var('v', '10|15|20')], None,
    [GRAPHIQUE,
     'Chaque colonne du tableau donne un point : $' + col('A(1 ; {{v}})') + '$, $'
     + col('B(2 ; ' + ev('2*v') + ')') + '$, $' + col('C(3 ; ' + ev('3*v') + ')') + '$, $'
     + col('D(4 ; ' + ev('4*v') + ')') + '$.',
     'L\'ordonnée se lit avec le pas de l\'axe vertical : un carreau vaut $5~\\unit{km}$.'])

CARRE_AXES = 'x = Côté (cm) ; y = Aire (cm²)'
PLACER_CARRE = variation(
    'L\'aire d\'un carré de côté $c$ centimètres est $A(c) = c^2$, en $\\unit{cm^2}$.\n\nPlace les'
    ' points A, B, C et D qui représentent l\'aire en fonction du côté, pour $c = 0$, $1$, $2$'
    ' et $3$.\n\n'
    + repere('-1', '5', '-1', '11', '1 ; 1', CARRE_AXES,
             'A=(0 ; 0) ; B=(1 ; 1) ; C=(2 ; 4) ; D=(3 ; 9)',
             description='Repère gradué de 1 en 1 : côté en abscisse, aire en ordonnée.'),
    [], None,
    [GRAPHIQUE,
     tableau(('c', ['0', '1', '2', '3']), [('A(c)', ['0', '1', '4', '9'])]),
     'Points : $' + col('A(0 ; 0)') + '$, $' + col('B(1 ; 1)') + '$, $' + col('C(2 ; 4)')
     + '$, $' + col('D(3 ; 9)') + '$.',
     'Ces points ne sont **pas alignés** : l\'aire n\'augmente pas de la même quantité à chaque'
     ' centimètre ($1$, puis $3$, puis $5$).'])

YMAX_CHOIX = ev('max(5*a+b,5*b+a)+2')


def droite(formule, description):
    return ('```courbe\n  x: -1 ; 6\n  y: -1 ; ' + YMAX_CHOIX + '\n  grille: 1 ; 2\n  axes: '
            + PRIX_AXES + '\n  f(x) = ' + formule + ' sur [0 ; 5]   bleu\n  taille: petite\n'
            '  description: ' + description + '\n  ```')


QUEL_GRAPHIQUE = variation(
    'Le prix, en euros, de $n$ places de bowling est $P(n) = {{a}}n + {{b}}$.\n\nQuel graphique'
    ' représente le prix en fonction du nombre de places ?\n\n````choix\n'
    + '- ' + droite('{{a}}*x+{{b}}', 'Droite qui part de 0 ; {{b}} et monte de {{a}} par place.')
    + '\n- ' + droite('{{b}}*x+{{a}}', 'Droite qui part de 0 ; {{a}} et monte de {{b}} par place.')
    + '\n- ' + droite('{{a}}*x', 'Droite qui part de l\'origine et monte de {{a}} par place.')
    + '\n- ' + droite(ev('5*a+b') + '-{{a}}*x',
                      'Droite qui part de 0 ; ' + ev('5*a+b') + ' et descend de {{a}} par place.')
    + '\n````',
    [var('a', '1..4'), var('b', '2..6')], ['0'],
    [GRAPHIQUE,
     'Pour $n = 0$, $P(0) = {{b}}$ : le graphique passe par le point $' + col('(0 ; {{b}})') + '$.',
     'À chaque place de plus, le prix augmente de ${{a}}~\\unit{€}$ : la droite **monte** de'
     ' ${{a}}$ par place. Par exemple $P(1) = ' + ev('a+b') + '$.'],
    ['a!=b'])

MODELES.append(modele(
    '05-representer-une-grandeur', 'Représenter une grandeur par un graphique',
    'Représenter une grandeur en fonction d\'une autre par un graphique : placer les points'
    ' donnés par une formule ou un tableau de valeurs, choisir le bon graphique',
    'Fonctions', 'Dépendance', 'Graphique', 1,
    [PLACER_FORMULE, PLACER_TABLEAU, PLACER_CARRE, QUEL_GRAPHIQUE],
    [spec('Les 4 points', 0, {'a': 2, 'b': 3}, ['0;3', '1;5', '2;7', '3;9'], 'correct'),
     spec('Erreur : abscisse et ordonnée échangées pour B', 0, {'a': 2, 'b': 3},
          ['0;3', '5;1', '2;7', '3;9'], 'incorrect'),
     spec('Erreur : sans les frais (P = 2n)', 0, {'a': 2, 'b': 3},
          ['0;0', '1;2', '2;4', '3;6'], 'incorrect'),
     spec('Les 4 points', 1, {'v': 15}, ['1;15', '2;30', '3;45', '4;60'], 'correct'),
     spec('Erreur : un carreau lu pour 1 km', 1, {'v': 15}, ['1;3', '2;6', '3;9', '4;12'],
          'incorrect'),
     spec('Les 4 points', 2, {}, ['0;0', '1;1', '2;4', '3;9'], 'correct'),
     spec('Erreur : 2c au lieu de c²', 2, {}, ['0;0', '1;2', '2;4', '3;6'], 'incorrect'),
     spec('La bonne droite', 3, {'a': 2, 'b': 3}, '0', 'correct'),
     spec('Erreur : pente et départ échangés', 3, {'a': 2, 'b': 3}, '1', 'incorrect'),
     spec('Erreur : par l\'origine', 3, {'a': 2, 'b': 3}, '2', 'incorrect')],
    delay=120))

# --- 6. 4-064 : formule, tableau et graphique ------------------------------------------------

TROIS_FORMES = ('**Trois façons de dire la même chose.** Une formule, un tableau de valeurs et un'
                ' graphique traduisent tous comment une grandeur **dépend** d\'une autre.')

LOCATION = variation(
    'La location d\'un vélo coûte $P(h) = {{a}}h + {{b}}$ euros pour $h$ heures.\n\nComplète le'
    ' tableau de valeurs.\n\n'
    + tableau(('h', ['1', '{{h1}}', '{{h2}}']), [('P(h)', [ev('a+b'), '?', '?'])]),
    [var('a', '2..5'), var('b', '2..9'), var('h1', '2..4'), var('h2', '5..8')],
    [ev('a*h1+b'), ev('a*h2+b')],
    [TROIS_FORMES,
     'On remplace $h$ par chaque valeur dans la formule :',
     '$$P({{h1}}) = {{a}} ' + X + ' {{h1}} + {{b}} = ' + col(ev('a*h1+b')) + '$$',
     '$$P({{h2}}) = {{a}} ' + X + ' {{h2}} + {{b}} = ' + col(ev('a*h2+b')) + '$$'])

CUVE_AXES = 'x = Temps (min) ; y = Volume (L)'
LIRE = variation(
    'Le graphique représente le volume d\'eau $V(t)$, en litres, contenu dans une cuve au bout de'
    ' $t$ minutes.\n\n'
    + repere('-1', '6', '-1', ev('5*a+b+2'), '1 ; 1', CUVE_AXES,
             courbes=['f(x) = {{a}}*x+{{b}} sur [0 ; 5]   bleu'],
             description='Droite qui monte : temps en abscisse, volume en ordonnée, repère'
             ' gradué de 1 en 1.')
    + '\n\nQuel volume d\'eau la cuve contient-elle au bout de ${{k}}$ minutes ?\n\n'
    '$V({{k}}) = ?~\\unit{L}$',
    [var('a', '1..3'), var('b', '1..5'), var('k', '1..4')], [ev('a*k+b')],
    [TROIS_FORMES,
     'On part de ${{k}}$ sur l\'axe horizontal (le temps), on monte jusqu\'à la droite, puis on'
     ' lit la valeur sur l\'axe vertical (le volume).',
     '$$V({{k}}) = ' + col(ev('a*k+b')) + '~\\unit{L}$$'])

CAHIERS_TABLEAU = tableau(('n', ['1', '2', '3', '4']),
                          [('P(n)', [ev('a+b'), ev('2*a+b'), ev('3*a+b'), ev('4*a+b')])])
QUELLE_FORMULE = variation(
    'Le tableau donne le prix $P(n)$, en euros, d\'une commande de $n$ cahiers, livraison'
    ' comprise.\n\n' + CAHIERS_TABLEAU + '\n\nQuelle formule donne ce prix ?'
    + choix(['$P(n) = {{a}}n + {{b}}$', '$P(n) = {{b}}n + {{a}}$', '$P(n) = ' + ev('a+b') + 'n$',
             '$P(n) = n + ' + ev('a+b-1') + '$']),
    [var('a', '2..5'), var('b', '1..6')], ['0'],
    [TROIS_FORMES,
     'Le prix augmente de ${{a}}~\\unit{€}$ par cahier : il y a ${{a}}n$ dans la formule.',
     'Pour $n = 1$ : ${{a}} + {{b}} = ' + ev('a+b') + '$ ; on vérifie les autres colonnes.',
     '$$' + col('P(n) = {{a}}n + {{b}}') + '$$'],
    ['a!=b', 'a!=1'])


def ligne_tableau(valeurs):
    return tableau(('n', ['1', '2', '3']), [('P(n)', valeurs)])


QUEL_TABLEAU = variation(
    'Le prix, en euros, de $n$ entrées à la piscine est $P(n) = {{a}}n + {{b}}$.\n\nQuel tableau'
    ' de valeurs correspond à cette formule ?'
    + choix([ligne_tableau([ev('a+b'), ev('2*a+b'), ev('3*a+b')]),
             ligne_tableau([ev('b+a'), ev('2*b+a'), ev('3*b+a')]),
             ligne_tableau(['{{a}}', ev('2*a'), ev('3*a')]),
             ligne_tableau([ev('a+b'), ev('2*(a+b)'), ev('3*(a+b)')])]),
    [var('a', '2..6'), var('b', '1..5')], ['0'],
    [TROIS_FORMES,
     'On calcule avec la formule : $P(1) = ' + ev('a+b') + '$, $P(2) = ' + ev('2*a+b')
     + '$, $P(3) = ' + ev('3*a+b') + '$.',
     ligne_tableau([col(ev('a+b')), col(ev('2*a+b')), col(ev('3*a+b'))])],
    ['a!=b'])

TEMPERATURE_AXES = 'x = Temps (min) ; y = Température (°C)'
SENS = variation(
    'Le graphique représente la température d\'un liquide, en degrés, en fonction du temps,'
    ' en minutes.\n\n'
    + repere('-1', '6', '-1', '22', '1 ; 2', TEMPERATURE_AXES,
             courbes=['f(x) = {{t0}}+({{s}})*{{a}}*x sur [0 ; 5]   bleu'],
             description='Droite : temps en abscisse, température en ordonnée.')
    + '\n\nQuand le temps augmente, que fait la température ?'
    + choix(['{{if:s>0|Elle augmente.|Elle diminue.}}',
             '{{if:s>0|Elle diminue.|Elle augmente.}}', 'Elle ne change pas.']),
    [var('s', '1|-1'), var('a', '1..2'), var('t0', '{{if:s>0|2..8|12..20}}')], ['0'],
    [TROIS_FORMES,
     'On lit le graphique **de gauche à droite**, comme le temps qui passe.',
     '{{if:s>0|La droite monte : la température ' + col('\\text{augmente}')
     + '.|La droite descend : la température ' + col('\\text{diminue}') + '.}}'])

MODELES.append(modele(
    '06-formule-tableau-et-graphique', 'Formule, tableau et graphique',
    'Passer d\'une formule à un tableau de valeurs, lire un graphique, retrouver la formule d\'un'
    ' tableau : trois façons de traduire la dépendance d\'une grandeur à une autre',
    'Fonctions', 'Dépendance', 'Formule, tableau et graphique', 1,
    [LOCATION, LIRE, QUELLE_FORMULE, QUEL_TABLEAU, SENS],
    [spec('P(3) = 14, P(6) = 26', 0, {'a': 4, 'b': 2, 'h1': 3, 'h2': 6}, ['14', '26'],
          'correct'),
     spec('Erreur : (4 + 2) × 3', 0, {'a': 4, 'b': 2, 'h1': 3, 'h2': 6}, ['18', '36'],
          'incorrect'),
     spec('V(3) = 7', 1, {'a': 2, 'b': 1, 'k': 3}, '7', 'correct'),
     spec('Erreur : lu sur le mauvais axe', 1, {'a': 2, 'b': 1, 'k': 3}, '1', 'incorrect'),
     spec('an + b', 2, {'a': 3, 'b': 2}, '0', 'correct'),
     spec('Erreur : bn + a', 2, {'a': 3, 'b': 2}, '1', 'incorrect'),
     spec('Le bon tableau', 3, {'a': 4, 'b': 2}, '0', 'correct'),
     spec('Erreur : sans b', 3, {'a': 4, 'b': 2}, '2', 'incorrect'),
     spec('Elle augmente', 4, {'s': 1, 'a': 2, 't0': 4}, '0', 'correct'),
     spec('Erreur : elle diminue', 4, {'s': 1, 'a': 2, 't0': 4}, '1', 'incorrect'),
     spec('Elle diminue', 4, {'s': -1, 'a': 2, 't0': 18}, '0', 'correct')],
    delay=90))

os.makedirs(DOSSIER, exist_ok=True)
for nom, m in MODELES:
    with open(os.path.join(DOSSIER, nom + '.json'), 'w', encoding='utf-8') as f:
        json.dump(m, f, ensure_ascii=False, indent='\t')
        f.write('\n')
# Mis en forme comme le pre-commit, pour que le script redonne les fichiers commités
subprocess.run(['pnpm', 'exec', 'prettier', '--write', DOSSIER], check=True,
               stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL)
print(f'{len(MODELES)} modèles écrits dans {DOSSIER}')
