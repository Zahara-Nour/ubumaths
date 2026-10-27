"""Génère la migration de CONTENU du chantier « questions-2de », lot « corrections » (PR 1) :
7 modèles réécrits, sans modèle neuf ; ni tag, ni nœud, ni niveau ne changent ici (c'est la migration
suivante, `20261027192100_questions_2de_rangement_tags.sql`, écrite à la main).

Décisions de David (2026-10-27, §§ 5-6 du journal `docs/wip/questions-2de-progress.md`) :

- `8b59ca4b` (évolution répétée, 2-378) : le corrigé ne cite plus « suite géométrique » (1re) ;
- `8c31675a` (intervalles, 2-244) : variation 1, intervalles accolés (t = 0) → réponse attendue
  `[a ; d]`, comme le corrigé (le juge acceptait déjà les deux écritures) ;
- `939153b6` (|x − a| = b, 2-420) : corrigé par la distance (le point), sous-titre propre ;
- marches « Développer » 85f6e96e (5), 1338da34 (6), 288c2bf0 (7), 6909bfde (8) : un sous-titre qui
  dit la marche (titres partagés entre niveaux = convention de la base) et la consigne
  « Développe et réduis : » des niveaux 1 et 2.

Contenu relevé en prod le 2026-10-27 (`releve-prod.ts`, lecture seule) : empreintes md5 des 22
modèles du lot vérifiées contre le MCP (`etat-prod-2026-10-27/md5.json`) ; 0 donnée d'élève
(srs_cards, skill_attempts, evaluation_attempt_questions, journal_entry_activities).

    python3 docs/wip/questions-2de/lot-corrections-2de.py [dossier où écrire les modèles]
"""

import json
import sys

sys.path.insert(0, 'docs/archive/wip/arbre-notions/analyse')
sys.path.insert(0, 'docs/archive/wip/passe-lycee/analyse')
from scissions_outils import generer  # noqa: E402

ETAT = 'docs/wip/questions-2de/etat-prod-2026-10-27/'


# ============================================================================
# RETOUCHES
# ============================================================================

def sans_suite_geometrique(t: dict) -> None:
    for v in t['variations']:
        etape = v['correction']['steps'][1]
        fin = v['correction']['steps'][1].index(' (c\'est le terme d\'une suite géométrique')
        assert etape.endswith('$).'), etape
        v['correction']['steps'][1] = etape[:fin] + '.'


def accoles(t: dict) -> None:
    v = t['variations'][1]
    case = v['blanks'][1]
    assert case == {'expectedAnswer': '[{{a}};{{b}}[\\cup[{{c}};{{d}}]'}, case
    case['expectedAnswer'] = '{{if:t==0|[{{a}};{{d}}]|[{{a}};{{b}}[\\cup[{{c}};{{d}}]}}'
    # La réunion écrite en deux morceaux : même ensemble, mais pas sous sa forme la plus simple.
    t['test_specs'].append({'answers': ['\\varnothing', '[-2;1[\\cup[1;4]'], 'expected': {'status': 'unoptimal_form', 'constraintViolations': ['intervalForm']},
                            'variables': {'a': '-2', 't': '0', 'g1': '3', 'g2': '2', 'g3': '3'},
                            'description': 'v1 accolés en 1 : réunion écrite en deux morceaux', 'variationIndex': 1})


def par_la_distance(t: dict) -> None:
    (v,) = t['variations']
    assert len(v['correction']['steps']) == 1 and v['correction']['steps'][0].startswith('$$\\begin{align}')
    v['correction']['steps'] = [
        '$\\left\\lvert x{{eval:-(a);+}}\\right\\rvert$ est la distance entre $x$ et ${{a}}$ : '
        'on cherche les nombres situés à la distance ${{b}}$ de ${{a}}$.',
        'Il y en a deux, un de chaque côté de ${{a}}$ : ${{a}}-{{b}}={{eval:a-b}}$ et '
        '${{a}}+{{b}}={{eval:a+b}}$.',
        'Donc $x=\\textcolor{{{color:primary.0}}}{ {{eval:a+b}} }$ ou '
        '$x=\\textcolor{{{color:primary.0}}}{ {{eval:a-b}} }$.',
    ]


def consigne_deux_points(t: dict) -> None:
    for v in t['variations']:
        assert v['statement'].startswith('Développe et réduis.\n\n'), v['statement']
        v['statement'] = 'Développe et réduis :' + v['statement'][len('Développe et réduis.'):]


