"""Écrit les 7 modèles du lot A4 (sens des opérations, CP) dans scripts/questions/cp-a4/."""
import json
import sys

DOSSIER = sys.argv[1]


def spec(desc, vi, variables, status, choix=None, answers=None, violations=None):
    s = {'description': desc, 'variationIndex': vi, 'variables': variables,
         'expected': {'status': status}}
    if choix is not None:
        s['selectedChoices'] = [choix]
    if answers is not None:
        s['answers'] = answers
    if violations:
        s['expected']['constraintViolations'] = violations
    return s


def modele(title, description, domain, level, delay, variations, specs):
    # theme / domain / subdomain : anciennes colonnes, remplies pour create-questions ; le
    # rangement (nœud de la notion) est posé par la migration
    return {'title': title, 'description': description, 'grades': ['CP'], 'theme': 'Entiers',
            'domain': domain, 'subdomain': 'Sens', 'level': level, 'delay': delay,
            'status': 'draft', 'variations': variations, 'testSpecs': specs}


# ---- 1. Addition ou soustraction ? (CP-014), Soustraction ou addition ? (CP-077) ----
# Un modèle porte au plus un point par programme (ADR 0020) : deux modèles, chacun avec une
# situation de l'autre opération en leurre, pour que la bonne réponse ne soit pas toujours la même.

PLUS_MOINS = [{'content': '${{a}}+{{b}}$'}, {'content': '${{a}}-{{b}}$'}]
QUEL_CALCUL = '\n\nQuel calcul permet de trouver la réponse ?'


def situation(texte, bonne, explication, conclusion):
    """Une situation ; bonne = 0 (addition) ou 1 (soustraction). Nombres ≤ 20, a > b ≥ 2
    (pas de « 1 oiseaux »). Dans la conclusion, R = le résultat, § = « s » sauf s'il vaut 1."""
    resultat = '{{eval:a+b}}' if bonne == 0 else '{{eval:a-b}}'
    calcul = '{{a}}+{{b}}' if bonne == 0 else '{{a}}-{{b}}'
    return {'statement': texte + QUEL_CALCUL,
            'variables': [{'name': 'a', 'expression': '2..19'},
                          {'name': 'b', 'expression': '2..17'}],
            'conditions': ['a > b', 'a + b <= 20'],
            'choices': PLUS_MOINS,
            'correctChoiceIndex': [str(bonne)],
            'correction': {'steps': [explication, f'$${calcul}={resultat}$$',
                                     conclusion.replace('R', resultat).replace(
                                         '§', '{{if:' + resultat[7:-2] + '==1||s}}')]}}


REUNION = situation(
    'Dans un bouquet, il y a ${{a}}$ fleurs rouges et ${{b}}$ fleurs jaunes.'
    ' Combien y a-t-il de fleurs en tout ?', 0,
    'On met ensemble les fleurs rouges et les fleurs jaunes : c\'est une **addition**.',
    'Il y a $R$ fleur§ en tout.')
AJOUT = situation(
    'Il y a ${{a}}$ oiseaux sur un arbre. ${{b}}$ oiseaux arrivent.'
    ' Combien y a-t-il d\'oiseaux sur l\'arbre maintenant ?', 0,
    'Des oiseaux arrivent : il y en a plus qu\'avant. On ajoute, c\'est une **addition**.',
    'Il y a maintenant $R$ oiseaux sur l\'arbre.')
RETRAIT = situation(
    'Léo a ${{a}}$ billes. Il en perd ${{b}}$. Combien de billes lui reste-t-il ?', 1,
    'Léo perd des billes : il en a moins qu\'avant. On enlève, c\'est une **soustraction**.',
    'Il reste $R$ bille§ à Léo.')
ECART = situation(
    'Sami a ${{a}}$ images. Lina a ${{b}}$ images.'
    ' Combien d\'images Sami a-t-il de plus que Lina ?', 1,
    'On cherche l\'écart entre ${{a}}$ et ${{b}}$ : ce qu\'il faut enlever à ${{a}}$'
    ' pour arriver à ${{b}}$. C\'est une **soustraction**.',
    'Sami a $R$ image§ de plus que Lina.')

