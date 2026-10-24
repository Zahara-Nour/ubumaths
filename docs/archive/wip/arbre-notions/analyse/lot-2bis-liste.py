"""Liste des modifications du lot 2 bis (modèles du primaire et du collège).

Lit les CSV de verdicts (cycle2, cm, sixieme, cycle4) et l'état de la prod (points, nœuds,
relus par l'API REST avec la clé anonyme), puis écrit `lot-2bis-modifications.md` :
déplacements de nœud exigés par la garde des tags, changements de niveau, modèles à modifier.

    python3 docs/wip/arbre-notions/analyse/lot-2bis-liste.py <dossier contenant points.json et nodes.json>
"""

import collections
import csv
import json
import sys

ANALYSE = 'docs/wip/arbre-notions/analyse/'
RELEVES = 'docs/wip/arbre-notions/releves/'
LOTS = ['cycle2', 'cm', 'sixieme', 'cycle4']
ORDRE_NIVEAUX = ['CP', 'CE1', 'CE2', 'CM1', 'CM2', '6', '5', '4', '3']

# Sous-notion proposée quand le point est posé sur une notion qui a des sous-notions
# (un modèle ne se range pas sur une telle notion) : à faire trancher par David.
SOUS_NOTION_PROPOSEE = {
    '81a64b0a': 'forme fractionnaire',
    '5d7726eb': 'forme fractionnaire',
    '00e255ee': 'comparaison et mesure',
    '78feafed': None,
    '24331791': 'ax + b = c',
    '84755a7b': 'ax + b = c',
    '372d4f79': 'ax + b = c',
    'b1550840': 'ax + b = c',
}


def genre(modification: str) -> str:
    m = modification.lower()
    if 'scinder' in m:
        return 'Scinder en deux modèles'
    if 'retirer les variations' in m or 'retirer la variation' in m:
        return 'Retirer des variations'
    if any(k in m for k in ['qcm', 'symbole', 'habiller', 'échelle', 'consigne', 'simplifie', 'écrire la variation', 'second terme']):
        return 'Changer la consigne ou l\'affichage'
    return 'Resserrer les nombres tirés'


def main() -> None:
    dossier = sys.argv[1]
    points = {(p['grade'], p['code']): p for p in json.load(open(dossier + '/points.json'))}
    noeuds = {n['id']: n for n in json.load(open(dossier + '/nodes.json'))}
    modeles = {t['id']: t for t in json.load(open(RELEVES + 'templates.json'))}

    def chemin(i: str) -> str:
        r = []
        while i:
            r.append(noeuds[i]['name'])
            i = noeuds[i]['parent_id']
        return ' > '.join(reversed(r[:-1]))  # sans la branche

    lignes = []
    for lot in LOTS:
        for x in csv.DictReader(open(ANALYSE + lot + '.csv', newline=''), delimiter=';'):
            if x['verdict'] in ('TAG', 'MODIFIER'):
                lignes.append(x)

    deplacements, a_choisir, niveaux, a_modifier = [], [], [], []
    compte = collections.Counter()
    for x in lignes:
        compte[(x['grade'], x['verdict'])] += 1
        t = modeles[x['template_id']]
        court = x['template_id'][:8]
        if x['grade'] not in t['grades']:
            niveaux.append((x, t['grades']))
        if x['verdict'] == 'MODIFIER':
            a_modifier.append(x)
        noeud = noeuds[t['classification_node_id']]
        notion = noeud['parent_id'] if noeud['kind'] == 'subnotion' else noeud['id']
        for code in x['code'].split(','):
            p = points.get((x['grade'], code))
            if not p or p['node_id'] in (noeud['id'], notion):
                continue
            cible = noeuds[p['node_id']]
            enfants = [n['name'] for n in noeuds.values() if n['parent_id'] == cible['id']]
            if enfants:
                a_choisir.append((x, chemin(noeud['id']), chemin(cible['id']), enfants, SOUS_NOTION_PROPOSEE.get(court)))
            else:
                deplacements.append((x, chemin(noeud['id']), chemin(cible['id'])))

    def cle(x):
        return (ORDRE_NIVEAUX.index(x['grade']), x['code'], x['template_id'])

    o = []
    o.append('# Lot 2 bis — modifications à faire avant et pendant la migration des tags\n')
    o.append('_Généré par `lot-2bis-liste.py` depuis les CSV de verdicts et l\'état de la prod (points, nœuds)._\n')
    o.append('## Comptes\n')
    o.append('| Niveau | TAG | MODIFIER |')
    o.append('| --- | ---: | ---: |')
    for g in ORDRE_NIVEAUX:
        o.append(f"| {g} | {compte[(g, 'TAG')]} | {compte[(g, 'MODIFIER')]} |")
    o.append(f"| **Total** | **{sum(v for (g, k), v in compte.items() if k == 'TAG')}** | **{len(a_modifier)}** |\n")

    o.append(f'## 1. Sous-notion à choisir ({len(a_choisir)} modèles)\n')
    o.append('Le point est posé sur une notion qui a des sous-notions ; le modèle doit aller dans l\'une d\'elles.\n')
    for x, de, vers, enfants, reco in sorted(a_choisir, key=lambda e: cle(e[0])):
        o.append(f"- `{x['template_id'][:8]}` {x['grade']} {x['verdict']} {x['code']} — « {x['titre']} » : {de} → **{vers}** ; "
                 f"sous-notions : {', '.join(enfants)} ; proposition : {reco or 'aucune ne convient'}")
    o.append('')

    o.append(f'## 2. Déplacements de nœud sans choix ({len(deplacements)} modèles)\n')
    o.append('Le point est sur une sous-notion voisine : le modèle y va (R2), sinon le trigger refuse le tag.\n')
    o.append('| Modèle | Niveau | Verdict | Point | Titre | De | Vers |')
    o.append('| --- | --- | --- | --- | --- | --- | --- |')
    for x, de, vers in sorted(deplacements, key=lambda e: cle(e[0])):
        o.append(f"| `{x['template_id'][:8]}` | {x['grade']} | {x['verdict']} | {x['code']} | {x['titre']} | {de} | {vers} |")
    o.append('')

    o.append(f'## 3. Changements de niveau ({len(niveaux)} modèles)\n')
    for x, avant in niveaux:
        o.append(f"- `{x['template_id'][:8]}` « {x['titre']} » : {', '.join(avant)} → {x['grade']} ({x['code']})")
    o.append('')

    o.append(f'## 4. Modèles à modifier ({len(a_modifier)})\n')
    par_genre = collections.defaultdict(list)
    for x in a_modifier:
        par_genre[genre(x['modification'])].append(x)
    for g in ['Resserrer les nombres tirés', 'Retirer des variations', 'Changer la consigne ou l\'affichage', 'Scinder en deux modèles']:
        o.append(f'### {g} ({len(par_genre[g])})\n')
        o.append('| Modèle | Niveau | Point | Titre | Sous-titre | Modification |')
        o.append('| --- | --- | --- | --- | --- | --- |')
        for x in sorted(par_genre[g], key=cle):
            mod = x['modification'].replace('|', '\\|').replace('\n', ' ')
            st = x['sous_titre'].replace('|', '\\|')
            o.append(f"| `{x['template_id'][:8]}` | {x['grade']} | {x['code']} | {x['titre']} | {st} | {mod} |")
        o.append('')

    open(ANALYSE + 'lot-2bis-modifications.md', 'w').write('\n'.join(o))
    print(len(a_choisir), len(deplacements), len(niveaux), {g: len(v) for g, v in par_genre.items()})


main()
