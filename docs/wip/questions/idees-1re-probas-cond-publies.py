"""Ajoute les variations validées aux 2 modèles publiés exportés de prod dans
scripts/questions/idees-1re-probas-cond-publies/ (chantier idees-1re-probas-cond).

Phase 0 : fiches docs/archive/wip/idees-1re-probas-cond/idees-1re-probas-cond-fiches.md, validées par David le 2026-11-24 :
F1 (V5 de 31096bae, point 2-395) et F3 (V4 de 69a05f98, point 1SPE-340). Les variations
s'ajoutent À LA FIN (les réponses des élèves gardent l'indice de leur variation) ; la migration de
contenu est générée par scripts/questions/migration-contenu.ts.

Le script repart du contenu de prod (variations et specs d'origine, comptées dans ORIGINE) :
le relancer réécrit les ajouts sans les doubler. Options et partagé des modèles inchangés.

Pièges : un message d'erreur prévue est réécrit à la résolution ($P(B)$ → $P \\left( B \\right)$) :
la spec le compare sous sa forme réécrite (table REECRIT) ; 31096bae n'a pas d'options (espaces
des grands nombres actifs) : les réponses de F1 ont au plus trois décimales.

Usage : python3 docs/wip/questions/idees-1re-probas-cond-publies.py scripts/questions/idees-1re-probas-cond-publies
"""
import json
import os
import sys

DOSSIER = sys.argv[1]

PRIMAIRE = '\\textcolor{{{color:primary.0}}}'

# id court → (variations, specs) d'origine en prod (export du 2026-11-24)
ORIGINE = {'31096bae': (4, 8), '69a05f98': (3, 17)}

# Messages tels que la résolution les réécrit : la spec compare le message résolu. Relevés par
# question:specs le 2026-11-24.
REECRIT = {'$P(A)$ ne compte que les valises à quatre roues : $A\\cap B$ demande aussi que la valise ait réussi les tests.': '$P \\left( A \\right)$ ne compte que les valises à quatre roues : $A\\cap B$ demande aussi que la valise ait réussi les tests.', 'Tu as calculé $P_B(A)$ : la condition est $\\overline{B}$, pas $B$.': 'Tu as calculé $P_B \\left( A \\right)$ : la condition est $\\overline{B}$, pas $B$.'}


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


def var(nom, expression):
    return {'name': nom, 'expression': expression}


def erreur(answer, message, label):
    return {'answer': answer, 'message': message, 'label': label}


def case(attendue, erreurs=None):
    c = {'expectedAnswer': attendue}
    if erreurs:
        c['expectedErrors'] = erreurs
    return c


def variation(statement, variables, blanks, steps, hint, conditions=None):
    return {'statement': statement, 'variables': variables, 'conditions': conditions or [],
            'blanks': blanks, 'correction': {'steps': steps}, 'hint': hint}


def ajouter(court, variations, specs):
    chemin = os.path.join(DOSSIER, court + '.json')
    with open(chemin, encoding='utf-8') as f:
        m = json.load(f)
    nv, ns = ORIGINE[court]
    assert len(m['variations']) >= nv and len(m['testSpecs']) >= ns, court
    m['variations'] = m['variations'][:nv]
    m['testSpecs'] = m['testSpecs'][:ns]
    for s in specs:
        s['variationIndex'] += nv
    m['variations'] += variations
    m['testSpecs'] += specs
    with open(chemin, 'w', encoding='utf-8') as f:
        json.dump(m, f, ensure_ascii=False, indent=2)
        f.write('\n')
    print(court, ':', len(variations), 'variations,', len(specs), 'specs ajoutées')


# =============================================================================================
# F1 — 31096bae, V5 : lire trois probabilités dans un énoncé à six informations (1P10-1).
# P(A) = a %, P_A(B) = b %, P_Ā(B) = c % ; les trois autres valeurs sont arrondies au dixième de
# pour cent, et l'énoncé affiche exactement les nombres attendus. Rien à calculer : c'est de la
# lecture (bornes de 2de, l2-4).
# =============================================================================================

