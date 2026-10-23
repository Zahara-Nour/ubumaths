"""Page à cocher du lot MODIFIER + TAG_PAR_VARIATION (passe lycée, phase 0).

Sources : ../lot-modifier.md (lots A/B/C, choix), ../scissions-plan.csv et ../scissions-notes.md, libellés des
points dans ../../bornes/points-lycee.csv. Écrit lot-modifier.html (à publier avec la capacité db).
Lancer depuis ce dossier : python3 gen-lot-modifier.py
"""

import csv
import json
import re
from collections import OrderedDict

LIB = {r['code']: r['libelle'] for r in csv.DictReader(open('../../bornes/points-lycee.csv'))}
TITRES = {}
for r in csv.DictReader(open('../scissions-lignes.csv'), delimiter=';'):
    TITRES[r['template_id']] = r['titre']

# ============================================================================
# QUESTIONS (id, titre, contexte, options [(code, libellé)], reco, pourquoi)
# ============================================================================
Q = [
    # Choix du lot MODIFIER
    ('B1', '`a69dfde7` Python : générer les paires, les triplets — V5', "V5 calcule une ligne du triangle de Pascal par la relation de Pascal : ce n'est pas TSPE-325 (énumérer des parties à 2 ou 3 éléments).",
     [('a', 'Modèle neuf tagué TSPE-323'), ('b', 'Retirer V5')], 'a', 'Comme les scissions : rien n’est perdu.'),
    ('B2', '`f2133048` Ensembles de points, images de z̄ et iz — V4', 'V4 (image de z̄ = symétrie d’axe réel) relève de TEXP-357, pas de TEXP-264.',
     [('a', 'Modèle neuf tagué TEXP-357'), ('b', 'Retirer V4')], 'a', 'Comme les scissions : rien n’est perdu.'),
    ('B3', '`6be786ef` Chaîne, cycle, connexité — V4', 'V4 (connexité) relève de TEXP-316.',
     [('a', 'Modèle neuf tagué TEXP-316'), ('b', 'La garder sur TEXP-315 (connexité définie par les chaînes)')], 'a', 'Un point par tâche, comme les scissions.'),
    ('C1', '`227f2c9c` Dériver une exponentielle de fonction affine', 'Le corrigé énonce (e^u)′ = u′e^u, absent de 1SPE-295.',
     [('a', 'Corrigé par e^(ax+b) = e^b·e^(ax), sans la règle (e^u)′'), ('b', 'Retirer b : e^(ax) seulement')], 'a', 'Le modèle garde toutes ses questions.'),
    ('C2', '`8d69e3a9` Matrice d’une rotation, d’une symétrie, d’une homothétie — V3', 'L’homothétie n’est pas définie dans l’énoncé, alors que V1 définit la rotation.',
     [('a', 'Définir l’homothétie dans l’énoncé, comme V1'), ('b', 'Retirer V3')], 'a', 'Même traitement que V1, rien n’est perdu.'),
    ('C3', '`cd4f9fb3` Inverse d’une matrice carrée d’ordre 2 — V1, V2, V4', 'La formule de l’inverse n’est pas au programme : V3 la donne déjà dans l’énoncé.',
     [('a', 'Donner la formule dans l’énoncé, comme V3'), ('b', 'Demander de vérifier AB = I')], 'a', 'Aligne les variations sur V3.'),
    ('C4', '`646b4cd3` Équation d’une sphère, centre et rayon — V4', 'V4 lit le centre et le rayon sur x² + y² + z² + px + qy + rz + d = 0 (complétion des carrés).',
     [('a', 'L’accepter (lecture inverse du même savoir) : simple tag TSPE-376'), ('b', 'Retirer V4')], 'a', 'La complétion du carré est une technique de 1re ; V1-V3 sont exactement TSPE-376.'),
    ('H', '10 modèles de 1re spé hors programme à leur niveau',
     'Ta décision « pas de tag pour un autre programme » partait de ma reco, qui supposait qu’un modèle s’appauvrirait à son niveau. '
     'Ces 10 modèles sont HORS_PROGRAMME en 1re spé : rien à appauvrir, et sans traitement ils restent sans aucun tag. '
     'Tle spé : 463f483e, fccd570b (MODIFIER TSPE-458), 99c772c0 (MODIFIER TSPE-457), 7eec7032 (TSPE-597 / 598). '
     '2de : 68db64b0, 9724dc3d, 0a1ff14f, 219c9470, 6c3ee9e6, 5426cead (plusieurs points chacun).',
     [('a', 'Les traiter dans leur vrai programme (modifier, scinder)'), ('b', 'Pas de tag, liste gardée')], 'a',
     'Leur niveau (grades) reste une question à part, comme les 3 changements de niveau du collège.'),
    # A_TRANCHER des scissions
    ('E3', 'Famille E3 : arithmétique ou géométrique ? (61e2ac1f, d2943133, f63408c5, d2067413, c90fa022)',
     'Chaque question (arithmétique / géométrique / ni l’un ni l’autre) mobilise les deux définitions : aucune répartition par variation possible.',
     [('a', 'Dédoubler et réécrire : deux modèles à question binaire, toutes les variations (5 neufs)'), ('b', 'Répartir par réponse attendue, QCM à 3 choix gardé'), ('c', 'Sans tag de 1re spé')],
     'a', 'C’est ta décision m-1spe-a-3 ; énoncés et choix à réécrire, comme un MODIFIER. B contredit l’inclusion stricte.'),
    ('S6', '`0dee4515` Somme et produit des racines', 'Chaque variation demande la somme ET le produit.',
     [('a', 'Scission par case : origine = somme (1SPE-245), neuf = produit (1SPE-383)'), ('b', 'Garder 1SPE-245 tel quel'), ('c', 'Sans tag')], 'a', 'Ta décision m-1spe-a-6.'),
    ('S7', '`37ce7759` Convexité et inflexion : lecture graphique', 'Tle spé : 4 points (V1 419, V2 588, V3 590, V4 587) ; Tle compl. : V1-V3 264, V4 353. Une variation par groupe.',
     [('a', 'Scinder en 4'), ('b', 'Scinder en 2 selon la Tle compl. (la Tle spé perd 3 questions)'), ('c', 'Sans tag')], 'a', 'Quatre capacités distinctes du BO, chaque variation tient seule.'),
    ('S8', '`ef3c495c` Coefficients binomiaux : chemins, symétrie, Pascal', 'Tle spé : 5 points ; Tle compl. : 3. Partition commune : 5 groupes.',
     [('a', 'Scinder en 5'), ('b', 'Relire V5 en TSPE-316 (relation de Pascal, comme V3) : 4 modèles'), ('c', 'Sans tag')], 'b',
     'V5 déduit une ligne du triangle de la précédente : c’est la relation de Pascal, et la Tle compl. met déjà V3 et V5 ensemble. Change le verdict de V5 (TSPE-547 → TSPE-316).'),
    ('S9', '`6c80b4ec` Loi binomiale : table de P(X ⩽ k)', 'Tle spé : 4 points ; Tle compl. : 2.',
     [('a', 'Scinder en 4'), ('b', 'Scinder en 2 selon la Tle compl.'), ('c', 'Sans tag')], 'a', 'Chaque variation a sa table et son k tirés : elle tient seule.'),
    ('S10', '`45d1cdd6` Euler, Moivre, addition, duplication (Tle expertes)', '4 groupes ; V1 à V4 n’ont aucune variable (toujours la même question).',
     [('a', 'Scinder en 4 (deux neufs à instance unique)'), ('b', 'Scinder en 2 en retirant V3 et V4'), ('c', 'Sans tag')], 'a', 'Questions de cours fixes mais légitimes ; B perdrait Moivre et les formules d’addition.'),
    ('S11', '`30b597c3` Bernoulli, binomiale ou géométrique : identifier la loi', '3 groupes nets, mais chaque neuf aurait toujours la même réponse ; V2 sans variable.',
     [('a', 'Scinder en 3 tel quel'), ('b', 'Scinder, puis enrichir V2 (dé à n faces, p tirée) comme un MODIFIER'), ('c', 'Sans tag')], 'b', 'L’origine garde V1 et V4, où la discrimination subsiste.'),
    # Contradictions
    ('X1', '`d3301f2d`, `14036c68` : équations et inéquations avec exp, en Tle spé',
     'Le CSV tague tout en TSPE-446 / TSPE-596 (équation fonctionnelle du logarithme). La Tle spé a aussi TSPE-445 / TSPE-595 (… de l’exponentielle). Les neufs en exp (eˣ = b, e^{−x} ⩾ k) relèvent de quel point ?',
     [('a', 'Points exp : TSPE-445 / TSPE-595'), ('b', 'Points ln, comme le CSV : TSPE-446 / TSPE-596')], 'a', 'Proposition de l’agent : chaque neuf porte sur l’exponentielle.'),
    ('X2', '`7690e290` V3 (affixe du milieu), Tle expertes',
     'Le CSV met V3 en TEXP-212 « Affixe d’un point » (notion) et dit que le tag actuel TEXP-223 « Déterminer l’affixe d’un point » ne décrit aucune variation. Or TEXP-223 décrit V3.',
     [('a', 'TEXP-223 (tag actuel)'), ('b', 'TEXP-212, comme le CSV')], 'a', 'TEXP-223 est la capacité, TEXP-212 la notion.'),
    ('X3', '`dbee4649` en Tle compl. : variance sous des points « écart type »',
     'V2 et V4 demandent une variance ; TCOMP-363 et TCOMP-359 parlent d’écart type.',
     [('a', 'Accepter : la variance est le carré de l’écart type'), ('b', 'MODIFIER : demander l’écart type')], 'a', 'Le modèle sert aussi la Tle spé, où la variance est au programme : demander l’écart type la lui retirerait.'),
]

