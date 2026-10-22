#!/usr/bin/env python3
"""Génère, depuis les DÉCISIONS de David, la migration de la passe des points du lycée (étape a).

Entrées (dans ce dossier) :
  - propositions.tsv : 367 propositions ; 335 DECIDE tenues pour OK par David (2026-10-22,
    « tiens-les toutes pour OK ») ;
  - page/questions.json + réponses de la page à cocher (2026-10-22) : Q03 = B, toutes les
    autres = A, c'est-à-dire la recommandation à chaque fois (voir REPONSES) ;
  - etat-prod.json : l'état de la base AVANT la migration (base locale au 20261022100000,
    empreintes identiques à la prod le 2026-10-22 : points, nœuds, références).

Sorties :
  - supabase/migrations/<MIGRATION> (fichier entier, généré : ne pas éditer à la main) ;
  - tests/integration/fixtures/passe-lycee.json (fixture figée du test) ;
  - avec --seeds : les fixtures des seeds du lycée (tests/integration/fixtures/seed-*-points.json),
    transformées par les mêmes décisions.

Usage (racine du worktree) : python3 docs/wip/passe-lycee/generer-migration.py [--seeds],
puis pnpm exec prettier --write sur les fixtures écrites.
"""

import collections
import csv
import json
import re
import sys
from pathlib import Path

ICI = Path(__file__).resolve().parent
RACINE = ICI.parents[2]
MIGRATION = RACINE / 'supabase/migrations/20261022180000_passe_points_lycee.sql'
FIXTURE = RACINE / 'tests/integration/fixtures/passe-lycee.json'
FIXTURES = RACINE / 'tests/integration/fixtures'

GRADES = ['2', '1_SPE', '1_GEN', '1_TECHNO', 'T_SPE', 'T_COMP', 'T_EXP', 'T_TECHNO']
PROGRAMME = {'2de': '2', '1spe': '1_SPE', '1gen': '1_GEN', '1techno': '1_TECHNO', 'tspe': 'T_SPE',
             'tcomp': 'T_COMP', 'texp': 'T_EXP', 'ttechno': 'T_TECHNO'}
PREFIXE = {'2': '2', '1_SPE': '1SPE', '1_GEN': '1GEN', '1_TECHNO': '1TECHNO', 'T_SPE': 'TSPE',
           'T_COMP': 'TCOMP', 'T_EXP': 'TEXP', 'T_TECHNO': 'TTECHNO'}

# Réponses de David sur la page à cocher (collection « reponses », lue le 2026-10-22).
REPONSES = {'Q01': 'A', 'Q02': 'A', 'Q03': 'B', 'Q04': 'A', 'Q05': 'A', 'Q06': 'A', 'Q07': 'A',
            'Q08': 'A', 'Q09': 'A', 'Q10': 'A', 'Q11': 'A', 'Q12': 'A', 'Q13': 'A', 'Q14': 'A',
            'Q15': 'A'}


def echec(msg):
    sys.exit(f'ÉCHEC : {msg}')


# ---------------------------------------------------------------------------
# 0. Entrées et contrôles des réponses
# ---------------------------------------------------------------------------
questions = json.loads((ICI / 'page/questions.json').read_text(encoding='utf-8'))
for q in questions:
    reco = [o['cle'] for o in q['options'] if o.get('reco')]
    if reco != [REPONSES[q['id']]]:
        echec(f"{q['id']} : la réponse {REPONSES[q['id']]} n'est pas la recommandation {reco}")

lignes = list(csv.DictReader((ICI / 'propositions.tsv').open(encoding='utf-8'), delimiter='\t'))
if len(lignes) != 367:
    echec(f'{len(lignes)} propositions au lieu de 367')
etat = json.loads((ICI / 'etat-prod.json').read_text(encoding='utf-8'))
P = {p['code']: p for p in etat['points']}
NOEUDS = {n['path']: n for n in etat['noeuds']}
REFS_AVANT = collections.defaultdict(set)
for r in etat['references']:
    REFS_AVANT[r['code']].add(r['grade'])


def propre(libelle):
    """Libellé tel qu'il ira en base : apostrophe droite, sans annotation de la page."""
    s = libelle.replace('’', "'").replace('‘', "'")
    s = re.sub(r'\s*\(reco ×\d\)$', '', s)
    s = re.sub(r'^⚙\s*', '', s)
    s = s.strip()
    if re.search(r'  |\(reco|⚙| \[nœud|^—$', s) or not s:
        echec(f'libellé non conforme : {libelle!r}')
    return s


def chemin(texte):
    c = texte.split(' [')[0].strip()
    n = NOEUDS.get(c)
    if not n or n['archived'] or n['kind'] not in ('notion', 'subnotion'):
        echec(f'nœud introuvable, archivé ou non rangeable : {c!r}')
    return c


# ---------------------------------------------------------------------------
# 1. Coupes (et points réduits, T4) : l'origine garde son code et prend le 1er libellé
# ---------------------------------------------------------------------------
# Q15 (A) : le code va au morceau du modèle tagué, l'affichage garde l'ordre du BO. Rang
# d'affichage de chaque libellé (dans l'ordre de libelles_proposes, dont le 1er garde le code).
ORDRE_BO = {
    'TCOMP-205': [2, 1],         # « passage à la limite dans les inégalités » puis « gendarmes »
    'TCOMP-219': [2, 1],         # « Notion de limite » puis « asymptotes »
    'TCOMP-228': [2, 1, 3, 4],   # f(ax + b), e^u, ln u, u²
    'TEXP-314': [2, 1, 3],       # sommets adjacents, degré, ordre
    '2-354': [2, 1],             # « signe et variations »
    '2-355': [2, 1],
}

coupes = collections.OrderedDict()   # origine → dict
for x in lignes:
    if x['type'] != 'COUPE':
        continue
    code = x['code']
    p = P.get(code)
    if not p or p['archived'] or p['grade'] != PROGRAMME[x['programme']]:
        echec(f'{code} absent, archivé ou d’un autre grade')
    if p['name'] != x['libelle_actuel']:
        echec(f'{code} : libellé actuel ≠ base')
    labels = [propre(l) for l in x['libelles_proposes'].split(' || ')]
    noeuds = x['noeud'].split(' || ')
    if len(noeuds) == 1:
        noeuds = noeuds * len(labels)
    if len(noeuds) != len(labels):
        echec(f'{code} : {len(noeuds)} nœuds pour {len(labels)} libellés')
    if len(set(labels)) != len(labels):
        echec(f'{code} : libellés en double')
    coupes[code] = {'id': x['id'], 'grade': p['grade'], 'labels': labels,
                    'chemins': [chemin(n) for n in noeuds],
                    'ordre': ORDRE_BO.get(code, list(range(1, len(labels) + 1)))}
# Origines taguées en prod dont le nœud proposé est refusé par curriculum_points_guard_tags (un
# modèle tagué n'est ni sur ce nœud ni sur sa notion, relevé du 2026-10-22) : l'origine garde
# son nœud actuel, le rangement se reprend à l'étape c (répartition des tags).
NOEUD_GARDE = {
    '1SPE-244': 'modèle f8ccc8b6 « Vrai ou Faux sur les polynômes du second degré » sur la notion Second degré',
}
for code in NOEUD_GARDE:
    coupes[code]['chemins'][0] = P[code]['node']