AB = {'a': '13', 'b': '5'}


def specs_situations(situations):
    specs = []
    for vi, (nom, bonne) in enumerate(situations):
        specs += [spec(f'{nom} : {"addition" if bonne == 0 else "soustraction"}', vi, AB,
                       'correct', choix=bonne),
                  spec(f'Erreur : {nom}, l\'autre opération', vi, AB, 'incorrect', choix=1 - bonne)]
    return specs


SPECS_1 = specs_situations([('réunion', 0), ('ajout', 0), ('retrait (leurre)', 1)]) + [
    spec('borne : réunion 18 + 2', 0, {'a': '18', 'b': '2'}, 'correct', choix=0)]
SPECS_1B = specs_situations([('retrait', 1), ('écart', 1), ('ajout (leurre)', 0)]) + [
    spec('borne : retrait 3 − 2', 0, {'a': '3', 'b': '2'}, 'correct', choix=1)]


# ---- 2. Les signes + et − (CP-015), Les signes − et + (CP-078) ----

# s = 0 : signe +, s = 1 : signe −. Tiré par r de 0 à 2 : le signe du point sort deux fois sur
# trois, l'autre une fois (leurre) — un point par modèle (ADR 0020)
SIGNE = '{{if:s==0|+|-}}'
PLUTOT_PLUS = 'eval:floor(r/2)'
PLUTOT_MOINS = 'eval:ceil(r/2)'
SIGNES_CONDITIONS = ['a > b']
SIGNE_ETAPE = ('{{if:s==0|Le signe $+$ se lit « plus » : on part de ${{a}}$ et on **ajoute** ${{b}}$.'
               '|Le signe $-$ se lit « moins » : on part de ${{a}}$ et on **enlève** ${{b}}$.}}')
SIGNE_CALCUL = '$${{a}}' + SIGNE + '{{b}}={{if:s==0|{{eval:a+b}}|{{eval:a-b}}}}$$'


def signes(statement, choices, tirage):
    variables = [{'name': 'a', 'expression': '2..9'}, {'name': 'b', 'expression': '1..8'},
                 {'name': 'r', 'expression': '0..2'}, {'name': 's', 'expression': tirage}]
    return {'statement': statement, 'variables': variables,
            'conditions': SIGNES_CONDITIONS, 'choices': choices,
            'correctChoiceIndex': ['{{s}}'],
            'correction': {'steps': [SIGNE_ETAPE, SIGNE_CALCUL]}}


def variations_signes(tirage):
    lire = signes('Comment lit-on cette écriture ?\n\n$${{a}}' + SIGNE + '{{b}}$$',
                  [{'content': '« ${{a}}$ plus ${{b}}$ »'},
                   {'content': '« ${{a}}$ moins ${{b}}$ »'},
                   {'content': '« ${{a}}$ égale ${{b}}$ »'}], tirage)
    sens = signes('Que veut dire cette écriture ?\n\n$${{a}}' + SIGNE + '{{b}}$$',
                  [{'content': 'On part de ${{a}}$ et on ajoute ${{b}}$.'},
                   {'content': 'On part de ${{a}}$ et on enlève ${{b}}$.'},
                   {'content': 'C\'est le nombre ${{eval:10*a+b}}$.'}], tirage)
    ecrire = signes('On part de ${{a}}$ et on {{if:s==0|ajoute|enlève}} ${{b}}$.'
                    ' Quelle écriture correspond ?',
                    [{'content': '${{a}}+{{b}}$'}, {'content': '${{a}}-{{b}}$'},
                     {'content': '${{a}}={{b}}$'}], tirage)
    return [lire, sens, ecrire]


# r = 0 : signe + et r = 2 : signe −, quel que soit le modèle
PLUS = {'a': '5', 'b': '3', 'r': '0'}
MOINS = {'a': '8', 'b': '3', 'r': '2'}
SPECS_2 = []
for vi, nom in ((0, 'lire'), (1, 'sens'), (2, 'écrire')):
    SPECS_2 += [spec(f'{nom} : signe +', vi, PLUS, 'correct', choix=0),
                spec(f'{nom} : signe −', vi, MOINS, 'correct', choix=1),
                spec(f'Erreur : {nom}, + pris pour −', vi, PLUS, 'incorrect', choix=1),
                spec(f'Erreur : {nom}, − pris pour +', vi, MOINS, 'incorrect', choix=0),
                spec(f'Erreur : {nom}, troisième choix', vi, PLUS, 'incorrect', choix=2)]