# ============================================================================
# LE LOT
# ============================================================================

# Une seule part par modèle (aucun neuf) : toutes les variations gardées, tag relevé exigé à
# l'identique.
RELEVE = {t['id'][:8]: t for t in json.load(open(ETAT + 'templates.json'))}
CONTENU = ('8b59ca4b', '8c31675a', '939153b6', '85f6e96e', '1338da34', '288c2bf0', '6909bfde')


def part(court: str, codes: list[str], retouche, titre: str | None = None, sous_titre: str | None = None):
    t = RELEVE[court]
    return [(list(range(len(t['variations']))), codes, titre or t['title'],
             t['description'] if sous_titre is None else sous_titre, retouche)]


LOT = {
    '8b59ca4b': part('8b59ca4b', ['2-378'], sans_suite_geometrique),
    '8c31675a': part('8c31675a', ['2-244'], accoles),
    '939153b6': part('939153b6', ['2-420'], par_la_distance,
                     sous_titre='Par la distance : les nombres à distance b de a'),
    '85f6e96e': part('85f6e96e', ['2-262'], consigne_deux_points,
                     sous_titre='Une lettre seule : $(3+x)^2$'),
    '1338da34': part('1338da34', ['2-262'], consigne_deux_points,
                     sous_titre='Une lettre seule : $(3-x)^2$'),
    '288c2bf0': part('288c2bf0', ['2-262'], consigne_deux_points,
                     sous_titre='La lettre multipliée par un entier : $(3+5x)^2$'),
    '6909bfde': part('6909bfde', ['2-262'], None,
                     sous_titre='La lettre multipliée par un entier : $(3-5x)^2$'),
}

ENTETE = """-- ============================================================================
-- Chantier « questions-2de », lot « corrections » : 7 modèles corrigés, aucun modèle neuf ni tag posé
-- ============================================================================
--   - 8b59ca4b (évolution répétée) : le corrigé ne cite plus « suite géométrique » (programme de 1re) ;
--   - 8c31675a (intervalles, brouillon) : intervalles accolés → réponse attendue [a ; d] ;
--   - 939153b6 (|x − a| = b) : corrigé par la distance, sous-titre propre ;
--   - 85f6e96e, 1338da34, 288c2bf0, 6909bfde (Développer, niveaux 5 à 8) : sous-titre de la marche,
--     consigne « Développe et réduis : ».
-- Ni tag, ni nœud, ni niveau, ni statut ne changent ici : niveaux, tags et nœuds dans la migration
-- suivante (20261027192100_questions_2de_rangement_tags).
-- ============================================================================
-- Décision de David le 2026-10-27 (journal docs/wip/questions-2de-progress.md §§ 5-6). Fichier
-- GÉNÉRÉ par docs/wip/questions-2de/lot-corrections-2de.py — ne pas éditer à la main.
--
-- Les modèles n'existent qu'en production : en base locale (vide), la migration ne touche aucun
-- modèle et ses vérifications le tolèrent ; elle exige TOUT ou RIEN ({n} modèles). Elle est prouvée
-- par tests/integration/questions-2de-contenu.test.ts, qui fabrique des copies des identifiants de
-- la prod (contenu, nœud, niveaux et tags) puis rejoue CE fichier.
--
-- Garde : chaque modèle doit avoir EXACTEMENT le contenu relevé en prod le 2026-10-27, être au nœud,
-- aux niveaux et au statut relevés, et porter exactement son tag relevé.
--
-- Données d'élèves : aucune (relevé du 2026-10-27 : 0 carte SRS, 0 tentative de compétence ou
-- d'évaluation, 0 activité de journal).
--
-- Accès : personne ne gagne ni ne perd d'accès (question tranchée par David le 2026-10-27). Aucune
-- règle ne change ; les 6 modèles publiés le restent, le brouillon reste brouillon.
--"""


if __name__ == '__main__':
    releve = [RELEVE[c] for c in CONTENU]
    generer(LOT, releve=releve, etat=ETAT, niveaux_pris={},
            migration='supabase/migrations/20261027192000_questions_2de_contenu.sql',
            fixture='tests/integration/fixtures/questions-2de-contenu.json', prefixe='q2c', entete=ENTETE)
