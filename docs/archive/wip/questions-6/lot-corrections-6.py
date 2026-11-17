"""Génère la migration de CONTENU du chantier « questions-6 », lot « corrections » (PR 1) :
6 modèles réécrits, sans modèle neuf ; ni tag, ni nœud, ni niveau ne changent ici (c'est la migration
suivante, `20261027100100_questions_6_rangement_tags.sql`, écrite à la main, qui archive aussi 3a7a5711).

Décisions de David (2026-10-26, § 6 du journal `docs/wip/questions-6-progress.md`) :

- `819df2a9` (Calculer un produit × 10/100/1 000) et `f3bf4c64` (multiplication à trou) : au plus
  3 décimales (q = 1..3 au lieu de 1..4), borne de CM2-042 ;
- `b79d4cb7` (volumes) : garder m³, dm³, cm³ seuls (5-051) — variations 2, 3, 6, 7, 10 ; la 11
  (dm³ → m³) est le doublon de la 2 ;
- `24f7a007` (Diminution) : la variation − 100 % (prix toujours 0) est retirée ;
- `82748db8` (aires) : la variation 4, doublon de la 0 (dm² → m²), est retirée ;
- `ae7a332e` (coefficient, valeur fractionnaire) : coquille « $?.$ » → « $?$. ».

Contenu relevé en prod le 2026-10-26 (`releve-prod.ts`, lecture seule) : empreintes md5 des 8 modèles
vérifiées contre le MCP (`etat-prod-2026-10-26/md5.json`) ; 0 donnée d'élève (srs_cards,
skill_attempts, evaluation_attempt_questions, journal_entry_activities, chapter_exercises,
user_favorite_templates).

    python3 docs/wip/questions-6/lot-corrections-6.py [dossier où écrire les modèles]
"""

import json
import sys

sys.path.insert(0, 'docs/archive/wip/arbre-notions/analyse')
sys.path.insert(0, 'docs/archive/wip/passe-lycee/analyse')
import scissions_outils  # noqa: E402
from lot_2bis_outils import garder_variations  # noqa: E402
from scissions_outils import generer  # noqa: E402

# Le générateur du lycée ne connaît que les programmes du lycée.
scissions_outils.GRADES.update({'6': '6'})

ETAT = 'docs/wip/questions-6/etat-prod-2026-10-26/'


# ============================================================================
# OUTILS
# ============================================================================

def sans_spec(t: dict, description: str, index: int) -> None:
    avant = len(t['test_specs'])
    t['test_specs'] = [s for s in t['test_specs']
                       if not (s['description'] == description and s['variationIndex'] == index)]
    assert len(t['test_specs']) == avant - 1, description


def spec(t: dict, description: str, index: int) -> dict:
    r = [s for s in t['test_specs'] if s['description'] == description and s['variationIndex'] == index]
    assert len(r) == 1, description
    return r[0]


def ne_garder(garder: list[int], retouche=None):
    """Retouche qui ne garde que les variations `garder` (specs réindexées), puis applique `retouche`."""
    def r(t: dict) -> None:
        garder_variations(t, garder)
        if retouche:
            retouche(t)
    return r


def trois_decimales(t: dict) -> None:
    q = [v for v in t['shared']['variables'] if v['name'] == 'q']
    assert q == [{'name': 'q', 'expression': '1..4'}], q
    q[0]['expression'] = '1..3'


# ============================================================================
# RETOUCHES
# ============================================================================

def produit_trois_decimales(t: dict) -> None:
    trois_decimales(t)
    s = spec(t, '1000 × 4,6803', 0)
    s.update(description='1000 × 4,683', answers=['4\\,683'],
             variables={'a': '3', 'b': '4.683', 'p': '1', 'q': '3'})
    s = spec(t, 'v1 449,6803 × 10', 1)
    s.update(description='v1 449,683 × 10', answers=['4\\,496{,}83'],
             variables={'a': '1', 'b': '449.683', 'p': '3', 'q': '3'})
    s = spec(t, 'sans espace', 0)
    s.update(answers=['4683'], variables={'a': '3', 'b': '4.683', 'p': '1', 'q': '3'})


def trou_trois_decimales(t: dict) -> None:
    trois_decimales(t)
    s = spec(t, '449,680 3 × 10', 0)
    s.update(description='449,683 × 10', answers=['449{,}683'],
             variables={'a': '1', 'b': '449.683', 'm': '3', 'q': '3'})
    # Au plus 3 chiffres de part et d'autre de la virgule : plus de réponse à espacer.
    sans_spec(t, '449,6803 sans espace : perfectible', 0)
    t['test_specs'].insert(1, {'answers': ['4\\,496{,}83'], 'expected': {'status': 'incorrect'},
                               'variables': {'a': '1', 'b': '449.683', 'm': '3', 'q': '3'},
                               'description': 'produit recopié au lieu du facteur', 'variationIndex': 0})


