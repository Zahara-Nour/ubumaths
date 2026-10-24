"""Génère la migration des RETOUCHES de la passe lycée : les défauts de forme laissés dans les
brouillons de #1651 (revue Opus), sur 5 modèles, sans scission ni tag nouveau.

Décision de David (2026-10-23, à la reprise du chantier) : « petite PR de retouche ».

- `70e682f9` V3, `f3100c29` V3 : la conclusion du corrigé passe en gras, comme dans les autres
  variations (« la suite n'est **pas arithmétique** / **pas géométrique** ») ;
- `d1010214` V1-V2, `f3100c29` V1 et V3 : le corrigé « pas géométrique » écrit en clair que
  u₁² ≠ u₀ × u₂ (il ne donnait que les deux nombres). Toujours vrai sur les valeurs tirables :
  u₁² − u₀u₂ = r² (d1010214, r ≥ 1), C²t²/10⁴ (f3100c29 V1, t ≥ 1), f(f − Ct/100) (f3100c29 V3,
  condition f ≠ Ct/100) ;
- `0dee4515` (somme) et `88a4432e` (produit) : les descriptions de specs héritées de l'ancienne
  question « somme et produit » ne parlent plus que de la case gardée.

Contenu relevé en prod le 2026-10-23 après #1654 (MCP, lecture seule) : empreintes md5 identiques à
celles posées par #1651, 0 donnée d'élève, brouillons ; dans `etat-prod-2026-10-23c/` (nœuds et points
repris de `etat-prod-2026-10-23b/`, inchangés ; tags = les 5 posés par #1651).

    python3 docs/wip/passe-lycee/analyse/lot-retouches.py [dossier où écrire les modèles]
"""

import json
import sys

sys.path.insert(0, 'docs/wip/passe-lycee/analyse')
from scissions_outils import generer  # noqa: E402

ETAT = 'docs/wip/passe-lycee/analyse/etat-prod-2026-10-23c/'

DIFFERENT = r"$u_1^2\neq u_0\times u_2$"


# ============================================================================
# OUTILS
# ============================================================================

def remplacer(etapes: list[str], i: int, avant: str, apres: str) -> None:
    assert etapes[i].count(avant) == 1, (etapes[i], avant)
    etapes[i] = etapes[i].replace(avant, apres)


def etapes(t: dict, variation: int) -> list[str]:
    return t['variations'][variation]['correction']['steps']


# ============================================================================
# RETOUCHES
# ============================================================================

def placement_arith(t: dict) -> None:
    remplacer(etapes(t, 2), 2, "la suite n'est pas arithmétique.", "la suite n'est **pas arithmétique**.")


def placement_geom(t: dict) -> None:
    remplacer(etapes(t, 0), 1, r"$u_0\times u_2={{eval:C*(C+2*C*t/100)}}$.",
              r"$u_0\times u_2={{eval:C*(C+2*C*t/100)}}$, donc " + DIFFERENT + ".")
    remplacer(etapes(t, 2), 2, r"$u_0\times u_2={{eval:C*b}}$ : la suite n'est pas géométrique.",
              r"$u_0\times u_2={{eval:C*b}}$, donc " + DIFFERENT + " : la suite n'est **pas géométrique**.")


def nuage_geom(t: dict) -> None:
    for v in (0, 1):
        remplacer(etapes(t, v), 1, r"$u_0\times u_2={{eval:(u0)*(u2)}}$.",
                  r"$u_0\times u_2={{eval:(u0)*(u2)}}$, donc " + DIFFERENT + ".")


SPECS_S6 = {
    # description d'avant → (somme, produit)
    'x^2-5x+3 : S=5, P=3': ('x^2-5x+3 : S=5', 'x^2-5x+3 : P=3'),
    'x^2+3x-7 : S=−3, P=−7': ('x^2+3x-7 : S=−3', 'x^2+3x-7 : P=−7'),
    '2x^2-7x+3 : S=7/2, P=3/2': ('2x^2-7x+3 : S=7/2', '2x^2-7x+3 : P=3/2'),
    '-4x^2+6x+9 : S=3/2, P=−9/4': ('-4x^2+6x+9 : S=3/2', '-4x^2+6x+9 : P=−9/4'),
    'décimaux exacts 3,5 et 1,5': ('décimal exact 3,5', 'décimal exact 1,5'),
    '−b et c sans diviser par a': ('−b sans diviser par a', 'c sans diviser par a'),
}


