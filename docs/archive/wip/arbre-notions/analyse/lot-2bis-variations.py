"""Génère la migration du lot B des MODIFIER du lot 2 bis : « retirer des variations » (7 modèles).

Source : `lot-2bis-modifications.md` § 4 « Retirer des variations », validé par David le
2026-10-20 ; méthode du lot A (une migration par lot). État de la prod relu le 2026-10-21 (clé
anonyme, lecture seule) : `etat-prod-2026-10-21/modeles-variations.json` (nœuds et points : ceux du
relevé du lot A, que le lot A n'a pas changés).

Chaque modèle garde les variations de son point ; les specs de test suivent, réindexées ; une
variable commune qui ne sert plus est retirée. Puis le modèle reçoit le tag de son point.

    python3 docs/wip/arbre-notions/analyse/lot-2bis-variations.py [dossier où écrire les modèles modifiés]
"""

from lot_2bis_outils import garder_variations, generer, remplacer, retirer_variable


# ============================================================================
# MODIFICATIONS (une fonction par modèle, clé = 8 premiers caractères de l'id ; les numéros de
# variation de la liste comptent à partir de 1, les indices à partir de 0)
# ============================================================================

def m_716d5c68(t):
    # Variations 5-8 (nombre à 2 chiffres + nombre à 1 chiffre) retirées : CP-024 a déjà 5fea90e6.
    garder_variations(t, [0, 1, 2, 3])
    remplacer(t, 'description', 'Somme sans retenue. Au moins un nombre à 2 chiffres.',
              'Somme sans retenue de deux nombres à 2 chiffres.')


def addition_seule(t):
    """Variations 2-3 (a − ? = b, relève de la 4e) retirées ; reste la variation 1 (a + ? = b)."""
    garder_variations(t, [0])


def m_b1550840(t):
    addition_seule(t)
    # c ne servait qu'à la variation 3 (c − ? = c − a).
    retirer_variable(t['shared'], 'c')
    for s in t['test_specs']:
        del s['variables']['c']


def m_b2af6f39(t):
    # Variation 3 ((−a)/(−b)) retirée : 4-002 garde 3 modèles.
    garder_variations(t, [0, 1])


def m_0b6d749f(t):
    # Variations 1-3 (trou au diviseur, a : ? = b, type a/x = b de 2de) retirées ; restent 4-6 (? : a = b).
    garder_variations(t, [3, 4, 5])


def m_6a60ed10(t):
    # Variations 1-4 (second membre fractionnaire, 9x = 81/4) retirées ; restent 5-6 (2x = 9).
    garder_variations(t, [4, 5])


MODIFS = {
    '716d5c68': m_716d5c68, '24331791': addition_seule, '84755a7b': addition_seule, 'b1550840': m_b1550840,
    'b2af6f39': m_b2af6f39, '0b6d749f': m_0b6d749f, '6a60ed10': m_6a60ed10,
}


ENTETE = """-- ============================================================================
-- Lot 2 bis, modèles à modifier — lot B « retirer des variations » : {n} modèles du CP et du
-- collège perdent les variations qui relèvent d'un autre point (specs de test réindexées,
-- variable commune devenue inutile retirée), puis reçoivent le tag de leur point (ADR 0020 § 7).
-- ============================================================================
-- Source de vérité : docs/wip/arbre-notions/analyse/lot-2bis-modifications.md § 4 « Retirer des
-- variations », VALIDÉ par David (2026-10-20). Fichier GÉNÉRÉ par
-- docs/wip/arbre-notions/analyse/lot-2bis-variations.py — ne pas éditer à la main.
--
-- Les modèles n'existent qu'en production : en base locale (vide), la migration ne touche aucun
-- modèle et ses vérifications le tolèrent ; elle exige TOUT ou RIEN ({n} modèles). Elle est prouvée
-- par tests/integration/lot-2bis-variations.test.ts, qui fabrique des copies des identifiants de la
-- prod (contenu, nœud et niveaux d'avant) puis rejoue CE fichier.
--
-- Garde : chaque modèle doit avoir EXACTEMENT le contenu relevé le 2026-10-21 (titre, sous-titre,
-- variations, partie commune, specs), être au nœud et aux niveaux relevés, et ne porter aucun tag
-- du CP à la 3e (sinon une modification faite depuis serait écrasée).
--
-- Données d'élèves : aucune ne dépend de l'indice de variation (relevé du 2026-10-21 : 0 tentative
-- d'évaluation, 0 carte SRS, aucune fiche, aucun exercice, aucun deck ; 2 tentatives de compétence
-- sans indice de variation et 2 réponses de test sur 716d5c68, dont l'instance garde son énoncé et
-- n'affiche son indice qu'à titre d'information). `updated_at` avance : le contenu change.
--
-- Accès : aucune règle d'accès ne change. Les tags sont lisibles par tout utilisateur connecté
-- (policy question_template_points_read_authenticated), comme ceux de #1563 et #1564.
--"""

generer(MODIFS, modeles='modeles-variations.json', section='Retirer des variations',
        migration='supabase/migrations/20261021100000_lot_2bis_retirer_variations.sql',
        fixture='tests/integration/fixtures/lot-2bis-variations.json', prefixe='l2v', entete=ENTETE)