# ---- 3. Le signe = (CP-079) ----

# f = 1 : a + b … c (=) ; f = 2 : a … b = a + b (+) ; f = 3 : a … b = a − b (−)
TROU = '\\ldots'
MANQUANT = {
    'statement': 'Quel signe faut-il écrire à la place des points ?\n\n'
                 '$${{if:f==1|{{a}}+{{b}}' + TROU + '{{eval:a+b}}|'
                 '{{if:f==2|{{a}}' + TROU + '{{b}}={{eval:a+b}}|'
                 '{{a}}' + TROU + '{{b}}={{eval:a-b}}}}}}$$',
    'variables': [{'name': 'a', 'expression': '2..9'},
                  {'name': 'b', 'expression': '1..8'},
                  {'name': 'f', 'expression': '1..3'}],
    'conditions': ['a > b'],
    'choices': [{'content': '$+$'}, {'content': '$-$'}, {'content': '$=$'}],
    'correctChoiceIndex': ['{{eval:mod(f+1,3)}}'],
    'correction': {'steps': [
        '{{if:f==1|Les deux côtés ont la même valeur : ${{a}}+{{b}}$ fait ${{eval:a+b}}$.'
        ' On écrit le signe $=$, qui veut dire « a la même valeur que ».|'
        '{{if:f==2|On part de ${{a}}$ et on arrive à ${{eval:a+b}}$, plus grand :'
        ' on a ajouté ${{b}}$. On écrit le signe $+$.|'
        'On part de ${{a}}$ et on arrive à ${{eval:a-b}}$, plus petit :'
        ' on a enlevé ${{b}}$. On écrit le signe $-$.}}}}',
        '$${{if:f==1|{{a}}+{{b}}={{eval:a+b}}|{{if:f==2|{{a}}+{{b}}={{eval:a+b}}|'
        '{{a}}-{{b}}={{eval:a-b}}}}}}$$']},
}

# g = 1 : a ± b = r ; g = 2 : r = a ± b ; g = 3 : a + b = b + a (vrai) ou a + b = a + a (faux)
# t = 1 : l'égalité est vraie ; t = 0 : fausse (r décalé de 1, ou a + a)
R = '{{if:s==0|{{eval:a+b+1-t}}|{{eval:a-b+1-t}}}}'
OP = '{{a}}{{if:s==0|+|-}}{{b}}'
VRAI = '{{if:s==0|{{eval:a+b}}|{{eval:a-b}}}}'
VRAI_FAUX = {
    'statement': 'Cette égalité est-elle vraie ou fausse ?\n\n'
                 '$${{if:g==1|' + OP + '=' + R + '|{{if:g==2|' + R + '=' + OP + '|'
                 '{{a}}+{{b}}={{if:t==1|{{b}}+{{a}}|{{a}}+{{a}}}}}}}}$$',
    'variables': [{'name': 'a', 'expression': '2..9'},
                  {'name': 'b', 'expression': '1..8'},
                  {'name': 's', 'expression': '0..1'},
                  {'name': 'g', 'expression': '1..3'},
                  {'name': 't', 'expression': '0..1'}],
    'conditions': ['a > b'],
    'choices': [{'content': 'Vraie'}, {'content': 'Fausse'}],
    'correctChoiceIndex': ['{{eval:1-t}}'],
    'correction': {'steps': [
        'Le signe $=$ veut dire « a la même valeur que » : on calcule chaque côté.',
        '{{if:g==3|D\'un côté ${{a}}+{{b}}={{eval:a+b}}$, de l\'autre'
        ' {{if:t==1|${{b}}+{{a}}={{eval:a+b}}$|${{a}}+{{a}}={{eval:2*a}}$}}.|'
        'D\'un côté ${{a}}{{if:s==0|+|-}}{{b}}=' + VRAI + '$, de l\'autre $' + R + '$.}}',
        '{{if:t==1|Les deux côtés ont la même valeur : l\'égalité est **vraie**.|'
        'Les deux côtés n\'ont pas la même valeur : l\'égalité est **fausse**.}}']},
}