PAB = 'round(a*b/10)'                       # P(A ∩ B) en dixièmes de pour cent
PB = 'round((a*b+(100-a)*c)/10)'            # P(B) en dixièmes de pour cent
PBA = 'round(1000*(100-a)*c/(a*b+(100-a)*c))'  # P_B(Ā) en dixièmes de pour cent

ERR_PB = ('Tu as donné la proportion de valises qui ont réussi les tests, sans condition : '
          '$P_{\\overline{A}}(B)$ se lit dans la phrase « parmi les valises à deux roues ».')
ERR_PAB = ('Tu as lu la phrase des valises à **quatre** roues : $\\overline{A}$ désigne les valises '
           'à deux roues.')
ERR_INVERSE = ('Tu as inversé condition et évènement : dans $P_{\\overline{A}}(B)$, la condition '
               'est $\\overline{A}$ (« parmi les valises à deux roues »).')
ERR_INTER_COND = ('Tu as lu une phrase « parmi… » : $P(A\\cap B)$ est la proportion de **toutes** '
                  'les valises qui ont quatre roues **et** ont réussi les tests.')
ERR_INTER_PA = ('$P(A)$ ne compte que les valises à quatre roues : $A\\cap B$ demande aussi que la '
                'valise ait réussi les tests.')
ERR_PBA_INVERSE = ('Tu as inversé condition et évènement : dans $P_B(\\overline{A})$, la condition '
                   'est $B$ (« parmi les valises qui ont réussi les tests »).')
ERR_PBA_PB = ('Tu as donné la proportion de valises qui ont réussi : on demande, parmi elles, la '
              'proportion de valises à deux roues.')

v310, s310 = [], []
v310.append(variation(
    'Une usine fabrique des valises à deux roues ou à quatre roues, et chaque valise passe des tests '
    'de solidité. On choisit une valise au hasard dans la production. On note $A$ l\'événement '
    '« la valise a quatre roues » et $B$ l\'événement « la valise a réussi les tests ». On sait '
    'que :\n\n'
    '- ${{a}}\\,\\%$ des valises ont quatre roues ;\n'
    '- ${{eval:' + PB + '/10;d}}\\,\\%$ des valises ont réussi les tests ;\n'
    '- parmi les valises à quatre roues, ${{b}}\\,\\%$ ont réussi les tests ;\n'
    '- parmi les valises qui ont réussi les tests, ${{eval:' + PBA + '/10;d}}\\,\\%$ ont deux roues ;\n'
    '- ${{eval:' + PAB + '/10;d}}\\,\\%$ des valises ont quatre roues et ont réussi les tests ;\n'
    '- parmi les valises à deux roues, ${{c}}\\,\\%$ ont réussi les tests.\n\n'
    'Lis dans l\'énoncé chacune des probabilités suivantes et donne-la en écriture décimale.\n\n'
    '$P_{\\overline{A}}(B)=?$\n\n$P(A\\cap B)=?$\n\n$P_B(\\overline{A})=?$',
    [var('a', '45..55'), var('b', '83..93'), var('c', '85..98')],
    [case('{{eval:c/100;d}}', [
        erreur('{{eval:' + PB + '/1000;d}}', ERR_PB, 'P(B) au lieu de P_Ā(B)'),
        erreur('{{eval:b/100;d}}', ERR_PAB, 'P_A(B) au lieu de P_Ā(B)'),
        erreur('{{eval:' + PBA + '/1000;d}}', ERR_INVERSE, 'P_B(Ā) au lieu de P_Ā(B)'),
    ]),
     case('{{eval:' + PAB + '/1000;d}}', [
         erreur('{{eval:b/100;d}}', ERR_INTER_COND, 'P_A(B) au lieu de P(A ∩ B)'),
         erreur('{{eval:a/100;d}}', ERR_INTER_PA, 'P(A) au lieu de P(A ∩ B)'),
     ]),
     case('{{eval:' + PBA + '/1000;d}}', [
         erreur('{{eval:c/100;d}}', ERR_PBA_INVERSE, 'P_Ā(B) au lieu de P_B(Ā)'),
         erreur('{{eval:' + PB + '/1000;d}}', ERR_PBA_PB, 'P(B) au lieu de P_B(Ā)'),
     ])],
    ['« Parmi les… » désigne la condition, écrite en indice ; une phrase sans « parmi » donne une '
     'probabilité sans condition.',
     '« Parmi les valises à deux roues, ${{c}}\\,\\%$ ont réussi les tests » : '
     '$P_{\\overline{A}}(B)=' + PRIMAIRE + '{ {{eval:c/100;d}} }$.',
     '« ${{eval:' + PAB + '/10;d}}\\,\\%$ des valises ont quatre roues et ont réussi les tests » : '
     '$P(A\\cap B)=' + PRIMAIRE + '{ {{eval:' + PAB + '/1000;d}} }$.',
     '« Parmi les valises qui ont réussi les tests, ${{eval:' + PBA + '/10;d}}\\,\\%$ ont deux roues » : '
     '$P_B(\\overline{A})=' + PRIMAIRE + '{ {{eval:' + PBA + '/1000;d}} }$.'],
    '« Parmi les … » désigne la condition : c\'est l\'évènement écrit en indice.',
    ['a != 50', 'b != c', PB + ' != 10*c', PBA + ' != 10*c', PBA + ' != 10*a', PBA + ' != ' + PAB,
     PAB + ' != 10*a']))
