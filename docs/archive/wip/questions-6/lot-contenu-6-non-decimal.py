"""Génère la migration de CONTENU du chantier « questions-6 » : le modèle 01 du lot 4 (5077e030, « Entier,
décimal ou non décimal ? », 6-130), publié, dont la variante « non décimal » tirait des dénominateurs où un
élève de 6e ne peut pas voir que la division ne s'arrête pas (§ 11.7 du journal).

- v3 : dénominateur 7 retiré (le reste ne revient qu'au 6e chiffre) ; restent 3, 6, 9, 11, 12, où il
  revient en 1 à 3 chiffres. La correction nomme le reste qui revient (variables `p`, `r`).
- Les trois énoncés commencent par « Pose la division sur ton brouillon. », comme au lot 3.
- Description mise à jour.

Le résultat doit être EXACTEMENT la source `scripts/questions/6-fractions/01-entier-decimal-ou-non-decimal.json`
(vérifié ci-dessous). Ni tag, ni nœud, ni niveau, ni statut ne changent. Contenu relevé en prod le
2026-10-28 (lecture seule, `releve-prod.ts`, empreinte vérifiée au MCP) ; tag 6-130 relevé, exigé à
l'identique.

    python3 docs/wip/questions-6/lot-contenu-6-non-decimal.py
"""

import json
import sys

sys.path.insert(0, 'docs/archive/wip/arbre-notions/analyse')
sys.path.insert(0, 'docs/archive/wip/passe-lycee/analyse')
import scissions_outils  # noqa: E402
from scissions_outils import generer  # noqa: E402

# Le générateur du lycée ne connaît que les programmes du lycée.
scissions_outils.GRADES.update({'6': '6'})

ETAT = 'docs/wip/questions-6/etat-prod-2026-10-28-non-decimal/'
SOURCE = 'scripts/questions/6-fractions/01-entier-decimal-ou-non-decimal.json'


# ============================================================================
# RETOUCHE
# ============================================================================

def division_posee(t: dict) -> None:
    for v in t['variations']:
        assert v['statement'].startswith('Le nombre $\\frac{{{a}}}{{{b}}}$ est :')
        v['statement'] = 'Pose la division sur ton brouillon.\n\n' + v['statement']
    v = t['variations'][2]
    b = [x for x in v['variables'] if x['name'] == 'b']
    assert len(b) == 1 and b[0]['expression'] == '3|6|7|9|11|12'
    b[0]['expression'] = '3|6|9|11|12'
    v['variables'] += [
        {'name': 'p', 'expression': '{{if:b==6|10|{{if:b==12|100|1}}}}'},
        {'name': 'r', 'expression': 'eval:mod(a*p,b)'},
    ]
    avant = "\\ldots$ : la division ne s'arrête jamais, les mêmes restes reviennent sans fin."
    apres = ("\\ldots$ : dans la division posée, le reste ${{r}}$ revient, et la division recommence "
             "pareil : elle ne s'arrêtera jamais.")
    steps = v['correction']['steps']
    assert steps[1].endswith(avant)
    steps[1] = steps[1][:-len(avant)] + apres
    source = json.load(open(SOURCE))
    assert t['variations'] == source['variations'], 'retouche ≠ source'


# ============================================================================
# LE LOT
# ============================================================================

RELEVE = {t['id'][:8]: t for t in json.load(open(ETAT + 'templates.json'))}
CONTENU = ('5077e030',)
DESCRIPTION = json.load(open(SOURCE))['description']

t = RELEVE['5077e030']
LOT = {'5077e030': [(list(range(len(t['variations']))), ['6-130'], t['title'], DESCRIPTION, division_posee)]}

ENTETE = """-- ============================================================================
-- Chantier « questions-6 » : contenu du modèle 01 du lot 4 (non décimal), aucun neuf ni tag posé
-- ============================================================================
--   - 5077e030 (Entier, décimal ou non décimal ?) : la variante « non décimal » ne tire plus le
--     dénominateur 7 (le reste n'y revient qu'au 6e chiffre, hors de portée d'un élève de 6e) ;
--     la correction nomme le reste qui revient ; les énoncés demandent de poser la division.
-- Ni tag, ni nœud, ni niveau, ni statut ne changent ici.
-- ============================================================================
-- Décision de David le 2026-10-28 (journal docs/wip/questions-6-progress.md § 11.7). Fichier GÉNÉRÉ
-- par docs/wip/questions-6/lot-contenu-6-non-decimal.py — ne pas éditer à la main.
--
-- Les modèles n'existent qu'en production : en base locale (vide), la migration ne touche aucun
-- modèle et ses vérifications le tolèrent ; elle exige TOUT ou RIEN ({n} modèle). Elle est prouvée
-- par tests/integration/questions-6-non-decimal-contenu.test.ts, qui fabrique des copies des
-- identifiants de la prod (contenu, nœud, niveaux et tags) puis rejoue CE fichier.
--
-- Garde : le modèle doit avoir EXACTEMENT le contenu relevé en prod le 2026-10-28, être au nœud,
-- aux niveaux et au statut relevés, et porter exactement son tag relevé (6-130).
--
-- Données d'élèves : aucune sur ce modèle (relevé MCP du 2026-10-28) ; non touchées.
--
-- Accès : personne ne gagne d'accès (aucune règle ne change) ; effet visible : les élèves de 6e
-- ne tirent plus de fraction de dénominateur 7 et lisent le reste qui revient dans la correction.
--"""


if __name__ == '__main__':
    releve = [RELEVE[c] for c in CONTENU]
    generer(LOT, releve=releve, etat=ETAT, niveaux_pris={},
            migration='supabase/migrations/20261028200000_questions_6_non_decimal_contenu.sql',
            fixture='tests/integration/fixtures/questions-6-non-decimal-contenu.json', prefixe='q6nd',
            entete=ENTETE)
