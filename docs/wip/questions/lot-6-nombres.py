"""Écrit les 10 modèles du lot 2 « Nombres » de la 6e dans scripts/questions/6-nombres/.

Phase 0 validée par David le 2026-10-27 (§ 9 du journal `docs/wip/questions-6-progress.md`).
Bornes : `cycle3.json`, 6e (entiers ≤ 999 999 999 999 ; numération jusqu'au millième ;
décimaux à 3 décimales au plus dans ce lot). Un point par modèle ; le nœud et le tag sont posés
par la migration de rangement, après le `--publier` de David.

Décisions et pièges :
- règle de l'école pour les espaces (« Espaces dès 4 chiffres ») : modèles de numération ;
- choix en case choix (bloc ```choix, ADR 0033), jamais l'ancien QCM ;
- 6-104 : fractions de dénominateur 1, 10, 100, 1 000 (oui) ou 3, 7, 9, 11 (non), pas de 3/4 ;
- 6-202 : case libre jugée par une règle « strictement entre » (`rulesSuffice`), l'attendu n'est
  qu'un exemple ;
- 6-112 : a/3, a/9 et π (pas a/7) ;
- un nombre à zéros de fin (2,50) s'écrit en chiffres dans l'énoncé (`{{a}}.{{b}}0`) : un
  `eval` les retirerait ; égalités d'arrondi (…,5 exact) exclues par condition.

    python3 docs/wip/questions/lot-6-nombres.py scripts/questions/6-nombres
"""
import json
import os
import sys

DOSSIER = sys.argv[1]
ECOLE = {'constraints': {'spacesFromFourDigits': True}}


def spec(desc, vi, variables, answers, status, violations=None):
    s = {'description': desc, 'variationIndex': vi,
         'variables': {k: str(v) for k, v in variables.items()},
         'answers': answers if isinstance(answers, list) else [answers],
         'expected': {'status': status}}
    if violations:
        s['expected']['constraintViolations'] = violations
    return s


def modele(nom, title, description, theme, subdomain, level, variations, specs, delay=20):
    return nom, {'title': title, 'description': description, 'grades': ['6'], 'theme': theme,
                 'domain': 'Apprivoiser', 'subdomain': subdomain, 'level': level,
                 'delay': delay, 'status': 'draft', 'options': ECOLE,
                 'variations': variations, 'testSpecs': specs}


def var(nom, expression):
    return {'name': nom, 'expression': expression}


def variation(statement, variables, answers, steps, conditions=None):
    v = {'statement': statement, 'variables': variables}
    if conditions:
        v['conditions'] = conditions
    v['blanks'] = [a if isinstance(a, dict) else {'expectedAnswer': a} for a in answers]
    v['correction'] = {'steps': steps}
    return v


def selon(nom, valeurs, debut=0):
    """`{{if:nom==debut|v0|{{if:nom==debut+1|v1|…}}}}` ; la dernière valeur est le « sinon »."""
    texte = valeurs[-1]
    for i in range(len(valeurs) - 2, -1, -1):
        texte = '{{if:' + nom + '==' + str(debut + i) + '|' + valeurs[i] + '|' + texte + '}}'
    return texte


def col(x, i=0):
    return '\\textcolor{{{color:primary.' + str(i) + '}}}{' + x + '}'


def choix(lignes):
    return '\n\n```choix\nmelanger: non\n' + ''.join('- ' + l + '\n' for l in lignes) + '```'


MODELES = []

# --- 1. 6-101 : le chiffre d'un rang -----------------------------------------------------

RANGS_ENTIERS = ['unités', 'dizaines', 'centaines', 'unités de mille', 'dizaines de mille',
                 'centaines de mille', 'unités de millions', 'dizaines de millions',
                 'centaines de millions', 'unités de milliards', 'dizaines de milliards',
                 'centaines de milliards']
CLASSES = ['unités', 'mille', 'millions', 'milliards']
RANGS_DECIMAUX = ['millièmes', 'centièmes', 'dixièmes', 'unités', 'dizaines', 'centaines']

CHIFFRE_ENTIER = variation(
    'Dans le nombre ${{n}}$, quel est le chiffre des ' + selon('r', RANGS_ENTIERS) + ' ?\n\n$$?$$',
    [var('c', '6..12'), var('n', 'digits:c'), var('cm', 'eval:c-1'), var('r', '1..{{cm}}'),
     var('k', 'eval:floor(r/3)'), var('ch', 'eval:mod(floor(n/10^r),10)')],
    ['{{ch}}'],
    ['**Les rangs.** On découpe le nombre en classes de trois chiffres à partir de la droite :'
     ' classe des unités, des mille, des millions, des milliards. Dans chaque classe, de droite à'
     ' gauche : unités, dizaines, centaines.',
     'Le chiffre des ' + selon('r', RANGS_ENTIERS) + ' est dans la classe des '
     + selon('k', CLASSES) + '. Dans ${{n}}$, c\'est $' + col('{{solution}}') + '$.'],
    ['mod(floor(n/10^(r+1)),10)!=ch', 'mod(floor(n/10^(r-1)),10)!=ch'])

CHIFFRE_DECIMAL = variation(
    'Dans le nombre ${{x}}$, quel est le chiffre des ' + selon('t', RANGS_DECIMAUX) + ' ?\n\n$$?$$',
    [var('p', '1..999'), var('q', '1..999'), var('t', '0..5'), var('N', 'eval:1000*p+q'),
     var('x', 'eval:N/1000;d'), var('ch', 'eval:mod(floor(N/10^t),10)')],
    ['{{ch}}'],
    ['**Les rangs.** Avant la virgule : unités, dizaines, centaines (de droite à gauche). Après'
     ' la virgule : dixièmes, centièmes, millièmes (de gauche à droite). Les dixièmes sont juste'
     ' après la virgule ; les dizaines, juste avant les unités.',
     'Dans ${{x}}$, le chiffre des ' + selon('t', RANGS_DECIMAUX) + ' est $'
     + col('{{solution}}') + '$.'],
    ['mod(q,10)!=0', 'p>=10^(t-3)', 'mod(floor(N/10^(t+1)),10)!=ch',
     'mod(floor(N/10^(t-1)),10)!=ch'])

