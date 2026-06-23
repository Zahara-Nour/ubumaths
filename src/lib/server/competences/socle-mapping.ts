/**
 * Read-only mapping from Chiphre math competences (famille B) to the socle
 * commun domains, as listed by the official programme de mathématiques cycle 4
 * (BO spécial n°11 du 26/11/2015 — mention « Domaines du socle » de chaque
 * fiche compétence).
 *
 * This mapping is fixed by the national programme and never edited at runtime,
 * so it lives in TypeScript rather than in a database table
 * (cf. docs/wip/export-competences-study.md §1.4, Option C).
 *
 * It is a CONVENIENCE column in the export: no target ENT (Pronote /
 * EcoleDirecte / Sacoche) requires a socle code to import results (study §1.2).
 *
 * The BO lists numbered domains (1-5). For mathematics, domain 1 (« langages
 * pour penser et communiquer ») is evaluated at the LSU through its sub-component
 * **D1.3** (langages mathématiques, scientifiques et informatiques), so we render
 * domain 1 as `D1.3`. Domains 2-5 have no sub-components, rendered `D2`…`D5`.
 *
 * Official BO 2015 cycle 4 « Domaines du socle » per competence:
 *   - Chercher    : 2, 4
 *   - Calculer    : 4
 *   - Raisonner   : 2, 3, 4
 *   - Communiquer : 1, 3
 *   - Modéliser   : 1, 2, 4
 *   - Représenter : 1, 5
 * (Sources concordantes : programme officiel + copies académiques Besançon /
 *  Poitiers. Note : « chercher », « calculer » et « raisonner » ne relèvent PAS
 *  du domaine 1 — donc pas de D1.3 — selon le BO.)
 */

import type { MathCompetenceCode } from '$lib/types/skills';

/** Socle domains per competence, in BO order (domain 1 → `D1.3` for maths). */
export const COMPETENCE_SOCLE_MAPPING: Record<MathCompetenceCode, string[]> = {
	chercher: ['D2', 'D4'],
	calculer: ['D4'],
	raisonner: ['D2', 'D3', 'D4'],
	communiquer: ['D1.3', 'D3'],
	modeliser: ['D1.3', 'D2', 'D4'],
	representer: ['D1.3', 'D5']
};

/**
 * Socle domains for a competence code. Unknown codes return `[]` (never throws,
 * asserts nothing).
 */
export function getSocleCodes(code: string): string[] {
	return COMPETENCE_SOCLE_MAPPING[code as MathCompetenceCode] ?? [];
}

/**
 * Single CSV cell for the `socle_code` column, e.g. `D2 D4` or `D1.3 D2 D4`.
 * Empty string for an unknown competence.
 */
export function formatSocleCell(code: string): string {
	return getSocleCodes(code).join(' ');
}