for code, o in ORDRE_BO.items():
    if sorted(o) != list(range(1, len(coupes[code]['labels']) + 1)):
        echec(f'ORDRE_BO de {code} incohérent')

ARCHIVES = [x['code'] for x in lignes if x['type'] == 'ARCHIVE']
for c in ARCHIVES:
    if P[c]['archived'] or REFS_AVANT.get(c):
        echec(f'{c} déjà archivé ou référencé')

# ---------------------------------------------------------------------------
# 2. Points ajoutés : ⚙ (règle 4, T5, Q10) et puces rétablies (T6, Q11)
# ---------------------------------------------------------------------------
# Place : « avant » une ancre (les ⚙, en tête de la partie Automatismes du BO) ou « après » un
# point (les puces rétablies, place donnée par la fiche ; après les morceaux s'il est coupé).
# Références : grades des lignes d'automatismes qui les visent (mêmes ensembles que les points
# déjà visés par ces lignes : 2-401 pour les lignes de 2de, 2-329 pour les lignes de 1re).
LIGNES_2DE = ['2', '1_GEN', '1_SPE', '1_TECHNO', 'T_COMP', 'T_SPE']
AUTO_2DE = dict(kind='savoir_faire', exigence='attendu', regime='fluence', place=('avant', '2-401'))
AUTO_1SPE = dict(kind='savoir_faire', exigence='attendu', regime='fluence',
                 rubrique='Automatismes > Fonctions et représentations', place=('avant', '1SPE-211'),
                 refs=['1_SPE', 'T_COMP', 'T_SPE'])
AUTO_1GEN = dict(AUTO_1SPE, place=('avant', '1GEN-001'), refs=['1_GEN'])
AUTO_1TECHNO = dict(AUTO_1SPE, place=('avant', '1TECHNO-032'), refs=['1_TECHNO', 'T_TECHNO'])
AJOUTS_ATTRS = {
    # ⚙ de 2de (ordre du BO : calcul numérique, proportions, fonctions), avant 2-401 (géométrie)
    'P016': [dict(AUTO_2DE, rubrique='Automatismes > Calcul numérique et algébrique', refs=LIGNES_2DE)],
    'P017': [dict(AUTO_2DE, rubrique='Automatismes > Proportions et pourcentages', refs=LIGNES_2DE)],
    'P018': [dict(AUTO_2DE, rubrique='Automatismes > Fonctions et représentations',
                  refs=LIGNES_2DE + ['T_TECHNO'])] * 2,          # Tle techno l. 423
    # ⚙ de 1re (T5, Q10) : un jumeau par programme
    'P082': [AUTO_1SPE], 'P083': [AUTO_1SPE], 'P084': [AUTO_1SPE],
    'P146': [AUTO_1GEN], 'P147': [AUTO_1GEN], 'P148': [AUTO_1GEN],
    'P181': [AUTO_1TECHNO], 'P182': [AUTO_1TECHNO], 'P183': [AUTO_1TECHNO],   # Tle techno l. 427, 429
    # ⚙ de Tle techno : rubrique et voisin de TTECHNO-015, le seul point « Automatismes » du grade
    'P349': [dict(kind='savoir_faire', exigence='attendu', regime='fluence', rubrique='Automatismes',
                  place=('apres', 'TTECHNO-015'), refs=['T_TECHNO'])],
}
RETABLI = dict(kind='savoir_faire', exigence='attendu', regime='diversite', refs=[])
AJOUTS_ATTRS.update({
    'P038': [dict(RETABLI, rubrique='Géométrie > Vecteurs et problèmes de géométrie', place=('apres', '2-303'))],
    'P039': [dict(RETABLI, rubrique='Géométrie > Vecteurs et problèmes de géométrie', place=('apres', 'P038'))],
    'P047': [dict(RETABLI, rubrique='Fonctions > Représentation algébrique et graphique des fonctions',
                  place=('apres', '2-331'))],
    'P092': [dict(RETABLI, rubrique='Algèbre > Suites numériques, modèles discrets', place=('apres', '1SPE-221'))],
    'P128': [dict(RETABLI, rubrique='Géométrie > Calcul vectoriel et produit scalaire', place=('apres', '1SPE-321'))],
    'P132': [dict(RETABLI, rubrique='Géométrie > Géométrie repérée', place=('apres', '1SPE-333'))],
    'P185': [dict(RETABLI, rubrique='Analyse > Suites numériques', place=('apres', '1TECHNO-041'))],
    'P197': [dict(RETABLI, rubrique='Analyse > Fonctions de la variable réelle', place=('apres', '1TECHNO-058'))],
    'P236': [dict(RETABLI, rubrique="Algèbre et géométrie > Orthogonalité et distances dans l'espace",
                  place=('apres', 'TSPE-356'))],
    'P285': [dict(RETABLI, rubrique='Analyse > Suites numériques, modèles discrets', place=('apres', 'TCOMP-208'))],
    'P292': [dict(RETABLI, rubrique='Analyse > Fonctions : continuité, dérivabilité, limites, représentation graphique',
                  place=('apres', 'TCOMP-231'))],
})

ajouts = []   # dans l'ordre des propositions
for x in lignes:
    if x['type'] not in ('AUTO', 'RETABLI'):
        continue
    attrs = AJOUTS_ATTRS.get(x['id'])
    if attrs is None:
        echec(f"{x['id']} : pas d'attributs pour ce point ajouté")
    labels = [propre(l) for l in x['libelles_proposes'].split(' || ')]
    if len(labels) != len(attrs):
        echec(f"{x['id']} : {len(labels)} libellés pour {len(attrs)} attributs")
    grade = PROGRAMME[x['programme']]
    for i, (lab, a) in enumerate(zip(labels, attrs)):
        if x['type'] == 'RETABLI' and f"rubrique « {a['rubrique']} »" not in x['justification']:
            echec(f"{x['id']} : rubrique ≠ fiche")
        ajouts.append({'id': x['id'] + ('' if len(labels) == 1 else 'abc'[i]), 'source': x['id'],
                       'type': x['type'], 'grade': grade, 'name': lab, 'kind': a['kind'],
                       'exigence': a['exigence'], 'regime': a['regime'], 'rubrique': a['rubrique'],
                       'chemin': chemin(x['noeud']), 'place': a['place'], 'refs': a['refs']})
if {a['source'] for a in ajouts} != set(AJOUTS_ATTRS):
    echec('AJOUTS_ATTRS vise une proposition absente')
for a in ajouts:
    sens, ancre = a['place']
    if not ancre.startswith('P') and (ancre not in P or P[ancre]['grade'] != a['grade']):
        echec(f"{a['id']} : ancre {ancre} absente ou d'un autre grade")
    if a['rubrique'] not in {p['rubrique'] for p in etat['points'] if p['grade'] == a['grade']} \
            and not a['rubrique'].startswith('Automatismes'):
        echec(f"{a['id']} : rubrique inconnue dans le grade : {a['rubrique']}")

# ---------------------------------------------------------------------------
# 3. Codes neufs : prochain libre du grade (à partir du maximum), dans l'ordre d'affichage
# ---------------------------------------------------------------------------
def num(code):
    return int(code.rsplit('-', 1)[1])