MODELES.append(modele(
    '01-chiffre-d-un-rang', "Le chiffre d'un rang",
    "Donner le chiffre d'un rang d'un grand entier (jusqu'aux centaines de milliards) ou d'un"
    ' décimal (des centaines aux millièmes)',
    'Décimaux', 'Décomposition', 5, [CHIFFRE_ENTIER, CHIFFRE_DECIMAL],
    [spec('45 273 018, dizaines de mille : 4', 0,
          {'c': 8, 'n': 45273018, 'cm': 7, 'r': 4, 'k': 1, 'ch': 4}, '4', 'correct'),
     spec('Erreur : rang voisin (5)', 0,
          {'c': 8, 'n': 45273018, 'cm': 7, 'r': 4, 'k': 1, 'ch': 4}, '5', 'incorrect'),
     spec('347,258, dixièmes : 2', 1,
          {'p': 347, 'q': 258, 't': 2, 'N': 347258, 'x': '347.258', 'ch': 2}, '2', 'correct'),
     spec('Erreur : dizaines au lieu de dixièmes (4)', 1,
          {'p': 347, 'q': 258, 't': 2, 'N': 347258, 'x': '347.258', 'ch': 2}, '4', 'incorrect'),
     spec('347,258, millièmes : 8', 1,
          {'p': 347, 'q': 258, 't': 0, 'N': 347258, 'x': '347.258', 'ch': 8}, '8', 'correct')]))

# --- 2. 6-101 : le nombre de dizaines, de centièmes… --------------------------------------

NOMS_ENTIERS = ['dizaines', 'centaines', 'milliers']
NOMS_DECIMAUX = ['dixièmes', 'centièmes', 'millièmes']

NOMBRE_ENTIER = variation(
    'Quel est le nombre de ' + selon('k', NOMS_ENTIERS, 1) + ' dans ${{n}}$ ?\n\n$$?$$',
    [var('c', '4..7'), var('n', 'digits:c'), var('k', '1..3'),
     var('reste', 'eval:mod(n,10^k)')],
    ['{{eval:floor(n/10^k)}}'],
    ['**Chiffre ou nombre ?** Le chiffre des ' + selon('k', NOMS_ENTIERS, 1) + ' est un seul'
     ' chiffre ; le nombre de ' + selon('k', NOMS_ENTIERS, 1) + ' les compte toutes : on garde'
     ' tous les chiffres jusqu\'à ce rang.',
     '$${{n}} = ' + col('{{solution}}') + ' \\times {{eval:10^k}}{{if:reste>0| + {{reste}}|}}$$',
     'Il y a $' + col('{{solution}}') + '$ ' + selon('k', NOMS_ENTIERS, 1)
     + ' dans ${{n}}$.'],
    ['c-k>=2'])

NOMBRE_DECIMAL = variation(
    'Quel est le nombre de ' + selon('k', NOMS_DECIMAUX, 1) + ' dans ${{x}}$ ?\n\n$$?$$',
    [var('d', '3..5'), var('N', 'digits:d'), var('m', '2..3'), var('x', 'eval:N/10^m;d'),
     var('k', '1..{{m}}')],
    ['{{eval:floor(N/10^(m-k))}}'],
    ['**Chiffre ou nombre ?** Le chiffre des ' + selon('k', NOMS_DECIMAUX, 1) + ' est un seul'
     ' chiffre ; le nombre de ' + selon('k', NOMS_DECIMAUX, 1) + ' les compte tous. Une unité'
     ' vaut ${{eval:10^k}}$ ' + selon('k', NOMS_DECIMAUX, 1) + '.',
     'On lit le nombre sans la virgule, jusqu\'au rang des ' + selon('k', NOMS_DECIMAUX, 1)
     + ' : ${{x}}$ contient $' + col('{{solution}}') + '$ ' + selon('k', NOMS_DECIMAUX, 1)
     + '.'],
    ['mod(N,10)!=0', 'N>=10^m'])

SPEC_1_27 = {'d': 3, 'N': 127, 'm': 2, 'x': '1.27', 'k': 2}
MODELES.append(modele(
    '02-nombre-de-dizaines-de-centiemes', 'Le nombre de dizaines, de centièmes…',
    'Distinguer le chiffre et le nombre de dizaines, centaines, milliers (entiers) ou de'
    ' dixièmes, centièmes, millièmes (décimaux)',
    'Décimaux', 'Décomposition', 6, [NOMBRE_ENTIER, NOMBRE_DECIMAL],
    [spec('45 273, centaines : 452', 0, {'c': 5, 'n': 45273, 'k': 2, 'reste': 73}, '452',
          'correct'),
     spec('Erreur : le chiffre des centaines (2)', 0,
          {'c': 5, 'n': 45273, 'k': 2, 'reste': 73}, '2', 'incorrect'),
     spec('Erreur : arrondi (453)', 0, {'c': 5, 'n': 45273, 'k': 2, 'reste': 73}, '453',
          'incorrect'),
     spec('1,27, centièmes : 127', 1, SPEC_1_27, '127', 'correct'),
     spec('Erreur : le chiffre des centièmes (7)', 1, SPEC_1_27, '7', 'incorrect'),
     spec('Erreur : la partie décimale seule (27)', 1, SPEC_1_27, '27', 'incorrect')]))

# --- 3. 6-102 : liens entre les unités de numération --------------------------------------

UNITES = ['millième', 'centième', 'dixième', 'unité', 'dizaine', 'centaine', 'millier']


def unite(nom, pluriel=False):
    return '\\text{' + selon(nom, [u + ('s' if pluriel else '') for u in UNITES]) + '}'


LIEN_UN = variation(
    'Complète.\n\n$$1~' + unite('u') + ' = ?~' + unite('w', True) + '$$',
    [var('u', '1..6'), var('w', '0..5'), var('p', 'eval:u-w')],
    ['{{eval:10^p}}'],
    ['**Unités de numération.** D\'un rang au rang juste à sa droite, on multiplie par $10$ :'
     ' $1$ millier $= 10$ centaines, $1$ unité $= 10$ dixièmes, $1$ dixième $= 10$ centièmes…',
     'Du rang des ' + selon('u', [u + 's' for u in UNITES]) + ' au rang des '
     + selon('w', [u + 's' for u in UNITES]) + ', on descend de ${{p}}$ rang{{if:p>1|s|}} :'
     ' $1~' + unite('u') + ' = '
     + col('{{solution}}') + '~' + unite('w', True) + '$.'],
    ['p>=1', 'p<=4'])

