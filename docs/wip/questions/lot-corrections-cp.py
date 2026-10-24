"""Génère la migration de CONTENU du chantier « questions », corrections CP (inventaire du 2026-10-24) :
4 modèles réécrits, sans modèle neuf ; ni tag, ni nœud, ni niveau ne changent ici (c'est la migration
suivante, `20261025000100_questions_cp_rangement_tags.sql`, écrite à la main).

Décisions de David (2026-10-24, § 4 bis du journal `docs/wip/questions-progress.md`) :

- `52c4d773` (Décomposition, 74 = 70 + 4) : le corrigé ne parle plus de × 10, de × 100 ni de centaines
  (le × est hors CP, borne CP-017 ; la centaine n'est pas un attendu du CP, remarque de CP-005) ;
- `0e5372a4` (Complément) : le complément à 10 est gardé, deux variations ajoutent la cible de CP-023,
  le complément à la dizaine supérieure (nombre de 11 à 99, unités ≠ 0 : 74 + ? = 80) ;
- `25285413` (Double/1) et `89bef942` (Moitié/3) : la valeur 0 est retirée (bornes CE1-028 « doubles :
  1 à 15 », CE1-101 « moitiés : nombres pairs de 2 à 30 »).

Contenu relevé en prod le 2026-10-24 (MCP, lecture seule) : empreintes md5 des 5 modèles du chantier
vérifiées contre `etat-prod-2026-10-24/templates.json` ; 0 donnée d'élève (srs_cards, skill_attempts,
evaluation_attempt_questions, test_answers, journal_entry_activities, chapter_exercises,
user_favorite_templates). L'instantané ne garde que les nœuds, points et tags de ces modèles.

    python3 docs/wip/questions/lot-corrections-cp.py [dossier où écrire les modèles]
"""

import json
import sys

sys.path.insert(0, 'docs/archive/wip/arbre-notions/analyse')
sys.path.insert(0, 'docs/archive/wip/passe-lycee/analyse')
import scissions_outils  # noqa: E402
from scissions_outils import generer  # noqa: E402

# Le générateur du lycée ne connaît que les programmes du lycée.
scissions_outils.GRADES.update({'CP': 'CP', 'CE1': 'CE1'})

ETAT = 'docs/wip/questions/etat-prod-2026-10-24/'


# ============================================================================
# OUTILS
# ============================================================================

def sans_spec(t: dict, description: str) -> None:
    avant = len(t['test_specs'])
    t['test_specs'] = [s for s in t['test_specs'] if s['description'] != description]
    assert len(t['test_specs']) == avant - 1, description


# ============================================================================
# RETOUCHES
# ============================================================================

def decomposition_sans_fois(t: dict) -> None:
    v = t['variations'][0]
    assert len(v['correction']['steps']) == 3
    v['correction']['steps'] = [
        "On range les chiffres de ${{expression}}$ dans le tableau de numération : le chiffre des dizaines,"
        " puis celui des unités. $$\\begin{array}{|c|c|} \\text{dizaines} & \\text{unités} \\\\"
        " \\textcolor{{{color:primary.0}}}{{{a}}} & \\textcolor{{{color:primary.0}}}{{{b}}} \\end{array}$$",
        "$\\textcolor{{{color:primary.0}}}{{{a}}}$ {{if:a==1|dizaine}}{{if:a!=1|dizaines}},"
        " c'est ${{eval:a*10}}$ ; $\\textcolor{{{color:primary.0}}}{{{b}}}$"
        " {{if:b==1|unité}}{{if:b!=1|unités}}, c'est ${{b}}$.",
        "$${{expression}} = {{solution}}$$",
    ]


def complement_dizaine(t: dict) -> None:
    assert len(t['variations']) == 2
    t['description'] = 'À 10 ou à la dizaine supérieure'
    variables = [
        {'name': 'd', 'expression': '1..9'},
        {'name': 'u', 'expression': '1..9'},
        {'name': 'n', 'expression': 'eval:d*10+u'},
        {'name': 'm', 'expression': 'eval:d*10+10'},
    ]
    t['variations'] += [
        {
            'blanks': [{'expectedAnswer': '{{eval:10-u}}'}],
            'statement': 'Complète.\n\n$${{expression3}}$$',
            'variables': variables + [{'name': 'expression3', 'expression': 'n+?=m'}],
        },
        {
            'blanks': [{'expectedAnswer': '{{eval:10-u}}'}],
            'statement': 'Complète.\n\n$${{expression4}}$$',
            'variables': variables + [{'name': 'expression4', 'expression': '?+n=m'}],
        },
    ]
    t['test_specs'] += [
        {'answers': ['6'], 'expected': {'status': 'correct'},
         'variables': {'a': '1', 'd': '7', 'u': '4', 'n': '74', 'm': '80'},
         'description': '74 + ? = 80 → 6', 'variationIndex': 2},
        {'answers': ['4'], 'expected': {'status': 'incorrect'},
         'variables': {'a': '1', 'd': '7', 'u': '4', 'n': '74', 'm': '80'},
         'description': 'Erreur : chiffre des unités recopié', 'variationIndex': 2},
        {'answers': ['1'], 'expected': {'status': 'correct'},
         'variables': {'a': '1', 'd': '9', 'u': '9', 'n': '99', 'm': '100'},
         'description': 'borne : 99 + ? = 100 → 1', 'variationIndex': 2},
        {'answers': ['2'], 'expected': {'status': 'correct'},
         'variables': {'a': '1', 'd': '3', 'u': '8', 'n': '38', 'm': '40'},
         'description': '? + 38 = 40 → 2', 'variationIndex': 3},
        {'answers': ['12'], 'expected': {'status': 'incorrect'},
         'variables': {'a': '1', 'd': '3', 'u': '8', 'n': '38', 'm': '40'},
         'description': 'Erreur : complément à 50', 'variationIndex': 3},
    ]


