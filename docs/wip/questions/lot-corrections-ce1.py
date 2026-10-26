"""Génère la migration de CONTENU du chantier « questions-ce1 », lot 0 (corrections) : 3 modèles
réécrits, sans modèle neuf ; ni tag, ni nœud, ni niveau, ni statut ne changent ici (c'est la migration
suivante, `20261027000100_questions_ce1_rangement_tags.sql`, écrite à la main).

Phase 0 validée par David (2026-10-26, § 5 du journal `docs/wip/questions-ce1-progress.md`) :

- `c96ecf4d` (Trouver la moitié, CE1-034) : moitié par décomposition, trois variations (2 chiffres à
  dizaines paires ; 2 chiffres à dizaines impaires ; 3 chiffres, centaines 2 à 6) ;
- `9d709f5b` (Utiliser la distributivité, CE1-035) : premier facteur 11 à 19 au lieu de 12 ;
- `c73734a8` (Parité, CE1-025) : nombres 0 à 999 au lieu de 0 à 99.

Contenu relevé en prod le 2026-10-26 (lecture seule) : empreintes md5 des 12 modèles du lot vérifiées
contre le MCP ; 0 donnée d'élève (srs_cards, skill_attempts, evaluation_attempt_questions,
test_answers, journal_entry_activities, chapter_exercises, user_favorite_templates).

    python3 docs/wip/questions/lot-corrections-ce1.py [dossier où écrire les modèles]
"""

import json
import sys

sys.path.insert(0, 'docs/archive/wip/arbre-notions/analyse')
sys.path.insert(0, 'docs/archive/wip/passe-lycee/analyse')
import scissions_outils  # noqa: E402
from scissions_outils import generer  # noqa: E402

# Le générateur du lycée ne connaît que les programmes du lycée.
scissions_outils.GRADES.update({'CE1': 'CE1'})

ETAT = 'docs/wip/questions/etat-prod-2026-10-26/'


# ============================================================================
# OUTILS
# ============================================================================

def spec(reponse: str, statut: str, variables: dict, description: str, variation: int) -> dict:
    return {'answers': [reponse], 'expected': {'status': statut},
            'variables': {k: str(v) for k, v in variables.items()},
            'description': description, 'variationIndex': variation}


def choix(indice: int, statut: str, a: int, description: str, variation: int) -> dict:
    return {'expected': {'status': statut}, 'variables': {'a': str(a)}, 'description': description,
            'variationIndex': variation, 'selectedChoices': [indice]}


# ============================================================================
# RETOUCHES
# ============================================================================