LIEN_K = variation(
    'Complète.\n\n$${{k}}~' + unite('u', True) + ' = ?~' + unite('w', True) + '$$',
    [var('k', '2..9'), var('u', '1..6'), var('w', '0..5'), var('p', 'eval:u-w')],
    ['{{eval:k*10^p}}'],
    ['$1~' + unite('u') + ' = {{eval:10^p}}~' + unite('w', True) + '$.',
     '$${{k}}~' + unite('u', True) + ' = {{k}} \\times {{eval:10^p}}~' + unite('w', True)
     + ' = ' + col('{{solution}}') + '~' + unite('w', True) + '$$'],
    ['p>=1', 'p<=3'])

LIEN_INVERSE = variation(
    'Complète.\n\n$${{eval:k*10^p}}~' + unite('w', True) + ' = ?~' + unite('u', True) + '$$',
    [var('k', '2..9'), var('u', '1..6'), var('w', '0..5'), var('p', 'eval:u-w')],
    ['{{k}}'],
    ['$1~' + unite('u') + ' = {{eval:10^p}}~' + unite('w', True) + '$ : on cherche combien de'
     ' fois ${{eval:10^p}}$ dans ${{eval:k*10^p}}$.',
     '$${{eval:k*10^p}}~' + unite('w', True) + ' = ' + col('{{solution}}') + '~'
     + unite('u', True) + '$$'],
    ['p>=1', 'p<=3'])

LIEN_DECIMAL = variation(
    'Écris ce nombre sous forme décimale.\n\n$$\\frac{1}{{{eval:10^m}}} = ?$$',
    [var('m', '1..3')],
    ['{{eval:10^(-m);d}}'],
    ['$\\frac{1}{{{eval:10^m}}}$, c\'est un ' + selon('m', ['dixième', 'centième', 'millième'], 1)
     + ' : le chiffre $1$ se place au rang des ' + selon('m', ['dixièmes', 'centièmes',
                                                              'millièmes'], 1) + '.',
     '$$\\frac{1}{{{eval:10^m}}} = ' + col('{{solution}}') + '$$'])

LIEN_FRACTION = variation(
    'Complète.\n\n$${{if:a==0|1|\\frac{1}{{{eval:10^a}}}}} = \\frac{?}{{{eval:10^b}}}$$',
    [var('a', '0..2'), var('b', '1..3')],
    ['{{eval:10^(b-a)}}'],
    ['{{if:a==0|$1$ unité|$\\frac{1}{{{eval:10^a}}}$}} $= {{eval:10^(b-a)}}$ fois'
     ' $\\frac{1}{{{eval:10^b}}}$ : chaque rang vers la droite multiplie par $10$.',
     '$${{if:a==0|1|\\frac{1}{{{eval:10^a}}}}} = \\frac{' + col('{{solution}}')
     + '}{{{eval:10^b}}}$$'],
    ['b>a'])

MODELES.append(modele(
    '03-liens-entre-les-unites', 'Liens entre les unités de numération',
    'Relations entre millier, centaine, dizaine, unité, dixième, centième, millième ;'
    ' 1/10 = 0,1, 1/100 = 0,01, 1/1 000 = 0,001',
    'Décimaux', 'Décomposition', 7,
    [LIEN_UN, LIEN_K, LIEN_INVERSE, LIEN_DECIMAL, LIEN_FRACTION],
    [spec('1 centaine = 1 000 dixièmes', 0, {'u': 5, 'w': 2, 'p': 3}, '1\\,000', 'correct'),
     spec('Erreur : un zéro de moins (100)', 0, {'u': 5, 'w': 2, 'p': 3}, '100', 'incorrect'),
     spec('Erreur : rapport inversé (0,001)', 0, {'u': 5, 'w': 2, 'p': 3}, '0,001',
          'incorrect'),
     spec('4 dixièmes = 400 millièmes', 1, {'k': 4, 'u': 2, 'w': 0, 'p': 2}, '400', 'correct'),
     spec('Erreur : 40', 1, {'k': 4, 'u': 2, 'w': 0, 'p': 2}, '40', 'incorrect'),
     spec('300 centièmes = 3 unités', 2, {'k': 3, 'u': 3, 'w': 1, 'p': 2}, '3', 'correct'),
     spec('Erreur : 30 000', 2, {'k': 3, 'u': 3, 'w': 1, 'p': 2}, '30\\,000', 'incorrect'),
     spec('1/100 = 0,01', 3, {'m': 2}, '0,01', 'correct'),
     spec('Erreur : 0,1', 3, {'m': 2}, '0,1', 'incorrect'),
     spec('1/10 = 10/100', 4, {'a': 1, 'b': 2}, '10', 'correct'),
     spec('Erreur : 1', 4, {'a': 1, 'b': 2}, '1', 'incorrect')]))

# --- 4. 6-103 : grands nombres jusqu'aux milliards ----------------------------------------


def classe(lettre):
    """Variables d'une classe : 0, 1 chiffre, 2 chiffres ou 3 chiffres (tirés à égalité)."""
    s = 's' + lettre
    return [var(s, '0..3'), var(lettre + '1', '1..9'), var(lettre + '2', '10..99'),
            var(lettre + '3', '100..999'),
            var(lettre, selon(s, ['0', '{{' + lettre + '1}}', '{{' + lettre + '2}}',
                                  '{{' + lettre + '3}}']))]


def trois_chiffres(x):
    return ('{{eval:floor(' + x + '/100)}}{{eval:mod(floor(' + x + '/10),10)}}{{eval:mod('
            + x + ',10)}}')


ECRIRE_CHIFFRES = variation(
    'Écris ce nombre en chiffres.\n\n$${{G}}~\\text{milliard{{if:G>1|s|}}}'
    '{{if:M>0|~{{M}}~\\text{million{{if:M>1|s|}}}|}}{{if:K>0|~{{K}}~\\text{mille}|}}'
    '{{if:U>0|~{{U}}|}} = ?$$',
    [var('G', '1..99')] + classe('M') + classe('K') + classe('U'),
    ['{{eval:G*10^9+M*10^6+K*1000+U}}'],
    ['**Classes.** On écrit chaque classe sur trois chiffres (sauf la première) : une classe'
     ' absente s\'écrit $000$, une classe de moins de trois chiffres se complète par des zéros à'
     ' gauche.',
     '$$\\begin{array}{c|c|c|c} \\text{milliards} & \\text{millions} & \\text{mille} &'
     ' \\text{unités} \\\\ \\hline {{G}} & ' + trois_chiffres('M') + ' & '
     + trois_chiffres('K') + ' & ' + trois_chiffres('U') + ' \\end{array}$$',
     '$$' + col('{{solution}}') + '$$'],
    ['min(sM,sK,sU)<3'])

