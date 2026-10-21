/**
 * Le réglage « Angles » : degrés ou radians (géométrie v2, lot 2, décision de
 * David du 2026-10-18).
 *
 * Il ne gouverne QUE l'unité dans laquelle une mesure d'angle (`angle(A, B, C)`)
 * est exprimée — une grandeur, `36,87 °` ou `0,6435 rad`. Un nombre seul reste
 * en radians (`cos(60)`) : dérivées, tracés, résolutions ne changent pas.
 *
 * Une préférence de l'élève, retenue dans ce navigateur comme « Saisie dans
 * Calcul » (`input-mode.ts`) : ni dans un lien, ni dans l'état rangé.
 *
 * @module atelier/angle-unit
 */

// =============================================================================
// Types
// =============================================================================

export type AngleUnit = 'deg' | 'rad';

// =============================================================================
// Constantes
// =============================================================================

/** À part de `chiphre-atelier` : une préférence, pas un objet de l'atelier. */
export const ANGLE_UNIT_KEY = 'chiphre-atelier-angles';

/** Degrés par défaut, comme `unite_angle` du DSL de géométrie. */
export const DEFAULT_ANGLE_UNIT: AngleUnit = 'deg';

// =============================================================================
// Fonctions
// =============================================================================

/** Le choix retenu dans ce navigateur, degrés sinon. */
export function readAngleUnit(storage: Storage | null): AngleUnit {
	try {
		const stored = storage?.getItem(ANGLE_UNIT_KEY) ?? null;
		return stored === 'deg' || stored === 'rad' ? stored : DEFAULT_ANGLE_UNIT;
	} catch {
		// Stockage refusé (mode privé strict) : la page marche sans
		return DEFAULT_ANGLE_UNIT;
	}
}

/** Retenir le choix ; un refus du navigateur n'est pas une erreur. */
export function writeAngleUnit(storage: Storage | null, unit: AngleUnit): void {
	try {
		storage?.setItem(ANGLE_UNIT_KEY, unit);
	} catch {
		// Quota, mode privé : le choix vaut jusqu'au rechargement
	}
}