# ============================================================================
# LIGNES À VALIDER
# ============================================================================
MODIFS = [
    ('A', '9f00da01', '1SPE-384', 'V2 : b/(2a) entier ou demi-entier ; et retirer V3 (forme factorisée)'),
    ('A', '95ee8348', 'TCOMP-272', 'V2 : intégrande √(t² + c) → 1/(t² + c) ou ln(t² + c), F′(2) exact'),
    ('B', 'f3e68e4b', '2-396', 'Retirer V2 (tableau en pourcentages)'),
    ('B', '0ab3faa5', '1SPE-204', 'Retirer V3 (négation sans quantificateur, de la 2de)'),
    ('B', 'a69dfde7', 'TSPE-325', 'Retirer V2 (couples i ≠ j) et V4 (toutes les parties) ; V5 : question B1'),
    ('B', 'f2133048', 'TEXP-264', 'Retirer V5 (rotation nommée) et « rotation » des distracteurs ; V4 : question B2'),
    ('B', '6be786ef', 'TEXP-315', 'Retirer V2 (cycle) et les distracteurs « C’est un cycle » ; V4 : question B3'),
    ('C', '849aabbc', '1SPE-231', '« Détermine la limite » → « Quelle semble être la limite » (conjecture)'),
    ('C', 'bb554c62', '1SPE-283', 'Retirer « limites aux bornes de l’ensemble de définition » du verso'),
    ('C', '227f2c9c', '1SPE-295', 'Question C1'),
    ('C', 'f7194c9d', '1SPE-304', '« angle orienté de mesure x » → « réel x » ; « mesure principale » → « réel de ]−π ; π] associé au même point du cercle »'),
    ('C', 'f2cc01fc', '1SPE-318', 'V3 : « une mesure en radians de l’angle (u, v) », sans « orienté »'),
    ('C', '293f8225', 'TEXP-246', 'V1 : l’énoncé rappelle « on admet que le conjugué d’une racine est racine »'),
    ('C', '6ff00846', 'TEXP-246', 'V1 : « à coefficients réels » ; V3-V4 : même rappel'),
    ('C', '8d69e3a9', 'TEXP-323', 'Question C2'),
    ('C', '93539700', 'TEXP-323', 'V2 : donner la matrice de la rotation, comme V3'),
    ('C', 'cd4f9fb3', 'TEXP-338', 'Question C3'),
    ('C', '646b4cd3', 'TSPE-376', 'Question C4'),
]
LOTS = {'A': 'Lot A — nombres ou fonction', 'B': 'Lot B — retirer des variations', 'C': 'Lot C — énoncé ou corrigé'}