CLASSE_GAUCHE = ['milliards', 'milliards', 'millions']
CLASSE_DROITE = ['millions', 'mille', 'mille']
UN_CLASSES = ['$1$ milliard $= 1~000$ millions', '$1$ milliard $= 1~000~000$ mille',
              '$1$ million $= 1~000$ mille']

LIEN_CLASSES = variation(
    'Complète.\n\n$${{k}}~\\text{' + selon('w', CLASSE_GAUCHE) + '} = ?~\\text{'
    + selon('w', CLASSE_DROITE) + '}$$',
    [var('k', '2..30'), var('w', '0..2'), var('f', '{{if:w==1|1000000|1000}}')],
    ['{{eval:k*f}}'],
    [selon('w', UN_CLASSES) + '.',
     '$${{k}} \\times {{f}} = ' + col('{{solution}}') + '$$'])

SPEC_G = {'G': 4, 'sM': 2, 'M1': 1, 'M2': 25, 'M3': 100, 'M': 25, 'sK': 3, 'K1': 1, 'K2': 10,
          'K3': 300, 'K': 300, 'sU': 2, 'U1': 1, 'U2': 12, 'U3': 100, 'U': 12}
MODELES.append(modele(
    '04-grands-nombres', "Grands nombres jusqu'aux milliards",
    'Écrire en chiffres un nombre donné par classes (milliards, millions, mille, unités ; classes'
    ' vides comprises) ; liens entre milliard, million et mille',
    'Entiers', 'Ecriture', 15, [ECRIRE_CHIFFRES, LIEN_CLASSES],
    [spec('4 milliards 25 millions 300 mille 12', 0, SPEC_G, '4\\,025\\,300\\,012', 'correct'),
     spec('Erreur : zéro de la classe des millions oublié', 0, SPEC_G, '425\\,300\\,012',
          'incorrect'),
     spec('Sans espaces : forme à améliorer', 0, SPEC_G, '4025300012', 'unoptimal_form',
          ['spaces']),
     spec('7 milliards = 7 000 millions', 1, {'k': 7, 'w': 0, 'f': 1000}, '7\\,000', 'correct'),
     spec('Erreur : 7 000 000', 1, {'k': 7, 'w': 0, 'f': 1000}, '7\\,000\\,000', 'incorrect')]))

# --- 5. 6-104 : reconnaître un nombre décimal ---------------------------------------------

OUI_NON = choix(['Oui', 'Non'])
QUESTION_DECIMAL = 'Le nombre $NOMBRE$ est-il un nombre décimal ?' + OUI_NON
DEFINITION = ('**Nombre décimal.** C\'est un nombre qui peut s\'écrire comme une fraction de'
              ' dénominateur $1$, $10$, $100$, $1~000$… Il a un nombre fini de chiffres après la'
              ' virgule.')


def non_decimal(diviseurs):
    return variation(
        QUESTION_DECIMAL.replace('NOMBRE', '\\frac{{{a}}}{{{b}}}'),
        [var('a', '1..30'), var('sb', '0..1'),
         var('b', selon('sb', [str(d) for d in diviseurs]))],
        ['1'],
        [DEFINITION,
         'On divise : ${{a}} \\div {{b}} = {{eval:floor(1000*a/b)/1000;d}}\\ldots$ La division'
         ' ne s\'arrête jamais : $\\frac{{{a}}}{{{b}}}$ ne peut pas s\'écrire avec un'
         ' dénominateur $10$, $100$, $1~000$… Ce n\'est **pas** un nombre décimal.'],
        ['mod(a,b)!=0'])


MODELES.append(modele(
    '05-reconnaitre-un-decimal', 'Reconnaître un nombre décimal',
    'Dire si un nombre est décimal : fraction décimale (oui), entier (oui), a/3, a/9, a/7, a/11'
    ' non entiers (non)',
    'Décimaux', 'Ecriture', 11,
    [variation(
        QUESTION_DECIMAL.replace('NOMBRE', '\\frac{{{a}}}{{{eval:10^m}}}'),
        [var('m', '1..3'), var('a', '2..999')],
        ['0'],
        [DEFINITION, 'Son dénominateur est ${{eval:10^m}}$ : $\\frac{{{a}}}{{{eval:10^m}}} ='
         ' {{eval:a/10^m;d}}$. C\'est un nombre décimal.'],
        ['mod(a,10)!=0']),
     non_decimal([3, 9]),
     variation(
         QUESTION_DECIMAL.replace('NOMBRE', '{{n}}'),
         [var('n', '2..999')],
         ['0'],
         [DEFINITION, '${{n}} = \\frac{{{n}}}{1}$ : un nombre entier est un nombre décimal'
          ' (sans chiffre après la virgule).']),
     non_decimal([7, 11])],
    [spec('347/100 : oui', 0, {'m': 2, 'a': 347}, '0', 'correct'),
     spec('Erreur : 347/100, non', 0, {'m': 2, 'a': 347}, '1', 'incorrect'),
     spec('2/3 : non', 1, {'a': 2, 'sb': 0, 'b': 3}, '1', 'correct'),
     spec('Erreur : 2/3, oui', 1, {'a': 2, 'sb': 0, 'b': 3}, '0', 'incorrect'),
     spec('45 : oui', 2, {'n': 45}, '0', 'correct'),
     spec('Erreur : 45, non', 2, {'n': 45}, '1', 'incorrect'),
     spec('3/7 : non', 3, {'a': 3, 'sb': 0, 'b': 7}, '1', 'correct')]))

# --- 6. 6-109 : comparer deux décimaux ----------------------------------------------------

