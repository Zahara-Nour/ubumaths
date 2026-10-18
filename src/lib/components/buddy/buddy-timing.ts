/**
 * Durées des bulles du Palotin.
 *
 * Exportées pour être testées : une bulle qui porte un lien doit laisser le
 * temps de le lire et de le suivre (y compris au clavier ou au lecteur d'écran).
 */

/** Bulle ordinaire. */
export const BUBBLE_DURATION = 5_000;

/** Bulle avec un lien (annonce des Mathoux en sieste) : au moins 20 s. */
export const LINK_BUBBLE_DURATION = 20_000;

/** Délai minimal, après le montage, avant la salutation au hasard. */
export const GREETING_DELAY = 2_000;
