"""Génère la migration du lot D des MODIFIER du lot 2 bis : « scinder en deux modèles » (3 modèles
de 5e, « additionner ou soustraire des fractions »).

Source : `lot-2bis-modifications.md` § 4 « Scinder en deux modèles », validé par David le 2026-10-20 ;
formes tranchées le 2026-10-21 : l'origine garde son identifiant, l'addition et le point 5-026 ; un
modèle neuf reçoit la soustraction et le point 5-123 ; titres « Additionner des fractions » /
« Soustraire des fractions » ; f92d63a6 perd « en simplifiant le plus possible le résultat » et
accepte le résultat non simplifié (`reducedFractions` à `off`, sur ses deux moitiés). État de la prod
relu le 2026-10-21 (clé anonyme, lecture seule) : `etat-prod-2026-10-21/modeles-scissions.json`
(nœuds et points : ceux du relevé du lot A).

    python3 docs/wip/arbre-notions/analyse/lot-2bis-scissions.py [dossier où écrire les modèles modifiés]
"""

from lot_2bis_outils import garder_variations, generer, remplacer, spec


# ============================================================================
# OUTILS
# ============================================================================

def accepter_non_simplifie(t: dict, description: str) -> None:
    """La spec `description` (non simplifiée) devient juste."""
    s = [s for s in t['test_specs'] if s['description'] == description]
    assert len(s) == 1, description
    assert s[0]['expected'] == {'status': 'unoptimal_form', 'constraintViolations': ['reducedFractions']}, s[0]
    s[0]['expected'] = {'status': 'correct'}
    s[0]['description'] = description + ' (acceptée)'


def consigne_calcule(t: dict) -> None:
    for v in t['variations']:
        avant = v['statement']
        assert avant.startswith('Calcule en simplifiant le plus possible le résultat.\n\n'), avant
        v['statement'] = avant.replace('Calcule en simplifiant le plus possible le résultat.', 'Calcule.', 1)


# ============================================================================
# MODÈLES
# ============================================================================

MEME_DENOMINATEUR = 'Fractions de même dénominateur, nombres positifs, sans simplification'
F92_AVANT = ('Fractions de même dénominateur, nombres positifs, simplification intermediaire possible, '
             'simplification finale')
F92_APRES = 'Même dénominateur, nombres positifs, résultat simplifiable'
SANS_SIMPLIFICATION = {'constraints': {'reducedFractions': 'off'}}


def m71ee6212_addition(t: dict) -> None:
    remplacer(t, 'title', 'Additionner ou soustraire', 'Additionner des fractions')
    garder_variations(t, [0, 1])


def m71ee6212_soustraction(t: dict) -> None:
    remplacer(t, 'title', 'Additionner ou soustraire', 'Soustraire des fractions')
    garder_variations(t, [2])


def mae988cc8_addition(t: dict) -> None:
    remplacer(t, 'title', 'Additionner ou soustraire des fractions', 'Additionner des fractions')
    remplacer(t, 'description', MEME_DENOMINATEUR, 'Même dénominateur, nombres positifs, sans simplification')
    garder_variations(t, [0])


def mae988cc8_soustraction(t: dict) -> None:
    remplacer(t, 'title', 'Additionner ou soustraire des fractions', 'Soustraire des fractions')
    remplacer(t, 'description', MEME_DENOMINATEUR, 'Même dénominateur, nombres positifs, sans simplification')
    garder_variations(t, [1])


def mf92d63a6_addition(t: dict) -> None:
    remplacer(t, 'title', 'Additionner ou soustraire', 'Additionner des fractions')
    remplacer(t, 'description', F92_AVANT, F92_APRES)
    remplacer(t, 'options', None, SANS_SIMPLIFICATION)
    garder_variations(t, [0])
    consigne_calcule(t)
    accepter_non_simplifie(t, 'v0 simplification incomplète')
    accepter_non_simplifie(t, 'v0 pas simplifiée')


def mf92d63a6_soustraction(t: dict) -> None:
    remplacer(t, 'title', 'Additionner ou soustraire', 'Soustraire des fractions')
    remplacer(t, 'description', F92_AVANT, F92_APRES)
    remplacer(t, 'options', None, SANS_SIMPLIFICATION)
    garder_variations(t, [1])
    consigne_calcule(t)
    # 24/12 − 16/12 = 8/12 = 2/3 : la forme non simplifiée est acceptée, la soustraction des
    # dénominateurs ne l'est pas.
    tirage = {'a': '6', 'b': '2', 'c': '6', 'd': '4'}
    t['test_specs'] += [
        spec('\\frac{8}{12}', 'correct', tirage, 'v0 non simplifiée (acceptée)'),
        spec('\\frac{8}{0}', 'incorrect', tirage, 'v0 soustraction des dénominateurs'),
    ]


