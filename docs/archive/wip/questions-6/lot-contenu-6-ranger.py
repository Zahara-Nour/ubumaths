"""Génère la migration de CONTENU de la reprise de 06 et 07 du lot 4 (chantier « questions-6 », § 15 et
§ 17 du journal) : les deux modèles publiés « Ranger des fractions » et « Ranger des nombres mixtes »
passent de trois cases à ```ranger (étiquettes à glisser), variations inchangées sur le fond.

- 83c835bb (06, Ranger des fractions, 6-134) : énoncé en ```ranger, variable de mélange `p` et cases
  retirées ; specs : réponses en positions (`2 0 1`).
- c360d588 (07, Ranger des nombres mixtes, 6-204) : idem.

`create-questions --mettre-a-jour` ne touche pas un modèle publié : d'où cette migration (patron § 12.5).
Le résultat doit être EXACTEMENT la source `scripts/questions/6-fractions/0{6,7}-*.json` (variations,
specs ; titre et description inchangés, vérifiés). Avant : le contenu relevé en prod doit être EXACTEMENT
l'ancienne source (git `origin/main`). Ni tag, ni nœud, ni niveau, ni statut ne changent. Contenu relevé
en prod le 2026-11-01 (lecture seule, `releve-prod.ts`, empreinte vérifiée au MCP) ; tags relevés, exigés
à l'identique.

    python3 docs/wip/questions-6/lot-contenu-6-ranger.py
"""

import json
import subprocess
import sys

sys.path.insert(0, 'docs/archive/wip/arbre-notions/analyse')
sys.path.insert(0, 'docs/archive/wip/passe-lycee/analyse')
import scissions_outils  # noqa: E402
from scissions_outils import generer  # noqa: E402

# Le générateur du lycée ne connaît que les programmes du lycée.
scissions_outils.GRADES.update({'6': '6'})

ETAT = 'docs/wip/questions-6/etat-prod-2026-11-01-ranger/'
SOURCES = {
    '83c835bb': 'scripts/questions/6-fractions/06-ranger-des-fractions.json',
    'c360d588': 'scripts/questions/6-fractions/07-ranger-des-nombres-mixtes.json',
}
CODES = {'83c835bb': '6-134', 'c360d588': '6-204'}


# ============================================================================
# RETOUCHE
# ============================================================================

def source(court: str) -> dict:
    return json.load(open(SOURCES[court]))


def ancienne_source(court: str) -> dict:
    texte = subprocess.run(['git', 'show', f'origin/main:{SOURCES[court]}'], check=True,
                           capture_output=True, text=True).stdout
    return json.loads(texte)


def en_ranger(court: str):
    """Variations et specs remplacées par la source ; la prod doit être l'ancienne source."""
    def retouche(t: dict) -> None:
        a = ancienne_source(court)
        assert t['variations'] == a['variations'], f'{court} : prod ≠ ancienne source (variations)'
        assert t['test_specs'] == a['testSpecs'], f'{court} : prod ≠ ancienne source (specs)'
        s = source(court)
        assert (t['title'], t['description']) == (s['title'], s['description']), f'{court} : titre'
        assert len(s['variations']) == len(t['variations']), f'{court} : nombre de variations'
        t['variations'] = s['variations']
        t['test_specs'] = s['testSpecs']
    return retouche


# ============================================================================
# LE LOT
# ============================================================================

RELEVE = {t['id'][:8]: t for t in json.load(open(ETAT + 'templates.json'))}
CONTENU = tuple(SOURCES)


def part(court: str) -> tuple:
    t = RELEVE[court]
    return (list(range(len(t['variations']))), [CODES[court]], t['title'], t['description'], en_ranger(court))


LOT = {c: [part(c)] for c in CONTENU}

ENTETE = """-- ============================================================================
-- Chantier « questions-6 » : 06 et 07 du lot 4 passent en ```ranger, aucun neuf ni tag posé
-- ============================================================================
--   - 83c835bb (Ranger des fractions) : trois cases → étiquettes à ranger (```ranger) ; la
--     variable de mélange `p` disparaît (le bloc mélange lui-même) ; specs en positions.
--   - c360d588 (Ranger des nombres mixtes) : idem.
-- Ni tag, ni nœud, ni niveau, ni statut, ni titre ne changent ici.
-- ============================================================================
-- Décision de David le 2026-10-31 (journal docs/wip/questions-6-progress.md § 15, point 5). Fichier
-- GÉNÉRÉ par docs/wip/questions-6/lot-contenu-6-ranger.py — ne pas éditer à la main.
--
-- Les modèles n'existent qu'en production : en base locale (vide), la migration ne touche aucun
-- modèle et ses vérifications le tolèrent ; elle exige TOUT ou RIEN ({n} modèles). Elle est prouvée
-- par tests/integration/questions-6-ranger-contenu.test.ts, qui fabrique des copies des
-- identifiants de la prod (contenu, nœud, niveaux et tags) puis rejoue CE fichier.
--
-- Garde : chaque modèle doit avoir EXACTEMENT le contenu relevé en prod le 2026-11-01, être au
-- nœud, aux niveaux et au statut relevés, et porter exactement son tag relevé (6-134, 6-204).
--
-- Données d'élèves : non touchées (seuls l'énoncé, la forme de la réponse et les specs changent).
--
-- Accès : personne ne gagne d'accès (aucune règle ne change). Effet visible : les élèves de 6e
-- rangent des étiquettes au lieu de recopier trois fractions dans trois cases.
--"""


if __name__ == '__main__':
    releve = [RELEVE[c] for c in CONTENU]
    generer(LOT, releve=releve, etat=ETAT, niveaux_pris={},
            migration='supabase/migrations/20261101121300_questions_6_ranger_contenu.sql',
            fixture='tests/integration/fixtures/questions-6-ranger-contenu.json', prefixe='q6rg',
            entete=ENTETE)
