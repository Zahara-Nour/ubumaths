#!/usr/bin/env python3
"""Génère, depuis les DÉCISIONS de David, les données de la migration des scissions (C5).

Entrées (toutes dans ce dossier) :
  - c5-scissions-spec.json : 137 points scindés, l'archivage de 3-002, les tables déjà écrites ;
  - c5-scissions-verif.json : corrections de libellés (toutes prises), familles incomplètes
    (CM1-019 / CM2-018 scindés, 3-038 archivé) ;
  - c5-scissions-manques.json + c5-scissions-reponses/verifications.json (clé « manques ») ;
  - c5-scissions-automatismes-lignes.json + réponses (« cibles », « mots ») ;
  - c5-scissions-etat-prod.json : l'état de la prod AVANT la migration (lu le 2026-10-17).

Sorties :
  - tests/integration/fixtures/scission-points-programme.json (fixture figée des tests) ;
  - les blocs de données de supabase/migrations/20261017090000_scission_points_programme.sql,
    remplacés entre les marqueurs « -- DONNÉES:<nom>:BEGIN / END » (migration ET rollback) ;
  - les fixtures de seeds touchées (tests/integration/fixtures/seed-*-points.json), transformées
    par les mêmes décisions (libellés, points neufs, ordres, références).

Usage : python3 docs/wip/arbre-notions/c5-scissions-generer.py (depuis la racine du worktree).
"""

import collections
import json
import re
import sys
from pathlib import Path

ICI = Path(__file__).resolve().parent
RACINE = ICI.parents[2]
MIGRATION = RACINE / 'supabase/migrations/20261017090000_scission_points_programme.sql'
FIXTURE = RACINE / 'tests/integration/fixtures/scission-points-programme.json'
FIXTURES_SEEDS = RACINE / 'tests/integration/fixtures'

GRADES = ['CP', 'CE1', 'CE2', 'CM1', 'CM2', '6', '5', '4', '3', '2']


def charger(nom):
    return json.loads((ICI / nom).read_text(encoding='utf-8'))


def echec(msg):
    sys.exit(f'ÉCHEC : {msg}')


spec = charger('c5-scissions-spec.json')
verif = charger('c5-scissions-verif.json')
manques = {m['id']: m for m in charger('c5-scissions-manques.json')}
lignes = charger('c5-scissions-automatismes-lignes.json')['lignes']
reponses = charger('c5-scissions-reponses/verifications.json')
prod = charger('c5-scissions-etat-prod.json')

P = {p['code']: p for p in prod['points']}
REFS_PROD = collections.defaultdict(set)
for r in prod['references']:
    REFS_PROD[r['code']].add(r['grade'])
NOEUDS = set(prod['noeuds'])

# ---------------------------------------------------------------------------
# 1. Les scissions : origine → libellés (rang 1 = l'origine, garde son code)
# ---------------------------------------------------------------------------
corrections = {c['code']: c['labels_corriges'] for c in verif['corrections']}
scissions = collections.OrderedDict()  # origine → {'labels': [...], 'source': str}

# Tables (déjà écrites dans la première version de la migration) : codes neufs IMPOSÉS.
TABLES = {
    'CP-018': ('CP-073', 'add'), 'CE1-026': ('CE1-090', 'add'), 'CE2-020': ('CE2-084', 'add'),
    'CE1-027': ('CE1-091', 'mul'), 'CE2-021': ('CE2-085', 'mul'),
}
TABLES_LABELS = {
    'add': ["Connaître les tables d'addition : donner la somme de deux nombres (3 + 4 = ?).",
            "Connaître les tables d'addition dans l'autre sens : trouver le terme manquant d'une addition (3 + ? = 7)."],
    'mul': ['Connaître les tables de multiplication : donner le produit de deux nombres (3 × 4 = ?).',
            "Connaître les tables de multiplication dans l'autre sens : trouver le facteur manquant d'un produit (3 × ? = 12)."],
}
if sorted(TABLES) != sorted(spec['tables_deja_ecrites']):
    echec('tables_deja_ecrites ne correspond pas aux cinq tables')
for code, (_, sens) in TABLES.items():
    scissions[code] = {'labels': TABLES_LABELS[sens], 'source': 'tables (2026-10-11)'}

