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

/** Pause au départ, tortue visible et rien de tracé, avant le premier pas (David, 2026-11-14). */
export const PAUSE_DEPART_MS = 600;

/** Jusqu'à ce nombre d'étapes, chaque étape dure `DUREE_ETAPE_MS` (programmes de CM1 – 6e). */
export const SEUIL_ETAPES_LENTES = 40;

/** Au-delà du seuil, l'animation entière dure ce temps (tranché par David le 2026-11-14). */
export const DUREE_MAX_ANIMATION_MS = 12_000;

/** Une image d'écran : en dessous, on avance de plusieurs étapes par image. */
export const DUREE_IMAGE_MIN_MS = 16;

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

/**
 * Rythme de l'animation : 300 ms par étape pour un programme court ; au-delà de
 * `SEUIL_ETAPES_LENTES`, la durée totale est ramenée à `DUREE_MAX_ANIMATION_MS`, avec plusieurs
 * étapes par tic quand une étape durerait moins d'une image.
 */
export function rythmeAnimation(nombreEtapes: number): { dureeMs: number; etapesParTic: number } {
	if (nombreEtapes <= SEUIL_ETAPES_LENTES) return { dureeMs: DUREE_ETAPE_MS, etapesParTic: 1 };
	const etapesParTic = Math.ceil((nombreEtapes * DUREE_IMAGE_MIN_MS) / DUREE_MAX_ANIMATION_MS);
	const tics = Math.ceil(nombreEtapes / etapesParTic);
	return { dureeMs: DUREE_MAX_ANIMATION_MS / tics, etapesParTic };
}