maxi = {g: max(num(p['code']) for p in etat['points'] if p['grade'] == g) for g in GRADES}
for g in GRADES:
    for o in sorted((c for c in coupes if coupes[c]['grade'] == g), key=lambda c: P[c]['order']):
        codes = [o]
        for _ in coupes[o]['labels'][1:]:
            maxi[g] += 1
            codes.append(f'{PREFIXE[g]}-{maxi[g]:03d}')
        coupes[o]['codes'] = codes
    for a in ajouts:
        if a['grade'] == g:
            maxi[g] += 1
            a['code'] = f"{PREFIXE[g]}-{maxi[g]:03d}"
NEUFS = [c for o in coupes.values() for c in o['codes'][1:]] + [a['code'] for a in ajouts]
if len(set(NEUFS)) != len(NEUFS) or set(NEUFS) & set(P):
    echec('codes neufs en collision')
AJOUT = {a['id']: a for a in ajouts}


def morceau(origine, rang):
    return coupes[origine]['codes'][rang - 1]


# ---------------------------------------------------------------------------
# 4. Ordre d'affichage final, grade par grade (1..N, archivés compris comme avant)
# ---------------------------------------------------------------------------
avant_ordre, apres_ordre = {}, {}
for g in GRADES:
    pts = sorted((p for p in etat['points'] if p['grade'] == g), key=lambda p: p['order'])
    if [p['order'] for p in pts] != list(range(1, len(pts) + 1)):
        echec(f'ordre de {g} : pas 1..N')
    avant_ordre[g] = [p['code'] for p in pts]
    sortie = []

    def poser(cle):
        """Pose un point (code existant ou ajout), ses morceaux, puis ce qui se range après lui."""
        if cle in coupes:
            o = coupes[cle]
            for rang in o['ordre']:
                sortie.append(o['codes'][rang - 1])
        elif cle in AJOUT:
            sortie.append(AJOUT[cle]['code'])
        else:
            sortie.append(cle)
        for a in ajouts:
            if a['place'] == ('apres', cle):
                poser(a['id'])

    for p in pts:
        for a in ajouts:
            if a['place'] == ('avant', p['code']):
                poser(a['id'])
        poser(p['code'])
    apres_ordre[g] = sortie
    attendu = len(pts) + sum(len(o['codes']) - 1 for o in coupes.values() if o['grade'] == g) \
        + sum(1 for a in ajouts if a['grade'] == g)
    if len(sortie) != attendu or len(set(sortie)) != len(sortie):
        echec(f'ordre final de {g} incohérent')

# ---------------------------------------------------------------------------
# 5. Références d'automatismes (point, grade référent)
# ---------------------------------------------------------------------------
# Par défaut, une référence existante reste au morceau qui garde le code (METHODE : aucune
# référence déplacée). Ce que les fiches disent autrement (colonne famille), ligne par ligne :
TOUS = 'tous'
REFS_COUPES = {
    '2-201': TOUS, '2-202': TOUS, '2-204': TOUS, '2-210': TOUS, '2-213': TOUS, '2-215': TOUS,
    # réciproque et contraposée : 1re spé l. 206, Tle spé l. 226, 1re techno l. 251 ; Tle compl.
    # aussi (elle reprend la liste de 1re spé, A1) ; Tle techno : la réciproque seule (fiche P007)
    '2-214': {'1_SPE': [1, 2], 'T_SPE': [1, 2], '1_TECHNO': [1, 2], 'T_COMP': [1, 2], 'T_TECHNO': [1]},
    '2-276': TOUS, '2-277': TOUS,
    '2-279': [1], '2-280': [1], '2-314': [1], '2-315': [1], '2-316': [1], '2-330': [1],
    '2-331': TOUS, '2-336': TOUS, '2-347': [1], '2-372': [1], '2-380': TOUS, '2-381': TOUS,
    # Q04 (A) : la ligne de 2de « boîtes à moustaches » (l. 383) vise le 3e morceau ; les lignes de
    # 1re « indicateurs » visent les deux premiers, et la 1re et la Tle reprennent la liste de 2de
    # (invariants C16 et A1, ci-dessous) : le 3e aussi
    '2-382': {'2': [3], '1_GEN': [1, 2, 3], '1_SPE': [1, 2, 3], '1_TECHNO': [1, 2, 3],
              'T_COMP': [1, 2, 3], 'T_SPE': [1, 2, 3]},
    # Tle : la même phrase du BO, entière (tspe l. 262, ttechno l. 246, 271, 278, 650, 402)
    '1SPE-206': TOUS, '1TECHNO-001': TOUS, '1TECHNO-005': TOUS, '1TECHNO-008': TOUS,
    '1TECHNO-099': TOUS, 'TTECHNO-015': TOUS,
    '1TECHNO-057': [1],
}
avant, apres = set(), set()
for o, c in coupes.items():
    gs = REFS_AVANT.get(o, set())
    regle = REFS_COUPES.get(o, [1])
    if o in REFS_COUPES and not gs:
        echec(f'{o} : règle de références sans référence')
    for g in gs:
        avant.add((o, g))
        rangs = (list(range(1, len(c['codes']) + 1)) if regle == TOUS
                 else regle[g] if isinstance(regle, dict) else regle)
        if isinstance(regle, dict) and set(regle) != gs:
            echec(f'{o} : grades de la règle {sorted(regle)} ≠ base {sorted(gs)}')
        for rg in rangs:
            apres.add((morceau(o, rg), g))
for a in ajouts:
    for g in a['refs']:
        apres.add((a['code'], g))

# Q14 (A) : lignes d'automatismes reliées à des points qui existent déjà (aucun point neuf)
LIGNES_1RE = ['1_GEN', '1_SPE', '1_TECHNO', 'T_COMP', 'T_SPE']
AJOUTS_Q14 = [
    (['5-017', '5-025', '6-133'], LIGNES_2DE),                          # 2de l. 310
    (['5-086', '5-140'], LIGNES_2DE + ['T_TECHNO']),                    # 2de l. 347, Tle techno l. 395
    (['3-045', '3-067'], LIGNES_1RE + ['T_TECHNO']),                    # 1re l. 276/209/392, Tle techno l. 430
    ([morceau('2-395', 1), morceau('2-395', 2)], LIGNES_1RE),           # 1re l. 288/221/403
    (['3-015'], ['1_TECHNO']),                                          # 1re techno l. 384
    (['TTECHNO-023'], ['T_TECHNO']),                                    # Tle techno l. 405
]
for codes, gs in AJOUTS_Q14:
    for c in codes:
        for g in gs:
            apres.add((c, g))
# Les points non coupés qui reçoivent une référence : leurs références actuelles restent.
for c in {c for c, _ in apres if c in P and c not in coupes}:
    for g in REFS_AVANT.get(c, set()):
        avant.add((c, g))
        apres.add((c, g))

ORDRE_GRADES = {'CP': 0, 'CE1': 1, 'CE2': 2, 'CM1': 3, 'CM2': 4, '6': 5, '5': 6, '4': 7, '3': 8, '2': 9,
                '1_GEN': 10, '1_SPE': 10, '1_TECHNO': 10, 'T_COMP': 11, 'T_SPE': 11, 'T_EXP': 11,
                'T_TECHNO': 11}