for e in spec['scissions']:
    if P[e['code']]['name'] != e['current']:
        echec(f"libellé actuel de {e['code']} ≠ prod")
    scissions[e['code']] = {'labels': corrections.get(e['code'], e['labels']),
                            'source': 'spec' + (' + correction' if e['code'] in corrections else '')}

# Familles incomplètes : CM1-019 / CM2-018 scindés (question f1), 3-038 archivé (f2).
if reponses['questions']['f1']['c'] != 'scinder' or reponses['questions']['f2']['c'] != 'archiver':
    echec('réponses f1/f2 inattendues')
fam = verif['familles_incompletes']
assert fam[0]['codes'] == ['CM1-019', 'CM2-018'] and fam[2]['codes'] == ['3-038']
for code, libelle in zip(fam[0]['codes'], fam[0]['libelles']):
    if P[code]['name'] != libelle:
        echec(f'libellé de {code} ≠ prod')
    scissions[code] = {'labels': fam[0]['proposition'], 'source': 'famille incomplète f1'}

# Manques : options choisies (optN = option d'indice N).
CHOIX = {k: v['c'] for k, v in reponses['manques'].items()}
ATTENDU = {'l6_0': 'opt0', 'l6_1': 'opt0', 'l6_2': 'opt1', 'l10_0': 'opt1', 'l12_0': 'opt1',
           'l16_0': 'opt0', 'l16_1': 'aucune', 'l16_2': 'aucune', 'l16_CE2-022': 'c1+2',
           'l28_0': 'opt1', 'l36_0': 'opt1', 'l40_1': 'opt1'}
if CHOIX != ATTENDU:
    echec(f'choix « manques » inattendus : {CHOIX}')


def option(mid):
    c = CHOIX[mid]
    return manques[mid]['options'][int(c[3:])]


for mid in ('l6_0', 'l6_1', 'l16_0'):
    o = option(mid)
    assert o['type'] == 'scission'
    for f in o['famille']:
        labels = f.get('labels') or (o['labels'] if f['code'] == o['point'] else None)
        if not labels:
            echec(f'{mid} : pas de libellés pour {f["code"]}')
        if P[f['code']]['name'] != f['libelle_actuel']:
            echec(f'libellé de {f["code"]} ≠ prod')
        scissions[f['code']] = {'labels': labels, 'source': f'manque {mid} (famille de {o["point"]})'}

ARCHIVES = [a['code'] for a in spec['archive']] + ['3-038']

# Contrôles des libellés : apostrophes droites, pas de blanc parasite, « Connaître » accentué.
for code, s in scissions.items():
    for lab in s['labels']:
        if re.search(r"[’‘]|  |^\s|\s$|Connaitre|connaitre|econnaitre", lab):
            echec(f'libellé non conforme ({code}) : {lab}')
    if len(set(s['labels'])) != len(s['labels']):
        echec(f'libellés en double dans {code}')
    p = P[code]
    if p['archived'] or p['node'] is None:
        echec(f'{code} archivé ou sans nœud')

# ---------------------------------------------------------------------------
# 2. Les points ⚙ (lignes d'automatisme devenues points), calqués sur 5-056 / 3-010 / 3-011
# ---------------------------------------------------------------------------
# Libellé de 5e : « Reconnaître » accentué comme tous les libellés validés.
# 2de : libellés et rubriques vérifiés sur le BO de seconde (partie Automatismes > Géométrie /
# Statistiques), place = la partie Automatismes du BO, entre « Algorithmique et programmation »
# et « Nombres et calculs, algèbre » (avant 2-235).
AUTOS = []


def auto(mid, idx_label, grade, ancre, *, rubrique=None, label=None, refs_grades=()):
    o = option(mid)
    assert o['type'] == 'point_auto' and o['grade'] == grade
    lab = label or o['labels'][idx_label]
    AUTOS.append({'manque': mid, 'grade': grade, 'name': lab, 'kind': o['kind'],
                  'exigence': o['exigence'], 'regime_acquisition': o['regime'],
                  'rubrique': rubrique or o['rubrique'],
                  'path': o['noeud'].split(' (')[0].strip(), 'before': ancre,
                  'refs_grades': list(refs_grades)})