def double_sans_zero(t: dict) -> None:
    v = t['variations'][0]
    assert v['variables'] == [{'name': 'a', 'expression': '0..9'}]
    v['variables'][0]['expression'] = '1..9'
    sans_spec(t, 'double de 0 → 0')
    t['test_specs'].append({'answers': ['2'], 'expected': {'status': 'correct'}, 'variables': {'a': '1'},
                            'description': 'borne : double de 1 → 2', 'variationIndex': 0})


def moitie_sans_zero(t: dict) -> None:
    v = t['variations'][0]
    assert v['variables'] == [{'name': 'a', 'expression': '0..10'}]
    v['variables'][0]['expression'] = '1..10'
    sans_spec(t, 'moitié de 0 = 0')
    t['test_specs'].append({'answers': ['1'], 'expected': {'status': 'correct'}, 'variables': {'a': '1'},
                            'description': 'borne : moitié de 2 = 1', 'variationIndex': 0})


# ============================================================================
# LE LOT
# ============================================================================

# Une seule part par modèle : toutes les variations, les tags relevés exigés à l'identique, titre et
# sous-titre relus dans le relevé (le sous-titre du complément change dans sa retouche).
RELEVE = {t['id'][:8]: t for t in json.load(open(ETAT + 'templates.json'))}
CONTENU = ('0e5372a4', '25285413', '52c4d773', '89bef942')


def part(court: str, codes: list[str], retouche) -> list[tuple]:
    t = RELEVE[court]
    return [(list(range(len(t['variations']))), codes, t['title'], t['description'], retouche)]


LOT = {
    '0e5372a4': part('0e5372a4', ['CP-023'], complement_dizaine),
    '25285413': part('25285413', [], double_sans_zero),
    '52c4d773': part('52c4d773', ['CP-005'], decomposition_sans_fois),
    '89bef942': part('89bef942', [], moitie_sans_zero),
}

ENTETE = """-- ============================================================================
-- Chantier « questions », corrections CP : 4 modèles corrigés, aucun modèle neuf ni tag posé
-- ============================================================================
--   - 52c4d773 (Décomposition) : corrigé sans × 10, × 100 ni centaines (hors CP) ;
--   - 0e5372a4 (Complément) : deux variations « 74 + ? = 80 » (complément à la dizaine
--     supérieure, CP-023), le complément à 10 gardé ;
--   - 25285413 (Double/1), 89bef942 (Moitié/3) : la valeur 0 retirée (bornes CE1-028, CE1-101).
-- Ni tag, ni nœud, ni niveau, ni statut ne changent ici : rangement, niveaux et tags dans la
-- migration suivante (20261025000100_questions_cp_rangement_tags).
-- ============================================================================
-- Décision de David le 2026-10-24 (journal docs/wip/questions-progress.md § 4 bis). Fichier GÉNÉRÉ
-- par docs/wip/questions/lot-corrections-cp.py — ne pas éditer à la main.
--
-- Les modèles n'existent qu'en production : en base locale (vide), la migration ne touche aucun
-- modèle et ses vérifications le tolèrent ; elle exige TOUT ou RIEN ({n} modèles). Elle est prouvée
-- par tests/integration/questions-cp-contenu.test.ts, qui fabrique des copies des identifiants de
-- la prod (contenu, nœud, niveaux et tags) puis rejoue CE fichier.
--
-- Garde : chaque modèle doit avoir EXACTEMENT le contenu relevé en prod le 2026-10-24, être au nœud,
-- aux niveaux et au statut relevés, et porter exactement son tag relevé.
--
-- Données d'élèves : aucune (relevé du 2026-10-24 : 0 carte SRS, 0 tentative de compétence ou
-- d'évaluation, 0 réponse de test, 0 activité de journal, 0 exercice de chapitre, 0 favori).
--
-- Accès : personne ne gagne d'accès (question tranchée par David le 2026-10-24). Aucune règle ne
-- change ; effet visible : les 4 modèles sont publiés, leurs élèves tirent les nouvelles variations
-- et lisent le nouveau corrigé.
--"""


if __name__ == '__main__':
    releve = [RELEVE[c] for c in CONTENU]
    generer(LOT, releve=releve, etat=ETAT, niveaux_pris={},
            migration='supabase/migrations/20261025000000_questions_cp_contenu.sql',
            fixture='tests/integration/fixtures/questions-cp-contenu.json', prefixe='qcp', entete=ENTETE)
