"""Lot 8 (vague 8 : 8 A, 8 B, 8 C) de la 2de : migration nœud + tag et son test d'intégration.

Générés depuis ceux du lot 7 (20261101224703_questions_2de_signes_variations_rangement_tags) : seul
le lot change (identifiants créés en prod le 2026-11-02 par David, nœud du point relevé par MCP).

    python3 docs/wip/questions-2de/lot-8-rangement-2de.py
"""
import re
from pathlib import Path

RACINE = Path(__file__).resolve().parents[3]
HORO = '20261102055259'
NOM = 'questions_2de_statistiques_rangement_tags'
SRC_MIG = RACINE / 'supabase/migrations/20261101224703_questions_2de_signes_variations_rangement_tags.sql'
SRC_TEST = RACINE / 'tests/integration/questions-2de-signes-variations-rangement-tags.test.ts'
MIG = RACINE / f'supabase/migrations/{HORO}_{NOM}.sql'
TEST = RACINE / 'tests/integration/questions-2de-statistiques-rangement-tags.test.ts'

# (id, libellé court, code, branche, notion, sous-notion)
LOT = [
    ('de146ac1-f0fb-413c-996e-3132a1f02f7e', 'variation absolue', '2-365', 'Proportionnalité', 'Évolutions', 'variations en pourcentage'),
    ('2dec310f-86f4-4fc3-9c74-656ed4ac1299', 'coefficients successifs', '2-368', 'Proportionnalité', 'Évolutions', 'évolutions successives et réciproque'),
    ('7a763528-d666-4d02-95ed-7fff218b9b7b', 'coefficient réciproque', '2-478', 'Proportionnalité', 'Évolutions', 'évolutions successives et réciproque'),
    ('11f91d46-82c7-4dca-8812-e85b7bd93ae2', 'pourcentage d\'un pourcentage', '2-364', 'Proportionnalité', 'Pourcentages', 'calculs de pourcentages'),
    ('afbfa8c6-ad87-40ed-83e9-2e29cec24480', 'pourcentages de pourcentages, effectifs', '2-376', 'Proportionnalité', 'Pourcentages', 'calculs de pourcentages'),
    ('5b3bef9f-f2b0-49e0-8b15-9ef7d19c9c4b', 'effectifs, proportions, pourcentages', '2-375', 'Statistiques', 'Représenter des données', 'effectifs et fréquences'),
    ('39b4823d-0241-408b-b04e-1fb6620b1951', 'le tout connaissant une partie', '2-490', 'Proportionnalité', 'Pourcentages', 'calculs de pourcentages'),
    ('cc88ebd3-411a-4a86-80f9-084b9840f863', 'images lues sur une courbe', '2-491', 'Fonctions', 'Généralités sur les fonctions', 'images et antécédents'),
    ('ba0925ce-e338-4a87-91f5-270c55329e0b', 'linéarité de la moyenne', '2-369', 'Statistiques', 'Indicateurs', 'moyenne'),
    ('ef92701a-a752-42b5-9873-7aa9f2035166', 'écart type', '2-370', 'Statistiques', 'Indicateurs', 'écart-type'),
    ('a4de4154-a681-48b9-802a-f5f1b9df6fb9', 'moyenne après ajout ou retrait', '2-371', 'Statistiques', 'Indicateurs', 'moyenne'),
    ('3c411c3b-354b-4e66-91ce-64c6308860e0', 'médiane après ajout ou retrait', '2-479', 'Statistiques', 'Indicateurs', 'médiane'),
    ('82ba1365-0c8f-4d04-bce2-4c314748e291', 'interpréter un quartile', '2-402', 'Statistiques', 'Indicateurs', 'quartiles'),
    ('893eb3cd-4c8e-4957-b739-844bcb4caaa7', 'comparer : moyenne et écart type', '2-382', 'Statistiques', 'Indicateurs', None),
    ('6b2b7055-f935-4481-98b2-f0704be3a0f3', 'comparer : médiane et écart interquartile', '2-483', 'Statistiques', 'Indicateurs', None),
    ('7ca1d2da-5519-4968-b903-5003ed4b1502', 'lire un histogramme', '2-372', 'Statistiques', 'Représenter des données', None),
    ('7a56029d-3c3b-4dcd-a7fc-c94912d9d80f', 'polygone des fréquences cumulées', '2-480', 'Statistiques', 'Représenter des données', None),
    ('03d8f171-09b1-43e3-987d-1c19f963372b', 'moyenne des moyennes de classes', '2-380', 'Statistiques', 'Indicateurs', 'moyenne'),
    ('90e2e7d8-4c6a-4ce9-b870-79e300381d14', 'moyenne par les centres', '2-481', 'Statistiques', 'Indicateurs', 'moyenne'),
    ('b7c71958-5d88-4828-87d7-5a4964fcb1d1', 'classe médiane', '2-381', 'Statistiques', 'Indicateurs', 'médiane'),
    ('8d94fd69-4375-4773-8eef-63f59f05a0ce', 'médiane estimée', '2-482', 'Statistiques', 'Indicateurs', 'médiane'),
    ('b73677c8-0bb9-4e8d-af79-3a45d30a6a11', 'comparer deux boîtes à moustaches', '2-484', 'Statistiques', 'Indicateurs', None),
]
LOT.sort(key=lambda m: m[0])
N = len(LOT)
assert N == 22 and len({m[0] for m in LOT}) == N