PARCOURS = collections.defaultdict(set)
for g, pred in [('1_GEN', '2'), ('1_SPE', '2'), ('1_TECHNO', '2'), ('2', '3'), ('3', '4'), ('4', '5'),
                ('5', '6'), ('6', 'CM2'), ('T_COMP', '1_SPE'), ('T_EXP', '1_SPE'), ('T_SPE', '1_SPE'),
                ('T_TECHNO', '1_TECHNO'), ('CM2', 'CM1'), ('CM1', 'CE2'), ('CE2', 'CE1'), ('CE1', 'CP')]:
    PARCOURS[g].add(pred)


def ancetres(g):
    vus, pile = {g}, [g]
    while pile:
        for x in PARCOURS[pile.pop()]:
            if x not in vus:
                vus.add(x)
                pile.append(x)
    return vus


def grade_de(code):
    if code in P:
        return P[code]['grade']
    for o in coupes.values():
        if code in o['codes']:
            return o['grade']
    return next(a['grade'] for a in ajouts if a['code'] == code)


for c, g in apres:
    if grade_de(c) not in ancetres(g):
        echec(f'référence hors parcours : {c} § {g}')
# Invariants des seeds : la 1re reprend toute la liste de 2de (C16), la Tle spé et la Tle compl.
# toute celle de 1re spé (A1).
par_grade = collections.defaultdict(set)
for c, g in apres:
    par_grade[g].add(c)
for source, cibles in (('2', ['1_SPE', '1_GEN', '1_TECHNO']), ('1_SPE', ['T_SPE', 'T_COMP'])):
    for g in cibles:
        if par_grade[source] - par_grade[g]:
            echec(f'{g} ne reprend pas la liste de {source} : {sorted(par_grade[source] - par_grade[g])}')
DEPLACEES = {('2-382', '2')}   # Q04 : la seule référence déplacée (vers le 3e morceau)
if avant - apres != DEPLACEES:
    echec(f'références retirées : {sorted(avant - apres)} (seule {DEPLACEES} doit l’être)')

# ---------------------------------------------------------------------------
# 6. Fixture
# ---------------------------------------------------------------------------
def tri_refs(s):
    return sorted(f'{c}§{g}' for c, g in s)


splits = []
for o, c in coupes.items():
    splits.append({'origin': o, 'grade': c['grade'], 'nameBefore': P[o]['name'],
                   'pathBefore': P[o]['node'], 'codes': c['codes'],
                   'names': c['labels'], 'paths': c['chemins'], 'source': c['id']})
splits.sort(key=lambda s: (GRADES.index(s['grade']), P[s['origin']]['order']))
added = [{'code': a['code'], 'grade': a['grade'], 'name': a['name'], 'kind': a['kind'],
          'exigence': a['exigence'], 'regime_acquisition': a['regime'], 'rubrique': a['rubrique'],
          'path': a['chemin'], 'source': a['source']} for a in ajouts]
fixture = {
    'source': 'générée par docs/wip/passe-lycee/generer-migration.py depuis les décisions de David '
              '(2026-10-22) et l’état de la prod du 2026-10-22 ; ne pas éditer à la main',
    'splits': splits,
    'added': added,
    'archived': [{'code': c, 'name': P[c]['name']} for c in ARCHIVES],
    'grades': {g: {'before': avant_ordre[g], 'after': apres_ordre[g]} for g in GRADES},
    'references': {'before': tri_refs(avant), 'after': tri_refs(apres)},
}

# Points qui changent (pour le SQL et les seeds) -----------------------------------------
renommes = {o: c['labels'][0] for o, c in coupes.items() if c['labels'][0] != P[o]['name']}
renoeudes = {o: c['chemins'][0] for o, c in coupes.items() if c['chemins'][0] != P[o]['node']}
nb = {
    'origines': len(coupes),
    'morceaux': sum(len(c['codes']) - 1 for c in coupes.values()),
    'ajouts': len(ajouts),
    'archives': len(ARCHIVES),
    'renommes': len(renommes),
    'renoeudes': len(renoeudes),
    'refs_avant': len(avant),
    'refs_apres': len(apres),
    'neufs': len(NEUFS),
}

# ---------------------------------------------------------------------------
# 7. SQL
# ---------------------------------------------------------------------------
def q(s):
    if s is None:
        return 'null'
    if '$pt$' in s:
        echec('libellé contenant $pt$')
    return f'$pt${s}$pt$'


def bloc(rows):
    return ',\n'.join('  ' + r for r in rows) + ';'


rows_point = []
for s in splits:
    o = coupes[s['origin']]
    rows_point.append(f"('{s['origin']}', '{s['grade']}', 'origine', null, {q(P[s['origin']]['name'])}, "
                      f"{q(P[s['origin']]['node'])}, {q(o['labels'][0])}, {q(o['chemins'][0])}, null, null, null, null)")
    for c, n, ch in zip(o['codes'][1:], o['labels'][1:], o['chemins'][1:]):
        rows_point.append(f"('{c}', '{s['grade']}', 'neuf', '{s['origin']}', null, null, {q(n)}, {q(ch)}, null, null, null, null)")
for a in ajouts:
    rows_point.append(f"('{a['code']}', '{a['grade']}', 'ajout', null, null, null, {q(a['name'])}, {q(a['chemin'])}, "
                      f"'{a['kind']}', '{a['exigence']}', '{a['regime']}', {q(a['rubrique'])})")
for c in ARCHIVES:
    rows_point.append(f"('{c}', '{P[c]['grade']}', 'archive', null, {q(P[c]['name'])}, {q(P[c]['node'])}, "
                      f"{q(P[c]['name'])}, {q(P[c]['node'])}, null, null, null, null)")

rows_ordre = []
for g in GRADES:
    rang_avant = {c: i for i, c in enumerate(avant_ordre[g], start=1)}
    for i, c in enumerate(apres_ordre[g], start=1):
        rows_ordre.append(f"('{c}', '{g}', {rang_avant.get(c, 'null')}, {i})")

toutes_refs = sorted(avant | apres)
rows_ref = [f"('{c}', '{g}', {str((c, g) in avant).lower()}, {str((c, g) in apres).lower()})"
            for c, g in toutes_refs]

N_ORIGINES, N_NEUFS, N_AJOUTS, N_ARCHIVES = nb['origines'], nb['morceaux'], nb['ajouts'], nb['archives']
N_REFS_AVANT, N_REFS_APRES = len(avant), len(apres)
N_ORDRE = len(rows_ordre)
N_TOUCHES = sum(len(avant_ordre[g]) for g in GRADES)
garde_noeud = '\n'.join(f'--   * {c} : {r}' for c, r in NOEUD_GARDE.items())