def diminution_sans_cent(t: dict) -> None:
    # Appelée après le retrait : la variation − 100 % et ses specs sont déjà parties ; l'erreur
    # « prix de départ » (spec de la − 100 %) revient sur la variation − 50 %.
    assert [v['variables'][2]['expression'] for v in t['variations']] == ['10', '20', '30', '50']
    t['test_specs'].append({'answers': ['200'], 'expected': {'status': 'incorrect'},
                            'variables': {'a': '200', 'b': '50', 'a1': '20'},
                            'description': 'prix de départ', 'variationIndex': 3})


def coquille_point(t: dict) -> None:
    v = t['variations'][0]
    assert v['statement'].endswith('est $?.$')
    v['statement'] = v['statement'][:-len('$?.$')] + '$?$.'


# ============================================================================
# LE LOT
# ============================================================================

# Une seule part par modèle (aucun neuf) : variations gardées, tags relevés exigés à l'identique,
# titre et sous-titre relus dans le relevé.
RELEVE = {t['id'][:8]: t for t in json.load(open(ETAT + 'templates.json'))}
CONTENU = ('24f7a007', '819df2a9', '82748db8', 'ae7a332e', 'b79d4cb7', 'f3bf4c64')


def part(court: str, codes: list[str], retouche) -> list[tuple]:
    t = RELEVE[court]
    return [(list(range(len(t['variations']))), codes, t['title'], t['description'], retouche)]


LOT = {
    '24f7a007': part('24f7a007', [], ne_garder([0, 1, 2, 3], diminution_sans_cent)),
    '819df2a9': part('819df2a9', [], produit_trois_decimales),
    '82748db8': part('82748db8', ['6-150'], ne_garder([0, 1, 2, 3])),
    'ae7a332e': part('ae7a332e', [], coquille_point),
    'b79d4cb7': part('b79d4cb7', [], ne_garder([2, 3, 6, 7, 10])),
    'f3bf4c64': part('f3bf4c64', [], trou_trois_decimales),
}

ENTETE = """-- ============================================================================
-- Chantier « questions-6 », lot « corrections » : 6 modèles corrigés, aucun modèle neuf ni tag posé
-- ============================================================================
--   - 819df2a9 (Calculer un produit), f3bf4c64 (multiplication à trou) : × 10 / 100 / 1 000 d'un
--     décimal à 3 décimales au plus (borne de CM2-042) ;
--   - b79d4cb7 (volumes) : m³, dm³, cm³ seuls (5-051), 5 variations sur 15 ;
--   - 24f7a007 (Diminution) : la variation − 100 % (prix toujours 0) retirée ;
--   - 82748db8 (aires) : la variation en double (dm² → m²) retirée ;
--   - ae7a332e (coefficient) : coquille « $?.$ » corrigée.
-- Ni tag, ni nœud, ni niveau, ni statut ne changent ici : rangement, niveaux, tags et archivage du
-- doublon 3a7a5711 dans la migration suivante (20261027100100_questions_6_rangement_tags).
-- ============================================================================
-- Décision de David le 2026-10-26 (journal docs/wip/questions-6-progress.md § 6). Fichier GÉNÉRÉ
-- par docs/wip/questions-6/lot-corrections-6.py — ne pas éditer à la main.
--
-- Les modèles n'existent qu'en production : en base locale (vide), la migration ne touche aucun
-- modèle et ses vérifications le tolèrent ; elle exige TOUT ou RIEN ({n} modèles). Elle est prouvée
-- par tests/integration/questions-6-contenu.test.ts, qui fabrique des copies des identifiants de
-- la prod (contenu, nœud, niveaux et tags) puis rejoue CE fichier.
--
-- Garde : chaque modèle doit avoir EXACTEMENT le contenu relevé en prod le 2026-10-26, être au nœud,
-- aux niveaux et au statut relevés, et porter exactement son tag relevé.
--
-- Données d'élèves : aucune (relevé du 2026-10-26 : 0 carte SRS, 0 tentative de compétence ou
-- d'évaluation, 0 activité de journal, 0 exercice de chapitre, 0 favori).
--
-- Accès : personne ne gagne d'accès (question tranchée par David le 2026-10-26). Aucune règle ne
-- change ; effet visible : les 6 modèles restent publiés, leurs élèves tirent les variations gardées.
--"""


if __name__ == '__main__':
    releve = [RELEVE[c] for c in CONTENU]
    generer(LOT, releve=releve, etat=ETAT, niveaux_pris={},
            migration='supabase/migrations/20261027100000_questions_6_contenu.sql',
            fixture='tests/integration/fixtures/questions-6-contenu.json', prefixe='q6c', entete=ENTETE)