def moitie_par_decomposition(t: dict) -> None:
    assert len(t['variations']) == 1
    t['description'] = "Nombres pairs jusqu'à $700$, par décomposition"
    enonce = 'Quelle est la moitié de ${{n}}$ ?\n\nLa moitié de ${{n}}$ est $?$.'
    reponse = [{'expectedAnswer': '{{eval:n/2}}'}]
    # Le nombre est coupé en deux parts paires : la moitié de chacune, puis leur somme.
    corrige = [
        '${{n}} = {{g}} + {{p}}$',
        'La moitié de ${{g}}$ est ${{eval:g/2}}$ ; la moitié de ${{p}}$ est ${{eval:p/2}}$.',
        '${{eval:g/2}} + {{eval:p/2}} = {{eval:n/2}}$, donc la moitié de ${{n}}$ est {{solution:html}}.',
    ]

    def variation(variables: list[dict]) -> dict:
        return {'blanks': reponse, 'statement': enonce, 'variables': variables,
                'correction': {'steps': corrige}}

    t['variations'] = [
        # 2 chiffres, dizaines paires, unités paires non nulles : 22 à 88 (46 = 40 + 6).
        variation([
            {'name': 'k', 'expression': '1..4'},
            {'name': 'j', 'expression': '1..4'},
            {'name': 'g', 'expression': 'eval:20*k'},
            {'name': 'p', 'expression': 'eval:2*j'},
            {'name': 'n', 'expression': 'eval:g+p'},
        ]),
        # 2 chiffres, dizaines impaires, unités paires non nulles : 12 à 98 (74 = 70 + 4).
        variation([
            {'name': 'k', 'expression': '0..4'},
            {'name': 'j', 'expression': '1..4'},
            {'name': 'g', 'expression': 'eval:20*k+10'},
            {'name': 'p', 'expression': 'eval:2*j'},
            {'name': 'n', 'expression': 'eval:g+p'},
        ]),
        # 3 chiffres, centaines 2 à 6, dizaines non nulles, unités paires (648 = 600 + 48).
        variation([
            {'name': 'c', 'expression': '2..6'},
            {'name': 'd', 'expression': '1..9'},
            {'name': 'j', 'expression': '0..4'},
            {'name': 'g', 'expression': 'eval:100*c'},
            {'name': 'p', 'expression': 'eval:10*d+2*j'},
            {'name': 'n', 'expression': 'eval:g+p'},
        ]),
    ]
    t['test_specs'] = [
        spec('23', 'correct', {'k': 2, 'j': 3, 'g': 40, 'p': 6, 'n': 46}, 'moitié de 46 → 23', 0),
        spec('11', 'correct', {'k': 1, 'j': 1, 'g': 20, 'p': 2, 'n': 22}, 'borne : moitié de 22 → 11', 0),
        spec('44', 'correct', {'k': 4, 'j': 4, 'g': 80, 'p': 8, 'n': 88}, 'borne : moitié de 88 → 44', 0),
        spec('92', 'incorrect', {'k': 2, 'j': 3, 'g': 40, 'p': 6, 'n': 46}, 'Erreur : le double au lieu de la moitié', 0),
        spec('37', 'correct', {'k': 3, 'j': 2, 'g': 70, 'p': 4, 'n': 74}, 'moitié de 74 → 37', 1),
        spec('26', 'correct', {'k': 2, 'j': 1, 'g': 50, 'p': 2, 'n': 52}, 'moitié de 52 → 26', 1),
        spec('6', 'correct', {'k': 0, 'j': 1, 'g': 10, 'p': 2, 'n': 12}, 'borne : moitié de 12 → 6', 1),
        spec('49', 'correct', {'k': 4, 'j': 4, 'g': 90, 'p': 8, 'n': 98}, 'borne : moitié de 98 → 49', 1),
        spec('32', 'incorrect', {'k': 3, 'j': 2, 'g': 70, 'p': 4, 'n': 74}, 'Erreur : moitié chiffre par chiffre (74 → 32)', 1),
        spec('148', 'incorrect', {'k': 3, 'j': 2, 'g': 70, 'p': 4, 'n': 74}, 'Erreur : le double au lieu de la moitié', 1),
        spec('235', 'correct', {'c': 4, 'd': 7, 'j': 0, 'g': 400, 'p': 70, 'n': 470}, 'moitié de 470 → 235', 2),
        spec('324', 'correct', {'c': 6, 'd': 4, 'j': 4, 'g': 600, 'p': 48, 'n': 648}, 'moitié de 648 → 324', 2),
        spec('105', 'correct', {'c': 2, 'd': 1, 'j': 0, 'g': 200, 'p': 10, 'n': 210}, 'borne : moitié de 210 → 105', 2),
        spec('349', 'correct', {'c': 6, 'd': 9, 'j': 4, 'g': 600, 'p': 98, 'n': 698}, 'borne : moitié de 698 → 349', 2),
        spec('230', 'incorrect', {'c': 4, 'd': 7, 'j': 0, 'g': 400, 'p': 70, 'n': 470}, 'Erreur : moitié chiffre par chiffre (470 → 230)', 2),
    ]


def distributivite_11_a_19(t: dict) -> None:
    v = t['variations'][0]
    assert v['variables'] == [{'name': 'a', 'expression': '2..9'}, {'name': 'expression1', 'expression': '12*a'}]
    t['description'] = "Multiplication d'un nombre de $11$ à $19$ par un nombre à $1$ chiffre"
    v['variables'] = [
        {'name': 'u', 'expression': '1..9'},
        {'name': 'n', 'expression': 'eval:10+u'},
        {'name': 'a', 'expression': '2..9'},
        {'name': 'expression1', 'expression': 'n*a'},
    ]
    a = '\\bold{\\textcolor{{{color:primary.0}}}{{{a}}}}'
    v['correction']['steps'] = [
        f'$$\\begin{{align}} {{{{n}}}} \\times {a} &= 10 \\times {a} + {{{{u}}}} \\times {a} \\\\'
        ' &= {{eval:10*a}} + {{eval:u*a}} \\\\ &= {{solution}} \\end{align}$$'
    ]
    t['test_specs'] = [
        spec('91', 'correct', {'u': 3, 'n': 13, 'a': 7}, '13 × 7 = 91', 0),
        spec('84', 'correct', {'u': 2, 'n': 12, 'a': 7}, '12 × 7 = 84', 0),
        spec('22', 'correct', {'u': 1, 'n': 11, 'a': 2}, 'borne : 11 × 2 = 22', 0),
        spec('171', 'correct', {'u': 9, 'n': 19, 'a': 9}, 'borne : 19 × 9 = 171', 0),
        spec('73', 'incorrect', {'u': 3, 'n': 13, 'a': 7}, 'Erreur : unités non multipliées (70 + 3)', 0),
    ]