SIGNES = choix(['$<$', '$=$', '$>$'])
COMPARE = 'Complète avec le signe qui convient.\n\n$$GAUCHE \\ldots DROITE$$' + SIGNES
METHODE_COMPARER = ('**Comparer deux décimaux.** On compare d\'abord les parties entières ;'
                    ' si elles sont égales, on écrit les deux nombres avec autant de chiffres'
                    ' après la virgule, puis on compare les parties décimales.')


def compare(gauche_s0, droite_s0, variables, reponse, steps, conditions=None):
    """`s` (0 ou 1) échange les deux nombres ; `reponse` = indice si s = 0 (0 <, 1 =, 2 >)."""
    g = '{{if:s==0|' + gauche_s0 + '|' + droite_s0 + '}}'
    d = '{{if:s==0|' + droite_s0 + '|' + gauche_s0 + '}}'
    return variation(COMPARE.replace('GAUCHE', g).replace('DROITE', d),
                     [var('s', '0..1')] + variables, [reponse], steps, conditions)


COMPARER_LONGUEUR = compare(
    '{{a}}.{{b}}', '{{a}}.{{c}}{{d}}',
    [var('a', '0..20'), var('b', '2..9'), var('c', '1..{{eval:b-1}}'), var('d', '1..9')],
    '{{if:s==0|2|0}}',
    [METHODE_COMPARER,
     'Mêmes parties entières. ${{a}}.{{b}} = {{a}}.{{b}}0$ : ${{b}}0$ centièmes contre'
     ' ${{c}}{{d}}$ centièmes. Le nombre qui a le plus de chiffres n\'est pas forcément le plus grand.',
     '$${{if:s==0|{{a}}.{{b}} ' + col('>') + ' {{a}}.{{c}}{{d}}|{{a}}.{{c}}{{d}} ' + col('<')
     + ' {{a}}.{{b}}}}$$'])

COMPARER_ZEROS = compare(
    '{{a}}.{{b}}', selon('z', ['{{a}}.{{b}}0', '{{a}}.{{b}}00', '{{a}}.0{{b}}']),
    [var('a', '0..20'), var('b', '1..9'), var('z', '0..2')],
    '{{if:z<2|1|{{if:s==0|2|0}}}}',
    [METHODE_COMPARER,
     '{{if:z<2|Un zéro à la fin de la partie décimale ne change pas le nombre : les deux nombres'
     ' sont égaux.|${{a}}.{{b}}$ a ${{b}}$ dixième{{if:b>1|s|}}, ${{a}}.0{{b}}$ en a $0$ : le'
     ' zéro juste après la virgule compte.}}',
     '$$' + selon('z', ['{{a}}.{{b}} ' + col('=') + ' {{a}}.{{b}}0',
                        '{{a}}.{{b}} ' + col('=') + ' {{a}}.{{b}}00',
                        '{{if:s==0|{{a}}.{{b}} ' + col('>') + ' {{a}}.0{{b}}|{{a}}.0{{b}} '
                        + col('<') + ' {{a}}.{{b}}}}']) + '$$'])

COMPARER_MILLIEMES = compare(
    '{{a}}.{{b}}{{c}}{{d}}', '{{a}}.{{b}}{{c}}',
    [var('a', '0..20'), var('b', '0..9'), var('c', '1..9'), var('d', '1..9')],
    '{{if:s==0|2|0}}',
    [METHODE_COMPARER,
     '${{a}}.{{b}}{{c}} = {{a}}.{{b}}{{c}}0$ : ${{b}}{{c}}{{d}}$ millièmes contre'
     ' ${{b}}{{c}}0$ millièmes.',
     '$${{if:s==0|{{a}}.{{b}}{{c}}{{d}} ' + col('>') + ' {{a}}.{{b}}{{c}}|{{a}}.{{b}}{{c}} '
     + col('<') + ' {{a}}.{{b}}{{c}}{{d}}}}$$'])

COMPARER_LARGE = variation(
    'Vrai ou faux ?\n\n$$' + selon('q', ['{{a}}.{{b}} \\leqslant {{a}}.{{b}}0',
                                         '{{a}}.{{c}}{{d}} \\leqslant {{a}}.{{b}}',
                                         '{{a}}.{{b}} \\leqslant {{a}}.{{c}}{{d}}']) + '$$'
    + choix(['Vrai', 'Faux']),
    [var('q', '0..2'), var('a', '0..20'), var('b', '2..9'), var('c', '1..{{eval:b-1}}'),
     var('d', '1..9')],
    ['{{if:q<2|0|1}}'],
    ['**Le signe $\\leqslant$** se lit « inférieur ou égal à » : il est vrai si le premier'
     ' nombre est plus petit que le second, **ou** s\'ils sont égaux.',
     selon('q', ['${{a}}.{{b}} = {{a}}.{{b}}0$ : les deux nombres sont égaux, donc c\'est'
                 ' **vrai**.',
                 '${{a}}.{{b}} = {{a}}.{{b}}0$ et ${{c}}{{d}} < {{b}}0$ : ${{a}}.{{c}}{{d}} <'
                 ' {{a}}.{{b}}$, donc c\'est **vrai**.',
                 '${{a}}.{{b}} = {{a}}.{{b}}0$ et ${{b}}0 > {{c}}{{d}}$ : ${{a}}.{{b}} >'
                 ' {{a}}.{{c}}{{d}}$, donc c\'est **faux**.'])])

