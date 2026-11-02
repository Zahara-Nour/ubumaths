/**
 * Crans du cercle trigonométrique à placer : un tous les π/12
 * ==========================================================
 *
 * Calcul pur, sans dépendance : le parseur (`trig-circle-parser.ts`, refus d'un
 * angle hors des crans) et le juge (`trig-placer.ts`) s'en servent tous les deux,
 * sans s'importer l'un l'autre.
 *
 * @module ubumark/utils/trig-steps
 */

/** Nombre de crans par tour : un tous les π/12 */
export const TRIG_PLACER_STEPS = 24;

const STEP = (2 * Math.PI) / TRIG_PLACER_STEPS;
/** Écart toléré entre un angle et son cran (calculs en virgule flottante) */
const TOLERANCE = 1e-9;

/** Ramène un rang de cran dans [0 ; 24[ */
export function wrapStep(step: number): number {
	return ((step % TRIG_PLACER_STEPS) + TRIG_PLACER_STEPS) % TRIG_PLACER_STEPS;
}

/** Le cran d'un angle multiple de π/12, modulo 2π ; null s'il tombe entre deux crans */
export function stepOfRadians(radians: number): number | null {
	const exact = radians / STEP;
	const k = Math.round(exact);
	if (Math.abs(exact - k) > TOLERANCE * Math.max(1, Math.abs(exact))) return null;
	return wrapStep(k);
}
