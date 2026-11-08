/**
 * Calcul centré (`\begin{array}{rcl}…\end{array}`) : ce que l'éditeur écrit et que
 * le PDF relit.
 *
 * L'éditeur (`src/lib/extensions/calcul-aligne.ts`) sépare les lignes par
 * `\\[6pt]` ; la grille Typst (`generateAlignedEquation`) retire cet écart.
 *
 * @module ubumark/utils/calcul-centre
 */

/**
 * Écart lu en tête d'une ligne : `[6pt]`, `[0.5em]`… Une unité est exigée : un
 * intervalle `[0;1]` en tête de ligne reste du contenu.
 */
export const MOTIF_ECART = /^\s*\[\s*-?(?:\d+\.?\d*|\.\d+)\s*(?:em|ex|pt|mm|cm|mu)\s*\]/;