auto('l6_2', 0, '6', '6-189', rubrique='La proportionnalité > Automatismes')
auto('l10_0', 0, '5', '5-048',
     label='Reconnaître un cube, un pavé représenté en perspective cavalière.')
auto('l12_0', 0, '4', '4-001')
auto('l28_0', 0, '3', '3-036')
auto('l28_0', 1, '3', '3-036')
LYCEE = ['2', '1_GEN', '1_SPE', '1_TECHNO', 'T_COMP', 'T_SPE']
auto('l36_0', 0, '2', '2-235', rubrique='Automatismes > Géométrie', refs_grades=LYCEE)
auto('l40_1', 0, '2', '2-235', rubrique='Automatismes > Statistiques', refs_grades=LYCEE)
for a in AUTOS:
    if a['path'] not in NOEUDS:
        echec(f"nœud introuvable pour le point ⚙ : {a['path']}")
    if a['before'] not in P:
        echec(f"ancre absente : {a['before']}")
if manques['l36_0']['grades'] != LYCEE or manques['l40_1']['grades'] != LYCEE:
    echec('grades des lignes de 2de inattendus')

# ---------------------------------------------------------------------------
# 3. Codes neufs : prochain libre par grade (à partir du MAXIMUM), dans l'ordre d'affichage
# ---------------------------------------------------------------------------
def num(code):
    return int(code.split('-')[1])


maxi = {g: max(num(p['code']) for p in prod['points'] if p['grade'] == g) for g in GRADES}
for code, (neuf, _) in TABLES.items():
    g = P[code]['grade']
    maxi[g] = max(maxi[g], num(neuf))

prefixe = {g: next(p['code'].split('-')[0] for p in prod['points'] if p['grade'] == g) for g in GRADES}
codes_halves = {}  # origine → [code rang 1, rang 2, …]
for code, (neuf, _) in TABLES.items():
    codes_halves[code] = [code, neuf]
for g in GRADES:
    origines = sorted((c for c in scissions if P[c]['grade'] == g and c not in TABLES),
                      key=lambda c: P[c]['order'])
    for o in origines:
        cs = [o]
        for _ in scissions[o]['labels'][1:]:
            maxi[g] += 1
            cs.append(f'{prefixe[g]}-{maxi[g]:03d}')
        codes_halves[o] = cs
    for a in AUTOS:
        if a['grade'] == g:
            maxi[g] += 1
            a['code'] = f'{prefixe[g]}-{maxi[g]:03d}'
tous_codes = set(P)
neufs = [c for cs in codes_halves.values() for c in cs[1:]] + [a['code'] for a in AUTOS]
if len(set(neufs)) != len(neufs) or set(neufs) & tous_codes - set(t for t, _ in TABLES.values()):
    echec('codes neufs en collision')


def moitie(code, rang):
    if code not in codes_halves:
        echec(f'{code} n’est pas scindé (rang {rang} demandé)')
    cs = codes_halves[code]
    if not 1 <= rang <= len(cs):
        echec(f'{code} : rang {rang} hors limites')
    return cs[rang - 1]


# ---------------------------------------------------------------------------
# 4. Ordres d'affichage finaux (grade par grade, 1..N sans trou)
# ---------------------------------------------------------------------------
avant_ordre = {}
apres_ordre = {}
for g in GRADES:
    pts = sorted((p for p in prod['points'] if p['grade'] == g), key=lambda p: p['order'])
    avant_ordre[g] = [p['code'] for p in pts]
    cles = []
    for p in pts:
        cles.append(((p['order'], 1, 0), p['code']))
        if p['code'] in codes_halves:
            for r, c in enumerate(codes_halves[p['code']][1:], start=2):
                cles.append(((p['order'], r, 0), c))
    for i, a in enumerate(x for x in AUTOS if x['grade'] == g):
        cles.append(((P[a['before']]['order'], 0, i), a['code']))
    apres_ordre[g] = [c for _, c in sorted(cles)]

# ---------------------------------------------------------------------------
# 5. Références d'automatismes (point, grade référent)
# ---------------------------------------------------------------------------
CIBLES = {k: v['c'] for k, v in reponses['cibles'].items()}
CIBLES['l16_CE2-022'] = CHOIX['l16_CE2-022'][1:]  # « c1+2 » : la décision manques prévaut
MOTS = {k: v['c'] for k, v in reponses['mots'].items()}


