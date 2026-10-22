/**
 * Le réglage « Déplacement des points » : aimanté ou fluide (demande de David,
 * 2026-10-22).
 *
 * - Aimanté (par défaut) : un point glissé ou posé s'écrit au dixième, et
 *   s'aimante à l'entier le plus proche quand on passe près ; un point sur un
 *   objet suit le pas de son curseur de position.
 * - Fluide : le point suit la souris, écrit au pixel près selon le zoom
 *   (deux décimales au zoom ordinaire), sans aimantation aux entiers.
 *
 * Les flèches du clavier et le curseur de position d'une carte n'en dépendent
 * pas. Une préférence de l'élève, retenue dans ce navigateur comme « Angles »
 * (`angle-unit.ts`) : ni dans un lien, ni dans l'état rangé.
 *
 * @module atelier/point-drag-mode
 */

// =============================================================================
// Types
// =============================================================================

export type PointDragMode = 'snap' | 'fluid';

// =============================================================================
// Constantes
// =============================================================================

/** À part de `chiphre-atelier` : une préférence, pas un objet de l'atelier. */
export const POINT_DRAG_MODE_KEY = 'chiphre-atelier-deplacement';

/** Aimanté par défaut : le comportement d'avant le réglage. */
export const DEFAULT_POINT_DRAG_MODE: PointDragMode = 'snap';

// =============================================================================
// Fonctions
// =============================================================================

/** Le choix retenu dans ce navigateur, aimanté sinon. */
export function readPointDragMode(storage: Storage | null): PointDragMode {
	try {
		const stored = storage?.getItem(POINT_DRAG_MODE_KEY) ?? null;
		return stored === 'snap' || stored === 'fluid' ? stored : DEFAULT_POINT_DRAG_MODE;
	} catch {
		// Stockage refusé (mode privé strict) : la page marche sans
		return DEFAULT_POINT_DRAG_MODE;
	}
}

/** Retenir le choix ; un refus du navigateur n'est pas une erreur. */
export function writePointDragMode(storage: Storage | null, mode: PointDragMode): void {
	try {
		storage?.setItem(POINT_DRAG_MODE_KEY, mode);
	} catch {
		// Quota, mode privé : le choix vaut jusqu'au rechargement
	}
}
