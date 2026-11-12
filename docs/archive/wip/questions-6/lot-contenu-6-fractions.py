"""Génère la migration de CONTENU du chantier « questions-6 », lot 4 « Fractions » : 1 modèle du lot 3,
publié, dont la correction affichait `\\textcolor{…}{…}` brut (couleur hors formule, § 11.1 du journal).

- `e3d87166` (Multiplier par 0,1, c'est diviser par 10, 6-116), v1 : « c'est \\textcolor{…}{diviser par
  $10$} » devient « c'est **diviser par $10$** », comme la source corrigée par fa753ec93
  (`scripts/questions/6-calcul-decimal/03-multiplier-par-0-1-diviser-par-10.json`).

Ni tag, ni nœud, ni niveau, ni statut ne changent : le rangement du lot 4 est dans la migration
suivante, écrite à la main. Contenu relevé en prod le 2026-10-28 (lecture seule,
`releve-prod.ts`, empreinte vérifiée au MCP) ; tag 6-116 relevé, exigé à l'identique.

    python3 docs/wip/questions-6/lot-contenu-6-fractions.py [dossier où écrire les modèles]
"""

import json
import sys

sys.path.insert(0, 'docs/archive/wip/arbre-notions/analyse')
sys.path.insert(0, 'docs/archive/wip/passe-lycee/analyse')
import scissions_outils  # noqa: E402
from scissions_outils import generer  # noqa: E402

# Le générateur du lycée ne connaît que les programmes du lycée.
scissions_outils.GRADES.update({'6': '6'})

ETAT = 'docs/wip/questions-6/etat-prod-2026-10-28-fractions/'


# ============================================================================
# RETOUCHE
# ============================================================================

def gras_hors_formule(t: dict) -> None:
    avant = ("c'est \\textcolor{{{color:primary.0}}}{diviser par "
             "${{if:k==1|10|{{if:k==2|100|1~000}}}}$} : chaque")
    apres = "c'est **diviser par ${{if:k==1|10|{{if:k==2|100|1~000}}}}$** : chaque"
    trouves = [(v, i) for v in t['variations'] for i, s in enumerate(v['correction']['steps']) if avant in s]
    assert len(trouves) == 1, len(trouves)
    v, i = trouves[0]
    v['correction']['steps'][i] = v['correction']['steps'][i].replace(avant, apres)


# ============================================================================
# LE LOT
# ============================================================================

RELEVE = {t['id'][:8]: t for t in json.load(open(ETAT + 'templates.json'))}
CONTENU = ('e3d87166',)


def part(court: str, codes: list[str], retouche) -> list[tuple]:
    t = RELEVE[court]
    return [(list(range(len(t['variations']))), codes, t['title'], t['description'], retouche)]


LOT = {'e3d87166': part('e3d87166', ['6-116'], gras_hors_formule)}

ENTETE = """-- ============================================================================
-- Chantier « questions-6 », lot 4 « Fractions » : contenu d'1 modèle du lot 3, aucun neuf ni tag posé
-- ============================================================================
--   - e3d87166 (Multiplier par 0,1, c'est diviser par 10) : dans la correction de la v1, la couleur
--     hors formule (`\\textcolor` affiché brut) devient du gras.
-- Ni tag, ni nœud, ni niveau, ni statut ne changent ici : le rangement du lot 4 est dans la
-- migration suivante (20261028140100_questions_6_fractions_rangement_tags).
-- ============================================================================
-- Décision de David le 2026-10-28 (journal docs/wip/questions-6-progress.md § 11.1). Fichier GÉNÉRÉ
-- par docs/wip/questions-6/lot-contenu-6-fractions.py — ne pas éditer à la main.
--
-- Les modèles n'existent qu'en production : en base locale (vide), la migration ne touche aucun
-- modèle et ses vérifications le tolèrent ; elle exige TOUT ou RIEN ({n} modèle). Elle est prouvée
-- par tests/integration/questions-6-fractions-contenu.test.ts, qui fabrique des copies des
-- identifiants de la prod (contenu, nœud, niveaux et tags) puis rejoue CE fichier.
--
-- Garde : le modèle doit avoir EXACTEMENT le contenu relevé en prod le 2026-10-28, être au nœud,
-- aux niveaux et au statut relevés, et porter exactement son tag relevé (6-116).
--
-- Données d'élèves : non touchées (seul le texte d'une correction change).
--
-- Accès : personne ne gagne d'accès (aucune règle ne change) ; effet visible : les élèves de 6e
-- lisent « diviser par 10 » en gras au lieu du code brut.
--"""


if __name__ == '__main__':
    releve = [RELEVE[c] for c in CONTENU]
    generer(LOT, releve=releve, etat=ETAT, niveaux_pris={},
            migration='supabase/migrations/20261028140000_questions_6_fractions_contenu.sql',
            fixture='tests/integration/fixtures/questions-6-fractions-contenu.json', prefixe='q6fc',
            entete=ENTETE)
