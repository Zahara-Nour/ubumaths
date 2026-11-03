"""Génère la migration de CONTENU du lot 4 du chantier « questions-1spe-demonstrations » (journal § 7,
D2, et § 8) : une variation « étapes à ranger » (```ranger, `signe: aucun`) ajoutée en DERNIER aux 14
modèles publiés de démonstrations ; leurs variations 1 à 3 et leurs specs ne changent pas.

`create-questions --mettre-a-jour` ne touche pas un modèle publié : d'où cette migration (patron
`docs/pratiques/couvrir-un-niveau.md` § 7, précédent `docs/wip/questions-6/lot-contenu-6-ranger.py`).
Le résultat doit être EXACTEMENT la source `scripts/questions/1spe-demonstrations-{1,2,3}/*.json`
(variations, specs ; titre et description inchangés, vérifiés). Avant : le contenu relevé en prod doit
être EXACTEMENT l'ancienne source (git `origin/main`) ; les 3 premières variations et les specs d'avant
sont exigées intactes dans le nouveau contenu. Ni tag, ni nœud, ni niveau, ni statut ne changent.
Instantané : `etat_prod_releve.py` (relevé MCP, empreintes vérifiées).

    python3 docs/wip/questions-1spe-demonstrations/lot4-contenu.py
"""

import json
import subprocess
import sys

sys.path.insert(0, 'docs/archive/wip/arbre-notions/analyse')
sys.path.insert(0, 'docs/archive/wip/passe-lycee/analyse')
sys.path.insert(0, 'docs/wip/questions-1spe-demonstrations')
from scissions_outils import generer  # noqa: E402
from etat_prod_releve import RELEVE  # noqa: E402

ETAT = 'docs/wip/questions-1spe-demonstrations/etat-prod-2026-11-03-etapes/'


def chemin_source(court_fichier: str) -> str:
    d, nom = court_fichier.split('/')
    return f'scripts/questions/1spe-demonstrations-{d}/{nom}.json'


SOURCES = {i[:8]: chemin_source(v[0]) for i, v in RELEVE.items()}
CODES = {i[:8]: v[7] for i, v in RELEVE.items()}


# ============================================================================
# RETOUCHE
# ============================================================================

def source(court: str) -> dict:
    return json.load(open(SOURCES[court]))


def ancienne_source(court: str) -> dict:
    texte = subprocess.run(['git', 'show', f'origin/main:{SOURCES[court]}'], check=True,
                           capture_output=True, text=True).stdout
    return json.loads(texte)


def avec_etapes(court: str):
    """Variations et specs remplacées par la source ; la prod doit être l'ancienne source, et la
    source = l'ancienne + UNE variation ```ranger en dernier, avec ses seules specs neuves."""
    def retouche(t: dict) -> None:
        a = ancienne_source(court)
        assert t['variations'] == a['variations'], f'{court} : prod ≠ ancienne source (variations)'
        assert t['test_specs'] == a['testSpecs'], f'{court} : prod ≠ ancienne source (specs)'
        s = source(court)
        assert (t['title'], t['description']) == (s['title'], s['description']), f'{court} : titre'
        n = len(a['variations'])
        assert s['variations'][:n] == a['variations'] and len(s['variations']) == n + 1, court
        assert '```ranger\nsigne: aucun\n' in s['variations'][n]['statement'], court
        assert s['testSpecs'][:len(a['testSpecs'])] == a['testSpecs'], court
        assert all(x['variationIndex'] == n for x in s['testSpecs'][len(a['testSpecs']):]), court
        t['variations'] = s['variations']
        t['test_specs'] = s['testSpecs']
    return retouche


# ============================================================================
# LE LOT
# ============================================================================

RELEVE_PROD = {t['id'][:8]: t for t in json.load(open(ETAT + 'templates.json'))}
CONTENU = tuple(sorted(SOURCES))


def part(court: str) -> tuple:
    t = RELEVE_PROD[court]
    return (list(range(len(t['variations']))), [CODES[court]], t['title'], t['description'], avec_etapes(court))


LOT = {c: [part(c)] for c in CONTENU}

ENTETE = """-- ============================================================================
-- Chantier « questions-1spe-demonstrations », lot 4 : étapes à ranger dans les 14 démonstrations
-- ============================================================================
--   Les 14 modèles publiés de démonstrations de 1re spécialité reçoivent chacun une variation de
--   plus, la dernière : « Remets les étapes de la démonstration dans l'ordre » (bloc ```ranger,
--   `signe: aucun`, 4 à 6 étapes). Leurs trois variations et leurs specs d'avant ne changent pas ;
--   deux specs s'ajoutent par modèle (ordre juste, deux étapes échangées).
-- Ni tag, ni nœud, ni niveau, ni statut, ni titre ne changent ici.
-- Exige en prod le code de #2341 (`signe: aucun` du bloc ranger), livré par `deploy:prod` AVANT.
-- ============================================================================
-- Décision de David le 2026-11-03 (journal docs/wip/questions-1spe-demonstrations-progress.md § 7,
-- D2). Fichier GÉNÉRÉ par docs/wip/questions-1spe-demonstrations/lot4-contenu.py — ne pas éditer à
-- la main.
--
-- Les modèles n'existent qu'en production : en base locale (vide), la migration ne touche aucun
-- modèle et ses vérifications le tolèrent ; elle exige TOUT ou RIEN ({n} modèles). Elle est prouvée
-- par tests/integration/questions-1spe-demonstrations-etapes-contenu.test.ts, qui fabrique des copies
-- des identifiants de la prod (contenu, nœud, niveaux et tags) puis rejoue CE fichier.
--
-- Garde : chaque modèle doit avoir EXACTEMENT le contenu relevé en prod le 2026-11-03, être au
-- nœud, aux niveaux et au statut relevés, et porter exactement son tag relevé.
--
-- Données d'élèves : non touchées (seuls les variations et les specs changent ; une variation
-- s'ajoute en dernier, les indices des trois premières restent les mêmes).
--
-- Accès : personne ne gagne ni ne perd d'accès (aucune règle ne change). Question posée à David
-- avant le SQL, réponse du 2026-11-03 : « je te suis » sur la reco « personne de plus ». Effet
-- visible : les élèves de 1re spécialité voient une variation de plus dans ces 14 modèles.
--"""


if __name__ == '__main__':
    releve = [RELEVE_PROD[c] for c in CONTENU]
    generer(LOT, releve=releve, etat=ETAT, niveaux_pris={},
            migration='supabase/migrations/20261103194133_questions_1spe_demonstrations_etapes_contenu.sql',
            fixture='tests/integration/fixtures/questions-1spe-demonstrations-etapes-contenu.json',
            prefixe='qdeme', entete=ENTETE)
