/**
 * Atelier — les mots d'une suppression en cascade
 *
 * Lot B de `docs/wip/atelier-suppression-export-phase0.md` : la confirmation
 * nomme ce qui partira avec l'objet, le message qui suit dit ce qui est parti.
 *
 * @module atelier/removal
 */

import { displayName } from './names';

// =============================================================================
// Constantes
// =============================================================================

/** Au-delà, la confirmation résume (« et 2 autres ») : elle doit se lire d'un coup d'œil (L3). */
const MAX_NAMED = 3;

// =============================================================================
// Fonctions
// =============================================================================

/** « Supprimer f supprime aussi f′, g et h. » */
export function cascadeMessage(name: string, dependents: readonly string[]): string {
	const named = dependents.slice(0, MAX_NAMED).map(displayName);
	const others = dependents.length - named.length;
	const items = others > 0 ? [...named, `${others} ${others > 1 ? 'autres' : 'autre'}`] : named;
	const list =
		items.length === 1
			? items[0]
			: `${items.slice(0, -1).join(', ')} et ${items[items.length - 1]}`;
	return `Supprimer ${displayName(name)} supprime aussi ${list}.`;
}

/** « « f′ » supprimé » ou « 3 objets supprimés ». */
export function removedMessage(removed: readonly string[]): string {
	return removed.length === 1
		? `« ${displayName(removed[0])} » supprimé`
		: `${removed.length} objets supprimés`;
}

/** « f, f′ et g » — tous les noms, pour l'historique (qui n'a pas à tenir d'un coup d'œil). */
function listed(names: readonly string[]): string {
	const shown = names.map(displayName);
	return shown.length === 1
		? shown[0]
		: `${shown.slice(0, -1).join(', ')} et ${shown[shown.length - 1]}`;
}

/** La ligne de Calcul d'une suppression : « Supprimé : f, f′ et g. » */
export function removedLine(removed: readonly string[]): string {
	return `Supprimé : ${listed(removed)}.`;
}

/** La ligne de Calcul d'une annulation : « f, f′ et g sont revenus. » */
export function restoredLine(removed: readonly string[]): string {
	return removed.length === 1
		? `« ${displayName(removed[0])} » est revenu.`
		: `${listed(removed)} sont revenus.`;
}
