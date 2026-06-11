/**
 * Read-only mapping from UbuMaths math competences (famille B) to the socle
 * commun components (décret 2015 / BO 2015 cycle 4).
 *
 * This mapping is fixed by the national programmes and is never edited at
 * runtime, so it lives in TypeScript rather than in a database table
 * (cf. docs/wip/export-competences-study.md §1.4, Option C).
 *
 * It is purely a CONVENIENCE column in the export: no target ENT (Pronote /
 * EcoleDirecte / Sacoche) requires a socle code to import results
 * (cf. study §1.2). It helps teachers who must attach competences to the socle
 * on the Pronote admin side.
 *
 * `primary` (D1.3 — langages mathématiques/scientifiques) is certain for all
 * six competences. The `secondary` components (D2/D3/D4/D1.1) are derived from
 * the official wording + academic documents and are STILL TO BE VALIDATED by
 * the PO against the BO 2015 cycle 4 tables (study §1.3, flagged finding).
 */

import type { MathCompetenceCode } from '$lib/types/skills';

export interface SocleMapping {
	/** Always D1.3 for mathematics. */
	primary: string;
	/** À VALIDER — secondary socle components (BO 2015 cycle 4). */
	secondary: string[];
}

export const COMPETENCE_SOCLE_MAPPING: Record<MathCompetenceCode, SocleMapping> = {
	chercher: { primary: 'D1.3', secondary: ['D2'] },
	calculer: { primary: 'D1.3', secondary: [] },
	raisonner: { primary: 'D1.3', secondary: ['D3'] },
	communiquer: { primary: 'D1.3', secondary: ['D1.1'] },
	modeliser: { primary: 'D1.3', secondary: ['D4'] },
	representer: { primary: 'D1.3', secondary: [] }
};

const FALLBACK: SocleMapping = { primary: 'D1.3', secondary: [] };

/**
 * Socle mapping for a competence code. Unknown codes fall back to the safe
 * `{ primary: 'D1.3', secondary: [] }` (never throws).
 */
export function getSocleCodes(code: string): SocleMapping {
	return COMPETENCE_SOCLE_MAPPING[code as MathCompetenceCode] ?? FALLBACK;
}

/**
 * Single CSV cell for the `socle_code` column, e.g. `D1.3` or `D1.3 D2`.
 * Primary first, then any secondary components, space-separated.
 */
export function formatSocleCell(code: string): string {
	const { primary, secondary } = getSocleCodes(code);
	return [primary, ...secondary].join(' ');
}
