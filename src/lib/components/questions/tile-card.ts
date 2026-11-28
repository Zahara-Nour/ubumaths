/**
 * Hauteur des flash-cards dans les tuiles (grille Automaths, panier, création
 * d'évaluation). Hauteur imposée : la grille reste régulière, une longue
 * correction défile dans la carte au lieu de l'agrandir.
 */
export const TILE_CARD_HEIGHT = '12rem';

/**
 * Hauteur des flash-cards des tuiles du catalogue Automaths et de Ma série :
 * 12rem × 1,5 à la demande de David (2026-11-26, chantier `automaths`). Les
 * autres tuiles (« En classe », choix des variations, aperçus d'admin) gardent
 * `TILE_CARD_HEIGHT`.
 */
export const CATALOGUE_TILE_CARD_HEIGHT = '18rem';