MODELES.append(modele(
    '06-comparer-deux-decimaux', 'Comparer deux nombres décimaux',
    'Comparer deux décimaux (pièges : 3,9 et 3,12 ; 2,5 et 2,50 ; 3,4 et 3,04 ; millièmes) ;'
    ' signe large ⩽',
    'Décimaux', 'Comparer', 3,
    [COMPARER_LONGUEUR, COMPARER_ZEROS, COMPARER_MILLIEMES, COMPARER_LARGE],
    [spec('3,9 > 3,12', 0, {'s': 0, 'a': 3, 'b': 9, 'c': 1, 'd': 2}, '2', 'correct'),
     spec('Erreur : 3,9 < 3,12', 0, {'s': 0, 'a': 3, 'b': 9, 'c': 1, 'd': 2}, '0',
          'incorrect'),
     spec('3,12 < 3,9', 0, {'s': 1, 'a': 3, 'b': 9, 'c': 1, 'd': 2}, '0', 'correct'),
     spec('2,5 = 2,50', 1, {'s': 0, 'a': 2, 'b': 5, 'z': 0}, '1', 'correct'),
     spec('Erreur : 2,5 < 2,50', 1, {'s': 0, 'a': 2, 'b': 5, 'z': 0}, '0', 'incorrect'),
     spec('3,4 > 3,04', 1, {'s': 0, 'a': 3, 'b': 4, 'z': 2}, '2', 'correct'),
     spec('Erreur : 3,4 = 3,04', 1, {'s': 0, 'a': 3, 'b': 4, 'z': 2}, '1', 'incorrect'),
     spec('4,527 > 4,52', 2, {'s': 0, 'a': 4, 'b': 5, 'c': 2, 'd': 7}, '2', 'correct'),
     spec('3,4 ⩽ 3,40 : vrai', 3, {'q': 0, 'a': 3, 'b': 4, 'c': 1, 'd': 2}, '0', 'correct'),
     spec('Erreur : 3,4 ⩽ 3,40 faux', 3, {'q': 0, 'a': 3, 'b': 4, 'c': 1, 'd': 2}, '1',
          'incorrect'),
     spec('3,4 ⩽ 3,12 : faux', 3, {'q': 2, 'a': 3, 'b': 4, 'c': 1, 'd': 2}, '1', 'correct')]))

# --- 7. 6-111 : arrondir un décimal -------------------------------------------------------

AU_RANG = ['à l\'unité', 'au dixième', 'au centième']
SUIVANT = ['dixièmes', 'centièmes', 'millièmes']
REGLE_ARRONDI = ('**Arrondir.** On regarde le chiffre juste après le rang demandé : s\'il vaut'
                 ' $5$ ou plus, on ajoute $1$ au rang demandé ; sinon, on le garde. Puis on'
                 ' efface les chiffres suivants.')


def arrondi(k, variables, valeur, suivant, conditions, nombre='{{x}}', retenue=None):
    """Arrondi au rang k (0 unité, 1 dixième, 2 centième) ; `suivant` = chiffre qui décide."""
    return variation(
        'Donne la valeur arrondie ' + AU_RANG[k] + ' de $' + nombre + '$.\n\n$$' + nombre
        + ' \\approx ?$$',
        variables, ['{{' + valeur + '}}'],
        [REGLE_ARRONDI,
         'Le chiffre des ' + SUIVANT[k] + ' est $' + col(suivant, 1) + '$ : {{if:' + suivant
         + '>=5|$5$ ou plus, on arrondit au-dessus|moins de $5$, on garde le chiffre}}.',
         *([retenue] if retenue else []),
         '$$' + nombre + ' \\approx ' + col('{{solution}}') + '$$'],
        conditions)


ARRONDI_UNITE = arrondi(
    0, [var('a', '1..99'), var('D', '1..99'), var('x', 'eval:a+D/100;d'),
        var('v', 'eval:a+floor(D/50)'), var('h', 'eval:floor(D/10)')],
    'v', '{{h}}', ['D!=50'])
ARRONDI_DIXIEME = arrondi(
    1, [var('a', '0..99'), var('D', '1..999'), var('x', 'eval:a+D/1000;d'),
        var('v', 'eval:round((1000*a+D)/100)/10;d'), var('h', 'eval:mod(floor(D/10),10)')],
    'v', '{{h}}', ['mod(D,100)!=50', 'floor(D/100)!=9'])
ARRONDI_CENTIEME = arrondi(
    2, [var('a', '0..99'), var('D', '1..999'), var('x', 'eval:a+D/1000;d'),
        var('v', 'eval:round((1000*a+D)/10)/100;d'), var('h', 'eval:mod(D,10)')],
    'v', '{{h}}', ['mod(D,10)!=0', 'mod(floor(D/10),10)!=9'])
# Retenue : a,9d au dixième (→ a + 1) ; le zéro final de « 4,0 » est une forme à améliorer
ARRONDI_RETENUE = arrondi(
    1, [var('a', '0..99'), var('d', '5..9'), var('x', 'eval:a+0.9+d/100;d'),
        var('v', 'eval:a+1')],
    'v', '{{d}}', None,
    retenue='$9$ dixièmes $+ 1$ dixième $= 10$ dixièmes $= 1$ unité : ${{a}}.9 + 0.1 = {{v}}$.'
    ' On n\'écrit pas de zéro inutile après la virgule.')

MODELES.append(modele(
    '07-arrondir-un-decimal', 'Arrondir un nombre décimal',
    'Arrondir à l\'unité, au dixième, au centième un décimal à 2 ou 3 décimales (retenue comprise'
    ' : 3,96 → 4)',
    'Décimaux', 'Arrondir', 1,
    [ARRONDI_UNITE, ARRONDI_DIXIEME, ARRONDI_CENTIEME, ARRONDI_RETENUE],
    [spec('12,63 → 13', 0, {'a': 12, 'D': 63, 'x': '12.63', 'v': 13, 'h': 6}, '13', 'correct'),
     spec('Erreur : troncature (12)', 0, {'a': 12, 'D': 63, 'x': '12.63', 'v': 13, 'h': 6}, '12',
          'incorrect'),
     spec('13,478 → 13,5', 1, {'a': 13, 'D': 478, 'x': '13.478', 'v': '13.5', 'h': 7}, '13,5',
          'correct'),
     spec('Erreur : troncature (13,4)', 1,
          {'a': 13, 'D': 478, 'x': '13.478', 'v': '13.5', 'h': 7}, '13,4', 'incorrect'),
     spec('Erreur : arrondi au centième (13,48)', 1,
          {'a': 13, 'D': 478, 'x': '13.478', 'v': '13.5', 'h': 7}, '13,48', 'incorrect'),
     spec('5,213 → 5,21', 2, {'a': 5, 'D': 213, 'x': '5.213', 'v': '5.21', 'h': 3}, '5,21',
          'correct'),
     spec('3,96 → 4', 3, {'a': 3, 'd': 6, 'x': '3.96', 'v': 4}, '4', 'correct'),
     spec('3,96 → 4,0 : forme à améliorer', 3, {'a': 3, 'd': 6, 'x': '3.96', 'v': 4}, '4,0',
          'unoptimal_form', ['zeros']),
     spec('Erreur : 3,10', 3, {'a': 3, 'd': 6, 'x': '3.96', 'v': 4}, '3,10', 'incorrect')]))

