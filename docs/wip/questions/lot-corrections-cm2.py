"""Génère la migration de CONTENU du chantier « questions-cm2 », lot 0 (changements de niveau) : un
modèle réécrit, passé du CM1 au CM2 et tagué ; les 22 autres modèles du lot (niveaux scolaires, tags,
nœuds, statut, sans contenu changé) sont dans la migration suivante,
`20261028100100_questions_cm2_rangement_tags.sql`, écrite à la main.

Phase 0 validée par David (2026-10-28, § 5 du journal `docs/wip/questions-cm2-progress.md`) :

- `edc5d7d4` (Trouver la moitié) : impairs de 1 à 15 au lieu de 1 à 29 (`a1` 0..7), CM1 → CM2,
  tag CM2-037 (sous-notion « division » des décimaux, où vit déjà le modèle).

Contenu relevé en prod le 2026-10-28 (lecture seule) : empreinte md5 vérifiée contre le MCP ; 0 donnée
d'élève (srs_cards, skill_attempts, evaluation_attempt_questions, test_answers,
journal_entry_activities, chapter_exercises, user_favorite_templates).

    python3 docs/wip/questions/lot-corrections-cm2.py [dossier où écrire les modèles]
"""

import json
import sys

sys.path.insert(0, 'docs/archive/wip/arbre-notions/analyse')
sys.path.insert(0, 'docs/archive/wip/passe-lycee/analyse')
import scissions_outils  # noqa: E402
from scissions_outils import generer  # noqa: E402

# Le générateur du lycée ne connaît que les programmes du lycée.
scissions_outils.GRADES.update({'CM2': 'CM2'})

ETAT = 'docs/wip/questions/etat-prod-2026-10-28/'


# ============================================================================
# OUTILS
# ============================================================================

def spec(reponse: str, statut: str, a1: int, description: str, **attendu) -> dict:
    return {'answers': [reponse], 'expected': {'status': statut, **attendu},
            'variables': {'a1': str(a1)}, 'description': description, 'variationIndex': 0}


# ============================================================================
# RETOUCHE
# ============================================================================

def moitie_impairs_jusqu_a_15(t: dict) -> None:
    v = t['variations'][0]
    assert v['variables'][0] == {'name': 'a1', 'expression': '0..14'}
    v['variables'][0]['expression'] = '0..7'
    t['description'] = 'Nombres impairs de $1$ à $15$'
    t['test_specs'] = [
        spec('4{,}5', 'correct', 4, 'moitié de 9 = 4,5'),
        spec('4.5', 'correct', 4, '4.5 au point'),
        spec('\\frac{9}{2}', 'bad_form', 4, '9/2 en fraction', constraintViolations=['form']),
        spec('4', 'incorrect', 4, 'Erreur : partie entière seule'),
        spec('18', 'incorrect', 4, 'Erreur : le double au lieu de la moitié'),
        spec('0{,}5', 'correct', 0, 'borne : moitié de 1 = 0,5'),
        spec('7{,}5', 'correct', 7, 'borne : moitié de 15 = 7,5'),
    ]


# ============================================================================
# LE LOT
# ============================================================================

RELEVE = {t['id'][:8]: t for t in json.load(open(ETAT + 'templates.json'))}


def part(court: str, codes: list[str], retouche) -> list[tuple]:
    t = RELEVE[court]
    return [(list(range(len(t['variations']))), codes, t['title'], t['description'], retouche)]


LOT = {
    'edc5d7d4': part('edc5d7d4', ['CM2-037'], moitie_impairs_jusqu_a_15),
}

ENTETE = """-- ============================================================================
-- Chantier « questions-cm2 », lot 0 (changements de niveau) : 1 modèle corrigé, passé au CM2, tagué
-- ============================================================================
--   - edc5d7d4 (Trouver la moitié) : impairs de 1 à 15 (au lieu de 1 à 29), niveaux [CM1] → [CM2],
--     tag CM2-037 ; nœud (Décimaux : calculs > division) et catégorie inchangés.
-- Les 22 autres modèles du lot : migration suivante (20261028100100_questions_cm2_rangement_tags).
-- ============================================================================
-- Phase 0 validée par David le 2026-10-28 (journal docs/wip/questions-cm2-progress.md § 5).
-- Fichier GÉNÉRÉ par docs/wip/questions/lot-corrections-cm2.py — ne pas éditer à la main.
--
-- Les modèles n'existent qu'en production : en base locale (vide), la migration ne touche aucun
-- modèle et ses vérifications le tolèrent ; elle exige TOUT ou RIEN ({n} modèle). Elle est prouvée
-- par tests/integration/questions-cm2-contenu.test.ts, qui fabrique des copies des identifiants de
-- la prod (contenu, nœud, niveaux et tags) puis rejoue CE fichier.
--
-- Garde : le modèle doit avoir EXACTEMENT le contenu relevé en prod le 2026-10-28, être au nœud,
-- aux niveaux et au statut relevés, et ne porter aucun tag.
--
-- Données d'élèves : aucune (relevé du 2026-10-28 : 0 carte SRS, 0 tentative de compétence ou
-- d'évaluation, 0 réponse de test, 0 activité de journal, 0 exercice de chapitre, 0 favori).
--
-- Accès (question tranchée par David le 2026-10-28) : les élèves et le prof du CM2 voient ce modèle
-- publié ; ceux du CM1 ne le voient plus. Aucune règle (policy) ne change.
--"""


if __name__ == '__main__':
    releve = [RELEVE[c] for c in LOT]
    generer(LOT, releve=releve, etat=ETAT, niveaux_pris={},
            migration='supabase/migrations/20261028100000_questions_cm2_contenu.sql',
            fixture='tests/integration/fixtures/questions-cm2-contenu.json', prefixe='qcm2',
            entete=ENTETE, grades_apres={'edc5d7d4': ['CM2']})