MTITRES = {}
for f in ['2de', '1spe-a', '1spe-a-2de', '1spe-b', 'tspe', 'tspe-tcomp', 'texp']:
    for r in csv.DictReader(open('../' + f + '.csv'), delimiter=';'):
        MTITRES.setdefault(r['template_id'][:8], r['titre'])


def pt(code):
    code = code.strip()
    return {'c': code, 'l': LIB.get(code, '')} if code else None


plan = OrderedDict()
for r in csv.DictReader(open('../scissions-plan.csv'), delimiter=';'):
    plan.setdefault(r['template_id_origine'], []).append(r)
SCISSIONS, AUTRES = [], []
for tid, rs in plan.items():
    roles = {r['role'] for r in rs}
    item = {'id': tid[:8], 't': TITRES.get(tid, ''), 'g': [
        {'r': r['role'], 'v': r['variations'], 'p': [x for x in (pt(r['T_SPE_ou_programme_1']), pt(r['programme_2'])) if x],
         'tp': r['titre_propose'], 'rq': r['remarque']} for r in rs]}
    (SCISSIONS if roles <= {'ORIGINE', 'NEUF'} else AUTRES).append(item)
SANS = [a for a in AUTRES if a['g'][0]['r'] == 'SANS_TAG']

DATA = {
    'q': [{'id': i, 't': t, 'x': x, 'o': o, 'reco': r, 'w': w} for i, t, x, o, r, w in Q],
    'mod': [{'k': 'm-' + m, 'lot': l, 'id': m, 't': MTITRES.get(m, ''), 'p': pt(p), 'x': x} for l, m, p, x in MODIFS],
    'lots': LOTS,
    'sc': [dict(s, k='s-' + s['id']) for s in SCISSIONS],
    'sans': SANS,
}
print(len(DATA['q']), 'questions ·', len(DATA['mod']), 'MODIFIER ·', len(DATA['sc']), 'scissions ·',
      sum(1 for s in SCISSIONS for g in s['g'] if g['r'] == 'NEUF'), 'neufs ·', len(SANS), 'sans tag')
assert all(MTITRES.get(m) for _, m, _, _ in MODIFS)
assert all(p['l'] for s in SCISSIONS for g in s['g'] for p in g['p']), 'libellé manquant'

css = open('style.html').read()
extra = re.search(r'<style>\n(\.vd .*?)</style>', open('gen.mjs').read(), re.S).group(1)
tpl = open('lot-modifier.tpl.html').read()
html = tpl.replace('/*STYLE*/', css + '<style>\n' + extra + '</style>').replace(
    '/*DATA*/', json.dumps(DATA, ensure_ascii=False).replace('<', '\\u003c'))
open('lot-modifier.html', 'w').write(html)