def parite_jusqu_a_999(t: dict) -> None:
    assert t['shared']['variables'] == [{'name': 'a', 'expression': '0..49'}]
    t['shared']['variables'][0]['expression'] = '0..499'
    t['test_specs'] = [
        choix(0, 'correct', 23, '46 est pair', 0),
        choix(1, 'incorrect', 23, '46 déclaré impair', 0),
        choix(0, 'correct', 0, '0 est pair (borne)', 0),
        choix(0, 'correct', 179, '358 est pair', 0),
        choix(0, 'correct', 499, '998 est pair (borne haute)', 0),
        choix(1, 'correct', 23, '47 est impair', 1),
        choix(0, 'incorrect', 23, '47 déclaré pair', 1),
        choix(1, 'correct', 360, '721 est impair', 1),
        choix(0, 'incorrect', 360, '721 déclaré pair', 1),
        choix(1, 'correct', 499, '999 est impair (borne haute)', 1),
    ]


# ============================================================================
# LE LOT
# ============================================================================

# Une seule part par modèle : toutes les variations, les tags relevés exigés à l'identique, titre
# relu dans le relevé ; le sous-titre change dans la retouche.
RELEVE = {t['id'][:8]: t for t in json.load(open(ETAT + 'templates.json'))}
CONTENU = ('9d709f5b', 'c73734a8', 'c96ecf4d')


def part(court: str, codes: list[str], retouche) -> list[tuple]:
    t = RELEVE[court]
    return [(list(range(len(t['variations']))), codes, t['title'], t['description'], retouche)]


LOT = {
    '9d709f5b': part('9d709f5b', ['CE1-035'], distributivite_11_a_19),
    'c73734a8': part('c73734a8', ['CE1-025'], parite_jusqu_a_999),
    'c96ecf4d': part('c96ecf4d', ['CE1-034'], moitie_par_decomposition),
}

ENTETE = """-- ============================================================================
-- Chantier « questions-ce1 », lot 0 (corrections) : 3 modèles corrigés, aucun modèle neuf ni tag posé
-- ============================================================================
--   - c96ecf4d (Trouver la moitié, CE1-034) : moitié par décomposition, jusqu'à 698 (trois
--     variations : dizaines paires, dizaines impaires, trois chiffres) ;
--   - 9d709f5b (Utiliser la distributivité, CE1-035) : premier facteur de 11 à 19 (au lieu de 12) ;
--   - c73734a8 (Parité, CE1-025) : nombres de 0 à 999 (au lieu de 0 à 99).
-- Ni tag, ni nœud, ni niveau, ni statut ne changent ici : rangement, tags, niveaux et statut dans
-- la migration suivante (20261027000100_questions_ce1_rangement_tags).
-- ============================================================================
-- Phase 0 validée par David le 2026-10-26 (journal docs/wip/questions-ce1-progress.md § 5).
-- Fichier GÉNÉRÉ par docs/wip/questions/lot-corrections-ce1.py — ne pas éditer à la main.
--
-- Les modèles n'existent qu'en production : en base locale (vide), la migration ne touche aucun
-- modèle et ses vérifications le tolèrent ; elle exige TOUT ou RIEN ({n} modèles). Elle est prouvée
-- par tests/integration/questions-ce1-contenu.test.ts, qui fabrique des copies des identifiants de
-- la prod (contenu, nœud, niveaux et tags) puis rejoue CE fichier.
--
-- Garde : chaque modèle doit avoir EXACTEMENT le contenu relevé en prod le 2026-10-26, être au nœud,
-- aux niveaux et au statut relevés, et porter exactement son tag relevé.
--
-- Données d'élèves : aucune (relevé du 2026-10-26 : 0 carte SRS, 0 tentative de compétence ou
-- d'évaluation, 0 réponse de test, 0 activité de journal, 0 exercice de chapitre, 0 favori).
--
-- Accès : personne ne gagne d'accès (question tranchée par David le 2026-10-26). Aucune règle ne
-- change ; effet visible : les 3 modèles sont publiés, leurs élèves tirent les nouvelles variations
-- et lisent le nouveau corrigé.
--"""


if __name__ == '__main__':
    releve = [RELEVE[c] for c in CONTENU]
    generer(LOT, releve=releve, etat=ETAT, niveaux_pris={},
            migration='supabase/migrations/20261027000000_questions_ce1_contenu.sql',
            fixture='tests/integration/fixtures/questions-ce1-contenu.json', prefixe='qce1', entete=ENTETE)
