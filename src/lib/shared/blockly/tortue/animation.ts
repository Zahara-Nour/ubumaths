/**
 * Animation du tracé de la tortue : l'interpréteur rend toutes les étapes d'un coup
 * (`executerTortue`), l'affichage les rejoue une à une, à vitesse fixe.
 */

import type { EtatTortue, ResultatTortue } from './interpreteur';
import type { Segment } from './segments';

// =============================================================================
// Constantes
// =============================================================================

/** Durée d'une étape de l'animation (vitesse fixe, tranché par David le 2026-11-14). */
export const DUREE_ETAPE_MS = 300;

const DEPART: EtatTortue = { x: 0, y: 0, cap: 0, styloBaisse: true };

// =============================================================================
// Fonctions
// =============================================================================

/**
 * Ce que montre le quadrillage à l'étape `i` de l'animation : avant la première (`i < 0`),
 * rien n'est tracé ; à la dernière et au-delà, le tracé complet.
 */
export function imageAnimation(
	resultat: ResultatTortue,
	i: number
): { segments: Segment[]; tortue: EtatTortue } {
	const derniere = resultat.etapes.length - 1;
	if (i >= derniere) return { segments: resultat.segments, tortue: resultat.tortue };
	if (i < 0) return { segments: [], tortue: { ...DEPART } };
	const etape = resultat.etapes[i];
	return { segments: resultat.segments.slice(0, etape.segments), tortue: etape.tortue };
}
