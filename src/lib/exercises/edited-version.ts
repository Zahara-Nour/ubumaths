/**
 * Quelle version d'un exercice la page d'édition ouvre (ADR 0044)
 * ================================================================
 *
 * 1. `?version=<numéro>` : cette version, si elle existe ;
 * 2. sinon, ouverte depuis une fiche (`?fiche=<id>`) : la version de cette fiche, pour corriger ce
 *    que la fiche affiche vraiment ;
 * 3. sinon : la plus récente (plus grand numéro).
 *
 * @module exercises/edited-version
 */

// ============================================================================
// TYPES
// ============================================================================

export interface NumberedVersion {
	id: string;
	number: number;
}

// ============================================================================
// CONSTANTES
// ============================================================================

/** Paramètre d'adresse : numéro de la version ouverte */
export const VERSION_PARAM = 'version';

// ============================================================================
// FONCTIONS
// ============================================================================

/** Le numéro demandé par l'adresse, ou `null` s'il est absent ou mal formé */
export function requestedVersionNumber(searchParams: URLSearchParams): number | null {
	const raw = searchParams.get(VERSION_PARAM);
	if (raw === null || !/^[1-9]\d{0,5}$/.test(raw)) return null;
	return Number(raw);
}

/** La version la plus récente (plus grand numéro), `null` s'il n'y en a aucune */
export function latestOf<V extends NumberedVersion>(versions: readonly V[]): V | null {
	let latest: V | null = null;
	for (const v of versions) if (!latest || v.number > latest.number) latest = v;
	return latest;
}

/** La version à ouvrir (règles en tête du module), `null` si l'exercice n'en a aucune */
export function pickEditedVersion<V extends NumberedVersion>(
	versions: readonly V[],
	requested: { number: number | null; worksheetVersionId: string | null }
): V | null {
	if (requested.number !== null) {
		const byNumber = versions.find((v) => v.number === requested.number);
		if (byNumber) return byNumber;
	}
	if (requested.worksheetVersionId !== null) {
		const byWorksheet = versions.find((v) => v.id === requested.worksheetVersionId);
		if (byWorksheet) return byWorksheet;
	}
	return latestOf(versions);
}
