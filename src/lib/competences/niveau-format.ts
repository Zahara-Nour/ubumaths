/**
 * Formatting of competence levels for export.
 *
 * The internal levels (`student_competence_level.niveau`) follow the official
 * 4-level scale of the socle commun (décret 2015-1929). This module renders a
 * level in one of three export formats:
 *  - `numeric` : the official LSU figure 1-4 (default, matches Pronote paste).
 *  - `label`   : the official long wording ("Maîtrise satisfaisante"...).
 *  - `short`   : a compact mnemonic (MI / MF / MS / TBM).
 *
 * A missing level (student not yet evaluated on the competence) renders as an
 * empty string in every format.
 */

import type { MathCompetenceLevel } from '$lib/types/skills';

export type NiveauFormat = 'numeric' | 'label' | 'short';

const NIVEAU_TABLE: Record<MathCompetenceLevel, Record<NiveauFormat, string>> = {
	insuffisante: { numeric: '1', label: 'Maîtrise insuffisante', short: 'MI' },
	fragile: { numeric: '2', label: 'Maîtrise fragile', short: 'MF' },
	satisfaisante: { numeric: '3', label: 'Maîtrise satisfaisante', short: 'MS' },
	tres_bonne: { numeric: '4', label: 'Très bonne maîtrise', short: 'TBM' }
};

/**
 * Render a competence level in the requested export format.
 * Returns `''` when the level is missing (not evaluated).
 */
export function formatNiveau(
	niveau: MathCompetenceLevel | null | undefined,
	format: NiveauFormat
): string {
	if (!niveau) return '';
	return NIVEAU_TABLE[niveau][format];
}
