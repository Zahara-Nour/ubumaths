"""Génère la migration de CONTENU du lot 5 du chantier « questions-6 » (scissions des fractions, § 12 du
journal) : les 4 modèles publiés d'origine perdent les variations déplacées dans les 7 neufs, publiés le
2026-10-29.

- c9c3a8a3 (02, Appliquer une fraction à un entier, 6-131) : perd v1 (« de » = ×) ; garde v2, v3.
- 378aa770 (03, Multiplier une fraction par un entier, 6-136) : perd v3 (commutativité) et v4 (simplifier
  d'abord) ; garde v1, v2.
- afebbb91 (04, Comparer deux fractions, 6-133) : perd v3 à v6 ; garde v1, v2 ; titre resserré (« … de même
  dénominateur ou de même numérateur ») ; une spec ajoutée en v1 (erreur de signe).
- ddf5d292 (08, Soustraire des fractions, 6-205) : perd v4 (entier moins fraction) ; garde v1 à v3.
- Les quatre descriptions suivent.

Le résultat doit être EXACTEMENT la source `scripts/questions/6-fractions/0{2,3,4,8}-*.json` (titre,
description, variations, specs ; vérifié ci-dessous). Ni tag, ni nœud, ni niveau, ni statut ne changent.
Contenu relevé en prod le 2026-10-29 (lecture seule, `releve-prod.ts`, empreinte vérifiée au MCP) ; tags
relevés, exigés à l'identique.

    python3 docs/wip/questions-6/lot-contenu-6-scissions.py
"""

import json
import sys

sys.path.insert(0, 'docs/archive/wip/arbre-notions/analyse')
sys.path.insert(0, 'docs/archive/wip/passe-lycee/analyse')
import scissions_outils  # noqa: E402
from scissions_outils import generer  # noqa: E402
from lot_2bis_outils import garder_variations  # noqa: E402

# Le générateur du lycée ne connaît que les programmes du lycée.
scissions_outils.GRADES.update({'6': '6'})

ETAT = 'docs/wip/questions-6/etat-prod-2026-10-29-scissions/'
SOURCES = {
    'c9c3a8a3': 'scripts/questions/6-fractions/02-appliquer-une-fraction-a-un-entier.json',
    '378aa770': 'scripts/questions/6-fractions/03-multiplier-une-fraction-par-un-entier.json',
    'afebbb91': 'scripts/questions/6-fractions/04-comparer-deux-fractions.json',
    'ddf5d292': 'scripts/questions/6-fractions/08-soustraire-des-fractions.json',
}


# ============================================================================
# RETOUCHES
# ============================================================================

def source(court: str) -> dict:
    return json.load(open(SOURCES[court]))


def egale_source(court: str, garder: list[int]):
    """Variations gardées telles quelles : le résultat doit déjà être la source."""
    def retouche(t: dict) -> None:
        garder_variations(t, garder)
        s = source(court)
        assert t['variations'] == s['variations'], f'{court} : variations ≠ source'
        assert t['test_specs'] == s['testSpecs'], f'{court} : specs ≠ source'
    return retouche


def spec_signe_v1(t: dict) -> None:
    """04 : v1 n'avait qu'une spec juste ; on ajoute l'erreur de signe, juste après."""
    garder_variations(t, [0, 1])
    s = source('afebbb91')
    assert [x['description'] for x in t['test_specs']] == [
        '3/7 < 5/7', '5/7 > 5/9', 'Erreur : 5/7 < 5/9 (« 9 > 7 »)']
    ajout = s['testSpecs'][1]
    assert ajout['description'] == 'Erreur : 3/7 > 5/7' and ajout['variationIndex'] == 0
    t['test_specs'].insert(1, ajout)
    assert t['variations'] == s['variations'], 'afebbb91 : variations ≠ source'
    assert t['test_specs'] == s['testSpecs'], 'afebbb91 : specs ≠ source'