def rangs(texte):
    if not re.fullmatch(r'\d(\+\d)*', texte):
        echec(f'cible illisible : {texte}')
    return [int(x) for x in texte.split('+')]


apres = set()
couvert = collections.defaultdict(set)  # origine → grades couverts par une ligne
for l in lignes:
    for r in l['refs_actuelles']:
        c = r['code']
        if c not in scissions:
            continue
        cle = f"{l['id']}_{c}"
        if cle not in CIBLES:
            echec(f'pas de cible pour {cle}')
        for g in l['grades']:
            couvert[c].add(g)
            for rg in rangs(CIBLES[cle]):
                apres.add((moitie(c, rg), g))

# Références de la prod non portées par une ligne : les deux décisions explicites.
EXPLICITES = {('CE2-020', '5'): [2],  # « 2 + … = 7 » → l'opération à trou (option A, 2026-10-11)
              ('4-021', '3'): [1]}    # « nombre pair, impair » → la moitié pairs/impairs (l16_0)
for (c, g), rgs in EXPLICITES.items():
    couvert[c].add(g)
    for rg in rgs:
        apres.add((moitie(c, rg), g))

avant = set()
for c in list(scissions) + ARCHIVES:
    for g in REFS_PROD[c]:
        avant.add((c, g))
    if c in scissions and REFS_PROD[c] != couvert[c]:
        echec(f'{c} : références en prod {sorted(REFS_PROD[c])} ≠ lignes {sorted(couvert[c])}')
    if c in ARCHIVES and REFS_PROD[c]:
        echec(f'{c} archivé mais référencé')

# Mots sans référence : « propose » ajoute les points proposés (sauf mots repris dans manques).
ajouts = set()
for l in lignes:
    for i, m in enumerate(l['mots_sans_ref']):
        cle = f"{l['id']}_{i}"
        if cle in CHOIX:
            continue
        if MOTS.get(cle) not in ('propose', 'aucun'):
            echec(f'mot sans décision : {cle}')
        if MOTS[cle] != 'propose':
            continue
        pp = m['point_propose']
        for x in (pp if isinstance(pp, list) else [pp]):
            cible = moitie(x['code'], x['rang']) if x.get('rang') else x['code']
            if not x.get('rang') and x['code'] in scissions:
                echec(f'{cle} : point scindé {x["code"]} proposé sans rang')
            for g in l['grades']:
                ajouts.add((cible, g))

# Manques : références des scissions choisies, et des points ⚙.
for mid in ('l6_0', 'l6_1', 'l16_0'):
    o = option(mid)
    for g in manques[mid]['grades']:
        ajouts.add((moitie(o['reference']['code'], o['reference']['rang']), g))
for rg in rangs(CIBLES['l16_CE2-022']):
    for g in manques['l16_CE2-022']['grades']:
        ajouts.add((moitie('CE2-022', rg), g))
for a in AUTOS:
    for g in a['refs_grades']:
        ajouts.add((a['code'], g))

# Les points non scindés qui reçoivent une référence : leurs références actuelles comptent
# dans l'état « avant » (et restent).
proposes = sorted({c for c, _ in ajouts if c in P and c not in scissions})
for c in proposes:
    for g in REFS_PROD[c]:
        avant.add((c, g))
        apres.add((c, g))
apres |= ajouts

GRADES_VALIDES = {'CP', 'CE1', 'CE2', 'CM1', 'CM2', '6', '5', '4', '3', '2', '1_GEN', 'T_GEN',
                  '1_SPE', 'T_SPE', 'T_EXP', 'T_COMP', '1_TECHNO', 'T_TECHNO'}
if any(g not in GRADES_VALIDES for _, g in apres):
    echec('grade référent invalide')

# ---------------------------------------------------------------------------
# 6. Sorties
# ---------------------------------------------------------------------------
def tri_refs(s):
    return sorted(f'{c}§{g}' for c, g in s)