ENTETE = f"""-- ============================================================================
-- Passe des points du lycée (étape a) : coupes, points ⚙, puces rétablies, deux archivages.
-- ============================================================================
-- Un point qui disait plusieurs choses devient plusieurs points, un par savoir du BO (ADR 0020
-- § 7, règles 1a et 1b) ; les huit programmes du lycée (2de, 1re spé, gén., techno, Tle spé,
-- compl., expertes, techno). Décisions de David, toutes dans docs/wip/passe-lycee/ :
--   * propositions.tsv : 367 propositions ; les 335 « DECIDE » tenues pour OK (2026-10-22) ;
--   * page à cocher, 15 questions (2026-10-22) : Q03 = B (multiple · diviseur · pair/impair),
--     toutes les autres = A — la recommandation à chaque fois.
-- Les données ci-dessous sont GÉNÉRÉES par docs/wip/passe-lycee/generer-migration.py depuis ces
-- fichiers et l'état de la prod du 2026-10-22 (etat-prod.json) ; ne pas éditer à la main. La
-- fixture du test vient du même script.
--
-- Ce que fait la migration :
--   * {N_ORIGINES} points d'origine gardent leur code et prennent le libellé (et le nœud, s'il change) de
--     leur 1er morceau — le morceau que visent les modèles tagués (Q15) ; quatre d'entre eux sont
--     seulement réduits (T4 : 1TECHNO-087, TCOMP-225, TEXP-331, TTECHNO-019) ;
--   * {N_NEUFS} morceaux neufs, au code explicite (prochain libre du grade), qui copient de leur origine
--     le grade, la rubrique, le genre, l'exigence et le régime, chacun sur son nœud ;
--   * {N_AJOUTS} points ajoutés : 14 points ⚙ nés d'une ligne d'automatisme (2de ×4, 1re ×9, Tle techno
--     ×1) et 11 puces rétablies (T6, Tle spé l. 421 comprise) ;
--   * 2-373 et 2-374 archivés (doublons du BO, T4) : rien n'est supprimé ;
--   * l'ordre d'affichage de chaque grade du lycée est réécrit (1..N, ordre du BO) ;
--   * références d'automatismes : celles des points coupés restent au morceau qui garde le code
--     ou s'étendent aux morceaux que la fiche désigne ; les points ⚙ reçoivent celles de leur
--     ligne ; Q14 ajoute des liens vers des points existants ; UNE seule référence est déplacée
--     (Q04 : 2-382 § 2 → le 3e morceau, « représentations graphiques données »).
-- Nœud gardé (le nœud proposé est refusé par le garde des tags, à reprendre à l'étape c) :
{garde_noeud}
--
-- Tags de modèles : ils restent sur leur code (le morceau qu'ils visent, Q15) ; leur répartition
-- entre morceaux est l'étape c. Aucune donnée d'élève ne tient aux points du lycée (relevé du
-- 2026-10-22, prod : 0 état, 0 journal, 0 exercice, 0 signalement) — gardé ci-dessous.
--
-- Accès : AUCUN changement. Le référentiel reste lisible comme avant (anon et connectés) ;
-- aucune règle d'accès n'est touchée.
--
-- Gardes (avant toute écriture ; un refus ne laisse rien) : chaque origine et chaque point à
-- archiver existe avec son libellé ACTUEL exact, son grade, son nœud, non archivé ; aucune donnée
-- d'élève ne s'y accroche ; aucun code neuf n'existe ; chaque nœud visé existe une seule fois,
-- notion ou sous-notion non archivée ; les références d'automatismes des points en jeu sont
-- EXACTEMENT celles attendues ; l'ordre d'affichage des huit grades est EXACTEMENT celui attendu.
-- Prouvée par tests/integration/passe-points-lycee.test.ts (état après, rollback et rejeu).
--
-- ⚠️ Ne JAMAIS jouer ce fichier hors d'une transaction : pnpm db:migrate (supabase db push)
-- l'exécute en une seule transaction.
--
-- Rollback — à jouer dans une transaction ouverte par l'opérateur, en retirant les « -- » du
-- bloc (il ne contient ni begin ni commit). Il REFUSE si un usage s'est accroché à un point
-- neuf (tag de modèle ou d'exercice, état élève, journal, signalement) ou si leurs références ne
-- sont plus celles de la migration : le supprimer effacerait EN SILENCE (ON DELETE CASCADE) des
-- données d'élèves mineurs — DESTRUCTIF, arrêt obligatoire et accord explicite de David. Sinon
-- il remet les références d'avant, supprime les points neufs, rend aux origines leur libellé et
-- leur nœud, désarchive 2-373 et 2-374, puis renumérote chaque grade dans l'ordre existant, ce
-- qui ramène chaque point à son ordre d'avant. Les dates (updated_at) ne sont pas restaurées.
"""

ROLLBACK = f"""set local lock_timeout = '5s';
create temporary table _rb_point (
	code text primary key, grade text not null, role text not null,
	ancien_nom text, ancien_chemin text, nom text
) on commit drop;
insert into _rb_point (code, grade, role, ancien_nom, ancien_chemin, nom) values
{bloc([f"('{s['origin']}', '{s['grade']}', 'origine', {q(P[s['origin']]['name'])}, {q(P[s['origin']]['node'])}, {q(s['names'][0])})" for s in splits]
      + [f"('{c}', '{s['grade']}', 'neuf', null, null, null)" for s in splits for c in s['codes'][1:]]
      + [f"('{a['code']}', '{a['grade']}', 'neuf', null, null, null)" for a in ajouts]
      + [f"('{c}', '{P[c]['grade']}', 'archive', null, null, null)" for c in ARCHIVES])}
create temporary table _rb_ref (
	code text not null, grade text not null, avant boolean not null, apres boolean not null,
	primary key (code, grade)
) on commit drop;
insert into _rb_ref (code, grade, avant, apres) values
{bloc([f"('{c}', '{g}', {str((c, g) in avant).lower()}, {str((c, g) in apres).lower()})"
       for c, g in toutes_refs if ((c, g) in avant) != ((c, g) in apres)])}
create temporary table _rb_chemin on commit drop as
with recursive c as (
	select id, kind, archived_at, name::text as chemin from public.classification_nodes where parent_id is null
	union all
	select n.id, n.kind, n.archived_at, c.chemin || ' > ' || n.name
	  from public.classification_nodes n join c on n.parent_id = c.id
)
select id, kind, archived_at, chemin from c;
-- Verrou sur les points en jeu : une écriture d'élève qui viserait un point neuf (clé étrangère,
-- FOR KEY SHARE) attend la fin de cette transaction ; la garde ci-dessous reste vraie jusqu'au delete.
select 1 from public.curriculum_points p join _rb_point r on r.code = p.code for update of p;
do $rb_garde$
declare
	v_detail text;
begin
	select string_agg(r.code, ', ' order by r.code) into v_detail
	  from _rb_point r join public.curriculum_points p on p.code = r.code
	 where r.role = 'neuf'
	   and (exists (select 1 from public.question_template_points u where u.point_id = p.id)
	     or exists (select 1 from public.exercise_curriculum_points u where u.point_id = p.id)
	     or exists (select 1 from public.student_point_state u where u.point_id = p.id)
	     or exists (select 1 from public.journal_entry_points u where u.point_id = p.id)
	     or exists (select 1 from public.srs_anti_fraud_flags u where u.capacity_point_id = p.id));
	if v_detail is not null then
		raise exception 'rollback refusé : usages accrochés aux points neufs : % (DESTRUCTIF, accord de David)', v_detail;
	end if;
	select count(*)::text into v_detail from _rb_point r
	 where r.role = 'neuf' and not exists (select 1 from public.curriculum_points p where p.code = r.code);
	if v_detail <> '0' then
		raise exception 'rollback refusé : % point(s) neuf(s) absent(s) — la migration n''est pas jouée telle quelle', v_detail;
	end if;
	select string_agg(a.grade || '§' || p.code, ', ') into v_detail
	  from public.curriculum_point_automatismes a
	  join public.curriculum_points p on p.id = a.point_id
	  join _rb_point r on r.code = p.code and r.role = 'neuf'
	 where not exists (select 1 from _rb_ref x where x.code = p.code and x.grade = a.grade and x.apres);
	if v_detail is not null then
		raise exception 'rollback refusé : références d''automatismes posées depuis sur des points neufs : %', v_detail;
	end if;
	select string_agg(r.code, ', ' order by r.code) into v_detail
	  from _rb_point r
	 where r.role = 'origine'
	   and (select count(*) from _rb_chemin c
	         where c.chemin = r.ancien_chemin and c.archived_at is null and c.kind in ('notion', 'subnotion')) <> 1;
	if v_detail is not null then
		raise exception 'rollback refusé : nœud d''avant introuvable pour : %', v_detail;
	end if;
	select string_agg(r.code, ', ' order by r.code) into v_detail
	  from _rb_point r
	 where r.role = 'origine'
	   and not exists (select 1 from public.curriculum_points p where p.code = r.code and p.name = r.nom);
	if v_detail is not null then
		raise exception 'rollback refusé : libellé modifié depuis la migration (il serait écrasé) : %', v_detail;
	end if;
end $rb_garde$;
delete from public.curriculum_point_automatismes a
 using public.curriculum_points p, _rb_ref r
 where p.id = a.point_id and r.code = p.code and r.grade = a.grade and r.apres and not r.avant;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, r.grade from _rb_ref r join public.curriculum_points p on p.code = r.code
 where r.avant and not r.apres;
delete from public.curriculum_points p using _rb_point r where r.role = 'neuf' and p.code = r.code;
update public.curriculum_points p set name = r.ancien_nom, node_id = c.id
  from _rb_point r join _rb_chemin c on c.chemin = r.ancien_chemin and c.archived_at is null
                                     and c.kind in ('notion', 'subnotion')
 where r.role = 'origine' and p.code = r.code;
update public.curriculum_points p set archived_at = null
  from _rb_point r where r.role = 'archive' and p.code = r.code;
update public.curriculum_points p set display_order = x.o
  from (select id, row_number() over (partition by grade order by display_order, code) as o
          from public.curriculum_points
         where grade in ({', '.join(f"'{g}'" for g in GRADES)})) x
 where p.id = x.id and p.display_order <> x.o;
"""