def chemin(m):
    return ' > '.join(x for x in m[3:] if x)


def sq(x):
    return 'null' if x is None else "'" + x.replace("'", "''") + "'"


mig = SRC_MIG.read_text()
# En-tête : liste des modèles
entete = ''.join(f"--   - {m[0][:8]} ({m[1]}) → {m[2]}, sur « {chemin(m)} » ;\n" for m in LOT)
mig = re.sub(r"(-- =+\n-- Chantier « questions-2de », lot 7.*?\n-- =+\n)(--   - .*?\n)+",
             lambda _: '-- ' + '=' * 76 + '\n-- Chantier « questions-2de », lot 8 (statistiques, information chiffrée) : nœud et tag de '
             + f'{N} modèles neufs\n-- ' + '=' * 76 + '\n' + entete, mig, count=1, flags=re.S)
mig = mig.replace("-- 2-475 est rangé sur sa NOTION (son point n'a pas de sous-notion). Ni le contenu, ni\n-- les niveaux",
                  "-- 2-372, 2-480, 2-382, 2-483 et 2-484 sont rangés sur leur NOTION (leur point n'a pas de\n-- sous-notion). Ni le contenu, ni les niveaux")
mig = mig.replace("les niveaux (écrits à la création), ni le statut ne changent : `updated_at` est PRÉSERVÉ.",
                  "les niveaux (écrits à la création), ni le statut ne changent :\n-- `updated_at` est PRÉSERVÉ.")
mig = mig.replace("Décision de David le 2026-11-01 (journal docs/wip/questions-2de-progress.md § 44)",
                  "Décision de David le 2026-11-02 (journal docs/wip/questions-2de-progress.md § 51)")
mig = mig.replace("ont été créés en brouillon le 2026-11-01 par scripts/create-questions.ts (lots 7 A, 7 B et 7 C,",
                  "ont été créés en brouillon le 2026-11-02 par scripts/create-questions.ts (lots 8 A, 8 B et 8 C,")
mig = mig.replace("questions-2de-signes-variations-rangement-tags.test.ts", TEST.name)
mig = mig.replace("(relevé MCP du 2026-11-01)", "(relevé MCP du 2026-11-02)")
mig = mig.replace("phase 0 du lot 7, AVANT\n-- le SQL, tranchée par lui le 2026-11-01",
                  "phase 0 du lot 8, AVANT\n-- le SQL, tranchée par lui le 2026-11-02")
mig = mig.replace('21 ', f'{N} ').replace('(0, 21)', f'(0, {N})').replace('sur 21', f'sur {N}')
# Listes du rollback et de l'insertion
ids_vals = ',\n'.join(f"--                ('{m[0]}'::uuid)" for m in LOT)
mig = re.sub(r"--   from \(values\n(--                \('[0-9a-f-]{36}'::uuid\),?\n?)+\) as r\(id\)",
             lambda _: '--   from (values\n' + ids_vals + ') as r(id)', mig, count=1)
codes_vals = ',\n'.join(f"-- \t('{m[0]}'::uuid, '{m[2]}')" for m in LOT)
mig = re.sub(r"(-- \t\('.*?'::uuid, '2-\d+'\),?\n)+", lambda _: codes_vals + '\n', mig, count=1)
upd_vals = ',\n'.join(f"--               '{m[0]}'" for m in LOT)
mig = re.sub(r"(--               '[0-9a-f-]{36}'(,|\);)\n)+", lambda _: upd_vals + ');\n', mig, count=1)
ins = ',\n'.join(f"\t('{m[0]}', {sq(m[3])}, {sq(m[4])}, {sq(m[5])}, '{m[2]}')" for m in LOT)
mig = re.sub(r"insert into _qc_modeles values\n(\t\(.*?\)[,;]\n)+", lambda _: 'insert into _qc_modeles values\n' + ins + ';\n', mig, count=1)
MIG.write_text(mig)

test = SRC_TEST.read_text()
test = test.replace('lot 7 : nœud et tag de 21 modèles neufs', f'lot 8 : nœud et tag de {N} modèles neufs')
test = test.replace(SRC_MIG.stem, MIG.stem)
test = test.replace("les 21 brouillons\n * « signes et variations » (lots 7 A, 7 B et 7 C) créés le 2026-11-01",
                    f"les {N} brouillons\n * « statistiques, information chiffrée » (lots 8 A, 8 B et 8 C) créés le 2026-11-02")
test = test.replace('§ 44.', '§ 51.')
test = test.replace('identifiant créé en prod le 2026-11-01', 'identifiant créé en prod le 2026-11-02')
lot_ts = ''.join(f"\t{{\n\t\tid: '{m[0]}',\n\t\tnoeud: '{chemin(m)}',\n\t\tcode: '{m[2]}'\n\t}},\n" for m in LOT).rstrip(',\n') + '\n'
test = re.sub(r"(const LOT: \{ id: string; noeud: string; code: string \}\[\] = \[\n).*?(\n\];)",
              lambda mm: mm.group(1) + lot_ts.rstrip('\n') + mm.group(2), test, count=1, flags=re.S)
test = test.replace('Questions 2de, lot 7', 'Questions 2de, lot 8')
test = test.replace('20 modèle\\(s\\) sur 21', f'{N - 1} modèle\\(s\\) sur {N}')
test = test.replace("code = '2-329'", "code = '2-365'").replace("code = '2-477'", "code = '2-480'")
TEST.write_text(test)
print(MIG.name, TEST.name)