v = {'a': 52, 'b': 88, 'c': 91}
# P(A ∩ B) = 45,76 → 45,8 % ; P(B) = (4576 + 4368)/100 = 89,44 → 89,4 % ;
# P_B(Ā) = 4368/8944 = 48,84 → 48,8 %
s310 += [spec('V5 : 0,91 ; 0,458 ; 0,488', 0, v, 'correct', ['0{,}91', '0{,}458', '0{,}488']),
         spec('V5 : point décimal', 0, v, 'correct', ['0.91', '0.458', '0.488']),
         spec('V5 : pourcentage refusé', 0, v, 'bad_form', ['91\\%', '0{,}458', '0{,}488']),
         spec('V5 : P(B) au lieu de P_Ā(B)', 0, v, 'incorrect', ['0{,}894', '0{,}458', '0{,}488'],
              ERR_PB),
         spec('V5 : P_A(B) au lieu de P_Ā(B)', 0, v, 'incorrect', ['0{,}88', '0{,}458', '0{,}488'],
              ERR_PAB),
         spec('V5 : P_B(Ā) au lieu de P_Ā(B)', 0, v, 'incorrect', ['0{,}488', '0{,}458', '0{,}488'],
              ERR_INVERSE),
         spec('V5 : P_A(B) au lieu de P(A ∩ B)', 0, v, 'incorrect', ['0{,}91', '0{,}88', '0{,}488'],
              ERR_INTER_COND),
         spec('V5 : P(A) au lieu de P(A ∩ B)', 0, v, 'incorrect', ['0{,}91', '0{,}52', '0{,}488'],
              ERR_INTER_PA),
         spec('V5 : P_Ā(B) au lieu de P_B(Ā)', 0, v, 'incorrect', ['0{,}91', '0{,}458', '0{,}91'],
              ERR_PBA_INVERSE),
         spec('V5 : P(B) au lieu de P_B(Ā)', 0, v, 'incorrect', ['0{,}91', '0{,}458', '0{,}894'],
              ERR_PBA_PB)]

ajouter('31096bae', v310, s310)

# =============================================================================================
# F3 — 69a05f98, V4 : P_B̄(A) sur un arbre en dixièmes (1P11-1), fraction irréductible.
# =============================================================================================

ERR_ENVERS = ('Tu as donné $P_A(\\overline{B})$, lue sur l\'arbre : on demande la probabilité de '
              '$A$ sachant $\\overline{B}$.')