CORPS = f"""-- ============================================================================

-- Une écriture concurrente fait échouer proprement la migration au lieu d'attendre.
set local lock_timeout = '5s';

-- ---- 1. Les données de la décision (générées) ----------------------------------
-- Un point en jeu : 'origine' (garde son code : libellé et nœud de son 1er morceau), 'neuf'
-- (morceau suivant d'une origine, dont il copie les attributs), 'ajout' (point ⚙ ou puce
-- rétablie, attributs donnés), 'archive' (archivé, libellé inchangé).
drop table if exists pg_temp._pl_point;
create temporary table _pl_point (
	code text primary key, grade text not null, role text not null, origine text,
	ancien_nom text, ancien_chemin text, nom text not null, chemin text not null,
	kind text, exigence text, regime text, rubrique text
);
insert into _pl_point (code, grade, role, origine, ancien_nom, ancien_chemin, nom, chemin, kind, exigence, regime, rubrique) values
{bloc(rows_point)}

-- L'ordre d'affichage de TOUS les points des huit grades : avant (null pour un point neuf), après.
drop table if exists pg_temp._pl_ordre;
create temporary table _pl_ordre (
	code text primary key, grade text not null, avant integer, apres integer not null
);
insert into _pl_ordre (code, grade, avant, apres) values
{bloc(rows_ordre)}

-- Les références d'automatismes (point, grade référent) des points en jeu : avant / après.
drop table if exists pg_temp._pl_ref;
create temporary table _pl_ref (
	code text not null, grade text not null, avant boolean not null, apres boolean not null,
	primary key (code, grade)
);
insert into _pl_ref (code, grade, avant, apres) values
{bloc(rows_ref)}

-- Le chemin de chaque nœud de l'arbre (« Branche > Notion > sous-notion »).
drop table if exists pg_temp._pl_chemin;
create temporary table _pl_chemin as
with recursive c as (
	select id, kind, archived_at, name::text as chemin
	  from public.classification_nodes where parent_id is null
	union all
	select n.id, n.kind, n.archived_at, c.chemin || ' > ' || n.name
	  from public.classification_nodes n join c on n.parent_id = c.id
)
select id, kind, archived_at, chemin from c;

-- ---- 2. Gardes : l'état attendu, sinon RIEN ne change ---------------------------
-- Verrou sur les points en jeu : une écriture d'élève qui viserait l'un d'eux attend la fin de la
-- migration ; les gardes ci-dessous restent vraies jusqu'aux écritures.
select 1 from public.curriculum_points p join _pl_point s on s.code = p.code
 where s.role in ('origine', 'archive') for no key update of p;
do $garde$
declare
	v_detail text;
begin
	-- 2a. chaque origine et chaque point à archiver existe avec son libellé actuel exact, son
	--     grade, son nœud actuel, non archivé
	select string_agg(s.code, ', ' order by s.code) into v_detail
	  from _pl_point s
	 where s.role in ('origine', 'archive')
	   and not exists (
		select 1 from public.curriculum_points p join _pl_chemin c on c.id = p.node_id
		 where p.code = s.code and p.name = s.ancien_nom and p.grade = s.grade
		   and c.chemin = s.ancien_chemin and p.archived_at is null);
	if v_detail is not null then
		raise exception 'état inattendu : points d''origine absents ou modifiés : %', v_detail;
	end if;
	-- 2b. aucune donnée d'élève ni tag d'exercice (les tags de modèles restent sur leur code)
	select string_agg(s.code, ', ' order by s.code) into v_detail
	  from _pl_point s join public.curriculum_points p on p.code = s.code
	 where s.role in ('origine', 'archive')
	   and (exists (select 1 from public.exercise_curriculum_points u where u.point_id = p.id)
	     or exists (select 1 from public.student_point_state u where u.point_id = p.id)
	     or exists (select 1 from public.journal_entry_points u where u.point_id = p.id)
	     or exists (select 1 from public.srs_anti_fraud_flags u where u.capacity_point_id = p.id)
	     or (s.role = 'archive'
	         and exists (select 1 from public.question_template_points u where u.point_id = p.id)));
	if v_detail is not null then
		raise exception 'état inattendu : données d''élèves, tags d''exercices (ou de modèles, sur un point à archiver) accrochés aux points en jeu : % (leur partage entre les morceaux n''est pas tranché)', v_detail;
	end if;
	-- 2c. aucun code neuf n'existe
	select string_agg(p.code, ', ' order by p.code) into v_detail
	  from public.curriculum_points p
	 where p.code in (select code from _pl_point where role in ('neuf', 'ajout'));
	if v_detail is not null then
		raise exception 'état inattendu : codes neufs déjà pris : %', v_detail;
	end if;
	-- 2d. chaque nœud visé existe une seule fois, notion ou sous-notion non archivée
	select string_agg(s.code, ', ' order by s.code) into v_detail
	  from _pl_point s
	 where (select count(*) from _pl_chemin c
	         where c.chemin = s.chemin and c.archived_at is null and c.kind in ('notion', 'subnotion')) <> 1;
	if v_detail is not null then
		raise exception 'état inattendu : nœud introuvable ou ambigu pour : %', v_detail;
	end if;
	-- 2e. les références d'automatismes des points en jeu sont EXACTEMENT celles attendues
	--     (« + » : en trop en base, « - » : absente de la base)
	select string_agg(d.r, ', ' order by d.r) into v_detail from (
		(select '+' || p.code || '§' || a.grade as r
		   from public.curriculum_point_automatismes a
		   join public.curriculum_points p on p.id = a.point_id
		  where p.code in (select code from _pl_ref union select code from _pl_point)
		    and not exists (select 1 from _pl_ref r where r.code = p.code and r.grade = a.grade and r.avant))
		union all
		(select '-' || r.code || '§' || r.grade
		   from _pl_ref r
		  where r.avant
		    and not exists (select 1 from public.curriculum_point_automatismes a
		                      join public.curriculum_points p on p.id = a.point_id
		                     where p.code = r.code and a.grade = r.grade))) d;
	if v_detail is not null then
		raise exception 'état inattendu : références d''automatismes différentes de celles attendues : %', v_detail;
	end if;
	-- 2f. l'ordre d'affichage des huit grades est EXACTEMENT celui attendu
	select string_agg(d.r, ', ' order by d.r) into v_detail from (
		(select '+' || p.code as r from public.curriculum_points p
		  where p.grade in (select distinct grade from _pl_ordre)
		    and not exists (select 1 from _pl_ordre o where o.code = p.code and o.grade = p.grade
		                                               and o.avant = p.display_order))
		union all
		(select '-' || o.code from _pl_ordre o
		  where o.avant is not null
		    and not exists (select 1 from public.curriculum_points p
		                     where p.code = o.code and p.grade = o.grade and p.display_order = o.avant))) d;
	if v_detail is not null then
		raise exception 'état inattendu : ordre d''affichage différent de celui attendu : %', v_detail;
	end if;
end $garde$;

-- ---- 3. Les points neufs : morceaux (copient leur origine), puis points ajoutés -----------
insert into public.curriculum_points
	(code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id, rang)
select s.code, s.nom, o.kind, o.exigence, o.regime_acquisition, o.rubrique, o.grade, r.apres, c.id, o.rang
  from _pl_point s
  join public.curriculum_points o on o.code = s.origine
  join _pl_ordre r on r.code = s.code
  join _pl_chemin c on c.chemin = s.chemin and c.archived_at is null and c.kind in ('notion', 'subnotion')
 where s.role = 'neuf';

insert into public.curriculum_points
	(code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id)
select s.code, s.nom, s.kind, s.exigence, s.regime, s.rubrique, s.grade, r.apres, c.id
  from _pl_point s
  join _pl_ordre r on r.code = s.code
  join _pl_chemin c on c.chemin = s.chemin and c.archived_at is null and c.kind in ('notion', 'subnotion')
 where s.role = 'ajout';

-- ---- 4. Les origines prennent le libellé et le nœud de leur 1er morceau ; deux archivés ----
update public.curriculum_points p set name = s.nom
  from _pl_point s
 where s.role = 'origine' and p.code = s.code and p.name <> s.nom;

update public.curriculum_points p set node_id = c.id
  from _pl_point s
  join _pl_chemin c on c.chemin = s.chemin and c.archived_at is null and c.kind in ('notion', 'subnotion')
 where s.role = 'origine' and s.chemin <> s.ancien_chemin and p.code = s.code;

update public.curriculum_points p set archived_at = now()
  from _pl_point s
 where s.role = 'archive' and p.code = s.code and p.archived_at is null;

-- ---- 5. L'ordre d'affichage final des huit grades --------------------------------------
update public.curriculum_points p set display_order = o.apres
  from _pl_ordre o
 where o.code = p.code and o.avant is not null and p.display_order <> o.apres;

-- ---- 6. Références d'automatismes : retirer celles qui ne sont plus, poser les nouvelles --
delete from public.curriculum_point_automatismes a
 using public.curriculum_points p, _pl_ref r
 where p.id = a.point_id and r.code = p.code and r.grade = a.grade and r.avant and not r.apres;

insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, r.grade
  from _pl_ref r join public.curriculum_points p on p.code = r.code
 where r.apres and not r.avant;

-- ---- 7. Vérifications (la migration échoue si le compte n'y est pas) ----------------
do $check$
declare
	v_detail text;
	v_n integer;
begin
	-- l'ordre et l'effectif de chaque grade : EXACTEMENT ceux attendus
	select string_agg(d.r, ', ' order by d.r) into v_detail from (
		(select '+' || p.code as r from public.curriculum_points p
		  where p.grade in (select distinct grade from _pl_ordre)
		    and not exists (select 1 from _pl_ordre o where o.code = p.code and o.grade = p.grade
		                                               and o.apres = p.display_order))
		union all
		(select '-' || o.code from _pl_ordre o
		  where not exists (select 1 from public.curriculum_points p
		                     where p.code = o.code and p.grade = o.grade and p.display_order = o.apres))) d;
	if v_detail is not null then
		raise exception 'passe lycée : ordre d''affichage incohérent : %', v_detail;
	end if;
	select count(*) into v_n from public.curriculum_points p where p.grade in (select distinct grade from _pl_ordre);
	if v_n <> {N_ORDRE} then
		raise exception 'passe lycée : points des huit grades : %/{N_ORDRE}', v_n;
	end if;
	-- chaque morceau neuf : son libellé, son nœud, les attributs de son origine
	select count(*) into v_n
	  from _pl_point s
	  join public.curriculum_points n on n.code = s.code and n.name = s.nom
	  join _pl_chemin c on c.id = n.node_id and c.chemin = s.chemin
	  join public.curriculum_points o on o.code = s.origine
	 where s.role = 'neuf' and n.grade = o.grade
	   and n.rubrique is not distinct from o.rubrique and n.kind = o.kind and n.exigence = o.exigence
	   and n.regime_acquisition = o.regime_acquisition and n.archived_at is null;
	if v_n <> {N_NEUFS} then
		raise exception 'passe lycée : morceaux neufs conformes : %/{N_NEUFS}', v_n;
	end if;
	-- chaque origine : le libellé et le nœud de son 1er morceau
	select count(*) into v_n
	  from _pl_point s
	  join public.curriculum_points p on p.code = s.code and p.name = s.nom
	  join _pl_chemin c on c.id = p.node_id and c.chemin = s.chemin
	 where s.role = 'origine' and p.archived_at is null;
	if v_n <> {N_ORIGINES} then
		raise exception 'passe lycée : origines conformes : %/{N_ORIGINES}', v_n;
	end if;
	-- chaque point ajouté : ses valeurs
	select count(*) into v_n
	  from _pl_point s
	  join public.curriculum_points p on p.code = s.code and p.name = s.nom
	  join _pl_chemin c on c.id = p.node_id and c.chemin = s.chemin
	 where s.role = 'ajout' and p.grade = s.grade and p.kind = s.kind and p.exigence = s.exigence
	   and p.regime_acquisition = s.regime and p.rubrique is not distinct from s.rubrique
	   and p.archived_at is null and p.rang is null;
	if v_n <> {N_AJOUTS} then
		raise exception 'passe lycée : points ajoutés conformes : %/{N_AJOUTS}', v_n;
	end if;
	-- deux points archivés, libellé inchangé
	select count(*) into v_n
	  from _pl_point s join public.curriculum_points p on p.code = s.code
	 where s.role = 'archive' and p.archived_at is not null and p.name = s.nom;
	if v_n <> {N_ARCHIVES} then
		raise exception 'passe lycée : points archivés : %/{N_ARCHIVES}', v_n;
	end if;
	-- les références des points en jeu sont EXACTEMENT celles attendues
	select string_agg(d.r, ', ' order by d.r) into v_detail from (
		(select '+' || p.code || '§' || a.grade as r
		   from public.curriculum_point_automatismes a
		   join public.curriculum_points p on p.id = a.point_id
		  where p.code in (select code from _pl_ref union select code from _pl_point)
		    and not exists (select 1 from _pl_ref r where r.code = p.code and r.grade = a.grade and r.apres))
		union all
		(select '-' || r.code || '§' || r.grade
		   from _pl_ref r
		  where r.apres
		    and not exists (select 1 from public.curriculum_point_automatismes a
		                      join public.curriculum_points p on p.id = a.point_id
		                     where p.code = r.code and a.grade = r.grade))) d;
	if v_detail is not null then
		raise exception 'passe lycée : références d''automatismes inattendues : %', v_detail;
	end if;
	select count(*) into v_n from _pl_ref where avant;
	if v_n <> {N_REFS_AVANT} then raise exception 'passe lycée : références avant : %/{N_REFS_AVANT}', v_n; end if;
	select count(*) into v_n from _pl_ref where apres;
	if v_n <> {N_REFS_APRES} then raise exception 'passe lycée : références après : %/{N_REFS_APRES}', v_n; end if;
end $check$;

drop table _pl_point, _pl_ordre, _pl_ref, _pl_chemin;
"""


