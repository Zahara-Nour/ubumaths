"""Écrit les 3 modèles du lot 9 « Pensée informatique » de la 4e dans scripts/questions/4-lot-9/.

Phase 0 validée par David le 2026-11-01 (§ 44 du journal `docs/wip/questions-4-progress.md`), un
point par modèle :

| # | Point | Titre                        | Catégorie, niveau                                  |
| 1 | 4-065 | Représenter une condition    | Algorithmique › Conditions › Condition simple, 1   |
| 2 | 4-066 | Instruction conditionnelle   | Algorithmique › Conditions › Si alors sinon, 1     |
| 3 | 4-067 | Manipuler une variable       | Algorithmique › Variables › Accumulation, 1        |

Bornes : `cycle4.json`, 4e (Exemples 2026 p. 48) : conditions simples avec `<`, `>`, `=` seulement ;
une seule variable, accumulation dans une boucle. Le nœud et le tag sont posés par la migration de
rangement, après le `--publier` de David.

Décisions et pièges :
- pseudo-code en français avec les mots de Scratch (`mettre … à`, `ajouter … à`, `répéter … fois`,
  `si … alors … sinon … fin si`, `dire`), dans un bloc de code SANS langage (texte brut, pas de
  coloration) ; indentation de 4 espaces ;
- « au moins t ans » s'écrit `âge > t−1` : Scratch n'a pas `≥` (variante gardée, § 44.4) ;
- l'élève ne peut pas exécuter le hasard : les lancers de dé sont donnés dans l'énoncé ;
- choix en case choix (bloc ```choix, ADR 0033), le bon choix écrit en premier (indice 0) ;
- jamais de variable `e` ni `i` dans les `eval`.

    python3 docs/wip/questions/lot-4-9.py scripts/questions/4-lot-9
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
           delay=60):
    m = {'title': title, 'description': description, 'grades': ['4'], 'theme': theme,
         'domain': domain, 'subdomain': subdomain, 'level': level, 'delay': delay,
         'status': 'draft', 'variations': variations, 'testSpecs': specs}
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


def choix(lignes):
    return '\n\n```choix\n' + ''.join('- ' + l + '\n' for l in lignes) + '```'


def code(lignes):
    """Programme en pseudo-code : bloc de code sans langage (texte brut)."""
    return '\n\n```\n' + '\n'.join(lignes) + '\n```\n\n'


def ev(x):
    return '{{eval:' + x + '}}'


I = '    '  # un cran d'indentation
MODELES = []

# --- 1. 4-065 : représenter une condition simple -----------------------------------------------

CONDITION = ('**Condition.** Une condition est **vraie** ou **fausse**. Avec `>`, le nombre doit être'
             ' **strictement** plus grand : s\'il est égal, la condition est fausse.')

# Vraie ou fausse : n tiré autour de a, n = a possible
VRAIE = variation(
    'Dans un programme, on trouve la condition :' + code(['nombre > {{a}}'])
    + 'Le nombre vaut ${{n}}$. Cette condition est-elle vraie ?'
    + choix(['{{if:n>a|Elle est vraie.|Elle est fausse.}}',
             '{{if:n>a|Elle est fausse.|Elle est vraie.}}']),
    [var('a', '5..20'), var('o', '-3..3'), var('n', 'eval:a+o')], ['0'],
    [CONDITION,
     '{{if:n>a|${{n}} \\gt {{a}}$ : la condition est ' + '$' + col('\\text{vraie}') + '$'
     + '.|{{if:n==a|${{n}} = {{a}}$ : le nombre n\'est pas **plus grand** que ${{a}}$, la'
     ' condition est ' + '$' + col('\\text{fausse}') + '$' + '.|${{n}} \\lt {{a}}$ : la condition est '
     + '$' + col('\\text{fausse}') + '$' + '.}}}}'])

# Phrase → condition (s = 1 : plus petit, s = 2 : plus grand)
TRADUIRE = variation(
    'On veut tester si le nombre est **{{if:s==1|plus petit|plus grand}} que {{a}}**. Quelle'
    ' condition faut-il écrire ?'
    + choix(['`{{if:s==1|nombre < {{a}}|nombre > {{a}}}}`',
             '`{{if:s==1|nombre > {{a}}|nombre < {{a}}}}`',
             '`nombre = {{a}}`',
             '`{{if:s==1|{{a}} < nombre|{{a}} > nombre}}`']),
    [var('s', '1|2'), var('a', '3..15')], ['0'],
    ['**Condition.** La pointe du signe `<` ou `>` est tournée vers le **plus petit** des deux.',
     'Le nombre est {{if:s==1|plus petit|plus grand}} que ${{a}}$ : la condition est'
     ' **`{{if:s==1|nombre < {{a}}|nombre > {{a}}}}`**.',
     '`{{if:s==1|{{a}} < nombre|{{a}} > nombre}}` dit le contraire : c\'est ${{a}}$ qui est'
     ' {{if:s==1|plus petit|plus grand}}.'])

# Quelle valeur rend la condition vraie ?
VALEUR = variation(
    'Dans un programme, on trouve la condition :' + code(['nombre < {{a}}'])
    + 'Pour quelle valeur du nombre cette condition est-elle vraie ?'
    + choix(['${{b}}$', '${{a}}$', '$' + ev('a+1') + '$', '$' + ev('a+k+2') + '$']),
    [var('a', '5..12'), var('k', '1..3'), var('b', 'eval:a-k')], ['0'],
    [CONDITION.replace('Avec `>`, le nombre doit être **strictement** plus grand',
                       'Avec `<`, le nombre doit être **strictement** plus petit'),
     'Seul $' + col('{{b}}') + '$ est plus petit que ${{a}}$. Pour ${{a}}$ lui-même, la condition'
     ' est fausse.'])

# « Au moins t ans » avec <, > et = seulement
AU_MOINS = variation(
    'Un jeu est réservé aux joueurs qui ont **au moins {{t}} ans**. L\'âge est un nombre entier'
    ' d\'années, et le programme ne connaît que `<`, `>` et `=`.\n\nQuelle condition teste si le'
    ' joueur peut jouer ?'
    + choix(['`âge > ' + ev('t-1') + '`', '`âge > {{t}}`', '`âge < {{t}}`', '`âge = {{t}}`']),
    [var('t', '12|14|16|18')], ['0'],
    ['**Au moins {{t}} ans**, c\'est {{t}} ans **ou plus** : un joueur de {{t}} ans peut jouer.',
     '`âge > {{t}}` refuserait le joueur de {{t}} ans exactement ; `âge = {{t}}` refuserait les'
     ' plus âgés.',
     'L\'âge est entier : avoir plus de ' + ev('t-1') + ' ans, c\'est avoir {{t}} ans ou plus. La'
     ' condition est **`âge > ' + ev('t-1') + '`**.'])

MODELES.append(modele(
    '01-representer-une-condition', 'Représenter une condition',
    'Dire si une condition simple est vraie, traduire une phrase en condition avec <, > ou =,'
    ' traduire « au moins » sans le signe ≥',
    'Algorithmique', 'Conditions', 'Condition simple', 1,
    [VRAIE, TRADUIRE, VALEUR, AU_MOINS],
    [spec('12 > 10 : vraie', 0, {'a': 10, 'o': 2}, '0', 'correct'),
     spec('10 > 10 : fausse', 0, {'a': 10, 'o': 0}, '0', 'correct'),
     spec('Erreur : 10 > 10 vraie', 0, {'a': 10, 'o': 0}, '1', 'incorrect'),
     spec('Plus petit que 7 : nombre < 7', 1, {'s': 1, 'a': 7}, '0', 'correct'),
     spec('Erreur : signe inversé', 1, {'s': 1, 'a': 7}, '1', 'incorrect'),
     spec('Erreur : 7 < nombre', 1, {'s': 1, 'a': 7}, '3', 'incorrect'),
     spec('8 < 10', 2, {'a': 10, 'k': 2}, '0', 'correct'),
     spec('Erreur : 10 < 10', 2, {'a': 10, 'k': 2}, '1', 'incorrect'),
     spec('Au moins 18 : âge > 17', 3, {'t': 18}, '0', 'correct'),
     spec('Erreur : âge > 18', 3, {'t': 18}, '1', 'incorrect')]))

# --- 2. 4-066 : instruction conditionnelle -----------------------------------------------------

SI = ('**Instruction conditionnelle.** Si la condition est vraie, on exécute **seulement** le bloc'
      ' « alors » ; sinon, **seulement** le bloc « sinon ».')

GRAND_PETIT = variation(
    'Voici un programme :' + code(['demander un nombre', 'si nombre > {{a}} alors',
                                   I + 'dire « Grand »', 'sinon', I + 'dire « Petit »', 'fin si'])
    + 'On saisit le nombre ${{n}}$. Que dit le lutin ?'
    + choix(['{{if:n>a|« Grand »|« Petit »}}', '{{if:n>a|« Petit »|« Grand »}}',
             '« Grand », puis « Petit »']),
    [var('a', '10..30'), var('o', '-3..3'), var('n', 'eval:a+o')], ['0'],
    [SI,
     '{{if:n>a|${{n}} \\gt {{a}}$ : la condition est vraie, le lutin dit '
     + '$' + col('\\text{« Grand »}') + '$' + '.|{{if:n==a|${{n}}$ n\'est pas plus grand que ${{a}}$ (il'
     ' est égal) : la condition est fausse, le lutin dit ' + '$' + col('\\text{« Petit »}') + '$'
     + '.|${{n}} \\lt {{a}}$ : la condition est fausse, le lutin dit ' + '$' + col('\\text{« Petit »}') + '$'
     + '.}}}}'])

CALCUL = variation(
    'Voici un programme :' + code(['demander un nombre', 'si nombre < {{a}} alors',
                                   I + 'mettre nombre à nombre × 2', 'sinon',
                                   I + 'mettre nombre à nombre − {{b}}', 'fin si', 'dire nombre'])
    + 'On saisit le nombre ${{n}}$. Quel nombre dit le lutin ?\n\n$?$',
    [var('a', '5..15'), var('b', '1..9'), var('o', '-4..4'), var('n', 'eval:a+o'),
     var('r1', 'eval:2*n'), var('r2', 'eval:n-b')],
    ['{{if:n<a|{{r1}}|{{r2}}}}'],
    [SI,
     '{{if:n<a|${{n}} \\lt {{a}}$ : la condition est vraie, on double le nombre.|${{n}}$ n\'est pas'
     ' plus petit que ${{a}}$ : la condition est fausse, on soustrait ${{b}}$.}}',
     '{{if:n<a|${{n}} \\times 2 = ' + col('{{r1}}') + '$|${{n}} - {{b}} = ' + col('{{r2}}')
     + '$}}'])

# Deux « si » à la suite : le second teste le nombre déjà modifié
DEUX_SI = variation(
    'Voici un programme :' + code(['demander un nombre', 'si nombre > {{a}} alors',
                                   I + 'mettre nombre à nombre − {{b}}', 'fin si',
                                   'si nombre < {{c}} alors',
                                   I + 'mettre nombre à nombre + {{d}}', 'fin si', 'dire nombre'])
    + 'On saisit le nombre ${{n}}$. Quel nombre dit le lutin ?\n\n$?$',
    [var('a', '10..15'), var('b', '4..9'), var('c', '6..9'), var('d', '2..9'),
     var('n', '3..20'), var('m1', 'eval:n-b'), var('m', '{{if:n>a|{{m1}}|{{n}}}}'),
     var('p', 'eval:m+d'), var('r', '{{if:m<c|{{p}}|{{m}}}}'),
     var('q', '{{if:n<c|{{p}}|{{m}}}}')],
    ['{{r}}'],
    ['**Deux instructions conditionnelles à la suite.** On les exécute **dans l\'ordre** : la'
     ' seconde teste le nombre **tel que la première l\'a laissé**.',
     '{{if:n>a|${{n}} \\gt {{a}}$ : vraie, $\\text{nombre} = {{n}} - {{b}} = {{m}}$.|${{n}}$ n\'est'
     ' pas plus grand que ${{a}}$ : fausse, le nombre reste ${{n}}$.}}',
     '{{if:m<c|${{m}} \\lt {{c}}$ : vraie, $\\text{nombre} = {{m}} + {{d}} = ' + col('{{p}}')
     + '$.|${{m}}$ n\'est pas plus petit que ${{c}}$ : fausse, le nombre reste $'
     + col('{{m}}') + '$.}}'],
    # le piège compte : tester le nombre de départ au second « si » donne un autre résultat
    ['q!=r'])

GAGNE = variation(
    'Voici un programme :' + code(['demander un nombre', 'si nombre < {{a}} alors',
                                   I + 'dire « Trop petit »', 'sinon',
                                   I + 'si nombre > {{a}} alors',
                                   I + I + 'dire « Trop grand »', I + 'sinon',
                                   I + I + 'dire « Gagné ! »', I + 'fin si', 'fin si'])
    + 'Quel nombre faut-il saisir pour que le lutin dise « Gagné ! » ?\n\n$?$',
    [var('a', '11..49')], ['{{a}}'],
    [SI,
     'Pour arriver à « Gagné ! », il faut que `nombre < {{a}}` soit **fausse**, puis que'
     ' `nombre > {{a}}` soit **fausse** aussi.',
     'Le nombre n\'est ni plus petit, ni plus grand que ${{a}}$ : il est égal à $'
     + col('{{a}}') + '$.'])

COMPLETER = variation(
    'On veut que le lutin dise « Gagné ! » quand le dé donne {{v}}, et « Raté » sinon :'
    + code(['lancer le dé', 'si ??? alors', I + 'dire « Gagné ! »', 'sinon', I + 'dire « Raté »',
            'fin si'])
    + 'Quelle condition faut-il écrire à la place de `???` ?'
    + choix(['`dé = {{v}}`', '`dé > {{v}}`', '`dé < {{v}}`', '`{{v}} > dé`']),
    [var('v', '2..5')], ['0'],
    ['**Condition.** Le dé doit donner **exactement** {{v}} : c\'est une égalité.',
     'La condition est **`dé = {{v}}`**. Avec `>` ou `<`, le lutin dirait'
     ' « Gagné ! » pour d\'autres valeurs du dé.'])

MODELES.append(modele(
    '02-instruction-conditionnelle', 'Instruction conditionnelle',
    'Prévoir ce que fait un programme avec « si … alors … sinon » : message affiché, nombre'
    ' obtenu, deux tests à la suite, tests imbriqués ; écrire la condition qui manque',
    'Algorithmique', 'Conditions', 'Si alors sinon', 1,
    [GRAND_PETIT, CALCUL, DEUX_SI, GAGNE, COMPLETER],
    [spec('25 > 20 : Grand', 0, {'a': 20, 'o': 5}, '0', 'correct'),
     spec('20 > 20 fausse : Petit', 0, {'a': 20, 'o': 0}, '0', 'correct'),
     spec('Erreur : les deux branches', 0, {'a': 20, 'o': 0}, '2', 'incorrect'),
     spec('7 < 10 : 14', 1, {'a': 10, 'b': 3, 'o': -3}, '14', 'correct'),
     spec('12 ≥ 10 : 12 − 3 = 9', 1, {'a': 10, 'b': 3, 'o': 2}, '9', 'correct'),
     spec('Erreur : mauvaise branche', 1, {'a': 10, 'b': 3, 'o': 2}, '24', 'incorrect'),
     spec('15 > 12 → 8, 8 < 9 → 13', 2, {'a': 12, 'b': 7, 'c': 9, 'd': 5, 'n': 15}, '13',
          'correct'),
     spec('Erreur : second test sur le nombre de départ', 2,
          {'a': 12, 'b': 7, 'c': 9, 'd': 5, 'n': 15}, '8', 'incorrect'),
     spec('Gagné pour 23', 3, {'a': 23}, '23', 'correct'),
     spec('Erreur : 24', 3, {'a': 23}, '24', 'incorrect'),
     spec('dé = 4', 4, {'v': 4}, '0', 'correct'),
     spec('Erreur : dé > 4', 4, {'v': 4}, '1', 'incorrect')],
    delay=90))

# --- 3. 4-067 : manipuler une variable ---------------------------------------------------------

VARIABLE = ('**Variable.** Une variable porte un nom et contient une valeur ; chaque instruction'
            ' qui la modifie **remplace** sa valeur, en partant de la précédente.')

SCORE = variation(
    'Voici un programme :' + code(['mettre score à {{s0}}', 'répéter {{k}} fois',
                                   I + 'ajouter {{a}} à score', 'fin répéter', 'dire score'])
    + 'Quel nombre dit le lutin ?\n\n$?$',
    [var('s0', '1..10'), var('k', '3..8'), var('a', '2..9')], [ev('s0+k*a')],
    [VARIABLE,
     'Au départ, score vaut ${{s0}}$. La boucle ajoute ${{a}}$ **{{k}} fois** : $' + ev('k*a')
     + '$ de plus.',
     '$${{s0}} + {{k}} \\times {{a}} = ' + col(ev('s0+k*a')) + '$$'])

DOUBLE = variation(
    'Voici un programme :' + code(['mettre x à {{a}}', 'répéter {{k}} fois',
                                   I + 'mettre x à x × 2', 'fin répéter', 'dire x'])
    + 'Quel nombre dit le lutin ?\n\n$?$',
    [var('a', '1..5'), var('k', '2..4')], [ev('a*2^k')],
    [VARIABLE,
     'Chaque tour **double** la valeur de x : ${{a}}$, puis $' + ev('a*2') + '$, puis $'
     + ev('a*4') + '${{if:k>2|, puis $' + ev('a*8') + '$|}}{{if:k>3|, puis $' + ev('a*16')
     + '$|}}.',
     'Après {{k}} tours, x vaut $' + col(ev('a*2^k')) + '$.'])

DES = ['d' + str(j) for j in range(1, 9)]
DES_VARS = [var(d, '1..6') for d in DES] + [
    var('c', 'eval:' + '+'.join('{{if:' + d + '==6|1|0}}' for d in DES))]
LANCERS = ' ; '.join('{{' + d + '}}' for d in DES)
LANCERS_COLORES = ' ; '.join('{{if:' + d + '==6|' + col('6') + '|{{' + d + '}}}}' for d in DES)
COMPTEUR = ['mettre compteur à 0', 'répéter 8 fois', I + 'lancer le dé', I + 'si dé = 6 alors',
            I + I + 'ajouter 1 à compteur', I + 'fin si', 'fin répéter', 'dire compteur']

SIX = variation(
    'Voici un programme :' + code(COMPTEUR)
    + 'Les 8 lancers donnent, dans l\'ordre : $' + LANCERS + '$.\n\nQuel nombre dit le lutin ?'
    '\n\n$?$',
    DES_VARS, ['{{c}}'],
    [VARIABLE,
     'compteur part de $0$ et gagne $1$ **seulement** quand le dé donne $6$.',
     'Les lancers : $' + LANCERS_COLORES + '$. Il y a $' + col('{{c}}') + '$ six.'],
    ['c>0'])

ROLE = variation(
    'Voici un programme :' + code(COMPTEUR) + 'Que contient la variable compteur à la fin ?'
    + choix(['Le nombre de 6 obtenus.', 'La valeur du dernier lancer.',
             'La somme des 8 lancers.', 'Le nombre 6.']),
    [var('z', '1')], ['0'],
    [VARIABLE,
     'compteur part de $0$ et gagne $1$ à chaque lancer qui donne $6$ : à la fin, il contient '
     + '$' + col('\\text{le nombre de 6 obtenus}') + '$' + '.'])

TOTAL = variation(
    'On veut que le lutin dise le **total des points** obtenus en {{k}} lancers de dé :'
    + code(['mettre total à 0', 'répéter {{k}} fois', I + 'lancer le dé', I + '???',
            'fin répéter', 'dire total'])
    + 'Quelle instruction faut-il écrire à la place de `???` ?'
    + choix(['`ajouter dé à total`', '`mettre total à dé`', '`ajouter 1 à total`',
             '`mettre total à 0`']),
    [var('k', '3..10')], ['0'],
    [VARIABLE,
     'À chaque tour, il faut **ajouter** les points du dé à ce que total contient déjà : $'
     + col('\\text{ajouter dé à total}') + '$.',
     '`mettre total à dé` remplacerait le total par le dernier lancer ; `ajouter 1 à total`'
     ' compterait les lancers.'])

MODELES.append(modele(
    '03-manipuler-une-variable', 'Manipuler une variable',
    'Suivre la valeur d\'une variable modifiée dans une boucle : score, doublement, compteur de 6'
    ' sur des lancers donnés ; dire ce que contient la variable, choisir l\'instruction qui'
    ' accumule',
    'Algorithmique', 'Variables', 'Accumulation', 1,
    [SCORE, DOUBLE, SIX, ROLE, TOTAL],
    [spec('5 + 4 × 3 = 17', 0, {'s0': 5, 'k': 4, 'a': 3}, '17', 'correct'),
     spec('Erreur : valeur de départ oubliée', 0, {'s0': 5, 'k': 4, 'a': 3}, '12', 'incorrect'),
     spec('3 × 2³ = 24', 1, {'a': 3, 'k': 3}, '24', 'correct'),
     spec('Erreur : 3 × 2 × 3', 1, {'a': 3, 'k': 3}, '18', 'incorrect'),
     spec('Deux 6', 2, {'d1': 6, 'd2': 2, 'd3': 3, 'd4': 6, 'd5': 1, 'd6': 4, 'd7': 5, 'd8': 2},
          '2', 'correct'),
     spec('Erreur : dernier lancer', 2,
          {'d1': 6, 'd2': 2, 'd3': 3, 'd4': 6, 'd5': 1, 'd6': 4, 'd7': 2, 'd8': 5}, '5',
          'incorrect'),
     spec('Erreur : 6', 2,
          {'d1': 6, 'd2': 2, 'd3': 3, 'd4': 6, 'd5': 1, 'd6': 4, 'd7': 5, 'd8': 3}, '6',
          'incorrect'),
     spec('Le nombre de 6', 3, {'z': 1}, '0', 'correct'),
     spec('Erreur : le dernier lancer', 3, {'z': 1}, '1', 'incorrect'),
     spec('ajouter dé à total', 4, {'k': 5}, '0', 'correct'),
     spec('Erreur : mettre total à dé', 4, {'k': 5}, '1', 'incorrect')],
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