ERR_SANS_DIV = 'Tu as donné $P(A\\cap\\overline{B})$ : il reste à diviser par $P(\\overline{B})$.'
ERR_BARRE = 'Tu as calculé $P_B(A)$ : la condition est $\\overline{B}$, pas $B$.'
NUM = 'a*(10-b)'
DEN = 'a*(10-b)+(10-a)*(10-c)'

v69, s69 = [], []
v69.append(variation(
    'On considère l\'arbre pondéré ci-dessous.\n\n```probtree\nA:0.{{a}}\n  B:0.{{b}}\n'
    '  \\overline{B}:0.{{eval:10-b}}\n\\overline{A}:0.{{eval:10-a}}\n  B:0.{{c}}\n'
    '  \\overline{B}:0.{{eval:10-c}}\n```\n\nDonne le résultat en fraction irréductible.\n\n'
    '$P_{\\overline{B}}(A)=?$',
    [var('a', '1..9'), var('b', '1..9'), var('c', '1..9')],
    [case('{{eval:' + NUM + '/(' + DEN + ')}}', [
        erreur('{{eval:(10-b)/10}}', ERR_ENVERS, 'P_A(B̄) au lieu de P_B̄(A)'),
        erreur('{{eval:' + NUM + '/100}}', ERR_SANS_DIV, 'Division oubliée'),
        erreur('{{eval:a*b/(a*b+(10-a)*c)}}', ERR_BARRE, 'P_B(A) au lieu de P_B̄(A)'),
    ])],
    ['Par définition, $P_{\\overline{B}}(A)=\\dfrac{P(A\\cap \\overline{B})}{P(\\overline{B})}$. '
     'L\'arbre donne $P_A(\\overline{B})$, pas $P_{\\overline{B}}(A)$.',
     '$P(A\\cap \\overline{B})=0.{{a}}\\times0.{{eval:10-b}}={{eval:' + NUM + '/100;d}}$ et '
     '$P(\\overline{A}\\cap \\overline{B})=0.{{eval:10-a}}\\times0.{{eval:10-c}}'
     '={{eval:(10-a)*(10-c)/100;d}}$, donc, d\'après la formule des probabilités totales, '
     '$P(\\overline{B})={{eval:(' + DEN + ')/100;d}}$.',
     '$P_{\\overline{B}}(A)={{eval:' + NUM + '/100;d}}\\div{{eval:(' + DEN + ')/100;d}}=' + PRIMAIRE
     + '{ {{eval:' + NUM + '/(' + DEN + ')}} }$'],
    'Calcule d\'abord $P(\\overline{B})$ par la formule des probabilités totales.',
    ['b != c', 'a*b != (10-a)*(10-c)']))
v = {'a': 3, 'b': 6, 'c': 2}
# P(A ∩ B̄) = 0,12 ; P(B̄) = 0,12 + 0,56 = 0,68 ; P_B̄(A) = 12/68 = 3/17
s69 += [spec('V4 : 0,12 / 0,68 = 3/17', 0, v, 'correct', ['\\frac{3}{17}']),
        spec('V4 : non réduite 12/68', 0, v, 'unoptimal_form', ['\\frac{12}{68}'],
             violations=['reducedFractions']),
        spec('V4 : P_A(B̄)', 0, v, 'incorrect', ['0{,}4'], ERR_ENVERS),
        spec('V4 : division oubliée', 0, v, 'incorrect', ['\\frac{3}{25}'], ERR_SANS_DIV),
        spec('V4 : P_B(A)', 0, v, 'incorrect', ['\\frac{9}{16}'], ERR_BARRE)]
v = {'a': 4, 'b': 5, 'c': 6}
# P(A ∩ B̄) = 0,2 ; P(B̄) = 0,2 + 0,24 = 0,44 ; P_B̄(A) = 5/11
s69 += [spec('V4 : 0,2 / 0,44 = 5/11', 0, v, 'correct', ['\\frac{5}{11}'])]

ajouter('69a05f98', v69, s69)
