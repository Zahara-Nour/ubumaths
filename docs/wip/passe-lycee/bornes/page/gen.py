#!/usr/bin/env python3
"""Page à cocher des incertitudes sur les bornes du lycée (étape b de la passe lycée).

Lit questions-*.json et les remarques « ⚠ libellé » des <programme>.json ; écrit page.html.
Les réponses de David vivent dans la base de l'artifact (collections `reponses`, `libelles`).
"""
import json
import re
from pathlib import Path

ICI = Path(__file__).resolve().parent
BORNES = ICI.parent
PROGRAMMES = [('2de', '2'), ('1gen', '1_GEN'), ('1spe', '1_SPE'), ('tspe', 'T_SPE'), ('texp', 'T_EXP'),
              ('tcomp', 'T_COMP'), ('1techno', '1_TECHNO'), ('ttechno', 'T_TECHNO')]
NOMS = {'2': '2de', '1_GEN': '1re ES', '1_SPE': '1re spé', 'T_SPE': 'Tle spé', 'T_EXP': 'Tle expertes',
        'T_COMP': 'Tle compl.', '1_TECHNO': '1re techno', 'T_TECHNO': 'Tle techno'}

questions = []
for f in ['2de-1gen', 'spe', 'tcomp', 'techno']:
    questions += json.loads((BORNES / f'questions-{f}.json').read_text(encoding='utf-8'))
# La page range une question sous son premier niveau : un niveau inconnu la ferait disparaître sans bruit.
inconnus = [(q['id'], n) for q in questions for n in q['niveaux'] if n not in NOMS]
assert not inconnus, f'niveaux hors {list(NOMS)} : {inconnus}'

libelles = []
for fichier, grade in PROGRAMMES:
    points = json.loads((BORNES / f'{fichier}.json').read_text(encoding='utf-8'))[grade]['points']
    for code, p in points.items():
        if '⚠ libellé' in p.get('remarque', ''):
            libelles.append({'code': code, 'grade': grade, 'libelle': p['libelle'],
                             'rubrique': p.get('rubrique', ''), 'remarque': p['remarque']})

donnees = json.dumps({'questions': questions, 'libelles': libelles, 'noms': NOMS,
                      'ordre': [g for _, g in PROGRAMMES]}, ensure_ascii=False).replace('</', '<\\/')
gabarit = (ICI / 'gabarit.html').read_text(encoding='utf-8')
# Prettier (pre-commit) écrit `/*DONNEES*/ null` : tolérer l'espace, et refuser une page vide.
page, n = re.subn(r'/\*DONNEES\*/\s*null', lambda _: donnees, gabarit)
assert n == 1, f'emplacement /*DONNEES*/ trouvé {n} fois dans gabarit.html'
(ICI / 'page.html').write_text(page, encoding='utf-8')
print(len(questions), 'questions,', len(libelles), 'libellés')
