"""Ajoute la variation validée au modèle publié 311bf024 (« Convertir des durées », 6-159),
exporté de prod dans scripts/questions/idees-6e-durees-publies/ (chantier idees-6e-durees).

Phase 0 validée par David le 2026-11-27 (« je valide les modèles ») : F1, « a,75 h = ? h ? min ».
311bf024 tire 0,1 h, 0,25 h et 0,5 h ; il lui manquait les trois quarts d'heure. La variation
s'ajoute À LA FIN (les réponses des élèves gardent l'indice de leur variation) ; la migration de
contenu est générée par scripts/questions/migration-contenu.ts. Seuls `variations` et
`testSpecs` changent : ni titre, ni niveaux, ni options, ni description.

Le script repart du contenu de prod (variations et specs d'origine, comptées dans ORIGINE) :
le relancer réécrit l'ajout sans le doubler.

Usage : python3 docs/wip/questions/idees-6e-durees-publies.py scripts/questions/idees-6e-durees-publies
"""
import json
import os
import sys

DOSSIER = sys.argv[1]

PRIMAIRE = '\\textcolor{{{color:primary.0}}}'

# id court → (variations, specs) d'origine en prod (export du 2026-11-27)
ORIGINE = {'311bf024': (1, 5)}

MSG_75 = ('$0{,}75~\\unit{h}$ ne font pas $75$ min : une heure fait $60$ min, pas $100$.')


def spec(desc, vi, variables_, status, answers, message=None):
    expected = {'status': status}
    if message is not None:
        expected['expectedErrorMessage'] = message
    return {'description': desc, 'variationIndex': vi, 'variables': variables_,
            'expected': expected, 'answers': answers}


F1 = {
    'statement': 'Convertis en heures et minutes.\n\n${{eval:a+0.75;d}}~\\unit{h} = ?~\\unit{h}~?'
                 '~\\unit{min}$',
    'variables': [{'name': 'a', 'expression': '1..9'}],
    'conditions': [],
    'blanks': [
        {'expectedAnswer': '{{a}}', 'expectedErrors': [
            {'answer': '{{eval:a+1}}', 'message': MSG_75,
             'label': '0,75 h lu 75 min (1 h 15 min)'},
        ]},
        {'expectedAnswer': '45', 'expectedErrors': [
            {'answer': '75', 'message': MSG_75, 'label': '0,75 h lu 75 min'},
            {'answer': '15', 'message': MSG_75, 'label': '0,75 h lu 75 min (1 h 15 min)'},
            {'answer': '7', 'message': 'Les chiffres après la virgule ne sont pas des minutes : '
             '$0{,}75~\\unit{h}$, ce sont les trois quarts d\'une heure.',
             'label': 'Chiffre des dixièmes pris pour des minutes'},
        ]},
    ],
    'correction': {'steps': [
        '${{eval:a+0.75;d}}~\\unit{h} = {{a}}~\\unit{h} + 0{,}75~\\unit{h}$.',
        '$0{,}75~\\unit{h}$, ce sont les trois quarts d\'une heure : $0{,}75 \\times 60~\\unit{min}'
        ' = 45~\\unit{min}$.',
        '${{eval:a+0.75;d}}~\\unit{h} = ' + PRIMAIRE + '{{{a}}~\\unit{h}~45~\\unit{min}}$.',
    ]},
    'hint': '$0{,}75$, c\'est trois quarts. Combien de minutes font les trois quarts d\'une heure ?',
}

SPECS_F1 = [
    spec('2,75 h = 2 h 45 min', 1, {'a': '2'}, 'correct', ['2', '45']),
    spec('2,75 h lu 2 h 75 min', 1, {'a': '2'}, 'incorrect', ['2', '75'], MSG_75),
    spec('2,75 h lu 3 h 15 min', 1, {'a': '2'}, 'incorrect', ['3', '15'], MSG_75),
    spec('2,75 h lu 2 h 7 min', 1, {'a': '2'}, 'incorrect', ['2', '7'],
         'Les chiffres après la virgule ne sont pas des minutes : $0{,}75~\\unit{h}$, ce sont les '
         'trois quarts d\'une heure.'),
    spec('8,75 h = 8 h 45 min', 1, {'a': '8'}, 'correct', ['8', '45']),
]

AJOUTS = {'311bf024': ([F1], SPECS_F1)}

for court, (variations, specs) in AJOUTS.items():
    chemin = os.path.join(DOSSIER, court + '.json')
    with open(chemin, encoding='utf-8') as f:
        m = json.load(f)
    nv, ns = ORIGINE[court]
    m['variations'] = m['variations'][:nv] + variations
    m['testSpecs'] = m['testSpecs'][:ns] + specs
    with open(chemin, 'w', encoding='utf-8') as f:
        json.dump(m, f, ensure_ascii=False, indent='\t')
        f.write('\n')
print(len(AJOUTS), 'modèle(s) complété(s) dans', DOSSIER)
