"""Génère la migration de CONTENU du chantier « questions-3 », lot 0 (corrections) : 1 modèle
réécrit, sans modèle neuf ni changement de niveau. Les 19 autres modèles du lot (niveaux, tags,
nœuds, sans contenu) sont dans la migration suivante, `20261028200100_questions_3_rangement_tags.sql`.

Phase 0 validée par David (2026-10-28, § 6.2 C du journal `docs/wip/questions-3-progress.md`) :

- `290dcf6f` (Augmentation, 3-068) : la variation à 200 % est retirée (3-068 : « cas simples »,
  120 € + 20 %) ; restent 10, 20, 50 et 100 %. Tag 3-068 gardé, nœud et niveau (3e) inchangés.

Contenu relevé en prod le 2026-10-28 (lecture seule, `releve-prod-3.ts`) : empreintes md5 des 20
modèles du lot vérifiées contre le MCP ; 1 tag (290dcf6f → 3-068) ; 0 donnée d'élève (srs_cards,
skill_attempts, evaluation_attempt_questions, test_answers, journal_entry_activities,
chapter_exercises, chapter_series, chapter_worksheets, user_favorite_templates).

    python3 docs/wip/questions/lot-corrections-3.py [dossier où écrire les modèles]
"""

import json
import sys

sys.path.insert(0, 'docs/archive/wip/arbre-notions/analyse')
sys.path.insert(0, 'docs/archive/wip/passe-lycee/analyse')
import scissions_outils  # noqa: E402
from lot_2bis_outils import garder_variations, spec  # noqa: E402
from scissions_outils import generer  # noqa: E402

# Le générateur du lycée ne connaît que les programmes du lycée.
scissions_outils.GRADES.update({'3': '3'})

ETAT = 'docs/wip/questions/etat-prod-2026-10-28-3e/'


# ============================================================================
# RETOUCHES
# ============================================================================

def augmentation_sans_200(t: dict) -> None:
    """Retire la variation à 200 % (la 5e) ; sa spec « augmentation seule » passe sur 50 %."""
    assert [v['variables'][2] for v in t['variations']] == [
        {'name': 'b', 'expression': b} for b in ('10', '20', '50', '100', '200')]
    garder_variations(t, [0, 1, 2, 3])
    t['test_specs'].append(
        spec('100', 'incorrect', {'a': '200', 'b': '50', 'a1': '20'}, 'augmentation seule', 2))


# ============================================================================
# LE LOT
# ============================================================================

RELEVE = {t['id'][:8]: t for t in json.load(open(ETAT + 'templates.json'))}
CONTENU = ('290dcf6f',)


def part(court: str, codes: list[str], retouche) -> list[tuple]:
    t = RELEVE[court]
    return [(list(range(len(t['variations']))), codes, t['title'], t['description'], retouche)]


LOT = {
    '290dcf6f': part('290dcf6f', ['3-068'], augmentation_sans_200),
}

ENTETE = """-- ============================================================================
-- Chantier « questions-3 », lot 0 (corrections) : 1 modèle corrigé
-- ============================================================================
--   - 290dcf6f (Augmentation, 3-068) : la variation à 200 % est retirée (« cas simples » du point) ;
--     restent 10, 20, 50 et 100 %. Tag 3-068 gardé ; nœud et niveau (3e) inchangés.
-- Les 19 autres modèles du lot (niveaux, tags, nœuds) sont dans la migration suivante
-- (20261028200100_questions_3_rangement_tags).
-- ============================================================================
-- Phase 0 validée par David le 2026-10-28 (journal docs/wip/questions-3-progress.md § 6.2).
-- Fichier GÉNÉRÉ par docs/wip/questions/lot-corrections-3.py — ne pas éditer à la main.
--
-- Le modèle n'existe qu'en production : en base locale (vide), la migration ne touche aucun
-- modèle et ses vérifications le tolèrent ; elle exige TOUT ou RIEN ({n} modèle). Elle est prouvée
-- par tests/integration/questions-3-contenu.test.ts, qui fabrique une copie de l'identifiant de la
-- prod (contenu, nœud, niveaux et tag) puis rejoue CE fichier.
--
-- Garde : le modèle doit avoir EXACTEMENT le contenu relevé en prod le 2026-10-28, être au nœud,
-- aux niveaux et au statut relevés, et porter exactement le tag relevé (3-068).
--
-- Données d'élèves : aucune (relevé du 2026-10-28 : 0 carte SRS, 0 tentative de compétence ou
-- d'évaluation, 0 réponse de test, 0 activité de journal, 0 exercice, série ou fiche de chapitre,
-- 0 favori).
--
-- Accès : personne ne gagne d'accès (question tranchée par David le 2026-10-28). Aucune règle ne
-- change ; effet visible : les élèves de 3e ne tirent plus d'augmentation de 200 %.
--"""


if __name__ == '__main__':
    releve = [RELEVE[c] for c in CONTENU]
    generer(LOT, releve=releve, etat=ETAT, niveaux_pris={},
            migration='supabase/migrations/20261028200000_questions_3_contenu.sql',
            fixture='tests/integration/fixtures/questions-3-contenu.json', prefixe='q3c', entete=ENTETE)