def commente(texte):
    return '\n'.join(('-- ' + l) if l else '--' for l in texte.rstrip('\n').split('\n'))


sql = ENTETE + '-- ROLLBACK:BEGIN\n' + commente(ROLLBACK) + '\n-- ROLLBACK:END\n' + CORPS

if __name__ == '__main__':
    if '--resume' in sys.argv:
        print(json.dumps(nb, ensure_ascii=False))
        for g in GRADES:
            print(f'  {g}: {len(avant_ordre[g])} → {len(apres_ordre[g])} (codes jusqu’à {PREFIXE[g]}-{maxi[g]:03d})')
        for a in ajouts:
            print(f"  + {a['code']} {a['type']} « {a['name'][:60]} » {a['place']} refs={a['refs']}")
        sys.exit(0)
    MIGRATION.write_text(sql, encoding='utf-8')
    fixture['counts'] = nb
    fixture['nodeKept'] = sorted(NOEUD_GARDE)
    FIXTURE.write_text(json.dumps(fixture, ensure_ascii=False, indent='\t') + '\n', encoding='utf-8')
    print(f'écrit : {MIGRATION.relative_to(RACINE)} ({len(sql.splitlines())} lignes), {FIXTURE.relative_to(RACINE)}')
    print(json.dumps(nb, ensure_ascii=False))


