#!/usr/bin/env python3
"""PR 2 de l'étape e (passe lycée) : 4 libellés corrigés, 2 points neufs (exponentielle).

Décisions de David du 2026-10-23 (bornes/2de.json, bornes/1gen.json : « libelle_corrige » ;
bornes/tspe.json, bornes/tcomp.md : « point_neuf », TSPE-444 option A). Écrit la fixture du test
(tests/integration/fixtures/passe-lycee-libelles.json) et transforme les fixtures des seeds.
À ne jouer qu'UNE fois, sur les fixtures d'avant (le script refuse sinon).
"""
import json
from pathlib import Path

RACINE = Path(__file__).resolve().parents[3]
FIX = RACINE / 'tests/integration/fixtures'
BORNES = Path(__file__).resolve().parent / 'bornes'

RENOMMES = [('2', '2-273', '2de'), ('1_GEN', '1GEN-029', '1gen'), ('1_GEN', '1GEN-030', '1gen'),
            ('1_GEN', '1GEN-031', '1gen')]
NOM_NEUF = "Utiliser l'équation fonctionnelle de l'exponentielle pour transformer une écriture"
# (grade, code neuf, voisin : le point neuf s'affiche juste après lui, fixture du seed)
NEUFS = [('T_SPE', 'TSPE-626', 'TSPE-444', 'tspe'), ('T_COMP', 'TCOMP-379', 'TCOMP-236', 'tcomp')]
NOEUD = ('Fonctions', 'Fonction exponentielle', 'propriétés algébriques')


def lire(nom):
    return json.loads((FIX / f'seed-{nom}-points.json').read_text())


def ecrire(nom, data):
    (FIX / f'seed-{nom}-points.json').write_text(json.dumps(data, ensure_ascii=False, indent='\t') + '\n')


def libelle_corrige(fichier, code):
    def cherche(o):
        if isinstance(o, dict):
            if code in o and isinstance(o[code], dict) and 'decision_libelle' in o[code]:
                return o[code]['decision_libelle']['libelle_corrige']
            for v in o.values():
                r = cherche(v)
                if r:
                    return r
        elif isinstance(o, list):
            for v in o:
                r = cherche(v)
                if r:
                    return r
        return None
    return cherche(json.loads((BORNES / f'{fichier}.json').read_text()))


def main():
    fixture = {'renommes': [], 'neufs': [], 'ordres': {}}
    seeds = {}
    for grade, code, fichier in RENOMMES:
        seed = seeds.setdefault(fichier, lire(fichier))
        p = next(p for p in seed['points'] if p['code'] == code)
        nouveau = libelle_corrige(fichier, code)
        assert nouveau and nouveau != p['name'], f'{code} : déjà corrigé ?'
        fixture['renommes'].append({'grade': grade, 'code': code, 'avant': p['name'], 'apres': nouveau})
        p['name'] = nouveau
    for grade, code, voisin, fichier in NEUFS:
        seed = seeds.setdefault(fichier, lire(fichier))
        assert all(p['code'] != code for p in seed['points']), f'{code} existe déjà'
        avant = [p['code'] for p in sorted(seed['points'], key=lambda p: p['display_order'])]
        v = next(p for p in seed['points'] if p['code'] == voisin)
        rang = v['display_order'] + 1
        for p in seed['points']:
            if p['display_order'] >= rang:
                p['display_order'] += 1
        neuf = {'code': code, 'grade': grade, 'display_order': rang, 'name': NOM_NEUF,
                'kind': v['kind'], 'exigence': v['exigence'], 'regime_acquisition': v['regime_acquisition'],
                'rubrique': v['rubrique'], 'branche': NOEUD[0], 'notion': NOEUD[1], 'sous_notion': NOEUD[2]}
        seed['points'].insert(seed['points'].index(v) + 1, neuf)
        apres = [p['code'] for p in sorted(seed['points'], key=lambda p: p['display_order'])]
        fixture['neufs'].append({'grade': grade, 'code': code, 'voisin': voisin, 'name': NOM_NEUF,
                                 'kind': v['kind'], 'exigence': v['exigence'],
                                 'regime_acquisition': v['regime_acquisition'], 'rubrique': v['rubrique'],
                                 'path': ' > '.join(NOEUD)})
        fixture['ordres'][grade] = {'avant': avant, 'apres': apres}
    for fichier, seed in seeds.items():
        ecrire(fichier, seed)
    (FIX / 'passe-lycee-libelles.json').write_text(json.dumps(fixture, ensure_ascii=False, indent='\t') + '\n')
    for r in fixture['renommes']:
        print(r['code'], '→', r['apres'])


if __name__ == '__main__':
    main()
