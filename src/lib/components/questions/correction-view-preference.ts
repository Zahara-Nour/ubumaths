/**
 * Préférence « correction détaillée » mémorisée sur l'appareil (ADR 0017, Q88)
 * ============================================================================
 *
 * Simple confort d'affichage : le stockage peut manquer ou lever (navigation
 * privée, données bloquées) — chaque accès est protégé, et sans lui la
 * correction s'ouvre concise.
 *
 * @module components/questions/correction-view-preference
 */

export const CORRECTION_DETAIL_STORAGE_KEY = 'chiphre:correction-detail';

const DETAILED = 'detailed';
const CONCISE = 'concise';

/** L'élève a-t-il choisi la correction détaillée sur cet appareil ? */
export function readDetailPreference(): boolean {
	try {
		return globalThis.localStorage?.getItem(CORRECTION_DETAIL_STORAGE_KEY) === DETAILED;
	} catch {
		return false;
	}
}

/** Mémoriser le choix ; sans stockage, il vaut pour la page seulement. */
export function writeDetailPreference(detailed: boolean): void {
	try {
		globalThis.localStorage?.setItem(CORRECTION_DETAIL_STORAGE_KEY, detailed ? DETAILED : CONCISE);
	} catch {
		// Stockage indisponible : le choix n'est pas mémorisé
	}
}
