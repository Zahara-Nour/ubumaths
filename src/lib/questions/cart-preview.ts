/**
 * Graine des aperçus
 * ==================
 *
 * Un aperçu (grille Automaths, panier, création d'évaluation) génère une
 * instance du modèle avec cette graine fixe : il est le même partout, et il ne
 * change pas quand on modifie le panier (quantité, durée) — un tirage au hasard
 * renouvelait toutes les tuiles à chaque clic.
 */

/** Graine des aperçus (grille Automaths, panier, création d'évaluation) */
export const PREVIEW_SEED = 12345;
