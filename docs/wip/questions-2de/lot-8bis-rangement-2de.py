"""Lot 8 bis (vague 8 bis : 8 D, 8 E) de la 2de : migration nœud + tag et son test d'intégration.

Générés depuis ceux de la vague 8 (20261102055259_questions_2de_statistiques_rangement_tags) : seul
le lot change (identifiants créés en prod le 2026-11-02 par David, nœud du point relevé par MCP).
Les 6 anciens brouillons de probabilités (L8-d) sont déjà rangés et tagués : hors migration.

    python3 docs/wip/questions-2de/lot-8bis-rangement-2de.py
"""
import re
from pathlib import Path

RACINE = Path(__file__).resolve().parents[3]
HORO = '20261102090330'
NOM = 'questions_2de_tableaux_probabilites_rangement_tags'
SRC_MIG = RACINE / 'supabase/migrations/20261102055259_questions_2de_statistiques_rangement_tags.sql'
SRC_TEST = RACINE / 'tests/integration/questions-2de-statistiques-rangement-tags.test.ts'
MIG = RACINE / f'supabase/migrations/{HORO}_{NOM}.sql'
TEST = RACINE / 'tests/integration/questions-2de-tableaux-probabilites-rangement-tags.test.ts'

TC = ('Statistiques', 'Tableaux croisés')
PC = ('Probabilités', 'Probabilités conditionnelles')
# (id, libellé court, code, branche, notion, sous-notion)
LOT = [
    ('eb0dcd85-af63-442c-9bf4-3848b15891ea', 'lire un tableau croisé', '2-383', *TC, "tableau croisé d'effectifs"),
    ('d64946e4-9383-484b-a9e8-41c9d8e208c3', 'fréquence marginale, notion', '2-485', *TC, 'fréquences marginales et conditionnelles'),
    ('62105594-17b0-4a0e-91e1-f5be360db13f', 'calculer une fréquence marginale', '2-486', *TC, 'fréquences marginales et conditionnelles'),
    ('ba16b4f4-65d2-4850-8a9c-2b543f8cb379', 'fréquence conditionnelle, notion', '2-384', *TC, 'fréquences marginales et conditionnelles'),
    ('ed96107e-a0ba-49a2-afad-e5c75d5c4c3e', 'calculer une fréquence conditionnelle', '2-385', *TC, 'fréquences marginales et conditionnelles'),
    ('89e928a4-e0bf-4ba7-a3b8-46ff8abae375', 'compléter par les effectifs', '2-386', *TC, "tableau croisé d'effectifs"),
    ('b6ab5599-6995-4eea-9701-cde577c43541', 'compléter avec une fréquence conditionnelle', '2-487', *TC, "tableau croisé d'effectifs"),
    ('7953dcfc-bedc-465e-9abe-b8db19647d7e', 'loi des grands nombres', '2-389', 'Statistiques', 'Échantillonnage', 'fluctuation'),
    ('38fe4cd5-90ad-446d-a2cc-936faa2dde13', 'arbre de deux épreuves', '2-391', *PC, 'arbres pondérés'),
    ('b28f4a68-de95-4437-9e5a-c423fce38ead', 'construire un arbre pondéré', '2-393', *PC, 'arbres pondérés'),
    ('23ceafb0-61ea-4ce8-9e38-7a3e1f1a0dd1', "construire un tableau croisé d'effectifs", '2-394', *PC, 'tableaux croisés'),
    ('31096bae-515c-40e9-8305-000c28258afb', 'traduire en notations', '2-395', *PC, None),
    ('d7507e78-4041-441a-82fc-40de926f92cc', 'probabilité conditionnelle sur un arbre', '2-397', *PC, 'arbres pondérés'),
    ('94b22887-26db-491d-aa5e-ca3f828eafb7', 'faux positifs', '2-400', *PC, 'inversion du conditionnement'),
]
LOT.sort(key=lambda m: m[0])
N = len(LOT)
assert N == 14 and len({m[0] for m in LOT}) == N


def chemin(m):
    return ' > '.join(x for x in m[3:] if x)


def sq(x):
    return 'null' if x is None else "'" + x.replace("'", "''") + "'"


def remplace(texte, a, b):
    assert a in texte, a[:80]
    return texte.replace(a, b)


mig = SRC_MIG.read_text()
entete = ''.join(f"--   - {m[0][:8]} ({m[1]}) → {m[2]}, sur « {chemin(m)} » ;\n" for m in LOT)
mig = re.sub(r"(-- =+\n-- Chantier « questions-2de », lot 8 .*?\n-- =+\n)(--   - .*?\n)+",
             lambda _: '-- ' + '=' * 76 + '\n-- Chantier « questions-2de », lot 8 bis (tableaux croisés, probabilités) : nœud et tag de '
             + f'{N} modèles neufs\n-- ' + '=' * 76 + '\n' + entete, mig, count=1, flags=re.S)
mig = remplace(mig, "-- 2-372, 2-480, 2-382, 2-483 et 2-484 sont rangés sur leur NOTION (leur point n'a pas de\n-- sous-notion).",
               "-- 2-395 est rangé sur sa NOTION (son point n'a pas de sous-notion).")
mig = remplace(mig, "(son point n'a pas de sous-notion). Ni le contenu, ni les niveaux (écrits à la création), ni le statut ne changent :\n-- `updated_at` est PRÉSERVÉ.",
               "(son point n'a pas de sous-notion). Ni le contenu, ni les niveaux\n-- (écrits à la création), ni le statut ne changent : `updated_at` est PRÉSERVÉ.")
mig = remplace(mig, "(lots 8 A, 8 B et 8 C,", "(lots 8 D et 8 E,")
mig = remplace(mig, "tests/integration/questions-2de-statistiques-rangement-tags.test.ts", "tests/integration/" + TEST.name)
mig = remplace(mig, "phase 0 du lot 8, AVANT", "phase 0 du lot 8, AVANT")
mig = mig.replace('22 ', f'{N} ').replace('(0, 22)', f'(0, {N})').replace('sur 22', f'sur {N}')
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
test = remplace(test, 'lot 8 : nœud et tag de 22 modèles neufs', f'lot 8 bis : nœud et tag de {N} modèles neufs')
test = remplace(test, SRC_MIG.stem, MIG.stem)
test = remplace(test, "les 22 brouillons\n * « statistiques, information chiffrée » (lots 8 A, 8 B et 8 C)",
                f"les {N} brouillons\n * « tableaux croisés, probabilités » (lots 8 D et 8 E)")
lot_ts = ''.join(f"\t{{\n\t\tid: '{m[0]}',\n\t\tnoeud: '{chemin(m).replace(chr(39), chr(92) + chr(39))}',\n\t\tcode: '{m[2]}'\n\t}},\n" for m in LOT).rstrip(',\n') + '\n'
test = re.sub(r"(const LOT: \{ id: string; noeud: string; code: string \}\[\] = \[\n).*?(\n\];)",
              lambda mm: mm.group(1) + lot_ts.rstrip('\n') + mm.group(2), test, count=1, flags=re.S)
test = test.replace('Questions 2de, lot 8 :', 'Questions 2de, lot 8 bis :')
test = remplace(test, '21 modèle\\(s\\) sur 22', f'{N - 1} modèle\\(s\\) sur {N}')
test = remplace(test, "code = '2-365'", "code = '2-383'")
test = remplace(test, "code = '2-480'", "code = '2-487'")
TEST.write_text(test)
print(MIG.name, TEST.name)