def trou(g):
    ordres = sorted(p['order'] for p in prod['points'] if p['grade'] == g)
    manquants = [i for i in range(1, ordres[-1] + 1) if i not in ordres]
    if len(ordres) != len(set(ordres)) or len(manquants) > 1:
        echec(f'ordre de {g} inattendu')
    return manquants[0] if manquants else None


splits = []
for o, s in scissions.items():
    p = P[o]
    splits.append({'origin': o, 'grade': p['grade'], 'nameBefore': p['name'],
                   'codes': codes_halves[o], 'names': s['labels'], 'source': s['source']})
splits.sort(key=lambda x: (GRADES.index(x['grade']), P[x['origin']]['order']))

fixture = {
    'source': 'générée par docs/wip/arbre-notions/c5-scissions-generer.py depuis les décisions de '
              'David (2026-10-17) et l’état de la prod du 2026-10-17 ; ne pas éditer à la main',
    'splits': splits,
    'added': [{k: a[k] for k in ('code', 'grade', 'name', 'kind', 'exigence', 'regime_acquisition',
                                 'rubrique', 'path', 'before')} for a in AUTOS],
    'archived': [{'code': c, 'name': P[c]['name']} for c in ARCHIVES],
    'grades': {g: {'before': avant_ordre[g], 'holeBefore': trou(g), 'after': apres_ordre[g]}
               for g in GRADES},
    'references': {'before': tri_refs(avant), 'after': tri_refs(apres)},
}
FIXTURE.write_text(json.dumps(fixture, ensure_ascii=False, indent='\t') + '\n', encoding='utf-8')


# --- blocs SQL ---------------------------------------------------------------
def q(s):
    if s is None:
        return 'null'
    if '$pt$' in s:
        echec('libellé contenant $pt$')
    return f'$pt${s}$pt$'


lignes_points = []
for x in splits:
    lignes_points.append(f"('{x['origin']}', '{x['grade']}', 'origine', null, 1, {q(x['nameBefore'])}, {q(x['names'][0])})")
    for r, (c, n) in enumerate(zip(x['codes'][1:], x['names'][1:]), start=2):
        lignes_points.append(f"('{c}', '{x['grade']}', 'neuf', '{x['origin']}', {r}, null, {q(n)})")
for c in ARCHIVES:
    lignes_points.append(f"('{c}', '{P[c]['grade']}', 'archive', null, null, {q(P[c]['name'])}, {q(P[c]['name'])})")

lignes_autos = []
for i, a in enumerate(AUTOS, start=1):
    lignes_autos.append(
        f"('{a['code']}', '{a['grade']}', {i}, '{a['before']}', {q(a['name'])}, '{a['kind']}', "
        f"'{a['exigence']}', '{a['regime_acquisition']}', {q(a['rubrique'])}, {q(a['path'])})")

toutes_refs = sorted(avant | apres, key=lambda x: (x[0], x[1]))
lignes_refs = [f"('{c}', '{g}', {str((c, g) in avant).lower()}, {str((c, g) in apres).lower()})"
               for c, g in toutes_refs]


lignes_grades = []
for g in GRADES:
    t = trou(g)
    lignes_grades.append(f"('{g}', {len(avant_ordre[g])}, {len(apres_ordre[g])}, {t if t else 'null'})")


def bloc(rows):
    return ',\n'.join('  ' + r for r in rows) + ';'


BLOCS = {
    'POINTS': bloc(lignes_points),
    'AUTOS': bloc(lignes_autos),
    'REFS': bloc(lignes_refs),
    'GRADES': bloc(lignes_grades),
}

sql = MIGRATION.read_text(encoding='utf-8')
for nom, contenu in BLOCS.items():
    for prefixe_ligne in ('', '-- '):
        debut = f'{prefixe_ligne}-- DONNÉES:{nom}:BEGIN'
        fin = f'{prefixe_ligne}-- DONNÉES:{nom}:END'
        motif = re.compile('^' + re.escape(debut) + r'\n.*?^' + re.escape(fin) + '$', re.S | re.M)
        corps = '\n'.join((prefixe_ligne + l) if prefixe_ligne else l for l in contenu.split('\n'))
        sql, n = motif.subn(lambda _m: f'{debut}\n{corps}\n{fin}', sql)
        if prefixe_ligne == '' and n != 1:
            echec(f'marqueurs {nom} introuvables dans la migration ({n})')
        if prefixe_ligne == '-- ' and n != 1:
            echec(f'marqueurs {nom} introuvables dans le rollback ({n})')