MODIFS = {
    '71ee6212': m71ee6212_addition,
    'ae988cc8': mae988cc8_addition,
    'f92d63a6': mf92d63a6_addition,
}

# Niveaux des modèles neufs dans « Fractions › Calculer › Addition et Soustraction » : les suivants
# libres (1 à 7 pris), dans l'ordre des niveaux des origines (3, 4, 7). Tranché par David le 2026-10-21.
SCISSIONS = {
    '71ee6212': ('e100ea6c-c52e-4f35-aec5-df72768d2041', m71ee6212_soustraction, 9),
    'ae988cc8': ('2af592ca-d9a9-4539-8d2d-80729a51a5e4', mae988cc8_soustraction, 8),
    'f92d63a6': ('4e1ed43e-33ee-423b-b475-4d3674e2b3e0', mf92d63a6_soustraction, 10),
}

ENTETE = """-- ============================================================================
-- Lot 2 bis, modèles à modifier — lot D « scinder en deux modèles » : {n} modèles de 5e
-- « additionner ou soustraire des fractions » sont scindés. Chacun garde son identifiant, ses
-- variations d'addition et reçoit le tag 5-026 ; un modèle NEUF (identifiant fixé) reçoit ses
-- variations de soustraction et le tag 5-123 (ADR 0020 § 7). f92d63a6 et sa moitié neuve perdent
-- « en simplifiant le plus possible le résultat » et acceptent le résultat non simplifié
-- (`options.constraints.reducedFractions` à `off`). Les specs de test suivent leurs variations.
-- ============================================================================
-- Source de vérité : docs/wip/arbre-notions/analyse/lot-2bis-modifications.md § 4 « Scinder en deux
-- modèles », VALIDÉ par David (2026-10-20, formes tranchées le 2026-10-21). Fichier GÉNÉRÉ par
-- docs/wip/arbre-notions/analyse/lot-2bis-scissions.py — ne pas éditer à la main.
--
-- Les modèles n'existent qu'en production : en base locale (vide), la migration ne touche aucun
-- modèle, n'en crée aucun et ses vérifications le tolèrent ; elle exige TOUT ou RIEN ({n} modèles).
-- Elle est prouvée par tests/integration/lot-2bis-scissions.test.ts, qui fabrique des copies des
-- identifiants de la prod (contenu, options, nœud et niveaux d'avant) puis rejoue CE fichier.
--
-- Garde : chaque modèle doit avoir EXACTEMENT le contenu relevé le 2026-10-21 (titre, sous-titre,
-- variations, partie commune, specs, options), être au nœud et aux niveaux relevés, et ne porter
-- aucun tag du CP à la 3e ; les identifiants des modèles neufs doivent être libres, ainsi que leur
-- catégorie : même thème, domaine et sous-domaine que l'origine, niveaux 8 à 10 (deux modèles
-- publiés ne partagent pas une catégorie, idx_question_templates_unique_category).
--
-- Données d'élèves : aucune ne tient à ces modèles (relevé du 2026-10-21, lecture seule : 0 carte
-- SRS, 0 tentative de compétence, 0 tentative d'évaluation, 0 réponse de test, 0 activité de
-- journal ; aucun exercice, fiche, paquet, série ni favori ne les cite) : rien n'est à reporter sur
-- les modèles neufs. Le rollback supprime les modèles neufs ; il refuse si une donnée d'élève y tient
-- (cartes SRS et activités de journal partiraient en cascade). `updated_at` avance.
--
-- Accès : aucune règle d'accès ne change. Les modèles neufs sont publiés comme leur origine, avec le
-- même auteur, et lisibles par les mêmes personnes ; leurs tags sont lisibles par tout utilisateur
-- connecté (policy question_template_points_read_authenticated), comme ceux de #1563 à #1568.
--"""

generer(MODIFS, modeles='modeles-scissions.json', section='Scinder en deux modèles',
        migration='supabase/migrations/20261021150000_lot_2bis_scissions.sql',
        fixture='tests/integration/fixtures/lot-2bis-scissions.json', prefixe='l2d', entete=ENTETE,
        options=True, scissions=SCISSIONS)
