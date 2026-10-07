/**
 * Racine n-ième réelle, en flottant.
 *
 * Indice impair (entier) : racine définie sur ℝ, ⁿ√a = −ⁿ√|a| pour a < 0
 * (décision du 2026-10-07, #925). Indice pair ou non entier : a ≥ 0 exigé.
 * Partagé par `evaluate` (repli flottant) et la validation de domaine.
 */

/** Indice entier impair : la racine accepte un radicande négatif. */
export function isOddRootIndex(index: number): boolean {
	return Number.isInteger(index) && index % 2 !== 0;
}

/**
 * ⁿ√radicand sur ℝ, ou `null` hors du domaine (radicande négatif sous un
 * indice pair ou non entier, indice nul ou non fini).
 */
export function realNthRoot(radicand: number, index: number): number | null {
	if (!Number.isFinite(index) || index === 0) return null;
	if (radicand < 0 && !isOddRootIndex(index)) return null;
	const magnitude = Math.pow(Math.abs(radicand), 1 / index);
	return radicand < 0 ? -magnitude : magnitude;
}