# --- 8. 6-112 : arrondir un non décimal ---------------------------------------------------


def arrondi_quotient(b, plage):
    return variation(
        'Donne la valeur arrondie {{if:k==1|au dixième|au centième}} de $\\frac{{{a}}}{' + str(b)
        + '}$.\n\n$$\\frac{{{a}}}{' + str(b) + '} \\approx ?$$',
        [var('a', plage), var('k', '1..2'),
         var('v', 'eval:round(a/' + str(b) + '*10^k)/10^k;d'),
         var('h', 'eval:mod(floor(a*10^(k+1)/' + str(b) + '),10)')],
        ['{{v}}'],
        ['On pose la division : ${{a}} \\div ' + str(b) + ' = {{eval:floor(1000*a/' + str(b)
         + ')/1000;d}}\\ldots$ Elle ne s\'arrête jamais : on l\'arrête un rang après celui'
         ' qu\'on demande.',
         REGLE_ARRONDI.replace('**Arrondir.** ', ''),
         'Le chiffre des {{if:k==1|centièmes|millièmes}} est $' + col('{{h}}', 1)
         + '$ : {{if:h>=5|on arrondit au-dessus|on garde le chiffre}}.',
         '$$\\frac{{{a}}}{' + str(b) + '} \\approx ' + col('{{solution}}') + '$$'],
        ['mod(a,' + str(b) + ')!=0', 'mod(a,3)!=0'] if b == 3 else ['mod(a,9)!=0'])


ARRONDI_PI = variation(
    'Donne la valeur arrondie ' + selon('k', AU_RANG) + ' du nombre $\\pi$.\n\n$$\\pi \\approx ?$$',
    [var('k', '0..2')],
    [selon('k', ['3', '3.1', '3.14'])],
    ['$\\pi = 3.14159\\ldots$ (ses chiffres ne s\'arrêtent jamais : ce n\'est pas un nombre'
     ' décimal).',
     REGLE_ARRONDI,
     '$$\\pi \\approx ' + col('{{solution}}') + '$$'])

MODELES.append(modele(
    '08-arrondir-un-non-decimal', 'Arrondir un quotient, arrondir π',
    'Valeur arrondie au dixième ou au centième de a/3 et a/9 (division qui ne s\'arrête pas) ;'
    ' arrondi de π à l\'unité, au dixième, au centième',
    'Décimaux', 'Arrondir', 2,
    [arrondi_quotient(3, '1..20'), arrondi_quotient(9, '1..40'), ARRONDI_PI],
    [spec('2/3 au centième : 0,67', 0, {'a': 2, 'k': 2, 'v': '0.67', 'h': 6}, '0,67', 'correct'),
     spec('Erreur : troncature (0,66)', 0, {'a': 2, 'k': 2, 'v': '0.67', 'h': 6}, '0,66',
          'incorrect'),
     spec('Erreur : 0,6 (dixième)', 0, {'a': 2, 'k': 2, 'v': '0.67', 'h': 6}, '0,6',
          'incorrect'),
     spec('7/9 au dixième : 0,8', 1, {'a': 7, 'k': 1, 'v': '0.8', 'h': 7}, '0,8', 'correct'),
     spec('π au centième : 3,14', 2, {'k': 2}, '3,14', 'correct'),
     spec('Erreur : 3,15', 2, {'k': 2}, '3,15', 'incorrect')]))

# --- 9. 6-113 : encadrer ------------------------------------------------------------------

AU_RANG_PRES = ['à l\'unité près', 'au dixième près', 'au centième près']
PAS = ['1', '0.1', '0.01']
RANGS = ['unités', 'dixièmes', 'centièmes']


def encadrement(variables, bas, haut, conditions):
    return variation(
        'Encadre ce nombre ' + selon('k', AU_RANG_PRES) + '.\n\n$${{expression1}}$$',
        variables + [var('expression1', '?<{{x}}<?')],
        ['{{' + bas + '}}', '{{' + haut + '}}'],
        ['**Encadrer.** On garde les chiffres jusqu\'au rang demandé : c\'est le nombre de'
         ' gauche. On lui ajoute $1$ ' + selon('k', ['unité', 'dixième', 'centième']) + ' ($'
         + selon('k', PAS) + '$) : c\'est le nombre de droite.',
         '$${{' + bas + '}} + ' + col(selon('k', PAS), 1) + ' = {{' + haut + '}}$$',
         '$$' + col('{{' + bas + '}}') + ' < {{x}} < ' + col('{{' + haut + '}}') + '$$'],
        conditions)


ENCADRER = encadrement(
    [var('k', '0..2'), var('a', '0..99'), var('D', '1..999'), var('N', 'eval:1000*a+D'),
     var('x', 'eval:N/1000;d'), var('g', 'eval:floor(N/10^(3-k))/10^k;d'),
     var('h', 'eval:(floor(N/10^(3-k))+1)/10^k;d')],
    'g', 'h', ['mod(D,10)!=0'])
# Piège du 9 : 2,98 au dixième → 2,9 < 2,98 < 3 (et non 2,10)
ENCADRER_9 = encadrement(
    [var('k', '1..2'), var('a', '0..99'), var('b', '0..8'), var('d', '1..9'),
     var('x', '{{if:k==1|{{eval:a+0.9+d/100;d}}|{{eval:a+b/10+0.09+d/1000;d}}}}'),
     var('g', '{{if:k==1|{{eval:a+0.9;d}}|{{eval:a+b/10+0.09;d}}}}'),
     var('h', '{{if:k==1|{{eval:a+1}}|{{eval:a+(b+1)/10;d}}}}')],
    'g', 'h', None)