def s6(case: int):
    def retouche(t: dict) -> None:
        vus = 0
        for s in t['test_specs']:
            if s['description'] in SPECS_S6:
                s['description'] = SPECS_S6[s['description']][case]
                vus += 1
        assert vus == len(SPECS_S6), (t['title'], vus)
    return retouche


# ============================================================================
# LE LOT
# ============================================================================

# MODIFIER (une seule part) : toutes les variations, le tag posé par #1651 (exigé à l'identique),
# titre et sous-titre inchangés.
LOT = {
    '0dee4515': [([0, 1], ['1SPE-245'], 'Somme des racines', 'x₁ + x₂ = −b/a sans calculer les racines', s6(0))],
    '88a4432e': [([0, 1], ['1SPE-383'], 'Produit des racines', 'x₁x₂ = c/a sans calculer les racines', s6(1))],
    '70e682f9': [([0, 1, 2], ['1SPE-230'], 'Intérêts simples ou composés : la suite est-elle arithmétique ?',
                  'Reconnaître une suite arithmétique dans un placement (intérêts simples), ou non', placement_arith)],
    'f3100c29': [([0, 1, 2], ['1SPE-379'], 'Intérêts simples ou composés : la suite est-elle géométrique ?',
                  'Reconnaître une suite géométrique dans un placement (intérêts composés), ou non', placement_geom)],
    'd1010214': [([0, 1, 2, 3, 4, 5], ['1SPE-216'], 'Reconnaître une suite géométrique sur un nuage de points',
                  'Termes multipliés par un même nombre, ou non (points alignés, ni arithmétique ni géométrique)',
                  nuage_geom)],
}

ENTETE = """-- ============================================================================
-- Passe lycée, retouches : {n} brouillons de #1651 corrigés sur la forme, aucun modèle neuf
-- ============================================================================
-- Défauts laissés par la revue de #1651 (passe_lycee_reecritures), sans effet sur la correction des
-- réponses : conclusion du corrigé en gras (70e682f9 V3, f3100c29 V3) ; « u₁² ≠ u₀ × u₂ » écrit en
-- clair dans le corrigé « pas géométrique » (d1010214 V1-V2, f3100c29 V1 et V3) ; descriptions de
-- specs de la scission somme / produit (0dee4515, 88a4432e) qui ne parlent plus que de leur case.
-- Ni tag, ni nœud, ni niveau ne changent.
-- ============================================================================
-- Décision de David le 2026-10-23 (« petite PR de retouche »). Fichier GÉNÉRÉ par
-- docs/wip/passe-lycee/analyse/lot-retouches.py — ne pas éditer à la main.
--
-- Les modèles n'existent qu'en production : en base locale (vide), la migration ne touche aucun
-- modèle et ses vérifications le tolèrent ; elle exige TOUT ou RIEN ({n} modèles). Elle est prouvée
-- par tests/integration/passe-lycee-retouches.test.ts, qui fabrique des copies des identifiants de la
-- prod (contenu, nœud, niveaux et tags) puis rejoue CE fichier.
--
-- Garde : chaque modèle doit avoir EXACTEMENT le contenu posé par #1651 (empreintes relevées en prod
-- le 2026-10-23), être au nœud, aux niveaux et au statut relevés, et porter exactement son tag de
-- #1651.
--
-- Données d'élèves : aucune (relevé du 2026-10-23 : 0 carte SRS, 0 tentative de compétence ou
-- d'évaluation, 0 activité de journal sur les 5 modèles, tous brouillons).
--
-- Accès : personne ne gagne d'accès. Aucune règle ne change, aucun tag n'est posé ; les 5 modèles
-- sont des brouillons, invisibles des élèves.
--"""


if __name__ == '__main__':
    releve = json.load(open(ETAT + 'templates.json'))
    assert sorted(t['id'][:8] for t in releve) == sorted(LOT), [t['id'] for t in releve]
    generer(LOT, releve=releve, etat=ETAT, niveaux_pris={},
            migration='supabase/migrations/20261024020000_passe_lycee_retouches.sql',
            fixture='tests/integration/fixtures/passe-lycee-retouches.json', prefixe='plrt', entete=ENTETE)