# ============================================================================
# LE LOT
# ============================================================================

RELEVE = {t['id'][:8]: t for t in json.load(open(ETAT + 'templates.json'))}
CONTENU = tuple(SOURCES)


# Codes des tags relevés (exigés à l'identique, non posés).
CODES = {'c9c3a8a3': '6-131', '378aa770': '6-136', 'afebbb91': '6-133', 'ddf5d292': '6-205'}


def part(court: str, retouche) -> tuple:
    """Un MODIFIER : le générateur exige que chaque variation aille dans une part ; la part les
    prend toutes et la retouche retire les variations déplacées."""
    s = source(court)
    tout = list(range(len(RELEVE[court]['variations'])))
    return (tout, [CODES[court]], s['title'], s['description'], retouche)

LOT = {
    'c9c3a8a3': [part('c9c3a8a3', egale_source('c9c3a8a3', [1, 2]))],
    '378aa770': [part('378aa770', egale_source('378aa770', [0, 1]))],
    'afebbb91': [part('afebbb91', spec_signe_v1)],
    'ddf5d292': [part('ddf5d292', egale_source('ddf5d292', [0, 1, 2]))],
}

ENTETE = """-- ============================================================================
-- Chantier « questions-6 » : contenu des 4 modèles d'origine du lot 5 (scissions), aucun neuf ni tag posé
-- ============================================================================
--   - c9c3a8a3 (Appliquer une fraction à un entier) : ne garde que le calcul (v2, v3) ; « de » = ×
--     vit dans son modèle à part.
--   - 378aa770 (Multiplier une fraction par un entier) : ne garde que les deux ordres (v1, v2) ;
--     « simplifier d'abord » et « échanger les facteurs » vivent dans leurs modèles à part.
--   - afebbb91 (Comparer deux fractions → … de même dénominateur ou de même numérateur) : ne garde
--     que v1, v2 ; « à 1 ou à 1/2 », « dénominateurs multiples » et « dénominateur commun » vivent
--     dans leurs modèles à part ; une spec ajoutée en v1.
--   - ddf5d292 (Soustraire des fractions) : ne garde que v1 à v3 ; « entier moins fraction » vit
--     dans son modèle à part.
-- Ni tag, ni nœud, ni niveau, ni statut ne changent ici.
-- ============================================================================
-- Décision de David le 2026-10-28 et accord du 2026-10-29 (journal docs/wip/questions-6-progress.md
-- § 12, § 12.4). Fichier GÉNÉRÉ par docs/wip/questions-6/lot-contenu-6-scissions.py — ne pas éditer
-- à la main.
--
-- Les modèles n'existent qu'en production : en base locale (vide), la migration ne touche aucun
-- modèle et ses vérifications le tolèrent ; elle exige TOUT ou RIEN ({n} modèles). Elle est prouvée
-- par tests/integration/questions-6-scissions-contenu.test.ts, qui fabrique des copies des
-- identifiants de la prod (contenu, nœud, niveaux et tags) puis rejoue CE fichier.
--
-- Garde : chaque modèle doit avoir EXACTEMENT le contenu relevé en prod le 2026-10-29, être au
-- nœud, aux niveaux et au statut relevés, et porter exactement son tag relevé.
--
-- Données d'élèves : aucune sur ces modèles (relevé MCP du 2026-10-29) ; non touchées.
--
-- Accès : personne ne gagne d'accès (aucune règle ne change). En miroir, personne ne perd un
-- exercice : les variations retirées sont dans les 7 modèles neufs, publiés le 2026-10-29.
--"""


if __name__ == '__main__':
    releve = [RELEVE[c] for c in CONTENU]
    generer(LOT, releve=releve, etat=ETAT, niveaux_pris={},
            migration='supabase/migrations/20261029200000_questions_6_scissions_contenu.sql',
            fixture='tests/integration/fixtures/questions-6-scissions-contenu.json', prefixe='q6sc',
            entete=ENTETE)