# ---------------------------------------------------------------------------
# 8. Fixtures des seeds du lycée (--seeds) : mêmes décisions, appliquées au document de chaque grade
# ---------------------------------------------------------------------------
SEEDS = {'2': 'seed-2de-points.json', '1_SPE': 'seed-1spe-points.json', '1_GEN': 'seed-1gen-points.json',
         '1_TECHNO': 'seed-1techno-points.json', 'T_SPE': 'seed-tspe-points.json',
         'T_COMP': 'seed-tcomp-points.json', 'T_EXP': 'seed-texp-points.json',
         'T_TECHNO': 'seed-ttechno-points.json'}


def noeud_fixture(path):
    branche, notion, *sous = path.split(' > ')
    return {'branche': branche, 'notion': notion, 'sous_notion': sous[0] if sous else None}


def transformer_seed(g):
    chemin_f = FIXTURES / SEEDS[g]
    d = json.loads(chemin_f.read_text(encoding='utf-8'))
    actuels = {p['code']: p for p in d['points']}
    for p in etat['points']:
        if p['grade'] != g:
            continue
        f = actuels.get(p['code'])
        if not f or (f['name'], f['display_order'], f['rubrique']) != (p['name'], p['order'], p['rubrique']) \
                or ' > '.join(x for x in (f['branche'], f['notion'], f['sous_notion']) if x) != p['node']:
            echec(f'{SEEDS[g]} : {p["code"]} ne correspond pas à la base d’avant')
    if len(actuels) != len(avant_ordre[g]):
        echec(f'{SEEDS[g]} : effectif ≠ base d’avant')
    origine_de = {c: o for o, x in coupes.items() for c in x['codes'][1:]}
    points = []
    for i, code in enumerate(apres_ordre[g], start=1):
        if code in actuels:
            p = dict(actuels[code])
            if code in coupes:
                p['name'] = coupes[code]['labels'][0]
                p.update(noeud_fixture(coupes[code]['chemins'][0]))
        elif code in origine_de:
            o = coupes[origine_de[code]]
            k = o['codes'].index(code)
            p = dict(actuels[origine_de[code]])
            p.update({'code': code, 'name': o['labels'][k]}, **noeud_fixture(o['chemins'][k]))
        else:
            a = next(x for x in ajouts if x['code'] == code)
            p = {'code': code, 'grade': g, 'display_order': 0, 'name': a['name'], 'kind': a['kind'],
                 'exigence': a['exigence'], 'regime_acquisition': a['regime'], 'rubrique': a['rubrique'],
                 **noeud_fixture(a['chemin'])}
        p['display_order'] = i
        points.append(p)
    d['points'] = points
    refs = {(r['code'], r['grade']) for r in d['references']}
    if refs != {(r['code'], r['grade']) for r in etat['references'] if r['grade'] == g}:
        echec(f'{SEEDS[g]} : références ≠ base d’avant')
    nouvelles = (refs - (avant - apres)) | {(c, gg) for c, gg in apres - avant if gg == g}
    gardees = [r for r in d['references'] if (r['code'], r['grade']) in nouvelles]
    d['references'] = gardees + [{'code': c, 'grade': gg} for c, gg in sorted(nouvelles - refs)]
    chemin_f.write_text(json.dumps(d, ensure_ascii=False, indent='\t') + '\n', encoding='utf-8')
    return len(points), len(d['references'])


if __name__ == '__main__' and '--seeds' in sys.argv:
    for g in GRADES:
        n_points, n_refs = transformer_seed(g)
        print(f'{SEEDS[g]} : {n_points} points, {n_refs} références')