MIGRATION.write_text(sql, encoding='utf-8')

# --- fixtures de seeds -------------------------------------------------------
nouveaux_attrs = {}
for x in splits:
    for c, n in zip(x['codes'], x['names']):
        nouveaux_attrs[c] = (x['origin'], n)


def transformer_seed(fichier):
    chemin = FIXTURES_SEEDS / fichier
    d = json.loads(chemin.read_text(encoding='utf-8'))
    change = False
    if 'points' in d:
        presents = {p['code'] for p in d['points']}
        rang_final = {c: i for g in GRADES for i, c in enumerate(apres_ordre[g], start=1)}
        liste = []

        def ajouter(p):
            if p['code'] in nouveaux_attrs:
                p['name'] = nouveaux_attrs[p['code']][1]
            if p['grade'] in GRADES:
                p['display_order'] = rang_final[p['code']]
            liste.append(p)

        for p in d['points']:
            if p['grade'] in GRADES:
                for a in AUTOS:
                    if a['before'] == p['code'] and a['code'] not in presents:
                        branche, notion, *sous = a['path'].split(' > ')
                        ajouter({'code': a['code'], 'grade': a['grade'], 'display_order': 0,
                                 'name': a['name'], 'kind': a['kind'], 'exigence': a['exigence'],
                                 'regime_acquisition': a['regime_acquisition'],
                                 'rubrique': a['rubrique'], 'branche': branche, 'notion': notion,
                                 'sous_notion': sous[0] if sous else None})
            if p['code'] in codes_halves:
                p = dict(p)
            ajouter(p if p['grade'] not in GRADES else dict(p))
            if p['code'] in codes_halves:
                for c in codes_halves[p['code']][1:]:
                    if c in presents:
                        continue
                    copie = dict(p)
                    copie['code'] = c
                    ajouter(copie)
        # un point déjà présent (tables du cycle 2) garde sa place dans le fichier
        if liste != d['points']:
            d['points'] = liste
            change = True
    if 'references' in d and d['references']:
        if isinstance(d['references'][0], str):
            grade_fixe = '6'
            actuelles = {(c, grade_fixe) for c in d['references']}
            grades_refs = {grade_fixe}
        else:
            actuelles = {(r['code'], r['grade']) for r in d['references']}
            grades_refs = {g for _, g in actuelles}
        nouvelles = (actuelles - avant) | {(c, g) for c, g in apres if g in grades_refs}
        if nouvelles != actuelles:
            change = True
            if isinstance(d['references'][0], str):
                d['references'] = sorted(c for c, _ in nouvelles)
            else:
                d['references'] = [{'code': c, 'grade': g} for c, g in sorted(nouvelles)]
    if change:
        chemin.write_text(json.dumps(d, ensure_ascii=False, indent='\t') + '\n', encoding='utf-8')
    return change


SEEDS = ['seed-cycle2-points.json', 'seed-cm-points.json', 'seed-6e-points.json',
         'seed-cycle4-points.json', 'seed-2de-points.json', 'seed-1gen-points.json',
         'seed-1spe-points.json', 'seed-1techno-points.json', 'seed-tcomp-points.json',
         'seed-tspe-points.json', 'seed-ttechno-points.json', 'seed-texp-points.json']

if '--seeds' in sys.argv:
    for f in SEEDS:
        print(f, 'modifiée' if transformer_seed(f) else 'inchangée')

# --- résumé ------------------------------------------------------------------
print(f'scissions : {len(splits)} points, {sum(len(x["codes"]) - 1 for x in splits)} points neufs')
print(f'points ⚙ : {len(AUTOS)} ; archivés : {ARCHIVES}')
print(f'références sur les points touchés : {len(avant)} avant, {len(apres)} après '
      f'(retirées {len(avant - apres)}, ajoutées {len(apres - avant)})')
for g in GRADES:
    print(f'  {g}: {len(avant_ordre[g])} → {len(apres_ordre[g])} (codes jusqu’à {prefixe[g]}-{maxi[g]:03d})')