SPECS_3 = [
    spec('5 + 3 … 8 : =', 0, {'a': '5', 'b': '3', 'f': '1'}, 'correct', choix=2),
    spec('5 … 3 = 8 : +', 0, {'a': '5', 'b': '3', 'f': '2'}, 'correct', choix=0),
    spec('8 … 3 = 5 : −', 0, {'a': '8', 'b': '3', 'f': '3'}, 'correct', choix=1),
    spec('Erreur : + à la place de =', 0, {'a': '5', 'b': '3', 'f': '1'}, 'incorrect', choix=0),
    spec('Erreur : = à la place de +', 0, {'a': '5', 'b': '3', 'f': '2'}, 'incorrect', choix=2),
    spec('Erreur : + à la place de −', 0, {'a': '8', 'b': '3', 'f': '3'}, 'incorrect', choix=0),
    spec('5 + 3 = 8 : vraie', 1, {'a': '5', 'b': '3', 's': '0', 'g': '1', 't': '1'}, 'correct',
         choix=0),
    spec('5 + 3 = 9 : fausse', 1, {'a': '5', 'b': '3', 's': '0', 'g': '1', 't': '0'}, 'correct',
         choix=1),
    spec('8 = 5 + 3 : vraie', 1, {'a': '5', 'b': '3', 's': '0', 'g': '2', 't': '1'}, 'correct',
         choix=0),
    spec('Erreur : 8 = 5 + 3 dite fausse', 1, {'a': '5', 'b': '3', 's': '0', 'g': '2', 't': '1'},
         'incorrect', choix=1),
    spec('8 − 3 = 5 : vraie', 1, {'a': '8', 'b': '3', 's': '1', 'g': '1', 't': '1'}, 'correct',
         choix=0),
    spec('5 + 3 = 3 + 5 : vraie', 1, {'a': '5', 'b': '3', 's': '0', 'g': '3', 't': '1'},
         'correct', choix=0),
    spec('Erreur : 5 + 3 = 3 + 5 dite fausse', 1,
         {'a': '5', 'b': '3', 's': '0', 'g': '3', 't': '1'}, 'incorrect', choix=1),
    spec('5 + 3 = 5 + 5 : fausse', 1, {'a': '5', 'b': '3', 's': '0', 'g': '3', 't': '0'},
         'correct', choix=1),
]


# ---- 4. Le sens de « fois » (CP-017) ----

def repete(fois):
    """n répété `fois` fois (fois = expression en g), en LaTeX : n+n+…+n, pour g de 2 à 5."""
    expr = '+'.join(['{{n}}'] * (5 + fois))
    for k in (4, 3, 2):
        expr = '{{if:g==' + str(k) + '|' + '+'.join(['{{n}}'] * (k + fois)) + '|' + expr + '}}'
    return expr


FOIS_VARIABLES = [{'name': 'g', 'expression': '2..5'}, {'name': 'n', 'expression': '2..5'}]
FOIS_ETAPES = ['${{g}}$ fois ${{n}}$, c\'est ${{n}}$ répété ${{g}}$ fois.',
               '$$' + repete(0) + '={{eval:g*n}}$$']

BOITES = {
    'statement': 'Il y a ${{g}}$ boîtes. Dans chaque boîte, il y a ${{n}}$ œufs.\n\n'
                 'Quel calcul donne le nombre d\'œufs ?',
    'variables': FOIS_VARIABLES,
    'conditions': ['g != n'],
    'choices': [{'content': '$' + repete(0) + '$'}, {'content': '${{g}}+{{n}}$'},
                {'content': '$' + repete(1) + '$'}],
    'correctChoiceIndex': ['0'],
    'correction': {'steps': [
        'Chaque boîte contient ${{n}}$ œufs, et il y a ${{g}}$ boîtes :'
        ' on ajoute ${{n}}$ autant de fois qu\'il y a de boîtes, ${{g}}$ fois.',
        '$$' + repete(0) + '={{eval:g*n}}$$', 'Il y a ${{eval:g*n}}$ œufs.']},
}
COMBIEN = {
    'statement': 'Calcule.\n\n${{g}}$ fois ${{n}}$, c\'est $?$.',
    'variables': FOIS_VARIABLES,
    'blanks': [{'expectedAnswer': '{{eval:g*n}}'}],
    'correction': {'steps': FOIS_ETAPES},
}

