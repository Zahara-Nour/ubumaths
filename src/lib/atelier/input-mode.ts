/**
 * Le réglage « Saisie dans Calcul » : texte ou écriture mathématique.
 *
 * Phase 0 `docs/wip/atelier-reglages-phase0.md`. Une préférence de l'élève,
 * retenue dans ce navigateur comme « Résumé / Détaillé » (`steps-summary.ts`) :
 * elle ne voyage ni dans un lien, ni dans un historique exporté.
 *
 * @module atelier/input-mode
 */

// =============================================================================
// Types
// =============================================================================

/** `text` : le champ de toujours, un point devant les commandes ; `math` : MathLive. */
export type InputMode = 'text' | 'math';

// =============================================================================
// Constantes
// =============================================================================

/** À part de `chiphre-atelier` : une préférence, pas un objet de l'atelier. */
export const INPUT_MODE_KEY = 'chiphre-atelier-saisie';

/**
 * « Texte » tant que l'écriture mathématique est en essai (décision de David,
 * 2026-10-14) : qui n'ouvre pas les réglages ne voit rien changer.
 */
export const DEFAULT_INPUT_MODE: InputMode = 'text';

// =============================================================================
// Fonctions
// =============================================================================

/** Le choix retenu dans ce navigateur, « Texte » sinon. */
export function readInputMode(storage: Storage | null): InputMode {
	try {
		const stored = storage?.getItem(INPUT_MODE_KEY) ?? null;
		return stored === 'text' || stored === 'math' ? stored : DEFAULT_INPUT_MODE;
	} catch {
		// Stockage refusé (mode privé strict) : la page marche sans
		return DEFAULT_INPUT_MODE;
	}
}

/** Retenir le choix ; un refus du navigateur n'est pas une erreur. */
export function writeInputMode(storage: Storage | null, mode: InputMode): void {
	try {
		storage?.setItem(INPUT_MODE_KEY, mode);
	} catch {
		// Quota, mode privé : le choix vaut jusqu'au rechargement
	}
}