MODELES.append(modele(
    '09-encadrer-un-decimal', 'Encadrer un nombre décimal',
    'Encadrer un décimal à 3 décimales à l\'unité, au dixième ou au centième près (piège du 9 :'
    ' 2,9 < 2,98 < 3)',
    'Décimaux', 'Encadrer', 4, [ENCADRER, ENCADRER_9],
    [spec('3,478 au dixième : 3,4 et 3,5', 0,
          {'k': 1, 'a': 3, 'D': 478, 'N': 3478, 'x': '3.478', 'g': '3.4', 'h': '3.5'},
          ['3,4', '3,5'], 'correct'),
     spec('Erreur : arrondis (3,5 et 3,6)', 0,
          {'k': 1, 'a': 3, 'D': 478, 'N': 3478, 'x': '3.478', 'g': '3.4', 'h': '3.5'},
          ['3,5', '3,6'], 'incorrect'),
     spec('2,98 au dixième : 2,9 et 3', 1,
          {'k': 1, 'a': 2, 'b': 0, 'd': 8, 'x': '2.98', 'g': '2.9', 'h': '3'}, ['2,9', '3'],
          'correct'),
     spec('Erreur : 2,9 et 2,10', 1,
          {'k': 1, 'a': 2, 'b': 0, 'd': 8, 'x': '2.98', 'g': '2.9', 'h': '3'}, ['2,9', '2,10'],
          'incorrect'),
     spec('5,397 au centième : 5,39 et 5,4', 1,
          {'k': 2, 'a': 5, 'b': 3, 'd': 7, 'x': '5.397', 'g': '5.39', 'h': '5.4'},
          ['5,39', '5,4'], 'correct')],
    delay=30))

# --- 10. 6-202 : intercaler ---------------------------------------------------------------


def intercaler(variables, bas, haut, exemple, steps, conditions=None):
    return variation(
        'Écris un nombre décimal compris entre $' + bas + '$ et $' + haut + '$.\n\n$$' + bas
        + ' < ? < ' + haut + '$$',
        variables,
        [{'expectedAnswer': exemple, 'rulesSuffice': True,
          'validationRules': [{'type': 'range', 'min': bas, 'max': haut, 'inclusive': False}]}],
        steps, conditions)


INTERCALER_DIXIEMES = intercaler(
    [var('a', '0..20'), var('b', '0..9'), var('lo', 'eval:a+b/10;d'),
     var('hi', 'eval:a+(b+1)/10;d')],
    '{{lo}}', '{{hi}}', '{{eval:a+b/10+0.05;d}}',
    ['**Intercaler.** On écrit les deux nombres avec un chiffre de plus après la virgule : il'
     ' apparaît de la place entre eux.',
     '${{lo}} = {{a}}.{{b}}0$ et ${{hi}} = {{if:b==9|{{eval:a+1}}.00|{{a}}.{{eval:b+1}}0}}$ : tout nombre de centièmes'
     ' entre ${{b}}0$ et ${{eval:10*(b+1)}}$ convient, par exemple $' + col('{{solution}}')
     + '$ (mais aussi ${{eval:a+b/10+0.01;d}}$, ${{eval:a+b/10+0.08;d}}$…).'])

INTERCALER_CENTIEMES = intercaler(
    [var('a', '0..20'), var('B', '1..98'), var('lo', 'eval:a+B/100;d'),
     var('hi', 'eval:a+(B+1)/100;d')],
    '{{lo}}', '{{hi}}', '{{eval:a+B/100+0.005;d}}',
    ['**Intercaler.** On écrit les deux nombres avec un chiffre de plus après la virgule : il'
     ' apparaît de la place entre eux.',
     '${{lo}} = {{a}}.{{if:B<10|0|}}{{B}}0$ et ${{hi}} = {{a}}.{{if:B<9|0|}}{{eval:B+1}}0$ :'
     ' par exemple $'
     + col('{{solution}}') + '$ (mais aussi ${{eval:a+B/100+0.001;d}}$,'
     ' ${{eval:a+B/100+0.009;d}}$…).'],
    ['mod(B,10)!=0'])

INTERCALER_LONGUEURS = intercaler(
    [var('a', '0..20'), var('b', '1..9'), var('lo', 'eval:a+b/10;d'),
     var('hi', 'eval:a+b/10+0.01;d')],
    '{{lo}}', '{{hi}}', '{{eval:a+b/10+0.005;d}}',
    ['**Intercaler.** On écrit les deux nombres avec autant de chiffres après la virgule, plus'
     ' un : il apparaît de la place entre eux.',
     '${{lo}} = {{a}}.{{b}}00$ et ${{hi}} = {{a}}.{{b}}10$ : par exemple $'
     + col('{{solution}}') + '$ (mais aussi ${{eval:a+b/10+0.001;d}}$,'
     ' ${{eval:a+b/10+0.009;d}}$…).'])

SPEC_34 = {'a': 3, 'b': 4, 'lo': '3.4', 'hi': '3.5'}
MODELES.append(modele(
    '10-intercaler-un-decimal', 'Intercaler un nombre décimal',
    'Écrire un décimal strictement compris entre deux décimaux (dixièmes consécutifs, centièmes'
    ' consécutifs, 5,3 et 5,31) ; toute réponse comprise est juste',
    'Décimaux', 'Encadrer', 5, [INTERCALER_DIXIEMES, INTERCALER_CENTIEMES, INTERCALER_LONGUEURS],
    [spec('3,45', 0, SPEC_34, '3,45', 'correct'),
     spec('3,41', 0, SPEC_34, '3,41', 'correct'),
     spec('3,499', 0, SPEC_34, '3,499', 'correct'),
     spec('Erreur : 3,04', 0, SPEC_34, '3,04', 'incorrect'),
     spec('Erreur : la borne 3,5', 0, SPEC_34, '3,5', 'incorrect'),
     spec('Erreur : 3,6', 0, SPEC_34, '3,6', 'incorrect'),
     spec('2,315 entre 2,31 et 2,32', 1, {'a': 2, 'B': 31, 'lo': '2.31', 'hi': '2.32'}, '2,315',
          'correct'),
     spec('Erreur : 2,4 entre 2,31 et 2,32', 1, {'a': 2, 'B': 31, 'lo': '2.31', 'hi': '2.32'},
          '2,4', 'incorrect'),
     spec('5,305 entre 5,3 et 5,31', 2, {'a': 5, 'b': 3, 'lo': '5.3', 'hi': '5.31'}, '5,305',
          'correct'),
     spec('Erreur : 5,4', 2, {'a': 5, 'b': 3, 'lo': '5.3', 'hi': '5.31'}, '5,4', 'incorrect')]))

os.makedirs(DOSSIER, exist_ok=True)
for nom, m in MODELES:
    with open(os.path.join(DOSSIER, nom + '.json'), 'w', encoding='utf-8') as f:
        json.dump(m, f, ensure_ascii=False, indent='\t')
        f.write('\n')
print(f'{len(MODELES)} modèles écrits dans {DOSSIER}')
