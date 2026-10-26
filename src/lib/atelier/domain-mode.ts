/**
 * Le réglage « Simplifications qui changent le domaine » (chantier
 * tidy-conditions, § 3, décisions de David du 2026-10-26).
 *
 * - Garder l'écriture (par défaut) : `x/x` reste `x/x`, une note dit qu'on
 *   peut simplifier davantage et comment préciser le domaine (`avec x ≠ 0`).
 * - Simplifier en disant la condition : la ligne montre `1, pour x ≠ 0`.
 *
 * Dans les deux cas, le bouton de la ligne montre l'autre écriture. Le choix
 * ne vaut que pour les NOUVELLES lignes (Q8). Une préférence de l'élève,
 * retenue dans ce navigateur comme « Angles » (`angle-unit.ts`).
 *
 * @module atelier/domain-mode
 */

// =============================================================================
// Types
// =============================================================================

export type DomainMode = 'keep' | 'conditions';

// =============================================================================
// Constantes
// =============================================================================

/** À part de `chiphre-atelier` : une préférence, pas un objet de l'atelier. */
export const DOMAIN_MODE_KEY = 'chiphre-atelier-domaine';

/** Garder l'écriture par défaut : le comportement de #1807 (Q9). */
export const DEFAULT_DOMAIN_MODE: DomainMode = 'keep';

// =============================================================================
// Fonctions
// =============================================================================

/** Le choix retenu dans ce navigateur, « garder l'écriture » sinon. */
export function readDomainMode(storage: Storage | null): DomainMode {
	try {
		const stored = storage?.getItem(DOMAIN_MODE_KEY) ?? null;
		return stored === 'keep' || stored === 'conditions' ? stored : DEFAULT_DOMAIN_MODE;
	} catch {
		// Stockage refusé (mode privé strict) : la page marche sans
		return DEFAULT_DOMAIN_MODE;
	}
}

/** Retenir le choix ; un refus du navigateur n'est pas une erreur. */
export function writeDomainMode(storage: Storage | null, mode: DomainMode): void {
	try {
		storage?.setItem(DOMAIN_MODE_KEY, mode);
	} catch {
		// Quota, mode privé : le choix vaut jusqu'au rechargement
	}
}