SPECS_4 = [
    spec('3 boîtes de 4 : 4 + 4 + 4', 0, {'g': '3', 'n': '4'}, 'correct', choix=0),
    spec('Erreur : 3 + 4', 0, {'g': '3', 'n': '4'}, 'incorrect', choix=1),
    spec('Erreur : 4 répété une fois de trop', 0, {'g': '3', 'n': '4'}, 'incorrect', choix=2),
    spec('bornes : 5 boîtes de 2', 0, {'g': '5', 'n': '2'}, 'correct', choix=0),
]
# Un modèle est QCM ou à cases, pas les deux : « combien » est un modèle à part
SPECS_5 = [
    spec('3 fois 4 : 12', 0, {'g': '3', 'n': '4'}, 'correct', answers=['12']),
    spec('bornes : 5 fois 5 : 25', 0, {'g': '5', 'n': '5'}, 'correct', answers=['25']),
    spec('bornes : 2 fois 2 : 4', 0, {'g': '2', 'n': '2'}, 'correct', answers=['4']),
    spec('Erreur : 3 + 4 (7)', 0, {'g': '3', 'n': '4'}, 'incorrect', answers=['7']),
    spec('Erreur : 34 juxtaposés', 0, {'g': '3', 'n': '4'}, 'incorrect', answers=['34']),
    spec('Zéro inutile 012', 0, {'g': '3', 'n': '4'}, 'unoptimal_form', answers=['012'],
         violations=['zeros']),
]


MODELES = {
    '01-addition-ou-soustraction': modele(
        'Addition ou soustraction ?', 'Choisir l\'addition : réunion, ajout (un retrait en leurre)',
        'Additionner', 1, 30, [REUNION, AJOUT, RETRAIT], SPECS_1),
    '01b-soustraction-ou-addition': modele(
        'Soustraction ou addition ?', 'Choisir la soustraction : retrait, écart (un ajout en leurre)',
        'Additionner', 4, 30, [RETRAIT, ECART, AJOUT], SPECS_1B),
    '02-signes-plus-et-moins': modele(
        'Les signes + et −', 'Lire, comprendre et écrire 5 + 3 (8 − 3 une fois sur trois)',
        'Additionner', 2, 20, variations_signes(PLUTOT_PLUS), SPECS_2),
    '02b-signes-moins-et-plus': modele(
        'Les signes − et +', 'Lire, comprendre et écrire 8 − 3 (5 + 3 une fois sur trois)',
        'Additionner', 5, 20, variations_signes(PLUTOT_MOINS), SPECS_2),
    '03-signe-egal': modele(
        'Le signe =', 'Le signe manquant ; égalités vraies ou fausses (8 = 5 + 3)',
        'Additionner', 3, 20, [MANQUANT, VRAI_FAUX], SPECS_3),
    '04-fois-quel-calcul': modele(
        'Le sens de « fois » : quel calcul ?', '3 boîtes de 4 œufs : 4 + 4 + 4 (sans le signe ×)',
        'Multiplier', 1, 20, [BOITES], SPECS_4),
    '05-fois-combien': modele(
        'Le sens de « fois » : combien ?', '3 fois 4, c\'est 4 + 4 + 4 = 12 (sans le signe ×)',
        'Multiplier', 2, 20, [COMBIEN], SPECS_5),
}

for nom, m in MODELES.items():
    with open(f'{DOSSIER}/{nom}.json', 'w') as f:
        json.dump(m, f, ensure_ascii=False, indent='\t')
        f.write('\n')
print(len(MODELES), 'modèles écrits')
